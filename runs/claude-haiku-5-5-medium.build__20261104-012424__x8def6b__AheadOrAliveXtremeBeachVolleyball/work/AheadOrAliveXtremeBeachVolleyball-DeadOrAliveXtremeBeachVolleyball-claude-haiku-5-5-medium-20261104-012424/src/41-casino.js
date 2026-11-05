/* 41-casino: Casino Fortuna, nights only. The cashier (chips at S$100), Fortuna Sevens (a pachislot with stop buttons),
 * blackjack (6 decks, dealer stands on soft 17 unless the toggle says otherwise, 3:2, double, one split), roulette (single
 * zero in the real wheel order). The chip count shows on every screen. */
G.CHIP = 100;
G.REELS = [
  ['7', 'BAR', 'C', 'P', 'V', 'S', 'C', 'P', 'V', 'BAR', 'C', 'S', 'P', 'V', 'C', 'BAR', 'P', 'V', 'C', 'S', 'P'],
  ['C', 'P', 'V', 'S', 'BAR', 'C', 'V', 'P', 'S', 'C', 'BAR', 'V', 'P', 'C', 'S', 'V', 'P', 'C', '7', 'V', 'P'],
  ['P', 'C', 'S', 'V', 'C', 'BAR', 'P', 'V', 'S', 'C', 'P', '7', 'V', 'C', 'P', 'S', 'V', 'C', 'P', 'BAR', 'V']
];
G.SYM = { '7': 'seven', BAR: 'bar', V: 'vb', P: 'palm', C: 'coco', S: 'sonny', CH: 'cherry' };
/* pays per chip bet on a line: a line is a row (the centre line; 2 more with two chips; 3 more with diagonals) */
G.payLine = function (a, b, c) {
  if (a === '7' && b === '7' && c === '7') return 220;
  if (a === 'BAR' && b === 'BAR' && c === 'BAR') return 66;
  if ([a, b, c].every(x => x === 'S' || x === 'SONNY')) return 44;
  if (a === 'V' && b === 'V' && c === 'V') return 26;
  if (a === 'P' && b === 'P' && c === 'P') return 18;
  if (a === 'C' && b === 'C' && c === 'C') return 11;
  const ch = [a, b, c].filter(x => x === 'CH').length; if (ch) return ch === 1 ? 4 : ch === 2 ? 11 : 22;
  return 0;
};
/* a stop for a reel: the symbol at the stop index; the slip moves it 0-4 places down the strip */
G.reelStop = function (reel, i) { return G.REELS[reel][((i % 21) + 21) % 21]; };
G.spinOnce = function (rng) {
  const idx = [0, 1, 2].map(() => Math.floor(rng() * 21));
  return idx;
};
G.slotsPay = function (grid, bet) {
  // grid[row][reel]: rows 0 top, 1 centre, 2 bottom; the lines bet pays on: centre; with 2 top and bottom; 3 diagonals
  const lines = [[grid[1][0], grid[1][1], grid[1][2]]];
  if (bet >= 2) { lines.push([grid[0][0], grid[0][1], grid[0][2]], [grid[2][0], grid[2][1], grid[2][2]]); }
  if (bet >= 3) { lines.push([grid[0][0], grid[1][1], grid[2][2]], [grid[2][0], grid[1][1], grid[0][2]]); }
  // the stake is split evenly over the active lines: the return does not depend on how many lines are bet
  let pay = 0; for (const l of lines) pay += G.payLine(l[0], l[1], l[2]) * (bet / lines.length);
  return pay * G.T.slotsPayMul;
};
/* 6-deck shoe, reshuffled at 75% */
G.makeShoe = function () {
  const suits = ['S', 'H', 'D', 'C'], ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const cards = []; for (let d = 0; d < 6; d++) for (const s of suits) for (const r of ranks) cards.push(r + s);
  return cards;
};
G.cardVal = function (c) { const r = c[0]; if (r === 'A') return 11; if (['T', 'J', 'Q', 'K'].includes(r)) return 10; return +r; };
G.handTotal = function (cards) { let t = 0, a = 0; for (const c of cards) { t += G.cardVal(c); if (c[0] === 'A') a++; } while (t > 21 && a > 0) { t -= 10; a--; } return { t, soft: a > 0 && t <= 21 && cards.some(c => c[0] === 'A') && t - 10 * 0 !== 0 && a > 0 }; };
G.ROULETTE = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
G.RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
G.rouletteWin = function (bet, n) {
  if (bet.type === 'straight') return n === bet.n ? 35 : null;
  if (n === 0) return null;
  if (bet.type === 'red') return G.RED.includes(n) ? 1 : null;
  if (bet.type === 'black') return !G.RED.includes(n) ? 1 : null;
  if (bet.type === 'odd') return n % 2 === 1 ? 1 : null;
  if (bet.type === 'even') return n % 2 === 0 ? 1 : null;
  if (bet.type === 'low') return n <= 18 ? 1 : null;
  if (bet.type === 'high') return n >= 19 ? 1 : null;
  if (bet.type === 'dozen') return Math.ceil(n / 12) === bet.n ? 2 : null;
  if (bet.type === 'column') return n % 3 === ((bet.n) % 3) && n > 0 ? 2 : null;
  return null;
};
G.casinoScene = {
  enter(data) {
    this.focus = data.focus || 'floor'; this.from = data.from || 'map';
    this.mode = this.focus === 'cashier' ? 'cashier' : this.focus === 'blackjack' ? 'bj' : this.focus === 'roulette' ? 'roulette' : this.focus === 'slots' ? 'slots' : 'floor';
    this.chips = G.state.chips; this.bg = new E.Backdrop('night');
    this.box = G.box; G.game.lights.enabled = true; G.game.lights.ambient = .4;
    G.music('neon');
    this.menu = null; this.sub = null;
    this.buildFloor();
    if (G.state.day === 1 && !G.state.flags.casinoOpen) { G.state.flags.casinoOpen = true; G.state.chips += 20; this.box.say(['Free chips for the first night! Twenty chips, on the house. Don\'t spend them all in one spin.'], { name: 'SONNY', prof: G.STAFF.sonny.voice }); }
    this.slots = { bet: 1, reels: [0, 0, 0], spinning: false, stopped: [false, false, false], t: 0, win: 0, last: null };
    this.bj = null; this.rl = { bet: 1, placed: [], spin: null, last: [] };
    this.shoe = G.makeShoe(); this.shoePos = 0;
  },
  chipsSet(n) { G.state.chips = Math.max(0, n); this.chips = G.state.chips; },
  buildFloor() {
    const items = [{ label: 'Cashier', kind: 'cashier' }, { label: 'Fortuna Sevens', kind: 'slots' }, { label: 'Blackjack', kind: 'bj' }, { label: 'Roulette', kind: 'roulette' }, { label: 'Leave the casino', kind: 'leave' }];
    this.menu = new G.List({ items: items.map(it => ({ label: it.label, onPick: () => { this.mode = it.kind === 'leave' ? 'leave' : it.kind; if (it.kind === 'bj') this.newHand(); } })), x: 16, y: 54, w: 180, rowH: 24, max: 6, scale: 2 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.mode === 'floor') {
      if (I.pressed('cancel')) return this.leaveCasino();
      this.menu.update(I, dt);
      if (this.menu.i >= 0 && this.menu.items[this.menu.i] && this.mode !== 'floor') { /* item picked */ }
      return;
    }
    if (I.pressed('cancel') && this.mode !== 'bj-play') { this.mode = 'floor'; return; }
    if (this.mode === 'cashier') return this.updCashier(I, dt);
    if (this.mode === 'slots') return this.updSlots(I, dt);
    if (this.mode === 'bj') return this.updBJ(I, dt);
    if (this.mode === 'roulette') return this.updRoulette(I, dt);
    if (this.mode === 'leave') return this.leaveCasino();
  },
  leaveCasino() {
    G.state.chips = this.chips;
    G.game.lights.enabled = false;
    if (G.state.chips > 0 && false) { /* the chips stay */ }
    G.game.go('map', { afterLocation: true, after: 'casino' });
  },
  updCashier(I, dt) {
    if (I.pressed('confirm')) { this.buy(10); }
    if (I.pressed('alt')) { this.buy(50); }
    if (I.pressed('extra')) { this.buy(100); }
    if (I.pressed('tabR')) this.cashOut();
  },
  buy(n) { const cost = n * G.CHIP; if (G.state.money < cost) { G.sfx('ui_error'); return G.toast('Not enough money for ' + n + ' chips'); } G.spend(cost); G.state.chips += n; G.sfx('chip'); this.chips = G.state.chips; },
  cashOut() { const n = G.state.chips; if (!n) return; G.earn(n * G.CHIP, 'chips'); G.state.chips = 0; this.chips = 0; G.sfx('cash'); G.toast('Cashed out ' + n + ' chips'); },
  updSlots(I, dt) {
    const s = this.slots;
    if (!s.spinning) {
      if (I.pressed('shot') || I.pressed('dive')) {}
      if (I.pressed('play') || I.pressed('confirm')) {
        if (G.state.chips < s.bet) { G.sfx('ui_error'); return G.toast('Not enough chips'); }
        G.state.chips -= s.bet; this.chips = G.state.chips;
        s.spinning = true; s.stopped = [false, false, false]; s.t = 0; s.rolls = [0, 0, 0];
        s.target = G.spinOnce(G.rngFn('casino'));
        G.sfx('reel_spin');
      }
      if (I.pressed('extra')) { s.bet = s.bet % 3 + 1; }
      return;
    }
    s.t += dt;
    for (let r = 0; r < 3; r++) if (!s.stopped[r]) s.rolls[r] = (s.rolls[r] + dt * 30) % 21;
    const stops = [['reel1', 'J'], ['reel2', 'K'], ['reel3', 'L']];
    [I.pressed('reel1'), I.pressed('reel2'), I.pressed('reel3')].forEach((p, r) => { if (p && !s.stopped[r]) { s.stopped[r] = true; const slip = Math.floor(G.rng('casino') * 5); s.reels[r] = (s.target[r] + slip) % 21; G.sfx('reel_stop'); } });
    if (I.pressed('play') && s.stopped.every(x => x) === false) { /* further presses do nothing */ }
    if (s.stopped.every(x => x)) {
      s.spinning = false;
      const grid = [0, 1, 2].map(row => [0, 1, 2].map(rl => G.reelStop(rl, s.reels[rl] + row - 1)));
      const pay = G.slotsPay(grid, s.bet);
      s.last = grid; s.win = pay;
      if (pay > 0) { G.state.chips += pay; this.chips = G.state.chips; G.sfx(pay >= 100 * s.bet ? 'jackpot' : 'cash'); if (pay >= 100 * s.bet) G.toast('JACKPOT!'); }
      G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + pay - s.bet;
    }
  },
  newHand() {
    this.bj = { bet: 5, hands: [], dealer: [], phase: 'bet', msg: '' };
    this.dealt = false;
  },
  drawCard(next) { if (this.shoePos >= this.shoe.length * .75) { this.shoe = G.makeShoe(); this.shoePos = 0; } const c = this.shoe[this.shoePos++]; return c; },
  updBJ(I, dt) {
    const b = this.bj; if (!b) return;
    if (b.phase === 'bet') {
      if (I.pressed('left') && b.bet > 1) b.bet = [1, 5, 10, 25].reverse().find(v => v < b.bet) || 1;
      if (I.pressed('right')) b.bet = [1, 5, 10, 25].find(v => v > b.bet) || 25;
      if (I.pressed('confirm')) {
        if (G.state.chips < b.bet) { G.sfx('ui_error'); return G.toast('Not enough chips'); }
        G.state.chips -= b.bet; this.chips = G.state.chips;
        b.hands = [{ cards: [this.drawCard(), this.drawCard()], bet: b.bet, done: false, doubled: false }];
        b.dealer = [this.drawCard(), this.drawCard()];
        b.phase = 'play'; G.sfx('card_deal');
        const pt = G.handTotal(b.hands[0].cards).t, dt2 = G.handTotal(b.dealer).t;
        if (pt === 21 || dt2 === 21) return this.settle();
      }
      return;
    }
    if (b.phase === 'play') {
      const h = b.hands[b.cur || 0];
      if (!h) return this.settle();
      if (I.pressed('hit')) { h.cards.push(this.drawCard()); G.sfx('card_deal'); if (G.handTotal(h.cards).t > 21) { h.done = true; this.advanceHand(); } }
      if (I.pressed('stand')) { h.done = true; this.advanceHand(); }
      if (I.pressed('double') && h.cards.length === 2 && G.state.chips >= h.bet) { G.state.chips -= h.bet; this.chips = G.state.chips; h.bet *= 2; h.doubled = true; h.cards.push(this.drawCard()); h.done = true; G.sfx('chip'); this.advanceHand(); }
      if (I.pressed('split') && h.cards.length === 2 && b.hands.length === 1 && h.cards[0][0] === h.cards[1][0] && G.state.chips >= h.bet) {
        G.state.chips -= h.bet; this.chips = G.state.chips;
        const c2 = h.cards.pop(); b.hands.push({ cards: [c2, this.drawCard()], bet: h.bet, done: false });
        h.cards.push(this.drawCard()); G.sfx('card_flip');
      }
    }
  },
  advanceHand() {
    const b = this.bj; const next = b.hands.findIndex(h => !h.done);
    if (next >= 0) b.cur = next; else this.settle();
  },
  settle() {
    const b = this.bj; if (!b) return;
    // the dealer draws to 17 (stands on soft 17 unless the toggle)
    const anyLive = b.hands.some(h => G.handTotal(h.cards).t <= 21);
    let dt2 = G.handTotal(b.dealer);
    if (anyLive) {
      while (dt2.t < 17 || (dt2.t === 17 && G.T.dealerHitsSoft17 && dt2.soft)) { b.dealer.push(this.drawCard()); dt2 = G.handTotal(b.dealer); }
    }
    let won = 0, lines = [];
    for (const h of b.hands) {
      const pt = G.handTotal(h.cards).t, bjk = h.cards.length === 2 && pt === 21 && b.hands.length === 1;
      let pay = 0;
      if (pt > 21) pay = 0;
      else if (bjk && dt2.t !== 21) pay = h.bet * 2.5;
      else if (dt2.t > 21 || pt > dt2.t) pay = h.bet * 2;
      else if (pt === dt2.t) pay = h.bet;
      won += pay; lines.push(pt > 21 ? 'bust' : pay > h.bet ? 'win' : pay === h.bet ? 'push' : 'lose');
    }
    if (won) { G.state.chips += Math.round(won); this.chips = G.state.chips; G.sfx('cash'); }
    G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + won - b.hands.reduce((a, h) => a + h.bet, 0);
    b.phase = 'done'; b.msg = lines.join(' · ');
    if (dt2.t > 21) b.msg = 'Dealer busts. ' + b.msg;
    this.box.say(['Pepper: ' + (lines.indexOf('win') >= 0 ? 'Statistically, that was fortunate.' : 'The house always keeps a little.')], { name: 'PEPPER', prof: G.STAFF.pepper.voice });
  },
  updRoulette(I, dt) {
    const R = this.rl;
    if (R.spin) {
      R.spin.t += dt;
      if (R.spin.t > 2.2) { R.last.unshift(R.spin.n); R.last = R.last.slice(0, 10); this.settleRoulette(R.spin.n); R.spin = null; }
      return;
    }
    if (I.pressed('left')) R.cursor = ((R.cursor || 0) + 36 - 1) % 36;
    if (I.pressed('right')) R.cursor = ((R.cursor || 0) + 1) % 36;
    if (I.pressed('confirm')) { const n = (R.cursor || 0) + 1; R.placed.push({ type: 'straight', n, amt: R.bet }); G.sfx('chip'); }
    if (I.pressed('tabR')) { R.bet = [1, 5, 10, 25][([1, 5, 10, 25].indexOf(R.bet) + 1) % 4] || 1; }
    if (I.pressed('play') || I.pressed('dive')) { if (R.placed.length) { const n = Math.floor(G.rng('casino') * (G.T.rouletteDoubleZero ? 38 : 37)); R.spin = { t: 0, n: G.ROULETTE[n % 37] }; G.sfx('wheel_spin'); } }
    if (I.pressed('shot')) { R.placed = []; }
  },
  settleRoulette(n) {
    let pay = 0;
    for (const b of this.rl.placed) { const m = G.rouletteWin(b, n); if (m !== null) pay += b.amt * (m + 1); }
    const staked = this.rl.placed.reduce((a, b) => a + b.amt, 0);
    if (pay) { G.state.chips += pay; this.chips = G.state.chips; G.sfx('jackpot'); }
    G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + pay - staked;
    this.rl.placed = []; this.rl.result = n;
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, 'CASINO FORTUNA', 'Chips: ' + G.state.chips + ' · ' + G.fmtMoney(G.state.money));
    if (this.mode === 'floor') { r.overlay(g => { E.ui.box(g, 8, 44, 196, 170, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', alpha: .6 }); }); this.menu.draw(r); }
    if (this.mode === 'cashier') { r.overlay(g => { E.ui.box(g, 30, 60, W - 60, 120, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' }); E.font.text(g, 'CASHIER', W / 2, 70, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, 'Chips are S$100 each. You hold ' + G.state.chips + '.', W / 2, 100, '#fff8e8', { align: 'center', shadow: '#000' }); E.font.text(g, '✕ buy 10 · □ buy 50 · △ buy 100 · R1 cash out', W / 2, 130, '#9fd3d6', { align: 'center', shadow: '#000' }); }); G.promptBar(r, [['confirm', 'Buy 10'], ['cancel', 'Leave']]); }
    if (this.mode === 'slots') this.drawSlots(r);
    if (this.mode === 'bj') this.drawBJ(r);
    if (this.mode === 'roulette') this.drawRoulette(r);
    this.box.draw(r);
  },
  drawSlots(r) {
    const s = this.slots, W = r.W, H = r.H;
    r.overlay(g => {
      E.ui.box(g, W / 2 - 110, 50, 220, 130, { bg: ['#2a1240', '#12081e'], border: '#5ff0ff', alpha: .95 });
      for (let rl = 0; rl < 3; rl++) {
        const x = W / 2 - 80 + rl * 70;
        E.ui.box(g, x, 74, 56, 60, { bg: ['#f6efe0', '#d8cdb8'], border: '#5ff0ff', alpha: 1 });
        for (let row = 0; row < 3; row++) {
          const sym = s.spinning && !s.stopped[rl] ? G.REELS[rl][Math.floor(s.rolls ? s.rolls[rl] : 0 + row) % 21] : G.reelStop(rl, s.reels[rl] + row - 1);
          E.font.text(g, sym, x + 28, 80 + row * 18, '#1a1a24', { align: 'center', scale: 2 });
        }
      }
      E.font.text(g, 'BET ' + s.bet + ' · WIN ' + (s.win || 0), W / 2, 150, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, s.spinning ? [['reel1', 'Stop 1'], ['reel2', 'Stop 2'], ['reel3', 'Stop 3']] : [['play', 'Spin'], ['extra', 'Bet'], ['cancel', 'Leave']]);
  },
  drawBJ(r) {
    const b = this.bj, W = r.W, H = r.H; if (!b) return;
    r.overlay(g => {
      E.ui.box(g, 20, 52, W - 40, H - 100, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, 'DEALER', W / 2, 60, '#9fd3d6', { align: 'center', shadow: '#000' });
      b.dealer.forEach((c, i) => { const x = W / 2 - 60 + i * 30; E.ui.box(g, x, 72, 24, 34, { bg: ['#fff8e8', '#e8e0cc'], border: '#1a1a24', alpha: 1 }); E.font.text(g, c, x + 3, 80, '#c22', { scale: 1 }); });
      E.font.text(g, 'YOU', W / 2, 120, '#9fd3d6', { align: 'center', shadow: '#000' });
      (b.hands || []).forEach((h, hi) => h.cards.forEach((c, i) => { const x = W / 2 - 60 + i * 30 + hi * 80; E.ui.box(g, x, 132, 24, 34, { bg: ['#fff8e8', '#e8e0cc'], border: '#1a1a24', alpha: 1 }); E.font.text(g, c, x + 3, 140, '#1a1a24', { scale: 1 }); }));
      if (b.phase === 'bet') E.font.text(g, 'BET ' + b.bet + ' · ✕ deal · ◂ ▸ change', W / 2, 180, '#ffd36a', { align: 'center', shadow: '#000' });
      if (b.msg) E.font.text(g, b.msg, W / 2, 180, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    if (b.phase === 'play') G.promptBar(r, [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']]);
    else if (b.phase === 'done') G.promptBar(r, [['bet', 'Next hand']]);
    else G.promptBar(r, [['confirm', 'Deal'], ['cancel', 'Leave']]);
    if (b.phase === 'done' && G.game.input.pressed('bet')) this.newHand();
  },
  drawRoulette(r) {
    const R = this.rl, W = r.W, H = r.H;
    r.overlay(g => {
      E.ui.box(g, 16, 50, W - 32, H - 96, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
      const cur = R.cursor || 0;
      E.font.text(g, 'Straight-up numbers. Cursor: ' + (cur + 1) + ' · Chip ' + R.bet, W / 2, 60, '#ffd36a', { align: 'center', shadow: '#000' });
      for (let n = 1; n <= 36; n++) { const x = 40 + ((n - 1) % 12) * 24, y = 80 + Math.floor((n - 1) / 12) * 26; E.ui.box(g, x, y, 20, 20, { bg: G.RED.includes(n) ? ['#b02a3a', '#6a1620'] : ['#1a1a24', '#0a0a10'], border: n === cur + 1 ? '#ffd36a' : null, alpha: 1 }); E.font.text(g, String(n), x + 10, y + 6, '#fff8e8', { align: 'center', scale: 1 }); }
      E.font.text(g, 'Placed: ' + R.placed.length + ' · Last: ' + R.last.slice(0, 5).join(' '), W / 2, H - 80, '#9fd3d6', { align: 'center', shadow: '#000' });
      if (R.result !== undefined) E.font.text(g, 'Ball on ' + R.result, W / 2, H - 66, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Place'], ['play', 'Spin'], ['shot', 'Clear'], ['cancel', 'Leave']]);
  }
};
G.casinoScene.leave = function () { G.game.go('map', {}); };
