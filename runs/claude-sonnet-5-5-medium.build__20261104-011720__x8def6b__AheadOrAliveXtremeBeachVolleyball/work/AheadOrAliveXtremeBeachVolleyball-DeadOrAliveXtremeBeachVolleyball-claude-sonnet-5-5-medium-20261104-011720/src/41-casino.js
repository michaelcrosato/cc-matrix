/* 41-casino: Casino Fortuna. Fortuna Sevens (pachislot with an internal lottery and skill stops), blackjack, roulette. */
const CR = () => G.rng('casino');
const BETS = [50, 100, 250, 500, 1000];

/* the three table games share a frame: a felt background, the wallet, a bet chooser and a leave button */
class Table {
  constructor(back, title) { this.back = back; this.title = title; this.bet = 1; this.msg = ''; this.t = 0; this.menu = null; }
  get stake() { return Math.min(BETS[this.bet], G.state.money); }
  betInput() {
    const I = G.game.input;
    if (I.pressed('left')) { this.bet = Math.max(0, this.bet - 1); G.sfx('select'); }
    if (I.pressed('right')) { this.bet = Math.min(BETS.length - 1, this.bet + 1); G.sfx('select'); }
  }
  frame(r, felt) {
    const W = r.W, H = r.H, s = G.state;
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#3a0a1e'); px.rect(g, 6, 22, W - 12, H - 44, felt || '#12684a'); E.ui.box(g, 6, 22, W - 12, H - 44, { bg: [felt || '#12684a', '#0a4a34'], border: '#c8962a' });
      E.font.title(g, this.title, W / 2, 5, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 1, depthColor: '#5a1030' });
      G.text(g, 'Wallet ' + G.fmtMoney(s.money), 8, 8, '#9bffb0'); G.text(g, 'Net ' + (s.stats.casinoNet >= 0 ? '+' : '') + G.fmtMoney(s.stats.casinoNet), W - 8, 8, s.stats.casinoNet >= 0 ? '#9bffb0' : '#ffb0a0', { align: 'right' });
    });
  }
  betBar(r, y) { r.overlay(g => { const W = r.W; G.text(g, '◀  BET ' + G.fmtMoney(this.stake) + '  ▶', W / 2, y, '#fff6c8', { align: 'center' }); if (this.msg) G.text(g, this.msg, W / 2, y + 12, '#ffd24a', { align: 'center' }); }); }
  win(n) { const s = G.state; s.money += n; s.stats.casinoNet += n; if (n > 0) s.stats.earned += n; }
}

