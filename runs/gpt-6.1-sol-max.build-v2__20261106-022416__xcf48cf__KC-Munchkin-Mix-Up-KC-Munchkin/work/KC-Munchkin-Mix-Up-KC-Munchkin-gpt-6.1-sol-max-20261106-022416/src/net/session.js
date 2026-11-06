(function (M) {
  "use strict";
  const PHASES = ["intro", "playing", "clear", "won", "lost"],
    EVENTS = [
      "stage",
      "go",
      "bite",
      "power",
      "catch",
      "hit",
      "respawn",
      "chirp",
      "gate-warn",
      "gate-turn",
      "warning",
      "power-end",
      "clear",
      "victory",
      "failure",
      "tunnel",
      "recharge",
      "bump",
      "leave",
    ];
  const round = (v) => Math.round(v * 1000) / 1000;
  M.pack = (w, q) => ({
    k: "s",
    q,
    r: w.revision,
    s: w.stageIndex,
    z: w.seed,
    t: w.tick,
    c: [
      PHASES.indexOf(w.phase),
      round(w.phaseT),
      w.score,
      w.lives,
      round(w.power),
      w.chain,
      w.board.orientation,
      round(w.gateTime),
      round(w.reveal),
      round(w.elapsed),
    ],
    mask: w.food.reduce((v, f, i) => v | (f.alive ? 1 << i : 0), 0),
    p: w.players.map((p) => [
      p.id,
      round(p.m.x),
      round(p.m.y),
      p.m.d,
      round(p.inv),
      round(p.hit),
      round(p.chirp),
      round(p.bite),
      round(p.chirpFx),
      p.seat,
      p.m.cx,
      p.m.cy,
      round(p.m._u),
      p.m.moving ? 1 : 0,
    ]),
    f: w.food.map((f) => [round(f.m.x), round(f.m.y), f.m.d, round(f.turn)]),
    e: w.predators.map((e) => [
      round(e.m.x),
      round(e.m.y),
      e.m.d,
      M.ACTOR_STATES.indexOf(e.state),
      round(Math.max(0, e.wait)),
    ]),
    ev: w.eventLog
      .slice(-5)
      .map((e) => [
        e.id,
        EVENTS.indexOf(e.type),
        e.player ?? -1,
        round(e.x || 0),
        round(e.y || 0),
        e.food ? Number(e.food.slice(1)) : -1,
        e.points || 0,
      ]),
  });
  M.unpack = (packet, prior = null) => {
    if (
      !packet ||
      packet.k !== "s" ||
      !Number.isInteger(packet.r) ||
      !Number.isInteger(packet.q) ||
      !Number.isInteger(packet.t) ||
      packet.s < 0 ||
      packet.s > 5 ||
      !Array.isArray(packet.p) ||
      packet.p.length > 2 ||
      !Array.isArray(packet.f) ||
      packet.f.length !== 12 ||
      !Array.isArray(packet.e) ||
      packet.e.length !== 3 ||
      !Array.isArray(packet.c) ||
      packet.c.length !== 10
    )
      return null;
    if (
      prior &&
      (packet.r < prior.revision || (packet.r === prior.revision && packet.t < prior.tick))
    )
      return null;
    // Host messages are still checked for finite coordinates and valid state indexes before touching presentation.
    if (
      [...packet.p, ...packet.f, ...packet.e, packet.c].some(
        (a) => !Array.isArray(a) || a.some((v) => typeof v !== "number" || !Number.isFinite(v)),
      ) ||
      packet.c[0] < 0 ||
      packet.c[0] >= PHASES.length
    )
      return null;
    let w = prior;
    if (!w || w.revision !== packet.r || w.stageIndex !== packet.s) {
      w = new M.World({ seed: packet.z, seats: packet.p.map((p) => p[0]), stage: packet.s });
      w.revision = packet.r;
    }
    w.tick = packet.t;
    w.time = packet.t / 120;
    w.phase = PHASES[packet.c[0]];
    w.phaseT = packet.c[1];
    w.score = packet.c[2];
    w.lives = packet.c[3];
    w.power = packet.c[4];
    w.chain = packet.c[5];
    w.board.setOrientation(packet.c[6]);
    w.gateTime = packet.c[7];
    w.reveal = packet.c[8];
    w.elapsed = packet.c[9];
    w.gateWarn = w.gateTime > w.tuning.gateCadence - 0.5;
    const motion = (a, x, y, d) => {
      a.m.x = x;
      a.m.y = y;
      a.m.cx = Math.round(x);
      a.m.cy = Math.round(y);
      a.m.d = d;
      a.m.dir = M.DIRS[d] || [0, 0];
      a.m.moving = Math.abs(x - Math.round(x)) + Math.abs(y - Math.round(y)) > 0.005;
      a.m._to = [Math.round(x) + (M.DIRS[d]?.[0] || 0), Math.round(y) + (M.DIRS[d]?.[1] || 0)];
    };
    const former = new Map(w.players.map((p) => [p.id, p]));
    w.players = packet.p.map((a) => {
      const p = former.get(a[0]) || {
        id: a[0],
        seat: a[9],
        m: new M.GraphMover(1, 15, 6),
        spawn: w.data.spawns[a[9] % 2],
      };
      motion(p, a[1], a[2], a[3]);
      [p.inv, p.hit, p.chirp, p.bite, p.chirpFx] = a.slice(4, 9);
      if (a.length >= 14) {
        p.m.cx = a[10];
        p.m.cy = a[11];
        p.m._u = a[12];
        p.m.moving = !!a[13];
        const edge = w.board.neighbor(p.m.cx, p.m.cy, p.m.d);
        p.m._to = edge ? [edge.x, edge.y] : [p.m.cx, p.m.cy];
        p.m.wrap = !!edge?.wrap;
      }
      return p;
    });
    w.seats = w.players.map((p) => p.id);
    packet.f.forEach((a, i) => {
      motion(w.food[i], a[0], a[1], a[2]);
      w.food[i].alive = !!(packet.mask & (1 << i));
      w.food[i].turn = a[3];
    });
    packet.e.forEach((a, i) => {
      motion(w.predators[i], a[0], a[1], a[2]);
      w.predators[i].state = M.ACTOR_STATES[a[3]] || "penned";
      w.predators[i].wait = a[4];
    });
    w.events = (packet.ev || [])
      .filter((a) => Array.isArray(a) && EVENTS[a[1]])
      .map((a) => ({
        id: a[0],
        type: EVENTS[a[1]],
        player: a[2],
        x: a[3],
        y: a[4],
        food: a[5] >= 0 ? "f" + a[5] : undefined,
        points: a[6],
      }));
    w.eventLog = w.events.slice();
    return w;
  };
  class Session {
    constructor() {
      this.active = !!globalThis.AIHub?.active;
      this.app = null;
      this.world = null;
      this.started = false;
      this.ended = false;
      this.finished = false;
      this.players = [];
      this.received = new Map();
      this.lastPacket = 0;
      this.sendSeq = 0;
      this.inputSeq = 0;
      this.nextSnap = 0;
      this.nextReliable = 0;
      this.nextInput = 0;
      this.lastInput = "";
      this.lastClock = 0;
      this.acc = 0;
      this.timer = null;
      this.pendingTimeUp = false;
      this.history = [];
      this.lastAuthoritativePacket = null;
      this.renderFrom = null;
      this.renderAt = 0;
      this.predicted = null;
      this.predictionRevision = 0;
      this.diagnostics = {
        sent: 0,
        received: 0,
        rejected: 0,
        dropped: 0,
        maxBytes: 0,
        lastTick: 0,
      };
      if (this.active) {
        AIHub.on("start", () => {
          this.started = true;
          this.lastClock = performance.now();
        });
        AIHub.on("message", (data, from) => this.message(data, from));
        AIHub.on("leave", ({ id }) => this.leave(id));
        AIHub.on("time-up", () => {
          if (this.world) this.finish(false);
          else this.pendingTimeUp = true;
        });
        AIHub.on("end", () => this.end());
      }
    }
    async connect() {
      const info = await AIHub.connect({ mode: "shared-world", seats: [1, 2] });
      this.active = !!info;
      return info;
    }
    attach(app) {
      this.app = app;
      this.players = AIHub.players.map((p) => p.id);
      this.world = new M.World({ seed: AIHub.seed, seats: this.players });
      app.world = this.world;
      app.screen = "play";
      AIHub.rng("world"); // Retain a labelled stream for integrations; World uses documented seeded Mulberry32.
      this.lastClock = performance.now();
      this.timer = setInterval(() => this.pump(), 1000 / 60);
      AIHub.ready();
      if (this.pendingTimeUp) this.finish(false);
    }
    send(data, options) {
      if (this.ended) return false;
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      this.diagnostics.maxBytes = Math.max(bytes, this.diagnostics.maxBytes);
      if (data.k === "s") {
        this.lastAuthoritativePacket = data;
        this.history.push(data);
        if (this.history.length > 32) this.history.shift();
      }
      const ok = AIHub.send(data, options);
      if (ok) this.diagnostics.sent++;
      else this.diagnostics.dropped++;
      return ok;
    }
    message(data, from) {
      if (this.ended || !data || typeof data !== "object") return;
      this.diagnostics.received++;
      if (data.k === "i" && AIHub.isHost) {
        const previous = this.received.get(from),
          valid =
            this.players.includes(from) &&
            Number.isSafeInteger(data.q) &&
            data.q >= 0 &&
            data.q < 100000000 &&
            (!previous || (data.q > previous.q && data.q - previous.q < 100000)) &&
            Number.isInteger(data.d) &&
            data.d >= -1 &&
            data.d <= 3 &&
            (data.a === 0 || data.a === 1);
        if (!valid) {
          this.diagnostics.rejected++;
          return;
        }
        this.received.set(from, { q: data.q, d: data.d, a: !!data.a, time: performance.now() });
        return;
      }
      if (data.k === "s" && !AIHub.isHost && from === AIHub.host) {
        if (!Number.isSafeInteger(data.q) || data.q <= this.lastPacket) {
          this.diagnostics.rejected++;
          return;
        }
        const before = this.world
          ? this.world.players
              .concat(this.world.food, this.world.predators)
              .map((a) => [a.id, a.m.x, a.m.y])
          : [];
        const w = M.unpack(data, this.world);
        if (!w) {
          this.diagnostics.rejected++;
          return;
        }
        this.lastPacket = data.q;
        this.lastAuthoritativePacket = data;
        this.world = w;
        this.renderFrom = new Map(before.map((a) => [a[0], [a[1], a[2]]]));
        this.renderAt = performance.now();
        this.app.world = w;
        this.reconcilePrediction();
        this.app.sound.events(w.events);
        this.diagnostics.lastTick = w.tick;
      }
    }
    reconcilePrediction() {
      if (AIHub.isHost || AIHub.server || !this.app || !this.world) return;
      const p = this.world.players.find((p) => p.id === AIHub.me);
      if (!p || p.hit || this.world.phase !== "playing") {
        this.predicted = null;
        return;
      }
      const m = new M.GraphMover(p.m.cx, p.m.cy, this.world.tuning.playerSpeed);
      for (const field of ["x", "y", "cx", "cy", "d", "moving", "_u", "wrap"])
        m[field] = p.m[field];
      m.dir = (M.DIRS[m.d] || [0, 0]).slice();
      m._to = p.m._to?.slice() || null;
      const age = M.clamp(AIHub.time() / 1000 - this.world.elapsed, 0, 0.4),
        intent = this.app.localIntent(0);
      for (let remaining = age; remaining > 0; remaining -= 1 / 120)
        m.update(Math.min(1 / 120, remaining), this.world.board, intent.d, {
          time: this.world.time,
        });
      this.predicted = m;
      this.predictionRevision = this.world.revision;
    }
    predict(dt) {
      if (
        !this.predicted ||
        this.ended ||
        !this.started ||
        AIHub.time() < 0 ||
        this.world.phase !== "playing"
      )
        return;
      const p = this.world.players.find((p) => p.id === AIHub.me);
      if (!p || p.hit) {
        this.predicted = null;
        return;
      }
      const d = this.intent().d;
      this.predicted.update(dt, this.world.board, d, { time: this.world.time });
    }
    intent() {
      if (!this.app || AIHub.server || !this.players.includes(AIHub.me) || this.ended)
        return { d: -1, a: false };
      if (
        !this.started ||
        AIHub.time() < 0 ||
        (typeof document !== "undefined" && document.hidden) ||
        this.app.ui?.screen ||
        this.app.game.paused
      )
        return { d: -1, a: false };
      return this.app.localIntent(0);
    }
    pump() {
      if (this.ended || !this.app) return;
      const now = performance.now(),
        dt = Math.min(0.25, (now - this.lastClock) / 1000);
      this.lastClock = now;
      const live = this.started && AIHub.time() >= 0;
      const intent = this.intent(),
        text = intent.d + ":" + Number(intent.a);
      if (AIHub.isHost) {
        if (this.players.includes(AIHub.me) && !AIHub.server) {
          this.received.set(AIHub.me, { q: ++this.inputSeq, ...intent, time: now });
          this.app.intentCache[0].a = false;
        }
        if (live && !this.finished) {
          this.acc += dt;
          let count = 0;
          while (this.acc >= 1 / 120 && count++ < 60) {
            for (const p of this.world.players) {
              const input = this.received.get(p.id);
              this.world.setIntent(
                p.id,
                input && now - input.time < 650 ? input : { d: -1, a: false },
              );
              if (input) input.a = false;
            }
            this.world.step();
            this.app.sound.events(this.world.events);
            this.app.consumeEvents(this.world.events);
            this.acc -= 1 / 120;
          }
          if (this.world.phase === "won" || this.world.phase === "lost")
            this.finish(this.world.phase === "won");
        }
        if (now >= this.nextSnap && !this.finished) {
          const repair =
            now >= this.nextReliable ||
            this._rev !== this.world.revision ||
            this._phase !== this.world.phase;
          this.send(M.pack(this.world, ++this.sendSeq), { reliable: repair });
          this.nextSnap = now + 100;
          if (repair) this.nextReliable = now + 1000;
          this._rev = this.world.revision;
          this._phase = this.world.phase;
        }
      } else if (
        now >= this.nextInput &&
        (text !== this.lastInput || now >= this._heartbeat || intent.a)
      ) {
        const sent = this.send(
          { k: "i", q: ++this.inputSeq, d: live ? intent.d : -1, a: live ? Number(intent.a) : 0 },
          { to: AIHub.host, reliable: text !== this.lastInput || !!intent.a },
        );
        if (sent) {
          this.app.intentCache[0].a = false;
          this.lastInput = text;
          this._heartbeat = now + 200;
        }
        this.nextInput = now + 75;
      }
    }
    leave(id) {
      if (this.ended) return;
      this.players = this.players.filter((p) => p !== id);
      this.received.delete(id);
      if (AIHub.isHost && this.world) {
        this.world.removePlayer(id);
        if (!this.players.length) this.finish(false);
        else {
          this.nextSnap = 0;
          this.nextReliable = 0;
        }
      }
    }
    finish(won) {
      if (this.finished || this.ended || !AIHub.isHost || !this.world) return;
      this.finished = true;
      this.send(M.pack(this.world, ++this.sendSeq), { reliable: true });
      const ids = this.players.slice(),
        stats = {};
      for (const id of ids) {
        const p = this.world.stats.perPlayer[id] || {};
        stats[id] = {
          "Snacks munched": p.snacks || 0,
          "Bright snacks": p.stars || 0,
          "Predators caught": p.predators || 0,
          "Stages cleared": this.world.stats.stages,
          "Snacks remaining": this.world.remaining,
          "Team score": this.world.score,
        };
      }
      AIHub.finish({
        standings: ids.length ? [ids] : [],
        scores: Object.fromEntries(ids.map((id) => [id, this.world.score])),
        won: !!won && this.world.phase === "won",
        stats,
      });
    }
    end() {
      if (this.ended) return;
      this.ended = true;
      this.started = false;
      this.predicted = null;
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.app?.sound.end();
      if (this.app) {
        this.app.game.input.clear();
        for (const p of this.app.game.players || []) p.clear();
        this.app.game.o.menu = false;
        this.app.ui?.hide();
        this.app.game.paused = true;
        this.app.screen = "ended";
        document.body?.setAttribute("data-ended", "true");
      }
    }
    dispose() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }
  }
  M.Session = Session;
})(globalThis.Mix);
