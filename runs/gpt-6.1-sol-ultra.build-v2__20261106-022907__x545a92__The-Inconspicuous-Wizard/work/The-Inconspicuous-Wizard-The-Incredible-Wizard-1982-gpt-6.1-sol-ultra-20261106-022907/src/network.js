/* The Inconspicuous Wizard — authoritative AI Hub shared-world adapter.
 * Wire v1: 12 reliable input heartbeats/s, 9 reliable full snapshots/s.
 * No socket, broker, matchmaking service, or Hub lifecycle emulation.
 */
(function (root) {
  'use strict';
  const VERSION = 1;
  const NEUTRAL = Object.freeze({ move: -1, aim: -1, fire: false });
  const FIXED_DT = 1 / 120;
  const clampDir = (value) =>
    Number.isInteger(value) && value >= -1 && value <= 3 ? value : -1;
  const sanitizeCommand = (command) => ({
    move: clampDir(command?.move),
    aim: clampDir(command?.aim),
    fire: command?.fire === true,
  });
  const bytes = (value) =>
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(JSON.stringify(value)).length
      : JSON.stringify(value).length;

  class WizardNetwork {
    constructor(hooks = {}, hub = root.AIHub) {
      this.hooks = hooks;
      this.hub = hub;
      this.active = false;
      this.running = false;
      this.ended = false;
      this.finished = false;
      this.server = false;
      this.isHost = false;
      this.localSeat = -1;
      this.sim = null;
      this.info = null;
      this.players = [];
      this.seatByPeer = new Map();
      this.commands = [];
      this.lastInput = [];
      this.acks = [];
      this.lastSnapshot = -1;
      this.inputSequence = 0;
      this.snapshotSequence = 0;
      this.clock = 0;
      this.lastInputSend = -Infinity;
      this.lastStateSend = -Infinity;
      this.unsubscribers = [];
      this.metrics = {
        sent: 0,
        received: 0,
        rejected: 0,
        dropped: 0,
        maxBytes: 0,
        finishes: 0,
        snapshots: 0,
        inputs: 0,
        maxPerSecond: 0,
      };
      this.sentAt = [];
      this.pendingStart = false;
      this.pump = null;
    }

    async connect() {
      if (!this.hub) return null;
      const on = (event, callback) =>
        this.unsubscribers.push(this.hub.on(event, callback));
      on('start', () => {
        this.pendingStart = true;
        if (this.sim && !this.ended) this.start();
      });
      on('message', (data, from) => this.receive(data, from));
      on('leave', (info) => this.leave(info));
      on('time-up', () => this.finish(false, 'time-up'));
      on('end', (info) => this.end(info));
      const info = await this.hub.connect({
        mode: 'shared-world',
        seats: [1, 2],
      });
      if (!info) {
        this.unsubscribers.splice(0).forEach((fn) => fn?.());
        return null;
      }
      this.active = true;
      this.info = info;
      this.server = info.server === true;
      this.isHost = info.isHost === true;
      this.players = info.players.map((player) => ({
        id: player.id,
        name: String(player.name || ''),
        color: player.color,
      }));
      this.players.forEach((player, index) =>
        this.seatByPeer.set(player.id, index),
      );
      this.localSeat = this.seatByPeer.has(info.me)
        ? this.seatByPeer.get(info.me)
        : -1;
      this.commands = this.players.map(() => ({ ...NEUTRAL }));
      this.lastInput = this.players.map(() => -Infinity);
      this.acks = this.players.map(() => -1);
      // Retain the named Hub gameplay stream; world creation consumes one seed.
      // The simulation serializes its own stateful continuation for checkpoint fidelity.
      this.rng = this.hub.rng('simulation');
      const seed = Math.floor(this.rng() * 4294967296) >>> 0;
      const create =
        this.hooks.createSim || ((options) => new root.WizardSim.Sim(options));
      this.sim = create({
        difficulty: 'normal',
        seats: this.players.length,
        seed,
        online: true,
      });
      await this.hooks.onSession?.(this.sim, info);
      if (this.pendingStart) this.start();
      // Readiness is independent of audio gesture and controller availability.
      if (!this.ended) this.hub.ready();
      return info;
    }

    start() {
      if (this.running || this.ended) return;
      this.running = true;
      this.hooks.onStart?.();
    }

    /** Optional wall-clock driver. It advances a no-player/hidden host without a camera or RAF.
     * Do not also call tick() from the engine when this pump is enabled. */
    startPump(commandProvider = () => NEUTRAL) {
      if (!this.active || this.pump || this.ended) return;
      let previous = root.performance?.now?.() ?? Date.now();
      let accumulator = 0;
      this.pump = root.setInterval(() => {
        if (this.ended) return;
        const now = root.performance?.now?.() ?? Date.now();
        accumulator += Math.min(0.25, Math.max(0, (now - previous) / 1000));
        previous = now;
        while (accumulator >= FIXED_DT && !this.ended) {
          this.tick(FIXED_DT, commandProvider());
          accumulator -= FIXED_DT;
        }
      }, 8);
    }

    tick(dt, command = NEUTRAL) {
      if (!this.active || this.ended || this.finished || !this.sim) return;
      if (!Number.isFinite(dt) || dt <= 0) return;
      this.clock += Math.min(0.25, dt);
      if (!this.running || this.hub.time() < 0) return;
      if (this.localSeat >= 0 && this.seatByPeer.has(this.info.me)) {
        this.commands[this.localSeat] = sanitizeCommand(command);
        this.lastInput[this.localSeat] = this.clock;
      }
      if (this.isHost) {
        this.commands.forEach((cmd, seat) => {
          if (this.clock - this.lastInput[seat] > 0.65)
            this.commands[seat] = { ...NEUTRAL };
        });
        this.sim.step(Math.min(dt, 0.05), this.commands);
        if (this.clock - this.lastStateSend >= 1 / 9) {
          this.lastStateSend = this.clock;
          this.broadcast();
        }
        const state = this.sim.s;
        if (state.phase === 'victory' || state.phase === 'defeat')
          this.finish(state.phase === 'victory', state.phase);
      } else if (this.clock - this.lastInputSend >= 1 / 12) {
        this.lastInputSend = this.clock;
        this.send(
          {
            v: VERSION,
            t: 'input',
            n: ++this.inputSequence,
            seat: this.localSeat,
            c: this.localSeat >= 0 ? this.commands[this.localSeat] : NEUTRAL,
          },
          { to: this.info.host, reliable: true },
        );
      }
    }

    send(packet, options) {
      if (!this.active || this.ended) return false;
      const size = bytes(packet);
      this.metrics.maxBytes = Math.max(this.metrics.maxBytes, size);
      if (size > 16000) {
        this.metrics.rejected++;
        this.hooks.onError?.('World snapshot exceeds the Hub message limit.');
        return false;
      }
      const sent = this.hub.send(packet, options);
      if (sent === false) this.metrics.dropped++;
      else {
        this.metrics.sent++;
        this.sentAt.push(this.clock);
        this.sentAt = this.sentAt.filter((at) => this.clock - at < 1);
        this.metrics.maxPerSecond = Math.max(
          this.metrics.maxPerSecond,
          this.sentAt.length,
        );
      }
      return sent;
    }

    broadcast() {
      if (!this.isHost || !this.sim || this.ended) return false;
      const snapshot = this.sim.snapshot({ network: true });
      const packet = {
        v: VERSION,
        t: 'state',
        n: ++this.snapshotSequence,
        ack: this.acks.slice(),
        s: snapshot,
      };
      const sent = this.send(packet, { reliable: true });
      if (sent !== false) this.metrics.snapshots++;
      return sent;
    }

    receive(data, from) {
      if (
        !this.active ||
        this.ended ||
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        data.v !== VERSION
      )
        return this.reject();
      if (bytes(data) > 16384 || !Number.isSafeInteger(data.n) || data.n < 0)
        return this.reject();
      if (this.isHost) {
        const seat = this.seatByPeer.get(from);
        if (
          data.t !== 'input' ||
          seat === undefined ||
          from === this.info.me ||
          data.seat !== seat ||
          data.n <= this.acks[seat]
        )
          return this.reject();
        const c = data.c;
        if (
          !c ||
          !Number.isInteger(c.move) ||
          c.move < -1 ||
          c.move > 3 ||
          !Number.isInteger(c.aim) ||
          c.aim < -1 ||
          c.aim > 3 ||
          typeof c.fire !== 'boolean'
        )
          return this.reject();
        this.acks[seat] = data.n;
        this.commands[seat] = sanitizeCommand(c);
        this.lastInput[seat] = this.clock;
        this.metrics.inputs++;
      } else {
        if (
          from !== this.info.host ||
          data.t !== 'state' ||
          data.n <= this.lastSnapshot ||
          !data.s ||
          data.s.version !== 1 ||
          !Number.isSafeInteger(data.s.tick) ||
          data.s.tick < 0 ||
          !Array.isArray(data.s.players) ||
          data.s.players.length > 2 ||
          !Number.isInteger(data.s.roomIndex) ||
          data.s.roomIndex < 0 ||
          data.s.roomIndex > 5
        )
          return this.reject();
        this.lastSnapshot = data.n;
        this.sim.load(data.s);
        this.hooks.onSnapshot?.(this.sim);
        this.metrics.snapshots++;
      }
      this.metrics.received++;
    }

    reject() {
      this.metrics.rejected++;
      return false;
    }

    leave({ id, reason } = {}) {
      if (!this.active || this.ended || !this.seatByPeer.has(id)) return;
      const seat = this.seatByPeer.get(id);
      this.seatByPeer.delete(id);
      this.players = this.players.filter((player) => player.id !== id);
      this.commands[seat] = { ...NEUTRAL };
      this.lastInput[seat] = -Infinity;
      if (this.isHost) {
        if (typeof this.sim.removeSeat === 'function')
          this.sim.removeSeat(seat);
        this.broadcast();
      }
      this.hooks.onLeave?.({ id, seat, reason });
    }

    finish(won, reason = 'finished') {
      if (
        !this.active ||
        this.ended ||
        this.finished ||
        !this.isHost ||
        !this.sim
      )
        return;
      this.finished = true;
      this.broadcast();
      const state = this.sim.s;
      const score = Number.isFinite(state.score) ? state.score : 0;
      const ids = this.players.map((player) => player.id);
      const stats = {};
      for (const id of ids) {
        const seat = this.seatByPeer.get(id);
        const player = state.players.find((p) => p.seat === seat);
        stats[id] = {
          'Chambers reached': Number(state.roomIndex || 0) + 1,
          'Team score': score,
          'Hunter catches': player?.kills || player?.stats?.kills || 0,
          Outcome: reason,
        };
      }
      this.metrics.finishes++;
      this.hub.finish({
        standings: [ids],
        scores: Object.fromEntries(ids.map((id) => [id, score])),
        won: won === true,
        stats,
      });
      this.hooks.onFinish?.({ won: won === true, reason });
    }

    end(info = {}) {
      if (this.ended) return;
      this.ended = true;
      this.running = false;
      this.commands = this.commands.map(() => ({ ...NEUTRAL }));
      if (this.pump) root.clearInterval(this.pump);
      this.pump = null;
      this.hooks.onEnd?.(info);
    }

    dispose() {
      this.end({ reason: 'disposed' });
      this.unsubscribers.splice(0).forEach((fn) => fn?.());
    }
  }
  WizardNetwork.NEUTRAL = NEUTRAL;
  WizardNetwork.sanitizeCommand = sanitizeCommand;
  WizardNetwork.VERSION = VERSION;
  root.WizardNetwork = WizardNetwork;
})(globalThis);
