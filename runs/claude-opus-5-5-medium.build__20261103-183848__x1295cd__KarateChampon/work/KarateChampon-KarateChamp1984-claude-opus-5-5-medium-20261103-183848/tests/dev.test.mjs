import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G, TUNE = KC.TUNE; G.adv(.3);
  game.go('fight', { mode: 'versus', stage: 'dojo', white: 'taro', red: 'ebi', cpu: [false, true], seed: 2 }, { fade: 0 }); G.adv(1);
  const items = game.o.menu.items(); t.check('the pause menu has Dev mode', items.some(i => i && i[0] === 'Dev mode'), items.map(i => i[0]));
  t.check('the pause menu has Move list and Retry', items.some(i => i[0] === 'Move list') && items.some(i => i[0] === 'Retry match'));
  items.find(i => i[0] === 'Dev mode')[1](); G.adv(.1); t.check('Dev mode opens the panel', KC.Dev.active && KC.DEVT.enabled);
  // sliders: live values
  KC.Dev.tab = 0; KC.Dev.row = 2 + KC.TUNE_SPEC.findIndex(s => s[0] === 'clock'); I.tap('right'); G.adv(.05); t.check('a slider changes its value', TUNE.clock === 31, TUNE.clock);
  t.check('the HUD shows DEV and no high scores while tuned', KC.tuneChanged());
  KC.Dev.row = 0; I.tap('confirm'); G.adv(.05); t.check('RESET ALL restores the defaults', !KC.tuneChanged() && TUNE.clock === 30, TUNE.clock);
  // hitstop and fullAt affect play
  { const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), B = new KC.Bout({ fighters: [a, b], intro: false }); B.phase = 'fight'; a.x = 150; b.x = 150 + (a.w + b.w) / 2 + 28; a.st = b.st = 'idle'; a.poseName = b.poseName = null; TUNE.hitstop = .25; a.start('roundKick', b); for (let k = 0; k < 120 && !B.lastPoint; k++) B.update(1 / 120); t.check('hitstop sets the freeze', Math.abs(B.stopT - .25) < .02, B.stopT); TUNE.hitstop = .1; }
  { TUNE.fullAt = 700; const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), B = new KC.Bout({ fighters: [a, b], intro: false }); B.phase = 'fight'; a.x = 150; b.x = 150 + (a.w + b.w) / 2 + 28; a.st = b.st = 'idle'; a.poseName = b.poseName = null; a.start('roundKick', b); for (let k = 0; k < 200 && !B.lastPoint; k++) B.update(1 / 120); t.check('fullAt 700 makes a 600 round kick a half point', B.lastPoint && !B.lastPoint.full, B.lastPoint); KC.resetTune(); }
  // toggles: P1 invincible stops CPU points
  { KC.DEVT.invincible = true; const a = new KC.Karateka('taro', 0), b = new KC.Karateka('negi', 1), B = new KC.Bout({ fighters: [a, b], intro: false, cpu: [false, true] }); B.phase = 'fight'; b.x = 250; a.x = 250 - (a.w + b.w) / 2 - 28; a.st = b.st = 'idle'; a.poseName = b.poseName = null; b.start('roundKick', a); for (let k = 0; k < 200; k++) B.update(1 / 120); t.check('P1 invincible: the CPU cannot score', B.points[1] === 0, B.points); KC.DEVT.invincible = false; }
  KC.Dev.tab = 1; const rows = KC.Dev.rows(); t.check('toggles include boxes, frame data, invincible, unlock all', ['boxes', 'frames', 'invincible', 'unlocked', 'frameStep', 'infTime'].every(k => rows.some(r => r.toggle === k)));
  KC.Dev.row = 0; I.tap('confirm'); G.adv(.05); t.check('a click or confirm toggles boxes', KC.DEVT.boxes === true); KC.DEVT.boxes = false;
  // warps reach every ladder node and the lab
  KC.Dev.tab = 2; const warps = KC.Dev.rows(); t.check('a warp for every ladder node', KC.DATA.ladder.every((n, i) => warps.some(w => typeof w.label === 'string' && w.label.startsWith('ROAD ' + (i + 1) + ':'))));
  warps.find(w => w.label === 'TECHNIQUE LAB').act(); G.adv(.3); t.check('the Technique Lab warp', game.sceneName === 'lab', game.sceneName);
  warps.find(w => w.label.startsWith('ROAD 13')).act(); G.adv(.6); t.check('warp to node 13 (the bull)', KC.Story.s.node === 12 && ['road', 'bonus'].includes(game.sceneName), [KC.Story.s.node, game.sceneName]);
  // no high scores recorded while tuned
  TUNE.walk = 80; let went = null; KC.initials(999999, 'story', () => { went = 'skipped'; }); t.check('no initials entry while tuned', went === 'skipped' && game.sceneName !== 'initials'); KC.resetTune();
  t.check('copy tuning JSON exports TUNE', JSON.parse(game.debug.exportTuning()).clock === 30);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
