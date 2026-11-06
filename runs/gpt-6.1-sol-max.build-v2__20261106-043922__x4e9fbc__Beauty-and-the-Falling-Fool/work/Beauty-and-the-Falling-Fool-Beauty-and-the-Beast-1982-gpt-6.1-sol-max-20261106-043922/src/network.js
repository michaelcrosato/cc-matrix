/* One 12 Hz outgoing scheduler. Only the host commits world rules. */
(() => {
  const F = FF,
    round = (n) => Math.round(n * 100) / 100;
  const bodyKeys = ['x', 'z', 'vx', 'vz', 'onGround', 'facing'];
  class Network {
    constructor(hub, world) {
      this.hub = hub;
      this.world = world;
      this.ended = false;
      this.started = false;
      this.finished = false;
      this.sentAt = -1;
      this.lastTick = -1;
      this.seq = 0;
      this.jump = 0;
      this.climb = 0;
      this.wasUp = false;
      this.inputs = new Map();
      this.history = [];
      this.stats = { sent: 0, maxBytes: 0, received: 0, rejected: 0 };
      this.removers = [];
      this.rng = hub.rng('encounters');
      world.rng = this.rng;
      this.on('start', () => {
        this.started = true;
      });
      this.on('message', (data, from) => this.message(data, from));
      this.on('leave', ({ id }) => {
        if (hub.isHost) {
          world.leave(id);
          this.inputs.delete(id);
        }
      });
      this.on('time-up', () => this.finish());
      this.on('end', () => {
        this.ended = true;
        world.phase = 'ended';
        this.inputs.clear();
        this.history = [];
        this.onEnd?.();
      });
    }
    on(event, fn) {
      this.removers.push(this.hub.on(event, fn));
    }
    pack(full = false) {
      const w = this.world,
        ws = w.data.windows;
      return {
        ...(full ? { l: [...w.ledger], o: { ...w.totals }, m: w.metrics } : {}),
        u: w.data.hearts.filter((h) => w.ledger.has(h.id)).map((h) => h.id),
        k: [w.checkpoint?.section || 0, w.checkpoint?.score || 0],
        t: 's',
        ts: round(this.hub.time()),
        n: w.tick,
        s: w.section,
        a: round(w.sectionAge),
        p: w.phase,
        d: round(w.phaseTime),
        v: [
          w.score,
          w.chances,
          round(w.time),
          round(w.powerUntil),
          +w.rescued,
          +w.departed,
          w.finaleBeat,
          w.regroup ? round(w.regroup.until) : 0,
        ],
        c: w.actors.map((p) => [
          p.id,
          ...bodyKeys.map((k) =>
            typeof p.body[k] === 'number' ? round(p.body[k]) : +p.body[k],
          ),
          p.traversal ? ws.findIndex((x) => x.id === p.traversal.id) : -1,
          p.traversal ? round(p.traversal.u) : 0,
          p.traversal?.dir || 1,
          round(p.tumble),
          round(p.recovery),
          +p.gone,
          p.ack || 0,
          p.lastJump || 0,
          p.lastClimb || 0,
        ]),
        h: w.hazards.map((h) => [
          h.id,
          h.kind,
          round(h.x),
          round(h.z),
          round(h.vx),
          round(h.baseZ),
          h.floor,
          round(h.age),
          h.state,
          +h.dead,
          h.fragment ? 1 : 0,
          round(h.death || 0),
          h.bounces || 0,
          round(h.vz || 0),
          h.breakX || 0,
        ]),
        e: w.hearts
          .filter((h) => !h.taken)
          .map((h) => [
            h.id,
            round(h.x),
            round(h.z),
            h.floor,
            round(h.age),
            h.pathTime,
          ]),
        x: w.events
          .slice(-4)
          .map((e) => [
            e.id,
            e.type,
            e.actor ?? null,
            e.x ?? 0,
            e.z ?? 0,
            e.kind ?? null,
          ]),
      };
    }
    send(data, reliable = false, to) {
      if (this.ended) return;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      this.stats.maxBytes = Math.max(this.stats.maxBytes, bytes);
      if (bytes > 16000) throw new Error('Snapshot exceeds protocol limit');
      this.hub.send(data, { reliable, ...(to === undefined ? {} : { to }) });
      this.stats.sent++;
    }
    message(m, from) {
      if (this.ended || !m || typeof m !== 'object') return;
      this.stats.received++;
      if (this.hub.isHost && m.t === 'i') {
        const p = this.world.actors.find((p) => p.id === from && !p.gone);
        const valid =
          p &&
          Number.isInteger(m.q) &&
          m.q > p.ack &&
          Number.isFinite(m.at) &&
          Math.abs(m.at - this.world.tick) < 1800 &&
          Number.isFinite(m.x) &&
          Math.abs(m.x) <= 1 &&
          [m.j, m.c].every((n) => Number.isInteger(n) && n >= 0 && n < 1e7) &&
          [m.u, m.d, m.b].every((n) => n === 0 || n === 1);
        if (!valid) {
          this.stats.rejected++;
          return;
        }
        const input = {
          x: m.x,
          up: !!m.u,
          down: !!m.d,
          jump: !!m.b,
          jumpPressed: m.j > (p.lastJump || 0),
        };
        if (input.jumpPressed) p.lastJump = m.j;
        if (m.c > (p.lastClimb || 0)) {
          p.climbBuffer = 0.5;
          p.lastClimb = m.c;
        }
        p.ack = m.q;
        this.inputs.set(from, { input, at: this.world.time });
      } else if (!this.hub.isHost && from === this.hub.host && m.t === 's')
        this.apply(m);
    }
    apply(m) {
      if (!Number.isInteger(m.n) || m.n <= this.lastTick) return;
      this.lastTick = m.n;
      const w = this.world;
      if (m.s !== w.section) {
        w.enter(m.s);
        this.history = [];
      }
      const lag = Math.min(
        0.35,
        Math.max(0, (this.hub.time() - (m.ts ?? this.hub.time())) / 1000),
      );
      w.tick = m.n;
      w.sectionAge = m.a + lag;
      w.phase = m.p;
      w.phaseTime = m.d + lag;
      [w.score, w.chances, w.time, w.powerUntil] = m.v;
      w.time += lag;
      w.rescued = !!m.v[4];
      w.departed = !!m.v[5];
      w.finaleBeat = m.v[6];
      if (m.l) w.ledger = new Set(m.l);
      if (m.u) for (const id of m.u) w.ledger.add(id);
      if (m.o) w.totals = { ...m.o };
      if (m.k)
        w.checkpoint = {
          ...w.checkpoint,
          section: m.k[0],
          score: m.k[1],
          ledger: m.l || w.checkpoint.ledger,
        };
      w.regroup = m.v[7] ? { until: m.v[7] } : null;
      for (const row of m.c) {
        const [id, ...v] = row;
        const p = w.actors.find((p) => p.id === id);
        if (!p) continue;
        const old = { x: p.body.x, z: p.body.z };
        bodyKeys.forEach(
          (k, i) => (p.body[k] = k === 'onGround' ? !!v[i] : v[i]),
        );
        const wi = v[6],
          u = v[7],
          dir = v[8];
        p.tumble = v[9];
        p.recovery = v[10];
        p.gone = !!v[11];
        p.ack = v[12];
        p.lastJump = v[13];
        p.lastClimb = v[14];
        p.traversal = null;
        if (wi >= 0) {
          const win = w.data.windows[wi],
            from = dir > 0 ? win.z0 : win.z1,
            to = dir > 0 ? win.z1 : win.z0;
          const start = { x: p.body.x, z: p.body.z };
          p.body.x = win.x;
          p.body.z = from;
          const action = new My3D2dge.Action('ffWindow', {
            body: p.body,
            to: { x: win.x, z: to },
            speed: 0.7 / w.cfg.climbTime,
          });
          action.t = u * action.duration;
          action._apply(F.DT);
          p.traversal = { id: win.id, u, dir, from, to, action };
          Object.assign(p.body, start);
        }
        if (id !== this.hub.me)
          p.visual = {
            x: old.x,
            z: old.z,
            targetX: p.body.x,
            targetZ: p.body.z,
          };
        else {
          this.history = this.history.filter((h) => h.q > p.ack).slice(-48);
          const events = w.events;
          w.events = [];
          for (const h of this.history) w.moveActor(p, h.intent, h.dt);
          w.events = events;
        }
      }
      w.hazards = m.h.map((v) => ({
        id: v[0],
        kind: v[1],
        x: v[2],
        z: v[3],
        vx: v[4],
        baseZ: v[5],
        floor: v[6],
        age: v[7],
        state: v[8],
        dead: !!v[9],
        fragment: !!v[10],
        death: v[11],
        bounces: v[12],
        vz: v[13],
        breakX: v[14],
        expiry: 14,
        tell: ['bird', 'bat'].includes(v[1]) ? 1.15 : 0.9,
        w: v[10] ? 8 : v[1] === 'rat' ? 12 : 14,
        h: v[10] ? 8 : v[1] === 'rat' ? 7 : 13,
      }));
      w.hearts = m.e.map((v) => ({
        id: v[0],
        x: v[1],
        z: v[2],
        floor: v[3],
        age: v[4],
        pathTime: v[5],
      }));
      w.events = m.x.map((v) => ({
        id: v[0],
        type: v[1],
        actor: v[2],
        x: v[3],
        z: v[4],
        kind: v[5],
      }));
      w.eventSeq = w.events.at(-1)?.id || w.eventSeq;
      const saved = w.events;
      w.events = [];
      for (let t = 0; t < lag; t += F.DT)
        w.updateHazards(Math.min(F.DT, lag - t), { predict: true });
      w.events = saved;
      if (m.m) w.metrics = JSON.parse(JSON.stringify(m.m));
    }
    update(intent, dt) {
      if (this.ended || !this.started || this.hub.time() < 0) return;
      const w = this.world,
        me = w.actors.find((p) => p.id === this.hub.me && !p.gone),
        now = this.hub.time();
      if (this.hub.isHost) {
        const all = {};
        for (const p of w.actors) {
          if (p.gone) continue;
          const remote = this.inputs.get(p.id);
          all[p.id] =
            p.id === this.hub.me
              ? intent
              : remote && w.time - remote.at < 0.65
                ? { ...remote.input }
                : F.neutral();
          if (p.climbBuffer > 0) {
            p.climbBuffer -= dt;
            all[p.id].up = true;
          }
        }
        w.step(all, dt);
        for (const v of this.inputs.values()) v.input.jumpPressed = false;
      } else if (me) {
        w.prediction = true;
        w.sectionAge += dt;
        w.time += dt;
        w.phaseTime += dt;
        const savedEvents = w.events;
        w.events = [];
        w.updateHazards(dt, { predict: true });
        w.events = savedEvents;
        for (const p of w.actors) {
          if (p.visual) {
            p.visual.x +=
              (p.visual.targetX - p.visual.x) * Math.min(1, dt * 16);
            p.visual.z +=
              (p.visual.targetZ - p.visual.z) * Math.min(1, dt * 16);
          }
        }
        if (intent.jumpPressed) this.jump++;
        if (intent.up && !this.wasUp) this.climb++;
        this.wasUp = intent.up;
        if (w.phase === 'playing') {
          const saved = w.events;
          w.events = [];
          w.moveActor(me, intent, dt);
          w.events = saved;
          this.history.push({ q: this.seq + 1, intent: { ...intent }, dt });
          if (this.history.length > 120) this.history.shift();
        }
      }
      if (now - this.sentAt >= 1000 / 12) {
        this.sentAt = now;
        if (this.hub.isHost) {
          const reliable =
            this.lastPhase !== w.phase || this.lastSection !== w.section;
          this.send(this.pack(reliable), reliable);
          this.lastPhase = w.phase;
          this.lastSection = w.section;
        } else if (me) {
          this.seq++;
          this.send(
            {
              t: 'i',
              q: this.seq,
              at: w.tick,
              x: Math.round(intent.x * 100) / 100,
              u: +intent.up,
              d: +intent.down,
              b: +intent.jump,
              j: this.jump,
              c: this.climb,
            },
            this.jump > (me.lastJump || 0) || this.climb > (me.lastClimb || 0),
            this.hub.host,
          );
        }
      }
      if (this.hub.isHost && (w.phase === 'results' || w.phase === 'failed'))
        this.finish();
    }
    finish() {
      if (!this.hub.isHost || this.finished || this.ended) return;
      this.finished = true;
      const w = this.world,
        present = w.actors.filter((p) => !p.gone).map((p) => p.id);
      this.send(this.pack(true), true);
      this.hub.finish({
        standings: [present],
        won: w.rescued,
        scores: Object.fromEntries(present.map((id) => [id, w.score])),
        stats: Object.fromEntries(
          present.map((id) => [
            id,
            {
              Rescue: w.rescued ? 'Yes' : 'No',
              Climbs: w.metrics.climbs,
              Hearts: w.metrics.hearts,
              Score: w.score,
            },
          ]),
        ),
      });
    }
    dispose() {
      this.ended = true;
      for (const fn of this.removers) fn();
      this.inputs.clear();
      this.history = [];
    }
  }
  F.Network = Network;
})();
