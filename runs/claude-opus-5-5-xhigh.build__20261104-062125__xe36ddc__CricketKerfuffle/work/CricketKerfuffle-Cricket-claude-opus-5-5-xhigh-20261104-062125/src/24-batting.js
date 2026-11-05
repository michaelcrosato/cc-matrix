/* ---- BATTING. Aim with the stick, WASD or the mouse (in screen space: push toward where the ball should go as you
 * see it); shot (Cross / J / left click) plays a ground shot, loft (Square / K / right click) a lofted one, block
 * (Circle / L / Q) defends; no button is a leave. charge (R2 / E) steps down the pitch before the ball pitches.
 * Timing: each shot has contactAt (press to contact); the predictor says when the ball reaches the shot's contact
 * plane; delta = contactAt - arrival grades PERFECT / GOOD / EARLY / LATE / MISS. At the plane the ball's real line
 * and height are checked against the shot's zone: inside is clean, just outside is an edge, further is a miss. ---- */
const Batting = {
  windows(m) {
    let k = 1;
    if (m.fire.bat > 0) k *= 1.5;
    if (m.flags.giantBat > 0) k *= 1.4;
    if (m.flags.teaTime > 0 && m.flags.teaSide === m.bat) k *= 1.1;
    if (m.flags.chirp) k *= m.strikerInput() ? .7 : 1;
    if (m.special === 'grandad') k *= .5;
    return { perfect: T('perfectMs') / 1000 * k, good: T('goodMs') / 1000 * k, ok: T('okMs') / 1000 * k };
  },
  gradeOf(delta, w) { const d = Math.abs(delta); return d <= w.perfect ? 'perfect' : d <= w.good ? 'good' : d <= w.ok ? (delta < 0 ? 'early' : 'late') : 'miss'; },
  /** where the batter's pad stands (the leading leg's box) for the foot the batter is on */
  padBox(m) {
    const h = m.hand, c = m.charge > 0 ? 24 * Math.min(1, m.charge) : 0, sp = m.shotPress, back = sp && SHOTS[sp.shotId].back;
    const y0 = (back ? 8 : sp ? 20 : 14) + c, x0 = sp && sp.grade === 'miss' ? -2 : .5;
    return { y0, y1: y0 + 10, xa: h > 0 ? x0 : -9, xb: h > 0 ? 9 : -x0, z1: 20 };
  }
};
Object.assign(Match.prototype, {
  /** the ball's length class as the batter sees it (a charge shortens it by 24 units) */
  lengthNow() {
    const b = this.ball; let py = b.pitched ? b.pitchAt[1] : null;
    if (py === null) { const s = Ball.predict(b, 2, this.env, 1, c => c.pitched); const last = s[s.length - 1]; py = last && last.pitched ? last.y : 0; }
    return lengthOf(py - (this.charge > 0 ? 24 : 0));
  },
  contactPlane(shotId) { return (SHOTS[shotId].back ? 22 : 36) + (this.charge > 0 ? 24 : 0); },
  /** the batter presses a shot: btn 'shot' | 'loft' | 'block', aim: a world direction [dx, dy] or null (neutral) */
  batPress(btn, aim, cheat) {
    if (this.shotPress || this.phase !== 'flight' || this.contact) return false;
    const b = this.ball, hand = this.hand, len = this.lengthNow();
    const arr0 = Ball.arrive(b, 36 + (this.charge > 0 ? 24 : 0), this.env), line0 = arr0 ? -hand * arr0.x : 0;
    const sector = aim && hyp(aim[0], aim[1]) > .3 ? thetaOf(aim[0], aim[1], hand) : null;
    const shotId = resolveShot(btn, sector, len, line0), shot = SHOTS[shotId];
    const plane = this.contactPlane(shotId), arr = Ball.arrive(b, plane, this.env);
    if (!arr) return false;
    const w = Batting.windows(this), delta = shot.at - arr.t;
    let grade = Batting.gradeOf(delta, w);
    if (cheat && cheat.grade) grade = cheat.grade;
    if (this.batSpecialArmed === 'certainty' && grade !== 'perfect') grade = 'good';
    this.shotPress = { t: this.time, btn, shotId, sector, aim, grade, delta, plane, len, cheat: cheat || null };
    this.cur.shot = shotId; this.cur.grade = grade; this.cur.press = { delta: Math.round(delta * 1000) };
    this.striker.anim = { kind: 'shot', shot: shotId, t: 0, at: shot.at, grade };
    this.emit('bat:press', { shot: shotId, grade, delta });
    return true;
  },
  /** the step to press for a PERFECT with a button (neutral stick) on the current ball: seconds from now, or null */
  idealPress(btn = 'shot', aim = null) {
    const b = this.ball; if (this.phase !== 'flight' && this.phase !== 'runup') return null;
    if (b.phase !== 'delivery') return null;
    const hand = this.hand, len = this.lengthNow(), arr0 = Ball.arrive(b, 36, this.env), line0 = arr0 ? -hand * arr0.x : 0;
    const sector = aim ? thetaOf(aim[0], aim[1], hand) : null, id = resolveShot(btn, sector, len, line0), arr = Ball.arrive(b, this.contactPlane(id), this.env);
    return arr ? Math.max(0, arr.t - SHOTS[id].at) : null;
  },
  phase_flight(dt) {
    const b = this.ball, hand = this.hand;
    this.flightT += dt;
    // aftertouch: the stick's sideways push adds swing (seamers) or drift (spinners) for 0.25 s
    if (this.aftertouch > 0) {
      this.aftertouch -= dt;
      const I = this.bowlerInput();
      if (I && !this.cfg.cheat.autoBowl && !this.forcedSpec) { let x = I.move()[0]; const ms = K.mouseAim && K.mouseAim(I); if (ms && ms.dx) x = clamp(x + ms.dx * .08, -1, 1); if (Math.abs(x) > .15) { b.swingA += x * .6 * 60 * T('swing') * dt / .25 * 1.6; this.cur.aftertouch = (this.cur.aftertouch || 0) + x * dt; } }
    }
    // the human batter: special, charge, shot / loft / block (aim from the stick or the mouse)
    const I = this.strikerInput();
    if (I && !this.cfg.cheat.autoBat) this.humanBatInput(I);
    if (this.batPlan) AI.stepBatting(this, dt);
    if (this.autoSpecialPress && this.time >= this.autoSpecialPress.t) { const a = this.autoSpecialPress; this.autoSpecialPress = null; this.batPress(a.btn, a.aim, { grade: 'perfect' }); }
    if (this.charge > 0 && this.charge < 1) { this.charge = Math.min(1, this.charge + dt / .25); }
    if (this.charge > 0) { this.striker.y = G.CREASE_S + 2 + 24 * this.charge; if (this.charge < 1) this.striker.anim = { kind: 'charge', t: this.charge }; }
    if (this.triple) for (const h of this.triple) Ball.step(h, dt, this.env);
    // the bowler's follow-through: on down the pitch a few strides, veering off it
    if (this.bowler && this.bowlerFamily() !== 'machine') { const bw = this.bowler, side = bw.x < 0 ? -1 : 1; this.moveActor(bw, side * 26, Math.max(250, bw.y - 1), 60 * Math.max(0, 1 - this.flightT), dt); bw.anim = { kind: 'deliver', t: this.flightT + .16 }; }
    if (this.vanish) { const u = this.flightT / this.vanish.total; b.hidden = u > this.vanish.from && u < this.vanish.to; if (b.hidden && !this.vanish.seen) { this.vanish.seen = true; this.emit('fx:vanish', {}); } }
    // keeper reads the line
    const ks = this.keeperSpot(), pr = Ball.arrive(b, ks[1] + 4, this.env, 3);
    this.moveActor(this.keeper, pr ? clamp(pr.x, -60, 60) : 0, ks[1], 170, dt);
    this.keeper.anim = { kind: 'crouch', t: 0 };
    const y0 = b.y, x0 = b.x, z0 = b.z;
    Ball.step(b, dt, this.env);
    if (this.ground.nets && b.y < -38 && this.netCollide(x0, y0, z0)) { b.phase = 'hit'; return this.goInPlay(false); }
    if (b.pitched && !this.cur.pitch) { this.cur.pitch = b.pitchAt.slice(); this.cur.length = lengthOf(b.pitchAt[1]); this.emit('ball:pitched', { at: b.pitchAt, length: this.cur.length }); }
    const crossed = yy => y0 > yy && b.y <= yy, at = yy => { const f = (y0 - yy) / Math.max(1e-6, y0 - b.y); return { x: lerp(x0, b.x, f), z: lerp(z0, b.z, f) }; };
    // the bat
    const sp = this.shotPress;
    if (sp && !this.contact && crossed(sp.plane)) {
      const p = at(sp.plane);
      if (sp.grade !== 'miss') { if (this.resolveContact(p.x, sp.plane, p.z)) return; }
      else { this.cur.beaten = true; this.emit('ball:beaten', {}); }
    }
    // a beamer and a wide, judged at the popping crease
    if (!this.contact && crossed(G.CREASE_S)) {
      const p = at(G.CREASE_S), line = -hand * p.x;
      if (!b.pitched && p.z > 26 && !this.cur.extras.nb) { this.cur.extras.nb = 1; this.cur.noBall = 'beamer'; this.emit('extra', { kind: 'nb', why: 'beamer' }); }
      else if (!this.cur.extras.nb && (line > 26 || line < -18 || p.z > 40)) { this.cur.extras.wd = 1; this.emit('extra', { kind: 'wd' }); }
      if (!sp && p.z > 28) this.striker.anim = { kind: 'duck', t: 0 };
      else if (!sp) this.striker.anim = { kind: 'leave', t: 0 };
    }
    // the pad (leg before wicket)
    const pb = Batting.padBox(this);
    if (!this.contact && !this.padHit && y0 > pb.y0 && b.y <= pb.y1 && b.y >= pb.y0 - 2 && b.x >= pb.xa && b.x <= pb.xb && b.z <= pb.z1) {
      this.padHit = { x: b.x, y: b.y, z: b.z }; this.cur.padded = true;
      if (Umpire.lbwCandidate(this)) return;
      // not a candidate: it rebounds off the pad (leg byes possible)
      b.vx = -b.vx * .2 + (b.x > 0 ? 30 : -30); b.vy = -b.vy * .15; b.vz = Math.abs(b.vz) * .3; b.phase = 'hit'; b.carried = false; b.rolling = false;
      this.emit('ball:padded', {});
      return this.goInPlay(false);
    }
    // the stumps
    if (!this.contact && crossed(G.STUMPS_Y)) {
      const p = at(G.STUMPS_Y);
      if (Math.abs(p.x) <= G.STUMP_HALF + G.BALL_R && p.z <= G.STUMP_H + G.BALL_R) return this.bowled(this.special === 'sawn' ? 'sawn' : 'bowled');
    }
    // the keeper takes it, or it beats him (byes)
    const kp = this.keeper;
    if (!this.contact && b.y <= kp.y + 6 && y0 > kp.y + 6) {
      const reach = 16 + ((kp.p.field && kp.p.field.catch) || 6);
      if (Math.abs(b.x - kp.x) <= reach && b.z <= 34) return this.keeperTakes();
      this.emit('ball:pastKeeper', {}); b.phase = 'hit'; b.carried = false;
      return this.goInPlay(false);
    }
    if (b.y < -260 || this.flightT > 3.5) { b.phase = 'hit'; this.goInPlay(false); }
  },
  humanBatInput(I) {
    if (I.pressed('special') && !this.batSpecialArmed && this.specialReady(this.bat, 'bat')) { I.consume('special'); this.armBatSpecial(); }
    if (I.pressed('charge') && !this.ball.pitched && !this.charge && this.ball.phase === 'delivery') { I.consume('charge'); this.charge = .01; this.cur.charged = true; this.emit('bat:charge', {}); }
    if (I.pressed('back') && this.charge >= 1 && this.cur.beaten) { I.consume('back'); this.returnToCrease = true; }
    const btn = ['shot', 'loft', 'block'].find(a => I.pressed(a));
    if (btn) { I.consume(btn); this.batPress(btn, K.batAim ? K.batAim(I, this) : null); }
  },
  /** the striker's special: kettle / longhandle / bludgeon / kerfuffleShot / croquet / grudgeDrive / ecto play themselves
   *  at the perfect moment; certainty shows the timing ring and guarantees GOOD */
  armBatSpecial() {
    const id = this.striker.p.specBat || 'kerfuffleShot';
    this.useSpecial(this.bat, id); this.batSpecialArmed = id; this.cur.batSpecial = id;
    if (id !== 'certainty') {
      const btn = id === 'croquet' || id === 'grudgeDrive' || id === 'ecto' ? 'shot' : 'loft';
      const aim = id === 'grudgeDrive' ? [0, 1] : (K.batAim && this.strikerInput() ? K.batAim(this.strikerInput(), this) : null) || (id === 'croquet' ? dirOf(55, this.hand) : null);
      const t = this.idealPress(btn, aim); this.autoSpecialPress = { t: this.time + (t === null ? .1 : t), btn, aim };
    }
  },
  /** the bat meets the ball at (x, plane, z): clean inside the shot's zone, an edge just outside, else a miss */
  resolveContact(x, plane, z) {
    const sp = this.shotPress, shot = SHOTS[sp.shotId], hand = this.hand, line = -hand * x;
    const zk = this.flags.giantBat > 0 ? 1.4 : 1, l0 = shot.line[0] * zk, l1 = shot.line[1] * zk, z0 = shot.z[0], z1 = shot.z[1] * zk;
    const out = Math.max(l0 - line, line - l1, z0 - z, z - z1, 0);
    const fireBowl = this.fire.bowl > 0 ? 1.4 : 1, vic = this.special === 'vicar' ? 1.5 : 1;
    const edgeZone = T('edge') * 4 * fireBowl * vic;
    if (sp.cheat && sp.cheat.grade) { return this.applyContact('clean', x, plane, z); }
    if (out <= 0) return this.applyContact('clean', x, plane, z);
    if (out <= edgeZone) {
      const kind = z > z1 ? 'top' : z < z0 ? 'bottom' : line > l1 ? 'outside' : 'inside';
      return this.applyContact('edge', x, plane, z, kind, out / Math.max(.01, edgeZone));
    }
    this.cur.beaten = true; this.emit('ball:beaten', { out });
    return false;
  },
  applyContact(kind, x, plane, z, edge, depth) {
    const b = this.ball, sp = this.shotPress, shot = SHOTS[sp.shotId], hand = this.hand, P = this.striker.p;
    const incoming = hyp(b.vx, b.vy, b.vz), grade = sp.grade, special = this.batSpecialArmed;
    const timingF = { perfect: 1, good: .85, early: .6, late: .6 }[grade] || .6;
    const powerF = .7 + (P.power || 5) * .04;
    let theta = sp.sector !== null && sp.sector !== undefined ? sp.sector : shot.nat, speed, launch;
    // hit wicket: a back-foot shot mistimed, rarely (comically)
    if (shot.back && (grade === 'early' || grade === 'late') && RNG.play() < .015 && !special) { this.cur.contact = true; this.contact = { kind: 'hitwicket' }; return this.wicketNow('hit wicket', this.striker.id, null), true; }
    if (kind === 'clean') {
      if (grade === 'good') theta += RNG.normal() * 6;
      if (grade === 'early') theta -= 18;
      if (grade === 'late') theta += theta >= 0 ? 22 : -22;
      theta += RNG.normal() * 2;
      const loft = shot.btn === 'loft';
      speed = shot.speed * powerF * timingF * (1 + .1 * incoming / 386) * T(loft ? 'loftPower' : 'batPower');
      if (this.fire.bat > 0) speed *= 1.2;
      launch = shot.launch + ((grade === 'early' || grade === 'late') ? (loft ? 8 : 4) : 0) + RNG.normal() * (loft ? 2 : .8);
      if (special === 'kettle') speed *= 1.25; if (special === 'longhandle') speed *= 1.4; if (special === 'bludgeon') speed *= 1.4; if (special === 'kerfuffleShot') speed *= 1.2;
      if (special === 'croquet') { speed = Math.max(speed, 470); launch = 1; }
      if (special === 'grudgeDrive') { theta = 0; speed *= 1.3; }
      if (this.flags.giantBat > 0) speed *= 1.08;
    } else {
      // edges: thin to the keeper or slips, thick to third man or gully, inside onto the pad or stumps, top edge skied
      const off = line => line;
      void off;
      if (edge === 'outside') { const thin = depth > .45; theta = thin ? RNG.range(158, 174) : RNG.range(115, 150); speed = incoming * (thin ? RNG.range(.6, .75) : RNG.range(.5, .7)); launch = thin ? RNG.range(6, 13) : RNG.range(1, 5); }
      else if (edge === 'inside') {
        if (Math.abs(x) <= G.STUMP_HALF + 1.2 && RNG.play() < .5) { this.cur.contact = true; this.contact = { kind: 'edge', edge }; this.emit('ball:edge', { edge: 'inside', dragged: true }); return this.bowled('played on'), true; }
        theta = -RNG.range(150, 172); speed = incoming * RNG.range(.35, .5); launch = RNG.range(0, 4);
      } else if (edge === 'top') { theta = (sp.sector !== null ? sp.sector : shot.nat) + RNG.range(-40, 40); if (Math.abs(theta) < 100) theta = sign(theta) * RNG.range(120, 175); speed = RNG.range(150, 230); launch = RNG.range(58, 74); }
      else { theta = RNG.range(-30, 30); speed = RNG.range(30, 80); launch = 0; if (Math.abs(x) <= G.STUMP_HALF + 1 && RNG.play() < .3) { this.cur.contact = true; this.contact = { kind: 'edge', edge }; return this.bowled('played on'), true; } }
      this.cur.edge = edge; this.emit('ball:edge', { edge, thin: edge === 'outside' && depth > .45 });
    }
    let forcedV = null, forcedPass = false;
    if (this.flags.forceShot) { const f = this.flags.forceShot; this.flags.forceShot = null; forcedPass = !!f.pass; if (f.target) { const t = this.ground.targets.find(q => q.id === f.target); if (t) { const tp = this.targetPos(t), D = hyp(tp[0] - x, tp[1] - plane); forcedV = E.arc({ x, y: plane, z }, { x: tp[0], y: tp[1], z: tp[2] }, this.env.g, { time: D / 380 }); theta = thetaOf(tp[0] - x, tp[1] - plane, hand); } } else { theta = f.theta; speed = f.speed; launch = f.launch; } }
    // a well-aimed lofted hit at a stadium target is drawn onto it (the arcade's kindness)
    let assist = null;
    if (kind === 'clean' && shot.btn === 'loft' && (grade === 'perfect' || grade === 'good') && this.kerfuffle) assist = this.targetAssist(theta, speed, launch, x, plane, z);
    const [ux, uy] = dirOf(theta, hand), h = speed * Math.cos(launch * DEG);
    Object.assign(b, { x, y: plane, z: Math.max(z, .5), vx: ux * h, vy: uy * h, vz: speed * Math.sin(launch * DEG), phase: 'hit', carried: true, rolling: false, age: 0, swingA: 0, wobble: 0, groundAt: null, hidden: false, fx: special ? SPECIALS[special].fx : this.fire.bat > 0 ? 'fire' : null, passThrough: special === 'ecto' ? 1 : special === 'croquet' ? 99 : 0 });
    if (assist) Object.assign(b, assist);
    if (forcedV) { b.vx = forcedV.vx; b.vy = forcedV.vy; b.vz = forcedV.vz; }
    if (forcedPass) b.passThrough = 99;
    this.contact = { kind, edge, grade, theta, speed, launch, shot: sp.shotId, special };
    this.cur.contact = true; this.cur.theta = Math.round(theta); this.cur.launch = launch;
    this.striker.anim.contact = true;
    this.triple = null;
    this.emit('bat:contact', { grade, kind, edge, shot: sp.shotId, family: shot.fam, special, speed });
    coverage.mark('shot:' + shot.fam); if (special) coverage.mark('special:' + special);
    this.batSpecialArmed = null; this.flags.chirp = false;
    this.goInPlay(true);
    return true;
  },
  /** snap a lofted hit onto a stadium target within 7 degrees whose distance it can carry */
  targetAssist(theta, speed, launch, x, plane, z) {
    const hand = this.hand;
    for (const t of this.ground.targets) {
      if (this.targetsHit[t.id]) continue;
      const tp = this.targetPos(t), dx = tp[0] - x, dy = tp[1] - plane, th = thetaOf(dx, dy, hand);
      if (Math.abs(wrapAng((th - theta) * DEG)) > 7 * DEG) continue;
      const D = hyp(dx, dy), h = speed * Math.cos(launch * DEG), range = h * 2 * speed * Math.sin(launch * DEG) / this.env.g;
      if (range < D * .82) continue;
      const tt = D / h, vz = (tp[2] - z + .5 * this.env.g * tt * tt) / tt;
      if (vz < h * .2 || vz > h * 1.6) continue;
      return { vx: dx / D * h, vy: dy / D * h, vz, aimed: t.id };
    }
    return null;
  },
  targetPos(t) {
    if (t.moving) { const a = this.time * .12; return [t.at[0] + Math.sin(a) * 220, t.at[1] + Math.cos(a * .7) * 40, t.at[2] + Math.sin(a * 1.3) * 12]; }
    return t.at;
  },
  keeperTakes() {
    const b = this.ball, kp = this.keeper; b.phase = 'dead'; b.vx = b.vy = b.vz = 0; b.x = kp.x; b.y = kp.y; b.z = 10;
    kp.anim = { kind: 'gather', t: 0 }; this.holder = kp; kp.ball = true;
    this.emit('keeper:take', {});
    // a stumping: the striker out of his ground after a miss with the keeper standing up
    const up = this.keeperSpot()[1] > -60, out = this.striker.y > G.CREASE_S + 6;
    if (up && out && this.cur.beaten !== undefined) { this.stumpT = (this.flags.lightning > 0 ? .75 : .25); this.cur.stumpChance = true; return this.goInPlay(false, true); }
    // a caught-behind appeal on a ball that beat the bat close to it
    if (this.cur.beaten && this.shotPress) Umpire.appealCaughtBehind(this, false);
    this.deadBall('keeper');
  },
  bowled(how) {
    const b = this.ball; b.phase = 'dead'; b.vx *= .2; b.vy = Math.abs(b.vy) * .1; b.vz = 30;
    this.cur.stumpsBroken = true;
    this.emit('stumps:broken', { end: 'striker', how, sawn: how === 'sawn' });
    this.wicketNow(how === 'sawn' ? 'bowled' : how === 'played on' ? 'bowled' : 'bowled', this.striker.id, null, { sawn: how === 'sawn', playedOn: how === 'played on' });
    return true;
  },
  /** a wicket falls: recorded on the ball; the ball is dead (unless a free hit saves it) */
  wicketNow(how, batterId, fielderName, extra = {}) {
    if (this.cur.wicket) return;
    this.cur.wicket = Object.assign({ how, batter: batterId, fielder: fielderName, bowler: this.bowlerP.id }, extra);
    this.emit('wicket', { how, batter: batterId, fielder: fielderName, freeHit: this.inn.freeHit });
    coverage.mark('out:' + how);
    this.deadBall('wicket');
  },
  /** into play: the fielders plan their chase, the batters decide on running */
  goInPlay(hit, stumping) {
    this.setPhase('inPlay');
    this.planField();
    if (!stumping) this.planRunning(hit);
  }
});
K.Batting = Batting;
