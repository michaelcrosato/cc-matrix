import { fresh } from './lib/helpers.mjs';
import { until, press, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game, E } = G, I = game.input, S = KC.Story;
  // from the title, navigate the menus with real inputs into CHAMPON ROAD
  game.advance(1); t.check('boots into the title', sceneIs(game, 'title'));
  press(game, 'start'); t.check('start opens the main menu', game.scene.screen === 'menu');
  t.check('the menu has Champon Road first (no save)', game.scene.menu.items[0].label === 'CHAMPON ROAD', game.scene.menu.items.map(i => i.label).join());
  press(game, 'confirm', .8); t.check('confirm enters the road', sceneIs(game, 'road'), game.scene.name); t.check('the story starts at node 0', S.s.node === 0 && S.s.belt === 0 && S.s.score === 0);
  // dev toggles: Autopilot L10 on P1, a weak CPU, 1 point per round
  KC.autopilot = 10; KC.TUNE.cpuLevel = 1; KC.TUNE.pointsToWin = 1; KC.TUNE.roundsToWin = 1;
  const belts = []; let lastScore = 0, lastCont = 0, saves = 0; const nodesPlayed = [];
  for (let i = 0; i < KC.LADDER.length; i++) {
    t.check('road shows node ' + i, sceneIs(game, 'road') && S.s.node === i, game.scene.name + ' ' + S.s.node);
    const n = KC.LADDER[i]; press(game, 'confirm', .1);
    // play through whatever the node is: confirm cutscene/card prompts, wait for fights
    let guard = 0; const cap = 900 * 60;
    const done = () => (sceneIs(game, 'road') && S.s.node === i + 1) || sceneIs(game, 'title') || sceneIs(game, 'initials');
    let simT = 0; while (!done() && simT < 900) { game.advance(.5); simT += .5; if (['cutscene', 'vscard', 'promotion', 'credits', 'practice'].includes(game.scene.name)) { I.tap('confirm'); } if (sceneIs(game, 'credits')) KC.resetTune(); if (sceneIs(game, 'continue') && n.kind === 'match') { I.tap('confirm'); } }
    nodesPlayed.push(n.id);
    if (n.kind === 'ending') { t.check('the ending leads through credits to initials or the title', sceneIs(game, 'title') || sceneIs(game, 'initials') || sceneIs(game, 'credits'), game.scene.name); break; }
    t.check('node ' + n.id + ' (' + n.kind + ') completes within 15 simulated minutes', sceneIs(game, 'road') && S.s.node === i + 1, game.scene.name + ' node ' + S.s.node + ' t=' + simT);
    if (n.kind === 'match') { t.check('belt after ' + n.id + ' is ' + n.promote, S.s.belt === n.promote, S.s.belt); belts.push(S.s.belt); }
    t.check('score grows through node ' + n.id + ' (a continue resets it)', S.s.score >= lastScore || S.s.continues > lastCont, S.s.score + ' vs ' + lastScore); lastScore = S.s.score; lastCont = S.s.continues;
    if (KC.save.data) saves++;
  }
  t.check('autosaves were written after nodes', saves >= 10, saves);
  t.check('every match promoted in order', belts.join() === '1,2,3,4,5,6,7,8,9', belts.join());
  t.check('Kyabetsu and Mei unlock through the story', KC.unlocks.get().kyabetsu && KC.unlocks.get().mei && KC.unlocks.get().classic, JSON.stringify(KC.unlocks.get()));
  t.check('every node was played', nodesPlayed.length === KC.LADDER.length, nodesPlayed.length);
  // the ending flow: credits, initials (three confirms), title
  { let simT = 0; while (!sceneIs(game, 'title') && simT < 300) { game.advance(.5); simT += .5; if (sceneIs(game, 'initials') || sceneIs(game, 'records')) I.tap('confirm'); else if (['credits'].includes(game.scene.name)) I.tap('confirm'); } t.check('ends back at the title after credits and initials', sceneIs(game, 'title'), game.scene.name); t.check('a story high score was recorded', KC.cab.table('story').length >= 1 && KC.cab.table('story')[0].score > 0, JSON.stringify(KC.cab.table('story')[0])); }
  // continue: lose a match (no input, strong CPU), CONTINUE retries with the score reset and rank kept; a second loss then give up
  KC.autopilot = 0; KC.TUNE.cpuLevel = 10; KC.TUNE.pointsToWin = 1; KC.TUNE.roundsToWin = 1; KC.TUNE.clock = 25;
  S.s = S.fresh(); S.s.node = 2; S.s.belt = 0; S.s.score = 5000; game.go('road', null, { fade: 0 }); game.advance(.5); press(game, 'confirm', .1);
  until(game, () => sceneIs(game, 'fight') || sceneIs(game, 'vscard'), 20); until(game, () => sceneIs(game, 'continue'), 400); t.check('a lost match goes to CONTINUE?', sceneIs(game, 'continue'), game.scene.name);
  press(game, 'confirm', .3); t.check('continue retries the match (VS card) with score reset and rank kept', (sceneIs(game, 'vscard') || sceneIs(game, 'fight')) && S.s.score === 0 && S.s.belt === 0 && S.s.continues === 1, game.scene.name + ' ' + S.s.score);
  until(game, () => sceneIs(game, 'continue'), 400); t.check('a second loss goes to CONTINUE? again', sceneIs(game, 'continue'));
  press(game, 'cancel', .3); t.check('declining goes to GAME OVER', sceneIs(game, 'gameover'), game.scene.name);
  { let simT = 0; while (!sceneIs(game, 'title') && simT < 60) { game.advance(.5); simT += .5; if (['gameover'].includes(game.scene.name)) I.tap('confirm'); } t.check('game over returns to the title', sceneIs(game, 'title'), game.scene.name); }
  // an honest run: Autopilot L7 on Normal vs the ladder's matches, no cheats (a handful of nodes), no soft locks
  KC.TUNE_DEFS.forEach(d => { KC.TUNE[d[0]] = d[4]; }); KC.autopilot = 7; KC.save.erase(); S.s = S.fresh(); S.s.node = 2; game.go('road', null, { fade: 0 }); game.advance(.5);
  const honest = []; for (let i = 2; i < 4; i++) { press(game, 'confirm', .1); let simT = 0, losses = 0; while (!(sceneIs(game, 'road') && S.s.node === i + 1) && simT < 900) { game.advance(.5); simT += .5; if (['cutscene', 'vscard', 'promotion', 'practice'].includes(game.scene.name)) I.tap('confirm'); if (sceneIs(game, 'continue')) { losses++; I.tap('confirm'); } } honest.push(losses); t.check('honest run finishes node ' + i + ' without a soft lock', sceneIs(game, 'road') && S.s.node === i + 1, game.scene.name + ' ' + simT); }
  t.check('no engine errors during the story', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join(' | '));
  KC.autopilot = 0;
};
