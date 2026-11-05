/* 54-results: the end of a day (a summary card: money earned and spent, matches, affinity changes by each portrait,
 * tomorrow's weather, a partner who left, the other pairs' results), the credits (a slideshow of your postcards and the
 * party photo) and the vacation's results (a report card, a title, unlocks, New Vacation+). */
G.scenes.dayend = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.sum = G.dayEnd(); this.t = 0; this.nav = new G.Nav(); G.music('siesta'); G.themeName = 'night'; G.applyLight('night'); },
  items() { const W = G.game.W, H = G.game.H; return [{ id: 'go', x: Math.round(W / 2 - 50), y: Math.round(H * .9) - 18, w: 100, h: 18, label: 'Next morning', primary: true, onPress: () => { G.dayStart(); G.game.go('map', null, { fade: 'white', seconds: .5 }); } }]; },
  update(dt) { this.t += dt; if (this.t > .6) this.nav.update(this.items(), G.game.input); G.titleWorld.update(dt); },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'night' });
    r.overlay(g => {
      const S = this.sum, W = r.W, H = r.H, st = G.state; px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, W, H, '#100820'));
      G.ui.title(g, 'DAY ' + S.day + ' IS OVER', W / 2, Math.round(H * .05), { scale: 2, colors: ['#ffffff', '#c8b0e0', '#7a5a92'] });
      const x = Math.round(W * .1), w = Math.round(W * .8), y = Math.round(H * .17);
      G.ui.panel(g, x, y, w, Math.round(H * .66), { theme: 'night' });
      E.font.text(g, 'Earned', x + 12, y + 10, '#9fd3d6', { outline: false }); G.ui.money(g, x + 60, y + 9, S.earned);
      E.font.text(g, 'Spent', x + 12, y + 22, '#9fd3d6', { outline: false }); G.ui.money(g, x + 60, y + 21, S.spent);
      E.font.text(g, 'Matches today: ' + S.matches, x + 12, y + 34, '#fff8e8', { outline: false });
      E.font.text(g, 'Money now', x + w - 110, y + 10, '#9fd3d6', { outline: false }); G.ui.money(g, x + w - 110, y + 21, st.money);
      if (S.tomorrow) { E.font.text(g, 'Tomorrow:', x + w - 110, y + 34, '#9fd3d6', { outline: false }); G.icon(g, S.tomorrow === 'rain' ? 'rain' : S.tomorrow === 'cloudy' ? 'cloudy' : S.tomorrow === 'golden' ? 'sunset' : 'sunny', x + w - 58, y + 34); E.font.text(g, S.tomorrow === 'golden' ? 'golden' : S.tomorrow, x + w - 48, y + 34, '#fff8e8', { outline: false }); }
      G.npcs(st).forEach((id, i) => {
        const xx = x + 12 + (i % 5) * Math.round((w - 24) / 5), yy = y + 52;
        G.portrait(g, G.portraitRig(id), xx, yy, 26, { frame: false }); const d = S.changes[id] || 0;
        E.font.text(g, d > 0 ? '↑ +' + d : d < 0 ? '↓ ' + d : '·', xx + 13, yy + 30, d > 0 ? '#9ff3a8' : d < 0 ? '#ff9a8a' : '#9fd3d6', { align: 'center', outline: false }); G.ui.hearts(g, xx - 10, yy + 41, st.affinity[id]);
      });
      let ly = y + 108;
      if (S.left) { E.font.text(g, G.CAST[S.left].name + ' left your team after today\'s loss. Find a new partner tomorrow.', x + 12, ly, '#ff9a8a', { outline: false, wrap: w - 24 }); ly += 20; }
      for (const [a, b, aw] of S.results) { E.font.text(g, 'Off-court: ' + a.map(G.castName).join(' & ') + (aw ? ' beat ' : ' lost to ') + b.map(G.castName).join(' & '), x + 12, ly, '#c8b0e0', { outline: false }); ly += 11; }
      this.nav.draw(g, this.items());
    });
  }
};
G.scenes.credits = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.t = 0; this.i = 0; this.done = false; G.music('farewell'); this.cards = (G.state && G.state.album.length ? G.state.album.slice(-8) : []); this.lines = ['AHEAD OR ALIVE', 'XTREME BEACH VOLLEYBALL', '', 'Design, code, art, music, writing', 'Claude (Anthropic, claude-opus-5-5)', '', 'Engine', 'my-3D2dge v0.85.2', '', 'Motion clips', 'Quaternius · Mesh2Motion · CMU mocap', '', 'Starring', 'Rin · Lola · Ingrid · Amara · Tess · Mei', 'Sonny Fortuna as himself', 'Pepper Quill as the House', 'Kai · Odette · Coach Bo', '', 'An original parody-tribute to', 'Dead or Alive Xtreme Beach Volleyball', '', 'Thanks for visiting Isla Fortuna!']; },
  update(dt) { this.t += dt; const I = G.game.input; if (this.t > 2 && (I.pressed('confirm') || I.pressed('cancel') || I.clicked())) this.finish(); if (this.t > 26) this.finish(); },
  finish() { if (this.done) return; this.done = true; G.game.go(G.state ? 'vresults' : 'title'); },
  draw(r) {
    const n = this.cards.length, k = n ? Math.floor(this.t / 4) % n : 0;
    if (n && G.photo) G.photo.renderSpec(r, this.cards[k], {}); else G.titleWorld.draw(r, { tod: 'sunset' });
    r.overlay(g => {
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#102030'));
      const y0 = r.H - this.t * 18;
      this.lines.forEach((l, i) => { const y = y0 + i * 14; if (y > -10 && y < r.H + 10) E.font.text(g, l, r.W / 2, Math.round(y), i < 2 ? '#ffd36a' : /^[A-Z][a-z]/.test(l) && !this.lines[i - 1] ? '#9fd3d6' : '#fff8e8', { align: 'center', scale: i < 2 ? 2 : 1, shadow: '#000', outline: false }); });
      G.promptBar(g, r, [['confirm', 'Skip']]);
    });
  }
};
G.vacationTitle = st => { const bf = G.npcs(st).filter(id => st.affinity[id] >= 80).length, gf = G.npcs(st).filter(id => st.affinity[id] >= 60).length; return st.flags.finalWon && bf >= 3 ? 'Island Icon' : st.flags.finalWon ? 'Fortuna Champion' : gf >= 3 ? 'Social Butterfly' : 'Beach Bum'; };
G.scenes.vresults = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() {
    G.useInput('MENU'); this.t = 0; this.nav = new G.Nav(); G.music('sunrise');
    const st = G.state; this.title = G.vacationTitle(st);
    G.unlocks.finished = true; for (const s of G.SUIT_IDS) if (!G.unlocks.suits.includes(s)) G.unlocks.suits.push(s); G.saveUnlocks();
  },
  items() { const W = G.game.W, H = G.game.H; return [{ id: 'plus', x: Math.round(W / 2 - 110), y: Math.round(H * .9) - 18, w: 110, h: 18, label: 'New Vacation+', primary: true, onPress: () => this.plus() }, { id: 'title', x: Math.round(W / 2 + 6), y: Math.round(H * .9) - 18, w: 100, h: 18, label: 'Title', onPress: () => { G.state = null; G.game.go('title'); } }]; },
  plus() { const st = G.state; G.unlocks.plusFrom = { wardrobe: st.wardrobe, album: st.album, money: st.money, stats: st.stats, n: (st.nplus || 0) + 1 }; G.state = null; G.game.go('invitation'); },
  update(dt) { this.t += dt; if (this.t > .8) this.nav.update(this.items(), G.game.input); G.titleWorld.update(dt); },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'sunset' });
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H, S = st.stats; px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
      G.ui.title(g, 'VACATION RESULTS', W / 2, Math.round(H * .04), { scale: 2 });
      E.font.title(g, this.title.toUpperCase(), W / 2, Math.round(H * .13), { scale: 2, align: 'center', colors: ['#ffffff', '#ffd36a', '#ff9e5e'] });
      const bf = G.bestFriend(), cards = [['Money earned', G.fmtMoney(S.earned)], ['Matches', S.wins + '-' + (S.matches - S.wins)], ['Final', st.flags.finalWon ? 'Champion!' : 'Runner-up'], ['Suits collected', new Set(st.wardrobe.suits).size + '/' + G.SUIT_IDS.length], ['Gifts given', S.gifts], ['Best Pool Hop', S.poolBest ? S.poolBest.toFixed(1) + ' s' : '—'], ['Casino net', (S.casinoNet >= 0 ? '+' : '') + G.fmtChips(S.casinoNet)], ['Postcards', st.album.length]];
      const cw = Math.round(W * .2), x0 = Math.round(W / 2 - cw * 2 - 9);
      cards.forEach(([l, v], i) => { const x = x0 + (i % 4) * (cw + 6), y = Math.round(H * .27) + Math.floor(i / 4) * 32, kk = clamp((this.t - i * .08) / .3, 0, 1); G.ui.panel(g, x, y + (1 - kk) * 10, cw, 28, { alpha: .92 * kk }); E.font.text(g, l, x + 6, y + 4, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x + 6, y + 15, '#ffd36a', { outline: false }); });
      G.ui.panel(g, Math.round(W / 2 - 90), Math.round(H * .54), 180, 40); G.portrait(g, G.portraitRig(bf), Math.round(W / 2 - 86), Math.round(H * .54) + 4, 32, { frame: false });
      E.font.text(g, 'Best friend', Math.round(W / 2 - 48), Math.round(H * .54) + 6, '#9fd3d6', { outline: false }); E.font.text(g, G.CAST[bf].name + ' · ' + G.stage(st.affinity[bf]), Math.round(W / 2 - 48), Math.round(H * .54) + 18, '#fff8e8', { outline: false }); G.ui.hearts(g, Math.round(W / 2 - 48), Math.round(H * .54) + 28, st.affinity[bf]);
      E.font.text(g, 'Unlocked: every swimsuit in Beach Match, and New Vacation+.', W / 2, Math.round(H * .74), '#9ff3a8', { align: 'center', shadow: '#000', outline: false });
      this.nav.draw(g, this.items());
    });
  }
};
