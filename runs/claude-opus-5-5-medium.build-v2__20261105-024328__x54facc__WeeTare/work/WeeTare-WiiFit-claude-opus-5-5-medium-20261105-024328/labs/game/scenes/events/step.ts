/**
 * @file Step Class (PLAN.md section 6): rhythm on a step platform. Charts become notes timed in whole sim steps, never
 * audio time; the sim's `beat` events fire the claps and kicks on the effects bus, because the music is only a bed. The
 * guests behind you follow your combo: lose it and they fall out of time, one by one, politely.
 */
import { setLoop, setPose } from '../../cast/body';
import type { Order, Skill } from '../bot/players';
import { PHRASES, SHORT_PHRASE, type Phrase } from '../data/charts';
import { gameNumber } from '../settings';
import { say, type EvState, type SeatE, type W } from '../types';
import { resetWobble } from '../wobble';
import { castOf } from '../cast-ref';
import { arrangeClass, rankScore } from './mats';
import {
  balanceAll,
  bodyPose,
  footDown,
  groundAt,
  leadIn,
  moveProp,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  clamp,
  type Activity,
} from './kit';

/** One note: when, in steps from the start, and what. */
export interface Note {
  t: number;
  k: string;
}

/** A BPM as an eighth note in steps. */
const eighth = (bpm: number): number => (60 / bpm / 2) * 60;

/** The notes and the beats of phrases, scaled by `game.step.bpm`. */
export function buildChart(
  phrases: readonly Phrase[],
  scale: number,
): { notes: Note[]; beats: number[]; end: number; phraseAt: number[] } {
  const notes: Note[] = [];
  const beats: number[] = [];
  const phraseAt: number[] = [];
  let at = 120;
  for (const phrase of phrases) {
    const each = eighth(phrase.bpm * scale);
    phraseAt.push(Math.round(at));
    const tokens = phrase.chart.split(/\s+/).filter((token) => token !== '|');
    tokens.forEach((token, i) => {
      const t = Math.round(at + i * each);
      if (i % 2 === 0) beats.push(t);
      if (token !== '.') notes.push({ t, k: token });
    });
    at += tokens.length * each + 60;
  }
  return { notes, beats, end: Math.round(at + 60), phraseAt };
}

interface StepData {
  notes: Note[];
  beats: number[];
  beatAt: number;
  end: number;
  outOfTime: number;
  tiles?: number[];
  tileY: number;
  tileX: number;
  tileZ: number;
}
const dataOf = (ev: EvState): StepData => ev.d as unknown as StepData;

/** The foot a note wants. */
const wantFoot = (k: string): 'l' | 'r' | 'b' => (k === 'L' || k === 'a' ? 'l' : k === 'R' || k === 'd' ? 'r' : 'b');

/** Judges a seat's feet against its next notes. */
function judge(w: W, ev: EvState, e: SeatE): void {
  const d = dataOf(ev);
  const s = ev.s[e.seat.index];
  const perfect = gameNumber(w, 'game.step.perfect');
  const good = gameNumber(w, 'game.step.good');
  while (s.at < d.notes.length && ev.t > d.notes[s.at].t + good) {
    s.at += 1;
    s.miss += 1;
    s.combo = 0;
    if (e.seat.index === ev.seats[0]) w.emit('stepJudge', { grade: 'miss', seat: e.seat.index } as never);
  }
  const left = footDown(e, 'l');
  const right = footDown(e, 'r');
  if (!left && !right) return;
  const note = d.notes[s.at];
  if (!note) return;
  const gap = Math.abs(ev.t - note.t);
  if (gap > good) return;
  const want = wantFoot(note.k);
  const both = e.seat.input.l >= 0.5 && e.seat.input.r >= 0.5;
  const footOk = want === 'b' ? both : want === 'l' ? left : right;
  if (!footOk) {
    if (want !== 'b') {
      s.combo = 0;
      s.at += 1;
      s.miss += 1;
      if (e.seat.index === ev.seats[0]) w.emit('stepJudge', { grade: 'miss', seat: e.seat.index } as never);
    }
    return;
  }
  const leanOk = note.k === 'a' ? e.wobble.x < -0.15 : note.k === 'd' ? e.wobble.x > 0.15 : true;
  const grade = gap <= perfect && leanOk ? 1 : 0.6;
  s.combo += 1;
  const mult = 1 + Math.min(0.5, s.combo * 0.025);
  s.points += grade * mult;
  s.at += 1;
  s.hit += 1;
  s.pose = want === 'b' ? 3 : want === 'l' ? 1 : 2;
  s.poseT = 16;
  if (e.seat.index === ev.seats[0])
    w.emit('stepJudge', { grade: grade === 1 ? 'perfect' : 'good', seat: e.seat.index, foot: want } as never);
}

/** The most points a chart could give, at a full combo. */
function maxPoints(count: number): number {
  let sum = 0;
  for (let c = 1; c <= count; c++) sum += 1 + Math.min(0.5, c * 0.025);
  return sum;
}

function body(w: W, e: SeatE, s: Record<string, number>): void {
  s.poseT = Math.max(0, s.poseT - 1);
  const k = clamp(s.poseT / 16, 0, 1);
  if (s.pose === 3) bodyPose(w, e, 'RETREAT/Jump', k, false, 0.5);
  else bodyPose(w, e, s.pose === 1 ? 'RETREAT/StepUpL' : 'RETREAT/StepUpR', k, false, 0.5);
}

