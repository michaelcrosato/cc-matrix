// ---- forced outcomes: dev mode's "force the next outcome" and the attract mode's showreel both play through this. A
// forced ball runs on the real machinery: the delivery is aimed, the shot is played at the ideal moment, then the ball
// is sent where the outcome needs it (a six over the rope, a catch into a fielder's hands, a direct hit).
const FORCE_LIST = ['six', 'four', 'one', 'dot', 'edge', 'bowled', 'caught', 'lbw', 'runout', 'stumped'];
Object.assign(Match.prototype, {
  forceNext(kind, o = {}) { this.forceQ = kind; this.forceOpts = o; },
  _forceRelease() {
    this.forced = this.forceQ || null; this.forcedOpts = this.forceOpts || {}; this.forceQ = null; this.forceOpts = null; this.forcedLbw = false; this.forceRuns = 0;
    const f = this.forced, h = this.strikerHand(), b0 = this.batters[0];
    if (!f) return;
    cover('forced:' + f);
    const aimAt = (xs, ty) => { this.marker.x = xs + ((this.overRound === 'over' ? 8 : -8) - xs) * (ty / 300); this.marker.y = ty; };
    if (f === 'bowled') aimAt(-2 * h, 45);
    if (f === 'lbw') { aimAt(2 * h, 42); this.forcedLbw = true; }
    if (f === 'stumped') { this.keeperUp = true; const k = this.keeper(); if (k) { k.y = -26; k.x = -6 * h; } aimAt(-7 * h, 70); }
    if (f === 'runout') this.forceRuns = 3;
    if (f === 'one') this.forceRuns = 1;
  },
  _forcePost(b) {
    const f = this.forced; if (!f) return;
    if (f === 'bowled' || f === 'lbw' || f === 'stumped') { b.swingX = 0; b.turnRad = 0; b.seamDev = 0; b.wob = 0; this.noBall = false; }
    const b0 = this.batters[0];
    if (f === 'stumped') { b0.charged = .001; b0.anim = 'charge'; b0.animT = 0; } else if (b0.charged) { b0.charged = 0; b0.y = 14; b0.anim = 'stance'; }
  },
  // the batter's shot for a forced ball: played at the ideal moment
  _forceFlight() {
    const f = this.forced; if (!f || this.swing) return;
    const btn = { six: 'loft', caught: 'loft', four: 'shot', one: 'shot', runout: 'shot', dot: 'block', edge: 'shot', stumped: 'block' }[f];
    if (!btn) return;
    const cy = this.contactY(), a = arrival(this.ball, cy.y, this.env), at = SHOT.straightDrive.at;
    if (!a) return;
    if (f === 'stumped') { if (a.t <= .02) { this._forcing = true; this._press('block'); this._forcing = false; if (this.swing) { this.swing.grade = 'MISS'; } } return; }
    if (a.t <= at + 1 / 240) { const save = this.dev.forceOutcome; this.dev.forceOutcome = 'forced'; this._press(btn); this.dev.forceOutcome = save; }
  },
  _forceContact() {
    const f = this.forced, b = this.ball, h = this.strikerHand(), b0 = this.batters[0], o = this.forcedOpts || {};
    if (!f || !this.contact) return;
    const g = T('gravity');
    const lob = (tx, ty, tz, vh) => { const D = Math.max(1, hyp(tx - b.x, ty - b.y)), t = D / vh * 1.02; b.vx = (tx - b.x) / t; b.vy = (ty - b.y) / t; b.vz = (tz - b.z + .5 * g * t * t) / t; };
    const gapDir = () => { const th = this.aiGap(f === 'six' ? 'loft' : 'shot', 0); return o.th !== undefined ? o.th * DEG : th; };
    if (o.target) { const tg = this.g.targets.find(t => t.id === o.target); if (tg) { const at = this.targetPos(tg), k = T('boundaryScale'); lob(at[0] * k, at[1] * k, at[2], 360); b.fx = b.fx || 'fire'; return; } }
    if (f === 'six') { const w = dirOf(gapDir(), h), D = this.boundaryDist(w[0], w[1]) + 140; lob(w[0] * D, w[1] * D, 0, 340); }
    if (f === 'four') { const w = dirOf(gapDir(), h); b.vx = w[0] * 560; b.vy = w[1] * 560; b.vz = 6; this.forceUnstoppable = true; }
    if (f === 'one') { const deep = this.fielders.filter(q => q.role === 'field').sort((p, q) => hyp(q.x, q.y) - hyp(p.x, p.y))[0]; if (deep) { const d = hyp(deep.x, deep.y), k = (d - 40) / d; lob(deep.x * k, deep.y * k, 0, 420); b.vz = 0; b.z = .5; b.rollK = .35; b.passR = d - 120; } }
    if (f === 'runout') { const fs = this.fielders.filter(q => q.role === 'field').sort((p, q) => Math.abs(hyp(p.x, p.y) - 190) - Math.abs(hyp(q.x, q.y) - 190)); const t = fs[0]; if (t) { lob(t.x * .85, t.y * .85, 0, 210); b.vz = 0; b.z = .5; b.rollK = .2; } }
    if (f === 'caught') { const fs = this.fielders.filter(q => q.role === 'field' && hyp(q.x, q.y) < 420).sort((p, q) => hyp(q.x, q.y) - hyp(p.x, p.y)); const t = fs[0]; if (t) { lob(t.x, t.y, 20, 240); this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); } }
    if (f === 'edge') { const sl = this.fielders.find(q => q.spot === 'slip') || this.keeper(); lob(sl.x, sl.y, 14, 300); this.contact.kind = 'thin'; this.contact.edge = true; emit('ball:edge', { kind: 'thin' }); this.sideFlags = Object.assign(this.sideFlags || {}, { guaranteedCatch: this.bowlT }); }
    if (f === 'dot') { b.vx *= .3; b.vy *= .3; b.vz = 0; }
  },
  _forceThrow(f, end) {
    if (this.forced !== 'runout') return null;
    const bt = this.batters.filter(x => x.target !== null).sort((p, q) => Math.abs(q.y - (q.target ? 320 : 0)) - Math.abs(p.y - (p.target ? 320 : 0)))[0];
    return bt ? bt.target : end;
  }
});
// hook the forcing into the director without touching its flow
(() => {
  const P = Match.prototype, rel = P._release, fl = P._flight, ct = P._contact, th = P._throw, pr = P._press, run = P._aiRun;
  P._release = function (grade) { this._forceRelease(); if (this.forced) grade = 'green'; rel.call(this, grade); this._forcePost(this.ball); };
  P._flight = function (dt) { this._forceFlight(); return fl.call(this, dt); };
  P._press = function (btn) { if ((this.forced === 'bowled' || this.forced === 'lbw' || (this.forced === 'stumped' && !this._forcing)) && !this.swing) return; return pr.call(this, btn); };
  P._contact = function (sw) { ct.call(this, sw); this._forceContact(); if (this.forced === 'four' && this.contact) this.ball.unstoppable = true; };
  P._throw = function (f, end) {
    const e = this._forceThrow(f, end);
    if (e === null || e === undefined) return th.call(this, f, end);
    th.call(this, f, e);
    const b = this.ball, sy = e ? 320 : 0, sol = solveThrow(f.x, f.y, 18, 0, sy, 6, T('throwSpeed')); b.vx = sol.vx; b.vy = sol.vy; b.vz = sol.vz;
  };
  P._aiRun = function () {
    if (this.forceRuns && !this.boundaryHit) {
      const [s, n] = this.batters, idle = s.target === null && n.target === null && s.end !== n.end;
      if (idle && this.runs < this.forceRuns && this.t - this.runStart > .25 && this.t - this.lastRunT > .1) this._call('both', 'yes');
      return;
    }
    return run.call(this);
  };
  const dead = P._enterDead;
  P._enterDead = function (why) { const r = dead.call(this, why); if (this.forced) { this.forced = null; this.forceUnstoppable = false; } return r; };
})();
