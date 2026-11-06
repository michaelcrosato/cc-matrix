/**
 * @file The days' turning: sleeping ends one day and starts the next; plaques creep, the tilt rises, the evening's
 * event carries what the page shows.
 *
 * Game code, sim-side.
 *
 * @example
 * // sleepNow(w);
 */
import { placeActor } from '../../../engine/sim-api';
import type { GameWorld } from './components';
import { STORY_TILT } from './data/days';
import { STATIONS } from './data/stations';
import { castOf } from './events/kit';
import { flowOf, groundAt, islandOf } from './flow';
import { homeOf } from './world';

/** Ends the day: next morning, at the plaza, the plaques a little further downhill. */
export function sleepNow(w: GameWorld): void {
  const flow = flowOf(w);
  const finished = flow.day;
  flow.day += 1;
  flow.done = [];
  w.emit('evening', { day: finished });
  applyDay(w);
}

/** Puts the world where this day has it: the tilt, the plaques, who stands where, the Guest at the plaza. */
export function applyDay(w: GameWorld): void {
  const flow = flowOf(w);
  const island = islandOf(w);
  island.tilt = STORY_TILT.start + STORY_TILT.perDay * (Math.min(flow.day, 5) - 1);
  island.sky = 'day';
  island.storm = 0;
  for (const e of w.query('plaque')) {
    const r = Math.hypot(e.plaque.x, e.plaque.z) || 1;
    const creep = 0.45 * (flow.day - 1);
    const base = e.plaque.index;
    w.emit('plaqueMoved', { plaque: base, creep });
    const prop = w.get(e.plaque.prop);
    if (prop?.sceneProp) {
      const [nx, nz] = [e.plaque.x + (e.plaque.x / r) * creep, e.plaque.z + (e.plaque.z / r) * creep];
      prop.sceneProp.x = nx;
      prop.sceneProp.z = nz;
      prop.sceneProp.y = groundAt(w, nx, nz);
    }
  }
  const guest = castOf(w, 'guest');
  const { x, z } = STATIONS.plaza;
  if (guest) {
    guest.cast.hold = false;
    placeActor(w, guest.id, [x, groundAt(w, x, z + 6), z + 6], Math.PI);
  }
  for (const who of ['gerald', 'bex', 'nan', 'plumb', 'tare']) {
    const c = castOf(w, who);
    if (!c) continue;
    const [hx, hz] = homeOf(who, flow.day);
    c.cast.home = [hx, hz];
    c.cast.hold = false;
    placeActor(w, c.id, [hx, groundAt(w, hx, hz), hz], Math.PI);
  }
}
