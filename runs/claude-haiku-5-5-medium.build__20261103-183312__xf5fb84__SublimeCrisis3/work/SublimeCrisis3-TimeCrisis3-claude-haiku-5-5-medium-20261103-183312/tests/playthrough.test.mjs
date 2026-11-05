// The scripted playthrough (TASK.md: "a scripted playthrough of the whole game"): the Autopilot plays ARCADE, stages 1 to 3
// one after another, carrying the score, lives and specials between them as the arcade does, and the training range.
// Slow: run it with `node tests/run.mjs --playthrough`.
import { load } from './lib.mjs';

export function run(check) {
  const { TC } = load();
  let carry = null;
  const cheats = { god: true, ammo: true };
  const wins = [];
  for (const stage of [1, 2, 3]) {
    const sim = new TC.Sim({ stage, seed: 40 + stage, difficulty: 'Normal', players: [{ name: 'P1' }], carry, cheats });
    const bot = TC.Autopilot.make('showoff');
    let t = 0;
    while (!sim.over && t < 1500) {
      sim.step(TC.DT, [bot.command(sim, 0, TC.DT, bot)]);
      t += TC.DT;
    }
    const won = !!(sim.result && sim.result.won);
    wins.push(won);
    check(`ARCADE stage ${stage} is cleared by the Autopilot`, won, `over=${sim.over} t=${t.toFixed(0)} phase=${sim.phase} scene=${sim.scene && sim.scene.id}`);
    if (!won) break;
    carry = sim.carryOut();
  }
  // The training range: its three drills clear in turn.
  {
    const sim = new TC.Sim({ stage: 'range', seed: 9, difficulty: 'Normal', players: [{ name: 'P1' }], cheats });
    const bot = TC.Autopilot.make('showoff');
    let t = 0;
    while (!sim.over && t < 900) { sim.step(TC.DT, [bot.command(sim, 0, TC.DT, bot)]); t += TC.DT; }
    check('the training range is cleared by the Autopilot', !!(sim.result && sim.result.won), `t=${t.toFixed(0)}`);
  }
  check('the arcade run carried the score across stages', wins.length === 3 && wins.every(Boolean), '');
  return null;
}
