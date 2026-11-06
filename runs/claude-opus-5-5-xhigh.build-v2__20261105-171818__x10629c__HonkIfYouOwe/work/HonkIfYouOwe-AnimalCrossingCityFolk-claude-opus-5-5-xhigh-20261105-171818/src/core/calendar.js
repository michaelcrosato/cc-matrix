// The calendar: four seasons of four days. Pure: tests run it in Node.
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const DAY_TYPES = ['Market Day', 'Errand Day', 'Show Day', 'Festival Day'];
export const YEAR_DAYS = 16;
export const FESTIVALS = ['seedToss', 'lanternFloat', 'greatSoup', 'longNight'];
export const CONTESTS = [null, 'derby', 'bugOff', 'snowman'];

/** A story day (1…∞) in Village Time: its place in the sixteen-day year. */
export function villageDay(day) {
  const d = ((day - 1) % YEAR_DAYS + YEAR_DAYS) % YEAR_DAYS;
  const season = Math.floor(d / 4);
  const type = d % 4;
  return { calendarDay: d + 1, season, seasonId: SEASONS[season], type, festival: type === 3 ? FESTIVALS[season] : null, contest: type === 1 ? CONTESTS[season] : null, show: type === 2, market: type === 0 };
}

const nthWeekday = (year, month, weekday, n) => {
  const first = new Date(year, month, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
};
const lastWeekday = (year, month, weekday) => {
  const last = new Date(year, month + 1, 0);
  return last.getDate() - ((last.getDay() - weekday + 7) % 7);
};

/** The calendar on a real date, for the Real Clock. month 0-11. New day at 05:00. */
export function realDay(ms) {
  const dt = new Date(ms - 5 * 3600 * 1000);
  const m = dt.getMonth();
  const season = m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
  const middle = [3, 6, 9, 0][season];
  const wd = dt.getDay();
  const isMiddle = m === middle;
  const contestDay = nthWeekday(dt.getFullYear(), m, 3, 2);
  const festDay = lastWeekday(dt.getFullYear(), m, 6);
  const contest = isMiddle && dt.getDate() === contestDay ? CONTESTS[season] : null;
  const festival = isMiddle && dt.getDate() === festDay ? FESTIVALS[season] : null;
  const type = festival ? 3 : wd === 0 ? 0 : wd === 6 ? 2 : 1;
  return { calendarDay: dt.getDate(), season, seasonId: SEASONS[season], type, festival, contest, show: wd === 6 && !festival, market: wd === 0 };
}

/** The current calendar for a world: Village Time counts story days, the Real Clock reads the date. */
export function calendar(world, realMs = null) {
  if (world.clock.mode === 'real' && (realMs ?? world.clock.realMs)) return realDay(realMs ?? world.clock.realMs);
  return villageDay(world.clock.day);
}
export function formatTime(minute) {
  const h24 = Math.floor(minute / 60) % 24;
  const m = Math.floor(minute % 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
export function dateLine(world, realMs = null) {
  const c = calendar(world, realMs);
  return `${SEASON_NAMES[c.season]} · ${DAY_TYPES[c.type]} · ${formatTime(world.clock.minute)}`;
}
