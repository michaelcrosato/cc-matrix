/* =====================================================================================================================
 * REFEREE and BOUT. Judge Genkotsu stands upstage between the fighters, calls every exchange (a gibberish voice with a
 * subtitle), signals with his arms; two corner judges hold a red and a white flag for the decision (hantei).
 * KC.Bout is the match: the phase machine below, scoring, the aiuchi window, its own hit-stop and the event bus that the
 * HUD, sound, crowd, story and netcode listen to. Deterministic: no Math.random (its judges draw from E.rng(seed)).
 * ===================================================================================================================== */
KC.Referee = class {
  constructor(o = {}) {
    this.rig = KC.makeOfficial(2.1); this.x = 200; this.tx = 200; this.y = -18; this.sig = null; this.sigT = 0; this.side = 1; this.bowT = 0;
    this.banners = []; this.off = !!o.off;
    this.judges = [-1, 1].map(s => ({ s, x: s < 0 ? 36 : 364, rig: KC.makeOfficial(1.75, { colors: { cloth: '#2a3a6a', coat: '#2a3a6a' } }), flag: 0, vote: 0, wave: 0 }));
  }
  /** say a call: its subtitle banner and the referee's voice; returns its seconds */
  call(id, o = {}) {
    const text = o.text || KC.call(id), dur = KC.Voice ? KC.Voice.call(id, text) : .6;
    this.banners.push({ text, t: 0, dur: Math.max(.9, o.dur || dur + .5), big: o.big !== false, color: o.color || null, sub: o.sub || null });
    if (this.banners.length > 2) this.banners.shift();
    return dur;
  }
  /** an arm signal ('hajime', 'yame', 'half', 'full', 'aiuchi', 'whistle', 'point', 'winner', 'nopoint') toward side (0 white, 1 red) */
  signal(sig, side = 0, dur = 1) { this.sig = sig; this.side = side === 0 ? 1 : -1; this.sigT = dur; }
  bow(t = .9) { this.bowT = t; }
  /** each judge's flag: vote 1 (white), -1 (red) or 0 (down) */
  flags(i, vote) { const j = this.judges[i]; if (j) { j.vote = vote; j.wave = 1; } }
  clearFlags() { for (const j of this.judges) j.vote = 0; }
  update(dt, fighters) {
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    if ((this.sigT -= dt) <= 0) this.sig = null;
    this.bowT -= dt;
    if (fighters && fighters.length === 2) this.tx = clamp((fighters[0].x + fighters[1].x) / 2, 60, 340);
    this.x = approach(this.x, this.tx, 60 * dt);
    KC.poseStep(this.rig, dt, { sig: this.sig, side: this.side, bow: this.bowT > 0 ? 1 : 0 });
    this.rig.update(dt, { x: this.x, y: this.y, z: 0, vx: Math.abs(this.tx - this.x) > 2 ? 40 : 0, vy: 0, facing: PI / 2 });
    for (const j of this.judges) {
      j.wave = Math.max(0, j.wave - dt * 1.5);
      KC.poseStep(j.rig, dt, { flag: 1, flagSide: j.vote === 1 ? 1 : j.vote === -1 ? -1 : 0, seiza: 0 });
      j.rig.update(dt, { x: j.x, y: -34, z: 0, vx: 0, vy: 0, facing: PI / 2 });
    }
  }
  draw(r) {
    if (this.off) return;
    r.actor(this.x, this.y, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this });
    r.shadow(this.x, this.y, 12, .3);
    for (const j of this.judges) {
      r.actor(j.x, -34, 0, (g, ox, oy) => j.rig.draw(g, ox, oy, r.view), { key: j });
      // the flags: a short pole in each hand, red in the left, white in the right; the raised one waves
      for (const s of [-1, 1]) r.queue(j.x, -33, 40, g => {
        const h = j.rig.hand(s > 0 ? 'R' : 'L'), p = r.w(h[0], h[1], h[2]), up = j.vote === s, sc = r.view.scale;
        const x = Math.round(p[0]), y = Math.round(p[1]), L = Math.round((up ? 11 : 7) * sc), c = s > 0 ? '#f4f2ee' : '#d8302a';
        if (up) { px.rect(g, x, y - L, 1, L, '#5a3a2a'); const wv = Math.round(Math.sin(r.view && (KC.game ? KC.game.real : 0) * 12) * j.wave * 2); px.poly(g, [[x + 1, y - L], [x + 1 + Math.round(8 * sc), y - L + 1 + wv], [x + 1 + Math.round(8 * sc), y - L + Math.round(5 * sc) + wv], [x + 1, y - L + Math.round(6 * sc)]], c); }
        else { px.rect(g, x, y - 2, 1, L, '#5a3a2a'); px.rect(g, x + 1, y + 1, Math.round(3 * sc), Math.round(6 * sc), c); }
      }, { bias: 2 });
    }
  }
  /** the call banners, centre screen (in r.overlay) */
  drawBanner(g, W, H) {
    let y = Math.round(H * .3);
    for (const b of this.banners) {
      const a = b.t < .12 ? b.t / .12 : 1, sc = b.big ? 3 : 2, pop = b.t < .12 ? 1 + (1 - a) * .6 : 1;
      E.font.title(g, b.text, Math.round(W / 2), y - Math.round((pop - 1) * 10), { scale: Math.round(sc * pop) || sc, align: 'center', colors: b.color || ['#fff6d0', '#ffd060', '#e8782a'], depth: 2, outline: '#1a0c08' });
      if (b.sub) E.font.text(g, b.sub, Math.round(W / 2), y + 8 * sc + 6, '#fff6e8', { align: 'center', shadow: '#000', outline: false, scale: 1 });
      y += 9 * sc + (b.sub ? 18 : 8);
    }
  }
};

