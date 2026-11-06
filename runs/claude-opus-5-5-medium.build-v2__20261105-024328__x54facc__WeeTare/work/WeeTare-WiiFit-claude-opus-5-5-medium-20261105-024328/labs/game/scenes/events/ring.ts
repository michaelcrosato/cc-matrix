/**
 * @file The Still Ring and the Morning Check. The ring is the first thing you learn: stay inside it. `ring` is the short
 * class a Round opens with, every seat on its mat. `check` is the daily test on Tare's Platform: a question (it only
 * changes the remark), then the Still Ring, Reach and One Foot, ending in a Wobble Age.
 */
import { setPose } from '../../cast/body';
import { breathFeet, type Order, type Skill } from '../bot/players';
import { gameNumber } from '../settings';
import { cue, flowOf, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble } from '../wobble';
import { castOf } from '../cast-ref';
import { arrangeClass, rankScore } from './mats';
import {
  balanceAll,
  bodyPose,
  clamp,
  footDown,
  inRing,
  leadIn,
  ownProp,
  phase,
  playing,
  sayOne,
  standAt,
  stationAt,
  type Activity,
} from './kit';

const RING = 0.22;
const NARROW = 0.16;

/** Today's question count: the page holds their text, by day. */
export const QUESTIONS = 12;

/** The short class: 45 s in the ring. */
export const RING_CLASS: Activity = {
  id: 'ring', title: 'The Still Ring', station: 'pavilion', shot: 'mat', map: 'balance', song: 'song:stillness', multi: true,
  setup(w, ev) {
    arrangeClass(w, ev);
    ev.seats.forEach((i) => (ev.s[i] = { inside: 0, steps: 0 }));
    phase(ev, 'lead');
    for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') resetWobble(e.wobble);
    say(w, 'ring.intro', 'plumb');
  },
  step(w, ev) {
    if (leadIn(w, ev)) return;
    const total = 2700;
    balanceAll(w, ev);
    const r = (ev.t > total * 0.66 ? NARROW : RING) * (ev.expert ? 0.75 : 1);
    ev.d.ring = r;
    for (const e of playing(w, ev)) {
      const s = ev.s[e.seat.index];
      s.steps += 1;
      if (inRing(e, 0, 0, r)) s.inside += 1;
      if (e.seat.kind !== 'ghost') bodyPose(w, e, 'RETREAT/Stand', 1);
      e.seat.score = (1000 * s.inside) / Math.max(1, s.steps);
    }
    if (ev.t >= total) {
      const s = ev.s[ev.seats[0]];
      ev.score = rankScore((1000 * s.inside) / Math.max(1, s.steps));
      ev.done = true;
    }
  },
  bot: () => ({ aim: [0, 0] }),
}; // prettier-ignore

const ASK = 480;
const STILL = 720;
const REACH = 1440;
const FOOT = 480;
const REACH_R = 0.5;
const TARGET_R = 0.16;
const TARGET_HOLD = 30;

interface CheckData {
  a: number;
  b: number;
  c: number;
  targets: number[][];
  at: number;
  hold: number;
  foot: string;
  question: number;
  final: boolean;
  inside: number;
  steps: number;
  lift: number;
  intro: number;
}

const dataOf = (ev: EvState): CheckData => ev.d as unknown as CheckData;

/** The Morning Check's score from its three parts (the plan's weights). */
export const checkScore = (a: number, b: number, c: number): number => 0.45 * a + 0.3 * b + 0.25 * c;

/** Starts the seeded six targets. */
function reachTargets(w: W): number[][] {
  const rng = w.rng('check');
  const order = [0, 1, 2, 3, 4, 5];
  for (let k = 5; k > 0; k--) {
    const j = rng.int(0, k);
    [order[k], order[j]] = [order[j], order[k]];
  }
  return order.map((i) => [Math.cos((i * Math.PI) / 3) * REACH_R, Math.sin((i * Math.PI) / 3) * REACH_R]);
}

