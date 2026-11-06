// The host's copy runs the sim on a timer, from AIHub.time(): a hidden tab must not stall it, and a server
// copy has no renderer at all.
import { createConfig } from '../core/config.js';
import { OPS, SESSION_OPS } from '../content/ops/index.js';
import { encodeKey, encodeSnap, netEvents } from '../sim/codec.js';
import { createOp, DT, drainEvents, step } from '../sim/op.js';

const hub = () => window.AIHub;

export function chooseRound(info) {
  return SESSION_OPS[(info.round ?? 0) % SESSION_OPS.length].id;
}

export function sessionSeats(info) {
  return info.players.map((p, i) => ({ id: i, surgeon: 'ilya', gift: i % 2 === 0 ? 'quiet' : 'look', name: p.name, playerId: p.id }));
}

export class HostLoop {
  constructor(info) {
    this.info = info;
    this.def = OPS[chooseRound(info)];
    this.seats = sessionSeats(info);
    const rng = hub().rng('deal');
    const seed = Math.floor(rng() * 2147483646) + 1;
    this.sim = createOp(this.def, { seed, seats: this.seats, difficulty: 'resident', config: createConfig() });
    this.inputs = {};
    this.seatByPlayer = new Map(info.players.map((p, i) => [p.id, i]));
    this.localEvents = [];
    this.sendQueue = [];
    this.lastSnap = 0;
    this.lastKey = -1e9;
    this.lastEv = 0;
    this.last = new Map();
    this.finished = false;
    this.running = false;
    this.ticks = 0;
    this.tokens = 40;
    this.tokenAt = 0;
  }
  onInput(data, from) {
    const seat = this.seatByPlayer.get(from);
    if (seat == null || data.t !== 'i') return;
    const prev = this.inputs[seat];
    if (prev && data.n < prev.n) return;
    this.inputs[seat] = { n: data.n, x: data.x / 100, z: data.z / 100, tool: data.tool, use: !!data.use, gift: !!data.gift, steady: !!data.steady, a: !!data.a, b: !!data.b, rot: data.rot ?? 0, force: 1 };
  }
  setLocalInput(seat, inp) { this.inputs[seat] = inp; }
  retire(id) {
    const seat = this.seatByPlayer.get(id);
    if (seat == null) return;
    const s = this.sim.seats[seat];
    s.gone = true;
    if (s.grab) { const e = this.sim.ents.find((o) => o.id === s.grab); if (e) e.holders = Math.max(0, (e.holders ?? 1) - 1); s.grab = null; }
    delete this.inputs[seat];
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.pump(), 16);
    this.snapTimer = setInterval(() => this.net(), 83);
  }
  stop() {
    this.running = false;
    clearInterval(this.timer);
    clearInterval(this.snapTimer);
  }
  pump() {
    const t = hub().time();
    if (t === -Infinity) return;
    if (t < 0) return;
    const target = Math.floor(t / (DT * 1000));
    let n = 0;
    while (this.ticks < target && n < 180 && this.sim.status === 'playing') {
      step(this.sim, this.inputs);
      this.ticks++;
      n++;
      const evs = drainEvents(this.sim);
      if (evs.length) { this.localEvents.push(...evs); this.sendQueue.push(...netEvents(evs)); }
    }
    if (this.sim.status !== 'playing' && !this.finished) this.finish(this.sim.status === 'won');
  }
  /** Token bucket: at most 17 messages a second. */
  send(data, o) {
    const now = performance.now();
    this.tokens = Math.min(30, this.tokens + ((now - this.tokenAt) / 1000) * 18);
    this.tokenAt = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return hub().send(data, o);
  }
  net() {
    if (hub().time() === -Infinity || this.finished) return;
    const now = performance.now();
    this.send(encodeSnap(this.sim, this.last), { reliable: false });
    if (now - this.lastKey >= 1000) {
      this.lastKey = now;
      const key = encodeKey(this.sim);
      let text = JSON.stringify(key);
      if (text.length > 16000) { key.tb.forEach((tb) => { tb.mk = tb.mk.slice(-20); }); text = JSON.stringify(key); }
      this.send(key, { reliable: true });
    }
    if (this.sendQueue.length && now - this.lastEv >= 250) {
      this.lastEv = now;
      const ev = this.sendQueue.splice(0, 40);
      this.send({ t: 'e', ev }, { reliable: true });
    }
  }
  takeLocalEvents() { const e = this.localEvents; this.localEvents = []; return e; }
  finish(won) {
    if (this.finished) return;
    this.finished = true;
    const info = this.info;
    const sim = this.sim;
    const players = info.players.filter((p) => !sim.seats[this.seatByPlayer.get(p.id)]?.gone);
    const rows = players.map((p) => ({ id: p.id, seat: sim.seats[this.seatByPlayer.get(p.id)] }));
    rows.sort((a, b) => b.seat.score - a.seat.score);
    const standings = [];
    for (const r of rows) {
      const last = standings[standings.length - 1];
      if (last && sim.seats[this.seatByPlayer.get(last[0])].score === r.seat.score) last.push(r.id);
      else standings.push([r.id]);
    }
    const scores = Object.fromEntries(rows.map((r) => [r.id, Math.max(0, Math.round(r.seat.score))]));
    const stats = Object.fromEntries(rows.map((r) => [r.id, {
      Clean: String(r.seat.stats.clean), Good: String(r.seat.stats.good), Sloppy: String(r.seat.stats.sloppy), Mistakes: String(r.seat.stats.mistakes), Stitches: String(r.seat.stats.stitches), Doses: String(r.seat.stats.doses),
    }]));
    const awards = [];
    const best = (fn) => rows.slice().sort((a, b) => fn(b) - fn(a))[0];
    const hand = rows.filter((r) => r.seat.stats.cuts > 0).sort((a, b) => a.seat.stats.cutDev / a.seat.stats.cuts - b.seat.stats.cutDev / b.seat.stats.cuts)[0];
    if (hand) awards.push({ id: hand.id, title: 'STEADIEST HAND', detail: 'The straightest cuts at the table' });
    const st = best((r) => r.seat.stats.stitches);
    if (st && st.seat.stats.stitches > 0) awards.push({ id: st.id, title: 'MOST STITCHES', detail: `${st.seat.stats.stitches} stitches tied` });
    const sv = best((r) => r.seat.stats.saves + r.seat.stats.doses);
    if (sv && sv.seat.stats.saves + sv.seat.stats.doses > 0) awards.push({ id: sv.id, title: 'SAVED THE DAY', detail: 'Doses and paddles when it counted' });
    const sl = best((r) => r.seat.stats.sloppy + r.seat.stats.mistakes * 2);
    if (sl && sl.seat.stats.sloppy + sl.seat.stats.mistakes > 0) awards.push({ id: sl.id, title: 'SLOPPIEST', detail: 'Enthusiasm is also a skill' });
    this.flushFinal();
    hub().finish({ standings, scores, won, stats, awards });
    this.stop();
  }
  flushFinal() {
    if (this.sendQueue.length) hub().send({ t: 'e', ev: this.sendQueue.splice(0, 60) }, { reliable: true });
  }
}
