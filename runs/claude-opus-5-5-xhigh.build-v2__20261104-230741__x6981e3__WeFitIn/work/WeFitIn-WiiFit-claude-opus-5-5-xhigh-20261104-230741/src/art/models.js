// Tare Island, as plain data: the landscape is exercise equipment at enormous scale.
import { model, MODEL_LIBRARY, ModelCatalog } from '../../pixel-engine.js';

const rad = (a) => (a * Math.PI) / 180;

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
        ...[-60, -30, 0, 30, 60].map((a) => ({ box: [0.06, 0.03, 0.09], at: [Math.sin(rad(a)) * 0.26, 0.085, -Math.cos(rad(a)) * 0.26], rot: [0, -a, 0], c: 'tick' })),
        { mirror: [{ name: 'eye', box: [0.08, 0.03, 0.11], at: [0.12, 0.09, -0.07], c: 'eye' }], axis: 'x' },
        { group: [{ name: 'needleBar', box: [0.06, 0.03, 0.22], at: [0, 0, 0.1], c: 'needle' }, { name: 'hub', cyl: [0.07, 0.04, 0.07], at: [0, 0, 0], c: 'needle', seg: 8 }], name: 'needle', pivot: true, at: [0, 0.1, 0.1], rot: [0, 180, 0] },
      ], name: 'face', pivot: true, at: [0, 0.5, 0.08], rot: [72, 0, 0] },
    ], name: 'head', pivot: true, at: [0, 0.26, 0.2] },
  ],
});

export const kettlebellVolcano = model({
  id: 'kettlebell-volcano', about: 'Kettlebell Volcano: a dormant, mostly, giant iron kettlebell with a glowing top', tags: ['scenery', 'landmark'],
  palette: { iron: 'slate', dark: 'night', band: 'ink', lava: 'orange', hot: 'sand', rock: 'mist' },
  parts: [
    { name: 'skirt', cyl: [14, 1.2, 14], at: [0, 0.6, 0], top: 0.86, c: 'rock', seg: 12 },
    { name: 'bell', ball: [12, 9, 12], at: [0, 5, 0], c: 'iron', seg: 14 },
    { name: 'belt', cyl: [11.6, 0.5, 11.6], at: [0, 3.2, 0], c: 'band', seg: 14 },
    { mirror: [{ name: 'lug', box: [1.4, 3.4, 1.4], at: [3.2, 9.8, 0], c: 'dark' }], axis: 'x' },
    { name: 'handle', torus: [8.6, 1.3, 2.4], at: [0, 12, 0], rot: [90, 0, 0], c: 'dark', seg: 14 },
    { name: 'crater', cyl: [4.2, 0.5, 4.2], at: [0, 9.3, 0], c: 'band', seg: 12 },
    { name: 'lava', cyl: [3.4, 0.3, 3.4], at: [0, 9.56, 0], c: 'lava', glow: true, seg: 10 },
    { name: 'hot', cyl: [1.6, 0.12, 1.6], at: [0, 9.74, 0], c: 'hot', glow: true, seg: 8 },
  ],
});

export const foamRollerHill = model({
  id: 'foam-roller-hill', about: 'Foam Roller Hill: a huge ribbed foam roller lying on its side', tags: ['scenery', 'landmark'],
  palette: { foam: 'sky', band: 'blue', end: 'navy', turf: 'lime' },
  parts: [
    { name: 'turf', box: [12, 0.4, 7.2], at: [0, 0.2, 0], c: 'turf' },
    { name: 'roller', cyl: [5, 10, 5], at: [0, 2.7, 0], rot: [0, 0, 90], c: 'foam', seg: 12 },
    ...[-3.8, -1.9, 0, 1.9, 3.8].map((x) => ({ cyl: [5.3, 0.5, 5.3], at: [x, 2.7, 0], rot: [0, 0, 90], c: 'band', seg: 12 })),
    { mirror: [{ name: 'cap', cyl: [3.2, 0.2, 3.2], at: [5.08, 2.7, 0], rot: [0, 0, 90], c: 'end', seg: 12 }], axis: 'x' },
  ],
});

export const dumbbellBridge = model({
  id: 'dumbbell-bridge', about: 'The Dumbbell Bridge: a giant dumbbell laid over an inlet as a walkway', tags: ['scenery', 'landmark'],
  palette: { plate: 'slate', steel: 'mist', deck: 'white', rim: 'ink' },
  floats: true,
  parts: [
    { name: 'bar', cyl: [0.9, 9, 0.9], at: [0, 0.2, 0], rot: [0, 0, 90], c: 'steel', seg: 10 },
    { name: 'deck', box: [8, 0.18, 2.4], at: [0, 0.74, 0], c: 'deck' },
    { mirror: [
      { name: 'plateBig', cyl: [4.4, 1.3, 4.4], at: [4.8, 1.6, 0], rot: [0, 0, 90], c: 'plate', seg: 12 },
      { name: 'plateSmall', cyl: [3.2, 0.7, 3.2], at: [5.8, 1.6, 0], rot: [0, 0, 90], c: 'rim', seg: 12 },
      { name: 'nut', cyl: [1.1, 0.4, 1.1], at: [6.3, 1.6, 0], rot: [0, 0, 90], c: 'steel', seg: 8 },
    ], axis: 'x' },
  ],
});