/* ---- THE BOUT ---- */
const PH = { intro: 1.2, rei: .9, card: .9, ready: .4, hajime: .6, yame: .9, award: 1.2, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.5 };
KC.Bout = class {
  /** new KC.Bout({ fighters: [white, red], referee, seed, rules: { pointsToWin, roundsToWin, clock, intro }, mode, onMatchEnd(winner, bout) }) */
  constructor(o) {
    this.o = o; this.f = o.fighters; this.ref = o.referee || new KC.Referee(); this.bus = o.bus || new KC.Bus(); this.mode = o.mode || 'versus';
    for (const f of this.f) f.bus = this.bus;
    this.seed = o.seed || 1; this.rules = Object.assign({}, o.rules || {});
    this.points = [0, 0]; this.roundWins = [0, 0]; this.round = 1; this.score = [0, 0]; this.conceded = [0, 0];
    this.phase = 'intro'; this.t = 0; this.clock = this.R('clock'); this.freeze = 0; this.pending = null; this.lastPoint = null; this.lastCall = null; this.winner = -1;
    this.roundStats = [this._rs(), this._rs()]; this.lastScorer = -1; this.fightT = 0; this.matchOver = false; this.hantei = null; this.skip = false; this.log = [];
    this.judgeRng = [KC.rng(this.seed * 31 + 1), KC.rng(this.seed * 31 + 2), KC.rng(this.seed * 31 + 3)];
    this.bus.on('*', (k, d) => { if (k === 'call') this.lastCall = d.id; });
    if (this.rules.intro === false) this._go('rei'); else this._enter('intro');
  }
  _rs() { return { pts: 0, attempts: 0, blocks: 0 }; }
  /** a rule: the bout's own, else the live tuning */
  R(k) { return this.rules[k] !== undefined ? this.rules[k] : KC.TUNE[k]; }
  dur(ph) { return PH[ph] * KC.TUNE.refPace; }
  call(id, o) { const d = this.ref.call(id, o); this.bus.emit('call', { id, text: KC.call(id) }); return d; }
  _go(ph) { this.phase = ph; this.t = 0; this._enter(ph); this.bus.emit('phase', { phase: ph }); }
  _enter(ph) {
    const [a, b] = this.f, M = KC.ARENA.marks;
    if (ph === 'intro') { a.x = 40; b.x = 360; a.script('kamae', M[0]); b.script('kamae', M[1]); this.ref.x = 200; }
    else if (ph === 'rei') { for (const f of this.f) f.script('bow', M[f.side]); this.ref.bow(); this.call('bow', { big: false }); }
    else if (ph === 'card') {
      const last = this.roundWins[0] === this.R('roundsToWin') - 1 && this.roundWins[1] === this.R('roundsToWin') - 1 && this.R('roundsToWin') > 1;
      this.cardText = last ? KC.call('decide') : 'ROUND ' + this.round; for (const f of this.f) f.script('yoi', M[f.side]); this.bus.emit('card', { round: this.round, last });
    } else if (ph === 'ready') { for (const f of this.f) f.script('kamae', null); this.ref.clearFlags(); }
    else if (ph === 'hajime') { this.call('begin'); this.ref.signal('hajime', 0, .6); this.released = false; }
    else if (ph === 'fight') { this.fightT = 0; }
    else if (ph === 'yame') { this.ref.signal('yame', 0, .9); this.call('stop'); }
    else if (ph === 'award') this._award();
    else if (ph === 'reset') { for (const f of this.f) { f.hold = false; f.script('kamae', M[f.side], 2); } this.ref.tx = 200; }
    else if (ph === 'resetRound') { for (const f of this.f) { f.hold = false; f.script('kamae', M[f.side], 1.6); } this.ref.tx = 200; this.att0 = this.f.map(f => f.stats.attempts); }
    else if (ph === 'time') { this.call('time'); for (const f of this.f) f.script('kamae', null); }
    else if (ph === 'hantei') this._hantei();
    else if (ph === 'roundEnd') this._roundEnd();
    else if (ph === 'matchEnd') { for (const f of this.f) f.script('bow', M[f.side]); this.ref.bow(1); this.mEndT = 0; }
  }
  /** one step: the fighters (unless the bout's hit-stop holds them), then the phase */
  update(dt) {
    this.t += dt;
    if (this.freeze > 0) { this.freeze -= dt; this.ref.update(dt, this.f); return; }
    const [a, b] = this.f;
    a.update(dt, b); b.update(dt, a);
    KC.Bout.push(a, b);
    for (const f of this.f) f.pose(dt);
    this.ref.update(dt, this.phase === 'fight' || this.phase === 'yame' ? this.f : null);
    const ph = this.phase, t = this.t, D = this.dur(ph);
    if (ph === 'intro' && t >= D) this._go('rei');
    else if (ph === 'rei' && t >= D) this._go('card');
    else if (ph === 'card' && t >= D) this._go('ready');
    else if (ph === 'ready' && t >= D) this._go('hajime');
    else if (ph === 'hajime') { if (!this.released && t >= .35 * KC.TUNE.refPace) { this.released = true; for (const f of this.f) { f.release(this.f[1 - f.side]); f.ctlOn = true; } } if (t >= D) this._go('fight'); }
    else if (ph === 'fight') this._fight(dt);
    else if (ph === 'yame' && t >= D) this._go('award');
    else if (ph === 'award' && (t >= D || (this.skip && t >= .6))) { this.skip = false; this._afterAward(); }
    else if (ph === 'reset') { const M = KC.ARENA.marks, there = this.f.every(f => f.st === 'script' && f.walkTo === null && Math.abs(f.x - M[f.side]) < 2); if (there || t >= D * 2) this._go('ready'); }
    else if (ph === 'time' && t >= D) { if (this.points[0] !== this.points[1]) this._go('roundEnd'); else this._go('hantei'); }
    else if (ph === 'hantei') this._hanteiStep(t);
    else if (ph === 'roundEnd' && t >= D) { const w = this.roundWinner; if (this.roundWins[w] >= this.R('roundsToWin')) this._go('matchEnd'); else { this.round++; this.points = [0, 0]; this.roundStats = [this._rs(), this._rs()]; this.clock = this.R('clock'); this._go('resetRound'); } }
    else if (ph === 'resetRound') { if ((this.f.every(f => f.st === 'script' && f.walkTo === null) && t > .3) || t > 2.5) this._go('card'); }
    else if (ph === 'matchEnd') {
      if (t >= D * .4 && !this._raised) { this._raised = true; this.ref.signal('winner', this.winner, 3); this.call(this.winner === 0 ? 'whiteWins' : 'redWins', { big: false }); }
      if (t >= D && !this.matchOver) { this.matchOver = true; this.phase = 'over'; this.bus.emit('matchEnd', { winner: this.winner, bout: this }); if (this.o.onMatchEnd) this.o.onMatchEnd(this.winner, this); }
    }
  }
  _fight(dt) {
    const [a, b] = this.f;
    this.fightT += dt;
    if (!(KC.DEV && KC.DEV.infiniteTime)) this.clock = Math.max(0, this.clock - dt);
    if (this.fightT > this.R('clock') + 5 && !(KC.DEV && KC.DEV.infiniteTime) && !this._softWarned) { this._softWarned = true; if (KC.game) KC.game.fail('bout soft-lock', new Error('the fight phase ran past its clock')); }
    // strikes: blocks first, then hits (a hit opens the aiuchi window: 6 steps in which the other may land too)
    for (const [p, q] of [[a, b], [b, a]]) {
      const s = p.strike(q); if (!s) continue;
      if (q.blocks(p)) { p.recoil(); q.guarded(p); this.roundStats[q.side].blocks++; this.freeze = .05; this.bus.emit('block', { side: q.side, by: p.side, tech: p.tech, x: (p.x + q.x) / 2, z: p.z + p.h * .6 }); continue; }
      if (KC.DEV && KC.DEV.invincible && q.side === 0 && this.mode !== 'online') { p.resolved = true; this.bus.emit('whiff', { side: p.side, tech: p.tech, invincible: true }); continue; }
      p.resolved = true;
      if (!this.pending) this.pending = { first: p.side, hits: [], t: 0 };
      this.pending.hits.push(this._score(p, q, s));
    }
    for (const f of this.f) if (f.st === 'tech' && !f.resolved && f.phase === 'recover' && f.T.scoring && !f._whiffed) { f._whiffed = true; this.bus.emit('whiff', { side: f.side, tech: f.tech }); }
    for (const f of this.f) if (f.st !== 'tech' || f.phase !== 'recover') f._whiffed = false;
    if (this.pending) {
      const P = this.pending;
      if (++P.t >= 6 || P.hits.length === 2) {
        this.pending = null;
        for (const f of this.f) f.ctlOn = false;
        if (P.hits.length === 2) { this.award = { aiuchi: true }; this.bus.emit('aiuchi', {}); for (const h of P.hits) this.f[1 - h.side].hit('hurt', this.f[h.side].x); }
        else {
          const h = P.hits[0], att = this.f[h.side], def = this.f[1 - h.side];
          this.award = h; att.hold = true; def.hit(h.full || KC.TECH[h.tech].knockdown ? 'down' : 'hurt', att.x);
          this.bus.emit('point', Object.assign({ x: (att.x + def.x) / 2 + att.face * 6, z: att.z + att.h * (KC.TECH[h.tech].height === 'low' ? .15 : KC.TECH[h.tech].height === 'mid' ? .5 : .78) }, h));
        }
        this.freeze = KC.TUNE.hitstop;
        this._go('yame');
      }
      return;
    }
    if (this.clock <= 0) { for (const f of this.f) f.ctlOn = false; this._go('time'); }
  }
  /** the points a clean (or sloppy) technique scores: quality from timing and spacing, x2 on a counter */
  _score(p, q, s) {
    const t = KC.TECH[s.tech], sig = p.F.signature === t.id ? .1 : 0, air = t.height === 'rising' && (s.prof === 'air' || s.prof === 'flip') ? .25 : 0;
    const qual = clamp(.5 * s.timingQ + .5 * s.spacingQ + sig + air, .15, 1);
    let pts = KC.Bout.points(t, qual);
    const counter = q.countering || (q.st === 'tech' && q.blockedBy);
    if (counter) pts = Math.min(1000, Math.round(pts * KC.TUNE.counterMul / 100) * 100);
    const full = pts >= KC.TUNE.fullAt;
    return { side: p.side, tech: t.id, pts, full, counter, q: qual, timingQ: s.timingQ, spacingQ: s.spacingQ, gap: Math.round(s.gap) };
  }
  static points(t, q) { const [lo, hi] = t.pts; return clamp(lo + Math.round((hi - lo) * q / 100) * 100, lo, hi); }
  _award() {
    const A = this.award;
    if (!A || A.aiuchi) { this.call('aiuchi', { big: true, sub: KC.call('nopoint') }); this.ref.signal('aiuchi', 0, 1.1); this.lastPoint = { aiuchi: true }; return; }
    const s = A.side, add = A.full ? 1 : .5;
    this.points[s] = Math.min(this.R('pointsToWin'), this.points[s] + add); this.conceded[1 - s] += add;
    this.score[s] += A.pts; this.roundStats[s].pts += A.pts; this.lastScorer = s; this.lastPoint = A;
    const f = this.f[s]; if (A.full) f.stats.full++; else f.stats.half++;
    if (A.pts > f.stats.bestPts) { f.stats.bestPts = A.pts; f.stats.best = A.tech; }
    this.call(s === 0 ? 'white' : 'red', { big: true, sub: KC.call(A.full ? 'full' : 'half') + (A.counter ? '  COUNTER!' : '') });
    this.ref.signal(A.full ? 'full' : 'half', s, 1.2);
    this.log.push({ round: this.round, side: s, tech: A.tech, pts: A.pts, full: A.full, counter: A.counter });
    this.bus.emit('award', A);
  }
  _afterAward() {
    for (const f of this.f) f.stay = false;
    const w = this.points[0] >= this.R('pointsToWin') ? 0 : this.points[1] >= this.R('pointsToWin') ? 1 : -1;
    if (w >= 0) { this.roundWinner = w; this._go('roundEnd'); return; }
    const mp = this.points.findIndex(p => p >= this.R('pointsToWin') - .5 && p > 0);
    if (mp >= 0 && this.lastPoint && !this.lastPoint.aiuchi && this.lastPoint.side === mp && this.R('pointsToWin') > .5) this.call('matchPoint', { big: false });
    this._go('reset');
  }
  _hantei() {
    this.call('judges', { big: true }); this.ref.signal('whistle', 0, .8); this.bus.emit('whistle', {});
    // each judge: technique points + 60 per attempt in range + 40 per block + its own noise (+-120); a tie: the side that scored last, then white
    const S = this.roundStats, a0 = this.att0 || [0, 0], att = this.f.map((f, i) => f.stats.attempts - a0[i]);
    const votes = this.judgeRng.map(R => { const n = () => (R() * 2 - 1) * 120, w = S[0].pts + 60 * att[0] + 40 * S[0].blocks + n(), r = S[1].pts + 60 * att[1] + 40 * S[1].blocks + n(); return w > r ? 0 : r > w ? 1 : this.lastScorer >= 0 ? this.lastScorer : 0; });
    const white = votes.filter(v => v === 0).length;
    this.hantei = { votes, winner: white >= 2 ? 0 : 1, shown: 0 };
  }
  _hanteiStep(t) {
    const H = this.hantei, P = KC.TUNE.refPace;
    for (let i = H.shown; i < 3 && t >= (.6 + i * .5) * P; i++) {
      H.shown = i + 1; const v = H.votes[i];
      if (i < 2) this.ref.flags(i, v === 0 ? 1 : -1); else this.ref.signal('point', v, 1.4);
      this.bus.emit('flag', { judge: i, vote: v });
    }
    if (t >= this.dur('hantei')) { this.roundWinner = H.winner; this._go('roundEnd'); }
  }
  _roundEnd() {
    const w = this.roundWinner === undefined ? (this.points[0] >= this.points[1] ? 0 : 1) : this.roundWinner;
    this.roundWinner = w; this.roundWins[w]++; this.winner = w;
    const bonus = Math.floor(Math.max(0, this.clock)) * 100; this.score[w] += bonus; this.timeBonus = bonus;
    this.call(w === 0 ? 'whiteWins' : 'redWins');
    this.f[w].script('win', null); this.f[1 - w].script('lose', null);
    if (this.roundWins[w] >= this.R('roundsToWin') && this.conceded[w] === 0 && this.mode === 'story') { this.score[w] += 5000; this.perfect = true; }
    this.bus.emit('roundEnd', { winner: w, bonus, perfect: !!this.perfect && this.roundWins[w] >= this.R('roundsToWin') });
    this.roundWinner = w;
  }
  /** end the bout at once (a forfeit online, a dev command): side w wins */
  forceWin(w, why = 'forfeit') {
    this.roundWins[w] = this.R('roundsToWin'); this.winner = w; this.roundWinner = w; this.call(why === 'forfeit' ? 'forfeit' : w === 0 ? 'whiteWins' : 'redWins');
    for (const f of this.f) f.ctlOn = false; this.f[w].script('win', null); this.f[1 - w].script('lose', null); this.pending = null; this.freeze = 0;
    this._go('matchEnd'); this.t = this.dur('matchEnd') * .4;
  }
  /** push boxes never overlap (a shared correction; the walls keep their own); a somersault flies over */
  static push(a, b) {
    const flying = f => f.st === 'tech' && f.T && f.T.flip && f.airborne;
    if (flying(a) || flying(b)) return;
    if (a.z > b.z + b.h * .8 || b.z > a.z + a.h * .8) return;
    const need = (a.w + b.w) / 2, dx = b.x - a.x;
    if (Math.abs(dx) >= need) return;
    const d = (need - Math.abs(dx)) * (dx > 0 ? 1 : dx < 0 ? -1 : (a.side === 0 ? 1 : -1)) / 2;
    a.x -= d; b.x += d;
    for (const [P, Q] of [[a, b], [b, a]]) { const h = P.w / 2; if (P.x - h < P.x0) { const k = P.x0 + h - P.x; P.x += k; Q.x += k; } if (P.x + h > P.x1) { const k = P.x + h - P.x1; P.x -= k; Q.x -= k; } }
  }
};
