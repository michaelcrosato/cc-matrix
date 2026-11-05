/* ---------- title, main menu, touch gate, idle timer ---------- */
KC.idle = { t: 0 };
KC.touchGate = () => {
  const g = KC.game; if (KC._gateLifted) return false;
  let fine = true, pts = 0; try { fine = typeof matchMedia === 'function' ? matchMedia('(any-pointer: fine)').matches : true; pts = (typeof navigator !== 'undefined' && navigator.maxTouchPoints) || 0; } catch (e) { /* keep defaults */ }
  const pad = typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(p => p);
  return !fine && pts > 0 && !pad;
};
KC.scenes.title = {
  view: 'side', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    const g = KC.game; this.stage = new Stage('dojo'); this.stage.d = Object.assign({}, this.stage.d, { ambient: .32 }); this.t = 0; this.screen = d && d.menu ? 'menu' : 'press'; KC.idle.t = 0; g.follow(null); g.cam.bounds = null;
    this.taro = KC.makeRig(KC.FIGHTER.taro, 0, 'white'); this.mei = KC.makeRig(KC.FIGHTER.mei, 1, 'black5'); this.bowT = 0;
    KC.music('title'); g.input.touchEnabled = false; KC.input && 0; this.buildMenu(); this.qs = null; KC.current = this;
  },
  buildMenu() {
    const has = KC.save.has(), S = KC.Story;
    const items = [];
    if (has) items.push({ label: 'CONTINUE', sub: KC.save.summary(), onPick: () => S.continueGame() });
    items.push({ label: 'CHAMPON ROAD', sub: 'THE STORY: WHITE BELT TO CHAMP', onPick: () => S.newGame() });
    items.push({ label: 'VERSUS', sub: '2 PLAYERS, OR PLAY A CPU', onPick: () => KC.game.go('versusSetup') });
    items.push({ label: 'DOJO', sub: 'LESSONS, FREE SPAR, MOVE LIST', onPick: () => KC.game.go('dojoMenu') });
    items.push({ label: 'BONUS GAMES', sub: 'BOARDS, POTS, BULL', onPick: () => KC.game.go('bonusMenu') });
    items.push({ label: 'RECORDS', sub: 'THE TOP TEN', onPick: () => KC.game.go('records') });
    items.push({ label: 'OPTIONS', sub: 'SETTINGS AND CONTROLS', onPick: () => KC.game.menu('settings') });
    items.push({ label: 'ABOUT', sub: 'CREDITS AND SOURCE INFORMATION', onPick: () => KC.game.go('about') });
    this.menu = new Menu(items, { y: r => Math.round(r.H * .43), scale: 2, gap: 1, max: 5, onCancel: () => { this.screen = 'press'; } });
  },
  update(dt) {
    const g = KC.game, I = g.input; this.t += dt; this.bowT += dt;
    const gate = KC.touchGate(); this.gate = gate; if (!gate && KC._touchOnly) KC._touchOnly = false;
    if (KC.anyInput(g)) { KC.idle.t = 0; if (gate && g.input.lastDevice !== 'touch') { /* a real key or pad lifts the gate */ KC._gateLifted = true; } } else KC.idle.t += dt;
    if (KC.idle.t >= 10 && !SESSION) { KC.idle.t = 0; g.go('attract'); return; }
    this.stage.update(dt);
    const bow = Math.floor(this.bowT / 3) % 2;
    this.taro.update(dt, { x: 85, y: 0, z: 0, facing: 0, vx: 0, vy: 0, stance: 'guard', pose: (this.bowT % 6) > 5 ? 'crouch' : undefined });
    this.mei.update(dt, { x: 315, y: 0, z: 0, facing: Math.PI, vx: 0, vy: 0, stance: 'guard', pose: (this.bowT % 6) > 5 ? 'crouch' : undefined });
    g.focus(200, 0, 50);
    if (gate) { if (g.input.pressed('start') || g.input.pressed('confirm')) { /* nothing: the gate lifts only on keyboard or pad */ } return; }
    if (this.screen === 'press') { if (I.pressed('start') || I.pressed('confirm') || I.clicked()) { I.consumeAll(); KC.sfx('menuOk'); this.screen = 'menu'; } }
    else this.menu.update(dt);
  },
  draw(r) {
    const g = KC.game;
    this.stage.draw(r);
    r.actor(85, 0, 0, (gg, ox, oy) => this.taro.draw(gg, ox, oy, r.view)); r.actor(315, 0, 0, (gg, ox, oy) => this.mei.draw(gg, ox, oy, r.view));
    r.overlay(gg => {
      const W = r.W, cx = W / 2, t = this.t;
      px.blend(gg, .35, 'normal', () => px.rect(gg, 0, 0, W, r.H, '#07060d'));
      E.font.title(gg, 'KARATE', cx, 10, { scale: 4, align: 'center', colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      const LC = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], wA = E.font.width('CHAMP', { scale: 4 }), wN = E.font.width('N', { scale: 4 }), gap = 30, tot = wA + gap + wN + 6, lx = Math.round(cx - tot / 2), by = 52;
      E.font.title(gg, 'CHAMP', lx, by, { scale: 4, align: 'left', colors: LC, depth: 3 }); E.font.title(gg, 'N', lx + wA + gap + 6, by, { scale: 4, align: 'left', colors: LC, depth: 3 });
      // the O of CHAMPON is a noodle bowl with chopsticks and rising steam
      const bx = lx + wA + 4, bb = by + 6; px.rect(gg, bx, bb + 10, 26, 14, '#10101c'); px.rect(gg, bx + 1, bb + 11, 24, 12, '#f4f0e0'); px.rect(gg, bx + 1, bb + 11, 24, 3, '#d8402a'); px.ell(gg, bx + 13, bb + 10, 12, 4, '#f0b040'); px.ell(gg, bx + 13, bb + 10, 9, 2, '#ffe090'); px.rect(gg, bx + 6, bb + 24, 14, 3, '#c8c0a8');
      px.line(gg, bx + 4, bb - 8, bx + 20, bb + 9, '#2a1a12', 2); px.line(gg, bx + 8, bb - 8, bx + 24, bb + 7, '#6a3a22', 2);
      for (let k = 0; k < 3; k++) { const a = (t * .8 + k * .33) % 1; px.blend(gg, (1 - a) * .7, 'normal', () => px.disc(gg, Math.round(bx + 6 + k * 7 + Math.sin(a * 6 + k) * 2), Math.round(bb + 6 - a * 22), 2, '#fff')); }
      KC.text(gg, "TWO STICKS. ONE CLEAN STRIKE.", cx, 84, '#ffe8a0', { align: 'center' });
      if (this.gate) {
        KC.panel(gg, cx - 140, r.H / 2 - 4, 280, 44); KC.title(gg, 'CONTROLLER OR KEYBOARD REQUIRED', cx, r.H / 2 + 8, 1);
        KC.text(gg, 'TOUCH CONTROLS ARE NOT SUPPORTED. SETTINGS: TOP RIGHT.', cx, r.H / 2 + 26, '#cfc8e8', { align: 'center' });
        return;
      }
      if (this.screen === 'press') {
        if (Math.floor(t * 2) % 2 === 0) { const lab = 'PRESS '; const w = E.font.width(lab, { scale: 2 }) + 18; E.font.text(gg, lab, cx - w / 2 + 1, Math.round(r.H * .52), '#fff6d0', { scale: 2, shadow: '#000', outline: false }); KC.glyphAction(gg, 'start', Math.round(cx - w / 2 + E.font.width(lab, { scale: 2 }) + 4), Math.round(r.H * .52) - 1, 15); }
        KC.text(gg, 'ENGINE MY-3D2DGE V' + E.version + '   GAME ' + KC.VERSION, cx, r.H - 12, '#7a6aa8', { align: 'center' });
      }
    });
    if (this.screen === 'menu' && !this.gate) { this.menu.draw(r); KC.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }
  }
};
