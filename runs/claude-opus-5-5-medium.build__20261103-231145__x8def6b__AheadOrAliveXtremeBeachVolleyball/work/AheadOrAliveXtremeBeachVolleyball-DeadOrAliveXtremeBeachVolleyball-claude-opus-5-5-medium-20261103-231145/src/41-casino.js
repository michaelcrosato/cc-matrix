/* 41-casino: Casino Fortuna's games, full screen over the casino floor: the cashier (chips at S$100), Fortuna Sevens
 * (a three-reel pachislot with stop buttons), blackjack (six decks, Pepper deals), roulette (a single-zero wheel, Kai
 * spins) and the prize counter. All randomness is the casino stream; dev tools can force a result. */
G.SLOT_SYMS = ['7', 'BAR', 'SONNY', 'BALL', 'PALM', 'COCO', 'CHERRY', 'SHELL'];
// 21 stops a reel; tuned so the centre line returns about 92% (the casino suite checks it)
G.SLOT_STRIPS = [
  ['COCO', 'PALM', 'SHELL', 'BALL', 'COCO', '7', 'PALM', 'COCO', 'BAR', 'CHERRY', 'PALM', 'COCO', 'BALL', 'PALM', 'SONNY', 'COCO', 'SHELL', 'BAR', 'COCO', 'BALL', 'PALM'],
  ['PALM', 'COCO', 'BALL', 'SHELL', 'COCO', 'PALM', '7', 'COCO', 'BALL', 'PALM', 'BAR', 'COCO', 'PALM', 'CHERRY', 'BALL', 'COCO', 'SONNY', 'PALM', 'COCO', 'BAR', 'SHELL'],
  ['SHELL', 'COCO', 'BAR', 'BALL', 'PALM', 'COCO', 'CHERRY', 'PALM', 'COCO', '7', 'BALL', 'PALM', 'COCO', 'SONNY', 'PALM', 'BAR', 'COCO', 'BALL', 'PALM', 'COCO', 'SHELL']
];
G.SLOT_COST = [0, 1, 3, 5];   // a bet of 1, 2 or 3 plays 1, 3 or 5 lines, one chip a line
G.SLOT_PAY = { '7': 100, BAR: 30, SONNY: 20, BALL: 12, PALM: 8, COCO: 5 };
/** what a line of three pays per chip (Sonny is wild) */
G.slotLine = (a, b, c) => {
  const s = [a, b, c], ch = s.filter(x => x === 'CHERRY').length;
  for (const sym of ['7', 'BAR', 'BALL', 'PALM', 'COCO']) if (s.every(x => x === sym || x === 'SONNY') && s.some(x => x === sym)) return G.SLOT_PAY[sym];
  if (s.every(x => x === 'SONNY')) return G.SLOT_PAY.SONNY;
  return ch === 3 ? 10 : ch === 2 ? 5 : ch === 1 ? 2 : 0;
};
G.SLOT_LINES = [[[1, 1, 1]], [[0, 0, 0], [2, 2, 2]], [[0, 1, 2], [2, 1, 0]]];
G.slotWin = (stops, bet) => { let win = 0; const lines = []; for (let b = 0; b < bet; b++) for (const L of G.SLOT_LINES[b]) { const sy = L.map((row, k) => G.SLOT_STRIPS[k][(stops[k] + row - 1 + 21) % 21]); const p = G.slotLine(...sy); if (p) { win += p; lines.push(L); } } return { win: Math.round(win * G.T.slotsPayMul), lines }; };
/* ---- blackjack ---- */
G.BJ = {
  shoe: null,
  newShoe() { const s = []; for (let d = 0; d < 6; d++) for (const suit of '♠♥♦♣') for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) s.push({ r, s: suit }); this.shoe = G.rshuffle('casino', s); this.dealt = 0; },
  draw() { if (!this.shoe || this.dealt > this.shoe.length * .75) this.newShoe(); if (G.bjForce && G.bjForce.length) { const r = G.bjForce.shift(); if (!G.bjForce.length) G.bjForce = null; return { r, s: '♠' }; } this.dealt++; return this.shoe[this.dealt - 1]; },
  value(h) { let v = 0, a = 0; for (const c of h) { v += c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; if (c.r === 'A') a++; } while (v > 21 && a) { v -= 10; a--; } return { v, soft: a > 0 }; },
  bj(h) { return h.length === 2 && this.value(h).v === 21; }
};
G.WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
G.REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
/** what a roulette bet pays on number n (stake returned plus winnings), or 0 */
G.roulettePay = (bet, n) => {
  const k = bet.kind, v = bet.v; if (n === 0 || n === 37) return k === 'num' && v === n ? 36 : 0;
  if (k === 'num') return v === n ? 36 : 0;
  if (k === 'red') return G.REDS.has(n) ? 2 : 0; if (k === 'black') return !G.REDS.has(n) ? 2 : 0;
  if (k === 'odd') return n % 2 ? 2 : 0; if (k === 'even') return n % 2 ? 0 : 2;
  if (k === 'low') return n <= 18 ? 2 : 0; if (k === 'high') return n >= 19 ? 2 : 0;
  if (k === 'dozen') return Math.ceil(n / 12) === v ? 3 : 0; if (k === 'col') return ((n - 1) % 3) + 1 === v ? 3 : 0;
  return 0;
};
G.SCENES.casino = {
  pausable: true, input: G.INPUT.CASINO, view: 'threequarter',
  enter(d) {
    this.d = d || {}; this.mode = this.d.game || (this.d.demo ? 'slots' : 'cashier'); this.t = 0; this.focus = new G.Focus(); this.msg = ''; this.map = G.locMaps().casino; G.UI.theme = 'night';
    G.music('neon'); G.ambience.set('casino'); G.applyLight('night', 'sunny', true); G.game.lights.ambient = .55; G.game.focus(240, 140, 0);
    this.slots = { stops: [3, 8, 12], spin: [false, false, false], pos: [3, 8, 12], bet: 1, win: null, stopT: 0 };
    this.bj = { phase: 'bet', bet: 5, hands: [], dealer: [], cur: 0, msg: '' };
    this.rl = { bets: [], cx: 0, cy: 0, size: 1, phase: 'bet', ang: 0, ball: 0, result: null, last: [], t: 0 };
    if (this.d.demo) { G.slotsForce = ['7', '7', '7']; this.demoT = 0; }
  },
  get S() { return G.state; },
  chips() { return G.state ? G.state.chips : 0; },
  addChips(n) { const S = G.state; if (!S) return; S.chips += n; S.stats.casinoNet += n; },
  update(dt) {
    this.t += dt; const I = G.game.input; G.ambience.update(dt);
    if (G.talkBox().update(dt)) return;
    if (this.d.demo) return this.demoStep(dt);
    if (this.mode === 'cashier' || this.mode === 'prize') return this.cashierStep(I);
    if (this.mode === 'slots') return this.slotsStep(dt, I);
    if (this.mode === 'blackjack') return this.bjStep(dt, I);
    if (this.mode === 'roulette') return this.rlStep(dt, I);
  },
  leave() { G.go('location', this.d.back || { loc: 'casino' }, { fade: .2 }); },
  /* ---- the cashier and the prize counter ---- */
  cashierItems() { const W = G.game.W, H = G.game.H, S = G.state; if (this.mode === 'prize') return G.UI.column([{ id: 'jackpot', label: 'Jackpot swimsuit • 300 chips', disabled: !S || S.wardrobe.suits.includes('jackpot') || S.chips < 300 }, { id: 'back', label: 'Back' }], W / 2, Math.round(H * .4), 200, 20, 6);
    return G.UI.column([{ id: 10, label: 'Buy 10 chips • S$1,000' }, { id: 50, label: 'Buy 50 chips • S$5,000' }, { id: 100, label: 'Buy 100 chips • S$10,000' }, { id: 'out', label: 'Cash out every chip' }, { id: 'back', label: 'Back' }], W / 2, Math.round(H * .32), 200, 20, 5); },
  cashierStep(I) {
    const S = G.state, f = this.focus.set(this.cashierItems()).update(I);
    if (f.back || (f.pick && f.pick.id === 'back')) return this.leave();
    if (!f.pick || !S) return;
    const id = f.pick.id;
    if (typeof id === 'number') { if (G.spend(id * 100)) { S.chips += id; G.sfx('chip'); this.msg = 'Here you go. Good luck.'; } else { G.sfx('ui_error'); this.msg = 'Not enough Sonny Dollars.'; } }
    else if (id === 'out') { if (S.chips > 0) { G.earn(S.chips * 100 / G.T.prizeMul, 'casino'); this.msg = 'Cashed out ' + S.chips + ' chips.'; S.chips = 0; G.sfx('cash'); } }
    else if (id === 'jackpot') { S.chips -= 300; S.wardrobe.suits.push('jackpot'); G.unlock(['jackpot']); G.sting('jackpot'); this.msg = 'The Jackpot suit is yours.'; }
  },
  /* ---- Fortuna Sevens ---- */
  slotsStep(dt, I) {
    const Sl = this.slots, spinning = Sl.spin.some(Boolean);
    if (!spinning) {
      if (I.pressed('cancel')) return this.leave();
      if (I.repeat('left', .3, .15)) Sl.bet = Math.max(1, Sl.bet - 1); if (I.repeat('right', .3, .15)) Sl.bet = Math.min(3, Sl.bet + 1);
      if (I.pressed('confirm') || I.pressed('reel1') && false) { if (this.chips() < G.SLOT_COST[Sl.bet]) { G.sfx('ui_error'); this.msg = 'Not enough chips. The cashier is open.'; return; } this.addChips(-G.SLOT_COST[Sl.bet]); Sl.spin = [true, true, true]; Sl.win = null; Sl.stopT = 0; Sl.forced = G.slotsForce || null; G.slotsForce = null; G.sfx('reel_spin'); }
      return;
    }
    Sl.stopT += dt;
    for (let k = 0; k < 3; k++) if (Sl.spin[k]) { Sl.pos[k] = (Sl.pos[k] + dt * 18) % 21; if (Math.floor(Sl.pos[k]) !== Math.floor(Sl.pos[k] - dt * 18)) G.sfx('reel_spin', { vol: .4 }); }
    const press = [I.pressed('reel1'), I.pressed('reel2'), I.pressed('reel3')], first = Sl.spin.indexOf(true);
    if (I.clicked()) press[first] = true;
    for (let k = 0; k < 3; k++) if (Sl.spin[k] && (press[k] || Sl.stopT > 2.5 + k * .8)) {
      let stop = Math.floor(Sl.pos[k] + 1 + G.rng('casino') * 5) % 21;   // a stop slips 0-4 symbols
      if (Sl.forced) { const want = Sl.forced[k]; const idx = G.SLOT_STRIPS[k].indexOf(want); if (idx >= 0) stop = idx; }
      Sl.stops[k] = stop; Sl.pos[k] = stop; Sl.spin[k] = false; G.sfx('reel_stop');
      if (!Sl.spin.some(Boolean)) { const w = G.slotWin(Sl.stops, Sl.bet); Sl.win = w; if (w.win) { this.addChips(w.win); G.sfx('cash'); if (w.win >= 100) { G.sting('jackpot'); G.fx.coins(240, 120, 40, 50); G.game.flash('#ffd36a', .3, .5); if (I.lastDevice === 'gamepad') I.rumble(.6, .5); this.msg = 'JACKPOT! ' + w.win + ' chips!'; G.game.audio.layer('sparkle', 1, .2); } else this.msg = 'Winner! ' + w.win + ' chips.'; } else this.msg = 'So close.'; }
    }
  },
  /* ---- blackjack ---- */
  bjStep(dt, I) {
    const B = this.bj, BJ = G.BJ, S = G.state;
    if (B.phase === 'bet') {
      if (I.pressed('cancel')) return this.leave();
      const steps = [1, 5, 10, 25], k = steps.indexOf(B.bet);
      if (I.repeat('left', .3, .15)) B.bet = steps[Math.max(0, k - 1)]; if (I.repeat('right', .3, .15)) B.bet = steps[Math.min(3, k + 1)];
      if (I.pressed('confirm') || I.clicked()) { if (this.chips() < B.bet) { G.sfx('ui_error'); B.msg = 'Not enough chips.'; return; } this.addChips(-B.bet); B.hands = [{ cards: [BJ.draw(), BJ.draw()], bet: B.bet, done: false }]; B.dealer = [BJ.draw(), BJ.draw()]; B.cur = 0; B.phase = 'play'; B.split = false; G.sfx('card_deal'); B.msg = '';
        if (BJ.bj(B.hands[0].cards) || BJ.bj(B.dealer)) this.bjSettle(); }
      return;
    }
    if (B.phase === 'play') {
      const h = B.hands[B.cur], v = BJ.value(h.cards).v, two = h.cards.length === 2;
      const canSplit = two && !B.split && BJ.value([h.cards[0]]).v === BJ.value([h.cards[1]]).v && this.chips() >= h.bet, canDouble = two && this.chips() >= h.bet;
      const c = I.clicked(); let act = I.pressed('hit') ? 'hit' : I.pressed('stand') ? 'stand' : I.pressed('double') ? 'double' : I.pressed('split') ? 'split' : null;
      if (c) { const W = G.game.W, H = G.game.H, bx = Math.round(W / 2) - 120, by = Math.round(H * .8); const k = Math.floor((c[0] - bx) / 60); if (c[1] > by && c[1] < by + 18 && k >= 0 && k < 4) act = ['hit', 'stand', 'double', 'split'][k]; }
      if (act === 'hit') { h.cards.push(BJ.draw()); G.sfx('card_deal'); if (BJ.value(h.cards).v >= 21) this.bjNext(); }
      else if (act === 'stand') this.bjNext();
      else if (act === 'double' && canDouble) { this.addChips(-h.bet); h.bet *= 2; h.cards.push(BJ.draw()); G.sfx('card_deal'); this.bjNext(); }
      else if (act === 'split' && canSplit) { this.addChips(-h.bet); B.split = true; const a = h.cards[0], b = h.cards[1]; B.hands = [{ cards: [a, BJ.draw()], bet: h.bet, aces: a.r === 'A' }, { cards: [b, BJ.draw()], bet: h.bet, aces: a.r === 'A' }]; B.cur = 0; G.sfx('card_deal'); if (a.r === 'A') { B.cur = 1; this.bjNext(); } }
      return;
    }
    if (B.phase === 'dealer') { B.dt = (B.dt || 0) + dt; if (B.dt > .55) { B.dt = 0; const dv = BJ.value(B.dealer); if (dv.v < 17 || (dv.v === 17 && dv.soft && G.T.dealerHitsSoft17)) { B.dealer.push(BJ.draw()); G.sfx('card_flip'); } else this.bjSettle(); } return; }
    if (B.phase === 'done') { if (I.pressed('confirm') || I.clicked()) { B.phase = 'bet'; B.msg = ''; } else if (I.pressed('cancel')) this.leave(); }
  },
  bjNext() { const B = this.bj; if (B.cur < B.hands.length - 1) { B.cur++; return; } B.phase = B.hands.every(h => G.BJ.value(h.cards).v > 21) ? 'settle' : 'dealer'; B.dt = 0; if (B.phase === 'settle') this.bjSettle(); },
  bjSettle() {
    const B = this.bj, BJ = G.BJ, dv = BJ.value(B.dealer).v, dbj = BJ.bj(B.dealer); let net = 0, msgs = [];
    for (const h of B.hands) { const v = BJ.value(h.cards).v, pbj = BJ.bj(h.cards) && !B.split;
      let pay = 0; if (v > 21) msgs.push('Bust'); else if (pbj && !dbj) { pay = h.bet + Math.floor(h.bet * 1.5); msgs.push('Blackjack!'); } else if (dbj && !pbj) msgs.push('Dealer blackjack'); else if (dv > 21 || v > dv) { pay = h.bet * 2; msgs.push('Win'); } else if (v === dv) { pay = h.bet; msgs.push('Push'); } else msgs.push('Lose');
      this.addChips(pay); net += pay - h.bet; }
    B.phase = 'done'; B.msg = msgs.join(' • ') + (net > 0 ? '  +' + net : net < 0 ? '  ' + net : '');
    if (net > 0) G.sfx('cash'); G.say('pepper', msgs.includes('Blackjack!') ? 'Blackjack. Congratulations, I suppose.' : msgs[0] === 'Bust' ? 'Statistically, that was unwise.' : net > 0 ? 'The house has noticed.' : 'Better luck next hand.', { auto: 2, modal: false });
  },
  /* ---- roulette: a 12 x 3 number grid, zero, and the outside bets ---- */
  rlCells() {
    const W = G.game.W, H = G.game.H, x0 = Math.round(W * .2), y0 = Math.round(H * .48), cw = Math.round(W * .055), ch = 14, out = [];
    out.push({ kind: 'num', v: 0, x: x0 - cw, y: y0, w: cw, h: ch * 3, label: '0' });
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = c * 3 + (3 - r); out.push({ kind: 'num', v: n, x: x0 + c * cw, y: y0 + r * ch, w: cw, h: ch, label: String(n) }); }
    const oy = y0 + ch * 3 + 2, ow = cw * 2;
    [['low', 0, '1-18'], ['even', 0, 'EVEN'], ['red', 0, 'RED'], ['black', 0, 'BLACK'], ['odd', 0, 'ODD'], ['high', 0, '19-36']].forEach(([k, v, l], i) => out.push({ kind: k, v, x: x0 + i * ow, y: oy, w: ow, h: ch, label: l }));
    [1, 2, 3].forEach((d, i) => out.push({ kind: 'dozen', v: d, x: x0 + i * cw * 4, y: oy + ch + 2, w: cw * 4, h: ch, label: (d * 12 - 11) + '-' + d * 12 }));
    [3, 2, 1].forEach((c, i) => out.push({ kind: 'col', v: c, x: x0 + 12 * cw + 2, y: y0 + i * ch, w: cw, h: ch, label: '2:1' }));
    return out;
  },
  rlStep(dt, I) {
    const R = this.rl, cells = this.rlCells();
    if (R.phase === 'spin') {
      R.t += dt; const dur = 4.2, u = Math.min(1, R.t / dur); R.ang += dt * (8 * (1 - u) + .3); R.ball = R.ballEnd * E.ease.outCubic(u);
      if (Math.floor(R.t * 10 * (1 - u)) !== Math.floor((R.t - dt) * 10 * (1 - u))) G.sfx('ball_rattle', { vol: .5 });
      if (u >= 1) { R.phase = 'bet'; const n = R.result; let win = 0; for (const b of R.bets) win += G.roulettePay(b, n) * b.chips; this.addChips(win); R.last.unshift(n); R.last = R.last.slice(0, 10); this.msg = n + (n === 0 || n === 37 ? ' GREEN' : G.REDS.has(n) ? ' RED' : ' BLACK') + (win ? '  • you win ' + win + ' chips' : ''); if (win) G.sfx('cash'); R.bets = []; G.say('kai', win ? 'Nice one. The wheel likes you.' : 'Wheel giveth, wheel taketh.', { auto: 2, modal: false }); }
      return;
    }
    if (I.pressed('cancel')) { if (R.bets.length) { for (const b of R.bets) this.addChips(b.chips); R.bets = []; } return this.leave(); }
    // the cursor: stick / WASD / arrows over the layout, or the mouse
    let cur = cells[R.ci || 1];
    const mv = (dx, dy) => { const cx = cur.x + cur.w / 2 + dx * 12, cy = cur.y + cur.h / 2 + dy * 12; let best = R.ci, bd = 1e9; cells.forEach((c, k) => { const vx = c.x + c.w / 2 - (cur.x + cur.w / 2), vy = c.y + c.h / 2 - (cur.y + cur.h / 2), al = vx * dx + vy * dy; if (al <= 2) return; const d = al + Math.abs(vx * dy - vy * dx) * 2; if (d < bd) { bd = d; best = k; } }); R.ci = best; G.sfx('ui_tick'); };
    if (I.repeat('left', .3, .1)) mv(-1, 0); if (I.repeat('right', .3, .1)) mv(1, 0); if (I.repeat('up', .3, .1)) mv(0, -1); if (I.repeat('down', .3, .1)) mv(0, 1);
    const p = I.pointer && I.pointer(); if (p && I.lastDevice === 'mouse') cells.forEach((c, k) => { if (p[0] >= c.x && p[0] < c.x + c.w && p[1] >= c.y && p[1] < c.y + c.h) R.ci = k; });
    cur = cells[R.ci === undefined ? 1 : R.ci]; R.ci = R.ci === undefined ? 1 : R.ci;
    const sizes = [1, 5, 10, 25]; if (I.pressed('tabR')) R.size = sizes[Math.min(3, sizes.indexOf(R.size) + 1)]; if (I.pressed('tabL')) R.size = sizes[Math.max(0, sizes.indexOf(R.size) - 1)];
    if (I.pressed('confirm') || I.clicked()) { if (this.chips() >= R.size) { this.addChips(-R.size); const ex = R.bets.find(b => b.kind === cur.kind && b.v === cur.v); if (ex) ex.chips += R.size; else R.bets.push({ kind: cur.kind, v: cur.v, chips: R.size }); G.sfx('chip'); } else G.sfx('ui_error'); }
    if (I.pressed('alt')) { const ex = R.bets.find(b => b.kind === cur.kind && b.v === cur.v); if (ex) { this.addChips(ex.chips); R.bets = R.bets.filter(b => b !== ex); G.sfx('ui_back'); } }
    if (I.pressed('extra') && R.bets.length) { const wheel = G.T.rouletteDoubleZero ? G.WHEEL.concat([37]) : G.WHEEL; let n = wheel[Math.floor(G.rng('casino') * wheel.length)]; if (G.rouletteForce !== undefined && G.rouletteForce !== null) { n = G.rouletteForce; G.rouletteForce = null; } R.result = n; R.t = 0; R.phase = 'spin'; R.ballEnd = Math.PI * 6 + wheel.indexOf(n) / wheel.length * Math.PI * 2; G.sfx('wheel_spin'); }
  },
  demoStep(dt) {
    this.demoT += dt; const Sl = this.slots;
    if (this.mode === 'slots') {
      if (this.demoT > .6 && !Sl.spin.some(Boolean) && !Sl.win) { Sl.spin = [true, true, true]; Sl.stopT = 0; Sl.forced = ['7', '7', '7']; }
      if (Sl.spin.some(Boolean)) { Sl.stopT += dt; for (let k = 0; k < 3; k++) if (Sl.spin[k]) { Sl.pos[k] = (Sl.pos[k] + dt * 18) % 21; if (Sl.stopT > 1 + k * .6) { Sl.stops[k] = G.SLOT_STRIPS[k].indexOf('7'); Sl.pos[k] = Sl.stops[k]; Sl.spin[k] = false; G.sfx('reel_stop'); if (k === 2) { Sl.win = G.slotWin(Sl.stops, 1); this.msg = 'JACKPOT! ' + Sl.win.win + ' chips!'; G.fx.coins(240, 120, 40, 50); G.sting('jackpot'); } } } }
      if (this.demoT > 4.5) { this.mode = 'blackjack'; G.bjForce = ['A', '9', 'K', '7']; const B = this.bj; B.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: 10 }]; B.dealer = [G.BJ.draw(), G.BJ.draw()]; B.phase = 'done'; B.msg = 'Blackjack!'; G.sfx('card_deal'); }
    }
  },
  /* ---- drawing ---- */
  card(g, x, y, c, down) {
    E.ui.box(g, x, y, 22, 30, { bg: down ? ['#c8202c', '#8a1018'] : ['#ffffff', '#e8e8e0'], border: '#1a1a22', gradient: !down });
    if (down) { for (let k = 0; k < 4; k++) px.rect(g, x + 4, y + 5 + k * 6, 14, 2, '#ffd36a'); return; }
    const red = c.s === '♥' || c.s === '♦', col = red ? '#c8202c' : '#1a1a22';
    E.font.text(g, c.r, x + 3, y + 3, col, { outline: false }); G.suitIcon(g, x + 8, y + 15, c.s, col);
  },
  draw(r) {
    this.map.drawFloor(r); this.map.queueWalls(r); G.drawLocProps(r, 'casino', true);
    const S = G.state, I = G.game.input;
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .72, 'normal', () => px.rect(g, 0, 0, W, H, '#12081e'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86), { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' });
      const title = { cashier: 'CASHIER', prize: 'PRIZE COUNTER', slots: 'FORTUNA SEVENS', blackjack: 'BLACKJACK', roulette: 'ROULETTE' }[this.mode];
      G.UI.heading(g, title, Math.round(W * .06), Math.round(H * .06), { color: '#5ff0ff' });
      G.UI.chip(g, Math.round(W * .8), Math.round(H * .07)); E.font.text(g, G.fmt(this.chips()) + ' chips', Math.round(W * .8) + 12, Math.round(H * .07), '#fff3c0', { scale: 1, shadow: '#000', outline: false });
      if (S) E.font.text(g, G.fmtMoney(S.money), Math.round(W * .8) + 12, Math.round(H * .07) + 10, '#9fd3d6', { outline: false });
      if (this.mode === 'cashier' || this.mode === 'prize') { this.cashierItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i)); if (this.mode === 'prize') { const it = G.ITEMS.jackpot; G.UI.itemIcon(g, W / 2 - 24, Math.round(H * .2), it, 3); } }
      if (this.mode === 'slots') this.drawSlots(g, W, H);
      if (this.mode === 'blackjack') this.drawBJ(g, W, H);
      if (this.mode === 'roulette') this.drawRL(g, W, H);
      if (this.msg) E.font.text(g, this.msg, W / 2, Math.round(H * .74), '#ffd36a', { align: 'center', shadow: '#000', outline: false, scale: this.msg.startsWith('JACKPOT') ? 2 : 1 });
    });
    G.talkBox().draw(r);
    if (this.d.demo) return;
    const bar = this.mode === 'slots' ? (this.slots.spin.some(Boolean) ? [['reel1', 'Stop 1'], ['reel2', 'Stop 2'], ['reel3', 'Stop 3']] : [['confirm', 'Spin'], ['left', 'Bet'], ['cancel', 'Leave']])
      : this.mode === 'blackjack' ? (this.bj.phase === 'play' ? [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']] : this.bj.phase === 'bet' ? [['confirm', 'Deal'], ['left', 'Bet'], ['cancel', 'Leave']] : [['confirm', 'Next hand'], ['cancel', 'Leave']])
      : this.mode === 'roulette' ? [['confirm', 'Chip'], ['alt', 'Remove'], ['extra', 'Spin'], ['tabR', 'Chip size'], ['cancel', 'Leave']] : [['confirm', 'Select'], ['cancel', 'Back']];
    G.promptBar(r, bar, I, Math.round(r.H * .92) - 6);
  },
  drawSlots(g, W, H) {
    const Sl = this.slots, x0 = Math.round(W / 2 - 84), y0 = Math.round(H * .2), cw = 52, rh = 26;
    E.ui.box(g, x0 - 10, y0 - 10, 3 * (cw + 6) + 16, 3 * rh + 20, { bg: ['#c8202c', '#6a0a14'], border: '#ffd36a' });
    for (let k = 0; k < 3; k++) { const x = x0 + k * (cw + 6); px.rect(g, x, y0, cw, rh * 3, '#fff8e8');
      for (let row = 0; row < 3; row++) { const f = Sl.pos[k], idx = Math.floor(f) + row - 1, frac = Sl.spin[k] ? f % 1 : 0, sym = G.SLOT_STRIPS[k][(idx + 21) % 21], y = y0 + row * rh - frac * rh; if (y < y0 - 4 || y > y0 + rh * 2 + 4) continue; G.slotIcon(g, x + cw / 2, y + rh / 2, sym, Sl.spin[k]); }
      if (Sl.spin[k]) px.blend(g, .3, 'normal', () => { for (let yy = 0; yy < rh * 3; yy += 3) px.rect(g, x, y0 + yy, cw, 1, '#a0a0b0'); }); }
    for (let b = 0; b < 3; b++) for (const L of G.SLOT_LINES[b]) { const on = b < Sl.bet, won = Sl.win && Sl.win.lines.includes(L), y = (row) => y0 + row * rh + rh / 2; if (!on) continue; px.line(g, x0 - 6, y(L[0]), x0 + 3 * (cw + 6) + 2, y(L[2]), won ? '#ffd36a' : '#ff5fa255', won ? 2 : 1); }
    E.font.text(g, 'Bet ' + G.SLOT_COST[Sl.bet] + (Sl.bet === 1 ? ' chip • centre line' : Sl.bet === 2 ? ' chips • three lines' : ' chips • five lines'), W / 2, y0 + 3 * rh + 16, '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, '7-7-7 ×100 • BAR ×30 • SONNY ×20 (wild) • BALL ×12', W / 2, y0 + 3 * rh + 28, '#c8a8e0', { align: 'center', outline: false });
    E.font.text(g, 'PALM ×8 • COCO ×5 • one, two, three cherries ×2, ×5, ×10', W / 2, y0 + 3 * rh + 38, '#c8a8e0', { align: 'center', outline: false });
  },
  drawBJ(g, W, H) {
    const B = this.bj, BJ = G.BJ, x0 = Math.round(W / 2), y0 = Math.round(H * .18);
    G.portrait(g, 'pepper', Math.round(W * .06), y0, 30); E.font.text(g, 'Dealer: Pepper', Math.round(W * .06) + 34, y0 + 4, '#ffd36a', { outline: false });
    px.ell(g, x0, y0 + 80, 150, 60, '#1f7a4a'); px.ell(g, x0, y0 + 80, 146, 56, '#2a8a5a');
    const hide = B.phase === 'play'; B.dealer.forEach((c, k) => this.card(g, x0 - 30 + k * 24, y0 + 10, c, hide && k === 1));
    if (B.dealer.length) E.font.text(g, hide ? '?' : String(BJ.value(B.dealer).v), x0 + 60, y0 + 20, '#ffffff', { outline: false });
    B.hands.forEach((h, hi) => { const hx = x0 - 30 + (hi - (B.hands.length - 1) / 2) * 110; h.cards.forEach((c, k) => this.card(g, hx + k * 16, y0 + 64 + k * 2, c, false)); E.font.text(g, String(BJ.value(h.cards).v) + ' • bet ' + h.bet, hx, y0 + 100, hi === B.cur && B.phase === 'play' ? '#ffd36a' : '#fff8e8', { outline: false }); });
    if (B.phase === 'bet') { E.font.text(g, '◀  Bet ' + B.bet + ' chips  ▶', x0, y0 + 80, '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); E.font.text(g, 'Blackjack pays 3:2 • dealer ' + (G.T.dealerHitsSoft17 ? 'hits' : 'stands on') + ' soft 17', x0, y0 + 102, '#fff8e8', { align: 'center', outline: false }); }
    if (B.msg) E.font.text(g, B.msg, x0, y0 + 120, '#ffffff', { align: 'center', shadow: '#000', outline: false });
    if (B.phase === 'play') { const bx = Math.round(W / 2) - 120, by = Math.round(H * .8); ['Hit', 'Stand', 'Double', 'Split'].forEach((l, k) => G.UI.button(g, { x: bx + k * 60, y: by, w: 56, h: 16, label: l }, false)); }
  },
  drawRL(g, W, H) {
    const R = this.rl, cells = this.rlCells(), wheel = G.T.rouletteDoubleZero ? G.WHEEL.concat([37]) : G.WHEEL, cx = Math.round(W * .2), cy = Math.round(H * .28), rad = 30;
    G.portrait(g, 'kai', Math.round(W * .06), Math.round(H * .14), 26); E.font.text(g, 'Croupier: Kai', Math.round(W * .06) + 30, Math.round(H * .14) + 4, '#ffd36a', { outline: false });
    // the inset wheel: the pockets turn, the ball spirals in and settles
    px.disc(g, cx + 60, cy, rad + 4, '#5a3a1a'); px.disc(g, cx + 60, cy, rad, '#2a1a10');
    wheel.forEach((n, k) => { const a = R.ang + k / wheel.length * Math.PI * 2, x = cx + 60 + Math.cos(a) * (rad - 5), y = cy + Math.sin(a) * (rad - 5); px.disc(g, x, y, 2.2, n === 0 || n === 37 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22'); });
    px.disc(g, cx + 60, cy, 8, '#ffd36a');
    const br = R.phase === 'spin' ? rad - 2 - Math.min(1, R.t / 4.2) * 3 : rad - 5, ba = (R.phase === 'spin' ? -R.ball : -(R.ballEnd || 0)) + R.ang; px.disc(g, cx + 60 + Math.cos(ba) * br, cy + Math.sin(ba) * br, 1.6, '#ffffff');
    cells.forEach((c, k) => { const n = c.v, bg = c.kind === 'num' ? (n === 0 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22') : c.kind === 'red' ? '#c8202c' : c.kind === 'black' ? '#1a1a22' : '#1f7a4a';
      px.rect(g, c.x, c.y, c.w - 1, c.h - 1, bg); E.font.text(g, c.label, c.x + c.w / 2, c.y + c.h / 2 - 3, '#ffffff', { align: 'center', outline: false });
      const b = R.bets.find(x => x.kind === c.kind && x.v === c.v); if (b) { G.UI.chip(g, c.x + c.w / 2 - 4, c.y + c.h / 2 - 4, '#ffd36a'); E.font.text(g, String(b.chips), c.x + c.w - 2, c.y + 1, '#ffd36a', { align: 'right', outline: false }); }
      if (k === R.ci) G.UI.focus(g, c.x, c.y, c.w - 1, c.h - 1); });
    E.font.text(g, 'Chip size: ' + R.size + '   Bets: ' + R.bets.reduce((a, b) => a + b.chips, 0), Math.round(W * .5), Math.round(H * .24), '#fff8e8', { outline: false });
    E.font.text(g, 'Last:', Math.round(W * .5), Math.round(H * .32), '#9fd3d6', { outline: false }); R.last.forEach((n, k) => { const x = Math.round(W * .5) + 26 + k * 16; px.rect(g, x, Math.round(H * .32) - 1, 14, 10, n === 0 || n === 37 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22'); E.font.text(g, n === 37 ? '00' : String(n), x + 7, Math.round(H * .32), '#ffffff', { align: 'center', outline: false }); });
    E.font.text(g, 'Straight 35:1 • red/black, odd/even, 1-18/19-36 1:1 • dozens and columns 2:1', W / 2, Math.round(H * .24) + 22, '#c8a8e0', { align: 'center', outline: false });
  }
};
G.suitIcon = (g, x, y, s, c) => {
  if (s === '♥') { px.disc(g, x - 2, y - 1, 2, c); px.disc(g, x + 2, y - 1, 2, c); px.poly(g, [[x - 4, y], [x + 4, y], [x, y + 5]], c); }
  else if (s === '♦') px.poly(g, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], c);
  else if (s === '♣') { px.disc(g, x, y - 2, 2, c); px.disc(g, x - 2, y + 1, 2, c); px.disc(g, x + 2, y + 1, 2, c); px.rect(g, x, y + 1, 1, 4, c); }
  else { px.poly(g, [[x, y - 4], [x + 4, y + 1], [x - 4, y + 1]], c); px.disc(g, x - 2, y + 1, 2, c); px.disc(g, x + 2, y + 1, 2, c); px.rect(g, x, y + 2, 1, 3, c); }
};
G.slotIcon = (g, x, y, sym, blur) => {
  x = Math.round(x); y = Math.round(y);
  if (sym === '7') E.font.title(g, '7', x, y - 9, { scale: 2, colors: ['#ff5f7a', '#c8202c'], align: 'center', depth: 1 });
  else if (sym === 'BAR') { E.ui.box(g, x - 14, y - 6, 28, 12, { bg: '#1a1a22', border: '#ffd36a', gradient: false }); E.font.text(g, 'BAR', x, y - 3, '#ffd36a', { align: 'center', outline: false }); }
  else if (sym === 'SONNY') { px.disc(g, x, y, 8, '#d9a27a'); px.rect(g, x - 6, y - 3, 12, 3, '#c89020'); px.rect(g, x - 7, y - 9, 14, 4, '#121014'); px.rect(g, x - 3, y + 3, 6, 1, '#5a2a1a'); }
  else if (sym === 'BALL') { px.sprite(g, G.BALL_SPR[0], x - 8, y - 8, { scale: 2 }); }
  else if (sym === 'PALM') { px.rect(g, x - 1, y - 2, 2, 10, '#8a5a2a'); for (const a of [-2.4, -1.6, -.8, -.2]) px.line(g, x, y - 3, x + Math.cos(a) * 8, y - 3 + Math.sin(a) * 6, '#2f8f4e', 2); }
  else if (sym === 'COCO') { px.disc(g, x, y, 6, '#6a4a2a'); px.disc(g, x - 1, y - 1, 4, '#8a6a3a'); px.dot(g, x - 2, y - 2, '#3a2a1a'); px.dot(g, x + 1, y - 2, '#3a2a1a'); }
  else if (sym === 'SHELL') { px.poly(g, [[x - 7, y + 5], [x + 7, y + 5], [x, y - 6]], '#f4c8b0'); for (let k = -2; k <= 2; k++) px.line(g, x, y - 5, x + k * 3, y + 5, '#c88a70'); px.rect(g, x - 2, y + 5, 5, 2, '#c88a70'); }
  else { px.disc(g, x - 3, y + 2, 4, '#e8283a'); px.disc(g, x + 4, y + 3, 4, '#c8202c'); px.line(g, x - 3, y - 1, x + 1, y - 7, '#2f8f4e'); px.line(g, x + 4, y, x + 1, y - 7, '#2f8f4e'); }
};
