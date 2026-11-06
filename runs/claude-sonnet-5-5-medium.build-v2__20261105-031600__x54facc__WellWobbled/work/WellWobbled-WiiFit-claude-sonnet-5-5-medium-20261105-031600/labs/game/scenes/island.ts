/**
 * @file The scene `game:island`: the whole game on one world. Terrain, sea, dressing and cast; the guest is an actor that
 * stays `player: false` and is driven by the pilot system (roam: the step's move; activity: nothing; attract: the bot);
 * seats are read from the intents each step, the Wobble Model steps for every seat, and the running activity steps in
 * the rules phase. Menu picks arrive as scene actions (`game.begin`, `game.start`, `game.leave`, `game.go`, `game.bot`).
 * Sim-side: imports only engine/sim-api.ts.
 * @example
 * // node x sim labs/game/scenes/island.ts --steps 120
 */
import { addTerrainBody, defineScene, physicsOf, type Intents } from '../../../engine/sim-api';
import { ISLAND, FLOW, ACT, CAST, PEBBLE, PLAQUE, GHOST, MARK, ROUND, type Comps } from './components';
import { actorId, changeLook, placeCast, placeGuest, spawnCast, spawnGuest } from './cast';
import { SEA_Y, STATIONS, groundAt, island as terrain, type StationId } from './data/world';
import { dressIsland } from './dress';
import { activitySystem, botStep, guestOf, leaveActivity, setBot, startActivity } from './events/runner';
import type { W } from './events/types';
import { SEAT, WOBBLE } from './wobble';
import { readSeatFrom, stepSeatsOf, val } from './seatio';
import { director } from './director';
import { startRound } from './round';
import { begin, buildCairn, found, worldSystem } from './worldfx';
import './settings';
import './roundscene';
import '../cast/props';
import '../cast/builds';

void [ISLAND, FLOW, ACT, CAST, PEBBLE, PLAQUE, GHOST, MARK, ROUND, SEAT, WOBBLE];
const WALK_SPEED = 4.4;
/** The pilot: the only writer of actor.intents. */
function pilot(w: W, it: Intents): void {
  const flow = w.query('flow')[0].flow;
  const g = guestOf(w);
  if (!g) return;
  const actor = g.actor;
  let mx = 0,
    mz = 0;
  if (flow.mode === 'roam' && !w.settings.get<boolean>('game.auto')) {
    const mv = (it as unknown as { move?: number[] }).move ?? [0, 0];
    const slow = val(it, 'walk') > 0 || val(it, 'game:gentle') > 0 ? 0.45 : 1;
    mx = (mv[0] || 0) * slow;
    mz = (mv[1] || 0) * slow;
    const dt = w.dt * WALK_SPEED;
    if (groundAt(actor.x + mx * dt * 3, actor.z) < SEA_Y - 0.05) mx = 0;
    if (groundAt(actor.x, actor.z + mz * dt * 3) < SEA_Y - 0.05) mz = 0;
  }
  // the Gull wanders in slow loops; the Frog hops now and then and otherwise just looks
  for (const c of w.query('cast', 'actor')) {
    const t = w.tick / 60;
    if (c.cast.who === 'gull')
      c.actor.intents = { move: [Math.sin(t * 0.4 + c.cast.home[0]), Math.cos(t * 0.3)] } as never;
    else if (c.cast.who === 'plumb' && w.query('island')[0].island.storm > 0.2)
      c.actor.intents = { move: [Math.sin(t * 2) * 0.6, 0] } as never; // in the storm Plumb sways, and the plait swings for the first time
    else if (c.cast.who === 'frog')
      c.actor.intents = {
        move: [0, 0],
        b: t % 6 < 0.4 ? ['jump'] : [],
        p: w.tick % 360 === 0 ? ['jump'] : [], // the press that starts a hop, every six seconds
      } as never;
  }
  const b = (it as unknown as { b?: string[]; p?: string[] }).b ?? [];
  const pp = (it as unknown as { p?: string[] }).p ?? [];
  actor.intents = {
    move: [mx, mz],
    b: flow.mode === 'roam' && b.includes('jump') ? ['jump'] : [],
    p: flow.mode === 'roam' && pp.includes('jump') ? ['jump'] : [],
  } as never; // hop
}
export const island = defineScene<Comps>('game:island', {
  description: 'Little Fulcrum: the whole game on one island world.',
  terrain: 'terrain:fulcrum',
  physics: true,
  setup(w) {
    addTerrainBody(physicsOf(w), terrain());
    w.spawn({ flow: { mode: 'roam', day: 1 }, island: { tilt: 0.4 }, round: {} });
    dressIsland(w);
    spawnCast(w);
    spawnGuest(w);
    w.systems.add('game.director', (ww) => director(ww as never), { phase: 'intents' });
    w.systems.add('game.world', (ww) => worldSystem(ww as never), { phase: 'rules' });
    w.systems.add('game.pilot', (ww, it) => pilot(ww as never, it), { phase: 'intents' });
    w.systems.add('game.wobble', (ww) => stepSeatsOf(ww as never), { phase: 'ai' });
    w.systems.add('game.activity', (ww) => activitySystem(ww as never), { phase: 'rules' });
  },
  step(w, it) {
    readSeatFrom(w, it);
    botStep(w);
  },
  actions: {
    'game.start': (w, args) => {
      const a = args as { event: string; short?: boolean };
      startActivity(w, a.event, !!a.short);
    },
    'game.leave': (w) => leaveActivity(w),
    'game.bot': (w, args) => setBot(w, String((args as { kind?: string }).kind ?? '')),
    'game.go': (w, args) => {
      const s = STATIONS[(args as { station: StationId }).station];
      if (s) placeGuest(w, [s.at[0], groundAt(s.at[0], s.at[1]), s.at[1] + 3], 0);
    },
    'game.round': (w, args) => {
      const a = args as { players?: number; cpu?: boolean };
      startRound(w, a.players ?? 1, a.cpu !== false);
    },
    'game.begin': (w, args) => begin(w, args as never),
    'game.found': (w, args) => found(w, Number((args as { no: number }).no)),
    'game.cairn': (w, args) => {
      const a = args as { count: number; age: number };
      buildCairn(w, a.count, a.age);
    },
    'dev.phase': (w, args) => {
      const g = guestOf(w);
      g.act.phase = String((args as { phase: string }).phase);
      g.act.a[0] = 0;
    },
    'dev.finish': (w, args) => {
      const g = guestOf(w);
      if (g.act.id) {
        g.act.score = Number((args as { score: number }).score);
        g.act.done = 1;
      }
    },
    'game.look': (w, args) => {
      const a = args as { look?: number; colour?: number };
      changeLook(w, a.look ?? 0, a.colour ?? 0);
    },
    'dev.storm': (w, args) => {
      w.query('island')[0].island.storm = Number((args as { v: number }).v) || 0;
    },
    'game.day': (w, args) => {
      w.query('flow')[0].flow.day = Number((args as { day: number }).day) || 1;
    },
  },
});
void [actorId, placeCast];
export default island;
