/* THUGBY TURBO — the match step: control, player actions, phases, hazards, power-ups, referee. */
TUNE.add('scrumPush', 'Scrum push', 'Laws', .05, .01, .15, .01, '');
TUNE.add('catchPressure', 'Catch pressure', 'Ball', .12, 0, .4, .01, '');

function assignControl(dt) {
  for (const p of S.players) p.ctl = -1;
  const used = new Set();
  S.seats.forEach((seat, i) => {
    if (seat.kind === 'cpu') return;
    const T = seat.team, b = S.ball; let cur = seat.pid >= 0 ? S.players[seat.pid] : null;
    seat.swT = (seat.swT || 0) - dt;
    const ok = q => q && q.team === T && alive(q) && !used.has(q.id) && !q.heldByOther;
    const mates = S.players.filter(q => ok(q) && q.st !== 'ground' && q.st !== 'down' && q.st !== 'scrum' && q.st !== 'lineout' || (ok(q) && S.phase !== 'play'));
    const focus = b.holder || b;
    const nearest = () => { let best = null, bd = 1e9; for (const q of S.players) { if (!ok(q) || ['ground', 'down', 'air', 'fall', 'celebrate'].includes(q.st) && S.phase === 'play') continue; const d = Math.hypot(q.x - focus.x, q.y - focus.y) + (q.role === 3 && false ? 0 : 0); if (d < bd) { bd = d; best = q; } } return best; };
    if (!ok(cur)) cur = nearest() || S.players.find(ok);
    if (b.holder && b.holder.team === T && ok(b.holder) && cur !== b.holder && (seat.lastPoss !== T || S.phase !== 'play')) cur = b.holder;
    else if (b.holder && b.holder.team === T && ok(b.holder) && S.seats.filter(s => s.team === T && s.kind !== 'cpu').length === 1) cur = b.holder;
    else if (b.holder && b.holder.team === T && ok(b.holder)) { const others = S.seats.some((s2, j) => j !== i && s2.team === T && s2.kind !== 'cpu' && s2.pid === b.holder.id); if (!others && i === S.seats.findIndex(s2 => s2.team === T && s2.kind !== 'cpu')) cur = b.holder; }
    seat.lastPoss = b.holder ? b.holder.team : -1;
    if (S.sp && S.sp.team === T && S.sp.kicker !== undefined && (S.phase === 'kickoff' || S.phase === 'kick' || S.phase === 'penalty')) cur = S.players[S.sp.kicker];
    const I = S.seatI[i] || emptyIntent();
    // manual switching
    if (S.phase === 'play' && !(b.holder && b.holder.team === T && b.holder === cur)) {
      const list = S.players.filter(q => ok(q) && q.team === T).sort((a, c) => a.y - c.y), k = list.indexOf(cur);
      if (I.l1 && k > 0) { cur = list[k - 1]; seat.swT = 1.2; } else if (I.r1 && k >= 0 && k < list.length - 1) { cur = list[k + 1]; seat.swT = 1.2; }
      if (I.ci) { const n = nearest(); if (n) { cur = n; seat.swT = 1; } }
      if (I.click >= 0 && S.players[I.click] && ok(S.players[I.click]) && S.players[I.click].team === T) { cur = S.players[I.click]; seat.swT = 1.2; }
      if (TT.settings.autoSwitch !== 'Manual' && seat.swT <= 0 && !(b.holder && b.holder.team === T)) {
        const n = nearest(); if (n && n !== cur) { const dn = Math.hypot(n.x - focus.x, n.y - focus.y), dc = Math.hypot(cur.x - focus.x, cur.y - focus.y); if (TT.settings.autoSwitch === 'Full' ? dn < dc - 6 : dn < dc - 40 && (b.st === 'kick' || b.st === 'pass' || b.st === 'loose' || !b.holder || dc > 90)) { cur = n; seat.swT = .7; } }
      }
    }
    seat.pid = cur ? cur.id : -1; if (cur) { cur.ctl = i; used.add(cur.id); }
  });
}

