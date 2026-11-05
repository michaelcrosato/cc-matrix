/* ---- BOUT: the rules (KC.Bout), the referee and judges (KC.Referee), the fight HUD ----
 * Phases: intro rei card ready hajime fight yame award reset roundEnd time hantei matchEnd over. Deterministic: no
 * Math.random; the hantei's noise comes from the bout's own seeded stream. Events on bout.on(name, fn): call point
 * block whiff aiuchi roundEnd matchEnd phase bonus. */
const PH_T = { intro: 1.2, rei: 1.1, card: .9, ready: .45, hajime: .6, yame: .9, award: 1.3, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.6 };
const PHASES = ['intro', 'rei', 'card', 'ready', 'hajime', 'fight', 'yame', 'award', 'reset', 'roundEnd', 'time', 'hantei', 'matchEnd', 'over', 'spar'];

class Referee {
  constructor() {
    this.rig = new E.Humanoid({ size: 1.55, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', stubble: '#e8e8e8',
      colors: { skin: '#e8b898', hair: '#d8d8d8', cloth: '#f4f4f0', coat: '#1e2a52', pants: '#6a6a72', boot: '#1a1a20', belt: '#1e2a52', trim: '#c8302a', glove: '#e8b898' } });
    this.judges = [0, 1].map(i => new E.Humanoid({ size: 1.45, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e8c0a0', hair: '#3a3030', cloth: '#f4f4f0', coat: '#2a2a3a', pants: '#4a4a52', boot: '#1a1a20', glove: '#e8c0a0' } }));
    this.x = 200; this.sig = null; this.side = 0; this.t = 0; this.flags = [0, 0, 0]; this.votes = null;
    const base = this.rig.solvePose, self = this; this.rig.solvePose = function () { base.call(this); self._post(this.J); };
    this.judges.forEach((j, i) => { const b = j.solvePose; j.solvePose = function () { b.call(this); self._postJudge(this.J, i); }; });
  }
  signal(sig, side = 0) { if (sig !== this.sig || side !== this.side) { this.sig = sig; this.side = side; this.t = 0; if (sig) game.audio.sfx('flagSnap', { vol: .5 }); } }
  // the referee faces the camera; +r is his right (screen left in side view), so the white side (left) is +r
  _post(J) {
    const k = clamp(this.t / .2, 0, 1), s = this.side ? -1 : 1, sh = [J.shR, J.shL];
    const arm = (h, e, to) => { const S = h === 'R' ? J.shR : J.shL; J['elbow' + h] = [lerp(J['elbow' + h][0], (S[0] + to[0]) / 2, k), lerp(J['elbow' + h][1], (S[1] + to[1]) / 2, k), lerp(J['elbow' + h][2], (S[2] + to[2]) / 2, k)]; J['hand' + h] = [lerp(J['hand' + h][0], to[0], k), lerp(J['hand' + h][1], to[1], k), lerp(J['hand' + h][2], to[2], k)]; };
    const sideArm = s > 0 ? 'R' : 'L', S0 = s > 0 ? J.shR : J.shL;
    switch (this.sig) {
      case 'hajime': { const d = clamp(this.t / .35, 0, 1); arm('R', 0, [3, J.shR[1] + 1, J.shR[2] + 6 - 14 * d]); arm('L', 0, [3, J.shL[1] - 1, J.shL[2] + 6 - 14 * d]); break; }
      case 'yame': arm('R', 0, [6, J.shR[1] - 2, J.shR[2] + 4]); break;
      case 'half': arm(sideArm, 0, [1, S0[1] + s * 8, S0[2] - 5]); break;
      case 'full': case 'winner': arm(sideArm, 0, [1, S0[1] + s * 5, S0[2] + 8]); break;
      case 'aiuchi': { const w = Math.sin(this.t * 14) * .8; arm('R', 0, [5, 1 + w, J.shR[2] - 3]); arm('L', 0, [5, -1 - w, J.shL[2] - 3]); break; }
      case 'hantei': arm('R', 0, [4, J.shR[1] + 3, J.shR[2] + 2]); break;
      case 'bow': rotJ(J, UPPER, J.hipC, .5 * Math.sin(clamp(this.t / .9, 0, 1) * Math.PI)); break;
    }
  }
  _postJudge(J, i) { const up = this.flags[i]; if (up) { const s = up === 1 ? 1 : -1; const h = s > 0 ? 'R' : 'L', S0 = J['sh' + h]; J['elbow' + h] = [S0[0] + 1, S0[1] + s * 2, S0[2] + 3]; J['hand' + h] = [S0[0] + 1, S0[1] + s * 3, S0[2] + 8]; } }
  update(dt, cx) { this.t += dt; this.x = lerp(this.x, cx, Math.min(1, dt * 3)); this.rig.update(dt, { x: this.x, y: 14, z: 0, facing: Math.PI / 2, expr: this.sig === 'yame' || this.sig === 'full' ? 'shout' : null }); this.judges.forEach((j, i) => j.update(dt, { x: i ? 384 : 16, y: 34, z: 0, facing: Math.PI / 2, pose: this.flags[i] ? null : 'hips' })); }
  draw(r) {
    r.shadow(this.x, 14, 9, .35);
    r.actor(this.x, 14, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig });
    this.judges.forEach((j, i) => {
      const x = i ? 384 : 16; r.shadow(x, 34, 7, .3);
      r.actor(x, 34, 0, (g, ox, oy) => {
        j.draw(g, ox, oy, r.view);
        // two flags: red in the right hand, white in the left (the raised one waves)
        for (const [h, c] of [['R', '#e83a2a'], ['L', '#f8f8f0']]) {
          const hp = j.worldOffset(j.J['hand' + h]), a = r.w(x + hp[0], 34 + hp[1], hp[2]), b = r.w(x, 34, 0), sx = Math.round(ox + a[0] - b[0]), sy = Math.round(oy + a[1] - b[1]);
          const raised = this.flags[i] === (h === 'R' ? 1 : 2), wav = Math.round(Math.sin(this.t * 12 + i) * (raised ? 2 : 0));
          px.rect(g, sx, sy - 9, 1, 10, '#8a6a40'); px.rect(g, sx + 1, sy - 9 + wav * 0, 6, 4 + (wav > 0 ? 1 : 0), c); px.rect(g, sx + 1, sy - 5, 6, 1, E.shade(c, -.25));
        }
      }, { key: j });
    });
  }
  head() { const h = this.rig.worldOffset(this.rig.J.head); return [this.x + h[0], 14 + h[1], h[2]]; }
}
KC.Referee = Referee;

class Bout {
  /** o: { fighters: [white, red], ctrl: [fn(f, foe) -> intent, ...], mode, roundsToWin, pointsToWin, clock, seed, intro, spar, names } */
  constructor(o) {
    this.o = o; this.f = o.fighters; this.ctrl = o.ctrl || [null, null]; this.ref = o.spar ? null : new Referee(); this.arena = [0, 400]; this.marks = o.marks || [150, 250];
    this.ev = {}; this.rng = U.rng(o.seed || 1); this.phase = o.spar ? 'spar' : o.intro === false ? 'card' : 'intro'; this.pt = 0; this.round = 1; this.points = [0, 0]; this.roundWins = [0, 0];
    this.clock = this.clockMax(); this.call = null; this.calls = []; this.stopT = 0; this.pending = null; this.lastPoint = null; this.winner = -1; this.matchWinner = -1;
    this.conceded = [0, 0]; this.roundStats = [this.blankStats(), this.blankStats()]; this.fightT = 0; this.lastScorer = -1; this.popups = []; this.slow = 0; this.steps = 0; this.time = 0;
    if (this.phase === 'intro') { this.f[0].reset(-20); this.f[1].reset(420); this.f[0].toMark(this.marks[0]); this.f[1].toMark(this.marks[1]); }
    else { this.f[0].reset(this.marks[0]); this.f[1].reset(this.marks[1]); }
    this.f.forEach((f, i) => { f.face = i ? -1 : 1; f.bout = this; });
    this.enterPhase(this.phase);
  }
  blankStats() { return { techPts: 0, attempts: 0, blocks: 0 }; }
  get roundsToWin() { return this.o.roundsToWin || TUNE.roundsToWin; }
  get pointsToWin() { return this.o.pointsToWin || TUNE.pointsToWin; }
  clockMax() { return this.o.clock || TUNE.clock; }
  on(e, fn) { (this.ev[e] = this.ev[e] || []).push(fn); return this; }
  emit(e, d) { for (const fn of this.ev[e] || []) try { fn(d, this); } catch (err) { game.fail('bout ' + e, err); } }
  pace(k) { return k * TUNE.refPace; }
  say(id, side, o = {}) {
    const text = id === 'raw' ? o.text : KC.calls(id); this.call = { id, text, t: 0, side };
    const dur = KC.Voice.speak(text, 'genkotsu', { call: id, reverb: this.o.stage === 'stadium' });
    this.calls.push(id); if (this.calls.length > 60) this.calls.shift(); this.emit('call', { id, text, side }); return dur;
  }
  enterPhase(p) {
    this.phase = p; this.pt = 0; const F = this.f, R = this.ref; this.emit('phase', p);
    if (p === 'intro') { R && R.signal(null); }
    if (p === 'rei') { F.forEach(f => f.setPose('bow')); R && R.signal('bow'); this.say('bow'); }
    if (p === 'card') { F.forEach((f, i) => { if (f.st !== 'auto') f.toMark(this.marks[i]); }); game.audio.sfx('gong'); this.cardText = this.isDeciding() ? KC.calls('decide') : 'ROUND ' + this.round; if (this.isDeciding()) this.say('decide'); R && R.signal(null); }
    if (p === 'ready') { F.forEach((f, i) => { f.reset(this.marks[i]); f.face = i ? -1 : 1; f.setPose('yoi'); }); R && R.signal(null); if (this.mp()) this.say('matchPoint'); }
    if (p === 'hajime') { R && R.signal('hajime'); this.say('begin'); }
    if (p === 'fight') { F.forEach(f => { f.st = 'idle'; f.poseName = null; f.frozen = false; }); this.fightT = 0; }
    if (p === 'yame') { R && R.signal('yame'); this.say('stop'); F.forEach(f => { f.frozen = true; }); }
    if (p === 'award') {
      const lp = this.lastPoint; if (!lp) return;
      if (lp.aiuchi) { R && R.signal('aiuchi'); this.say('aiuchi'); }
      else { R && R.signal(lp.full ? 'full' : 'half', lp.side); const d = this.say(lp.side ? 'red' : 'white', lp.side); this.later = { t: Math.min(.5, d), fn: () => { if (this.phase === 'award') this.say(lp.full ? 'full' : 'half', lp.side); } }; }
    }
    if (p === 'reset') { F.forEach((f, i) => f.toMark(this.marks[i])); R && R.signal(null); }
    if (p === 'time') { F.forEach(f => { f.frozen = true; }); R && R.signal('yame'); this.say('time'); }
    if (p === 'hantei') { R && R.signal('hantei'); this.say('judges'); game.audio.sfx('whistle'); this.votes = this.judge(); R && (R.flags = [0, 0, 0]); }
    if (p === 'roundEnd') {
      const w = this.winner; this.roundWins[w]++;
      F[w].setPose('win'); F[1 - w].setPose('lose'); R && R.signal('winner', w); this.say(w ? 'redWins' : 'whiteWins', w);
      const bonus = Math.max(0, Math.floor(this.clock)) * 100; this.emit('roundEnd', { winner: w, round: this.round, bonus, points: this.points.slice() });
    }
    if (p === 'matchEnd') { F.forEach((f, i) => f.toMark(this.marks[i])); R && R.signal(null); }
    if (p === 'over') { this.emit('matchEnd', { winner: this.matchWinner, roundWins: this.roundWins.slice(), perfect: this.conceded[this.matchWinner] === 0, stats: this.f.map(f => f.stats) }); }
  }
  isDeciding() { return this.roundsToWin > 1 && this.roundWins[0] === this.roundsToWin - 1 && this.roundWins[1] === this.roundsToWin - 1; }
  mp() { return this.points.some(p => p >= this.pointsToWin - .5) && this.pointsToWin > .5; }
  judge() {
    const sc = [0, 1].map(i => this.roundStats[i].techPts + 60 * this.roundStats[i].attempts + 40 * this.roundStats[i].blocks);
    const votes = [0, 1, 2].map(() => { const a = sc[0] + (this.rng() * 240 - 120), b = sc[1] + (this.rng() * 240 - 120); return a > b ? 0 : b > a ? 1 : this.lastScorer >= 0 ? this.lastScorer : 0; });
    return votes;
  }
  intent(i) { const c = this.ctrl[i]; if (!c) return KC.NEUTRAL; try { return c(this.f[i], this.f[1 - i], this) || KC.NEUTRAL; } catch (e) { game.fail('controller', e); return KC.NEUTRAL; } }
  canControl() { return this.phase === 'fight' || this.phase === 'spar' || (this.phase === 'hajime' && this.pt >= this.pace(.35)); }
  update(dt) {
    if (this.puppet) { this.presentUpdate(dt); return; }
    this.time += dt; this.pt += dt; this.steps++; this.dt = dt; const F = this.f;
    if (this.call) this.call.t += dt;
    if (this.later) { this.later.t -= dt; if (this.later.t <= 0) { const f = this.later.fn; this.later = null; f(); } }
    if (this.slow > 0) { this.slow -= dt; }
    if (this.stopT > 0) { this.stopT -= dt; this.presentUpdate(dt); return; }   // the bout's own hit-stop (never game.freeze: it would stall networking)
    if (this.director) this.director(this, dt);
    const ctl = this.canControl();
    if (ctl && this.phase === 'hajime') { this.enterPhase('fight'); }
    const ints = [0, 1].map(i => ctl ? this.intent(i) : KC.NEUTRAL);
    if (ctl) { if (DEV.freezeCpu && this.o.cpu) this.o.cpu.forEach((c, i) => { if (c) ints[i] = KC.NEUTRAL; }); F.forEach((f, i) => f.control(ints[i], F[1 - i], dt)); }
    F.forEach((f, i) => f.step(dt, F[1 - i], this.arena));
    this.push();
    if (this.phase === 'fight' || this.phase === 'spar') this.detect();
    if (this.pending) { if (--this.pending.steps <= 0) this.resolve(); }
    this.phaseUpdate(dt);
    this.presentUpdate(dt);
  }
  presentUpdate(dt) { const F = this.f; F.forEach(f => f.update(dt)); if (this.ref) this.ref.update(dt, (F[0].x + F[1].x) / 2); for (const p of this.popups) p.t += dt; this.popups = this.popups.filter(p => p.t < 1.6); }
  push() {
    const [a, b] = this.f; if (a.z > 8 || b.z > 8 || a.st === 'auto' || b.st === 'auto') return;   // (walking back to the marks they pass each other)
    const need = (a.w + b.w) / 2, d = b.x - a.x, ad = Math.abs(d);
    if (ad < need) {
      const s = Math.sign(d) || (a.face > 0 ? 1 : -1), over = need - ad; let da = -s * over / 2, db = s * over / 2;
      const lo = this.arena[0], hi = this.arena[1];
      if (a.x + da < lo + a.w / 2 || a.x + da > hi - a.w / 2) { db += da - clamp(a.x + da, lo + a.w / 2, hi - a.w / 2) + a.x; da = clamp(a.x + da, lo + a.w / 2, hi - a.w / 2) - a.x; }
      if (b.x + db < lo + b.w / 2 || b.x + db > hi - b.w / 2) { da -= (b.x + db) - clamp(b.x + db, lo + b.w / 2, hi - b.w / 2); db = clamp(b.x + db, lo + b.w / 2, hi - b.w / 2) - b.x; }
      a.x += da; b.x += db;
    }
  }
  /** can a's active technique hit b now? null | { block } | { hit info } */
  check(a, b) {
    const t = a.T; if (!t || !t.pts || a.ph !== 'a' || a.hitDone) return null;
    if (!b.hittable() || (DEV.invincible && b.side === 0 && this.o.cpu && this.o.cpu[a.side])) return null;
    const dir = Math.sign(b.x - a.x) || a.techFace; if (dir !== a.techFace) return null;   // the foe is behind (crossed over)
    const gap = a.gapTo(b), [mn, mx] = a.reach(t); if (gap > mx) return null;
    const air = b.isAir(), low = !air && b.isLow(), h = t.height;
    if (t.air && !a.air) return null;
    if (air) { if (!(h === 'high' || h === 'air' || h === 'rising')) return null; if (b.T && b.T.kind === 'flip' && !(h === 'high' || h === 'rising')) return null; }
    else if (low) { if (h === 'high' || h === 'mid' || h === 'rising') return null; }
    // a block in its guard frames stops high, mid and air techniques from the front
    if (b.st === 'tech' && b.tech === 'block' && b.ph === 'a' && h !== 'low' && Math.sign(a.x - b.x) === b.face) return { block: true, gap };
    const S = a.S, A = a.A, frac = A > 1 ? (a.k - S) / (A - 1) : 0;
    const tq = frac <= .4 ? 1 : lerp(1, .3, (frac - .4) / .6), top = mx - .3 * (mx - mn), sq = gap >= top ? 1 : clamp((gap - mn) / Math.max(1, top - mn), 0, 1);
    let q = .5 * tq + .5 * sq; if (a.R.signature === t.id) q += .1; if (t.id === 'upperPunch' && air) q += .25; q = clamp(q, 0, 1);
    const [lo, hi] = t.pts; let pts = clamp(lo + Math.round((hi - lo) * q / 100) * 100, lo, hi);
    const counter = (b.st === 'tech' && b.T && (b.T.pts || b.blocked)) || b.recoil > 0 || (Math.sign(a.x - b.x) !== b.face && b.st === 'tech');
    if (counter) pts = Math.min(1000, Math.round(pts * TUNE.counterMul / 100) * 100);
    return { pts, full: pts >= TUNE.fullAt, counter, q, tq, sq, gap, tech: t.id, sweep: !!t.knock, air };
  }
  detect() {
    const F = this.f;
    for (let i = 0; i < 2; i++) {
      const a = F[i], b = F[1 - i], res = this.check(a, b); if (!res) continue;
      a.hitDone = true;
      if (res.block) { this.blockHit(a, b); continue; }
      res.side = i; this.lastHit = res;
      if (this.phase === 'spar') { this.sparHit(res); continue; }
      if (this.pending && this.pending.side !== i) { this.pending.aiuchi = true; continue; }
      if (!this.pending) { this.pending = { side: i, res, steps: 6 }; F.forEach(f => { if (f !== a) f.frozen = false; }); }
    }
    if (this.phase === 'fight' && !this.pending) {
      if (!DEV.infTime) this.clock -= this.dt || 1 / 120;
      this.fightT += 1 / 120;
      if (this.clock <= 0) { this.clock = 0; this.timeUp(); }
      if (!DEV.infTime && this.fightT > this.clockMax() + 5) { this.fightT = 0; throw new Error('bout soft-lock: fight phase too long'); }
    }
    // a whiff: an active technique ended with no contact
    for (const f of F) if (f.st === 'tech' && f.T && f.T.pts && f.ph === 'r' && !f.hitDone && !f._whiffed) { f._whiffed = true; this.emit('whiff', { side: f.side, tech: f.tech }); }
    for (const f of F) if (f.ph === 's') f._whiffed = false;
  }
  blockHit(a, b) {
    a.blocked = true; a.extraR += U.steps(10); a.x -= a.techFace * 14; b.blockH = a.T.height === 'high' || a.T.height === 'air' ? 'high' : 'mid';
    b.k = Math.max(b.k, b.S + b.A - U.steps(6)); this.roundStats[b.side].blocks++; b.stats.blocks++;
    const hx = (a.x + b.x) / 2, hz = a.T.height === 'high' || a.T.height === 'air' ? 48 : 32;
    game.particles.sparks(hx, 0, hz, 10, a.techFace > 0 ? Math.PI : 0); game.particles.glints(hx, 0, hz, 6, '#7ab8ff');
    game.audio.sfx('clack'); this.stopT = .05; KC.Voice.crowd(.4, 'ooh'); this.emit('block', { side: b.side, by: a.side, tech: a.tech });
  }
  sparHit(res) {
    const a = this.f[res.side], b = this.f[1 - res.side]; this.lastPoint = res; a.stats[res.full ? 'full' : 'half']++;
    this.hitFx(res); b.hurt(res.side ? -1 : 1, false, false); this.emit('point', Object.assign({ spar: true }, res));
    this.popups.push({ t: 0, x: b.x, z: 60, text: (game.settings.techNames ? KC.TECH[res.tech].short || KC.TECH[res.tech].name : '') + ' ' + res.pts, full: res.full });
    game.after(.5, () => { if (b.st === 'hurt') b.st = 'idle'; });
  }
  hitFx(res) {
    const a = this.f[res.side], b = this.f[1 - res.side], hx = b.x - a.techFace * b.w / 3, hz = res.tech === 'lowKick' || KC.TECH[res.tech].knock ? 12 : KC.TECH[res.tech].height === 'high' ? 50 : 36;
    game.particles.impact(hx, 0, hz, res.full ? 1.4 : .9, res.full ? '#ffe070' : '#ffffff');
    game.particles.sparks(hx, 0, hz, res.full ? 14 : 8, a.techFace > 0 ? 0 : Math.PI); game.particles.dust(b.x, 0, 2, 6);
    game.shake(res.full ? 4 : 2); if (res.full) game.flash('#ffffff', .08);
    game.audio.sfx(res.full ? 'thwackFull' : 'thwackHalf'); for (const p of game.players) p.rumble(res.full ? .8 : .4, res.full ? .25 : .12);
    this.stopT = TUNE.hitstop;
  }
  resolve() {
    const P = this.pending; this.pending = null; const F = this.f;
    if (P.aiuchi) { this.lastPoint = { aiuchi: true }; F.forEach(f => { f.frozen = true; }); game.audio.sfx('clack'); this.stopT = TUNE.hitstop; this.emit('aiuchi', {}); this.enterPhase('yame'); return; }
    const r = P.res, a = F[r.side], b = F[1 - r.side];
    this.points[r.side] = Math.min(this.pointsToWin, this.points[r.side] + (r.full ? 1 : .5)); this.conceded[1 - r.side] += r.full ? 1 : .5; this.lastScorer = r.side;
    this.roundStats[r.side].techPts += r.pts; a.stats[r.full ? 'full' : 'half']++; if (r.pts > a.stats.bestPts) { a.stats.bestPts = r.pts; a.stats.best = r.tech; }
    this.lastPoint = Object.assign({ side: r.side }, r);
    this.hitFx(r); b.hurt(r.side ? -1 : 1, r.full, r.sweep); a.kime = true; a.frozen = true; b.frozen = true;
    if (r.full && !game.reduceMotion && !this.o.online) this.slow = .35;
    KC.Voice.crowd(r.full ? 1 : .55, 'cheer');
    this.popups.push({ t: 0, x: b.x, z: 66, text: (game.settings.techNames ? (KC.TECH[r.tech].short || KC.TECH[r.tech].name) + ' • ' : '') + r.pts + (r.counter ? ' COUNTER!' : ''), full: r.full });
    this.emit('point', Object.assign({}, this.lastPoint));
    this.enterPhase('yame');
  }
  timeUp() { this.enterPhase('time'); }
  phaseUpdate(dt) {
    const p = this.phase, t = this.pt, F = this.f, pc = k => this.pace(k);
    if (p === 'intro' && t >= pc(PH_T.intro) && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.intro) + 3)) this.enterPhase('rei');
    else if (p === 'rei' && t >= pc(PH_T.rei)) this.enterPhase('card');
    else if (p === 'card' && t >= pc(PH_T.card) && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.card) + 2.5)) this.enterPhase('ready');
    else if (p === 'ready' && t >= pc(PH_T.ready)) this.enterPhase('hajime');
    else if (p === 'yame' && t >= pc(PH_T.yame)) this.enterPhase('award');
    else if (p === 'award' && (t >= pc(PH_T.award) || (t >= pc(.6) && this.skip))) {
      this.skip = false;
      if (this.points[0] >= this.pointsToWin || this.points[1] >= this.pointsToWin) { this.winner = this.points[0] >= this.pointsToWin ? 0 : 1; this.enterPhase('roundEnd'); }
      else this.enterPhase('reset');
    }
    else if (p === 'reset' && (F.every(f => f.st !== 'auto') || t >= pc(PH_T.reset) + 2)) { F.forEach((f, i) => f.reset(this.marks[i])); this.enterPhase('ready'); }
    else if (p === 'time' && t >= pc(PH_T.time)) { if (this.points[0] !== this.points[1]) { this.winner = this.points[0] > this.points[1] ? 0 : 1; this.enterPhase('roundEnd'); } else this.enterPhase('hantei'); }
    else if (p === 'hantei') {
      const R = this.ref, n = Math.min(3, Math.floor(t / pc(.5)));
      if (R) for (let i = 0; i < n; i++) if (i < 2 && !R.flags[i]) { R.flags[i] = this.votes[i] ? 1 : 2; game.audio.sfx('flagSnap'); } else if (i === 2 && R.sig !== 'winner') { R.signal('full', this.votes[2]); }
      if (t >= pc(PH_T.hantei)) { const w = this.votes.filter(v => v === 1).length >= 2 ? 1 : 0; this.winner = w; if (R) R.flags = [0, 0, 0]; this.emit('hantei', { votes: this.votes.slice(), winner: w }); this.enterPhase('roundEnd'); }
    }
    else if (p === 'roundEnd' && t >= pc(PH_T.roundEnd)) {
      if (this.roundWins[this.winner] >= this.roundsToWin) { this.matchWinner = this.winner; this.enterPhase('matchEnd'); }
      else { this.round++; this.points = [0, 0]; this.clock = this.clockMax(); this.roundStats = [this.blankStats(), this.blankStats()]; this.enterPhase('card'); }
    }
    else if (p === 'matchEnd') {
      if (this.pt > pc(.9) && !this._bowed && (F.every(f => f.st !== 'auto') || this.pt > pc(3.5))) { this._bowed = true; F.forEach(f => f.setPose('bow')); this.say('bow'); if (this.ref) this.ref.signal('bow'); }
      if (this._bowed && this.pt > pc(1.9) && this.ref && this.ref.sig !== 'winner') { this.ref.signal('winner', this.matchWinner); F[this.matchWinner].setPose('win'); }
      if (t >= pc(PH_T.matchEnd) + (this._bowed ? 0 : 1)) this.enterPhase('over');
    }
  }
  // the dev panel's actions
  forceRound(side) { if (!['fight', 'ready', 'hajime'].includes(this.phase)) return; this.points[side] = this.pointsToWin; this.winner = side; this.f.forEach(f => { f.frozen = true; }); this.enterPhase('roundEnd'); }
  forceMatch(side) { this.roundWins[side] = this.roundsToWin - 1; this.forceRound(side); }
  /** the state a guest needs */
  snapshot() { return { ph: PHASES.indexOf(this.phase), pt: Math.round(this.pt * 100) / 100, c: Math.round(this.clock * 10) / 10, sc: this.points.slice(), rw: this.roundWins.slice(), rd: this.round, w: this.winner, f: this.f.map(f => f.snap()), sig: this.ref ? [this.ref.sig || '', this.ref.side, this.ref.flags.slice()] : null, card: this.cardText }; }
  applySnapshot(s) {
    const was = this.phase; this.phase = PHASES[s.ph] || 'fight'; if (was !== this.phase) this.pt = 0; this.clock = s.c; this.points = s.sc; this.roundWins = s.rw; this.round = s.rd; this.winner = s.w; this.cardText = s.card;
    s.f.forEach((a, i) => this.f[i].apply(a)); if (this.ref && s.sig) { if (s.sig[0] !== (this.ref.sig || '') || s.sig[1] !== this.ref.side) this.ref.signal(s.sig[0] || null, s.sig[1]); this.ref.flags = s.sig[2]; }
  }
  draw(r) { if (this.ref) this.ref.draw(r); this.f.forEach(f => f.draw(r)); }
}
KC.Bout = Bout;

