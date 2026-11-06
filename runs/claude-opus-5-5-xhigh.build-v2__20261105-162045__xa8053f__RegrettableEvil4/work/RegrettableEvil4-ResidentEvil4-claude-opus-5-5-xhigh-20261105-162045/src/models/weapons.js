// Weapons and held things. Grip at the origin, barrel along +Z (a hand's local -Y is down the arm).
import { model } from '../../pixel-engine.js';

const gun = (o) => model({ tags: ['weapon'], floats: true, collider: 'none', ...o });

export const pistol = gun({ id: 'w-pistol', about: 'Ostrander .38: a stubby service revolver', palette: { steel: 'slate', dark: 'ink', grip: 'orange', sight: 'red' },
  parts: [
    { box: [0.06, 0.09, 0.26], at: [0, 0.05, 0.12], c: 'steel' },
    { cyl: [0.09, 0.09, 0.09], at: [0, 0.04, 0.06], rot: [90, 0, 0], c: 'dark' },
    { box: [0.06, 0.13, 0.07], at: [0, -0.05, -0.01], rot: [-16, 0, 0], c: 'grip' },
    { box: [0.02, 0.02, 0.05], at: [0, 0.11, 0.2], c: 'sight', glow: true },
  ] });
export const scatter = gun({ id: 'w-scatter', about: "Bosun's Scattergun: sawn-off pump", palette: { steel: 'night', wood: 'orange', dark: 'ink', band: 'sand' },
  parts: [
    { box: [0.07, 0.07, 0.62], at: [0, 0.04, 0.28], c: 'steel' },
    { box: [0.07, 0.05, 0.56], at: [0, -0.02, 0.26], c: 'dark' },
    { box: [0.09, 0.08, 0.17], at: [0, -0.02, 0.32], c: 'wood' },
    { box: [0.08, 0.1, 0.3], at: [0, -0.02, -0.14], rot: [10, 0, 0], c: 'wood' },
    { box: [0.08, 0.02, 0.03], at: [0, 0.08, 0.5], c: 'band' },
  ] });
export const rifle = gun({ id: 'w-rifle', about: "Sealer's Rifle: long bolt-action with a brass scope", palette: { steel: 'night', wood: 'plum', scope: 'sand', glass: 'cyan', bolt: 'mist' },
  parts: [
    { box: [0.05, 0.05, 0.86], at: [0, 0.05, 0.42], c: 'steel' },
    { box: [0.07, 0.08, 0.64], at: [0, -0.01, 0.1], c: 'wood' },
    { box: [0.07, 0.13, 0.26], at: [0, -0.04, -0.3], c: 'wood' },
    { cyl: [0.07, 0.3, 0.07], at: [0, 0.13, 0.12], rot: [90, 0, 0], c: 'scope' },
    { box: [0.05, 0.05, 0.01], at: [0, 0.13, 0.28], c: 'glass', glow: true },
    { box: [0.09, 0.03, 0.03], at: [0.06, 0.05, -0.02], c: 'bolt' },
  ] });
export const harpoonGun = gun({ id: 'w-harpoon', about: 'Harpoon Gun: a brass tube, a coil of line, a spike on the end', palette: { brass: 'sand', iron: 'night', wood: 'orange', line: 'white', tip: 'mist' },
  parts: [
    { cyl: [0.12, 0.6, 0.12], at: [0, 0.05, 0.26], rot: [90, 0, 0], c: 'brass' },
    { box: [0.08, 0.14, 0.14], at: [0, -0.06, -0.02], c: 'wood' },
    { box: [0.08, 0.1, 0.24], at: [0, -0.02, -0.18], c: 'wood' },
    { cone: [0.09, 0.2, 0.09], at: [0, 0.05, 0.64], rot: [90, 0, 0], c: 'tip' },
    { cyl: [0.03, 0.2, 0.03], at: [0, 0.05, 0.52], rot: [90, 0, 0], c: 'iron' },
    { torus: [0.14, 0.04, 0.14], at: [0, -0.04, 0.2], rot: [90, 0, 0], c: 'line' },
  ] });
export const bolt = gun({ id: 'w-bolt', about: 'A harpoon bolt with a barbed tip', palette: { iron: 'mist', tip: 'white', tail: 'red' },
  parts: [
    { cyl: [0.04, 0.9, 0.04], at: [0, 0, 0], rot: [90, 0, 0], c: 'iron' },
    { cone: [0.1, 0.18, 0.1], at: [0, 0, 0.5], rot: [90, 0, 0], c: 'tip' },
    { box: [0.12, 0.02, 0.1], at: [0, 0, -0.42], c: 'tail' },
  ] });
