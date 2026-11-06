// First-person art: arms and every thing held in them, on a small custom rig. Each gun is its own rig instance.
import { model } from '../../pixel-engine.js';
export const GUN_RIG = { joints: ['Root', 'Weapon', 'Mag', 'Bolt', 'ArmR', 'HandR', 'ArmL', 'HandL'], root: 'Root', mirror: {}, soles: [], trace: [], limits: {}, fps: 30 };
export const TOOL_RIG = { joints: ['Root', 'ArmR', 'HandR', 'ArmL', 'HandL', 'Item', 'ItemL', 'Finger'], root: 'Root', mirror: {}, soles: [], trace: [], limits: {}, fps: 30 };
const PAL = { sleeve: 'sand', skin: 'orange', iron: 'night', iron2: 'ink', wood: 'red', wood2: 'plum', rust: 'red', rust2: 'plum', tape: 'mist', brass: 'sand', cuff: 'slate', accent: 'orange', glass: 'cyan', tank: 'green' };
const pivot = (name, at, group, rot) => ({ group, at, pivot: true, name, ...(rot ? { rot } : {}) });
const hand = (w = 0.1) => [{ box: [w, 0.09, 0.14], at: [0, 0, 0.02], c: 'skin' }, { box: [0.03, 0.03, 0.09], at: [w / 2 - 0.01, 0.03, 0.08], c: 'skin' }];
const armR = (hx, hy, hz) => pivot('ArmR', [hx, hy, hz], [{ box: [0.1, 0.1, 0.56], at: [-0.02, -0.04, -0.33], rot: [12, 8, 0], c: 'sleeve' }, { box: [0.11, 0.11, 0.05], at: [-0.01, -0.02, -0.08], c: 'cuff' }, pivot('HandR', [0, 0, 0], hand())]);
const armL = (hx, hy, hz) => pivot('ArmL', [hx, hy, hz], [{ box: [0.1, 0.1, 0.6], at: [0.05, -0.05, -0.35], rot: [10, -12, 0], c: 'sleeve' }, { box: [0.11, 0.11, 0.05], at: [0.01, -0.02, -0.08], c: 'cuff' }, pivot('HandL', [0, 0, 0], hand())]);
const rusty = (parts) => pivot('Rust', [0, 0, 0], parts);
const taped = (parts) => pivot('Tape', [0, 0, 0], parts);
const gunModel = (id, about, parts, { mag = [], magAt = [0, -0.06, 0.1], bolt = [], boltAt = [0, 0.04, 0], rust = [], tape = [], gripR = [0, -0.07, -0.08], gripL = [0, -0.04, 0.26], at = [-0.13, -0.17, -0.02] } = {}) => model({
  id: `vm-${id}`, about, tags: ['viewmodel'], floats: true, collider: 'none', palette: PAL,
  parts: [pivot('Root', [0, 0, 0], [pivot('Weapon', at, [...parts, pivot('Mag', magAt, mag.length ? mag : [{ box: [0.01, 0.01, 0.01], at: [0, 0, 0], c: 'iron2' }]), pivot('Bolt', boltAt, bolt.length ? bolt : [{ box: [0.01, 0.01, 0.01], at: [0, 0, 0], c: 'iron2' }]), rusty(rust.length ? rust : [{ box: [0.01, 0.01, 0.01], at: [0, 0, 0], c: 'rust' }]), taped(tape.length ? tape : [{ box: [0.01, 0.01, 0.01], at: [0, 0, 0], c: 'tape' }]), armR(...gripR), armL(...gripL)])])],
});
const rustBar = (x, y, z, l) => ({ box: [0.052, 0.03, l], at: [x, y, z], c: 'rust' });
const tapeBand = (z, w = 0.07, h = 0.08) => ({ box: [w, h, 0.05], at: [0, 0, z], c: 'tape' });
export const vmTractor = gunModel('tractor', 'The Tractor rifle: every soldier has one, mostly rusted', [
  { box: [0.05, 0.08, 0.34], at: [0, 0, 0.04], c: 'iron' }, { box: [0.05, 0.05, 0.4], at: [0, 0.025, 0.4], c: 'iron2' }, { box: [0.06, 0.09, 0.22], at: [0, -0.01, 0.3], c: 'wood' },
  { box: [0.06, 0.1, 0.24], at: [0, -0.015, -0.24], c: 'wood' }, { box: [0.05, 0.13, 0.05], at: [0, -0.09, -0.08], rot: [20, 0, 0], c: 'wood2' }, { box: [0.02, 0.03, 0.02], at: [0, 0.07, 0.56], c: 'iron2' }, { box: [0.03, 0.02, 0.05], at: [0, 0.055, 0.0], c: 'iron2' },
], { mag: [{ box: [0.04, 0.17, 0.08], at: [0, -0.08, 0.02], rot: [-16, 0, 0], c: 'iron2' }], magAt: [0, -0.04, 0.1], bolt: [{ box: [0.03, 0.03, 0.08], at: [0.02, 0.0, 0], c: 'iron2' }], boltAt: [0.02, 0.045, 0.05], rust: [rustBar(0, 0.03, 0.07, 0.2), rustBar(0, -0.02, -0.04, 0.1), rustBar(0, 0.048, 0.42, 0.16)], tape: [tapeBand(0.3, 0.075, 0.1), tapeBand(0.16, 0.06, 0.1)] });
export const vmM38 = gunModel('m38', 'The service revolver: dependable', [
  { box: [0.04, 0.05, 0.22], at: [0, 0.02, 0.14], c: 'iron' }, { cyl: [0.08, 0.07, 0.08], at: [0, 0, 0.0], rot: [90, 0, 0], c: 'iron2' }, { box: [0.045, 0.14, 0.06], at: [0, -0.07, -0.08], rot: [24, 0, 0], c: 'wood' }, { box: [0.02, 0.02, 0.02], at: [0, 0.05, 0.24], c: 'iron2' },
], { at: [-0.12, -0.14, 0.04], gripR: [0, -0.07, -0.07], gripL: [0.03, -0.09, -0.02], rust: [rustBar(0, 0.03, 0.14, 0.14)], tape: [{ box: [0.05, 0.05, 0.07], at: [0, -0.06, -0.08], rot: [24, 0, 0], c: 'tape' }], mag: [{ box: [0.05, 0.05, 0.03], at: [0, 0, -0.04], c: 'brass' }], magAt: [0, 0, 0] });
export const vmFlare = gunModel('flare', 'A fat brass flare pistol', [
  { cyl: [0.08, 0.26, 0.08], at: [0, 0.01, 0.1], rot: [90, 0, 0], c: 'accent' }, { box: [0.05, 0.05, 0.08], at: [0, 0, -0.06], c: 'iron' }, { box: [0.045, 0.13, 0.06], at: [0, -0.07, -0.09], rot: [24, 0, 0], c: 'wood2' },
], { at: [-0.12, -0.14, 0.04], gripR: [0, -0.07, -0.08], gripL: [0.03, -0.09, -0.02], rust: [rustBar(0, 0.05, 0.1, 0.14)], mag: [{ cyl: [0.06, 0.1, 0.06], at: [0, 0, 0], rot: [90, 0, 0], c: 'brass' }], magAt: [0, 0.01, 0.1] });
export const vmMule = gunModel('mule', 'The Mule pump gun', [
  { box: [0.05, 0.08, 0.26], at: [0, 0, 0.02], c: 'iron' }, { cyl: [0.05, 0.56, 0.05], at: [0, 0.025, 0.42], rot: [90, 0, 0], c: 'iron2' }, { cyl: [0.04, 0.46, 0.04], at: [0, -0.03, 0.38], rot: [90, 0, 0], c: 'iron' }, { box: [0.06, 0.11, 0.26], at: [0, -0.02, -0.24], c: 'wood2' },
], { bolt: [{ box: [0.07, 0.07, 0.16], at: [0, 0, 0], c: 'wood' }], boltAt: [0, -0.035, 0.36], gripL: [0, -0.07, 0.36], mag: [{ box: [0.03, 0.03, 0.08], at: [0, 0, 0], c: 'wood' }], magAt: [0, -0.06, 0.05], rust: [rustBar(0, 0.03, 0.02, 0.2), rustBar(0, 0.05, 0.4, 0.2)], tape: [tapeBand(-0.12, 0.07, 0.12)] });
export const vmEmpire = gunModel('empire', 'The Old Empire bolt rifle with its long scope', [
  { box: [0.05, 0.07, 0.4], at: [0, 0, 0.02], c: 'wood' }, { box: [0.04, 0.04, 0.54], at: [0, 0.03, 0.46], c: 'iron2' }, { box: [0.06, 0.1, 0.3], at: [0, -0.02, -0.3], c: 'wood' }, { cyl: [0.07, 0.3, 0.07], at: [0, 0.12, 0.08], rot: [90, 0, 0], c: 'iron2' }, { box: [0.02, 0.05, 0.04], at: [0, 0.07, 0.0], c: 'iron' }, { box: [0.06, 0.06, 0.01], at: [0, 0.12, 0.235], c: 'glass' },
], { bolt: [{ box: [0.1, 0.025, 0.025], at: [0.04, 0, 0], c: 'iron' }, { box: [0.04, 0.04, 0.04], at: [0.1, 0, 0], c: 'iron2' }], boltAt: [0.02, 0.03, -0.08], mag: [{ box: [0.03, 0.03, 0.08], at: [0, 0, 0], c: 'brass' }], magAt: [0, 0.05, 0.05], gripL: [0, -0.04, 0.32], rust: [rustBar(0, 0.048, 0.5, 0.22), rustBar(0, 0.03, -0.06, 0.1)], tape: [tapeBand(0.3, 0.06, 0.08)] });
export const vmWeed = gunModel('weed', 'The Weed Burner: wand, hose and a tank at your hip', [
  { box: [0.06, 0.09, 0.3], at: [0, 0, 0.02], c: 'iron' }, { cyl: [0.05, 0.5, 0.05], at: [0, 0.02, 0.4], rot: [90, 0, 0], c: 'iron2' }, { cyl: [0.08, 0.1, 0.08], at: [0, 0.02, 0.68], rot: [90, 0, 0], c: 'accent' }, { box: [0.05, 0.13, 0.05], at: [0, -0.09, -0.06], rot: [20, 0, 0], c: 'wood2' }, { cyl: [0.16, 0.34, 0.16], at: [0.02, -0.22, -0.22], rot: [90, 0, 0], c: 'tank' }, { box: [0.04, 0.04, 0.3], at: [0.02, -0.12, -0.02], rot: [20, 0, 0], c: 'iron2' },
], { gripL: [0, -0.03, 0.34], mag: [{ box: [0.02, 0.05, 0.02], at: [0, 0, 0], c: 'accent', glow: true }], magAt: [0, 0.02, 0.73], rust: [rustBar(0, 0.05, 0.1, 0.14), { box: [0.17, 0.05, 0.1], at: [0.02, -0.17, -0.22], c: 'rust' }], tape: [tapeBand(0.28, 0.07, 0.07)] });
export const vmTube = gunModel('tube', 'The Long Tube rocket launcher, on the shoulder', [
  { cyl: [0.13, 1.0, 0.13], at: [0.02, 0.1, 0.16], rot: [90, 0, 0], c: 'tank' }, { box: [0.05, 0.14, 0.06], at: [0, -0.06, -0.06], rot: [20, 0, 0], c: 'iron' }, { box: [0.05, 0.14, 0.06], at: [0, -0.06, 0.26], rot: [10, 0, 0], c: 'iron' }, { cyl: [0.17, 0.08, 0.17], at: [0.02, 0.1, 0.66], rot: [90, 0, 0], c: 'iron2' }, { box: [0.02, 0.07, 0.05], at: [0.02, 0.2, 0.1], c: 'iron2' },
], { at: [-0.12, -0.2, 0.02], gripR: [0, -0.1, -0.06], gripL: [0, -0.1, 0.26], mag: [{ cone: [0.12, 0.24, 0.12], at: [0, 0, 0], rot: [90, 0, 0], c: 'accent' }], magAt: [0.02, 0.1, 0.7], rust: [{ box: [0.14, 0.03, 0.3], at: [0.02, 0.17, 0.3], c: 'rust' }], tape: [{ box: [0.15, 0.15, 0.06], at: [0.02, 0.1, 0.4], c: 'tape' }] });
export const vmCane = gunModel('cane', 'A cane knife, chipped along its edge', [
  { box: [0.03, 0.03, 0.14], at: [0, 0, -0.02], c: 'wood' }, { box: [0.012, 0.07, 0.46], at: [0, 0.015, 0.28], c: 'iron' }, { box: [0.014, 0.024, 0.46], at: [0, 0.055, 0.28], c: 'tape' },
], { at: [-0.14, -0.18, 0.06], gripR: [0, 0, -0.02], gripL: [0.2, -0.28, -0.08] });
export const GUN_VIEWMODELS = { tractor: vmTractor, m38: vmM38, flare: vmFlare, mule: vmMule, empire: vmEmpire, weed: vmWeed, tube: vmTube, cane: vmCane };
// The mounted gun has handles only, and the arms grip them.
export const vmMg = gunModel('mg', 'A mounted machine gun, seen from behind its spade grips', [
  { box: [0.1, 0.12, 0.5], at: [0, 0, 0.2], c: 'iron' }, { cyl: [0.06, 0.8, 0.06], at: [0, 0.01, 0.8], rot: [90, 0, 0], c: 'iron2' }, { box: [0.22, 0.04, 0.04], at: [0, 0, -0.07], c: 'iron2' }, { box: [0.13, 0.16, 0.24], at: [0.11, -0.06, 0.2], c: 'tank' }, { box: [0.02, 0.05, 0.02], at: [0, 0.09, 0.4], c: 'iron2' },
], { at: [0, -0.18, 0.0], gripR: [-0.1, 0, -0.08], gripL: [0.1, 0, -0.08] });

