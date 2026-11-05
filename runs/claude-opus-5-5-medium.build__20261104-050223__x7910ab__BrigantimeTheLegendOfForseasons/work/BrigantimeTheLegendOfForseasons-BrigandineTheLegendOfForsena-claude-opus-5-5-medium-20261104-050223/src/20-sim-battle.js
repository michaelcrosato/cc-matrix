/* ---- BATTLESIM (§5): a hex battle as plain JSON state. Commands in (apply), events out. Never touches the engine, the
 * DOM, the clock or Math.random: randomness is G.Rng with its state inside the sim's state. ----
 * spec: { map, season, seed, mode: 'siege' | 'sanctum' | 'shrine', castle, bells, longWinter, sides: [{ id, realm, name,
 *   human, ai, expMul, boost, items: [ids], troops: [{ knight: rec, monsters: [rec], formation }] }], attacker, defender }
 * knight rec: { id, cls, lvl, exp, elem, stats: { hp, mp, atk, def, int, agi }, hp, mp, equip: { weapon, armor, accessory },
 *   ruler, extraSkills, bondBonus } ; monster rec: { uid, sp, tier, lvl, exp, hp, mp } */
const R = G.Rng;
G.levelUpKnight = (rec, rng) => {   // growth: floor(g) + 1 more if a seeded roll falls under the fraction
  const c = G.get('class', rec.cls), mul = [1, 1.15, 1.3][(c.tier || 1) - 1], gains = {};
  G.STATS.forEach((s, i) => { const g = c.growth[i] * mul; let n = Math.floor(g); if (R.next(rng) < g - n) n++; rec.stats[s] += n; gains[s] = n; });
  rec.lvl++; return gains;
};
G.levelUpMonster = rec => { const a = G.monsterStats(rec.sp, rec.tier, rec.lvl), b = G.monsterStats(rec.sp, rec.tier, rec.lvl + 1); rec.lvl++; const gains = {}; for (const s of G.STATS) gains[s] = b[s] - a[s]; return gains; };
// a knight's battle-ready numbers from its record and equipment
G.knightView = rec => {
  const c = G.get('class', rec.cls), st = Object.assign({}, rec.stats), mods = { mov: c.mov, ward: c.ward, bond: c.bond + Math.floor(rec.lvl / 4) + (rec.bondBonus || 0) }, flags = { immune: [] };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const id = rec.equip && rec.equip[slot]; if (!id) continue; const it = G.get('item', id);
    for (const k in it.mods) { if (k in st) st[k] += it.mods[k]; else mods[k] = (mods[k] || 0) + it.mods[k]; }
    if (it.immune) flags.immune.push(...it.immune); if (it.thorns) flags.thorns = true; if (it.regen) flags.regen = it.regen; if (it.tide2) flags.tide2 = true;
    if (it.winterDmg) flags.winterDmg = it.winterDmg; if (it.elemBoost) flags.elemBoost = it.elemBoost; if (it.range) flags.rangeBonus = it.range; if (it.luck) flags.luck = it.luck;
  }
  const skills = G.knightSkills(rec.cls, rec.elem, rec.lvl).concat(rec.extraSkills || []);
  return { st, mods, flags, skills, cls: c };
};
G.troopBond = (krec, monsters) => monsters.reduce((a, m) => a + G.get('monster', m.sp).rank, 0);

class BattleSim {
  constructor(state) { this.state = state; this._occ = null; }
  static create(spec) {
    const pm = G.parseMap(spec.map), S = { v: 1, spec: { map: spec.map, mode: spec.mode || 'siege', wheel: !!spec.wheel, castle: spec.castle || null, attacker: spec.attacker || 0, defender: spec.defender === undefined ? 1 : spec.defender, longWinter: !!spec.longWinter, region: spec.region || null },
      w: pm.w, h: pm.h, base: pm.cells.slice(), cells: [], anchors: pm.anchors, keeps: pm.keep, season: spec.season, bell: 0, bells: spec.mode === 'shrine' ? 6 : (spec.bells || G.tune.bells),
      rng: R.make(spec.seed || 1), units: [], troops: [], sides: [], order: [], oi: 0, over: null, n: 0, log: [], dials: {}, wheelTurned: false, timelessBreak: -1, gkCalled: false, fire: {}, captures: [], dev: {} };
    const sim = new BattleSim(S);
    sim.applySeason(spec.season, true);
    spec.sides.forEach((sd, si) => {
      const side = { id: si, realm: sd.realm, name: sd.name || (G.has('realm', sd.realm) ? G.get('realm', sd.realm).short : sd.realm), human: !!sd.human, ai: sd.ai || 'normal', expMul: sd.expMul || 1, boost: sd.boost || 0, items: (sd.items || []).slice(), used: [], troops: [], glory: 0, out: false, seat: sd.seat, color: sd.color };
      S.sides.push(side);
      sd.troops.forEach((tp, ti) => {
        const anchor = sim.anchorFor(si, ti, spec); if (!anchor) return;
        const tr = { id: S.troops.length, side: si, knight: -1, units: [], formation: tp.formation || 'vanguard', gone: false };
        S.troops.push(tr); side.troops.push(tr.id);
        const k = sim.addKnight(tp.knight, si, tr.id, anchor); tr.knight = k.id;
        for (const m of tp.monsters) { const c = sim.formationCell(anchor, tr.formation, si); if (c) sim.addMonster(m, si, tr.id, c); }
      });
    });
    for (const u of S.units) u.facing = sim.faceEnemy(u);
    sim.startBell([]);
    return sim;
  }
  static load(json) { return new BattleSim(typeof json === 'string' ? JSON.parse(json) : G.clone(json)); }
  serialize() { return G.clone(this.state); }
  hash() { return G.hashStr(JSON.stringify(this.state)); }

