/**
 * @file Reps Hall (PLAN.md section 6): the signature "thumb is the exercise" activity. A band moves at the tempo; stick
 * depth moves your marker and scrubs the body. Stay within 0.2 of the band to bank the rep. Gerald does two for each of
 * yours. Near the finish the counter cheats.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'reps');
 */
import { holdAt, type Player } from '../bot/players';
import { ANNEX_OFFSETS } from '../data/stations';
import { bothFeet } from '../wobble';
import { after, castOf, enter, say, standSeats, steps } from './kit';
import type { Activity, Ctx } from './types';

/** The exercises: adding a row adds one. */
const EXERCISES = [
  { id: 'knees', name: 'Deep Knees', count: 10, clip: 'DeepKnee', axis: 'y', feet: false },
  { id: 'pushups', name: 'Polite Push-Ups', count: 8, clip: 'PushUp', axis: 'y', feet: true },
  { id: 'lunges', name: 'Side Lunges', count: 10, clip: 'LungeR', axis: 'x', feet: false },
] as const;

/** Full depth, on the balance disc. */
const DEPTH = 0.68;
/** How close the marker must be to the band. */
const NEAR = 0.24;
/** A rep banks at this share of its time in the band. */
const BANKS = 0.45;

/** The hall's state. */
interface RepsData {
  ex: number;
  rep: number;
  p: number;
  inside: number;
  total: number;
  accs: number[];
  side: number;
  band: number;
  marker: number;
}

/** The band at progress `p`: down and back up, easing at each end. */
const bandAt = (p: number): number => Math.pow(Math.sin(Math.PI * p), 2);

/** How fast the band goes on this rep: speeds up a little near the end of a set. */
function repSteps(c: Ctx, d: RepsData): number {
  const count = EXERCISES[d.ex].count;
  const speed = 1 + (0.18 * d.rep) / count;
  return Math.round((c.w.settings.get<number>('game.reps.tempo') * c.w.hz) / speed);
}

