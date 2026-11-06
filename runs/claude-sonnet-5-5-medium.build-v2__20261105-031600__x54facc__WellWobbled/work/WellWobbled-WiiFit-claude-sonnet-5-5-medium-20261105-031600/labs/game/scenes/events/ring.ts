/**
 * @file Still Ring (the Morning Check's first test, as a class of its own for rounds): stay inside a ring of r = 0.22 that
 * narrows to 0.16 for the last quarter. Score: the share of steps inside, scaled to 1000. Sim-side.
 * @example
 * ring.seconds; // 20
 */
import { botSeat, type Bot } from '../bot/players';
import { go, secs, type Activity } from './types';

export const ring: Activity = {
  id: 'ring',
  title: 'Still Ring',
  station: 'pavilion',
  camera: 'mat',
  map: 'balance',
  seconds: 20,
  hasShort: true,
  setup(c) {
    go(c.run, 'hold');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const total = secs(run.short ? 20 : 30);
    const r = a[0] > total * 0.75 ? 0.16 : 0.22;
    a[2] += 1;
    if (me.wobble.r < r) a[1] += 1;
    if (a[0] >= total) {
      run.score = Math.min(1, (a[1] / a[2]) * 1.05) * 1000;
      run.done = 1;
    }
  },
  bot(c, bot: Bot) {
    botSeat(bot, c.me.wobble, c.me.seat, 0, 0, 0, 0);
  },
};
