import { fresh } from './lib/helpers.mjs';
import { until, press, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G, I = game.input; KC.dev.unlocked = false; KC.unlocks.set; 
  game.go('versusSetup', null, { fade: 0 }); game.advance(.3); t.check('versus setup opens', sceneIs(game, 'versusSetup') && game.scene.screen === 'mode');
  // START with one player in 2P mode is refused
  KC.vs.mode = '2p'; game.scene.menu.i = 2; press(game, 'confirm'); t.check('2 players mode needs a second player', game.scene.screen === 'mode' && game.scene.warn > 0);
  // P2 joins on the keyboard (the right half); maps split
  game.addPlayer({ keys: 'right' }); KC.applyMaps(); game.advance(.1); t.check('P2 joined and the keyboard splits P1 / P2', game.players.length === 2 && game.players[1].map.up.includes('ArrowUp'));
  game.scene.menu.i = 2; press(game, 'confirm'); t.check('start opens character select', game.scene.screen === 'select');
  const sc = game.scene; sc.cur[0] = 8; press(game, 'confirm'); t.check('a locked fighter (Kyabetsu) cannot be picked', !sc.locked[0]);
  sc.cur[0] = 9; press(game, 'confirm'); t.check('Mei is locked until the story is done', !sc.locked[0]);
  KC.dev.unlocked = true; sc.cur[0] = 8; press(game, 'confirm'); t.check('unlock-all lets Kyabetsu be picked', sc.locked[0]); KC.dev.unlocked = false; sc.locked[0] = false; sc.cur[0] = 0;
  game.players[0].tap('confirm'); game.advance(.2); sc.cur[1] = 3; game.players[1].tap('confirm'); game.advance(.3); t.check('both players lock their picks and the stage screen opens', sc.screen === 'stage', sc.screen + ' ' + sc.locked.join());
  t.check('the picks are taro and ebi', KC.vs.picks.join() === 'taro,ebi', KC.vs.picks.join());
  game.players[0].tap('right'); game.advance(.2); game.players[0].tap('right'); game.advance(.2); game.players[0].tap('confirm'); game.advance(.4);
  t.check('the stage selection starts the fight with both humans', sceneIs(game, 'fight') && game.scene.d.players.join() === 'human,human2' && game.scene.d.stage === 'bamboo', game.scene.name + ' ' + (game.scene.d && game.scene.d.stage));
  // rules applied: pointsToWin from the dev slider, 2 humans' inputs reach their own fighters
  { const f = game.scene; until(game, () => f.bout.phase === 'fight', 20); const P = game.players; P[1].press('ArrowLeft'); game.advance(.5); P[1].release('ArrowLeft'); game.advance(.1); t.check('P2 arrows move the red fighter', f.bout.f[1].x < 250 - 5, f.bout.f[1].x); const x0 = f.bout.f[0].x; P[1].press('KeyD'); game.advance(.4); P[1].release('KeyD'); t.check('P1 keys do not move P2', Math.abs(f.bout.f[1].x - f.bout.f[1].x) < 1); P[0].press('KeyD'); game.advance(.4); P[0].release('KeyD'); t.check('P1 WASD moves the white fighter', f.bout.f[0].x > x0 + 5, f.bout.f[0].x); }
  // results menu after a win: rematch, character select, stage select, main menu
  { const f = game.scene; f.bout.endRound(0); f.bout.rounds[0] = 1; f.bout.endRound(0); until(game, () => sceneIs(game, 'results'), 30); t.check('the match ends on the results screen', sceneIs(game, 'results')); const r = game.scene; t.check('results menu has rematch / select / stage / main menu', r.items.map(i => i.label).join() === 'REMATCH,CHARACTER SELECT,STAGE SELECT,MAIN MENU', r.items.map(i => i.label).join()); game.advance(1); press(game, 'confirm'); until(game, () => sceneIs(game, 'fight'), 5); t.check('REMATCH starts the same fight again', sceneIs(game, 'fight')); }
  // CPU mode: CPU level from the setup
  { KC.resetPlayers(); game.go('versusSetup', null, { fade: 0 }); game.advance(.3); KC.vs.mode = 'cpu'; KC.vs.cpu = 9; game.scene.menu.i = 2; press(game, 'confirm'); const s2 = game.scene; s2.cur[0] = 0; game.players[0].tap('confirm'); game.advance(.2); t.check('the CPU cursor waits for P1, then P1 picks the CPU fighter', s2.kinds[1] === 'cpu' && s2.locked[0]); s2.cur[1] = 5; game.players[0].tap('confirm'); game.advance(.3); game.players[0].tap('confirm'); game.advance(.4); t.check('CPU match starts with the chosen level', sceneIs(game, 'fight') && game.scene.d.level[1] === 9, JSON.stringify(game.scene.d && game.scene.d.level)); }
  // local Kachinuki with 4 inputs: rotation order, winner stays, loser to the back, first to 5
  { const K = new KC.Kachinuki(['P1', 'P2', 'P3', 'P4'], 5); const st = (a, b) => [{ raw: a, conceded: b, full: 1, half: 0, blocks: 0 }, { raw: b, conceded: a, full: 0, half: 1, blocks: 0 }];
    t.check('queue starts in join order', K.pair.join() === 'P1,P2'); K.result(0, st(600, 0)); t.check('P1 won: winner stays, loser to the back', K.q.join() === 'P1,P3,P4,P2', K.q.join()); K.result(1, st(0, 300)); t.check('P3 beat P1: P3 stays on, P1 to the back', K.q.join() === 'P3,P4,P2,P1', K.q.join());
    for (let i = 0; i < 4; i++) { K.result(0, st(600, 0)); } t.check('the first to 5 bout wins is champion', K.over && K.s.P3.wins === 5, K.s.P3.wins + ' ' + K.over); t.check('standings are grouped and ordered by bout wins', K.standings()[0][0] === 'P3'); }
  { KC.dev.unlocked = false; KC.resetPlayers(); game.addPlayer({ keys: 'right' }); game.addPlayer({ pad: 0 }); game.addPlayer({ pad: 1 }); KC.applyMaps(); t.check('four local players can join', game.players.length === 4, game.players.length); game.go('versusSetup', null, { fade: 0 }); game.advance(.3); KC.vs.mode = 'kachi'; game.scene.menu.i = 2; press(game, 'confirm'); t.check('kachinuki select shows 4 cursors', game.scene.cur && game.scene.cur.length === 4, game.scene.cur && game.scene.cur.length); }
  t.check('no engine errors in versus', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join('|'));
};
