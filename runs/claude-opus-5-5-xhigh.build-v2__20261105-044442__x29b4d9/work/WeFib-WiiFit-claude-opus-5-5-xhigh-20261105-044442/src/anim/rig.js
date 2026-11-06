import * as THREE from 'three/webgpu';

/** AnimationMixer wrapper: a base clip, one-shots that return to it, and scrubbed clips. */
export class Rig {
  constructor(root, clips) {
    this.root = root; this.clips = clips;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    this.current = null; this.currentName = null; this.base = null;
    this.onceLeft = 0; this.time = 0;
  }
  action(name) {
    let a = this.actions.get(name);
    if (!a) {
      const clip = this.clips[name];
      if (!clip) return null;
      a = this.mixer.clipAction(clip);
      this.actions.set(name, a);
    }
    return a;
  }
  /** Change the looping clip. */
  loop(name, { fade = 0.25, speed = 1 } = {}) {
    this.base = name;
    this.baseSpeed = speed;
    if (this.onceLeft > 0) return;
    this._to(name, fade, speed, false);
  }
  /** Play once, then fall back to the looping clip. */
  once(name, { fade = 0.1, speed = 1, hold = 0 } = {}) {
    const clip = this.clips[name];
    if (!clip) return;
    this._to(name, fade, speed, true);
    this.onceLeft = clip.duration / speed + hold;
  }
  /** Pause a clip at a share of its length: squats, hoops, anything driven by a number. */
  scrub(name, phase, { fade = 0.2 } = {}) {
    const a = this.action(name);
    if (!a) return;
    if (this.onceLeft > 0) { this.base = name; a.time = 0; return; }
    if (this.currentName !== name) { this._to(name, fade, 1, false); this.base = name; }
    a.paused = true;
    a.time = Math.max(0, Math.min(1, phase)) * a.getClip().duration * 0.9999;
  }
  _to(name, fade, speed, once) {
    const a = this.action(name);
    if (!a) return;
    if (this.currentName === name && !once) { a.setEffectiveTimeScale(speed); a.paused = false; return; }
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.setEffectiveTimeScale(speed);
    a.setEffectiveWeight(1);
    a.play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a; this.currentName = name;
  }
  update(dt) {
    if (this.onceLeft > 0) {
      this.onceLeft -= dt;
      if (this.onceLeft <= 0) { this.onceLeft = 0; if (this.base) this._to(this.base, 0.2, this.baseSpeed || 1, false); }
    }
    this.mixer.update(dt);
    this.time += dt;
  }
}
