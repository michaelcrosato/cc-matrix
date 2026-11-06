import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { PALETTES, PALETTE_ORDER } from '../data/palettes.js';

/** Palette uniforms and light colours, lerped over 3 s between steps. */
export class Palette {
  constructor(sun, hemi) {
    this.sun = sun; this.hemi = hemi;
    this.name = 'dawn';
    const p = PALETTES.dawn;
    this.u = {};
    for (const k of ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi']) this.u[k] = uniform(new THREE.Color(p[k]));
    this.cur = { ...p };
    this.colors = {};
    for (const k of ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi', 'sun', 'hemiSky', 'hemiGround']) this.colors[k] = new THREE.Color(p[k]);
    this.to = p; this.t = 1; this.dur = 3;
    this.from = null;
    this.apply();
  }
  set(name, dur = 3) {
    const p = PALETTES[name];
    if (!p) return;
    this.name = name;
    this.from = {};
    for (const k of Object.keys(this.colors)) this.from[k] = this.colors[k].clone();
    this.fromI = { sunPower: this.cur.sunPower, hemiPower: this.cur.hemiPower };
    this.to = p; this.t = 0; this.dur = Math.max(dur, 0.0001);
    if (dur <= 0) this.frame(1);
  }
  /** Palette for a step through the day: dawn at the start, dusk at the end. */
  forStep(i, total) {
    const n = PALETTE_ORDER.length;
    return PALETTE_ORDER[Math.min(n - 1, Math.floor((i / Math.max(1, total)) * n))];
  }
  frame(dt) {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    const s = this.t;
    const c = new THREE.Color();
    for (const k of Object.keys(this.colors)) { c.set(this.to[k]); this.colors[k].copy(this.from[k]).lerp(c, s); }
    this.cur.sunPower = this.fromI.sunPower + (this.to.sunPower - this.fromI.sunPower) * s;
    this.cur.hemiPower = this.fromI.hemiPower + (this.to.hemiPower - this.fromI.hemiPower) * s;
    this.apply();
  }
  apply() {
    for (const k of ['skyTop', 'skyMid', 'skyLow', 'sea', 'seaHi']) this.u[k].value.copy(this.colors[k]);
    if (this.sun) { this.sun.color.copy(this.colors.sun); this.sun.intensity = this.cur.sunPower; }
    if (this.hemi) { this.hemi.color.copy(this.colors.hemiSky); this.hemi.groundColor.copy(this.colors.hemiGround); this.hemi.intensity = this.cur.hemiPower; }
  }
}
