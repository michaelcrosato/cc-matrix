// BATTLESIM: a hex battle of up to three troops a side (or a free-for-all of up to four), fought within twelve bells.
// Pure and deterministic: its state is plain JSON (this.s), its randomness G.Rng on s.rs, and it never touches the
// engine, the DOM, the clock or Math.random. apply(cmd) -> events[]; legal(cmd); forecast(...); serialize(); hash().
// Commands (the active troop's units only):
//   { t: 'move', u, to: [cx, cy] }  { t: 'undo', u }  { t: 'act', u, a: 'attack' | skillId | 'item:<id>', at: [cx, cy] }
//   { t: 'guard', u }  { t: 'wait', u }  { t: 'retreat', u }  { t: 'end' }
// Plus tools: { t: 'win', side }, { t: 'ko', u }, { t: 'bell', n }, { t: 'season', s }, { t: 'dials' }.

const H = G.hex, R = G.Rng;
// neighbour offsets in offset rows (even and odd rows), the same order as G.hex.DIRS
const EVEN = [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], ODD = [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]];

/* ---- building field units from campaign records (shared with skirmish and the hub) ---- */
/** a field unit spec from a knight record { id, cls, level, exp, stats, hp, mp, elem, items, ruler, learned, realm } */
G.unitFromKnight = (k, o = {}) => {
  const def = G.has('knight', k.id) ? G.get('knight', k.id) : null, c = G.get('class', k.cls), boost = 1 + (o.boost || 0);
  const s = Object.assign({}, k.stats), mods = { atk: 0, def: 0, int: 0, agi: 0, mp: 0, mov: 0, ward: 0, bond: 0 }, flags = { immune: [] };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const id = k.items && k.items[slot]; if (!id) continue; const it = G.get('item', id);
    for (const [m, v] of Object.entries(it.mods)) mods[m] = (mods[m] || 0) + v;
    for (const [f, v] of Object.entries(it.flags)) { if (f === 'immune') flags.immune.push(...v); else if (f === 'range') flags.range = (flags.range || 0) + v; else flags[f] = v; }
  }
  const skills = G.classSkills(k.cls, k.elem, k.level).concat(k.learned || []).filter((v, i, a) => a.indexOf(v) === i);
  const basic = Object.assign({}, c.basic); if (flags.range) basic.range = [basic.range[0], basic.range[1] + flags.range];
  if (skills.includes('eagleeye') && basic.ranged) basic.range = [basic.range[0], basic.range[1] + 1];
  const mhp = Math.round(s.hp * boost), mmp = s.mp + mods.mp;
  return {
    kind: 'knight', ref: k.id, name: (def && def.short) || k.name || k.id, cls: k.cls, level: k.level, exp: k.exp || 0, elem: k.elem, size: 'M',
    mhp, hp: Math.min(mhp, Math.round((k.hp === undefined ? s.hp : k.hp) * boost)), mmp, mp: Math.min(mmp, k.mp === undefined ? mmp : k.mp),
    atk: Math.round((s.atk + mods.atk) * boost), def: Math.round((s.def + mods.def) * boost), int: Math.round((s.int + mods.int) * boost), agi: Math.round((s.agi + mods.agi) * boost),
    mov: c.mov + mods.mov, ward: c.ward + mods.ward, skills, basic, flags, ruler: !!k.ruler, boss: !!(def && def.boss), realm: k.realm,
    growth: G.classGrowth(k.cls), stats: s
  };
};
/** a field unit spec from a monster record { uid, sp, form, level, exp, hp, mp } */
G.unitFromMonster = (m, o = {}) => {
  const sp = G.get('monster', m.sp), st = G.monsterStats(m.sp, m.form, m.level), fl = G.monsterFlags(m.sp, m.form), boost = 1 + (o.boost || 0);
  const skills = G.monsterSkills(m.sp, m.form), mhp = Math.round(st.hp * boost);
  return {
    kind: 'monster', ref: m.uid, sp: m.sp, form: m.form, name: G.monsterName(m.sp, m.form), level: m.level, exp: m.exp || 0, elem: sp.elem, size: G.monsterSize(m.sp, m.form),
    mhp, hp: Math.min(mhp, Math.round((m.hp === undefined ? st.hp : m.hp) * boost)), mmp: st.mp, mp: Math.min(st.mp, m.mp === undefined ? st.mp : m.mp),
    atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: Math.round(st.agi * boost), mov: st.mov,
    flier: fl.flier, swimmer: fl.swimmer, floater: fl.floater, skills, basic: Object.assign({ anim: 'bite' }, sp.basic), flags: { immune: [] },
    elite: !!sp.elite, breath3: !!sp.breath3, realm: m.realm
  };
};

const PASSIVES = ['thorns', 'regenerate', 'frostfang', 'stopbite', 'rebirth', 'ambush', 'packtactics', 'thickhide', 'eagleeye', 'timeless'];

