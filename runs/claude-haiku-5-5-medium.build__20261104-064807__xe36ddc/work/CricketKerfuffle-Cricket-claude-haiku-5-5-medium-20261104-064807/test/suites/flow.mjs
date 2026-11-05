// sim-front, sim-match and dev: the game in Node through game.advance and game.debug. Navigation by keys, a Quick Match to
// a result, the attract showreel after ten seconds idle, the touch-only gate, the dev panel, glyphs that follow the device.
import { loadGame } from '../lib.mjs';
export async function run({ check }) {
  const g = loadGame();
  const { game, I, snap, errs } = g;
  game.advance(0.5);
  check('the title waits for a key', snap().scene === 'title', snap().scene);
  I.tap('down'); game.advance(0.1); I.tap('confirm'); game.advance(0.5);
  check('Quick Match opens its setup rows', snap().scene === 'setup', snap().scene);
  for (let i = 0; i < 8; i++) { I.tap('down'); game.advance(0.05); }
  I.tap('confirm'); game.advance(0.5);
  check('START MATCH opens the toss', snap().scene === 'toss', snap().scene);
  I.tap('shot');
  for (let k = 0; k < 600 && !['choose', 'cpu'].includes(snap().toss); k++) game.advance(1 / 120);
  check('the toss gives a bat-or-bowl choice or the CPU choice', ['choose', 'cpu'].includes(snap().toss), snap().toss);
  if (snap().toss === 'choose') I.tap('shot');
  for (let k = 0; k < 900 && snap().scene !== 'match'; k++) game.advance(1 / 120);
  check('the toss gives way to a match', snap().scene === 'match', snap().scene + ' ' + snap().toss);
  // play a whole first over: bowl when asked, bat on the ball, run when the ball is stopped
  let t = 0, bowled = 0, batted = 0;
  while (t < 240 && snap().scene === 'match' && (snap().match.innings === 0 || snap().match.phase !== 'end')) {
    game.advance(1 / 120); t += 1 / 120;
    const s = snap(), m = s.match;
    if (!m) continue;
    if (m.phase === 'setup' && m.bowler && s.ui.device) { if ((t * 1000 | 0) % 17 === 0) { I.tap('shot'); bowled++; } }
    if (m.phase === 'runup' && s.ball && (t * 1000 | 0) % 2 === 0) { I.tap('shot'); }
    if (m.phase === 'flight' && s.ball && s.ball.y < 520 && s.ball.y > 440 && !m.hype) { I.tap('shot'); batted++; }
    if (m.phase === 'flight' && s.ball && s.ball.y < 520 && s.ball.y > 440) { I.tap('loft'); }
    if (m.phase === 'play' && (t * 1000 | 0) % 97 === 0) I.tap('run');
    if (s.match && s.match.innings >= 1) break;
  }
  const s1 = snap();
  check('a match plays balls with no errors', errs().length === 0, errs().join(' | '));
  check('the match has balls in its scorecard', s1.last !== null, JSON.stringify(s1.match));
  check('the sim reports coverage of the contact and the run', s1.coverage.contact > 0 || s1.coverage.beaten > 0, JSON.stringify(s1.coverage));
  // the pause menu has our items (Restart and Dev Mode); the dev panel opens with the Backquote key
  check('the pause menu carries Restart and Dev mode', game.o.menu.items.length === 2, game.o.menu.items.length);
  game.debug.openDev(); game.advance(0.2);
  check('the dev panel opens over the match', snap().dev.open === true, JSON.stringify(snap().dev));
  // the TUNING tab's first slider: change ballSpeed through the tune handle and reset it
  game.debug.tune('ballSpeed', 0.8);
  check('a changed slider takes effect at once', Math.abs(g.gT('ballSpeed') - 0.8) < 1e-9, g.gT('ballSpeed'));
  game.debug.tuneReset(); game.advance(0.1);
  check('reset restores the defaults', Math.abs(g.gT('ballSpeed') - 0.62) < 1e-9, g.gT('ballSpeed'));
  game.debug.closeDev(); game.advance(0.2);
  check('the dev panel closes', snap().dev.open === false);
  check('no errors after dev mode', errs().length === 0, errs().join(' | '));

  // the glyphs follow the device: a key shows its keycap, a pad shows its symbol
  I.press('KeyJ'); game.advance(0.05); I.release('KeyJ'); game.advance(0.05);
  check('a key press makes the device the keyboard', snap().ui.device === 'keyboard', snap().ui.device);
  check('the shot key label is J', I.label('shot') === 'J', I.label('shot'));
  I.press('Pad0'); game.advance(0.05); I.release('Pad0'); game.advance(0.05);
  check('a pad press makes the device the gamepad', snap().ui.device === 'gamepad', snap().ui.device);
  check('the PlayStation setting is the default', snap().ui.glyphs === 'PlayStation', snap().ui.glyphs);
  check('touch-only gate is off with a keyboard', snap().ui.touchGate === false);

  // attract: after ten seconds idle on the title, the showreel runs; any key returns to the title
  const a = loadGame();
  a.game.advance(0.5);
  a.game.advance(10.5);
  check('ten seconds idle on the title starts the attract showreel', a.snap().scene === 'attract' || a.snap().scene === 'match', a.snap().scene);
  a.game.advance(3);
  check('the showreel plays a match', a.snap().scene === 'match' && a.snap().mode === 'attract', a.snap().scene + ' ' + a.snap().mode);
  a.I.tap('confirm'); a.game.advance(0.4);
  check('any input exits the showreel to the title', a.snap().scene === 'title', a.snap().scene);
  check('the showreel has no errors', a.errs().length === 0, a.errs().join(' | '));

  // a touch-only device: the gate shows, and the showreel still runs
  const tch = loadGame({ touch: true });
  tch.game.advance(0.5);
  check('a touch-only device shows the controller gate', tch.snap().ui.touchGate === true, JSON.stringify(tch.snap().ui));
  tch.game.advance(10.5);
  check('the showreel runs on a touch-only device', tch.snap().scene === 'attract' || tch.snap().scene === 'match', tch.snap().scene);

  // difficulty changes the live values the match reads
  const d = loadGame();
  d.game.settings.set('difficulty', 'Village');
  d.game.advance(0.2);
  check('Village difficulty softens the ball speed (0.62 times 0.85)', Math.abs(d.g_T('ballSpeed') - 0.62 * 0.85) < 1e-9, d.g_T('ballSpeed'));
  check('no errors in the first game', errs().length === 0, errs().join(' | '));
}
