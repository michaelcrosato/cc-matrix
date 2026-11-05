// BIG BUCK HUNTER HOEDOWN: a playful riff on Big Buck Hunter Pro (the source).
// CORE LOOP (the one sentence the whole game is built on): spot the bucks, shoot clean, pump between shots, never shoot
// a doe; bag them before they're gone, then read your shots in the x-ray Shot Chart and climb the Hunt-Off standings.
//
// Files in this folder are concatenated in build/manifest.json order into one IIFE by build/build.mjs.
// Engine: my-3D2dge v0.85.2 handoff (engine/my-3d2dge.js). Hub: AI Hub Session Protocol v1 (hub/session.js).
const E = My3D2dge;
let GAME = null;                                   // the engine's game (set in 99-start.js)
const TITLE = 'Big Buck Hunter Hoedown';
const HUB_ACTIVE = typeof AIHub !== 'undefined' && !!AIHub.active;   // true only inside an AI Hub session

// ---- deterministic randomness ------------------------------------------------------------------------------------
// Gameplay never reads the built-in random generator. Streams: 'spawn' (site variations, seeded per run; in an AI Hub session the seed
// comes from AIHub.rng('hunt') so every copy plays the same hunt), 'fx' (cosmetic only: snow, dust, babble pitch).
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RNG = { spawn: mulberry(1), fx: mulberry(7) };
const rnd = (a, b, fn = RNG.spawn) => a + (b - a) * fn();
const pickFrom = (list, fn = RNG.spawn) => list[Math.floor(fn() * list.length) % list.length];
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const lerpN = (a, b, t) => a + (b - a) * t;
const fmtPts = n => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-US');

// ---- dev tuning (live sliders in Dev mode; Reset restores the defaults) -------------------------------------------
const TUNING_SPEC = [
  { key: 'reticleSpeed', label: 'Reticle speed', min: .3, max: 2.5, step: .1, def: 1, unit: 'x' },
  { key: 'animalSpeed', label: 'Animal speed', min: .3, max: 2.5, step: .1, def: 1, unit: 'x' },
  { key: 'tubeSize', label: 'Shells in the tube', min: 1, max: 8, step: 1, def: 4, unit: '' },
  { key: 'reloadTime', label: 'Reload time', min: .2, max: 3, step: .1, def: 1.2, unit: 's' },
  { key: 'spookRange', label: 'Spook range (shots near animals)', min: 0, max: .5, step: .02, def: .22, unit: '' },
  { key: 'pointsMult', label: 'Points multiplier', min: .5, max: 3, step: .1, def: 1, unit: 'x' },
  { key: 'swayAmount', label: 'Scope sway', min: 0, max: 2, step: .1, def: 1, unit: 'x' },
  { key: 'siteSeconds', label: 'Seconds per site', min: 20, max: 90, step: 5, def: 45, unit: 's' },
  { key: 'callsPerSite', label: 'Calls per site', min: 0, max: 6, step: 1, def: 2, unit: '' },
  { key: 'doeRule', label: 'Shooting a doe', min: 0, max: 1, step: 1, def: 0, unit: '', choices: ['Benched for the site', 'Penalty only'] },
];
const TUNING = {};
const resetTuning = () => { for (const s of TUNING_SPEC) TUNING[s.key] = s.def; };
resetTuning();
const DEV = { infiniteShells: false };   // dev toggles (not sliders)

