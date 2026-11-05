/* =====================================================================================
 * 23-sim-party: the formation, stepping and turning (tweened; the cell changes as a step starts, arrival effects run as
 * it ends), stairs, pits, teleporters, spinners, dart traps, plates, hunger, regeneration and statuses
 * ===================================================================================== */
const MEM = i => S.party.members[i];
/** the member at a place (0-5: front 0 1, middle 2 3, back 4 5), or null */
const atPlace = p => { const i = S.party.form[p]; return i >= 0 ? S.party.members[i] : null; };
const placeOf = mi => S.party.form.indexOf(mi);
const rowOf = mi => Math.floor(placeOf(mi) / 2);
const colOf = mi => placeOf(mi) % 2;
B.atPlace = atPlace; B.placeOf = placeOf; B.rowOf = rowOf;
const up = m => m && m.state === 'ok';
const alive = () => S.party.members.filter(up);
B.alive = alive;
const canAct = m => up(m) && !(m.status.held > 0);
B.canAct = canAct;
/** the front-most row with anyone standing in it, its members */
function rowMembers(r) { return [0, 1].map(c => atPlace(r * 2 + c)).filter(up); }
B.rowMembers = rowMembers;
/** the party is in the middle of something (a step, a lock, a floor change, a talk, a moment) */
const partyBusy = () => { const P = S.party; return !!(P.tw || P.busy || S.transit || S.talk || S.moment || S.camp || S.over); };
B.partyBusy = partyBusy;

