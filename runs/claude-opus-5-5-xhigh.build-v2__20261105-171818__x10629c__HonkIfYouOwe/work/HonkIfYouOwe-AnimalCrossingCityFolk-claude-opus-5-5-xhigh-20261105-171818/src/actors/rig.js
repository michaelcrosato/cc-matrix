// The one rig: seven joints, shared by every critter and the player. Clips compile per body shape.
import { THREE, compileClips, buildModel, setLookLayer, ContactShadow, toonMaterial, SpringChain, PALETTE } from '../engine.js';
import { CLIPS } from './clips.js';
import { MODELS } from '../art/models.js';

const { AnimationMixer, Group, LoopOnce, LoopRepeat, Vector3 } = THREE;

export const RIG = {
  joints: ['Pelvis', 'Torso', 'Head', 'ArmR', 'ArmL', 'LegR', 'LegL'], root: 'Pelvis',
  mirror: { ArmR: 'ArmL', ArmL: 'ArmR', LegR: 'LegL', LegL: 'LegR' }, soles: [], trace: [], limits: {}, fps: 30,
};
const clipCache = new Map();
function clipsFor(obj) {
  const parts = RIG.joints.map((j) => { const o = obj.getObjectByName(j); return o ? `${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)}` : '-'; });
  const k = parts.join('|');
  let c = clipCache.get(k);
  if (!c) { c = compileClips(CLIPS, RIG, obj); clipCache.set(k, c); }
  return c;
}
const LOOPS = new Set(CLIPS.filter((c) => c.loop).map((c) => c.name));
const tmp = new Vector3();

