// Where the shift goes next. Save after every op.
import { App } from '../app.js';
import { OP_CAMERA } from './operation.js';
import { advance, currentStep } from '../sim/campaign.js';
import { betterRank } from '../sim/scoring.js';

export const CLOSE_CAM = { preset: 'fixed', position: [0.2, 1.75, 5.1], target: [0, 1.42, 0], fov: 30, minZoom: 1, maxZoom: 1 };
export { OP_CAMERA };

export async function goCampaign() {
  const p = App.save.progress;
  const s = currentStep(p);
  if (s.kind === 'scene') {
    const { StoryStage } = await import('./story.js');
    return App.goto(new StoryStage({ sceneId: s.id, onDone: () => { App.save.progress = advance(App.save.progress); App.persist(); goCampaign(); } }), { kind: 'dissolve', camera: CLOSE_CAM });
  }
  if (s.kind === 'op') {
    const { BriefingStage } = await import('./briefing.js');
    return App.goto(new BriefingStage({ opId: s.id, mode: 'story', difficulty: p.difficulty }), { kind: 'fade', camera: CLOSE_CAM });
  }
  const { ShiftReportStage } = await import('./results.js');
  return App.goto(new ShiftReportStage(), { kind: 'fade', camera: CLOSE_CAM });
}

/** A won op is recorded, and in the campaign the shift moves on. */
export function recordOp(opId, tally, mode) {
  const log = App.save.log;
  const prev = log[opId];
  const best = !prev || prev.total < tally.total ? { total: tally.total, rank: betterRank(tally.rank, prev?.rank), pristine: tally.pristine || !!prev?.pristine, mistakes: tally.mistakes } : { ...prev, rank: betterRank(tally.rank, prev.rank), pristine: tally.pristine || !!prev.pristine };
  log[opId] = best;
  if (mode === 'story' && App.save.progress) App.save.progress = advance(App.save.progress);
  App.persist();
}
export async function toTitle(state = 'main') {
  const { TitleStage } = await import('./title.js');
  return App.goto(new TitleStage(state), { kind: 'fade' });
}