/** step one cell toward a map direction; false when blocked */
function tryStep(dir) {
  const P = S.party, nx = P.cx + DX[dir], ny = P.cy + DY[dir], X = IX();
  const st = X.stairAt[key(nx, ny)];
  if (st && st.sealed && !B.CHEATS.noclip) { bump(); say(st.sealed, null, { rate: 2 }); return false; }
  const mons = monsAt(nx, ny), boss = S.boss && S.boss.alive && S.floor === 'f4' && S.boss.cx === nx && S.boss.cy === ny;
  if (!B.partyCan(nx, ny) || ((mons.length || boss) && !B.CHEATS.noclip)) {
    bump();
    const d = doorAt(nx, ny);
    if (mons.length || boss) say('m_blocked', null, { rate: 2 });
    else if (d && d.kind === 'gate') say('m_gate', null, { rate: 2 });
    else if (d && FL().doors[d.id].locked && d.kind === 'lock') say('m_locked', null, { rate: 2 });
    else if (d && d.kind === 'seal') say('m_seal', null, { rate: 2 });
    else say('m_wall', null, { rate: 2 });
    return false;
  }
  const [stT] = B.stepTimes();
  P.tw = { fx: P.cx, fy: P.cy, fd: P.dir, k: 'step', t: 0, dur: stT, sd: dir };
  P.at = null; P.cx = nx; P.cy = ny; S.stats.steps++; P.lastCell = [P.tw.fx, P.tw.fy];
  for (const m of FL().mons) if (m.hp > 0 && manhattan(m.cx, m.cy, nx, ny) <= 2) m.re = B.T.reengage;
  ev('step', { x: nx, y: ny });
  const d = doorAt(nx, ny);
  if (d && d.kind === 'illusion') { ev('illusion', { x: nx, y: ny }); say('m_illusion'); if (d.id === 'I1') { act(['secret', 'I1']); S.flags.I1 = true; } }
  look();
  if (!stT) finishTween();
  return true;
}
function bump() { S.party.bump = 1; ev('bump', {}); }
function turnBy(s) {
  const P = S.party, [, tT] = B.stepTimes();
  P.tw = { fx: P.cx, fy: P.cy, fd: P.dir, k: 'turn', t: 0, dur: tT };
  P.dir = (P.dir + s + 4) % 4; ev('turn', {});
  if (!tT) finishTween();
  return true;
}
B.tryStep = tryStep; B.turnBy = turnBy;
function finishTween() { const P = S.party, k = P.tw && P.tw.k; P.tw = null; if (k === 'step') arrive(); }
/** the step's end: what is here happens */
function arrive() {
  const P = S.party, X = IX(), fl = FL(), k = key(P.cx, P.cy);
  P.at = [P.cx, P.cy]; look();
  const st = X.stairAt[k];
  if (st && !st.sealed) { if (st.finish) { B.raceFinish(); return; } S.transit = { k: st.ladder ? 'ladder' : 'stairs', t: 0, to: st.to, at: st.at, swapped: false, dur: 2.4 }; if (st.ladder) say('m_ladder'); ev('stairs', { to: st.to }); return; }
  const pit = X.pitAt[k];
  if (pit && !fl.pits[pit.id].bridged && !B.CHEATS.noclip) {
    if (P.floating > 0) say('m_float', null, { rate: 3 });
    else { if (pit.trapdoor && !fl.pits[pit.id].open) { fl.pits[pit.id].open = true; ev('trapdoor', { x: P.cx, y: P.cy }); } fall(); return; }
  }
  const tp = X.tpAt[k];
  if (tp && fl.tps[tp.id]) { teleport(tp); return; }
  if (X.spin[k]) { P.dir = rint(0, 3, 'world'); ev('spin', {}); say('m_twist'); fl.spinSeen = true; }
  const tr = X.trapAt[k];
  if (tr && fl.traps[tr.id]) darts();
  afterArrive();
}
function afterArrive() {
  const P = S.party, its = B.itemsAt(P.cx, P.cy);
  if (its.length) { const names = its.slice(-3).map(i => B.art(B.itemName(i))); say(names.length > 1 ? 'm_lie' : 'm_lies', { items: B.cap(andList(names)) }, { rate: 1 }); }
  trigger('enter', { x: P.cx, y: P.cy });
  glintAhead();
}
/** a thief (or eyes that see seams) notices a trap or trapdoor ahead */
function glintAhead() {
  const P = S.party, [fx, fy] = B.front(), X = IX(), fl = FL();
  const seer = alive().find(m => m.cls === 'T') || (P.seeing > 0 || B.wearsSeeing() ? alive()[0] : null); if (!seer) return;
  const tr = X.trapAt[key(fx, fy)], pit = X.pitAt[key(fx, fy)];
  const k = tr && fl.traps[tr.id] ? 'g' + tr.id : pit && pit.trapdoor && !fl.pits[pit.id].open && !fl.pits[pit.id].bridged ? 'g' + pit.id : null;
  if (k && !fl.flags[k]) { fl.flags[k] = true; say('m_glint', { name: seer.name }); ev('glint', { x: fx, y: fy }); }
}
B.glintAhead = glintAhead;
function teleport(tp) {
  const P = S.party, fl = FL();
  P.cx = tp.to[0]; P.cy = tp.to[1]; P.dir = tp.to[2]; P.at = [P.cx, P.cy]; P.tw = null;
  ev('teleport', { silent: !!tp.silent });
  fl.tpUsed[tp.id] = true;
  if (tp.loops) { fl.loops++; for (const [n, id] of tp.loops) if (fl.loops === n) { if (B.BARKS[id]) bark(id); else say(id); } }
  look(); afterArrive();
}
function fall() {
  const F = B.FLOORS[S.floor];
  if (!F.fall) return;
  say('m_fall'); ev('fall', {});
  S.transit = { k: 'fall', t: 0, to: F.fall.to, at: F.fall.at, swapped: false, dur: 2.0, hurt: true };
}
B.fall = fall;
function darts() {
  say('m_darts'); ev('sfx', { id: 'darts' });
  const pool = alive().slice();
  for (let n = 0; n < 2 && pool.length; n++) { const m = pool.splice(Math.floor(rnd('world') * pool.length), 1)[0]; B.hurtMember(m, Math.max(1, Math.round(dice(1, 4, 0, 'world') * B.T.trapDmg)), { src: 'trap' }); }
}
B.darts = darts;
/** change floors: the party arrives at a cell of another floor */
function goFloor(to, at) {
  const P = S.party;
  if (!S.floors[to]) initFloor(to);
  const from = S.floor;
  S.floor = to; P.cx = at[0]; P.cy = at[1]; P.dir = at[2]; P.at = [P.cx, P.cy]; P.tw = null; P.queued = null; S.proj = []; B._fovKey = null;
  const first = !FL().visited; FL().visited = true; look();
  ev('floor', { from, to, first });
  trigger('enter', { x: P.cx, y: P.cy });
}
B.goFloor = goFloor;
/** a floor change in progress (stairs: fade, the floor's card, fade; a fall: drop, land, hurt) */
function transitStep(dt) {
  const T = S.transit; T.t += dt;
  const swapAt = T.k === 'fall' ? .55 : .4;
  if (!T.swapped && T.t >= swapAt) {
    T.swapped = true; goFloor(T.to, T.at);
    if (T.hurt) { for (const m of alive()) B.hurtMember(m, dice(1, 6, 0, 'world'), { src: 'fall' }); say('m_pitfall'); ev('land', {}); }
    ev('arrived', { floor: T.to });
  }
  if (T.t >= T.dur) S.transit = null;
}
B.skipCard = () => { const T = S.transit; if (T && T.swapped && T.k !== 'fall' && T.t < T.dur - .4) T.t = T.dur - .4; };

