// Humanoid: a puppet on the hero rig with one mixer and two masked channels (upper and lower body),
// props on joints, a hit flash, a ragdoll, and joint world positions for hit zones.
import { buildModel, compileClips, glowMaterial, HERO_RAGDOLL, HERO_RIG, PALETTE, Ragdoll, setLookLayer, THREE } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { ALL_CLIP_DEFS, CLIP_SPEED } from '../data/clips.js';

const { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, Quaternion, Vector3 } = THREE;

export const UPPER = /^(Torso|Head|Arm|Forearm|Hand)/;
export const LOWER = /^(Pelvis|Leg|Shin|Foot)/;
const mask = (clip, re, name) => new AnimationClip(name, clip.duration, clip.tracks.filter((t) => re.test(t.name.split('.')[0])));

let CLIPS = null; // name -> { full, upper, lower }
/** All humans share rest offsets, so the clips are compiled once and shared by every mixer. */
export function clipLibrary(object) {
  if (CLIPS) return CLIPS;
  CLIPS = {};
  for (const c of compileClips(ALL_CLIP_DEFS, HERO_RIG, object)) {
    CLIPS[c.name] = { full: c, upper: mask(c, UPPER, `${c.name}^U`), lower: mask(c, LOWER, `${c.name}^L`) };
  }
  return CLIPS;
}

const flashMat = () => glowMaterial(PALETTE.white);
const tmpV = new Vector3();

export class Humanoid {
  constructor(modelId, { palette, scale = 1, shadow = true } = {}) {
    const build = buildModel(modelId, { catalog: MODELS, palette });
    this.build = build;
    this.root = build.object;
    this.modelId = modelId;
    setLookLayer(this.root, 'actors');
    if (scale !== 1) this.root.scale.setScalar(scale);
    this.scale = scale;
    this.lib = clipLibrary(this.root);
    this.mixer = new AnimationMixer(this.root);
    this.channels = { upper: { action: null, name: null }, lower: { action: null, name: null } };
    this.baseName = null;
    this.baseRate = 1;
    this.overlay = null;
    this.flashT = 0;
    this.meshes = [];
    this.joints = {};
    for (const j of HERO_RIG.joints) this.joints[j] = this.root.getObjectByName(j);
    this.root.traverse((o) => {
      if (o.isMesh) { this.meshes.push({ mesh: o, mat: o.material }); o.castShadow = shadow; }
    });
    this.props = {};
    this.ragdoll = null;
    this.dead = false;
  }

  channel(which, clipSet, name, { fade = 0.15, once = false, rate = 1, hold = false, at = 0 } = {}) {
    const ch = this.channels[which];
    const clip = which === 'upper' ? clipSet.upper : clipSet.lower;
    const action = this.mixer.clipAction(clip);
    if (ch.action === action && action.isRunning() && !once) { action.timeScale = rate; return action; }
    action.enabled = true;
    action.reset();
    action.time = at;
    action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once || hold;
    action.timeScale = rate;
    action.setEffectiveWeight(1);
    if (ch.action && ch.action !== action) {
      if (fade > 0) { action.fadeIn(fade); ch.action.fadeOut(fade); } else ch.action.stop();
    }
    action.play();
    ch.action = action;
    ch.name = name;
    return action;
  }

  /** Whole body. `upperBusy` overlays stay on top until cleared. */
  play(name, o = {}) {
    const set = this.lib[name];
    if (!set) return null;
    this.baseName = name;
    this.baseOnce = !!o.once;
    this.baseRate = o.rate ?? 1;
    const a = this.channel('lower', set, name, o);
    if (!this.overlay) this.channel('upper', set, name, o);
    this.currentDuration = set.full.duration / Math.max(0.001, Math.abs(o.rate ?? 1));
    return a;
  }