export const medicineBall = model({
  id: 'medicine-ball', about: 'A boulder-sized medicine ball with stitched seams', tags: ['scenery', 'prop'],
  palette: { hide: 'red', seam: 'ink', patch: 'sand' },
  parts: [
    { name: 'ball', ball: [1.6, 1.6, 1.6], at: [0, 0.84, 0], c: 'hide', seg: 12 },
    { name: 'seamA', cyl: [1.66, 0.08, 1.66], at: [0, 0.84, 0], c: 'seam', seg: 12 },
    { name: 'seamB', cyl: [1.66, 0.08, 1.66], at: [0, 0.84, 0], rot: [90, 0, 0], c: 'seam', seg: 12 },
    { name: 'patch', box: [0.42, 0.06, 0.42], at: [0, 1.65, 0], c: 'patch' },
  ],
});

/** Columns and a cone roof; recolour the roof per station. */
export const pavilion = model({
  id: 'pavilion', about: 'An open white pavilion: columns on a dais, a coloured cone roof', tags: ['building'],
  palette: { stone: 'white', trim: 'mist', roof: 'sky', cap: 'white', step: 'mist' },
  params: { w: [7, 4, 12] },
  parts: (p) => [
    { name: 'dais', cyl: [p.w, 0.3, p.w], at: [0, 0.15, 0], c: 'stone', seg: 12 },
    { name: 'stepRing', cyl: [p.w + 0.8, 0.14, p.w + 0.8], at: [0, 0.07, 0], c: 'step', seg: 12 },
    ...[0, 60, 120, 180, 240, 300].map((a) => ({ cyl: [0.42, 3, 0.42], at: [Math.sin(rad(a)) * (p.w / 2 - 0.5), 1.8, Math.cos(rad(a)) * (p.w / 2 - 0.5)], c: 'trim', seg: 8 })),
    { name: 'ringBeam', cyl: [p.w + 0.1, 0.34, p.w + 0.1], at: [0, 3.46, 0], c: 'stone', seg: 12 },
    { name: 'roof', cone: [p.w + 1.2, 2.2, p.w + 1.2], at: [0, 4.73, 0], c: 'roof', seg: 12 },
    { name: 'finial', ball: [0.5, 0.5, 0.5], at: [0, 5.95, 0], c: 'cap' },
  ],
});

export const sweatJar = model({
  id: 'sweat-jar', about: 'The Sweat Jar: a tall glass jar on a plinth with a lid and a label', tags: ['prop', 'landmark'],
  palette: { glass: 'mist', plinth: 'white', trim: 'slate', lid: 'cyan', label: 'white', ink: 'ink' },
  parts: [
    { name: 'plinth', box: [2.5, 0.3, 2.5], at: [0, 0.15, 0], c: 'plinth' },
    { name: 'plinthTrim', box: [2.2, 0.1, 2.2], at: [0, 0.35, 0], c: 'trim' },
    { name: 'wall', lathe: [[0.85, 0], [0.95, 0.1], [0.95, 2.1], [0.75, 2.4], [0.75, 2.55]], at: [0, 0.3, 0], c: 'glass', seg: 12 },
    { name: 'lid', cyl: [1.7, 0.22, 1.7], at: [0, 2.96, 0], c: 'lid', seg: 12 },
    { name: 'knob', ball: [0.42, 0.34, 0.42], at: [0, 3.2, 0], c: 'trim' },
    { name: 'label', box: [0.9, 0.5, 0.05], at: [0, 0.96, 0.95], c: 'label' },
    { name: 'labelMark', box: [0.54, 0.09, 0.03], at: [0, 1.04, 0.99], c: 'ink' },
  ],
});

