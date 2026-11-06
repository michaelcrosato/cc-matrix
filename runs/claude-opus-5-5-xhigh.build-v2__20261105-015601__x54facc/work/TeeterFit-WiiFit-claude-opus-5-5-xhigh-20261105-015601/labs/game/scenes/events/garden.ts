/**
 * @file Sand Garden (PLAN.md section 6): a raked sand tray on a stand, seen from above. Lean tilts it up to 12 degrees; the
 * pointer's place on the tray does the same. Marbles obey a little 2D integrator of the game's own (slope, friction,
 * ridges, holes that catch below a speed). No Wobble noise here: this one is about touch.
 *
 * Game code, sim-side.
 *
 * @example
 * // startActivity(w, 'garden');
 */
import type { Player } from '../bot/players';
import { TRAYS, type TrayDef } from '../data/trays';
import { castOf, enter, moveProp, propFor, say, steps } from './kit';
import type { Activity, Ctx } from './types';

/** The tray's half width, m; a marble's radius, m; a hole's catching radius. */
const HALF = 1.17;
const R = 0.055;
const CATCH = 0.12;
/** Rolling friction, 1/s; bounce off rims and ridges. */
const FRICTION = 0.55;
const BOUNCE = 0.45;
/** How long a tray may take, s; how long the whole garden is, s. */
const TRAY_TIME = 18;
const TOTAL = 90;
/** The tray's height over the ground. */
const LIFT = 0.92;

/** A marble's numbers. */
interface Marble {
  x: number;
  z: number;
  vx: number;
  vz: number;
  sunk: boolean;
  prop: number;
  rolling: number;
}

/** The garden's state. */
interface GardenData {
  tray: number;
  tiltX: number;
  tiltZ: number;
  marbles: Marble[];
  sunk: number;
  total: number;
  props: number[];
  trayProp: number;
  ridgeProps: number[];
  rakeProps: number[];
  trayT: number;
  time: number;
  rakes: number[];
  cx: number;
  cz: number;
  cy: number;
  roll: number;
}

/** The turn of the tray, as a quaternion: pitched and rolled by small tilts. */
function tiltQuat(tx: number, tz: number): number[] {
  const [x, z] = [tz * 0.5, -tx * 0.5];
  const w = Math.sqrt(Math.max(0, 1 - x * x - z * z));
  return [x, 0, z, w];
}

/** A point on the tray, in the world, tilted. */
function onTray(d: GardenData, x: number, z: number, up = 0.04): [number, number, number] {
  return [d.cx + x, d.cy + up - x * d.tiltX + z * d.tiltZ, d.cz + z];
}

/** Sets out tray `index`. */
function setOut(c: Ctx, d: GardenData, index: number): void {
  for (const id of [...d.props]) {
    const e = c.w.get(id);
    if (e?.sceneProp) moveProp(c.w, id, 0, -20, 0, 0);
  }
  d.props = [];
  const def = TRAYS[index];
  d.marbles = def.marbles.map(([x, z], i) => {
    const prop = propFor(c, {
      prop: ['prop:marble', 'prop:marbleRed', 'prop:marbleBlue'][i % 3],
      at: [0, -20, 0],
      yaw: 0,
    });
    d.props.push(prop);
    return { x, z, vx: 0, vz: 0, sunk: false, prop, rolling: 0 };
  });
  for (const [x, z] of def.holes) {
    const prop = propFor(c, { prop: 'prop:holeMark', at: [d.cx + x, d.cy + 0.05, d.cz + z], yaw: 0 });
    d.props.push(prop);
  }
  d.ridgeProps = def.ridges.map(([x0, z0, x1, z1]) => {
    const prop = propFor(c, {
      prop: 'prop:ridge',
      at: [d.cx + (x0 + x1) / 2, d.cy + 0.05, d.cz + (z0 + z1) / 2],
      yaw: -Math.atan2(z1 - z0, x1 - x0),
    });
    d.props.push(prop);
    return prop;
  });
  d.rakeProps = def.rakes.map((rake) => {
    const prop = propFor(c, { prop: 'prop:rake', at: [d.cx + rake.x, d.cy + 0.05, d.cz + rake.z], yaw: 0 });
    d.props.push(prop);
    return prop;
  });
  d.rakes = def.rakes.map(() => 0);
  d.trayT = 0;
  c.w.emit('tray', { index });
}

/** Bounces a marble off a segment: a ridge or a rake. */
function bounceSegment(m: Marble, x0: number, z0: number, x1: number, z1: number): boolean {
  const [dx, dz] = [x1 - x0, z1 - z0];
  const len2 = dx * dx + dz * dz || 1;
  const u = Math.max(0, Math.min(1, ((m.x - x0) * dx + (m.z - z0) * dz) / len2));
  const [px, pz] = [x0 + dx * u, z0 + dz * u];
  const [nx, nz] = [m.x - px, m.z - pz];
  const dist = Math.hypot(nx, nz);
  if (dist >= R + 0.04 || dist === 0) return false;
  const [ux, uz] = [nx / dist, nz / dist];
  m.x = px + ux * (R + 0.04);
  m.z = pz + uz * (R + 0.04);
  const vn = m.vx * ux + m.vz * uz;
  if (vn < 0) {
    m.vx -= (1 + BOUNCE) * vn * ux;
    m.vz -= (1 + BOUNCE) * vn * uz;
    return true;
  }
  return false;
}

