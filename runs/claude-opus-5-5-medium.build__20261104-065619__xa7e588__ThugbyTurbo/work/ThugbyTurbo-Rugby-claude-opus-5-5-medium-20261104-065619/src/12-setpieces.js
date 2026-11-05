/* ---- SET PIECES: the breakdown, scrum, lineout, penalties and free kicks, conversions and penalty goals ---- */
TT.sp = {};
const humansOf = team => M.players.filter(p => p.team === team && p.ctl >= 0).map(p => M.intents[p.id]).filter(Boolean);
const anyPress = (list, k) => list.reduce((n, it) => n + (it.p && it.p[k] ? 1 : 0), 0);
TT.sim.humansOf = t => humansOf(t);
/** walk a player toward a spot (sets the velocity; the players' step moves him); snap: put him there */
function placeTo(p, x, y, dt, speed = 95, face) {
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { p.vx = 0; p.vy = 0; p.x = x; p.y = y; }
  else { const s = Math.min(speed, d / dt); p.vx = dx / d * s; p.vy = dy / d * s; if (face == null) p.facing = Math.atan2(dy, dx); }
  if (face != null && d < 6) p.facing = face;
}
const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += rnd(); return (s - 2) / .58; };
const diffOf = team => M.diff[team] || TT.DIFF.Pro;

/* ---- THE RUCK ---- */
TT.sp.startRuck = c => {
  const team = c.team, d = dirOf(team), b = M.ball;
  b.st = 'placed'; b.holder = -1; b.x = c.x - d * 8; b.y = c.y; b.z = 0; b.vx = b.vy = b.vz = 0;
  const near = (t, n) => M.players.filter(p => p.team === t && p !== c && standing(p) && p.st !== 'tackling' && Math.hypot(p.x - b.x, p.y - b.y) < 80)
    .sort((a, b2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(b2.x - b.x, b2.y - b.y)).slice(0, n);
  const att = near(team, 2).filter(p => p.idx !== 3), def = near(1 - team, rnd() < .5 ? 1 : 2);
  att.forEach(p => { p.st = 'ruck'; p.stT = 0; }); def.forEach(p => { p.st = 'ruck'; p.stT = 0; });
  const sum = l => l.reduce((s, p) => s + Math.min(10, statOf(p, 'POW')), 0);
  const ph = { team, x: b.x, y: b.y, tackled: c.id, att: att.map(p => p.id), def: def.map(p => p.id), bar: .2 + .1 * (att.length - def.length), powA: sum(att), powD: sum(def), jackal: false, done: false, outT: 0 };
  // a CPU jackal: the first defender there may get his hands on it
  const first = def[0];
  if (first && first.ctl < 0 && Math.hypot(first.x - b.x, first.y - b.y) < 30 && rnd() < .15 + .3 * M.teams[first.team].style.aggression * TUNE.v.aiAggression * 2) { ph.bar -= .5; ph.jackal = true; emit('jackal', { pid: first.id }); }
  setPhase('ruck', ph);
  M.stats[team].rucks++;
  emit('ruck', { team, x: b.x, y: b.y });
};
TT.sp.ruckStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), b = M.ball, T = TUNE.v.ruckTime;
  if (ph.done) return;
  // the bodies bound over the ball
  ph.att.forEach((id, i) => { const p = pl(id); if (p.st === 'ruck') { p.x = lerp(p.x, b.x - d * 7, .2); p.y = lerp(p.y, b.y + (i ? 5 : -5), .2); p.facing = d > 0 ? 0 : PI; p.vx = p.vy = 0; } });
  ph.def.forEach((id, i) => { const p = pl(id); if (p.st === 'ruck') { p.x = lerp(p.x, b.x + d * 7, .2); p.y = lerp(p.y, b.y + (i ? -5 : 5), .2); p.facing = d > 0 ? PI : 0; p.vx = p.vy = 0; } });
  const c = pl(ph.tackled); if (c.st === 'tackled') { c.stT = Math.min(c.stT, .6); }
  // the contest: weight of bodies, mashing (humans' ✕; the CPU at its rate), the jackal
  ph.bar += .02 * (ph.powA - ph.powD) * dt;
  for (const t of [team, 1 - team]) {
    const H = humansOf(t), sign = t === team ? 1 : -1;
    if (H.length) {
      ph.bar += sign * anyPress(H, 'x') * TUNE.v.mashWeight;
      if (t !== team) for (const it of H) if (it.p.sq) {
        const who = M.players.find(p => p.team === t && p.ctl >= 0 && M.intents[p.id] === it);
        if (!ph.jackal && M.phaseT < .5 && who && Math.hypot(who.x - b.x, who.y - b.y) < 32) { ph.bar -= .5; ph.jackal = true; emit('jackal', { pid: who.id }); }
        else if (who && M.phaseT >= .5 && Math.hypot(who.x - b.x, who.y - b.y) < 32 && !ph.handsCalled) { ph.handsCalled = true; if (foul(who, 'hands', false)) return; }
      }
    } else {
      const rate = (cheat('cpuFrozen') ? 0 : (M.diff[t] ? M.diff[t].cpuMash : TUNE.v.cpuMash)) * (TUNE.v.cpuMash / 9);
      ph.bar += sign * rate * TUNE.v.mashWeight * dt * U(.8, 1.2);
    }
  }
  ph.bar = clamp(ph.bar, -1, 1);
  if (M.phaseT < T) return;
  // the result: the attack's scrum-half has it at the base, or a turnover
  ph.done = true;
  const won = ph.bar >= 0, t2 = won ? team : 1 - team;
  for (const id of ph.att.concat(ph.def)) { const p = pl(id); if (p.st === 'ruck') { p.st = 'getup'; p.stT = .1; } }
  if (c.st === 'tackled') { c.st = 'getup'; c.stT = 0; }
  const cands = M.players.filter(p => p.team === t2 && standing(p) && isFree(p));
  const sh = cands.find(p => p.idx === 3 && Math.hypot(p.x - b.x, p.y - b.y) < 60) || cands.sort((a, b2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(b2.x - b.x, b2.y - b.y))[0];
  // offside: a human defender in front of the line, closing on the ball as it comes out (if the ref sees it)
  const dA = dirOf(t2), line = b.x + dA * 10;
  for (const p of M.players) if (p.team !== t2 && p.ctl >= 0 && standing(p) && (p.x - line) * dA < 0 && Math.hypot(p.x - b.x, p.y - b.y) < 30 && !ph.att.concat(ph.def).includes(p.id)) { setPhase('play'); if (sh) giveBall(sh, 'ruck'); if (foul(p, 'offside', false)) return; }
  setPhase('play');
  if (!sh) { b.st = 'loose'; return; }
  sh.x = b.x - dA * 6; sh.y = b.y; sh.facing = dA > 0 ? 0 : PI;
  giveBall(sh, won ? 'ruck' : 'turnover');
  if (won) { emit('ruckWon', { team }); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 }; }
  else { M.stats[t2].turnovers++; addHype(t2, 8); emit('ruckTurnover', { team: t2, pid: sh.id }); }
};

