/**
 * @file The campaign with no browser. Title, eight scenes, eight operations, debrief, credits, then Free Surgery.
 * The bot plays each case from that case's own start. The save at the end is what the Board would have written.
 */
import { runBot } from './bot';
import { storyCases } from './cases';
import { rankFor } from './ratings';
import { SCENES, sceneById } from './story';
import type { Difficulty, Rank } from './types';
import { createFromCase } from './world';

/** What a finished shift remembers. */
export interface Through {
  scenes: string[];
  /** Case id, then the rank the debrief would show. */
  ranks: { id: string; rank: Rank; score: number }[];
  postcards: string[];
  credits: boolean;
  free: boolean;
  attending: boolean;
}

/** Walk the whole story on one difficulty. Throws if a case does not clear, because the credits are not a consolation. */
export function playThrough(difficulty: Difficulty = 'resident', seed = 1): Through {
  const scenes: string[] = [];
  const ranks: Through['ranks'] = [];
  const postcards: string[] = [];
  for (const def of storyCases()) {
    const before = sceneById(def.storyBefore);
    const after = sceneById(def.storyAfter);
    if (!before || !after) throw new Error(`Missing scene for ${def.id}`);
    scenes.push(before.id);
    const op = createFromCase(def.id, { difficulty, seed });
    runBot(op);
    if (op.status !== 'won') throw new Error(`${def.id} ${op.fail}`);
    const rank = rankFor(op.score, def.par, op.slips, difficulty);
    ranks.push({ id: def.id, rank, score: op.score });
    const letter = rank === '★' || rank === 'S' ? 'S' : rank;
    postcards.push(def.patients[0].postcards[letter]);
    scenes.push(after.id);
  }
  if (!SCENES.some((scene) => scene.boxes.some((box) => box.drama === 'CASE FILE REMAINS OPEN'))) {
    throw new Error('The last beat is missing');
  }
  return { scenes, ranks, postcards, credits: true, free: true, attending: true };
}
