/* ============ 13-ai: the team brain: spots, pressing, carrying, set-piece routines ============ */
EF.AI = (() => {
  const P = Pitch, W = P.X1 - P.X0, H = P.Y1 - P.Y0, rngOf = M => M.rng;
  const tacOf = (M, side) => EF.get('tactic', M.teams[side].data.tactic) || EF.get('tactic', 'plucky');
  const toX = (side, u) => side === 0 ? P.X0 + u * W : P.X1 - u * W;
  const uOf = (side, x) => side === 0 ? (x - P.X0) / W : (P.X1 - x) / W;
  const busOn = (M, side) => { const tm = M.teams[side]; if (tm.data.tactic !== 'catenaccio') return false; const lead = M.score[side] - M.score[1 - side]; const late = M.clock > M.halfSecs * .45 && M.half === 2 || M.extra; return lead > 0 && late; };
  function baseSpot(M, f, mode) {
    const slot = M.teams[f.side].formation.slots[f.slot]; let u = slot[1], v = slot[2];
    if (mode === 'kickoff') { u = Math.min(u, .46); if (f.slot > 0) u = Math.min(u, .45); if (f.role === 'FWD') u = Math.min(u, .42); }
    return [toX(f.side, u), P.Y0 + v * H];
  }
  function spot(M, f) {
    const side = f.side, tac = tacOf(M, side), slot = M.teams[side].formation.slots[f.slot], role = EF.ROLE[slot[0]], ball = M.ball, owner = ball.owner;
    let [, u, v] = slot; const att = owner && owner.side === side, def = owner && owner.side !== side, ballU = uOf(side, ball.x);
    if (att) { u += role.att[0]; v += role.att[1]; } else if (def) u += role.def[0];
    u += (ballU - .5) * (f.role === 'DEF' ? .22 : f.role === 'FWD' ? .3 : .26) + (tac.line - .45) * (def ? .3 : .12);
    if (busOn(M, side) && f.role !== 'GK') { u = .1 + f.slot * .035; if (!M.busAnnounced) { M.busAnnounced = true; M.emit('bus', { side }); } }
    const r = role.range; u = clamp(u, r[0], r[1]); if (f.role === 'GK') return [toX(side, .03), P.CY];
    const by = (ball.y - P.Y0) / H; v = clamp(lerp(v, by, .18 + (att ? .06 : .12)), .1, .9);
    // man-marking
    if (f.data.markman && def) { const t = M.teams[1 - side].F.filter(g => !g.sentOff && !g.isGK).sort((a, b) => b.data.skill - a.data.skill)[0]; if (t) return [lerp(t.x, P.ownGoalX(side), .2), t.y]; }
    return [toX(side, u), P.Y0 + v * H];
  }
  function setPieceSpot(M, f, sp) {
    const side = f.side, dirOwn = side === 0 ? 1 : -1, gxOwn = P.ownGoalX(side), gxAtt = P.goalX(side), mine = sp.side === side, idx = f.slot, ball = M.ball;
    if (f.isGK) { if (sp.type === 'penalty' && !mine) return [gxOwn + dirOwn * 4, P.CY]; return [gxOwn + dirOwn * (sp.type === 'goalkick' && mine ? 12 : 14), P.CY]; }
    const t = sp.taker;
    switch (sp.type) {
      case 'penalty': { const edge = gxAtt + (sp.side === 0 ? -1 : 1) * 0; const bx = P.goalX(sp.side) + (sp.side === 0 ? -1 : 1) * -(P.BOXD + 18); const j = idx % 4 - 1.5; return [P.goalX(sp.side) - (sp.side === 0 ? 1 : -1) * (P.BOXD + 18), P.CY + j * 22 + (side === sp.side ? 0 : 11)]; }
      case 'corner': {
        const tgx = P.goalX(sp.side), inward = sp.side === 0 ? -1 : 1, spots = [[-34, -26], [-40, 0], [-30, 26], [-70, 40]];
        const s = spots[(idx + (mine ? 0 : 1)) % spots.length]; return [tgx - inward * s[0] + (mine ? 0 : inward * 6), P.CY + s[1] + (mine ? 0 : 6)];
      }
      case 'freekick': {
        const tgx = P.goalX(sp.side), toGoal = Math.atan2(P.CY - sp.y, tgx - sp.x), dd = Math.hypot(tgx - sp.x, P.CY - sp.y);
        if (!mine && !f.isGK) { const defs = M.F.filter(g => g.side === side && !g.isGK && !g.sentOff).sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y)); const k = defs.indexOf(f); if (dd < 330 && k >= 0 && k < 3) { const px = -Math.sin(toGoal), py = Math.cos(toGoal); return [sp.x + Math.cos(toGoal) * 40 + px * (k - 1) * 11, sp.y + Math.sin(toGoal) * 40 + py * (k - 1) * 11]; } return [lerp(sp.x, gxOwn, .5) + (idx - 2) * 6, lerp(sp.y, P.CY, .5) + (idx - 2) * 16]; }
        if (dd < 330) return [tgx - (sp.side === 0 ? 1 : -1) * (30 + (idx % 3) * 22), P.CY + ((idx % 4) - 1.5) * 24];
        const b = spot(M, f); return [lerp(b[0], sp.x, .35), lerp(b[1], sp.y, .25)];
      }
      case 'goalkick': { if (mine) { const b = baseSpot(M, f); return [lerp(b[0], toX(side, .55), .55), b[1]]; } return [toX(side, .45 + idx * .05), P.Y0 + (idx / 4) * H]; }
      case 'throwin': { const inward = sp.y < P.CY ? 1 : -1; const k = (idx % 3) - 1; return [clamp(sp.x + (mine ? (dirOwn * 30 + k * 24) : (k * 22 - dirOwn * 10)), P.X0 + 10, P.X1 - 10), sp.y + inward * (mine ? 34 + (idx % 2) * 30 : 30 + (idx % 2) * 24)]; }
    }
    return spot(M, f);
  }
  const mkB = (down, pressed) => ({ down, pressed, released: false, held: 0 });
  /** the carrier's plan, every few tenths of a second */
  function decideCarry(M, f, ai) {
    const side = f.side, tac = tacOf(M, side), T = EF.T, rng = M.rng, gx = P.goalX(side), dg = Math.hypot(gx - f.x, P.CY - f.y), skill = side === 1 ? T.aiSkill : .9 + (T.aiSkill - 1) * .4;
    const foes = M.F.filter(o => o.side !== side && !o.sentOff), keeper = foes.find(o => o.isGK), pr = M.pressure(f);
    const mates = M.F.filter(o => o.side === side && o !== f && !o.sentOff && !o.isGK);
    const range = tac.shootRange * (.8 + (f.data.shoot || 70) / 400) * (.9 + .1 * skill);
    const euf = M.europhoria && M.europhoria.side === side;
    const plan = { type: 'carry', move: null, action: null, hold: 0, aimY: 0, until: M.t + .22 + rng() * .2 };
    const toGoal = Math.atan2(P.CY - f.y, gx - f.x), fx = side === 0 ? 1 : -1;
    // dive for the penalty (theatrics), the Lucchetto way
    const near = foes.find(o => Math.hypot(o.x - f.x, o.y - f.y) < 18);
    if (near && (f.data.diver || tac.dive > .1) && rng() < (f.data.diver ? .09 : tac.dive * .05) && Pitch.inBox(f.x, f.y, 1 - side)) { plan.action = 'dive'; return plan; }
    // shoot
    const inZone = dg < range || (euf && dg < 360);
    const ka = keeper ? keeper.y : P.CY; plan.aimY = clamp((P.CY - ka) < 0 ? .72 : -.72, -1, 1) * (rng() < .6 ? 1 : -.6) + (rng() - .5) * .3;
    if (inZone && (Math.abs(f.y - P.CY) < 190) && rng() < (euf ? 1 : .55 + (pr ? .1 : 0))) { plan.action = 'shoot'; plan.hold = euf ? .55 * T.chargeTime : (.35 + rng() * .35) * T.chargeTime * (dg > 180 ? 1.2 : .8); plan.until = M.t + plan.hold + .5; return plan; }
    // pass when pressed, or by taste
    const best = pickPassTarget(M, f, mates, tac);
    if (best && (pr >= 1 && rng() < .75 || rng() < .09 * tac.tempo || (tac.shortBias && rng() < .12))) {
      const m = best.m, d = Math.hypot(m.x - f.x, m.y - f.y); const lobIt = (tac.longBall || 0) > rng() * 1.6 && d > 160 || (M.openness(f) < 24 && best.blocked); const thr = rng() < .22 && (m.x - f.x) * fx > 20 && !lobIt;
      plan.action = lobIt ? 'lob' : thr ? 'through' : 'pass'; plan.aim = Math.atan2(m.y - f.y, m.x - f.x); plan.until = M.t + .3; return plan;
    }
    // skill past a man
    if (near && rng() < .10 * (f.data.skill || 70) / 70 * T.aiAggro && pr <= 2) { plan.action = 'skill'; plan.aim = toGoal; return plan; }
    // dribble: toward goal, around the nearest man in front
    let ang = toGoal; const ahead = foes.filter(o => Math.abs(angDiff(Math.atan2(o.y - f.y, o.x - f.x), ang)) < .9 && Math.hypot(o.x - f.x, o.y - f.y) < 55).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
    if (ahead) { const side2 = Math.sign(angDiff(Math.atan2(ahead.y - f.y, ahead.x - f.x), ang)) || 1; ang -= side2 * .9; }
    if (tac.shortBias && dg > 220 && best && rng() < .5) ang = Math.atan2(best.m.y - f.y, best.m.x - f.x);
    plan.move = [Math.cos(ang), Math.sin(ang)]; plan.sprint = !near && f.stamina > .3; return plan;
  }
  function pickPassTarget(M, f, mates, tac) {
    let best = null, bs = -99; const fx = f.side === 0 ? 1 : -1;
    for (const m of mates) {
      const d = Math.hypot(m.x - f.x, m.y - f.y); if (d < 28 || d > 320) continue;
      const open = M.openness(m), fwd = ((m.x - f.x) * fx) / 200; let blocked = false;
      for (const o of M.F) { if (o.side === f.side || o.sentOff) continue; const t = clamp(((o.x - f.x) * (m.x - f.x) + (o.y - f.y) * (m.y - f.y)) / (d * d), 0, 1); if (Math.hypot(f.x + (m.x - f.x) * t - o.x, f.y + (m.y - f.y) * t - o.y) < 12) { blocked = true; break; } }
      const s = open / 40 + fwd * (1 - (tac.shortBias || 0) * .6) - d / 400 - (blocked ? 1.4 : 0) + (m.role === 'FWD' ? .3 : 0) + (tac.shortBias ? -Math.abs(d - 90) / 220 : 0);
      if (s > bs) { bs = s; best = { m, blocked }; }
    }
    return best;
  }
  function intent(M, f) {
    const I = EF.Intent(), ball = M.ball, T = EF.T, rng = M.rng, side = f.side, ai = f.ai, tac = tacOf(M, side), T0 = M.t;
    if (f.isGK || (EF.dev.freezeAI && f.human === null)) return I; if (M.rules.training && M.o.dummies && f.side === M.o.dummies) return I;
    const owner = ball.owner, dB = Math.hypot(ball.x - f.x, ball.y - f.y);
    const move = (tx, ty, sprint) => { const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy); if (d > 3) { const k = Math.min(1, d / 14); I.move = [dx / d * k, dy / d * k]; } I.sprint = !!sprint && f.stamina > .12 && d > 24; };
    const europ = M.europhoria && M.europhoria.side === side;
    // ---- with the ball ----
    if (owner === f) {
      if (!ai.plan || ai.plan.type !== 'carry' || T0 > ai.plan.until || f.cool > 0 && ai.plan.action === 'pass') { if (f.cool <= 0 || !ai.plan) ai.plan = decideCarry(M, f, ai); else { ai.plan = { type: 'carry', move: [Math.cos(f.facing), Math.sin(f.facing)], until: T0 + .15 }; } }
      const p = ai.plan; const react = ai.react = (ai.react === undefined ? 0 : ai.react);
      if (p.move) { I.move = p.move.slice(); I.sprint = !!p.sprint; }
      else { const gx = P.goalX(side); I.move = [Math.cos(Math.atan2(P.CY - f.y, gx - f.x)), Math.sin(Math.atan2(P.CY - f.y, gx - f.x))].map(v => v * .6); }
      if (p.action === 'shoot') { if (!p.t0) p.t0 = T0; I.aim = [0, p.aimY]; if (T0 - p.t0 < p.hold) { I.shoot.down = true; I.shoot.held = T0 - p.t0; } else if (f.charging) { /* release */ I.shoot.down = false; I.shoot.released = true; } else if (!f.charging && T0 - p.t0 < p.hold + .05) { I.shoot.down = true; } else { ai.plan = null; }
        const gx = P.goalX(side); I.move = [Math.cos(Math.atan2(P.CY - f.y, gx - f.x)) * .4, Math.sin(Math.atan2(P.CY - f.y, gx - f.x)) * .4]; }
      else if (p.action && !p.done) { p.done = true; const a = p.aim !== undefined ? p.aim : f.facing; I.move = [Math.cos(a), Math.sin(a)]; const b = I[p.action === 'dive' ? 'dive' : p.action]; b.pressed = true; b.down = true; if (p.action === 'dive') I.dive.pressed = true; if (p.action === 'skill') I.move = [Math.cos(a), Math.sin(a)]; ai.plan = { type: 'carry', until: T0 + .2, move: I.move.slice() }; }
      if (europ && M.eu[side] >= 1) I.euphoria = false;
      return I;
    }
    ai.plan = null;
    // ---- europhoria button for the CPU is handled by the match ----
    const spotT = spot(M, f);
    const mates = M.F.filter(o => o.side === side && !o.isGK && !o.sentOff), foes = M.F.filter(o => o.side !== side && !o.sentOff);
    const nearestMate = mates.slice().sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
    const foesNear = foes.filter(o => !o.isGK).sort((a, b) => Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y));
    const humanChasing = new Set(M.humans.map(h => h.f));
    // a pass coming to me, or a loose ball I am nearest to
    if (!owner) {
      const incoming = ball.passTo === f && ball.speed() > 30;
      const rank = nearestMate.filter(m => !humanChasing.has(m)).indexOf(f);
      const air = ball.z > 6 && ball.z < 40 && dB < 30;
      if (incoming || (rank === 0 && (!ball.passTo || ball.passTo.side !== side || ball.passTo === f)) || (rank === 1 && tac.press > .8 && ball.speed() < 40)) {
        const lead = clamp(dB / Math.max(80, ball.speed()), 0, .8); let tx = ball.x + ball.vx * lead, ty = ball.y + ball.vy * lead; if (!incoming && ball.z > 10 && ball.vz !== 0) { const t = Math.max(0, (ball.vz + Math.sqrt(Math.max(0, ball.vz * ball.vz + 2 * 600 * ball.z))) / 600); tx = ball.x + ball.vx * t * .8; ty = ball.y + ball.vy * t * .8; }
        move(tx, ty, dB > 40);
        if (air && f.cool <= 0 && rng() < .12 * T.aiSkill) { const own = Math.abs(P.goalX(side) - f.x) > Math.abs(P.ownGoalX(side) - f.x); const b = own ? (rng() < .5 ? I.shoot : I.pass) : I.lob; b.pressed = true; b.down = true; }
        return I;
      }
    }
    // an opponent has the ball: press it
    if (owner && owner.side !== side) {
      const nOpp = tac.pressers || 1, r = mates.filter(m => !humanChasing.has(m)).sort((a, b) => Math.hypot(a.x - owner.x, a.y - owner.y) - Math.hypot(b.x - owner.x, b.y - owner.y)).slice(0, Math.max(1, Math.round(nOpp * (.6 + tac.press * .5))));
      const d = Math.hypot(owner.x - f.x, owner.y - f.y);
      if (r.includes(f) && (d < 220 * T.aiPress * (.5 + tac.press) || mates.indexOf(f) >= 0 && f.role !== 'FWD')) {
        // approach from goal side
        const tx = owner.x + owner.vx * .25, ty = owner.y + owner.vy * .25;
        move(tx, ty, d > 36 && f.stamina > .2);
        if (d < 19 && f.cool <= 0 && f.state === 'run' && M.t - (ai.lastTackle || 0) > .5 / Math.max(.3, T.aiAggro)) {
          const behindMe = Math.abs(angDiff(f.facing, Math.atan2(owner.y - f.y, owner.x - f.x))) < 1.1;
          if (behindMe && rng() < .5 * T.aiAggro * (T.aiSkill) * tac.press) { I.pass.pressed = true; I.pass.down = true; ai.lastTackle = M.t; }
        } else if (d < 36 && d > 20 && f.cool <= 0 && f.state === 'run' && rng() < .004 * T.aiAggro * (tac.foul + .3) * 3 && owner.speed !== 0) { const a = Math.atan2(owner.y - f.y, owner.x - f.x); I.move = [Math.cos(a), Math.sin(a)]; I.shoot.pressed = true; I.shoot.down = true; ai.lastTackle = M.t; }
        else if (d < 19 && f.cool <= 0 && rng() < .002 * T.aiAggro * tac.foul) { I.lob.pressed = true; I.lob.down = true; }
        return I;
      }
    }
    // everyone else: to the spot, with a little life; attackers make runs
    let [tx, ty] = spotT;
    if (owner && owner.side === side && f.role !== 'DEF') { const wob = Math.sin(M.t * 1.3 + f.id * 2) * 22; ty += wob; if (rng() < .0006) ai.run = M.t + 1.4; if (ai.run > M.t) tx += (side === 0 ? 1 : -1) * 55; }
    move(tx, ty, Math.hypot(tx - f.x, ty - f.y) > 70);
    return I;
  }
  function setPieceIntent(M, t, sp, force) {
    const I = EF.Intent(), rng = M.rng, side = sp.side, gx = P.goalX(side), dd = Math.hypot(gx - sp.x, P.CY - sp.y); if (t.state !== 'run' || t.cool > 0) return I; sp.plan = sp.plan || { start: M.t, hold: .4 + rng() * .35, aimY: (rng() < .5 ? -1 : 1) * (.55 + rng() * .35) };
    const mates = M.F.filter(o => o.side === side && o !== t && !o.sentOff && !o.isGK);
    const aimAt = (x, y) => { const a = Math.atan2(y - t.y, x - t.x); I.move = [Math.cos(a), Math.sin(a)]; return a; };
    if (sp.type === 'penalty') { I.aim = [0, sp.plan.aimY]; const held = M.t - sp.plan.start; I.shoot.down = held < sp.plan.hold; if (!I.shoot.down && !t.charging && held < sp.plan.hold + .05) I.shoot.down = true; const a = Math.atan2(P.CY - t.y, gx - t.x); I.move = [Math.cos(a) * .3, Math.sin(a) * .3]; return I; }
    if (sp.type === 'freekick' && dd < 300 && !sp.indirect) { I.aim = [0, sp.plan.aimY * .8]; const held = M.t - sp.plan.start; I.shoot.down = held < sp.plan.hold; const a = Math.atan2(P.CY - t.y, gx - t.x); I.move = [Math.cos(a) * .3, Math.sin(a) * .3]; return I; }
    const best = pickPassTarget(M, t, mates, tacOf(M, side)); const m = best ? best.m : mates[0];
    if (sp.type === 'corner') { const a = aimAt(gx - (side === 0 ? 1 : -1) * 42, P.CY + (rng() - .5) * 50); I.lob.pressed = true; I.lob.down = true; return I; }
    if (sp.type === 'throwin' || sp.type === 'goalkick' || sp.type === 'freekick') { if (m) aimAt(m.x, m.y); I.pass.pressed = true; I.pass.down = true; if (sp.type === 'freekick' && m && Math.hypot(m.x - t.x, m.y - t.y) > 200) { I.pass.pressed = false; I.lob.pressed = true; } return I; }
    return I;
  }
  const penaltyIntent = (M, f) => setPieceIntent(M, f, M.sp);
  return { baseSpot, spot, setPieceSpot, intent, setPieceIntent, penaltyIntent, busOn };
})();
