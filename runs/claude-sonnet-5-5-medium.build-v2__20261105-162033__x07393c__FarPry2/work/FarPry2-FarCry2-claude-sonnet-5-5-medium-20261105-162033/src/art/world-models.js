// Scenery, buildings, vehicles. Data only. Palette slots map to the 16 engine colours.
import { model } from '../../pixel-engine.js';
const T = (id, about, tags, palette, parts, extra = {}) => model({ id, about, tags, palette, parts, ...extra });

export const acacia1 = T('acacia-a', 'Flat-topped acacia on a bent trunk', ['tree', 'nature'], { bark: 'plum', leaf: 'green', leaf2: 'lime' },
  [{ cyl: [0.45, 3.2, 0.45], at: [0, 1.6, 0], top: 0.7, c: 'bark', seg: 6 }, { box: [0.3, 1.4, 0.3], at: [0.7, 3.2, 0], rot: [0, 0, -40], c: 'bark' },
    { lump: [5.2, 1.0, 5.0], at: [0.4, 4.2, 0], seed: 3, c: 'leaf' }, { lump: [3.2, 0.7, 3.0], at: [0.8, 4.65, 0.2], seed: 5, c: 'leaf2' }], { collider: 'none' });
export const acacia2 = T('acacia-b', 'Wide acacia with two crowns', ['tree', 'nature'], { bark: 'plum', leaf: 'green', leaf2: 'teal' },
  [{ cyl: [0.5, 3.6, 0.5], at: [0, 1.8, 0], top: 0.6, c: 'bark', seg: 6 }, { lump: [4.6, 0.9, 4.2], at: [-1.1, 3.9, 0], seed: 8, c: 'leaf' }, { lump: [4.2, 0.9, 4.4], at: [1.3, 4.3, 0.3], seed: 2, c: 'leaf2' }], { collider: 'none' });
export const acacia3 = T('acacia-c', 'Small round acacia', ['tree', 'nature'], { bark: 'plum', leaf: 'lime' },
  [{ cyl: [0.4, 2.4, 0.4], at: [0, 1.2, 0], top: 0.6, c: 'bark', seg: 6 }, { lump: [3.6, 1.4, 3.6], at: [0, 3.2, 0], seed: 11, c: 'leaf' }], { collider: 'none' });
export const bottleTree = T('bottle-tree', 'Fat bottle tree with a spray of branches', ['tree', 'nature'], { bark: 'sand', bark2: 'orange', leaf: 'green' },
  [{ cyl: [1.8, 2.6, 1.8], at: [0, 1.3, 0], top: 0.5, c: 'bark', seg: 8 }, { cyl: [0.7, 1.4, 0.7], at: [0, 3.1, 0], top: 1.6, c: 'bark2', seg: 6 }, { lump: [2.6, 0.9, 2.6], at: [0, 4.0, 0], seed: 4, c: 'leaf' }], { collider: 'none' });
export const scorched = T('scorched-tree', 'Burnt black trunk with bare limbs', ['tree', 'burnt'], { char: 'ink', char2: 'night' },
  [{ cyl: [0.4, 3.0, 0.4], at: [0, 1.5, 0], top: 0.6, c: 'char', seg: 6 }, { box: [0.18, 1.6, 0.18], at: [0.6, 3.0, 0], rot: [0, 0, -35], c: 'char2' }, { box: [0.18, 1.2, 0.18], at: [-0.5, 2.8, 0.1], rot: [0, 0, 40], c: 'char2' }], { collider: 'none' });
export const termite = T('termite-mound', 'Termite mound', ['nature'], { clay: 'orange', clay2: 'red' },
  [{ cone: [1.4, 1.8, 1.4], at: [0, 0.9, 0], c: 'clay', seg: 7 }, { cone: [0.7, 1.0, 0.7], at: [0.7, 0.5, 0.3], c: 'clay2', seg: 6 }]);
