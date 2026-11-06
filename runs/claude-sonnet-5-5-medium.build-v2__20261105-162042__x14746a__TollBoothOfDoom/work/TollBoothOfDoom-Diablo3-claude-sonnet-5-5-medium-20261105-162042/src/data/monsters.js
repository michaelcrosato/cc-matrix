// Monsters as data. kind selects the AI in src/sim/monsters.js. hp/hit are multipliers on the level curves.
export const MONSTERS = {
  peatwalker: { name: 'Peatwalker', hp: 1.0, hit: 1.0, speed: 1.4, kind: 'melee', r: 0.45, wind: 0.8, reach: 1.5, body: 'peatwalker', big: false, lore: 'The mindless dead, up and about. They burst into mud, which is the most useful thing they have done.', zones: ['yard', 'causeway', 'ossuary'] },
  gibbet_drop: { name: 'Gibbet Drop', hp: 0.7, hit: 0.9, speed: 3.4, kind: 'lunger', r: 0.45, wind: 0.5, reach: 1.6, body: 'gibbet_drop', lore: 'Falls from the gibbets. Lunges. Has been waiting a long time to do both.', zones: ['causeway'] },
  rattlebones: { name: 'Rattlebones', hp: 0.8, hit: 1.0, speed: 3.2, kind: 'melee', r: 0.4, wind: 0.45, reach: 1.7, body: 'rattlebones', lore: 'A fast sword and a faster collapse. Flies apart when struck.', zones: ['ossuary', 'belfry'] },
  choir_skull: { name: 'Choir Skull', hp: 0.5, hit: 1.1, speed: 2.4, kind: 'caster', r: 0.4, wind: 0.9, range: 11, keep: 9, body: 'choir_skull', hover: true, lore: 'Floats at a respectful distance and sings one sour note at a time.', zones: ['ossuary'] },
  pallid_bearer: { name: 'Pallid Bearer', hp: 4.0, hit: 1.8, speed: 1.6, kind: 'slammer', r: 0.75, wind: 0.8, reach: 2.6, body: 'pallid_bearer', scale: 1.5, big: true, onDeath: 'rattlebones', lore: 'Carries the coffin, and will use it. Two Rattlebones come out of it, unhappy.', zones: ['ossuary', 'cloister'] },
  tomb_crawler: { name: 'Tomb Crawler', hp: 0.4, hit: 0.6, speed: 5.0, kind: 'melee', r: 0.35, wind: 0.3, reach: 1.2, body: 'tomb_crawler', lore: 'Swarms from nests in the walls. There are always more.', zones: ['ossuary'] },
  bloat_deacon: { name: 'Bloat Deacon', hp: 2.0, hit: 2.5, speed: 2.0, kind: 'bloat', r: 0.7, wind: 1.0, body: 'bloat_deacon', big: true, lore: 'Swells with something unholy for a full second, then shares it.', zones: ['causeway', 'ossuary'] },
  cinderling: { name: 'Cinderling', hp: 0.4, hit: 0.7, speed: 4.6, kind: 'lunger', r: 0.3, wind: 0.4, reach: 1.3, body: 'cinderling', scale: 0.6, lore: 'Leaps in packs. Leaves a small fire where it stood.', zones: ['cloister', 'belfry'] },
  tithe_collector: { name: 'Tithe Collector', hp: 1.6, hit: 1.2, speed: 2.8, kind: 'hooker', r: 0.5, wind: 0.8, range: 10, body: 'tithe_collector', lore: 'Pulls you in from ten metres and takes a percentage. Returned on death, with no interest.', zones: ['cloister'] },
  penitent: { name: 'Penitent', hp: 1.2, hit: 1.4, speed: 3.0, kind: 'blinker', r: 0.45, wind: 0.5, reach: 1.7, body: 'penitent', lore: 'Blinks in, strikes three times, blinks away when struck. Sorry about all of it.', zones: ['cloister', 'belfry'] },
  clapperjaw: { name: 'Clapperjaw', hp: 5.0, hit: 2.0, speed: 2.4, kind: 'charger', r: 0.9, wind: 0.9, reach: 2.2, body: 'clapperjaw', scale: 1.2, big: true, lore: 'Roars, charges, and stuns itself on walls. A bell with teeth.', zones: ['cloister', 'belfry'] },
  ash_gargoyle: { name: 'Ash Gargoyle', hp: 1.4, hit: 1.2, speed: 5.0, kind: 'swooper', r: 0.5, wind: 0.5, reach: 1.8, body: 'ash_gargoyle', hover: true, lore: 'A statue until you are close. Then it is not.', zones: ['cloister', 'belfry'] },
  shade_acolyte: { name: 'Shade Acolyte', hp: 1.0, hit: 0.8, speed: 2.6, kind: 'raiser', r: 0.45, wind: 1.0, range: 8, keep: 8, body: 'shade_acolyte', lore: 'Raises the fallen every five seconds. Kill it first.', zones: ['cloister'] },
  collection_plate: { name: 'The Collection Plate', hp: 6.0, hit: 0, speed: 7.0, kind: 'plate', r: 0.5, wind: 0, body: 'collection_plate', xp: 2, lore: 'A living offering dish on little legs. It spills coins as it runs. Catch it.', zones: [] },
  crawler_nest: { name: 'Crawler Nest', hp: 8.0, hit: 0, speed: 0, kind: 'nest', r: 0.8, spawn: 'tomb_crawler', body: 'crawler_nest', static: true, lore: 'A breakable nest of bone and spite. Smash it and the swarm stops.', zones: ['ossuary'] },
  unrung_font: { name: 'Unrung Font', hp: 8.0, hit: 0, speed: 0, kind: 'nest', r: 0.8, spawn: 'cinderling', body: 'unrung_font', static: true, lore: 'A font that fills with the wrong liquid. Cinderlings climb out.', zones: ['cloister'] },
  skeleton: { name: 'Skeleton', hp: 0.6, hit: 0.5, speed: 3.6, kind: 'melee', r: 0.4, wind: 0.4, reach: 1.5, body: 'rattlebones', minion: true, lore: 'Yours. At union rates.', zones: [] },
  brute: { name: 'Coffin Brute', hp: 2.0, hit: 1.0, speed: 2.4, kind: 'slammer', r: 0.7, wind: 0.6, reach: 2.4, body: 'pallid_bearer', scale: 1.3, minion: true, lore: 'A very large employee.', zones: [] },
};
Object.assign(MONSTERS, {
  bursar: { name: 'The Bursar', hp: 280, hit: 1.6, speed: 1.5, kind: 'boss', r: 1.2, scale: 2.2, body: 'bursar', big: true, boss: 'bursar', xp: 30, lore: 'A bloated demon accountant in a stolen cope. Delighted by interest.', zones: [] },
  ambrose: { name: 'Bishop Ambrose', hp: 280, hit: 1.5, speed: 2.4, kind: 'boss', r: 0.9, scale: 1.5, body: 'ambrose', big: true, boss: 'ambrose', xp: 25, lore: 'Kindly, pale, and buried three times. He keeps a spade in the coffin.', zones: [] },
  malison: { name: 'Malison, the Unrung Saint', hp: 400, hit: 1.8, speed: 1.8, kind: 'boss', r: 2.0, scale: 1, body: 'malison', big: true, boss: 'malison', hover: true, xp: 60, lore: 'Walled up alive in the tower foundation, singing. She has heard the bell every dusk for a thousand years.', zones: [] },
  warden_sexton: { name: 'The Hollow Sexton', hp: 120, hit: 1.4, speed: 2.4, kind: 'boss', r: 0.9, scale: 1.6, body: 'sexton', big: true, boss: 'warden', wk: 'sexton', xp: 12, lore: 'Raises graves for a living, and in death.', zones: [] },
  warden_chorister: { name: 'The Grand Chorister', hp: 100, hit: 1.4, speed: 2.8, kind: 'boss', r: 0.9, scale: 2.2, body: 'choir_skull', big: true, boss: 'warden', wk: 'chorister', hover: true, xp: 12, lore: 'A choir skull the size of a font, leading the others.', zones: [] },
  warden_jaw: { name: 'Clapperjaw Prime', hp: 130, hit: 1.6, speed: 2.6, kind: 'boss', r: 1.3, scale: 1.8, body: 'clapperjaw', big: true, boss: 'warden', wk: 'jaw', xp: 12, lore: 'The first bell with teeth. The rest are its children.', zones: [] },
});
export const BESTIARY = Object.keys(MONSTERS).filter((k) => !MONSTERS[k].minion);

