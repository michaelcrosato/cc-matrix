/** Boiler Buddies networking. AI Hub Session Protocol v1, or standalone WebRTC rooms. */
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
const EMPTY_INPUT = Object.freeze({ x: 0, jump: false, kick: false, drop: false, pulse: false });
let peerLoader;
function loadPeer() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  if (!peerLoader) peerLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PEERJS_URL;
    script.onload = () => globalThis.Peer ? resolve(globalThis.Peer) : reject(new Error('The online library did not start.'));
    script.onerror = () => reject(new Error('The online library could not load. Check your connection.'));
    document.head.append(script);
  }).catch(error => { peerLoader = null; throw error; });
  return peerLoader;
}
const cleanInput = input => ({
  x: Math.max(-1, Math.min(1, Number(input?.x) || 0)),
  jump: !!input?.jump, kick: !!input?.kick, drop: !!input?.drop, pulse: !!input?.pulse,
});
function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(values, n => alphabet[n % alphabet.length]).join('');
}
function makeId() {
  return crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(36)).join('');
}

export class Network {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.mode = 'none'; this.hubActive = !!globalThis.AIHub?.active;
    this.isHost = true; this.localSeat = 0; this.playerIds = [0]; this.players = [];
    this.room = ''; this.connected = false; this.started = false; this.ended = false;
    this.clientId = makeId(); this.peer = null; this.connection = null; this.broadcast = null;
    this._otherId = null; this._transport = null; this._unsubscribers = [];
    this._startAt = Infinity; this._finished = false; this._destroyed = false;
    this._lastInputSend = -Infinity; this._lastStateSend = -Infinity;
    this._inputSequence = 0; this._stateSequence = 0; this._lastStateSequence = -1;
    this._inputs = new Map(); this._inputSequences = new Map();
    this._inputLatch = { jump: false, kick: false, drop: false, pulse: false }; this._lastInput = EMPTY_INPUT;
    this.stats = { sent: 0, received: 0, bytesSent: 0, transport: 'none', protocol: 1 };
    this._hostReady = false; this._startCount = 0; this._heartbeat = null;
    this._standaloneRound = 0;
  }
  _notify(name, ...args) { this.callbacks[name]?.(...args); }
  _status(message) { this.status = message; this._notify('onStatus', message); }
  _info(countdownMs = 0) {
    return { mode: this.mode, isHost: this.isHost, host: this.isHost, localSeat: this.localSeat,
      playerIds: [...this.playerIds], players: [...this.players], countdownMs,
      server: this.localSeat < 0, room: this.room };
  }
  get active() { return this.mode !== 'none' && !this.ended; }
  get canStart() { return this.started && !this.ended && performance.now() >= this._startAt; }
  get countdown() { return this.started ? Math.max(0, this._startAt - performance.now()) : Infinity; }
  /** Call after rendering and physics have loaded; returns null outside a Hub session. */
  async initHub() {
    const hub = globalThis.AIHub;
    if (!hub?.active) { this.hubActive = false; return null; }
    this.mode = 'hub'; this.hubActive = true;
    this._unsubscribers.push(
      hub.on('message', (data, from) => this._receive(data, from, 'hub')),
      hub.on('start', event => {
        this.started = true; this._startAt = performance.now() + Math.max(0, Number(event.in) || 0);
        this._notify('onStart', this._info(Number(event.in) || 0));
      }),
      hub.on('leave', event => {
        this.playerIds = hub.players.map(player => player.id);
        this.players = [...hub.players]; this._inputs.delete(event.id);
        this._notify('onLeave', event.id, event.reason);
      }),
      hub.on('time-up', event => {
        if (!this.isHost || this.ended || this._finished) return;
        this._notify('onTimeUp', event);
        if (!this._finished) this.finish({ won: false, score: 0 });
      }),
      hub.on('end', event => {
        this.ended = true; this.started = false; this.connected = false;
        this._notify('onEnd', event.reason);
      })
    );
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) { this.mode = 'none'; this.hubActive = false; return null; }
    this.isHost = !!info.isHost; this.localSeat = info.server ? -1 : info.me;
    this.playerIds = info.players.map(player => player.id); this.players = [...info.players];
    this._hubHost = info.host; this.room = 'AI HUB'; this.connected = true;
    this.stats.transport = 'AI Hub'; this._status('AI Hub connected');
    return info;
  }
  ready() { if (this.hubActive && !this.ended) globalThis.AIHub.ready(); }
  /** Public signaling is never loaded while AI Hub owns the network. */
  async host() {
    if (this.hubActive) throw new Error('AI Hub already manages this round.');
    this._resetStandalone(); this.mode = 'standalone'; this.isHost = true; this.localSeat = 0;
    this.playerIds = [0, 1]; this.room = makeCode(); this._setupBroadcast();
    this._status('Opening room…');
    // Same-browser connections remain available if the public broker cannot be reached.
    this._openPeer(true).catch(error => this._status(`Room ${this.room} is available on this browser. Online: ${error.message}`));
    return this.room;
  }
  async join(code) {
    if (this.hubActive) throw new Error('AI Hub already manages this round.');
    const room = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z2-9]{6}$/.test(room)) throw new Error('Enter the six-character room code.');
    this._resetStandalone(); this.mode = 'standalone'; this.isHost = false; this.localSeat = 1;
    this.playerIds = [0, 1]; this.room = room; this._setupBroadcast();
    this._status(`Joining room ${room}…`);
    this.broadcast?.postMessage({ bb: 1, v: 1, type: 'hello', from: this.clientId });
    // First try a local tab. It is a real channel and needs no signaling service.
    await new Promise(resolve => setTimeout(resolve, 250));
    if (this.connected) return this._info();
    await this._openPeer(false);
    return this._info();
  }
  _resetStandalone() {
    this.close(); this._destroyed = false; this.ended = false; this.started = false; this.connected = false;
    this._finished = false; this._startAt = Infinity; this._otherId = null; this._transport = null;
    this._standaloneRound = 0;
    this._inputSequences.clear(); this._inputs.clear(); this._lastStateSequence = -1;
    this._lastInputSend = this._lastStateSend = -Infinity;
    this._inputLatch = { jump: false, kick: false, drop: false, pulse: false }; this._lastInput = EMPTY_INPUT;
  }
  _setupBroadcast() {
    if (!globalThis.BroadcastChannel) return;
    this.broadcast = new BroadcastChannel(`boiler-buddies-v1-${this.room}`);
    this.broadcast.onmessage = event => {
      const data = event.data;
      if (!data || data.bb !== 1 || data.from === this.clientId || (data.to && data.to !== this.clientId)) return;
      if (data.type === 'hello' && this.isHost) {
        if (this._otherId && this._otherId !== data.from) return;
        this._acceptGuest(data.from, 'broadcast');
        return;
      }
      if (data.type === 'welcome' && !this.isHost && (!this._otherId || this._otherId === data.from)) {
        this._otherId = data.from; this._transport = 'broadcast'; this._beginStandalone(); return;
      }
      if (this._transport === 'broadcast' && data.from === this._otherId) this._receive(data, this.isHost ? 1 : 0, 'broadcast');
    };
  }
  async _openPeer(hosting) {
    const Peer = await loadPeer();
    if (this._destroyed || this.connected) return;
    const peer = hosting ? new Peer(`boiler-buddies-${this.room.toLowerCase()}`, { debug: 0 }) : new Peer({ debug: 0 });
    this.peer = peer;
    peer.on('error', error => {
      if (this._destroyed) return;
      const messages = {
        'peer-unavailable': 'Room not found. Ask your buddy to keep the room open.',
        'network': 'The room service could not be reached. Try again.',
        'unavailable-id': 'That room is busy. Create another room.',
        'webrtc': 'Direct connection failed. Try a different network.',
        'browser-incompatible': 'This browser cannot make direct game connections.',
      };
      this._status(messages[error.type] || `Connection problem: ${error.message || error.type}`);
      this._notify('onError', error);
    });
    peer.on('disconnected', () => {
      if (!this._destroyed && !this.connected) this._status('Room service disconnected. Create or join a room again.');
    });
    peer.on('connection', connection => {
      if (!hosting || (this.connected && this._transport !== 'peer')) { connection.close(); return; }
      const id = connection.metadata?.bbClient;
      if (connection.metadata?.game !== 'boiler-buddies-v1' || typeof id !== 'string' || (this._otherId && this._otherId !== id)) {
        connection.on('open', () => { connection.send({ bb: 1, type: 'full' }); connection.close(); }); return;
      }
      this._bindConnection(connection, id, true);
    });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('The online room service timed out.')), 18000);
      peer.on('open', () => {
        clearTimeout(timeout);
        if (hosting) { this._hostReady = true; this._status(`Room ${this.room} • waiting for your buddy`); resolve(); }
        else {
          const connection = peer.connect(`boiler-buddies-${this.room.toLowerCase()}`, {
            reliable: true, serialization: 'json', metadata: { game: 'boiler-buddies-v1', bbClient: this.clientId },
          });
          this._bindConnection(connection, null, false);
          resolve();
        }
      });
      peer.on('error', error => { clearTimeout(timeout); reject(error); });
    });
  }
  _bindConnection(connection, id, hosting) {
    this.connection = connection;
    connection.on('open', () => {
      if (this._destroyed) return connection.close();
      if (hosting) this._acceptGuest(id, 'peer');
      else connection.send({ bb: 1, v: 1, type: 'hello', from: this.clientId });
    });
    connection.on('data', data => {
      if (!data || data.bb !== 1) return;
      if (data.type === 'full') { this._status('This room already has two buddies.'); return; }
      if (hosting && data.type === 'hello') {
        if (data.from !== this._otherId) return;
        this._send({ type: 'welcome', v: 1 }); return;
      }
      if (!hosting && data.type === 'welcome') {
        this._otherId = data.from; this._transport = 'peer'; this._beginStandalone(); return;
      }
      if (this._transport === 'peer') this._receive(data, hosting ? 1 : 0, 'peer');
    });
    connection.on('close', () => { if (this.connected && this._transport === 'peer' && !this._destroyed) this._peerLeft(); });
    connection.on('error', error => this._status(`Connection problem: ${error.message || 'please reconnect'}`));
  }
  _acceptGuest(id, transport) {
    if (this._otherId && this._otherId !== id) return;
    this._otherId = id; this._transport = transport;
    this._send({ type: 'welcome', v: 1 });
    this._beginStandalone();
  }
  _beginStandalone() {
    if (this.started || this._destroyed) return;
    this.connected = true; this.started = true; this._startAt = performance.now();
    this._standaloneRound = 1;
    this.stats.transport = this._transport === 'peer' ? 'WebRTC / PeerJS 1.5.5' : 'BroadcastChannel';
    this._status(`Buddy connected • ${this.room}`); this._startCount++;
    this._notify('onStart', this._info());
    this._heartbeat = setInterval(() => { if (this.connected) this._send({ type: 'ping' }); }, 3000);
  }
  _send(packet) {
    if (this.ended || this._destroyed) return false;
    const data = { bb: 1, ...packet };
    if (this.mode === 'hub') {
      const options = this.isHost ? { reliable: true } : { to: this._hubHost, reliable: true };
      const ok = globalThis.AIHub.send(data, options);
      if (ok) { this.stats.sent++; this.stats.bytesSent += JSON.stringify(data).length; }
      return ok;
    }
    data.from = this.clientId; if (this._otherId) data.to = this._otherId;
    data.round ??= this._standaloneRound;
    try {
      if (this._transport === 'peer' && this.connection?.open) this.connection.send(data);
      else if (this._transport === 'broadcast' && this.broadcast) this.broadcast.postMessage(data);
      else return false;
      this.stats.sent++; this.stats.bytesSent += JSON.stringify(data).length; return true;
    } catch (error) { this._status('Connection interrupted. Reconnect from the title screen.'); return false; }
  }
  _receive(data, from, transport) {
    if (this.ended || this._destroyed || !data || data.bb !== 1) return;
    this.stats.received++;
    if (data.type === 'restart' && this.mode === 'standalone' && !this.isHost && this.connected && transport !== 'hub') {
      if (!Number.isSafeInteger(data.round) || data.round <= this._standaloneRound) return;
      const countdownMs = Number.isFinite(data.at) ? Math.max(0, Math.min(2000, data.at - Date.now())) : 750;
      this._restartStandalone(countdownMs, data.round);
      return;
    }
    if (transport !== 'hub' && ['input', 'state', 'finished'].includes(data.type) && data.round !== this._standaloneRound) return;
    if (data.type === 'input' && this.isHost && this.playerIds.includes(from)) {
      if (!Number.isSafeInteger(data.seq) || data.seq <= (this._inputSequences.get(from) ?? -1)) return;
      this._inputSequences.set(from, data.seq);
      const input = cleanInput(data.input);
      this._inputs.set(from, { input, at: performance.now() });
      this._notify('onInput', input, from);
    } else if (data.type === 'state' && !this.isHost && (transport !== 'hub' || from === this._hubHost)) {
      if (!Number.isSafeInteger(data.seq) || data.seq <= this._lastStateSequence) return;
      this._lastStateSequence = data.seq; this._notify('onState', data.state);
    } else if (data.type === 'bye' && transport !== 'hub') {
      this._peerLeft();
    } else if (data.type === 'finished' && !this.isHost && transport !== 'hub') {
      if (!this._finished) { this._finished = true; this._notify('onFinish', data.result); }
    }
  }
  /** Call every frame. Brief taps are latched until the next network packet. */
  sendInput(input) {
    if (this.isHost || !this.connected || !this.canStart || this.ended) return false;
    const next = cleanInput(input);
    for (const key of ['jump', 'kick', 'drop', 'pulse']) if (next[key] && !this._lastInput[key]) this._inputLatch[key] = true;
    this._lastInput = next;
    const now = performance.now(); if (now - this._lastInputSend < 1000 / 15) return false;
    this._lastInputSend = now;
    const sent = { ...next };
    for (const key of ['jump', 'kick', 'drop', 'pulse']) sent[key] ||= this._inputLatch[key];
    const ok = this._send({ type: 'input', seq: this._inputSequence++, input: sent });
    if (ok) this._inputLatch = { jump: false, kick: false, drop: false, pulse: false };
    return ok;
  }
  /** Host snapshots use reliable delivery: full worlds are larger than a single UDP packet. */
  publish(state, force = false) {
    if (!this.isHost || !this.connected || !this.canStart || this.ended) return false;
    const now = performance.now(); if (!force && now - this._lastStateSend < 1000 / 12) return false;
    this._lastStateSend = now;
    const packet = { type: 'state', seq: this._stateSequence++, state };
    if (JSON.stringify(packet).length > 16000) { this._status('World snapshot exceeds the 16 KB session limit.'); return false; }
    return this._send(packet);
  }
  getInput(seat) {
    const entry = this._inputs.get(seat);
    return entry && performance.now() - entry.at < 500 ? { ...entry.input } : { ...EMPTY_INPUT };
  }
  finish({ won = true, score = 0, scores, stats } = {}) {
    if (!this.isHost || this.ended || this._finished) return;
    this._finished = true;
    const result = { won: !!won, score: Number(score) || 0 };
    if (this.mode === 'hub') {
      const ids = globalThis.AIHub.players.map(player => player.id);
      const values = Object.fromEntries(ids.map(id => [id, Number(scores?.[id] ?? score) || 0]));
      const details = stats ? Object.fromEntries(ids.map(id => [id, stats[id] || stats])) : undefined;
      globalThis.AIHub.finish({ standings: [ids], scores: values, won: !!won, ...(details ? { stats: details } : {}) });
    } else this._send({ type: 'finished', result });
  }
  /** Keep a standalone crew together for another shift. The Hub owns its own rounds. */
  restart() {
    if (this.hubActive || this.mode !== 'standalone' || !this.isHost || !this.connected || this.ended || !this.canStart) return false;
    const countdownMs = 750;
    const round = this._standaloneRound + 1;
    const at = Date.now() + countdownMs;
    if (!this._send({ type: 'restart', round, at })) return false;
    this._restartStandalone(countdownMs, round);
    return true;
  }
  _restartStandalone(countdownMs, round) {
    this._standaloneRound = round;
    this._finished = false; this.ended = false; this.started = true;
    this._startAt = performance.now() + countdownMs;
    this._inputs.clear();
    this._inputLatch = { jump: false, kick: false, drop: false, pulse: false };
    this._lastInput = EMPTY_INPUT;
    this._lastInputSend = this._lastStateSend = -Infinity;
    this._startCount++;
    this._status(`Another shift together • ${this.room}`);
    this._notify('onStart', this._info(countdownMs));
  }
  _peerLeft() {
    if (!this.connected) return;
    this.connected = false; this._inputs.clear();
    const departed = this.isHost ? 1 : 0;
    this.playerIds = this.playerIds.filter(id => id !== departed);
    this._status(this.isHost ? 'Your buddy disconnected. You can finish this shift solo.' : 'The host disconnected.');
    this._notify('onLeave', departed, 'disconnected');
  }
  /** Session menus must not call close: the Hub alone owns quitting/restarting. */
  close() {
    if (this.hubActive && this.mode === 'hub') return false;
    if (this.connected) this._send({ type: 'bye' });
    this._destroyed = true; this.connected = false; this.started = false;
    if (this._heartbeat) clearInterval(this._heartbeat); this._heartbeat = null;
    this.broadcast?.close(); this.broadcast = null;
    this.connection?.close(); this.connection = null;
    this.peer?.destroy(); this.peer = null;
    this.mode = 'none'; this._transport = null;
    return true;
  }
}
