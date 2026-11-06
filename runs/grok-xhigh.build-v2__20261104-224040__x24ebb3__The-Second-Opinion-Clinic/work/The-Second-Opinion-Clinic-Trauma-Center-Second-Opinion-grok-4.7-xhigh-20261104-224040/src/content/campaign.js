import { STORY_OPS } from './ops.js';
import { SCENES } from './story.js';
import { clearSave, emptySave, writeSave } from '../core/save.js';
import { play } from '../sim/run.js';

/** Bot play from the first scene through the last operation and into the credits. */
export function playCampaign(opts = {}) {
  clearSave();
  const save = emptySave();
  const skill = opts.skill ?? 1;
  const results = [];
  for (const scene of SCENES) {
    save.scenes.push(scene.id);
    if (!scene.op) continue;
    const def = STORY_OPS.find((op) => op.id === scene.op);
    const sim = play(def, skill, { seed: opts.seed ?? 1 });
    save.ops[def.id] = { rank: sim.rank, score: sim.finalScore, won: sim.phase === 'won' };
    if (def.id === 'op3' && sim.phase === 'won') save.quiet = true;
    results.push(sim);
    writeSave(save);
  }
  save.log = true;
  save.credits = true;
  writeSave(save);
  return { save, results };
}
