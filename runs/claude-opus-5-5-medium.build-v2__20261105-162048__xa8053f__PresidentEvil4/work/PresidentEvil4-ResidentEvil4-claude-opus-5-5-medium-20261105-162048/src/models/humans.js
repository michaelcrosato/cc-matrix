// Every human is a puppet of nested pivots named as HERO_RIG's joints, so HERO_CLIPS and our clips play on it.
import { model } from '../../pixel-engine.js';
const J = (name, at, parts) => ({ group: parts, name, pivot: true, at });
const b = (box, at, c, more) => ({ box, at, c, ...more });

/** A puppet from a palette and per-joint extras. Slots: coat, pants, skin, boot, sleeve. */
export function puppet(id, about, palette, o = {}) {
  const sleeve = palette.sleeve ? 'sleeve' : 'coat', glove = palette.glove ? 'glove' : 'skin';
  const tw = o.torsoW ?? 0.42, td = o.torsoD ?? 0.26, thick = o.limb ?? 1;
  const head = o.noHead ? [] : [b([0.31, 0.3, 0.3], [0, 0.13, 0], 'skin')];
  const band = palette.band ? [b([0.27, 0.07, 0.04], [0, 0.16, 0.16], 'band', { glow: true })] : [];
  const arm = (side, s) => J(`Arm${side}`, [s * 0.27 * (o.shoulders ?? 1), 0.52, 0], [
    b([0.12 * thick, 0.25, 0.13 * thick], [0, -0.12, 0], sleeve), ...(o[`arm${side}`] || []),
    J(`Forearm${side}`, [0, -0.25, 0], [b([0.1 * thick, 0.18, 0.11 * thick], [0, -0.08, 0], sleeve),
      J(`Hand${side}`, [0, -0.16, 0], [b([0.1 * thick, 0.1, 0.11 * thick], [0, -0.04, 0], glove), ...(o[`hand${side}`] || [])])])]);
  const leg = (side, s) => J(`Leg${side}`, [s * 0.14, 0, 0], [
    b([0.15 * thick, 0.3, 0.16 * thick], [0, -0.15, 0], 'pants'), ...(o.leg || []),
    J(`Shin${side}`, [0, -0.3, 0], [b([0.13 * thick, 0.22, 0.14 * thick], [0, -0.11, 0], o.shin ? 'boot' : 'pants'),
      J(`Foot${side}`, [0, -0.22, 0], [b([0.15, 0.1, 0.27], [0, -0.05, 0.05], 'boot', { name: `Shoe${side}` })])])]);
  return model({ id, about, tags: ['character', 'puppet'], palette, parts: [
    J('Pelvis', [0, 0.62, 0], [b([0.44, 0.2, 0.28], [0, 0.02, 0], 'pants'), ...(o.pelvis || []),
      J('Torso', [0, 0, 0], [b([tw, 0.48, td], [0, 0.32, 0], 'coat'), ...(o.torso || []),
        J('Head', [0, 0.6, 0], [...head, ...band, ...(o.head || [])]), arm('R', -1), arm('L', 1)]),
      leg('R', -1), leg('L', 1)])] });
}
const souwester = (c) => [b([0.42, 0.05, 0.46], [0, 0.31, -0.02], c), b([0.3, 0.12, 0.3], [0, 0.36, 0], c)];
const cap = (c) => [b([0.33, 0.1, 0.33], [0, 0.32, 0], c), b([0.24, 0.04, 0.12], [0, 0.28, 0.2], c)];
const scarfHead = (c) => [b([0.35, 0.2, 0.34], [0, 0.22, -0.02], c), b([0.2, 0.14, 0.08], [0, 0.03, -0.17], c)];
const apron = (c) => [b([0.36, 0.52, 0.04], [0, 0.26, 0.15], c)];
const limpetNeck = [b([0.14, 0.1, 0.08], [0, 0.04, -0.18], 'lim', { glow: true })];

