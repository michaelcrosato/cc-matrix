/**
 * @file Cliff Plunge (PLAN.md section 6): three dives from a 14 m cliff. Compose: hold ring and breath for 4 s to fill power.
 * Go: release both feet as a swinging gauge peaks. Air: lean y spins you, lean x twists; enter within 15 degrees of
 * vertical. Three Gulls hold up score cards; one always scores 4. Wait too long at the lip and you slip off anyway.
 */
import { stepCrowdBody } from '../../../../engine/sim-api';
import { setOnce, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { cue, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble, stepBreath, stepWobble } from '../wobble';
import { rankScore } from './mats';
import {
  bothHeld,
  clamp,
  hover,
  inRing,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  groundAt,
  type Activity,
} from './kit';

export const DIVES = 3;
const COMPOSE = 240;
const COMPOSE_MAX = 660;
const GO_MAX = 300;
const SWING = 96;
const AIR = 120;
const CARD_TIME = 240;
const SPIN = 720;
const WATER_Y = 2;

interface PlungeData {
  dive: number;
  power: number;
  timing: number;
  rot: number;
  twist: number;
  fill: number;
  total: number;
  cards: number[];
  slip: boolean;
  x: number;
  top: number;
  z: number;
  cardProps: number[];
  lastEntry: number;
  gauge: number;
  judges: number[];
}
const dataOf = (ev: EvState): PlungeData => ev.d as unknown as PlungeData;

/** The gauge at `t` steps into Go: 0 to 1 and back. */
export const gaugeAt = (t: number): number => 0.5 - 0.5 * Math.cos((t / SWING) * Math.PI * 2);

/** How far `rot` is from head first, degrees. */
export const entryError = (rot: number): number => {
  const a = (((rot - 180) % 360) + 360) % 360;
  return a > 180 ? 360 - a : a;
};

/** The three cards for a dive. One judge always scores 4. */
function judge(w: W, d: PlungeData): number[] {
  if (d.slip) return [1, 1, 4];
  const entry = clamp(1 - Math.max(0, entryError(d.rot) - 15) / 60, 0, 1);
  const flips = clamp(Math.abs(d.rot) / 540, 0, 1);
  const twist = clamp(Math.abs(d.twist) / 180, 0, 1);
  const base = 2 + 3.4 * entry + 1.8 * flips * entry + 0.8 * twist * entry + 1 * d.power + 1 * d.timing;
  const rng = w.rng('plunge');
  const card = () => clamp(Math.round(base + rng.range(-0.5, 0.5)), 0, 10);
  return [card(), card(), 4];
}

function top(w: W, ev: EvState, e: SeatE): void {
  const d = dataOf(ev);
  hover(w, e.seat.actor, d.x, d.top + 0.03, d.z, Math.PI);
}

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  d.judges.forEach((id, k) => {
    const judge = w.get(id) as unknown as { crowdBody: never } | undefined;
    if (judge)
      stepCrowdBody(w as never, id, judge.crowdBody, {
        at: [d.x + (k - 1) * 3, 2.25, d.z - 14.3],
        velocity: [0, 0, 0.01],
      } as never);
  });
  if (ev.phase === 'compose') {
    stepBreath(w, e, w.tick);
    stepWobble(w, e);
    top(w, ev, e);
    setPose(w, e.seat.actor, 'RETREAT/DiveReady', clamp(d.fill / COMPOSE, 0, 1));
    if (bothHeld(e) && inRing(e, 0, 0, 0.3)) d.fill += 1;
    d.power = clamp(d.fill / COMPOSE, 0, 1);
    if (d.fill >= COMPOSE) {
      cue(w, 'bell');
      phase(ev, 'go');
    } else if (ev.t >= COMPOSE_MAX) {
      d.slip = true;
      cue(w, 'stumble');
      say(w, 'plunge.slip', 'tare');
      phase(ev, 'air');
    }
    return;
  }
  if (ev.phase === 'go') {
    top(w, ev, e);
    setPose(w, e.seat.actor, 'RETREAT/DiveReady', 1);
    d.gauge = gaugeAt(ev.t);
    if (!bothHeld(e)) {
      d.timing = d.gauge;
      cue(w, 'whoosh');
      phase(ev, 'air');
    } else if (ev.t >= GO_MAX) {
      d.slip = true;
      say(w, 'plunge.slip', 'tare');
      phase(ev, 'air');
    }
    return;
  }
  if (ev.phase === 'air') {
    const k = clamp(ev.t / AIR, 0, 1);
    const fall = (d.top - WATER_Y) * k * k;
    const out = (d.slip ? 2 : 4 + 3 * d.power) * k;
    if (!d.slip) {
      d.rot += clamp(e.seat.input.y, -1, 1) * (SPIN / 60);
      d.twist += clamp(e.seat.input.x, -1, 1) * (SPIN / 60);
    }
    hover(
      w,
      e.seat.actor,
      d.x,
      d.top - fall + (d.slip ? 0 : Math.sin(k * Math.PI) * 1.4),
      d.z - out,
      Math.PI + (d.twist * Math.PI) / 180,
    );
    if (d.slip) setPose(w, e.seat.actor, 'RETREAT/Fall', k);
    else setPose(w, e.seat.actor, 'RETREAT/Somersault', (((d.rot / 720) % 1) + 1) % 1);
    if (ev.t >= AIR) {
      d.cards = judge(w, d);
      d.lastEntry = entryError(d.rot);
      d.total += d.cards[0] + d.cards[1] + d.cards[2];
      cue(w, d.slip ? 'splash' : 'splashBig');
      phase(ev, 'cards');
      w.emit('cards', { cards: d.cards } as never);
    }
    return;
  }
  if (ev.phase === 'cards') {
    const sink = clamp(ev.t / 30, 0, 1);
    hover(w, e.seat.actor, d.x, WATER_Y - sink * 1.2, d.z - (d.slip ? 2 : 4 + 3 * d.power), Math.PI);
    setPose(w, e.seat.actor, 'RETREAT/Stand', 0);
    if (ev.t === 40) say(w, d.cards[0] >= 8 ? 'plunge.good' : d.cards[0] >= 5 ? 'plunge.fair' : 'plunge.poor', 'tare');
    if (ev.t >= CARD_TIME) {
      d.dive += 1;
      if (d.dive >= DIVES) {
        ev.score = rankScore((d.total / (DIVES * 24)) * 1000);
        ev.done = true;
        return;
      }
      Object.assign(d, { power: 0, timing: 0, rot: 0, twist: 0, fill: 0, slip: false, gauge: 0, cards: [], hist: [] });
      resetWobble(e.wobble);
      phase(ev, 'compose');
    }
  }
}

