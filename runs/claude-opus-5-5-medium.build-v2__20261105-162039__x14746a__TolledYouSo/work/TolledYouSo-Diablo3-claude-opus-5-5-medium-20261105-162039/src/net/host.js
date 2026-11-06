// The host's sim is the only truth: it takes intents and commands, and sends the world back.
import { applyCommand } from '../sim/commands.js';
import { batchEvents, encodeSnapshot, expandIntent, heroSheet, LOCAL_EVENTS } from './codec.js';

export class NetHost {
  constructor(transport, world) {
    this.t = transport; this.w = world; this.isHost = true; this.remote = {}; this.pressed = {}; this.cursor = 0; this.eventQ = []; this.tick = 0; this.sheetDirty = new Set(); this.sheetT = 0; this.sent = { s: 0, e: 0, maxS: 0, maxE: 0, count: 0 }; this.pendingCmd = [];
    transport.on((data, from) => this.onMessage(data, from));
  }
  onMessage(m, from) {
    if (m.k === 'i') this.remote[from] = expandIntent(m);
    else if (m.k === 'c') { for (const p of m.p ?? []) { (this.pressed[from] ??= {})[p] = true; } for (const c of m.cmd ?? []) if (this.safeCommand(c)) applyCommand(this.w, from, c); if (m.iid !== undefined) (this.pressed[from] ??= {}).__iid = m.iid; }
  }
  safeCommand(c) { return c && c.c !== 'dev' && c.c !== 'travel' && c.c !== 'bell' && c.c !== 'knell'; }
  remoteIntent(seat) {
    const base = this.remote[seat] ?? { moveX: 0, moveZ: 0, pressed: {}, held: {} }; const p = this.pressed[seat];
    if (p) { const iid = p.__iid; delete p.__iid; base.pressed = { ...p }; if (iid !== undefined) base.interactId = iid; this.pressed[seat] = null; } else { base.pressed = {}; base.interactId = undefined; }
    return base;
  }
  beat() { const { msg } = encodeSnapshot(this.w, this.cursor); this.t.send(msg, { reliable: false }); this.sent.s++; }
  // Called once per fixed step on the host, after the sim moved.
  afterStep() {
    this.tick++;
    if (this.tick % 6 === 0) { const { msg, cursor } = encodeSnapshot(this.w, this.cursor); this.cursor = cursor; const size = JSON.stringify(msg).length; this.sent.maxS = Math.max(this.sent.maxS, size); this.t.send(msg, { reliable: false }); this.sent.s++; this.sent.count++; }
    if (this.tick % 12 === 0) this.flushEvents();
    if (this.tick % 30 === 0) for (const seat of this.sheetDirty) { const h = this.w.heroes.find((q) => q.seat === seat); if (h && seat !== this.t.me) { this.t.send({ k: 'sheet', d: heroSheet(h) }, { to: seat, reliable: true }); this.sent.count++; } this.sheetDirty.delete(seat); }
  }
  flushEvents() {
    if (!this.eventQ.length) return;
    const batch = batchEvents(this.eventQ); const msg = { k: 'e', v: batch }; const size = JSON.stringify(msg).length; this.sent.maxE = Math.max(this.sent.maxE, size);
    this.t.send(msg, { reliable: true }); this.sent.e++; this.sent.count++;
  }
  outgoing(events) {
    for (const ev of events) {
      if (ev.t === 'sheet') { this.sheetDirty.add(ev.seat); continue; }
      if (ev.t === 'level' || ev.t === 'equip') this.sheetDirty.add(ev.seat);
      if (LOCAL_EVENTS.has(ev.t)) continue;
      this.eventQ.push(strip(ev));
    }
  }
}
function strip(ev) { const o = {}; for (const k of Object.keys(ev)) { const v = ev[k]; if (v === undefined || typeof v === 'function') continue; o[k] = typeof v === 'number' ? Math.round(v * 100) / 100 : v; } return o; }
