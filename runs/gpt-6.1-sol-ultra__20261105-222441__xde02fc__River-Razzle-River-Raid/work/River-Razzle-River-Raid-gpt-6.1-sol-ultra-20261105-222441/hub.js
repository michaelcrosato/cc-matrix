/* River Razzle networking. AI Hub Session Protocol v1, client 1.4.0.
 * Host runs simulation; wingmates send controls and render snapshots.
 * Outside AI Hub a same-browser room uses BroadcastChannel, with no service.
 */
const ROOM_PREFIX = 'river-razzle-v1-';
const hz = 1 / 15;
const noop = () => {};
const now = () => performance.now();
const cleanInput = (input = {}) => ({
  x: Math.max(-1, Math.min(1, Number(input.x) || 0)),
  y: Math.max(-1, Math.min(1, Number(input.y) || 0)),
  fire: !!input.fire,
  pulse: !!input.pulse,
  ...(Number.isFinite(input.target) ? { target: Math.max(-80, Math.min(80, input.target)) } : {}),
});
const roomCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const newCode = () => {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
};

export class Network {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.active = false;
    this.embedded = false;
    this.mode = 'solo';
    this.isHost = true;
    this.localId = 0;
    this.hostId = 0;
    this.players = [{ id: 0, name: 'Red One', color: '#ef6e52' }];
    this.server = false;
    this.ended = false;
    this.started = false;
    this.startAt = Infinity;
    this.code = '';
    this.channel = null;
    this.peerNonce = null;
    this.nonce = newCode() + newCode();
    this.elapsed = 0;
    this.seq = 0;
    this.remoteSeq = -1;
    this.lastSnapshot = null;
    this.lastPeer = 0;
    this.lastHeartbeat = 0;
    this.sent = 0;
    this.received = 0;
    this.dropped = 0;
    this.finished = false;
    this.input = cleanInput();
    this.off = [];
    this.joinTimer = null;
    this.heartbeatTimer = null;
    this.joinResolve = null;
    this.onUnload = () => this._post({ type: 'bye' });
    window.addEventListener('beforeunload', this.onUnload);
  }

  _emit(name, value, second) {
    (this.callbacks[name] || noop)(value, second);
  }

  _status(message = '') {
    const info = {
      active: this.active, embedded: this.embedded, mode: this.mode,
      isHost: this.isHost, localId: this.localId, hostId: this.hostId,
      server: this.server, code: this.code, count: this.players.length,
      players: this.players.map((p) => ({ ...p })), started: this.started,
      ended: this.ended, message,
    };
    this._emit('onStatus', info);
    return info;
  }

  async init() {
    const hub = window.AIHub;
    if (hub?.active) {
      this.embedded = true;
      this.mode = 'hub';
      this.active = true;
      const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
      if (!info) {
        this.embedded = false;
        this.active = false;
        this.mode = 'solo';
        return this._status('Flying solo');
      }
      this.isHost = info.isHost;
      this.localId = info.me;
      this.hostId = info.host;
      this.server = !!info.server;
      this.players = info.players;
      this.off.push(hub.on('start', (event) => {
        this.started = true;
        this.startAt = now() + event.in;
        this.ended = false;
        this.finished = false;
        this.remoteSeq = -1;
        this._emit('onStart', { delay: event.in, players: this.players, localId: this.localId, isHost: this.isHost, server: this.server, embedded: true });
        this._status('Squadron airborne');
      }));
      this.off.push(hub.on('message', (data, from) => this._receive(data, from)));
      this.off.push(hub.on('leave', (event) => {
        this.players = this.players.filter((p) => p.id !== event.id);
        this._emit('onLeave', event);
        this._status('Wingmate left the flight');
      }));
      this.off.push(hub.on('time-up', (event) => {
        this._emit('onTimeUp', event);
        // A valid team result is always returned, even if the game is on an overlay.
        if (this.isHost) setTimeout(() => {
          if (!this.ended && !this.finished) this.finish(Number(this.lastSnapshot?.score) || 0, false);
        }, Math.min(100, Math.max(0, (event.graceMs || 1000) / 4)));
      }));
      this.off.push(hub.on('end', (event) => {
        this.ended = true;
        this.started = false;
        this._emit('onEnd', event);
        this._status('Round complete');
      }));
      return this._status('Waiting for AI Hub countdown');
    }
    const args = new URLSearchParams(location.search);
    if (args.has('room')) await this.joinRoom(args.get('room'));
    return this._status('Ready for takeoff');
  }

  ready() {
    if (this.embedded) window.AIHub.ready();
  }

  time() {
    return this.embedded ? window.AIHub.time() : this.started ? now() - this.startAt : -Infinity;
  }

  _receive(data, from) {
    if (this.ended || !data || data.game !== 'river-razzle' || data.v !== 1) return;
    this.received++;
    if (data.type === 'input' && this.isHost && this.players.some((p) => p.id === from)) {
      this._emit('onInput', cleanInput(data.input), from);
    } else if (data.type === 'state' && !this.isHost && from === this.hostId && Number(data.seq) > this.remoteSeq) {
      this.remoteSeq = Number(data.seq);
      this.lastSnapshot = data.state;
      this._emit('onSnapshot', data.state);
    } else if (data.type === 'end' && !this.embedded && !this.isHost && from === this.hostId) {
      this.ended = true;
      this.started = false;
      this._emit('onEnd', { reason: 'finished', won: data.won, score: data.score });
      this._status('Flight complete');
    }
  }

  _send(data) {
    if (!this.active || this.ended) return false;
    const packet = { game: 'river-razzle', v: 1, ...data };
    let accepted;
    if (this.embedded) {
      // Target only the host for input; snapshots go to all player copies.
      accepted = window.AIHub.send(packet, this.isHost ? { reliable: false } : { to: this.hostId, reliable: false });
    } else {
      accepted = this._post({ type: 'data', from: this.localId, data: packet });
    }
    if (accepted) this.sent++;
    else this.dropped++;
    return accepted;
  }

  update(dt, input, snapshot) {
    if (snapshot !== undefined) this.lastSnapshot = snapshot;
    this.input = cleanInput(input);
    if (!this.active || !this.started || this.ended || this.time() < 0) return;
    this.elapsed += Math.max(0, Number(dt) || 0);
    if (this.elapsed < hz) return;
    this.elapsed %= hz;
    if (this.isHost) {
      if (this.lastSnapshot != null) this._send({ type: 'state', seq: ++this.seq, state: this.lastSnapshot });
    } else if (!this.server) {
      this._send({ type: 'input', input: this.input });
    }
  }

  finish(score = 0, won = false, stats = {}) {
    if (!this.active || !this.isHost || this.ended || this.finished) return;
    this.finished = true;
    const ids = this.players.map((p) => p.id);
    if (this.embedded) {
      window.AIHub.finish({
        standings: [ids], scores: Object.fromEntries(ids.map((id) => [id, Number(score) || 0])), won: !!won,
        stats: Object.fromEntries(ids.map((id) => [id, stats])),
      });
    } else {
      this._send({ type: 'end', score: Number(score) || 0, won: !!won });
      this.ended = true;
      this.started = false;
      this._emit('onEnd', { reason: 'finished', score: Number(score) || 0, won: !!won });
      this._status('Flight complete');
    }
  }

  createRoom() {
    if (this.embedded) return null;
    if (this.channel) this._post({ type: 'bye' });
    this.leaveRoom(false);
    this.code = newCode();
    this.mode = 'room';
    this.active = true;
    this.isHost = true;
    this.localId = 0;
    this.hostId = 0;
    this.players = [{ id: 0, name: 'Red One', color: '#ef6e52' }];
    this._openChannel();
    this._status('Room open. Join this code in another tab on this browser.');
    return this.code;
  }

  async joinRoom(value) {
    if (this.embedded) return false;
    const code = roomCode(value);
    if (!code) { this._status('Enter a room code'); return false; }
    if (this.channel) this._post({ type: 'bye' });
    this.leaveRoom(false);
    this.code = code;
    this.mode = 'room';
    this.active = true;
    this.isHost = false;
    this.localId = 1;
    this.hostId = 0;
    this.players = [];
    this._openChannel();
    this._status('Calling the squadron…');
    return new Promise((resolve) => {
      this.joinResolve = resolve;
      this._post({ type: 'join' });
      this.joinTimer = setTimeout(() => {
        if (!this.joinResolve) return;
        this.joinResolve = null;
        resolve(false);
        this.leaveRoom(false);
        this._status('No open room with that code');
      }, 2500);
    });
  }

  _openChannel() {
    if (typeof BroadcastChannel !== 'function') {
      this.active = false;
      this.mode = 'solo';
      this._status('This browser does not support tab co-op. Use AI Hub for online co-op.');
      return;
    }
    this.channel = new BroadcastChannel(ROOM_PREFIX + this.code);
    this.channel.onmessage = (event) => this._roomMessage(event.data);
    this.lastPeer = now();
    this.heartbeatTimer = setInterval(() => {
      this._post({ type: 'ping' });
      if (this.peerNonce && now() - this.lastPeer > 10000) {
        const id = this.isHost ? 1 : 0;
        this.peerNonce = null;
        if (this.isHost) this.players = this.players.filter((p) => p.id !== id);
        else { this.started = false; this.active = false; }
        this._emit('onLeave', { id, reason: 'disconnected' });
        this._status(this.isHost ? 'Wingmate disconnected' : 'Host disconnected');
      }
    }, 1000);
  }

  _post(data) {
    if (!this.channel) return false;
    this.channel.postMessage({ ...data, nonce: this.nonce });
    return true;
  }

  _roomMessage(data) {
    if (!data || data.nonce === this.nonce) return;
    if (data.type === 'join' && this.isHost) {
      if (this.started || (this.peerNonce && data.nonce !== this.peerNonce)) {
        this._post({ type: 'reject', to: data.nonce, reason: this.started ? 'Flight already underway' : 'Room already has two pilots' });
        return;
      }
      this.peerNonce = data.nonce;
      this.lastPeer = now();
      this.players = [{ id: 0, name: 'Red One', color: '#ef6e52' }, { id: 1, name: 'Blue Two', color: '#6dc6eb' }];
      this._post({ type: 'welcome', to: data.nonce, players: this.players });
      this._status('Wingmate ready. Launch the flight.');
      return;
    }
    if (data.type === 'welcome' && !this.isHost && data.to === this.nonce) {
      this.peerNonce = data.nonce;
      this.lastPeer = now();
      this.players = data.players;
      clearTimeout(this.joinTimer);
      this.joinResolve?.(true);
      this.joinResolve = null;
      this._status('Joined. Waiting for the lead pilot to launch.');
      return;
    }
    if (data.type === 'reject' && data.to === this.nonce) {
      clearTimeout(this.joinTimer);
      this.joinResolve?.(false);
      this.joinResolve = null;
      this.leaveRoom(false);
      this._status(data.reason);
      return;
    }
    if (data.nonce !== this.peerNonce) return;
    this.lastPeer = now();
    if (data.type === 'data') this._receive(data.data, data.from);
    else if (data.type === 'start' && !this.isHost) {
      this.started = true;
      this.ended = false;
      this.finished = false;
      this.remoteSeq = -1;
      this.startAt = now() + data.delay;
      this._emit('onStart', { delay: data.delay, players: this.players, localId: this.localId, isHost: false, server: false, embedded: false });
      this._status('Squadron airborne');
    } else if (data.type === 'bye') {
      const id = this.isHost ? 1 : 0;
      this.peerNonce = null;
      if (this.isHost) this.players = this.players.filter((p) => p.id !== id);
      else { this.active = false; this.started = false; }
      this._emit('onLeave', { id, reason: 'left' });
      this._status(this.isHost ? 'Wingmate left the room' : 'Host closed the room');
    }
  }

  startStandalone(delay = 1500) {
    if (this.embedded || !this.isHost) return false;
    this.started = true;
    this.ended = false;
    this.finished = false;
    this.seq = 0;
    this.remoteSeq = -1;
    this.startAt = now() + delay;
    if (this.active) this._post({ type: 'start', delay });
    this._emit('onStart', { delay, players: this.players, localId: this.localId, isHost: true, server: false, embedded: false });
    this._status('Squadron airborne');
    return true;
  }

  leaveRoom(notify = true) {
    if (this.embedded) return;
    if (notify) this._post({ type: 'bye' });
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.joinTimer);
    this.joinResolve?.(false);
    this.joinResolve = null;
    this.channel?.close();
    this.channel = null;
    this.peerNonce = null;
    this.mode = 'solo';
    this.code = '';
    this.active = false;
    this.isHost = true;
    this.localId = 0;
    this.hostId = 0;
    this.server = false;
    this.started = false;
    this.ended = false;
    this.finished = false;
    this.players = [{ id: 0, name: 'Red One', color: '#ef6e52' }];
    if (notify) this._status('Flying solo');
  }

  debug() {
    return { ...this._statusQuiet(), sent: this.sent, received: this.received, dropped: this.dropped, seq: this.seq, remoteSeq: this.remoteSeq, time: this.time() };
  }

  _statusQuiet() {
    return { active: this.active, embedded: this.embedded, mode: this.mode, localId: this.localId, isHost: this.isHost, server: this.server, code: this.code, count: this.players.length, started: this.started, ended: this.ended };
  }

  destroy() {
    if (!this.embedded) this.leaveRoom();
    this.off.forEach((off) => off());
    window.removeEventListener('beforeunload', this.onUnload);
  }
}