export const repShed = model({
  id: 'rep-shed', about: 'The Rep Shed: a little corrugated gym shed with an orange roof', tags: ['building'],
  palette: { wall: 'white', band: 'mist', roof: 'orange', door: 'night', sign: 'ink', eave: 'red' },
  parts: [
    { name: 'body', box: [6, 3, 4.6], at: [0, 1.5, 0], c: 'wall' },
    ...[0.7, 1.5, 2.3].map((y) => ({ box: [6.04, 0.1, 4.64], at: [0, y, 0], c: 'band' })),
    { name: 'roofL', box: [3.5, 0.26, 5.4], at: [-1.5, 3.72, 0], rot: [0, 0, 26], c: 'roof' },
    { name: 'roofR', box: [3.5, 0.26, 5.4], at: [1.5, 3.72, 0], rot: [0, 0, -26], c: 'roof' },
    { name: 'gable', box: [3.2, 0.82, 4.5], at: [0, 3.4, 0], c: 'wall' },
    { name: 'door', box: [1.9, 2.3, 0.1], at: [0, 1.15, 2.33], c: 'door' },
    { name: 'sign', box: [2.6, 0.5, 0.1], at: [0, 2.72, 2.34], c: 'sign' },
    { name: 'eave', box: [6.1, 0.14, 0.14], at: [0, 3.02, 2.34], c: 'eave' },
  ],
});

export const beatStage = model({
  id: 'beat-stage', about: 'Beat Stage: a low white stage on the sand with two big speakers', tags: ['building'],
  palette: { deck: 'white', skirt: 'sky', cab: 'ink', cone: 'slate', dust: 'mist', truss: 'mist', lamp: 'sand' },
  parts: [
    { name: 'deck', box: [8, 0.5, 4.4], at: [0, 0.25, 0], c: 'deck' },
    { name: 'skirt', box: [8.1, 0.2, 4.5], at: [0, 0.1, 0], c: 'skirt' },
    { mirror: [
      { name: 'cab', box: [1.2, 2.4, 1], at: [3.7, 1.7, -1.4], c: 'cab' },
      { name: 'woofer', cyl: [0.82, 0.1, 0.82], at: [3.7, 1.26, -0.86], rot: [90, 0, 0], c: 'cone', seg: 10 },
      { name: 'tweeter', cyl: [0.42, 0.1, 0.42], at: [3.7, 2.34, -0.86], rot: [90, 0, 0], c: 'dust', seg: 8 },
      { name: 'post', box: [0.16, 3.6, 0.16], at: [3.9, 2.3, 2], c: 'truss' },
    ], axis: 'x' },
    { name: 'beam', box: [8, 0.2, 0.2], at: [0, 4.1, 2], c: 'truss' },
    ...[-2.4, 0, 2.4].map((x) => ({ box: [0.4, 0.3, 0.4], at: [x, 3.85, 2], c: 'lamp', glow: true })),
  ],
});

export const pier = model({
  id: 'pier', about: 'A wooden pier with white railings and a diving lip', tags: ['building'],
  params: { len: [12, 4, 40] },
  palette: { plank: 'sand', beam: 'orange', post: 'plum', rail: 'white' },
  parts: (p) => [
    { name: 'deck', box: [3.2, 0.2, p.len], at: [0, 1.5, 0], c: 'plank' },
    ...Array.from({ length: Math.max(2, Math.floor(p.len / 3)) }, (_, i) => ({ box: [3.3, 0.12, 0.3], at: [0, 1.36, -p.len / 2 + (i + 0.5) * (p.len / Math.max(2, Math.floor(p.len / 3)))], c: 'beam' })),
    ...Array.from({ length: Math.max(2, Math.floor(p.len / 4)) }, (_, i) => {
      const z = -p.len / 2 + (i + 0.5) * (p.len / Math.max(2, Math.floor(p.len / 4)));
      return { mirror: [{ cyl: [0.36, 2.4, 0.36], at: [1.42, 0.2, z], c: 'post', seg: 8 }, { box: [0.1, 1.1, 0.1], at: [1.5, 2.08, z], c: 'rail' }], axis: 'x' };
    }),
    { mirror: [{ box: [0.12, 0.12, p.len], at: [1.5, 2.56, 0], c: 'rail' }], axis: 'x' },
  ],
  floats: true,
});

export const palm = model({
  id: 'palm', about: 'A chunky palm tree: curved trunk, drooping fronds, coconuts', tags: ['scenery', 'plant'],
  palette: { trunk: 'sand', ring: 'orange', frond: 'green', frond2: 'teal', nut: 'plum' },
  parts: [
    { name: 'trunk', tube: [[0, 0.05, 0], [0.12, 1.1, 0], [0.38, 2.2, 0], [0.78, 3.3, 0], [1.2, 4.1, 0]], r: [0.3, 0.17], at: [0, 0, 0], c: 'trunk', seg: 7 },
    ...[[0.05, 0.6, 0.3], [0.25, 1.8, 0.28], [0.65, 2.9, 0.24]].map(([x, y, r]) => ({ cyl: [r * 2.3, 0.1, r * 2.3], at: [x, y, 0], c: 'ring', seg: 7 })),
    ...[0, 60, 120, 180, 240, 300].map((a, i) => ({ group: [
      { box: [0.7, 0.1, 2.0], at: [0, -0.14, 1.0], rot: [14, 0, 0], c: i % 2 ? 'frond' : 'frond2' },
      { box: [0.44, 0.1, 1.1], at: [0, -0.68, 2.3], rot: [38, 0, 0], c: i % 2 ? 'frond' : 'frond2' },
    ], at: [1.2, 4.2, 0], rot: [0, a, 0] })),
    { mirror: [{ ball: [0.32, 0.32, 0.32], at: [1.28, 3.92, 0.2], c: 'nut' }], axis: 'z' },
  ],
});