export const tinShack = T('tin-shack', 'Tin-roof shack with an open doorway', ['building'], { wall: 'sand', roof: 'slate', rust: 'red', dark: 'night' },
  [{ box: [5, 2.4, 0.2], at: [0, 1.2, -2.4], c: 'wall' }, { box: [0.2, 2.4, 4.8], at: [-2.4, 1.2, 0], c: 'wall' }, { box: [0.2, 2.4, 4.8], at: [2.4, 1.2, 0], c: 'wall' },
    { box: [1.6, 2.4, 0.2], at: [-1.7, 1.2, 2.4], c: 'wall' }, { box: [1.6, 2.4, 0.2], at: [1.7, 1.2, 2.4], c: 'wall' }, { box: [1.8, 0.5, 0.2], at: [0, 2.15, 2.4], c: 'wall' },
    { box: [5.6, 0.14, 5.6], at: [0, 2.55, 0], rot: [6, 0, 0], c: 'roof' }, { box: [5.6, 0.1, 0.5], at: [0, 2.7, -1.0], c: 'rust' }], { collider: 'parts' });
export const bunker = T('concrete-bunker', 'Low concrete bunker with a slit and a door', ['building'], { conc: 'mist', dark: 'slate', slit: 'night' },
  [{ box: [6, 2.6, 0.5], at: [0, 1.3, -2.5], c: 'conc' }, { box: [0.5, 2.6, 5], at: [-3, 1.3, 0], c: 'conc' }, { box: [0.5, 2.6, 5], at: [3, 1.3, 0], c: 'conc' },
    { box: [2.2, 2.6, 0.5], at: [-1.9, 1.3, 2.5], c: 'conc' }, { box: [2.2, 2.6, 0.5], at: [1.9, 1.3, 2.5], c: 'conc' }, { box: [1.6, 0.6, 0.5], at: [0, 2.3, 2.5], c: 'conc' },
    { box: [6.6, 0.4, 5.6], at: [0, 2.8, 0], c: 'dark' }, { box: [1.4, 0.2, 0.1], at: [0, 1.7, 2.8], c: 'slit', collide: false }], { collider: 'parts' });
export const barracks = T('barracks', 'Long barracks hut', ['building'], { wall: 'mist', roof: 'slate', dark: 'night' },
  [{ box: [10, 2.6, 0.2], at: [0, 1.3, -2.6], c: 'wall' }, { box: [0.2, 2.6, 5.2], at: [-5, 1.3, 0], c: 'wall' }, { box: [0.2, 2.6, 5.2], at: [5, 1.3, 0], c: 'wall' },
    { box: [3.7, 2.6, 0.2], at: [-3.15, 1.3, 2.6], c: 'wall' }, { box: [3.7, 2.6, 0.2], at: [3.15, 1.3, 2.6], c: 'wall' }, { box: [2.6, 0.6, 0.2], at: [0, 2.3, 2.6], c: 'wall' },
    { box: [10.8, 0.16, 6.2], at: [0, 2.7, 0], rot: [5, 0, 0], c: 'roof' }], { collider: 'parts' });
export const watchtower = T('watchtower', 'Timber watchtower with a platform', ['building'], { wood: 'plum', plank: 'orange', roof: 'slate' },
  [{ box: [0.25, 6, 0.25], at: [-1, 3, -1], c: 'wood' }, { box: [0.25, 6, 0.25], at: [1, 3, -1], c: 'wood' }, { box: [0.25, 6, 0.25], at: [-1, 3, 1], c: 'wood' }, { box: [0.25, 6, 0.25], at: [1, 3, 1], c: 'wood' },
    { box: [2.8, 0.2, 2.8], at: [0, 6, 0], c: 'plank' }, { box: [2.8, 0.7, 0.12], at: [0, 6.5, 1.35], c: 'plank' }, { box: [2.8, 0.7, 0.12], at: [0, 6.5, -1.35], c: 'plank' }, { box: [0.12, 0.7, 2.8], at: [1.35, 6.5, 0], c: 'plank' }, { box: [0.12, 0.7, 2.8], at: [-1.35, 6.5, 0], c: 'plank' },
    { box: [3.2, 0.14, 3.2], at: [0, 8.2, 0], c: 'roof' }, { box: [0.15, 1.7, 0.15], at: [-1.2, 7.1, -1.2], c: 'wood' }, { box: [0.15, 1.7, 0.15], at: [1.2, 7.1, 1.2], c: 'wood' }], { collider: 'parts' });
