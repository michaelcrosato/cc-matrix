// The island's own models, as plain data (ASSETS.md). Check with: node check.mjs --sheets src/art/models.js
import { model, MODEL_LIBRARY, ModelCatalog } from '../../pixel-engine.js';

export const ounce = model({
  id: 'ounce', about: 'Ounce: a mint retro bathroom scale whose round dial is its face', tags: ['character'], size: [1.1, 1.05, 1.1],
  palette: { body: 'cyan', base: 'teal', tread: 'sky', face: 'white', rim: 'slate', tick: 'mist', needle: 'red', eye: 'ink' },
  parts: [
    { name: 'base', box: [1.04, 0.08, 1.04], at: [0, 0.04, 0], c: 'base' },
    { name: 'plate', box: [0.96, 0.2, 0.96], at: [0, 0.18, 0], c: 'body' },
    { mirror: [{ name: 'tread', box: [0.3, 0.03, 0.42], at: [0.22, 0.295, -0.22], c: 'tread' }], axis: 'x' },
    { group: [
        { name: 'neck', box: [0.5, 0.42, 0.14], at: [0, 0.21, 0], c: 'body' },
        { group: [
            { name: 'rim', cyl: [0.78, 0.1, 0.78], at: [0, 0, 0], c: 'rim', seg: 14 },
            { name: 'dial', cyl: [0.66, 0.04, 0.66], at: [0, 0.06, 0], c: 'face', seg: 14 },
            ...[-60, -30, 0, 30, 60].map((a) => ({ box: [0.06, 0.03, 0.09], at: [Math.sin(a * Math.PI / 180) * 0.26, 0.085, -Math.cos(a * Math.PI / 180) * 0.26], rot: [0, -a, 0], c: 'tick' })),
            { mirror: [{ name: 'eye', box: [0.08, 0.03, 0.11], at: [0.12, 0.09, -0.07], c: 'eye' }], axis: 'x' },
            { group: [{ name: 'needleBar', box: [0.06, 0.03, 0.22], at: [0, 0, 0.1], c: 'needle' }, { name: 'hub', cyl: [0.07, 0.04, 0.07], at: [0, 0, 0], c: 'needle', seg: 8 }], name: 'needle', pivot: true, at: [0, 0.1, 0.1], rot: [0, 180, 0] },
          ], name: 'face', pivot: true, at: [0, 0.5, 0.08], rot: [72, 0, 0] },
      ], name: 'head', pivot: true, at: [0, 0.26, 0.2] },
  ],
});