export const yogaMat = model({
  id: 'yoga-mat', about: 'A yoga mat rolled out flat, with stripes at the ends', tags: ['prop'],
  palette: { mat: 'sky', band: 'white' },
  parts: [
    { name: 'mat', box: [1.2, 0.05, 2], at: [0, 0.025, 0], c: 'mat' },
    { mirror: [{ box: [1.16, 0.02, 0.14], at: [0, 0.055, 0.8], c: 'band' }], axis: 'z' },
  ],
});

export const stepPlatform = model({
  id: 'step-platform', about: 'A low aerobics step platform with risers', tags: ['prop'],
  palette: { top: 'white', side: 'sky', riser: 'navy' },
  parts: [
    { name: 'top', box: [1.3, 0.08, 0.7], at: [0, 0.24, 0], c: 'top' },
    { name: 'body', box: [1.24, 0.12, 0.64], at: [0, 0.14, 0], c: 'side' },
    { mirror: [{ name: 'riser', box: [0.3, 0.1, 0.72], at: [0.42, 0.05, 0], c: 'riser' }], axis: 'x' },
  ],
});

export const hoop = model({
  id: 'hoop', about: 'A hula hoop', tags: ['prop'],
  palette: { hoop: 'red' },
  parts: [{ name: 'hoop', torus: [1.3, 0.1, 1.3], at: [0, 0.05, 0], c: 'hoop', seg: 18 }],
});

export const coconut = model({
  id: 'coconut', about: 'A coconut, ready to be headed', tags: ['prop', 'item'],
  palette: { husk: 'plum', fibre: 'orange', dot: 'ink' },
  parts: [
    { name: 'husk', ball: [0.46, 0.46, 0.46], at: [0, 0.23, 0], c: 'husk', seg: 8 },
    { name: 'band', cyl: [0.47, 0.06, 0.47], at: [0, 0.23, 0], c: 'fibre', seg: 8 },
    { name: 'eye', box: [0.08, 0.08, 0.04], at: [0, 0.32, 0.21], c: 'dot' },
  ],
});

export const flipFlop = model({
  id: 'flip-flop', about: 'A single flip-flop, thrown with intent', tags: ['prop', 'item'],
  palette: { sole: 'lime', strap: 'red' },
  parts: [
    { name: 'sole', cyl: [0.42, 0.08, 0.78], at: [0, 0.04, 0], c: 'sole', seg: 10 },
    { name: 'strapA', box: [0.34, 0.07, 0.07], at: [0, 0.13, 0.1], c: 'strap' },
    { name: 'strapB', box: [0.07, 0.1, 0.34], at: [0, 0.11, 0.2], c: 'strap' },
  ],
});

export const goldenPineapple = model({
  id: 'golden-pineapple', about: 'A golden pineapple, worth a great deal to someone', tags: ['prop', 'item'],
  palette: { gold: 'sand', scale: 'orange', leaf: 'lime', leaf2: 'green' },
  parts: [
    { name: 'body', ball: [0.46, 0.6, 0.46], at: [0, 0.3, 0], c: 'gold', seg: 8 },
    { name: 'bandA', cyl: [0.47, 0.07, 0.47], at: [0, 0.2, 0], c: 'scale', seg: 8 },
    { name: 'bandB', cyl: [0.47, 0.07, 0.47], at: [0, 0.4, 0], c: 'scale', seg: 8 },
    ...[0, 120, 240].map((a) => ({ box: [0.1, 0.34, 0.1], at: [Math.sin(rad(a)) * 0.08, 0.72, Math.cos(rad(a)) * 0.08], rot: [Math.cos(rad(a)) * 22, 0, -Math.sin(rad(a)) * 22], c: a ? 'leaf' : 'leaf2' })),
  ],
});