// ---- species and critters (data; a new animal is an entry here plus a painter in 20-art.js) ----------------------
// zone: 'deer' | 'elk' | 'moose' (big game: head, neck, heart, lungs, shoulder, gut, ham, legs) | 'small' (one zone: body)
// sex: 'buck' bag it; 'doe' protected (shooting one benches you for the site, or costs points); 'critter' bonus or penalty
const SPECIES = {
  buck:    { label: 'WHITETAIL BUCK', sex: 'buck', zone: 'deer', base: 500, antlerPts: true, size: 1, aspect: 1.35, coat: '#8a6240', belly: '#e0c8a0', kind: 'deer' },
  doe:     { label: 'DOE', sex: 'doe', zone: 'deer', base: 0, size: .95, aspect: 1.35, coat: '#a07a52', belly: '#e8d6b0', kind: 'deer' },
  elk:     { label: 'ELK BULL', sex: 'buck', zone: 'elk', base: 900, antlerPts: true, size: 1.3, aspect: 1.45, coat: '#5e4128', belly: '#d8c49a', kind: 'elk' },
  cow:     { label: 'ELK COW', sex: 'doe', zone: 'elk', base: 0, size: 1.2, aspect: 1.45, coat: '#7a5a3a', belly: '#dccba4', kind: 'elk' },
  moose:   { label: 'MOOSE BULL', sex: 'buck', zone: 'moose', base: 1400, antlerPts: true, size: 1.55, aspect: 1.2, coat: '#3e2c22', belly: '#5a4638', kind: 'moose' },
  mooseCow:{ label: 'MOOSE COW', sex: 'doe', zone: 'moose', base: 0, size: 1.45, aspect: 1.2, coat: '#4e3a2c', belly: '#6a5444', kind: 'moose' },
  coon:    { label: 'RACCOON', sex: 'critter', zone: 'small', base: 200, size: .45, aspect: 1.1, coat: '#7c7a78', belly: '#d8d4cc', kind: 'coon' },
  crow:    { label: 'CROW', sex: 'critter', zone: 'small', base: 350, size: .28, aspect: 1.5, coat: '#1e1e26', belly: '#2e2e38', kind: 'crow', flies: true },
  bluebird:{ label: 'BLUEBIRD', sex: 'critter', zone: 'small', base: -300, size: .22, aspect: 1.4, coat: '#3a6ad0', belly: '#e08a4a', kind: 'bird', flies: true, protected: true },
  skunk:   { label: 'SKUNK', sex: 'critter', zone: 'small', base: -150, size: .42, aspect: 1.2, coat: '#1c1a1a', belly: '#f2f0ea', kind: 'skunk', stinks: true },
  bessie:  { label: 'BESSIE, THE COW', sex: 'critter', zone: 'small', base: -500, size: 1.3, aspect: 1.3, coat: '#f2efe8', belly: '#1c1a1a', kind: 'bessie', protected: true },
  saucer:  { label: 'SAUCER', sex: 'critter', zone: 'small', base: 300, size: .6, aspect: 1.7, coat: '#b8c4cc', belly: '#5ee6ff', kind: 'saucer', flies: true },
  paper:   { label: 'PAPER TARGET', sex: 'critter', zone: 'small', base: 100, size: .75, aspect: .6, coat: '#f2ecd8', belly: '#2a2a2a', kind: 'paper' },
  snowman: { label: 'SNOWMAN', sex: 'critter', zone: 'small', base: 200, size: .7, aspect: .75, coat: '#f4f8fb', belly: '#e04a2a', kind: 'snowman' },
};

// zone rectangles in the body's own frame: u 0 = tail, 1 = nose (flipped by facing), v 0 = top, 1 = hooves
// the first zone that contains a point wins; 'legs' is anything low, anything else in the box is 'body'
const BIG_ZONES = [
  { id: 'head', u: [.80, 1.0], v: [0, .30], kill: true, mult: 1.2 },
  { id: 'neck', u: [.66, .82], v: [.14, .44], kill: true, mult: .9 },
  { id: 'heart', u: [.50, .62], v: [.28, .50], kill: true, mult: 1.0 },
  { id: 'lungs', u: [.36, .50], v: [.24, .50], kill: true, mult: .9 },
  { id: 'shoulder', u: [.60, .72], v: [.48, .62], kill: false, mult: .6 },
  { id: 'gut', u: [.34, .50], v: [.50, .62], kill: false, mult: .5 },
  { id: 'ham', u: [.06, .26], v: [.30, .58], kill: false, mult: .5 },
  { id: 'legs', u: [0, 1], v: [.62, 1], kill: false, mult: .3 },
];
const ZONE_LABEL = { head: 'HEAD SHOT!', neck: 'NECK SHOT!', heart: 'HEART SHOT!', lungs: 'LUNG SHOT!', shoulder: 'SHOULDER HIT', gut: 'GUT SHOT', ham: 'HAM HIT', legs: 'LEG HIT', body: 'CLIPPED!' };
const zonesFor = z => (z === 'small' ? [{ id: 'body', u: [0, 1], v: [0, 1], kill: true, mult: 1 }] : BIG_ZONES);

