// tunedParams(carId, install): a car's physics row, with the player's parts applied, ready for stepCar.
import { carParams } from './sim.js';
import { PHYSICS } from '../data/cars.js';
import { TYRES } from '../data/tyres.js';
import { PARTS, SETUP_SLIDERS } from '../data/parts.js';

export const emptyInstall = () => ({ owned: [], on: {}, tyre: null, tyres: [], paint: null, rims: 0, setup: {} });
export const hasPart = (install, id) => {
  if (!install) return false;
  const g = PARTS[id]?.group;
  return g ? install.on?.[g] === id : (install.owned ?? []).includes(id);
};
export function fullInstall(parts = [], tyre = null) { // an install from a plain list, for AI tunes and tests
  const inst = emptyInstall();
  for (const id of parts) { inst.owned.push(id); const g = PARTS[id]?.group; if (g) inst.on[g] = id; }
  if (tyre) { inst.tyre = tyre; inst.tyres.push(tyre); }
  return inst;
}
export function setupValue(install, id) {
  const def = SETUP_SLIDERS.find((s) => s.id === id);
  return install?.setup?.[id] ?? def.def;
}
export const sliderAvailable = (install, slider) => slider.needs.some((id) => hasPart(install, id));
export function tunedRow(carId, install) {
  const base = PHYSICS[carId], d = { ...base, tyreTable: { ...(base.tyreTable ?? {}) } };
  d.cgH = base.cgH ?? 0.5;
  if (!install) return d;
  const has = (id) => hasPart(install, id);
  let power = 1;
  if (has('exhaust')) { power *= 1.04; d.sportExhaust = true; }
  if (has('intake')) power *= 1.06;
  const stage = has('stage3') ? 3 : has('stage2') ? 2 : has('stage1') ? 1 : 0;
  if (stage) { power *= [1, 1.1, 1.2, 1.35][stage]; d.rpmPeak += [0, 0, 200, 400][stage]; d.redline += [0, 0, 200, 500][stage]; d.upshift += [0, 0, 200, 500][stage]; }
  const turbo = has('turbo2') ? 2 : has('turbo1') ? 1 : 0;
  if (turbo) {
    if (base.turbo) power *= [1, 1.15, 1.35][turbo];
    else { power *= [1, 1.25, 1.5][turbo]; d.turbo = true; d.turboLag = 0.8; }
  }
  d.powerPS = base.powerPS * power;
  const weight = has('weight3') ? 3 : has('weight2') ? 2 : has('weight1') ? 1 : 0;
  if (weight) { d.massKg = base.massKg * [1, 0.95, 0.9, 0.85][weight]; d.cgH *= [1, 0.99, 0.98, 0.96][weight]; }
  if (has('clutch')) d.shiftTime = 0.11;
  if (has('gearbox')) { d.shiftTime = 0.08; d.final = base.final * setupValue(install, 'gearing'); }
  if (has('lsd')) d.lsd = setupValue(install, 'lsd');
  if (has('suspSport')) { d.loadK = 0.085; d.cgH *= 0.96; d.rollF = setupValue(install, 'balance'); }
  if (has('suspRace')) { d.loadK = 0.07; d.cgH *= 0.92 * setupValue(install, 'ride'); d.rollF = setupValue(install, 'balance'); d.lowRide = setupValue(install, 'ride') < 0.94; }
  if (has('brakeSport')) d.brakeG = (base.brakeG ?? 1.25) + 0.15;
  if (has('brakeRace')) { d.brakeG = (base.brakeG ?? 1.25) + 0.4; d.brakeF = setupValue(install, 'brakeF'); }
  const baseCl = base.clA ?? 0.1, baseCd = base.cdA ?? 0.7;
  if (has('aeroStreet')) { d.clA = baseCl + 0.15; d.cdA = baseCd + 0.02; }
  if (has('aeroWing')) { d.clA = (baseCl + 0.5) * setupValue(install, 'downforce'); d.cdA = baseCd + 0.06; }
  if (install.tyre) { const t = TYRES[install.tyre]; d.tyreMu = t.tyreMu; d.alphaP = t.alphaP; d.wearX = t.wearX; d.tyreTable = { dirt: t.dirt, gravel: t.dirt }; }
  return d;
}
export const tunedParams = (carId, install) => carParams(tunedRow(carId, install));

// Oil: fresh gives +2% for 100 km, then level until 200 km; each 40 km after that takes 0.5%, down to -8%.
export function oilFactor(km, changed = false) {
  if (changed && km < 100) return 1.02;
  if (km <= 200) return 1;
  return Math.max(0.92, 1 - 0.005 * Math.floor((km - 200) / 40));
}
// Numbers a card may show (at most six).
export function specOf(carId, install) {
  const d = tunedRow(carId, install);
  return { ps: Math.round(d.powerPS), kg: Math.round(d.massKg), layout: d.layout, turbo: !!d.turbo, tyreMu: d.tyreMu ?? 1, clA: d.clA ?? 0.1, brakeG: d.brakeG ?? 1.25, shift: d.shiftTime ?? 0.16, redline: d.redline, rpmPeak: d.rpmPeak };
}
// The power curve for the dyno: { rpm, ps } points.
export function dynoCurve(carId, install, steps = 40) {
  const p = tunedParams(carId, install), pts = [];
  for (let i = 0; i <= steps; i++) {
    const rpm = 1500 + ((p.redline - 1500) * i) / steps, x = rpm / p.rpmPeak, low = p.turbo ? 0.5 : 0.62, rise = Math.min(1, low + (1 - low) * Math.min(1, x / 0.7)), fall = x <= 1 ? 1 - 0.14 * Math.max(0, (x - 0.7) / 0.3) : 0.86 - 0.9 * (x - 1), shape = Math.max(0.05, rise * fall), tq = p.Tpeak * shape;
    pts.push({ rpm, ps: (tq * (rpm * 2 * Math.PI / 60)) / 735.5 });
  }
  return pts;
}
