/* ---- BattleSim: pure, deterministic, JSON state. Never touches the engine, the DOM, the clock or Math.random. ----
 * create(spec) -> state;  apply(S, cmd) -> events[] | null (illegal);  legal helpers: reach, targets, forecast. */
const B = G.Battle = {};
const H = G.hex;
B.tile = (S, c, r) => (r < 0 || r >= S.rows || c < 0 || c >= S.cols) ? '#' : S.tiles[r][c];
B.at = (S, c, r) => S.units.find(u => u.alive && !u.gone && u.c === c && u.r === r) || null;
B.unit = (S, uid) => S.units[uid];
B.live = (S, side) => S.units.filter(u => u.alive && !u.gone && (side === undefined || u.side === side));

B.skillsFor = (k, L) => { const suf = k.tier >= 2 ? '_3' : k.tier >= 1 ? '_2' : ''; const out = L.skills.map(s => s + suf); const el = G.REALMS[k.realm] ? G.REALMS[k.realm].season : 4; if (el < 4 && k.lvl >= 6) out.push(L.skills[0] + '_s' + el); return out; };
function mkKnight(k, side, troop) {
  const st = G.knightStats(k), L = G.LINES[k.line], K = G.KNIGHTS[k.id] || {}, realm = k.realm;
  const el = G.REALMS[realm] ? G.REALMS[realm].season : 4;
  return { id: 'k:' + k.id, side, troop, lead: true, kind: 'knight', name: K.name || k.name || k.id, short: K.short || k.id, line: k.line, tier: k.tier, form: k.tier, species: null, lvl: k.lvl, el: el > 3 ? 4 : el,
    size: 'M', hp: k.hp != null ? Math.min(k.hp, st.hp) : st.hp, maxhp: st.hp, mp: st.mp, maxmp: st.mp, atk: st.atk, def: st.def, int: st.int, spd: st.spd, mov: st.mov, range: st.range.slice(),
    akind: L.id === 'mage' || L.id === 'cleric' ? 'magic' : L.id === 'ranger' ? 'ranged' : 'melee', fly: false, skills: B.skillsFor(k, L), ref: { t: 'k', id: k.id }, ruler: !!k.ruler, boss: k.id === 'gray', bond: st.bond, realm };
}
function mkMon(m, side, troop, realm) {
  const sp = G.get('monster', m.species), st = G.monStats(sp, m.form, m.lvl);
  return { id: 'm:' + m.id, side, troop, lead: false, kind: 'mon', name: sp.names[m.form], short: sp.names[m.form], species: m.species, line: -1, tier: m.form, form: m.form, lvl: m.lvl, el: sp.el, size: sp.size,
    hp: m.hp != null ? Math.min(m.hp, st.hp) : st.hp, maxhp: st.hp, mp: 0, maxmp: 0, atk: st.atk, def: st.def, int: st.int, spd: st.spd, mov: st.mov, range: st.range.slice(), akind: sp.kind,
    fly: sp.fly, skills: [], ref: { t: 'm', id: m.id }, bond: st.bond, realm };
}
/* spec: { seed, map, season, kind, sides: [{ realm, human, items:[], troops:[{ knight, mons:[] }] }, ...] } */
B.create = spec => {
  const tiles = G.seasonMap(spec.map, spec.season), rows = tiles.length, cols = tiles[0].length;
  const S = { v: 1, map: spec.map, season: spec.season, kind: spec.kind || 'field', cols, rows, tiles, rng: G.Rng.make(spec.seed || 1), bell: 1, phase: 0, over: false, winner: -1, reason: '',
    bells: spec.bells || G.tune.bells, units: [], sides: [], log: [], dials: 0, turns: 0 };
  spec.sides.forEach((sd, si) => {
    S.sides.push({ realm: sd.realm, human: !!sd.human, items: (sd.items || []).slice(), troops: [], name: sd.name || (G.REALMS[sd.realm] || {}).name });
    sd.troops.forEach((tr, ti) => {
      S.sides[si].troops.push({ broken: false, retreated: false });
      const kn = mkKnight(Object.assign({ realm: sd.realm }, tr.knight), si, ti); kn.uid = S.units.length; S.units.push(kn);
      for (const m of tr.mons) { const u = mkMon(m, si, ti, sd.realm); u.uid = S.units.length; S.units.push(u); }
    });
  });
  for (const u of S.units) { u.alive = u.hp > 0; u.gone = null; u.moved = false; u.acted = false; u.done = false; u.fx = {}; u.xp = 0; u.kills = 0; u.dmgDone = 0; }
  // deployment: side 0 on the left, side 1 on the right (the Keep is the defender's); extra sides take the top and bottom
  S.nsides = S.sides.length;
  const zone = (si, c, r) => si === 0 ? c <= 3 : si === 1 ? c >= cols - 4 : si === 2 ? r <= 2 && c >= 3 && c <= cols - 4 : r >= rows - 3 && c >= 3 && c <= cols - 4;
  for (let si = 0; si < S.nsides; si++) {
    const nT = S.sides[si].troops.length;
    for (let t = 0; t < nT; t++) {
      const anchor = si < 2 ? [si === 0 ? 1 : cols - 2, nT === 1 ? 4 : nT === 2 ? (t ? 6 : 2) : [1, 4, 7][t]] : [nT === 1 ? 5 : 3 + t * 4, si === 2 ? 1 : rows - 2];
      const mem = S.units.filter(u => u.side === si && u.troop === t);
      for (const u of mem) {
        const free = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const ch = B.tile(S, c, r); if (ch === '#' || ch === 'w' || !zone(si, c, r)) continue; if (S.units.some(o => o !== u && o.c === c && o.r === r)) continue; free.push([c, r]); }
        const a0 = u.lead ? anchor : [anchor[0] + (si === 0 ? -1 : si === 1 ? 1 : 0) * (mem.indexOf(u) % 2 ? 1 : 0), anchor[1] + (si > 1 ? (mem.indexOf(u) % 2 ? 1 : 0) * (si === 2 ? 1 : -1) : 0)];
        free.sort((x, y) => (H.dist(x, a0) - H.dist(y, a0)) || (x[1] - y[1]));
        const pick = free[0] || [0, 0]; u.c = pick[0]; u.r = pick[1];
      }
    }
  }
  B.beginPhase(S, 0, []);
  return S;
};
B.dialsHeld = S => { let n = 0; for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (S.tiles[r][c] === 'D') { const u = B.at(S, c, r); if (u && u.side === 0) n++; } return n; };
B.dialCount = S => { let n = 0; for (const row of S.tiles) for (const ch of row) if (ch === 'D') n++; return n; };

