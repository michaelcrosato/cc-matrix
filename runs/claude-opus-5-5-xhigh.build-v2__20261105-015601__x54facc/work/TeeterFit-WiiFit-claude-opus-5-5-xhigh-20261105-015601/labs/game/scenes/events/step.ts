/**
 * @file Step Class (PLAN.md section 6): rhythm on a step platform. Footprints scroll to a hit line on the HUD, floor tiles
 * light in the world. Timing is in sim steps, never audio time. Every seat plays; the guests behind you follow your
 * combo: lose it and they fall out of time, politely.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'step');
 */
import { timingError, type Player } from '../bot/players';
import { parseChart, PHRASES, SHORT_PHRASE, slotsOf } from '../data/charts';
import { ANNEX_OFFSETS, MAT_OFFSETS } from '../data/stations';
import { castOf, enter, floorShape, propFor, say, standSeats, steps } from './kit';
import type { Activity, Ctx, SeatEntity } from './types';

/** A note on the sim's clock. */
interface TimedNote {
  at: number;
  kind: 'L' | 'R' | 'B' | '<' | '>';
  hit: boolean[];
}

/** One seat's numbers. */
interface StepSeat {
  next: number;
  combo: number;
  best: number;
  value: number;
  perfects: number;
  goods: number;
  misses: number;
  last: string;
  lastT: number;
  pose: string;
  poseT: number;
}

/** The class's state. */
interface StepData {
  notes: TimedNote[];
  beats: number[];
  nextBeat: number;
  end: number;
  seats: StepSeat[];
  tiles: number[];
  litL: number;
  litR: number;
  max: number;
  lead: number;
  lastBeat: number;
  beats2: number;
}

/** Who stands behind you on the island. */
const CLASS = ['gerald', 'bex', 'nan'] as const;
/** The strip each kind of note scrubs. */
const POSE_OF: Readonly<Record<string, string>> = {
  L: 'StepUpL',
  R: 'StepUpR',
  B: 'Jump',
  '<': 'SideStepL',
  '>': 'SideStepR',
};

/** Gives the multiplier for a combo: up to 1.5. */
const multiplier = (combo: number): number => 1 + 0.5 * Math.min(1, combo / 16);

/** Lays the phrases out on the clock. */
function layOut(c: Ctx, lead: number): { notes: TimedNote[]; beats: number[]; end: number } {
  const scale = c.w.settings.get<number>('game.step.bpm');
  const phrases = c.a.short ? [SHORT_PHRASE] : PHRASES;
  const notes: TimedNote[] = [];
  const beats: number[] = [];
  let start = lead;
  for (const phrase of phrases) {
    const half = (c.w.hz * 60) / (phrase.bpm * scale * 2);
    for (const note of parseChart(phrase.chart))
      notes.push({ at: Math.round(start + note.slot * half), kind: note.kind, hit: [false, false, false, false] });
    const slots = slotsOf(phrase.chart);
    for (let slot = 0; slot < slots; slot += 2) beats.push(Math.round(start + slot * half));
    start += Math.round(slots * half) + Math.round(half * 4);
  }
  return { notes, beats, end: start };
}

/** Whether a press fits a note's kind. */
function fits(kind: TimedNote['kind'], e: SeatEntity): boolean {
  const lean = e.seat.lx + e.wobble.mx;
  const { pfl, pfr, fl, fr } = e.seat;
  if (kind === 'L') return pfl;
  if (kind === 'R') return pfr;
  if (kind === 'B') return (pfl && fr >= 0.5) || (pfr && fl >= 0.5);
  if (kind === '<') return pfl && lean < -0.35;
  return pfr && lean > 0.35;
}

