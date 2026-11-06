/**
 * @file The Great Tilt (about 4 minutes): the finale, in five steps. Storm (a cutscene), Everyone East (a slope push; hold both
 * feet 2 s and release for a Calm Call that makes nearby guests follow; each guest delivered to the East Terrace takes 0.5
 * degrees off), Counterweights (crank two pebble carts with alternating feet while leaning into the slope), The Centre
 * Stone (the tilt is your centre of balance: waves disturb it, breath quiets them, the ring shrinks), and Dawn. Every
 * step is time boxed, so the ending always comes. Score feeds the final remark. The island's geometry never moves:
 * `island.tilt*` are sim values the pilot, props and camera read. Sim-side.
 * @example
 * tilt.title; // 'The Great Tilt'
 */
import { physicsOf } from '../../../../engine/sim-api';
import { botSeat, type Bot } from '../bot/players';
import { groundAt, STATIONS } from '../data/world';
import { actorId, placeCast, placeGuest } from '../cast';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = {
  x: 1,
  z: 2,
  led: 3,
  tilt: 4,
  cart1: 5,
  cart2: 6,
  prevL: 7,
  prevR: 8,
  lastFoot: 9,
  hold: 10,
  lastCall: 11,
  tops: 12,
  syncSum: 13,
  n: 14,
  tiltEnd: 15,
  lurch: 16,
  nanIn: 17,
  ring: 18,
  tiltN: 19,
  endSum: 20,
};
const G = 12;
const gi = (i: number) => i * 6; // guests in run.b: x, z, state (0 drift, 1 following, 2 delivered), followT
const EAST = STATIONS.east.at;
const DOWNHILL: [number, number] = [-0.95, 0.3];
const island = (c: Ctx) => c.w.query('island')[0].island;
function setTilt(c: Ctx, deg: number, dirx: number, dirz: number): void {
  const isl = island(c);
  const m = Math.hypot(dirx, dirz) || 1;
  isl.tilt = deg;
  isl.tiltX = (deg * dirx) / m;
  isl.tiltZ = (deg * dirz) / m;
}
export const tilt: Activity = {
  id: 'tilt',
  title: 'The Great Tilt',
  station: 'plaza',
  camera: 'tilt',
  map: 'balance',
  seconds: 240,
  hasShort: false,
  setup(c) {
    const a = c.run.a;
    const rng = c.w.rng('tilt');
    a[R.x] = STATIONS.plaza.at[0];
    a[R.z] = STATIONS.plaza.at[1] - 4;
    a[R.tilt] = 6;
    a[R.lastCall] = -9999;
    for (let i = 0; i < G; i++) {
      const o = gi(i);
      const ang = (i / G) * 6.2832;
      c.run.b[o] = STATIONS.plaza.at[0] + Math.sin(ang) * 6 + rng.range(-1, 1);
      c.run.b[o + 1] = STATIONS.plaza.at[1] + Math.cos(ang) * 6 + rng.range(-1, 1);
    }
    c.run.b[gi(11)] = EAST[0] + 1;
    c.run.b[gi(11) + 1] = EAST[1];
    c.run.b[gi(11) + 2] = 2;
    a[R.nanIn] = 1; // Nan is already there
    if (c.lead) placeGuest(c.w, [a[R.x], groundAt(a[R.x], a[R.z]), a[R.z]], 0);
    go(c.run, 'storm');
    say(c, 'plumb', 'plumb.tilt.storm');
    c.w.emit('storm', {});
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    const b = me.wobble;
    const s = me.seat;
    const bd = run.b;
    a[0] += 1;
    const isl = island(c);
    const t = run.phase;
    const dir = DOWNHILL;
    if (t === 'storm') {
      isl.storm = Math.min(1, a[0] / secs(10));
      setTilt(c, 6 * Math.min(1, a[0] / secs(6)), dir[0], dir[1]);
      a[R.tilt] = isl.tilt;
      if (a[0] >= secs(20)) {
        go(run, 'east');
        say(c, 'plumb', 'plumb.tilt.east');
      }
    } else if (t === 'east') {
      // slope push on the guest, then the lean walks
      const tilt = a[R.tilt];
      const push = tilt * 0.15;
      const sx = clamp(b.x / 0.9, -1, 1) * 4.4,
        sz = -clamp(b.y / 0.9, -1, 1) * 4.4;
      if (b.recover === 0) {
        a[R.x] += (sx + dir[0] * push) / 60;
        a[R.z] += (sz + dir[1] * push) / 60;
      }
      if (groundAt(a[R.x], a[R.z]) < 2.6) {
        a[R.x] -= (sx + dir[0] * push) / 60;
        a[R.z] -= (sz + dir[1] * push) / 60;
      }
      // Calm Call: hold both feet two seconds, release
      const both = s.fl > 0.5 && s.fr > 0.5;
      if (both) a[R.hold] += 1;
      else {
        if (a[R.hold] >= 120) {
          for (let i = 0; i < G; i++) {
            const o = gi(i);
            if (bd[o + 2] !== 2 && Math.hypot(bd[o] - a[R.x], bd[o + 1] - a[R.z]) < 8) {
              bd[o + 2] = 1;
              bd[o + 3] = secs(40);
            }
          }
          c.w.emit('calm', {});
          a[R.lastCall] = a[0];
        }
        a[R.hold] = 0;
      }
      for (let i = 0; i < G; i++) {
        const o = gi(i);
        if (bd[o + 2] === 2) continue;
        let vx = dir[0] * push * 0.6,
          vz = dir[1] * push * 0.6;
        if (bd[o + 2] === 1) {
          const d = Math.hypot(a[R.x] - bd[o], a[R.z] - bd[o + 1]);
          if (d > 1.8) {
            vx += ((a[R.x] - bd[o]) / d) * 3.4;
            vz += ((a[R.z] - bd[o + 1]) / d) * 3.4;
          }
          bd[o + 3] -= 1;
          if (bd[o + 3] <= 0) bd[o + 2] = 0;
        }
        const nx = bd[o] + vx / 60,
          nz = bd[o + 1] + vz / 60;
        if (groundAt(nx, nz) > 2.6) {
          bd[o] = nx;
          bd[o + 1] = nz;
        }
        if (Math.hypot(bd[o] - EAST[0], bd[o + 1] - EAST[1]) < 5) {
          bd[o + 2] = 2;
          a[R.led] += 1;
          a[R.tilt] = Math.max(0, a[R.tilt] - 0.5);
          c.w.emit('delivered', { n: a[R.led] });
        }
      }
      setTilt(c, a[R.tilt], dir[0], dir[1]);
      if (a[R.led] >= G - 1 || a[0] >= secs(75)) {
        if (a[0] >= secs(75)) say(c, 'plumb', 'plumb.tilt.shuffle');
        go(run, 'carts');
        say(c, 'tare', 'tare.tilt.carts');
      }
    } else if (t === 'carts') {
      const pl = s.fl > 0.5 && a[R.prevL] <= 0.5,
        pr = s.fr > 0.5 && a[R.prevR] <= 0.5;
      a[R.prevL] = s.fl;
      a[R.prevR] = s.fr;
      if (pl || pr) {
        const f = pl ? 1 : 2;
        if (f !== a[R.lastFoot]) {
          const k = b.x > 0.3 ? 0.011 : 0.004;
          if (a[R.cart1] < 1) a[R.cart1] = Math.min(1, a[R.cart1] + k);
          else a[R.cart2] = Math.min(1, a[R.cart2] + k);
          c.w.emit('crank', {});
        }
        a[R.lastFoot] = f;
      }
      const done = (a[R.cart1] >= 1 ? 1 : 0) + (a[R.cart2] >= 1 ? 1 : 0);
      setTilt(c, Math.max(0, a[R.tilt] - done), dir[0], dir[1]);
      if (done >= 2 || a[0] >= secs(45)) {
        a[R.tilt] = Math.max(0, a[R.tilt] - done + (a[0] >= secs(45) ? 0 : 0));
        go(run, 'stone');
        a[R.ring] = 0.4;
        say(c, 'plumb', 'plumb.tilt.stone');
        a[R.tilt] = Math.max(1, a[R.tilt]);
        if (c.lead) placeGuest(c.w, [0, groundAt(0, 0) + 0.6, 0], 0);
      }
    } else if (t === 'stone') {
      const total = secs(60);
      const u = a[0] / total;
      const ring = 0.4 - 0.18 * u;
      a[R.ring] = ring;
      const wave = Math.sin(a[0] * 0.05) * 1.8 * (0.5 + 0.5 * isl.storm);
      b.dx = wave;
      b.dy = Math.cos(a[0] * 0.037) * 1.2;
      const target = 0.5 + 6 * clamp((b.r - ring) / 0.4, 0, 1) + a[R.lurch];
      a[R.tilt] += (target - a[R.tilt]) * 0.04;
      if (b.toppled) {
        a[R.lurch] += 3;
        a[R.tops] += 1;
        say(c, 'plumb', 'plumb.tilt.again');
        c.w.emit('lurch', {});
      }
      a[R.lurch] = Math.max(0, a[R.lurch] - 1 / 60);
      const rr = Math.max(b.r, 0.001);
      setTilt(c, a[R.tilt], b.x / rr, b.y / rr);
      a[R.syncSum] += b.sync;
      a[R.n] += 1;
      if (a[0] > total - secs(10)) {
        a[R.endSum] += a[R.tilt];
        a[R.tiltN] += 1;
      }
      if (a[0] >= total) {
        a[R.tiltEnd] = a[R.endSum] / Math.max(1, a[R.tiltN]);
        go(run, 'dawn');
        isl.storm = 0;
        say(c, 'plumb', 'plumb.tilt.dawn');
        c.w.emit('dawn', {});
      }
    } else if (t === 'dawn') {
      const k = Math.max(0, 1 - a[0] / secs(6));
      setTilt(c, a[R.tilt] * k, 1, 0);
      isl.storm = isl.storm * 0.98;
      if (a[0] === secs(3)) say(c, 'tare', 'tare.tilt.dawn');
      if (a[0] >= secs(8)) {
        const led = a[R.led] / (G - 1);
        run.score =
          1000 *
          (0.4 * clamp(led, 0, 1) +
            0.3 * clamp(1 - a[R.tiltEnd] / 6, 0, 1) +
            0.3 * clamp((a[R.syncSum] / Math.max(1, a[R.n]) - 0.5) / 0.4, 0, 1));
        isl.tilt = 0;
        isl.tiltX = 0;
        isl.tiltZ = 0;
        run.done = 1;
      }
    }
    // loose props slide (loungers, crates, drinks): a per-step impulse downhill
    if (a[0] % 6 === 0 && isl.tilt > 0.05)
      for (const e of (c.w as unknown as { query(n: string): unknown[] }).query('sceneProp') as {
        sceneProp: { body: number };
      }[]) {
        if (e.sceneProp.body >= 0 && c.lead) {
          try {
            physicsOf(c.w).applyImpulse(e.sceneProp.body, [isl.tiltX * 0.06, 0, isl.tiltZ * 0.06]);
          } catch {
            /* fixed bodies take none */
          }
        }
      }
    if (c.lead && (t === 'east' || t === 'carts') && a[0] % 2 === 0) {
      placeGuest(c.w, [a[R.x], groundAt(a[R.x], a[R.z]), a[R.z]], 0);
      const id = actorId(c.w, 'gerald');
      void id;
      placeCast(c.w, 'nan', EAST[0] + 1, EAST[1], 0);
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const s = me.seat;
    const bd = run.b;
    let px = 0,
      py = 0,
      breath = 0;
    s.fl = 0;
    s.fr = 0;
    if (bot.kind === 'idle') {
      botSeat(bot, me.wobble, s, 0, 0, 0, 0);
      return;
    }
    if (run.phase === 'east') {
      // gather the loose guests, call, lead them east; call again for any left behind
      let cx = 0,
        cz = 0,
        loose = 0,
        follow = 0,
        left = 0;
      for (let i = 0; i < G; i++) {
        const o = gi(i);
        if (bd[o + 2] === 2) continue;
        left += 1;
        if (bd[o + 2] === 1) follow += 1;
        else {
          cx += bd[o];
          cz += bd[o + 1];
          loose += 1;
        }
      }
      if (loose) {
        cx /= loose;
        cz /= loose;
      }
      const near = loose > 0 && Math.hypot(cx - a[R.x], cz - a[R.z]) < 5;
      if (a[R.hold] > 0 && a[R.hold] < 125) {
        s.fl = 1;
        s.fr = 1;
      } else if (a[R.hold] === 0 && near && a[0] - a[R.lastCall] > secs(2)) {
        s.fl = 1;
        s.fr = 1;
      } else if (loose > 0 && (follow < left * 0.6 || follow === 0)) {
        const dx = cx - a[R.x],
          dz = cz - a[R.z],
          d = Math.hypot(dx, dz) || 1;
        px = (dx / d) * 0.7;
        py = (-dz / d) * 0.7;
      } else {
        const dx = EAST[0] - a[R.x],
          dz = EAST[1] - a[R.z],
          d = Math.hypot(dx, dz);
        if (d > 3) {
          px = (dx / d) * 0.7;
          py = (-dz / d) * 0.7;
        }
      }
      botSeat(bot, me.wobble, s, px, py, 0, s.fl > 0 ? 3 : 0);
    } else if (run.phase === 'carts') {
      botSeat(bot, me.wobble, s, 0.5, 0, 0, 0);
      s.fl = 0;
      s.fr = 0;
      const ph = a[0] % 16;
      if (ph < 4) s.fl = 1;
      else if (ph >= 8 && ph < 12) s.fr = 1;
    } else {
      breath = run.phase === 'stone' ? 1 : 0;
      botSeat(bot, me.wobble, s, 0, 0, breath, 0);
    }
    void px;
    void py;
  },
};