/* ---- movement ---- */
B.moveAllow = (S, u) => {
  let m = u.mov + G.tune.moveBonus * (S.sides[u.side].human ? 1 : 0);
  if (S.season === 3 && u.el !== 3) m -= 1;
  if (S.season === 2 && u.fly) m -= 1;
  if (u.fx.root) m = 0;
  return Math.max(u.fx.root ? 0 : 1, m);
};
B.reach = (S, u) => {
  const budget = B.moveAllow(S, u), best = new Map(), key = (c, r) => c + ',' + r;
  best.set(key(u.c, u.r), { c: u.c, r: u.r, cost: 0, from: null });
  const q = [[u.c, u.r, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]); const [c, r, cost] = q.shift();
    if (cost > best.get(key(c, r)).cost) continue;
    for (const [nc, nr] of H.nb(c, r)) {
      if (nc < 0 || nr < 0 || nc >= S.cols || nr >= S.rows) continue;
      const ch = B.tile(S, nc, nr), t = G.TERRAIN[ch] || G.TERRAIN['.'];
      let step = u.fly ? (ch === '#' ? 99 : 1) : t.cost;
      if (step >= 99) continue;
      const occ = B.at(S, nc, nr); if (occ && occ.side !== u.side) continue;
      const nc2 = cost + step; if (nc2 > budget) continue;
      const k = key(nc, nr), old = best.get(k);
      if (!old || nc2 < old.cost) { best.set(k, { c: nc, r: nr, cost: nc2, from: key(c, r) }); q.push([nc, nr, nc2]); }
    }
  }
  const out = new Map();
  for (const [k, v] of best) { const o = B.at(S, v.c, v.r); if (!o || o === u) out.set(k, v); }
  out._all = best;
  return out;
};
B.pathTo = (reach, c, r) => { const p = []; let k = c + ',' + r; while (k) { const v = reach._all.get(k); if (!v) break; p.unshift([v.c, v.r]); k = v.from; } return p; };

