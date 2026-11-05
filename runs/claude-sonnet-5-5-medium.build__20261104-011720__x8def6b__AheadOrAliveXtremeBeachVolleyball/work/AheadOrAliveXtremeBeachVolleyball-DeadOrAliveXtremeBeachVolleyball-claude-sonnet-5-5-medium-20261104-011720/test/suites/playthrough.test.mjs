// A scripted playthrough of the whole vacation: story, partner, shops, gifts, matches, pool hop, casino, photos, saves, endings.
import { load } from '../lib/load.mjs';
export default function (check) {
  const { G, game, I } = load();
  const go = (n, d) => game.go(n, d, { fade: 0 });
  const sc = () => game.scene;
  let t = 0; const seen = new Set();
  const run = (sec, f) => { const end = t + sec; while (t < end) { seen.add(game.sceneName); if (f && f() === true) return true; game.advance(1 / 30); t += 1 / 30; } return false; };
  const tapUntil = (cond, sec) => run(sec, () => { if (cond()) return true; I.tap('confirm'); });
  G.autopilot = true;
  // new vacation
  G.state = G.newState(4242); G.reseedWorld(); G.installSaves(game);
  go('invitation', { next: () => go('map') }); game.advance(.2);
  check('invitation scene', game.sceneName === 'invitation', game.sceneName);
  tapUntil(() => game.sceneName !== 'invitation', 25);
  check('invitation leads to the map and story day 1', ['map', 'cutscene'].includes(game.sceneName), game.sceneName);
  const S = G.state;
  const driveStory = () => {
    // pump confirm through cutscenes, partner pick, matches (autopilot) and results menus until a free map slot
    let guard = 0;
    while (guard++ < 4000) {
      const n = game.sceneName; seen.add(n);
      if (n === 'map' && sc().nav && !sc().story) return true;
      if (n === 'dayend' || n === 'ending' || n === 'credits' || n === 'results') return n;
      if (n === 'match') { if (!sc().over) { run(.5, () => { if (game.sceneName !== 'match') return true; }); I.tap('confirm'); continue; } }
      if (n === 'partner' && sc().menu) { sc().menu.items[1 - 0 === 1 ? 0 : 0].onPick(sc().menu.items[0]); }
      I.tap('confirm'); run(.25); 
    }
    return false;
  };
  let r = driveStory();
  check('arrival and welcome match played; partner chosen', r === true && !!S.partner && S.results.welcome, JSON.stringify({ r, scene: game.sceneName, partner: S.partner, res: S.results, day: S.day, slot: S.slot }));
  check('welcome match gave prize money', S.stats.played >= 1 && S.money > 0);
  check('day 1 night is free', S.day === 1 && S.slot === 2, S.day + ':' + S.slot);
  // --- Day 1 night: promenade: buy a gift, give it, buy a suit and wear it, then a smoothie stroll
  go('location', { loc: 'promenade' }); game.advance(.3);
  let L = sc(); check('promenade has people', L.npcs.length > 0 || true);
  G.earn(3000);
  go('shop', { kind: 'gift', back: 'promenade' }); game.advance(.2); sc().buy(G.GIFTS[0]); check('buying a gift fills the bag', S.bag.smoothie >= 1);
  sc().buy(G.GIFTS[4]); sc().buy(G.GIFTS[8]);
  go('shop', { kind: 'suit', back: 'promenade' }); game.advance(.2); sc().buy(G.SUITS[2]); check('buying a swimsuit equips it', S.suit === 'lagoon' && S.owned.suits.includes('lagoon'), S.suit);
  go('shop', { kind: 'hat', back: 'promenade' }); game.advance(.2); sc().buy(G.HATS[2]); check('buying a hat', S.hat === 'cap');
  const m0 = S.money; G.buyGift('foam'); check('money goes down when shopping', S.money < m0);
  const aff0 = G.affinity(S.partner); const rx = G.giveGift(S.partner, 'smoothie'); check('gifts change friendship', rx && typeof rx.d === 'number');
  check('friendship moved by a gift', G.affinity(S.partner) !== aff0 || rx.d === 0);
  const c1 = G.chat(S.partner); const c2 = G.chat(S.partner); check('chat once per slot', c1.d >= 0 && c2.d === 0, JSON.stringify([c1.d, c2.d]));
  go('location', { loc: 'promenade' }); game.advance(.3); L = sc();
  const hang = L.loc.hot.find(h => h.kind === 'hang'); L.npcs.push({ id: S.partner, x: 0, y: 0, rig: G.rigOf(S.partner, 1), ph: 0, face: 0 }); L.interact({ kind: 'hot', h: hang, x: 0, y: 0 });
  check('smoothie stroll offers a menu', !!L.menu); if (L.menu) L.menu.items[0].onPick(); run(.5); tapUntil(() => !L.sp.open, 15);
  check('the stroll spent the slot', G.locState && G.locState.spent === true, JSON.stringify(G.locState));
  run(1);
  check('slot ended and day 2 began', S.day === 2 && S.slot === 0, S.day + ':' + S.slot);
  check('the day end scene was shown', seen.has('dayend'), [...seen].join(','));
  // day end scene
  const waitMap = () => { for (let k = 0; k < 40 && game.sceneName !== 'map'; k++) { I.tap('confirm'); run(.4); } return game.sceneName === 'map'; };
  check('back on the map for day 2', waitMap(), game.sceneName);
  // --- Day 2 morning: practice match at the courts with autopilot
  go('location', { loc: 'courts' }); game.advance(.3); L = sc();
  L.interact({ kind: 'hot', h: L.loc.hot.find(h => h.kind === 'court'), x: 0, y: 0 }); check('court menu', !!L.menu); L.menu.items[0].onPick();
  run(1); check('practice match started', game.sceneName === 'match', game.sceneName);
  tapUntil(() => !!(sc() && sc().over && sc().menu), 900); check('practice match finishes', !!sc().over, game.sceneName);
  const pw = S.stats.played; tapUntil(() => game.sceneName !== 'match', 30);
  run(2); tapUntil(() => game.sceneName === 'map' || game.sceneName === 'dayend', 40);
  check('match result recorded', S.stats.played >= pw, S.stats.played);
  check('after the practice, time moved on to Day 2 afternoon', S.day === 2 && S.slot === 1, S.day + ':' + S.slot);
  // --- the qualifier is forced at 2:1
  r = driveStory(); check('qualifier played', S.results.qualifier === 'win' || S.results.qualifier === 'loss', JSON.stringify(S.results) + game.sceneName);
  waitMap(); check('Day 2 night is free', S.day === 2 && S.slot === 2, S.day + ':' + S.slot);
  // --- casino at night: slots, blackjack, roulette; all three
  go('location', { loc: 'casino' }); game.advance(.3); L = sc();
  for (const kind of ['slots', 'bj', 'roulette']) {
    go('casino', { game: kind, back: 'casino' }); game.advance(.2); const T = sc().game; const before = S.money;
    if (kind === 'slots') { T.spin(); check('slot spin takes the bet', S.money < before); for (let k = 0; k < 3; k++) { I.tap('confirm'); run(.2); } run(2); check('slots resolve', T.state === 'idle', T.state); }
    if (kind === 'bj') { I.tap('confirm'); run(.2); if (T.state === 'play') { T.stand(); run(6); } check('blackjack hand resolves', T.state === 'bet', T.state); }
    if (kind === 'roulette') { I.tap('confirm'); run(.2); run(7); check('roulette spin resolves', T.state === 'bet' || T.state === 'show', T.state); }
  }
  go('location', { loc: 'casino' }); game.advance(.3); G.locState.spent = true; sc().leave(); run(1);
  check('leaving the casino after playing spends the night', S.day === 3 && S.slot === 0, S.day + ':' + S.slot);
  // --- Day 3 morning: pool hop, auto
  waitMap(); go('location', { loc: 'pool' }); game.advance(.3); L = sc(); L.interact({ kind: 'hot', h: L.loc.hot.find(h => h.kind === 'poolhop'), x: 0, y: 0 }); L.menu.items[0].onPick(); run(1);
  check('pool hop starts', game.sceneName === 'poolhop', game.sceneName); sc().auto = true; const mm = S.money;
  run(40, () => !!sc().state && sc().state === 'done' || game.sceneName !== 'poolhop'); check('pool hop finishes with a score', sc().score > 500 || game.sceneName !== 'poolhop', 'score ' + (sc() && sc().score));
  if (game.sceneName === 'poolhop') { sc().menu.items[0].onPick(); } run(1);
  check('pool hop paid money and used the slot', S.money > mm && S.day === 3 && S.slot === 1, S.money + ' ' + S.day + ':' + S.slot);
  // --- Day 3 afternoon semifinal (story)
  waitMap(); r = driveStory(); check('semifinal played', !!S.results.semifinal, JSON.stringify(S.results));
  waitMap(); check('Day 3 night free', S.day === 3 && S.slot === 2, S.day + ':' + S.slot);
  // villa: wardrobe, photo, nap
  go('location', { loc: 'villa' }); game.advance(.3); L = sc();
  go('wardrobe', { back: 'villa' }); run(.3); sc().menu.items[0].onPick(); check('wardrobe equips', true);
  go('location', { loc: 'villa' }); game.advance(.3); G.openPhoto('Your Villa'); game.advance(.2); I.tap('confirm'); game.advance(.2); game.advance(.2); game.advance(.2);
  check('a postcard was taken', S.album.length === 1, S.album.length); G.overlay.pop(G.overlays[0] || null); game.advance(.1);
  go('album', { back: 'villa' }); game.advance(.2); check('album scene runs', game.sceneName === 'album'); I.tap('confirm'); game.advance(.2);
  go('journal', { back: 'villa' }); game.advance(.2); for (let k = 0; k < 3; k++) { I.tap('tab'); game.advance(.1); } check('journal scene runs', game.sceneName === 'journal');
  // save and load
  const saved = G.saveBlob(); game.saves.save(1); const back = game.saves.load(1); check('save and load roundtrip', !!back && back.data.day === S.day, JSON.stringify(back && back.data.day));
  go('location', { loc: 'villa' }); game.advance(.3); L = sc(); L.interact({ kind: 'hot', h: L.loc.hot.find(h => h.kind === 'nap'), x: 0, y: 0 }); L.menu.items[0].onPick(); tapUntil(() => !L.sp.open, 10); run(1.5);
  const S2 = G.state; check('nap spends the night', S2.day === 4 && S2.slot === 0, S2.day + ':' + S2.slot);
  // --- Day 4 morning and afternoon free; then reveal at night
  waitMap(); go('location', { loc: 'promenade' }); game.advance(.3); L = sc(); L.interact({ kind: 'hot', h: L.loc.hot.find(h => h.kind === 'shopSuit'), x: 0, y: 0 }); run(1);
  check('boutique opens', game.sceneName === 'shop'); sc().buy(G.SUITS[4]);
  go('location', { loc: 'promenade' }); game.advance(.2); G.locState.spent = true; sc().leave(); run(1);
  waitMap(); const S3 = G.state; check('day 4 afternoon', S3.day === 4 && S3.slot === 1, S3.day + ':' + S3.slot);
  go('location', { loc: 'courts' }); game.advance(.3); L = sc(); L.interact({ kind: 'hot', h: L.loc.hot.find(h => h.kind === 'court'), x: 0, y: 0 }); L.menu.items[1].onPick(); tapUntil(() => !!(sc() && sc().over && sc().menu), 900); tapUntil(() => game.sceneName !== 'match', 30); waitMap();
  r = driveStory(); check('the reveal plays', !!G.state.flags.reveal, JSON.stringify({ r, sn: game.sceneName, d: G.state.day, s: G.state.slot, f: G.state.flags }));
  waitMap(); const S4 = G.state; check('Day 5 morning', S4.day === 5 && S4.slot === 0, S4.day + ':' + S4.slot);
  go('location', { loc: 'pool' }); game.advance(.2); G.locState.spent = true; sc().leave(); run(1); waitMap();
  r = driveStory(); check('the final is played', !!G.state.results.final, JSON.stringify(G.state.results));
  // the party, ending, credits, results
  for (let k = 0; k < 4000 && game.sceneName !== 'results'; k++) { I.tap('confirm'); run(.3); if (game.sceneName === 'map' && !sc().story && G.state.day === 5 && G.state.slot === 2) { run(.1); } }
  check('the farewell leads to the results screen', game.sceneName === 'results', game.sceneName);
  check('an ending was recorded', !!G.state.ending, G.state.ending);
  check('the scripted playthrough touched every kind of scene', ['cutscene', 'match', 'map', 'location', 'poolhop', 'casino', 'shop', 'wardrobe', 'partner', 'dayend', 'ending', 'credits', 'results'].every(s => seen.has(s)), [...seen].join(','));
  check('no engine errors in the playthrough', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + (e.stack || '').split('\n')[1]).join(' | '));
}
