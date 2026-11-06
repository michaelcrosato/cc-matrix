(function (root) {
  'use strict';
  const I = root.IW,
    E = root.My3D2dge,
    { DIRS: D, world: W, cell: C } = I;
  const dist = (a, b) => Math.hypot(a.m.x - b.m.x, a.m.y - b.m.y),
    clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  // Ray against an axis-aligned box. Fractions determine deterministic first impact.
  function rayBox(x, y, dx, dy, x0, y0, x1, y1) {
    let lo = 0,
      hi = 1;
    for (const [p, v, a, b] of [
      [x, dx, x0, x1],
      [y, dy, y0, y1],
    ]) {
      if (Math.abs(v) < 1e-10) {
        if (p < a || p > b) return null;
      } else {
        let u = (a - p) / v,
          t = (b - p) / v;
        if (u > t) [u, t] = [t, u];
        lo = Math.max(lo, u);
        hi = Math.min(hi, t);
        if (lo > hi) return null;
      }
    }
    return lo;
  }
  I.rayBox = rayBox;
  class World {
    constructor(o = {}) {
      this.config = {
        difficulty: 'Normal',
        seats: [0],
        seed: 1972,
        context: 'campaign',
        assistance: false,
        ...o,
      };
      this.tuning = { ...I.DEFAULTS };
      this.rngState = (o.seed || 1972) >>> 0;
      this.nextId = 1;
      this.eventSeq = 0;
      this.events = [];
      this.ledger = {};
      this.score = 0;
      this.currentMultiplier = 1;
      this.earnedNextMultiplier = 1;
      this.practice = false;
      this.tick = 0;
      this.elapsed = 0;
      this.totalKills = 0;
      this.familiars = 0;
      this.banishments = 0;
      this.bells = 0;
      this.portals = 0;
      this.deaths = 0;
      this.players = this.config.seats.map((seat, i) =>
        this.actor('player', 1 + i * 18, 11, {
          seat,
          lives: I.DIFFICULTY[this.config.difficulty].lives,
          alive: true,
          protect: 1.25,
          face: 3,
          aim: 3,
          bolt: null,
          cool: 0,
          buffer: -1,
          bufferTime: 0,
          fireBuffer: 0,
          kills: 0,
          shots: 0,
          travel: 0,
        }),
      );
      this.pool = new E.Bullets(
        { particles: { sparks() {} } },
        { sparks: false },
      );
      this.loadRoom(0);
    }
    rand() {
      if (this.externalRng) return this.externalRng();
      let x = this.rngState;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      this.rngState = x >>> 0;
      return this.rngState / 4294967296;
    }
    actor(kind, x, y, extra = {}) {
      return {
        id: this.nextId++,
        kind,
        m: new E.GridMover({ cx: x, cy: y }),
        age: 0,
        ...extra,
      };
    }
    emit(type, data = {}) {
      const e = { id: ++this.eventSeq, tick: this.tick, type, ...data };
      this.events.push(e);
      if (this.events.length > 45) this.events.shift();
      return e;
    }
    get room() {
      return I.ROOMS[this.roomIndex];
    }
    get bolts() {
      return this.pool.list;
    }
    walk(x, y) {
      return (
        !!this.room.rows[y] &&
        this.room.rows[y][x] !== undefined &&
        !['#', 'B'].includes(this.room.rows[y][x])
      );
    }
    buildGrid() {
      this.grid = new E.Grid(this.room.w, this.room.h, {
        walkable: (x, y) => this.walk(x, y),
      });
    }
    loadRoom(index) {
      this.roomIndex = index;
      this.buildGrid();
      this.roomTime = 0;
      this.phaseTime = 0;
      this.phase = 'Entry';
      this.phaseDelay = 2.2;
      this.roomKills = 0;
      this.queue = this.room.spawns.map((s, i) => ({
        ...I.copy(s),
        id: i,
        done: false,
      }));
      this.enemies = [];
      this.posts = this.room.posts.map(([x, y]) => ({
        id: this.nextId++,
        x,
        y,
        cool: 0,
        ring: 0,
      }));
      this.familiar = null;
      this.wizard = null;
      this.manifest = 0;
      this.wizardHits = 0;
      this.wizardFailed = false;
      this.familiarOutcome = 'pending';
      this.pool.clear();
      this.earnedNextMultiplier = 1;
      this.status = 'playing';
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i],
          e = this.room.entries[i % 2];
        p.m.place(...e);
        p.alive = p.lives > 0;
        p.protect = this.tuning.protection;
        p.bolt = null;
        p.buffer = -1;
        p.bufferTime = 0;
        p.fireBuffer = 0;
        p.portalLock = false;
        p.cool = 0;
      }
      this.entry = this.export(false);
      this.emit('entry', { room: index, text: this.room.boast });
    }
    setPhase(p) {
      this.phase = p;
      this.phaseTime = 0;
      this.emit('phase', { phase: p });
    }
    award(key, points, player) {
      if (this.ledger[key]) return false;
      this.ledger[key] = true;
      this.score += points * this.currentMultiplier;
      if (player) player.kills++;
      return true;
    }
    path(a, b) {
      return this.grid.path([Math.round(a[0]), Math.round(a[1])], b);
    }
    los(a, b) {
      const ax = a.m ? a.m.x : a.x,
        ay = a.m ? a.m.y : a.y,
        bx = b.m ? b.m.x : b.x,
        by = b.m ? b.m.y : b.y;
      if (Math.abs(ax - bx) > 0.16 && Math.abs(ay - by) > 0.16) return false;
      const dx = bx - ax,
        dy = by - ay,
        n = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 6));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(ax + (dx * k) / n),
          y = Math.round(ay + (dy * k) / n);
        if (!this.walk(x, y)) return false;
      }
      return true;
    }
    visible(e) {
      return (
        e.kind === 'hopper' ||
        e.reveal > 0 ||
        this.players.some((p) => p.alive && this.los(p, e))
      );
    }
    radar() {
      return {
        players: this.players
          .filter((p) => p.alive)
          .map((p) => ({ id: p.id, seat: p.seat, x: p.m.x, y: p.m.y })),
        hunters: this.enemies.map((e) => ({
          id: e.id,
          kind: e.kind,
          x: e.m.x,
          y: e.m.y,
          warning: e.warning > 0,
        })),
      };
    }
    spawn(kind, at) {
      let [x, y] = at || [10, 1];
      if (!this.walk(x, y)) {
        const cell = this.openCells().sort(
          (a, b) =>
            Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y),
        )[0];
        [x, y] = cell;
      }
      const e = this.actor(kind, x, y, {
        warning: 0.9 * I.DIFFICULTY[this.config.difficulty].warning,
        reveal: 0,
        lure: 0,
        target: null,
        memory: 0,
        state: 'warning',
        think: 0,
        portalLock: false,
      });
      this.enemies.push(e);
      this.emit('spawn', { id: e.id, kind, x: W(x), y: W(y) });
      return e;
    }
    openCells() {
      const out = [];
      for (let y = 1; y < this.room.h - 1; y++)
        for (let x = 1; x < this.room.w - 1; x++)
          if (this.walk(x, y)) out.push([x, y]);
      return out;
    }
    move(p, command, dt) {
      const c = command || {},
        want =
          Number.isInteger(c.move) && c.move >= 0 && c.move < 4 ? c.move : -1;
      if (want >= 0) {
        p.buffer = want;
        p.bufferTime = 0.13;
      } else {
        p.bufferTime = Math.max(0, p.bufferTime - dt);
        if (p.bufferTime <= 0) p.buffer = -1;
      }
      if (!p.m.moving) {
        p.m._want = null;
        if (
          p.buffer >= 0 &&
          this.walk(p.m.cx + D[p.buffer][0], p.m.cy + D[p.buffer][1])
        ) {
          p.m._want = D[p.buffer];
          p.buffer = -1;
        }
      }
      p.m.speed = this.tuning.playerSpeed;
      const ox = p.m.x,
        oy = p.m.y;
      p.m.update(dt, this.grid, null);
      p.travel += Math.hypot(ox - p.m.x, oy - p.m.y);
      if (p.m.moving)
        p.face = D.findIndex((d) => d[0] === p.m.dir[0] && d[1] === p.m.dir[1]);
      if (Number.isInteger(c.aim) && c.aim >= 0 && c.aim < 4) {
        p.aim = c.aim;
        p.face = c.aim;
      } else p.aim = p.face;
      p.cool = Math.max(0, p.cool - dt);
      if (c.fire) p.fireBuffer = 0.1;
      else p.fireBuffer = Math.max(0, p.fireBuffer - dt);
      if (p.fireBuffer > 0 && !p.bolt && p.cool <= 0) {
        this.fire(p);
        p.fireBuffer = 0;
      }
      this.portal(p);
    }
    fire(p) {
      if (p.bolt || !p.alive) return false;
      const d = D[p.aim],
        s = this.tuning.boltSpeed * 16,
        b = this.pool.fire({
          id: this.nextId++,
          owner: p.id,
          x: W(p.m.x) + d[0] * 3,
          y: W(p.m.y) + d[1] * 3,
          z: 7,
          vx: d[0] * s,
          vy: d[1] * s,
          r: 1.5,
          team: 'player',
          color: p.seat % 2 ? '#95e3ff' : '#ffdb8e',
        });
      if (!b) return false;
      p.bolt = b.id;
      p.cool = this.tuning.fireInterval;
      p.shots++;
      this.emit('fire', { owner: p.id, x: b.x, y: b.y });
      for (const e of this.enemies)
        if (e.lure <= 0 && Math.hypot(e.m.x - p.m.x, e.m.y - p.m.y) < 7) {
          e.target = [Math.round(p.m.x), Math.round(p.m.y)];
          e.memory = 3;
          e.state = 'listen';
        }
      return true;
    }
    resolve(b, type, x, y) {
      if (b.dead) return;
      b.dead = true;
      if (b.owner) {
        const p = this.players.find((p) => p.id === b.owner);
        if (p && p.bolt === b.id) {
          p.bolt = null;
          this.emit('ready', { owner: p.id });
        }
      }
      this.emit(type || 'impact', { x: x ?? b.x, y: y ?? b.y });
    }
    bell(post) {
      if (post.cool > 0) return false;
      post.cool = this.tuning.bellCooldown;
      post.ring = this.tuning.bellRevealTime;
      this.bells++;
      for (const e of this.enemies) {
        if (
          Math.hypot(e.m.x - post.x, e.m.y - post.y) <=
          this.tuning.bellRevealRadius
        )
          e.reveal = this.tuning.bellRevealTime;
        const adj = D.map((d) => [post.x + d[0], post.y + d[1]]).filter((c) =>
          this.walk(...c),
        );
        let best = [];
        for (const a of adj) {
          const p = this.path([e.m.x, e.m.y], a);
          if (p.length && (!best.length || p.length < best.length)) best = p;
        }
        if (best.length && best.length <= this.tuning.bellLureRadius + 1) {
          e.lure = this.tuning.bellLureTime;
          e.target = best[best.length - 1];
          e.state = 'lured';
        }
      }
      this.emit('bell', { x: W(post.x), y: W(post.y) });
      return true;
    }
    portal(a) {
      const m = a.m;
      if (a.portalLock) {
        const arrival = a.portalArrival || [m.x < 10 ? 1 : 19, 6];
        if (Math.hypot(m.x - arrival[0], m.y - arrival[1]) > 1.25)
          a.portalLock = false;
        return;
      }
      if (m.moving || m.cy !== 6 || (m.cx !== 0 && m.cx !== 20)) return;
      const x = m.cx === 0 ? 19 : 1;
      m.place(x, 6);
      m.dir = [m.cx === 19 ? -1 : 1, 0];
      a.portalLock = true;
      a.portalArrival = [x, 6];
      if (a.kind === 'player') {
        a.protect = Math.max(a.protect, 0.6);
        this.portals++;
        for (const e of this.enemies)
          if (Math.hypot(e.m.x - x, e.m.y - 6) < 1.5) {
            e.m.place(10, 1);
            e.warning = 0.65;
          }
        this.emit('portal', { owner: a.id, x: W(x), y: W(6) });
      }
    }
    enemyStep(e, dt) {
      e.age += dt;
      e.memory = Math.max(0, e.memory - dt);
      if (e.warning > 0) {
        e.warning -= dt;
        e.state = 'warning';
        if (e.warning <= 0) {
          e.state = 'patrol';
          e.warning = 0;
        }
        return;
      }
      const diff = I.DIFFICULTY[this.config.difficulty].speed,
        pressure = Math.min(
          this.tuning.pressureCap,
          1 + this.roomTime * this.tuning.pressureRate,
        );
      e.m.speed = this.tuning[e.kind + 'Speed'] * diff * pressure;
      // Families listen to shots and keep a short sight memory, rather than knowing a hidden player's position.
      const seen = this.players
        .filter((p) => p.alive && this.los(e, p))
        .sort((a, b) => dist(e, a) - dist(e, b))[0];
      if (seen && e.lure <= 0) {
        e.target = [Math.round(seen.m.x), Math.round(seen.m.y)];
        e.memory = 4;
        e.state = 'pursue';
      }
      if (!e.m.moving) {
        e.m._want = null;
        let dir = null;
        if (e.lure > 0 || e.memory > 0) {
          const path = this.path([e.m.cx, e.m.cy], e.target);
          if (path.length > 1) {
            dir = [path[1][0] - e.m.cx, path[1][1] - e.m.cy];
            e.turns = (e.turns || 0) + 1;
            if (e.kind === 'stalker' && e.lure <= 0 && e.turns % 4 === 0) {
              const flanks = D.filter(
                (d) =>
                  this.walk(e.m.cx + d[0], e.m.cy + d[1]) &&
                  (d[0] !== dir[0] || d[1] !== dir[1]) &&
                  (d[0] !== -e.m.dir[0] || d[1] !== -e.m.dir[1]),
              ).filter((d) => {
                const alt = this.path([e.m.cx + d[0], e.m.cy + d[1]], e.target);
                return alt.length && alt.length <= path.length + 4;
              });
              if (flanks.length) {
                dir = flanks[Math.floor(this.rand() * flanks.length)];
                e.state = 'flank';
              }
            }
          }
        }
        if (!dir) {
          e.state = e.kind === 'skitter' ? 'commit' : 'patrol';
          let choices = D.filter((d) =>
            this.walk(e.m.cx + d[0], e.m.cy + d[1]),
          );
          if (choices.length > 1)
            choices = choices.filter(
              (d) => d[0] !== -e.m.dir[0] || d[1] !== -e.m.dir[1],
            );
          dir = choices[Math.floor(this.rand() * choices.length)];
        }
        const hop = e.kind === 'hopper' && e.age % 1.0 < 0.22,
          commit = e.kind === 'skitter' && e.age % 1.3 < 0.17;
        if (hop || commit) {
          e.state = 'anticipate';
          return;
        }
        if (dir) e.m._want = dir;
      }
      e.m.update(dt, this.grid, null);
      this.portal(e);
    }
    killEnemy(e, p) {
      if (!this.enemies.includes(e)) return false;
      this.award('enemy:' + e.id, I.FAMILIES[e.kind].points, p);
      this.roomKills++;
      this.totalKills++;
      this.enemies = this.enemies.filter((q) => q !== e);
      this.emit('kill', { kind: e.kind, x: W(e.m.x), y: W(e.m.y) });
      return true;
    }
    damage(p) {
      if (
        !p.alive ||
        p.protect > 0 ||
        this.invulnerable ||
        this.config.context === 'attract'
      )
        return false;
      this.deaths++;
      p.lives--;
      p.alive = false;
      p.respawn = p.lives > 0 ? 1 : 0;
      p.fireBuffer = 0;
      if (p.bolt) {
        const b = this.bolts.find((b) => b.id === p.bolt);
        if (b) this.resolve(b);
        p.bolt = null;
      }
      this.emit('hurt', { owner: p.id, x: W(p.m.x), y: W(p.m.y) });
      if (this.players.every((p) => !p.alive && p.lives <= 0)) {
        this.status = 'defeat';
        this.emit('defeat');
      }
      return true;
    }
    respawn(p) {
      const i = this.players.indexOf(p),
        [x, y] = this.room.entries[i % 2];
      p.m.place(x, y);
      p.alive = true;
      p.protect = this.tuning.protection;
      for (const e of this.enemies)
        if (Math.hypot(e.m.x - x, e.m.y - y) < 3) {
          e.m.place(10, 1);
          e.warning = 1;
        }
      this.pool.list = this.bolts.filter(
        (b) => b.team === 'player' || Math.hypot(C(b.x) - x, C(b.y) - y) > 4,
      );
      this.emit('respawn', { owner: p.id });
    }
    sweep(dt) {
      for (const b of this.bolts.slice().sort((a, b) => a.id - b.id)) {
        if (b.dead) continue;
        const dx = b.vx * dt,
          dy = b.vy * dt,
          hits = [];
        const add = (t, rank, id, type, obj) => {
          if (t !== null && t >= 0 && t <= 1)
            hits.push({ t, rank, id, type, obj });
        };
        for (let y = 0; y < this.room.h; y++)
          for (let x = 0; x < this.room.w; x++)
            if (this.room.rows[y][x] === '#')
              add(
                rayBox(
                  b.x,
                  b.y,
                  dx,
                  dy,
                  x * 16 - 1,
                  y * 16 - 1,
                  (x + 1) * 16 + 1,
                  (y + 1) * 16 + 1,
                ),
                0,
                y * 21 + x,
                'wall',
              );
        // The portal mouth consumes a bolt; projectiles never wrap.
        for (const x of [0, 20])
          add(
            rayBox(b.x, b.y, dx, dy, x * 16, 6 * 16, (x + 1) * 16, 7 * 16),
            0,
            x,
            'wall',
          );
        if (b.team === 'player') {
          for (const p of this.posts)
            add(
              rayBox(
                b.x,
                b.y,
                dx,
                dy,
                W(p.x) - 6,
                W(p.y) - 6,
                W(p.x) + 6,
                W(p.y) + 6,
              ),
              1,
              p.id,
              'post',
              p,
            );
          for (const q of this.bolts)
            if (q.team === 'hostile' && !q.dead)
              add(
                rayBox(
                  b.x,
                  b.y,
                  dx - q.vx * dt,
                  dy - q.vy * dt,
                  q.x - 3,
                  q.y - 3,
                  q.x + 3,
                  q.y + 3,
                ),
                2,
                q.id,
                'bolt',
                q,
              );
          for (const e of this.enemies)
            if (e.warning <= 0)
              add(
                rayBox(
                  b.x,
                  b.y,
                  dx,
                  dy,
                  W(e.m.x) - 5,
                  W(e.m.y) - 5,
                  W(e.m.x) + 5,
                  W(e.m.y) + 5,
                ),
                3,
                e.id,
                'enemy',
                e,
              );
          if (this.familiar)
            add(
              rayBox(
                b.x,
                b.y,
                dx,
                dy,
                W(this.familiar.m.x) - 6,
                W(this.familiar.m.y) - 6,
                W(this.familiar.m.x) + 6,
                W(this.familiar.m.y) + 6,
              ),
              3,
              this.familiar.id,
              'familiar',
              this.familiar,
            );
          if (this.wizard && this.wizard.state === 'active')
            add(
              rayBox(
                b.x,
                b.y,
                dx,
                dy,
                W(this.wizard.x) - 6,
                W(this.wizard.y) - 6,
                W(this.wizard.x) + 6,
                W(this.wizard.y) + 6,
              ),
              3,
              this.wizard.id,
              'wizard',
              this.wizard,
            );
        } else
          for (const p of this.players)
            if (p.alive && p.protect <= 0)
              add(
                rayBox(
                  b.x,
                  b.y,
                  dx,
                  dy,
                  W(p.m.x) - 4,
                  W(p.m.y) - 4,
                  W(p.m.x) + 4,
                  W(p.m.y) + 4,
                ),
                4,
                p.id,
                'player',
                p,
              );
        hits.sort((a, b) => a.t - b.t || a.rank - b.rank || a.id - b.id);
        const h = hits[0];
        if (h) {
          const x = b.x + dx * h.t,
            y = b.y + dy * h.t,
            owner = this.players.find((p) => p.id === b.owner);
          this.resolve(b, 'impact', x, y);
          if (h.type === 'post') this.bell(h.obj);
          if (h.type === 'bolt') this.resolve(h.obj, 'lightningBlock', x, y);
          if (h.type === 'enemy') this.killEnemy(h.obj, owner);
          if (h.type === 'player') this.damage(h.obj);
          if (h.type === 'familiar') this.catchFamiliar(owner);
          if (h.type === 'wizard') this.banish(owner);
        } else {
          b.x += dx;
          b.y += dy;
          b.t += dt;
          if (b.t > b.life || b.x < 0 || b.x > 336 || b.y < 0 || b.y > 208)
            this.resolve(b);
        }
      }
      this.pool.list = this.bolts.filter((b) => !b.dead);
    }
    beginFamiliar() {
      this.setPhase('Familiar');
      this.familiar = this.actor('familiar', ...this.room.familiarStart, {
        route: 0,
        exit: this.rand() < 0.5 ? 0 : 20,
        wait: 1.5,
      });
      this.emit('chase', {
        exit: this.familiar.exit,
        bounty: this.room.bounty,
      });
    }
    familiarStep(dt) {
      const f = this.familiar;
      if (!f) return;
      f.age += dt;
      if ((f.wait -= dt) > 0) return;
      const stops = [
          [10, 6],
          [f.exit === 0 ? 3 : 17, 6],
          [f.exit, 6],
        ],
        target = stops[f.route];
      if (!f.m.moving) {
        if (f.m.cx === target[0] && f.m.cy === target[1]) {
          f.route++;
          if (f.route === stops.length) {
            this.familiarOutcome = 'escaped';
            this.emit('escape');
            this.familiar = null;
            this.afterFamiliar();
            return;
          }
        }
        const to = stops[f.route],
          p = this.path([f.m.cx, f.m.cy], to);
        f.m._want = p.length > 1 ? [p[1][0] - f.m.cx, p[1][1] - f.m.cy] : null;
      }
      f.m.speed = this.tuning.familiarSpeed * (this.roomIndex === 0 ? 0.8 : 1);
      f.m.update(dt, this.grid, null);
    }
    catchFamiliar(p) {
      if (!this.familiar) return;
      const f = this.familiar;
      this.award('familiar:' + f.id, 1000, p);
      this.familiars++;
      this.earnedNextMultiplier = 2;
      this.familiarOutcome = 'caught';
      this.emit('catch', { x: W(f.m.x), y: W(f.m.y) });
      this.familiar = null;
      this.afterFamiliar();
    }
    afterFamiliar() {
      if (this.room.intrusions) {
        this.setPhase('Intrusion');
        this.manifest = 0;
        this.nextWizard(1.3);
      } else this.clearRoom();
    }
    nextWizard(delay = 1) {
      this.wizard = {
        id: this.nextId++,
        x: 10,
        y: 6,
        state: 'waiting',
        t: delay,
        cast: 0,
        attempts: 0,
        stage: this.manifest,
      };
    }
    teleportWizard() {
      const w = this.wizard,
        ps = this.players.filter((p) => p.alive);
      if (!w || !ps.length) return;
      const p = ps[Math.floor(this.rand() * ps.length)],
        candidates = this.openCells().filter(
          ([x, y]) =>
            Math.hypot(x - p.m.x, y - p.m.y) >= 3 &&
            Math.hypot(x - p.m.x, y - p.m.y) <= 9 &&
            ps.every((q) => Math.hypot(x - q.m.x, y - q.m.y) >= 2) &&
            this.los({ x, y }, p),
        );
      const q = candidates[Math.floor(this.rand() * candidates.length)] ||
        this.openCells().find(([x, y]) =>
          ps.every((q) => Math.hypot(x - q.m.x, y - q.m.y) >= 3),
        ) || [10, 1];
      [w.x, w.y] = q;
      w.state = 'warning';
      w.t =
        this.tuning.wizardWarning *
        I.DIFFICULTY[this.config.difficulty].warning;
      w.cast = 0;
      w.attempts++;
      this.emit('teleport', { x: W(w.x), y: W(w.y), stage: w.stage });
    }
    wizardStep(dt) {
      const w = this.wizard;
      if (!w) return;
      w.t -= dt;
      if (w.state === 'waiting' && w.t <= 0) this.teleportWizard();
      else if (w.state === 'warning' && w.t <= 0) {
        if (
          this.players.some(
            (p) => p.alive && Math.hypot(p.m.x - w.x, p.m.y - w.y) < 1.25,
          )
        ) {
          this.teleportWizard();
          return;
        }
        w.state = 'active';
        w.t = this.tuning.wizardInterval * (w.stage === 2 ? 0.75 : 1);
        w.cast = this.tuning.wizardAttack;
        this.emit('apparition', { x: W(w.x), y: W(w.y) });
      } else if (w.state === 'active') {
        w.cast -= dt;
        if (w.cast <= 0) {
          this.lightning();
          w.cast = this.tuning.wizardAttack * (w.stage === 2 ? 0.8 : 1);
        }
        if (w.t <= 0) {
          if (this.roomIndex !== 5 && w.attempts >= 4) {
            this.wizardFailed = true;
            this.wizard = null;
            this.emit('wizardEscape');
            this.clearRoom();
          } else this.teleportWizard();
        }
      } else if (w.state === 'banished' && w.t <= 0) {
        this.manifest++;
        if (this.manifest < this.room.intrusions) this.nextWizard(0.8);
        else {
          this.earnedNextMultiplier = Math.min(
            4,
            this.earnedNextMultiplier * 2,
          );
          this.wizard = null;
          this.clearRoom();
        }
      }
    }
    lightning() {
      const w = this.wizard,
        p = this.players
          .filter((p) => p.alive)
          .sort(
            (a, b) =>
              Math.hypot(a.m.x - w.x, a.m.y - w.y) -
              Math.hypot(b.m.x - w.x, b.m.y - w.y),
          )[0];
      if (!p) return;
      const axis = (w.volley || 0) % 2;
      w.volley = (w.volley || 0) + 1;
      const aim = I.cardinal(p.m.x - w.x, p.m.y - w.y),
        dirs =
          w.stage === 1
            ? [axis, axis + 2]
            : w.stage === 2
              ? [aim, (aim + 1) % 4, (aim + 3) % 4]
              : [aim];
      for (const a of dirs) {
        const d = D[a];
        this.pool.fire({
          id: this.nextId++,
          x: W(w.x) + d[0] * 7,
          y: W(w.y) + d[1] * 7,
          z: 7,
          vx: d[0] * 80,
          vy: d[1] * 80,
          r: 2,
          team: 'hostile',
          life: 5,
          color: '#f78cad',
        });
      }
      this.emit('lightning', { x: W(w.x), y: W(w.y), dirs });
    }
    banish(p) {
      const w = this.wizard;
      if (!w || w.state !== 'active') return;
      this.award('wizard:' + w.id, 2500, p);
      this.banishments++;
      this.wizardHits++;
      w.state = 'banished';
      w.t = 1.5;
      this.pool.list = this.bolts.filter((b) => b.team === 'player');
      this.emit('banish', { x: W(w.x), y: W(w.y), stage: w.stage });
    }
    clearRoom() {
      this.setPhase('Clear');
      this.phaseDelay = 3.2;
      this.pool.clear();
      for (const p of this.players) p.bolt = null;
      this.emit('clear', { next: this.earnedNextMultiplier });
    }
    descend() {
      if (this.phase !== 'Clear') return false;
      if (this.roomIndex === 5) {
        this.status = 'victory';
        const key = 'exit-bounty';
        if (!this.ledger[key]) {
          this.ledger[key] = true;
          this.score += this.room.bounty * this.earnedNextMultiplier;
        }
        this.emit('victory', {
          bounty: this.room.bounty * this.earnedNextMultiplier,
        });
        return true;
      }
      this.currentMultiplier = this.earnedNextMultiplier;
      for (const p of this.players) {
        if (p.lives <= 0) {
          p.lives = 1;
          p.alive = true;
        }
        if ([2, 3].includes(this.roomIndex))
          p.lives = Math.min(
            I.DIFFICULTY[this.config.difficulty].lives,
            p.lives + 1,
          );
      }
      this.loadRoom(this.roomIndex + 1);
      return true;
    }
    step(dt, commands = {}) {
      if (this.status !== 'playing' || dt <= 0) return;
      this.tick++;
      this.elapsed += dt;
      this.roomTime += dt;
      this.phaseTime += dt;
      for (const p of this.players) {
        p.age += dt;
        p.protect = Math.max(0, p.protect - dt);
        if (!p.alive && p.lives > 0) {
          p.respawn -= dt;
          if (p.respawn <= 0) this.respawn(p);
        }
        if (p.alive) this.move(p, commands[p.seat], dt);
      }
      for (const e of this.enemies) {
        e.reveal = Math.max(0, e.reveal - dt);
        e.lure = Math.max(0, e.lure - dt);
      }
      for (const p of this.posts) {
        p.cool = Math.max(0, p.cool - dt);
        p.ring = Math.max(0, p.ring - dt);
      }
      if (this.phase === 'Entry' && this.phaseTime >= this.phaseDelay)
        this.setPhase('Hunt');
      if (this.phase === 'Hunt') {
        for (const s of this.queue)
          if (
            !s.done &&
            this.phaseTime >= (s.at * this.tuning.spawnSpacing) / 4.2 &&
            this.roomKills >= s.after &&
            this.enemies.length < 5
          ) {
            s.done = true;
            this.spawn(s.kind, s.port);
          }
        for (const e of this.enemies) this.enemyStep(e, dt);
      } else if (this.phase === 'Familiar') this.familiarStep(dt);
      else if (this.phase === 'Intrusion') this.wizardStep(dt);
      else if (this.phase === 'Clear' && this.phaseTime >= this.phaseDelay)
        this.descend();
      this.sweep(dt);
      for (const e of this.enemies)
        if (e.warning <= 0)
          for (const p of this.players)
            if (p.alive && dist(e, p) < 0.5) this.damage(p);
      if (
        this.phase === 'Hunt' &&
        !this.enemies.length &&
        this.queue.every((s) => s.done)
      )
        this.beginFamiliar();
    }
    removeSeat(seat) {
      const p = this.players.find((p) => p.seat === seat);
      if (p?.bolt) {
        const b = this.bolts.find((b) => b.id === p.bolt);
        if (b) this.resolve(b);
      }
      this.players = this.players.filter((p) => p.seat !== seat);
      this.config.seats = this.config.seats.filter((s) => s !== seat);
    }
    export(withEntry = true) {
      const obj = {
        v: 1,
        config: I.copy(this.config),
        tuning: { ...this.tuning },
        rngState: this.rngState,
        nextId: this.nextId,
        eventSeq: this.eventSeq,
        events: this.events.slice(-20),
        ledger: { ...this.ledger },
      };
      for (const k of [
        'roomIndex',
        'roomTime',
        'phaseTime',
        'phaseDelay',
        'phase',
        'roomKills',
        'score',
        'currentMultiplier',
        'earnedNextMultiplier',
        'practice',
        'tick',
        'elapsed',
        'totalKills',
        'familiars',
        'banishments',
        'bells',
        'portals',
        'deaths',
        'players',
        'enemies',
        'posts',
        'familiar',
        'wizard',
        'manifest',
        'wizardHits',
        'wizardFailed',
        'familiarOutcome',
        'queue',
        'status',
      ])
        obj[k] = I.copy(this[k]);
      obj.bolts = I.copy(this.bolts);
      if (withEntry) obj.entry = I.copy(this.entry);
      return obj;
    }
    restore(data) {
      const valid = (d) =>
        d &&
        d.v === 1 &&
        I.ROOMS[d.roomIndex] &&
        I.DIFFICULTY[d.config?.difficulty] &&
        ['Entry', 'Hunt', 'Familiar', 'Intrusion', 'Clear'].includes(d.phase) &&
        ['playing', 'victory', 'defeat'].includes(d.status) &&
        [
          'score',
          'tick',
          'elapsed',
          'rngState',
          'nextId',
          'currentMultiplier',
          'earnedNextMultiplier',
          'roomTime',
          'phaseTime',
          'phaseDelay',
        ].every((k) => Number.isFinite(d[k])) &&
        ['players', 'enemies', 'posts', 'bolts', 'queue', 'events'].every((k) =>
          Array.isArray(d[k]),
        ) &&
        d.players.length > 0 &&
        d.players.length <= 2 &&
        d.enemies.length <= 50 &&
        d.bolts.length <= 100 &&
        d.queue.length <= 100 &&
        d.enemies.every((e) => I.FAMILIES[e.kind]) &&
        d.queue.every(
          (s) =>
            I.FAMILIES[s.kind] &&
            Number.isFinite(s.at) &&
            Number.isFinite(s.after) &&
            Array.isArray(s.port) &&
            s.port.length === 2 &&
            s.port.every(Number.isFinite),
        ) &&
        d.bolts.every(
          (b) =>
            ['player', 'hostile'].includes(b.team) &&
            ['x', 'y', 'vx', 'vy', 't', 'life'].every((k) =>
              Number.isFinite(b[k]),
            ),
        ) &&
        [...d.players, ...d.enemies, ...(d.familiar ? [d.familiar] : [])].every(
          (a) =>
            a &&
            a.m &&
            ['x', 'y', 'cx', 'cy'].every((k) => Number.isFinite(a.m[k])) &&
            a.m.x >= 0 &&
            a.m.x <= 20 &&
            a.m.y >= 0 &&
            a.m.y <= 12,
        ) &&
        d.players.every(
          (p) => Number.isInteger(p.seat) && Number.isFinite(p.lives),
        );
      if (!valid(data) || (data.entry && !valid(data.entry)))
        throw Error('Invalid checkpoint');
      const q = I.copy(data);
      delete q.bolts;
      delete q.v;
      Object.assign(this, q);
      this.buildGrid();
      for (const a of [
        ...this.players,
        ...this.enemies,
        ...(this.familiar ? [this.familiar] : []),
      ]) {
        const m = new E.GridMover();
        Object.assign(m, a.m);
        a.m = m;
      }
      this.pool.list = I.copy(data.bolts || []);
      return this;
    }
    retry() {
      const cp = I.copy(this.entry);
      this.restore(cp);
      this.entry = I.copy(cp);
      this.practice = true;
      this.status = 'playing';
      for (const p of this.players) {
        p.lives = Math.max(p.lives, I.DIFFICULTY[this.config.difficulty].lives);
        p.alive = true;
        p.protect = this.tuning.protection;
      }
      this.emit('retry');
    }
    snapshot() {
      return this.export();
    }
  }
  I.World = World;
  // Ordinary-command pilot, also used for the attract show and deterministic campaign evidence.
  I.bot = (world, p) => {
    if (!p?.alive) return { move: -1, aim: -1, fire: false };
    let target = null;
    if (
      world.phase === 'Intrusion' &&
      world.wizard &&
      ['warning', 'active'].includes(world.wizard.state)
    )
      target = { x: world.wizard.x, y: world.wizard.y };
    else if (world.familiar)
      target = { x: world.familiar.m.x, y: world.familiar.m.y };
    else {
      const es = world.enemies.filter((e) => e.warning <= 0),
        aligned = es.filter((e) => world.los(p, e));
      const e = (aligned.length ? aligned : es).sort(
        (a, b) => dist(a, p) - dist(b, p),
      )[0];
      if (e) target = { x: e.m.x, y: e.m.y };
    }
    if (!target) return { move: -1, aim: p.aim, fire: false };
    const dx = target.x - p.m.x,
      dy = target.y - p.m.y,
      aim = I.cardinal(dx, dy, p.aim),
      sight = world.los(p, target),
      distance = Math.hypot(dx, dy);
    const threats = world.enemies.filter((e) => e.warning <= 0);
    const closest = threats.length
      ? Math.min(...threats.map((e) => dist(e, p)))
      : 100;
    if (closest < (p.bolt ? 3 : 1.6)) {
      const ways = D.map((d, k) => ({ d, k })).filter((q) =>
        world.walk(p.m.cx + q.d[0], p.m.cy + q.d[1]),
      );
      const safety = (q) =>
        Math.min(
          ...threats.map((e) =>
            Math.hypot(
              p.m.x + q.d[0] * 1.1 - e.m.x,
              p.m.y + q.d[1] * 1.1 - e.m.y,
            ),
          ),
        );
      ways.sort((a, b) => safety(b) - safety(a));
      if (ways.length && safety(ways[0]) > closest + 0.2)
        return { move: ways[0].k, aim, fire: sight };
    }
    if (sight) {
      let move = -1;
      if (distance < 2) {
        const away = (aim + 2) % 4;
        if (world.walk(p.m.cx + D[away][0], p.m.cy + D[away][1])) move = away;
      }
      return { move, aim, fire: true };
    }
    const path = world.path(
      [p.m.moving ? p.m._to[0] : p.m.cx, p.m.moving ? p.m._to[1] : p.m.cy],
      [Math.round(target.x), Math.round(target.y)],
    );
    const next = path[1];
    let move = next
      ? I.cardinal(
          next[0] - (p.m.moving ? p.m._to[0] : p.m.cx),
          next[1] - (p.m.moving ? p.m._to[1] : p.m.cy),
        )
      : -1;
    return { move, aim, fire: false };
  };
})(globalThis);
