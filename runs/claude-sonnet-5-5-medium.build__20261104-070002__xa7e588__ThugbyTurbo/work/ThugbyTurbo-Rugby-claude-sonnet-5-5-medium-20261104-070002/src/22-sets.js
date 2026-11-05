/* THUGBY TURBO — set pieces: ruck, scrum, lineout, penalty, goal kicks, kick-offs, tries, half/full time. */
const seatsOf = t => S.seats.map((s, i) => ({ s, i })).filter(o => o.s.team === t);
const humanOn = t => S.seats.some(s => s.team === t && s.kind !== 'cpu' && !s.auto);
const seatPress = (t, k) => { let n = 0; for (const o of seatsOf(t)) { const I = S.seatI && S.seatI[o.i]; if (I && I[k]) n++; } return n; };
const seatHeld = (t, k) => seatsOf(t).some(o => { const I = S.seatI && S.seatI[o.i]; return I && I[k]; });
const seatAxis = t => { let x = 0, y = 0; for (const o of seatsOf(t)) { const I = S.seatI && S.seatI[o.i]; if (I) { x += I.mx; y += I.my; } } return [clamp(x, -1, 1), clamp(y, -1, 1)]; };

function checkHalf() {
  if (!S.hooter || S.phase === 'halftime' || S.phase === 'fulltime') return false;
  if (S.sudden) return false;
  if (S.half === 1) { S.hooter = false; S.sp = null; setPhase('halftime'); S.dir = [-1, 1]; S.half = 2; S.clock = 0; bus.emit('halftime', {}); banner('HALF TIME', '#ffffff', 3); return true; }
  endMatch(); return true;
}
function endMatch() {
  if (S.score[0] === S.score[1] && (S.cfg.mode === 'cup' || TT.settings.suddenDeath) && S.cfg.mode !== 'attract' && S.cfg.mode !== 'drill') { S.sudden = true; S.hooter = false; S.goldenT = 0; banner('SUDDEN DEATH — NEXT SCORE WINS!', '#ff9060', 3); bus.emit('suddenDeath', {}); doKickoff(S.half === 2 ? 1 : 0); return; }
  S.over = true; S.win = S.score[0] > S.score[1] ? 0 : S.score[1] > S.score[0] ? 1 : -1; setPhase('fulltime'); bus.emit('fulltime', { win: S.win }); banner('FULL TIME', '#ffffff', 3);
  pickPotm();
}
function pickPotm() {
  const sc = S.players.map(p => ({ p, v: (p.st_tries || 0) * 10 + (p.st_big || 0) * 4 + (p.st_tkl || 0) + (p.st_m || 0) / 10 }));
  const w = S.win < 0 ? 0 : S.win; const c = sc.filter(o => o.p.team === w).sort((a, b) => b.v - a.v)[0]; S.potm = c ? c.p.id : 0;
}
function afterScore(team, pts, byWhom) {
  S.score[team] += pts; S.lastScoreT = S.t; S.fire[opp(team)] = 0;
  if (S.sudden) { S.over = true; S.win = team; setPhase('fulltime'); bus.emit('fulltime', { win: team }); banner('GOLDEN POINT! GAME OVER!', '#ffe070', 3); pickPotm(); return true; }
  S.tryRun[opp(team)] = 0;
  return false;
}

// ---------- tries
function scoreTry(p, how) {
  if (S.phase === 'try' || S.over) return;
  const t = p.team; S.stats[t].tries++; p.st_tries = (p.st_tries || 0) + 1;
  const pv = S.score.slice();
  S.tries.push({ t: S.t, id: p.id }); S.ball.holder = p; holdPos(p);
  bus.emit('try', { id: p.id, team: t, how }); banner(t === 0 ? 'TRY!' : 'THEIR TRY', '#ffe070', 2); line(t === 0 ? 'try' : 'tryAgainst'); addHype(t, 15);
  p.tryStreak = (p.tryStreak || 0) + 1; for (const q of S.players) if (q.team === t && q !== p) q.tryStreak = q.tryStreak;
  if (p.tryStreak >= 2 && !(p.onFire > 0)) { p.onFire = 90; banner('HE\'S ON FIRE!', '#ff9030', 2); bus.emit('onFire', { id: p.id }); line('onFire'); }
  for (const q of S.players) if (q.team !== t) { q.tryStreak = 0; if (q.onFire > 0) { q.onFire = 0; bus.emit('fireOut', { id: q.id }); } }
  if (afterScore(t, 5)) return;
  if (S.tries.length && S.stats[t].tries) S.replayReq = S.replayReq || 'try';
  setPhase('try'); S.sp = { type: 'try', team: t, id: p.id, t: 0, x: p.x, y: clamp(p.y, G.Y0 + 20, G.Y1 - 20) }; S.useIt = 0; S.adv = null;
  for (const q of S.players) if (alive(q) && q.team === t) { q.st = q.id === p.id ? 'celebrate' : 'celebrate'; q.stT = 9; q.vx = q.vy = 0; q.celeb = (q.id * 3) % 4; }

}
function tryEnded() {
  const t = S.sp.team, p = S.players[S.sp.id], y = S.sp.y;
  if (S.half && S.hooter && checkHalf()) return;
  startConversion(t, p, y, 'conv');
}

