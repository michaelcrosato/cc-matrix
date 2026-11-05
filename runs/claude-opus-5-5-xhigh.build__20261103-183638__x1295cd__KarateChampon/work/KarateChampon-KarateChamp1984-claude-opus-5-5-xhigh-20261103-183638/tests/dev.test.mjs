// dev: the pause menu's Dev mode; sliders change live variables and play; RESET ALL; toggles; warps; no high scores while tuned
import { fresh, steps, pair } from './lib/util.mjs';
export default async t => {
  const { KC, game } = fresh();
  const items = game.o.menu.items(); t.check('the pause menu has Dev mode and Move list', items.some(i => i && i[0] === 'Dev mode') && items.some(i => i && i[0] === 'Move list'));
  KC.Dev.open(); t.check('dev mode opens a panel and stays enabled', KC.Overlay.active && KC.DEV.on);
  const P = KC.Dev.panel; P.tab = 0; P.i = 1; game.input.tap('right'); steps(game, 1); t.check('right on a slider raises it (game speed)', KC.TUNE.gameSpeed > 1, KC.TUNE.gameSpeed);
  game.input.tap('alt'); steps(game, 1); t.check('triangle / T resets the focused slider', KC.TUNE.gameSpeed === 1, KC.TUNE.gameSpeed);
  for (const k in KC.TUNE_DEFAULTS) { const S = KC.TUNE_SPEC[k]; KC.Dev.set(k, S[1]); t.check('slider ' + k + ' reaches its max', Math.abs(KC.TUNE[k] - S[1]) < S[2] + 1e-9, KC.TUNE[k]); }
  t.check('a changed tuning is flagged (DEV, no high scores)', KC.tuneChanged() && !KC.Save.qualifies('story', 999999));
  P.tab = 0; P.i = 0; game.input.tap('confirm'); steps(game, 1); t.check('RESET ALL restores every default', !KC.tuneChanged(), JSON.stringify(KC.TUNE));
  KC.Dev.close(); t.check('the panel closes', !KC.Overlay.active);
  // sliders affect play: fullAt turns a 600 round kick into a half point; hitstop changes the bout's freeze
  { const [A, B] = pair(KC); KC.Dev.set('fullAt', 700); const s = KC.Bout.prototype._score.call({}, A, B, { tech: 'roundKick', gap: 28, timingQ: 1, spacingQ: 1, prof: 'stand' }); t.check('fullAt 700: a 600 round kick is a half', s.pts === 600 && !s.full); KC.Dev.resetAll(); }
  { const [A, B] = pair(KC, 150, 150 + 18 + 26); const b = new KC.Bout({ fighters: [A, B], seed: 1, rules: { intro: false } }); for (let i = 0; i < 2000 && b.phase !== 'fight'; i++) b.update(1 / 120); KC.Dev.set('hitstop', .25); A.x = 150; B.x = 150 + 18 + 26; A.control({ posture: 'n', press: 'r' }); b.update(1 / 120); A.control(null); for (let i = 0; i < 200 && b.phase !== 'yame'; i++) b.update(1 / 120); t.check('hitstop .25: the bout holds a quarter second', Math.abs(b.freeze - .25) < .02, b.freeze); KC.Dev.resetAll(); }
  // P1 invincible: the CPU cannot score
  { const [A, B] = pair(KC, 150, 150 + 18 + 26); KC.DEV.invincible = true; const b = new KC.Bout({ fighters: [A, B], seed: 1, rules: { intro: false } }); for (let i = 0; i < 2000 && b.phase !== 'fight'; i++) b.update(1 / 120); B.x = 150 + 18 + 26; B.control({ posture: 'n', press: 'l' }); b.update(1 / 120); B.control(null); for (let i = 0; i < 200; i++) b.update(1 / 120); t.check('P1 invincible: red cannot score', b.points[1] === 0); KC.DEV.invincible = false; }
  // infinite time
  { const [A, B] = pair(KC); KC.DEV.infiniteTime = true; const b = new KC.Bout({ fighters: [A, B], seed: 1, rules: { intro: false } }); for (let i = 0; i < 120 * 40; i++) b.update(1 / 120); t.check('infinite time: the clock stays', b.phase === 'fight' && b.clock === 30, b.phase + ' ' + b.clock); KC.DEV.infiniteTime = false; }
  // warps: every ladder node, every bonus, every lesson, the lab, the ending, credits, attract
  const W = KC.Dev.warps(); t.check('warps list every ladder node, stage, bonus, lesson and call', W.length >= 17 + 1 + 8 + 3 + 4 + 3 + Object.keys(KC.CALLS).length);
  for (const [label, act] of W.filter(([l]) => /^(ROAD|BONUS|PRACTICE|TECHNIQUE LAB|THE ENDING|CREDITS|QUICK BOUT: NAT)/.test(l))) { act(); steps(game, 3); t.check('warp: ' + label, game.errors.length === 0 && game.sceneName !== 'title', game.sceneName + ' ' + game.errors.map(e => e.message).join('|')); game.errors.length = 0; }
  // the technique lab measures a contact gap
  game.go('lab', { tech: 'roundKick' }); steps(game, 120 * 2); t.check('the lab measures the round kick', !!(game.scene.measured && game.scene.measured.gap >= 0), JSON.stringify(game.scene.measured));
  // persistence
  KC.Dev.set('walk', 90); const kept = JSON.parse(game.input && KC.store.get('dev', null) ? JSON.stringify(KC.store.get('dev')) : '{}'); t.check('the tuning is saved (kc:dev)', kept.tune && kept.tune.walk === 90); KC.Dev.resetAll();
};