/* ---- attack geometry ---- */
B.inRange = (u, from, tgt, rng) => { const d = H.dist(from, [tgt.c, tgt.r]); const [a, b] = rng || u.range; return d >= a && d <= b || (d === 1 && u.akind !== 'melee'); };
B.targetsFrom = (S, u, from) => B.live(S).filter(t => t.side !== u.side && B.inRange(u, from, t));
B.ward = (S, u) => {   // monsters outside their knight's ward fight at a penalty
  if (u.kind === 'knight') return true;
  const k = S.units.find(o => o.side === u.side && o.troop === u.troop && o.lead);
  return !k || !k.alive || k.gone || H.dist([u.c, u.r], [k.c, k.r]) <= 4;
};
B.damage = (S, a, d, mult, akind, o = {}) => {
  const T = G.tune, magic = akind === 'magic';
  let atk = magic ? a.int : a.atk;
  if (a.kind === 'mon' && !B.ward(S, a)) atk *= (1 - T.wardPenalty);
  let def = d.def * (magic ? .35 : .5);
  if (d.kind === 'mon' && !B.ward(S, d)) def *= (1 - T.wardPenalty);
  let v = Math.max(1, atk * mult - def);
  const el = o.el === undefined ? a.el : o.el;
  if (el < 4 && d.el < 4 && d.el === G.opposite(el)) v *= 1 + T.opposed; else if (el < 4 && d.el === el) v *= .9;
  if (el === S.season) v *= 1 + T.tide;
  if (d.el === S.season) v *= 1 - T.tide / 2;
  const tt = G.TERRAIN[B.tile(S, d.c, d.r)] || {}; v *= 1 - (d.fly ? 0 : (tt.def || 0));
  if (a.fx.atkUp) v *= 1.25; if (d.fx.defUp) v *= .8; if (d.fx.defDown) v *= 1.3;
  if (S.season === 2 && akind !== 'melee') v *= .85;
  if (d.boss && S.map === 'sanctum') v *= Math.max(.15, 1 - (.8 - B.dialsHeld(S) * T.dialShield));
  v *= S.sides[a.side].human ? T.dmgMul : (S.sides[d.side].human ? T.enemyDmg : 1);
  if (o.rand !== false) v *= .9 + G.Rng.next(S.rng) * .2;
  if (G.cheat.god && S.sides[d.side].human && !S.sides[a.side].human) return 1;
  if (G.cheat.oneHit && S.sides[a.side].human && !S.sides[d.side].human) return 9999;
  return Math.max(1, Math.round(v * (o.adj ? .7 : 1)));
};
B.hitChance = (S, a, d, akind) => {
  let h = akind === 'melee' ? .92 + G.sizeHit(a.size, d.size) : .95;
  if (S.season === 2 && akind !== 'melee') h -= .05;
  return G.clamp(h, .55, 1);
};
B.forecast = (S, a, d, skill, from) => {
  const sk = skill && G.get('skill', skill), mult = sk ? sk.power : 1, akind = sk && (sk.kind === 'aoe' && sk.base === 'bolt') ? 'magic' : a.akind;
  const adj = !sk && a.akind !== 'melee' && H.dist(from || [a.c, a.r], [d.c, d.r]) === 1;
  const ak = sk ? (sk.base === 'bolt' ? 'magic' : sk.base === 'cleave' ? 'melee' : 'ranged') : akind;
  const dm = B.damage(S, a, d, mult, ak, { rand: false, adj });
  return { dmg: dm, lo: Math.max(1, Math.round(dm * .9)), hi: Math.round(dm * 1.1), hit: sk ? 1 : B.hitChance(S, a, d, ak), kill: dm >= d.hp };
};
B.captureChance = (S, k, t) => {
  if (t.kind !== 'mon' || t.hp / t.maxhp >= .5) return 0;
  let p = .22 + (1 - t.hp / t.maxhp) * .55 - t.tier * .08 + (B.ward(S, t) ? 0 : .2) + (k.lvl - t.lvl) * .015;
  return G.clamp(p * G.tune.capture, 0, .95);
};