/** One seat's step: its presses against the notes in its windows; its misses. */
function stepSeat(c: Ctx, d: StepData, e: SeatEntity): void {
  const s = d.seats[e.seat.index];
  const { w, a } = c;
  const now = a.t;
  const good = w.settings.get<number>('game.step.good');
  const perfect = w.settings.get<number>('game.step.perfect');
  const i0 = e.seat.index;
  while (s.next < d.notes.length && !d.notes[s.next].hit[i0] && d.notes[s.next].at + good < now) {
    s.combo = 0;
    s.misses += 1;
    s.next += 1;
    if (i0 === c.seats[0].seat.index) w.emit('stepMiss', { seat: i0 });
  }
  if (e.seat.pfl || e.seat.pfr) {
    for (let n = s.next; n < d.notes.length; n++) {
      const note = d.notes[n];
      if (note.at > now + good) break;
      if (note.hit[i0] || !fits(note.kind, e)) continue;
      const off = Math.abs(note.at - now);
      const grade = off <= perfect ? 'perfect' : 'good';
      note.hit[i0] = true;
      s.combo += 1;
      s.best = Math.max(s.best, s.combo);
      s.value += (grade === 'perfect' ? 1 : 0.6) * multiplier(s.combo);
      if (grade === 'perfect') s.perfects += 1;
      else s.goods += 1;
      s.last = grade;
      s.lastT = now;
      s.pose = POSE_OF[note.kind];
      s.poseT = 1;
      if (n === s.next) s.next += 1;
      if (i0 === c.seats[0].seat.index) w.emit('stepHit', { seat: i0, grade, kind: note.kind, combo: s.combo });
      break;
    }
    while (s.next < d.notes.length && d.notes[s.next].hit[i0]) s.next += 1;
  }
  s.poseT = Math.max(0, s.poseT - w.dt * 5);
  const cast = w.get(e.seat.actor)?.cast;
  if (cast) {
    cast.pose = s.pose;
    cast.poseT = s.poseT;
    cast.leanX = e.wobble.x * 0.8;
    cast.leanY = 0;
  }
}

