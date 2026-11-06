import * as THREE from 'three/webgpu';
import { CLIPS } from './clips.js';
export class Rig {
  constructor(doll) { this.doll = doll; this.mixer = new THREE.AnimationMixer(doll.root); this.actions = {}; this.cur = null; this.curName = ''; this.breathPh = 0; }
  action(name) { if (!this.actions[name]) { const c = CLIPS[name]; if (!c) return null; const a = this.mixer.clipAction(c); a.clampWhenFinished = true; this.actions[name] = a; } return this.actions[name]; }
  play(name, fade = 0.2, { loop = null, speed = 1, force = false } = {}) {
    if (this.curName === name && !force) return this.cur; const a = this.action(name); if (!a) return null;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = speed;
    const lp = loop ?? (!['hop', 'shrug', 'bow', 'stepL', 'stepR', 'tuck', 'pike'].includes(name) && !name.startsWith('pose'));
    a.setLoop(lp ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.paused = false;
    if (this.cur && this.cur !== a) { a.play(); this.cur.crossFadeTo(a, fade, false); } else a.play();
    this.cur = a; this.curName = name; return a;
  }
  scrub(name, f) { const a = this.play(name, 0.05); if (!a) return; a.paused = true; a.time = f * a.getClip().duration; }
  update(dt) { this.mixer.update(dt); }
}