function actPlayer(p, I, dt) {
  const b = S.ball, hasBall = b.holder === p;
  for (const k in p.cd) p.cd[k] -= dt;
  p.evade -= dt; p.fend -= dt; p.amT += dt; p.reactT -= dt; p.heldT -= dt; p.grease -= dt; p.iron -= dt; p.onFire -= p.onFire > 0 ? dt : 0; p.power === 'pie' && (p.powerT -= dt) <= 0 && (p.power = null);
  if (p.superKind) { p.superT -= dt; if (p.superT <= 0) endSuper(p); }
  if (p.onFire > 0) { p.turbo = TUNE.v.turboTank; if (p.onFire <= 0) bus.emit('fireOut', { id: p.id }); }
  p.flags.holdX = I.hx; p.smoke = Math.max(0, p.smoke - dt);
  if (p.st === 'diving') { p.vx = Math.cos(p.facing) * 170; p.vy = Math.sin(p.facing) * 170; const car = b.holder; if (car && car.team !== p.team && dist2(p, car) < 14 && !p.diveHit) { p.diveHit = true; tackleAttempt(p, 'dive', 0); } if (p.stT <= 0 && p.st === 'diving') { p.st = 'ground'; p.stT = p.diveHit ? .6 : 1.2; } return; }
  if (p.st !== 'run' && p.st !== 'charge') { return; }
  const I2 = I;
  if (p.superKind === 'hurricane') {
    const car = b.holder; if (car && car.team !== p.team) { const a = Math.atan2(car.y - p.y, car.x - p.x); I2.mx = Math.cos(a); I2.my = Math.sin(a); I2.turbo = true; if (dist2(p, car) < 12) { endSuperAfterHit(p, car); return; } } else { endSuper(p); }
  }
  if (hasBall) {
    if (I.x) { if (inGoalOf(p)) groundBall(p, true); else doSidestep(p, I2); }
    if (I.sq) doFend(p);
    // passing
    if (I.l1 || I.r1) { p.passSide = I.l1 ? -1 : 1; p.passHold = .001; }
    if (p.passSide) { const held = p.passSide < 0 ? I.hl1 : I.hr1; if (held) p.passHold += dt; if (!held || p.passHold > .25) { const long = p.passHold > .25; const r = bestReceiver(p, p.passSide, long); if (p.passSide) { if (r) doPass(p, r, long); else doDummy(p); } p.passSide = 0; p.passHold = 0; } }
    if (I.click >= 0 && S.players[I.click] && S.players[I.click].team === p.team) { const r = S.players[I.click]; doPass(p, r, dist2(p, r) > 130); }
    // kicking
    if (I.hci) { p.ciHold += dt; p.kickMeter = clamp(p.ciHold / .9, 0, 1); }
    if (I.rci) { const hold = p.ciHold; p.ciHold = 0; p.kickMeter = 0; if (hold > 0) doKickFrom(p, I, hold); }
    if (I.tri) useSuper(p);
    if (!hasBall) return;
  } else {
    p.ciHold = 0; p.passSide = 0;
    if (I.hx) { p.xHold += dt; if (p.xHold > .18) p.st = 'charge'; } 
    if (I.rx || (!I.hx && p.xHold > 0)) {
      const h = p.xHold; p.xHold = 0; if (p.st === 'charge') p.st = 'run';
      const car = b.holder;
      if (car && car.team !== p.team) {
        if (h > .18) { const ch = clamp(h / TUNE.v.bigHitCharge, 0, 1); if (h > 1.2 && dist2(p, car) < 20 && Math.abs(angDiff(Math.atan2(car.y - p.y, car.x - p.x), p.facing)) < 1) { tackleAttempt(p, 'big', .5); if (S.ball.holder !== car || car.st === 'air') foul(p, 'high'); else foul(p, 'high'); } else if (dist2(p, car) < 20) tackleAttempt(p, 'big', ch); else { p.st = 'fall'; p.stT = 1.0; p.am = 'bighit'; p.amT = 0; bus.emit('missedBig', { id: p.id }); } }
        else if (!tackleAttempt(p, 'tackle', 0)) cheapShot(p);
      } else cheapShot(p, true);
    }
    if (I.sq) {
      const car = b.holder;
      if (S.phase === 'ruck' && S.sp && S.sp.type === 'ruck') { /* handled by ruck */ }
      else { p.st = 'diving'; p.stT = .35; p.diveHit = false; p.am = 'dive'; p.amT = 0; }
    }
    if (I.tri) useSuper(p);
  }
  // ball pick when loose
}
function endSuperAfterHit(p, car) { tackleAttempt(p, 'super', 1); for (const q of S.players) if (q !== p && alive(q) && dist2(q, car) < 30 && standing(q)) { q.st = 'fall'; q.stT = 1; } endSuper(p); }
function cheapShot(p, loose) {
  const o = nearestOpp(p, TUNE.v.tackleRange, q => standing(q) && q !== S.ball.holder);
  if (!o) return; if (Math.abs(angDiff(Math.atan2(o.y - p.y, o.x - p.x), p.facing)) > 1.2) return;
  p.am = 'bash'; p.amT = 0; o.st = 'ground'; o.stT = 1.6; o.vx = Math.cos(p.facing) * 80; o.vy = Math.sin(p.facing) * 80; bus.emit('cheapShot', { by: p.id, on: o.id }); TT.hitFx && TT.hitFx(o, .5);
  foul(p, 'cheap');
}
function groundBall(p, dive) {
  if (S.ball.holder !== p || !inGoalOf(p)) return; if (dive) { p.am = 'dive'; p.amT = 0; addHype(p.team, 3); p.vx = Math.cos(p.facing) * 60; p.vy = Math.sin(p.facing) * 60; p.st = 'ground'; p.stT = 1.2; }
  scoreTry(p, 'grounded');
}
function doKickFrom(p, I, hold) {
  const d = S.dir[p.team]; let aim = null;
  if (I.aim) { const dx = I.aim[0] - p.x, dy = I.aim[1] - p.y, m = Math.hypot(dx, dy) || 1; aim = [dx / m, dy / m]; }
  else if (Math.hypot(I.mx, I.my) > .3) aim = [I.mx, I.my];
  const back = aim && aim[0] * d < -.5;
  if (hold < .2) return doKick(p, 'grubber', 0, aim);
  const power = clamp(hold / .9, 0, 1);
  const nearPosts = Math.abs(atkX(p.team) - p.x) < 225 || (Math.abs(atkX(p.team) - p.x) < 300 && Math.abs(p.y - G.CY) < 100);
  if (back) return doKick(p, 'bomb', power, aim);
  if (nearPosts && (!aim || aim[0] * d > -.2) && (!aim || Math.abs(aim[1]) < .8)) { const dx = atkX(p.team) - p.x, dy = G.CY - p.y + (aim ? aim[1] * 14 : 0), m = Math.hypot(dx, dy) || 1; doKick(p, 'punt', Math.max(.55, power), [dx / m, dy / m]); S.ball.drop = true; S.ball.dropFrom = p.id; return; }
  doKick(p, 'punt', power, aim);
}

