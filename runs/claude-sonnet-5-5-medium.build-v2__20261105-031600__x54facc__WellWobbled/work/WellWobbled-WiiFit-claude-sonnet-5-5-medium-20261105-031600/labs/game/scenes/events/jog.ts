/**
 * @file Island Jog (about 150 s): follow Gerald round the coast path, a ring of flags past every landmark. Lean steers, lean
 * forward runs, alternating feet at about 2.5 Hz gives +35% speed. Stay within 8 m of him (the Pace Ribbon). Score: the
 * share of time in the ribbon. At the end Gerald says: "Nice weather for it." Sim-side.
 * @example
 * ringPoint(0)[0]; // x of the first flag
 */
import { botSeat, type Bot } from '../bot/players';
import { JOG } from '../data/courses';
import { groundAt } from '../data/world';
import { actorId, placeCast, placeGuest } from '../cast';
import { clamp, go, say, secs, type Activity } from './types';

const R = {
  gx: 1,
  gz: 2,
  gh: 3,
  flag: 4,
  x: 5,
  z: 6,
  h: 7,
  inRib: 8,
  all: 9,
  prevL: 10,
  prevR: 11,
  lastEdge: 12,
  boost: 13,
  kb: 14,
};
/** The flags: for each of 12 headings, march out from the summit until the ground falls to the shore, and stand 8 m inside. */
const ring: [number, number][] = [];
export function ringPoint(k: number): [number, number] {
  if (ring.length === 0) {
    for (let i = 0; i < JOG.flags; i++) {
      const th = (i / JOG.flags) * 2 * Math.PI;
      let r = 20;
      while (r < 130 && groundAt(Math.sin(th) * r, -Math.cos(th) * r) > JOG.shore) r += 1;
      ring.push([Math.sin(th) * (r - 9), -Math.cos(th) * (r - 9)]);
    }
  }
  return ring[((k % JOG.flags) + JOG.flags) % JOG.flags];
}
const wrap = (v: number): number => Math.atan2(Math.sin(v), Math.cos(v));
export const jog: Activity = {
  id: 'jog',
  title: 'Island Jog',
  station: 'plaza',
  camera: 'chase',
  map: 'balance',
  seconds: 150,
  hasShort: false,
  setup(c) {
    const a = c.run.a;
    const [x0, z0] = ringPoint(0);
    const [x1, z1] = ringPoint(1);
    a[R.gx] = x0;
    a[R.gz] = z0;
    a[R.flag] = 1;
    a[R.gh] = Math.atan2(x1 - x0, z1 - z0);
    a[R.x] = x0 - Math.sin(a[R.gh]) * 3;
    a[R.z] = z0 - Math.cos(a[R.gh]) * 3;
    a[R.h] = a[R.gh];
    if (c.lead) {
      placeGuest(c.w, [a[R.x], groundAt(a[R.x], a[R.z]), a[R.z]], a[R.h]);
      placeCast(c.w, 'gerald', x0, z0, a[R.gh]);
    }
    go(c.run, 'run');
    say(c, 'tare', 'tare.jog.begin');
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    const s = me.seat;
    // Gerald walks the ring at a steady pace, one lap
    const [fx, fz] = ringPoint(a[R.flag]);
    const gd = Math.hypot(fx - a[R.gx], fz - a[R.gz]);
    if (gd < 1.5) {
      a[R.flag] += 1;
      if (a[R.flag] > JOG.flags) {
        a[R.flag] = JOG.flags;
      }
    }
    const [nx, nz] = ringPoint(a[R.flag]);
    if (a[R.flag] <= JOG.flags) {
      a[R.gh] = Math.atan2(nx - a[R.gx], nz - a[R.gz]);
      a[R.gx] += (Math.sin(a[R.gh]) * JOG.geraldSpeed) / 60;
      a[R.gz] += (Math.cos(a[R.gh]) * JOG.geraldSpeed) / 60;
    }
    // the guest: lean steers and runs; feet alternating at ~2.5 Hz boost
    const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
      pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
    a[R.prevL] = s.fl;
    a[R.prevR] = s.fr;
    if (pl || pr) {
      if (a[0] - a[R.lastEdge] <= 28) a[R.kb] = 50;
      a[R.lastEdge] = a[0];
    }
    if (a[R.kb] > 0) a[R.kb] -= 1;
    a[R.h] += (1.8 * clamp(b.x, -1, 1)) / 60;
    const v = 4.4 * (b.y > 0.25 ? 1 : 0.35) * (a[R.kb] > 0 ? 1.35 : 1);
    const nxp = a[R.x] + (Math.sin(a[R.h]) * v) / 60,
      nzp = a[R.z] + (Math.cos(a[R.h]) * v) / 60;
    if (groundAt(nxp, nzp) > 2.4) {
      a[R.x] = nxp;
      a[R.z] = nzp;
    }
    if (c.lead && a[0] % 2 === 0) {
      const id = actorId(c.w, 'guest');
      void id;
      placeGuest(c.w, [a[R.x], groundAt(a[R.x], a[R.z]), a[R.z]], a[R.h]);
      placeCast(c.w, 'gerald', a[R.gx], a[R.gz], a[R.gh]);
    }
    const d = Math.hypot(a[R.x] - a[R.gx], a[R.z] - a[R.gz]);
    a[R.all] += 1;
    if (d <= JOG.ribbon) a[R.inRib] += 1;
    if ((a[R.flag] >= JOG.flags && gd < 3) || a[0] >= secs(JOG.seconds)) {
      run.score = (a[R.inRib] / Math.max(1, a[R.all])) * 1000;
      run.done = 1;
      say(c, 'gerald', 'gerald.end');
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    let px = 0,
      py = 0;
    if (bot.kind !== 'idle') {
      const d = Math.hypot(a[R.gx] - a[R.x], a[R.gz] - a[R.z]);
      const want = Math.atan2(a[R.gx] - a[R.x], a[R.gz] - a[R.z]);
      px = clamp(wrap(want - a[R.h]) * 1.2, -0.7, 0.7);
      py = d > 3 ? 0.7 : 0.1;
      if (bot.kind === 'sloppy') py = d > 4 ? 0.6 : 0.1;
    }
    botSeat(bot, me.wobble, s, px, py, 0, 0);
    s.fl = 0;
    s.fr = 0;
    void run;
  },
};
