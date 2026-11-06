// Pit Perfect: AI Hub ghost races, local room races, and manual WebRTC races.
// AI Hub's unmodified hub/session.js must be the first script in <head>.
export class Network {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.state = {
      active: !!globalThis.AIHub?.active,
      started: false,
      ended: false,
      connected: false,
      mode: 'ghost',
      me: `trail-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      players: [],
      isHost: false,
      status: 'Solo expedition',
      room: '',
      transport: 'none',
    };
    this.snapshot = null;
    this.peers = new Map();
    this.lastSend = -Infinity;
    this.lastProgress = -Infinity;
    this.reported = false;
    this.hubReady = false;
    this.unsubscribers = [];
    this.channel = null;
    this.connection = null;
    this.dataChannel = null;
    this.heartbeat = null;
  }

  get active() { return this.state.active; }
  get status() { return this.state.status; }
  get me() { return this.state.me; }
  get players() { return this.state.players; }
  get started() { return this.state.started; }
  get ended() { return this.state.ended; }
  get time() { return this.active ? globalThis.AIHub.time() : 0; }
  get canPlay() { return !this.state.ended && (!this.active || (this.started && this.time >= 0)); }

  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }

  setStatus(status) {
    this.state.status = status;
    this.emit('status', { status, state: { ...this.state } });
  }

  async init() {
    const hub = globalThis.AIHub;
    if (!hub?.active) return null;
    this.unsubscribers.push(
      hub.on('start', detail => {
        this.state.started = true;
        this.state.ended = false;
        this.reported = false;
        this.setStatus('AI Hub expedition race');
        this.emit('start', { ...detail, info: this.info });
      }),
      hub.on('message', (data, from) => {
        if (this.ended || data?.game !== 'pit-perfect' || data?.kind !== 'snapshot') return;
        this.receiveSnapshot(from, data.snapshot);
      }),
      hub.on('leave', detail => {
        this.peers.delete(detail.id);
        this.state.players = this.state.players.filter(p => p.id !== detail.id);
        this.emit('leave', detail);
      }),
      hub.on('time-up', detail => {
        this.emit('time-up', detail);
        this.finish(this.snapshot?.score || 0);
      }),
      hub.on('end', detail => {
        this.state.ended = true;
        this.setStatus('AI Hub round complete');
        this.emit('end', detail);
      }),
    );
    const info = await hub.connect({ mode: 'ghost', seats: [1, 2] });
    if (!info) {
      this.state.active = false;
      this.setStatus('Solo expedition');
      return null;
    }
    this.info = info;
    Object.assign(this.state, {
      active: true,
      connected: true,
      transport: 'ai-hub',
      me: info.me,
      players: info.players,
      isHost: info.isHost,
    });
    this.setStatus('Waiting for AI Hub countdown');
    return info;
  }

  ready() {
    if (this.active && !this.hubReady) {
      this.hubReady = true;
      globalThis.AIHub.ready();
    }
  }

  update(snapshot) {
    if (this.ended) return;
    this.snapshot = this.sanitize(snapshot);
    const now = performance.now();
    if (this.active) {
      if (!this.canPlay) return;
      if (!this.reported && now - this.lastProgress >= 800) {
        this.lastProgress = now;
        globalThis.AIHub.progress({ score: this.snapshot.score, label: `${this.snapshot.treasures} relics` });
      }
      if (now - this.lastSend >= 100) {
        this.lastSend = now;
        globalThis.AIHub.send({ game: 'pit-perfect', kind: 'snapshot', snapshot: this.snapshot }, { reliable: false });
      }
    } else if (now - this.lastSend >= 80) {
      this.lastSend = now;
      this.sendStandalone({ kind: 'snapshot', snapshot: this.snapshot });
    }
  }

  sanitize(s = {}) {
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    return {
      x: finite(s.x), y: finite(s.y), facing: finite(s.facing, 1),
      pose: String(s.pose || 'idle').slice(0, 24), score: finite(s.score),
      treasures: finite(s.treasures), time: finite(s.time), finished: !!s.finished,
    };
  }

  receiveSnapshot(id, snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    const safe = this.sanitize(snapshot);
    this.peers.set(id, { snapshot: safe, seen: performance.now() });
    this.emit('peer', { id, snapshot: safe });
  }

  finish(score = this.snapshot?.score || 0) {
    if (this.reported || this.ended) return;
    this.reported = true;
    if (this.active) {
      globalThis.AIHub.result({
        score: Number.isFinite(Number(score)) ? Number(score) : 0,
        stats: { Relics: this.snapshot?.treasures || 0 },
      });
    } else {
      if (this.snapshot) {
        this.snapshot.finished = true;
        this.sendStandalone({ kind: 'snapshot', snapshot: this.snapshot });
      }
    }
  }

  host(code = '') { return this.openRoom(code || this.makeRoomCode(), true); }
  join(code) { return this.openRoom(code, false); }

  makeRoomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = new Uint8Array(5);
    crypto.getRandomValues(values);
    return [...values].map(v => alphabet[v % alphabet.length]).join('');
  }

  openRoom(code, hosting) {
    if (this.active) return null;
    this.leave();
    const room = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
    if (!room) { this.setStatus('Enter a room code first'); return null; }
    if (!globalThis.BroadcastChannel) { this.setStatus('Local rooms unavailable; use a direct link'); return null; }
    Object.assign(this.state, { room, isHost: hosting, transport: 'local-room', ended: false });
    this.reported = false;
    this.channel = new BroadcastChannel(`pit-perfect-v1-${room}`);
    this.channel.onmessage = event => this.receiveStandalone(event.data);
    this.setStatus(`${hosting ? 'Hosting' : 'Joining'} local room ${room}`);
    this.sendStandalone({ kind: 'hello' });
    this.heartbeat = setInterval(() => {
      this.sendStandalone({ kind: 'ping', snapshot: this.snapshot });
      for (const [id, peer] of this.peers) {
        if (performance.now() - peer.seen > 6000) {
          this.peers.delete(id);
          this.state.connected = this.peers.size > 0;
          this.emit('leave', { id, reason: 'disconnected' });
          this.setStatus(`Local room ${room} · waiting for explorer`);
        }
      }
    }, 1000);
    return room;
  }

  sendStandalone(data) {
    if (this.active) return;
    const envelope = { game: 'pit-perfect', id: this.me, ...data };
    if (this.channel) this.channel.postMessage(envelope);
    if (this.dataChannel?.readyState === 'open') this.dataChannel.send(JSON.stringify(envelope));
  }

  receiveStandalone(message) {
    if (this.active || !message || message.game !== 'pit-perfect' || message.id === this.me) return;
    const id = String(message.id || '').slice(0, 80);
    if (!id) return;
    if (!this.peers.has(id) && this.peers.size >= 1) return;
    if (message.kind === 'leave') {
      this.peers.delete(id);
      this.state.connected = false;
      this.state.players = [];
      this.emit('leave', { id, reason: 'left' });
      this.setStatus(this.state.room ? `Local room ${this.state.room} · explorer left` : 'Direct explorer disconnected');
      return;
    }
    const first = !this.peers.has(id);
    this.peers.set(id, { snapshot: message.snapshot || this.peers.get(id)?.snapshot, seen: performance.now() });
    this.state.connected = true;
    this.state.players = [{ id: this.me, name: 'You', color: '#f5b700' }, { id, name: 'Explorer 2', color: '#5bd8df' }];
    if (first) this.setStatus(this.state.transport === 'webrtc' ? 'Direct expedition race connected' : `Local room ${this.state.room} · 2 explorers`);
    if (message.kind === 'hello') this.sendStandalone({ kind: 'hello-ack', snapshot: this.snapshot });
    if (message.snapshot) this.receiveSnapshot(id, message.snapshot);
  }

  async setupRTC(hosting) {
    if (this.active) throw new Error('Direct links are available outside AI Hub sessions only.');
    if (!globalThis.RTCPeerConnection) throw new Error('This browser does not support direct connections.');
    this.leave();
    Object.assign(this.state, { transport: 'webrtc', isHost: hosting, ended: false });
    this.reported = false;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.connection = pc;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.state.connected = true;
        this.setStatus('Direct expedition race connected');
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this.state.connected = false;
        for (const id of this.peers.keys()) this.emit('leave', { id, reason: 'disconnected' });
        this.peers.clear();
        this.setStatus('Direct connection lost');
      }
    };
    pc.ondatachannel = event => this.attachDataChannel(event.channel);
    if (hosting) this.attachDataChannel(pc.createDataChannel('pit-perfect-race', { ordered: false, maxRetransmits: 0 }));
    return pc;
  }

  attachDataChannel(channel) {
    this.dataChannel = channel;
    channel.onopen = () => {
      this.state.connected = true;
      this.setStatus('Direct expedition race connected');
      this.sendStandalone({ kind: 'hello', snapshot: this.snapshot });
    };
    channel.onmessage = event => {
      try { this.receiveStandalone(JSON.parse(event.data)); } catch { /* Ignore malformed packets. */ }
    };
  }

  async gatherICE(pc) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      let timer;
      const done = () => {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      };
      const check = () => { if (pc.iceGatheringState === 'complete') done(); };
      pc.addEventListener('icegatheringstatechange', check);
      timer = setTimeout(done, 6500);
    });
  }

  encodeSignal(description) { return btoa(JSON.stringify({ game: 'pit-perfect-v1', type: description.type, sdp: description.sdp })); }
  decodeSignal(code, expectedType) {
    let signal;
    try { signal = JSON.parse(atob(String(code).trim())); } catch { throw new Error('That direct-link code is not valid. Paste the complete code.'); }
    if (signal.game !== 'pit-perfect-v1' || signal.type !== expectedType || typeof signal.sdp !== 'string') throw new Error(`Please paste a Pit Perfect ${expectedType} code.`);
    return { type: signal.type, sdp: signal.sdp };
  }

  async createOffer() {
    const pc = await this.setupRTC(true);
    this.setStatus('Preparing a direct race invitation…');
    await pc.setLocalDescription(await pc.createOffer());
    await this.gatherICE(pc);
    this.setStatus('Send invitation to friend; then paste their answer');
    return this.encodeSignal(pc.localDescription);
  }

  async acceptOffer(code) {
    const description = this.decodeSignal(code, 'offer');
    const pc = await this.setupRTC(false);
    this.setStatus('Preparing your direct race answer…');
    await pc.setRemoteDescription(description);
    await pc.setLocalDescription(await pc.createAnswer());
    await this.gatherICE(pc);
    this.setStatus('Send this answer back to the host');
    return this.encodeSignal(pc.localDescription);
  }

  async acceptAnswer(code) {
    if (!this.connection || !this.state.isHost) throw new Error('Create an invitation before accepting an answer.');
    const description = this.decodeSignal(code, 'answer');
    await this.connection.setRemoteDescription(description);
    this.setStatus('Connecting to your fellow explorer…');
    return true;
  }

  leave() {
    if (this.active) return;
    this.sendStandalone({ kind: 'leave' });
    clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.channel) this.channel.close();
    this.channel = null;
    if (this.connection) {
      this.connection.onconnectionstatechange = null;
      this.connection.close();
    }
    this.connection = null;
    this.dataChannel = null;
    this.peers.clear();
    Object.assign(this.state, { connected: false, players: [], room: '', transport: 'none' });
    this.setStatus('Solo expedition');
  }

  dispose() {
    if (!this.active) this.leave();
    for (const off of this.unsubscribers) off?.();
    this.unsubscribers = [];
  }
}