// ---- hunts (the campaign: three hunts, each with three sites, a trophy and a bonus game) -----------------------------
const HUNTS = [
  { id: 'hollow', name: 'Hollow Creek', sub: 'Autumn morning', cast: 'Dub', rival: 'Granny Mae',
    sky: ['#9fc6e6', '#f3d6b2', '#f2b98a'], sun: { x: .72, y: .40, r: .05, c: '#fff1b8' }, fogColor: '#f6e0c4', fog: .35,
    hills: ['#7d8f7a', '#6a7d68'], treeMix: ['#d9762e', '#b8452a', '#e6a33a', '#8c5a2a'], pine: '#2f4a3a', grass: ['#8f9a4a', '#7b8a3e'],
    water: '#2f6a6e', riffle: '#e8f4f0', weather: null,
    species: { buck: 3, doe: 2, coon: 1, crow: 1, bluebird: 1, skunk: 1 }, trophy: 'buck', trophyName: 'OLD GNARLY',
    bonus: 'crow', rivalScores: [7800, 6400, 5100] },
  { id: 'ridge', name: 'Bugle Ridge', sub: 'Alpine dusk', cast: 'Loretta', rival: 'Earl Vance',
    sky: ['#1c2a5a', '#6a4a8a', '#f08a5a'], sun: { x: .18, y: .46, r: .06, c: '#ffd08a' }, fogColor: '#c9a0a0', fog: .2,
    hills: ['#2a2a4a', '#3a3a5e'], treeMix: ['#e0b040', '#c99a30', '#f0c860'], pine: '#1f3a2e', grass: ['#9aa84a', '#7f9040'],
    water: '#6a8ab0', riffle: '#f0d8c0', weather: null, snowCaps: true,
    species: { elk: 3, cow: 2, bluebird: 1, coon: 1, saucer: 0 }, trophy: 'elk', trophyName: 'THE BUGLER',
    bonus: 'saucer', rivalScores: [11200, 9800, 8600] },
  { id: 'muskeg', name: 'Muskeg Lake', sub: 'First snow', cast: 'Dwayne', rival: 'Bessie\'s owner, Hank',
    sky: ['#8fa3b5', '#b9c6cf', '#dfe6ea'], sun: null, fogColor: '#dfe6ea', fog: .55,
    hills: ['#a9b7c4', '#c6d2db'], treeMix: ['#c77a3a', '#8a5a34'], pine: '#1a2a24', grass: ['#e6eef3', '#d6e2ea'],
    water: '#2a3d4f', riffle: '#c8d8e4', weather: 'snow',
    species: { moose: 2, mooseCow: 2, skunk: 1, bessie: 1, snowman: 1 }, trophy: 'moose', trophyName: 'THE HULK',
    bonus: 'snowman', rivalScores: [14400, 12100, 10700] },
];

// bonus games: targets fly, bob, or pop up for a fixed time; the same engine plays all three
const BONUS = {
  crow: { name: 'Crow Patrol', sub: 'Crows over the creek. Shoot the crows, spare the bluebirds.', kinds: ['crow', 'crow', 'bluebird'], spawn: .9, speed: .2, life: 30 },
  saucer: { name: 'Saucer Season', sub: 'Saucers over the ridge. Bessie is not in the sky.', kinds: ['saucer', 'saucer', 'bessie'], spawn: 1.1, speed: .16, life: 30 },
  snowman: { name: 'Snowball Standoff', sub: 'Snowmen pop up. Hit the snowmen, not the skunk.', kinds: ['snowman', 'snowman', 'skunk'], spawn: .8, speed: 0, life: 30 },
};

// emcee and cast lines (the barks are written in the source's voice: short, loud and folksy) ---------------------------
const SAVE = {
  records: () => E.store.get('bbhh.records', []),
  saveRecord(name, score, hunt) {
    const list = this.records().concat([{ name, score, hunt, at: new Date().toISOString().slice(0, 10) }]);
    list.sort((a, b) => b.score - a.score);
    E.store.set('bbhh.records', list.slice(0, 8));
    return list.findIndex(r => r.name === name && r.score === score) + 1;
  },
  trophies: () => E.store.get('bbhh.trophies', []),
  addTrophy(name) { const t = this.trophies(); if (!t.includes(name)) E.store.set('bbhh.trophies', t.concat([name])); },
};
