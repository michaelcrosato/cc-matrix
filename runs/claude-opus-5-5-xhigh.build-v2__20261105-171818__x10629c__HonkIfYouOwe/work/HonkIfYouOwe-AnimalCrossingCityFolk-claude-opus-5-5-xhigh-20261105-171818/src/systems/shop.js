// What is on the shelves today. Stock is seeded per day; what you bought today stays bought.
import { Stream } from '../core/rng.js';
import { ITEMS } from '../data/items.js';
import { FURNITURE } from '../data/furniture.js';
import { CLOTHES, HAT_ITEMS, GLASSES_ITEMS, UMBRELLAS } from '../data/clothes.js';
import { FLOORS, WALLS } from '../art/textures.js';

const forSale = (l) => l.filter((x) => !x.notForSale && !x.couture && !x.rare);
export function dailyStock(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:stock:${w.clock.day}`);
  const fur = s.shuffle(forSale(FURNITURE));
  const clo = s.shuffle(forSale(CLOTHES));
  const list = [];
  const push = (id, kind = 'buy') => { if (!w.flags[`bought:${w.clock.day}:${id}`]) list.push({ id, kind }); };
  push(fur[0].id); push(fur[1].id);
  push(clo[0].id); push(clo[1].id);
  push(s.pick(WALLS).id); push(s.pick(FLOORS).id);
  if (w.clock.day >= 2 || w.flags.toolsAll) { push('axe'); push('slingshot'); }
  for (const t of ['net', 'rod', 'shovel', 'can']) if (w.player.tools.includes(t) || w.flags.toolsAll) push(t);
  push(`seed${s.pick(['Tulip', 'Daisy', 'Rose', 'Bellflower'])}`);
  push('stationery'); push('medicine');
  if (w.clock.day % 2 === 0) push('sapling');
  return list.slice(0, 14);
}
export function mothwickStock(g) {
  const w = g.world;
  const s = new Stream(`${w.seed}:mothwick:${w.clock.day}`);
  const list = [];
  const push = (id) => { if (!w.flags[`bought:${w.clock.day}:${id}`]) list.push({ id, kind: 'buy' }); };
  for (const c of s.shuffle(forSale(CLOTHES)).slice(0, 4)) push(c.id);
  for (const h of s.shuffle(forSale(HAT_ITEMS)).slice(0, 1)) push(h.id);
  for (const h of s.shuffle(forSale(GLASSES_ITEMS)).slice(0, 1)) push(h.id);
  for (const u of s.shuffle(forSale(UMBRELLAS)).slice(0, 1)) push(u.id);
  return list;
}
export { ITEMS };
