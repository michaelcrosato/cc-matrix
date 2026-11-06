/**
 * @file Spawns the cast (guest, Plumb, Tare, Gerald, Bex, Nan) as actors with the retreat clip set, places the guest at a
 * station, and scrubs poses: a pose clip is played with speed 0 and its slot time `t` written from the guest's thumb;
 * the four lean strips are additive and scrubbed by the centre of balance. Sim-side.
 * @example
 * setPose(w, id, 'Heron', 0.5, 0.2, -0.1); // half into the heron, leaning a little
 */
import {
  createCharacter,
  placeActor,
  playClip,
  removeActor,
  spawnActor,
  stopClip,
  type ClipPlay,
} from '../../../engine/sim-api';
import { BUILD_IDS } from '../cast/builds';
import '../cast/clips';
import type { W } from './events/types';
import { groundAt, STATIONS } from './data/world';

const SETS = ['clipset:retreat'];
const HOLD: ClipPlay = { speed: 0, hold: true, walk: true, loop: false, fade: 0.12 };
const ADD: ClipPlay = { speed: 0, hold: true, walk: true, loop: false, additive: true, fade: 0 };
export const CAST_TABLE = [
  { who: 'plumb', body: 'body:plumb', build: BUILD_IDS.plumb, at: [-52, 14], speed: 1.5 },
  { who: 'tare', body: 'body:tare', build: BUILD_IDS.tare, at: [3, 32], speed: 4.2 },
  { who: 'gerald', body: 'body:gerald', build: BUILD_IDS.gerald, at: [46, 22], speed: 4 },
  { who: 'bex', body: 'body:bex', build: BUILD_IDS.bex, at: [58, 26], speed: 3.5 },
  { who: 'gull', body: 'body:gull', build: 'build:critter', at: [6, 36], speed: 2 },
  { who: 'frog', body: 'body:frog', build: 'build:critter', at: [-68, -10], speed: 1 },
  { who: 'nan', body: 'body:nan', build: BUILD_IDS.nan, at: [-66, -8], speed: 1.5 },
] as const;

