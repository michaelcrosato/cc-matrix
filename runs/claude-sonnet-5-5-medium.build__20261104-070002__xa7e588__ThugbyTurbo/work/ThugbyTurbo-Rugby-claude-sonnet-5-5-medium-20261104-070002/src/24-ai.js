/* THUGBY TURBO — CPU brains: carrier, support, defence, loose ball, kicks. Same brain for CPU teams and human teammates. */
function aiIntent(p, dt) {
  const I = emptyIntent(); if (!standing(p) || p.off) return I;
  const ph = S.phase; if (ph !== 'play' && ph !== 'ruck') return I;
  if (p.flags.ruck) return I;
  if (p.dummy && S.cfg.mode === 'drill' && !p.hunt) return I;
  if (S.dev.aiOff && p.team === 1) return I;
  const b = S.ball, h = b.holder, d = S.dir[p.team], team = p.team;
  p.aiT -= dt; if (p.reactT > 0) return I;
  const diff = S.cfg.diff || { react: TUNE.v.aiReaction, noise: .2 };
  if (ph === 'ruck') return ruckAI(p, I);
  if (h === p) return carrierAI(p, I, dt, diff);
  if (h && h.team === team) return supportAI(p, I, h);
  if (h) return defendAI(p, I, h, diff);
  return looseAI(p, I);
}
const goTo = (p, I, x, y, turbo, slow) => { const dx = x - p.x, dy = y - p.y, m = Math.hypot(dx, dy); if (m > 4) { const k = slow ? clamp(m / 20, .15, 1) : 1; I.mx = dx / m * k; I.my = dy / m * k; } I.turbo = !!turbo && m > 18; return I; };
function carrierAI(p, I, dt, diff) {
  const d = S.dir[p.team], ax = atkX(p.team), opps = S.players.filter(q => q.team !== p.team && alive(q) && q.z < 5);
  p.aiT = p.aiT || 0;
  if (inGoalOf(p)) { goTo(p, I, ax + d * 40, p.y < G.CY ? G.CY - 24 : G.CY + 24, true); if (Math.abs(p.x - ax) > 6 && S.rng() < .1) I.x = true; if (Math.abs(p.x - ax) > 30) I.x = true; return I; }
  if (S.hype[p.team] >= 100 && (p.x - G.CX) * d > 0 && p.cd.pass <= 0 || (S.hype[p.team] >= 100 && Math.abs(ax - p.x) < 400)) I.tri = true;
  if (p.aiT <= 0) {
    p.aiT = .15 + diff.react * .4;
    // pick a run angle with most space
    let best = 0, bs = -1e9;
    for (let a = -1.0; a <= 1.0; a += .25) {
      const ang = (d > 0 ? 0 : Math.PI) + a * d * (d > 0 ? 1 : -1) * -1 * -1;
      const dx = Math.cos(ang), dy = Math.sin(ang); let space = 140;
      for (const q of opps) { const rx = q.x - p.x, ry = q.y - p.y, along = rx * dx + ry * dy; if (along > 0 && along < 140) { const perp = Math.abs(rx * dy - ry * dx); if (perp < 24) space = Math.min(space, along); } }
      const ey = p.y + dy * 60; let sc = space - Math.abs(a) * 18 + (ey < G.Y0 + 25 || ey > G.Y1 - 25 ? -120 : 0) - Math.abs(p.aiAng - ang) * 6 * 0;
      sc += (S.rng() - .5) * 20 * diff.noise; if (sc > bs) { bs = sc; best = ang; }
    }
    p.aiAng = best;
    // decisions
    const tk = opps.filter(q => (q.x - p.x) * d > -10 && dist2(p, q) < 60).sort((a, c) => dist2(p, a) - dist2(p, c))[0];
    p.aiDo = null;
    if (tk) {
      const dd = dist2(p, tk), recs = receivers(p, 0).filter(q => dist2(p, q) < 200);
      let bestR = null, bsc = -1; for (const q of recs) { const sp = opps.reduce((m, o) => Math.min(m, dist2(q, o)), 200); if (sp > bsc) { bsc = sp; bestR = q; } }
      const myspace = dd;
      if (bestR && bsc > myspace + 14 && S.rng() < .55 - diff.noise * .3) p.aiDo = { k: 'pass', r: bestR };
      else if (dd < 22 && p.cd.step <= 0 && S.rng() < .35) p.aiDo = { k: 'step' };
      else if (dd < 17 && p.pow >= 6 && S.rng() < .4) p.aiDo = { k: 'fend' };
    }
    const own22 = Math.abs(p.x - ownX(p.team)) < 225, lead = S.score[p.team] - S.score[opp(p.team)];
    if (!p.aiDo && own22 && opps.some(q => dist2(p, q) < 70) && S.rng() < .25) p.aiDo = { k: 'kick' };
    if (!p.aiDo && Math.abs(ax - p.x) < 230 && lead <= 0 && S.half === 2 && S.clock > TUNE.v.halfLength - 20 && lead >= -3 && p.kck >= 6) p.aiDo = { k: 'drop' };
  }
  const ang = p.aiAng === undefined ? (d > 0 ? 0 : Math.PI) : p.aiAng;
  I.mx = Math.cos(ang); I.my = Math.sin(ang); I.turbo = p.turbo > TUNE.v.turboTank * .3 || Math.abs(ax - p.x) < 300;
  const a = p.aiDo; p.aiDo = null;
  if (a) {
    if (a.k === 'pass') { if (a.r.y < p.y) I.l1 = true; else I.r1 = true; I.hl1 = I.l1; I.hr1 = I.r1; }
    else if (a.k === 'step') I.x = true; else if (a.k === 'fend') I.sq = true;
    else if (a.k === 'kick') { p.aiKick = { t: .5, aim: [S.rng() < .5 ? 0 : 0, p.y < G.CY ? -1 : 1] }; }
    else if (a.k === 'drop') { p.aiKick = { t: .7, aim: null }; }
  }
  if (p.aiKick) { p.aiKick.t -= dt; I.hci = true; if (p.aiKick.t <= 0) { I.hci = false; I.rci = true; if (p.aiKick.aim) { I.mx = p.aiKick.aim[0]; I.my = p.aiKick.aim[1]; } const k = p.aiKick; p.aiKick = null; p.ciHold = Math.max(p.ciHold, .75); } }
  // passes while holding: short taps need only press edge then release next step
  if (p.passSide && !I.l1 && !I.r1) { I.hl1 = p.passSide < 0; I.hr1 = p.passSide > 0; }
  return I;
}
function shapeSlots(team, car) {
  const d = S.dir[team], mates = S.players.filter(q => q.team === team && q !== car && alive(q) && standing(q)).sort((a, c) => a.y - c.y);
  const ks = [-3, -2, -1, 1, 2, 3], res = {};
  const slots = ks.slice(0, mates.length).map(k => ({ x: car.x - d * (18 + 10 * Math.abs(k)), y: clamp(car.y + k * (k * (car.y > G.CY ? -1 : 1) > 0 ? 44 : 36), G.Y0 + 20, G.Y1 - 20) })).sort((a, c) => a.y - c.y);
  mates.forEach((m, i) => { res[m.id] = slots[i] || { x: car.x - d * 25, y: car.y }; }); return res;
}
function supportAI(p, I, car) {
  const sh = S.shape && S.shape.t === S.t && S.shape.team === p.team ? S.shape : (S.shape = { t: S.t, team: p.team, s: shapeSlots(p.team, car) }), s = sh.s[p.id] || { x: car.x - S.dir[p.team] * 25, y: car.y };
  const d = S.dir[p.team]; let tx = s.x, ty = s.y;
  if ((tx - car.x) * d > -6) tx = car.x - d * 6;
  // sweeper stays deep
  goTo(p, I, tx, ty, car.broke || Math.hypot(tx - p.x, ty - p.y) > 60, true);
  // grab power-up
  const u = S.powerups.find(u => u.landed && Math.hypot(u.x - p.x, u.y - p.y) < 100); if (u && p.role >= 5) goTo(p, I, u.x, u.y, true);
  return I;
}
function defendAI(p, I, car, diff) {
  const d = S.dir[p.team], team = p.team;
  const defs = S.players.filter(q => q.team === team && alive(q) && standing(q) && q.role !== 6 || q === p);
  // tackler = nearest by time to intercept
  let nearest = null, nd = 1e9; for (const q of S.players) if (q.team === team && standing(q)) { const dd = dist2(q, car); if (dd < nd) { nd = dd; nearest = q; } }
  const lead = .25;
  if (p === nearest || (dist2(p, car) < 60 && S.rng() < 0)) {
    const tx = car.x + car.vx * lead, ty = car.y + car.vy * lead; goTo(p, I, tx, ty, nd > 25);
    const range = TUNE.v.tackleRange, dd = dist2(p, car);
    const agg = (S.teams[team].style.aggression || 1) * TUNE.v.aiAggression;
    p.aiTk = (p.aiTk || 0) - 1 / 120;
    if (dd < range + 3 && Math.abs(angDiff(Math.atan2(car.y - p.y, car.x - p.x), p.facing)) < 1.1) {
      if ((p.reactDone === undefined) || S.t - p.reactDone > diff.react) { if (p.reactAt === undefined) p.reactAt = S.t + diff.react; if (S.t >= p.reactAt) { p.reactAt = undefined; if (S.rng() < .6 + .3 * agg * .6) I.rx = true; else p.reactAt = S.t + .25; } }
    } else if (dd > 40) { p.reactAt = undefined; }
    // big hit approach
    if (dd < 70 && dd > 20 && (p.pow >= 7 || agg > 1.15) && Math.hypot(car.vx, car.vy) > 40 && (S.rng() < .01)) { p.bigAim = .8; }
    if (p.bigAim > 0) { I.hx = true; p.bigAim -= 1 / 120; if (dd < 22) { I.hx = false; I.rx = true; p.xHold = Math.max(p.xHold, .75); p.bigAim = 0; } }
    // dive from behind
    if (dd > 18 && dd < 32 && Math.hypot(car.vx, car.vy) > Math.hypot(p.vx, p.vy) && Math.abs(angDiff(car.facing, Math.atan2(p.y - car.y, p.x - car.x))) > 2) I.sq = true;
    if (S.hype[team] >= 100 && Math.abs(atkX(opp(team)) * 0 + ownX(team) - car.x) < 120 + 100) I.tri = true;
    return I;
  }
  // defensive line
  const line = car.x + d * 30, mates = S.players.filter(q => q.team === team && alive(q) && q !== nearest).sort((a, c) => a.y - c.y);
  const opps = S.players.filter(q => q.team !== team && alive(q) && q !== car).sort((a, c) => a.y - c.y), k = mates.indexOf(p);
  let ty = opps[k] ? opps[k].y : p.y, tx = line + (p.role === 6 || p.role === 4 ? d * 80 : 0);
  if (p.role === 6) { tx = ownX(team) + d * 140; ty = lerp(car.y, G.CY, .5); if (Math.abs(car.x - ownX(team)) < 200) tx = car.x + d * 30; }
  // cheap shots on supports
  if (!S.ref.down && S.teams[team].style.cheapShots > 0 && S.rng() < .0008 * S.teams[team].style.cheapShots * 40 * TUNE.v.aiAggression) { const o = opps.find(q => dist2(q, p) < 18); if (o && !refSees(p)) { goTo(p, I, o.x, o.y); I.rx = true; return I; } }
  const dx = Math.abs(tx - p.x) > 220; goTo(p, I, tx, ty, dx, true);
  return I;
}
function looseAI(p, I) {
  const b = S.ball, team = p.team;
  const tx = b.x + b.vx * .3, ty = b.y + b.vy * .3; let rank = 0, mine = dist2(p, { x: tx, y: ty });
  for (const q of S.players) if (q.team === team && q !== p && standing(q) && dist2(q, { x: tx, y: ty }) < mine) rank++;
  let kx = tx, ky = ty;
  if (b.st === 'kick' && S.kickInfo) { kx = S.kickInfo.x; ky = S.kickInfo.y; if (b.drop) { /* nobody chases a drop goal */ } }
  if (rank < 2) goTo(p, I, kx, ky, true);
  else { const d = S.dir[team]; goTo(p, I, clamp(b.x - d * (20 + rank * 15), G.X0 - 40, G.X1 + 40), clamp(b.y + (p.role - 3) * 30, G.Y0 + 10, G.Y1 - 10), false, true); }
  return I;
}
function ruckAI(p, I) {
  const s = S.sp, mark = S.ruckMark || { x: S.ball.x, y: S.ball.y }, dA = S.dir[s.team];
  if (p.team === s.team) { const k = p.role - 3; goTo(p, I, mark.x - dA * (30 + Math.abs(k) * 14), mark.y + k * 38, false, true); }
  else { const k = p.role - 3; goTo(p, I, mark.x + dA * (18 + Math.abs(k) * 6), mark.y + k * 42, false, true); }
  return I;
}
// intents for every player: humans from their seats, everyone else from the brain
function buildIntents(dt) {
  const out = new Array(S.players.length);
  for (const p of S.players) {
    if (p.ctl >= 0 && S.seats[p.ctl] && S.seats[p.ctl].kind !== 'cpu' && S.seatI[p.ctl] && !S.seats[p.ctl].auto) out[p.id] = S.seatI[p.ctl];
    else out[p.id] = aiIntent(p, dt);
  }
  return out;
}
