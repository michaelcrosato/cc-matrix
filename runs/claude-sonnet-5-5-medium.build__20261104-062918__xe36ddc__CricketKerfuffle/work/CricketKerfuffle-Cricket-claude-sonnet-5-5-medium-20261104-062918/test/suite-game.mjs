// scene-level checks: the real game in Node (headless), driven with input taps like a player
import { loadGame, check } from './lib.mjs';
const { ctx, E, game, I, D } = loadGame();
const adv = s => game.advance(s);
const sceneIs = n => game.sceneName === n;
const M = () => D.match();
function leaveAttract() { for (let i = 0; i < 8 && !sceneIs('title'); i++) { adv(1); I.tap('confirm'); adv(1.5); } }
adv(.6);
check('boots into the title', sceneIs('title'), game.sceneName);
check('no errors at boot', !game.errors.length, game.errors.map(e => e.message).join('|'));
// button symbols: PlayStation by default, Xbox as an option
check('glyph default is PlayStation', game.settings.glyphs === 'playstation', String(game.settings.glyphs));
I.lastDevice = 'gamepad';
check('prompt shows the PlayStation cross', I.label('ground') === '✕', I.label('ground'));
game.settings.set('glyphs', 'xbox'); check('Xbox glyphs on request', I.label('ground') === 'A', I.label('ground')); game.settings.set('glyphs', 'playstation'); I.lastDevice = 'keyboard';
// attract mode after 10 s idle, any input exits
adv(9); check('title waits for 9 s', sceneIs('title'));
adv(2.5); check('after 10 s idle the attract match starts', sceneIs('match') && D.session().attract, game.sceneName);
adv(1.5); I.tap('confirm'); adv(1.5);
check('any input leaves the attract mode', sceneIs('title'), game.sceneName);
// attract plays on and loops
adv(10.5); let ends = 0; const off = ctx.__bus_on ? null : null;
for (let i = 0; i < 40 && sceneIs('match'); i++) adv(10);
check('attract runs long without errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message + (e.stack || '').split('\n')[1]).join('|'));
leaveAttract();
// touch-only: the menu is inert but the attract still runs
D.titleState.touchOnly = true; I.tap('down'); I.tap('confirm'); adv(.5);
check('touch-only title ignores menu input', sceneIs('title'));
adv(10.5); check('touch-only title still runs the attract mode', sceneIs('match') && D.session().attract);
leaveAttract(); D.titleState.touchOnly = false;
// menus: quick match setup then play
check('back on the title', sceneIs('title'), game.sceneName);
I.tap('down'); adv(.05); I.tap('confirm'); adv(1); check('menu leads to the quick match setup', sceneIs('setup'), game.sceneName);
for (let i = 0; i < 8; i++) { I.tap('down'); adv(.05); }   // down to PLAY BALL (wraps)
// find the PLAY BALL row: confirm on it
for (let i = 0; i < 12 && !sceneIs('match'); i++) { I.tap('confirm'); adv(.5); if (sceneIs('match')) break; I.tap('down'); adv(.05); }
adv(1.5); check('PLAY BALL starts a match', sceneIs('match') && !D.session().attract, game.sceneName);
// the human batting and bowling, scripted
function playMatch(maxIter = 6000) {
  let g = 0;
  while (sceneIs('match') && g++ < maxIter) {
    const m = M(), ph = m.ph;
    if (ph === 'flight' && m.ball.phase === 'delivery' && !m.swing && m.ball.y < 400) { I.hold('down', true); I.tap(g % 3 ? 'ground' : 'loft'); } else I.hold('down', false);
    if (ph === 'setup' && m.sideBowl().ctrl === 'p1') { I.tap(['ground', 'loft', 'defend'][g % 3]); }
    if (ph === 'runup' && m.sideBowl().ctrl === 'p1') { const R = m.runup, tm = R.t - R.meterStart, p = .5 - .5 * Math.cos(2 * Math.PI * D.T('meterSpeed') * tm); if (tm > 0 && p > .44 && p < .56) I.tap('ground'); }
    if (ph === 'inplay') { I.tap('run'); I.hold('run', true); } else I.hold('run', false);
    if (ph === 'inplay' && m.sideBowl().ctrl === 'p1') { I.hold('left', g % 40 < 20); }
    adv(ph === 'between' || ph === 'done' ? .3 : 1 / 30);
  }
  I.hold('down', false); I.hold('run', false); I.hold('left', false);
}
// dev mode and pause while in the match
{
  const m0 = M(); adv(3); for (let i = 0; i < 400 && M().ph !== 'setup'; i++) adv(.1);
  check('pause toggles in a match', (() => { I.tap('pause'); adv(.1); const p = game.paused; I.tap('pause'); adv(.1); return p && !game.paused; })());
  D.devOpen(); adv(.1); check('dev mode opens', D.DEV.open);
  const c0 = M().clock; adv(1); check('the match waits while dev mode is open', Math.abs(M().clock - c0) < .02, M().clock + ' vs ' + c0);
  const before = D.T('ballSpeed'); I.hold('right', true); adv(.5); I.hold('right', false); adv(.1);
  check('a dev slider changes a live tuning value', D.T('ballSpeed') > before, before + ' -> ' + D.T('ballSpeed'));
  I.tap('confirm'); adv(.1); check('confirm on a slider resets it to default', Math.abs(D.T('ballSpeed') - 1) < 1e-9, String(D.T('ballSpeed')));
  I.hold('right', true); adv(.3); I.hold('right', false); adv(.1);
  // go to the reset-all row and run it
  for (let i = 0; i < 40 && D.DEV.rows[D.DEV.i].label !== 'RESET ALL SLIDERS TO DEFAULTS'; i++) { I.tap('down'); adv(.05); }
  I.tap('confirm'); adv(.1); check('reset-all returns every slider to its default', Math.abs(D.T('ballSpeed') - 1) < 1e-9);
  for (let i = 0; i < 60 && D.DEV.rows[D.DEV.i].label !== 'CLOSE DEV MODE'; i++) { I.tap('down'); adv(.05); }
  I.tap('confirm'); adv(.1); check('dev mode closes', !D.DEV.open);
  // dev tools: score a six now
  D.devOpen(); adv(.05); let k = 0; for (; k < 80 && D.DEV.rows[D.DEV.i].label !== 'SCORE A SIX NOW'; k++) { I.tap('down'); adv(.05); }
  const sc0 = M().sideBat().score; I.tap('confirm'); adv(.1); check('the dev tool scores a six', M().sideBat().score === sc0 + 6, M().sideBat().score + ' vs ' + sc0);
  D.DEV.open = false; adv(.1);
}
playMatch();
adv(1); check('a human-played quick match reaches the results', sceneIs('results'), game.sceneName);
check('no errors after a full match', !game.errors.length, game.errors.slice(0, 2).map(e => e.message + (e.stack || '').split('\n')[1]).join('|'));
I.tap('down'); adv(.1); I.tap('confirm'); adv(1.5); check('results menu leads home', sceneIs('title'), game.sceneName);
// story: chapter 1 intro, match, win, progress saved
{
  game.go('story'); adv(.8); check('story map opens', sceneIs('story'));
  I.tap('confirm'); adv(1); check('chapter one starts with a cutscene', sceneIs('cutscene'), game.sceneName);
  for (let i = 0; i < 20 && sceneIs('cutscene'); i++) { I.tap('confirm'); adv(.2); I.tap('confirm'); adv(.2); }
  adv(1.5); check('the cutscene leads to the match', sceneIs('match') && D.session().mode === 'story', game.sceneName);
  adv(4); for (let i = 0; i < 400 && M().ph !== 'setup'; i++) adv(.1); D.devOpen(); adv(.05); for (let k = 0; k < 80 && D.DEV.rows[D.DEV.i].label !== 'WIN THE MATCH'; k++) { I.tap('down'); adv(.05); } I.tap('confirm'); adv(.1); D.DEV.open = false; adv(5);
  check('a won chapter goes to the results', sceneIs('results'), game.sceneName);
  check('winning unlocks chapter two', D.progress().chapters >= 1, JSON.stringify(D.progress()));
  I.tap('confirm'); adv(1.2); for (let i = 0; i < 12 && sceneIs('cutscene'); i++) { I.tap('confirm'); adv(.6); }
  check('the victory cutscene returns to the story map', sceneIs('story'), game.sceneName);
}
// super over with the high-score table
{
  D.setMode('super'); game.go('setup'); adv(.8);
  for (let i = 0; i < 12 && !sceneIs('match'); i++) { I.tap('confirm'); adv(.4); if (sceneIs('match')) break; I.tap('down'); adv(.05); } adv(1.5);
  check('super over starts', sceneIs('match') && D.session().M.single, game.sceneName);
  adv(3); for (let i = 0; i < 400 && M().ph !== 'setup'; i++) adv(.1); D.devOpen(); adv(.05); for (let k = 0; k < 80 && D.DEV.rows[D.DEV.i].label !== 'SCORE A SIX NOW'; k++) { I.tap('down'); adv(.05); } I.tap('confirm'); adv(.05); D.DEV.open = false;
  playMatch(); adv(1);
  check('super over reaches the results', sceneIs('results'), game.sceneName);
  check('a scoring super over opens the initials entry', !!D.cab() && !!D.cab().entry, String(D.cab() && D.cab().entry));
  for (let i = 0; i < 8; i++) { I.tap('confirm'); adv(.2); }
  check('the initials entry closes and the table keeps the score', D.cab() && !D.cab().entry && D.cab().table('super').length >= 1, JSON.stringify(D.cab().table('super')));
}
// versus: a second player is added and both sides are human
{
  D.setMode('versus'); game.go('setup'); adv(.8);
  for (let i = 0; i < 12 && !sceneIs('match'); i++) { I.tap('confirm'); adv(.4); if (sceneIs('match')) break; I.tap('down'); adv(.05); } adv(1.5);
  const s = D.session(); check('versus makes both sides human', sceneIs('match') && s.M.sides[0].ctrl === 'p1' && s.M.sides[1].ctrl === 'p2', game.sceneName);
  check('versus adds a second player', game.players.length >= 2, String(game.players.length));
  adv(8); check('versus runs without errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
check('no errors at the end', !game.errors.length, game.errors.slice(0, 3).map(e => e.message + (e.stack || '').split('\n')[1]).join('|'));
