// A character on screen: the model, its mixer, cross-faded clips, blink, talk mouth, facing, squash, held things.
import { buildModel, compileClips, ContactShadow, setLookLayer, Squash, SpringChain, THREE, toonMaterial, PALETTE } from '../engine.js';
import { RIG, critterDef } from '../art/critter.js';
import { CLIP_DEFS } from './clips.js';
import { angleDelta } from '../core/util.js';
let CLIPS = null; const byName = new Map();
export const clipNames = () => CLIP_DEFS.map((c) => c.name);
export class Actor {
  constructor(def, o = {}) {
    this.root = new THREE.Group();
    this.scale = o.scale ?? 1;
    this.shadow = o.shadow === false ? null : new ContactShadow(0.42 * this.scale);
    this.rebuild(def);
    this.facing = o.facing ?? 0; this.targetFacing = this.facing;
    this.squash = new Squash(); this.blinkT = 1.5 + (o.seed ?? 0) % 3; this.blink = 0; this.talking = 0; this.smile = 0; this.mood = null;
    this.current = null; this.curName = null; this.onceBack = null; this.stateT = 0;
    /* Spring chains: tails, ribbons, hanging laundry. { colors, at: [x, y, z] on the body, rest, r, stiffness, gravity, len } */
    const geoOf = (r) => new THREE.SphereGeometry(r, 6, 4); this.chains = (o.springs ?? []).map((c) => ({ ...c, chain: new SpringChain({ segments: c.colors.length, length: c.len ?? 0.15, rest: c.rest, stiffness: c.stiffness ?? 9, gravity: c.gravity ?? 3 }), meshes: c.colors.map((col) => { const m = new THREE.Mesh(geoOf(c.r ?? 0.085), toonMaterial(PALETTE[col])); m.castShadow = true; setLookLayer(m, 'actors'); return m; }), ready: false })); this.tail = this.chains[0]?.chain; this.tailMeshes = this.chains.flatMap((c) => c.meshes);
  }
  rebuild(def) {
    const old = this.obj; const held = this.heldObj; this.def = def;
    const build = buildModel(def, {});
    this.obj = build.object; setLookLayer(this.obj, 'actors');
    this.obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
    if (old) { this.root.remove(old); this.mixer?.stopAllAction(); }
    this.root.add(this.obj); this.root.scale.setScalar(this.scale);
    if (!CLIPS) { CLIPS = compileClips(CLIP_DEFS, RIG, this.obj); for (const c of CLIPS) byName.set(c.name, c); }
    this.mixer = new THREE.AnimationMixer(this.obj); this.actions = new Map();
    this.eyes = this.obj.getObjectByName('Eyes'); this.mouth = this.obj.getObjectByName('Mouth'); this.head = this.obj.getObjectByName('Head'); this.armR = this.obj.getObjectByName('ArmR'); this.torso = this.obj.getObjectByName('Torso');
    if (this.curName) { const n = this.curName; this.curName = null; this.play(n, { fade: 0 }); } else this.play('Idle', { fade: 0 });
    if (held) { this.heldObj = null; this.hold(held); }
  }
  action(name) { let a = this.actions.get(name); if (!a) { const c = byName.get(name); if (!c) return null; a = this.mixer.clipAction(c); this.actions.set(name, a); } return a; }
  /** Plays a clip. Clips that aren't loops play once and return to `then` (default the locomotion clip last asked for). */
  play(name, o = {}) {
    if (this.curName === name && !o.restart) return;
    const a = this.action(name); if (!a) return;
    const isLoop = CLIP_DEFS.find((c) => c.name === name)?.loop;
    a.reset(); a.setLoop(isLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !isLoop; a.timeScale = o.speed ?? 1; a.enabled = true; a.setEffectiveWeight(1); a.play();
    const fade = o.fade ?? 0.12;
    if (this.current && this.current !== a) { if (fade > 0) this.current.crossFadeTo(a, fade, false); else this.current.stop(); }
    this.current = a; this.curName = name; this.onceT = isLoop ? 0 : a.getClip().duration; this.then = o.then ?? (isLoop ? null : o.hold ? null : 'Idle');
  }
  faceTo(x, z) { const p = this.root.position; this.targetFacing = Math.atan2(x - p.x, z - p.z); }
  place(x, y, z) { this.root.position.set(x, y, z); }
  hold(obj) { this.drop(); if (!obj || !this.armR) return; this.heldObj = obj; obj.position.set(0, -0.26, 0.02); this.armR.add(obj); }
  drop() { if (this.heldObj) { this.heldObj.parent?.remove(this.heldObj); this.heldObj = null; } }
  update(dt) {
    this.mixer.update(dt);
    if (this.onceT > 0) { this.onceT -= dt; if (this.onceT <= 0 && this.then) { const t = this.then; this.then = null; this.play(t); } }
    this.facing += angleDelta(this.facing, this.targetFacing) * Math.min(1, dt * 14);
    this.obj.rotation.y = this.facing;
    this.squash.update(dt); const [sx, sy] = this.squash.scale(); this.obj.scale.set(sx, sy, sx);
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blinkT = 2 + ((this.blinkT * 977) % 1 + 1) % 1 * 4; this.blink = 0.12; }
    this.blink = Math.max(0, this.blink - dt);
    if (this.eyes) this.eyes.scale.y = this.curName === 'Sleep' || this.curName === 'PlayDead' ? 0.15 : this.blink > 0 ? 0.15 : this.puffy ? 1.7 : 1;
    if (this.eyes && this.puffy) this.eyes.scale.x = 1.3; else if (this.eyes) this.eyes.scale.x = 1;
    if (this.mouth) { if (this.talking > 0) { this.talking = Math.max(0, this.talking - dt); this.mouth.scale.y = 3.2; } else this.mouth.scale.y = this.mood === 'queasy' ? 2 : 1; this.mouth.scale.x = this.mood === 'queasy' ? 1.6 : 1; }
    if (this.shadow) this.shadow.place(this.root.position.x, this.root.position.y, this.root.position.z, 0);
    if (this.chains.length && this.root.visible) { const f = this.facing, p = this.root.position, sf = Math.sin(f), cf = Math.cos(f); const basis = [[cf, 0, -sf], [0, 1, 0], [sf, 0, cf]]; for (const c of this.chains) { const [ax, ay, az] = c.at; const rootP = [p.x + cf * ax + sf * az, p.y + ay, p.z - sf * ax + cf * az]; if (!c.ready) { c.chain.reset(rootP, basis); c.ready = true; } c.chain.update(dt, rootP, basis); c.meshes.forEach((m, i) => { const q = c.chain.points[i + 1]; m.position.set(q[0], q[1], q[2]); }); } }
  }
  addTo(group) { group.add(this.root); if (this.shadow) group.add(this.shadow); for (const m of this.tailMeshes ?? []) group.add(m); }
  removeFrom() { this.root.parent?.remove(this.root); this.shadow?.parent?.remove(this.shadow); }
  set visible(v) { if (v !== this.root.visible) for (const c of this.chains) c.ready = false; this.root.visible = v; if (this.shadow) this.shadow.visible = v; for (const m of this.tailMeshes ?? []) m.visible = v; }
  get visible() { return this.root.visible; }
}
export const actorFrom = (o, a) => new Actor(critterDef(o), a);