/** A living character: a model, a mixer, a face, a blob shadow. Logic moves `x, z, y, facing`. */
export class Actor {
  constructor(def, { name = '', shadow = true, seed = 1 } = {}) {
    this.name = name;
    this.root = new Group();
    this.x = 0; this.z = 0; this.y = 0; this.facing = 0;
    this.turnTo = null;
    this.current = null;
    this.locked = 0;
    this.blink = 1 + (seed % 5) * 0.7;
    this.talk = 0;
    this.talkAmp = 0;
    this.headLook = null;
    this.shadowRadius = 0.4;
    this.hasShadow = shadow;
    this.shadow = shadow ? new ContactShadow(0.4) : null;
    this.scale = 1;
    this.squash = 0;
    this.squashV = 0;
    this.time = seed * 0.37;
    this.setModel(def);
  }
  setModel(def) {
    const old = this.model;
    if (old) this.root.remove(old);
    const obj = buildModel(def, { catalog: MODELS }).object;
    setLookLayer(obj, 'actors');
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    this.model = obj;
    this.root.add(obj);
    this.clips = clipsFor(obj);
    this.byName = new Map(this.clips.map((c) => [c.name, c]));
    this.mixer = new AnimationMixer(obj);
    this.current = null;
    this.tailSegs = [];
    for (let i = 0; obj.getObjectByName(`TailSeg${i}`); i++) this.tailSegs.push(obj.getObjectByName(`TailSeg${i}`));
    this.tailChain = this.tailSegs.length ? new SpringChain({ segments: this.tailSegs.length, length: 0.2, rest: [0, 0.75, -0.66], stiffness: 12, keep: 0.9, gravity: 3 }) : null;
    this.head = obj.getObjectByName('Head');
    this.eyeR = obj.getObjectByName('EyeR');
    this.eyeL = obj.getObjectByName('EyeL');
    this.mouth = obj.getObjectByName('Mouth');
    this.bee = obj.getObjectByName('Bee');
    this.handR = obj.getObjectByName('ArmR');
    if (this.heldDef) this.hold(this.heldDef, this.heldBuild);
    this.play('Idle', 0);
  }
  /** Cross-fade to a clip. `once` clips hold their last frame until something else plays. */
  play(name, fade = 0.15, { speed = 1, once = false } = {}) {
    const clip = this.byName.get(name);
    if (!clip) return;
    if (this.current?.name === name && !once) { this.current.action.timeScale = speed; return; }
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.timeScale = speed;
    action.enabled = true;
    if (LOOPS.has(name) && !once) action.setLoop(LoopRepeat, Infinity);
    else { action.setLoop(LoopOnce, 1); action.clampWhenFinished = true; }
    action.play();
    if (this.current && fade > 0) this.current.action.crossFadeTo(action, fade, false);
    else if (this.current) this.current.action.stop();
    this.current = { name, action, once: !LOOPS.has(name) || once, duration: clip.duration / Math.max(0.01, speed) };
  }
  get playing() { return this.current?.name ?? ''; }
  get finished() { const c = this.current; return !c || (c.once && c.action.time >= c.action.getClip().duration - 1e-3); }
  /** An open umbrella in the other hand. Pass null to fold it. */
  setUmbrella(palette, material = null) {
    const k = palette ? `${palette.a}:${palette.b}` : null;
    if (k === this.umbrellaKey) return;
    this.umbrellaKey = k;
    if (this.umbrella) { this.umbrella.removeFromParent(); this.umbrella = null; }
    if (!palette) return;
    const obj = buildModel('umbrella-prop', { catalog: MODELS, palette }).object;
    setLookLayer(obj, 'actors');
    if (material) obj.traverse((m) => { if (m.isMesh && m.material?.color?.getHex?.() === PALETTE[palette.a]) m.material = material; });
    obj.position.set(0.32, 0.5, 0);
    this.root.add(obj);
    this.umbrella = obj;
  }
  /** Put something in the right hand. */
  hold(defOrId, opts = {}) {
    if (this.held) { this.held.removeFromParent(); this.held = null; }
    this.heldDef = defOrId;
    this.heldBuild = opts;
    if (!defOrId) return;
    const obj = buildModel(defOrId, { catalog: MODELS, ...opts }).object;
    setLookLayer(obj, 'actors');
    const hand = new Group();
    hand.position.set(-0.08, -0.34, 0.04);
    hand.rotation.x = Math.PI * 0.5;
    hand.add(obj);
    this.handR?.add(hand);
    this.held = hand;
  }
  faceToward(x, z) { this.turnTo = Math.atan2(x - this.x, z - this.z); }
  update(dt) {
    this.time += dt;
    this.mixer.update(dt);
    if (this.turnTo !== null) {
      let d = this.turnTo - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const step = Math.min(Math.abs(d), dt * 10);
      this.facing += Math.sign(d) * step;
      if (Math.abs(d) < 0.01) this.turnTo = null;
    }
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.facing;
    // squash spring
    if (this.squash || this.squashV) {
      this.squashV += (-140 * this.squash - 14 * this.squashV) * dt;
      this.squash += this.squashV * dt;
      if (Math.abs(this.squash) < 0.002 && Math.abs(this.squashV) < 0.02) { this.squash = 0; this.squashV = 0; }
    }
    const s = 1 + this.squash;
    const h = 1 / Math.sqrt(Math.max(0.2, s));
    this.root.scale.set(this.scale * h, this.scale * s, this.scale * h);
    // blink
    this.blink -= dt;
    const closed = this.blink < 0.12;
    if (this.blink < 0) this.blink = 2 + ((this.time * 977) % 3.5);
    const eyeY = this.eyesClosed ? 0.18 : closed ? 0.18 : 1;
    if (this.eyeR) this.eyeR.scale.y = eyeY;
    if (this.eyeL) this.eyeL.scale.y = eyeY;
    // talk: the mouth opens on syllables
    this.talkAmp = Math.max(0, this.talkAmp - dt * 7);
    if (this.mouth) this.mouth.scale.y = 1 + this.talkAmp * 4 + (this.smile ?? 0);
    if (this.bee) { this.bee.position.x += Math.sin(this.time * 9) * 0.0015; this.bee.position.y += Math.cos(this.time * 7) * 0.0012; this.bee.rotation.y = this.time * 2; }
    // a springy tail, in the character's own space
    if (this.tailChain) {
      const sf = Math.sin(this.facing), cf = Math.cos(this.facing);
      const root = [this.x - sf * 0.28, this.y + 0.42, this.z - cf * 0.28];
      this.tailChain.update(dt, root, [[-cf, 0, sf], [0, 1, 0], [sf, 0, cf]]);
      const pts = this.tailChain.points;
      this.tailSegs.forEach((seg, i) => {
        const wx = pts[i + 1][0] - this.x, wy = pts[i + 1][1] - this.y - seg.parent.position.y, wz = pts[i + 1][2] - this.z;
        seg.position.set(wx * cf - wz * sf, wy, wx * sf + wz * cf);
      });
    }
    // head turn after the mixer
    if (this.head && this.headLook) {
      tmp.set(this.headLook[0] - this.x, 0, this.headLook[1] - this.z);
      let d = Math.atan2(tmp.x, tmp.z) - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.head.rotation.y += THREE.MathUtils.clamp(d, -0.9, 0.9);
    }
    if (this.shadow) this.shadow.place(this.root.position.x + (this.parentOffset?.x ?? 0), this.y, this.root.position.z + (this.parentOffset?.z ?? 0), 0);
  }
  /** Parent into a place's group. The contact shadow lives in the same group. */
  addTo(group) {
    group.add(this.root);
    if (this.shadow) group.add(this.shadow);
  }
  remove() { this.root.removeFromParent(); this.shadow?.removeFromParent(); }
  set visible(v) { this.root.visible = v; if (this.shadow) this.shadow.visible = v; }
  get visible() { return this.root.visible; }
  /** Swap a palette colour's material for another material (a pattern shirt). */
  swapMaterial(fromHex, material) {
    this.model.traverse((o) => { if (o.isMesh && o.material?.color?.getHex?.() === fromHex) o.material = material; });
  }
}
export function isToon(c) { return toonMaterial(c); }
