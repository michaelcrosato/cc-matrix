import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  G.state = G.newState('tess', 4); G.dayStart(); const st = G.state;
  const r1 = G.buy('riptide', 'lifeguard'); t.ok('buy a suit', r1.ok && st.wardrobe.suits.includes('lifeguard') && st.money === 30000 - r1.price);
  t.ok('a suit is bought once', G.buy('riptide', 'lifeguard').why === 'owned');
  st.money = 100; t.ok('not enough money', G.buy('coral', 'midnight').why === 'money'); st.money = 50000;
  for (let i = 0; i < 9; i++) G.buy('sundries', 'coconut'); t.ok('a bag holds 9 of a gift', st.bag.coconut === 9 && G.buy('sundries', 'coconut').why === 'full');
  const d1 = JSON.stringify(st.deals); G.state = G.newState('tess', 4); G.dayStart(); t.ok('deals are the same for the same seed and day', JSON.stringify(G.state.deals) === d1 && Object.values(G.state.deals).every(d => d.length === 2));
  const S = G.state, deal = S.deals.coral[0], it = G.itemById(deal); t.ok('a deal is 25% off', G.priceOf(it, 'coral') === Math.round(it.price * .75 / 100) * 100);
  t.ok('day items arrive on their day', !G.shopStock('coral', 1).some(e => e.item.id === 'midnight') && G.shopStock('coral', 4).some(e => e.item.id === 'midnight'));
  S.money = 99999; G.buy('coral', 'monaco'); G.equip('monaco'); t.ok('equip a suit', S.wearing.suit === 'monaco');
  G.buy('riptide', 'visor'); G.equip('visor'); G.buy('coral', 'sunhat'); G.equip('sunhat'); t.ok('one accessory per anchor', S.wearing.acc.includes('sunhat') && !S.wearing.acc.includes('visor'));
  G.unequip('sunhat'); t.ok('unequip', !S.wearing.acc.includes('sunhat'));
  // suit gifts: accepted by taste, and she wears it
  G.buy('riptide', 'sandstorm'); const ok = G.giveGift('lola', 'sandstorm'); t.ok('a suit of her style is accepted and worn', ok.accepted && S.npcWear.lola.suit === 'sandstorm' && !S.wardrobe.suits.includes('sandstorm'));
  G.buy('coral', 'gingham'); S.slot = 1; const no = G.giveGift('lola', 'gingham'); t.ok('a suit not of her style is refused', !no.accepted && S.wardrobe.suits.includes('gingham'));
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