export const sandbags = T('sandbag-run', 'Run of sandbags', ['cover'], { bag: 'sand', bag2: 'orange' },
  [{ box: [4, 0.5, 0.7], at: [0, 0.25, 0], c: 'bag' }, { box: [3.6, 0.45, 0.6], at: [0, 0.72, 0], c: 'bag2' }, { box: [2.6, 0.4, 0.5], at: [0, 1.15, 0], c: 'bag' }], { collider: 'box' });
export const boomGate = T('boom-gate', 'Boom gate across the road', ['checkpoint'], { post: 'slate', arm: 'white', stripe: 'red', cloth: 'red' },
  [{ box: [0.4, 1.2, 0.4], at: [-3, 0.6, 0], c: 'post' }, { box: [0.3, 1.0, 0.3], at: [3, 0.5, 0], c: 'post' }, { box: [6, 0.14, 0.14], at: [0, 1.0, 0], c: 'arm' },
    { box: [0.7, 0.16, 0.16], at: [-1.8, 1.0, 0.01], c: 'stripe' }, { box: [0.7, 0.16, 0.16], at: [0.2, 1.0, 0.01], c: 'stripe' }, { box: [0.7, 0.16, 0.16], at: [2.2, 1.0, 0.01], c: 'stripe' },
    { box: [0.08, 3, 0.08], at: [3.4, 1.5, 0], c: 'post' }, { box: [0.7, 0.4, 0.04], at: [3.75, 2.7, 0], c: 'cloth', name: 'cloth' }], { collider: 'none' });
export const fuelTank = T('fuel-tank', 'Squat fuel tank on legs', ['depot', 'fuel'], { shell: 'slate', band: 'red', leg: 'night', cap: 'orange' },
  [{ cyl: [3.2, 2.6, 3.2], at: [0, 2.0, 0], c: 'shell', seg: 10 }, { cyl: [3.3, 0.3, 3.3], at: [0, 2.5, 0], c: 'band', seg: 10 }, { cyl: [1.0, 0.4, 1.0], at: [0, 3.5, 0], c: 'cap', seg: 8 },
    { box: [0.3, 0.8, 0.3], at: [-1.1, 0.4, -1.1], c: 'leg' }, { box: [0.3, 0.8, 0.3], at: [1.1, 0.4, -1.1], c: 'leg' }, { box: [0.3, 0.8, 0.3], at: [-1.1, 0.4, 1.1], c: 'leg' }, { box: [0.3, 0.8, 0.3], at: [1.1, 0.4, 1.1], c: 'leg' }], { collider: 'cyl' });
export const drum = T('oil-drum', 'Oil drum', ['fuel'], { tin: 'red', band: 'plum' }, [{ cyl: [0.6, 0.9, 0.6], at: [0, 0.45, 0], c: 'tin', seg: 8 }, { cyl: [0.64, 0.12, 0.64], at: [0, 0.45, 0], c: 'band', seg: 8 }], { collider: 'cyl' });
export const silo = T('silo', 'Corrugated grain silo', ['granary'], { tin: 'mist', cap: 'slate', band: 'sand' },
  [{ cyl: [4, 7, 4], at: [0, 3.5, 0], c: 'tin', seg: 10 }, { cyl: [4.1, 0.4, 4.1], at: [0, 2, 0], c: 'band', seg: 10 }, { cone: [4.4, 1.6, 4.4], at: [0, 7.8, 0], c: 'cap', seg: 10 }], { collider: 'cyl' });
export const waterTower = T('water-tower', 'Water tower on a steel frame', ['safehouse'], { steel: 'slate', tank: 'teal', cap: 'orange' },
  [{ box: [0.3, 7, 0.3], at: [-1.6, 3.5, -1.6], c: 'steel' }, { box: [0.3, 7, 0.3], at: [1.6, 3.5, -1.6], c: 'steel' }, { box: [0.3, 7, 0.3], at: [-1.6, 3.5, 1.6], c: 'steel' }, { box: [0.3, 7, 0.3], at: [1.6, 3.5, 1.6], c: 'steel' },
    { cyl: [4, 2.6, 4], at: [0, 8.3, 0], c: 'tank', seg: 10 }, { cone: [4.2, 1.2, 4.2], at: [0, 10.2, 0], c: 'cap', seg: 10 }], { collider: 'parts' });
