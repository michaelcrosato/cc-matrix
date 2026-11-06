/**
 * @file Pose Class (PLAN.md section 6): Plumb demonstrates, a guide dot leads you into the pose and your progress
 * scrubs the strip, you hold with the breath while your off-seat lean tips the body over, and rest. Every seat plays;
 * in a class the others are CPU guests. `makePoseClass` builds one activity per class in the table.
 *
 * Game code, sim-side.
 *
 * @example
 * // ACTIVITIES.poseA = makePoseClass('poseA', 'Pose Class');
 */
import { breathe, holdAt, type Player } from '../bot/players';
import { CLASSES, POSES, type PoseDef } from '../data/poses';
import { MAT_OFFSETS, PLUMB_AT } from '../data/stations';
import { bothFeet, inRing, inTime } from '../wobble';
import {
  after,
  critterAway,
  critterGo,
  enter,
  leanSeats,
  say,
  standSeats,
  steps,
  castOf,
  pose as poseCast,
} from './kit';
import type { Activity, Ctx, SeatEntity } from './types';

/** Seconds of each phase. */
const DEMO = 4;
const ENTER_TIMEOUT = 10;
const ENTER_SPEED = 1 / 3.2;
const REST = 2.2;
const NEAR = 0.18;

/** One seat's running numbers for a pose. */
interface Tally {
  inside: number;
  total: number;
  sync: number;
  topples: number;
  progress: number;
}

/** The class's state. */
interface PoseData {
  list: string[];
  index: number;
  tally: Tally[];
  scores: number[][];
  part: number;
  hold: number;
}

const fresh = (): Tally => ({ inside: 0, total: 0, sync: 0, topples: 0, progress: 0 });

/** The guide dot along its curve at `u`, from the centre to the seat. */
export function guideDot(def: PoseDef, u: number): [number, number] {
  const [sx, sy] = def.seat;
  const bow = Math.sin(Math.PI * u);
  const size = Math.hypot(sx, sy);
  if (size < 0.01) return [0.28 * bow * Math.sin(2 * Math.PI * u + 0.6), 0.28 * bow * Math.cos(2 * Math.PI * u)];
  return [sx * u - sy * 0.35 * bow, sy * u + sx * 0.35 * bow];
}

/** The pose's score for one tally. */
function poseScore(def: PoseDef, t: Tally): number {
  if (t.total === 0) return 0;
  const weight = def.breath ?? 0.3;
  const inside = t.inside / t.total;
  const sync = t.sync / t.total;
  return 1000 * ((1 - weight) * inside + weight * sync) - 60 * t.topples;
}

/** Whether the pose's feet rule holds for a seat. */
function feetOk(def: PoseDef, e: SeatEntity): boolean {
  if (def.needs === 'both') return bothFeet(e.seat);
  if (def.needs === 'L') return e.seat.fl >= 0.5;
  if (def.needs === 'R') return e.seat.fr >= 0.5;
  return true;
}

/** Sets the bodies up for the pose at `index`. */
function beginPose(c: Ctx, d: PoseData): void {
  const def = POSES[d.list[d.index]];
  d.tally = [fresh(), fresh(), fresh(), fresh()];
  d.part = 0;
  for (const e of c.seats) {
    e.wobble.instMul = def.inst ?? 1;
    e.wobble.swayMul = def.sway ?? 1;
    e.wobble.usesBreath = def.needs !== 'both';
    e.wobble.topples = 0;
  }
  c.hud.show = { pose: def.id, name: def.name, needs: def.needs ?? '' };
  c.hud.title = def.name;
  enter(c, 'demo');
  poseCast(c.w, 'plumb', def.clip, 0);
  say(c, 'plumb', `pose.demo.${def.id}`);
}

/** The ring radius for a pose. */
function ringOf(c: Ctx, def: PoseDef): number {
  const expert = c.w.settings.get<boolean>('game.expert') ? 0.75 : 1;
  return (def.ring ?? c.w.settings.get<number>('game.pose.ring')) * expert;
}

