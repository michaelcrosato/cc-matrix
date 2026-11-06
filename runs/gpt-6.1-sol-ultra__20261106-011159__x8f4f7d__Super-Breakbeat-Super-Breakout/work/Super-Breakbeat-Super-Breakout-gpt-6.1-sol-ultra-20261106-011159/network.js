// Super Breakbeat multiplayer. AI Hub is the only transport in a Hub session.
const PROTOCOL = 'super-breakbeat-v1';
const now = () => performance.now();
const token = () => [...crypto.getRandomValues(new Uint8Array(9))].map(n => n.toString(36)).join('');
const cleanInput = (input, player) => ({
  x: Number.isFinite(input?.x) ? Math.max(-100, Math.min(100, input.x)) : 0,
  launch: !!input?.launch, pulse: !!input?.pulse, player,
});

export class ArcadeNetwork {
  constructor() {
    this.mode = 'solo';
    this.role = 'host';
    this.connected = false;
    this.embedded = !!window.AIHub?.active;
    this.localIndex = 0;
    this.players = [{ id: 0, name: 'PILOT 1', color: '#f4c655' }];
    this.server = false;
    this.started = false;
    this.ended = false;
    this.room = '';
    this.transport = 'none';
    this.onInput = () => {};
    this.onState = () => {};
    this.onStart = () => {};
    this.onStatus = () => {};
    this.onEnd = () => {};
    this.onTimeUp = null;
    this.onLeave = () => {};
    this.sent = 0;
    this.received = 0;
    this.dropped = 0;
    this._id = token();
    this._seq = 0;
    this._lastSeq = -1;
    this._lastInput = -Infinity;
    this._lastState = -Infinity;
    this._lastScore = 0;
    this._pending = { launch: false, pulse: false };
    this._unsub = [];
    this._activeIds = new Set([0]);
  }

  get isHost() { return this.role === 'host'; }
  get canPlay() { return this.started && !this.ended && (!this.embedded || AIHub.time() >= 0); }
  get countdown() { return this.embedded ? Math.max(0, Math.ceil(-AIHub.time() / 1000)) : 0; }