export const pumpStation = T('pump-station', 'Pump house over the river', ['pumps'], { wall: 'mist', roof: 'slate', pipe: 'teal', dark: 'night' },
  [{ box: [6, 2.6, 0.3], at: [0, 1.3, -2.5], c: 'wall' }, { box: [0.3, 2.6, 5], at: [-3, 1.3, 0], c: 'wall' }, { box: [0.3, 2.6, 5], at: [3, 1.3, 0], c: 'wall' }, { box: [2.2, 2.6, 0.3], at: [-1.9, 1.3, 2.5], c: 'wall' }, { box: [2.2, 2.6, 0.3], at: [1.9, 1.3, 2.5], c: 'wall' },
    { box: [6.6, 0.2, 5.6], at: [0, 2.7, 0], c: 'roof' }, { cyl: [0.7, 3.2, 0.7], at: [-1.2, 1.6, -0.5], c: 'pipe', seg: 8 }, { cyl: [0.7, 3.2, 0.7], at: [1.2, 1.6, -0.5], c: 'pipe', seg: 8 }], { collider: 'parts' });
export const clinic = T('clinic-tent', 'Clinic tent with a green cross', ['town', 'clinic'], { canvas: 'white', trim: 'mist', cross: 'green', pole: 'plum' },
  [{ box: [7, 0.14, 6], at: [0, 3.1, 0], c: 'canvas' }, { box: [7.2, 1.6, 0.14], at: [0, 2.3, 3.0], c: 'canvas' }, { box: [0.14, 2.4, 6], at: [-3.5, 1.2, 0], c: 'canvas' }, { box: [0.14, 2.4, 6], at: [3.5, 1.2, 0], c: 'canvas' }, { box: [7, 2.4, 0.14], at: [0, 1.2, -3], c: 'canvas' },
    { box: [1.4, 0.4, 0.16], at: [0, 2.6, 3.12], c: 'cross' }, { box: [0.4, 1.4, 0.16], at: [0, 2.6, 3.12], c: 'cross' }, { box: [0.25, 3.2, 0.25], at: [-3.4, 1.6, 2.9], c: 'pole' }, { box: [0.25, 3.2, 0.25], at: [3.4, 1.6, 2.9], c: 'pole' }], { collider: 'parts' });
export const platform = T('station-platform', 'Station platform with a signal mast', ['town', 'rail'], { deck: 'plum', post: 'slate', lamp: 'orange', sign: 'sand' },
  [{ box: [22, 0.8, 4], at: [0, 0.4, 0], c: 'deck' }, { box: [0.25, 3, 0.25], at: [-6, 2.3, 1.5], c: 'post' }, { box: [0.25, 3, 0.25], at: [6, 2.3, 1.5], c: 'post' }, { box: [14, 0.2, 3], at: [0, 3.9, 1], c: 'post' }, { box: [2.5, 0.8, 0.1], at: [0, 3.3, 2.5], c: 'sign' },
    { box: [0.2, 6, 0.2], at: [10, 3.8, -1], c: 'post' }, { box: [0.8, 0.3, 0.2], at: [10, 6.4, -1], c: 'lamp' }], { collider: 'parts' });
export const trig = T('trig-pillar', 'Stone trig pillar', ['trig'], { stone: 'mist', cap: 'slate', paint: 'red' },
  [{ box: [1.4, 0.4, 1.4], at: [0, 0.2, 0], c: 'cap' }, { box: [0.9, 1.4, 0.9], at: [0, 1.1, 0], top: 0.8, c: 'stone' }, { box: [1.1, 0.2, 1.1], at: [0, 1.9, 0], c: 'cap' }, { box: [0.3, 0.1, 0.3], at: [0, 2.05, 0], c: 'paint' }], { collider: 'box' });
