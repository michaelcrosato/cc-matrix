/* =====================================================================================================================
 * TITLE and ATTRACT. The title: the dojo at night, Taro and Mei in kamae bowing now and then, the logo, PRESS START, then
 * the main menu (a live vignette for the focused item). Ten seconds with no input on the title or any menu screen starts
 * the attract mode (any input ends it): an exhibition bout a director steers so it shows every call, a bonus reel, a
 * how-to-fight drill, the high scores and the title, looping. On a touch-only device the title says a controller or a
 * keyboard is required (the corner's settings button stays) and the attract mode still runs.
 * ===================================================================================================================== */
KC.IDLE_SECONDS = 10;
/** any input at all this step: a key or button, a stick past the dead zone, a mouse move or click, a tap */
KC.anyInput = () => KC.inputs().some(I => I.anyPressed() || (I.mouse && I.mouse.t !== I._kcMT && (I._kcMT = I.mouse.t, I._kcSeen ? true : (I._kcSeen = true, false))) || !!I.clicked() || Math.hypot(...(I.padMove || [0, 0])) > .3 || !!I.padAim);
/** the idle clock every menu screen runs: returns true once it reached ten seconds (the caller starts the attract mode) */
KC.idleStep = dt => { if (KC.anyInput()) KC.idle = 0; else KC.idle += dt; return KC.idle >= KC.IDLE_SECONDS; };
const MENU_ABOUT = {
  CONTINUE: 'PICK UP THE ROAD WHERE YOU LEFT IT', 'CHAMPON ROAD': 'FROM WHITE BELT TO CHAMP: 9 MATCHES, 3 BONUS STAGES', VERSUS: 'WHITE VS RED: A FRIEND OR THE CPU. 3-4 JOINED: KACHINUKI',
  DOJO: "SENPAI NEGI'S LESSONS, FREE SPAR, THE MOVE LIST", 'BONUS GAMES': 'BOARDS, POTS AHOY!, STOP THE BULL', RECORDS: 'THE TOP TEN TABLES', OPTIONS: 'DIFFICULTY, REFEREE CALLS, CAMERA, BUTTON SYMBOLS', ABOUT: 'SOURCE, TESTING, ENGINE AND PROMPT NOTES, CREDITS'
};
KC.TitleScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.t = 0; this.menuOn = !!d.menu; KC.idle = 0; KC.Story.active = false; g.timeScale = 1; g.setView('kcside');
    KC.Stage.enter(g, 'dojo'); g.lights.ambient = .4; KC.music('title'); g.audio.duck(false);
    this.a = new KC.Karateka({ fid: 'taro', side: 0, x: 168 }); this.b = new KC.Karateka({ fid: 'mei', side: 1, x: 232 }); for (const f of [this.a, this.b]) f.script('kamae', null);
    this.buildMenu();
  },
  buildMenu() {
    const g = KC.game, auto = g.saves.list ? g.saves.list().find(s => s.slot === 'auto' && !s.empty && !s.damaged) : null, items = [];
    if (auto) items.push({ label: 'CONTINUE', sub: (auto.level || '') + ' - ' + (auto.place || ''), act: () => { if (g.saves.load('auto')) KC.Story.run(); } });
    items.push({ label: 'CHAMPON ROAD', act: () => { KC.Story.newGame(); KC.Story.run(); } }, { label: 'VERSUS', act: () => g.go('versus') }, { label: 'DOJO', act: () => g.go('dojo') },
      { label: 'BONUS GAMES', act: () => g.go('bonusMenu') }, { label: 'RECORDS', act: () => g.go('records') }, { label: 'OPTIONS', act: () => g.menu('settings') }, { label: 'ABOUT', act: () => g.go('about') });
    this.menu = new KC.Menu({ items, y: 92, onCancel: () => { this.menuOn = false; } });
  },
  update(dt) {
    const g = KC.game; this.t += dt; KC.Stage.update(dt);
    if (KC.idleStep(dt) && !g.paused && !(g.shell && g.shell.screen)) { g.go('attract'); return; }
    const touchGate = KC.touchOnly();
    if (!touchGate && !this.menuOn && this.t > .3 && (KC.anyPressed('start') || KC.anyPressed('confirm') || g.input.clicked())) { KC.consumeAll(); KC.sfx('menuOk'); this.menuOn = true; this.buildMenu(); }
    else if (this.menuOn && !(g.shell && g.shell.screen)) this.menu.update(dt);
    // Taro and Mei face each other; a bow every few seconds
    const bow = (this.t % 6) > 4.6 && (this.t % 6) < 5.6;
    for (const f of [this.a, this.b]) { f.spose = bow ? 'bow' : 'kamae'; f.update(dt, f === this.a ? this.b : this.a); f.pose(dt); }
    KC.camera(g, [200]);
  },
  draw(r) {
    KC.Stage.draw(r, 'dojo', {});
    this.a.draw(r); this.b.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, ca = KC.game.cornerArea && KC.game.cornerArea(), top = ca && ca.x0 < W / 2 + 110 ? Math.ceil(ca.y1) : 0;
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, (this.menuOn ? 56 : 78) + top, '#05040a'));
      const yEnd = KC.drawLogo(g, W, (this.menuOn ? 4 : 8) + top, this.t, this.menuOn ? 3 : 4);
      if (KC.touchOnly()) {
        const w = Math.min(W - 30, 300); KC.panel(g, Math.round((W - w) / 2), Math.round(H / 2) - 6, w, 48, null);
        E.font.text(g, KC.TEXT.touchGate, Math.round(W / 2), Math.round(H / 2) + 6, '#ffe7a8', { align: 'center', outline: false, scale: W > 360 ? 2 : 1 });
        E.font.text(g, 'SETTINGS: THE BUTTON AT THE TOP RIGHT', Math.round(W / 2), Math.round(H / 2) + 28, '#c8c0e8', { align: 'center', outline: false });
        return;
      }
      if (!this.menuOn) {
        if (Math.floor(this.t * 2) % 2 === 0) { const dev = KC.device(), parts = dev === 'gamepad' ? ['PRESS ', KC.actionIcon('confirm', KC.game.input, 'gamepad')] : ['PRESS ', KC.actionIcon('start', KC.game.input, 'keyboard')]; const w = KC.iconRow(g, 0, 0, parts, 2, false); KC.iconRow(g, Math.round((W - w) / 2), H - 58, parts, 2); }
        E.font.text(g, (E.versionLabel ? E.versionLabel().replace(/·/g, '-') : 'v' + E.version) + ' - KARATE CHAMPON ' + KC.VERSION, Math.round(W / 2), H - 12, '#6a6488', { align: 'center', outline: false });
        E.font.text(g, 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', Math.round(W / 2), H - 23, '#8a80a8', { align: 'center', outline: false });
      } else {
        this.menu.y = yEnd + 2;
        this.menu.draw(g, W, H);
        const it = this.menu.selected, about = it && (it.sub || MENU_ABOUT[it.label]); if (about) E.font.text(g, about, Math.round(W / 2), H - 34, '#ffe7a8', { align: 'center', outline: '#000' });
        KC.promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      }
      void yEnd;
    });
  }
};

