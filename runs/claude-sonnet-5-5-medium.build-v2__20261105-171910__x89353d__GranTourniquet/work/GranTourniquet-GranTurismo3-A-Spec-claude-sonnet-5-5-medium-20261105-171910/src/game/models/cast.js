// The cast: the engine's hero model recoloured, plus new ClipDefs for the pit crew, marshal, examiner, dealer, mechanic, podium and crowd. Plan section 9, 11.
import { THREE, toonMaterial, PALETTE, HERO_MODEL, HERO_RIG, HERO_CLIPS, compileClips, setLookLayer } from '../../pixel-engine.js';
const base = HERO_CLIPS.find((c) => c.name === 'Idle').keys[0][1];
const pose = (o) => ({ ...base, ...o });
const loop = (name, frames, keys) => ({ name, frames, loop: true, keys: [...keys.map(([f, p]) => [f, pose(p), null]), [frames, pose(keys[0][1]), null]] });
const once = (name, frames, keys) => ({ name, frames, keys: keys.map(([f, p]) => [f, pose(p), null]) });
const kneel = { Pelvis: { r: [0, 0, 0], p: [0, -0.42, 0], s: 1 }, LegR: [-95, 0, 0], ShinR: [110, 0, 0], FootR: [-20, 0, 0], LegL: [-20, 0, 0], ShinL: [95, 0, 0], FootL: [-70, 0, 0] };
export const CAST_CLIPS = [
  loop('PitJack', 40, [[0, { ...kneel, Torso: [30, 0, 0], ArmR: [-75, 0, -8], ForearmR: [-30, 0, 0], ArmL: [-70, 0, 8], ForearmL: [-30, 0, 0] }], [20, { ...kneel, Torso: [42, 0, 0], ArmR: [-60, 0, -8], ForearmR: [-55, 0, 0], ArmL: [-58, 0, 8], ForearmL: [-55, 0, 0] }]]),
  once('PitWheelGun', 96, [[0, { Torso: [10, 0, 0], ArmR: [-40, 0, -10], ArmL: [-40, 0, 10] }], [16, { ...kneel, Torso: [25, 0, 0], ArmR: [-85, 0, -8], ForearmR: [-10, 0, 0], ArmL: [-80, 0, 8], ForearmL: [-10, 0, 0] }], [30, { ...kneel, Torso: [30, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-5, 0, 0], ArmL: [-90, 0, 8], ForearmL: [-5, 0, 0] }], [46, { ...kneel, Torso: [-5, 0, 0], ArmR: [-70, 0, -8], ForearmR: [-60, 0, 0], ArmL: [-70, 0, 8], ForearmL: [-60, 0, 0] }], [64, { ...kneel, Torso: [32, 0, 0], ArmR: [-90, 0, -8], ForearmR: [-5, 0, 0], ArmL: [-90, 0, 8], ForearmL: [-5, 0, 0] }], [80, { Torso: [8, 0, 0], ArmR: [-30, 0, -10], ArmL: [-30, 0, 10] }], [96, { Torso: [4, 0, 0] }]]),
  loop('PitFuel', 60, [[0, { Torso: [8, 0, 3], ArmR: [-55, 0, -12], ForearmR: [-40, 0, 0], ArmL: [-45, 0, 14], ForearmL: [-50, 0, 0], Head: [10, 0, 0] }], [30, { Torso: [10, 0, -3], ArmR: [-58, 0, -12], ForearmR: [-44, 0, 0], ArmL: [-48, 0, 14], ForearmL: [-52, 0, 0], Head: [12, 0, 0] }]]),
  loop('MarshalFlag', 36, [[0, { Torso: [0, 0, 4], ArmR: [-170, 0, -28], ForearmR: [-20, 0, 0], ArmL: [6, 0, 9] }], [18, { Torso: [0, 0, -4], ArmR: [-170, 0, 28], ForearmR: [-20, 0, 0], ArmL: [6, 0, 9] }]]),
  once('ExaminerClipboard', 90, [[0, { Torso: [4, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-70, 0, 0], Head: [18, 0, 0] }], [24, { Torso: [6, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-62, 0, -10], ForearmR: [-82, 0, 0], Head: [22, 0, 0] }], [44, { Torso: [2, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-70, 0, 0], Head: [-4, 0, 0] }], [58, { Torso: [2, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-70, 0, 0], Head: [8, 0, 0] }], [72, { Torso: [2, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-70, 0, 0], Head: [-3, 0, 0] }], [90, { Torso: [4, 0, 0], ArmL: [-70, 0, 20], ForearmL: [-95, 0, 0], ArmR: [-60, 0, -10], ForearmR: [-70, 0, 0], Head: [18, 0, 0] }]]),
  once('DealerPresent', 70, [[0, { Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] }], [20, { Torso: [8, 10, 0], ArmR: [-90, 40, -35], ForearmR: [-15, 0, 0], ArmL: [6, 0, 9], Head: [0, 15, 0] }], [50, { Torso: [8, 10, 0], ArmR: [-90, 50, -35], ForearmR: [-15, 0, 0], ArmL: [6, 0, 9], Head: [0, 15, 0] }], [70, { Torso: [2, 0, 0], ArmR: [6, 0, -9], ArmL: [6, 0, 9] }]]),
  loop('MechanicWipe', 48, [[0, { Torso: [6, 0, 0], ArmR: [-70, 0, -8], ForearmR: [-90, 0, 0], ArmL: [-65, 0, 8], ForearmL: [-95, 0, 0], Head: [10, 0, 0] }], [12, { Torso: [6, 0, 0], ArmR: [-74, 0, -4], ForearmR: [-100, 0, 0], ArmL: [-60, 0, 4], ForearmL: [-88, 0, 0], Head: [10, 6, 0] }], [24, { Torso: [6, 0, 0], ArmR: [-70, 0, -8], ForearmR: [-90, 0, 0], ArmL: [-65, 0, 8], ForearmL: [-95, 0, 0], Head: [10, 0, 0] }], [36, { Torso: [6, 0, 0], ArmR: [-66, 0, -12], ForearmR: [-84, 0, 0], ArmL: [-70, 0, 12], ForearmL: [-102, 0, 0], Head: [10, -6, 0] }]]),
  once('PodiumCheer', 50, [[0, { ArmR: [6, 0, -9], ArmL: [6, 0, 9] }], [8, { Pelvis: { r: [0, 0, 0], p: [0, -0.12, 0], s: 1 }, ArmR: [-60, 0, -30], ArmL: [-60, 0, 30], LegR: [-30, 0, 0], ShinR: [50, 0, 0], LegL: [-30, 0, 0], ShinL: [50, 0, 0] }], [16, { Pelvis: { r: [0, 0, 0], p: [0, 0.18, 0], s: 1 }, ArmR: [-170, 0, -25], ArmL: [-170, 0, 25], Head: [-10, 0, 0] }], [30, { Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 }, ArmR: [-165, 0, -25], ArmL: [-165, 0, 25] }], [50, { ArmR: [-165, 0, -25], ArmL: [-165, 0, 25] }]]),
  once('PodiumBow', 80, [[0, {}], [24, { Torso: [62, 0, 0], Head: [30, 0, 0], ArmR: [10, 0, -8], ArmL: [10, 0, 8] }], [52, { Torso: [62, 0, 0], Head: [30, 0, 0], ArmR: [10, 0, -8], ArmL: [10, 0, 8] }], [80, {}]]),
  loop('CrowdCheer', 30, [[0, { Pelvis: { r: [0, 0, 0], p: [0, 0, 0], s: 1 }, ArmR: [-120, 0, -20], ArmL: [-120, 0, 20] }], [15, { Pelvis: { r: [0, 0, 0], p: [0, 0.14, 0], s: 1 }, ArmR: [-165, 0, -22], ArmL: [-165, 0, 22] }]]),
];
const ROLES = {
  arai: { Overalls: 'navy', Shirt: 'white', Hat: 'white', Brim: 'white', Sleeve: 'white', Glove: 'white', Thigh: 'navy', Shin: 'navy', Shoe: 'ink', Face: 'sand' },
  benno: { Overalls: 'orange', Shirt: 'slate', Hat: 'ink', Brim: 'ink', Sleeve: 'slate', Glove: 'ink', Thigh: 'orange', Shin: 'orange', Shoe: 'ink', Face: 'sand' },
  fenn: { Overalls: 'slate', Shirt: 'white', Hat: 'plum', Brim: 'plum', Sleeve: 'white', Glove: 'white', Thigh: 'slate', Shin: 'slate', Shoe: 'plum', Face: 'sand' },
  dell: { Overalls: 'plum', Shirt: 'red', Hat: 'ink', Brim: 'ink', Sleeve: 'red', Glove: 'ink', Thigh: 'ink', Shin: 'ink', Shoe: 'white', Face: 'sand' },
  crew: { Overalls: 'red', Shirt: 'white', Hat: 'white', Brim: 'white', Sleeve: 'white', Glove: 'ink', Thigh: 'red', Shin: 'red', Shoe: 'ink', Face: 'sand' },
  marshal: { Overalls: 'orange', Shirt: 'sand', Hat: 'white', Brim: 'white', Sleeve: 'sand', Glove: 'white', Thigh: 'slate', Shin: 'slate', Shoe: 'ink', Face: 'sand' },
  fan: { Overalls: 'sky', Shirt: 'lime', Hat: 'orange', Brim: 'orange', Sleeve: 'lime', Glove: 'white', Thigh: 'blue', Shin: 'blue', Shoe: 'white', Face: 'sand' },
};
export function recolour(model, role, extra = {}) {
  const map = { ...(ROLES[role] ?? ROLES.fan), ...extra };
  model.traverse((o) => { if (!o.isMesh) return; const n = o.name; for (const k of Object.keys(map)) if (n.startsWith(k)) { o.material = toonMaterial(PALETTE[map[k]]); return; } });
}
let cache = null;
// A person: { root, play(name, {loop}), update(dt) }. `source` is the loaded hero (ctx.loadModel(HERO_MODEL)).scene.
export class Person {
  constructor(src, role, clips, extra) { this.root = src; recolour(src, role, extra); setLookLayer(src, 'actors'); this.mixer = new THREE.AnimationMixer(src); this.clips = Object.fromEntries(clips.map((c) => [c.name, c])); this.action = null; this.role = role; src.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } }); }
  play(name, { once = false, fade = 0.2, speed = 1 } = {}) { const clip = this.clips[name]; if (!clip) return; const a = this.mixer.clipAction(clip); a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = speed; if (this.action && this.action !== a) { a.crossFadeFrom(this.action, fade, false); } a.play(); this.action = a; this.name = name; }
  update(dt) { this.mixer.update(dt); }
  get done() { return this.action ? this.action.time >= this.action.getClip().duration - 0.02 : true; }
}
export async function loadCast(ctx) {
  const all = [...HERO_CLIPS, ...CAST_CLIPS]; const mk = async (role, extra) => { const m = (await ctx.loadModel(HERO_MODEL, { castShadow: false })).scene; const clips = compileClips(all, HERO_RIG, m); return new Person(m, role, clips, extra); };
  return { make: mk };
}
