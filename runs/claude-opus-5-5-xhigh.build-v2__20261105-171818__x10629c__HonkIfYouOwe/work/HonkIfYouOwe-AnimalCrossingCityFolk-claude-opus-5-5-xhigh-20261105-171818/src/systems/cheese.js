// Our own speculative game: Old Rind's cheese. Prices move at 08:00 and 14:00 on the next three days.
import { Stream } from '../core/rng.js';
import { tuning } from '../dev/tuning.js';
import { addItem, hasRoom, addBeans } from './economy.js';

export const CHEESE_PATTERNS = ['Rising', 'Falling', 'Wobble', 'Spike'];
/** Price at a given Market-Day-relative tick. Pure, for tests: tick 0-5 (three days, two prices a day). */
export function cheeseCurve(pattern, base, tick, rng, vol = 1) {
  const noise = () => 1 + (rng.next() - 0.5) * 0.12 * vol;
  switch (pattern) {
    case 'Rising': return Math.round(base * (1 + (tick + 1) * 0.28 * vol) * noise());
    case 'Falling': return Math.max(10, Math.round(base * (1 - (tick + 1) * 0.12 * vol) * noise()));
    case 'Wobble': return Math.max(10, Math.round(base * (1 + Math.sin(tick * 2.1 + 1) * 0.35 * vol) * noise()));
    case 'Spike': {
      const peak = 3 + Math.floor(rng.next() * 3);
      const spikeTick = 3;
      if (tick < spikeTick - 1) return Math.max(10, Math.round(base * (0.8 + tick * 0.1) * noise()));
      if (tick === spikeTick) return Math.round(base * (1 + (peak - 1) * vol));
      if (tick === spikeTick - 1 || tick === spikeTick + 1) return Math.round(base * (1 + (peak - 1) * 0.45 * vol) * noise());
      return Math.max(10, Math.round(base * 0.7 * noise()));
    }
    default: return base;
  }
}
export function cheeseState(w, seasonOfWeek, marketDay) {
  const s = new Stream(`${w.seed}:cheese:${marketDay}`);
  const pattern = s.pick(CHEESE_PATTERNS);
  const base = s.int(90, 110);
  const prices = [];
  for (let t = 0; t < 6; t++) prices.push(cheeseCurve(pattern, base, t, new Stream(`${w.seed}:cheese:${marketDay}:${t}`), tuning.cheeseVol));
  return { pattern, base, prices };
}
export function cheeseDayReset(g, c) {
  const w = g.world;
  if (c.market) {
    w.cheese.day = w.clock.day;
    // Wheels go bad at the next Market Day
    for (const slot of w.player.pockets) if (slot?.id === 'cheese' && slot.buyDay < w.clock.day) { slot.id = 'cheeseOff'; g.events.emit('cheeseOff', {}); g.sound('cheeseSmell'); }
    for (const k of Object.keys(w.town.objects)) { const o = w.town.objects[k]; if (o.k === 'drop' && o.item === 'cheese') { o.item = 'cheeseOff'; g.town.dirty.add(k); } }
  }
}
/** Today's store price for a wheel, or the buying price on Market Day. */
export function cheesePriceNow(g) {
  const w = g.world;
  const market = w.cheese.day || 1;
  const st = cheeseState(w, g.season, market);
  const since = w.clock.day - market;
  if (since <= 0 || since > 3) return st.base;
  const tick = (since - 1) * 2 + (w.clock.minute >= 14 * 60 ? 1 : 0);
  if (w.clock.minute < 8 * 60 && since === 1) return st.base;
  return st.prices[Math.min(5, tick)];
}
export function buyCheese(g, n = 1) {
  const w = g.world;
  const st = cheeseState(w, g.season, w.cheese.day || w.clock.day);
  const cost = st.base * n;
  if (w.player.beans < cost || !hasRoom(w)) return false;
  addBeans(g, -cost, 'cheese');
  for (let i = 0; i < n; i++) addItem(g, 'cheese', { buyDay: w.clock.day, boughtFor: st.base });
  w.stats.cheeseBought = (w.stats.cheeseBought ?? 0) + n;
  g.events.emit('cheeseBought', { n, price: st.base });
  return true;
}