/* ---- THE SCRUM ---- */
function scrum(team, x, y, why) {
  x = clamp(x, G.X0 + 51, G.X1 - 51); y = clamp(y, G.Y0 + 51, G.Y1 - 51);
  M.ball.st = 'dead'; M.ball.x = x; M.ball.y = y + 12; M.ball.z = 4; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, x, y, why, bar: .15, timing: [null, null], early: -1, last: [null, null], cpuSet: [null, null], cpuNext: [0, 0], pushes: [0, 0], result: null, cx: x };
  for (const t of [0, 1]) { const D = diffOf(t); ph.cpuSet[t] = rnd() < (cheat('cpuFrozen') ? 0 : D.early) * .5 ? -1 : .5 + gauss() * D.scrumSigma; }
  setPhase('scrum', ph); setSub('setup');
  M.stats[team].scrums++;
  emit('scrum', { team, x, y, why });
}
TT.sp.scrum = (t, x, y, w) => scrum(t, x, y, w);
TT.sp.scrumStep = dt => {
  const ph = M.ph, feed = ph.team, other = 1 - feed, s = M.sub, st = ph.subT;
  const off = ph.bar * 16 * dirOf(feed);   // the scrum moves with the shove
  ph.cx = lerp(ph.cx, ph.x + off, .1);
  for (const p of M.players) {
    if (!onField(p)) continue;
    const dT = dirOf(p.team), cx = ph.cx;
    let tx, ty, face = dT > 0 ? 0 : PI;
    if (p.idx < 3) { tx = cx - dT * (s === 'setup' ? 18 : 8); ty = ph.y + (p.idx - 1) * 11 * dT; }
    else if (p.idx === 3) { tx = cx - dT * (p.team === feed ? 2 : 14); ty = ph.y + 16; }
    else { tx = clamp(ph.x - dT * (60 + (p.idx - 4) * 26), G.X0 - 60, G.X1 + 60); ty = clamp(ph.y + [0, -90, 120, -150][p.idx - 3] * (ph.y > G.CY ? -1 : 1), G.Y0 + 16, G.Y1 - 16); }
    placeTo(p, tx, ty, dt, 110, face);
    if (p.idx < 3) p.st = s === 'setup' ? 'run' : 'scrum';
  }
  const H = [humansOf(0), humansOf(1)];
  const setAt = .5;
  if (s === 'setup') { if (st > 1.5) { setSub('crouch'); M.ref.call = 'CROUCH!'; M.ref.callT = .8; emit('scrumCall', { word: 'CROUCH' }); } }
  else if (s === 'crouch' || s === 'bind') {
    for (const t of [0, 1]) if (H[t].length && anyPress(H[t], 'x')) { ph.early = t; }
    if (ph.early >= 0) { const t = ph.early; emit('earlyEngage', { team: t }); for (const p of M.players) if (p.st === 'scrum') p.st = 'run'; return stop('EARLY ENGAGEMENT', 1.4, () => freeKick(1 - t, ph.x, ph.y, 'early'), { call: 'FREE KICK!', noHooter: true }); }
    if (st > .6) { if (s === 'crouch') { setSub('bind'); M.ref.call = 'BIND!'; M.ref.callT = .8; emit('scrumCall', { word: 'BIND' }); } else { setSub('set'); ph.setT0 = M.phaseT; emit('scrumCall', { word: 'SET' }); } }
  } else if (s === 'set') {
    for (const t of [0, 1]) {
      if (H[t].length) { if (ph.timing[t] == null && anyPress(H[t], 'x')) ph.timing[t] = st - setAt; }
      else if (ph.cpuSet[t] < 0) { ph.early = t; }
      else if (ph.timing[t] == null && st >= ph.cpuSet[t]) ph.timing[t] = st - setAt;
    }
    if (ph.early >= 0) { const t = ph.early; emit('earlyEngage', { team: t }); for (const p of M.players) if (p.st === 'scrum') p.st = 'run'; return stop('EARLY ENGAGEMENT', 1.4, () => freeKick(1 - t, ph.x, ph.y, 'early'), { call: 'FREE KICK!', noHooter: true }); }
    if (st > setAt + .3) {
      for (const t of [0, 1]) { const tm = ph.timing[t], v = tm == null ? 0 : Math.abs(tm) <= .12 ? .25 : Math.abs(tm) <= .25 ? .1 : 0; ph.bar += (t === feed ? v : -v); ph.grade = ph.grade || []; ph.grade[t] = v >= .25 ? 'PERFECT' : v > 0 ? 'GOOD' : 'LATE'; }
      setSub('push'); emit('scrumEngage', { grade: ph.grade });
    }
  } else if (s === 'push') {
    const sum = t => M.players.filter(p => p.team === t && p.idx < 3 && onField(p)).reduce((a, p) => a + Math.min(12, statOf(p, 'POW')), 0);
    ph.bar += .01 * (sum(feed) - sum(other)) * dt;
    for (const t of [0, 1]) {
      const sign = t === feed ? 1 : -1;
      if (H[t].length) for (const it of H[t]) for (const k of ['l1', 'r1']) if (it.p[k]) { const w = ph.last[t] === k ? .5 : 1; ph.last[t] = k; ph.bar += sign * w * TUNE.v.scrumPushWeight; ph.pushes[t]++; }
      if (!H[t].length && !cheat('cpuFrozen')) { const rate = diffOf(t).cpuMash * .8 * (TUNE.v.cpuMash / 9); ph.bar += sign * rate * TUNE.v.scrumPushWeight * dt * U(.7, 1.3); }
    }
    ph.bar = clamp(ph.bar, -1, 1);
    if (st > 2) setSub('result');
  } else if (s === 'result' && !ph.result) {
    const win = ph.bar >= 0 ? feed : other; ph.result = win;
    for (const p of M.players) if (p.st === 'scrum') { p.st = 'run'; p.stT = 0; }
    addHype(win, 6);
    if (Math.abs(ph.bar) > .85) {
      const lose = 1 - win, nearLine = Math.abs(tryLineOf(win) - ph.x) < 50 + 51;
      emit('scrumCollapse', { team: lose }); emit('scrumWon', { team: win, steal: win !== feed, collapse: true });
      if (nearLine) { const hk = M.players.find(p => p.team === win && p.idx === 1 && onField(p)) || M.players.find(p => p.team === win && onField(p)); hk.x = tryLineOf(win) + dirOf(win) * 4; hk.y = ph.y; giveBall(hk, 'restart'); emit('pushoverTry', { team: win }); return tryScored(hk, 'pushover'); }
      return stop('SCRUM PENALTY', 1.2, () => penalty(win, ph.x, ph.y, 'collapse'), { call: 'PENALTY!', noHooter: true });
    }
    const sh = M.players.find(p => p.team === win && p.idx === 3 && onField(p)) || M.players.find(p => p.team === win && onField(p) && p.idx >= 3);
    const dW = dirOf(win); sh.x = ph.cx - dW * 16; sh.y = ph.y; sh.facing = dW > 0 ? 0 : PI;
    setPhase('play'); giveBall(sh, 'scrum'); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 };
    emit('scrumWon', { team: win, steal: win !== feed });
  }
};

