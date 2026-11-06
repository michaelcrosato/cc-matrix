// All monsters. brain chooses src/sim/monsters.js behaviour; numbers are data.
const M = (o) => ({ radius: 0.42, reach: 1.5, wind: 0.5, rec: 0.6, aggro: 12, big: false, xp: 1, gold: 0.6, ...o });
export const MONSTERS = {
  peatwalker: M({ id: 'peatwalker', name: 'Peatwalker', hp: 1, hit: 1, speed: 1.4, brain: 'melee', body: 'peatwalker', walk: 'Shamble', attack: 'Lurch', burst: 'peat', material: 'flesh', knell: 1, lore: 'Dug in by the parish. Dug out by the bell. Slow, sodden, and bursts if struck firmly.' }),
  gibbet_drop: M({ id: 'gibbet_drop', name: 'Gibbet Drop', hp: 0.7, hit: 0.9, speed: 3.4, brain: 'lunge', body: 'gibbet_drop', walk: 'Run', attack: 'Lunge', burst: 'peat', material: 'flesh', knell: 1, lore: 'Left hanging for a crime nobody remembers. Lets go when you walk under.' }),
  rattlebones: M({ id: 'rattlebones', name: 'Rattlebones', hp: 0.8, hit: 1, speed: 3.2, brain: 'melee', body: 'rattlebones', walk: 'Run', attack: 'Slash1', burst: 'bone_chips', material: 'bone', knell: 1, wind: 0.35, lore: 'A skeleton with a rusted sword and no remaining doubts.' }),
  choir_skull: M({ id: 'choir_skull', name: 'Choir Skull', hp: 0.5, hit: 1.1, speed: 2.4, brain: 'floater', body: 'choir_skull', hover: 1.2, burst: 'bone_chips', material: 'bone', knell: 1, wind: 0.8, rec: 1.5, radius: 0.35, lore: 'Sings a sour note at a respectful distance. Still holds the note. Always held the note.' }),
  pallid_bearer: M({ id: 'pallid_bearer', name: 'Pallid Bearer', hp: 4, hit: 1.8, speed: 1.6, brain: 'slam', body: 'pallid_bearer', scale: 1.5, walk: 'Shamble', attack: 'CoffinSlam', burst: 'bone_chips', material: 'bone', big: true, knell: 3, xp: 3, gold: 1.2, radius: 0.7, reach: 2.4, wind: 0.8, rec: 0.9, lore: 'It carries the coffin. It has not been told the funeral is over.' }),
  tomb_crawler: M({ id: 'tomb_crawler', name: 'Tomb Crawler', hp: 0.4, hit: 0.6, speed: 5, brain: 'melee', body: 'tomb_crawler', burst: 'bone_chips', material: 'bone', knell: 1, radius: 0.32, reach: 1.1, wind: 0.2, rec: 0.5, xp: 0.5, gold: 0.2, proc: 'crawler', lore: 'Hatched from nests in the old walls. They only want to be held. By the throat.' }),
  bloat_deacon: M({ id: 'bloat_deacon', name: 'Bloat Deacon', hp: 2, hit: 2.5, speed: 2, brain: 'bloat', body: 'bloat_deacon', burst: 'grave_smoke', material: 'flesh', knell: 3, xp: 2, radius: 0.6, reach: 2.2, wind: 1, proc: 'blob', lore: 'A very full deacon. Swells with emotion, then shares it within four metres.' }),
  cinderling: M({ id: 'cinderling', name: 'Cinderling', hp: 0.4, hit: 0.7, speed: 4.6, brain: 'leaper', body: 'cinderling', scale: 0.6, walk: 'Run', attack: 'Lunge', burst: 'ember', material: 'stone', knell: 1, radius: 0.3, reach: 1.2, wind: 0.35, rec: 0.7, xp: 0.6, lore: 'Small, hot, and from Below. They hate sound and love you. Neither is mutual.' }),
  tithe_collector: M({ id: 'tithe_collector', name: 'Tithe Collector', hp: 1.6, hit: 1.2, speed: 2.8, brain: 'hook', body: 'tithe_collector', walk: 'Walk', attack: 'Slash2', burst: 'coin_spray', material: 'flesh', knell: 2, xp: 2, gold: 2, wind: 0.6, lore: 'Hooks you by the collar, takes what you owe. Kill it and it pays the lot back.' }),
  penitent: M({ id: 'penitent', name: 'Penitent', hp: 1.2, hit: 1.4, speed: 3, brain: 'blinker', body: 'penitent', walk: 'Walk', attack: 'Slash1', burst: 'grave_smoke', material: 'flesh', knell: 2, xp: 2, wind: 0.3, rec: 0.25, lore: 'Sorry for everything. Especially for this. And this. And this.' }),
  clapperjaw: M({ id: 'clapperjaw', name: 'Clapperjaw', hp: 5, hit: 2, speed: 2.4, brain: 'charger', body: 'clapperjaw', burst: 'ember', material: 'stone', big: true, knell: 3, xp: 3, gold: 1.2, radius: 0.9, reach: 2.2, wind: 0.9, rec: 1, proc: 'quadruped', lore: 'A great beast of the Unrung, all jaw. Roars, charges, and regrets walls.' }),
  ash_gargoyle: M({ id: 'ash_gargoyle', name: 'Ash Gargoyle', hp: 1.4, hit: 1.2, speed: 5, brain: 'gargoyle', body: 'ash_gargoyle', hover: 0.5, burst: 'bone_chips', material: 'stone', knell: 2, xp: 2, wind: 0.2, rec: 1.1, lore: 'Sat on the roof for eight hundred years watching people. It has opinions.' }),
  shade_acolyte: M({ id: 'shade_acolyte', name: 'Shade Acolyte', hp: 1, hit: 0.8, speed: 2.6, brain: 'necro', body: 'shade_acolyte', walk: 'Walk', attack: 'Cast', burst: 'grave_smoke', material: 'flesh', knell: 2, xp: 2, wind: 0.7, rec: 1.2, lore: 'Raises corpses every five seconds and keeps well back. Kill it first. Everyone says so.' }),
  collection_plate: M({ id: 'collection_plate', name: 'The Collection Plate', hp: 6, hit: 0, speed: 7, brain: 'plate', body: 'collection_plate', burst: 'coin_spray', material: 'metal', knell: 8, xp: 4, gold: 0, radius: 0.5, proc: 'plate', lore: 'A living offering dish on little legs. It has what you gave, and everything anyone else did.' }),
  crawler_nest: M({ id: 'crawler_nest', name: 'Crawler Nest', hp: 8, hit: 0, speed: 0, brain: 'spawner', body: 'crawler_nest', spawn: 'tomb_crawler', burst: 'bone_chips', material: 'bone', static: true, knell: 3, xp: 3, gold: 1, radius: 0.9, lore: 'A wet mound in the wall. It hums. Do not put your ear to it.' }),
  unrung_font: M({ id: 'unrung_font', name: 'Unrung Font', hp: 8, hit: 0, speed: 0, brain: 'spawner', body: 'unrung_font', spawn: 'cinderling', burst: 'ember', material: 'stone', static: true, knell: 3, xp: 3, gold: 1, radius: 0.9, lore: 'A holy-water stoup, now boiling. What climbs out has never been blessed.' }),
  cellarer: M({ id: 'cellarer', name: 'The Cellarer', hp: 18, hit: 1.8, speed: 2.2, brain: 'slam', body: 'bloat_deacon', scale: 1.5, burst: 'grave_smoke', material: 'flesh', big: true, knell: 12, xp: 14, gold: 6, radius: 1, reach: 3, wind: 0.9, rec: 0.9, proc: 'blob', named: true, lore: 'He kept the wine. He also kept the book, which is three hundred years overdue.' }),
  skeleton_clerk: M({ id: 'skeleton_clerk', name: 'Clerk', hp: 0.5, hit: 0.7, speed: 3, brain: 'melee', body: 'rattlebones', walk: 'Run', attack: 'Slash1', burst: 'bone_chips', material: 'bone', knell: 0, wind: 0.4, xp: 0.3, gold: 0.1, lore: 'A rattling clerk from the Counting House. Keeps your account open.' }),
  bursar: M({ id: 'bursar', name: 'The Bursar', hp: 900, hit: 1.6, speed: 1.6, brain: 'boss', body: 'bursar', scale: 2.5, material: 'flesh', big: true, xp: 40, gold: 12, radius: 1.4, reach: 3, boss: 'bursar', lore: 'A bloated demon accountant in a stolen cope. He has you down for one death.' }),
  ambrose: M({ id: 'ambrose', name: 'Bishop Ambrose Thrice-Buried', hp: 60, hit: 1.5, speed: 3, brain: 'boss', body: 'ambrose', scale: 1.25, material: 'flesh', big: true, xp: 14, gold: 8, radius: 0.7, reach: 2.2, boss: 'ambrose', lore: 'Kindly, pale, keeps a spade in the coffin. He cracked the bell to pay a debt.' }),
  malison: M({ id: 'malison', name: 'Malison, the Unrung Saint', hp: 1400, hit: 2.2, speed: 1.3, brain: 'boss', body: 'malison', material: 'stone', big: true, xp: 120, gold: 30, radius: 2.2, reach: 4, boss: 'malison', hover: 1.5, lore: 'Walled up alive by the first bishops, singing. A thousand years of every verse.' }),
  hollow_sexton: M({ id: 'hollow_sexton', name: 'The Hollow Sexton', hp: 60, hit: 1.6, speed: 2.4, brain: 'boss', body: 'pallid_bearer', scale: 2, material: 'bone', big: true, xp: 30, gold: 10, radius: 1, reach: 2.6, boss: 'warden_sexton', tint: 'lime', lore: 'A Warden of the Knell. Raises graves, and you with them.' }),
  grand_chorister: M({ id: 'grand_chorister', name: 'The Grand Chorister', hp: 55, hit: 1.5, speed: 2.2, brain: 'boss', body: 'choir_skull', scale: 3, hover: 1.8, material: 'bone', big: true, xp: 30, gold: 10, radius: 1, reach: 2.6, boss: 'warden_chorister', tint: 'cyan', lore: 'A Warden of the Knell. Leads a choir of skulls in the only hymn it remembers.' }),
  clapperjaw_prime: M({ id: 'clapperjaw_prime', name: 'Clapperjaw Prime', hp: 70, hit: 1.8, speed: 3, brain: 'boss', body: 'clapperjaw', scale: 1.7, material: 'stone', big: true, xp: 30, gold: 10, radius: 1.5, reach: 3, boss: 'warden_jaw', proc: 'quadruped', tint: 'red', lore: 'A Warden of the Knell. It has eaten all the other Clapperjaws. It is still hungry.' }),
};
export const BESTIARY = ['peatwalker', 'gibbet_drop', 'bloat_deacon', 'rattlebones', 'choir_skull', 'pallid_bearer', 'tomb_crawler', 'crawler_nest', 'cinderling', 'tithe_collector', 'penitent', 'clapperjaw', 'ash_gargoyle', 'shade_acolyte', 'unrung_font', 'collection_plate', 'cellarer', 'bursar', 'ambrose', 'malison', 'hollow_sexton', 'grand_chorister', 'clapperjaw_prime'];

