/**
 * @file The scene `game:island`: the whole game, on one world. Terrain, sea, the dressed stations, the cast, the four seats.
 * Activities spawn their own bits at their stations and take them away again; the page drives it with scene actions.
 */
import {
  addTerrainBody,
  defineScene,
  physicsOf,
  spawnProp,
  stepCrowdBody,
  getTerrain,
  type World,
} from '../../../engine/sim-api';
import { GUEST_BUILDS, GUEST_SPEED, guestBody, PEOPLE, spawnPerson } from '../cast/people';
import { CAST, castOf } from './cast-ref';
import { DRESSING, HIDDEN_PEBBLES, PLAQUES, BENCHES } from './data/places';
import { setAttract, directorStep } from './director';
import { dropActors, groundAt, moveProp, standAt, tiltQuat } from './events/kit';
import { stepTiltCrowd } from './events/tilt-guests';
import { FLOW_ACTIONS, flowStep } from './flow';
import { pilot } from './pilot';
import '../props';
import './settings';
import { FULCRUM_ID } from './terrain';
import { flowOf, islandOf, say, type C, type W } from './types';
import { seedSway } from './wobble';
import { setLean, setPose } from '../cast/body';
import { rankOf } from './data/days';

/** A pebble on the cairn or a hidden one. */
export const PEBBLE = { description: 'marks' };

const SEA_Y = 2;

function spawnAt(w: W, prop: string, x: number, z: number, yaw = 0, lift = 0): number {
  return spawnProp(w, { prop, at: [x, groundAt(w, x, z) + lift, z], yaw });
}

/** Stands everything on the island once. */
function dress(w: W): void {
  for (const [prop, x, z, yaw] of DRESSING) spawnAt(w, prop, x, z, yaw);
  PLAQUES.forEach((p, k) => {
    const id = spawnAt(w, 'prop:plaque', p[0], p[1], k * 1.3);
    w.spawn({ plaque: { k, id } } as never);
  });
  HIDDEN_PEBBLES.forEach((p, k) => {
    const id = spawnAt(w, 'prop:hiddenPebble', p[0], p[1], k, 0.02);
    w.spawn({ pebble: { k, id } } as never);
  });
  for (const b of BENCHES) spawnAt(w, 'prop:retreatBench', b[0], b[1], b[2]);
  const pondFloor = groundAt(w, -70, -12);
  spawnProp(w, { prop: 'prop:pondWater', at: [-70, pondFloor + 0.9, -12], yaw: 0 });
}