// ---------- Hand tools ----------
const item = (name, parts) => pivot(name, [0, 0, 0], parts);
const armToolR = pivot('ArmR', [-0.16, -0.22, 0.22], [{ box: [0.08, 0.08, 0.5], at: [-0.05, -0.17, -0.22], rot: [-38, 12, 0], c: 'sleeve' }, { box: [0.09, 0.09, 0.04], at: [-0.012, -0.03, -0.06], rot: [-38, 12, 0], c: 'cuff' }, pivot('HandR', [0, 0, 0], [...hand(), pivot('Item', [0, 0.01, 0.06], [
  { box: [0.005, 0.005, 0.005], at: [0, 0, 0], c: 'iron2' },
  item('tool-syrette', [{ cyl: [0.03, 0.14, 0.03], at: [0, 0.02, 0.06], rot: [90, 0, 0], c: 'tape' }, { box: [0.008, 0.008, 0.08], at: [0, 0.02, 0.17], c: 'iron' }, { box: [0.03, 0.03, 0.03], at: [0, 0.02, 0], c: 'tank' }]),
  item('tool-pliers', [{ box: [0.13, 0.024, 0.024], at: [0.07, 0.03, 0.03], rot: [0, 8, 0], c: 'wood' }, { box: [0.13, 0.024, 0.024], at: [0.07, 0.03, -0.01], rot: [0, -8, 0], c: 'wood' }, { box: [0.12, 0.03, 0.05], at: [0.19, 0.03, 0.01], c: 'tape' }]),
  item('tool-knife', [{ box: [0.1, 0.03, 0.03], at: [0.05, 0.03, 0.01], c: 'wood' }, { box: [0.2, 0.04, 0.014], at: [0.2, 0.035, 0.01], c: 'tape' }]),
  item('tool-lighter', [{ box: [0.08, 0.03, 0.03], at: [0.05, 0.03, 0.02], c: 'brass' }, { box: [0.04, 0.06, 0.03], at: [0.11, 0.06, 0.02], c: 'accent', glow: true }, { box: [0.02, 0.04, 0.02], at: [0.11, 0.1, 0.02], c: 'brass', glow: true }]),
  item('tool-wrench', [{ box: [0.03, 0.015, 0.22], at: [0, 0, 0.08], c: 'iron' }, { box: [0.06, 0.02, 0.05], at: [0, 0, 0.2], c: 'iron2' }]),
  item('tool-detonator', [{ box: [0.06, 0.09, 0.05], at: [0, 0.03, 0.03], c: 'iron' }, { box: [0.02, 0.03, 0.02], at: [0, 0.09, 0.03], c: 'accent' }, { box: [0.012, 0.1, 0.012], at: [0.02, 0.12, 0.03], c: 'iron2' }]),
  item('tool-bottle', [{ cyl: [0.07, 0.18, 0.07], at: [0, 0.07, 0.02], c: 'tank' }, { cyl: [0.03, 0.07, 0.03], at: [0, 0.19, 0.02], c: 'tank' }, { box: [0.02, 0.05, 0.02], at: [0, 0.25, 0.02], c: 'accent', glow: true }]),
  item('tool-charge', [{ box: [0.15, 0.09, 0.1], at: [0, 0.04, 0.05], c: 'brass' }, { box: [0.16, 0.02, 0.11], at: [0, 0.04, 0.05], c: 'iron2' }]),
  item('tool-tablet', [{ box: [0.022, 0.012, 0.022], at: [0, 0.03, 0.05], c: 'tape' }]),
  item('tool-revolver', [{ box: [0.04, 0.05, 0.22], at: [0, 0.03, 0.12], c: 'iron' }, { cyl: [0.08, 0.07, 0.08], at: [0, 0.01, 0.02], rot: [90, 0, 0], c: 'iron2' }]),
])])]);
const armToolL = pivot('ArmL', [0.16, -0.22, 0.22], [{ box: [0.08, 0.08, 0.5], at: [0.05, -0.17, -0.22], rot: [-38, -12, 0], c: 'sleeve' }, { box: [0.09, 0.09, 0.04], at: [0.012, -0.03, -0.06], rot: [-38, -12, 0], c: 'cuff' }, pivot('HandL', [0, 0, 0], [...hand(), pivot('Finger', [0.035, 0.035, 0.09], [{ box: [0.04, 0.04, 0.13], at: [0, 0, 0.065], c: 'skin' }, { box: [0.046, 0.046, 0.03], at: [0, 0, 0.03], c: 'rust' }]), pivot('ItemL', [0, 0.01, 0.06], [
  { box: [0.005, 0.005, 0.005], at: [0, 0, 0], c: 'iron2' },
  item('tool-tablets', [{ cyl: [0.06, 0.1, 0.06], at: [0, 0.05, 0.02], c: 'accent' }, { cyl: [0.065, 0.03, 0.065], at: [0, 0.11, 0.02], c: 'tape' }, { box: [0.062, 0.05, 0.062], at: [0, 0.05, 0.02], c: 'tape' }]),
  item('tool-tracker', [{ box: [0.08, 0.14, 0.03], at: [0, 0.07, 0.04], c: 'iron' }, { box: [0.05, 0.05, 0.01], at: [0, 0.1, 0.057], c: 'iron2' }, pivot('tracker-led', [0, 0.135, 0.057], [{ box: [0.022, 0.022, 0.012], at: [0, 0, 0], c: 'tank', glow: true }]), { box: [0.012, 0.09, 0.012], at: [0.03, 0.18, 0.04], c: 'iron2' }]),
  item('tool-monocular', [{ cyl: [0.06, 0.16, 0.06], at: [0, 0.03, 0.08], rot: [90, 0, 0], c: 'iron2' }, { cyl: [0.07, 0.03, 0.07], at: [0, 0.03, 0.17], rot: [90, 0, 0], c: 'iron' }]),
])])]);
export const vmTools = model({
  id: 'vm-tools', about: 'Bare arms and the small things they carry: syrette, pliers, knife, lighter, tablets, tracker', tags: ['viewmodel'], floats: true, collider: 'none', palette: PAL,
  parts: [pivot('Root', [0, 0, 0], [
    armToolR, armToolL,
    // Your own body, for field surgery. Hidden until a scene wants it.
    pivot('prop-forearm', [0.04, -0.26, 0.36], [{ box: [0.1, 0.09, 0.42], at: [0, 0, -0.04], rot: [0, -30, 0], c: 'skin' }, { box: [0.07, 0.02, 0.11], at: [0.02, 0.05, 0.02], c: 'rust' }, { box: [0.11, 0.1, 0.05], at: [0.1, 0, -0.2], rot: [0, -30, 0], c: 'cuff' }]),
    pivot('prop-thigh', [0.02, -0.664, 0.62], [{ box: [0.2, 0.17, 0.6], at: [0, 0, 0], rot: [-20, 0, 0], c: 'cuff' }, { box: [0.1, 0.02, 0.14], at: [0.02, 0.09, 0.02], rot: [-20, 0, 0], c: 'rust' }]),
    pivot('prop-burn', [0, -0.3, 0.38], [{ box: [0.1, 0.09, 0.42], at: [0, 0, 0], rot: [0, 25, 0], c: 'skin' }, { box: [0.08, 0.02, 0.14], at: [0, 0.05, 0.04], rot: [0, 25, 0], c: 'iron2' }]),
  ])],
});
// The wheel and dash, a separate object so it can be parented to the truck's seat.
export const vmDash = model({ id: 'vm-dash', about: 'A steering wheel, a dash, a small waypoint arrow', tags: ['viewmodel'], floats: true, collider: 'none', palette: { dash: 'night', wheel: 'ink', arrow: 'orange', hood: 'slate', skin: 'orange', sleeve: 'sand' },
  parts: [{ box: [1.6, 0.22, 0.5], at: [-0.42, -0.36, 0.58], c: 'dash' }, { box: [1.76, 0.1, 1.0], at: [-0.42, -0.44, 1.32], c: 'hood' }, { box: [0.06, 0.62, 0.06], at: [0.42, 0.02, 0.95], rot: [-14, 0, 0], c: 'dash' }, { box: [0.06, 0.62, 0.06], at: [-1.26, 0.02, 0.95], rot: [-14, 0, 0], c: 'dash' }, { box: [1.74, 0.07, 0.07], at: [-0.42, 0.42, 0.88], c: 'dash' },
    pivot('Wheel', [0, -0.27, 0.42], [{ torus: [0.36, 0.035, 0.36], at: [0, 0, 0], rot: [90, 0, 0], c: 'wheel' }, { box: [0.34, 0.03, 0.03], at: [0, 0, 0], c: 'wheel' }, { box: [0.03, 0.17, 0.03], at: [0, -0.09, 0], c: 'wheel' }]),
    pivot('Arrow', [-0.42, -0.23, 0.56], [{ box: [0.03, 0.02, 0.1], at: [0, 0, 0], c: 'arrow', glow: true }, { box: [0.08, 0.02, 0.03], at: [0, 0, 0.04], c: 'arrow', glow: true }])] });
export const VIEWMODELS = [...Object.values(GUN_VIEWMODELS), vmMg, vmTools, vmDash];
export const handsMap = model({ id: 'vm-maphands', about: 'Two hands holding the edges of a paper map', tags: ['viewmodel'], floats: true, collider: 'none', palette: PAL, parts: [{ mirror: [{ box: [0.08, 0.05, 0.13], at: [0.27, 0, 0.0], c: 'skin' }, { box: [0.08, 0.08, 0.5], at: [0.3, -0.07, -0.3], rot: [12, -6, 0], c: 'sleeve' }], axis: 'x' }] });
