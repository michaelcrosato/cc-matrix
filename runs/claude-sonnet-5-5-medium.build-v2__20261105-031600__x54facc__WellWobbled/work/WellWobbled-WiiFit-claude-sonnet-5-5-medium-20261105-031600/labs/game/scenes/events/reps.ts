/**
 * @file Reps Hall (about 90 s, three exercises): a band moves at the tempo (`game.reps.tempo`, 3 s a rep); stick depth moves
 * your marker and scrubs the body. Stay within 0.2 of the band to bank the rep. Deep Knees (10), Polite Push-Ups (8, hold
 * both feet), Side Lunges (10, alternate sides). The band speeds up and the sway rises near the end; near the finish the
 * counter cheats ("9 of 10" becomes "10 of 11"). Score: mean rep accuracy. Sim-side.
 * @example
 * EXERCISES[0].n; // 10
 */
import { botSeat, type Bot } from '../bot/players';
import { actorId, setPose, clearPose } from '../cast';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

export const EXERCISES = [
  { n: 10, clip: 'DeepKnee' },
  { n: 8, clip: 'PushUp' },
  { n: 8, clip: 'SideLunge' },
] as const;
const R = { ex: 1, rep: 2, within: 3, repT: 4, accSum: 5, reps: 6, banked: 7, shown: 8, of: 9, depth: 10 };
const tempoSteps = (c: Ctx): number => {
  const e = EXERCISES[c.run.a[R.ex]];
  const late = c.run.a[R.rep] >= e.n * 0.66 ? 0.85 : 1;
  return Math.round(secs(c.p('game.reps.tempo')) * late * (c.run.short ? 0.7 : 1));
};
/** The band 0..1 at step `t` of a rep of `len` steps: starts standing, bottoms out mid-rep. */
export const bandAt = (t: number, len: number): number => 0.5 - 0.5 * Math.cos((6.2832 * t) / len);
function side(c: Ctx): number {
  return c.run.a[R.rep] % 2 === 0 ? 1 : -1;
}
function depthOf(c: Ctx): number {
  const { x, y } = c.me.wobble;
  const e = c.run.a[R.ex];
  if (e === 0) return clamp(-y / 0.6, 0, 1);
  if (e === 1) return c.me.seat.fl > 0.5 && c.me.seat.fr > 0.5 ? clamp(-y / 0.6, 0, 1) : 0;
  return clamp((x * side(c)) / 0.6, 0, 1);
}
function begin(c: Ctx): void {
  const a = c.run.a;
  a[R.rep] = 0;
  a[R.repT] = 0;
  a[R.within] = 0;
  a[R.shown] = 0;
  a[R.of] = EXERCISES[a[R.ex]].n;
  go(c.run, 'do');
  say(c, 'plumb', `plumb.reps.${a[R.ex]}`);
}
export const reps: Activity = {
  id: 'reps',
  title: 'Reps Hall',
  station: 'annex',
  camera: 'side',
  map: 'balance',
  seconds: 90,
  hasShort: false,
  setup(c) {
    c.run.a[R.ex] = 0;
    begin(c);
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const e = EXERCISES[a[R.ex]];
    if (run.phase === 'do') {
      const len = tempoSteps(c);
      a[R.repT] += 1;
      me.wobble.swayMul = a[R.rep] >= e.n * 0.66 ? 1.5 : 1;
      me.wobble.instMul = 1;
      const d = depthOf(c);
      const band = bandAt(a[R.repT], len);
      a[R.depth] = d;
      if (Math.abs(d - band) <= 0.2) a[R.within] += 1;
      const id = actorId(c.w, me.cast.who);
      if (c.lead && id >= 0) setPose(c.w, id, e.clip, d, 0, 0);
      if (a[R.repT] >= len) {
        const acc = a[R.within] / len;
        a[R.accSum] += acc;
        a[R.reps] += 1;
        if (acc >= 0.6) {
          a[R.banked] += 1;
          c.w.emit('rep', { n: a[R.rep] + 1, of: e.n });
        }
        a[R.rep] += 1;
        a[R.repT] = 0;
        a[R.within] = 0;
        // the counter cheats near the finish: "9 of 10" becomes "10 of 11"
        const left = e.n - a[R.rep];
        a[R.of] = left <= 2 && left > 0 ? e.n + 1 : e.n;
        a[R.shown] = left <= 2 ? a[R.rep] + 1 : a[R.rep];
        if (left === 4) say(c, 'plumb', 'plumb.reps.lying');
        if (a[R.rep] >= e.n) go(run, 'rest');
      }
    } else if (run.phase === 'rest') {
      const id = actorId(c.w, me.cast.who);
      if (c.lead && id >= 0) setPose(c.w, id, '', 0, 0, 0);
      if (a[0] >= secs(1.5)) {
        if (a[R.ex] >= 2) {
          run.score = (a[R.accSum] / Math.max(1, a[R.reps])) * 1000;
          run.done = 1;
          if (id >= 0 && c.lead) clearPose(c.w, id);
        } else {
          a[R.ex] += 1;
          begin(c);
        }
      }
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    let px = 0,
      py = 0;
    if (run.phase === 'do') {
      const len = tempoSteps(c);
      const band = bandAt(a[R.repT] + bot.delay, len); // a thumb reads the band ahead of time: it leads by its own delay
      if (a[R.ex] === 2) px = side(c) * band * 0.6;
      else py = -band * 0.6;
    }
    botSeat(bot, me.wobble, me.seat, px, py, 0, run.phase === 'do' && a[R.ex] === 1 ? 3 : 0);
  },
};
