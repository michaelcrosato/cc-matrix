// Fourteen cars as data. Side-profile polygons of [z, y] extruded across the car (`slab`, rot [0, -90, 0]).
// Tail lamps differ on every car: it is the view you stare at. `node src/check.mjs --sheets src/game/models/cars.js` draws them.
import { model } from '../../pixel-engine.js';

export function carDef(o) {
  const w = o.width ?? 1.72, g = o.glassWidth ?? w - 0.26, tailZ = o.tailZ ?? -2.1, noseZ = o.noseZ ?? 2.1;
  const lamps = o.lamps ?? [{ w: 0.42, h: 0.12, x: w / 2 - 0.25, y: 0.72 }];
  // The tail's underside rises behind the rear wheels, so the tyres read from the chase camera.
  const [z0, y0] = o.body[0], len = o.length ?? 4.2;
  o = { ...o, body: [[z0, y0 + 0.13], [z0 + len * 0.17, y0], ...o.body.slice(1)] };
  const parts = [
    { name: 'body', slab: o.body, depth: w, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' },
    { name: 'glass', slab: o.cabin, depth: g, at: [0, 0, 0], rot: [0, -90, 0], c: 'glass' },
    ...(o.roof ? [{ name: 'roof', slab: o.roof, depth: g - 0.08, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' }] : []),
    { name: 'sill', box: [w + 0.02, 0.1, (o.length ?? 4.2) * 0.42], at: [0, 0.3, 0.02], c: 'dark' },
    { name: 'panel', box: [w - 0.1, 0.05 + (o.panelH ?? 0.16), 0.05], at: [0, o.panelY ?? (lamps[0].y ?? 0.72), tailZ + 0.015], c: 'dark' },
    ...lamps.flatMap((l) => (l.x === 0 ? [{ box: [l.w, l.h, 0.06], at: [0, l.y, tailZ - 0.01], c: 'lamp', glow: true }] : [{ mirror: [{ box: [l.w, l.h, 0.06], at: [l.x, l.y, tailZ - 0.01], c: 'lamp', glow: true }], axis: 'x' }])),
    { box: [0.46, 0.12, 0.05], at: [0, o.plateY ?? (lamps[0].y ?? 0.72) - 0.2, tailZ - 0.005], c: 'plate' },
    { mirror: [{ box: [o.headW ?? 0.34, o.headH ?? 0.1, 0.05], at: [w / 2 - (o.headW ?? 0.34) / 2 - 0.05, o.headY ?? 0.66, noseZ], c: 'head', glow: true }], axis: 'x' },
    ...(o.exhausts ?? []).map((ex) => ({ cyl: [ex.r ?? 0.1, 0.1, ex.r ?? 0.1], at: [ex.x, ex.y ?? 0.34, tailZ - 0.03], rot: [90, 0, 0], c: 'dark' })),
    ...(o.extra ?? []),
  ];
  return { def: model({ id: o.id, about: o.about, tags: ['vehicle', 'car'], palette: { paint: 'red', glass: 'navy', dark: 'ink', lamp: 'orange', head: 'sand', plate: 'white', trim: 'slate', accent: o.accent ?? 'sand', ...(o.palette ?? {}) }, parts, collider: 'none' }), body: o.body, width: w, length: o.length ?? 4.2, tailZ, noseZ, lamps, wing: o.wing ?? null, rally: !!o.rally, stockWing: !!o.stockWing, headY: o.headY ?? 0.66 };
}
const sillW = (w) => w;
export const CAR_MODELS = {
  // A tall upright box, and two thin lamps standing on end.
  pico: carDef({ id: 'car-pico', about: 'Upright kei city car, tall and short, vertical lamps', length: 3.2, width: 1.42, tailZ: -1.6, noseZ: 1.56, panelY: 0.56, panelH: 0.08, plateY: 0.5,
    lamps: [{ w: 0.14, h: 0.34, x: 0.56, y: 0.8 }], headY: 0.72, headW: 0.26, headH: 0.18,
    body: [[-1.58, 0.28], [1.54, 0.28], [1.6, 0.6], [1.38, 0.86], [0.9, 0.92], [-1.52, 1], [-1.6, 0.74]],
    cabin: [[-1.48, 0.94], [0.98, 0.9], [0.5, 1.5], [-1.38, 1.54]],
    roof: [[-1.42, 1.52], [0.54, 1.48], [0.46, 1.56], [-1.36, 1.6]],
    extra: [{ mirror: [{ box: [0.1, 0.06, 0.05], at: [0.62, 1.0, 0.62], c: 'dark' }], axis: 'x' }] }),
  // A hot hatch with two square lamps high up, and a roof spoiler.
  kite: carDef({ id: 'car-kite', about: 'Second-hand hot hatch with a roof spoiler', length: 3.9, width: 1.66, tailZ: -1.92, noseZ: 1.93, panelY: 0.66, panelH: 0.06,
    lamps: [{ w: 0.2, h: 0.2, x: 0.62, y: 0.86 }], headY: 0.68, exhausts: [{ x: 0.5 }],
    body: [[-1.92, 0.3], [1.93, 0.3], [1.95, 0.62], [1.55, 0.82], [0.72, 0.92], [-1.82, 0.98], [-1.92, 0.72]],
    cabin: [[-1.72, 0.92], [0.86, 0.9], [0.18, 1.36], [-1.3, 1.38]],
    roof: [[-1.42, 1.36], [0.24, 1.34], [0.14, 1.42], [-1.34, 1.44]],
    extra: [{ box: [1.2, 0.05, 0.3], at: [0, 1.4, -1.46], c: 'dark' }] }),
  // A rear-drive coupe with a long bonnet: wide flat lamps and a low boot spoiler.
  ginga: carDef({ id: 'car-ginga', about: 'Rear-drive coupe with a long bonnet', length: 4.4, width: 1.74, tailZ: -2.17, noseZ: 2.18, headY: 0.62,
    lamps: [{ w: 0.42, h: 0.12, x: 0.6, y: 0.78 }], exhausts: [{ x: 0.55 }],
    body: [[-2.17, 0.3], [2.18, 0.3], [2.2, 0.54], [1.78, 0.72], [0.5, 0.88], [-1.2, 0.92], [-2.12, 0.95], [-2.17, 0.7]],
    cabin: [[-1.28, 0.9], [0.62, 0.86], [-0.1, 1.27], [-0.8, 1.28]],
    roof: [[-0.9, 1.26], [-0.02, 1.25], [-0.14, 1.32], [-0.8, 1.33]],
    extra: [{ box: [1.5, 0.05, 0.3], at: [0, 1.06, -1.96], c: 'trim' }, { mirror: [{ box: [0.06, 0.12, 0.2], at: [0.6, 1.0, -1.96], c: 'trim' }], axis: 'x' }] }),
  // A tiny open two-seater: a windscreen, a roll hoop, two small square lamps wide apart.
  moth: carDef({ id: 'car-moth', about: 'Tiny open two-seater with a windscreen and a roll hoop', length: 3.75, width: 1.58, glassWidth: 1.3, tailZ: -1.87, noseZ: 1.86, headY: 0.58, headW: 0.2, panelY: 0.6, panelH: 0.05, palette: { glass: 'cyan', trim: 'mist' },
    lamps: [{ w: 0.14, h: 0.14, x: 0.64, y: 0.66 }], exhausts: [{ x: 0.42 }],
    body: [[-1.87, 0.28], [1.86, 0.28], [1.88, 0.48], [1.4, 0.62], [0.42, 0.76], [-0.5, 0.78], [-1.8, 0.8], [-1.87, 0.6]],
    cabin: [[0.42, 0.74], [0.36, 0.76], [0.1, 1.16], [0.16, 1.16]],
    extra: [{ box: [0.56, 0.3, 0.5], at: [-0.32, 0.86, -0.42], c: 'dark' }, { box: [0.06, 0.5, 0.06], at: [-0.55, 1.02, -0.86], c: 'trim' }, { box: [0.06, 0.5, 0.06], at: [0.55, 1.02, -0.86], c: 'trim' }, { box: [1.16, 0.06, 0.06], at: [0, 1.26, -0.86], c: 'trim' }] }),
  // A rally-bred four-door: round lamps as stacked pairs, a big rear wing on two struts, a bonnet scoop.
  ryu: carDef({ id: 'car-ryu', about: 'Turbo four-wheel-drive sedan with a tall rear wing', length: 4.35, width: 1.74, tailZ: -2.18, noseZ: 2.15, headY: 0.68,
    lamps: [{ w: 0.2, h: 0.2, x: 0.66, y: 0.84 }, { w: 0.14, h: 0.14, x: 0.42, y: 0.84 }], exhausts: [{ x: -0.5, r: 0.14 }],
    body: [[-2.18, 0.3], [2.15, 0.3], [2.17, 0.6], [1.75, 0.76], [0.8, 0.88], [-1.55, 0.94], [-2.15, 0.98], [-2.18, 0.72]],
    cabin: [[-1.58, 0.92], [0.88, 0.86], [0.2, 1.34], [-1.1, 1.36]],
    roof: [[-1.18, 1.34], [0.26, 1.32], [0.14, 1.4], [-1.1, 1.42]],
    extra: [{ box: [0.5, 0.08, 0.34], at: [0, 0.9, 1.2], c: 'dark' }, { box: [1.56, 0.05, 0.28], at: [0, 1.34, -2.0], c: 'paint' }, { mirror: [{ box: [0.06, 0.34, 0.14], at: [0.62, 1.14, -1.98], c: 'dark' }], axis: 'x' }] }),
  // Long bonnet, short tail: a full-width lamp bar and twin pipes.
  longhorn: carDef({ id: 'car-longhorn', about: 'Large American fastback with a long bonnet and a lamp bar', length: 4.75, width: 1.82, tailZ: -2.36, noseZ: 2.38, headY: 0.66, headW: 0.26, headH: 0.16, panelH: 0.14, palette: { trim: 'mist' },
    lamps: [{ w: 1.5, h: 0.12, x: 0, y: 0.76 }], exhausts: [{ x: 0.55, r: 0.12 }, { x: -0.55, r: 0.12 }],
    body: [[-2.36, 0.32], [2.38, 0.32], [2.4, 0.72], [2.1, 0.8], [0.5, 0.88], [-1.0, 0.94], [-2.3, 0.92], [-2.36, 0.62]],
    cabin: [[-1.9, 0.92], [0.5, 0.86], [-0.28, 1.26], [-0.86, 1.28]],
    roof: [[-1.0, 1.26], [-0.2, 1.25], [-0.32, 1.3], [-0.9, 1.32]],
    extra: [{ box: [0.74, 0.1, 0.9], at: [0, 0.92, 1.3], c: 'dark' }, { box: [1.86, 0.1, 0.08], at: [0, 0.46, -2.4], c: 'trim' }, { box: [1.86, 0.1, 0.08], at: [0, 0.46, 2.42], c: 'trim' }] }),
  // Three boxes: L-shaped lamps, a chrome line, a neat boot.
  brandt32: carDef({ id: 'car-brandt32', about: 'Three-box sport sedan with L-shaped lamps', length: 4.45, width: 1.78, tailZ: -2.22, noseZ: 2.2, headY: 0.68, headW: 0.4, palette: { trim: 'mist' },
    lamps: [{ w: 0.46, h: 0.1, x: 0.62, y: 0.86 }, { w: 0.16, h: 0.2, x: 0.77, y: 0.74 }], exhausts: [{ x: 0.6 }, { x: 0.42 }],
    body: [[-2.22, 0.3], [2.2, 0.3], [2.22, 0.62], [1.72, 0.82], [0.95, 0.9], [-1.12, 0.94], [-1.28, 1.0], [-2.16, 1.0], [-2.22, 0.74]],
    cabin: [[-1.32, 0.96], [1.0, 0.88], [0.28, 1.36], [-0.88, 1.38]],
    roof: [[-0.96, 1.36], [0.34, 1.34], [0.24, 1.42], [-0.9, 1.44]],
    extra: [{ box: [1.8, 0.04, 2.7], at: [0, 0.8, -0.1], c: 'trim' }] }),
  // A sloped tail with the engine bump, and a slim strip across: the shape everyone knows is a Heck.
  heck: carDef({ id: 'car-heck', about: 'Rear-engined sports coupe with a sloped tail and a lamp strip', length: 4.1, width: 1.78, tailZ: -2.05, noseZ: 2.03, headY: 0.74, headW: 0.26, headH: 0.18, panelH: 0.06, plateY: 0.56, panelY: 0.76,
    lamps: [{ w: 1.46, h: 0.07, x: 0, y: 0.78 }, { w: 0.2, h: 0.12, x: 0.72, y: 0.76 }], exhausts: [{ x: 0.3 }, { x: -0.3 }],
    body: [[-2.05, 0.3], [2.03, 0.3], [2.04, 0.56], [1.6, 0.78], [0.72, 0.86], [-0.2, 0.92], [-1.3, 0.98], [-1.98, 0.86], [-2.05, 0.62]],
    cabin: [[-1.46, 0.94], [0.76, 0.84], [0.1, 1.26], [-0.7, 1.28]],
    roof: [[-0.82, 1.26], [0.16, 1.25], [0.04, 1.32], [-0.74, 1.33]],
    extra: [{ box: [1.1, 0.05, 0.42], at: [0, 1.02, -1.62], c: 'paint' }, { box: [0.9, 0.05, 0.4], at: [0, 1.0, -1.2], c: 'dark' }] }),
  // A low wedge: slatted rear panel, four small square lamps in a row.
  libeccio: carDef({ id: 'car-libeccio', about: 'Mid-engined V8 wedge with a slatted tail', length: 4.3, width: 1.88, tailZ: -2.15, noseZ: 2.14, headY: 0.54, headW: 0.42, headH: 0.07, panelH: 0.22, panelY: 0.7,
    lamps: [{ w: 0.22, h: 0.14, x: 0.72, y: 0.74 }, { w: 0.22, h: 0.14, x: 0.44, y: 0.74 }], exhausts: [{ x: 0.3 }, { x: -0.3 }, { x: 0.46 }, { x: -0.46 }],
    body: [[-2.15, 0.3], [2.14, 0.3], [2.16, 0.46], [0.9, 0.72], [0.2, 0.8], [-1.2, 0.9], [-2.1, 0.92], [-2.15, 0.6]],
    cabin: [[-1.4, 0.88], [0.8, 0.72], [-0.16, 1.14], [-1.0, 1.16]],
    roof: [[-1.08, 1.14], [-0.1, 1.13], [-0.2, 1.2], [-1.02, 1.21]],
    extra: [{ box: [1.2, 0.04, 0.5], at: [0, 1.0, -1.62], c: 'dark' }, { mirror: [{ box: [0.08, 0.12, 0.7], at: [0.92, 0.62, -0.6], c: 'dark' }], axis: 'x' }] }),
  // The Kite, stripped: a roll cage in the glass, a splitter, a low wing, and a number on the door.
  kiteCup: carDef({ id: 'car-kitecup', about: 'Stripped one-make racing hatch with a cage and a wing', length: 3.95, width: 1.72, tailZ: -1.92, noseZ: 1.98, panelY: 0.66, panelH: 0.06, accent: 'white',
    lamps: [{ w: 0.2, h: 0.2, x: 0.64, y: 0.86 }, { w: 0.08, h: 0.2, x: 0, y: 1.2 }], headY: 0.66, exhausts: [{ x: 0.5, r: 0.14 }],
    body: [[-1.92, 0.26], [1.98, 0.26], [1.98, 0.6], [1.55, 0.8], [0.72, 0.9], [-1.82, 0.96], [-1.92, 0.7]],
    cabin: [[-1.72, 0.9], [0.86, 0.88], [0.18, 1.32], [-1.3, 1.34]],
    roof: [[-1.42, 1.32], [0.24, 1.3], [0.14, 1.38], [-1.34, 1.4]],
    extra: [{ box: [1.8, 0.06, 0.2], at: [0, 0.22, 2.0], c: 'dark' }, { box: [1.4, 0.05, 0.26], at: [0, 1.3, -1.94], c: 'dark' }, { mirror: [{ box: [0.06, 0.32, 0.12], at: [0.5, 1.12, -1.86], c: 'dark' }], axis: 'x' }, { mirror: [{ box: [0.04, 0.34, 0.46], at: [0.87, 0.62, 0], c: 'accent' }], axis: 'x' }] }),
  // Works gravel car: mud flaps, a roof vent, a light bar on the nose.
  ryuRally: carDef({ id: 'car-ryurally', about: 'Gravel rally sedan with mud flaps, a roof vent and spot lamps', length: 4.35, width: 1.76, tailZ: -2.18, noseZ: 2.15, headY: 0.68, rally: true, accent: 'white',
    lamps: [{ w: 0.2, h: 0.2, x: 0.66, y: 0.84 }, { w: 0.14, h: 0.14, x: 0.42, y: 0.84 }], exhausts: [{ x: -0.5, r: 0.14 }],
    body: [[-2.18, 0.36], [2.15, 0.36], [2.17, 0.66], [1.75, 0.82], [0.8, 0.94], [-1.55, 1.0], [-2.15, 1.04], [-2.18, 0.78]],
    cabin: [[-1.58, 0.98], [0.88, 0.92], [0.2, 1.4], [-1.1, 1.42]],
    roof: [[-1.18, 1.4], [0.26, 1.38], [0.14, 1.46], [-1.1, 1.48]],
    extra: [{ box: [0.5, 0.08, 0.34], at: [0, 0.96, 1.2], c: 'dark' }, { box: [1.6, 0.05, 0.3], at: [0, 1.4, -2.02], c: 'paint' }, { mirror: [{ box: [0.06, 0.36, 0.14], at: [0.62, 1.2, -2.0], c: 'dark' }], axis: 'x' }, { box: [0.4, 0.1, 0.3], at: [0, 1.5, -0.4], c: 'dark' }, { mirror: [{ box: [0.36, 0.34, 0.04], at: [0.66, 0.34, -1.92], c: 'dark' }, { box: [0.36, 0.34, 0.04], at: [0.66, 0.34, 1.0], c: 'dark' }], axis: 'x' }, { mirror: [{ box: [0.24, 0.2, 0.06], at: [0.34, 0.92, 2.1], c: 'head', glow: true }], axis: 'x' }, { mirror: [{ box: [0.04, 0.3, 0.6], at: [0.89, 0.72, 0], c: 'accent' }], axis: 'x' }] }),
  // The Ginga as the factory remembers it: lowered, wide fenders, a tall wing, four round lamps.
  works: carDef({ id: 'car-works', about: 'Factory GT racer based on the Ginga coupe', length: 4.5, width: 1.96, glassWidth: 1.4, tailZ: -2.25, noseZ: 2.26, headY: 0.54, accent: 'orange',
    lamps: [{ w: 0.2, h: 0.2, x: 0.76, y: 0.74 }, { w: 0.2, h: 0.2, x: 0.5, y: 0.74 }], exhausts: [{ x: 0.74, r: 0.14 }],
    body: [[-2.25, 0.24], [2.26, 0.24], [2.3, 0.46], [1.82, 0.64], [0.5, 0.82], [-1.2, 0.86], [-2.2, 0.88], [-2.25, 0.6]],
    cabin: [[-1.28, 0.84], [0.62, 0.8], [-0.1, 1.2], [-0.8, 1.21]],
    roof: [[-0.9, 1.19], [-0.02, 1.18], [-0.14, 1.25], [-0.8, 1.26]],
    extra: [{ box: [1.94, 0.06, 0.42], at: [0, 1.3, -2.1], c: 'dark' }, { mirror: [{ box: [0.08, 0.44, 0.34], at: [0.92, 1.1, -2.1], c: 'dark' }, { box: [0.08, 0.3, 0.16], at: [0.5, 1.02, -2.06], c: 'dark' }], axis: 'x' }, { box: [2.0, 0.05, 0.3], at: [0, 0.2, 2.2], c: 'dark' }, { box: [0.06, 0.04, 2.8], at: [0, 0.9, 0], c: 'accent' }, { mirror: [{ box: [0.04, 0.3, 0.5], at: [0.98, 0.56, -0.4], c: 'accent' }], axis: 'x' }] }),
  // Homologated: the Libeccio's wedge, longer, wider, on a wing. One long red bar and a central rain lamp.
  corsa: carDef({ id: 'car-corsa', about: 'Homologation racer based on the Libeccio', length: 4.55, width: 2.0, glassWidth: 1.3, tailZ: -2.28, noseZ: 2.27, headY: 0.48, headW: 0.5, headH: 0.06, panelH: 0.2, panelY: 0.66, accent: 'white',
    lamps: [{ w: 1.7, h: 0.08, x: 0, y: 0.72 }, { w: 0.14, h: 0.14, x: 0.0, y: 0.48 }], exhausts: [{ x: 0.5, r: 0.14 }, { x: -0.5, r: 0.14 }],
    body: [[-2.28, 0.24], [2.27, 0.24], [2.3, 0.4], [0.9, 0.68], [0.2, 0.76], [-1.2, 0.86], [-2.24, 0.86], [-2.28, 0.54]],
    cabin: [[-1.3, 0.84], [0.74, 0.68], [-0.2, 1.08], [-1.0, 1.1]],
    roof: [[-1.08, 1.08], [-0.14, 1.07], [-0.24, 1.14], [-1.02, 1.15]],
    extra: [{ box: [2.0, 0.06, 0.46], at: [0, 1.22, -2.24], c: 'accent' }, { mirror: [{ box: [0.08, 0.44, 0.4], at: [0.94, 1.04, -2.22], c: 'dark' }], axis: 'x' }, { box: [2.04, 0.05, 0.3], at: [0, 0.2, 2.22], c: 'dark' }, { box: [0.2, 0.3, 0.9], at: [0, 1.02, -1.2], c: 'paint' }, { box: [0.4, 0.04, 3.8], at: [0, 0.82, 0], c: 'accent' }] }),
  // A prototype: a narrow cockpit over wide fenders, a fin, a full-width wing, one lamp in each end plate and a bar.
  type9: carDef({ id: 'car-type9', about: 'Closed-cockpit endurance prototype with a fin and full-width wing', length: 4.6, width: 2.0, glassWidth: 0.92, tailZ: -2.3, noseZ: 2.3, headY: 0.44, headW: 0.4, headH: 0.06, panelH: 0.24, panelY: 0.6, palette: { glass: 'ink' }, accent: 'red',
    lamps: [{ w: 0.3, h: 0.1, x: 0.82, y: 0.72 }, { w: 0.5, h: 0.04, x: 0, y: 0.84 }], exhausts: [{ x: 0.22, y: 0.6, r: 0.14 }, { x: -0.22, y: 0.6, r: 0.14 }],
    body: [[-2.3, 0.2], [2.3, 0.2], [2.34, 0.32], [1.2, 0.56], [0.2, 0.62], [-1.4, 0.74], [-2.26, 0.8], [-2.3, 0.5]],
    cabin: [[-0.9, 0.7], [0.82, 0.56], [-0.04, 1.06], [-0.7, 1.08]],
    roof: [[-0.78, 1.06], [0, 1.05], [-0.1, 1.12], [-0.7, 1.13]],
    extra: [{ box: [0.06, 0.5, 1.5], at: [0, 1.08, -1.36], c: 'paint' }, { box: [2.0, 0.05, 0.42], at: [0, 1.16, -2.22], c: 'accent' }, { mirror: [{ box: [0.08, 0.5, 0.56], at: [0.96, 0.96, -2.14], c: 'dark' }, { box: [0.42, 0.14, 2.9], at: [0.8, 0.66, 0], c: 'paint' }], axis: 'x' }, { box: [2.06, 0.05, 0.34], at: [0, 0.16, 2.24], c: 'dark' }, { mirror: [{ box: [0.04, 0.3, 0.6], at: [1.0, 0.5, 0], c: 'accent' }], axis: 'x' }] }),
};
// Parts that appear on the model when bought.
export const lipSpoiler = model({ id: 'part-lip', about: 'A small lip spoiler', tags: ['vehicle', 'part'], palette: { paint: 'red' }, parts: [{ box: [1.3, 0.06, 0.2], at: [0, 0.03, 0], c: 'paint' }], collider: 'none' });
export const bigWing = model({ id: 'part-wing', about: 'A tall rear wing on two struts', tags: ['vehicle', 'part'], palette: { dark: 'ink', paint: 'red' }, parts: [{ box: [1.72, 0.06, 0.34], at: [0, 0.42, 0], c: 'paint' }, { mirror: [{ box: [0.06, 0.4, 0.14], at: [0.52, 0.2, 0], c: 'dark' }, { box: [0.06, 0.18, 0.4], at: [0.87, 0.46, 0], c: 'dark' }], axis: 'x' }], collider: 'none' });
export const ALL_CAR_DEFS = Object.fromEntries(Object.entries(CAR_MODELS).map(([k, v]) => [k, v.def]));
export const carDefs = Object.values(ALL_CAR_DEFS);
void sillW;
