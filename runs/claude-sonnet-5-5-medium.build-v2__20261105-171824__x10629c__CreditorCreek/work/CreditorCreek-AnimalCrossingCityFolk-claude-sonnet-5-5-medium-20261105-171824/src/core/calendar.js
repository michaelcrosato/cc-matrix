// Calendar and clocks (pure). Day starts at 05:00. 4 seasons x 4 days = 16-day year.
import { seeded } from './rng.js';
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const DAY_TYPES = ['Market Day', 'Errand Day', 'Show Day', 'Festival Day'];
export const MIN_PER_DAY = 1440;
export const DAY_START = 300; // 05:00 in clock minutes
export const seasonOf = (day) => Math.floor(((day - 1) % 16) / 4);
export const dayTypeOf = (day) => ((day - 1) % 4);
export const clockMinutes = (min) => (DAY_START + min) % 1440; // min since 05:00 -> minutes since midnight
export const hourOf = (min) => clockMinutes(min) / 60;
export function fmtClock(min) {
  const c = Math.floor(clockMinutes(min)); const h = Math.floor(c / 60), m = c % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}
export const dateLine = (day, min) => `${SEASONS[seasonOf(day)]} · ${DAY_TYPES[dayTypeOf(day)]} · ${fmtClock(min)}`;
/** Real Clock: season by month, day type by weekday; contest 2nd Wed of mid month, festival last Sat of the season. */
export function realClockInfo(date) {
  const mo = date.getMonth(); // 0..11
  const season = mo >= 2 && mo <= 4 ? 0 : mo >= 5 && mo <= 7 ? 1 : mo >= 8 && mo <= 10 ? 2 : 3;
  const wd = date.getDay();
  let type = wd === 0 ? 0 : wd === 6 ? 2 : 1;
  // last Saturday of the season's last month = festival
  const lastMonth = [4, 7, 10, 1][season];
  const isLastMonth = mo === lastMonth;
  let festival = false;
  if (isLastMonth && wd === 6) { const next = new Date(date.getTime() + 7 * 86400000); if (next.getMonth() !== mo) festival = true; }
  if (festival) type = 3;
  // contest: second Wednesday of the season's middle month
  const midMonth = [3, 6, 9, 0][season];
  let contest = false;
  if (mo === midMonth && wd === 3 && date.getDate() >= 8 && date.getDate() <= 14) contest = true;
  return { season, type, festival, contest, hour: date.getHours() + date.getMinutes() / 60, dayOfMonth: date.getDate() };
}
/** Weather. kind: sun|clear|rain|fog|storm|wind|snow */
const TABLE = [
  [['sun', 60], ['rain', 30], ['fog', 10]],
  [['sun', 70], ['rain', 20], ['storm', 10]],
  [['sun', 50], ['wind', 30], ['rain', 20]],
  [['snow', 60], ['clear', 40]],
];
export function dayWeather(season, day, year = 1, mult = 1) {
  const r = seeded('wx', season, day, year);
  const tbl = TABLE[season].map(([k, w]) => [k, (k === 'rain' || k === 'storm' || k === 'snow') ? w * mult : w]);
  const total = tbl.reduce((a, [, w]) => a + w, 0);
  let x = r() * total, kind = tbl[0][0];
  for (const [k, w] of tbl) { if (x < w) { kind = k; break; } x -= w; }
  const base = season === 3 ? 'clear' : 'sun';
  const start = kind === base ? 0 : r.int(5, 18); const len = kind === base ? 24 : r.int(4, 10);
  return { kind, start, end: start + len, base };
}
export function weatherAt(season, day, hour, year = 1, mult = 1) {
  const w = dayWeather(season, day, year, mult);
  const h = hour < 5 ? hour + 24 : hour;
  return h >= w.start + 5 && h < w.end + 5 && w.kind !== w.base ? w.kind : w.base;
}
export const isWet = (k) => k === 'rain' || k === 'storm';
