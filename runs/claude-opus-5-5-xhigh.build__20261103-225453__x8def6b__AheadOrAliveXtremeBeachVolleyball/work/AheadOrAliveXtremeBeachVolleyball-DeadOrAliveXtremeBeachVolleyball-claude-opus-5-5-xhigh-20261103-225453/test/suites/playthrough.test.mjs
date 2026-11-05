// The whole vacation, as each of the six fighters: the Welcome Match, matches, the casino, shopping and gifts, Pool Hop,
// a villa visit, the rain match, the overheard call, Pepper's letter and a postcard, the semifinal, the final (won in
// three runs, lost in three), the party, an ending, the credits, the results and back to the title.
import { load } from '../lib/load.mjs';
import { talkThrough, playUntil, finishMatch } from '../lib/bots.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3);
  const scene = () => game.sceneName, sc = () => game.scene;
  const travel = id => { if (scene() !== 'map') game.go('map', null, { fade: 0 }); game.advance(.05); sc().travel(id); return playUntil(G, game, () => scene() === 'location' && sc().loc === id, 5); };
  const leave = () => { G.leaveLocation(); return playUntil(G, game, () => scene() === 'map' || scene() === 'dayend', 5); };
  const boardMatch = (win = true) => { sc().openBoard(); const its = sc().boardItems(); if (!its[0] || !its[0].e) return null; its[0].onPress(); return finishMatch(G, game, win); };
  const nextDay = () => { if (scene() !== 'dayend') playUntil(G, game, () => scene() === 'dayend', 5); sc().items()[0].onPress(); return playUntil(G, game, () => scene() === 'map', 5); };
  G.FIGHTERS.forEach((me, run) => {
    const tag = me + ': ', win = run < 3;
    game.go('charselect', null, { fade: 0 }); game.advance(.1); sc().pick(me);
    playUntil(G, game, () => scene() === 'match', 120);
    const r0 = finishMatch(G, game, true); t.ok(tag + 'D1 the Welcome Match won', r0 && r0.humanWon);
    playUntil(G, game, () => scene() === 'map', 90); const st = G.state;
    t.ok(tag + 'D1 afternoon on the map with a partner', scene() === 'map' && st.day === 1 && st.slot === 1 && !!st.partner);
    t.ok(tag + 'D1 afternoon beach match', travel('beach') && !!boardMatch(true)); playUntil(G, game, () => scene() === 'map', 10);
    t.ok(tag + 'D1 night', st.slot === 2);
    // the casino: slots, blackjack, roulette
    travel('casino'); talkThrough(G, game); const chips0 = st.chips; t.ok(tag + 'D1 night casino chips from Sonny', chips0 >= 20);
    game.go('casino', { station: 'slots', at: [80, 150] }, { fade: 0 }); game.advance(.1); game.input.tap('confirm'); game.advance(.2); for (const r of ['reel1', 'reel2', 'reel3']) { game.input.tap(r); game.advance(.15); }
    t.ok(tag + 'a slot spin plays out', sc().slot.phase === 'done');
    sc().station = 'blackjack'; game.advance(.05); game.input.tap('confirm'); game.advance(.1); if (sc().bj.phase === 'play') { game.input.tap('stand'); game.advance(.1); } t.ok(tag + 'a blackjack hand settles', sc().bj.phase === 'result');
    sc().station = 'roulette'; game.advance(.05); sc().rouletteItems().find(i => i.id === 'red').onPress(); game.input.tap('extra'); playUntil(G, game, () => sc().rl.phase === 'result', 6); t.ok(tag + 'a roulette spin pays out', sc().rl.phase === 'result' && sc().rl.hist.length === 1);
    G.casinoLeaveNight(); t.ok(tag + 'D2 morning', nextDay() && st.day === 2 && st.slot === 0);
    // D2 morning: buy a suit and give a gift
    travel('promenade'); game.go('shop', { shop: 'riptide', from: 'promenade' }, { fade: 0 }); game.advance(.1); const s0 = st.wardrobe.suits.length; sc().tryBuy(G.SUITS.lifeguard); game.advance(.1); if (G.overlay.get('confirm')) { G.overlay.get('confirm').items()[0].onPress(); }
    t.ok(tag + 'D2 bought a suit', st.wardrobe.suits.length === s0 + 1);
    game.go('shop', { shop: 'sundries', from: 'promenade' }, { fade: 0 }); game.advance(.1); sc().tryBuy(G.GIFTS.mochi_box); sc().tryBuy(G.GIFTS.plush_seal);
    game.go('location', { loc: 'promenade' }, { fade: 0 }); game.advance(.1); const n = sc().npcs.find(q => !q.staff) || null; t.ok(tag + 'someone to give a gift to', !!n);
    if (n) { const before = st.stats.gifts; sc().openBag(n); sc().giveFromBag(sc().ui.items[0]); talkThrough(G, game); t.ok(tag + 'D2 a gift is offered', st.gifted[n.id] === st.slot + 1 && st.stats.gifts >= before); }
    leave(); t.ok(tag + 'D2 afternoon', st.slot === 1);
    // D2 afternoon: Pool Hop
    travel('pool'); game.go('poolhop', { from: 'pool' }, { fade: 0 }); game.advance(.05); sc().auto = true; playUntil(G, game, () => sc().state === 'results', 60); t.ok(tag + 'D2 Pool Hop cleared', sc().result && sc().result.cleared && st.stats.poolBest > 0);
    sc().resultItems()[0].onPress(); playUntil(G, game, () => scene() === 'map', 5); t.ok(tag + 'D2 night', st.slot === 2);
    // D2 night: rest at the villa, a visit
    const friend = G.npcs(st).find(id => id !== st.partner); st.affinity[friend] = Math.max(st.affinity[friend], 55);
    travel('villa'); G.sleep(); t.ok(tag + 'D2 night a friend visits', !!st.flags.visit); talkThrough(G, game, 0); t.ok(tag + 'D3 morning', nextDay() && st.day === 3 && st.slot === 0);
    // D3 morning: Promenade gifts
    travel('promenade'); game.go('shop', { shop: 'sundries', from: 'promenade' }, { fade: 0 }); game.advance(.1); sc().tryBuy(G.GIFTS.matcha_kit); game.go('location', { loc: 'promenade' }, { fade: 0 }); game.advance(.1);
    const p2 = sc().npcs.find(q => q.partner); if (p2) { sc().openBag(p2); if (sc().ui.items.length) sc().giveFromBag(sc().ui.items[0]); talkThrough(G, game); }
    t.ok(tag + 'D3 a gift for the partner', !p2 || st.gifted[p2.id] === 1); leave();
    // D3 afternoon: the rain match
    t.ok(tag + 'D3 afternoon rain', st.slot === 1 && G.weatherNow() === 'rain'); travel('beach'); const r3 = boardMatch(true); t.ok(tag + 'D3 rain match played', !!r3); playUntil(G, game, () => scene() === 'map', 10);
    // D3 night: the overheard call
    travel('casino'); talkThrough(G, game, 0); t.ok(tag + 'D3 night the overheard call', st.flags.overheard && st.flags.kind === true);
    G.casinoLeaveNight(); t.ok(tag + 'D4 morning', nextDay() && st.day === 4);
    // D4 morning: the letter, a postcard
    travel('villa'); while (st.mail.length) { sc().openMail(); sc().ui = null; } t.ok(tag + "D4 Pepper's letter and the Pinstripe", st.read.warning && st.wardrobe.suits.includes('pinstripe'));
    const ph = G.photo.open(); if (ph) { ph.shoot(); ph.close(); } t.ok(tag + 'D4 a postcard in the album', st.album.length >= 1);
    leave();
    // D4 afternoon: the semifinal
    travel('beach'); sc().openBoard(); const se = sc().boardItems()[0]; t.ok(tag + 'D4 the semifinal is on the board', se && se.e && se.e.kind === 'semi');
    se.onPress(); const rs = finishMatch(G, game, true, true); t.ok(tag + 'D4 semifinal won: seeded', rs && rs.humanWon && st.flags.seeded); playUntil(G, game, () => scene() === 'map', 10);
    travel('villa'); G.sleep(); talkThrough(G, game); t.ok(tag + 'D5 morning', nextDay() && st.day === 5);
    // D5 morning: shopping; D5 afternoon: the final
    travel('promenade'); game.go('shop', { shop: 'coral', from: 'promenade' }, { fade: 0 }); game.advance(.1); st.money += 30000; sc().tryBuy(G.ACCS.heartshades); if (G.overlay.get('confirm')) G.overlay.get('confirm').items()[0].onPress(); game.go('location', { loc: 'promenade' }, { fade: 0 }); game.advance(.1); leave();
    t.ok(tag + 'D5 afternoon: the final is called', playUntil(G, game, () => scene() === 'match', 30) && G.M.cfg.final && G.M.rules.toWin === 11);
    const rf = finishMatch(G, game, win, true); t.ok(tag + 'D5 the final ' + (win ? 'won' : 'lost'), rf && rf.humanWon === win && st.flags.finalWon === win);
    t.ok(tag + 'D5 night: the party', playUntil(G, game, () => scene() === 'cutscene' && sc().d.id === 'party', 10));
    playUntil(G, game, () => scene() === 'cutscene' && sc().d.id === (win ? 'endingA' : 'endingB'), 120); t.ok(tag + 'ending ' + (win ? 'A' : 'B'), scene() === 'cutscene' && sc().d.id === (win ? 'endingA' : 'endingB'));
    t.ok(tag + 'the party photo', st.album.some(s => s.party));
    playUntil(G, game, () => scene() === 'credits', 120); t.ok(tag + 'the credits', scene() === 'credits');
    playUntil(G, game, () => scene() === 'vresults', 40); t.ok(tag + 'the vacation results', scene() === 'vresults' && G.unlocks.finished);
    sc().items()[1].onPress(); playUntil(G, game, () => scene() === 'title', 3); t.ok(tag + 'back to the title', scene() === 'title');
  });
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => (e.where || '') + ' ' + e.message).join(' | '));
}
