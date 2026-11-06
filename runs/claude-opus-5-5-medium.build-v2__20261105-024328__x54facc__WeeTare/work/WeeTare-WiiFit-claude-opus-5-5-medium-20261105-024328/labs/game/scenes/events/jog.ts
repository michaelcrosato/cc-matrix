/**
 * @file Island Jog (PLAN.md section 6). Follow Gerald round the coast path. The stick steers, alternating feet at about
 * 2.5 Hz gives 35% more speed, and you stay within 8 m of him: the Pace Ribbon. Gerald is never stuck: he is carried along
 * his path. At the end he says "Nice weather for it." It is the longest thing Gerald will ever say.
 */
import { angDiff } from '../../../../engine/sim-api';
import { clearBody, setLoop } from '../../cast/body';
import { characterAt, GUEST_SPEED } from '../../cast/people';
import type { Order, Skill } from '../bot/players';
import { COAST } from '../data/courses';
import { cue, say, type C, type EvState, type W } from '../types';
import { resetWobble } from '../wobble';
import { castOf } from '../cast-ref';
import { rankScore } from './mats';
import { clamp, footDown, groundAt, phase, playing, standAt, type Activity } from './kit';

const RIBBON = 8;
const GERALD_SPEED = 4.4;
const TURN = 2.4;
const MAX_STEPS = 10800;
const BOOST_STEPS = 45;

interface JogData {
  way: number;
  gx: number;
  gz: number;
  inside: number;
  steps: number;
  yaw: number;
  lastFoot: number;
  lastSide: string;
  boost: number;
  boosted: boolean;
  pinT: number;
  lines: number;
  endT: number;
}
const dataOf = (ev: EvState): JogData => ev.d as unknown as JogData;

type ActorOf = { actor: C['actor'] & { intents: Record<string, unknown>; character: unknown } };

/** Moves Gerald along the path. */
function moveGerald(w: W, ev: EvState): boolean {
  const d = dataOf(ev);
  const target = COAST[d.way];
  if (!target) return true;
  const [dx, dz] = [target[0] - d.gx, target[1] - d.gz];
  const len = Math.hypot(dx, dz);
  const pace = GERALD_SPEED / 60;
  if (len < pace * 2) d.way += 1;
  else {
    d.gx += (dx / len) * pace;
    d.gz += (dz / len) * pace;
  }
  const { gerald } = castOf(w);
  if (gerald >= 0) standAt(w, gerald, d.gx, d.gz, Math.atan2(dx, dz));
  return false;
}

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  const { gerald } = castOf(w);
  const entity = w.get(e.seat.actor) as unknown as ActorOf;
  if (ev.phase === 'end') {
    entity.actor.intents = {};
    if (ev.t === 60) say(w, 'jog.end', 'gerald');
    if (ev.t >= 300) {
      ev.score = rankScore((1000 * d.inside) / Math.max(1, d.steps));
      ev.done = true;
    }
    return;
  }
  const left = footDown(e, 'l');
  const right = footDown(e, 'r');
  if (left !== right) {
    const side = left ? 'l' : 'r';
    const gap = ev.total - d.lastFoot;
    if (side !== d.lastSide && gap <= 36) d.boost = BOOST_STEPS;
    d.lastSide = side;
    d.lastFoot = ev.total;
  }
  d.boost = Math.max(0, d.boost - 1);
  const boosted = d.boost > 0;
  if (boosted !== d.boosted) {
    d.boosted = boosted;
    (entity.actor as { character: unknown }).character = characterAt(GUEST_SPEED * (boosted ? 1.35 : 1));
    if (boosted) cue(w, 'pace');
  }
  d.yaw += clamp(e.seat.input.x, -1, 1) * TURN * (1 / 60);
  const go = e.seat.input.y > -0.2 && Math.hypot(e.seat.input.x, e.seat.input.y) > 0.15 ? 1 : 0;
  const push = clamp(Math.max(e.seat.input.y, 0.6), 0, 1) * go;
  entity.actor.intents = { move: [Math.sin(d.yaw) * push, Math.cos(d.yaw) * push] };
  if (moveGerald(w, ev) || ev.total >= MAX_STEPS) {
    phase(ev, 'end');
    return;
  }
  if (gerald >= 0) setLoop(w, gerald, 'RETREATLIB/Jog_Fwd_Loop', 1);
  d.steps += 1;
  const dist = Math.hypot(entity.actor.x - d.gx, entity.actor.z - d.gz);
  ev.d.dist = dist;
  if (dist <= RIBBON) d.inside += 1;
  if (ev.total % 900 === 300) {
    d.lines += 1;
    say(w, `jog.tare.${((d.lines - 1) % 6) + 1}`, 'tare');
  }
  const { tare } = castOf(w);
  if (tare >= 0 && ev.total % 2 === 0) {
    const k = 2.6;
    standAt(w, tare, entity.actor.x + Math.cos(d.yaw) * k, entity.actor.z - Math.sin(d.yaw) * k, d.yaw);
  }
}

function bot(w: W, ev: EvState, e: { seat: { actor: number } }, skill: Skill): Order {
  const d = dataOf(ev);
  if (ev.phase !== 'run') return {};
  const { actor } = w.get(e.seat.actor) as unknown as ActorOf;
  const target = COAST[Math.min(COAST.length - 1, d.way + (Math.hypot(actor.x - d.gx, actor.z - d.gz) < 5 ? 1 : 0))];
  const near = Math.hypot(actor.x - d.gx, actor.z - d.gz) > 5;
  const [tx, tz] = near ? [d.gx, d.gz] : target;
  const want = Math.atan2(tx - actor.x, tz - actor.z);
  const err = angDiff(d.yaw, want);
  const order: Order = { stick: [clamp(err * (skill.name === 'sloppy' ? 1.2 : 2), -1, 1), 1] };
  const beat = w.tick % 24;
  if (near && beat < 6) order.l = 1;
  else if (near && beat >= 12 && beat < 18) order.r = 1;
  return order;
}

export const JOG: Activity = {
  id: 'jog', title: 'Island Jog', station: 'pier', shot: 'chase', map: 'balance', song: 'song:lobby',
  setup(w, ev) {
    const [e] = playing(w, ev);
    const { gerald } = castOf(w);
    resetWobble(e.wobble);
    e.wobble.off = true;
    ev.s[e.seat.index] = {};
    const start = COAST[0];
    Object.assign(ev.d, { way: 1, gx: start[0], gz: start[1], inside: 0, steps: 0, yaw: Math.atan2(COAST[1][0] - start[0], COAST[1][1] - start[1]), lastFoot: -100, lastSide: '', boost: 0, boosted: false, lines: 0, endT: 0, dist: 0 });
    void groundAt;
    if (gerald >= 0) standAt(w, gerald, start[0], start[1], 1.5);
    standAt(w, e.seat.actor, start[0] - 3, start[1] + 1, 1.5);
    clearBody(w, e.seat.actor);
    say(w, 'jog.start', 'gerald');
    phase(ev, 'run');
  },
  step,
  bot: bot as Activity['bot'],
  teardown(w) {
    const { gerald } = castOf(w);
    const [e] = playing(w, { seats: [0] } as EvState);
    const entity = w.get(e.seat.actor) as unknown as ActorOf;
    (entity.actor as { character: unknown }).character = characterAt(GUEST_SPEED);
    entity.actor.intents = {};
    if (gerald >= 0) clearBody(w, gerald);
  },
}; // prettier-ignore