export const radioMast = T('radio-mast', 'Lattice radio mast', ['site'], { steel: 'slate', lamp: 'red' },
  [{ box: [0.25, 14, 0.25], at: [-0.6, 7, -0.6], c: 'steel' }, { box: [0.25, 14, 0.25], at: [0.6, 7, -0.6], c: 'steel' }, { box: [0.25, 14, 0.25], at: [-0.6, 7, 0.6], c: 'steel' }, { box: [0.25, 14, 0.25], at: [0.6, 7, 0.6], c: 'steel' },
    { box: [1.4, 0.12, 0.12], at: [0, 4, 0.6], c: 'steel' }, { box: [1.4, 0.12, 0.12], at: [0, 8, 0.6], c: 'steel' }, { box: [0.3, 0.3, 0.3], at: [0, 14.2, 0], c: 'lamp', glow: true }], { collider: 'none' });
export const headframe = T('headframe', 'Mine headframe with a winding wheel', ['mine'], { steel: 'night', wheel: 'orange', brace: 'slate' },
  [{ box: [0.5, 12, 0.5], at: [-2, 6, 0], rot: [0, 0, -8], c: 'steel' }, { box: [0.5, 12, 0.5], at: [2, 6, 0], rot: [0, 0, 8], c: 'steel' }, { box: [4, 0.4, 0.4], at: [0, 6, 0], c: 'brace' }, { cyl: [2.4, 0.3, 2.4], at: [0, 11.6, 0], rot: [90, 0, 0], c: 'wheel', seg: 10 }], { collider: 'parts' });
export const sluiceHouse = T('sluice-house', 'Sluice house at the pit edge', ['mine'], { wall: 'orange', roof: 'slate', dark: 'night', pipe: 'teal' },
  [{ box: [7, 3, 0.3], at: [0, 1.5, -3], c: 'wall' }, { box: [0.3, 3, 6], at: [-3.5, 1.5, 0], c: 'wall' }, { box: [0.3, 3, 6], at: [3.5, 1.5, 0], c: 'wall' }, { box: [2.5, 3, 0.3], at: [-2.25, 1.5, 3], c: 'wall' }, { box: [2.5, 3, 0.3], at: [2.25, 1.5, 3], c: 'wall' },
    { box: [7.8, 0.2, 6.8], at: [0, 3.1, 0], c: 'roof' }, { box: [1.2, 0.5, 8], at: [-5, 1.0, 0], c: 'pipe' }], { collider: 'parts' });
export const spoil = T('spoil-heap', 'Heap of mine spoil', ['mine'], { dirt: 'plum', dirt2: 'red' }, [{ cone: [9, 3.6, 9], at: [0, 1.8, 0], c: 'dirt', seg: 8 }, { cone: [5, 2, 5], at: [3, 1, 2], c: 'dirt2', seg: 7 }], { collider: 'cyl' });
export const dome = T('observatory-dome', 'Observatory dome and hut', ['observatory'], { wall: 'mist', dome: 'sand', slit: 'night', door: 'plum' },
  [{ cyl: [6, 3, 6], at: [0, 1.5, 0], c: 'wall', seg: 10 }, { ball: [6.4, 3.2, 6.4], at: [0, 3, 0], half: true, c: 'dome', seg: 10 }, { box: [0.8, 3, 0.2], at: [0, 4, 3.0], c: 'slit', collide: false }, { box: [1.4, 2.2, 0.3], at: [0, 1.1, 3.0], c: 'door', collide: false }], { collider: 'cyl' });
export const cageBig = T('cage-steel', 'Steel cage for prisoners', ['post'], { bar: 'slate', base: 'plum' },
  [{ box: [3, 0.2, 3], at: [0, 0.1, 0], c: 'base' }, { box: [3, 0.2, 3], at: [0, 2.3, 0], c: 'base' }, ...[-1.4, -0.7, 0, 0.7, 1.4].flatMap((x) => [{ box: [0.1, 2.2, 0.1], at: [x, 1.2, 1.45], c: 'bar' }, { box: [0.1, 2.2, 0.1], at: [x, 1.2, -1.45], c: 'bar' }]), { box: [0.1, 2.2, 0.1], at: [1.45, 1.2, 0.7], c: 'bar' }, { box: [0.1, 2.2, 0.1], at: [-1.45, 1.2, 0.7], c: 'bar' }, { box: [0.1, 2.2, 0.1], at: [1.45, 1.2, -0.7], c: 'bar' }, { box: [0.1, 2.2, 0.1], at: [-1.45, 1.2, -0.7], c: 'bar' }], { collider: 'box' });
