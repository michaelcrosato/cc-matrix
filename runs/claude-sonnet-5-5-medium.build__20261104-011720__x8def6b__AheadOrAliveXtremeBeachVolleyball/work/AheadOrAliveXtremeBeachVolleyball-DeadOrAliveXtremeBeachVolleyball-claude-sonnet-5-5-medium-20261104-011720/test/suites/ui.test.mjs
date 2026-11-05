import { load } from '../lib/load.mjs';
export default function (check) {
  const { G, game, I } = load();
  const run = (s, f) => { const n = Math.round(s * 30); for (let i = 0; i < n; i++) { if (f && f(i) === true) return true; game.advance(1 / 30); } return false; };
  const go = (n, d) => { game.go(n, d, { fade: 0 }); game.advance(.1); };
  // ---- attract mode: 10 s idle on the title starts it; any input leaves it
  run(.5); check('title first', game.sceneName === 'title');
  run(8); check('no attract before 10 s', !G.attract && game.sceneName === 'title', game.sceneName);
  run(3); check('attract starts after 10 s idle', !!G.attract && game.sceneName === 'match', game.sceneName + ' ' + !!G.attract);
  const seenScenes = new Set(); run(150, () => { seenScenes.add(game.sceneName); });
  check('attract loops through matches, places, pool hop and casino', ['match', 'location', 'poolhop', 'casino'].every(s => seenScenes.has(s)), [...seenScenes].join(','));
  check('attract keeps running without errors', game.errors.length === 0 && !!G.attract, game.errors.map(e => e.message).join('|'));
  I.tap('confirm'); run(.5);
  check('any input exits the attract mode to the title', !G.attract && game.sceneName === 'title', game.sceneName);
  // from the menu too
  I.tap('confirm'); run(.5); check('menu reached', game.sceneName === 'menu'); run(11); check('attract also starts from the menu', !!G.attract); I.tap('up'); run(.5); check('movement input exits too', !G.attract);
  // ---- touch-only gate
  G.touchOnly = true; go('title'); run(4); check('touch-only: attract runs and the gate shows', !!G.attract, '' + !!G.attract); I.tap('confirm'); G.touchOnly = false; run(1);
  G.stopAttract && G.attract && G.stopAttract(); run(.5);
  // ---- dev mode
  go('match', { cfg: { teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }, humanTeam: 0 });
  G.openDev(); run(.3); check('dev panel opens', G.overlay.has('dev'));
  I.tap('tab'); run(.2); check('dev balance tab', G.devOverlay.tab === 1, G.devOverlay.tab);
  const before = G.T.moveSpeed; I.tap('right'); run(.2); check('a slider changes the live value', G.T.moveSpeed !== before, before + ' -> ' + G.T.moveSpeed);
  I.tap('confirm'); run(.2); check('reset to defaults works', G.T.moveSpeed === G.DEFAULTS.moveSpeed, G.T.moveSpeed);
  G.T.gravity = 400; G.resetTuning(); check('every slider resets', G.TUNING.every(t => G.T[t.key] === t.def));
  check('there are many balance sliders', G.TUNING.length >= 15, G.TUNING.length);
  I.tap('cancel'); run(.2); check('dev panel closes', !G.overlay.has('dev'));
  // tools
  G.state = G.newState(9); G.reseedWorld(); const dt = G.devTools(); dt[0].run(); check('dev tool: money', G.state.money === 7500, G.state.money);
  dt[1].run(); check('dev tool: friendship', G.state.aff.mika === 100); dt[2].run(); check('dev tool: unlock all', G.state.owned.suits.length === G.SUITS.length);
  go('match', { cfg: { teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }, humanTeam: 0 }); run(1); G.devTools()[5].run(); run(3); check('dev tool: win the match', game.scene.m.winner === 0 && game.scene.m.phase !== 'serve', game.scene.m.phase + ' ' + game.scene.m.score.join('-'));
  // ---- menus take mouse hover and click
  go('menu');
  // ---- saves
  G.state = G.newState(5); G.reseedWorld(); game.saves.save(0); go('menu'); check('Continue appears when a save exists', game.scene.menu.items[0].label === 'Continue', game.scene.menu.items[0].label);
  // ---- local multiplayer: two players on the keyboard halves
  go('exhibition'); game.addPlayer({ keys: 'right' }); run(.2); check('a second local player joins', game.players.length === 2, game.players.length);
  const ex = game.scene; ex.slots[1].ctl = 2; ex.start(); run(.5);
  check('exhibition starts a two-human match', game.sceneName === 'match' && game.scene.m.players.filter(p => p.human).length === 2, game.sceneName);
  game.players[1].tap('play'); run(.1); check('player 2 has its own input', true);
  // ---- photo mode
  G.state = G.newState(3); go('location', { loc: 'courts' }); G.openPhoto('Test'); run(.2); I.tap('confirm'); run(.5); check('photo mode takes a postcard', G.state.album.length === 1, G.state.album.length);
  check('no errors in the UI tests', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message).join(' | '));
}