export const max = puppet('max', 'Max Ransom: grey trench coat, sand hair from behind, red scarf, sunglasses', { coat: 'slate', pants: 'night', skin: 'mist', boot: 'ink', hair: 'orange', hair2: 'sand', scarf: 'red', glass: 'ink', belt: 'night', glove: 'mist', collar: 'mist' }, {
  torsoW: 0.38, limb: 0.92,
  head: [b([0.33, 0.1, 0.33], [0, 0.27, -0.01], 'hair'), b([0.33, 0.13, 0.07], [0, 0.17, -0.16], 'hair'), b([0.05, 0.13, 0.26], [-0.16, 0.18, -0.03], 'hair'), b([0.05, 0.13, 0.26], [0.16, 0.18, -0.03], 'hair'), b([0.2, 0.05, 0.05], [0.05, 0.31, -0.1], 'hair2'), b([0.1, 0.05, 0.05], [-0.09, 0.28, -0.17], 'hair2'), b([0.29, 0.07, 0.04], [0, 0.15, 0.16], 'glass')],
  torso: [b([0.42, 0.06, 0.3], [0, 0.14, 0], 'belt'), b([0.05, 0.3, 0.02], [0, 0.34, -0.14], 'belt'), b([0.3, 0.11, 0.3], [0, 0.55, 0], 'scarf'), b([0.42, 0.05, 0.28], [0, 0.49, 0], 'collar')],
  pelvis: [b([0.46, 0.44, 0.3], [0, -0.16, 0], 'coat', { name: 'Skirt' })],
});
export const dame = puppet('dame', 'Dame Ottoline Vane: fur coat, ebony cane, handbag, hat with a feather', { coat: 'plum', pants: 'plum', skin: 'mist', boot: 'ink', hat: 'ink', feather: 'red', fur: 'sand', cane: 'ink', bag: 'night', gold: 'sand', trim: 'red' }, {
  torsoW: 0.46, torsoD: 0.32,
  head: [b([0.4, 0.05, 0.4], [0, 0.29, 0], 'hat'), b([0.27, 0.1, 0.27], [0, 0.34, 0], 'hat'), b([0.04, 0.26, 0.08], [0.13, 0.42, -0.05], 'feather', { rot: [18, 0, -10] }), b([0.2, 0.06, 0.04], [0, 0.17, 0.16], 'cane')],
  torso: [b([0.5, 0.12, 0.36], [0, 0.54, 0], 'fur'), b([0.5, 0.1, 0.36], [0, 0.1, 0], 'fur')],
  pelvis: [b([0.5, 0.36, 0.36], [0, -0.14, 0], 'coat'), b([0.5, 0.06, 0.36], [0, -0.33, 0], 'trim')],
  handR: [{ cyl: [0.05, 0.62, 0.05], at: [0, -0.32, 0.03], c: 'cane' }, b([0.07, 0.05, 0.14], [0, -0.04, 0.05], 'gold')],
  handL: [b([0.2, 0.16, 0.09], [0, -0.2, 0], 'bag'), b([0.08, 0.06, 0.1], [0, -0.09, 0], 'gold')],
});
const isl = (id, p, head) => puppet(id, 'Oilskin-clad islander with a glowing eye band and a limpet on the neck', { coat: 'teal', pants: 'night', skin: 'mist', band: 'orange', hat: 'navy', boot: 'ink', lim: 'lime', ...p }, { head: [...head(p.hat || 'navy').map((x) => ({ ...x, c: 'hat' })), ...limpetNeck] });
export const islander = isl('islander', {}, souwester);
export const islander2 = isl('islander2', { coat: 'navy', pants: 'slate', hat: 'teal', band: 'orange' }, cap);
export const islander3 = isl('islander3', { coat: 'plum', pants: 'night', skin: 'sand', hat: 'night', band: 'red' }, (c) => [b([0.33, 0.06, 0.33], [0, 0.3, 0], c)]);
export const netwife = puppet('netwife', 'Net-wife in headscarf and apron, net over one arm', { coat: 'blue', pants: 'night', skin: 'mist', band: 'orange', hat: 'red', boot: 'ink', net: 'sand', lim: 'lime' }, { head: [...scarfHead('hat'), ...limpetNeck], torso: apron('net'), pelvis: [b([0.46, 0.4, 0.3], [0, -0.14, 0], 'coat')] });
export const bottler = puppet('bottler', 'Bottler: leather apron, bandolier of oil bottles', { coat: 'orange', pants: 'night', skin: 'mist', band: 'orange', hat: 'night', boot: 'ink', bottle: 'lime', lim: 'lime' }, { head: [...cap('hat'), ...limpetNeck], torso: [b([0.3, 0.1, 0.06], [-0.05, 0.34, 0.15], 'bottle', { rot: [0, 0, 30] }), b([0.44, 0.08, 0.3], [0, 0.12, 0], 'hat')] });
export const deckhand = puppet('deckhand', 'Deckhand: striped jersey, bare head, fast', { coat: 'white', stripe: 'navy', pants: 'navy', skin: 'mist', band: 'orange', boot: 'ink', hair: 'night', lim: 'lime' }, { head: [b([0.33, 0.1, 0.33], [0, 0.26, 0], 'hair'), ...limpetNeck], torso: [b([0.44, 0.07, 0.28], [0, 0.42, 0], 'stripe'), b([0.44, 0.07, 0.28], [0, 0.26, 0], 'stripe'), b([0.44, 0.07, 0.28], [0, 0.1, 0], 'stripe')] });
export const carrier = puppet('carrier', 'Carrier: big man with an empty sack, goes for the Dame', { coat: 'sand', pants: 'night', skin: 'mist', band: 'orange', hat: 'orange', boot: 'ink', sack: 'orange', lim: 'lime' }, { torsoW: 0.5, torsoD: 0.34, shoulders: 1.15, limb: 1.2, head: [...souwester('hat'), ...limpetNeck], torso: [b([0.36, 0.5, 0.18], [0, 0.32, -0.22], 'sack')] });
export const flenser = puppet('flenser', 'The Flenser: rubber apron, sack hood with eye holes', { coat: 'night', pants: 'ink', skin: 'orange', band: 'red', apron: 'red', boot: 'ink', rub: 'plum', tube: 'slate' }, { torsoW: 0.5, torsoD: 0.34, shoulders: 1.15, limb: 1.25, head: [b([0.33, 0.12, 0.33], [0, 0.33, 0], 'skin'), b([0.12, 0.14, 0.12], [0, 0.42, 0], 'skin')], torso: [b([0.42, 0.56, 0.04], [0, 0.28, 0.18], 'apron'), { cyl: [0.26, 0.42, 0.2], at: [0, 0.34, -0.26], c: 'tube', seg: 8 }, b([0.06, 0.3, 0.06], [0.14, 0.62, -0.26], 'rub')], pelvis: [b([0.42, 0.42, 0.04], [0, -0.2, 0.17], 'apron')] });
export const resalted = puppet('resalted', 'Re-Salted: a corpse white with salt, eye band blazing', { coat: 'white', pants: 'mist', skin: 'white', band: 'red', boot: 'slate', salt: 'mist' }, { head: [b([0.1, 0.1, 0.08], [0.1, 0.3, -0.1], 'salt')], torso: [b([0.2, 0.2, 0.05], [0.08, 0.2, 0.14], 'salt')] });
export const monk = puppet('monk', 'Cowled monk in a long habit', { coat: 'night', pants: 'night', skin: 'ink', band: 'orange', hood: 'plum', boot: 'ink', cord: 'sand' }, { head: [b([0.37, 0.36, 0.36], [0, 0.17, -0.03], 'hood'), b([0.16, 0.26, 0.1], [0, 0.17, -0.22], 'hood')], torso: [b([0.46, 0.06, 0.3], [0, 0.12, 0], 'cord'), b([0.5, 0.1, 0.34], [0, 0.56, 0], 'hood')], pelvis: [b([0.5, 0.56, 0.34], [0, -0.26, 0], 'coat')] });
export const knight = puppet('knight', 'Reliquary knight: rusted plate over an old habit, helmet that can be shot off', { coat: 'slate', pants: 'slate', skin: 'ink', band: 'orange', plate: 'mist', boot: 'night', rust: 'orange', cloth: 'plum' }, { torsoW: 0.5, torsoD: 0.34, shoulders: 1.15, limb: 1.25, head: [], torso: [b([0.46, 0.3, 0.04], [0, 0.38, 0.18], 'plate'), b([0.2, 0.2, 0.05], [0, 0.34, 0.2], 'rust'), b([0.58, 0.12, 0.38], [0, 0.56, 0], 'plate')], pelvis: [b([0.5, 0.4, 0.34], [0, -0.14, 0], 'cloth')], armR: [b([0.18, 0.12, 0.18], [0, -0.02, 0], 'plate')], armL: [b([0.18, 0.12, 0.18], [0, -0.02, 0], 'plate')], leg: [b([0.17, 0.1, 0.05], [0, -0.26, 0.08], 'plate')] });
export const drowned = puppet('drowned', 'Drowned islander, weed-hung, dripping', { coat: 'teal', pants: 'navy', skin: 'cyan', band: 'lime', weed: 'green', boot: 'navy' }, { head: [b([0.34, 0.08, 0.33], [0, 0.28, 0], 'weed'), b([0.06, 0.2, 0.06], [-0.13, 0.12, 0.13], 'weed')], torso: [b([0.3, 0.1, 0.04], [0.04, 0.5, 0.14], 'weed'), b([0.06, 0.26, 0.04], [-0.1, 0.3, 0.14], 'weed')] });
export const harpooner = puppet('harpooner', 'Boat harpooner in a heavy yellow oilskin', { coat: 'sand', pants: 'orange', skin: 'mist', band: 'orange', hat: 'sand', boot: 'ink', lim: 'lime' }, { head: [...souwester('hat'), ...limpetNeck], torsoW: 0.46 });
export const ansgar = puppet('ansgar', 'Mate Ansgar: pea coat, broad as a door', { coat: 'navy', pants: 'night', skin: 'sand', band: 'orange', hat: 'navy', boot: 'ink', brass: 'sand', lim: 'lime' }, { torsoW: 0.54, torsoD: 0.36, shoulders: 1.2, limb: 1.3, head: [...cap('hat'), ...limpetNeck], torso: [b([0.05, 0.05, 0.03], [0.1, 0.42, 0.19], 'brass'), b([0.05, 0.05, 0.03], [-0.1, 0.42, 0.19], 'brass'), b([0.05, 0.05, 0.03], [0.1, 0.26, 0.19], 'brass'), b([0.05, 0.05, 0.03], [-0.1, 0.26, 0.19], 'brass')] });
export const nils = puppet('nils', 'Nils the boatman, sou\'wester, no glow', { coat: 'sand', pants: 'slate', skin: 'mist', hat: 'sand', boot: 'ink', eye: 'ink' }, { head: [...souwester('hat'), b([0.2, 0.05, 0.03], [0, 0.17, 0.155], 'eye')] });
export const mender = puppet('mender', 'The net-mender: old man, cap, net in his lap', { coat: 'slate', pants: 'night', skin: 'mist', band: 'orange', hat: 'night', boot: 'ink', beard: 'white', lim: 'lime' }, { head: [...cap('hat'), b([0.27, 0.13, 0.06], [0, 0.03, 0.15], 'beard'), ...limpetNeck] });
export const commodore = puppet('commodore', 'Commodore Thole: gaunt, peaked cap, far too many medals, dressing gown', { coat: 'navy', pants: 'plum', skin: 'mist', hat: 'navy', boot: 'red', gold: 'sand', medal: 'orange', gown: 'red', eye: 'ink' }, { torsoW: 0.34, torsoD: 0.22, limb: 0.8, head: [b([0.38, 0.06, 0.38], [0, 0.31, 0], 'hat'), b([0.3, 0.1, 0.3], [0, 0.37, 0], 'hat'), b([0.26, 0.04, 0.1], [0, 0.29, 0.2], 'gold'), b([0.2, 0.04, 0.03], [0, 0.17, 0.155], 'eye')], torso: [{ group: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => b([0.05, 0.06, 0.03], [-0.12 + (i % 4) * 0.08, 0.44 - Math.floor(i / 4) * 0.1, 0.12], i % 2 ? 'medal' : 'gold')) }], pelvis: [b([0.38, 0.4, 0.28], [0, -0.14, 0], 'gown')] });
export const fathom = puppet('fathom', 'Mr. Fathom: brass diving helmet with a porthole, oilskin, green lantern', { coat: 'teal', pants: 'navy', skin: 'ink', brass: 'orange', bolt: 'sand', glass: 'lime', boot: 'ink', lamp: 'lime', trim: 'night' }, { torsoW: 0.48, torsoD: 0.32, noHead: true,
  head: [{ ball: [0.52, 0.5, 0.52], at: [0, 0.2, 0], c: 'brass' }, { torus: [0.3, 0.08, 0.3], at: [0, 0.2, 0.25], rot: [90, 0, 0], c: 'bolt' }, b([0.2, 0.2, 0.03], [0, 0.2, 0.26], 'glass', { glow: true }), { cyl: [0.4, 0.1, 0.4], at: [0, -0.03, 0], c: 'bolt' }, { torus: [0.14, 0.05, 0.14], at: [0.27, 0.2, 0], rot: [0, 0, 90], c: 'bolt' }, { torus: [0.14, 0.05, 0.14], at: [-0.27, 0.2, 0], rot: [0, 0, 90], c: 'bolt' }, { cyl: [0.1, 0.1, 0.1], at: [0, 0.48, 0], c: 'bolt' }],
  torso: [b([0.54, 0.16, 0.38], [0, 0.5, 0], 'bolt')], pelvis: [b([0.52, 0.42, 0.36], [0, -0.14, 0], 'coat')],
  handL: [{ cyl: [0.16, 0.2, 0.16], at: [0, -0.2, 0], c: 'trim' }, b([0.1, 0.14, 0.1], [0, -0.2, 0], 'lamp', { glow: true })] });
