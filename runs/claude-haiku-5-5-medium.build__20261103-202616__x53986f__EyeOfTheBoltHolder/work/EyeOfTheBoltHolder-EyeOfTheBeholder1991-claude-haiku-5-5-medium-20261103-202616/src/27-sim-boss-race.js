/* ===== 27 sim · the Bolt-Holder (PLAN §4.7.4) and the Rat Run (PLAN §7.5, §10) =====
 * The Bolt-Holder: caged (×0.2 damage, the three Great Locks turned, two bolts each), unbolted (full damage, faster
 * attacks, a relock at half health), and wrath (under a quarter health: faster, and gazers summoned). Its attacks: chain
 * lightning along a line (telegraphed), a locking gaze, bolt rain on marked cells, and a cage slam when adjacent. */
const BOSS_CELL = [6, 3];
/** the boss's state, made when the floor begins (kept in the save) */
function bossState() {
  return S.boss || (S.boss = { phase: 1, locks: { GL1: { turned: false, busy: 0 }, GL2: { turned: false, busy: 0 }, GL3: { turned: false, busy: 0 } },
    bolts: 0, relock: null, attackT: 3.5, tele: null, teleT: 0, summonT: 12, summons: 0, drift: 4, driftT: 4, started: false, dead: false, halfDone: false, wrath: false });
}
/** the boss's damage factor: caged 0.2; unbolted 1; relocked 0.5; wrath full */
function bossDamageFactor() { const b = bossState(); if (b.phase === 1) return .2; if (b.relock) return .5; return 1; }
/** damage to the boss: the factor, and the Eye's HP */
function bossHit(mon, dmg, by, how) {
  const b = bossState(); if (b.dead) return;
  const d = Math.max(1, Math.round(dmg * bossDamageFactor()));
  mon.hp -= d; mon.aware = true; ev('hit', { mon: mon.id, dmg: d, at: [mon.cx, mon.cy], id: 'boltholder', from: by ? rosterOf(by) : -1, caged: b.phase === 1 });
  sfx('hit'); if (b.phase === 1) { msg('The cage takes the blow.'); }
  if (mon.hp <= mon.max * .5 && !b.halfDone) { b.halfDone = true; relockOne(); }
  if (mon.hp <= mon.max * .25 && !b.wrath) { b.wrath = true; b.phase = 3; ev('bossPhase', { phase: 3 }); }
  if (mon.hp <= 0) monsterDied(mon, by);
}
/** the Eye drinks the lightning: a heal of the given amount */
function bossHealBy(n) { const mon = monsOn().find(m => m.type === 'boltholder'); if (!mon || mon.hp <= 0) return; mon.hp = Math.min(mon.max, mon.hp + n); msg('The Bolt-Holder drinks the lightning!'); ev('heal', { boss: true, n }); }
/** a Great Lock turned: two bolts slide out; all three open the cage */
function turnLock(id) {
  const b = bossState(), lk = b.locks[id]; if (!lk || lk.turned) return { ok: false };
  if (b.relock === id) b.relock = null;
  lk.busy = 2; S.party.busyT = 2; sfx('lockTurn'); ev('lockTurn', { id });
  return { ok: true, busy: true };
}
/** the lock finishes its turn (in the update): the bolts draw back, the cage opens with the third */
function lockDone(id) {
  const b = bossState(), lk = b.locks[id]; lk.turned = true; lk.busy = 0; b.bolts += 2;
  ev('bolts', { n: b.bolts }); sfx('shriek'); msg('The Bolt-Holder shrieks!');
  if (Object.values(b.locks).every(l => l.turned) && b.phase === 1) { b.phase = 2; ev('bossPhase', { phase: 2 }); msg('The cage opens!'); }
}
/** at half health it relocks one lock at random: the damage it takes is halved until that lock is turned again */
function relockOne() {
  const b = bossState(), turned = Object.keys(b.locks).filter(k => b.locks[k].turned); if (!turned.length) return;
  const id = turned[B.rint(S, 'combat', turned.length)]; b.locks[id].turned = false; b.relock = id; b.bolts = Math.max(0, b.bolts - 2);
  msg('It wrenches a bolt home!'); ev('relock', { id });
}
/** the boss's update: its attacks' timers, the telegraphs that resolve, the summons in wrath */
function bossStep(dt) {
  const mon = monsOn().find(m => m.type === 'boltholder'); if (!mon || mon.hp <= 0 || S.floor !== 'f4') return;
  const b = bossState(); if (!b.started) return;
  // the locks turning
  for (const [id, lk] of Object.entries(b.locks)) if (lk.busy > 0) { lk.busy -= dt; if (lk.busy <= 0) lockDone(id); }
  // the drift: in phase two, a cell toward the flank, never into a pillar
  if (b.phase >= 2) { b.driftT -= dt; if (b.driftT <= 0) { b.driftT = 4; } }
  // a telegraph resolves
  if (b.tele) { b.tele.t -= dt; if (b.tele.t <= 0) { const t = b.tele; b.tele = null; resolveTele(t); } return; }
  b.attackT -= dt * (b.phase === 3 ? 1.4 : 1);
  const every = b.phase === 1 ? 3.5 : b.phase === 2 ? 2.8 : 2.2;
  if (b.attackT > 0) return;
  b.attackT = every;
  if (b.phase === 3) { b.summonT -= every; if (b.summonT <= 0) { b.summonT = 12; summonGazers(); } }
  pickAttack(mon);
}
/** the attack by position: chain lightning down a clear line, a gaze on a clear view, bolt rain otherwise (slam adjacent) */
function pickAttack(mon) {
  const p = S.party, d = manh(mon.cx, mon.cy, p.cx, p.cy);
  if (d === 1) { ev('bossTele', { kind: 'slam' }); S.boss.tele = { kind: 'slam', t: .4 }; return; }
  if ((mon.cx === p.cx || mon.cy === p.cy) && los(mon.cx, mon.cy, p.cx, p.cy)) { S.boss.tele = { kind: 'chain', t: .8 }; ev('bossTele', { kind: 'chain' }); sfx('charge'); return; }
  if (los(mon.cx, mon.cy, p.cx, p.cy)) { S.boss.tele = { kind: 'gaze', t: 1.0 }; ev('bossTele', { kind: 'gaze' }); sfx('gaze'); return; }
  const cells = [[p.cx, p.cy]]; for (const dd of [0, 1, 2, 3]) { const x = p.cx + DX[dd], y = p.cy + DY[dd]; if (passable(x, y, 'mon') && cells.length < 3) cells.push([x, y]); }
  S.boss.tele = { kind: 'rain', t: 1.5, cells }; ev('bossTele', { kind: 'rain', cells });
}
/** a telegraph lands: the chain, the gaze's hold, the rain on marked cells, the slam */
function resolveTele(t) {
  const p = S.party, list = partyList().map(x => x[0]).filter(m => m.state === 'ok');
  if (t.kind === 'chain') { const pool = list.slice(); for (let i = 0; i < 2 && pool.length; i++) { const m = pool.splice(B.rint(S, 'combat', pool.length), 1)[0]; hurtMember(m, B.roll(S, 'combat', '3d6'), 'chain'); } sfx('bolt'); ev('bolt', { kind: 'chain' }); }
  else if (t.kind === 'gaze') {
    const pool = list.filter(m => !(m.slots.neck && B.ITEMS[m.slots.neck.id].ward === 'hold') && S.party.freeHinge <= 0 && !m.status.held);
    const n = 1 + B.rint(S, 'combat', 2); for (let i = 0; i < n && pool.length; i++) { const m = pool.splice(B.rint(S, 'combat', pool.length), 1)[0]; m.status.held = 4; msg(m.name + ': your joints lock!'); ev('held', { m: rosterOf(m) }); }
  }
  else if (t.kind === 'rain') { if (t.cells.some(([x, y]) => x === p.cx && y === p.cy)) { const pool = list.slice(); for (let i = 0; i < 2 && pool.length; i++) { const m = pool.splice(B.rint(S, 'combat', pool.length), 1)[0]; hurtMember(m, B.roll(S, 'combat', '2d6'), 'rain'); } } ev('bolts', { rain: true }); sfx('slam'); }
  else if (t.kind === 'slam') { const mon = monsOn().find(m => m.type === 'boltholder'); if (mon && manh(mon.cx, mon.cy, p.cx, p.cy) === 1) { const tgt = blowTarget(mon) || list[0]; if (tgt) hurtMember(tgt, B.roll(S, 'combat', '2d8'), 'slam'); } }
}
function summonGazers() {
  const b = bossState(); const have = monsOn().filter(m => m.type === 'gazer' && m.hp > 0).length; if (have >= 4) return;
  for (const [x, y] of [[4, 1], [8, 1]]) { if (monsOn().filter(m => m.type === 'gazer' && m.hp > 0).length >= 4) break; const m = mkMon('gazer', x, y, S.floor, {}); m.aware = true; m.state = 'hunt'; monsOn().push(m); }
  ev('summon', {}); msg('Gazers open their eyes on the walls.'); b.summons++;
}
/** the Eye dies: the north lock becomes the Stair to the Light, and the cage's bolts fly off */
function bossDied(mon) {
  const b = bossState(); b.dead = true; ev('bossDead', {}); S.flags.eyeDead = true; S.won = false;
  S.floors.f4.flags.stairLight = true; msg('The Eye cracks from lid to lid, and its light goes out.');
  wireFire('killed', 'boss');
}
/* ---- the Rat Run ---- */
/** the race's state: the score's checkpoints, the crowns, the time, the label */
function raceState() { return S.race; }
/** a checkpoint: +100 once each (lever, room, key, door, plate); the label shows on the HUD */
function raceCheckpoint(label) {
  const r = S.race; if (!r || r.done) return;
  const cp = { 'Lever pulled': 'lever', 'Rat Room cleared': 'room', 'Key found': 'key', 'Door open': 'door', 'Plate pressed': 'plate' }[label];
  if (!cp || r.cps[cp]) return;
  r.cps[cp] = true; r.score += 100; r.label = label; ev('race', { label, score: r.score }); sfx('secret');
}
/** a monster killed in the race: +10 */
function raceKill() { const r = S.race; if (!r) return; r.kills++; r.score += 10; }
/** a crown picked up: +25 */
function raceCrown() { const r = S.race; if (!r) return; r.crowns++; r.score += 25; }
/** the exit: +500, the time; the race ends for this party */
function raceFinish() {
  const r = S.race; if (!r || r.done) return;
  r.done = true; r.time = Math.round(r.t * 100) / 100; r.score += 500; r.label = 'Escaped!'; ev('raceEnd', { time: r.time, score: r.score }); msg('You are out of the Rat Run!');
}
/** a new race: the premade party at level 2, the race floor, the crowns placed */
function newRace(o = {}) {
  newGame(Object.assign({ members: null, lvl: 2 }, o));
  S.floor = 'race'; const fd = B.FLOORS.race; S.party.cx = fd.start[0]; S.party.cy = fd.start[1]; S.party.dir = fd.start[2];
  S.race = { t: 0, score: 0, kills: 0, crowns: 0, label: 'Start', cps: {}, done: false, time: null };
  const f = curFS(); for (const [x, y] of fd.crowns) (f.items[key(x, y)] = f.items[key(x, y)] || []).push(mkItem('ratCrown'));
  f.visited = true; reveal(); S.raceMode = true;
  return S;
}
