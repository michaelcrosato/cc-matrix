/**
 * @file Hoop Patrol (60 s): hoops fly in from Tare. Spin your stick in circles: angular speed in the band
 * (`game.hoop.bandMin`..`bandMax` rad/s) keeps every hoop up; outside it they sink and fall. A new hoop every 8 s from a
 * telegraphed side: lean that way within 0.6 s of its arrival to catch it. Up to eight at once. Alternating Q and E at
 * 2.5 Hz or more counts as spinning. Score: hoop-seconds scaled to 1000. Sim-side.
 * @example
 * HOOP_SIDES.length; // 4
 */
import { botSeat, type Bot } from '../bot/players';
import { HOOP } from '../data/courses';
import { clamp, go, say, secs, type Activity } from './types';

export const HOOP_SIDES = HOOP.sides;
const R = {
  omega: 1,
  ang: 2,
  hs: 3,
  n: 4,
  nextAt: 5,
  prevL: 6,
  prevR: 7,
  lastEdge: 8,
  kb: 9,
  caught: 10,
  missed: 11,
  botAng: 12,
  sideNow: 13,
  teleT: 14,
};
const H = (i: number) => i * 4; // per hoop in run.b: state (0 none, 1 incoming, 2 up, 3 fallen), height, side, timer
const SIDE_VEC: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, 1],
  [0, -1],
];
export const hoop: Activity = {
  id: 'hoop',
  title: 'Hoop Patrol',
  station: 'hoop',
  camera: 'front',
  map: 'balance',
  seconds: 60,
  hasShort: true,
  setup(c) {
    c.run.a[R.nextAt] = secs(2);
    go(c.run, 'spin');
    say(c, 'tare', 'tare.hoop.begin');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const s = me.seat;
    const bd = run.b;
    b.swayMul = 0.4;
    const sx = s.lx + s.mx * 2,
      sy = s.ly + s.my * 2;
    const ang = Math.atan2(sy, sx); // the thumb's own angle, not the body's lagging one
    if (Math.hypot(sx, sy) > 0.4) {
      let d = ang - a[R.ang];
      d = Math.atan2(Math.sin(d), Math.cos(d));
      a[R.omega] = a[R.omega] * 0.9 + Math.abs(d * 60) * 0.1;
      a[R.ang] = ang;
    } else a[R.omega] *= 0.95;
    const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
      pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
    a[R.prevL] = s.fl;
    a[R.prevR] = s.fr;
    if (pl || pr) {
      if (a[0] - a[R.lastEdge] <= 24) a[R.kb] = 40;
      a[R.lastEdge] = a[0];
    }
    if (a[R.kb] > 0) a[R.kb] -= 1;
    const inBand = (a[R.omega] >= c.p('game.hoop.bandMin') && a[R.omega] <= c.p('game.hoop.bandMax')) || a[R.kb] > 0;
    const total = secs(run.short ? 35 : HOOP.seconds);
    if (a[0] >= a[R.nextAt] && a[R.n] < HOOP.max && a[0] < total - secs(4)) {
      const o = H(a[R.n]);
      bd[o] = 1;
      bd[o + 1] = 0.6;
      bd[o + 2] = c.w.rng('hoop').int(0, 3);
      bd[o + 3] = 0;
      a[R.n] += 1;
      a[R.nextAt] += secs(HOOP.every);
      a[R.sideNow] = bd[o + 2];
      a[R.teleT] = a[0];
      c.w.emit('hoopIncoming', { side: HOOP.sides[bd[o + 2]] });
      say(c, 'tare', 'tare.hoop.incoming');
    }
    for (let i = 0; i < a[R.n]; i++) {
      const o = H(i);
      if (bd[o] === 1) {
        bd[o + 3] += 1;
        const [sx, sy] = SIDE_VEC[bd[o + 2]];
        const lean = b.x * sx + b.y * sy;
        if (bd[o + 3] >= 90 && bd[o + 3] <= 126 && lean > 0.35) {
          bd[o] = 2;
          a[R.caught] += 1;
          c.w.emit('hoopCaught', {});
        } else if (bd[o + 3] > 126) {
          bd[o] = 3;
          a[R.missed] += 1;
          c.w.emit('hoopLost', {});
        }
      } else if (bd[o] === 2) {
        bd[o + 1] = clamp(bd[o + 1] + (inBand ? 0.012 : -0.02), 0, 1);
        a[R.hs] += 1 / 60;
        if (bd[o + 1] <= 0) {
          bd[o] = 3;
          c.w.emit('hoopLost', {});
        }
      }
    }
    if (a[0] >= total) {
      run.score = clamp((a[R.hs] / 150) * 1000, 0, 1000);
      run.done = 1;
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    const bd = run.b;
    let px = 0,
      py = 0;
    if (bot.kind !== 'idle') {
      const rate = bot.kind === 'perfect' ? 7 : bot.kind === 'human' ? 6.5 : 5.6;
      const rad = bot.kind === 'sloppy' ? 0.7 : 0.85;
      let lean = false;
      for (let i = 0; i < a[R.n]; i++)
        if (bd[H(i)] === 1 && bd[H(i) + 3] >= 70 && bd[H(i) + 3] <= 120) {
          const [sx, sy] = SIDE_VEC[bd[H(i) + 2]];
          px = sx * 0.85;
          py = sy * 0.85;
          lean = true;
        }
      if (!lean) {
        a[R.botAng] += rate / 60;
        px = Math.cos(a[R.botAng]) * rad;
        py = Math.sin(a[R.botAng]) * rad;
      } else a[R.botAng] = Math.atan2(me.wobble.y, me.wobble.x);
    }
    botSeat(bot, me.wobble, s, px, py, 0, 0);
    s.fl = 0;
    s.fr = 0;
    if (bot.kind !== 'idle') {
      s.lx = (px / 0.9) * 1;
      s.ly = (py / 0.9) * 1;
    }
    void run;
  },
};