export const bosun = puppet('bosun', 'The Bosun: four metres of barnacled enforcer, three brine sacs on his back', { coat: 'slate', pants: 'night', skin: 'teal', band: 'orange', crust: 'mist', boot: 'ink', sac: 'lime', hat: 'night' }, { torsoW: 0.56, torsoD: 0.36, shoulders: 1.2, limb: 1.35,
  head: [b([0.34, 0.1, 0.34], [0, 0.32, 0], 'crust'), b([0.1, 0.08, 0.1], [0.12, 0.38, 0.04], 'crust'), b([0.36, 0.12, 0.04], [0, 0.03, 0.16], 'crust')],
  torso: [{ group: [{ ball: [0.22, 0.22, 0.14], at: [-0.17, 0.46, -0.21], c: 'sac', glow: true, name: 'SacA' }] , name: 'Sac0', pivot: true }, { group: [{ ball: [0.22, 0.22, 0.14], at: [0.17, 0.46, -0.21], c: 'sac', glow: true }], name: 'Sac1', pivot: true }, { group: [{ ball: [0.26, 0.24, 0.14], at: [0, 0.2, -0.21], c: 'sac', glow: true }], name: 'Sac2', pivot: true }, b([0.2, 0.14, 0.06], [0.13, 0.42, 0.18], 'crust'), b([0.14, 0.12, 0.06], [-0.14, 0.24, 0.18], 'crust')],
  armR: [b([0.2, 0.1, 0.2], [0, -0.04, 0], 'crust')], armL: [b([0.2, 0.1, 0.2], [0, -0.04, 0], 'crust')], leg: [b([0.17, 0.09, 0.05], [0, -0.2, 0.09], 'crust')] });