/** One step of one marble. */
function roll(c: Ctx, d: GardenData, def: TrayDef, m: Marble): void {
  const { w } = c;
  const gravity = w.settings.get<number>('game.garden.gravity');
  const sink = w.settings.get<number>('game.garden.sink');
  m.vx += gravity * d.tiltX * w.dt;
  m.vz -= gravity * d.tiltZ * w.dt;
  const keep = Math.exp(-FRICTION * w.dt);
  m.vx *= keep;
  m.vz *= keep;
  m.x += m.vx * w.dt;
  m.z += m.vz * w.dt;
  let hit = false;
  // The rim: a gap lets a marble through, and it comes back to its start.
  const gap = def.gap;
  if (gap && gap.side === 'S' && m.z > HALF && Math.abs(m.x - gap.at) < gap.half) {
    const [sx, sz] = def.marbles[d.marbles.indexOf(m)];
    Object.assign(m, { x: sx, z: sz, vx: 0, vz: 0 });
    w.emit('marbleLost', {});
    return;
  }
  if (Math.abs(m.x) > HALF) {
    m.x = Math.sign(m.x) * HALF;
    m.vx = -m.vx * BOUNCE;
    hit = true;
  }
  if (Math.abs(m.z) > HALF) {
    m.z = Math.sign(m.z) * HALF;
    m.vz = -m.vz * BOUNCE;
    hit = true;
  }
  for (const [x0, z0, x1, z1] of def.ridges) hit = bounceSegment(m, x0, z0, x1, z1) || hit;
  def.rakes.forEach((rake, i) => {
    const off = Math.sin(d.rakes[i] * rake.speed) * rake.range;
    const [rx, rz] = rake.alongX ? [rake.x + off, rake.z] : [rake.x, rake.z + off];
    hit = bounceSegment(m, rx - rake.half, rz, rx + rake.half, rz) || hit;
  });
  if (hit && Math.hypot(m.vx, m.vz) > 0.2) w.emit('marbleTap', {});
  for (const [hx, hz] of def.holes) {
    if (Math.hypot(hx - m.x, hz - m.z) < CATCH && Math.hypot(m.vx, m.vz) < sink) {
      m.sunk = true;
      d.sunk += 1;
      w.emit('marbleSunk', { n: d.sunk });
      return;
    }
  }
}

