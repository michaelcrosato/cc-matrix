/**
 * @file Step Class (about 100 s): rhythm on a step platform, three phrases from data/charts.ts. Notes are steps on the
 * beat (timing in sim steps, never audio time). Windows: Perfect +-`game.step.perfect`, Good +-`game.step.good` steps;
 * combo adds up to x1.5. The class behind you follows your combo. Score: points over the possible, 0-1000. Sim-side.
 * @example
 * step.seconds; // 100
 */
import { newBot, noise, type Bot } from '../bot/players';
import { PHRASES, parseChart } from '../data/charts';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = {
  phrase: 1,
  pts: 2,
  max: 3,
  combo: 4,
  best: 5,
  prevL: 6,
  prevR: 7,
  start: 8,
  hit: 9,
  miss: 10,
  nextNote: 11,
  pressAt: 12,
};
/** The sim step at which note `i` of the phrase falls. */
const noteAt = (c: Ctx, i: number): number =>
  c.run.a[R.start] + Math.round((i * 3600) / (PHRASES[c.run.a[R.phrase]].bpm * c.p('game.step.bpm')));
const notes = (c: Ctx): string[] => parseChart(PHRASES[c.run.a[R.phrase]].chart);
function startPhrase(c: Ctx): void {
  const a = c.run.a;
  a[R.nextNote] = 0;
  go(c.run, 'play');
  a[0] = 0;
  a[R.start] = secs(2);
  c.run.b.fill(0);
  a[R.max] += notes(c).filter((n) => n !== '.').length;
  say(c, 'plumb', `plumb.step.${a[R.phrase]}`);
}
/** Whether the note's kind is satisfied by this press: L/R feet, B both, l/r a side lean and a foot. */
function matches(note: string, pl: boolean, pr: boolean, lean: number): boolean {
  if (note === 'L') return pl && !pr;
  if (note === 'R') return pr && !pl;
  if (note === 'B') return pl && pr;
  if (note === 'l') return (pl || pr) && lean < -0.3;
  if (note === 'r') return (pl || pr) && lean > 0.3;
  return false;
}
export const stepClass: Activity = {
  id: 'step',
  title: 'Step Class',
  station: 'annex',
  camera: 'behind',
  map: 'balance',
  seconds: 100,
  hasShort: true,
  setup(c) {
    c.run.a[R.phrase] = 0;
    c.run.a[R.pts] = 0;
    c.run.a[R.max] = 0;
    startPhrase(c);
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const s = me.seat;
    const perfect = c.p('game.step.perfect'),
      good = c.p('game.step.good');
    const list = notes(c);
    const res = run.b;
    const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
      pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
    a[R.prevL] = s.fl;
    a[R.prevR] = s.fr;
    const lean = me.wobble.x;
    // a press resolves the nearest unresolved note within the Good window (both feet may come a step apart)
    const pressed = pl || pr;
    if (pressed) {
      let hit = -1;
      for (let i = a[R.nextNote]; i < list.length; i++) {
        if (list[i] === '.' || res[i]) continue;
        const dt = a[0] - noteAt(c, i);
        if (dt < -good) break;
        if (Math.abs(dt) <= good && matches(list[i], s.fl > 0.5 || pl, s.fr > 0.5 || pr, lean)) {
          hit = i;
          break;
        }
      }
      if (hit >= 0) {
        const dt = Math.abs(a[0] - noteAt(c, hit));
        const grade = dt <= perfect ? 1 : 0.6;
        a[R.combo] += 1;
        a[R.best] = Math.max(a[R.best], a[R.combo]);
        a[R.hit] += 1;
        a[R.pts] += grade * Math.min(1.5, 1 + a[R.combo] / 40);
        res[hit] = 1;
        c.w.emit('beat', { grade: dt <= perfect ? 'perfect' : 'good', combo: a[R.combo] });
      }
    }
    // notes past the Good window are missed
    for (let i = a[R.nextNote]; i < list.length; i++) {
      if (list[i] === '.' || res[i]) {
        a[R.nextNote] = i + 1;
        continue;
      }
      if (a[0] - noteAt(c, i) > good) {
        a[R.combo] = 0;
        a[R.miss] += 1;
        c.w.emit('miss', {});
        res[i] = 1;
        a[R.nextNote] = i + 1;
      } else break;
    }
    const end = noteAt(c, list.length) + secs(1.5);
    if (a[0] >= end) {
      if (a[R.phrase] >= 2) {
        run.score = clamp((a[R.pts] / Math.max(1, a[R.max] * 1.3)) * 1000, 0, 1000);
        run.done = 1;
      } else {
        a[R.phrase] += 1;
        startPhrase(c);
      }
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    s.fl = 0;
    s.fr = 0;
    s.lx = 0;
    s.ly = 0;
    if (bot.kind === 'idle' || run.phase !== 'play') return;
    const list = PHRASES[a[R.phrase]];
    void list;
    const chart = parseChart(PHRASES[a[R.phrase]].chart);
    const err = bot.kind === 'perfect' ? 0 : bot.kind === 'human' ? 4 : 8; // timing error stands in for delay and jitter
    for (let i = 0; i < chart.length; i++) {
      const note = chart[i];
      if (note === '.') continue;
      const at = a[R.start] + Math.round((i * 3600) / (PHRASES[a[R.phrase]].bpm * c.p('game.step.bpm')));
      const off = Math.round(noise(bot) * err * 0 + (hash(bot.s, i + a[R.phrase] * 97) * 2 - 1) * err);
      if (a[0] >= at + off && a[0] < at + off + 3) {
        if (note === 'L') s.fl = 1;
        else if (note === 'R') s.fr = 1;
        else if (note === 'B') {
          s.fl = 1;
          s.fr = 1;
        } else {
          s.fl = 1;
          s.lx = note === 'l' ? -1 : 1;
        }
      }
    }
  },
};
/** A stable pseudo-random 0..1 for (seed, i): bots must not draw from a stream in a loop that re-runs each step. */
function hash(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
void newBot;
