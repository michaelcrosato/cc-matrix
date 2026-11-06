// The cast, the bosses, and Old Clemency.
import { model } from '../../../pixel-engine.js';
import { box, eyes, hang, humanoid, limbs } from './rig.js';

const tags = ['character', 'npc'];
export const NPC_MODELS = [
  model({ id: 'npc_crier', about: 'Crier Maudlin: a severed head in a lantern on a post', tags, palette: { post: 'plum', frame: 'slate', skin: 'sand', glow: 'orange', dark: 'ink', eye: 'white', board: 'orange', bell: 'sand' },
    parts: [
      box(0.2, 1.7, 0.2, [0, 0.85, 0], 'post'), box(0.6, 0.12, 0.6, [0, 0.06, 0], 'frame'), box(0.5, 0.3, 0.06, [0, 1.0, 0.13], 'board'),
      box(0.76, 0.06, 0.76, [0, 1.72, 0], 'frame'), { mirror: [box(0.05, 0.62, 0.05, [0.34, 2.03, 0.34], 'frame'), box(0.05, 0.62, 0.05, [-0.34, 2.03, 0.34], 'frame')], axis: 'z' },
      { group: [box(0.42, 0.46, 0.42, [0, 2.03, 0], 'skin'), box(0.46, 0.1, 0.46, [0, 2.26, 0], 'dark'), eyes(2.08, 0.22, 'eye', 0.1, 0.07), box(0.18, 0.1, 0.04, [0, 1.9, 0.22], 'dark')], name: 'CrierHead', pivot: true, at: [0, 0, 0] },
      { cone: [0.96, 0.3, 0.96], at: [0, 2.48, 0], c: 'dark', seg: 4 }, box(0.1, 0.3, 0.1, [0, 2.76, 0], 'bell'),
      box(0.56, 0.5, 0.05, [0, 2.03, -0.38], 'glow', { glow: true }),
    ] }),
  model({ id: 'npc_brasse', about: 'Dame Brasse: wide, in a scorched apron, with a great hammer', tags, palette: { apron: 'sand', dress: 'red', skin: 'orange', hair: 'mist', boot: 'night', iron: 'slate' },
    parts: humanoid({
      hips: [box(0.5, 0.26, 0.36, [0, 0, 0], 'dress'), box(0.58, 0.32, 0.4, [0, -0.16, 0], 'dress'), box(0.34, 0.44, 0.05, [0, -0.1, 0.21], 'apron')],
      chest: [box(0.62, 0.48, 0.38, [0, 0.21, 0], 'dress'), box(0.36, 0.42, 0.05, [0, 0.2, 0.2], 'apron')],
      head: [box(0.28, 0.28, 0.28, [0, 0.13, 0], 'skin'), box(0.34, 0.14, 0.34, [0, 0.3, -0.02], 'hair'), box(0.16, 0.16, 0.16, [0, 0.42, -0.08], 'hair'), box(0.2, 0.05, 0.04, [0, 0.07, 0.145], 'boot')],
      ...limbs({ arm: 'skin', hand: 'iron', leg: 'boot', armW: 0.18, legW: 0.2 }),
      handR: [hang(0.14, 0.11, 0.14, 'iron'), box(0.07, 0.07, 0.8, [0, -0.08, 0.3], 'apron'), box(0.3, 0.24, 0.24, [0, -0.08, 0.72], 'iron')],
    }) }),
  model({ id: 'npc_ogive', about: 'Mother Ogive: small and veiled, blind, keeper of the Reliquary', tags, palette: { veil: 'white', robe: 'teal', skin: 'mist', dark: 'night', gem: 'lime' },
    parts: humanoid({
      hips: [box(0.34, 0.22, 0.24, [0, 0, 0], 'robe'), box(0.44, 0.5, 0.3, [0, -0.25, 0], 'robe')],
      chest: [box(0.4, 0.42, 0.24, [0, 0.19, 0.02], 'robe'), box(0.08, 0.08, 0.05, [0, 0.3, 0.15], 'gem', { glow: true })],
      head: [box(0.24, 0.26, 0.24, [0, 0.12, 0.02], 'skin'), box(0.34, 0.46, 0.34, [0, 0.14, -0.02], 'veil'), box(0.2, 0.1, 0.05, [0, 0.14, 0.15], 'dark')],
      ...limbs({ arm: 'robe', hand: 'skin', leg: 'robe', boot: 'dark' }),
    }) }),
  model({ id: 'npc_pennywhistle', about: 'Pennywhistle: a merchant in a plague-doctor beak with a big pack', tags, palette: { coat: 'ink', beak: 'sand', hat: 'night', pack: 'orange', strap: 'plum', eye: 'sky', boot: 'night', skin: 'mist' },
    parts: humanoid({
      hips: [box(0.38, 0.22, 0.26, [0, 0, 0], 'coat'), box(0.44, 0.38, 0.3, [0, -0.2, 0], 'coat')],
      chest: [box(0.46, 0.46, 0.28, [0, 0.21, 0], 'coat'), box(0.7, 0.86, 0.44, [0, 0.38, -0.36], 'pack'), box(0.74, 0.08, 0.48, [0, 0.54, -0.36], 'strap'), box(0.74, 0.08, 0.48, [0, 0.22, -0.36], 'strap'), box(0.4, 0.3, 0.3, [0, 0.96, -0.36], 'strap')],
      head: [box(0.28, 0.28, 0.28, [0, 0.14, 0], 'beak'), { cone: [0.16, 0.14, 0.42], at: [0, 0.08, 0.3], c: 'beak', rot: [90, 0, 0], seg: 4 }, { cyl: [0.56, 0.05, 0.56], at: [0, 0.29, 0], c: 'hat', seg: 8 }, { cyl: [0.3, 0.18, 0.3], at: [0, 0.38, 0], c: 'hat', seg: 8 }, eyes(0.17, 0.145, 'eye', 0.07, 0.07)],
      ...limbs({ arm: 'coat', hand: 'skin', leg: 'hat' }),
    }) }),
  model({ id: 'npc_novice', about: 'A novice in a singed grey habit, singing', tags, palette: { robe: 'mist', veil: 'night', skin: 'sand', boot: 'slate' },
    parts: humanoid({
      hips: [box(0.3, 0.2, 0.22, [0, 0, 0], 'robe'), box(0.38, 0.42, 0.26, [0, -0.2, 0], 'robe')],
      chest: [box(0.36, 0.42, 0.22, [0, 0.19, 0], 'robe')],
      head: [box(0.24, 0.26, 0.24, [0, 0.12, 0], 'skin'), box(0.3, 0.32, 0.28, [0, 0.16, -0.03], 'veil')],
      ...limbs({ arm: 'robe', hand: 'skin', leg: 'robe', boot: 'boot', armW: 0.11, legW: 0.13 }),
    }) }),
  model({ id: 'ambrose', about: 'Bishop Ambrose: pale and kindly in a tall mitre, with a spade', tags: ['character', 'boss'], palette: { robe: 'white', trim: 'sand', skin: 'mist', mitre: 'red', dark: 'ink', eye: 'sky', boot: 'slate' },
    parts: humanoid({
      hips: [box(0.38, 0.22, 0.26, [0, 0, 0], 'robe'), box(0.46, 0.46, 0.3, [0, -0.2, 0], 'robe'), box(0.12, 0.56, 0.05, [0, -0.15, 0.17], 'trim')],
      chest: [box(0.46, 0.46, 0.28, [0, 0.21, 0], 'robe'), box(0.12, 0.44, 0.05, [0, 0.21, 0.145], 'trim'), box(0.34, 0.06, 0.05, [0, 0.32, 0.15], 'trim')],
      head: [box(0.26, 0.28, 0.26, [0, 0.13, 0], 'skin'), { cone: [0.34, 0.52, 0.2], at: [0, 0.5, 0], c: 'mitre', seg: 4 }, box(0.36, 0.08, 0.28, [0, 0.29, 0], 'trim'), eyes(0.15, 0.135, 'eye', 0.06, 0.05)],
      ...limbs({ arm: 'robe', hand: 'skin', leg: 'dark', boot: 'boot' }),
      handR: [hang(0.11, 0.1, 0.11, 'skin'), box(0.06, 0.06, 1.1, [0, -0.08, 0.3], 'dark'), box(0.24, 0.05, 0.3, [0, -0.08, 0.95], 'boot')],
    }) }),
  model({ id: 'bursar', about: 'The Bursar: a bloated demon accountant in a stolen cope, with ledger and abacus', tags: ['character', 'boss'], palette: { skin: 'red', cope: 'plum', trim: 'sand', ledger: 'orange', dark: 'ink', eye: 'lime', bead: 'white', horn: 'mist' },
    parts: humanoid({
      hips: [box(0.56, 0.32, 0.44, [0, 0, 0], 'skin'), { ball: [0.78, 0.64, 0.66], at: [0, 0.12, 0.1], c: 'skin', seg: 9 }],
      chest: [{ ball: [0.84, 0.66, 0.66], at: [0, 0.22, 0.05], c: 'cope', seg: 9 }, box(0.3, 0.55, 0.06, [0, 0.2, 0.36], 'trim'), box(0.72, 0.1, 0.5, [0, 0.46, 0], 'trim')],
      head: [box(0.34, 0.3, 0.32, [0, 0.11, 0.05], 'skin'), { mirror: [{ cone: [0.08, 0.26, 0.08], at: [0.14, 0.36, 0], c: 'horn', seg: 5 }], axis: 'x' }, eyes(0.17, 0.22, 'eye', 0.08, 0.07), box(0.2, 0.06, 0.04, [0, 0.06, 0.22], 'dark'), box(0.22, 0.05, 0.05, [0, 0.14, 0.24], 'bead')],
      ...limbs({ arm: 'cope', hand: 'skin', leg: 'dark', boot: 'dark', armW: 0.18, legW: 0.19 }),
      handL: [hang(0.14, 0.11, 0.14, 'skin'), box(0.42, 0.56, 0.12, [0, -0.3, 0.1], 'ledger'), box(0.05, 0.56, 0.14, [0, -0.3, 0.1], 'trim')],
      handR: [hang(0.14, 0.11, 0.14, 'skin'), box(0.5, 0.36, 0.06, [0, -0.28, 0.1], 'dark'), box(0.4, 0.05, 0.08, [0, -0.2, 0.1], 'bead'), box(0.4, 0.05, 0.08, [0, -0.3, 0.1], 'bead'), box(0.4, 0.05, 0.08, [0, -0.38, 0.1], 'bead')],
    }) }),
  model({ id: 'cellarer', about: 'The Cellarer: a drowned canon, huge with water, wearing a barrel', tags: ['character', 'boss'], palette: { skin: 'teal', robe: 'night', wood: 'orange', hoop: 'slate', eye: 'white', dark: 'ink' },
    parts: humanoid({
      hips: [box(0.46, 0.24, 0.34, [0, 0, 0], 'robe')],
      chest: [{ cyl: [0.74, 0.7, 0.74], at: [0, 0.18, 0], c: 'wood', seg: 8 }, { cyl: [0.78, 0.06, 0.78], at: [0, 0.38, 0], c: 'hoop', seg: 8 }, { cyl: [0.78, 0.06, 0.78], at: [0, -0.02, 0], c: 'hoop', seg: 8 }],
      head: [box(0.3, 0.3, 0.3, [0, 0.14, 0.02], 'skin'), box(0.34, 0.08, 0.34, [0, 0.3, 0], 'robe'), eyes(0.16, 0.18), box(0.14, 0.07, 0.04, [0, 0.06, 0.18], 'dark')],
      ...limbs({ arm: 'skin', hand: 'dark', leg: 'robe', boot: 'dark', armW: 0.17, legW: 0.19 }),
    }) }),
  model({ id: 'hollow_sexton', about: 'The Hollow Sexton: a Knell Warden, a huge empty gravedigger', tags: ['character', 'boss'], palette: { frock: 'night', bone: 'mist', dark: 'ink', eye: 'lime', hat: 'plum', steel: 'slate' },
    parts: humanoid({
      hips: [box(0.42, 0.24, 0.3, [0, 0, 0], 'frock'), box(0.5, 0.46, 0.32, [0, -0.22, 0], 'frock')],
      chest: [box(0.56, 0.5, 0.32, [0, 0.21, 0], 'frock'), box(0.24, 0.3, 0.05, [0, 0.25, 0.17], 'dark'), box(0.1, 0.1, 0.05, [0, 0.27, 0.2], 'eye', { glow: true })],
      head: [box(0.26, 0.28, 0.28, [0, 0.14, 0], 'bone'), { cyl: [0.46, 0.05, 0.46], at: [0, 0.31, 0], c: 'hat', seg: 8 }, { cyl: [0.3, 0.5, 0.3], at: [0, 0.58, 0], c: 'hat', seg: 8 }, eyes(0.16, 0.15)],
      ...limbs({ arm: 'frock', hand: 'bone', leg: 'dark', boot: 'dark', armW: 0.17, legW: 0.19 }),
      handR: [hang(0.13, 0.1, 0.13, 'bone'), box(0.07, 0.07, 1.3, [0, -0.08, 0.4], 'hat'), box(0.34, 0.06, 0.46, [0, -0.08, 1.15], 'steel')],
    }) }),
  model({ id: 'grand_chorister', about: 'The Grand Chorister: a Knell Warden, a vast skull that conducts a choir', tags: ['character', 'boss'], floats: true, palette: { bone: 'white', dark: 'ink', eye: 'cyan', rag: 'navy', trim: 'sand' },
    parts: [box(1.2, 1, 1.24, [0, 1.3, 0], 'bone'), box(0.78, 0.26, 0.74, [0, 0.66, 0.1], 'bone'), box(0.54, 0.24, 0.1, [0, 0.92, 0.62], 'dark'), eyes(1.4, 0.63, 'eye', 0.28, 0.24), { cone: [1.3, 0.5, 1.3], at: [0, 2.04, 0], c: 'rag', seg: 6 }, { cyl: [1.34, 0.1, 1.34], at: [0, 1.84, 0], c: 'trim', seg: 6 }] }),
  model({ id: 'clapperjaw_prime', about: 'Clapperjaw Prime: the largest of its kind, a Knell Warden', tags: ['character', 'boss'], floats: true, palette: { hide: 'night', plate: 'plum', jaw: 'sand', eye: 'cyan', tongue: 'orange' },
    parts: [
      box(1.5, 0.9, 2.3, [0, 1.25, 0], 'hide'), box(1.64, 0.32, 1.7, [0, 1.8, -0.1], 'plate'),
      { group: [box(1.2, 0.66, 0.96, [0, 0, 0.4], 'hide'), box(1.3, 0.34, 1.1, [0, -0.46, 0.5], 'jaw'), box(1.3, 0.24, 1.1, [0, 0.38, 0.5], 'jaw'), { lathe: [[0.05, 0], [0.12, 0.08], [0.06, 0.42]], at: [0, -0.4, 0.8], c: 'tongue' }, eyes(0.16, 0.9, 'eye', 0.38, 0.14)], name: 'HeadBone', pivot: true, at: [0, 1.5, 1.15] },
      { mirror: [{ cone: [0.28, 0.6, 0.28], at: [0.6, 2.2, -0.1], c: 'jaw', seg: 5 }, { cone: [0.2, 0.4, 0.2], at: [0.3, 2.14, -0.6], c: 'jaw', seg: 5 }], axis: 'x' },
    ] }),
  model({ id: 'malison', about: 'Malison, the Unrung Saint: a huge entombed saint wrapped in bell ropes, stone cracks glowing', tags: ['character', 'boss'], floats: true, palette: { stone: 'mist', dark: 'slate', rope: 'sand', crack: 'cyan', veil: 'navy', eye: 'white', halo: 'orange' },
    parts: [
      { lathe: [[1.5, 0], [1.3, 1.0], [1.15, 2.2], [1.05, 3.1], [0.7, 3.5], [0.25, 3.7]], at: [0, 0, 0], c: 'stone' },
      { group: [box(0.9, 1, 0.9, [0, 0.4, 0.05], 'stone'), box(1.1, 0.9, 1.1, [0, 0.7, -0.08], 'veil'), box(0.66, 0.5, 0.05, [0, 0.42, 0.51], 'dark'), eyes(0.5, 0.54, 'eye', 0.16, 0.16), box(0.34, 0.2, 0.05, [0, 0.14, 0.53], 'crack', { glow: true }), { torus: [1.9, 0.08, 1.9], at: [0, 1.25, -0.1], c: 'halo', glow: true, seg: 12 }], name: 'HeadBone', pivot: true, at: [0, 3.6, 0.05] },
      // Ropes wrap her. Cracks run through her.
      { cyl: [2.7, 0.14, 2.7], at: [0, 0.6, 0], c: 'rope', seg: 10 }, { cyl: [2.4, 0.14, 2.4], at: [0, 1.5, 0], c: 'rope', seg: 10, rot: [8, 0, 4] }, { cyl: [2.2, 0.14, 2.2], at: [0, 2.3, 0], c: 'rope', seg: 10, rot: [-6, 0, -6] }, { cyl: [1.7, 0.14, 1.7], at: [0, 3.2, 0], c: 'rope', seg: 10 },
      box(0.14, 1.8, 0.05, [0.5, 1.5, 1.2], 'crack', { glow: true, rot: [0, 0, 10] }), box(0.14, 1.2, 0.05, [-0.4, 2.3, 1.0], 'crack', { glow: true, rot: [0, 0, -14] }), box(0.8, 0.12, 0.05, [0, 1.1, 1.32], 'crack', { glow: true }),
    ] }),
];

