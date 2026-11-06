// The three trades, Sister Pyx, and the gear that changes their silhouettes.
import { model } from '../../../pixel-engine.js';
import { box, eyes, hang, humanoid, limbs } from './rig.js';

const base = { tags: ['character', 'hero'] };

export const bellwardenBody = model({
  id: 'hero_bellwarden', about: 'The Bellwarden: square shoulders, cowl, bronze trim', ...base,
  palette: { robe: 'plum', trim: 'orange', skin: 'sand', boot: 'night', dark: 'ink', metal: 'slate' },
  parts: humanoid({
    hips: [box(0.4, 0.22, 0.28, [0, 0, 0], 'robe'), box(0.44, 0.07, 0.31, [0, 0.1, 0], 'trim')],
    chest: [box(0.52, 0.46, 0.32, [0, 0.21, 0], 'robe'), box(0.2, 0.42, 0.04, [0, 0.21, 0.165], 'trim'), box(0.58, 0.1, 0.34, [0, 0.42, 0], 'metal')],
    head: [box(0.28, 0.3, 0.28, [0, 0.14, 0], 'skin'), box(0.34, 0.34, 0.32, [0, 0.17, -0.03], 'robe'), box(0.22, 0.14, 0.04, [0, 0.14, 0.14], 'dark'), eyes(0.15, 0.165, 'trim', 0.06, 0.05)],
    ...limbs({ arm: 'robe', hand: 'metal', leg: 'dark', armW: 0.16, legW: 0.18 }),
    armRExtra: [box(0.26, 0.14, 0.26, [-0.02, 0.02, 0], 'metal')],
    armLExtra: [box(0.26, 0.14, 0.26, [0.02, 0.02, 0], 'metal')],
  }),
});

export const lamplighterBody = model({
  id: 'hero_lamplighter', about: 'The Lamplighter: wide-brim hat, long coat, a lamp pole on the back', ...base,
  palette: { coat: 'navy', trim: 'sand', skin: 'mist', boot: 'night', hat: 'ink', metal: 'slate', flame: 'orange' },
  parts: humanoid({
    hips: [box(0.36, 0.22, 0.26, [0, 0, 0], 'coat'), box(0.42, 0.42, 0.28, [0, -0.2, -0.02], 'coat'), box(0.06, 0.5, 0.04, [0, -0.15, 0.135], 'trim')],
    chest: [box(0.44, 0.46, 0.28, [0, 0.21, 0], 'coat'), box(0.06, 0.44, 0.04, [0, 0.21, 0.145], 'trim'),
      box(0.05, 1.5, 0.05, [0.12, 0.6, -0.2], 'metal'), box(0.28, 0.05, 0.05, [0.12, 1.3, -0.2], 'metal'), box(0.18, 0.2, 0.18, [0.26, 1.18, -0.2], 'metal'), box(0.1, 0.13, 0.1, [0.26, 1.17, -0.2], 'flame', { glow: true })],
    head: [box(0.26, 0.28, 0.26, [0, 0.14, 0], 'skin'), { cyl: [0.74, 0.05, 0.74], at: [0, 0.28, 0], c: 'hat', seg: 8 }, { cyl: [0.32, 0.2, 0.32], at: [0, 0.38, 0], c: 'hat', seg: 8 }, box(0.2, 0.05, 0.05, [0, 0.14, 0.13], 'hat')],
    ...limbs({ arm: 'coat', hand: 'skin', leg: 'hat' }),
  }),
});

export const sextonBody = model({
  id: 'hero_sexton', about: 'The Sexton: stovepipe hat, black frock, grey face', ...base,
  palette: { frock: 'ink', accent: 'lime', skin: 'mist', boot: 'night', hat: 'night', shirt: 'slate' },
  parts: humanoid({
    hips: [box(0.36, 0.22, 0.26, [0, 0, 0], 'frock'), box(0.4, 0.34, 0.27, [0, -0.17, -0.01], 'frock')],
    chest: [box(0.46, 0.46, 0.28, [0, 0.21, 0], 'frock'), box(0.14, 0.34, 0.04, [0, 0.25, 0.145], 'shirt'), box(0.05, 0.12, 0.05, [0, 0.34, 0.175], 'accent', { glow: true })],
    head: [box(0.26, 0.3, 0.26, [0, 0.15, 0], 'skin'), { cyl: [0.42, 0.05, 0.42], at: [0, 0.31, 0], c: 'hat', seg: 8 }, { cyl: [0.28, 0.44, 0.28], at: [0, 0.54, 0], c: 'hat', seg: 8 }, { cyl: [0.29, 0.05, 0.29], at: [0, 0.36, 0], c: 'accent', seg: 8 }, eyes(0.17, 0.135, 'accent', 0.06, 0.05)],
    ...limbs({ arm: 'frock', hand: 'skin', leg: 'hat' }),
  }),
});

export const pyxBody = model({
  id: 'npc_pyx', about: 'Sister Pyx: armoured nun with a wimple and a crossbow', ...base,
  palette: { plate: 'mist', wimple: 'white', veil: 'ink', skin: 'sand', boot: 'slate', cross: 'red' },
  parts: humanoid({
    hips: [box(0.38, 0.22, 0.26, [0, 0, 0], 'plate'), box(0.42, 0.32, 0.28, [0, -0.17, -0.01], 'veil')],
    chest: [box(0.46, 0.46, 0.28, [0, 0.21, 0], 'plate'), box(0.05, 0.28, 0.04, [0, 0.24, 0.145], 'cross'), box(0.2, 0.05, 0.04, [0, 0.3, 0.145], 'cross')],
    head: [box(0.24, 0.26, 0.24, [0, 0.13, 0], 'skin'), box(0.32, 0.36, 0.32, [0, 0.16, -0.04], 'veil'), box(0.26, 0.1, 0.05, [0, 0.27, 0.11], 'wimple'), box(0.26, 0.08, 0.05, [0, 0.0, 0.11], 'wimple')],
    ...limbs({ arm: 'plate', hand: 'plate', leg: 'veil' }),
  }),
});

