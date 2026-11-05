/* 54-results: the match scene, match results, the day-end card, the vacation results and the credits roll. */
G.SCENES = G.SCENES || {};
/** start a match: cfg as G.Match takes it, plus after(result) for where to go next */
G.startMatch = (cfg, o = {}) => { G.matchCfg = cfg; G.go('match', { cfg }, o.fade === undefined ? { fade: 'iris', seconds: .5 } : o); };
G.SCENES.match = {
  pausable: true, view: 'court', input: G.INPUT.MATCH, camera: { zoom: [.85, 1.25] },
  enter(d) {
    const cfg = d.cfg;
    G.M = new G.Match(cfg); G.UI.theme = cfg.tod === 'night' ? 'night' : 'day';
    G.applyLight(cfg.tod, cfg.weather); G.game.weather = cfg.weather === 'rain' ? { kind: 'rain', amount: .7, wind: .2 } : null;
    G.music(cfg.final ? 'house' : 'spike', { restart: true }); G.ambience.set('crowd');
    G.game.cam.bounds = null; G.tips = [];
  },
  exit() { G.game.cam.frame(null); G.game.setZoom(1); G.game.audio.layer('rally', 0, .2); G.game.weather = null; },
  update(dt) {
    const M = G.M; if (!M) return;
    M.update(dt); G.ambience.update(dt);
    if (M.phase === 'end' && M.phT > (M.spectacle ? 1.5 : 2.8) && !M.left) { M.left = true; if (M.cfg.after) M.cfg.after(M.result, M); else G.go('results', { M }); }
  },
  draw(r) { if (G.M) { G.M.draw(r); G.drawTips(r); } }
};
/* ---- match results: the winners pose, three big stat cards, the MVP; vacation money and hearts; what next ---- */
G.SCENES.results = {
  view: 'court', input: G.INPUT.MENU,
  enter(d) {
    this.d = d; this.M = d.M; this.t = 0; this.focus = new G.Focus(); this.count = 0;
    this.buttons = d.buttons || [['Rematch', () => G.startMatch(this.M.cfg)], ['Change setup', () => G.go('exhibition')], ['Title', () => G.go('title')]];
    G.music(null); if (this.M) G.sting(this.M.humanSide < 0 || this.M.winner === this.M.humanSide ? 'win' : 'lose');
  },
  layout() {
    const W = G.game.W, H = G.game.H, n = this.buttons.length, bw = 92, gap = 8, x0 = Math.round(W / 2 - (n * bw + (n - 1) * gap) / 2);
    return this.buttons.map((b, k) => ({ x: x0 + k * (bw + gap), y: Math.round(H * .86), w: bw, h: 18, id: k, label: b[0] }));
  },
  update(dt) {
    this.t += dt; const M = this.M; if (M) { M.clock += dt; M.aclock = M.clock; for (const p of M.players) p.update(dt); M.camera(); }
    if (this.d.prize) this.count = Math.min(this.d.prize, this.count + this.d.prize * dt * .8);
    if (G.game.input.pressed('snap') && G.canPhoto()) G.photo.open();
    const f = this.focus.set(this.layout()).update();
    if (this.t < .6) return;
    if (f.pick) this.buttons[f.pick.id][1]();
  },
  draw(r) {
    const M = this.M; if (M) { M.phase = 'end'; M.draw(r); }
    r.overlay(g => {
      const W = r.W, H = r.H, win = M && (M.humanSide < 0 ? M.winner : M.winner === M.humanSide);
      const title = M ? (M.humanSide < 0 ? (M.winner ? 'RIGHT SIDE WINS' : 'LEFT SIDE WINS') : win ? 'VICTORY!' : 'DEFEAT') : 'RESULTS';
      px.blend(g, .55, 'normal', () => px.rect(g, 0, Math.round(H * .3) - 8, W, Math.round(H * .52), '#061a24'));
      E.font.title(g, title, W / 2, Math.round(H * .3) - 4, { scale: 3, colors: win ? ['#fff7d6', '#ffd36a', '#ff9e5e'] : ['#ffffff', '#b8c8d8', '#7a8aa0'], align: 'center', depth: 2 });
      if (M) {
        const fs = M.result ? M.result.finalScore : M.score;
        E.font.text(g, (M.setsToWin > 1 ? 'Sets ' + M.sets[0] + '–' + M.sets[1] + '   ' : '') + 'Final ' + fs[0] + ' – ' + fs[1], W / 2, Math.round(H * .3) + 22, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const side = M.humanSide < 0 ? M.winner : M.humanSide, mine = M.players.filter(p => p.side === side);
        const cards = [['POINTS', mine.reduce((a, p) => a + p.stats.points, 0)], ['KILLS', mine.reduce((a, p) => a + p.stats.kills, 0)], ['LONGEST RALLY', M.longest + ' touches']];
        const cw = 84, x0 = Math.round(W / 2 - (cards.length * cw + 16) / 2);
        cards.forEach(([l, v], k) => { const x = x0 + k * (cw + 8), y = Math.round(H * .3) + 36; G.UI.panel(g, x, y, cw, 34); E.font.text(g, String(v), x + cw / 2, y + 5, '#ffd36a', { scale: 2, align: 'center', shadow: '#000', outline: false }); E.font.text(g, l, x + cw / 2, y + 23, '#9fd3d6', { align: 'center', outline: false }); });
        const mvp = M.players[M.result ? M.result.mvp : 0], my = Math.round(H * .3) + 76;
        G.portrait(g, mvp.id, Math.round(W / 2) - 70, my, 26); E.font.text(g, 'MVP  ' + mvp.name.toUpperCase(), Math.round(W / 2) - 38, my + 3, '#ffd36a', { shadow: '#000', outline: false });
        E.font.text(g, mvp.stats.points + ' pts • ' + mvp.stats.kills + ' kills • ' + mvp.stats.aces + ' aces • ' + mvp.stats.blocks + ' blocks • ' + mvp.stats.digs + ' digs', Math.round(W / 2) - 38, my + 14, '#fff8e8', { shadow: '#000', outline: false });
      }
      if (this.d.prize !== undefined) { const y = Math.round(H * .3) + 108; G.UI.money(g, Math.round(W / 2) - 60, y, this.count); }
      if (this.d.aff) { const a = this.d.aff, y = Math.round(H * .3) + 108; G.portrait(g, a.id, Math.round(W / 2) + 30, y - 2, 18, { frame: false }); G.UI.hearts(g, Math.round(W / 2) + 52, y + 4, a.to); E.font.text(g, (a.d >= 0 ? '+' : '') + a.d, Math.round(W / 2) + 112, y + 4, a.d >= 0 ? '#7cff5a' : '#ff7a7a', { shadow: '#000', outline: false }); }
      const L = this.layout(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    const bar = [['confirm', 'Select']]; if (G.canPhoto()) bar.push(['snap', 'Postcard']);
    G.promptBar(r, bar, G.game.input, Math.round(r.H * .86) + 24);
  }
};
/* ---- the day-end card: money earned and spent, matches, affinity changes, tomorrow's weather; then sleep ---- */
G.SCENES.dayend = {
  input: G.INPUT.MENU,
  enter() { const S = G.state; this.t = 0; this.snap = { earned: S.earnedToday, spent: S.spentToday, played: S.playedToday.length, aff: G.npcs().map(id => [id, S.affinity[id] - (S.affStart[id] === undefined ? S.affinity[id] : S.affStart[id])]), day: S.day }; G.music('siesta'); G.UI.theme = 'night'; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.t > .8 && (I.pressed('confirm') || I.clicked())) {
      const S = G.state; if (S.day >= G.DAYS) { G.go('credits'); return; }
      G.nextDay(); G.go('map', null, { fade: .6 });
    }
  },
  draw(r) {
    G.backdrop('night').draw(r); const S = G.state, s = this.snap;
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(320, W - 30), x = Math.round(W / 2 - w / 2), y = Math.round(H * .1);
      G.UI.panel(g, x, y, w, Math.round(H * .76));
      G.UI.title(g, 'DAY ' + s.day + ' IS OVER', W / 2, y + 8, { scale: 2 });
      E.font.text(g, 'Earned  ' + G.fmtMoney(s.earned), x + 14, y + 34, '#7cff5a', { outline: false }); E.font.text(g, 'Spent  ' + G.fmtMoney(s.spent), x + w / 2, y + 34, '#ff9e5e', { outline: false });
      E.font.text(g, 'Matches played: ' + s.played + '   Money now: ' + G.fmtMoney(S.money), x + 14, y + 46, '#fff8e8', { outline: false });
      s.aff.forEach(([id, d], k) => { const xx = x + 14 + (k % 3) * Math.round((w - 20) / 3), yy = y + 62 + Math.floor(k / 3) * 30; G.portrait(g, id, xx, yy, 22); E.font.text(g, (d > 0 ? '↑ +' : d < 0 ? '↓ ' : '• ') + d, xx + 26, yy + 2, d > 0 ? '#7cff5a' : d < 0 ? '#ff7a7a' : '#9fd3d6', { outline: false }); G.UI.hearts(g, xx + 26, yy + 12, S.affinity[id]); });
      if (s.day < G.DAYS) { const w2 = G.WEATHER_TABLE[s.day + 1][0]; E.font.text(g, 'Tomorrow:', x + 14, y + 130, '#9fd3d6', { outline: false }); G.UI.weatherIcon(g, x + 64, y + 128, w2); E.font.text(g, G.cap(w2) + (s.day + 1 === 5 ? ' • the Fortuna Cup!' : s.day + 1 === 4 ? ' • the Semifinal' : ''), x + 76, y + 130, '#fff8e8', { outline: false }); }
      if (S.partner && S.lostToday && G.aff(S.partner) < 35) E.font.text(g, G.CAST[S.partner].short + ' is thinking about leaving your team...', W / 2, y + 146, '#ff7a7a', { align: 'center', outline: false });
    });
    G.promptBar(r, [['confirm', 'Sleep']]);
  }
};
/* ---- the credits: the postcard slideshow and the party photo, with the credits ---- */
G.CREDITS = ['AHEAD OR ALIVE', 'XTREME BEACH VOLLEYBALL', '', 'An original parody-tribute to', 'Dead or Alive Xtreme Beach Volleyball', '', 'Design, code, art, music and writing', 'Claude (claude-opus-5-5)', '', 'Engine', 'my-3D2dge v0.85.2', '', 'Starring', 'Rin Takamine • Lola Vega • Ingrid Halvorsen', 'Amara Okafor • Tess Callahan • Mei-Lin Zhou', '', 'and', 'Sonny Fortuna as himself', 'Pepper Quill as the house', '', 'Kai • Odette • Coach Bo', '', 'Thank you for vacationing', 'on Isla Fortuna'];
G.SCENES.credits = {
  input: G.INPUT.MENU,
  enter() { this.t = 0; this.album = G.albumAll(); this.imgs = []; G.music('farewell'); for (const s of this.album) if (s.img && typeof Image !== 'undefined') { const im = new Image(); im.src = s.img; this.imgs.push([im, s]); } else this.imgs.push([null, s]); },
  update(dt) { this.t += dt; const I = G.game.input; if (this.t > 26 || (this.t > 1 && (I.pressed('confirm') || I.pressed('cancel') || I.clicked()))) G.go(G.state ? 'vresults' : 'title'); },
  draw(r) {
    G.backdrop('sunset').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.imgs.length) { const k = Math.floor(this.t / 3) % this.imgs.length, [im, s] = this.imgs[k], w = Math.round(W * .46), h = Math.round(w * H / W), x = Math.round(W * .06), y = Math.round(H / 2 - h / 2); E.ui.box(g, x - 3, y - 3, w + 6, h + 6, { bg: '#fff8e8', border: '#c8502a' }); if (im && im.complete && im.width) g.drawImage(im, x, y, w, h); else G.drawPostcardArt(g, x, y, w, h, s); }
      const y0 = Math.round(H - this.t * 16);
      G.CREDITS.forEach((l, k) => { const y = y0 + k * 14; if (y > -10 && y < H) E.font.text(g, l, Math.round(W * .76), y, k < 2 ? '#ffd36a' : '#fff8e8', { align: 'center', shadow: '#000', outline: false }); });
    });
  }
};
/* ---- the vacation results: a report card and a title, then New Vacation+ ---- */
G.SCENES.vresults = {
  input: G.INPUT.MENU,
  enter() {
    const S = G.state; this.t = 0; this.focus = new G.Focus(); G.music('sunrise');
    const best = G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0], bests = G.npcs().filter(id => G.aff(id) >= 80).length, goods = G.npcs().filter(id => G.aff(id) >= 60).length;
    this.title = S.flags.wonFinal && bests >= 3 ? 'Island Icon' : S.flags.wonFinal ? 'Fortuna Champion' : goods >= 3 ? 'Social Butterfly' : 'Beach Bum'; this.best = best;
    G.unlock(S.wardrobe.suits, true);
  },
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .86); return [{ id: 'ng', label: 'New Vacation+', x: Math.round(W / 2) - 110, y, w: 104, h: 18 }, { id: 'title', label: 'Title', x: Math.round(W / 2) + 6, y, w: 104, h: 18 }]; },
  update(dt) { this.t += dt; const f = this.focus.set(this.items()).update(); if (!f.pick || this.t < .6) return; if (f.pick.id === 'ng') G.newVacationFlow(true); else { G.go('title'); } },
  draw(r) {
    const S = G.state, st = S.stats; G.backdrop('morning').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(340, W - 20), x = Math.round(W / 2 - w / 2), y = Math.round(H * .05);
      G.UI.panel(g, x, y, w, Math.round(H * .78)); G.UI.title(g, 'VACATION RESULTS', W / 2, y + 6, { scale: 2 });
      E.font.title(g, this.title.toUpperCase(), W / 2, y + 26, { scale: 2, colors: ['#ffffff', '#5ff0ff', '#2a8ad8'], align: 'center', depth: 1 });
      const rows = [['Money earned', G.fmtMoney(st.earned)], ['Matches', st.wins + ' W • ' + (st.matches - st.wins) + ' L'], ['Swimsuits', S.wardrobe.suits.length + ' / 21'], ['Gifts given', st.gifts], ['Best Pool Hop', st.poolBest ? st.poolBest.toFixed(1) + ' s' : '-'], ['Casino', (st.casinoNet >= 0 ? '+' : '') + st.casinoNet + ' chips'], ['Postcards', S.album.length], ['The Fortuna Cup', S.flags.wonFinal ? 'WON' : 'lost']];
      rows.forEach(([k, v], i) => { const xx = x + 14 + (i % 2) * Math.round(w / 2), yy = y + 52 + Math.floor(i / 2) * 22; E.font.text(g, k, xx, yy, '#9fd3d6', { outline: false }); E.font.text(g, String(v), xx, yy + 10, '#fff8e8', { outline: false }); });
      G.portrait(g, this.best, x + 14, y + 142, 30); E.font.text(g, 'Best friend: ' + G.CAST[this.best].name, x + 50, y + 146, '#ffd36a', { outline: false }); G.UI.hearts(g, x + 50, y + 158, G.aff(this.best));
      E.font.text(g, 'Every swimsuit is unlocked for Beach Match.', W / 2, y + 180, '#7cff5a', { align: 'center', outline: false });
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
  }
};
