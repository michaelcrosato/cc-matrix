// Attract mode (15.1): 10 s idle on the title -> the reel; 80 s visits all 9 segments; any input -> the title, consumed
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
guard('attract', async () => {
  const { game, G, snap } = load();
  game.advance(5); check('5 s idle stays on the title', game.sceneName === 'title');
  game.advance(6.5); check('10 s idle starts the attract mode', game.sceneName === 'attract', game.sceneName);
  game.advance(80); const v = snap().attract.visited;
  for (const id of G.Attract.SEG.map(s => s[0])) check('attract segment ' + id + ' plays', v.includes(id), v.join(','));
  check('the reel loops', snap().attract.loop >= 1, snap().attract.loop);
  const sawGoal = []; G.Bus.sim('goal', () => sawGoal.push(1)); const sawFight = []; G.Bus.sim('fight_start', () => sawFight.push(1)); const sawK = []; G.Bus.sim('kaboom_start', () => sawK.push(1));
  game.advance(76); check('the reel shows a goal, a fight and KABOOM each loop', sawGoal.length > 0 && sawFight.length > 0 && sawK.length > 0, [sawGoal.length, sawFight.length, sawK.length].join(','));
  game.input.tap('confirm'); game.advance(1);
  check('any input returns to the title', game.sceneName === 'title', game.sceneName);
  check('the input is consumed (the title is not past PRESS ANY BUTTON)', game.scene.state === 'press', game.scene.state);
  // the menus also go to attract when idle
  for (const sc of ['storymap', 'setup', 'records', 'about', 'practice']) { game.go(sc, null, { fade: 0 }); game.advance(11); check(sc + ': 10 s idle starts the attract mode', game.sceneName === 'attract', game.sceneName); game.input.tap('pass'); game.advance(1); }
  // a match never does
  game.go('match', { cfg: G.Setup.quickCfg({}) }, { fade: 0 }); game.advance(15); check('a match never goes to attract', game.sceneName === 'match');
  check('no errors in the attract run', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
});