/* ---- THE FIGHT HUD ---- */
KC.HUD = {
  draw(r, B, o = {}) {
    r.overlay(g => {
      const W = r.W, H = r.H, F = B.f, ca = game.cornerArea && game.cornerArea(), topY = 4;
      if (!B.ref) return;
      // clock
      const cs = String(Math.ceil(Math.max(0, B.clock))); box(g, W / 2 - 18, topY, 36, 22, { alpha: .8 });
      KC.title(g, DEV.infTime ? '--' : cs, W / 2, topY + 4, 2, B.clock <= 5 && B.phase === 'fight' ? ['#ffffff', '#ff8060', '#c02020'] : TITLE_COLS);
      // the sides: name, belt or tag, point slots, round pips
      F.forEach((f, i) => {
        const left = i === 0, x = left ? 8 : W - 8 - (ca && !left ? 0 : 0), al = left ? 1 : -1, nm = (o.names && o.names[i]) || f.name, sideC = left ? '#fff6e8' : '#ff5a4a';
        const nx = left ? x : x - TW(nm, BIG);
        T(g, nm, nx, topY + (ca && !left ? 30 : 2), sideC, BIG);
        const y2 = topY + (ca && !left ? 30 : 2) + 18;
        T(g, left ? 'WHITE' : 'RED', left ? x : x - TW(left ? 'WHITE' : 'RED'), y2, sideC);
        // point slots: a half point half-fills a circle (shape, not just colour)
        const n = Math.min(5, Math.ceil(B.pointsToWin));
        for (let k = 0; k < n; k++) {
          const cx = left ? x + 48 + k * 16 : x - 48 - k * 16, cy = y2 + 3, v = clamp(B.points[i] - k, 0, 1);
          px.disc(g, cx, cy, 6, '#1a1424'); px.disc(g, cx, cy, 5, '#3a3248');
          if (v >= 1) px.disc(g, cx, cy, 5, '#ffd060'); else if (v >= .5) { px.disc(g, cx, cy, 5, '#ffd060'); px.rect(g, left ? cx : cx - 5, cy - 5, 6, 11, '#3a3248'); px.rect(g, cx, cy - 5, 1, 11, '#1a1424'); }
        }
        for (let k = 0; k < B.roundsToWin; k++) { const rx = left ? x + k * 9 : x - 6 - k * 9; px.rect(g, rx, y2 + 12, 6, 6, '#1a1424'); px.rect(g, rx + 1, y2 + 13, 4, 4, k < B.roundWins[i] ? sideC : '#3a3248'); }
        // the belt colour (story) under the name
        px.rect(g, left ? x + 36 + 46 : x - 36 - 46 - 10, y2 + 13, 10, 3, BELT[f.belt] || '#fff');
      });
      // scores
      if (o.score !== undefined) { T(g, '1P ' + U.pad(o.score, 7), 8, H - 12, '#fff6e8'); T(g, 'HI ' + U.pad(Math.max(o.hi || 0, o.score), 7), W - 8 - TW('HI 0000000'), H - 12, '#ffd060'); }
      // the referee's call
      if (B.call && B.call.t < 1.4) { const c = B.call, sc = c.text.length > 12 ? 2 : 3, y = H * .32 - (c.t < .1 ? (1 - c.t / .1) * 8 : 0); KC.title(g, c.text, W / 2, y, sc, c.side === 1 && (c.id === 'red' || c.id === 'redWins') ? ['#ffe0d8', '#ff7060', '#c02020'] : ['#fff6d0', '#ffd060', '#e8782a']); }
      if (B.phase === 'card' && B.cardText) KC.title(g, B.cardText, W / 2, H * .45, 3);
      // popups over the scorer
      for (const p of B.popups) { const s = r.w(p.x, 0, p.z + p.t * 14); T(g, p.text, s[0] - TW(p.text) / 2, s[1] - 10, p.full ? '#ffe070' : '#ffffff', { outline: '#000' }); }
      if (KC.tuneChanged() || DEV.enabled && KC.Dev.badge) { box(g, W / 2 - 14, topY + 26, 28, 12, { bg: ['#5a1a1a', '#3a0a0a'], border: '#ff8a6a' }); T(g, 'DEV', W / 2 - 8, topY + 28, '#ffd0c0'); }
      if (o.hint) { const ta = game.input.touchArea && game.input.touchArea(), y = ta ? ta.y0 - 14 : H - 30; box(g, 8, y - 3, W - 16, 13, { alpha: .7 }); T(g, o.hint, W / 2 - TW(o.hint) / 2, y, '#e8f0ff'); }
      if (game.settings.inputDisplay || DEV.inputs) KC.HUD.inputs(g, F[0], 8, H - 60);
      if (DEV.frames && B.f[0].lastTech) KC.HUD.frames(g, B, W - 150, H - 60);
    });
  },
  inputs(g, f, x, y) {
    const h = (f._inLog || []).slice(-12);
    h.forEach((e, i) => { const yy = y - i * 13 + 40; KC.glyph(g, x, yy - 120 + 80, 'L:' + e.p, 10); KC.glyph(g, x + 20, yy - 40, 'R:' + e.r, 10); });
  },
  frames(g, B, x, y) {
    const f = B.f[0], t = KC.TECH[f.lastTech]; if (!t || !t.f) return; box(g, x, y, 142, 44, { alpha: .8 });
    T(g, t.short || t.name, x + 4, y + 3, '#ffd060'); T(g, 'S ' + f.steps(0, t) + '  A ' + f.steps(1, t) + '  R ' + f.steps(2, t) + ' (STEPS)', x + 4, y + 13, '#fff');
    const h = B.lastHit; if (h && !h.block) T(g, 'Q ' + h.q.toFixed(2) + ' T' + h.tq.toFixed(2) + ' S' + h.sq.toFixed(2) + (h.counter ? ' X2' : ''), x + 4, y + 23, '#a8e8ff');
    if (h && h.gap !== undefined) T(g, 'GAP ' + h.gap.toFixed(1) + '  ' + h.pts + (h.full ? ' FULL' : ' HALF'), x + 4, y + 33, '#a8e8ff');
  }
};
