/** AI Hub Session Protocol v1 plus explicit same-browser practice rooms.
 * The unmodified hub/session.js must be inserted first in the HTML head.
 */
export class CoastNetwork {
  constructor({ onState = () => {}, onStatus = () => {} } = {}) {
    this.onState = onState;
    this.onStatus = onStatus;
    this.onAction = () => {};
    this.onStart = () => {};
    this.onTimeUp = () => this.finish(this.lastState?.totals || [0, 0]);
    this.onEnd = () => {};
    this.onLeave = () => {};
    this.active = !!globalThis.AIHub?.active;
    this.transport = this.active ? 'hub' : 'none';
    this.connected = false;
    this.started = false;
    this.ended = false;
    this.isHost = true;
    this.server = false;
    this.me = 0;
    this.players = [{ id: 0, name: 'You', color: '#ff7b5a' }];
    this.lastState = null;
    this.status = this.active ? 'Joining AI Hub…' : 'Solo / couch play';
    this.room = null;
    this.finished = false;
    this.sequence = 0;
    this.remoteSequence = new Map();
    this.unsubscribers = [];
    this.timer = setInterval(() => this.tick(), 100);
    this.listener = () => this.close();
    addEventListener('pagehide', this.listener);
  }

  report(text) {
    this.status = text;
    this.onStatus(text, this);
  }

  async connect() {
    if (!this.active) return null;
    const hub = globalThis.AIHub;
    this.unsubscribers.push(
      hub.on('start', event => {
        this.started = true;
        this.ended = false;
        this.report(this.server ? 'AI Hub · server' : 'AI Hub · coastal showdown');
        this.onStart(event);
      }),
      hub.on('message', (data, from) => this.receive(data, from)),
      hub.on('time-up', event => {
        if (this.isHost && !this.ended) this.onTimeUp(event);
      }),
      hub.on('leave', event => {
        this.players = this.players.filter(p => p.id !== event.id);
        this.report('AI Hub · a rider left the round');
        this.onLeave(event);
      }),
      hub.on('end', event => {
        this.ended = true;
        this.started = false;
        this.report('AI Hub · round complete');
        this.onEnd(event);
      })
    );
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
    if (!info) {
      this.active = false;
      this.transport = 'none';
      this.report('Solo / couch play');
      return null;
    }
    Object.assign(this, {
      connected: true,
      isHost: info.isHost,
      server: info.server,
      me: info.me,
      players: info.players.slice(),
      host: info.host,
      limitMs: info.limitMs,
    });
    this.report(this.server ? 'AI Hub · dedicated host ready' : 'AI Hub · waiting for the starting bell');
    return info;
  }

  ready() {
    if (this.active && this.connected) globalThis.AIHub.ready();
  }

  time() {
    return this.active ? globalThis.AIHub.time() : this.started ? performance.now() - this.startTime : -Infinity;
  }

  tick() {
    if (!this.connected || this.ended) return;
    if (this.transport === 'hub') {
      if (!this.started) return;
      if (this.isHost && this.lastState) this.send({ kind: 'world', state: this.lastState }, false);
      else if (!this.isHost) this.send({ kind: 'heartbeat' }, false);
    } else if (this.transport === 'local-room') {
      if (this.isHost) {
        this.send({ kind: 'host', started: this.started });
        if (this.lastState) this.send({ kind: 'world', state: this.lastState });
      } else {
        this.send({ kind: 'hello' });
      }
    }
  }

  publish(state) {
    if (!this.isHost || this.ended) return false;
    this.lastState = state;
    return true;
  }

  submit(action) {
    if (this.ended) return false;
    if (!this.connected || this.isHost) {
      if (!this.server) this.onAction(action, this.me);
      return true;
    }
    return this.send({ kind: 'input', seq: ++this.sequence, action }, true);
  }

  send(data, reliable = true) {
    if (this.ended) return false;
    if (this.transport === 'hub') {
      return globalThis.AIHub.send(data, this.isHost ? { reliable } : { to: this.host, reliable });
    }
    if (this.channel) {
      this.channel.postMessage({ ...data, from: this.me });
      return true;
    }
    return false;
  }

