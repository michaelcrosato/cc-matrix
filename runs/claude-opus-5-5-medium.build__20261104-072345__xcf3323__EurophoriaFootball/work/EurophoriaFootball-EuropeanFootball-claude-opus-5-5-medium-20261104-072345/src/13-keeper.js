/* 13-keeper: positioning on the angle's bisector, reading shots after a reaction time, dives that reach or don't,
 * catches, parries and tips, smothering, claiming crosses, holding and distributing. */
function keeperStep(k, dt, it, live) {
  const m = k.m, b = k.body, gx = m.ownGoalX(k.side), into = gx === P.X0 ? 1 : -1, ball = m.ball;
  if ((b.x - gx) * into < 3 && Math.abs(b.y - P.CY) < P.GH + 8) b.x = gx + into * 3;   // never behind his own line
  if (['down', 'getup', 'launched', 'stunned'].includes(k.state)) return false;
  if (m.mode === 'shootout' || (m.sp && m.sp.kind === 'penalty' && m.sp.keeper === k)) { keeperPenaltyStep(k, dt); return true; }
  if (k.state === 'keeper-dive') {
    const d = k.dive; d.t += dt;
    const u = Math.min(1, d.t / d.dur);
    b.vx = approach(b.vx, 0, 400 * dt); b.vy = d.vy * (1 - u);
    if (d.high) { b.z = Math.sin(Math.min(1, u * 1.3) * PI) * d.high; }
    k.flip = 0; k.tiltSide = d.side; k.diveU = u;
    b.update(dt, m.map);
    if (d.t >= (d.until || d.dur + .25)) { k.diveU = 0; b.z = 0; if (m.owner === k) k.setState('keeper-hold'); else { k.setState('down'); k.downT = .45; } }
    keeperShotResolve(k);
    return true;
  }
  if (k.state === 'keeper-hold') {
    b.vx = approach(b.vx, 0, 500 * dt); b.vy = approach(b.vy, 0, 500 * dt); b.update(dt, m.map);
    k.facing = into > 0 ? 0 : PI;
    if (m.owner !== k) { k.setState('run'); return true; }
    if (m.mode !== 'play') return true;
    k.holdT = (k.holdT || 0) + dt;
    const human = m.humanSide(k.side) && !m.o.attract;
    let kind = null;
    if (human) { const sl = m.slots.find(s => s.side === k.side && s.ctl); const hi = sl && sl.ctl && sl.ctl.peek ? sl.ctl.peek(m, sl) : null; if (hi && hi.pass) kind = 'throw'; else if (hi && hi.shoot) kind = 'long'; }
    if (!kind && k.holdT > (human ? 2 : 1.1 + m.rng() * .6)) kind = keeperChoice(k);
    if (kind) keeperDistribute(k, kind);
    return true;
  }
  if (!live && m.mode !== 'play') { k.decel(dt, 500); b.update(dt, m.map); return true; }
  // ---- positioning ----
  k.read && keeperReadStep(k, dt);
  if (k.state === 'keeper-dive') return true;
  const gc = { x: gx, y: P.CY }, bd = dist(ball, gc), carrier = m.owner && m.owner.side !== k.side ? m.owner : null;
  let tx, ty, speed = 110;
  const ang = Math.atan2(ball.y - P.CY, (ball.x - gx) * into), depth = clamp(8 + (400 - bd) * .06, 6, 36);
  tx = gx + into * Math.cos(ang) * depth; ty = clamp(P.CY + Math.sin(ang) * depth * 1.3, P.CY - P.GH - 4, P.CY + P.GH + 4);
  // rush a carrier through on goal
  if (carrier && dist(carrier.body, gc) < 120 && !m.side[k.side].some(p => p !== k && !p.sentOff && segDist(p.body, carrier.body, gc) < 10)) {
    tx = carrier.body.x; ty = carrier.body.y; speed = 140;
    if (dist(carrier.body, b) < 12 && k.cool <= 0) keeperSmother(k, carrier);
  }
  // a loose ball in the box: go and get it
  const loose = !m.owner && !ball.superPath && P.inBox(-into, ball.x, ball.y) && hyp(ball.vx, ball.vy) < 200;
  if (loose && (!m.shot || m.shot.done)) {
    const nearest = m.players.filter(p => !p.sentOff && p !== k).reduce((a, p) => Math.min(a, dist(p.body, ball)), 999);
    if (dist(b, ball) < nearest + 20) { tx = ball.x; ty = ball.y; speed = 130; }
  }
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy), sp = Math.min(speed * (m.euroT[k.side] > 0 ? 1.1 : 1), d * 5);
  b.vx = approach(b.vx, d > 1 ? dx / d * sp : 0, 800 * dt); b.vy = approach(b.vy, d > 1 ? dy / d * sp : 0, 800 * dt);
  k.face(Math.atan2(ball.y - b.y, ball.x - b.x), dt, 10);
  b.update(dt, m.map);
  k.set = bd < 200;
  keeperShotResolve(k);
  // catch what comes to him: loose and slow in his box, or a cross he can claim
  if (!m.owner && !ball.superPath && m.mode === 'play' && k.cool <= 0 && P.inBox(-into, b.x, b.y)) {
    const bdist = hyp(ball.x - b.x, ball.y - b.y), sp2 = hyp(ball.vx, ball.vy);
    const reachZ = 34 * (k.data.size || 1);
    if (bdist < 10 && ball.z < reachZ && (sp2 < 190 || ball.z > 10) && (!m.shot || m.shot.done || m.shot.outcome === 'catch')) keeperCatch(k, 'claim');
  }
  return true;
}
function keeperChoice(k) {
  const m = k.m, tac = EF.get('tactic', m.teams[k.side].tactic);
  if (tac && tac.gimmick === 'routeone') return 'long';
  const open = m.side[k.side].filter(p => p !== k && !p.sentOff && dist(p.body, k.body) < 200 && nearestFoe(m, p, k.side) > 30);
  return open.length ? 'throw' : 'long';
}
function keeperDistribute(k, kind) {
  const m = k.m, b = k.body, ball = m.ball, gx0 = m.ownGoalX(k.side), in0 = gx0 === P.X0 ? 1 : -1;
  if ((b.x - gx0) * in0 < 8) b.x = gx0 + in0 * 8;
  const mates = m.side[k.side].filter(p => p !== k && !p.sentOff);
  let tgt;
  if (kind === 'throw') tgt = mates.slice().sort((p, q) => (dist(p.body, b) - nearestFoe(m, p, k.side) * 2) - (dist(q.body, b) - nearestFoe(m, q, k.side) * 2))[0];
  else tgt = mates.slice().sort((p, q) => (q.body.x - p.body.x) * k.dir)[0];
  if (!tgt) return;
  k.holdT = 0; k.setState('run'); m.owner = null;
  ball.x = b.x + k.dir * 6; ball.y = b.y; ball.z = kind === 'throw' ? 14 : 2;
  const tx = tgt.body.x + tgt.body.vx * .5, ty = tgt.body.y + tgt.body.vy * .5;
  const v = E.arc({ x: ball.x, y: ball.y, z: ball.z }, { x: tx, y: ty, z: 0 }, EF.T.ballGravity, { apex: kind === 'throw' ? (dist(tgt.body, b) < 120 ? 16 : 30) : 70 });
  m.kickBall(k, v.vx, v.vy, v.vz, kind === 'throw' ? 'pass' : 'lob', tgt);
  k.doAct(kind === 'throw' ? 'throw' : 'shotHard', .45); k.cool = .5;
  m.emit('distribute', { who: k.id, kind });
}
function keeperCatch(k, why) {
  const m = k.m; m.owner = k; m.last = k; m.lastTouch = k.side; m.ball.to = null; m.ball.kind = null; m.ball.spin = 0;
  k.setState('keeper-hold'); k.holdT = 0; k.cool = .4;
  if (m.shot) m.shot.done = true;
  m.chain[k.side] = 0; m.chain[1 - k.side] = 0;
  m.emit('catch', { who: k.id, side: k.side, why });
}
function keeperSmother(k, carrier) {
  const m = k.m; k.cool = .8;
  const win = m.rng() < .35 + k.st.keep / 100 * .45;
  k.dive = { t: 0, dur: .3, vy: 0, side: 0, high: 0 }; k.setState('keeper-dive'); k.doAct('smother', .5);
  if (win) { m.owner = null; keeperCatch(k, 'smother'); k.setState('keeper-dive'); m.emit('save', { who: k.id, side: k.side, kind: 'smother' }); m.gain(k.side, 6, 'save'); }
  m.emit('smother', { who: k.id, win });
}
/** a shot is coming: after his reaction time he decides where to go and how it ends */
function keeperRead(k, shot) {
  if (!shot || shot.kind === 'super') return;
  const m = k.m, cpu = m.isCpuSide(k.side);
  const base = (cpu ? m.diff.keeper / .19 : 1) * EF.T.keeperReaction, stat = 1.4 - .8 * k.st.keep / 100;
  k.read = { shot, wait: base * stat * (shot.sweet ? 1.3 : 1), t: 0 };
}
function keeperReadStep(k, dt) {
  const r = k.read, m = k.m, s = r.shot;
  if (s.done || m.shot !== s) { k.read = null; return; }
  r.t += dt; if (r.t < r.wait) return;
  k.read = null;
  // where does it cross? (predicted again now, with any curl)
  const gx = m.ownGoalX(k.side), path = predictBall(m, 1.4, 1 / 60);
  let cross = null; for (const q of path) if ((gx > P.CX ? q.x >= gx - 2 : q.x <= gx + 2)) { cross = q; break; }
  if (!cross) { s.outcome = 'miss'; return; }
  const onT = Math.abs(cross.y - P.CY) < P.GH + 2 && cross.z < P.BAR + 2;
  const b = k.body, need = cross.y - b.y, needZ = cross.z;
  const boss = k.data.boss ? 1.4 : 1, euro = m.euroT[k.side] > 0 ? 1.3 : 1, inv = m.cheats['keeper' + k.side];
  const tAvail = Math.max(.05, cross.t);
  const reach = EF.T.keeperReach * Math.min(1, tAvail / .35) * boss * euro + 12 * (k.data.size || 1);
  const reachable = Math.abs(need) <= reach && needZ < 44 * (k.data.size || 1);
  const sp = s.speed || 250;
  const q = reachable ? (1 - Math.abs(need) / reach) * .6 + .4 : 0;
  const speedF = Math.max(.2, 1 - (sp - 200) / 400);
  let score = q * speedF * (k.st.keep / 100) * 1.7 * (s.sweet ? .75 : 1) + (m.rng() - .5) * .3;
  if (k.data.boss && sp < 300) score += .4;
  let outcome;
  if (m.forceGoal && onT) outcome = 'goal';
  else if (inv) outcome = 'catch';
  else if (!onT) outcome = 'miss';
  else if (!reachable) outcome = 'goal';
  else if (score > .62 && sp < 300) outcome = 'catch';
  else if (score > .3) outcome = needZ > 24 || Math.abs(cross.y - P.CY) > P.GH - 12 ? 'tip' : 'parry';
  else outcome = 'goal';
  s.outcome = outcome; s.cross = cross; s.keeper = k;
  if (Math.abs(need) > 10 || needZ > 26) {
    const dur = .35, high = needZ > 20 ? Math.min(14, needZ * .35) : 2;
    const vy = (outcome === 'goal' ? need * .75 : need) / dur * 1.4;
    k.dive = { t: 0, dur, vy, side: sgn(need) || 1, high, until: Math.max(dur + .25, cross.t + .2) }; k.setState('keeper-dive'); k.doAct(high > 6 ? 'diveHigh' : 'diveLow', dur + .25);
    m.emit('keeperDive', { who: k.id, side: sgn(need), high: high > 6 });
  } else if (outcome !== 'miss') { k.dive = { t: 0, dur: .2, vy: 0, side: 0, high: 0, until: Math.max(.45, cross.t + .2) }; k.setState('keeper-dive'); k.doAct('catch', .4); }
}
/** the ball reaches him: catch, parry or tip, as he read it */
function keeperShotResolve(k) {
  const m = k.m, s = m.shot; if (!s || s.done || s.keeper !== k || !s.outcome || m.owner) return;
  const ball = m.ball, gx = m.ownGoalX(k.side), into = gx === P.X0 ? 1 : -1;
  const reached = (ball.x - k.body.x) * into <= 4 && Math.abs(ball.y - k.body.y) < 30;
  if (!reached) return;
  if (s.outcome === 'goal' || s.outcome === 'miss') { s.done = true; return; }
  s.done = true; k.saves++;
  m.gain(k.side, s.sweet ? 10 : 6, 'save');
  if (s.outcome === 'catch') { keeperCatch(k, 'save'); m.emit('save', { who: k.id, side: k.side, kind: 'catch', from: s.by && s.by.id }); return; }
  m.last = k; m.lastTouch = k.side; ball.spin = 0; ball.to = null; ball.kind = 'save';
  if (s.outcome === 'parry' && m.rng() < .5) s.outcome = 'tip';   // (turned round the post: a corner)
  if (s.outcome === 'parry') {
    const sp = hyp(ball.vx, ball.vy) * (.4 + m.rng() * .2), away = sgn(ball.y - P.CY) || (m.rng() < .5 ? -1 : 1), a = Math.atan2(away * .8, into);
    ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; ball.vz = 40 + m.rng() * 40; ball.onGround = false;
    m.emit('save', { who: k.id, side: k.side, kind: 'parry', from: s.by && s.by.id }); m.emit('parry', { who: k.id });
  } else {
    if ((s.cross && s.cross.z > 24)) { ball.vz = 150; ball.vx *= .35; ball.vy *= .5; }
    else { ball.vy = (sgn(ball.y - P.CY) || 1) * 230; ball.vx *= .22; ball.vz = Math.max(ball.vz, 30); }
    ball.onGround = false;
    m.emit('save', { who: k.id, side: k.side, kind: 'tip', from: s.by && s.by.id }); m.emit('tip', { who: k.id });
  }
}
