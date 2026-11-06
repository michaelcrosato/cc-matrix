// Vehicles drive toward +Z. Wheels are separate so the engine can pose them.
import { model } from '../../pixel-engine.js';
const V = (id, about, tags, palette, parts) => model({ id, about, tags, palette, parts, collider: 'none', floats: true });
const cab = (c1, c2) => [
  { box: [1.9, 0.5, 4.2], at: [0, 0.2, 0], c: c1 }, { box: [1.7, 0.6, 1.5], at: [0, 0.75, 0.2], c: c1 }, { box: [1.5, 0.4, 0.06], at: [0, 0.78, 0.96], c: 'glass' },
  { box: [1.9, 0.5, 1.6], at: [0, 0.2, 1.4], c: c2 }, { box: [0.3, 0.1, 0.06], at: [-0.6, 0.3, 2.12], c: 'lamp', glow: true }, { box: [0.3, 0.1, 0.06], at: [0.6, 0.3, 2.12], c: 'lamp', glow: true },
  { box: [1.8, 0.2, 1.8], at: [0, 0.5, -1.2], c: c2 }, { box: [0.1, 0.4, 1.8], at: [-0.9, 0.7, -1.2], c: c1 }, { box: [0.1, 0.4, 1.8], at: [0.9, 0.7, -1.2], c: c1 }, { box: [1.8, 0.4, 0.1], at: [0, 0.7, -2.1], c: c1 },
];
export const wheel = V('wheel', 'Truck wheel', ['vehicle'], { tyre: 'night', hub: 'slate' }, [{ cyl: [0.84, 0.36, 0.84], rot: [0, 0, 90], at: [0, 0.42, 0], c: 'tyre', seg: 8 }, { cyl: [0.4, 0.4, 0.4], rot: [0, 0, 90], at: [0, 0.42, 0], c: 'hub', seg: 6 }]);
export const pickup = V('pickup', 'Battered pickup', ['vehicle'], { body: 'orange', body2: 'red', glass: 'cyan', lamp: 'sand' }, cab('body', 'body2'));
export const technical = V('technical', 'Pickup with a pintle machine gun', ['vehicle'], { body: 'sand', body2: 'slate', glass: 'cyan', lamp: 'sand', gun: 'night', shield: 'mist' },
  [...cab('body', 'body2'), { box: [0.12, 0.7, 0.12], at: [0, 1.0, -1.0], c: 'gun' }, { group: [{ box: [0.12, 0.12, 0.9], at: [0, 0, 0.4], c: 'gun' }, { box: [0.6, 0.5, 0.06], at: [0, 0, 0.9], c: 'shield' }], at: [0, 1.4, -1.0], pivot: true, name: 'Gun' }]);
export const cargo = V('cargo-truck', 'Cargo truck', ['vehicle'], { body: 'green', body2: 'slate', glass: 'cyan', lamp: 'sand', bed: 'plum' },
  [{ box: [2.2, 0.6, 6], at: [0, 0.3, -0.4], c: 'body2' }, { box: [2.0, 1.4, 1.6], at: [0, 1.2, 1.9], c: 'body' }, { box: [1.8, 0.5, 0.06], at: [0, 1.5, 2.72], c: 'glass' }, { box: [2.2, 1.6, 3.6], at: [0, 1.4, -1.2], c: 'bed' }, { box: [0.3, 0.1, 0.06], at: [-0.7, 0.5, 2.75], c: 'lamp', glow: true }, { box: [0.3, 0.1, 0.06], at: [0.7, 0.5, 2.75], c: 'lamp', glow: true }]);
export const tanker = V('tanker', 'Fuel tanker', ['vehicle'], { body: 'red', body2: 'slate', glass: 'cyan', lamp: 'sand', tank: 'mist' },
  [{ box: [2.2, 0.6, 6], at: [0, 0.3, -0.4], c: 'body2' }, { box: [2.0, 1.4, 1.6], at: [0, 1.2, 1.9], c: 'body' }, { box: [1.8, 0.5, 0.06], at: [0, 1.5, 2.72], c: 'glass' }, { cyl: [2.0, 3.6, 2.0], rot: [90, 0, 0], at: [0, 1.6, -1.2], c: 'tank', seg: 10 }, { box: [0.3, 0.1, 0.06], at: [-0.7, 0.5, 2.75], c: 'lamp', glow: true }, { box: [0.3, 0.1, 0.06], at: [0.7, 0.5, 2.75], c: 'lamp', glow: true }]);
