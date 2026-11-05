// Dev mode (plan §19.2 "dev"): the panel opens from the pause menu; each slider changes and clamps its value and the game
// reacts; RESET ALL restores every default; the cheats and the match's buttons work; every SCENES jump lands.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const court = () => { const g = loadGame({ seed: 61 }); g.game.go('court', { court: 'skybox', humans: [{ slot: 0, input: g.game.input }] }, { fade: 0 }); g.game.advance(.2); return g; };

T('dev.the dev panel opens from the pause menu and hands the human seats to the brains', () => {
  const g = court();
  g.bb.devOpen();
  expect(g.S.dev.open, 'the panel is open');
  expect(!g.S.players[0].human, 'the human seat is driven by a brain while the panel has the focus');
  g.bb.devClose();
  expect(g.S.players[0].human, 'closing the panel gives control back');
});
T('dev.a slider changes its value, the game reacts, and it clamps to its range', () => {
  const g = court();
  const before = g.bb.TUNING.runSpeed.v;
  g.bb.setTune('runSpeed', before * 1.2);
  expect(Math.abs(g.bb.TUNING.runSpeed.v - before * 1.2) < .01, 'the value changes');
  g.bb.setTune('runSpeed', 9999);
  expect(g.bb.TUNING.runSpeed.v === g.bb.TUNING.runSpeed.max, 'it clamps at the maximum');
  g.bb.setTune('runSpeed', -5);
  expect(g.bb.TUNING.runSpeed.v === g.bb.TUNING.runSpeed.min, 'it clamps at the minimum');
  g.bb.resetTuning();
});
T('dev.a faster run speed moves the player further in a second', () => {
  const g = court();
  const p = g.S.players[1];
  const run = () => { p.human = false; p.brain = null; p.cmd = { move: [1, 0], shoot: {}, pass: {}, turbo: { down: false }, shove: {}, oop: {}, taunt: {} }; const x0 = p.body.x; g.S.match.phase = 'live'; for (let i = 0; i < 120; i++) { p.cmd.move = [1, 0]; g.bb.playerStep(p, 1 / 120); } return p.body.x - x0; };
  g.bb.setTune('runSpeed', 80); const slow = run();
  g.bb.setTune('runSpeed', 160); p.body.x = 300; const fast = run();
  g.bb.resetTuning();
  expect(fast > slow * 1.5, `fast ${fast.toFixed(1)} vs slow ${slow.toFixed(1)}`);
});
T('dev.RESET ALL restores every default', () => {
  const g = court();
  for (const k of Object.keys(g.bb.TUNING)) g.bb.setTune(k, g.bb.TUNING[k].min);
  g.bb.resetTuning();
  for (const [k, t] of Object.entries(g.bb.TUNING)) expect(t.v === t.def, `${k} is ${t.v}, want ${t.def}`);
});
T('dev.the cheats toggle and the match buttons act', () => {
  const g = court();
  const on = g.bb.devToggle('infTurbo');
  expect(on === true && g.S.cheats.infTurbo === true, 'a cheat turns on');
  const score = g.S.match.score[0];
  g.bb.devAct('homePlus');
  expect(g.S.match.score[0] === score + 2, 'the home score goes up by two');
  g.bb.devAct('quarterNext');
  expect(g.S.match.clock === 0, 'the quarter ends');
});
T('dev.every SCENES jump lands in its scene', () => {
  const jumps = ['scene:tour', 'scene:results', 'scene:credits', 'scene:attract', 'scene:camp', 'scene:about', 'scene:hall', 'court:pier'];
  for (const j of jumps) {
    const g = court();
    g.bb.devAct(j); g.game.advance(.3);
    const want = j.startsWith('court:') ? 'court' : j.slice(6);
    expect(g.game.sceneName === want, `${j} lands in ${g.game.sceneName}`);
  }
});