// ---------- ball vs players, out of play, tries
function pickups() {
  const b = S.ball; if (b.st !== 'loose' && b.st !== 'dead') return; if (b.st === 'dead') return;
  if (b.z > 9) return; const sp = Math.hypot(b.vx, b.vy);
  let best = null, bd = sp > 210 ? 4.5 : 9;
  for (const q of S.players) if (standing(q) && (q.st === 'run' || q.st === 'charge')) { const d = Math.hypot(q.x - b.x, q.y - b.y); if (d < bd) { bd = d; best = q; } }
  if (!best) return;
  const runSp = Math.hypot(best.vx, best.vy);
  const ig = inGoalNow(b);
  if (ig && ig !== 0) { const att = S.dir[0] > 0 ? (ig > 0 ? 0 : 1) : (ig > 0 ? 1 : 0); giveBall(best); if (best.team === att) { return scoreTry(best, 'loose'); } else { bus.emit('forcedDeadBall', {}); return startDropOut(best.team); } }
  if (runSp > TUNE.v.runSpeed * .95 && best.hnd < 8 && S.rng() < .08 && (best.team === S.lastTeam)) { giveBall(best); S.ball.holder = null; b.st = 'loose'; return knockOn(best); }
  giveBall(best); bus.emit('pickup', { id: best.id });
}
const inGoalNow = b => b.x > G.X1 + 1 ? 1 : b.x < G.X0 - 1 ? -1 : 0;
function checkOut() {
  const b = S.ball, h = b.holder;
  if (h) {
    if (inGoalOf(h)) {
      h.groundT = (h.groundT || 0) + .0; 
    }
    if ((h.y < G.Y0 - 1 || h.y > G.Y1 + 1) && S.phase === 'play') {
      if (inGoalOf(h) && false) return; return touchOut(h.x, h.y, opp(h.team));
    }
    // dead-ball line while carrying
    if (h.x < G.X0 - G.ING + 2 || h.x > G.X1 + G.ING - 2) { if (!h.groundedTry) { scoreTry(h, 'deadline'); } }
    return;
  }
  if (b.st === 'scripted' || b.st === 'placed' || b.st === 'dead') return;
  if (b.y < G.Y0 || b.y > G.Y1) { if (b.x > G.X0 - G.ING && b.x < G.X1 + G.ING) { const tk = S.touchKeep !== undefined && S.touchKeep >= 0 ? S.touchKeep : opp(S.lastTeam); S.touchKeep = -1; return touchOut(b.x, b.y, tk); } }
  if (b.x < G.X0 - G.ING || b.x > G.X1 + G.ING) {
    const end = b.x > G.X1 ? 1 : -1, att = S.dir[0] === end ? 0 : 1, def = opp(att);
    if (S.lastTeam === att) { bus.emit('deadBall', {}); return startDropOut(def); }
    return startScrumAt(att, end > 0 ? G.X1 - 51 : G.X0 + 51, clamp(b.y, G.Y0 + 51, G.Y1 - 51), '5M SCRUM');
  }
}
function touchOut(x, y, throwTeam) {
  bus.emit('touch', { x, y, team: throwTeam }); S.ref.sig = 'touch'; S.ref.sigT = 1.2; S.stats[opp(throwTeam)].touchOuts = 0;
  if (S.cfg.mode === 'drill' && S.drillDef && S.drillDef.id === 'kick') { return; }
  startLineout(throwTeam, x, y < G.CY ? G.Y0 : G.Y1);
}
function stepDropGoal() {
  const b = S.ball; if (!b.drop || b.st !== 'kick') return; const kp = S.players[b.dropFrom], T = kp.team, ax = atkX(T), d = S.dir[T];
  if ((b.x - ax) * d >= 0 && b.vx * d > 0) {
    b.drop = false;
    if (b.z > G.CROSS && Math.abs(b.y - G.CY) < G.POST) { bus.emit('dropGoal', { team: T, id: kp.id }); banner('DROP GOAL! +3', '#80ff80', 2); addHype(T, 10); S.replayReq = 'drop'; if (afterScore(T, 3)) return; setPhase('goalscored'); S.sp = { t: 0, team: T }; S.ball.vx *= .2; S.ball.vy *= .2; }
  }
}