export const wreck = V('wreck', 'Burnt vehicle shell', ['vehicle', 'burnt'], { shell: 'night', rust: 'plum' },
  [{ box: [1.9, 0.5, 4.2], at: [0, 0.35, 0], c: 'shell' }, { box: [1.6, 0.5, 1.4], at: [0, 0.85, 0.2], c: 'rust' }, { box: [0.2, 0.2, 0.2], at: [0.4, 0.2, 1.6], c: 'rust' }]);
export const loco = V('locomotive', 'Little diesel locomotive', ['rail'], { body: 'red', body2: 'night', glass: 'cyan', lamp: 'sand', trim: 'sand' },
  [{ box: [2.8, 1.0, 8], at: [0, 0.9, 0], c: 'body2' }, { box: [2.8, 1.6, 3], at: [0, 2.2, -2], c: 'body' }, { box: [2.4, 0.5, 0.06], at: [0, 2.6, -0.5], c: 'glass' }, { box: [2.4, 0.9, 3.8], at: [0, 1.85, 2], c: 'body' }, { box: [2.9, 0.12, 8.1], at: [0, 1.5, 0], c: 'trim' }, { box: [0.4, 0.2, 0.06], at: [-0.8, 1.2, 4.05], c: 'lamp', glow: true }, { box: [0.4, 0.2, 0.06], at: [0.8, 1.2, 4.05], c: 'lamp', glow: true }]);
export const flatcar = V('flatcar', 'Flatcar with a gun mount', ['rail'], { deck: 'plum', frame: 'night', mount: 'slate', gun: 'night' },
  [{ box: [2.8, 0.3, 9], at: [0, 0.9, 0], c: 'deck' }, { box: [2.4, 0.5, 8.6], at: [0, 0.6, 0], c: 'frame' }, { box: [0.3, 0.6, 0.3], at: [0, 1.4, 0], c: 'mount' }, { group: [{ box: [0.12, 0.12, 0.9], at: [0, 0, 0.45], c: 'gun' }], at: [0, 1.8, 0], pivot: true, name: 'Gun' }]);
export const boxcar = V('boxcar', 'Boxcar', ['rail'], { body: 'orange', frame: 'night', roof: 'slate' },
  [{ box: [2.8, 0.5, 9], at: [0, 0.6, 0], c: 'frame' }, { box: [2.6, 2.4, 8.4], at: [0, 2.0, 0], c: 'body' }, { box: [2.8, 0.2, 8.6], at: [0, 3.3, 0], c: 'roof' }]);
export const handcar = V('handcar', 'Rail handcar', ['rail'], { deck: 'plum', arm: 'slate' }, [{ box: [1.6, 0.2, 2.6], at: [0, 0.6, 0], c: 'deck' }, { box: [0.1, 0.8, 0.1], at: [0, 1.0, 0], c: 'arm' }, { box: [1.4, 0.1, 0.1], at: [0, 1.4, 0], c: 'arm' }]);
export const dashHud = V('dash', 'Dash and wheel seen from the driver seat', ['vehicle'], { dash: 'night', wheelC: 'slate', arrow: 'orange', skin: 'plum', sleeve: 'sand' },
  [{ box: [1.8, 0.3, 0.5], at: [0, -0.45, 0.6], c: 'dash' }, { group: [{ cyl: [0.5, 0.06, 0.5], rot: [70, 0, 0], at: [0, 0, 0], c: 'wheelC', seg: 10 }, { box: [0.1, 0.1, 0.1], at: [-0.22, 0, 0.08], c: 'skin' }, { box: [0.1, 0.1, 0.1], at: [0.22, 0, 0.08], c: 'skin' }, { box: [0.1, 0.1, 0.5], at: [-0.22, -0.15, -0.2], c: 'sleeve' }, { box: [0.1, 0.1, 0.5], at: [0.22, -0.15, -0.2], c: 'sleeve' }], at: [0, -0.3, 0.45], pivot: true, name: 'Wheel' },
    { group: [{ cone: [0.12, 0.2, 0.12], rot: [90, 0, 0], at: [0, 0, 0], c: 'arrow', glow: true }], at: [0.5, -0.32, 0.55], pivot: true, name: 'Arrow' }]);
export const VEHICLE_MODELS = [wheel, pickup, technical, cargo, tanker, wreck, loco, flatcar, boxcar, handcar, dashHud];