/** Moves things that show the tilt: plaques creep, drinks slide, the sea leans a hair. */
function storyStep(w: W): void {
  const flow = flowOf(w);
  const island = islandOf(w);
  island.seaT += 1 / 60;
  const seaOf = (w.query('seaProp' as never)[0] as unknown as { seaProp: { id: number; near: number } } | undefined)
    ?.seaProp;
  const sea = seaOf?.id;
  if (sea !== undefined && seaOf) {
    const lean = (island.finale ? -island.tiltX : island.tilt * 0.12) * (Math.PI / 180);
    const leanZ = (island.finale ? -island.tiltZ : 0) * (Math.PI / 180);
    const bob = Math.sin(island.seaT * 0.6) * 0.05 - 0.05;
    moveProp(w, sea, [0, SEA_Y + bob, 0], tiltQuat(leanZ, lean));
    const guest = (w.get(castOf(w).guest) as unknown as { actor: { x: number; z: number } }).actor;
    const snap = (v: number) => Math.round(v / 64) * 64;
    moveProp(
      w,
      seaOf.near,
      [
        snap(guest.x) + Math.sin(island.seaT * 0.05) * 2,
        SEA_Y + bob + 0.03,
        snap(guest.z) + ((island.seaT * 0.1) % 16),
      ],
      tiltQuat(leanZ, lean),
    );
  }
  for (const e of w.query('plaque' as never) as unknown as { plaque: { k: number; id: number } }[]) {
    const p = PLAQUES[e.plaque.k];
    const creep = 1 + (Math.min(flow.day, 5) - 1) * 0.012;
    const [x, z] = [p[0] * creep, p[1] * creep];
    if (w.tick % 120 === e.plaque.k)
      moveProp(
        w,
        e.plaque.id,
        [x, groundAt(w, x, z), z],
        [0, Math.sin(e.plaque.k * 0.65), 0, Math.cos(e.plaque.k * 0.65)],
      );
  }
  for (const e of w.query('pebble' as never) as unknown as { pebble: { k: number; id: number } }[]) {
    if (
      flow.found.includes(e.pebble.k) &&
      (w.get(e.pebble.id) as unknown as { sceneProp: { y: number } }).sceneProp.y > -5
    )
      moveProp(w, e.pebble.id, [0, -30, 0]);
  }
  for (const e of w.query('drink' as never) as unknown as {
    drink: { id: number; x: number; z: number; k: number };
  }[]) {
    const run = island.tilt * 0.25;
    const at = ((island.seaT * 0.05 * (e.drink.k + 2)) % 1) * run;
    moveProp(w, e.drink.id, [e.drink.x + at, 8.96, e.drink.z]);
  }
  for (const e of w.query('rollMarble' as never) as unknown as { rollMarble: { id: number; k: number } }[]) {
    const show = flow.day >= 4;
    const a = island.seaT * 0.5 + e.rollMarble.k * 2;
    moveProp(w, e.rollMarble.id, show ? [30 + Math.cos(a) * 1.8, 7.95, -48 + Math.sin(a) * 1.2] : [0, -30, 0]);
  }
  cairnStep(w);
  // the ferry leaves on the first morning, unhurried, and does not return
  const ferry = (w.query('ferry' as never)[0] as unknown as { ferry: { id: number; t: number } }).ferry;
  if (flow.mode === 'roam' && flow.day === 1 && ferry.t < 3000) {
    ferry.t += 1;
    moveProp(w, ferry.id, [8, 1.9, 104 + ferry.t * 0.05]);
  } else if (flow.day > 1 && ferry.t < 3001) {
    ferry.t = 3001;
    moveProp(w, ferry.id, [0, -30, 0]);
  }
  // the highlight on the thing you could use
  const mark = (w.query('nearMark' as never)[0] as unknown as { nearMark: { id: number } }).nearMark;
  moveProp(
    w,
    mark.id,
    flow.mode === 'roam' && flow.near
      ? [flow.nearX, groundAt(w, flow.nearX, flow.nearZ) + 0.08, flow.nearZ]
      : [0, -30, 0],
  );
}

/** Drops earned pebbles on the cairn, one by one. */
function cairnStep(w: W): void {
  const flow = flowOf(w);
  const cairn = w.query('cairn' as never)[0] as unknown as { cairn: { ids: number[] } };
  flow.cairnT += 1;
  if (flow.cairnShown < Math.min(flow.pebbles, cairn.cairn.ids.length) && flow.cairnT > 18) {
    flow.cairnT = 0;
    flow.cairnShown += 1;
    w.emit('clack', {} as never);
  } else if (flow.cairnShown > flow.pebbles) flow.cairnShown = flow.pebbles;
  const age = flow.ages[flow.ages.length - 1] ?? 60;
  const lean = ((age - 18) / 64) * 0.09;
  cairn.cairn.ids.forEach((id, k) => {
    if (k % 7 !== w.tick % 7) return;
    const layer = Math.floor(Math.sqrt(k) * 0.9);
    const ring = Math.max(0, 5 - layer) * 0.16;
    const y = 8.05 + layer * 0.15;
    const a = k * 2.4;
    const show = k < flow.cairnShown;
    moveProp(w, id, show ? [-12 + Math.cos(a) * ring + y * lean - 0.7, y, 30 + Math.sin(a) * ring] : [0, -30, 0], [
      0,
      Math.sin(a / 2),
      0,
      Math.cos(a / 2),
    ]);
  });
}

