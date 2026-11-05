// BattleSim: a hex battle as plain JSON state. It never touches the engine, the DOM, the clock or Math.random: the same
// setup and the same commands always give the same events (the tests check it). Two sides fight across a board of hexes
// for up to a set number of bells. In each bell every living unit acts once, fastest first. A unit may move, then strike,
// use one of its skills, or wait. Side 0 attacks: it wins by a knight on the Keep, or by routing side 1. Side 1 holds: it
// wins when the bells run out, or by routing side 0. Either side loses when its commander falls.
// A knight's skills come from its class at its level; a monster's from its form. Skills follow the plan's table (§6.7):
// areas, filters, powers, heals and statuses. Passive skills work all the time. A ward (a knight's class ward radius)
// guards the monsters of its side: a monster outside every ward hits and guards a fifth less.
// The Clockwork Sanctum's dials turn when a unit ends a move on them; the gate opens when all dials show the season.
(() => {
  const H = G;
  const SHIELD = 3;

  // ---- building a unit from a knight or a monster ----
  H.makeUnit = (spec, side, uid) => {
    const base = { uid, side, kind: spec.kind, ref: spec.ref, leader: !!spec.leader, campaignId: spec._id || null, owner: spec.owner ?? null,
      q: 0, r: 0, dead: false, moved: false, acted: false, movedCost: 0, cd: {}, used: {}, xp: 0, downed: false,
      status: { valor: 0, warded: 0, haste: 0, chill: 0, sleep: 0, stop: 0, poison: 0, burn: 0, weakened: 0, frostarmor: 0, windup: 0 },
      items: (spec.items || []).slice() };
    if (spec.kind === 'knight') {
      const k = H.get('knight', spec.ref), clsId = spec.cls || k.cls, cls = H.get('class', clsId);
      const level = spec.level || k.level, grow = level - k.level;
      const items = base.items.map(id => H.get('item', id));
      const bonus = key => items.reduce((n, it) => n + (it[key] || 0), 0);
      const skills = H.classSkills(clsId, k.element, level);
      const maxHp = k.hp + grow * 3 + (cls.hp || 0);
      return Object.assign(base, { name: k.name, knight: true, element: k.element, size: k.size || 'M', level, cls: clsId, skills,
        passives: skills.filter(id => H.get('skill', id).kind === 'passive'),
        maxHp, hp: spec.hp === undefined ? maxHp : Math.min(spec.hp, maxHp), atk: k.atk + grow + (cls.atk || 0) + bonus('atk'),
        def: k.def + grow + (cls.def || 0) + bonus('def'), mov: cls.mov + bonus('mov'), rng: cls.rng || 1, ward: cls.ward || 2,
        look: k.look, realm: k.realm, bondCap: cls.bond || k.bond || 3, title: k.title, weapon: cls.weapon, build: cls.build, moves: cls.moves });
    }
    const f = H.speciesForm(spec.ref, spec.form || 0);
    // a monster has its form's own skill, its element's strike, and from the third form a passive of its size
    const elemSkill = { verdant: 'entangle', solar: 'emberspit', ambered: 'gale', rime: 'hurlice', hour: 'pendulum', neutral: 'tailsweep' }[f.element] || 'tailsweep';
    const tierPassive = (spec.form || 0) >= 2 ? (f.size === 'L' ? 'regenerate' : 'thickhide') : null;
    const ids = [...new Set([f.skill, elemSkill, tierPassive].filter(Boolean).map(id => H.get('skill', id).id))];
    if (ids.length < 2) ids.push(ids.includes('screech') ? 'roar' : 'screech');
    const skills = ids;
    return Object.assign(base, { name: f.name, knight: false, element: f.element, size: f.size, level: (spec.form || 0) + 1, skills,
      passives: skills.filter(id => H.get('skill', id).kind === 'passive'),
      maxHp: f.hp, hp: spec.hp === undefined ? f.hp : spec.hp, atk: f.atk, def: f.def, mov: f.mov, rng: f.rng, ward: 0,
      look: f.look, form: spec.form || 0, species: spec.ref, bondTo: spec.bondTo || null });
  };

  // ---- the map: glyph rows to a tiles table (key "q,r" to a terrain id), the start cells, and the dials ----
  H.mapTiles = mapId => {
    const m = H.get('map', mapId), tiles = {}, starts = { 0: [], 1: [] }, dials = [];
    m.rows.forEach((row, rr) => {
      if (row.length !== H.MAP_ROWS_WIDTH) throw new Error(m.id + ' row ' + rr + ' is ' + row.length + ' wide');
      [...row].forEach((ch, c) => {
        const { q, r } = H.offsetToAxial(c, rr), key = H.key(q, r);
        const t = H.TERRAIN_OF_GLYPH[ch];
        if (!t) throw new Error(m.id + ': unknown glyph ' + ch);
        tiles[key] = t;
        if (ch === 'a') starts[0].push(key);
        if (ch === 'b') starts[1].push(key);
        if (ch === 'D') dials.push(key);
      });
    });
    const order = (a, b) => { const [qa, ra] = a.split(',').map(Number), [qb, rb] = b.split(',').map(Number); return ra - rb || qa - qb; };
    starts[0].sort(order); starts[1].sort(order); dials.sort(order);
    return { tiles, starts, dials, keep: Object.keys(tiles).find(k => tiles[k] === 'keep') || null, rows: m.rows.length, cols: H.MAP_ROWS_WIDTH };
  };

  const elemMult = (a, d) => (a === 'hour' ? 1.1 : H.OPPOSED[a] === d ? 1.3 : 1);
  const tideMult = (element, season) => {
    const s = H.get('season', season).element;
    if (element === s) return 1.2;
    if (element === H.OPPOSED[s]) return .85;
    return 1;
  };
  const NEG = ['chill', 'poison', 'burn', 'weakened', 'sleep', 'stop'];

  class BattleSim {
    constructor(state) { this.s = state; }

    // o: { map, season, seed, sides: [{ troops: [unitSpec, ...] }, ...], bellLimit, keepRule, tutorial, title }.
    static create(o) {
      const map = H.mapTiles(o.map), units = [];
      let uid = 0;
      for (const side of [0, 1]) {
        const cells = map.starts[side].slice();
        for (const spec of (o.sides[side].troops || [])) {
          if (!cells.length) break;
          const u = H.makeUnit(spec, side, 'u' + (uid++));
          Object.assign(u, H.parseKey(cells.shift()));
          units.push(u);
        }
      }
      const dials = {};
      map.dials.forEach((k, i) => { dials[k] = (i + 1) % 4; });   // the dials start at 1, 2, 3 in reading order
      const state = { map: o.map, season: o.season, seed: o.seed || 1, rng: new H.Rng(o.seed || 1).state(),
        bell: 0, bellLimit: o.bellLimit || H.tune.bellLimit, keep: o.keepRule === false ? null : map.keep,
        tiles: map.tiles, units, order: [], cursor: 0, over: false, winner: null, reason: '', tutorial: !!o.tutorial, captures: [],
        title: o.title || H.get('map', o.map).name, events: 0, dials, dialTarget: H.SEASON_ORDER.indexOf(o.season) };
      const sim = new BattleSim(state);
      sim.beginBell([]);
      return sim;
    }
    static load(json) { return new BattleSim(JSON.parse(JSON.stringify(json))); }
    serialize() { return JSON.parse(JSON.stringify(this.s)); }
    hash() { return H.hash(this.s); }
    rng() { const r = H.Rng.from(this.s.rng); const v = r.next(); this.s.rng = r.state(); return v; }
    roll(pct) { return this.rng() * 100 < pct; }

    // ---- queries ----
    get season() { return this.s.season; }
    tile(key) { const t = this.s.tiles[key]; return t ? H.get('terrain', t) : null; }
    alive(side) { return this.s.units.filter(u => u.side === side && !u.dead); }
    unitAt(q, r) { return this.s.units.find(u => !u.dead && u.q === q && u.r === r) || null; }
    byId(uid) { return this.s.units.find(u => u.uid === uid) || null; }
    current() { return this.s.over ? null : this.s.order[this.s.cursor] ? this.byId(this.s.order[this.s.cursor]) : null; }
    has(u, id) { return (u.passives || []).includes(id); }
    budget(u) { return u.mov + (u.status.haste > 0 ? 2 : 0) - (u.status.chill > 0 ? 2 : 0); }
    // a unit is warded when it is a knight, or a monster within the ward of a living knight on its side
    warded(u) {
      if (u.knight) return true;
      return this.s.units.some(k => !k.dead && k.knight && k.side === u.side && H.hexDist(k, u) <= (k.ward || 2));
    }
    // the cell a unit's skill or strike would touch: the terrain at a cell
    terrainAt(u) { return this.tile(H.key(u.q, u.r)); }

    // reach: Map of key to movement cost for a unit this turn (Dijkstra over the board; allies may be passed)
    reach(uid) {
      const u = this.byId(uid), out = new Map();
      if (!u || u.dead || u.moved || u.acted) return out;
      const budget = this.budget(u), start = H.key(u.q, u.r), cost = new Map([[start, 0]]), open = [start];
      while (open.length) {
        open.sort((a, b) => cost.get(a) - cost.get(b));
        const k = open.shift(), { q, r } = H.parseKey(k), c = cost.get(k);
        for (const n of H.neighbours(q, r)) {
          const nk = H.key(n.q, n.r), t = this.tile(nk);
          if (!t || !Number.isFinite(t.cost)) continue;
          const foe = this.unitAt(n.q, n.r);
          if (foe && foe.side !== u.side) continue;
          const nc = c + t.cost;
          if (nc > budget || (cost.has(nk) && cost.get(nk) <= nc)) continue;
          cost.set(nk, nc); open.push(nk);
        }
      }
      for (const [k, c] of cost) {
        const { q, r } = H.parseKey(k), occupant = this.unitAt(q, r);
        if (k !== start && (!occupant || occupant.uid === u.uid)) out.set(k, c);
      }
      if (!out.has(start)) out.set(start, 0);
      return out;
    }

    // ---- areas: the cells a skill touches when used on a cell from a unit ----
    // the direction (0..5) from the unit to a cell, for cones and lines
    dirTo(u, key) {
      const c = H.parseKey(key), a = H.hexWorld(u.q, u.r, 1), b = H.hexWorld(c.q, c.r, 1);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      let best = 0, bd = 999;
      for (let i = 0; i < 6; i++) { const d = Math.abs(((ang - H.DIR_ANGLE[i]) % 360 + 540) % 360 - 180); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    areaCells(u, key, sk) {
      const out = [], c = key ? H.parseKey(key) : u, n = sk.range[1] || 0;
      const within = (centre, rad) => {
        for (let dq = -rad; dq <= rad; dq++) for (let dr = -rad; dr <= rad; dr++) {
          const q = centre.q + dq, r = centre.r + dr;
          if (Math.abs(dq + dr) > rad || H.hexDist({ q, r }, centre) > rad) continue;
          if (this.tile(H.key(q, r))) out.push({ q, r });
        }
      };
      switch (sk.area) {
        case 'single': if (key) out.push(c); break;
        case 'r1': within(c, 1); break;
        case 'r2': within(c, 2); break;
        case 'self-r1': within(u, 1); break;
        case 'self-r2': within(u, 2); break;
        case 'self': out.push(u); break;
        case 'adj': for (const d of H.neighbours(u.q, u.r)) if (this.tile(H.key(d.q, d.r))) out.push(d); break;
        case 'cone2': case 'cone3': {
          const d = this.dirTo(u, key), rad = sk.area === 'cone2' ? 2 : 3;
          for (let dq = -rad; dq <= rad; dq++) for (let dr = -rad; dr <= rad; dr++) {
            const q = u.q + dq, r = u.r + dr, dist = H.hexDist(u, { q, r });
            if (dist < 1 || dist > rad || !this.tile(H.key(q, r))) continue;
            const a = H.hexWorld(u.q, u.r, 1), b = H.hexWorld(q, r, 1), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            if (Math.abs(((ang - H.DIR_ANGLE[d]) % 360 + 540) % 360 - 180) <= 62) out.push({ q, r });
          }
          break;
        }
        case 'line3': case 'line4': {
          const d = this.dirTo(u, key), len = sk.area === 'line3' ? 3 : 4;
          for (let k = 1; k <= len; k++) { const q = u.q + H.DIRS[d][0] * k, r = u.r + H.DIRS[d][1] * k; if (this.tile(H.key(q, r))) out.push({ q, r }); }
          break;
        }
        default: break;
      }
      return out;
    }
    // the units a skill of a unit touches on a cell
    affected(u, key, sk) {
      const cells = this.areaCells(u, key, sk), seen = new Set(), out = [];
      for (const c of cells) {
        const t = this.unitAt(c.q, c.r);
        if (!t || seen.has(t.uid)) continue;
        if (sk.filter === 'foes' && t.side === u.side) continue;
        if (sk.filter === 'allies' && (t.side !== u.side || (t.uid === u.uid && sk.area !== 'self' && !(sk.range[0] === 0)))) continue;
        if (sk.filter === 'own' && (t.side !== u.side || t.kind !== 'monster')) continue;
        if (sk.filter === 'self' && t.uid !== u.uid) continue;
        if (sk.filter === 'any' && false) continue;
        seen.add(t.uid); out.push(t);
      }
      return out;
    }
    // is the skill usable by a unit now (cooldown, once-a-battle, moving rules)
    usable(u, id) {
      const sk = H.get('skill', id);
      if (sk.kind === 'passive') return false;
      if ((u.cd[sk.id] || 0) > 0) return false;
      if (sk.once && u.used[sk.id]) return false;
      if (!sk.mobile && u.moved) return false;
      if (sk.needMove && (u.movedCost || 0) < sk.needMove) return false;
      if (u.status.sleep > 0 || u.status.stop > 0) return false;
      return true;
    }
    // the keys a skill may be aimed at from where the unit stands: each in range that has something to touch
    skillCandidates(uid, id) {
      const u = this.byId(uid);
      if (!u || u.dead || u.acted || !id) return [];
      const sk = H.get('skill', id);
      if (!this.usable(u, sk.id)) return [];
      const keys = [];
      const dmin = sk.range[0], dmax = sk.range[1];
      if (sk.area === 'self' || sk.area === 'self-r1' || sk.area === 'self-r2' || sk.area === 'adj') {
        if (this.affected(u, null, sk).length || sk.area === 'self' || sk.filter === 'self') keys.push(H.key(u.q, u.r));
        return keys;
      }
      if (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4') {
        const foes = this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(u, t) <= (sk.area === 'cone3' || sk.area === 'line4' ? 4 : 3));
        if (foes.length) { let best = foes[0]; for (const f of foes) if (H.hexDist(u, f) < H.hexDist(u, best)) best = f; keys.push(H.key(best.q, best.r)); }
        return keys;
      }
      // single, r1, r2: every cell in range with something of the filter's kind on it, or the unit itself for self-healing
      for (const k of Object.keys(this.s.tiles)) {
        const c = H.parseKey(k), d = H.hexDist(u, c);
        if (d < dmin || d > dmax) continue;
        if (!this.affected(u, k, sk).length) continue;
        keys.push(k);
      }
      return keys;
    }

    // the strikes a unit could make from a cell (the basic attack's reach)
    strikeable(uid, from) {
      const u = this.byId(uid);
      if (!u || u.dead || u.acted) return [];
      const at = from || { q: u.q, r: u.r };
      const range = u.rng + (this.has(u, 'eagleeye') && u.rng >= 2 ? 1 : 0);
      return this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(at, t) <= range);
    }
    // the skills a unit may use now (its own list, the usable ones)
    usableSkills(uid) {
      const u = this.byId(uid);
      if (!u) return [];
      return (u.skills || []).filter(id => this.usable(u, id) && this.skillCandidates(uid, id).length);
    }

    // ---- damage ----
    damage(att, def, mult = 1, opts = {}) {
      let a = att.atk + (att.status.valor > 0 ? 2 : 0) - (att.status.weakened > 0 ? 2 : 0);
      if (!this.warded(att)) a *= .8;
      const elem = opts.ignoreElem ? 1 : elemMult(att.element, def.element);
      const tide = opts.ignoreTide ? 1 : tideMult(att.element, this.s.season);
      let m = mult;
      if (opts.vsHour && def.element === 'hour') m *= opts.vsHour;
      if (opts.magic) m *= 1;
      if (this.has(att, 'ambush') && this.tile(H.key(att.q, att.r)) && this.tile(H.key(att.q, att.r)).id === 'forest') m *= 1.3;
      a *= elem * tide * H.tune.battleDamage * m;
      if (this.has(def, 'timeless')) a *= .5;
      let defence = (this.warded(def) ? def.def : def.def * .8) + this.terrainDef(def);
      if (def.status.warded > 0) defence += SHIELD;
      if (def.status.frostarmor > 0) defence += def.def * .4;
      if (this.has(def, 'thickhide')) defence += def.def * .1;
      if (def.side === 1 && att.side === 0) defence += H.tune.defenderGuard;
      if (opts.pierce) defence *= .5;
      if (opts.ignoreDef) defence = 0;
      return Math.max(1, Math.round(a - defence * .6));
    }
    terrainDef(u) { const t = this.tile(H.key(u.q, u.r)); return t ? t.def : 0; }
    hitChance(att, def, ranged, opts = {}) {
      const t = this.tile(H.key(def.q, def.r));
      let h = H.tune.hitChance + ((H.SIZE_HIT[att.size] || H.SIZE_HIT.M)[def.size] || 0) + (t ? t.hit : 0) + (opts.hit || 0);
      if (att.kind === 'monster' && this.s.units.some(k => !k.dead && k.knight && k.side === att.side && this.has(k, 'packtactics'))) h += 10;
      if (this.s.season === 'autumn' && ranged) h -= 15;
      return H.clamp(h, 30, 100);
    }
    forecast(att, def) {
      const ranged = H.hexDist(att, def) > 1 || att.rng > 1;
      return { hit: this.hitChance(att, def, ranged), dmg: this.damage(att, def) };
    }

    // a unit dies unless it has rebirth to spend; the death is an event
    settle(u, ev) {
      if (u.hp > 0 || u.dead) return;
      if (this.has(u, 'rebirth') && !u.used.rebirth) { u.used.rebirth = true; u.hp = Math.max(1, Math.ceil(u.maxHp * .3)); ev.push({ type: 'rebirth', uid: u.uid }); return; }
      u.dead = true; u.downed = true; ev.push({ type: 'down', uid: u.uid });
    }

    // a strike: a hit roll, the damage, the effects it carries, the counter a melee defender makes
    strike(att, def, opts = {}) {
      const ev = [], d = H.hexDist(att, def), ranged = d > 1 || att.rng > 1;
      const hit = this.roll(this.hitChance(att, def, ranged, opts));
      const e1 = { type: 'attack', from: att.uid, to: def.uid, hit, dmg: 0, counter: null, killed: false, skill: opts.skill || null };
      if (hit) {
        let dmg = this.damage(att, def, opts.mult || 1, opts);
        if (opts.basic && att.status.windup > 0) { dmg = Math.round(dmg * 1.5); att.status.windup = 0; }
        if (opts.pctTarget) dmg = Math.max(1, Math.round(def.maxHp * opts.pctTarget / 100));
        def.hp = Math.max(0, def.hp - dmg);
        e1.dmg = dmg;
        att.xp += 2;
        if (opts.drainPct) { const healed = Math.min(Math.floor(dmg * opts.drainPct / 100), att.maxHp - att.hp); att.hp += healed; e1.drained = healed; }
        if (opts.basic && this.has(att, 'frostfang') && this.roll(30)) def.status.chill = Math.max(def.status.chill, 2);
        if (opts.basic && this.has(att, 'stopbite') && this.roll(20)) def.status.stop = Math.max(def.status.stop, 1);
        if (this.has(def, 'thorns') && d === 1 && att.rng === 1 && !opts.noCounter) { const back = Math.max(1, Math.round(dmg * .1)); att.hp = Math.max(0, att.hp - back); e1.thorns = back; }
        if (def.hp <= 0) { e1.killed = true; att.xp += def.knight ? 10 : 6; }
        if (opts.burnsForest) { const t = this.tile(H.key(def.q, def.r)); if (t && t.id === 'forest') { this.s.tiles[H.key(def.q, def.r)] = 'ash'; ev.push({ type: 'terrain', key: H.key(def.q, def.r), from: 'forest', to: 'ash' }); } }
      }
      ev.push(e1);
      // a melee defender that survives strikes back when the attacker is next to it
      if (!opts.noCounter && hit && def.hp > 0 && def.rng === 1 && d === 1 && !def.dead) {
        const cHit = this.roll(this.hitChance(def, att, false));
        const cDmg = cHit ? this.damage(def, att, H.tune.counterDamage) : 0;
        att.hp = Math.max(0, att.hp - cDmg);
        e1.counter = { hit: cHit, dmg: cDmg, killed: cHit && att.hp <= 0 };
        if (e1.counter.killed) def.xp += att.knight ? 10 : 6;
      }
      this.settle(def, ev);
      this.settle(att, ev);
      return ev;
    }

    // a skill: its area, its filter, its power or heal, its statuses. Every skill ends the unit's turn.
    useSkill(u, id, key) {
      const sk = H.get('skill', id), ev = [];
      u.cd[sk.id] = sk.cd;
      if (sk.once) u.used[sk.id] = true;
      const targets = this.affected(u, key, sk);
      ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: targets[0] ? targets[0].uid : u.uid, key: key || H.key(u.q, u.r) });
      if (sk.area === 'self' && !targets.length) targets.push(u);
      for (const t of targets) {
        if (t.dead) continue;
        if (sk.filter === 'foes' || sk.filter === 'own' && sk.power && typeof sk.power === 'number') {
          if (typeof sk.power === 'number' || sk.pctTarget) {
            ev.push(...this.strike(u, t, { mult: typeof sk.power === 'number' ? sk.power : 1, skill: sk.id, noCounter: true, magic: sk.magic,
              vsHour: sk.vsHour, ignoreElem: sk.ignoreElem, ignoreTide: sk.ignoreTide, ignoreDef: sk.ignoreDef, pierce: sk.pierce, drainPct: sk.drainPct, burnsForest: sk.burnsForest, pctTarget: sk.pctTarget, hit: sk.hit }));
          }
        }
        if (sk.power && typeof sk.power === 'object' && sk.power.heal !== undefined && t.hp < t.maxHp) {
          const amt = Math.min(sk.power.heal, t.maxHp - t.hp); t.hp += amt; ev.push({ type: 'heal', uid: t.uid, amount: amt });
        }
        if (sk.power && typeof sk.power === 'object' && sk.power.pctMax !== undefined && t.hp < t.maxHp) {
          const amt = Math.min(Math.round(t.maxHp * sk.power.pctMax / 100), t.maxHp - t.hp); t.hp += amt; ev.push({ type: 'heal', uid: t.uid, amount: amt });
        }
        if (sk.cleanse) for (const s of NEG) t.status[s] = 0;
        if (sk.push && t.side !== u.side) {
          const dir = this.dirTo(u, H.key(t.q, t.r)), nq = t.q + H.DIRS[dir][0], nr = t.r + H.DIRS[dir][1];
          if (this.tile(H.key(nq, nr)) && Number.isFinite(this.tile(H.key(nq, nr)).cost) && !this.unitAt(nq, nr)) { t.q = nq; t.r = nr; ev.push({ type: 'push', uid: t.uid }); }
          else ev.push(...this.strike(u, t, { mult: 0.4, noCounter: true, skill: sk.id, ignoreDef: true }));
        }
        for (const [s, p, b] of sk.effects || []) {
          if (t.dead) break;
          if (this.roll(p)) { t.status[s] = Math.max(t.status[s] || 0, b); ev.push({ type: 'status', uid: t.uid, status: s, bells: b }); }
        }
      }
      if (sk.area === 'self' && sk.id === 'frostarmor') for (const [s, , b] of sk.effects) u.status[s] = Math.max(u.status[s] || 0, b);
      return ev;
    }

    // a dial: a unit that ends a move on it turns it; the gate opens when every dial shows the battle's season
    dialTurn(key, ev) {
      if (this.s.dials[key] === undefined) return;
      this.s.dials[key] = (this.s.dials[key] + 1) % 4;
      ev.push({ type: 'dial', key, value: this.s.dials[key] });
      if (Object.values(this.s.dials).every(v => v === this.s.dialTarget)) {
        const gates = Object.keys(this.s.tiles).filter(k => this.s.tiles[k] === 'gate');
        for (const g of gates) { this.s.tiles[g] = 'plain'; ev.push({ type: 'terrain', key: g, from: 'gate', to: 'plain' }); }
        if (gates.length) ev.push({ type: 'gate', open: true });
      }
    }

    // ---- legality: null when the command is fine, else the reason it is not ----
    check(cmd) {
      if (this.s.over) return 'the battle is over';
      const actor = this.current();
      if (!actor) return 'no unit is acting';
      if (!cmd || cmd.uid !== actor.uid) return 'not this unit\'s turn';
      if (cmd.t === 'move') {
        if (actor.moved) return 'already moved this turn';
        const to = H.parseKey(cmd.to);
        if (!this.reach(actor.uid).has(cmd.to)) return 'out of reach';
        if (this.unitAt(to.q, to.r) && cmd.to !== H.key(actor.q, actor.r)) return 'occupied';
        return null;
      }
      if (cmd.t === 'attack') {
        const t = this.byId(cmd.target);
        if (!t || t.dead || t.side === actor.side) return 'no such target';
        if (H.hexDist(actor, t) > actor.rng + (this.has(actor, 'eagleeye') && actor.rng >= 2 ? 1 : 0)) return 'too far';
        return null;
      }
      if (cmd.t === 'skill') {
        if (!cmd.skill || !actor.skills.includes(H.get('skill', cmd.skill).id)) return 'not one of its skills';
        const sk = H.get('skill', cmd.skill);
        if (sk.kind === 'passive') return 'a passive skill is not used';
        if ((actor.cd[sk.id] || 0) > 0) return 'skill recharging';
        if (sk.once && actor.used[sk.id]) return 'used once already';
        if (!sk.mobile && actor.moved) return 'the skill comes before the move';
        if (sk.needMove && (actor.movedCost || 0) < sk.needMove) return 'it must move ' + sk.needMove + ' hexes first';
        if (actor.status.sleep > 0 || actor.status.stop > 0) return 'it cannot act';
        if (!this.skillCandidates(actor.uid, sk.id).includes(cmd.key || H.key(actor.q, actor.r))) return 'no target there';
        return null;
      }
      if (cmd.t === 'wait') return null;
      if (cmd.t === 'retreat') return actor.leader && actor.knight ? null : 'only a commander can retreat';
      return 'unknown command ' + cmd.t;
    }

    // apply: runs a command, returns the events it caused. An illegal command returns [{ type: 'refused', reason }].
    apply(cmd) {
      const why = this.check(cmd);
      if (why) return [{ type: 'refused', reason: why }];
      const ev = [], actor = this.current();
      if (cmd.t === 'move') {
        const to = H.parseKey(cmd.to), path = this.pathTo(actor, cmd.to);
        actor.movedCost = Math.max(0, this.reach(actor.uid).get(cmd.to) || 0);
        Object.assign(actor, { q: to.q, r: to.r, moved: true });
        ev.push({ type: 'move', uid: actor.uid, path });
        this.s.events++;
        this.dialTurn(cmd.to, ev);
        return ev.concat(this.afterAction(actor, ev));
      }
      if (cmd.t === 'attack') {
        ev.push(...this.strike(actor, this.byId(cmd.target), { basic: true }));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'skill') {
        ev.push(...this.useSkill(actor, cmd.skill, cmd.key || H.key(actor.q, actor.r)));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'wait') {
        ev.push({ type: 'wait', uid: actor.uid });
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'retreat') {
        // a commander retreats: its troop leaves the field and its side loses
        ev.push({ type: 'retreat', uid: actor.uid });
        return ev.concat(this.finish(1 - actor.side, 'retreat', ev));
      }
      return ev;
    }

    // the cheapest path (for the move animation): the keys from the unit's cell to the target
    pathTo(u, toKey) {
      const start = H.key(u.q, u.r), dist = new Map([[start, 0]]), prev = new Map(), open = [start];
      while (open.length) {
        open.sort((a, b) => dist.get(a) - dist.get(b));
        const k = open.shift(); if (k === toKey) break;
        const { q, r } = H.parseKey(k);
        for (const n of H.neighbours(q, r)) {
          const nk = H.key(n.q, n.r), t = this.tile(nk);
          if (!t || !Number.isFinite(t.cost)) continue;
          const foe = this.unitAt(n.q, n.r); if (foe && foe.side !== u.side) continue;
          const nd = dist.get(k) + t.cost;
          if (!dist.has(nk) || nd < dist.get(nk)) { dist.set(nk, nd); prev.set(nk, k); open.push(nk); }
        }
      }
      const path = [toKey]; let k = toKey;
      while (prev.has(k)) { k = prev.get(k); path.unshift(k); }
      return path;
    }

    // ends the unit's turn: the keep and victory checks, then the next unit (or the next bell)
    endTurn(u, ev) {
      u.acted = true;
      this.s.cursor++;
      const out = this.afterAction(u, ev);
      if (this.s.over) return out;
      while (this.s.cursor < this.s.order.length && this.byId(this.s.order[this.s.cursor]).hp <= 0) this.s.cursor++;
      if (this.s.cursor >= this.s.order.length) this.beginBell(out);
      else this.startTurn(out);
      return out;
    }

    // after any action: keep and victory checks (returns the events it adds)
    // (§5.10) the attacker wins by a knight on the Keep at the end of the last bell; see beginBell
    afterAction(u, ev) {
      const out = [];
      void ev; void u;
      for (const side of [0, 1]) {
        if (this.s.units.find(x => x.side === side && x.leader && x.hp <= 0)) return this.finish(1 - side, 'leader', out);
        if (!this.alive(side).length) return this.finish(1 - side, 'routed', out);
      }
      return out;
    }
    finish(winner, reason, out) {
      if (this.s.over) return out;
      this.s.over = true; this.s.winner = winner; this.s.reason = reason;
      out.push({ type: 'over', winner, reason });
      // the losers' monsters still standing may be captured (§5.9): by an adjacent knight of the winners, or one whose ward holds them
      const loser = 1 - winner;
      for (const u of this.s.units) {
        if (u.side !== loser || u.kind !== 'monster' || u.dead || u.hp <= 0) continue;
        const captors = this.s.units.filter(k => !k.dead && k.side === winner && k.knight && (H.hexDist(k, u) <= 1 || H.hexDist(k, u) <= (k.ward || 2)));
        if (!captors.length) continue;
        const own = this.s.units.find(k => !k.dead && k.knight && k.side === loser && H.hexDist(k, u) <= (k.ward || 2));
        let chance = 25 + (own ? 0 : 25) + (u.hp < u.maxHp * .3 ? 15 : 0);
        chance = Math.min(75, chance);
        if (this.roll(chance)) {
          const captor = captors.sort((a, b) => H.hexDist(a, u) - H.hexDist(b, u) || (a.uid < b.uid ? -1 : 1))[0];
          this.s.captures.push({ uid: u.uid, side: winner, by: captor.uid });
          out.push({ type: 'captured', uid: u.uid, by: captor.uid });
        }
      }
      return out;
    }

    // the start of a bell: the season's changes, the statuses wear off or bite, the order of play
    beginBell(out) {
      this.s.bell++;
      if (this.s.bell > this.s.bellLimit) {
        // the last bell has ended: the attacker holds the field if one of its knights stands on the Keep
        const k = this.s.keep ? H.parseKey(this.s.keep) : null;
        const onKeep = k && this.s.units.some(u => !u.dead && u.side === 0 && u.knight && u.q === k.q && u.r === k.r);
        return onKeep ? this.finish(0, 'keep', out) : this.finish(1, 'time', out);
      }
      out.push({ type: 'bell', n: this.s.bell, season: this.s.season });
      const b = this.s.bell, season = this.s.season;
      const change = (key, from, to) => { this.s.tiles[key] = to; out.push({ type: 'terrain', key, from, to }); };
      if (season === 'winter' && b === 1) for (const k of Object.keys(this.s.tiles)) if (this.s.tiles[k] === 'river') change(k, 'river', 'ice');
      if (season === 'spring' && (b === 4 || b === 8)) {
        const flood = [];
        for (const k of Object.keys(this.s.tiles)) {
          if (this.s.tiles[k] !== 'plain') continue;
          const { q, r } = H.parseKey(k);
          if (H.neighbours(q, r).some(n => this.s.tiles[H.key(n.q, n.r)] === 'river')) flood.push(k);
        }
        for (const k of flood) change(k, 'plain', 'swamp');
      }
      if (season === 'summer' && (b === 5 || b === 9)) {
        const burnt = Object.keys(this.s.tiles).filter(k => this.s.tiles[k] === 'forest');
        for (const k of burnt) change(k, 'forest', 'ash');
        for (const u of this.s.units) {
          if (u.dead || !burnt.includes(H.key(u.q, u.r)) || u.burnt === b) continue;
          u.burnt = b; u.hp = Math.max(0, u.hp - 3);
          out.push({ type: 'burn', uid: u.uid, dmg: 3 });
          this.settle(u, out);
        }
        out.push(...this.afterAction(null, out));
        if (this.s.over) return out;
      }
      for (const u of this.s.units) {
        if (u.dead) continue;
        for (const id of Object.keys(u.cd)) if (u.cd[id] > 0) u.cd[id]--;
        for (const s of ['valor', 'haste', 'chill', 'weakened', 'warded', 'frostarmor']) if (u.status[s] > 0) u.status[s]--;
        if (u.status.poison > 0) { u.status.poison--; u.hp = Math.max(0, u.hp - 2); out.push({ type: 'poison', uid: u.uid, dmg: 2 }); this.settle(u, out); }
        if (u.status.burn > 0) { u.status.burn--; u.hp = Math.max(0, u.hp - 2); out.push({ type: 'burn', uid: u.uid, dmg: 2 }); this.settle(u, out); }
        if (u.dead) continue;
        if (this.has(u, 'regenerate') && u.hp < u.maxHp) { const amt = Math.min(Math.ceil(u.maxHp * .1), u.maxHp - u.hp); u.hp += amt; out.push({ type: 'heal', uid: u.uid, amount: amt }); }
      }
      out.push(...this.afterAction(null, out));
      if (this.s.over) return out;
      const order = this.s.units.filter(u => u.hp > 0).sort((a, b) => {
        const sa = a.mov + (a.knight ? .5 : 0), sb = b.mov + (b.knight ? .5 : 0);
        return sb - sa || a.side - b.side || (a.uid < b.uid ? -1 : 1);
      });
      this.s.order = order.map(u => u.uid);
      this.s.cursor = 0;
      for (const u of this.s.units) { u.moved = false; u.acted = false; u.movedCost = 0; }
      this.startTurn(out);
      return out;
    }

    // a unit whose turn it is: asleep or stopped, it loses the turn; the rest take theirs
    startTurn(out) {
      for (let guard = 0; guard < 200; guard++) {
        const u = this.current();
        if (!u) return out;
        if (u.status.sleep > 0 || u.status.stop > 0) {
          if (u.status.sleep > 0) u.status.sleep--;
          if (u.status.stop > 0) u.status.stop--;
          u.acted = true;
          out.push({ type: 'stunned', uid: u.uid });
          this.s.cursor++;
          while (this.s.cursor < this.s.order.length && this.byId(this.s.order[this.s.cursor]).hp <= 0) this.s.cursor++;
          if (this.s.cursor >= this.s.order.length) { this.beginBell(out); return out; }
          continue;
        }
        out.push({ type: 'turn', uid: u.uid });
        return out;
      }
      return out;
    }

    // a plain summary for the debug handle and the tests
    snapshot() {
      return { bell: this.s.bell, season: this.s.season, over: this.s.over, winner: this.s.winner, reason: this.s.reason,
        current: this.s.over ? null : this.s.order[this.s.cursor] || null,
        units: this.s.units.map(u => [u.uid, u.side, u.name, u.q, u.r, u.hp, u.maxHp, u.dead ? 1 : 0]) };
    }
  }
  H.BattleSim = BattleSim;
})();
