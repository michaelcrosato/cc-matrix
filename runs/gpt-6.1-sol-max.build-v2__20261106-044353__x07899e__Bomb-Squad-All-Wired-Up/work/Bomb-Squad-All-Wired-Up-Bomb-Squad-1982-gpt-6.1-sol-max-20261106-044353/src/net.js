/* Same semantic command protocol over AI Hub and PeerJS. Only authority advances truth. */
(() => {
  'use strict';
  const W = globalThis.Wired;
  W.Session = class {
    constructor(handlers = {}) {
      Object.assign(this, handlers);
      this.mode = 'solo';
      this.authority = true;
      this.me = 'solo';
      this.sim = null;
      this.state = null;
      this.serial = 0;
      this.peers = new Map();
      this.seats = ['solo'];
      this.ended = false;
      this.lastFlush = 0;
      this.lastHello = 0;
      this.lastTime = null;
      this.sentRevision = {};
      this.dirty = new Set();
      this.pending = new Map();
      this.acks = [];
      this.syncing = false;
      this.finished = false;
      this.peer = null;
      this.connections = [];
      this.protocolErrors = 0;
      this.bytesMax = 0;
      this.status = 'Offline · solo';
      this.epoch = 0;
    }
    statusText(t) {
      this.status = t;
      this.onStatus?.(t);
    }
    clockNow() {
      return this.now ? this.now() : performance.now();
    }
    startClock() {
      if (this.mode === 'solo' || this.clockTimer || this.ended) return;
      this.clockTimer = setInterval(() => this.update(0, this.clockNow()), 125);
    }
    stopClock() {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    advanceAuthority(now = this.clockNow()) {
      if (this.mode === 'solo' || !this.authority || !this.sim || this.ended) return;
      if (this.lastTime === null) this.lastTime = now;
      const elapsed = Math.max(0, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.sim.advance(elapsed * this.sim.s.tuning.timeScale);
      this.state = this.sim.s;
    }
    async connectHub() {
      if (!globalThis.AIHub) return false;
      const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4] });
      if (!info) return false;
      this.mode = 'hub';
      this.ended = false;
      this.authority = info.isHost;
      this.me = info.server ? null : info.me;
      this.info = info;
      this.seats = info.players.map((p) => p.id);
      this.server = info.server;
      this.started = false;
      this.statusText(info.server ? 'Hub authority · no seated player' : 'Hub · synchronizing');
      AIHub.on('start', () => {
        this.started = true;
        this.lastTime = null;
      });
      AIHub.on('message', (data, from) => this.receive(data, from));
      AIHub.on('leave', ({ id }) => {
        this.seats = this.seats.filter((s) => s !== id);
        if (this.authority && this.sim) {
          this.sim.depart(id);
          this.queueAll();
        }
      });
      AIHub.on('time-up', () => {
        if (this.authority) {
          if (!this.sim) this.begin('waterfront', 'hub-timeup', true);
          this.sim.finish(false, 'Hub round time expired');
          this.finishHub();
        }
      });
      AIHub.on('end', ({ reason }) => {
        this.ended = true;
        this.stopClock();
        clearTimeout(this.finishTimer);
        this.statusText(reason === 'host-left' ? 'Host left · round ended' : 'Hub round ended');
        this.onEnd?.(reason);
      });
      AIHub.ready();
      this.startClock();
      return true;
    }
    begin(id, seed, dispatch = false) {
      if (!this.authority || this.ended) return;
      this.sim = new W.Simulation(W.makeCase(id, seed, this.seats, { dispatch }));
      this.state = this.sim.s;
      this.epoch++;
      this.sentRevision = {};
      this.finished = false;
      this.finishPending = false;
      this.lastTime = null;
      this.queueAll();
      this.startClock();
      this.onBegin?.(this.state);
      this.onState?.(this.state);
    }
    solo(id, seed) {
      this.cleanup();
      this.mode = 'solo';
      this.authority = true;
      this.me = 'solo';
      this.seats = ['solo'];
      this.ended = false;
      this.begin(id, seed);
    }
    stateHeader() {
      const s = this.sim.publicState();
      delete s.boards;
      return s;
    }
    queueAll() {
      if (this.sim) for (const b of this.sim.s.boards) this.dirty.add(b.id);
    }
    send(data, to = null) {
      if (this.ended || this.mode === 'solo') return false;
      const packet = { v: W.CONTENT, ...data };
      const length = JSON.stringify(packet).length;
      this.bytesMax = Math.max(this.bytesMax, length);
      if (length > 16000) {
        this.protocolErrors++;
        this.statusText('Snapshot too large');
        return false;
      }
      if (this.mode === 'hub')
        return AIHub.send(packet, { ...(to !== null ? { to } : {}), reliable: true });
      if (this.authority) {
        for (const [seat, p] of this.peers)
          if ((to === null || seat === to) && p.conn.open) p.conn.send(packet);
        return true;
      }
      if (this.conn?.open) {
        this.conn.send(packet);
        return true;
      }
      return false;
    }
    update(dt, now) {
      if (this.ended) return;
      if (this.mode === 'hub') {
        if (!this.started || AIHub.time() < 0) return;
        if (this.authority && !this.sim) {
          const seed = Math.floor(AIHub.rng('wired-case')() * 0xffffffff);
          this.begin('relay', 'hub-' + seed, true);
        }
      }
      this.advanceAuthority(now);
      if (this.mode !== 'solo' && this.authority && this.sim && now - this.lastFlush >= 125) {
        this.lastFlush = now;
        const s = this.sim.s;
        for (const b of s.boards) {
          const old = this.sentRevision[b.id];
          if (
            !old ||
            old.revision !== b.revision ||
            Math.abs(old.heat - b.heat) > 3 ||
            !!old.fire !== b.fire
          )
            this.dirty.add(b.id);
        }
        const urgent = this.acks.map((a) => a.board).filter(Boolean),
          ids = [...new Set([...urgent, ...this.dirty])].slice(0, 2),
          pub = this.sim.publicState();
        const boards = ids.map((id) => pub.boards.find((b) => b.id === id));
        for (const b of boards) {
          this.dirty.delete(b.id);
          this.sentRevision[b.id] = { revision: b.revision, heat: b.heat, fire: b.fire };
        }
        const acknowledgments = [],
          deferred = [];
        for (const ack of this.acks) {
          if (acknowledgments.length < 12 && (!ack.board || ids.includes(ack.board)))
            acknowledgments.push(ack);
          else deferred.push(ack);
        }
        this.acks = deferred;
        this.send({
          kind: 'state',
          epoch: this.epoch,
          head: this.stateHeader(),
          boardCount: s.boards.length,
          boards,
          acks: acknowledgments,
        });
      }
      if (
        this.mode !== 'solo' &&
        !this.authority &&
        now - this.lastHello > 1000 &&
        (!this.state || this.syncing || now - (this.lastStateTime || 0) > 3000)
      ) {
        this.lastHello = now;
        this.send({ kind: 'hello', version: W.VERSION });
      }
      if (this.mode === 'hub' && this.authority && this.sim?.s.outcome) this.finishHub();
      if (this.mode === 'peer' && this.authority) {
        for (const [seat, p] of this.peers)
          if (!p.conn.open && p.until && now > p.until) {
            this.peers.delete(seat);
          }
      }
    }
    finishHub(force = false) {
      if (this.finished || this.ended || !this.authority || !this.sim?.s.outcome) return;
      const s = this.sim.s;
      if (!this.finishPending) {
        this.finishPending = true;
        this.finalAcks = new Set();
        const pub = this.sim.publicState(),
          revisions = pub.boards.map((b) => [b.id, b.revision]);
        for (let i = 0; i < pub.boards.length; i += 2)
          this.send({
            kind: 'state',
            epoch: this.epoch,
            head: this.stateHeader(),
            boardCount: pub.boards.length,
            boards: pub.boards.slice(i, i + 2),
            finalRevisions: revisions,
            acks: this.acks.splice(0, 12),
          });
        this.finishTimer = setTimeout(() => this.finishHub(true), 900);
      }
      if (
        !force &&
        !this.seats.filter((id) => id !== this.me).every((id) => this.finalAcks.has(id))
      )
        return;
      this.finished = true;
      clearTimeout(this.finishTimer);
      AIHub.finish({
        standings: [this.seats.slice()],
        scores: Object.fromEntries(this.seats.map((id) => [id, s.outcome.score])),
        won: s.outcome.won,
      });
    }
    command(op, args = {}) {
      this.advanceAuthority();
      if (this.me === null || this.ended || !this.state)
        return { ok: false, why: 'Waiting for a complete state' };
      if (this.syncing) return { ok: false, why: 'Synchronizing boards. One moment.' };
      const b = this.state.boards.find((b) => b.id === args.board);
      const c = {
        id: `${this.epoch}-${++this.serial}`,
        caseId: this.state.id,
        op,
        ...args,
        ...(b ? { expected: b.revision } : {}),
      };
      if (this.authority) {
        const result = this.sim.command(this.me, c);
        this.state = this.sim.s;
        if (result.ok && b) this.dirty.add(b.id);
        this.onCommand?.(c, result);
        return result;
      }
      this.pending.set(c.id, c);
      this.send({ kind: 'command', command: c });
      return { ok: true, pending: true };
    }
    receive(p, from) {
      if (this.ended || !p || p.v !== W.CONTENT) return;
      if (this.authority) {
        if (p.kind === 'outcomeAck' && this.finishPending && p.revision === this.sim?.s.revision) {
          this.finalAcks.add(from);
          this.finishHub();
          return;
        }
        if (p.kind === 'hello') {
          if (this.sim) this.queueAll();
          this.send({ kind: 'welcome', version: W.VERSION }, from);
          return;
        }
        if (p.kind === 'command' && this.sim) {
          if (!this.seats.includes(from)) return;
          const c = p.command;
          if (!c || JSON.stringify(c).length > 1800) return;
          this.advanceAuthority();
          const result = this.sim.command(from, c);
          if (c.board) this.dirty.add(c.board);
          this.acks.push({ to: from, id: c.id, board: c.board, result });
          return;
        }
        if (p.kind === 'ready' && this.mode === 'peer') {
          const q = this.peers.get(from);
          if (q) q.ready = !!p.ready;
          this.broadcastLobby();
          return;
        }
      } else {
        const host = this.mode === 'hub' ? this.info.host : 'p0';
        if (from !== host) return;
        if (p.kind === 'ack') {
          const c = this.pending.get(p.id);
          this.pending.delete(p.id);
          this.onCommand?.(c, p.result);
          if (!p.result.ok) this.onReject?.(p.result.why);
          return;
        }
        if (p.kind === 'lobby') {
          this.lobby = p;
          this.seats = p.seats;
          this.onLobby?.(p);
          return;
        }
        if (p.kind === 'state') {
          this.lastStateTime = performance.now();
          if (!p.head || !Array.isArray(p.boards) || p.head.version !== W.CONTENT) return;
          for (const ack of p.acks || [])
            if (ack.to === this.me) {
              const c = this.pending.get(ack.id);
              this.pending.delete(ack.id);
              this.onCommand?.(c, ack.result);
              if (!ack.result.ok) this.onReject?.(ack.result.why);
            }
          const fresh = !this.state || this.state.id !== p.head.id || this.epoch !== p.epoch;
          if (fresh) {
            this.state = { ...p.head, boards: [] };
            this.epoch = p.epoch;
            this.pending.clear();
            this.syncing = true;
            this.onBegin?.(this.state);
          }
          if (!fresh && p.head.time < this.state.time) return;
          const map = new Map(this.state.boards.map((b) => [b.id, b]));
          for (const b of p.boards)
            if (!map.has(b.id) || b.revision >= map.get(b.id).revision) map.set(b.id, b);
          this.state = {
            ...p.head,
            boards: [...map.values()].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))),
          };
          this.syncing = this.state.boards.length !== p.boardCount;
          this.seats = this.state.seats;
          if (!this.syncing) this.onState?.(this.state);
          if (
            this.mode === 'hub' &&
            p.finalRevisions &&
            this.state.outcome &&
            p.finalRevisions.every(([id, rev]) => map.get(id)?.revision >= rev)
          )
            this.send({ kind: 'outcomeAck', revision: p.head.revision });
          return;
        }
      }
    }
    async peerLibrary() {
      if (globalThis.Peer) return;
      if (!globalThis.document) throw Error('PeerJS requires a browser');
      throw Error('PeerJS 1.5.5 failed to load. Reload this game and retry.');
    }
    peerOptions() {
      const defaults = { host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0 };
      const params = new URLSearchParams(location.search);
      if (params.has('signal')) {
        const u = new URL(params.get('signal'));
        return {
          ...defaults,
          host: u.hostname,
          port: Number(u.port) || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname,
          secure: u.protocol === 'https:',
        };
      }
      return defaults;
    }
    async hostRoom() {
      this.cleanup();
      await this.peerLibrary();
      this.mode = 'peer';
      this.authority = true;
      this.me = 'p0';
      this.seats = ['p0'];
      this.ended = false;
      this.room = W.roomCode();
      this.statusText('Contacting secure signaling…');
      const generation = ++this.generation;
      const peer = (this.peer = new Peer('bsawu-' + this.room.toLowerCase(), this.peerOptions()));
      this.ownPeer(peer, generation);
      peer.on('open', () => {
        if (this.peer !== peer) return;
        this.statusText('Room ' + this.room + ' · waiting for crew');
        this.broadcastLobby();
      });
      peer.on('connection', (conn) => {
        this.connections.push(conn);
        let seat = null;
        const timer = setTimeout(() => {
          if (seat === null) conn.close();
        }, 10000);
        conn.on('data', (p) => {
          if (!seat) {
            if (p?.kind !== 'admit') return;
            clearTimeout(timer);
            if (p.version !== W.VERSION || p.content !== W.CONTENT) {
              conn.send({ kind: 'reject', why: 'Different game version. Use the same HTML file.' });
              return;
            }
            const existing = [...this.peers].find(
              ([, q]) => q.token === p.token && !q.conn.open && q.until > performance.now(),
            );
            if (existing) {
              seat = existing[0];
              const q = existing[1];
              q.conn.close();
              this.peers.set(seat, { conn, token: q.token, ready: true });
              if (!this.seats.includes(seat)) this.seats.push(seat);
              if (this.sim && !this.sim.s.seats.includes(seat)) this.sim.s.seats.push(seat);
            } else {
              if (this.seats.length >= 4 || this.sim) {
                conn.send({
                  kind: 'reject',
                  why: this.sim
                    ? 'Case already running. Rejoin with your saved seat, or wait for a fresh room.'
                    : 'Room full (four seats).',
                });
                return;
              }
              seat = ['p1', 'p2', 'p3'].find((a) => !this.seats.includes(a));
              this.seats.push(seat);
              this.peers.set(seat, { conn, token: p.token, ready: false });
            }
            conn.send({
              kind: 'admitted',
              v: W.CONTENT,
              seat,
              room: this.room,
              version: W.VERSION,
            });
            this.broadcastLobby();
            if (this.sim) this.queueAll();
          } else if (this.peers.get(seat)?.conn === conn) this.receive(p, seat);
        });
        conn.on('close', () => {
          clearTimeout(timer);
          if (seat && this.peers.get(seat)?.conn === conn) {
            const q = this.peers.get(seat);
            q.until = performance.now() + 30000;
            this.seats = this.seats.filter((a) => a !== seat);
            this.sim?.depart(seat);
            this.queueAll();
            this.statusText(`Seat ${seat.slice(1)} disconnected · 30s rejoin grace`);
            this.broadcastLobby();
          }
        });
        conn.on('error', () => conn.close());
      });
      return this.room;
    }
    async joinRoom(code) {
      this.cleanup();
      await this.peerLibrary();
      this.mode = 'peer';
      this.authority = false;
      this.me = null;
      this.ended = false;
      this.rejected = null;
      this.room = String(code).trim().toUpperCase();
      this.statusText('Connecting to room ' + this.room + '…');
      const generation = ++this.generation;
      let token;
      try {
        token = sessionStorage.getItem('wired-seat:' + this.room);
        if (!token) {
          token = W.roomCode() + W.roomCode();
          sessionStorage.setItem('wired-seat:' + this.room, token);
        }
      } catch {
        token = W.roomCode() + W.roomCode();
      }
      const peer = (this.peer = new Peer(undefined, this.peerOptions()));
      this.ownPeer(peer, generation);
      peer.on('open', () => {
        if (this.peer !== peer) return;
        const conn = (this.conn = peer.connect('bsawu-' + this.room.toLowerCase(), {
          reliable: true,
          serialization: 'json',
        }));
        this.connections.push(conn);
        const timeout = setTimeout(() => {
          if (this.me === null) {
            this.statusText(
              'Connection timed out. Check the room code, retry, or host a new room. A restrictive network may need TURN.',
            );
            conn.close();
          }
        }, 15000);
        conn.on('open', () =>
          conn.send({ kind: 'admit', version: W.VERSION, content: W.CONTENT, token }),
        );
        conn.on('data', (p) => {
          if (this.peer !== peer) return;
          if (p?.kind === 'admitted') {
            clearTimeout(timeout);
            this.me = p.seat;
            this.startClock();
            this.statusText('Connected · seat ' + (Number(this.me.slice(1)) + 1));
            this.send({ kind: 'ready', ready: true });
            return;
          }
          if (p?.kind === 'reject') {
            clearTimeout(timeout);
            this.rejected = p.why;
            this.statusText(p.why);
            conn.close();
            return;
          }
          this.receive(p, 'p0');
        });
        conn.on('close', () => {
          clearTimeout(timeout);
          if (!this.ended) {
            this.ended = true;
            this.stopClock();
            this.statusText(
              this.rejected ||
                'Host connection closed. Rejoin within 30s to recover your seat, or return to menu.',
            );
            this.onEnd?.(this.rejected ? 'rejected' : 'host-left');
          }
        });
        conn.on('error', (err) =>
          this.statusText('Connection failed: ' + err.message + ' · Retry or Back'),
        );
      });
    }
    ownPeer(peer, generation) {
      this.generation = generation;
      peer.on('error', (e) => {
        if (this.peer === peer)
          this.statusText(
            'Network: ' + e.type + '. Check your connection and room code, then Retry or Back.',
          );
      });
      peer.on('disconnected', () => {
        if (this.peer === peer)
          this.statusText(
            'Signaling disconnected. Existing data links may continue; retry to reconnect.',
          );
      });
    }
    broadcastLobby() {
      if (this.mode !== 'peer' || !this.authority || this.sim) return;
      const p = {
        kind: 'lobby',
        seats: [...this.seats],
        ready: this.seats.filter((s) => s === 'p0' || this.peers.get(s)?.ready),
        room: this.room,
      };
      this.lobby = p;
      this.send(p);
      this.onLobby?.(p);
    }
    cleanup() {
      this.ended = true;
      this.stopClock();
      clearTimeout(this.finishTimer);
      this.finishPending = false;
      this.acks = [];
      for (const c of this.connections)
        try {
          c.close();
        } catch {}
      this.connections = [];
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      this.conn = null;
      this.peers.clear();
      this.pending.clear();
      this.dirty.clear();
      this.sim = null;
      this.state = null;
      this.lastTime = null;
      this.finished = false;
      this.syncing = false;
      this.generation = (this.generation || 0) + 1;
    }
  };
  W.roomCode = () => {
    const bytes = new Uint8Array(6);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 6; i++) bytes[i] = Math.random() * 256;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return [...bytes].map((b) => chars[b % chars.length]).join('');
  };
})();