  receive(data, from) {
    if (!data || typeof data !== 'object' || this.ended) return;
    if (data.kind === 'world') {
      if (this.isHost || (this.transport === 'hub' && from !== this.host)) return;
      this.lastState = data.state;
      this.onState(data.state);
    } else if (data.kind === 'input' && this.isHost) {
      if (!this.players.some(player => player.id === from)) return;
      if (!Number.isFinite(data.seq) || data.seq <= (this.remoteSequence.get(from) || 0)) return;
      this.remoteSequence.set(from, data.seq);
      if (data.action) this.onAction(data.action, from);
    } else if (data.kind === 'hello' && this.isHost && this.transport === 'local-room') {
      if (this.players.length === 1) {
        this.players.push({ id: 1, name: 'Rider 2', color: '#7ce7dc' });
        this.report(`Browser room ${this.room} · two riders connected`);
      }
      this.send({ kind: 'host', started: this.started });
      if (this.lastState) this.send({ kind: 'world', state: this.lastState });
    } else if (data.kind === 'host' && !this.isHost && this.transport === 'local-room') {
      const first = !this.connected;
      this.connected = true;
      this.players = [
        { id: 0, name: 'Rider 1', color: '#ff7b5a' },
        { id: 1, name: 'Rider 2', color: '#7ce7dc' },
      ];
      this.report(`Browser room ${this.room} · connected`);
      if (data.started && !this.started) {
        this.started = true;
        this.startTime = performance.now();
        this.onStart({ in: 0 });
      }
      if (first) this.send({ kind: 'hello' });
    } else if (data.kind === 'start' && !this.isHost && this.transport === 'local-room') {
      this.started = true;
      this.startTime = performance.now();
      this.onStart({ in: 0 });
    } else if (data.kind === 'finish' && !this.isHost && this.transport === 'local-room') {
      this.ended = true;
      this.started = false;
      this.onEnd({ reason: 'finished', standings: data.standings, scores: data.scores });
    } else if (data.kind === 'bye' && this.transport === 'local-room') {
      this.report('Browser room · other tab disconnected');
      this.onLeave({ id: from, reason: 'disconnected' });
    }
  }

  createRoom(code) { return this.openRoom(code, true); }
  joinRoom(code) { return this.openRoom(code, false); }

  openRoom(code, host) {
    if (this.active) throw new Error('AI Hub manages the room during a session.');
    if (typeof BroadcastChannel === 'undefined') throw new Error('This browser does not support same-browser rooms.');
    const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    if (!clean) throw new Error('Enter a room code using letters or numbers.');
    this.channel?.close();
    this.channel = new BroadcastChannel(`californiroll-v1-${clean}`);
    this.channel.onmessage = event => this.receive(event.data, event.data?.from);
    this.transport = 'local-room';
    this.isHost = host;
    this.me = host ? 0 : 1;
    this.host = 0;
    this.room = clean;
    this.connected = host;
    this.ended = false;
    this.finished = false;
    this.started = false;
    this.lastState = null;
    this.players = [{ id: 0, name: 'Rider 1', color: '#ff7b5a' }];
    this.remoteSequence.clear();
    this.sequence = 0;
    this.report(host ? `Browser room ${clean} · waiting for another tab` : `Browser room ${clean} · looking for host`);
    if (!host) this.send({ kind: 'hello' });
    return clean;
  }

  start() {
    if (this.active || !this.isHost) return;
    this.started = true;
    this.ended = false;
    this.finished = false;
    this.startTime = performance.now();
    if (this.channel) this.send({ kind: 'start' });
    this.onStart({ in: 0 });
  }

  finish(scoreValues = []) {
    if (!this.isHost || this.ended || this.finished) return false;
    this.finished = true;
    const scores = {};
    const ordered = this.players.map(player => {
      const n = Number(scoreValues[player.id]);
      const score = Number.isFinite(n) ? n : 0;
      scores[player.id] = score;
      return { id: player.id, score };
    }).sort((a, b) => b.score - a.score);
    const standings = [];
    ordered.forEach((entry, i) => {
      if (i && entry.score === ordered[i - 1].score) standings[standings.length - 1].push(entry.id);
      else standings.push([entry.id]);
    });
    if (this.active) {
      globalThis.AIHub.finish({ standings, scores });
    } else if (this.channel) {
      this.send({ kind: 'finish', standings, scores });
      this.ended = true;
      this.started = false;
      this.onEnd({ reason: 'finished', standings, scores });
    }
    return true;
  }

  leaveRoom() {
    if (this.active) return;
    if (this.channel) {
      this.send({ kind: 'bye' });
      this.channel.close();
      this.channel = null;
    }
    this.transport = 'none';
    this.connected = false;
    this.started = false;
    this.ended = false;
    this.isHost = true;
    this.me = 0;
    this.players = [{ id: 0, name: 'You', color: '#ff7b5a' }];
    this.room = null;
    this.report('Solo / couch play');
  }

  close() {
    if (this.channel) {
      this.send({ kind: 'bye' });
      this.channel.close();
    }
    clearInterval(this.timer);
    this.unsubscribers.forEach(remove => remove());
    removeEventListener('pagehide', this.listener);
  }
}
