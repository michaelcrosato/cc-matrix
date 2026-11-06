import { DT, clamp, tickOf } from './config.js';
import {
  createWorld,
  command,
  step,
  finish,
  pack,
  unpack,
  health,
  cancel,
} from './sim.js';
export class Transport {
  constructor(hub, clock = () => performance.now()) {
    this.hub = hub;
    this.clock = clock;
    this.queue = [];
    this.tokens = 26;
    this.refill = clock();
    this.lastSnap = -1000;
    this.stopped = false;
    this.metrics = {
      sent: 0,
      bytes: 0,
      retries: 0,
      rejected: 0,
      maxBytes: 0,
      maxSnapshot: 0,
      packets: [],
    };
  }
  enqueue(data, options = {}) {
    if (this.stopped) return false;
    let raw;
    try {
      raw = JSON.stringify(data);
    } catch {
      this.metrics.rejected++;
      return false;
    }
    const bytes = new TextEncoder().encode(raw).length;
    if (bytes > 16000) {
      this.metrics.rejected++;
      return false;
    }
    const critical =
      (data.t === 'c' && data.c?.kind === 'cancel') ||
      (data.t === 'b' && data.f === 1);
    // Keep eight ordered slots for cancellation and the final authoritative state.
    if (this.queue.length >= (critical ? 64 : 56)) {
      this.metrics.rejected++;
      return false;
    }
    this.queue.push({ data, options: { reliable: true, ...options }, bytes });
    return true;
  }
  send(data, options = {}) {
    const raw = JSON.stringify(data),
      bytes = new TextEncoder().encode(raw).length;
    if (bytes > 16000) {
      this.metrics.rejected++;
      return false;
    }
    return this.trySend({ data, options, bytes });
  }
  trySend(m) {
    if (this.stopped) return false;
    const now = this.clock();
    this.tokens = Math.min(26, this.tokens + (now - this.refill) * 0.014);
    this.refill = now;
    if (this.tokens < 1) return false;
    if (!this.hub.send(m.data, m.options)) {
      this.metrics.retries++;
      return false;
    }
    this.tokens--;
    this.metrics.sent++;
    this.metrics.bytes += m.bytes;
    this.metrics.maxBytes = Math.max(this.metrics.maxBytes, m.bytes);
    if (m.data.t === 's')
      this.metrics.maxSnapshot = Math.max(this.metrics.maxSnapshot, m.bytes);
    this.metrics.packets.push([now, m.bytes, m.options.reliable !== false]);
    if (this.metrics.packets.length > 1000) this.metrics.packets.shift();
    return true;
  }
  flush() {
    while (this.queue.length && this.trySend(this.queue[0])) this.queue.shift();
  }
  stop() {
    this.stopped = true;
    this.queue = [];
  }
}
export class OnlineMatch {
  constructor(hub, { onWorld, onEnd, onEvent } = {}) {
    this.hub = hub;
    this.onWorld = onWorld;
    this.onEnd = onEnd;
    this.onEvent = onEvent;
    this.info = null;
    this.world = null;
    this.transport = new Transport(hub);
    this.started = false;
    this.ended = false;
    this.finished = false;
    this.seq = 0;
    this.snapSeq = 0;
    this.lastSeq = -1;
    this.ack = -1;
    this.lastSnapshot = -1000;
    this.lastBaseline = -10000;
    this.lastEvent = 0;
    this.pendingFinish = false;
    this.intentStart = null;
    this.localPower = null;
    this.leavers = new Set();
    this.beginTimes = new Map();
    this.unsub = [];
  }
  async connect() {
    const info = await this.hub.connect({
      mode: 'shared-world',
      seats: [2, 2],
    });
    if (!info) return null;
    this.info = info;
    this.world = createWorld({
      mode: 'hub',
      court: 4,
      seed: info.seed || 71,
      duration: Math.min(180, (info.limitMs || 180000) / 1000),
    });
    this.seat = info.server
      ? null
      : info.players.findIndex((p) => p.id === info.me);
    if (this.seat < 0) this.seat = null;
    const on = (event, fn) => this.unsub.push(this.hub.on(event, fn));
    on('start', () => {
      this.started = true;
      if (info.isHost) this.baseline();
    });
    on('message', (data, from) => this.message(data, from));
    on('leave', ({ id }) => {
      this.leavers.add(id);
      const seat = info.players.findIndex((p) => p.id === id);
      if (seat >= 0 && info.isHost) {
        cancel(this.world, seat, false);
        if (this.started && !this.finished)
          finish(this.world, 'opponent left', 1 - seat);
        this.pendingFinish = true;
      }
    });
    on('time-up', () => {
      if (info.isHost && !this.finished) {
        finish(this.world, 'timeout');
        this.pendingFinish = true;
        this.finalize();
      }
    });
    on('end', (e) => {
      this.ended = true;
      this.transport.stop();
      this.intentStart = null;
      this.localPower = null;
      this.onEnd?.(e);
    });
    this.onWorld?.(this.world);
    this.hub.ready();
    return info;
  }
  intent(kind, stone) {
    if (
      this.ended ||
      !this.started ||
      this.hub.time() < 0 ||
      this.seat === null
    )
      return false;
    const now = this.hub.time() / 1000;
    const c = { kind, seq: ++this.seq, at: now };
    if (kind === 'stone') c.stone = stone;
    if (kind === 'begin') this.intentStart = now;
    if (kind === 'release') {
      c.duration =
        this.intentStart === null ? 0 : clamp(now - this.intentStart, 0, 3);
      this.intentStart = null;
    }
    if (kind === 'cancel') this.intentStart = null;
    if (this.info.isHost) return this.receiveIntent(c, this.info.me);
    return this.transport.enqueue({ t: 'c', c }, { to: this.info.host });
  }
  receiveIntent(c, from) {
    if (
      !this.info.isHost ||
      this.ended ||
      !this.started ||
      this.hub.time() < 0 ||
      !c ||
      typeof c !== 'object'
    )
      return false;
    const seat = this.info.players.findIndex((p) => p.id === from);
    if (
      seat < 0 ||
      this.leavers.has(from) ||
      !Number.isSafeInteger(c.seq) ||
      !['begin', 'release', 'cancel', 'stone'].includes(c.kind) ||
      !Number.isFinite(c.at)
    )
      return false;
    const now = this.hub.time() / 1000;
    if (c.at > now + 0.25 || c.at < now - 2.5) return false;
    if (
      c.kind === 'release' &&
      (!Number.isFinite(c.duration) || c.duration < 0 || c.duration > 3)
    )
      return false;
    return command(this.world, seat, c);
  }
  message(m, from) {
    if (this.ended || !m || typeof m !== 'object') return;
    if (this.info.isHost) {
      if (m.t === 'c') this.receiveIntent(m.c, from);
      else if (
        m.t === 'ack' &&
        this.info.players.some((p) => p.id === from) &&
        Number.isInteger(m.n)
      )
        this.ack = Math.max(this.ack, m.n);
      return;
    }
    if (from !== this.info.host) return;
    if (m.t === 'b' && m.v === 1 && Number.isInteger(m.n))
      this.transport.enqueue({ t: 'ack', n: m.n }, { to: this.info.host });
    if (
      (m.t === 'b' || m.t === 's') &&
      m.v === 1 &&
      Number.isInteger(m.n) &&
      m.n > this.lastSeq
    ) {
      if (unpack(this.world, m)) {
        this.lastSeq = m.n;
      }
    }
    if (m.t === 'e' && Number.isInteger(m.n) && m.n > (this.eventSeq ?? -1)) {
      this.eventSeq = m.n;
      for (const e of m.e || []) this.onEvent?.(e);
    }
  }
  baseline() {
    const p = pack(this.world, ++this.snapSeq);
    p.t = 'b';
    this.transport.enqueue(p);
    this.lastBaseline = this.hub.time();
  }
  update() {
    if (this.ended || !this.info) return;
    this.transport.flush();
    const ms = this.hub.time();
    if (!this.started || ms < 0) return;
    if (this.info.isHost) {
      const target = Math.min(this.world.deadline, Math.floor(ms / 1000 / DT));
      let n = 0;
      while (
        this.world.tick < target &&
        this.world.phase === 'playing' &&
        n++ < 600
      )
        step(this.world);
      const events = this.world.events.splice(0);
      if (events.length) {
        for (const e of events) this.onEvent?.(e);
        this.transport.enqueue({
          t: 'e',
          n: ++this.lastEvent,
          e: events.filter((e) => e.type !== 'fall' || e.id % 2 === 0),
        });
      }
      if (ms - this.lastBaseline >= 2000) this.baseline();
      if (ms - this.lastSnapshot >= 140 && this.transport.queue.length === 0) {
        const snap = pack(this.world, ++this.snapSeq);
        if (JSON.stringify(snap).length <= 1200) {
          this.transport.send(snap, { reliable: false });
        } else this.transport.enqueue({ ...snap, t: 'b' });
        this.lastSnapshot = ms;
      }
      if (this.world.outcome && !this.finished) {
        this.pendingFinish = true;
        this.finalize();
      }
    }
    this.transport.flush();
  }
  finalize() {
    if (!this.info?.isHost || this.finished || this.ended) return;
    const w = this.world;
    if (!w.outcome) finish(w, 'timeout');
    if (!this.finalQueued) {
      this.baseline();
      this.finalQueued = true;
    }
    this.transport.flush();
    if (this.transport.queue.length) return;
    const ids = this.info.players
        .map((p) => p.id)
        .filter((id) => !this.leavers.has(id)),
      winner = w.outcome.winner,
      winid = winner >= 0 ? this.info.players[winner]?.id : null;
    const standings =
      winner < 0
        ? [ids]
        : [
            ids.filter((id) => id === winid),
            ids.filter((id) => id !== winid),
          ].filter((a) => a.length);
    const scores = Object.fromEntries(
      this.info.players.map((p, i) => [
        p.id,
        Math.round(health(w, i) * 1000) + w.players[i].score,
      ]),
    );
    this.finished = true;
    this.hub.finish({ standings, scores });
    this.pendingFinish = false;
  }
  dispose() {
    this.ended = true;
    this.transport.stop();
    for (const f of this.unsub) f();
  }
}