  /* ---- setup ---- */
  anchorFor(si, ti, spec) {
    const S = this.state, A = S.anchors;
    if (S.spec.mode === 'shrine') { const seat = spec.sides[si].anchor || String(si + 1); return A[seat] ? A[seat].slice() : null; }
    const keys = si === S.spec.attacker ? ['1', '2', '3'] : ['8', '7', '9'];
    const a = A[keys[ti]]; return a ? a.slice() : null;
  }
  enemyDir(si) {   // which way the enemy is, as a screen direction (for formations): toward the centre of the other side's anchors
    const S = this.state, mine = S.spec.mode === 'shrine' ? [S.anchors[String(si + 1)]] : si === S.spec.attacker ? ['1', '2', '3'].map(k => S.anchors[k]) : ['7', '8', '9'].map(k => S.anchors[k]);
    const theirs = S.spec.mode === 'shrine' ? S.keeps : si === S.spec.attacker ? ['7', '8', '9'].map(k => S.anchors[k]) : ['1', '2', '3'].map(k => S.anchors[k]);
    const avg = l => { l = l.filter(Boolean); const p = l.map(c => G.hex.center(c)); return [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length]; };
    const [ax, ay] = avg(mine), [bx, by] = avg(theirs.length ? theirs : [[Math.floor(S.w / 2), Math.floor(S.h / 2)]]);
    return [bx - ax, by - ay];
  }
  formationCell(anchor, form, si) {
    const S = this.state, [dx, dy] = this.enemyDir(si), [ax, ay] = G.hex.center(anchor), l = Math.hypot(dx, dy) || 1;
    const cands = G.hex.within(anchor, 3).filter(c => this.inside(c) && !this.unitAt(c) && this.standable(c, null));
    const score = c => { const [x, y] = G.hex.center(c), d = G.hex.dist(anchor, c), fwd = ((x - ax) * dx + (y - ay) * dy) / l / G.T;
      if (form === 'shield') return d * 10 - fwd * .1; if (form === 'column') return d * 2 + fwd * 4 + Math.abs(((x - ax) * -dy + (y - ay) * dx) / l / G.T) * 3; return d * 3 - fwd * 4; };
    cands.sort((a, b) => score(a) - score(b) || a[1] - b[1] || a[0] - b[0]);
    return cands[0] || null;
  }
  addKnight(rec, si, ti, at) {
    const S = this.state, kv = G.knightView(rec), side = S.sides[si], boost = 1 + (side.boost || 0), st = kv.st, c = kv.cls;
    const u = { id: S.units.length, side: si, troop: ti, kind: 'knight', ref: rec.id, name: G.has('knight', rec.id) ? G.get('knight', rec.id).short : rec.id, cls: rec.cls, elem: rec.elem, size: 'M',
      fl: false, sw: false, fo: false, boss: !!c.boss, ruler: !!rec.ruler, lvl: rec.lvl, exp: rec.exp || 0, rec: G.clone(rec),
      mhp: Math.round(st.hp * boost), mmp: st.mp, hp: Math.min(Math.round((rec.hp === undefined ? st.hp : rec.hp) * boost), Math.round(st.hp * boost)), mp: Math.min(rec.mp === undefined ? st.mp : rec.mp, st.mp),
      atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: st.agi, mov: kv.mods.mov, ward: kv.mods.ward, bond: kv.mods.bond,
      skills: kv.skills, basic: Object.assign({}, c.basic), flags: kv.flags, cx: at[0], cy: at[1], out: null, moved: false, acted: false, movedDist: 0, from: null, eff: {}, stopImm: -1, once: {}, last: {}, expGain: 0, kos: 0, dealt: 0, lvls: 0 };
    if (c.basic.range && kv.flags.rangeBonus) u.basic.range = [c.basic.range[0], c.basic.range[1] + kv.flags.rangeBonus];
    if (u.skills.includes('eagleeye') && u.basic.bow) u.basic.range = [u.basic.range[0], u.basic.range[1] + 1];
    if (rec.id === 'graynight') { u.boss = true; u.size = 'L'; }
    S.units.push(u); return u;
  }
  addMonster(rec, si, ti, at) {
    const S = this.state, m = G.get('monster', rec.sp), st = G.monsterStats(rec.sp, rec.tier, rec.lvl), f = G.monsterFlags(rec.sp, rec.tier), boost = 1 + (S.sides[si].boost || 0);
    const u = { id: S.units.length, side: si, troop: ti, kind: 'monster', ref: rec.uid, sp: rec.sp, tier: rec.tier, name: m.names[rec.tier - 1], elem: m.elem, size: m.sizes[rec.tier - 1],
      fl: f.fl, sw: f.sw, fo: f.fo, boss: f.boss, lvl: rec.lvl, exp: rec.exp || 0, rec: G.clone(rec),
      mhp: Math.round(st.hp * boost), mmp: st.mp, hp: Math.min(Math.round((rec.hp === undefined ? st.hp : rec.hp) * boost), Math.round(st.hp * boost)), mp: Math.min(rec.mp === undefined ? st.mp : rec.mp, st.mp),
      atk: Math.round(st.atk * boost), def: Math.round(st.def * boost), int: Math.round(st.int * boost), agi: st.agi, mov: st.mov, skills: G.monsterSkills(rec.sp, rec.tier), basic: Object.assign({}, m.basic),
      flags: { immune: [] }, cx: at[0], cy: at[1], out: null, moved: false, acted: false, movedDist: 0, from: null, eff: {}, stopImm: -1, once: {}, last: {}, expGain: 0, kos: 0, dealt: 0, lvls: 0 };
    if (u.skills.includes('thorns')) u.flags.thorns = true;
    if (u.skills.includes('regenerate')) u.flags.regen = .1;
    if (u.skills.includes('thickhide')) u.flags.thick = true;
    S.troops[ti].units.push(u.id); S.units.push(u); return u;
  }
  faceEnemy(u) { const [dx, dy] = this.enemyDir(u.side); return Math.atan2(dy, dx); }

  /* ---- the field ---- */
  inside([x, y]) { return x >= 0 && y >= 0 && x < this.state.w && y < this.state.h; }
  code([x, y]) { return this.state.cells[y * this.state.w + x]; }
  ter(c) { return G.get('terrain', this.code(c)); }
  unitAt(c) { const S = this.state; for (const u of S.units) if (!u.out && u.cx === c[0] && u.cy === c[1]) return u; return null; }
  live(side) { return this.state.units.filter(u => !u.out && (side === undefined || u.side === side)); }
  knightOf(u) { return this.state.units[this.state.troops[u.troop].knight]; }
  foes(u) { return this.state.units.filter(o => !o.out && o.side !== u.side); }
  applySeason(season, first) {
    const S = this.state, flood = G.get('map', S.spec.map).flood;
    S.season = season;
    S.cells = S.base.map((c, i) => { if (S.fire[i]) return S.fire[i].ash ? 'ash' : 'fire'; return G.seasonTerrain(c, season, flood); });
  }
  // terrain cost for a unit (Infinity: can't enter); stop: may it end there
  costOf(u, c) {
    const t = this.ter(c), S = this.state;
    if (u.fl) return { cost: 1, stop: !t.wall };
    if (t.block) { if (u.sw && t.swim) return { cost: 1, stop: true }; return { cost: Infinity, stop: false }; }
    let cost = t.cost;
    if (t.forest && u.size === 'L') cost = t.costL || 3;
    if (t.water && u.sw) cost = 1;
    if ((t.swamp || this.code(c) === '~') && u.fo) cost = 1;
    if (this.code(c) === '~' && S.season === 'summer') cost = 1;
    if (t.swamp && S.season === 'winter') cost = Math.min(cost, 2);
    if (this.code(c) === 'snow') cost = u.elem === 'winter' ? 1 : 2;
    return { cost, stop: true };
  }
  standable(c, u) { if (!this.inside(c)) return false; const t = this.ter(c); if (u && u.fl) return !t.wall; if (t.block) return !!(u && u.sw && t.swim); return true; }
  effMov(u) { let m = u.mov; if (u.eff.chill) m -= 1; if (u.eff.haste) m += 1; if (u.fl && this.state.season === 'autumn') m -= 1; return Math.max(1, m); }
  // every hex u can reach: Map key -> { c, cost, prev }
  reach(u, budget = this.effMov(u)) {
    const out = new Map(), start = [u.cx, u.cy], k0 = G.hex.key(start), q = [[0, start]];
    out.set(k0, { c: start, cost: 0, prev: null });
    while (q.length) {
      q.sort((a, b) => a[0] - b[0] || a[1][1] - b[1][1] || a[1][0] - b[1][0]);
      const [cost, c] = q.shift(); const cur = out.get(G.hex.key(c)); if (cur.cost < cost) continue;
      for (const n of G.hex.neighbors(c)) {
        if (!this.inside(n)) continue;
        const o = this.unitAt(n); if (o && o.side !== u.side) continue;
        const { cost: mc } = this.costOf(u, n); if (mc === Infinity) continue;
        const nc = cost + mc; if (nc > budget) continue;
        const k = G.hex.key(n), old = out.get(k); if (old && old.cost <= nc) continue;
        out.set(k, { c: n, cost: nc, prev: c }); q.push([nc, n]);
      }
    }
    const res = new Map();
    for (const [k, v] of out) { const o = this.unitAt(v.c); if ((o && o !== u) || !this.costOf(u, v.c).stop) continue; res.set(k, v); }
    res.all = out; return res;
  }
  pathTo(u, to, reach = this.reach(u)) { const all = reach.all, p = []; let k = G.hex.key(to); if (!all.has(k)) return []; let c = to; while (c) { p.unshift(c); const v = all.get(G.hex.key(c)); c = v.prev; } return p; }