/* ---- phases and bells ---- */
B.beginPhase = (S, side, ev) => {
  S.phase = side;
  for (const u of B.live(S, side)) {
    u.moved = u.acted = u.done = false;
    for (const k of Object.keys(u.fx)) { if (u.fx[k] > 0) u.fx[k]--; if (u.fx[k] <= 0) delete u.fx[k]; }
    if (u.fx.daze) { u.done = true; u.acted = u.moved = true; }
    if (u.kind === 'mon' && G.get('monster', u.species).passive === 'regen' && u.hp < u.maxhp) { const h = Math.min(3, u.maxhp - u.hp); u.hp += h; ev.push({ k: 'heal', u: u.uid, by: u.uid, amt: h }); }
    if (B.tile(S, u.c, u.r) === 'F' && !u.fly) { const d = Math.max(2, Math.round(u.maxhp * .08)); u.hp -= d; ev.push({ k: 'fire', u: u.uid, dmg: d }); if (u.hp <= 0) B.fall(S, u, null, ev); }
  }
  ev.push({ k: 'phase', side, bell: S.bell });
  B.checkOver(S, ev);
};
B.sideAlive = (S, si) => S.sides[si].troops.some(t => !t.broken && !t.retreated);
B.endPhase = (S, ev) => {
  if (S.over) return;
  for (const u of B.live(S, S.phase)) u.done = true;
  let next = -1, wrap = false;
  for (let k = 1; k <= S.nsides; k++) { const si = (S.phase + k) % S.nsides; if (B.sideAlive(S, si)) { next = si; wrap = si <= S.phase; break; } }
  if (next < 0) { B.checkOver(S, ev); return; }
  if (!wrap) { B.beginPhase(S, next, ev); return; }
  // end of a full bell
  if (S.bell >= S.bells) {
    let keepSide = -1; for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) if (B.tile(S, c, r) === 'K') { const o = B.at(S, c, r); if (o && o.kind === 'knight') keepSide = o.side; }
    S.over = true;
    if (S.nsides === 2) { S.winner = keepSide === 0 ? 0 : 1; S.reason = keepSide === 0 ? 'keep' : 'bells'; }
    else { let best = -1, bv = -1; for (let si = 0; si < S.nsides; si++) { const v = B.live(S, si).reduce((a, u) => a + u.hp, 0) + (si === keepSide ? 1e4 : 0); if (v > bv) { bv = v; best = si; } } S.winner = best; S.reason = keepSide === best ? 'keep' : 'bells'; }
    ev.push({ k: 'over', winner: S.winner, reason: S.reason }); return;
  }
  S.bell++; ev.push({ k: 'bell', n: S.bell });
  B.beginPhase(S, next, ev);
};
B.fall = (S, u, by, ev) => {
  u.hp = 0; u.alive = false; u.gone = 'down';
  if (by) { by.kills++; by.xp += 14 + u.lvl * 3; }
  ev.push({ k: 'down', u: u.uid, by: by ? by.uid : -1 });
  if (u.kind === 'knight') {
    const tr = S.sides[u.side].troops[u.troop]; tr.broken = true;
    for (const m of S.units) if (m.side === u.side && m.troop === u.troop && m.alive && !m.gone) { m.gone = 'fled'; ev.push({ k: 'flee', u: m.uid }); }
    ev.push({ k: 'break', side: u.side, troop: u.troop });
    if (u.ruler) for (const t of S.sides[u.side].troops) t.broken = true;
  }
  B.checkOver(S, ev);
};
B.checkOver = (S, ev) => {
  if (S.over) return;
  const alive = []; for (let si = 0; si < S.nsides; si++) if (B.sideAlive(S, si)) alive.push(si);
  if (alive.length <= 1) { S.over = true; S.winner = alive.length ? alive[0] : (S.nsides === 2 ? 1 : 0); S.reason = 'routed'; ev.push({ k: 'over', winner: S.winner, reason: 'routed' }); }
};
const gain = (u, n) => { u.xp += n; };

