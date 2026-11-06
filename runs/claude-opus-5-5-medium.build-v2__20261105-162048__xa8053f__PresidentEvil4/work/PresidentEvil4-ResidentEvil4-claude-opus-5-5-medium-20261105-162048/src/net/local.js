// LocalSession: shaped exactly like AIHub, for parties outside a hub session. BroadcastChannel on one computer, WebRTC invite codes between two.
import { SLUG } from '../config.js';
const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const NAMES = ['MAX', 'MAXINE', 'MS. R', 'THE OTHER MAX'];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry = (a) => () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const uid = () => (globalThis.crypto?.randomUUID?.() ?? String(performance.now() + Date.now())).slice(0, 8);
export class LocalSession {
  constructor(role) { this.local = true; this.role = role; this.handlers = {}; this.queue = {}; this.me = 0; this.players = []; this.host = 0; this.isHost = role === 'host'; this.server = false; this.seed = 0; this.limitMs = 300000; this.mode = 'shared-world'; this.t0 = null; this.peers = new Map(); this.key = uid(); this.lastSeen = new Map(); this.started = false; this.ended = false; this.offset = 0; this.lobby = []; this.sent = 0; this.bc = null; this.rtcs = []; }
  on(ev, fn) { (this.handlers[ev] ??= []).push(fn); const q = this.queue[ev]; if (q) { delete this.queue[ev]; for (const a of q) fn(...a); } return () => { this.handlers[ev] = this.handlers[ev].filter((x) => x !== fn); }; }
  emit(ev, ...a) { const h = this.handlers[ev]; if (h?.length) for (const f of h) f(...a); else (this.queue[ev] ??= []).push(a); }
  rng(label) { return mulberry((this.seed ^ hash(String(label))) >>> 0); }
  time() { if (this.t0 == null) return -Infinity; return performance.now() + this.offset - this.t0; }
  ready() { }
  answer() { }
  fail(m) { this.endWith('void'); }
  // ---- transport
  openChannel() { if (typeof BroadcastChannel === 'undefined') return; this.bc = new BroadcastChannel(`${SLUG}-party`); this.bc.onmessage = (e) => this.onWire(e.data); }
  wire(m, toKey = null) { m.from = this.key; m.toKey = toKey; const peer = toKey ? this.peers.get(toKey) : null; if (peer?.ch) { if (peer.ch.readyState === 'open') peer.ch.send(JSON.stringify(m)); return; } if (!toKey) for (const [, p] of this.peers) if (p.ch?.readyState === 'open') p.ch.send(JSON.stringify(m)); this.bc?.postMessage(m); }
  onWire(m) {
    if (m.toKey && m.toKey !== this.key) return; if (m.from === this.key) return; this.lastSeen.set(m.from, performance.now()); const fn = this[`w_${m.k}`]; if (fn) fn.call(this, m);
  }
  // ---- discovery. Hosts announce themselves; guests list them.
  static host(o = {}) { const s = new LocalSession('host'); s.seed = (Math.random() * 1e9) | 0; s.lobby = [{ key: s.key, id: 0, name: NAMES[0] }]; s.openChannel(); s.announceT = setInterval(() => { if (!s.started) s.wire({ k: 'host', seats: s.lobby.length, name: 'HOST' }); }, 500); return s; }
  static browser() { const s = new LocalSession('guest'); s.hosts = new Map(); s.openChannel(); return s; }
  static solo() { const s = new LocalSession('host'); s.seed = (Math.random() * 1e9) | 0; s.lobby = [{ key: s.key, id: 0, name: 'MAX' }]; s.solo_ = true; return s; }
  w_host(m) { if (this.hosts) this.hosts.set(m.from, { key: m.from, seats: m.seats, at: performance.now() }); }
  join(hostKey) { this.hostKey = hostKey; this.wire({ k: 'join' }, hostKey); this.joining = true; }
  w_join(m) { if (!this.isHost || this.started || this.lobby.length >= 4) return; if (!this.lobby.some((p) => p.key === m.from)) this.lobby.push({ key: m.from, id: this.lobby.length, name: NAMES[this.lobby.length] }); this.broadcastLobby(); }
  broadcastLobby() { this.wire({ k: 'lobby', lobby: this.lobby }); this.emit('lobby', this.lobby); }
  w_lobby(m) { if (this.isHost) return; this.lobby = m.lobby; this.emit('lobby', this.lobby); }
  /** Host: start the round. A shared 3 s countdown with a one-ping clock offset. */
  start() {
    this.players = this.lobby.map((p, i) => ({ id: i, name: p.name, color: COLORS[i], key: p.key })); this.lobby.forEach((p, i) => { p.id = i; }); this.me = 0; this.started = true; clearInterval(this.announceT); this.t0 = performance.now() + 3000;
    if (!this.solo_) { this.wire({ k: 'start', players: this.players, seed: this.seed, hostNow: performance.now(), t0: this.t0 }); this.beat = setInterval(() => this.heartbeat(), 1000); for (const p of this.lobby) if (p.key !== this.key) this.lastSeen.set(p.key, performance.now()); }
    this.emit('started'); this.emit('start', { in: 3000 });
  }
  w_start(m) { this.players = m.players; this.seed = m.seed; this.me = m.players.findIndex((p) => p.key === this.key); this.isHost = false; this.host = 0; this.hostKey = m.from; this.started = true; this.t0 = m.t0; this.offset = m.hostNow - performance.now(); this.wire({ k: 'ping', at: performance.now() }, m.from); this.lastSeen.set(m.from, performance.now()); this.beat = setInterval(() => this.heartbeat(), 1000); this.emit('started'); this.emit('start', { in: Math.max(0, m.t0 - (performance.now() + this.offset)) }); }
  w_ping(m) { this.wire({ k: 'pong', at: m.at, now: performance.now() }, m.from); }
  w_pong(m) { const rtt = performance.now() - m.at; this.offset = m.now + rtt / 2 - performance.now(); }
  heartbeat() {
    if (this.ended) return; this.wire({ k: 'hb' }); const now = performance.now();
    if (this.isHost) { for (const p of this.players) { if (p.key === this.key || p.left) continue; if (now - (this.lastSeen.get(p.key) ?? now) > 4000) { p.left = true; this.emit('leave', { id: p.id, reason: 'disconnected' }); } } }
    else if (now - (this.lastSeen.get(this.hostKey) ?? now) > 4000) this.endWith('host-left');
  }
  w_hb() { }
  send(data, o = {}) {
    if (this.ended) return false; this.sent++;
    if (o.to != null) { const k = this.players[o.to]?.key; if (!k) return false; this.wire({ k: 'msg', d: data, s: this.me }, k); return true; }
    if (this.isHost) this.wire({ k: 'msg', d: data, s: this.me }); else this.wire({ k: 'msg', d: data, s: this.me }, this.hostKey);
    return true;
  }
  w_msg(m) { this.emit('message', m.d, m.s); }
  finish(o) { if (this.ended) return; this.wire({ k: 'end', o }); this.endWith('finished', o); }
  w_end(m) { this.endWith('finished', m.o); }
  endWith(reason, o = {}) { if (this.ended) return; this.ended = true; clearInterval(this.beat); clearInterval(this.announceT); this.emit('end', { reason, standings: o.standings, finish: o }); }
  leave() { this.wire({ k: 'bye' }); this.close(); }
  w_bye(m) { const p = this.players.find((x) => x.key === m.from); if (!p) { if (this.isHost) { this.lobby = this.lobby.filter((x) => x.key !== m.from); this.broadcastLobby(); } return; } if (p.id === 0 && !this.isHost) this.endWith('host-left'); else if (!p.left) { p.left = true; this.emit('leave', { id: p.id, reason: 'left' }); } }
  close() { clearInterval(this.beat); clearInterval(this.announceT); this.bc?.close(); this.bc = null; for (const r of this.rtcs) { try { r.close(); } catch { /* closed */ } } this.ended = true; }
  // ---- WebRTC invite codes. Star: guests only talk to the host.
  iceServers() { return typeof location !== 'undefined' && /[?&]g_nostun=1/.test(location.search) ? [] : [{ urls: 'stun:stun.l.google.com:19302' }]; }
  async gather(pc) { if (pc.iceGatheringState === 'complete') return; await new Promise((res) => { const f = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', f); res(); } }; pc.addEventListener('icegatheringstatechange', f); setTimeout(res, 3500); }); }
  /** Host: make an offer code for one more guest. */
  async makeOffer() {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers() }); this.rtcs.push(pc); const ch = pc.createDataChannel('party', { ordered: true }); const fast = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }); this.pendingPc = { pc, ch, fast }; await pc.setLocalDescription(await pc.createOffer()); await this.gather(pc); return btoa(JSON.stringify({ sdp: pc.localDescription.sdp, key: this.key }));
  }
  /** Host: accept a guest's answer code. */
  async acceptAnswer(code) { const a = JSON.parse(atob(code.trim())), P = this.pendingPc; await P.pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }); this.peers.set(a.key, { ch: P.ch, fast: P.fast, pc: P.pc }); this.wirePeer(P.ch); this.wirePeer(P.fast); await new Promise((res) => { if (P.ch.readyState === 'open') res(); else P.ch.onopen = res; setTimeout(res, 6000); }); this.w_join({ from: a.key }); this.lastSeen.set(a.key, performance.now()); }
  /** Guest: answer a host's offer code. */
  async answerOffer(code) {
    const o = JSON.parse(atob(code.trim())), pc = new RTCPeerConnection({ iceServers: this.iceServers() }); this.rtcs.push(pc); this.hostKey = o.key; const peer = { pc, ch: null, fast: null }; this.peers.set(o.key, peer); pc.ondatachannel = (e) => { if (e.channel.label === 'party') { peer.ch = e.channel; } else peer.fast = e.channel; this.wirePeer(e.channel); }; await pc.setRemoteDescription({ type: 'offer', sdp: o.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await this.gather(pc); return btoa(JSON.stringify({ sdp: pc.localDescription.sdp, key: this.key }));
  }
  wirePeer(ch) { ch.onmessage = (e) => this.onWire(JSON.parse(e.data)); }
}
