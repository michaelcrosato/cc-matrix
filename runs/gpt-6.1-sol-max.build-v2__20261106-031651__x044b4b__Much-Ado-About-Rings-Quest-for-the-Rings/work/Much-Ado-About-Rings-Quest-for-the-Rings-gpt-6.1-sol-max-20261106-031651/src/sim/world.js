(function (G) {
  'use strict';
  const M = G.MA,
    E = G.My3D2dge,
    D = M.distance;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cell = (p) => [Math.floor(p.x / 16), Math.floor(p.y / 16)];
  const neutral = () => ({
    mx: 0,
    my: 0,
    ax: 0,
    ay: 0,
    primary: false,
    power: false,
    dodge: false,
    interact: false,
    ping: false,
  });
  M.neutral = neutral;
  M.cleanInput = (raw) => {
    const c = neutral();
    if (!raw || typeof raw !== 'object') return c;
    for (const k of ['mx', 'my', 'ax', 'ay']) c[k] = Number.isFinite(raw[k]) ? clamp(raw[k], -1, 1) : 0;
    for (const k of ['primary', 'power', 'dodge', 'interact', 'ping']) c[k] = raw[k] === true;
    const n = Math.hypot(c.mx, c.my);
    if (n > 1) {
      c.mx /= n;
      c.my /= n;
    }
    return c;
  };
  function mapFor(def, phase = false) {
    const p = {
      dungeon: ['#696878', '#414457'],
      court: ['#728270', '#4d6054'],
      crystal: ['#6da4b1', '#3a667a'],
      inferno: ['#b8a48b', '#665d66'],
      shifting: ['#7d79a8', '#464865'],
      final: ['#877e9c', '#47445f'],
    }[def.family];
    const map = new E.TileMap({
      rows: def.rows,
      legend: {
        '#': 1,
        W: phase ? 0 : 2,
        C: phase ? 0 : 3,
        '~': { floor: 'lava', block: true },
        '.': { floor: 'stone' },
      },
      types: {
        1: { h: 36, cut: true, cutH: 10, top: p[0], side: p[1], face: 'stone', roof: 'slab' },
        2: { h: 23, cut: true, cutH: 9, top: p[0], side: p[1], face: 'stone', roof: 'slab' },
        3: { h: 25, cut: true, cutH: 9, top: '#91c7cc', side: '#43778a', face: 'crystal', roof: 'slab' },
        4: { h: 24, cut: true, cutH: 8, top: '#9c99c1', side: '#53506e', face: 'metal', roof: 'slab' },
      },
      floorTex: (x, y, tag) => {
        if (tag === 'lava') {
          const q = Math.sin(x * 0.15 + y * 0.09) + Math.sin(y * 0.18);
          return q > 0.9 ? [243, 157, 65, 0.8] : q > -0.8 ? [168, 65, 40, 0.4] : [75, 35, 38];
        }
        const palette = {
          court: ['#394d48', '#40574e', '#486153'],
          dungeon: ['#484752', '#51505b', '#545360'],
          crystal: ['#344c5c', '#3b5867', '#436372'],
          inferno: ['#66616a', '#78727b', '#827985'],
          shifting: ['#3d405a', '#484a64', '#53536e'],
          final: ['#434154', '#504b61', '#57516a'],
        }[def.family];
        return E.tex.flagstone(x, y, {
          stones: palette.map(E.hex),
          mortar: E.hex('#222535'),
          hi: E.hex(p[0]),
          lo: E.hex('#282b3c'),
          speck: E.hex('#5f5a69'),
        });
      },
      ao: 5,
      outside: '#151c29',
    });
    for (const prop of def.props)
      if (prop.solid) map.block(Math.floor(prop.x / 16), Math.floor(prop.y / 16), true);
    return map;
  }
  class World {
    constructor({
      seed = 73461,
      classes = ['warrior', 'wizard'],
      owners = [0, null],
      onCheckpoint = null,
      rng = null,
      demo = false,
    } = {}) {
      this.seed = seed;
      this.tick = 0;
      this.time = 0;
      this.epoch = 0;
      this.mode = 'court';
      this.dread = 0;
      this.rings = [];
      this.caches = [];
      this.shortcut = [];
      this.classes = [...classes];
      this.owners = [...owners];
      this.tuning = M.defaults();
      this.events = [];
      this.serial = 0;
      this.onCheckpoint = onCheckpoint;
      this.demo = demo;
      this.assisted = false;
      this.invulnerable = false;
      this.flags = {};
      this.stats = { downs: 0, revives: 0, passes: 0, hits: 0, rooms: [], retries: 0 };
      this.streams = {};
      this.randomSource = rng;
      this.loadRoom('court', false);
    }
    random(label) {
      if (!this.streams[label])
        this.streams[label] = this.randomSource ? this.randomSource(label) : M.rng(this.seed ^ M.hash(label));
      return this.streams[label]();
    }
    emit(type, data = {}) {
      const ev = { id: `${this.epoch}:${this.tick}:${++this.serial}`, tick: this.tick, type, ...data };
      this.events.push(ev);
      if (this.events.length > 1600) this.events.shift();
      return ev;
    }
    loadRoom(id, save = true) {
      if (!Object.hasOwn(M.ROOMS, id)) return false;
      const def = M.ROOMS[id];
      if (!def) return false;
      this.room = def;
      this.roomId = id;
      this.mode = id === 'court' ? 'court' : 'room';
      this.epoch++;
      this.roomTime = 0;
      this.transition = 0.6;
      this.reveal = 4;
      this.shiftState = 0;
      this.shiftTimer = 0;
      this.finalBeat = 'learn';
      this.finalLearn = 0;
      this.bound = [false, false, false, false];
      this.bindProgress = [0, 0, 0, 0];
      this.escape = 0;
      this.cacheClaimed = !!def.cache && this.caches.includes(def.site);
      this.cacheProgress = this.cacheClaimed ? 1 : 0;
      this.map = mapFor(def);
      this.phaseMap = mapFor(def, true);
      this.navVersion = 0;
      const shortcut = M.SITES.find((s) => this.rings.includes(s.id) && s.shortcutTo === def.site);
      const entrySpawns = shortcut && def.shortcutSpawns ? def.shortcutSpawns : def.spawns;
      this.activeShortcut = shortcut && def.shortcutSpawns ? shortcut.shortcut : null;
      this.heroes = entrySpawns.map((p, i) =>
        Object.assign(new E.Body({ ...p, r: 4, friction: 0, gravity: 700 }), {
          id: i,
          classId: this.classes[i],
          owner: this.owners[i],
          hp: 5,
          maxHp: 5,
          down: false,
          facing: -0.7,
          primaryCd: 0,
          powerCd: 0,
          powerTime: 0,
          dodgeTime: 0,
          dodgeCd: 0,
          hurt: 1.8,
          safe: { ...p },
          revive: 0,
          context: null,
          ai: this.owners[i] == null,
          aiReason: 'follow',
          stuck: 0,
          last: { ...p },
          trail: [],
          nav: [],
          navTime: 0,
          attack: new E.Attack(this.classes[i] === 'warrior' ? 'slash' : 'cast', {
            wind: 0.18,
            active: 0.16,
            recover: this.tuning.recovery,
            reach: 24,
          }),
          cmd: neutral(),
          stepped: 0,
        }),
      );
      this.enemies = def.enemies.map((e, i) => this.makeEnemy(e.kind, e.x, e.y, `e${i}`));
      this.projectiles = [];
      this.wards = [];
      this.lures = [];
      this.effects = [];
      this.ring = def.ring
        ? { ...def.ring, origin: { ...def.ring }, safe: { ...def.ring }, carrier: null, taken: false }
        : null;
      this.director = {
        budget: 3 + Math.min(3, this.dread),
        used: 0,
        cooldown: this.tuning.director + 6,
        last: null,
        reason: 'A new threshold grants a moment of mercy.',
        echo: false,
      };
      this.applyShift(0, true);
      this.emit('room-enter', { room: id, shortcut: this.activeShortcut });
      if (save) this.checkpoint();
      return true;
    }
    makeEnemy(kind, x, y, id) {
      return {
        id: id || `e${++this.serial}`,
        kind,
        x,
        y,
        z: 0,
        r: kind === 'dragon' ? 22 : 5,
        hp: kind === 'fighter' || kind === 'fire' || kind === 'echo' ? 2 : 999,
        facing: 1.5,
        vx: 0,
        vy: 0,
        stun: 0,
        resist: 0,
        hurt: 0,
        dead: false,
        cd: 2 + this.random('enemies') * 2,
        phase: 'idle',
        timer: 0,
        target: null,
        struck: false,
        nav: [],
        navTime: 0,
        attack: new E.Attack(kind === 'fire' ? 'cast' : 'claw', { wind: 0.85, active: 0.3, recover: 0.9 }),
        life: kind === 'echo' ? 12 : Infinity,
      };
    }
    chooser() {
      return Math.min(...this.owners.filter((v) => v != null));
    }
    reachable(site) {
      if (!M.SITES.some((s) => s.id === site)) return false;
      if (site === 'dungeon') return !this.rings.includes(site);
      if (!this.rings.includes('dungeon')) return false;
      if (site === 'final') return this.rings.length === 4;
      return !this.rings.includes(site) && !this.caches.includes(site);
    }
    intent(sender, action, value) {
      const seat = this.heroes.find((h) => h.owner === sender);
      if (!seat) return false;
      if (action === 'hero' && this.mode === 'board' && M.HEROES.some((h) => h.id === value)) {
        this.classes[seat.id] = value;
        seat.classId = value;
        this.emit('hero-change', { hero: seat.id, classId: value });
        this.checkpoint();
        return true;
      }
      if (
        action === 'companion-hero' &&
        sender === this.chooser() &&
        this.mode === 'board' &&
        this.heroes[1].ai &&
        M.HEROES.some((h) => h.id === value)
      ) {
        this.classes[1] = value;
        this.heroes[1].classId = value;
        this.emit('hero-change', { hero: 1, classId: value });
        this.checkpoint();
        return true;
      }
      if (sender !== this.chooser()) return false;
      if (action === 'travel' && this.mode === 'board' && this.reachable(value)) {
        this.dread = Math.min(6, this.dread + 1);
        this.site = value;
        this.loadRoom(M.SITES.find((s) => s.id === value).rooms[0]);
        this.emit('travel', { site: value, dread: this.dread });
        return true;
      }
      if (action === 'retry' && this.mode === 'failure') {
        this.dread = Math.min(6, this.dread + 1);
        this.stats.retries++;
        const room = this.roomId;
        this.loadRoom(room);
        this.emit('retry', { room, dread: this.dread });
        return true;
      }
      if (action === 'abandon' && ['failure', 'room'].includes(this.mode)) {
        this.toBoard();
        return true;
      }
      return false;
    }
    setOwner(i, owner) {
      this.owners[i] = owner;
      this.heroes[i].owner = owner;
      this.heroes[i].ai = owner == null;
      this.heroes[i].cmd = neutral();
      this.emit('ownership', { hero: i, owner });
    }
    toBoard() {
      this.mode = 'board';
      this.site = null;
      this.projectiles = [];
      this.heroes.forEach((h) => {
        h.hp = 5;
        h.down = false;
      });
      this.emit('board');
      this.checkpoint();
    }
    checkpoint() {
      if (!this.demo && this.onCheckpoint) this.onCheckpoint(this.save());
    }
    save() {
      return {
        version: 2,
        seed: this.seed,
        mode:
          this.mode === 'failure'
            ? 'failure'
            : this.mode === 'court'
              ? 'court'
              : this.mode === 'board' || this.mode === 'victory'
                ? 'board'
                : 'room',
        room: this.roomId,
        site: this.site || null,
        dread: this.dread,
        rings: [...this.rings],
        caches: [...this.caches],
        shortcut: [...this.shortcut],
        classes: [...this.classes],
        flags: { ...this.flags },
        stats: JSON.parse(JSON.stringify(this.stats)),
        assisted: this.assisted,
        elapsed: this.time,
      };
    }
    static validSave(s) {
      return (
        !!s &&
        s.version === 2 &&
        Number.isFinite(s.seed) &&
        ['court', 'board', 'room', 'failure'].includes(s.mode) &&
        typeof s.room === 'string' &&
        Object.hasOwn(M.ROOMS, s.room) &&
        (!['room', 'failure'].includes(s.mode) || s.site === M.ROOMS[s.room].site) &&
        (s.site == null || M.SITES.some((site) => site.id === s.site)) &&
        s.flags &&
        typeof s.flags === 'object' &&
        !Array.isArray(s.flags) &&
        Object.values(s.flags).every((value) => typeof value === 'boolean') &&
        typeof s.assisted === 'boolean' &&
        s.stats &&
        typeof s.stats === 'object' &&
        Array.isArray(s.stats.rooms) &&
        s.stats.rooms.every((id) => Object.hasOwn(M.ROOMS, id)) &&
        ['downs', 'revives', 'passes', 'hits', 'retries'].every(
          (key) => Number.isInteger(s.stats[key]) && s.stats[key] >= 0,
        ) &&
        Number.isInteger(s.dread) &&
        s.dread >= 0 &&
        s.dread <= 6 &&
        Array.isArray(s.rings) &&
        new Set(s.rings).size === s.rings.length &&
        s.rings.every((r) => ['dungeon', 'crystal', 'inferno', 'shifting'].includes(r)) &&
        Array.isArray(s.caches) &&
        new Set(s.caches).size === s.caches.length &&
        s.caches.every((r) => ['cache1', 'cache2'].includes(r)) &&
        Array.isArray(s.classes) &&
        s.classes.length === 2 &&
        s.classes.every((c) => M.HEROES.some((h) => h.id === c)) &&
        (!s.rings.length || s.rings.includes('dungeon')) &&
        (s.room !== 'final' || s.rings.length === 4) &&
        Number.isFinite(s.elapsed) &&
        s.elapsed >= 0
      );
    }
    static restore(s, opts = {}) {
      if (!World.validSave(s)) return null;
      const w = new World({ ...opts, seed: s.seed, classes: s.classes });
      for (const k of ['dread', 'rings', 'caches', 'classes', 'flags', 'assisted'])
        w[k] = JSON.parse(JSON.stringify(s[k] ?? {}));
      w.shortcut = [...s.rings];
      if (s.stats && typeof s.stats === 'object') w.stats = { ...w.stats, ...s.stats };
      w.time = s.elapsed;
      w.site = s.site;
      w.loadRoom(s.room, false);
      w.mode = s.mode;
      if (s.mode === 'failure')
        w.heroes.forEach((h) => {
          h.hp = 0;
          h.down = true;
        });
      return w;
    }
    safe(x, y, phase = false) {
      const [cx, cy] = cell({ x, y });
      if (cx <= 0 || cy <= 0 || cx >= this.room.w - 1 || cy >= this.room.h - 1) return false;
      return (phase ? this.phaseMap : this.map).walkable(cx, cy);
    }
    nearestSafe(p, around = p) {
      const [cx, cy] = cell(around);
      for (let r = 0; r < 7; r++)
        for (let y = cy - r; y <= cy + r; y++)
          for (let x = cx - r; x <= cx + r; x++)
            if (this.safe(x * 16 + 8, y * 16 + 8) && !this.dangerAt(x * 16 + 8, y * 16 + 8, true))
              return { x: x * 16 + 8, y: y * 16 + 8 };
      return { ...this.room.fallback };
    }
    applyShift(state, first = false) {
      if (!this.room.shifts.length) return;
      for (const s of this.room.shifts) {
        for (const [x, y] of [...s.a, ...s.b]) {
          this.map.set(x, y, 0);
          this.phaseMap.set(x, y, 0);
        }
        for (const [x, y] of state ? s.b : s.a) this.map.set(x, y, 4);
      }
      this.shiftState = state;
      this.navVersion++;
      for (const h of this.heroes)
        if (!this.safe(h.x, h.y) && !(h.classId === 'phantom' && h.powerTime > 0)) {
          const p = this.nearestSafe(h);
          h.x = p.x;
          h.y = p.y;
          h.safe = p;
          h.hurt = Math.max(h.hurt, 0.6);
          this.emit('safe-shift', { hero: h.id, ...p });
        }
      for (const e of this.enemies)
        if (e.kind !== 'dragon' && !this.safe(e.x, e.y)) Object.assign(e, this.nearestSafe(e));
      if (this.ring && this.ring.carrier == null && !this.safe(this.ring.x, this.ring.y)) this.returnRing();
      if (!first) this.emit('shift', { state });
    }
    hazardState(lane) {
      const t = (this.roomTime + lane.offset) % lane.period,
        tele = this.tuning.telegraph;
      const forced = this.directorLane != null && this.directorLane > this.roomTime;
      if (forced && t > tele + 1.1) return 'warning';
      return t < tele ? 'warning' : t < tele + 1.1 ? 'active' : 'safe';
    }
    wardAt(x, y) {
      return this.wards.some((w) => Math.hypot(w.x - x, w.y - y) < w.r);
    }
    dangerAt(x, y, warning = false) {
      const [cx, cy] = cell({ x, y });
      if (this.map.floorAt(x, y) === 'lava') return true;
      for (const lane of this.room.hazards)
        if (
          (this.hazardState(lane) === 'active' || (warning && this.hazardState(lane) === 'warning')) &&
          lane.cells.some(([a, b]) => a === cx && b === cy) &&
          !this.wardAt(x, y)
        )
          return true;
      for (const e of this.enemies) {
        if (
          e.kind === 'dragon' &&
          e.target &&
          ['wind', 'active'].includes(e.phase) &&
          this.dragonThreat(e, { x, y }, warning)
        )
          return true;
        if (
          e.target &&
          ['wind', 'active'].includes(e.phase) &&
          (e.kind === 'spider' || e.kind === 'nightmare') &&
          Math.hypot(x - e.target.x, y - e.target.y) < 16
        )
          return true;
      }
      return false;
    }
    dragonThreat(e, point, preview = false) {
      if (!e.target || !['wind', 'active'].includes(e.phase) || this.wardAt(point.x, point.y)) return false;
      if (e.phase === 'wind' && !preview) return false;
      const base = Math.atan2(e.target.y - e.y, e.target.x - e.x);
      const angle =
        e.phase === 'wind' || preview ? base : base - 0.45 + (1 - Math.max(0, e.timer) / 0.85) * 0.9;
      const width = e.phase === 'wind' || preview ? 0.55 : 0.065 + 5 / Math.max(20, D(e, point));
      return (
        D(e, point) < 430 &&
        Math.abs(E.angDiff(Math.atan2(point.y - e.y, point.x - e.x), angle)) < width &&
        this.map.los(e.x, e.y, point.x, point.y)
      );
    }
    findPath(from, target, cautious = false) {
      const [sx, sy] = cell(from),
        [tx, ty] = cell(target),
        w = this.room.w,
        h = this.room.h,
        start = sy * w + sx,
        dest = ty * w + tx;
      if (sx === tx && sy === ty) return [target];
      if (!this.safe(target.x, target.y)) return [];
      const cost = new Float64Array(w * h).fill(Infinity),
        prev = new Int32Array(w * h).fill(-1),
        open = [start],
        closed = new Set();
      cost[start] = 0;
      while (open.length) {
        let best = 0,
          rank = Infinity;
        for (let i = 0; i < open.length; i++) {
          const n = open[i],
            r = cost[n] + Math.abs((n % w) - tx) + Math.abs(Math.floor(n / w) - ty);
          if (r < rank) {
            best = i;
            rank = r;
          }
        }
        const n = open.splice(best, 1)[0];
        if (n === dest) break;
        if (closed.has(n)) continue;
        closed.add(n);
        const x = n % w,
          y = Math.floor(n / w);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const a = x + dx,
            b = y + dy,
            q = b * w + a;
          if (a < 1 || b < 1 || a >= w - 1 || b >= h - 1 || !this.map.walkable(a, b) || closed.has(q))
            continue;
          const penalty = cautious && this.dangerAt(a * 16 + 8, b * 16 + 8, true) ? 15 : 0;
          const nc = cost[n] + 1 + penalty;
          if (nc < cost[q]) {
            cost[q] = nc;
            prev[q] = n;
            open.push(q);
          }
        }
      }
      if (!Number.isFinite(cost[dest])) return [];
      const path = [];
      let n = dest;
      for (let i = 0; i < w * h && n !== start; i++) {
        path.push({ x: (n % w) * 16 + 8, y: Math.floor(n / w) * 16 + 8 });
        n = prev[n];
        if (n < 0) return [];
      }
      return path.reverse();
    }
    steer(actor, target, dt, cautious = false) {
      actor.navTime -= dt;
      const key = `${Math.floor(target.x / 16)},${Math.floor(target.y / 16)},${this.navVersion}`;
      if (actor.navTime <= 0 || actor.navKey !== key || !actor.nav.length) {
        actor.nav = this.findPath(actor, target, cautious);
        actor.navTime = cautious ? this.tuning.companion : 0.7;
        actor.navKey = key;
      }
      while (actor.nav.length > 1 && D(actor, actor.nav[0]) < 3) actor.nav.shift();
      const goal = actor.nav[0] || target,
        dx = goal.x - actor.x,
        dy = goal.y - actor.y,
        n = Math.hypot(dx, dy);
      if (n < 2) return [0, 0];
      if (
        cautious &&
        this.dangerAt(goal.x, goal.y, true) &&
        !this.dangerAt(actor.x, actor.y, true) &&
        D(actor, goal) < 17
      )
        return [0, 0];
      return [dx / n, dy / n];
    }
    objectivePoint(h) {
      if (this.roomId === 'final') {
        if (this.finalBeat === 'escape') return this.room.exit;
        const available = this.room.stations.map((p, i) => ({ ...p, i })).filter((p) => !this.bound[p.i]);
        return available.sort((a, b) => D(h, a) - D(h, b))[0] || this.room.exit;
      }
      if (this.room.cache && !this.cacheClaimed) return this.room.cache;
      if (this.ring && this.ring.carrier == null) return this.ring;
      return this.room.exit;
    }
    aiInput(h, dt) {
      const c = neutral(),
        partner = this.heroes[1 - h.id];
      let target = partner,
        reason = 'follow';
      if (this.dangerAt(h.x, h.y, true)) {
        target = this.nearestSafe(h);
        reason = 'escape hazard';
      } else if (partner.down) {
        target = partner;
        c.interact = true;
        reason = 'safe revive';
      } else if (this.ring && this.ring.carrier === h.id) {
        target = this.room.exit;
        c.interact = true;
        reason = 'carry to exit';
      } else if (this.demo || (this.ping && this.ping.until > this.time && this.ping.mode === 'objective')) {
        target = this.objectivePoint(h);
        c.interact = true;
        reason = 'objective';
      } else if (this.ring && this.ring.carrier != null) {
        target = partner;
        reason = 'support carrier';
      }
      if ((reason === 'follow' || reason === 'support carrier') && D(h, partner) < 27) target = h;
      const [mx, my] = this.steer(h, target, dt, true);
      c.mx = mx;
      c.my = my;
      const enemy = this.enemies
        .filter((e) => !e.dead && e.kind !== 'dragon')
        .sort((a, b) => D(h, a) - D(h, b))[0];
      if (enemy && D(h, enemy) < 95) {
        const dx = enemy.x - h.x,
          dy = enemy.y - h.y,
          n = Math.hypot(dx, dy) || 1;
        c.ax = dx / n;
        c.ay = dy / n;
        c.primary = D(h, enemy) < (h.classId === 'wizard' ? 100 : 39);
        c.power = D(h, enemy) < 43 || reason === 'safe revive';
      }
      if (this.dangerAt(h.x, h.y, true)) {
        c.dodge = true;
        if (h.classId === 'wizard') c.power = true;
      }
      h.aiReason = reason;
      const moved = D(h, h.last);
      if (moved < 0.025 && Math.hypot(mx, my) > 0.1) h.stuck += dt;
      else h.stuck = Math.max(0, h.stuck - dt * 2);
      h.last = { x: h.x, y: h.y };
      if (
        h.stuck > 4.5 &&
        D(h, partner) < 115 &&
        !partner.down &&
        this.map.los(h.x, h.y, partner.x, partner.y)
      ) {
        const p = this.nearestSafe(partner);
        Object.assign(h, p);
        h.stuck = 0;
        this.emit('companion-return', { hero: h.id, ...p });
      }
      return c;
    }
    contextFor(h) {
      if (h.down) return null;
      const partner = this.heroes[1 - h.id];
      if (partner.down && D(h, partner) < 24)
        return {
          type: 'revive',
          target: partner.id,
          text: 'Hold to revive',
          progress: partner.revive / this.tuning.revive,
        };
      if (this.roomId === 'final' && this.finalBeat === 'bind') {
        const i = this.room.stations.findIndex((p, j) => !this.bound[j] && D(h, p) < 25);
        if (i >= 0)
          return {
            type: 'bind',
            target: i,
            text: `Hold to bind ${M.SITES[i].rune}`,
            progress: this.bindProgress[i] / 2.4,
          };
      }
      if (this.room.cache && !this.cacheClaimed && D(h, this.room.cache) < 23)
        return {
          type: 'cache',
          text: this.room.rescue ? 'Hold to rescue the keeper' : 'Wake the moonwell',
          progress: this.cacheProgress || 0,
        };
      if (this.ring && this.ring.carrier == null && D(h, this.ring) < 23)
        return { type: 'pickup', text: 'Take the ring' };
      if (
        D(h, this.room.exit) < 25 &&
        (!this.ring || this.ring.carrier === h.id) &&
        (!this.room.cache || this.cacheClaimed) &&
        (this.roomId !== 'final' || this.finalBeat === 'escape')
      )
        return {
          type: 'exit',
          text: this.ring
            ? 'Hold to secure the ring'
            : this.roomId === 'final'
              ? 'Hold to escape together'
              : 'Hold to cross the arch',
          progress: this.escape / 1.15,
        };
      if (
        this.ring &&
        this.ring.carrier === h.id &&
        !h.contextUsed &&
        !partner.down &&
        D(h, partner) < 28 &&
        (partner.ai || partner.cmd.interact)
      )
        return { type: 'pass', target: partner.id, text: 'Pass to willing companion' };
      return null;
    }
    primary(h) {
      if (h.primaryCd > 0 || h.down || h.attack.busy) return;
      h.primaryCd = this.tuning.recovery + 0.34;
      h.attack.spec.recover = this.tuning.recovery;
      h.attack.start();
      this.emit('primary', { hero: h.id, classId: h.classId, x: h.x, y: h.y });
      h.pendingPrimary = true;
    }
    releasePrimary(h) {
      if (!h.pendingPrimary) return;
      h.pendingPrimary = false;
      this.emit('primary-active', { hero: h.id, classId: h.classId, x: h.x, y: h.y });
      if (h.classId === 'wizard')
        this.projectiles.push({
          id: `p${++this.serial}`,
          x: h.x,
          y: h.y,
          z: 18,
          vx: Math.cos(h.facing) * 150,
          vy: Math.sin(h.facing) * 150,
          life: 1.3,
          team: 'hero',
          owner: h.id,
          color: '#a8d4ff',
        });
      if (h.classId === 'phantom') {
        this.reveal = 4;
        for (const e of this.enemies)
          if (!e.dead && D(h, e) < 50) {
            this.stun(e, 0.85, h);
            if (['fighter', 'fire', 'echo'].includes(e.kind)) {
              const n = D(h, e) || 1,
                p = { x: e.x + ((e.x - h.x) / n) * 12, y: e.y + ((e.y - h.y) / n) * 12 };
              if (this.safe(p.x, p.y) && this.map.los(e.x, e.y, p.x, p.y)) Object.assign(e, p);
            }
          }
        this.emit('reveal', { hero: h.id });
      }
      if (h.classId === 'changeling') {
        this.lures = this.lures.filter((l) => l.owner !== h.id);
        const desired = { x: h.x + Math.cos(h.facing) * 20, y: h.y + Math.sin(h.facing) * 20 };
        const at =
          this.safe(desired.x, desired.y) && this.map.los(h.x, h.y, desired.x, desired.y) ? desired : h.safe;
        this.lures.push({
          owner: h.id,
          x: at.x,
          y: at.y,
          life: 5,
        });
      }
    }
    power(h) {
      if (h.powerCd > 0 || h.down) return;
      h.powerCd = this.tuning.cooldown;
      h.powerTime = this.tuning.duration;
      this.emit('power', { hero: h.id, classId: h.classId });
      if (h.classId === 'wizard')
        this.wards.push({ owner: h.id, x: h.x, y: h.y, r: 42, life: this.tuning.duration });
    }
    stun(e, duration, source) {
      if (e.kind === 'dragon') {
        e.hurt = 0.35;
        this.emit('deflect', { enemy: e.id });
        return;
      }
      e.stun = Math.max(e.stun, duration * (e.resist > 0 ? 0.35 : 1));
      e.resist = duration + 3;
      e.phase = 'idle';
      e.attack.cancel();
      e.hurt = 0.25;
      this.emit('stun', { enemy: e.id, hero: source.id, x: e.x, y: e.y });
    }
    hurt(h, amount, source) {
      if (h.down || h.hurt > 0 || h.dodgeTime > 0 || this.invulnerable || this.demo) return false;
      if (h.classId === 'warrior' && h.powerTime > 0) {
        const a = source ? Math.atan2(source.y - h.y, source.x - h.x) : h.facing;
        if (Math.abs(E.angDiff(h.facing, a)) < 1.7) {
          this.emit('guard', { hero: h.id });
          return false;
        }
      }
      if (this.flags.teamWard) {
        this.flags.teamWard = false;
        h.hurt = 1;
        this.emit('ward-save', { hero: h.id });
        return false;
      }
      h.hp = Math.max(0, h.hp - amount);
      h.hurt = 1.35;
      this.stats.hits++;
      this.emit('hurt', { hero: h.id, x: h.x, y: h.y });
      h.interrupt = 0.45;
      if (h.context && h.context.type === 'revive') this.heroes[h.context.target].revive = 0;
      if (h.context && h.context.type === 'bind') this.bindProgress[h.context.target] = 0;
      if (h.hp <= 0) {
        h.down = true;
        h.powerTime = 0;
        h.attack.cancel();
        this.stats.downs++;
        this.emit('down', { hero: h.id });
        if (this.ring && this.ring.carrier === h.id) {
          this.ring.carrier = null;
          const p = this.nearestSafe(h);
          this.ring.x = p.x;
          this.ring.y = p.y;
          this.ring.safe = p;
          this.emit('drop', { hero: h.id, ...p });
        }
      }
      return true;
    }
    returnRing() {
      if (!this.ring) return;
      const p = this.nearestSafe(this.ring.safe);
      this.ring.x = p.x;
      this.ring.y = p.y;
      this.ring.carrier = null;
      this.emit('ring-return', p);
    }
    interact(h, dt) {
      const ctx = h.context;
      if (!ctx || !h.cmd.interact || h.interrupt > 0) return;
      if (ctx.type === 'revive') {
        const p = this.heroes[ctx.target];
        p.revive += dt;
        if (p.revive >= this.tuning.revive) {
          p.down = false;
          p.hp = 3;
          p.revive = 0;
          p.hurt = 3;
          this.director.cooldown = Math.max(this.director.cooldown, 5);
          this.stats.revives++;
          this.emit('revive', { hero: p.id, by: h.id });
        }
      } else if (ctx.type === 'pickup' && this.ring.carrier == null && !h.contextUsed) {
        h.contextUsed = true;
        this.ring.carrier = h.id;
        this.ring.taken = true;
        this.emit('pickup', { hero: h.id, x: h.x, y: h.y });
      } else if (ctx.type === 'pass' && !this.passLock && !h.contextUsed) {
        h.contextUsed = true;
        this.ring.carrier = ctx.target;
        this.passLock = 1.2;
        this.stats.passes++;
        this.emit('pass', { from: h.id, to: ctx.target });
      } else if (ctx.type === 'cache') {
        this.cacheProgress = (this.cacheProgress || 0) + dt / (this.room.rescue ? this.tuning.revive : 0.8);
        if (this.cacheProgress >= 1 && !this.cacheClaimed) {
          this.cacheClaimed = true;
          this.flags.teamWard = true;
          this.heroes.forEach((p) => {
            p.hp = 5;
            p.down = false;
          });
          if (!this.caches.includes(this.site)) this.caches.push(this.site);
          this.emit('cache', { site: this.site });
          this.checkpoint();
        }
      } else if (ctx.type === 'bind') {
        const i = ctx.target;
        this.bindProgress[i] += dt;
        if (this.bindProgress[i] >= 2.4 && !this.bound[i]) {
          this.bound[i] = true;
          h.hurt = 3;
          this.emit('bind', { station: i });
          this.director.cooldown = Math.max(this.director.cooldown, 4);
          if (this.bound.every(Boolean)) {
            this.finalBeat = 'escape';
            this.enemies.forEach((e) => {
              e.phase = 'bound';
              e.target = null;
            });
            this.projectiles = [];
            this.emit('dragon-bound');
          }
        }
      } else if (ctx.type === 'exit') {
        this.escape += dt;
        if (this.escape >= 1.15) this.completeRoom();
      }
    }
    completeRoom() {
      if (this.transition > 0 || !['room', 'court'].includes(this.mode)) return;
      const id = this.roomId;
      if (!this.stats.rooms.includes(id)) this.stats.rooms.push(id);
      this.emit('room-complete', { room: id });
      if (id === 'court') {
        this.flags.taught = true;
        this.toBoard();
      } else if (id === 'final' && this.bound.every(Boolean) && this.rings.length === 4) {
        this.mode = 'victory';
        this.emit('victory', { assisted: this.assisted });
        this.checkpoint();
      } else if (this.room.index === 0 && !this.room.cache) {
        const next = M.SITES.find((s) => s.id === this.site).rooms[1];
        this.loadRoom(next);
      } else {
        if (this.ring && this.ring.carrier != null && !this.rings.includes(this.site)) {
          this.rings.push(this.site);
          this.shortcut.push(this.site);
          this.emit('ring-secured', { site: this.site });
        }
        this.toBoard();
      }
    }
    updateHero(h, dt) {
      for (const k of ['primaryCd', 'powerCd', 'dodgeTime', 'dodgeCd', 'hurt', 'interrupt'])
        h[k] = Math.max(0, (h[k] || 0) - dt);
      const wasPower = h.powerTime;
      h.powerTime = Math.max(0, h.powerTime - dt);
      if (wasPower > 0 && h.powerTime === 0 && h.classId === 'phantom' && !this.safe(h.x, h.y)) {
        Object.assign(h, h.safe);
        h.vx = 0;
        h.vy = 0;
        this.emit('phase-return', { hero: h.id, ...h.safe });
      }
      const phase = h.attack.update(dt);
      if (phase === 'active' && !h.down) this.releasePrimary(h);
      if (h.down) {
        h.vx = h.vy = 0;
        return;
      }
      const c = h.cmd;
      if (c.ping && !h.pingHeld) {
        this.ping = {
          mode: this.ping && this.ping.mode === 'objective' ? 'follow' : 'objective',
          until: this.time + 12,
        };
        this.emit('ping', { mode: this.ping.mode });
      }
      h.pingHeld = c.ping;
      if (Math.hypot(c.ax, c.ay) > 0.2) h.facing = Math.atan2(c.ay, c.ax);
      else if (Math.hypot(c.mx, c.my) > 0.1) h.facing = Math.atan2(c.my, c.mx);
      if (c.primary) this.primary(h);
      if (c.power) this.power(h);
      if (c.dodge && h.dodgeCd <= 0) {
        h.dodgeCd = 1.1;
        h.dodgeTime = 0.28;
        h.dodgeDir = Math.hypot(c.mx, c.my) > 0.1 ? [c.mx, c.my] : [Math.cos(h.facing), Math.sin(h.facing)];
        this.emit('dodge', { hero: h.id });
      }
      let speed = this.tuning.speed * (h.attack.busy ? 0.72 : 1);
      if (h.powerTime > 0)
        speed *=
          h.classId === 'warrior' ? 0.62 : h.classId === 'phantom' || h.classId === 'changeling' ? 0.65 : 1;
      h.vx = h.dodgeTime > 0 ? h.dodgeDir[0] * speed * 2.65 : c.mx * speed;
      h.vy = h.dodgeTime > 0 ? h.dodgeDir[1] * speed * 2.65 : c.my * speed;
      const ox = h.x,
        oy = h.y;
      h.update(dt, h.classId === 'phantom' && h.powerTime > 0 ? this.phaseMap : this.map);
      if (!this.safe(h.x, h.y, h.classId === 'phantom' && h.powerTime > 0)) {
        h.x = ox;
        h.y = oy;
      }
      if (this.safe(h.x, h.y) && !this.dangerAt(h.x, h.y, true)) h.safe = { x: h.x, y: h.y };
      if (this.map.floorAt(h.x, h.y) === 'lava') this.hurt(h, this.tuning.damage * 2, null);
      if (this.dangerAt(h.x, h.y) && !this.wardAt(h.x, h.y)) {
        const flame = this.room.hazards.some(
          (l) =>
            this.hazardState(l) === 'active' &&
            l.cells.some(([x, y]) => Math.floor(h.x / 16) === x && Math.floor(h.y / 16) === y),
        );
        if (flame) this.hurt(h, this.tuning.damage, null);
      }
      if (h.classId === 'warrior')
        h.attack.hits(
          this.enemies,
          (e) => !e.dead && E.inArc(h, h.facing, e, 30, 1.15),
          (e) => {
            if (['fighter', 'fire', 'echo'].includes(e.kind)) {
              e.hp -= 2;
              if (e.hp <= 0) {
                e.dead = true;
                this.emit('enemy-defeat', { enemy: e.id, x: e.x, y: e.y });
              }
            } else this.stun(e, 1.2, h);
            e.hurt = 0.3;
            this.emit('hit', { enemy: e.id, hero: h.id, x: e.x, y: e.y });
          },
        );
    }
    updateEnemy(e, dt) {
      if (e.dead) return;
      e.life -= dt;
      if (e.life <= 0) {
        e.dead = true;
        return;
      }
      for (const k of ['stun', 'resist', 'hurt', 'cd']) e[k] = Math.max(0, e[k] - dt);
      e.attack.update(dt);
      if (e.stun > 0 || this.transition > 0 || e.phase === 'bound') {
        e.vx = e.vy = 0;
        return;
      }
      for (const h of this.heroes)
        if (h.classId === 'changeling' && h.powerTime > 0 && D(h, e) < 10)
          this.hurt(h, this.tuning.damage, e);
      let targets = this.heroes.filter(
        (h) =>
          !h.down &&
          !(h.classId === 'changeling' && h.powerTime > 0 && (!this.ring || this.ring.carrier !== h.id)),
      );
      if (this.lures.length && e.kind !== 'dragon')
        targets = [...targets, ...this.lures.map((l) => ({ ...l, lure: true }))];
      targets.sort(
        (a, b) =>
          D(e, a) * (a.lure ? 0.25 : this.ring && this.ring.carrier === a.id ? 0.65 : 1) -
          D(e, b) * (b.lure ? 0.25 : this.ring && this.ring.carrier === b.id ? 0.65 : 1),
      );
      const target = targets[0];
      if (!target) return;
      e.facing = Math.atan2(target.y - e.y, target.x - e.x);
      e.vx = e.vy = 0;
      const ranged = e.kind === 'fire' || (e.kind === 'echo' && e.copy === 'wizard');
      const range =
        e.kind === 'dragon'
          ? 999
          : ranged
            ? 135
            : e.kind === 'spider'
              ? 75
              : e.kind === 'nightmare'
                ? 85
                : 23;
      if (e.phase === 'idle') {
        if (
          D(e, target) < range &&
          e.cd <= 0 &&
          (e.kind === 'dragon' || e.kind === 'nightmare' || this.map.los(e.x, e.y, target.x, target.y))
        ) {
          e.phase = 'wind';
          e.timer = e.kind === 'dragon' ? 2.2 : e.kind === 'spider' ? 1.15 : 0.85;
          e.target = { x: target.x, y: target.y };
          e.struck = false;
          e.attack.start();
          this.emit('enemy-wind', { enemy: e.id, kind: e.kind, ...e.target });
        } else if (e.kind !== 'dragon' && D(e, target) > (ranged ? 80 : 17)) {
          const length = D(e, target) || 1;
          const [dx, dy] =
            e.kind === 'nightmare'
              ? [(target.x - e.x) / length, (target.y - e.y) / length]
              : this.steer(e, target, dt);
          const speed =
            this.tuning.enemySpeed *
            (e.kind === 'nightmare' ? 1.18 : e.kind === 'spider' ? 0.6 : 1) *
            (1 + this.dread * 0.025);
          e.vx = dx * speed;
          e.vy = dy * speed;
          const nx = e.x + e.vx * dt,
            ny = e.y + e.vy * dt;
          if (e.kind === 'nightmare' ? nx > 20 && nx < (this.room.w - 1) * 16 - 4 : this.safe(nx, e.y))
            e.x = nx;
          if (e.kind === 'nightmare' ? ny > 20 && ny < (this.room.h - 1) * 16 - 4 : this.safe(e.x, ny))
            e.y = ny;
        }
      } else {
        e.timer -= dt;
        if (e.phase === 'wind' && e.timer <= 0) {
          e.phase = 'active';
          e.timer = e.kind === 'dragon' ? 0.85 : 0.32;
          if (ranged) {
            const n = Math.hypot(e.target.x - e.x, e.target.y - e.y) || 1;
            this.projectiles.push({
              id: `p${++this.serial}`,
              x: e.x,
              y: e.y,
              z: 15,
              vx: ((e.target.x - e.x) / n) * 69,
              vy: ((e.target.y - e.y) / n) * 69,
              life: 2.5,
              team: 'enemy',
              color: e.kind === 'echo' ? '#c5a1ee' : '#ffb36d',
            });
          }
          if (e.kind === 'spider' || e.kind === 'nightmare') {
            const p = this.nearestSafe(e.target);
            e.x = p.x;
            e.y = p.y;
          }
          this.emit('enemy-active', { enemy: e.id, kind: e.kind });
        }
        if (e.kind === 'dragon' && e.phase === 'active' && e.target) {
          const angle =
            Math.atan2(e.target.y - e.y, e.target.x - e.x) - 0.45 + (1 - Math.max(0, e.timer) / 0.85) * 0.9;
          const end = { x: e.x + Math.cos(angle) * 430, y: e.y + Math.sin(angle) * 430 };
          const ray = this.map.ray({ x: e.x, y: e.y, z: -25 }, { ...end, z: -25 }, { eye: 30, target: 30 });
          e.breath = ray.clear ? end : { x: ray.x, y: ray.y };
        }
        if (e.phase === 'active')
          for (const h of this.heroes) {
            const hit =
              e.kind === 'dragon'
                ? this.dragonThreat(e, h)
                : ranged
                  ? false
                  : D(h, e) < (e.kind === 'echo' && e.copy === 'phantom' ? 35 : 19);
            if (hit && !this.wardAt(h.x, h.y)) this.hurt(h, this.tuning.damage, e);
          }
        if (e.phase === 'active' && e.timer <= 0) {
          e.phase = 'recover';
          e.timer = 1.05;
        }
        if (e.phase === 'recover' && e.timer <= 0) {
          e.phase = 'idle';
          e.target = null;
          e.cd = this.tuning.enemyCadence * (1 - Math.min(0.3, this.dread * 0.025));
        }
      }
    }
    updateDirector(dt) {
      const d = this.director;
      d.cooldown -= dt;
      if (
        (this.room.teaching && this.roomTime < 15) ||
        this.roomId === 'court' ||
        this.heroes.some((h) => h.down || h.revive > 0) ||
        this.transition > 0 ||
        this.finalBeat === 'escape' ||
        this.mode !== 'room'
      )
        return;
      if (d.cooldown > 0 || d.used >= d.budget) return;
      const options = ['possession', 'reinforcement'];
      if (this.room.hazards.length) options.push('lane');
      if (this.room.shifts.length) options.push('partition');
      const choice = options[Math.floor(this.random('director') * options.length)];
      d.used++;
      d.cooldown = Math.max(7, this.tuning.director * (1 - this.dread * this.tuning.dread * 0.5));
      d.last = choice;
      d.reason =
        this.ring && this.ring.carrier != null
          ? 'The stolen ring has drawn the watcher’s gaze.'
          : this.dread > 3
            ? 'The hourglass permits a stronger authored event.'
            : 'The party has found its footing.';
      if (choice === 'partition') {
        this.shiftTimer = Math.max(this.shiftTimer, 6);
      } else if (choice === 'lane') this.directorLane = this.roomTime + this.tuning.telegraph;
      else {
        const candidates = [
          { x: 40, y: 40 },
          { x: (this.room.w - 3) * 16, y: (this.room.h - 3) * 16 },
          { x: 40, y: (this.room.h - 4) * 16 },
        ]
          .map((p) => this.nearestSafe(p))
          .filter((p) => this.heroes.every((h) => D(h, p) > 100));
        if (candidates.length) {
          const p = candidates[Math.floor(this.random('director-spawn') * candidates.length)];
          const enemy = this.makeEnemy(choice === 'possession' ? 'echo' : 'fighter', p.x, p.y);
          if (choice === 'possession') {
            enemy.copy = this.heroes[d.used % 2].classId;
            enemy.attack = new E.Attack(enemy.copy === 'warrior' ? 'slash' : 'cast', {
              wind: 0.85,
              active: 0.3,
              recover: 0.9,
            });
          }
          enemy.cd = 2.5;
          this.enemies.push(enemy);
        }
      }
      this.emit('director', { event: choice, reason: d.reason });
    }
    step(dt = 1 / 120, commands = []) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return;
      this.tick++;
      this.time += dt;
      if (!['room', 'court'].includes(this.mode)) return;
      this.roomTime += dt;
      this.transition = Math.max(0, this.transition - dt);
      this.reveal = Math.max(0, this.reveal - dt);
      this.passLock = Math.max(0, (this.passLock || 0) - dt);
      this.shiftTimer += dt;
      if (this.room.shifts.length && this.shiftTimer >= 8) {
        this.shiftTimer = 0;
        this.applyShift(1 - this.shiftState);
      }
      if (this.roomId === 'final' && this.finalBeat === 'learn') {
        this.finalLearn += dt;
        if (this.finalLearn >= 7) {
          this.finalBeat = 'bind';
          this.emit('seals-open');
        }
      }
      const epoch = this.epoch;
      for (const h of this.heroes) {
        h.cmd = M.cleanInput(h.ai ? this.aiInput(h, dt) : commands[h.id]);
        if (this.transition > 0) h.cmd = neutral();
        this.updateHero(h, dt);
      }
      for (const h of this.heroes) {
        if (!h.cmd.interact) h.contextUsed = false;
        h.context = this.contextFor(h);
        this.interact(h, dt);
        if (this.epoch !== epoch || !['room', 'court'].includes(this.mode)) return;
      }
      for (const h of this.heroes)
        if (
          h.down &&
          !this.heroes.some(
            (p) =>
              !p.down &&
              p.cmd.interact &&
              p.context &&
              p.context.type === 'revive' &&
              p.context.target === h.id,
          )
        )
          h.revive = Math.max(0, h.revive - dt * 2);
      if (!this.heroes.some((h) => h.cmd.interact && h.context && h.context.type === 'exit'))
        this.escape = Math.max(0, this.escape - dt * 2);
      for (const e of this.enemies) this.updateEnemy(e, dt);
      for (const p of this.projectiles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (!this.safe(p.x, p.y)) p.life = 0;
        if (p.team === 'hero') {
          for (const e of this.enemies)
            if (!e.dead && D(p, e) < e.r + 6 && p.life > 0) {
              this.stun(e, this.tuning.stun, this.heroes[p.owner]);
              p.life = 0;
            }
        } else if (this.wardAt(p.x, p.y)) {
          p.life = 0;
          this.emit('ward-intercept');
        } else
          for (const h of this.heroes)
            if (D(p, h) < 9 && p.life > 0) {
              this.hurt(h, this.tuning.damage, p);
              p.life = 0;
            }
      }
      this.projectiles = this.projectiles.filter((p) => p.life > 0);
      for (const list of [this.wards, this.lures]) {
        for (const v of list) v.life -= dt;
        for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
      }
      if (this.ring && this.ring.carrier != null) {
        const h = this.heroes[this.ring.carrier];
        this.ring.x = h.x;
        this.ring.y = h.y;
        if (this.safe(h.x, h.y)) this.ring.safe = { ...h.safe };
      }
      if (this.ring && this.ring.carrier == null && !this.safe(this.ring.x, this.ring.y)) this.returnRing();
      this.updateDirector(dt);
      if (this.heroes.every((h) => h.down)) {
        this.mode = 'failure';
        if (this.roomId === 'final') {
          this.bound.fill(false);
          this.bindProgress.fill(0);
        }
        this.emit('failure', { room: this.roomId });
        this.checkpoint();
      }
    }
    debug(action, value) {
      this.assisted = true;
      if (action === 'heal')
        this.heroes.forEach((h) => {
          h.hp = 5;
          h.down = false;
          h.hurt = 3;
        });
      if (action === 'invulnerable') this.invulnerable = !this.invulnerable;
      if (action === 'jump' && M.ROOMS[value]) {
        this.site = M.ROOMS[value].site;
        if (value === 'final') this.rings = ['dungeon', 'crystal', 'inferno', 'shifting'];
        this.loadRoom(value);
      }
      if (action === 'restart') this.loadRoom(this.roomId);
      if (action === 'spawn') {
        const h = this.heroes[0],
          p = this.nearestSafe({ x: h.x + 96, y: h.y });
        this.enemies.push(this.makeEnemy(value || 'fighter', p.x, p.y));
      }
      if (action === 'hazard') {
        const p = this.nearestSafe({ x: this.heroes[0].x + 64, y: this.heroes[0].y });
        const [x, y] = cell(p);
        this.room = {
          ...this.room,
          hazards: [
            ...this.room.hazards,
            {
              cells: [
                [x, y],
                [x, y + 1],
              ],
              offset: 0,
              period: 8.5,
            },
          ],
        };
      }
      if (action === 'tune' && value && M.TUNING[value.key] && Number.isFinite(value.value)) {
        const spec = M.TUNING[value.key];
        this.tuning[value.key] = clamp(value.value, spec.min, spec.max);
      }
      if (action === 'defaults') this.tuning = M.defaults();
    }
    snapshot() {
      return {
        version: M.VERSION,
        tick: this.tick,
        epoch: this.epoch,
        mode: this.mode,
        room: this.roomId,
        dread: this.dread,
        rings: [...this.rings],
        caches: [...this.caches],
        classes: [...this.classes],
        owners: [...this.owners],
        assisted: this.assisted,
        heroes: this.heroes.map((h) => ({
          id: h.id,
          classId: h.classId,
          x: +h.x.toFixed(2),
          y: +h.y.toFixed(2),
          hp: h.hp,
          down: h.down,
          ai: h.ai,
          aiReason: h.aiReason,
          power: h.powerTime,
          cooldown: h.powerCd,
          context: h.context,
        })),
        ring: this.ring && { carrier: this.ring.carrier, x: this.ring.x, y: this.ring.y },
        finalBeat: this.finalBeat,
        bound: [...this.bound],
        director: { ...this.director },
        enemies: this.enemies
          .filter((e) => !e.dead)
          .map((e) => ({
            id: e.id,
            kind: e.kind,
            x: +e.x.toFixed(1),
            y: +e.y.toFixed(1),
            phase: e.phase,
            stun: e.stun,
          })),
        stats: JSON.parse(JSON.stringify(this.stats)),
        event: this.events[this.events.length - 1],
      };
    }
  }
  M.World = World;
  M.mapFor = mapFor;
})(globalThis);
