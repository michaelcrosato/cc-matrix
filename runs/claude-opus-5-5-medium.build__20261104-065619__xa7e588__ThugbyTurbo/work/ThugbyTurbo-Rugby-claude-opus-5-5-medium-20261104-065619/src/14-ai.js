/* ---- THE AI: one brain for every CPU player (both teams, and humans' teammates); difficulty and team style change its
 * numbers, never its logic. Team shapes every 0.25 s; decisions every 0.15 s plus the reaction delay. It speaks only in
 * intents: a stick and buttons, as a player would ---- */
TT.ai = {};
const blankIntent = () => ({ mx: 0, my: 0, turbo: false, p: {}, h: {}, r: {}, aim: null, click: -1 });
TT.blankIntent = blankIntent;

/** intents for every CPU player this step (into out[id]) */
TT.ai.intents = (out, dt) => {
  if (!M) return out;
  const live = M.phase === 'play' || M.phase === 'ruck';
  M.aiShapeT = (M.aiShapeT || 0) - dt;
  if (M.aiShapeT <= 0) { M.aiShapeT = .25; shapes(); }
  for (const p of M.players) {
    if (p.ctl >= 0 || !onField(p)) continue;
    const it = out[p.id] = blankIntent();
    if (!live || cheat('cpuFrozen') && p.team === 1) continue;
    brain(p, it, dt);
  }
  return out;
};