/* ---- THE LINEOUT ---- */
function lineout(team, x, side) {
  const ty = side ? G.Y1 : G.Y0, s = side ? -1 : 1;
  M.ball.st = 'dead'; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, x, ty, s, pods: [0, 1, 2].map(k => ty + s * (51 + 16 * k)), call: [-1, -1], lock: [false, false], needle: 0, throwV: null, quality: 0, defTiming: null, result: null, cpuThrowT: U(.5, 1) };
  setPhase('lineout', ph); setSub('setup');
  M.stats[team].lineouts++;
  emit('lineout', { team, x, side });
}
TT.sp.lineout = (t, x, s) => lineout(t, x, s);
const podWeights = [.4, .35, .25];
function cpuPod(hist) { let k = 0, r = rnd() * 1, acc = 0; for (let i = 0; i < 3; i++) { acc += podWeights[i]; if (r < acc) { k = i; break; } } if (hist && hist.length >= 2 && hist[hist.length - 1] === k && hist[hist.length - 2] === k) k = (k + 1) % 3; return k; }
TT.sp.lineoutStep = dt => {
  const ph = M.ph, att = ph.team, def = 1 - att, s = M.sub, st = ph.subT;
  const H = [humansOf(0), humansOf(1)];
  // positions: the hooker on the line throwing, two lines a metre apart, backs ten metres back
  for (const p of M.players) {
    if (!onField(p)) continue;
    const dT = dirOf(p.team), mine = p.team === att;
    let tx, ty, face;
    const podY = k => ph.pods[clamp(k, 0, 2)];
    if (mine && p.idx === 1) { tx = ph.x; ty = ph.ty - ph.s * 6; face = ph.s > 0 ? PI / 2 : -PI / 2; }
    else if (p.idx < 3) {
      const myCall = ph.call[p.team] >= 0 && s !== 'setup' && s !== 'call' ? ph.call[p.team] : null;
      const slot = mine ? (p.idx === 0 ? 0 : 1) : p.idx;
      const baseY = myCall != null ? podY(myCall) + (slot === 0 ? 0 : (slot === 1 ? -ph.s * 7 : ph.s * 7)) : ph.pods[0] + ph.s * slot * 16;
      tx = ph.x - dT * 6; ty = baseY; face = dT > 0 ? 0 : PI;
    } else if (p.idx === 3) { tx = ph.x - dT * 14; ty = ph.pods[2] + ph.s * 22; face = dT > 0 ? 0 : PI; }
    else { tx = clamp(ph.x - dT * (60 + (p.idx - 3) * 18), G.X0 - 40, G.X1 + 40); ty = ph.pods[2] + ph.s * (40 + (p.idx - 3) * 60); face = dT > 0 ? 0 : PI; }
    ty = clamp(ty, G.Y0 - 10, G.Y1 + 10);
    if (p.st !== 'lift') placeTo(p, tx, ty, dt, 110, face);
  }
  const thrower = M.players.find(p => p.team === att && p.idx === 1 && onField(p)) || M.players.find(p => p.team === att && onField(p));
  if (s === 'setup') { if (st > 1.2) { setSub('call'); for (const t of [0, 1]) if (!H[t].length) { ph.call[t] = t === att ? cpuPod(M.podHist = M.podHist || []) : -2; ph.lock[t] = true; } for (const t of [0, 1]) if (H[t].length) ph.call[t] = 1; } return; }
  if (s === 'call') {
    for (const t of [0, 1]) if (H[t].length && !ph.lock[t]) {
      for (const it of H[t]) {
        const up = it.p.l1 || it.p.up, dn = it.p.r1 || it.p.down;
        const towardTouch = ph.s > 0 ? up : dn, away = ph.s > 0 ? dn : up;
        if (towardTouch) ph.call[t] = Math.max(0, ph.call[t] - 1);
        if (away) ph.call[t] = Math.min(2, ph.call[t] + 1);
        if (it.pick != null) ph.call[t] = it.pick;
        if (it.p.x || it.pick != null) ph.lock[t] = true;
      }
    }
    if ((ph.lock[0] && ph.lock[1]) || st > 2.5) {
      if (ph.call[att] < 0) ph.call[att] = 1;
      if (ph.call[def] === -2) { ph.call[def] = rnd() < diffOf(def).read ? ph.call[att] : (ph.call[att] + 1 + Math.floor(rnd() * 2)) % 3; }
      if (ph.call[def] < 0) ph.call[def] = 1;
      (M.podHist = M.podHist || []).push(ph.call[att]);
      setSub('throw'); emit('lineoutCall', { pods: ph.call.slice() });
    }
    return;
  }
  if (s === 'throw') {
    ph.needle = Math.sin(st * 4.2);
    let thrown = false;
    if (H[att].length) { if (anyPress(H[att], 'x')) thrown = true; if (st > 4) thrown = true; }
    else if (st > ph.cpuThrowT) { ph.needle = clamp(gauss() * diffOf(att).scrumSigma * 2.2, -1, 1); thrown = true; }
    if (thrown) {
      const v = Math.abs(ph.needle); ph.throwV = ph.needle;
      if (v > .7) { emit('notStraight', { team: att }); return stop('NOT STRAIGHT', 1.5, () => scrum(def, ph.x, ph.pods[1] + ph.s * 30, 'notStraight'), { call: 'NOT STRAIGHT!', noHooter: true }); }
      ph.quality = v < .35 ? 1 - v / .35 * .3 : .4;
      setSub('flight');
      const pod = ph.pods[ph.call[att]], tx = ph.x, v2 = arcTo(thrower.x, thrower.y, 18, tx, pod, 58, 14);
      M.ball.st = 'air'; M.ball.kind = 'throw'; M.ball.x = thrower.x; M.ball.y = thrower.y; M.ball.z = 18; M.ball.vx = v2.vx; M.ball.vy = v2.vy; M.ball.vz = v2.vz; M.ball.holder = -1; M.ball.tried = {};
      ph.arrive = v2.t; thrower.st = 'pass'; thrower.stT = 0;
      // the lift: each side's jumper at its pod
      for (const t of [0, 1]) { const j = M.players.find(p => p.team === t && p.idx === (t === att ? 2 : 1) && onField(p)) || M.players.find(p => p.team === t && p.idx < 3 && onField(p)); if (j) { j.st = 'lift'; j.stT = 0; j.liftT = 0; j.x = ph.x - dirOf(t) * 6; j.y = ph.pods[ph.call[t]]; } ph['jumper' + t] = j ? j.id : -1; }
      emit('lineoutThrow', { quality: ph.quality });
    }
    return;
  }
  if (s === 'flight') {
    const b = M.ball;
    b.vz -= BALL_G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(0, b.z + b.vz * dt);
    for (const t of [0, 1]) { const j = pl(ph['jumper' + t]); if (j && j.st === 'lift') j.z = Math.min(44, j.z + dt * 140); }
    if (H[def].length && ph.defTiming == null && anyPress(H[def], 'x')) ph.defTiming = st - ph.arrive;
    if (st >= ph.arrive) {
      const ja = pl(ph['jumper' + att]), jd = pl(ph['jumper' + def]);
      let win = att;
      if (ph.call[def] === ph.call[att] && jd) {
        const timing = ph.defTiming != null ? clamp(1 - Math.abs(ph.defTiming) / .3, 0, 1) : (H[def].length ? 0 : clamp(1 - Math.abs(gauss() * diffOf(def).scrumSigma) / .3, 0, 1));
        const sa = .6 * ph.quality + .04 * statOf(ja, 'HND') + .15, sd = .6 * timing + .04 * statOf(jd, 'HND');
        win = sd > sa ? def : att;
      }
      ph.result = win; setSub('result'); ph.winJ = (win === att ? ja : jd).id;
      emit(win === att ? 'lineoutWon' : 'lineoutSteal', { team: win });
      if (win !== att) addHype(win, 8);
    }
    return;
  }
  if (s === 'result') {
    for (const t of [0, 1]) { const j = pl(ph['jumper' + t]); if (j) { j.z = Math.max(0, j.z - dt * 160); } }
    M.ball.x = pl(ph.winJ).x; M.ball.y = pl(ph.winJ).y; M.ball.z = pl(ph.winJ).z + 34;
    if (st > .45) {
      for (const p of M.players) if (p.st === 'lift') { p.st = 'run'; p.z = 0; }
      const win = ph.result, sh = M.players.find(p => p.team === win && p.idx === 3 && onField(p)) || M.players.find(p => p.team === win && onField(p) && p.idx >= 3);
      setPhase('play'); giveBall(sh, 'lineout'); M.useIt = { pid: sh.id, x: sh.x, y: sh.y, t: 0 };
    }
  }
};

