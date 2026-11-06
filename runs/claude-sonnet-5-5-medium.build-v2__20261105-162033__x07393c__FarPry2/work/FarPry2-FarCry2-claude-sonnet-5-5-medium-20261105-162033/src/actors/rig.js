// A person's body: model on the hero rig, a mixer, lower/upper layering, ragdoll on death.
import { THREE, buildModel, compileClips, HERO_CLIPS, HERO_RIG, setLookLayer, Ragdoll, HERO_RAGDOLL } from '../../pixel-engine.js';
import { CATALOG } from '../art/catalog.js';
import { PERSON_CLIPS } from '../art/clips.js';

const RIG = { ...HERO_RIG, spine: undefined };
const USED = ['Idle', 'IdleLook', 'Walk', 'Run', 'Crouch', 'CrouchWalk', 'Sit', 'SitDown', 'StandUp', 'LieIdle', 'Sleep', 'Hurt', 'HitReact', 'Death', 'Wave', 'Shout', 'Push', 'Climb'];
const LOWER = /^(Pelvis|Leg|Shin|Foot)/;
const clipCache = new Map();
function clipsFor(object, key) {
  if (clipCache.has(key)) return clipCache.get(key);
  const all = compileClips([...HERO_CLIPS.filter((c) => USED.includes(c.name)), ...PERSON_CLIPS], RIG, object);
  const map = {};
  const own = new Set(PERSON_CLIPS.map((c) => c.name));
  for (const c of all) {
    // our own clips key joint rotations only: dropping their position and scale tracks keeps every joint at its rest offset
    if (own.has(c.name)) c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') && !Array.from(t.values).some(Number.isNaN));
    map[c.name] = c;
    map[c.name + ':lower'] = new THREE.AnimationClip(c.name + ':lower', c.duration, c.tracks.filter((t) => LOWER.test(t.name)));
    map[c.name + ':upper'] = new THREE.AnimationClip(c.name + ':upper', c.duration, c.tracks.filter((t) => !LOWER.test(t.name)));
  }
  clipCache.set(key, map);
  return map;
}
export class PersonView {
  constructor(modelId, ctx) {
    this.ctx = ctx;
    const b = buildModel(modelId, { catalog: CATALOG });
    this.object = new THREE.Group();
    this.object.add(b.object);
    this.model = b.object;
    setLookLayer(this.object, 'actors');
    this.model.traverse((o) => { o.castShadow = true; o.frustumCulled = false; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = clipsFor(this.model, 'people');
    this.actions = new Map();
    this.cur = { lower: null, upper: null, full: null };
    this.speed = 1;
    this.gunHolder = null;
    this.ragdoll = null;
  }
  action(name) {
    let a = this.actions.get(name);
    if (!a) { const c = this.clips[name]; if (!c) return null; a = this.mixer.clipAction(c); this.actions.set(name, a); }
    return a;
  }
  fade(slot, name, t = 0.18, loop = true) {
    if (this.cur[slot] === name) return;
    const prev = this.cur[slot] && this.action(this.cur[slot]);
    const next = name && this.action(name);
    this.cur[slot] = name;
    if (prev && prev !== next) prev.fadeOut(t);
    if (next) {
      next.reset().fadeIn(t).play();
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
    }
  }
  /** whole-body clip (clears layers) */
  full(name, loop = true, t = 0.18) {
    this.fade('lower', null, t); this.fade('upper', null, t);
    this.fade('full', name, t, loop);
  }
  /** legs + armed arms */
  layered(lower, upper, loop = true) {
    this.fade('full', null);
    this.fade('lower', lower + ':lower', 0.18);
    this.fade('upper', upper + ':upper', 0.12, loop);
  }
  oneShotUpper(name, back) {
    this.fade('upper', name + ':upper', 0.05, false);
    this.once = { until: this.ctx.time + 0.4, back };
  }
  update(dt) {
    this.mixer.update(dt * this.speed);
    if (this.once && this.ctx.time > this.once.until) { const b = this.once.back; this.once = null; if (b) this.fade('upper', b + ':upper', 0.12, true); }
    this.ragdoll?.sync?.();
  }
  die(velocity) {
    if (this.ragdoll) return;
    try { this.ragdoll = new Ragdoll(this.ctx.physics, this.model, HERO_RAGDOLL); this.mixer.stopAllAction(); this.ragdoll.enable({ velocity }); }
    catch { this.full('Death', false, 0.05); }
  }
  dispose() {
    try { this.ragdoll?.disable?.(); } catch { /* already gone */ }
    this.mixer.stopAllAction();
    this.object.removeFromParent();
  }
}
