import { runBot } from './harness.mjs';
import { CAMPAIGN, recordResult, isUnlocked, shiftReport } from '../src/sim/campaign.js';
import { DEFAULT_SAVE } from '../src/core/save.js';
import { SCENE_BY_ID } from '../src/content/scenes.js';
import { BY_ID } from '../src/content/ops/index.js';
export async function run(T) {
  // whole-game scripted playthrough: every scene and op to credits, with save and unlock checks
  const save = structuredClone(DEFAULT_SAVE); let n = 0;
  for (const step of CAMPAIGN) {
    T.ok(!!SCENE_BY_ID[step.scene], `scene ${step.scene} exists`);
    if (!step.op) { T.ok(save.next === CAMPAIGN.length - 1, 'every op cleared before the ending'); continue; }
    T.ok(isUnlocked(save, step.op), `${step.op} unlocked in order`); if (n + 1 < CAMPAIGN.length - 1) T.ok(!isUnlocked(save, CAMPAIGN[n + 2].op || 'x') || n + 2 >= 10, `${CAMPAIGN[n + 2]?.op} still locked`);
    const r = runBot(step.op, { skill: 0.7, quietOn: step.op !== 'op1' && step.op !== 'op2' && step.op !== 'op3' ? true : false });
    T.ok(r.sim.over === 'win', `campaign: ${step.op} cleared`); if (r.res) recordResult(save, step.op, r.res); n++;
  }
  T.ok(save.quietOn === true, 'The Quiet stays unlocked after op3'); T.ok(shiftReport(save).every((r) => r.rank !== '-'), 'shift report has every rank'); T.ok(Object.keys(save.cleared).length === 10, 'save has 10 cleared ops');
  JSON.parse(JSON.stringify(save));
}
