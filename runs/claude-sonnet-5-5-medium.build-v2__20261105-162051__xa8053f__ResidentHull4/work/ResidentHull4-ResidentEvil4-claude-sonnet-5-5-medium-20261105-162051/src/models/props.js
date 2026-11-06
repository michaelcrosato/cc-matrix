// Props and weapons as model data. No engine start here.
import { model } from '../../pixel-engine.js';

export const tannoy = model({
  id: 'tannoy', about: 'Loudspeaker horn on a pole', tags: ['prop', 'tannoy'], palette: { pole: 'slate', horn: 'sand', cone: 'red', lamp: 'orange' },
  collider: 'none',
  parts: [
    { cyl: [0.12, 3.4, 0.12], at: [0, 1.7, 0], c: 'pole' },
    { cyl: [0.5, 0.5, 0.7], at: [0, 3.3, 0.2], rot: [90, 0, 0], c: 'horn', top: 0.4, name: 'horn' },
    { cyl: [0.26, 0.1, 0.26], at: [0, 3.3, 0.6], rot: [90, 0, 0], c: 'cone' },
    { box: [0.12, 0.12, 0.2], at: [0, 3.0, -0.05], c: 'pole' },
  ],
});
export const brineBarrel = model({
  id: 'brine-barrel', about: 'Brine barrel with a red band, explodes', tags: ['prop'], palette: { wood: 'slate', band: 'red', lid: 'sand' },
  parts: [{ cyl: [0.7, 0.95, 0.7], at: [0, 0.48, 0], c: 'wood', top: 0.9 }, { cyl: [0.74, 0.14, 0.74], at: [0, 0.5, 0], c: 'band' }, { cyl: [0.5, 0.06, 0.5], at: [0, 0.97, 0], c: 'lid' }],
});
export const foghornTower = model({
  id: 'foghorn-tower', about: 'The Foghorn tower on its rock', tags: ['backdrop'], collider: 'none', palette: { stone: 'slate', rock: 'night', band: 'red', horn: 'sand', lamp: 'orange' },
  parts: [{ lump: [12, 5, 10], at: [0, 2.5, 0], c: 'rock', seed: 3 }, { cyl: [4, 16, 4], at: [0, 12, 0], c: 'stone', top: 0.7 }, { cyl: [4.2, 1.2, 4.2], at: [0, 14, 0], c: 'band' }, { cyl: [3, 2, 2.4], at: [0, 20.2, 0], rot: [0, 0, 90], c: 'horn', top: 0.5 }, { box: [1, 1, 1], at: [0, 22, 0], c: 'lamp', glow: true }],
});
export const rowboat = model({
  id: 'rowboat', about: 'A clinker rowboat', tags: ['prop'], palette: { hull: 'orange', trim: 'sand', inner: 'plum' }, collider: 'box',
  parts: [{ box: [1.4, 0.5, 3.6], at: [0, 0.25, 0], c: 'hull' }, { box: [1.1, 0.1, 3.2], at: [0, 0.52, 0], c: 'inner' }, { box: [0.3, 0.5, 0.8], at: [0, 0.25, 2.1], c: 'hull', rot: [0, 0, 0] }, { box: [1.5, 0.08, 0.1], at: [0, 0.6, 0], c: 'trim' }],
});
export const lobsterPot = model({
  id: 'lobster-pot', about: 'Lobster pot, big enough to hide in', tags: ['prop', 'hide'], palette: { cane: 'orange', rope: 'sand' },
  parts: [{ cyl: [0.9, 0.9, 0.9], at: [0, 0.45, 0], c: 'cane', top: 0.8 }, { cyl: [0.94, 0.08, 0.94], at: [0, 0.2, 0], c: 'rope' }, { cyl: [0.9, 0.08, 0.9], at: [0, 0.7, 0], c: 'rope' }],
});
export const dryingRack = model({
  id: 'drying-rack', about: 'Drying rack hung with fish', tags: ['prop'], palette: { wood: 'orange', fish: 'cyan', fish2: 'mist' },
  parts: [{ box: [0.12, 2.2, 0.12], at: [-1.1, 1.1, 0], c: 'wood' }, { box: [0.12, 2.2, 0.12], at: [1.1, 1.1, 0], c: 'wood' }, { box: [2.4, 0.1, 0.1], at: [0, 2.1, 0], c: 'wood' }, ...[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => ({ box: [0.2, 0.6, 0.06], at: [x, 1.7, 0], c: i % 2 ? 'fish' : 'fish2' }))],
});
export const bollard = model({ id: 'bollard', about: 'Iron bollard', tags: ['prop'], palette: { iron: 'night', rope: 'sand' }, parts: [{ cyl: [0.4, 0.6, 0.4], at: [0, 0.3, 0], c: 'iron' }, { cyl: [0.5, 0.12, 0.5], at: [0, 0.6, 0], c: 'iron' }, { cyl: [0.42, 0.1, 0.42], at: [0, 0.3, 0], c: 'rope' }] });
export const buoy = model({ id: 'buoy', about: 'Red buoy', tags: ['prop'], palette: { red: 'red', white: 'white' }, parts: [{ ball: [0.8, 0.8, 0.8], at: [0, 0.4, 0], c: 'red' }, { cyl: [0.82, 0.2, 0.82], at: [0, 0.4, 0], c: 'white' }, { box: [0.08, 0.5, 0.08], at: [0, 1, 0], c: 'white' }] });
export const anchor = model({ id: 'anchor', about: 'A big old anchor', tags: ['prop'], palette: { iron: 'night' }, parts: [{ box: [0.14, 1.6, 0.14], at: [0, 0.8, 0], c: 'iron' }, { box: [1.0, 0.14, 0.14], at: [0, 1.4, 0], c: 'iron' }, { box: [1.0, 0.14, 0.14], at: [0, 0.3, 0], c: 'iron', rot: [0, 0, 20] }] });
export const effigy = model({
  id: 'effigy', about: 'Effigy in a suit on a stake, over the bonfire', tags: ['prop'], palette: { stake: 'orange', suit: 'navy', skin: 'sand', tie: 'red' },
  parts: [{ box: [0.12, 3, 0.12], at: [0, 1.5, 0], c: 'stake' }, { box: [0.6, 0.9, 0.3], at: [0, 2.2, 0.1], c: 'suit' }, { box: [0.4, 0.4, 0.4], at: [0, 2.9, 0.1], c: 'skin' }, { box: [0.1, 0.5, 0.05], at: [0, 2.2, 0.27], c: 'tie' }],
});
export const telegraphDesk = model({
  id: 'telegraph-desk', about: 'Telegraph key on a desk', tags: ['prop', 'save'], palette: { wood: 'orange', brass: 'sand', lamp: 'lime', paper: 'white' },
  parts: [{ box: [1.2, 0.8, 0.7], at: [0, 0.4, 0], c: 'wood' }, { box: [0.3, 0.1, 0.2], at: [0, 0.85, 0], c: 'brass' }, { box: [0.06, 0.06, 0.3], at: [0, 0.95, 0], c: 'brass' }, { box: [0.12, 0.12, 0.12], at: [0.4, 0.9, 0], c: 'lamp', glow: true }, { box: [0.3, 0.02, 0.4], at: [-0.3, 0.82, 0], c: 'paper' }],
});
export const winch = model({
  id: 'winch', about: 'Cannery winch with a wheel', tags: ['prop'], palette: { iron: 'slate', rope: 'sand', wood: 'orange' },
  parts: [{ box: [1.4, 0.6, 1.0], at: [0, 0.3, 0], c: 'iron' }, { cyl: [0.7, 1.2, 0.7], at: [0, 0.9, 0], rot: [0, 0, 90], c: 'rope' }, { cyl: [0.9, 0.1, 0.9], at: [0.7, 0.9, 0], rot: [0, 0, 90], c: 'wood' }],
});
export const conveyor = model({
  id: 'conveyor-frame', about: 'Conveyor frame legs', tags: ['prop'], palette: { iron: 'slate' }, collider: 'none',
  parts: [{ box: [0.15, 0.7, 0.15], at: [0, 0.35, 0], c: 'iron' }],
});
export const pallet = model({
  id: 'pallet', about: 'Crane pallet loaded with crates', tags: ['prop'], palette: { wood: 'orange', band: 'red', chain: 'night' }, collider: 'none',
  parts: [{ box: [2.6, 0.2, 2.6], at: [0, 0.1, 0], c: 'wood' }, { box: [2.0, 1.0, 2.0], at: [0, 0.7, 0], c: 'band' }, { box: [0.1, 3, 0.1], at: [0, 2.7, 0], c: 'chain' }],
});
export const craneCab = model({
  id: 'crane-cab', about: 'Gantry crane cab', tags: ['prop'], palette: { iron: 'slate', glass: 'cyan', rail: 'night', lamp: 'lime', yellow: 'sand' }, collider: 'none',
  parts: [{ box: [2.2, 1.8, 2.2], at: [0, 6.2, 0], c: 'iron' }, { box: [1.6, 0.9, 0.1], at: [0, 6.4, 1.12], c: 'glass', glow: true }, { box: [0.3, 5.4, 0.3], at: [1.1, 2.7, 1.1], c: 'iron' }, { box: [0.3, 5.4, 0.3], at: [-1.1, 2.7, -1.1], c: 'iron' }, { box: [0.3, 5.4, 0.3], at: [-1.1, 2.7, 1.1], c: 'iron' }, { box: [0.3, 5.4, 0.3], at: [1.1, 2.7, -1.1], c: 'iron' }, { box: [0.3, 0.3, 0.3], at: [0, 7.4, 0], c: 'lamp', glow: true }],
});
export const lensStatue = model({
  id: 'lens-statue', about: 'Lamp statue that throws a beam through its lens', tags: ['prop', 'puzzle'], palette: { stone: 'mist', dark: 'slate', lens: 'sand' },
  parts: [{ box: [1.0, 0.4, 1.0], at: [0, 0.2, 0], c: 'dark' }, J2('Turn', [{ box: [0.6, 1.2, 0.6], at: [0, 0.9, 0], c: 'stone' }, { box: [0.5, 0.5, 0.5], at: [0, 1.75, 0], c: 'stone' }, { box: [0.34, 0.34, 0.1], at: [0, 1.75, 0.3], c: 'lens', glow: true }])],
});
function J2(name, parts) { return { group: parts, name, pivot: true, at: [0, 0, 0] }; }
export const font = model({
  id: 'font', about: 'The Font of the Tithe: a stone basin of brine', tags: ['prop'], palette: { stone: 'mist', brine: 'cyan', dark: 'slate' },
  parts: [{ cyl: [2.6, 0.9, 2.6], at: [0, 0.45, 0], c: 'stone' }, { cyl: [2.1, 0.1, 2.1], at: [0, 0.92, 0], c: 'brine', glow: true }, { cyl: [0.8, 1.4, 0.8], at: [0, 0.7, 0], c: 'dark' }],
});
export const pew = model({ id: 'pew', about: 'A church pew', tags: ['prop'], palette: { wood: 'orange', dark: 'plum' }, parts: [{ box: [2.4, 0.1, 0.5], at: [0, 0.45, 0], c: 'wood' }, { box: [2.4, 0.6, 0.08], at: [0, 0.8, -0.25], c: 'dark' }, { box: [0.1, 0.45, 0.5], at: [-1.15, 0.22, 0], c: 'dark' }, { box: [0.1, 0.45, 0.5], at: [1.15, 0.22, 0], c: 'dark' }] });
export const organ = model({ id: 'organ', about: 'Organ pipes', tags: ['prop'], collider: 'none', palette: { pipe: 'sand', base: 'plum' }, parts: [{ box: [4, 1.2, 0.8], at: [0, 0.6, 0], c: 'base' }, ...[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => ({ cyl: [0.4, 3 + (i % 3), 0.4], at: [x, 1.2 + (3 + (i % 3)) / 2, 0], c: 'pipe' }))] });
export const seaStack = model({ id: 'sea-stack', about: 'A sea stack', tags: ['backdrop'], collider: 'none', palette: { rock: 'slate', rock2: 'night' }, parts: [{ lump: [6, 14, 6], at: [0, 7, 0], c: 'rock', seed: 5 }, { lump: [4, 5, 4], at: [1, 15, 0.5], c: 'rock2', seed: 2 }] });
export const mine = model({ id: 'mine', about: 'Floating sea mine', tags: ['prop'], collider: 'none', palette: { shell: 'slate', spike: 'red' }, parts: [{ ball: [1.2, 1.2, 1.2], at: [0, 0.6, 0], c: 'shell' }, ...[[0.7, 0.6, 0], [-0.7, 0.6, 0], [0, 1.3, 0], [0, 0.6, 0.7], [0, 0.6, -0.7]].map((p) => ({ box: [0.18, 0.18, 0.18], at: p, c: 'spike' }))] });
export const launch = model({
  id: 'launch', about: 'The launch with its stern deck', tags: ['prop'], collider: 'none', palette: { hull: 'white', deck: 'orange', trim: 'red', cabin: 'sand', glass: 'cyan' },
  parts: [{ box: [3, 1.0, 9], at: [0, 0.5, 0], c: 'hull' }, { box: [2.6, 0.1, 3.8], at: [0, 1.05, -2.6], c: 'deck' }, { box: [2.4, 1.4, 3], at: [0, 1.7, 1.2], c: 'cabin' }, { box: [2.0, 0.5, 0.1], at: [0, 2.0, 2.72], c: 'glass', glow: true }, { box: [3.1, 0.12, 9.1], at: [0, 1.0, 0], c: 'trim' }],
});
export const ice = model({ id: 'ice-block', about: 'Ice block', tags: ['prop'], palette: { ice: 'cyan', ice2: 'white' }, parts: [{ box: [0.9, 0.9, 0.9], at: [0, 0.45, 0], c: 'ice' }, { box: [0.5, 0.5, 0.5], at: [0.1, 1.15, 0], c: 'ice2' }] });
export const carcass = model({ id: 'carcass', about: 'Hanging carcass', tags: ['prop'], collider: 'none', floats: true, palette: { meat: 'red', hook: 'slate' }, parts: [{ box: [0.1, 0.5, 0.1], at: [0, 2.9, 0], c: 'hook' }, { box: [0.5, 0.9, 0.3], at: [0, 2.2, 0], c: 'meat' }] });
export const gaffer = model({ id: 'gutting-table', about: 'Gutting table', tags: ['prop'], palette: { top: 'mist', leg: 'slate', fish: 'cyan' }, parts: [{ box: [1.8, 0.1, 0.9], at: [0, 0.9, 0], c: 'top' }, { box: [0.1, 0.9, 0.1], at: [-0.8, 0.45, -0.35], c: 'leg' }, { box: [0.1, 0.9, 0.1], at: [0.8, 0.45, 0.35], c: 'leg' }, { box: [0.1, 0.9, 0.1], at: [-0.8, 0.45, 0.35], c: 'leg' }, { box: [0.1, 0.9, 0.1], at: [0.8, 0.45, -0.35], c: 'leg' }, { box: [0.5, 0.06, 0.2], at: [0.2, 0.98, 0], c: 'fish' }] });
export const stainedGlass = model({ id: 'stained-glass', about: 'Stained glass panel', tags: ['prop'], collider: 'none', palette: { a: 'red', b: 'blue', c: 'sand', frame: 'night' }, parts: [{ box: [1.4, 2.4, 0.1], at: [0, 1.4, 0], c: 'frame' }, { box: [0.5, 0.8, 0.06], at: [-0.3, 1.0, 0.05], c: 'a', glow: true }, { box: [0.5, 0.8, 0.06], at: [0.3, 1.8, 0.05], c: 'b', glow: true }, { box: [0.4, 0.5, 0.06], at: [0.25, 0.9, 0.05], c: 'c', glow: true }] });
export const hayCart = model({ id: 'hay-cart', about: 'Hay cart', tags: ['prop'], palette: { hay: 'sand', hay2: 'orange', wood: 'plum', wheel: 'night' }, parts: [{ box: [2.2, 0.2, 1.4], at: [0, 0.6, 0], c: 'wood' }, { box: [2.0, 0.7, 1.2], at: [0, 1.05, 0], c: 'hay' }, { box: [1.0, 0.4, 0.8], at: [0.2, 1.6, 0], c: 'hay2' }, { cyl: [0.7, 0.12, 0.7], at: [-0.9, 0.35, 0.8], rot: [0, 0, 90], c: 'wheel' }, { cyl: [0.7, 0.12, 0.7], at: [-0.9, 0.35, -0.8], rot: [0, 0, 90], c: 'wheel' }] });

