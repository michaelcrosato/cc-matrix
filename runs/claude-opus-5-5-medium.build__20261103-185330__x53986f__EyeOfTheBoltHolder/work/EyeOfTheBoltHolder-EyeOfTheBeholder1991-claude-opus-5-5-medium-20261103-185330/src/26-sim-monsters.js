/* SIM: monsters. Each acts on its own clocks: it notices the party (sight through the symmetric field of view, noise,
 * a hound's ears), hunts it by A* round full cells (so flanking happens by itself), winds up a telegraphed blow that a
 * step can dodge, and has its type's specials. The Bolt-Holder's phases and attacks are at the end. */
B.spawnMon = (fid, type, x, y, o = {}) => {
  const MD = B.MONSTERS[type], FS = B.S.floors[fid]; if (!MD) return null;
  const cand = [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
  let at = cand.find(([cx, cy]) => (B.R.F[fid] ? B.monWalk(fid, cx, cy) : B.FLOORS[fid].map[cy][cx] !== '#') && B.unitsAt(cx, cy, fid) + MD.size <= 4);
  if (!at) at = [x, y];
  const hpMul = B.T.monHp * B.diff().hp * (MD.boss ? B.T.bossHp : 1);
  const mon = { uid: B.uid(), id: o.id || null, type, cx: at[0], cy: at[1], slot: 0, hp: Math.max(1, Math.round(MD.hp * hpMul)), max: 0, state: o.asleep ? 'asleep' : o.patrol ? 'patrol' : 'idle',
    aware: false, status: o.asleep ? { asleep: 1e9 } : {}, atkT: B.rng('ai') * MD.int, wind: 0, windKind: null, moveT: MD.move, reengage: 0, dir: 2, lastSeen: -99, patrol: o.patrol || null, pi: 0,
    castT: 2 + B.rng('ai') * 3, holdT: 8, gazeT: 2, stole: [], flash: 0, deadT: 0, drop: o.drop || null, pcell: null, fleeT: 0 };
  mon.max = mon.hp; mon.slot = B.freeSlot(fid, at[0], at[1], MD.size, mon);
  if (MD.boss) mon.boss = { phase: 0, locks: [false, false, false], relock: -1, relocked: false, atkT: 3, driftT: 4, summonT: 12, tele: null, dead: false };
  FS.mons.push(mon); return mon;
};
B.freeSlot = (fid, x, y, size, self) => {
  const used = B.monsAt(x, y, fid).filter(m => m !== self).map(m => [m.slot, B.MONSTERS[m.type].size]);
  if (size >= 4) return 0;
  if (size === 2) { const taken = new Set(used.map(([s, sz]) => sz === 2 ? s : s & 1 ? 1 : 0)); return taken.has(0) ? 1 : 0; }
  const taken = new Set(); for (const [s, sz] of used) { if (sz === 1) taken.add(s); else if (sz === 2) { taken.add(s ? 1 : 0); taken.add(s ? 3 : 2); } }
  for (let k = 0; k < 4; k++) if (!taken.has(k)) return k; return 0;
};
B.moveMon = (mon, x, y) => {
  const P = B.S.party; mon.dir = B.dirTo(mon.cx, mon.cy, x, y); mon.cx = x; mon.cy = y;
  mon.slot = B.freeSlot(B.S.floor, x, y, B.MONSTERS[mon.type].size, mon); mon.moved = B.S.time;
};
B.inLineClear = (ax, ay, bx, by, maxD) => {
  if (ax !== bx && ay !== by) return false;
  const d = B.manh(ax, ay, bx, by); if (d > maxD || d === 0) return false;
  const dir = B.dirTo(ax, ay, bx, by); let x = ax, y = ay;
  for (let k = 1; k < d; k++) { x += DX[dir]; y += DY[dir]; if (!B.open(B.S.floor, x, y)) return false; }
  return true;
};
B.updateMonsters = dt => {
  const S = B.S, P = S.party, FS = B.FS(), pk = key(P.cx, P.cy);
  for (let i = FS.mons.length - 1; i >= 0; i--) {
    const mon = FS.mons[i], MD = B.MONSTERS[mon.type];
    mon.flash = Math.max(0, mon.flash - dt);
    if (mon.hp <= 0) { mon.deadT += dt; if (mon.deadT > 3) FS.mons.splice(i, 1); continue; }
    if (B.CHEATS.freeze) continue;
    for (const k of Object.keys(mon.status)) if (mon.status[k] > 0) { mon.status[k] -= dt; if (mon.status[k] <= 0) delete mon.status[k]; }
    if (mon.status.asleep > 0 || mon.status.held > 0) { mon.wind = 0; continue; }
    if (mon.state === 'asleep') mon.state = 'hunt';
    const d = B.manh(mon.cx, mon.cy, P.cx, P.cy), sees = B.visible(mon.cx, mon.cy) && d <= MD.sight * B.T.sight / 5;
    // noticing and forgetting
    if (!mon.aware) {
      if (MD.boss) continue;
      if (sees || (MD.hears && d <= MD.hears)) { mon.aware = true; mon.state = 'hunt'; mon.lastSeen = S.time; B.sfx('voice' + B.cap(MD.voice), { at: [mon.cx, mon.cy] }); B.ev('aware', { uid: mon.uid }); }
      else { B.monWander(mon, dt); continue; }
    } else if (sees || d <= 1) mon.lastSeen = S.time;
    else if (S.time - mon.lastSeen > 12 && !MD.boss) { mon.aware = false; mon.state = mon.patrol ? 'patrol' : 'idle'; continue; }
    if (MD.boss) { B.bossUpdate(mon, dt); continue; }
    // the party changed cell: a short pause before a new wind-up (the dance is fair, not free)
    if (mon.pcell !== pk) { mon.pcell = pk; if (d === 1 && !mon.wind) mon.reengage = B.T.reengage; }
    mon.atkT -= dt; mon.reengage -= dt; mon.castT -= dt; mon.holdT -= dt; mon.gazeT -= dt;
    // a wind-up in progress lands or snaps on air
    if (mon.wind > 0) { mon.wind -= dt; if (mon.wind <= 0) B.monStrike(mon); continue; }
    if (mon.status.turned > 0 || mon.fleeT > 0 || (MD.coward && mon.hp < mon.max * .25)) { mon.fleeT = Math.max(0, mon.fleeT - dt); B.monFlee(mon, dt); continue; }
    const slow = mon.status.slowed > 0 ? 1.5 : 1, interval = MD.int * B.T.monInt * slow;
    const startWind = kind => { mon.wind = B.T.windup * (MD.heavy ? 1.6 : 1); mon.windKind = kind; mon.windMax = mon.wind; mon.atkT = interval; mon.dir = B.dirTo(mon.cx, mon.cy, P.cx, P.cy); B.ev('windup', { uid: mon.uid, kind }); B.sfx('voice' + B.cap(MD.voice), { at: [mon.cx, mon.cy], vol: .5 }); };
    if (d === 1) {
      mon.dir = B.dirTo(mon.cx, mon.cy, P.cx, P.cy);
      if (mon.atkT <= 0 && mon.reengage <= 0) startWind('melee');
      continue;
    }
    const line = B.inLineClear(mon.cx, mon.cy, P.cx, P.cy, 6);
    if (MD.reach2 && d === 2 && line && mon.atkT <= 0 && mon.reengage <= 0) { startWind('reach'); continue; }
    if (MD.gaze && line && d <= 3 && mon.gazeT <= 0) { mon.gazeT = 3 * B.T.monInt; startWind('gaze'); continue; }
    if (MD.caster && line) {
      if (mon.castT <= 0) { mon.castT = 7 * B.T.monInt; mon.wind = .7; mon.windKind = 'bolt'; mon.windMax = .7; mon.dir = B.dirTo(mon.cx, mon.cy, P.cx, P.cy); B.ev('windup', { uid: mon.uid, kind: 'bolt' }); B.sfx('chant', { at: [mon.cx, mon.cy] }); continue; }
      if (mon.holdT <= 0) { mon.holdT = 15 * B.T.monInt; B.monHold(mon); }
    }
    // keep away (Seers), else close in
    mon.moveT -= dt;
    if (mon.moveT > 0) continue;
    mon.moveT = MD.move * slow;
    if (MD.keepAway && d < MD.keepAway) { B.monFlee(mon, 0, true); continue; }
    if (MD.keepAway && line && d <= 6) continue;
    B.monStep(mon, P.cx, P.cy);
  }
};
B.canEnter = (mon, x, y) => {
  const MD = B.MONSTERS[mon.type], P = B.S.party;
  if (x === P.cx && y === P.cy) return false;
  if (!B.open(B.S.floor, x, y)) return false;
  const pit = B.pitIn(B.S.floor, x, y); if (pit && !pit.p.bridged && !MD.fly) return false;
  const c = B.ch(B.S.floor, x, y); if (c === '<' || c === '>' || c === '^' || (c === 'I' && !MD.fly)) return false;
  return B.unitsAt(x, y, B.S.floor, mon) + MD.size <= 4;
};
B.monStep = (mon, tx, ty) => {
  const R = B.RF(), path = R.grid.path([mon.cx, mon.cy], [tx, ty], { blocked: (x, y) => !(x === tx && y === ty) && !(x === mon.cx && y === mon.cy) && !B.canEnter(mon, x, y), ends: true });
  if (path.length > 2) { const [nx, ny] = path[1]; if (B.canEnter(mon, nx, ny)) B.moveMon(mon, nx, ny); }
  else if (path.length === 0) {   // no way through (a full corridor): try any cell that comes closer
    const opts = [0, 1, 2, 3].map(d => [mon.cx + DX[d], mon.cy + DY[d]]).filter(([x, y]) => B.canEnter(mon, x, y) && B.manh(x, y, tx, ty) < B.manh(mon.cx, mon.cy, tx, ty));
    if (opts.length) B.moveMon(mon, ...opts[0]);
  }
};
B.monFlee = (mon, dt, keep) => {
  const MD = B.MONSTERS[mon.type], P = B.S.party;
  if (!keep) { mon.moveT -= dt; if (mon.moveT > 0) return; mon.moveT = MD.move; }
  const opts = [0, 1, 2, 3].map(d => [mon.cx + DX[d], mon.cy + DY[d]]).filter(([x, y]) => B.canEnter(mon, x, y) && B.manh(x, y, P.cx, P.cy) > B.manh(mon.cx, mon.cy, P.cx, P.cy));
  if (opts.length) B.moveMon(mon, ...opts[Math.floor(B.rng('ai') * opts.length)]);
};
B.monWander = (mon, dt) => {
  if (mon.state !== 'patrol' || !mon.patrol) return;
  const MD = B.MONSTERS[mon.type]; mon.moveT -= dt; if (mon.moveT > 0) return; mon.moveT = MD.move * 1.6;
  const [tx, ty] = mon.patrol[mon.pi]; if (mon.cx === tx && mon.cy === ty) { mon.pi = (mon.pi + 1) % mon.patrol.length; return; }
  B.monStep(mon, tx, ty);
};
/** the wind-up ends: the blow lands if the party is still in reach */
B.monStrike = mon => {
  const S = B.S, P = S.party, MD = B.MONSTERS[mon.type], d = B.manh(mon.cx, mon.cy, P.cx, P.cy), side = B.sideOf(P.cx, P.cy, P.dir, mon.cx, mon.cy);
  const kind = mon.windKind; mon.windKind = null;
  if (kind === 'bolt') {
    if (!B.inLineClear(mon.cx, mon.cy, P.cx, P.cy, 7)) return;
    const p = { kind: 'lockBolt', cx: mon.cx, cy: mon.cy, d: B.dirTo(mon.cx, mon.cy, P.cx, P.cy), prog: 0, left: 7, speed: 5, team: 'mon', uid: B.uid() };
    S.proj.push(p); B.ev('proj', { uid: p.uid }); B.sfx('lockBolt', { at: [mon.cx, mon.cy] }); return;
  }
  if (kind === 'gaze') {
    if (!B.inLineClear(mon.cx, mon.cy, P.cx, P.cy, 3)) return;
    const p = { kind: 'spark', cx: mon.cx, cy: mon.cy, d: B.dirTo(mon.cx, mon.cy, P.cx, P.cy), prog: 0, left: 4, speed: 9, team: 'mon', uid: B.uid() };
    S.proj.push(p); B.ev('proj', { uid: p.uid }); B.sfx('zap', { at: [mon.cx, mon.cy] }); return;
  }
  const reachOk = kind === 'reach' ? d <= 2 && B.inLineClear(mon.cx, mon.cy, P.cx, P.cy, 2) : d === 1;
  if (!reachOk) { if (S.time - (S.snapMsg || -9) > 2.5) { S.snapMsg = S.time; B.msg('The ' + MD.name.replace(/^The /, '') + "'s blow snaps on air."); } B.sfx('whiff'); return; }
  const n = MD.bites || 1;
  for (let k = 0; k < n; k++) {
    const m = B.targetMember(side); if (!m) return;
    B.ev('monAttack', { uid: mon.uid });
    if (B.ri(1, 20, 'combat') + MD.atk < B.defense(m)) { B.sfx('whiff'); B.pop(m, 'main', 'MISS', '#8ab8ff'); continue; }
    const dmg = Math.max(1, B.dice(MD.dmg) * B.T.monDmg * B.diff().dmg);
    const dealt = B.hurtMember(m, dmg, side);
    if (MD.drain && dealt) mon.hp = Math.min(mon.max, mon.hp + dealt);
    if (MD.steal && B.rng('ai') < MD.steal && m.state !== 'dead') {
      const opts = m.pack.map((it, i) => [it, i]).filter(([it]) => it && !B.isQuest(it.id));
      if (opts.length) { const [it, i] = opts[Math.floor(B.rng('ai') * opts.length)]; m.pack[i] = null; mon.stole.push(it); mon.fleeT = 6; B.msg('The Latchkin snatches ' + m.name + "'s " + B.itemName(it) + '!'); }
    }
    if (MD.corrode && m.slots.body && (m.slots.body.corrode || 0) < 2 && B.def(m.slots.body).def > 0) { m.slots.body.corrode = (m.slots.body.corrode || 0) + 1; B.msg(m.name + "'s armour hisses and pits."); }
    if (MD.rust && B.rng('ai') < MD.rust) { const w = m.slots.main, wd = B.def(w); if (w && wd.kind === 'weapon' && wd.icon !== 'staff' && (w.rust || 0) < 4) { w.rust = (w.rust || 0) + 2; B.msg(m.name + "'s " + wd.name + ' rusts!', '#c8783a'); } }
    if (MD.poison && B.rng('ai') < MD.poison && m.state === 'ok' && !B.save(m, 'con', m.race === 'dwarf' ? 4 : 0)) { m.status.poison = 60; B.msg(m.name + ' is poisoned!', '#4ae070'); }
  }
};
/** a save: d20 at least 15 - level/2 - the stat's modifier */
B.save = (m, stat, bonus = 0) => { let b = bonus + B.mod(B.stat(m, stat)) + Math.floor(m.lvl / 2); for (const it of Object.values(m.slots)) { const d = B.def(it); if (d && d.save) b += d.save; } if (B.S.party.fx.steady > 0) b++; return B.ri(1, 20, 'combat') + b >= 15; };
B.holdImmune = m => B.S.party.fx.freeHinge > 0 || Object.values(m.slots).some(it => it && B.def(it).noHold);
B.monHold = mon => {
  const pool = B.alive().filter(m => !B.holdImmune(m)); if (!pool.length) return;
  const m = pool[Math.floor(B.rng('ai') * pool.length)];
  B.ev('windup', { uid: mon.uid, kind: 'hold' }); B.sfx('chant', { at: [mon.cx, mon.cy] });
  if ((m.race === 'elf' && B.rng('ai') < .5) || B.save(m, 'wis')) { B.msg(m.name + ' shakes off a binding chant.'); return; }
  m.status.held = 4; B.msg(m.name + ' is held fast!', '#ffd36a'); B.sfx('held');
};

/* ---- THE BOLT-HOLDER: caged (×0.2) until three Great Locks are turned; unbolted; wrath below a quarter ---- */
B.bossMon = () => B.S.floors.f4 && B.S.floors.f4.mons.find(m => m.type === 'boltholder');
B.bossWake = () => {
  const mon = B.bossMon(); if (!mon || mon.boss.phase) return;
  mon.boss.phase = 1; mon.aware = true; mon.lastSeen = B.S.time; B.S.bossIntro = 1;
  B.ev('bossIntro'); B.ev('music', { cue: 'boss' }); B.startStory('eye1');
};
B.bossDamage = (mon, dmg, o) => {
  const b = mon.boss;
  if (!b.phase) B.bossWake();
  if (o.kind === 'lightning') { mon.hp = Math.min(mon.max, mon.hp + Math.round(dmg / 2)); B.msg('The Bolt-Holder drinks the lightning!', '#6ae8ff'); B.ev('heal', { uid: mon.uid }); return 0; }
  if (b.phase === 1) dmg *= .2; else if (b.relocked) dmg *= .5;
  return dmg;
};
B.lockIdx = { GL1: 0, GL2: 1, GL3: 2 };
B.turnGreatLock = (f, st) => {
  const S = B.S, P = S.party, mon = B.bossMon(), i = B.lockIdx[f.id];
  if (S.flags.bossDead && f.id === 'GL3') { B.ev('ending'); return true; }
  if (S.flags.bossDead) { B.msg('The Great Lock is still. Above it, the stair climbs toward the light.'); return true; }
  if (!mon || mon.hp <= 0) { B.msg('The Great Lock is still.'); return true; }
  if (mon.boss.locks[i]) { B.msg('This lock is already turned.'); return true; }
  if (!mon.boss.phase) B.bossWake();
  P.lock = 2.0; P.lockId = f.id; B.sfx('lockTurn'); B.ev('lockTurn', { id: f.id });
  return true;
};
B.lockDone = () => {
  const S = B.S, P = S.party, mon = B.bossMon(), i = B.lockIdx[P.lockId]; P.lockId = null; if (!mon || mon.hp <= 0) return;
  const b = mon.boss; b.locks[i] = true; B.FS().feat[['GL1', 'GL2', 'GL3'][i]].on = true;
  if (b.relock === i) { b.relock = -1; b.relocked = false; B.msg('The bolt slides free again!'); }
  else { B.msg('The Bolt-Holder shrieks!', '#ffd36a'); B.sfx('shriek'); }
  B.ev('bolts', { n: b.locks.filter(Boolean).length });
  if (b.phase === 1 && b.locks.every(Boolean)) { b.phase = 2; b.atkT = 2; B.startStory('eye3'); B.ev('cage'); B.sfx('boltSlam'); }
};
B.bossCells = (mon, kind) => {
  const P = B.S.party;
  if (kind === 'rain') { const c = [[P.cx, P.cy]]; for (const d of [0, 1, 2, 3]) { const x = P.cx + DX[d], y = P.cy + DY[d]; if (B.open('f4', x, y) && c.length < 3 && !(x === mon.cx && y === mon.cy)) c.push([x, y]); } return c; }
  if (kind === 'chain') { const dir = B.dirTo(mon.cx, mon.cy, P.cx, P.cy), out = []; let x = mon.cx, y = mon.cy; for (let k = 0; k < 8; k++) { x += DX[dir]; y += DY[dir]; if (!B.open('f4', x, y)) break; out.push([x, y]); } return out; }
  return [];
};
B.bossUpdate = (mon, dt) => {
  const S = B.S, P = S.party, b = mon.boss; if (!b.phase || S.talk) return;
  const interval = (b.phase === 1 ? 3.5 : b.phase === 2 ? 2.8 : 2.5) * B.T.monInt;
  if (b.phase === 2 && !b.relockDone && mon.hp < mon.max * .5) {
    b.relockDone = true; const turned = b.locks.map((v, i) => v ? i : -1).filter(i => i >= 0); const i = turned[Math.floor(B.rng('ai') * turned.length)];
    b.locks[i] = false; b.relock = i; b.relocked = true; B.FS().feat[['GL1', 'GL2', 'GL3'][i]].on = false; B.msg('It wrenches a bolt home!', '#e0463c'); B.startStory('eyeRelock'); B.sfx('boltSlam'); B.ev('bolts', { n: 2 });
  }
  if (b.phase === 2 && mon.hp < mon.max * .25) { b.phase = 3; B.startStory('eye4'); B.ev('wrath'); }
  // a telegraph running: it lands when its time is up
  if (b.tele) {
    b.tele.t -= dt;
    if (b.tele.t <= 0) {
      const T = b.tele; b.tele = null; const inCells = T.cells.some(([x, y]) => x === P.cx && y === P.cy);
      if (T.kind === 'chain') { B.ev('lightning', { cells: T.cells }); B.sfx('thunder'); if (inCells) { const side = B.sideOf(P.cx, P.cy, P.dir, mon.cx, mon.cy); for (let k = 0; k < 2; k++) B.hurtMember(B.targetMember(side), B.dice('2d6') * B.T.monDmg * B.diff().dmg, side); } else B.msg('The lightning cracks past you!'); }
      else if (T.kind === 'gaze') { if (B.inLineBoss(mon)) { const pool = B.alive().filter(m => !B.holdImmune(m)); for (let k = 0; k < 2 && pool.length; k++) { const m = pool.splice(Math.floor(B.rng('ai') * pool.length), 1)[0]; m.status.held = 3; } B.msg('Your joints lock!', '#ffd36a'); B.sfx('held'); } else B.msg('The gaze slides off the pillar.'); }
      else if (T.kind === 'rain') { B.ev('rain', { cells: T.cells }); B.sfx('boltSlam'); if (inCells) for (let k = 0; k < 2; k++) B.hurtMember(B.targetMember('front'), B.dice('2d4+1') * B.T.monDmg * B.diff().dmg, 'front'); else B.msg('Iron bolts slam down where you stood!'); }
      else if (T.kind === 'slam') { if (B.manh(mon.cx, mon.cy, P.cx, P.cy) === 1) { const side = B.sideOf(P.cx, P.cy, P.dir, mon.cx, mon.cy); B.hurtMember(B.targetMember(side), B.dice('2d6') * B.T.monDmg * B.diff().dmg, side); B.ev('shake', { n: 6 }); } }
    }
    return;
  }
  b.atkT -= dt; b.driftT -= dt; b.summonT -= dt;
  if (b.phase >= 2 && b.driftT <= 0) {
    b.driftT = 4;
    const opts = [0, 1, 2, 3].map(d => [mon.cx + DX[d], mon.cy + DY[d]]).filter(([x, y]) => B.open('f4', x, y) && !(x === P.cx && y === P.cy) && y <= 5 && y >= 1 && x >= 3 && x <= 9 && !((x === 3 && y === 3) || (x === 9 && y === 3) || (x === 6 && y === 1)));   // (never onto a Great Lock's cell)
    if (opts.length) { opts.sort((a, c) => B.manh(a[0], a[1], P.cx, P.cy) - B.manh(c[0], c[1], P.cx, P.cy)); B.moveMon(mon, ...opts[B.rng('ai') < .7 ? 0 : opts.length - 1]); }
  }
  if (b.phase === 3 && b.summonT <= 0) { b.summonT = 14; if (B.FS().mons.filter(m => m.type === 'gazer' && m.hp > 0).length < 4) for (let k = 0; k < 1; k++) { const g = B.spawnMon('f4', 'gazer', mon.cx, mon.cy + (k ? -1 : 1), {}); if (g) { g.aware = true; g.state = 'hunt'; } } B.msg('A Gazer spills from the cage!'); }
  if (b.atkT > 0) return;
  b.atkT = interval;
  const d = B.manh(mon.cx, mon.cy, P.cx, P.cy), line = B.inLineBoss(mon);
  let kind = d === 1 ? 'slam' : line ? (B.rng('ai') < .6 ? 'chain' : 'gaze') : 'rain';
  if (kind === 'gaze' && B.alive().every(B.holdImmune)) kind = 'chain';
  b.tele = { kind, t: kind === 'chain' ? .8 : kind === 'gaze' ? 1.0 : kind === 'rain' ? 1.5 : .6, cells: B.bossCells(mon, kind) }; b.tele.max = b.tele.t;
  B.ev('bossTele', { kind, cells: b.tele.cells }); B.sfx(kind === 'chain' ? 'charge' : kind === 'gaze' ? 'gazeHum' : kind === 'rain' ? 'rainWarn' : 'roar');
};
B.inLineBoss = mon => { const P = B.S.party; return B.inLineClear(mon.cx, mon.cy, P.cx, P.cy, 10); };
B.bossDeath = mon => {
  const S = B.S; mon.boss.dead = true; mon.boss.tele = null; B.startStory('eye5'); B.ev('eyeDeath'); B.ev('music', { cue: 'none' });
  for (const g of B.FS().mons) if (g.hp > 0 && g.type === 'gazer') B.killMon(g);
  S.flags.bossDead = 1; B.msg('The north lock wall splits open on a stair climbing toward the light.', '#ffd36a'); B.ev('autosave');
};
