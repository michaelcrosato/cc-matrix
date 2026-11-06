/**
 * @file Still Pond (PLAN.md section 6): the funniest thing in the game and almost no input. Composure starts at 1000; the
 * only right thing to do is breathe with the guide. Anything else is "You moved". Lures come from a seeded table, every
 * 6 to 10 seconds, and escalate. The page draws the lures; the sim says which is up, so replays and tests hold them.
 */
import type { Order, Skill } from '../bot/players';
import { breathFeet } from '../bot/players';
import { LURES } from '../data/lures';
import { gameNumber } from '../settings';
import { burst, cue, say, type EvState, type SeatE, type W } from '../types';
import { resetWobble, stepBreath, syncShare } from '../wobble';
import { castOf } from '../cast-ref';
import { arrangeClass, rankScore } from './mats';
import {
  actDown,
  bodyPose,
  footDown,
  groundAt,
  hover,
  leadIn,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  type Activity,
} from './kit';
import { setPose } from '../../cast/body';

const DEBOUNCE = 60;
/** How long one foot alone may be down before it counts: reaching for both is not a stray foot. */
const STRAY = 18;
const STICK = 0.25;
const MOUSE = 0.18;

interface PondData {
  lure: string;
  lureAt: number;
  nextLure: number;
  lureT: number;
  frogLook: number;
  onKnee: boolean;
  gullOn: boolean;
  length: number;
  perch?: number[];
}

const dataOf = (ev: EvState): PondData => ev.d as unknown as PondData;

/** The score: composure scaled by breath; no input earns exactly half. */
export function pondScore(composure: number, sync: number): number {
  return composure * (0.5 + 0.5 * Math.max(0, (sync - 0.25) / 0.75));
}

/** Whether a seat moved this step. */
function moved(e: SeatE, s: Record<string, number>): boolean {
  const { input } = e.seat;
  const both = input.l >= 0.5 && input.r >= 0.5;
  const one = (input.l >= 0.5 || input.r >= 0.5) && !both;
  s.stray = one ? s.stray + 1 : 0;
  return (
    Math.hypot(input.x, input.y) > STICK ||
    actDown(e) ||
    s.stray > STRAY ||
    Math.hypot(e.wobble.mx, e.wobble.my) > MOUSE
  );
}

function step(w: W, ev: EvState): void {
  if (leadIn(w, ev)) return;
  if (ev.phase === 'go') {
    say(w, 'pond.begin', 'plumb');
    phase(ev, 'sit');
  }
  const d = dataOf(ev);
  if (ev.t === d.nextLure) {
    const entry = LURES[Math.min(d.lureAt, LURES.length - 1)];
    d.lure = entry.id;
    d.lureT = 0;
    d.lureAt += 1;
    d.nextLure = ev.t + w.rng('pond').int(360, 600);
    cue(w, 'lure', { id: entry.id });
    if (entry.line) say(w, entry.line, entry.who ?? 'tare');
    if (entry.id === 'frogKnee') d.onKnee = true;
    if (entry.id === 'gullHead') d.gullOn = true;
  }
  d.lureT += 1;
  if (d.lureT > 240) d.lure = '';
  for (const e of playing(w, ev)) {
    if (e.seat.kind === 'ghost') continue;
    const s = ev.s[e.seat.index];
    stepBreath(w, e, w.tick);
    s.cool = Math.max(0, s.cool - 1);
    if (moved(e, s) && s.cool === 0) {
      s.composure = Math.max(0, s.composure - gameNumber(w, 'game.pond.penalty'));
      s.cool = DEBOUNCE;
      s.moves += 1;
      w.emit('moved', { seat: e.seat.index } as never);
      burst(w, 'wtRipple');
      if (e.seat.index === ev.seats[0]) d.frogLook = 120;
    }
    bodyPose(w, e, 'RETREAT/Nothing', 1, false, 0);
    if (d.perch) hover(w, e.seat.actor, d.perch[0], d.perch[1], d.perch[2], Math.PI);
    e.seat.score = pondScore(s.composure, syncShare(e.wobble));
  }
  d.frogLook = Math.max(0, d.frogLook - 1);
  if (ev.t >= d.length) {
    const [first] = playing(w, ev);
    ev.score = rankScore(pondScore(ev.s[first.seat.index].composure, syncShare(first.wobble)));
    say(w, 'pond.end', 'plumb');
    ev.done = true;
  }
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  if (ev.phase === 'lead') return {};
  const feet = breathFeet(w, skill);
  const order: Order = { stick: [0, 0], l: feet, r: feet, raw: skill.name === 'perfect' };
  const d = dataOf(ev);
  if (d.lure && d.lureT === 40) {
    const chance = skill.name === 'sloppy' ? 0.3 : skill.name === 'human' ? 0.1 : 0;
    if (w.rng('bot').chance(chance)) order.act = true;
  }
  return order;
}

function pondActivity(id: string, title: string, short: boolean): Activity {
  return {
    id, title, station: 'pond', shot: 'pond', map: 'balance', song: '', multi: short,
    setup(w, ev) {
      Object.assign(ev.d, { lure: '', lureAt: 0, nextLure: 300, lureT: 0, frogLook: 0, onKnee: false, gullOn: false, length: short ? 2700 : 4500 });
      if (short) {
        arrangeClass(w, ev);
        phase(ev, 'lead');
      } else {
        const c = stationAt(w, 'pond');
        const [e] = playing(w, ev);
        const y = groundAt(w, c.x, c.z) + 1.4;
        Object.assign(ev.d, { perch: [c.x, y + 0.14, c.z + 2] });
        ownProp(w, ev, 'prop:jetty', [c.x, y, c.z + 4]);
        hover(w, e.seat.actor, c.x, y + 0.14, c.z + 2, Math.PI);
        const { frog, plumb } = castOf(w);
        if (plumb >= 0) {
          standAt(w, plumb, c.x - 5, c.z - 3, 0.5);
          setPose(w, plumb, 'RETREAT/Stand', 1);
        }
        void frog;
        phase(ev, 'go');
      }
      ev.seats.forEach((i) => (ev.s[i] = { composure: 1000, cool: 0, moves: 0, stray: 0 }));
      for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') { resetWobble(e.wobble); e.wobble.off = true; }
    },
    step, bot,
  }; // prettier-ignore
}

export const POND = pondActivity('pond', 'Still Pond', false);
export const POND_SHORT = pondActivity('pondS', 'Still Pond', true);
void footDown;