/** Step Class. */
export const step: Activity = {
  id: 'step',
  title: 'Step Class',
  station: 'annex',
  map: 'actionMap:balance',
  shot: 'step',
  wobble: true,
  setup(c) {
    const lead = steps(c, c.a.short ? 6 : 4);
    const { notes, beats, end } = layOut(c, lead);
    const d: StepData = {
      notes,
      beats,
      end,
      nextBeat: 0,
      seats: [0, 1, 2, 3].map(() => ({
        next: 0,
        combo: 0,
        best: 0,
        value: 0,
        perfects: 0,
        goods: 0,
        misses: 0,
        last: '',
        lastT: -999,
        pose: 'StepUpL',
        poseT: 0,
      })),
      tiles: [],
      litL: 0,
      litR: 0,
      lead,
      lastBeat: -999,
      beats2: 0,
      max: notes.reduce((sum, _n, i) => sum + multiplier(i + 1), 0),
    };
    c.a.data = d as unknown as Record<string, unknown>;
    const offsets = c.round ? MAT_OFFSETS : ANNEX_OFFSETS;
    standSeats(c, offsets, Math.PI, c.round ? 0.05 : 0.27);
    for (const e of c.seats) {
      e.wobble.swayMul = 0.25;
      e.wobble.usesBreath = false;
      const [ox, oz] = offsets[e.seat.index];
      const [x, z] = [c.station.x + ox, c.station.z + oz];
      if (!c.round) propFor(c, { prop: 'prop:stepBlock', at: [x, c.ground(x, z) + 0.1, z], yaw: 0 });
      d.tiles.push(
        floorShape(c, '', x - 0.6, c.ground(x, z) + 0.16, z + 0.8),
        floorShape(c, '', x + 0.6, c.ground(x, z) + 0.16, z + 0.8),
      );
    }
    if (!c.round) {
      // The class behind you: they follow your combo, and fall out of time politely.
      const [gx, gz] = [c.station.x + offsets[0][0], c.station.z + offsets[0][1]];
      CLASS.forEach((who, i) => {
        const person = castOf(c.w, who);
        const [x, z] = [gx + 3 + i * 3, gz - 2.2];
        if (person)
          Object.assign(person.cast, {
            hold: true,
            x,
            y: c.ground(x, z) + 0.05,
            z,
            yaw: Math.PI,
            pose: 'StepUpL',
            poseT: 0,
          });
      });
    }
    c.hud.disc = false;
    c.hud.feet = true;
    c.hud.title = 'Step Class';
    enter(c, 'play');
    say(c, 'plumb', 'step.start');
  },
  step(c) {
    const d = c.a.data as unknown as StepData;
    const now = c.a.t;
    while (d.nextBeat < d.beats.length && d.beats[d.nextBeat] <= now) {
      c.w.emit('beat', { n: d.nextBeat, at: d.beats[d.nextBeat] });
      d.nextBeat += 1;
      d.lastBeat = now;
      d.beats2 += 1;
    }
    if (!c.round) {
      const leader = d.seats[c.seats[0].seat.index];
      CLASS.forEach((who, i) => {
        const person = castOf(c.w, who);
        if (!person) return;
        const inTime = leader.combo >= (i + 1) * 5;
        // In time they step on the beat; out of time, a polite moment late.
        if (now - d.lastBeat === (inTime ? 0 : 8 + i * 3))
          Object.assign(person.cast, { pose: d.beats2 % 2 ? 'StepUpL' : 'StepUpR', poseT: inTime ? 1 : 0.6 });
        person.cast.poseT = Math.max(0, person.cast.poseT - c.w.dt * 5);
      });
    }
    for (const e of c.seats) stepSeat(c, d, e);
    const me = d.seats[c.seats[0].seat.index];
    // The tiles light in the world for the next note.
    const upcoming = d.notes.find((n) => n.at >= now && n.at <= now + 10);
    c.seats.forEach((_e, i) => {
      const [tileL, tileR] = [d.tiles[i * 2], d.tiles[i * 2 + 1]];
      const ml = c.w.get(tileL)?.matRing;
      const mr = c.w.get(tileR)?.matRing;
      const kind = upcoming?.kind ?? '';
      if (ml) ml.telegraph = kind === 'L' || kind === '<' || kind === 'B' ? 'telegraph:tileL' : '';
      if (mr) mr.telegraph = kind === 'R' || kind === '>' || kind === 'B' ? 'telegraph:tileR' : '';
    });
    // What the lanes need: the next few notes.
    const soon = d.notes.filter((n) => n.at >= now - 12 && n.at <= now + 150).slice(0, 14);
    c.hud.show = {
      notes: soon.map((n) => [n.at - now, n.kind, n.hit[c.seats[0].seat.index] ? 1 : 0]),
      combo: me.combo,
      grade: now - me.lastT < 30 ? me.last : '',
      value: me.value,
      followers: Math.min(3, Math.floor(me.combo / 5)),
    };
    c.hud.meter = 1 - now / Math.max(1, d.end);
    if (now >= d.end) c.a.done = true;
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as StepData;
    const { seat } = e;
    const mem = seat.mem as { note?: number; err?: number; holdL?: number; holdR?: number };
    seat.act = false;
    mem.note ??= 0;
    mem.err ??= 0;
    mem.holdL ??= 0;
    mem.holdR ??= 0;
    if (!player.acts) {
      Object.assign(seat, { fl: 0, fr: 0, lx: 0, ly: 0 });
      return;
    }
    const now = c.a.t;
    const note = d.notes[mem.note];
    seat.lx = 0;
    seat.ly = 0;
    if (note) {
      if (note.kind === '<' && note.at - now < 14) seat.lx = -0.8;
      if (note.kind === '>' && note.at - now < 14) seat.lx = 0.8;
      if (now >= note.at + mem.err) {
        if (note.kind === 'L' || note.kind === '<' || note.kind === 'B') mem.holdL = 5;
        if (note.kind === 'R' || note.kind === '>' || note.kind === 'B') mem.holdR = 5;
        mem.note += 1;
        mem.err = timingError(c.w, seat, player);
      }
    }
    seat.fl = mem.holdL > 0 ? 1 : 0;
    seat.fr = mem.holdR > 0 ? 1 : 0;
    mem.holdL -= 1;
    mem.holdR -= 1;
  },
  score(c, index) {
    const d = c.a.data as unknown as StepData;
    return d.max > 0 ? (1000 * d.seats[index].value) / d.max : 0;
  },
};
