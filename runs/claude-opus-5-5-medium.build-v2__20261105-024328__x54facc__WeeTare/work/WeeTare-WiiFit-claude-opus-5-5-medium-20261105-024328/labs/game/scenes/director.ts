/**
 * @file The director: the attract loop, and the driver that plays the whole game (the softlock finder, and dev mode's "bot
 * plays for me"). Attract is free to cheat: a perfect bot with no topples, each clip about fifteen seconds, then round
 * again. It never reaches the save, because only the page writes one, and only when attract is off.
 */
import { flowStepAttractGuard } from './attract-guard';
import { castOf } from './cast-ref';
import { nextItem, nextDay, startEvent, startGroup } from './flow';
import { flowOf, type W } from './types';
import { standAt } from './events/kit';
import { COAST } from './data/courses';

/** The loop: activity, how long, options. */
export const ATTRACT: readonly { id: string; steps: number; only?: string }[] = [
  { id: 'jog', steps: 900 },
  { id: 'poseA', steps: 1500 },
  { id: 'pond', steps: 1200 },
  { id: 'line', steps: 900 },
  { id: 'paddle', steps: 900 },
  { id: 'garden', steps: 900 },
  { id: 'step', steps: 900 },
  { id: 'hoop', steps: 900 },
  { id: 'plunge', steps: 1000 },
  { id: 'tilt', steps: 1100, only: 'stone' },
];

/** Starts attract, or ends it. */
export function setAttract(w: W, on: boolean): void {
  const flow = flowOf(w);
  flow.auto = on;
  flow.noTopple = on;
  flow.bot = on ? 'perfect' : '';
  flow.autoIndex = -1;
  flow.autoT = 0;
}

/** One director step. */
export function directorStep(w: W): void {
  const flow = flowOf(w);
  flowStepAttractGuard(w);
  if (flow.auto) {
    flow.autoT -= 1;
    if (flow.autoT <= 0 || flow.mode === 'results') {
      flow.autoIndex = (flow.autoIndex + 1) % ATTRACT.length;
      const clip = ATTRACT[flow.autoIndex];
      flow.autoT = clip.steps;
      flow.mode = 'front';
      flow.group = null;
      startEvent(w, clip.id, { only: clip.only });
      w.emit('attractClip', { id: clip.id, index: flow.autoIndex } as never);
    }
    return;
  }
  if (!flow.drive) return;
  driveStep(w);
}

/** The whole-game driver: goes on to the next thing whenever nothing is playing. */
function driveStep(w: W): void {
  const flow = flowOf(w);
  if (flow.mode === 'event') {
    flow.driveT = 0;
    return;
  }
  flow.driveT += 1;
  if (flow.driveT < 30) return;
  flow.driveT = 0;
  if (flow.mode === 'results') {
    flow.mode = 'roam';
    flow.group = null;
    return;
  }
  if (flow.mode === 'credits') {
    flow.day = 6;
    flow.free = true;
    flow.mode = 'roam';
    flow.drive = false;
    flow.bot = '';
    w.emit('free', {} as never);
    return;
  }
  if (flow.mode === 'evening') {
    nextDay(w);
    return;
  }
  if (flow.mode !== 'roam') return;
  const next = nextItem(flow);
  if (next === null) {
    flow.mode = 'evening';
    return;
  }
  if (next === 'walk') {
    standAt(w, castOf(w).guest, 12, 38, Math.PI);
    flow.done.push('walk');
    return;
  }
  if (next === 'group') return startGroup(w);
  startEvent(w, next);
}
void COAST;