/* ---- shapes: a target spot for every player off the ball ---- */
function shapes() {
  const b = M.ball, h = holder();
  let att = M.possession, cx = b.x, cy = b.y;
  if (M.phase === 'ruck') { att = M.ph.team; cx = b.x; cy = b.y; }
  else if (b.st === 'air' && b.kind === 'pass' && pl(b.target)) { const r = pl(b.target); cx = r.x; cy = r.y; }
  else if (h) { cx = h.x; cy = h.y; att = h.team; }
  const d = dirOf(att), def = 1 - att;
  // attack: a staggered line behind the carrier, three each side
  const slots = [];
  for (let k = 1; k <= 3; k++) for (const s of [-1, 1]) {
    const open = (s > 0) === (cy < G.CY), sp = open ? 44 : 36;
    slots.push({ x: cx - d * (18 + 10 * k + (M.phase === 'ruck' ? 8 : 0)), y: clamp(cy + s * sp * k, G.Y0 + 20, G.Y1 - 20), k, used: false });
  }
  const mates = M.players.filter(p => p.team === att && onField(p) && (!h || p !== h) && p.st !== 'ruck');
  mates.sort((a, c) => (a.idx < 3 ? 0 : 1) - (c.idx < 3 ? 0 : 1) || a.idx - c.idx);
  for (const p of mates) {
    let best = null, bd = 1e9;
    for (const s of slots) { if (s.used) continue; if (p.idx < 3 && s.k > 2) continue; const dd = Math.hypot(s.x - p.x, s.y - p.y) + (p.idx >= 5 ? -s.k * 30 : 0); if (dd < bd) { bd = dd; best = s; } }
    if (!best) best = slots.find(s => !s.used) || { x: cx - d * 40, y: cy };
    best.used = true; p.tx = best.x; p.ty = best.y; p.role2 = 'support';
    if (M.phase === 'ruck' && p.idx === 3 && p.team === att) { p.tx = b.x - d * 14; p.ty = b.y; p.role2 = 'base'; }
  }
  // defence: a line across the field in front of the attack, man on man by y; the tackler, the cover and the sweeper
  const defs = M.players.filter(p => p.team === def && standing(p) && p.st !== 'ruck');
  const lineX = M.phase === 'ruck' ? cx + d * 16 : cx + d * 30;
  const nearLine = Math.abs(tryLineOf(att) - cx) < 200;
  let sweeper = defs.find(p => p.idx === 6) || defs.find(p => p.idx === 4);
  if (nearLine || defs.length < 5) sweeper = null;
  const atts = M.players.filter(p => p.team === att && onField(p) && p.st !== 'ruck').sort((a, c) => a.y - c.y);
  let tackler = null, cover = null;
  if (h && h.team === att && M.phase === 'play') {
    const byT = defs.filter(p => p !== sweeper || Math.hypot(p.x - h.x, p.y - h.y) < 60).sort((a, c) => intercept(a, h) - intercept(c, h));
    tackler = byT[0] || null; cover = byT[1] || null;
  }
  const line = defs.filter(p => p !== tackler && p !== cover && p !== sweeper).sort((a, c) => a.y - c.y);
  const ys = atts.length ? atts.map(a => a.y) : [cy];
  line.forEach((p, i) => {
    const k = line.length > 1 ? i / (line.length - 1) : .5, ay = ys[Math.round(k * (ys.length - 1))];
    const spread = defs.length < 7 ? 1.12 : 1;
    p.tx = clamp(lineX + (Math.abs(ay - cy) * .08) * d, G.DEAD[0] + 10, G.DEAD[1] - 10); p.ty = clamp(G.CY + (ay - G.CY) * spread, G.Y0 + 14, G.Y1 - 14); p.role2 = 'line';
  });
  if (sweeper) { sweeper.tx = clamp(cx + d * 140, G.DEAD[0], G.DEAD[1]); sweeper.ty = lerp(cy, G.CY, .5); sweeper.role2 = 'sweeper'; }
  if (tackler) { tackler.role2 = 'tackler'; }
  if (cover) { cover.role2 = 'cover'; cover.tx = h.x + d * 20; cover.ty = h.y + (G.CY - h.y) * .15; }
  // loose balls and kicks: the nearest two of each side go for it
  if (b.st === 'loose' || (b.st === 'air' && b.kind !== 'pass' && b.kind !== 'throw')) {
    const spot = b.st === 'air' && b.landing ? b.landing : { x: b.x + b.vx * .4, y: b.y + b.vy * .4 };
    for (const t of [0, 1]) {
      const near = M.players.filter(p => p.team === t && standing(p) && p.st !== 'ruck').sort((a, c) => Math.hypot(a.x - spot.x, a.y - spot.y) / speedOf(a) - Math.hypot(c.x - spot.x, c.y - spot.y) / speedOf(c)).slice(0, 2);
      near.forEach((p, i) => { p.tx = spot.x + (i ? -dirOf(t) * 14 : 0); p.ty = spot.y; p.role2 = 'chase'; });
    }
  }
  // off the pitch: keep the targets inside it
  for (const p of M.players) { if (p.tx == null) { p.tx = p.x; p.ty = p.y; } p.ty = clamp(p.ty, G.Y0 + 8, G.Y1 - 8); }
}
const speedOf = p => TUNE.v.runSpeed * (.8 + .04 * statOf(p, 'SPD'));
function intercept(p, h) { const t = Math.hypot(h.x - p.x, h.y - p.y) / speedOf(p); return Math.hypot(h.x + h.vx * t * .5 - p.x, h.y + h.vy * t * .5 - p.y) / speedOf(p) + (p.st === 'getup' ? .5 : 0); }
TT.ai.shapes = () => shapes();