/* ---- Fortuna Sevens ---- */
const SYM = [['7', '#ff4f6a'], ['BAR', '#ffffff'], ['CHERRY', '#ff6a8a'], ['BELL', '#ffd24a'], ['STAR', '#fff06a'], ['SHELL', '#ffb0c8'], ['7', '#ff4f6a'], ['BELL', '#ffd24a'], ['CHERRY', '#ff6a8a'], ['STAR', '#fff06a']];
const PAY = { '7': 50, BAR: 15, BELL: 8, CHERRY: 4, SHELL: 3 };
class Slots extends Table {
  constructor(back) { super(back, 'FORTUNA SEVENS'); this.reels = [{ pos: 0, v: 0, on: false }, { pos: 3, v: 0, on: false }, { pos: 6, v: 0, on: false }]; this.state = 'idle'; this.stopN = 0; this.target = null; this.lines = ''; }
  lottery() {
    const x = CR()(); if (x < .03) return '7'; if (x < .08) return 'BAR'; if (x < .16) return 'BELL'; if (x < .31) return 'CHERRY'; if (x < .43) return 'SHELL'; return null;
  }
  spin() {
    if (G.state.money < 10) { this.msg = 'You are out of money. The house sends sympathy.'; return; }
    this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.target = this.lottery(); this.state = 'spin'; this.stopN = 0; this.msg = 'Press ' + G.label('confirm') + ' to stop each reel!';
    this.reels.forEach(rl => { rl.on = true; rl.v = 14 + CR()() * 6; }); G.sfx('slotSpin');
  }
  stopReel(i) {
    const rl = this.reels[i]; rl.on = false; let p = Math.round(rl.pos) % SYM.length;
    if (this.target) {            // skill assist: slide up to 2 positions toward the lotteried symbol
      for (const d of [0, 1, -1, 2, -2]) { const q = (p + d + SYM.length * 4) % SYM.length; if (SYM[q][0] === this.target) { p = q; break; } }
    } else {                      // no win: avoid completing a line
      const prev = this.reels.slice(0, i).filter(x => !x.on).map(x => SYM[Math.round(x.pos) % SYM.length][0]);
      if (i === 2 && prev.length === 2 && prev[0] === prev[1] && SYM[p][0] === prev[0]) p = (p + 1) % SYM.length;
    }
    rl.pos = p; G.sfx('slotStop');
  }
  update(dt) {
    this.t += dt; const I = G.game.input;
    for (const rl of this.reels) if (rl.on) rl.pos = (rl.pos + rl.v * dt * 3) % SYM.length;
    if (this.state === 'idle') { this.betInput(); if (I.pressed('confirm') || I.pressed('play')) this.spin(); }
    else if (this.state === 'spin') {
      if (I.pressed('confirm') || I.pressed('play')) { this.stopReel(this.stopN++); if (this.stopN >= 3) { this.state = 'pay'; this.pt = 0; } }
    } else if (this.state === 'pay') {
      this.pt += dt; if (this.pt > .5) {
        const s = this.reels.map(r => SYM[Math.round(r.pos) % SYM.length][0]);
        if (s[0] === s[1] && s[1] === s[2]) { const m = PAY[s[0]] || 3, w = this.paid * m; this.win(w); this.msg = s[0] === '7' ? 'JACKPOT! ' + G.fmtMoney(w) : 'WIN ' + G.fmtMoney(w) + '  (x' + m + ')'; G.sfx(s[0] === '7' ? 'jackpot' : 'coin'); if (s[0] === '7') G.game.shake(3); }
        else this.msg = 'No line. The reels shrug.';
        this.state = 'idle'; G.autosave && 0;
      }
    }
  }
  draw(r) {
    const W = r.W, H = r.H; this.frame(r, '#7a1030');
    r.overlay(g => {
      const cx = W / 2, y = 52, rw = 56, gap = 6, x0 = Math.round(cx - (rw * 3 + gap * 2) / 2);
      E.ui.box(g, x0 - 8, y - 8, rw * 3 + gap * 2 + 16, 84, { bg: ['#2a2a4a', '#12122a'], border: '#ffd24a' });
      this.reels.forEach((rl, i) => {
        const x = x0 + i * (rw + gap); E.ui.box(g, x, y, rw, 68, { bg: ['#fffaf0', '#e8dcc0'], border: '#8a6a3a' });
        for (let k = -1; k <= 1; k++) {
          const idx = ((Math.round(rl.pos) + k) % SYM.length + SYM.length) % SYM.length, frac = rl.on ? (rl.pos - Math.round(rl.pos)) * 22 : 0, yy = Math.round(y + 24 + k * 22 + frac);
          if (yy < y - 4 || yy > y + 60) continue; const sy = SYM[idx];
          px.rect(g, x + 4, Math.max(y + 2, yy - 2), rw - 8, 0, '#fff');
          if (yy >= y + 2 && yy <= y + 56) E.font.text(g, sy[0], x + rw / 2, yy + 3, sy[0] === '7' ? '#d41a3a' : '#2a2418', { align: 'center', outline: false, scale: sy[0] === '7' ? 2 : 1 });
        }
        if (rl.on) px.rect(g, x, y + 22, rw, 1, '#00000022');
      });
      px.rect(g, x0 - 6, y + 31, rw * 3 + gap * 2 + 12, 2, '#ff4f6a99');
      G.text(g, 'Payout: 7 7 7 x50  BAR x15  BELL x8  CHERRY x4  SHELL x3', cx, y + 82, '#fff6c8', { align: 'center' });
    });
    this.betBar(r, 142);
    G.drawPrompts(r, [['confirm', this.state === 'spin' ? 'Stop reel' : 'Spin'], ['cancel', 'Leave table']]);
  }
}

