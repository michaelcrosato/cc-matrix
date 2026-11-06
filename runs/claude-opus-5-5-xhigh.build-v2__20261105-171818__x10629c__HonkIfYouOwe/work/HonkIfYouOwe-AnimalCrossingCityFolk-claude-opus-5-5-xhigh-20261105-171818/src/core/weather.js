// Weather: seeded per day with an hourly start and stop. Pure.
import { Stream } from './rng.js';
import { villageDay } from './calendar.js';

export const WEATHER_TABLE = [
  [['sun', 60], ['rain', 30], ['fog', 10]],
  [['sun', 70], ['rain', 20], ['storm', 10]],
  [['sun', 50], ['wind', 30], ['rain', 20]],
  [['snow', 60], ['clear', 40]],
];
const WET = new Set(['rain', 'storm']);

/** The day's weather plan: kind, and the hours it runs. Calm days have a whole-day calm kind. */
export function weatherPlan(seed, day, season, rainMult = 1) {
  const rng = new Stream(`${seed}:weather:${day}`);
  const table = WEATHER_TABLE[season].map(([kind, w]) => [kind, WET.has(kind) ? w * rainMult : w]);
  const pick = rng.weighted(table, (e) => e[1]);
  const kind = pick[0];
  const calm = season === 3 ? 'clear' : 'sun';
  if (kind === calm) return { kind, start: 0, stop: 24, calm };
  const start = rng.int(5, 16);
  const stop = Math.min(24, start + rng.int(3, 8));
  return { kind, start, stop, calm };
}
export function weatherAt(plan, hour) {
  return hour >= plan.start && hour < plan.stop ? plan.kind : plan.calm;
}
/** Convenience for a village-day world. */
export function weatherForDay(world, day = world.clock.day) {
  const { season } = villageDay(day);
  return weatherPlan(world.seed, day, season);
}