/** Gull and Frog: blobs, cheap and very funny. */
function critters(w: W): void {
  const cast = castOf(w);
  const flow = flowOf(w);
  const ev = flow.ev;
  const gull = w.get(cast.gull) as unknown as { crowdBody: never; id: number } | undefined;
  const frog = w.get(cast.frog) as unknown as { crowdBody: never; id: number } | undefined;
  const guest = (w.get(cast.guest) as unknown as { actor: { x: number; y: number; z: number } }).actor;
  const t = w.tick / 60;
  if (gull) {
    const onHead = ev?.id === 'pond' && (ev.d as { gullOn?: boolean }).gullOn;
    const onArm = ev?.id === 'line' && ((ev.d as { gull?: number }).gull ?? 0) !== 0;
    const onBack =
      ev?.id === 'poseB' &&
      (ev.d as { list?: string[]; at?: number }).list?.[(ev.d as { at: number }).at] === 'napkin' &&
      ev.phase === 'hold';
    const at: [number, number, number] = onHead
      ? [guest.x, guest.y + 1.5, guest.z]
      : onArm
        ? [guest.x, guest.y + 1.1, guest.z + 0.55]
        : onBack
          ? [guest.x, guest.y + 1.1, guest.z]
          : [20 + Math.cos(t * 0.3) * 40, 16 + Math.sin(t * 0.7) * 2, 40 + Math.sin(t * 0.3) * 40];
    stepCrowdBody(w as never, cast.gull, gull.crowdBody, {
      at,
      velocity: [Math.sin(t) * 2, 0, Math.cos(t) * 2],
      blob: { flap: 1 },
    } as never);
  }
  if (frog) {
    const onKnee = ev?.id === 'pond' && (ev.d as { onKnee?: boolean }).onKnee;
    const look = ev?.id === 'pond' && ((ev.d as { frogLook?: number }).frogLook ?? 0) > 0;
    const at: [number, number, number] = onKnee
      ? [guest.x + 0.25, guest.y + 0.45, guest.z - 0.3]
      : [-67.6, groundAt(w, -67.6, -13.2) + 1.1, -13.2];
    stepCrowdBody(w as never, cast.frog, frog.crowdBody, {
      at,
      velocity: [0, 0, 0],
      blob: look ? { look: [guest.x - at[0], guest.z - at[2]] } : {},
    } as never);
  }
}

/** Plumb in the Pavilion when not teaching, the others about the island. */
function standAround(w: W): void {
  const flow = flowOf(w);
  const cast = castOf(w);
  if (flow.mode === 'event') return;
  const crew = [cast.plumb, cast.bex, cast.nan, cast.gerald, cast.tare, cast.guest];
  if (flow.mode === 'credits') {
    // every guest holding a pose as the camera drifts past
    const poses = [
      'RETREAT/Lighthouse',
      'RETREAT/Heron',
      'RETREAT/Nothing',
      'RETREAT/Archer',
      'RETREAT/Bow',
      'RETREAT/Chair',
    ];
    crew.forEach((id, k) => {
      if (w.tick % 60 === 0) standAt(w, id, 66 + k * 3, 6 + (k % 2) * 4, Math.PI / 2);
      setPose(w, id, poses[k], 1);
    });
    return;
  }
  for (const id of [cast.plumb, cast.bex, cast.nan, cast.gerald]) {
    if (id < 0) continue;
    const nod = id === cast.nan && flow.nod > 0 ? Math.sin((flow.nod / 90) * Math.PI) : 0;
    setPose(w, id, nod > 0 ? 'RETREAT/Nod' : 'RETREAT/Stand', nod);
    setLean(w, id, 0, 0);
  }
  flow.nod = Math.max(0, flow.nod - 1);
}