/** Hold seconds for this class's form. */
function holdSeconds(c: Ctx, def: PoseDef): number {
  if (c.a.short) return 34;
  if (def.seat2) return 16;
  return c.w.settings.get<number>('game.pose.hold');
}

/** One step of the entering phase. */
function stepEnter(c: Ctx, d: PoseData, def: PoseDef): void {
  let allIn = true;
  for (const e of c.seats) {
    const t = d.tally[e.seat.index];
    const [gx, gy] = guideDot(def, t.progress);
    if (Math.hypot(e.wobble.x - gx, e.wobble.y - gy) <= NEAR)
      t.progress = Math.min(1, t.progress + ENTER_SPEED * c.w.dt);
    if (t.progress < 1) allIn = false;
    const cast = c.w.get(e.seat.actor)?.cast;
    if (cast) Object.assign(cast, { pose: def.clip, poseT: def.lungs ? t.progress * 0.5 : t.progress });
  }
  const first = d.tally[c.seats[0].seat.index];
  c.hud.ring = [...guideDot(def, first.progress), NEAR] as [number, number, number];
  c.hud.meter = first.progress;
  c.hud.meterLabel = 'Into the pose';
  const timedOut = after(c, ENTER_TIMEOUT);
  if (allIn || timedOut) {
    if (timedOut && !allIn) say(c, 'plumb', 'pose.start');
    else say(c, 'plumb', 'pose.hold');
    for (const e of c.seats) d.tally[e.seat.index].progress = 1;
    d.hold = steps(c, holdSeconds(c, def));
    enter(c, 'hold');
  }
}

/** One step of the holding phase. */
function stepHold(c: Ctx, d: PoseData, def: PoseDef): void {
  const seatOf = (): readonly [number, number] => (d.part === 1 && def.seat2 ? def.seat2 : def.seat);
  const half = def.seat2 ? Math.round(d.hold / 2) : -1;
  if (d.part === 0 && c.a.pt === half) {
    d.part = 1;
    say(c, 'plumb', 'pose.other');
  }
  const [sx, sy] = seatOf();
  const ring = ringOf(c, def);
  const clip = d.part === 1 && def.clip2 ? def.clip2 : def.clip;
  const u = c.a.pt / d.hold;
  for (const e of c.seats) {
    const t = d.tally[e.seat.index];
    t.total += 1;
    if (def.climbs) e.wobble.swayMul = 1 + 0.9 * u;
    if (inRing(e.wobble, sx, sy, ring) && feetOk(def, e)) t.inside += 1;
    if (e.wobble.usesBreath && inTime(c.w, e.seat, e.wobble)) t.sync += 1;
    t.topples = e.wobble.topples;
    const cast = c.w.get(e.seat.actor)?.cast;
    if (cast) {
      cast.pose = clip;
      cast.poseT = def.lungs ? 0.5 + 0.5 * e.wobble.lungs : 1;
      cast.leanX = -(e.wobble.x - sx) * 1.6; // they face you: a mirror
      cast.leanY = (e.wobble.y - sy) * 1.6;
    }
  }
  if (def.gull && c.a.pt === Math.round(d.hold / 2)) {
    const guest = c.w.get(c.seats[0].seat.actor)?.cast;
    if (guest) critterGo(c, 'gull', guest.x, guest.y + 1, guest.z - 0.1);
    for (const e of c.seats) e.wobble.vy -= 0.25;
    say(c, 'tare', 'pose.gull');
  }
  c.hud.ring = [sx, sy, ring];
  c.hud.guide = !def.needs || def.needs !== 'both';
  c.hud.meter = 1 - u;
  c.hud.meterLabel = 'Hold';
  poseCast(c.w, 'plumb', clip, def.lungs ? 0.5 + 0.5 * c.seats[0].wobble.guide : 1);
  if (c.a.pt >= d.hold) {
    for (const e of c.seats) d.scores[e.seat.index].push(poseScore(def, d.tally[e.seat.index]));
    say(c, 'plumb', 'pose.rest');
    critterAway(c, 'gull');
    enter(c, 'rest');
  }
}

