/* One deterministic authority; presentation never writes these rules. */
(() => {
  const P = globalThis.PD,
    E = globalThis.My3D2dge;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const copy = (value) => JSON.parse(JSON.stringify(value));
  class Random {
    constructor(seed = 1) {
      this.state = seed >>> 0;
      this.draws = 0;
    }
    next() {
      let t = (this.state += 0x6d2b79f5);
      this.state >>>= 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      this.draws++;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    pick(a) {
      return a[Math.floor(this.next() * a.length)];
    }
  }
  P.Random = Random;
  P.neutral = () => ({
    x: 0,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
    chop: false,
    redirect: false,
    interact: false,
    interactPressed: false,
    aim: 0,
    face: 0,
  });
  P.canonical = (raw) => ({
    x: clamp(Number(raw?.x) || 0, -1, 1),
    up: !!raw?.up,
    down: !!raw?.down,
    jump: !!raw?.jump,
    jumpPressed: !!raw?.jumpPressed,
    chop: !!raw?.chop,
    redirect: !!raw?.redirect,
    interact: !!raw?.interact,
    interactPressed: !!raw?.interactPressed,
    aim: clamp(Number(raw?.aim) || 0, -1, 1),
    face: Math.sign(Number(raw?.face) || 0),
  });
  class Mine {
    constructor(options = {}) {
      this.seed = options.seed ?? 73082;
      this.rng = new Random(this.seed);
      this.cosmetic = new Random(this.seed ^ 0xa37c);
      this.tuning = Object.assign(P.defaults(), options.tuning);
      this.epoch = 1;
      this.run = 1;
      this.tick = 0;
      this.time = 0;
      this.nextId = 1;
      this.eventSeq = 0;
      this.events = [];
      this.history = [];
      this.awards = new Set();
      this.chamber = options.chamber || 0;
      this.route = options.route || 0;
      this.practice = !!options.practice;
      this.attract = !!options.attract;
      this.developer = !!options.developer;
      this.god = false;
      this.status = 'playing';
      this.score = 0;
      this.bank = 0;
      this.bonus = 0;
      this.transition = 0;
      this.keyOwner = null;
      this.key = null;
      this.roster = copy(options.roster || [{ id: 0, name: 'Pete', color: '#ffbf57' }]);
      this.players = this.roster.map((p, i) => this.newMiner(p, i));
      this.stats = {
        chops: 0,
        redirects: 0,
        collisions: 0,
        picks: 0,
        keys: 0,
        evades: 0,
        rescues: 0,
        doors: 0,
        breaks: 0,
        damage: 0,
        high: 0,
        low: 0,
      };
      this.features = {};
      this.loadRoom(this.chamber, true);
    }
    newMiner(info, i) {
      const body = new E.Platformer({
        x: 88 + i * 24,
        z: 16,
        w: 10,
        h: 24,
        crouch: true,
        run: this.tuning.moveSpeed,
        climb: this.tuning.climbSpeed,
        jump: this.tuning.jumpSpeed,
        gravity: this.tuning.gravity,
      });
      return {
        id: info.id,
        name: String(info.name || `Miner ${i + 1}`),
        color: info.color || ['#ffbf57', '#67ddd8'][i % 2],
        body,
        hp: 3,
        tool: this.tuning.durability,
        down: false,
        invuln: 4,
        pose: 'boast',
        poseT: 1.2,
        action: new E.Attack('overhead'),
        actionKind: 'chop',
        aim: 0,
        collectT: 0,
        jamT: 0,
        rescueT: 0,
        jumpQueue: 0,
        redirectQueue: 0,
        redirectAim: 0,
        intent: P.neutral(),
        contribution: { ore: 0, redirects: 0, rescues: 0, key: 0 },
        stepT: 0,
      };
    }
    id(prefix) {
      return `${this.epoch}:${prefix}:${this.nextId++}`;
    }
    emit(type, detail = {}) {
      const e = {
        id: `${this.run}:${this.epoch}:${++this.eventSeq}`,
        type,
        tick: this.tick,
        chamber: this.chamber,
        ...detail,
      };
      this.events.push(e);
      this.history.push(e);
      if (this.history.length > 2000) this.history.shift();
      this.features[type] = (this.features[type] || 0) + 1;
      return e;
    }
    takeEvents() {
      const e = this.events;
      this.events = [];
      return e;
    }
    award(id, amount, p) {
      if (this.awards.has(id)) return false;
      this.awards.add(id);
      this.score += amount;
      this.bonus += amount;
      if (p) p.lastScore = amount;
      return true;
    }
    loadRoom(index, first = false) {
      this.chamber = index;
      this.room = P.buildRoom(index, this.route);
      this.rocks = [];
      this.pickups = [];
      this.key = null;
      this.keyOwner = null;
      this.pairs = new Set();
      this.warnings = [];
      this.supplyPending = {};
      this.work = 0;
      this.pressure = 0;
      this.relief = 4;
      this.age = 0;
      this.nextSpawn = 5;
      this.nextPair = 11;
      this.unarmedFor = 0;
      this.noKeyFor = 0;
      this.chain = 0;
      this.chainT = 0;
      this.deck = ['gold', 'pick', 'gold', 'pick', 'gold', 'key'];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
      this.deckAt = 0;
      this.finale = { wave: 0, active: false, cleared: 0, startCollisions: 0, retry: 0 };
      this.tutorial = {
        move: false,
        jump: false,
        duck: false,
        climb: false,
        chop: false,
        redirect: false,
        broken: false,
        pick: false,
        key: false,
        jam: false,
        skip: false,
      };
      for (const [i, p] of this.players.entries()) {
        const cost = p.down && !first ? 15 : 0;
        if (cost) {
          this.score = Math.max(0, this.score - cost);
          this.emit('reviveCost', { p: p.id, amount: cost, text: 'Partner hauled through · −15 gold' });
        }
        p.body = new E.Platformer({ x: 88 + i * 24, z: 16, w: 10, h: 24, crouch: true });
        p.hp = 3;
        p.tool = this.tuning.durability;
        p.down = false;
        p.invuln = 4;
        p.action.cancel();
        p.pose = 'boast';
        p.poseT = 1.1;
        p.collectT = p.jamT = p.rescueT = p.jumpQueue = p.redirectQueue = 0;
        p.intent = P.neutral();
      }
      this.bonus = 0;
      this.checkpoint = { chamber: index, route: this.route, bank: this.bank, score: this.score };
      this.emit('entry', { text: `${this.room.def.name} · dust settling`, route: this.route });
    }
    setTuning(key, value) {
      this.tuning[key] = P.validateTuning(key, Number(value));
      this.developer = true;
    }
    resetTuning() {
      this.tuning = P.defaults();
      this.developer = true;
    }
    join(info) {
      if (
        this.players.some((p) => p.id === info.id) ||
        this.players.length >= 2 ||
        this.age > 6 ||
        this.status !== 'playing'
      )
        return false;
      this.roster.push(copy(info));
      this.players.push(this.newMiner(info, this.players.length));
      this.emit('join', { p: info.id });
      return true;
    }
    leave(id) {
      if (this.keyOwner === id) this.recoverKey(id);
      this.players = this.players.filter((p) => p.id !== id);
      this.roster = this.roster.filter((p) => p.id !== id);
      this.emit('leave', { p: id });
      if (!this.players.length) this.finish(false, 'The shift is empty.');
    }
    retry() {
      const cp = this.checkpoint;
      this.score = cp.score;
      this.bank = cp.bank;
      this.route = cp.route;
      this.epoch++;
      this.status = 'playing';
      this.transition = 0;
      this.awards.clear();
      this.loadRoom(cp.chamber, true);
      this.emit('retry');
    }
    finish(won, reason = '') {
      if (this.status === 'victory' || this.status === 'failure') return;
      this.status = won ? 'victory' : 'failure';
      this.reason = reason;
      this.won = won;
      if (won) {
        this.bank = this.score;
        for (const p of this.players) {
          p.pose = 'celebrate';
          p.poseT = 99;
        }
      }
      this.emit(won ? 'victory' : 'failure', {
        text: reason || (won ? 'I told you the warranty was optional!' : 'A minor mining setback.'),
      });
    }
    spawnRock(kind = 'ore', x = 48, z = 28, vx = 72, extra = {}) {
      const r = {
        id: this.id('rock'),
        kind,
        x,
        z,
        vx,
        vz: 0,
        r: kind === 'heavy' ? 10 : kind === 'hopper' ? 6 : 7,
        hp: kind === 'heavy' ? 3 : 1,
        life: 17,
        spin: 0,
        redirect: null,
        grace: 0,
        dead: false,
        evaded: [],
        near: {},
        ...extra,
      };
      this.rocks.push(r);
      this.emit('rock', { kind, x, z, rock: r.id });
      return r;
    }
    warnPair(reward = 'deck', tier = null, delay = 1) {
      const active = this.players.find((p) => !p.down);
      const t = tier ?? clamp(P.tierAt(active?.body.z || 16), 0, this.room.def.tiers - 1);
      const x = 208,
        z = P.floorZ(t) + 10;
      this.warnings.push({
        id: this.id('pair'),
        type: 'pair',
        reward,
        tier: t,
        x,
        z,
        t: delay,
        original: delay,
      });
      this.emit('warning', {
        kind: 'pair',
        x,
        z,
        text:
          reward === 'pick'
            ? 'SUPPLY CRASH · a fresh pick is coming down'
            : reward === 'key'
              ? 'KEY CRASH · watch the rising spark'
              : 'CROSSING ORE · make it work for you',
      });
    }
    spawnPick(x, z, reason = 'collision') {
      const item = {
        id: this.id('pick'),
        kind: 'pick',
        x: clamp(x, 56, 360),
        baseX: clamp(x, 56, 360),
        z: z + 18,
        age: 0,
        life: this.tuning.pickLife,
        dead: false,
        reason,
      };
      this.pickups.push(item);
      this.supplyPending.pick = 0;
      this.emit('supply', { kind: 'pick', x: item.x, z: item.z });
      return item;
    }
    spawnKey(x, z, recovered = false) {
      if (this.key || this.keyOwner !== null) return null;
      const item = {
        id: this.id('key'),
        kind: 'key',
        x: recovered ? x : 88,
        baseX: recovered ? x : 88,
        z: clamp(z, 26, this.room.height - 28),
        age: 0,
        life: this.tuning.keyLife,
        dead: false,
        recovered,
      };
      this.key = item;
      this.supplyPending.key = 0;
      this.noKeyFor = 0;
      this.emit('keyRise', {
        x: item.x,
        z: item.z,
        text: recovered ? 'Key recovered at the landing' : 'KEY RISING · chase the light!',
      });
      return item;
    }
    recoverKey(id) {
      const p = this.players.find((p) => p.id === id);
      this.keyOwner = null;
      const z = P.floorZ(clamp(P.tierAt(p?.body.z || 16), 0, this.room.def.tiers - 1)) + 8;
      this.spawnKey(88, z, true);
      this.emit('keyLost', { p: id, x: 88, z, text: 'Key returned to the left ladder' });
    }
    wear(p, rock) {
      p.tool = Math.max(0, p.tool - 1);
      if (p.tool === 1) {
        p.pose = 'wear';
        p.poseT = 0.5;
        this.emit('wear', { p: p.id, x: p.body.x, z: p.body.z, text: 'ONE SWING LEFT!' });
      }
      if (p.tool === 0) {
        p.pose = 'break';
        p.poseT = 0.75;
        this.stats.breaks++;
        this.tutorial.broken = true;
        this.emit('break', {
          p: p.id,
          rock: rock.id,
          x: p.body.x,
          z: p.body.z + 16,
          text: 'Warranty void. Legs still work!',
        });
      }
    }
    hitRock(p, r) {
      if (p.tool <= 0 || r.dead) return;
      const b = p.body;
      if (p.actionKind === 'redirect') {
        r.vx = b.facing * this.tuning.rockSpeed * 2.05;
        r.vz = p.aim < -0.3 ? 25 : p.aim > 0.3 ? 190 : 135;
        r.redirect = p.id;
        r.grace = 0.42;
        r.life = Math.max(r.life, 9);
        p.contribution.redirects++;
        this.stats.redirects++;
        this.stats[p.aim < -0.3 ? 'low' : 'high']++;
        this.tutorial.redirect = true;
        this.emit('redirect', {
          p: p.id,
          rock: r.id,
          x: r.x,
          z: r.z,
          aim: p.aim,
          text: p.aim < -0.3 ? 'LOW RICOCHET' : 'HIGH RICOCHET',
        });
      } else {
        r.hp--;
        this.stats.chops++;
        this.tutorial.chop = true;
        this.emit('chop', { p: p.id, rock: r.id, x: r.x, z: r.z, kind: r.kind });
        if (r.hp <= 0) {
          r.dead = true;
          p.contribution.ore++;
          this.addWork(1);
          this.award(`ore:${r.id}`, 3, p);
          this.emit('ore', { p: p.id, x: r.x, z: r.z, amount: 3, kind: r.kind });
        } else {
          r.vx = b.facing * 45;
          r.vz = 40;
          r.grace = 0.18;
          this.emit('armor', { x: r.x, z: r.z, hp: r.hp });
        }
      }
      this.wear(p, r);
    }
    addWork(amount) {
      this.work += amount;
      this.pressure = clamp(this.pressure + amount * this.tuning.pressureGain, 0, 1);
    }
    collide(a, b) {
      const pair = [a.id, b.id].sort().join('|');
      if (this.pairs.has(pair)) return;
      this.pairs.add(pair);
      a.dead = b.dead = true;
      this.stats.collisions++;
      this.chain = this.chainT > 0 ? Math.min(4, this.chain + 1) : 1;
      this.chainT = 5;
      const x = (a.x + b.x) / 2,
        z = (a.z + b.z) / 2;
      this.award(`crash:${pair}`, 6 * this.chain);
      this.addWork(3);
      let reward = a.reward || b.reward || this.deck[this.deckAt++ % this.deck.length];
      if (reward === 'deck') reward = this.deck[this.deckAt++ % this.deck.length];
      if (reward !== 'key' && !this.players.some((p) => !p.down && p.tool > 0)) reward = 'pick';
      const keyed =
        this.work >= this.room.def.quota &&
        (!this.room.def.extraction || this.finale.cleared === P.EXTRACTION.length);
      if (reward === 'key' && !keyed) reward = 'pick';
      this.emit('collision', {
        x,
        z,
        chain: this.chain,
        amount: 6 * this.chain,
        reward,
        redirected: a.redirect !== null || b.redirect !== null,
      });
      if (reward === 'pick') this.spawnPick(x, z);
      if (reward === 'key' && keyed) this.spawnKey(x, z);
      if (this.finale.active && this.stats.collisions > this.finale.startCollisions) {
        this.finale.active = false;
        this.finale.cleared = this.finale.wave;
        this.emit('waveClear', { wave: this.finale.wave, text: `MACHINE ${this.finale.wave}/3 PRIMED` });
      }
    }
    damage(p, r) {
      if (p.down || p.invuln > 0 || this.god || this.attract || this.relief > 0 || this.status !== 'playing')
        return;
      p.hp--;
      p.invuln = 2.2;
      p.action.cancel();
      p.body.knock(p.body.x >= r.x ? 1 : -1, 65, 100, 0.22);
      p.pose = 'hurt';
      p.poseT = 0.3;
      this.stats.damage++;
      this.emit('hurt', { p: p.id, x: p.body.x, z: p.body.z + 12, hp: p.hp });
      if (p.hp <= 0) {
        p.down = true;
        p.body.vx = p.body.vz = 0;
        p.pose = 'down';
        p.poseT = 99;
        if (this.keyOwner === p.id) this.recoverKey(p.id);
        this.emit('down', {
          p: p.id,
          x: p.body.x,
          z: p.body.z,
          text: 'Miner down · hold Interact nearby to rescue',
        });
      }
    }
    nearDoor(p) {
      return this.room.doors.find((d) => Math.abs(p.body.x - d.x) < 24 && Math.abs(p.body.z - d.z) < 16);
    }
    nearRescue(p) {
      return this.players.find(
        (q) => q !== p && q.down && Math.abs(q.body.x - p.body.x) < 26 && Math.abs(q.body.z - p.body.z) < 24,
      );
    }
    context(p) {
      const rescue = this.nearRescue(p);
      if (rescue)
        return { type: 'rescue', id: rescue.id, target: rescue, label: 'Hold to rescue', symbol: '+' };
      const door = this.nearDoor(p);
      if (door && (p.body.facing === Math.sign(door.x - p.body.x) || Math.abs(door.x - p.body.x) < 10))
        return {
          type: 'door',
          id: door.id,
          target: door,
          label: this.keyOwner !== null ? 'Unlock ' + door.name : 'Needs the rising key',
          symbol: door.symbol,
        };
      const rock = this.rocks.find(
        (r) => !r.dead && Math.abs(r.x - p.body.x) < 65 && Math.abs(r.z - p.body.z - 14) < 40,
      );
      if (rock && p.tool > 0)
        return { type: 'redirect', id: rock.id, target: rock, label: 'Redirect', symbol: '↗' };
      return null;
    }
    interact(p, intent, dt) {
      const rescue = this.nearRescue(p);
      if (rescue && intent.interact) {
        p.rescueT += dt;
        p.pose = 'rescue';
        p.poseT = 0.2;
        if (p.rescueT >= this.tuning.rescueTime) {
          rescue.down = false;
          rescue.hp = 2;
          rescue.invuln = 3;
          rescue.pose = 'collect';
          rescue.poseT = 0.8;
          p.rescueT = 0;
          p.contribution.rescues++;
          this.stats.rescues++;
          this.emit('rescue', {
            p: rescue.id,
            by: p.id,
            x: rescue.body.x,
            z: rescue.body.z,
            text: 'Back on the payroll!',
          });
        }
      } else p.rescueT = 0;
      if (!intent.interactPressed || rescue) return;
      const d = this.nearDoor(p);
      if (!d) return;
      if (this.keyOwner === null) {
        if (p.jamT <= 0) {
          p.jamT = 0.7;
          p.pose = 'jam';
          p.poseT = 0.7;
          p.invuln = Math.max(p.invuln, 1);
          this.tutorial.jam = true;
          this.emit('jam', {
            p: p.id,
            x: d.x,
            z: d.z,
            text: 'A key, chief. This is a door. Move to wriggle free!',
          });
        }
        return;
      }
      this.keyOwner = null;
      this.award(`door:${this.epoch}`, 20);
      this.stats.doors++;
      const routeBonus = P.ROUTES[d.id].bonus + Math.max(0, this.work - this.room.def.quota) * 2;
      this.award(`route:${this.epoch}`, routeBonus);
      this.bank = this.score;
      this.route = d.id;
      p.pose = 'unlock';
      p.poseT = 2;
      this.status = 'transition';
      this.transition = 1.6;
      this.emit('door', {
        p: p.id,
        x: d.x,
        z: d.z,
        door: d.id,
        bonus: routeBonus,
        text: `${d.symbol} ${d.name.toUpperCase()} ROUTE · +${routeBonus} bonus`,
      });
    }
    updateLadders(dt) {
      for (const l of this.room.ladders) {
        if (!l.temporary) continue;
        l.timer -= dt;
        const occupants = this.players.filter(
          (p) =>
            !p.down &&
            p.body.climbing &&
            Math.abs(p.body.x - l.x) < 10 &&
            p.body.z >= l.from - 4 &&
            p.body.z <= l.to + 2,
        );
        if (l.state === 'usable' && l.timer <= 3) {
          l.state = 'warning';
          this.emit('ladderWarn', { x: l.x, z: l.to, text: 'Flashing ladder · find a landing' });
        }
        if ((l.state === 'warning' || l.state === 'usable') && l.timer <= 0) {
          if (occupants.length) {
            // Preserve native climbing until the nearer landing is reached, even without held climb input.
            l.grace += dt;
            for (const p of occupants) {
              const target = p.body.z < (l.from + l.to) / 2 ? l.from : l.to;
              p.ladderGrace ||= { id: l.id, target };
            }
            continue;
          }
          l.state = 'expired';
          l.timer = 0.6;
          l.grace = 0;
          for (const [cx, cz, under] of l.cells) this.room.level.set(cx, cz, under);
          this.emit('ladderExpire', { x: l.x, z: l.to });
        } else if (l.state === 'expired' && l.timer <= 0) {
          l.state = 'inactive';
          l.timer = 4 + (l.cycle % 3);
        } else if (l.state === 'inactive' && l.timer <= 0) {
          l.state = 'forming';
          l.timer = 1.2;
          this.emit('ladderForm', { x: l.x, z: l.to });
        } else if (l.state === 'forming' && l.timer <= 0) {
          l.state = 'usable';
          l.timer = this.tuning.ladderLife;
          l.cycle++;
          for (const [cx, cz] of l.cells) this.room.level.set(cx, cz, 3);
        }
      }
    }
    director(dt) {
      if (this.relief > 0) return;
      this.nextSpawn -= dt;
      this.nextPair -= dt;
      const active = this.players.filter((p) => !p.down);
      const unarmed = active.length > 0 && active.every((p) => p.tool === 0);
      const hasPick = this.pickups.some((p) => p.kind === 'pick' && !p.dead);
      this.unarmedFor = unarmed && !hasPick ? this.unarmedFor + dt : 0;
      const keyReady =
        this.work >= this.room.def.quota &&
        (!this.room.def.extraction || this.finale.cleared === P.EXTRACTION.length);
      this.noKeyFor = keyReady && !this.key && this.keyOwner === null ? this.noKeyFor + dt : 0;
      for (const k of ['pick', 'key']) this.supplyPending[k] = Math.max(0, (this.supplyPending[k] || 0) - dt);
      if (this.unarmedFor >= this.tuning.pickRecovery - 1.8 && !this.supplyPending.pick) {
        this.warnPair('pick', 0);
        this.supplyPending.pick = 4;
        this.unarmedFor = 0;
      }
      if (
        keyReady &&
        !this.key &&
        this.keyOwner === null &&
        this.noKeyFor >= this.tuning.keyRecovery - 1.8 &&
        !this.supplyPending.key
      ) {
        this.warnPair('key', 0);
        this.supplyPending.key = 4;
        this.noKeyFor = 0;
      }
      const pattern = P.PATTERNS[this.room.def.pattern];
      if (this.nextPair <= 0 && this.rocks.length < 12) {
        this.warnPair('deck');
        this.nextPair = pattern.pairEvery;
      }
      if (this.nextSpawn <= 0 && this.rocks.length < 11) {
        const d = this.room.doors[pattern.doors[Math.floor(this.rng.next() * pattern.doors.length)]],
          original = 1.15;
        const families =
          pattern.stages?.find((stage) => this.age < stage.until)?.families || pattern.families;
        const kind =
          pattern.routeBias > 0 && this.rng.next() < pattern.routeBias
            ? P.ROUTES[this.route].family
            : this.rng.pick(families);
        this.warnings.push({
          id: this.id('doorWarning'),
          type: 'door',
          door: d.id,
          kind,
          x: d.x,
          z: d.z + 12,
          t: original,
          original,
        });
        d.warning = original;
        this.emit('warning', {
          kind,
          x: d.x,
          z: d.z,
          door: d.id,
          text: `${d.symbol} ${kind === 'heavy' ? 'HEAVY ORE · three chops or a crash' : kind === 'hopper' ? 'SPRING ORE · duck its high pass' : 'ORE INCOMING'}`,
        });
        this.nextSpawn = (this.tuning.spawnInterval * (1 - this.pressure * 0.42)) / pattern.spawnScale;
      }
      if (this.room.def.extraction) {
        const f = this.finale;
        if (!f.active && f.wave < P.EXTRACTION.length && this.work >= P.EXTRACTION[f.wave].work) {
          const wave = P.EXTRACTION[f.wave];
          f.wave++;
          f.active = true;
          f.startCollisions = this.stats.collisions;
          f.retry = 8;
          this.emit('wave', { wave: f.wave, text: wave.line });
          this.warnPair('pick', wave.tier, 2);
          for (const i of wave.doors) {
            const d = this.room.doors[i];
            this.warnings.push({
              id: this.id('wave'),
              type: 'door',
              door: i,
              kind: ['ore', 'hopper', 'heavy'][i],
              x: d.x,
              z: d.z + 12,
              t: 2 + i * 0.8,
              original: 2 + i * 0.8,
            });
          }
        }
        if (f.active && (f.retry -= dt) <= 0) {
          this.warnPair('pick', Math.min(f.wave * 2 - 1, 5), 1.5);
          f.retry = 9;
        }
      }
    }
    updateWarnings(dt) {
      for (const w of this.warnings) {
        w.t -= dt;
        if (w.t > 0 || w.done) continue;
        w.done = true;
        if (w.type === 'pair') {
          const pairId = this.id('pairContact'),
            z = w.z;
          this.spawnRock('ore', w.x - 42, z, 88, { reward: w.reward, pairId, life: 5 });
          this.spawnRock('ore', w.x + 42, z, -88, { reward: w.reward, pairId, life: 5 });
        } else {
          const d = this.room.doors[w.door],
            dir = d.x > 208 ? -1 : 1;
          this.spawnRock(
            w.kind,
            d.x + dir * 19,
            d.z + (w.kind === 'hopper' ? 25 : 11),
            dir * this.tuning.rockSpeed * (w.kind === 'heavy' ? 0.7 : 1),
            { vz: w.kind === 'hopper' ? 70 : 0 },
          );
          d.warning = 0;
          d.pulse = 0.5;
        }
      }
      this.warnings = this.warnings.filter((w) => !w.done);
      for (const d of this.room.doors) {
        d.warning = Math.max(0, d.warning - dt);
        d.pulse = Math.max(0, d.pulse - dt);
      }
    }
    updateRocks(dt) {
      for (const r of this.rocks) {
        if (r.dead) continue;
        const old = r.z;
        r.life -= dt;
        r.grace -= dt;
        r.spin += r.vx * dt * 0.09;
        r.x += r.vx * dt;
        r.vz -= 400 * dt;
        r.z += r.vz * dt;
        if (r.x < 24 + r.r) {
          r.x = 24 + r.r;
          r.vx = Math.abs(r.vx);
        }
        if (r.x > 392 - r.r) {
          r.x = 392 - r.r;
          r.vx = -Math.abs(r.vx);
        }
        const floor = this.room.level.groundBelow(r.x, old - r.r + 2);
        if (floor !== null && r.vz < 0 && r.z - r.r <= floor && old - r.r >= floor - 3) {
          r.z = floor + r.r + 0.1;
          r.vz = r.kind === 'hopper' ? 150 : r.kind === 'heavy' ? 35 : 42;
        }
        if (r.z < -30 || r.life <= 0) r.dead = true;
      }
    }
    updatePickups(dt) {
      for (const item of [...this.pickups, ...(this.key ? [this.key] : [])]) {
        item.age += dt;
        item.life -= dt;
        if (item.kind === 'pick') {
          item.z = Math.max(25, item.z - dt * 29);
          item.x = item.baseX + Math.sin(item.age * 2) * 4;
        } else {
          item.z = Math.min(this.room.height - 12, item.z + dt * (item.recovered ? 2.5 : 5));
          item.x = item.baseX + Math.sin(item.age * 0.9) * 13;
        }
        if (item.life <= 0) {
          item.dead = true;
          if (item === this.key) {
            this.key = null;
            this.noKeyFor = 0;
            this.emit('keyExpire', { text: 'Key escaped! Another crash will uncover one.' });
          } else this.emit('pickExpire', { x: item.x, z: item.z });
          continue;
        }
        for (const p of this.players) {
          if (p.down || item.dead) continue;
          const b = p.body;
          if (Math.abs(b.x - item.x) > 15 || item.z < b.z - 3 || item.z > b.z + b.h + 9) continue;
          if (item.kind === 'pick') {
            if (p.tool >= this.tuning.durability) continue;
            item.dead = true;
            p.tool = this.tuning.durability;
            p.invuln = Math.max(p.invuln, 2);
            this.award(`pick:${item.id}`, 5, p);
            this.stats.picks++;
            this.tutorial.pick = true;
            p.pose = 'collect';
            p.poseT = 0.5;
            p.collectT = 0.5;
            this.emit('pick', { p: p.id, x: item.x, z: item.z, text: 'Fresh pick. Same confidence.' });
          } else {
            item.dead = true;
            this.keyOwner = p.id;
            this.key = null;
            p.invuln = Math.max(p.invuln, 2);
            this.award(`key:${item.id}`, 10, p);
            this.stats.keys++;
            p.contribution.key++;
            this.tutorial.key = true;
            p.pose = 'collect';
            p.poseT = 0.6;
            this.emit('key', { p: p.id, x: item.x, z: item.z, text: 'KEY CAUGHT · choose any marked door!' });
          }
        }
      }
      this.pickups = this.pickups.filter((p) => !p.dead);
    }
    step(rawIntents = {}, dt = P.STEP) {
      if (!(dt > 0) || this.status === 'victory' || this.status === 'failure') return;
      this.tick++;
      this.time += dt;
      if (this.status === 'transition') {
        this.transition -= dt;
        if (this.transition <= 0) {
          if (this.chamber === P.finalChamber() || this.practice) this.finish(true);
          else {
            this.epoch++;
            this.status = 'playing';
            this.loadRoom(this.chamber + 1);
          }
        }
        return;
      }
      this.age += dt;
      this.relief = Math.max(0, this.relief - dt);
      this.chainT -= dt;
      this.updateLadders(dt);
      this.director(dt);
      this.updateWarnings(dt);
      // 1. Traversal/world contacts. Native bodies and a canonical intent share one path.
      for (const p of this.players) {
        if (p.down) {
          p.body.update(dt, this.room.level, P.neutral());
          p.body.vx = 0;
          continue;
        }
        let input = P.canonical(rawIntents[p.id] || P.neutral());
        p.intent = input;
        p.invuln = Math.max(0, p.invuln - dt);
        p.poseT = Math.max(0, p.poseT - dt);
        p.collectT = Math.max(0, p.collectT - dt);
        p.jamT = Math.max(0, p.jamT - dt);
        if (p.poseT <= 0) p.pose = null;
        if (input.jumpPressed) p.jumpQueue = p.body.buffer;
        else p.jumpQueue = Math.max(0, p.jumpQueue - dt);
        if (p.ladderGrace) {
          const target = p.ladderGrace.target;
          if (Math.abs(p.body.z - target) < 1.5) {
            p.body.z = target;
            p.body.x += 16;
            p.body.vz = 0;
            p.body.climbing = false;
            p.body.onGround = true;
            p.ladderGrace = null;
            input = { ...input, up: false, down: false, x: 0, jumpPressed: false };
            this.emit('ladderDismount', { p: p.id, x: p.body.x, z: target });
          } else
            input = { ...input, up: target > p.body.z, down: target < p.body.z, x: 0, jumpPressed: false };
        }
        const b = p.body;
        b.run = this.tuning.moveSpeed;
        b.climb = this.tuning.climbSpeed;
        b.jump = this.tuning.jumpSpeed;
        b.gravity = this.tuning.gravity;
        b.fallGravity = this.tuning.gravity * 1.35;
        // Generous ladder attachment uses the same native collision geometry.
        if (input.up && !b.climbing) {
          const l = this.room.ladders.find(
            (l) =>
              ['usable', 'warning'].includes(l.state) &&
              Math.abs(l.x - b.x) < 13 &&
              b.z >= l.from - 2 &&
              b.z < l.to - 1,
          );
          if (l && Math.abs(b.vx) < b.run * 0.9) b.x = l.x;
        }
        // Native crouch runs before native ladder attachment. Reserve down at a ladder's top
        // for descent, otherwise crouch would swallow that contextual input indefinitely.
        const descend =
          input.down &&
          !b.climbing &&
          b.onGround &&
          this.room.level.touching({ x: b.x, z: b.z - 3, w: 2, h: 3 }, 'ladder');
        if (descend) {
          b.crouch = false;
          b.crouching = false;
          b.h = 24;
        }
        const wasClimbing = b.climbing;
        b.update(dt, this.room.level, { ...input, jumpPressed: p.jumpQueue > 0 });
        b.crouch = true;
        if (input.face && (input.chop || input.redirect)) b.facing = input.face;
        if (b.climbing && Math.abs(input.x) > 0.25) b.facing = Math.sign(input.x);
        if (b.jumped || b.drop > 0 || (wasClimbing && !b.climbing)) p.jumpQueue = 0;
        b.x = clamp(b.x, 27, 389);
        if (b.z < -25) {
          b.x = 88;
          b.z = 16;
          b.vx = b.vz = 0;
          p.invuln = Math.max(2, p.invuln);
          this.emit('recovery', { p: p.id, text: 'Safety net · returned to the intake' });
        }
        if (Math.abs(b.vx) > 15) this.tutorial.move = true;
        if (b.jumped) {
          this.tutorial.jump = true;
          this.emit('jump', { p: p.id, x: b.x, z: b.z });
        }
        if (b.crouching && !this.tutorial.duck) {
          this.tutorial.duck = true;
          this.emit('duck', { p: p.id });
        }
        if (b.climbing && !this.tutorial.climb) {
          this.tutorial.climb = true;
          this.emit('climb', { p: p.id });
        }
        p.stepT += dt * (b.climbing ? 1.4 : Math.abs(b.vx) > 18 && b.onGround ? 1 : 0);
        if (p.stepT > 0.3) {
          p.stepT = 0;
          this.emit(b.climbing ? 'rung' : 'step', { p: p.id, x: b.x, z: b.z });
        }
        if (b.landed) this.emit('land', { p: p.id, x: b.x, z: b.z });
        p.redirectQueue = Math.max(0, (p.redirectQueue || 0) - dt);
        if (input.redirect && (!p.action.busy || p.actionKind !== 'redirect')) {
          p.redirectQueue = this.tuning.chopCycle + 0.14;
          p.redirectAim = input.aim || (input.up ? 1 : input.down ? -1 : 0);
          if (p.actionKind === 'chop' && p.action.phase === 'wind') p.action.cancel();
        }
        if (p.tool > 0 && !p.action.busy && (p.redirectQueue > 0 || input.chop)) {
          const redirect = p.redirectQueue > 0;
          p.actionKind = redirect ? 'redirect' : 'chop';
          p.aim = redirect ? p.redirectAim : input.aim || (input.up ? 1 : input.down ? -1 : 0);
          p.redirectQueue = 0;
          p.action = redirect
            ? new E.Attack('rising', {
                wind: 0.045,
                active: this.tuning.redirectWindow,
                recover: 0.19,
                reach: 29,
                blade: 0.8,
              })
            : new E.Attack('overhead', {
                wind: 0.06,
                active: 0.11,
                recover: Math.max(0.03, this.tuning.chopCycle - 0.17),
                reach: 29,
                blade: 1,
              });
          p.action.start();
          this.emit('swing', { p: p.id, kind: p.actionKind, x: b.x, z: b.z });
        }
        p.action.update(dt);
      }
      this.updateRocks(dt);
      // 2. Player action contacts, deduplicated by native Attack per swing.
      for (const p of this.players)
        if (!p.down && p.tool > 0) {
          const b = p.body;
          p.action.hits(
            this.rocks,
            (r) => {
              const dx = (r.x - b.x) * b.facing;
              return (
                dx >= -7 &&
                dx <= 29 + r.r &&
                r.z + r.r >= b.z + 2 &&
                r.z - r.r <= b.z + (b.crouching ? 21 : 35)
              );
            },
            (r) => this.hitRock(p, r),
          );
        }
      // 3. Rock pairs, once per stable contact identity.
      for (let i = 0; i < this.rocks.length; i++)
        for (let j = i + 1; j < this.rocks.length; j++) {
          const a = this.rocks[i],
            b = this.rocks[j];
          if (a.dead || b.dead) continue;
          if (
            Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r &&
            (Math.abs(a.vx - b.vx) > 30 || a.redirect !== null || b.redirect !== null)
          )
            this.collide(a, b);
        }
      // 4. Exposed miners take damage from remaining rocks; evade requires a real near pass.
      for (const p of this.players)
        if (!p.down)
          for (const r of this.rocks) {
            if (r.dead) continue;
            const b = p.body;
            const dx = r.x - b.x,
              dz = r.z - clamp(r.z, b.z + 2, b.z + b.h - 2);
            if (Math.abs(dx) < 42 && Math.abs(r.z - b.z - 14) < 34)
              r.near[p.id] ||= { side: Math.sign(dx), moved: Math.abs(b.vx) > 12 || b.air || b.crouching };
            const near = r.near[p.id];
            if (near) {
              near.moved ||= Math.abs(b.vx) > 12 || b.air || b.crouching;
              if (
                near.side !== Math.sign(dx) &&
                near.moved &&
                Math.abs(dx) < 30 &&
                !r.evaded.includes(p.id) &&
                Math.abs(dz) > r.r - 1
              ) {
                r.evaded.push(p.id);
                this.stats.evades++;
                this.award(`evade:${r.id}:${p.id}`, 1, p);
                this.emit('evade', { p: p.id, x: b.x, z: b.z + 28, amount: 1 });
              }
            }
            const hx = Math.max(0, Math.abs(dx) - b.w * 0.45);
            if (r.grace <= 0 && hx * hx + dz * dz < (r.r - 1) ** 2) this.damage(p, r);
          }
      // 5. Supply motion and collection; at most one team key.
      this.updatePickups(dt);
      // 6. Rescue, doors, encounter transitions and terminal states.
      for (const p of this.players) if (!p.down && this.status === 'playing') this.interact(p, p.intent, dt);
      this.rocks = this.rocks.filter((r) => !r.dead);
      if (this.players.length && this.players.every((p) => p.down))
        this.finish(false, 'The mine won this round. Your chamber checkpoint is safe.');
    }
    snapshot() {
      const state = {};
      for (const key of [
        'seed',
        'tuning',
        'epoch',
        'run',
        'tick',
        'time',
        'nextId',
        'eventSeq',
        'chamber',
        'route',
        'practice',
        'attract',
        'developer',
        'god',
        'status',
        'score',
        'bank',
        'bonus',
        'transition',
        'keyOwner',
        'key',
        'roster',
        'stats',
        'features',
        'rocks',
        'pickups',
        'warnings',
        'supplyPending',
        'work',
        'pressure',
        'relief',
        'age',
        'nextSpawn',
        'nextPair',
        'unarmedFor',
        'noKeyFor',
        'chain',
        'chainT',
        'deck',
        'deckAt',
        'finale',
        'tutorial',
        'checkpoint',
        'won',
        'reason',
      ])
        if (this[key] !== undefined) state[key] = copy(this[key]);
      state.rng = { state: this.rng.state, draws: this.rng.draws };
      state.cosmetic = { state: this.cosmetic.state, draws: this.cosmetic.draws };
      state.awards = [...this.awards];
      state.pairs = [...this.pairs];
      state.ladders = copy(this.room.ladders);
      state.doors = copy(this.room.doors);
      state.players = this.players.map((p) => {
        const data = {};
        for (const k of Object.keys(p)) if (k !== 'action') data[k] = copy(p[k]);
        data.action = {
          spec: copy(p.action.spec),
          phase: p.action.phase,
          t: p.action.t,
          hit: [...p.action.hit].map((r) => r.id),
        };
        return data;
      });
      return state;
    }
    static restore(state) {
      const m = new Mine({
        seed: state.seed,
        roster: state.roster,
        chamber: state.chamber,
        tuning: state.tuning,
      });
      const s = copy(state);
      for (const k of Object.keys(s))
        if (!['players', 'ladders', 'doors', 'rng', 'cosmetic', 'awards', 'pairs'].includes(k)) m[k] = s[k];
      Object.assign(m.rng, s.rng);
      Object.assign(m.cosmetic, s.cosmetic);
      m.awards = new Set(s.awards);
      m.pairs = new Set(s.pairs);
      m.room = P.buildRoom(s.chamber, s.route);
      m.room.ladders = s.ladders;
      m.room.doors = s.doors;
      for (const l of m.room.ladders)
        for (const [cx, cz, under] of l.cells)
          m.room.level.set(cx, cz, ['usable', 'warning'].includes(l.state) ? 3 : under);
      m.players = s.players.map((p) => {
        const body = Object.assign(new E.Platformer(), p.body),
          action = Object.assign(new E.Attack(p.action.spec), { phase: p.action.phase, t: p.action.t });
        action.hit = new Set(p.action.hit.map((id) => m.rocks.find((r) => r.id === id)).filter(Boolean));
        return { ...p, body, action };
      });
      m.events = [];
      m.history = [];
      return m;
    }
    debug(command, value) {
      this.developer = true;
      const p = this.players.find((p) => !p.down) || this.players[0];
      if (command === 'god') this.god = !this.god;
      else if (command === 'tool' && p) {
        p.tool = this.tuning.durability;
        this.emit('pick', { p: p.id, text: 'Developer: tool granted' });
      } else if (command === 'key' && p) {
        this.key = null;
        this.keyOwner = p.id;
      } else if (command === 'rock' && p)
        this.spawnRock(value || 'ore', p.body.x + 60, p.body.z + 11, -this.tuning.rockSpeed);
      else if (command === 'pair') this.warnPair('pick');
      else if (command === 'purge') {
        this.rocks = [];
        this.warnings = [];
        this.pickups = [];
      } else if (command === 'supply' && p) this.spawnPick(p.body.x + 20, p.body.z + 50, 'developer');
      else if (command === 'chamber') {
        this.epoch++;
        this.status = 'playing';
        this.loadRoom(clamp(Number(value), 0, P.finalChamber()));
      } else if (command === 'seed') {
        this.seed = Number(value) >>> 0;
        this.rng = new Random(this.seed);
        this.retry();
      } else if (command === 'down' && p) {
        p.invuln = 0;
        p.hp = 1;
        this.damage(p, { x: p.body.x + 2 });
      } else if (command === 'retry') this.retry();
    }
  }
  P.Mine = Mine;
})();