  /* ---- turn order ---- */
  startBell(ev) {
    const S = this.state;
    S.bell++;
    if (S.spec.mode === 'shrine' || S.spec.wheel) { this.applySeason(G.SEASONS[(S.bell - 1 + (S.spec.wheelStart || 0)) % 4]); ev.push({ type: 'season', season: S.season }); }
    const tr = S.troops.filter(t => !t.gone).map(t => ({ t, agi: S.units[t.knight].agi }));
    tr.sort((a, b) => b.agi - a.agi || (a.t.side === S.spec.defender ? -1 : 0) - (b.t.side === S.spec.defender ? -1 : 0) || a.t.id - b.t.id);
    S.order = tr.map(x => x.t.id); S.oi = 0;
    ev.push({ type: 'bell', bell: S.bell, order: S.order.slice() });
    this.startTroop(ev);
  }
  get active() { const S = this.state; return S.over ? null : S.troops[S.order[S.oi]] || null; }
  startTroop(ev) {
    const S = this.state;
    while (S.oi < S.order.length && S.troops[S.order[S.oi]].gone) S.oi++;
    if (S.oi >= S.order.length) { this.endBell(ev); return; }
    const tr = S.troops[S.order[S.oi]];
    ev.push({ type: 'troop', troop: tr.id, side: tr.side });
    for (const id of [tr.knight, ...tr.units]) {
      const u = S.units[id]; if (u.out) continue;
      u.moved = u.acted = false; u.movedDist = 0; u.from = null;
      u.mp = Math.min(u.mmp, u.mp + (S.dev.infMP && S.sides[u.side].human ? 99 : 2));
      if (u.eff.guarded) delete u.eff.guarded;
      const tick = (pct, why, col) => { const d = Math.max(1, Math.round(u.mhp * pct)); this.damage(u, d, null, ev, { why, color: col }); };
      if (u.eff.poison) tick(.08, 'poison', '#80e050');
      if (!u.out && u.eff.burn) tick(.05, 'burn', '#ff7030');
      if (!u.out && this.code([u.cx, u.cy]) === 'fire') tick(.1, 'fire', '#ff7030');
      if (!u.out && u.flags.regen && u.hp < u.mhp) { const h = Math.round(u.mhp * u.flags.regen); u.hp = Math.min(u.mhp, u.hp + h); ev.push({ type: 'heal', u: u.id, amount: h }); }
      if (u.out) continue;
      if (u.eff.sleep || u.eff.stop) { u.acted = true; u.moved = true; ev.push({ type: 'skip', u: u.id, why: u.eff.sleep ? 'sleep' : 'stop' }); if (u.eff.stop) { delete u.eff.stop; u.stopImm = S.bell + 1; } }
    }
    if (this.troopDone(tr)) { this.nextTroop(ev); }
  }
  troopDone(tr) { const S = this.state; if (tr.gone) return true; return [tr.knight, ...tr.units].every(id => S.units[id].out || S.units[id].acted); }
  nextTroop(ev) { const S = this.state; if (S.over) return; S.oi++; this.startTroop(ev); }
  endBell(ev) {
    const S = this.state;
    for (const u of S.units) { if (u.out) continue; for (const k in u.eff) { if (k === 'guarded' || k === 'stop') continue; u.eff[k]--; if (u.eff[k] <= 0) { delete u.eff[k]; ev.push({ type: 'fade', u: u.id, eff: k }); } } }
    for (const kc of S.keeps) { const u = this.unitAt(kc); if (u && (S.spec.mode !== 'siege' || u.side === S.spec.defender || S.spec.mode === 'shrine') && u.hp < u.mhp) { const h = Math.round(u.mhp * .1); u.hp = Math.min(u.mhp, u.hp + h); ev.push({ type: 'heal', u: u.id, amount: h, why: 'keep' }); } }
    for (const i in S.fire) { const f = S.fire[i]; if (!f.ash && --f.t <= 0) { f.ash = true; S.cells[i] = 'ash'; ev.push({ type: 'terrain', i: +i, code: 'ash' }); } }
    if (S.spec.mode === 'sanctum') this.sanctumRules(ev);
    if (S.spec.mode === 'shrine') { for (const kc of S.keeps) { const u = this.unitAt(kc); if (u) { S.sides[u.side].glory += 5; ev.push({ type: 'glory', side: u.side, amount: 5, why: 'shrine' }); } } }
    this.checkWin(ev, true);
    if (!S.over) this.startBell(ev);
  }
  sanctumRules(ev) {
    const S = this.state, gk = S.units.find(u => u.ref === 'graynight'), center = S.keeps[0], player = S.spec.attacker;
    if (!S.wheelTurned) {   // the Hour Hand: points one way per bell; units on its line roll Stop 70
      const d = S.bell % 6, line = []; let p = center;
      for (let i = 0; i < 12; i++) { p = G.hex.neighbor(p, d); if (!this.inside(p) || this.code(p) === '#') break; line.push(p); }
      ev.push({ type: 'hand', dir: d, line });
      for (const c of line) { const u = this.unitAt(c); if (u && u.side === player) this.tryStatus(null, u, 'stop', 70, ev); }
    }
    for (let i = 0; i < S.cells.length; i++) if (S.base[i] === 'D') {
      const c = [i % S.w, Math.floor(i / S.w)], u = this.unitAt(c);
      if (u && u.side === player && !S.dials[i]) { S.dials[i] = true; ev.push({ type: 'dial', i, lit: true }); }
      else if (u && u.side !== player && S.dials[i]) { S.dials[i] = false; ev.push({ type: 'dial', i, lit: false }); }
    }
    if (!S.wheelTurned && Object.values(S.dials).filter(Boolean).length >= 4) { S.wheelTurned = true; ev.push({ type: 'wheel' }); if (gk && !gk.out) gk.def = Math.round(gk.def * .6); }
  }
  timeless(u) { const S = this.state; return u.ref === 'graynight' && !S.wheelTurned && S.timelessBreak < S.bell; }