export function spawnPerson(
  w: W,
  who: string,
  body: string,
  build: string,
  x: number,
  z: number,
  speed: number,
  yaw = 0,
  extra: Record<string, object> = {},
  lite = false,
): number {
  const look = lite ? {} : { anim: { build }, body, clips: { sets: SETS } };
  return spawnActor(w as never, { at: [x, groundAt(x, z) + 0.1, z], character: createCharacter({ speed, jumpSpeed: 5 }), player: false, yaw, ...look, components: { cast: { who, home: [x, z], seatNo: -1, bot: '', mat: [0, 0, 0] }, ...extra } } as never); // prettier-ignore
}
export function spawnGuest(w: W, look = 0, colour = 0, lite = false): number {
  const x = STATIONS.pier.at[0],
    z = STATIONS.pier.at[1] - 8;
  const rng = w.rng('sway0');
  const u = Array.from({ length: 9 }, () => rng.range(0, 1));
  const sw = [
    u[0] * 6.2832,
    u[1] * 6.2832,
    u[2] * 6.2832,
    0.8 + 0.45 * u[3],
    0.8 + 0.45 * u[4],
    0.8 + 0.45 * u[5],
    0,
    0,
    0,
  ];
  return spawnPerson(
    w,
    'guest',
    `body:guest${colour}`,
    BUILD_IDS.guest[look % 3],
    x,
    z,
    4.4,
    Math.PI,
    { seat: {}, wobble: { sw }, act: {} },
    lite,
  );
}
/** Puts the guest in another tracksuit (`colour` 0-5, the last two unlocked by pebbles): the old actor goes, a new one stands where it was. */
export function changeLook(w: W, look: number, colour: number): void {
  const id = actorId(w, 'guest');
  if (id < 0) return;
  const e = w.get(id) as unknown as { actor?: { x: number; z: number } } | undefined;
  const [x, z] = e?.actor ? [e.actor.x, e.actor.z] : [0, 0];
  removeActor(w as never, id);
  const nid = spawnGuest(w, look, colour);
  void nid;
  w.emit('look', { x, z });
}
export function spawnCast(w: W, lite = false): void {
  for (const c of CAST_TABLE) {
    const seated = c.who === 'gerald' || c.who === 'bex' || c.who === 'nan';
    if (lite && !seated) continue;
    const sw = [0.3, 1.7, 2.9, 1, 1.1, 0.9, 0, 0, 0];
    spawnPerson(
      w,
      c.who,
      c.body,
      c.build,
      c.at[0],
      c.at[1],
      c.speed,
      Math.PI,
      seated
        ? { seat: {}, wobble: { sw: sw.map((v, i) => (i < 3 ? v + c.at[0] * 0.1 : v)) }, act: {} }
        : c.who === 'plumb'
          ? { secondary: { hair: 'ponytail' } } // the one very long plait, which swings only in the storm
          : {},
      lite,
    );
  }
}
export function actorId(w: W, who: string): number {
  return w.query('cast').find((e) => e.cast.who === who)?.id ?? -1;
}
/** Puts the guest at `at` ([x, y, z]) facing `yaw`. */
export function placeGuest(w: W, at: readonly [number, number, number], yaw: number): void {
  const id = actorId(w, 'guest');
  if (id < 0) return;
  safePlace(w, id, at[0], at[1], at[2], yaw);
}
/** placeActor that retries a little higher when the first place has no headroom (a slope in front of the feet). */
function safePlace(w: W, id: number, x: number, y: number, z: number, yaw: number): void {
  for (const dy of [0.1, 0.5, 1.2, 2.5]) {
    try {
      placeActor(w as never, id, [x, y + dy, z], yaw);
      return;
    } catch {
      /* try higher */
    }
  }
}
export function placeCast(w: W, who: string, x: number, z: number, yaw: number): void {
  const id = actorId(w, who);
  if (id < 0) return;
  safePlace(w, id, x, groundAt(x, z), z, yaw);
}
interface Slot {
  clip: string;
  t: number;
  stopping: number;
}
const slotsOf = (w: W, id: number): Slot[] =>
  (w.get(id) as unknown as { clips?: { state: { slots: Slot[] } } })?.clips?.state.slots ?? [];
function ensure(w: W, id: number, clip: string, play: ClipPlay): void {
  if (!slotsOf(w, id).some((s) => s.clip === clip && s.stopping === 0)) playClip(w as never, id, clip, play);
}
/** Scrubs `pose` (a clip of RETREAT, or '' for standing) to `progress` 0..1, with the lean of the centre of balance. */
export function setPose(w: W, id: number, pose: string, progress: number, lx = 0, ly = 0): void {
  if (!(w.get(id) as unknown as { clips?: unknown })?.clips) return;
  const want = pose ? `RETREAT/${pose}` : '';
  for (const s of slotsOf(w, id)) {
    if (s.stopping === 0 && !s.clip.startsWith('RETREAT/Lean') && s.clip !== want) stopClip(w as never, id, 0.1);
  }
  if (want) ensure(w, id, want, HOLD);
  const leans: [string, number][] = [
    ['LeanR', lx],
    ['LeanL', -lx],
    ['LeanF', ly],
    ['LeanB', -ly],
  ];
  for (const [name] of leans) ensure(w, id, `RETREAT/${name}`, ADD);
  for (const s of slotsOf(w, id)) {
    if (s.clip === want) s.t = Math.max(0, Math.min(1, progress));
    for (const [name, v] of leans) if (s.clip === `RETREAT/${name}`) s.t = Math.max(0, Math.min(1, v * 1.4));
  }
}
export function clearPose(w: W, id: number): void {
  for (let i = 0; i < 8 && slotsOf(w, id).some((s) => s.stopping === 0); i++) stopClip(w as never, id, 0.1);
}
