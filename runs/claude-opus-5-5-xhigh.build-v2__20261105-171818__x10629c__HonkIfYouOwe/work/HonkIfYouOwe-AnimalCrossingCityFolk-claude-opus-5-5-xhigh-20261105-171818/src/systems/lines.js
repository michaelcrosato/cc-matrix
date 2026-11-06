// Lines are data: { id, text, when: { season, weather, hour, friendMin, memory }, weight }.
// Each line is seen once before it repeats.
import { TYPE_LINES } from '../data/dialogue/types.js';
import { UNIQUE, MEMORY_LINES, GOSSIP } from '../data/dialogue/unique.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { NEIGHBOURS, NEIGHBOUR_ORDER } from '../data/neighbours.js';
import { calendar, SEASON_NAMES } from '../core/calendar.js';
import { hash32, Stream } from '../core/rng.js';
import { ITEMS } from '../data/items.js';

const BANK_WHEN = {
  morning: { hour: [5, 11] }, noon: { hour: [11, 16] }, evening: { hour: [16, 21] }, night: { hour: [21, 29] },
  rain: { weather: ['rain', 'storm'] }, snow: { weather: ['snow'] }, sun: { weather: ['sun', 'clear'] }, wind: { weather: ['wind'] },
  spring: { season: 0 }, summer: { season: 1 }, autumn: { season: 2 }, winter: { season: 3 },
};
export function lineObjects() {
  const out = [];
  for (const [type, banks] of Object.entries(TYPE_LINES)) {
    for (const [bank, list] of Object.entries(banks)) list.forEach((text, i) => out.push({ id: `${type}.${bank}.${i}`, type, bank, text, when: BANK_WHEN[bank] ?? {}, weight: 1 }));
  }
  return out;
}
export function allLineTexts() {
  const out = [];
  for (const banks of Object.values(TYPE_LINES)) for (const list of Object.values(banks)) out.push(...list);
  for (const list of Object.values(UNIQUE)) out.push(...list);
  for (const list of Object.values(MEMORY_LINES)) out.push(...list);
  out.push(...GOSSIP);
  for (const host of Object.values(HOSTS)) for (const v of Object.values(host)) { if (Array.isArray(v)) for (const e of v) out.push(typeof e === 'string' ? e : e.text); else if (typeof v === 'object') out.push(...Object.values(v)); }
  return out;
}
const TAGS = /\{(\w+)\}/g;
export const KNOWN_TAGS = new Set(['player', 'town', 'item', 'neighbour', 'catch', 'target', 'debt', 'beans', 'season', 'text']);
/** Resolve tags. Names come out wrapped so the dialogue draws them in colour. */
export function resolveTags(text, g, extra = {}) {
  return text.replace(TAGS, (m, tag) => {
    if (extra[tag] !== undefined) return String(extra[tag]);
    const w = g?.world;
    switch (tag) {
      case 'player': return w?.player.name ?? 'you';
      case 'town': return w?.player.town ?? 'here';
      case 'neighbour': return 'someone';
      case 'item': return 'thing';
      case 'catch': return 'fish';
      case 'debt': return (w?.player.debt ?? 0).toLocaleString('en-US');
      case 'season': return SEASON_NAMES[calendar(w).season].toLowerCase();
      default: return m;
    }
  });
}
function order(w, ownerBank, n) {
  const s = new Stream(`${w.seed}:lines:${ownerBank}`);
  return s.shuffle(Array.from({ length: n }, (_, i) => i));
}
/** Next unseen line in a bank. Cycles through all of them before repeating. */
export function nextFrom(w, owner, bank, list) {
  if (!list?.length) return null;
  w.flags.seen ??= {};
  const k = `${owner}.${bank}`;
  const i = w.flags.seen[k] ?? 0;
  w.flags.seen[k] = i + 1;
  const ord = order(w, k, list.length);
  return list[ord[i % list.length]];
}
export const hostLine = (g, host, bank) => {
  const list = HOSTS[host]?.[bank];
  return nextFrom(g.world, host, bank, list);
};
export const typeLine = (g, npcId, bank) => {
  const t = NEIGHBOURS[npcId].type;
  return nextFrom(g.world, npcId, bank, TYPE_LINES[t][bank]);
};
export const uniqueLine = (g, npcId) => nextFrom(g.world, npcId, 'unique', UNIQUE[npcId]);
export const otherNeighbour = (g, not) => {
  const here = NEIGHBOUR_ORDER.filter((n) => n !== not && g.world.npcs[n].moved === 'here');
  const s = new Stream(`${g.world.seed}:other:${g.world.clock.day}:${not}:${g.world.stats.talks[not] ?? 0}`);
  return NEIGHBOURS[s.pick(here)].short ?? NEIGHBOURS[s.pick(here)].name;
};
export const gossipLine = (g, npcId) => {
  const t = nextFrom(g.world, npcId, 'gossip', GOSSIP);
  return t.replace(/\{neighbour\}/g, otherNeighbour(g, npcId));
};
export { hash32, ITEMS };
