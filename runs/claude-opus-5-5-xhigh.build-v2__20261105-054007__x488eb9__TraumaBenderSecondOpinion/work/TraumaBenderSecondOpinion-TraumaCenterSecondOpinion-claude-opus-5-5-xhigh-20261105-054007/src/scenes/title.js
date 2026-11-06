// Title, main menu and difficulty: big, canvas, one idea per screen. Keep the art clear of the top-right, where the engine's corner buttons sit.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, Glyph = G.Glyph;
G.scenes = G.scenes || {};
// the logo, with an ECG trace that draws itself under it and beeps. It works for whatever title was picked: it reads the constants
const logo = (g, W, t, y = 24, compact = false) => {
  E.font.title(g, G.TITLE_MAIN, W / 2, y, { scale: compact ? 3 : W >= 420 ? 4 : 3, align: 'center', colors: ['#e8fff8', '#5ff0e0', '#148c84'], depth: 2, depthColor: '#04232a', outline: '#021418' });
  E.font.text(g, G.TITLE_SUB, W / 2, y + (compact ? 28 : 40), '#ffd36a', { scale: compact ? 1 : 2, align: 'center', outline: false, shadow: '#000' }); if (compact) return;
  const y0 = y + 66, len = Math.min(330, W - 40), x0 = W / 2 - len / 2, u = Math.min(1, t / 1.6), head = x0 + u * len; let py = y0;
  for (let x = 0; x <= len; x += 2) { const X = x0 + x; if (X > head) break; const k = (x % 110) / 110, v = E.clamp ? G.U.beatShape(k * 1.2) : 0; const Y = y0 - v * 14; px.line(g, Math.round(X - 2), Math.round(py), Math.round(X), Math.round(Y), X > head - 12 ? '#ffffff' : '#6cf0a0'); py = Y; }
};
G.drawLogo = logo;
G.scenes.title = {
  view: 'side', camera: { zoom: false, wheel: false },
  enter(d = {}) { const game = G.game; this.t = 0; this.beep = 0; game.weather = { kind: 'rain', amount: .7, wind: .25, lightning: .05 }; G.Music.play('title'); const L = G.Sfx.loop('rain'); if (L) L.set(.022); game.input.consumeAll(); game.focus(0, 0, 0); G.Screen.cursor(game, true); if (game.saves) game.saves.canSave = false; this.demo = !!d.demo; },
  update(dt) {
    const game = G.game, I = game.input; this.t += dt; game.focus(game.W / 2, 0, game.H / 2);
    this.beep -= dt; if (this.t < 1.7 && this.beep <= 0) { this.beep = .4; G.Sfx.beep(90); }
    if (I.pressed('start') || I.pressed('confirm') || (I.clicked() && !G.touchOnly())) { G.Sfx.menuOk(); game.go('menu'); }
  },
  draw(r) {
    G.Stage.draw(r, 'skyline', this.t);
    r.overlay(g => { logo(g, r.W, this.t); const I = G.game.input, y = r.H - 42; const lw = Glyph.width(I, 'start'), tw = E.font.width('Press Start'), x = Math.round(r.W / 2 - (lw + tw + 6) / 2); if (Math.sin(this.t * 3.4) > -.45) { Glyph.action(g, I, 'start', x, y); Pix.text(g, 'Press Start', x + lw + 5, y + 1, '#ffffff'); } E.font.text(g, 'An original work. Not a medical training tool. Please do not.', r.W / 2, r.H - 10, '#6a8a88', { align: 'center', outline: false }); });
  },
};
G.scenes.menu = {
  view: 'side', camera: { zoom: false, wheel: false },
  enter() {
    const game = G.game; this.t = 3; game.weather = { kind: 'rain', amount: .5, wind: .2 }; G.Music.play('title'); const L = G.Sfx.loop('rain'); if (L) L.set(.018); G.Screen.cursor(game, true);
    const hasSave = game.saves.latest && game.saves.latest();
    const items = [{ label: 'Continue', disabled: !hasSave }, 'New Game', 'Case Files', 'Grand Rounds', 'Settings', 'About'];
    this.menu = new E.Menu(game, items, { x: 'center', y: Math.max(52, game.H - 164), scale: 2, rows: 6, box: true, bg: '#06181c', border: '#4fd0c4', pick: '#ffd36a', onMove: () => G.Sfx.menuMove(), sound: false,
      onPick: i => { G.Sfx.menuOk(); if (i === 0) G.Flow.continueGame(); else if (i === 1) game.go('difficulty', {}); else if (i === 2) game.go('casefiles', {}); else if (i === 3) game.go('lobby', {}); else if (i === 4) game.menu('settings'); else if (i === 5) game.go('about', {}); },
      onCancel: () => { G.Sfx.tick(); game.go('title'); } });
  },
  update(dt) { this.t += dt; const game = G.game; game.focus(game.W / 2, 0, game.H / 2); this.menu.update(dt); },
  draw(r) { G.Stage.draw(r, 'skyline', this.t); r.overlay(g => { px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#02060c')); logo(g, r.W, this.t, 8, true); }); this.menu.draw(r); r.overlay(g => { const I = G.game.input, x = 8, y = r.H - 14; if (!I.lastDevice) return; const w = Glyph.action(g, I, 'confirm', x, y); Pix.text(g, 'Select', x + w + 3, y + 1, '#c8e0dc'); const b = Glyph.action(g, I, 'cancel', x + w + 46, y); Pix.text(g, 'Back', x + w + 49 + b, y + 1, '#c8e0dc'); }); },
};
// three big cards, one Quill line each
G.scenes.difficulty = {
  view: 'overhead', camera: { zoom: false, wheel: false },
  enter() { this.t = 0; this.i = 1; G.Screen.cursor(G.game, true); G.game.input.consumeAll(); this.hp = null; this.said = null; G.Music.play('ward'); },
  rects(W, H) { const w = Math.min(130, (W - 40) / 3 | 0), h = 112, gap = 8, x0 = Math.round(W / 2 - (w * 3 + gap * 2) / 2), y = 56; return ['intern', 'resident', 'attending'].map((id, k) => ({ id, x: x0 + k * (w + gap), y, w, h })); },
  update(dt) {
    const game = G.game, I = game.input, R = this.rects(game.W, game.H); this.t += dt; game.focus(game.W / 2, game.H / 2, 0);
    if (I.repeat('left')) { this.i = (this.i + 2) % 3; G.Sfx.menuMove(); } if (I.repeat('right')) { this.i = (this.i + 1) % 3; G.Sfx.menuMove(); }
    const p = I.lastDevice === 'mouse' ? I.pointer() : null; if (p && (!this.hp || p[0] !== this.hp[0] || p[1] !== this.hp[1])) R.forEach((c, k) => { if (p[0] >= c.x && p[0] < c.x + c.w && p[1] >= c.y && p[1] < c.y + c.h && this.i !== k) { this.i = k; G.Sfx.menuMove(); } }); this.hp = p;
    const c = I.clicked(); let go = I.pressed('confirm'); if (c) R.forEach((q, k) => { if (c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) { this.i = k; go = true; } });
    if (this.said !== this.i) { this.said = this.i; this.line = G.DIFFS[R[this.i].id].line; G.Babble.say('quill', this.line.slice(0, 30)); }
    if (go) { G.Sfx.menuOk(); G.Flow.newGame(R[this.i].id); } else if (I.pressed('cancel')) { G.Sfx.tick(); game.go('menu'); }
  },
  draw(r) {
    G.Stage.draw(r, 'scrub', this.t); const W = r.W, H = r.H, R = this.rects(W, H);
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#04121a')); E.font.text(g, 'HOW LONG HAVE YOU BEEN AWAKE?', W / 2, 26, '#ffd36a', { align: 'center', outline: false, shadow: '#000' }); E.font.text(g, 'Difficulty changes between cases.', W / 2, 40, '#a8c8c0', { align: 'center', outline: false });
      R.forEach((c, k) => { const on = k === this.i, d = G.DIFFS[c.id], lift = on ? -3 : 0; Pix.panel(g, c.x, c.y + lift, c.w, c.h, { bg: on ? '#0f3a3c' : '#071c20', alpha: .95, line: on ? '#ffd36a' : '#2c6a68' }); E.font.text(g, d.label, c.x + c.w / 2, c.y + lift + 8, on ? '#ffd36a' : '#e8fbf6', { scale: 2, align: 'center', outline: false, shadow: '#000' }); const who = c.id === 'attending' ? 'sokolova' : 'vale', cv0 = G.bust(who, { expr: c.id === 'intern' ? 'shock' : c.id === 'resident' ? 'neutral' : 'smirk', maskUp: c.id === 'resident', blink: (this.t + k) % 3.2 < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv0, 28, 14, 56, 40, c.x + c.w / 2 - 28, c.y + lift + 24, 56, 40); px.reset(g); } const bits = c.id === 'intern' ? ['Slower bleed', 'More time', 'Hints always'] : c.id === 'resident' ? ['The real thing', 'Paddles once', 'Hints on idle'] : ['Faster bleed', 'Less time', 'No paddles', '★ available']; bits.forEach((b, n) => Pix.text(g, b, c.x + c.w / 2, c.y + lift + 68 + n * 10, '#d8ece8', { align: 'center' })); });
      const cv = G.bust('quill', { expr: 'neutral', blink: (this.t % 3) < .1 ? 1 : 0 }); if (g.drawImage) { g.imageSmoothingEnabled = false; g.drawImage(cv, 28, 16, 56, 62, 4, H - 62, 56, 62); px.reset(g); }
      Pix.panel(g, 62, H - 40, Math.min(W - 70, 354), 34, { alpha: .9 }); Pix.text(g, 'NURSE QUILL', 67, H - 37, '#ffd36a'); E.font.wrap(this.line || '', Math.min(W - 80, 344)).forEach((l, i) => Pix.text(g, l, 67, H - 27 + i * 9, '#ffffff'));
    });
  },
};
})();