// ---------- ruck
function stepRuck(dt) {
  const s = S.sp; s.t += dt; const A = s.team, D = opp(A), mark = { x: s.x, y: s.y };
  const car = S.players[s.carrier], tk = S.players[s.tackler];
  const toward = (p, x, y, sp = 150) => { const dx = x - p.x, dy = y - p.y, m = Math.hypot(dx, dy); if (m > 3) { p.x += dx / m * Math.min(m, sp * dt); p.y += dy / m * Math.min(m, sp * dt); p.facing = Math.atan2(mark.y - p.y, mark.x - p.x); } };
  // commit
  const dA = S.dir[A];
  s.att.forEach((id, k) => { const p = S.players[id]; if (standing(p)) { p.st = 'run'; toward(p, mark.x - dA * (10 + k * 4), mark.y + (k ? 8 : -8)); p.flags.ruck = true; } });
  s.def.forEach((id, k) => { const p = S.players[id]; if (standing(p)) toward(p, mark.x + dA * (10 + k * 4), mark.y + (k ? -8 : 8)); });
  // humans join by running into the zone
  for (const p of S.players) if (p.ctl >= 0 && standing(p) && !s.att.includes(p.id) && !s.def.includes(p.id) && Math.hypot(p.x - mark.x, p.y - mark.y) < 16 && p !== car) { (p.team === A ? s.att : s.def).push(p.id); }
  // jackal
  if (s.t < .35 && !s.jack) {
    const first = S.players[s.first];
    if (first && first.team === D && (first.ctl >= 0 ? S.seatI[first.ctl] && S.seatI[first.ctl].sq : (s.t > .15 && S.fx() < .02 * TUNE.v.aiAggression))) { s.jack = true; s.bar -= .5; banner('JACKAL!', '#ff9060', 1); bus.emit('jackal', {}); addHype(D, 8); }
  }
  for (const i of [0, 1]) { const seatP = S.seats.findIndex((x, j) => x.team === D && S.seatI[j] && S.seatI[j].sq && S.players[x.pid] && !s.def.includes(x.pid) && S.players[x.pid] && Math.hypot(S.players[x.pid].x - mark.x, S.players[x.pid].y - mark.y) < 30); if (seatP >= 0 && s.t > .4 && !s.handsDone) { s.handsDone = true; foul(S.players[S.seats[seatP].pid], 'hands'); return; } break; }
  // bar
  const powA = s.att.reduce((a, id) => a + S.players[id].pow, 0) + car.pow * .3, powD = s.def.reduce((a, id) => a + S.players[id].pow, 0);
  s.bar += dt * (.02 * powA - .02 * powD) * 1;
  for (const t of [A, D]) {
    const sgn = t === A ? 1 : -1;
    if (humanOn(t)) s.bar += sgn * seatPress(t, 'x') * .05; else s.bar += sgn * dt * (t === D ? TUNE.v.cpuMash * (S.cfg.mashMult || 1) : TUNE.v.cpuMash * .9) * .05 * U(S.fx, .8, 1.2) * .33;
  }
  s.bar = clamp(s.bar, -1.5, 1.5);
  if (s.t >= 1.6) {
    for (const p of S.players) { p.flags.ruck = false; }
    const attWin = s.bar >= 0; const b = S.ball;
    if (attWin) {
      bus.emit('ruckWon', { team: A }); addHype(A, 2);
      let rec = S.players.find(p => p.team === A && p.role === 3 && standing(p) && Math.hypot(p.x - mark.x, p.y - mark.y) < 140) || s.att.map(i => S.players[i]).find(standing) || S.players.filter(p => p.team === A && standing(p)).sort((a, c) => dist2(a, mark) - dist2(c, mark))[0];
      if (rec) { place(rec, mark.x - dA * 10, mark.y, dA > 0 ? 0 : Math.PI); giveBall(rec); S.useIt = 3; S.useItMark = { x: rec.x, y: rec.y }; S.ruckExit = { x: mark.x, y: mark.y, team: A }; }
    } else {
      bus.emit('turnover', { team: D }); bus.emit('ruckWon', { team: D, turnover: true }); S.stats[D].turnovers++; addHype(D, 8); banner('TURNOVER!', '#ff9060', 1.3);
      const rec = S.players.filter(p => p.team === D && standing(p)).sort((a, c) => dist2(a, mark) - dist2(c, mark))[0]; if (rec) { place(rec, mark.x + dA * 10, mark.y, dA > 0 ? Math.PI : 0); giveBall(rec); S.ruckExit = null; }
    }
    // offside: defenders behind the ball line near the ruck
    if (attWin && !S.dev.noFouls) { for (const p of S.players) if (p.team === D && standing(p) && !s.def.includes(p.id) && (p.x - mark.x) * dA < -6 && dist2(p, mark) < 40 && !S.ref.down) { foul(p, 'offside'); if (S.phase === 'penalty') { s.t = 0; return; } break; } }
    if (S.phase === 'ruck') { setPhase('play'); S.sp = null; }
    if (S.hooter) checkHalf();
  }
}