/* ---- the brain ---- */
function brain(p, it, dt) {
  const b = M.ball, h = holder(), D = M.diff[p.team] || TT.DIFF.Pro, style = M.teams[p.team].style;
  p.ai = p.ai || { t: 0, btn: null, react: 0, plan: null };
  const ai = p.ai; ai.t -= dt;
  // a held button script (a long pass, a punt's meter, a big hit's charge)
  if (ai.btn) {
    const k = ai.btn; k.t -= dt;
    if (k.t > 0 && (!k.until || !k.until())) it.h[k.k] = true; else { it.r[k.k] = true; ai.btn = null; }
  }
  if (p.st === 'tackled' && h === p && !p.offTry) { p.offTry = true; if (rnd() < style.pass * .35) { const side = pickPass(p); if (side) it.p[side.k] = true; } return; }
  if (p.st === 'tackled' || !isFree(p)) return;
  if (h === p) return carrierBrain(p, it, dt, D, style);
  // the Hurricane Hit homes in by itself; the support and defence shapes
  let tx = p.tx, ty = p.ty, turbo = false;
  if (b.st === 'air' && b.kind === 'pass' && b.target === p.id) { const lead = predictBall(.25); tx = lead.x; ty = lead.y; }
  if (p.role2 === 'tackler' && h && h.team !== p.team) {
    const t = Math.min(.6, Math.hypot(h.x - p.x, h.y - p.y) / speedOf(p));
    tx = h.x + h.vx * t; ty = h.y + h.vy * t; turbo = Math.hypot(h.x - p.x, h.y - p.y) > 25;
    defendDecision(p, h, it, dt, D, style);
  }
  if (p.role2 === 'chase') turbo = true;
  if (p.role2 === 'support' && h && h.team === p.team && h.lineBroken) turbo = true;
  // a power-up within reach: one off-ball player goes for it
  if (M.pu && M.pu.landed && p.role2 !== 'tackler' && Math.hypot(M.pu.x - p.x, M.pu.y - p.y) < 100 && !M.players.some(q => q !== p && q.puChase && q.team === p.team)) { tx = M.pu.x; ty = M.pu.y; p.puChase = true; } else p.puChase = false;
  // cheap shots, when the ref isn't looking
  if (h && h.team !== p.team && !ai.btn && ai.t <= 0) {
    ai.t = .15;
    if (rnd() < style.cheap * .04 * (TUNE.v.aiAggression / .5)) {
      const v = M.players.find(q => q.team !== p.team && q !== h && standing(q) && Math.hypot(q.x - p.x, q.y - p.y) < 13);
      if (v && !refSees(p) && Math.abs(TT.angDiff(p.facing, Math.atan2(v.y - p.y, v.x - p.x))) < 1) it.p.x = true;
    }
  }
  steer(p, it, tx, ty, turbo);
  // supers on defence: the Hurricane Hit when the carrier nears our line
  if (h && h.team !== p.team && M.hype[p.team] >= 100 && p.role2 === 'tackler' && Math.abs(tryLineOf(h.team) - h.x) < 120 && (style.supers || rnd() < .02)) it.p.tri = true;
}
function predictBall(t) { const b = M.ball; return { x: b.x + b.vx * t, y: b.y + b.vy * t }; }
function steer(p, it, tx, ty, turbo) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d > 3) { const s = d > 14 ? 1 : d / 14; it.mx = dx / d * s; it.my = dy / d * s; }
  it.turbo = turbo && p.turbo > .3 || (d > 90 && p.turbo > .5);
}
function defendDecision(p, h, it, dt, D, style) {
  const ai = p.ai, d = Math.hypot(h.x - p.x, h.y - p.y), facing = Math.abs(TT.angDiff(p.facing, Math.atan2(h.y - p.y, h.x - p.x))) < 1.1;
  ai.react = (ai.react || 0) + dt;
  if (ai.btn) return;
  const reaction = D.aiReaction * (TUNE.v.aiReaction / .25);
  if (ai.react < reaction) return;
  const aggr = clamp(style.aggression * (TUNE.v.aiAggression / .5), 0, 1);
  const headOn = Math.abs(TT.angDiff(h.facing + PI, Math.atan2(p.y - h.y, p.x - h.x))) < .7;
  if ((statOf(p, 'POW') >= 7 || aggr >= .6 || p.data.boss) && headOn && d < 40 && d > 22 && rnd() < .05 + aggr * .05) {
    ai.btn = { k: 'x', t: 2, until: () => { const hh = holder(); return !hh || hh.team === p.team || Math.hypot(hh.x - p.x, hh.y - p.y) < 15 || p.charge > TUNE.v.bigHitCharge * 1.05; } };
    return;
  }
  if (d < TUNE.v.tackleRange + 2 && facing) { if (rnd() < (.6 + .3 * aggr) * dt * 14) { it.p.x = true; ai.react = 0; } return; }
  const behind = (p.x - h.x) * dirOf(h.team) < 0;
  if (behind && d > 18 && d < TUNE.v.diveRange && speedOf(h) >= speedOf(p) * .95 && rnd() < dt * 2) { it.p.sq = true; ai.react = 0; }
}