/** Reps Hall. */
export const reps: Activity = {
  id: 'reps',
  title: 'Reps Hall',
  station: 'annex',
  map: 'actionMap:balance',
  shot: 'reps',
  wobble: true,
  setup(c) {
    const d: RepsData = { ex: 0, rep: 0, p: 0, inside: 0, total: 0, accs: [], side: 1, band: 0, marker: 0 };
    c.a.data = d as unknown as Record<string, unknown>;
    standSeats(c, ANNEX_OFFSETS, Math.PI);
    const { x, z } = c.station;
    const gerald = castOf(c.w, 'gerald');
    if (gerald)
      Object.assign(gerald.cast, {
        hold: true,
        x: x + ANNEX_OFFSETS[1][0],
        y: c.ground(x, z) + 0.15,
        z: z + ANNEX_OFFSETS[1][1],
        yaw: Math.PI,
      });
    const plumb = castOf(c.w, 'plumb');
    if (plumb)
      Object.assign(plumb.cast, {
        hold: true,
        x: x + 3,
        y: c.ground(x, z) + 0.05,
        z: z - 2.5,
        yaw: 0,
        pose: 'Upright',
        poseT: 1,
      });
    c.hud.disc = true;
    c.hud.feet = true;
    c.hud.title = EXERCISES[0].name;
    enter(c, 'ready');
    say(c, 'plumb', 'reps.start');
  },
  step(c) {
    const d = c.a.data as unknown as RepsData;
    const [{ seat, wobble: wob }] = c.seats;
    const ex = EXERCISES[d.ex];
    const body = castOf(c.w, 'guest');
    const gerald = castOf(c.w, 'gerald');
    if (c.a.phase === 'ready') {
      c.hud.show = { exercise: ex.id, rep: 0, of: ex.count, band: 0, marker: 0, side: 1 };
      if (body) Object.assign(body.cast, { pose: ex.clip, poseT: 0, leanX: wob.x * 0.5, leanY: 0 });
      if (after(c, 2.5)) {
        say(c, 'plumb', `reps.${ex.id}`);
        enter(c, 'rep');
      }
      return;
    }
    if (c.a.phase === 'switch') {
      if (body) Object.assign(body.cast, { poseT: Math.max(0, body.cast.poseT - c.w.dt * 2) });
      if (after(c, 2)) enter(c, 'ready');
      return;
    }
    // A rep.
    const total = repSteps(c, d);
    d.p += 1 / total;
    d.band = bandAt(Math.min(1, d.p));
    wob.swayMul = 0.7 + 0.5 * (d.rep / ex.count);
    wob.usesBreath = false;
    const raw = ex.axis === 'y' ? -wob.y : wob.x * d.side;
    d.marker = Math.max(0, Math.min(1, raw / DEPTH));
    const feetOk = !ex.feet || bothFeet(seat);
    d.total += 1;
    if (Math.abs(d.marker - d.band) <= NEAR && feetOk) d.inside += 1;
    if (body) {
      const clip = ex.axis === 'x' ? (d.side > 0 ? 'LungeR' : 'LungeL') : ex.clip;
      const t = ex.feet ? (feetOk ? 0.4 + 0.6 * d.marker : 0.25) : d.marker;
      Object.assign(body.cast, { pose: clip, poseT: t, leanX: ex.axis === 'x' ? 0 : wob.x * 0.4, leanY: 0 });
    }
    if (gerald)
      Object.assign(gerald.cast, {
        pose: ex.axis === 'x' ? (d.side > 0 ? 'LungeL' : 'LungeR') : ex.clip,
        poseT: (ex.feet ? 0.4 + 0.6 : 1) * bandAt((d.p * 2) % 1),
      });
    if (d.p >= 1) {
      const acc = d.total > 0 ? d.inside / d.total : 0;
      d.accs.push(acc);
      if (acc >= BANKS) d.rep += 1;
      else d.rep += 0;
      c.w.emit('rep', { banked: acc >= BANKS, rep: d.rep, acc });
      d.p = 0;
      d.inside = d.total = 0;
      if (ex.axis === 'x') d.side = -d.side;
      if (d.rep === ex.count - 2 && acc >= BANKS) say(c, 'plumb', 'reps.lying');
      if (d.rep >= ex.count || c.a.pt > steps(c, ex.count * 5)) {
        d.ex += 1;
        d.rep = 0;
        if (d.ex >= EXERCISES.length) c.a.done = true;
        else {
          enter(c, 'switch');
          c.hud.title = EXERCISES[d.ex].name;
        }
      }
    }
    // The counter cheats near the finish: "9 of 10" becomes "10 of 11".
    const cheat = d.rep >= ex.count - 1 ? 1 : 0;
    c.hud.show = {
      exercise: ex.id,
      rep: d.rep + cheat,
      of: ex.count + cheat,
      band: d.band,
      marker: d.marker,
      side: d.side,
      feet: ex.feet,
      axis: ex.axis,
    };
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as RepsData;
    const { seat, wobble } = e;
    const ex = EXERCISES[Math.min(d.ex, EXERCISES.length - 1)];
    seat.act = false;
    seat.fl = seat.fr = ex.feet && player.acts && c.a.phase === 'rep' ? 1 : 0;
    if (c.a.phase !== 'rep') {
      holdAt(c.w, seat, wobble, 0, 0, player);
      return;
    }
    // People look ahead a little: a thumb follows the rhythm, not the moment.
    const total = Math.max(1, repSteps(c, d));
    const ahead = bandAt(Math.min(1, d.p + (player.delay + 8) / total));
    const goal = ahead * DEPTH;
    if (ex.axis === 'y') holdAt(c.w, seat, wobble, 0, -goal, player);
    else holdAt(c.w, seat, wobble, goal * d.side, 0, player);
  },
  score(c) {
    const d = c.a.data as unknown as RepsData;
    if (d.accs.length === 0) return 0;
    return (1000 * d.accs.reduce((a, b) => a + b, 0)) / d.accs.length;
  },
};
