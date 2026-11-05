/* =============================================================================
 * 35-attract: the attract mode. After 10 s with no input on the title or a top
 * menu, a looping highlight reel PLAYED BY THE REAL GAME starts: the CPU on both
 * sides, cheats on (forced pitches and contact, infinite meter), each segment
 * with a time limit so it moves on by itself. DEMO PLAY and PRESS ANY BUTTON
 * (the device used last; TOUCH TO RETURN on touch-only), a caption card between
 * segments. Any input goes back to the title. Never in an AI Hub session.
 * ========================================================================== */
const hitV = (thDeg, phDeg, ev) => { const t = thDeg * Math.PI / 180, p = phDeg * Math.PI / 180; return [ev * Math.cos(p) * Math.sin(t), -ev * Math.cos(p) * Math.cos(t), ev * Math.sin(p)]; };
const script = (list) => (res) => { const s = list.shift(); if (!s) return res; if (s === 'miss') { res.kind = 'miss'; return res; } res.kind = 'contact'; res.v = hitV(s[0], s[1], s[2]); res.Q = .8; res.EV = s[2]; if (s[3]) res.zooka = true; return res; };
BZ.ATTRACT = [
  { caption: 'PLAY BALL!', park: 'kernel', away: 'krakens', home: 'comets', dur: 20,
    setup(M) { M.scriptHit = script([[-62, 20, 420], [14, 9, 620]]); M.forcePitchList = [{ type: 'heater', target: [2, 16] }, { type: 'curve', target: [-3, 14] }, { type: 'heater', target: [0, 17] }]; M.takeFirst = 1; } },
  { caption: 'SUPER PITCHES', park: 'caldera', away: 'comets', home: 'eruptors', dur: 16,
    setup(M) { M.strikes = 2; M.teams[1].meter = 100; M.forcePitchList = [{ slot: 'r1', type: 'meteorheater', target: [0, 17] }, { type: 'heater', target: [0, 17] }]; M.forceMissFirst = true; M.scriptHit = script([[-22, 40, 520]]); BZ.wait(3.5, () => { if (BZ.hazard && BZ.hazard.trigger) { BZ.hazard.state = 'rumble'; BZ.hazard.t = .5; } }); } },
  { caption: 'LEATHER AND LASERS', park: 'barnacle', away: 'comets', home: 'krakens', dur: 20,
    setup(M) { M.bases = [null, BZ.get('teams', 'comets').lineup[1], null]; M.teams[1].meter = 100; M.cheats.surehands = true; M.scriptHit = script([[26, 14, 560], [18, 8, 600]]); M.forcePitchList = [{ type: 'heater', target: [0, 17] }, { type: 'heater', target: [0, 17] }]; BZ.wait(1, () => BZ.hazard && BZ.hazard.trigger && BZ.hazard.trigger(M)); } },
  { caption: 'WHEELS', park: 'kernel', away: 'comets', home: 'haunts', dur: 13,
    setup(M) { M.bases = [BZ.get('teams', 'comets').lineup[1], null, null]; M.forcePitchList = [{ type: 'changeup', target: [9, 22] }, { type: 'heater', target: [0, 17] }]; M.takeFirst = 2; M.attractSteal = true; M.scriptHit = script([[-8, 6, 640]]); } },
  { caption: 'BATZOOKA!', park: 'megadome', away: 'comets', home: 'mechanicals', dur: 22,
    setup(M) { M.teams[0].meter = 100; M.forcePitchList = [{ type: 'heater', target: [0, 17] }]; M.scriptHit = script([[0, 30, 1300, true]]); M.armZooka = true; } },
  { caption: 'RHUBARB!', park: 'caldera', away: 'comets', home: 'eruptors', dur: 18,
    setup(M) { M.forcePitchList = [{ type: 'heater', target: [-16, 18], q: 1 }]; M.script = { rhubarbOnHbp: true }; } },
  { caption: 'SIX WILD PARKS', park: 'tranquility', away: 'comets', home: 'meteors', dur: 15,
    setup(M) { M.forcePitchList = [{ type: 'heater', target: [0, 17] }]; M.scriptHit = script([[4, 36, 880]]); BZ.wait(2.5, () => BZ.hazard && BZ.hazard.trigger && BZ.hazard.trigger(M)); } },
  { caption: 'SIX WILD PARKS', park: 'boneyard', away: 'comets', home: 'haunts', dur: 15,
    setup(M) { M.strikes = 1; M.teams[1].meter = 100; M.forcePitchList = [{ slot: 'r1', type: 'banshee', target: [0, 15] }, { type: 'heater', target: [0, 17] }]; M.forceMissFirst = true; M.scriptHit = script([[-10, 38, 760]]); } },
  { caption: '1-4 PLAYERS  ·  PLAY ONLINE IN AI HUB', derby: true, park: 'megadome', dur: 16 },
  { caption: 'MOONSHOT LEADERS', leaders: true, dur: 9 }
];
BZ.attract = {
  on: false, seg: 0, t: 0, card: 0,
  start() {
    if (BZ.hubActive) return;
    this.on = true; this.seg = 0; this.loops = (this.loops || 0); BZ.idle = 0;
    BZ.bus.emit('attract', { on: true });
    this.run();
  },
  stop() {
    if (!this.on) return;
    this.on = false; BZ.idle = 0;
    BZ.game.timeScale = TUNE.gameSpeed;
    for (const I of BZ.game.players) I.consumeAll();
    BZ.bus.emit('attract', { on: false });
    BZ.game.go('title', null, { fade: .2 });
  },
  run() {
    const S = BZ.ATTRACT[this.seg % BZ.ATTRACT.length], g = BZ.game;
    this.t = 0; this.card = 2.2; this.segT = 0;
    BZ.bus.emit('attractSegment', { i: this.seg % BZ.ATTRACT.length, caption: S.caption });
    if (S.leaders) { g.go('attractCard', { caption: S.caption }, { fade: .2 }); return; }
    if (S.derby) { g.go('derby', { players: 1, park: S.park, bots: true, attract: true, onDone: () => this.next() }, { fade: .2 }); return; }
    BZ.startMatch({ mode: 'attract', attract: true, away: S.away, home: S.home, park: S.park, innings: 9, difficulty: 'allstar', cpuLevel: 'allstar', humans: { 0: [], 1: [] }, seed: 77 + this.seg, mercy: false,
      cheats: { infMeter: false, surehands: false }, onInstall: M => { S.setup(M); M.attract = true; this.M = M; }, onStep: (M, dt) => this.step(M, dt, S), onFinal: () => this.next() }, { fade: .2 });
  },
  next() { if (!this.on) return; this.seg++; if (this.seg % BZ.ATTRACT.length === 0) this.loops = (this.loops || 0) + 1; this.run(); },
  /** each step of a demo match: feed the forced pitches, the steal, the Batzooka; move on at the time limit */
  step(M, dt, S) {
    this.segT += dt; this.card = Math.max(0, this.card - dt);
    if (M.phase === 'atBat' && M.ab && M.ab.sub === 'select' && M.ab.t < dt * 1.5) {
      const fp = M.forcePitchList && M.forcePitchList.shift(); if (fp) M.forcePitch = Object.assign({ q: .9 }, fp);
      if (M.takeFirst) { M.cheats.autoBatter = 'take'; M.takeFirst--; } else M.cheats.autoBatter = null;
      if (M.forceMissFirst) { M.forceContact = 'miss'; M.forceMissFirst = false; }
      if (M.attractSteal && M.bases[0]) { M.steals[1] = true; M.attractSteal = false; }
      if (M.armZooka) { M.teams[0].meter = 100; BZ.supers.arm(M, 0); M.armZooka = false; }
    }
    if (M.phase === 'inPlay') for (const r of M.runners) if (Math.abs(Math.round(r.goal) - r.p) * 300 < 38 && r.state === 'run' && r.steal) r.headfirst = true;
    // the segment's time limit (a home run's cinematic gets to finish)
    if (this.segT > S.dur && !M.cinematic && !BZ.cams.moon && !BZ.cams.replay && !BZ.talk.cutscene) this.next();
  },
  /** any input returns to the title (checked by the scenes the reel runs in) */
  check(game) { if (this.on && BZ.anyInput(game) && this.segT > .25) { this.stop(); return true; } return false; },
  overlay(g, r) {
    if (!this.on) return;
    const S = BZ.ATTRACT[this.seg % BZ.ATTRACT.length];
    E.ui.box(g, 8, r.H - 42, 96, 16, { bg: ['#3a0a0a', '#1a0404'], border: '#ff5a5a', alpha: .9 });
    E.font.text(g, 'DEMO PLAY', 56, r.H - 38, '#ffffff', { align: 'center' });
    const blink = Math.floor(BZ.game.real * 2) % 2;
    if (blink) {
      if (BZ.touchOnly) E.font.text(g, 'TOUCH TO RETURN', r.W / 2, r.H - 20, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      else { const I = BZ.game.input, dev = I.lastDevice; BZ.drawPrompts(g, I, [[dev === 'mouse' ? 'south' : dev === 'gamepad' ? 'south' : 'confirm', 'PRESS ANY BUTTON', true]], r.W / 2, r.H - 22, { align: 'center' }); }
    }
    if (this.card > 0) {
      const a = Math.min(1, this.card * 2, (2.2 - this.card) * 4);
      px.blend(g, .85 * a, 'normal', () => E.ui.box(g, r.W / 2 - 140, r.H * .38, 280, 34, { bg: ['#2a1a48', '#120a24'], border: '#ffd040' }));
      if (a > .5) E.font.title(g, S.caption, r.W / 2, r.H * .38 + 9, { scale: S.caption.length > 20 ? 1 : 2, align: 'center', colors: ['#fff6c0', '#ffb030'] });
    }
  }
};
/** the attract mode's own card scene: the Moonshot Leaders table, then the logo and PRESS START */
BZ.scenes.attractCard = {
  enter(d) { this.t = 0; this.d = d; },
  update(dt) {
    const g = BZ.game; this.t += dt; BZ.inputTick(g, dt);
    BZ.attract.segT = this.t;
    if (BZ.attract.check(g)) return;
    if (this.t > 9) BZ.attract.next();
  },
  draw(r) {
    BZ.menuBg(r, this.t);
    r.overlay(g => {
      if (this.t < 5.5) BZ.drawLeaders(g, r, 30);
      else { BZ.title(g, r, r.H * .25, 4); if (Math.floor(this.t * 2) % 2) E.font.text(g, 'PRESS START', r.W / 2, r.H * .7, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); }
      BZ.attract.overlay(g, r);
    });
  }
};