// ---------- scrum
function startScrumAt(feed, x, y, why) {
  if (S.phase === 'scrum') return;
  if (why) banner(why, '#ffffff', 1.5); S.ref.call = why || 'SCRUM'; S.ref.callT = 1.5; S.ref.sig = 'scrum'; S.ref.sigT = 1.5;
  const d = S.dir[feed], ax = atkX(feed);
  let sx = clamp(x, G.X0 + 51, G.X1 - 51), sy = clamp(y, G.Y0 + 51, G.Y1 - 51);
  startScrum(feed, sx, sy);
}
function startScrum(feed, x, y) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  S.ball.holder = null; ballTo(x, y, 'placed'); S.useIt = 0; S.adv = null; S.ruckMark = null;
  setPhase('scrum'); S.sp = { type: 'scrum', feed, x, y, step: 'setup', t: 0, bar: .15, setAt: 0, perfect: 0, pushLast: '', pushN: [0, 0], early: false, pressedAt: -1, cpuAcc: 0 };
  bus.emit('scrum', { feed }); line('scrum');
  const A = feed, B = opp(feed), dA = S.dir[A];
  for (const t of [A, B]) {
    const d = S.dir[t], P = teamPlayers(t);
    for (const p of P) { p.flags = {}; if (p.role <= 2) place(p, x - d * (10 + 2), y + (p.role - 1) * 10, d > 0 ? 0 : Math.PI); else if (p.role === 3) place(p, x - d * 16, y + (t === A ? 16 : -16), d > 0 ? 0 : Math.PI); else place(p, x - d * (51 + (p.role - 4) * 14), y + (p.role - 4.5) * 50, d > 0 ? 0 : Math.PI); p.st = 'scrum'; }
  }
}
function stepScrum(dt) {
  const s = S.sp; s.t += dt;
  const humanA = humanOn(s.feed), humanB = humanOn(opp(s.feed));
  const tick = (to, nm) => { if (s.t >= to && s.step !== nm) { s.step = nm; s.stepT = 0; } };
  s.stepT = (s.stepT || 0) + dt;
  const early = (t) => seatPress(t, 'x') > 0;
  if (s.step === 'setup') { if (s.t > 1.5) { s.step = 'crouch'; s.stepT = 0; S.ref.call = 'CROUCH!'; S.ref.callT = .8; bus.emit('scrumCall', { c: 'crouch' }); } }
  else if (s.step === 'crouch' || s.step === 'bind') {
    for (const t of [0, 1]) if (early(t) && S.cfg.mode !== 'attract') { const f = S.players.find(p => p.team === t && p.role === 1 && alive(p)) || S.players.find(p => p.team === t); const ft = opp(t); foul(f, 'early'); return; }
    if (s.step === 'crouch' && s.stepT > .6) { s.step = 'bind'; s.stepT = 0; S.ref.call = 'BIND!'; S.ref.callT = .8; bus.emit('scrumCall', { c: 'bind' }); }
    else if (s.step === 'bind' && s.stepT > .6) { s.step = 'set'; s.stepT = 0; s.setAt = s.t; S.ref.call = 'SET!'; S.ref.callT = .6; bus.emit('scrumCall', { c: 'set' }); }
  } else if (s.step === 'set') {
    for (const t of [0, 1]) {
      if (s.pressed && s.pressed[t] !== undefined) continue; s.pressed = s.pressed || {};
      let tm = null;
      if (seatPress(t, 'x') > 0) tm = s.stepT; else if (!humanOn(t) && s.stepT > .1 && s.stepT < .12 + dt) tm = U(S.fx, 0, .12);
      if (tm !== null) { s.pressed[t] = tm; const q = tm < .12 ? .25 : tm < .25 ? .1 : 0; s.bar += (t === s.feed ? 1 : -1) * q; if (humanOn(t)) { banner(tm < .12 ? 'PERFECT SET!' : tm < .25 ? 'GOOD SET' : 'LATE', tm < .12 ? '#80ff80' : '#ffffff', .8); } }
    }
    if (s.stepT > .5) { s.step = 'push'; s.stepT = 0; s.t0push = s.t; banner('SHOVE!', '#ffe070', 1.2); }
  } else if (s.step === 'push') {
    for (const t of [0, 1]) {
      const sgn = t === s.feed ? 1 : -1; let n = 0;
      for (const k of ['l1', 'r1']) { const c = seatPress(t, k); if (c) { n += c; const same = s.pushLast === k; s.bar += sgn * TUNE.v.scrumPush * (same ? .5 : 1) * c; s.pushLast = k; s.pushN[t]++; } }
      if (!humanOn(t)) s.bar += sgn * dt * (S.cfg.cpuScrum || TUNE.v.cpuMash) * TUNE.v.scrumPush * .5 * U(S.fx, .8, 1.2);
    }
    const powF = [0, 1, 2].reduce((a, r) => a + (S.players[s.feed * N + r].pow), 0), powO = [0, 1, 2].reduce((a, r) => a + (S.players[opp(s.feed) * N + r].pow), 0);
    s.bar += dt * .006 * (powF - powO) * 0.8 + .15 * dt * 0;
    s.bar = clamp(s.bar, -1, 1);
    for (const p of S.players) if (p.st === 'scrum' && p.role <= 2) { const d = S.dir[p.team]; p.x += (s.bar * (p.team === s.feed ? 1 : -1) * 0 + 0) * dt; }
    if (s.stepT > 2.0) {
      const win = s.bar >= 0 ? s.feed : opp(s.feed); bus.emit('scrumWon', { team: win }); addHype(win, 6);
      const collapse = Math.abs(s.bar) > .85;
      const x = s.x, y = s.y;
      if (collapse) {
        const fm = S.players.find(p => p.team === opp(win) && p.role === 1);
        const close = Math.abs(atkX(win) - x) < 50 + 51;
        if (close && S.dir[win]) { bus.emit('pushoverTry', {}); banner('PUSHOVER TRY!', '#ffe070', 2); return pushoverTry(win, x, y); }
        banner('SCRUM COLLAPSED!', '#ff6060', 1.2); return startPenalty(win, x, y, false);
      }
      scrumOut(win, x, y);
    }
  }
}
function pushoverTry(team, x, y) {
  const p = S.players.find(q => q.team === team && q.role === 3) || teamPlayers(team)[0];
  place(p, atkX(team) + S.dir[team] * 4, y); giveBall(p); scoreTry(p, 'pushover');
}
function scrumOut(win, x, y) {
  const sh = S.players.find(p => p.team === win && p.role === 3 && alive(p)) || teamPlayers(win)[0];
  for (const p of S.players) if (p.st === 'scrum') { p.st = 'run'; }
  const d = S.dir[win]; place(sh, x - d * 16, y); giveBall(sh); S.useIt = 3; S.useItMark = { x: sh.x, y: sh.y };
  spreadOut(win, x, y); setPhase('play'); S.sp = null; S.ruckMark = null; sh.facing = d > 0 ? 0 : Math.PI;
  for (const p of S.players) if (p.team !== win && alive(p)) { /* back off */ const dd = S.dir[p.team]; if ((p.x - x) * d < 20) p.x = x + d * 20; }
}
function spreadOut(team, x, y) { const d = S.dir[team]; for (const p of teamPlayers(team)) { if (p.role === 3 && S.ball.holder === p) continue; p.st = p.st === 'scrum' || p.st === 'lineout' ? 'run' : p.st; const slot = p.role - 3; p.x = clamp(x - d * (14 + Math.abs(slot) * 20), G.X0 - 60, G.X1 + 60); p.y = clamp(y + (slot) * 44, G.Y0 + 10, G.Y1 - 10); p.vx = p.vy = 0; p.facing = d > 0 ? 0 : Math.PI; } }