  /** Locomotion: playback rate follows real speed. */
  loco(name, speed, o = {}) {
    const rate = CLIP_SPEED[name] ? Math.max(0.3, speed / CLIP_SPEED[name]) : 1;
    if (this.baseName === name && !this.baseOnce) {
      this.baseRate = rate;
      const lo = this.channels.lower.action;
      if (lo) lo.timeScale = rate;
      if (!this.overlay && this.channels.upper.action) this.channels.upper.action.timeScale = rate;
      return;
    }
    this.play(name, { ...o, rate });
  }

  /** Upper body only (aim, reload, recoil). */
  upper(name, o = {}) {
    const set = this.lib[name];
    if (!set) return null;
    this.overlay = name;
    return this.channel('upper', set, name, o);
  }

  clearUpper(fade = 0.15) {
    if (!this.overlay) return;
    this.overlay = null;
    if (this.baseName) {
      const lo = this.channels.lower.action;
      const a = this.channel('upper', this.lib[this.baseName], this.baseName, { fade, rate: this.baseRate, once: this.baseOnce, at: lo ? lo.time : 0 });
      return a;
    }
    return null;
  }

  get playing() { return this.channels.lower.name; }
  /** True when a one-shot base clip has run out. */

  attach(joint, modelId, { at = [0, 0, 0], rot = [0, 0, 0], scale = 1, palette } = {}) {
    const j = joint === 'root' ? this.root : this.root.getObjectByName(joint);
    const b = buildModel(modelId, { catalog: MODELS, palette });
    const o = b.object;
    o.position.set(...at);
    o.rotation.set(...rot);
    o.scale.setScalar(scale);
    j.add(o);
    o.traverse((m) => { if (m.isMesh) { this.meshes.push({ mesh: m, mat: m.material }); m.castShadow = true; } });
    return o;
  }

  flash(frames = 2) {
    if (this.flashT <= 0) for (const m of this.meshes) m.mesh.material = flashMat();
    this.flashT = frames;
  }

  update(dt) {
    if (this.flashT > 0) {
      this.flashT--;
      if (this.flashT <= 0) for (const m of this.meshes) m.mesh.material = m.mat;
    }
    if (this.ragdoll) {
      // Settle, then freeze the pose: corpses shouldn't keep bodies in the world.
      if (this.ragdoll.active) {
        this.ragdoll.sync();
        this.ragdollT -= dt;
        if (this.ragdollT <= 0) { this.ragdoll.disable(); this.onRagdollSettled?.(); }
      }
      return;
    }
    this.mixer.update(dt);
  }

  goRagdoll(physics, velocity) {
    if (this.scale !== 1) return false;
    this.mixer.stopAllAction();
    this.root.updateMatrixWorld(true);
    this.ragdoll = new Ragdoll(physics, this.root, HERO_RAGDOLL);
    this.ragdoll.enable({ velocity });
    // Limbs never block a walk, a bullet or the camera.
    for (const b of this.ragdoll.bodies) for (let i = 0; i < b.numColliders(); i++) physics.tag(b.collider(i), 'noCamera', 'noBullet');
    this.ragdollT = 1.6;
    return true;
  }

  worldOf(joint, out = tmpV) {
    const j = this.joints[joint];
    return j ? j.getWorldPosition(out) : out.copy(this.root.position);
  }

  /** Head look-at, procedural, after the mixer: turn the head toward a world point by up to 50 degrees. */
  lookToward(x, z, weight = 1) {
    const head = this.joints.Head;
    if (!head) return;
    // A clip that doesn't touch the head leaves last frame's turn on it: take that off first, or it adds up.
    this.look ??= { before: new Quaternion(), after: new Quaternion(), on: false };
    if (this.look.on && head.quaternion.equals(this.look.after)) head.quaternion.copy(this.look.before);
    const yaw = this.root.rotation.y;
    let a = Math.atan2(x - this.root.position.x, z - this.root.position.z) - yaw;
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    a = Math.max(-0.9, Math.min(0.9, a)) * weight;
    this.look.before.copy(head.quaternion);
    head.rotateY(a);
    this.look.after.copy(head.quaternion);
    this.look.on = true;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
export { Quaternion, Vector3 };
