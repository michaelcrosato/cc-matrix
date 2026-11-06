// A rigged critter in the world: AnimationMixer over compiled clips, blinking, talking mouth, head look-at.
import { THREE } from '../engine.js';
import { buildCritter } from '../art/critter.js';
import { compileFor, CLIP_DEFS } from '../art/clips.js';
const { AnimationMixer, Group, LoopOnce, LoopRepeat } = THREE;
const SPEED = Object.fromEntries(CLIP_DEFS.filter(c => c.speed).map(c => [c.name, c.speed]));
export class Actor {
  constructor(spec) {
    this.spec = spec; const b = buildCritter(spec); this.build = b; this.obj = b.object; this.joints = b.joints; this.parts = b.parts; this.height = b.height;
    this.root = new Group(); this.root.add(this.obj); this.mixer = new AnimationMixer(this.obj); this.clips = new Map(compileFor(this.obj).map(c => [c.name, c]));
    this.cur = null; this.curName = ''; this.x = 0; this.z = 0; this.y = 0; this.yaw = 0; this.talk = 0; this.blinkT = 2 + Math.random(); this.look = null; this.lookYaw = 0; this.squash = 0; this.name = spec.name ?? '';
    this.onceDone = null;
  }
  play(name, o = {}) {
    const clip = this.clips.get(name); if (!clip) return false;
    if (this.curName === name && !o.restart) { if (o.speed) this.cur.timeScale = o.speed; return true; }
    const a = this.mixer.clipAction(clip); a.reset(); a.enabled = true;
    a.setLoop(o.once ? LoopOnce : LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.timeScale = o.speed ?? 1;
    if (this.cur && o.fade !== 0) { a.crossFadeFrom(this.cur, o.fade ?? 0.15, false); } else if (this.cur) this.cur.stop();
    a.play(); this.cur = a; this.curName = name; return true;
  }
  /** Locomotion: choose clip and scale playback to speed. */
  locomote(speed, mode) { // mode: 'tiptoe'|'walk'|'jog'|'run'
    if (speed < 0.05) { this.play(this.idleClip ?? 'Idle'); return; }
    const name = mode === 'tiptoe' ? 'Tiptoe' : mode === 'run' ? 'Run' : mode === 'jog' ? 'Jog' : 'Walk';
    this.play(name); this.cur.timeScale = Math.min(1.6, Math.max(0.5, speed / SPEED[name]));
  }
  setPos(x, z, y = 0) { this.x = x; this.z = z; this.y = y; }
  update(dt, t = 0) {
    this.mixer.update(dt);
    if (this.parts.tail) { const tl = this.parts.tail; const vx = (this.x - (this._px ?? this.x)) / Math.max(dt, 1e-3), vz = (this.z - (this._pz ?? this.z)) / Math.max(dt, 1e-3); this._px = this.x; this._pz = this.z; const lat = (vx * Math.cos(this.yaw) - vz * Math.sin(this.yaw)); this._tv = (this._tv ?? 0) + ((-lat * 0.25 + Math.sin(t * 2.2 + this.x) * 0.25 - (this._ta ?? 0)) * 60 - (this._tv ?? 0) * 6) * dt; this._ta = (this._ta ?? 0) + this._tv * dt; this._ta = Math.max(-0.7, Math.min(0.7, this._ta)); tl.rotation.y = this._ta; }
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.yaw;
    // blink
    this.blinkT -= dt; if (this.blinkT < 0) { this.blinkT = 2.5 + Math.random() * 3; this.blinking = 0.12; }
    let ey = 1; if (this.blinking > 0) { this.blinking -= dt; ey = 0.1; }
    if (this.parts.eyeL) { this.parts.eyeL.scale.y = ey; this.parts.eyeR.scale.y = ey; if (this.sad) { this.parts.eyeL.scale.y *= 0.6; this.parts.eyeR.scale.y *= 0.6; } if (this.puffy) { for (const e of [this.parts.eyeL, this.parts.eyeR]) { e.scale.x = 1.7; e.scale.y *= 1.9; } } }
    if (this.parts.mouth) { const open = this.talk > 0 ? 0.04 + (Math.sin(t * 28) * 0.5 + 0.5) * 0.12 : 0.04; this.parts.mouth.scale.y = open / 0.04; if (this.talk > 0) this.talk -= dt; }
    if (this.look != null) { const h = this.joints.Head; let d = this.look - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); d = Math.max(-1, Math.min(1, d)); h.rotation.y += (d - h.rotation.y) * Math.min(1, dt * 8) * 0 + d * 0.0; h.rotation.y = d; }
    if (this.squash) { this.squash *= 0.86; if (Math.abs(this.squash) < 0.01) this.squash = 0; const s = this.obj.userData.baseScale ?? (this.obj.userData.baseScale = this.obj.scale.x); this.obj.scale.set(s * (1 - this.squash * 0.5), s * (1 + this.squash), s * (1 - this.squash * 0.5)); }
  }
  speak(dur = 0.12) { this.talk = Math.max(this.talk, dur); }
  show(v) { this.root.visible = v; }
}
