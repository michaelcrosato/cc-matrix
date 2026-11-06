(function (M) {
  "use strict";
  const { DIRS, key, Board, GraphMover } = M;
  const ACTOR_STATES = [
    "penned",
    "releasing",
    "hunting",
    "frightened",
    "warning",
    "returning",
    "recharging",
  ];
  class World {
    constructor(options = {}) {
      this.seed = options.seed === undefined ? 4242 : M.seedValue(options.seed);
      this.rng = new M.RNG(this.seed);
      this.mode = options.mode || "campaign";
      this.seats = (options.seats || [0]).slice();
      this.tuning = { ...M.DEFAULTS, ...options.tuning };
      this.custom = options.custom ? M.copy(options.custom) : null;
      this.remixOptions = options.remixOptions || {};
      this.tick = 0;
      this.time = 0;
      this.elapsed = 0;
      this.stageIndex = options.stage || 0;
      this.revision = 0;
      this.eventId = 0;
      this.events = [];
      this.eventLog = [];
      this.phase = "intro";
      this.score = 0;
      this.lives = this.tuning.lives;
      this.assisted = !!options.assisted;
      this.god = !!options.god;
      this.showWalls = false;
      this.intents = new Map();
      this.damageGrace = 0;
      this.stats = { caught: 0, hits: 0, stages: 0, finals: [], perPlayer: {} };
      for (const id of this.seats)
        this.stats.perPlayer[id] = {
          snacks: 0,
          stars: 0,
          predators: 0,
          hits: 0,
          tunnels: 0,
          chirps: 0,
        };
      this.loadStage();
    }
    definition() {
      return this.custom
        ? M.copy(this.custom)
        : this.mode === "remix"
          ? M.generate(this.seed, this.remixOptions)
          : M.stage(this.stageIndex, this.seed);
    }
    emit(type, details = {}) {
      const e = { id: ++this.eventId, type, tick: this.tick, rev: this.revision, ...details };
      this.events.push(e);
      this.eventLog.push(e);
      if (this.eventLog.length > 100) this.eventLog.shift();
      return e;
    }
    loadStage() {
      const data = this.definition(),
        valid = M.validate(data);
      if (!valid.ok) throw new Error(valid.errors[0].message);
      this.data = data;
      this.board = new Board(data);
      this.revision++;
      this.phase = "intro";
      this.phaseT = 2.4;
      this.stageTime = 0;
      this.power = 0;
      this.powerEpoch = 0;
      this.chain = 0;
      this.damageGrace = 0;
      this.gateTime = 0;
      this.gateWarn = false;
      this.reveal = 3;
      this.echo = [];
      this.intents.clear();
      this.players = this.seats.map((id, i) => ({
        id,
        seat: i,
        m: new GraphMover(...data.spawns[i % 2], this.tuning.playerSpeed),
        inv: 1.5,
        hit: 0,
        bite: 0,
        chirp: 0,
        chirpFx: 0,
        alarm: 0,
        spawn: data.spawns[i % 2].slice(),
      }));
      this.food = data.food.map((f) => ({
        ...f,
        alive: true,
        m: new GraphMover(f.x, f.y, this.tuning.playerSpeed * this.tuning.foodBase),
        pending: -1,
        wait: 0,
        goal: null,
        goalLife: 0,
        turn: 0,
      }));
      this.predators = data.predators.map((p) => ({
        ...p,
        m: new GraphMover(p.x, p.y, this.tuning.predatorSpeed),
        state: "penned",
        wait: p.release,
        pending: -1,
        decision: 0,
        caughtEpoch: -1,
        patrol: 0,
      }));
      this.emit("stage", { stage: this.stageIndex });
    }
    setIntent(id, intent) {
      if (
        !this.players.some((p) => p.id === id) ||
        !intent ||
        !Number.isInteger(intent.d) ||
        intent.d < -1 ||
        intent.d > 3
      )
        return false;
      const prior = this.intents.get(id);
      this.intents.set(id, { d: intent.d, a: !!intent.a && !(prior && prior.a) });
      return true;
    }
    removePlayer(id) {
      this.players = this.players.filter((p) => p.id !== id);
      this.seats = this.seats.filter((p) => p !== id);
      this.intents.delete(id);
      this.emit("leave", { player: id });
    }
    setTuning(keyName, value) {
      const sp = M.TUNING.find((s) => s[0] === keyName);
      if (!sp || !Number.isFinite(value)) return false;
      this.tuning[keyName] = M.clamp(value, sp[2], sp[3]);
      this.assisted = true;
      return true;
    }
    foodSpeed() {
      return this.tuning.playerSpeed * M.foodRatio(this.remaining, this.tuning);
    }
    get remaining() {
      return this.food.filter((f) => f.alive).length;
    }
    nearestHero(x, y) {
      return this.players
        .filter((p) => !p.hit)
        .map((p) => ({ p, d: this.board.distance([x, y], [p.m.cx, p.m.cy]) }))
        .sort((a, b) => a.d - b.d || a.p.id - b.p.id)[0];
    }
    chooseFood(f) {
      const b = this.board,
        m = f.m;
      let edges = b
        .edges(m.cx, m.cy)
        .filter((e) => !b.inPen(e.x, e.y) && b.gateIndex(e.x, e.y) < 0);
      const forward = edges.filter((e) => e.d !== M.OPP(m.d));
      if (forward.length) edges = forward;
      if (!edges.length) return -1;
      if (!f.goal || f.goalLife <= 0 || (f.goal[0] === m.cx && f.goal[1] === m.cy)) {
        const cells = b.floorCells(true).filter((p) => {
          const d = b.distance([m.cx, m.cy], p);
          return d >= 7 && d <= 18;
        });
        f.goal = this.rng.pick(cells.length ? cells : b.floorCells(true));
        f.goalLife = 5 + this.rng.next() * 3;
      }
      const near = this.nearestHero(m.cx, m.cy),
        goal = f.goal;
      const score = (e) => {
        const dist = b.distance([e.x, e.y], goal),
          prey = near ? b.distance([e.x, e.y], [near.p.m.cx, near.p.m.cy]) : 99;
        return (
          -dist * 0.22 +
          (near && near.d < 8 ? Math.min(prey, 10) * 3.8 : 0) +
          (e.d === m.d ? 0.35 : 0)
        );
      };
      // Goal commitments and no reversal prevent equal-speed instant evasions.
      return edges
        .map((e) => ({ e, s: score(e) + this.rng.next() * 0.12 }))
        .sort((a, b) => b.s - a.s || a.e.d - b.e.d)[0].e.d;
    }
    choosePredator(e) {
      const b = this.board,
        m = e.m;
      if (e.state === "returning" || e.state === "releasing") {
        const goal =
          e.state === "returning"
            ? [10, 8]
            : b.gateCells[b.orientation].map((v, i) => v + DIRS[b.orientation][i]);
        const path = b.path([m.cx, m.cy], goal);
        return path.length > 1 ? b.direction(path[0], path[1]) : -1;
      }
      let edges = b.edges(m.cx, m.cy);
      const noBack = edges.filter((a) => a.d !== M.OPP(m.d));
      if (noBack.length) edges = noBack;
      if (!edges.length) return -1;
      const near = this.nearestHero(m.cx, m.cy);
      if (!near) return edges[0].d;
      let target = [near.p.m.cx, near.p.m.cy];
      if (e.state === "frightened" || e.state === "warning")
        return edges.sort(
          (a, c) => b.distance([c.x, c.y], target) - b.distance([a.x, a.y], target) || a.d - c.d,
        )[0].d;
      if (e.role === "interceptor")
        for (let j = 0; j < 3; j++) {
          const n = b.neighbor(...target, near.p.m.d);
          if (n) target = [n.x, n.y];
        }
      if (e.role === "keeper" && near.d > 5) {
        const patrol = [
          [7, 5],
          [13, 5],
          [13, 11],
          [7, 11],
        ];
        target = patrol[e.patrol % 4];
        if (m.cx === target[0] && m.cy === target[1]) {
          e.patrol++;
          target = patrol[e.patrol % 4];
        }
      }
      return edges.sort(
        (a, c) => b.distance([a.x, a.y], target) - b.distance([c.x, c.y], target) || a.d - c.d,
      )[0].d;
    }
    chirp(player) {
      if (player.chirp > 0 || this.phase !== "playing") return false;
      player.chirp = this.tuning.chirpCooldown;
      player.chirpFx = 0.75;
      this.reveal = Math.max(this.reveal, 1.25);
      this.stats.perPlayer[player.id].chirps++;
      this.emit("chirp", { player: player.id, x: player.m.x, y: player.m.y });
      return true;
    }
    step(dt = 1 / 120) {
      this.events = [];
      if (this.phase === "won" || this.phase === "lost") return;
      this.tick++;
      this.time = this.tick / 120;
      this.elapsed += dt;
      if (this.phase !== "playing") {
        this.phaseT -= dt;
        if (this.phaseT <= 0) {
          if (this.phase === "intro") {
            this.phase = "playing";
            this.emit("go");
            this.intents.clear();
          } else if (this.phase === "clear") {
            if (this.mode !== "campaign" || this.stageIndex === 5) {
              this.phase = "won";
              this.emit("victory");
            } else {
              this.stageIndex++;
              this.loadStage();
            }
          }
        }
        return;
      }
      this.stageTime += dt;
      this.damageGrace = Math.max(0, this.damageGrace - dt);
      this.reveal = Math.max(0, this.reveal - dt);
      this.echo = this.echo.filter((e) => (e.t -= dt) > 0);
      if (this.data.reveal.kind !== "none" && this.stageTime % this.data.reveal.period < dt)
        this.reveal = this.data.reveal.duration;
      const oldPower = this.power;
      this.power = Math.max(0, this.power - dt);
      if (oldPower > 1.5 && this.power <= 1.5) this.emit("warning");
      if (oldPower > 0 && this.power === 0) {
        this.chain = 0;
        this.emit("power-end");
      }
      if (this.data.gate.turning) {
        this.gateTime += dt;
        if (!this.gateWarn && this.gateTime >= this.tuning.gateCadence - 0.5) {
          this.gateWarn = true;
          this.emit("gate-warn");
        }
        if (this.gateTime >= this.tuning.gateCadence) {
          const gate = this.board.gateCells[this.board.orientation],
            occupied = [
              ...this.players,
              ...this.food.filter((f) => f.alive),
              ...this.predators,
            ].some((a) =>
              [[a.m.cx, a.m.cy], ...(a.m.moving ? [a.m._to] : [])].some(
                (p) => p[0] === gate[0] && p[1] === gate[1],
              ),
            );
          if (!occupied) {
            this.board.setOrientation((this.board.orientation + 1) % 4);
            this.gateTime = 0;
            this.gateWarn = false;
            this.emit("gate-turn", { orientation: this.board.orientation });
          }
        }
      }
      for (const p of this.players) {
        p.inv = Math.max(0, p.inv - dt);
        p.bite = Math.max(0, p.bite - dt);
        p.chirp = Math.max(0, p.chirp - dt);
        p.chirpFx = Math.max(0, p.chirpFx - dt);
        p.alarm = Math.max(0, p.alarm - dt);
        if (p.hit > 0) {
          p.hit -= dt;
          p.m.update(dt, this.board, -1, { time: this.time, stop: true });
          if (p.hit <= 0) this.respawn(p);
          continue;
        }
        const I = this.intents.get(p.id) || { d: -1, a: false };
        if (I.a) {
          this.chirp(p);
          I.a = false;
        }
        p.m.speed = this.tuning.playerSpeed;
        if (
          I.d >= 0 &&
          !p.m.moving &&
          !this.board.neighbor(p.m.cx, p.m.cy, I.d) &&
          this.echo.every((e) => e.player !== p.id)
        ) {
          this.echo.push({ player: p.id, x: p.m.cx, y: p.m.cy, t: 0.8 });
          this.emit("bump", { player: p.id });
        }
        p.m.update(dt, this.board, I.d, {
          time: this.time,
          onTunnel: () => {
            this.stats.perPlayer[p.id].tunnels++;
            this.emit("tunnel", { player: p.id, x: p.m.x, y: p.m.y });
          },
        });
      }
      const foodSpeed = this.foodSpeed();
      for (const f of this.food) {
        if (!f.alive) continue;
        f.m.speed = foodSpeed;
        f.goalLife -= dt;
        f.turn = Math.max(0, f.turn - dt);
        if (f.wait > 0) {
          f.wait -= dt;
          f.m.update(dt, this.board, -1, { time: this.time, stop: true });
          continue;
        }
        if (!f.m.moving && f.pending < 0) {
          f.pending = this.chooseFood(f);
          if (f.m.d >= 0 && f.pending !== f.m.d) {
            f.wait = 0.035 + 0.05 * (this.remaining / 12);
            f.turn = 0.2;
            f.m.update(dt, this.board, -1, { time: this.time, stop: true });
            continue;
          }
        }
        const d = f.pending;
        f.m.update(dt, this.board, d, { time: this.time, choose: () => d });
        if (f.m.moving) f.pending = -1;
      }
      for (const e of this.predators) {
        if (e.state === "penned") {
          e.wait -= dt;
          if (e.wait <= 0) e.state = "releasing";
        }
        if (e.state === "recharging") {
          e.wait -= dt;
          if (e.wait <= 0 && !(this.power > 0 && e.caughtEpoch === this.powerEpoch)) {
            e.state = "releasing";
            e.pending = -1;
          }
        }
        if (e.state === "returning" && !e.m.moving && e.m.cx === 10 && e.m.cy === 8) {
          e.state = "recharging";
          e.wait = 1.8;
          e.pending = -1;
          this.emit("recharge", { enemy: e.id });
        }
        if (
          e.state === "releasing" &&
          !this.board.inPen(e.m.cx, e.m.cy) &&
          this.board.gateIndex(e.m.cx, e.m.cy) < 0
        )
          e.state = this.power > 0 ? "frightened" : "hunting";
        if (["hunting", "frightened", "warning"].includes(e.state))
          e.state = this.power > 0 ? (this.power <= 1.5 ? "warning" : "frightened") : "hunting";
        const stationary = e.state === "penned" || e.state === "recharging";
        e.m.speed =
          e.state === "returning"
            ? this.tuning.playerSpeed * 1.4
            : this.tuning.predatorSpeed *
              e.speed *
              (this.power > 0 && e.state !== "releasing" ? 0.65 : 1);
        if (stationary) {
          e.m.update(dt, this.board, -1, { time: this.time, stop: true });
          continue;
        }
        if (e.decision > 0) {
          e.decision -= dt;
          e.m.update(dt, this.board, -1, { time: this.time, stop: true });
          continue;
        }
        if (!e.m.moving && e.pending < 0) {
          e.pending = this.choosePredator(e);
          if (e.state !== "returning" && e.state !== "releasing") {
            e.decision = this.tuning.reaction * (e.role === "keeper" ? 1.8 : 1);
            e.m.update(dt, this.board, -1, { time: this.time, stop: true });
            continue;
          }
        }
        const d = e.pending;
        e.m.update(dt, this.board, d, { time: this.time, choose: () => d });
        if (e.m.moving) e.pending = -1;
      }
      const contacts = [];
      for (const p of this.players)
        if (!p.hit)
          for (const f of this.food)
            if (f.alive) {
              const t = M.encounter(p.m, f.m, this.board, 0.57);
              if (t !== Infinity) contacts.push({ t, p, f });
            }
      contacts.sort(
        (a, b) => a.t - b.t || Number(a.f.id.slice(1)) - Number(b.f.id.slice(1)) || a.p.id - b.p.id,
      );
      for (const { p, f } of contacts)
        if (f.alive) {
          f.alive = false;
          const points = f.power ? 3 : 1;
          this.score += points;
          p.bite = 0.24;
          this.stats.caught++;
          this.stats.perPlayer[p.id].snacks++;
          if (f.power) {
            this.stats.perPlayer[p.id].stars++;
            this.power = this.tuning.powerDuration;
            this.powerEpoch++;
            this.chain = 0;
            this.emit("power", { player: p.id, x: f.m.x, y: f.m.y });
            for (const e of this.predators)
              if (["hunting", "warning", "frightened"].includes(e.state)) e.state = "frightened";
          }
          this.emit("bite", {
            player: p.id,
            food: f.id,
            power: f.power,
            x: f.m.x,
            y: f.m.y,
            points,
          });
        }
      if (!this.remaining) {
        this.phase = "clear";
        this.phaseT = 3;
        this.stats.stages++;
        this.stats.finals.push({ stage: this.stageIndex, time: this.stageTime });
        this.lives = Math.min(this.tuning.lives, this.lives + this.tuning.lifeRestore);
        this.emit("clear", { stage: this.stageIndex });
        return;
      }
      const danger = [];
      for (const p of this.players)
        if (!p.hit)
          for (const e of this.predators)
            if (["hunting", "frightened", "warning"].includes(e.state)) {
              const t = M.encounter(p.m, e.m, this.board, 0.62);
              if (t !== Infinity) danger.push({ t, p, e });
            }
      danger.sort((a, b) => a.t - b.t || a.e.id.localeCompare(b.e.id) || a.p.id - b.p.id);
      for (const { p, e } of danger) {
        if (e.state === "returning" || p.hit) continue;
        if (this.power > 0) {
          e.state = "returning";
          e.pending = -1;
          e.decision = 0;
          e.caughtEpoch = this.powerEpoch;
          const points = [5, 10, 20][Math.min(this.chain++, 2)];
          this.score += points;
          this.stats.perPlayer[p.id].predators++;
          p.bite = 0.3;
          this.emit("catch", { player: p.id, enemy: e.id, points, x: e.m.x, y: e.m.y });
        } else if (p.inv <= 0 && this.damageGrace <= 0 && !this.god) {
          this.lives--;
          this.damageGrace = this.tuning.damageGrace;
          p.hit = 0.5;
          p.alarm = 0.65;
          this.stats.hits++;
          this.stats.perPlayer[p.id].hits++;
          this.intents.delete(p.id);
          this.emit("hit", { player: p.id, x: p.m.x, y: p.m.y });
          if (this.lives <= 0) {
            this.phase = "lost";
            this.emit("failure");
            break;
          }
        }
      }
    }
    respawn(p) {
      const b = this.board,
        threat = (cell) =>
          Math.min(
            ...this.predators
              .filter((e) => e.state === "hunting")
              .map((e) => b.distance(cell, [e.m.cx, e.m.cy])),
            99,
          );
      const cell =
        threat(p.spawn) >= 4
          ? p.spawn
          : b.floorCells(true).sort((a, c) => threat(c) - threat(a))[0];
      p.m.place(...cell);
      p.inv = 1.5;
      p.hit = 0;
      this.intents.delete(p.id);
      this.emit("respawn", { player: p.id, x: cell[0], y: cell[1] });
    }
    advance(seconds, intents) {
      const ticks = Math.round(seconds * 120);
      for (let i = 0; i < ticks; i++) {
        if (intents)
          for (const p of this.players)
            this.setIntent(p.id, intents(this, p) || { d: -1, a: false });
        this.step();
      }
      return this;
    }
    snapshot() {
      const actor = (a) => ({
        id: a.id,
        x: +a.m.x.toFixed(4),
        y: +a.m.y.toFixed(4),
        cx: a.m.cx,
        cy: a.m.cy,
        dir: a.m.d,
        moving: a.m.moving,
      });
      return {
        version: 1,
        seed: this.seed,
        mode: this.mode,
        tick: this.tick,
        revision: this.revision,
        stage: this.stageIndex,
        name: this.data.name,
        phase: this.phase,
        phaseT: this.phaseT,
        remaining: this.remaining,
        score: this.score,
        lives: this.lives,
        power: this.power,
        chain: this.chain,
        gate: this.board.orientation,
        gateTime: this.gateTime,
        reveal: this.reveal,
        assisted: this.assisted,
        elapsed: this.elapsed,
        players: this.players.map((p) => ({ ...actor(p), inv: p.inv, hit: p.hit, chirp: p.chirp })),
        food: this.food.map((f) => ({ ...actor(f), alive: f.alive, power: f.power, goal: f.goal })),
        predators: this.predators.map((e) => ({ ...actor(e), role: e.role, state: e.state })),
        stats: M.copy(this.stats),
        events: this.eventLog.slice(-12),
      };
    }
  }
  M.ACTOR_STATES = ACTOR_STATES;
  M.World = World;
})(globalThis.Mix);
