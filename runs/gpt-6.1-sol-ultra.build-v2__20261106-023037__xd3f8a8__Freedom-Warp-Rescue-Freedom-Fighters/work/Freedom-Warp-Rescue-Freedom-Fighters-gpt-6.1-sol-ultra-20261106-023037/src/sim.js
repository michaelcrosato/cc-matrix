/* One deterministic authority. Native Bullets + swept contacts; rendering never mutates this world. */
(() => {
  "use strict";
  const F = globalThis.FWR,
    E = globalThis.My3D2dge;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const toward = (a, b, d) => (a < b ? Math.min(b, a + d) : Math.max(b, a - d));
  const hash = (s) => {
    let n = 2166136261;
    for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0 || 1;
  };
  function swept(x0, y0, x1, y1, x, y, r) {
    const dx = x1 - x0,
      dy = y1 - y0,
      den = dx * dx + dy * dy;
    const t = den ? clamp(((x - x0) * dx + (y - y0) * dy) / den, 0, 1) : 0;
    return Math.hypot(x0 + dx * t - x, y0 + dy * t - y) <= r ? t : null;
  }
  function boxHit(x0, y0, x1, y1, e, r = 0) {
    let lo = 0,
      hi = 1;
    for (const [a, d, mn, mx] of [
      [x0, x1 - x0, e.x - e.w / 2 - r, e.x + e.w / 2 + r],
      [y0, y1 - y0, e.y - e.h / 2 - r, e.y + e.h / 2 + r],
    ]) {
      if (Math.abs(d) < 1e-8) {
        if (a < mn || a > mx) return null;
      } else {
        let t0 = (mn - a) / d,
          t1 = (mx - a) / d;
        if (t0 > t1) [t0, t1] = [t1, t0];
        lo = Math.max(lo, t0);
        hi = Math.min(hi, t1);
        if (lo > hi) return null;
      }
    }
    return lo;
  }
  F.swept = swept;
  class World {
    constructor(seed = 1982, options = {}) {
      this.seed = seed;
      this.rngState = hash(seed);
      this.runId = options.runId || "fwr-" + hash(seed).toString(36);
      this.mode = options.mode === "evasion" ? "evasion" : "operation";
      this.config = F.validateConfig(options.config);
      this.tick = 0;
      this.time = 0;
      this.eventSeq = 0;
      this.nextId = 1;
      this.events = [];
      this.rescued = [];
      this.lost = [];
      this.score = 0;
      this.chain = 0;
      this.chainUntil = 0;
      this.replacements = 0;
      this.replacementCredits = 0;
      this.seats = ["local-1"];
      this.outcome = null;
      this.debugModified = false;
      this.attract = !!options.attract;
      this.dev = { invulnerable: false, collisions: false, ownership: false, timeScale: 1 };
      this.seenTypes = [];
      this.seenPatterns = [];
      this.seenPhases = [];
      this.burstCount = 0;
      this.hitCount = 0;
      this._shots = new E.Bullets(
        { particles: { sparks() {} } },
        { plane: "ground", sparks: false, max: 120 },
      );
      this.ship = {
        x: 230,
        y: 338,
        vx: 0,
        vy: 0,
        r: 15,
        aimX: 1,
        aimY: 0,
        hull: this.config.maxHull,
        energy: 100,
        drive: "ready",
        driveX: 1,
        driveY: 0,
        driveTimer: 0,
        invuln: 0,
        regenDelay: 0,
        fireCooldown: 0,
        burstHeld: false,
        previewX: 1,
        previewY: 0,
      };
      this.camera = { x: 600, y: 337.5 };
      this.sector = 0;
      this.enter(0, true);
      if (options.checkpoint) this.restoreCheckpoint(options.checkpoint);
    }
    get bullets() {
      return this._shots.list;
    }
    random() {
      let n = this.rngState;
      n ^= n << 13;
      n ^= n >>> 17;
      n ^= n << 5;
      this.rngState = n >>> 0;
      return this.rngState / 4294967296;
    }
    emit(type, x = this.ship.x, y = this.ship.y, data = {}) {
      const e = { id: ++this.eventSeq, type, x, y, t: this.time, ...data };
      this.events.push(e);
      if (this.events.length > 24) this.events.shift();
      return e;
    }
    radio(text, kind = "mission") {
      this.message = text;
      this.messageUntil = this.time + 6;
      this.emit("radio", this.ship.x, this.ship.y, { text, kind });
    }
    setSeats(ids) {
      const a = [
        ...new Set((ids || []).filter((x) => typeof x === "string" || typeof x === "number")),
      ].slice(0, 2);
      const seats = a.length ? a : ["server-neutral"];
      if (JSON.stringify(seats) !== JSON.stringify(this.seats)) {
        this.seats = seats;
        this.clearControls();
        this.emit("roles", this.ship.x, this.ship.y, { seats: this.seats });
      }
    }
    clearControls() {
      this.ship.burstHeld = false;
      this.ship.burstReleaseRequired = true;
      this.ship.fireCooldown = Math.max(0.08, this.ship.fireCooldown);
      if (this.ship.drive === "windup") {
        this.ship.drive = "ready";
        this.ship.driveTimer = 0;
      }
    }
    setConfig(key, value) {
      const old = this.config.maxHull;
      this.config = F.validateConfig({ ...this.config, [key]: value });
      if (key === "maxHull")
        this.ship.hull = clamp(this.ship.hull + this.config.maxHull - old, 0, this.config.maxHull);
      if (["enemyHealth", "bossHealth", "crystalHp"].includes(key))
        for (const e of this.entities) {
          const relevant =
            key === "crystalHp"
              ? e.type === "crystal"
              : key === "bossHealth"
                ? ["organ", "core"].includes(e.type)
                : ["layer", "guard", "interceptor", "mine"].includes(e.type);
          if (relevant) {
            const ratio = e.hp / e.maxHp;
            e.maxHp =
              key === "crystalHp"
                ? this.config.crystalHp
                : (e.baseHp || e.maxHp) * this.config[key];
            e.hp = Math.max(0.01, e.maxHp * ratio);
          }
        }
      this.debugModified = true;
    }
    resetConfig() {
      for (const [k, v] of Object.entries(F.DEFAULTS)) this.setConfig(k, v);
    }
    spawn(spec) {
      const hp =
        {
          crystal: this.config.crystalHp,
          layer: 7,
          interceptor: 3,
          guard: 8,
          organ: 20,
          core: 65,
          carrier: 999,
          mine: 1,
          beacon: 1,
        }[spec.type] || 1;
      const e = {
        id: this.sector + "-" + this.nextId++,
        type: spec.type,
        x: spec.x,
        y: spec.y,
        baseX: spec.x,
        baseY: spec.y,
        vx: 0,
        vy: 0,
        age: 0,
        r:
          {
            crystal: 21,
            layer: 34,
            interceptor: 24,
            guard: 33,
            organ: 35,
            core: 36,
            mine: 13,
            beacon: 50,
          }[spec.type] || 30,
        hp:
          hp *
          (spec.type === "organ" || spec.type === "core"
            ? this.config.bossHealth
            : spec.type === "crystal"
              ? 1
              : this.config.enemyHealth),
        state: spec.type === "mine" ? "deploying" : spec.type === "core" ? "shielded" : "warning",
        warning: this.config.enemyWarning,
        cycle: 0,
        layTimer: 2.2,
        shotTimer: 2.8,
        dead: false,
        ...spec,
      };
      e.baseHp = spec.hp ?? hp;
      e.hp =
        e.baseHp *
        (e.type === "organ" || e.type === "core"
          ? this.config.bossHealth
          : e.type === "crystal" || e.type === "beacon" || e.type === "carrier"
            ? 1
            : this.config.enemyHealth);
      e.maxHp = e.hp;
      if (e.type === "crystal" || e.type === "beacon" || e.type === "carrier") e.state = "intact";
      if (e.type === "crystal") {
        e.hp = this.config.crystalHp;
        e.maxHp = e.hp;
        e.drift = spec.drift ?? 14;
        e.offset = spec.offset ?? this.random() * 6.28;
      }
      this.entities.push(e);
      if (!this.seenTypes.includes(e.type)) this.seenTypes.push(e.type);
      if (e.pattern && !this.seenPatterns.includes(e.pattern)) this.seenPatterns.push(e.pattern);
      if (e.type !== "crystal" && e.type !== "beacon")
        this.emit("warning", e.x, e.y, { target: e.id, kind: e.type });
      return e;
    }
    enter(index, initial = false) {
      if (!initial && index !== this.sector) {
        for (const e of this.entities) {
          if (
            e.type === "crystal" &&
            !e.dead &&
            !this.rescued.includes(e.id) &&
            !this.lost.includes(e.id)
          ) {
            this.lost.push(e.id);
            this.chain = 0;
          }
        }
      }
      const checkpointOrigin = { nextId: this.nextId, rngState: this.rngState };
      this.sector = index;
      this.sectorTime = 0;
      this.entities = [];
      this._shots.clear();
      this.spawned = [];
      this.events = [];
      this.localRescued = 0;
      this.localLost = 0;
      this.keyKills = 0;
      this.replacementTimer = 0;
      this.replacementWave = 0;
      this.shroud = false;
      this.coreDestroyed = false;
      this.organsDestroyed = 0;
      this.bossReleased = false;
      this.phase = index === 3 ? "organs" : index === 4 ? "extract" : "rescue";
      this.seenPhases.push(index + ":" + this.phase);
      this.definition = F.CONTENT[index];
      this.length = this.mode === "evasion" ? 60000 : this.definition.length;
      this.quota = this.mode === "evasion" ? 0 : this.definition.quota;
      const s = this.ship;
      s.x = 230;
      s.y = 338;
      s.vx = 0;
      s.vy = 0;
      s.energy = 100;
      s.hull = this.config.maxHull;
      s.drive = "ready";
      s.driveTimer = 0;
      s.invuln = 1;
      s.regenDelay = 0;
      s.burstHeld = false;
      s.burstReleaseRequired = !(initial && this.tick === 0);
      s.fireCooldown = 0.2;
      this.camera = { x: 600, y: 337.5 };
      this.beacon = null;
      if (this.mode === "evasion") {
        this.phase = "evasion";
        this.evasionSpawn = 0;
        this.evasionRescue = 0;
        this.evasionSurvivalTick = 0;
        this.radio(
          "EVASION • Cannon offline. Rescue and survive for three minutes. Hyperspace remains online.",
        );
        this.spawn({ type: "crystal", x: 650, y: 338 });
      } else {
        this.radio(this.definition.briefing);
        this.beacon = this.spawn({ type: "beacon", x: this.length - 180, y: 338, state: "locked" });
        this.spawnContent();
      }
      this.updateObjective();
      if (!initial || index === 0) {
        this.captureCheckpoint();
        Object.assign(this.checkpoint, checkpointOrigin);
      }
      this.emit("sector", 230, 338, { sector: index, name: this.definition.name });
    }
    spawnContent() {
      const threshold = this.ship.x + 1050;
      this.definition.spawns.forEach((s, i) => {
        if (!this.spawned.includes(i) && s.x <= threshold) {
          this.spawned.push(i);
          this.spawn(s);
        }
      });
    }
    formation(owner, pattern = owner.pattern || "curtain") {
      owner.cycle++;
      const x = owner.x,
        y = owner.y;
      let points = [];
      if (pattern === "curtain") {
        const gap = clamp(owner.baseY < 338 ? 440 : 230, 180, 500);
        for (let yy = 110; yy <= 570; yy += 58)
          if (Math.abs(yy - gap) > 85) points.push([x - 165, yy]);
      } else if (pattern === "ring") {
        const cx = x - 160,
          cy = 338;
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          if (Math.cos(a) < -0.7) continue;
          points.push([cx + Math.cos(a) * 165, cy + Math.sin(a) * 165]);
        }
      } else {
        for (let i = 0; i < 7; i++)
          points.push([
            x - 100 - i * 45,
            clamp(y + Math.sin(i * 0.46) * 130 * (y > 338 ? -1 : 1), 100, 575),
          ]);
      }
      for (const [mx, my] of points) {
        // Every mine begins harmless, and no formation is laid within the rescue collar.
        if (
          dist({ x: mx, y: my }, this.ship) < 105 ||
          this.entities.some(
            (e) => e.type === "crystal" && !e.dead && dist(e, { x: mx, y: my }) < 85,
          )
        )
          continue;
        if (
          this.entities.filter((e) => e.type === "mine" && !e.dead && e.owner === owner.id)
            .length >= 20
        )
          break;
        this.spawn({
          type: "mine",
          x: mx,
          y: my,
          owner: owner.id,
          pattern,
          state: "deploying",
          warning: 0,
          armDelay: this.config.mineArm + 0.25,
        });
      }
      this.emit("lay", x, y, { owner: owner.id, pattern });
    }
    collapse(owner) {
      let n = 0;
      for (const m of this.entities)
        if (m.type === "mine" && m.owner === owner.id && !m.dead && m.state !== "disarmed") {
          m.state = "disarmed";
          m.disarmAt = m.age;
          m.vx = 0;
          m.vy = 0;
          n++;
        }
      this.emit("collapse", owner.x, owner.y, { owner: owner.id, count: n });
      if (n && this.sector === 0)
        this.radio("Pulsar destroyed. Its entire minefield is collapsing. The route is clear.");
    }
    kill(e, by = "laser") {
      if (e.dead) return;
      e.dead = true;
      if (e.type === "crystal") {
        if (this.rescued.includes(e.id) || this.lost.includes(e.id)) return;
        this.lost.push(e.id);
        this.localLost++;
        this.chain = 0;
        this.emit("lost", e.x, e.y, { target: e.id });
        this.radio(
          "Crystal lost. Hold your fire near survivors. Replacement signal inbound.",
          "warning",
        );
        return;
      }
      if (e.type === "layer" || e.type === "organ") {
        this.collapse(e);
        if (e.key) this.keyKills++;
      }
      if (e.type === "organ") this.organsDestroyed++;
      if (e.type === "core") {
        this.coreDestroyed = true;
        this.phase = "extract";
        this.seenPhases.push("3:extract");
        for (const m of this.entities)
          if (m.type === "mine") {
            m.state = "disarmed";
            m.disarmAt = m.age;
          }
        const carrier = this.entities.find((q) => q.type === "carrier");
        if (carrier) {
          carrier.state = "dying";
          carrier.solid = false;
          carrier.deathTime = this.time;
        }
        this.radio("Core disabled. Take the open route past the carrier. Evacuation is ahead.");
      }
      if (e.type === "mine") {
        const owner = this.entities.find((q) => q.id === e.owner);
        if (by === "laser" && owner && (owner.mineScore || 0) < 4) {
          owner.mineScore = (owner.mineScore || 0) + 1;
          this.score++;
        }
      } else if (e.type !== "carrier") this.score += 5;
      this.emit(e.type === "mine" ? "mineHit" : "explosion", e.x, e.y, {
        target: e.id,
        kind: e.type,
      });
    }
    rescue(e) {
      if (e.dead || this.rescued.includes(e.id) || this.lost.includes(e.id)) return;
      e.dead = true;
      this.rescued.push(e.id);
      this.localRescued++;
      this.chain = this.time <= this.chainUntil ? Math.min(4, this.chain + 1) : 1;
      this.chainUntil = this.time + 24;
      // Replacement credits satisfy the mission, but carry no chain/rank advantage.
      const points = 20 * (e.replacement ? 1 : 1 + (this.chain - 1) * 0.25);
      this.score += points;
      if (e.replacement) this.replacementCredits++;
      this.emit("rescue", e.x, e.y, {
        target: e.id,
        points,
        chain: this.chain,
        shipX: this.ship.x,
        shipY: this.ship.y,
      });
      this.radio(
        this.sector === 0 && this.localRescued === 1
          ? "Survivor secured. Fire at the marked Pulsar. Its mines share its pulse."
          : [
              "Survivor secured. Keep a clear approach.",
              "Signal aboard. One more light brought home.",
              "Rescue confirmed. We have them.",
            ][this.rescued.length % 3],
        "rescue",
      );
    }
    damage(source) {
      const s = this.ship;
      if (s.invuln > 0 || this.dev.invulnerable || this.attract) return false;
      s.hull = Math.max(0, s.hull - 1);
      s.invuln = this.config.damageGrace;
      this.hitCount++;
      this.chain = 0;
      this.emit("damage", s.x, s.y, { source: source?.id, hull: s.hull });
      return true;
    }
    fireBullet(x, y, ax, ay, team = "player", extra = {}) {
      const speed = team === "player" ? 880 : 145 * this.pressure();
      const b = this._shots.fire({
        id: "b" + this.nextId++,
        x,
        y,
        vx: ax * speed,
        vy: ay * speed,
        r: team === "player" ? 3 : 6,
        life: team === "player" ? 1.5 : 6,
        team,
        dmg: this.config.bulletDamage,
        ...extra,
      });
      return b;
    }
    safeLine(ax, ay, range = 950) {
      return !this.entities.some(
        (e) =>
          e.type === "crystal" &&
          !e.dead &&
          swept(
            this.ship.x,
            this.ship.y,
            this.ship.x + ax * range,
            this.ship.y + ay * range,
            e.x,
            e.y,
            e.r + 9,
          ) !== null,
      );
    }
    assistedAim(ax, ay, cone = this.config.aimAssist) {
      let target = null,
        best = cone;
      for (const e of this.entities)
        if (
          !e.dead &&
          ["layer", "interceptor", "guard", "organ", "core", "mine"].includes(e.type) &&
          e.state !== "shielded" &&
          dist(e, this.ship) < 850
        ) {
          const dx = e.x - this.ship.x,
            dy = e.y - this.ship.y,
            n = Math.hypot(dx, dy),
            d = Math.acos(clamp((dx * ax + dy * ay) / n, -1, 1));
          if (d < best && this.safeLine(dx / n, dy / n, n)) {
            target = { ax: dx / n, ay: dy / n };
            best = d;
          }
        }
      return target || { ax, ay };
    }
    flight(actions, dt) {
      const s = this.ship,
        c = this.config;
      s.invuln = Math.max(0, s.invuln - dt);
      s.fireCooldown -= dt;
      s.regenDelay = Math.max(0, s.regenDelay - dt);
      if (!s.regenDelay) s.energy = Math.min(100, s.energy + c.energyRegen * dt);
      if (Math.hypot(actions.ax, actions.ay) > 0.12) {
        const n = Math.hypot(actions.ax, actions.ay);
        s.aimX = actions.ax / n;
        s.aimY = actions.ay / n;
      }
      let dx = actions.dx,
        dy = actions.dy,
        n = Math.hypot(dx, dy);
      if (n < 0.15) {
        dx = s.aimX;
        dy = s.aimY;
      } else {
        dx /= n;
        dy /= n;
      }
      s.previewX = dx;
      s.previewY = dy;
      if (!actions.burst) s.burstReleaseRequired = false;
      const fresh = actions.burst && !s.burstHeld && !s.burstReleaseRequired;
      s.burstHeld = actions.burst;
      if (fresh && s.drive === "ready") {
        if (s.energy >= c.warpCost) {
          s.energy -= c.warpCost;
          s.regenDelay = 1.1;
          s.drive = "windup";
          s.driveTimer = 0.16;
          s.driveX = dx;
          s.driveY = dy;
          this.emit("warpPreview", s.x, s.y);
        } else this.emit("warpDenied", s.x, s.y);
      }
      if (s.drive !== "ready") {
        s.driveTimer -= dt;
        if (s.driveTimer <= 0) {
          if (s.drive === "windup") {
            s.drive = "burst";
            s.driveTimer = c.warpDuration;
            this.burstCount++;
            this.emit("warp", s.x, s.y, { dx: s.driveX, dy: s.driveY });
          } else if (s.drive === "burst") {
            s.drive = "recovery";
            s.driveTimer = 0.22;
            s.vx = s.driveX * c.shipSpeed;
            s.vy = s.driveY * c.shipSpeed;
          } else s.drive = "ready";
        }
      }
      if (s.drive === "burst") {
        s.vx = s.driveX * c.warpSpeed;
        s.vy = s.driveY * c.warpSpeed;
      } else {
        const rate = Math.hypot(actions.mx, actions.my) > 0.05 ? c.acceleration : c.braking;
        s.vx = toward(s.vx, actions.mx * c.shipSpeed, rate * dt);
        s.vy = toward(s.vy, actions.my * c.shipSpeed, rate * dt);
      }
      const x0 = s.x,
        y0 = s.y;
      s.x = clamp(s.x + s.vx * dt, 55, this.length - 65);
      s.y = clamp(s.y + s.vy * dt, 88, 588);
      // Rescue is resolved before all damage. Rescued shells cease participating immediately.
      for (const e of this.entities)
        if (
          e.type === "crystal" &&
          !e.dead &&
          swept(x0, y0, s.x, s.y, e.x, e.y, c.rescueRadius) !== null
        )
          this.rescue(e);
      for (const e of this.entities) {
        if (
          e.dead ||
          e.type === "crystal" ||
          e.type === "beacon" ||
          e.state === "warning" ||
          e.state === "disarmed" ||
          (e.type === "core" && e.state === "shielded")
        )
          continue;
        if (e.type === "mine" && e.state !== "active") continue;
        let hit =
          e.type === "carrier"
            ? e.state !== "dying" && boxHit(x0, y0, s.x, s.y, e, s.r)
            : swept(x0, y0, s.x, s.y, e.x, e.y, e.r + s.r);
        if (hit !== null && hit !== false) {
          this.damage(e);
          if (e.type === "mine") this.kill(e, "contact");
          if (e.type === "carrier") {
            s.x = x0;
            s.y = y0;
            s.vx = 0;
            s.vy = 0;
            if (s.drive === "burst") {
              s.drive = "recovery";
              s.driveTimer = 0.22;
            }
          }
        }
      }
      if (actions.fire && s.fireCooldown <= 0 && this.weaponsOnline()) {
        const aim = this.assistedAim(s.aimX, s.aimY);
        this.fireBullet(s.x + aim.ax * 27, s.y + aim.ay * 27, aim.ax, aim.ay);
        s.fireCooldown = 1 / c.fireRate;
        this.emit("cannon", s.x, s.y, { ax: aim.ax, ay: aim.ay });
      }
    }
    weaponsOnline() {
      return this.mode !== "evasion" && !this.shroud;
    }
    pressure() {
      return this.config.pressure * (1 + Math.min(0.65, this.score / 1200));
    }
    enemies(dt) {
      const s = this.ship;
      for (const e of this.entities) {
        if (e.dead) continue;
        e.age += dt;
        if (e.type === "crystal") {
          e.x =
            e.baseX + Math.sin(e.age * 0.23 + e.offset) * (e.tutorial ? 12 : e.intercept ? 95 : 65);
          e.y = clamp(e.baseY + Math.sin(e.age * 0.38 + e.offset) * (e.tutorial ? 8 : 25), 95, 580);
          continue;
        }
        if (e.type === "beacon" || e.type === "carrier") continue;
        if (e.type === "mine") {
          if (e.state === "disarmed") {
            if (e.age - e.disarmAt > 1.1) e.dead = true;
            continue;
          }
          if (e.age < 0.25) e.state = "deploying";
          else if (e.age < e.armDelay) e.state = "arming";
          else {
            if (e.state !== "active") this.emit("armed", e.x, e.y, { target: e.id });
            e.state = "active";
          }
          if (e.pattern === "ring" && e.state === "active") {
            e.x = e.baseX + Math.sin(e.age * 0.55) * 18;
            e.y = e.baseY + Math.cos(e.age * 0.45) * 12;
          }
          if (Math.abs(e.x - s.x) > 1700 && e.age > 25) e.dead = true;
          continue;
        }
        if (e.state === "warning") {
          if (e.age < e.warning) continue;
          e.state = "active";
          if (["layer", "organ"].includes(e.type)) this.formation(e);
        }
        if (e.type === "layer") {
          e.x = e.baseX + Math.sin(e.age * 0.5) * 65;
          e.y = e.baseY + Math.sin(e.age * 0.7) * 27;
          if (dist(e, s) < 1050) {
            e.layTimer -= dt;
            if (e.layTimer <= 0) {
              this.formation(e);
              e.layTimer = 8 / this.pressure();
            }
          }
        } else if (e.type === "organ") {
          if (this.phase === "organs" && dist(e, s) < 1100) {
            e.layTimer -= dt;
            if (e.layTimer <= 0) {
              this.formation(e);
              e.layTimer = 7;
            }
          }
        } else if (e.type === "interceptor") {
          e.x = e.baseX + Math.sin(e.age * 0.5) * 150;
          e.y = clamp(e.baseY + Math.sin(e.age * 0.9) * 80, 105, 565);
        } else if (e.type === "guard") {
          e.y = e.baseY + Math.sin(e.age * 0.6) * 30;
          e.shield = e.age % 5 < 2.6;
        } else if (e.type === "core") {
          e.state = this.phase === "core" ? "active" : "shielded";
        }
        if (
          ["interceptor", "guard", "core"].includes(e.type) &&
          e.state !== "shielded" &&
          dist(e, s) < 950
        ) {
          e.shotTimer -= dt;
          e.aiming = e.shotTimer < 0.85;
          if (e.shotTimer <= 0) {
            const angle = Math.atan2(s.y - e.y, s.x - e.x);
            const pattern = E.pattern.spread(
              angle,
              e.type === "core" ? 3 : 1,
              0.35,
              145 * this.pressure(),
            );
            for (const [vx, vy] of pattern)
              this.fireBullet(e.x, e.y, Math.cos(angle), Math.sin(angle), "enemy", {
                vx,
                vy,
                owner: e.id,
              });
            this.emit("enemyFire", e.x, e.y, { target: e.id });
            e.shotTimer = e.type === "core" ? 2.6 : 3.7 / this.pressure();
          }
        }
      }
    }
    combat(dt) {
      for (const b of this.bullets) {
        b.px = b.x;
        b.py = b.y;
      }
      this._shots.update(dt);
      for (const b of this.bullets) {
        if (b.dead) continue;
        if (b.team === "enemy") {
          if (swept(b.px, b.py, b.x, b.y, this.ship.x, this.ship.y, this.ship.r + b.r) !== null) {
            this.damage(b);
            b.dead = true;
          }
          continue;
        }
        let first = null,
          at = 2;
        for (const e of this.entities) {
          if (
            e.dead ||
            e.type === "beacon" ||
            e.state === "warning" ||
            e.state === "disarmed" ||
            (e.type === "carrier" && e.state === "dying")
          )
            continue;
          const t =
            e.type === "carrier"
              ? boxHit(b.px, b.py, b.x, b.y, e, b.r)
              : swept(b.px, b.py, b.x, b.y, e.x, e.y, e.r + b.r);
          if (t !== null && t < at) {
            first = e;
            at = t;
          }
        }
        if (first) {
          b.dead = true;
          if (
            first.type === "carrier" ||
            (first.type === "core" && first.state === "shielded") ||
            (first.type === "guard" && first.shield)
          ) {
            this.emit("shield", first.x, first.y, { target: first.id });
            continue;
          }
          first.hp -= b.dmg;
          if (first.type === "crystal") {
            first.state = "cracked";
            this.chain = 0;
            this.emit("crystalWarning", first.x, first.y, { target: first.id, hp: first.hp });
            if (this.time - (this.lastCrystalWarning || -10) > 2) {
              this.radio("Fragile crystal! Release the cannon before contact.", "warning");
              this.lastCrystalWarning = this.time;
            }
          } else this.emit("hit", first.x, first.y, { target: first.id, kind: first.type });
          if (first.hp <= 0) this.kill(first);
        }
      }
      this._shots.list = this.bullets.filter((b) => !b.dead);
      this.entities = this.entities.filter((e) => !e.dead);
    }
    replacement(dt = F.STEP) {
      const available = this.entities.filter(
        (e) => e.type === "crystal" && !e.dead && !e.optional,
      ).length;
      const pending =
        this.mode === "evasion"
          ? 0
          : this.definition.spawns.filter(
              (e, i) => e.type === "crystal" && !e.optional && !this.spawned.includes(i),
            ).length;
      if (
        this.localRescued + available + pending >= this.quota ||
        this.phase === "organs" ||
        this.mode === "evasion"
      )
        return;
      if (!this.replacementTimer) this.replacementTimer = 3;
      this.replacementTimer -= dt;
      if (this.replacementTimer <= 0) {
        const needed = this.quota - this.localRescued - available - pending;
        for (let i = 0; i < needed; i++)
          this.spawn({
            type: "crystal",
            x: clamp(this.ship.x + 350 + i * 100, 100, this.length - 350),
            y: 180 + i * 125,
            replacement: true,
          });
        this.replacements++;
        this.replacementWave++;
        this.replacementTimer = 0;
        this.radio(
          "Replacement group on approach. Rescue credit restored; final rank reduced.",
          "warning",
        );
      }
    }
    director(dt) {
      const s = this.ship;
      if (this.mode === "evasion") {
        const survival = Math.floor(this.time);
        if (survival > (this.evasionSurvivalTick || 0)) {
          this.score += survival - (this.evasionSurvivalTick || 0);
          this.evasionSurvivalTick = survival;
        }
        this.evasionSpawn -= dt;
        this.evasionRescue -= dt;
        if (this.evasionSpawn <= 0) {
          const patterns = F.FORMATIONS;
          this.spawn({
            type: "layer",
            x: clamp(s.x + 680, 800, this.length - 500),
            y: this.random() > 0.5 ? 165 : 505,
            pattern: patterns[Math.floor(this.time / 14) % 3],
          });
          this.evasionSpawn = Math.max(4.2, 8.5 - this.time / 60);
        }
        if (this.evasionRescue <= 0) {
          this.spawn({
            type: "crystal",
            x: clamp(s.x + 560, 500, this.length - 500),
            y: 170 + this.random() * 340,
          });
          this.evasionRescue = 14;
        }
        this.entities = this.entities.filter((e) => e.type === "crystal" || e.x > s.x - 1400);
        if (this.time >= 180) this.finish(true, "evasion-extracted");
      } else {
        this.spawnContent();
        const old = this.shroud;
        this.shroud =
          !!this.definition.shroud &&
          s.x >= this.definition.shroud[0] &&
          s.x < this.definition.shroud[1];
        if (old !== this.shroud)
          this.radio(
            this.shroud
              ? "ION SHROUD • Cannon offline. Steer through the gaps."
              : "Shroud cleared. Cannon restored.",
            "system",
          );
        if (this.sector === 3) {
          if (this.phase === "organs" && this.organsDestroyed >= 2) {
            this.phase = "prisoners";
            this.seenPhases.push("3:prisoners");
            this.bossReleased = true;
            for (const [i, y] of [160, 338, 520].entries())
              this.spawn({ type: "crystal", x: 4900 - i * 130, y, offset: i * 2 });
            this.radio("Prison bays open. Rescue all three before attacking the core. Hold fire.");
          }
          if (this.phase === "prisoners" && this.localRescued >= 3) {
            this.phase = "core";
            this.seenPhases.push("3:core");
            this.radio("Three aboard. Core exposed. Finish the carrier.");
          }
        }
        this.replacement(dt);
        const clear =
          this.localRescued >= this.quota &&
          this.keyKills >= this.definition.kills &&
          (this.sector !== 0 || this.burstCount > 0) &&
          (this.sector !== 3 || this.coreDestroyed);
        if (this.beacon) {
          if (clear && this.beacon.state !== "active") {
            this.beacon.state = "active";
            this.radio(
              this.sector === 4
                ? "Evacuation gate aligned. Make the final hyperspace run."
                : "Route secure. Reach the evacuation beacon.",
            );
          }
          if (clear && dist(s, this.beacon) < 72) {
            if (this.sector === 4) this.finish(true, "operation-extracted");
            else {
              this.score += this.sector === 3 ? 100 : 10;
              this.enter(this.sector + 1);
              return;
            }
          }
        }
      }
      this.updateObjective();
      // A reached extraction gate wins a simultaneous terminal tick; all other hull depletion fails.
      if (!this.outcome && s.hull <= 0) this.finish(false, "hull-depleted");
    }
    updateObjective() {
      let text,
        target = null;
      if (this.mode === "evasion")
        text = "Survive " + Math.max(0, 180 - this.time).toFixed(0) + "s · cannon offline";
      else if (this.sector === 3 && this.phase === "organs") {
        text = "Disable field organs · " + this.organsDestroyed + "/2";
        target = this.entities.find((e) => e.type === "organ" && !e.dead);
      } else if (this.sector === 3 && this.phase === "core") {
        text = "Disable the exposed core";
        target = this.entities.find((e) => e.type === "core" && !e.dead);
      } else if (this.sector === 0 && this.localRescued >= 1 && this.keyKills < 1) {
        text = "Fire at the marked Pulsar · collapse its field";
        target =
          this.entities.find((e) => e.key && !e.dead) || this.definition.spawns.find((e) => e.key);
      } else if (this.localRescued < this.quota) {
        text = "Rescue signals · " + this.localRescued + "/" + this.quota;
        target = this.entities
          .filter((e) => e.type === "crystal" && !e.dead)
          .sort((a, b) => dist(a, this.ship) - dist(b, this.ship))[0];
        if (!target) {
          const next = this.definition.spawns.find(
            (e, i) => e.type === "crystal" && !this.spawned.includes(i),
          );
          if (next) target = next;
        }
      } else if (this.keyKills < this.definition.kills) {
        text = "Destroy marked Pulsars · " + this.keyKills + "/" + this.definition.kills;
        target = this.entities.find((e) => e.key && !e.dead);
        if (!target)
          target = this.definition.spawns.find((e, i) => e.key && !this.spawned.includes(i));
      } else if (this.sector === 0 && !this.burstCount) {
        text = "Commit hyperspace · release, then press again";
        target = { x: this.ship.x + 400, y: this.ship.y };
      } else {
        text =
          this.sector === 4 ? "Hyperspace to the evacuation gate" : "Reach the evacuation beacon";
        target = this.beacon;
      }
      this.objective = {
        text,
        quota: this.quota,
        rescued: this.localRescued,
        keyKills: this.keyKills,
        target: target ? { x: target.x, y: target.y, id: target.id, type: target.type } : null,
      };
    }
    finish(won, reason) {
      if (this.outcome) return false;
      if (won && this.mode === "operation") this.score += 200;
      this.outcome = {
        won: !!won,
        reason,
        score: Math.round(this.score),
        rescued: this.rescued.length,
        lost: this.lost.length,
        rank: won
          ? this.replacements
            ? "RELIEF CREW"
            : this.lost.length === 0
              ? "STARKEEPER"
              : "RESCUE COMMANDER"
          : "SIGNAL LOST",
        time: this.time,
        replacements: this.replacements,
      };
      this.phase = won ? "victory" : "failure";
      this._shots.clear();
      this.clearControls();
      this.emit(won ? "victory" : "failure");
      return true;
    }
    resolveTimeUp() {
      this.finish(this.mode === "evasion" && this.time >= 179.9, "round-clock");
    }
    step(inputs = {}, dt = F.STEP) {
      if (this.outcome) return;
      dt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : F.STEP;
      this.tick++;
      this.time += dt;
      this.sectorTime += dt;
      this.enemies(dt);
      this.flight(F.resolveRoles(this.seats, inputs), dt);
      this.combat(dt);
      this.director(dt);
      if (this.time > this.chainUntil) this.chain = 0;
      this.camera.x = clamp(this.ship.x + 260, 600, this.length - 600);
      this.camera.y = 337.5;
    }
    captureCheckpoint() {
      this.checkpoint = {
        version: 1,
        seed: this.seed,
        mode: this.mode,
        sector: this.sector,
        score: this.score,
        rescued: [...this.rescued],
        lost: [...this.lost],
        nextId: this.nextId,
        time: this.time,
        replacements: this.replacements,
        burstCount: this.burstCount,
        rngState: this.rngState,
      };
      return copy(this.checkpoint);
    }
    restoreCheckpoint(c = this.checkpoint) {
      if (
        !c ||
        c.version !== 1 ||
        c.seed !== this.seed ||
        !Number.isInteger(c.sector) ||
        c.sector < 0 ||
        c.sector > 4
      )
        return false;
      const baseline = copy(c);
      this.score = Number.isFinite(c.score) ? c.score : 0;
      this.rescued = Array.isArray(c.rescued) ? [...c.rescued] : [];
      this.lost = Array.isArray(c.lost) ? [...c.lost] : [];
      this.nextId = Math.max(1, c.nextId || 1);
      this.time = c.time || 0;
      this.replacements = c.replacements || 0;
      this.burstCount = c.burstCount || 0;
      this.rngState = c.rngState || hash(this.seed);
      this.outcome = null;
      this.chain = 0;
      this.chainUntil = 0;
      this.enter(c.sector, true);
      this.ship.burstReleaseRequired = true;
      this.checkpoint = baseline;
      return true;
    }
    snapshot() {
      const keys = [
        "seed",
        "rngState",
        "runId",
        "mode",
        "config",
        "tick",
        "time",
        "eventSeq",
        "nextId",
        "events",
        "rescued",
        "lost",
        "score",
        "chain",
        "chainUntil",
        "replacements",
        "replacementCredits",
        "seats",
        "outcome",
        "debugModified",
        "attract",
        "dev",
        "seenTypes",
        "seenPatterns",
        "seenPhases",
        "burstCount",
        "hitCount",
        "ship",
        "camera",
        "sector",
        "sectorTime",
        "entities",
        "spawned",
        "localRescued",
        "localLost",
        "keyKills",
        "replacementTimer",
        "replacementWave",
        "shroud",
        "coreDestroyed",
        "organsDestroyed",
        "bossReleased",
        "phase",
        "length",
        "quota",
        "message",
        "messageUntil",
        "evasionSpawn",
        "evasionRescue",
        "evasionSurvivalTick",
        "objective",
        "checkpoint",
      ];
      const s = {};
      for (const k of keys) if (this[k] !== undefined) s[k] = this[k];
      s.bullets = this.bullets;
      return copy(s);
    }
    loadSnapshot(s) {
      if (!s || !s.ship || !Number.isInteger(s.sector) || !Array.isArray(s.entities)) return false;
      const v = copy(s);
      delete v.definition;
      const bullets = v.bullets;
      delete v.bullets;
      Object.assign(this, v);
      this.definition = F.CONTENT[this.sector];
      this._shots.list = bullets || [];
      this.beacon = this.entities.find((e) => e.type === "beacon") || null;
      return true;
    }
    fixture(name, data = {}) {
      this.debugModified = true;
      if (name === "empty") {
        this.entities = [];
        this._shots.clear();
        this.spawned = this.definition.spawns.map((_, i) => i);
        this.beacon = null;
      } else if (name === "sector") this.enter(clamp(Math.round(data.sector || 0), 0, 4));
      else if (name === "spawn") return this.spawn(data);
      else if (name === "ship") Object.assign(this.ship, data);
      else if (name === "refill") {
        this.ship.energy = 100;
        this.ship.hull = this.config.maxHull;
      } else if (name === "invulnerable") this.dev.invulnerable = !!data.on;
      else throw new Error("Unknown fixture " + name);
    }
  }
  F.World = World;
})();
