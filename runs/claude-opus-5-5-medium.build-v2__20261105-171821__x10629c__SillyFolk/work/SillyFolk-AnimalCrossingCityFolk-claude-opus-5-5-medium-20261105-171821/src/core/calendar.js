// Pure calendar and clock maths. Sixteen-day year in Village Time; the device's date in Real Clock.
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const DAY_TYPES = ['Market Day', 'Errand Day', 'Show Day', 'Festival Day'];
export const DAY_START = 5 * 60;
const realSeason = (month) => (month >= 2 && month <= 4 ? 0 : month >= 5 && month <= 7 ? 1 : month >= 8 && month <= 10 ? 2 : 3);
/** Maps a Date to the sixteen-day table: season, day slot (0 Market, 1 Errand, 2 Show, 3 Festival) and whether a contest falls. */
export function realDayInfo(date) {
  const m = date.getMonth(), d = date.getDate(), dow = date.getDay(), season = realSeason(m);
  const middle = [3, 6, 9, 0][season];
  const inMiddle = m === middle;
  const dim = new Date(date.getFullYear(), m + 1, 0).getDate();
  const lastSat = dow === 6 && d + 7 > dim;
  const secondWed = dow === 3 && d >= 8 && d <= 14;
  let slot = 1;
  if (dow === 0) slot = 0; else if (dow === 6) slot = 2;
  if (inMiddle && lastSat) slot = 3;
  return { season, slot, contest: inMiddle && secondWed };
}
/** Day info for a clock: { season, slot, yd (1..16), type, contest, year }. */
export function dayInfo(clock, now = null) {
  const played = clock.day;
  const storyYd = ((played - 1) % 16) + 1;
  if (clock.mode === 'real' && now) {
    const r = realDayInfo(now);
    return { season: r.season, slot: r.slot, yd: r.season * 4 + r.slot + 1, storyYd, type: DAY_TYPES[r.slot], contest: r.contest ? ['', 'derby', 'bugoff', 'snowman'][r.season] || null : null, year: Math.floor((played - 1) / 16) + 1 };
  }
  const season = Math.floor((storyYd - 1) / 4), slot = (storyYd - 1) % 4;
  return { season, slot, yd: storyYd, storyYd, type: DAY_TYPES[slot], contest: { 6: 'derby', 10: 'bugoff', 14: 'snowman' }[storyYd] || null, year: Math.floor((played - 1) / 16) + 1 };
}
export const hourOf = (clock) => Math.floor(clock.minute / 60) % 24;
/** Weather table per season: [kind, weight]. Rain-like weights scale with the rain tuning. */
export const WEATHER = [
  [['sun', 60], ['rain', 30], ['fog', 10]],
  [['sun', 70], ['rain', 20], ['storm', 10]],
  [['sun', 50], ['wind', 30], ['rain', 20]],
  [['snow', 60], ['clear', 40]],
];
/** Weather for a day: a base kind, with an hourly span when it actually falls. */
export function rollWeather(rng, season, rainX = 1) {
  const kind = rng.weighted(WEATHER[season], ([k, w]) => (k === 'rain' || k === 'storm' ? w * rainX : w))[0];
  const from = rng.int(6, 14), to = Math.min(24, from + rng.int(3, 8));
  return { kind, from, to };
}
export const weatherNow = (w, hour) => (w && hour >= w.from && hour < w.to ? w.kind : w && (w.kind === 'snow') ? 'clear' : 'sun');
export function nextFestivalDay(clockDay) { const yd = ((clockDay - 1) % 16) + 1; const add = 4 - ((yd - 1) % 4) - 1; return clockDay + (add === 0 ? 4 : add); }
