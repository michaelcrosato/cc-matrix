import Peer from 'peerjs';
export class Together {
  constructor(callbacks) {
    this.cb = callbacks;
    this.mode = 'solo';
    this.me = 0;
    this.isHost = true;
    this.server = false;
    this.players = [{ id: 0, name: 'June', color: '#ff9b72' }];
    this.room = '';
    this.token = Math.random().toString(36).slice(2);
    this.packet = 0;
    this.received = new Set();
    this.connections = new Map();
    this.memberTokens = new Map();
    this.lastSeen = new Map();
    this.started = false;
    this.status = '';
    this.hub = window.AIHub;
    this.lastSend = 0;
    this.finished = false;
    this.ended = false;
  }
  async initHub() {
    if (!this.hub?.active) return false;
    this.mode = 'hub';
    const info = await this.hub.connect({
      mode: 'shared-world',
      seats: [1, 4],
    });
    if (!info) {
      this.mode = 'solo';
      return false;
    }
    this.me = info.me;
    this.isHost = info.isHost;
    this.server = info.server;
    this.players = info.players;
    this.hub.on('start', () => {
      this.started = true;
      this.cb.start?.();
    });
    this.hub.on('message', (data, from) => {
      if (this.ended) return;
      if (
        this.isHost &&
        data?.type === 'input' &&
        this.players.some((p) => p.id === from)
      )
        this.cb.input?.(from, data.input);
      else if (!this.isHost && from === this.hub.host && data?.type === 'state')
        this.cb.state?.(data.state);
    });
    this.hub.on('leave', ({ id }) => {
      this.players = this.players.filter((p) => p.id !== id);
      if (this.isHost) this.cb.leave?.(id);
    });
    this.hub.on('time-up', () => {
      if (this.isHost) this.finish(false);
    });
    this.hub.on('end', (event) => {
      this.ended = true;
      this.cb.end?.(event);
    });
    return true;
  }
  ready() {
    if (this.mode === 'hub') this.hub.ready();
  }
  canStep() {
    return (
      this.mode !== 'hub' ||
      (this.started && this.hub.time() >= 0 && !this.ended)
    );
  }
  host(code) {
    this.close();
    this.mode = 'room';
    this.me = 0;
    this.isHost = true;
    this.server = false;
    this.room =
      code ||
      Array.from(
        crypto.getRandomValues(new Uint8Array(6)),
        (n) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 31],
      ).join('');
    this.players = [{ id: 0, name: 'June', color: '#ff9b72' }];
    this.startChannel();
    this.status = 'Room open. A friend can join with this code.';
    this.cb.status?.();
    try {
      this.peer = new Peer('extra-trusting-' + this.room, { debug: 0 });
      this.peer.on('connection', (conn) => this.attach(conn));
      this.peer.on('error', () => {
        this.status =
          'Room open locally. Internet signaling may be unavailable.';
        this.cb.status?.();
      });
      this.peer.on('open', () => {
        this.status = 'Room open online · share the six-letter code.';
        this.cb.status?.();
      });
    } catch {}
    return this.room;
  }
  join(code) {
    this.close();
    this.mode = 'room';
    this.isHost = false;
    this.me = -1;
    this.room = code
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    this.players = [];
    this.startChannel();
    this.status = 'Looking for your friends…';
    this.cb.status?.();
    this.helloTimer = setInterval(() => {
      if (this.me < 0) this.send({ type: 'hello' });
    }, 600);
    this.timeoutTimer = setTimeout(() => {
      if (this.me < 0) {
        this.status =
          'No answer yet. Check the code and that the host is still here. Same-browser rooms also work offline.';
        this.cb.status?.();
      }
    }, 13000);
    this.send({ type: 'hello' });
    try {
      this.peer = new Peer(undefined, { debug: 0 });
      this.peer.on('open', () =>
        this.attach(
          this.peer.connect('extra-trusting-' + this.room, { reliable: true }),
        ),
      );
      this.peer.on('error', () => {
        if (this.me < 0) {
          this.status =
            'Still looking locally. Online signaling could not be reached.';
          this.cb.status?.();
        }
      });
    } catch {}
  }
  startChannel() {
    this.heartbeat = setInterval(() => {
      if (this.mode !== 'room') return;
      this.send({ type: 'ping' });
      if (this.isHost) {
        for (const [token, id] of this.memberTokens) {
          if (Date.now() - (this.lastSeen.get(token) || Date.now()) > 15000) {
            this.memberTokens.delete(token);
            this.lastSeen.delete(token);
            this.players = this.players.filter((p) => p.id !== id);
            this.cb.leave?.(id);
            this.send({ type: 'roster', players: this.players });
            this.cb.status?.();
          }
        }
      } else if (
        this.me >= 0 &&
        this.hostToken &&
        Date.now() - (this.lastSeen.get(this.hostToken) || Date.now()) > 15000
      ) {
        this.cb.disconnected?.();
      }
    }, 1500);
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('extra-trusting-' + this.room);
      this.channel.onmessage = (e) => this.receive(e.data);
    }
  }
  attach(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      if (!this.isHost) this.send({ type: 'hello' });
    });
    conn.on('data', (data) => this.receive(data));
    conn.on('close', () => {
      this.connections.delete(conn.peer);
    });
    conn.on('error', () => {});
  }
  send(data, target = null) {
    if (this.mode === 'hub') {
      if (!this.ended)
        this.hub.send(data, {
          to: this.isHost ? undefined : this.hub.host,
          reliable: data.type !== 'state',
        });
      return;
    }
    if (this.mode !== 'room') return;
    const packet = {
      ...data,
      _from: this.token,
      _target: target,
      _id: this.token + ':' + ++this.packet,
    };
    this.channel?.postMessage(packet);
    for (const c of this.connections.values()) if (c.open) c.send(packet);
  }
  receive(data) {
    if (
      !data ||
      data._from === this.token ||
      (data._target && data._target !== this.token) ||
      this.received.has(data._id)
    )
      return;
    this.received.add(data._id);
    this.lastSeen.set(data._from, Date.now());
    if (this.received.size > 2000)
      this.received.delete(this.received.values().next().value);
    if (this.isHost && data.type === 'hello') {
      let id = this.memberTokens.get(data._from);
      if (id === undefined) {
        if (this.players.length >= 4) {
          this.send({ type: 'full' }, data._from);
          return;
        }
        id = [0, 1, 2, 3].find((n) => !this.players.some((p) => p.id === n));
        this.memberTokens.set(data._from, id);
        const player = {
          id,
          name: ['June', 'Mara', 'Kit', 'Sam'][id],
          color: ['#ff9b72', '#9ed4e0', '#c6d77c', '#d6b1e6'][id],
        };
        this.players.push(player);
        this.cb.join?.(player);
      }
      this.send(
        {
          type: 'welcome',
          me: id,
          players: this.players,
          started: this.started,
        },
        data._from,
      );
      this.send({ type: 'roster', players: this.players });
      this.status = this.players.length + ' friends in the room.';
      this.cb.status?.();
    } else if (!this.isHost && data.type === 'welcome') {
      clearInterval(this.helloTimer);
      clearTimeout(this.timeoutTimer);
      this.me = data.me;
      this.hostToken = data._from;
      this.players = data.players;
      this.status =
        'You’re together. ' +
        (data.started
          ? 'The night is already underway.'
          : 'Waiting for June to start the night.');
      this.cb.joined?.();
      this.cb.status?.();
      if (data.started && !this.started) {
        this.started = true;
        this.cb.start?.();
      }
    } else if (data.type === 'roster' && !this.isHost) {
      this.players = data.players;
      this.cb.status?.();
    } else if (data.type === 'begin' && !this.isHost && !this.started) {
      this.started = true;
      this.cb.start?.();
    } else if (data.type === 'input' && this.isHost) {
      const id = this.memberTokens.get(data._from);
      if (id !== undefined) this.cb.input?.(id, data.input);
    } else if (data.type === 'state' && !this.isHost)
      this.cb.state?.(data.state);
    else if (data.type === 'bye') {
      if (this.isHost) {
        const id = this.memberTokens.get(data._from);
        if (id !== undefined) {
          this.memberTokens.delete(data._from);
          this.players = this.players.filter((p) => p.id !== id);
          this.cb.leave?.(id);
          this.send({ type: 'roster', players: this.players });
          this.cb.status?.();
        }
      } else {
        this.status = 'June’s room closed. Your solo night is still here.';
        this.cb.disconnected?.();
      }
    } else if (data.type === 'full') {
      this.status = 'This bicycle gang already has four riders.';
      this.cb.status?.();
    }
  }
  begin() {
    this.started = true;
    this.send({ type: 'begin' });
    this.cb.start?.();
  }
  input(input) {
    if (!this.isHost && this.started && !this.ended)
      this.send({ type: 'input', input });
  }
  state(state) {
    if (this.isHost && this.started && !this.ended && this.mode !== 'solo')
      this.send({ type: 'state', state });
  }
  finish(won = true) {
    if (this.finished || !this.isHost) return;
    this.finished = true;
    if (this.mode === 'hub') {
      const score = this.cb.score?.() || 0;
      this.hub.finish({
        standings: [this.players.map((p) => p.id)],
        scores: Object.fromEntries(this.players.map((p) => [p.id, score])),
        won,
        stats: Object.fromEntries(
          this.players.map((p) => [p.id, { 'Signal strength': score }]),
        ),
        awards: won
          ? this.players.map((p) => ({
              id: p.id,
              title: 'A friend under the stars',
              detail: 'No one gets home alone.',
            }))
          : [],
      });
    }
  }
  close() {
    if (this.mode === 'room') this.send({ type: 'bye' });
    this.channel?.close();
    this.channel = null;
    this.peer?.destroy();
    this.peer = null;
    this.connections.clear();
    clearInterval(this.helloTimer);
    clearInterval(this.heartbeat);
    clearTimeout(this.timeoutTimer);
    this.memberTokens.clear();
    this.lastSeen.clear();
    this.received.clear();
    this.mode = 'solo';
    this.me = 0;
    this.isHost = true;
    this.server = false;
    this.room = '';
    this.hostToken = null;
    this.started = false;
    this.finished = false;
    this.ended = false;
    this.players = [{ id: 0, name: 'June', color: '#ff9b72' }];
  }
}
