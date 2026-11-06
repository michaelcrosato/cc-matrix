/** @file Write rank thresholds at 45/60/75/90 percent of a fresh Resident solo-plus-colleague bot score. */
import { writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { allCases } from '../data/cases';
import { createOperation, defaultRules, scoreTotal } from '../scenes/op/state';
import { stepOperation } from '../scenes/op/step';
import { botHands, botHand } from '../bot';
const scores: Record<string, number> = {},
  ranks: Record<string, number[]> = {};
for (const c of allCases) {
  const r = defaultRules(),
    s = createOperation(c.id, 1, 1, 0, r);
  for (let i = 0; i < 60000 && s.status === 'playing'; i++) {
    const h = botHands(s, r);
    if (c.ai) h[1] = botHand(s, 1, r, true);
    stepOperation(s, h, r);
  }
  if (s.status !== 'won') throw new Error(`${c.id}: ${s.reason}`);
  scores[c.id] = scoreTotal(s);
  ranks[c.id] = [0.45, 0.6, 0.75, 0.9].map((f) => Math.round(scores[c.id] * f));
}
const file = 'labs/game/data/cases/calibration.ts',
  source =
    '/** @file Generated Resident bot scores and rank thresholds; npm run calibrate refreshes them. */\nexport const BASE_SCORES:Record<string,number>=' +
    JSON.stringify(scores) +
    ';\nexport const RANKS:Record<string,number[]>=' +
    JSON.stringify(ranks) +
    ';\n';
writeFileSync(file, await format(source, { ...(await resolveConfig(file)), parser: 'typescript' }));
console.log(`Calibrated ${allCases.length} cases.`);
