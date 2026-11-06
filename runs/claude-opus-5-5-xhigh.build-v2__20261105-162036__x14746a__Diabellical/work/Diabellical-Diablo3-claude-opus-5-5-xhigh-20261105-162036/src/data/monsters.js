// Monsters as data. `ai` names a state machine in src/sim/monsters.js; the rest is numbers.
// hp and hit multiply the level formulas in tuning.js. xp multiplies monsterXpAt.
export const MONSTERS = {
  peatwalker: { name: 'PEATWALKER', hp: 1, hit: 1, speed: 1.4, r: 0.42, ai: 'melee', reach: 1.25, wind: 0.55, rec: 0.9, xp: 1, knell: 1, body: 'peatwalker', mat: 'flesh', gib: 'peat', voice: 'peat', humanoid: true, clipMove: 'Shamble', clipAttack: 'Lurch' },
  gibbet_drop: { name: 'GIBBET DROP', hp: 0.7, hit: 0.9, speed: 3.4, r: 0.4, ai: 'lunge', reach: 3.6, wind: 0.4, rec: 0.9, xp: 1, knell: 1, body: 'gibbet_drop', mat: 'flesh', gib: 'peat', voice: 'peat', humanoid: true, clipMove: 'Run', clipAttack: 'Lunge' },
  rattlebones: { name: 'RATTLEBONES', hp: 0.8, hit: 1, speed: 3.2, r: 0.38, ai: 'melee', reach: 1.5, wind: 0.32, rec: 0.55, xp: 1, knell: 1, body: 'rattlebones', mat: 'bone', gib: 'bone_chips', voice: 'bone', humanoid: true, clipMove: 'Run', clipAttack: 'Slash1' },
  choir_skull: { name: 'CHOIR SKULL', hp: 0.5, hit: 1.1, speed: 2.4, r: 0.35, ai: 'ranged', keep: [9, 12], shot: 'sour_note', every: 2.4, xp: 1, knell: 1, body: 'choir_skull', mat: 'bone', gib: 'bone_chips', voice: 'skull', hover: 1.1 },
  pallid_bearer: { name: 'PALLID BEARER', hp: 4, hit: 1.8, speed: 1.6, r: 0.75, ai: 'slam', reach: 2.6, tele: 0.8, slamR: 2.7, rec: 1.1, xp: 3, knell: 3, body: 'pallid_bearer', mat: 'stone', gib: 'bone_chips', voice: 'big', humanoid: true, big: true, clipMove: 'Walk', clipAttack: 'CoffinSlam', onDeath: { spawn: 'rattlebones', n: 2 } },
  tomb_crawler: { name: 'TOMB CRAWLER', hp: 0.4, hit: 0.6, speed: 5, r: 0.3, ai: 'melee', reach: 0.95, wind: 0.2, rec: 0.5, xp: 0.5, knell: 1, body: 'tomb_crawler', mat: 'flesh', gib: 'grave_smoke', voice: 'crawl', small: true, legs: 6 },
  bloat_deacon: { name: 'BLOAT DEACON', hp: 2, hit: 2.5, speed: 2, r: 0.6, ai: 'bomber', reach: 2.2, tele: 1, slamR: 4, xp: 2, knell: 3, body: 'bloat_deacon', mat: 'flesh', gib: 'grave_smoke', voice: 'bloat', blob: true },
  cinderling: { name: 'CINDERLING', hp: 0.4, hit: 0.7, speed: 4.6, r: 0.3, ai: 'leaper', reach: 3.4, wind: 0.3, rec: 0.7, xp: 0.5, knell: 1, body: 'cinderling', mat: 'flesh', gib: 'ember', voice: 'imp', humanoid: true, small: true, clipMove: 'Run', clipAttack: 'Lunge', onDeath: { patch: 'fire' } },
  tithe_collector: { name: 'TITHE COLLECTOR', hp: 1.6, hit: 1.2, speed: 2.8, r: 0.42, ai: 'hook', reach: 1.5, wind: 0.4, rec: 0.7, hookRange: 10, tele: 0.7, xp: 2, knell: 2, body: 'tithe_collector', mat: 'flesh', gib: 'coin_spray', voice: 'imp', humanoid: true, clipMove: 'Walk', clipAttack: 'Slash2' },
  penitent: { name: 'PENITENT', hp: 1.2, hit: 1.4, speed: 3, r: 0.42, ai: 'blinker', reach: 1.5, wind: 0.22, rec: 0.3, combo: 3, xp: 2, knell: 2, body: 'penitent', mat: 'flesh', gib: 'grave_smoke', voice: 'moan', humanoid: true, clipMove: 'Run', clipAttack: 'Slash3' },
  clapperjaw: { name: 'CLAPPERJAW', hp: 5, hit: 2, speed: 2.4, r: 0.9, ai: 'charger', reach: 2.2, wind: 0.5, rec: 0.9, tele: 0.9, chargeDist: 10, chargeSpeed: 7, xp: 4, knell: 3, body: 'clapperjaw', mat: 'stone', gib: 'ember', voice: 'beast', big: true, legs: 4 },
  ash_gargoyle: { name: 'ASH GARGOYLE', hp: 1.4, hit: 1.2, speed: 5, r: 0.5, ai: 'swooper', reach: 1.4, wakeRange: 7, xp: 2, knell: 2, body: 'ash_gargoyle', mat: 'stone', gib: 'bone_chips', voice: 'beast', hover: 0.6 },
  shade_acolyte: { name: 'SHADE ACOLYTE', hp: 1, hit: 0.8, speed: 2.6, r: 0.4, ai: 'necro', keep: [8, 11], every: 5, xp: 2, knell: 2, body: 'shade_acolyte', mat: 'flesh', gib: 'grave_smoke', voice: 'moan', humanoid: true, clipMove: 'Walk', clipAttack: 'RaiseHands' },
  collection_plate: { name: 'THE COLLECTION PLATE', hp: 6, hit: 0, speed: 7, r: 0.5, ai: 'plate', xp: 3, knell: 8, body: 'collection_plate', mat: 'metal', gib: 'coin_spray', voice: 'plate', legs: 4, noRagdoll: true },
  crawler_nest: { name: 'CRAWLER NEST', hp: 8, hit: 0, speed: 0, r: 1, ai: 'spawner', spawn: 'tomb_crawler', every: 4, cap: 6, xp: 4, knell: 3, body: 'crawler_nest', mat: 'stone', gib: 'bone_chips', static: true },
  unrung_font: { name: 'UNRUNG FONT', hp: 8, hit: 0, speed: 0, r: 1, ai: 'spawner', spawn: 'cinderling', every: 4, cap: 6, xp: 4, knell: 3, body: 'unrung_font', mat: 'stone', gib: 'ember', static: true },

  // Bosses (scripted in src/sim/bosses.js). hp is on top of the level formula.
  bursar: { name: 'THE BURSAR', title: 'THE BURSAR', hp: 520, hit: 2.6, speed: 1.6, r: 1.5, ai: 'boss', boss: 'bursar', xp: 30, knell: 0, body: 'bursar', mat: 'flesh', gib: 'coin_spray', voice: 'bursar', humanoid: true, huge: true, clipMove: 'Walk', clipAttack: 'Slam', song: 'ledger' },
  ambrose: { name: 'BISHOP AMBROSE', title: 'BISHOP AMBROSE THRICE-BURIED', hp: 75, hit: 2.2, speed: 2.8, r: 0.6, ai: 'boss', boss: 'ambrose', xp: 25, knell: 0, body: 'ambrose', mat: 'flesh', gib: 'grave_smoke', voice: 'ambrose', humanoid: true, clipMove: 'Walk', clipAttack: 'CastBig' },
  malison: { name: 'MALISON', title: 'MALISON, THE UNRUNG SAINT', hp: 1500, hit: 3, speed: 1.4, r: 2, ai: 'boss', boss: 'malison', xp: 60, knell: 0, body: 'malison', mat: 'stone', gib: 'ember', voice: 'malison', huge: true, hover: 1.2, noRagdoll: true, song: 'eventide' },
  cellarer: { name: 'THE CELLARER', title: 'THE CELLARER', hp: 50, hit: 2, speed: 2.2, r: 0.9, ai: 'boss', boss: 'cellarer', xp: 12, knell: 0, body: 'cellarer', mat: 'flesh', gib: 'peat', voice: 'bloat', humanoid: true, big: true, clipMove: 'Walk', clipAttack: 'Slam' },
  hollow_sexton: { name: 'THE HOLLOW SEXTON', title: 'THE HOLLOW SEXTON', hp: 150, hit: 2.2, speed: 2.4, r: 0.9, ai: 'boss', boss: 'warden_sexton', xp: 25, knell: 0, body: 'hollow_sexton', mat: 'bone', gib: 'bone_chips', voice: 'big', humanoid: true, big: true, clipMove: 'Walk', clipAttack: 'CoffinSlam' },
  grand_chorister: { name: 'THE GRAND CHORISTER', title: 'THE GRAND CHORISTER', hp: 130, hit: 2, speed: 2, r: 1.1, ai: 'boss', boss: 'warden_chorister', xp: 25, knell: 0, body: 'grand_chorister', mat: 'bone', gib: 'bone_chips', voice: 'skull', hover: 1.4, noRagdoll: true },
  clapperjaw_prime: { name: 'CLAPPERJAW PRIME', title: 'CLAPPERJAW PRIME', hp: 170, hit: 2.4, speed: 2.8, r: 1.3, ai: 'boss', boss: 'warden_jaw', xp: 25, knell: 0, body: 'clapperjaw_prime', mat: 'stone', gib: 'ember', voice: 'beast', huge: true, legs: 4, noRagdoll: true },

  // Allies.
  pallbearer: { name: 'PALLBEARER', hp: 3, hit: 0, speed: 3.6, r: 0.36, ai: 'minion', reach: 1.5, wind: 0.26, rec: 0.5, body: 'minion_skeleton', mat: 'bone', gib: 'bone_chips', humanoid: true, clipMove: 'Run', clipAttack: 'Slash1' },
  coffin_bearer: { name: 'COFFIN BEARER', hp: 8, hit: 0, speed: 2.8, r: 0.6, ai: 'minion', reach: 2.4, wind: 0.5, rec: 0.8, slam: 2.4, body: 'minion_big', mat: 'bone', gib: 'bone_chips', humanoid: true, big: true, clipMove: 'Walk', clipAttack: 'CoffinSlam' },
  lamp_post: { name: 'LAMP POST', hp: 999, hit: 0, speed: 0, r: 0.4, ai: 'turret', body: 'planted_lamp', mat: 'metal', static: true, noRagdoll: true },
  iron_bell: { name: 'IRON BELL', hp: 999, hit: 0, speed: 0, r: 0.8, ai: 'turret', body: 'iron_bell', mat: 'metal', static: true, noRagdoll: true },
  decoy: { name: 'EMBER DECOY', hp: 999, hit: 0, speed: 0, r: 0.4, ai: 'turret', body: 'ember_decoy', mat: 'flesh', static: true, noRagdoll: true },
};
for (const [id, m] of Object.entries(MONSTERS)) m.id = id;
export const BOSS_IDS = ['bursar', 'ambrose', 'malison', 'cellarer', 'hollow_sexton', 'grand_chorister', 'clapperjaw_prime'];
export const WARDENS = ['hollow_sexton', 'grand_chorister', 'clapperjaw_prime'];