export const CLEMENCY = model({
  id: 'old_clemency', about: 'Old Clemency, the Great Bell of Vespermoor: cracked, enormous', tags: ['prop', 'bell'], floats: true, palette: { bronze: 'orange', dark: 'plum', crack: 'cyan', beam: 'ink', iron: 'slate' },
  parts: [
    { lathe: [[0.3, 5], [1.0, 4.8], [1.5, 4.2], [1.7, 3], [1.9, 1.8], [2.6, 0.3], [2.75, 0], [2.3, 0.05], [0, 0.05]], at: [0, 0, 0], c: 'bronze', seg: 12 },
    { cyl: [5.6, 0.2, 5.6], at: [0, 0.4, 0], c: 'dark', seg: 12 },
    { cyl: [3.6, 0.14, 3.6], at: [0, 2.8, 0], c: 'dark', seg: 12 },
    box(0.2, 3.6, 0.1, [0.5, 2.3, 2.1], 'crack', { glow: true, rot: [0, 0, 12] }), box(0.8, 0.14, 0.1, [0.1, 1.4, 2.3], 'crack', { glow: true }),
    box(0.8, 0.5, 0.8, [0, 5.1, 0], 'iron'), box(7, 0.5, 0.5, [0, 5.5, 0], 'beam'),
  ],
});