/** the CPU carrier: run at the gaps, pass when pressed, step and fend, kick, ground it */
function carrierBrain(p, it, dt, D, style) {
  const ai = p.ai, d = dirOf(p.team), tl = tryLineOf(p.team), toLine = (tl - p.x) * d;
  const foes = M.players.filter(q => q.team !== p.team && standing(q));
  const nearF = foes.map(q => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, c) => a.d - c.d);
  const closest = nearF[0];
  // in their in-goal: dive, or run to the posts when nobody is near
  if (toLine < 0) {
    const free = !closest || closest.d > 60;
    if (!free || Math.abs(p.y - G.CY) < 30 || toLine < -60) { it.p.x = true; return; }
    steer(p, it, tl + d * 30, G.CY, true); return;
  }
  // the run: toward the line, steering for the widest gap, kept inside touch
  let bestA = d > 0 ? 0 : PI, bestS = -1e9;
  for (let k = -4; k <= 4; k++) {
    const a = (d > 0 ? 0 : PI) + k * .2; let s = 0;
    const ex = p.x + Math.cos(a) * 60, ey = p.y + Math.sin(a) * 60;
    if (ey < G.Y0 + 20 || ey > G.Y1 - 20) s -= 200;
    for (const f of nearF.slice(0, 5)) { const dd = Math.hypot(f.q.x - ex, f.q.y - ey); s += Math.min(dd, 80); }
    s -= Math.abs(k) * 6;
    if (s > bestS) { bestS = s; bestA = a; }
  }
  it.mx = Math.cos(bestA); it.my = Math.sin(bestA);
  const space = !closest || closest.d > 50;
  it.turbo = (space && toLine < 300) || p.turbo > .3 && toLine < 120 || p.lineBroken || closest && closest.d < 30 && p.turbo > .3;
  if (ai.btn) return;
  ai.t -= 0; if (ai.t > 0) return;
  ai.t = .1 + D.aiReaction * .3 * (TUNE.v.aiReaction / .25);
  const noise = () => (rnd() - .5) * D.noise;
  // supers: Thunder Run in their half with space ahead
  if (M.hype[p.team] >= 100 && toLine < 520 && (space || style.supers) && rnd() < .5) { it.p.tri = true; return; }
  // the use-it timer: the scrum-half gets it out
  if (M.useIt && M.useIt.pid === p.id && M.useIt.t > .4 + rnd()) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
  const tackler = closest && closest.d < 60 ? closest.q : null, tD = closest ? closest.d : 999;
  // drop goal: the last moments, trailing by three or fewer, in range
  const behindBy = M.score[1 - p.team] - M.score[p.team];
  if (((M.hooter || M.clock > M.halfLen - 20) && M.half === 2 && behindBy > 0 && behindBy <= 3 || M.suddenDeath) && toLine < 260 && Math.abs(p.y - G.CY) < 160 && (!tackler || tackler.d > 18)) { ai.btn = { k: 'ci', t: .75 }; return; }
  // in our own 22 under pressure: find touch
  const own = (p.x - ownLineOf(p.team)) * d;
  if (own < 225 && tackler && rnd() < .5 + style.kick * .5) { it.mx = d * .6; it.my = p.y < G.CY ? -.8 : .8; ai.btn = { k: 'ci', t: .6 + rnd() * .3 }; return; }
  if (tackler) {
    const committing = Math.hypot(tackler.vx, tackler.vy) > 20 || tD < 18;
    if (tD < 26 && committing && p.sideCd <= 0 && rnd() < .25 * (statOf(p, 'HND') / 7) + noise()) { it.p.x = true; it.mx = -Math.sin(bestA) * (rnd() < .5 ? 1 : -1); it.my = Math.cos(bestA); return; }
    if (tD < 20 && statOf(p, 'POW') >= 6 && p.fendCd <= 0 && rnd() < .4 + noise()) { it.p.sq = true; return; }
    if (tD < 40 && !(p.lineBroken && tD > 22) && (tackler.x - p.x) * d > -6 && rnd() < style.pass * .5 + .1 + noise()) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
    // a grubber or chip behind a flat line
    if (tD < 40 && rnd() < style.kick * .1 && toLine > 80 && toLine < 400) { it.mx = d; it.my = 0; it.p.ci = true; it.r.ci = true; return; }
  }
  if (!tackler && !p.lineBroken && toLine > 150 && rnd() < style.pass * .02) { const side = pickPass(p); if (side) { passButton(p, it, side); return; } }
  // offload in contact: handled at the tackle (the brain presses a pass button right after)
  if (p.st === 'tackled' && p.stT < .15) { const side = pickPass(p); if (side) it.p[side.k] = it.r[side.k] = true; }
}
/** the best receiver: his space minus defenders near the lane */
function pickPass(p) {
  let best = null, bs = -1e9;
  for (const side of [-1, 1]) {
    const list = receivers(p, side);
    list.slice(0, 2).forEach((r, i) => {
      let s = 0; for (const q of M.players) if (q.team !== p.team && standing(q)) { s += Math.min(80, Math.hypot(q.x - r.x, q.y - r.y)) * .5; if (TT.segDist(q, p, r) < 14) s -= 60; }
      s -= i * 10 + Math.abs(r.y - p.y) * .05;
      if (s > bs) { bs = s; best = { k: side < 0 ? 'l1' : 'r1', long: i === 1 }; }
    });
  }
  return best;
}
function passButton(p, it, side) {
  if (side.long) p.ai.btn = { k: side.k, t: .3 };
  else { it.h[side.k] = false; it.r[side.k] = true; }
}
TT.ai.pickPass = p => pickPass(p);

