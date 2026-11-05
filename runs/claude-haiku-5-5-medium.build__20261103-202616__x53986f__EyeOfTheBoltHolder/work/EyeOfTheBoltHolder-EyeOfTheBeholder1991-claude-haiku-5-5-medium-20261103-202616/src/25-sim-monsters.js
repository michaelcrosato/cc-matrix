/* ===== 25 sim · monsters: awareness, minds, movement, telegraphed attacks, ranged foes (PLAN §4.7) =====
 * A melee attack telegraphs: the wind-up is a visible beat; the blow lands only if the party is still beside the
 * monster when it ends, else it snaps on air. Each monster moves a cell at a time (its move seconds). */
/** the monster's sight in cells (the Sight slider scales each type's own) */
const monSight = m => B.MONS[m.type].sight * B.T.sight / 5;
/** the party's cell is in the monster's sight (a clear line within its sight, or the hearing of a hound) */
function canSee(m) {
  const p = S.party, dd = cheb(m.cx, m.cy, p.cx, p.cy);
  if (B.MONS[m.type].hears && dd <= B.MONS[m.type].hears) return true;
  if (dd > monSight(m) || p.hidden) return false;
  return los(m.cx, m.cy, p.cx, p.cy);
}
/** a noise: sleepers and idlers within the radius wake (combat, doors, levers, falls) */
function noise(x, y, r = 4) {
  for (const m of monsOn()) if (m.hp > 0 && cheb(m.cx, m.cy, x, y) <= (B.MONS[m.type].hears || r)) wakeMon(m);
}
function wakeMon(m) {
  if (m.state === 'asleep') { m.state = 'idle'; m.aware = true; ev('wake', { mon: m.id }); }
  if (!m.aware && m.state !== 'asleep') { m.aware = true; m.lastSeen = S.time; }
  if (m.named) wireFire('seen', m.named);
}
/** the relation of a monster to the party's facing: 0 ahead, 1 right, 2 behind, 3 left */
function sideOf(m) {
  const p = S.party, dx = m.cx - p.cx, dy = m.cy - p.cy;
  const d = dx === DX[p.dir] && dy === DY[p.dir] ? 0 : dx === -DX[p.dir] && dy === -DY[p.dir] ? 2 : (DX[(p.dir + 1) % 4] === dx && DY[(p.dir + 1) % 4] === dy) ? 1 : 3;
  return d;
}
/** who a monster's blow lands on: the front-most row from ahead, the side column from a side, the back-most row behind */
function blowTarget(m) {
  const side = sideOf(m), list = partyList().filter(([mm]) => mm.state === 'ok');
  if (!list.length) return null;
  let pool;
  if (side === 0) { const row = Math.min(...list.map(([, p]) => rowOf(p))); pool = list.filter(([, p]) => rowOf(p) === row); }
  else if (side === 2) { const row = Math.max(...list.map(([, p]) => rowOf(p))); pool = list.filter(([, p]) => rowOf(p) === row); }
  else { const col = side === 1 ? 1 : 0; pool = list.filter(([, p]) => p % 2 === col); if (!pool.length) pool = list; pool.sort((a, b) => rowOf(a[1]) - rowOf(b[1])); pool = pool.slice(0, 1); }
  return pool[B.rint(S, 'combat', pool.length)][0];
}
/** a monster is beside the party: one step (the four ways), or two in a line past a clear cell for a reach */
function inReach(m) {
  const p = S.party, d = manh(m.cx, m.cy, p.cx, p.cy);
  if (d === 1) return true;
  if (B.MONS[m.type].reach === 2 && d === 2 && (m.cx === p.cx || m.cy === p.cy)) { const mx = (m.cx + p.cx) / 2, my = (m.cy + p.cy) / 2; return !monAt(mx, my) && passable(mx, my, 'mon'); }
  return false;
}
/** the monsters' step: awareness, the minds, the wind-ups and the moves */
function monstersStep(dt) {
  for (const m of monsOn()) {
    if (m.hp <= 0) { m.deadT = (m.deadT || 0) + dt; continue; }
    if (m.status.held !== undefined) { m.status.held -= dt; if (m.status.held <= 0) delete m.status.held; }
    if (m.status.turned !== undefined) { m.status.turned -= dt; if (m.status.turned <= 0) delete m.status.turned; }
    if (m.status.sleep !== undefined) { m.status.sleep -= dt; if (m.status.sleep <= 0) { delete m.status.sleep; m.state = 'idle'; } }
    m.cool = Math.max(0, (m.cool || 0) - dt); m.moveT = Math.max(0, (m.moveT || 0) - dt);
    if (m.reT) m.reT = Math.max(0, m.reT - dt);
    // awareness: the party in sight wakes it; out of sight for 12 s, it forgets
    if (canSee(m)) { if (!m.aware && m.state !== 'asleep') { m.aware = true; } if (m.state === 'asleep' || m.state === 'idle' || m.state === 'patrol') { if (m.aware) wakeMon(m); } m.lastSeen = S.time; }
    else if (m.aware && S.time - m.lastSeen > 12 && m.state !== 'boss') { m.aware = false; if (m.state === 'hunt' || m.state === 'engage') m.state = m.patrol ? 'patrol' : 'idle'; }
    if (m.state === 'asleep' || m.status.held !== undefined) continue;
    if (m.status.turned !== undefined) { fleeFrom(m, dt); continue; }
    if (m.state === 'flee') { m.flee -= dt; fleeFrom(m, dt); if (m.flee <= 0) m.state = 'hunt'; continue; }
    if (m.state === 'boss') continue;
    if (!m.aware) { patrolStep(m, dt); continue; }
    mind(m, dt);
  }
}
/** a patrolling or idle monster walks its cells, then waits */
function patrolStep(m, dt) {
  if (m.state === 'asleep') return;
  if (!m.patrol || !m.patrol.length) return;
  if (m.moveT > 0) return;
  const [tx, ty] = m.patrol[m.pi % m.patrol.length];
  if (m.cx === tx && m.cy === ty) { m.pi = (m.pi + 1) % m.patrol.length; m.moveT = 1; return; }
  const st = bfsStep(m, tx, ty); if (st) moveMon(m, st[0], st[1]);
}
/** the mind of an aware monster: melee hunters, keep-away casters, ranged gazers */
function mind(m, dt) {
  const def = B.MONS[m.type], p = S.party, dd = manh(m.cx, m.cy, p.cx, p.cy);
  if (def.mind === 'ranged') return mindRanged(m, dt);
  if (def.mind === 'keepAway') return mindKeepAway(m, dt);
  m.state = inReach(m) ? 'engage' : 'hunt';
  if (inReach(m)) {
    if (m.reT > 0) return;
    if (m.wind > 0) {
      m.wind -= dt;
      if (m.wind <= 0) {
        m.wind = 0;
        if (inReach(m) && awake().length) { const tgt = blowTarget(m); ev('strike', { mon: m.id, at: [m.cx, m.cy] }); if (tgt) monsterHits(m, tgt); }
        else ev('snap', { mon: m.id });
        m.cool = def.int * B.T.monInt;
      }
      return;
    }
    if (m.cool > 0) return;
    m.wind = def.windup !== undefined ? def.windup : B.T.windup; ev('wind', { mon: m.id, at: [m.cx, m.cy], secs: m.wind, side: sideOf(m) }); sfx('wind');
    return;
  }
  m.wind = 0;
  if (dd === 2 && !m.reT) m.reT = 0;
  if (m.moveT > 0) return;
  const st = bfsStep(m, p.cx, p.cy);
  if (st && !(st[0] === p.cx && st[1] === p.cy)) { moveMon(m, st[0], st[1]); if (manh(m.cx, m.cy, p.cx, p.cy) === 1) m.reT = B.T.reengage; }
}
/** a Gloam Seer keeps three cells off, bolts down the line, and holds one member now and then */
function mindKeepAway(m, dt) {
  const def = B.MONS[m.type], p = S.party, dd = cheb(m.cx, m.cy, p.cx, p.cy);
  m.bolt = (m.bolt || 0) - dt; m.holdT = (m.holdT || 0) - dt;
  const inLine = (m.cx === p.cx || m.cy === p.cy) && dd <= 6 && los(m.cx, m.cy, p.cx, p.cy);
  if (inLine && m.bolt <= 0) { m.bolt = def.bolt.every; const dir = m.cx === p.cx ? (m.cy > p.cy ? 2 : 0) : (m.cx > p.cx ? 3 : 1); S.proj.push({ k: 'mbolt', cx: m.cx, cy: m.cy, dir, left: 6, t: 0, speed: 5, dmg: def.bolt.dmg, by: -1 }); sfx('bolt'); ev('cast', { mon: m.id, kind: 'bolt' }); return; }
  if (inLine && m.holdT <= 0 && m.holdT !== undefined) { m.holdT = def.holdEvery; holdMember(); return; }
  if (m.holdT === undefined || m.holdT === null) m.holdT = def.holdEvery;
  if (dd <= 2 && m.moveT <= 0) { const dirs = [0, 1, 2, 3].map(d => [m.cx + DX[d], m.cy + DY[d]]).filter(([x, y]) => monCanEnter(m, x, y) && cheb(x, y, p.cx, p.cy) > dd); if (dirs.length) { const [x, y] = dirs[B.rint(S, 'ai', dirs.length)]; moveMon(m, x, y); } return; }
  if (dd > 3 && m.moveT <= 0) { const st = bfsStep(m, p.cx, p.cy); if (st) moveMon(m, st[0], st[1]); }
}
/** a Gazer hovers, and its gaze falls on the front when in line within three cells */
function mindRanged(m, dt) {
  const def = B.MONS[m.type], p = S.party, dd = cheb(m.cx, m.cy, p.cx, p.cy);
  m.gaze = (m.gaze || 0) - dt;
  const inLine = (m.cx === p.cx || m.cy === p.cy) && dd <= def.gaze.range && los(m.cx, m.cy, p.cx, p.cy);
  if (inLine) { if (m.gaze <= 0) { m.gaze = def.gaze.every; ev('gaze', { mon: m.id }); sfx('gaze'); const front = partyList().filter(([mm, pl]) => rowOf(pl) === 0 && mm.state === 'ok').map(x => x[0]); const tgt = front[B.rint(S, 'combat', front.length || 1)]; if (tgt) hurtMember(tgt, B.roll(S, 'combat', def.gaze.dmg) * B.T.monDmg, 'gaze'); } return; }
  if (m.moveT > 0) return;
  if (dd > 4) { const st = bfsStep(m, p.cx, p.cy); if (st) moveMon(m, st[0], st[1]); }
  else if (dd < 3) { const dirs = [0, 1, 2, 3].map(d => [m.cx + DX[d], m.cy + DY[d]]).filter(([x, y]) => monCanEnter(m, x, y)); if (dirs.length) { const [x, y] = dirs[B.rint(S, 'ai', dirs.length)]; moveMon(m, x, y); } }
}
/** a Seer's hold: one member saves against it (the Lidless Ward and Free Hinge stop it) */
function holdMember() {
  const list = partyList().map(x => x[0]).filter(mm => mm.state === 'ok' && !mm.status.held);
  if (!list.length) return;
  const m = list[B.rint(S, 'combat', list.length)];
  if (m.slots.neck && B.ITEMS[m.slots.neck.id].ward === 'hold') { msg('The Lidless Ward holds the gaze off.'); return; }
  if (S.party.freeHinge > 0) return;
  if (B.rnd(S, 'combat') < .25 + .05 * m.lvl) return;
  m.status.held = 6; msg(m.name + "'s joints lock!"); sfx('hold'); ev('held', { m: rosterOf(m) });
}
/** a fleeing monster (a Latchkin with its spoils, or one turned) runs from the party */
function fleeFrom(m, dt) {
  if (m.moveT > 0) return; const p = S.party;
  const dirs = [0, 1, 2, 3].map(d => [m.cx + DX[d], m.cy + DY[d]]).filter(([x, y]) => monCanEnter(m, x, y)).sort((a, b) => cheb(b[0], b[1], p.cx, p.cy) - cheb(a[0], a[1], p.cx, p.cy));
  if (dirs.length && cheb(dirs[0][0], dirs[0][1], p.cx, p.cy) > cheb(m.cx, m.cy, p.cx, p.cy)) moveMon(m, dirs[0][0], dirs[0][1]);
}
/** a monster moves one cell: its glide is the view's; the move's time is its own */
function moveMon(m, x, y) {
  const fx = m.cx, fy = m.cy; m.cx = x; m.cy = y; m.moveT = B.MONS[m.type].mv * (m.status.slow ? 1.5 : 1);
  ev('mmove', { mon: m.id, from: [fx, fy], to: [x, y], dur: B.MONS[m.type].mv });
  if (cellOf(x, y) === 'O' || cellOf(x, y) === 'o') { if (!B.MONS[m.type].flies) { hurtMon(m, 999, null, 'pit'); } }
}
/** a monster takes damage by other means (a pit): the same death rules */
function hurtMon(m, dmg, by, how) { m.hp -= dmg; if (m.hp <= 0) monsterDied(m, by); }
/** the party's flank: the monsters' alert on the party's step */
function onPartyMoved() { for (const m of monsOn()) if (m.hp > 0 && m.aware && manh(m.cx, m.cy, S.party.cx, S.party.cy) === 1 && m.reT === undefined) m.reT = B.T.reengage; }
/** the wanderers: a group that comes in at rest (2 cells away, aware), while the floor's budget lasts */
function spawnWanderer(rnd) {
  const d = curF(), f = curFS(); if (!d.wanderers || f.wand <= 0) return false;
  const spot = d.wanderers.spawn[B.rint(S, 'world', d.wanderers.spawn.length)];
  const [kind, n] = d.wanderers.kinds[B.rint(S, 'world', d.wanderers.kinds.length)];
  for (let i = 0; i < n; i++) { const m = mkMon(kind, spot[0], spot[1], S.floor, {}); m.aware = true; m.state = 'hunt'; monsOn().push(m); }
  f.wand--; ev('wanderers', { kind, n, at: spot });
  return true;
}
