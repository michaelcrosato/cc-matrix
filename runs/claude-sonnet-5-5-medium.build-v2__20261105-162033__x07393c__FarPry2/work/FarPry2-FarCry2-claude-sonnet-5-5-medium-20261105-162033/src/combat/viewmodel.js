// First-person models on the camera, keyed by data clips: { dur, tracks:{ Node:[[t01,{p:[x,y,z],r:[x,y,z]}],...] } }.
// Time is 0..1 across dur; positions in metres, rotations in degrees, both relative to the node's rest pose.
import { buildModel, THREE, setLookLayer } from '../../pixel-engine.js';
import { vm } from '../art/guns.js';

const ease = (u) => u * u * (3 - 2 * u);
const K = (t, p, r) => [t, { p, r }];
const R0 = [0, 0, 0];
/** clip templates per gun kind */
export const CLIPS = {
  equip: { dur: 0.45, tracks: { Weapon: [K(0, [0, -0.5, 0.1], [40, 0, 0]), K(1, R0, R0)] } },
  holster: { dur: 0.3, tracks: { Weapon: [K(0, R0, R0), K(1, [0, -0.5, 0.1], [40, 0, 0])] } },
  fire: { dur: 0.12, tracks: { Weapon: [K(0, [0, 0, 0], R0), K(0.2, [0, 0.01, -0.07], [-5, 0, 0]), K(1, R0, R0)], Bolt: [K(0, R0, R0), K(0.3, [0, 0, -0.06], R0), K(1, R0, R0)] } },
  fireHeavy: { dur: 0.3, tracks: { Weapon: [K(0, R0, R0), K(0.15, [0, 0.02, -0.12], [-9, 0, 0]), K(1, R0, R0)] } },
  jam: { dur: 0.18, tracks: { Weapon: [K(0, R0, R0), K(0.3, [0, 0, -0.02], [-2, 0, 0]), K(1, R0, R0)] } },
  mag: { dur: 2.2, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.04, 0], [0, 0, -12]), K(0.8, [0, -0.04, 0], [0, 0, -12]), K(1, R0, R0)], Mag: [K(0, R0, R0), K(0.25, [0, -0.3, 0], [20, 0, 0]), K(0.35, [0, -0.5, 0.1], R0), K(0.6, [0, -0.35, 0], R0), K(0.75, R0, R0)], HandL: [K(0, R0, R0), K(0.2, [0, -0.1, -0.2], R0), K(0.45, [0, -0.35, -0.2], R0), K(0.7, [0, -0.1, -0.2], R0), K(1, R0, R0)], Bolt: [K(0.8, R0, R0), K(0.88, [0, 0, -0.08], R0), K(0.95, R0, R0)] } },
  revolver: { dur: 2.4, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.05, 0], [-18, 0, 0]), K(0.8, [0, -0.05, 0], [-18, 0, 0]), K(1, R0, R0)], Mag: [K(0, R0, R0), K(0.2, [-0.08, 0, 0], [0, 0, 70]), K(0.75, [-0.08, 0, 0], [0, 0, 70]), K(0.9, R0, R0)], HandL: [K(0, R0, R0), K(0.25, [0.08, -0.1, -0.1], R0), K(0.7, [0.08, -0.12, -0.1], R0), K(1, R0, R0)] } },
  flare: { dur: 1.8, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.04, 0.02], [30, 0, 0]), K(0.8, [0, -0.04, 0.02], [30, 0, 0]), K(1, R0, R0)], Mag: [K(0.3, R0, R0), K(0.45, [0, 0.1, 0], [-40, 0, 0]), K(0.7, [0, 0.1, 0], [-40, 0, 0]), K(0.85, R0, R0)] } },
  pump: { dur: 3.0, tracks: { Weapon: [K(0, R0, R0), K(0.15, [0, -0.04, 0], [18, 0, 0]), K(0.8, [0, -0.04, 0], [18, 0, 0]), K(1, R0, R0)], Mag: [K(0.15, R0, R0), K(0.3, [0, -0.1, 0.05], R0), K(0.45, R0, R0), K(0.55, [0, -0.1, 0.05], R0), K(0.7, R0, R0)], Bolt: [K(0.7, R0, R0), K(0.78, [0, 0, -0.18], R0), K(0.9, R0, R0)] } },
  pumpFire: { dur: 0.7, tracks: { Weapon: [K(0, R0, R0), K(0.1, [0, 0.02, -0.12], [-10, 0, 0]), K(0.3, R0, R0)], Bolt: [K(0.4, R0, R0), K(0.55, [0, 0, -0.18], R0), K(0.8, R0, R0)] } },
  bolt: { dur: 3.0, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.04, 0], [0, 0, -10]), K(0.85, [0, -0.04, 0], [0, 0, -10]), K(1, R0, R0)], Mag: [K(0.2, R0, R0), K(0.4, [0, -0.2, 0], R0), K(0.6, [0, -0.2, 0], R0), K(0.75, R0, R0)], Bolt: [K(0.05, R0, R0), K(0.15, [0, 0.04, 0], [0, 0, -70]), K(0.3, [0, 0.04, -0.12], [0, 0, -70]), K(0.8, [0, 0.04, -0.12], [0, 0, -70]), K(0.9, [0, 0.04, 0], [0, 0, -70]), K(1, R0, R0)] } },
  boltFire: { dur: 1.0, tracks: { Weapon: [K(0, R0, R0), K(0.08, [0, 0.03, -0.12], [-8, 0, 0]), K(0.4, R0, R0)], Bolt: [K(0.45, R0, R0), K(0.52, [0, 0.04, 0], [0, 0, -70]), K(0.62, [0, 0.04, -0.12], [0, 0, -70]), K(0.75, [0, 0.04, 0], [0, 0, -70]), K(0.85, R0, R0)] } },
  tube: { dur: 3.4, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.1, 0.1], [35, 0, 0]), K(0.8, [0, -0.1, 0.1], [35, 0, 0]), K(1, R0, R0)], Mag: [K(0.2, [0, 0, 0.9], R0), K(0.6, [0, 0, 0], R0)] } },
  flame: { dur: 3.2, tracks: { Weapon: [K(0, R0, R0), K(0.3, [0, -0.03, 0], [10, 0, 0]), K(0.8, [0, -0.03, 0], [10, 0, 0]), K(1, R0, R0)], Mag: [K(0.2, R0, R0), K(0.4, [-0.1, -0.2, 0], [0, 0, 40]), K(0.7, [0, 0, 0], R0)] } },
  unjam: { dur: 0.7, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, 0.0, 0], [0, 0, -25]), K(0.5, [0, 0.04, 0], [0, 0, 30]), K(1, R0, R0)], HandL: [K(0, R0, R0), K(0.3, [0.04, 0.1, -0.1], R0), K(0.45, [0.0, 0.0, -0.2], R0), K(0.7, [0, -0.1, 0], R0), K(1, R0, R0)], Bolt: [K(0.35, R0, R0), K(0.5, [0, 0, -0.1], R0), K(0.7, R0, R0)] } },
  fall: { dur: 1.6, tracks: { Weapon: [K(0, R0, R0), K(0.2, [0, -0.02, 0], [0, 0, 6]), K(0.7, [0, -0.5, 0.1], [50, 0, 20]), K(1, [0, -0.7, 0.1], [60, 0, 30])], Mag: [K(0, R0, R0), K(0.3, [0, -0.1, 0], [10, 0, 0]), K(0.8, [0.1, -0.8, 0.1], [90, 0, 40]), K(1, [0.1, -1.0, 0.1], [90, 0, 40])] } },
  melee: { dur: 0.5, tracks: { Weapon: [K(0, R0, R0), K(0.3, [0.12, -0.04, 0.12], [0, -50, -30]), K(0.55, [-0.12, 0.0, 0.2], [0, 50, 20]), K(1, R0, R0)] } },
  throw: { dur: 0.7, tracks: { Weapon: [K(0, R0, R0), K(0.3, [0, 0.1, -0.15], [-30, 0, 0]), K(0.55, [0, 0.0, 0.3], [40, 0, 0]), K(1, [0, -0.4, 0.2], [20, 0, 0])] } },
  // items held in a hand
  tablet: { dur: 1.0, tracks: { Weapon: [K(0, [0.0, -0.5, 0], [30, 0, 0]), K(0.25, [0, 0, 0], R0), K(0.6, [0, 0.2, -0.05], [-65, 0, 0]), K(0.8, [0, 0.2, -0.05], [-65, 0, 0]), K(1, [0, -0.5, 0], [30, 0, 0])], Mag: [K(0.5, R0, R0), K(0.62, [0.04, 0.05, 0], [0, 0, 30]), K(0.9, R0, R0)] } },
  syrette: { dur: 0.8, tracks: { Weapon: [K(0, [0.0, -0.5, 0], R0), K(0.3, [-0.15, -0.25, 0.1], [0, 25, 0]), K(0.5, [-0.15, -0.3, 0.2], [-10, 25, 0]), K(0.8, [-0.15, -0.28, 0.12], [0, 25, 0]), K(1, [0, -0.5, 0], R0)], Bolt: [K(0.5, R0, R0), K(0.7, [0.1, 0, 0], R0)] } },
  pliers: { dur: 4.0, tracks: { Weapon: [K(0, [0, -0.5, 0.1], R0), K(0.15, [-0.1, -0.05, 0.1], [0, 20, 0]), K(0.5, [-0.12, -0.04, 0.12], [-4, 20, 0]), K(0.7, [-0.1, 0.0, -0.1], [-10, 20, 0]), K(0.85, [-0.16, 0.02, -0.2], [-12, 20, 0]), K(1, [0, -0.5, 0.1], R0)], Bolt: [K(0.3, R0, R0), K(0.5, [0, 0, 0.02], R0), K(0.7, [0.04, 0, 0], R0)] } },
  knifeCut: { dur: 4.0, tracks: { Weapon: [K(0, [0, -0.5, 0.1], R0), K(0.2, [-0.12, -0.1, 0.1], [0, 25, 0]), K(0.4, [-0.12, -0.12, 0.14], [0, 25, 20]), K(0.6, [-0.12, -0.1, 0.1], [0, 25, -20]), K(0.8, [-0.12, -0.12, 0.14], [0, 25, 20]), K(1, [0, -0.5, 0.1], R0)] } },
  snap: { dur: 3.0, tracks: { Weapon: [K(0, [0, -0.5, 0.1], R0), K(0.2, [0.05, -0.05, 0.05], [0, 0, 0]), K(0.6, [0.05, -0.05, 0.05], [0, 0, 8]), K(0.65, [0.05, -0.04, 0.05], [0, 0, -14]), K(0.8, [0.05, -0.05, 0.05], R0), K(1, [0, -0.5, 0.1], R0)] } },
  lighter: { dur: 4.0, tracks: { Weapon: [K(0, [0, -0.5, 0.1], R0), K(0.2, [-0.1, -0.1, 0.1], [0, 20, 0]), K(0.3, [-0.1, -0.1, 0.1], [0, 20, 6]), K(0.8, [-0.1, -0.12, 0.12], [0, 20, 0]), K(1, [0, -0.5, 0.1], R0)] } },
  wrench: { dur: 3.0, tracks: { Weapon: [K(0, [0, -0.5, 0.1], R0), K(0.2, [0.0, -0.1, 0.25], R0), K(0.35, [0, -0.1, 0.25], [0, 0, 25]), K(0.5, [0, -0.1, 0.25], [0, 0, -25]), K(0.65, [0, -0.1, 0.25], [0, 0, 25]), K(0.8, [0, -0.1, 0.25], [0, 0, -25]), K(1, [0, -0.5, 0.1], R0)] } },
  raise: { dur: 0.45, tracks: { Weapon: [K(0, [0, -0.5, 0.1], [30, 0, 0]), K(1, R0, R0)] } },
  lower: { dur: 0.35, tracks: { Weapon: [K(0, R0, R0), K(1, [0, -0.5, 0.1], [30, 0, 0])] } },
  eye: { dur: 0.4, tracks: { Weapon: [K(0, [0.1, -0.4, 0], [30, 0, 0]), K(1, [-0.05, 0.12, -0.12], [0, 0, 0])] } },
  beep: { dur: 0.2, tracks: { Bolt: [K(0, R0, R0), K(0.5, [0, 0.02, 0], R0), K(1, R0, R0)] } },
};
const sample = (keys, u) => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) { const a = keys[i - 1], b = keys[i], f = ease((u - a[0]) / Math.max(1e-6, b[0] - a[0])); const mix = (x, y) => x.map((v, k) => v + (y[k] - v) * f); return { p: mix(a[1].p, b[1].p), r: mix(a[1].r, b[1].r) }; }
  }
  return keys[keys.length - 1][1];
};
const D2R = Math.PI / 180;

