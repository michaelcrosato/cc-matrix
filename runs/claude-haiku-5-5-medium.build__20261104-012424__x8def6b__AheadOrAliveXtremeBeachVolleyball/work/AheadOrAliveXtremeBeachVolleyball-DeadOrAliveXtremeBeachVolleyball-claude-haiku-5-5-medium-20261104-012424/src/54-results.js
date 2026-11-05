/* 54-results: the match results: the score, the stat cards, the MVP, then the choice to go again. */
G.resultsScene = {
  enter(data) {
    this.data = data || {};
    this.items = [{ label: 'Rematch', onPick: () => G.game.go('match', { opts: this.data.opts }) }, { label: 'Change setup', onPick: () => G.game.go('exhibition', {}) }, { label: 'Title', onPick: () => G.game.go('title', {}) }];
    this.list = new G.List({ items: this.items, x: r0x(), y: 150, w: 200, rowH: 24, max: 4, scale: 2 });
    this.bg = new E.Backdrop('dusk');
    G.game.audio.music && G.game.audio.music('title');
  },
  update(dt) { const I = G.game.input; this.list.update(I, dt); },
  draw(r) {
    this.bg.draw(r);
    this.list.x = Math.round(r.W / 2 - 100);
    const d = this.data;
    r.overlay(g => {
      E.font.title(g, d.won ? 'YOU WIN!' : 'MATCH OVER', r.W / 2, 22, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] });
      E.font.text(g, (d.teamNames || ['', '']).join('   vs   '), r.W / 2, 60, '#9fd3d6', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, (d.score || [0, 0]).join('  -  '), r.W / 2, 84, '#fff8e8', { align: 'center', scale: 3, shadow: '#000' });
      const s = d.stats || {};
      const cards = [['POINTS', s.points || 0], ['KILLS', s.kills || 0], ['LONGEST RALLY', s.longest || 0]];
      cards.forEach((c, i) => {
        const x = r.W / 2 - 150 + i * 110;
        E.ui.box(g, x, 110, 100, 26, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
        E.font.text(g, c[0], x + 50, 114, '#9fd3d6', { align: 'center', scale: 1 });
        E.font.text(g, String(c[1]), x + 50, 124, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
      });
    });
    this.list.draw(r);
    G.promptBar(r, [['confirm', 'Select']]);
  }
};
function r0x() { return 0; }
/* the day's end: the summary card, the sleep, then the next day (or the finale) */
G.daySceneOK = true;
G.daySummary = function () {
  const st = G.state, d = st.day_stats || {};
  return { earned: d.earned || 0, spent: d.spent || 0, matches: d.matches || 0, wins: d.wins || 0, weather: G.weatherNow() };
};
G.daySceneDef = {
  enter() {
    this.bg = new E.Backdrop('night'); this.sum = G.daySummary(); this.box = G.box;
    G.music('siesta');
    this.list = new G.List({ items: [{ label: 'Sleep', onPick: () => this.sleep() }], x: G.game.W / 2 - 60, y: 170, w: 120, rowH: 24, max: 2, scale: 2 });
  },
  sleep() {
    const next = G.endDay();
    if (next === 'finale') return G.game.go('finale', {});
    G.game.go('map', {});
  },
  update(dt) { const I = G.game.input; if (I.pressed('confirm')) { this.sleep(); } },
  draw(r) {
    const s = this.sum, W = r.W, H = r.H;
    this.bg.draw(r);
    r.overlay(g => {
      E.ui.box(g, W / 2 - 150, 30, 300, 150, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      E.font.title(g, 'DAY ' + G.state.day + ' ENDS', W / 2, 40, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a'] });
      E.font.text(g, 'Earned ' + G.fmtMoney(s.earned) + ' · Spent ' + G.fmtMoney(s.spent), W / 2, 74, '#fff8e8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Matches ' + s.matches + ' · Won ' + s.wins, W / 2, 90, '#fff8e8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Tomorrow: ' + G.WEATHER_LABEL[G.state.weather[G.state.day] || 'sunny'], W / 2, 108, '#9fd3d6', { align: 'center', shadow: '#000' });
      const movers = G.FIGHTERS.filter(f => f !== G.state.me).slice(0, 6).map(f => G.CAST[f].short + ' ' + (G.state.aff[f] || 0));
      E.font.text(g, movers.slice(0, 3).join('   '), W / 2, 124, '#9fd3d6', { align: 'center', shadow: '#000' });
      E.font.text(g, movers.slice(3).join('   '), W / 2, 138, '#9fd3d6', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Sleep']]);
    this.box.draw(r);
  }
};
G.dayendScene = G.daySceneDef;
/* the finale and the endings: the party, then ending A (won) or B (lost), then the credits and the vacation results */
G.endingScene = {
  enter() {
    const won = G.state.flags.final === 'won';
    this.lines = won ? [['The House Folds.', null], ['Sonny must hand over the island. Pepper produces his IOUs: she owns it now.', 'PEPPER'], ['Sonny paddles off on the flamingo float: I\'LL BE BACK... NEXT SUMMER!', 'SONNY'], ['Breakfast is at eight. The island is under new management.', 'PEPPER']]
      : [['The House Always Wins.', null], ['Sonny bets the island on one spin of a giant roulette wheel. Pepper calls red. It lands red.', null], ['Sonny paddles off on the flamingo float: I\'LL BE BACK... NEXT SUMMER!', 'SONNY'], ['The house always wins. I am the house.', 'PEPPER']];
    this.i = 0; this.box = G.box; this.bg = new E.Backdrop('night');
    this.box.say(this.lines[0][0], { name: this.lines[0][1] || 'THE END', onDone: () => this.step() });
    G.music('farewell');
  },
  step() { this.i++; if (this.i >= this.lines.length) return G.game.go('credits', {}); this.box.say(this.lines[this.i][0], { name: this.lines[this.i][1] || 'THE END', onDone: () => this.step() }); },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); this.box.draw(r); G.promptBar(r, [['confirm', 'Next']]); }
};
G.CREDITS = [
  'AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL', 'An original parody-tribute game, inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, 2003).',
  'No assets from that game are used.', 'Design, code, art, music and writing: the builder (claude-haiku-5-5).', 'Engine: my-3D2dge v0.85.2 (MIT), modified.',
  'AI Hub session client: lib/hub (ai-hub), unmodified.', 'Thanks for playing.'
];
G.creditsScene = {
  enter() { this.t = 0; this.bg = new E.Backdrop('night'); this.page = 0; G.music('farewell'); },
  update(dt) { const I = G.game.input; this.t += dt; if (I.pressed('confirm') || this.t > 14 * G.CREDITS.length / 2) { G.game.go('vacresult', {}); } },
  draw(r) { this.bg.draw(r); const i = Math.floor(this.t / 3.5) % G.CREDITS.length; r.overlay(g => { E.font.text(g, G.CREDITS[i], r.W / 2, r.H / 2 - 8, '#fff8e8', { align: 'center', shadow: '#000' }); }); G.promptBar(r, [['confirm', 'Skip']]); }
};
/* the vacation's results: a report card, a title, and the unlocks */
G.vacresultScene = {
  enter() {
    const st = G.state, s = st.stats;
    const bests = G.FIGHTERS.filter(f => f !== st.me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0));
    const bf = st.aff[bests[0]] || 0;
    const best3 = bests.filter(f => (st.aff[f] || 0) >= 80).length, good3 = bests.filter(f => (st.aff[f] || 0) >= 60).length;
    let title = 'Beach Bum';
    if (st.flags.final === 'won' && best3 >= 3) title = 'Island Icon'; else if (st.flags.final === 'won') title = 'Fortuna Champion'; else if (good3 >= 3) title = 'Social Butterfly';
    this.title = title; this.best = bests[0];
    G.unlock = G.unlock || {};
    const unlocked = E.store.get('aoa-unlocks', { suits: [] });
    unlocked.suits = Array.from(new Set(unlocked.suits.concat(st.wardrobe.suits)));
    unlocked.endings = (unlocked.endings || 0) + 1;
    E.store.set('aoa-unlocks', unlocked);
    this.rows = [['Money earned', G.fmtMoney(s.earned)], ['Matches won', s.wins + ' / ' + s.matches], ['Best friend', G.CAST[bests[0]] ? G.CAST[bests[0]].short + ' ' + (bf) : '-'], ['Suits', st.wardrobe.suits.length + ' / 21'], ['Gifts given', s.gifts], ['Best Pool Hop', s.poolBest !== null ? s.poolBest + 's' : '-'], ['Casino net', G.fmtMoney(s.casinoNet || 0)]];
    this.items = [{ label: 'New Vacation+', onPick: () => { G.newPlusState(); G.game.go('map', {}); } }, { label: 'Title', onPick: () => G.game.go('title', {}) }];
    this.list = new G.List({ items: this.items, x: G.game.W / 2 - 60, y: 190, w: 140, rowH: 24, max: 2, scale: 2 });
    this.bg = new E.Backdrop('dusk');
  },
  update(dt) { this.list.update(G.game.input, dt); },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      E.ui.box(g, r.W / 2 - 150, 16, 300, 170, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      E.font.title(g, 'VACATION RESULTS', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a'] });
      E.font.text(g, this.title, r.W / 2, 50, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
      this.rows.forEach((rw, i) => { E.font.text(g, rw[0], r.W / 2 - 130, 74 + i * 14, '#9fd3d6', { shadow: '#000' }); E.font.text(g, String(rw[1]), r.W / 2 + 130, 74 + i * 14, '#fff8e8', { align: 'right', shadow: '#000' }); });
    });
    this.list.x = Math.round(r.W / 2 - 70);
    this.list.draw(r);
    G.promptBar(r, [['confirm', 'Select']]);
  }
};
G.newPlusState = function () {
  const old = G.state, keep = { wardrobe: old.wardrobe, album: old.album, stats: old.stats, wearing: old.wearing, npcWear: old.npcWear };
  const money = Math.round(G.T.startMoney + .1 * old.money);
  const st = G.newState({ me: old.me, skipTutorial: true });
  Object.assign(st, keep, { money, flags: { arrival: true, welcome: true, plus: true } });
  G.state = st; G.resetStreams(st.seed);
  G.startDay(st);
};
