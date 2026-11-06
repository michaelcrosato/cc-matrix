/**
 * @file The pilot: every character stays `player: false`, and this system writes their intents. On the island the guest
 * walks by the step's `move`; the thing nearest in front of you gets the prompt; `use` talks, reads, enters or sleeps.
 * Tare hops along beside you. Also the walk's small rules: the sea's edge, hidden pebbles, the cairn, benches, the wave.
 */
import { held, pressed, terrainHeight, type Intents } from '../../../engine/sim-api';
import { clearBody, setLoop, setOnce } from '../cast/body';
import { castOf } from './cast-ref';
import { DAYS, BOARD } from './data/days';
import { BENCHES, HIDDEN_PEBBLES, PLAQUES } from './data/places';
import { STATIONS } from './data/stations';
import { ACTIVITIES } from './events';
import { nextItem, startEvent, startGroup } from './flow';
import { cue, flowOf, say, type C, type Flow, type W } from './types';
import { FULCRUM } from './terrain';

const REACH = 4.5;
const FLOOR = 2.3;

type ActorOf = { actor: C['actor'] & { intents: Record<string, unknown> } };

/** A thing you can use. */
interface Thing {
  key: string;
  x: number;
  z: number;
  r?: number;
}

/** Today's list of usable things. */
function things(w: W, flow: Flow): Thing[] {
  const cast = castOf(w);
  const list: Thing[] = [];
  for (const who of ['plumb', 'gerald', 'bex', 'nan'] as const) {
    const id = cast[who];
    const entity = id >= 0 ? (w.get(id) as unknown as ActorOf | undefined) : undefined;
    if (entity) list.push({ key: `npc:${who}`, x: entity.actor.x, z: entity.actor.z });
  }
  const tare = cast.tare >= 0 ? (w.get(cast.tare) as unknown as ActorOf | undefined) : undefined;
  if (tare) list.push({ key: 'npc:tare', x: tare.actor.x, z: tare.actor.z, r: 3 });
  PLAQUES.forEach((p, k) => {
    const creep = 1 + (flow.day - 1) * 0.012;
    list.push({ key: `plaque:${k}`, x: p[0] * creep, z: p[1] * creep, r: 3.5 });
  });
  list.push({ key: 'board:board', x: 12, z: 34, r: 5 });
  list.push({ key: 'hut:hut', x: 64, z: 49, r: 5 });
  BENCHES.forEach((b, k) => list.push({ key: `bench:${k}`, x: b[0], z: b[1], r: 3 }));
  const today = DAYS[flow.day - 1] ?? [];
  for (const id of today) {
    if (id === 'walk' || flow.done.includes(id)) continue;
    const station = id === 'group' ? STATIONS.pavilion : ACTIVITIES[id] ? STATIONS[ACTIVITIES[id].station] : null;
    if (station) list.push({ key: `go:${id}`, x: station.x, z: station.z, r: 9 });
  }
  if (flow.free) {
    for (const id of BOARD) {
      if (id === 'group') continue;
      const station = STATIONS[ACTIVITIES[id].station];
      list.push({ key: `go:${id}`, x: station.x, z: station.z, r: 7 });
    }
  }
  return list;
}

