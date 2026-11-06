// tunedParams(carId, install) -> sim parameters. install = { parts: [ids], tyre, settings: {key: 0..1}, paint, rims }
import { PHYS_ROWS } from '../data/cars.js';
import { PARTS, TYRES } from '../data/tyres_parts.js';
import { carParams } from './sim.js';
const lerp = (a, b, t) => a + (b - a) * t;
export const defaultInstall = () => ({ parts: [], tyre: null, settings: {}, paint: null, rims: 0 });
export const hasPart = (inst, id) => inst.parts.includes(id);
export function tunedRow(carId, inst) {
  inst = inst ?? defaultInstall(); inst.parts ??= []; inst.settings ??= {};
  const d = { ...PHYS_ROWS[carId] }; if (d.tyreTable) d.tyreTable = { ...d.tyreTable };
  const has = (id) => inst.parts.includes(id), S = (k) => inst.settings?.[k] ?? 0.5;
  let pw = 1;
  if (has('exhaust')) pw *= 1.04; if (has('intake')) pw *= 1.06;
  for (const [id, m, rp, rl] of [['eng1', 1.10, 0, 0], ['eng2', 1.20, 200, 200], ['eng3', 1.35, 400, 500]]) if (has(id)) { pw *= m; d.rpmPeak += rp; d.redline += rl; d.upshift += rl; }
  if (has('turbo1') || has('turbo2')) { const k = has('turbo2') ? 2 : 1; if (d.turbo) pw *= k === 2 ? 1.35 : 1.15; else { pw *= k === 2 ? 1.5 : 1.25; d.turbo = true; d.turboLag = 0.8; } }
  d.powerPS = d.powerPS * pw;
  for (const [id, m, cg] of [['wt1', 0.95, 0.99], ['wt2', 0.90, 0.98], ['wt3', 0.85, 0.96]]) if (has(id)) { d.massKg *= m; d.cgH = (d.cgH ?? 0.5) * cg; }
  if (has('clutch')) d.shiftTime = 0.11; if (has('gearbox')) { d.shiftTime = 0.08; d.final *= lerp(1.15, 0.85, S('gearing')); }
  if (has('lsd')) d.lsd = lerp(0.2, 0.8, S('lsd'));
  if (has('susp1') || has('susp2')) { const r = has('susp2'); d.loadK = r ? 0.07 : 0.085; d.cgH = (d.cgH ?? 0.5) * (r ? 0.92 : 0.96); d.rollF = lerp(0.45, 0.70, S('balance')); if (r) { const h = lerp(1.0, 0.9, S('ride')); d.cgH *= h; d.kerbJolt = h < 0.94; } }
  if (has('pads')) d.brakeG = (d.brakeG ?? 1.25) + 0.15; if (has('brk2')) { d.brakeG = (d.brakeG ?? 1.25) + 0.4; d.brakeF = lerp(0.5, 0.75, S('brakebal')); }
  if (has('aero1')) { d.clA = (d.clA ?? 0.1) + 0.15; d.cdA = (d.cdA ?? 0.7) + 0.02; }
  if (has('aero2')) { d.clA = (d.clA ?? 0.1) + 0.5; d.cdA = (d.cdA ?? 0.7) + 0.06; d.clA *= lerp(0.5, 1.5, S('downforce')); }
  if (inst.tyre && TYRES[inst.tyre]) { const t = TYRES[inst.tyre]; d.tyreMu = t.tyreMu; d.alphaP = t.alphaP; d.tyreTable = { dirt: t.dirt, gravel: t.dirt }; d.wearX = t.wearX; }
  d.exhaust = has('exhaust') ? 1 : 0; d.spoiler = has('aero1') ? 1 : has('aero2') ? 2 : 0; d.rims = inst.rims ?? 0; d.carId = carId;
  return d;
}
export const tunedParams = (carId, inst) => carParams(tunedRow(carId, inst));
export const AI_TUNES = { tuned: { parts: ['intake', 'eng1', 'wt1', 'pads'], tyre: 'semi' }, tunedHi: { parts: ['intake', 'eng2', 'wt2', 'brk2', 'aero1'], tyre: 'semi' } };
export const installFor = (tune) => ({ ...defaultInstall(), ...(tune ? AI_TUNES[tune] : {}), parts: [...(tune ? AI_TUNES[tune].parts : [])] });
export const displayStats = (carId, inst) => { const p = tunedRow(carId, inst); return { ps: Math.round(p.powerPS), kg: Math.round(p.massKg) }; };
export function partList(inst, cat) { return Object.entries(PARTS).filter(([, p]) => p.cat === cat); }
export function installPart(inst, id) { const p = PARTS[id], parts = inst.parts.filter((x) => !(p.group && PARTS[x].group === p.group)); parts.push(id); return { ...inst, parts }; }
