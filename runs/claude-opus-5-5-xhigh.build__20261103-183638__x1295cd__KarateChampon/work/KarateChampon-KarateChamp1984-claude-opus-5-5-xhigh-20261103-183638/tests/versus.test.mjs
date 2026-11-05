// versus: setup, P2 joins on the keyboard's right half, select (locks), stage select, rules applied, results; KACHINUKI
import { fresh, steps } from './lib/util.mjs';
export default async t => {
  const { KC, game, fire } = fresh(), I = game.input;
  game.go('versus'); steps(game, 4);
  t.check('versus: setup with RED as the CPU', game.sceneName === 'versus' && game.scene.mode === 'setup' && game.scene.menu.items[0].value === 'CPU');
  game.addPlayer({ keys: 'right' }); steps(game, 4);   // (what 2 on the keyboard does; the lobby listens on a real page)
  t.check('player 2 joins on the keyboard (its right half)', game.players.length === 2 && game.players[1].half === 'right', game.players.length);
  t.check('player 2 makes RED a player', game.scene.menu.items[0].value === 'PLAYER 2');
  t.check('two on one keyboard: P1 uses T F G H, P2 I J K L', game.players[0].map.tUp.includes('KeyT') && game.players[1].map.tUp.includes('KeyI'));
  // locks: Kyabetsu and Mei are locked on a fresh save
  t.check('kyabetsu and mei start locked', KC.locked('kyabetsu') && KC.locked('mei') && !KC.locked('ika'));
  const sc = game.scene; sc.mode = 'select'; sc._selectInit(); sc.cur[0] = 9; sc._pick(0); t.check('a locked fighter cannot be picked', !sc.done[0]);
  sc.cur[0] = 5; sc._pick(0); sc.cur[1] = 7; sc._pick(1); t.check('both pick: to the stage select', sc.done[0] && sc.done[1] && sc.mode === 'stage' && sc.cfg.picks.join() === 'ika,asari');
  sc.cfg.rounds = 1; sc.cfg.points = 1; const d = sc.fightData(); t.check('the rules go to the fight: one round, one point', d.rules.roundsToWin === 1 && d.rules.pointsToWin === 1 && d.sides[1].input === game.players[1]);
  game.go('fight', d); steps(game, 4); t.check('the fight has both players', KC.scene.readers[0] && KC.scene.readers[1]);
  KC.scene.bout.forceWin(1, 'win'); steps(game, 120 * 6); t.check('results after the match', game.sceneName === 'results', game.sceneName);
  t.check('results: REMATCH, CHARACTER SELECT, STAGE SELECT, MAIN MENU', game.scene.menu.items.map(i => i.label).join() === 'REMATCH,CHARACTER SELECT,STAGE SELECT,MAIN MENU');
  // the kachinuki rules: winner stays, the loser to the back, first to the target, standings
  const K = new KC.Kachinuki({ ids: [0, 1, 2, 3], target: 3 });
  t.check('kachinuki: 0 vs 1 first', K.current().join() === '0,1');
  K.result(0); t.check('the winner stays, the loser to the back', K.current().join() === '0,2' && K.queue.join() === '0,2,3,1', K.queue.join());
  K.result(2); t.check('a new winner stays on', K.current().join() === '2,3' && K.queue.join() === '2,3,1,0', K.queue.join());
  K.result(2); K.result(2); t.check('first to 3 bout wins is champion', K.champion === 2 && K.wins[2] === 3);
  t.check('standings by bout wins, ties grouped', JSON.stringify(K.standings()) === JSON.stringify([[2], [0], [1, 3]]), JSON.stringify(K.standings()));
  K.remove(1); t.check('a player who leaves is out of the queue', !K.queue.includes(1));
  // a local kachinuki bout runs with the bench kneeling
  game.addPlayer({ pad: 1 }); steps(game, 2);
  KC.LocalKachi.start(['taro', 'mei', 'ebi']); steps(game, 4);
  t.check('local kachinuki: a one-round bout with the others on the bench', game.sceneName === 'fight' && KC.scene.mode === 'kachinuki' && KC.scene.d.bench.length === 1 && KC.scene.bout.R('roundsToWin') === 1, KC.scene && KC.scene.mode);
  t.check('no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  void fire;
};
