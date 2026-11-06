/**
 * @file Still Pond (75 s; 45 s in rounds): sit on the jetty at dawn. Composure starts at 1000; the only right input is
 * breathing with the guide (both feet together). A stick past 0.25, any button, a lone foot or mouse movement is "You
 * moved": -`game.pond.penalty`, debounced 1 s. Lures escalate every 6-10 s. Score: Composure x (0.5 + 0.5 x sync), so
 * doing nothing earns exactly Adequate. Sim-side.
 * @example
 * pond.seconds; // 75
 */
import { botSeat, noise, type Bot } from '../bot/players';
import { LURES } from '../data/lures';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = {
  comp: 1,
  lastMove: 2,
  nextLure: 3,
  lureIdx: 4,
  lureEnd: 5,
  syncSum: 6,
  n: 7,
  single: 8,
  moves: 9,
  lureOn: 10,
};
const total = (c: Ctx) => secs(c.run.short ? 45 : 75);
function moved(c: Ctx): boolean {
  const s = c.me.seat;
  const a = c.run.a;
  const lone = Math.abs(s.fl - s.fr) > 0.5;
  a[R.single] = lone ? a[R.single] + 1 : 0;
  return Math.hypot(s.lx, s.ly) > 0.25 || s.act || a[R.single] > 9 || Math.hypot(s.mx, s.my) > 0.12;
}
export const pond: Activity = {
  id: 'pond',
  title: 'Still Pond',
  station: 'pond',
  camera: 'portrait',
  map: 'balance',
  seconds: 75,
  hasShort: true,
  setup(c) {
    const a = c.run.a;
    a[R.comp] = 1000;
    a[R.lastMove] = -999;
    a[R.nextLure] = secs(5) + c.w.rng('pond').int(0, 240);
    go(c.run, 'sit');
    say(c, 'plumb', 'plumb.pond.begin');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    // the lures: a seeded table, escalating
    if (a[0] >= a[R.nextLure] && a[R.lureIdx] < LURES.length) {
      const l = LURES[Math.min(a[R.lureIdx], LURES.length - 1)];
      a[R.lureEnd] = a[0] + secs(l.seconds);
      a[R.lureOn] = 1;
      c.w.emit('lure', { kind: l.kind, line: l.line, index: a[R.lureIdx] });
      a[R.lureIdx] += 1;
      a[R.nextLure] = a[0] + secs(6) + c.w.rng('pond').int(0, 240);
    }
    if (a[R.lureOn] && a[0] >= a[R.lureEnd]) {
      a[R.lureOn] = 0;
      c.w.emit('lureEnd', {});
    }
    if (moved(c) && a[0] - a[R.lastMove] >= 60 && a[0] > 30) {
      a[R.lastMove] = a[0];
      a[R.comp] = Math.max(0, a[R.comp] - c.p('game.pond.penalty'));
      a[R.moves] += 1;
      c.w.emit('moved', { composure: a[R.comp] });
    }
    a[R.syncSum] += me.wobble.sync;
    a[R.n] += 1;
    if (a[0] >= total(c)) {
      const sync = clamp((a[R.syncSum] / Math.max(1, a[R.n]) - 0.55) / 0.4, 0, 1); // standing still already matches half
      run.score = a[R.comp] * (0.5 + 0.5 * sync);
      run.done = 1;
      say(c, 'plumb', 'plumb.pond.end');
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    me.seat.lx = 0;
    me.seat.ly = 0;
    me.seat.act = false;
    me.seat.mx = 0;
    me.seat.my = 0;
    if (bot.kind === 'idle') {
      me.seat.fl = 0;
      me.seat.fr = 0;
      return;
    }
    botSeat(bot, me.wobble, me.seat, 0, 0, 1, 0);
    me.seat.lx = 0;
    me.seat.ly = 0; // never lean: the pond punishes it
    // human-like thumbs sometimes fall for the lure; sloppy ones more often
    const gull = bot.kind === 'human' ? 0.25 : bot.kind === 'sloppy' ? 0.5 : 0;
    if (a[R.lureOn] && a[0] === a[R.lureEnd] - secs(1) && gull > 0 && (noise(bot) + 1) / 2 < gull) me.seat.act = true;
    void run;
  },
};
