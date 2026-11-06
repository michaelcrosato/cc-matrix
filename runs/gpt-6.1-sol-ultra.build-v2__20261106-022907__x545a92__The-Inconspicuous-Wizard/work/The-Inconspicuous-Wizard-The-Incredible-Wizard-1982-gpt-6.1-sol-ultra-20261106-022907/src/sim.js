/* Authoritative, deterministic simulation. No renderer, input device or wall clock required. */
(function (G) {
  'use strict';
  const { ROOMS, W, H } = G.WizardRooms;
  const DIRS = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ],
    EPS = 1e-7;
  const DEFAULTS = {
    playerSpeed: 4,
    boltSpeed: 12,
    fireInterval: 0.17,
    hopperSpeed: 1.05,
    stalkerSpeed: 1.45,
    skitterSpeed: 2.05,
    pressureGrowth: 0.002,
    pressureCap: 1.28,
    spawnSpacing: 1.1,
    familiarSpeed: 2.45,
    wizardTeleport: 5.1,
    wizardAttack: 1.65,
    wizardWarning: 1.35,
    respawnProtection: 1.25,
    revealRadius: 3,
    revealDuration: 1.25,
    lureRadius: 5,
    lureDuration: 1.5,
    postCooldown: 5,
  };
  const DIFFICULTIES = {
    gentle: { lives: 5, speed: 0.76, warnings: 1.4 },
    normal: { lives: 3, speed: 1, warnings: 1 },
    fierce: { lives: 3, speed: 1.2, warnings: 0.82 },
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const validDir = (d) => Number.isInteger(d) && d >= 0 && d < 4;
  const cellKey = (x, y) => `${x},${y}`;
  function cardinal(a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 0 : 2) : dy >= 0 ? 1 : 3;
  }
  function cellToWorld(n) {
    return (n + 0.5) * 16;
  }
  function worldToCell(n) {
    return n / 16 - 0.5;
  }
  function walkable(room, x, y) {
    return (
      x >= 0 &&
      x < W &&
      y >= 0 &&
      y < H &&
      room.rows[y][x] !== '#' &&
      room.rows[y][x] !== 'B'
    );
  }
  function tileOpen(room, x, y) {
    return x >= 0 && x < W && y >= 0 && y < H && room.rows[y][x] !== '#';
  }
  function path(room, from, to, max = 999) {
    const sx = Math.round(from.x),
      sy = Math.round(from.y),
      tx = Math.round(to.x),
      ty = Math.round(to.y);
    if (sx === tx && sy === ty) return [];
    const q = [[sx, sy]],
      seen = new Map([[cellKey(sx, sy), null]]);
    let qi = 0,
      found = false;
    while (qi < q.length && qi < max * W * H) {
      const [x, y] = q[qi++];
      for (let d = 0; d < 4; d++) {
        const [nx, ny] = [x + DIRS[d][0], y + DIRS[d][1]],
          k = cellKey(nx, ny);
        if (seen.has(k) || !walkable(room, nx, ny)) continue;
        seen.set(k, [x, y, d]);
        q.push([nx, ny]);
        if (nx === tx && ny === ty) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) return null;
    const out = [];
    let x = tx,
      y = ty;
    while (x !== sx || y !== sy) {
      const p = seen.get(cellKey(x, y));
      out.push(p[2]);
      x = p[0];
      y = p[1];
    }
    return out.reverse();
  }
  function lineClear(room, a, b, tolerance = 0.22) {
    if (Math.abs(a.x - b.x) > tolerance && Math.abs(a.y - b.y) > tolerance)
      return false;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      n = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 5));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(a.x + (dx * i) / n),
        y = Math.round(a.y + (dy * i) / n);
      if (!tileOpen(room, x, y)) return false;
    }
    return true;
  }
  function rayDistance(a, b, dir, radius = 0.35) {
    const [dx, dy] = DIRS[dir];
    const along = (b.x - a.x) * dx + (b.y - a.y) * dy;
    const cross = Math.abs((b.x - a.x) * dy - (b.y - a.y) * dx);
    if (cross > radius || along < -radius) return Infinity;
    return Math.max(
      0,
      along - Math.sqrt(Math.max(0, radius * radius - cross * cross)),
    );
  }
  class Sim {
    constructor({
      difficulty = 'normal',
      seats = 1,
      seed = 0x51e110,
      attract = false,
      assistance = false,
    } = {}) {
      this.s = {
        version: 1,
        seed: seed >>> 0,
        rng: seed >>> 0 || 1,
        difficulty: DIFFICULTIES[difficulty] ? difficulty : 'normal',
        seats: Math.min(2, Math.max(1, seats)),
        activeSeats: Array.from(
          { length: Math.min(2, Math.max(1, seats)) },
          (_, i) => i,
        ),
        tick: 0,
        time: 0,
        roomTime: 0,
        phaseTime: 0,
        roomIndex: 0,
        phase: 'entry',
        score: 0,
        currentMultiplier: 1,
        earnedNextMultiplier: 1,
        practice: false,
        attract,
        assistance,
        players: [],
        enemies: [],
        bolts: [],
        posts: [],
        wizard: null,
        familiar: null,
        pending: [],
        events: [],
        eventSeq: 0,
        nextId: 1,
        tuning: { ...DEFAULTS },
        pressure: 1,
        invulnerable: false,
        timeScale: 1,
        stats: {
          kills: 0,
          shots: 0,
          bells: 0,
          portals: 0,
          cloaked: 0,
          familiars: 0,
          escaped: 0,
          wizardHits: 0,
          rooms: 0,
          damage: 0,
          activeSeconds: 0,
        },
        roomKills: 0,
        wizardStage: 0,
        message: '',
        hint: '',
        noise: [],
      };
      for (let seat = 0; seat < this.s.seats; seat++)
        this.s.players.push({
          id: `p${seat}`,
          seat,
          x: seat ? 17 : 1,
          y: 11,
          face: 3,
          lives: this.difficulty.lives,
          alive: true,
          protect: 1.25,
          respawnAt: 0,
          boltId: null,
          lastFire: -1e3,
          wanted: -1,
          bufferUntil: 0,
          moving: false,
          tx: 0,
          ty: 0,
          moveDir: 3,
          recoil: 0,
          hurt: 0,
          stats: { kills: 0, shots: 0, bells: 0 },
        });
      this.enterRoom(0);
    }
    get room() {
      return ROOMS[this.s.roomIndex];
    }
    get difficulty() {
      return DIFFICULTIES[this.s.difficulty];
    }
    rand() {
      let x = this.s.rng;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      this.s.rng = x >>> 0;
      return (this.s.rng >>> 0) / 4294967296;
    }
    id(prefix) {
      return `${prefix}${this.s.nextId++}`;
    }
    event(type, x = 0, y = 0, extra = {}) {
      const e = { id: ++this.s.eventSeq, type, x, y, t: this.s.time, ...extra };
      this.s.events.push(e);
      if (this.s.events.length > 24) this.s.events.shift();
      return e;
    }
    setPhase(phase, message) {
      this.s.phase = phase;
      this.s.phaseTime = 0;
      if (message) this.s.message = message;
      this.event('phase', 0, 0, { phase, message: this.s.message });
    }
    enterRoom(index) {
      const s = this.s;
      s.roomIndex = Math.max(0, Math.min(5, index));
      s.roomTime = 0;
      s.phaseTime = 0;
      s.phase = 'entry';
      s.roomKills = 0;
      s.wizardStage = 0;
      s.enemies = [];
      s.bolts = [];
      s.familiar = null;
      s.wizard = null;
      s.noise = [];
      s.pending = this.room.spawns.map((x, i) => ({
        ...clone(x),
        id: `q${i}`,
        at: x.after === 0 ? x.delay : null,
        status: 'waiting',
      }));
      s.posts = this.room.posts.map(([x, y], i) => ({
        id: `post${i}`,
        x,
        y,
        cooldown: 0,
        ring: 0,
      }));
      s.pressure = 1;
      s.message = this.room.intro;
      s.hint = this.room.hint;
      s.earnedNextMultiplier = 1;
      for (const p of s.players) {
        p.x = p.seat ? 17 : 1;
        p.y = 11;
        p.face = 3;
        p.moving = false;
        p.wanted = -1;
        p.bufferUntil = 0;
        p.boltId = null;
        p.protect = s.tuning.respawnProtection;
        p.respawnAt = 0;
        p.alive = p.lives > 0;
        p.portalLock = null;
        p.recoil = 0;
        p.hurt = 0;
      }
      this.event('room', 9, 6, { roomIndex: s.roomIndex });
      this.checkpoint = clone(s);
    }
    snapshot({ network = false } = {}) {
      const state = clone(this.s);
      if (network) {
        state.events = state.events.slice(-12);
        state.noise = [];
      }
      return state;
    }
    save() {
      return {
        version: 1,
        state: this.snapshot(),
        checkpoint: clone(this.checkpoint),
      };
    }
    load(data) {
      if (data?.version !== 1) throw Error('Unsupported simulation snapshot');
      const wrapped = data.state ? data : null;
      this.s = clone(wrapped ? wrapped.state : data);
      if (wrapped?.checkpoint) this.checkpoint = clone(wrapped.checkpoint);
      return this;
    }
    retry() {
      const cp = clone(this.checkpoint);
      if (!cp) return;
      this.s = cp;
      this.s.practice = true;
      this.s.phase = 'entry';
      this.s.phaseTime = 0;
      this.s.timeScale = 1;
      this.s.invulnerable = false;
      this.s.bolts = [];
      this.s.message = 'A borrowed lantern. A practice descent.';
      for (const p of this.s.players) {
        p.lives = Math.max(3, p.lives);
        p.alive = true;
        p.boltId = null;
        p.protect = this.s.tuning.respawnProtection;
      }
      this.event('retry');
    }
    nextRoom() {
      const s = this.s;
      if (s.phase !== 'clear') return false;
      s.currentMultiplier = s.earnedNextMultiplier;
      if (s.roomIndex >= 5) {
        this.victory();
        return true;
      }
      if (s.roomIndex === 2 || s.roomIndex === 4) {
        for (const p of s.players) {
          p.lives = Math.min(
            Math.max(4, this.difficulty.lives),
            Math.max(1, p.lives) + 1,
          );
          p.alive = true;
        }
        this.event('recovery');
      }
      for (const p of s.players)
        if (p.lives <= 0) {
          p.lives = 1;
          p.alive = true;
        }
      s.stats.rooms++;
      this.enterRoom(s.roomIndex + 1);
      return true;
    }
    removeSeat(seat) {
      const s = this.s;
      const p = s.players.find((p) => p.seat === seat);
      if (p) this.clearBolt(p);
      s.players = s.players.filter((p) => p.seat !== seat);
      s.activeSeats = s.activeSeats.filter((i) => i !== seat);
      if (s.players.length && s.players.every((p) => p.lives <= 0))
        this.setPhase('defeat', 'The lanterns have gone out.');
      this.event('leave', 0, 0, { seat });
    }
    clearBolt(p) {
      if (p.boltId)
        this.s.bolts = this.s.bolts.filter((b) => b.id !== p.boltId);
      p.boltId = null;
    }
    clear() {
      this.s.bolts = [];
      for (const p of this.s.players) p.boltId = null;
      this.setPhase(
        'clear',
        `CHAMBER SEALED · Next chamber ${this.s.earnedNextMultiplier}×`,
      );
      this.event('clear', 9, 6, { multiplier: this.s.earnedNextMultiplier });
    }
    victory() {
      const s = this.s;
      if (s.phase === 'victory') return;
      s.score += 1000 * s.earnedNextMultiplier;
      s.stats.rooms = 6;
      s.bounty = 1000 * s.earnedNextMultiplier;
      s.bolts = [];
      s.enemies = [];
      s.wizard = null;
      for (const p of s.players) {
        p.boltId = null;
        p.alive = p.lives > 0;
      }
      this.setPhase(
        'victory',
        `THE DUNGEON EXHALES. Exit bounty: ${s.bounty.toLocaleString()}.`,
      );
      this.event('victory', 9, 6, { bounty: s.bounty });
    }
    startFamiliar() {
      const s = this.s;
      s.enemies = [];
      s.pending = [];
      const [x, y] = this.room.familiarStart;
      s.familiar = {
        id: this.id('f'),
        x,
        y,
        face: 2,
        warning: 1.1 * this.difficulty.warnings,
        moving: false,
        goal: this.room.familiarSide ? 18 : 0,
        portalLock: null,
        visible: true,
        state: 'warning',
      };
      this.setPhase(
        'familiar',
        s.roomIndex === 5
          ? 'THE LAST FAMILIAR · Exit bounty 1,000 × your earned bonus!'
          : 'FAMILIAR LOOSE! Cover the glowing escape gate for a next-room bonus.',
      );
      this.event('familiar', x, y, { side: this.room.familiarSide });
    }
    finishFamiliar(caught, owner) {
      const s = this.s,
        f = s.familiar;
      if (!f) return;
      if (caught) {
        this.award(200, owner);
        s.earnedNextMultiplier = Math.min(4, s.earnedNextMultiplier * 2);
        s.stats.familiars++;
        this.event('familiar-hit', f.x, f.y, {
          owner,
          multiplier: s.earnedNextMultiplier,
        });
      } else {
        s.stats.escaped++;
        this.event('familiar-escape', f.x, f.y);
      }
      s.familiar = null;
      if (this.room.wizard) this.startWizard();
      else this.clear();
    }
    startWizard() {
      this.s.familiar = null;
      this.s.wizardStage = 0;
      this.s.wizardRelocations = 0;
      this.setPhase(
        'intrusion',
        '“WHO SAID YOU COULD TOUCH MY BELLS?” Read the rune. One shot silences a boast.',
      );
      this.placeWizard();
    }
    placeWizard() {
      const s = this.s,
        players = s.players.filter((p) => p.alive);
      const p = players[
        Math.floor(this.rand() * Math.max(1, players.length))
      ] || { x: 1, y: 11 };
      const candidates = [];
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const a = { x, y };
          if (!walkable(this.room, x, y) || players.some((p) => dist(p, a) < 3))
            continue;
          const los = lineClear(
            this.room,
            a,
            { x: Math.round(p.x), y: Math.round(p.y) },
            0.2,
          );
          candidates.push({
            x,
            y,
            weight: (los ? 0 : 8) + Math.abs(dist(p, a) - 6),
          });
        }
      candidates.sort((a, b) => a.weight - b.weight);
      const c = candidates[
        Math.min(
          candidates.length - 1,
          Math.floor(this.rand() * Math.min(5, candidates.length)),
        )
      ] || { x: 9, y: 1 };
      const relocations = s.wizardRelocations || 0;
      s.wizardRelocations = relocations + 1;
      s.wizard = {
        id: this.id('w'),
        x: c.x,
        y: c.y,
        face: cardinal(c, p),
        state: 'warning',
        vulnerable: relocations > 0,
        relocations,
        warning:
          s.tuning.wizardWarning * this.difficulty.warnings +
          (s.roomIndex === 1 ? 0.35 : 0),
        stage: s.wizardStage,
        cast: relocations ? Math.min(0.8, s.tuning.wizardAttack) : 0.55,
        teleportIn: relocations
          ? s.tuning.wizardTeleport * (s.wizardStage === 2 ? 0.7 : 1)
          : 1.05,
        volleys: 0,
      };
      this.event('wizard-rune', c.x, c.y, { stage: s.wizardStage });
    }
    hitWizard(owner) {
      const s = this.s,
        w = s.wizard;
      if (!w || w.state !== 'active' || !w.vulnerable) return;
      s.stats.wizardHits++;
      this.award(500, owner);
      this.event('wizard-hit', w.x, w.y, { stage: s.wizardStage });
      s.wizardStage++;
      s.wizardRelocations = 0;
      s.wizard = null;
      s.bolts = s.bolts.filter((b) => !b.hostile);
      if (s.wizardStage >= this.room.wizard) {
        s.earnedNextMultiplier = Math.min(4, s.earnedNextMultiplier * 2);
        this.event('wizard-banish', w.x, w.y, {
          multiplier: s.earnedNextMultiplier,
        });
        if (s.roomIndex === 5) this.victory();
        else this.clear();
      } else {
        s.message =
          ['', '', '“THAT WAS MERELY MY SECOND OPINION!”'][s.wizardStage] ||
          '“A LUCKY SHOT. ALLOW ME A DIFFERENT ARGUMENT.”';
        s.wizardBreak = 1.5;
      }
    }
    award(base, owner) {
      this.s.score += base * this.s.currentMultiplier;
      const p = this.s.players.find((p) => p.id === owner);
      if (p) p.stats.kills++;
    }
    spawn(type, x, y, warning = 0.8) {
      if (!['hopper', 'stalker', 'skitter'].includes(type)) return;
      const e = {
        id: this.id('e'),
        type,
        x,
        y,
        face: 1,
        moveDir: 1,
        moving: false,
        visible: type === 'hopper',
        state: 'warning',
        warning: warning * this.difficulty.warnings,
        spawnAt: this.s.time,
        activeAt: this.s.time + warning * this.difficulty.warnings,
        lureUntil: 0,
        revealUntil: 0,
        lureX: x,
        lureY: y,
        memory: null,
        patrol: null,
        thinkAt: 0,
        flankAt: 0,
        flankUntil: 0,
        flankTarget: null,
        commitDir: -1,
        commitUntil: 0,
        phase: this.rand() * 6.28,
      };
      this.s.enemies.push(e);
      this.event('spawn', x, y, { type });
      return e;
    }
    killEnemy(e, owner) {
      if (e.dead) return;
      e.dead = true;
      this.s.roomKills++;
      this.s.stats.kills++;
      this.award(
        e.type === 'hopper' ? 50 : e.type === 'stalker' ? 100 : 150,
        owner,
      );
      this.event('enemy-hit', e.x, e.y, { type: e.type, owner });
    }
    ring(post, owner) {
      const s = this.s;
      if (post.cooldown > 0) return;
      post.cooldown = s.tuning.postCooldown;
      post.ring = s.tuning.revealDuration;
      s.stats.bells++;
      const p = s.players.find((p) => p.id === owner);
      if (p) p.stats.bells++;
      this.event('bell', post.x, post.y, { radius: s.tuning.revealRadius });
      for (const e of s.enemies) {
        if (e.dead || e.state === 'warning') continue;
        const near = dist(e, post) <= s.tuning.revealRadius;
        if (near)
          e.revealUntil = Math.max(
            e.revealUntil,
            s.time + s.tuning.revealDuration,
          );
        const goal = this.adjacentFloor(post, e);
        const route = path(this.room, e, goal);
        if (route && route.length <= s.tuning.lureRadius) {
          e.lureUntil = s.time + s.tuning.lureDuration;
          e.lureX = goal.x;
          e.lureY = goal.y;
          e.state = 'lured';
        }
      }
    }
    adjacentFloor(post, actor) {
      let best = null,
        score = 1e9;
      for (const [dx, dy] of DIRS) {
        const p = { x: post.x + dx, y: post.y + dy };
        if (!walkable(this.room, p.x, p.y)) continue;
        const r = path(this.room, actor, p);
        if (r && r.length < score) {
          score = r.length;
          best = p;
        }
      }
      return best || { x: post.x, y: post.y };
    }
    damage(p, cause) {
      const s = this.s;
      if (!p.alive || p.protect > 0 || s.invulnerable || s.attract) return;
      p.lives = Math.max(0, p.lives - 1);
      p.alive = false;
      p.hurt = 0.5;
      p.respawnAt = s.time + 0.8;
      p.moving = false;
      p.wanted = -1;
      this.clearBolt(p);
      s.stats.damage++;
      this.event('life-lost', p.x, p.y, {
        seat: p.seat,
        lives: p.lives,
        cause,
      });
      if (s.players.every((q) => q.lives <= 0))
        this.setPhase(
          'defeat',
          'THE LANTERNS GO QUIET. He is trying not to look pleased.',
        );
    }
    respawn(p) {
      const s = this.s;
      p.x = p.seat ? 17 : 1;
      p.y = 11;
      p.alive = true;
      p.moving = false;
      p.protect = s.tuning.respawnProtection;
      p.boltId = null;
      p.wanted = -1;
      p.portalLock = null;
      for (const e of s.enemies)
        if (dist(e, p) < 3) {
          const spot = this.farFloor(p);
          e.x = spot.x;
          e.y = spot.y;
          e.moving = false;
          e.warning = Math.max(0.6, e.warning);
          e.state = 'warning';
        }
      s.bolts = s.bolts.filter((b) => !b.hostile || dist(b, p) > 3);
      this.event('respawn', p.x, p.y, { seat: p.seat });
    }
    farFloor(p) {
      let best = { x: 9, y: 1 },
        bestD = -1;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const d = Math.hypot(x - p.x, y - p.y);
          if (walkable(this.room, x, y) && d > bestD) {
            bestD = d;
            best = { x, y };
          }
        }
      return best;
    }
    move(a, speed, dt, want, fallback = true) {
      const resolver = typeof want === 'function' ? want : null;
      let left = speed * dt,
        guard = 0;
      while (left > EPS && guard++ < 20) {
        if (!a.moving) {
          const requested = resolver ? resolver(a) : want;
          const d =
            validDir(requested) &&
            walkable(
              this.room,
              Math.round(a.x) + DIRS[requested][0],
              Math.round(a.y) + DIRS[requested][1],
            )
              ? requested
              : fallback &&
                  validDir(a.moveDir) &&
                  validDir(requested) &&
                  walkable(
                    this.room,
                    Math.round(a.x) + DIRS[a.moveDir][0],
                    Math.round(a.y) + DIRS[a.moveDir][1],
                  )
                ? a.moveDir
                : -1;
          if (d < 0) break;
          a.x = Math.round(a.x);
          a.y = Math.round(a.y);
          a.moveDir = d;
          a.tx = a.x + DIRS[d][0];
          a.ty = a.y + DIRS[d][1];
          a.moving = true;
        }
        const d = Math.hypot(a.tx - a.x, a.ty - a.y),
          n = Math.min(left, d);
        if (d > EPS) {
          a.x += ((a.tx - a.x) / d) * n;
          a.y += ((a.ty - a.y) / d) * n;
        }
        left -= n;
        if (d <= n + EPS) {
          a.x = a.tx;
          a.y = a.ty;
          a.moving = false;
        } else break;
      }
    }
    portal(a, kind) {
      if (a.portalLock) {
        if (Math.abs(a.x - a.portalLock.x) > 1.3 || Math.abs(a.y - 6) > 1.3)
          a.portalLock = null;
        else return;
      }
      if (Math.abs(a.y - 6) > 0.25 || (a.x > 0.1 && a.x < 17.9)) return;
      const s = this.s;
      if (kind === 'familiar') {
        this.finishFamiliar(false);
        return;
      }
      const destination = a.x < 1 ? 17 : 1;
      a.x = destination;
      a.y = 6;
      a.moving = false;
      a.portalLock = { x: destination, until: s.time + 0.5 };
      if (kind === 'player') {
        a.protect = Math.max(a.protect, 0.4);
        s.stats.portals++;
      }
      this.event('portal', destination, 6, { actor: a.id });
    }
    fire(p) {
      const s = this.s;
      if (!p.alive || s.time - p.lastFire < s.tuning.fireInterval) return;
      if (p.boltId) {
        if (!p.blockedAt || s.time - p.blockedAt > 0.4) {
          this.event('blocked', p.x, p.y, { seat: p.seat });
          p.blockedAt = s.time;
        }
        return;
      }
      p.lastFire = s.time;
      p.recoil = 0.18;
      p.stats.shots++;
      s.stats.shots++;
      const id = this.id('b'),
        [dx, dy] = DIRS[p.face];
      s.bolts.push({
        id,
        owner: p.id,
        x: p.x + dx * 0.34,
        y: p.y + dy * 0.34,
        dir: p.face,
        hostile: false,
      });
      p.boltId = id;
      this.event('fire', p.x, p.y, { seat: p.seat, dir: p.face });
      s.noise.push({ x: p.x, y: p.y, t: s.time });
      if (s.noise.length > 6) s.noise.shift();
    }
    updatePlayers(dt, commands) {
      const s = this.s;
      for (const p of s.players) {
        p.recoil = Math.max(0, p.recoil - dt);
        p.hurt = Math.max(0, p.hurt - dt);
        p.protect = Math.max(0, p.protect - dt);
        if (!p.alive) {
          if (p.lives > 0 && s.time >= p.respawnAt) this.respawn(p);
          continue;
        }
        const c = commands[p.seat] || {};
        if (validDir(c.move)) {
          p.wanted = c.move;
          p.bufferUntil = s.time + 0.13;
        } else if (s.time > p.bufferUntil) p.wanted = -1;
        const desired = s.time <= p.bufferUntil ? p.wanted : -1;
        this.move(p, s.tuning.playerSpeed, dt, desired, true);
        if (validDir(c.aim)) p.face = c.aim;
        else if (p.moving) p.face = p.moveDir;
        if (c.fire) this.fire(p);
        this.portal(p, 'player');
      }
    }
    updateEnemies(dt) {
      const s = this.s;
      const players = s.players.filter((p) => p.alive);
      for (const e of s.enemies) {
        if (e.dead) continue;
        e.warning = Math.max(0, e.warning - dt);
        if (e.warning > 0) {
          e.state = 'warning';
          e.visible = true;
          continue;
        }
        if (e.state === 'warning') {
          e.state = 'hunt';
          e.activeAt = s.time + 0.08;
        }
        e.phase += dt;
        let target = null;
        if (s.time < e.lureUntil) {
          target = { x: e.lureX, y: e.lureY };
          e.state = 'lured';
        } else {
          e.state = 'hunt';
          const visiblePlayers = players.filter((p) =>
            lineClear(this.room, e, p),
          );
          if (visiblePlayers.length) {
            visiblePlayers.sort((a, b) => dist(a, e) - dist(b, e));
            e.memory = {
              x: Math.round(visiblePlayers[0].x),
              y: Math.round(visiblePlayers[0].y),
              until: s.time + 2.3,
            };
            if (e.type === 'stalker' && s.time >= e.flankAt) {
              const facing = cardinal(e, e.memory),
                side = this.rand() < 0.5 ? (facing + 1) % 4 : (facing + 3) % 4,
                goal = {
                  x: e.memory.x + DIRS[side][0] * 2,
                  y: e.memory.y + DIRS[side][1] * 2,
                };
              if (walkable(this.room, goal.x, goal.y)) {
                e.flankTarget = goal;
                e.flankUntil = s.time + 1.35;
              }
              e.flankAt = s.time + 3 + this.rand() * 2;
            }
          }
          if (e.memory && e.memory.until > s.time) {
            target = e.memory;
            if (
              e.type === 'stalker' &&
              s.time < e.flankUntil &&
              e.flankTarget
            ) {
              target = e.flankTarget;
              e.state = 'flank';
            }
          } else {
            const noise = s.noise.findLast(
              (n) => s.time - n.t < 1.2 && dist(e, n) < 6,
            );
            if (noise)
              target = { x: Math.round(noise.x), y: Math.round(noise.y) };
          }
        }
        const decide = () => {
          let want = -1;
          if (target) {
            const route = path(this.room, e, target);
            if (route?.length) want = route[0];
          }
          if (want < 0) {
            if (
              !e.patrol ||
              s.time > e.thinkAt ||
              (Math.round(e.x) === e.patrol.x && Math.round(e.y) === e.patrol.y)
            ) {
              const floor = [];
              for (let y = 1; y < H - 1; y++)
                for (let x = 1; x < W - 1; x++)
                  if (walkable(this.room, x, y)) floor.push({ x, y });
              e.patrol = floor[Math.floor(this.rand() * floor.length)];
              e.thinkAt = s.time + 5 + this.rand() * 3;
            }
            const route = path(this.room, e, e.patrol);
            if (route?.length) want = route[0];
          }
          if (e.type === 'skitter' && validDir(want) && want !== e.moveDir) {
            if (e.commitDir !== want) {
              e.commitDir = want;
              e.commitUntil = s.time + 0.1;
            }
            if (s.time < e.commitUntil) {
              e.state = 'poise';
              return -1;
            }
          }
          return want;
        };
        const rhythm =
          e.type === 'hopper'
            ? 0.7 + 0.5 * Math.max(0, Math.sin(e.phase * 5))
            : e.type === 'skitter'
              ? Math.sin(e.phase * 6) > -0.2
                ? 1.35
                : 0.4
              : 1;
        this.move(
          e,
          s.tuning[`${e.type}Speed`] *
            this.difficulty.speed *
            s.pressure *
            rhythm,
          dt,
          decide,
          false,
        );
        if (e.moving) e.face = e.moveDir;
        this.portal(e, 'enemy');
        e.visible =
          e.type === 'hopper' ||
          e.revealUntil > s.time ||
          players.some((p) => lineClear(this.room, e, p));
        if (e.type !== 'hopper' && !e.visible) s.stats.cloaked++;
      }
    }
    updatePending() {
      const s = this.s;
      for (const q of s.pending) {
        if (q.status !== 'waiting') continue;
        if (q.at === null && s.roomKills >= q.after)
          q.at = s.roomTime + q.delay * s.tuning.spawnSpacing;
        if (q.at !== null && s.roomTime >= q.at) {
          this.spawn(q.type, q.x, q.y);
          q.status = 'spawned';
        }
      }
    }
    updateFamiliar(dt) {
      const f = this.s.familiar;
      if (!f) return;
      f.warning = Math.max(0, f.warning - dt);
      if (f.warning > 0) return;
      f.state = 'flight';
      const decide = () => {
        const r = path(this.room, f, { x: f.goal, y: 6 });
        return r?.[0] ?? -1;
      };
      this.move(
        f,
        this.s.tuning.familiarSpeed *
          (this.s.roomIndex === 0 ? 0.72 : 1) *
          this.difficulty.speed,
        dt,
        decide,
        false,
      );
      if (f.moving) f.face = f.moveDir;
      this.portal(f, 'familiar');
    }
    updateWizard(dt) {
      const s = this.s;
      let w = s.wizard;
      if (!w) {
        if (s.wizardBreak > 0) {
          s.wizardBreak -= dt;
          if (s.wizardBreak <= 0) this.placeWizard();
        }
        return;
      }
      if (w.warning > 0) {
        w.warning = Math.max(0, w.warning - dt);
        if (w.warning <= 0) {
          w.state = 'active';
          w.activeAt = s.time + 0.2;
          this.event('wizard-appear', w.x, w.y, { stage: w.stage });
        }
        return;
      }
      w.teleportIn -= dt;
      w.cast -= dt;
      if (w.teleportIn <= 0) {
        this.event('wizard-teleport', w.x, w.y);
        this.placeWizard();
        return;
      }
      if (w.cast <= 0) {
        w.cast = s.tuning.wizardAttack * (w.stage === 2 ? 0.72 : 1);
        const p = s.players
          .filter((p) => p.alive)
          .sort((a, b) => dist(a, w) - dist(b, w))[0];
        w.face = p ? cardinal(w, p) : w.face;
        let dirs =
          w.stage === 0
            ? [w.face]
            : w.stage === 1
              ? [w.volleys % 2 ? 0 : 1, w.volleys % 2 ? 2 : 3]
              : [w.face, (w.face + 2) % 4];
        w.volleys++;
        for (const d of dirs) {
          const [dx, dy] = DIRS[d];
          s.bolts.push({
            id: this.id('z'),
            owner: w.id,
            x: w.x + dx * 0.4,
            y: w.y + dy * 0.4,
            dir: d,
            hostile: true,
          });
        }
        this.event('lightning', w.x, w.y, { stage: w.stage, dirs });
      }
      if (s.roomIndex !== 5 && s.phaseTime > 32) {
        s.wizard = null;
        s.bolts = s.bolts.filter((b) => !b.hostile);
        this.event('wizard-escape', w.x, w.y);
        this.clear();
      }
    }
    updateBolts(dt) {
      const s = this.s;
      const removed = new Set();
      for (const b of [...s.bolts]) {
        if (removed.has(b.id)) continue;
        const speed = s.tuning.boltSpeed * (b.hostile ? 0.62 : 1),
          travel = speed * dt;
        let hit = null;
        const choose = (d, priority, kind, target) => {
          if (d < -0.001 || d > travel + EPS) return;
          if (
            !hit ||
            d < hit.d - EPS ||
            (Math.abs(d - hit.d) < EPS && priority < hit.priority)
          )
            hit = { d, priority, kind, target };
        };
        const [dx, dy] = DIRS[b.dir];
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            if (this.room.rows[y][x] !== '#') continue;
            const perp = dx ? Math.abs(b.y - y) : Math.abs(b.x - x);
            if (perp > 0.5) continue;
            const along = (x - b.x) * dx + (y - b.y) * dy;
            if (along + 0.5 < 0) continue;
            choose(Math.max(0, along - 0.5), 0, 'wall', null);
          }
        if (dx && ((b.x < 0.1 && dx < 0) || (b.x > 17.9 && dx > 0)))
          choose(0, 0, 'wall', null);
        if (b.hostile) {
          for (const p of s.players)
            if (p.alive && p.protect <= 0)
              choose(rayDistance(b, p, b.dir, 0.34), 3, 'player', p);
        } else {
          for (const post of s.posts)
            choose(rayDistance(b, post, b.dir, 0.4), 1, 'post', post);
          for (const e of s.enemies)
            if (!e.dead && e.warning <= 0 && s.time >= e.activeAt)
              choose(rayDistance(b, e, b.dir, 0.37), 3, 'enemy', e);
          if (s.familiar && s.familiar.warning <= 0)
            choose(
              rayDistance(b, s.familiar, b.dir, 0.4),
              3,
              'familiar',
              s.familiar,
            );
          if (s.wizard?.state === 'active' && s.wizard.vulnerable)
            choose(
              rayDistance(b, s.wizard, b.dir, 0.42),
              3,
              'wizard',
              s.wizard,
            );
          for (const other of s.bolts)
            if (other.hostile && !removed.has(other.id))
              choose(rayDistance(b, other, b.dir, 0.24), 2, 'bolt', other);
        }
        if (hit) {
          b.x += dx * hit.d;
          b.y += dy * hit.d;
          removed.add(b.id);
          if (hit.kind === 'enemy') this.killEnemy(hit.target, b.owner);
          else if (hit.kind === 'post') this.ring(hit.target, b.owner);
          else if (hit.kind === 'familiar') this.finishFamiliar(true, b.owner);
          else if (hit.kind === 'wizard') this.hitWizard(b.owner);
          else if (hit.kind === 'player') this.damage(hit.target, 'lightning');
          else if (hit.kind === 'bolt') {
            removed.add(hit.target.id);
            this.event('parry', b.x, b.y);
          } else this.event('wall-hit', b.x, b.y);
        } else {
          b.x += dx * travel;
          b.y += dy * travel;
          if (b.x < -0.5 || b.x > W - 0.5 || b.y < -0.5 || b.y > H - 0.5)
            removed.add(b.id);
        }
      }
      s.bolts = s.bolts.filter((b) => !removed.has(b.id));
      for (const p of s.players)
        if (p.boltId && !s.bolts.some((b) => b.id === p.boltId)) {
          p.boltId = null;
          this.event('ready', p.x, p.y, { seat: p.seat });
        }
      s.enemies = s.enemies.filter((e) => !e.dead);
    }
    step(dt, commands = []) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 0.25);
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < n; i++) this.fixedStep(dt / n, commands);
    }
    fixedStep(dt, commands) {
      const s = this.s;
      if (['victory', 'defeat'].includes(s.phase)) return;
      dt *= s.timeScale || 1;
      s.time += dt;
      s.tick++;
      s.phaseTime += dt;
      s.roomTime += dt;
      s.stats.activeSeconds += dt;
      s.pressure = Math.min(
        s.tuning.pressureCap,
        1 + s.roomTime * s.tuning.pressureGrowth,
      );
      for (const post of s.posts) {
        post.cooldown = Math.max(0, post.cooldown - dt);
        post.ring = Math.max(0, post.ring - dt);
      }
      if (s.phase === 'clear') {
        if (s.phaseTime > 3.5) this.nextRoom();
        return;
      }
      this.updatePlayers(dt, commands);
      if (
        s.phase === 'entry' &&
        (s.phaseTime > 1 ||
          commands.some((c) => c && (validDir(c.move) || c.fire)))
      )
        this.setPhase('hunt', this.room.intro);
      if (s.phase === 'hunt') {
        this.updatePending();
        this.updateEnemies(dt);
      } else if (s.phase === 'familiar') this.updateFamiliar(dt);
      else if (s.phase === 'intrusion') this.updateWizard(dt);
      this.updateBolts(dt);
      if (s.phase === 'defeat' || s.phase === 'victory') return;
      for (const e of s.enemies) {
        if (e.warning > 0 || s.time < e.activeAt) continue;
        for (const p of s.players)
          if (p.alive && dist(e, p) < 0.53) this.damage(p, e.type);
      }
      if (s.wizard?.state === 'active' && s.time >= s.wizard.activeAt)
        for (const p of s.players)
          if (p.alive && dist(s.wizard, p) < 0.55) this.damage(p, 'wizard');
      if (
        s.phase === 'hunt' &&
        !s.enemies.length &&
        s.pending.every((q) => q.status === 'spawned')
      )
        this.startFamiliar();
      s.noise = s.noise.filter((n) => s.time - n.t < 1.5);
    }
    radar() {
      return {
        players: this.s.players
          .filter((p) => p.alive)
          .map((p) => ({ id: p.id, seat: p.seat, x: p.x, y: p.y })),
        enemies: this.s.enemies.map((e) => ({
          id: e.id,
          type: e.type,
          x: e.x,
          y: e.y,
          warning: e.warning > 0,
        })),
      };
    }
    dev(action, value) {
      const s = this.s;
      s.practice = true;
      switch (action) {
        case 'room':
          this.enterRoom(Number(value) || 0);
          break;
        case 'phase':
          if (value === 'familiar') this.startFamiliar();
          else if (value === 'intrusion') {
            this.startWizard();
          } else if (value === 'hunt') {
            this.enterRoom(s.roomIndex);
            this.setPhase('hunt');
          }
          break;
        case 'restart':
          this.enterRoom(s.roomIndex);
          break;
        case 'invulnerable':
          s.invulnerable = !!value;
          break;
        case 'lives':
          for (const p of s.players) {
            p.lives = Math.max(1, Math.min(9, Number(value) || 3));
            if (!p.alive) this.respawn(p);
          }
          break;
        case 'spawn': {
          const p = s.players.find((p) => p.alive) || { x: 1, y: 11 },
            spot = this.farFloor(p);
          this.spawn(value, spot.x, spot.y);
          break;
        }
        case 'remove':
          if (['hopper', 'stalker', 'skitter'].includes(value)) {
            const removed = s.enemies.filter((e) => e.type === value).length;
            s.enemies = s.enemies.filter((e) => e.type !== value);
            s.roomKills += removed;
            this.event('dev-remove', 0, 0, { family: value, count: removed });
          }
          break;
        case 'clearEnemies':
          s.enemies = [];
          for (const q of s.pending) q.status = 'spawned';
          break;
        case 'reset':
          s.tuning = { ...DEFAULTS };
          s.timeScale = 1;
          s.invulnerable = false;
          break;
      }
      s.practice = true;
    }
    bot(seat = 0) {
      return bot(this, seat);
    }
  }
  function bot(sim, seat = 0) {
    const s = sim.s,
      p = s.players.find((p) => p.seat === seat),
      none = { move: -1, aim: -1, fire: false };
    if (!p?.alive || ['clear', 'victory', 'defeat'].includes(s.phase))
      return none;
    const room = sim.room;
    const incoming = s.bolts
      .filter((b) => b.hostile && lineClear(room, p, b, 0.26) && dist(p, b) < 6)
      .sort((a, b) => dist(p, a) - dist(p, b))[0];
    if (incoming) {
      const a = cardinal(p, incoming),
        toward = cardinal(incoming, p);
      if (incoming.dir === toward) {
        if (!p.boltId) return { move: -1, aim: a, fire: true };
        const escapes = [(a + 1) % 4, (a + 3) % 4];
        const d = escapes.find((d) =>
          walkable(
            room,
            Math.round(p.x) + DIRS[d][0],
            Math.round(p.y) + DIRS[d][1],
          ),
        );
        if (validDir(d)) return { move: d, aim: a, fire: true };
      }
    }
    if (s.roomIndex === 2 && s.stats.bells === 0 && s.roomTime < 3)
      return { move: -1, aim: 3, fire: true };
    if (s.roomIndex === 2 && s.stats.portals === 0) {
      if (p.moving) return { move: p.moveDir, aim: p.face, fire: false };
      const r = path(room, p, { x: 0, y: 6 });
      if (r?.length) return { move: r[0], aim: r[0], fire: false };
    }
    const targets =
      s.phase === 'familiar' && s.familiar
        ? [s.familiar]
        : s.phase === 'intrusion' && s.wizard
          ? [s.wizard]
          : s.enemies.filter((e) => e.warning <= 0);
    let target = null,
      best = 1e9;
    for (const e of targets) {
      const d = dist(p, e);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    if (!target) {
      const q = s.pending.find((q) => q.status === 'waiting');
      target = q ? { x: q.x, y: q.y } : s.posts[0] || { x: 9, y: 5 };
    }
    const aim = cardinal(p, target);
    const aligned = lineClear(room, p, target, 0.2);
    const canShoot =
      aligned &&
      dist(p, target) > 0.45 &&
      (target.state !== 'warning' || target.type) &&
      (!s.wizard ||
        s.wizard !== target ||
        (target.state === 'active' && target.vulnerable));
    // Immediate aligned shots are the same commands a human can make from radar and visible cues.
    if (canShoot) {
      let move = -1;
      if (best < 1.1 && s.enemies.includes(target)) {
        const away = (aim + 2) % 4;
        if (
          walkable(
            room,
            Math.round(p.x) + DIRS[away][0],
            Math.round(p.y) + DIRS[away][1],
          )
        )
          move = away;
      }
      return { move, aim, fire: true };
    }
    if (p.moving) return { move: p.moveDir, aim, fire: false };
    const rounded = { x: Math.round(target.x), y: Math.round(target.y) };
    const candidates = [];
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const c = { x, y };
        if (!walkable(room, x, y) || !lineClear(room, c, rounded, 0.1))
          continue;
        const d = dist(c, target);
        if (d < 2 || d > 8) continue;
        const route = path(room, p, c);
        if (!route) continue;
        let danger = 0;
        for (const e of s.enemies)
          if (e.warning <= 0) {
            const de = dist(c, e);
            if (de < 2) danger += (2 - de) * 8;
          }
        const score = route.length + Math.abs(d - 3) * 0.35 + danger;
        candidates.push({ route, score });
      }
    candidates.sort((a, b) => a.score - b.score);
    let move = candidates[0]?.route[0];
    if (!validDir(move)) {
      const r = path(room, p, rounded);
      move = r?.[0] ?? -1;
    }
    // Do not round a blind corner into contact; back up and take the shot when it enters the lane.
    if (validDir(move)) {
      const next = {
        x: p.x + DIRS[move][0] * 0.6,
        y: p.y + DIRS[move][1] * 0.6,
      };
      const threat = s.enemies.find(
        (e) => e.warning <= 0 && dist(e, next) < 0.8,
      );
      if (threat) {
        const d = cardinal(p, threat);
        if (lineClear(room, p, threat, 0.25))
          return { move: -1, aim: d, fire: true };
        const other = DIRS.map((_, i) => i).find(
          (d) =>
            walkable(
              room,
              Math.round(p.x) + DIRS[d][0],
              Math.round(p.y) + DIRS[d][1],
            ) &&
            s.enemies.every(
              (e) =>
                e.warning > 0 ||
                dist(e, { x: p.x + DIRS[d][0], y: p.y + DIRS[d][1] }) > 1.3,
            ),
        );
        move = other ?? -1;
      }
    }
    return { move: validDir(move) ? move : -1, aim, fire: false };
  }
  G.WizardSim = {
    Sim,
    ROOMS,
    DEFAULTS,
    DIFFICULTIES,
    DIRECTIONS: DIRS,
    bot,
    path,
    lineClear,
    walkable,
    cellToWorld,
    worldToCell,
  };
})(globalThis);