export const AFFLICTIONS = {
  tolling: { name: 'TOLLING', desc: 'EXPANDING RINGS OF SHOCK' },
  smouldering: { name: 'SMOULDERING', desc: 'A BURNING TRAIL. EXPLODES ON DEATH' },
  shackled: { name: 'SHACKLED', desc: 'CHAINS THAT ROOT YOU' },
  entombing: { name: 'ENTOMBING', desc: 'WALLS OF BONE AROUND YOU' },
  vigil_lamps: { name: 'VIGIL LAMPS', desc: 'SLOW ROTATING BEAMS' },
  penitent_haste: { name: 'PENITENT HASTE', desc: 'FASTER, AND IT CHARGES' },
  undying: { name: 'UNDYING', desc: 'RISES ONCE AT HALF LIFE' },
  plagued: { name: 'PLAGUED', desc: 'POISON POOLS UNDER YOU' },
};
export const AFFLICTION_IDS = Object.keys(AFFLICTIONS);

export const ELITE_RULES = { hp: 4, dmg: 1.5, xp: 8, championSize: [3, 4], rareMinions: [3, 5] };
export const ELITE_PREFIX = ['GRIM', 'SOUR', 'BLACK', 'HOLLOW', 'PALE', 'WRETCHED', 'ROTTING', 'VILE', 'SALLOW', 'GUTTERING'];
export const ELITE_SUFFIX = ['THE UNSHRIVEN', 'THE EXCOMMUNICATE', 'OF THE LOWER YARD', 'THE TWICE-DUG', 'THE UNCONFESSED', 'THE ROPE-BITTEN', 'WHO WILL NOT LIE DOWN', 'THE ARREARED'];
