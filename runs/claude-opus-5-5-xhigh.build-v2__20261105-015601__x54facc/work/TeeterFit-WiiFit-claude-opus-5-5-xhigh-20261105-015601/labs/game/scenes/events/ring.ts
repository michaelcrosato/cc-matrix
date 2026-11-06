/**
 * @file Still Ring, the first class of every Round: stay inside a ring that slowly narrows. All seats play at once.
 * Only rounds use it on its own; the Morning Check has its own version.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'ring', { short: true, seats });
 */
import { holdAt } from '../bot/players';
import { inRing } from '../wobble';
import { enter, leanSeats, say, steps } from './kit';
import type { Activity, Ctx } from './types';

/** Per-seat state. */
interface RingData {
  inside: number[];
  total: number;
}

/** Lead-in and play seconds. */
const LEAD = 6;
const PLAY = 45;

/** The ring's radius after `u` of the class. */
const ringAt = (u: number): number => 0.3 - 0.14 * u;

/** Still Ring. */
export const ring: Activity = {
  id: 'ring',
  title: 'Still Ring',
  station: 'pavilion',
  map: 'actionMap:balance',
  shot: 'mat',
  wobble: true,
  setup(c) {
    c.a.data = { inside: [0, 0, 0, 0], total: 0 } satisfies RingData as unknown as Record<string, unknown>;
    enter(c, 'lead');
    c.hud.title = 'Still Ring';
    say(c, 'plumb', 'ring.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as RingData;
    leanSeats(c);
    if (c.a.phase === 'lead') {
      c.hud.big = String(Math.max(1, LEAD - Math.floor(c.a.pt / c.w.hz)));
      c.hud.disc = true;
      c.hud.ring = [0, 0, ringAt(0)];
      for (const e of c.seats) [e.wobble.x, e.wobble.y, e.wobble.vx, e.wobble.vy] = [0, 0, 0, 0];
      if (c.a.pt >= steps(c, LEAD)) {
        enter(c, 'play');
        c.hud.big = '';
      }
      return;
    }
    const u = c.a.pt / steps(c, PLAY);
    const r = ringAt(u);
    c.hud.ring = [0, 0, r];
    c.hud.meter = 1 - u;
    d.total += 1;
    for (const e of c.seats) if (inRing(e.wobble, 0, 0, r)) d.inside[e.seat.index] += 1;
    if (u >= 1) c.a.done = true;
  },
  bot(_c, e, player) {
    holdAt(_c.w, e.seat, e.wobble, 0, 0, player);
  },
  score(c, index) {
    const d = c.a.data as unknown as RingData;
    return d.total > 0 ? (1000 * d.inside[index]) / d.total : 0;
  },
};
