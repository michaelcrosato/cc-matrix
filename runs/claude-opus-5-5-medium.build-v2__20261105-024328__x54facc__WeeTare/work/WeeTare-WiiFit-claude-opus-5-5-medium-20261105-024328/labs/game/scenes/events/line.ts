/**
 * @file The Line (PLAN.md section 6): a 40 m slackline across the lagoon with three flags. Alternate feet to step; each step
 * kicks you sideways and your lean fights it. Gusts are telegraphed by ripples and a flag on Tare's little boat. At 15 m the
 * Gull lands on your arm and stays until you flick it off with a fast stick flip. Falling is a large splash and a lift back
 * to the last flag. After 120 s the boat collects you: "The line closes at this time."
 */
import { setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble } from '../wobble';
import { castOf } from '../cast-ref';
import { rankScore } from './mats';
import { balanceAll, clamp, footDown, hover, moveProp, ownProp, phase, playing, stationAt, type Activity } from './kit';
import { setLean } from '../../cast/body';

export const LINE_LENGTH = 40;
const STRIDE = 0.75;
const LINE_Y = 5;
const FLAGS = [10, 20, 30];
const CLOSE = 7200;
const FALL = 180;
const GULL_AT = 15;

interface LineData {
  x0: number;
  z: number;
  at: number;
  last: string;
  falls: number;
  flag: number;
  gustT: number;
  gustIn: number;
  gustSide: number;
  gull: number;
  flipT: number;
  flipSign: number;
  seconds: number;
  poseT: number;
  side: number;
  boat: number;
  gullDone: boolean;
}

const dataOf = (ev: EvState): LineData => ev.d as unknown as LineData;

/** The score (the plan's formula). */
export function lineScore(falls: number, seconds: number, share: number): number {
  return Math.max(0, 1000 - 150 * falls - 8 * Math.max(0, seconds - 50)) * share;
}

function finish(ev: EvState, d: LineData): void {
  ev.score = rankScore(lineScore(d.falls, d.seconds, clamp(d.at / LINE_LENGTH, 0, 1)));
  ev.done = true;
}

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  const y = LINE_Y;
  d.seconds = ev.total / 60;
  if (ev.total >= CLOSE && ev.phase !== 'closed') {
    say(w, 'line.closes', 'tare');
    phase(ev, 'closed');
  }
  if (ev.phase === 'closed') {
    if (ev.t > 120) finish(ev, d);
    return;
  }
  if (ev.phase === 'fall') {
    setPose(w, e.seat.actor, 'RETREAT/Fall', 1);
    const sink = clamp(ev.t / 40, 0, 1);
    hover(w, e.seat.actor, d.x0 + d.at, y - sink * 2.9, d.z + e.wobble.x * 0.7, Math.PI / 2);
    if (ev.t >= FALL) {
      d.at = d.flag;
      resetWobble(e.wobble);
      d.gull = 0;
      phase(ev, 'walk');
    }
    return;
  }
  // gusts
  if (d.gustIn > 0) {
    d.gustIn -= 1;
    if (d.gustIn === 90) cue(w, 'gustWarn', { side: d.gustSide });
    if (d.gustIn === 0) {
      d.gustT = 60;
      cue(w, 'gust');
    }
  } else if (d.gustT > 0) d.gustT -= 1;
  else {
    d.gustIn = w.rng('line').int(360, 600);
    d.gustSide = w.rng('line').chance(0.5) ? 1 : -1;
  }
  const gust = d.gustT > 0 ? d.gustSide * gameNumber(w, 'game.line.gust') * 6 : 0;
  balanceAll(w, ev, () => [gust + d.gull * 2.2, 0]);
  e.wobble.y *= 0.8;
  e.wobble.vy *= 0.8;
  // the gull, and the flick that takes it off
  if (!d.gullDone && d.at >= GULL_AT) {
    d.gullDone = true;
    d.gull = w.rng('line').chance(0.5) ? 1 : -1;
    cue(w, 'gullLand', { on: 'arm' });
    say(w, 'line.gull', 'tare');
  }
  if (d.gull !== 0) {
    const sign = Math.sign(e.seat.input.x);
    if (Math.abs(e.seat.input.x) > 0.6 && sign !== d.flipSign) {
      if (d.flipT > 0) {
        d.gull = 0;
        cue(w, 'gullOff');
      }
      d.flipSign = sign;
      d.flipT = 20;
    }
    d.flipT = Math.max(0, d.flipT - 1);
  }
  // steps
  const left = footDown(e, 'l');
  const right = footDown(e, 'r');
  if (left !== right && e.wobble.recover === 0) {
    const foot = left ? 'l' : 'r';
    if (foot === d.last) {
      e.wobble.vx += (left ? -1 : 1) * 0.9;
      cue(w, 'stumble');
    } else {
      d.at = Math.min(LINE_LENGTH, d.at + STRIDE);
      e.wobble.vx += (left ? -1 : 1) * gameNumber(w, 'game.line.stepKick') * 3.14;
      d.poseT = 16;
      d.side = left ? 0 : 1;
      cue(w, 'rope');
    }
    d.last = foot;
  }
  for (const flag of FLAGS) {
    if (d.flag < flag && d.at >= flag) {
      d.flag = flag;
      cue(w, 'ding', { n: 2 });
      say(w, 'line.flag', 'tare');
    }
  }
  d.poseT = Math.max(0, d.poseT - 1);
  const clip = d.poseT > 0 ? (d.side === 0 ? 'RETREAT/LineWalkL' : 'RETREAT/LineWalkR') : 'RETREAT/LineStand';
  setPose(w, e.seat.actor, clip, 1);
  setLean(w, e.seat.actor, e.wobble.x * 1.4, 0);
  hover(w, e.seat.actor, d.x0 + d.at, y, d.z + e.wobble.x * 0.25, Math.PI / 2);
  if (e.wobble.recover > 0) {
    d.falls += 1;
    cue(w, 'splashBig');
    say(w, 'line.fell', 'tare');
    phase(ev, 'fall');
    return;
  }
  if (d.at >= LINE_LENGTH) {
    cue(w, 'stamp');
    finish(ev, d);
  }
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  const d = dataOf(ev);
  if (ev.phase !== 'walk') return {};
  const order: Order = { aim: [0, 0] };
  if (d.gull !== 0) {
    const flip = Math.floor(w.tick / 8) % 2 === 0 ? 1 : -1;
    order.stick = [flip, 0];
    order.aim = undefined;
    return order;
  }
  const ready = Math.abs(e.wobble.x) < (skill.name === 'perfect' ? 0.35 : skill.name === 'human' ? 0.5 : 0.7);
  const beat = skill.name === 'sloppy' ? 46 : 42;
  const phaseAt = (w.tick + (e.seat.bot.j ?? 0)) % beat;
  const bot = e.seat.bot;
  if (phaseAt === 0) {
    bot.go = ready ? 1 : 0;
    bot.foot = d.last === 'l' ? 1 : 0;
    if (skill.name === 'sloppy' && w.rng('bot').chance(0.04)) bot.foot = 1 - bot.foot;
  }
  if (bot.go && phaseAt < 6) {
    if (bot.foot === 0) order.l = 1;
    else order.r = 1;
  }
  return order;
}