  /* ---- stats in play ---- */
  outsideWard(u) { if (u.kind !== 'monster') return false; const k = this.knightOf(u); return !k || k.out || G.hex.dist([u.cx, u.cy], [k.cx, k.cy]) > k.ward; }
  stat(u, s) {
    let v = u[s]; const S = this.state;
    if ((s === 'atk' || s === 'def' || s === 'int') && this.outsideWard(u)) v *= 1 - G.tune.wardPenalty;
    if (s === 'atk') { if (u.eff.valor) v *= 1.2; if (u.eff.weakened) v *= .85; }
    if (s === 'def') { if (u.eff.burn) v *= .9; if (u.eff.warded) v *= 1.2; if (u.eff.exposed) v *= .8; if (u.eff.guarded) v *= 1.3; if (u.eff.frostarmor) v *= 1.4; if (u.flags.thick) v *= 1.1; }
    if (s === 'agi') { if (u.eff.chill) v *= .8; if (u.eff.haste) v *= 1.2; }
    return v;
  }
  tideOf(u, attacking) {
    const S = this.state, s = S.season; if (u.elem === 'hour' || this.timeless(u)) return 1;
    let tb = G.tune.tideBonus * (S.spec.longWinter && s === 'winter' ? 2 : 1) * (u.flags.tide2 ? 2 : 1);
    if (attacking) return u.elem === s ? 1 + tb : u.elem === G.OPPOSE[s] ? 1 - tb : 1;
    return u.elem === s ? .9 : 1;
  }
  elemMul(aEl, d, sk) {
    if (sk && sk.antiHour && d.elem === 'hour') return sk.antiHour;
    if (!aEl || aEl === 'none' || aEl === 'hour' || d.elem === 'hour') return 1;
    if (G.OPPOSE[aEl] === d.elem) return G.tune.elemStrong;
    if (aEl === d.elem) return G.tune.elemSame;
    return 1;
  }
  attackElem(u, sk) { if (!sk || sk.elem === 'user' || !sk.elem) return sk && !sk.elem && !sk.p ? null : u.elem; return sk.elem; }
  adjAllies(a, d) { return G.hex.neighbors([d.cx, d.cy]).filter(c => { const o = this.unitAt(c); return o && o !== a && o.side === a.side; }).length; }
  hitChance(a, d, from, sk) {
    const S = this.state, dist = G.hex.dist(from, [d.cx, d.cy]), t = this.ter([d.cx, d.cy]);
    let h = G.tune.baseHit + (this.stat(a, 'agi') - this.stat(d, 'agi')) + (a.size === 'L' && d.size === 'S' ? G.tune.largeVsSmall : G.SIZE_HIT[a.size][d.size]);
    h += Math.min(15, 5 * this.adjAllies(a, d));
    h -= t.evade || 0; if (t.field && S.season === 'summer') h -= 10;
    h -= 5 * Math.max(0, dist - 2);
    if (dist > 1 && S.season === 'spring') h -= 5;
    if (S.season === 'winter' && a.elem !== 'winter') h -= 5;
    if (t.ice && a.elem !== 'winter') h -= 10;
    if (d.eff.guarded) h -= 10;
    if (sk && sk.hitBonus) h += sk.hitBonus;
    if (a.kind === 'monster') { const k = this.knightOf(a); if (k && !k.out && k.skills.includes('packtactics')) h += 10; }
    if (d.eff.sleep || d.eff.stop) h += 30;
    return clamp(Math.round(h), 15, 99);
  }
  terrainDef(d) { const t = this.ter([d.cx, d.cy]); let v = t.def || 0; if (t.forest) v = this.state.season === 'autumn' ? .1 : G.tune.forestDef; if (t.keep) v = (this.state.spec.mode === 'siege' && d.side === this.state.spec.defender) || this.state.spec.mode === 'shrine' ? .25 : 0; return v; }
  // physical damage range [min, max] before crit
  physDmg(a, d, from, sk, P) {
    const S = this.state, el = this.attackElem(a, sk || { elem: 'user' });
    let base = this.stat(a, 'atk') * P - this.stat(d, 'def') * G.tune.defFactor;
    let m = G.tune.dmgScale * this.elemMul(el, d, sk) * this.tideOf(a, true) * this.tideOf(d, false) * (1 - this.terrainDef(d)) * (d.eff.guarded ? .7 : 1) * (1 + G.tune.surroundBonus * Math.min(3, this.adjAllies(a, d)));
    const ft = this.ter(from); if (ft.hill && G.hex.dist(from, [d.cx, d.cy]) === 1) m *= 1.1;
    if (a.skills.includes('ambush') && ft.forest) m *= 1.3;
    if (a.flags.winterDmg && a.elem === 'winter') m *= 1 + a.flags.winterDmg;
    if (a.eff.windup && !sk) m *= 1.5;
    if (this.timeless(d)) m *= .5;
    const v = Math.max(1, base * m);
    return [Math.max(1, Math.round(v * .9)), Math.max(1, Math.round(v * 1.1))];
  }
  magDmg(a, d, sk) {
    const el = sk.elem;
    let v = (sk.p + this.stat(a, 'int') - this.stat(d, 'int') * .5) * G.tune.magicScale * this.elemMul(el, d, sk) * (sk.ignoreTide ? 1 : this.tideOf(a, true) * this.tideOf(d, false));
    if (d.eff.warded) v *= .8; if (this.timeless(d)) v *= .5;
    if (a.flags.elemBoost && a.flags.elemBoost[0] === el) v *= 1 + a.flags.elemBoost[1];
    v = Math.max(1, v); return [Math.max(1, Math.round(v * .9)), Math.max(1, Math.round(v * 1.1))];
  }
  critChance(a) { return Math.min(30, G.tune.critBase + this.stat(a, 'agi') / 4); }
  statusChance(a, d, base) { let c = clamp(base + (a ? this.stat(a, 'int') - this.stat(d, 'int') : 0), 10, 90) * G.tune.statusScale; if (d.boss) c /= 2; return Math.round(c); }