export const schoolroom = T('schoolroom', 'Open schoolroom with a blackboard', ['granary'], { wall: 'sand', roof: 'red', board: 'night', chalk: 'white' },
  [{ box: [8, 2.6, 0.2], at: [0, 1.3, -2.5], c: 'wall' }, { box: [0.2, 2.6, 5], at: [-4, 1.3, 0], c: 'wall' }, { box: [0.2, 2.6, 5], at: [4, 1.3, 0], c: 'wall' }, { box: [2.6, 2.6, 0.2], at: [-2.7, 1.3, 2.5], c: 'wall' }, { box: [2.6, 2.6, 0.2], at: [2.7, 1.3, 2.5], c: 'wall' },
    { box: [8.8, 0.16, 6], at: [0, 2.7, 0], rot: [5, 0, 0], c: 'roof' }, { box: [3, 1.2, 0.06], at: [0, 1.5, -2.35], c: 'board', collide: false }], { collider: 'parts' });
export const harvestHut = T('harvest-hut', 'Round thatched hut', ['village'], { wall: 'orange', thatch: 'sand', door: 'night' },
  [{ cyl: [4.2, 2.2, 4.2], at: [0, 1.1, 0], c: 'wall', seg: 8 }, { cone: [5.2, 2, 5.2], at: [0, 3.2, 0], c: 'thatch', seg: 8 }], { collider: 'cyl' });
export const cisternModel = T('cistern', 'Stone cistern', ['village'], { stone: 'mist', water: 'teal' },
  [{ cyl: [4, 1.2, 4], at: [0, 0.6, 0], c: 'stone', seg: 10 }, { cyl: [3.4, 0.1, 3.4], at: [0, 1.15, 0], c: 'water', seg: 10, collide: false }], { collider: 'cyl' });
export const caseModel = T('stone-case', 'Hard case of rough stones', ['pickup'], { shell: 'slate', latch: 'orange', glint: 'cyan' },
  [{ box: [0.5, 0.28, 0.34], at: [0, 0.14, 0], c: 'shell' }, { box: [0.1, 0.08, 0.06], at: [0, 0.2, 0.18], c: 'latch' }, { box: [0.08, 0.08, 0.08], at: [0.1, 0.3, 0], c: 'glint', glow: true }], { collider: 'none' });
export const redCloth = T('wind-cloth', 'Red strip of cloth on a pole', ['wind'], { pole: 'plum', cloth: 'red' },
  [{ box: [0.08, 3, 0.08], at: [0, 1.5, 0], c: 'pole' }, { box: [0.8, 0.35, 0.04], at: [0.45, 2.8, 0], c: 'cloth', name: 'cloth' }], { collider: 'none' });
export const bonnet = T('tibor-rack', 'Tibor gun rack', ['town'], { wood: 'plum', top: 'orange', hook: 'slate' },
  [{ box: [4, 0.1, 1.2], at: [0, 0.95, 0], c: 'top' }, { box: [0.2, 0.95, 1.1], at: [-1.9, 0.48, 0], c: 'wood' }, { box: [0.2, 0.95, 1.1], at: [1.9, 0.48, 0], c: 'wood' }, { box: [4, 1.6, 0.1], at: [0, 1.8, -0.6], c: 'wood' }, { box: [3.4, 0.08, 0.1], at: [0, 2.0, -0.5], c: 'hook' }], { collider: 'parts' });
export const bed2 = T('safehouse-bed', 'Cot with a grey blanket', ['safehouse'], { frame: 'plum', blanket: 'slate', pillow: 'white' },
  [{ box: [1, 0.3, 2.1], at: [0, 0.3, 0], c: 'frame' }, { box: [0.9, 0.12, 1.6], at: [0, 0.52, 0.2], c: 'blanket' }, { box: [0.7, 0.12, 0.4], at: [0, 0.54, -0.7], c: 'pillow' }], { collider: 'box' });
