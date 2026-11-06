/**
 * @file The attract-mode director: while `game.auto` is on it loops through the whole game for a kiosk - island jog, Pose Class,
 * Still Pond with its lures, The Line, Paddle Glide, Sand Garden, Step Class, Hoop Patrol, Cliff Plunge, then the Great
 * Tilt's Centre Stone - about 15 s each, the perfect bot playing and cheating freely, then round again. It never touches the
 * save (the sim cannot). Sim-side.
 * @example
 * LOOP[0]; // 'jog'
 */
import { placeGuest } from './cast';
import { STATIONS, groundAt } from './data/world';
import { leaveActivity, startActivity } from './events/runner';
import type { W } from './events/types';

export const LOOP = ['jog', 'poseA', 'pond', 'line', 'paddle', 'garden', 'step', 'hoop', 'cliff', 'tilt'] as const;
export const SECONDS_EACH = 15;
/** A system: starts and cuts activities on a timer while `game.auto` is on. */
export function director(w: W): void {
  if (!w.settings.get<boolean>('game.auto')) return;
  const flow = w.query('flow')[0].flow;
  const run = w.query('act', 'cast').find((e) => e.cast.who === 'guest')!.act;
  const due = flow.mode !== 'event' || w.tick - flow.lineTick >= SECONDS_EACH * 60 || run.done === 2;
  if (!due) return;
  if (flow.mode === 'event') leaveActivity(w);
  flow.seq = (flow.seq + 1) % LOOP.length;
  flow.lineTick = w.tick;
  const id = LOOP[flow.seq];
  startActivity(w, id, id === 'pond' || id === 'hoop');
  if (id === 'tilt') {
    run.phase = 'stone';
    run.a[0] = 0;
    run.a[18] = 0.4;
    run.a[4] = 3;
    const isl = w.query('island')[0].island;
    isl.storm = 0.8;
    placeGuest(w, [0, groundAt(0, 0) + 0.6, 0], 0);
    void STATIONS;
  }
}
