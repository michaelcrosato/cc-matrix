/**
 * @file The island's slow story, as sim state the page can only ask for through scene actions: the plaques creep downhill a
 * little more each day, hidden pebbles vanish when found, and the Cairn in the Plaza grows by one stone per pebble and leans
 * with the last Wobble Age (true at 18). `game.begin` hands the sim the save's starting state. Sim-side.
 * @example
 * plaqueAt(3, 1).x; // where plaque 3 stands on day 1
 */
import { groundAt, STATIONS } from './data/world';
import type { W } from './events/types';

export const plaqueAt = (hx: number, hz: number, no: number, day: number): { x: number; z: number } => ({
  x: hx - (day - 1) * (0.9 + (no % 3) * 0.25),
  z: hz + (day - 1) * 0.5,
});
/** Keeps the plaques where the day says (one eased step). */
export function worldSystem(w: W): void {
  if (w.tick % 20 !== 0) return;
  const day = w.query('flow')[0].flow.day;
  for (const e of w.query('plaque')) {
    const p = e.plaque;
    const t = plaqueAt(p.hx, p.hz, p.no, Math.min(day, 6));
    p.x += (t.x - p.x) * 0.2;
    p.z += (t.z - p.z) * 0.2;
    p.y = groundAt(p.x, p.z) + 0.3;
  }
}
/** Rebuilds the Cairn: `count` stacked stones, leaning by `age` (18 stands true, 82 leans most). */
export function buildCairn(w: W, count: number, age: number): void {
  for (const e of w.query('mark')) if (e.mark.kind === 'cairn') w.despawn(e.id);
  const lean = ((age || 18) - 18) / 64;
  const base = STATIONS.plaza.at;
  const y0 = groundAt(base[0] + 5, base[1] - 6);
  const tints = ['material:rwhite', 'material:rsand', 'material:rmint', 'material:rcoral'];
  for (let i = 0; i < count; i++) {
    const level = Math.floor(Math.sqrt(i));
    const k = i - level * level;
    w.spawn({
      mark: {
        x: base[0] + 5 + (k - level) * 0.28 + lean * level * 0.05 * level,
        y: y0 + 0.1 + level * 0.22,
        z: base[1] - 6,
        size: 0.3 - level * 0.01,
        material: tints[i % 4],
        yaw: i * 0.9,
        kind: 'cairn',
      },
    });
  }
}
/** `game.begin`: day, found pebbles, Cairn. */
export function begin(w: W, a: { day?: number; finds?: number[]; pebbles?: number; age?: number }): void {
  w.query('flow')[0].flow.day = a.day ?? 1;
  const set = new Set(a.finds ?? []);
  for (const e of w.query('pebble'))
    if (set.has(e.pebble.no)) {
      e.pebble.found = 1;
      e.pebble.y = -50;
    }
  buildCairn(w, a.pebbles ?? 0, a.age ?? 18);
}
export function found(w: W, no: number): void {
  for (const e of w.query('pebble'))
    if (e.pebble.no === no) {
      e.pebble.found = 1;
      e.pebble.y = -50;
    }
}
