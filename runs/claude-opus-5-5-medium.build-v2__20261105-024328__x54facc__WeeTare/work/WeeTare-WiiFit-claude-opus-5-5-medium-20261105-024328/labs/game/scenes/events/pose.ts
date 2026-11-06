/**
 * @file Pose Class (PLAN.md section 6). Plumb demonstrates; you follow a guide dot from the centre to the pose's seat, and
 * that progress scrubs the pose strip; then you hold the ring, breathing with the guide, while your off-seat lean tips the
 * body. Every seat plays: CPU guests hold too, and in a Round the other mats are ghosts. The `heron` activity is the
 * one-pose short form rounds deal.
 */
import { setPose } from '../../cast/body';
import { breathFeet, type Order, type Skill } from '../bot/players';
import { CLASSES, POSES, type Pose } from '../data/poses';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type SeatE, type W } from '../types';
import { syncShare, resetWobble } from '../wobble';
import { actDown, balanceAll, bodyPose, clamp, inRing, leadIn, phase, playing, sayOne, type Activity } from './kit';
import { castOf } from '../cast-ref';
import { arrangeClass, rankScore } from './mats';

const DEMO = 240;
const ENTER_WAIT = 600;
const ENTER_MAX = 900;
const REST = 150;

interface PoseData {
  list: string[];
  at: number;
  hold: number;
  seatAt: number;
  total: number;
  scores: Record<string, number[]>;
}

const dataOf = (ev: EvState): PoseData => ev.d as unknown as PoseData;
const poseOf = (ev: EvState): Pose => POSES[dataOf(ev).list[dataOf(ev).at]];
const holdSteps = (w: W, pose: Pose): number => Math.round((pose.each ?? gameNumber(w, 'game.pose.hold')) * 60);

/** The guide dot on its curved way from the centre to the seat. */
function guideDot(seat: readonly [number, number], k: number): [number, number] {
  const bend = Math.sin(k * Math.PI) * 0.12;
  return [seat[0] * k - seat[1] * bend, seat[1] * k + seat[0] * bend + bend * (seat[0] === 0 && seat[1] === 0 ? 1 : 0)];
}

/** The seat's aim on the disc now. */
function aimOf(ev: EvState, e: SeatE): [number, number] {
  const pose = poseOf(ev);
  const seat = pose.seats[Math.min(dataOf(ev).seatAt, pose.seats.length - 1)];
  const s = ev.s[e.seat.index];
  if (ev.phase === 'enter') return guideDot(seat, s.prog);
  return [seat[0], seat[1]];
}

function startPose(w: W, ev: EvState): void {
  const pose = poseOf(ev);
  dataOf(ev).seatAt = 0;
  dataOf(ev).hold = 0;
  for (const e of playing(w, ev)) {
    if (e.seat.kind !== 'ghost') {
      resetWobble(e.wobble);
      e.wobble.instab = pose.instab;
      e.wobble.sway = pose.sway;
    }
    Object.assign(ev.s[e.seat.index], { prog: 0, inside: 0, steps: 0, wait: 0 });
    e.seat.pose = pose.id;
  }
  say(w, `pose.intro.${pose.id}`, 'plumb');
  phase(ev, ev.short ? 'enter' : 'demo');
}

function scorePose(ev: EvState, w: W): void {
  const pose = poseOf(ev);
  for (const e of playing(w, ev)) {
    const s = ev.s[e.seat.index];
    const share = s.steps ? s.inside / s.steps : 0;
    const breath = Math.max(0, (syncShare(e.wobble) - 0.2) / 0.8);
    const value = 1000 * ((1 - pose.breath) * share + pose.breath * breath) - 60 * e.wobble.topples;
    (dataOf(ev).scores[e.seat.index] ??= []).push(clamp(value, 0, 1000));
    e.seat.score = mean(dataOf(ev).scores[e.seat.index]);
  }
}

const mean = (list: readonly number[]): number => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

function enterStep(w: W, ev: EvState): void {
  const pose = poseOf(ev);
  balanceAll(w, ev);
  let waited = true;
  for (const e of playing(w, ev)) {
    const s = ev.s[e.seat.index];
    const [gx, gy] = guideDot(pose.seats[0], s.prog);
    if (inRing(e, gx, gy, 0.18)) {
      s.prog = Math.min(1, s.prog + 1 / 150);
      s.wait = 0;
    } else s.wait += 1;
    if (e.seat.index === ev.seats[0] && s.prog < 1 && s.wait < ENTER_WAIT) waited = false;
    if (s.prog > 0.995 && e.seat.index === ev.seats[0]) waited = true;
    if (e.seat.kind !== 'ghost') bodyPose(w, e, pose.clip, s.prog);
  }
  if (waited || ev.t > ENTER_MAX) {
    const s0 = ev.s[ev.seats[0]];
    if (s0.prog < 0.99) say(w, 'pose.start', 'plumb');
    cue(w, 'bell');
    phase(ev, 'hold');
  }
}