export const locker = T('locker', 'Steel locker', ['safehouse'], { steel: 'slate', door: 'mist', handle: 'orange' },
  [{ box: [1.0, 2.0, 0.6], at: [0, 1.0, 0], c: 'steel' }, { box: [0.9, 1.8, 0.06], at: [0, 1.0, 0.32], c: 'door' }, { box: [0.1, 0.3, 0.06], at: [0.3, 1.0, 0.38], c: 'handle' }], { collider: 'box' });
export const crateAmmo = T('ammo-crate', 'Ammo and syrette crate', ['safehouse'], { wood: 'orange', band: 'red', mark: 'white' },
  [{ box: [1, 0.6, 0.6], at: [0, 0.3, 0], c: 'wood' }, { box: [1.04, 0.12, 0.64], at: [0, 0.3, 0], c: 'band' }, { box: [0.3, 0.2, 0.04], at: [0, 0.34, 0.32], c: 'mark', collide: false }], { collider: 'box' });
export const gazelle = model({ id: 'gazelle', about: 'Small gazelle with four swinging legs', tags: ['fauna'], palette: { hide: 'orange', hide2: 'sand', dark: 'night' }, floats: true, collider: 'none',
  parts: [{ box: [0.3, 0.32, 0.8], at: [0, 0.7, 0], c: 'hide' }, { box: [0.16, 0.4, 0.16], at: [0, 1.0, 0.45], rot: [20, 0, 0], c: 'hide' }, { box: [0.16, 0.18, 0.26], at: [0, 1.25, 0.6], c: 'hide2' }, { box: [0.06, 0.2, 0.06], at: [0.06, 1.42, 0.55], c: 'dark' }, { box: [0.06, 0.2, 0.06], at: [-0.06, 1.42, 0.55], c: 'dark' },
    { group: [{ box: [0.08, 0.5, 0.08], at: [0, -0.25, 0], c: 'hide2' }], at: [0.1, 0.55, 0.3], pivot: true, name: 'LegFR' }, { group: [{ box: [0.08, 0.5, 0.08], at: [0, -0.25, 0], c: 'hide2' }], at: [-0.1, 0.55, 0.3], pivot: true, name: 'LegFL' }, { group: [{ box: [0.08, 0.5, 0.08], at: [0, -0.25, 0], c: 'hide2' }], at: [0.1, 0.55, -0.3], pivot: true, name: 'LegBR' }, { group: [{ box: [0.08, 0.5, 0.08], at: [0, -0.25, 0], c: 'hide2' }], at: [-0.1, 0.55, -0.3], pivot: true, name: 'LegBL' }] });
export const vulture = model({ id: 'vulture', about: 'Vulture with two flapping wings', tags: ['fauna'], palette: { body: 'night', wing: 'plum', head: 'red' }, floats: true, collider: 'none',
  parts: [{ box: [0.3, 0.25, 0.6], at: [0, 0, 0], c: 'body' }, { box: [0.12, 0.12, 0.14], at: [0, 0.08, 0.38], c: 'head' },
    { group: [{ box: [0.9, 0.06, 0.4], at: [0.45, 0, 0], c: 'wing' }], at: [0.12, 0.08, 0], pivot: true, name: 'WingR' }, { group: [{ box: [0.9, 0.06, 0.4], at: [-0.45, 0, 0], c: 'wing' }], at: [-0.12, 0.08, 0], pivot: true, name: 'WingL' }] });
export const WORLD_MODELS = [gazelle, vulture, acacia1, acacia2, acacia3, bottleTree, scorched, termite, tinShack, bunker, barracks, watchtower, sandbags, boomGate, fuelTank, drum, silo, waterTower, pumpStation, clinic, platform, trig, radioMast, headframe, sluiceHouse, spoil, dome, cageBig, schoolroom, harvestHut, cisternModel, caseModel, redCloth, bonnet, bed2, locker, crateAmmo];
