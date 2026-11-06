// Everything that happens when the sun comes up: weather, spawns, growth, stock, mail, cheese, absence.
import { rngOf, clamp } from '../core/util.js';
import { addEnt, removeEnt, entAt, isFree, info, addLetter, remember, friendGain, giveItem } from '../core/world.js';
import { rollWeather, nextFestivalDay, SEASONS } from '../core/calendar.js';
import { T } from '../dev/tuning.js';
import { ITEMS, FURNITURE, CLOTHES, HATS_DATA, GLASSES_DATA, WALLS, FLOORS, UMBRELLAS, FOSSILS, HYBRIDS, FLOWER_SPECIES, ART_LIST } from '../data/items.js';
import { GRAN_LETTERS, TYPE_LINES } from '../data/lines.js';
import { CAST, NEIGHBOURS } from '../data/cast.js';
import { TOWN_ROWS } from '../data/townMap.js';
const SHELL_POOL = ['shell_clam', 'shell_clam', 'shell_scallop', 'shell_cone', 'drift_wood', 'drift_bottle', 'shell_pearl'];
export const CHEESE_PATTERNS = ['Rising', 'Falling', 'Wobble', 'Spike'];
const flip = (w, r) => r.int(3, 74);
function freeSpot(w, r, zones, tries = 60) { for (let i = 0; i < tries; i++) { const z = r.pick(zones); const tx = r.int(z[0], z[2]), tz = r.int(z[1], z[3]); if (isFree(w, tx, tz, 0)) return [tx, tz]; } return null; }
const LAND = [[3, 16, 36, 31], [46, 16, 76, 31], [3, 32, 15, 46], [46, 32, 76, 46], [17, 45, 39, 49], [3, 3, 30, 14], [50, 3, 76, 14]];
const BEACH = [[3, 50, 38, 55], [48, 50, 76, 55]];
export function weatherOf(w) { const r = rngOf(`${w.seed}:wx:${w.clock.day}`); const s = info(w).season; return rollWeather(r, s, T.rain); }
/** One new day. `cross` is called at 05:00 by the clock. Deterministic in seed + day. */
export function rollDay(w) {
  const r = rngOf(`${w.seed}:day:${w.clock.day}`), inf = info(w), s = inf.season;
  w.weather = weatherOf(w); w.stats.days++;
  // growth over every entity
  for (const e of Object.values(w.ents)) {
    if (e.t === 'tree') { if (e.kind === 'pear' && e.fruit === 0 && (e.regrow -= 1) <= 0) { e.fruit = e.fruitKind ? 3 : 3; } e.drop = null; }
    if (e.t === 'sapling') { e.age = (e.age ?? 0) + 1; if (e.age >= 3 && !e.mayor) { removeEnt(w, e); addEnt(w, { t: 'tree', kind: e.kind ?? 'pear', x: e.x, z: e.z, hits: 0, fruit: 3, regrow: 0, fruitKind: e.fruitKind }); } else if (e.mayor && e.age >= 4) { removeEnt(w, e); addEnt(w, { t: 'tree', kind: 'pear', x: e.x, z: e.z, hits: 0, fruit: 3, regrow: 0, mayor: true }); } w.dirty = true; }
    if (e.t === 'beanstalk') { e.age = (e.age ?? 0) + 1; w.dirty = true; }
    if (e.t === 'buried') { removeEnt(w, e); addEnt(w, { t: 'beanstalk', x: e.x, z: e.z, value: e.value, age: 0 }); }
    if (e.t === 'crack' && !e.first) removeEnt(w, e);
    if (e.t === 'sparkle') removeEnt(w, e);
    if (e.t === 'hole') { e.age = (e.age ?? 0) + 1; if (e.age > 1) removeEnt(w, e); }
    if (e.t === 'snowball' && s !== 3) removeEnt(w, e);
    if (e.t === 'snowman' && s !== 3) removeEnt(w, e);
    if (e.t === 'shell' && r.chance(0.5)) removeEnt(w, e);
    if (e.t === 'rock') e.pay = 0;
  }
  // flowers: wet flag → hybrids; dry → wilt; rain waters everything
  const rained = w.lastWeather === 'rain' || w.lastWeather === 'storm';
  const flowers = Object.values(w.ents).filter((e) => e.t === 'flower');
  for (const f of flowers) { if (f.wet || rained) f.dry = 0; else f.dry = (f.dry ?? 0) + 1; f.wilted = f.dry >= 2; }
  for (const a of flowers) { if (!a.wet && !rained) continue; for (const b of flowers) { if (a === b || b.sp !== a.sp || Math.abs(a.x - b.x) + Math.abs(a.z - b.z) !== 1 || a.id > b.id) continue; if (!b.wet && !rained) continue; const ck = [`${a.sp}:${a.c}+${b.c}`, `${a.sp}:${b.c}+${a.c}`].find((k) => HYBRIDS[k]); const c = ck ? HYBRIDS[ck] : null; if (c && r.chance(T.hybrid)) { for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const tx = Math.floor(a.x) + dx, tz = Math.floor(a.z) + dz; if (isFree(w, tx, tz, 0)) { addEnt(w, { t: 'flower', sp: a.sp, c, x: tx + 0.5, z: tz + 0.5, dry: 0, wet: 0, hybrid: true }); w.stats.hybrids = (w.stats.hybrids ?? 0) + 1; break; } } } } }
  for (const f of flowers) f.wet = 0;
  // spawns
  const cracks = 3; for (let i = 0; i < cracks; i++) { const p = freeSpot(w, r, LAND); if (p) addEnt(w, { t: 'crack', real: r.pick(FOSSILS)[0], x: p[0] + 0.5, z: p[1] + 0.5 }); }
  { const p = freeSpot(w, r, LAND); if (p) addEnt(w, { t: 'sparkle', value: r.pick([300, 500, 800, 1000]), x: p[0] + 0.5, z: p[1] + 0.5 }); }
  for (let i = 0; i < T.weeds; i++) { const p = freeSpot(w, r, LAND); if (p && weedsCount(w) < 40) addEnt(w, { t: 'weed', x: p[0] + 0.5, z: p[1] + 0.5 }); }
  for (let i = 0; i < 6; i++) { const p = freeSpot(w, r, BEACH); if (p) addEnt(w, { t: 'shell', it: r.pick(SHELL_POOL), x: p[0] + 0.5, z: p[1] + 0.5 }); }
  if (s === 2) for (let i = 0; i < 5; i++) { const p = freeSpot(w, r, [[3, 3, 15, 14], [62, 16, 76, 19]]); if (p) addEnt(w, { t: 'item', it: 'mushroom', x: p[0] + 0.5, z: p[1] + 0.5 }); }
  const pears = Object.values(w.ents).filter((e) => e.t === 'tree' && e.kind !== 'pine');
  r.shuffle(pears); if (pears[0]) pears[0].drop = r.chance(0.5) ? 'bag' : 'furn'; if (pears[1]) pears[1].drop = 'wasp';
  const rocks = Object.values(w.ents).filter((e) => e.t === 'rock'); if (rocks.length) rocks[r.int(0, rocks.length - 1)].pay = 1;
  w.balloonsLeft = T.balloons; w.balloonNext = 7 * 60 + r.int(0, 180);
  // store
  rollStock(w, r);
  // cheese
  if (w.cheese.season !== s) { w.cheese.season = s; }
  if (inf.slot === 0) { w.cheese.base = r.int(90, 110); w.cheese.pattern = r.pick(CHEESE_PATTERNS); w.cheese.seed = r.int(0, 1e6); w.cheese.buyDay = w.clock.day; for (let i = 0; i < w.p.pockets.length; i++) { const e = w.p.pockets[i]; if (e && e.id === 'cheesewheel' && e.bought < w.clock.day) w.p.pockets[i] = { id: 'cheesebad' }; } }
  // favours
  rollFavours(w, r);
  // mail arrives at 09:00: moved by the hourly tick
  // Gran each season
  if (inf.slot === 0 && w.clock.day > 1) addLetter(w, { from: 'gran', subject: 'From Gran', body: GRAN_LETTERS[(w.stats.gran = (w.stats.gran ?? 0) + 1) % GRAN_LETTERS.length], gift: r.pick(['fig', 'quince', 'fig', 'b_medal_b'.replace('b_medal_b', 'box')]) }, w.clock.day);
  // neighbour letters by friendship
  for (const n of NEIGHBOURS) { const st = w.npcs[n]; if (st.moved === 'gone' || st.moved === 'notyet') continue; if (st.friend >= 12 && r.chance(0.12 + st.friend / 500)) { const t = CAST[n].type; const list = TYPE_LINES[t].letter; addLetter(w, { from: n, subject: 'From ' + CAST[n].name, body: r.pick(list), gift: st.friend >= 40 ? r.pick(['pear', 'plant1', 'books', 's_mist', 'h_party', 'c_chair', 'seed_tulip']) : null, giftFrom: n }, w.clock.day); } }
  if (r.chance(0.2)) addLetter(w, { from: 'ozzie', subject: 'Anonymous Tip', body: r.pick(TYPE_LINES.schemer.letter), gift: null }, w.clock.day);
  // wishes: a present in the morning
  for (const wsh of w.wishes.splice(0)) addLetter(w, { from: 'narrator', subject: 'Something Fell Out of the Sky', body: 'No return address. It is warm. It smells faintly of wishes and diesel.', gift: wsh.gift ?? 'wish_star' }, w.clock.day);
  // puffy eyes, buffs end at morning
  w.p.puffy = false; w.p.buffs = {};
  // wear heals
  for (const k of Object.keys(w.wear)) { w.wear[k] = Math.max(0, w.wear[k] - 6); if (w.wear[k] <= 0) { delete w.wear[k]; if (w.worn[k]) { delete w.worn[k]; w.wornDirty = true; } } }
  // interest each season start
  if (inf.slot === 0) { const add = Math.floor(w.p.jar * 0.005); if (add > 0) { w.p.jar += add; } }
}
export const weedsCount = (w) => Object.values(w.ents).filter((e) => e.t === 'weed').length;
export function rollStock(w, r) {
  const pick = (l, n) => r.shuffle(l.slice()).slice(0, n).map((x) => x.id);
  const tier = w.p.spent >= 120000 ? 3 : w.p.spent >= 25000 ? 2 : 1;
  const sets = FURNITURE.filter((f) => f.set !== 'Trophy' && !/snowman_gift|wish_star/.test(f.id) && (f.set !== 'City Loft' && f.set !== 'Cheese'));
  const stock = [...pick(sets, tier + 1), ...pick(CLOTHES.filter((c) => !c.couture && c.price > 0), 2), ...pick(WALLS, 1), ...pick(FLOORS, 1), 'seed_' + r.pick(Object.keys(FLOWER_SPECIES)), 'sapling', 'paper', 'medicine', r.pick(['box', 'bear', 'toilet', 'books', 'coat'])];
  const t = w.clock.day; if (t >= 2) stock.push('axe', 'sling');
  w.shop = { day: t, stock: stock.map((id) => ({ id, sold: false })) };
  w.moth = { day: t, stock: [...pick(CLOTHES.filter((c) => !c.couture && c.price > 0), 3), ...pick(HATS_DATA, 2), ...pick(GLASSES_DATA, 1), ...pick(UMBRELLAS.filter((u) => u.id !== 'u_pattern'), 1)].map((id) => ({ id, sold: false })) };
  const arts = r.shuffle(ART_LIST.slice()).slice(0, 3); w.magda = { day: t, offers: arts.map((a) => ({ id: a.id, forged: r.chance(0.5), price: 3500 + r.int(0, 3) * 500, sold: false })), rare: pick(FURNITURE.filter((f) => f.set === 'City Loft' || f.set === 'Cheese'), 1)[0] };
  const lots = r.shuffle(FURNITURE.filter((f) => ['City Loft', 'Cheese', 'Bureau'].includes(f.set) || f.fn === 'mirror' || f.fn === 'tank').slice()).slice(0, 3);
  w.auction = { day: t, lots: lots.map((f) => ({ id: f.id, limits: [0, 1, 2].map(() => Math.round(f.price * r.range(0.4, 1.3))), done: false })) };
}
const FAV_TEMPLATES = [
  (r) => ({ kind: 'fetch', item: 'pear' }), (r) => ({ kind: 'fetch', item: 'weed' }), (r) => ({ kind: 'fetch', item: r.pick(['shell_clam', 'shell_scallop', 'drift_wood']) }), (r) => ({ kind: 'fetch', item: 'mushroom', season: 2 }), (r) => ({ kind: 'fetch', item: 'fl_daisy_white' }), (r) => ({ kind: 'fetch', item: 'fl_tulip_red' }),
  (r) => ({ kind: 'catch', item: r.pick(['minnow', 'perch', 'carp', 'sardine', 'flounder']), hours: 1 }), (r) => ({ kind: 'catch', item: r.pick(['cabbagefly', 'ladybird', 'grasshopper', 'cricket', 'moth', 'pillbug']), hours: 1 }),
  (r) => ({ kind: 'deliver' }), (r) => ({ kind: 'deliver' }), (r) => ({ kind: 'deliver' }), (r) => ({ kind: 'lost' }), (r) => ({ kind: 'lost' }), (r) => ({ kind: 'trade', item: 'pear', give: 'quince' }), (r) => ({ kind: 'trade', item: 'shell_scallop', give: 's_mist' }), (r) => ({ kind: 'fetch', item: 'boot' }), (r) => ({ kind: 'fetch', item: 'cheesewheel' }), (r) => ({ kind: 'catch', item: 'trout', hours: 2 }), (r) => ({ kind: 'trade', item: 'mushroom', give: 'bear' }), (r) => ({ kind: 'fetch', item: 'fossil_unk' }),
];
export const FAVOUR_COUNT = FAV_TEMPLATES.length;
function rollFavours(w, r) {
  const here = NEIGHBOURS.filter((n) => !['gone', 'notyet'].includes(w.npcs[n].moved));
  w.favours = [];
  if (w.clock.day < 2) return;
  r.shuffle(here.slice()).slice(0, 2).forEach((npc) => { const t = r.pick(FAV_TEMPLATES)(r); if (t.season != null && t.season !== info(w).season) { t.kind = 'fetch'; t.item = 'pear'; delete t.season; } const other = r.pick(here.filter((x) => x !== npc)); w.favours.push({ npc, ...t, other, state: 'open', reward: Math.round(r.int(3, 9) * 100 * T.favour) }); });
}
/** Absence: real days away → weeds, dust bunnies, letters, first-talk lines. */
export function applyAbsence(w, nowMs) {
  const d = Math.floor((nowMs - (w.lastReal || nowMs)) / 86400000); if (d < 1) return 0;
  const r = rngOf(`${w.seed}:abs:${nowMs}`);
  for (let i = 0; i < d * 3; i++) { const p = freeSpot(w, r, LAND); if (p && weedsCount(w) < 40) addEnt(w, { t: 'weed', x: p[0] + 0.5, z: p[1] + 0.5 }); }
  w.dust = clamp((w.dust ?? 0) + d * r.int(1, 3), 0, 8);
  for (const f of Object.values(w.ents)) if (f.t === 'flower') { f.dry = 2; f.wilted = true; }
  for (const n of NEIGHBOURS) if (w.npcs[n]) w.npcs[n].absent = true;
  addLetter(w, { from: 'gran', subject: 'Are You Dead?', body: `${w.name}. You didn't write. I assumed the worst. It was quite restful. Gran.`, gift: null }, w.clock.day);
  remember(w, 'absent', { days: d });
  return d;
}
export const cheesePrice = (w) => {
  const c = w.cheese; const inf = info(w); if (!c.pattern) return 100;
  const since = Math.max(0, w.clock.day - (c.buyDay ?? w.clock.day)); const half = Math.floor(since * 2 + (w.clock.minute >= 14 * 60 ? 1 : 0)) - (w.clock.minute < 8 * 60 ? 1 : 0);
  const r = rngOf(`${w.seed}:cheese:${c.seed}:${half}`); const b = c.base, v = T.cheese;
  const t = clamp(half, 0, 6) / 6;
  let f;
  if (c.pattern === 'Rising') f = 1 + t * (0.9 + r.range(-0.1, 0.1));
  else if (c.pattern === 'Falling') f = 1 - t * 0.6;
  else if (c.pattern === 'Wobble') f = 1 + Math.sin(half * 1.7) * 0.35 + r.range(-0.1, 0.1);
  else f = half === 4 ? 3 + rngOf(`${w.seed}:spike:${c.seed}`).range(0, 3) : half === 3 || half === 5 ? 1.6 : 0.8;
  return Math.max(10, Math.round(b * (1 + (f - 1) * v)));
};
