/* 22-replay: a ring buffer of the last 8 s at 60 Hz (the ball, every footballer's state, the referee, the sounds), and a
 * player that shows a goal again at half speed from a turned camera, with a REPLAY tag and scanlines. */
const REC_HZ = 60, REC_MAX = 8 * REC_HZ;
const snapF = f => ({ x: f.body.x, y: f.body.y, z: f.body.z, vx: f.body.vx, vy: f.body.vy, facing: f.facing, state: f.state, stateT: f.stateT, act: f.act ? { name: f.act.name, t: f.act.t, dur: f.act.dur } : null,
  flip: f.flip, diveU: f.diveU, tiltSide: f.tiltSide, sprinting: f.sprinting, lift: f.lift, glow: f.glow, celebrate: f.celebrate, dejected: f.dejected, set: f.set, gk: f.gk, air: f.air ? { kind: f.air.kind, t: f.air.t } : null, gone: f.state === 'gone' || f.body.x < -1000 });
class Recorder {
  constructor(m) { this.m = m; this.frames = []; this.acc = 0; this.sfx = []; }
  step(dt) {
    this.acc += dt; if (this.acc < 1 / REC_HZ) return; this.acc -= 1 / REC_HZ;
    const m = this.m, b = m.ball, o = m.official;
    this.frames.push({ t: m.t, p: m.players.map(snapF), ball: { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, roll: b.roll, superPath: b.superPath, superName: b.superName, decoys: b.decoys ? b.decoys.map(d => Object.assign({}, d)) : null },
      ref: o ? { x: o.body.x, y: o.body.y, vx: o.body.vx, vy: o.body.vy, facing: o.facing, sig: o.sig, downT: o.downT } : null, sfx: this.sfx.splice(0) });
    if (this.frames.length > REC_MAX) this.frames.shift();
  }
  cue(name) { this.sfx.push(name); }
  clip(t0, t1) { return this.frames.filter(f => f.t >= t0 && f.t <= t1); }
}
EF.Recorder = Recorder;
class ReplayPlayer {
  constructor(frames, o = {}) { this.frames = frames; this.i = 0; this.u = 0; this.speed = o.speed || .5; this.done = !frames.length; this.yaw = o.yaw || 45; this.played = -1; }
  frame() { return this.frames[Math.min(this.frames.length - 1, Math.floor(this.i))] || null; }
  update(dt) {
    if (this.done) return;
    this.i += dt * REC_HZ * this.speed;
    const k = Math.floor(this.i);
    for (let j = this.played + 1; j <= Math.min(k, this.frames.length - 1); j++) for (const s of this.frames[j].sfx) EF.sfx(s, { pitch: .6 });
    this.played = Math.max(this.played, k);
    if (this.i >= this.frames.length - 1) this.done = true;
  }
}
EF.ReplayPlayer = ReplayPlayer;
