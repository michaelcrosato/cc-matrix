/**
 * @file Reps Hall (PLAN.md section 6): the signature "your thumb is the exercise". A band moves up and down a gauge at the
 * tempo; your marker is your stick's depth, and it scrubs the body. Stay near the band and the rep is banked. Gerald, beside
 * you, does two for each of yours. Near the end the counter cheats: "9 of 10" becomes "10 of 11".
 */
import { setLoop, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble } from '../wobble';
import { castOf } from '../cast-ref';
import { rankScore } from './mats';
import {
  balanceAll,
  bodyPose,
  clamp,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  groundAt,
  type Activity,
} from './kit';

/** Three exercises. `clip` scrubs; `axis` reads the stick; `count` is the reps. */
export const EXERCISES = [
  { id: 'knees', clip: 'RETREAT/DeepKnee', axis: 'y', sign: -1, count: 10, hold: false },
  { id: 'pushups', clip: 'RETREATLIB/Pushup', axis: 'y', sign: -1, count: 8, hold: true },
  { id: 'lunges', clip: 'RETREAT/SideLunge', axis: 'x', sign: 0, count: 10, hold: false },
] as const;

const DEPTH = 0.62;
const WINDOW = 0.2;
const INTRO = 150;

interface RepsData {
  ex: number;
  rep: number;
  phaseT: number;
  band: number;
  marker: number;
  fake: number;
  sum: number;
  reps: number;
  inside: number;
  steps: number;
  total: number;
  banked: number;
}

const dataOf = (ev: EvState): RepsData => ev.d as unknown as RepsData;

/** Steps a rep takes now: the band quickens near the end of each exercise. */
function repSteps(w: W, d: RepsData): number {
  const ex = EXERCISES[d.ex];
  const late = d.rep >= ex.count - 3 ? 0.85 : 1;
  return Math.round(gameNumber(w, 'game.reps.tempo') * 60 * late);
}

/** The band at `k` of a rep: out and back. */
export const bandAt = (k: number): number => (k < 0.5 ? k * 2 : 2 - k * 2);

/** Which way a rep goes, on the stick. */
function signOf(d: RepsData): number {
  const ex = EXERCISES[d.ex];
  return ex.axis === 'x' ? (d.rep % 2 === 0 ? 1 : -1) : ex.sign;
}

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  const { gerald } = castOf(w);
  balanceAll(w, ev);
  if (ev.phase === 'intro') {
    bodyPose(w, e, EXERCISES[d.ex].clip, 0, false, 0.4);
    if (ev.t === 0) say(w, `reps.${EXERCISES[d.ex].id}`, 'plumb');
    if (ev.t >= INTRO) {
      d.phaseT = 0;
      phase(ev, 'rep');
    }
    return;
  }
  const ex = EXERCISES[d.ex];
  const steps = repSteps(w, d);
  const k = d.phaseT / steps;
  d.band = bandAt(k);
  const sign = signOf(d);
  const value = ex.axis === 'x' ? e.wobble.x : e.wobble.y;
  d.marker = clamp((value * sign) / DEPTH, 0, 1.2);
  e.wobble.sway = 0.4 + (d.total / 28) * 0.3;
  const heldOk = !ex.hold || (e.seat.input.l >= 0.5 && e.seat.input.r >= 0.5);
  const off = ex.axis === 'x' ? e.wobble.y : e.wobble.x;
  d.steps += 1;
  if (Math.abs(d.marker - d.band) <= WINDOW && heldOk && Math.abs(off) < 0.45) d.inside += 1;
  const clipT = ex.clip === 'RETREATLIB/Pushup' ? 0.77 * (1 - clamp(d.marker, 0, 1)) + 0.0 : clamp(d.marker, 0, 1);
  bodyPose(w, e, ex.clip, clipT, ex.axis === 'x' && sign < 0, 0.3);
  if (gerald >= 0)
    setLoop(
      w,
      gerald,
      ex.axis === 'y' && ex.id === 'pushups' ? 'RETREATLIB/Pushup' : 'RETREATLIB/Jumping_Jacks_Loop',
      2,
    );
  d.phaseT += 1;
  if (d.phaseT >= steps) {
    d.phaseT = 0;
    const accuracy = d.inside / Math.max(1, d.steps);
    d.sum += accuracy;
    d.reps += 1;
    d.rep += 1;
    d.total += 1;
    [d.inside, d.steps] = [0, 0];
    if (accuracy >= 0.5) d.banked += 1;
    cue(w, accuracy >= 0.5 ? 'repGood' : 'repMiss');
    w.emit('rep', { n: d.rep, of: ex.count, ok: accuracy >= 0.5 } as never);
    if (d.rep === ex.count - 1) {
      d.fake = 1;
      say(w, 'reps.cheat', 'plumb');
    }
    if (d.rep >= ex.count) {
      d.ex += 1;
      d.rep = 0;
      d.fake = 0;
      if (d.ex >= EXERCISES.length) {
        ev.score = rankScore((1000 * d.sum) / Math.max(1, d.reps));
        ev.done = true;
        return;
      }
      cue(w, 'bell');
      phase(ev, 'intro');
    }
  }
}

function bot(w: W, ev: EvState, _e: SeatE, skill: Skill): Order {
  const d = dataOf(ev);
  if (ev.phase !== 'rep') return { aim: [0, 0] };
  const ex = EXERCISES[d.ex];
  const lead = skill.delay === 0 ? 14 : 24;
  const k = (d.phaseT + lead) / repSteps(w, d);
  const want = bandAt(k > 1 ? k - 1 : k) * DEPTH * signOf(d);
  const feet = ex.hold ? 1 : 0;
  return { aim: ex.axis === 'x' ? [want, 0] : [0, want], l: feet, r: feet, trust: skill.delay === 0 ? 1 : 0.4 };
}

export const REPS: Activity = {
  id: 'reps', title: 'Reps Hall', station: 'annex', shot: 'reps', map: 'balance', song: 'song:lobby',
  setup(w, ev) {
    const c = stationAt(w, 'annex');
    const [e] = playing(w, ev);
    const { gerald } = castOf(w);
    ownProp(w, ev, 'prop:matSeat0', [c.x - 3, groundAt(w, c.x - 3, c.z) + 0.01, c.z - 3]);
    standAt(w, e.seat.actor, c.x - 3, c.z - 3, Math.PI);
    if (gerald >= 0) standAt(w, gerald, c.x + 1, c.z - 3, Math.PI);
    resetWobble(e.wobble);
    Object.assign(ev.d, { ex: 0, rep: 0, phaseT: 0, band: 0, marker: 0, fake: 0, sum: 0, reps: 0, inside: 0, steps: 0, total: 0, banked: 0 });
    ev.s[e.seat.index] = {};
    phase(ev, 'intro');
  },
  step, bot,
  teardown(w) {
    const { gerald } = castOf(w);
    if (gerald >= 0) setPose(w, gerald, 'RETREAT/Stand', 0);
  },
}; // prettier-ignore