export const AFFLICTIONS = {
  tolling: { name: 'Tolling', color: 'sand', text: 'Expanding shock rings every 5 s.' },
  smouldering: { name: 'Smouldering', color: 'orange', text: 'Burning trail; explodes on death.' },
  shackled: { name: 'Shackled', color: 'cyan', text: 'Chains root you for 1.5 s.' },
  entombing: { name: 'Entombing', color: 'mist', text: 'Raises bone walls around you.' },
  vigil_lamps: { name: 'Vigil Lamps', color: 'lime', text: 'Slow rotating beams.' },
  haste: { name: 'Penitent Haste', color: 'red', text: '40% faster, charges.' },
  undying: { name: 'Undying', color: 'plum', text: 'Rises once at half life.' },
  plagued: { name: 'Plagued', color: 'green', text: 'Poison pools beneath you.' },
};
export const AFFLICTION_IDS = Object.keys(AFFLICTIONS);
export const ELITE_NAMES = ['Orsolya the Damp', 'Brother Mulch', 'Hob Gravewater', 'Sister Tallow', 'Grimble Ashfont', 'Old Nettle', 'The Reverend Soot', 'Mabel Underhill', 'Gaunt Percival', 'Dame Cinder', 'Wick the Lesser', 'Bonny Ossuary'];
