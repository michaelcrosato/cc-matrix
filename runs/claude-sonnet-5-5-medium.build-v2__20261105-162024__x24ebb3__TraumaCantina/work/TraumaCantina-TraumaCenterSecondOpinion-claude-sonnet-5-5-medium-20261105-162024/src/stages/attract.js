// Attract mode: a looping reel of real sim segments played by the bot with cheats. Any input exits to the title and is swallowed.
import { app } from '../app.js';
import { go, swap } from '../core/nav.js';
import { OperationStage } from './operation.js';
import { StoryStage } from './story.js';
const ALL4 = [{ id: 0, doctor: 'ilya' }, { id: 1, doctor: 'sabine' }, { id: 2, doctor: 'ilya' }, { id: 3, doctor: 'sabine' }];
export const REEL = [
  { kind: 'story', scene: 'ep1', beats: 5, dur: 30 },
  { kind: 'op', op: 'op1', start: 1, dur: 26 },
  { kind: 'op', op: 'op2', start: 1, dur: 28 },
  { kind: 'op', op: 'op3', start: 0, dur: 26 },
  { kind: 'op', op: 'op4', start: 2, dur: 24 },
  { kind: 'op', op: 'op5', start: 0, dur: 30 },
  { kind: 'op', op: 'op6', start: 7, dur: 24 },
  { kind: 'op', op: 'op7', start: 1, dur: 30 },
  { kind: 'op', op: 'op8', start: 1, dur: 30 },
  { kind: 'op', op: 'pileup', start: 0, dur: 28, seats: ALL4 },
];
export function attractStart(ctx, i = 0) { app.attractActive = true; return attractNext(ctx, { i: i - 1 }); }
export function attractNext(ctx, att) {
  const i = (att.i + 1) % REEL.length, seg = REEL[i], at = { i, dur: seg.dur };
  if (seg.kind === 'story') return swap(ctx, new StoryStage({ sceneId: seg.scene, attract: { ...at, beats: seg.beats }, next: null }));
  const seatsDef = seg.seats || undefined;
  return swap(ctx, new OperationStage({ opId: seg.op, startStage: seg.start || 0, attract: at, noDive: true, seed: 7 + i, difficulty: 'resident', seatsDef, humans: seg.seats ? 4 : 1, srcs: seg.seats ? seg.seats.map(() => null) : undefined, quietOn: true, noSave: true, cheats: { god: true, composure: true, freezeClock: true, unlimited: true } }));
}
