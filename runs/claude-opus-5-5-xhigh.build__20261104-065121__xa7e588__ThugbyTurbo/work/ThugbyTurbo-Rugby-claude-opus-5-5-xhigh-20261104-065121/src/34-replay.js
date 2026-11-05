/* ---- INSTANT REPLAY: the last 5 s of the match as compact frames (60 a second), played back at half speed through the
 * normal presentation, the camera close on the key actor, letterbox bars. Never in AI Hub sessions ---- */
const PKEYS = ['x', 'y', 'z', 'vx', 'vy', 'f', 'st', 'stT', 'stDur', 'fire', 'charge', 'chargeT', 'ctl', 'fendT', 'turbo', 'turboOn', 'mud', 'binT', 'pk', 'pkMode'];
class Replay {
  constructor(m) { this.m = m; this.buf = []; this.max = 300; this.k = 0; this.play = null; this.lastT = -99; }
  snap() {
    const m = this.m;
    return {
      t: m.t,
      players: m.players.map(p => { const o = {}; for (const k of PKEYS) o[k] = p[k]; o.a = Object.assign({}, p.a); o.sup = p.sup ? Object.assign({}, p.sup) : null; o.pu = p.pu ? Object.assign({}, p.pu) : null; o.id = p.id; o.team = p.team; o.slot = p.slot; o.size = p.size; o.nick = p.nick; o.d = p.d; return o; }),
      ball: Object.assign({}, m.ball, { land: m.ball.land ? Object.assign({}, m.ball.land) : null, tried: null }),
      ref: Object.assign({}, m.ref),
      hazards: m.hazards.map(h => Object.assign({}, h)), powerups: m.powerups.map(q => Object.assign({}, q)),
      phase: m.phase, setp: m.setp ? Object.assign({}, m.setp) : null
    };
  }
  /** every step: keep a frame every other step */
  record() { if (this.play) return; if ((this.k++ & 1) === 0) { this.buf.push(this.snap()); if (this.buf.length > this.max) this.buf.shift(); } }
  /** start a replay of the moment at time t (from 2.5 s before to 1 s after it) */
  start(ask) {
    const frames = this.buf.filter(f => f.t >= ask.t - 2.5 && f.t <= ask.t + 1);
    if (frames.length < 20) return false;
    this.play = { frames, i: 0, u: 0, id: ask.id, kind: ask.kind }; this.lastT = this.m.t;
    TT.bus.emit('replayStart', { m: this.m, kind: ask.kind });
    return true;
  }
  /** a step of playback: half speed; returns the view state for this moment (the match with the frame's fields) */
  step(dt) {
    const P = this.play; if (!P) return null;
    P.u += dt * .5 * 60;
    P.i = Math.min(P.frames.length - 1, Math.floor(P.u));
    if (P.u >= P.frames.length - 1) { this.stop(); return null; }
    return this.view();
  }
  view() {
    const P = this.play; if (!P) return null;
    const f = P.frames[P.i], V = Object.create(this.m);
    V.players = f.players; V.ball = f.ball; V.ref = f.ref; V.hazards = f.hazards; V.powerups = f.powerups; V.phase = f.phase === 'try' ? 'play' : f.phase; V.setp = f.setp;
    return V;
  }
  stop() { if (this.play) { this.play = null; TT.bus.emit('replayEnd', { m: this.m }); } }
  focus() { const P = this.play; if (!P) return null; const f = P.frames[P.i], p = f.players[P.id]; return p ? { x: p.x, y: p.y } : { x: f.ball.x, y: f.ball.y }; }
}
TT.Replay = Replay;
