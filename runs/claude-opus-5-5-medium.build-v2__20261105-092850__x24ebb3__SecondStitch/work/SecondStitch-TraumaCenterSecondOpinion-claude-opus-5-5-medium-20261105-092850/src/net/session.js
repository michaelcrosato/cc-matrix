// AI Hub session: one sim on the host's timer, inputs in, snapshots out. The view reads a plain state object.
import { app } from '../core/app.js';
import { correctDrift } from '../input/cursor.js';
import { createOp, drainEvents, step } from '../sim/op.js';
import { OPS, SESSION_LIST } from '../content/ops/index.js';
import { applySnap, decodeKey, encodeKey, encodeSnap, NET_EVENTS, smoothState } from '../sim/codec.js';
import { awardsFor, results } from '../sim/scoring.js';

const HUB = () => window.AIHub;
const TICK = 1000 / 60;

export class NetSession {
  constructor(info) {
    this.info = info;
    const hub = HUB();
    this.players = info.players;
    this.opId = SESSION_LIST[(info.round ?? 0) % SESSION_LIST.length];
    this.def = OPS[this.opId];
    this.mySeat = this.players.findIndex((p) => p.id === info.me);
    this.isHost = hub.isHost; this.server = !!info.server;
    this.colors = this.players.map((p) => parseInt(String(p.color).replace('#', ''), 16) || 0xffffff);
    const seedRng = hub.rng('deal');
    const seed = Math.floor(seedRng() * 1e9);
    const gifts = this.players.map((_, i) => (i % 2 === 0 ? 'quiet' : 'look'));
    this.sim = createOp(this.def, { seed, seats: this.players.length, difficulty: 'resident', gifts, cfg: { ...app.config }, session: true });
    this.state = this.sim;
    this.inputs = this.players.map(() => null);
    this.events = []; this.outEvents = [];
    this.n = 0; this.steps = 0; this.acc = 0; this.finished = false; this.ended = false;
    this.tokens = 40; this.lastTok = 0;
    hub.on('message', (m, from) => this.onMessage(m, from));
    hub.on('leave', ({ id }) => this.retire(id));
    hub.on('time-up', () => { if (this.isHost) this.finish(false); });
    hub.on('end', () => this.onEnd());
    if (this.isHost) this.startHost();
    else this.inputTimer = setInterval(() => this.sendInput(), 1000 / 15);
  }
  attach(stage) { this.stage = stage; }
  detach() {}
  seatOf(id) { return this.players.findIndex((p) => p.id === id); }
  retire(id) { const i = this.seatOf(id); if (i >= 0 && this.sim.seats[i]) { this.sim.seats[i].out = true; this.inputs[i] = null; } }
  send(data, opts) {
    const hub = HUB(), now = performance.now();
    this.tokens = Math.min(30, this.tokens + ((now - this.lastTok) / 1000) * 18);
    this.lastTok = now;
    if (this.tokens < 1) return false;
    this.tokens--;
    return hub.send(data, opts);
  }
  /* host */
  startHost() {
    this.nextSnap = 0; this.nextKey = 0; this.nextEvents = 0;
    this.hostTimer = setInterval(() => this.hostTick(), 25);
  }
  hostTick() {
    const hub = HUB(), t = hub.time();
    if (this.ended || !(t >= 0)) { if (this.ended) clearInterval(this.hostTimer); else if (t > -Infinity && performance.now() > this.nextKey) { this.nextKey = performance.now() + 1000; this.send({ t: 'k2', k: encodeKey(this.sim) }, { reliable: true }); } return; }
    if (!this.finished) {
      const want = Math.floor(t / TICK);
      let guard = 0;
      while (this.steps < want && guard++ < 30) {
        this.steps++;
        step(this.sim, this.inputs.map((i) => i ?? {}));
        for (const i of this.inputs) if (i) { i.drop = false; i.tag = false; }
      }
      if (this.steps < want) this.steps = want; // a long stall: don't spiral
      for (const e of drainEvents(this.sim)) { this.events.push(e); if (NET_EVENTS.has(e.t) && this.outEvents.length < 60) this.outEvents.push(e); }
      if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
      if (this.sim.phase === 'won' || this.sim.phase === 'lost') this.finish(this.sim.phase === 'won');
    }
    const now = performance.now();
    if (now >= this.nextSnap) { this.nextSnap = now + 1000 / 12; this.send(encodeSnap(this.sim, this.n++), { reliable: false }); }
    if (now >= this.nextKey) { this.nextKey = now + 1000; this.send({ t: 'k2', k: encodeKey(this.sim) }, { reliable: true }); }
    if (now >= this.nextEvents && this.outEvents.length) { this.nextEvents = now + 250; const batch = this.outEvents.splice(0, 30); this.send({ t: 'e', e: batch }, { reliable: true }); }
  }
  finish(won) {
    if (this.finished) return;
    this.finished = true;
    const hub = HUB(), sim = this.sim, here = this.players.filter((p, i) => !sim.seats[i].out);
    const scores = {}; here.forEach((p) => { scores[p.id] = sim.seats[this.seatOf(p.id)].score; });
    const sorted = [...here].sort((a, b) => scores[b.id] - scores[a.id]);
    const standings = []; for (const p of sorted) { const last = standings[standings.length - 1]; if (last && scores[last[0]] === scores[p.id]) last.push(p.id); else standings.push([p.id]); }
    const stats = {}; here.forEach((p) => { const s = sim.seats[this.seatOf(p.id)]; stats[p.id] = { SCORE: String(s.score), CLEAN: String(s.ratings.CLEAN), SLOPPY: String(s.ratings.SLOPPY), MISTAKES: String(s.ratings.MISTAKE), STITCHES: String(s.stitches), SAVES: String(s.saves) }; });
    const awards = awardsFor(here.map((p) => ({ ...sim.seats[this.seatOf(p.id)], id: p.id })));
    hub.finish({ standings, scores, won, stats, awards });
    void results;
  }
  /* client */
  sendInput() {
    const hub = HUB();
    if (this.ended) { clearInterval(this.inputTimer); return; }
    if (this.server) return;
    const i = this.local ?? { x: 0, z: 0, tool: 'drain', use: 0 };
    this.send({ t: 'i', n: this.n++, x: Math.round(i.x * 100) / 100, z: Math.round(i.z * 100) / 100, tool: i.tool, use: Math.round((i.use ?? 0) * 100) / 100, gift: i.gift ? 1 : 0, steady: i.steady ? 1 : 0, drop: this.dropLatch ? 1 : 0, rot: i.rot ?? 0, padL: i.padL ? 1 : 0, padR: i.padR ? 1 : 0, table: i.table ?? 0 }, { to: hub.host, reliable: false });
    this.dropLatch = false;
  }
  onMessage(m, from) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'i' && this.isHost) {
      const seat = this.seatOf(from);
      if (seat >= 0) {
        const prev = this.inputs[seat];
        this.inputs[seat] = { x: m.x, z: m.z, tool: m.tool, use: m.use, gift: !!m.gift, steady: !!m.steady, drop: !!m.drop || !!prev?.drop, rot: m.rot, padL: !!m.padL, padR: !!m.padR, table: m.table };
      }
      return;
    }
    if (this.isHost) return;
    if (m.t === 's') { if (this.keyed) applySnap(this.state, m, this.mySeat); this.got = true; return; }
    if (m.t === 'k2') { decodeKey(m.k, this.state); this.keyed = true; return; }
    if (m.t === 'e') { this.events.push(...m.e); return; }
  }
  onEnd() {
    this.ended = true;
    clearInterval(this.hostTimer); clearInterval(this.inputTimer);
    if (app.engine) { app.engine.audio.playMusic(null); app.engine.audio.stopLoops(); }
  }
  /* view hooks */
  fixed(ctx, dt, stage) {
    if (this.ended || this.server) return;
    const seat = this.state.seats[this.mySeat];
    if (!seat) return;
    if (HUB().time() < 0) return;
    const i = stage.readSeat(ctx, seat, { device: 'auto' }, dt);
    this.local = i;
    if (i.drop) this.dropLatch = true;
    if (this.isHost) this.inputs[this.mySeat] = { ...i };
    else {
      // our tip moves at once; correct gently only if it drifts over a unit.
      seat.x = i.x; seat.z = i.z; seat.tool = i.tool; seat.useHeld = (i.use ?? 0) > 0.15; seat.table = i.table ?? seat.table;
      correctDrift(stage.tips[this.mySeat], seat.serverX, seat.serverZ);
    }
  }
  drain() {
    if (!this.isHost && this.state) smoothState(this.state, 1 / 60);
    const e = this.events; this.events = [];
    return e;
  }
  drawOverlay(ctx, sim) {
    const hub = HUB(), { hud } = ctx, t = hub.time();
    if (t < 0) { const n = Math.ceil(-t / 1000), s = String(n), w = hud.measure(s, 4).width; hud.text(Math.round(hud.width / 2 - w / 2), Math.round(hud.height / 2 - 30), s, { scale: 4, color: 0xffd24d }); }
    this.players.forEach((p, i) => { const y = 42 + i * 10, sc = sim.seats[i]?.score ?? 0; hud.rect(4, y + 1, 4, 5, this.colors[i]); hud.text(11, y, `${String(p.name).slice(0, 10)} ${sc}`, { color: sim.seats[i]?.out ? 0x5a6172 : 0xffffff }); });
  }
}
