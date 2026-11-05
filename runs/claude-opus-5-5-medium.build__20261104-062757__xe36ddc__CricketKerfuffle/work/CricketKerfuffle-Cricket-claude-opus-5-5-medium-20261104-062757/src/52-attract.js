// ---- the attract mode (5.18): after 10 s without input on the title or a menu, a looping showreel of real play on the
// real machinery, both sides CPU and cheating freely (forced outcomes, guaranteed catches, never out). Ten segments,
// about 25 s each, then the high scores. Any input goes back to the title.
const SEGMENTS = [
  { name: 'THE VILLAGE GREEN', ground: 'green', teams: ['ker', 'mud'], chaos: 'cow', token: 'teapot', balls: [{ force: 'four', th: 55, token: true }, { force: 'six', th: -30 }, { force: 'one' }] },
  { name: 'THE LEANING WICKET', ground: 'green', time: 'dusk', teams: ['ker', 'mud'], balls: [{ force: 'six', target: 'pub', bat: 'kettle' }, { force: 'four', th: 80 }] },
  { name: 'A HUGE APPEAL', ground: 'green', teams: ['mud', 'ker'], bowler: 'basil', balls: [{ force: 'lbwReview', del: 'legbreak' }, { force: 'bowled', del: 'googly' }] },
  { name: 'THRUMPTON HALL', ground: 'hall', weather: 'overcast', teams: ['ker', 'gen'], bowler: 'peregrine', balls: [{ force: 'edge', del: 'outswing' }, { force: 'caught', del: 'inswing' }] },
  { name: 'SUNBURNT BAY', ground: 'bay', teams: ['ker', 'lar'], bowler: 'shazza', chaos: 'tide', balls: [{ force: 'dot', del: 'bouncer', leave: true }, { force: 'six', del: 'bouncer', target: 'shark' }, { force: 'four' }] },
  { name: 'YES! NO! SORRY!', ground: 'bay', teams: ['lar', 'ker'], balls: [{ force: 'one' }, { force: 'runout' }] },
  { name: 'DUSTBOWL DOWNS', ground: 'downs', teams: ['ker', 'mag'], bowler: 'spinaldo', second: true, chaos: 'rain', balls: [{ force: 'stumped', del: 'legbreak', special: true }, { force: 'four' }] },
  { name: 'ON FIRE', ground: 'green', time: 'dusk', teams: ['ker', 'mud'], balls: [{ force: 'four', th: 60 }, { force: 'four', th: -60 }, { force: 'four', th: 10 }, { force: 'six', target: 'weathervane', bat: 'kettle' }] },
  { name: 'THE MIDNIGHT FINAL', ground: 'dome', time: 'night', weather: 'fog', teams: ['ker', 'thr'], bowler: 'machine', chaos: 'ghosts', balls: [{ force: 'four', special: true }, { force: 'six', target: 'jumbotron' }], endCard: true },
  { name: 'HIGH SCORES', table: true }
];
SC.attract = {
  enter(d) {
    this.seg = d && d.seg !== undefined ? d.seg : (SC.attract.lastSeg + 1 || 0) % SEGMENTS.length; SC.attract.lastSeg = this.seg; this.from = d && d.from || (this.from || 'title');
    this.t = 0; this.k = 0; this.card = 0; music('attract');
    IDLE.sig = inputSig(); this.grace = d && d.chain ? 0 : .3;
    const S_ = SEGMENTS[this.seg]; this.S = S_; cover('attract:' + this.seg);
    if (S_.table) { this.m = null; return; }
    const cfg = { mode: 'attract', teams: S_.teams, ground: S_.ground, timeOfDay: S_.time || null, weather: S_.weather || null, overs: 2, wickets: 10, kerfuffle: true, humans: [[], []], seed: 100 + this.seg, superOver: false, cheat: { catches: true, noOut: false }, noMusic: true, difficulty: 'county' };
    if (S_.second) cfg.scenario = { innings: 2, target: 40, battingFirst: S_.teams[1], firstRuns: 39 };
    const m = this.m = new Match(cfg); MATCH = m; m.cheatSide = 0; commReset(m); useGround(m.cfg.ground, m); WORLD.shot = null;
    m.highlights = [];
    const self = this;
    if (S_.bowler) { const ob = m.aiPickBowler; m.aiPickBowler = function (list) { const p = this.squads[this.bowlT].find(q => q.id === S_.bowler); return p || ob.call(this, list); }; const oe = m.eligibleBowlers; m.eligibleBowlers = function () { const p = this.squads[this.bowlT].find(q => q.id === S_.bowler); return p ? [p] : oe.call(this); }; }
    m.cfg.script = { next(what, mm) { const B = S_.balls[Math.min(self.k, S_.balls.length - 1)]; if (what === 'bowl') return { del: B.del, grade: 'green', special: !!B.special }; return B.leave ? { btn: 'leave', grade: 'PERFECT' } : null; } };
    // each ball: aim the forcing before the release
    on('state', this._st = st => { if (MATCH !== m || st.s !== 'setup') return; const B = S_.balls[this.k]; if (!B) return;
      let f = B.force; const o = { th: B.th, target: B.target };
      if (f === 'lbwReview') { m.cfg.umpWrong = true; f = 'lbw'; } else m.cfg.umpWrong = false;
      m.forceNext(f, o);
      if (B.bat) { m.hype[m.batT] = 100; m.vpad('bat'); m._batAuto = B.bat; }
      if (B.token) { const h = m.strikerHand(), w = dirOf((B.th || 55) * DEG, h); m.spawnToken(S_.token, [w[0] * 140, w[1] * 140, 6]); }
    });
    on('ball:done', this._bd = () => { if (MATCH === m) this.k++; });
    if (S_.chaos) game.after(1.2, () => { if (MATCH === m) m.triggerChaos(S_.chaos); });
  },
  exit() { const off = (ev, fn) => { const a = BUS.subs[ev]; if (a && fn) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }; off('state', this._st); off('ball:done', this._bd); this._st = this._bd = null; game.weather = null; game.timeScale = 1; },
  update(dt) {
    this.t += dt; this.grace -= dt;
    // any input exits (and is consumed, so it does not also pick a menu item)
    if (this.grace <= 0 && anyInput()) { game.input.consumeAll(); IDLE.t = 0; game.go(this.from === 'attract' ? 'title' : this.from, { menu: this.from === 'title' }); return; }
    if (this.grace > 0) IDLE.sig = inputSig();
    const S_ = this.S, m = this.m;
    if (S_.table) { if (this.t > 8) this.next(); return; }
    // a special the batter arms (Tea-Kettle Slog on a forced six)
    if (m._batAuto && m.state === 'runup' && m.specialReady(m.batT)) { m.vpad('bat').tap('special'); m._batAuto = null; }
    if (WORLD.slowT > 0) WORLD.slowT -= 1 / 120;
    game.timeScale = WORLD.slowT > 0 ? WORLD.slowK : 1;
    m.update(dt); director(m, dt); hudStep(dt);
    if (m.state === 'dead' && m.st > 2.2 && !m.review && !m.reviewWin && !m.third) m.skipDead();
    if (m.state === 'break' && m.st > 1.5) m.breakGo = true;
    if (this.k >= S_.balls.length && m.state === 'between') { if (S_.endCard && !this.card) { this.card = .001; m.time = 'night'; WORLD.cheer = 4; sting('win'); cover('attract:endcard'); } }
    if (this.card) { this.card += dt; m.fireworks = 1; if (this.card > 4) this.next(); }
    else if ((this.k >= S_.balls.length && m.state === 'between') || this.t > 32) this.next();
  },
  next() { game.go('attract', { seg: (this.seg + 1) % SEGMENTS.length, from: this.from, chain: true }, { fade: 'wipe' }); },
  draw(r) {
    const S_ = this.S;
    if (S_.table) { drawBackdrop(r, 1 / 60, { gid: 'dome', time: 'night' }); const A = arcade(); r.overlay(g => px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0818'))); A.drawTable(r, 'bat', 34, 'HIGH SCORES: SHOWDOWN'); }
    else { drawWorld(r, this.m, 1 / 60); drawHud(r, this.m); }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!S_.table && this.t < 3) { panel(g, 0, 40, W, 22, { rule: '#ffd23a' }); E.font.text(g, S_.name, W / 2, 44, '#ffd23a', { align: 'center', scale: 2, shadow: '#000' }); }
      if (this.card) { panel(g, W / 2 - 150, H / 2 - 50, 300, 90, { rule: '#ffd23a' }); bigTitle(g, 'KERFUFFLE WIN!', W / 2, H / 2 - 44, { scale: 2 }); E.font.wrap('Kerfuffle CC were indebted to a six onto the jumbotron, which now shows, we are told, a very large crack. Lord Thrumpton was seen laughing.', 280).slice(0, 4).forEach((l, k) => E.font.text(g, l, W / 2, H / 2 - 20 + k * 9, '#f4f0e0', { align: 'center' })); }
      if (Math.floor(game.real * 2) % 2) { E.font.text(g, 'DEMO', W / 2, H - 42, '#ff6b6b', { align: 'center', scale: 2, shadow: '#000' }); }
      const w = measureGlyph(game.input, 'confirm'); E.font.text(g, 'PRESS ANY BUTTON', W / 2 + w / 2 + 2, H - 20, '#ffffff', { align: 'center', shadow: '#000' }); glyph(g, game.input, 'confirm', W / 2 - E.font.width('PRESS ANY BUTTON') / 2 - w, H - 17);
    });
  }
};
