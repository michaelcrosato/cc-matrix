/* ---- THE CPU: captain (bowler and field), bowler (a plan per batter), batter (reads the ball through the predictor
 * plus a perception error, chooses an intent from the match situation, finds a gap) and runner (compares the batters'
 * time to the next crease with the fielding side's quickest way to break the stumps). Forced outcomes (dev mode's
 * "force next outcome", the attract mode's scripted showreel) steer the same code: a chosen delivery, a chosen shot and
 * grade, a guaranteed catch or direct hit. Everything goes through the same entry points a human's input reaches. ---- */
const AI = {
  pickBowler(m, opts) {
    const last = m.lastBowler ? playerById(m.lastBowler) : null, lastFam = last && last.bowl ? last.bowl.type : null;
    let best = opts[0], bs = -1e9;
    for (const p of opts) {
      if (!p.bowl) continue;
      let s = p.bowl.skill + (p.bowl.type !== lastFam ? 2 : 0) + (p.bowl.type === 'spin' && m.ground.pitch.turn > 1.2 ? 2 : 0) + (p.bowl.type === 'swing' && m.weather === 'overcast' ? 2 : 0) + (p.bowl.type === 'pace' && m.ground.pitch.bounce > 1.1 ? 1.5 : 0);
      s += RNG.play() * 1.5;
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  },
  pickField(m) {
    const fam = m.bowlerP && m.bowlerP.bowl ? m.bowlerP.bowl.type : 'medium', inn = m.inn, need = m.need();
    if (fam === 'spin' && RNG.play() < .6) return 'spin';
    if (need && need.balls <= 6 && need.runs > need.balls) return 'defensive';
    if (!need && inn && inn.balls >= inn.overs * 6 - 6) return 'defensive';
    const s = m.striker && inn ? Rules.card(inn, m.striker.id) : null;
    if (s && s.balls < 3) return 'attacking';
    return 'balanced';
  },
  /** the CPU bowler's next ball: { id, tx, ty, special, grade, meterT } (also written to m.cpuPlan) */
  planBowling(m) {
    const p = m.bowlerP, fam = p.bowl ? p.bowl.type : 'medium', ds = m.deliveryChoices, hand = m.hand, inn = m.inn, skill = (p.bowl && p.bowl.skill) || 5;
    const f = m.force.outcome;
    let id = ds[0], len = 90, line = -hand * 4;
    const balls = inn.balls, last = inn.overs * 6 - balls <= 6;
    const r = RNG.play();
    if (fam === 'pace' || fam === 'machine') { if (last && r < .4) id = ds.find(d => DELIVERIES[d].len[1] < 30) || ds[0]; else if (r < .2) id = ds.find(d => DELIVERIES[d].len[0] >= 140) || ds[0]; else id = ds[0]; }
    else id = ds[Math.floor(RNG.play() * ds.length)];
    const D = DELIVERIES[id];
    len = RNG.range(D.len[0], D.len[1]);
    line = -hand * (fam === 'spin' ? RNG.range(2, 10) : RNG.range(0, 7));
    if (D.turn) line += hand * D.turn * .5 * (D.turn > 0 ? 1 : -1) * .4;
    const kerf = m.cfg.difficulty === 'kerfuffle', ready = m.specialReady(m.bowlSide, 'bowl', kerf ? 70 : 100);
    let special = ready && (last || RNG.play() < .35) && m.kerfuffle && !m.isHuman(m.bowlSide);
    const gr = RNG.play(), pg = .42 + skill * .045, grade = gr < pg ? 'green' : gr < pg + .42 ? 'amber' : gr < .985 ? 'red' : 'over';
    const plan = { id, tx: line, ty: G.CREASE_S + len, special, grade: special ? 'green' : grade, meterT: .25 / T('meterSpeed') };
    if (f) AI.forcedBowling(m, plan, f);
    m.cpuPlan = plan;
    return plan;
  },
  /** a forced outcome's delivery */
  forcedBowling(m, plan, f) {
    const hand = m.hand, ds = m.deliveryChoices;
    plan.special = !!f.special; plan.grade = f.kind === 'noball' ? 'over' : 'green'; plan.straight = ['bowled', 'lbw', 'review', 'stumped', 'edge', 'caughtbehind', 'leave'].includes(f.kind);
    const set = (id, x, y) => { plan.id = ds.includes(id) ? id : (id && DELIVERIES[id] ? id : ds[0]); plan.tx = x; plan.ty = G.CREASE_S + y; };
    switch (f.kind) {
      case 'bowled': set(f.delivery || ds[0], hand > 0 ? -2.5 : 0, 55); break;   // (lines that miss the pad and hit the stumps, from over the wicket)
      case 'lbw': case 'review': set(f.delivery || ds[0], hand > 0 ? .5 : -3, 8); break;
      case 'stumped': set(ds.find(d => DELIVERIES[d].fam === 'spin') || ds[0], -hand * 9, 70); break;
      case 'edge': case 'caughtbehind': set(f.delivery || ds[0], -hand * 9, 80); break;
      case 'wide': set(ds[0], -hand * 40, 70); break;
      case 'bouncer': set(ds.find(d => DELIVERIES[d].len[0] >= 140) || ds[0], -hand * 2, 165); break;
      case 'yorker': set(ds.find(d => DELIVERIES[d].len[1] < 30) || ds[0], 0, 8); break;
      default: set(f.delivery || ds[0], f.line !== undefined ? f.line * -hand : -hand * 3, f.len || 45);
    }
    if (f.special) plan.special = true;
  },
  planBatting(m) {
    m.batPlan = null;
    if (m.strikerInput() && !m.cfg.cheat.autoBat && !m.force.outcome) return;
    m.batPlan = { decideAt: m.time + .27 + RNG.play() * .03, decided: false };
  },
  /** the CPU batter's read (once, after aftertouch), then the press at the planned moment */
  stepBatting(m, dt) {
    const P = m.batPlan; if (!P || m.shotPress) return;
    if (!P.decided && m.time >= P.decideAt) { P.decided = true; Object.assign(P, AI.decideShot(m)); }
    if (P.decided && P.btn && m.time >= P.pressAt) { const ok = m.batPress(P.btn, P.aim, P.cheat); P.btn = null; if (!ok) m.batPlan = null; }
    if (P.decided && P.charge && !m.charge && !m.ball.pitched) { m.charge = .01; m.cur.charged = true; m.emit('bat:charge', {}); }
  },
  decideShot(m) {
    const b = m.ball, s = m.striker.p, hand = m.hand, inn = m.inn, f = m.force.outcome;
    const arr = Ball.arrive(b, 36, m.env); if (!arr) return { btn: null };
    const len = m.lengthNow(), line = -hand * arr.x, z = arr.z;
    const toStumps = Ball.arrive(b, 0, m.env), hitting = toStumps && Math.abs(toStumps.x) < 4.2 && toStumps.z < 13;
    if (f) return AI.forcedShot(m, f, len, line);
    // the situation: aggression from the required rate, balls left, wickets in hand and the batter's style
    let a = T('aiAggression');
    const need = m.need(), left = inn.overs * 6 - inn.balls, wk = inn.wicketsMax - inn.wkts;
    if (need) { const rr = need.runs / Math.max(1, need.balls); a += clamp((rr - 1.3) * .35, -.4, .5); if (need.runs <= 0) a = 0; }
    else if (left <= 6) a += .25;
    a += s.style === 'slogger' ? .22 : s.style === 'blocker' ? -.25 : 0;
    if (wk <= 1) a -= .2;
    if (m.special) a -= .1;
    a = clamp(a, 0, 1);
    // the ball: leave the wide ones, play the straight ones
    let btn = null, sector = null;
    if (z > 36 && !hitting) return { btn: null };
    if (line > 13 && !hitting && RNG.play() > a * .6) return { btn: null };
    if (line < -16 && !hitting) return { btn: RNG.play() < a ? 'shot' : null, aim: null, pressAt: m.time + .05 };
    if (len === 'good' && hitting && RNG.play() > a + .25) btn = 'block';
    else btn = RNG.play() < a * (len === 'good' ? .35 : .6) ? 'loft' : 'shot';
    if (need && need.runs <= 0) btn = 'block';
    if (m.cfg.cheat.dummy && RNG.play() < .7) btn = 'block';   // the Nets' dummy batter mostly defends
    // a direction: the widest gap for a ground shot; the fewest deep fielders for a loft
    const id0 = resolveShot(btn, null, len, line), shot = SHOTS[id0];
    if (btn !== 'block') sector = AI.bestDirection(m, btn, shot, len, line);
    const charge = s.style === 'slogger' && m.bowlerFamily() === 'spin' && RNG.play() < a * .35 && !m.ball.pitched && b.y > 170;
    // when to press: the ideal moment plus the perception error
    const aim = sector === null ? null : dirOf(sector, hand);
    const id = resolveShot(btn, sector, charge ? lengthOf((b.pitched ? b.pitchAt[1] : G.CREASE_S + 60) - 24) : len, line);
    const plane = SHOTS[id].back ? 22 : 36, arr2 = Ball.arrive(b, plane + (charge ? 24 : 0), m.env);
    if (!arr2) return { btn: null };
    // the CPU's skill: the difficulty weakens or sharpens CPU opponents, never the autopilot playing for a human side
    const own = m.isHuman(m.bat), skill = own ? Tuning.raw('aiBatSkill') : T('aiBatSkill');
    let sigma = skill / 1000 * (1.2 - (s.tech || 5) * .04);
    if (m.special) sigma *= 1.3; if (!b.pitched && len === 'yorker') sigma *= .8;
    if (m.flags.chirp) sigma *= 2; if (m.special === 'dibbly') sigma *= 2; if (m.flags.fogBall) sigma *= 1.5;
    if (m.cfg.cheat.perfectBat) sigma = 0;
    const err = RNG.normal() * sigma;
    return { btn, aim, sector, charge, pressAt: m.time + Math.max(0, arr2.t - SHOTS[id].at + err - (charge ? .05 : 0)) };
  },
  /** the angle (batter frame) inside a shot's sector farthest from any fielder (ground) or deep fielder (lofted) */
  bestDirection(m, btn, shot, len, line) {
    const hand = m.hand, angs = m.fielders.filter(f => f !== m.keeper).map(f => ({ th: thetaOf(f.x - m.striker.x, f.y - m.striker.y, hand), d: hyp(f.x, f.y) }));
    let lo = line > 4 ? -30 : line < -2 ? -150 : -110, hi = line > 4 ? 140 : line < -2 ? 30 : 110;
    if (shot.fam === 'cut') { lo = 60; hi = 140; } else if (shot.fam === 'pull') { lo = -140; hi = -50; } else if (len === 'full' || len === 'yorker') { lo = line > 4 ? -20 : -90; hi = line > 4 ? 80 : 30; }
    let best = shot.nat, bs = -1;
    for (let th = lo; th <= hi; th += 5) {
      let score = 999;
      for (const f of angs) { if (btn === 'loft' && f.d < 380) continue; if (btn === 'shot' && f.d > 520) continue; score = Math.min(score, Math.abs(wrapAng((th - f.th) * DEG)) / DEG); }
      if (btn === 'loft') score += (800 - m.ropeFrom(th)) * .02;
      score += RNG.play() * 6;
      if (score > bs) { bs = score; best = th; }
    }
    return best;
  },
  /** the direction (batter frame) where a ground shot at `speed` leaves the fielding side slowest to the stumps, for
   *  a forced single or two: each fielder's time to where the ball stops (or crosses its path), plus the throw */
  safeRun(m, speed, runs) {
    const hand = m.hand, fs = T('fieldSpeed'), ts = T('throwSpeed');
    let best = 30, bs = -1e9;
    for (let th = -150; th <= 150; th += 5) {
      const [ux, uy] = dirOf(th, hand), b = Object.assign(Ball.make(), { x: 0, y: 36, z: 1, vx: ux * speed, vy: uy * speed, vz: 0, phase: 'hit', rolling: true }), path = Ball.predict(b, 5, m.env, 6);
      if (path.some(p => m.outside(p.x, p.y))) continue;
      let t = Infinity;
      const last = path[path.length - 1];
      for (const f of m.fielders) {
        for (const p of path) { const arr = hyp(f.x - p.x, f.y - p.y) / fs + .18; if (arr <= p.t) { t = Math.min(t, p.t + .22 + Math.min(hyp(p.x, p.y), hyp(p.x, p.y - G.BOWL_Y)) / ts); break; } }
        const arr = hyp(f.x - last.x, f.y - last.y) / fs + .18; t = Math.min(t, Math.max(last.t, arr) + .22 + Math.min(hyp(last.x, last.y), hyp(last.x, last.y - G.BOWL_Y)) / ts);
      }
      const need = runs * (280 / T('runSpeed') + .3), sc = t - need;
      if (sc > bs) { bs = sc; best = th; }
    }
    return best;
  },
  /** a forced outcome's shot: { btn, aim, cheat, pressAt } */
  forcedShot(m, f, len, line) {
    const hand = m.hand, b = m.ball, at = (btn, aim, grade, flags) => {
      const id = resolveShot(btn, aim ? thetaOf(aim[0], aim[1], hand) : null, len, line), arr = Ball.arrive(b, SHOTS[id].back ? 22 : 36, m.env);
      if (flags) m.flags.forceShot = flags;
      return { btn, aim, cheat: grade ? { grade } : null, pressAt: m.time + (arr ? Math.max(0, arr.t - SHOTS[id].at) : 0) };
    };
    const tgt = f.target ? m.ground.targets.find(t => t.id === f.target) : null;
    const gapTheta = () => AI.bestDirection(m, 'shot', SHOTS.coverDrive, 'full', 6);
    switch (f.kind) {
      case 'dot': return at('block', null, 'perfect');
      case 'leave': case 'bowled': case 'lbw': case 'review': case 'wide': return { btn: null };
      case 'bouncer': return f.duck ? { btn: null } : at('loft', dirOf(-95, hand), 'perfect', { theta: -95 + (RNG.play() - .5) * 10, speed: 470, launch: 34 });
      case 'stumped': m.batPlan.charge = true; m.cur.charged = true; m.charge = .01; return { btn: 'shot', aim: null, cheat: { grade: 'miss' }, pressAt: m.time + .05 };
      case 'edge': case 'caughtbehind': return at('shot', dirOf(40, hand), 'perfect', { theta: 165, speed: 240, launch: 9 });
      case 'six': {
        let th = f.theta !== undefined ? f.theta : RNG.range(-40, 30);
        if (tgt) { const tp = m.targetPos(tgt); th = thetaOf(tp[0], tp[1] - 36, hand); }
        const carry = m.ropeFrom(th) + 70, sp6 = Math.sqrt(m.env.g * carry / Math.sin(72 * DEG));   // (it clears the rope and comes down among the spectators)
        return at('loft', dirOf(th, hand), 'perfect', tgt ? { target: tgt.id, pass: true } : { theta: th, speed: sp6, launch: 36, pass: true });
      }
      case 'four': { const th = f.theta !== undefined ? f.theta : gapTheta(); return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: 560, launch: 2, pass: true }); }
      case 'caught': {
        const fl = m.fielders.filter(x => x !== m.keeper && x !== m.bowler && hyp(x.x, x.y) > 120).sort((p, q) => hyp(p.x, p.y) - hyp(q.x, q.y))[0];
        const th = fl ? thetaOf(fl.x - m.striker.x, fl.y - G.CONTACT_FRONT, hand) : 20, D = fl ? hyp(fl.x - m.striker.x, fl.y - G.CONTACT_FRONT) : 200;
        const launch = 40, v = Math.sqrt(D * m.env.g / Math.sin(2 * launch * DEG)) * .97;
        m.cfg.cheat.catchesOnce = true;
        return at('loft', dirOf(th, hand), 'perfect', { theta: th, speed: v, launch });
      }
      case 'runout': {
        const fl = m.fielders.filter(x => x !== m.keeper && x !== m.bowler).sort((p, q) => Math.abs(hyp(p.x, p.y) - 150) - Math.abs(hyp(q.x, q.y) - 150))[0];
        const th = fl ? thetaOf(fl.x, fl.y - 36, hand) : 40;
        m.flags.forceRun = 1; m.cfg.cheat.directHitOnce = true; m.flags.forceRunOut = true;
        return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: 190, launch: 2 });
      }
      case '1': case '2': case '3': { const sp = f.kind === '1' ? 120 : 300, th = AI.safeRun(m, sp, f.kind === '1' ? 1 : 2); m.flags.forceRun = +f.kind; return at('shot', dirOf(th, hand), 'perfect', { theta: th, speed: sp, launch: 3 }); }
      default: return at('shot', null, 'good');
    }
  },
  /* ---- running: calls for the CPU batting side (and Running: Auto) ---- */
  fieldTime(m, end) {
    const sy = end === 'S' ? 0 : G.BOWL_Y, ts = T('throwSpeed');
    if (m.holder) return .25 + hyp(m.holder.x, m.holder.y - sy) / ts;
    if (m.thrown) return m.thrown.end === end ? .3 : 1.2;
    const c = m.chaser; if (!c || !c.chase) return 9;
    const s = c.chase; if (m.outside(s.x, s.y)) return 99;
    const left = Math.max(0, s.t - m.pt);
    return left + .3 + hyp(s.x, s.y - sy) / ts;
  },
  batTime(m, b, end) { return Math.abs(b.y - END_Y[end]) / T('runSpeed') + (b.goal ? 0 : .25); },
  stepRunning(m, dt) {
    const R = m.running; if (!R) return;
    const s = m.striker, n = m.nonStriker, forced = m.flags.forceRun;
    if (!R.started && R.t < .25) return;
    // the boundary is coming: no need to run
    const last = m.samples && m.samples[m.samples.length - 1], toRope = last && m.outside(last.x, last.y) && !m.holder;
    if (forced) {
      if (!R.started) { m.startRun(s); m.startRun(n); m.emit('run:call', { call: 'YES', who: s.id }); }
      if (!s.goal && !n.goal && R.runs < forced && R.runs > 0) { m.startRun(s); m.startRun(n); }
      if (R.runs >= forced) m.flags.forceRun = 0;
      return;
    }
    const margin = end => AI.fieldTime(m, end) - Math.max(AI.batTime(m, s, s.goal || m.otherEnd(m.batterEnd(s) || s.home)), AI.batTime(m, n, n.goal || m.otherEnd(m.batterEnd(n) || n.home)));
    const agg = clamp(T('aiAggression') + (m.need() && m.need().runs / Math.max(1, m.need().balls) > 1.5 ? .25 : 0), 0, 1);
    if (!s.goal && !n.goal && !toRope) {
      if (m.decision || m.cur.wicket) return;
      const endS = m.otherEnd(m.batterEnd(s) || s.home), mg = Math.min(margin(endS), margin(m.otherEnd(endS)));
      const go = mg > .35 || (mg > -.15 && RNG.play() < agg * dt * 3);
      if (go && (R.runs === 0 ? R.t < 2.5 : true) && R.runs < 4) { m.startRun(s); m.startRun(n); m.emit('run:call', { call: R.runs ? 'TWO!' : 'YES', who: s.id }); }
      R.hint = mg > .35 ? 'YES' : mg < -.15 ? 'NO' : 'WAIT';
    } else if (s.goal || n.goal) {
      for (const b of [s, n]) {
        if (!b.goal) continue;
        const d = Math.abs(b.y - END_Y[b.goal]), mg = AI.fieldTime(m, b.goal) - d / T('runSpeed');
        if (mg < .3 && d < 50 && d > 8 && b.dive <= 0 && (m.thrown || m.holder)) { b.dive = .6; m.emit('run:dive', {}); coverage.mark('dive'); }
        const frac = 1 - d / (G.CREASE_B - G.CREASE_S);
        if (mg < -.5 && frac < .35 && b.crossings === R.runs && !forced) { m.sendBack(s); m.sendBack(n); m.emit('run:call', { call: 'NO!', who: s.id }); break; }
      }
    }
  },
  /* ---- the attract mode's and tests' autopilot: drive a human side's inputs from the AI (cheats allowed) ---- */
  autopilot(m, side, role, cheat) { m.cfg.cheat = Object.assign(m.cfg.cheat || {}, cheat || {}, role === 'bat' ? { autoBat: true } : { autoBowl: true }); }
};
K.AI = AI;
