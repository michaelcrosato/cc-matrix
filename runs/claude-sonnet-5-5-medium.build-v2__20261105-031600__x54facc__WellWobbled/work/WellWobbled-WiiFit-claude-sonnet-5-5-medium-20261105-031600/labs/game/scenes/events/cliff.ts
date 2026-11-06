/**
 * @file Cliff Plunge (three dives off a 14 m cliff). Compose: hold the ring and both feet for 4 s to fill power. Go: release
 * both feet as a swinging gauge peaks. Air (about 2 s): lean y spins you, lean x twists you; enter the water within 15
 * degrees of vertical. Three Gulls hold up cards 0-10 (one judge always scores 4); the sum is scaled to 1000. Wait too
 * long at the lip and you slip off anyway, a small splash and low cards. Sim-side.
 * @example
 * gaugeAt(0); // 0.5
 */
import { botSeat, noise, type Bot } from '../bot/players';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = {
  dive: 1,
  power: 2,
  gT: 3,
  theta: 4,
  twist: 5,
  quality: 6,
  sum: 7,
  slip: 8,
  prevBoth: 9,
  err: 10,
  cards: 11,
  relG: 12,
};
export const gaugeAt = (t: number): number => 0.5 + 0.5 * Math.sin((2 * Math.PI * 0.7 * t) / 60);
const wrap180 = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;
function begin(c: Ctx): void {
  const a = c.run.a;
  Object.assign(a, { [R.power]: 0, [R.gT]: 0, [R.theta]: 0, [R.twist]: 0, [R.quality]: 0, [R.slip]: 0 });
  go(c.run, 'compose');
  say(c, 'tare', `tare.cliff.${a[R.dive]}`);
}
function judge(c: Ctx): void {
  const a = c.run.a;
  const rng = c.w.rng('cliff');
  const err = Math.abs(wrap180(a[R.theta]));
  const flip = Math.abs(a[R.theta]) >= 300 ? 0.6 : 0;
  let base = a[R.slip] ? 2.2 : clamp(10 - err / 12 - (1 - a[R.quality]) * 4 - (1 - a[R.power]) * 2 + flip, 0, 10);
  const c1 = clamp(base + rng.range(-0.5, 0.5), 0, 10),
    c2 = clamp(base + rng.range(-0.5, 0.5), 0, 10);
  base = 4;
  a[R.sum] += c1 + c2 + base;
  a[R.err] = err;
  a[R.cards] = c1;
  c.w.emit('cards', { a: Math.round(c1), b: Math.round(c2), c: 4, err: Math.round(err) });
}
export const cliff: Activity = {
  id: 'cliff',
  title: 'Cliff Plunge',
  station: 'cliff',
  camera: 'dive',
  map: 'balance',
  seconds: 60,
  hasShort: false,
  setup(c) {
    c.run.a[R.dive] = 0;
    begin(c);
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const s = me.seat;
    const both = s.fl > 0.5 && s.fr > 0.5;
    if (run.phase === 'compose') {
      if (both && b.r < 0.25) a[R.power] = Math.min(1, a[R.power] + 1 / secs(4));
      else a[R.power] = Math.max(0, a[R.power] - 0.4 / 60);
      if (a[R.power] >= 1) {
        go(run, 'go');
        a[R.gT] = 0;
      }
      if (a[0] >= secs(12)) {
        a[R.slip] = 1;
        a[R.quality] = 0;
        go(run, 'air');
        c.w.emit('splash', { big: 0 });
      }
    } else if (run.phase === 'go') {
      a[R.gT] += 1;
      const g = gaugeAt(a[R.gT]);
      if (!both && a[R.prevBoth]) {
        a[R.quality] = clamp((g - 0.5) * 2, 0, 1);
        a[R.relG] = g;
        go(run, 'air');
        c.w.emit('jump', {});
      }
      if (a[R.gT] >= secs(6)) {
        a[R.quality] = 0.25;
        go(run, 'air');
      }
    } else if (run.phase === 'air') {
      b.swayMul = 0.3;
      if (!a[R.slip]) {
        a[R.theta] += (520 * clamp(b.y, -1, 1)) / 60;
        a[R.twist] += (200 * clamp(b.x, -1, 1)) / 60;
      }
      if (a[0] >= secs(2)) {
        judge(c);
        c.w.emit('splash', { big: 1 });
        go(run, 'cards');
      }
    } else if (run.phase === 'cards') {
      if (a[0] >= secs(3)) {
        a[R.dive] += 1;
        if (a[R.dive] >= 3) {
          run.score = clamp((a[R.sum] / 72) * 1000, 0, 1000);
          run.done = 1;
        } else begin(c);
      }
    }
    a[R.prevBoth] = both ? 1 : 0;
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    botSeat(bot, me.wobble, s, 0, 0, 0, 0);
    s.fl = 0;
    s.fr = 0;
    if (bot.kind === 'idle') return;
    if (run.phase === 'compose') {
      s.fl = 1;
      s.fr = 1;
    }
    if (run.phase === 'go') {
      const target = bot.kind === 'perfect' ? 0.98 : bot.kind === 'human' ? 0.9 : 0.78;
      if (gaugeAt(a[R.gT]) < target) {
        s.fl = 1;
        s.fr = 1;
      }
    }
    if (run.phase === 'air') {
      const rest = 360 - a[R.theta] - (bot.kind === 'perfect' ? 0 : bot.kind === 'human' ? 10 : 30);
      s.ly = clamp(rest / 100, -0.3, 1);
      s.lx = 0;
      void noise;
    }
  },
};