/** Sand Garden. */
export const garden: Activity = {
  id: 'garden',
  title: 'Sand Garden',
  station: 'terrace',
  map: 'actionMap:balanceFree',
  shot: 'garden',
  wobble: false,
  setup(c) {
    const { x, z } = c.station;
    const total = TRAYS.reduce((sum, tray) => sum + tray.marbles.length, 0);
    const cy = c.ground(x, z) + LIFT;
    const d: GardenData = { tray: 0, tiltX: 0, tiltZ: 0, marbles: [], sunk: 0, total, props: [], trayProp: -1, ridgeProps: [], rakeProps: [], trayT: 0, time: 0, rakes: [], cx: x, cz: z, cy, roll: 0 }; // prettier-ignore
    c.a.data = d as unknown as Record<string, unknown>;
    propFor(c, { prop: 'prop:trayStand', at: [x, c.ground(x, z), z], yaw: 0 });
    d.trayProp = propFor(c, { prop: 'prop:tray', at: [x, cy, z], yaw: 0 });
    const guest = castOf(c.w, 'guest');
    if (guest)
      Object.assign(guest.cast, {
        hold: true,
        x,
        y: c.ground(x, z),
        z: z + 2.2,
        yaw: Math.PI,
        pose: 'Stoop',
        poseT: 0.6,
      });
    setOut(c, d, 0);
    c.hud.title = 'Sand Garden';
    c.hud.show = { tray: 0 };
    enter(c, 'play');
    say(c, 'plumb', 'garden.start');
  },
  step(c: Ctx) {
    const d = c.a.data as unknown as GardenData;
    const [{ seat }] = c.seats;
    const limit = (c.w.settings.get<number>('game.garden.tilt') * Math.PI) / 180;
    d.time += 1;
    d.trayT += 1;
    let [wantX, wantZ] = [seat.lx, seat.ly];
    if (seat.pointer) [wantX, wantZ] = [seat.px, seat.py];
    const size = Math.hypot(wantX, wantZ);
    if (size > 1) [wantX, wantZ] = [wantX / size, wantZ / size];
    const rate = 5 * c.w.dt;
    d.tiltX += Math.max(-rate * limit, Math.min(rate * limit, wantX * limit - d.tiltX));
    d.tiltZ += Math.max(-rate * limit, Math.min(rate * limit, wantZ * limit - d.tiltZ));
    const def = TRAYS[d.tray];
    def.rakes.forEach((rake, i) => {
      d.rakes[i] += c.w.dt * 2;
      const off = Math.sin(d.rakes[i] * rake.speed) * rake.range;
      const [rx, rz] = rake.alongX ? [rake.x + off, rake.z] : [rake.x, rake.z + off];
      moveProp(c.w, d.rakeProps[i], ...onTray(d, rx, rz, 0.05), 0);
    });
    let speed = 0;
    for (const m of d.marbles) {
      if (!m.sunk) {
        roll(c, d, def, m);
        speed = Math.max(speed, Math.hypot(m.vx, m.vz));
      }
      moveProp(c.w, m.prop, ...(m.sunk ? ([0, -20, 0] as [number, number, number]) : onTray(d, m.x, m.z, 0.05)), 0);
    }
    const q = tiltQuat(d.tiltX, d.tiltZ);
    moveProp(c.w, d.trayProp, d.cx, d.cy, d.cz, q);
    const guest = castOf(c.w, 'guest');
    if (guest) {
      guest.cast.leanX = (d.tiltX / limit) * 0.6;
      guest.cast.leanY = (d.tiltZ / limit) * 0.3;
    }
    c.hud.show = { tray: d.tray, of: TRAYS.length, sunk: d.sunk, total: d.total, speed, tiltX: d.tiltX / limit, tiltZ: d.tiltZ / limit, seconds: Math.max(0, TOTAL - Math.floor(d.time / c.w.hz)) }; // prettier-ignore
    c.hud.meter = 1 - d.time / steps(c, TOTAL);
    c.hud.meterLabel = `Tray ${d.tray + 1} of ${TRAYS.length}`;
    const allIn = d.marbles.every((m) => m.sunk);
    if (allIn || d.trayT >= steps(c, TRAY_TIME)) {
      if (allIn) say(c, 'plumb', 'garden.tray');
      d.tray += 1;
      if (d.tray >= TRAYS.length || d.time >= steps(c, TOTAL)) {
        d.tray = Math.min(d.tray, TRAYS.length - 1);
        c.a.done = true;
      } else setOut(c, d, d.tray);
    }
  },
  bot(c, e, player: Player) {
    const d = c.a.data as unknown as GardenData;
    const { seat } = e;
    seat.act = false;
    if (!player.acts) {
      seat.lx = seat.ly = 0;
      return;
    }
    const def = TRAYS[d.tray];
    const free = d.marbles.findIndex((m) => !m.sunk);
    if (free < 0) return;
    const m = d.marbles[free];
    // Aim for the next free hole, through its waypoint while one is left.
    const taken = new Set(def.holes.map((_h, i) => i).filter((i) => i < d.marbles.filter((k) => k.sunk).length));
    const hole = def.holes.find((_h, i) => !taken.has(i)) ?? def.holes[0];
    const mem = seat.mem as { leg?: number; of?: number };
    if (mem.of !== free * 100 + d.tray) [mem.of, mem.leg] = [free * 100 + d.tray, 0];
    const via = def.via?.[free] ?? [];
    let goal: readonly [number, number] = hole;
    if ((mem.leg ?? 0) < via.length) {
      goal = via[mem.leg ?? 0];
      if (Math.hypot(goal[0] - m.x, goal[1] - m.z) < 0.28) mem.leg = (mem.leg ?? 0) + 1;
    }
    const delay = player.delay;
    const hist = seat.hist as number[];
    hist.push(m.x, m.z, m.vx, m.vz);
    const keep = 4 * (delay + 2);
    if (hist.length > keep) hist.splice(0, hist.length - keep);
    const at = Math.max(0, hist.length - 4 - 4 * delay);
    const [sx, sz, svx, svz] = [hist[at], hist[at + 1], hist[at + 2], hist[at + 3]];
    const kp = player.name === 'perfect' ? 1.6 : player.name === 'human' ? 1 : 0.8;
    const kd = player.name === 'perfect' ? 1.1 : 0.9;
    const jit = player.jitter;
    const rng = c.w.rng('botJitter', seat.index);
    seat.lx = kp * (goal[0] - sx) - kd * svx + (jit ? rng.range(-jit, jit) : 0);
    seat.ly = -(kp * (goal[1] - sz) - kd * svz) + (jit ? rng.range(-jit, jit) : 0);
  },
  score(c) {
    const d = c.a.data as unknown as GardenData;
    const left = Math.max(0, 1 - d.time / steps(c, TOTAL));
    return (800 * d.sunk) / d.total + 200 * left * (d.sunk / d.total);
  },
};
