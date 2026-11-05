/* 41-casino: Casino Fortuna's stations, over the night theme. The cashier (chips at S$100, buy in 10s, 50s or 100s, cash
 * out any time), the prize counter (300 chips for the Jackpot suit), Fortuna Sevens (a 3-reel pachislot, bet 1-3 lines,
 * stop each reel yourself; a stop slips 0-4 symbols), blackjack (6 decks, Pepper deals, S17 or H17, 3:2, double, split
 * once) and single-zero roulette (Kai spins; straight, colors, odd/even, halves, dozens, columns). All on the 'casino'
 * random stream; the dev tools can force results. */
const SYM = ['7', 'BAR', 'S', 'V', 'P', 'C', 'R', 'X'];   // seven, bar, Sonny (wild), volleyball, palm, coconut, cherry, blank
G.Slots = {
  strips: [   // per reel: 7 ×1, BAR ×1, Sonny ×1, ball ×3, palm ×2, coconut ×5, cherry ×2, blank ×6: an RTP of 92.0% a line
    ['C', 'X', 'R', 'V', 'X', 'C', '7', 'P', 'X', 'C', 'V', 'BAR', 'X', 'C', 'S', 'R', 'V', 'X', 'P', 'C', 'X'],
    ['X', 'C', 'V', 'R', 'X', 'P', 'C', 'X', 'BAR', 'V', 'C', 'X', '7', 'R', 'C', 'X', 'S', 'V', 'P', 'C', 'X'],
    ['V', 'X', 'C', 'P', 'X', 'R', 'C', 'S', 'X', 'C', 'V', 'X', 'BAR', 'C', '7', 'X', 'R', 'V', 'C', 'P', 'X']
  ],
  PAY: { '7': 100, BAR: 30, S: 20, V: 12, P: 8, C: 5 },
  LINES: [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]],   // rows per reel: centre, top, bottom, the diagonals
  rows(stops) { return stops.map((s, k) => { const L = this.strips[k], n = L.length; return [L[(s - 1 + n) % n], L[s], L[(s + 1) % n]]; }); },
  lineWin(syms) {
    const cherries = syms.filter(s => s === 'R').length;
    if (syms.every(s => s === 'S')) return this.PAY.S;
    for (const t of ['7', 'BAR', 'V', 'P', 'C']) if (syms.every(s => s === t || s === 'S')) return this.PAY[t];
    return cherries === 3 ? 10 : cherries === 2 ? 5 : cherries === 1 ? 2 : 0;
  },
  /** wins for stops and a bet (lines 1, 3 or 5 for bets 1, 2, 3): { total, lines: [[i, pay]] } (per chip a line) */
  evaluate(stops, bet) {
    const R = this.rows(stops), n = bet === 1 ? 1 : bet === 2 ? 3 : 5, out = { total: 0, lines: [] };
    for (let i = 0; i < n; i++) { const L = this.LINES[i], s = L.map((row, k) => R[k][row]), w = Math.round(this.lineWin(s) * G.T.slotsPayMul); if (w) { out.total += w; out.lines.push([i, w]); } }
    return out;
  },
  /** the RTP over n seeded spins at a bet (per chip wagered) */
  rtp(n = 200000, bet = 1, seed = 5) { const r = E.rng(seed); let paid = 0; for (let i = 0; i < n; i++) { const st = [0, 1, 2].map(k => Math.floor(r() * 21)); paid += this.evaluate(st, bet).total; } return paid / (n * (bet === 1 ? 1 : bet === 2 ? 3 : 5)); }
};
const SUITS4 = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
G.BJ = {
  shoe: [], used: 0,
  newShoe() { const s = []; for (let d = 0; d < 6; d++) for (const su of SUITS4) for (const r of RANKS) s.push({ r, s: su }); this.shoe = G.shuffle('casino', s); this.used = 0; },
  draw() { if (!this.shoe.length || this.used > this.shoe.length * .75) this.newShoe(); if (G.BJ.forced && G.BJ.forced.length) return G.BJ.forced.shift(); return this.shoe[this.used++]; },
  value(h) { let v = 0, aces = 0; for (const c of h) { if (c.r === 'A') { v += 11; aces++; } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; } while (v > 21 && aces) { v -= 10; aces--; } return { v, soft: aces > 0 }; },
  isBJ(h) { return h.length === 2 && this.value(h).v === 21; },
  dealerPlays(h) { for (;;) { const { v, soft } = this.value(h); if (v < 17 || (v === 17 && soft && G.T.dealerHitsSoft17)) h.push(this.draw()); else return h; } },
  /** settle a hand against the dealer: chips returned (stake included) */
  settle(hand, dealer) { const p = this.value(hand.cards).v, d = this.value(dealer).v; if (p > 21) return 0; if (hand.bj && !this.isBJ(dealer)) return hand.bet * 2.5; if (this.isBJ(dealer) && !hand.bj) return 0; if (d > 21 || p > d) return hand.bet * 2; if (p === d) return hand.bet; return 0; }
};
G.ROULETTE = {
  ORDER: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
  RED: new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]),
  pockets() { return G.T.rouletteDoubleZero ? this.ORDER.concat(['00']) : this.ORDER; },
  spin() { if (G.ROULETTE.forced !== undefined && G.ROULETTE.forced !== null) { const f = G.ROULETTE.forced; G.ROULETTE.forced = null; return f; } return G.pick('casino', this.pockets()); },
  /** pays for a bet { kind, n } on result x: chips returned (stake included), 0 when lost */
  pays(b, x) {
    const num = typeof x === 'number' ? x : -1, z = num <= 0;
    switch (b.kind) {
      case 'num': return b.n === x ? b.chips * 36 : 0;
      case 'red': return !z && this.RED.has(num) ? b.chips * 2 : 0; case 'black': return !z && !this.RED.has(num) ? b.chips * 2 : 0;
      case 'odd': return !z && num % 2 === 1 ? b.chips * 2 : 0; case 'even': return !z && num % 2 === 0 ? b.chips * 2 : 0;
      case 'low': return !z && num <= 18 ? b.chips * 2 : 0; case 'high': return !z && num >= 19 ? b.chips * 2 : 0;
      case 'dozen': return !z && Math.ceil(num / 12) === b.n ? b.chips * 3 : 0;
      case 'col': return !z && ((num - 1) % 3) + 1 === b.n ? b.chips * 3 : 0;
    }
    return 0;
  }
};
const chipDelta = n => { const st = G.state; st.chips += n; st.stats.casinoNet += n; };
G.casinoLeaveNight = () => { const st = G.state; G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }); void st; };
/* card sprites, drawn with px: a white card with rank and suit, or the back */
G.drawCard = (g, x, y, c, faceUp = true) => {
  x = Math.round(x); y = Math.round(y);
  px.rect(g, x, y, 18, 24, '#141018'); px.rect(g, x + 1, y + 1, 16, 22, faceUp ? '#f8f6f0' : '#c8283a');
  if (!faceUp) { for (let k = 0; k < 5; k++) px.rect(g, x + 3 + k * 3, y + 3, 1, 18, '#ffd36a'); return; }
  const red = c.s === '♥' || c.s === '♦', col = red ? '#d8283a' : '#141018';
  E.font.text(g, c.r, x + 2, y + 2, col, { outline: false }); E.font.text(g, c.s, x + 9, y + 12, col, { outline: false, scale: 1 });
};
G.scenes.casino = {
  pausable: true, view: 'threequarter', input: G.PRESETS.CASINO, camera: false,
  enter(d) {
    G.useInput('CASINO'); this.station = d.station; this.at = d.at; this.t = 0; this.nav = new G.Nav(); this.msg = ''; this.msgT = 0; G.themeName = 'night'; G.music('neon');
    this.bet = 1; this.slot = { stops: [3, 7, 11], spin: [false, false, false], off: [0, 0, 0], phase: 'idle', win: null, bet: 1 };
    this.bj = { phase: 'bet', bet: 5, hands: [], dealer: [], cur: 0, out: null }; this.rl = { bets: [], size: 1, phase: 'bet', result: null, hist: [], ang: 0, ball: 0, spd: 0 };
    if (this.station === 'vip') { G.say('sonny', G.pickLine('sonny', 'casinoHello')); this.station = 'floor'; }
    if (this.station === 'blackjack') this.say('pepper', G.pickLine('pepper', 'dealer'));
    if (this.station === 'roulette') this.say('kai', G.pickLine('kai', 'croupier'));
  },
  say(who, text) { this.msg = text; this.msgWho = who; this.msgT = 0; },
  back() { G.sfx('ui_back'); G.game.go('location', { loc: 'casino', at: this.at }); },
  update(dt) {
    this.t += dt; this.msgT += dt; const I = G.game.input;
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (this.station === 'floor') return this.back();
    if (this.station === 'cashier') return this.updCashier(dt, I);
    if (this.station === 'prize') return this.updPrize(dt, I);
    if (this.station === 'slots') return this.updSlots(dt, I);
    if (this.station === 'blackjack') return this.updBJ(dt, I);
    if (this.station === 'roulette') return this.updRoul(dt, I);
  },
  /* ---- the cashier ---- */
  cashItems() { const W = G.game.W, H = G.game.H, x = Math.round(W / 2 - 75), y = Math.round(H * .4), st = G.state; return [[10, 'Buy 10 chips'], [50, 'Buy 50 chips'], [100, 'Buy 100 chips']].map(([n, l], i) => ({ id: 'b' + n, x, y: y + i * 22, w: 150, h: 18, label: l, right: G.fmtMoney(n * 100), disabled: st.money < n * 100, onPress: () => { if (G.spend(n * 100)) { st.chips += n; G.sfx('chip'); this.say('kai', 'Here you go. Good luck tonight.'); } } })).concat([{ id: 'out', x, y: y + 70, w: 150, h: 18, label: 'Cash out all chips', disabled: !st.chips, onPress: () => { const n = st.chips; st.chips = 0; G.earn(n * 100, 'casino'); G.sfx('cash'); this.say('kai', 'Cashed out ' + n + ' chips: ' + G.fmtMoney(n * 100) + '.'); } }, { id: 'back', x, y: y + 96, w: 150, h: 18, label: 'Back to the floor', onPress: () => this.back() }]); },
  updCashier(dt, I) { const ev = this.nav.update(this.cashItems(), I); if (ev.back) this.back(); },
  prizeItems() { const W = G.game.W, H = G.game.H, st = G.state, owned = st.wardrobe.suits.includes('jackpot'); return [{ id: 'suit', x: Math.round(W / 2 - 75), y: Math.round(H * .58), w: 150, h: 18, label: owned ? 'Already yours' : 'Swap 300 chips', disabled: owned || st.chips < 300, onPress: () => { st.chips -= 300; st.wardrobe.suits.push('jackpot'); G.sting('jackpot'); G.toast('Jackpot suit', 'Now in your wardrobe', 'hanger'); } }, { id: 'back', x: Math.round(W / 2 - 75), y: Math.round(H * .58) + 24, w: 150, h: 18, label: 'Back to the floor', onPress: () => this.back() }]; },
  updPrize(dt, I) { const ev = this.nav.update(this.prizeItems(), I); if (ev.back) this.back(); if (!this.prizeRig) this.prizeRig = G.makeRig(G.state.me, { suit: 'jackpot', acc: G.state.wearing.acc }); G.Anim.idle(this.prizeRig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.t, pose: 'hips' }); },
  /* ---- Fortuna Sevens ---- */
  updSlots(dt, I) {
    const S = this.slot, st = G.state;
    for (let k = 0; k < 3; k++) if (S.spin[k]) { S.off[k] += dt * 22; if (G.chance('cosmetic', dt * 12)) G.sfx('reel_spin'); }
    if (S.phase === 'idle' || S.phase === 'done') {
      if (I.pressed('left')) { S.bet = Math.max(1, S.bet - 1); G.sfx('ui_tick'); } if (I.pressed('right')) { S.bet = Math.min(3, S.bet + 1); G.sfx('ui_tick'); }
      if (I.pressed('confirm') || I.clicked()) {
        if (st.chips < S.bet) { G.sfx('ui_error'); this.say('pepper', 'Chips first. The cashier is by the door.'); }
        else { chipDelta(-S.bet); S.phase = 'spin'; S.spin = [true, true, true]; S.win = null; S.t = 0; G.sfx('chip'); }
      }
      if (I.pressed('cancel')) this.back();
      return;
    }
    if (S.phase === 'spin') {
      S.t += dt;
      const stopK = k => { if (!S.spin[k]) return; S.spin[k] = false; let s = (S.stops[k] + Math.floor(S.off[k]) + G.randInt('casino', 0, 4)) % 21; if (G.Slots.forced) s = G.Slots.strips[k].indexOf(G.Slots.forced); S.stops[k] = s; S.off[k] = 0; G.sfx('reel_stop'); };
      const next = S.spin.indexOf(true), pad = I.lastDevice === 'gamepad';
      if (I.pressed('reel1') || (pad && I.pressed('confirm'))) stopK(0);
      if (I.pressed('reel2') || (pad && I.pressed('cancel'))) stopK(1);
      if (I.pressed('reel3') || (pad && I.pressed('alt'))) stopK(2);
      if (!pad && (I.pressed('confirm') || I.clicked()) && next >= 0) stopK(next);
      if (next >= 0 && (S.t > 6 || (G.attract && S.t > .6 + next * .5))) stopK(next);
      if (!S.spin.some(Boolean)) {
        const w = G.Slots.evaluate(S.stops, S.bet); S.win = w; S.phase = 'done'; G.Slots.forced = false;
        if (w.total) { chipDelta(w.total); if (w.total >= 100) { G.sting('jackpot'); G.fx.coins(240, 140, 30, 50); G.game.input.rumble(.6, .5); G.game.flash('#ffd36a', .2, .5); this.say('sonny', 'JACKPOT! The house... is SO happy for you.'); } else { G.sfx('cash'); this.say('pepper', 'A win. Of ' + w.total + ' chips.'); } }
      }
    }
  },
  /* ---- blackjack ---- */
  updBJ(dt, I) {
    const B = this.bj, st = G.state;
    if (B.phase === 'bet') {
      const steps = [1, 5, 10, 25]; if (I.pressed('left')) { B.bet = steps[Math.max(0, steps.indexOf(B.bet) - 1)]; G.sfx('ui_tick'); } if (I.pressed('right')) { B.bet = steps[Math.min(3, steps.indexOf(B.bet) + 1)]; G.sfx('ui_tick'); }
      if (I.pressed('confirm') || I.pressed('hit')) { if (st.chips < B.bet) { G.sfx('ui_error'); this.say('pepper', 'You are short of chips. Statistically, that was unwise.'); return; } chipDelta(-B.bet); B.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: B.bet, done: false }]; B.dealer = [G.BJ.draw(), G.BJ.draw()]; B.cur = 0; B.phase = 'play'; B.dealT = 0; G.sfx('card_deal'); B.hands[0].bj = G.BJ.isBJ(B.hands[0].cards); if (B.hands[0].bj || G.BJ.isBJ(B.dealer)) this.dealerTurn(); }
      if (I.pressed('cancel')) this.back();
      return;
    }
    if (B.phase === 'play') {
      B.dealT += dt; const h = B.hands[B.cur], v = G.BJ.value(h.cards).v, canSplit = B.hands.length === 1 && h.cards.length === 2 && G.BJ.value([h.cards[0]]).v === G.BJ.value([h.cards[1]]).v && st.chips >= h.bet, canDouble = h.cards.length === 2 && st.chips >= h.bet;
      const c = I.clicked(), hit = this.bjButtons().find(b => c && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h);
      if (I.pressed('confirm') || I.pressed('hit') || hit && hit.id === 'hit') { h.cards.push(G.BJ.draw()); G.sfx('card_deal'); if (G.BJ.value(h.cards).v >= 21) this.nextHand(); }
      else if (I.pressed('alt') || I.pressed('stand') || hit && hit.id === 'stand') { G.sfx('card_flip'); this.nextHand(); }
      else if ((I.pressed('extra') || I.pressed('double') || hit && hit.id === 'double') && canDouble) { chipDelta(-h.bet); h.bet *= 2; h.cards.push(G.BJ.draw()); G.sfx('chip'); this.nextHand(); }
      else if ((I.pressed('tabR') || I.pressed('split') || hit && hit.id === 'split') && canSplit) { chipDelta(-h.bet); const c2 = h.cards.pop(), ace = h.cards[0].r === 'A'; B.hands.push({ cards: [c2, G.BJ.draw()], bet: h.bet, done: ace }); h.cards.push(G.BJ.draw()); if (ace) { h.done = true; this.dealerTurn(); } G.sfx('card_deal'); }
      void v; return;
    }
    if (B.phase === 'result') { if (I.pressed('confirm') || I.pressed('hit') || I.clicked()) { B.phase = 'bet'; B.out = null; } if (I.pressed('cancel')) this.back(); }
  },
  bjButtons() { const W = G.game.W, H = G.game.H, y = Math.round(H * .82) - 18, x0 = Math.round(W / 2 - 150); return [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']].map(([id, l], i) => ({ id, label: l, x: x0 + i * 76, y, w: 70, h: 16 })); },
  nextHand() { const B = this.bj; B.hands[B.cur].done = true; if (B.cur < B.hands.length - 1 && !B.hands[B.cur + 1].done) B.cur++; else this.dealerTurn(); },
  dealerTurn() {
    const B = this.bj; if (!B.hands.every(h => G.BJ.value(h.cards).v > 21)) G.BJ.dealerPlays(B.dealer);
    let back = 0; for (const h of B.hands) back += G.BJ.settle(h, B.dealer); chipDelta(back);
    const staked = B.hands.reduce((s, h) => s + h.bet, 0); B.out = { back, staked }; B.phase = 'result';
    if (B.hands[0].bj && back > 0) { this.say('pepper', G.pickLine('pepper', 'blackjack')); G.sfx('cash'); }
    else if (B.hands.every(h => G.BJ.value(h.cards).v > 21)) { this.say('pepper', G.pickLine('pepper', 'bust')); G.sfx('ui_error'); }
    else this.say('pepper', back > staked ? 'You win. The house is mildly inconvenienced.' : back === staked ? 'A push. How dull.' : 'The house wins. As is customary.');
  },
  /* ---- roulette ---- */
  rouletteItems() {
    const W = G.game.W, H = G.game.H, cw = 15, ch = 12, x0 = Math.round(W / 2 - 6 * cw - 16), y0 = Math.round(H * .4), R = this.rl, out = [];
    const add = (id, x, y, w, h, label, bet) => out.push({ id, x, y, w, h, label, bet, onPress: () => this.placeChip(bet) });
    add('n0', x0 - cw - 2, y0, cw, ch * 3, '0', { kind: 'num', n: 0 });
    for (let c = 0; c < 12; c++) for (let rr = 0; rr < 3; rr++) { const n = c * 3 + (3 - rr); add('n' + n, x0 + c * cw, y0 + rr * ch, cw - 1, ch - 1, String(n), { kind: 'num', n }); }
    for (let rr = 0; rr < 3; rr++) add('col' + (3 - rr), x0 + 12 * cw + 2, y0 + rr * ch, 22, ch - 1, '2:1', { kind: 'col', n: 3 - rr });
    for (let dz = 1; dz <= 3; dz++) add('dz' + dz, x0 + (dz - 1) * cw * 4, y0 + ch * 3 + 2, cw * 4 - 1, 11, ['1st 12', '2nd 12', '3rd 12'][dz - 1], { kind: 'dozen', n: dz });
    [['low', '1-18'], ['even', 'EVEN'], ['red', 'RED'], ['black', 'BLACK'], ['odd', 'ODD'], ['high', '19-36']].forEach(([k, l], i) => add(k, x0 + i * cw * 2, y0 + ch * 3 + 15, cw * 2 - 1, 11, l, { kind: k }));
    void R; return out;
  },
  placeChip(bet) { const R = this.rl, st = G.state; if (R.phase !== 'bet') return; if (st.chips < R.size) { G.sfx('ui_error'); return; } chipDelta(-R.size); const ex = R.bets.find(b => b.kind === bet.kind && b.n === bet.n); if (ex) ex.chips += R.size; else R.bets.push(Object.assign({ chips: R.size }, bet)); G.sfx('chip'); },
  updRoul(dt, I) {
    const R = this.rl, st = G.state;
    R.ang += R.spd * dt; R.spd *= Math.pow(.55, dt);
    if (R.phase === 'bet') {
      const its = this.rouletteItems(), ev = this.nav.update(its, I);
      if (ev.tab) { const s = [1, 5, 10, 25]; R.size = s[(s.indexOf(R.size) + ev.tab + 4) % 4]; G.sfx('ui_tab'); }
      if (ev.alt) { const f = its.find(i => i.id === this.nav.focus); if (f) { const k = R.bets.findIndex(b => b.kind === f.bet.kind && b.n === f.bet.n); if (k >= 0) { chipDelta(R.bets[k].chips); R.bets.splice(k, 1); G.sfx('ui_back'); } } }
      if (ev.extra && R.bets.length) { R.phase = 'spin'; R.t = 0; R.spd = 9; R.result = G.ROULETTE.spin(); G.sfx('wheel_spin'); this.say('kai', 'No more bets!'); }
      if (ev.back) { for (const b of R.bets) chipDelta(b.chips); R.bets = []; this.back(); }
      return;
    }
    if (R.phase === 'spin') {
      R.t += dt; if (G.chance('cosmetic', dt * 6)) G.sfx('ball_rattle');
      if (R.t > 3.2) {
        R.phase = 'result'; let back = 0; for (const b of R.bets) back += G.ROULETTE.pays(b, R.result); chipDelta(back); R.won = back; R.hist.unshift(R.result); R.hist = R.hist.slice(0, 10);
        this.say('kai', R.result + (R.result === 0 || R.result === '00' ? ' green.' : G.ROULETTE.RED.has(R.result) ? ' red.' : ' black.') + (back ? ' You win ' + back + ' chips!' : ' The ball has spoken.'));
        if (back) G.sfx('cash');
      }
      return;
    }
    if (R.phase === 'result' && (I.pressed('confirm') || I.pressed('extra') || I.clicked())) { R.phase = 'bet'; R.bets = []; }
    if (R.phase === 'result' && I.pressed('cancel')) this.back();
  },
  /* ---- drawing ---- */
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, st = G.state, T2 = G.THEMES.night;
      for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#2a1240', '#0a0614', y / H));
      for (let i = 0; i < 18; i++) { const x = (i * 53) % W, y = (i * 29) % Math.round(H * .3); px.blend(g, .3 + .3 * Math.sin(G.now() * 3 + i), 'add', () => px.disc(g, x, y, 2, i % 2 ? '#ff5fa2' : '#5ff0ff')); }
      const name = { cashier: 'CASHIER', prize: 'PRIZE COUNTER', slots: 'FORTUNA SEVENS', blackjack: 'BLACKJACK', roulette: 'ROULETTE' }[this.station] || 'CASINO FORTUNA';
      E.font.title(g, name, W / 2, Math.round(H * .04), { scale: 2, align: 'center', colors: ['#ffffff', '#ff5fa2', '#7a1a4a'] });
      // the chip count shows on every casino screen
      G.ui.panel(g, Math.round(W * .05), Math.round(H * .04), 92, 15, { theme: 'night' }); G.icon(g, 'chip', Math.round(W * .05) + 4, Math.round(H * .04) + 4); E.font.text(g, G.fmtChips(st.chips), Math.round(W * .05) + 14, Math.round(H * .04) + 4, '#5ff0ff', { outline: false });
      G.ui.panel(g, W - Math.round(W * .05) - 96, Math.round(H * .04), 96, 15, { theme: 'night' }); G.ui.money(g, W - Math.round(W * .05) - 92, Math.round(H * .04) + 4, st.money);
      if (this.station === 'cashier') { this.nav.draw(g, this.cashItems()); E.font.text(g, 'Chips are ' + G.fmtMoney(100) + ' each. Cash out any time.', W / 2, Math.round(H * .3), '#fff8e8', { align: 'center', outline: false }); G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]); }
      if (this.station === 'prize') { E.font.text(g, 'The Jackpot suit: 300 chips', W / 2, Math.round(H * .2), '#ffd36a', { align: 'center', outline: false }); if (this.prizeRig) { px.ell(g, W / 2, Math.round(H * .52) + 2, 22, 6, '#2a1240'); px.ell(g, W / 2, Math.round(H * .52), 20, 5, '#ff5fa2'); this.prizeRig.draw(g, W / 2, Math.round(H * .52), E.VIEWS.court); } this.nav.draw(g, this.prizeItems()); G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]); }
      if (this.station === 'slots') this.drawSlots(g, r);
      if (this.station === 'blackjack') this.drawBJ(g, r);
      if (this.station === 'roulette') this.drawRoul(g, r);
      if (this.msg) { const who = this.msgWho, w = Math.min(280, W - 40), x = Math.round((W - w) / 2), y = Math.round(H * .13), L = E.font.wrap(this.msg, w - 36); let left = Math.floor(this.msgT * 50); G.ui.panel(g, x, y, w, Math.max(24, L.length * 9 + 8), { theme: 'night', alpha: .9 }); if (G.CAST[who]) G.portrait(g, G.portraitRig(who), x + 3, y + 2, 20, { frame: false }); L.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; if (s) E.font.text(g, s, x + 28, y + 4 + i * 9, '#fff8e8', { outline: false }); }); }
    });
    if (G.talk) G.talk.draw(r);
  },
  drawSlots(g, r) {
    const S = this.slot, W = r.W, H = r.H, x0 = Math.round(W / 2 - 60), y0 = Math.round(H * .26), rw = 38, rh = 26;
    E.ui.box(g, x0 - 12, y0 - 12, 3 * rw + 24 + 4, 3 * rh + 24, { bg: ['#e8283a', '#8a1020'], border: '#ffd36a', alpha: 1 });
    for (let k = 0; k < 3; k++) {
      const strip = G.Slots.strips[k], base = S.stops[k] + Math.floor(S.off[k]), fr = S.off[k] % 1;
      px.rect(g, x0 + k * (rw + 2), y0, rw, rh * 3, '#f8f6f0');
      for (let rr = -1; rr <= 3; rr++) {
        const s = strip[((base + rr - 1) % 21 + 21) % 21], y = Math.round(y0 + rr * rh - (S.spin[k] ? fr * rh : 0));
        if (y < y0 - rh + 4 || y > y0 + rh * 3 - 4) continue;
        const cx = x0 + k * (rw + 2) + rw / 2;
        g.save(); g.beginPath(); g.rect(x0 + k * (rw + 2), y0, rw, rh * 3); g.clip();
        if (S.spin[k]) px.blend(g, .7, 'normal', () => this.symbol(g, s, cx, y + rh / 2)); else this.symbol(g, s, cx, y + rh / 2);
        g.restore();
      }
    }
    // the lines played, and the wins lit
    const lines = S.bet === 1 ? 1 : S.bet === 2 ? 3 : 5;
    for (let i = 0; i < lines; i++) { const L = G.Slots.LINES[i], lit = S.win && S.win.lines.some(([j]) => j === i); const p = L.map((row, k) => [x0 + k * (rw + 2) + rw / 2, y0 + row * rh + rh / 2]); for (let k = 0; k < 2; k++) px.line(g, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1], lit ? (Math.floor(G.now() * 6) % 2 ? '#ffd36a' : '#ffffff') : '#ff5fa2'); }
    E.font.text(g, 'Bet ◀ ' + S.bet + ' ▶  (' + lines + ' line' + (lines > 1 ? 's' : '') + ')', W / 2, y0 + rh * 3 + 18, '#fff8e8', { align: 'center', outline: false });
    if (S.win) E.font.text(g, S.win.total ? 'WIN ' + S.win.total + ' CHIPS!' : 'No win', W / 2, y0 + rh * 3 + 30, S.win.total ? '#ffd36a' : '#c8b0e0', { align: 'center', scale: S.win.total ? 2 : 1, shadow: '#000', outline: false });
    const pay = '777 ×100 · BAR ×30 · SONNY ×20 (wild) · BALL ×12 · PALM ×8 · COCONUT ×5 · CHERRIES ×2 ×5 ×10';
    E.font.text(g, pay, W / 2, Math.round(H * .8), '#c8b0e0', { align: 'center', outline: false, wrap: W * .8 });
    G.promptBar(g, r, S.phase === 'spin' ? [['reel1', 'Reel 1'], ['reel2', 'Reel 2'], ['reel3', 'Reel 3']] : [['confirm', 'Spin'], ['move', 'Bet'], ['cancel', 'Back']]);
  },
  symbol(g, s, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (s === '7') E.font.title(g, '7', x, y - 9, { scale: 2, align: 'center', colors: ['#ff5a5a', '#c8102a'], depth: 1 });
    else if (s === 'BAR') { px.rect(g, x - 12, y - 5, 24, 10, '#141018'); E.font.text(g, 'BAR', x, y - 3, '#ffd36a', { align: 'center', outline: false }); }
    else if (s === 'S') { px.disc(g, x, y, 8, '#d9a27a'); px.rect(g, x - 6, y - 3, 12, 3, '#ffd36a'); px.rect(g, x - 7, y - 9, 14, 4, '#121014'); px.rect(g, x - 2, y + 3, 4, 1, '#6a2a1a'); }
    else if (s === 'V') px.sprite(g, G.BALL_SPR[0], x - 3, y - 3, { scale: 2 });
    else if (s === 'P') { px.rect(g, x - 1, y - 2, 2, 10, '#8a5a32'); for (let k = -2; k <= 2; k++) px.line(g, x, y - 3, x + k * 4, y - 6 + Math.abs(k) * 2, '#2f8f4e', 2); }
    else if (s === 'C') { px.disc(g, x, y, 6, '#6a4428'); px.dot(g, x - 2, y - 2, '#9a6a48'); px.dot(g, x + 1, y - 1, '#2a1a10'); }
    else if (s === 'X') { px.blend(g, .5, 'normal', () => { px.line(g, x - 3, y, x + 3, y, '#e8b0c8'); px.line(g, x, y - 3, x, y + 3, '#e8b0c8'); }); }
    else { px.disc(g, x - 3, y + 3, 4, '#e8283a'); px.disc(g, x + 4, y + 2, 4, '#c8102a'); px.line(g, x - 3, y, x + 2, y - 8, '#2f8f4e'); px.line(g, x + 4, y, x + 2, y - 8, '#2f8f4e'); }
  },
  drawBJ(g, r) {
    const B = this.bj, W = r.W, H = r.H;
    px.ell(g, W / 2, Math.round(H * .5), Math.round(W * .38), Math.round(H * .3), '#0e4a2a'); px.ell(g, W / 2, Math.round(H * .5), Math.round(W * .36), Math.round(H * .28), '#1e7a4a');
    E.font.text(g, 'BLACKJACK PAYS 3 TO 2 · DEALER ' + (G.T.dealerHitsSoft17 ? 'HITS' : 'STANDS ON') + ' SOFT 17', W / 2, Math.round(H * .46), '#ffd36a', { align: 'center', outline: false });
    if (!this.pepRig) this.pepRig = G.makeRig('pepper'); G.Anim.idle(this.pepRig, 1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    this.pepRig.draw(g, W / 2, Math.round(H * .3), E.VIEWS.court);
    if (B.phase !== 'bet') {
      const hide = B.phase === 'play';
      B.dealer.forEach((c, i) => G.drawCard(g, W / 2 - B.dealer.length * 11 + i * 22, Math.round(H * .32), c, !(hide && i === 1)));
      if (!hide) E.font.text(g, String(G.BJ.value(B.dealer).v), W / 2 + B.dealer.length * 11 + 6, Math.round(H * .36), '#fff8e8', { outline: false });
      B.hands.forEach((h, hi) => { const cx = W / 2 + (hi - (B.hands.length - 1) / 2) * 110; h.cards.forEach((c, i) => G.drawCard(g, cx - h.cards.length * 10 + i * 20, Math.round(H * .56), c, true)); const v = G.BJ.value(h.cards).v; E.font.text(g, (v > 21 ? 'BUST ' : '') + v + '  · bet ' + h.bet, cx, Math.round(H * .56) + 28, hi === B.cur && B.phase === 'play' ? '#ffd36a' : '#fff8e8', { align: 'center', outline: false }); });
    }
    if (B.phase === 'bet') { E.font.text(g, 'Bet ◀ ' + B.bet + ' chips ▶', W / 2, Math.round(H * .62), '#fff8e8', { align: 'center', scale: 2, shadow: '#000', outline: false }); G.promptBar(g, r, [['confirm', 'Deal'], ['move', 'Bet'], ['cancel', 'Leave']]); }
    else if (B.phase === 'play') { for (const b of this.bjButtons()) G.ui.button(g, b, false); G.promptBar(g, r, [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']]); }
    else { E.font.text(g, B.out.back > B.out.staked ? '+' + (B.out.back - B.out.staked) + ' chips' : B.out.back === B.out.staked ? 'Push' : '-' + (B.out.staked - B.out.back) + ' chips', W / 2, Math.round(H * .76), B.out.back > B.out.staked ? '#9ff3a8' : '#ff9a8a', { align: 'center', scale: 2, shadow: '#000', outline: false }); G.promptBar(g, r, [['confirm', 'Next hand'], ['cancel', 'Leave']]); }
  },
  drawRoul(g, r) {
    const R = this.rl, W = r.W, H = r.H, its = this.rouletteItems();
    // the wheel inset
    const cx = Math.round(W / 2), cy = Math.round(H * .26), rad = 24, P = G.ROULETTE.pockets(), n = P.length;
    px.disc(g, cx, cy, rad + 4, '#5a3a1a'); px.disc(g, cx, cy, rad + 2, '#ffd36a');
    for (let i = 0; i < n; i++) { const a0 = R.ang + i / n * TAU, a1 = a0 + TAU / n, v = P[i]; px.poly(g, [[cx, cy], [cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad], [cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad]], v === 0 || v === '00' ? '#1e9a4a' : G.ROULETTE.RED.has(v) ? '#d8283a' : '#141018'); }
    px.disc(g, cx, cy, 8, '#8a5a2a'); px.disc(g, cx, cy, 4, '#ffd36a');
    if (R.phase !== 'bet' && R.result !== null) { const k = P.indexOf(R.result), sp = R.phase === 'spin' ? clamp(1 - R.t / 3.2, 0, 1) : 0, a = R.ang + (k + .5) / n * TAU - sp * 20, rr = rad - 3 + sp * 6; px.disc(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, '#ffffff'); }
    for (const it of its) {
      const b = it.bet, num = b.kind === 'num' ? b.n : null, bg = num === 0 ? '#1e9a4a' : num ? (G.ROULETTE.RED.has(num) ? '#c8202a' : '#1a1a22') : b.kind === 'red' ? '#c8202a' : b.kind === 'black' ? '#1a1a22' : '#1e6a3a';
      const hot = R.phase === 'result' && G.ROULETTE.pays(Object.assign({ chips: 1 }, b), R.result) > 0;
      px.rect(g, it.x, it.y, it.w, it.h, hot ? '#ffd36a' : bg); px.rect(g, it.x, it.y, it.w, 1, '#3a8a5a');
      E.font.text(g, it.label, it.x + it.w / 2, it.y + Math.round((it.h - 7) / 2), hot ? '#2a1a10' : '#fff8e8', { align: 'center', outline: false, font: it.label.length > 3 ? 'tiny' : undefined });
      const placed = R.bets.find(q => q.kind === b.kind && q.n === b.n); if (placed) { px.disc(g, it.x + it.w - 4, it.y + 4, 3, '#ffd36a'); E.font.text(g, String(placed.chips), it.x + it.w - 4, it.y + 2, '#2a1a10', { align: 'center', outline: false, font: 'tiny' }); }
      if (this.nav.focus === it.id && R.phase === 'bet') G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    E.font.text(g, 'Chip size ' + R.size + '   On the table ' + R.bets.reduce((s, b) => s + b.chips, 0), W / 2, Math.round(H * .76), '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, 'Last: ' + (R.hist.length ? R.hist.join(' ') : '—'), W / 2, Math.round(H * .8), '#c8b0e0', { align: 'center', outline: false });
    G.promptBar(g, r, R.phase === 'bet' ? [['confirm', 'Chip'], ['alt', 'Remove'], ['extra', 'Spin'], ['tabL', 'Size']] : R.phase === 'result' ? [['confirm', 'New bets'], ['cancel', 'Leave']] : []);
  }
};