export const kettlebellVolcano = model({
  id: 'kettlebell-volcano', about: 'A giant dormant kettlebell, mostly, with a glowing top and a handle', tags: ['scenery', 'island'],
  palette: { iron: 'slate', dark: 'night', glow: 'orange', hot: 'sand', band: 'navy' },
  parts: [
    { name: 'belly', ball: [12, 9, 12], at: [0, 4.5, 0], c: 'iron', seg: 12 },
    { name: 'foot', cyl: [8.5, 1, 8.5], at: [0, 0.5, 0], c: 'dark', seg: 12 },
    { name: 'band', cyl: [11.6, 0.8, 11.6], at: [0, 3, 0], c: 'band', seg: 12 },
    { name: 'handle', torus: [8, 1.6, 8], at: [0, 9.6, 0], rot: [90, 0, 0], c: 'dark', seg: 10 },
    { name: 'crater', cyl: [4.2, 0.4, 4.2], at: [0, 8.9, 0], c: 'glow', glow: true, seg: 10 },
    { name: 'heart', cyl: [2.2, 0.5, 2.2], at: [0, 9.2, 0], c: 'hot', glow: true, seg: 8 },
  ],
});
export const foamRollerHill = model({
  id: 'foam-roller-hill', about: 'A giant foam roller lying on its side with grippy bands', tags: ['scenery', 'island'],
  palette: { foam: 'lime', band: 'green', cap: 'teal' },
  parts: [
    { name: 'roll', cyl: [6, 11, 6], at: [0, 3.2, 0], rot: [0, 0, 90], c: 'foam', seg: 12 },
    ...[-4, -1.5, 1.5, 4].map((x, i) => ({ name: 'band' + i, cyl: [6.3, 1, 6.3], at: [x, 3.2, 0], rot: [0, 0, 90], c: 'band', seg: 12 })),
    { name: 'capA', cyl: [5, 0.4, 5], at: [5.6, 3.2, 0], rot: [0, 0, 90], c: 'cap', seg: 10 },
  ],
});
export const dumbbellBridge = model({
  id: 'dumbbell-bridge', about: 'A bridge that is one huge dumbbell, with railings', tags: ['scenery', 'island', 'bridge'],
  palette: { bar: 'slate', plate: 'navy', deck: 'sand', rail: 'white' },
  parts: [
    { name: 'deck', box: [10, 0.3, 2.4], at: [0, 0.6, 0], c: 'deck' },
    { name: 'barL', cyl: [0.5, 10, 0.5], at: [0, 0.3, -1.4], rot: [0, 0, 90], c: 'bar', seg: 8 },
    { name: 'barR', cyl: [0.5, 10, 0.5], at: [0, 0.3, 1.4], rot: [0, 0, 90], c: 'bar', seg: 8 },
    ...[-4.6, 4.6].map((x, i) => ({ name: 'plate' + i, cyl: [3.2, 1.2, 3.2], at: [x, 1.65, 0], rot: [0, 0, 90], c: 'plate', seg: 10 })),
    { name: 'railA', box: [8, 0.1, 0.1], at: [0, 1.5, -1.1], c: 'rail' }, { name: 'railB', box: [8, 0.1, 0.1], at: [0, 1.5, 1.1], c: 'rail' },
  ],
});
export const medicineBall = model({
  id: 'medicine-ball', about: 'A medicine ball boulder with a seam', tags: ['scenery', 'island'], floats: true, params: { r: [1, 0.5, 2.5] },
  palette: { skin: 'orange', seam: 'red' },
  parts: (p) => [{ name: 'ball', ball: [p.r * 2, p.r * 1.8, p.r * 2], at: [0, p.r * 0.9, 0], c: 'skin', seg: 10 }, { name: 'seam', torus: [p.r * 2.02, p.r * 0.14, p.r * 2.02], at: [0, p.r * 0.9, 0], rot: [0, 0, 80], c: 'seam', seg: 10 }],
});
export const pavilion = model({
  id: 'pavilion', about: 'An open pavilion with columns and a cone roof, recoloured per station', tags: ['building', 'island'],
  palette: { roof: 'sky', col: 'white', floor: 'mist', trim: 'cyan' },
  parts: [
    { name: 'floor', cyl: [7, 0.3, 7], at: [0, 0.15, 0], c: 'floor', seg: 10 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ name: 'col' + i, cyl: [0.5, 3.4, 0.5], at: [Math.cos(i * Math.PI / 3) * 2.9, 2, Math.sin(i * Math.PI / 3) * 2.9], c: 'col', seg: 8 })),
    { name: 'ring', cyl: [6.6, 0.3, 6.6], at: [0, 3.8, 0], c: 'trim', seg: 10 },
    { name: 'roof', cone: [7.6, 2.4, 7.6], at: [0, 5.1, 0], c: 'roof', seg: 10 },
  ],
});
export const sweatJar = model({
  id: 'sweat-jar', about: 'The Sweat Jar: a big glass jar on a plinth with a lid and a label', tags: ['prop', 'island'],
  palette: { glass: 'mist', plinth: 'white', lid: 'teal', label: 'cyan', ink: 'ink', trim: 'slate' },
  parts: [
    { name: 'plinth', cyl: [1.8, 0.4, 1.8], at: [0, 0.2, 0], c: 'plinth', seg: 10 },
    { name: 'glass', lathe: [[0.85, 0], [0.95, 0.1], [0.95, 2.1], [0.75, 2.4], [0.75, 2.55]], at: [0, 0.3, 0], seg: 12, c: 'glass' },
    { name: 'lid', cyl: [1.7, 0.2, 1.7], at: [0, 2.95, 0], c: 'lid', seg: 10 },
    { name: 'label', box: [1, 0.7, 0.05], at: [0, 1.2, 0.98], c: 'label' },
    { name: 'dot', box: [0.2, 0.2, 0.06], at: [0, 1.2, 1.02], c: 'ink' },
  ],
});
export const repShed = model({
  id: 'rep-shed', about: 'The Rep Shed: an orange-roofed gym shed with a giant dumbbell sign', tags: ['building', 'island'],
  palette: { wall: 'white', roof: 'orange', trim: 'red', door: 'slate', glass: 'sky', bell: 'navy' },
  parts: [
    { name: 'walls', box: [7, 3, 5], at: [0, 1.5, 0], c: 'wall' },
    { name: 'roof', wedge: [7.6, 1.6, 5.6], at: [0, 3.8, 0], rot: [0, 180, 0], c: 'roof' },
    { name: 'door', box: [1.8, 2.2, 0.15], at: [0, 1.1, 2.55], c: 'door' },
    { mirror: [{ name: 'win', box: [1.2, 1, 0.15], at: [2.3, 1.7, 2.55], c: 'glass' }], axis: 'x' },
    { name: 'bar', cyl: [0.25, 3, 0.25], at: [0, 4.7, 2.4], rot: [0, 0, 90], c: 'bell', seg: 6 },
    { mirror: [{ name: 'plt', cyl: [1, 0.4, 1], at: [1.4, 4.7, 2.4], rot: [0, 0, 90], c: 'bell', seg: 8 }], axis: 'x' },
    { name: 'trim', box: [7.2, 0.3, 5.2], at: [0, 3.1, 0], c: 'trim' },
  ],
});
export const beatStage = model({
  id: 'beat-stage', about: 'Beat Beach stage with speakers and a striped back wall', tags: ['building', 'island', 'music'],
  palette: { floor: 'white', wall: 'sky', stripe: 'cyan', spk: 'night', cone: 'slate', light: 'sand' },
  parts: [
    { name: 'floor', box: [7, 0.4, 4], at: [0, 0.2, 0], c: 'floor' },
    { name: 'wall', box: [7, 3.2, 0.3], at: [0, 2, -1.8], c: 'wall' },
    { name: 'stripe', box: [6.8, 0.5, 0.35], at: [0, 2.2, -1.75], c: 'stripe' },
    { mirror: [{ name: 'spk', box: [1.2, 2.2, 1.1], at: [3.2, 1.5, -0.6], c: 'spk' }, { name: 'cone', cyl: [0.8, 0.12, 0.8], at: [3.2, 1.3, -0.03], rot: [90, 0, 0], c: 'cone', seg: 8 }, { name: 'tw', cyl: [0.35, 0.12, 0.35], at: [3.2, 2.2, -0.03], rot: [90, 0, 0], c: 'cone', seg: 8 }], axis: 'x' },
    { name: 'bulb', ball: [0.4, 0.4, 0.4], at: [0, 3.8, -1.7], c: 'light', glow: true },
  ],
});
export const pier = model({
  id: 'pier', about: 'A wooden pier with posts and rope railings', tags: ['building', 'island', 'water'], floats: true,
  palette: { plank: 'sand', post: 'orange', rope: 'white' },
  parts: [
    { name: 'deck', box: [10, 0.25, 3], at: [0, 0.6, 0], c: 'plank' },
    ...[-4.5, -1.5, 1.5, 4.5].flatMap((x, i) => [{ name: 'pa' + i, box: [0.3, 1.8, 0.3], at: [x, 0.5, -1.4], c: 'post' }, { name: 'pb' + i, box: [0.3, 1.8, 0.3], at: [x, 0.5, 1.4], c: 'post' }]),
    { name: 'ra', box: [10, 0.1, 0.1], at: [0, 1.3, -1.4], c: 'rope' }, { name: 'rb', box: [10, 0.1, 0.1], at: [0, 1.3, 1.4], c: 'rope' },
  ],
});
export const palm = model({
  id: 'palm', about: 'A palm tree: a tube trunk with a crown of flat fronds', tags: ['plant', 'island'], params: { h: [4, 2, 7] },
  palette: { trunk: 'plum', frond: 'green', frond2: 'lime', nut: 'plum' },
  parts: (p) => [
    { name: 'trunk', tube: [[0, 0.12, 0], [0.3, p.h * 0.5, 0], [0, p.h, 0.2]], r: [0.28, 0.18], c: 'trunk' },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ name: 'f' + i, box: [0.5, 0.1, 2.2], at: [Math.sin(i * 1.05) * 1.0, p.h + 0.1, 0.2 + Math.cos(i * 1.05) * 1.0], rot: [14, i * 60, 0], c: i % 2 ? 'frond' : 'frond2' })),
    { name: 'n1', ball: [0.3, 0.3, 0.3], at: [0.2, p.h - 0.2, 0.1], c: 'nut' }, { name: 'n2', ball: [0.3, 0.3, 0.3], at: [-0.15, p.h - 0.25, 0.3], c: 'nut' },
  ],
});
export const yogaMat = model({
  id: 'yoga-mat', about: 'A yoga mat in a lane colour with a white stripe', tags: ['prop', 'class'], palette: { mat: 'teal', stripe: 'white' },
  parts: [{ name: 'mat', box: [1.6, 0.06, 2.2], at: [0, 0.03, 0], c: 'mat' }, { name: 'stripe', box: [0.12, 0.07, 2.1], at: [0, 0.035, 0], c: 'stripe' }],
});
export const stepPlatform = model({
  id: 'step-platform', about: 'An aerobics step platform with grippy risers', tags: ['prop', 'class'], palette: { top: 'cyan', riser: 'navy', grip: 'white' },
  parts: [{ name: 'top', box: [1.3, 0.18, 0.7], at: [0, 0.3, 0], c: 'top' }, { mirror: [{ name: 'rs', box: [0.2, 0.22, 0.6], at: [0.5, 0.11, 0], c: 'riser' }], axis: 'x' }, { name: 'grip', box: [0.9, 0.04, 0.3], at: [0, 0.4, 0], c: 'grip' }],
});
export const hoop = model({
  id: 'hoop', about: 'A hula hoop ring', tags: ['prop', 'class'], floats: true, palette: { ring: 'red', band: 'sand' },
  parts: [{ name: 'ring', torus: [1.1, 0.12, 1.1], at: [0, 0.06, 0], c: 'ring', seg: 12 }, { name: 'band', box: [0.2, 0.14, 0.14], at: [0.55, 0.06, 0], c: 'band' }],
});
export const coconut = model({
  id: 'coconut', about: 'A coconut', tags: ['prop', 'game'], palette: { shell: 'plum', eye: 'ink' },
  parts: [{ name: 'shell', ball: [0.5, 0.5, 0.5], at: [0, 0.25, 0], c: 'shell', seg: 8 }, { name: 'e1', box: [0.08, 0.08, 0.05], at: [-0.08, 0.34, 0.22], c: 'eye' }, { name: 'e2', box: [0.08, 0.08, 0.05], at: [0.08, 0.34, 0.22], c: 'eye' }],
});
export const flipFlop = model({
  id: 'flip-flop', about: 'A flip-flop sandal', tags: ['prop', 'game'], palette: { sole: 'sky', strap: 'red' },
  parts: [{ name: 'sole', box: [0.32, 0.06, 0.62], at: [0, 0.03, 0], c: 'sole' }, { name: 'strap', box: [0.28, 0.04, 0.08], at: [0, 0.1, 0.05], rot: [0, 0, 0], c: 'strap' }, { name: 'toe', box: [0.06, 0.06, 0.2], at: [0, 0.1, 0.1], c: 'strap' }],
});
export const goldenPineapple = model({
  id: 'golden-pineapple', about: 'A golden pineapple worth thirty points', tags: ['prop', 'game'], palette: { fruit: 'sand', cross: 'orange', leaf: 'lime' },
  parts: [{ name: 'body', ball: [0.5, 0.65, 0.5], at: [0, 0.32, 0], c: 'fruit', seg: 8 }, { name: 'band', torus: [0.52, 0.06, 0.52], at: [0, 0.3, 0], c: 'cross', seg: 8 }, { name: 'l1', cone: [0.2, 0.4, 0.2], at: [0, 0.8, 0], c: 'leaf', seg: 5 }, { name: 'l2', cone: [0.14, 0.34, 0.14], at: [0.1, 0.78, 0], rot: [0, 0, -25], c: 'leaf', seg: 5 }],
});
export const catapult = model({
  id: 'catapult', about: 'Dennis\'s catapult: a plank on a barrel with a bucket', tags: ['prop', 'game'], palette: { wood: 'orange', arm: 'sand', bucket: 'slate', rope: 'white' },
  parts: [{ name: 'base', box: [1.4, 0.3, 1.4], at: [0, 0.15, 0], c: 'wood' }, { mirror: [{ name: 'post', box: [0.2, 1, 0.2], at: [0.5, 0.8, 0], c: 'wood' }], axis: 'x' }, { group: [{ name: 'bar', box: [0.2, 0.2, 2.2], at: [0, 0, 0], c: 'arm' }, { name: 'bucket', cyl: [0.5, 0.3, 0.5], at: [0, 0.2, -1], c: 'bucket', seg: 8 }], name: 'arm', pivot: true, at: [0, 1.2, 0], rot: [-25, 0, 0] }],
});
export const trayMdl = model({
  id: 'vitamin-tray', about: 'A lacquered tray with a raised lip', tags: ['prop', 'game'], palette: { tray: 'white', lip: 'cyan' },
  parts: [{ name: 'bed', box: [5, 0.14, 4], at: [0, 0.07, 0], c: 'tray' }, { name: 'l1', box: [5.2, 0.3, 0.16], at: [0, 0.2, 2.02], c: 'lip' }, { name: 'l2', box: [5.2, 0.3, 0.16], at: [0, 0.2, -2.02], c: 'lip' }, { name: 'l3', box: [0.16, 0.3, 4.1], at: [2.52, 0.2, 0], c: 'lip' }, { name: 'l4', box: [0.16, 0.3, 4.1], at: [-2.52, 0.2, 0], c: 'lip' }],
});
export const cup = model({
  id: 'vitamin-cup', about: 'A tall cup in a vitamin colour', tags: ['prop', 'game'], palette: { cup: 'red' },
  parts: [{ name: 'cup', cyl: [0.9, 0.5, 0.9], at: [0, 0.25, 0], c: 'cup', seg: 10 }],
});
export const vitamin = model({
  id: 'vitamin', about: 'A round vitamin pill', tags: ['prop', 'game'], palette: { pill: 'red' },
  parts: [{ name: 'pill', ball: [0.34, 0.34, 0.34], at: [0, 0.17, 0], c: 'pill', seg: 8 }],
});
export const slackAnchor = model({
  id: 'slack-anchor', about: 'A giant dumbbell standing on end, anchoring a slackline', tags: ['prop', 'island'], palette: { bar: 'slate', plate: 'navy', cap: 'sand' },
  parts: [{ name: 'bar', cyl: [0.5, 3.5, 0.5], at: [0, 1.75, 0], c: 'bar', seg: 8 }, { name: 'plateA', cyl: [2.2, 0.8, 2.2], at: [0, 0.4, 0], c: 'plate', seg: 10 }, { name: 'plateB', cyl: [1.7, 0.6, 1.7], at: [0, 3.3, 0], c: 'plate', seg: 10 }, { name: 'cap', cyl: [0.7, 0.2, 0.7], at: [0, 3.7, 0], c: 'cap', seg: 8 }],
});
export const hammock = model({
  id: 'hammock', about: 'A hammock slung between two palm posts', tags: ['prop', 'island'], palette: { post: 'plum', cloth: 'sky', stripe: 'white' },
  parts: [{ mirror: [{ name: 'post', box: [0.3, 2.4, 0.3], at: [1.6, 1.2, 0], c: 'post' }], axis: 'x' }, { name: 'cloth', box: [3, 0.1, 1], at: [0, 0.9, 0], c: 'cloth' }, { name: 'st', box: [2.9, 0.11, 0.2], at: [0, 0.9, 0], c: 'stripe' }, { name: 'pillow', box: [0.6, 0.2, 0.5], at: [-1.1, 1.05, 0], c: 'stripe' }],
});
export const lockers = model({
  id: 'lockers', about: 'A bank of locker-room lockers', tags: ['building', 'island'], palette: { door: 'cyan', frame: 'slate', vent: 'night', tag: 'sand' },
  parts: [{ name: 'frame', box: [3.2, 2.4, 0.9], at: [0, 1.2, 0], c: 'frame' }, ...[-1, 0, 1].flatMap((i) => [{ name: 'd' + i, box: [0.9, 2.1, 0.1], at: [i * 1.04, 1.2, 0.46], c: 'door' }, { name: 'v' + i, box: [0.5, 0.15, 0.12], at: [i * 1.04, 1.9, 0.5], c: 'vent' }, { name: 't' + i, box: [0.16, 0.1, 0.12], at: [i * 1.04 + 0.28, 1.2, 0.5], c: 'tag' }])],
});
export const hallBoard = model({
  id: 'hall-board', about: 'The Hall of Numbers: a big chart board on two legs', tags: ['building', 'island'], palette: { board: 'white', frame: 'navy', line: 'red', grid: 'mist' },
  parts: [{ name: 'board', box: [4.4, 2.6, 0.2], at: [0, 2.3, 0], c: 'board' }, { name: 'fr', boxFrame: undefined, box: [4.7, 2.9, 0.12], at: [0, 2.3, -0.08], c: 'frame' }, { mirror: [{ name: 'leg', box: [0.25, 1.2, 0.25], at: [1.8, 0.6, 0], c: 'frame' }], axis: 'x' }, { name: 'l1', box: [3.4, 0.08, 0.05], at: [0, 2.3, 0.12], rot: [0, 0, 8], c: 'line' }, { name: 'g1', box: [3.8, 0.06, 0.06], at: [0, 1.6, 0.12], c: 'grid' }, { name: 'g2', box: [3.8, 0.06, 0.06], at: [0, 2.9, 0.12], c: 'grid' }],
});
export const paddleMdl = model({
  id: 'judge-paddle', about: 'A judge\'s paddle on a stick', tags: ['prop', 'game'], palette: { stick: 'sand', face: 'white' },
  parts: [{ name: 'stick', box: [0.1, 0.9, 0.1], at: [0, 0.45, 0], c: 'stick' }, { name: 'face', cyl: [0.6, 0.08, 0.6], at: [0, 1.1, 0.03], rot: [90, 0, 0], c: 'face', seg: 8 }],
});
export const scooter = model({
  id: 'scooter', about: 'Coach\'s white mobility scooter', tags: ['vehicle', 'character'], palette: { body: 'white', seat: 'cyan', wheel: 'ink', bar: 'slate', flag: 'orange' },
  parts: [{ name: 'deck', box: [0.7, 0.18, 1.5], at: [0, 0.3, 0], c: 'body' }, { name: 'seat', box: [0.55, 0.14, 0.5], at: [0, 0.46, -0.3], c: 'seat' }, { name: 'back', box: [0.5, 0.5, 0.1], at: [0, 0.78, -0.58], c: 'seat' }, { name: 'column', box: [0.1, 0.8, 0.1], at: [0, 0.7, 0.5], c: 'bar' }, { name: 'bars', box: [0.6, 0.08, 0.08], at: [0, 1.1, 0.5], c: 'bar' }, { mirror: [{ name: 'wh', cyl: [0.4, 0.14, 0.4], at: [0.4, 0.2, 0.5], rot: [0, 0, 90], c: 'wheel', seg: 8 }, { name: 'wb', cyl: [0.4, 0.14, 0.4], at: [0.4, 0.2, -0.5], rot: [0, 0, 90], c: 'wheel', seg: 8 }], axis: 'x' }, { name: 'flag', box: [0.07, 0.7, 0.07], at: [0.3, 0.95, -0.55], c: 'bar' }, { name: 'pennant', box: [0.3, 0.2, 0.04], at: [0.46, 1.25, -0.55], c: 'flag' }],
});
export const ferry = model({
  id: 'ferry', about: 'The little ferry that brings you to Tare Island', tags: ['vehicle', 'water'], palette: { hull: 'white', trim: 'red', cab: 'sky', roof: 'cyan', glass: 'navy' },
  parts: [{ name: 'hull', box: [3.2, 1, 7], at: [0, 0.5, 0], c: 'hull' }, { name: 'bow', wedge: [3.2, 1, 2], at: [0, 0.5, 4.4], rot: [0, 0, 0], c: 'hull' }, { name: 'stripe', box: [3.3, 0.2, 7.1], at: [0, 0.95, 0], c: 'trim' }, { name: 'cab', box: [2.4, 1.4, 2.6], at: [0, 1.7, -0.8], c: 'cab' }, { name: 'roof', box: [2.7, 0.2, 3], at: [0, 2.5, -0.8], c: 'roof' }, { name: 'win', box: [2.1, 0.5, 2.7], at: [0, 1.9, -0.8], c: 'glass' }],
});
export const waterCup = model({
  id: 'water-cup', about: 'A paper water cup', tags: ['prop', 'game'], palette: { cup: 'white', water: 'sky' },
  parts: [{ name: 'cup', cyl: [0.4, 0.5, 0.4], at: [0, 0.25, 0], top: 1.3, c: 'cup', seg: 8 }, { name: 'w', cyl: [0.34, 0.06, 0.34], at: [0, 0.5, 0], c: 'water', seg: 8 }],
});
export const sprinkler = model({
  id: 'sprinkler', about: 'A lawn sprinkler head with a spray', tags: ['prop', 'game'], palette: { head: 'slate', spray: 'cyan' },
  parts: [{ name: 'base', cyl: [0.5, 0.3, 0.5], at: [0, 0.15, 0], c: 'head', seg: 8 }, { name: 'arm', box: [0.8, 0.12, 0.12], at: [0, 0.34, 0], c: 'head' }, { name: 'sp', box: [0.2, 0.5, 0.2], at: [0.5, 0.6, 0], c: 'spray' }],
});
export const kevin = model({
  id: 'kevin', about: 'Kevin the seagull', tags: ['character', 'bird'], palette: { body: 'white', wing: 'mist', beak: 'orange', eye: 'ink', leg: 'orange', back: 'slate' },
  parts: [{ name: 'body', ball: [0.7, 0.5, 0.9], at: [0, 0.5, 0], c: 'body', seg: 8 }, { name: 'head', ball: [0.36, 0.34, 0.36], at: [0, 0.82, 0.38], c: 'body', seg: 8 }, { name: 'beak', box: [0.1, 0.08, 0.26], at: [0, 0.78, 0.66], c: 'beak' }, { mirror: [{ name: 'eye', box: [0.06, 0.06, 0.05], at: [0.1, 0.88, 0.52], c: 'eye' }, { name: 'leg', box: [0.06, 0.3, 0.06], at: [0.14, 0.15, 0.05], c: 'leg' }], axis: 'x' }, { name: 'wingL', box: [0.1, 0.35, 0.6], at: [0.36, 0.55, -0.05], rot: [0, 0, -10], c: 'back' }, { name: 'wingR', box: [0.1, 0.35, 0.6], at: [-0.36, 0.55, -0.05], rot: [0, 0, 10], c: 'back' }, { name: 'tail', box: [0.3, 0.06, 0.4], at: [0, 0.55, -0.55], c: 'wing' }],
});
export const kevinFlap = model({
  id: 'kevin-flap', about: 'Kevin the seagull with his wings up', tags: ['character', 'bird'], palette: { body: 'white', wing: 'mist', beak: 'orange', eye: 'ink', leg: 'orange', back: 'slate' },
  parts: [{ name: 'body', ball: [0.7, 0.5, 0.9], at: [0, 0.5, 0], c: 'body', seg: 8 }, { name: 'head', ball: [0.36, 0.34, 0.36], at: [0, 0.82, 0.38], c: 'body', seg: 8 }, { name: 'beak', box: [0.1, 0.08, 0.26], at: [0, 0.78, 0.66], c: 'beak' }, { mirror: [{ name: 'eye', box: [0.06, 0.06, 0.05], at: [0.1, 0.88, 0.52], c: 'eye' }, { name: 'leg', box: [0.06, 0.3, 0.06], at: [0.14, 0.15, 0.05], c: 'leg' }], axis: 'x' }, { name: 'wingL', box: [0.1, 0.8, 0.6], at: [0.5, 0.95, -0.05], rot: [0, 0, 40], c: 'back' }, { name: 'wingR', box: [0.1, 0.8, 0.6], at: [-0.5, 0.95, -0.05], rot: [0, 0, -40], c: 'back' }, { name: 'tail', box: [0.3, 0.06, 0.4], at: [0, 0.55, -0.55], c: 'wing' }],
});
export const dais = model({
  id: 'dais', about: 'Coach\'s demonstration dais', tags: ['prop', 'class'], palette: { top: 'white', side: 'mist', edge: 'cyan' },
  parts: [{ name: 'base', cyl: [2.2, 0.3, 2.2], at: [0, 0.15, 0], c: 'side', seg: 10 }, { name: 'top', cyl: [2, 0.12, 2], at: [0, 0.36, 0], c: 'top', seg: 10 }, { name: 'edge', torus: [2.1, 0.08, 2.1], at: [0, 0.4, 0], c: 'edge', seg: 10 }],
});
export const bigDumbbell = model({
  id: 'big-dumbbell', about: 'A giant dumbbell lying on the floor of the Rep Shed', tags: ['prop', 'class'], palette: { bar: 'slate', plate: 'orange' },
  parts: [{ name: 'bar', cyl: [0.3, 2.6, 0.3], at: [0, 0.55, 0], rot: [0, 0, 90], c: 'bar', seg: 8 }, { mirror: [{ name: 'p', cyl: [1.1, 0.5, 1.1], at: [1.1, 0.55, 0], rot: [0, 0, 90], c: 'plate', seg: 10 }], axis: 'x' }],
});
export const gymMirrorFrame = model({
  id: 'gym-frame', about: 'A frame for the gym mirror', tags: ['prop', 'class'], palette: { frame: 'navy', frame2: 'blue' },
  parts: [{ name: 't', box: [6.4, 0.2, 0.2], at: [0, 3.1, 0], c: 'frame' }, { name: 'b', box: [6.4, 0.2, 0.2], at: [0, 0.1, 0], c: 'frame' }, { mirror: [{ name: 's', box: [0.2, 2.8, 0.24], at: [3.1, 1.6, 0], c: 'frame2' }], axis: 'x' }],
});
export const lantern = model({
  id: 'lantern', about: 'A hanging pavilion lantern', tags: ['prop', 'island'], palette: { cage: 'orange', glow: 'sand' },
  parts: [{ name: 'cage', cyl: [0.4, 0.5, 0.4], at: [0, 0.25, 0], c: 'cage', seg: 6 }, { name: 'glow', ball: [0.3, 0.3, 0.3], at: [0, 0.5, 0], c: 'glow', glow: true, seg: 6 }],
});
export const toweled = model({
  id: 'towel-cape', about: 'A towel', tags: ['prop'], palette: { towel: 'white', stripe: 'red' },
  parts: [{ name: 't', box: [0.8, 0.1, 0.5], at: [0, 0.05, 0], c: 'towel' }, { name: 's', box: [0.7, 0.11, 0.1], at: [0, 0.05, 0.1], c: 'stripe' }],
});

export const OWN = [ounce, kettlebellVolcano, foamRollerHill, dumbbellBridge, medicineBall, pavilion, sweatJar, repShed, beatStage, pier, palm, yogaMat, stepPlatform, hoop, coconut, flipFlop, goldenPineapple, catapult, trayMdl, cup, vitamin, slackAnchor, hammock, lockers, hallBoard, paddleMdl, scooter, ferry, waterCup, sprinkler, kevin, kevinFlap, dais, bigDumbbell, gymMirrorFrame, lantern, toweled];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...OWN]);