/** What's nearest and in front. */
function nearest(w: W, flow: Flow, ax: number, az: number, yaw: number): string {
  let best = '';
  let score = Infinity;
  for (const t of things(w, flow)) {
    const [dx, dz] = [t.x - ax, t.z - az];
    const d = Math.hypot(dx, dz);
    if (d > (t.r ?? REACH)) continue;
    const front = d > 0.01 ? (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d : 1;
    const value = d - front * 1.5;
    if (value < score) [score, best] = [value, t.key];
  }
  return best;
}

/** Uses a thing. */
function use(w: W, flow: Flow, key: string): void {
  const [kind, id] = key.split(':');
  if (kind === 'npc') {
    const n = (flow.talk[id] ?? 0) + 1;
    flow.talk[id] = n;
    if (id === 'nan') flow.nod = 90;
    const day = Math.min(5, flow.day);
    const count = id === 'gerald' && day < 4 ? 1 : 3;
    say(w, `talk.${id}.d${day}.${((n - 1) % count) + 1}`, id);
    return;
  }
  if (kind === 'plaque') {
    const k = Number(id);
    if (!flow.plaques.includes(k)) flow.plaques.push(k);
    say(w, `plaque.${k + 1}`, 'plaque');
    cue(w, 'tick');
    return;
  }
  if (kind === 'board') {
    if (!flow.done.includes('walk') && (DAYS[flow.day - 1] ?? []).includes('walk')) {
      flow.done.push('walk');
      say(w, 'walk.found', 'tare');
    }
    w.emit('openBoard', {} as never);
    return;
  }
  if (kind === 'hut') {
    if (nextItem(flow) === null || flow.free) flow.mode = 'evening';
    else say(w, 'hut.notYet', 'tare');
    return;
  }
  if (kind === 'bench') {
    flow.sit = 1;
    say(w, 'bench.sit', 'plaque');
    return;
  }
  if (kind === 'go') {
    if (id === 'group') return startGroup(w);
    startEvent(w, id);
  }
}

/** Keeps the walker out of deep water: the sea's edge pushes back. */
function shoreline(x: number, z: number): [number, number] | null {
  const h = terrainHeight(FULCRUM(), x, z);
  if (h !== null && h > FLOOR) return null;
  const len = Math.hypot(x, z) || 1;
  return [-(x / len), -(z / len)];
}

/** One roam step. */
export function pilot(w: W, intents: Intents): void {
  const flow = flowOf(w);
  const cast = castOf(w);
  const guest = w.get(cast.guest) as unknown as ActorOf;
  if (flow.mode !== 'roam') {
    if (guest && flow.mode !== 'event') guest.actor.intents = {};
    return;
  }
  const { actor } = guest;
  let move = (intents.move ?? [0, 0]) as readonly number[];
  if (flow.drive) move = [0, 0];
  const slow = held(intents, 'walk') ? 0.45 : 1;
  let [mx, mz] = [move[0] * slow, move[1] * slow];
  if (Math.hypot(mx, mz) > 0.05 && flow.sit) {
    flow.sit = 0;
    clearBody(w, cast.guest);
  }
  if (flow.sit) {
    flow.sit += 1;
    setLoop(w, cast.guest, 'RETREATLIB/Sitting_Idle_Loop', 1);
  }
  const back = shoreline(actor.x + mx * 0.5, actor.z + mz * 0.5);
  if (back) [mx, mz] = [back[0] * 0.6, back[1] * 0.6];
  actor.intents = { move: [mx, mz], ...(held(intents, 'jump') ? { b: ['jump'] } : {}) };
  flow.near = nearest(w, flow, actor.x, actor.z, actor.yaw);
  if (flow.near) {
    const thing = things(w, flow).find((t) => t.key === flow.near);
    if (thing) [flow.nearX, flow.nearZ] = [thing.x, thing.z];
  }
  if (pressed(intents, 'use') && flow.near) use(w, flow, flow.near);
  if (pressed(intents, 'wave')) {
    setOnce(w, cast.guest, 'RETREATLIB/Wave_Hello');
    w.emit('waved', {} as never);
    flow.sit = 900; // the wave ends when you walk off
  }
  // Tare hops along beside you
  const tare = w.get(cast.tare) as unknown as ActorOf | undefined;
  if (tare) {
    const [dx, dz] = [actor.x - 2.2 - tare.actor.x, actor.z - 1.4 - tare.actor.z];
    const far = Math.hypot(dx, dz);
    tare.actor.intents = far > 1.6 ? { move: [dx / far, dz / far], ...(w.tick % 30 < 3 ? { b: ['jump'] } : {}) } : {};
  }
  // hidden pebbles
  HIDDEN_PEBBLES.forEach((p, k) => {
    if (!flow.found.includes(k) && Math.hypot(p[0] - actor.x, p[1] - actor.z) < 1.8) {
      flow.found.push(k);
      flow.pebbles += 1;
      cue(w, 'pebble');
      w.emit('foundPebble', { k } as never);
    }
  });
  // a walk's other rule: at the Noticeboard, on Day 1, the walk is done
  if (flow.day === 1 && !flow.done.includes('walk') && Math.hypot(actor.x - 12, actor.z - 34) < 7) {
    flow.done.push('walk');
    say(w, 'walk.found', 'tare');
    cue(w, 'stamp');
  }
}