export const bathysphere = puppet('bathysphere', 'The walking Bathysphere of Saint Orrin: brass ball, porthole, pipes', { coat: 'orange', pants: 'night', skin: 'sand', boot: 'ink', brass: 'orange', bolt: 'sand', glass: 'cyan', valve: 'red', pipe: 'slate', hatch: 'sand' }, { noHead: true, torsoW: 0.2, torsoD: 0.2, shoulders: 1.5, limb: 1.4,
  head: [],
  torso: [{ ball: [1.05, 1.05, 1.05], at: [0, 0.42, 0], c: 'brass', seg: 12 }, { torus: [0.56, 0.1, 0.56], at: [0, 0.46, 0.46], rot: [90, 0, 0], c: 'bolt' }, b([0.38, 0.38, 0.03], [0, 0.46, 0.5], 'glass', { glow: true }), b([0.1, 0.5, 0.08], [0.38, 0.5, -0.36], 'pipe'), b([0.1, 0.5, 0.08], [-0.38, 0.5, -0.36], 'pipe'), { cyl: [0.5, 0.08, 0.5], at: [0, 0.97, 0], c: 'hatch', name: 'HatchLid' }, { cyl: [0.14, 0.24, 0.14], at: [0.3, 0.92, -0.2], c: 'pipe' }, { cyl: [0.14, 0.24, 0.14], at: [-0.3, 0.92, -0.2], c: 'pipe' }] });
