// AI Hub transport and independent direct-link multiplayer. No game simulation lives here.
export class HockeyNetwork {
  constructor() {
    this.onEvent = () => {};
    this.hubActive = !!globalThis.AIHub?.active;
    this.info = null;
    this.isHost = true;
    this.connected = false;
    this.mode = 'none';
    this.roomCode = '';
    this.lastState = -Infinity;
    this.lastInput = -Infinity;
    this.ended = false;
    this._generation = 0;
    this._ready = false;
    this._finished = false;
    this._unsub = [];
    this._heartbeat = null;
    this._outSeq = 0;
    this._inSeq = new Map();
    globalThis.addEventListener?.('pagehide', () => this.disconnect());
  }

  get localTeam() {
    if (this.hubActive) return this.info?.server ? null : Number(this.info?.me ?? 0) % 2;
    return this.isHost ? 0 : 1;
  }

  get status() {
    if (this.ended) return 'Round ended';
    if (this.hubActive) return this.connected ? 'AI Hub session' : 'Connecting to AI Hub';
    if (this.connected) return this.mode === 'rtc' ? 'Direct link connected' : `Room ${this.roomCode} connected`;
    return this.mode === 'none' ? 'Offline' : 'Waiting for opponent';
  }

  _emit(type, data = {}) {
    try { this.onEvent(type, data); } catch (error) { console.error('Network event handler:', error); }
  }

  async init() {
    if (!this.hubActive) return null;
    const hub = globalThis.AIHub;
    this._unsub.push(hub.on('message', (data, from) => {
      if (this.ended || !data || data.game !== 'puck-wild' || !this._fresh(data, from)) return;
      if (data.kind === 'input' && this.isHost && from !== this.info?.host) this._emit('input', { from, input: data.payload });
      else if (data.kind === 'state' && !this.isHost && from === this.info?.host) this._emit('state', data.payload);
    }));
    this._unsub.push(hub.on('start', data => this._emit('start', data)));
    this._unsub.push(hub.on('time-up', data => this._emit('time-up', data)));
    this._unsub.push(hub.on('leave', data => this._emit('peer-left', data)));
    this._unsub.push(hub.on('end', data => {
      this.ended = true;
      this.connected = false;
      this._emit('end', data);
    }));
    this.info = await hub.connect({ mode: 'shared-world', seats: [2, 2] });
    if (!this.info) {
      this.hubActive = false;
      this._unsub.forEach(fn => fn());
      this._unsub = [];
      return null;
    }
    this.isHost = !!this.info.isHost;
    this.connected = true;
    this.mode = 'hub';
    this._emit('hub-ready', this.info);
    return this.info;
  }

  ready() {
    if (this.hubActive && !this._ready) {
      this._ready = true;
      globalThis.AIHub.ready();
    }
  }

  finish(teamScores, stats = {}) {
    if (!this.hubActive || !this.isHost || this._finished || this.ended) return;
    this._finished = true;
    const players = this.info.players;
    const scores = Object.fromEntries(players.map(p => [p.id, Number(teamScores[p.id % 2]) || 0]));
    const values = [...new Set(Object.values(scores))].sort((a, b) => b - a);
    const standings = values.map(value => players.filter(p => scores[p.id] === value).map(p => p.id));
    const perPlayerStats = Object.fromEntries(players.map(p => [p.id, stats[p.id % 2] || {}]));
    globalThis.AIHub.finish({ standings, scores, stats: perPlayerStats });
  }

  sendState(state) {
    if (!this.connected || !this.isHost || this.ended) return false;
    const now = performance.now();
    if (now - this.lastState < 55) return false;
    this.lastState = now;
    return this._send({ game: 'puck-wild', kind: 'state', seq: this._outSeq++, payload: state });
  }

  sendInput(input) {
    if (!this.connected || this.isHost || this.ended) return false;
    const now = performance.now();
    if (now - this.lastInput < 55) return false;
    this.lastInput = now;
    return this._send({ game: 'puck-wild', kind: 'input', seq: this._outSeq++, payload: input });
  }

  _send(data) {
    try {
      if (this.hubActive) return globalThis.AIHub.send(data, this.isHost ? { reliable: false } : { to: this.info.host, reliable: true });
      if (this.mode === 'broadcast' && this.channel) {
        this.channel.postMessage({ ...data, sender: this._id });
        return true;
      }
      if (this.mode === 'rtc' && this.dataChannel?.readyState === 'open') {
        if (this.dataChannel.bufferedAmount > 64000) return false;
        this.dataChannel.send(JSON.stringify(data));
        return true;
      }
    } catch (error) { this._emit('error', { message: error.message }); }
    return false;
  }

  _fresh(data, from = 'peer') {
    if (!Number.isFinite(data.seq)) return true;
    const key = from + ':' + data.kind;
    if (data.seq <= (this._inSeq.get(key) ?? -1)) return false;
    this._inSeq.set(key, data.seq);
    return true;
  }

  _receive(data) {
    if (!data || data.game !== 'puck-wild' || this.ended || !this._fresh(data)) return;
    if (data.kind === 'input' && this.isHost) this._emit('input', { from: 1, input: data.payload });
    if (data.kind === 'state' && !this.isHost) this._emit('state', data.payload);
  }

  _randomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return [...bytes].map(x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
  }

  hostRoom() {
    if (this.hubActive) throw new Error('AI Hub manages this connection.');
    this.disconnect();
    this.mode = 'broadcast';
    this.isHost = true;
    this.roomCode = this._randomCode();
    this._openRoom(this.roomCode);
    return this.roomCode;
  }

