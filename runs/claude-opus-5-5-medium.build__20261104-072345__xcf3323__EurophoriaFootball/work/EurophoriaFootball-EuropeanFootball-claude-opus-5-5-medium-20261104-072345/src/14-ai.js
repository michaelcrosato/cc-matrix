/* 14-ai: TeamBrain, one per side: the phase (attack, defend, transition, loose), formation spots from the role specs and
 * the tactic, pressing, marking, runs, the ball carrier's choice by utility, air balls, gimmicks (the bus, gegenpressing,
 * keep-ball, route one) and when to trigger Europhoria. Bots produce Intents exactly as a player's buttons would. */
const btn = on => on ? { pressed: true, down: true } : {};
class TeamBrain {
  constructor(m, side) {
    this.m = m; this.side = side; this.tac = Object.assign({ press: .5, pressers: 1, line: .5, width: .8, tempo: .7, passRisk: .5, shortBias: .7, longBall: .2, dribble: .4, skill: .3, shootRange: 190, shootBias: 1, foul: .2, dive: .1, gimmick: null }, EF.get('tactic', m.teams[side].tactic) || {});
    this.phase = 'loose'; this.phaseT = 0; this.lostT = -9; this.had = false;
  }
  get dir() { return this.m.dir(this.side); }
  update(dt, intents) {
    const m = this.m, s = this.side, own = m.owner;
    const ph = !own ? 'loose' : own.side === s ? 'attack' : 'defend';
    if (ph !== this.phase) { if (this.phase === 'attack' && ph !== 'attack') this.lostT = m.t; this.phase = ph; this.phaseT = 0; } else this.phaseT += dt;
    this.gimmicks();
    // Europhoria: full and the ball in the attacking half (or ours)
    if (m.euph[s] >= 100 && m.euroT[s] <= 0 && m.isCpuSide(s) && !m.cheats.pure) {
      const u = P.toUV(this.dir, m.ball.x, m.ball.y)[0];
      if ((own && own.side === s && u > .45) || m.o.attract) m.triggerEurophoria(s);
    }
    const ballUV = P.toUV(this.dir, m.ball.x, m.ball.y);
    // the chasers of a loose ball, the pressers of a carrier
    const out = m.side[s].filter(f => !f.gk && !f.sentOff);
    const free = out.filter(f => !intents.has(f));
    const humanF = out.filter(f => intents.has(f));
    const target = this.ballTarget();
    const byBall = out.slice().sort((a, b) => dist(a.body, target) - dist(b.body, target));
    const gegen = this.tac.gimmick === 'gegenpress' && m.t - this.lostT < 3;
    const nPress = gegen ? 3 : this.tac.pressers || 1;
    const pressZone = ballUV[0] < this.tac.press + .35 || gegen || P.inBox(-this.dir, m.ball.x, m.ball.y);
    const chasers = new Set(byBall.filter(f => !intents.has(f) || true).slice(0, ph === 'loose' ? (dist(byBall[0].body, target) < 30 ? 1 : 2) : nPress));
    for (const f of free) {
      if (f.state !== 'run') { f.botIntent = NO_INTENT; continue; }
      const di = s === 1 && m.o.training && EF.dummyIntent ? EF.dummyIntent(m, f) : null; if (di) { f.botIntent = di; continue; }
      f.botIntent = this.think(f, dt, { ph, ballUV, chase: chasers.has(f) && !humanF.includes(f), pressZone, target });
    }
  }
  /** where the ball is going: its spot in 0.3 s, or where the receiver will take it */
  ballTarget() {
    const m = this.m, b = m.ball;
    if (m.owner) return { x: m.owner.body.x + m.owner.body.vx * .25, y: m.owner.body.y + m.owner.body.vy * .25 };
    const p = predictBall(m, .5, 1 / 20); for (const q of p) if (q.z < 10 && q.t > .25) return q;
    return p[p.length - 1] || b;
  }
  spot(f, ph, ballUV) {
    const sp = f.spec, t = this.tac, att = ph === 'attack';
    const base = sp.base || [.4, .5], d = att ? (sp.att || [0, 0]) : (sp.def || [0, 0]), pull = sp.pull || [.5, .5], ur = sp.uRange || [.1, .9];
    let u = base[0] + d[0] + pull[0] * (ballUV[0] - .5), v = base[1] + d[1] + pull[1] * (ballUV[1] - .5);
    if (f.role.startsWith('DEF')) u += (t.line - .5) * .2;
    u = clamp(u, ur[0], ur[1]); v = clamp(.5 + (v - .5) * (t.width || .8), .06, .94);
    return P.toWorld(this.dir, u, v);
  }
  think(f, dt, c) {
    const m = this.m, b = f.body, ball = m.ball, s = this.side, it = { bot: true, move: [0, 0], sprint: false, pass: {}, shoot: {}, lob: {}, through: {}, skill: {}, dive: {}, sw: {} };
    const goTo = (x, y, sprint, stop = 4) => { const dx = x - b.x, dy = y - b.y, d = hyp(dx, dy); if (d > stop) { const k = Math.min(1, d / 30); it.move = [dx / d * k, dy / d * k]; } it.sprint = sprint && d > 30; };
    // a run he was asked to make (a through ball, a one-two, a cross)
    if (f.runTo && f.runTo.t > 0 && m.owner !== f) { f.runTo.t -= dt; goTo(f.runTo.x, f.runTo.y, true, 3); if (ball.to === f || !m.owner) this.airTry(f, it); return it; }
    if (m.owner === f) return this.carrier(f, dt, it);
    if (!m.owner) {
      if (ball.to === f || c.chase) { const t = ball.to === f ? this.ballTarget() : c.target; goTo(t.x, t.y, true, 1); this.airTry(f, it); return it; }
      const [x, y] = this.spot(f, m.last && m.last.side === s ? 'attack' : 'defend', c.ballUV); goTo(x, y, false, 6); this.airTry(f, it);
      return it;
    }
    if (m.owner.side === s) {
      // support: the formation's attacking spot, with the far forward running in behind
      let [x, y] = this.spot(f, 'attack', c.ballUV);
      if (f.role.startsWith('FWD') && m.owner.body.x * this.dir < x * this.dir) { const a = nearestFoe(m, f, s); if (a > 30) x += this.dir * 20; }
      // stay out of the carrier's way
      if (dist({ x, y }, m.owner.body) < 40) y += y < m.owner.body.y ? -30 : 30;
      goTo(x, y, dist({ x, y }, b) > 80, 6);
      if (m.owner.gk && m.owner.state === 'keeper-hold') it.sprint = false;
      return it;
    }
    // defending
    const carrier = m.owner;
    if (carrier.gk && carrier.state === 'keeper-hold') { const [x, y] = this.spot(f, 'defend', c.ballUV); const dk = dist({ x, y }, carrier.body); goTo(dk < 60 ? x + this.dir * -40 : x, y, false, 6); return it; }
    if (c.chase && c.pressZone) {
      const cb = carrier.body, lead = { x: cb.x + cb.vx * .2, y: cb.y + cb.vy * .2 };
      const ownG = { x: m.ownGoalX(s), y: P.CY }, ga = angTo(lead, ownG);
      const d = dist(b, cb);
      const tx = d > 20 ? lead.x + Math.cos(ga) * 6 : lead.x, ty = d > 20 ? lead.y + Math.sin(ga) * 6 : lead.y;
      goTo(tx, ty, d > 40, 1);
      it.faceTo = angTo(b, cb);
      const agg = m.diff.agg * (EF.T.aiAggression / .5) * (.6 + this.tac.press * .8) * (m.o.attract ? 1.4 : 1);
      const front = Math.abs(E.angDiff(f.facing, angTo(b, cb))) < .8, behind = Math.abs(E.angDiff(carrier.facing, angTo(cb, b))) > 2.1;
      if (d < EF.T.tackleReach + 6 && front && f.cool <= 0 && m.rng() < agg * 3 * dt) it.pass = btn(true);
      else if (d < 30 && d > 10 && f.cool <= 0 && (!behind || m.rng() < this.tac.foul + f.st.temper / 300) && m.rng() < agg * .8 * dt * (.5 + this.tac.foul)) { it.shoot = btn(true); it.move = [Math.cos(angTo(b, lead)), Math.sin(angTo(b, lead))]; }
      else if (d < 10 && !front && m.rng() < agg * dt) it.lob = btn(true);
      return it;
    }
    // mark the opponent nearest the spot, goal side, in the lane to the ball
    const [sx, sy] = this.spot(f, 'defend', c.ballUV);
    const opp = m.side[1 - s].filter(o => !o.gk && !o.sentOff && o !== carrier).sort((p, q) => hyp(p.body.x - sx, p.body.y - sy) - hyp(q.body.x - sx, q.body.y - sy))[0];
    let tx = sx, ty = sy;
    if (opp && hyp(opp.body.x - sx, opp.body.y - sy) < 120) { const mx = lerp(opp.body.x, ball.x, .35), my = lerp(opp.body.y, ball.y, .35); tx = lerp(sx, mx, .6); ty = lerp(sy, my, .6); }
    goTo(tx, ty, dist({ x: tx, y: ty }, b) > 60, 5);
    it.faceTo = angTo(b, ball);
    // intercept a pass coming through
    if (ball.to && ball.to.side !== s && segDist(b, ball, ball.to.body) < 30) { const t = this.ballTarget(); goTo(t.x, t.y, true, 1); }
    return it;
  }
  /** an attacker in the box meets a ball in the air; a defender heads it clear */
  airTry(f, it) {
    const m = this.m, b = m.ball;
    if (b.z < 5 && b.vz < 30) return;
    const u = P.toUV(this.dir, f.body.x, f.body.y)[0];
    if (hyp(b.x - f.body.x, b.y - f.body.y) > 50) return;
    const w = airWindow(f); if (!w) return;
    if (u > .7 && m.rng() < .5) { it.airTry = true; it.airMode = 'shoot'; it.aimY = (m.rng() - .5) * 1.6; }
    else if (u < .35 && m.rng() < .4) { it.airTry = true; it.airMode = 'clear'; }
  }
  /** the ball carrier: shoot, pass, through ball, lob or cross, dribble, a skill move or a dive, by utility */
  carrier(f, dt, it) {
    const m = this.m, b = f.body, s = this.side, t = this.tac, dir = this.dir, gx = m.goalX(s), g = { x: gx, y: P.CY };
    const plan = f.plan;
    if (plan && m.t < plan.until) return this.followPlan(f, plan, it);
    const react = EF.T.aiReaction * (m.diff.react / .25) * (m.o.attract ? .5 : 1) / (t.tempo + .3);
    const dg = dist(b, g), acc = EF.T.aiAccuracy * (m.diff.acc / .8);
    const noise = () => gauss(m.rng) * (1 - Math.min(1, acc)) * .3;
    const foes = m.side[1 - s].filter(o => !o.sentOff);
    const opts = [];
    // shoot
    const range = (t.shootRange || 190) * 1.2 * (m.euroT[s] > 0 ? 1.3 : 1);
    if (dg < range) {
      const a1 = Math.atan2(P.CY - P.GH - b.y, gx - b.x), a2 = Math.atan2(P.CY + P.GH - b.y, gx - b.x), open = clamp(Math.abs(E.angDiff(a1, a2)) / .7, 0, 1);
      const blockers = foes.filter(o => !o.gk && segDist(o.body, b, g) < 12).length;
      let v = (1 - dg / range) * (.4 + .6 * open) * (1 - .3 * blockers) * (t.shootBias || 1) * (m.euroT[s] > 0 ? 1.5 : 1) * 2.1;
      if (t.gimmick === 'keepball' && m.chain[s] < 4) v *= .3;
      if (m.bus && m.bus.on && m.bus.side !== s) v *= .6;
      opts.push({ k: 'shoot', v: v + noise() });
    }
    // passes
    for (const r of m.side[s]) {
      if (r === f || r.sentOff || r.state === 'off') continue;
      const d = dist(r.body, b); if (d < 24 || d > 420) continue;
      const laneD = foes.reduce((a, o) => Math.min(a, segDist(o.body, b, r.body)), 99), lane = clamp((laneD - 9) / 16, 0, 1);
      const open = Math.min(1, nearestFoe(m, r, s) / 40), progress = clamp(((r.body.x - b.x) * dir) / 220 + .5, 0, 1);
      const short = d < 150;
      let v = lane * open * (.4 + .6 * progress) * (short ? t.shortBias || .7 : .7) * (1 - (1 - lane) * (1 - t.passRisk)) * .9;
      if (r.gk) v *= f.pressure() ? .5 : .15;
      if (t.gimmick === 'keepball' && f.pressure() && progress < .5) v *= 2;
      if (lane < .4 && d > 60 && !r.gk && open > .6) opts.push({ k: 'lob', r, v: open * (.3 + .5 * progress) * (t.longBall + .25) * .65 + noise() });
      opts.push({ k: 'pass', r, v: v + noise() });
      if (r.role.startsWith('FWD') && progress > .6 && d > 80) { const sp = nearestFoe(m, r, s); if (sp > 40) opts.push({ k: 'through', r, v: clamp((sp - 30) / 50, 0, 1) * .5 * t.tempo + noise() }); }
    }
    // route one: hoof it to the striker
    if (t.gimmick === 'routeone') { const st = m.side[s].filter(r => r.role.startsWith('FWD') && r !== f).sort((a, c) => (c.body.x - a.body.x) * dir)[0]; if (st) opts.push({ k: 'lob', r: st, v: .45 * t.longBall + .2 + noise() }); }
    // a cross from wide in the final third
    const uv = P.toUV(dir, b.x, b.y);
    if (uv[0] > .7 && Math.abs(b.y - P.CY) > 140) opts.push({ k: 'cross', v: .5 + t.longBall * .4 + noise() });
    // dribble into space
    const ahead = foes.filter(o => (o.body.x - b.x) * dir > -4 && dist(o.body, b) < 90).reduce((a, o) => Math.min(a, dist(o.body, b)), 90);
    opts.push({ k: 'dribble', v: ahead / 80 * (t.dribble + .3) * .9 + noise() });
    const front = foes.filter(o => !o.gk && dist(o.body, b) < 20 && Math.abs(E.angDiff(f.facing, angTo(b, o.body))) < .9)[0];
    if (front && f.skillCd <= 0) opts.push({ k: 'skill', v: (t.skill + .1) * f.st.skill / 100 * .9 + noise() });
    if (front && P.inBox(dir, b.x, b.y) && t.dive > 0) opts.push({ k: 'dive', v: t.dive * f.st.temper / 100 * .6 + noise() });
    opts.sort((a, c) => c.v - a.v);
    const pick = opts[0] || { k: 'dribble' };
    f.plan = Object.assign({ until: m.t + react * (.7 + m.rng() * .6), t0: m.t }, pick);
    if (pick.k === 'shoot') { f.plan.power = m.euroT[s] > 0 && !m.superUsed[s] ? .96 : clamp(.5 + dg / 500 + m.rng() * .25, .4, .9); f.plan.aimY = (m.rng() < .5 ? -1 : 1) * (.45 + m.rng() * .45); f.plan.until = m.t + 2; }
    return this.followPlan(f, f.plan, it);
  }
  followPlan(f, p, it) {
    const m = this.m, b = f.body, s = this.side, dir = this.dir, gx = m.goalX(s);
    const toGoal = Math.atan2(P.CY - b.y, gx - b.x);
    let a = toGoal;
    // dribble round the nearest foe ahead
    const foe = m.side[1 - s].filter(o => !o.sentOff && !o.gk && dist(o.body, b) < 40 && Math.abs(E.angDiff(toGoal, angTo(b, o.body))) < 1).sort((p1, q) => dist(p1.body, b) - dist(q.body, b))[0];
    if (foe) a += E.angDiff(angTo(b, foe.body), toGoal) > 0 ? -.9 : .9;
    if (Math.abs(b.y - P.CY) > P.W / 2 - 20) a = E.lerpAngle ? E.lerpAngle(a, toGoal, .5) : a;
    it.move = [Math.cos(a), Math.sin(a)]; it.sprint = !foe || dist(foe.body, b) > 25;
    if (f.cool > 0) return it;
    switch (p.k) {
      case 'shoot':
        it.move = [Math.cos(toGoal), Math.sin(toGoal)]; it.sprint = false;
        it.shoot = { down: true }; it.power = p.power; it.aimY = p.aimY; it.assist = 'off';
        if (f.meter >= p.power) { it.shoot = { down: false, released: true }; f.plan = null; }
        break;
      case 'pass': it.pass = btn(true); it.passTo = p.r.id; f.plan = null; it.assist = 'high'; break;
      case 'through': it.through = btn(true); it.passTo = p.r.id; f.plan = null; break;
      case 'lob': it.lob = btn(true); it.passTo = p.r ? p.r.id : null; f.plan = null; break;
      case 'cross': it.lob = btn(true); f.plan = null; break;
      case 'skill': it.skill = btn(true); f.plan = null; break;
      case 'dive': it.dive = btn(true); f.plan = null; break;
    }
    if (it.passTo != null) { const r = m.players.find(q => q.id === it.passTo); if (r) it.aim = [r.body.x - b.x, r.body.y - b.y]; }
    return it;
  }
  gimmicks() {
    const m = this.m, s = this.side;
    if (this.tac.gimmick === 'catenaccio' && !m.cheats.pure && !m.o.training) {
      const leading = m.score[s] > m.score[1 - s];
      if (leading && m.minute >= 60 && m.half >= 2 && !m.bus) {
        const gx = m.ownGoalX(s), into = gx === P.X0 ? 1 : -1, x0 = into > 0 ? gx + 6 : gx - 24;
        m.bus = { side: s, on: true, x0, x1: x0 + 18, y0: P.CY - 30, y1: P.CY + 30, t: m.t };
        m.emit('bus', { side: s });
      }
      if (m.bus && m.bus.on && !leading) { m.bus.on = false; m.emit('busGone', { side: s }); }
    }
  }
}
EF.TeamBrain = TeamBrain;