/** a binary heap ordered by [priority, tie]: the same pops every time */
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  _lt(i, j) { const p = this.a[i], q = this.a[j]; return p[0] !== q[0] ? p[0] < q[0] : p[1] < q[1]; }
  push(pri, tie, v) { const a = this.a; a.push([pri, tie, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!this._lt(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this._lt(l, m)) m = l; if (r < a.length && this._lt(r, m)) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; }
}
G.MinHeap = MinHeap;

class BattleSim {
  constructor(s) { this.s = s; }
  static load(json) { return new BattleSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return JSON.stringify(this.s); }
  hash() { return G.hashJSON(this.s); }

  /**
   * spec: { seed, map, season, mode ('siege' | 'sanctum' | 'shrine' | 'free'), wheel, bells, longWinter, castle,
   *   sides: [{ realm, role ('att' | 'def' | 'seat'), name, color, human, items: { id: n },
   *     troops: [{ knight: unitSpec, monsters: [unitSpec], formation, anchor }] }], tutorial, lunete, events }
   */
  static create(spec) {
    const p = G.parseMap(spec.map), m = G.get('map', spec.map), mode = spec.mode || m.mode || 'siege';
    const s = {
      v: 1, rs: R.seed(spec.seed || 1), map: spec.map, w: p.w, h: p.h, base: p.codes, mode, flood: m.flood,
      season: spec.wheel ? 'spring' : spec.season || 'spring', wheel: !!spec.wheel, longWinter: !!spec.longWinter,
      cells: null, burn: {}, keep: p.keep, castle: spec.castle || null, bells: spec.bells || (mode === 'shrine' ? 6 : G.tune.bells),
      bell: 0, order: [], oi: 0, active: null, n: 0, over: null, units: {}, troops: [], sides: [], nextId: 1,
      glory: {}, stats: {}, dials: p.dials.map(c => ({ c, lit: false })), hand: 0, handStopped: false, wheelTurned: false,
      gkCalled: false, tutorial: !!spec.tutorial, captures: [], itemsUsed: {}, log: [], flags: {}
    };
    s.cells = s.base.map(c => G.seasonTerrain(c, s.season, s.flood));
    const sim = new BattleSim(s), ev = [];
    spec.sides.forEach((sd, i) => {
      s.sides.push({ i, realm: sd.realm, role: sd.role || (i === 0 ? 'att' : 'def'), name: sd.name || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).short : sd.realm), color: sd.color || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).color : '#ffffff'), human: !!sd.human, items: Object.assign({}, sd.items || {}), out: false, seat: sd.seat === undefined ? i : sd.seat, expMul: sd.expMul || 1 });
      s.glory[i] = 0; s.stats[i] = { damage: 0, kos: 0, shrine: 0 };
    });
    // deploy: enemy direction from each side's anchors toward the others'
    const anchorOf = (sd, t, ti) => t.anchor || (sd.role === 'def' ? String(7 + ti) : sd.role === 'seat' ? String(sd.seat + 1) : String(1 + ti));
    const allAnchors = spec.sides.map((sd, i) => sd.troops.map((t, ti) => p.anchors[anchorOf(Object.assign({ seat: i }, sd), t, ti)]).filter(Boolean));
    spec.sides.forEach((sd, i) => {
      const foes = allAnchors.filter((_, j) => j !== i).flat(), fc = foes.length ? foes.map(c => H.center(c)).reduce((a, b) => [a[0] + b[0] / foes.length, a[1] + b[1] / foes.length], [0, 0]) : [p.w * 14, p.h * 12];
      sd.troops.forEach((t, ti) => {
        const anc = p.anchors[anchorOf(Object.assign({ seat: i }, sd), t, ti)]; if (!anc) return;
        const tid = s.troops.length, troop = { id: tid, side: i, knight: null, units: [], gone: false, formation: t.formation || 'vanguard', auto: false };
        s.troops.push(troop);
        const k = sim._addUnit(t.knight, i, tid); troop.knight = k.id;
        const kc = sim._freeNear(anc, k) || anc; k.cx = kc[0]; k.cy = kc[1]; k.facing = sim._dirToPoint(kc, fc); sim.dirty();
        for (const ms of t.monsters || []) {
          const u = sim._addUnit(ms, i, tid), c = sim._formationHex(kc, fc, troop.formation, u);
          if (!c) { delete s.units[u.id]; continue; }
          u.cx = c[0]; u.cy = c[1]; u.facing = k.facing; sim.dirty();
        }
      });
    });
    if (mode === 'sanctum') {   // the Gray Knight leads the Dominion side and is its ruler
      for (const u of Object.values(s.units)) if (u.ref === 'graynight') { u.ruler = true; u.boss = true; u.passives.timeless = true; }
    }
    ev.push({ e: 'deploy' });
    sim._startBell(ev);
    s.log.push(...ev.map(e => e.e)); if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    for (const e of ev) e.n = ++s.n;
    sim.startEvents = ev;
    return sim;
  }
  _addUnit(spec, side, troop) {
    const s = this.s, id = 'u' + s.nextId++;
    const u = Object.assign({ id, side, troop, cx: -1, cy: -1, facing: 0, fx: {}, moved: 0, from: null, acted: false, done: false, alive: true, out: false, dead: false, captured: null, exp0: spec.exp || 0, level0: spec.level, expGain: 0, levelsGained: 0, gains: {}, passives: {}, rebirthUsed: false, turningUsed: false, windup: false, ruler: false, boss: false, elite: false, flier: false, swimmer: false, floater: false, kos: 0, dmgDealt: 0, healed: 0 }, G.clone(spec));
    for (const p of PASSIVES) if (u.skills.includes(p)) u.passives[p] = true;
    if (u.flags && u.flags.thorns) u.passives.thorns = true;
    s.units[id] = u; s.troops[troop].units.push(id); this.dirty();
    return u;
  }
  _dirToPoint(c, pt) { const [x, y] = H.center(c); let a = Math.atan2(pt[1] - y, pt[0] - x) * 180 / Math.PI; if (a < 0) a += 360; return Math.round(a / 60) % 6; }
  _freeNear(c, u) {
    for (let r = 0; r <= 3; r++) for (const h of H.within(c, r, this.s.w, this.s.h).filter(x => H.dist(x, c) === r)) if (this.canStand(h, u) && !this.at(h)) return h;
    return null;
  }
  _formationHex(kc, fc, form, u) {
    const s = this.s, [kx, ky] = H.center(kc), fl = Math.hypot(fc[0] - kx, fc[1] - ky) || 1, fd = [(fc[0] - kx) / fl, (fc[1] - ky) / fl];
    const cands = H.within(kc, 4, s.w, s.h).filter(h => !H.eq(h, kc) && this.canStand(h, u) && !this.at(h));
    const score = h => {
      const d = H.dist(h, kc), [x, y] = H.center(h), dot = ((x - kx) * fd[0] + (y - ky) * fd[1]) / (Math.hypot(x - kx, y - ky) || 1);
      if (form === 'vanguard') return (d <= 2 && dot > .2 ? 0 : 10) + d * 2 - dot * 3;
      if (form === 'column') return (dot < -.6 ? 0 : dot < 0 ? 6 : 12) + d * 2 + Math.abs((x - kx) * fd[1] - (y - ky) * fd[0]) / 14;
      return d * 4 - dot;   // shield: the ring first
    };
    cands.sort((a, b) => score(a) - score(b) || a[1] - b[1] || a[0] - b[0]);
    return cands[0] || null;
  }

  /* ---- queries ---- */
  unit(id) { return this.s.units[id]; }
  get units() { return Object.values(this.s.units); }
  onField(u) { return u.alive && !u.out && !u.captured; }
  field() { return this.units.filter(u => this.onField(u)); }
  at(c) {
    if (!this._occ) { this._occ = new Map(); for (const id in this.s.units) { const u = this.s.units[id]; if (this.onField(u)) this._occ.set(u.cy * 1000 + u.cx, u); } }
    return this._occ.get(c[1] * 1000 + c[0]) || null;
  }
  /** positions changed: the occupancy cache is rebuilt on the next at() */
  dirty() { this._occ = null; this._reachCache = null; }
  code(c) { return this.s.cells[c[1] * this.s.w + c[0]]; }
  inside(c) { return H.inside(c, this.s.w, this.s.h); }
  troop(id) { return this.s.troops[id]; }
  activeTroop() { return this.s.active === null ? null : this.s.troops[this.s.active]; }
  knightOf(u) { const t = this.s.troops[u.troop]; return t ? this.s.units[t.knight] : null; }
  foes(a, b) { return a.side !== b.side; }
  canStand(c, u) { return this.inside(c) && G.canEnd(this.code(c), u); }
  sideOf(i) { return this.s.sides[i]; }
  sideKnights(i) { return this.field().filter(u => u.side === i && u.kind === 'knight'); }
  /** the season's movement penalty and buffs */
  movOf(u) {
    let m = u.mov; if (u.fx.haste) m += 1; if (u.fx.chill) m -= 1;
    if (this.s.season === 'autumn' && u.flier) m -= 1;
    return Math.max(1, m);
  }
  /** effective stats of a unit standing at c (the Ward penalty, buffs and debuffs) */
  eff(u, c = [u.cx, u.cy]) {
    let atk = u.atk, def = u.def, int = u.int, agi = u.agi;
    if (u.kind === 'monster') { const k = this.knightOf(u); if (k && this.onField(k) && H.dist(c, [k.cx, k.cy]) > k.ward) { const p = 1 - G.tune.wardPenalty; atk *= p; def *= p; int *= p; } }
    const f = u.fx;
    if (f.valor) atk *= 1.2; if (f.weakened) atk *= .85;
    if (f.warded) def *= 1.2; if (f.exposed) def *= .8; if (f.burn) def *= .9; if (f.frostarmor) def *= 1.4; if (u.passives.thickhide) def *= 1.1;
    if (f.haste) agi *= 1.2; if (f.chill) agi *= .8;
    if (u.boss && this.s.wheelTurned) def *= .6;
    return { atk, def, int, agi };
  }
  /** move cost of a hex for a unit */
  stepCost(c, u) { return G.moveCost(this.code(c), u, this.s.season); }
  /** reachable hexes { key: { c, cost, path } } for unit u from its hex (enemies block; allies pass; can't end occupied) */
  reach(u, budget = this.movOf(u)) {
    const ck = u.id + ':' + budget + ':' + u.cx + ',' + u.cy;
    if (!this._reachCache) this._reachCache = new Map();
    const hit = this._reachCache.get(ck); if (hit) return hit;
    const out = this._reach(u, budget); this._reachCache.set(ck, out); return out;
  }
  _reach(u, budget) {
    const s = this.s, W = s.w, Hh = s.h, N = W * Hh, cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const si = u.cy * W + u.cx; cost[si] = 0;
    const open = new MinHeap(); open.push(0, si, si);
    const stepC = new Float64Array(N).fill(-1);
    while (open.size) {
      const [c0, , i] = open.pop(); if (c0 > cost[i]) continue;
      const x = i % W, y = (i - x) / W, D = y & 1 ? ODD : EVEN;
      for (let d = 0; d < 6; d++) {
        const nx = x + D[d][0], ny = y + D[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
        const ni = ny * W + nx;
        const o = this.at([nx, ny]); if (o && o.side !== u.side) continue;
        let sc = stepC[ni]; if (sc < 0) sc = stepC[ni] = G.moveCost(s.cells[ni], u, s.season);
        if (!isFinite(sc)) continue;
        const nc = c0 + sc; if (nc > budget || nc >= cost[ni]) continue;
        cost[ni] = nc; prev[ni] = i; open.push(nc, ni, ni);
      }
    }
    const out = {};
    for (let i = 0; i < N; i++) {
      if (!isFinite(cost[i])) continue;
      const x = i % W, y = (i - x) / W, c = [x, y];
      if (i !== si) { if (!G.canEnd(s.cells[i], u)) continue; if (this.at(c)) continue; }
      const path = []; for (let k = i; k >= 0; k = prev[k]) { const kx = k % W; path.unshift([kx, (k - kx) / W]); if (k === si) break; }
      out[H.key(c)] = { c, cost: cost[i], path };
    }
    return out;
  }
  /** the skill spec for an action id of a unit ('attack' -> its basic attack) */
  skillOf(u, a) {
    if (a === 'attack') return Object.assign({ kind: 'basic', elem: 'user', p: u.basic.p, range: u.basic.range, area: 'single', who: 'foes', mp: 0, mobile: true, ranged: !!u.basic.ranged, status: u.basic.status, drainPct: u.basic.drainPct, name: u.basic.name, anim: u.basic.anim, fx: u.basic.ranged ? 'arrow' : 'slash' }, {});
    if (a && a.startsWith('item:')) { const it = G.get('item', a.slice(5)); return { kind: 'item', item: it.id, name: it.name, range: [0, 1], area: 'single', who: 'ally', mp: 0, mobile: true, use: it.use, fx: 'heal', anim: 'cast' }; }
    const sk = G.get('skill', a); return sk;
  }
  /** the actions a unit could take now (labels for menus), each { a, sk, ok, why } */
  actions(u) {
    const out = [{ a: 'attack', sk: this.skillOf(u, 'attack') }];
    for (const id of u.skills) { const sk = G.get('skill', id); if (sk.kind !== 'passive') out.push({ a: id, sk }); }
    if (u.kind === 'knight') for (const [id, n] of Object.entries(this.s.sides[u.side].items)) if (n > 0 && G.get('item', id).slot === 'consumable' && !G.get('item', id).muster) out.push({ a: 'item:' + id, sk: this.skillOf(u, 'item:' + id), count: n });
    for (const o of out) { const w = this.why(u, o.a); o.ok = !w; o.why = w; }
    return out;
  }
  /** why a unit can't use an action now (null: it can) */
  why(u, a) {
    const s = this.s, sk = this.skillOf(u, a);
    if (!this.onField(u)) return 'Not on the field';
    if (u.acted || u.done) return 'Already acted';
    if (sk.kind === 'spell' && u.moved > 0) return 'Spells need planted feet';
    if (sk.kind === 'special' && u.moved > 0 && !sk.mobile) return 'Not after moving';
    if (sk.needMove && u.moved < sk.needMove) return 'Move ' + sk.needMove + '+ hexes first';
    if (sk.fliers && !u.flier) return 'Fliers only';
    if ((sk.mp || 0) > u.mp) return 'Not enough MP';
    if (sk.oncePerBattle && u.turningUsed) return 'Once a battle';
    if (sk.every) { const ev = u.boss && u.hp < u.mhp / 2 ? 2 : sk.every; if (s.bell % ev !== 0) return 'Only every ' + ev + (ev === 2 ? 'nd' : 'rd') + ' bell'; }
    if (sk.kind === 'item' && !(s.sides[u.side].items[sk.item] > 0)) return 'None left';
    if (!this.targets(u, a).length) return 'No target in range';
    return null;
  }
  /** effective range of an action from c */
  rangeOf(u, sk, c = [u.cx, u.cy]) {
    if (sk.range === 'self' || sk.range === 'ward') return sk.range;
    let [a, b] = sk.range; if (sk.ranged && this.code(c) === 'h') b += 1;
    return [a, b];
  }
  /** target hexes for an action from hex c (default: where it stands) */
  targets(u, a, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), s = this.s, out = [], rng = this.rangeOf(u, sk, c);
    if (rng === 'self') {
      if (sk.area === 'cone2' || sk.area === 'cone3' || sk.area === 'line3' || sk.area === 'line4') {
        for (let d = 0; d < 6; d++) { const n = H.step(c, d); if (this.inside(n) && this.affected(u, a, n, c).length) out.push(n); }
        return out;
      }
      return this.affected(u, a, c, c).length || sk.who === 'self' ? [c] : [];
    }
    if (rng === 'ward') {
      const k = u; for (const o of this.field()) if (o.troop === u.troop && o.kind === 'monster' && H.dist([o.cx, o.cy], c) <= k.ward) out.push([o.cx, o.cy]);
      return out;
    }
    for (const h of H.within(c, rng[1], s.w, s.h)) {
      const d = H.dist(h, c); if (d < rng[0]) continue;
      if (sk.area === 'single') {
        const o = this.at(h) || (H.eq(h, c) ? u : null); if (!o || !this._whoOk(u, o, sk, h, c)) continue;
        out.push(h);
      } else if (this.affected(u, a, h, c).length) out.push(h);
    }
    return out;
  }
  _whoOk(u, o, sk, h, c) {
    const self = o.id === u.id;
    switch (sk.who) {
      case 'foes': return this.foes(u, o);
      case 'ally': return !this.foes(u, o);
      case 'allies': return !this.foes(u, o);
      case 'ownMonster': return o.troop === u.troop && o.kind === 'monster';
      case 'ownMonsters': return o.troop === u.troop && o.kind === 'monster';
      case 'self': return self;
      case 'all': return true;
    }
    return false;
  }
  /** the hexes an action covers when aimed at h from c */
  area(u, a, h, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), s = this.s, w = s.w, hh = s.h;
    switch (sk.area) {
      case 'single': return [h];
      case 'self': return [c];
      case 'r1': return H.within(h, 1, w, hh);
      case 'r2': return H.within(h, 2, w, hh);
      case 'self-r1': return H.within(c, 1, w, hh).filter(x => !H.eq(x, c));
      case 'self-r2': return H.within(c, 2, w, hh).filter(x => !H.eq(x, c));
      case 'adj': return H.within(c, 1, w, hh).filter(x => !H.eq(x, c));
      case 'cone2': case 'cone3': { const n = sk.area === 'cone3' || u.breath3 ? 3 : 2; return H.cone(c, H.dirTo(c, h), n, w, hh); }
      case 'line3': return H.line(c, H.dirTo(c, h), 3, w, hh);
      case 'line4': return H.line(c, H.dirTo(c, h), 4, w, hh);
      case 'ward': return H.within(c, u.ward, w, hh);
      case 'troop': return this.field().filter(o => o.troop === u.troop).map(o => [o.cx, o.cy]);
    }
    return [h];
  }
  /** units an action touches when aimed at h from c */
  affected(u, a, h, c = [u.cx, u.cy]) {
    const sk = this.skillOf(u, a), out = [];
    for (const x of this.area(u, a, h, c)) {
      let o = this.at(x); if (o && o.id === u.id && !H.eq(c, [u.cx, u.cy])) o = null;
      if (!o && H.eq(x, c)) o = u;   // the user, when it would stand there
      if (!o || !this._whoOk(u, o, sk, x, c)) continue;
      if (sk.area !== 'single' && sk.area !== 'self' && sk.who !== 'all' && o.id === u.id && sk.who !== 'allies' && sk.who !== 'self') continue;
      out.push(o);
    }
    return out;
  }

  /* ---- formulas ---- */
  _elemOf(u, sk) { if (sk.elem === 'user' || sk.kind === 'basic') return u.elem; return sk.elem; }
  _elemMul(ae, de) {
    if (!ae || ae === 'none' || ae === 'hour' || !de || de === 'hour' || de === 'none') return 1;
    if (G.opposes(ae, de)) return G.tune.elemStrong; if (ae === de) return G.tune.elemSame; return 1;
  }
  _tide(u, t, ae, sk) {
    if (sk.noTide || ae === 'hour') return 1;
    let f = (u.passives.timeless ? 1 : G.tideOut(ae, this.s.season, this.s.longWinter, u.flags && u.flags.amulet));
    if (!(t.passives.timeless && !this._timelessBroken(t))) f *= G.tideIn(t.elem, this.s.season, t.flags && t.flags.amulet);
    return f;
  }
  _timelessBroken(t) { return this.s.wheelTurned || !!t.fx.untimed; }
  _adjAllies(u, t, c) { let n = 0; for (const x of H.neighbours([t.cx, t.cy])) { const o = this.at(x); if (o && o.side === u.side && o.id !== u.id && !this.foes(o, u)) n++; } return n; }
  /** a full forecast of one action of u from c aimed at h: [{ id, hit, dmg: [min, max], crit, ko, status, elem, tide, heal, ... }] */
  forecast(uid, a, h, c) {
    const u = typeof uid === 'string' ? this.unit(uid) : uid; c = c || [u.cx, u.cy];
    const sk = this.skillOf(u, a), out = [];
    for (const t of this.affected(u, a, h, c)) out.push(this._calc(u, t, sk, c, a));
    return out;
  }
  _calc(u, t, sk, c, a) {
    const tune = G.tune, s = this.s, A = this.eff(u, c), D = this.eff(t), r = { id: t.id, name: t.name, hit: 100, dmg: [0, 0], crit: 0, ko: 0, status: null, elem: null, tide: null, heal: 0, buff: null };
    const isFoe = this.foes(u, t), ae = this._elemOf(u, sk);
    if (sk.kind === 'item') { const use = sk.use; if (use.heal) r.heal = Math.min(use.heal, t.mhp - t.hp); if (use.mp) r.mp = use.mp; if (use.cleanse) r.cleanse = true; return r; }
    if (sk.heal) { const amt = typeof sk.heal === 'object' ? Math.round(t.mhp * sk.heal.pct) : Math.round((sk.heal + A.int * .8) * tune.healScale); r.heal = Math.min(amt, t.mhp - t.hp); }
    if (sk.buff && !isFoe) r.buff = sk.buff.map(b => b[0]);
    if (sk.cleanse) r.cleanse = true;
    if (sk.siphon) r.siphon = Math.min(sk.siphon, t.mp);
    const damaging = sk.p > 0 || sk.unmake;
    if (damaging) {
      const em = sk.elem === 'none' ? 1 : this._elemMul(ae, t.elem), tide = this._tide(u, t, ae, sk);
      r.elem = em > 1 ? 'strong' : em < 1 ? 'weak' : null; r.tide = tide > 1.001 ? 'up' : tide < .999 ? 'down' : null;
      let lo, hi;
      if (sk.unmake) { lo = hi = Math.max(1, Math.round(t.mhp * sk.unmake)); r.hit = 100; }
      else if (sk.magic) {
        let base = (sk.p + A.int - D.int * .5) * tune.magicScale * em * tide;
        if (t.fx.warded) base *= .8; if (sk.vsHour && t.elem === 'hour') base *= sk.vsHour;
        if (u.flags && u.flags.spellBoost && u.flags.spellBoost[0] === ae) base *= 1 + u.flags.spellBoost[1];
        if (t.passives.timeless && !this._timelessBroken(t)) base *= .5;
        lo = Math.max(1, Math.round(base * .9)); hi = Math.max(1, Math.round(base * 1.1)); r.hit = 100;
      } else {
        const dist = H.dist(c, [t.cx, t.cy]), area = sk.area || 'single', always = sk.always || area.startsWith('cone') || area.startsWith('line');
        let hit = tune.baseHit + (A.agi - D.agi) + G.sizeHit(u.size, t.size) + Math.min(15, 5 * this._adjAllies(u, t, c)) - G.terrainEva(this.code([t.cx, t.cy]), t) - 5 * Math.max(0, dist - 2) - (t.fx.guarded ? 10 : 0) + (sk.hitBonus || 0);
        if (s.season === 'spring' && (sk.ranged || dist > 1)) hit -= 5;
        if (s.season === 'winter' && u.elem !== 'winter') hit -= 5;
        if (this.code(c) === 'i' && u.elem !== 'winter') hit -= 10;
        if (u.kind === 'monster') { const k = this.knightOf(u); if (k && k.skills.includes('packtactics')) hit += 10; }
        r.hit = always ? 100 : G.clamp(Math.round(hit), 15, 99);
        let base = (A.atk * sk.p - D.def * tune.defFactor) * tune.dmgScale * em * tide * (1 - G.terrainDef(this.code([t.cx, t.cy]), t, this._keepOwner([t.cx, t.cy]), s.season));
        if (t.fx.guarded) base *= .7;
        base *= 1 + tune.surroundBonus * Math.min(3, this._adjAllies(u, t, c));
        if (sk.vsHour && t.elem === 'hour') base *= sk.vsHour;
        if (u.passives.ambush && this.code(c) === 'f') base *= 1.3;
        if (this.code(c) === 'h' && dist === 1) base *= 1.1;
        if (u.flags && u.flags.winterEdge && u.elem === 'winter') base *= 1 + u.flags.winterEdge;
        if (sk.kind === 'basic' && u.windup) base *= 1.5;
        if (t.passives.timeless && !this._timelessBroken(t)) base *= .5;
        lo = Math.max(1, Math.round(base * .9)); hi = Math.max(1, Math.round(base * 1.1));
        r.crit = always ? 0 : Math.min(30, tune.critBase + A.agi / 4);
      }
      r.dmg = [lo, hi];
      const hitP = r.hit / 100, maxD = r.crit ? Math.round(hi * 1.5) : hi;
      r.ko = hi >= t.hp ? hitP * (lo >= t.hp ? 1 : (hi - t.hp + 1) / (hi - lo + 1)) : maxD >= t.hp ? hitP * r.crit / 100 * .5 : 0;
      r.ko = Math.round(r.ko * 100);
    }
    let st = sk.status; if (sk.kind === 'basic') { if (u.passives.frostfang) st = ['chill', 30]; if (u.passives.stopbite) st = ['stop', 20]; if (u.basic.status) st = u.basic.status; }
    if (st && (isFoe || sk.who === 'all')) r.status = [st[0], this._statusChance(u, t, st)];
    if (t.kind === 'monster' && isFoe && damaging) r.captureRisk = this._captureChance(t);
    return r;
  }
  _statusChance(u, t, st) {
    const [id, base] = st;
    if (t.passives.timeless && !this._timelessBroken(t)) return 0;
    if (t.flags && t.flags.immune && t.flags.immune.includes(id)) return 0;
    if (id === 'stop' && t.fx.stopimmune) return 0;
    const A = this.eff(u), D = this.eff(t);
    let p = G.clamp(base + (G.get('effect', id).kind === 'status' ? A.int - D.int : 0), 10, 90) * G.tune.statusScale;
    if (t.boss) p /= 2;
    return Math.round(G.clamp(p, 0, 100));
  }
  _captureChance(t) {
    if (t.boss || t.elite) return 0;
    const k = this.knightOf(t); let p = G.tune.captureBase;
    if (k && H.dist([t.cx, t.cy], [k.cx, k.cy]) > k.ward) p += .25;
    if (t.hp < t.mhp * .3) p += .15;
    return Math.round(Math.min(.75, p) * 100);
  }
  _keepOwner(c) {
    const s = this.s; if (!s.keep || !H.eq(c, s.keep)) return -1;
    if (s.mode === 'shrine') { const o = this.at(c); return o ? o.side : -1; }
    const d = s.sides.findIndex(x => x.role === 'def'); return d;
  }

  /* ---- legality ---- */
  legal(cmd) { return !this.illegal(cmd); }
  /** why a command is illegal (a string), or null */
  illegal(cmd) {
    const s = this.s;
    if (s.over) return 'The battle is over';
    if (!cmd || !cmd.t) return 'No command';
    if (['win', 'ko', 'bell', 'season', 'dials', 'auto'].includes(cmd.t)) return null;
    const tr = this.activeTroop(); if (!tr) return 'No troop is active';
    if (cmd.t === 'end') return null;
    const u = this.unit(cmd.u); if (!u) return 'No such unit';
    if (u.troop !== tr.id) return 'Not this troop\'s turn';
    if (!this.onField(u)) return 'Not on the field';
    if (cmd.t === 'move') {
      if (u.done || u.acted) return 'Already acted';
      if (u.moved) return 'Already moved';
      if (!Array.isArray(cmd.to)) return 'No destination';
      const r = this.reach(u); return r[H.key(cmd.to)] ? null : 'Out of reach';
    }
    if (cmd.t === 'undo') return u.moved && !u.acted && !u.done && u.from ? null : 'Nothing to undo';
    if (cmd.t === 'guard' || cmd.t === 'wait') return u.done || u.acted ? 'Already acted' : null;
    if (cmd.t === 'retreat') return u.kind !== 'knight' ? 'Knights only' : u.done || u.acted ? 'Already acted' : null;
    if (cmd.t === 'act') {
      if (cmd.a && cmd.a.startsWith('item:') && u.kind !== 'knight') return 'Knights only';
      if (!cmd.a.startsWith('item:') && cmd.a !== 'attack' && !u.skills.includes(cmd.a)) return 'Unknown skill';
      const w = this.why(u, cmd.a); if (w) return w;
      if (!Array.isArray(cmd.at)) return 'No target';
      return this.targets(u, cmd.a).some(h => H.eq(h, cmd.at)) ? null : 'Not a valid target';
    }
    return 'Unknown command';
  }

  /* ---- applying commands ---- */
  apply(cmd) {
    this.dirty();
    const s = this.s, ev = [], bad = this.illegal(cmd);
    if (bad) return [{ e: 'illegal', why: bad, cmd }];
    const u = cmd.u ? this.unit(cmd.u) : null;
    switch (cmd.t) {
      case 'move': {
        const r = this.reach(u)[H.key(cmd.to)];
        u.from = [u.cx, u.cy]; u.cx = cmd.to[0]; u.cy = cmd.to[1]; u.moved = Math.max(1, r.path.length - 1); this.dirty();
        if (r.path.length > 1) u.facing = H.dirTo(r.path[r.path.length - 2], r.path[r.path.length - 1]);
        ev.push({ e: 'move', u: u.id, path: r.path });
        if (s.mode === 'sanctum' && u.ref === 'lunete') this._lightDial(u, ev, true);
        break;
      }
      case 'undo': ev.push({ e: 'undo', u: u.id, from: [u.cx, u.cy], to: u.from }); u.cx = u.from[0]; u.cy = u.from[1]; u.moved = 0; u.from = null; this.dirty(); break;
      case 'guard': u.fx.guarded = 1; u.acted = true; u.done = true; ev.push({ e: 'guard', u: u.id }); break;
      case 'wait': u.done = true; ev.push({ e: 'wait', u: u.id }); break;
      case 'retreat': u.acted = true; u.done = true; ev.push({ e: 'retreatcall', u: u.id }); this._troopLeaves(this.troop(u.troop), 'retreat', ev); break;
      case 'act': this._act(u, cmd, ev); break;
      case 'end': this._endTroop(ev); break;
      case 'win': this._finish(cmd.side, 'dev', ev); break;
      case 'ko': { const t = this.unit(cmd.u); if (t && this.onField(t)) { t.hp = 0; ev.push({ e: 'hit', u: t.id, t: t.id, dmg: 9999, hp: 0 }); this._down(t, null, ev); } break; }
      case 'bell': s.bell = G.clamp(cmd.n, 1, s.bells); ev.push({ e: 'bell', n: s.bell }); break;
      case 'season': this._setSeason(cmd.s, ev); break;
      case 'dials': for (const d of s.dials) d.lit = true; this._checkDials(ev); break;
    }
    if (!s.over && cmd.t !== 'end' && ['move', 'undo'].indexOf(cmd.t) < 0) {
      this._checkWin(ev);
      const tr = this.activeTroop();
      if (!s.over && tr && (tr.gone || this._troopDone(tr))) this._endTroop(ev);
    }
    for (const e of ev) e.n = ++s.n;
    s.log.push(...ev.map(e => e.e)); if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    return ev;
  }
  _troopDone(tr) { return tr.units.every(id => { const x = this.unit(id); return !this.onField(x) || x.done; }); }

  _act(u, cmd, ev) {
    const s = this.s, sk = this.skillOf(u, cmd.a), at = cmd.at, c = [u.cx, u.cy];
    if (sk.mp && !(G.cheats && G.cheats.mp && s.sides[u.side].human)) u.mp -= sk.mp;
    if (sk.oncePerBattle) u.turningUsed = true;
    if (sk.kind === 'item') { s.sides[u.side].items[sk.item]--; const iu = s.itemsUsed[u.side] || (s.itemsUsed[u.side] = {}); iu[sk.item] = (iu[sk.item] || 0) + 1; }
    const tgt = this.at(at); if (tgt && tgt.id !== u.id) u.facing = H.dirTo(c, at); else if (sk.area && /cone|line/.test(sk.area)) u.facing = H.dirTo(c, at);
    ev.push({ e: 'act', u: u.id, a: cmd.a, name: sk.name, at, fx: sk.fx, anim: sk.anim, elem: this._elemOf(u, sk), kind: sk.kind, area: this.area(u, cmd.a, at) });
    if (sk.windup) { u.windup = true; ev.push({ e: 'buff', t: u.id, fx: 'windup' }); }
    // Mad Gambit's misfire: it Chills the Duke instead
    if (sk.misfire && !(s.flags.lucid) && R.chance(s, sk.misfire)) {
      u.fx.chill = 2; ev.push({ e: 'misfire', u: u.id }); ev.push({ e: 'status', t: u.id, s: 'chill', ok: true });
      u.acted = true; u.done = true; return;
    }
    let totalDmg = 0, helped = false;
    for (const t of this.affected(u, cmd.a, at)) {
      if (!this.onField(t)) continue;
      const f = this._calc(u, t, sk, c, cmd.a), isFoe = this.foes(u, t);
      if (f.heal || (sk.kind === 'item' && sk.use.heal)) { const amt = Math.max(0, Math.min(f.heal, t.mhp - t.hp)); t.hp += amt; u.healed += amt; ev.push({ e: 'heal', u: u.id, t: t.id, amt, hp: t.hp }); if (amt > 0) helped = true; }
      if (f.mp) { t.mp = Math.min(t.mmp, t.mp + f.mp); ev.push({ e: 'mp', t: t.id, amt: f.mp }); }
      if (f.cleanse) { for (const k of Object.keys(t.fx)) { const kind = G.get('effect', k).kind; if (kind === 'status' || kind === 'debuff') delete t.fx[k]; } ev.push({ e: 'cleanse', t: t.id }); }
      if (f.siphon) { t.mp -= f.siphon; u.mp = Math.min(u.mmp, u.mp + f.siphon); ev.push({ e: 'siphon', u: u.id, t: t.id, amt: f.siphon }); }
      if (sk.buff && !isFoe) {
        for (const [b, d] of sk.buff) t.fx[b] = Math.max(t.fx[b] || 0, d);
        ev.push({ e: 'buff', t: t.id, fx: sk.buff.map(b => b[0]).join(',') }); if (t.id !== u.id) helped = true;
      }
      if (f.dmg[1] > 0) {
        const hit = R.next(s) * 100 < f.hit;
        if (!hit) { ev.push({ e: 'miss', u: u.id, t: t.id }); continue; }
        const crit = f.crit > 0 && R.next(s) * 100 < f.crit;
        let dmg = f.dmg[0] + Math.floor(R.next(s) * (f.dmg[1] - f.dmg[0] + 1)); if (crit) dmg = Math.round(dmg * 1.5);
        if (!isFoe && sk.who === 'all') dmg = Math.max(1, dmg);
        this._damage(u, t, dmg, { crit, elem: f.elem, tide: f.tide, sk }, ev);
        totalDmg += dmg;
        if (sk.push && this.onField(t)) this._push(u, t, sk.push, ev);
      }
      if (f.status && this.onField(t) && f.status[1] > 0 && (isFoe || sk.who === 'all')) {
        const ok = R.next(s) * 100 < f.status[1];
        if (ok) { const [id] = f.status; const e = G.get('effect', id); t.fx[id] = id === 'stop' ? 1 : (e.dur || 2); if (id === 'sleep') t.done = true; }
        ev.push({ e: 'status', t: t.id, s: f.status[0], ok });
      }
      if (sk.breaksTimeless && t.passives.timeless && this.onField(t)) { t.fx.untimed = 2; ev.push({ e: 'untimed', t: t.id }); }
    }
    if (helped) this._exp(u, 8, ev);   // a heal or a buff: +8 once per action
    if (sk.drainPct && totalDmg > 0 && this.onField(u)) { const amt = Math.min(u.mhp - u.hp, Math.round(totalDmg * sk.drainPct)); if (amt > 0) { u.hp += amt; ev.push({ e: 'heal', u: u.id, t: u.id, amt, hp: u.hp }); } }
    if (sk.kind === 'basic' && u.windup) u.windup = false;
    if (sk.burnsForest && s.season === 'summer') for (const h of this.area(u, cmd.a, at)) if (this.code(h) === 'f') { s.cells[h[1] * s.w + h[0]] = 'B'; s.burn[H.key(h)] = 2; ev.push({ e: 'burnhex', c: h }); }
    if (this.onField(u)) { u.acted = true; u.done = true; }
  }
  _push(u, t, n, ev) {
    const d = H.dirTo([u.cx, u.cy], [t.cx, t.cy]), to = H.step([t.cx, t.cy], d);
    if (this.inside(to) && !this.at(to) && this.canStand(to, t) && isFinite(this.stepCost(to, t))) { ev.push({ e: 'push', t: t.id, from: [t.cx, t.cy], to }); t.cx = to[0]; t.cy = to[1]; this.dirty(); }
    else this._damage(u, t, 4, { bump: true }, ev);
  }
  /** deal damage (thorns, sleep waking, KO, glory, EXP) */
  _damage(u, t, dmg, o, ev) {
    const s = this.s;
    const ch = G.cheats;   // dev mode's cheats (never on outside dev mode)
    if (ch && ch.god && s.sides[t.side].human) dmg = 0;
    if (ch && ch.ohko && u && s.sides[u.side].human && this.foes(u, t)) dmg = t.hp;
    dmg = Math.min(dmg, t.hp); t.hp -= dmg; t.hitBell = s.bell;
    ev.push({ e: 'hit', u: u ? u.id : null, t: t.id, dmg, crit: !!o.crit, elem: o.elem || null, tide: o.tide || null, hp: t.hp, bump: !!o.bump });
    if (t.fx.sleep) { delete t.fx.sleep; ev.push({ e: 'wake', t: t.id }); }
    if (u && this.foes(u, t)) {
      u.dmgDealt += dmg; s.stats[u.side].damage += dmg;
      if (s.mode === 'shrine') this._glory(u.side, dmg / 5, ev, true);
      this._exp(u, G.clamp(8 + 2 * (t.level - u.level), 2, 30), ev);
      // thorns: melee attackers take 10% of the damage they deal
      if (t.passives.thorns && H.dist([u.cx, u.cy], [t.cx, t.cy]) === 1 && o.sk && this.onField(u)) {
        const back = Math.max(1, Math.round(dmg * .1)); u.hp = Math.max(0, u.hp - back); ev.push({ e: 'hit', u: t.id, t: u.id, dmg: back, thorns: true, hp: u.hp });
        if (u.hp <= 0) this._down(u, t, ev);
      }
    }
    if (t.hp <= 0) this._down(t, u, ev);
  }
  _down(t, by, ev) {
    const s = this.s; this.dirty();
    if (t.passives.rebirth && !t.rebirthUsed && t.kind === 'monster') { t.rebirthUsed = true; t.hp = Math.round(t.mhp * .3); ev.push({ e: 'rebirth', t: t.id, hp: t.hp }); return; }
    t.hp = 0;
    if (by && this.foes(by, t)) {
      const bonus = t.ruler ? 60 : t.kind === 'knight' ? 40 : 20; this._exp(by, bonus, ev); by.kos++; s.stats[by.side].kos++;
      if (s.mode === 'shrine') this._glory(by.side, t.kind === 'knight' ? 25 : 10, ev);
    }
    if (t.kind === 'monster') { t.alive = false; t.dead = true; ev.push({ e: 'ko', t: t.id, dead: true }); }
    else {
      t.alive = false; t.wounded = true; ev.push({ e: 'ko', t: t.id, knight: true });
      this._troopLeaves(this.troop(t.troop), 'fall', ev);
    }
  }
  /** a troop leaves the field: its knight fell or retreated. Capture rolls for its monsters; a ruler routs the side */
  _troopLeaves(tr, why, ev) {
    const s = this.s; if (tr.gone) return; this.dirty();
    tr.gone = true;
    const k = this.unit(tr.knight);
    if (why === 'retreat' && this.onField(k)) { k.out = true; ev.push({ e: 'retreat', t: k.id }); }
    const enemyKnights = this.field().filter(o => o.kind === 'knight' && o.side !== tr.side);
    for (const id of tr.units) {
      const m = this.unit(id); if (m.kind !== 'monster' || !this.onField(m)) continue;
      const near = enemyKnights.filter(ek => H.dist([ek.cx, ek.cy], [m.cx, m.cy]) <= Math.max(1, ek.ward));
      let captured = false;
      if (near.length && !m.boss && !m.elite) {
        let p = G.tune.captureBase; if (H.dist([m.cx, m.cy], [k.cx, k.cy]) > k.ward) p += .25; if (m.hp < m.mhp * .3) p += .15; p = Math.min(.75, p);
        if (R.next(s) < p) {
          const captor = near.slice().sort((a, b) => H.dist([a.cx, a.cy], [m.cx, m.cy]) - H.dist([b.cx, b.cy], [m.cx, m.cy]) || (a.id < b.id ? -1 : 1))[0];
          m.captured = captor.id; captured = true; s.captures.push({ u: m.id, ref: m.ref, by: captor.id, byRef: captor.ref, side: captor.side });
          ev.push({ e: 'capture', t: m.id, by: captor.id });
        }
      }
      if (!captured) { m.out = true; ev.push({ e: 'retreat', t: m.id }); }
    }
    ev.push({ e: 'troopgone', troop: tr.id, why });
    if (k.ruler && s.mode !== 'shrine') {
      ev.push({ e: 'rout', side: tr.side });
      for (const t2 of s.troops) if (t2.side === tr.side && !t2.gone) { const kk = this.unit(t2.knight); this._troopLeaves(t2, 'retreat', ev); kk.out = true; }
    }
  }
  _exp(u, amt, ev) {
    if (!u || !this.onField(u) && !u.alive) return;
    if (u.boss) return;
    amt = Math.round(amt * G.tune.expScale * (this.s.sides[u.side].expMul || 1)); if (amt <= 0) return;
    u.exp += amt; u.expGain += amt;
    while (u.exp >= 100 && u.level < 40) { u.exp -= 100; this._levelUp(u, ev); }
  }
  _levelUp(u, ev) {
    const s = this.s, gains = {};
    u.level++; u.levelsGained++;
    if (u.kind === 'monster') {
      const before = G.monsterStats(u.sp, u.form, u.level - 1), after = G.monsterStats(u.sp, u.form, u.level);
      for (const k of ['hp', 'mp', 'atk', 'def', 'int', 'agi']) gains[k] = after[k] - before[k];
    } else {
      for (const k of G.STATS) { const g = u.growth[k]; gains[k] = Math.floor(g) + (R.next(s) < g - Math.floor(g) ? 1 : 0); u.stats[k] += gains[k]; }
      const learned = G.classSkills(u.cls, u.elem, u.level).filter(x => !u.skills.includes(x));
      for (const x of learned) { u.skills.push(x); if (PASSIVES.includes(x)) u.passives[x] = true; }
      if (learned.length) gains.learned = learned;
    }
    u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; u.atk += gains.atk; u.def += gains.def; u.int += gains.int; u.agi += gains.agi;
    for (const k in gains) if (k !== 'learned') u.gains[k] = (u.gains[k] || 0) + gains[k];
    ev.push({ e: 'level', t: u.id, level: u.level, gains });
  }
  _glory(side, pts, ev, quiet) { const s = this.s; s.glory[side] = (s.glory[side] || 0) + pts; if (!quiet) ev.push({ e: 'glory', side, pts, total: Math.floor(s.glory[side]) }); }

  /* ---- bells and troop turns ---- */
  _orderTroops() {
    const s = this.s;
    return s.troops.filter(t => !t.gone).slice().sort((a, b) => {
      const ka = this.unit(a.knight), kb = this.unit(b.knight), ea = this.eff(ka).agi, eb = this.eff(kb).agi;
      if (eb !== ea) return eb - ea;
      const da = s.sides[a.side].role === 'def' ? 0 : 1, db = s.sides[b.side].role === 'def' ? 0 : 1;
      return da - db || a.id - b.id;
    }).map(t => t.id);
  }
  _startBell(ev) {
    const s = this.s; s.bell++;
    if (s.wheel && s.bell > 1) this._setSeason(G.SEASONS[(s.bell - 1) % 4], ev);
    s.order = this._orderTroops(); s.oi = -1;
    ev.push({ e: 'bell', n: s.bell, order: s.order.slice(), season: s.season });
    this._nextTroop(ev);
  }
  _setSeason(season, ev) {
    const s = this.s; s.season = season;
    s.cells = s.base.map((c, i) => { const cur = s.cells ? s.cells[i] : null; if (cur === 'B' || cur === 'a') return cur; return G.seasonTerrain(c, season, s.flood); });
    // a unit left on ground it can't stand on (a flood) is moved to the nearest dry hex
    for (const u of this.field()) if (!G.canEnd(this.code([u.cx, u.cy]), u)) { const c = this._freeNear([u.cx, u.cy], u); if (c) { u.cx = c[0]; u.cy = c[1]; this.dirty(); } }
    ev.push({ e: 'season', s: season });
  }
  _nextTroop(ev) {
    const s = this.s;
    for (;;) {
      s.oi++;
      if (s.oi >= s.order.length) { s.active = null; this._endBell(ev); return; }
      const tr = s.troops[s.order[s.oi]];
      if (tr.gone) continue;
      s.active = tr.id; this._startTroop(tr, ev);
      if (s.over) return;
      if (tr.gone || this._troopDone(tr)) { ev.push({ e: 'skip', troop: tr.id }); continue; }
      return;
    }
  }
  _startTroop(tr, ev) {
    const s = this.s; ev.push({ e: 'turn', troop: tr.id, side: tr.side, bell: s.bell });
    for (const id of tr.units) {
      const u = this.unit(id); if (!this.onField(u)) continue;
      u.moved = 0; u.from = null; u.acted = false; u.done = false; delete u.fx.guarded;
      u.mp = Math.min(u.mmp, u.mp + 2);
      const tick = (amt, why) => { if (!this.onField(u)) return; amt = Math.max(1, Math.round(amt)); u.hp = Math.max(0, u.hp - amt); ev.push({ e: 'dot', t: u.id, dmg: amt, why, hp: u.hp }); if (u.hp <= 0) this._down(u, null, ev); };
      if (u.fx.poison) tick(u.mhp * .08, 'poison');
      if (u.fx.burn) tick(u.mhp * .05, 'burn');
      if (this.code([u.cx, u.cy]) === 'B') tick(u.mhp * .10, 'fire');
      if (!this.onField(u)) continue;
      const heal = (pct, why) => { const amt = Math.min(u.mhp - u.hp, Math.round(u.mhp * pct)); if (amt > 0) { u.hp += amt; ev.push({ e: 'heal', t: u.id, amt, hp: u.hp, why }); } };
      if (u.flags && u.flags.mending) heal(u.flags.mending, 'ring');
      if (u.passives.regenerate) heal(.10, 'regen');
      if (u.fx.sleep) { u.done = true; ev.push({ e: 'asleep', t: u.id }); }
      else if (u.fx.stop) { u.done = true; delete u.fx.stop; u.fx.stopimmune = 1; ev.push({ e: 'stopped', t: u.id }); }
    }
    if (s.over) return;
    this._checkWin(ev);
  }
  _endTroop(ev) {
    const s = this.s, tr = this.activeTroop();
    if (tr) { for (const id of tr.units) { const u = this.unit(id); if (this.onField(u)) u.done = true; } ev.push({ e: 'turnend', troop: tr.id }); }
    if (!s.over) this._nextTroop(ev);
  }
  _endBell(ev) {
    const s = this.s;
    ev.push({ e: 'bellend', n: s.bell });
    // effects tick
    for (const u of this.units) for (const k of Object.keys(u.fx)) { if (k === 'guarded' || k === 'stop') continue; u.fx[k]--; if (u.fx[k] <= 0) { delete u.fx[k]; if (this.onField(u)) ev.push({ e: 'fxend', t: u.id, s: k }); } }
    // fires burn out into ash
    for (const k of Object.keys(s.burn)) { if (--s.burn[k] <= 0) { delete s.burn[k]; const [x, y] = k.split(',').map(Number); s.cells[y * s.w + x] = 'a'; ev.push({ e: 'ash', c: [x, y] }); } }
    // the Keep heals its owner's unit standing on it
    if (s.keep) { const o = this.at(s.keep); if (o && (this._keepOwner(s.keep) === o.side)) { const amt = Math.min(o.mhp - o.hp, Math.round(o.mhp * .1)); if (amt > 0) { o.hp += amt; ev.push({ e: 'heal', t: o.id, amt, hp: o.hp, why: 'keep' }); } if (s.mode === 'shrine') { this._glory(o.side, 5, ev); s.stats[o.side].shrine++; } } }
    // map rules
    if (s.mode === 'sanctum') this._sanctumBell(ev);
    this._checkWin(ev);
    if (s.over) return;
    if (s.bell >= s.bells) { this._lastBell(ev); return; }
    this._startBell(ev);
  }
  _lastBell(ev) {
    const s = this.s;
    if (s.mode === 'shrine') {
      for (const sd of s.sides) if (this.sideKnights(sd.i).length) this._glory(sd.i, 10, ev);
      return this._finishShrine('bells', ev);
    }
    if (s.mode === 'sanctum') { const def = s.sides.findIndex(x => x.role === 'def'); return this._finish(def, 'thirteenth', ev); }
    const att = s.sides.findIndex(x => x.role === 'att'), def = s.sides.findIndex(x => x.role === 'def');
    const onKeep = s.keep && this.at(s.keep);
    if (onKeep && onKeep.side === att && onKeep.kind === 'knight') return this._finish(att, 'keep', ev);
    return this._finish(def, 'bells', ev);
  }
  _checkWin(ev) {
    const s = this.s; if (s.over) return;
    if (s.mode === 'shrine') {
      for (const sd of s.sides) if (!sd.out && !this.sideKnights(sd.i).length) { sd.out = true; ev.push({ e: 'sideout', side: sd.i }); }
      const alive = s.sides.filter(sd => !sd.out);
      if (alive.length <= 1) this._finishShrine('last', ev);
      return;
    }
    for (const sd of s.sides) if (!this.sideKnights(sd.i).length) {
      const other = s.sides.find(x => x.i !== sd.i);
      return this._finish(other.i, s.mode === 'sanctum' && sd.role === 'def' ? 'graynight' : 'rout', ev);
    }
  }
  _finish(winner, reason, ev) {
    const s = this.s; if (s.over) return;
    // end-of-battle EXP: +10 for each survivor of the winning side, +4 for the losing side
    for (const u of this.units) if (u.alive && !u.captured) this._exp(u, u.side === winner ? 10 : 4, ev);
    s.over = { winner, reason, bell: s.bell }; s.active = null;
    ev.push({ e: 'over', winner, reason });
  }
  _finishShrine(reason, ev) {
    const s = this.s; if (s.over) return;
    const ranked = s.sides.map(sd => ({ i: sd.i, g: Math.floor(s.glory[sd.i] || 0) })).sort((a, b) => b.g - a.g || a.i - b.i);
    const standings = []; for (const r of ranked) { const last = standings[standings.length - 1]; if (last && last.g === r.g) last.ids.push(r.i); else standings.push({ g: r.g, ids: [r.i] }); }
    for (const u of this.units) if (u.alive && !u.captured) this._exp(u, standings[0].ids.includes(u.side) ? 10 : 4, ev);
    s.over = { winner: standings[0].ids[0], reason, standings: standings.map(x => x.ids), glory: Object.fromEntries(ranked.map(r => [r.i, r.g])) }; s.active = null;
    ev.push({ e: 'over', winner: s.over.winner, reason, standings: s.over.standings });
  }

  /* ---- the Clockwork Sanctum ---- */
  _sanctumBell(ev) {
    const s = this.s, def = s.sides.findIndex(x => x.role === 'def');
    // the Hour Hand sweeps its line: player units there roll Stop 70
    if (!s.handStopped && s.keep) {
      const line = H.line(s.keep, s.hand, 8, s.w, s.h);
      ev.push({ e: 'hand', dir: s.hand, line });
      for (const c of line) { const o = this.at(c); if (o && o.side !== def) { let p = 70 * G.tune.statusScale; if (o.flags && o.flags.immune && o.flags.immune.includes('stop')) p = 0; if (o.fx.stopimmune) p = 0; const ok = R.next(s) * 100 < p; if (ok) o.fx.stop = 1; ev.push({ e: 'status', t: o.id, s: 'stop', ok }); } }
      s.hand = (s.hand + 1) % 6;
    }
    // the Season Dials
    for (const d of s.dials) {
      const o = this.at(d.c); if (!o) continue;
      if (o.side !== def && !d.lit) { d.lit = true; ev.push({ e: 'dial', c: d.c, lit: true }); }
      else if (o.side === def && d.lit && !s.wheelTurned) { d.lit = false; ev.push({ e: 'dial', c: d.c, lit: false }); }
    }
    this._checkDials(ev);
    // at half HP the Gray Knight calls two Second Hands
    const gk = this.units.find(u => u.ref === 'graynight');
    if (gk && this.onField(gk) && !s.gkCalled && gk.hp <= gk.mhp / 2) {
      s.gkCalled = true;
      for (let i = 0; i < 2; i++) {
        const spec = G.unitFromMonster({ uid: 'secondhand' + i, sp: 'minute', form: 3, level: 16, realm: 'dominion' });
        const m = this._addUnit(spec, gk.side, gk.troop), c = this._freeNear([gk.cx, gk.cy], m);
        if (!c) { m.alive = false; m.out = true; continue; }
        m.cx = c[0]; m.cy = c[1]; m.done = true; m.summoned = true; this.dirty(); ev.push({ e: 'summon', t: m.id, c });
      }
    }
  }
  _lightDial(u, ev, now) {
    const s = this.s; const d = s.dials.find(x => H.eq(x.c, [u.cx, u.cy]));
    if (d && !d.lit) { d.lit = true; ev.push({ e: 'dial', c: d.c, lit: true }); this._checkDials(ev); }
  }
  _checkDials(ev) {
    const s = this.s;
    if (!s.wheelTurned && s.dials.length && s.dials.every(d => d.lit)) { s.wheelTurned = true; s.handStopped = true; ev.push({ e: 'wheel' }); }
  }

  /* ---- results for the campaign ---- */
  /** what happened to every unit: { winner, reason, units: [{ ref, kind, side, hp, mp, level, exp, stats (knights), dead, wounded, captured, levels, gains }], captures, itemsUsed } */
  result() {
    const s = this.s;
    return {
      winner: s.over ? s.over.winner : null, reason: s.over ? s.over.reason : null, bell: s.bell, standings: s.over && s.over.standings, glory: s.glory,
      units: this.units.filter(u => !u.summoned).map(u => ({ id: u.id, ref: u.ref, kind: u.kind, side: u.side, troop: u.troop, hp: Math.max(0, u.hp), mp: u.mp, level: u.level, exp: u.exp, stats: u.stats || null, mhp: u.mhp, dead: !!u.dead, wounded: !!u.wounded, captured: u.captured ? this.unit(u.captured).ref : null, out: u.out, levels: u.levelsGained, gains: u.gains, expGain: u.expGain, skills: u.skills })),
      captures: s.captures.slice(), itemsUsed: Object.assign({}, s.itemsUsed), stats: s.stats
    };
  }
}
G.BattleSim = BattleSim;