/* ---- PENALTIES AND FREE KICKS: the captain's choice ---- */
function penalty(team, x, y, kind, free) {
  x = clamp(x, G.X0 + 20, G.X1 - 20); y = clamp(y, G.Y0 + 20, G.Y1 - 20);
  const d = dirOf(team), toLine = Math.abs(tryLineOf(team) - x);
  const opts = [['tap', 'TAP & GO', 'Quick tap. Run it!']];
  if (!free && toLine <= 400) opts.push(['goal', 'KICK AT GOAL', '3 points, ' + TT.metres(Math.hypot(tryLineOf(team) - x, G.CY - y)) + ' metres out']);
  opts.push(['touch', 'KICK FOR TOUCH', 'Boot it out, our throw']);
  M.ball.st = 'dead'; M.ball.x = x; M.ball.y = y; M.ball.z = 0; M.ball.holder = -1;
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  setPhase('penalty', { team, x, y, kind, free: !!free, opts, choice: 0, cpuT: U(1, 1.6) });
  emit(free ? 'freeKick' : 'penalty', { team, kind });
  void d;
}
function freeKick(team, x, y, why) { penalty(team, x, y, why, true); }
TT.sp.penalty = (t, x, y, k) => penalty(t, x, y, k);
TT.sp.freeKick = (t, x, y, w) => freeKick(t, x, y, w);
TT.sp.penaltyStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), H = humansOf(team);
  for (const p of M.players) {
    if (!onField(p)) continue;
    const mine = p.team === team;
    let tx = p.x, ty = p.y;
    if (mine) { tx = Math.min((ph.x - d * (10 + p.idx * 4)) * d, p.x * d) * d; if (p.idx === 4) { tx = ph.x - d * 6; ty = ph.y; } }
    else if ((p.x - (ph.x + d * 102)) * d < 0) tx = ph.x + d * (106 + p.idx * 5);
    placeTo(p, clamp(tx, G.DEAD[0], G.DEAD[1]), clamp(ty, G.Y0, G.Y1), dt, 120);
  }
  let pick = -1;
  if (H.length) {
    for (const it of H) {
      if (it.p.left || it.p.l1) ph.choice = (ph.choice + ph.opts.length - 1) % ph.opts.length;
      if (it.p.right || it.p.r1) ph.choice = (ph.choice + 1) % ph.opts.length;
      if (it.pick != null && it.pick < ph.opts.length) { ph.choice = it.pick; pick = it.pick; }
      if (it.p.x) pick = ph.choice;
    }
    if (M.phaseT > 15) pick = ph.choice;
  } else if (M.phaseT > ph.cpuT) {
    const toLine = Math.abs(tryLineOf(team) - ph.x), diffS = M.score[team] - M.score[1 - team], late = M.hooter || M.clock > M.halfLen * .8;
    let c = 'touch';
    if (toLine < 60 || (late && diffS < 0 && diffS > -6 && toLine < 150)) c = 'tap';
    else if (ph.opts.some(o => o[0] === 'goal') && toLine < 300 && (Math.abs(diffS) <= 7 || late)) c = 'goal';
    else if (toLine < 140) c = 'tap';
    pick = ph.opts.findIndex(o => o[0] === c); if (pick < 0) pick = 0; ph.choice = pick;
  }
  if (pick < 0 || M.phaseT < .6) return;
  const choice = ph.opts[pick][0];
  emit('choice', { team, choice });
  const kicker = M.players.find(p => p.team === team && p.idx === 4 && onField(p)) || M.players.find(p => p.team === team && onField(p) && p.idx >= 3) || M.players.find(p => p.team === team && onField(p));
  if (choice === 'tap') {
    const tp = M.players.filter(p => p.team === team && onField(p)).sort((a, b) => Math.hypot(a.x - ph.x, a.y - ph.y) - Math.hypot(b.x - ph.x, b.y - ph.y))[0];
    for (const p of M.players) if (p.team !== team && onField(p) && (p.x - (ph.x + d * 102)) * d < 0) p.x = ph.x + d * 104;
    tp.x = ph.x; tp.y = ph.y; setPhase('play'); giveBall(tp, 'restart'); emit('tapGo', { team }); return;
  }
  if (choice === 'goal') return TT.sp.startSetKick(team, 'pen', ph.y, ph.x);
  // for touch: a punt toward the nearer touchline, downfield; the kicking team throws in
  kicker.x = ph.x - d * 4; kicker.y = ph.y;
  const side = ph.y < G.CY ? -1 : 1, tx = clamp(ph.x + d * U(140, 230), G.X0 + 60, G.X1 - 60), ty = side < 0 ? G.Y0 - 30 : G.Y1 + 30;
  const v = arcTo(ph.x, ph.y, 4, tx, ty, 0, 80);
  M.ball.x = ph.x; M.ball.y = ph.y; M.ball.z = 4;
  setPhase('play');
  launchBall(kicker, v.vx, v.vy, v.vz, 'kick', { pen: true });
  kicker.st = 'kick'; kicker.stT = 0;
};

