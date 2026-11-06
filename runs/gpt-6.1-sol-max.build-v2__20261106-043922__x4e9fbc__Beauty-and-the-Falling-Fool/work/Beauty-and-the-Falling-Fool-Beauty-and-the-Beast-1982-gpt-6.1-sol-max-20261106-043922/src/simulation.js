/* The authoritative rules; no DOM, audio, rendering or wall-clock reads. */
(() => {
  const F = globalThis.FF,
    E = My3D2dge,
    { clamp, lerp } = E;
  F.DT = 1 / 120;
  F.neutral = () => ({
    x: 0,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
  });
  E.ACTIONS.ffWindow = {
    beats: [
      ['reach', 0.12],
      ['climb', 0.46],
      ['exit', 0.12],
    ],
    setup(A) {
      A.target = A.o.to;
    },
    at(A, beat, u) {
      const k = clamp(A.t / A.duration, 0, 1),
        x = lerp(A.start.x, A.target.x, Math.min(1, k * 5));
      return {
        x,
        y: 0,
        z: lerp(A.start.z, A.target.z, k),
        state: {
          climb: true,
          air: false,
          vz: Math.sign(A.target.z - A.start.z) * 55,
        },
      };
    },
  };
  F.windowState = (w, age, cfg, hard = false) => {
    const opening = w.opening ?? 0.65,
      closing = w.closing ?? 0.45,
      gap = w.gap ?? 1.3;
    const slotTime = opening + cfg.open + cfg.warning + closing + gap;
    const offset = w.offset + (hard ? 3 : 0),
      clock =
        (((age + offset) % (2 * slotTime)) + 2 * slotTime) % (2 * slotTime);
    const slot = Math.floor(clock / slotTime),
      expected = hard ? 1 - w.slot : w.slot,
      t = clock % slotTime;
    if (slot !== expected)
      return {
        phase: 'closed',
        remaining: slotTime - t,
        aperture: 0,
        usable: false,
      };
    const ends = [
      opening,
      opening + cfg.open,
      opening + cfg.open + cfg.warning,
      opening + cfg.open + cfg.warning + closing,
      slotTime,
    ];
    const i = ends.findIndex((e) => t < e),
      start = i ? ends[i - 1] : 0;
    const phase = ['opening', 'open', 'warning', 'closing', 'closed'][i];
    return {
      phase,
      remaining: ends[i] - t,
      aperture:
        i === 0
          ? t / opening
          : i === 1 || i === 2
            ? 1
            : i === 3
              ? 1 - (t - start) / closing
              : 0,
      usable: i === 1 || i === 2,
    };
  };
  F.makeMap = (s) => {
    const rows = Array.from({ length: 34 }, (_, r) =>
      Array.from({ length: 52 }, (_, c) => {
        const z = (33 - r) * 8,
          f = s.floors.find((f) => f.z - 8 === z);
        return f && c * 8 >= s.x0 && c * 8 < s.x1 ? '=' : ' ';
      }).join(''),
    );
    return new E.PlatformMap({
      rows,
      tile: 8,
      legend: { '=': 1 },
      types: { 1: { kind: 'oneway', style: 'stone', side: s.trim } },
      edges: 'open',
    });
  };
  F.makeBody = (x, z, cfg) =>
    new E.Platformer({
      x,
      y: 0,
      z,
      w: 9,
      h: 22,
      run: cfg.run,
      jump: cfg.jump,
      gravity: 1000,
      fallGravity: 1200,
      maxFall: 330,
      accel: 700,
      decel: 1100,
      airAccel: 500,
      cut: 0.48,
      coyote: 0.1,
      buffer: 0.14,
      onGround: true,
    });
  class World {
    constructor(o = {}) {
      this.cfg = { ...F.DEFAULTS, ...o.cfg };
      this.seed = o.seed ?? 1729;
      this.rng = o.rng || E.rng(this.seed);
      this.mode = o.mode || 'solo';
      this.hard = !!o.hard;
      this.unranked = !!o.attract;
      this.attract = !!o.attract;
      this.tick = 0;
      this.time = 0;
      this.section = 0;
      this.phase = 'playing';
      this.phaseTime = 0;
      this.score = 0;
      this.totals = {};
      this.chances = 3;
      this.ledger = new Set();
      this.events = [];
      this.eventSeq = 0;
      this.powerUntil = 0;
      this.rescued = false;
      this.continued = !!o.continued;
      this.hits = 0;
      this.departed = false;
      this.regroup = null;
      this.finaleBeat = 0;
      this.metrics = {
        jumps: 0,
        climbs: 0,
        holds: 0,
        reverses: 0,
        hearts: 0,
        smashes: 0,
        hits: 0,
        sections: 0,
        dodges: [],
        seen: [],
        behaviors: [],
        teamBonus: 0,
      };
      this.actors = (
        o.players || [{ id: 0, name: 'Buford', color: '#63e0d8' }]
      ).map((p, i) => ({
        ...p,
        seat: i,
        gone: false,
        body: null,
        traversal: null,
        tumble: 0,
        recovery: 0,
        jumpBuffer: 0,
        lastJump: 0,
        ack: 0,
        climbBuffer: 0,
      }));
      this.enter(0);
      this.checkpoint = this.saveCheckpoint();
    }
    get data() {
      return F.SECTIONS[this.section];
    }
    emit(type, data = {}) {
      const e = { id: ++this.eventSeq, type, tick: this.tick, ...data };
      this.events.push(e);
      if (this.events.length > 24) this.events.shift();
      return e;
    }
    award(id, n, kind) {
      if (this.ledger.has(id)) return false;
      this.ledger.add(id);
      this.score += n;
      this.totals[kind] = (this.totals[kind] || 0) + n;
      this.emit('score', { award: id, n, kind });
      return true;
    }
    enter(index) {
      this.section = index;
      this.sectionAge = 0;
      this.phaseTime = 0;
      this.phase = 'playing';
      this.map = F.makeMap(this.data);
      this.hazards = [];
      this.hearts = [];
      this.started = Array(this.data.floors.length).fill(null);
      this.started[0] = 0;
      this.spawned = new Set();
      this.regroup = null;
      this.powerUntil = 0;
      this.finaleBeat = 0;
      this.damageIncidents = new Map();
      for (const p of this.actors) {
        p.body = F.makeBody(this.data.spawn + p.seat * 14, 16, this.cfg);
        p.traversal = null;
        p.tumble = 0;
        p.recovery = 1.2;
        p.jumpBuffer = 0;
        p.climbBuffer = 0;
      }
      this.emit('section', { section: index });
    }
    floor(p) {
      return clamp(
        Math.round((p.body.z - 16) / 48),
        0,
        this.data.floors.length - 1,
      );
    }
    powered() {
      return this.powerUntil >= this.time && this.powerUntil > 0;
    }
    windows() {
      return this.data.windows.map((w) => ({
        ...w,
        ...F.windowState(w, this.sectionAge, this.cfg, this.hard),
      }));
    }
    usable(p, dir = 1) {
      const floor = this.floor(p) - (dir < 0 ? 1 : 0);
      return this.windows().filter((w) => w.floor === floor && w.usable);
    }
    startClimb(p, w, dir) {
      const b = p.body,
        start = dir > 0 ? w.z0 : w.z1;
      if (
        p.tumble > 0 ||
        p.traversal ||
        !w.usable ||
        !b.onGround ||
        Math.abs(b.z - start) > 2 ||
        Math.abs(b.x - w.x) > 13
      )
        return false;
      const target = dir > 0 ? w.z1 : w.z0;
      p.traversal = {
        id: w.id,
        from: start,
        to: target,
        u: 0,
        dir,
        action: new E.Action('ffWindow', {
          body: b,
          to: { x: w.x, z: target },
          speed: 0.7 / this.cfg.climbTime,
        }),
      };
      p.climbBuffer = 0;
      b.climbing = true;
      b.onGround = false;
      b.air = false;
      b.vx = 0;
      this.metrics.climbs++;
      this.emit('climb', { actor: p.id, window: w.id });
      return true;
    }
    moveActor(p, intent, dt) {
      if (p.gone) return;
      const b = p.body;
      p.prev = { x: b.x, z: b.z };
      p.recovery = Math.max(0, p.recovery - dt);
      if (p.tumble > 0) {
        p.tumble -= dt;
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.vz -= 600 * dt;
        if (p.tumble <= 0 && this.phase !== 'failed') {
          p.tumble = 0;
          p.body = F.makeBody(this.data.spawn + p.seat * 14, 16, this.cfg);
          p.recovery = 2;
          p.traversal = null;
          this.emit('recover', { actor: p.id });
        }
        return;
      }
      if (p.traversal) {
        const t = p.traversal,
          w = this.windows().find((w) => w.id === t.id);
        if (!w?.usable) {
          this.hurt(p, 'shutter', true);
          return;
        }
        const direction = intent.up ? 1 : intent.down ? -1 : 0;
        if (!direction) {
          if (!t.held) {
            this.metrics.holds++;
            t.held = true;
          }
        } else if (direction !== t.lastDir) {
          if (t.lastDir) this.metrics.reverses++;
          t.lastDir = direction;
        }
        const step = direction * t.dir * dt;
        t.action.t = clamp(t.action.t + step, 0, t.action.duration);
        t.action._apply(dt);
        t.u = t.action.u;
        b.vz = (direction * 48) / this.cfg.climbTime;
        b.climbing = true;
        b.onGround = false;
        if (t.u >= 1 || (t.u <= 0 && step < 0)) {
          b.z = t.u >= 1 ? t.to : t.from;
          b.x = w.x;
          b.vx = b.vz = 0;
          b.climbing = false;
          b.air = false;
          b.onGround = true;
          p.traversal = null;
          this.emit('ledge', { actor: p.id, floor: this.floor(p) });
        }
        return;
      }
      p.jumpBuffer = intent.jumpPressed ? 0.14 : Math.max(0, p.jumpBuffer - dt);
      let jumpRequest = p.jumpBuffer > 0;
      if (intent.up || intent.down) {
        const dir = intent.up ? 1 : -1,
          w = this.usable(p, dir).find((w) => Math.abs(w.x - b.x) < 13);
        if (w && this.startClimb(p, w, dir)) return;
      }
      b.run = this.cfg.run;
      b.jump = this.cfg.jump;
      // All locomotion, including jump cutting/coyote time, is native.
      b.update(dt, this.map, {
        x: clamp(intent.x || 0, -1, 1),
        jump: !!intent.jump,
        jumpPressed: jumpRequest,
        up: false,
        down: false,
      });
      if (b.jumped) {
        p.jumpBuffer = 0;
        this.metrics.jumps++;
        this.emit('jump', { actor: p.id });
      }
      if (b.landed) this.emit('land', { actor: p.id });
      if (b.z < -28 || b.x < this.data.x0 - 14 || b.x > this.data.x1 + 14)
        this.hurt(p, 'fall', true);
    }
    hurt(p, why, force = false, incident = null) {
      if (
        this.prediction ||
        p.gone ||
        p.tumble > 0 ||
        this.phase !== 'playing' ||
        (!force && (p.recovery > 0 || this.powered())) ||
        this.invulnerable ||
        this.attract
      )
        return false;
      if (
        !incident ||
        this.time - (this.damageIncidents.get(incident) ?? -100) > 0.2
      ) {
        this.chances = Math.max(0, this.chances - 1);
        if (incident) this.damageIncidents.set(incident, this.time);
      }
      this.hits++;
      this.metrics.hits++;
      this.sectionHits++;
      p.traversal?.action.cancel();
      p.traversal = null;
      p.tumble = 0.75;
      p.body.vx = p.body.facing * -22;
      p.body.vz = 72;
      p.body.climbing = false;
      p.body.onGround = false;
      this.emit('hit', { actor: p.id, why, x: p.body.x, z: p.body.z });
      if (!this.chances) {
        this.phase = 'failed';
        this.phaseTime = 0;
        this.emit('failed');
      }
      return true;
    }
    spawn(def, suffix = '') {
      const s = this.data,
        id = def.id + (suffix || '');
      if (this.hazards.some((h) => h.id === id && !h.dead)) return;
      const x = def.x ?? (def.dir < 0 ? s.x1 - 13 : s.x0 + 13),
        z = 16 + def.floor * 48;
      const h = {
        ...def,
        id,
        reward: def.id,
        x,
        z: z + (['bird', 'bat'].includes(def.kind) ? 30 : 0),
        baseZ: z,
        vx: def.speed * def.dir,
        age: 0,
        state: 'tell',
        tell: ['bat', 'bird'].includes(def.kind) ? 1.15 : 0.9,
        w: ['bird', 'bat'].includes(def.kind) ? 14 : 10,
        h: def.kind === 'rat' ? 7 : ['bird', 'bat'].includes(def.kind) ? 12 : 9,
        bounces: 0,
        dead: false,
        passed: [],
        expiry: 14,
      };
      this.hazards.push(h);
      this.emit('tell', { kind: h.kind, x: h.x, z: h.z });
    }
    schedule(dt) {
      const s = this.data;
      for (const p of this.actors.filter((p) => !p.gone && !p.tumble)) {
        const f = this.floor(p);
        if (this.started[f] === null) {
          this.started[f] = this.sectionAge;
          this.emit('lesson', {
            floor: f,
            text: s.lessons[Math.min(f, s.lessons.length - 1)],
          });
        }
        if (this.data.finale && f > this.finaleBeat) {
          this.finaleBeat = f;
          this.emit('retreat', { beat: f });
        }
      }
      for (const e of s.encounters) {
        const t = this.started[e.floor];
        if (t === null) continue;
        const key = e.id,
          delay = e.delay / this.cfg.cadence;
        if (this.sectionAge - t >= delay && !this.spawned.has(key)) {
          this.spawned.add(key);
          this.spawn(e);
        }
        // Bounded pressure repeats a taught pattern, never its reward.
        const n = Math.floor((this.sectionAge - t - delay) / 14);
        if (n > 0 && n <= 12 && !this.spawned.has(key + ':' + n)) {
          this.spawned.add(key + ':' + n);
          this.spawn(e, ':' + n);
        }
      }
      if (this.hard)
        for (let f = 0; f < s.lanes.length; f++) {
          const t = this.started[f],
            id = `${s.id}-hard-${f}`;
          if (t !== null && this.sectionAge - t > 5 && !this.spawned.has(id)) {
            this.spawned.add(id);
            this.spawn({
              id,
              kind: s.hard.extra,
              floor: f,
              dir: f % 2 ? 1 : -1,
              speed: 40,
            });
          }
        }
      for (const def of s.hearts) {
        const t = this.started[def.floor];
        if (t === null) continue;
        if (
          this.sectionAge - t > def.delay &&
          !this.spawned.has('offer-' + def.id) &&
          !this.hearts.some((h) => h.id === def.id) &&
          (!this.ledger.has(def.id) || this.data.finale)
        ) {
          this.spawned.add('offer-' + def.id);
          this.hearts.push({
            ...def,
            age: 0,
            x: s.goal,
            z: s.floors.at(-1).z + 25,
            fromX: s.goal - 27,
            fromZ: s.floors.at(-1).z + 25,
            taken: false,
          });
        }
      }
      if (this.data.finale && this.finaleBeat >= 2) {
        const highest = Math.max(
          ...this.actors.filter((p) => !p.gone).map((p) => this.floor(p)),
        );
        this.hearts = this.hearts.filter(
          (h) => h.taken || h.floor >= highest || h.age < 8,
        );
      }
      if (
        this.data.finale &&
        !this.powered() &&
        this.finaleBeat >= 2 &&
        !this.hearts.some((h) => !h.taken)
      ) {
        const p = this.actors.find((p) => !p.gone && !p.tumble),
          f = Math.max(2, Math.min(3, p ? this.floor(p) : 2));
        this.finalOffer = (this.finalOffer || 0) + dt;
        if (this.finalOffer > 2) {
          this.finalOffer = 0;
          this.hearts.push({
            id: 'roof-heart-0',
            floor: f,
            x: s.goal,
            z: 185,
            fromX: s.goal - 27,
            fromZ: 185,
            age: 0,
            pathTime: 1.8,
          });
        }
      }
    }
    updateHearts(dt) {
      for (const h of this.hearts) {
        if (h.taken) continue;
        h.age += dt;
        const u = clamp(h.age / h.pathTime, 0, 1),
          targetZ = 16 + h.floor * 48 + 10;
        h.x =
          lerp(
            h.fromX,
            h.xTarget ??
              (h.xTarget =
                this.data.windows.find(
                  (w) =>
                    w.floor === Math.min(h.floor, this.data.lanes.length - 1),
                )?.x || this.data.goal),
            u,
          ) +
          Math.sin(u * Math.PI) * 12;
        h.z = lerp(h.fromZ, targetZ, u) + Math.sin(u * Math.PI) * 10;
        for (const p of this.actors) {
          if (p.gone || p.tumble) continue;
          if (E.overlapBox(p.body, { x: h.x, z: h.z - 5, w: 15, h: 13 })) {
            h.taken = true;
            this.powerUntil = Math.max(
              this.powerUntil,
              this.time + this.cfg.heart,
            );
            this.award(h.id, 50, 'heart');
            this.metrics.hearts++;
            this.emit('heart', { x: h.x, z: h.z });
            break;
          }
        }
      }
      this.hearts = this.hearts.filter((h) => !h.taken || h.age < 20);
    }
    updateHazards(dt, { predict = false } = {}) {
      const additions = [];
      for (const h of this.hazards) {
        if (h.dead) {
          h.death = (h.death || 0) + dt;
          continue;
        }
        h.prev = { x: h.x, z: h.z };
        h.age += dt;
        if (h.state === 'tell') {
          if (h.age < h.tell) continue;
          h.state = 'active';
          this.emit('launch', { kind: h.kind });
          if (!this.metrics.seen.includes(h.kind))
            this.metrics.seen.push(h.kind);
        }
        const speed = this.cfg.hazardSpeed,
          elapsed = h.age - h.tell;
        if (h.kind === 'bird') {
          h.x += h.vx * dt * speed;
          const u = clamp(
            (h.x - this.data.x0) / (this.data.x1 - this.data.x0),
            0,
            1,
          );
          h.z = h.baseZ + 34 - 24 * Math.sin(u * Math.PI) ** 6;
        } else if (h.kind === 'bat') {
          const phase = elapsed % 3.4;
          if (phase < 0.8) {
            h.z = h.baseZ + 30 + (4 * phase) / 0.8;
            h.state = 'wind';
          } else {
            h.state = 'active';
            h.x += h.vx * dt * speed;
            h.z =
              h.baseZ +
              34 -
              26 * Math.sin(clamp((phase - 0.8) / 2.6, 0, 1) * Math.PI);
          }
        } else if (h.state === 'drop') {
          h.vz -= 600 * dt;
          h.z += h.vz * dt;
          h.x += h.vx * dt * 0.25 * speed;
          if (h.z <= h.baseZ) {
            h.z = h.baseZ;
            h.state = 'active';
            this.emit('impact', { x: h.x, z: h.z });
          }
        } else {
          h.x += h.vx * dt * speed;
        }
        if (h.kind === 'bumper' && h.state !== 'drop') {
          const ordered = [...this.data.bumpers].sort((a, b) => a.x - b.x);
          const bumper =
            !h.bounces && h.bumper
              ? this.data.bumpers.find((b) => b.id === h.bumper)
              : h.vx < 0
                ? ordered[0]
                : ordered.at(-1);
          const edge = bumper.x;
          if ((h.vx < 0 && h.x <= edge) || (h.vx > 0 && h.x >= edge)) {
            h.x = edge;
            h.bounces++;
            h.vx *= -1;
            if (bumper.behavior === 'reverse') {
              this.emit('bumper', { x: edge, z: h.z });
              this.behavior('reverse');
            } else if (h.floor > 0) {
              h.baseZ -= 48;
              h.floor--;
              h.z += 1;
              h.vz = 0;
              h.state = 'drop';
              this.emit('drop', { x: h.x, z: h.baseZ });
              this.behavior('drop');
            } else {
              h.dead = true;
              h.death = 1;
            }
          }
        }
        if (
          h.kind === 'split' &&
          !h.fragment &&
          ((h.vx > 0 && h.x >= h.breakX) || (h.vx < 0 && h.x <= h.breakX))
        ) {
          h.dead = true;
          h.death = 1;
          this.behavior('split');
          this.emit('split', { x: h.x, z: h.z });
          for (const dir of [-1, 1])
            additions.push({
              ...h,
              id: h.id + (dir < 0 ? '-a' : '-b'),
              reward: h.reward + (dir < 0 ? '-a' : '-b'),
              dead: false,
              death: 0,
              fragment: true,
              w: 6,
              h: 6,
              x: h.x + dir * 6,
              z: h.baseZ + 6,
              vx: dir * 65,
              age: h.tell + 0.01,
              expiry: 8,
            });
          continue;
        }
        for (const p of predict ? [] : this.actors) {
          if (p.gone || p.tumble) continue;
          const b = p.body,
            prev = p.prev || b;
          // Native box collision sampled across relative previous/current movement.
          const count = Math.max(
            1,
            Math.ceil(
              Math.max(
                Math.abs(h.x - h.prev.x - (b.x - prev.x)),
                Math.abs(h.z - h.prev.z - (b.z - prev.z)),
              ) / 4,
            ),
          );
          let contact = false;
          for (let i = 0; i <= count; i++) {
            const u = i / count;
            if (
              E.overlapBox(
                { ...b, x: lerp(prev.x, b.x, u), z: lerp(prev.z, b.z, u) },
                { ...h, x: lerp(h.prev.x, h.x, u), z: lerp(h.prev.z, h.z, u) },
              )
            ) {
              contact = true;
              break;
            }
          }
          if (contact) {
            if (this.powered()) {
              h.dead = true;
              h.death = 0;
              this.award(h.reward, 50, 'clear');
              this.metrics.smashes++;
              this.emit('smash', { kind: h.kind, x: h.x, z: h.z });
              break;
            }
            if (p.recovery <= 0 && h.state !== 'wind')
              this.hurt(p, h.kind, false, h.id);
          }
          if (
            !h.passed.includes(p.id) &&
            Math.abs(b.x - h.x) < 18 &&
            b.z > h.z + h.h + 1 &&
            Math.abs(b.z - h.baseZ) < 42
          ) {
            h.passed.push(p.id);
            if (!this.metrics.dodges.includes(h.kind))
              this.metrics.dodges.push(h.kind);
          }
        }
        if (
          h.x < this.data.x0 - 35 ||
          h.x > this.data.x1 + 35 ||
          h.age > h.expiry
        )
          (h.dead = true), (h.death = 1);
      }
      this.hazards.push(...additions);
      this.hazards = this.hazards.filter(
        (h) => !h.dead || (h.death || 0) < 0.45,
      );
    }
    behavior(name) {
      if (!this.metrics.behaviors.includes(name))
        this.metrics.behaviors.push(name);
    }
    saveCheckpoint() {
      return {
        v: 1,
        section: this.section,
        score: this.score,
        totals: { ...this.totals },
        ledger: [...this.ledger],
        hard: this.hard,
        chances: this.chances,
        seed: this.seed,
        continued: this.continued,
        metrics: JSON.parse(JSON.stringify(this.metrics)),
      };
    }
    restore(cp = this.checkpoint) {
      if (!F.validCheckpoint(cp)) return false;
      this.score = cp.score;
      this.totals = { ...(cp.totals || {}) };
      this.ledger = new Set(cp.ledger);
      this.chances = 3;
      this.continued = true;
      this.rescued = false;
      this.departed = false;
      this.metrics = JSON.parse(JSON.stringify(cp.metrics || this.metrics));
      this.enter(cp.section);
      this.sectionHits = 0;
      this.checkpoint = { ...cp };
      this.emit('continued');
      return true;
    }
    leave(id) {
      const p = this.actors.find((p) => p.id === id);
      if (p) {
        p.gone = true;
        p.traversal = null;
      }
      this.emit('leave', { actor: id });
    }
    step(intents = {}, dt = F.DT) {
      if (this.phase === 'ended') return;
      this.tick++;
      this.time += dt;
      this.phaseTime += dt;
      if (this.phase === 'failed' || this.phase === 'results') return;
      if (this.phase === 'transition') {
        if (this.phaseTime >= 3.8) {
          this.enter(this.section + 1);
          this.sectionHits = 0;
          this.checkpoint = this.saveCheckpoint();
          this.emit('checkpoint');
        }
        return;
      }
      if (this.phase === 'departure') {
        if (this.phaseTime >= 9) {
          this.phase = 'results';
          this.departed = true;
          this.emit('departed');
        }
        return;
      }
      this.sectionAge += dt;
      if (this.sectionHits === undefined) this.sectionHits = 0;
      for (const p of this.actors)
        this.moveActor(p, intents[p.id] || F.neutral(), dt);
      if (this.phase !== 'playing') return;
      this.schedule(dt);
      this.updateHearts(dt);
      this.updateHazards(dt);
      if (this.powerUntil > 0 && this.powerUntil < this.time) {
        this.powerUntil = 0;
        this.emit('expiry');
      }
      const live = this.actors.filter((p) => !p.gone),
        exitFloor = this.data.floors.length - 1;
      const atExit = (p) =>
        !p.tumble &&
        !p.traversal &&
        this.floor(p) === exitFloor &&
        Math.abs(p.body.x - this.data.goal) < (this.data.finale ? 7 : 21);
      const first = live.some(atExit);
      if (this.data.finale) {
        if (first && this.powered()) {
          this.rescued = true;
          this.award('rescue', 500, 'rescue');
          this.phase = 'departure';
          this.phaseTime = 0;
          this.emit('rescue');
        }
      } else if (first) {
        if (!this.regroup) {
          this.regroup = { until: this.time + 5 };
          this.emit('regroup');
        }
        if (live.every(atExit) || this.time >= this.regroup.until) {
          const together = live.length > 1 && live.every(atExit);
          this.award(this.data.id + '-pursuit', 100, 'pursuit');
          if (!this.sectionHits)
            this.award(this.data.id + '-clean', 75, 'clean');
          if (together) {
            this.award(this.data.id + '-team', 50, 'team');
            this.metrics.teamBonus++;
          }
          this.chances = Math.min(6, this.chances + 1);
          this.metrics.sections++;
          this.phase = 'transition';
          this.phaseTime = 0;
          this.emit('pursuit');
        }
      }
    }
    snapshot() {
      return {
        mode: this.mode,
        phase: this.phase,
        tick: this.tick,
        time: this.time,
        seed: this.seed,
        section: this.section,
        sectionAge: this.sectionAge,
        phaseTime: this.phaseTime,
        score: this.score,
        totals: { ...this.totals },
        chances: this.chances,
        ledger: [...this.ledger],
        powerUntil: this.powerUntil,
        checkpoint: JSON.parse(JSON.stringify(this.checkpoint)),
        regroup: this.regroup ? { ...this.regroup } : null,
        rescued: this.rescued,
        departed: this.departed,
        continued: this.continued,
        hard: this.hard,
        unranked: this.unranked,
        finaleBeat: this.finaleBeat,
        actors: this.actors.map((p) => ({
          id: p.id,
          name: p.name,
          seat: p.seat,
          color: p.color,
          gone: p.gone,
          x: p.body.x,
          y: 0,
          z: p.body.z,
          vx: p.body.vx,
          vz: p.body.vz,
          onGround: p.body.onGround,
          floor: this.floor(p),
          traversal: p.traversal
            ? { id: p.traversal.id, u: p.traversal.u, dir: p.traversal.dir }
            : null,
          tumble: p.tumble,
          recovery: p.recovery,
          powered: this.powered(),
          ack: p.ack,
        })),
        windows: this.windows(),
        hazards: this.hazards.map(({ prev, ...h }) => ({
          ...h,
          passed: [...(h.passed || [])],
        })),
        hearts: this.hearts.map((h) => ({ ...h })),
        events: this.events.map((e) => ({ ...e })),
        metrics: JSON.parse(JSON.stringify(this.metrics)),
      };
    }
  }
  F.validCheckpoint = (cp) =>
    !!cp &&
    cp.v === 1 &&
    Number.isInteger(cp.section) &&
    cp.section >= 0 &&
    cp.section < F.SECTIONS.length &&
    Number.isFinite(cp.score) &&
    cp.score >= 0 &&
    Array.isArray(cp.ledger) &&
    cp.ledger.length < 1000 &&
    cp.ledger.every((x) => typeof x === 'string') &&
    Number.isInteger(cp.seed) &&
    typeof cp.hard === 'boolean' &&
    (!cp.metrics ||
      (typeof cp.metrics === 'object' &&
        ['jumps', 'climbs', 'hearts', 'hits', 'smashes', 'sections'].every(
          (k) => Number.isFinite(cp.metrics[k]),
        ) &&
        ['seen', 'dodges', 'behaviors'].every(
          (k) =>
            Array.isArray(cp.metrics[k]) &&
            cp.metrics[k].every((s) => typeof s === 'string'),
        ))) &&
    (!cp.totals ||
      (typeof cp.totals === 'object' &&
        Object.values(cp.totals).every((v) => Number.isFinite(v) && v >= 0)));
  F.World = World;
  // A semantic route driver. It uses only the same normal intentions as humans.
  F.bot = (world, p, { collect = true } = {}) => {
    const b = p.body,
      s = world.data,
      f = world.floor(p),
      a = F.neutral();
    if (p.tumble || p.gone) return a;
    if (p.traversal) {
      a.up = true;
      const t = p.traversal,
        win = s.windows.find((w) => w.id === t.id);
      if (win && !world.powered() && t.u > 0.25 && t.u < 0.72) {
        const remaining = (1 - t.u) * world.cfg.climbTime;
        const threat = world.hazards.some(
          (h) =>
            !h.dead &&
            h.state !== 'tell' &&
            Math.abs(h.baseZ - win.z1) < 3 &&
            Math.abs(h.x + h.vx * (remaining + 0.2) - win.x) < 38,
        );
        if (threat) {
          const state = F.windowState(
            win,
            world.sectionAge,
            world.cfg,
            world.hard,
          );
          a.up = false;
          if (state.remaining < remaining + 0.65) a.down = true;
        }
      }
      return a;
    }
    const open = world.usable(p),
      future = s.windows.filter((w) => w.floor === f);
    let target =
      open.sort((w, v) => Math.abs(w.x - b.x) - Math.abs(v.x - b.x))[0] ||
      future[0];
    if (target) {
      const st = F.windowState(target, world.sectionAge, world.cfg, world.hard);
      if (st.usable && st.remaining < world.cfg.climbTime + 0.2)
        target = future.find((w) => w.id !== target.id) || target;
    }
    const heart =
      collect &&
      world.hearts.find(
        (h) => !h.taken && h.floor === f && h.age > h.pathTime * 0.7,
      );
    let tx = heart && !world.powered() ? heart.x : (target?.x ?? s.goal);
    if (world.data.finale && f === 3 && !world.powered())
      tx =
        world.hearts.find((h) => !h.taken)?.x ??
        s.windows.find((w) => w.floor === 2).x;
    const dx = tx - b.x;
    a.x = Math.abs(dx) > 3 ? Math.sign(dx) * Math.min(1, Math.abs(dx) / 20) : 0;
    if (Math.abs(dx) < 9 && !heart) a.up = true;
    if (Math.abs(dx) < 9 && world.powered()) a.up = true;
    let danger = world.hazards
      .filter(
        (h) =>
          !h.dead &&
          h.state !== 'tell' &&
          Math.abs(h.baseZ - b.z) < 7 &&
          h.kind !== 'bird' &&
          h.kind !== 'bat' &&
          h.vx * (b.x - h.x) > 0,
      )
      .sort((h, k) => Math.abs(h.x - b.x) - Math.abs(k.x - b.x))[0];
    if (
      danger &&
      !world.powered() &&
      b.onGround &&
      Math.abs(danger.x - b.x) < 38
    ) {
      a.jumpPressed = true;
      a.jump = true;
    }
    if (!b.onGround && b.vz > 0) a.jump = true;
    return a;
  };
})();