export const flare = gun({ id: 'w-flare', about: 'Magnesium Flare: a red stick with a striker', palette: { body: 'red', cap: 'white', tip: 'sand' },
  parts: [{ cyl: [0.08, 0.28, 0.08], at: [0, 0.14, 0], c: 'body' }, { cyl: [0.09, 0.05, 0.09], at: [0, 0.3, 0], c: 'cap' }, { cone: [0.05, 0.05, 0.05], at: [0, 0.35, 0], c: 'tip', glow: true }] });
export const depthCharge = gun({ id: 'w-depth', about: 'Depth Charge: a small squat drum with a fuse', palette: { body: 'night', band: 'orange', fuse: 'sand' },
  parts: [{ cyl: [0.26, 0.28, 0.26], at: [0, 0.14, 0], c: 'body' }, { cyl: [0.28, 0.05, 0.28], at: [0, 0.14, 0], c: 'band' }, { cyl: [0.03, 0.08, 0.03], at: [0, 0.32, 0], c: 'fuse' }] });
export const oilBottle = gun({ id: 'w-oil', about: 'Whale-Oil Bottle: a green bottle stuffed with a lit rag', palette: { glass: 'green', rag: 'sand', fire: 'orange' },
  parts: [{ cyl: [0.12, 0.2, 0.12], at: [0, 0.1, 0], c: 'glass' }, { cyl: [0.05, 0.1, 0.05], at: [0, 0.25, 0], c: 'glass' }, { box: [0.04, 0.06, 0.04], at: [0, 0.32, 0], c: 'rag' }, { box: [0.05, 0.05, 0.05], at: [0, 0.37, 0], c: 'fire', glow: true }] });
export const knife = gun({ id: 'w-knife', about: 'A short rigging knife', palette: { blade: 'white', grip: 'ink', guard: 'slate' },
  parts: [{ box: [0.03, 0.06, 0.3], at: [0, 0, 0.2], c: 'blade' }, { box: [0.05, 0.08, 0.04], at: [0, 0, 0.04], c: 'guard' }, { box: [0.05, 0.06, 0.1], at: [0, 0, -0.03], c: 'grip' }] });
export const flensingSaw = gun({ id: 'w-saw', about: "The Flenser's steam saw: a boiler on a pole and a big toothed disc", palette: { boiler: 'orange', iron: 'night', blade: 'mist', tooth: 'white', stain: 'red', valve: 'sand' },
  parts: [
    { name: 'boiler', cyl: [0.2, 0.34, 0.2], at: [0, 0.02, 0], rot: [90, 0, 0], c: 'boiler' },
    { cyl: [0.08, 0.5, 0.08], at: [0, 0.02, 0.38], rot: [90, 0, 0], c: 'iron' },
    { group: [
      { cyl: [0.56, 0.03, 0.56], at: [0, 0, 0], rot: [0, 0, 90], c: 'blade' },
      { box: [0.035, 0.66, 0.07], at: [0, 0, 0], c: 'tooth' },
      { box: [0.035, 0.07, 0.66], at: [0, 0, 0], c: 'tooth' },
      { box: [0.04, 0.2, 0.2], at: [0, 0.02, -0.02], c: 'stain' },
    ], name: 'Disc', pivot: true, at: [0, 0.02, 0.72] },
    { box: [0.07, 0.07, 0.07], at: [0, 0.14, -0.04], c: 'valve' },
  ] });
export const gaffHook = gun({ id: 'w-gaff', about: 'A gaff hook: a pole with a steel hook', palette: { pole: 'orange', hook: 'mist' },
  parts: [{ cyl: [0.05, 0.9, 0.05], at: [0, 0, 0.3], rot: [90, 0, 0], c: 'pole' }, { box: [0.05, 0.2, 0.05], at: [0, 0.08, 0.76], c: 'hook' }, { box: [0.05, 0.05, 0.12], at: [0, 0.18, 0.7], c: 'hook' }] });
export const boathook = gun({ id: 'w-boathook', about: 'A long boathook', palette: { pole: 'sand', hook: 'slate' },
  parts: [{ cyl: [0.05, 1.4, 0.05], at: [0, 0, 0.5], rot: [90, 0, 0], c: 'pole' }, { box: [0.05, 0.16, 0.05], at: [0, 0.06, 1.2], c: 'hook' }, { box: [0.05, 0.05, 0.12], at: [0, 0.14, 1.16], c: 'hook' }] });
export const chopper = gun({ id: 'w-chopper', about: 'A cannery cleaver', palette: { blade: 'mist', grip: 'orange' },
  parts: [{ box: [0.04, 0.2, 0.3], at: [0, 0.03, 0.26], c: 'blade' }, { box: [0.05, 0.05, 0.16], at: [0, -0.02, 0.05], c: 'grip' }] });
