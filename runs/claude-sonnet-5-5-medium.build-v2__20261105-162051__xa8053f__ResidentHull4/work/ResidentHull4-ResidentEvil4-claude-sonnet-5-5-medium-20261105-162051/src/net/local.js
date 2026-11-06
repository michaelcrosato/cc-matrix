// LocalSession: the AIHub interface for parties outside the hub. Same-computer (BroadcastChannel) and two-computer (WebRTC invite codes).
import { SLUG } from '../config.js';

export const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
export const SEAT_NAMES = ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4'];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

class Emitter { constructor() { this.h = {}; } on(e, f) { (this.h[e] ||= []).push(f); (this._q?.[e] || []).splice(0).forEach((a) => f(...a)); return () => { this.h[e] = (this.h[e] || []).filter((x) => x !== f); }; } emit(e, ...a) { const hs = this.h[e]; if (!hs || !hs.length) { (this._q ||= {})[e] ||= []; this._q[e].push(a); return; } for (const f of [...hs]) f(...a); } }

/** A message bus between copies. send(msg) reaches every other peer (or msg.to). */
export class BroadcastBus {
  constructor(name) { this.ch = new BroadcastChannel(name); this.cb = null; this.ch.onmessage = (e) => this.cb?.(e.data); }
  send(m) { this.ch.postMessage(m); }
  close() { this.ch.close(); }
}
/** A bus over WebRTC data channels in a star: the host holds one link per guest. */
export class RtcBus {
  constructor(isHost, stun = true) { this.isHost = isHost; this.cb = null; this.links = new Map(); this.stun = stun; this.guestLink = null; }
  cfg() { return { iceServers: this.stun ? [{ urls: 'stun:stun.l.google.com:19302' }] : [] }; }
  async _gather(pc) { if (pc.iceGatheringState === 'complete') return; await new Promise((res) => { const f = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', f); res(); } }; pc.addEventListener('icegatheringstatechange', f); setTimeout(res, 4000); }); }
  _wire(link, dc) { dc.onmessage = (e) => { try { this.cb?.(JSON.parse(e.data)); } catch { /* bad */ } }; link.dc = dc; }
  /** Host: make an offer code for one guest. */
  async hostOffer(slot) {
    const pc = new RTCPeerConnection(this.cfg()); const dc = pc.createDataChannel('rel', { ordered: true }); const un = pc.createDataChannel('un', { ordered: false, maxRetransmits: 0 });
    const link = { pc, slot, dc, un, open: false }; this.links.set(slot, link);
    this._wire(link, dc); un.onmessage = dc.onmessage; dc.onopen = () => { link.open = true; this.onopen?.(slot); };
    await pc.setLocalDescription(await pc.createOffer()); await this._gather(pc);
    return btoa(JSON.stringify(pc.localDescription));
  }
  async hostAccept(slot, answerCode) { const link = this.links.get(slot); await link.pc.setRemoteDescription(JSON.parse(atob(answerCode))); }
  /** Guest: take an offer code, return an answer code. */
  async guestAnswer(offerCode) {
    const pc = new RTCPeerConnection(this.cfg()); const link = { pc, open: false }; this.guestLink = link;
    pc.ondatachannel = (e) => { if (e.channel.label === 'rel') { link.dc = e.channel; this._wire(link, e.channel); e.channel.onopen = () => { link.open = true; this.onopen?.(0); }; } else { link.un = e.channel; e.channel.onmessage = (ev) => { try { this.cb?.(JSON.parse(ev.data)); } catch { /* */ } }; } };
    await pc.setRemoteDescription(JSON.parse(atob(offerCode))); await pc.setLocalDescription(await pc.createAnswer()); await this._gather(pc);
    return btoa(JSON.stringify(pc.localDescription));
  }
  send(m) {
    const raw = JSON.stringify(m);
    if (this.isHost) { for (const [slot, l] of this.links) { if (typeof m.to === 'number' && m.to !== slot + 1) continue; const ch = m.u && l.un?.readyState === 'open' ? l.un : l.dc; if (ch?.readyState === 'open') ch.send(raw); } }
    else { const l = this.guestLink; const ch = m.u && l?.un?.readyState === 'open' ? l.un : l?.dc; if (ch?.readyState === 'open') ch.send(raw); }
  }
  close() { for (const l of this.links.values()) l.pc.close(); this.guestLink?.pc.close(); }
}

export class LocalSession extends Emitter {
  constructor(bus, o = {}) {
    super();
    this.bus = bus; this.active = false; this.mode = 'shared-world'; this.isHost = !!o.host; this.me = o.host ? 0 : -1; this.host = 0; this.server = false; this.players = []; this.seed = o.seed || 1; this.limitMs = 0; this.round = 1;
    this.id = o.id || Math.random().toString(36).slice(2, 8); this.name = o.name || SEAT_NAMES[0]; this.t0 = null; this.clockOffset = 0; this.state = 'lobby'; this.last = {}; this.hb = null; this.hosts = new Map(); this.peers = new Map(); this._seq = 0; this.localOnly = false;
    this.now = o.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    bus.cb = (m) => this._recv(m);
    if (this.isHost) { this.players = [{ id: 0, name: this.name, color: SEAT_COLORS[0], pid: this.id }]; this.announce(); }
    else this.bus.send({ t: 'who', id: this.id });
    this.tick = setInterval?.(() => this._tick(), 500);
  }
  _tick() {
    const n = this.now();
    if (this.isHost && this.state === 'lobby') this.announce();
    if (this.state !== 'ended') {
      this.bus.send({ t: 'hb', from: this.me, id: this.id });
      if (this.state === 'playing' || this.state === 'start') {
        if (this.isHost) { for (const [pid, last] of this.peers) if (n - last > 4000) { this.peers.delete(pid); const p = this.players.find((q) => q.pid === pid); if (p) { this.emit('leave', { id: p.id, reason: 'disconnected' }); this.players = this.players.filter((q) => q !== p); } } }
        else if (this.last.host && n - this.last.host > 4000) this.end('host-left');
      }
    }
  }
  announce() { this.bus.send({ t: 'host', id: this.id, name: this.name, count: this.players.length, max: 4 }); }
  join(hostId) { this.hostId = hostId; this.bus.send({ t: 'join', id: this.id, to: hostId, name: this.name }); }
  _recv(m) {
    const n = this.now();
    if (m.t === 'host' && !this.isHost) { this.hosts.set(m.id, { ...m, at: n }); this.emit('hosts', [...this.hosts.values()]); return; }
    if (m.t === 'who' && this.isHost && this.state === 'lobby') { this.announce(); return; }
    if (m.t === 'join' && this.isHost && (m.to === this.id || m.to === '*') && this.state === 'lobby') {
      if (this.players.length < 4 && !this.players.find((p) => p.pid === m.id)) { const seat = this.players.length; this.players.push({ id: seat, name: SEAT_NAMES[seat], color: SEAT_COLORS[seat], pid: m.id }); }
      this.bus.send({ t: 'roster', players: this.players, to: 'all' }); this.emit('roster', this.players); return;
    }
    if (m.t === 'roster' && !this.isHost) { this.players = m.players; const me = m.players.find((p) => p.pid === this.id); if (me) this.me = me.id; this.emit('roster', this.players); return; }
    if (m.t === 'start') {
      if (this.isHost) return;
      this.seed = m.seed; this.state = 'start'; this.limitMs = m.limitMs || 0;
      this.pingBest = null; this.bus.send({ t: 'ping', id: this.id, c: n }); this.startAt = m.in; this.startRecv = n;
      this.emit('start', { in: m.in }); return;
    }
    if (m.t === 'ping' && this.isHost) { this.bus.send({ t: 'pong', to: m.id, c: m.c, h: n }); this.peers.set(m.id, n); return; }
    if (m.t === 'pong' && m.to === this.id) { const rtt = n - m.c; if (!this.pingBest || rtt < this.pingBest) { this.pingBest = rtt; this.clockOffset = m.h - (m.c + rtt / 2); } return; }
    if (m.t === 'hb') { if (this.isHost) this.peers.set(m.id, n); else if (m.from === 0) this.last.host = n; return; }
    if (m.t === 'end') { this.end(m.reason, m.standings, true); return; }
    if (m.t === 'm') {
      if (m.to !== undefined && m.to !== this.me && m.to !== 'all') return;
      if (m.from === this.me) return;
      this.emit('message', m.data, m.from); return;
    }
  }
  /** Host: start the shared 3 second countdown. */
  start(limitMs = 0) {
    if (!this.isHost) return; this.state = 'start'; this.seed = (Math.random() * 1e9) | 0; this.limitMs = limitMs;
    this.t0 = this.now() + 3000; this.bus.send({ t: 'start', seed: this.seed, in: 3000, limitMs });
    this.emit('start', { in: 3000 }); this.state = 'playing'; this.last.host = this.now();
  }
  time() { if (this.t0 === null && this.startAt !== undefined) { this.t0 = this.startRecv + this.startAt - this.clockOffset * 0; this.state = 'playing'; this.last.host = this.now(); } if (this.t0 === null) return -Infinity; return this.now() - this.t0; }
  rng(label) { return mulberry(this.seed ^ hash(label)); }
  send(data, o = {}) {
    const raw = JSON.stringify(data); if (raw.length > 16384) return false;
    this.bus.send({ t: 'm', from: this.me, to: o.to, data, u: o.reliable === false }); return true;
  }
  ready() { this.emit('ready'); }
  finish(o) { if (!this.isHost || this.state === 'ended') return; this.bus.send({ t: 'end', reason: 'finished', standings: o.standings, result: o }); this.end('finished', o.standings, false, o); }
  end(reason, standings, remote, result) { if (this.state === 'ended') return; this.state = 'ended'; clearInterval?.(this.tick); this.emit('end', { reason, standings, result }); }
  leave() { this.state = 'ended'; clearInterval?.(this.tick); try { this.bus.close(); } catch { /* */ } }
  answer() {}
  fail() {}
  progress() {}
}

/** Two or more sessions wired in memory with latency, for tests. */
export function fakeParty(n, o = {}) {
  const lat = o.latency ?? 0, jit = o.jitter ?? 0, loss = o.loss ?? 0; let clock = 0; const queue = []; const sessions = [];
  const rng = mulberry(o.seed || 5);
  const mkBus = (idx) => ({ cb: null, send(m) { for (let j = 0; j < n; j++) { if (j === idx) continue; if (m.u && rng() < loss) continue; queue.push({ at: clock + lat + rng() * jit, to: j, m }); } }, close() {} });
  const buses = Array.from({ length: n }, (_, i) => mkBus(i));
  for (let i = 0; i < n; i++) {
    const s = new LocalSession(buses[i], { host: i === 0, id: 'p' + i, name: SEAT_NAMES[i], now: () => clock });
    clearInterval?.(s.tick); s.tick = null; sessions.push(s);
  }
  const net = { sessions, now: () => clock, step(ms) {
    const end = clock + ms; while (true) { queue.sort((a, b) => a.at - b.at); const q = queue[0]; if (!q || q.at > end) break; queue.shift(); clock = Math.max(clock, q.at); buses[q.to].cb?.(q.m); } clock = end;
    for (const s of sessions) s._tick?.();
  } };
  // guests join
  for (let i = 1; i < n; i++) { sessions[i].join('p0'); }
  net.step(400);
  return net;
}
export { SLUG };
