/**
 * @file A Round: three classes dealt from the stream `deal` (same seed, same deal) - Still Ring, then Heron, Hoop or Step, then
 * Still Pond - each in its short form on the pavilion's mats. Used by Group Class on the island (CPU guests Gerald, Bex and
 * Nan fill empty seats) and by the hub's ghost session (`game:round`, only the local seat). Score is the sum, 0-3000. Sim-side.
 * @example
 * CLASS_OF[0]; // 'ring'
 */
import { STATIONS, groundAt } from './data/world';
import { placeCast, placeGuest } from './cast';
import { seatedOf, startActivity } from './events/runner';
import type { W } from './events/types';

export const MIDDLE = ['poseH', 'hoop', 'step'] as const;
export const CLASS_OF = ['ring', 'middle', 'pond'] as const;
const CPU = [
  { who: 'gerald', bot: 'human' },
  { who: 'bex', bot: 'perfect' },
  { who: 'nan', bot: 'human' },
];
export const matOf = (i: number): [number, number, number] => [
  STATIONS.pavilion.at[0] - 4.5 + i * 3,
  STATIONS.pavilion.y,
  STATIONS.pavilion.at[1],
];
const roundOf = (w: W) => w.query('round')[0]?.round;
export const classId = (w: W): string => {
  const r = roundOf(w);
  if (!r) return '';
  return r.cls === 1 ? MIDDLE[r.deal] : CLASS_OF[r.cls];
};
/** Starts a round: seats take the mats, empty seats go to CPU guests when `cpu`. */
export function startRound(w: W, players = 1, cpu = true): void {
  const r = roundOf(w);
  if (!r) return;
  r.on = 1;
  r.cls = 0;
  r.deal = w.rng('deal').int(0, 2);
  r.total = [0, 0, 0, 0];
  r.seats = 4;
  r.cpu = cpu ? 1 : 0;
  const flow = w.query('flow')[0].flow;
  flow.ender = 'round';
  for (const e of seatedOf(w)) {
    const who = e.cast.who;
    const gi = who === 'guest' ? 0 : CPU.findIndex((c) => c.who === who) + 1;
    e.cast.seatNo = -1;
    if (who === 'guest') {
      e.cast.seatNo = 0;
      e.cast.mat = [...matOf(0)];
      placeGuest(w, matOf(0), 0);
    } else if (gi > 0 && cpu && gi >= players) {
      e.cast.seatNo = gi;
      e.cast.bot = CPU[gi - 1].bot;
      e.cast.mat = [...matOf(gi)];
      placeCast(w, who, matOf(gi)[0], matOf(gi)[2], 0);
    }
  }
  startActivity(w, classId(w), true);
}
/** Called each step by the runner when every seat has finished a class: adds up, deals the next or ends. */
export function advanceRound(w: W): void {
  const r = roundOf(w);
  const flow = w.query('flow')[0].flow;
  if (!r || !r.on) return;
  const seats = seatedOf(w)
    .filter((e) => e.cast.seatNo >= 0)
    .sort((a, b) => a.cast.seatNo - b.cast.seatNo);
  const total = [...r.total];
  for (const e of seats) total[e.cast.seatNo] += e.act.score;
  r.total = total;
  w.emit('classDone', { cls: r.cls, total });
  if (r.cls < 2) {
    r.cls += 1;
    startActivity(w, classId(w), true);
  } else {
    r.on = 0;
    flow.mode = 'results';
    flow.ender = '';
    flow.score = Math.round(total[0] / 3);
    w.emit('roundDone', { total });
    for (const e of seats) e.cast.seatNo = -1;
  }
}
export const roundOn = (w: W): boolean => !!roundOf(w)?.on;
void groundAt;
