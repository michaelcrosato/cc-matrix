/** Star Riders networking: AI Hub Session Protocol v1 and standalone PeerJS wings. */
const PEER_URL = 'https://esm.sh/peerjs@1.5.5?bundle';
const COLORS = ['#ff744f', '#49dcd1', '#e6c86e', '#b894f4'];
const noop = () => {};
const randomInt = () => crypto.getRandomValues(new Uint32Array(1))[0];
const roomId = (code) => `star-riders-20261105-${code.toLowerCase()}`;
const player = (id) => ({ id, name: id === 0 ? 'Wing leader' : `Rider ${id + 1}`, color: COLORS[id] });

export class Network {
  constructor({ onStart = noop, onGhost = noop, onEnd = noop, onStatus = noop,
    onTimeUp = noop, peerFactory = null } = {}) {
    Object.assign(this, { onStart, onGhost, onEnd, onStatus, onTimeUp, peerFactory });
    this.hubActive = !!globalThis.AIHub?.active;
    this.active = false;
    this.started = false;
    this.ended = false;
    this.isHost = false;
    this.roomCode = '';
    this.me = 0;
    this.players = [];
    this.seed = 0;
    this.info = null;
    this._peer = null;
    this._connections = new Map();
    this._hostConnection = null;
    this._sendElapsed = 0;
    this._progressElapsed = 0;
    this._score = 0;
    this._resultSent = false;
    this._readySent = false;
    this._clockTimer = null;
    this._startTimer = null;
    this._generation = 0;
    this.results = new Map();
  }

  async init() {
    if (!this.hubActive) return null;
    const hub = globalThis.AIHub;
    hub.on('start', () => {
      this._clockTimer = setInterval(() => {
        if (this.ended) return clearInterval(this._clockTimer);
        if (hub.time() >= 0 && this.info) {
          clearInterval(this._clockTimer);
          this._begin(this.info.seed, { ...this.info, hub: true });
        }
      }, 20);
    });
    hub.on('message', (data, from) => {
      if (this.ended || data?.type !== 'ghost' || !this._validPacket(data.packet)) return;
      this.onGhost(data.packet, from);
    });
    hub.on('leave', ({ id }) => {
      this.players = this.players.filter((p) => p.id !== id);
      this.onGhost({ gone: true }, id);
    });
    hub.on('time-up', () => {
      if (this.ended || this._resultSent) return;
      this.onTimeUp();
      if (!this._resultSent) this.result(this._score);
    });
    hub.on('end', ({ reason }) => {
      if (this.ended) return;
      this.ended = true;
      this.active = false;
      clearInterval(this._clockTimer);
      clearTimeout(this._startTimer);
      this.onEnd(reason);
    });
    const info = await hub.connect({ mode: 'ghost', seats: [1, 4] });
    if (!info) { this.hubActive = false; return null; }
    this.info = info;
    this.seed = info.seed;
    this.me = info.me;
    this.isHost = info.isHost;
    this.players = info.players;
    this.active = true;
    this.onStatus('Wing linked. Awaiting mission clock.');
    return info;
  }

  ready() {
    if (this.hubActive && this.info && !this._readySent && !this.ended) {
      this._readySent = true;
      globalThis.AIHub.ready();
    }
  }

  _begin(seed, info) {
    if (this.started || this.ended) return;
    this.seed = seed >>> 0;
    this.started = true;
    this.active = true;
    this._resultSent = false;
    this._sendElapsed = 0.1;
    this._progressElapsed = 1;
    this.onStart(this.seed, info);
  }