// ---------- lineout
function startLineout(throwTeam, x, y) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  const side = y < G.CY ? -1 : 1, ty = side < 0 ? G.Y0 : G.Y1, lx = clamp(x, G.X0 + 51, G.X1 - 51);
  ballTo(lx, ty, 'placed'); S.useIt = 0; S.adv = null; S.ruckMark = null; S.ball.z = 12;
  setPhase('lineout'); bus.emit('lineout', { team: throwTeam }); line('lineout'); banner('LINEOUT', '#ffffff', 1.2);
  S.sp = { type: 'lineout', throwTeam, x: lx, ty, side, step: 'call', t: 0, pods: [0, 1, 2], callT: -1, defT: -1, needle: 0, nd: 1, quality: -1, jump: 0, press: -1, arrive: 0, result: '', stepT: 0 };
  for (const t of [throwTeam, opp(throwTeam)]) {
    const P = teamPlayers(t), inward = -side;
    for (const p of P) { p.st = 'lineout'; p.flags = {}; p.vx = p.vy = 0;
      if (p.role <= 2) { const pod = p.role; place(p, lx + (pod - 1) * 16, ty + inward * (t === throwTeam ? 20 : 12), side < 0 ? Math.PI / 2 : -Math.PI / 2); p.st = 'lineout'; }
      else if (p.role === 3) place(p, lx + (t === throwTeam ? -22 : 22), ty + inward * 60, side < 0 ? Math.PI / 2 : -Math.PI / 2);
      else place(p, lx + (p.role - 5) * 60 * (t === throwTeam ? 1 : 1), ty + inward * (110 + (t === throwTeam ? 0 : 20)), side < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  const th = S.players.find(p => p.team === throwTeam && p.role === 1); place(th, lx, ty - side * 6, side < 0 ? Math.PI / 2 : -Math.PI / 2); th.st = 'lineout';
}
function stepLineout(dt) {
  const s = S.sp; s.t += dt; s.stepT += dt; const T = s.throwTeam, D = opp(T);
  const cycle = (cur, t) => { let c = cur; if (seatPress(t, 'l1')) c = (c + 2) % 3; if (seatPress(t, 'r1')) c = (c + 1) % 3; const a = seatAxis(t); if (!s.axisHold && Math.abs(a[1]) > .6) { c = (c + (a[1] > 0 ? 1 : 2)) % 3; s.axisHold = true; } if (Math.abs(a[1]) < .3) s.axisHold = false; return c; };
  if (s.step === 'call') {
    if (s.callT < 0) s.callT = 1; if (s.defT < 0) s.defT = 1; s.callPod = s.callPod === undefined ? 1 : s.callPod; s.defPod = s.defPod === undefined ? 1 : s.defPod;
    if (humanOn(T)) s.callPod = cycle(s.callPod, T); if (humanOn(D)) s.defPod = cycle(s.defPod, D);
    const ready = (!humanOn(T) || seatPress(T, 'x')) && (!humanOn(D) || seatPress(D, 'x') || s.t > 2.5);
    if (s.t > 2.5 || (ready && s.t > .5)) {
      if (!humanOn(T)) { const r = S.fx(); s.callPod = r < .4 ? 0 : r < .75 ? 1 : 2; }
      if (!humanOn(D)) { s.defPod = S.fx() < (S.cfg.lineoutRead || .35) ? s.callPod : (s.callPod + 1 + (S.fx() < .5 ? 0 : 1)) % 3; }
      s.step = 'throw'; s.stepT = 0; s.nd = 1; s.needle = 0; bus.emit('lineoutCall', {});
    }
  } else if (s.step === 'throw') {
    s.needle += s.nd * dt * 1.6; if (s.needle > 1) { s.needle = 1; s.nd = -1; } if (s.needle < 0) { s.needle = 0; s.nd = 1; }
    let stop = false;
    if (humanOn(T)) { if (seatPress(T, 'x')) stop = true; } else if (s.stepT > .7 + (S.fx() * 0 + .3)) stop = true;
    if (s.stepT > 3.2) stop = true;
    if (stop) {
      let off = Math.abs(s.needle - .5);
      if (!humanOn(T)) off = Math.min(off, U(S.fx, 0, .35 - .02 * (S.players[T * N + 1].hnd)));
      s.quality = off < .12 ? 1 : off < .25 ? .6 : 0;
      if (s.quality === 0) { s.result = 'NOT STRAIGHT!'; bus.emit('notStraight', {}); S.ref.call = 'NOT STRAIGHT!'; S.ref.callT = 1.4; banner('NOT STRAIGHT!', '#ff6060'); return finishLineout(D, 'scrum'); }
      s.step = 'jump'; s.stepT = 0; s.arrive = .75; s.jumper = S.players.find(p => p.team === T && p.role === s.callPod);
      s.dj = S.players.find(p => p.team === D && p.role === s.defPod); bus.emit('lineoutThrow', { q: s.quality });
    }
  } else if (s.step === 'jump') {
    const k = clamp(s.stepT / s.arrive, 0, 1); const jmp = s.jumper; if (jmp) { jmp.z = 60 * Math.sin(k * Math.PI * .5) * (1); }
    if (s.dj && s.defPod === s.callPod) { s.dj.z = 50 * Math.sin(k * Math.PI * .5); }
    if (humanOn(D) && s.press < 0 && seatPress(D, 'x')) s.press = s.stepT;
    if (s.stepT >= s.arrive) {
      let thrownWin = true;
      if (s.defPod === s.callPod) {
        const hndA = s.jumper ? s.jumper.hnd : 5, hndD = s.dj ? s.dj.hnd : 5;
        const atk = .6 * s.quality + .04 * hndA + .15;
        let timing = humanOn(D) ? (s.press < 0 ? 0 : clamp(1 - Math.abs(s.press - s.arrive) / .3, 0, 1)) : clamp(1 - Math.abs(U(S.fx, -1, 1) * (S.cfg.lineoutSigma || .2)) / .3, 0, 1);
        const def = .6 * timing + .04 * hndD; thrownWin = atk >= def;
      }
      if (!thrownWin) { banner('STOLEN!', '#ff8060', 1.2); addHype(D, 8); } else banner('INTO ORBIT!', '#80e0ff', 1);
      bus.emit(thrownWin ? 'lineoutWon' : 'lineoutStolen', { team: thrownWin ? T : D });
      if (thrownWin) addHype(T, 4);
      finishLineout(thrownWin ? T : D, 'ball');
    }
  }
}
function finishLineout(win, how) {
  const s = S.sp; for (const p of S.players) { p.z = 0; if (p.st === 'lineout') p.st = 'run'; }
  if (how === 'scrum') return startScrum(win, s.x, clamp(s.ty + (s.side < 0 ? 60 : -60), G.Y0 + 51, G.Y1 - 51));
  const sh = S.players.find(p => p.team === win && p.role === 3 && alive(p)) || teamPlayers(win)[0];
  const d = S.dir[win], y = s.ty + (s.side < 0 ? 40 : -40);
  place(sh, s.x - d * 10, y); giveBall(sh); S.useIt = 0; spreadOut(win, s.x, y); setPhase('play'); S.sp = null; if (S.cfg.mode === 'drill') S.counts.lineoutWon = (S.counts.lineoutWon || 0);
  for (const p of S.players) if (p.team !== win && alive(p) && (p.x - s.x) * d < 20) p.x = s.x + d * 24;
}

// ---------- penalty and free kick
function startPenalty(team, x, y, free) {
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  S.adv = null; S.useIt = 0; S.ruckMark = null; S.ball.holder = null;
  const mx = clamp(x, G.X0 + 20, G.X1 - 20), my = clamp(y, G.Y0 + 40, G.Y1 - 40);
  ballTo(mx, my, 'placed'); S.ball.z = 1;
  const kp = S.players.filter(p => p.team === team && alive(p)).sort((a, b) => b.kck - a.kck)[0];
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'getUp' || p.st === 'fall' || p.st === 'air') p.st = 'run'; p.vx = p.vy = 0; p.flags = {}; }
  const d = S.dir[team];
  for (const p of teamPlayers(team)) place(p, mx - d * (12 + p.role * 6), my + (p.role - 3) * 30);
  for (const p of teamPlayers(opp(team))) { const od = S.dir[opp(team)]; place(p, mx + d * (110 + p.role * 6), my + (p.role - 3) * 30); }
  place(kp, mx - d * 6, my);
  const dist = Math.hypot(atkX(team) - mx, my - G.CY);
  const opts = free ? ['TAP & GO', 'KICK FOR TOUCH'] : ['TAP & GO', 'KICK AT GOAL', 'KICK FOR TOUCH'];
  setPhase('penalty'); S.sp = { type: 'penalty', team, x: mx, y: my, kicker: kp.id, free, opts, sel: dist < 400 ? 1 : 0, t: 0, dist, axisHold: false };
  if (free) S.sp.sel = 0; bus.emit('penalty', { team, free });
}
function stepPenalty(dt) {
  const s = S.sp; s.t += dt; const T = s.team;
  let pick = null;
  if (humanOn(T)) {
    const a = seatAxis(T); let m = 0; if (!s.axisHold && Math.abs(a[0]) > .6) { m = a[0] > 0 ? 1 : -1; s.axisHold = true; } if (Math.abs(a[0]) < .3) s.axisHold = false;
    if (seatPress(T, 'l1')) m = -1; if (seatPress(T, 'r1')) m = 1;
    s.sel = clamp(s.sel + m, 0, s.opts.length - 1);
    if (s.t > .4 && seatPress(T, 'x')) pick = s.opts[s.sel];
    if (S.cfg.mode === 'attract') pick = s.t > 1 ? s.opts[s.sel] : null;
  } else if (s.t > 1.1) {
    const lead = S.score[T] - S.score[opp(T)], late = S.half === 2 && S.clock > TUNE.v.halfLength * .8;
    if (!s.free && s.dist < 320 && (Math.abs(lead) < 8 || late)) pick = 'KICK AT GOAL'; else if (Math.abs(atkX(T) - s.x) < 120) pick = 'TAP & GO'; else pick = 'KICK FOR TOUCH';
    if (s.free && Math.abs(atkX(T) - s.x) < 160) pick = 'TAP & GO';
  }
  if (!pick) return;
  const kp = S.players[s.kicker]; bus.emit('choice', { pick });
  if (pick === 'TAP & GO') { giveBall(kp); setPhase('play'); S.sp = null; for (const p of teamPlayers(opp(T))) { const d = S.dir[T]; if ((p.x - s.x) * d < 102) p.x = s.x + d * 102; } banner('TAP & GO!', '#ffe070', 1); }
  else if (pick === 'KICK AT GOAL') startConversion(T, kp, s.y, 'pen', s.x);
  else { giveBall(kp); const d = S.dir[T], ty = s.y < G.CY ? G.Y0 - 80 : G.Y1 + 80; setPhase('play'); S.sp = null; const aim = [d * .5, (ty - s.y) / 400]; doKick(kp, 'punt', .8, aim); S.touchKeep = T; }
}

