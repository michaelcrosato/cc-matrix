/**
 * @file Pose Class (about 2.5 min, three poses): Plumb demonstrates (4 s, skippable), you enter the pose by following a
 * guide dot on the disc (progress scrubs the body into the pose), hold it in the seat ring with the breath, then rest.
 * Three classes (A, B, C) share this module; the pose table is data/poses.ts. Score: 1000 x (inRing x (1 - w) + sync x w)
 * minus 60 per topple, averaged over the class. Sim-side.
 * @example
 * poseA.title; // 'Pose Class A'
 */
import { botSeat, type Bot } from '../bot/players';
import { CLASSES, POSES, type PoseDef } from '../data/poses';
import { actorId, setPose, clearPose } from '../cast';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = { idx: 1, u: 2, inAll: 3, inRing: 4, syncSum: 5, tops0: 6, sum: 7, held: 8, second: 9, enterT: 10, last: 11 };
const defOf = (c: Ctx): PoseDef => POSES[CLASSES[c.run.id][Math.min(CLASSES[c.run.id].length - 1, c.run.a[R.idx])]];
const holdSecs = (c: Ctx, d: PoseDef) => (d.hold ? d.hold : c.p('game.pose.hold'));
/** The guide dot at progress u: from the centre to the seat along a gentle curve. */
export function guide(d: PoseDef, u: number): [number, number] {
  const [sx, sy] = d.seat;
  const bend = 0.22 * Math.sin(Math.PI * u);
  return [sx * u - sy * bend, sy * u + sx * bend];
}
function seatNow(c: Ctx, d: PoseDef): readonly [number, number] {
  return d.seat2 && c.run.a[R.second] ? d.seat2 : d.seat;
}
function begin(c: Ctx): void {
  const d = defOf(c);
  const a = c.run.a;
  Object.assign(a, {
    [R.u]: 0,
    [R.inAll]: 0,
    [R.inRing]: 0,
    [R.syncSum]: 0,
    [R.held]: 0,
    [R.second]: 0,
    [R.enterT]: 0,
  });
  a[R.tops0] = c.me.wobble.topples;
  go(c.run, 'demo');
  say(c, 'plumb', `plumb.demo.${d.id}`);
}
function pose(c: Ctx, progress: number): void {
  const id = actorId(c.w, c.me.cast.who);
  const d = defOf(c);
  if (c.lead && id >= 0) setPose(c.w, id, d.clip, progress, c.me.wobble.x, c.me.wobble.y);
}
export const poseClass = (id: 'poseA' | 'poseB' | 'poseC' | 'poseH', title: string): Activity => ({
  id,
  title,
  station: 'pavilion',
  camera: 'mat',
  map: 'balance',
  seconds: 150,
  hasShort: true,
  setup(c) {
    c.run.a[R.idx] = 0;
    c.run.a[R.sum] = 0;
    begin(c);
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const d = defOf(c);
    b.instMul = d.inst;
    b.swayMul =
      d.sway *
      (run.id === 'poseB' && d.id === 'napkin' ? 1 : 1) *
      (d.climb ? 1 + d.climb * Math.min(1, a[0] / secs(holdSecs(c, d))) : 1);
    if (run.phase === 'demo') {
      pose(c, 0);
      if (a[0] >= secs(4) || (me.seat.act && a[0] > 20)) {
        go(run, 'enter');
        say(c, 'plumb', 'plumb.nowyou');
      }
    } else if (run.phase === 'enter') {
      const u = a[R.u];
      const [gx, gy] = guide(d, u);
      a[R.enterT] += 1;
      if (Math.hypot(b.x - gx, b.y - gy) < 0.18) a[R.u] = Math.min(1, u + 1 / secs(3));
      pose(c, a[R.u]);
      if (a[R.u] >= 1 || a[0] >= secs(10)) {
        if (a[R.u] < 1) say(c, 'plumb', 'plumb.start');
        a[R.u] = 1;
        go(run, 'hold');
        a[R.held] = 0;
      }
    } else if (run.phase === 'hold') {
      const [sx, sy] = seatNow(c, d);
      const ring = d.ring ?? c.p('game.pose.ring');
      const footOk =
        d.foot === 0 ||
        (d.foot === 1 ? me.seat.fl > 0.5 : d.foot === 2 ? me.seat.fr > 0.5 : me.seat.fl > 0.5 && me.seat.fr > 0.5);
      a[R.inAll] += 1;
      a[R.held] += 1;
      if (b.r > 0.001 && Math.hypot(b.x - sx, b.y - sy) < ring && footOk) a[R.inRing] += 1;
      a[R.syncSum] += d.foot === 3 ? (footOk ? 1 : 0) : b.sync;
      pose(c, 1);
      const total = secs(holdSecs(c, d)) * (c.run.short ? 0.6 : 1);
      if (d.seat2 && !a[R.second] && a[R.held] >= total) {
        a[R.second] = 1;
        a[R.held] = 0;
        say(c, 'plumb', 'plumb.comma.other');
      } else if (a[R.held] >= total) {
        go(run, 'rest');
        say(c, 'plumb', 'plumb.rest');
      }
    } else if (run.phase === 'rest') {
      pose(c, 0);
      if (a[0] === 1) {
        const ringShare = a[R.inRing] / Math.max(1, a[R.inAll]);
        const sync = a[R.syncSum] / Math.max(1, a[R.inAll]);
        const s = 1000 * (ringShare * (1 - d.breathW) + sync * d.breathW) - 60 * (b.topples - a[R.tops0]);
        a[R.sum] += clamp(s, 0, 1000);
        c.w.emit('pose', { id: d.id, score: Math.round(s) });
      }
      if (a[0] >= secs(1.5)) {
        a[R.idx] += 1;
        if (a[R.idx] >= CLASSES[run.id].length) {
          run.score = a[R.sum] / CLASSES[run.id].length;
          run.done = 1;
          const id = actorId(c.w, c.me.cast.who);
          if (id >= 0 && c.lead) clearPose(c.w, id);
        } else begin(c);
      }
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const d = defOf(c);
    let px = 0,
      py = 0,
      breath = 0,
      foot = 0;
    me.seat.act = run.phase === 'demo' && a[0] > 30;
    if (run.phase === 'enter') [px, py] = guide(d, a[R.u]);
    if (run.phase === 'hold') {
      [px, py] = seatNow(c, d);
      breath = d.foot === 3 ? 0 : 1;
      foot = d.foot;
      if (d.foot === 3) foot = 3;
      if (d.foot === 1 || d.foot === 2) breath = 0;
    }
    botSeat(bot, me.wobble, me.seat, px, py, breath, foot);
  },
});
export const poseA = poseClass('poseA', 'Pose Class A');
export const poseB = poseClass('poseB', 'Pose Class B');
export const poseC = poseClass('poseC', 'Pose Class C');
export const poseH = poseClass('poseH', 'Heron Class');
