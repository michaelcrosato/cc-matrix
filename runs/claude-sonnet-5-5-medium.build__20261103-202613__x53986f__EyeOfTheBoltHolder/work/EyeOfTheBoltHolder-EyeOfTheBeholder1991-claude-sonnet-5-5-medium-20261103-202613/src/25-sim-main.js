/* SIM MAIN: the per-step update, commands, new games, saves, the race. */
B.hintOK = {
  gS: F => !F.gates.gS, gP: F => !F.flags.g_gP, catchHint: F => !(F.fs.cSW2 && F.fs.cSW2.done), catchHint2: F => !(F.fs.cSW2 && F.fs.cSW2.done),
  candleHint: F => !F.gates.gB, lockHint: () => B.S.boss && !B.S.boss.opened
};
B.update = (dt) => {
  const S = B.S; if (!S || S.over && S.dead) return; S.time += dt; const p = S.party, F = B.F();
  if (p.tween) { p.tween.t += dt; if (p.tween.t >= p.tween.dur) B.finishTween(); }
  if (p.bump > 0) { p.bump += dt * 6; if (p.bump >= 1) p.bump = 0; }
  if (p.fall > 0) p.fall = Math.max(0, p.fall - dt * 1.2);
  B.updateSurvival(dt);
  if (S.camp) B.updateCamp(dt);
  if (!S.camp && !S.over) { B.updateMons(dt); B.updateProj(dt); B.updateBoss(dt); B.updatePlates(); B.updateNpcDialog && 0; }
  else B.updatePlates();
  F.time += dt; const d = B.def();
  if (!S.camp && !S.over) for (const h of d.hints || []) { if (F.time > h[0] && !F.hinted[h[1]] && B.opt.hints !== false && (!B.hintOK[h[1]] || B.hintOK[h[1]](F))) { F.hinted[h[1]] = true; B.log('Hint: ' + h[2], 'hint'); B.ev('hint', {}); } }
  if (S.race) B.updateRace(dt);
  for (let i = 0; i < p.members.length; i++) { const m = p.members[i]; if (m.state === 'ok' && m.hp <= 0) m.hp = 1; }
};
B.cmd = (c) => {
  switch (c.c) {
    case 'move': return B.cmdMove(c.d); case 'turn': return B.cmdTurn(c.s); case 'use': return B.cmdUse(); case 'putDown': return B.cmdPutDown(); case 'throw': return B.cmdThrow();
    case 'strike': return B.cmdStrike(); case 'hand': return B.cmdHand(c.m, c.h); case 'cast': return B.cmdCast(c.m, c.spell, c.target);
    case 'inv': return c.op === 'click' ? B.invClick(c.loc) : c.op === 'use' ? B.useLoc(c.loc) : c.op === 'drop' ? B.invDrop(c.loc) : false;
    case 'camp': return B.cmdCamp(c.op, c);
    case 'select': B.S.party.selected = B.clamp(c.m, 0, B.S.party.members.length - 1); return true;
    case 'ability': return B.cmdAbility(c.m);
    case 'dismiss': return B.dismiss(c.m);
    case 'join': return B.npcJoin(c.id);
  }
  return false;
};
B.serialize = () => { const o = JSON.parse(JSON.stringify(Object.assign({}, B.S, { events: [] }))); return o; };
B.deserialize = (data) => { if (!data || data.v !== 1 || !data.party || !data.floors) return false; data.events = []; B.S = data; return true; };
B.premade = () => { B.S = null; B._u = 0; return B.PREMADE.map(p => B.makeMember(p)); };
B.startGame = (seed, members, diff) => { B.newState(seed || 12345, members || B.premade(), diff); return B.S; };
B.startRace = (seed) => {
  const S = B.newState(seed || 777, B.premade()); S.floor = 'rr'; const d = B.FLOORS.rr; Object.assign(S.party, { cx: d.start[0], cy: d.start[1], dir: d.start[2] });
  S.race = { t: 0, go: false, cp: 0, crowns: 0, got: [], done: false, dead: false, bonus: 0 };
  for (const m of S.party.members) { while (m.lvl < 3) B.levelUp(m, true); m.hp = m.max; m.xp = B.XPT[3]; }
  B.floorEnter('rr', true); return S;
};
B.updateRace = (dt) => {
  const S = B.S, r = S.race, d = B.def(), p = S.party; if (r.done) return; if (r.go) r.t += dt;
  if (!r.go) return;
  const cp = d.cps[r.cp]; if (cp && p.cx === cp[0] && p.cy === cp[1] && !p.tween) { r.cp++; B.ev('checkpoint', { n: r.cp }); B.log('Checkpoint ' + r.cp + ' of ' + d.cps.length); }
  d.crowns.forEach((c, i) => { if (!r.got.includes(i) && p.cx === c[0] && p.cy === c[1] && !p.tween) { r.got.push(i); r.crowns++; B.ev('crown', {}); B.log('A crown! +' + 1); } });
  if (S.over && !r.dead) { r.dead = true; B.ev('raceWipe', {}); }
};
B.raceFinish = () => { const r = B.S.race; if (r && !r.done) { r.done = true; B.ev('raceFinish', { t: r.t }); } };
B.score = () => { const r = B.S.race; return r ? Math.round(r.cp * 1000 + r.crowns * 300 - r.t * 2) : 0; };
// dev / tests
B.cheat = (k, on) => { B.CHEATS[k] = on == null ? !B.CHEATS[k] : on; };
B.warp = (floor, x, y, dir) => { const S = B.S, p = S.party; S.floor = floor; p.cx = x; p.cy = y; p.dir = dir == null ? p.dir : dir; p.tween = null; p.queued = null; S.proj.length = 0; S.camp = null; B.floorEnter(floor); };
B.give = (id, n) => { const r = B.ref(id, n ? { n } : null); if (!B.partyAdd(r)) B.dropAt(B.S.party.cx, B.S.party.cy, r, B.S.floor); return r; };
