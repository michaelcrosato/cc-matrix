// AI Hub ghost sessions and an optional same-browser practice wing.
export class Network {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.hub = globalThis.AIHub || null;
    this._active = !!this.hub?.active;
    this._started = false;
    this._ended = false;
    this._finished = false;
    this._score = 0;
    this._stats = {};
    this._sendElapsed = 0;
    this._progressElapsed = 1;
    this._room = '';
    this._channel = null;
    this._peers = new Map();
    this._localId = globalThis.crypto?.randomUUID?.() || `pilot-${Date.now()}-${performance.now()}`;
    this._localTimer = null;
    this._closedIds = new Set();
  }

  get active() { return this._active; }
  get started() { return this._started; }
  get ended() { return this._ended; }
  get me() { return this._active ? this.hub.me : this._localId; }
  get room() { return this._room; }
  get players() {
    if (this._active) return this.hub.players || [];
    const ids = [this._localId, ...this._peers.keys()].sort().slice(0, 4);
    const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
    return ids.map((id, i) => ({ id, name: `Pilot ${i + 1}`, color: colors[i] }));
  }
  get status() {
    if (this._active) return this._ended ? 'Hub round complete' : this.canPlay() ? `AI Hub · ${this.players.length} pilots` : 'AI Hub · awaiting launch';
    if (!this._room) return 'Solo patrol';
    return `Local wing ${this._room} · ${this.players.length}/4 pilots`;
  }

  async init() {
    if (!this._active) return null;
    this.hub.on('start', () => {
      if (this._ended) return;
      this._started = true;
      this.callbacks.start?.();
    });
    this.hub.on('message', (data, from) => {
      if (this._ended || this._closedIds.has(from) || data?.t !== 'pilot') return;
      const snapshot = this._snapshot(data.p);
      if (snapshot) this.callbacks.ghost?.(snapshot, from);
    });
    this.hub.on('leave', ({ id }) => {
      this._closedIds.add(id);
      this.callbacks.leave?.(id);
    });
    this.hub.on('time-up', () => {
      if (this._ended) return;
      const result = this.callbacks.timeup?.();
      if (typeof result === 'number') this.finish(result);
      else this.finish(result?.score ?? this._score, result?.stats ?? this._stats);
    });
    this.hub.on('end', (event) => {
      if (this._ended) return;
      this._ended = true;
      this.callbacks.end?.(event);
    });
    const info = await this.hub.connect({ mode: 'ghost', seats: [1, 4] });
    if (!info) {
      this._active = false;
      return null;
    }
    this.hub.ready();
    return info;
  }

  canPlay() {
    return !this._ended && (!this._active || (this._started && this.hub.time() >= 0));
  }

  tick(dt, playerSnapshot, score) {
    if (this._ended) return;
    this._score = Number.isFinite(score) ? score : this._score;
    if (!this.canPlay()) return;
    this._sendElapsed += Math.max(0, dt || 0);
    this._progressElapsed += Math.max(0, dt || 0);
    if (this._active && !this._finished && this._progressElapsed >= 1) {
      this._progressElapsed %= 1;
      this.hub.progress({ score: this._score, label: `${Math.floor(this._score)} command points` });
    }
    if (this._sendElapsed < 0.1) return;
    this._sendElapsed %= 0.1;
    const snapshot = this._snapshot(playerSnapshot);
    if (!snapshot) return;
    if (this._active) this.hub.send({ t: 'pilot', p: snapshot }, { reliable: false });
    else if (this._channel && this.players.some((p) => p.id === this._localId)) this._post({ t: 'pilot', p: snapshot, score: this._score });
  }

  finish(score, stats = {}) {
    if (this._ended || this._finished) return;
    this._finished = true;
    this._score = Number.isFinite(score) ? score : this._score;
    this._stats = stats && typeof stats === 'object' ? stats : {};
    if (this._active) this.hub.result({ score: this._score, stats: this._stats });
  }

  hostRoom(code) {
    if (this._active) return false;
    if (!code) {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      code = Array.from(bytes, (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    }
    return this.joinRoom(code);
  }

  joinRoom(code) {
    if (this._active || typeof BroadcastChannel !== 'function') return false;
    const cleaned = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (!cleaned) return false;
    this.leaveRoom();
    this._room = cleaned;
    this._channel = new BroadcastChannel(`stellar-raiders-wing-v1-${cleaned}`);
    this._channel.onmessage = ({ data }) => this._receiveLocal(data);
    this._post({ t: 'hello' });
    this._localTimer = setInterval(() => {
      this._post({ t: 'presence' });
      const now = performance.now();
      for (const [id, peer] of this._peers) {
        if (now - peer.seen > 6000) {
          this._peers.delete(id);
          this.callbacks.leave?.(id);
        }
      }
    }, 1000);
    return cleaned;
  }

  leaveRoom() {
    if (this._channel) {
      this._post({ t: 'bye' });
      this._channel.close();
      this._channel = null;
    }
    clearInterval(this._localTimer);
    this._localTimer = null;
    for (const id of this._peers.keys()) this.callbacks.leave?.(id);
    this._peers.clear();
    this._room = '';
  }

  _post(data) {
    try { this._channel?.postMessage({ ...data, id: this._localId, v: 1 }); } catch { /* A closed practice wing is harmless. */ }
  }

  _receiveLocal(data) {
    if (!data || data.v !== 1 || typeof data.id !== 'string' || data.id === this._localId || data.id.length > 100) return;
    if (data.t === 'bye') {
      this._peers.delete(data.id);
      this.callbacks.leave?.(data.id);
      return;
    }
    if (!['hello', 'presence', 'pilot'].includes(data.t)) return;
    if (!this._peers.has(data.id) && this._peers.size >= 3) return;
    this._peers.set(data.id, { seen: performance.now(), score: Number(data.score) || 0 });
    if (data.t === 'hello') this._post({ t: 'presence' });
    if (data.t === 'pilot') {
      const snapshot = this._snapshot(data.p);
      if (snapshot) this.callbacks.ghost?.(snapshot, data.id);
    }
  }

  _snapshot(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
      const json = JSON.stringify(value);
      return json.length <= 4000 ? JSON.parse(json) : null;
    } catch { return null; }
  }
}
