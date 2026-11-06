import * as THREE from 'three/webgpu';
// Wraps an AnimationMixer with named clips and crossfades.
const libCache = new Map();
export class Rig {
  constructor(root, clipsFactory, key) {
    this.mixer = new THREE.AnimationMixer(root);
    if (!libCache.has(key)) libCache.set(key, clipsFactory());
    this.clips = {}; for (const c of libCache.get(key)) this.clips[c.name] = c;
    this.actions = {}; this.current = null; this.time = 0;
  }
  action(name) {
    if (!this.actions[name]) { const c = this.clips[name]; if (!c) return null; const a = this.mixer.clipAction(c); this.actions[name] = a; a.setLoop(c.userData?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = true; }
    return this.actions[name];
  }
  play(name, fade = .15, then = null) {
    const a = this.action(name); if (!a) return;
    if (this.currentName === name && a.isRunning() && !then && a.loop !== THREE.LoopOnce) return;
    a.reset(); a.paused = false; a.timeScale = 1; a.enabled = true; a.setEffectiveWeight(1); a.play();
    if (this.current && this.current !== a) this.current.crossFadeTo(a, fade, false);
    this.current = a; this.currentName = name; this.then = then; this.thenAt = then ? a.getClip().duration : 0;
  }
  scrub(name, t, fade = .15) { if (this.currentName !== name) this.play(name, fade); const a = this.action(name); a.paused = true; a.time = t * a.getClip().duration; }
  update(dt) { this.time += dt; this.mixer.update(dt); if (this.then) { this.thenAt -= dt; if (this.thenAt <= 0) { const n = this.then; this.then = null; this.play(n, .2); } } }
}
