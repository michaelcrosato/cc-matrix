// Registry of systems. Each is a plain object of functions over (g).
import { time } from './time.js'; import { chime } from './chime.js'; import { hud } from './hud.js'; import { interact } from './interact.js'; import { memory, friend } from './memory.js';
import { nature } from './nature.js'; import { verbs } from './verbs.js'; import { reveal, items, trees, dig, flowers } from './gather.js'; import { economy, gifts } from './economy.js'; import { mail } from './mail.js';
import { notice, stars, wardrobe, plant, seasons, year, rating } from './small.js'; import { intro, errands } from './story.js'; import { places } from './places.js'; import { venues, museum, shops } from './venues.js';
import { pause, pockets, map, almanac, emote, about, dev } from './shell.js'; import { extras } from './extras.js';
export function registerSystems(g) {
  venues.defineRooms();
  const sys = { time, chime, hud, interact, memory, friend, nature, verbs, reveal, items, trees, dig, flowers, economy, gifts, mail, notice, stars, wardrobe, plant, seasons, year, rating, intro, errands, places, venues, museum, shops, pause, pockets, map, almanac, emote, about, dev, ...extras(g) };
  sys.testHandle = (gg) => ({ game: gg, world: () => gg.world, ui: () => ({ stack: gg.ui.stack.map(s => s.id), device: gg.ui.dev, top: gg.ui.top?.id ?? null, ...gg.ui.model() }), model: () => gg.ui.model(), status: () => gg.status(), tuning: () => import('../data/tuning.js').then(m => m.tuning), sys, ctx: gg.ctx });
  return sys;
}
