// Car models as data: side-profile slabs extruded across the width (plan C2), plus wheels, lamps and parts built in carview.js.
import { model, buildModel, THREE, toonMaterial } from '../../pixel-engine.js';
const { Group, Mesh, CylinderGeometry, BoxGeometry } = THREE;

export function carDef(o) {
  const w = o.width ?? 1.72, g = o.glassWidth ?? w - 0.26, len = o.length ?? 4.2, tz = o.tailZ ?? -len / 2, nz = o.noseZ ?? len / 2, ly = o.lampY ?? 0.72;
  const parts = [
    { name: 'body', slab: o.body, depth: w, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' },
    { name: 'glass', slab: o.cabin, depth: g, at: [0, 0, 0], rot: [0, -90, 0], c: 'glass' },
    ...(o.roof ? [{ name: 'roof', slab: o.roof, depth: g - 0.08, at: [0, 0, 0], rot: [0, -90, 0], c: 'paint' }] : []),
    { name: 'sill', box: [w + 0.02, 0.12, len - 0.5], at: [0, 0.26, 0], c: 'dark' },
    ...tailParts(o.tail ?? 'bar', w, ly, tz),
    { box: [0.46, 0.12, 0.05], at: [0, ly - 0.2, tz], c: 'plate' },
    { mirror: [{ box: [0.34, 0.1, 0.05], at: [w / 2 - 0.21, o.headY ?? 0.66, nz], c: 'head', glow: true }], axis: 'x' },
    ...(o.extra ?? []),
  ];
  return model({ id: o.id, about: o.about, tags: ['vehicle', 'car'], palette: { paint: 'red', glass: 'navy', dark: 'ink', lamp: 'orange', head: 'sand', plate: 'white', trim: 'slate', ...(o.palette ?? {}) }, parts, collider: 'none' });
}
// The tail is what the player sees all race, so each style is distinct.
function tailParts(style, w, y, z) {
  const hw = w / 2;
  switch (style) {
    case 'round': return [{ mirror: [{ cyl: [0.2, 0.05, 0.2], at: [hw - 0.28, y, z], rot: [90, 0, 0], c: 'lamp', glow: true }], axis: 'x' }];
    case 'split': return [{ mirror: [{ box: [0.5, 0.1, 0.05], at: [hw - 0.34, y, z], c: 'lamp', glow: true }, { box: [0.2, 0.1, 0.05], at: [hw - 0.1, y - 0.14, z], c: 'lamp', glow: true }], axis: 'x' }];
    case 'slit': return [{ box: [w - 0.2, 0.07, 0.05], at: [0, y, z], c: 'lamp', glow: true }];
    case 'wide': return [{ box: [w - 0.14, 0.14, 0.05], at: [0, y, z], c: 'lamp', glow: true }, { mirror: [{ box: [0.12, 0.2, 0.05], at: [hw - 0.1, y - 0.04, z], c: 'lamp', glow: true }], axis: 'x' }];
    default: return [{ mirror: [{ box: [0.42, 0.12, 0.05], at: [hw - 0.25, y, z], c: 'lamp', glow: true }], axis: 'x' }];
  }
}
const wing = (z, y, w) => [{ box: [w, 0.05, 0.4], at: [0, y, z], c: 'trim' }, { mirror: [{ box: [0.06, 0.3, 0.3], at: [w / 2 - 0.2, y - 0.17, z], c: 'trim' }], axis: 'x' }];

export const BODIES = {
  box: carDef({ id: 'kit-box', about: 'Tall city car', length: 3.2, width: 1.45, tailZ: -1.6, noseZ: 1.62, lampY: 0.84, lampH: 0.18, headY: 0.68, tail: 'round',
    body: [[-1.6, 0.3], [1.6, 0.3], [1.62, 0.6], [1.2, 0.8], [0.6, 0.9], [-1.55, 0.95], [-1.6, 0.7]], cabin: [[-1.5, 0.9], [0.9, 0.9], [0.3, 1.55], [-1.4, 1.58]], roof: [[-1.3, 1.55], [0.3, 1.53], [0.22, 1.62], [-1.25, 1.64]] }),
  hatch: carDef({ id: 'kit-hatch', about: 'Second-hand hot hatch', length: 3.9, width: 1.66, tailZ: -1.92, noseZ: 1.93, lampY: 0.86, headY: 0.68, tail: 'bar',
    body: [[-1.92, 0.3], [1.93, 0.3], [1.95, 0.62], [1.55, 0.82], [0.72, 0.92], [-1.82, 0.98], [-1.92, 0.72]], cabin: [[-1.72, 0.92], [0.86, 0.9], [0.18, 1.36], [-1.3, 1.38]], roof: [[-1.42, 1.36], [0.24, 1.34], [0.14, 1.42], [-1.34, 1.44]],
    extra: [] }),
  coupe: carDef({ id: 'kit-coupe', about: 'Rear-drive coupe with a long bonnet', length: 4.4, width: 1.74, tailZ: -2.17, noseZ: 2.18, lampY: 0.78, headY: 0.62, tail: 'split',
    body: [[-2.17, 0.3], [2.18, 0.3], [2.2, 0.54], [1.78, 0.72], [0.5, 0.88], [-1.2, 0.92], [-2.12, 0.95], [-2.17, 0.7]], cabin: [[-1.28, 0.9], [0.62, 0.86], [-0.1, 1.27], [-0.8, 1.28]], roof: [[-0.9, 1.26], [-0.02, 1.25], [-0.14, 1.32], [-0.8, 1.33]],
    extra: [{ box: [1.5, 0.05, 0.3], at: [0, 1.06, -1.96], c: 'trim' }, { mirror: [{ box: [0.06, 0.12, 0.2], at: [0.6, 1.0, -1.96], c: 'trim' }], axis: 'x' }] }),
  roadster: carDef({ id: 'kit-roadster', about: 'Tiny open two-seater', length: 3.7, width: 1.6, tailZ: -1.85, noseZ: 1.87, lampY: 0.7, headY: 0.58, tail: 'round', glassWidth: 1.15,
    body: [[-1.85, 0.3], [1.85, 0.3], [1.87, 0.52], [1.3, 0.68], [0.4, 0.76], [-1.2, 0.84], [-1.83, 0.8], [-1.85, 0.6]], cabin: [[0.5, 0.76], [0.2, 1.18], [0.08, 1.18], [0.3, 0.76]],
    extra: [{ box: [1.1, 0.5, 0.1], at: [0, 1.0, -0.55], c: 'trim' }, { mirror: [{ box: [0.26, 0.2, 0.3], at: [0.3, 0.92, -0.2], c: 'dark' }], axis: 'x' }] }),
  rally: carDef({ id: 'kit-rally', about: 'Turbo four-wheel-drive sedan', length: 4.35, width: 1.78, tailZ: -2.17, noseZ: 2.18, lampY: 0.86, headY: 0.7, tail: 'wide', palette: { paint: 'navy' },
    body: [[-2.17, 0.32], [2.18, 0.32], [2.2, 0.64], [1.7, 0.84], [0.6, 0.96], [-1.8, 1.0], [-2.15, 0.96], [-2.17, 0.74]], cabin: [[-1.7, 0.95], [0.8, 0.94], [0.1, 1.42], [-1.3, 1.44]], roof: [[-1.4, 1.42], [0.16, 1.41], [0.08, 1.5], [-1.34, 1.5]],
    extra: [...wing(-2.1, 1.42, 1.6), { box: [0.5, 0.1, 0.6], at: [0, 1.52, 0.0], c: 'dark' }, { box: [0.8, 0.06, 0.7], at: [0, 1.0, 1.4], c: 'dark' }] }),
  muscle: carDef({ id: 'kit-muscle', about: 'Large American coupe', length: 4.9, width: 1.85, tailZ: -2.45, noseZ: 2.47, lampY: 0.8, headY: 0.7, tail: 'slit',
    body: [[-2.45, 0.3], [2.45, 0.3], [2.47, 0.58], [2.0, 0.78], [0.6, 0.92], [-1.6, 0.98], [-2.4, 0.92], [-2.45, 0.7]], cabin: [[-1.6, 0.95], [0.2, 0.92], [-0.2, 1.34], [-1.1, 1.36]], roof: [[-1.2, 1.34], [-0.1, 1.33], [-0.2, 1.42], [-1.15, 1.43]],
    extra: [{ box: [0.5, 0.12, 0.9], at: [0, 0.98, 1.2], c: 'dark' }] }),
  sedan: carDef({ id: 'kit-sedan', about: 'Four-door performance sedan', length: 4.75, width: 1.8, tailZ: -2.37, noseZ: 2.38, lampY: 0.88, headY: 0.7, tail: 'split',
    body: [[-2.37, 0.3], [2.38, 0.3], [2.4, 0.62], [1.9, 0.8], [0.7, 0.9], [-1.0, 0.98], [-2.3, 1.0], [-2.37, 0.76]], cabin: [[-1.5, 0.95], [0.9, 0.9], [0.3, 1.42], [-1.1, 1.44]], roof: [[-1.2, 1.42], [0.34, 1.41], [0.26, 1.5], [-1.14, 1.5]],
    extra: [{ box: [1.2, 0.04, 0.2], at: [0, 1.02, -2.2], c: 'trim' }] }),
  rr: carDef({ id: 'kit-rr', about: 'Rear-engined coupe', length: 4.2, width: 1.76, tailZ: -2.1, noseZ: 2.12, lampY: 0.7, headY: 0.64, tail: 'wide',
    body: [[-2.1, 0.3], [2.12, 0.3], [2.14, 0.55], [1.7, 0.7], [0.7, 0.86], [-1.2, 0.98], [-2.05, 0.82], [-2.1, 0.6]], cabin: [[-1.4, 0.95], [0.7, 0.86], [0.0, 1.32], [-0.9, 1.3]], roof: [[-1.0, 1.3], [0.04, 1.31], [-0.04, 1.38], [-0.95, 1.36]],
    extra: [{ box: [1.0, 0.1, 0.5], at: [0, 1.0, -1.7], c: 'dark' }] }),
  wedge: carDef({ id: 'kit-wedge', about: 'Low mid-engined wedge', length: 4.4, width: 1.9, tailZ: -2.2, noseZ: 2.22, lampY: 0.7, headY: 0.5, tail: 'round', glassWidth: 1.5,
    body: [[-2.2, 0.28], [2.22, 0.28], [2.24, 0.42], [1.4, 0.6], [0.3, 0.86], [-1.4, 0.96], [-2.15, 0.86], [-2.2, 0.56]], cabin: [[-0.9, 0.9], [0.8, 0.76], [0.1, 1.2], [-0.6, 1.22]],
    extra: [{ mirror: [{ box: [0.3, 0.2, 0.8], at: [0.9, 0.82, -0.8], c: 'dark' }], axis: 'x' }] }),
  proto: carDef({ id: 'kit-proto', about: 'Narrow-cockpit prototype with a full-width wing', length: 4.7, width: 1.95, tailZ: -2.35, noseZ: 2.37, lampY: 0.62, headY: 0.42, tail: 'wide', glassWidth: 0.85,
    body: [[-2.35, 0.28], [2.37, 0.28], [2.39, 0.4], [1.6, 0.55], [0.5, 0.7], [-1.2, 0.8], [-2.3, 0.7], [-2.35, 0.5]], cabin: [[-0.8, 0.7], [0.9, 0.62], [0.2, 1.12], [-0.6, 1.1]],
    extra: [{ box: [0.06, 0.45, 1.6], at: [0, 1.0, -1.3], c: 'paint' }, ...wing(-2.3, 1.2, 1.9), { box: [1.9, 0.05, 0.4], at: [0, 0.38, 2.3], c: 'trim' }] }),
};
// A tidy wrapper: build a mesh Group for a body kind with the paint recoloured.
export function buildBody(kind, paint) {
  const b = buildModel(BODIES[kind], { palette: { paint } });
  b.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return b;
}
export { Group, Mesh, CylinderGeometry, BoxGeometry, toonMaterial };