function step(w: W, ev: EvState): void {
  if (leadIn(w, ev)) return;
  const d = dataOf(ev);
  while (d.beatAt < d.beats.length && d.beats[d.beatAt] <= ev.t) {
    w.emit('beat', { n: d.beatAt } as never);
    d.beatAt += 1;
    // the floor lights on the beat: one tile rises through it at a time
    d.tiles?.forEach((id, k) =>
      moveProp(w, id, [d.tileX + k * 1.5, d.tileY + (k === d.beatAt % 6 ? 0.02 : -0.2), d.tileZ]),
    );
  }
  balanceAll(w, ev);
  for (const e of playing(w, ev)) {
    if (e.seat.kind === 'ghost') continue;
    judge(w, ev, e);
    body(w, e, ev.s[e.seat.index]);
    e.seat.score = (1000 * ev.s[e.seat.index].points) / maxPoints(d.notes.length);
  }
  const first = ev.s[ev.seats[0]];
  const { extras } = castOf(w);
  const wantOut = first.combo >= 8 ? 0 : first.combo >= 3 ? 1 : first.combo >= 1 ? 2 : 3;
  d.outOfTime = wantOut;
  if (!ev.short) {
    extras.slice(0, 3).forEach((id, i) => setLoop(w, id, 'RETREATLIB/Dance_Loop', i < 3 - wantOut ? 2 : 0.6));
  }
  if (ev.t >= d.end) {
    ev.score = rankScore((1000 * first.points) / maxPoints(d.notes.length));
    say(w, ev.score > 750 ? 'step.endGood' : 'step.endFair', 'plumb');
    ev.done = true;
  }
}

function bot(w: W, ev: EvState, e: SeatE, skill: Skill): Order {
  if (ev.phase === 'lead') return {};
  const d = dataOf(ev);
  const s = ev.s[e.seat.index];
  const note = d.notes[s.at];
  if (!note) return { aim: [0, 0] };
  if (s.jit === undefined || s.jitFor !== s.at) {
    s.jit = skill.timing ? w.rng('bot').range(-skill.timing * 1.15, skill.timing * 1.15) : 0;
    s.jitFor = s.at;
  }
  const when = note.t + s.jit;
  const want = wantFoot(note.k);
  const near = note.k === 'a' ? -0.5 : note.k === 'd' ? 0.5 : 0;
  const down = ev.t >= when && ev.t < when + 6;
  const order: Order = { aim: [note.t - ev.t < 30 ? near : 0, 0] };
  if (down) {
    if (want === 'l' || want === 'b') order.l = 1;
    if (want === 'r' || want === 'b') order.r = 1;
  }
  return order;
}

function stepActivity(id: string, title: string, phrases: readonly Phrase[], short: boolean): Activity {
  return {
    id, title, station: short ? 'pavilion' : 'annex', shot: short ? 'mat' : 'step', map: 'balance', song: 'song:stepBed', multi: short,
    setup(w, ev) {
      Object.assign(ev.d, { ...buildChart(phrases, gameNumber(w, 'game.step.bpm')), beatAt: 0, outOfTime: 0 });
      for (const e of playing(w, ev)) if (e.seat.kind !== 'ghost') { resetWobble(e.wobble); e.wobble.sway = 0.45; }
      ev.seats.forEach((i) => (ev.s[i] = { at: 0, combo: 0, points: 0, hit: 0, miss: 0, pose: 1, poseT: 0 }));
      if (short) {
        arrangeClass(w, ev);
        return phase(ev, 'lead');
      }
      const c = stationAt(w, 'annex');
      const [e] = playing(w, ev);
      const y = groundAt(w, c.x, c.z + 2);
      ownProp(w, ev, 'prop:stepPlatform', [c.x, y, c.z + 2]);
      const tiles: number[] = [];
      for (let k = 0; k < 6; k++) tiles.push(ownProp(w, ev, 'prop:floorTile', [c.x - 3.75 + k * 1.5, y - 0.2, c.z + 4.4]));
      Object.assign(ev.d, { tiles, tileY: y, tileX: c.x - 3.75, tileZ: c.z + 4.4 });
      standAt(w, e.seat.actor, c.x, c.z + 2, Math.PI);
      const { extras, plumb } = castOf(w);
      if (plumb >= 0) {
        standAt(w, plumb, c.x, c.z - 3, 0);
        setPose(w, plumb, 'RETREAT/Stand', 0);
      }
      extras.slice(0, 3).forEach((id, i) => standAt(w, id, c.x - 3 + i * 3, c.z + 6, Math.PI));
      say(w, 'step.intro', 'plumb');
      phase(ev, 'go');
    },
    step, bot,
    teardown(w) {
      if (!short) castOf(w).extras.slice(0, 3).forEach((id) => setPose(w, id, 'RETREAT/Stand', 0));
    },
  }; // prettier-ignore
}

export const STEP = stepActivity('step', 'Step Class', PHRASES, false);
export const STEP_SHORT = stepActivity('stepS', 'Step Class', [SHORT_PHRASE], true);
