// The host's copy runs the only true sim. It takes intent from seats, sends the world back.
import { applyCommand } from '../sim/commands.js';
import { heroToData } from '../sim/hero.js';
import { emptyIntent } from '../sim/intents.js';
import { encodeSnapshot, wireEvents } from './codec.js';

const SNAP_EVERY = 6;   // 10 Hz at 60 steps a second
const EVENT_EVERY = 12; // 5 Hz

export class NetHost {
  constructor(transport, world, localSeat) {
    this.t = transport;
    this.w = world;
    this.seat = localSeat;
    this.remote = new Map();
    this.press = new Map();
    this.goals = new Map();
    this.queue = [];
    this.cursor = { i: 0 };
    this.tick = 0;
    this.sentHd = new Map();
    this.hdTurn = 0;
    this.stats = { maxS: 0, maxE: 0, sent: 0 };
  }

  onMessage(data, from) {
    switch (data.k) {
      case 'i': {
        const cur = this.remote.get(from);
        if (cur && data.q <= cur.q) return;
        this.remote.set(from, data);
        break;
      }
      case 'p': this.press.set(from, (this.press.get(from) ?? 0) | data.b); if (data.g) this.goals.set(from, data.g); break;
      case 'c': applyCommand(this.w, from, data.c); this.markDirty(from); break;
      default: break;
    }
  }

  markDirty(seat) { this.sentHd.set(seat, ''); }

  /** Intents for every seat, with the local player's merged in. */
  intents(localIntent) {
    const out = [];
    for (const h of this.w.heroes) {
      if (h.gone) continue;
      if (h.seat === this.seat) { out[h.seat] = localIntent ?? emptyIntent(); continue; }
      const it = emptyIntent();
      const r = this.remote.get(h.seat);
      if (r) { it.mx = r.x / 100; it.mz = r.z / 100; it.ax = r.a / 10; it.az = r.b / 10; it.aimed = r.m; it.tgt = r.t; it.held = r.h; }
      it.pressed = this.press.get(h.seat) ?? 0;
      this.press.set(h.seat, 0);
      const g = this.goals.get(h.seat);
      if (g) { it.goal = g; this.goals.delete(h.seat); }
      out[h.seat] = it;
    }
    return out;
  }

  addEvents(list) { for (const e of list) this.queue.push(e); }

  send(data, o) {
    const ok = this.t.send(data, o);
    if (ok) this.stats.sent++;
    return ok;
  }

  /** Once per sim step, even while nothing happens. */
  step() {
    this.tick++;
    if (this.tick % SNAP_EVERY === 0) {
      const s = encodeSnapshot(this.w, this.cursor);
      this.stats.maxS = Math.max(this.stats.maxS, JSON.stringify(s).length);
      this.send(s, { reliable: false });
    }
    if (this.tick % EVENT_EVERY === 0 && this.queue.length) {
      const keep = this.queue;
      const list = wireEvents(keep);
      if (list.length) {
        const msg = { k: 'e', e: list };
        this.stats.maxE = Math.max(this.stats.maxE, JSON.stringify(msg).length);
        if (!this.send(msg, { reliable: true })) keep.unshift(...list);
      }
    }
    if (this.tick % 60 === 0) this.sendHeroData();
  }

  /** Every hero's own pack, to that hero's copy, when it has changed. One a second. */
  sendHeroData() {
    const list = this.w.heroes.filter((h) => !h.gone && h.seat !== this.seat);
    if (!list.length) return;
    this.hdTurn = (this.hdTurn + 1) % list.length;
    const h = list[this.hdTurn];
    const d = heroToData(h);
    for (const it of d.inv) if (it) { delete it.flavor; delete it.powerText; }
    const json = JSON.stringify(d);
    if (this.sentHd.get(h.seat) === json) return;
    if (json.length > 15000) return;
    if (this.send({ k: 'd', d }, { reliable: true, to: h.seat })) this.sentHd.set(h.seat, json);
  }
}