export const catapult = model({
  id: 'catapult', about: 'A home-made coconut catapult, Dennis assures you', tags: ['prop'],
  palette: { wood: 'orange', dark: 'plum', iron: 'slate' },
  parts: [
    { mirror: [{ name: 'rail', box: [0.2, 0.2, 2], at: [0.6, 0.3, 0], c: 'wood' }, { name: 'wheel', cyl: [0.6, 0.14, 0.6], at: [0.78, 0.3, 0.7], rot: [0, 0, 90], c: 'dark', seg: 8 }, { box: [0.14, 1.2, 0.14], at: [0.5, 0.95, -0.1], c: 'wood' }], axis: 'x' },
    { name: 'cross', box: [1.4, 0.2, 0.2], at: [0, 1.5, -0.1], c: 'dark' },
    { name: 'bed', box: [1.2, 0.12, 0.2], at: [0, 0.4, 0.7], c: 'dark' },
    { name: 'axle', box: [1.2, 0.14, 0.14], at: [0, 0.53, 0.72], c: 'iron' },
    { group: [
      { name: 'beam', box: [0.16, 0.16, 1.9], at: [0, 0, -0.8], c: 'wood' },
      { name: 'cup', box: [0.46, 0.14, 0.46], at: [0, 0.1, -1.7], c: 'iron' },
    ], name: 'arm', pivot: true, at: [0, 0.66, 0.72] },
  ],
});

export const tray = model({
  id: 'tray', about: 'A lacquered red tray with a raised rim', tags: ['prop'],
  params: { w: [6, 2, 12], d: [4.4, 2, 10] },
  palette: { lacquer: 'red', floor: 'white', trim: 'orange' },
  parts: (p) => [
    { name: 'under', box: [p.w + 0.7, 0.1, p.d + 0.7], at: [0, 0.05, 0], c: 'lacquer' },
    { name: 'base', box: [p.w + 0.1, 0.1, p.d + 0.1], at: [0, 0.14, 0], c: 'floor' },
    { mirror: [{ box: [0.2, 0.22, p.d + 0.46], at: [p.w / 2 + 0.14, 0.22, 0], c: 'trim' }], axis: 'x' },
    { mirror: [{ box: [p.w + 0.06, 0.24, 0.2], at: [0, 0.23, p.d / 2 + 0.14], c: 'trim' }], axis: 'z' },
  ],
});

export const vitaminCup = model({
  id: 'vitamin-cup', about: 'A small paper cup sunk in the tray, in its colour', tags: ['prop'],
  palette: { cup: 'red', dark: 'ink' },
  parts: [
    { name: 'wall', cyl: [0.84, 0.1, 0.84], at: [0, 0.05, 0], c: 'cup', seg: 12 },
    { name: 'hole', cyl: [0.36, 0.04, 0.36], at: [0, 0.1, 0], c: 'dark', seg: 10 },
  ],
});

export const vitamin = model({
  id: 'vitamin', about: 'A round vitamin pill with a pale band', tags: ['prop', 'item'],
  palette: { pill: 'red', band: 'white' },
  parts: [
    { name: 'pill', ball: [0.36, 0.36, 0.36], at: [0, 0.18, 0], c: 'pill', seg: 8 },
    { name: 'band', cyl: [0.37, 0.07, 0.37], at: [0, 0.18, 0], c: 'band', seg: 8 },
  ],
});

export const slackAnchor = model({
  id: 'slack-anchor', about: 'A giant upright dumbbell holding one end of the slackline', tags: ['scenery'],
  palette: { plate: 'slate', bar: 'mist', cap: 'ink', ring: 'red' },
  parts: [
    { name: 'foot', cyl: [2.6, 0.7, 2.6], at: [0, 0.35, 0], c: 'plate', seg: 12 },
    { name: 'bar', cyl: [0.6, 3.2, 0.6], at: [0, 2.2, 0], c: 'bar', seg: 8 },
    { name: 'head', cyl: [2, 0.7, 2], at: [0, 4.1, 0], c: 'plate', seg: 12 },
    { name: 'cap', cyl: [1.1, 0.2, 1.1], at: [0, 4.55, 0], c: 'cap', seg: 10 },
    { name: 'ring', cyl: [0.8, 0.16, 0.8], at: [0, 2.9, 0], c: 'ring', seg: 8 },
  ],
});

export const hammock = model({
  id: 'hammock', about: 'A striped hammock slung low between two posts', tags: ['prop'],
  palette: { post: 'orange', cloth: 'cyan', stripe: 'white' },
  parts: [
    { mirror: [{ name: 'post', cyl: [0.24, 1.8, 0.24], at: [1.9, 0.9, 0], c: 'post', seg: 6 }, { name: 'rope', box: [0.66, 0.07, 0.07], at: [1.56, 1.0, 0], rot: [0, 0, 22], c: 'post' }], axis: 'x' },
    { name: 'cloth', box: [2.6, 0.12, 1], at: [0, 0.74, 0], c: 'cloth' },
    { name: 'clothL', box: [0.5, 0.12, 0.9], at: [-1.4, 0.86, 0], rot: [0, 0, -22], c: 'cloth' },
    { name: 'clothR', box: [0.5, 0.12, 0.9], at: [1.4, 0.86, 0], rot: [0, 0, 22], c: 'cloth' },
    { name: 'stripeA', box: [2.62, 0.13, 0.14], at: [0, 0.74, 0.22], c: 'stripe' },
    { name: 'stripeB', box: [2.62, 0.13, 0.14], at: [0, 0.74, -0.22], c: 'stripe' },
  ],
});

