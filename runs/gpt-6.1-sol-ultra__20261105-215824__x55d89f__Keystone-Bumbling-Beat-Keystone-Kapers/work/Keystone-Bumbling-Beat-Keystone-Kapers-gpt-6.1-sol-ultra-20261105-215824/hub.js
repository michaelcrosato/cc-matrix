/* Keystone Bumbling Beat network adapter. AI Hub Session Protocol v1. */
const PROTOCOL = 'keystone-bumbling-beat/1';
const PULSE_KEYS = ['jump', 'interact', 'dash'];
const noop = () => {};
const player = (id, name) => ({ id, name, color: id === 0 ? '#356ad4' : '#e79f35' });
const cleanInput = (v = {}) => ({
  move: Math.max(-1, Math.min(1, Number(v.move) || 0)),
  jump: !!v.jump, duck: !!v.duck, interact: !!v.interact, downUse: !!v.downUse, dash: !!v.dash,
});
const encode = (data) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))));
const decode = (text) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(String(text).trim()), c => c.charCodeAt(0))));

/**
 * Call connect() after constructing, then ready() after assets/physics load.
 * During a hub session the hub starts and ends the round. Standalone peer
 * connections call onJoin(info) when ready; the host starts its game normally.
 */
export class HubBridge {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.hub = globalThis.AIHub || null;
    this.active = !!this.hub?.active;
    this.isHost = true;
    this.server = false;
    this.me = 0;
    this.host = 0;
    this.players = [player(0, 'Officer Blue')];
    this.connected = false;
    this.ended = false;
    this.started = false;
    this.finished = false;
    this.transport = this.active ? 'ai-hub' : 'solo';
    this.seq = 0;
    this.inputSeq = new Map();
    this.stateSeq = -1;
    this.lastInputAt = -Infinity;
    this.lastStateAt = -Infinity;
    this.pendingInput = cleanInput();
    this.peer = null;
    this.channel = null;
    this.bc = null;
    this.room = null;
    this.unsubscribers = [];
    this.received = 0;
    this.sent = 0;
    this.error = '';
    this.remoteLastSeen = 0;
  }
  emit(name, ...args) { return (this.callbacks[name] || noop)(...args); }
  info() {
    return { active: this.active, connected: this.connected, isHost: this.isHost,
      server: this.server, me: this.me, host: this.host, players: this.players.map(p => ({ ...p })),
      transport: this.transport, room: this.room };
  }
  async connect() {
    if (!this.active || !this.hub) return null;
    this.unsubscribers.push(this.hub.on('start', event => {
      this.started = true;
      this.emit('onStart', event);
    }));
    this.unsubscribers.push(this.hub.on('message', (data, from) => this.receive(data, from)));
    this.unsubscribers.push(this.hub.on('leave', event => {
      this.players = this.players.filter(p => p.id !== event.id);
      this.emit('onLeave', event);
    }));
    this.unsubscribers.push(this.hub.on('time-up', event => {
      if (this.isHost) {
        this.emit('onTimeUp', event);
        // A round must always have an outcome, even if the game did not supply one.
        if (!this.finished) this.finish({ score: Number(this.lastState?.score) || 0, won: false });
      }
    }));
    this.unsubscribers.push(this.hub.on('end', event => {
      this.ended = true;
      this.emit('onEnd', event);
    }));
    const info = await this.hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) {
      this.active = false;
      this.transport = 'solo';
      return null;
    }
    this.me = info.me;
    this.host = info.host;
    this.isHost = info.isHost;
    this.server = !!info.server;
    this.players = info.players;
    this.connected = true;
    this.emit('onStatus', this.info());
    return info;
  }
  ready() { if (this.active && !this.ended) this.hub.ready(); }
  time() { return this.active ? this.hub.time() : this.startedAt == null ? -Infinity : performance.now() - this.startedAt; }
  begin() { if (!this.active) { this.started = true; this.finished = false; this.ended = false; this.startedAt = performance.now(); } }
  canPlay() { return !this.ended && (this.active ? this.started && this.hub.time() >= 0 : true); }
  send(data, { to, reliable = true } = {}) {
    if (this.ended) return false;
    const packet = { p: PROTOCOL, ...data };
    let ok = false;
    if (this.active) ok = this.hub.send(packet, { to, reliable });
    else if (this.channel?.readyState === 'open') {
      if (this.channel.bufferedAmount < 131072) { this.channel.send(JSON.stringify(packet)); ok = true; }
    } else if (this.bc && this.connected) {
      this.bc.postMessage({ ...packet, from: this.me, session: this.session }); ok = true;
    }
    if (ok) this.sent++;
    return ok;
  }
  /** Call each frame; jump/interact/dash are latched across the 10 Hz send interval. */
  sendInput(input, force = false) {
    if (this.isHost || this.ended) return false;
    const v = cleanInput(input);
    for (const key of PULSE_KEYS) v[key] ||= this.pendingInput[key];
    this.pendingInput = v;
    const now = performance.now();
    if (!force && now - this.lastInputAt < 100) return false;
    const ok = this.send({ k: 'input', n: ++this.seq, input: this.pendingInput }, { to: this.host });
    if (ok) {
      this.lastInputAt = now;
      this.pendingInput = { ...v, jump: false, interact: false, dash: false };
    }
    return ok;
  }
  /** Host calls each frame. Snapshots are sent at most 10 Hz and are JSON. */
  sendState(state, force = false) {
    if (!this.isHost || this.ended) return false;
    this.lastState = state;
    const now = performance.now();
    if (!force && now - this.lastStateAt < 100) return false;
    const ok = this.send({ k: 'state', n: ++this.seq, state });
    if (ok) this.lastStateAt = now;
    return ok;
  }
  receive(data, from) {
    if (this.ended || data?.p !== PROTOCOL || !Number.isFinite(data.n)) return;
    if (!this.players.some(p => p.id === from) && from !== this.host) return;
    this.received++;
    this.remoteLastSeen = performance.now();
    if (data.k === 'input' && this.isHost && from !== this.me && data.n > (this.inputSeq.get(from) ?? -1)) {
      this.inputSeq.set(from, data.n);
      this.emit('onInput', cleanInput(data.input), from);
    } else if (data.k === 'state' && !this.isHost && from === this.host && data.n > this.stateSeq) {
      this.stateSeq = data.n;
      this.emit('onState', data.state, from);
    } else if (data.k === 'finished' && !this.isHost && from === this.host) {
      this.finished = true;
      this.emit('onFinished', data.outcome);
    }
  }
  finish({ score = 0, won = false, stats = {}, scores, awards = [] } = {}) {
    if (!this.isHost || this.finished || this.ended) return;
    this.finished = true;
    const ids = this.players.map(p => p.id);
    const outcome = { standings: [ids], scores: scores || Object.fromEntries(ids.map(id => [id, score])), won: !!won,
      stats: Object.fromEntries(ids.map(id => [id, stats])), awards };
    if (this.active) this.hub.finish(outcome);
    else this.send({ k: 'finished', n: ++this.seq, outcome });
  }
  fail(message) {
    this.error = String(message);
    if (this.active) this.hub.fail(this.error);
    this.emit('onError', this.error);
  }
  markPeerLeft(reason = 'disconnected', id = this.isHost ? 1 : 0) {
    if (!this.connected) return false;
    this.connected = false;
    this.players = this.players.filter(p => p.id !== id);
    this.inputSeq.delete(id);
    clearInterval(this.joinTimer);
    this.emit('onLeave', { id, reason });
    this.emit('onStatus', this.info());
    return true;
  }
  /** Same-origin two-tab rooms: no server or internet service needed. */
  openLocalRoom(code = null, asHost = true) {
    if (this.active) throw new Error('AI Hub owns the network during a session.');
    this.closePeer();
    if (!globalThis.BroadcastChannel) throw new Error('This browser does not support local rooms.');
    this.room = String(code || crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 6)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!this.room) throw new Error('Enter a room code.');
    this.transport = 'local-room';
    this.isHost = !!asHost;
    this.me = asHost ? 0 : 1;
    this.host = 0;
    this.players = asHost ? [player(0, 'Officer Blue')] : [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
    this.ended = this.finished = false;
    this.session = asHost ? crypto.randomUUID() : null;
    this.bc = new BroadcastChannel(`keystone-bumbling-beat:${this.room}`);
    this.bc.onmessage = event => {
      const m = event.data;
      if (!m || m.p !== PROTOCOL || m.from === this.me) return;
      if (m.k === 'join' && this.isHost) {
        const fresh = !this.connected;
        if (fresh) this.inputSeq.delete(1);
        this.connected = true;
        this.players = [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
        this.bc.postMessage({ p: PROTOCOL, k: 'welcome', session: this.session, from: 0 });
        if (fresh) this.emit('onJoin', this.info());
      } else if (m.k === 'welcome' && !this.isHost && typeof m.session === 'string') {
        const fresh = !this.connected;
        this.session = m.session;
        this.connected = true;
        if (fresh) this.emit('onJoin', this.info());
      } else if (m.session === this.session && m.k === 'bye') {
        this.markPeerLeft('left', m.from);
      } else if (this.connected && m.session === this.session) this.receive(m, m.from);
    };
    if (!asHost) {
      const join = () => this.bc?.postMessage({ p: PROTOCOL, k: 'join', from: 1 });
      join();
      this.joinTimer = setInterval(() => { if (!this.connected) join(); }, 700);
    }
    this.emit('onStatus', this.info());
    return this.room;
  }
  /** Direct WebRTC with manual signaling; never called inside AI Hub. */
  createPeer(asHost) {
    if (this.active) throw new Error('AI Hub owns the network during a session.');
    this.closePeer();
    if (!globalThis.RTCPeerConnection) throw new Error('Direct online co-op is unavailable in this browser.');
    this.transport = 'webrtc';
    this.isHost = asHost;
    this.me = asHost ? 0 : 1;
    this.host = 0;
    this.players = [player(0, 'Officer Blue'), player(1, 'Officer Gold')];
    this.ended = this.finished = false;
    const peer = this.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peer.onconnectionstatechange = () => {
      if (this.peer !== peer) return;
      const state = peer.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.markPeerLeft(state);
      }
    };
    const wire = channel => {
      this.channel = channel;
      channel.onopen = () => { this.connected = true; this.emit('onJoin', this.info()); this.emit('onStatus', this.info()); };
      channel.onclose = () => { if (this.channel === channel) this.markPeerLeft('channel-closed'); };
      channel.onmessage = event => {
        try { this.receive(JSON.parse(event.data), this.isHost ? 1 : 0); }
        catch { this.error = 'A malformed network packet was ignored.'; }
      };
      channel.onerror = () => { this.error = 'The peer connection could not send data.'; this.emit('onError', this.error); };
    };
    if (asHost) wire(this.peer.createDataChannel('mall-patrol', { ordered: true }));
    else this.peer.ondatachannel = event => wire(event.channel);
    return this.peer;
  }
  async gatherIce(peer) {
    if (peer.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      let timer;
      const finish = () => { clearTimeout(timer); peer.removeEventListener('icegatheringstatechange', change); resolve(); };
      const change = () => { if (peer.iceGatheringState === 'complete') finish(); };
      peer.addEventListener('icegatheringstatechange', change);
      timer = setTimeout(finish, 7000);
    });
  }
  async createOffer() {
    const peer = this.createPeer(true);
    await peer.setLocalDescription(await peer.createOffer());
    await this.gatherIce(peer);
    return encode({ game: PROTOCOL, type: 'offer', sdp: peer.localDescription.sdp });
  }
  async acceptOffer(code) {
    const offer = decode(code);
    if (offer.game !== PROTOCOL || offer.type !== 'offer' || typeof offer.sdp !== 'string') throw new Error('That is not a Keystone invite.');
    const peer = this.createPeer(false);
    await peer.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    await peer.setLocalDescription(await peer.createAnswer());
    await this.gatherIce(peer);
    return encode({ game: PROTOCOL, type: 'answer', sdp: peer.localDescription.sdp });
  }
  async acceptAnswer(code) {
    const answer = decode(code);
    if (answer.game !== PROTOCOL || answer.type !== 'answer' || typeof answer.sdp !== 'string') throw new Error('That is not a Keystone reply.');
    if (!this.peer || !this.isHost) throw new Error('Create an invite before entering a reply.');
    await this.peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
  }
  closePeer() {
    this.connected = false;
    clearInterval(this.joinTimer);
    if (this.bc) {
      try { this.bc.postMessage({ p: PROTOCOL, k: 'bye', from: this.me, session: this.session }); } catch {}
      this.bc.close(); this.bc = null;
    }
    if (this.channel) { this.channel.close(); this.channel = null; }
    if (this.peer) { this.peer.close(); this.peer = null; }
    this.connected = false;
    this.room = null;
    this.inputSeq.clear();
    this.stateSeq = -1;
    this.pendingInput = cleanInput();
  }
  disconnect() {
    // Session lifecycle belongs to the hub. Its page owns leaving a round.
    if (this.active) return false;
    this.closePeer();
    this.isHost = true; this.me = this.host = 0; this.server = false;
    this.transport = 'solo'; this.players = [player(0, 'Officer Blue')];
    this.emit('onStatus', this.info());
    return true;
  }
  inspect() { return { ...this.info(), sent: this.sent, received: this.received, ended: this.ended, finished: this.finished, started: this.started, error: this.error }; }
  destroy() { this.closePeer(); for (const off of this.unsubscribers) off(); this.unsubscribers = []; }
}