export class ViewModels {
  constructor(ctx) {
    this.ctx = ctx;
    this.holder = new THREE.Group();
    this.holder.position.set(0.17, -0.2, -0.5); this.holder.scale.setScalar(0.72);
    ctx.scene.add(ctx.camera.camera);
    ctx.camera.camera.add(this.holder);
    this.items = new Map();
    this.cur = null; this.anim = null; this.t = 0;
    this.kick = { z: 0, rx: 0 }; this.bobT = 0;
    this.ads = 0; this.hidden = false; this.sway = [0, 0];
  }
  /** build (once) and return the viewmodel for a model key like 'tractor' */
  get(key) {
    let it = this.items.get(key);
    if (it) return it;
    const def = vm[key];
    const b = buildModel(def);
    const root = new THREE.Group();
    b.object.rotation.y = Math.PI;
    root.add(b.object);
    setLookLayer(root, 'actors');
    root.traverse((o) => { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; });
    const nodes = {}, rest = {};
    for (const n of ['Weapon', 'Mag', 'Bolt', 'HandL', 'HandR', 'rust1', 'rust2', 'tape']) { const o = b.object.getObjectByName(n); if (o) { nodes[n] = o; rest[n] = { p: o.position.clone(), r: o.rotation.clone() }; } }
    it = { key, root, nodes, rest };
    root.visible = false;
    this.holder.add(root);
    this.items.set(key, it);
    return it;
  }
  show(key) {
    if (this.cur) this.cur.root.visible = false;
    this.cur = key ? this.get(key) : null;
    if (this.cur) this.cur.root.visible = !this.hidden;
  }
  setCondition(stage) {
    const c = this.cur; if (!c) return;
    if (c.nodes.rust1) c.nodes.rust1.visible = stage !== 'clean';
    if (c.nodes.rust2) c.nodes.rust2.visible = stage !== 'clean';
    if (c.nodes.tape) c.nodes.tape.visible = stage === 'tape' || stage === 'rattle';
  }
  play(name, dur, onDone) {
    const clip = CLIPS[name]; if (!clip) return;
    this.anim = { name, clip, t: 0, dur: dur || clip.dur, onDone };
  }
  playing() { return this.anim ? this.anim.name : null; }
  progress() { return this.anim ? this.anim.t / this.anim.dur : 1; }
  update(dt, moving, speed, ads) {
    const c = this.cur; if (!c) return;
    c.root.visible = !this.hidden;
    this.bobT += dt * speed * 1.7;
    this.ads += ((ads ? 1 : 0) - this.ads) * Math.min(1, dt * 12);
    const bob = moving ? 1 : 0;
    const amp = (1 - this.ads * 0.8) * bob * Math.min(1, speed / 5);
    this.kick.z *= 0.8; this.kick.rx *= 0.8;
    this.holder.position.set(0.15 * (1 - this.ads) + 0.0 * this.ads + Math.cos(this.bobT) * 0.012 * amp, -0.2 * (1 - this.ads) - 0.13 * this.ads + Math.abs(Math.sin(this.bobT)) * 0.016 * amp + Math.sin(this.ctx.time * 1.4) * 0.002, -0.5 * (1 - this.ads) - 0.42 * this.ads + this.kick.z);
    this.holder.rotation.set(this.kick.rx * D2R, 0, 0);
    // reset to rest then apply the clip
    for (const n in c.nodes) { const o = c.nodes[n], r = c.rest[n]; o.position.copy(r.p); o.rotation.copy(r.r); }
    const a = this.anim;
    if (a) {
      a.t += dt;
      const u = Math.min(1, a.t / a.dur);
      for (const n in a.clip.tracks) {
        const o = c.nodes[n]; if (!o) continue;
        const s = sample(a.clip.tracks[n], u);
        o.position.x += s.p[0]; o.position.y += s.p[1]; o.position.z += s.p[2];
        o.rotation.x += s.r[0] * D2R; o.rotation.y += s.r[1] * D2R; o.rotation.z += s.r[2] * D2R;
      }
      if (u >= 1) { const d = a.onDone; this.anim = null; d?.(); }
    }
  }
  dispose() { this.ctx.camera.camera.remove(this.holder); }
}