  _validPacket(packet) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet)) return false;
    try { return JSON.stringify(packet).length <= 1100; } catch { return false; }
  }

  update(dt, packet, score = 0, label = '') {
    this._score = Number.isFinite(score) ? score : 0;
    if (!this.active || !this.started || this.ended) return;
    this._sendElapsed += Math.max(0, dt);
    this._progressElapsed += Math.max(0, dt);
    if (this._sendElapsed >= 0.1 && this._validPacket(packet)) {
      this._sendElapsed %= 0.1;
      if (this.hubActive) globalThis.AIHub.send({ type: 'ghost', packet }, { reliable: false });
      else if (this.isHost) this._broadcast({ type: 'ghost', from: this.me, packet });
      else this._send(this._hostConnection, { type: 'ghost', packet });
    }
    if (this._progressElapsed >= 1) {
      this._progressElapsed %= 1;
      if (this.hubActive && !this._resultSent) {
        globalThis.AIHub.progress({ score: this._score, label: String(label).slice(0, 100) });
      }
    }
  }

  result(score = this._score, stats = {}) {
    if (this.ended || this._resultSent || !this.started) return;
    this._resultSent = true;
    const report = { score: Number.isFinite(score) ? Math.round(score) : 0, stats };
    this.results.set(this.me, report);
    if (this.hubActive) globalThis.AIHub.result(report);
    else if (this.active) {
      const data = { type: 'result', from: this.me, ...report };
      if (this.isHost) { this._broadcast(data); this._publishResults(); }
      else this._send(this._hostConnection, data);
    }
  }

  async _makePeer(id) {
    if (this.hubActive) throw new Error('Standalone rooms are disabled during AI Hub sessions.');
    const Peer = this.peerFactory || (await import(PEER_URL)).default;
    const peer = new Peer(id, { debug: 0, secure: true });
    this._peer = peer;
    await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => finish(new Error('Relay unavailable. Check your connection and try again.')), 15000);
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error); else resolve();
      };
      peer.on('open', () => finish());
      peer.on('error', (error) => {
        if (!settled) return finish(new Error(this._errorText(error)));
        this.onStatus(this._errorText(error));
      });
      peer.on('disconnected', () => {
        if (this._peer !== peer) return;
        this.onStatus('Signaling relay disconnected. Existing wing links remain active.');
      });
      peer.on('close', () => {
        if (this._peer !== peer) return;
        this.onStatus('Wing relay closed.');
      });
    });
    return peer;
  }

  _errorText(error) {
    const type = error?.type;
    if (type === 'peer-unavailable') return 'Room not found. Check the six-letter code.';
    if (type === 'unavailable-id') return 'Room code busy. Create a new wing.';
    if (type === 'browser-incompatible') return 'This browser cannot open peer links.';
    if (type === 'network' || type === 'server-error' || type === 'socket-error') return 'Wing relay unavailable. Check your connection.';
    return 'Wing connection failed. Please try again.';
  }

  async createRoom() {
    if (this.hubActive) return null;
    this.leave();
    const generation = this._generation;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    this.roomCode = Array.from({ length: 6 }, () => alphabet[randomInt() % alphabet.length]).join('');
    this.seed = randomInt();
    this.isHost = true;
    this.me = 0;
    this.players = [player(0)];
    this.onStatus('Opening wing relay…');
    try {
      const peer = await this._makePeer(roomId(this.roomCode));
      if (generation !== this._generation) { peer.destroy(); return null; }
      this.active = true;
      peer.on('connection', (connection) => this._accept(connection));
      this.onStatus(`Wing ${this.roomCode} · 1/4 riders. Share the code, then launch.`);
      return this.roomCode;
    } catch (error) {
      this.onStatus(error.message);
      this._peer?.destroy();
      this._peer = null;
      this.active = false;
      return null;
    }
  }

  async joinRoom(code) {
    if (this.hubActive) return false;
    const clean = String(code).trim().toUpperCase();
    if (!/^[A-Z]{6}$/.test(clean)) { this.onStatus('Enter a six-letter wing code.'); return false; }
    this.leave();
    const generation = this._generation;
    this.roomCode = clean;
    this.isHost = false;
    this.onStatus('Contacting wing leader…');
    try {
      const peer = await this._makePeer(undefined);
      if (generation !== this._generation) { peer.destroy(); return false; }
      const connection = peer.connect(roomId(clean), { reliable: true, serialization: 'json' });
      this._hostConnection = connection;
      await new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => done(new Error('Wing did not answer. Check the code.')), 15000);
        const done = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error) reject(error); else resolve();
        };
        connection.on('data', (data) => {
          if (generation !== this._generation) return;
          if (data?.type === 'welcome') { this._receiveClient(data); done(); }
          else if (data?.type === 'reject') done(new Error(data.reason || 'Wing unavailable.'));
          else this._receiveClient(data);
        });
        connection.on('error', () => done(new Error('Wing link failed. Try joining again.')));
        connection.on('close', () => {
          done(new Error('Wing leader disconnected.'));
          if (generation === this._generation) this._hostGone();
        });
        peer.on('error', (error) => done(new Error(this._errorText(error))));
      });
      return true;
    } catch (error) {
      this.onStatus(error.message);
      this._peer?.destroy();
      this._peer = null;
      this.active = false;
      return false;
    }
  }

  _accept(connection) {
    connection.on('open', () => {
      if (this.started || this._connections.size >= 3) {
        this._send(connection, { type: 'reject', reason: this.started ? 'Wing already launched. Wait for a new mission.' : 'Wing is full.' });
        setTimeout(() => connection.close(), 200);
        return;
      }
      let id = 1;
      while (this._connections.has(id)) id += 1;
      this._connections.set(id, connection);
      this.players.push(player(id));
      this.players.sort((a, b) => a.id - b.id);
      this._send(connection, { type: 'welcome', me: id, seed: this.seed, players: this.players, roomCode: this.roomCode });
      this._broadcast({ type: 'roster', players: this.players });
      this.onStatus(`Wing ${this.roomCode} · ${this.players.length}/4 riders. Ready to launch.`);
      connection.on('data', (data) => this._receiveHost(id, data));
      connection.on('close', () => {
        if (this._connections.get(id) !== connection) return;
        this._connections.delete(id);
        this.players = this.players.filter((p) => p.id !== id);
        this.onGhost({ gone: true }, id);
        this._broadcast({ type: 'departed', id, players: this.players });
        this.onStatus(`Rider ${id + 1} disconnected. ${this.players.length} rider${this.players.length === 1 ? '' : 's'} remain.`);
      });
      connection.on('error', () => connection.close());
    });
  }

  _receiveHost(id, data) {
    if (!data || this.ended) return;
    if (data.type === 'ghost' && this.started && this._validPacket(data.packet)) {
      this.onGhost(data.packet, id);
      this._broadcast({ type: 'ghost', from: id, packet: data.packet }, id);
    } else if (data.type === 'result' && this.started && Number.isFinite(data.score)) {
      this.results.set(id, { score: data.score, stats: data.stats || {} });
      this._broadcast({ type: 'result', from: id, score: data.score, stats: data.stats || {} });
      this._publishResults();
    }
  }

  _receiveClient(data) {
    if (!data || this.ended) return;
    if (data.type === 'welcome') {
      this.me = data.me;
      this.seed = data.seed;
      this.players = data.players;
      this.active = true;
      this.info = { me: this.me, players: this.players, seed: this.seed, isHost: false, hub: false };
      this.onStatus(`Wing ${this.roomCode} · ${this.players.length}/4 riders. Awaiting leader's launch.`);
    } else if (data.type === 'roster') {
      this.players = data.players;
      this.onStatus(`Wing ${this.roomCode} · ${this.players.length}/4 riders. Awaiting leader's launch.`);
    } else if (data.type === 'launch' && !this.started) {
      this.onStatus('Wing launch in 3…');
      this._startTimer = setTimeout(() => this._begin(data.seed, {
        me: this.me, players: this.players, seed: data.seed, isHost: false, hub: false,
      }), Math.max(0, Math.min(5000, data.at - Date.now())));
    } else if (data.type === 'ghost' && data.from !== this.me && this._validPacket(data.packet)) {
      this.onGhost(data.packet, data.from);
    } else if (data.type === 'departed') {
      this.players = data.players;
      this.onGhost({ gone: true }, data.id);
    } else if (data.type === 'result' && Number.isFinite(data.score)) {
      this.results.set(data.from, { score: data.score, stats: data.stats || {} });
    } else if (data.type === 'standings') {
      this.results = new Map(data.results);
      this.onStatus(this.standingsText());
    }
  }

  launchRoom() {
    if (this.hubActive || !this.active || !this.isHost || this.started || this._startTimer) return false;
    const at = Date.now() + 3000;
    this._broadcast({ type: 'launch', at, seed: this.seed });
    this.onStatus('Wing launch in 3…');
    this._startTimer = setTimeout(() => this._begin(this.seed, {
      me: this.me, players: this.players, seed: this.seed, isHost: true, hub: false,
    }), 3000);
    return true;
  }

  _publishResults() {
    this._broadcast({ type: 'standings', results: [...this.results] });
    this.onStatus(this.standingsText());
  }

  standingsText() {
    return [...this.results].sort((a, b) => b[1].score - a[1].score)
      .map(([id, result], index) => `${index + 1}. ${this.players.find((p) => p.id === id)?.name || `Rider ${id + 1}`} ${Math.round(result.score)}`)
      .join('  ·  ');
  }

  _hostGone() {
    this._hostConnection = null;
    this.active = false;
    if (this.started) this.onStatus('Wing leader disconnected. Continue your solo mission.');
    else this.onStatus('Wing leader disconnected. Create or join another wing.');
    for (const p of this.players) if (p.id !== this.me) this.onGhost({ gone: true }, p.id);
    this.players = this.players.filter((p) => p.id === this.me);
  }

  _send(connection, data) {
    if (connection?.open) {
      try { connection.send(data); } catch { /* A closing peer is removed by its close event. */ }
    }
  }

  _broadcast(data, except = null) {
    for (const [id, connection] of this._connections) if (id !== except) this._send(connection, data);
  }

  leave() {
    if (this.hubActive) return;
    this._generation += 1;
    clearInterval(this._clockTimer);
    clearTimeout(this._startTimer);
    this._startTimer = null;
    const oldPeer = this._peer;
    this._peer = null;
    this._connections.clear();
    this._hostConnection = null;
    oldPeer?.destroy();
    this.active = false;
    this.started = false;
    this.ended = false;
    this.isHost = false;
    this.players = [];
    this.roomCode = '';
    this._resultSent = false;
    this.results.clear();
  }
}
