/**
 * @file The scene `game:round`: a session's small pavilion, and the rules of a Round. Three classes dealt from the stream
 * `deal`: the Still Ring, one of Heron, Hoop or Step, and Still Pond, each short. Every copy runs its own seeded round.
 * Other players arrive as ghosts through the custom intent `game:ghosts`, wobbling on the neighbouring mats, shown only
 * while they are in the same class. Nothing they do touches this copy's round.
 */
import { defineScene, physicsOf, removeProp, spawnProp, type Intents, type World } from '../../../engine/sim-api';
import { setLean, setPose } from '../cast/body';
import { spawnPerson } from '../cast/people';
import { CAST, castOf } from './cast-ref';
import { FRONT_MAT, MATS } from './data/stations';
import { dropActors, standAt } from './events/kit';
import { FLOW_ACTIONS, flowStep, startGroup } from './flow';
import '../props';
import './settings';
import { ISLAND, SEAT, FLOW, WOBBLE, flowOf, seatOf, seatsOf, type C, type W } from './types';
import { seedSway } from './wobble';

const CLASS_CLIP: Readonly<Record<string, string>> = {
  ring: 'RETREAT/Stand', heron: 'RETREAT/Heron', nothing: 'RETREAT/Nothing', hoop: 'RETREAT/HipCircle', hoopS: 'RETREAT/HipCircle',
  stepS: 'RETREAT/StepUpL', pondS: 'RETREAT/Nothing', pond: 'RETREAT/Nothing', '': 'RETREAT/Stand',
}; // prettier-ignore

/** Message pose ids by number, the wire's small table. */
export const POSE_WIRE = ['', 'ring', 'heron', 'hoopS', 'stepS', 'pondS'] as const;

/** Applies what ghosts sent: [seat, class, x, y, score, pose] sextuples. */
function readGhosts(w: W, intents: Intents): void {
  const data = (intents as unknown as Record<string, unknown>)['game:ghosts'] as number[] | undefined;
  const flow = flowOf(w);
  const myClass = flow.group ? flow.group.at : -1;
  if (data) {
    for (let k = 0; k + 5 < data.length; k += 6) {
      const e = seatsOf(w).find((one) => one.seat.index === data[k]);
      if (!e || e.seat.kind !== 'ghost') continue;
      e.seat.shownClass = data[k + 1];
      e.wobble.bx = data[k + 2];
      e.wobble.by = data[k + 3];
      e.seat.score = data[k + 4];
      e.seat.pose = POSE_WIRE[data[k + 5]] ?? '';
    }
  }
  for (const e of seatsOf(w)) {
    if (e.seat.kind !== 'ghost') continue;
    e.wobble.x += (e.wobble.bx - e.wobble.x) * 0.15;
    e.wobble.y += (e.wobble.by - e.wobble.y) * 0.15;
    const here = e.seat.shownClass === myClass || myClass < 0;
    const mat = MATS[e.seat.index];
    standAt(w, e.seat.actor, here ? mat[0] : mat[0] * 3, here ? mat[1] : 12, Math.PI);
    setPose(w, e.seat.actor, CLASS_CLIP[e.seat.pose] ?? 'RETREAT/Stand', 1);
    setLean(w, e.seat.actor, e.wobble.x, e.wobble.y);
  }
}

/** The small scene. */
export const round = defineScene<C>('game:round', {
  description: 'A session’s round: the pavilion, four mats, the cast, three classes.',
  physics: true,
  setup(w) {
    const world = w as unknown as World;
    physicsOf(world).addBody({
      type: 'fixed',
      position: [0, -0.5, 0],
      colliders: [{ shape: { type: 'box', size: [120, 1, 120] }, group: 'world' }],
    } as never);
    w.systems.add('game.drop', (now) => dropActors(now as unknown as W), { phase: 'rules' });
    world.spawn({ flow: { mode: 'round' } } as never);
    world.spawn({ island: {}, roundScene: {} } as never);
    spawnProp(w, { prop: 'prop:pavilion', at: [0, 0, 0], yaw: 0 });
    spawnProp(w, { prop: 'prop:roundFloor', at: [0, 0, 0], yaw: 0 });
    MATS.forEach((m, i) => spawnProp(w, { prop: `prop:matSeat${i}`, at: [m[0], 0.01, m[1]], yaw: 0 }));
    const plumb = spawnPerson(w, {
      at: [FRONT_MAT[0], 0, FRONT_MAT[1]],
      body: 'body:plumb',
      build: 'build:plumb',
      speed: 2,
      secondary: { hair: 'ponytail' },
    });
    world.spawn({ cast: { plumb, guest: -1 } } as never);
    for (let i = 0; i < 4; i++) {
      const m = MATS[i];
      const actor = spawnPerson(w, {
        at: [m[0] * 3, 0, 12],
        body: `body:seat${i}`,
        build: 'build:chibi',
        speed: 3,
        yaw: Math.PI,
      });
      const wobble = {} as never;
      seedSway(w as unknown as W, wobble);
      world.spawn({ seat: { index: i, kind: 'none', actor }, wobble } as never);
    }
  },
  step(w, intents) {
    const world = w as unknown as W;
    readGhosts(world, intents);
    flowStep(world, intents);
  },
  actions: {
    ...(FLOW_ACTIONS as unknown as Record<string, (w: World<C>, args: unknown) => void>),
    /** Who sits where: my seat, and how many players. */
    'round.seat': (w: World<C>, args: unknown) => {
      const world = w as unknown as W;
      const { me, players } = args as { me: number; players: number[] };
      flowOf(world).meSeat = me;
      for (const e of seatsOf(world)) {
        const inRound = players.includes(e.seat.index);
        e.seat.kind = e.seat.index === me ? 'human' : inRound ? 'ghost' : 'none';
        if (e.seat.kind === 'ghost') (w as unknown as World).spawn({ ghost: { seat: e.seat.index } } as never);
        const m = MATS[e.seat.index];
        if (inRound) standAt(world, e.seat.actor, m[0], m[1], Math.PI);
      }
      (w as unknown as { emit(n: string, p: object): void }).emit('seated', { me });
    },
    /** The round begins. */
    'round.go': (w: World<C>) => {
      const world = w as unknown as W;
      const flow = flowOf(world);
      if (flow.group) return;
      startGroup(world, [
        flow.meSeat,
        ...seatsOf(world)
          .filter((e) => e.seat.kind === 'ghost')
          .map((e) => e.seat.index),
      ]);
    },
    /** A player left: they walk off politely. */
    'round.leave': (w: World<C>, args: unknown) => {
      const world = w as unknown as W;
      const e = seatOf(world, (args as { seat: number }).seat);
      if (!e || e.seat.kind !== 'ghost') return;
      e.seat.kind = 'none';
      standAt(world, e.seat.actor, MATS[e.seat.index][0] * 3, 12, 0);
      const ev = flowOf(world).ev;
      if (ev) ev.seats = ev.seats.filter((i) => i !== e.seat.index);
      if (flowOf(world).group)
        flowOf(world).group!.seats = flowOf(world).group!.seats.filter((i) => i !== e.seat.index);
    },
  },
});

export default round;
void [CAST, ISLAND, SEAT, FLOW, WOBBLE, castOf, removeProp, setPose];
