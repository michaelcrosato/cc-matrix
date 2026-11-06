// Computes medal times from AI demonstrations (skill 0.97): gold T×1.03, silver T×1.09, bronze T×1.18, frozen into data/medals.gen.js.
import { writeFileSync } from 'node:fs';
const { TESTS } = await import('../src/game/data/licences.js');
const { RaceSim, TUNE_DEFAULTS } = await import('../src/game/sim/race.js');
const { tunedParams } = await import('../src/game/sim/tuning.js');
const out = {}; let bad = 0;
export function runTest(test, carId, skill = 0.97, run = 0) {
  const params = tunedParams(carId, test.id[0] === 'C' ? { tyre: 'street' } : {});
  const sim = new RaceSim({ track: test.track, test, run, cars: [{ params, name: 'DEMO', seat: 0, carId }], record: false, tune: { ...TUNE_DEFAULTS }, rain: false });
  let n = 0; while (!sim.done && n++ < 60 * 300) sim.step([sim.testBrain(skill)]);
  return sim.run;
}
for (const test of TESTS) {
  const cars = test.runs ?? [test.carId]; let T = 0, fail = null;
  for (const car of cars) { const R = runTest(test, car); if (R.failed || !R.over) fail = R.reason ?? 'timeout'; T += R.total ?? 0; }
  if (fail) { bad++; console.log('DEMO FAILED', test.id, fail, T); }
  const r = (x) => Math.round(x * 100) / 100;
  out[test.id] = { demo: r(T), gold: r(T * 1.03), silver: r(T * 1.09), bronze: r(T * 1.18) };
  console.log(test.id, T.toFixed(2));
}
writeFileSync(new URL('../src/game/data/medals.gen.js', import.meta.url), `// Written by tools/medals.mjs. Do not edit: run it again after changing a test or the sim.\nexport const MEDALS = ${JSON.stringify(out, null, 1)};\n`);
console.log(bad ? `demos failed: ${bad}` : 'all demos passed');
