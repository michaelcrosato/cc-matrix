// ---- controllers: a virtual pad the CPU presses (VPad), the CPU's batting, bowling and captaincy (5.8), the actors'
// animation state between events, and the recorder for replays (5.11.3).
class VPad {
  constructor() { this._p = {}; this._d = {}; this._m = [0, 0]; this.aimTh = null; this.mg = null; }
  tap(a) { this._p[a] = true; }
  hold(a, on = true) { this._d[a] = on; }
  pressed(a) { return !!this._p[a]; }
  down(a) { return !!this._d[a] || !!this._p[a]; }
  move() { return this._m; }
  mouseGround() { return this.mg; }
  _tick() { this._p = {}; }
}
// a human player's input, wrapped so the match reads one interface (move, presses, the mouse's ground point)
class HPad {
  constructor(I, primary) { this.I = I; this.primary = primary; this.lastMouseT = -9; }
  pressed(a) { return this.I.pressed(a); }
  down(a) { return this.I.down(a); }
  move() { return this.I.move(); }
  groundDir(m) { return game && game.view ? game.view.screenDirToGround(m[0], m[1]) : m; }
  // the mouse aims while it moved in the last second (player one only)
  mouseGround() {
    if (!this.primary || !game || HEADLESS) return null;
    const I = this.I; if (!I.mouse || I.lastDevice !== 'mouse') return null;
    if (game.real - (this._mt || 0) > 1 && I.mouse.t === this._lastT) return null;
    if (I.mouse.t !== this._lastT) { this._lastT = I.mouse.t; this._mt = game.real; }
    const g = game.mouseGround(); if (!g) return null;
    return [g[0] - OX, g[1] - OY];
  }
  clickedEnd() {
    if (!this.primary || HEADLESS || !game.input.clicked()) return null;
    const g = game.mouseGround(); if (!g) return null; const x = g[0] - OX, y = g[1] - OY;
    return hyp(x, y) < 60 ? 0 : hyp(x, y - 320) < 60 ? 1 : null;
  }
}
Object.assign(Match.prototype, {
  ctlForRaw: Match.prototype.ctlFor,
  ctlFor(role) { const I = this.ctlForRaw(role); if (!I) return null; this._hp = this._hp || new Map(); if (!this._hp.has(I)) this._hp.set(I, new HPad(I, I === (game && game.input))); return this._hp.get(I); },
  // ---------------------------------------------------------------- the CPU's thinking, each step before the play
  _think(dt) {
    const s = this.state;
    if (s === 'setup' && !this.isHuman('bowl')) {
      if (!this.bowlPlan) this.bowlPlan = this.aiPlanBowl();
      if (this.st >= this.bowlPlan.wait) { const v = this.vpad('bowl'); this.marker.x = this.bowlPlan.tx; this.marker.y = this.bowlPlan.ty; v.tap(this.bowlPlan.btn); this.aiMeter = this.bowlPlan.meter; this.bowlPlan = null; }
    }
    if (s === 'runup' && !this.isHuman('bat')) {
      const v = this.vpad('bat');
      if (this.st < dt * 1.5 && this.specialReady(this.batT) && (this.ballsLeft() <= 6 || rp() < .2) && !this.cfg.script) v.tap('special');
      if (this.st < dt * 1.5 && this.batPlanCharge === undefined) { const p = this.striker().p, pb = this.bowlerP(); this.batPlanCharge = pb && pb.bowl && pb.bowl.fam === 'spin' && rp() < .12 * (p.style === 'slogger' ? 2 : 1) * (T('aiAggression') + .5) && !this.cfg.script; }
      if (this.batPlanCharge && this.st > this.runupDur * .55) { v.tap('charge'); this.batPlanCharge = false; }
    }
    if (s === 'flight' && !this.isHuman('bat')) {
      const v = this.vpad('bat');
      if (!this.batPlan) this.batPlan = this.aiPlanBat();
      const pl = this.batPlan;
      if (pl && !pl.done && pl.btn) { v.aimTh = pl.th; if (this.st >= pl.at) { v.tap(pl.btn); pl.done = true; } }
    }
    if (s !== 'flight') { this.batPlan = null; const v = this.vpads && this.vpads.bat; if (v) v.aimTh = null; }
    if (s !== 'runup' && s !== 'flight') this.batPlanCharge = undefined;
    // a human fielder's catch ring press is read from his pad
    if (this.catchQTE && this.isHuman('field')) { const pad = this.pad('field'); if (pad.pressed('shot') && this.catchQTE.press === null && this.t >= this.catchQTE.start - .2) this.catchQTE.press = this.t; }
  },
  aiPlanBowl() {
    const p = this.bowlerP(), dels = p.bowl.del, h = this.strikerHand(), sk = p.bowl.skill || 6;
    const sc = this.cfg.script && this.cfg.script.next ? this.cfg.script.next('bowl', this) : null;
    let k = sc && sc.del ? Math.max(0, dels.indexOf(sc.del)) : (() => { const r = rp(); return r < .55 ? 0 : r < .8 ? 1 : 2; })();
    if (sc && sc.del && !dels.includes(sc.del)) this.dev.forceDelivery = { del: sc.del };
    if (sc && sc.special) this.hype[this.bowlT] = 100;
    if (!sc && this.ballsLeft() <= 3 && dels.includes('yorker') && rp() < .5) k = dels.indexOf('yorker');
    const d = DELIVERIES[dels[k]];
    const special = (sc && sc.special) || (!sc && this.specialReady(this.bowlT) && (this.ballsLeft() <= 6 || rp() < .3) && difficulty !== 'village');
    let lineOff = d.fam === 'spin' ? (d.turn > 0 ? -1 + rp() * 4 : 3 + rp() * 4) : 3 + rp() * 5;
    lineOff -= d.swing * 11 * T('swing') * (this.weather === 'overcast' ? 1.5 : 1);   // aim inside the swing
    if (d.turn) lineOff -= d.turn * .6 * this.env.turn;
    let len = d.len[0] + rp() * (d.len[1] - d.len[0]);
    const acc = T('aiBowlAccuracy') * (1.4 - sk * .07);
    let tx = -h * lineOff + gauss(rp) * acc * .3, ty = PITCH.crease + len + gauss(rp) * acc;
    if (sc && sc.target) { tx = sc.target[0] * h; ty = sc.target[1]; }
    const r = rp(), gp = .35 + sk * .055, grade = sc && sc.grade ? sc.grade : r < .015 ? 'over' : r < gp ? 'green' : r < gp + (1 - gp) * .75 ? 'amber' : 'red';
    const wait = this.cfg.mode === 'hub' || this.cfg.mode === 'showdown' ? .5 : this.cfg.mode === 'attract' ? .3 : this.cfg.mode === 'nets' ? 1.4 : .6 + rp() * .6;
    return { btn: special ? 'special' : ['shot', 'loft', 'block'][k], tx, ty: clamp(ty, 22, 240), wait, meter: { at: .2 + rp() * .4, grade } };
  },
  aiPlanBat() {
    const b = this.ball, h = this.strikerHand(), p = this.striker().p, env = this.env;
    const sc = this.cfg.script && this.cfg.script.next ? this.cfg.script.next('bat', this) : null;
    const cy = this.contactY(), a = arrival(b, cy.y, env);
    if (!a) return null;
    const line = -h * a.x, z = a.z, band = cy.band;
    const st = arrival(b, 0, env), onStumps = st && Math.abs(st.x) < STUMPS.hw + 1 && st.z < STUMPS.h + 1;
    let agg = T('aiAggression') + (p.style === 'slogger' ? .3 : 0) + ((p.pow || 5) - 5) * .03;
    const need = this.need(), left = this.ballsLeft();
    if (need !== null) { const rr = need / Math.max(1, left) * 6; agg += (rr - 9) / 9; if (need <= 0) agg = 0; }
    else agg += (this.I.legal / (this.I.overs * 6)) * .3;
    agg -= .15 * this.I.wkts / Math.max(1, this.I.wmax);
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') agg += .3;
    agg = clamp(agg, need !== null && need <= 0 ? 0 : .25, 1);
    let btn = null, th = 0;
    if (sc) { btn = sc.btn === 'leave' ? null : sc.btn; th = (sc.th || 0) * DEG; }
    else if (line > 13 && !onStumps) { if (band === 'short' && rp() < agg) { btn = 'shot'; th = 100 * DEG; } else if (band === 'full' && rp() < agg * .7) { btn = 'shot'; th = 65 * DEG; } }
    else if (band === 'short') { if (z > 28) { if (rp() < agg * .8) { btn = 'loft'; th = -80 * DEG; } } else { btn = rp() < agg * .5 ? 'loft' : 'shot'; th = (line > 6 ? 100 : -75) * DEG; } }
    else if (band === 'yorker') { btn = agg > .7 && p.style === 'slogger' ? 'loft' : 'block'; th = 0; if (agg > .5 && btn === 'block') { btn = 'shot'; th = -20 * DEG; } }
    else if (band === 'full') { btn = rp() < agg * .75 ? 'loft' : 'shot'; th = this.aiGap(btn, line); }
    else { if (onStumps || line > 2) btn = rp() < .35 + agg * .8 ? (rp() < agg * .5 ? 'loft' : 'shot') : 'block'; else btn = rp() < .5 + agg * .4 ? 'shot' : null; th = this.aiGap(btn || 'shot', line); }
    // a steep chase: swing at nearly everything in reach
    if (!btn && !sc && need !== null && need / Math.max(1, left) * 6 > 10 && line < 16) { btn = band === 'short' ? 'loft' : rp() < .7 ? 'loft' : 'shot'; th = band === 'short' ? -80 * DEG : this.aiGap(btn, line); }
    if (!btn) return { btn: null };
    const shot = this.resolveShot(btn, th, band, line, z);
    // out of the shot's reach: defend it if it threatens the stumps, else let it go
    if (this._zoneMiss(shot, line, z) > 6 && !sc) { if (onStumps) { btn = 'block'; } else return { btn: null }; }
    const sh2 = this.resolveShot(btn, th, band, line, z);
    // the autopilot playing for a human side (dev Auto-bat, the campaign bot) plays like a competent person, not the CPU at this difficulty
    let sig = (this.isHumanSide(this.batT) ? TUNE.aiBatSkill * .5 : T('aiBatSkill')) / 1000 * (this.effects.aiK || 1) * (13 - (p.tech || 5)) / 8 * (DELIVERIES[this.del.id].fam === 'spin' && (p.tech || 5) < 5 ? 1.2 : 1);
    if (this.effects.vanish) sig *= 1.3;
    let err = gauss(rp) * sig;
    if (sc) err = { PERFECT: 0, GOOD: .06, EARLY: -.12, LATE: .12, MISS: -.3 }[sc.grade || 'PERFECT'] || 0;
    if (this.cfg.cheat && this.cfg.cheat.perfect && this.cheatSide === this.batT) err = 0;
    return { btn, th, at: Math.max(0, a.t - sh2.at + err), done: false };
  },
  // the direction with the most room: ground shots into the widest gap, lofted ones over the fewest deep fielders
  aiGap(btn, line) {
    const h = this.strikerHand(), base = this.naturalDir(btn, line > 9 ? 'good' : 'full', line) / DEG;
    let best = base, bs = -1e9;
    for (let d = -60; d <= 60; d += 10) {
      const th = (base + d) * DEG; let sc = -Math.abs(d) * .3;
      for (const f of this.fielders) {
        if (f.role === 'keeper' || f.role === 'bowler') continue;
        const dist = hyp(f.x, f.y), fa = angOf(f.x, f.y, h), da = Math.abs(wrapA(fa - th)) / DEG;
        if (btn === 'loft') { if (dist > 250 && da < 25) sc -= 40; }
        else if (dist < 330 && da < 30) sc -= (30 - da) * 2;
      }
      if (sc > bs) { bs = sc; best = base + d; }
    }
    return best * DEG;
  },
  aiPickBowler(list) {
    const last = this.I.lastBowler ? this.squads[this.bowlT].find(p => p.id === this.I.lastBowler) : null;
    let best = list[0], bs = -1e9;
    for (const p of list) {
      const c = this.bowlCard(p.id); let s = (p.bowl.skill || 5) - c.overs * 3 + rp() * 2;
      if (last && last.bowl && last.bowl.fam !== p.bowl.fam) s += 1.5;
      if (p.bsp) s += .5;
      if (p.bowl.fam === 'spin' && this.env.turn > 1.2) s += 2;
      if (p.bowl.fam === 'swing' && this.weather === 'overcast') s += 2;
      if (s > bs) { bs = s; best = p; }
    }
    return best;
  },
  aiPickField() {
    const p = this.bowlerP(), left = this.ballsLeft();
    if (p && p.bowl && p.bowl.fam === 'spin') return 'spin';
    if (left <= 6 && this.I.overs > 1) return 'defensive';
    const need = this.need();
    if (need !== null && need > left * 1.8) return 'attacking';
    return rp() < .35 ? 'attacking' : 'balanced';
  },
  // ---------------------------------------------------------------- the actors between events
  _actors(dt) {
    const all = [...this.batters, ...this.fielders, ...this.umps];
    for (const a of all) { a.animT += dt; if (a.phantom > 0) a.phantom -= dt; }
    const s = this.state, bw = this.bowler(), b0 = this.batters[0], b1 = this.batters[1];
    if (!bw) return;
    if (s === 'runup') {
      // the non-striker backs up; the fielders walk in a few steps, crouched
      b1.y = Math.max(300, 318 - this.st * 14); b1.anim = 'backup';
      for (const f of this.fielders) if (f.role === 'field') { const d = hyp(f.x, f.y); if (d > 40) { f.x -= f.x / d * 12 * dt; f.y -= f.y / d * 12 * dt; } f.anim = 'walkin'; }
    }
    if (s === 'flight' || s === 'inPlay' || s === 'dead') {
      // the follow-through: down the pitch and off to the side
      if (bw.anim === 'deliver' && !bw.hasBall && bw.state !== 'chase' && bw.state !== 'stumps') { const u = Math.min(1, bw.animT / .9); bw.y = 304 - u * 26; bw.x += (this.overRound === 'over' ? 1 : -1) * 18 * dt * (1 - u); }
    }
    if (s === 'flight') { const k = this.keeper(); if (k) { const pr = this._kpPlan || (this._kpPlan = arrival(this.ball, k.y + 2, this.env)); if (pr) k.x += clamp(pr.x - k.x, -140 * dt, 140 * dt); } }
    else this._kpPlan = null;
    if (s === 'dead') {
      const r = this.ballRec;
      if (r && r.wicket && this.st < dt * 1.5) {
        for (const f of this.fielders) { if (f.role !== 'keeper' || r.wicket.how !== 'bowled') { f.anim = 'cheer'; f.animT = rp() * .3; f.expr = 'smile'; } }
        const outB = this.batters.find(bt => bt.card === r.wicket.card) || b0; outB.anim = 'dejected'; outB.animT = 0; outB.expr = 'wince'; outB.out = true;
        bw.anim = 'appealWin'; bw.animT = 0; bw.expr = 'shout';
      }
      if (r && r.boundary && this.st < dt * 1.5) { b0.anim = 'celebrate'; b0.animT = 0; b0.expr = 'smile'; }
      if (this.appeal && this.st < dt * 1.5) { bw.anim = 'appeal'; bw.animT = 0; bw.expr = 'shout'; const k = this.keeper(); if (k) { k.anim = 'appeal'; k.animT = 0; k.expr = 'shout'; } }
    }
    if (s === 'flight' && b0.anim === 'swing' && b0.animT > .75) b0.anim = 'stanceIdle';
    if (s !== 'flight' && s !== 'inPlay' && s !== 'dead' && b0.anim === 'swing' && b0.animT > .75) b0.anim = 'stance';
  },
  // ---------------------------------------------------------------- the recorder: the last 10 s at 60 Hz
  _record(dt) {
    this._recT = (this._recT || 0) + dt;
    if (this._recT < 1 / 60 - 1e-6) return; this._recT = 0;
    if (this.replay) return;
    const fr = { t: this.t, ball: [this.ball.x, this.ball.y, this.ball.z, this.ball.phase, this.ball.fx], a: [] };
    for (const a of [...this.batters, ...this.fielders, ...this.umps]) fr.a.push([a.x, a.y, a.z, a.facing, a.anim, a.animT, a.sw, a.signal, a.expr, a.dive, a.hasBall]);
    this.rec = this.rec || []; this.rec.push(fr); if (this.rec.length > 600) this.rec.shift();
  }
});