// ---- weapons in hand (all pointing +Z) ----
export const gunPistol = model({ id: 'gun-pistol', about: 'Ostrander .38', tags: ['weapon'], collider: 'none', floats: true, palette: { metal: 'slate', grip: 'orange' }, parts: [{ box: [0.06, 0.1, 0.28], at: [0, 0, 0.1], c: 'metal' }, { box: [0.06, 0.16, 0.08], at: [0, -0.1, 0], c: 'grip' }] });
export const gunScatter = model({ id: 'gun-scatter', about: 'Bosun scattergun', tags: ['weapon'], collider: 'none', floats: true, palette: { metal: 'slate', wood: 'orange' }, parts: [{ box: [0.07, 0.08, 0.9], at: [0, 0, 0.35], c: 'metal' }, { box: [0.08, 0.1, 0.35], at: [0, -0.04, -0.1], c: 'wood' }] });
export const gunRifle = model({ id: 'gun-rifle', about: 'Sealer rifle', tags: ['weapon'], collider: 'none', floats: true, palette: { metal: 'night', wood: 'plum', scope: 'sand' }, parts: [{ box: [0.05, 0.07, 1.0], at: [0, 0, 0.4], c: 'metal' }, { box: [0.07, 0.1, 0.4], at: [0, -0.03, -0.1], c: 'wood' }, { box: [0.05, 0.05, 0.3], at: [0, 0.08, 0.2], c: 'scope' }] });
export const gunHarpoon = model({ id: 'gun-harpoon', about: 'Harpoon gun', tags: ['weapon'], collider: 'none', floats: true, palette: { metal: 'slate', bolt: 'cyan', wood: 'orange' }, parts: [{ box: [0.1, 0.12, 0.8], at: [0, 0, 0.3], c: 'metal' }, { box: [0.04, 0.04, 0.5], at: [0, 0.05, 0.6], c: 'bolt' }, { box: [0.08, 0.1, 0.3], at: [0, -0.04, -0.1], c: 'wood' }] });
export const knifeProp = model({ id: 'knife', about: 'Combat knife', tags: ['weapon'], collider: 'none', floats: true, palette: { blade: 'white', grip: 'ink' }, parts: [{ box: [0.02, 0.05, 0.2], at: [0, 0, 0.14], c: 'blade' }, { box: [0.04, 0.04, 0.1], at: [0, 0, 0], c: 'grip' }] });