/* ---- ATTRACT ---- */
// the exhibition's director: each exchange a little script, so the demo shows a half point, a full point, an aiuchi, a block
// and a counter sweep, a somersault cross-up, then a time-out decided by the judges
const EXCHANGES = ['half', 'full', 'aiuchi', 'block', 'flip', 'hantei'];
KC.Director = {
  start(sc) { sc.dir = { ex: 0, t: 0, phase: null, step: 0 }; },
  step(sc, dt) {
    const D = sc.dir, b = sc.bout, [W, R] = sc.fighters; if (!b) return;
    if (b.phase !== 'fight') { D.phase = b.phase; D.t = 0; D.step = 0; return; }
    if (D.phase !== 'fight') { D.phase = 'fight'; D.t = 0; D.step = 0; D.kind = EXCHANGES[Math.min(D.ex, EXCHANGES.length - 1)]; D.ex++; if (D.kind === 'hantei') { b.clock = Math.min(b.clock, 6); const m = Math.max(...b.points); b.points = [m, m]; } }
    D.t += dt; const gap = W.gapTo(R), idle = { posture: 'n', press: null }, toward = (f, k = 'f') => ({ posture: KC.scrDir(k, f.face), press: null }), reach = (f, id, k = .8) => f.band(KC.TECH[id])[1] * k;
    const want = (f, id) => { const c = KC.cellOf(id); return { posture: KC.scrDir(c[0], f.face), press: KC.scrDir(c[1], f.face) }; };
    let cw = idle, cr = idle;
    if (D.kind === 'half') { if (gap > reach(W, 'frontKick', .62)) cw = toward(W); else if (!D.step && W.free) { cw = want(W, 'frontKick'); D.step = 1; } }
    else if (D.kind === 'full') { if (gap > reach(R, 'roundKick', .9)) cr = toward(R); else if (!D.step && R.free) { cr = want(R, 'roundKick'); D.step = 1; } }
    else if (D.kind === 'aiuchi') { if (gap > Math.min(reach(W, 'frontKick', .7), reach(R, 'frontKick', .7))) { cw = toward(W); cr = toward(R); } else if (!D.step && W.free && R.free) { cw = want(W, 'frontKick'); cr = want(R, 'frontKick'); D.step = 1; } }
    else if (D.kind === 'block') {
      if (D.step === 0) { if (gap > reach(W, 'midLunge', .8)) cw = toward(W); else if (W.free) { cw = want(W, 'midLunge'); D.step = 1; } }
      else if (D.step === 1 && W.phase === 'wind' && W.k > W.fr[0] - 8 && R.free) { cr = want(R, 'block'); D.step = 2; }
      else if (D.step === 2 && R.free && W.blockedBy) { cr = want(R, gap < 30 ? 'backSweep' : 'frontSweep'); D.step = 3; }
    }
    else if (D.kind === 'flip') {
      if (D.step === 0) { if (gap > 40) cw = toward(W); else if (gap < 28) cw = toward(W, 'b'); else if (W.free) { cw = { posture: 'u', press: KC.scrDir('u', W.face) }; D.step = 1; } }
      else if (D.step === 1 && W.free && W.x > R.x === (W.face > 0)) { D.step = 2; }
      else if (D.step === 2 && W.free) { cw = want(W, 'roundKick'); D.step = 3; }
      else if (D.step === 1 && R.free && D.t > .2 && D.t < .5) cr = want(R, 'roundKick');
    }
    else if (D.kind === 'hantei') { const ph = Math.floor(D.t * 1.5) % 4; cw = ph === 0 ? toward(W) : ph === 2 ? toward(W, 'b') : idle; cr = ph === 1 ? toward(R) : ph === 3 ? toward(R, 'b') : idle; if (Math.floor(D.t * 2) % 5 === 2 && R.free && gap > 50) cr = want(R, 'block'); }
    W.control(cw); R.control(cr);
  }
};
KC.AttractScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter() { this.loop = (this.loop || 0); this.stepI = 0; this.t = 0; KC.game.audio.duck(true); this._begin(); KC.idle = 0; this._armed = false; },
  exit() { KC.game.audio.duck(false); this.sub = null; KC.scene = null; KC.game.timeScale = 1; },
  steps: ['bout', 'bonus', 'howto', 'scores', 'title'],
  _begin() {
    const g = KC.game, step = this.steps[this.stepI], R = KC.rng(this.loop * 97 + 13); this.t = 0; this.sub = null; this.step = step;
    if (step === 'bout') {
      const ids = KC.DATA.roster.map(f => f.id), a = ids[Math.floor(R() * ids.length)], b = ids.filter(x => x !== a)[Math.floor(R() * (ids.length - 1))], st = KC.FIGHT_STAGES[Math.floor(R() * KC.FIGHT_STAGES.length)];
      const sub = Object.create(KC.FightScene); this.sub = sub;
      sub.enter({ mode: 'attract', stage: st, seed: this.loop + 1, sides: [{ fid: a, showcase: true }, { fid: b, showcase: true }], rules: { pointsToWin: 3, roundsToWin: 1, clock: 30 }, director: true, onEnd: () => { this.subDone = true; } });
      KC.Director.start(sub); this.subDone = false; this.limit = 60;
    } else if (step === 'bonus') { const sub = Object.create(KC.BonusScene); this.sub = sub; this.reel = ['boards', 'pots', 'bull']; this.reelI = 0; sub.enter({ id: 'boards', auto: true, done: () => this._nextReel() }); this.limit = 45; }
    else if (step === 'howto') { const sub = Object.create(KC.PracticeScene); this.sub = sub; sub.enter({ lesson: 'lessonAll', demo: true, done: () => { this.subDone = true; } }); this.limit = 30; this.subDone = false; }
    else if (step === 'scores') { this.limit = 6; KC.Stage.enter(g, 'stadium'); }
    else { this.limit = 5; KC.Stage.enter(g, 'dojo'); }
  },
  _nextReel() { this.reelI++; if (this.reelI >= this.reel.length) { this.subDone = true; return; } const sub = Object.create(KC.BonusScene); this.sub = sub; sub.enter({ id: this.reel[this.reelI], auto: true, done: () => this._nextReel(), limit: this.reel[this.reelI] === 'pots' ? 15 : 0 }); },
  _advance() { this.stepI++; if (this.stepI >= this.steps.length) { this.stepI = 0; this.loop++; } this._begin(); },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    if (this._armed && KC.anyInput()) { KC.consumeAll(); KC.game.go('title'); return; }
    this._armed = true;
    if (this.sub) {
      if (this.step === 'bout') { const s = this.sub; s.controls(dt); KC.Director.step(s, dt); KC.fx.step(KC.game, s.fx, dt); s.bout.update(dt); KC.camera(KC.game, s.fighters.map(f => f.x)); }
      else this.sub.update(dt);
    } else KC.camera(KC.game, [200]);
    if (this.subDone && this.step === 'bout' && this.sub.endT === undefined) this.sub.endT = 0;
    if ((this.subDone && (this.step !== 'bout' || (this.sub.endT += dt) > 1.5)) || this.t > this.limit) this._advance();
  },
  draw(r) {
    if (this.sub) this.sub.draw(r);
    else if (this.step === 'scores') { KC.Stage.draw(r, 'stadium', {}); r.overlay(g => KC.drawTable(g, r.W, r.H, 'story', 'HIGH SCORES')); }
    else { KC.Stage.draw(r, 'dojo', {}); r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); KC.drawLogo(g, r.W, 40, this.t, 4); }); }
    r.overlay(g => {
      const W = r.W, H = r.H, blink = Math.floor(KC.game.real * 2) % 2 === 0;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, H - 20, W, 20, '#05040a'));
      if (blink) E.font.text(g, KC.TEXT.demo, Math.round(W / 2), H - 15, '#ffd060', { align: 'center', outline: false, scale: 1 });
      if (KC.touchOnly()) E.font.text(g, KC.TEXT.touchGate, Math.round(W / 2), H - 30, '#ffe7a8', { align: 'center', outline: '#000' });
    });
  },
  debugState() { return { step: this.step, stepI: this.stepI, loop: this.loop, t: this.t }; }
};
/** a top-ten table drawn big: ten rows of NAME SCORE (and the rank reached) */
KC.drawTable = (g, W, H, mode, title) => {
  const T = KC.Save.table(mode), w = Math.min(W - 20, 300), x = Math.round((W - w) / 2), y = 20, rh = Math.min(18, Math.floor((H - 70) / 10));
  KC.panel(g, x, y, w, rh * 10 + 34, title || mode.toUpperCase());
  T.slice(0, 10).forEach((e, i) => {
    const yy = y + 28 + i * rh, c = i === 0 ? '#ffd060' : i < 3 ? '#fff6d0' : '#d8d0e8';
    E.font.text(g, (i + 1) + '.', x + 16, yy, c, { outline: false }); E.font.text(g, e.name, x + 40, yy, c, { outline: false, scale: rh >= 16 ? 2 : 1 });
    E.font.text(g, KC.commas(e.score), x + w - 16 - (e.note ? 70 : 0), yy, c, { align: 'right', outline: false, scale: rh >= 16 ? 2 : 1 }); if (e.note) E.font.text(g, e.note, x + w - 12, yy + 2, '#a8a0c8', { align: 'right', outline: false, font: 'tiny' });
  });
};