/* ---- Blackjack ---- */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS_C = [['S', '#2a2a3a'], ['H', '#d41a3a'], ['D', '#d41a3a'], ['C', '#2a2a3a']];
const total = h => { let t = 0, a = 0; for (const c of h) { const r = c.r; t += r === 0 ? 11 : r >= 9 ? 10 : r + 1; if (r === 0) a++; } while (t > 21 && a > 0) { t -= 10; a--; } return t; };
class Blackjack extends Table {
  constructor(back) { super(back, 'BLACKJACK'); this.state = 'bet'; this.player = []; this.dealer = []; this.deck = []; this.dealerName = 'PEPPER'; }
  draw1() { if (this.deck.length < 12) { this.deck = []; for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) this.deck.push({ r, s }); for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(CR()() * (i + 1)); [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; } } G.sfx('card'); return this.deck.pop(); }
  deal() {
    if (G.state.money < 10) { this.msg = 'No chips, no cards.'; return; }
    this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.player = [this.draw1(), this.draw1()]; this.dealer = [this.draw1(), this.draw1()]; this.state = 'play'; this.msg = '';
    this.menu = new G.Menu([{ label: 'Hit', onPick: () => this.hit() }, { label: 'Stand', onPick: () => this.stand() }, { label: 'Double down', onPick: () => this.double() }], { x: 'center', y: 150, w: 110, gap: 13 });
    if (total(this.player) === 21) { this.stand(true); }
  }
  hit() { this.player.push(this.draw1()); if (total(this.player) > 21) this.finish('bust'); else if (total(this.player) === 21) this.stand(); }
  double() { if (G.state.money < this.paid) { this.msg = 'Not enough to double.'; G.sfx('cancel'); return; } G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.paid *= 2; this.player.push(this.draw1()); if (total(this.player) > 21) this.finish('bust'); else this.stand(); }
  stand(bj) { this.state = 'dealer'; this.dt = 0; this.bj = bj; }
  finish(res) {
    const p = total(this.player), d = total(this.dealer); let w = 0;
    if (res === 'bust') { this.msg = 'BUST. ' + this.dealerName + ' pats the table gently.'; }
    else if (this.bj && p === 21 && this.player.length === 2 && !(d === 21 && this.dealer.length === 2)) { w = Math.round(this.paid * 2.5); this.msg = 'BLACKJACK! Pays 3:2.'; G.sfx('jackpot'); }
    else if (d > 21 || p > d) { w = this.paid * 2; this.msg = 'You win ' + G.fmtMoney(this.paid) + '!'; G.sfx('coin'); }
    else if (p === d) { w = this.paid; this.msg = 'Push. Money back.'; }
    else this.msg = this.dealerName + ' wins with ' + d + '.';
    if (w) this.win(w); this.state = 'bet'; this.menu = null; this.shown = true;
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'bet') { this.betInput(); if (G.game.input.pressed('confirm')) this.deal(); }
    else if (this.state === 'play') this.menu.update(dt);
    else if (this.state === 'dealer') { this.dt += dt; if (this.dt > .7) { this.dt = 0; if (total(this.dealer) < 17) this.dealer.push(this.draw1()); else this.finish(); } }
  }
  cards(g, hand, x, y, hide) { hand.forEach((c, i) => { const cx = x + i * 22; if (hide && i === 1) { E.ui.box(g, cx, y, 20, 28, { bg: ['#3a5ad0', '#1a2a80'], border: '#fff' }); return; } E.ui.box(g, cx, y, 20, 28, { bg: ['#ffffff', '#ece6d0'], border: '#3a3a4a' }); G.text(g, RANKS[c.r], cx + 3, y + 4, SUITS_C[c.s][1], { shadow: null }); G.text(g, SUITS_C[c.s][0], cx + 3, y + 15, SUITS_C[c.s][1], { shadow: null }); }); }
  draw(r) {
    const W = r.W; this.frame(r);
    r.overlay(g => {
      G.text(g, this.dealerName, W / 2, 28, '#ffd24a', { align: 'center' }); this.cards(g, this.dealer, Math.round(W / 2 - this.dealer.length * 11), 38, this.state === 'play'); if (this.dealer.length && this.state !== 'play') G.text(g, '' + total(this.dealer), W / 2, 69, '#fff', { align: 'center' });
      G.text(g, 'YOU', W / 2, 88, '#9bffb0', { align: 'center' }); this.cards(g, this.player, Math.round(W / 2 - this.player.length * 11), 98, false); if (this.player.length) G.text(g, '' + total(this.player), W / 2, 129, '#fff', { align: 'center' });
    });
    if (this.state === 'bet') { this.betBar(r, 142); G.drawPrompts(r, [['confirm', 'Deal'], ['cancel', 'Leave table']]); } else { r.overlay(g => G.text(g, this.msg, W / 2, 140, '#ffd24a', { align: 'center' })); if (this.menu) this.menu.draw(r); }
    if (this.state === 'bet' || this.state === 'dealer') { }
  }
}

