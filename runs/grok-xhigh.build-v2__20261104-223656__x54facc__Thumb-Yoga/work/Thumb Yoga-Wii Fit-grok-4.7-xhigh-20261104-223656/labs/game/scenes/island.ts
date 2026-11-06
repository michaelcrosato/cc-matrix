/**
 * @file Little Fulcrum. A lawn on a sand dome, a pond, a cove, and a guest who can walk.
 * Activities still run on the balance step. The ground mesh stays put. The sea tips against the lean,
 * plaques creep west, and the guest walks downhill.
 */
import {
  addTerrainBody,
  createCharacter,
  defineComponent,
  defineProp,
  defineScene,
  defineTerrain,
  getTerrain,
  physicsOf,
  playClip,
  spawnActor,
  spawnProp,
  type Intents,
  type World,
} from '../../../engine/sim-api';
import '../cast/clips';
import { boot, frame, retreatActions } from './driver';
import { actOf, flowOf } from './events/kit';
import { posesFor } from './events/pose';

defineTerrain('terrain:fulcrum', {
  size: [60, 60],
  cell: 4,
  origin: [-120, 0, -120],
  seed: 4,
  height: 0,
  ridges: 0,
  high: 7,
  materials: ['material:sand', 'material:sand', 'material:lawn'],
  hills: [
    { at: [0, 0], radius: 110, height: 11 },
    { at: [10, -6], radius: 22, height: 4 },
    { at: [24, 18], radius: 16, height: -3.2 },
    { at: [0, -78], radius: 30, height: -6 },
  ],
  flats: [
    { rect: [-14, -14, 14, 14], height: 9.2, margin: 8 },
    { rect: [-34, -2, -16, 16], height: 8.4, margin: 6 },
    { rect: [16, 8, 34, 28], height: 7.6, margin: 6 },
    { rect: [-8, -48, 10, -28], height: 6.2, margin: 6 },
    { rect: [32, 0, 52, 16], height: 8.8, margin: 5 },
  ],
});

defineProp('prop:sea', {
  description: 'The sea. It is flat, and it pretends to breathe.',
  parts: [
    {
      name: 'water',
      geometry: 'geometry:box',
      params: { width: 280, height: 0.35, depth: 280 },
      material: 'material:sea',
    },
  ],
});

defineProp('prop:mat', {
  description: 'A round mat.',
  parts: [
    {
      name: 'disc',
      geometry: 'geometry:frustum',
      params: { radiusTop: 1.15, radiusBottom: 1.2, height: 0.08, radialSegments: 16, smooth: true },
      material: 'material:sand',
    },
  ],
});

defineProp('prop:cairn', {
  description: 'Pebbles that are not spent.',
  parts: [
    {
      name: 'a',
      geometry: 'geometry:roundedBox',
      params: { width: 0.7, height: 0.28, depth: 0.5, radius: 0.08 },
      material: 'material:sand',
    },
    {
      name: 'b',
      geometry: 'geometry:roundedBox',
      params: { width: 0.5, height: 0.22, depth: 0.38, radius: 0.08 },
      material: 'material:lawn',
      position: [0.05, 0.28, 0],
    },
    {
      name: 'c',
      geometry: 'geometry:roundedBox',
      params: { width: 0.32, height: 0.18, depth: 0.26, radius: 0.06 },
      material: 'material:sand',
      position: [-0.02, 0.48, 0.02],
    },
  ],
});

/** A place a guest can walk up to and begin. */
const STATIONS: readonly { id: string; x: number; z: number }[] = [
  { id: 'morning', x: 0, z: 8 },
  { id: 'pose-a', x: 10, z: 2 },
  { id: 'pond', x: 24, z: 16 },
  { id: 'garden', x: -18, z: 12 },
  { id: 'paddle', x: 0, z: -36 },
  { id: 'line', x: -26, z: 6 },
  { id: 'group', x: -8, z: -6 },
  { id: 'tilt', x: 40, z: 8 },
];

