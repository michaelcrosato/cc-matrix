// Every model the island needs, as data. Check with: node check.mjs --sheets src/art/models.js
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
export const kettlebellVolcano = model({ id: 'kettlebell-volcano', about: 'A dormant volcano shaped like a giant kettlebell, glowing at the top', tags: ['scenery'], palette: { iron: 'night', dark: 'ink', glow: 'orange', hot: 'sand' }, parts: [
  { ball: [12, 9, 12], at: [0, 4.5, 0], c: 'iron' },
  { name: 'handle', torus: [7, 1.2, 7], at: [0, 10.2, 0], rot: [90, 0, 0], c: 'dark' },
  { cyl: [3.4, 0.6, 3.4], at: [0, 8.9, 0], c: 'dark' },
  { cyl: [2.4, 0.2, 2.4], at: [0, 9.25, 0], c: 'glow', glow: true },
  { cyl: [1.2, 0.1, 1.2], at: [0, 9.38, 0], c: 'hot', glow: true },
] });
export const foamRoller = model({ id: 'foam-roller-hill', about: 'A hill that is a giant foam roller on its side, with ridged bands', tags: ['scenery'], palette: { foam: 'sky', band: 'blue', cap: 'white' }, parts: [
  { cyl: [5, 12, 5], at: [0, 2.5, 0], rot: [0, 0, 90], c: 'foam', seg: 14 },
  ...[-4.5, -2.25, 0, 2.25, 4.5].map((x) => ({ cyl: [5.2, 0.7, 5.2], at: [x, 2.6, 0], rot: [0, 0, 90], c: 'band', seg: 14 })),
  { mirror: [{ cyl: [3, 0.3, 3], at: [6.1, 2.5, 0], rot: [0, 0, 90], c: 'cap', seg: 14 }], axis: 'x' },
] });
export const dumbbellBridge = model({ id: 'dumbbell-bridge', about: 'A bridge whose span is the bar of a giant dumbbell', tags: ['scenery'], palette: { iron: 'slate', plate: 'night', deck: 'sand', rail: 'white' }, parts: [
  { cyl: [0.9, 8, 0.9], at: [0, 1, 0], rot: [0, 0, 90], c: 'iron', seg: 10 },
  { box: [8, 0.2, 1.6], at: [0, 1.5, 0], c: 'deck' },
  { mirror: [{ cyl: [3.4, 1, 3.4], at: [4.4, 1.7, 0], rot: [0, 0, 90], c: 'plate', seg: 10 }, { cyl: [2.6, 0.8, 2.6], at: [5.3, 1.3, 0], rot: [0, 0, 90], c: 'iron', seg: 10 }], axis: 'x' },
  { mirror: [{ box: [8, 0.12, 0.12], at: [0, 2.2, 0.75], c: 'rail' }], axis: 'z' },
  { mirror: [{ box: [0.12, 0.7, 0.12], at: [2.5, 1.85, 0.75], c: 'rail' }, { box: [0.12, 0.7, 0.12], at: [-2.5, 1.85, 0.75], c: 'rail' }], axis: 'z' },
] });
export const medBall = model({ id: 'med-ball', about: 'A medicine-ball boulder with a stitched band', tags: ['scenery'], palette: { ball: 'red', band: 'ink' }, parts: [
  { ball: [2, 2, 2], at: [0, 1, 0], c: 'ball' }, { cyl: [2.05, 0.25, 2.05], at: [0, 1, 0], c: 'band', seg: 12 },
] });
const pavilionParts = [
  { cyl: [8, 0.3, 8], at: [0, 0.15, 0], c: 'floor', seg: 10 },
  { cyl: [7.3, 0.16, 7.3], at: [0, 0.38, 0], c: 'trim', seg: 10 },
  ...[0, 60, 120, 180, 240, 300].map((a) => ({ cyl: [0.42, 3.4, 0.42], at: [Math.sin(a * Math.PI / 180) * 3.3, 2, Math.cos(a * Math.PI / 180) * 3.3], c: 'column', seg: 8 })),
  { cyl: [7.6, 0.3, 7.6], at: [0, 3.8, 0], c: 'trim', seg: 10 },
  { cone: [8.6, 2.6, 8.6], at: [0, 5.2, 0], c: 'roof', seg: 10 },
  { ball: [0.6, 0.6, 0.6], at: [0, 6.7, 0], c: 'trim' },
];
export const pavilion = model({ id: 'pavilion', about: 'An open round pavilion with columns and a cone roof', tags: ['building'], palette: { floor: 'white', trim: 'mist', column: 'white', roof: 'sky' }, collider: 'none', parts: pavilionParts });
export const repShed = model({ id: 'rep-shed', about: 'A gym shed with an orange roof and a big dumbbell sign', tags: ['building'], palette: { wall: 'white', trim: 'mist', roof: 'orange', door: 'night', iron: 'ink' }, parts: [
  { box: [8, 3.2, 5], at: [0, 1.6, -0.5], c: 'wall' },
  { box: [8.2, 0.3, 5.2], at: [0, 0.15, -0.5], c: 'trim' },
  { wedge: [8.8, 1.8, 5.8], at: [0, 4.1, -0.5], rot: [0, 180, 0], c: 'roof' },
  { box: [2.6, 2.3, 0.1], at: [0, 1.25, 2.02], c: 'door' },
  { box: [2.9, 0.2, 0.14], at: [0, 2.5, 2.02], c: 'trim' },
  { box: [1.8, 0.16, 0.16], at: [0, 3.0, 2.1], c: 'iron' },
  { mirror: [{ box: [0.26, 0.6, 0.26], at: [0.9, 3.0, 2.1], c: 'iron' }], axis: 'x' },
] });
export const beatStage = model({ id: 'beat-stage', about: 'A low beach stage with two tall speakers', tags: ['building'], palette: { deck: 'sand', trim: 'white', box: 'night', cone: 'cyan', ink: 'ink', sail: 'orange' }, parts: [
  { box: [8, 0.5, 5], at: [0, 0.25, 0], c: 'deck' },
  { box: [8.2, 0.14, 5.2], at: [0, 0.57, 0], c: 'trim' },
  { mirror: [{ box: [1.2, 2.6, 1.1], at: [3.4, 1.94, -1.6], c: 'box' }, { cyl: [0.8, 0.1, 0.8], at: [3.4, 2.5, -1], rot: [90, 0, 0], c: 'cone' }, { cyl: [0.55, 0.1, 0.55], at: [3.4, 1.5, -1], rot: [90, 0, 0], c: 'cone' }, { box: [0.14, 3.6, 0.14], at: [2.6, 2.4, -2.2], c: 'ink' }], axis: 'x' },
  { box: [5.4, 0.14, 2.6], at: [0, 4.2, -1.2], rot: [10, 0, 0], c: 'sail' },
] });
export const pier = model({ id: 'pier', about: 'A wooden pier on posts with white railings', tags: ['building'], palette: { deck: 'orange', post: 'plum', rail: 'white' }, params: { len: [10, 4, 30] }, parts: (p) => [
  { box: [3, 0.2, p.len], at: [0, 1.1, 0], c: 'deck' },
  ...Array.from({ length: Math.floor(p.len / 2.5) + 1 }, (_, i) => -p.len / 2 + i * 2.5).flatMap((z) => [{ box: [0.26, 1.0, 0.26], at: [1.3, 0.5, z], c: 'post' }, { box: [0.26, 1.0, 0.26], at: [-1.3, 0.5, z], c: 'post' }, { box: [0.1, 0.8, 0.1], at: [1.42, 1.6, z], c: 'rail' }, { box: [0.1, 0.8, 0.1], at: [-1.42, 1.6, z], c: 'rail' }]),
  { mirror: [{ box: [0.1, 0.1, p.len], at: [1.42, 2, 0], c: 'rail' }], axis: 'x' },
] });
export const palm = model({ id: 'palm', about: 'A palm tree with a curved trunk and drooping fronds', tags: ['plant'], palette: { trunk: 'orange', ring: 'plum', frond: 'green', frond2: 'lime', nut: 'ink' }, collider: 'cyl', parts: [
  { tube: [[0, 0.05, 0], [0.12, 1.2, 0], [0.3, 2.4, 0], [0.55, 3.6, 0]], r: 0.2, at: [0, 0, 0], c: 'trunk' },
  ...[0, 72, 144, 216, 288].flatMap((a, i) => [{ group: [{ box: [0.5, 0.1, 1.7], at: [0, 0.05, 0.85], rot: [14, 0, 0], c: i % 2 ? 'frond' : 'frond2' }, { box: [0.32, 0.1, 1.1], at: [0, -0.32, 1.95], rot: [32, 0, 0], c: i % 2 ? 'frond' : 'frond2' }], at: [0.55, 3.7, 0], rot: [0, a, 0] }]),
  { mirror: [{ ball: [0.26, 0.26, 0.26], at: [0.2, 3.5, 0.22], c: 'nut' }], axis: 'z' },
] });
export const yogaMat = model({ id: 'yoga-mat', about: 'A flat exercise mat with a stripe', tags: ['prop'], palette: { mat: 'sky', stripe: 'white' }, collider: 'none', parts: [{ box: [1.3, 0.06, 2.3], at: [0, 0.03, 0], c: 'mat' }, { box: [1.32, 0.07, 0.14], at: [0, 0.035, 0.9], c: 'stripe' }, { box: [1.32, 0.07, 0.14], at: [0, 0.035, -0.9], c: 'stripe' }] });
export const stepPlatform = model({ id: 'step-platform', about: 'A low aerobics step platform', tags: ['prop'], palette: { top: 'mist', side: 'slate', riser: 'orange' }, collider: 'none', parts: [{ box: [1.5, 0.12, 0.7], at: [0, 0.17, 0], c: 'top' }, { mirror: [{ box: [0.3, 0.12, 0.7], at: [0.5, 0.06, 0], c: 'riser' }], axis: 'x' }] });
export const coconut = model({ id: 'coconut', about: 'A coconut', tags: ['prop'], palette: { husk: 'plum', dot: 'ink' }, floats: true, collider: 'none', parts: [{ ball: [0.42, 0.42, 0.42], at: [0, 0.21, 0], c: 'husk' }, { mirror: [{ box: [0.06, 0.06, 0.04], at: [0.06, 0.28, 0.19], c: 'dot' }], axis: 'x' }] });
export const flipflop = model({ id: 'flip-flop', about: 'A single flip-flop', tags: ['prop'], palette: { sole: 'sky', strap: 'white' }, floats: true, collider: 'none', parts: [{ box: [0.32, 0.07, 0.62], at: [0, 0.035, 0], c: 'sole' }, { mirror: [{ box: [0.06, 0.1, 0.3], at: [0.08, 0.12, 0.04], rot: [0, 18, 0], c: 'strap' }], axis: 'x' }] });
export const pineapple = model({ id: 'golden-pineapple', about: 'A golden pineapple with a green crown', tags: ['prop'], palette: { gold: 'sand', crown: 'lime', stud: 'orange' }, floats: true, collider: 'none', parts: [{ ball: [0.42, 0.56, 0.42], at: [0, 0.28, 0], c: 'gold' }, { cone: [0.3, 0.32, 0.3], at: [0, 0.68, 0], c: 'crown' }, { mirror: [{ box: [0.06, 0.06, 0.04], at: [0.1, 0.3, 0.2], c: 'stud' }], axis: 'x' }] });
export const catapult = model({ id: 'catapult', about: 'A small wooden catapult on a beach', tags: ['prop'], palette: { wood: 'orange', dark: 'plum', cup: 'slate' }, parts: [
  { mirror: [{ box: [0.16, 0.16, 1.6], at: [0.55, 0.08, 0], c: 'dark' }, { box: [0.14, 1.0, 0.14], at: [0.55, 0.65, 0.1], c: 'wood' }], axis: 'x' },
  { box: [1.3, 0.14, 0.14], at: [0, 1.1, 0.1], c: 'wood' },
  { group: [{ box: [0.14, 0.14, 1.5], at: [0, 0, 0.6], c: 'wood' }, { box: [0.4, 0.14, 0.4], at: [0, 0.05, 1.35], c: 'cup' }], name: 'arm', pivot: true, at: [0, 0.8, -0.4] },
] });
export const trayModel = model({ id: 'tray', about: 'A lacquered tray with a rim', tags: ['prop'], palette: { lac: 'red', rim: 'plum' }, floats: true, collider: 'none', parts: [{ box: [8, 0.14, 7], at: [0, 0.07, 0], c: 'lac' }] });
export const vitamin = model({ id: 'vitamin', about: 'A round vitamin pill', tags: ['prop'], palette: { pill: 'red' }, floats: true, collider: 'none', parts: [{ ball: [0.36, 0.36, 0.36], at: [0, 0.18, 0], c: 'pill' }] });
export const anchor = model({ id: 'slack-anchor', about: 'A giant dumbbell standing on end, anchoring a slackline', tags: ['prop'], palette: { iron: 'slate', plate: 'night', band: 'orange' }, parts: [
  { cyl: [2.4, 0.7, 2.4], at: [0, 0.35, 0], c: 'plate' }, { cyl: [0.6, 3, 0.6], at: [0, 2.1, 0], c: 'iron' }, { cyl: [1.9, 0.6, 1.9], at: [0, 3.8, 0], c: 'plate' }, { box: [0.9, 0.2, 0.9], at: [0, 2.5, 0], c: 'band' },
] });
export const hammock = model({ id: 'hammock', about: 'A striped hammock slung between two posts', tags: ['prop'], palette: { cloth: 'sand', stripe: 'orange', post: 'plum' }, collider: 'none', parts: [
  { box: [2.4, 0.1, 0.9], at: [0, 0.8, 0], c: 'cloth' }, { mirror: [{ box: [0.8, 0.12, 0.9], at: [1.5, 1.05, 0], rot: [0, 0, 28], c: 'stripe' }], axis: 'x' }, { box: [0.5, 0.11, 0.92], at: [0, 0.8, 0], c: 'stripe' },
] });
export const lockers = model({ id: 'lockers', about: 'A row of gym lockers', tags: ['prop'], palette: { door: 'teal', frame: 'night', vent: 'ink', knob: 'sand' }, parts: [
  { box: [3.2, 2, 0.8], at: [0, 1, 0], c: 'frame' },
  ...[-1.05, 0, 1.05].flatMap((x) => [{ box: [0.92, 1.8, 0.06], at: [x, 1, 0.42], c: 'door' }, { box: [0.5, 0.08, 0.04], at: [x, 1.6, 0.46], c: 'vent' }, { box: [0.5, 0.08, 0.04], at: [x, 1.42, 0.46], c: 'vent' }, { box: [0.1, 0.14, 0.05], at: [x + 0.3, 0.95, 0.46], c: 'knob' }]),
] });
export const hallBoard = model({ id: 'hall-board', about: 'A tall scoreboard for numbers, on two posts', tags: ['prop'], palette: { board: 'night', frame: 'white', post: 'mist', ink: 'lime', ink2: 'cyan', red: 'red' }, parts: [
  { mirror: [{ box: [0.26, 3.8, 0.26], at: [2.2, 1.9, 0], c: 'post' }], axis: 'x' },
  { box: [5, 2.6, 0.2], at: [0, 2.8, 0.05], c: 'frame' },
  { box: [4.6, 2.2, 0.1], at: [0, 2.8, 0.18], c: 'board' },
  { box: [3.6, 0.1, 0.05], at: [0, 2.0, 0.25], c: 'ink2' },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ box: [0.3, 0.14, 0.05], at: [-1.6 + i * 0.64, 2.2 + [0.9, 0.65, 0.75, 0.45, 0.3, 0.2][i], 0.25], c: 'red' })),
] });
export const paddle = model({ id: 'judge-paddle', about: 'A judge\'s score paddle', tags: ['prop'], palette: { face: 'white', stick: 'orange' }, floats: true, collider: 'none', parts: [{ box: [0.5, 0.5, 0.06], at: [0, 0.55, 0], c: 'face' }, { box: [0.08, 0.4, 0.06], at: [0, 0.2, 0], c: 'stick' }] });
export const scooter = model({ id: 'mobility-scooter', about: 'A white mobility scooter with a small basket', tags: ['vehicle'], palette: { body: 'white', seat: 'cyan', wheel: 'ink', trim: 'mist', flag: 'orange' }, collider: 'none', parts: [
  { box: [0.7, 0.25, 1.5], at: [0, 0.3, 0], c: 'body' },
  { mirror: [{ cyl: [0.14, 0.3, 0.3], at: [0.38, 0.15, 0.55], rot: [0, 0, 90], c: 'wheel' }, { cyl: [0.14, 0.3, 0.3], at: [0.38, 0.15, -0.55], rot: [0, 0, 90], c: 'wheel' }], axis: 'x' },
  { box: [0.6, 0.14, 0.55], at: [0, 0.68, -0.3], c: 'seat' }, { box: [0.6, 0.6, 0.12], at: [0, 1.02, -0.62], c: 'seat' }, { box: [0.14, 0.3, 0.14], at: [0, 0.54, -0.3], c: 'trim' },
  { box: [0.1, 0.8, 0.1], at: [0, 0.75, 0.58], rot: [-12, 0, 0], c: 'trim' }, { box: [0.6, 0.08, 0.1], at: [0, 1.14, 0.5], c: 'trim' }, { box: [0.46, 0.2, 0.3], at: [0, 0.98, 0.72], c: 'trim' },
  { box: [0.06, 1.2, 0.06], at: [0.26, 1.0, -0.62], c: 'trim' }, { box: [0.3, 0.2, 0.04], at: [0.41, 1.5, -0.62], c: 'flag' },
] });
export const ferry = model({ id: 'ferry', about: 'A small white ferry with a blue stripe and funnel', tags: ['vehicle'], palette: { hull: 'white', stripe: 'blue', deck: 'mist', cabin: 'white', window: 'navy', funnel: 'orange', top: 'ink' }, floats: true, collider: 'none', parts: [
  { box: [3.2, 1.2, 8], at: [0, 0.6, 0], c: 'hull' }, { box: [3.24, 0.26, 8.04], at: [0, 0.75, 0], c: 'stripe' }, { wedge: [3.2, 1.2, 1.8], at: [0, 0.6, 4.9], rot: [0, 180, 0], c: 'hull' },
  { box: [3, 0.14, 7.8], at: [0, 1.25, 0], c: 'deck' }, { box: [2.2, 1.4, 3.2], at: [0, 2, -1], c: 'cabin' }, { box: [2.24, 0.4, 2.8], at: [0, 2.2, -1], c: 'window' }, { cyl: [0.7, 1.1, 0.7], at: [0, 3.2, -1.6], c: 'funnel' }, { cyl: [0.74, 0.2, 0.74], at: [0, 3.8, -1.6], c: 'top' },
] });
export const waterCup = model({ id: 'water-cup', about: 'A paper cup of water', tags: ['prop'], palette: { cup: 'white', water: 'sky' }, collider: 'none', parts: [{ cyl: [0.26, 0.34, 0.26], top: 1.3, at: [0, 0.17, 0], c: 'cup' }, { cyl: [0.28, 0.04, 0.28], at: [0, 0.33, 0], c: 'water' }] });
export const sprinkler = model({ id: 'sprinkler', about: 'A garden sprinkler on a stalk', tags: ['prop'], palette: { base: 'slate', head: 'lime', jet: 'sky' }, collider: 'none', parts: [{ cyl: [0.5, 0.14, 0.5], at: [0, 0.07, 0], c: 'base' }, { box: [0.1, 0.44, 0.1], at: [0, 0.34, 0], c: 'base' }, { box: [0.6, 0.12, 0.12], at: [0, 0.6, 0], c: 'head' }] });
export const picnic = model({ id: 'picnic', about: 'A picnic blanket with a basket', tags: ['prop'], palette: { rug: 'red', check: 'white', basket: 'orange' }, collider: 'none', parts: [{ box: [1.8, 0.05, 1.5], at: [0, 0.03, 0], c: 'rug' }, { box: [1.82, 0.06, 0.26], at: [0, 0.03, 0.3], c: 'check' }, { box: [1.82, 0.06, 0.26], at: [0, 0.03, -0.35], c: 'check' }, { box: [0.6, 0.4, 0.4], at: [0.3, 0.26, 0], c: 'basket' }] });
export const kevin = model({ id: 'kevin', about: 'Kevin, a seagull with a judgmental eye and a two-pose flap', tags: ['character'], palette: { body: 'white', wing: 'mist', beak: 'orange', feet: 'orange', eye: 'ink' }, floats: true, collider: 'none', parts: [
  { ball: [0.34, 0.32, 0.56], at: [0, 0.3, 0], c: 'body' }, { ball: [0.24, 0.24, 0.24], at: [0, 0.52, 0.2], c: 'body' }, { cone: [0.1, 0.18, 0.1], at: [0, 0.5, 0.38], rot: [90, 0, 0], c: 'beak' },
  { mirror: [{ box: [0.05, 0.05, 0.03], at: [0.1, 0.56, 0.3], c: 'eye' }, { box: [0.07, 0.16, 0.07], at: [0.08, 0.08, 0], c: 'feet' }], axis: 'x' },
  { group: [{ box: [0.5, 0.06, 0.26], at: [0.25, 0, 0], c: 'wing' }], name: 'wingL', pivot: true, at: [0.15, 0.36, -0.02] },
  { group: [{ box: [0.5, 0.06, 0.26], at: [-0.25, 0, 0], c: 'wing' }], name: 'wingR', pivot: true, at: [-0.15, 0.36, -0.02] },
] });
export const sweatJar = model({ id: 'sweat-jar', about: 'A huge glass jar on a plinth, with a lid and a label', tags: ['prop'], palette: { glass: 'white', plinth: 'mist', lid: 'teal', label: 'sand' }, parts: [
  { cyl: [2.4, 0.3, 2.4], at: [0, 0.15, 0], c: 'plinth', seg: 12 },
  { lathe: [[0.85, 0], [0.95, 0.1], [0.95, 2.1], [0.75, 2.4], [0.75, 2.55]], at: [0, 0.3, 0], seg: 12, c: 'glass' },
  { cyl: [1.7, 0.26, 1.7], at: [0, 2.95, 0], c: 'lid', seg: 12 },
  { box: [1.1, 0.5, 0.06], at: [0, 1.2, 0.95], c: 'label' },
] });
export const judgeTable = model({ id: 'judge-table', about: 'A small judges\' table on the pier', tags: ['prop'], palette: { top: 'white', leg: 'slate' }, parts: [{ box: [3.4, 0.14, 0.9], at: [0, 0.76, 0], c: 'top' }, { mirror: [{ box: [0.14, 0.7, 0.14], at: [1.5, 0.35, 0.3], c: 'leg' }, { box: [0.14, 0.7, 0.14], at: [1.5, 0.35, -0.3], c: 'leg' }], axis: 'x' }] });
export const gate = model({ id: 'jog-gate', about: 'A gate arch over the jogging path, with a pennant', tags: ['prop'], palette: { post: 'white', arch: 'orange', band: 'mist' }, collider: 'none', parts: [{ mirror: [{ box: [0.4, 3.2, 0.4], at: [2, 1.6, 0], c: 'post' }], axis: 'x' }, { box: [4.8, 0.6, 0.5], at: [0, 3.4, 0], c: 'arch' }, { box: [2.4, 0.16, 0.54], at: [0, 3.4, 0], c: 'band' }] });

export const MODEL_DEFS = [ounce, kettlebellVolcano, foamRoller, dumbbellBridge, medBall, pavilion, repShed, beatStage, pier, palm, yogaMat, stepPlatform, coconut, flipflop, pineapple, catapult, trayModel, vitamin, anchor, hammock, lockers, hallBoard, paddle, scooter, ferry, waterCup, sprinkler, picnic, kevin, sweatJar, judgeTable, gate];
export const MODELS = new ModelCatalog([...MODEL_LIBRARY.all(), ...MODEL_DEFS]);
