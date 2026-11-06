// People on the hero rig: one set of compiled clips, split into legs and upper body, shared by everyone.
import { THREE, buildModel, compileClips, setLookLayer, HERO_CLIPS, HERO_RIG } from '../../pixel-engine.js';
import { MODELS } from '../art/models.js';
import { PEOPLE_CLIPS } from '../art/clips.js';
const { AnimationMixer, AnimationClip, LoopOnce, LoopRepeat } = THREE;
let CACHE = null;
function clips() {
  if (CACHE) return CACHE;
  const sample = buildModel('soldier-a', { catalog: MODELS }).object;
  const all = compileClips([...HERO_CLIPS, ...PEOPLE_CLIPS], { ...HERO_RIG, spine: undefined }, sample);
  const whole = {}, lower = {}, upper = {};
  const isLeg = (t) => /^(Pelvis|Leg|Shin|Foot)/.test(t.name);
  for (const c of all) {
    whole[c.name] = c;
    lower[c.name] = new AnimationClip(`${c.name}.lo`, c.duration, c.tracks.filter(isLeg));
    upper[c.name] = new AnimationClip(`${c.name}.up`, c.duration, c.tracks.filter((t) => !isLeg(t)));
  }
  CACHE = { whole, lower, upper };
  return CACHE;
}
export function makePerson(modelId, palette) {
  const build = buildModel(modelId, { catalog: MODELS, palette });
  const object = build.object;
  setLookLayer(object, 'actors');
  object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { object, anim: new PersonAnim(object), build };
}
export class PersonAnim {
  lowerName = ''; upperName = ''; one = null; lockT = 0; wait = null;
  constructor(object) {
    this.object = object; this.mixer = new AnimationMixer(object); this.c = clips(); this.actions = new Map();
  }
  act(kind, name) {
    const key = `${kind}:${name}`;
    let a = this.actions.get(key);
    if (!a) { const clip = this.c[kind][name]; if (!clip) return null; a = this.mixer.clipAction(clip); this.actions.set(key, a); }
    return a;
  }
  /** Lower and upper body on loops; a name for both plays one whole clip. */
  set(lower, upper = lower, fade = 0.2) {
    if (this.lockT > 0) { this.wait = [lower, upper]; return; }
    if (lower !== this.lowerName) {
      const n = this.act('lower', lower), o = this.lowerName && this.act('lower', this.lowerName);
      if (n) { n.reset().setLoop(LoopRepeat).play(); if (o) o.crossFadeTo(n, fade, false); this.lowerName = lower; }
    }
    if (upper !== this.upperName && !this.one) {
      const n = this.act('upper', upper), o = this.upperName && this.act('upper', this.upperName);
      if (n) { n.reset().setLoop(LoopRepeat).play(); if (o) o.crossFadeTo(n, fade, false); this.upperName = upper; }
    } else if (this.one) this.pendingUpper = upper;
  }
  /** A whole-body clip once: sitting down, getting up. What is asked for meanwhile waits for it. */
  once(name, speed = 1) {
    const clip = this.c.whole[name]; if (!clip) return;
    this.lockT = 0;
    const back = [this.lowerName, this.upperName];
    this.set(name, name, 0.12);
    for (const kind of ['lower', 'upper']) { const a = this.act(kind, name); a.setLoop(LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = speed; }
    this.lockT = clip.duration / speed; this.wait = back;
  }
  /** A one-shot on the upper body, then back to the loop. */
  shot(name, speed = 1) {
    const n = this.act('upper', name); if (!n) return;
    const cur = this.one ?? (this.upperName && this.act('upper', this.upperName));
    n.reset().setLoop(LoopOnce, 1); n.clampWhenFinished = true; n.timeScale = speed; n.play();
    if (cur && cur !== n) cur.crossFadeTo(n, 0.05, false);
    this.one = n; this.oneDur = n.getClip().duration / speed; this.oneT = 0;
  }
  speed(lowerRate) { const a = this.lowerName && this.act('lower', this.lowerName); if (a) a.timeScale = lowerRate; }
  update(dt) {
    if (this.lockT > 0 && (this.lockT -= dt) <= 0) { this.lockT = 0; this.set(this.wait[0], this.wait[1], 0.18); }
    if (this.one) {
      this.oneT += dt;
      if (this.oneT >= this.oneDur) {
        const back = this.act('upper', this.pendingUpper ?? this.upperName);
        if (back) { back.reset().setLoop(LoopRepeat).play(); this.one.crossFadeTo(back, 0.12, false); this.upperName = this.pendingUpper ?? this.upperName; }
        this.one = null; this.pendingUpper = null;
      }
    }
    this.mixer.update(dt);
  }
  stop() { this.mixer.stopAllAction(); this.lowerName = ''; this.upperName = ''; this.one = null; this.lockT = 0; this.wait = null; }
}
