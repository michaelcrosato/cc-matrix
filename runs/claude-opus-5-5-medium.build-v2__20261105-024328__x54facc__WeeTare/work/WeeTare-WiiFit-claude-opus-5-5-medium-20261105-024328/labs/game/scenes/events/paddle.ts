/**
 * @file Paddle Glide (PLAN.md section 6). Stand on a board: forward lean is speed, side lean steers, feet alternating at
 * about 1.2 Hz add 30% and a kick. Twelve buoy gates round the lagoon, with seeded jitter. A ferry wake at gate 7 and a
 * crossing turtle at gate 9 shove your balance. A topple is a splash and a three second remount.
 */
import { angDiff } from '../../../../engine/sim-api';
import { setLean, setLoop, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { GATES, LAGOON_RADIUS } from '../data/courses';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type W } from '../types';
import { resetWobble } from '../wobble';
import { rankScore } from './mats';
import {
  balanceAll,
  clamp,
  footDown,
  hover,
  moveProp,
  ownProp,
  phase,
  playing,
  stationAt,
  yawQuat,
  type Activity,
} from './kit';

const LENGTH = 4500;
const GATE_R = 4;
const REMOUNT = 180;
const TURN = 1.2;
const WATER = 2.15;

interface PaddleData {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  gates: number[][];
  at: number;
  props: number[];
  board: number;
  turtle: number;
  lastFoot: number;
  lastSide: string;
  bonus: number;
  wake: number;
  turtleT: number;
  cx: number;
  cz: number;
  passedT: number;
}
const dataOf = (ev: EvState): PaddleData => ev.d as unknown as PaddleData;

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  if (ev.phase === 'splash') {
    setPose(w, e.seat.actor, 'RETREAT/Fall', 1);
    hover(w, e.seat.actor, d.x, WATER - clamp(ev.t / 30, 0, 1) * 1.2, d.z, d.yaw);
    moveProp(w, d.board, [d.x, 1.98, d.z], yawQuat(d.yaw));
    if (ev.t >= REMOUNT) {
      resetWobble(e.wobble);
      d.speed = 0;
      phase(ev, 'glide');
    }
  } else {
    const shove: [number, number] = d.wake > 0 ? [Math.sin(w.tick * 0.3) * 6, 2] : d.turtleT > 0 ? [5, -1] : [0, 0];
    balanceAll(w, ev, () => shove);
    d.wake = Math.max(0, d.wake - 1);
    d.turtleT = Math.max(0, d.turtleT - 1);
    if (e.wobble.recover > 0) {
      cue(w, 'splashBig');
      say(w, 'paddle.fell', 'tare');
      phase(ev, 'splash');
    }
    const forward = clamp(e.wobble.y, 0, 1);
    const left = footDown(e, 'l');
    const right = footDown(e, 'r');
    if (left !== right) {
      const side = left ? 'l' : 'r';
      const gap = ev.total - d.lastFoot;
      if (side !== d.lastSide && gap >= 30 && gap <= 70) {
        d.bonus = 90;
        cue(w, 'paddle');
      }
      d.lastSide = side;
      d.lastFoot = ev.total;
    }
    d.bonus = Math.max(0, d.bonus - 1);
    const top = gameNumber(w, 'game.paddle.speed') * (d.bonus > 0 ? 1.3 : 1);
    d.speed += (forward * top - d.speed) * 0.04;
    d.yaw += clamp(e.wobble.x, -1, 1) * TURN * (1 / 60) * (d.speed > 0.2 ? 1 : 0.4);
    d.x += Math.sin(d.yaw) * d.speed * (1 / 60);
    d.z += Math.cos(d.yaw) * d.speed * (1 / 60);
    const far = Math.hypot(d.x - d.cx, d.z - d.cz);
    if (far > LAGOON_RADIUS + 12) {
      const k = (LAGOON_RADIUS + 12) / far;
      d.x = d.cx + (d.x - d.cx) * k;
      d.z = d.cz + (d.z - d.cz) * k;
    }
    const gate = d.gates[d.at];
    if (gate && Math.hypot(d.x - gate[0], d.z - gate[1]) < GATE_R) {
      d.at += 1;
      d.passedT = ev.total;
      cue(w, 'ding', { n: d.at });
      if (d.at === 7) {
        d.wake = 60;
        cue(w, 'horn');
      }
      if (d.at === 9) {
        d.turtleT = 45;
        cue(w, 'turtle');
      }
    }
    const bob = Math.sin(w.tick * 0.08) * 0.03;
    moveProp(w, d.board, [d.x, 2 + bob, d.z], yawQuat(d.yaw));
    hover(w, e.seat.actor, d.x, WATER + bob, d.z, d.yaw);
    if (d.bonus > 0) setLoop(w, e.seat.actor, 'RETREAT/Paddling', 1.2);
    else setPose(w, e.seat.actor, 'RETREAT/BoardStand', 1);
    setLean(w, e.seat.actor, e.wobble.x, e.wobble.y);
  }
  const turtleGate = d.gates[8];
  moveProp(w, d.turtle, [turtleGate[0] + Math.sin(w.tick * 0.01) * 4, 1.98, turtleGate[1]]);
  if (ev.total >= LENGTH || d.at >= GATES) {
    const timeLeft = clamp(1 - ev.total / LENGTH, 0, 1);
    ev.score = rankScore(d.at * 60 + (d.at >= GATES ? 280 * Math.min(1, timeLeft * 1.6) : 0));
    ev.done = true;
    say(w, ev.score > 750 ? 'paddle.endGood' : 'paddle.endFair', 'tare');
  }
}

