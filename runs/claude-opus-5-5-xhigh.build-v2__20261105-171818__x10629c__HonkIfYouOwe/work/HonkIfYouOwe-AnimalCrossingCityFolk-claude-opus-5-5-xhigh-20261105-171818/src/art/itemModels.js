// Small things: tools in the hand, fish and bugs (parametric), fossils, cheese wheels.
import { model } from '../engine.js';

const B = (w, h, d, x, y, z, c, o = {}) => ({ box: [w, h, d], at: [x, y, z], c, ...o });
const BALL = (w, h, d, x, y, z, c, o = {}) => ({ ball: [w, h, d], at: [x, y, z], c, ...o });
const CONE = (w, h, d, x, y, z, c, o = {}) => ({ cone: [w, h, d], at: [x, y, z], c, ...o });
const CYL = (w, h, d, x, y, z, c, o = {}) => ({ cyl: [w, h, d], at: [x, y, z], c, ...o });

export const toolNet = model({ id: 'tool-net', about: 'A bug net', tags: ['tool'], floats: true, palette: { stick: 'orange', ring: 'mist', mesh: 'white' }, parts: [B(0.06, 1.2, 0.06, 0, 0.3, 0, 'stick'), { torus: [0.5, 0.05, 0.5], at: [0, 1.0, 0], rot: [90, 0, 0], c: 'ring' }, BALL(0.44, 0.44, 0.36, 0, 1.0, -0.14, 'mesh')] });
export const toolRod = model({ id: 'tool-rod', about: 'A fishing rod', tags: ['tool'], floats: true, palette: { stick: 'red', grip: 'night', reel: 'mist' }, parts: [B(0.05, 1.8, 0.05, 0, 0.6, 0, 'stick'), B(0.08, 0.34, 0.08, 0, -0.12, 0, 'grip'), BALL(0.14, 0.14, 0.14, 0.06, 0.1, 0, 'reel')] });
export const toolShovel = model({ id: 'tool-shovel', about: 'A shovel', tags: ['tool'], floats: true, palette: { stick: 'orange', blade: 'mist', grip: 'plum' }, parts: [B(0.06, 1.1, 0.06, 0, 0.3, 0, 'stick'), B(0.26, 0.06, 0.06, 0, 0.86, 0, 'grip'), B(0.3, 0.4, 0.05, 0, -0.34, 0, 'blade')] });
export const toolAxe = model({ id: 'tool-axe', about: 'An axe', tags: ['tool'], floats: true, palette: { stick: 'orange', blade: 'mist', edge: 'white' }, parts: [B(0.07, 1.0, 0.07, 0, 0.3, 0, 'stick'), B(0.28, 0.28, 0.06, 0.16, 0.7, 0, 'blade'), B(0.05, 0.3, 0.07, 0.3, 0.7, 0, 'edge')] });
export const toolCan = model({ id: 'tool-can', about: 'A watering can', tags: ['tool'], floats: true, palette: { can: 'sky', dark: 'navy' }, parts: [CYL(0.34, 0.34, 0.34, 0, 0.06, 0.1, 'can'), B(0.06, 0.06, 0.34, 0, 0.14, 0.4, 'can', { rot: [-30, 0, 0] }), B(0.16, 0.05, 0.05, 0, 0.26, 0.56, 'dark'), { torus: [0.24, 0.04, 0.24], at: [0, 0.3, -0.08], rot: [0, 90, 90], c: 'dark' }] });
export const toolSling = model({ id: 'tool-slingshot', about: 'A slingshot', tags: ['tool'], floats: true, palette: { wood: 'orange', band: 'red' }, parts: [B(0.07, 0.34, 0.07, 0, 0.04, 0, 'wood'), B(0.06, 0.28, 0.06, -0.09, 0.32, 0, 'wood', { rot: [0, 0, 20] }), B(0.06, 0.28, 0.06, 0.09, 0.32, 0, 'wood', { rot: [0, 0, -20] }), B(0.3, 0.03, 0.03, 0, 0.44, 0, 'band')] });
export const fishProp = model({ id: 'fish', about: 'A swimming fish, size param', tags: ['fish'], floats: true, palette: { body: 'sky', fin: 'navy', eye: 'ink', belly: 'white' }, params: { len: [0.6, 0.2, 2] }, parts: (p) => {
  const l = p.len;
  return [BALL(l * 0.35, l * 0.42, l, 0, 0, 0, 'body'), CONE(l * 0.04, l * 0.3, l * 0.4, 0, 0, -l * 0.58, 'fin', { rot: [-90, 0, 0] }), B(l * 0.04, l * 0.22, l * 0.3, 0, l * 0.24, 0, 'fin'), BALL(l * 0.26, l * 0.2, l * 0.6, 0, -l * 0.1, 0, 'belly'), B(l * 0.37, l * 0.08, l * 0.08, 0, l * 0.06, l * 0.28, 'eye')];
} });
export const bugProp = model({ id: 'bug', about: 'A beetle-ish bug', tags: ['bug'], floats: true, palette: { body: 'night', head: 'ink', leg: 'ink' }, params: { size: [0.3, 0.15, 0.8] }, parts: (p) => {
  const s = p.size;
  return [BALL(s, s * 0.6, s * 1.4, 0, s * 0.3, 0, 'body'), BALL(s * 0.6, s * 0.5, s * 0.5, 0, s * 0.3, s * 0.8, 'head'), { mirror: [B(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, 0, 'leg'), B(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, s * 0.4, 'leg'), B(s * 0.7, s * 0.08, s * 0.08, s * 0.5, s * 0.14, -s * 0.4, 'leg')], axis: 'x' }];
} });
export const winged = model({ id: 'winged', about: 'A flying insect with two flapping wings (pivots)', tags: ['bug'], floats: true, palette: { body: 'ink', wing: 'white', spot: 'orange' }, params: { size: [0.4, 0.2, 1] }, parts: (p) => {
  const s = p.size;
  return [B(s * 0.16, s * 0.16, s * 0.7, 0, 0, 0, 'body'),
    { group: [B(s * 0.8, s * 0.04, s * 0.8, s * 0.4, 0, 0, 'wing'), B(s * 0.3, s * 0.05, s * 0.3, s * 0.45, 0, 0, 'spot')], at: [0.02, 0, 0], pivot: true, name: 'WingL' },
    { group: [B(s * 0.8, s * 0.04, s * 0.8, -s * 0.4, 0, 0, 'wing'), B(s * 0.3, s * 0.05, s * 0.3, -s * 0.45, 0, 0, 'spot')], at: [-0.02, 0, 0], pivot: true, name: 'WingR' }];
} });
export const umbrellaProp = model({ id: 'umbrella-prop', about: 'An open umbrella', tags: ['item'], floats: true, palette: { a: 'blue', b: 'navy', stick: 'plum' }, parts: [B(0.05, 1.0, 0.05, 0, 0.4, 0, 'stick'), { cone: [1.1, 0.34, 1.1], at: [0, 1.02, 0], c: 'a', seg: 8 }, B(0.08, 0.1, 0.08, 0, 1.22, 0, 'b')] });
export const cheeseWheel = model({ id: 'cheese-wheel', about: 'A wheel of cheese, smelling faintly of commerce', tags: ['item'], palette: { a: 'sand', b: 'orange', c: 'orange' }, parts: [CYL(0.7, 0.3, 0.7, 0, 0.15, 0, 'a'), CYL(0.72, 0.06, 0.72, 0, 0.15, 0, 'b'), B(0.08, 0.02, 0.08, 0.1, 0.31, 0.12, 'c')] });
export const boneSkull = model({ id: 'fossil-skull', about: 'A big fossil skull', tags: ['fossil'], palette: { a: 'sand', b: 'plum' }, parts: [BALL(0.9, 0.56, 1.3, 0, 0.5, 0, 'a'), B(0.9, 0.2, 0.9, 0, 0.2, 0.26, 'a'), B(0.16, 0.16, 0.05, -0.24, 0.58, 0.6, 'b'), B(0.16, 0.16, 0.05, 0.24, 0.58, 0.6, 'b'), ...[-0.3, -0.1, 0.1, 0.3].map((x) => CONE(0.1, 0.18, 0.1, x, 0.1, 0.66, 'a', { rot: [180, 0, 0] }))] });
export const boneTorso = model({ id: 'fossil-torso', about: 'A fossil ribcage', tags: ['fossil'], palette: { a: 'sand' }, parts: [B(0.14, 0.14, 1.5, 0, 0.9, 0, 'a'), ...[-0.56, -0.28, 0, 0.28, 0.56].flatMap((z) => [{ torus: [0.74, 0.1, 0.74], at: [0, 0.62, z], rot: [90, 0, 0], c: 'a' }])] });
export const boneTail = model({ id: 'fossil-tail', about: 'A fossil tail', tags: ['fossil'], palette: { a: 'sand' }, parts: [0, 1, 2, 3, 4, 5].map((i) => B(0.26 - i * 0.03, 0.2 - i * 0.02, 0.28, 0, 0.84 - i * 0.12, -i * 0.3, 'a')) });
export const boneNeck = model({ id: 'fossil-neck', about: 'A long fossil neck', tags: ['fossil'], palette: { a: 'sand' }, parts: [0, 1, 2, 3, 4].map((i) => B(0.22, 0.26, 0.26, 0, 0.5 + i * 0.32, 0.5 + i * 0.1 - 0.5, 'a')) });
export const boneSmall = model({ id: 'fossil-small', about: 'A small fossil on a stone', tags: ['fossil'], palette: { a: 'sand', b: 'plum', c: 'slate' }, parts: [B(0.6, 0.12, 0.5, 0, 0.06, 0, 'c'), { torus: [0.36, 0.1, 0.36], at: [0, 0.18, 0], c: 'a' }, BALL(0.14, 0.1, 0.14, 0, 0.18, 0, 'b')] });
export const ITEM_MODELS = [umbrellaProp, toolNet, toolRod, toolShovel, toolAxe, toolCan, toolSling, fishProp, bugProp, winged, cheeseWheel, boneSkull, boneTorso, boneTail, boneNeck, boneSmall];
