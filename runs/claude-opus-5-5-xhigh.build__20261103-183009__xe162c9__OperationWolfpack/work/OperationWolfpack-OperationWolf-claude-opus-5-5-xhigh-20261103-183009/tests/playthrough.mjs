// T-playthrough: the whole game headless. From the title (press start) through all 6 ops, the cutscenes and the ending,
// to the initials and back to the title. o.fair: the fair bot on RECRUIT without cheats; else the god bot on VETERAN.
import { load } from './lib.mjs';
export function playthrough(o = {}) {
  const { game, WP } = load(), I = game.input, fails = [], log = [];
  const check = (w, ok, d = '') => { if (!ok) fails.push(w + (d ? ': ' + d : '')); };
  game.advance(.5);
  check('boots to the title', game.sceneName === 'title', game.sceneName);
  game.settings.set('difficulty', o.fair ? 'RECRUIT' : 'VETERAN');
  if (!o.fair) { WP.Dev.cheats.god = true; WP.Dev.cheats.ammo = true; }
  const bot = WP.Bot.make({ fair: !!o.fair, seed: o.seed || 5 });
  WP.Input.override(0, (w, p, dt) => WP.Bot.frame(bot, w, p, dt));
  I.tap('confirm'); game.advance(.2);    // START MISSION
  I.tap('confirm'); game.advance(.2);    // the difficulty
  let last = '', t = 0, ops = [], endingN = null, rank = null, maxT = o.maxT || 3600, continues = 0, sceneT = 0;
  while (t < maxT) {
    const sc = game.sceneName;
    if (sc !== last) { log.push(sc + (sc === 'play' && WP.Flow.sim ? ':' + WP.Flow.sim.stage.id : '')); last = sc; sceneT = 0; if (sc === 'play') ops.push(WP.Flow.sim.stage.id); if (sc === 'continue') continues++; }
    if (sc === 'ending') { const s = game.scene; endingN = s.n; rank = s.rank; }
    if (sc === 'title' && t > 5) break;
    if (sc === 'ending' && game.scene.phase === 'menu' && game.scene.menu && game.scene.menu.i === 0) { I.tap('down'); game.advance(.1); }
    if (sc !== 'play' && sceneT > .6) { I.tap('confirm'); }
    if (sc === 'initials' && sceneT > 1) { I.tap('confirm'); }
    if (sc === 'cutscene') { I.hold('confirm', true); }
    else I.hold('confirm', false);
    game.advance(.25); t += .25; sceneT += .25;
    if (game.errors.length) break;
  }
  check('no errors', !game.errors.length, game.errors.map(e => e.stack || e.message).slice(0, 2).join(' | '));
  check('all six ops were played', ['op1', 'op2', 'op3', 'op4', 'op5', 'op6'].every(op => ops.includes(op)), ops.join(','));
  check('the ending was reached', endingN !== null, log.join(' > '));
  check('a rank was given', !!rank, String(rank));
  check('at least 3 hostages came home', endingN >= 3, String(endingN));
  check('it returned to the title', game.sceneName === 'title', game.sceneName);
  check('the cutscenes played', log.filter(s => s === 'cutscene').length >= 3, log.join(' > '));
  return { fails, log, ops, endingN, rank, t, continues, run: WP.Flow.run };
}
if (process.argv[1] && process.argv[1].endsWith('playthrough.mjs')) {
  const t0 = Date.now(), r = playthrough({ fair: process.argv[2] === 'fair' });
  for (const f of r.fails) console.log('FAIL', f);
  console.log('flow:', r.log.join(' > '));
  console.log('ending', r.endingN, 'rank', r.rank, 'sim t', r.t, 'continues', r.continues, 'real', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
