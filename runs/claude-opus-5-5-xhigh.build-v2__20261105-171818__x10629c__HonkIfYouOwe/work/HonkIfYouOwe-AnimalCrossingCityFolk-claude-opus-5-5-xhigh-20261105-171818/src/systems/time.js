// The clock: game minutes, the sky, day rollover. Weather and season are read from here.
import { calendar } from '../core/calendar.js';
import { weatherPlan, weatherAt } from '../core/weather.js';
import { tuning } from '../dev/tuning.js';

export const calendarNow = (g) => calendar(g.world, g.realNow);
export const hourNow = (w) => Math.floor(w.clock.minute / 60) % 24;
export const absMinute = (w) => w.clock.day * 1440 + w.clock.minute;

/** The day's plan, cached per day. */
export function dayWeather(g) {
  const w = g.world;
  const c = calendarNow(g);
  const key = `${w.clock.day}:${c.season}:${tuning.rainMult}:${w.flags.forceWeather ?? ''}`;
  if (g.weatherKey !== key) {
    g.weatherKey = key;
    g.weatherPlan = w.flags.forceWeather ? { kind: w.flags.forceWeather, start: 0, stop: 30, calm: w.flags.forceWeather } : weatherPlan(w.seed, w.clock.day, c.season, tuning.rainMult);
    // winter nights on Long Night stay clear
    if (c.festival === 'longNight') g.weatherPlan = { kind: 'snow', start: 16, stop: 30, calm: 'clear' };
    if (c.festival === 'lanternFloat' || c.festival === 'seedToss' || c.festival === 'greatSoup') g.weatherPlan = { kind: 'sun', start: 0, stop: 30, calm: c.season === 3 ? 'clear' : 'sun' };
  }
  return g.weatherPlan;
}
export function weatherNow(g) {
  return weatherAt(dayWeather(g), g.world.clock.minute / 60);
}
export const isRaining = (g) => { const k = weatherNow(g); return k === 'rain' || k === 'storm'; };

/** Advance the clock; a real-minute advance runs the day rollover when it crosses 05:00. */
export function advanceClock(g, dt) {
  const w = g.world;
  const c = w.clock;
  if (c.mode === 'real') {
    if (g.realNow) {
      const d = new Date(g.realNow);
      const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      if (c.minute < 300 && m >= 300 && c.lastRealMs != null) { c.minute = m; g.newDay(); }
      else if (c.lastRealMs != null && g.realNow - c.lastRealMs > 86400000) { c.minute = m; g.newDay(); }
      c.minute = m;
      c.realMs = g.realNow;
      c.lastRealMs = g.realNow;
    }
    return;
  }
  const rate = tuning.gameMinutesPerSecond * (w.story.day1Active ? 0.5 : 1);
  const before = c.minute;
  c.minute += dt * rate;
  if (before < 300 && c.minute >= 300) g.newDay();
  if (c.minute >= 1440) c.minute -= 1440;
}
