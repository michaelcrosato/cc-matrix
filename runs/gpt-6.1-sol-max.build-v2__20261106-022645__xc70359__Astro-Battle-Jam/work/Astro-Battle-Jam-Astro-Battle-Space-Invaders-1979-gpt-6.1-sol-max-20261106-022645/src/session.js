/* AI Hub v1 adapter. Only the host advances the shared Sim; complete reliable snapshots at 10 Hz. */
(function (root) {
  'use strict';
  const A = root.ABJ;
  A.pack = s => {
    const out = { ...s, events: s.events.slice(-12) };
    out.bunkers = s.bunkers.map(b => [b.id, b.x, b.y, b.rows.map(n => n.toString(36)).join('.')]);
    out.enemies = s.enemies.map(e => [e.id, e.col, e.row, e.type, e.hp, e.hit, e.attack]);
    out.shots = s.shots.map(b => [b.id, +b.x.toFixed(3), +b.y.toFixed(3), b.vx, b.vy, b.team, b.owner, b.kind, b.life]);
    out.pickups = s.pickups.map(p => [p.id, +p.x.toFixed(3), +p.y.toFixed(3), p.life]);
    return out;
  };
  A.unpack = s => ({ ...s,
    bunkers: s.bunkers.map(b => ({ id: b[0], x: b[1], y: b[2], rows: b[3].split('.').map(n => parseInt(n, 36)) })),
    enemies: s.enemies.map(e => ({ id: e[0], col: e[1], row: e[2], type: e[3], hp: e[4], hit: e[5], attack: e[6] })),
    shots: s.shots.map(b => ({ id: b[0], x: b[1], y: b[2], vx: b[3], vy: b[4], team: b[5], owner: b[6], kind: b[7], life: b[8] })),
    pickups: s.pickups.map(p => ({ id: p[0], x: p[1], y: p[2], life: p[3] }))
  });
  class Session {
    constructor(hub, info, onState, onEnd) {
      this.hub = hub; this.info = info; this.onState = onState; this.onEnd = onEnd;
      this.started = false; this.ended = false; this.finished = false; this.seq = 0; this.repairSeq = 0; this.repairDown = false;
      this.lastSend = -1e9; this.lastSnapshot = -1; this.lastSnapshotAt = -Infinity; this.ack = {}; this.inputs = new Map(); this.pendingRepair = new Map(); this.inputAck = {}; this.unacked = []; this.previousState = null; this.visualReceived = 0;
      this.debug = { sent: 0, received: 0, rejected: 0, maxBytes: 0, stale: 0, ready: 0, terminal: null };
      const rng = hub.rng('world'), seed = Math.floor(rng() * 4294967296) >>> 0;
      this.sim = info.isHost ? new A.Sim({ seed, difficulty: 1, players: info.players.map(p => p.id) }) : null;
      this.state = this.sim ? this.sim.s : new A.Sim({ seed, difficulty: 1, players: info.players.map(p => p.id) }).s;
      hub.on('start', () => { this.started = true; });
      hub.on('message', (data, from) => this.receive(data, from));
      hub.on('leave', ({ id }) => { this.inputs.delete(id); this.pendingRepair.delete(id); if (this.sim) this.sim.leave(id); });
      hub.on('time-up', () => { if (info.isHost && !this.ended) { if (this.sim.s.phase !== 'victory') this.sim.end(false, 'TIME EXPIRED'); this.finish(); } });
      hub.on('end', ({ reason }) => { this.ended = true; this.inputs.clear(); this.pendingRepair.clear(); this.debug.terminal = reason; this.onEnd(reason); });
      hub.ready(); this.debug.ready++;
    }
    receive(m, from) {
      if (this.ended || !m || typeof m !== 'object') return;
      this.debug.received++;
      if (this.info.isHost && m.t === 'i') {
        // Identity comes exclusively from the Hub callback. No packet player id is accepted.
        const player = this.sim.s.ships.find(p => p.id === from && !p.gone);
        const prev = this.inputs.get(from);
        if (!player || !Number.isSafeInteger(m.q) || m.q <= (prev?.seq ?? -1) || !Number.isSafeInteger(m.r) || m.r < 0 || m.r > 1e9 || !Number.isFinite(m.m) || Math.abs(m.m) > 1 || typeof m.f !== 'boolean') { this.debug.rejected++; return; }
        this.inputs.set(from, { seq: m.q, at: this.hub.time(), move: m.m, fire: m.f, repairSeq: m.r });
        if (m.r > (this.ack[from] || 0)) this.pendingRepair.set(from, m.r);
      } else if (!this.info.isHost && from === this.info.host && m.t === 's' && m.w && Number.isSafeInteger(m.w.tick)) {
        if (m.w.tick < this.lastSnapshot || m.w.tick === this.lastSnapshot && !m.terminal) { this.debug.rejected++; return; }
        this.lastSnapshot = m.w.tick; this.lastSnapshotAt = this.hub.time(); this.ack = m.a || {}; this.inputAck = m.q || {}; this.unacked = this.unacked.filter(input => input.q > (this.inputAck[this.info.me] || 0));
        const next = A.unpack(m.w); this.previousState = this.state; this.visualReceived = performance.now(); this.onState(next, this.state); this.state = next;
      }
    }
    visualState() {
      if (this.info.isHost || !this.previousState || this.previousState.epoch !== this.state.epoch) return this.state;
      const a = this.previousState, b = this.state;
      const span = Math.max(50, Math.min(200, (b.tick - a.tick) * 1000 / 120));
      const u = Math.max(0, Math.min(1, (performance.now() - this.visualReceived) / span));
      const blend = (v, w) => v + (w - v) * u;
      // Visual interpolation changes positions only. Damage, cover, score and ownership stay authoritative.
      return { ...b, formation: { ...b.formation, x: blend(a.formation.x, b.formation.x), y: blend(a.formation.y, b.formation.y) },
        boss: b.boss && a.boss ? { ...b.boss, x: blend(a.boss.x, b.boss.x), y: blend(a.boss.y, b.boss.y) } : b.boss,
        shots: b.shots.map(shot => { const old = a.shots.find(q => q.id === shot.id); return old ? { ...shot, x: blend(old.x, shot.x), y: blend(old.y, shot.y) } : shot; }),
        pickups: b.pickups.map(item => { const old = a.pickups.find(q => q.id === item.id); return old ? { ...item, x: blend(old.x, item.x), y: blend(old.y, item.y) } : item; }) };
    }
    inputAcks() { return Object.fromEntries([...this.inputs].map(([id, input]) => [id, input.seq])); }
    localCommand(command) {
      if (this.ended || this.info.server) return;
      if (command.repair && !this.repairDown) this.repairSeq++; this.repairDown = !!command.repair;
      this.current = { move: Math.max(-1, Math.min(1, Number(command.move) || 0)), fire: !!command.fire, repair: !!command.repair };
    }
    commands() {
      const commands = {};
      for (const p of this.sim.s.ships) {
        if (p.gone) continue;
        if (!this.info.server && p.id === this.info.me) { commands[p.id] = this.current || A.NEUTRAL; continue; }
        const input = this.inputs.get(p.id);
        if (input && this.hub.time() - input.at < 650) {
          const edge = this.pendingRepair.get(p.id);
          commands[p.id] = { move: input.move, fire: input.fire, repair: !!edge };
          if (edge) { this.ack[p.id] = edge; this.pendingRepair.delete(p.id); }
        } else { commands[p.id] = A.NEUTRAL; if (input) this.debug.stale++; }
      }
      return commands;
    }
    send(data) {
      if (this.ended) return;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length; this.debug.maxBytes = Math.max(this.debug.maxBytes, bytes);
      if (bytes > 16000) throw new Error('Designed world snapshot exceeds safe reliable packet size: ' + bytes);
      if (this.hub.send(data, this.info.isHost ? { reliable: true } : { reliable: false, to: this.info.host })) this.debug.sent++;
    }
    finish() {
      if (this.finished || this.ended || !this.info.isHost) return;
      this.finished = true; const s = this.sim.s;
      this.send({ t: 's', w: A.pack(s), a: this.ack, q: this.inputAcks(), terminal: true });
      const active = s.ships.filter(p => !p.gone);
      this.hub.finish({ standings: [active.map(p => p.id)], scores: Object.fromEntries(active.map(p => [p.id, p.score])), won: s.won });
    }
    update() {
      if (this.ended) return;
      const time = this.hub.time();
      if (this.info.isHost && this.started && time >= 0 && !this.finished) {
        const target = Math.floor(time * .12);
        // Catch up to the shared clock, including time discarded by the browser renderer.
        while (this.sim.s.tick < target && !['victory', 'defeat'].includes(this.sim.s.phase)) this.sim.step(this.commands());
        this.state = this.sim.s;
        if (['victory', 'defeat'].includes(this.state.phase)) this.finish();
      }
      const clock = Number.isFinite(time) ? time : 0;
      const now = typeof performance !== 'undefined' ? performance.now() : clock;
      if (now - this.lastSend >= 100 && !this.finished) {
        this.lastSend = now;
        if (this.info.isHost) this.send({ t: 's', w: A.pack(this.sim.s), a: this.ack, q: this.inputAcks() });
        else if (!this.info.server) { const c = this.current || A.NEUTRAL; const input = { t: 'i', q: ++this.seq, m: c.move, f: c.fire, r: this.repairSeq }; this.unacked.push(input); if (this.unacked.length > 20) this.unacked.shift(); this.send(input); }
      }
    }
  }
  A.Session = Session;
})(globalThis);
