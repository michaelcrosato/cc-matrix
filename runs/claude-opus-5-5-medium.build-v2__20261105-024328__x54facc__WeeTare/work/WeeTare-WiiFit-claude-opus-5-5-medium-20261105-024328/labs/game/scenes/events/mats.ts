/**
 * @file The Pavilion's class floor: stands each seat's body on its mat, Plumb in front, spawns the mats for this class,
 * and hands back how a raw score becomes the activity's. Group Class and a session's Round use the same floor.
 */
import { clearBody } from '../../cast/body';
import { FRONT_MAT, MATS } from '../data/stations';
import { seatsOf, type EvState, type W } from '../types';
import { castOf } from '../cast-ref';
import { groundAt, ownProp, standAt, stationAt } from './kit';

/** Stands the class on its mats. `ev.seats` lists who plays. */
export function arrangeClass(w: W, ev: EvState, station: 'pavilion' | 'plaza' | 'annex' = 'pavilion'): void {
  const c = stationAt(w, station);
  const cast = castOf(w);
  if (cast.plumb >= 0) standAt(w, cast.plumb, c.x + FRONT_MAT[0], c.z + FRONT_MAT[1], 0);
  for (const e of seatsOf(w)) {
    if (e.seat.kind === 'none') continue;
    const mat = MATS[e.seat.index];
    const [x, z] = [c.x + mat[0], c.z + mat[1]];
    ownProp(w, ev, `prop:matSeat${e.seat.index}`, [x, groundAt(w, x, z) + 0.01, z]);
    ownProp(w, ev, 'prop:matRing', [x, groundAt(w, x, z) + 0.07, z]);
    if (e.seat.actor >= 0) {
      standAt(w, e.seat.actor, x, z, Math.PI);
      clearBody(w, e.seat.actor);
    }
  }
}

/** A class's raw mean as its score, whole numbers. */
export const rankScore = (raw: number): number => Math.round(Math.max(0, Math.min(1000, raw)));