// ---------- hazards and extras
function stepArcade(dt) {
  const R = S.rng, hz = S.cfg.mode === 'drill' ? 0 : TUNE.v.hazardEvery, v = S.venue.hazard;
  S.refDownT = Math.max(0, S.refDownT - dt);
  if (S.ref.down > 0) { S.ref.down -= dt; if (S.ref.down <= 0) { S.ref.st = 'run'; bus.emit('refUp', {}); } }
  // power-ups
  S.puT -= dt; if (S.puT <= 0 && S.powerups.length === 0 && S.cfg.mode !== 'drill') {
    S.puT = TUNE.v.powerupEvery + U(R, -10, 10); const kinds = Object.keys(POWERUPS), k = kinds[Math.floor(R() * kinds.length)], b = S.ball;
    let x, y, tries = 0; do { x = clamp(b.x + U(R, -300, 300), G.X0 + 60, G.X1 - 60); y = U(R, G.Y0 + 60, G.Y1 - 60); tries++; } while (Math.hypot(x - b.x, y - b.y) < 80 && tries < 10);
    const sx = x + U(R, -40, 40), sy = G.Y0 - 36; S.powerups.push({ kind: k, x: sx, y: sy, z: 60, tx: x, ty: y, t: 0, T: 1.1, life: 15, landed: false, sx, sy }); bus.emit('powerupThrow', { kind: k });
  }
  for (const u of S.powerups) {
    if (!u.landed) { u.t += dt; const k = clamp(u.t / u.T, 0, 1); u.x = lerp(u.sx, u.tx, k); u.y = lerp(u.sy, u.ty, k); u.z = 4 * 80 * k * (1 - k) + 2; if (k >= 1) { u.landed = true; u.z = 0; } }
    else { u.life -= dt; for (const p of S.players) if (standing(p) && Math.hypot(p.x - u.x, p.y - u.y) < 10) { takePowerup(p, u); break; } }
  }
  S.powerups = S.powerups.filter(u => u.life > 0 && !u.taken);
  // hazards
  if (hz > 0) {
    if (v === 'wind') { S.windT -= dt; if (S.windT <= 0) { S.windT = U(R, 15, 25); S.wind = R(); S.windDir = R() < .5 ? -1 : 1; } 
      S.chickT -= dt / hz; if (S.chickT <= 0 && !S.chicken && S.phase === 'play') { S.chickT = U(R, 50, 70); const x = U(R, G.X0 + 200, G.X1 - 200), dir = R() < .5 ? 1 : -1; S.chicken = { x, y: dir > 0 ? G.Y0 - 30 : G.Y1 + 30, dir, t: 0, vx: U(R, -25, 25) }; banner('CAPTAIN CLUCKY INVADES!', '#ffff60', 2); line('chicken'); bus.emit('hazard', { kind: 'chicken' }); } }
    if (v === 'flames') {
      S.jetT = (S.jetT === undefined ? 3 : S.jetT) - dt * hz; if (S.jetT <= 0 && S.phase === 'play') { S.jetT = U(R, 1.8, 3.2); const j = S.jets[Math.floor(R() * S.jets.length)]; if (j.st === 0) { j.st = 1; j.t = 0; const nb = S.jets[(S.jets.indexOf(j) + 1) % S.jets.length]; if (nb.st === 0 && R() < .5) { nb.st = 1; nb.t = 0; } bus.emit('hazardWarn', { kind: 'flame' }); } }
    }
    if (v === 'lightning' && S.cfg.mode !== 'drill') {
      S.strikeT -= dt * hz; if (S.strikeT <= 0 && !S.strike && S.phase === 'play') { S.strikeT = U(R, 20, 30); const b = S.ball, a = R() * TAU, r = U(R, 60, 200); S.strike = { x: clamp(b.x + Math.cos(a) * r, G.X0, G.X1), y: clamp(b.y + Math.sin(a) * r, G.Y0, G.Y1), t: 0, hit: false }; banner('LIGHTNING!', '#c0e0ff', 1.4); line('lightning'); bus.emit('hazardWarn', { kind: 'lightning' }); }
    }
  }
  for (const j of S.jets) { if (j.st) { j.t += dt; if (j.st === 1 && j.t > 1) { j.st = 2; j.t = 0; bus.emit('hazard', { kind: 'flame' }); line('flame'); } else if (j.st === 2) { for (const p of S.players) if (alive(p) && p.z < 4 && Math.hypot(p.x - j.x, p.y - j.y) < 12 && p.st !== 'stun') toast(p, 'flame'); if (j.t > 1.2) { j.st = 0; } } } }
  if (S.strike) { const s = S.strike; s.t += dt; if (s.t > 1.4 && !s.hit) { s.hit = true; S.flash = { c: '#ffffff', t: .25 }; bus.emit('hazard', { kind: 'lightning', x: s.x, y: s.y }); for (const p of S.players) if (alive(p) && Math.hypot(p.x - s.x, p.y - s.y) < 36) { toast(p, 'bolt'); } } if (s.t > 2.2) S.strike = null; }
  if (S.chicken) {
    const c = S.chicken; c.t += dt; c.y += c.dir * 105 * dt; c.x += c.vx * dt;
    for (const p of S.players) if (standing(p) && Math.hypot(p.x - c.x, p.y - c.y) < 13) { p.st = 'ground'; p.stT = 1.3; p.vx = c.vx * 2; p.vy = c.dir * 90; if (S.ball.holder === p) dropBall(p.vx, p.vy, 80); bus.emit('chickenBowl', { id: p.id }); }
    if (Math.hypot(S.ref.x - c.x, S.ref.y - c.y) < 14) refDown();
    if (c.y < G.Y0 - 60 || c.y > G.Y1 + 60) S.chicken = null;
  }
  // wind & shake decay
  S.shake = Math.max(0, S.shake - dt * 12);
  if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
}
function toast(p, kind) { p.st = 'stun'; p.stT = kind === 'flame' ? 1.2 : 1.5; p.burn = kind === 'flame' ? 1.2 : 0; p.bolt = kind === 'bolt' ? 1.5 : 0; if (S.ball.holder === p) dropBall(U(S.rng, -40, 40), U(S.rng, -40, 40), 90); bus.emit('toasted', { id: p.id, kind }); if (TT.hitFx) TT.hitFx(p, .8); }
function takePowerup(p, u) {
  u.taken = true; bus.emit('powerupTake', { id: p.id, kind: u.kind }); banner(POWERUPS[u.kind].name + '!', POWERUPS[u.kind].color, 1.6);
  switch (u.kind) { case 'pie': p.power = 'pie'; p.powerT = 6; p.turbo = TUNE.v.turboTank; break; case 'iron': p.iron = 15; break; case 'boot': p.power = 'boot'; break; case 'grease': p.grease = 8; break; case 'horn': S.hype[p.team] = Math.min(100, S.hype[p.team] + 40 * TUNE.v.hypeMult); S.shake = 4; break; }
}