function bot(w: W, ev: EvState, _e: unknown, skill: Skill): Order {
  const d = dataOf(ev);
  if (ev.phase !== 'glide') return {};
  const gate = d.gates[d.at] ?? d.gates[GATES - 1];
  const want = Math.atan2(gate[0] - d.x, gate[1] - d.z);
  const err = angDiff(d.yaw, want);
  const turn = clamp(err * 1.2, -0.55, 0.55);
  const pace = skill.name === 'sloppy' ? 0.5 : 0.6;
  const order: Order = { aim: [turn, Math.abs(err) > 1 ? 0.2 : pace] };
  const period = 42;
  const at = w.tick % (period * 2);
  if (at < 8) order.l = 1;
  else if (at >= period && at < period + 8) order.r = 1;
  return order;
}

export const PADDLE: Activity = {
  id: 'paddle', title: 'Paddle Glide', station: 'lagoon', shot: 'paddle', map: 'balance', song: 'song:water',
  setup(w, ev) {
    const c = stationAt(w, 'lagoon');
    const [e] = playing(w, ev);
    resetWobble(e.wobble);
    const rng = w.rng('paddle');
    const gates: number[][] = [];
    const props: number[] = [];
    for (let k = 0; k < GATES; k++) {
      const a = Math.PI + (k / GATES) * Math.PI * 2;
      const r = LAGOON_RADIUS + rng.range(-2.5, 2.5);
      const g = [c.x + Math.sin(a + 0.4) * r, c.z + 5 + Math.cos(a + 0.4) * r];
      gates.push(g);
      props.push(ownProp(w, ev, 'prop:buoy', [g[0], 1.9, g[1]]));
    }
    const board = ownProp(w, ev, 'prop:board', [c.x, 2, c.z]);
    const turtle = ownProp(w, ev, 'prop:turtle', [gates[8][0], 1.98, gates[8][1]]);
    Object.assign(ev.d, { x: c.x, z: c.z + 5, yaw: Math.PI, speed: 0, gates, at: 0, props, board, turtle, lastFoot: -100, lastSide: '', bonus: 0, wake: 0, turtleT: 0, cx: c.x, cz: c.z + 5, passedT: 0 });
    ev.s[e.seat.index] = {};
    hover(w, e.seat.actor, c.x, WATER, c.z + 5, Math.PI);
    say(w, 'paddle.intro', 'tare');
    phase(ev, 'glide');
  },
  step, bot,
}; // prettier-ignore