  /* ---- what a unit may do ---- */
  rangeOf(u, sk) {
    let r = sk ? sk.range.slice() : u.basic.range.slice();
    if ((sk ? sk.bow : u.basic.bow) && this.ter([u.cx, u.cy]).hill) r[1] += 1;
    if (!sk && u.basic.whip && u.rec.equip && u.rec.equip.weapon === 'thornwhip') r[1] = Math.max(r[1], 3);
    return r;
  }
  skillUsable(u, id) {
    const sk = G.get('skill', id), S = this.state;
    if (sk.kind === 'passive') return { ok: false, why: 'Passive' };
    if (u.acted) return { ok: false, why: 'Already acted' };
    if (sk.mp > u.mp && !(S.dev.infMP && S.sides[u.side].human)) return { ok: false, why: 'Not enough MP' };
    if (sk.kind === 'spell' && u.moved) return { ok: false, why: 'Spells need planted feet' };
    if (sk.kind === 'special' && !sk.mobile && u.moved) return { ok: false, why: 'Cannot use after moving' };
    if (sk.needMove && u.movedDist < sk.needMove) return { ok: false, why: 'Move ' + sk.needMove + ' hexes first' };
    if ((id === 'dive') && !u.fl) return { ok: false, why: 'Fliers only' };
    if (sk.once && u.once[id]) return { ok: false, why: 'Once a battle' };
    if (sk.every) { const gap = u.hp < u.mhp / 2 ? 2 : sk.every; if (u.last[id] !== undefined && S.bell - u.last[id] < gap) return { ok: false, why: 'Recharging' }; }
    return { ok: true };
  }
  // target hexes for an action from the unit's current hex
  targets(u, kind, id) {
    const S = this.state, at = [u.cx, u.cy], out = [];
    if (kind === 'attack') { const [lo, hi] = this.rangeOf(u, null); for (const o of this.foes(u)) { const d = G.hex.dist(at, [o.cx, o.cy]); if (d >= lo && d <= hi) out.push([o.cx, o.cy]); } return out; }
    if (kind === 'item') { out.push(at); for (const c of G.hex.neighbors(at)) { const o = this.unitAt(c); if (o && o.side === u.side) out.push(c); } return out; }
    const sk = G.get('skill', id);
    if (['cone2', 'cone3', 'line3', 'line4'].includes(sk.area)) return G.hex.neighbors(at).filter(c => this.inside(c));
    if (sk.range[1] === 0 && sk.range[0] === 0) return [at];
    const [lo, hi] = this.rangeOf(u, sk);
    for (const c of G.hex.within(at, hi)) {
      if (!this.inside(c) || G.hex.dist(at, c) < lo) continue;
      if (sk.area === 'single' || !sk.area) { const o = this.unitAt(c); if (!o || !this.affects(u, sk, o)) continue; if (sk.inWard && G.hex.dist(at, c) > u.ward) continue; }
      out.push(c);
    }
    return out;
  }
  affects(u, sk, o) {
    if (sk.who === 'foes') return o.side !== u.side;
    if (sk.who === 'allies') return o.side === u.side;
    if (sk.who === 'ownMon') return o.troop === u.troop && o.kind === 'monster';
    return true;
  }
  // the hexes an action touches if aimed at target hex t
  area(u, sk, t) {
    const at = [u.cx, u.cy];
    if (!sk) return [t];
    switch (sk.area) {
      case 'r1': return G.hex.within(t, 1).filter(c => this.inside(c));
      case 'r2': return G.hex.within(t, 2).filter(c => this.inside(c));
      case 'self-r1': return G.hex.within(at, 1).filter(c => this.inside(c));
      case 'self-r2': return G.hex.within(at, 2).filter(c => this.inside(c));
      case 'adj': return G.hex.neighbors(at).filter(c => this.inside(c));
      case 'cone2': case 'cone3': return G.hex.cone(at, G.hex.dirTo(at, t), u.sp === 'wyvern' || u.sp === 'frostwyrm' ? 3 : +sk.area[4]).filter(c => this.inside(c));
      case 'line3': case 'line4': return G.hex.line(at, G.hex.dirTo(at, t), +sk.area[4]).filter(c => this.inside(c));
      case 'troop': return this.state.troops[u.troop].units.map(i => this.state.units[i]).filter(o => !o.out).map(o => [o.cx, o.cy]);
      case 'ward': return G.hex.within(at, u.ward).filter(c => this.inside(c));
      default: return [t];
    }
  }
  unitsIn(u, sk, cells) { const out = []; for (const c of cells) { const o = this.unitAt(c); if (o && this.affects(u, sk || { who: 'foes' }, o)) out.push(o); } return out; }
  // { ok, why } for a command
  legal(cmd) {
    const S = this.state; if (S.over) return { ok: false, why: 'The battle is over' };
    const tr = this.active; if (!tr) return { ok: false, why: 'No troop' };
    if (cmd.t === 'end') return { ok: true };
    const u = S.units[cmd.u]; if (!u || u.out || u.troop !== tr.id) return { ok: false, why: 'Not this troop' };
    if (cmd.t === 'move') { if (u.moved || u.acted) return { ok: false, why: 'Already moved' }; const r = this.reach(u); return r.has(G.hex.key(cmd.to)) ? { ok: true } : { ok: false, why: 'Out of reach' }; }
    if (cmd.t === 'undo') return u.moved && !u.acted && u.from ? { ok: true } : { ok: false, why: 'Nothing to undo' };
    if (u.acted) return { ok: false, why: 'Already acted' };
    if (cmd.a === 'wait' || cmd.a === 'guard') return { ok: true };
    if (cmd.a === 'retreat') return u.kind === 'knight' && S.spec.mode !== 'shrine' ? { ok: true } : { ok: false, why: 'Knights only' };
    if (cmd.a === 'item') { if (u.kind !== 'knight') return { ok: false, why: 'Knights only' }; const it = G.get('item', cmd.item); if (it.slot !== 'consumable' || it.musterOnly) return { ok: false, why: 'Not usable here' }; const side = S.sides[u.side]; if (!side.items.includes(cmd.item)) return { ok: false, why: 'None left' }; }
    if (cmd.a === 'skill') { const ok = this.skillUsable(u, cmd.skill); if (!ok.ok) return ok; }
    const ts = this.targets(u, cmd.a, cmd.skill);
    return ts.some(c => G.hex.same(c, cmd.target)) ? { ok: true } : { ok: false, why: 'No target there' };
  }