const TIER_COLOR = ['slate', 'sky', 'sand'];

/** Helms and shoulders by class and tier: 0 plain, 1 blessed, 2 reliquary and up. */
function helm(cls, tier) {
  const c = TIER_COLOR[tier];
  const parts = {
    bellwarden: [box(0.36, 0.1, 0.34, [0, 0.31, -0.02], 'tier'), box(0.08, 0.12, 0.34, [0, 0.4, -0.02], 'tier'), ...(tier > 1 ? [{ cone: [0.2, 0.26, 0.2], at: [0, 0.56, -0.02], c: 'tier', seg: 6 }] : []), ...(tier > 0 ? [box(0.05, 0.2, 0.05, [0.2, 0.32, 0], 'tier'), box(0.05, 0.2, 0.05, [-0.2, 0.32, 0], 'tier')] : [])],
    lamplighter: [{ cyl: [0.36, 0.05, 0.36], at: [0, 0.46, 0], c: 'tier', seg: 8 }, ...(tier > 0 ? [box(0.28, 0.05, 0.05, [0, 0.33, 0.33], 'tier')] : []), ...(tier > 1 ? [box(0.1, 0.1, 0.1, [0, 0.54, 0], 'gem', { glow: true })] : [])],
    sexton: [{ cyl: [0.3, 0.05, 0.3], at: [0, 0.72, 0], c: 'tier', seg: 8 }, ...(tier > 0 ? [box(0.08, 0.12, 0.05, [0.17, 0.4, 0], 'tier')] : []), ...(tier > 1 ? [box(0.1, 0.1, 0.1, [0, 0.82, 0], 'gem', { glow: true })] : [])],
  }[cls];
  return model({ id: `helm_${cls}_${tier}`, about: `Headgear for the ${cls}, tier ${tier}`, tags: ['gear'], palette: { tier: c, gem: tier > 1 ? 'orange' : 'sky' }, floats: true, parts });
}
function shoulder(cls, tier) {
  const c = TIER_COLOR[tier];
  const w = 0.2 + tier * 0.05;
  const parts = [box(w, 0.1 + tier * 0.02, w + 0.02, [0, 0.03, 0], 'tier'), ...(tier > 0 ? [{ cone: [0.1, 0.16 + tier * 0.04, 0.1], at: [0, 0.14 + tier * 0.03, 0], c: 'tier', seg: 5 }] : []), ...(cls === 'bellwarden' && tier > 1 ? [box(w + 0.04, 0.05, w + 0.06, [0, -0.04, 0], 'gem')] : [])];
  return model({ id: `shoulder_${cls}_${tier}`, about: `A shoulder piece for the ${cls}, tier ${tier}`, tags: ['gear'], palette: { tier: c, gem: 'orange' }, floats: true, parts });
}

export const GEAR_MODELS = [];
for (const cls of ['bellwarden', 'lamplighter', 'sexton']) for (const t of [0, 1, 2]) GEAR_MODELS.push(helm(cls, t), shoulder(cls, t));

// Off-hands and the signature weapon the library lacks.
export const handBell = model({
  id: 'hand-bell-weapon', about: 'A consecrated hand-bell the size of an anvil, on a short chain handle', tags: ['weapon', 'bell'], palette: { bronze: 'orange', dark: 'plum', chain: 'slate', clap: 'sand' },
  parts: [
    { box: [0.08, 0.34, 0.08], at: [0, 0.17, 0], c: 'chain' },
    { lathe: [[0.05, 0.62], [0.13, 0.6], [0.18, 0.5], [0.22, 0.38], [0.32, 0.3], [0, 0.3]], at: [0, 0, 0], c: 'bronze' },
    { box: [0.5, 0.05, 0.08], at: [0, 0.32, 0], c: 'dark' },
    { ball: [0.1, 0.1, 0.1], at: [0, 0.24, 0], c: 'clap' },
  ],
});
export const handLantern = model({
  id: 'hand-lantern', about: 'A square hand lantern with a glowing core', tags: ['weapon', 'light'], palette: { frame: 'slate', fire: 'orange', cap: 'night' },
  parts: [
    box(0.26, 0.05, 0.26, [0, 0.03, 0], 'frame'), box(0.14, 0.2, 0.14, [0, 0.16, 0], 'fire', { glow: true }),
    { mirror: [box(0.04, 0.26, 0.04, [0.11, 0.17, 0.11], 'frame'), box(0.04, 0.26, 0.04, [-0.11, 0.17, 0.11], 'frame')], axis: 'z' },
    { cone: [0.3, 0.12, 0.3], at: [0, 0.36, 0], c: 'cap', seg: 4 }, box(0.05, 0.12, 0.05, [0, 0.47, 0], 'frame'),
  ],
});
export const censer = model({
  id: 'censer', about: 'A swinging censer on a chain, trailing smoke', tags: ['weapon', 'church'], palette: { brass: 'sand', chain: 'slate', fire: 'lime' },
  parts: [
    { lathe: [[0.06, 0], [0.17, 0.05], [0.18, 0.14], [0.12, 0.22], [0.03, 0.27]], at: [0, 0, 0], c: 'brass' },
    box(0.1, 0.04, 0.1, [0, 0.18, 0], 'fire', { glow: true }),
    box(0.05, 0.3, 0.05, [0, 0.42, 0], 'chain'),
  ],
});
