// THE BATTLE AI: pure functions from a BattleSim to commands. It serves CPU troops, Delegate (auto-resolve), the
// attract mode, the hub host for players who time out, and the playthrough bot. The same state always gives the same
// plan. Per unit, in troop order (casters and shooters who needn't move first, then monsters nearest the enemy, the
// knight last so its Ward covers the troop), it scores every reachable hex and every action and target from it.
// opts: { level: 'easy' | 'normal' | 'hard', showcase (prefer specials and spells: the attract mode) }

const HX = G.hex;
const AI = {};
G.BattleAI = AI;

/** the AI level of a side (the sim's side.ai, or normal) */
AI.levelOf = (sim, side) => (sim.s.sides[side] && sim.s.sides[side].ai) || 'normal';

/** the enemy threat: for each foe, the hexes it could strike next bell and what it would deal to a unit */
AI.threats = (sim, side) => {
  const s = sim.s, foes = sim.field().filter(e => e.side !== side);
  const key = s.bell + ':' + s.active + ':' + s.season + ':' + foes.map(e => e.id + '@' + e.cx + ',' + e.cy + (e.fx.haste ? 'h' : '') + (e.fx.chill ? 'c' : '')).join(';');
  sim._threatCache = sim._threatCache || {};
  if (sim._threatCache[side] && sim._threatCache[side].key === key) return sim._threatCache[side].list;
  const list = [], W = s.w, Hh = s.h;
  for (const e of foes) {
    const sk = sim.skillOf(e, 'attack'), r = sim.reach(e, sim.movOf(e)), depth = new Int16Array(W * Hh).fill(-1), q = [];
    for (const k in r) { const c = r[k].c, i = c[1] * W + c[0]; if (depth[i] < 0) { depth[i] = 0; q.push(i); } }
    // a multi-source walk out to the attack's reach: every hex within range of a hex it can stand on
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], d = depth[i]; if (d >= sk.range[1]) continue;
      const x = i % W, y = (i - x) / W;
      for (const n of HX.neighbours([x, y])) { if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= Hh) continue; const ni = n[1] * W + n[0]; if (depth[ni] < 0) { depth[ni] = d + 1; q.push(ni); } }
    }
    const cells = new Set(); for (const i of q) cells.add(Math.floor(i / W) * 1000 + i % W);
    list.push({ e, sk, cells });
  }
  sim._threatCache[side] = { key, list };
  return list;
};
/** expected damage foes could deal to unit u standing at h next bell */
AI.danger = (sim, u, h, threats) => {
  let d = 0; const k = h[1] * 1000 + h[0];
  for (const t of threats) {
    if (!sim.onField(t.e) || !t.cells.has(k)) continue;
    const f = sim._calc(t.e, u, t.sk, [t.e.cx, t.e.cy], 'attack');
    d += f.hit / 100 * (f.dmg[0] + f.dmg[1]) / 2;
  }
  return d;
};
const power = u => (u.mhp + 4 * (u.atk + u.def + u.int) + 2 * u.agi) * (1 + .05 * (u.level - 1)) * (u.kind === 'knight' ? 1.2 : 1) * Math.max(.2, u.hp / u.mhp);
AI.sidePower = (sim, side) => G.sum(sim.field().filter(u => u.side === side), power);

/** candidate target hexes for an action of u from c (fewer than targets(): units and the hexes round them) */
AI.candidates = (sim, u, a, sk, c) => {
  const rng = sim.rangeOf(u, sk, c), out = [], seen = new Set(), add = h => { const k = HX.key(h); if (!seen.has(k)) { seen.add(k); out.push(h); } };
  if (rng === 'self') {
    if (/cone|line/.test(sk.area)) { for (let d = 0; d < 6; d++) { const n = HX.step(c, d); if (sim.inside(n)) add(n); } }
    else add(c);
    return out;
  }
  if (rng === 'ward') { for (const o of sim.field()) if (o.troop === u.troop && o.kind === 'monster' && HX.dist([o.cx, o.cy], c) <= u.ward) add([o.cx, o.cy]); return out; }
  const wantFoe = sk.who === 'foes' || sk.who === 'all', wantAlly = !wantFoe;
  for (const o of sim.field()) {
    const isFoe = sim.foes(u, o); if ((wantFoe && !isFoe) || (wantAlly && isFoe)) continue;
    const oc = o.id === u.id ? c : [o.cx, o.cy];
    if (sk.area === 'single') { const d = HX.dist(oc, c); if (d >= rng[0] && d <= rng[1]) add(oc); continue; }
    for (const h of [oc].concat(sk.area === 'r2' || sk.area === 'r1' ? HX.neighbours(oc) : [])) { if (!sim.inside(h)) continue; const d = HX.dist(h, c); if (d >= rng[0] && d <= rng[1]) add(h); }
  }
  return out;
};

