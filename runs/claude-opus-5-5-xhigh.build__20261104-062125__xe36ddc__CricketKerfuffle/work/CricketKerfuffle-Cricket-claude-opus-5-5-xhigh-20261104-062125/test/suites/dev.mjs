import { load, until, quickMatch } from '../lib.mjs';
export async function run(check) {
  const env = load({ seed: 1 }), { game, I, D, K } = env; const m = quickMatch(env, { humans: {} });
  K.Tuning.persist = false;
  // the pause menu's Dev Mode item calls K.dev.open (the engine's menu can't be driven headless)
  I.tap('pause'); game.advance(.1); check('pause pauses the match', game.paused === true);
  game.o.menu.items.find(i => i[0] === 'Dev Mode')[1](); game.advance(.05); check('the Dev Mode item opens dev mode over the frozen match', D.snapshot().dev.open && !game.paused, D.snapshot().dev);
  const t0 = m.time; game.advance(.5); check('the match is frozen while dev mode is open', m.time === t0, [t0, m.time]);
  const rows = K.dev.rows(), i = rows.findIndex(r => r.slider && r.slider.key === 'ballSpeed');
  for (let k = 0; k < i; k++) { I.tap('down'); game.advance(1 / 60); }
  check('down moves to the Ball speed slider', K.dev.row === i, [K.dev.row, i]);
  const v0 = K.Tuning.raw('ballSpeed'); I.tap('right'); game.advance(1 / 60); check('right raises the slider', K.Tuning.raw('ballSpeed') > v0, [v0, K.Tuning.raw('ballSpeed')]);
  I.tap('special'); game.advance(1 / 60); check('Triangle resets the row to its default', Math.abs(K.Tuning.raw('ballSpeed') - .62) < 1e-9);
  D.setTuning('ballSpeed', .8); check('the DEV badge shows a changed value', D.snapshot().dev.changed.includes('ballSpeed'));
  K.dev.row = 0; I.tap('confirm'); game.advance(1 / 60); check('Reset all restores every value', D.snapshot().dev.changed.length === 0, D.snapshot().dev.changed);
  D.setTuning('ballSpeed', .8);
  I.tap('cancel'); game.advance(.1); check('Circle closes dev mode', !D.snapshot().dev.open);
  until(game, () => m.phase === 'setup', 10); D.forceDelivery({ id: 'express', target: [-4, 90], kmh: 140 }); until(game, () => m.phase === 'flight', 10);
  const sp = Math.hypot(m.ball.vx, m.ball.vy); check('the next delivery reflects the Ball speed slider (0.8)', Math.abs(sp - 140 / 3.6 * 16 * .8 * 1.1 * (m.bowlerFamily() === 'spin' ? 1.1 : 1) / 1.1) < 25 || sp > 450, sp);
  K.Tuning.resetAll();
  until(game, () => m.phase === 'setup', 20); D.forceOutcome('six'); until(game, () => m.phase === 'between', 30);
  const l = m.inn.recs[m.inn.recs.length - 1]; check('a forced SIX is a six', l && l.boundary === 6, l && l.boundary);
  // the tabs and the jumps
  K.dev.open(); I.tap('run'); game.advance(1 / 60); check('R1 moves to the TOGGLES tab', K.dev.tab === 1);
  const tg = K.dev.rows().findIndex(r => r.label === 'Infinite Hype'); K.dev.row = tg; I.tap('confirm'); game.advance(1 / 60); check('a toggle switches (Infinite Hype)', K.dev.toggles.infiniteHype === true && m.cfg.cheat.infiniteHype === true);
  I.tap('run'); game.advance(1 / 60); check('JUMP tab', K.dev.tab === 2);
  const ch = K.dev.rows(); check('the JUMP tab lists the story, the match flow and the forcing tools', ['Story: start chapter', 'Skip to the last over', 'Force next outcome', 'Force a review (LBW, wrongly not out)', 'Force the rain delay', 'Force a chaos event', 'Spawn an item token', 'Trigger a Super Over', 'Play attract segment', 'Jukebox', 'Unlock all teams', 'Reset save'].every(n => ch.some(r => r.label === n)), ch.map(r => r.label));
  K.dev.sel.ch = 2; K.dev.sel.beat = 0; K.dev.row = 0; I.tap('confirm'); game.advance(.5);
  check('jump to chapter 3 plays its pre-match scene', D.snapshot().scene === 'cutscene', D.snapshot().scene);
  K.dev.open(); K.dev.tab = 3; game.advance(.05); check('the INFO tab draws without errors', !game.errors.length, game.errors.map(e => e.message));
  K.dev.close(); check('no errors', !game.errors.length, game.errors.map(e => e.message));
}