export const lockers = model({
  id: 'lockers', about: 'A bank of tall gym lockers', tags: ['prop', 'building'],
  palette: { door: 'sky', frame: 'white', vent: 'navy', handle: 'sand', base: 'slate' },
  parts: [
    { name: 'frame', box: [3.6, 2.5, 0.8], at: [0, 1.35, 0], c: 'frame' },
    { name: 'base', box: [3.7, 0.12, 0.86], at: [0, 0.06, 0], c: 'base' },
    ...[-1.2, -0.4, 0.4, 1.2].flatMap((x, i) => [
      { box: [0.68, 2.2, 0.06], at: [x, 1.36, 0.41], c: 'door' },
      { box: [0.4, 0.08, 0.04], at: [x, 2.2, 0.45], c: 'vent' },
      { box: [0.4, 0.08, 0.04], at: [x, 2.04, 0.45], c: 'vent' },
      { box: [0.08, 0.3, 0.05], at: [x + (i % 2 ? -0.22 : 0.22), 1.3, 0.46], c: 'handle' },
    ]),
  ],
});

export const numbersBoard = model({
  id: 'numbers-board', about: 'The Hall of Numbers: a tall clinical board of records with a little roof', tags: ['building'],
  palette: { board: 'navy', frame: 'white', rule: 'mist', mark: 'cyan', mark2: 'sand', post: 'slate', roof: 'teal' },
  parts: [
    { mirror: [{ name: 'post', box: [0.3, 3.6, 0.3], at: [2.3, 1.8, 0], c: 'post' }], axis: 'x' },
    { name: 'frame', box: [4.6, 2.9, 0.26], at: [0, 2.35, 0], c: 'frame' },
    { name: 'board', box: [4.2, 2.5, 0.1], at: [0, 2.35, 0.14], c: 'board' },
    { name: 'roof', box: [5.2, 0.2, 1], at: [0, 3.9, 0.1], c: 'roof' },
    ...[0, 1, 2, 3].map((i) => ({ box: [3.6, 0.06, 0.03], at: [0, 1.5 + i * 0.56, 0.2], c: 'rule' })),
    ...[[-1.4, 1.7, 'mark'], [-0.8, 2.2, 'mark'], [-0.2, 2, 'mark'], [0.4, 2.7, 'mark2'], [1, 2.5, 'mark2'], [1.5, 3, 'mark2']].map(([x, y, c]) => ({ box: [0.26, 0.26, 0.04], at: [x, y, 0.21], c })),
  ],
});

export const judgePaddle = model({
  id: 'judge-paddle', about: 'A judge\'s score paddle on a short handle', tags: ['prop'],
  palette: { face: 'white', rim: 'red', stick: 'orange' },
  parts: [
    { name: 'stick', box: [0.08, 0.5, 0.08], at: [0, 0.25, 0], c: 'stick' },
    { name: 'rim', box: [0.62, 0.62, 0.05], at: [0, 0.76, 0], c: 'rim' },
    { name: 'face', box: [0.5, 0.5, 0.03], at: [0, 0.76, 0.03], c: 'face' },
  ],
});

export const mobilityScooter = model({
  id: 'mobility-scooter', about: 'A spotless white mobility scooter with a small basket', tags: ['vehicle', 'prop'],
  palette: { shell: 'white', seat: 'navy', wheel: 'ink', trim: 'cyan', basket: 'mist' },
  parts: [
    { name: 'floor', box: [0.72, 0.16, 1.4], at: [0, 0.26, 0], c: 'shell' },
    { name: 'nose', box: [0.62, 0.3, 0.3], at: [0, 0.4, 0.62], c: 'shell' },
    { name: 'stripe', box: [0.74, 0.07, 1.42], at: [0, 0.24, 0], c: 'trim' },
    { name: 'seatBase', box: [0.2, 0.3, 0.2], at: [0, 0.48, -0.28], c: 'shell' },
    { name: 'seat', box: [0.6, 0.14, 0.54], at: [0, 0.68, -0.28], c: 'seat' },
    { name: 'back', box: [0.56, 0.54, 0.12], at: [0, 1, -0.52], c: 'seat' },
    { name: 'column', box: [0.1, 0.72, 0.1], at: [0, 0.8, 0.54], rot: [-18, 0, 0], c: 'shell' },
    { name: 'bars', box: [0.62, 0.08, 0.08], at: [0, 1.15, 0.44], c: 'trim' },
    { name: 'basket', box: [0.44, 0.24, 0.3], at: [0, 0.9, 0.72], c: 'basket' },
    { mirror: [
      { name: 'wheelF', cyl: [0.32, 0.12, 0.32], at: [0.34, 0.16, 0.5], rot: [0, 0, 90], c: 'wheel', seg: 8 },
      { name: 'wheelB', cyl: [0.32, 0.12, 0.32], at: [0.34, 0.16, -0.5], rot: [0, 0, 90], c: 'wheel', seg: 8 },
    ], axis: 'x' },
  ],
});

