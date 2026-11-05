/* 52-exhibition: Beach Match setup (one to four local players, CPUs fill the rest), then the match, then the results. */
G.exhibitionSetup = { fighters: ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'], pts: [7, 11, 15, 21], pi: 0, diffs: ['easy', 'normal', 'hard', 'pro'], di: 1, courts: ['morning', 'sunset', 'night'], ci: 1, sets: [1, 3], si: 0 };
G.exhibitionScene = {
  enter() {
    const game = G.game;
    this.S = G.exhibitionSetup;
    this.items = this.buildItems();
    this.list = new G.List({ items: this.items, x: 24, y: 56, w: 230, rowH: 24, max: 6, scale: 2 });
    this.bg = new E.Backdrop('dusk');
    this.human = game.input;
    this.ready = false;
    game.allowJoin && game.allowJoin({ max: 4, onJoin: () => { this.joinedT = 0; G.toast('Player ' + game.players.length + ' joined'); } });
    game.audio.music && game.audio.music('title');
  },
  buildItems() {
    const S = this.S, fa = G.CAST[S.fighters[this.fi || 0]];
    const ofs = this.fi || 0;
    return [
      { label: 'Your fighter', value: G.CAST[S.fighters[ofs]].short.toLowerCase().replace(/^./, c => c.toUpperCase()), onPick: it => this.cycleFighter(1) },
      { label: 'Suit', value: G.SUITS[G.CAST[S.fighters[ofs]].signature].name, },
      { label: 'Points to win', value: G.exhibitionSetup.pts[S.pi], onPick: () => { S.pi = (S.pi + 1) % S.pts.length; this.rebuild(); } },
      { label: 'Sets', value: S.sets[S.si] === 1 ? 'Best of 1' : 'Best of 3', onPick: () => { S.si = (S.si + 1) % 2; this.rebuild(); } },
      { label: 'Difficulty', value: G.DIFFICULTY[S.diffs[S.di]].name, onPick: () => { S.di = (S.di + 1) % 4; this.rebuild(); } },
      { label: 'Court time', value: ['Morning', 'Sunset', 'Night'][S.ci], onPick: () => { S.ci = (S.ci + 1) % 3; this.rebuild(); } },
      { label: 'Start match', onPick: () => this.start() },
      { label: 'Title', onPick: () => G.game.go('title', {}) }
    ];
  },
  rebuild() { this.items = this.buildItems(); this.list.setItems(this.items); },
  cycleFighter(d) {
    const S = this.S; this.fi = ((this.fi || 0) + d + S.fighters.length) % S.fighters.length; this.rebuild();
  },
  start() {
    const S = this.S, fi = this.fi || 0;
    const me = S.fighters[fi];
    const others = S.fighters.filter(f => f !== me);
    const partner = others[0], o1 = others[1], o2 = others[2];
    const P = G.game.players || [this.human];
    const seat = (i) => P[i] || null;
    const teams = [[{ id: me, human: this.human, suit: G.CAST[me].signature, acc: G.CAST[me].starts.acc, base: .4 }, { id: partner, human: seat(1), suit: G.CAST[partner].signature, base: .4 }],
      [{ id: o1, human: seat(2), suit: G.CAST[o1].signature, base: .4 }, { id: o2, human: seat(3), suit: G.CAST[o2].signature, base: .4 }]];
    G.game.allowJoin && G.game.allowJoin(false);
    const opts = { teams, pointsToWin: S.pts[S.pi], setsToWin: S.sets[S.si] === 1 ? 1 : 2, difficulty: S.diffs[S.di], autoReceive: false, timingAssist: 'normal', court: ['day', 'sunset', 'night'][S.ci], serveSide: 0,
      onEnd: r => G.game.go('results', r) };
    G.game.go('match', { opts });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) { G.game.go('menu', {}); return; }
    const pick = this.list.update(I, dt);
    if (pick && pick.item && pick.item.label === 'Your fighter') this.cycleFighter(1);
  },
  draw(r) {
    this.bg.draw(r);
    this.list.draw(r);
    const n = (G.game.players || []).length;
    G.screenTitle(r, 'BEACH MATCH', n > 1 ? n + ' players: P2 takes the partner seat, P3 and P4 the other side' : 'Pick your fighter, the rules and the court · press Start to join');
    const fi = this.fi || 0, f = G.ensureTitleRigs()[fi % 6];
    r.actor(r.W * .8, r.H * .62, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
