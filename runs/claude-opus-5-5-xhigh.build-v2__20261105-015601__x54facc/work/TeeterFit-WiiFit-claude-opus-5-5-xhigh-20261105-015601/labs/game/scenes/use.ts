/**
 * @file What using a thing on the island does: stations start today's activity, people talk, boards open on the page.
 * Sim events carry what the page must show.
 *
 * Game code, sim-side.
 *
 * @example
 * // useThing(w, focusIndex);
 */
import type { GameWorld } from './components';
import { USABLES, usableAt } from './data/usables';
import { todaysNext } from './data/days';
import { castOf, say } from './events/kit';
import { flowOf, groundAt, startActivity } from './flow';
import { sleepNow } from './days';
import { startFinale, startGroup } from './start';

/** Uses thing `i`. */
export function useThing(w: GameWorld, i: number): void {
  const u = USABLES[i];
  const flow = flowOf(w);
  w.emit('used', { id: u.id, kind: u.kind });
  if (u.kind === 'board') w.emit('open', { what: 'noticeboard' });
  else if (u.kind === 'sign') say({ w }, 'tare', `notice.${Math.min(6, flow.day)}`);
  else if (u.kind === 'plaque') {
    if (u.plaque !== undefined && !flow.found.includes(100 + u.plaque)) flow.found.push(100 + u.plaque);
    w.emit('plaqueRead', { plaque: u.plaque ?? 0 });
  } else if (u.kind === 'person') say({ w }, u.who ?? 'tare', `talk.${u.who}.${Math.min(6, flow.day)}`);
  else if (u.kind === 'hut') {
    if (todaysNext(flow) === null) sleepNow(w);
    else say({ w }, 'tare', 'hut.early');
  } else if (u.kind === 'bench') {
    const guest = castOf(w, 'guest');
    const at = usableAt(w, i);
    if (guest && at) {
      Object.assign(guest.cast, {
        hold: true,
        x: at[0],
        y: groundAt(w, at[0], at[1]) + 0.1,
        z: at[1],
        pose: '~Meditate',
      });
      flow.resting = 1;
    }
  } else if (u.kind === 'stone') {
    if (flow.day === 5 && todaysNext(flow) === 'tilt') startFinale(w);
    else say({ w }, 'tare', 'stone.donot');
  } else {
    const want = todaysNext(flow);
    const list = u.events ?? [];
    const pick = want && list.includes(want) ? want : list.find((id) => flow.seen.includes(id));
    if (!pick) say({ w }, 'tare', 'station.notyet');
    else if (pick === 'group') startGroup(w);
    else startActivity(w, pick, activitySeats(pick));
  }
}

/** The seats an activity runs with on the island: classes fill their mats with CPU guests. */
export function activitySeats(id: string): { seats?: { kind: 'local' | 'cpu'; skill?: string; sway?: number }[] } {
  const classy = ['poseA', 'poseB', 'poseC'].includes(id);
  if (!classy) return {};
  return {
    seats: [
      { kind: 'local' },
      { kind: 'cpu', skill: 'human', sway: 0.8 },
      { kind: 'cpu', skill: 'perfect', sway: 1.1 },
      { kind: 'cpu', skill: 'perfect', sway: 0.5 },
    ],
  };
}
