/* =====================================================================================
 * 26-sim-monsters: minds. Asleep, idle and patrolling until they see or hear the party; then they hunt it by A* (full
 * cells are walked round, so they flank on their own), wind up every blow where you can see it (a step away makes it miss),
 * wait a moment after you move before winding up again, shoot down lines, keep away, steal and flee
 * ===================================================================================== */
const ATK = { rat: 'bite', leech: 'lunge', latchkin: 'stab', ooze: 'slam', ratknot: 'bites', snick: 'blade', skeleton: 'hammer', rustling: 'claws', spider: 'bite',
  sentinel: 'blow', hound: 'jaws', seer: 'staff', warden: 'halberd', gazer: 'bite', golem: 'fist', boltholder: 'slam' };
/** is the monster in a clear straight line with the party, within n cells */
function inLine(m, n) {
  const P = S.party, d = dirTo(m.cx, m.cy, P.cx, P.cy); if (d < 0) return false;
  const dist = manhattan(m.cx, m.cy, P.cx, P.cy); if (dist > n) return false;
  let x = m.cx, y = m.cy;
  for (let k = 1; k < dist; k++) { x += DX[d]; y += DY[d]; if (B.opaque(S.floor, x, y)) return false; const dd = doorAt(x, y); if (dd && !doorPass(dd)) return false; if (monsAt(x, y).length && B.MON(m.type).bolt) return false; }
  return true;
}
B.inLine = inLine;
const slowK = m => m.status.slow > 0 ? 1.5 : 1;
function monsStep(dt) {
  const fl = FL(), P = S.party;
  let engaged = false;
  for (let i = fl.mons.length - 1; i >= 0; i--) {
    const m = fl.mons[i];
    if (m.hp <= 0) { m.dead += dt; if (m.dead > 3) fl.mons.splice(i, 1); continue; }
    if (m.type === 'boltholder') continue;
    m.flash = Math.max(0, m.flash - dt); m.glide = Math.max(0, m.glide - dt / Math.max(.2, B.MON(m.type).move * slowK(m)));
    for (const k of ['sleep', 'held', 'slow', 'turned']) if (m.status[k] > 0) { m.status[k] -= dt; if (m.status[k] <= 0) { delete m.status[k]; if (k === 'sleep') ev('wake', { uid: m.uid }); } }
    if (B.CHEATS.freeze) continue;
    const T = B.MON(m.type);
    if (m.st === 'asleep' || m.status.sleep > 0 || m.status.held > 0) { m.wind = 0; m.gaze = 0; continue; }
    const dist = manhattan(m.cx, m.cy, P.cx, P.cy), sees = B.partyFov().has(key(m.cx, m.cy)), sight = T.sight * B.T.sight / 5;
    if (!m.aware) {
      if ((sees && dist <= sight) || (T.keen && dist <= 6)) { m.aware = true; m.lost = 0; m.st = 'hunt'; if (m.sightBark) { bark(m.sightBark); m.sightBark = null; } ev('alert', { uid: m.uid, type: m.type }); }
    } else if (sees || dist <= 2) m.lost = 0;
    else if ((m.lost += dt) > 12) { m.aware = false; m.st = m.patrol ? 'patrol' : 'idle'; }
    const k = dt / slowK(m);
    m.atkT -= k; m.re -= dt; m.mt -= dt; m.boltT -= k; m.holdT -= k; m.gazeT -= k; if (m.flee > 0) m.flee -= dt;
    if (m.wind > 0) { engaged = true; m.wind -= dt; if (m.wind <= 0) resolveBlow(m); continue; }
    if (m.gaze > 0) { engaged = true; m.gaze -= dt; if (m.gaze <= 0) resolveGaze(m); continue; }
    if (!m.aware) { wander(m); continue; }
    if (m.status.turned > 0 || m.flee > 0) { if (m.mt <= 0) moveAway(m); continue; }
    if (dist <= 6) engaged = true;
    const reach = T.reach && inLine(m, T.reach) && dist === 2 && !doorBetween(m);
    if (dist === 1 || reach) {
      m.dir = dirTo(m.cx, m.cy, P.cx, P.cy);
      if (m.atkT <= 0 && m.re <= 0 && !(P.tw && P.tw.k === 'step' && P.tw.t < P.tw.dur * .5)) { m.wind = B.T.windup * (T.heavy ? 1.6 : 1); m.windK = reach ? 'reach' : 'melee'; ev('wind', { uid: m.uid, type: m.type }); }
      continue;
    }
    if (T.bolt && m.boltT <= 0 && inLine(m, T.bolt.range)) { m.boltT = T.bolt.every; m.zap = .5; m.dir = dirTo(m.cx, m.cy, P.cx, P.cy); B.launch({ team: 'mon', kind: 'mbolt', x: m.cx, y: m.cy, dir: m.dir, range: T.bolt.range + 1, speed: 5, dmg: T.bolt.dmg, by: m.uid }); say('m_bolt', null, { rate: 3 }); ev('cast', { uid: m.uid, kind: 'bolt' }); continue; }
    if (T.hold && m.holdT <= 0 && sees && dist <= 6) { m.holdT = T.hold.every; m.zap = .5; seerHold(m, T); }
    if (T.gaze && m.gazeT <= 0 && inLine(m, T.gaze.range)) { m.gaze = .6; m.gazeT = T.gaze.every; m.dir = dirTo(m.cx, m.cy, P.cx, P.cy); ev('gazeWind', { uid: m.uid }); continue; }
    if (T.mind === 'keepAway') {
      if (dist < T.keep) { if (m.mt <= 0) moveAway(m); continue; }
      if (inLine(m, T.keep + 3) && dist <= T.keep + 3) { m.dir = dirTo(m.cx, m.cy, P.cx, P.cy); continue; }
    }
    if (m.mt <= 0) moveToward(m, P.cx, P.cy);
  }
  return engaged;
}
B.monsStep = monsStep;
const doorBetween = m => { const P = S.party, d = dirTo(m.cx, m.cy, P.cx, P.cy); if (d < 0) return true; const x = m.cx + DX[d], y = m.cy + DY[d]; return B.opaque(S.floor, x, y) || monsAt(x, y).length > 0; };
/** a monster steps one cell along its A* path toward (tx, ty) */
function moveToward(m, tx, ty) {
  const X = IX(), P = S.party;
  const path = X.grid.path([m.cx, m.cy], [tx, ty], { blocked: (x, y) => !(x === tx && y === ty) && !B.monCan(m, x, y), ends: true, max: 60 });
  if (path.length < 2) { m.mt = .5; return false; }
  const [nx, ny] = path[1];
  if ((nx === P.cx && ny === P.cy) || !B.monCan(m, nx, ny)) { m.mt = .3; return false; }
  stepMon(m, nx, ny); return true;
}
B.moveToward = moveToward;
function stepMon(m, nx, ny) {
  const T = B.MON(m.type);
  m.gx = m.cx; m.gy = m.cy; m.dir = dirTo(m.cx, m.cy, nx, ny); m.cx = nx; m.cy = ny; m.glide = 1; m.slot = freeSlot(FL(), nx, ny, T.size);
  m.mt = T.move * slowK(m); ev('monStep', { uid: m.uid });
}
function moveAway(m) {
  const P = S.party; let best = null, bd = manhattan(m.cx, m.cy, P.cx, P.cy);
  for (let d = 0; d < 4; d++) { const x = m.cx + DX[d], y = m.cy + DY[d]; if (!B.monCan(m, x, y)) continue; const dd = manhattan(x, y, P.cx, P.cy); if (dd > bd) { bd = dd; best = [x, y]; } }
  if (best) stepMon(m, best[0], best[1]); else m.mt = .5;
}
/** not aware: patrol between its points, or stay */
function wander(m) {
  if (!m.patrol || m.mt > 0) return;
  const [tx, ty] = m.patrol[m.pi];
  if (m.cx === tx && m.cy === ty) { m.pi = (m.pi + 1) % m.patrol.length; m.mt = 1; return; }
  if (!moveToward(m, tx, ty)) m.mt = 1;
  m.mt *= 1.6;
}
/** the wind-up is over: the blow lands only if the party is still within reach */
function resolveBlow(m) {
  const P = S.party, T = B.MON(m.type), dist = manhattan(m.cx, m.cy, P.cx, P.cy);
  m.atkT = T.int * B.T.monInt * slowK(m);
  const ok = m.windK === 'reach' ? inLine(m, 2) && dist <= 2 : dist === 1;
  if (!ok) { say('m_snap', { mon: T.short || T.name, atk: ATK[m.type] || 'blow' }, { rate: 2.5 }); ev('snap', { uid: m.uid }); return; }
  ev('strike', { uid: m.uid, type: m.type });
  const side = relSide(P.dir, P.cx, P.cy, m.cx, m.cy);
  for (const tm of pickTargets(side, T.bites || 1)) monHit(m, T, tm, side);
}
function monHit(m, T, tm, side) {
  const r = dice(1, 20, 0, 'ai');
  if (r === 1 || (r !== 20 && r + T.atk < memberDef(tm))) { tm.pop = { n: 'MISS', t: .7, c: '#a8b0c0' }; ev('monMiss', { m: S.party.members.indexOf(tm) }); return; }
  let dmg = Math.max(1, Math.round(dice(...T.dmg, 'ai') * B.T.monDmg * B.diff().monDmg));
  hurtMember(tm, dmg, { side, src: m.type });
  if (T.drain) m.hp = Math.min(m.max, m.hp + dmg);
  if (tm.state !== 'ok') return;
  if (T.poison && rnd('ai') < T.poison && !(B.RACES[tm.race].poison && rnd('ai') < B.RACES[tm.race].poison) && !save(tm, 'con')) { tm.status.poison = 60; say('m_poison', { name: tm.name }); ev('status', { m: S.party.members.indexOf(tm), k: 'poison' }); }
  if (T.rust && rnd('ai') < T.rust) { const w = tm.slots.main; if (w && IT(w.id).metal && IT(w.id).kind === 'weapon' && (w.rust || 0) < 2) { w.rust = (w.rust || 0) + 1; say('m_rust', { name: tm.name, item: IT(w.id).name }); ev('sfx', { id: 'rust' }); } }
  if (T.corrode) { const a = tm.slots.body; if (a && (a.corrode || 0) < 2 && rnd('ai') < .5) { a.corrode = (a.corrode || 0) + 1; say('m_corrode', { name: tm.name }); } }
  if (T.steal && rnd('ai') < T.steal) {
    const opts = tm.pack.map((it, i) => it && !IT(it.id).quest ? i : -1).filter(i => i >= 0);
    if (opts.length) { const i = opts[Math.floor(rnd('ai') * opts.length)]; const it = tm.pack[i]; tm.pack[i] = null; m.stole.push(it); m.flee = 6; say('m_steal', { item: B.art(B.itemName(it)) }); ev('steal', { uid: m.uid }); }
  }
}
/** a Gazer's spark gaze: it lands if the party is still in its line */
function resolveGaze(m) {
  const T = B.MON(m.type);
  if (!inLine(m, T.gaze.range)) { ev('snap', { uid: m.uid }); return; }
  const P = S.party, side = relSide(P.dir, P.cx, P.cy, m.cx, m.cy);
  ev('zap', { uid: m.uid }); m.zap = .3;
  for (const tm of pickTargets(side, 1)) hurtMember(tm, Math.round(dice(...T.gaze.dmg, 'ai') * B.T.monDmg * B.diff().monDmg), { side, src: 'gaze' });
}
/** a Seer's Hold on one member (a save, the Lidless Ward, Free Hinge, an elf's will) */
function seerHold(m, T) {
  const pool = alive().filter(x => !(x.status.held > 0)); if (!pool.length) return;
  const tm = pool[Math.floor(rnd('ai') * pool.length)];
  holdMember(tm, T.hold.secs);
}
function holdMember(tm, secs) {
  if (B.wears(tm, 'lidlessWard') || S.party.freeHinge > 0) { tm.pop = { n: 'FREE', t: .8, c: '#ffe8a0' }; return false; }
  if (B.RACES[tm.race].hold && rnd('ai') < B.RACES[tm.race].hold) { tm.pop = { n: 'RESIST', t: .8, c: '#a8e0ff' }; return false; }
  if (save(tm, 'wis')) { tm.pop = { n: 'SAVE', t: .8, c: '#a8e0ff' }; return false; }
  tm.status.held = secs; say('m_held', { name: tm.name }); ev('status', { m: S.party.members.indexOf(tm), k: 'held' }); return true;
}
B.holdMember = holdMember;
/** a wanderer group (a rest interrupted), 2 cells from the party, already aware */
function spawnWanderers() {
  const F = B.FLOORS[S.floor], fl = FL(), P = S.party;
  if (!F.wander || !F.wander.groups.length || fl.wander <= 0) return false;
  const [type, n] = pickR(F.wander.groups, 'world');
  // a cell about 2 away that a monster can stand in, else the floor's spawn points
  const cand = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = P.cx + dx, y = P.cy + dy; if (Math.abs(dx) + Math.abs(dy) === 2 && B.monCan({ type }, x, y) && IX().grid.path([x, y], [P.cx, P.cy], { blocked: (a, b) => !(a === P.cx && b === P.cy) && (wallAt(a, b) || (doorAt(a, b) && !doorPass(doorAt(a, b)))), ends: true }).length) cand.push([x, y]); }
  const at = cand.length ? pickR(cand, 'world') : pickR(F.wander.at, 'world');
  for (let k = 0; k < n; k++) { const m = spawnMon(fl, type, at[0], at[1], {}); m.aware = true; m.st = 'hunt'; m.re = 1; }
  fl.wander--;
  return true;
}
B.spawnWanderers = spawnWanderers;
/** any aware monster within r cells (camp refuses) */
B.enemiesNear = (r = 6) => FL().mons.some(m => m.hp > 0 && m.aware && m.st !== 'asleep' && !(m.status.sleep > 0) && manhattan(m.cx, m.cy, S.party.cx, S.party.cy) <= r) || (S.boss && S.boss.alive && S.boss.awake && S.floor === 'f4');