/* ---- commands ---- */
B.canAct = (S, u) => !S.over && u && u.alive && !u.gone && u.side === S.phase && !u.done;
B.apply = (S, cmd) => {
  const ev = [], u = cmd.u !== undefined ? S.units[cmd.u] : null;
  if (S.over) return null;
  if (cmd.t === 'endphase') { B.endPhase(S, ev); S.turns++; return ev; }
  if (!B.canAct(S, u)) return null;
  switch (cmd.t) {
    case 'move': {
      if (u.moved) return null;
      const rc = B.reach(S, u), v = rc.get(cmd.to[0] + ',' + cmd.to[1]); if (!v) return null;
      const path = B.pathTo(rc, cmd.to[0], cmd.to[1]); u.c = cmd.to[0]; u.r = cmd.to[1]; u.moved = true;
      ev.push({ k: 'move', u: u.uid, path }); break;
    }
    case 'wait': u.done = true; u.acted = true; ev.push({ k: 'wait', u: u.uid }); break;
    case 'attack': {
      if (u.acted) return null; const d = S.units[cmd.target]; if (!d || !d.alive || d.gone || d.side === u.side || !B.inRange(u, [u.c, u.r], d)) return null;
      const adj = u.akind !== 'melee' && H.dist([u.c, u.r], [d.c, d.r]) === 1;
      const hit = G.Rng.next(S.rng) < B.hitChance(S, u, d, u.akind);
      const ev1 = { k: 'hit', a: u.uid, d: d.uid, akind: u.akind, miss: !hit, dmg: 0 };
      if (hit) { const dm = B.damage(S, u, d, 1, u.akind, { adj }); d.hp -= dm; ev1.dmg = dm; u.dmgDone += dm; gain(u, Math.round(dm * .45 * G.tune.expMul)); }
      ev.push(ev1); u.acted = u.done = true;
      if (d.hp <= 0) B.fall(S, d, u, ev); break;
    }
    case 'skill': {
      const sk = G.get('skill', cmd.skill); if (!sk || !u.skills.includes(sk.id) || u.acted || u.mp < sk.mp) return null;
      if (u.moved && !sk.mobile) return null;
      const out = B.doSkill(S, u, sk, cmd, ev); if (!out) return null;
      u.mp -= sk.mp; u.acted = u.done = true; break;
    }
    case 'bind': {
      if (u.acted || u.kind !== 'knight') return null; const t = S.units[cmd.target];
      if (!t || !t.alive || t.gone || t.side === u.side || H.dist([u.c, u.r], [t.c, t.r]) > 2) return null;
      const p = B.captureChance(S, u, t); if (p <= 0) return null;
      const ok = G.Rng.next(S.rng) < p; ev.push({ k: 'bind', a: u.uid, d: t.uid, ok, p });
      if (ok) { t.side = u.side; t.troop = u.troop; t.moved = t.acted = t.done = true; t.captured = true; t.fx = {}; ev.push({ k: 'captured', u: t.uid }); gain(u, 18); }
      u.acted = u.done = true; B.checkOver(S, ev); break;
    }
    case 'item': {
      const it = G.get('item', cmd.item), pool = S.sides[u.side].items, ix = pool.indexOf(cmd.item); const t = S.units[cmd.target];
      if (!it || ix < 0 || u.acted || u.kind !== 'knight' || !t || !t.alive || t.gone || t.side !== u.side || H.dist([u.c, u.r], [t.c, t.r]) > 1) return null;
      if (it.heal) { const h = Math.min(it.heal, t.maxhp - t.hp); t.hp += h; ev.push({ k: 'heal', u: t.uid, by: u.uid, amt: h }); }
      else if (it.mp) { if (t.kind !== 'knight') return null; t.mp = Math.min(t.maxmp, t.mp + it.mp); ev.push({ k: 'mana', u: t.uid, amt: it.mp }); }
      else return null;
      pool.splice(ix, 1); ev.push({ k: 'item', u: u.uid, item: cmd.item }); u.acted = u.done = true; break;
    }
    case 'retreat': {
      if (u.kind !== 'knight') return null; if (u.ruler) return null;
      u.gone = 'fled'; const tr = S.sides[u.side].troops[u.troop]; tr.retreated = true;
      for (const m of S.units) if (m.side === u.side && m.troop === u.troop && m.alive && !m.gone) m.gone = 'fled';
      ev.push({ k: 'retreat', u: u.uid }); B.checkOver(S, ev); break;
    }
    default: return null;
  }
  return ev;
};
B.doSkill = (S, u, sk, cmd, ev) => {
  const pos = [u.c, u.r], tgtU = cmd.target !== undefined ? S.units[cmd.target] : null, hexT = cmd.hex || (tgtU ? [tgtU.c, tgtU.r] : null);
  const inR = h => { const d = H.dist(pos, h); return d >= sk.range[0] && d <= sk.range[1]; };
  const hits = [];
  switch (sk.kind) {
    case 'aoe': {
      let centre = pos;
      if (sk.target === 'hex') { if (!hexT || !inR(hexT)) return false; centre = hexT; }
      const foes = B.live(S).filter(t => t.side !== u.side && H.dist(centre, [t.c, t.r]) <= sk.radius);
      if (!foes.length) return false;
      const ak = sk.base === 'bolt' ? 'magic' : sk.base === 'volley' ? 'ranged' : 'melee';
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: centre, el: u.el });
      for (const t of foes) {
        const dm = B.damage(S, u, t, sk.power, ak, sk.el !== undefined ? { el: sk.el } : {}); t.hp -= dm; u.dmgDone += dm; gain(u, Math.round(dm * .45 * G.tune.expMul)); ev.push({ k: 'hit', a: u.uid, d: t.uid, akind: ak, miss: false, dmg: dm, skill: sk.id }); hits.push(t);
      }
      for (const t of hits) if (t.hp <= 0 && t.alive) B.fall(S, t, u, ev);
      return true;
    }
    case 'root': case 'debuff': {
      if (!tgtU || tgtU.side === u.side || !tgtU.alive || tgtU.gone || !inR([tgtU.c, tgtU.r])) return false;
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: [tgtU.c, tgtU.r], el: u.el });
      if (sk.kind === 'root') { tgtU.fx.root = 3; ev.push({ k: 'fx', u: tgtU.uid, fx: 'root' }); const dm = B.damage(S, u, tgtU, sk.power, 'ranged'); tgtU.hp -= dm; ev.push({ k: 'hit', a: u.uid, d: tgtU.uid, akind: 'ranged', miss: false, dmg: dm, skill: sk.id }); if (tgtU.hp <= 0) B.fall(S, tgtU, u, ev); }
      else { tgtU.fx.defDown = 4; ev.push({ k: 'fx', u: tgtU.uid, fx: 'defDown' }); }
      return true;
    }
    case 'heal': {
      if (!tgtU || tgtU.side !== u.side || !tgtU.alive || tgtU.gone || !inR([tgtU.c, tgtU.r])) return false;
      const amt = Math.min(tgtU.maxhp - tgtU.hp, Math.round(u.int * sk.power + 6)); if (amt <= 0) return false;
      tgtU.hp += amt; ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: [tgtU.c, tgtU.r], el: u.el }); ev.push({ k: 'heal', u: tgtU.uid, by: u.uid, amt }); return true;
    }
    case 'buff': {
      const grp = B.live(S, u.side).filter(t => t.troop === u.troop && (sk.target !== 'monsters' || t.kind === 'mon'));
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: pos, el: u.el });
      for (const t of grp) { t.fx[sk.fx] = 4; ev.push({ k: 'fx', u: t.uid, fx: sk.fx }); }
      return true;
    }
    case 'daze': {
      const foes = B.live(S).filter(t => t.side !== u.side && H.dist(pos, [t.c, t.r]) === 1); if (!foes.length) return false;
      ev.push({ k: 'cast', a: u.uid, skill: sk.id, hex: pos, el: u.el });
      for (const t of foes) { t.fx.daze = 2; ev.push({ k: 'fx', u: t.uid, fx: 'daze' }); }
      return true;
    }
  }
  return false;
};
/* ---- results ---- */
B.result = S => {
  const per = S.units.map(u => ({ id: u.id, ref: u.ref, side: u.side, hp: u.hp, alive: u.alive, gone: u.gone, xp: u.xp, kills: u.kills, captured: !!u.captured, lvl: u.lvl, name: u.name, dmgDone: u.dmgDone }));
  return { winner: S.winner, reason: S.reason, bell: S.bell, units: per };
};
