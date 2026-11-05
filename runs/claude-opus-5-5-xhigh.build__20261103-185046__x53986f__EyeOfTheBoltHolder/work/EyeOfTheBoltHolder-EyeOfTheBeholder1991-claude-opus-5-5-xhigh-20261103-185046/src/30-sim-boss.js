/* =====================================================================================
 * 30-sim-boss: the Bolt-Holder. Caged (x0.2 harm) until the three Great Locks are turned; unbolted, it drifts to the
 * party's flank and wrenches a bolt home at half its life (x0.5 until that lock turns again); below a quarter it rages and
 * calls Gazers. It drinks lightning. Every attack is telegraphed: Chain Lightning down a line (a pillar or a step aside
 * dodges it), the Locking Gaze (pillars block it), Bolt Rain on marked cells, and the Cage Slam beside it
 * ===================================================================================== */
B.makeBoss = (x, y) => {
  const hp = Math.round(B.MON('boltholder').hp * B.T.bossHP * B.diff().monHP);
  S.boss = { alive: true, awake: false, cx: x, cy: y, hp, max: hp, phase: 1, locks: { GL1: false, GL2: false, GL3: false }, relocked: null, relockDone: false,
    atkT: 3, drift: 4, summonT: 12, tele: null, flash: 0, dead: 0, gx: x, gy: y, glide: 0, iris: 0, hurtT: 0 };
};
const BOSS_INT = [3.5, 3.0, 2.5];
const arenaOpen = (x, y) => { const X = IX('f4'); return x >= 3 && x <= 9 && y >= 1 && y <= 5 && X.ch(x, y) !== '#'; };
/** the cells along a line from the Eye toward a way, until a pillar or wall */
function bossLine(d) { const Bs = S.boss, out = []; let x = Bs.cx, y = Bs.cy; for (let k = 0; k < 9; k++) { x += DX[d]; y += DY[d]; if (wallAt(x, y)) break; out.push([x, y]); } return out; }
function bossStep(dt) {
  const Bs = S.boss, P = S.party; if (!Bs || S.floor !== 'f4') return;
  Bs.flash = Math.max(0, Bs.flash - dt); Bs.glide = Math.max(0, Bs.glide - dt / .8); Bs.hurtT = Math.max(0, Bs.hurtT - dt);
  if (!Bs.alive) { Bs.dead += dt; return; }
  if (!Bs.awake) { if (P.cy <= 5 && P.cx >= 3 && P.cx <= 9 && !P.tw) { Bs.awake = true; S.moment = { id: 'eyeIntro', t: 0, dur: 5.5 }; ev('moment', { id: 'eyeIntro' }); ev('music', { id: 'boss' }); hint('h_eye'); } return; }
  if (B.CHEATS.freeze) return;
  const T = Bs.tele;
  if (T) { T.t += dt; Bs.iris = T.k === 'gaze' ? Math.min(1, T.t / T.dur) : 0; if (T.t >= T.dur) { Bs.tele = null; resolveBoss(T); Bs.atkT = BOSS_INT[Bs.phase - 1] * B.T.monInt; } return; }
  Bs.atkT -= dt;
  if (Bs.phase >= 2) { Bs.drift -= dt; if (Bs.drift <= 0) { Bs.drift = 4; drift(); } }
  if (Bs.phase === 3) { Bs.summonT -= dt; if (Bs.summonT <= 0) { Bs.summonT = 12; summon(); } }
  if (Bs.atkT <= 0) chooseAttack();
}
B.bossStep = bossStep;
function chooseAttack() {
  const Bs = S.boss, P = S.party, d = dirTo(Bs.cx, Bs.cy, P.cx, P.cy), dist = manhattan(Bs.cx, Bs.cy, P.cx, P.cy);
  const line = d >= 0 ? bossLine(d) : [], inL = line.some(([x, y]) => x === P.cx && y === P.cy);
  const r = rnd('ai');
  if (dist === 1 && r < .5) { Bs.tele = { k: 'slam', t: 0, dur: .6 }; ev('bossTele', { k: 'slam' }); return; }
  if (inL) {
    const immune = alive().every(m => B.wears(m, 'lidlessWard')) || S.party.freeHinge > 0;
    if (r < .62 || immune) { Bs.tele = { k: 'lightning', t: 0, dur: .8, d, cells: line }; ev('bossTele', { k: 'lightning', cells: line }); return; }
    Bs.tele = { k: 'gaze', t: 0, dur: 1.0 }; ev('bossTele', { k: 'gaze' }); return;
  }
  const cells = [[P.cx, P.cy]], nb = [0, 1, 2, 3].map(k => [P.cx + DX[k], P.cy + DY[k]]).filter(([x, y]) => arenaOpen(x, y) && !(x === Bs.cx && y === Bs.cy));
  while (cells.length < 3 && nb.length) cells.push(nb.splice(Math.floor(rnd('ai') * nb.length), 1)[0]);
  Bs.tele = { k: 'rain', t: 0, dur: 1.5, cells }; ev('bossTele', { k: 'rain', cells });
}
function resolveBoss(T) {
  const Bs = S.boss, P = S.party, side = relSide(P.dir, P.cx, P.cy, Bs.cx, Bs.cy), K = B.T.monDmg * B.diff().monDmg;
  const hit = (n, dd) => { for (const m of pickTargets(side, n)) hurtMember(m, Math.round(dice(...dd, 'ai') * K), { side, src: 'boss' }); };
  if (T.k === 'lightning') { ev('bossBolt', { cells: T.cells }); noise(Bs.cx, Bs.cy, 9); if (T.cells.some(([x, y]) => x === P.cx && y === P.cy)) hit(2, [3, 6, 0]); else ev('bossDodge', {}); }
  if (T.k === 'gaze') {
    ev('bossGaze', {});
    if (B.partyFov().has(key(Bs.cx, Bs.cy))) { let n = rnd('ai') < .5 ? 1 : 2, any = false; const pool = alive().slice(); while (n-- > 0 && pool.length) { const m = pool.splice(Math.floor(rnd('ai') * pool.length), 1)[0]; if (B.wears(m, 'lidlessWard') || P.freeHinge > 0) { m.pop = { n: 'FREE', t: .8, c: '#ffe8a0' }; continue; } if (B.RACES[m.race].hold && rnd('ai') < B.RACES[m.race].hold) { m.pop = { n: 'RESIST', t: .8, c: '#a8e0ff' }; continue; } m.status.held = 4; any = true; } if (any) say('m_jointsLock', null, { c: '#8ae0ff' }); }
    else ev('bossDodge', {});
  }
  if (T.k === 'rain') { ev('bossRain', { cells: T.cells }); if (T.cells.some(([x, y]) => x === P.cx && y === P.cy)) hit(2, [2, 6, 0]); else ev('bossDodge', {}); }
  if (T.k === 'slam') { ev('bossSlam', {}); if (manhattan(Bs.cx, Bs.cy, P.cx, P.cy) === 1) hit(1, [2, 6, 0]); }
}
/** phase 2 on: one cell toward the party's flank (never a pillar) */
function drift() {
  const Bs = S.boss, P = S.party;
  const flanks = [(P.dir + 1) % 4, (P.dir + 3) % 4].map(d => [P.cx + DX[d] * 2, P.cy + DY[d] * 2]);
  let best = null, bd = 99;
  for (let d = 0; d < 4; d++) {
    const x = Bs.cx + DX[d], y = Bs.cy + DY[d];
    if (!arenaOpen(x, y) || (x === P.cx && y === P.cy) || monsAt(x, y).length) continue;
    const dd = Math.min(...flanks.map(([fx, fy]) => manhattan(x, y, fx, fy)));
    if (dd < bd) { bd = dd; best = [x, y]; }
  }
  if (best) { Bs.gx = Bs.cx; Bs.gy = Bs.cy; Bs.cx = best[0]; Bs.cy = best[1]; Bs.glide = 1; ev('bossDrift', {}); }
}
function summon() {
  const fl = FL(), gazers = fl.mons.filter(m => m.hp > 0 && m.type === 'gazer').length; if (gazers >= 4) return;
  const spots = []; for (let y = 1; y <= 5; y++) for (let x = 3; x <= 9; x++) if (arenaOpen(x, y) && !(x === S.boss.cx && y === S.boss.cy) && !(x === S.party.cx && y === S.party.cy) && manhattan(x, y, S.party.cx, S.party.cy) >= 2) spots.push([x, y]);
  for (let k = 0; k < Math.min(2, 4 - gazers) && spots.length; k++) { const [x, y] = spots.splice(Math.floor(rnd('ai') * spots.length), 1)[0]; const m = spawnMon(fl, 'gazer', x, y, {}); m.aware = true; m.st = 'hunt'; m.gazeT = 2; }
  ev('summon', {});
}
/** harm to the Eye: x0.2 through the cage, x0.5 while a lock is wrenched back; lightning heals it by half */
B.hurtBoss = (dmg, o = {}) => {
  const Bs = S.boss; if (!Bs || !Bs.alive) return;
  if (!Bs.awake) { Bs.awake = true; }
  if (o.kind === 'shock') { const h = Math.round(dmg / 2); Bs.hp = Math.min(Bs.max, Bs.hp + h); say('m_drinks', null, { rate: 2, c: '#8ae0ff' }); ev('bossDrink', { n: h }); return; }
  let k = Bs.phase === 1 ? .2 : 1; if (Bs.relocked) k *= .5;
  if (B.CHEATS.oneHit) { dmg = Bs.hp; k = 1; }
  const n = Math.max(1, Math.round(dmg * k));
  Bs.hp -= n; Bs.flash = .2; Bs.hurtT = .3;
  ev('bossHurt', { n, crit: !!o.crit });
  if (Bs.hp <= 0) { bossDie(); return; }
  if (Bs.phase >= 2 && !Bs.relockDone && Bs.hp <= Bs.max / 2) {
    Bs.relockDone = true; const ids = Object.keys(Bs.locks); const id = ids[Math.floor(rnd('ai') * ids.length)];
    Bs.locks[id] = false; Bs.relocked = id; FL().feats[id].turned = false; bark('eyeRelock'); say('m_relock', null, { c: '#ff8a6a' }); ev('bossRelock', { id });
  }
  if (Bs.phase === 2 && Bs.hp < Bs.max * .25) { Bs.phase = 3; Bs.summonT = 3; bark('eye4'); ev('bossPhase', { phase: 3 }); }
};
function bossDie() {
  const Bs = S.boss; Bs.alive = false; Bs.hp = 0; Bs.tele = null; bark('eye5');
  S.moment = { id: 'eyeDeath', t: 0, dur: 4.5 }; ev('moment', { id: 'eyeDeath' }); ev('bossDie', {});
  for (const m of FL().mons) if (m.hp > 0 && m.type === 'gazer') { m.hp = 0; m.dead = .001; ev('monDie', { uid: m.uid, x: m.cx, y: m.cy, type: m.type }); }
  S.stats.kills++;
  const ok = alive(); for (const m of ok) B.gainXp(m, B.MON('boltholder').xp / ok.length);
}
/** a Great Lock: 2 s of heaving (the party can do nothing else) slides two of the seven bolts out */
B.turnLock = ft => {
  const fl = FL(), st = fl.feats[ft.id], Bs = S.boss, P = S.party;
  if (Bs && !Bs.alive && ft.id === 'GL3' && S.flags.stairLight) { S.won = true; ev('ending', {}); return true; }
  if (Bs && !Bs.alive) { say('m_nothing'); return true; }
  if (st.turned) { say('m_lockDone'); return true; }
  if (Bs && !Bs.awake) Bs.awake = true;
  P.busy = { k: 'lock', id: ft.id, t: 0, dur: 2 }; say('m_lockTurn'); ev('lockTurn', { id: ft.id });
  return true;
};
B.lockDone = id => {
  const fl = FL(), Bs = S.boss; fl.feats[id].turned = true;
  if (!Bs) return;
  Bs.locks[id] = true; if (Bs.relocked === id) Bs.relocked = null;
  say('m_shriek', null, { c: '#ffb86a' }); ev('lockDone', { id }); ev('shake', { n: 3 });
  if (Bs.phase === 1 && Object.values(Bs.locks).every(Boolean)) { Bs.phase = 2; Bs.drift = 2; bark('eye3'); ev('bossPhase', { phase: 2 }); }
};
/** the moments: the Eye's arrival, the Undergate opening, the Eye's death */
function momentStep(dt) {
  const M = S.moment, was = M.t; M.t += dt;
  const at = s => was < s && M.t >= s;
  if (M.id === 'eyeIntro') { if (at(.4)) bark('eye1'); if (at(3)) bark('eye2'); }
  if (M.id === 'undergate') { for (let k = 0; k < 7; k++) if (at(1 + k * 1.1)) ev('ugBolt', { k }); if (at(9)) { act(['open', 'U1']); say('m_undergate', null, { c: '#ffd36a' }); S.quests.wards = 'done'; S.quests.eye = 'open'; } }
  if (M.id === 'eyeDeath') { if (at(1.2)) ev('eyeCrack', {}); if (at(3.6)) { S.flags.stairLight = true; say('m_stairLight', null, { c: '#fff6d8' }); ev('autosave', {}); } }
  if (M.t >= M.dur) { S.moment = null; ev('momentEnd', { id: M.id }); }
}
B.momentStep = momentStep;