/** score one action of u from c at h: the value of what it does (danger and position are added by the caller) */
AI.actionValue = (sim, u, a, sk, c, h, o) => {
  const fs = sim.affected(u, a, h, c).map(t => [t, sim._calc(u, t, sk, c, a)]);
  if (!fs.length) return null;
  let v = 0, useful = false;
  for (const [t, f] of fs) {
    const foe = sim.foes(u, t);
    if (f.dmg[1] > 0) {
      const exp = f.hit / 100 * Math.min(t.hp, (f.dmg[0] + f.dmg[1]) / 2);
      if (foe) {
        v += exp * (1 + (t.kind === 'knight' ? .5 : 0) + (t.ruler ? 1 : 0)) + f.ko / 100 * (t.ruler ? 110 : t.kind === 'knight' ? 70 : 30);
        if (o.level === 'hard' && t.hitBell === sim.s.bell) v += 15;
        if (t.ref === 'graynight' && sk.breaksTimeless) v += 60;
        useful = true;
      } else v -= 1.5 * exp * (t.ruler ? 3 : 1);
    }
    if (f.heal) { if (!foe) { v += 1.2 * f.heal * (t.kind === 'knight' ? 2 : 1); if (f.heal > 4) useful = true; } else v -= f.heal; }
    if (f.status && f.status[1] > 0) {
      const sv = { sleep: 18, stop: 22, chill: 8, burn: 8, poison: 9, weakened: 8, exposed: 7 }[f.status[0]] || 6;
      if (foe && !t.fx[f.status[0]]) { v += sv * f.status[1] / 100 * (t.kind === 'knight' ? 1.5 : 1); useful = true; }
      else if (!foe) v -= sv * f.status[1] / 100;
    }
    if (f.buff && !foe) { const fresh = f.buff.filter(b => !t.fx[b]).length; if (fresh) { v += 7 * fresh * (t.kind === 'knight' ? 1.3 : 1); useful = true; } }
    if (f.cleanse && !foe) { const bad = Object.keys(t.fx).filter(k => ['status', 'debuff'].includes(G.get('effect', k).kind)).length; v += bad * 10; if (bad) useful = true; }
    if (f.siphon && foe) { v += f.siphon * .8; useful = true; }
    if (f.mp && !foe) { const need = t.mmp - t.mp; v += Math.min(need, f.mp) * .6; if (need > 8) useful = true; }
  }
  if (!useful) return null;
  if (sk.mp) v -= sk.mp * .4;
  if (sk.kind === 'item') v -= 8;
  if (o.showcase && (sk.kind === 'spell' || sk.kind === 'special')) v += 12;
  return v;
};

