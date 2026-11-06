// Monster bodies. Humanoids use the template; others are single pieces driven in code.
import { model } from '../../../pixel-engine.js';
import { eyes, foot, hand, humanoid, limb } from './rig.js';

const MM = (id, about, palette, parts, extra = {}) => model({ id, about, tags: ['monster'], palette, parts, ...extra });

export const peatwalker = MM('peatwalker', 'Peatwalker: sodden corpse caked in mud', { mud: 'night', flesh: 'teal', rag: 'slate', eye: 'sand' }, humanoid({
  hips: [{ box: [0.36, 0.2, 0.24], at: [0, -0.02, 0], c: 'rag' }],
  chest: [{ box: [0.42, 0.44, 0.28], at: [0, 0.2, 0.02], c: 'mud' }, { box: [0.16, 0.16, 0.05], at: [-0.08, 0.28, 0.16], c: 'flesh' }],
  head: [{ box: [0.27, 0.27, 0.27], at: [0, 0.13, 0.02], c: 'flesh' }, eyes('eye', 0.15, 0.16), { box: [0.3, 0.09, 0.3], at: [0, 0.28, 0], c: 'mud' }],
  upperArm: [limb(0.13, 0.25, 'flesh')], foreArm: [limb(0.12, 0.2, 'mud')], thigh: [limb(0.15, 0.3, 'rag')], shin: [limb(0.13, 0.22, 'mud')], foot: foot('mud'),
}));
export const gibbet_drop = MM('gibbet_drop', 'Gibbet Drop: lean hanged corpse with a noose', { skin: 'mist', rope: 'orange', rag: 'plum', eye: 'red' }, humanoid({
  hips: [{ box: [0.3, 0.18, 0.2], at: [0, -0.02, 0], c: 'rag' }], chest: [{ box: [0.3, 0.44, 0.2], at: [0, 0.2, 0], c: 'skin' }, { box: [0.18, 0.3, 0.04], at: [0, 0.14, 0.11], c: 'rag' }],
  head: [{ box: [0.22, 0.25, 0.22], at: [0.03, 0.1, 0.03], c: 'skin' }, eyes('eye', 0.13, 0.15), { box: [0.3, 0.06, 0.3], at: [0, -0.02, 0], c: 'rope' }, { box: [0.06, 0.32, 0.06], at: [0, 0.2, -0.17], c: 'rope' }],
  upperArm: [limb(0.1, 0.25, 'skin')], foreArm: [limb(0.09, 0.2, 'skin')], thigh: [limb(0.11, 0.3, 'rag')], shin: [limb(0.1, 0.22, 'skin')], foot: foot('skin'),
}));
export const rattlebones = MM('rattlebones', 'Rattlebones: skeleton with a rusted sword', { bone: 'white', dark: 'mist', eye: 'red', rust: 'orange' }, humanoid({
  hips: [{ box: [0.3, 0.1, 0.18], at: [0, 0, 0], c: 'bone' }], chest: [{ box: [0.08, 0.42, 0.08], at: [0, 0.2, -0.02], c: 'dark' }, { box: [0.34, 0.07, 0.2], at: [0, 0.34, 0], c: 'bone' }, { box: [0.3, 0.07, 0.2], at: [0, 0.22, 0], c: 'bone' }, { box: [0.26, 0.07, 0.18], at: [0, 0.1, 0], c: 'bone' }],
  head: [{ box: [0.24, 0.24, 0.25], at: [0, 0.14, 0], c: 'bone' }, eyes('eye', 0.17, 0.13)],
  upperArm: [limb(0.07, 0.25, 'bone')], foreArm: [limb(0.07, 0.17, 'dark')], handR: [{ box: [0.08, 0.5, 0.05], at: [0, -0.2, 0.12], rot: [60, 0, 0], c: 'rust' }],
  thigh: [limb(0.08, 0.3, 'bone')], shin: [limb(0.07, 0.22, 'dark')], foot: [{ box: [0.1, 0.05, 0.2], at: [0, -0.02, 0.04], c: 'bone' }],
}));
export const pallid_bearer = MM('pallid_bearer', 'Pallid Bearer: huge skeleton hauling a coffin', { bone: 'mist', dark: 'slate', coffin: 'plum', band: 'orange', eye: 'lime' }, humanoid({
  hips: [{ box: [0.36, 0.16, 0.22], at: [0, 0, 0], c: 'bone' }], chest: [{ box: [0.42, 0.44, 0.24], at: [0, 0.2, 0], c: 'dark' }, { mirror: [{ box: [0.18, 0.14, 0.28], at: [0.26, 0.4, 0], c: 'bone' }], axis: 'x' }],
  head: [{ box: [0.26, 0.25, 0.26], at: [0, 0.13, 0], c: 'bone' }, eyes('eye', 0.16, 0.14)],
  upperArm: [limb(0.13, 0.25, 'bone')], foreArm: [limb(0.13, 0.17, 'dark')],
  handR: [{ box: [0.38, 1, 0.16], at: [0, -0.25, 0.1], c: 'coffin' }, { box: [0.42, 0.06, 0.18], at: [0, -0.1, 0.1], c: 'band' }, { box: [0.42, 0.06, 0.18], at: [0, -0.5, 0.1], c: 'band' }],
  thigh: [limb(0.14, 0.3, 'bone')], shin: [limb(0.12, 0.22, 'dark')], foot: foot('bone'),
}), { floats: true });
export const cinderling = MM('cinderling', 'Cinderling: small hot imp from Below', { hide: 'ink', hot: 'orange', core: 'sand', eye: 'white' }, humanoid({
  hips: [{ box: [0.3, 0.18, 0.22], at: [0, 0, 0], c: 'hide' }], chest: [{ box: [0.36, 0.42, 0.26], at: [0, 0.2, 0], c: 'hide' }, { box: [0.18, 0.2, 0.04], at: [0, 0.24, 0.14], c: 'hot', glow: true }],
  head: [{ box: [0.34, 0.28, 0.3], at: [0, 0.13, 0], c: 'hide' }, eyes('eye', 0.15, 0.16), { mirror: [{ cone: [0.1, 0.24, 0.1], at: [0.14, 0.36, 0], c: 'hot' }], axis: 'x' }],
  upperArm: [limb(0.11, 0.25, 'hide')], foreArm: [limb(0.1, 0.2, 'hot')], thigh: [limb(0.13, 0.3, 'hide')], shin: [limb(0.11, 0.22, 'hot')], foot: foot('hide'),
}));
export const tithe_collector = MM('tithe_collector', 'Tithe Collector: tall hook and open ledger', { robe: 'night', skin: 'mist', hook: 'slate', book: 'sand', eye: 'orange', trim: 'orange' }, humanoid({
  hips: [{ box: [0.36, 0.22, 0.26], at: [0, -0.04, 0], c: 'robe' }, { box: [0.4, 0.32, 0.28], at: [0, -0.22, 0], c: 'robe' }], chest: [{ box: [0.38, 0.46, 0.26], at: [0, 0.2, 0], c: 'robe' }, { box: [0.06, 0.4, 0.03], at: [0, 0.2, 0.14], c: 'trim' }],
  head: [{ box: [0.24, 0.26, 0.24], at: [0, 0.13, 0], c: 'skin' }, { box: [0.3, 0.3, 0.3], at: [0, 0.2, -0.04], c: 'robe' }, eyes('eye', 0.13, 0.13)],
  upperArm: [limb(0.11, 0.25, 'robe')], foreArm: [limb(0.1, 0.17, 'robe')], handR: [{ box: [0.05, 0.7, 0.05], at: [0, -0.2, 0.05], rot: [60, 0, 0], c: 'hook' }, { torus: [0.26, 0.05, 0.26], at: [0, -0.45, 0.38], rot: [90, 0, 0], c: 'hook' }], handL: [{ box: [0.26, 0.32, 0.07], at: [0, -0.13, 0.08], c: 'book' }],
  thigh: [limb(0.13, 0.3, 'robe')], shin: [limb(0.12, 0.22, 'robe')], foot: foot('robe'),
}));
export const penitent = MM('penitent', 'Penitent: robed, hooded, a flail of chains', { robe: 'plum', hood: 'red', dark: 'ink', eye: 'white', chain: 'mist' }, humanoid({
  hips: [{ box: [0.36, 0.22, 0.26], at: [0, -0.04, 0], c: 'robe' }, { box: [0.38, 0.4, 0.26], at: [0, -0.26, 0], c: 'robe' }], chest: [{ box: [0.36, 0.44, 0.25], at: [0, 0.2, 0], c: 'robe' }, { box: [0.08, 0.44, 0.04], at: [0, 0.2, 0.13], c: 'dark' }],
  head: [{ cone: [0.38, 0.54, 0.38], at: [0, 0.27, 0], c: 'hood' }, { box: [0.17, 0.07, 0.05], at: [0, 0.18, 0.13], c: 'dark' }, eyes('eye', 0.18, 0.16)],
  upperArm: [limb(0.11, 0.25, 'robe')], foreArm: [limb(0.1, 0.17, 'dark')], handR: [{ box: [0.05, 0.5, 0.05], at: [0, -0.25, 0], c: 'chain' }, { ball: [0.16, 0.16, 0.16], at: [0, -0.52, 0], c: 'chain' }],
  thigh: [limb(0.13, 0.3, 'robe')], shin: [limb(0.12, 0.22, 'dark')], foot: foot('dark'),
}));
export const shade_acolyte = MM('shade_acolyte', 'Shade Acolyte: hovering shadow with a green glow', { robe: 'ink', trim: 'green', eye: 'lime', skin: 'slate' }, humanoid({
  hips: [{ box: [0.34, 0.22, 0.24], at: [0, -0.04, 0], c: 'robe' }, { box: [0.42, 0.46, 0.3], at: [0, -0.32, 0], c: 'robe' }], chest: [{ box: [0.34, 0.44, 0.24], at: [0, 0.2, 0], c: 'robe' }, { box: [0.3, 0.05, 0.26], at: [0, 0.34, 0], c: 'trim' }],
  head: [{ box: [0.3, 0.34, 0.3], at: [0, 0.17, -0.02], c: 'robe' }, { box: [0.2, 0.18, 0.04], at: [0, 0.14, 0.13], c: 'skin' }, eyes('eye', 0.15, 0.16)],
  upperArm: [limb(0.1, 0.25, 'robe')], foreArm: [limb(0.1, 0.17, 'robe')], handR: [{ ball: [0.14, 0.14, 0.14], at: [0, -0.05, 0], c: 'eye', glow: true }], handL: [{ ball: [0.14, 0.14, 0.14], at: [0, -0.05, 0], c: 'eye', glow: true }],
  thigh: [limb(0.12, 0.3, 'robe')], shin: [limb(0.1, 0.22, 'robe')], foot: foot('robe'),
}));
export const skeleton_minion = MM('skeleton_minion', 'Pallbearer minion: skeleton in a black sash', { bone: 'white', dark: 'mist', sash: 'lime', eye: 'lime' }, humanoid({
  hips: [{ box: [0.3, 0.1, 0.18], at: [0, 0, 0], c: 'bone' }], chest: [{ box: [0.08, 0.42, 0.08], at: [0, 0.2, -0.02], c: 'dark' }, { box: [0.34, 0.07, 0.2], at: [0, 0.34, 0], c: 'bone' }, { box: [0.3, 0.07, 0.2], at: [0, 0.2, 0], c: 'sash' }],
  head: [{ box: [0.24, 0.24, 0.25], at: [0, 0.14, 0], c: 'bone' }, eyes('eye', 0.17, 0.13)],
  upperArm: [limb(0.07, 0.25, 'bone')], foreArm: [limb(0.07, 0.17, 'dark')], handR: [{ box: [0.1, 0.42, 0.05], at: [0, -0.2, 0.08], rot: [60, 0, 0], c: 'dark' }],
  thigh: [limb(0.08, 0.3, 'bone')], shin: [limb(0.07, 0.22, 'dark')], foot: [{ box: [0.1, 0.05, 0.2], at: [0, -0.02, 0.04], c: 'bone' }],
}));
export const coffin_crew = MM('coffin_crew', 'Big pallbearer minion with a coffin', { bone: 'white', dark: 'mist', coffin: 'plum', sash: 'lime', eye: 'lime' }, humanoid({
  hips: [{ box: [0.36, 0.16, 0.22], at: [0, 0, 0], c: 'bone' }], chest: [{ box: [0.42, 0.44, 0.24], at: [0, 0.2, 0], c: 'dark' }, { box: [0.46, 0.08, 0.26], at: [0, 0.3, 0], c: 'sash' }],
  head: [{ box: [0.26, 0.25, 0.26], at: [0, 0.13, 0], c: 'bone' }, eyes('eye', 0.16, 0.14)],
  upperArm: [limb(0.13, 0.25, 'bone')], foreArm: [limb(0.13, 0.17, 'dark')], handR: [{ box: [0.36, 0.9, 0.16], at: [0, -0.25, 0.1], c: 'coffin' }],
  thigh: [limb(0.14, 0.3, 'bone')], shin: [limb(0.12, 0.22, 'dark')], foot: foot('bone'),
}), { floats: true });
export const bursar = MM('bursar', 'The Bursar: bloated demon accountant in a stolen cope', { hide: 'red', cope: 'plum', trim: 'sand', belly: 'orange', dark: 'ink', eye: 'white', book: 'sand', bead: 'orange' }, humanoid({
  hips: [{ box: [0.62, 0.3, 0.46], at: [0, -0.02, 0], c: 'hide' }, { box: [0.66, 0.2, 0.5], at: [0, -0.2, 0], c: 'cope' }],
  chest: [{ box: [0.72, 0.5, 0.54], at: [0, 0.2, 0.02], c: 'cope' }, { ball: [0.62, 0.52, 0.5], at: [0, 0.08, 0.14], c: 'belly' }, { box: [0.14, 0.56, 0.06], at: [0, 0.2, 0.32], c: 'trim' }, { mirror: [{ box: [0.2, 0.14, 0.4], at: [0.33, 0.42, 0], c: 'trim' }], axis: 'x' }],
  head: [{ box: [0.36, 0.28, 0.32], at: [0, 0.12, 0.03], c: 'hide' }, eyes('eye', 0.16, 0.2), { mirror: [{ cone: [0.1, 0.3, 0.1], at: [0.16, 0.38, 0], c: 'dark' }], axis: 'x' }, { box: [0.28, 0.07, 0.05], at: [0, 0.03, 0.2], c: 'dark' }, { mirror: [{ torus: [0.1, 0.03, 0.1], at: [0.08, 0.17, 0.2], rot: [90, 0, 0], c: 'trim' }], axis: 'x' }],
  upperArm: [limb(0.17, 0.25, 'cope')], foreArm: [limb(0.17, 0.17, 'hide')],
  handR: [{ box: [0.5, 0.64, 0.14], at: [0, -0.28, 0.1], c: 'book' }, { box: [0.54, 0.68, 0.06], at: [0, -0.28, 0.03], c: 'dark' }],
  handL: [{ box: [0.42, 0.34, 0.07], at: [0, -0.18, 0.1], c: 'dark' }, { box: [0.34, 0.03, 0.09], at: [0, -0.1, 0.1], c: 'trim' }, { box: [0.34, 0.03, 0.09], at: [0, -0.22, 0.1], c: 'trim' }, { box: [0.07, 0.07, 0.1], at: [-0.08, -0.1, 0.1], c: 'bead' }, { box: [0.07, 0.07, 0.1], at: [0.08, -0.22, 0.1], c: 'bead' }],
  thigh: [limb(0.22, 0.3, 'cope')], shin: [limb(0.19, 0.22, 'dark')], foot: foot('dark'),
}));
// Non-humanoids.
export const choir_skull = MM('choir_skull', 'Choir Skull: a floating singing skull with a ruff', { bone: 'white', jaw: 'mist', ruff: 'plum', eye: 'cyan', dark: 'ink' }, [
  { box: [0.52, 0.42, 0.5], at: [0, 0.3, 0], c: 'bone' }, { box: [0.34, 0.14, 0.34], at: [0, 0.04, 0.03], c: 'jaw' }, { box: [0.28, 0.12, 0.05], at: [0, 0.13, 0.26], c: 'dark' }, { mirror: [{ box: [0.12, 0.12, 0.05], at: [0.13, 0.32, 0.25], c: 'eye', glow: true }], axis: 'x' }, { cyl: [0.62, 0.08, 0.62], at: [0, -0.03, 0], c: 'ruff', seg: 8 },
], { floats: true });
export const bloat_deacon = MM('bloat_deacon', 'Bloat Deacon: a swollen vestmented blob', { flesh: 'lime', robe: 'plum', trim: 'sand', eye: 'red', dark: 'ink' }, [
  { ball: [1.1, 1.1, 1], at: [0, 0.55, 0], c: 'flesh' }, { box: [0.7, 0.5, 0.05], at: [0, 0.34, 0.47], c: 'robe' }, { box: [0.14, 0.7, 0.07], at: [0, 0.45, 0.5], c: 'trim' }, { box: [0.4, 0.28, 0.32], at: [0, 1.12, 0.05], c: 'flesh' }, { mirror: [{ box: [0.08, 0.08, 0.03], at: [0.1, 1.15, 0.22], c: 'eye', glow: true }], axis: 'x' }, { box: [0.2, 0.05, 0.03], at: [0, 1.05, 0.22], c: 'dark' }, { cone: [0.26, 0.4, 0.2], at: [0, 1.46, 0.02], c: 'robe' },
]);
export const tomb_crawler = MM('tomb_crawler', 'Tomb Crawler body (legs are driven in code)', { shell: 'ink', bone: 'mist', eye: 'red' }, [
  { ball: [0.62, 0.34, 0.74], at: [0, 0.32, 0], c: 'shell' }, { box: [0.3, 0.12, 0.3], at: [0, 0.5, -0.05], c: 'bone' }, { mirror: [{ box: [0.07, 0.07, 0.04], at: [0.1, 0.36, 0.36], c: 'eye', glow: true }], axis: 'x' },
], { floats: true });
export const clapperjaw = MM('clapperjaw', 'Clapperjaw: big bell-shaped jawed beast (legs in code)', { hide: 'ink', plate: 'red', bronze: 'orange', eye: 'white', tooth: 'white' }, [
  { box: [1, 0.72, 1.46], at: [0, 1.02, -0.1], c: 'hide' }, { box: [1.06, 0.2, 1.28], at: [0, 1.44, -0.1], c: 'plate' }, { lathe: [[0.08, 0.6], [0.32, 0.5], [0.42, 0.12], [0.58, 0], [0.04, 0]], at: [0, 0.86, 0.74], rot: [85, 0, 0], c: 'bronze' }, { box: [0.8, 0.12, 0.4], at: [0, 0.64, 0.98], c: 'hide' }, { mirror: [{ box: [0.1, 0.16, 0.08], at: [0.22, 0.72, 1.14], c: 'tooth' }], axis: 'x' }, { mirror: [{ box: [0.12, 0.12, 0.05], at: [0.3, 1.26, 0.64], c: 'eye', glow: true }], axis: 'x' },
], { floats: true });
export const ash_gargoyle = MM('ash_gargoyle', 'Ash Gargoyle: winged stone thing, low hover', { stone: 'slate', dark: 'night', eye: 'orange', wing: 'mist' }, [
  { box: [0.55, 0.62, 0.42], at: [0, 0.4, 0], c: 'stone' }, { box: [0.36, 0.3, 0.38], at: [0, 0.82, 0.1], c: 'stone' }, { mirror: [{ box: [0.08, 0.08, 0.03], at: [0.09, 0.84, 0.3], c: 'eye', glow: true }], axis: 'x' }, { mirror: [{ cone: [0.1, 0.24, 0.1], at: [0.15, 1.06, 0.04], c: 'dark' }], axis: 'x' },
  { mirror: [{ group: [{ box: [0.76, 0.56, 0.06], at: [0.38, 0.1, 0], c: 'wing' }, { box: [0.8, 0.09, 0.09], at: [0.38, 0.38, 0], c: 'dark' }], name: 'wing', pivot: true, at: [0.28, 0.58, -0.18] }], axis: 'x' },
  { box: [0.14, 0.2, 0.3], at: [-0.17, 0.08, 0.05], c: 'dark' }, { box: [0.14, 0.2, 0.3], at: [0.17, 0.08, 0.05], c: 'dark' },
], { floats: true });
export const collection_plate = MM('collection_plate', 'The Collection Plate: a bowl of coins (legs in code)', { dish: 'sand', dark: 'orange', coin: 'white', eye: 'ink' }, [
  { lathe: [[0.02, 0], [0.4, 0.03], [0.56, 0.17], [0.52, 0.2], [0.34, 0.09], [0.02, 0.09]], at: [0, 0.34, 0], c: 'dish' }, { cyl: [0.36, 0.06, 0.36], at: [0, 0.32, 0], c: 'dark', seg: 8 },
  { scatter: 0 },
].filter((p) => !('scatter' in p)).concat([{ ball: [0.1, 0.05, 0.1], at: [0.14, 0.47, 0.05], c: 'coin' }, { ball: [0.1, 0.05, 0.1], at: [-0.12, 0.47, 0.13], c: 'coin' }, { ball: [0.1, 0.05, 0.1], at: [0.02, 0.5, -0.14], c: 'coin' }, { ball: [0.1, 0.05, 0.1], at: [-0.2, 0.46, -0.08], c: 'dish' }]), { floats: true });
export const crawler_nest = MM('crawler_nest', 'Crawler Nest: a wet breakable mound', { wet: 'plum', dark: 'ink', sac: 'lime', bone: 'mist' }, [
  { lump: [1.6, 1, 1.6], at: [0, 0.5, 0], c: 'wet', seed: 3 }, { ball: [0.42, 0.42, 0.42], at: [0.4, 0.82, 0.32], c: 'sac' }, { ball: [0.34, 0.34, 0.34], at: [-0.34, 0.76, 0.22], c: 'sac' }, { box: [0.3, 0.1, 0.1], at: [0, 0.14, 0.82], c: 'bone' }, { ball: [0.46, 0.2, 0.46], at: [0, 1, -0.08], c: 'dark' },
]);
export const unrung_font = MM('unrung_font', 'Unrung Font: a boiling stoup', { stone: 'slate', dark: 'night', boil: 'orange', hot: 'sand' }, [
  { cyl: [0.5, 0.7, 0.5], at: [0, 0.35, 0], c: 'stone', seg: 8 }, { cyl: [1.5, 0.3, 1.5], at: [0, 0.85, 0], top: 1.15, c: 'stone', seg: 10 }, { cyl: [0.9, 0.08, 0.9], at: [0, 0.94, 0], c: 'boil', glow: true, seg: 10 }, { cyl: [0.9, 0.14, 0.9], at: [0, 0.07, 0], c: 'dark', seg: 8 }, { ball: [0.28, 0.22, 0.28], at: [0.2, 1.02, 0.1], c: 'hot', glow: true },
]);
export const malison = MM('malison', 'Malison, the Unrung Saint: a huge entombed torso', { stone: 'slate', dark: 'ink', crack: 'cyan', rope: 'orange', veil: 'mist', eye: 'white', halo: 'sand' }, [
  { cyl: [1.6, 0.9, 1.3], at: [0, 0.5, 0], top: 1.2, c: 'dark', seg: 8 }, { cyl: [2.4, 2.4, 1.7], at: [0, 2.1, 0], top: 1.25, c: 'stone', seg: 8 },
  { box: [0.12, 2, 0.12], at: [0.55, 2.2, 0.86], rot: [0, 0, 12], c: 'crack', glow: true }, { box: [0.1, 1.2, 0.1], at: [-0.5, 2.7, 0.84], rot: [0, 0, -18], c: 'crack', glow: true }, { box: [2.6, 0.2, 1.9], at: [0, 2.9, 0], c: 'rope' }, { box: [2.3, 0.2, 1.75], at: [0, 1.8, 0], rot: [0, 0, 8], c: 'rope' },
  { box: [1.1, 1.2, 1.05], at: [0, 3.95, 0.05], c: 'stone' }, { box: [1.3, 1, 1.15], at: [0, 4.1, -0.1], c: 'veil' }, { box: [0.86, 0.5, 0.06], at: [0, 3.9, 0.56], c: 'dark' }, { mirror: [{ box: [0.2, 0.14, 0.05], at: [0.22, 3.98, 0.59], c: 'eye', glow: true }], axis: 'x' }, { box: [0.5, 0.2, 0.05], at: [0, 3.7, 0.59], c: 'crack', glow: true },
  { torus: [2, 0.12, 2], at: [0, 4.8, -0.25], rot: [80, 0, 0], c: 'halo' },
], { floats: true });
export const old_clemency = MM('old_clemency', 'Old Clemency: the cracked great bell', { bronze: 'orange', dark: 'plum', crack: 'cyan', band: 'sand', beam: 'night' }, [
  { lathe: [[0.3, 3.5], [1.1, 3.25], [1.45, 2.4], [1.65, 1.3], [2.25, 0.2], [2.5, 0], [2.3, 0], [1.4, 1.1], [1, 2.2], [0.2, 3.2]], at: [0, 0, 0], c: 'bronze', seg: 12 }, { cyl: [3.3, 0.2, 3.3], at: [0, 1.5, 0], c: 'band', seg: 12 }, { cyl: [3.9, 0.2, 3.9], at: [0, 0.5, 0], c: 'dark', seg: 12 }, { box: [0.18, 2.6, 0.18], at: [1.15, 1.6, 1.3], rot: [0, 0, 22], c: 'crack', glow: true }, { box: [6.4, 0.5, 0.6], at: [0, 3.7, 0], c: 'beam' },
], { floats: true });