export const AFFLICTIONS = {
  tolling: { id: 'tolling', name: 'TOLLING', color: 'sand', desc: 'Expanding shock rings from the pack.' },
  smouldering: { id: 'smouldering', name: 'SMOULDERING', color: 'orange', desc: 'A burning trail; explodes on death.' },
  shackled: { id: 'shackled', name: 'SHACKLED', color: 'mist', desc: 'Chains root you.' },
  entombing: { id: 'entombing', name: 'ENTOMBING', color: 'slate', desc: 'Raises walls of bone around you.' },
  vigil_lamps: { id: 'vigil_lamps', name: 'VIGIL LAMPS', color: 'cyan', desc: 'Slow rotating beams.' },
  penitent_haste: { id: 'penitent_haste', name: 'PENITENT HASTE', color: 'sky', desc: '40% faster, and it charges.' },
  undying: { id: 'undying', name: 'UNDYING', color: 'plum', desc: 'Rises once at half life.' },
  plagued: { id: 'plagued', name: 'PLAGUED', color: 'lime', desc: 'Poison pools under you.' },
};
export const AFFLICTION_IDS = Object.keys(AFFLICTIONS);
export const ELITE_BASE = { hp: 4, dmg: 1.5, xp: 8 };
export const KNELL_VALUES = { trash: 1, big: 3, champion: 8, rare: 12 };
export const MODIFIERS = {
  crowded: { id: 'crowded', name: 'CROWDED', desc: '+40% DENSITY' },
  swift: { id: 'swift', name: 'SWIFT', desc: '+20% MONSTER SPEED' },
  haunted: { id: 'haunted', name: 'HAUNTED', desc: 'EXTRA ELITES' },
  golden: { id: 'golden', name: 'GOLDEN', desc: '+100% GOLD' },
  dark: { id: 'dark', name: 'DARK', desc: 'ONLY HERO LIGHTS' },
  volatile: { id: 'volatile', name: 'VOLATILE', desc: 'MONSTERS EXPLODE ON DEATH' },
};
export const MODIFIER_IDS = Object.keys(MODIFIERS);
export const SHRINES = {
  ardour: { id: 'ardour', name: 'ARDOUR', desc: '+50% DAMAGE', color: 'red' },
  haste: { id: 'haste', name: 'HASTE', desc: '+30% SPEED', color: 'sky' },
  ward: { id: 'ward', name: 'WARD', desc: 'SHIELD: 30% OF LIFE', color: 'sand' },
  plenty: { id: 'plenty', name: 'PLENTY', desc: '+100% GOLD', color: 'orange' },
};
export const SHRINE_IDS = Object.keys(SHRINES);
