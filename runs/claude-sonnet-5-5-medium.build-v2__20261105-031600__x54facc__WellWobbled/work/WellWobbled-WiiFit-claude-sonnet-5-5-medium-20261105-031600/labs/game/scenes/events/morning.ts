/**
 * @file Morning Check at Tare's Platform (about 75 s): a yes/no question, then Still Ring (12 s), Reach (six targets,
 * up to 24 s), One Foot (8 s). Score is 1000 x s, and `ageOf` turns it into the Wobble Age (18 to 82).
 * @example
 * ageOf(1, 1.3); // 18
 */
import { botSeat, type Bot } from '../bot/players';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

/** Wobble Age from s (0-1): 18 to 82. */
export const ageOf = (s: number, k: number): number => Math.round(18 + 64 * Math.pow(1 - clamp(s, 0, 1), k));
const A = { inR: 1, allR: 2, idx: 3, hold: 4, rtime: 5, inF: 6, allF: 7, foot: 8, order: 10 };
/** The six reach targets in a seeded order (angles); registers a[10..15] hold the order. */
function target(c: Ctx): [number, number] {
  const k = c.run.a[A.order + c.run.a[A.idx]] ?? 0;
  const ang = (k * Math.PI) / 3;
  return [Math.sin(ang) * 0.5, Math.cos(ang) * 0.5];
}

export const morning: Activity = {
  id: 'morning',
  title: 'Morning Check',
  station: 'plaza',
  camera: 'front',
  map: 'balance',
  seconds: 75,
  hasShort: false,
  setup(c) {
    const rng = c.w.rng('check');
    const order = [0, 1, 2, 3, 4, 5];
    for (let i = 5; i > 0; i--) {
      const j = rng.int(0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((v, i) => (c.run.a[A.order + i] = v));
    c.run.a[A.foot] = rng.chance(0.5) ? 1 : 2;
    go(c.run, 'ask');
    say(c.w, 'tare', 'tare.check.welcome');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    if (run.phase === 'ask') {
      if (a[0] > secs(4) || (me.seat.act && a[0] > 20)) {
        go(run, 'ring');
        say(c.w, 'tare', 'tare.check.ring');
      }
    } else if (run.phase === 'ring') {
      const r = a[0] > secs(8) ? 0.16 : 0.22;
      a[A.allR] += 1;
      if (b.r < r) a[A.inR] += 1;
      if (a[0] >= secs(12)) {
        go(run, 'reach');
        say(c.w, 'tare', 'tare.check.reach');
      }
    } else if (run.phase === 'reach') {
      const [tx, ty] = target(c);
      a[A.rtime] += 1;
      if (Math.hypot(b.x - tx, b.y - ty) < 0.16) a[A.hold] += 1;
      else a[A.hold] = Math.max(0, a[A.hold] - 2);
      if (a[A.hold] >= secs(0.5)) {
        a[A.hold] = 0;
        a[A.idx] += 1;
        c.w.emit('tick', { k: 'reach' });
      }
      if (a[A.idx] >= 6 || a[A.rtime] >= secs(24)) {
        go(run, 'foot');
        b.instMul = 1.6;
        say(c.w, 'tare', a[A.foot] === 1 ? 'tare.check.footL' : 'tare.check.footR');
      }
    } else if (run.phase === 'foot') {
      b.instMul = 1.6;
      const held = a[A.foot] === 1 ? me.seat.fl > 0.5 : me.seat.fr > 0.5;
      a[A.allF] += 1;
      if (held && b.r < 0.3) a[A.inF] += 1;
      if (held) a[A.hold] += 1;
      if (a[A.hold] >= secs(8) || a[0] >= secs(16)) {
        go(run, 'reveal');
      }
    } else if (run.phase === 'reveal') {
      const A_ = a[A.inR] / Math.max(1, a[A.allR]);
      const B_ = a[A.idx] >= 6 ? 1 - a[A.rtime] / secs(24) : (a[A.idx] / 6) * 0.3;
      const C_ = a[A.inF] / Math.max(1, secs(8));
      const s = clamp(0.45 * A_ + 0.3 * clamp(B_, 0, 1) + 0.25 * clamp(C_, 0, 1), 0, 1);
      run.score = Math.round(s * 1000);
      if (a[0] >= secs(1)) run.done = 1;
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    let px = 0,
      py = 0,
      foot = 0;
    if (run.phase === 'reach') [px, py] = target(c);
    if (run.phase === 'foot') foot = a[A.foot];
    if (run.phase === 'ask' && a[0] > 30) me.seat.act = true;
    else me.seat.act = false;
    botSeat(bot, me.wobble, me.seat, px, py, 0, foot);
  },
};