/* ---- plates: down while the party, any item, or a medium or large walking monster is on one ---- */
function platesStep() {
  const X = IX(), fl = FL(), P = S.party;
  for (const p of Object.values(X.plateAt)) {
    const k = key(p.x, p.y);
    const down = !!((P.at && P.at[0] === p.x && P.at[1] === p.y && !(P.floating > 0)) || (fl.items[k] && fl.items[k].length) ||
      fl.mons.some(m => m.hp > 0 && m.cx === p.x && m.cy === p.y && B.MON(m.type).size !== 'S' && !B.MON(m.type).fly));
    if (down !== fl.plates[p.id]) {
      if (p.mode === 'latch' && !down && fl.plates[p.id]) continue;   // (a latch stays down)
      fl.plates[p.id] = down; fl.plateSeen[p.id] = true; ev('plate', { id: p.id, down }); trigger('plate', { id: p.id, down });
    }
  }
}
B.platesStep = platesStep;
/* ---- doors move toward what they were told; a door crossing half-open changes what can be seen ---- */
function doorsStep(dt) {
  const X = IX(), fl = FL();
  for (const d of Object.values(X.doors)) {
    if (d.kind === 'illusion') continue;
    const st = fl.doors[d.id], was = st.open, sp = d.kind === 'gate' ? 1 / .9 : d.kind === 'secret' ? 1 / 1.2 : d.kind === 'undergate' ? 1 / 3 : 1 / .5;
    st.open = E.approach(st.open, st.want, sp * dt);
    if ((was < .5) !== (st.open < .5)) { B.doorsV++; look(); }
  }
}
B.doorsStep = doorsStep;
/* ---- hunger, regeneration, statuses ---- */
function bodyStep(dt) {
  const P = S.party;
  for (const k of ['floating', 'seeing', 'steady', 'freeHinge']) if (P[k] > 0) { P[k] = Math.max(0, P[k] - dt); if (!P[k]) { if (k === 'seeing') say('m_seeExpire'); if (k === 'floating') { say('m_floatEnd'); const pit = pitOpen(P.cx, P.cy); if (pit && !P.tw) fall(); } } }
  const hungerK = B.T.hunger * B.diff().hunger * (B.CHEATS.noHunger || S.mode === 'race' || S.mode === 'demo' ? 0 : 1);
  for (const m of P.members) {
    for (const k of ['main', 'off']) m.cool[k] = Math.max(0, m.cool[k] - dt);
    const fx = m.fx; for (const k of ['hurt', 'heal', 'lvl', 'act', 'miss']) fx[k] = Math.max(0, fx[k] - dt);
    if (m.pop && (m.pop.t -= dt) <= 0) m.pop = null;
    if (m.state !== 'ok') continue;
    const s = m.status;
    if (s.poison > 0) { s.poison -= dt; s.ptick = (s.ptick || 6) - dt; if (s.ptick <= 0) { s.ptick = 6; B.hurtMember(m, 1, { src: 'poison', quiet: true }); } if (s.poison <= 0) { delete s.poison; delete s.ptick; } }
    for (const k of ['held', 'brace']) if (s[k] > 0) { s[k] -= dt; if (s[k] <= 0) delete s[k]; }
    if (hungerK > 0) {
      const was = m.food; m.food = Math.max(0, m.food - dt / 60 * hungerK);
      if (was > 25 && m.food <= 25) say('m_hungry', { name: m.name });
      if (was > 0 && m.food <= 0) say('m_starving', { name: m.name }, { c: '#ff8a6a' });
      if (m.food <= 0) { m.starveT += dt; if (m.starveT >= 30) { m.starveT = 0; B.hurtMember(m, 1, { src: 'hunger', quiet: true }); } }
    }
    if (B.wears(m, 'ringOfMending')) { m.regenT += dt; if (m.regenT >= 30) { m.regenT = 0; if (m.hp < m.max) m.hp++; } }
  }
}
B.bodyStep = bodyStep;
B.wears = (m, id) => SLOT_NAMES.some(s => s !== 'main' && s !== 'off' && m.slots[s] && m.slots[s].id === id);
B.wearsSeeing = () => alive().some(m => m.slots.head && IT(m.slots.head.id).seeing);
/** seeing seams: Find Seams, the goggles, or the Show secrets cheat */
B.seeing = () => S.party.seeing > 0 || B.wearsSeeing() || B.CHEATS.secrets;