  /* ---- applying commands ---- */
  apply(cmd) {
    const S = this.state, ev = [], lg = this.legal(cmd);
    if (!lg.ok) return [{ type: 'illegal', why: lg.why }];
    S.n++;
    const tr = this.active;
    if (cmd.t === 'end') { for (const id of [tr.knight, ...tr.units]) S.units[id].acted = true; ev.push({ type: 'endTroop', troop: tr.id }); this.nextTroop(ev); return ev; }
    const u = S.units[cmd.u];
    if (cmd.t === 'move') {
      const r = this.reach(u), path = this.pathTo(u, cmd.to, r);
      u.from = [u.cx, u.cy]; u.cx = cmd.to[0]; u.cy = cmd.to[1]; u.moved = true; u.movedDist = path.length - 1;
      if (path.length > 1) u.facing = Math.atan2(G.hex.center(path[path.length - 1])[1] - G.hex.center(path[path.length - 2])[1], G.hex.center(path[path.length - 1])[0] - G.hex.center(path[path.length - 2])[0]);
      ev.push({ type: 'move', u: u.id, path });
      if (S.spec.mode === 'sanctum' && u.ref === 'lunete') { const i = u.cy * S.w + u.cx; if (S.base[i] === 'D' && !S.dials[i]) { S.dials[i] = true; ev.push({ type: 'dial', i, lit: true }); } }
      return ev;
    }
    if (cmd.t === 'undo') { ev.push({ type: 'move', u: u.id, path: [[u.cx, u.cy], u.from], undo: true }); u.cx = u.from[0]; u.cy = u.from[1]; u.moved = false; u.movedDist = 0; u.from = null; return ev; }
    u.acted = true; if (!u.moved) u.moved = true;
    if (cmd.a === 'wait') ev.push({ type: 'wait', u: u.id });
    else if (cmd.a === 'guard') { u.eff.guarded = 1; ev.push({ type: 'buff', u: u.id, eff: 'guarded', src: u.id }); }
    else if (cmd.a === 'retreat') { ev.push({ type: 'retreatCmd', u: u.id }); this.knightOut(u, 'retreat', ev); }
    else if (cmd.a === 'item') this.useItem(u, cmd, ev);
    else this.strike(u, cmd.a === 'skill' ? cmd.skill : null, cmd.target, ev);
    this.checkWin(ev, false);
    if (!S.over && this.troopDone(tr)) this.nextTroop(ev);
    return ev;
  }
  useItem(u, cmd, ev) {
    const S = this.state, side = S.sides[u.side], it = G.get('item', cmd.item), t = this.unitAt(cmd.target);
    side.items.splice(side.items.indexOf(cmd.item), 1); side.used.push(cmd.item);
    ev.push({ type: 'item', u: u.id, item: cmd.item, target: t.id });
    if (it.heal) { const h = Math.min(t.mhp - t.hp, it.heal); t.hp += h; ev.push({ type: 'heal', u: t.id, amount: h }); }
    if (it.mpHeal) { t.mp = Math.min(t.mmp, t.mp + it.mpHeal); ev.push({ type: 'mp', u: t.id, amount: it.mpHeal }); }
    if (it.cleanse) this.cleanse(t, ev);
    this.gainExp(u, 8, ev);
  }
  cleanse(t, ev) { for (const k of Object.keys(t.eff)) { const e = G.get('effect', k); if (e.kind !== 'buff') { delete t.eff[k]; ev.push({ type: 'fade', u: t.id, eff: k }); } } }
  strike(u, skId, t, ev) {
    const S = this.state, sk = skId ? G.get('skill', skId) : null, at = [u.cx, u.cy];
    if (sk) { u.mp -= (S.dev.infMP && S.sides[u.side].human) ? 0 : sk.mp; if (sk.once) u.once[skId] = true; if (sk.every) u.last[skId] = S.bell; }
    if (!G.hex.same(t, at)) u.facing = Math.atan2(G.hex.center(t)[1] - G.hex.center(at)[1], G.hex.center(t)[0] - G.hex.center(at)[0]);
    if (u.eff.sleep) delete u.eff.sleep;
    const cells = this.area(u, sk, t);
    ev.push({ type: 'act', u: u.id, skill: skId, target: t, cells, elem: sk ? this.attackElem(u, sk) : u.elem, kind: sk ? sk.kind : 'attack' });
    // Mad Gambit misfires (unless the Duke is lucid)
    if (skId === 'madgambit' && !(S.dev.lucid) && R.next(S.rng) < sk.misfire) { ev.push({ type: 'misfire', u: u.id }); this.tryStatus(null, u, 'chill', 100, ev); return; }
    if (sk && sk.burns && S.season === 'summer') for (const c of cells) { const i = c[1] * S.w + c[0]; if (this.ter(c).forest && !S.fire[i]) { S.fire[i] = { t: 2 }; S.cells[i] = 'fire'; ev.push({ type: 'terrain', i, code: 'fire' }); } }
    const hits = sk ? this.unitsIn(u, sk, cells) : [this.unitAt(t)].filter(Boolean);
    for (const d of hits) {
      if (d.out) continue;
      if (sk && (sk.heal || sk.healPct)) { const amt = sk.heal ? Math.round((sk.heal + this.stat(u, 'int') * .8) * G.tune.healScale) : Math.round(d.mhp * sk.healPct); const h = Math.min(d.mhp - d.hp, amt); d.hp += h; ev.push({ type: 'heal', u: d.id, amount: h }); this.gainExp(u, 8, ev); continue; }
      if (sk && sk.cleanse) { this.cleanse(d, ev); this.gainExp(u, 8, ev); continue; }
      if (sk && sk.steal) { const m = Math.min(d.mp, sk.steal); d.mp -= m; u.mp = Math.min(u.mmp, u.mp + m); ev.push({ type: 'mp', u: d.id, amount: -m }); continue; }
      const harmful = !sk || sk.p || sk.pctMax || (sk.status && d.side !== u.side);
      if (harmful && (sk ? (sk.p || sk.pctMax) : true)) this.hit(u, d, sk, at, ev);
      if (d.out) continue;
      if (sk && sk.status && (d.side !== u.side || sk.who === 'all')) this.tryStatus(u, d, sk.status[0], sk.status[1], ev);
      if (sk && sk.buff && (d.side === u.side)) { for (const b of [sk.buff, sk.buff2, sk.buff3].filter(Boolean)) { d.eff[b[0]] = b[1]; ev.push({ type: 'buff', u: d.id, eff: b[0], src: u.id }); } this.gainExp(u, 8, ev); }
    }
    if (sk && sk.breaksTimeless) for (const d of hits) if (d.ref === 'graynight') { S.timelessBreak = S.bell + 1; ev.push({ type: 'timelessBreak' }); }
    if (sk && sk.push) for (const d of hits) if (!d.out) this.push(u, d, ev);
    if (u.eff.windup && !sk) delete u.eff.windup;
  }
  hit(a, d, sk, from, ev) {
    const S = this.state, magic = sk && sk.magic, always = magic || (sk && (sk.always || sk.pctMax)), hitP = always ? 100 : this.hitChance(a, d, from, sk);
    if (!always && R.next(S.rng) * 100 >= hitP) { ev.push({ type: 'miss', u: d.id, src: a.id }); return; }
    let dmg, crit = false;
    if (sk && sk.pctMax) dmg = Math.round(d.mhp * sk.pctMax * (this.timeless(d) ? .5 : 1));
    else {
      const [lo, hi] = magic ? this.magDmg(a, d, sk) : this.physDmg(a, d, from, sk, sk ? sk.p : a.basic.p);
      dmg = lo + Math.floor(R.next(S.rng) * (hi - lo + 1));
      if (!magic && R.next(S.rng) * 100 < this.critChance(a)) { crit = true; dmg = Math.round(dmg * 1.5); }
    }
    if (S.dev.oneHit && S.sides[a.side].human) dmg = d.hp;
    const el = this.attackElem(a, sk || { elem: 'user' }), em = this.elemMul(el, d, sk);
    this.damage(d, dmg, a, ev, { crit, strong: em > 1.01, weak: em < .99, tide: this.tideOf(a, true) });
    if (!d.out && !sk && a.basic.status) this.tryStatus(a, d, a.basic.status[0], a.basic.status[1], ev);
    if (!d.out && !sk && a.skills.includes('frostfang')) this.tryStatus(a, d, 'chill', 30, ev);
    if (!d.out && !sk && a.skills.includes('stopbite')) this.tryStatus(a, d, 'stop', 20, ev);
    const drain = (sk && sk.drain) || (!sk && a.basic.drain); if (drain && !a.out) { const h = Math.min(a.mhp - a.hp, Math.round(dmg * drain)); if (h > 0) { a.hp += h; ev.push({ type: 'heal', u: a.id, amount: h }); } }
    if (d.flags.thorns && G.hex.dist(from, [d.cx, d.cy]) === 1 && !magic && !a.out) this.damage(a, Math.max(1, Math.round(dmg * .1)), null, ev, { why: 'thorns' });
  }
  damage(d, dmg, a, ev, o = {}) {
    const S = this.state;
    if (S.dev.god && S.sides[d.side].human) dmg = 0;
    dmg = Math.min(dmg, d.hp); d.hp -= dmg; if (d.eff.sleep && dmg > 0) delete d.eff.sleep;
    ev.push(Object.assign({ type: 'hit', u: d.id, src: a ? a.id : null, dmg }, o));
    if (a) { a.dealt += dmg; if (S.spec.mode === 'shrine') { const g = Math.floor((a.dealt) / 5) - Math.floor((a.dealt - dmg) / 5); if (g > 0) { S.sides[a.side].glory += g; } } this.gainExp(a, clamp(8 + 2 * (d.lvl - a.lvl), 2, 30), ev); }
    if (d.hp <= 0) {
      if (d.skills.includes('rebirth') && !d.once.rebirth) { d.once.rebirth = true; d.hp = Math.round(d.mhp * .3); ev.push({ type: 'rebirth', u: d.id }); return; }
      if (a) { a.kos++; this.gainExp(a, d.kind === 'knight' ? (d.ruler ? 60 : 40) : 20, ev); if (S.spec.mode === 'shrine') { const g = d.kind === 'knight' ? 25 : 10; S.sides[a.side].glory += g; ev.push({ type: 'glory', side: a.side, amount: g, why: 'ko' }); } }
      if (d.kind === 'knight') this.knightOut(d, 'ko', ev); else { d.out = 'dead'; ev.push({ type: 'ko', u: d.id }); }
    } else if (d.ref === 'graynight' && !S.gkCalled && d.hp < d.mhp / 2) this.callSecondHands(d, ev);
  }
  callSecondHands(gk, ev) {
    const S = this.state; S.gkCalled = true;
    const near = G.hex.within([gk.cx, gk.cy], 3).filter(c => this.inside(c) && this.standable(c, null) && !this.unitAt(c));
    for (let i = 0; i < 2 && near.length; i++) { const c = near.shift(); const m = this.addMonster({ uid: 'second' + i, sp: 'minute', tier: 3, lvl: 14 }, gk.side, gk.troop, c); m.facing = Math.PI / 2; m.acted = true; ev.push({ type: 'summon', u: m.id }); }
  }
  tryStatus(a, d, st, base, ev) {
    const S = this.state; if (d.out) return;
    if (this.timeless(d) || d.flags.immune.includes(st)) { ev.push({ type: 'resist', u: d.id, eff: st }); return; }
    if (st === 'stop' && d.stopImm >= S.bell) { ev.push({ type: 'resist', u: d.id, eff: st }); return; }
    const ch = this.statusChance(a, d, base);
    if (R.next(S.rng) * 100 < ch) { d.eff[st] = G.get('effect', st).bells + (st === 'stop' ? 0 : 0); ev.push({ type: 'status', u: d.id, eff: st }); if (a) this.gainExp(a, 4, ev); }
    else ev.push({ type: 'resist', u: d.id, eff: st });
  }
  push(a, d, ev) {
    const dir = G.hex.dirTo([a.cx, a.cy], [d.cx, d.cy]), to = G.hex.neighbor([d.cx, d.cy], dir);
    if (this.inside(to) && !this.unitAt(to) && this.standable(to, d)) { ev.push({ type: 'move', u: d.id, path: [[d.cx, d.cy], to], push: true }); d.cx = to[0]; d.cy = to[1]; }
    else this.damage(d, 4, null, ev, { why: 'slam' });
  }
  knightOut(k, why, ev) {
    const S = this.state, tr = S.troops[k.troop];
    k.out = why === 'ko' ? 'down' : 'retreat';
    ev.push({ type: why === 'ko' ? 'knightDown' : 'retreat', u: k.id });
    tr.gone = true;
    for (const id of tr.units) {
      const m = S.units[id]; if (m.out) continue;
      const foesK = S.units.filter(o => !o.out && o.kind === 'knight' && o.side !== m.side);
      const near = foesK.filter(o => G.hex.dist([o.cx, o.cy], [m.cx, m.cy]) <= Math.max(1, o.ward));
      if (near.length && !m.boss && S.spec.mode !== 'shrine') {
        let ch = G.tune.captureBase + (this.outsideWard(m) ? .25 : 0) + (m.hp < m.mhp * .3 ? .15 : 0); ch = Math.min(.75, ch);
        if (R.next(S.rng) < ch) {
          near.sort((p, q) => G.hex.dist([p.cx, p.cy], [m.cx, m.cy]) - G.hex.dist([q.cx, q.cy], [m.cx, m.cy]) || p.id - q.id);
          m.out = 'captured'; S.captures.push({ u: m.id, side: near[0].side, by: near[0].id });
          ev.push({ type: 'capture', u: m.id, by: near[0].id }); continue;
        }
      }
      m.out = 'retreat'; ev.push({ type: 'retreat', u: m.id });
    }
    if (k.ruler && S.spec.mode !== 'shrine') {   // a fallen ruler routs the side
      for (const t of S.troops) if (t.side === k.side && !t.gone) { const kk = S.units[t.knight]; this.knightOut(kk, 'retreat', ev); }
      S.sides[k.side].routed = true;
    }
  }
  checkWin(ev, bellEnd) {
    const S = this.state; if (S.over) return;
    const mode = S.spec.mode, hasK = si => S.units.some(u => !u.out && u.kind === 'knight' && u.side === si);
    const end = (winner, why) => { S.over = { winner, why, bell: S.bell }; this.finishExp(); ev.push({ type: 'over', winner, why }); };
    if (mode === 'shrine') {
      const alive = S.sides.filter(s => hasK(s.id));
      if (alive.length <= 1 || (bellEnd && S.bell >= S.bells)) {
        for (const s of S.sides) if (hasK(s.id)) { s.glory += 10; ev.push({ type: 'glory', side: s.id, amount: 10, why: 'standing' }); }
        const best = Math.max(...S.sides.map(s => s.glory)); end(S.sides.findIndex(s => s.glory === best), 'glory');
      }
      return;
    }
    const A = S.spec.attacker, D = S.spec.defender;
    if (mode === 'sanctum') { const gk = S.units.find(u => u.ref === 'graynight'); if (gk && gk.out) return end(A, 'graynight'); if (!hasK(A)) return end(D, 'rout'); if (bellEnd && S.bell >= S.bells) return end(D, 'thirteenth'); return; }
    if (!hasK(A)) return end(D, 'rout');
    if (!hasK(D)) return end(A, 'rout');
    if (bellEnd && S.bell >= S.bells) { const onKeep = S.keeps.some(c => { const u = this.unitAt(c); return u && u.kind === 'knight' && u.side === A; }); end(onKeep ? A : D, onKeep ? 'keep' : 'time'); }
  }
  finishExp() { const S = this.state; for (const u of S.units) { if (u.out === 'dead' || u.out === 'captured') continue; const won = S.over && S.over.winner === u.side; this.gainExp(u, won ? 10 : 4, null); } }
  gainExp(u, n, ev) {
    const S = this.state; if (u.boss || u.ref === 'graynight') return;
    n = Math.round(n * G.tune.expScale * (S.sides[u.side].expMul || 1)); u.exp += n; u.expGain += n;
    while (u.exp >= 100 && u.lvl < 40) {
      u.exp -= 100; let gains;
      if (u.kind === 'knight') { gains = G.levelUpKnight(u.rec, S.rng); for (const s of ['atk', 'def', 'int', 'agi']) u[s] += gains[s]; u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; const ns = G.knightSkills(u.cls, u.elem, u.rec.lvl); for (const s of ns) if (!u.skills.includes(s)) u.skills.push(s); }
      else { gains = G.levelUpMonster(u.rec); for (const s of ['atk', 'def', 'int', 'agi']) u[s] += gains[s]; u.mhp += gains.hp; u.hp += gains.hp; u.mmp += gains.mp; u.mp += gains.mp; }
      u.lvl++; u.lvls++; u.rec.exp = u.exp;
      if (ev) ev.push({ type: 'levelup', u: u.id, lvl: u.lvl, gains });
    }
    u.rec.exp = u.exp;
  }
  /* ---- forecast (§5.12): for each unit an action touches ---- */
  forecast(u, kind, skId, t) {
    const sk = kind === 'skill' ? G.get('skill', skId) : null, cells = kind === 'item' ? [t] : this.area(u, sk, t), out = [], from = [u.cx, u.cy];
    const hits = kind === 'attack' ? [this.unitAt(t)].filter(Boolean) : kind === 'item' ? [this.unitAt(t)].filter(Boolean) : this.unitsIn(u, sk, cells);
    for (const d of hits) {
      const f = { u: d.id, name: d.name, side: d.side };
      if (kind === 'item') { const it = G.get('item', skId); f.heal = it.heal ? Math.min(d.mhp - d.hp, it.heal) : 0; f.note = it.name; out.push(f); continue; }
      if (sk && (sk.heal || sk.healPct)) { f.heal = Math.min(d.mhp - d.hp, sk.heal ? Math.round((sk.heal + this.stat(u, 'int') * .8) * G.tune.healScale) : Math.round(d.mhp * sk.healPct)); out.push(f); continue; }
      if (sk && (sk.buff || sk.cleanse || sk.steal) && !sk.p) { f.note = sk.buff ? G.get('effect', sk.buff[0]).name : sk.cleanse ? 'Cleanse' : 'MP -' + sk.steal; out.push(f); continue; }
      if (!sk || sk.p || sk.pctMax) {
        const magic = sk && sk.magic, always = magic || (sk && (sk.always || sk.pctMax));
        f.hit = always ? 100 : this.hitChance(u, d, from, sk);
        f.dmg = sk && sk.pctMax ? [Math.round(d.mhp * sk.pctMax), Math.round(d.mhp * sk.pctMax)] : magic ? this.magDmg(u, d, sk) : this.physDmg(u, d, from, sk, sk ? sk.p : u.basic.p);
        f.crit = magic ? 0 : Math.round(this.critChance(u));
        f.ko = f.dmg[0] >= d.hp;
        const em = this.elemMul(this.attackElem(u, sk || { elem: 'user' }), d, sk); f.elem = em > 1.01 ? 'strong' : em < .99 ? 'weak' : null;
        f.tide = this.tideOf(u, true);
      }
      if (sk && sk.status && d.side !== u.side) f.status = [G.get('effect', sk.status[0]).name, this.timeless(d) || d.flags.immune.includes(sk.status[0]) ? 0 : this.statusChance(u, d, sk.status[1])];
      if (d.kind === 'knight' && f.ko) f.captureRisk = true;
      out.push(f);
    }
    return out;
  }
  // expected damage of an action on d (AI and danger maps)
  expected(u, sk, d, from) {
    const save = [u.cx, u.cy]; u.cx = from[0]; u.cy = from[1];
    let e = 0;
    try {
      if (sk && sk.pctMax) e = d.mhp * sk.pctMax;
      else if (!sk || sk.p) { const magic = sk && sk.magic, [lo, hi] = magic ? this.magDmg(u, d, sk) : this.physDmg(u, d, from, sk, sk ? sk.p : u.basic.p), hit = magic || (sk && sk.always) ? 1 : this.hitChance(u, d, from, sk) / 100; e = (lo + hi) / 2 * hit * (magic ? 1 : 1 + this.critChance(u) / 200); }
    } finally { u.cx = save[0]; u.cy = save[1]; }
    return e;
  }
  // results for the campaign: each unit's record back, captures, who fell
  results() {
    const S = this.state;
    return { winner: S.over ? S.over.winner : null, why: S.over && S.over.why, bell: S.bell, captures: S.captures.map(c => ({ rec: S.units[c.u].rec, side: c.side, by: S.units[c.by].ref, hp: S.units[c.u].hp })),
      units: S.units.map(u => ({ side: u.side, kind: u.kind, ref: u.ref, out: u.out, hp: u.hp, mp: u.mp, rec: Object.assign(u.rec, { exp: u.exp }), lvls: u.lvls, expGain: u.expGain, name: u.name })),
      used: S.sides.map(s => s.used), glory: S.sides.map(s => s.glory) };
  }
}
G.BattleSim = BattleSim;
