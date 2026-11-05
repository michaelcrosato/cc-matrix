/* ---- UMPIRING AND DISMISSALS. LBW truth: (1) pitched outside leg -> not out; (2) impact outside off with a shot
 * offered -> not out (and impact outside leg -> not out); (3) the predictor continues from the impact with the pad
 * removed: does it hit the stumps (inflated by the ball's radius)? Within a unit of the edge it's UMPIRE'S CALL (the
 * on-field decision stands). The on-field umpire is right with probability umpire.accuracy (Rev. Hollis .86). The
 * Kerfuffle Review System: one review per side per innings, 4 s to press special (REVIEW); Owl-Eye replays it.
 * The third umpire takes run-outs and stumpings decided by under 0.15 s, and catches that touched the ground. ---- */
const Umpire = {
  /** the ball has struck the pad: decide whether it is an LBW appeal (true: the ball is dead, a decision pending) */
  lbwCandidate(m) {
    const b = m.ball, hand = m.hand, ph = m.padHit, inn = m.inn;
    const pitchLine = b.pitchAt ? -hand * b.pitchAt[0] : 0, impactLine = -hand * ph.x, R = G.STUMP_HALF + G.BALL_R;
    // the path with the pad removed
    const c = Ball.copy(b); let hit = null; const path = [];
    for (let i = 0; i < 240; i++) { const y0 = c.y, x0 = c.x, z0 = c.z; Ball.step(c, G.STEP, m.env); if (i % 2 === 0) path.push([c.x, c.y, c.z]); if (c.y <= 0) { const f = y0 / Math.max(1e-6, y0 - c.y); hit = { x: lerp(x0, c.x, f), z: lerp(z0, c.z, f) }; break; } }
    const wx = hit ? Math.abs(hit.x) : 99, wz = hit ? hit.z : 99, edgeD = Math.min(R - wx, G.STUMP_H + G.BALL_R - wz);
    const wickets = hit ? (edgeD >= 0 ? (edgeD < 1 ? 'umpire' : 'hitting') : (edgeD > -1 ? 'umpire' : 'missing')) : 'missing';
    const pitching = b.pitchAt ? (pitchLine < -R ? 'outside leg' : 'in line') : 'full toss';
    const shot = !!m.shotPress;
    const impact = impactLine > R ? (shot ? 'outside off' : 'outside off (no shot)') : impactLine < -R ? 'outside leg' : 'in line';
    let truth = wickets !== 'missing' && pitching !== 'outside leg' && impact !== 'outside leg' && impact !== 'outside off';
    const umpCall = truth ? wickets === 'umpire' : wickets === 'umpire' && pitching !== 'outside leg' && impact !== 'outside leg' && impact !== 'outside off';
    const close = hit && wx < R + 8 && wz < G.STUMP_H + 8;
    if (!truth && !close) return false;
    // the appeal: HOWZAT!
    const U = m.umpireData(), acc = clamp(U.accuracy + (m.special === 'grudge' ? .1 : 0), 0, 1);
    let given = RNG.play() < acc ? truth : !truth;
    if (m.cfg.cheat.lbwGiven !== undefined) { given = m.cfg.cheat.lbwGiven; m.cfg.cheat.lbwGiven = undefined; }
    if (umpCall && m.cfg.mode !== 'attract') given = RNG.play() < .5;
    b.phase = 'dead'; b.vx *= -.1; b.vy *= -.1; b.vz = 20;
    m.decision = { kind: 'lbw', truth: umpCall ? given : truth, given, umpCall, pending: true, umpT: .9 + (U.slowFinger || .5), t: 0, reviewable: true, owl: { path, pitch: b.pitchAt && b.pitchAt.slice(), impact: [ph.x, ph.y, ph.z], pitching, impact2: impact, wickets, hit }, side: m.bowlSide };
    m.cur.appeals.push('lbw'); m.emit('appeal', { kind: 'lbw' });
    if (given) m.cur.wicket = { how: 'lbw', batter: m.striker.id, fielder: null, bowler: m.bowlerP.id, pending: true };
    void inn;
    m.deadBall('appeal');
    return true;
  },
  /** a caught-behind appeal: edged (a real catch off a thin edge) or not (beaten close to the bat, taken by the keeper) */
  appealCaughtBehind(m, edged, catcher) {
    const U = m.umpireData(), acc = U.accuracy;
    let given = edged ? RNG.play() < acc + (1 - acc) * .4 : RNG.play() < (1 - acc) * .6;
    if (m.cfg.cheat.cbGiven !== undefined) { given = m.cfg.cheat.cbGiven; m.cfg.cheat.cbGiven = undefined; }
    if (!edged && !given && RNG.play() > .3) { m.deadBall('keeper'); return; }
    m.decision = { kind: 'caught', truth: edged, given, umpCall: false, pending: true, umpT: .7 + (U.slowFinger || .5) * .6, t: 0, reviewable: true, side: m.bowlSide };
    m.cur.appeals.push('caught'); m.emit('appeal', { kind: 'caught' });
    if (given) m.cur.wicket = { how: 'caught', batter: m.striker.id, fielder: catcher ? (catcher === m.keeper ? 'wk ' : '') + catcher.p.short.toLowerCase() : 'wk ' + m.keeper.p.short.toLowerCase(), bowler: m.bowlerP.id, pending: true, catcher: catcher ? catcher.id : m.keeper.id };
    m.deadBall('appeal');
  },
  /** each step of a dead ball: the finger (or not), the review window, the review, the third umpire */
  stepDecision(m, dt) {
    const d = m.decision, inn = m.inn;
    if (!d && m.cur.third && !m.cur.thirdDone) { m.cur.thirdDone = true; m.decision = { kind: 'third', third: m.cur.third.kind, truth: !!m.cur.wicket, given: !!m.cur.wicket, pending: true, umpT: 3.4, t: 0, reviewable: false }; m.emit('review:start', { kind: 'third', what: m.cur.third.kind }); coverage.mark('third'); return; }
    if (!d) return;
    d.t += dt;
    if (d.pending && d.t >= d.umpT) {
      d.pending = false;
      if (d.kind === 'third') { m.emit('review:result', { kind: 'third', out: d.truth }); m.emit('decision', { out: d.truth, kind: 'third' }); return; }
      m.emit('decision', { out: d.given, kind: d.kind });
      Umpire.signal(m, d.given ? 'out' : 'notout');
      const side = d.given ? m.bat : m.bowlSide;
      if (d.reviewable && m.reviews[side] > 0 && m.cfg.mode !== 'hub') { m.reviewWindow = 4; d.reviewSide = side; }
    }
    if (m.reviewWindow > 0) {
      m.reviewWindow -= dt;
      const side = d.reviewSide, H = m.humansOf(side), I = H.length ? (side === m.bat ? m.strikerInput() : m.bowlerInput()) : null;
      let ask = false;
      if (I && !(side === m.bat ? m.cfg.cheat.autoBat : m.cfg.cheat.autoBowl)) { if (I.pressed('special')) { I.consume('special'); ask = true; } }
      else if (m.reviewWindow < 3.2 && !d.cpuThought) { d.cpuThought = true; const wrong = d.truth !== d.given && !d.umpCall; ask = m.cfg.cheat.review !== undefined ? m.cfg.cheat.review : wrong ? RNG.play() < .8 : RNG.play() < .06; m.cfg.cheat.review = undefined; }
      if (ask) Umpire.review(m);
      else if (m.reviewWindow <= 0) { m.reviewWindow = 0; }
    }
    if (d.reviewing) {
      d.rt += dt;
      if (d.rt >= d.rlen) {
        d.reviewing = false;
        const final = d.umpCall ? d.given : d.truth, overturned = final !== d.given;
        if (!overturned) m.reviews[d.reviewSide] = Math.max(0, m.reviews[d.reviewSide] - 1);
        d.final = final; d.overturned = overturned;
        if (final && !m.cur.wicket) m.cur.wicket = { how: d.kind, batter: m.striker.id, fielder: d.kind === 'caught' ? 'wk ' + m.keeper.p.short.toLowerCase() : null, bowler: m.bowlerP.id };
        if (!final && m.cur.wicket && m.cur.wicket.how === d.kind) m.cur.wicket = null;
        if (final !== d.given) d.out = final;
        m.emit('review:result', { kind: d.kind, out: final, overturned, umpCall: d.umpCall, side: d.reviewSide });
        if (overturned) coverage.mark('review:overturned');
        Umpire.signal(m, final ? 'out' : 'notout');
        m.pt = Math.max(0, m.deadT - 1.6);
      }
    }
    if (m.cur.wicket && m.cur.wicket.pending && !d.pending && m.reviewWindow <= 0 && !d.reviewing) { m.cur.wicket.pending = false; m.emit('wicket', { how: m.cur.wicket.how, batter: m.cur.wicket.batter, fielder: m.cur.wicket.fielder }); coverage.mark('out:' + m.cur.wicket.how); }
    void inn;
  },
  review(m) {
    const d = m.decision; m.reviewWindow = 0; d.reviewing = true; d.rt = 0; d.rlen = d.kind === 'lbw' ? 6.5 : 4.5;
    m.emit('review:start', { kind: d.kind, side: d.reviewSide }); coverage.mark('review');
    Umpire.signal(m, 'review');
  },
  signal(m, sig) { const u = m.umpires[0]; if (u) u.anim = { kind: 'signal', sig, t: 0 }; m.signal = sig; m.emit('signal', { sig }); },
  /** the umpire's signal for the ball just dead (OUT comes with the decision) */
  signalFor(m) {
    const c = m.cur;
    if (m.decision) return;
    if (c.wicket && !c.third) return Umpire.signal(m, 'out');
    if (c.boundary === 6) return Umpire.signal(m, 'six');
    if (c.boundary === 4) return Umpire.signal(m, c.contact ? 'four' : 'bye');
    if (c.extras.wd) return Umpire.signal(m, 'wide');
    if (c.extras.nb) return Umpire.signal(m, 'noball');
    if (!c.contact && c.ran) return Umpire.signal(m, c.padded ? 'legbye' : 'bye');
    if (m.inn.freeHit) return;
    if (c.dead === 'cap') return Umpire.signal(m, 'dead');
  }
};
Match.prototype.umpireData = function () { return UMPIRES[this.ground.umpire] || UMPIRES.neutral; };
K.Umpire = Umpire;
