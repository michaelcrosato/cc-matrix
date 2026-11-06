/**
 * @file The Gull and the Frog: small people on the same rig as everyone else, in bodies of their own. They go where
 * activities send them, land on you at the worst moment, and go away. The Gull flaps while it travels; the Frog hops.
 *
 * Game code, sim-side.
 *
 * @example
 * // critterGo(c, 'frog', x, y, z);
 */
import { spawnCast } from '../cast/roster';
import type { GameWorld } from './components';

/** Where each waits, off stage. */
const AWAY = { gull: [40, 30, -90], frog: [-73, 3, -10] } as const;

/** How each is made. */
const MAKE = {
  gull: { body: 'body:gull', build: 'build:gull', speed: 9, small: true },
  frog: { body: 'body:frog', build: 'build:frog', speed: 3, small: true },
} as const;

/** Stands one critter: returns its entity id. */
export function spawnCritter(w: GameWorld, kind: 'gull' | 'frog', name: string, at: readonly number[]): number {
  const critter = {
    kind,
    goalX: at[0],
    goalY: at[1],
    goalZ: at[2],
    look: 0,
    speed: MAKE[kind].speed,
    away: true,
    tick: 0,
  };
  const id = spawnCast(w, name, at[0], at[1], at[2], 0, { ...MAKE[kind], extra: { critter } });
  return id;
}

/** Spawns the two. */
export function spawnCritters(w: GameWorld): void {
  spawnCritter(w, 'gull', 'gull', AWAY.gull);
  spawnCritter(w, 'frog', 'frog', AWAY.frog);
}

/** The three Gulls who judge Cliff Plunge, waiting off stage on the island. */
export function spawnJudges(w: GameWorld): void {
  for (let g = 0; g < 3; g++) spawnCritter(w, 'gull', `judge${g}`, AWAY.gull);
}

/** One step of each. */
export function stepCritters(w: GameWorld): void {
  for (const e of w.query('critter', 'cast')) {
    const { critter: k, cast } = e;
    k.tick += 1;
    const [gx, gy, gz] = k.away ? AWAY[k.kind] : [k.goalX, k.goalY, k.goalZ];
    const [dx, dy, dz] = [gx - cast.x, gy - cast.y, gz - cast.z];
    const d = Math.hypot(dx, dy, dz);
    const step = Math.min(d, (k.away ? k.speed * 1.5 : k.speed) * w.dt);
    const scale = d > 1e-6 ? step / d : 0;
    const going = d > 0.05;
    const hop = k.kind === 'frog' && going ? Math.abs(Math.sin(k.tick * 0.2)) * 0.18 : 0;
    Object.assign(cast, {
      hold: true,
      x: cast.x + dx * scale,
      y: cast.y + dy * scale + hop * 0.1,
      z: cast.z + dz * scale,
    });
    if (going && Math.hypot(dx, dz) > 0.05) cast.yaw = Math.atan2(dx, dz);
    else if (!going) cast.yaw = k.look;
    if (k.kind === 'gull') {
      cast.pose = going ? 'Flap' : 'Perch';
      cast.poseT = going ? k.tick * 0.09 : 1;
    }
  }
}
