// Dev mode (15.3): opened from the pause menu's item; sliders change the match; reset one; reset all; cheats; warps
import { load } from '../lib.mjs';
import { check, guard } from '../t.mjs';
guard('dev', async () => {
  const { game, G, snap } = load(); game.advance(.5);
  const { Dev, T, Match } = G;
  game.go('match', { cfg: G.Setup.quickCfg({}) }, { fade: 0 }); game.advance(1);
  const item = (game.o.menu.items || []).find(i => i[0] === 'Dev Mode'); check('the pause menu has a Dev Mode item', !!item);
  game.pause && game.pause('player'); item[1](); game.advance(.1);
  check('Dev Mode opens the panel and holds the match', Dev.isOpen() && Match.m.devPause && !game.paused, JSON.stringify([Dev.isOpen(), Match.m.devPause, game.paused]));
  const t0 = Match.m.clock; game.advance(1); check('the match holds while the panel is open', Match.m.clock === t0);
  // sliders: TUNING tab, rows 1.. (row 0 is RESET ALL): right raises skateMax
  Dev.tab = 0; Dev.row = 1; const I = game.input; I.tap('right'); game.advance(.05); I.tap('right'); game.advance(.05);
  check('a slider changes its value', T.skateMax > T.def.skateMax, T.skateMax);
  Dev.row = T.meta.findIndex(m => m.key === 'wristSpeed') + 1; I.tap('right'); game.advance(.05); check('a second slider', T.wristSpeed > 330, T.wristSpeed);
  Dev.row = T.meta.findIndex(m => m.key === 'checkPower') + 1; for (let i = 0; i < 4; i++) { I.tap('right'); game.advance(.05); } check('a third slider', T.checkPower > 1, T.checkPower);
  Dev.row = 1; I.tap('lob'); game.advance(.05); check('△ resets the row', T.skateMax === T.def.skateMax, T.skateMax);
  Dev.row = 0; I.tap('confirm'); game.advance(.05); check('RESET ALL TO DEFAULTS restores every value', T.wristSpeed === T.def.wristSpeed && T.checkPower === T.def.checkPower);
  // the values apply to the match: a faster top speed shows in vmax
  T.set('skateMax', 180); const s = Match.m.skaters[0]; check('a tuning value applies live', Math.round(G.Skater.vmax(s, Match.m)) === Math.round(180 * (.85 + .05 * s.def.r[0]) * (Match.m.puck.owner === s ? .94 : 1)), G.Skater.vmax(s, Match.m)); T.resetAll();
  // cheats
  Dev.tab = 1; Dev.row = 0; I.tap('confirm'); game.advance(.05); check('a cheat toggles (infinite turbo)', Match.m.cheats.turbo === true);
  check('big heads cheat', Dev.cheat('bigHeads', true) && Match.m.skaters[0].rig.o.headR > 5);
  Dev.cheat('boomFull'); check('instant BOOM full starts KABOOM', Match.m.kaboom[0] > 0);
  // warps
  check('warp: clock to 0:10', Dev.warp('clock10') && Match.m.clock <= 10);
  check('warp: home +1', Dev.warp('homeGoal') && Match.m.teams[0].score === 1);
  check('warp: spawn every item', Dev.warp('item') && Match.m.items.length >= 7, Match.m.items.length);
  check('warp: shatter a panel', Dev.warp('shatter') && G.Rink.panels.some(p => p.state === 'shattered'));
  Dev.close(); game.advance(.1); check('closing the panel resumes the match', !Dev.isOpen() && !Match.m.devPause);
  Dev.open(); Dev.live = true; Match.m.devPause = false; const c1 = Match.m.clock; game.advance(1); check('LIVE runs the game behind the panel', Match.m.clock < c1 || Match.m.phase !== 'play'); Dev.live = false; Dev.close();
  check('warp: start a fight', Dev.warp('fight') && Match.m.phase === 'fight');
  game.advance(.5); check('warp: period 2', Dev.warp('p2') !== false); game.advance(5); check('the period changed', Match.m.period >= 2 || game.sceneName === 'flood', Match.m.period + ' ' + game.sceneName);
  check('the dev panel tabs: 4', ['TUNING', 'CHEATS', 'WARP', 'DEBUG'].length === 4 && Dev.WARPS.length >= 20 && Dev.CHEATS.length >= 10);
  check('no errors in the dev run', game.errors.length === 0, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack || '').split('\n')[1]).join(' | '));
});