  joinRoom(code) {
    if (this.hubActive) throw new Error('AI Hub manages this connection.');
    const clean = String(code).toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (clean.length !== 6) throw new Error('Enter the six-character room code.');
    this.disconnect();
    this.mode = 'broadcast';
    this.isHost = false;
    this.roomCode = clean;
    this._openRoom(clean);
    const hello = () => this.channel?.postMessage({ game: 'puck-wild-room', kind: 'hello', sender: this._id });
    hello();
    this._heartbeat = setInterval(hello, 500);
    return clean;
  }

  _openRoom(code) {
    if (!globalThis.BroadcastChannel) throw new Error('This browser cannot open local rooms. Use Direct link instead.');
    this._id = crypto.randomUUID();
    this.channel = new BroadcastChannel('puck-wild-room-' + code);
    this.channel.onmessage = ({ data }) => {
      if (!data || data.sender === this._id) return;
      if (data.game === 'puck-wild-room') {
        if (data.kind === 'hello' && this.isHost && (!this.peerId || this.peerId === data.sender)) {
          const first = !this.connected;
          this.peerId = data.sender;
          this.connected = true;
          this.channel.postMessage({ game: 'puck-wild-room', kind: 'welcome', sender: this._id, to: data.sender });
          if (first) this._emit('peer-connected', { transport: 'broadcast' });
        } else if (data.kind === 'welcome' && !this.isHost && data.to === this._id) {
          const first = !this.connected;
          this.peerId = data.sender;
          this.connected = true;
          clearInterval(this._heartbeat);
          this._heartbeat = null;
          if (first) this._emit('peer-connected', { transport: 'broadcast' });
        } else if (data.kind === 'bye' && data.sender === this.peerId) {
          this.connected = false;
          this.peerId = null;
          this._emit('peer-left', { reason: 'disconnected' });
        }
        return;
      }
      if (this.connected && data.sender === this.peerId) this._receive(data);
    };
  }

  _makePeer(isHost) {
    if (this.hubActive) throw new Error('AI Hub manages this connection.');
    if (!globalThis.RTCPeerConnection) throw new Error('Direct link is unavailable in this browser.');
    this.disconnect();
    this.mode = 'rtc';
    this.isHost = isHost;
    const generation = this._generation;
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.onconnectionstatechange = () => {
      if (generation !== this._generation) return;
      const state = this.pc?.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.connected = false;
        this._emit('peer-left', { reason: state, message: 'Direct connection interrupted. A restrictive network may block WebRTC.' });
      }
    };
    this.pc.ondatachannel = event => this._attachDataChannel(event.channel, generation);
    if (isHost) this._attachDataChannel(this.pc.createDataChannel('puck-wild', { ordered: true }), generation);
    return this.pc;
  }

  _attachDataChannel(channel, generation) {
    this.dataChannel = channel;
    channel.onopen = () => {
      if (generation !== this._generation) return;
      this.connected = true;
      this._emit('peer-connected', { transport: 'rtc' });
    };
    channel.onmessage = event => {
      if (generation !== this._generation) return;
      try { this._receive(JSON.parse(event.data)); } catch { /* Ignore packets that are not game JSON. */ }
    };
    channel.onclose = () => {
      if (generation !== this._generation) return;
      this.connected = false;
      this._emit('peer-left', { reason: 'closed' });
    };
    channel.onerror = () => this._emit('error', { message: 'The direct link could not send data.' });
  }

  async _gather(pc) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      let timer;
      const done = () => {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', changed);
        resolve();
      };
      const changed = () => { if (pc.iceGatheringState === 'complete') done(); };
      pc.addEventListener('icegatheringstatechange', changed);
      timer = setTimeout(done, 6500);
    });
  }

  _encode(description) {
    return 'PW1.' + btoa(JSON.stringify({ type: description.type, sdp: description.sdp }));
  }

  _decode(value, requiredType) {
    try {
      const text = String(value).trim();
      if (!text.startsWith('PW1.') || text.length > 40000) throw new Error();
      const result = JSON.parse(atob(text.slice(4)));
      if (result.type !== requiredType || typeof result.sdp !== 'string' || !result.sdp.startsWith('v=0')) throw new Error();
      return result;
    } catch { throw new Error(`Paste the complete Puck Wild ${requiredType === 'offer' ? 'invite' : 'answer'} code.`); }
  }

  async createOffer() {
    const pc = this._makePeer(true);
    await pc.setLocalDescription(await pc.createOffer());
    await this._gather(pc);
    if (this.pc !== pc) throw new Error('Connection cancelled.');
    return this._encode(pc.localDescription);
  }

  async acceptOffer(text) {
    const offer = this._decode(text, 'offer');
    const pc = this._makePeer(false);
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await this._gather(pc);
    if (this.pc !== pc) throw new Error('Connection cancelled.');
    return this._encode(pc.localDescription);
  }

  async acceptAnswer(text) {
    if (this.mode !== 'rtc' || !this.pc || !this.isHost) throw new Error('Create an invite first.');
    await this.pc.setRemoteDescription(this._decode(text, 'answer'));
  }

  disconnect() {
    if (this.hubActive) return;
    this._generation++;
    clearInterval(this._heartbeat);
    this._heartbeat = null;
    if (this.channel) {
      this.channel.postMessage({ game: 'puck-wild-room', kind: 'bye', sender: this._id });
      this.channel.close();
      this.channel = null;
    }
    this.dataChannel?.close();
    this.pc?.close();
    this.dataChannel = null;
    this.pc = null;
    this.peerId = null;
    this.connected = false;
    this.isHost = true;
    this.mode = 'none';
    this.roomCode = '';
    this.lastState = -Infinity;
    this.lastInput = -Infinity;
    this.ended = false;
    this._finished = false;
    this._outSeq = 0;
    this._inSeq.clear();
  }
}