export const CHECK: Activity = {
  id: 'check', title: 'Morning Check', station: 'plaza', shot: 'check', map: 'balance', song: 'song:stillness',
  setup(w, ev) {
    const c = stationAt(w, 'plaza');
    const [e] = playing(w, ev);
    const flow = flowOf(w);
    ownProp(w, ev, 'prop:platformRing', [c.x, 8.42, c.z - 6]);
    standAt(w, e.seat.actor, c.x, c.z - 6, 0);
    const cast = castOf(w);
    if (cast.tare >= 0) standAt(w, cast.tare, c.x + 1.4, c.z - 4.6, -0.6);
    resetWobble(e.wobble);
    const question = w.rng('check').int(1, QUESTIONS);
    Object.assign(ev.d, { a: 0, b: 0, c: 0, targets: [], at: 0, hold: 0, foot: 'l', question, final: !!ev.d.final, inside: 0, steps: 0, lift: 0, intro: flow.day === 1 ? 1 : 0 });
    ev.s[e.seat.index] = {};
    say(w, `check.q.${question}`, 'tare');
    phase(ev, 'ask');
  },
  step(w, ev) {
    const d = dataOf(ev);
    const [e] = playing(w, ev);
    const pose = (t: number) => bodyPose(w, e, 'RETREAT/Stand', t);
    const { tare } = castOf(w);
    if (tare >= 0) setPose(w, tare, 'RETREAT/Bow', ev.phase === 'ask' ? Math.max(0, Math.sin((ev.t / 90) * Math.PI)) : 0);
    if (ev.phase === 'ask') {
      pose(1);
      const yes = footDown(e, 'l');
      const no = footDown(e, 'r');
      if (yes || no || ev.t >= ASK) {
        say(w, ev.t >= ASK ? 'check.a.none' : yes ? 'check.a.yes' : 'check.a.no', 'tare');
        resetWobble(e.wobble);
        phase(ev, 'still');
        if (d.intro) say(w, 'check.intro.still', 'tare');
      }
      return;
    }
    balanceAll(w, ev);
    pose(1);
    if (ev.phase === 'still') {
      d.steps += 1;
      if (inRing(e, 0, 0, (ev.t > STILL - 240 ? NARROW : RING) * (ev.expert ? 0.75 : 1))) d.inside += 1;
      if (ev.t >= STILL) {
        d.a = d.inside / d.steps;
        d.targets = reachTargets(w);
        [d.inside, d.steps] = [0, 0];
        cue(w, 'stamp');
        if (d.intro) say(w, 'check.intro.reach', 'tare');
        phase(ev, 'reach');
      }
      return;
    }
    if (ev.phase === 'reach') {
      const target = d.targets[d.at];
      if (inRing(e, target[0], target[1], TARGET_R)) d.hold += 1;
      else d.hold = 0;
      if (d.hold >= TARGET_HOLD) {
        d.hold = 0;
        d.at += 1;
        cue(w, 'ding', { n: d.at });
      }
      if (d.at >= d.targets.length || ev.t >= REACH) {
        d.b = d.at >= d.targets.length ? clamp(1 - ev.t / REACH, 0, 1) : 0;
        d.foot = w.rng('check').chance(0.5) ? 'l' : 'r';
        e.wobble.instab = 1.6;
        cue(w, 'stamp');
        say(w, d.foot === 'l' ? 'check.foot.l' : 'check.foot.r', 'tare');
        phase(ev, 'foot');
      }
      return;
    }
    if (ev.phase === 'foot') {
      const held = d.foot === 'l' ? e.seat.input.l >= 0.5 : e.seat.input.r >= 0.5;
      d.steps += 1;
      if (held && inRing(e, 0, 0, 0.3)) d.inside += 1;
      else if (!held) d.inside = Math.max(0, d.inside - 0.5);
      bodyPose(w, e, 'RETREAT/StepUpL', held ? 1 : 0, d.foot === 'r');
      if (ev.t >= FOOT) {
        d.c = d.inside / d.steps;
        ev.score = rankScore(1000 * checkScore(d.a, d.b, d.c));
        ev.done = true;
      }
    }
  },
  bot(w, ev, e, skill) {
    const d = dataOf(ev);
    if (ev.phase === 'ask') return ev.t > 100 ? { l: ev.t % 2 } : {};
    if (ev.phase === 'reach') return { aim: d.targets[d.at] as [number, number] };
    if (ev.phase === 'foot') {
      const down = ev.t > skill.delay ? 1 : 0;
      return { aim: [0, 0], l: d.foot === 'l' ? down : 0, r: d.foot === 'r' ? down : 0 };
    }
    return { aim: [0, 0] };
  },
}; // prettier-ignore

/** Plumb's and Tare's lines at the end, by rank, are chosen in the flow. */
export const breathOf = breathFeet;
export { sayOne };
export type { Order, Skill, SeatE };
void gameNumber;
