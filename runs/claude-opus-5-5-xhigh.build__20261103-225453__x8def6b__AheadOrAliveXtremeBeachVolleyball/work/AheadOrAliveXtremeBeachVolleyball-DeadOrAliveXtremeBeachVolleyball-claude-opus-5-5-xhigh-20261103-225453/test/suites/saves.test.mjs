// Save, quit to the title, Continue from the menu, and Load: back on the map at the saved day and slot, everything kept.
import { load } from '../lib/load.mjs';
import { playUntil } from '../lib/bots.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3); const T = G.debugTools;
  G.state = null; G.ensureState('amara'); T.setDay(3, 1); const st = G.state; st.money = 54321; st.bag.mochi_box = 3; st.affinity.lola = 77; G.autosave();
  const keyOf = x => JSON.stringify([x.me, x.day, x.slot, x.money, x.bag, x.affinity, x.partner, x.wardrobe, x.wearing, x.teams, x.npcWear, x.stats]);
  const snap = keyOf(st); G.state = null; game.go('title', null, { fade: 0 }); game.advance(.2);
  game.go('menu', null, { fade: 0 }); game.advance(.1);
  const cont = game.scene.items().find(i => i.id === 'cont'); t.ok('the menu offers Continue when a save exists', !!cont);
  cont.onPress(); playUntil(G, game, () => game.sceneName === 'map', 3);
  t.ok('Continue: back on the island map', game.sceneName === 'map');
  t.ok('Continue: the same day, slot, money, bag and friends', G.state && keyOf(G.state) === snap, G.state && [G.state.day, G.state.slot, G.state.money].join());
  // three slots: save to slot 1, change things, load slot 1
  G.installSaves(); game.saves.save(1); G.state.money = 1; game.saves.load(1); G.resumeVacation(); game.advance(.6);
  t.ok('a slot saves and loads', G.state.money === 54321 && game.sceneName === 'map');
  t.ok('the slot lists its place and day', (game.saves.list().find(s => s.slot === 1) || {}).level === 'Day 3 · Afternoon', JSON.stringify(game.saves.list().map(s => s.level)));
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => (e.where || '') + ' ' + e.message).join('|'));
}