export const ferry = model({
  id: 'ferry', about: 'A small white island ferry with a teal stripe and one modest funnel', tags: ['vehicle'],
  palette: { hull: 'white', stripe: 'teal', deck: 'sand', cabin: 'mist', window: 'navy', funnel: 'red', band: 'white' },
  parts: [
    { name: 'hull', box: [3.6, 1.2, 8], at: [0, 0.6, 0], c: 'hull' },
    { name: 'bow', cyl: [3.6, 1.2, 3], at: [0, 0.6, 4], c: 'hull', seg: 10 },
    { name: 'stripe', box: [3.66, 0.22, 8.06], at: [0, 0.9, 0], c: 'stripe' },
    { name: 'deck', box: [3.3, 0.1, 7.8], at: [0, 1.25, 0], c: 'deck' },
    { name: 'cabin', box: [2.6, 1.3, 3], at: [0, 1.95, -0.6], c: 'cabin' },
    { name: 'roof', box: [2.9, 0.16, 3.4], at: [0, 2.68, -0.6], c: 'hull' },
    { mirror: [{ name: 'window', box: [0.06, 0.5, 1.8], at: [1.32, 2.05, -0.6], c: 'window' }], axis: 'x' },
    { name: 'windowF', box: [2, 0.5, 0.06], at: [0, 2.05, 0.92], c: 'window' },
    { name: 'funnel', cyl: [0.8, 1.2, 0.8], at: [0, 3.36, -1.2], c: 'funnel', seg: 8 },
    { name: 'funnelBand', cyl: [0.84, 0.24, 0.84], at: [0, 3.5, -1.2], c: 'band', seg: 8 },
  ],
});

export const waterCup = model({
  id: 'water-cup', about: 'A paper cup of water, held out on a little stand', tags: ['prop', 'item'],
  palette: { paper: 'white', water: 'sky', stand: 'slate' },
  parts: [
    { name: 'stand', cyl: [0.07, 0.6, 0.07], at: [0, 0.3, 0], c: 'stand', seg: 6 },
    { name: 'cup', cyl: [0.36, 0.34, 0.36], at: [0, 0.76, 0], top: 1.3, c: 'paper', seg: 8 },
    { name: 'water', cyl: [0.32, 0.03, 0.32], at: [0, 0.94, 0], c: 'water', seg: 8 },
  ],
});

export const sprinkler = model({
  id: 'sprinkler', about: 'A brass lawn sprinkler with a spinning arm', tags: ['prop', 'hazard'],
  palette: { base: 'green', brass: 'sand', arm: 'orange' },
  parts: [
    { name: 'base', cyl: [0.5, 0.12, 0.5], at: [0, 0.06, 0], c: 'base', seg: 8 },
    { name: 'stem', cyl: [0.12, 0.4, 0.12], at: [0, 0.32, 0], c: 'brass', seg: 6 },
    { group: [{ name: 'armBar', box: [0.9, 0.08, 0.08], at: [0, 0, 0], c: 'arm' }], name: 'arm', pivot: true, at: [0, 0.54, 0] },
  ],
});

export const picnic = model({
  id: 'picnic', about: 'A picnic rug with a basket, directly in the way', tags: ['prop', 'hazard'],
  palette: { rug: 'red', check: 'white', basket: 'orange', lid: 'plum' },
  parts: [
    { name: 'rug', box: [1.6, 0.05, 1.3], at: [0, 0.025, 0], c: 'rug' },
    ...[-0.55, -0.15, 0.62].map((x) => ({ box: [0.18, 0.02, 1.26], at: [x, 0.06, 0], c: 'check' })),
    { name: 'basket', box: [0.6, 0.32, 0.42], at: [0.2, 0.22, -0.1], c: 'basket' },
    { name: 'lid', box: [0.64, 0.08, 0.46], at: [0.2, 0.41, -0.1], c: 'lid' },
  ],
});