/** the best plan for one unit: { move: [cx, cy] | null, act: { a, at } | 'guard' | 'wait' | 'retreat', score } */
AI.planUnit = (sim, u, o = {}) => {
  const s = sim.s, threats = AI.threats(sim, u.side), start = [u.cx, u.cy];
  const reach = u.moved ? { [HX.key(start)]: { c: start } } : sim.reach(u);
  const k = sim.knightOf(u), ruler = u.ruler, low = u.hp < u.mhp * .4;
  const keep = s.keep, role = s.sides[u.side].role, foes = sim.field().filter(e => sim.foes(e, u));
  const isRanged = u.basic.ranged || u.skills.some(id => { const sk = G.get('skill', id); return sk.kind === 'spell' && sk.p > 0; });
  const acts = sim.actions(u).map(x => x.a).filter(a => { const sk = sim.skillOf(u, a); return sk && !(sk.oncePerBattle && u.turningUsed) && !(sk.mp > u.mp) && !(sk.kind === 'item' && !(s.sides[u.side].items[sk.item] > 0)); });
  let best = null;
  const consider = (score, plan) => { if (!best || score > best.score + 1e-9) best = Object.assign({ score }, plan); };
  const all = [];
  for (const key of Object.keys(reach).sort()) {
    const c = reach[key].c, moving = !HX.eq(c, start), moveLen = moving ? (reach[key].path ? reach[key].path.length - 1 : 0) : u.moved;
    // where it ends: danger, ward, terrain, the objective
    let pos = 0;
    const dz = AI.danger(sim, u, c, threats), lateAtt = keep && s.mode === 'siege' && role === 'att' && s.bell >= s.bells - 3;
    pos -= dz * (ruler ? 3 : u.kind === 'knight' ? 1.5 : .6) * (low ? 2 : 1) * (lateAtt && !ruler ? .35 : 1);
    if (u.kind === 'monster' && k && sim.onField(k) && HX.dist(c, [k.cx, k.cy]) > k.ward) pos -= 12;
    pos += 10 * G.terrainDef(sim.code(c), u, sim._keepOwner(c), s.season);
    if (keep && s.mode === 'siege') {
      // the objective: attackers press toward the Keep from the first bell, harder as the bells run out; from bell 6 the
      // defenders' knights fall back to hold it
      const press = (.5 + .35 * s.bell) * (s.bell >= s.bells - 2 ? 2 : 1);
      if (role === 'att') pos -= press * HX.dist(c, keep) * (u.kind === 'knight' ? (ruler ? .6 : 1.4) : .7);
      else if (u.kind === 'knight' && s.bell >= 6) pos -= 2.5 * HX.dist(c, keep);
      if (role === 'att' && u.kind === 'knight' && !ruler && HX.eq(c, keep)) pos += 10 + s.bell * 3;
    }
    if (keep && s.mode === 'shrine') pos -= 1.5 * HX.dist(c, keep) * (u.kind === 'knight' ? .7 : 1);
    if (s.mode === 'sanctum') {
      const def = s.sides.findIndex(x => x.role === 'def');
      const dials = s.dials.filter(d => (u.side === def ? d.lit : !d.lit));
      if (dials.length && (u.side !== def || u.summoned)) { const dd = Math.min(...dials.map(d => HX.dist(c, d.c))); pos -= (u.side === def ? 4 : 5) * dd * (u.side !== def && u.kind === 'knight' && !ruler ? .5 : 1); if (dd === 0) pos += 25; }
      // the attackers close on the Gray Knight: the battle is won when he falls (harder once the Wheel has turned)
      const gk = u.side !== def && s.units && Object.values(s.units).find(x => x.ref === 'graynight' && sim.onField(x));
      if (gk) pos -= (s.wheelTurned ? 3 : 1.2) * HX.dist(c, [gk.cx, gk.cy]) * (ruler ? .4 : 1);
    }
    if (foes.length) {
      const nearest = Math.min(...foes.map(e => HX.dist(c, [e.cx, e.cy])));
      if (isRanged && u.kind !== 'knight') pos -= 1.5 * Math.abs(nearest - 3);
      else if (!ruler || o.level === 'hard') pos -= 1.2 * nearest * (ruler ? .5 : 1);
      else pos -= .4 * nearest;
    }
    if (moving && sim.code(c) === 'B') pos -= 15;
    // what it can do from there
    let actBest = null;
    for (const a of acts) {
      const sk = sim.skillOf(u, a);
      if (sk.kind === 'spell' && (moving || u.moved)) continue;
      if (sk.kind === 'special' && (moving || u.moved) && !sk.mobile) continue;
      if (sk.needMove && moveLen < sk.needMove) continue;
      if (sk.fliers && !u.flier) continue;
      if (sk.every) { const ev = u.boss && u.hp < u.mhp / 2 ? 2 : sk.every; if (s.bell % ev) continue; }
      for (const h of AI.candidates(sim, u, a, sk, c)) {
        const v = AI.actionValue(sim, u, a, sk, c, h, o); if (v === null) continue;
        if (!actBest || v > actBest.v + 1e-9) actBest = { v, a, at: h };
      }
    }
    const guardV = dz > 0 ? dz * .25 : 0;
    if (actBest) { consider(pos + actBest.v, { move: moving ? c : null, act: { a: actBest.a, at: actBest.at } }); all.push({ score: pos + actBest.v, move: moving ? c : null, act: { a: actBest.a, at: actBest.at } }); }
    consider(pos + guardV, { move: moving ? c : null, act: 'guard' }); all.push({ score: pos + guardV, move: moving ? c : null, act: 'guard' });
  }
  // a knight near death on a losing side may retreat (rulers never do)
  if (u.kind === 'knight' && !ruler && !u.boss && u.hp < u.mhp * .25 && s.mode !== 'shrine' && s.mode !== 'sanctum') {
    const mine = AI.sidePower(sim, u.side), theirs = G.sum(foes, power);
    if (mine < theirs) return { move: null, act: 'retreat', score: 0 };
  }
  if (o.level === 'easy' && all.length > 1) {
    all.sort((x, y) => y.score - x.score);
    const top = all.slice(0, 3), w = [3, 2, 1].slice(0, top.length), roll = G.hashStr(s.n + ':' + u.id) % G.sum(w);
    let acc = 0; for (let i = 0; i < top.length; i++) { acc += w[i]; if (roll < acc) return top[i]; }
  }
  return best || { move: null, act: 'wait', score: 0 };
};