export const heldBottle = gun({ id: 'w-heldbottle', about: 'A bottle held high, lit', palette: { glass: 'green', fire: 'orange' },
  parts: [{ cyl: [0.11, 0.18, 0.11], at: [0, -0.06, 0], c: 'glass' }, { box: [0.07, 0.08, 0.07], at: [0, -0.2, 0], c: 'fire', glow: true }] });
export const flail = gun({ id: 'w-flail', about: 'A monk\'s flail, chain and spiked ball', palette: { pole: 'night', ball: 'mist', spike: 'white' },
  parts: [{ cyl: [0.05, 0.4, 0.05], at: [0, 0, 0.14], rot: [90, 0, 0], c: 'pole' }, { ball: [0.2, 0.2, 0.2], at: [0, -0.14, 0.42], c: 'ball' }, { box: [0.05, 0.28, 0.05], at: [0, -0.14, 0.42], c: 'spike' }, { box: [0.28, 0.05, 0.05], at: [0, -0.14, 0.42], c: 'spike' }] });
export const monkShield = gun({ id: 'w-shield', about: 'A monk\'s tower shield with the Tithe on it', palette: { wood: 'plum', rim: 'slate', mark: 'orange' },
  parts: [{ box: [0.58, 0.9, 0.05], at: [0, 0, 0], c: 'wood' }, { box: [0.64, 0.05, 0.06], at: [0, 0.45, 0], c: 'rim' }, { box: [0.64, 0.05, 0.06], at: [0, -0.45, 0], c: 'rim' }, { box: [0.05, 0.9, 0.06], at: [0.31, 0, 0], c: 'rim' }, { box: [0.05, 0.9, 0.06], at: [-0.31, 0, 0], c: 'rim' }, { box: [0.28, 0.08, 0.02], at: [0, 0.08, 0.03], c: 'mark', glow: true }, { box: [0.08, 0.3, 0.02], at: [0, 0, 0.03], c: 'mark', glow: true }] });
export const halberdHeld = gun({ id: 'w-halberd', about: 'A reliquary halberd', palette: { pole: 'night', blade: 'mist', trim: 'sand' },
  parts: [{ cyl: [0.06, 1.9, 0.06], at: [0, 0, 0.4], rot: [90, 0, 0], c: 'pole' }, { box: [0.04, 0.4, 0.34], at: [0, 0.12, 1.24], c: 'blade' }, { cone: [0.08, 0.3, 0.08], at: [0, 0, 1.46], rot: [90, 0, 0], c: 'blade' }, { box: [0.08, 0.06, 0.1], at: [0, 0, 1.1], c: 'trim' }] });
export const anchorHeld = gun({ id: 'w-anchor', about: 'The Bosun\'s anchor, on a chain', palette: { iron: 'night', iron2: 'slate', rust: 'orange' },
  parts: [
    { box: [0.09, 0.09, 1.0], at: [0, 0, 0.5], c: 'iron' },
    { box: [0.6, 0.08, 0.09], at: [0, 0, 0.14], c: 'iron2' },
    { box: [0.8, 0.1, 0.12], at: [0, 0, 0.96], c: 'iron' },
    { box: [0.1, 0.1, 0.22], at: [-0.38, 0, 0.86], rot: [0, 30, 0], c: 'rust' },
    { box: [0.1, 0.1, 0.22], at: [0.38, 0, 0.86], rot: [0, -30, 0], c: 'rust' },
  ] });
export const microphone = gun({ id: 'w-mic', about: 'A heavy old brass microphone', palette: { brass: 'sand', mesh: 'night', red: 'red' },
  parts: [{ box: [0.14, 0.2, 0.1], at: [0, 0.1, 0], c: 'brass' }, { box: [0.1, 0.14, 0.02], at: [0, 0.1, 0.055], c: 'mesh' }, { cyl: [0.04, 0.5, 0.04], at: [0, -0.25, 0], c: 'brass' }, { box: [0.04, 0.04, 0.02], at: [0, 0.03, 0.055], c: 'red', glow: true }] });
export const rubberStamp = gun({ id: 'w-stamp', about: 'Max\'s rubber stamp', palette: { wood: 'orange', pad: 'red' },
  parts: [{ cyl: [0.08, 0.14, 0.08], at: [0, 0.08, 0], c: 'wood' }, { box: [0.14, 0.04, 0.14], at: [0, 0.0, 0], c: 'pad' }] });

export const WEAPON_DEFS = [pistol, scatter, rifle, harpoonGun, bolt, flare, depthCharge, oilBottle, knife, flensingSaw, gaffHook, boathook, chopper, heldBottle, flail, monkShield, halberdHeld, anchorHeld, microphone, rubberStamp];
