/* TEAM AI (section 6.13): one TeamBrain a side. Each step: the phase (attack, defend, transition, loose), formation
 * spots from where the ball is, the pressers and markers; then an Intent for each footballer it runs, the same kind a
 * human's controller gives. The ball carrier decides by utility every aiReaction seconds. */
const ROLE_DEF = {
  DEF: { att: [.14, 0], def: [0, 0], pull: [.45, .55], uRange: [.08, .62] },
  MID: { att: [.12, .06], def: [-.12, -.04], pull: [.55, .45], uRange: [.15, .85] },
  FWD: { att: [.18, 0], def: [-.12, 0], pull: [.5, .6], uRange: [.35, .95] }
};
class TeamBrain {
  constructor(m, s) { this.m = m; this.s = s; this.phase = 'loose'; this.phaseT = 0; this.mem = new Map(); this.pressers = []; this.marks = new Map(); this.lostT = -9; this.scanT = 0; this.had = false; }
  get tac() { return this.m.tactic[this.s]; }
  /** difficulty shapes the CPU's sides; a side with a human plays at Normal around him */
  get diff() { return this.m.hasHuman(this.s) && this.m.kind !== 'attract' ? EF.DIFF.normal : this.m.diff; }
  memOf(f) { let o = this.mem.get(f); if (!o) { o = { decT: 0, plan: null, tackleT: 0, airT: 0 }; this.mem.set(f, o); } return o; }
  update(dt) {
    const m = this.m, s = this.s, own = m.owner, has = own && own.side === s;
    const ph = !own ? 'loose' : has ? 'attack' : 'defend';
    if (this.had && !has && own) this.lostT = m.t;
    this.had = has;
    if (ph !== this.phase) { this.phase = ph; this.phaseT = 0; } else this.phaseT += dt;
    this.scanT -= dt;
    if (this.scanT <= 0) { this.scanT = .2; this.assign(); }
  }
  /** pressers, markers and chasers, a few times a second */
  assign() {
    const m = this.m, s = this.s, out = m.outfield(s).filter(f => f.state !== 'off'), b = m.ball, tac = this.tac;
    this.pressers = []; this.marks.clear(); this.chasers = [];
    if (this.phase === 'defend' && m.owner) {
      const c = m.owner, uB = m.u(s, c.body.x), zone = uB < (tac.press || .5) + .25;
      const swarm = tac.gimmick === 'gegenpress' && m.t - this.lostT < 3 ? 3 : 0;
      const n = Math.max(1, swarm || (zone ? tac.pressers || 1 : 1));
      this.pressers = out.slice().sort((a, b2) => H.d(a.body, c.body) - H.d(b2.body, c.body)).slice(0, n);
      this.pressZone = zone || swarm > 0;
      const opp = m.outfield(1 - s).filter(o => o !== c);
      for (const f of out) {
        if (this.pressers.includes(f)) continue;
        const sp = this.spot(f); let best = null, bd = 1e9;
        for (const o of opp) { const d = H.d2(o.body.x, o.body.y, sp[0], sp[1]); if (d < bd && ![...this.marks.values()].includes(o)) { bd = d; best = o; } }
        if (best && bd < 160) this.marks.set(f, best);
      }
    }
    if (!m.owner) {
      const p = b.predict(.3);
      this.chasers = out.slice().sort((a, c) => H.d2(a.body.x, a.body.y, p.x, p.y) - H.d2(c.body.x, c.body.y, p.x, p.y)).slice(0, 2);
    }
  }
  /** a footballer's formation spot now (section 6.13, step 2) */
  spot(f) {
    const m = this.m, s = this.s, F = m.formation[s], R = F.roles[f.slot] || F.roles[Object.keys(F.roles)[1]], tac = this.tac, b = m.ball;
    if (f.role === 'GK') return [m.ownGoalX(s) + m.dir(s) * 12, P.CY];
    const D = ROLE_DEF[f.role] || ROLE_DEF.MID, base = R.base, side = base[1] < .5 ? -1 : base[1] > .5 ? 1 : 0;
    const att = R.att || [D.att[0], D.att[1] * side], def = R.def || [D.def[0], D.def[1] * side], pull = R.pull || D.pull, ur = R.uRange || D.uRange;
    const attack = this.phase === 'attack', bu = m.u(s, b.x), bv = (b.y - P.Y0) / P.W;
    let u = base[0] + (attack ? att[0] : def[0]) + pull[0] * (bu - .5), v = base[1] + (attack ? att[1] : def[1]) + pull[1] * (bv - .5);
    if (f.role === 'DEF') u += ((tac.line === undefined ? .5 : tac.line) - .5) * .2;
    u = clamp(u, ur[0], ur[1]); v = .5 + (v - .5) * (tac.width || .8);
    if (m.mode === 'kickoff' || (m.setpiece && m.setpiece.kind === 'kickoff')) u = Math.min(u, .47);
    return [m.xOfU(s, u), P.Y0 + clamp(v, .06, .94) * P.W];
  }
  /** the intent for footballer f (not a human's) this step */
  intent(f, dt) {
    const m = this.m, it = EF.Intent.make(), B = f.body, b = m.ball, mem = this.memOf(f);
    const go = (x, y, sprint, slow) => { const d = H.d2(x, y, B.x, B.y); if (d > 2) { const k = slow ? clamp(d / 40, .25, 1) : clamp(d / 14, .2, 1); it.move = [(x - B.x) / d * k, (y - B.y) / d * k]; } it.sprint = !!sprint && d > 40; return d; };
    if (f.state === 'setpiece' || f.frozen) { if (f.order && f.order.to) go(f.order.to[0], f.order.to[1], false, true); return it; }
    if (m.cheats['euphoria' + this.s] || (m.euphoria[this.s] >= 100 && m.owner && m.owner.side === this.s && m.u(this.s, m.owner.body.x) > .5 && m.rng() < dt * 2 && !this.tac.noEuphoria)) it.euphoria = m.euphoria[this.s] >= 100 && !m.europhoria;
    if (f.role === 'GK') return this.keeperIntent(f, it, go);
    // orders: runs after a through ball, meeting a lob, a one-two's return, chasing a knock-on
    const o = f.order;
    if (o) {
      o.t -= dt;
      if (o.t <= 0) f.order = null;
      else if (o.kind === 'oneTwo') { if (m.owner === f && f.ownT > .3) { it.target = o.back; it.pass.pressed = true; f.order = null; return it; } }
      else if (o.kind === 'chase') { if (!m.owner) { go(b.x, b.y, true); return it; } f.order = null; }
      else if (o.to && m.owner !== f) { go(o.to[0], o.to[1], true); if (o.kind === 'meet' && !m.owner) this.airTry(f, it, mem); return it; }
    }
    if (m.owner === f) return this.carrier(f, it, mem, go, dt);
    if (m.mode === 'kickoff' || (m.kickHold > 0 && f.side !== m.kickoffSide)) {
      const sp = this.spot(f); let [tx, ty] = sp;
      if (f.side !== m.kickoffSide) { const cd = H.d2(tx, ty, P.CX, P.CY); if (cd < 70) { tx = P.CX + (tx - P.CX) / (cd || 1) * 70; ty = P.CY + (ty - P.CY) / (cd || 1) * 70; } }
      go(tx, ty, false, true); return it;
    }
    if (!m.owner) {
      if (this.chasers && this.chasers.includes(f) && !b.superPath) {
        const p = b.predict(Math.min(.6, H.d(B, b) / 160)); go(p.x, p.y, true);
        this.airTry(f, it, mem);
        return it;
      }
      const sp = this.spot(f); go(sp[0], sp[1], false, true); return it;
    }
    if (this.phase === 'defend') {
      const c = m.owner;
      // the keeper holds it: everyone stands off 60
      if (c.role === 'GK' && c.holding) { const sp = this.spot(f); const d = H.d2(sp[0], sp[1], c.body.x, c.body.y); if (d < 64) { sp[0] = c.body.x + (sp[0] - c.body.x) / (d || 1) * 64; sp[1] = c.body.y + (sp[1] - c.body.y) / (d || 1) * 64; } go(sp[0], sp[1]); return it; }
      if (this.pressers.includes(f)) return this.press(f, c, it, mem, go, dt);
      const mk = this.marks.get(f);
      if (mk) { const gx = m.ownGoalX(this.s), tx = lerp(mk.body.x, gx, .12), ty = mk.body.y; go(lerp(tx, b.x, .3), lerp(ty, b.y, .3), H.d(B, mk.body) > 60); return it; }
      const sp = this.spot(f); go(sp[0], sp[1], H.d2(sp[0], sp[1], B.x, B.y) > 80); return it;
    }
    // attacking without the ball: spots, and the far forward's run in behind
    let sp = this.spot(f);
    if (f.role === 'FWD' && m.owner && m.u(this.s, m.owner.body.x) > .35) {
      const fwds = m.outfield(this.s).filter(q => q.role === 'FWD' && q !== m.owner);
      const far = fwds.sort((a, c) => H.d(c.body, m.owner.body) - H.d(a.body, m.owner.body))[0];
      if (far === f) { const last = this.lastDefenderU(); sp = [m.xOfU(this.s, clamp(last + .04, .4, .92)), sp[1]]; }
    }
    go(sp[0], sp[1], H.d2(sp[0], sp[1], B.x, B.y) > 70);
    return it;
  }
  lastDefenderU() { const m = this.m; let u = 0; for (const o of m.outfield(1 - this.s)) u = Math.max(u, m.u(this.s, o.body.x)); return u; }
  /** a CPU player meets a ball in the air: a header, a volley, a clearance (section 6.5: CPU players use the same rules) */
  airTry(f, it, mem) {
    const m = this.m; if (m.t - mem.airT < .8) return;
    const w = f.airWindow(); if (!w || w.d > 30) return;
    mem.airT = m.t;
    const nearGoal = m.u(this.s, f.body.x) > .72, own = m.u(this.s, f.body.x) < .4;
    if (this.tac.gimmick === 'routeone' && own) it.air = 'clear';
    else it.air = nearGoal ? 'finish' : own ? 'clear' : 'cushion';
    it.sprint = nearGoal && w.z < 14;
  }
  /** pressing the carrier: close down goal-side, then poke, slide or barge by the tactic's aggression */
  press(f, c, it, mem, go, dt) {
    const m = this.m, B = f.body, gx = m.ownGoalX(this.s), agg = (EF.T.aiAggression / .5) * this.diff.agg * (this.tac.aggr || 1);
    const goalSide = { x: c.body.x + (gx - c.body.x) * .08, y: c.body.y + (P.CY - c.body.y) * .05 };
    const d = H.d(B, c.body);
    if (d > 24) { go(goalSide.x, goalSide.y, true); return it; }
    go(c.body.x + c.body.vx * .15, c.body.y + c.body.vy * .15, d > 14);
    f.facing = E.approachAng(f.facing, H.ang(B, c.body), dt * 10);
    mem.tackleT -= dt; if (mem.tackleT > 0 || f.cool > 0 || m.kickHold > 0) return it;
    const R = m.rng(), behind = Math.abs(E.angDiff(H.ang(c.body, B), c.facing)) > 2.1, temper = f.stat('temper') / 100;
    if (d < EF.T.tackleReach + 6 && R < dt * agg * 3 * (behind ? .5 + temper : 1)) { it.pass.pressed = true; mem.tackleT = .5; }
    else if (d < 30 && R < dt * agg * .8 * (this.pressZone ? 1 : .4) * (1 + (this.tac.foul || .2))) { it.shoot.pressed = true; mem.tackleT = .9; }
    else if (d < 12 && R < dt * agg * .6 && f.stat('weight') > 70) { it.lob.pressed = true; mem.tackleT = .6; }
    return it;
  }
  /** the keeper: on the bisector of the angle to the posts, out to rush a forward through on goal (section 6.8) */
  keeperIntent(f, it, go) {
    const m = this.m, s = this.s, b = m.ball, gx = m.ownGoalX(s), B = f.body;
    if (m.owner === f) return it;
    const c = m.owner, bd = H.d2(b.x, b.y, gx, P.CY);
    if (c && c.side !== s && bd < 130 && P.inBoxAt(gx, c.body.x, c.body.y) && !m.outfield(s).some(d => H.segDist(d.body, c.body, { x: gx, y: P.CY }) < 10 && H.d(d.body, { x: gx, y: P.CY }) < H.d(c.body, { x: gx, y: P.CY }))) {
      go(c.body.x, c.body.y, true); f.keeperMove = 1.1; return it;
    }
    f.keeperMove = 1;
    if (!c && b.speed() < 140 && P.inBoxAt(gx, b.x, b.y) && b.z < 8 && !m.outfield(1 - s).some(o => H.d(o.body, b) < H.d(B, b))) { go(b.x, b.y, true); return it; }
    // on the bisector of the angle to the posts: from the goal centre toward the ball, closer to the line as it nears
    const dist = clamp(8 + (400 - bd) * .06, 6, 36), ax = b.x - gx, ay = b.y - P.CY, al = Math.hypot(ax, ay) || 1, px = gx + ax / al * dist, py = P.CY + ay / al * dist * .9;
    go(px, clamp(py, P.CY - P.GH + 2, P.CY + P.GH - 2), false, true);
    it.aim = [b.x - B.x, b.y - B.y];
    return it;
  }
  /* ---- the ball carrier's decision (section 6.13, step 4) ---- */
  carrier(f, it, mem, go, dt) {
    const m = this.m, s = this.s, B = f.body, tac = this.tac, gx = m.goalX(s), diff = this.diff;
    if (m.setpiece && m.setpiece.taker === f && !m.setpiece.taken) return it;
    const P0 = mem.plan;
    if (P0 && P0.kind === 'shoot') { it.shoot.down = true; it.power = P0.power; it.aimPoint = P0.aim; it.move = P0.move || it.move; return it; }
    mem.decT -= dt;
    if (P0 && P0.kind === 'dribble' && mem.decT > 0) { go(P0.to[0], P0.to[1], P0.sprint); this.avoid(f, it); return it; }
    mem.plan = null;
    const react = EF.T.aiReaction * (diff.react / .25);
    mem.decT = react * (.8 + m.rng() * .4);
    if (f.ownT < .12 && f.order && f.order.kind !== 'oneTwo') return it;
    const opts = this.options(f), noise = (1 - EF.T.aiAccuracy * diff.acc / .8) * .3;
    let best = null, bs = -1;
    for (const o of opts) { const v = o.v + H.gauss(m.rng) * noise; if (v > bs) { bs = v; best = o; } }
    if (!best) return it;
    if (m.kind === 'attract' && m.attractForce) best = m.attractForce(f, opts) || best;
    switch (best.kind) {
      case 'shoot': mem.plan = { kind: 'shoot', power: best.power, aim: best.aim }; it.shoot.down = true; it.power = best.power; it.aimPoint = best.aim; break;
      case 'pass': it.target = best.to; it.pass.pressed = true; break;
      case 'through': it.target = best.to; it.through.pressed = true; break;
      case 'lob': it.target = best.to; it.lob.pressed = true; break;
      case 'cross': it.lob.pressed = true; break;
      case 'skill': it.skill.pressed = true; it.move = best.move; break;
      case 'dive': it.dive.pressed = true; break;
      default: mem.plan = { kind: 'dribble', to: best.to, sprint: best.sprint }; go(best.to[0], best.to[1], best.sprint); this.avoid(f, it);
    }
    return it;
  }
  /** steer a dribbler round the defender in front */
  avoid(f, it) { const d = f.defenderAhead(26, .8); if (!d) return; const a = Math.atan2(it.move[1], it.move[0]), side = E.angDiff(H.ang(f.body, d.body), a) > 0 ? -1 : 1; const na = a + side * .7; it.move = [Math.cos(na), Math.sin(na)]; }
  options(f) {
    const m = this.m, s = this.s, B = f.body, tac = this.tac, gx = m.goalX(s), opp = m.active(1 - s), mates = m.outfield(s).filter(q => q !== f && q.state !== 'down' && q.state !== 'launched');
    const out = [], dg = H.d2(gx, P.CY, B.x, B.y), myU = m.u(s, B.x), k = m.keeper(1 - s), eu = m.europhoria && m.europhoria.side === s && m.europhoria.t > 0;
    const pressed = opp.some(o => H.d(o.body, B) < 18), chain = m.passChain[s];
    // shoot
    const ang = Math.abs(Math.atan2(P.CY - B.y, gx - B.x) - (m.dir(s) > 0 ? 0 : Math.PI)), angF = Math.max(0, Math.cos(Math.min(1.5, ang)));
    const tri = { x: gx, y: P.CY }, blockers = opp.filter(o => o.role !== 'GK' && H.segDist(o.body, B, tri) < 10 && H.d(o.body, tri) < dg).length;
    let sh = clamp(1 - dg / (tac.shootRange || 170), 0, 1) * Math.pow(angF, .6) * (1 - .3 * blockers) * (eu ? 1.5 : 1) * (tac.shootBias || 1);
    if (tac.gimmick === 'keepball' && chain < 4 && dg > 70) sh *= .3;
    if (m.bus && m.bus.side !== s && dg < 200) sh *= .7;
    const corner = k ? P.CY + (k.body.y > P.CY ? -1 : 1) * (P.GH - 10) : P.CY;
    if (sh > 0) out.push({ kind: 'shoot', v: sh * 1.25 + (dg < 90 ? .3 : 0), power: eu && !m.superUsed ? .95 : dg < 90 ? .45 + m.rng() * .2 : .6 + m.rng() * .3, aim: { x: gx, y: corner + (m.rng() - .5) * 12 } });
    // passes
    for (const t of mates) {
      const lane = opp.reduce((mn, o) => Math.min(mn, H.segDist(o.body, B, t.body)), 99), laneClear = clamp((lane - 4) / 20, 0, 1);
      const open = Math.min(1, opp.reduce((mn, o) => Math.min(mn, H.d(o.body, t.body)), 99) / 40), prog = clamp(m.u(s, t.body.x) - myU + .5, 0, 1), d = H.d(t.body, B);
      if (d > 360) continue;
      const short = d < 160, risk = 1 - laneClear;
      let v = laneClear * open * (.4 + .6 * prog) * (short ? (tac.shortBias || .6) + .3 : 1) * (1 - risk * (1 - (tac.passRisk || .4)));
      if (tac.gimmick === 'keepball' && pressed && prog < .5) v *= 2;
      v *= .8 + (pressed ? .35 : 0);
      out.push({ kind: 'pass', to: t, v });
      if (t.role === 'FWD' && m.u(s, t.body.x) > myU && m.u(s, t.body.x) > .5) {
        const behind = this.lastDefenderU(), space = clamp((.95 - behind) * 3, 0, 1);
        out.push({ kind: 'through', to: t, v: space * open * .7 * (1 - (tac.passRisk === undefined ? .4 : 1 - tac.passRisk) * .3) });
      }
      if ((tac.longBall || 0) > .2 && d > 140) out.push({ kind: 'lob', to: t, v: (tac.longBall || .1) * .9 * open * (.5 + prog) * (tac.gimmick === 'routeone' && t.role === 'FWD' ? 1.6 : 1) });
    }
    // a cross from wide in the final third with teammates in the box
    if (Math.abs(B.y - P.CY) > 140 && myU > .7) { const inBox = mates.filter(t => P.inBoxAt(gx, t.body.x, t.body.y)).length; if (inBox) out.push({ kind: 'cross', v: .5 + .2 * inBox + (tac.longBall || 0) * .4 }); }
    // dribble: into space toward goal
    const toGoal = Math.atan2(P.CY - B.y, gx - B.x) * .6 + (m.dir(s) > 0 ? 0 : Math.PI) * .4, ahead = [B.x + Math.cos(toGoal) * 80, B.y + Math.sin(toGoal) * 80];
    const space = opp.reduce((mn, o) => Math.min(mn, H.d2(o.body.x, o.body.y, ahead[0], ahead[1])), 200);
    out.push({ kind: 'dribble', to: [clamp(ahead[0], P.X0 + 10, P.X1 - 10), clamp(ahead[1], P.Y0 + 20, P.Y1 - 20)], sprint: space > 60 && f.stamina > 35, v: clamp(space / 80, 0, 1.2) * (tac.dribble || .4) + .1 });
    // skill: a defender in front
    const dfd = f.defenderAhead(22, .7);
    if (dfd && f.skillCool <= 0) out.push({ kind: 'skill', v: (tac.skill || .3) * f.stat('skill') / 100 * 1.2, move: [Math.cos(f.facing + (m.rng() < .5 ? 1.4 : -1.4)), Math.sin(f.facing + 1.4)] });
    // dive: in the box with a defender close (Lucchetto do it on purpose)
    if (P.inBoxAt(gx, B.x, B.y) && opp.some(o => o.role !== 'GK' && H.d(o.body, B) < 10)) out.push({ kind: 'dive', v: (tac.dive || 0) * f.stat('temper') / 100 * 1.4 });
    return out;
  }
}
EF.TeamBrain = TeamBrain;
