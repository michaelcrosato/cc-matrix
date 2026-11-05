import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G; G.adv(.3);
  game.go('versus', {}, { fade: 0 }); G.adv(.2);
  const q = game.addPlayer({ keys: 'right' }); G.adv(.1); KC.applyMaps();
  t.check('P2 joins on the keyboard', game.players.length === 2 && q.half === 'right');
  t.check('red is a human once P2 joins', KC.VS.p2 === 'human', KC.VS.p2);
  I.tap('confirm'); G.adv(.3); t.check('CHARACTER SELECT', game.sceneName === 'select', game.sceneName);
  const S = game.scene; S.cur[1] = 9; q.tap('confirm'); G.adv(.1); t.check('a locked fighter (Mei) cannot be picked', !S.done[1] || KC.isUnlocked('mei'));
  S.cur[0] = 3; I.tap('confirm'); S.cur[1] = 5; q.tap('confirm'); G.adv(.3); t.check('both pick, then STAGE SELECT', game.sceneName === 'stageSelect', game.sceneName);
  I.tap('right'); G.adv(.1); I.tap('confirm'); G.adv(.3); const F = game.scene;
  t.check('a versus fight with the picks', game.sceneName === 'fight' && F.bout.f[0].id === 'ebi' && F.bout.f[1].id === 'ika', game.sceneName);
  t.check('P2 is human (no CPU)', F.cpu[1] === false, F.cpu);
  // finish it with both on autopilot -> results
  game.debug.autopilot(0, 8); game.debug.autopilot(1, 8); for (let k = 0; k < 600 && game.sceneName === 'fight'; k++) { if (F.result) I.tap('start'); G.adv(.25); }
  t.check('RESULTS after the match', game.sceneName === 'results', game.sceneName); t.check('results menu: rematch, select, stage, main menu', game.scene.menu.items.length === 4);
  // local Kachinuki: 4 players, winner stays, loser to the back, first to 5
  const K = KC.Kachinuki.make(4, 5); KC.Kachinuki.result(K, 0); t.check('winner stays, loser to the back', JSON.stringify(K.queue) === JSON.stringify([0, 2, 3, 1]), K.queue);
  KC.Kachinuki.result(K, 1); t.check('a new holder', K.queue[0] === 2 && K.streak === 1, [K.queue, K.streak]); for (let i = 0; i < 4; i++) KC.Kachinuki.result(K, 0); t.check('first to 5 is champion', K.champion === 2 && K.wins[2] === 5, K);
  const st = KC.Kachinuki.standings(K, [0, 1, 2, 3]); t.check('standings: most wins first', st[0][0] === 2, st);
  // local Kachinuki start with 3 joined players
  while (game.players.length < 3) game.addPlayer({ pad: game.players.length + 3 }); game.go('versus', {}, { fade: 0 }); G.adv(.2); I.tap('confirm'); G.adv(.4);
  t.check('3+ players start a Kachinuki bout', game.sceneName === 'fight' && game.scene.kn && game.scene.bout.roundsToWin === 1, game.sceneName);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
