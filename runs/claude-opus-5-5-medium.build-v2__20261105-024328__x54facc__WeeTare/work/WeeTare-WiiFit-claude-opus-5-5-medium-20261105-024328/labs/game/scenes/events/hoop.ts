/**
 * @file Hoop Patrol (PLAN.md section 6). Spin your stick in circles: an angular speed in the band keeps every hoop up;
 * outside it they sink and fall. A new hoop comes every 8 s from a telegraphed side: lean that way in time to catch it.
 * The hip-circle strip scrubs with the stick's angle, so the hips follow your thumb, with increasing dignity. Keyboard:
 * alternate feet at 2.5 Hz or more counts as spinning.
 */
import { angDiff } from '../../../../engine/sim-api';
import type { Order, Skill } from '../bot/players';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble } from '../wobble';
import { arrangeClass, rankScore } from './mats';
import {
  bodyPose,
  clamp,
  footDown,
  groundAt,
  leadIn,
  moveProp,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  type Activity,
} from './kit';

const EVERY = 480;
const WARN = 90;
const CATCH = 36;
const MAX = 8;
const LENGTH = 3600;
const SHORT_LENGTH = 2700;

interface HoopData {
  length: number;
  props: number[];
}
const dataOf = (ev: EvState): HoopData => ev.d as unknown as HoopData;

/** The best hoop-seconds a run of `steps` could hold. */
function bestHoopSeconds(steps: number): number {
  let sum = 0;
  for (let t = 0; t < steps; t++) sum += Math.min(MAX, 1 + Math.floor(t / EVERY));
  return sum / 60;
}

/** Runs one seat. */
function seatStep(w: W, ev: EvState, e: SeatE): void {
  const s = ev.s[e.seat.index];
  const { input } = e.seat;
  const sx = input.x + e.wobble.mx;
  const sy = input.y + e.wobble.my;
  const mag = Math.hypot(sx, sy);
  const dt = 1 / 60;
  if (mag > 0.5) {
    const angle = Math.atan2(sy, sx);
    s.spin += (Math.abs(angDiff(s.angle, angle)) / dt - s.spin) * 0.05;
    s.angle = angle;
  } else s.spin *= 0.97;
  if (footDown(e, 'l') || footDown(e, 'r')) {
    const left = footDown(e, 'l');
    if (left !== !!s.lastLeft) {
      const gap = ev.t - s.lastFoot;
      s.footRate = gap > 0 ? 60 / gap : 0;
      s.lastFoot = ev.t;
      s.lastLeft = left ? 1 : 0;
    }
  }
  if (ev.t - s.lastFoot > 40) s.footRate = 0;
  const min = gameNumber(w, 'game.hoop.bandMin');
  const max = gameNumber(w, 'game.hoop.bandMax');
  const feetSpin = s.footRate >= 2.5;
  const inBand = (s.spin >= min && s.spin <= max) || feetSpin;
  if (feetSpin) s.angle += 7 * dt;
  s.good = inBand ? 1 : 0;
  s.height += (inBand ? 0.6 : -0.35) * dt;
  s.height = Math.min(1, s.height);
  if (s.height <= 0) {
    if (s.hoops > 0) {
      s.hoops -= 1;
      s.dropped += 1;
      cue(w, 'hoopDrop');
      if (s.hoops === 0 && e.seat.index === ev.seats[0]) say(w, 'hoop.drop', 'tare');
    }
    s.height = s.hoops > 0 ? 0.5 : 0;
  }
  // a new hoop, telegraphed
  if (s.warn > 0) {
    s.warn -= 1;
    if (s.warn === 0) {
      s.window = CATCH;
      cue(w, 'hoopWhoosh');
    }
  } else if (s.window > 0) {
    s.window -= 1;
    const lean = s.side * sx;
    if (lean > 0.5 || (feetSpin && (s.side < 0 ? input.l : input.r) >= 0.5)) {
      s.hoops = Math.min(MAX, s.hoops + 1);
      s.height = Math.max(s.height, 0.5);
      s.window = 0;
      s.caught += 1;
      cue(w, 'hoopCatch', { n: s.hoops });
    }
  } else if (ev.t > 0 && ev.t % EVERY === EVERY - WARN) {
    s.side = w.rng('hoop').chance(0.5) ? 1 : -1;
    s.warn = WARN;
    if (e.seat.index === ev.seats[0]) cue(w, 'hoopWarn', { side: s.side });
  }
  s.sum += s.hoops / 60;
  e.seat.score = (1000 * s.sum) / bestHoopSeconds(dataOf(ev).length);
  e.seat.pose = 'hoop';
  const turn = (((s.angle / (Math.PI * 2)) % 1) + 1) % 1;
  bodyPose(w, e, 'RETREAT/HipCircle', turn, false, 0);
}

