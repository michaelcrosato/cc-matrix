import { load } from '../lib/load.mjs';
import { talkThrough, playUntil, finishMatch } from '../lib/bots.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3); const T = G.debugTools;
  // the invitation to the welcome match
  game.go('invitation', null, { fade: 0 }); game.advance(.1); t.ok('the invitation opens', game.sceneName === 'invitation');
  game.go('charselect', null, { fade: 0 }); game.advance(.1); game.scene.pick('ingrid');
  t.ok('character select starts a vacation as her', G.state && G.state.me === 'ingrid' && G.state.day === 1);
  playUntil(G, game, () => game.sceneName === 'cutscene', 3); t.ok('the arrival plays on the dock', game.sceneName === 'cutscene' && game.scene.loc === 'dock');
  playUntil(G, game, () => game.sceneName === 'match', 120); t.ok('the Welcome Match starts against Sonny & Pepper', G.M && G.M.players.some(p => p.cast === 'sonny') && G.M.cfg.tutorial && G.M.rules.toWin === 5);
  t.ok('Pepper assigns a starter partner', !!G.state.partner);
  const r1 = finishMatch(G, game, true); t.ok('the tutorial is won by a bot', r1 && r1.humanWon);
  playUntil(G, game, () => game.sceneName === 'map', 90); t.ok('then the island map, Day 1 Afternoon', game.sceneName === 'map' && G.state.slot === 1 && G.state.flags.tutorialDone);
  t.ok('the tutorial paid S$10,000', G.state.stats.earned >= 10000);
  // D1 night: the casino opening
  G.state.slot = 2; G.slotStart(); const c0 = G.state.chips; T.goto('location', { loc: 'casino' }); talkThrough(G, game); t.ok("Sonny's 20 free chips on the first visit", G.state.chips === c0 + 20 && G.state.flags.casinoOpened);
  // D2 night: a friend visits the villa
  T.setDay(2, 2); const S = G.state; const f = G.npcs(S).find(id => id !== S.partner); S.affinity[f] = 70; T.goto('location', { loc: 'villa' }); game.advance(.2);
  const before = S.affinity[f]; G.sleep(); t.ok('a friend knocks with a snack', S.flags.visit === f); talkThrough(G, game, 0); t.ok('the visit changes her affinity', S.affinity[f] !== before);
  // D3 night: the overheard call
  T.setDay(3, 2); T.goto('location', { loc: 'casino' }); talkThrough(G, game, 0); t.ok('the overheard call, answered kindly', S.flags.overheard && S.flags.kind === true);
  // D4 morning: Pepper's letter with the Pinstripe suit
  S.day = 3; S.slot = 2; G.dayEnd(); G.dayStart(); t.ok("Pepper's warning in the mail", S.mail.includes('warning'));
  T.goto('location', { loc: 'villa' }); game.advance(.1); while (S.mail.length) { game.scene.openMail(); game.scene.ui = null; } t.ok('the Pinstripe suit comes with it', S.wardrobe.suits.includes('pinstripe'));
  // D4 afternoon: the semifinal on the Match Board
  S.slot = 1; G.slotStart(); const sp = G.specialMatch(); t.ok('the semifinal is on the board', sp && sp.kind === 'semi' && sp.pair.length === 2);
  // NV+: what carries over
  S.money = 200000; S.album.push({ loc: 'beach', day: 1, slot: 0, tod: 'morning', weather: 'sunny', cam: { x: 300, y: 200, z: 10, yaw: 0, zoom: 1, view: 'court' }, people: [], filter: 'Clean', frame: 'None' });
  game.go('vresults', null, { fade: 0 }); game.advance(.1); game.scene.plus(); game.advance(.5); game.go('charselect', null, { fade: 0 }); game.advance(.1); game.scene.pick('mei');
  const N = G.state; t.ok('New Vacation+ keeps the wardrobe and album', N.wardrobe.suits.includes('pinstripe') && N.album.length === 1);
  t.ok('New Vacation+ starts with S$30,000 + 10% of your money', N.money === 30000 + 20000, N.money);
  t.ok('New Vacation+ affinity starts at base +10', N.affinity.rin === G.baseAff('mei', 'rin') + 10);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => (e.where || '') + ' ' + e.message).join('|'));
}
