/**
 * @file The pavilion only. Group Class and a hub ghost round live here, without the island's terrain.
 * A ghost is a lean on the next mat. It never moves the local guest.
 */
import { defineProp, defineScene, spawnProp, type Intents, type World } from '../../../engine/sim-api';
import { boot, frame, retreatActions } from './driver';
import type { Act } from './state';

defineProp('prop:round-mat', {
  description: 'One mat in the pavilion.',
  parts: [
    {
      name: 'disc',
      geometry: 'geometry:frustum',
      params: { radiusTop: 1.05, radiusBottom: 1.1, height: 0.06, radialSegments: 16, smooth: true },
      material: 'material:sand',
    },
  ],
});

/** Mats in seat order. Seat 0 is the near one. */
const MATS: readonly (readonly [number, number])[] = [
  [0, 2],
  [-3, 2],
  [3, 2],
  [0, 5.2],
];

/** A ghost row the hub can fill. */
interface Shade {
  ghost: { on: number; x: number; y: number; seat: number; pose: number };
  mark?: { x: number; z: number; y: number; text: string };
}

/** Applies hub leans. Local play does not read them back. */
function applyGhosts(w: World, intents: Intents): void {
  const raw = (intents as Record<string, unknown>)['game:ghosts'];
  const packed = Array.isArray(raw) ? raw : [];
  const rows = w.query('ghost') as unknown as Shade[];
  for (const row of rows) row.ghost.on = 0;
  for (let i = 0; i + 4 < packed.length; i += 5) {
    const seat = packed[i];
    const on = packed[i + 1];
    if (typeof seat !== 'number' || on !== 1) continue;
    const row = rows.find((item) => item.ghost.seat === seat);
    if (!row) continue;
    const x = packed[i + 2];
    const y = packed[i + 3];
    const pose = packed[i + 4];
    row.ghost.on = 1;
    row.ghost.x = typeof x === 'number' ? x : 0;
    row.ghost.y = typeof y === 'number' ? y : 0;
    row.ghost.pose = typeof pose === 'number' ? pose : 0;
    if (row.mark) {
      row.mark.x = MATS[row.ghost.seat]?.[0] ?? 0;
      row.mark.z = (MATS[row.ghost.seat]?.[1] ?? 0) + row.ghost.x;
      row.mark.y = 1 + row.ghost.y;
    }
  }
  const names = (intents as Record<string, unknown>)['game:names'];
  if (!Array.isArray(names)) return;
  for (const row of rows) {
    const label = names[row.ghost.seat];
    if (!row.mark || typeof label !== 'string') continue;
    row.mark.text = row.ghost.on === 1 ? label : '';
  }
}

/** Starts the class. The page calls this when a hub round begins, and when a sofa picks Group Class. */
function go(w: World): void {
  const actions = retreatActions['game.start'];
  actions(w, { event: 'group' });
}

/** The small scene. No terrain, so a session can be ready in time. */
export const round = defineScene('game:round', {
  description: 'Four mats, Plumb, and room for other players to wobble beside you.',
  physics: false,
  setup(w) {
    boot(w);
    MATS.forEach((at, seat) => {
      if (seat === 0) spawnProp(w, { prop: 'prop:round-mat', at: [at[0], 0, at[1]], yaw: 0 });
      else {
        w.spawn({
          ghost: { on: 0, x: 0, y: 0, seat, pose: 0 },
          mark: { x: at[0], y: 1, z: at[1], kind: 'ghost', text: '', taken: 0, follow: 0 },
        });
      }
    });
    w.spawn({ mark: { x: 0, y: 1.6, z: -1.2, kind: 'plumb', text: 'group.mats', taken: 0, follow: 0 } });
  },
  step(w, intents) {
    frame(w, intents);
    applyGhosts(w, intents);
  },
  actions: {
    ...retreatActions,
    'round.go': (w: World) => go(w),
    'round.note': (w: World, args: unknown) => {
      const act = w.query('act')[0] as unknown as { act: Act } | undefined;
      if (!act) return;
      const text = typeof args === 'object' && args && 'text' in args ? String((args as { text: unknown }).text) : '';
      act.act.text = text;
    },
  },
});

export default round;