/* ---- Roulette ---- */
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
class Roulette extends Table {
  constructor(back) { super(back, 'ROULETTE'); this.state = 'bet'; this.choices = [{ k: 'red', n: 'Red' }, { k: 'black', n: 'Black' }, { k: 'odd', n: 'Odd' }, { k: 'even', n: 'Even' }, { k: 'low', n: '1-18' }, { k: 'high', n: '19-36' }, { k: 'num', n: 'Number' }]; this.ci = 0; this.num = 7; this.ang = 0; this.ball = 0; this.result = null; }
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.state === 'bet') {
      this.betInput(); if (I.pressed('up')) { this.ci = (this.ci + this.choices.length - 1) % this.choices.length; G.sfx('select'); } if (I.pressed('down')) { this.ci = (this.ci + 1) % this.choices.length; G.sfx('select'); }
      if (this.choices[this.ci].k === 'num') { if (I.pressed('tab') || I.repeat('up', .5, .1) && false) { } if (I.pressed('tabNext')) { this.num = (this.num + 1) % 37; } if (I.pressed('tab')) { this.num = (this.num + 36) % 37; } }
      if (I.pressed('confirm')) { if (G.state.money < 10) { this.msg = 'No money, no spin.'; return; } this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.state = 'spin'; this.st = 0; this.result = Math.floor(CR()() * 37); this.spinTo = 3 * TAU + (WHEEL.indexOf(this.result) / 37) * TAU; this.msg = ''; this.bet0 = this.choices[this.ci].k; G.sfx('roulette'); }
    } else if (this.state === 'spin') {
      this.st += dt; const k = clamp(this.st / 4, 0, 1), e = 1 - Math.pow(1 - k, 3); this.ball = -this.spinTo * e; this.ang += dt * (2.5 * (1 - e) + .2);
      if (Math.floor(this.st * 14) !== Math.floor((this.st - dt) * 14) && k < .9) G.sfx('roulette', { vol: .3 });
      if (k >= 1) this.settle();
    } else if (this.state === 'show') { this.st += dt; if (this.st > 1.4) this.state = 'bet'; }
  }
  settle() {
    const n = this.result, red = REDS.has(n), b = this.bet0; let w = 0;
    const ok = b === 'red' ? red : b === 'black' ? n > 0 && !red : b === 'odd' ? n > 0 && n % 2 === 1 : b === 'even' ? n > 0 && n % 2 === 0 : b === 'low' ? n >= 1 && n <= 18 : b === 'high' ? n >= 19 : n === this.num;
    if (ok) { w = b === 'num' ? this.paid * 36 : this.paid * 2; this.win(w); this.msg = n + (red ? ' red' : n ? ' black' : ' green') + '. You win ' + G.fmtMoney(w - this.paid) + '!'; G.sfx(b === 'num' ? 'jackpot' : 'coin'); } else this.msg = n + (red ? ' red' : n ? ' black' : ' green') + '. The ball does not care about you.';
    this.state = 'show'; this.st = 0;
  }
  draw(r) {
    const W = r.W; this.frame(r);
    r.overlay(g => {
      const cx = Math.round(W * .66), cy = 84, R = 52;
      px.disc(g, cx, cy, R + 4, '#3a2410'); px.disc(g, cx, cy, R, '#1a1a1a');
      for (let i = 0; i < 37; i++) { const a0 = this.ang + i / 37 * TAU, a1 = this.ang + (i + 1) / 37 * TAU, n = WHEEL[i], col = n === 0 ? '#1a8a3a' : REDS.has(n) ? '#c8203a' : '#111'; px.poly(g, [[cx + Math.cos(a0) * 20, cy + Math.sin(a0) * 20], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R], [cx + Math.cos(a1) * 20, cy + Math.sin(a1) * 20]], col); }
      px.disc(g, cx, cy, 16, '#c8962a'); px.disc(g, cx, cy, 12, '#8a5a1a');
      const pocket = this.ang + ((this.result === null ? 0 : WHEEL.indexOf(this.result)) + .5) / 37 * TAU, ke = clamp(this.st / 4, 0, 1), ee = 1 - Math.pow(1 - ke, 3);
      const ba = this.state === 'bet' ? this.t * .5 : this.state === 'spin' ? pocket - this.spinTo * (1 - ee) : pocket; const br = R - 8;
      px.disc(g, Math.round(cx + Math.cos(ba) * br), Math.round(cy + Math.sin(ba) * br), 3, '#ffffff');
      if (this.result !== null && this.state !== 'bet') E.font.title(g, '' + this.result, cx, cy - 6, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd24a'], depth: 1 });
      // bet list
      this.choices.forEach((c, i) => { const y = 32 + i * 14, sel = i === this.ci; E.ui.box(g, 14, y, 92, 12, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#0a4a34', '#06281c'], border: '#2a6a5a' }); G.text(g, c.n + (c.k === 'num' ? ' ' + this.num : ''), 20, y + 3, '#fff'); G.text(g, c.k === 'num' ? 'x36' : 'x2', 100, y + 3, '#ffd24a', { align: 'right' }); });
    });
    if (this.state === 'bet') { this.betBar(r, 142); G.drawPrompts(r, [['confirm', 'Spin'], ['tab', 'Number -'], ['tabNext', 'Number +'], ['cancel', 'Leave table']]); } else r.overlay(g => G.text(g, this.msg, W / 2, 142, '#ffd24a', { align: 'center' }));
  }
}

G.scenes.casino = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'casino', pausable: true,
  enter(d) {
    this.d = d; this.t = 0; G.music('casino'); G.game.focus(0, 0, 14);
    this.game = d.game === 'slots' ? new Slots(d.back) : d.game === 'bj' ? new Blackjack(d.back) : new Roulette(d.back);
  },
  update(dt) {
    this.t += dt; const I = G.game.input, tb = this.game;
    if (this.d.attract) {                                  // the attract mode plays the machine for you
      this.at = (this.at || 0) + dt; if (this.at > (this.d.time || 12)) { G.attractNext(); return; }
      if (G.state.money < 500) G.state.money = 5000;
      if (tb.state === 'idle' && this.at % 3 < dt * 1.5 + .02) tb.spin(); else if (tb.state === 'idle' && tb.t % 3 < .03) tb.spin();
      this.ast = (this.ast || 0) + dt; if (tb.state === 'spin' && this.ast > .55) { this.ast = 0; tb.stopReel(tb.stopN++); if (tb.stopN >= 3) { tb.state = 'pay'; tb.pt = 0; } }
      tb.update(dt); return;
    }
    tb.update(dt);
    const busy = tb.state === 'spin' || tb.state === 'dealer' || tb.state === 'play' || tb.state === 'pay' || (tb.state === 'show');
    if (I.pressed('cancel') && !busy) { G.game.go('location', { loc: this.d.back }); return; }
    if (I.pressed('cancel') && tb.state === 'play') { /* must finish the hand */ }
  },
  draw(r) { this.game.draw(r); }
});
