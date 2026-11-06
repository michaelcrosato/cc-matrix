(() => {
  "use strict";
  const G = globalThis.Edge,
    { W, H, DT } = G;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const wrap = (y) => ((y % H) + H) % H;
  const dy = (a, b) => ((a - b + H * 1.5) % H) - H * 0.5;
  const distance = (a, b) => Math.hypot(a.x - b.x, dy(a.y, b.y));
  const approach = (a, b, d) => (a < b ? Math.min(a + d, b) : Math.max(a - d, b));
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const segmentDist = (ax, ay, bx, by, x, y) => {
    const dx = bx - ax,
      dd = by - ay,
      t = clamp(((x - ax) * dx + (y - ay) * dd) / (dx * dx + dd * dd || 1), 0, 1);
    return Math.hypot(x - ax - t * dx, y - ay - t * dd);
  };
  const swept = (b, p, r) => [-H, 0, H].some((o) => segmentDist(b.ox, b.oy, b.x, b.y, p.x, p.y + o) < r);
  Object.assign(G, { clamp, wrap, wrapDy: dy, distance, segmentDist, swept });
  class World {
    constructor(opts = {}) {
      this.seed = (opts.seed ?? 41739) >>> 0;
      this.rngState = this.seed || 1;
      this.tick = 0;
      this.time = 0;
      this.difficulty = opts.difficulty === "Assist" ? "Assist" : "Normal";
      this.practice = !!opts.practice;
      this.demo = !!opts.demo;
      this.tuning = G.validateTuning(opts.tuning);
      this.pendingTuning = null;
      this.cheats = { invulnerable: false, infinite: false };
      this.sector = clamp(opts.sector || 0, 0, 2);
      this.startSector = this.sector;
      this.custom = opts.encounter ? G.validateEncounter(opts.encounter) : null;
      this.players = (opts.players || [{ id: 0, name: "Nacre", color: "#84f9d1" }]).map((p, i) => ({
        id: p.id,
        name: p.name || ["Nacre", "Vesper"][i],
        color: p.color || ["#84f9d1", "#dab1ff"][i],
        shape: i,
        x: 96,
        y: 100 + i * 70,
        vx: 0,
        vy: 0,
        ax: 1,
        ay: 0,
        r: 4.3,
        alive: true,
        gone: false,
        respawn: -1,
        inv: 2,
        charge: 0,
        biteTimer: 0,
        fireTimer: 0,
        refillTimer: 0,
        biteGlow: 0,
        cannonAck: 0,
        lastEdge: 0,
        kills: 0,
        bites: 0,
        shots: 0,
        deaths: 0,
        refuge: false,
        blocked: 0,
        wrapped: 0,
      }));
      this.reserves = clamp(
        this.tuning.reserve + (this.players.length > 1 ? 1 : 0) + (this.difficulty === "Assist" ? 2 : 0),
        0,
        8,
      );
      this.score = 0;
      this.chain = 1;
      this.chainTimer = 0;
      this.breakdown = { breach: 0, bite: 0, core: 0, intercept: 0, ending: 0 };
      this.stats = {
        bites: 0,
        shots: 0,
        cannons: 0,
        misses: 0,
        reflections: 0,
        intercepts: 0,
        deaths: 0,
        refills: 0,
        wraps: 0,
      };
      this.events = [];
      this.history = [];
      this.eventId = 0;
      this.nextId = 1;
      this.bullets = [];
      this.cannons = [];
      this.pursuers = [];
      this.status = "playing";
      this.phaseTime = 0;
      this.outcome = null;
      this.endingAwarded = false;
      this.lessons = {
        moved: false,
        shot: false,
        bitten: false,
        charged: false,
        static: false,
        called: false,
        evaded: false,
        intercept: false,
        refill: false,
      };
      this.loadSector(this.sector, true);
    }
    random() {
      let s = this.rngState;
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      this.rngState = s >>> 0;
      return this.rngState / 4294967296;
    }
    emit(type, detail = {}) {
      const e = { id: ++this.eventId, tick: this.tick, type, ...detail };
      this.events.push(e);
      this.history.push(e);
      if (this.events.length > 80) this.events.shift();
      if (this.history.length > 300) this.history.shift();
      return e;
    }
    loadSector(index, initial = false) {
      this.sector = index;
      const s = G.SECTORS[index],
        c = this.custom && this.custom.sector === index ? this.custom : s;
      this.sectorTime = 0;
      this.phase = 0;
      this.status = "playing";
      this.phaseTime = 0;
      this.cells = c.cells.map((v, i) => ({ ...v, index: i, alive: true }));
      this.plates = c.plates.map((v) => ({ ...v, offset: 0 }));
      this.refuge = { ...c.refuge, active: true, warning: false, cycle: 0 };
      this.core = {
        x: 550,
        y: H / 2,
        homeX: 550,
        homeY: H / 2,
        r: 19,
        hits: s.hits,
        mode: "dock",
        timer: s.firstSwirl,
        vx: 0,
        vy: 0,
        flightTime: 0,
        targetY: H / 2,
        flash: 0,
        phaseEpoch: 0,
      };
      this.bullets = [];
      this.cannons = [];
      this.pursuers = [];
      for (let i = 0; i < s.pursuers; i++) this.spawnPursuer(i);
      for (const p of this.players) {
        if (p.gone) continue;
        p.x = 98;
        p.y = 100 + p.shape * 70;
        p.vx = p.vy = 0;
        p.inv = 2.5;
        p.refuge = false;
        p.fireTimer = 0;
        p.biteTimer = 0;
        p.blocked = 0;
        if (!initial) {
          p.alive = true;
          p.respawn = -1;
          p.charge = 0;
        }
      }
      this.emit("sector", { sector: index, name: s.name });
      if (index === 1)
        this.emit("notice", {
          title: "DIAMONDS REFLECT",
          text: "A diamond cell returns one siege shot. Leave the lane.",
        });
      if (index === 2)
        this.emit("notice", {
          title: "THE REFUGE CAN FRACTURE",
          text: "Watch its borders. A warning comes before every outage.",
        });
    }
    spawnPursuer(i = this.pursuers.length) {
      this.pursuers.push({
        id: this.nextId++,
        x: 540,
        y: 42 + i * 170,
        angle: Math.PI,
        vx: 0,
        vy: 0,
        r: 5,
        kind: i % 2,
        grace: 3,
      });
    }
    cellPosition(c) {
      return { x: c.x, y: wrap(c.y + (this.plates[c.plate]?.offset || 0)) };
    }
    inRefuge(p) {
      return this.refuge.active && p.x >= this.refuge.x && p.x <= this.refuge.x + this.refuge.w;
    }
    award(kind, base) {
      if (!Object.hasOwn(this.breakdown, kind)) return;
      this.chainTimer = 3.4;
      const amount = Math.round(base * this.chain);
      this.breakdown[kind] += amount;
      this.score += amount;
      this.chain = clamp(this.chain + 0.07, 1, 4);
    }
    removeCell(c, kind, p) {
      if (!c?.alive) return false;
      c.alive = false;
      const pos = this.cellPosition(c);
      if (kind === "bite") {
        this.award("bite", 55);
        this.stats.bites++;
        p.bites++;
        this.lessons.bitten = true;
        p.biteGlow = 0.17;
        const was = p.charge;
        p.charge = clamp(p.charge + 1, 0, this.tuning.charge);
        if (was < this.tuning.charge && p.charge >= this.tuning.charge) {
          this.lessons.charged = true;
          this.emit("ready", { player: p.id, x: p.x, y: p.y });
        }
      } else this.award("breach", kind === "cannon" ? 15 : 18);
      this.emit("cell", {
        cell: c.index,
        kind,
        player: p?.id ?? -1,
        x: pos.x,
        y: pos.y,
        material: c.material,
      });
      return true;
    }
    kill(p, kind) {
      if (!p.alive || p.gone || p.inv > 0 || this.cheats.invulnerable || this.demo) return false;
      if (kind === "pursuer" && this.inRefuge(p)) return false;
      p.alive = false;
      p.deaths++;
      p.charge = 0;
      p.vx = p.vy = 0;
      this.stats.deaths++;
      this.chain = 1;
      p.respawn = this.reserves > 0 ? 1.35 : -1;
      if (p.respawn >= 0) this.reserves--;
      this.emit("death", { player: p.id, x: p.x, y: p.y, kind, reserves: this.reserves });
      return true;
    }
    respawnPlayer(p) {
      if (p.alive || p.gone) return;
      // The entire launch strip is clear of cellular defenses; protection lets the scout leave any crossing shot.
      const spots = [40, 96, 152, 208, 252];
      let best = spots[0],
        bestD = -1;
      for (const y of spots) {
        const d = Math.min(
          ...this.pursuers.map((q) => distance({ x: 98, y }, q)),
          distance({ x: 98, y }, this.core),
        );
        if (d > bestD) {
          bestD = d;
          best = y;
        }
      }
      p.alive = true;
      p.respawn = -1;
      p.x = 98;
      p.y = best;
      p.vx = p.vy = 0;
      p.inv = 2.5;
      p.charge = 0;
      p.refillTimer = 0;
      this.emit("respawn", { player: p.id, x: p.x, y: p.y });
    }
    queueTuning(v) {
      this.pendingTuning = G.validateTuning(v);
    }
    applyTuning() {
      if (!this.pendingTuning) return;
      const old = this.tuning;
      this.tuning = this.pendingTuning;
      this.pendingTuning = null;
      for (const p of this.players) {
        p.charge = Math.min(p.charge, this.tuning.charge);
        p.biteTimer = Math.min(p.biteTimer, this.tuning.bite);
        p.fireTimer = Math.min(p.fireTimer, this.tuning.fire);
      }
      if (old.reserve !== this.tuning.reserve) this.reserves = this.tuning.reserve;
      this.practice = true;
      this.emit("tuned");
    }
    callCannon(p, edge) {
      if (!Number.isInteger(edge) || edge <= p.lastEdge) return false;
      p.lastEdge = edge;
      p.cannonAck = edge;
      if (!p.alive || p.gone || this.status !== "playing") return false;
      if (this.inRefuge(p)) {
        p.blocked = 0.8;
        this.emit("blocked", { player: p.id, reason: "STATIC SUPPRESSES WEAPONS", x: p.x, y: p.y });
        return false;
      }
      if (p.charge < this.tuning.charge && !this.cheats.infinite && !this.demo) return false;
      p.charge = 0;
      this.stats.cannons++;
      this.lessons.called = true;
      this.cannons.push({
        id: this.nextId++,
        owner: p.id,
        x: 34,
        y: p.y,
        ox: 34,
        oy: p.y,
        r: 4,
        mode: "warning",
        timer: this.tuning.cannonWind,
        vx: this.tuning.cannonSpeed,
        reflected: false,
        life: 4,
        epoch: this.core.phaseEpoch,
      });
      this.emit("cannon-call", { player: p.id, x: 34, y: p.y, wait: this.tuning.cannonWind });
      return true;
    }
    movePlayer(p, a) {
      const t = this.tuning,
        dt = DT;
      let mx = Number.isFinite(a?.mx) ? clamp(a.mx, -1, 1) : 0,
        my = Number.isFinite(a?.my) ? clamp(a.my, -1, 1) : 0;
      let n = Math.hypot(mx, my);
      if (n > 1) {
        mx /= n;
        my /= n;
      }
      if (n > 0.1) this.lessons.moved = true;
      const acceleration = n > 0.03 ? 1550 : 2200;
      p.vx = approach(p.vx, mx * t.speed, acceleration * dt);
      p.vy = approach(p.vy, my * t.speed, acceleration * dt);
      p.x = clamp(p.x + p.vx * dt, 50, W - 24);
      const ny = p.y + p.vy * dt;
      p.y = wrap(ny);
      p.wrapped = Math.max(0, p.wrapped - dt);
      if (ny < 0 || ny >= H) {
        this.stats.wraps++;
        p.wrapped = 0.35;
        this.emit("wrap", { player: p.id, x: p.x, y: p.y });
      }
      const ax = Number(a?.ax),
        ay = Number(a?.ay),
        an = Math.hypot(ax, ay);
      if (Number.isFinite(an) && an > 0.1) {
        p.ax = ax / an;
        p.ay = ay / an;
      }
      p.refuge = this.inRefuge(p);
      p.inv = Math.max(0, p.inv - dt);
      p.refillTimer = Math.max(0, p.refillTimer - dt);
      p.biteGlow = Math.max(0, p.biteGlow - dt);
      p.blocked = Math.max(0, p.blocked - dt);
      p.biteTimer -= dt;
      p.fireTimer -= dt;
      if (p.refuge) {
        this.lessons.static = true;
        if (a?.fire) p.blocked = 0.5;
      }
      if (a?.fire && !p.refuge && p.fireTimer <= 0) {
        p.fireTimer = t.fire;
        this.lessons.shot = true;
        this.stats.shots++;
        p.shots++;
        this.bullets.push({
          id: this.nextId++,
          owner: p.id,
          x: p.x + p.ax * 12,
          y: p.y + p.ay * 12,
          ox: p.x,
          oy: p.y,
          vx: p.ax * 335,
          vy: p.ay * 335,
          r: 1.4,
          life: 1.9,
        });
        this.emit("shot", { player: p.id, x: p.x, y: p.y });
      }
      if (a?.cannon) this.callCannon(p, a.cannon);
      if (p.biteTimer <= 0) {
        let nearest = null,
          nd = 16;
        for (const c of this.cells)
          if (c.alive) {
            const d = distance(p, this.cellPosition(c));
            if (d < nd) {
              nd = d;
              nearest = c;
            }
          }
        if (nearest) {
          p.biteTimer = t.bite;
          this.removeCell(nearest, "bite", p);
        }
      }
      if (this.core.mode === "dock" && distance(p, this.core) < this.core.r + 9 && p.refillTimer <= 0) {
        const was = p.charge;
        p.charge = t.charge;
        p.refillTimer = 2.5;
        this.lessons.refill = true;
        if (was < t.charge) {
          this.stats.refills++;
          this.emit("refill", { player: p.id, x: p.x, y: p.y });
        }
      }
    }
    coreHome() {
      const moving = this.sector === 2 && this.phase === 1;
      return { x: 550, y: H / 2 + (moving ? Math.sin(this.sectorTime * 0.48) * 58 : 0) };
    }
    startWind() {
      const c = this.core,
        targets = this.players.filter((p) => p.alive && !p.gone);
      const p = targets[Math.floor(this.random() * Math.max(1, targets.length))] || { x: 100, y: 140 };
      c.mode = "windup";
      c.timer = this.tuning.swirlWind * (this.difficulty === "Assist" ? 1.5 : 1);
      c.targetY = wrap(p.y + p.vy * 0.25);
      const dx = -Math.max(180, c.x - 60),
        dd = dy(c.targetY, c.y),
        n = Math.hypot(dx, dd);
      c.vx = (dx / n) * this.tuning.swirlSpeed;
      c.vy = (dd / n) * this.tuning.swirlSpeed;
      this.emit("swirl-wind", { x: c.x, y: c.y, targetY: c.targetY });
    }
    updateCore() {
      const c = this.core,
        dt = DT,
        s = G.SECTORS[this.sector];
      c.flash = Math.max(0, c.flash - dt);
      c.timer -= dt;
      const home = this.coreHome();
      c.homeX = home.x;
      c.homeY = home.y;
      if (c.mode === "break") {
        if (c.timer <= 0) {
          c.mode = "dock";
          c.x = home.x;
          c.y = home.y;
          c.timer = this.sector === 2 && this.phase === 2 ? 6 : 8;
          this.emit("dock", { x: c.x, y: c.y, final: this.phase === 2 && this.sector === 2 });
        }
        return;
      }
      if (c.mode === "dock") {
        c.x = home.x;
        c.y = home.y;
        if (c.timer <= 0) this.startWind();
      } else if (c.mode === "windup") {
        if (c.timer <= 0) {
          c.mode = "flight";
          c.flightTime = 0;
          this.emit("swirl-launch", { x: c.x, y: c.y, vx: c.vx, vy: c.vy });
        }
      } else if (c.mode === "flight") {
        c.flightTime += dt;
        c.x += c.vx * dt;
        c.y = wrap(c.y + c.vy * dt);
        if (c.x < 64 || c.flightTime > 4.7) {
          c.mode = "return";
          c.timer = 4;
          this.emit("swirl-return", { x: c.x, y: c.y });
        }
      } else if (c.mode === "return") {
        const dd = dy(home.y, c.y),
          dx = home.x - c.x,
          n = Math.hypot(dx, dd),
          step = 220 * dt;
        if (n <= step) {
          c.x = home.x;
          c.y = home.y;
          c.mode = "dock";
          c.timer = this.sector === 2 && this.phase === 2 ? 7 : s.swirlEvery;
          for (const p of this.players) p.refillTimer = 0;
          this.emit("dock", { x: c.x, y: c.y, final: this.sector === 2 && this.phase === 2 });
        } else {
          c.x += (dx / n) * step;
          c.y = wrap(c.y + (dd / n) * step);
        }
      }
      if (["flight", "return"].includes(c.mode))
        for (const p of this.players)
          if (p.alive && !p.gone && distance(p, c) < p.r + c.r - 3) this.kill(p, "swirl");
    }
    hitCore(shot) {
      const c = this.core;
      if (c.hits <= 0 || c.mode === "break" || c.mode === "defeated" || shot.epoch !== c.phaseEpoch)
        return false;
      if (this.sector === 2 && this.phase === 2 && c.mode !== "flight") {
        this.emit("core-immune", { x: c.x, y: c.y, final: true });
        return false;
      }
      const airborne = c.mode === "flight";
      c.hits--;
      c.phaseEpoch++;
      c.flash = 0.4;
      this.award("core", 1200);
      if (airborne) {
        this.stats.intercepts++;
        this.lessons.intercept = true;
        this.award("intercept", 2400);
        this.reserves = Math.min(8, this.reserves + 1);
        this.emit("airborne-bonus", { reserves: this.reserves });
      }
      this.emit("core-hit", { x: c.x, y: c.y, hits: c.hits, airborne, sector: this.sector });
      if (c.hits <= 0) {
        c.mode = "defeated";
        this.status = "collapse";
        this.phaseTime = 0;
        this.bullets = [];
        this.pursuers = [];
        for (const q of this.cannons) q.mode = "spent";
        this.emit("collapse", { x: c.x, y: c.y, sector: this.sector });
      } else {
        this.phase++;
        c.mode = "break";
        c.timer = 2.2;
        if (this.sector === 1) {
          this.plates[0].phase += 1.4;
          this.plates[1].phase += Math.PI;
        }
        if (this.sector === 2) {
          for (const v of this.cells) if (this.phase === 2 || v.plate === 0) this.removeCell(v, "collapse");
          if (this.phase === 1) this.spawnPursuer();
          if (this.phase === 2) {
            this.pursuers = this.pursuers.slice(0, 1);
            this.emit("notice", {
              title: "INTERCEPT THE FLYING HEART",
              text: "Docked: touch for charge. Flying: cannon for the final blow. Airborne hits earn a reserve.",
            });
          }
        }
        this.emit("phase", { phase: this.phase, x: c.x, y: c.y });
      }
      return true;
    }
    updatePursuers() {
      const dt = DT,
        alive = this.players.filter((p) => p.alive && !p.gone),
        assist = this.difficulty === "Assist";
      for (const q of this.pursuers) {
        q.grace = Math.max(0, q.grace - dt);
        if (!alive.length) continue;
        const target = alive.reduce((a, b) => (distance(q, a) < distance(q, b) ? a : b));
        const protectedTarget = this.inRefuge(target);
        // Static bends the missile around its border; it continues hunting, never despawns.
        const targetX = protectedTarget ? this.refuge.x + this.refuge.w + 12 : target.x;
        const targetY = protectedTarget
          ? wrap(target.y + Math.sin(this.sectorTime * 1.7 + q.id) * 60)
          : target.y;
        const wanted = Math.atan2(dy(targetY, q.y), targetX - q.x);
        const turn = this.tuning.pursuerTurn * (q.kind ? 1.25 : 1) * (assist ? 0.72 : 1) * dt;
        q.angle += clamp(angleDiff(wanted, q.angle), -turn, turn);
        const speed =
          this.tuning.pursuerSpeed * (1 + this.sector * 0.12) * (q.kind ? 1.1 : 1) * (assist ? 0.65 : 1);
        q.vx = Math.cos(q.angle) * speed;
        q.vy = Math.sin(q.angle) * speed;
        q.x = clamp(q.x + q.vx * dt, 48, W - 18);
        q.y = wrap(q.y + q.vy * dt);
        if (q.grace <= 0) for (const p of alive) if (distance(p, q) < p.r + q.r) this.kill(p, "pursuer");
      }
    }
    updateProjectiles() {
      const dt = DT,
        c = this.core;
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        b.ox = b.x;
        b.oy = b.y;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        let contact = null,
          dist = Infinity;
        for (const cell of this.cells)
          if (cell.alive) {
            const p = this.cellPosition(cell);
            if (swept(b, p, 7)) {
              const d = Math.hypot(p.x - b.ox, dy(p.y, b.oy));
              if (d < dist) {
                contact = cell;
                dist = d;
              }
            }
          }
        if (contact) {
          this.removeCell(
            contact,
            "shot",
            this.players.find((p) => p.id === b.owner),
          );
          b.life = 0;
        } else if (c.mode !== "defeated" && swept(b, c, c.r)) {
          b.life = 0;
          this.emit("core-immune", { x: c.x, y: c.y, final: this.sector === 2 && this.phase === 2 });
        }
        if (b.x < 0 || b.x > W) b.life = 0;
        // A wrap is a teleport, so next tick starts at the wrapped position rather than a whole-arena sweep.
        b.y = wrap(b.y);
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      for (const b of this.cannons) {
        if (b.mode === "spent") continue;
        if (b.mode === "warning" || b.mode === "reflect-warning") {
          b.timer -= dt;
          if (b.timer <= 0) {
            b.mode = "travel";
            this.emit(b.reflected ? "cannon-return" : "cannon-launch", { x: b.x, y: b.y, player: b.owner });
          }
          continue;
        }
        b.life -= dt;
        b.ox = b.x;
        b.oy = b.y;
        b.x += b.vx * dt;
        let contact = null,
          cd = Infinity;
        for (const cell of this.cells)
          if (cell.alive) {
            const p = this.cellPosition(cell);
            if (swept(b, p, 6 + b.r)) {
              const d = Math.abs(p.x - b.ox);
              if (d < cd) {
                contact = cell;
                cd = d;
              }
            }
          }
        let endX = b.x;
        if (contact) {
          const p = this.cellPosition(contact);
          endX = p.x;
        }
        const travel = { ...b, x: endX };
        for (const p of this.players)
          if (p.alive && !p.gone && swept(travel, p, p.r + b.r)) this.kill(p, "cannon");
        if (
          !this.lessons.evaded &&
          b.x > this.players.find((p) => p.id === b.owner)?.x &&
          this.players.find((p) => p.id === b.owner)?.alive
        ) {
          this.lessons.evaded = true;
          this.emit("evaded", { player: b.owner });
        }
        if (contact) {
          const material = contact.material;
          this.removeCell(
            contact,
            "cannon",
            this.players.find((p) => p.id === b.owner),
          );
          if (material === 1 && !b.reflected && b.vx > 0) {
            b.reflected = true;
            b.vx = -this.tuning.cannonSpeed;
            b.x = endX - 11;
            b.ox = b.x;
            b.mode = "reflect-warning";
            b.timer = 0.65;
            this.stats.reflections++;
            this.emit("reflect", { x: b.x, y: b.y, player: b.owner });
          } else b.mode = "spent";
        } else if (c.mode !== "defeated" && swept(b, c, c.r + b.r)) {
          this.hitCore(b);
          b.mode = "spent";
        }
        if (b.x > W + 20 || b.x < 15 || b.life <= 0) {
          if (b.mode !== "spent") {
            this.stats.misses++;
            this.emit("miss", { x: clamp(b.x, 0, W), y: b.y });
          }
          b.mode = "spent";
        }
      }
      this.cannons = this.cannons.filter((b) => b.mode !== "spent");
    }
    step(actions = []) {
      if (this.outcome) return;
      this.tick++;
      this.time = this.tick * DT;
      this.applyTuning();
      if (this.status === "transition") {
        this.phaseTime += DT;
        if (actions.some((a) => a?.advance) || this.phaseTime > 5.2) this.advanceSector();
        return;
      }
      if (this.status === "collapse") {
        this.phaseTime += DT;
        if (this.phaseTime > 3) {
          if (this.sector === 2) {
            if (!this.endingAwarded) {
              this.endingAwarded = true;
              this.award("ending", 5000);
            }
            this.status = "victory";
            this.outcome = "victory";
            this.emit("victory", { score: this.score });
          } else {
            this.reserves = Math.min(8, this.reserves + 1);
            for (const p of this.players)
              if (!p.gone) {
                p.alive = true;
                p.respawn = -1;
                p.inv = 3;
              }
            this.status = "transition";
            this.phaseTime = 0;
            this.emit("transition", { sector: this.sector + 1 });
          }
        }
        return;
      }
      if (this.status !== "playing") return;
      this.sectorTime += DT;
      this.phaseTime += DT;
      if (this.chainTimer > 0) this.chainTimer -= DT;
      else this.chain = 1;
      for (const plate of this.plates)
        plate.offset =
          Math.sin((this.sectorTime * Math.PI * 2) / plate.period + plate.phase) * plate.amplitude;
      if (this.sector === 2) {
        const cycle = this.sectorTime % 24,
          offAt = 19;
        const warning = cycle >= 16 && cycle < offAt,
          active = !(cycle >= offAt && cycle < offAt + this.tuning.outage);
        if (warning && !this.refuge.warning) this.emit("refuge-warning");
        if (active !== this.refuge.active) this.emit(active ? "refuge-back" : "refuge-out");
        this.refuge.warning = warning;
        this.refuge.active = active;
        this.refuge.cycle = cycle;
      }
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.gone) continue;
        if (!p.alive) {
          if (p.respawn >= 0) {
            p.respawn -= DT;
            if (p.respawn <= 0) this.respawnPlayer(p);
          }
          continue;
        }
        this.movePlayer(p, actions[i] || G.blankAction());
      }
      this.updateCore();
      this.updatePursuers();
      this.updateProjectiles();
      if (this.status === "playing" && !this.players.some((p) => !p.gone && (p.alive || p.respawn >= 0))) {
        this.outcome = "defeat";
        this.status = "defeat";
        this.emit("defeat");
      }
    }
    advanceSector() {
      if (this.status === "transition") this.loadSector(this.sector + 1);
    }
    leave(id) {
      const p = this.players.find((p) => p.id === id);
      if (!p || p.gone) return;
      p.gone = true;
      p.alive = false;
      p.respawn = -1;
      this.emit("leave", { player: id });
    }
    snapshot() {
      return JSON.parse(
        JSON.stringify({
          seed: this.seed,
          rngState: this.rngState,
          tick: this.tick,
          time: this.time,
          sectorTime: this.sectorTime,
          sector: this.sector,
          phase: this.phase,
          status: this.status,
          phaseTime: this.phaseTime,
          outcome: this.outcome,
          score: this.score,
          chain: this.chain,
          reserves: this.reserves,
          difficulty: this.difficulty,
          practice: this.practice,
          demo: this.demo,
          tuning: this.tuning,
          players: this.players,
          cells: this.cells.map((c) => ({ ...c, ...this.cellPosition(c) })),
          plates: this.plates,
          refuge: this.refuge,
          core: this.core,
          bullets: this.bullets,
          cannons: this.cannons,
          pursuers: this.pursuers,
          stats: this.stats,
          lessons: this.lessons,
          breakdown: this.breakdown,
          eventId: this.eventId,
          events: this.events,
        }),
      );
    }
    hash() {
      const data = this.snapshot();
      delete data.events;
      let h = 2166136261;
      for (const c of JSON.stringify(data)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
      return h >>> 0;
    }
  }
  G.World = World;
})();
