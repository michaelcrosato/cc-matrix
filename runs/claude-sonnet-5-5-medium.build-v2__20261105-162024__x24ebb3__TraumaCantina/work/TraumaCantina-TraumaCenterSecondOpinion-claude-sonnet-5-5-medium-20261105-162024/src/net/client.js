// A non-host copy: sends its player's input at 15 Hz, renders from keyframes and snapshots the host sends.
import { createOp } from '../sim/op.js';
import { cfg } from '../core/config.js';
import { decodeKey, applySnap } from './codec.js';
const TOOLN = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];
export class ClientSim {
  constructor(AIHub, info, def) {
    this.hub = AIHub; this.info = info; this.def = def; this.me = info.players.findIndex((p) => p.id === info.me);
    this.sim = createOp(def, { seed: 1, seats: info.players.map((p, i) => ({ id: i, doctor: i % 2 === 0 ? 'ilya' : 'sabine' })), quietOn: true, humans: info.players.length }); this.sim.hintOn = true;
    this.sim.seats.forEach((s, i) => (s.local = i === this.me)); this.evq = []; this.n = 0; this.lastSend = 0; this.cur = null; this.lastSnapN = 0;
  }
  onMessage(d) {
    if (d.t === 'k') { decodeKey(d.k, this.sim); for (const e of d.k.ev || []) this.evq.push(e); this.sim.seats.forEach((s, i) => (s.local = i === this.me)); }
    else if (d.t === 's') { if (d.n > this.lastSnapN) { this.lastSnapN = d.n; applySnap(this.sim, d); } }
  }
  drain() { const e = this.evq; this.evq = []; return e; }
  localStep(inp, dt) { // same integrator as the sim's cursors, applied to our own tip at once
    const s = this.sim.seats[this.me]; if (!s) return;
    if (inp.px !== null && inp.px !== undefined) { s.x = Math.max(-7.6, Math.min(7.6, inp.px)); s.z = Math.max(-4.2, Math.min(4.2, inp.pz)); }
    else { const m = Math.hypot(inp.ax || 0, inp.az || 0); if (m > 0.01) { const sp = cfg.cursorSpeed * Math.pow(Math.min(1, m), 2.2) * (inp.steady ? cfg.steadyFactor : 1); s.x = Math.max(-7.6, Math.min(7.6, s.x + ((inp.ax || 0) / m) * sp * dt)); s.z = Math.max(-4.2, Math.min(4.2, s.z + ((inp.az || 0) / m) * sp * dt)); } }
    if (s.tx !== undefined && Math.hypot(s.x - s.tx, s.z - s.tz) > 1.5) { s.x += (s.tx - s.x) * 0.2; s.z += (s.tz - s.z) * 0.2; }
    s.sel = inp.tool && this.sim.unlocked.includes(inp.tool) ? inp.tool : s.sel; s.tool = s.sel; s.use = !!inp.use;
  }
  send(inp, ms) {
    this.cur = inp; if (ms - this.lastSend < 66) return; this.lastSend = ms; const s = this.sim.seats[this.me];
    this.hub.send({ t: 'i', n: ++this.n, x: Math.round(s.x * 100) / 100, z: Math.round(s.z * 100) / 100, tool: TOOLN.indexOf(s.sel), use: s.use ? 1 : 0, use2: inp.use2 ? 1 : 0, gift: inp.gift ? 1 : 0, steady: inp.steady ? 1 : 0 }, { to: this.hub.host, reliable: false });
  }
}