/** Builds one class's activity. */
export function makePoseClass(id: string, title: string): Activity {
  return {
    id,
    title,
    station: 'pavilion',
    map: 'actionMap:balance',
    shot: 'mat',
    wobble: true,
    seats: 4,
    setup(c) {
      const list = [...(CLASSES[id] ?? CLASSES.poseA)];
      const d: PoseData = { list, index: 0, tally: [], scores: [[], [], [], []], part: 0, hold: 1 };
      c.a.data = d as unknown as Record<string, unknown>;
      c.hud.disc = true;
      c.hud.feet = true;
      standSeats(c, MAT_OFFSETS, Math.PI);
      const plumb = castOf(c.w, 'plumb');
      if (plumb) {
        const [px, pz] = [c.station.x + PLUMB_AT[0], c.station.z + PLUMB_AT[1]];
        Object.assign(plumb.cast, { hold: true, x: px, y: c.ground(px, pz) + 0.15, z: pz, yaw: 1.35 });
      } // prettier-ignore
      beginPose(c, d);
    },
    step(c) {
      const d = c.a.data as unknown as PoseData;
      const def = POSES[d.list[d.index]];
      if (c.a.phase === 'demo') {
        poseCast(c.w, 'plumb', def.clip, Math.min(1, c.a.pt / steps(c, DEMO - 1)) * (def.lungs ? 0.5 : 1));
        c.hud.big = '';
        c.hud.prompt = 'skip';
        c.hud.ring = [0, 0, 0.2];
        for (const e of c.seats) {
          const cast = c.w.get(e.seat.actor)?.cast;
          if (cast) Object.assign(cast, { pose: def.clip, poseT: 0, leanX: -e.wobble.x, leanY: e.wobble.y });
        }
        if (after(c, DEMO) || c.seats[0].seat.actP) {
          c.hud.prompt = '';
          say(c, 'plumb', 'pose.now');
          enter(c, 'enter');
        }
      } else if (c.a.phase === 'enter') stepEnter(c, d, def);
      else if (c.a.phase === 'hold') stepHold(c, d, def);
      else if (after(c, REST)) {
        for (const e of c.seats) {
          const cast = c.w.get(e.seat.actor)?.cast;
          if (cast) Object.assign(cast, { pose: '', poseT: 0, leanX: 0, leanY: 0 });
        }
        d.index += 1;
        if (d.index >= d.list.length) c.a.done = true;
        else beginPose(c, d);
      } else {
        for (const e of c.seats) {
          const cast = c.w.get(e.seat.actor)?.cast;
          if (cast) cast.poseT = Math.max(0, cast.poseT - c.w.dt / REST);
        }
        leanSeats(c, 0.3);
      }
    },
    teardown(c) {
      critterAway(c, 'gull');
    },
    bot(c, e, player: Player) {
      const d = c.a.data as unknown as PoseData;
      const def = POSES[d.list[d.index]];
      const { seat, wobble } = e;
      if (c.a.phase === 'demo') {
        holdAt(c.w, seat, wobble, 0, 0, player);
        seat.act = player.acts && c.a.pt > 30 && seat.index === 0;
        seat.fl = seat.fr = 0;
      } else if (c.a.phase === 'enter') {
        const t = d.tally[seat.index];
        const [gx, gy] = guideDot(def, Math.min(1, t.progress + 0.03));
        holdAt(c.w, seat, wobble, gx, gy, player);
        seat.fl = seat.fr = 0;
        seat.act = false;
      } else {
        const [sx, sy] = d.part === 1 && def.seat2 ? def.seat2 : def.seat;
        holdAt(c.w, seat, wobble, sx, sy, player);
        breathe(c.w, seat, wobble, player);
        if (player.acts && def.needs === 'both') seat.fl = seat.fr = 1;
        if (player.acts && def.needs === 'L') seat.fl = 1;
        if (player.acts && def.needs === 'R') seat.fr = 1;
        seat.act = false;
      }
    },
    score(c, index) {
      const d = c.a.data as unknown as PoseData;
      const list = d.scores[index] ?? [];
      return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    },
  };
}
