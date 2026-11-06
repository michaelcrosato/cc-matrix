// A person's view: model on the hero rig, shared compiled clips, layered upper and lower body, ragdoll on death.
import { buildModel, compileClips, gaitClip, HERO_CLIPS, HERO_RAGDOLL, HERO_RIG, Ragdoll, setLookLayer, THREE } from '../../pixel-engine.js';
import { CATALOG } from '../art/models.js';
import { PEOPLE_CLIPS } from '../art/clips.js';
const { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat } = THREE;
let CLIPS = null, LOWER = null, UPPER = null;
const LEGS = /^(Pelvis|Leg|Shin|Foot)/;
const KEEP = ['Idle', 'IdleLook', 'Walk', 'Run', 'Crouch', 'CrouchWalk', 'Crawl', 'Sit', 'SitDown', 'StandUp', 'LieIdle', 'Sleep', 'Hurt', 'HitReact', 'Death', 'Wave', 'Shout', 'Push', 'Climb'];
export const RIG = { ...HERO_RIG, spine: undefined };
function compile(object) {
  if (CLIPS) return;
  // People who have walked a long way: a short, heavy stride with the feet truly planted.
  const trudge = gaitClip(HERO_RIG, { name: 'Trudge', frames: 42, speed: 0.95, stance: 0.66, hip: -0.035, bob: 0.018, lift: 0.05, lean: 9, sway: 3, head: 6 });
  const defs = [...HERO_CLIPS.filter((c) => KEEP.includes(c.name)), ...PEOPLE_CLIPS, trudge];
  const all = compileClips(defs, RIG, object);
  CLIPS = {}; LOWER = {}; UPPER = {};
  for (const c of all) {
    CLIPS[c.name] = c;
    LOWER[c.name] = new AnimationClip(`${c.name}:L`, c.duration, c.tracks.filter((t) => LEGS.test(t.name)));
    UPPER[c.name] = new AnimationClip(`${c.name}:U`, c.duration, c.tracks.filter((t) => !LEGS.test(t.name)));
  }
}
export const clipNames = () => Object.keys(CLIPS ?? {});
export class PersonView {
  constructor(ctx, modelId, palette, { gun = false } = {}) {
    this.ctx = ctx;
    const b = buildModel(modelId, { catalog: CATALOG, palette });
    this.object = b.object;
    compile(b.object);
    setLookLayer(this.object, 'actors');
    b.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    ctx.scene.add(this.object);
    this.mixer = new AnimationMixer(this.object);
    this.lower = null; this.upper = null; this.full = null;
    if (gun) { const r = buildModel('rifle-npc', { catalog: CATALOG }); const hand = this.object.getObjectByName('HandR'); r.object.position.set(0, -0.06, 0.04); r.object.rotation.x = -0.3; r.object.traverse((o) => { if (o.isMesh) o.castShadow = false; }); hand.add(r.object); this.gun = r.object; }
  }
  action(table, name) { return this.mixer.clipAction(table[name]); }
  setLower(name, speed = 1) { if (this.lowerName === name) { if (this.lower) this.lower.timeScale = speed; return; } this.stopFull(); const a = this.action(LOWER, name); a.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.15).play(); a.timeScale = speed; this.lower?.fadeOut(0.15); this.lower = a; this.lowerName = name; }
  setUpper(name) { if (this.upperName === name) return; this.stopFull(); const a = this.action(UPPER, name); a.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.15).play(); this.upper?.fadeOut(0.15); this.upper = a; this.upperName = name; }
  /** One-shot on the upper body (recoil, reload, swear). */
  flashUpper(name, duration = 0) { const a = this.action(UPPER, name); a.reset().setLoop(LoopOnce, 1).setEffectiveWeight(1).play(); a.clampWhenFinished = false; if (duration) a.timeScale = a.getClip().duration / duration; return a; }
  /** A whole-body clip, looped or once. */
  setFull(name, once = false) {
    if (this.fullName === name) return;
    this.lower?.fadeOut(0.15); this.upper?.fadeOut(0.15); this.lower = this.upper = null; this.lowerName = this.upperName = null;
    const a = this.action(CLIPS, name);
    a.reset().setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once; a.fadeIn(0.15).play();
    this.full?.fadeOut(0.15); this.full = a; this.fullName = name;
  }
  stopFull() { if (this.full) { this.full.fadeOut(0.15); this.full = null; this.fullName = null; } }
  place(x, y, z, yaw) { this.object.position.set(x, y, z); this.object.rotation.y = yaw; }
  update(dt) { if (!this.doll?.active) this.mixer.update(dt); else this.doll.sync(); }
  ragdoll(velocity) {
    if (this.doll) return;
    this.mixer.stopAllAction();
    this.object.updateMatrixWorld(true);
    try { this.doll = new Ragdoll(this.ctx.physics, this.object, HERO_RAGDOLL); this.doll.enable({ velocity }); } catch { this.doll = null; this.setFull('Death', true); }
  }
  freeze() { if (this.doll?.active) this.doll.disable(); }
  dispose() { this.freeze(); this.mixer.stopAllAction(); this.ctx.scene.remove(this.object); }
}
