/* World data: times of day, biome kits, the 15 stages of Bellafiore, the route pyramid, the 5 goals and the fixed routes.
 * Designers extend the island here: a stage is plain data (its kit, time, lanes, layout knobs, zones, landmarks,
 * traffic and Love in Bloom slots); 10-road.js builds the road from it. */
(() => {
'use strict';
const OB = window.OB;

/* ---- times of day: sky gradient, sun or moon, fog, the bloom strength, night (headlights, a dark grade) ---- */
OB.TOD = {
  dawn:      { sky: ['#3a3a7a', '#a86a9a', '#f0a080', '#ffd0a0'], sun: { x: .62, y: .62, r: 16, color: '#fff0c0' }, fog: '#e8b8a8', bloom: .55, grade: null },
  morning:   { sky: ['#2a7ad8', '#5aa8f0', '#a8d8f8', '#e0f0ff'], sun: { x: .3, y: .2, r: 12, color: '#fffbe0' }, fog: '#c8e0f0', bloom: .4, grade: null },
  noon:      { sky: ['#1a6ae0', '#3a90f0', '#80c8f8', '#c8e8ff'], sun: { x: .55, y: .1, r: 12, color: '#ffffff' }, fog: '#c0dcf0', bloom: .35, grade: null },
  afternoon: { sky: ['#2a70d0', '#5aa0e8', '#a0d0f0', '#f0e8c8'], sun: { x: .75, y: .28, r: 13, color: '#fff4c8' }, fog: '#d8e0e0', bloom: .4, grade: null },
  late:      { sky: ['#3a5ab0', '#7a90d0', '#e8b880', '#ffd890'], sun: { x: .7, y: .45, r: 15, color: '#ffe0a0' }, fog: '#e8c8a0', bloom: .55, grade: '#fff0d8' },
  sunset:    { sky: ['#2a1a5a', '#8a3a7a', '#f0604a', '#ffb050'], sun: { x: .5, y: .6, r: 20, color: '#ffd070' }, fog: '#e88a6a', bloom: .7, grade: '#ffd8c0' },
  twilight:  { sky: ['#0a0a2a', '#2a2a6a', '#6a4a8a', '#c87a8a'], moon: { x: .25, y: .2, r: 9, color: '#f0f0ff' }, stars: 60, fog: '#5a4a7a', bloom: .55, grade: '#9a90c8', night: .5 },
  night:     { sky: ['#05051a', '#0a1040', '#1a2a6a', '#3a3a7a'], moon: { x: .78, y: .18, r: 10, color: '#f8f4e0' }, stars: 90, fog: '#20204a', bloom: .6, grade: '#6a70b8', night: 1 }
};

/* ---- ground palettes (per side of the road): two shades by segment, plus details ---- */
OB.GROUNDS = {
  grass: ['#5ab048', '#4ea43e'], sand: ['#f0dca0', '#e8d090'], water: ['#2a8ad0', '#3296d8'], snow: ['#eef4f8', '#dde8f0'],
  rock: ['#a86a4a', '#9a5e40'], cobble: ['#a89a8a', '#9a8c7c'], heather: ['#8a6a9a', '#7e5e8e'], pink: ['#e890b0', '#f0a0bc'],
  lavender: ['#8a7ad0', '#5aa048'], sunflower: ['#f0c020', '#5a9a38'], grapes: ['#4a8a3a', '#6a4a7a'], jungle: ['#2a8a3a', '#248030'],
  nightgrass: ['#1a3a2a', '#163424'], nightsand: ['#4a4060', '#443a58'], citypave: ['#3a3a4a', '#34343e']
};
// ground kinds that are rows (two crops in stripes) or water (foam at the shore)
OB.GROUND_ROWS = { lavender: 1, sunflower: 1, grapes: 1 };
OB.GROUND_WATER = { water: 1, pink: 1 };

/* ---- biome kits: road colours, far layers, scenery rules (art names from 11-art.js) ----
 * rule: { a: art, side: 'L' | 'R' | 'B', off: [min, max] half roads beyond the edge, every: segments, chance, size } */
OB.KITS = {
  beach: { road: ['#7a7a84', '#74747e'], rumble: ['#f4f4f4', '#e83a5a'], lane: '#f8f8f0', far: [['sea', '#2a8ad0', .7, .1], ['clouds', '#ffffff', .25, .2]],
    rules: [{ a: 'palm', side: 'R', off: [.3, 1.6], every: 5 }, { a: 'umbrella', side: 'R', off: [.8, 2.4], every: 9 }, { a: 'hut', side: 'R', off: [2.6, 3.4], every: 28 },
      { a: 'lifeguard', side: 'R', off: [1.8, 2.2], every: 61 }, { a: 'surfrack', side: 'R', off: [.6, 1], every: 37 }, { a: 'buoy', side: 'L', off: [1.5, 4], every: 12 }, { a: 'billboard', side: 'R', off: [.5, .7], every: 170 }] },
  fields: { road: ['#7a7a80', '#74747a'], rumble: ['#f4f4f4', '#8a5ad0'], lane: '#f8f8f0', far: [['hills', '#7a9a5a', .72, .14], ['hills', '#5a8a48', .78, .1], ['clouds', '#ffffff', .2, .2]],
    rules: [{ a: 'cypress', side: 'B', off: [.4, 2.2], every: 13 }, { a: 'bush', side: 'B', off: [.2, 1.4], every: 7 }, { a: 'farmhouse', side: 'L', off: [3, 4], every: 140 },
      { a: 'beehives', side: 'R', off: [1.4, 1.8], every: 75 }, { a: 'silo', side: 'R', off: [3, 4], every: 110 }, { a: 'turbine', side: 'B', off: [4, 7], every: 45 },
      { a: 'haybale', side: 'B', off: [1, 2.5], every: 33 }, { a: 'fence', side: 'B', off: [.15, .2], every: 6 }, { a: 'billboard', side: 'L', off: [.5, .7], every: 190 }] },
  cliffs: { road: ['#80767a', '#7a7074'], rumble: ['#f4f4f4', '#f0c020'], lane: '#f8f8f0', far: [['sea', '#2a90d8', .64, .12], ['mountains', '#c8a080', .7, .08], ['clouds', '#ffffff', .2, .2]],
    rules: [{ a: 'lamp', side: 'L', off: [.05, .1], every: 11 }, { a: 'village', side: 'L', off: [7, 10], every: 60 }, { a: 'lemon', side: 'L', off: [.6, 1.2], every: 23, chance: .5 }] },
  lake: { road: ['#767a80', '#70747a'], rumble: ['#f4f4f4', '#3a8a5a'], lane: '#f8f8f0', far: [['mountains', '#6a80a0', .62, .2], ['forest', '#2a5a3a', .7, .1], ['sea', '#3a90c8', .76, .06]],
    rules: [{ a: 'pine', side: 'R', off: [.3, 2.5], every: 4 }, { a: 'rock', side: 'R', off: [.2, 1], every: 17 }, { a: 'boathouse', side: 'L', off: [1.2, 1.6], every: 85 }, { a: 'buoy', side: 'L', off: [2, 5], every: 21 }] },
  canyon: { road: ['#8a7068', '#846a62'], rumble: ['#f4f0e0', '#c84a2a'], lane: '#f8f0d8', far: [['mountains', '#c86a4a', .6, .22], ['hills', '#e09060', .74, .1]],
    rules: [{ a: 'mesa', side: 'B', off: [3, 7], every: 37 }, { a: 'cactus', side: 'B', off: [.3, 2], every: 8 }, { a: 'rock', side: 'B', off: [.3, 2.5], every: 11 }, { a: 'billboard', side: 'R', off: [.5, .7], every: 210 }] },
  alpine: { road: ['#767680', '#70707a'], rumble: ['#f4f4f4', '#d83a3a'], lane: '#f8f8f0', far: [['mountains', '#a8b8d0', .55, .3], ['mountains', '#e8f0f8', .5, .1], ['forest', '#2a5a3a', .74, .08]],
    rules: [{ a: 'pine', side: 'B', off: [.3, 2.5], every: 5 }, { a: 'cherry', side: 'B', off: [.3, 1.6], every: 9 }, { a: 'chalet', side: 'B', off: [2.4, 3], every: 71 }, { a: 'cow', side: 'B', off: [1, 2.4], every: 43 }] },
  town: { road: ['#8a7e74', '#84786e'], rumble: ['#e8e0d0', '#c8a070'], lane: '#f0e8d8', far: [['hills', '#8aa070', .72, .1], ['city', '#c8a088', .7, .14]],
    rules: [{ a: 'streetlamp', side: 'B', off: [.04, .08], every: 9 }, { a: 'stall', side: 'B', off: [.15, .3], every: 17, chance: .6 }] },
  vineyard: { road: ['#7a7470', '#746e6a'], rumble: ['#f4f0e0', '#8a2a4a'], lane: '#f8f4e8', far: [['hills', '#8a9a5a', .7, .16], ['hills', '#6a8a48', .78, .1], ['clouds', '#fff4e0', .22, .2]],
    rules: [{ a: 'cypress', side: 'B', off: [.15, .3], every: 4, chance: .7 }, { a: 'villa', side: 'B', off: [3, 4.5], every: 93 }, { a: 'barrel', side: 'B', off: [.4, .9], every: 29 }, { a: 'cart', side: 'R', off: [.6, 1], every: 120 }] },
  lagoon: { road: ['#7a7a84', '#74747e'], rumble: ['#f4f4f4', '#f080a0'], lane: '#f8f8f0', far: [['sea', '#3a9ad8', .66, .1], ['fog', '#f0c8d8', .7, .08], ['clouds', '#fff0f0', .22, .2]],
    rules: [{ a: 'flamingo', side: 'B', off: [1, 4], every: 13 }, { a: 'saltpile', side: 'R', off: [2, 4], every: 27 }, { a: 'lamp', side: 'B', off: [.04, .08], every: 12 }] },
  jungle: { road: ['#5e6a60', '#58645a'], rumble: ['#e8f0e0', '#3a9a4a'], lane: '#e8f0e0', far: [['forest', '#1a5a2a', .62, .25], ['hills', '#2a7a3a', .74, .1]],
    rules: [{ a: 'palm', side: 'B', off: [.2, 1.5], every: 5 }, { a: 'leaf', side: 'B', off: [.1, 1], every: 3 }, { a: 'fern', side: 'B', off: [.05, .8], every: 4 }, { a: 'orchid', side: 'B', off: [.3, 1.2], every: 11 }, { a: 'ruin', side: 'B', off: [2, 3], every: 90 }] },
  nightcity: { road: ['#3a3a48', '#363644'], rumble: ['#e0e0f0', '#e8c030'], lane: '#e8d870', far: [['sea', '#14204a', .74, .06], ['city', '#202a4a', .62, .26]],
    rules: [{ a: 'streetlamp', side: 'B', off: [.04, .08], every: 6 }, { a: 'neon', side: 'R', off: [.4, .6], every: 21 }, { a: 'palm', side: 'L', off: [.3, .8], every: 9 }, { a: 'yacht', side: 'L', off: [1.6, 4], every: 31 }] },
  nightdesert: { road: ['#3a3848', '#363444'], rumble: ['#d8d0e8', '#8a4ac0'], lane: '#e0d8f0', far: [['mountains', '#1a1a3a', .7, .14]],
    rules: [{ a: 'cactus', side: 'B', off: [.3, 2], every: 7 }, { a: 'nightcactus', side: 'B', off: [.3, 1.5], every: 13 }, { a: 'rock', side: 'B', off: [.5, 3], every: 9 }, { a: 'motel', side: 'R', off: [2, 2.5], every: 230 }, { a: 'dish', side: 'L', off: [4, 6], every: 170 }] },
  highlands: { road: ['#6a6a74', '#64646e'], rumble: ['#e8e8f0', '#4a6a9a'], lane: '#e8e8f0', far: [['mountains', '#3a4a6a', .6, .22], ['fog', '#8a8ab0', .72, .1]],
    rules: [{ a: 'stone', side: 'B', off: [1, 3], every: 29 }, { a: 'sheep', side: 'B', off: [.6, 2.2], every: 12 }, { a: 'rock', side: 'B', off: [.4, 2], every: 15 }, { a: 'bush', side: 'B', off: [.2, 1.2], every: 8 }] }
};

/* ---- the stages (PLAN §8.2). Layout knobs: len (segments), curveMax, curveMix (share of bends), hillAmp, tunnels
 * [[fraction, segments]], zones [{ from, to, ...segment options }], landmarks [{ at, side, a, off }], traffic mix,
 * density (vehicles per 10,000 units per lane), slots (Love in Bloom requests) ---- */
OB.STAGES = {
  S1: { name: 'Sunrise Strand', row: 1, col: 1, kit: 'beach', tod: 'dawn', lanes: 3, diff: 1, len: 600, gL: 'water', gR: 'sand', eL: null, eR: null, curveMax: 3, curveMix: .6, hillAmp: 900,
    zones: [{ from: .32, to: .42, span: 'palms' }, { from: .5, to: .58, eL: 'stonewall', curve: 4 }],
    landmarks: [{ at: .45, side: 'L', a: 'ferris', off: 5 }, { at: .2, side: 'R', a: 'hut', off: 2.6 }, { at: .75, side: 'R', a: 'lifeguard', off: 1.8 }],
    traffic: { hatch: 3, van: 1, icecream: .4, bus: .6 }, density: .3, slots: [{ at: .2, type: 'balloons' }, { at: .62, type: 'pass' }],
    line: 'The sea on your left, the sun ahead: the island wakes up.' },
  S2: { name: 'Lavender Ridge', row: 2, col: 1, kit: 'fields', tod: 'morning', lanes: 3, diff: 1, len: 610, gL: 'lavender', gR: 'lavender', curveMax: 3, curveMix: .55, hillAmp: 1600,
    zones: [{ from: .6, to: .67, curve: 4 }], landmarks: [{ at: .35, side: 'R', a: 'farmhouse', off: 2.2 }, { at: .5, side: 'R', a: 'beehives', off: 1.4 }, { at: .7, side: 'L', a: 'turbine', off: 3 }],
    sky: 'balloons', traffic: { hatch: 2, van: 2, pickup: 1, camper: 1 }, density: .28, slots: [{ at: .25, type: 'bees' }, { at: .65, type: 'drift' }],
    line: 'Lavender rows as far as you can see.' },
  S3: { name: 'Lemon Cliffs', row: 2, col: 2, kit: 'cliffs', tod: 'morning', lanes: 2, diff: 3, len: 630, gL: 'water', gR: 'rock', eL: 'rail', eR: 'cliff', curveMax: 5, curveMix: .75, hillAmp: 1200,
    tunnels: [[.3, 60]], zones: [{ from: .55, to: .62, span: 'gallery' }, { from: .9, to: .96, curve: 6 }],
    landmarks: [{ at: .2, side: 'L', a: 'village', off: 8 }, { at: .7, side: 'L', a: 'chapel', off: 6 }],
    traffic: { scooter: 2, hatch: 2, van: 1, bus: .5 }, density: .3, slots: [{ at: .2, type: 'cones' }, { at: .6, type: 'close' }],
    line: 'Hairpins over the blue. Hold on to something!' },
  S4: { name: 'Sunflower Prairie', row: 3, col: 1, kit: 'fields', tod: 'afternoon', lanes: 4, diff: 1, len: 610, gL: 'sunflower', gR: 'sunflower', curveMax: 2, curveMix: .4, hillAmp: 300,
    landmarks: [{ at: .3, side: 'L', a: 'silo', off: 3 }, { at: .5, side: 'R', a: 'barn', off: 3 }, { at: .65, side: 'L', a: 'haybale', off: 1.5 }],
    traffic: { tractor: 1.5, pickup: 2, sedan: 2, truck: 1 }, density: .3, slots: [{ at: .2, type: 'draft' }, { at: .6, type: 'speed' }],
    line: 'Sunflowers! They all turn to watch us pass.' },
  S5: { name: 'Lake Serenata', row: 3, col: 2, kit: 'lake', tod: 'noon', lanes: 3, diff: 2, len: 620, gL: 'water', gR: 'grass', eL: null, eR: null, curveMax: 4, curveMix: .6, hillAmp: 900,
    zones: [{ from: .4, to: .5, eL: 'rail', eR: 'rail', gR: 'water', span: 'truss' }, { from: .55, to: .75, event: 'shower' }],
    landmarks: [{ at: .3, side: 'L', a: 'steamer', off: 5 }, { at: .62, side: 'R', a: 'waterfall', off: 2.5 }], sky: 'rainbow',
    traffic: { sedan: 2, camper: 2, van: 1, bus: .5 }, density: .3, slots: [{ at: .22, type: 'arches' }, { at: .66, type: 'bouquets' }],
    line: 'A lake like a mirror. Make a wish!' },
  S6: { name: 'Rosa Canyon', row: 3, col: 3, kit: 'canyon', tod: 'noon', lanes: 2, diff: 4, len: 630, gL: 'rock', gR: 'rock', curveMax: 6, curveMix: .75, hillAmp: 3600,
    tunnels: [[.35, 18], [.55, 14], [.75, 16]], landmarks: [{ at: .5, side: 'R', a: 'stand', off: 1 }, { at: .25, side: 'L', a: 'mesa', off: 3 }],
    traffic: { pickup: 2, truck: 1, camper: 1 }, density: .26, slots: [{ at: .3, type: 'gnomes' }, { at: .7, type: 'drift' }], heat: true,
    line: 'Red rock and wild roses. Big jumps ahead!' },
  S7: { name: 'Cherry Pass', row: 4, col: 1, kit: 'alpine', tod: 'afternoon', lanes: 3, diff: 2, len: 630, gL: 'grass', gR: 'snow', curveMax: 5, curveMix: .65, hillAmp: 2400, climb: 5000,
    tunnels: [[.45, 30]], zones: [{ from: .4, to: .7, event: 'petals' }], landmarks: [{ at: .3, side: 'L', a: 'chalet', off: 2.5 }, { at: .8, side: 'R', a: 'chalet', off: 2.6 }],
    traffic: { sedan: 2, camper: 1, bus: 1, van: 1 }, density: .28, slots: [{ at: .25, type: 'drift' }, { at: .6, type: 'clean' }],
    line: 'Cherry blossoms on the snow line. So pretty!' },
  S8: { name: 'Old Town Fiorenza', row: 4, col: 2, kit: 'town', tod: 'afternoon', lanes: 3, diff: 3, len: 610, gL: 'cobble', gR: 'cobble', eL: 'facade', eR: 'facade', curveMax: 6, curveMix: .5, hillAmp: 500,
    tunnels: [[.2, 14]], zones: [{ from: .1, to: .9, span: 'bunting', spanEvery: 24 }, { from: .5, to: .62, w: 1.3, lanes: 4, eL: null, eR: null }],
    landmarks: [{ at: .35, side: 'R', a: 'dome', off: 1.4 }, { at: .55, side: 'L', a: 'fountain', off: 1.6 }],
    traffic: { taxi: 2, scooter: 3, van: 1, bus: 1 }, density: .32, slots: [{ at: .35, type: 'photo' }, { at: .7, type: 'pass' }],
    line: 'Cobbles, cafes and a thousand flower boxes.' },
  S9: { name: 'Vineyard Way', row: 4, col: 3, kit: 'vineyard', tod: 'late', lanes: 3, diff: 3, len: 630, gL: 'grapes', gR: 'grapes', curveMax: 5, curveMix: .65, hillAmp: 1800,
    landmarks: [{ at: .55, side: 'R', a: 'castle', off: 6 }, { at: .3, side: 'L', a: 'villa', off: 3.4 }],
    traffic: { tractor: 1, pickup: 2, van: 1, sedan: 1 }, density: .28, slots: [{ at: .2, type: 'gnomes' }, { at: .62, type: 'ribbons' }],
    line: 'Grapes, cypress trees and a castle on the hill.' },
  S10: { name: 'Seafoam Causeway', row: 4, col: 4, kit: 'lagoon', tod: 'late', lanes: 2, diff: 5, len: 650, gL: 'pink', gR: 'water', eL: 'rail', eR: 'rail', curveMax: 4, curveMix: .45, hillAmp: 400,
    zones: [{ from: .55, to: .6, hill: 2600 }], gusts: [.2, .35, .5, .68, .82], landmarks: [{ at: .58, side: 'R', a: 'liftbridge', off: 1.3 }],
    traffic: { sedan: 2, truck: 2, camper: 1 }, density: .3, slots: [{ at: .25, type: 'balloons' }, { at: .65, type: 'speed' }],
    line: 'Water on both sides and the wind with it!' },
  S11: { name: 'Golden Bay', row: 5, col: 1, kit: 'beach', tod: 'sunset', lanes: 3, diff: 1, len: 600, gL: 'sand', gR: 'water', curveMax: 3, curveMix: .5, hillAmp: 600,
    zones: [{ from: .3, to: .9, lit: true }], landmarks: [{ at: .4, side: 'R', a: 'sailboat', off: 4 }, { at: .6, side: 'L', a: 'volley', off: 1.6 }],
    traffic: { hatch: 2, icecream: .5, bus: 1, van: 1 }, density: .3, slots: [{ at: .25, type: 'bouquets' }, { at: .62, type: 'balloons' }], goal: 'A',
    line: 'The lantern festival! I can hear the music!' },
  S12: { name: 'Orchid Jungle', row: 5, col: 2, kit: 'jungle', tod: 'sunset', lanes: 3, diff: 2, len: 610, gL: 'jungle', gR: 'jungle', curveMax: 5, curveMix: .6, hillAmp: 1200,
    zones: [{ from: .15, to: .35, span: 'canopy', spanEvery: 4 }, { from: .6, to: .68, eL: 'rail', eR: 'rail', gL: 'water', gR: 'water' }],
    landmarks: [{ at: .45, side: 'L', a: 'waterfall', off: 2.4 }, { at: .75, side: 'R', a: 'ruin', off: 1.8 }],
    traffic: { pickup: 2, camper: 1, van: 1 }, density: .28, slots: [{ at: .22, type: 'arches' }, { at: .6, type: 'bees' }], goal: 'B',
    line: 'Orchids glowing in the dusk. Magic!' },
  S13: { name: 'Moonlit Riviera', row: 5, col: 3, kit: 'nightcity', tod: 'night', lanes: 4, diff: 3, len: 630, gL: 'water', gR: 'citypave', eR: null, curveMax: 4, curveMix: .55, hillAmp: 600,
    tunnels: [[.3, 40], [.7, 30]], zones: [{ from: 0, to: 1, lit: true }, { from: .6, to: 1, event: 'fireworks' }], landmarks: [{ at: .5, side: 'R', a: 'casino', off: 2.5 }],
    traffic: { taxi: 2, sedan: 3, bus: 1, scooter: 2 }, density: .3, slots: [{ at: .3, type: 'close' }, { at: .65, type: 'ribbons' }], goal: 'C',
    line: 'Neon on the water. The whole riviera is awake!' },
  S14: { name: 'Starlight Desert', row: 5, col: 4, kit: 'nightdesert', tod: 'night', lanes: 3, diff: 4, len: 650, gL: 'nightsand', gR: 'nightsand', curveMax: 5, curveMix: .4, hillAmp: 3800,
    landmarks: [{ at: .4, side: 'R', a: 'motel', off: 2 }, { at: .65, side: 'L', a: 'dish', off: 4 }], sky: 'shooting',
    traffic: { truck: 2, pickup: 2, camper: 1 }, density: .26, slots: [{ at: .25, type: 'draft' }, { at: .6, type: 'cones' }], goal: 'D',
    line: 'So many stars. Is that one falling?' },
  S15: { name: 'Aurora Highlands', row: 5, col: 5, kit: 'highlands', tod: 'twilight', lanes: 2, diff: 5, len: 650, gL: 'heather', gR: 'heather', eL: 'stonewall', eR: 'stonewall', curveMax: 6, curveMix: .75, hillAmp: 2600,
    zones: [{ from: .7, to: .74, w: .8 }], landmarks: [{ at: .5, side: 'L', a: 'castleruin', off: 4 }], sky: 'aurora',
    traffic: { sedan: 1, camper: 1, truck: 1, pickup: 1 }, density: .24, slots: [{ at: .2, type: 'drift' }, { at: .58, type: 'clean' }], goal: 'E',
    line: 'Green lights in the sky... the aurora!' }
};
for (const id in OB.STAGES) OB.STAGES[id].id = id;
// the pyramid: (row r, col c) is S[r(r-1)/2 + c]; it forks to (r+1, c) on the left and (r+1, c+1) on the right
OB.stageAt = (r, c) => 'S' + (r * (r - 1) / 2 + c);
OB.forkOf = id => { const s = OB.STAGES[id]; return s.row < 5 ? [OB.stageAt(s.row + 1, s.col), OB.stageAt(s.row + 1, s.col + 1)] : null; };

/* ---- goals and endings (PLAN §8.3) ---- */
OB.GOALS = {
  A: { name: 'Lantern Pier', place: 'Porto Lucciola', stage: 'S11', tod: 'sunset', local: 'lanternSeller',
    moods: { bloom: { title: 'A Thousand Lanterns', caption: 'A thousand lanterns, and one just for you two.' }, bud: { title: 'One Little Light', caption: 'You let one lantern go together. It floats a long way.' }, wilt: { title: 'You Owe Me Gelato', caption: 'The lanterns are long gone. Gelato makes up for most of it.' } } },
  B: { name: 'Petal Falls Chapel', place: 'Orchid Jungle', stage: 'S12', tod: 'sunset', local: 'bride',
    moods: { bloom: { title: 'Catch of the Day', caption: 'She catches the bouquet. "Don\'t get any ideas. Yet."' }, bud: { title: 'Cake for Strangers', caption: 'The wedding waves you in for cake. Two slices each.' }, wilt: { title: 'Soaked and Laughing', caption: 'The waterfall spray gets you both. You run off laughing.' } } },
  C: { name: 'Grand Hotel Vespera', place: 'Moonlit Riviera', stage: 'S13', tod: 'night', local: 'valet',
    moods: { bloom: { title: 'A Star Arrives', caption: 'Red carpet, flashbulbs and fireworks over the bay.' }, bud: { title: 'Valet Parking', caption: 'The valet takes the keys with a deep bow.' }, wilt: { title: 'Noodles Under the Neon', caption: 'No valet for that dusty thing. The noodle cart is better anyway.' } } },
  D: { name: 'Stargazer Observatory', place: 'Starlight Desert', stage: 'S14', tod: 'night', local: 'astronomer',
    moods: { bloom: { title: 'Meteor Shower', caption: 'The dome opens on a meteor shower. Two wishes, one each.' }, bud: { title: 'One Shooting Star', caption: 'Just one shooting star. One is plenty.' }, wilt: { title: 'Cocoa and Clouds', caption: 'Clouds roll in. The astronomer offers cocoa.' } } },
  E: { name: 'Finisterra Lighthouse', place: 'Aurora Highlands', stage: 'S15', tod: 'twilight', local: 'keeper',
    moods: { bloom: { title: 'The Green Flash', caption: 'The green flash at sunset. Best. Day. Ever.' }, bud: { title: 'The Last Sliver', caption: 'You catch the last sliver of sun, just.' }, wilt: { title: 'Share the Jacket', caption: 'The sun is gone and the wind is cold. You share your jacket.' } } }
};

/* ---- fixed routes (hub, Versus, missions): stage lists, ending at a goal or a sprint arch ---- */
OB.ROUTES = {
  flower: { name: 'Flower Sprint', stages: ['S1', 'S2', 'S5'], end: 'sprint' },
  cliff: { name: 'Cliff Sprint', stages: ['S1', 'S3', 'S6'], end: 'sprint' },
  full: { name: 'Full Coast', stages: ['S1', 'S2', 'S5', 'S9', 'S13'], end: 'goal' }
};
})();