function step(w: W, ev: EvState): void {
  if (leadIn(w, ev)) return;
  const d = dataOf(ev);
  for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') seatStep(w, ev, e);
  // the first seat's hoops, drawn round its hips
  const [first] = playing(w, ev);
  const s = ev.s[first.seat.index];
  const actor = (w.get(first.seat.actor) as unknown as { actor: { x: number; y: number; z: number } }).actor;
  d.props.forEach((id, k) => {
    const up = k < s.hoops;
    const wobble = Math.sin(w.tick * 0.2 + k) * 0.03 * Math.max(0, 1 - s.good);
    const y = up ? actor.y + 0.35 + k * 0.1 + s.height * 0.12 + wobble : -30;
    moveProp(
      w,
      id,
      [actor.x + Math.cos(s.angle + k) * 0.05, y, actor.z + Math.sin(s.angle + k) * 0.05],
      [Math.sin(s.spin * 0.004) * 0.1, 0, 0, 1],
    );
  });
  if (ev.t >= d.length) {
    ev.score = rankScore((1000 * s.sum) / bestHoopSeconds(d.length));
    ev.done = true;
  }
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  if (ev.phase === 'lead') return {};
  const s = ev.s[e.seat.index];
  const omega = skill.name === 'sloppy' ? 6.4 : 7;
  e.seat.bot.a = (e.seat.bot.a ?? 0) + omega / 60 + (skill.jitter ? w.rng('bot').range(-0.02, 0.02) : 0);
  const a = e.seat.bot.a;
  if (s.window > 0 && skill.name === 'sloppy' && w.rng('bot').chance(0.4))
    return { stick: [Math.cos(a) * 0.2, Math.sin(a) * 0.2] };
  return { stick: [Math.cos(a), Math.sin(a)], raw: true };
}

function hoopActivity(id: string, short: boolean): Activity {
  return {
    id, title: 'Hoop Patrol', station: short ? 'pavilion' : 'hoopBeach', shot: short ? 'mat' : 'hoop', map: 'balance', song: 'song:hoop', multi: short,
    setup(w, ev) {
      for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') { resetWobble(e.wobble); e.wobble.off = true; }
      ev.seats.forEach((i) => (ev.s[i] = { angle: 0, spin: 0, hoops: 1, height: 0.8, warn: 0, window: 0, side: 1, sum: 0, good: 0, caught: 0, dropped: 0, lastFoot: -100, footRate: 0, lastLeft: 0 }));
      const props: number[] = [];
      for (let k = 0; k < MAX; k++) props.push(ownProp(w, ev, 'prop:hoop', [0, -30, 0]));
      Object.assign(ev.d, { length: short ? SHORT_LENGTH : LENGTH, props });
      if (short) {
        arrangeClass(w, ev);
        return phase(ev, 'lead');
      }
      const c = stationAt(w, 'hoopBeach');
      const [e] = playing(w, ev);
      void groundAt;
      standAt(w, e.seat.actor, c.x, c.z, Math.PI);
      say(w, 'hoop.intro', 'tare');
      phase(ev, 'go');
    },
    step, bot,
  }; // prettier-ignore
}

export const HOOP = hoopActivity('hoop', false);
export const HOOP_SHORT = hoopActivity('hoopS', true);
void clamp;
