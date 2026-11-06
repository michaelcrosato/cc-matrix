/**
 * @file Paddle Glide (75 s): stand on a board. Forward lean is speed (`game.paddle.speed`, 6 m/s), side lean steers
 * (1.2 rad/s), feet alternating at about 1.2 Hz give +30%. Twelve buoy gates round the lagoon with seeded jitter; a ferry
 * wake at gate 7 and a crossing turtle at gate 9 shove your balance. A topple is a splash and a 3-second remount.
 * Score: gates x 60 plus up to 280 for time. Sim-side.
 * @example
 * gatePos(0, 0)[0]; // x of the first gate
 */
import { botSeat, type Bot } from '../bot/players';
import { PADDLE } from '../data/courses';
import { go, say, secs, clamp, type Activity, type Ctx } from './types';

const R = {
  x: 1,
  z: 2,
  h: 3,
  gates: 4,
  remount: 5,
  prevL: 6,
  prevR: 7,
  lastFoot: 8,
  lastT: 9,
  boost: 10,
  jit: 11,
  botT: 23,
};
/** Gate `i` on the circuit, with the seeded jitter in registers 12-23 (radians). */
export function gatePos(i: number, jit: number): [number, number] {
  const a = -Math.PI / 2 + (i / PADDLE.gates) * 2 * Math.PI + jit;
  return [PADDLE.centre[0] + Math.cos(a) * PADDLE.radius, PADDLE.centre[1] + Math.sin(a) * PADDLE.radius];
}
const gate = (c: Ctx, i: number): [number, number] => gatePos(i, c.run.b[i] ?? 0);
const wrap = (v: number): number => Math.atan2(Math.sin(v), Math.cos(v));
export const paddle: Activity = {
  id: 'paddle',
  title: 'Paddle Glide',
  station: 'lagoon',
  camera: 'chase',
  map: 'balance',
  seconds: 75,
  hasShort: false,
  setup(c) {
    const rng = c.w.rng('paddle');
    for (let i = 0; i < PADDLE.gates; i++) c.run.b[i] = rng.range(-0.1, 0.1);
    const a = c.run.a;
    const [x0, z0] = gatePos(-0.6, 0);
    a[R.x] = x0;
    a[R.z] = z0;
    a[R.h] = Math.PI / 2 + 0.2;
    go(c.run, 'glide');
    say(c, 'tare', 'tare.paddle.begin');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const s = me.seat;
    const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
      pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
    a[R.prevL] = s.fl;
    a[R.prevR] = s.fr;
    if (pl || pr) {
      const f = pl ? 1 : 2;
      const dt = a[0] - a[R.lastT];
      if (f !== a[R.lastFoot] && dt > 25 && dt < 90) a[R.boost] = 70;
      a[R.lastFoot] = f;
      a[R.lastT] = a[0];
    }
    if (a[R.boost] > 0) a[R.boost] -= 1;
    if (b.toppled) {
      a[R.remount] = secs(PADDLE.remount);
      c.w.emit('splash', { big: 0 });
    }
    if (a[R.remount] > 0) a[R.remount] -= 1;
    else {
      const speed = c.p('game.paddle.speed') * clamp(b.y / 0.7, 0, 1.1) * (a[R.boost] > 0 ? 1.3 : 1);
      a[R.h] += (1.2 * b.x * 1) / 60; // + lean turns toward +x of the heading frame
      a[R.x] += (Math.sin(a[R.h]) * speed) / 60;
      a[R.z] += (Math.cos(a[R.h]) * speed) / 60;
    }
    // gates in order
    const i = a[R.gates];
    if (i < PADDLE.gates) {
      const [gx, gz] = gate(c, i);
      if (Math.hypot(a[R.x] - gx, a[R.z] - gz) < 4.5) {
        a[R.gates] += 1;
        c.w.emit('gate', { n: a[R.gates] });
        if (i === PADDLE.wakeGate) {
          b.vx += 1.6;
          c.w.emit('wake', {});
          say(c, 'tare', 'tare.paddle.wake');
        }
        if (i === PADDLE.turtleGate) {
          b.vy -= 1.4;
          b.vx -= 0.8;
          c.w.emit('turtle', {});
          say(c, 'tare', 'tare.paddle.turtle');
        }
      }
    }
    if (a[R.gates] >= PADDLE.gates || a[0] >= secs(PADDLE.seconds)) {
      const left = clamp((secs(PADDLE.seconds) - a[0]) / secs(40), 0, 1);
      run.score = a[R.gates] * 60 + 280 * (a[R.gates] / PADDLE.gates) * left;
      run.done = 1;
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    let py = 0.6,
      px = 0;
    if (bot.kind === 'idle') py = 0;
    else {
      const i = Math.min(a[R.gates], PADDLE.gates - 1);
      const [gx, gz] = gate(c, i);
      const want = Math.atan2(gx - a[R.x], gz - a[R.z]);
      px = clamp(wrap(want - a[R.h]) * 1.6, -0.5, 0.5);
      if (bot.kind === 'sloppy') py = 0.5;
    }
    botSeat(bot, me.wobble, s, px, py, 0, 0);
    s.fl = 0;
    s.fr = 0;
    if (bot.kind === 'perfect' || bot.kind === 'human') {
      a[R.botT] += 1;
      const ph = a[R.botT] % 50;
      if (ph === 0) s.fl = 1;
      if (ph === 25) s.fr = 1;
      if (ph === 1 || ph === 26) {
        s.fl = 0;
        s.fr = 0;
      }
      if (ph < 4 && ph >= 0 && ph !== 25) s.fl = ph < 4 ? 1 : 0;
      if (ph >= 25 && ph < 29) {
        s.fl = 0;
        s.fr = 1;
      }
    }
    void run;
  },
};