export const LINE: Activity = {
  id: 'line', title: 'The Line', station: 'lagoon', shot: 'line', map: 'balance', song: 'song:water',
  setup(w, ev) {
    const c = stationAt(w, 'lagoon');
    const [e] = playing(w, ev);
    const x0 = c.x - LINE_LENGTH / 2;
    const z = c.z;
    resetWobble(e.wobble);
    e.wobble.sway = 0.8;
    Object.assign(ev.d, { x0, z, at: 0, last: '', falls: 0, flag: 0, gustT: 0, gustIn: 420, gustSide: 1, gull: 0, flipT: 0, flipSign: 0, seconds: 0, poseT: 0, side: 0, gullDone: false });
    ev.s[e.seat.index] = {};
    ownProp(w, ev, 'prop:linePost', [x0 - 0.5, 0, z]);
    ownProp(w, ev, 'prop:linePost', [x0 + LINE_LENGTH + 0.5, 0, z]);
    ownProp(w, ev, 'prop:slackline', [x0 + LINE_LENGTH / 2, LINE_Y - 0.1, z]);
    for (const flag of FLAGS) ownProp(w, ev, 'prop:lineFlag', [x0 + flag, LINE_Y - 0.1, z + 0.5]);
    const boat = ownProp(w, ev, 'prop:tareBoat', [x0, 2, z + 6]);
    (ev.d as { boat?: number }).boat = boat;
    const { tare } = castOf(w);
    if (tare >= 0) hover(w, tare, x0, 2.5, z + 6, -Math.PI / 2);
    hover(w, e.seat.actor, x0, LINE_Y, z, Math.PI / 2);
    say(w, 'line.intro', 'tare');
    phase(ev, 'walk');
  },
  step(w, ev) {
    step(w, ev);
    const d = dataOf(ev);
    const { tare } = castOf(w);
    const bx = d.x0 + d.at + 3;
    moveProp(w, d.boat, [bx, 2 + Math.sin(w.tick * 0.05) * 0.05, d.z + 6]);
    if (tare >= 0) hover(w, tare, bx, 2.6, d.z + 6, -Math.PI / 2);
  },
  bot,
}; // prettier-ignore
