/**
 * @file Sand Garden (PLAN.md section 6). A raked tray on a stand, seen from above. Lean tilts it; the mouse pointer's place
 * on the tray does the same. Marbles obey the sim's own 2D integrator: slope times gravity, friction, ridge segments and
 * holes that only catch below a speed. No Wobble noise here: this one is about touch.
 */
import type { Order, Skill } from '../bot/players';
import { TRAYS, type Tray } from '../data/trays';
import { gameNumber } from '../settings';
import { cue, say, type EvState, type W } from '../types';
import { resetWobble } from '../wobble';
import { rankScore } from './mats';
import {
  clamp,
  groundAt,
  moveProp,
  ownProp,
  phase,
  playing,
  standAt,
  stationAt,
  tiltQuat,
  yawQuat,
  type Activity,
} from './kit';
import { setPose } from '../../cast/body';

export const SIDE = 1.5;
const TRAY_STEPS = 1080;
const R = 0.11;
const HOLE_R = 0.17;
const SCALE = 1;

/** One marble: place, speed, sunk flag, where it started. */
interface Marble {
  x: number;
  z: number;
  vx: number;
  vz: number;
  sunk: boolean;
  sx: number;
  sz: number;
  prop: number;
}

interface GardenData {
  tray: number;
  trayT: number;
  rx: number;
  rz: number;
  marbles: Marble[];
  sunk: number;
  total: number;
  holes: number[];
  tp: number;
  cx: number;
  cy: number;
  cz: number;
  rakes: number[];
  ridges: number[];
  pass: number;
}
const dataOf = (ev: EvState): GardenData => ev.d as unknown as GardenData;

/** The rake's segment now. */
function rakeAt(rake: Tray['rakes'][number], tick: number): [number, number, number, number] {
  const k = Math.sin(tick * rake.speed);
  return [
    rake.from[0] + rake.dx * k,
    rake.from[1] + rake.dz * k,
    rake.from[2] + rake.dx * k,
    rake.from[3] + rake.dz * k,
  ];
}

/** Bounces a marble off a segment. */
function bounce(m: Marble, seg: readonly [number, number, number, number]): void {
  const [ax, az, bx, bz] = seg;
  const [dx, dz] = [bx - ax, bz - az];
  const len2 = dx * dx + dz * dz;
  const k = clamp(((m.x - ax) * dx + (m.z - az) * dz) / len2, 0, 1);
  const [px, pz] = [ax + dx * k, az + dz * k];
  const [nx, nz] = [m.x - px, m.z - pz];
  const dist = Math.hypot(nx, nz);
  if (dist >= R + 0.03 || dist === 0) return;
  const [ux, uz] = [nx / dist, nz / dist];
  m.x = px + ux * (R + 0.03);
  m.z = pz + uz * (R + 0.03);
  const vn = m.vx * ux + m.vz * uz;
  if (vn < 0) {
    m.vx -= 1.5 * vn * ux;
    m.vz -= 1.5 * vn * uz;
  }
}

/** One step of one marble. */
function stepMarble(w: W, d: GardenData, tray: Tray, m: Marble): void {
  const dt = 1 / 60;
  const g = gameNumber(w, 'game.garden.gravity');
  m.vx += Math.sin(d.rx) * g * dt;
  m.vz += Math.sin(d.rz) * g * dt;
  m.vx *= 0.988;
  m.vz *= 0.988;
  m.x += m.vx * dt;
  m.z += m.vz * dt;
  for (const seg of tray.ridges) bounce(m, seg);
  for (const rake of tray.rakes) bounce(m, rakeAt(rake, w.tick));
  const edge = SIDE - R;
  const inGap = tray.gap && m.x > tray.gap[0] && m.x < tray.gap[1];
  if (m.z < -edge && inGap) {
    Object.assign(m, { x: m.sx, z: m.sz, vx: 0, vz: 0 });
    cue(w, 'marbleLost');
  }
  if (Math.abs(m.x) > edge) {
    m.x = Math.sign(m.x) * edge;
    m.vx *= -0.45;
  }
  if (Math.abs(m.z) > edge) {
    m.z = Math.sign(m.z) * edge;
    m.vz *= -0.45;
  }
  for (const h of tray.holes) {
    if (Math.hypot(m.x - h[0], m.z - h[1]) < HOLE_R) {
      const speed = Math.hypot(m.vx, m.vz);
      if (speed < gameNumber(w, 'game.garden.sink')) {
        m.sunk = true;
        d.sunk += 1;
        cue(w, 'marbleSink');
      } else {
        // a fast marble hops the lip, and loses a little to it
        m.vx *= 0.92;
        m.vz *= 0.92;
      }
    }
  }
}

function layTray(w: W, ev: EvState): void {
  const d = dataOf(ev);
  for (const m of d.marbles) moveProp(w, m.prop, [0, -30, 0]);
  const tray = TRAYS[d.tray];
  d.marbles.forEach((m, k) => {
    const start = tray.marbles[k];
    if (start) Object.assign(m, { x: start[0], z: start[1], sx: start[0], sz: start[1], vx: 0, vz: 0, sunk: false });
    else m.sunk = true;
  });
  d.trayT = 0;
  say(w, `garden.tray.${d.tray + 1}`, 'tare');
}

/** Tray coordinates to the world, under the tray's tilt. */
function world(d: GardenData, x: number, z: number, lift: number): [number, number, number] {
  return [d.cx + x, d.cy + lift - Math.sin(d.rx) * x - Math.sin(d.rz) * z, d.cz + z];
}

