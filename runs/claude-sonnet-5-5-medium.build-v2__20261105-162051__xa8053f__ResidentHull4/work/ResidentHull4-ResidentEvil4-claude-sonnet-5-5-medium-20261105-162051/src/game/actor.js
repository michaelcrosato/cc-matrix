// Humanoid: a puppet on the hero rig with a mixer, masked upper/lower layers, aim pitch and hit flashes.
import { THREE, buildModel, compileClips, HERO_RIG, HERO_CLIPS, setLookLayer, ContactShadow, glowMaterial, PALETTE } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { allClipDefs } from '../data/clips.js';

const { Group, AnimationMixer, LoopRepeat, LoopOnce, Vector3 } = THREE;
const UPPER = /^(Torso|Head|Arm|Forearm|Hand)/, LOWER = /^(Pelvis|Leg|Shin|Foot)/;
let SHARED = null;
const MASKS = new Map();
export function sharedClips(object) {
  if (!SHARED) { SHARED = new Map(); for (const c of compileClips(allClipDefs(HERO_CLIPS), HERO_RIG, object)) SHARED.set(c.name, c); }
  return SHARED;
}
function masked(clip, kind) {
  const key = clip.name + '|' + kind;
  let m = MASKS.get(key);
  if (!m) {
    const re = kind === 'U' ? UPPER : LOWER;
    m = new THREE.AnimationClip(clip.name + '_' + kind, clip.duration, clip.tracks.filter((t) => re.test(t.name.split('.')[0])));
    MASKS.set(key, m);
  }
  return m;
}
const white = () => glowMaterial(PALETTE.white);
export const JOINTS = ['Pelvis', 'Torso', 'Head', 'ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL', 'LegR', 'ShinR', 'FootR', 'LegL', 'ShinL', 'FootL'];

export class Humanoid {
  constructor(modelId, o = {}) {
    this.id = modelId;
    const build = buildModel(modelId, { catalog: MODELS, palette: o.palette });
    this.build = build;
    this.root = new Group();
    this.body = build.object;
    this.root.add(this.body);
    this.scale = o.scale ?? 1;
    this.root.scale.setScalar(this.scale);
    this.clips = sharedClips(this.body);
    this.mixer = new AnimationMixer(this.body);
    this.j = {};
    for (const n of JOINTS) this.j[n] = this.body.getObjectByName(n) || null;
    this.active = new Map(); // action key -> action
    this.aim = { on: false, pitch: 0, torso: 0.35 };
    this.flashT = 0; this.mats = null;
    this.timeScale = 1; this.finishedCb = null; this.current = { lower: null, upper: null, full: null };
    if (o.layer !== false) setLookLayer(this.root, o.layer || 'actors');
    this.shadow = o.shadow === false ? null : new ContactShadow(0.35 * this.scale);
    this.hidden = false;
    this.mixer.addEventListener('finished', (e) => { if (this.finishedCb && e.action === this.fullAction) { const cb = this.finishedCb; this.finishedCb = null; cb(); } });
  }
  attachTo(scene) { scene.add(this.root); if (this.shadow) scene.add(this.shadow); return this; }
  detach() { this.root.removeFromParent(); this.shadow?.removeFromParent(); }
  clip(name) { const c = this.clips.get(name); if (!c) throw new Error('no clip ' + name); return c; }
  _act(key, clip, o) {
    let a = this.active.get(key);
    if (!a) { a = this.mixer.clipAction(clip); this.active.set(key, a); }
    return a;
  }
  _fadeOutExcept(keep, fade) {
    for (const [k, a] of this.active) if (!keep.includes(k) && a.isRunning() ) { a.fadeOut(fade); }
  }
  /** Full-body clip. */
  play(name, o = {}) {
    const fade = o.fade ?? 0.12;
    if (this.current.full === name && !o.restart && !o.once) { this.fullAction.timeScale = o.speed ?? 1; return this.fullAction; }
    const clip = this.clip(name);
    const key = 'F:' + name;
    const a = this._act(key, clip);
    a.enabled = true; a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(o.speed ?? 1);
    a.setLoop(o.once ? LoopOnce : LoopRepeat, Infinity); a.clampWhenFinished = !!o.hold;
    a.fadeIn(fade).play();
    this._fadeOutExcept([key], fade);
    this.current = { lower: null, upper: null, full: name };
    this.fullAction = a;
    this.finishedCb = o.done || null;
    return a;
  }
  /** Legs and upper body as separate actions on one mixer. */
  layers(lower, upper, o = {}) {
    const fade = o.fade ?? 0.12;
    const keep = [];
    if (lower && !(this.current.lower === lower && this.current.full === null)) {
      const a = this._act('L:' + lower, masked(this.clip(lower), 'L')); a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(o.lowerSpeed ?? 1); a.fadeIn(fade).play();
      this.lowerAction = a;
    } else if (lower && this.lowerAction) this.lowerAction.setEffectiveTimeScale(o.lowerSpeed ?? 1);
    if (upper && !(this.current.upper === upper && this.current.full === null)) {
      const a = this._act('U:' + upper, masked(this.clip(upper), 'U')); a.reset(); a.setEffectiveWeight(1); a.setEffectiveTimeScale(o.upperSpeed ?? 1);
      a.setLoop(o.upperOnce ? LoopOnce : LoopRepeat, Infinity); a.clampWhenFinished = !!o.upperOnce; a.fadeIn(fade).play();
      this.upperAction = a;
    }
    if (lower) keep.push('L:' + lower);
    if (upper) keep.push('U:' + upper);
    this._fadeOutExcept(keep, fade);
    this.current = { lower, upper, full: null };
  }
  setLowerSpeed(s) { if (this.lowerAction) this.lowerAction.setEffectiveTimeScale(s); }
  /** Seconds a clip takes (at timeScale 1). */
  duration(name) { return this.clip(name).duration; }
  flash(frames = 2) {
    if (!this.mats) { this.mats = []; this.body.traverse((m) => { if (m.isMesh) this.mats.push([m, m.material]); }); }
    this.flashT = frames;
    const w = white();
    for (const [m] of this.mats) m.material = w;
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.aim.on) {
      const p = this.aim.pitch;
      this.j.Torso?.rotateX(-p * this.aim.torso);
      this.j.ArmR?.rotateX(-p * 0.65);
      this.j.ArmL?.rotateX(-p * 0.65);
      this.j.Head?.rotateX(p * 0.3);
    }
    if (this.lookAt && this.j.Head) { this.j.Head.rotateY(this.lookAt.y || 0); }
    if (this.flashT > 0) { this.flashT--; if (this.flashT === 0 && this.mats) for (const [m, mat] of this.mats) m.material = mat; }
  }
  worldOf(name, out = new Vector3()) { const o = this.j[name]; if (!o) return out.set(0, 0, 0); return o.getWorldPosition(out); }
  setPos(x, y, z) { this.root.position.set(x, y, z); }
  placeShadow(groundY = 0) { if (this.shadow) this.shadow.place(this.root.position.x, groundY, this.root.position.z, this.root.position.y - groundY); }
  /** Hold a prop on a joint. */
  hold(jointName, modelId, at = [0, 0, 0], rot = [0, 0, 0]) {
    const b = buildModel(modelId, { catalog: MODELS });
    b.object.position.set(...at); b.object.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
    this.j[jointName].add(b.object);
    return b.object;
  }
  dispose() { this.detach(); this.mixer.stopAllAction(); }
}
