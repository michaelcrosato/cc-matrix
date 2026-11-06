// LocalSession: the same small interface as AIHub, for the game on its own. Never runs in a hub session.
// Same computer: a BroadcastChannel with a lobby that lists hosts automatically.
// Two computers: WebRTC invite codes (a copyable offer, a pasted answer), star topology through the host.
import { SLUG } from '../config.js';

const HEARTBEAT = 1000;
const SILENCE = 4000;
const PALETTE_SEATS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const NAMES = ['MAX', 'MAXINE', 'MS. RANSOM', 'THE REGIMENT'];

function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class LocalSession {
  constructor() {
    this.active = false;
    this.local = true;
    this.me = 0; this.host = 0; this.isHost = true; this.server = false;
    this.players = [{ id: 0, name: NAMES[0], color: PALETTE_SEATS[0] }];
    this.seed = (Math.floor(Math.random() * 1e9)) >>> 0;
    this.limitMs = 300000;
    this.round = 1;
    this.mode = 'shared-world';
    this.handlers = {};
    this.startAt = Infinity;
    this.finished = false;
    this.pid = `p${Math.floor(Math.random() * 1e9)}`;
    this.peers = new Map(); // pid -> { seat, last, send }
    this.transports = [];
    this.backlog = {};
  }

  // ---- The AIHub interface ----
  on(ev, fn) {
    (this.handlers[ev] = this.handlers[ev] ?? []).push(fn);
    for (const args of this.backlog[ev] ?? []) fn(...args);
    delete this.backlog[ev];
    return () => { this.handlers[ev] = (this.handlers[ev] ?? []).filter((f) => f !== fn); };
  }
  emit(ev, ...args) {
    const list = this.handlers[ev];
    if (!list?.length) { (this.backlog[ev] = this.backlog[ev] ?? []).push(args); return; }
    for (const f of list) f(...args);
  }
  time() { return Number.isFinite(this.startAt) ? performance.now() - this.startAt : -Infinity; }
  rng(label) { let h = this.seed; for (let i = 0; i < label.length; i++) h = (Math.imul(h, 31) + label.charCodeAt(i)) >>> 0; return mulberry(h); }
  ready() {
    this.isReady = true;
    if (this.solo) { this.beginCountdown(3000); return; }
    if (!this.isHost) this.broadcast({ t: 'rdy' });
    this.tryCountdown();
  }
  answer() {}
  progress() {}
  fail() {}
  beginCountdown(ms) {
    if (Number.isFinite(this.startAt)) return;
    this.startAt = performance.now() + ms;
    this.emit('start', { in: ms });
  }
  send(data, { to, reliable = true } = {}) {
    if (this.closed) return false;
    const packet = { t: 'msg', from: this.me, data };
    if (this.isHost) {
      for (const peer of this.peers.values()) {
        if (to !== undefined && peer.seat !== to) continue;
        peer.send(packet, reliable);
      }
    } else {
      // Star: guests only talk to the host, who relays what's for someone else.
      const hostPeer = [...this.peers.values()][0];
      if (hostPeer) hostPeer.send({ ...packet, to }, reliable);
    }
    return true;
  }
  /** The host only, once. Same object the hub takes; our results screen reads it. */
  finish(o) {
    if (this.finished) return;
    this.finished = true;
    this.results = o;
    this.broadcast({ t: 'finish', o });
    this.emit('end', { reason: 'finished', standings: o.standings, results: o });
  }

  broadcast(packet) { for (const peer of this.peers.values()) peer.send(packet, true); }

  // ---- Solo ----
  static solo() {
    const s = new LocalSession();
    s.solo = true;
    return s;
  }

  // ---- Party over BroadcastChannel ----
  hostParty() {
    this.isHost = true;
    this.me = 0;
    this.host = 0;
    this.lobbyOpen = true;
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(`${SLUG}:party`);
      this.bc.onmessage = (e) => this.onBroadcast(e.data);
      this.announceT = setInterval(() => { if (this.lobbyOpen) this.bc.postMessage({ t: 'host', pid: this.pid, seats: this.players.length, seed: this.seed }); }, 500);
    }
    this.startHeartbeat();
  }
  static watchHosts(onList) {
    if (typeof BroadcastChannel === 'undefined') return () => {};
    const bc = new BroadcastChannel(`${SLUG}:party`);
    const hosts = new Map();
    bc.onmessage = (e) => {
      if (e.data?.t === 'host') { hosts.set(e.data.pid, { pid: e.data.pid, seats: e.data.seats, at: performance.now() }); }
      if (e.data?.t === 'hostGone') hosts.delete(e.data.pid);
      onList([...hosts.values()]);
    };
    return () => bc.close();
  }
  joinBroadcast(hostPid) {
    this.isHost = false;
    this.hostPid = hostPid;
    this.bc = new BroadcastChannel(`${SLUG}:party`);
    this.bc.onmessage = (e) => this.onBroadcast(e.data);
    this.peers.set(hostPid, this.bcPeer(hostPid, -1));
    this.bc.postMessage({ t: 'join', pid: this.pid, to: hostPid });
    this.startHeartbeat();
  }
  bcPeer(pid, seat) {
    return { pid, seat, last: performance.now(), send: (packet) => this.bc?.postMessage({ ...packet, _to: pid, _from: this.pid }) };
  }
  onBroadcast(m) {
    if (!m) return;
    if (m.t === 'join' && this.isHost && m.to === this.pid) {
      if (this.players.length >= 4 || !this.lobbyOpen) return;
      const seat = this.players.length;
      this.players.push({ id: seat, name: NAMES[seat], color: PALETTE_SEATS[seat] });
      this.peers.set(m.pid, this.bcPeer(m.pid, seat));
      this.sendRoster();
      return;
    }
    if (m._to !== this.pid) return;
    this.onPacket(m, m._from);
  }
  sendRoster() {
    for (const peer of this.peers.values()) peer.send({ t: 'roster', players: this.players, seat: peer.seat, seed: this.seed }, true);
    this.emit('roster', this.players);
  }

  // ---- Party over WebRTC invite codes ----
  async createInvite(iceServers) {
    this.isHost = true;
    this.lobbyOpen = true;
    if (!this.hbStarted) this.startHeartbeat();
    const pc = new RTCPeerConnection({ iceServers });
    const seat = this.players.length;
    const rel = pc.createDataChannel('rel', { ordered: true });
    const fast = pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
    const pid = `rtc${seat}`;
    const peer = { pid, seat, last: performance.now(), pc, rel, fast, send: (packet, reliable) => this.rtcSend(peer, packet, reliable) };
    this.pendingPeer = peer;
    const open = () => {
      if (rel.readyState !== 'open' || this.peers.has(pid)) return;
      this.players.push({ id: seat, name: NAMES[seat], color: PALETTE_SEATS[seat] });
      this.peers.set(pid, peer);
      this.sendRoster();
    };
    rel.onopen = open;
    rel.onmessage = (e) => this.onPacket(JSON.parse(e.data), pid);
    fast.onmessage = (e) => this.onPacket(JSON.parse(e.data), pid);
    await pc.setLocalDescription(await pc.createOffer());
    await this.iceDone(pc);
    return btoa(JSON.stringify(pc.localDescription));
  }
  async acceptAnswer(code) {
    const peer = this.pendingPeer;
    await peer.pc.setRemoteDescription(JSON.parse(atob(code.trim())));
  }
  async joinWithInvite(code, iceServers) {
    this.isHost = false;
    const pc = new RTCPeerConnection({ iceServers });
    const peer = { pid: 'host', seat: -1, last: performance.now(), pc, send: (packet, reliable) => this.rtcSend(peer, packet, reliable) };
    pc.ondatachannel = (e) => {
      const ch = e.channel;
      if (ch.label === 'rel') { peer.rel = ch; ch.onopen = () => this.onJoinedRtc(); } else peer.fast = ch;
      ch.onmessage = (ev) => this.onPacket(JSON.parse(ev.data), 'host');
    };
    this.peers.set('host', peer);
    await pc.setRemoteDescription(JSON.parse(atob(code.trim())));
    await pc.setLocalDescription(await pc.createAnswer());
    await this.iceDone(pc);
    this.startHeartbeat();
    return btoa(JSON.stringify(pc.localDescription));
  }
  onJoinedRtc() { this.emit('joined'); }
  rtcSend(peer, packet, reliable) {
    const ch = reliable === false && peer.fast?.readyState === 'open' ? peer.fast : peer.rel;
    if (ch?.readyState === 'open') ch.send(JSON.stringify(packet));
  }
  iceDone(pc) {
    return new Promise((done) => {
      if (pc.iceGatheringState === 'complete') { done(); return; }
      const check = () => { if (pc.iceGatheringState === 'complete') done(); };
      pc.addEventListener('icegatheringstatechange', check);
      setTimeout(done, 2500);
    });
  }

  // ---- Shared protocol ----
  onPacket(m, fromPid) {
    const peer = this.peers.get(fromPid);
    if (peer) peer.last = performance.now();
    switch (m.t) {
      case 'msg':
        if (this.isHost && m.to !== undefined && m.to !== this.me) {
          for (const p of this.peers.values()) if (p.seat === m.to) p.send(m, true);
          return;
        }
        if (this.isHost && m.to === undefined) {
          for (const p of this.peers.values()) if (p !== peer) p.send(m, true);
        }
        this.emit('message', m.data, m.from);
        break;
      case 'roster':
        this.players = m.players;
        this.me = m.seat;
        this.seed = m.seed;
        this.host = 0;
        if (peer) peer.seat = 0;
        this.emit('roster', this.players);
        break;
      case 'start':
        this.emit('go', m);
        break;
      case 'rdy': if (peer) { peer.ready = true; this.tryCountdown(); } break;
      case 'count': this.clockOffset = m.at; this.beginCountdown(m.in); break;
      case 'hb': break;
      case 'finish':
        this.finished = true;
        this.results = m.o;
        this.emit('end', { reason: 'finished', standings: m.o.standings, results: m.o });
        break;
      case 'bye':
        if (this.isHost) this.dropPeer(fromPid);
        else this.hostGone();
        break;
      default: break;
    }
  }
  /** The host presses Start: everyone loads. */
  launch() {
    this.lobbyOpen = false;
    if (this.bc && this.isHost) this.bc.postMessage({ t: 'hostGone', pid: this.pid });
    clearInterval(this.announceT);
    this.broadcast({ t: 'start', seed: this.seed, players: this.players });
    this.emit('go', {});
  }
  tryCountdown() {
    if (!this.isHost || !this.isReady) return;
    if ([...this.peers.values()].every((p) => p.ready)) {
      this.broadcast({ t: 'count', in: 3000 });
      this.beginCountdown(3000);
    }
  }
  startHeartbeat() {
    this.hbStarted = true;
    this.hb = setInterval(() => {
      this.broadcast({ t: 'hb' });
      const now = performance.now();
      for (const [pid, peer] of this.peers) {
        if (now - peer.last > SILENCE) {
          if (this.isHost) this.dropPeer(pid);
          else this.hostGone();
        }
      }
    }, HEARTBEAT);
  }
  dropPeer(pid) {
    const peer = this.peers.get(pid);
    if (!peer) return;
    this.peers.delete(pid);
    if (this.lobbyOpen) { this.players = this.players.filter((p) => p.id !== peer.seat); this.sendRoster(); }
    this.emit('leave', { id: peer.seat, reason: 'disconnected' });
    this.tryCountdown();
  }
  hostGone() {
    if (this.closed) return;
    this.close();
    this.emit('end', { reason: 'host-left', standings: [] });
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.broadcast({ t: 'bye' });
    clearInterval(this.hb); clearInterval(this.announceT);
    if (this.bc && this.isHost) this.bc.postMessage({ t: 'hostGone', pid: this.pid });
    this.bc?.close();
    for (const p of this.peers.values()) p.pc?.close?.();
  }
}