// ---------- referee
function stepRef(dt) {
  const r = S.ref, b = S.ball; r.callT -= dt; r.sigT -= dt; if (r.callT <= 0) r.call = '';
  if (r.down > 0) { r.vx = r.vy = 0; return; }
  const tx = clamp((S.ruckMark ? S.ruckMark.x : b.x) - S.dir[S.poss < 0 ? 0 : S.poss] * 50, G.X0 - 50, G.X1 + 50), ty = clamp((S.ruckMark ? S.ruckMark.y : b.y) - 40, G.Y0 - 20, G.Y1 - 40);
  const dx = tx - r.x, dy = ty - r.y, m = Math.hypot(dx, dy);
  let sp = Math.min(95, m * 2); r.vx = m > 3 ? dx / m * sp : 0; r.vy = m > 3 ? dy / m * sp : 0;
  for (const p of S.players) if (alive(p) && p.z < 4) { const ex = r.x - p.x, ey = r.y - p.y, e = Math.hypot(ex, ey); if (e < 10 && e > .1) { r.x += ex / e * (10 - e) * .3; r.y += ey / e * (10 - e) * .3; } }
  r.x += r.vx * dt; r.y += r.vy * dt;
  const fa = Math.atan2(b.y - r.y, b.x - r.x); r.facing += clamp(angDiff(fa, r.facing), -4 * dt, 4 * dt);
  for (const p of S.players) if (p.st === 'air' && Math.hypot(p.x - r.x, p.y - r.y) < 11) refDown();
}

