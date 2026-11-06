// tunedParams(carId, install) → car parameters for the sim, from the stock row plus parts.
import { carParams } from './sim.js';
import { CARS as PHYS } from '../data/carphysics.js';
import { TYRE } from '../data/tyres.js';
export const emptyInstall = () => ({ parts: {}, settings: {}, tyre: null, paint: null, rims: 0 });
const POWER_ENGINE = [1, 1.10, 1.20, 1.35], RPM_PEAK = [0, 0, 200, 400], RPM_RED = [0, 0, 200, 500];
export function tunedRow(carId, install = {}) {
  const d = { ...PHYS[carId] }, p = install.parts ?? {}, s = install.settings ?? {};
  let power = 1;
  if (p.exhaust) power *= 1.04;
  if (p.intake) power *= 1.06;
  if (p.engine) { power *= POWER_ENGINE[p.engine]; d.rpmPeak += RPM_PEAK[p.engine]; d.redline += RPM_RED[p.engine]; d.upshift += RPM_RED[p.engine]; }
  if (p.turbo) {
    if (d.turbo) power *= p.turbo === 1 ? 1.15 : 1.35;
    else { power *= p.turbo === 1 ? 1.25 : 1.5; d.turbo = true; d.turboLag = 0.8; }
  }
  d.powerPS = Math.round(d.powerPS * power);
  const cg0 = d.cgH ?? 0.5; let cg = cg0;
  if (p.weight) { d.massKg = Math.round(d.massKg * [1, 0.95, 0.9, 0.85][p.weight]); cg *= [1, 0.99, 0.98, 0.96][p.weight]; }
  if (p.clutch) d.shiftTime = 0.11;
  if (p.gearbox) { d.shiftTime = 0.08; d.final = d.final * (s.gearing ?? 1); }
  if (p.lsd) d.lsd = s.lsd ?? Math.max(d.lsd ?? 0, 0.5);
  if (p.suspension === 1) { d.loadK = 0.085; cg *= 0.96; }
  if (p.suspension === 2) { d.loadK = 0.07; cg *= 0.92; cg *= s.ride ?? 1; }
  if (p.suspension) d.rollF = s.balance ?? d.rollF;
  d.cgH = cg;
  const brakeBase = d.brakeG ?? 1.25;
  if (p.brakes === 1) d.brakeG = brakeBase + 0.15;
  if (p.brakes === 2) { d.brakeG = brakeBase + 0.4; d.brakeF = s.brakeBias ?? 0.62; }
  const clA = d.clA ?? 0.1, cdA = d.cdA ?? 0.7;
  if (p.aero === 1) { d.clA = clA + 0.15; d.cdA = cdA + 0.02; }
  if (p.aero === 2) { d.clA = clA + 0.5 * (s.downforce ?? 1); d.cdA = cdA + 0.06 * (s.downforce ?? 1); }
  if (install.tyre) { const t = TYRE[install.tyre]; d.tyreMu = t.tyreMu; d.alphaP = t.alphaP; d.tyreTable = { dirt: t.dirt, gravel: t.dirt }; d.wearX = t.wearX; }
  d.exhaustUp = !!p.exhaust;
  d.jolty = (p.suspension === 2 && (s.ride ?? 1) < 0.94);
  return d;
}
export const tunedParams = (carId, install) => ({ ...carParams(tunedRow(carId, install)), carId });
/** Shown power and weight: what event limits read. */
export function specOf(carId, install) { const d = tunedRow(carId, install); return { ps: d.powerPS, kg: d.massKg, layout: d.layout, tyre: install?.tyre ?? null }; }
/** A dyno curve: PS across the rev range, for the before/after draw. */
export function dynoCurve(carId, install, torqueShape, points = 40) {
  const d = tunedRow(carId, install), p = carParams(d), out = [];
  for (let i = 0; i < points; i++) { const rpm = 1500 + ((d.redline - 1500) * i) / (points - 1), x = rpm / d.rpmPeak, boost = d.turbo ? (rpm > d.rpmPeak * 0.4 ? 1 : 0.62) : 1, w = (rpm * 2 * Math.PI) / 60; out.push({ rpm, ps: (p.Tpeak * torqueShape(x, d) * boost * w) / 735.5 }); }
  return { curve: out, peak: Math.max(...out.map((o) => o.ps)), redline: d.redline };
}
