/* Air-Sea Kerfuffle: host-authoritative co-op transport.
 * The untouched AI Hub session client must be the first script in <head>.
 * Standalone rooms use PeerJS; it is never loaded or contacted in AI Hub.
 */
(function (root) {
  'use strict';
  const COLORS = ['#f5b94c', '#77ddd1'];
  const PEER_CDN = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
  const noop = () => {};
  let peerLibrary;

  function loadPeer() {
    if (root.AIHub?.active) return Promise.reject(new Error('Standalone rooms are unavailable during an AI Hub round.'));
    if (root.Peer) return Promise.resolve(root.Peer);
    if (!peerLibrary) peerLibrary = new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = PEER_CDN;
      tag.onload = () => root.Peer ? resolve(root.Peer) : reject(new Error('Room transport did not load.'));
      tag.onerror = () => { peerLibrary = null; reject(new Error('Could not load rooms. Check your internet connection.')); };
      document.head.append(tag);
    });
    return peerLibrary;
  }

  class KerfuffleNetwork {
    constructor(callbacks = {}) {
      this.cb = Object.fromEntries(['onStatus', 'onSession', 'onStart', 'onState', 'onInput', 'onLeave', 'onEnd', 'onTimeUp'].map(k => [k, callbacks[k] || noop]));
      this.kind = 'offline';
      this.active = false;
      this.isHost = true;
      this.isServer = false;
      this.localSeat = 0;
      this.hostId = 0;
      this.players = [{ id: 0, name: 'Gunner 1', color: COLORS[0] }];
      this.room = '';
      this.started = false;
      this.ended = false;
      this.resultSent = false;
      this.peer = null;
      this.connections = new Map();
      this.unsubscribers = [];
      this.lastInputAt = -Infinity;
      this.lastStateAt = -Infinity;
      this.lastState = null;
      this.sequence = 0;
      this.receivedState = -1;
      this.receivedInputs = new Map();
      this.startReceived = false;
      this.roomAttempt = 0;
    }

    get canPlay() { return !this.active || (this.started && !this.ended); }
    get info() {
      return { kind: this.kind, active: this.active, me: this.localSeat, host: this.hostId, isHost: this.isHost, server: this.isServer, players: this.players.map(p => ({ ...p })), room: this.room };
    }
    status(text, state = 'info') { this.cb.onStatus({ text, state, room: this.room, players: this.players.length, kind: this.kind }); }
    roster() { this.cb.onSession(this.info); }

    async initHub() {
      const hub = root.AIHub;
      if (!hub?.active) return null;
      this.kind = 'hub';
      this.active = true;
      this.status('Joining AI Hub…');
      const info = await hub.connect({ mode: 'shared-world', seats: [1, 2] });
      if (!info) {
        this.kind = 'offline';
        this.active = false;
        return null;
      }
      this.isHost = !!info.isHost;
      this.isServer = !!info.server;
      this.localSeat = this.isServer ? null : info.me;
      this.hostId = info.host;
      this.players = info.players.map(p => ({ ...p }));
      this.roster();
      this.unsubscribers.push(
        hub.on('start', () => { this.startReceived = true; this.status('Stations ready. Stand by…'); }),
        hub.on('message', (data, from) => this.receive(data, from)),
        hub.on('leave', ({ id }) => {
          this.players = this.players.filter(p => p.id !== id);
          this.cb.onLeave(id);
          this.roster();
        }),
        hub.on('time-up', () => { if (this.isHost && !this.resultSent && !this.ended) this.cb.onTimeUp(); }),
        hub.on('end', ({ reason }) => this.end(reason, false)),
      );
      this.status('AI Hub connected. Waiting for the round.');
      return info;
    }

    ready() { if (this.kind === 'hub' && this.active) root.AIHub.ready(); }

    begin() {
      if (this.started || this.ended) return;
      this.started = true;
      this.lastInputAt = this.lastStateAt = -Infinity;
      this.status('All stations: fire at will!', 'playing');
      this.cb.onStart(this.info);
    }

    tick(input, snapshot) {
      if (!this.active || this.ended) return false;
      if (this.kind === 'hub' && this.startReceived && root.AIHub.time() >= 0) this.begin();
      if (!this.started) return false;
      const now = performance.now();
      if (this.isHost) {
        if (snapshot != null && now - this.lastStateAt >= 1000 / 12) {
          this.lastStateAt = now;
          return this.publish(snapshot);
        }
      } else if (this.localSeat != null && now - this.lastInputAt >= 1000 / 15) {
        this.lastInputAt = now;
        return this.send({ t: 'i', q: ++this.sequence, d: input || {} }, this.hostId);
      }
      return false;
    }

    publish(snapshot) {
      if (!this.active || !this.isHost || this.ended || !this.started || snapshot == null) return false;
      this.lastState = snapshot;
      return this.send({ t: 's', q: ++this.sequence, d: snapshot });
    }

    send(data, to = null) {
      if (!this.active || this.ended) return false;
      if (this.kind === 'hub') {
        // Full world snapshots travel reliably; the hub limits a JSON packet to 16KB.
        return root.AIHub.send(data, { ...(to == null ? {} : { to }), reliable: true });
      }
      if (to != null) {
        const connection = this.connections.get(to);
        if (!connection?.open) return false;
        connection.send(data);
      } else for (const connection of this.connections.values()) if (connection.open) connection.send(data);
      return true;
    }

    receive(data, from) {
      if (!this.active || this.ended || !data || typeof data !== 'object') return;
      if (data.t === 'i' && this.isHost && this.started && this.players.some(p => p.id === from)) {
        if (!Number.isFinite(data.q) || data.q <= (this.receivedInputs.get(from) ?? -1)) return;
        this.receivedInputs.set(from, data.q);
        this.cb.onInput(data.d || {}, from);
      } else if (data.t === 's' && !this.isHost && from === this.hostId) {
        if (!Number.isFinite(data.q) || data.q <= this.receivedState) return;
        this.receivedState = data.q;
        this.lastState = data.d;
        this.cb.onState(data.d);
      } else if (this.kind === 'room' && !this.isHost && from === this.hostId) {
        if (data.t === 'roster') {
          this.localSeat = data.me;
          this.players = data.players.map(p => ({ ...p }));
          this.roster();
          this.status(this.players.length > 1 ? 'Both gunners connected. Host can launch.' : 'Waiting for another gunner…', 'lobby');
          if (data.started) this.begin();
        } else if (data.t === 'go') this.begin();
        else if (data.t === 'end') this.end(data.reason || 'finished', false);
        else if (data.t === 'full') {
          this.status('That room already has two gunners.', 'error');
          this.end('room-full', false);
        }
      }
    }

    async openPeer(id, attempt) {
      const Peer = await loadPeer();
      if (attempt !== this.roomAttempt) throw new Error('Room connection cancelled.');
      const peer = new Peer(id, { debug: 0 });
      this.peer = peer;
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => { if (!settled) { settled = true; peer.destroy(); reject(new Error('Room service timed out. Please try again.')); } }, 15000);
        peer.on('open', () => { if (!settled) { settled = true; clearTimeout(timer); resolve(peer); } });
        peer.on('error', error => {
          const message = error.type === 'unavailable-id' ? 'Room code is in use. Create another room.' : error.type === 'peer-unavailable' ? 'Room not found. Check the six-character code.' : 'Room connection failed. Check your internet connection.';
          if (!settled) { settled = true; clearTimeout(timer); reject(new Error(message)); }
          else this.status(message, 'error');
        });
        peer.on('disconnected', () => { if (this.active && !this.ended) this.status('Room service disconnected. Existing gunner link may continue.', 'warning'); });
      });
    }

    prepareRoom() {
      if (root.AIHub?.active || this.kind === 'hub') throw new Error('AI Hub controls this round.');
      this.leave();
      this.kind = 'room';
      this.active = true;
      this.ended = false;
      this.started = false;
      this.resultSent = false;
      this.sequence = 0;
      this.receivedState = -1;
      this.receivedInputs.clear();
      return this.roomAttempt;
    }

    async host() {
      const attempt = this.prepareRoom();
      this.isHost = true;
      this.localSeat = this.hostId = 0;
      this.players = [{ id: 0, name: 'Gunner 1', color: COLORS[0] }];
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      this.room = Array.from(bytes, n => alphabet[n % alphabet.length]).join('');
      this.status('Opening a co-op room…');
      try {
        const peer = await this.openPeer('as-kerfuffle-' + this.room.toLowerCase(), attempt);
        if (attempt !== this.roomAttempt) throw new Error('Room connection cancelled.');
        peer.on('connection', connection => this.acceptGuest(connection));
        this.roster();
        this.status('Room open. Share the code with your second gunner.', 'lobby');
        return this.room;
      } catch (error) { if (attempt === this.roomAttempt) { this.status(error.message, 'error'); this.leave(false); } throw error; }
    }

    acceptGuest(connection) {
      const hasGuest = () => this.connections.has(1);
      connection.on('open', () => {
        if (this.ended) { connection.send({ t: 'end', reason: 'finished' }); setTimeout(() => connection.close(), 100); return; }
        if (hasGuest()) { connection.send({ t: 'full' }); setTimeout(() => connection.close(), 100); return; }
        this.connections.set(1, connection);
        this.players = [{ id: 0, name: 'Gunner 1', color: COLORS[0] }, { id: 1, name: 'Gunner 2', color: COLORS[1] }];
        connection.send({ t: 'roster', me: 1, players: this.players, started: this.started });
        if (this.lastState) connection.send({ t: 's', q: ++this.sequence, d: this.lastState });
        this.roster();
        this.status('Both gunners connected. Ready to launch.', this.started ? 'playing' : 'lobby');
      });
      connection.on('data', data => { if (this.connections.get(1) === connection) this.receive(data, 1); });
      connection.on('close', () => {
        if (this.connections.get(1) !== connection) return;
        this.connections.delete(1);
        this.receivedInputs.delete(1);
        this.players = this.players.filter(p => p.id !== 1);
        this.cb.onLeave(1);
        this.roster();
        this.status('Second gunner disconnected. The coastal watch continues.', 'warning');
      });
      connection.on('error', () => this.status('The second gunner link had a connection error.', 'warning'));
    }

    async join(code) {
      code = String(code).trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter the six-character room code.');
      const attempt = this.prepareRoom();
      this.room = code;
      this.isHost = false;
      this.localSeat = 1;
      this.hostId = 0;
      this.players = [{ id: 0, name: 'Gunner 1', color: COLORS[0] }, { id: 1, name: 'Gunner 2', color: COLORS[1] }];
      this.status('Connecting to room ' + code + '…');
      try {
        const peer = await this.openPeer(undefined, attempt);
        if (attempt !== this.roomAttempt) throw new Error('Room connection cancelled.');
        const connection = peer.connect('as-kerfuffle-' + code.toLowerCase(), { reliable: true, serialization: 'json' });
        this.connections.set(0, connection);
        connection.on('data', data => this.receive(data, 0));
        connection.on('close', () => { if (this.active && !this.ended) { this.status('Host disconnected.', 'error'); this.end('host-left', false); } });
        await new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('Could not reach the host. Check the room code and network.')); } }, 15000);
          connection.on('open', () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } });
          connection.on('error', () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Could not connect to that room.')); } });
        });
        this.roster();
        this.status('Connected. Waiting for the host to launch.', 'lobby');
        return this.info;
      } catch (error) { if (attempt === this.roomAttempt) { this.status(error.message, 'error'); this.leave(false); } throw error; }
    }

    start() {
      if (this.kind !== 'room' || !this.isHost || !this.active || this.ended || this.started) return false;
      this.send({ t: 'go' });
      this.begin();
      return true;
    }

    finish({ won = false, scores = {}, stats, snapshot } = {}) {
      if (!this.active || !this.isHost || this.resultSent || this.ended || !this.started) return false;
      if (snapshot != null) this.publish(snapshot);
      this.resultSent = true;
      if (this.kind === 'hub') {
        root.AIHub.finish({ standings: [this.players.map(p => p.id)], scores, won, ...(stats ? { stats } : {}) });
      } else {
        this.send({ t: 'end', reason: won ? 'victory' : 'finished', scores, won });
        this.end(won ? 'victory' : 'finished', false);
      }
      return true;
    }

    end(reason, broadcast = false) {
      if (this.ended) return;
      if (broadcast && this.kind === 'room' && this.isHost) this.send({ t: 'end', reason });
      this.ended = true;
      this.cb.onEnd(reason);
    }

    leave(report = true) {
      if (this.kind === 'hub') return false;
      this.roomAttempt++;
      this.active = false;
      this.started = false;
      this.ended = false;
      for (const connection of this.connections.values()) connection.close();
      this.connections.clear();
      this.peer?.destroy();
      this.peer = null;
      this.room = '';
      this.kind = 'offline';
      this.isHost = true;
      this.isServer = false;
      this.localSeat = this.hostId = 0;
      this.players = [{ id: 0, name: 'Gunner 1', color: COLORS[0] }];
      this.lastState = null;
      if (report) this.status('Standalone play.', 'offline');
      return true;
    }
  }
  root.KerfuffleNetwork = KerfuffleNetwork;
})(window);