/* ---- CONVERSIONS AND PENALTY GOALS: place the tee, aim, power, the flight ---- */
TT.sp.startSetKick = (team, kind, y, x) => {
  const d = dirOf(team), tl = tryLineOf(team);
  const kicker = M.players.filter(p => p.team === team && onField(p)).sort((a, b) => statOf(b, 'KCK') - statOf(a, 'KCK'))[0];
  const human = humansOf(team).length > 0;
  let dist = kind === 'pen' ? Math.abs(tl - x) : (human ? 51 : clamp(Math.abs(y - G.CY) * .5 + 51, 51, 200));
  y = clamp(y, G.Y0 + 20, G.Y1 - 20);
  for (const p of M.players) if (onField(p)) resetPlayer(p);
  const ph = { team, kind, y, dist, tl, kicker: kicker.id, aim: 0, power: 0, holding: false, clock: 20, sway: 0, result: null, need: 0, cpuAim: 0, cpuPower: 0, human, flightT: 0 };
  setPhase('setkick', ph); setSub(kind === 'conv' && human ? 'place' : 'aim');
  M.stats[team].convAtt += kind === 'conv' ? 1 : 0;
  updateKickSpot(ph);
  if (!human) { const kck = statOf(kicker, 'KCK'); ph.cpuAim = gauss() * ((11 - kck) * 2.4 + diffOf(team).noise * 14); ph.cpuPower = clamp(ph.need + U(-.04, .12) - (kck < 6 ? .05 : 0), .2, 1); ph.cpuT = U(1.2, 2.2); }
  emit('setKick', { team, kind });
};
function updateKickSpot(ph) {
  const d = dirOf(ph.team);
  ph.kx = ph.tl - d * ph.dist; ph.ky = ph.y;
  M.ball.st = 'placed'; M.ball.x = ph.kx; M.ball.y = ph.ky; M.ball.z = 0; M.ball.holder = -1;
  // the power the kick needs to clear the bar at the posts (simulated)
  const k = pl(ph.kicker), D = Math.hypot(ph.tl - ph.kx, G.CY - ph.ky);
  ph.D = D; ph.need = clamp(kickPowerFor(D, k), .15, 1);
}
const KICK_ANGLE = .6;
function kickSpeed(power, k) { const range = TUNE.v.kickMax * 1.15 * (.75 + .03 * statOf(k, 'KCK')) * (M.megaBoot[k.team] > 0 ? 1.6 : 1) * (k.fire > 0 ? 1.2 : 1); return Math.sqrt(BALL_G * range * clamp(power, .05, 1.05) / Math.sin(2 * KICK_ANGLE)); }
function kickPowerFor(D, k) {
  // the least power whose flight is above the bar at distance D (with a little margin)
  for (let p = .1; p <= 1.001; p += .01) { const v = kickSpeed(p, k), vh = v * Math.cos(KICK_ANGLE), vz = v * Math.sin(KICK_ANGLE), t = D / (vh * .92), z = vz * t - BALL_G * t * t / 2; if (z > G.BAR + 6) return p; }
  return 1;
}
TT.sp.kickPowerFor = (D, k) => kickPowerFor(D, k);
TT.sp.setkickStep = dt => {
  const ph = M.ph, team = ph.team, d = dirOf(team), k = pl(ph.kicker), H = humansOf(team), s = M.sub, st = ph.subT;
  // everyone stands back: the kicking side behind the ball, the defenders behind their line
  for (const p of M.players) {
    if (!onField(p)) continue;
    if (p === k) { if (s === 'place' || s === 'aim') placeTo(p, ph.kx - d * 14, ph.ky - 6, dt, 100, Math.atan2(G.CY - ph.ky, ph.tl - ph.kx)); continue; }
    if (p.team === team) placeTo(p, clamp(ph.kx - d * (40 + p.idx * 6), G.DEAD[0], G.DEAD[1]), clamp(ph.ky + (p.idx - 3) * 22, G.Y0 + 10, G.Y1 - 10), dt, 90, d > 0 ? 0 : PI);
    else placeTo(p, ph.tl + d * (14 + (p.idx % 2) * 10), G.CY + (p.idx - 3) * 26, dt, 110, d > 0 ? PI : 0);
  }
  if (s === 'place' || s === 'aim') { ph.clock -= dt; if (ph.clock <= 0 && s !== 'flight') { ph.clock = 0; return fireSetKick(ph.holding ? ph.power : .4); } }
  if (s === 'place') {
    for (const it of H) {
      if (Math.abs(it.mx) > .3) ph.dist = clamp(ph.dist - it.mx * d * 140 * dt, 51, 400);
      if (Math.abs(it.my) > .3) ph.dist = clamp(ph.dist - it.my * 140 * dt, 51, 400);
      if (it.wheel) ph.dist = clamp(ph.dist + it.wheel * 12, 51, 400);
      if (it.p.x || it.p.ci) { setSub('aim'); break; }
    }
    updateKickSpot(ph);
    return;
  }
  if (s === 'aim') {
    ph.sway = Math.sin(M.t * 1.7) * (14 - statOf(k, 'KCK')) * .6 * (M.megaBoot[team] > 0 ? .5 : 1);
    if (H.length) {
      for (const it of H) {
        if (it.kickAim != null) ph.aim = clamp(it.kickAim * 60, -60, 60);
        else ph.aim = clamp(ph.aim + (it.mx || 0) * 70 * dt, -60, 60);
        if (it.h.ci) { ph.holding = true; const u = (ph.powT = (ph.powT || 0) + dt) / 1.0; ph.power = u <= 1 ? u : Math.max(0, 2 - u); }
        else if (ph.holding) return fireSetKick(ph.power);
      }
    } else if (st > ph.cpuT) { ph.aim = ph.cpuAim; return fireSetKick(ph.cpuPower, true); }
    return;
  }
  if (s === 'flight') {
    ph.flightT += dt;
    if (ph.result == null && (M.ball.goalCheck == null || M.ball.z <= 0 && M.ball.bounces > 0 || ph.flightT > 4)) { ph.result = ph.result == null ? (M.ball.goalResult || 'miss') : ph.result; }
    if (ph.result != null) { setSub('result'); }
    return;
  }
  if (s === 'result' && st > 1.6) {
    if (ph.ended) return fullTime();
    if (ph.kind === 'conv') return afterStop(() => startKickoff(team));
    if (ph.result === 'good') return afterStop(() => startKickoff(team));
    return afterStop(() => startKickoff(1 - team, 'dropout'));
  }
};
function fireSetKick(power, cpu) {
  const ph = M.ph, k = pl(ph.kicker), team = ph.team;
  setSub('flight'); ph.power = power;
  const base = Math.atan2(G.CY - ph.ky, ph.tl - ph.kx), D = ph.D;
  const band = M.megaBoot[team] > 0 ? .12 : .06, sweet = Math.abs(power - Math.min(1, ph.need + .08)) < band || power >= ph.need && power <= ph.need + band * 2;
  const hook = sweet ? 0 : U(-1, 1) * (12 - statOf(k, 'KCK')) * PI / 180 * (cpu ? .5 : 1);
  const a = base + Math.atan2(ph.aim + (cpu ? 0 : ph.sway), D) + hook;
  const v = kickSpeed(power, k);
  M.ball.x = ph.kx; M.ball.y = ph.ky; M.ball.z = 1;
  launchBall(k, Math.cos(a) * Math.cos(KICK_ANGLE) * v, Math.sin(a) * Math.cos(KICK_ANGLE) * v, Math.sin(KICK_ANGLE) * v, 'place');
  M.ball.goalCheck = { team, kind: ph.kind, pid: k.id };
  k.st = 'kick'; k.stT = 0;
  if (M.megaBoot[team] > 0) M.megaBoot[team] = 0;
  emit('kick', { pid: k.id, kind: 'place' });
}
/** a ball at the posts: through (between the uprights, above the bar), a doink, or wide */
function goalFlight(prevX) {
  const b = M.ball, gc = b.goalCheck; if (!gc || gc.done) return;
  const tl = tryLineOf(gc.team);
  if ((prevX - tl) * (b.x - tl) > 0) { if (b.z <= 0 && b.bounces > 0) { gc.done = true; b.goalResult = 'miss'; goalResult(gc, 'miss'); } return; }
  gc.done = true;
  const off = Math.abs(b.y - G.CY);
  let res = 'miss';
  if (off < G.POST && b.z > G.BAR) res = 'good';
  else if (Math.abs(off - G.POST) < 3 && b.z > G.BAR - 4 && b.z < G.UPRIGHT) { res = 'doink'; b.vx *= -.35; b.vy *= .5; }
  else if (off < G.POST && b.z <= G.BAR && b.z > G.BAR - 4) { res = 'doink'; b.vz = Math.abs(b.vz) * .3; b.vx *= -.3; }
  b.goalResult = res;
  goalResult(gc, res);
}
function goalResult(gc, res) {
  const team = gc.team;
  if (gc.kind === 'drop') {
    emit('dropGoalResult', { team, res, pid: gc.pid });
    if (res === 'good') { const ended = score(team, 3, 'dropGoal', gc.pid); addHype(team, 10); emit('dropGoal', { team, pid: gc.pid }); M.ball.goalCheck = null; if (ended) return fullTime(); return stop('DROP GOAL!', 2, () => startKickoff(team), {}); }
    M.ball.goalCheck = null; return;
  }
  const ph = M.ph;
  if (res === 'good') {
    const pts = gc.kind === 'conv' ? 2 : 3;
    const ended = score(team, pts, gc.kind === 'conv' ? 'conversion' : 'penaltyGoal', gc.pid);
    if (gc.kind === 'conv') M.stats[team].conv++;
    addHype(team, 5);
    emit(gc.kind === 'conv' ? 'conversion' : 'penaltyGoal', { team, made: true, pid: gc.pid });
    if (ended && M.phase === 'setkick') M.ph.ended = true;
  } else emit(res === 'doink' ? 'doink' : (gc.kind === 'conv' ? 'convMiss' : 'penMiss'), { team, made: false });
  if (M.phase === 'setkick') ph.result = res;
}
/** a simulation timer (match time) */
function setTimeoutSim(s, fn) { (M.timers = M.timers || []).push({ t: s, fn }); }
TT.sim.timers = dt => { if (!M || !M.timers) return; for (const t of M.timers.slice()) { t.t -= dt; if (t.t <= 0) { M.timers.splice(M.timers.indexOf(t), 1); t.fn(); } } };