/** Plaques. Each day past the first they sit four centimetres further west. */
const PLAQUES: readonly { x: number; z: number; text: string }[] = [
  { x: 6, z: -4, text: 'plaque.want' },
  { x: -6, z: 14, text: 'plaque.moved' },
  { x: 16, z: -8, text: 'plaque.flamingo' },
  { x: -12, z: -12, text: 'plaque.gulls' },
  { x: 8, z: 12, text: 'notice.even' },
  { x: -4, z: -16, text: 'notice.lawn' },
];

/** Hidden pebbles. They join the cairn. They are not a shop. */
const PEBBLES: readonly { x: number; z: number }[] = [
  { x: 18, z: -14 },
  { x: -22, z: -8 },
  { x: 8, z: 22 },
  { x: -30, z: 18 },
];

/** An actor row the pilot can push. */
defineComponent('posed', {
  description: '1 once the guest is wearing the lean clips.',
  fields: { on: { type: 'number', default: 0, description: '1 after the leans are playing.' } },
});

interface Body {
  id: number;
  actor: { x: number; y: number; z: number; intents: { move?: readonly [number, number] } };
  role?: { who: string };
  posed?: { on: number };
  clips?: { state?: { slots?: { clip: string; t: number }[] } };
}

/** A placed thing. */
interface Spot {
  id: number;
  mark: { x: number; y: number; z: number; kind: string; text: string; taken: number; follow: number };
}

/** The sea's drawn position. `q` is the counter-rotation the dress writes. */
interface Sea {
  sceneProp: { x: number; y: number; z: number; prop: string; q: [number, number, number, number] };
}

/** The island lean the sea and the slope both read. */
interface Lean {
  island: { tiltX: number; tiltZ: number; base: number };
}

