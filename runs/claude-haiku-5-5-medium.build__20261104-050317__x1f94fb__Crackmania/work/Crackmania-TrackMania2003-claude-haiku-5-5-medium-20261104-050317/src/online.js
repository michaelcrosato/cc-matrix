// AI Hub sessions, ghost mode (AI Hub Session Protocol v1). Every copy runs its own time attack on the same road, chosen
// from the hub's seed; each copy sends its own car's pose and progress to the others (unreliable, 10 a second and
// 1 a second for progress), and shows the others as ghost cars that touch nothing. The result is the copy's own time.
import { TRACKS } from './data/tracks.js';

/** the hub, when this page is in a session; else null (the game runs on its own) */
export function activeHub() {
  const h = globalThis.AIHub;
  return h && h.active ? h : null;
}

/** the road for this round: the same on every copy, from the hub's generator */
export function roundTrack(h) {
  const r = h.rng('crackmania-road')();
  return TRACKS[Math.floor(r * TRACKS.length) % TRACKS.length];
}

/** attaches the hub's handlers once; `on` maps 'start' | 'message' | 'end' | 'leave' to functions */
export function attach(h, on) {
  for (const k of ['start', 'message', 'end', 'leave', 'time-up']) if (on[k]) h.on(k, on[k]);
}

/** the pose a copy sends: the car's middle, forward and up, rounded to keep messages small */
export function poseMessage(car) {
  const r = v => Math.round(v * 4) / 4, n = v => +v.toFixed(3);
  return { p: car.p.map(r), f: car.f.map(n), u: car.u.map(n) };
}
