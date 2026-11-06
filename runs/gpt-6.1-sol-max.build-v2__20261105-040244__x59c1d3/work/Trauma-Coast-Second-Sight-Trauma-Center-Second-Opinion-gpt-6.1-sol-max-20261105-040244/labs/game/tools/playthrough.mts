/** @file A complete scripted surgical playthrough and rank calibration, using human hand intents. */
import { allCases } from '../data/cases';
import { createOperation, defaultRules } from '../scenes/op/state';
import { stepOperation } from '../scenes/op/step';
import { botHands } from '../bot';
const rules = defaultRules();
for (const c of allCases) {
  const s = createOperation(c.id, 1, 1, 0, rules);
  for (let tick = 0; tick < 80000 && s.status === 'playing'; tick++) stepOperation(s, botHands(s, rules), rules);
  console.log(
    JSON.stringify({
      id: c.id,
      status: s.status,
      phase: s.phase,
      tick: s.tick,
      vitals: s.patients,
      slips: s.slips,
      score: s.score,
      reason: s.reason,
      targets: s.targets
        .filter((t) => !t.done && t.required)
        .map((t) => ({
          id: t.id,
          kind: t.kind,
          progress: t.progress,
          stitches: t.stitches.length,
          dose: t.dose,
          mask: t.mask,
        })),
      last: s.events.slice(-4),
    }),
  );
}
