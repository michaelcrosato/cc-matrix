// BattleSim: a hex battle as plain JSON state. It never touches the engine, the DOM, the clock or Math.random: the same
// setup and the same commands always give the same events (the tests check it). Two sides fight across a board of
// hexes for up to a set number of bells. In each bell every living unit acts once, fastest first. A unit may move, then
// attack, use a skill or wait. Side 0 attacks: it wins by a knight standing on the Keep, or by routing side 1. Side 1
// holds: it wins when the bells run out, or by routing side 0. Either side loses when its commander falls.
// Statuses: slow, guard, rally, charge (self), stun and poison (from strikes), haste and shield (from allies).
// The Clockwork Sanctum's dials: each dial turns one step each time a unit ends a move on it; the gate opens when all
// dials show the battle's season.
(() => {
  const H = G;

  // ---- building a unit from a knight or a monster ----
  H.makeUnit = (spec, side, uid) => {
    const base = { uid, side, kind: spec.kind, ref: spec.ref, leader: !!spec.leader, campaignId: spec._id || null, owner: spec.owner ?? null,
      q: 0, r: 0, dead: false, moved: false, acted: false, cd: 0, xp: 0, downed: false,
      status: { slow: 0, guard: 0, rally: 0, charge: 0, stun: 0, poison: 0, haste: 0, shield: 0 }, items: (spec.items || []).slice() };
    if (spec.kind === 'knight') {
      const k = H.get('knight', spec.ref), cls = H.get('class', spec.cls || k.cls);
      const level = spec.level || k.level, grow = level - k.level;
      const items = base.items.map(id => H.get('item', id));
      const bonus = key => items.reduce((n, it) => n + (it[key] || 0), 0);
      const maxHp = k.hp + grow * 3 + (cls.hp || 0);
      return Object.assign(base, { name: k.name, knight: true, element: k.element, size: k.size || 'M', level, cls: cls.id,
        maxHp, hp: spec.hp === undefined ? maxHp : Math.min(spec.hp, maxHp), atk: k.atk + grow + (cls.atk || 0) + bonus('atk'),
        def: k.def + grow + (cls.def || 0) + bonus('def'), mov: k.mov + (cls.mov || 0) + bonus('mov'), rng: cls.rng || k.rng,
        skill: cls.skill || k.skill, look: k.look, realm: k.realm, bondCap: k.bond || 3, title: k.title });
    }
    const f = H.speciesForm(spec.ref, spec.form || 0);
    return Object.assign(base, { name: f.name, knight: false, element: f.element, size: f.size, level: (spec.form || 0) + 1,
      maxHp: f.hp, hp: spec.hp === undefined ? f.hp : spec.hp, atk: f.atk, def: f.def, mov: f.mov, rng: f.rng, skill: f.skill,
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
  const SHIELD = 3, HASTE = 2;

  class BattleSim {
    constructor(state) { this.s = state; }

    // o: { map, season, seed, sides: [{ troops: [unitSpec, ...] }, ...], bellLimit, keepRule (default: the map has a keep),
    //      tutorial, title }. Units are placed on the sides' start cells in the order given; a unit with no cell is left out.
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
        tiles: map.tiles, units, order: [], cursor: 0, over: false, winner: null, reason: '', tutorial: !!o.tutorial,
        title: o.title || H.get('map', o.map).name, events: 0, dials, dialTarget: H.SEASON_ORDER.indexOf(o.season) };
      const sim = new BattleSim(state);
      sim.beginBell([]);
      return sim;
    }
    static load(json) { return new BattleSim(JSON.parse(JSON.stringify(json))); }
    serialize() { return JSON.parse(JSON.stringify(this.s)); }
    hash() { return H.hash(this.s); }
    rng() { const r = H.Rng.from(this.s.rng); const v = r.next(); this.s.rng = r.state(); return v; }

    // ---- queries ----
    get season() { return this.s.season; }
    tile(key) { const t = this.s.tiles[key]; return t ? H.get('terrain', t) : null; }
    alive(side) { return this.s.units.filter(u => u.side === side && !u.dead); }
    unitAt(q, r) { return this.s.units.find(u => !u.dead && u.q === q && u.r === r) || null; }
    byId(uid) { return this.s.units.find(u => u.uid === uid) || null; }
    current() { return this.s.over ? null : this.s.order[this.s.cursor] ? this.byId(this.s.order[this.s.cursor]) : null; }
    budget(u) { return u.mov + (u.status.charge ? 2 : 0) + (u.status.haste > 0 ? HASTE : 0) - (u.status.slow > 0 ? 2 : 0); }

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

    // the enemies a unit can strike from where it stands (or from a given cell)
    strikeable(uid, from) {
      const u = this.byId(uid);
      if (!u || u.dead || u.acted) return [];
      const at = from || { q: u.q, r: u.r };
      return this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(at, t) <= u.rng);
    }
    // the targets of a unit's skill, by its kind
    skillTargets(uid) {
      const u = this.byId(uid), sk = u && u.skill ? H.get('skill', u.skill) : null;
      if (!u || !sk || u.acted || u.cd > 0) return [];
      if (sk.kind === 'self') return [u.uid];
      if (sk.kind === 'sweep') return this.s.units.some(t => !t.dead && t.side !== u.side && H.hexDist(u, t) === 1) ? [u.uid] : [];
      if (sk.kind === 'heal') return this.s.units.filter(t => !t.dead && t.side === u.side && t.uid !== u.uid && H.hexDist(u, t) <= sk.range && t.hp < t.maxHp).map(t => t.uid);
      if (sk.kind === 'ally') return this.s.units.filter(t => !t.dead && t.side === u.side && t.uid !== u.uid && H.hexDist(u, t) <= sk.range).map(t => t.uid);
      return this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(u, t) <= sk.range).map(t => t.uid);
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
        if (H.hexDist(actor, t) > actor.rng) return 'too far';
        return null;
      }
      if (cmd.t === 'skill') {
        const sk = actor.skill && H.get('skill', actor.skill);
        if (!sk) return 'no skill';
        if (actor.cd > 0) return 'skill recharging';
        if (sk.kind === 'self') return sk.moveBonus && actor.moved ? 'Charge comes before the move' : null;
        if (sk.kind === 'sweep') return this.skillTargets(actor.uid).length ? null : 'no foe beside it';
        if (!this.byId(cmd.target)) return 'no target';
        if (!this.skillTargets(actor.uid).includes(cmd.target)) return 'out of range';
        return null;
      }
      if (cmd.t === 'wait') return null;
      return 'unknown command ' + cmd.t;
    }

    // apply: runs a command, returns the events it caused. An illegal command returns [{ type: 'refused', reason }].
    apply(cmd) {
      const why = this.check(cmd);
      if (why) return [{ type: 'refused', reason: why }];
      const ev = [], actor = this.current();
      if (cmd.t === 'move') {
        const to = H.parseKey(cmd.to), path = this.pathTo(actor, cmd.to);
        Object.assign(actor, { q: to.q, r: to.r, moved: true });
        ev.push({ type: 'move', uid: actor.uid, path });
        this.s.events++;
        this.dialTurn(cmd.to, ev);
        return ev.concat(this.afterAction(actor, ev));
      }
      if (cmd.t === 'attack') {
        ev.push(...this.strike(actor, this.byId(cmd.target)));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'skill') {
        ev.push(...this.useSkill(actor, cmd.target));
        const sk = H.get('skill', actor.skill);
        if (sk.kind === 'self' && sk.moveBonus) return ev.concat(this.afterAction(actor, ev));
        return ev.concat(this.endTurn(actor, ev));
      }
      if (cmd.t === 'wait') {
        ev.push({ type: 'wait', uid: actor.uid });
        return ev.concat(this.endTurn(actor, ev));
      }
      return ev;
    }

    // a unit ends a move on a dial: the dial turns one step; when every dial shows the season, the gate opens
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

    terrainDef(u) { const t = this.tile(H.key(u.q, u.r)); return t ? t.def : 0; }
    // Ward: a monster stands in the ward of its side's knights when it is within three hexes of one; outside it loses a fifth of its attack and defence
    warded(u) {
      if (u.knight) return true;
      return this.s.units.some(k => !k.dead && k.knight && k.side === u.side && H.hexDist(k, u) <= 3);
    }

    // damage: the attacker's attack, scaled by element, the season's tide and the battle tunables, less the defence
    damage(att, def, mult = 1, opts = {}) {
      let a = att.atk + (att.status.rally > 0 ? 2 : 0);
      if (!this.warded(att)) a *= .8;
      a *= elemMult(att.element, def.element) * tideMult(att.element, this.s.season) * H.tune.battleDamage * mult;
      let defence = (this.warded(def) ? def.def : def.def * .8) + this.terrainDef(def) + (def.status.guard > 0 ? H.get('skill', 'guard').defBonus : 0) + (def.status.shield > 0 ? SHIELD : 0);
      if (opts.pierce) defence *= .5;
      return Math.max(1, Math.round(a - defence * .6));
    }
    hitChance(att, def, ranged) {
      const t = this.tile(H.key(def.q, def.r));
      let h = H.tune.hitChance + ((H.SIZE_HIT[att.size] || H.SIZE_HIT.M)[def.size] || 0) + (t ? t.hit : 0);
      if (this.s.season === 'autumn' && ranged) h -= 15;
      return H.clamp(h, 30, 100);
    }
    roll(pct) { return this.rng() * 100 < pct; }
    // Forecast: the chance to hit a target and the damage a hit does, before the dice are thrown
    forecast(att, def) {
      const ranged = H.hexDist(att, def) > 1 || att.rng > 1;
      return { hit: this.hitChance(att, def, ranged), dmg: this.damage(att, def) };
    }

    strike(att, def, opts = {}) {
      const ev = [], d = H.hexDist(att, def), ranged = d > 1 || att.rng > 1;
      const hit = this.roll(this.hitChance(att, def, ranged));
      const ev1 = { type: 'attack', from: att.uid, to: def.uid, hit, dmg: 0, counter: null, killed: false, skill: opts.skill || null };
      if (hit) {
        const dmg = this.damage(att, def, opts.mult || 1, opts);
        def.hp = Math.max(0, def.hp - dmg);
        ev1.dmg = dmg;
        att.xp += 2;
        if (opts.drain) { const healed = Math.min(Math.floor(dmg / 2), att.maxHp - att.hp); att.hp += healed; ev1.drained = healed; }
        if (opts.stun) { def.status.stun = Math.max(def.status.stun, 1); ev1.stun = true; }
        if (opts.poison) { def.status.poison = Math.max(def.status.poison, 2); ev1.poison = true; }
        if (def.hp <= 0) { ev1.killed = true; att.xp += def.knight ? 10 : 6; }
      }
      ev.push(ev1);
      // a melee defender that survives strikes back when the attacker is next to it
      if (!opts.noCounter && hit && def.hp > 0 && def.rng === 1 && d === 1) {
        const cHit = this.roll(this.hitChance(def, att, false));
        const cDmg = cHit ? this.damage(def, att, H.tune.counterDamage) : 0;
        att.hp = Math.max(0, att.hp - cDmg);
        ev1.counter = { hit: cHit, dmg: cDmg, killed: cHit && att.hp <= 0 };
        if (ev1.counter.killed) def.xp += att.knight ? 10 : 6;
      }
      for (const u of [att, def]) if (u.hp <= 0 && !u.dead) { u.dead = true; ev.push({ type: 'down', uid: u.uid }); }
      return ev;
    }

    useSkill(u, targetUid) {
      const sk = H.get('skill', u.skill), ev = [];
      u.cd = sk.cd;
      if (sk.kind === 'self') {
        if (sk.aura) for (const f of this.s.units) if (!f.dead && f.side === u.side && H.hexDist(u, f) === 1) f.status.rally = sk.aura;
        if (sk.defBonus) u.status.guard = 1;
        if (sk.moveBonus) u.status.charge = 1;
        ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: u.uid });
        return ev;
      }
      if (sk.kind === 'sweep') {
        ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: null });
        const foes = this.s.units.filter(t => !t.dead && t.side !== u.side && H.hexDist(u, t) === 1).map(t => t.uid);
        for (const id of foes) { const t = this.byId(id); if (!t.dead) ev.push(...this.strike(u, t, { mult: sk.mult, skill: sk.id, noCounter: true })); }
        return ev;
      }
      const t = this.byId(targetUid);
      if (sk.kind === 'heal') {
        const amt = Math.min(sk.amount, t.maxHp - t.hp);
        t.hp += amt;
        ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: t.uid }, { type: 'heal', uid: t.uid, amount: amt });
        return ev;
      }
      if (sk.kind === 'ally') {
        if (sk.buff === 'haste') t.status.haste = Math.max(t.status.haste, 2);
        if (sk.buff === 'shield') t.status.shield = Math.max(t.status.shield, 2);
        ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: t.uid });
        return ev;
      }
      if (sk.slow) t.status.slow = Math.max(t.status.slow, sk.slow);
      ev.push({ type: 'skill', uid: u.uid, skill: sk.id, name: sk.name, target: t.uid });
      ev.push(...this.strike(u, t, { mult: sk.mult, skill: sk.id, noCounter: true, stun: sk.stun, poison: sk.poison, drain: sk.drain, pierce: sk.pierce }));
      return ev;
    }

    // ends the unit's turn: the keep and victory checks, then the next unit (or the next bell)
    endTurn(u, ev) {
      u.acted = true;
      u.status.charge = 0;
      this.s.cursor++;
      const out = this.afterAction(u, ev);
      if (this.s.over) return out;
      while (this.s.cursor < this.s.order.length && this.byId(this.s.order[this.s.cursor]).hp <= 0) this.s.cursor++;
      if (this.s.cursor >= this.s.order.length) this.beginBell(out);
      else this.startTurn(out);
      return out;
    }

    // after any action: keep and victory checks (returns the events it adds)
    afterAction(u, ev) {
      const out = [];
      void ev;
      if (this.s.keep && u && u.side === 0 && u.knight && u.hp > 0) {
        const k = H.parseKey(this.s.keep);
        if (u.q === k.q && u.r === k.r) return this.finish(0, 'keep', out);
      }
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
      return out;
    }

    // the start of a bell: the season's changes, the statuses wear off or bite, the order of play
    beginBell(out) {
      this.s.bell++;
      if (this.s.bell > this.s.bellLimit) return this.finish(1, 'time', out);
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
          if (u.hp <= 0) { u.dead = true; out.push({ type: 'down', uid: u.uid }); }
        }
        out.push(...this.afterAction(null, out));
        if (this.s.over) return out;
      }
      for (const u of this.s.units) {
        if (u.dead) continue;
        u.cd = Math.max(0, u.cd - 1);
        u.status.slow = Math.max(0, u.status.slow - 1);
        u.status.rally = Math.max(0, u.status.rally - 1);
        u.status.haste = Math.max(0, u.status.haste - 1);
        u.status.shield = Math.max(0, u.status.shield - 1);
        if (u.status.poison > 0) {
          u.status.poison--;
          u.hp = Math.max(0, u.hp - 2);
          out.push({ type: 'poison', uid: u.uid, dmg: 2 });
          if (u.hp <= 0) { u.dead = true; out.push({ type: 'down', uid: u.uid }); }
        }
      }
      out.push(...this.afterAction(null, out));
      if (this.s.over) return out;
      const order = this.s.units.filter(u => u.hp > 0).sort((a, b) => {
        const sa = a.mov + (a.knight ? .5 : 0), sb = b.mov + (b.knight ? .5 : 0);
        return sb - sa || a.side - b.side || (a.uid < b.uid ? -1 : 1);
      });
      this.s.order = order.map(u => u.uid);
      this.s.cursor = 0;
      for (const u of this.s.units) { u.moved = false; u.acted = false; }
      this.startTurn(out);
      return out;
    }

    // a unit whose turn it is: a stunned unit loses its turn; the rest take theirs
    startTurn(out) {
      for (let guard = 0; guard < 200; guard++) {
        const u = this.current();
        if (!u) return out;
        u.status.guard = 0;          // Brace lasts until the unit's next turn
        u.status.charge = 0;
        if (u.status.stun > 0) {
          u.status.stun--; u.acted = true;
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
