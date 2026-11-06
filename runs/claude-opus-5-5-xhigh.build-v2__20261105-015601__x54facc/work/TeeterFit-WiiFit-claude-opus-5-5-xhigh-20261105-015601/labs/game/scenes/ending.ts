/**
 * @file Leaving results, with the story's one-way doors: the Great Tilt leads to the last Morning Check; that leads to the
 * credits; and then you may stay as long as you like. The ferry does not return.
 *
 * Game code, sim-side.
 *
 * @example
 * // leaveResults(w);
 */
import type { GameWorld } from './components';
import { syncCairn } from './world';
import { applyDay } from './days';
import { flowOf, groundAt, leaveActivity, startActivity } from './flow';
import { castOf, say } from './events/kit';

/** Every guest, holding a pose as the camera drifts past. */
function strikePoses(w: GameWorld): void {
  const line: readonly (readonly [string, string, number, number])[] = [
    ['guest', 'Heron', 2, 26],
    ['gerald', 'Chair', -2, 28],
    ['bex', 'Lighthouse', 6, 28],
    ['nan', 'Nothing', 2, 31],
    ['plumb', 'Archer', -4, 24],
    ['tare', 'Bow', 8, 25],
  ];
  for (const [who, pose, x, z] of line) {
    const person = castOf(w, who);
    if (person)
      Object.assign(person.cast, {
        hold: true,
        x,
        y: groundAt(w, x, z) + 0.05,
        z,
        yaw: 0.2,
        pose,
        poseT: 1,
        leanX: 0,
        leanY: 0,
      });
  }
}

/** Leaves the results screen. */
export function leaveResults(w: GameWorld): void {
  const flow = flowOf(w);
  const was = flow.event;
  leaveActivity(w);
  syncCairn(w);
  if (was === 'tilt') {
    flow.day = 6;
    flow.done = [];
    applyDay(w);
    w.query('island')[0].island.sky = 'dawn';
    startActivity(w, 'morning', { data: { last: true } });
    flow.script = 1;
  } else if (was === 'morning' && flow.script === 1) {
    flow.script = 2;
    flow.credits = true;
    flow.cutTick = 0;
    strikePoses(w);
    w.emit('credits', {});
    say({ w }, 'tare', 'after.stay');
  }
}
