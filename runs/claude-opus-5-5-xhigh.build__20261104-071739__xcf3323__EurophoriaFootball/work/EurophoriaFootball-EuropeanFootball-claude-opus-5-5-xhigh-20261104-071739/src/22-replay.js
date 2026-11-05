/* ACTION REPLAY (section 6.15): a ring buffer of the last 8 s at 60 Hz (every other step) of the ball, every
 * footballer, the referee and the event actors, with the sound cues; played back after a goal from 4.5 s before it,
 * at half speed, from a turned camera, with a REPLAY tag. The rigs are driven from the recorded states. */
const clone = o => o ? JSON.parse(JSON.stringify(o)) : o;
class Replay {
  constructor(m) { this.m = m; this.buf = []; this.max = 8 * 60; this.step = 0; this.playing = null; this.proxy = null; }
  record() {
    const m = this.m; if (this.step++ % 2) return;
    const b = m.ball, fr = { t: m.t, b: [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.roll, b.superPath ? b.superPath.kind : null, b.screamer ? 1 : 0, b.decoys ? 1 : 0], p: [], r: null, ev: [], bus: m.bus ? [m.bus.x, m.bus.y, m.bus.side, m.bus.state] : null, cues: this.cues || [] };
    this.cues = [];
    for (const f of m.players) { const B = f.body, L = f.look; fr.p.push([B.x, B.y, B.z, B.vx, B.vy, f.facing, f.kickName, f.kickT, f.state, { pose: L.pose, expr: L.expr, tilt: L.tilt ? Object.assign({}, L.tilt) : null, down: L.down, air: L.air, sprint: L.sprint, hurt: L.hurt, spin: L.spin, clip: L.clip ? Object.assign({}, L.clip) : null }, f.sentOff, f.ghost, f.charging ? f.charge : 0]); }
    const R = m.ref, RB = R.body; fr.r = [RB.x, RB.y, RB.z, RB.vx, RB.vy, R.facing, clone(R.look)];
    for (const e of m.events) fr.ev.push({ id: e.id, x: e.x || (e.body && e.body.x), y: e.y || (e.body && e.body.y), z: e.z || (e.body && e.body.z) || 0, state: e.state, caught: e.caught, popped: e.popped });
    this.buf.push(fr); if (this.buf.length > this.max) this.buf.shift();
  }
  cue(type) { (this.cues || (this.cues = [])).push(type); }
  /** start playing: from 4.5 s before the goal to 0.8 s after it, at half speed */
  start(goalT) {
    if (!this.buf.length) return false;
    const t0 = Math.max(this.buf[0].t, goalT - 4.5), t1 = Math.min(this.buf[this.buf.length - 1].t, goalT + .8);
    if (t1 - t0 < .5) return false;
    this.playing = { t: t0, t0, t1, yaw: EF.fxRng() < .5 ? -45 : 45, i: 0 };
    this.makeProxy();
    return true;
  }
  makeProxy() {
    const m = this.m;
    this.proxy = { replay: this.playing, ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, roll: 0, r: 3, trail: [], superPath: null, screamer: false, decoys: null, speed() { return Math.hypot(this.vx, this.vy); } },
      players: m.players.map(f => ({ id: f.id, side: f.side, data: f.data, team: f.team, role: f.role, idx: f.idx, body: { x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 5 }, facing: 0, look: {}, kickName: null, kickT: 0, state: 'run', human: null, sentOff: false, ghost: false, charge: 0, charging: false, celebrate: null, short: f.short, stamina: 100 })),
      ref: { body: { x: 0, y: 0, z: 0, vx: 0, vy: 0 }, facing: 0, look: {}, data: m.ref.data }, events: [], bus: null, m };
  }
  stop() { this.playing = null; this.proxy = null; }
  /** advance the replay clock (dt is real game dt): returns false when it has ended */
  advance(dt) {
    const P0 = this.playing; if (!P0) return false;
    P0.t += dt * .5; if (P0.t >= P0.t1) return false;
    const B = this.buf; let i = Math.max(0, P0.i); while (i < B.length - 2 && B[i + 1].t <= P0.t) i++; P0.i = i;
    const a = B[i], c = B[Math.min(B.length - 1, i + 1)], k = c.t > a.t ? clamp((P0.t - a.t) / (c.t - a.t), 0, 1) : 0, X = this.proxy;
    const bb = X.ball; [bb.x, bb.y, bb.z, bb.vx, bb.vy, bb.vz, bb.roll] = a.b.slice(0, 7).map((v, j) => lerp(v, c.b[j], k));
    bb.superPath = a.b[7] ? { kind: a.b[7] } : null; bb.screamer = !!a.b[8]; bb.decoys = a.b[9] ? [{ k: -1, alive: true }, { k: 1, alive: true }] : null;
    if (bb.screamer || bb.superPath) { bb.trail.push([bb.x, bb.y, bb.z]); if (bb.trail.length > 14) bb.trail.shift(); } else bb.trail.length = 0;
    a.p.forEach((q, j) => { const f = X.players[j], n = c.p[j]; for (const [key, idx] of [['x', 0], ['y', 1], ['z', 2], ['vx', 3], ['vy', 4]]) f.body[key] = lerp(q[idx], n[idx], k); f.facing = q[5] + E.angDiff(q[5], n[5]) * k; f.kickName = q[6]; f.kickT = q[7] + (q[6] === n[6] ? (n[7] - q[7]) * k : 0); f.state = q[8]; f.look = q[9]; f.sentOff = q[10]; f.ghost = q[11]; f.charge = q[12]; f.charging = q[12] > 0; });
    const R = X.ref; [R.body.x, R.body.y, R.body.z, R.body.vx, R.body.vy] = a.r.slice(0, 5).map((v, j) => lerp(v, c.r[j], k)); R.facing = a.r[5]; R.look = a.r[6];
    X.events = a.ev; X.bus = a.bus ? { x: a.bus[0], y: a.bus[1], side: a.bus[2], state: a.bus[3], w: 60, d: 18, h: 30 } : null;
    if (i !== this.lastCueI) { this.lastCueI = i; for (const cue of a.cues) EF.bus.emit('replayCue', { cue }); }
    return true;
  }
}
EF.Replay = Replay;