function draw(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const tray = TRAYS[d.tray];
  const q = tiltQuat(d.rz, -d.rx);
  moveProp(w, d.tp, [d.cx, d.cy, d.cz], q);
  d.holes.forEach((id, k) => {
    const h = tray.holes[k];
    moveProp(w, id, h ? world(d, h[0], h[1], 0.012) : [0, -30, 0], q);
  });
  d.ridges.forEach((id, k) => {
    const seg =
      tray.ridges[k] ??
      (tray.rakes[k - tray.ridges.length] ? rakeAt(tray.rakes[k - tray.ridges.length], w.tick) : null);
    if (!seg) return moveProp(w, id, [0, -30, 0]);
    const [mx, mz] = [(seg[0] + seg[2]) / 2, (seg[1] + seg[3]) / 2];
    const yaw = Math.atan2(seg[3] - seg[1], seg[2] - seg[0]);
    moveProp(w, id, world(d, mx, mz, 0.02), yawQuat(-yaw));
  });
  for (const m of d.marbles) moveProp(w, m.prop, m.sunk ? [0, -30, 0] : world(d, m.x, m.z, R * SCALE), [0, 0, 0, 1]);
}

function step(w: W, ev: EvState): void {
  const d = dataOf(ev);
  const [e] = playing(w, ev);
  const max = (gameNumber(w, 'game.garden.tilt') * Math.PI) / 180;
  const sx = clamp(e.seat.input.x + e.wobble.mx, -1, 1);
  const sy = clamp(e.seat.input.y + e.wobble.my, -1, 1);
  d.rx += (sx * max - d.rx) * 0.12;
  d.rz += (-sy * max - d.rz) * 0.12;
  const tray = TRAYS[d.tray];
  for (const m of d.marbles) if (!m.sunk) stepMarble(w, d, tray, m);
  setPose(w, e.seat.actor, 'RETREAT/Nothing', 1);
  draw(w, ev);
  d.trayT += 1;
  const left = d.marbles.filter((m) => !m.sunk).length;
  if (left === 0 || d.trayT >= TRAY_STEPS) {
    if (left === 0) cue(w, 'stamp');
    else cue(w, 'marbleLost');
    d.tray += 1;
    if (d.tray >= TRAYS.length) {
      const time = clamp(1 - ev.total / (TRAY_STEPS * TRAYS.length), 0, 1);
      ev.score = rankScore((d.sunk / d.total) * 800 + time * 200 * (d.sunk / d.total));
      say(w, 'garden.end', 'tare');
      ev.done = true;
      return;
    }
    layTray(w, ev);
  }
}

function bot(w: W, ev: EvState, e: unknown, skill: Skill): Order {
  const d = dataOf(ev);
  const tray = TRAYS[d.tray];
  const m = d.marbles.find((one) => !one.sunk);
  if (!m) return {};
  const holes = tray.holes;
  const goal = holes.reduce((a, b) =>
    Math.hypot(a[0] - m.x, a[1] - m.z) < Math.hypot(b[0] - m.x, b[1] - m.z) ? a : b,
  );
  let aim: readonly [number, number] = goal;
  const key = Math.round(m.sx * 10) * 100 + Math.round(m.sz * 10);
  const state = (e as { seat: { bot: Record<string, number> } }).seat.bot;
  if (state.key !== key) Object.assign(state, { key, way: 0 });
  const way = tray.path?.[state.way];
  if (way) {
    aim = way;
    if (Math.hypot(way[0] - m.x, way[1] - m.z) < 0.28) state.way += 1;
  }
  const kp = skill.name === 'sloppy' ? 0.55 : skill.name === 'human' ? 0.7 : 0.9;
  const kd = skill.name === 'sloppy' ? 0.45 : 0.55;
  const dx = aim[0] - m.x;
  const dz = aim[1] - m.z;
  return { stick: [clamp(dx * kp - m.vx * kd, -1, 1), clamp(-(dz * kp - m.vz * kd), -1, 1)] };
}

export const GARDEN: Activity = {
  id: 'garden', title: 'Sand Garden', station: 'terrace', shot: 'garden', map: 'pointer', song: 'song:hoop',
  setup(w, ev) {
    const c = stationAt(w, 'terrace');
    const [e] = playing(w, ev);
    resetWobble(e.wobble);
    e.wobble.off = true;
    ev.s[e.seat.index] = {};
    const cy = groundAt(w, c.x, c.z) + 0.8;
    const count = Math.max(...TRAYS.map((t) => t.marbles.length));
    const marbles: Marble[] = [];
    for (let k = 0; k < count; k++) marbles.push({ x: 0, z: 0, vx: 0, vz: 0, sunk: false, sx: 0, sz: 0, prop: ownProp(w, ev, 'prop:marble', [0, -30, 0]) });
    const holes = [0, 1].map(() => ownProp(w, ev, 'prop:trayHole', [0, -30, 0]));
    const ridges = [0, 1, 2].map(() => ownProp(w, ev, 'prop:trayRidge', [0, -30, 0]));
    const tp = ownProp(w, ev, 'prop:tray', [c.x, cy, c.z]);
    ownProp(w, ev, 'prop:trayStand', [c.x, cy - 0.8, c.z]);
    Object.assign(ev.d, { tray: 0, trayT: 0, rx: 0, rz: 0, marbles, sunk: 0, total: TRAYS.reduce((n, t) => n + t.marbles.length, 0), holes, tp, cx: c.x, cy, cz: c.z, ridges, rakes: [] });
    standAt(w, e.seat.actor, c.x, c.z + 3.2, Math.PI);
    layTray(w, ev);
    phase(ev, 'tilt');
  },
  step, bot,
}; // prettier-ignore
