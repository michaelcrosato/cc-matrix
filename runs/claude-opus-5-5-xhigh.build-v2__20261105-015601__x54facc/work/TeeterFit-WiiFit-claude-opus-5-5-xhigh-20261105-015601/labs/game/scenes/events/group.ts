/**
 * @file A Round (PLAN.md section 9): three classes in their short forms, on the mats, each seat scored, the sum 0 to 3000.
 * Same module for Group Class on the island and for the hub's ghost rounds. Each inner class is an ordinary activity
 * run with a context of its own, whose state nests here as plain data.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'group', { seats });
 */
import type { ActivityData } from '../components';
import type { Player } from '../bot/players';
import { MIDDLE_CLASSES, PODIUM_SECONDS } from '../data/round';
import { MAT_OFFSETS, PLUMB_AT, STATIONS } from '../data/stations';
import { after, castOf, clearSpawned, enter, say, standSeats } from './kit';
import type { Activity, Ctx, SeatEntity } from './types';

/** The round's state. */
interface GroupData {
  classes: string[];
  index: number;
  inner: ActivityData;
  totals: number[];
  perClass: number[][];
  win: number;
}

/** The inner activities: set from the table at load, to break the import cycle. */
let table: Record<string, Activity> = {};

/** Gives this module the activity table. */
export function setGroupTable(all: Record<string, Activity>): void {
  table = all;
}

/** A fresh inner activity's state. */
const innerOf = (id: string): ActivityData => ({ id, short: true, phase: '', t: 0, pt: 0, done: false, score: 0, scores: [], data: {}, hud: {}, spawned: [], actors: [] }); // prettier-ignore

/** The context an inner class runs in: on the mats, at the pavilion. */
function innerCtx(c: Ctx, inner: ActivityData): Ctx {
  return { ...c, a: inner, hud: inner.hud, station: STATIONS.pavilion, round: true };
}

/** Starts the class at `d.index`. */
function beginClass(c: Ctx, d: GroupData): void {
  d.inner = innerOf(d.classes[d.index]);
  for (const e of c.seats) Object.assign(e.wobble, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, topples: 0, instMul: 1, swayMul: 1, usesBreath: true, sync: 0, calm: 0, lungs: 0, bt: 0 }); // prettier-ignore
  standSeats(c, MAT_OFFSETS, Math.PI);
  table[d.inner.id].setup(innerCtx(c, d.inner));
  c.w.emit('classStart', { index: d.index, id: d.inner.id });
}

/** Group Class. */
export const group: Activity = {
  id: 'group',
  title: 'Group Class',
  station: 'pavilion',
  map: 'actionMap:balance',
  shot: 'class',
  wobble: true,
  seats: 4,
  setup(c) {
    const middle = MIDDLE_CLASSES[c.w.rng('deal').int(0, MIDDLE_CLASSES.length - 1)];
    const d: GroupData = { classes: ['ring', middle, 'pond'], index: 0, inner: innerOf('ring'), totals: [0, 0, 0, 0], perClass: [[], [], [], []], win: -1 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    // Plumb teaches from the side, where Pose Class has them, so the whole class is in view.
    const plumb = castOf(c.w, 'plumb');
    if (plumb) {
      const [px, pz] = [c.station.x + PLUMB_AT[0], c.station.z + PLUMB_AT[1]];
      Object.assign(plumb.cast, { hold: true, x: px, y: c.ground(px, pz) + 0.15, z: pz, yaw: 1.35 });
    }
    say(c, 'plumb', 'group.start');
    enter(c, 'class');
    beginClass(c, d);
  },
  step(c) {
    const d = c.a.data as unknown as GroupData;
    if (c.a.phase === 'class') {
      const mod = table[d.inner.id];
      d.inner.t += 1;
      d.inner.pt += 1;
      const ic = innerCtx(c, d.inner);
      mod.step(ic);
      if (d.inner.done) {
        for (const e of c.seats) {
          const score = Math.round(Math.max(0, Math.min(1000, mod.score(ic, e.seat.index))));
          d.totals[e.seat.index] += score;
          d.perClass[e.seat.index].push(score);
        }
        c.w.emit('classEnd', { index: d.index, id: d.inner.id, scores: d.totals });
        mod.teardown?.(ic);
        clearSpawned(ic);
        d.index += 1;
        if (d.index >= d.classes.length) {
          let best = 0;
          for (const e of c.seats) if (d.totals[e.seat.index] > d.totals[best]) best = e.seat.index;
          d.win = best;
          enter(c, 'podium');
          say(c, 'plumb', 'group.podium');
          c.w.emit('podium', { win: d.win, totals: d.totals });
        } else beginClass(c, d);
      }
    } else if (after(c, PODIUM_SECONDS)) c.a.done = true;
    else {
      const winner = c.seats.find((e) => e.seat.index === d.win);
      for (const e of c.seats) {
        const cast = c.w.get(e.seat.actor)?.cast;
        if (cast) cast.pose = e === winner ? '~Cheering_Two_Hands' : '';
      }
    }
  },
  bot(c, e: SeatEntity, player: Player) {
    const d = c.a.data as unknown as GroupData;
    if (c.a.phase !== 'class') return;
    table[d.inner.id].bot(innerCtx(c, d.inner), e, player);
  },
  score(c, index) {
    const d = c.a.data as unknown as GroupData;
    return (d.totals[index] ?? 0) / 3;
  },
};