// ---------- goal kicks: conversions and penalty goals
function startConversion(team, p, y, kind, px) {
  if (S.cfg.mode !== 'drill' && S.hooter && S.phase === 'try') { /* half may end after the kick */ }
  const atk = atkX(team), d = S.dir[team];
  let x, dist, ky = clamp(y, G.Y0 + 30, G.Y1 - 30);
  if (kind === 'conv') { dist = clamp(Math.abs(atk - (p ? p.x : atk)) + 60, 51, 400); x = atk - d * dist; if (Math.abs(ky - G.CY) > 250) ky = G.CY + Math.sign(ky - G.CY) * 250; }
  else { x = px; dist = Math.abs(atk - x); }
  const kp = S.players.filter(q => q.team === team && alive(q)).sort((a, b) => b.kck - a.kck)[0] || p;
  S.adv = null; S.ruckMark = null; S.useIt = 0;
  for (const q of S.players) { if (q.st === 'celebrate' || q.st === 'ground' || q.st === 'down' || q.st === 'getUp') q.st = 'run'; q.vx = q.vy = 0; q.flags = {}; }
  for (const q of teamPlayers(team)) place(q, x - d * 40 - q.role * 8, ky + (q.role - 3) * 26);
  for (const q of teamPlayers(opp(team))) place(q, atk + d * 90 - d * 20 * (q.role % 3), G.CY + (q.role - 3) * 26);
  place(kp, x - d * 12, ky, d > 0 ? 0 : Math.PI);
  ballTo(x, ky, 'placed'); S.ball.z = 3;
  setPhase('kick'); S.sp = { type: 'kick', kind, team, kicker: kp.id, x, y: ky, dist, step: kind === 'conv' ? 'place' : 'aim', t: 0, shot: 20, aimX: 0, sway: 0, power: 0, charging: false, fly: 0, res: '', ox: x, tickLow: false, drift: S.wind * S.windDir };
  S.score_before = S.score.slice();
}
function kickNeed(dist) { return clamp(dist / (TUNE.v.kickMax * .95), .3, 1); }
function stepGoalKick(dt) {
  const s = S.sp, T = s.team, d = S.dir[T], kp = S.players[s.kicker]; s.t += dt;
  const hum = humanOn(T);
  if (s.step === 'place' || s.step === 'aim' || s.step === 'power') s.shot -= dt;
  if (s.step === 'place') {
    if (hum) { const a = seatAxis(T); s.dist = clamp(s.dist + (-a[0] * d) * 120 * dt, 51, 400); s.x = atkX(T) - d * s.dist; ballTo(s.x, s.y, 'placed'); S.ball.z = 3; place(kp, s.x - d * 12, s.y, d > 0 ? 0 : Math.PI); if (seatPress(T, 'x') || S.cfg.mode === 'attract' && s.t > 1.2) { s.step = 'aim'; s.t = 0; } if (seatPress(T, 'ci')) { s.step = 'aim'; s.t = 0; } }
    else if (s.t > .6) { s.step = 'aim'; s.t = 0; }
  } else if (s.step === 'aim') {
    const sway = Math.sin(s.t * 2.2) * (1.2 - kp.kck * .08) * (S.cfg.swayMult || 1) * .12 * (1 + (S.cfg.mode === 'cup' ? .2 : 0)); s.sway = sway;
    if (hum) { const a = seatAxis(T); s.aimX = clamp(s.aimX + a[1] * 1.0 * dt * (d > 0 ? 1 : -1), -.5, .5); s.aimX = clamp(s.aimX + a[0] * 0, -.5, .5); if (seatHeld(T, 'hci') && !s.charging) { s.charging = true; s.step = 'power'; s.pt = 0; } if (S.cfg.mode === 'attract' && s.t > 1.2) { s.step = 'power'; s.pt = 0; s.charging = true; s.auto = true; } }
    else if (s.t > 1.0) { s.step = 'power'; s.pt = 0; s.charging = true; s.cpu = true; }
    if (s.shot <= 0) { return goalKickFail('NO TIME!'); }
  } else if (s.step === 'power') {
    s.pt += dt; s.power = clamp(s.pt / 1.3, 0, 1);
    let rel = false;
    if (s.cpu || s.auto) { const need = kickNeed(s.dist); if (s.power >= need + (S.fx() * 0 + .03)) rel = true; s.cpuErr = s.cpuErr === undefined ? (S.fx() - .5) * (.5 - kp.kck * .03) : s.cpuErr; }
    else if (!seatHeld(T, 'hci') || seatPress(T, 'rci') || s.power >= 1) rel = true;
    if (rel) executeGoalKick();
    if (s.shot <= 0 && !rel) goalKickFail('NO TIME!');
  } else if (s.step === 'fly') {
    s.fly += dt; const k = clamp(s.fly / s.T, 0, 1), b = S.ball;
    b.x = lerp(s.sx, s.ex, k); b.y = lerp(s.sy, s.ey, k); b.z = 3 + (s.ez - 3) * k + 4 * s.apex * k * (1 - k); b.rot += 12 * dt;
    if (k >= 1) finishGoalKick();
  } else if (s.step === 'done') { if (s.t2 === undefined) s.t2 = 0; s.t2 += dt; if (s.t2 > 1.3) afterGoalKick(); }
}
function executeGoalKick() {
  const s = S.sp, kp = S.players[s.kicker], T = s.team, d = S.dir[T], need = kickNeed(s.dist);
  const toPosts = Math.atan2(G.CY - s.y, Math.abs(atkX(T) - s.x)); // angle off the pitch axis toward the middle of the posts
  let hook = 0; const miss = Math.abs(s.power - need);
  if (miss > .06) hook = (S.rng() * 2 - 1) * (12 - kp.kck) * Math.PI / 180 * (1 + miss * 2);
  if (kp.power === 'boot' || (S.players.some(q => q.team === T && q.power === 'boot'))) { hook *= .5; }
  let aimOff = s.aimX * .22; if (s.cpu) aimOff = (s.cpuErr || 0) * (1 - kp.kck * .06) * (s.dist / 300) * (S.cfg.kickErr || 1);
  const wind = s.drift * 6 * TUNE.v.windMult * Math.PI / 180 * (s.dist / 250);
  const ang = toPosts + aimOff + s.sway + hook + wind * 0;
  const dxp = Math.abs(atkX(T) - s.x), yc = s.y + Math.tan(ang) * dxp * Math.sign(1) + wind * dxp * .4;
  let res = 'good';
  if (s.power < need - .06) res = 'short'; else if (Math.abs(Math.abs(yc - G.CY) - G.POST) < 4) res = 'doink'; else if (Math.abs(yc - G.CY) > G.POST) res = 'wide';
  const ex = atkX(T) + d * (res === 'short' ? -Math.max(10, (need - s.power) * 300) : 6);
  Object.assign(s, { step: 'fly', sx: s.x, sy: s.y, ex: res === 'short' ? s.x + d * Math.max(40, s.dist * (s.power / need)) : ex, ey: res === 'short' ? s.y + (yc - s.y) * .6 : yc, ez: res === 'short' ? 0 : res === 'good' ? 70 : 60, apex: 70, T: .9 + s.dist / 500, fly: 0, res, t: 0 });
  S.ball.st = 'scripted'; S.ball.holder = null; kp.am = 'kick'; kp.amT = 0; S.ball.rotV = 10;
  bus.emit('kick', { id: kp.id, kind: 'goal', dist: s.dist });
}
function finishGoalKick() {
  const s = S.sp, T = s.team; s.step = 'done'; s.t2 = 0;
  const b = S.ball; b.z = s.res === 'good' ? 60 : 0;
  if (s.res === 'good') {
    const pts = s.kind === 'conv' ? 2 : 3; S.stats[T].convs += s.kind === 'conv' ? 1 : 0; banner(s.kind === 'conv' ? 'CONVERSION! +2' : 'PENALTY GOAL! +3', '#80ff80', 1.6);
    bus.emit(s.kind === 'conv' ? 'conversion' : 'penaltyGoal', { team: T }); line('conversion'); addHype(T, 5); s.pts = pts; s.scored = true; if (s.kind === 'conv') S.stats[T].convTries++;
  } else { banner(s.res === 'doink' ? 'DOINK!' : s.res === 'short' ? 'SHORT!' : 'WIDE!', '#ff8080', 1.4); line('miss'); bus.emit('goalMiss', { res: s.res }); if (s.kind === 'conv') S.stats[T].convTries++; }
  b.st = 'dead';
}
function goalKickFail(msg) { const s = S.sp; banner(msg, '#ff8080', 1.2); s.res = 'miss'; s.step = 'done'; s.t2 = 0; if (s.kind === 'conv') S.stats[s.team].convTries++; bus.emit('goalMiss', { res: 'clock' }); }
function afterGoalKick() {
  const s = S.sp, T = s.team; let pts = s.scored ? s.pts : 0;
  if (pts && afterScore(T, pts)) return;
  if (S.cfg.mode === 'drill') { return drillAfterKick(); }
  if (checkHalf()) return;
  doKickoff(s.kind === 'conv' ? T : opp(T));
}
function drillAfterKick() { S.sp = null; startDrill(S.cfg.drill); }

