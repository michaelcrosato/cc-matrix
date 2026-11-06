// Humanoid: one puppet, one mixer, shared compiled clips. Layered mode splits legs and upper body.
import { buildModel, compileClips, glowMaterial, HERO_RIG, PALETTE, setLookLayer, THREE } from '../../pixel-engine.js';
import { MODELS } from '../models/index.js';
import { ALL_CLIPS } from '../data/clips.js';
const UPPER = /^(Torso|Head|Arm|Forearm|Hand)/, LOWER = /^(Pelvis|Leg|Shin|Foot)/;
const mask = (clip, re, name) => new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => re.test(t.name.split('.')[0])));
let CLIPS = null;
export function sharedClips() {
  if (CLIPS) return CLIPS;
  const ref = buildModel('islander', { catalog: MODELS }).object;
  const list = compileClips(ALL_CLIPS, HERO_RIG, ref);
  CLIPS = {};
  for (const c of list) CLIPS[c.name] = { full: c, upper: null, lower: null, def: ALL_CLIPS.find((d) => d.name === c.name) };
  return CLIPS;
}
const clipOf = (name, kind) => { const c = sharedClips()[name]; if (!c) throw new Error(`no clip ${name}`); if (kind === 'full') return c.full; c[kind] ??= mask(c.full, kind === 'upper' ? UPPER : LOWER, `${name}:${kind}`); return c[kind]; };
const FLASH = () => glowMaterial(PALETTE.white);
export function buildProp(id, opts = {}) { const b = buildModel(id, { catalog: MODELS, ...opts }); b.object.traverse((m) => { if (m.isMesh) m.castShadow = opts.shadow ?? true; }); return b; }
const v = new THREE.Vector3();
export class Humanoid {
  constructor(ctx, modelId, o = {}) {
    this.ctx = ctx; this.id = modelId; const b = buildModel(modelId, { catalog: MODELS, palette: o.palette });
    this.root = b.object; this.scale = o.scale ?? 1; this.root.scale.setScalar(this.scale);
    this.root.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
    setLookLayer(this.root, 'actors'); ctx.scene.add(this.root);
    this.mixer = new THREE.AnimationMixer(this.root); this.layered = !!o.layered; this.actions = {}; this.cur = {}; this.joints = {};
    for (const n of HERO_RIG.joints) this.joints[n] = this.root.getObjectByName(n);
    this.meshes = []; this.root.traverse((m) => { if (m.isMesh) this.meshes.push(m); });
    this.flashT = 0; this.props = {}; this.popped = false;
  }
  _action(name, kind) { const k = `${name}:${kind}`; return (this.actions[k] ??= this.mixer.clipAction(clipOf(name, kind))); }
  _go(layer, name, kind, o) {
    const a = this._action(name, kind), cur = this.cur[layer];
    if (cur === a && !o.restart) { if (o.timeScale != null) a.timeScale = o.timeScale; return a; }
    const once = o.once ?? !sharedClips()[name].def?.loop;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = o.timeScale ?? 1; a.enabled = true; a.play();
    if (cur) cur.crossFadeTo(a, o.fade ?? 0.14, false);
    this.cur[layer] = a; this.curName = name; return a;
  }
  /** Whole body (legs and, unless an upper override is on, the rest). */
  play(name, o = {}) {
    this.baseName = name;
    if (this.layered) { this._go('lower', name, 'lower', o); if (!this.upperName) this._go('upper', name, 'upper', o); } else this._go('full', name, 'full', o);
  }
  setTimeScale(ts) { for (const k in this.cur) if (k !== 'upper' || !this.upperName) this.cur[k].timeScale = ts; }
  /** Upper-body override: aim, reload, recoil. null gives the upper body back to the base clip. */
  playUpper(name, o = {}) {
    if (!this.layered) return;
    if (name === this.upperName && !o.restart) return;
    this.upperName = name;
    this._go('upper', name || this.baseName || 'Idle', 'upper', o);
  }
  clipDone(layer = this.layered ? 'lower' : 'full') { const a = this.cur[layer]; return !a || !a.isRunning(); }
  flash(frames = 2) { if (this.flashT > 0) { this.flashT = frames; return; } this.flashT = frames; for (const m of this.meshes) { m.userData.mat = m.material; m.material = FLASH(); } }
  update(dt) {
    this.mixer.update(dt);
    if (this.flashT > 0 && --this.flashT <= 0) for (const m of this.meshes) if (m.userData.mat) m.material = m.userData.mat;
    if (this.popped && this.joints.Head) this.joints.Head.scale.setScalar(0.001);
  }
  /** Attach a model to a joint. Weapons point along +Z: rot x=90 for a hand. */
  attach(joint, id, o = {}) {
    const b = buildProp(id, { shadow: true }); const p = b.object; p.position.set(...(o.at ?? [0, -0.05, 0])); p.rotation.set(...(o.rot ?? [Math.PI / 2, 0, 0]).map((x) => x)); if (o.scale) p.scale.setScalar(o.scale);
    this.joints[joint].add(p); this.props[o.as ?? id] = p; p.traverse((m) => { if (m.isMesh) this.meshes.push(m); }); setLookLayer(p, 'actors');
    return p;
  }
  detach(name) { const p = this.props[name]; if (!p) return null; p.parent?.remove(p); p.traverse((m) => { if (m.isMesh) { const i = this.meshes.indexOf(m); if (i >= 0) this.meshes.splice(i, 1); } }); delete this.props[name]; return p; }
  jointPos(name, out = new THREE.Vector3()) { const j = this.joints[name]; j.getWorldPosition(out); return out; }
  remove() { this.ctx.scene.remove(this.root); this.mixer.stopAllAction(); }
}
export { v as tmpV };