/** Kevin. Staff. Two poses: wings as pivots. */
export const kevin = model({
  id: 'kevin', about: 'Kevin, a seagull. He has been with us eleven years.', tags: ['character'],
  palette: { body: 'white', wing: 'mist', tip: 'slate', beak: 'orange', eye: 'ink', leg: 'orange' },
  parts: [
    { name: 'body', ball: [0.34, 0.3, 0.56], at: [0, 0.3, 0], c: 'body', seg: 8 },
    { name: 'head', ball: [0.24, 0.24, 0.24], at: [0, 0.48, 0.24], c: 'body', seg: 8 },
    { name: 'beak', box: [0.08, 0.07, 0.16], at: [0, 0.46, 0.42], c: 'beak' },
    { mirror: [{ name: 'eye', box: [0.06, 0.06, 0.06], at: [0.1, 0.52, 0.28], c: 'eye' }], axis: 'x' },
    { name: 'tail', box: [0.2, 0.06, 0.24], at: [0, 0.34, -0.36], rot: [-14, 0, 0], c: 'tip' },
    { mirror: [{ name: 'leg', box: [0.06, 0.16, 0.06], at: [0.08, 0.08, 0], c: 'leg' }], axis: 'x' },
    { group: [{ box: [0.5, 0.06, 0.26], at: [0.25, 0, 0], c: 'wing' }, { box: [0.2, 0.05, 0.2], at: [0.58, 0.004, 0], c: 'tip' }], name: 'wingR', pivot: true, at: [0.16, 0.36, 0] },
    { group: [{ box: [0.5, 0.06, 0.26], at: [-0.25, 0, 0], c: 'wing' }, { box: [0.2, 0.05, 0.2], at: [-0.58, 0.004, 0], c: 'tip' }], name: 'wingL', pivot: true, at: [-0.16, 0.36, 0] },
  ],
});

export const dais = model({
  id: 'dais', about: 'A small round white dais for an instructor who never needs one', tags: ['prop'],
  palette: { top: 'white', side: 'mist', trim: 'cyan' },
  parts: [
    { name: 'side', cyl: [2.2, 0.3, 2.2], at: [0, 0.15, 0], c: 'side', seg: 12 },
    { name: 'top', cyl: [2, 0.06, 2], at: [0, 0.33, 0], c: 'top', seg: 12 },
    { name: 'trim', cyl: [2.26, 0.06, 2.26], at: [0, 0.03, 0], c: 'trim', seg: 12 },
  ],
});

export const rail = model({
  id: 'class-rail', about: 'A plain white rail for Kevin to sit on', tags: ['prop'],
  params: { len: [6, 2, 16] },
  palette: { rail: 'white', post: 'mist' },
  parts: (p) => [
    { name: 'bar', box: [p.len, 0.12, 0.12], at: [0, 1.05, 0], c: 'rail' },
    ...Array.from({ length: Math.max(2, Math.ceil(p.len / 2)) + 1 }, (_, i) => ({ box: [0.09, 1, 0.09], at: [(-p.len / 2 + 0.06) + (i * (p.len - 0.12)) / Math.max(2, Math.ceil(p.len / 2)), 0.5, 0], c: 'post' })),
  ],
});

export const giantDumbbell = model({
  id: 'giant-dumbbell', about: 'A rack-sized dumbbell for the Rep Shed floor', tags: ['prop'],
  palette: { plate: 'slate', bar: 'mist', rim: 'ink' },
  parts: [
    { name: 'bar', cyl: [0.2, 1.6, 0.2], at: [0, 0.4, 0], rot: [0, 0, 90], c: 'bar', seg: 8 },
    { mirror: [{ name: 'plate', cyl: [0.8, 0.3, 0.8], at: [0.62, 0.4, 0], rot: [0, 0, 90], c: 'plate', seg: 10 }, { name: 'cap', cyl: [0.5, 0.12, 0.5], at: [0.82, 0.4, 0], rot: [0, 0, 90], c: 'rim', seg: 8 }], axis: 'x' },
  ],
});

export const towelRack = model({
  id: 'towel-rack', about: 'A rack of folded white towels', tags: ['prop'],
  palette: { wood: 'orange', shelf: 'sand', towel: 'white', towel2: 'teal' },
  parts: [
    { mirror: [{ box: [0.1, 1.4, 0.54], at: [0.72, 0.7, 0], c: 'wood' }], axis: 'x' },
    ...[0.3, 0.75, 1.2].map((y) => ({ box: [1.42, 0.07, 0.5], at: [0, y, 0], c: 'shelf' })),
    ...[0.42, 0.87].flatMap((y, k) => [-0.4, 0, 0.4].map((x, i) => ({ box: [0.32, 0.17, 0.4], at: [x, y, 0], c: (i + k) % 2 ? 'towel' : 'towel2' }))),
  ],
});

export const GAME_MODELS = [
  ounce, kettlebellVolcano, foamRollerHill, dumbbellBridge, medicineBall, pavilion, sweatJar, repShed, beatStage, pier, palm,
  yogaMat, stepPlatform, hoop, coconut, flipFlop, goldenPineapple, catapult, tray, vitaminCup, vitamin, slackAnchor, hammock,
  lockers, numbersBoard, judgePaddle, mobilityScooter, ferry, waterCup, sprinkler, picnic, kevin, dais, rail, giantDumbbell, towelRack,
];

export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...GAME_MODELS]);
