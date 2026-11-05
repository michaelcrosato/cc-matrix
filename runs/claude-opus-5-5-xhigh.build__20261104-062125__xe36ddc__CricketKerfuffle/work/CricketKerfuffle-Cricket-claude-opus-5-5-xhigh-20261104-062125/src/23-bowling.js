/* ---- BOWLING. Between balls the human moves the pitch marker (stick, WASD or the mouse), cycles the field preset
 * (run: R1 / Space), switches over or round the wicket (back: L1 / Shift) and picks a delivery (shot / loft / block:
 * Cross Square Circle, J K L, clicks) or the special (special: Triangle / I / F, when Hype is full). The run-up
 * follows; in its last 0.7 s a needle sweeps the release meter: green is accurate and quick, amber and red scatter,
 * the far-right tip oversteps (a no-ball and a FREE HIT); no press auto-releases amber. For 0.25 s after release the
 * stick's sideways push adds swing or drift (aftertouch). CPU bowlers go through the same pipeline. ---- */
const METER_LEN = .7;
const Bowling = {
  humanSetup(m, I, dt) {
    const mv = I.move(), mouse = K.mouseAim && K.mouseAim(I);
    if (mouse && mouse.fresh) { m.marker[0] = clamp(mouse.x, -30, 30); m.marker[1] = clamp(mouse.y, 20, 230); }
    else { m.marker[0] = clamp(m.marker[0] + mv[0] * 70 * dt, -30, 30); m.marker[1] = clamp(m.marker[1] + mv[1] * 140 * dt, 20, 230); }
    if (I.pressed('run')) { const i = FIELD_ORDER.indexOf(m.fieldPreset); let n = FIELD_ORDER[(i + 1) % FIELD_ORDER.length]; if (n === 'spin' && m.bowlerFamily() !== 'spin') n = FIELD_ORDER[(i + 2) % FIELD_ORDER.length]; m.fieldPreset = n; m.placeField(false); m.emit('field', { preset: n }); }
    if (I.pressed('back')) { m.overRound = m.overRound === 'over' ? 'round' : 'over'; m.bowler.home = m.bowlerMark(); m.bowler.x = m.bowler.home[0]; m.emit('overround', { v: m.overRound }); }
    const pick = ['shot', 'loft', 'block'].findIndex(a => I.pressed(a));
    if (pick >= 0) { I.consume(['shot', 'loft', 'block'][pick]); m.startRunup(m.deliveryChoices[pick]); }
    else if (I.pressed('special') && m.specialReady(m.bowlSide, 'bowl')) { I.consume('special'); m.startRunup('special'); }
  },
  meterU(t) { const ph = (t * T('meterSpeed')) % 1; return ph < .5 ? ph * 2 : 2 - ph * 2; },
  /** a meter press at u: 'green' | 'amber' | 'red' | 'over' (the far-right tip) */
  grade(u, skill) {
    if (u >= .94) return 'over';
    const sweet = T('meterSweet') * (.7 + (skill || 5) * .05), d = Math.abs(u - .5);
    return d <= sweet / 2 ? 'green' : d <= sweet / 2 + .17 ? 'amber' : 'red';
  }
};
Object.assign(Match.prototype, {
  /** begin the run-up with a delivery id (or 'special') and, for forced ones, a spec { target, kmh, grade } */
  startRunup(id, spec) {
    if (this.phase !== 'setup') return;
    const fam = FAMILY[this.bowlerFamily()] || FAMILY.medium;
    let special = null;
    if (id === 'special') { special = this.bowlerSpecial(); this.useSpecial(this.bowlSide, special); id = SPECIALS[special].delivery.base || this.deliveryChoices[0]; }
    if (spec && spec.special) { special = spec.special; id = SPECIALS[special].delivery.base || id; this.emit('special', { id: special, side: this.bowlSide, kind: 'bowl' }); }
    this.deliveryId = id; this.special = special; this.forcedSpec = spec || null; if (spec) this.force.delivery = null;
    this.runupTime = fam.runup * (this.cfg.mode === 'attract' ? .8 : 1); this.runFrom = [this.bowler.x, this.bowler.y];
    this.meter = { t: 0, on: false, u: 0, grade: null, start: this.runupTime - METER_LEN };
    this.cur.delivery = id; this.cur.special = special;
    this.setPhase('runup');
    this.emit('ball:runup', { id, special });
    for (const a of this.fielders) if (a !== this.bowler && a !== this.keeper) a.walkIn = 0;
  },
  bowlerSpecial() { const p = this.bowlerP; return p.specBowl || (p.specField === 'chirp' ? null : null) || 'kerfuffleBall'; },
  phase_runup(dt) {
    const k = clamp(this.pt / this.runupTime, 0, 1), rel = this.releasePoint();
    // the bowler runs in (accelerating), the fielders walk in a few steps, the marker can still move at half speed
    const e = this.bowlerFamily() === 'machine' ? 0 : k * k;
    this.bowler.x = lerp(this.runFrom[0], rel.x, e); this.bowler.y = lerp(this.runFrom[1], rel.y + 4, e);
    this.bowler.vy = -(this.runFrom[1] - rel.y) / this.runupTime * 2 * k; this.bowler.vx = 0; this.bowler.facing = -Math.PI / 2;
    this.bowler.anim = this.pt >= this.runupTime - .16 ? { kind: 'deliver', t: this.pt - (this.runupTime - .16) } : { kind: 'runup', t: this.pt, k };
    for (const a of this.fielders) if (a !== this.bowler && a !== this.keeper) { const dx = this.striker.x - a.home[0], dy = this.striker.y - a.home[1], d = hyp(dx, dy) || 1, w = Math.min(14, d * .08) * k; a.x = a.home[0] + dx / d * w; a.y = a.home[1] + dy / d * w; a.anim = { kind: 'walkin', t: this.pt }; a.facing = Math.atan2(dy, dx); }
    const I = this.bowlerInput(), human = I && !this.cfg.cheat.autoBowl && !this.forcedSpec;
    if (human) { const mv = I.move(), mouse = K.mouseAim && K.mouseAim(I); if (mouse && mouse.fresh) { this.marker[0] = clamp(lerp(this.marker[0], mouse.x, .1), -30, 30); this.marker[1] = clamp(lerp(this.marker[1], mouse.y, .1), 20, 230); } else { this.marker[0] = clamp(this.marker[0] + mv[0] * 35 * dt, -30, 30); this.marker[1] = clamp(this.marker[1] + mv[1] * 70 * dt, 20, 230); } }
    // the meter: a press locks the grade (the needle stops); the ball leaves the hand when the bowler reaches the crease
    const M = this.meter;
    if (this.pt >= M.start && !M.locked) {
      M.on = true; M.t = this.pt - M.start; M.u = Bowling.meterU(M.t);
      if (this.special && !SPECIALS[this.special].noMeter) { M.grade = 'green'; M.locked = true; }
      else if (human) { const p = ['shot', 'loft', 'block', 'special'].find(a => I.pressed(a)); if (p) { I.consume(p); M.grade = Bowling.grade(M.u, this.bowlerP.bowl && this.bowlerP.bowl.skill); M.locked = true; this.emit('meter:lock', { grade: M.grade }); } }
      else if (this.cpuPlan && M.t >= this.cpuPlan.meterT) { M.grade = this.forcedSpec ? (this.forcedSpec.grade || 'green') : this.cpuPlan.grade; M.locked = true; }
    }
    if (this.pt >= this.runupTime) { M.grade = M.grade || (human ? 'amber' : (this.cpuPlan && this.cpuPlan.grade) || 'amber'); this.release(); }
  },
  releasePoint() {
    if (this.bowlerFamily() === 'machine') return { x: 0, y: G.BOWL_Y + 8, z: 28 };
    return { x: this.overRound === 'round' ? G.RELEASE_X : -G.RELEASE_X, y: G.CREASE_B, z: G.RELEASE_Z };
  },
  /** the ball leaves the hand: target, speed, swing, turn and seam from the delivery, the meter, the ground and the specials */
  release() {
    if (this.phase !== 'runup') return;
    const D = DELIVERIES[this.deliveryId] || DELIVERIES.dobber, spec = this.forcedSpec, sp = this.special ? SPECIALS[this.special].delivery : null;
    const M = this.meter, grade = (spec && spec.grade) || M.grade || 'amber', skill = (this.bowlerP.bowl && this.bowlerP.bowl.skill) || 5;
    const human = !!this.bowlerInput() && !this.cfg.cheat.autoBowl && !spec;
    const plan = this.cpuPlan || {};
    let tx, ty;
    if (spec && spec.target) { tx = spec.target[0]; ty = spec.target[1]; }
    else if (sp && sp.target) { tx = sp.target[0] * this.hand; ty = sp.target[1] + G.CREASE_S; }
    else if (human) { tx = this.marker[0]; ty = this.marker[1]; }
    else { tx = plan.tx; ty = plan.ty; }
    const scatter = { green: 2, amber: 10, red: 18, over: 10 }[grade] * (human || spec ? 1 : (this.isHuman(this.bowlSide) ? Tuning.raw('aiBowlAccuracy') : T('aiBowlAccuracy')) / 10);
    if (!spec && !(plan.straight && !human)) { tx += RNG.normal() * scatter * .6; ty += RNG.normal() * scatter; }
    ty = clamp(ty, D.len && D.len[0] < 6 ? G.CREASE_S - 4 : G.CREASE_S, 290);
    const pace = { green: 1.025, amber: .9, red: .8, over: .95 }[grade];
    let kmh = (spec && spec.kmh) || (sp && sp.kmh) || RNG.range(D.kmh[0], D.kmh[1]) * pace * (D.fam === 'spin' || D.fam === 'machine' ? 1 : this.ground.pitch.pace);
    if (this.special === 'kerfuffleBall') kmh *= 1.15;
    if (this.fire.bowl > 0) kmh *= 1.1;
    const rel = this.releasePoint(), v = kmhToUps(kmh, T('ballSpeed')) * (D.fam === 'spin' ? 1.1 : 1);
    const b = this.ball, overcast = this.weather === 'overcast' ? 1.5 : 1;
    const sol = Ball.solve(rel, tx, ty, v, this.env, D.bounce);
    Object.assign(b, Ball.make(), rel, sol, { phase: 'delivery', bounceK: D.bounce * (sp && sp.bounces ? .9 : 1), grip: D.fam === 'spin' ? .16 : .08 });
    let swing = (sp && sp.swing !== undefined ? sp.swing : D.swing) * (this.special === 'kerfuffleBall' ? 2 : 1);
    b.swingA = -swing * 60 * T('swing') * overcast;
    let turn = D.turn * this.ground.pitch.turn * T('spin');
    if (D.randTurn) turn *= RNG.play() < .5 ? -1 : 1;
    if (this.ground.pitch.rough && Math.abs(tx) > 10) turn *= this.ground.pitch.rough;
    b.turn = -turn * DEG;
    b.seamDev = RNG.normal() * T('seam') * this.ground.pitch.seam * D.seam * DEG * .5;
    if (D.wobble || (sp && sp.wobble)) { b.wobble = (sp && sp.wobble) || D.wobble; b.wobblePh = RNG.play() * TAU; }
    if (sp && sp.bounces) { b.multiBounce = true; b.extraTurn = -6 * DEG; this.flags.grandad = true; }
    if ((spec && spec.swing !== undefined)) b.swingA = -spec.swing * 60 * T('swing') * overcast;
    if ((spec && spec.straight) || (!spec && !human && plan.straight)) { b.swingA = 0; b.turn = 0; b.seamDev = 0; b.wobble = 0; }
    b.fx = this.special ? SPECIALS[this.special].fx : (this.fire.bowl > 0 ? 'fire' : D.fx || null);
    this.cur.kmh = Math.round(kmh); this.cur.target = [tx, ty]; this.cur.grade = null; this.cur.meter = grade; this.cur.fam = D.fam;
    if (grade === 'over') { this.cur.extras.nb = 1; this.cur.noBall = 'overstep'; }
    this.cur.hideSpeed = !!D.hideSpeed;
    this.aftertouch = .25; this.flightT = 0;
    if (this.special === 'triple') this.triple = [-1, 1].map(s => { const h = Object.assign(Ball.make(), rel, Ball.solve(rel, tx + s * 18, ty + s * 30, v * (1 + s * .05), this.env), { phase: 'delivery' }); return h; });
    if (this.special === 'vanish') this.vanish = { from: .4, to: .65, total: (G.CREASE_B - G.CREASE_S) / v };
    this.bowler.anim = { kind: 'deliver', t: .16 };
    Profile.data && kmh > (Profile.data.stats.fastest || 0) && this.isHuman(this.bowlSide) && Profile.stat('fastest', Math.round(kmh), true);
    this.setPhase('flight');
    this.emit('ball:released', { id: this.deliveryId, kmh: Math.round(kmh), special: this.special, grade, fam: D.fam });
    coverage.mark('del:' + D.fam);
    AI.planBatting(this);
  }
});
K.Bowling = Bowling;