/** the CPU's intent for one player, as if a human gave it (autopilot seats: tests, the playthrough) */
TT.ai.intentFor = (p, dt) => {
  const it = blankIntent();
  if (!p || !onField(p)) return it;
  if (M.phase === 'play' || M.phase === 'ruck') brain(p, it, dt);
  // set pieces: a decent human's timing
  if (M.phase === 'scrum') { if (M.sub === 'set' && Math.abs(M.ph.subT - .5) < .02) it.p.x = true; if (M.sub === 'push' && Math.floor(M.t * 16) % 2) it.p[Math.floor(M.t * 8) % 2 ? 'l1' : 'r1'] = true; }
  if (M.phase === 'lineout') { if (M.sub === 'call' && M.ph.subT > .2) it.p.x = true; if (M.sub === 'throw' && Math.abs(M.ph.needle) < .15) it.p.x = true; }
  if (M.phase === 'ruck' && Math.floor(M.t * 20) % 2) it.p.x = true;
  if (M.phase === 'penalty' && M.phaseT > 1) it.p.x = true;
  if (M.phase === 'kickoff' && M.ph.kicker === p.id) { if (M.phaseT < 1.2) it.h.ci = true; else it.r.ci = true; }
  if (M.phase === 'setkick' && M.ph.kicker === p.id) { if (M.sub === 'place') it.p.x = true; else if (M.sub === 'aim') { if (M.ph.power < Math.min(1, M.ph.need + .07) && (M.ph.powT || 0) < .97) it.h.ci = true; else it.r.ci = true; } }
  if ((M.phase === 'walkout' || M.phase === 'half') && M.phaseT > 1) it.p.x = true;
  return it;
};