function bot(w: W, ev: EvState, _e: SeatE, skill: Skill): Order {
  const d = dataOf(ev);
  if (ev.phase === 'compose') return { aim: [0, 0], l: 1, r: 1 };
  if (ev.phase === 'go') {
    const peak = SWING / 2 + SWING + Math.round(skill.timing * (w.rng('bot').range(0, 1) - 0.5));
    return ev.t >= peak ? {} : { l: 1, r: 1 };
  }
  if (ev.phase === 'air') {
    // the thumb reads the spin late, so it overshoots the way a person does
    const late = skill.delay;
    const hist = (d as unknown as { hist: number[] }).hist;
    hist.push(d.rot);
    while (hist.length > late + 1) hist.shift();
    const left = 540 - hist[0];
    const twist = Math.abs(d.twist) < 170 ? 1 : 0;
    const k = skill.name === 'perfect' ? 1 / 12 : skill.name === 'human' ? 1 / 180 : 1 / 240;
    return { stick: [twist, clamp(left * k, -1, 1)], raw: skill.name === 'perfect' };
  }
  return {};
}

export const PLUNGE: Activity = {
  id: 'plunge', title: 'Cliff Plunge', station: 'cliff', shot: 'plunge', map: 'balance', song: 'song:water',
  setup(w, ev) {
    const c = stationAt(w, 'cliff');
    const [e] = playing(w, ev);
    resetWobble(e.wobble);
    ev.s[e.seat.index] = {};
    const lipY = groundAt(w, c.x, c.z);
    standAt(w, e.seat.actor, c.x, c.z, Math.PI);
    const cardProps = [-3, 0, 3].map((dx) => ownProp(w, ev, 'prop:scoreRaft', [c.x + dx, 2, c.z - 14]));
    const judges = [-3, 0, 3].map((dx) => {
      const id = w.spawn({ crowdBody: { rig: 'blob', look: 'wings', x: c.x + dx, y: 2.25, z: c.z - 14.3, size: 0.26 } } as never);
      ev.owned.push(id);
      return id;
    });
    Object.assign(ev.d, { dive: 0, power: 0, timing: 0, rot: 0, twist: 0, fill: 0, total: 0, cards: [], slip: false, x: c.x, top: lipY, z: c.z, cardProps, judges, lastEntry: 0, gauge: 0, hist: [] });
    say(w, 'plunge.intro', 'tare');
    phase(ev, 'compose');
  },
  step, bot,
}; // prettier-ignore
void setOnce;