// ---------- the step
function stepMatch(rawdt, seatI) {
  if (!S || S.over && S.phase === 'fulltime' && false) return;
  const dt = rawdt * TUNE.v.gameSpeed; S.t += dt; S.phaseT += dt; S.elapsed += dt; S.seatI = seatI || S.seatI || [];
  S.banners.forEach(x => x.t -= dt); S.banners = S.banners.filter(x => x.t > 0); if (S.radio) { S.radio.t -= dt; if (S.radio.t <= 0) S.radio = null; }
  if (S.phase === 'intro') { if (S.phaseT > .1) startMatch(); }
  assignControl(dt);
  const ints = buildIntents(dt);
  const ph = S.phase, live = ph === 'play';
  // player timers & states
  for (const p of S.players) {
    if (p.off) continue;
    if (p.stT > 0) { p.stT -= dt; if (p.stT <= 0) { if (p.st === 'ground') { p.st = 'getUp'; p.stT = .4; } else if (p.st === 'getUp' || p.st === 'fall' || p.st === 'stun' || p.st === 'tackling') { p.st = 'run'; p.am = ''; } else if (p.st === 'binned') { /* released below */ } } }
    if (p.st === 'binned' && live) { p.stT -= dt; if (p.stT <= 0 && p.card !== 'red') { p.st = 'run'; place(p, clamp(S.ball.x, G.X0, G.X1), G.Y1 - 6, p.team ? Math.PI : 0); bus.emit('sinBinOut', { id: p.id }); } }
    if (p.st === 'celebrate' && ph !== 'try') { p.st = 'run'; }
    if (ph === 'play' || ph === 'ruck') {
      let I = ints[p.id] || emptyIntent();
      if (!p.dummy || S.cfg.mode === 'drill') actPlayer(p, I, dt);
      if (ph !== 'ruck' || !p.flags.ruck) moveStep(p, (p.dummy && !p.ctl >= 0) ? emptyIntent() : I, dt);
    } else if (ph === 'try' || ph === 'goalscored') { moveStep(p, emptyIntent(), dt); }
    else if (ph === 'halftime') { }
    else { if (p.st === 'air') moveStep(p, emptyIntent(), dt); }
    if (p.st === 'air') { for (const q of S.players) if (q !== p && q.team !== undefined && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 9 && p.z < 30) { q.st = 'ground'; q.stT = 1; q.vx += p.vx * .3; q.vy += p.vy * .3; bus.emit('skittle', { id: q.id }); } }
    if (p.superKind) p.smoke = .2;
  }
  if (ph === 'play' || ph === 'ruck' || ph === 'try') { separate(dt); }
  // ball
  if (S.ball.st !== 'scripted') stepBall(dt);
  if (ph === 'play') {
    stepFlight(dt); if (S.phase === 'play') stepKick(dt); if (S.phase === 'play') stepDropGoal(); if (S.phase === 'play') pickups();
    if (S.phase === 'play') checkOut();
    if (S.phase === 'play') {
      S.clock += dt; const len = TUNE.v.halfLength; S.stats[S.poss >= 0 ? S.poss : 0].poss += (S.poss >= 0 ? dt : 0); S.stats[S.ball.x > G.CX ? (S.dir[0] > 0 ? 0 : 1) : (S.dir[0] > 0 ? 1 : 0)].terr += dt;
      if (!S.sudden && S.clock >= len && !S.hooter) { S.hooter = true; banner('HOOTER! FINISH THE PLAY!', '#ffe070', 2); bus.emit('hooter', {}); line('hooter'); }
      if (S.hooter) { S.hooterT += dt; if (S.hooterT > 40) { checkHalf(); } }
      if (S.sudden) { S.goldenT += dt; if (S.goldenT > 120 && S.cfg.mode !== 'cup') { S.over = true; S.win = -1; setPhase('fulltime'); bus.emit('fulltime', { win: -1 }); } }
      // advantage
      if (S.adv) { S.adv.t -= dt; const car = S.ball.holder; if (car && car.team === S.adv.team) { if (Math.abs(car.x - S.adv.x) > 100) { banner('ADVANTAGE OVER', '#c0ffc0', 1); bus.emit('advantageOver', {}); S.adv = null; } } else if (S.ball.holder && S.ball.holder.team !== S.adv.team || S.adv.lost) { const a = S.adv; S.adv = null; startPenalty(a.team, a.spotX, a.spotY, false); } if (S.adv && S.adv.t <= 0) { const a = S.adv; S.adv = null; startPenalty(a.team, a.spotX, a.spotY, false); } }
      // use it
      if (S.useIt > 0) { S.useIt -= dt; const h = S.ball.holder, m = S.useItMark; if (!h || (m && Math.hypot(h.x - m.x, h.y - m.y) > 30)) S.useIt = 0; else if (S.useIt <= 0) { S.ref.call = 'USE IT!'; S.ref.callT = 1.2; bus.emit('useIt', {}); banner('USE IT!', '#ff6060', 1); startScrumAt(opp(h.team), h.x, h.y); } }
      // carrier metres and line break
      const h = S.ball.holder; if (h) { h.carryT += dt; { const m = Math.max(0, h.vx * S.dir[h.team]) * dt / 10.24; S.stats[h.team].metres += m; h.st_m = (h.st_m || 0) + m; } checkLineBreak(h); if (inGoalOf(h)) { h.ingoalT = (h.ingoalT || 0) + dt; if (h.ingoalT > 2.5 || Math.abs(h.x - ownEnd(h)) < 16) groundBall(h, false); } else h.ingoalT = 0; }
    }
  }
  if (S.phase === 'ruck' && ph === 'ruck') stepRuck(dt);
  if (S.phase === 'scrum' && ph === 'scrum') stepScrum(dt);
  if (S.phase === 'lineout' && ph === 'lineout') stepLineout(dt);
  if (S.phase === 'penalty' && ph === 'penalty') stepPenalty(dt);
  if (S.phase === 'kick' && ph === 'kick') stepGoalKick(dt);
  if (S.phase === 'kickoff' && ph === 'kickoff') stepKickoff(dt);
  if (S.phase === 'try' && ph === 'try') { S.sp.t += dt; if (S.sp.t > 2.3 && !S.replayPlaying) tryEnded(); }
  if (S.phase === 'goalscored' && ph === 'goalscored') { S.sp.t += dt; if (S.sp.t > 2) { if (checkHalf()) return; doKickoff(opp(S.sp.team)); } }
  if (ph === 'halftime') { if (S.phaseT > 6 && S.cfg.mode !== 'attract' || (S.phaseT > 3.5) || (S.seatI.some(i => i && i.x) && S.phaseT > 1)) { S.hooter = false; for (const p of S.players) if (p.st === 'celebrate') p.st = 'run'; doKickoff(1); } }
  stepRef(dt); stepArcade(dt);
  // frame record for replays
  if ((S.frameN++ & 1) === 0 && TT.cfg.present) { S.frames.push(snapFrame()); if (S.frames.length > 300) S.frames.shift(); }
  // watchdogs
  const lim = { kickoff: 40, ruck: 8, scrum: 12, lineout: 16, penalty: 20, kick: 35, try: 12, play: 400, goalscored: 6, halftime: 20 }[ph];
  if (lim && S.phaseT > lim && !S.replayPlaying) { bus.emit('watchdog', { ph }); S.counts.watchdog = (S.counts.watchdog | 0) + 1; if (ph === 'play') S.phaseT = 0; else { S.sp = null; for (const p of S.players) if (p.st === 'scrum' || p.st === 'lineout' || p.st === 'celebrate') p.st = 'run'; doKickoff(S.rng() < .5 ? 0 : 1); } }
  S.dropT += 0;
}
const ownEnd = h => S.dir[h.team] > 0 ? G.X1 + G.ING : G.X0 - G.ING;
function checkLineBreak(h) {
  if (h.broke) { if (S.ball.holder !== h) h.broke = false; return; }
  const d = S.dir[h.team], behind = S.players.filter(q => q.team !== h.team && alive(q) && (q.x - h.x) * d < -2).length, total = S.players.filter(q => q.team !== h.team && alive(q)).length;
  if (total > 1 && behind >= total - 1 && h.carryT > 1 && (h.x - G.CX) * d > -300) { h.broke = true; S.stats[h.team].breaks++; bus.emit('lineBreak', { id: h.id }); addHype(h.team, 8); banner('LINE BREAK!', '#80ffd0', 1.3); line('lineBreak'); }
}
function snapFrame() { return { p: S.players.map(p => [p.x, p.y, p.z, p.facing, p.st, p.am, p.amT, p.vx, p.vy, p.off ? 1 : 0, p.superKind ? 1 : 0, p.onFire > 0 ? 1 : 0, p.flip || 0]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.holder ? S.ball.holder.id : -1], r: [S.ref.x, S.ref.y, S.ref.facing], clock: S.clock, score: S.score.slice() }; }
TT.newMatch = newMatch; TT.stepMatch = stepMatch; TT.get = () => S;