export const island = defineScene<C>('game:island', {
  description: 'Little Fulcrum: the whole game on one world.',
  physics: true,
  terrain: FULCRUM_ID,
  setup(w) {
    const world = w as unknown as World;
    addTerrainBody(physicsOf(world), getTerrain(FULCRUM_ID));
    world.spawn({ flow: {} } as never);
    world.spawn({ island: {} } as never);
    dress(w as unknown as W);
    const sea = spawnProp(w, { prop: 'prop:sea', at: [0, SEA_Y, 0], yaw: 0 });
    const near = spawnProp(w, { prop: 'prop:seaNear', at: [0, SEA_Y + 0.03, 0], yaw: 0 });
    world.spawn({ seaProp: { id: sea, near } } as never);
    world.spawn({ ferry: { id: spawnProp(w, { prop: 'prop:ferry', at: [8, 1.9, 104], yaw: 0 }) } } as never);
    world.spawn({ nearMark: { id: spawnProp(w, { prop: 'prop:nearMark', at: [0, -30, 0], yaw: 0 }) } } as never);
    const table = [
      [-11.6, 39.8], [-10.8, 40.2], [-11.1, 39.5], [-10.4, 39.7],
    ]; // prettier-ignore
    table.forEach(([x, z], k) =>
      world.spawn({ drink: { id: spawnProp(w, { prop: 'prop:drink', at: [x, 8.96, z], yaw: 0 }), x, z, k } } as never),
    );
    [0, 1, 2].forEach((k) =>
      world.spawn({ rollMarble: { id: spawnProp(w, { prop: 'prop:marble', at: [0, -30, 0], yaw: 0 }), k } } as never),
    );
    const ids: number[] = [];
    for (let k = 0; k < 90; k++) ids.push(spawnProp(w, { prop: `prop:cairnPebble${k % 4}`, at: [0, -30, 0], yaw: 0 }));
    world.spawn({ cairn: { ids } } as never);
    const stand = (who: string, x: number, z: number, yaw = 0) =>
      spawnPerson(w, { at: [x, groundAt(w as unknown as W, x, z) + 0.05, z], yaw, ...PEOPLE[who] });
    const guest = spawnPerson(w, {
      at: [0, groundAt(w as unknown as W, 0, 86) + 0.05, 86],
      body: guestBody(0, 0),
      build: GUEST_BUILDS[0],
      speed: GUEST_SPEED,
      yaw: Math.PI,
    });
    const plumb = stand('plumb', -52, 12);
    const tare = stand('tare', 3, 84, Math.PI);
    const gerald = stand('gerald', 4, 38, 0.8);
    const bex = stand('bex', 15, 24, -0.6);
    const nan = stand('nan', -8, 30, 1.8);
    const extras = [stand('extra0', 49, 28), stand('extra1', 52, 28), stand('extra2', 55, 28)];
    const gull = world.spawn({ crowdBody: { rig: 'blob', look: 'wings', x: 20, y: 16, z: 40, size: 0.28 } } as never);
    const frog = world.spawn({ crowdBody: { rig: 'blob', look: 'ears', x: -67, y: 6, z: -13, size: 0.2 } } as never);
    world.spawn({ cast: { plumb, tare, gerald, bex, nan, guest, gull, frog, extras } } as never);
    const others = [gerald, bex, nan];
    for (let i = 0; i < 4; i++) {
      const wobble = {} as never;
      seedSway(w as unknown as W, wobble);
      world.spawn({
        seat: { index: i, kind: i === 0 ? 'human' : 'cpu', actor: i === 0 ? guest : others[i - 1] },
        wobble,
      } as never);
    }
    w.systems.add('game.drop', (now) => dropActors(now as unknown as W), { phase: 'rules' });
    w.systems.add('game.critters', (now) => critters(now as unknown as W), { phase: 'anim' });
    w.systems.add('game.tiltCrowd', (now) => stepTiltCrowd(now as unknown as W), { phase: 'anim' });
    (w as unknown as { emit(n: string, p: object): void }).emit('ready', {});
  },
  step(w, intents) {
    const world = w as unknown as W;
    flowStep(world, intents);
    pilot(world, intents);
    standAround(world);
    storyStep(world);
    directorStep(world);
  },
  actions: {
    ...(FLOW_ACTIONS as unknown as Record<string, (w: World<C>, args: unknown) => void>),
    /** Attract on or off. */
    'game.attract': (w: World<C>, args: unknown) => setAttract(w as unknown as W, (args as { on: boolean }).on),
    /** The whole-game driver. */
    'game.drive': (w: World<C>, args: unknown) => {
      const flow = flowOf(w as unknown as W);
      Object.assign(flow, { drive: true, bot: (args as { skill?: string }).skill ?? 'perfect' });
    },
    /** A line said on request (the walk-up remark, the final remark). */
    'game.say': (w: World<C>, args: unknown) => {
      const { line, who } = args as { line: string; who: string };
      say(w as unknown as W, line, who);
    },
  },
});

export default island;
void [CAST, rankOf];
