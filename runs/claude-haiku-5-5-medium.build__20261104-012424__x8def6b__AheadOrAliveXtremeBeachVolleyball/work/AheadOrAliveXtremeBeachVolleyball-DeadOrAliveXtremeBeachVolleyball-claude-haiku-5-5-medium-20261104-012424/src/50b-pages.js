/* 50b-pages: How to Play (ten pages, one idea each) and About & Credits (pages turned with the shoulders or the stick). */
G.HOWTO = [
  ['Moving and the ring', ['Move with the stick or WASD.', 'The ring on the sand shows where the ball comes down.', 'Stand in it and press {play} as the ball arrives.']],
  ['The touch chain', ['Bump the ball up. Set it to your partner. Spike it over.', 'Each side has three touches. Your partner cannot touch twice in a row.']],
  ['Aiming and shots', ['Push the stick, or point the mouse, to aim your spike.', '{shot} sends a soft shot over the block.']],
  ['Serving', ['{play} tosses. Press {play} again at the top of the toss.', '{shot} tosses for a jump serve, which is faster and harder to read.']],
  ['Blocking and diving', ['When they spike near the net, press {shot} to block.', 'Out of reach? {dive} dives. A dive can still save the point.']],
  ['Calls and chemistry', ['{call} calls Mine, Yours or Auto. Your partner listens.', 'The better you two get along, the better she plays.']],
  ['The vacation', ['Five days, three slots each: Morning, Afternoon and Night.', 'Walking into a place and leaving it ends a slot. Sleep ends the day.']],
  ['Friends and gifts', ['Talk, chat and give gifts to raise affinity.', 'Each fighter loves some gifts and dislikes others. Find out in the Journal.']],
  ['Casino and Pool Hop', ['Pool Hop: hop on the beat, one button per pad.', 'Casino Fortuna: slots, blackjack and roulette, with chips at S$100 each.']],
  ['Postcards', ['Take a postcard in any place with {snap}, or from the pause menu.', 'The album keeps every postcard.']]
];
G.howtoScene = {
  enter(data) { this.page = data.page || 0; this.bg = new E.Backdrop('dusk'); this.rig = G.rigFor(G.state ? G.state.me : 'rin', { suit: G.state ? G.state.wearing.suit : null }); },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) return G.game.go(this.from || 'menu', {});
    if (I.pressed('tabR') || I.pressed('right') || I.pressed('confirm')) this.page = Math.min(G.HOWTO.length - 1, this.page + 1);
    if (I.pressed('tabL') || I.pressed('left')) this.page = Math.max(0, this.page - 1);
  },
  draw(r) {
    const W = r.W, H = r.H, pg = G.HOWTO[this.page];
    this.bg.draw(r);
    G.screenTitle(r, 'HOW TO PLAY', (this.page + 1) + ' / ' + G.HOWTO.length + ' · ' + pg[0]);
    r.overlay(g => {
      E.ui.box(g, 20, 52, W - 40, H - 110, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      pg[1].forEach((ln, i) => {
        const parts = ln.split(/(\{[a-z]+\})/);
        let x = 34; const y = 70 + i * 26;
        for (const p of parts) {
          const m = /^\{([a-z]+)\}$/.exec(p);
          if (m) { const w = G.prompt(r, m[1], x, y, '', { overlay: false }); x += w + 2; }
          else if (p) { E.font.text(g, p, x, y, '#fff8e8', { scale: 1, shadow: '#000' }); x += E.font.width(p, { scale: 1 }); }
        }
      });
    });
    r.actor(W - 80, H * .55, 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); }, { pick: 'howto' });
    G.promptBar(r, [['tabL', 'Back'], ['tabR', 'Next'], ['cancel', 'Close']]);
  }
};
G.ABOUT = G.ABOUT || { pages: [] };
G.aboutScene = {
  enter(data) { this.page = data.page || 0; this.bg = new E.Backdrop('night'); },
  update(dt) {
    const I = G.game.input, n = G.ABOUT.pages.length;
    if (I.pressed('cancel')) return G.game.go('menu', {});
    if (I.pressed('tabR') || I.pressed('right')) this.page = Math.min(n - 1, this.page + 1);
    if (I.pressed('tabL') || I.pressed('left')) this.page = Math.max(0, this.page - 1);
    this.scroll = Math.max(0, (this.scroll || 0) + (I.repeat('down', .2, .05) ? 1 : 0) - (I.repeat('up', .2, .05) ? 1 : 0));
  },
  draw(r) {
    const W = r.W, H = r.H, pg = G.ABOUT.pages[this.page] || { title: '', lines: [] };
    this.bg.draw(r);
    G.screenTitle(r, 'ABOUT & CREDITS', (this.page + 1) + ' / ' + G.ABOUT.pages.length + ' · ' + pg.title);
    r.overlay(g => {
      E.ui.box(g, 16, 50, W - 32, H - 98, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      let y = 60 - (this.scroll || 0) * 8;
      for (const ln of pg.lines) {
        for (const w of G.wrapText(ln, W - 60, 1)) { if (y > 46 && y < H - 60) E.font.text(g, w, 26, y, '#fff8e8', { scale: 1, shadow: '#000' }); y += 10; }
        y += 3;
      }
    });
    G.promptBar(r, [['tabL', 'Back'], ['tabR', 'Next'], ['cancel', 'Close']]);
  }
};