  async init() {
    if (!this.embedded) return this;
    const hub = window.AIHub;
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) { this.embedded = false; return this; }
    this.info = info;
    this.transport = 'ai-hub';
    this.role = info.isHost ? 'host' : 'guest';
    this.mode = this.role;
    this.localIndex = info.server ? -1 : info.me;
    this.server = !!info.server;
    this.players = info.players.map(p => ({ ...p }));
    this._activeIds = new Set(info.players.map(p => p.id));
    this.connected = true;
    this._unsub.push(hub.on('start', () => {
      this.started = true;
      this.ended = false;
      this.onStart({ coop: this.players.length > 1, players: this.players.length, hub: true, countdown: 3 });
      this.onStatus('AI HUB · FLIGHT LINKED');
    }));
    this._unsub.push(hub.on('message', (data, from) => this._receive(data, from)));
    this._unsub.push(hub.on('leave', ({ id, reason }) => {
      this._activeIds.delete(id);
      this.onLeave({ id, reason });
      this.onStatus('A PILOT LEFT · AUTO SUPPORT ONLINE');
    }));
    this._unsub.push(hub.on('time-up', () => {
      if (!this.isHost || this.ended) return;
      if (this.onTimeUp) this.onTimeUp();
      else this.finish(this._lastScore, false);
    }));
    this._unsub.push(hub.on('end', detail => {
      this.ended = true;
      this.started = false;
      this.onEnd(detail);
    }));
    this.onStatus('AI HUB · AWAITING LAUNCH');
    return this;
  }

  ready() { if (this.embedded) AIHub.ready(); }
  fail(message) { if (this.embedded) AIHub.fail(String(message)); }

  _receive(packet, from) {
    if (packet?.protocol !== PROTOCOL || (this.ended && (this.embedded || packet.t !== 'start'))) return;
    this.received++;
    if (packet.t === 'input' && this.isHost) {
      if (this.embedded && !this._activeIds.has(from)) return;
      this.onInput(cleanInput(packet.input, this.embedded ? from : 1), this.embedded ? from : 1);
    } else if (packet.t === 'state' && !this.isHost) {
      if (this.embedded && from !== this.info.host) return;
      if (!Number.isSafeInteger(packet.seq) || packet.seq <= this._lastSeq) return;
      this._lastSeq = packet.seq;
      this.onState(packet.state);
    } else if (!this.embedded && packet.t === 'start' && !this.isHost) {
      this.started = true;
      this.ended = false;
      this._lastSeq = -1;
      this.onStart({ ...packet.config, coop: true, players: 2 });
    } else if (!this.embedded && packet.t === 'end' && !this.isHost) {
      this.ended = true;
      this.started = false;
      this.onEnd(packet.detail);
    }
  }

  _send(packet, reliable = true) {
    if (this.ended || !this.connected) return false;
    packet = { protocol: PROTOCOL, ...packet };
    if (this.embedded) {
      const opts = { reliable };
      if (!this.isHost) opts.to = this.info.host;
      const ok = AIHub.send(packet, opts);
      if (ok === false) this.dropped++; else this.sent++;
      return ok;
    }
    if (this._channel) {
      this._channel.postMessage({ ...packet, sender: this._id, target: this._peer || null });
      this.sent++;
      return true;
    }
    if (this._data?.readyState === 'open') {
      if (this._data.bufferedAmount > 256000) { this.dropped++; return false; }
      this._data.send(JSON.stringify(packet));
      this.sent++;
      return true;
    }
    return false;
  }

  sendInput(input) {
    if (this.ended || this.server) return;
    if (this.isHost) return;
    this._pending.launch ||= !!input.launch;
    this._pending.pulse ||= !!input.pulse;
    if (now() - this._lastInput < 67) return;
    this._lastInput = now();
    const actions = this._pending.launch || this._pending.pulse;
    this._send({ t: 'input', input: cleanInput({ ...input, ...this._pending }, this.localIndex) }, actions);
    this._pending = { launch: false, pulse: false };
  }

  sendState(state, force = false) {
    if (!this.isHost || this.ended) return;
    this._lastScore = Number(state?.score) || this._lastScore;
    if (!force && now() - this._lastState < 67) return;
    this._lastState = now();
    this._send({ t: 'state', seq: ++this._seq, state }, force);
  }

  start(config = {}) {
    if (this.embedded || !this.isHost) return false;
    this.started = true;
    this.ended = false;
    this._finished = false;
    this._config = config;
    this._lastSeq = -1;
    if (this.connected) this._send({ t: 'start', config });
    this.onStart({ ...config, coop: this.connected, players: this.connected ? 2 : 1 });
    return true;
  }

  finish(score = 0, won = false, stats = {}) {
    if (!this.isHost || this.ended || this._finished) return;
    this._finished = true;
    if (this.embedded) {
      const ids = [...this._activeIds];
      const scores = Object.fromEntries(ids.map(id => [id, Number(score) || 0]));
      const cleanStats = Object.fromEntries(Object.entries(stats).slice(0, 6).map(([key, value]) => [String(key).slice(0, 16), value]));
      AIHub.finish({ standings: [ids], scores, won: !!won, stats: Object.fromEntries(ids.map(id => [id, cleanStats])) });
    } else {
      this._send({ t: 'end', detail: { reason: 'finished', score, won, stats } });
    }
    // The hub owns the final end event; the local copy can show its own result now.
    if (!this.embedded) { this.started = false; this.ended = true; }
  }

  async host() {
    if (this.embedded) return '';
    this.leave();
    if (!('BroadcastChannel' in window)) throw new Error('Room links need a browser with BroadcastChannel.');
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.room = [...crypto.getRandomValues(new Uint8Array(6))].map(n => alphabet[n % alphabet.length]).join('');
    this.mode = 'host'; this.role = 'host'; this.localIndex = 0;
    this.transport = 'broadcast-channel';
    this._openRoom(this.room);
    this.onStatus('ROOM ' + this.room + ' · WAITING FOR PILOT 2');
    return this.room;
  }

  async join(room) {
    if (this.embedded) return false;
    this.leave();
    const code = String(room).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) throw new Error('Enter the six-character room code.');
    this.room = code; this.mode = 'guest'; this.role = 'guest'; this.localIndex = 1;
    this.transport = 'broadcast-channel';
    this._openRoom(code);
    return new Promise((resolve, reject) => {
      this._joinResolve = resolve;
      this._joinTimer = setTimeout(() => {
        this._joinResolve = null;
        this.leave();
        reject(new Error('Room not found. Use another tab on this browser, or use a direct link.'));
      }, 6000);
      this._channel.postMessage({ protocol: PROTOCOL, t: 'join', sender: this._id });
    });
  }

  _openRoom(code) {
    this._channel = new BroadcastChannel(PROTOCOL + ':' + code);
    this._channel.onmessage = ({ data }) => {
      if (data?.protocol !== PROTOCOL || data.sender === this._id || (data.target && data.target !== this._id)) return;
      if (data.t === 'join' && this.isHost) {
        if (this._peer && this._peer !== data.sender) {
          this._channel.postMessage({ protocol: PROTOCOL, t: 'full', sender: this._id, target: data.sender });
          return;
        }
        this._peer = data.sender;
        this.connected = true;
        this.players = [{ id: 0, name: 'PILOT 1', color: '#f4c655' }, { id: 1, name: 'PILOT 2', color: '#77dbdc' }];
        this._send({ t: 'welcome', players: this.players });
        if (this.started) this._send({ t: 'start', config: this._config || {} });
        this.onStatus('PILOT 2 CONNECTED · READY TO LAUNCH');
      } else if (data.t === 'welcome' && !this.isHost && !this.connected) {
        this._peer = data.sender;
        this.connected = true;
        this.players = data.players;
        clearTimeout(this._joinTimer);
        this._joinResolve?.(true);
        this._joinResolve = null;
        this.onStatus('LINKED · HOST WILL LAUNCH');
      } else if (data.t === 'bye' && data.sender === this._peer) {
        this.connected = false;
        this._peer = null;
        this.onLeave({ id: this.isHost ? 1 : 0, reason: 'left' });
        this.onStatus(this.isHost ? 'PILOT 2 LEFT · AUTO SUPPORT ONLINE' : 'HOST LEFT · RETURN TO FLIGHT DECK');
        if (!this.isHost) { this.started = false; this.onEnd({ reason: 'host-left' }); }
      } else if (!this._peer || data.sender === this._peer) this._receive(data, this.isHost ? 1 : 0);
    };
  }

  // Manual, serverless cross-machine link. ICE uses local candidates only;
  // it works on a LAN/VPN. Internet NAT traversal is provided by AI Hub.
  async createOffer() {
    if (this.embedded) throw new Error('AI Hub manages this connection.');
    this.leave(); this.mode = 'host'; this.role = 'host'; this.transport = 'webrtc';
    const pc = this._makePeer();
    this._attachData(pc.createDataChannel(PROTOCOL));
    await pc.setLocalDescription(await pc.createOffer());
    await this._gather(pc);
    return this._encode(pc.localDescription);
  }

  async acceptOffer(offer) {
    if (this.embedded) throw new Error('AI Hub manages this connection.');
    this.leave(); this.mode = 'guest'; this.role = 'guest'; this.localIndex = 1; this.transport = 'webrtc';
    const pc = this._makePeer();
    pc.ondatachannel = event => this._attachData(event.channel);
    await pc.setRemoteDescription(this._decode(offer, 'offer'));
    await pc.setLocalDescription(await pc.createAnswer());
    await this._gather(pc);
    return this._encode(pc.localDescription);
  }

  async acceptAnswer(answer) {
    if (this.embedded || !this._pc || !this.isHost) throw new Error('Create a direct offer first.');
    await this._pc.setRemoteDescription(this._decode(answer, 'answer'));
    this.onStatus('DIRECT LINK · CONNECTING');
    return true;
  }

  _makePeer() {
    const pc = this._pc = new RTCPeerConnection({ iceServers: [] });
    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        const was = this.connected;
        this.connected = false;
        this.onStatus('DIRECT LINK ' + pc.connectionState.toUpperCase());
        if (was) this.onLeave({ id: this.isHost ? 1 : 0, reason: pc.connectionState });
      }
    };
    return pc;
  }

  _attachData(channel) {
    this._data = channel;
    channel.onopen = () => {
      this.connected = true;
      this.players = [{ id: 0, name: 'PILOT 1', color: '#f4c655' }, { id: 1, name: 'PILOT 2', color: '#77dbdc' }];
      this.onStatus('DIRECT LINK · BOTH PILOTS CONNECTED');
      if (this.isHost && this.started) this._send({ t: 'start', config: this._config || {} });
    };
    channel.onmessage = event => {
      try { this._receive(JSON.parse(event.data), this.isHost ? 1 : 0); }
      catch { this.dropped++; }
    };
  }

  _gather(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', changed); resolve(); };
      const changed = () => { if (pc.iceGatheringState === 'complete') finish(); };
      const timer = setTimeout(finish, 6000);
      pc.addEventListener('icegatheringstatechange', changed);
    });
  }
  _encode(description) { return 'BB1.' + btoa(JSON.stringify({ type: description.type, sdp: description.sdp })); }
  _decode(text, type) {
    try {
      const value = JSON.parse(atob(String(text).trim().replace(/^BB1\./, '')));
      if (value.type !== type || typeof value.sdp !== 'string') throw new Error();
      return value;
    } catch { throw new Error('That is not a valid ' + type + ' code.'); }
  }

  leave() {
    if (this.embedded) return false;
    if (this.connected) this._send({ t: 'bye' });
    clearTimeout(this._joinTimer);
    this._channel?.close(); this._channel = null;
    this._data?.close(); this._data = null;
    this._pc?.close(); this._pc = null;
    this.connected = false; this.started = false; this.ended = false; this._finished = false;
    this.mode = 'solo'; this.role = 'host'; this.localIndex = 0;
    this.players = [{ id: 0, name: 'PILOT 1', color: '#f4c655' }];
    this.transport = 'none'; this.room = ''; this._peer = null; this._lastSeq = -1;
    this._pending = { launch: false, pulse: false };
    return true;
  }

  diagnostics() {
    return { mode: this.mode, role: this.role, connected: this.connected, embedded: this.embedded,
      localIndex: this.localIndex, server: this.server, transport: this.transport, room: this.room,
      started: this.started, ended: this.ended, canPlay: this.canPlay, sent: this.sent,
      received: this.received, dropped: this.dropped, players: this.players.length };
  }
  dispose() { this.leave(); for (const unsubscribe of this._unsub) unsubscribe(); this._unsub.length = 0; }
}
