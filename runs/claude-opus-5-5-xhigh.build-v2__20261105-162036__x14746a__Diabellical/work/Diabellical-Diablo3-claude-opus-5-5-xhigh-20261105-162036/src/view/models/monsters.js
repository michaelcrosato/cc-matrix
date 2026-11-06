// Everything that wants you back in the ground.
import { model } from '../../../pixel-engine.js';
import { box, eyes, hang, humanoid, limbs } from './rig.js';

const tags = ['character', 'monster'];
const bone = { upperArm: [hang(0.08, 0.26, 0.08, 'bone')], foreArm: [hang(0.07, 0.17, 0.07, 'bone')], handR: [hang(0.1, 0.08, 0.1, 'bone')], handL: [hang(0.1, 0.08, 0.1, 'bone')], thigh: [hang(0.09, 0.31, 0.09, 'bone')], shin: [hang(0.08, 0.23, 0.08, 'bone')], foot: [box(0.12, 0.08, 0.24, [0, -0.06, 0.04], 'bone')] };

export const MONSTER_MODELS = [
  model({ id: 'peatwalker', about: 'Peatwalker: a slumped bog corpse, dripping mud', tags, palette: { mud: 'slate', dark: 'night', skin: 'teal', eye: 'lime', rot: 'plum' },
    parts: humanoid({
      hips: [box(0.36, 0.22, 0.26, [0, 0, 0], 'mud')],
      chest: [box(0.46, 0.44, 0.3, [0, 0.2, 0.02], 'mud'), box(0.22, 0.16, 0.05, [0.08, 0.28, 0.17], 'rot'), box(0.14, 0.2, 0.05, [-0.14, 0.12, 0.17], 'dark')],
      head: [box(0.27, 0.27, 0.27, [0, 0.13, 0.03], 'skin'), box(0.3, 0.1, 0.3, [0, 0.29, 0.02], 'dark'), eyes(0.15, 0.175), box(0.16, 0.05, 0.04, [0, 0.05, 0.175], 'dark')],
      ...limbs({ arm: 'skin', hand: 'dark', leg: 'dark', boot: 'mud', armW: 0.14, legW: 0.17 }),
    }) }),
  model({ id: 'gibbet_drop', about: 'Gibbet Drop: a thin hanged man who fell, rope still on', tags, palette: { skin: 'mist', rag: 'plum', rope: 'sand', eye: 'red', dark: 'night' },
    parts: humanoid({
      hips: [box(0.3, 0.2, 0.22, [0, 0, 0], 'rag')],
      chest: [box(0.36, 0.44, 0.22, [0, 0.2, 0], 'rag'), box(0.3, 0.1, 0.24, [0, 0.38, 0], 'skin')],
      head: [box(0.24, 0.27, 0.24, [0, 0.14, 0.05], 'skin'), box(0.26, 0.06, 0.26, [0, -0.0, 0.03], 'rope'), box(0.06, 0.4, 0.06, [0, 0.2, -0.16], 'rope'), eyes(0.16, 0.175, 'eye')],
      ...limbs({ arm: 'skin', hand: 'dark', leg: 'dark', boot: 'skin', armW: 0.09, legW: 0.11 }),
    }) }),
  model({ id: 'rattlebones', about: 'Rattlebones: a fast skeleton with a rusted sword', tags, palette: { bone: 'mist', dark: 'night', eye: 'lime', rust: 'orange', steel: 'slate' },
    parts: humanoid({
      hips: [box(0.26, 0.1, 0.16, [0, 0.02, 0], 'bone')],
      chest: [box(0.08, 0.32, 0.08, [0, 0.16, 0], 'bone'), box(0.34, 0.08, 0.2, [0, 0.36, 0], 'bone'), box(0.3, 0.07, 0.18, [0, 0.24, 0], 'bone'), box(0.26, 0.06, 0.16, [0, 0.14, 0], 'bone')],
      head: [box(0.24, 0.24, 0.26, [0, 0.14, 0.02], 'bone'), box(0.16, 0.06, 0.14, [0, 0.02, 0.05], 'bone'), eyes(0.15, 0.155)],
      ...bone,
      handR: [hang(0.1, 0.08, 0.1, 'bone'), box(0.07, 0.07, 0.8, [0, -0.08, 0.4], 'steel'), box(0.2, 0.05, 0.05, [0, -0.08, 0.08], 'rust')],
    }) }),
  model({ id: 'choir_skull', about: 'Choir Skull: a floating singing skull with an open jaw', tags, floats: true, palette: { bone: 'mist', dark: 'ink', eye: 'sky', rag: 'plum' },
    parts: [
      box(0.5, 0.42, 0.52, [0, 0.5, 0], 'bone'), box(0.32, 0.12, 0.3, [0, 0.2, 0.05], 'bone'), box(0.22, 0.12, 0.06, [0, 0.3, 0.26], 'dark'),
      eyes(0.54, 0.27, 'eye', 0.12, 0.11),
      { cone: [0.5, 0.16, 0.5], at: [0, 0.78, 0], c: 'rag', seg: 6 },
    ] }),
  model({ id: 'pallid_bearer', about: 'Pallid Bearer: a huge grey pallbearer who swings his coffin', tags, palette: { skin: 'mist', robe: 'slate', dark: 'ink', eye: 'white', wood: 'plum', band: 'sand' },
    parts: humanoid({
      hips: [box(0.46, 0.24, 0.32, [0, 0, 0], 'robe'), box(0.52, 0.34, 0.34, [0, -0.17, 0], 'robe')],
      chest: [box(0.62, 0.5, 0.38, [0, 0.22, 0], 'robe'), box(0.7, 0.16, 0.42, [0, 0.42, 0], 'dark')],
      head: [box(0.26, 0.26, 0.26, [0, 0.12, 0.04], 'skin'), box(0.3, 0.14, 0.3, [0, 0.26, 0.03], 'dark'), eyes(0.13, 0.175, 'eye')],
      ...limbs({ arm: 'skin', hand: 'dark', leg: 'dark', boot: 'dark', armW: 0.18, legW: 0.2 }),
      handR: [hang(0.14, 0.11, 0.14, 'dark'), box(0.42, 0.26, 1.2, [0.27, -0.1, 0.25], 'wood'), box(0.46, 0.06, 0.2, [0.27, -0.1, 0.3], 'band')],
    }) }),
  model({ id: 'tomb_crawler', about: 'Tomb Crawler: a pale segmented thing, low to the ground', tags, floats: true, palette: { shell: 'plum', pale: 'mist', eye: 'red' },
    parts: [box(0.34, 0.16, 0.5, [0, 0.27, 0], 'shell'), box(0.26, 0.14, 0.2, [0, 0.25, 0.3], 'pale'), box(0.2, 0.1, 0.2, [0, 0.3, -0.28], 'shell'), eyes(0.28, 0.41, 'eye', 0.07, 0.05)] }),
  model({ id: 'bloat_deacon', about: 'Bloat Deacon: a swollen clergyman, a walking sack of grave gas', tags, palette: { skin: 'lime', robe: 'teal', collar: 'white', eye: 'red', dark: 'night' },
    parts: [
      { group: [{ ball: [1, 1, 1], at: [0, 0.65, 0], c: 'robe', seg: 8 }, { ball: [0.5, 0.42, 0.5], at: [0, 1.2, 0.1], c: 'skin', seg: 8 }, box(0.4, 0.07, 0.4, [0, 1.03, 0.08], 'collar'), eyes(1.26, 0.33, 'eye', 0.1, 0.07), box(0.16, 0.05, 0.04, [0, 1.1, 0.35], 'dark'), { ball: [0.3, 0.3, 0.3], at: [0.28, 0.72, 0.36], c: 'skin', seg: 6 }, { ball: [0.22, 0.22, 0.22], at: [-0.32, 0.5, 0.34], c: 'skin', seg: 6 }], name: 'Blob', pivot: true, at: [0, 0, 0] },
    ] }),
  model({ id: 'cinderling', about: 'Cinderling: a small burning imp of the Unrung', tags, palette: { skin: 'ink', ember: 'orange', eye: 'sand', hot: 'red' },
    parts: humanoid({
      hips: [box(0.3, 0.2, 0.22, [0, 0, 0], 'skin')],
      chest: [box(0.4, 0.42, 0.26, [0, 0.2, 0], 'skin'), box(0.2, 0.2, 0.04, [0, 0.2, 0.135], 'ember', { glow: true }), { mirror: [{ cone: [0.1, 0.18, 0.1], at: [0.2, 0.46, 0], c: 'hot' }], axis: 'x' }],
      head: [box(0.34, 0.3, 0.32, [0, 0.14, 0.02], 'skin'), eyes(0.16, 0.185, 'eye', 0.09, 0.08), { mirror: [{ cone: [0.08, 0.18, 0.08], at: [0.13, 0.36, 0], c: 'hot' }], axis: 'x' }, { cone: [0.2, 0.2, 0.2], at: [0, 0.4, -0.05], c: 'ember', glow: true, seg: 5 }],
      ...limbs({ arm: 'skin', hand: 'ember', leg: 'skin', boot: 'hot', armW: 0.12, legW: 0.14 }),
    }) }),
  model({ id: 'tithe_collector', about: 'Tithe Collector: a thin demon clerk with a ledger and a hook', tags, palette: { coat: 'plum', skin: 'red', ledger: 'sand', hook: 'slate', eye: 'lime', dark: 'ink' },
    parts: humanoid({
      hips: [box(0.34, 0.2, 0.24, [0, 0, 0], 'coat'), box(0.38, 0.34, 0.26, [0, -0.17, 0], 'coat')],
      chest: [box(0.42, 0.46, 0.26, [0, 0.21, 0], 'coat'), box(0.1, 0.34, 0.04, [0, 0.24, 0.135], 'dark')],
      head: [box(0.24, 0.3, 0.26, [0, 0.14, 0.02], 'skin'), { cyl: [0.34, 0.2, 0.34], at: [0, 0.38, 0], c: 'dark', seg: 6 }, eyes(0.17, 0.155)],
      ...limbs({ arm: 'coat', hand: 'skin', leg: 'dark', boot: 'dark' }),
      handL: [hang(0.11, 0.1, 0.11, 'skin'), box(0.26, 0.34, 0.1, [0, -0.18, 0.08], 'ledger')],
      handR: [hang(0.11, 0.1, 0.11, 'skin'), box(0.05, 0.05, 0.6, [0, -0.08, 0.3], 'hook'), box(0.05, 0.22, 0.05, [0, -0.17, 0.58], 'hook')],
    }) }),
  model({ id: 'penitent', about: 'Penitent: a hooded flagellant, robed, hunched and quick', tags, palette: { robe: 'navy', dark: 'ink', rope: 'sand', eye: 'white', skin: 'mist' },
    parts: humanoid({
      hips: [box(0.36, 0.22, 0.26, [0, 0, 0], 'robe'), box(0.42, 0.42, 0.28, [0, -0.2, 0], 'robe'), box(0.44, 0.05, 0.3, [0, 0.08, 0], 'rope')],
      chest: [box(0.44, 0.46, 0.28, [0, 0.21, 0], 'robe')],
      head: [box(0.34, 0.36, 0.34, [0, 0.14, 0.02], 'robe'), box(0.2, 0.18, 0.05, [0, 0.13, 0.18], 'dark'), eyes(0.15, 0.21, 'eye', 0.05, 0.05), { cone: [0.2, 0.22, 0.2], at: [0, 0.4, -0.04], c: 'robe', seg: 5 }],
      ...limbs({ arm: 'robe', hand: 'skin', leg: 'dark', boot: 'dark' }),
    }) }),
  model({ id: 'clapperjaw', about: 'Clapperjaw: a huge iron-jawed beast with a clapper for a tongue', tags, floats: true, palette: { hide: 'ink', plate: 'slate', jaw: 'orange', eye: 'red', tongue: 'sand' },
    parts: [
      box(1.1, 0.7, 1.7, [0, 0.95, 0], 'hide'), box(1.2, 0.26, 1.2, [0, 1.36, -0.1], 'plate'),
      { group: [box(0.9, 0.5, 0.7, [0, 0, 0.3], 'hide'), box(0.96, 0.26, 0.8, [0, -0.34, 0.35], 'jaw'), box(0.96, 0.18, 0.8, [0, 0.28, 0.35], 'jaw'), { lathe: [[0.03, 0], [0.08, 0.05], [0.04, 0.3]], at: [0, -0.3, 0.55], c: 'tongue' }, eyes(0.12, 0.66, 'eye', 0.28, 0.1)], name: 'HeadBone', pivot: true, at: [0, 1.15, 0.85] },
      { mirror: [{ cone: [0.2, 0.42, 0.2], at: [0.45, 1.6, -0.1], c: 'jaw', seg: 5 }], axis: 'x' },
    ] }),
  model({ id: 'ash_gargoyle', about: 'Ash Gargoyle: a winged stone thing that waits as a statue', tags, floats: true, palette: { stone: 'slate', dark: 'night', eye: 'orange', wing: 'plum' },
    parts: [
      box(0.5, 0.56, 0.4, [0, 0.6, 0], 'stone'), box(0.3, 0.3, 0.32, [0, 1.0, 0.1], 'stone'), eyes(1.03, 0.27, 'eye', 0.08, 0.07), { mirror: [{ cone: [0.1, 0.22, 0.1], at: [0.1, 1.24, 0.05], c: 'dark' }], axis: 'x' },
      { group: [box(0.7, 0.5, 0.05, [0.35, 0.05, 0], 'wing')], name: 'WingL', pivot: true, at: [0.25, 0.75, -0.15] },
      { group: [box(0.7, 0.5, 0.05, [-0.35, 0.05, 0], 'wing')], name: 'WingR', pivot: true, at: [-0.25, 0.75, -0.15] },
      box(0.2, 0.3, 0.2, [0.15, 0.2, 0], 'dark'), box(0.2, 0.3, 0.2, [-0.15, 0.2, 0], 'dark'),
    ] }),
  model({ id: 'shade_acolyte', about: 'Shade Acolyte: a dark robed raiser of the dead with a green flame', tags, palette: { robe: 'night', trim: 'lime', skin: 'teal', eye: 'lime', dark: 'ink' },
    parts: humanoid({
      hips: [box(0.36, 0.22, 0.26, [0, 0, 0], 'robe'), box(0.44, 0.46, 0.3, [0, -0.2, 0], 'robe'), box(0.46, 0.06, 0.31, [0, -0.38, 0], 'trim')],
      chest: [box(0.42, 0.46, 0.26, [0, 0.21, 0], 'robe'), box(0.05, 0.4, 0.04, [0, 0.2, 0.135], 'trim')],
      head: [box(0.32, 0.34, 0.32, [0, 0.14, 0], 'robe'), box(0.2, 0.2, 0.04, [0, 0.13, 0.16], 'dark'), eyes(0.15, 0.185)],
      ...limbs({ arm: 'robe', hand: 'skin', leg: 'dark', boot: 'dark' }),
      handR: [hang(0.11, 0.1, 0.11, 'skin'), box(0.12, 0.18, 0.12, [0, -0.2, 0.05], 'trim', { glow: true })],
    }) }),
  model({ id: 'collection_plate', about: 'The Collection Plate: a living offering dish on little legs, full of coins', tags, floats: true, palette: { brass: 'sand', dark: 'orange', coin: 'white', eye: 'plum' },
    parts: [
      { lathe: [[0.05, 0], [0.5, 0.1], [0.62, 0.22], [0.6, 0.28], [0.1, 0.2], [0, 0.2]], at: [0, 0.42, 0], c: 'brass' },
      { cyl: [1, 0.1, 1], at: [0, 0.62, 0], c: 'dark', seg: 10 },
      box(0.16, 0.05, 0.16, [0.2, 0.7, 0.1], 'coin'), box(0.16, 0.05, 0.16, [-0.22, 0.7, -0.06], 'coin'), box(0.16, 0.05, 0.16, [0.02, 0.72, -0.24], 'coin'), box(0.16, 0.05, 0.16, [-0.08, 0.76, 0.16], 'coin'),
      eyes(0.52, 0.58, 'eye', 0.14, 0.09),
    ] }),
  model({ id: 'crawler_nest', about: 'Crawler Nest: a mound of bone and egg sacs that births crawlers', tags: ['monster', 'prop'], palette: { bone: 'mist', sac: 'plum', glow: 'lime', dark: 'night' },
    parts: [{ lump: [1.9, 0.9, 1.9], at: [0, 0.45, 0], c: 'dark', seed: 3 }, { ball: [0.6, 0.6, 0.6], at: [0.4, 0.9, 0.2], c: 'sac', seg: 7 }, { ball: [0.46, 0.46, 0.46], at: [-0.45, 0.8, 0.3], c: 'sac', seg: 7 }, { ball: [0.24, 0.24, 0.24], at: [0, 1.05, -0.2], c: 'glow', glow: true, seg: 6 }, box(0.9, 0.1, 0.1, [0.1, 0.5, 0.75], 'bone', { rot: [0, 30, 20] }), box(0.8, 0.1, 0.1, [-0.3, 0.45, -0.7], 'bone', { rot: [0, -30, -15] })] }),
  model({ id: 'unrung_font', about: 'Unrung Font: a cracked stone basin pouring cinders into the world', tags: ['monster', 'prop'], palette: { stone: 'night', fire: 'orange', hot: 'red', trim: 'plum' },
    parts: [{ cyl: [1.5, 0.3, 1.5], at: [0, 0.15, 0], c: 'stone', seg: 8 }, { cyl: [0.6, 0.6, 0.6], at: [0, 0.55, 0], c: 'trim', seg: 6 }, { lathe: [[0.3, 0.8], [0.8, 1.0], [0.85, 1.22], [0.7, 1.2], [0.3, 1.0], [0, 1.0]], at: [0, 0, 0], c: 'stone' }, { cyl: [1.34, 0.06, 1.34], at: [0, 1.16, 0], c: 'fire', glow: true, seg: 10 }, { cone: [0.5, 0.8, 0.5], at: [0, 1.6, 0], c: 'hot', glow: true, seg: 5 }] }),

  // Allies.
  model({ id: 'minion_skeleton', about: 'A Pallbearer: a skeleton in a black band, on your side, at union rates', tags, palette: { bone: 'white', dark: 'night', eye: 'lime', band: 'ink', steel: 'slate' },
    parts: humanoid({
      hips: [box(0.26, 0.1, 0.16, [0, 0.02, 0], 'bone')],
      chest: [box(0.08, 0.32, 0.08, [0, 0.16, 0], 'bone'), box(0.34, 0.08, 0.2, [0, 0.36, 0], 'bone'), box(0.3, 0.07, 0.18, [0, 0.24, 0], 'band')],
      head: [box(0.24, 0.24, 0.26, [0, 0.14, 0.02], 'bone'), { cyl: [0.26, 0.2, 0.26], at: [0, 0.34, 0], c: 'band', seg: 6 }, eyes(0.15, 0.155)],
      ...bone,
    }) }),
  model({ id: 'minion_big', about: 'A big Coffin Bearer, a raised thing with a coffin on its shoulder', tags, palette: { bone: 'white', dark: 'night', eye: 'lime', wood: 'plum', band: 'sand' },
    parts: humanoid({
      hips: [box(0.36, 0.14, 0.22, [0, 0.02, 0], 'bone')],
      chest: [box(0.12, 0.34, 0.12, [0, 0.16, 0], 'bone'), box(0.5, 0.1, 0.28, [0, 0.38, 0], 'bone'), box(0.44, 0.09, 0.26, [0, 0.25, 0], 'bone'), box(0.42, 0.3, 1.2, [0.42, 0.56, 0], 'wood'), box(0.46, 0.06, 0.2, [0.42, 0.56, 0.1], 'band')],
      head: [box(0.28, 0.26, 0.28, [0, 0.14, 0.02], 'bone'), eyes(0.15, 0.165)],
      ...bone,
    }) }),
  model({ id: 'planted_lamp', about: 'A lamp post planted in the ground, spitting fire', tags: ['prop', 'light'], palette: { iron: 'slate', fire: 'orange', cap: 'night' },
    parts: [box(0.14, 1.7, 0.14, [0, 0.85, 0], 'iron'), { cyl: [0.5, 0.12, 0.5], at: [0, 0.06, 0], c: 'cap', seg: 6 }, box(0.3, 0.05, 0.3, [0, 1.75, 0], 'iron'), box(0.2, 0.26, 0.2, [0, 1.92, 0], 'fire', { glow: true }), { cone: [0.42, 0.18, 0.42], at: [0, 2.14, 0], c: 'cap', seg: 4 }] }),
  model({ id: 'iron_bell', about: 'A great iron bell, thrown down and still ringing', tags: ['prop', 'bell'], palette: { iron: 'slate', dark: 'night', trim: 'orange' },
    parts: [{ lathe: [[0.08, 1.6], [0.32, 1.5], [0.42, 1.2], [0.5, 0.6], [0.85, 0.05], [0, 0.05]], at: [0, 0, 0], c: 'iron' }, { cyl: [1.75, 0.08, 1.75], at: [0, 0.06, 0], c: 'trim', seg: 10 }, box(0.2, 0.2, 0.2, [0, 1.7, 0], 'dark')] }),
  model({ id: 'ember_decoy', about: 'An ember decoy, a pile of sparks in the shape of a coat and hat', tags: ['prop', 'light'], palette: { fire: 'orange', dark: 'plum', hat: 'ink' },
    parts: [box(0.4, 0.8, 0.3, [0, 0.4, 0], 'dark'), box(0.24, 0.3, 0.2, [0, 0.4, 0], 'fire', { glow: true }), { cyl: [0.7, 0.05, 0.7], at: [0, 0.98, 0], c: 'hat', seg: 8 }, box(0.26, 0.2, 0.26, [0, 1.1, 0], 'hat')] }),
];
