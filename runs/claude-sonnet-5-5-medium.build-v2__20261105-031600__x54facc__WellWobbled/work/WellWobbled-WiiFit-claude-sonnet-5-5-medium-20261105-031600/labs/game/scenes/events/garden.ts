/**
 * @file Sand Garden (90 s, five trays): a raked sand tray seen from above. Lean tilts it up to `game.garden.tilt` degrees
 * (the pointer's place on the tray does the same). Marbles obey a 2D integrator written here (slope x
 * `game.garden.gravity`, friction, ridge segments, rakes, holes that catch below `game.garden.sink` speed). Trays are
 * data (data/trays.ts). No sway: this one is about touch. Score: share sunk x 800 plus up to 200 for time left. Sim-side.
 * @example
 * HOLE_R; // 0.17
 */
import { botSeat, type Bot } from '../bot/players';
import { HOLE_R, TRAYS, type Tray } from '../data/trays';
import { STATIONS } from '../data/world';
import { mark } from '../spawn';
import { clamp, go, say, secs, type Activity, type Ctx } from './types';

const R = { tray: 1, sunk: 2, total: 3, left: 4, endT: 5, tiltX: 6, tiltZ: 7 };
const LIM = 1.4;
const MR = 0.1;
/** A marble i's registers in run.b: x, z, vx, vz, state (0 live, 1 sunk, 2 lost). */
const M = (i: number) => i * 6;
function rakeAt(t: Tray['rakes'][number], step: number): [number, number, number, number] {
  const o = Math.sin(6.2832 * t.rate * (step / 60)) * t.amp;
  return t.vertical
    ? [t.x + o, t.z - t.len / 2, t.x + o, t.z + t.len / 2]
    : [t.x - t.len / 2 + o, t.z, t.x + t.len / 2 + o, t.z];
}
function load(c: Ctx): void {
  const a = c.run.a;
  const tray = TRAYS[a[R.tray]];
  const b = c.run.b;
  b.fill(0);
  tray.marbles.forEach((m, i) => {
    b[M(i)] = m[0];
    b[M(i) + 1] = m[1];
  });
  a[R.total] += tray.marbles.length;
  a[R.endT] = 0;
  a[R.left] = 0;
  go(c.run, 'roll');
  for (const id of c.run.ids) if (c.w.has(id)) c.w.despawn(id);
  c.run.ids = tray.marbles.map((m) =>
    mark(c.w, STATIONS.terrace.at[0] + m[0], 7, STATIONS.terrace.at[1] - 2 + m[1], 0.2, 'material:rglass', 'marble'),
  );
  say(c, 'tare', `tare.garden.${a[R.tray]}`);
}
/** Integrates one step of the marbles. Returns how many are still rolling. */
function physics(c: Ctx, tray: Tray, tiltX: number, tiltZ: number): number {
  const b = c.run.b;
  const a = c.run.a;
  const g = c.p('game.garden.gravity');
  const sink = c.p('game.garden.sink');
  const dt = 1 / 60;
  let live = 0;
  const rakes = tray.rakes.map((r) => rakeAt(r, c.run.a[0]));
  const segs = [...tray.ridges, ...rakes];
  for (let i = 0; i < tray.marbles.length; i++) {
    const o = M(i);
    if (b[o + 4] !== 0) continue;
    live += 1;
    b[o + 2] += g * Math.sin((tiltX * Math.PI) / 180) * dt;
    b[o + 3] += g * Math.sin((tiltZ * Math.PI) / 180) * dt;
    const f = Math.exp(-0.9 * dt);
    b[o + 2] *= f;
    b[o + 3] *= f;
    b[o] += b[o + 2] * dt;
    b[o + 1] += b[o + 3] * dt;
    for (const [x1, z1, x2, z2] of segs) {
      const dx = x2 - x1,
        dz = z2 - z1;
      const t = clamp(((b[o] - x1) * dx + (b[o + 1] - z1) * dz) / (dx * dx + dz * dz), 0, 1);
      const px = x1 + dx * t,
        pz = z1 + dz * t;
      const d = Math.hypot(b[o] - px, b[o + 1] - pz);
      if (d < MR + 0.02 && d > 0.0001) {
        const nx = (b[o] - px) / d,
          nz = (b[o + 1] - pz) / d;
        const vn = b[o + 2] * nx + b[o + 3] * nz;
        if (vn < 0) {
          b[o + 2] -= 1.35 * vn * nx;
          b[o + 3] -= 1.35 * vn * nz;
        }
        b[o] = px + nx * (MR + 0.02);
        b[o + 1] = pz + nz * (MR + 0.02);
      }
    }
    for (const [hx, hz] of tray.holes) {
      if (Math.hypot(b[o] - hx, b[o + 1] - hz) < HOLE_R && Math.hypot(b[o + 2], b[o + 3]) < sink) {
        b[o + 4] = 1;
        a[R.sunk] += 1;
        c.w.emit('sink', {});
        break;
      }
    }
    if (b[o + 4] !== 0) continue;
    // the rim, with one gap marbles can leave by
    for (const [axis, sgn] of [
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
    ] as const) {
      const p = b[o + axis];
      if (sgn * p < LIM) continue;
      const along = b[o + (1 - axis)];
      const inGap =
        tray.gap && axis === 0 && (tray.gap.side === 'e') === sgn > 0 && along > tray.gap.z0 && along < tray.gap.z1;
      if (inGap && sgn * p > LIM + 0.1) {
        b[o + 4] = 2;
        c.w.emit('lost', {});
      } else if (!inGap) {
        b[o + axis] = sgn * LIM;
        b[o + 2 + axis] *= -0.4;
      }
    }
  }
  return live;
}
export const garden: Activity = {
  id: 'garden',
  title: 'Sand Garden',
  station: 'terrace',
  camera: 'topdown',
  map: 'garden',
  seconds: 90,
  hasShort: false,
  setup(c) {
    c.run.a[R.tray] = 0;
    load(c);
  },
  step(c) {
    const { run, me } = c;
    const a = run.a;
    a[0] += 1;
    const b = me.wobble;
    b.swayMul = 0;
    b.instMul = 0;
    const max = c.p('game.garden.tilt');
    const day = c.flow.day;
    const bias = day >= 4 ? 0.9 : 0.15; // from Day 4 the marbles roll by themselves
    const tx = clamp(b.x, -1, 1) * max + bias * 0.6,
      tz = -clamp(b.y, -1, 1) * max + bias * 0.3;
    a[R.tiltX] = tx;
    a[R.tiltZ] = tz;
    const tray = TRAYS[a[R.tray]];
    if (run.phase === 'roll') {
      const live = physics(c, tray, tx, tz);
      c.run.ids.forEach((id, i) => {
        const e = c.w.get(id)?.mark;
        if (e) {
          const o = M(i);
          e.x = STATIONS.terrace.at[0] + run.b[o];
          e.z = STATIONS.terrace.at[1] - 2 + run.b[o + 1];
          e.y = run.b[o + 4] === 1 ? 6.5 : 7;
        }
      });
      if (live === 0) a[R.endT] += 1;
      if (a[R.endT] > 60 || a[0] >= secs(tray.seconds)) {
        a[R.left] += Math.max(0, secs(tray.seconds) - a[0]);
        go(run, 'next');
      }
    } else if (run.phase === 'next') {
      if (a[R.tray] >= TRAYS.length - 1) {
        const share = a[R.sunk] / Math.max(1, a[R.total]);
        const maxLeft = secs(TRAYS.reduce((s, t) => s + t.seconds, 0));
        run.score = share * 800 + 200 * share * clamp(a[R.left] / (maxLeft * 0.5), 0, 1);
        run.done = 1;
      } else {
        a[R.tray] += 1;
        load(c);
      }
    }
  },
  bot(c, bot: Bot) {
    const { run, me } = c;
    const a = run.a;
    const tray = TRAYS[a[R.tray]];
    const b = run.b;
    let ux = 0,
      uz = 0;
    if (bot.kind !== 'idle' && run.phase === 'roll') {
      // chase the live marble nearest a free hole with a PD controller on its (delayed) position
      let best = -1,
        bd = 1e9;
      for (let i = 0; i < tray.marbles.length; i++)
        if (b[M(i) + 4] === 0) {
          const d = Math.hypot(b[M(i)], b[M(i) + 1]);
          if (d < bd || best < 0) {
            bd = d;
            best = i;
          }
        }
      if (best >= 0) {
        const o = M(best);
        let hi = 0,
          hd = 1e9;
        tray.holes.forEach((h, k) => {
          const d = Math.hypot(h[0] - b[o], h[1] - b[o + 1]);
          if (d < hd) {
            hd = d;
            hi = k;
          }
        });
        const [hx, hz] = tray.holes[hi];
        // proportional-derivative on the marble: a lag (alpha) stands in for a thumb's reaction time
        const kp = 1.6,
          kd = 0.9;
        const tx = clamp(kp * (hx - b[o]) - kd * b[o + 2], -1, 1),
          tz = clamp(kp * (hz - b[o + 1]) - kd * b[o + 3], -1, 1);
        const alpha = bot.kind === 'perfect' ? 1 : bot.kind === 'human' ? 0.2 : 0.1;
        a[20] += (tx - a[20]) * alpha;
        a[21] += (tz - a[21]) * alpha;
        ux = a[20];
        uz = a[21];
      }
    }
    botSeat(bot, me.wobble, me.seat, ux * 0.9, -uz * 0.9, 0, 0);
    me.seat.fl = 0;
    me.seat.fr = 0;
  },
};
