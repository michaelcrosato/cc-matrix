import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  const S = G.Slots;
  const rtp = S.rtp(200000, 1, 3); t.ok('slots RTP 89-95% over 200k spins', rtp >= .89 && rtp <= .95, rtp.toFixed(3));
  t.ok('7-7-7 pays 100', S.lineWin(['7', '7', '7']) === 100); t.ok('Sonny is wild', S.lineWin(['V', 'S', 'V']) === 12 && S.lineWin(['S', 'S', 'S']) === 20);
  t.ok('cherries by count', S.lineWin(['R', 'X', 'C']) === 2 && S.lineWin(['R', 'R', 'X']) === 5 && S.lineWin(['R', 'R', 'R']) === 10);
  const st7 = S.strips.map(L => L.indexOf('7')); t.ok('a bet of 1 plays the centre line', S.evaluate(st7, 1).total === 100);
  // blackjack
  const B = G.BJ, c = (r, s = '♠') => ({ r, s });
  t.ok('blackjack values', B.value([c('A'), c('K')]).v === 21 && B.value([c('A'), c('A'), c('9')]).v === 21 && B.value([c('K'), c('Q'), c('5')]).v === 25);
  G.T.dealerHitsSoft17 = false; B.forced = [c('5')]; const d1 = B.dealerPlays([c('A'), c('6')]); t.ok('S17: the dealer stands on soft 17', d1.length === 2);
  G.T.dealerHitsSoft17 = true; B.forced = [c('2')]; const d2 = B.dealerPlays([c('A'), c('6')]); t.ok('H17: the dealer hits soft 17', d2.length >= 3); G.T.dealerHitsSoft17 = false; B.forced = null;
  t.ok('blackjack pays 3:2', B.settle({ cards: [c('A'), c('K')], bet: 10, bj: true }, [c('10'), c('9')]) === 25);
  t.ok('a double pays double', B.settle({ cards: [c('5'), c('6'), c('10')], bet: 20 }, [c('10'), c('8')]) === 40);
  t.ok('a push returns the stake', B.settle({ cards: [c('10'), c('8')], bet: 10 }, [c('10'), c('8')]) === 10);
  B.newShoe(); t.ok('a 6-deck shoe', B.shoe.length === 312); B.used = 240; B.draw(); t.ok('reshuffled past 75%', B.used <= 2);
  // split aces get one card each (through the scene)
  G.state = G.newState('rin', 1); G.dayStart(); G.state.chips = 100; game.go('casino', { station: 'blackjack' }, { fade: 0 }); game.advance(.1);
  const sc = game.scene; B.forced = [c('A'), c('A'), c('9'), c('7'), c('5'), c('6')]; game.input.tap('confirm'); game.advance(.05); game.input.tap('split'); game.advance(.05);
  t.ok('split aces: one card each, then the dealer', sc.bj.hands.length === 2 && sc.bj.hands.every(h => h.cards.length === 2) && sc.bj.phase === 'result', JSON.stringify(sc.bj.hands.map(h => h.cards.map(x => x.r))));
  B.forced = null;
  // roulette
  const R = G.ROULETTE; t.ok('the wheel order has 37 pockets', R.ORDER.length === 37 && new Set(R.ORDER).size === 37);
  t.ok('straight pays 35:1', R.pays({ kind: 'num', n: 17, chips: 1 }, 17) === 36); t.ok('red pays 1:1', R.pays({ kind: 'red', chips: 2 }, 1) === 4 && R.pays({ kind: 'red', chips: 2 }, 2) === 0);
  t.ok('zero loses even bets', R.pays({ kind: 'even', chips: 1 }, 0) === 0); t.ok('dozens and columns pay 2:1', R.pays({ kind: 'dozen', n: 2, chips: 1 }, 15) === 3 && R.pays({ kind: 'col', n: 1, chips: 1 }, 34) === 3);
  const cnt = {}; G.seed('casino', 9); for (let i = 0; i < 37000; i++) { const x = R.spin(); cnt[x] = (cnt[x] || 0) + 1; } let chi = 0; for (const k of R.ORDER) chi += Math.pow((cnt[k] || 0) - 1000, 2) / 1000;
  t.ok('results uniform over 37k spins (chi-square)', chi < 80, chi.toFixed(1));
  G.T.rouletteDoubleZero = true; t.ok('the dev toggle adds 00', R.pockets().length === 38); G.T.rouletteDoubleZero = false;
  // the cashier
  game.go('casino', { station: 'cashier' }, { fade: 0 }); game.advance(.05); const st = G.state, m0 = st.money, c0 = st.chips; const it = game.scene.cashItems()[0]; it.onPress(); t.ok('buy 10 chips for S$1,000', st.chips === c0 + 10 && st.money === m0 - 1000);
  game.scene.cashItems().find(i => i.id === 'out').onPress(); t.ok('cash out at S$100 a chip', st.chips === 0 && st.money === m0 - 1000 + (c0 + 10) * 100);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