// ---------- kick-offs and drop-outs
function stepKickoff(dt) {
  const s = S.sp; s.t += dt; const T = s.team, kp = S.players[s.kicker], d = S.dir[T];
  const hum = humanOn(T);
  if (hum && S.cfg.mode !== 'attract') {
    const a = seatAxis(T); s.aim.x = clamp(s.aim.x + a[0] * dt * 2 * d, -1, 1); s.aim.y = clamp(s.aim.y + a[1] * dt * 1.6, -1, 1);
    if (seatHeld(T, 'hci')) s.power = clamp(s.power + dt / .9, 0, 1); else if (s.power > 0) { return kickOffNow(s.power); }
    if (s.t > 25) return kickOffNow(.6);
  } else if (s.t > 1.4) { s.aim.y = U(S.fx, -.9, .9); return kickOffNow(U(S.fx, .35, .6)); }
}
function kickOffNow(power) {
  const s = S.sp, T = s.team, d = S.dir[T], kp = S.players[s.kicker], R = opp(T);
  const ox = s.dropout ? s.x : G.CX, dist = s.dropout ? lerp(180, 520, power) : lerp(110, 400, power) * (.8 + .02 * kp.kck), tx = ox + d * dist, ty = clamp(G.CY + s.aim.y * 220, G.Y0 + 30, G.Y1 - 30);
  const b = S.ball; const flight = 1.1 + power * .7;
  b.holder = null; b.st = 'kick'; b.x = ox; b.y = s.dropout ? s.y : G.CY; b.z = 8; b.vx = (tx - b.x) / flight; b.vy = (ty - b.y) / flight; b.vz = (300 * flight * flight * 0 + 0.5 * 600 * flight - 8 / flight); b.vz = (0 - 8 + 300 * flight * flight) / flight; b.rotV = 10; b.kind = 'kickoff'; b.lastKicker = kp.id; b.kickT = 0;
  kp.am = 'kick'; kp.amT = 0; S.lastTeam = T; S.lastTouch = kp.id; S.poss = -1; S.kickInfo = { x: tx, y: ty, t: S.t, T: flight };
  const short = !s.dropout && dist < 102; setPhase('play'); S.sp = null; for (const p of S.players) if (p.st === 'scrum') p.st = 'run';
  bus.emit('kick', { id: kp.id, kind: 'kickoff', dist });
  if (short) { S.kickShort = true; banner('NOT TEN!', '#ff8060', 1.4); bus.emit('notTen', {}); freeKickAtHalfway(R); }
  S.firstTouchGuard = 0;
}
function freeKickAtHalfway(R) { const b = S.ball; const p = S.players.filter(q => q.team === R && alive(q))[0]; ballTo(G.CX, G.CY, 'placed'); startPenalty(R, G.CX, G.CY, true); }
function startDropOut(team) {
  const x = ownX(team) + S.dir[team] * 225, d = S.dir[team];
  if (S.cfg.mode !== 'drill' && checkHalf()) return;
  const kp = kickerOf(team), rec = opp(team);
  S.ball.holder = null; S.adv = null; S.useIt = 0; S.ruckMark = null;
  for (const p of S.players) { if (p.st === 'down' || p.st === 'ground' || p.st === 'getUp' || p.st === 'fall' || p.st === 'air') p.st = 'run'; p.flags = {}; }
  for (const p of teamPlayers(team)) place(p, x - d * (8 + (p.role === 4 ? 0 : 30 + p.role * 8)), G.CY + (p.role - 3) * 48, d > 0 ? 0 : Math.PI);
  place(kp, x - d * 6, G.CY, d > 0 ? 0 : Math.PI);
  for (const p of teamPlayers(rec)) place(p, x + d * (120 + p.role * 14), G.CY + (p.role - 3) * 54, d < 0 ? 0 : Math.PI);
  ballTo(x, G.CY, 'placed'); S.ball.z = 2; setPhase('kickoff');
  S.sp = { type: 'kickoff', team, kicker: kp.id, aim: { x: 0, y: 0 }, power: 0, t: 0, dropout: true, x, y: G.CY };
  banner('22 DROP-OUT', '#ffffff', 1.4); bus.emit('dropOut', { team });
}