/** which unit of the active troop acts next */
AI.nextUnit = (sim) => {
  const tr = sim.activeTroop(); if (!tr) return null;
  const left = tr.units.map(id => sim.unit(id)).filter(u => sim.onField(u) && !u.done);
  if (!left.length) return null;
  const moved = left.find(u => u.moved && !u.acted); if (moved) return moved;
  const foes = sim.field().filter(e => e.side !== tr.side);
  const near = u => foes.length ? Math.min(...foes.map(e => HX.dist([u.cx, u.cy], [e.cx, e.cy]))) : 99;
  const standing = u => { if (u.kind === 'knight') return false; for (const a of sim.actions(u)) if (a.ok && a.a !== 'attack' || (a.ok && u.basic.ranged)) { const sk = a.sk; if (sk.kind === 'spell' || sk.ranged) return true; } return false; };
  const order = left.slice().sort((a, b) => {
    const ka = a.kind === 'knight' ? 1 : 0, kb = b.kind === 'knight' ? 1 : 0; if (ka !== kb) return ka - kb;
    const sa = standing(a) ? 0 : 1, sb = standing(b) ? 0 : 1; if (sa !== sb) return sa - sb;
    return near(a) - near(b) || (a.id < b.id ? -1 : 1);
  });
  return order[0];
};

/** the next command for the active troop: a move, then the action; { t: 'end' } when the troop is finished */
AI.next = (sim, o = {}) => {
  const tr = sim.activeTroop(); if (!tr || sim.s.over) return null;
  const lv = o.level || AI.levelOf(sim, tr.side), opts = Object.assign({}, o, { level: lv });
  const u = AI.nextUnit(sim); if (!u) return { t: 'end' };
  let plan = sim._aiPlan && sim._aiPlan.u === u.id && sim._aiPlan.at === HX.key([u.cx, u.cy]) && sim._aiPlan.n === sim.s.n ? sim._aiPlan.plan : null;
  if (!plan) plan = AI.planUnit(sim, u, opts);
  if (plan.move && !u.moved && !HX.eq(plan.move, [u.cx, u.cy])) {
    const cmd = { t: 'move', u: u.id, to: plan.move };
    if (sim.legal(cmd)) { sim._aiPlan = { u: u.id, at: HX.key(plan.move), plan: Object.assign({}, plan, { move: null }), n: sim.s.n + 1 }; return cmd; }
  }
  sim._aiPlan = null;
  if (plan.act === 'guard') return { t: 'guard', u: u.id };
  if (plan.act === 'retreat') return { t: 'retreat', u: u.id };
  if (plan.act && plan.act.a) { const cmd = { t: 'act', u: u.id, a: plan.act.a, at: plan.act.at }; if (sim.legal(cmd)) return cmd; }
  return { t: 'wait', u: u.id };
};
/** apply AI commands until the active troop's turn ends; returns the events */
AI.playTroop = (sim, o = {}) => {
  const ev = [], tr = sim.s.active; let guard = 0;
  while (!sim.s.over && sim.s.active === tr && guard++ < 60) { const c = AI.next(sim, o); if (!c) break; const e = sim.apply(c); ev.push(...e); if (e.length && e[0].e === 'illegal') { ev.push(...sim.apply({ t: 'end' })); } }
  return ev;
};
/** Delegate: run the battle to its end with the AI on every side, synchronously; returns the events */
AI.resolve = (sim, o = {}) => {
  const ev = []; let guard = 0;
  while (!sim.s.over && guard++ < 4000) {
    const c = AI.next(sim, o); if (!c) break;
    const e = sim.apply(c); ev.push(...e);
    if (e.length && e[0].e === 'illegal') ev.push(...sim.apply({ t: 'end' }));
  }
  return ev;
};