/** Distance on the lawn. */
function flat(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** The island lean, if the day has spawned. */
function leanOf(w: World): Lean['island'] | undefined {
  const rows = w.query('island') as unknown as Lean[];
  return rows[0]?.island;
}

/**
 * Sea quaternion for a lean in degrees. tiltX rotates about Z (west), tiltZ about X.
 * q = qz * qx. tiltX > 0 and tiltZ = 0 leaves q[2] negative.
 */
function seaTurn(tiltX: number, tiltZ: number): [number, number, number, number] {
  const ax = (-tiltZ * Math.PI) / 180;
  const az = (-tiltX * Math.PI) / 180;
  const sx = Math.sin(ax / 2);
  const cx = Math.cos(ax / 2);
  const sz = Math.sin(az / 2);
  const cz = Math.cos(az / 2);
  return [cz * sx, sz * sx, sz * cx, cz * cx];
}

/** The pose clip and how far through it the class is. Enter and the scored hold both move `t`. */
function poseScrub(w: World): { clip: string; t: number } | undefined {
  const flow = flowOf(w);
  if (!flow.event.startsWith('pose')) return undefined;
  const act = actOf(w);
  const poses = posesFor(act.text || flow.event);
  const pose = poses[act.pose] ?? poses[0];
  if (!pose) return undefined;
  const clip = `RETREAT/${pose.id.charAt(0).toUpperCase()}${pose.id.slice(1)}`;
  if (act.phase >= 2) return { clip, t: 1 };
  if (act.phase === 0) return { clip, t: Math.min(1, act.left / (4 * 60)) };
  const seconds = pose.hold || Number(w.settings.get('game.pose.hold')) || 12;
  const steps = Math.max(1, Math.round(seconds * 60));
  return { clip, t: Math.min(1, act.left / steps) };
}

/** The guest, if the cast has spawned. */
function guest(w: World): Body | undefined {
  const rows = w.query('actor') as unknown as Body[];
  return rows.find((row) => row.role?.who === 'guest');
}

/** Stands one still person. No clips. The mat is the performance. */
function person(w: World, who: string, x: number, z: number, yaw: number): void {
  spawnActor(w, {
    at: [x, 40, z],
    yaw,
    player: false,
    character: createCharacter({ speed: 0 }),
    components: { role: { who } },
  });
}

/** Puts the island, the sea, the cast and the hidden pebbles into the world. */
function furnish(w: World): void {
  addTerrainBody(physicsOf(w), getTerrain('terrain:fulcrum'));
  spawnProp(w, { prop: 'prop:sea', at: [0, 2, 0], yaw: 0 });
  spawnProp(w, { prop: 'prop:cairn', at: [-3, 0, 3], yaw: 0 });
  for (const spot of [
    [0, 2],
    [3, 2],
    [-3, 2],
    [0, 5],
  ] as const) {
    spawnProp(w, { prop: 'prop:mat', at: [spot[0], 0, spot[1]], yaw: 0 });
  }
  spawnProp(w, { prop: 'prop:pillar', at: [-6, 0, -4], yaw: 0 });
  spawnProp(w, { prop: 'prop:pillar', at: [6, 0, -4], yaw: 0 });
  spawnProp(w, { prop: 'prop:bench', at: [4, 0, -8], yaw: 0.2 });
  spawnProp(w, { prop: 'prop:bench', at: [-4, 0, 14], yaw: -0.2 });
  for (const station of STATIONS) {
    w.spawn({ mark: { x: station.x, y: 1.2, z: station.z, kind: 'station', text: station.id, taken: 0, follow: 0 } });
  }
  for (const plaque of PLAQUES) {
    w.spawn({ mark: { x: plaque.x, y: 1.1, z: plaque.z, kind: 'plaque', text: plaque.text, taken: 0, follow: 0 } });
  }
  for (let i = 0; i < PEBBLES.length; i += 1) {
    const pebble = PEBBLES[i];
    if (!pebble) continue;
    w.spawn({ mark: { x: pebble.x, y: 0.3, z: pebble.z, kind: 'pebble', text: `pebble:${i}`, taken: 0, follow: 0 } });
  }
  spawnActor(w, {
    at: [0, 40, 6],
    player: false,
    yaw: Math.PI,
    character: createCharacter({ speed: 5.5 }),
    anim: { build: 'build:retreat' },
    clips: {
      sets: ['clipset:retreat'],
      play: { clip: 'RETREAT/Nothing', speed: 0, hold: true, walk: true, loop: false },
    },
    components: { role: { who: 'guest' }, posed: { on: 0 } },
  });
  person(w, 'plumb', 2.2, 4, Math.PI);
  person(w, 'tare', -2.2, 5, 0);
  person(w, 'gerald', 8, -2, 1);
  person(w, 'bex', -8, 0, 0.4);
  person(w, 'nan', 5, 10, 2);
  w.systems.add('retreat.dress', dress, { phase: 'rules' });
}

/** Sea bob, plaque creep, pebble pickup, and the pose scrub. Runs after the clips have stepped. */
function dress(w: World): void {
  const lean = leanOf(w);
  const q = seaTurn(lean?.tiltX ?? 0, lean?.tiltZ ?? 0);
  for (const row of w.query('sceneProp') as unknown as Sea[]) {
    if (row.sceneProp.prop !== 'prop:sea') continue;
    row.sceneProp.y = 2 + 0.06 * Math.sin(w.time * 0.35);
    row.sceneProp.q = q;
  }
  const day = Math.max(1, flowOf(w).day);
  const west = (day - 1) * 0.04;
  for (const spot of w.query('mark') as unknown as Spot[]) {
    if (spot.mark.kind !== 'plaque') continue;
    const home = PLAQUES.find((plaque) => plaque.text === spot.mark.text);
    if (home) spot.mark.x = home.x - west;
  }
  const who = guest(w);
  if (!who) return;
  const flow = flowOf(w);
  if (flow.mode === 'roam') {
    for (const spot of w.query('mark') as unknown as Spot[]) {
      if (spot.mark.kind !== 'pebble' || spot.mark.taken) continue;
      if (flat(who.actor.x, who.actor.z, spot.mark.x, spot.mark.z) < 1.5) {
        spot.mark.taken = 1;
        flow.pebbles += 1;
        flow.line = 'find.pebble';
      }
    }
  }
  scrub(w, who);
}

/** Writes the lean and the current pose onto the clip slots. The scored hold lives in `left`, not `hold`. */
function scrub(w: World, who: Body): void {
  if (!who.posed?.on) {
    playClip(w, who.id, 'RETREAT/LeanR', { speed: 0, hold: true, walk: true, additive: true, loop: false });
    playClip(w, who.id, 'RETREAT/LeanL', { speed: 0, hold: true, walk: true, additive: true, loop: false });
    playClip(w, who.id, 'RETREAT/LeanF', { speed: 0, hold: true, walk: true, additive: true, loop: false });
    playClip(w, who.id, 'RETREAT/LeanB', { speed: 0, hold: true, walk: true, additive: true, loop: false });
    if (who.posed) who.posed.on = 1;
  }
  const pose = poseScrub(w);
  let slots = who.clips?.state?.slots;
  if (pose && !slots?.some((slot) => slot.clip === pose.clip)) {
    playClip(w, who.id, pose.clip, { speed: 0, hold: true, walk: true, loop: false });
    slots = who.clips?.state?.slots;
  }
  if (!slots) return;
  const rows = w.query('wobble') as unknown as { wobble: { x: number; y: number; seat: number } }[];
  const body = rows.find((row) => row.wobble.seat === 0)?.wobble;
  const x = body?.x ?? 0;
  const y = body?.y ?? 0;
  for (const slot of slots) {
    if (slot.clip === 'RETREAT/LeanR') slot.t = Math.max(0, x);
    if (slot.clip === 'RETREAT/LeanL') slot.t = Math.max(0, -x);
    if (slot.clip === 'RETREAT/LeanF') slot.t = Math.max(0, y);
    if (slot.clip === 'RETREAT/LeanB') slot.t = Math.max(0, -y);
    if (pose && slot.clip === pose.clip) slot.t = pose.t;
  }
}

/** Walks the guest while the day is open, and names the station underfoot. */
function roam(w: World, intents: Intents): void {
  const flow = flowOf(w);
  const who = guest(w);
  if (!who) return;
  const act = actOf(w);
  const onTerrace = flow.event === 'tilt' && act.phase === 1;
  if (flow.mode !== 'roam' && flow.mode !== 'title' && !onTerrace) {
    who.actor.intents = { move: [0, 0] };
    return;
  }
  const move = intents.move;
  let mx = move?.[0] ?? 0;
  let my = move?.[1] ?? 0;
  if (flow.mode === 'roam' || onTerrace) {
    const tiltX = leanOf(w)?.tiltX ?? 0;
    mx -= Math.sin((tiltX * Math.PI) / 180);
  }
  const reach = Math.hypot(who.actor.x, who.actor.z);
  if (reach > 78) {
    mx = -who.actor.x / reach;
    my = -who.actor.z / reach;
  }
  who.actor.intents = { move: [mx, my] };
  if (flow.mode !== 'roam') return;
  let near = '';
  let best = 3.2;
  for (const spot of w.query('mark') as unknown as Spot[]) {
    if (spot.mark.kind !== 'station') continue;
    const d = flat(who.actor.x, who.actor.z, spot.mark.x, spot.mark.z);
    if (d < best) {
      best = d;
      near = spot.mark.text;
    }
  }
  act.text = near;
}

/** The island scene. The page boots this. Tests that score the week boot the bench instead. */
export const island = defineScene('game:island', {
  description: 'Little Fulcrum. Walk the lawn. Begin the day from a mat, a plaque, or the programme.',
  terrain: 'terrain:fulcrum',
  physics: true,
  setup(w) {
    boot(w);
    furnish(w);
  },
  step(w, intents) {
    frame(w, intents);
    roam(w, intents);
  },
  actions: retreatActions,
});

export default island;