export const limpet = model({ id: 'limpet', about: 'A limpet out of its host: low brown dome, feelers, one orange slit', tags: ['creature'], palette: { shell: 'plum', flesh: 'lime', eye: 'orange' }, parts: [{ ball: [0.46, 0.2, 0.46], at: [0, 0.14, 0], half: true, c: 'shell' }, { cyl: [0.42, 0.06, 0.42], at: [0, 0.05, 0], c: 'flesh' }, b([0.16, 0.05, 0.05], [0, 0.11, 0.2], 'eye', { glow: true }), { tube: [[0.14, 0.05, 0.15], [0.26, 0.04, 0.3]], r: 0.03, c: 'flesh' }, { tube: [[-0.14, 0.05, 0.15], [-0.26, 0.04, 0.3]], r: 0.03, c: 'flesh' }, { tube: [[0.2, 0.05, -0.05], [0.32, 0.04, -0.15]], r: 0.03, c: 'flesh' }, { tube: [[-0.2, 0.05, -0.05], [-0.32, 0.04, -0.15]], r: 0.03, c: 'flesh' }] });
export const mother = model({ id: 'mother', about: 'The Mother: a 3.5 m limpet with the Commodore fused on top', tags: ['creature', 'boss'], palette: { shell: 'plum', flesh: 'lime', eye: 'orange', dark: 'night', coat: 'navy', skin: 'mist', hat: 'navy', brass: 'sand', gold: 'orange' }, parts: [
  { ball: [4.4, 2.6, 4.2], at: [0, 1.3, 0], c: 'shell', seg: 12 }, { cyl: [4.2, 0.5, 4.0], at: [0, 0.25, 0], c: 'flesh', seg: 12 }, { ball: [1.0, 0.5, 0.4], at: [0, 0.9, 2.0], c: 'dark' },
  { group: [{ ball: [0.9, 0.7, 0.4], at: [0, 0, 0], c: 'eye', glow: true }], name: 'Eye', pivot: true, at: [0, 1.5, 1.95] },
  ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ tube: [[Math.sin(a * 0.01745) * 1.8, 0.3, Math.cos(a * 0.01745) * 1.8], [Math.sin(a * 0.01745) * 3, 0.1, Math.cos(a * 0.01745) * 3]], r: [0.2, 0.08], c: 'flesh', name: `feel${i}` })),
  { group: [b([0.55, 0.9, 0.36], [0, 3, 0.3], 'coat'), b([0.42, 0.42, 0.42], [0, 3.7, 0.3], 'skin'), b([0.52, 0.08, 0.52], [0, 3.92, 0.3], 'hat'), b([0.4, 0.14, 0.4], [0, 4, 0.3], 'hat'), b([0.12, 0.8, 0.16], [-0.4, 3, 0.4], 'coat', { rot: [-40, 0, 0] }), b([0.12, 0.8, 0.16], [0.4, 3, 0.4], 'coat', { rot: [-40, 0, 0] })], name: 'Fused', pivot: true },
  { group: [{ cyl: [0.26, 0.5, 0.26], at: [0, 0, 0], c: 'brass' }, { ball: [0.36, 0.36, 0.36], at: [0, 0.3, 0], c: 'gold' }], name: 'Mic', pivot: true, at: [0, 3.2, 0.72] },
] });
export const HUMANS = { max, dame, islander, islander2, islander3, netwife, bottler, deckhand, carrier, flenser, resalted, monk, knight, drowned, harpooner, ansgar, nils, mender, commodore, fathom, bosun, bathysphere };
export const CREATURES = { limpet, mother };