function holdStep(w: W, ev: EvState): void {
  const pose = poseOf(ev);
  const d = dataOf(ev);
  const steps = holdSteps(w, pose);
  const ring = gameNumber(w, 'game.pose.ring') * pose.ring * (ev.expert ? 0.75 : 1);
  balanceAll(w, ev, () => {
    if (pose.gull && d.hold > steps / 2) return [0.8 * Math.sin(w.tick * 0.012), -2.5];
    return pose.climbs ? [0, 0] : [0, 0];
  });
  if (pose.gull && d.hold === Math.floor(steps / 2)) cue(w, 'gullLand', { on: 'seat0' });
  for (const e of playing(w, ev)) {
    const s = ev.s[e.seat.index];
    if (pose.climbs && e.seat.kind !== 'ghost') e.wobble.sway = pose.sway + (d.hold / steps) * 0.8;
    const [ax, ay] = aimOf(ev, e);
    const feet =
      pose.hold === '' || (pose.hold === 'l' ? e.seat.input.l >= 0.5 : e.seat.input.l >= 0.5 && e.seat.input.r >= 0.5);
    s.steps += 1;
    if (inRing(e, ax, ay, ring) && feet) s.inside += 1;
    if (e.seat.kind === 'ghost') continue;
    const clip = pose.id === 'comma' && d.seatAt === 1 ? 'RETREAT/CommaL' : pose.clip;
    const t = pose.lungs ? 0.5 + 0.5 * e.wobble.lungs : 1;
    bodyPose(w, e, clip, t, false, 0.8);
  }
  d.hold += 1;
  if (pose.seats.length > 1 && d.seatAt < pose.seats.length - 1 && d.hold >= steps / pose.seats.length) {
    d.seatAt += 1;
    cue(w, 'bell');
  }
  if (d.hold >= steps) {
    scorePose(ev, w);
    sayOne(w, 'pose.rest', 4, 'plumb');
    cue(w, 'bell');
    phase(ev, 'rest');
  }
}

function step(w: W, ev: EvState): void {
  if (leadIn(w, ev)) return;
  if (ev.phase === 'go') return startPose(w, ev);
  const d = dataOf(ev);
  const cast = castOf(w);
  const pose = poseOf(ev);
  if (ev.phase === 'demo') {
    if (cast.plumb >= 0) setPose(w, cast.plumb, pose.clip, clamp(ev.t / 120, 0, 1));
    const skip = playing(w, ev).some((e) => e.seat.kind === 'human' && actDown(e));
    if (ev.t >= DEMO || skip) {
      say(w, 'pose.nowYou', 'plumb');
      phase(ev, 'enter');
    }
    return;
  }
  if (cast.plumb >= 0) setPose(w, cast.plumb, pose.clip, 1);
  if (ev.phase === 'enter') return enterStep(w, ev);
  if (ev.phase === 'hold') return holdStep(w, ev);
  if (ev.phase === 'rest') {
    for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') bodyPose(w, e, pose.clip, clamp(1 - ev.t / 60, 0, 1));
    if (ev.t < REST) return;
    d.at += 1;
    if (d.at >= d.list.length) {
      if (cast.plumb >= 0) setPose(w, cast.plumb, 'RETREAT/Stand', 0);
      ev.done = true;
      ev.score = rankScore(mean(d.scores[ev.seats[0]] ?? []));
      return;
    }
    startPose(w, ev);
  }
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  if (ev.phase === 'demo' || ev.phase === 'lead' || ev.phase === 'rest') return {};
  const pose = poseOf(ev);
  const feet = breathFeet(w, skill);
  const order: Order = { aim: aimOf(ev, e), l: feet, r: feet };
  if (pose.hold === 'both') [order.l, order.r] = [1, 1];
  if (pose.hold === 'l') order.l = 1;
  return order;
}

/** Makes a Pose Class activity for a list of poses. */
function poseClass(id: string, title: string, list: readonly string[], short: boolean): Activity {
  return {
    id, title, station: 'pavilion', shot: 'mat', map: 'balance', song: 'song:stillness', multi: true,
    setup(w, ev) {
      arrangeClass(w, ev);
      Object.assign(ev.d, { list: [...list], at: 0, hold: 0, seatAt: 0, scores: {} });
      ev.seats.forEach((i) => (ev.s[i] = { prog: 0, inside: 0, steps: 0, wait: 0 }));
      if (short) return phase(ev, 'lead');
      startPose(w, ev);
    },
    step, bot,
  }; // prettier-ignore
}

export const POSE_ACTIVITIES: readonly Activity[] = [
  poseClass('poseA', 'Pose Class', CLASSES.poseA, false),
  poseClass('poseB', 'Pose Class II', CLASSES.poseB, false),
  poseClass('poseC', 'Pose Class III', CLASSES.poseC, false),
  poseClass('heron', 'The Heron', ['heron'], true),
];
