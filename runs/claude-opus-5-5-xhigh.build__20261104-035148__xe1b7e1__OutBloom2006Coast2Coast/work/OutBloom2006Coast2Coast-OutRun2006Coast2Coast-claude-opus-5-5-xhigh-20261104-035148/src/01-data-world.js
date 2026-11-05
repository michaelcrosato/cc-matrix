/* OutBloom — world data: the island of Bellafiore. Biome kits (colours, grounds, scenery rules), the 15 stages of the
 * five-row pyramid (layouts as [segments, curve, hill, opts]), the five goals, the sky presets and the fixed routes.
 * Designers extend the game here: add a stage, give it sections and scenery rules, wire it into OB.FORKS. */
(() => {
'use strict';
const OB = window.OB;

/* ---- biome kits: road colours, default grounds and edges, fog, scenery rules (sprite, side, offset beyond the edge,
 * every n segments, jitter, chance, cluster, size range) ---- */
const K = OB.KITS = {
  beach: { name: 'Beach', road: ['#7c7a86', '#76747f'], rumble: ['#fbf6ee', '#ff5f7a'], lane: '#fffaf0',
    groundL: { kind: 'water', a: '#2f9ee6', b: '#2b96de', c: '#eafcff' }, groundR: { kind: 'sand', a: '#f4dca6', b: '#ecd398', c: '#fff4d4' },
    rules: [{ s: 'palm', side: 'R', off: [.4, 1.6], every: 4, jitter: 2, size: [.9, 1.25] }, { s: 'umbrella', side: 'R', off: [.6, 2.2], every: 9, cluster: 3 },
      { s: 'beachhut', side: 'R', off: [2.4, 2.8], every: 26 }, { s: 'lifeguard', side: 'R', off: [1.6, 2], every: 60 }, { s: 'surfrack', side: 'R', off: [1, 1.4], every: 33 },
      { s: 'buoy', side: 'L', off: [1.5, 4], every: 12, solid: false }, { s: 'billboard', side: 'R', off: [.6, .8], every: 140 }] },
  fields: { name: 'Fields', road: ['#7e7c86', '#78767f'], rumble: ['#fbf6ee', '#9a6ad8'], lane: '#fffaf0',
    groundL: { kind: 'rows', a: '#7cbc58', b: '#74b452', c: '#9a72d6' }, groundR: { kind: 'rows', a: '#7cbc58', b: '#74b452', c: '#9a72d6' },
    rules: [{ s: 'cypress', side: 'both', off: [.6, 1.2], every: 14, jitter: 4 }, { s: 'lavender', side: 'both', off: [.25, .6], every: 3, jitter: 1, solid: false },
      { s: 'farmhouse', side: 'L', off: [3, 4], every: 110 }, { s: 'beehives', side: 'R', off: [1.6, 2], every: 70 }, { s: 'fence', side: 'both', off: [.2, .25], every: 5, solid: false },
      { s: 'haybale', side: 'R', off: [1.2, 2.6], every: 30, cluster: 2 }, { s: 'billboard', side: 'L', off: [.6, .8], every: 150 }] },
  sunfields: { name: 'Sunflower fields', road: ['#807e86', '#7a7880'], rumble: ['#fbf6ee', '#ffb820'], lane: '#fffaf0',
    groundL: { kind: 'rows', a: '#86b84a', b: '#7eb044', c: '#ffcc2a' }, groundR: { kind: 'rows', a: '#86b84a', b: '#7eb044', c: '#ffcc2a' },
    rules: [{ s: 'sunflowers', side: 'both', off: [.3, 1.4], every: 3, jitter: 1, solid: false }, { s: 'silo', side: 'L', off: [2.6, 3.2], every: 90 }, { s: 'barn', side: 'R', off: [2.8, 3.4], every: 120 },
      { s: 'turbine', side: 'both', off: [4, 7], every: 45 }, { s: 'haybale', side: 'both', off: [1.2, 2.2], every: 24 }, { s: 'billboard', side: 'R', off: [.6, .8], every: 160 }] },
  cliffs: { name: 'Cliffs', road: ['#787680', '#72707a'], rumble: ['#fbf6ee', '#ffd23a'], lane: '#fffaf0',
    groundL: { kind: 'water', a: '#2a8cd8', b: '#2886d0', c: '#e6f8ff' }, groundR: { kind: 'rock', a: '#c89a6e', b: '#c09266' },
    edgeL: { kind: 'rail', h: 260, color: ['#c8c8d0', '#b8b8c4'] }, edgeR: { kind: 'cliff', h: 5200, color: ['#c69468', '#b88a5e'], line: '#a87a52' },
    rules: [{ s: 'lemontree', side: 'R', off: [.15, .3], every: 18, jitter: 4 }, { s: 'rock', side: 'R', off: [.1, .3], every: 40 }, { s: 'sign', side: 'L', off: [.1, .12], every: 90 }] },
  lake: { name: 'Lake', road: ['#7a7884', '#74727e'], rumble: ['#fbf6ee', '#3ab0e8'], lane: '#fffaf0',
    groundL: { kind: 'water', a: '#3a9ad8', b: '#3694d0', c: '#e8faff' }, groundR: { kind: 'grass', a: '#4f9a4a', b: '#4a9244' },
    rules: [{ s: 'pine', side: 'R', off: [.3, 2.4], every: 3, jitter: 1, size: [.85, 1.3] }, { s: 'boathouse', side: 'L', off: [1.4, 2], every: 70 }, { s: 'reeds', side: 'L', off: [.2, .5], every: 6, solid: false },
      { s: 'billboard', side: 'R', off: [.6, .8], every: 150 }] },
  canyon: { name: 'Canyon', road: ['#86747a', '#806e74'], rumble: ['#fbf6ee', '#e0602a'], lane: '#fffaf0',
    groundL: { kind: 'sand', a: '#e0a070', b: '#d89868', c: '#f0c090' }, groundR: { kind: 'sand', a: '#e0a070', b: '#d89868', c: '#f0c090' },
    rules: [{ s: 'cactus', side: 'both', off: [.4, 2.5], every: 8, jitter: 4 }, { s: 'rock', side: 'both', off: [.6, 3], every: 13, jitter: 5 }, { s: 'mesa', side: 'both', off: [5, 9], every: 60 },
      { s: 'billboard', side: 'L', off: [.6, .8], every: 170 }] },
  alpine: { name: 'Alpine', road: ['#787884', '#72727e'], rumble: ['#fbf6ee', '#ff7aa8'], lane: '#fffaf0',
    groundL: { kind: 'grass', a: '#6cb05c', b: '#64a856' }, groundR: { kind: 'grass', a: '#6cb05c', b: '#64a856' },
    edgeL: { kind: 'rail', h: 240, color: ['#c8c8d0', '#b8b8c4'] },
    rules: [{ s: 'cherry', side: 'both', off: [.3, 1.8], every: 7, jitter: 3 }, { s: 'pine', side: 'both', off: [1.4, 3.5], every: 6, jitter: 2 }, { s: 'chalet', side: 'R', off: [2.2, 2.8], every: 80 },
      { s: 'cow', side: 'L', off: [1.6, 3], every: 50, cluster: 2 }, { s: 'rock', side: 'R', off: [.3, 1], every: 30 }] },
  town: { name: 'Old town', road: ['#8a8078', '#847a72'], rumble: ['#efe6d8', '#c8402a'], lane: '#fff6e0',
    groundL: { kind: 'cobble', a: '#b0a090', b: '#a89888' }, groundR: { kind: 'cobble', a: '#b0a090', b: '#a89888' },
    edgeL: { kind: 'facade', h: 2600, off: 1.32, color: ['#e8b88a', '#d8a0a0'], window: '#5a4a5a', awning: ['#d8402a', '#2a8a5a', '#e8c040'], rows: 3 },
    edgeR: { kind: 'facade', h: 2400, off: 1.32, color: ['#f0d0a0', '#c8a0c0'], window: '#5a4a5a', awning: ['#2a6ab0', '#d8402a', '#f0e0c0'], rows: 3 },
    rules: [{ s: 'streetlamp', side: 'both', off: [.1, .12], every: 10 }, { s: 'stall', side: 'R', off: [.15, .2], every: 26 }, { s: 'planter', side: 'L', off: [.12, .16], every: 14 }] },
  vineyard: { name: 'Vineyard', road: ['#7e7a80', '#78747a'], rumble: ['#fbf6ee', '#a0306a'], lane: '#fffaf0',
    groundL: { kind: 'rows', a: '#8aa84e', b: '#82a048', c: '#4a6a2a' }, groundR: { kind: 'rows', a: '#8aa84e', b: '#82a048', c: '#4a6a2a' },
    rules: [{ s: 'cypress', side: 'both', off: [.4, 1], every: 9, jitter: 2 }, { s: 'villa', side: 'L', off: [3, 4], every: 120 }, { s: 'barrel', side: 'R', off: [.4, .8], every: 40, cluster: 3 },
      { s: 'winecart', side: 'R', off: [1.2, 1.6], every: 95 }, { s: 'fence', side: 'both', off: [.2, .25], every: 6, solid: false }, { s: 'billboard', side: 'R', off: [.6, .8], every: 160 }] },
  lagoon: { name: 'Lagoon', road: ['#7c7a84', '#76747e'], rumble: ['#fbf6ee', '#ff6aa8'], lane: '#fffaf0',
    groundL: { kind: 'water', a: '#4ab6d8', b: '#44aed0', c: '#f0fcff' }, groundR: { kind: 'water', a: '#f09ab8', b: '#e892b0', c: '#fff0f6' },
    edgeL: { kind: 'rail', h: 200, off: 1.12, color: ['#e8e8f0', '#d8d8e4'] }, edgeR: { kind: 'rail', h: 200, off: 1.12, color: ['#e8e8f0', '#d8d8e4'] },
    rules: [{ s: 'flamingo', side: 'R', off: [.8, 3], every: 9, jitter: 4, cluster: 2, solid: false }, { s: 'saltpile', side: 'R', off: [2.5, 4], every: 35 }, { s: 'lamp', side: 'both', off: [.08, .1], every: 16 },
      { s: 'buoy', side: 'L', off: [1, 3], every: 20, solid: false }] },
  jungle: { name: 'Jungle', road: ['#6a6e70', '#64686a'], rumble: ['#efeee0', '#40a050'], lane: '#f0f4e0',
    groundL: { kind: 'grass', a: '#2f7a3a', b: '#2a7234' }, groundR: { kind: 'grass', a: '#2f7a3a', b: '#2a7234' },
    rules: [{ s: 'jpalm', side: 'both', off: [.3, 1.6], every: 5, jitter: 2 }, { s: 'giantleaf', side: 'both', off: [.15, .5], every: 4, jitter: 2, solid: false }, { s: 'fern', side: 'both', off: [.1, .8], every: 3, solid: false },
      { s: 'orchid', side: 'both', off: [.2, .9], every: 11, solid: false }, { s: 'parrot', side: 'L', off: [.6, 1.2], every: 70, solid: false }] },
  nightcity: { name: 'Riviera', road: ['#3e3c4e', '#3a3848'], rumble: ['#d8d8f0', '#ff4aa0'], lane: '#ffe070',
    groundL: { kind: 'water', a: '#14204a', b: '#121c44', c: '#ffd070' }, groundR: { kind: 'cobble', a: '#3a3448', b: '#363044' },
    edgeR: { kind: 'facade', h: 3200, off: 1.36, color: ['#3a2e58', '#2e2848'], window: '#1a1430', lit: '#ffd870', rows: 4 },
    edgeL: { kind: 'rail', h: 220, off: 1.14, color: ['#8a8aa8', '#7a7a98'] },
    rules: [{ s: 'streetlamp', side: 'both', off: [.08, .1], every: 8 }, { s: 'neon', side: 'R', off: [.1, .14], every: 22 }, { s: 'yacht', side: 'L', off: [1.2, 3], every: 40, solid: false },
      { s: 'palm', side: 'L', off: [.2, .3], every: 12 }] },
  nightdesert: { name: 'Night desert', road: ['#4a4652', '#46424e'], rumble: ['#d8d0e0', '#6a5ab0'], lane: '#f0e8c0',
    groundL: { kind: 'sand', a: '#5a4a6a', b: '#544464', c: '#7a6a8a' }, groundR: { kind: 'sand', a: '#5a4a6a', b: '#544464', c: '#7a6a8a' },
    rules: [{ s: 'cactus', side: 'both', off: [.5, 3], every: 10, jitter: 5 }, { s: 'nightcactus', side: 'both', off: [.4, 2], every: 15, jitter: 5, solid: false }, { s: 'rock', side: 'both', off: [.8, 3], every: 17, jitter: 6 },
      { s: 'billboard', side: 'R', off: [.6, .8], every: 170 }] },
  highlands: { name: 'Highlands', road: ['#6c6a78', '#666472'], rumble: ['#e8e0f0', '#5a8a5a'], lane: '#f4f0e0',
    groundL: { kind: 'grass', a: '#7a6a8a', b: '#746484' }, groundR: { kind: 'grass', a: '#7a6a8a', b: '#746484' },
    edgeL: { kind: 'stonewall', h: 420, off: 1.16, color: ['#8a8478', '#7e786c'], cap: '#b0a898' }, edgeR: { kind: 'stonewall', h: 420, off: 1.16, color: ['#8a8478', '#7e786c'], cap: '#b0a898' },
    rules: [{ s: 'heather', side: 'both', off: [.2, 2], every: 4, jitter: 2, solid: false }, { s: 'standingstone', side: 'both', off: [1.4, 3], every: 45 }, { s: 'sheep', side: 'both', off: [1, 3], every: 28, cluster: 2, solid: false },
      { s: 'rock', side: 'both', off: [.5, 2.4], every: 22 }] }
};

/* ---- time of day: the grade on top of a kit (fog, headlights, bloom strength) ---- */
OB.TOD = {
  dawn: { fog: '#f2c8c0', bloom: .55, light: 1, label: 'Dawn' }, morning: { fog: '#d8ecf4', bloom: .4, light: 1, label: 'Morning' },
  latemorning: { fog: '#dcecf0', bloom: .35, light: 1, label: 'Late morning' }, noon: { fog: '#e4f0f4', bloom: .35, light: 1, label: 'Noon' },
  afternoon: { fog: '#f0e8d8', bloom: .4, light: 1, label: 'Afternoon' }, lateafternoon: { fog: '#f4d8a8', bloom: .5, light: 1, label: 'Late afternoon' },
  sunset: { fog: '#f8a878', bloom: .7, light: .9, label: 'Sunset' }, twilight: { fog: '#6a5a8a', bloom: .6, light: .6, label: 'Twilight', lights: true },
  night: { fog: '#1a1a3a', bloom: .6, light: .4, label: 'Night', lights: true }
};

/* ---- the 15 stages ([segments, curve, hill, opts]); 820-980 segments each; the first 150 flat ---- */
const W = (kind, a, b, c) => ({ kind, a, b, c });
OB.STAGES = {
  S1: { name: 'Sunrise Strand', row: 1, col: 1, kit: 'beach', tod: 'dawn', lanes: 3, diff: 1, sky: 'beachDawn',
    sections: [[150, 0, 0, { start: true }], [70, 2, 0], [40, 0, 0], [70, -3, 0], [60, 0, 800], [50, 3, -800], [90, 0, 0, { span: { kind: 'palms', color: '#3aa050', dark: '#2a7a3a', every: 6, h: 1900 } }],
      [60, -2, 0], [50, 4, 0, { edgeL: { kind: 'stonewall', h: 480, color: ['#d8c8a8', '#ccbc9c'], cap: '#f0e4c8' } }], [80, 0, 1200], [70, 0, -1200], [60, -3, 0], [40, 0, 0]],
    traffic: { hatch: 3, van: 1, icecream: .4, bus: .6 }, requests: [{ at: .18, type: 'balloons', n: 12 }, { at: .62, type: 'pass', n: 8 }],
    landmarks: [{ at: .42, side: -1, kind: 'ferris', off: 3.4 }, { at: .1, side: 1, kind: 'beachhut', off: 1.8 }, { at: .75, side: 1, kind: 'lifeguard', off: 1.5 }], photo: .42 },
  S2: { name: 'Lavender Ridge', row: 2, col: 1, kit: 'fields', tod: 'morning', lanes: 3, diff: 1, sky: 'fieldsMorning',
    sections: [[150, 0, 0], [60, 0, 1500], [60, 2, -1500], [60, 0, 1500], [60, -2, -1500], [70, 3, 0], [60, 0, 1500], [60, 0, -1500], [80, -2, 0], [70, 4, 0], [60, 0, 1500], [60, 2, -1500], [50, 0, 0]],
    traffic: { hatch: 2, van: 2, pickup: 1, camper: 1 }, requests: [{ at: .25, type: 'bees', n: 8 }, { at: .65, type: 'drift', n: 2 }],
    landmarks: [{ at: .55, side: 1, kind: 'farmhouse', off: 2.2 }, { at: .3, side: -1, kind: 'beehives', off: 1.6 }, { at: .8, side: -1, kind: 'watertower', off: 2.6 }], photo: .55 },
  S3: { name: 'Lemon Cliffs', row: 2, col: 2, kit: 'cliffs', tod: 'morning', lanes: 2, diff: 3, sky: 'cliffsMorning',
    sections: [[150, 0, 0], [60, 4, 0], [40, 0, 0], [60, -5, 600], [60, 2, 0, { tunnel: true }], [50, 4, 0], [70, -4, -600], [40, 0, 0], [80, 5, 0, { span: { kind: 'gallery', color: '#d8c8a8', side: 1, h: 1700 } }],
      [50, -3, 0], [60, 4, 400], [60, -5, -400], [70, 6, 0], [40, 0, 0]],
    traffic: { scooter: 2, hatch: 2, van: 1, bus: .5 }, requests: [{ at: .2, type: 'cones', n: 10 }, { at: .6, type: 'close', n: 5 }],
    landmarks: [{ at: .35, side: 1, kind: 'chapel', off: .5 }, { at: .65, side: 1, kind: 'lemontree', off: .4 }, { at: .15, side: 1, kind: 'terraces', off: .6 }], photo: .35 },
  S4: { name: 'Sunflower Prairie', row: 3, col: 1, kit: 'sunfields', tod: 'latemorning', lanes: 4, diff: 1, sky: 'prairie',
    sections: [[150, 0, 0], [120, 0, 0], [80, 1, 0], [60, -2, 0], [150, 0, 0, { crossing: true }], [80, 2, 0], [60, -1, 0], [150, 0, 0], [60, 1, 0], [40, 0, 0]],
    traffic: { tractor: 1.5, pickup: 2, sedan: 2, truck: 1 }, requests: [{ at: .2, type: 'draft', n: 6 }, { at: .6, type: 'speed', n: 250 }],
    landmarks: [{ at: .5, side: -1, kind: 'crossing', off: .3 }, { at: .3, side: 1, kind: 'haysculpture', off: 2.4 }, { at: .7, side: -1, kind: 'barn', off: 2.8 }], photo: .3 },
  S5: { name: 'Lake Serenata', row: 3, col: 2, kit: 'lake', tod: 'noon', lanes: 3, diff: 2, sky: 'lake',
    sections: [[150, 0, 0], [70, 2, 0], [60, -3, 500], [50, 0, -500], [100, 0, 0, { bridge: true, edgeL: { kind: 'rail', h: 700, color: ['#c84a3a', '#b8402e'], post: '#8a2a1a' }, edgeR: { kind: 'rail', h: 700, color: ['#c84a3a', '#b8402e'], post: '#8a2a1a' }, groundR: W('water', '#3a9ad8', '#3694d0', '#e8faff'), span: { kind: 'gallery', color: '#c84a3a', side: 1, h: 1500, every: 4 } }],
      [60, -4, 0, { waterfall: true }], [70, 3, 0, { event: 'shower' }], [60, 0, 700, { event: 'shower' }], [60, -2, -700], [80, 2, 0], [60, -3, 0], [40, 0, 0]],
    traffic: { sedan: 2, camper: 2, van: 1, bus: .5 }, requests: [{ at: .22, type: 'arches', n: 7 }, { at: .66, type: 'bouquets', n: 12 }],
    landmarks: [{ at: .4, side: -1, kind: 'steamer', off: 3 }, { at: .48, side: 1, kind: 'waterfall', off: 1.2 }, { at: .15, side: -1, kind: 'boathouse', off: 1.5 }], photo: .48 },
  S6: { name: 'Rosa Canyon', row: 3, col: 3, kit: 'canyon', tod: 'noon', lanes: 2, diff: 4, sky: 'canyon', shimmer: true,
    sections: [[150, 0, 0], [60, 0, 4000], [50, 0, -4000], [60, 5, 0], [40, 0, 0, { span: { kind: 'arch', color: '#c86a4a', dark: '#a8523a', every: 40, h: 2100 } }], [60, -6, 0], [50, 0, 3500], [50, 0, -3500], [60, 6, 0],
      [30, 0, 0, { span: { kind: 'arch', color: '#c86a4a', dark: '#a8523a', every: 30, h: 2100 } }], [60, -5, 2000], [60, 5, -2000], [50, 0, 4000], [50, 0, -4000], [40, -6, 0], [30, 0, 0, { span: { kind: 'arch', color: '#c86a4a', dark: '#a8523a', every: 30, h: 2100 } }]],
    traffic: { pickup: 2, truck: 1, camper: 1 }, requests: [{ at: .3, type: 'gnomes', n: 10 }, { at: .7, type: 'drift', n: 2 }],
    landmarks: [{ at: .45, side: 1, kind: 'souvenir', off: .9 }, { at: .2, side: -1, kind: 'mesa', off: 4 }, { at: .8, side: 1, kind: 'mesa', off: 5 }], photo: .45 },
  S7: { name: 'Cherry Pass', row: 4, col: 1, kit: 'alpine', tod: 'afternoon', lanes: 3, diff: 2, sky: 'alpine',
    sections: [[150, 0, 0], [80, 3, 1500], [60, -6, 1000], [60, 6, 1000], [50, 0, 500, { span: { kind: 'snowshed', color: '#8a6a4a', side: -1, h: 1700, every: 2 } }], [60, -5, 1000], [60, 5, 1000, { event: 'petals' }], [70, 0, 0, { event: 'petals' }],
      [60, -6, -1500, { event: 'petals' }], [50, 0, 0, { span: { kind: 'snowshed', color: '#8a6a4a', side: 1, h: 1700, every: 2 } }], [60, 4, -1500], [70, -3, -1000], [40, 0, -1000], [30, 0, 0]],
    traffic: { sedan: 2, camper: 1, bus: 1, van: 1 }, requests: [{ at: .25, type: 'drift', n: 2 }, { at: .6, type: 'clean', n: 0 }],
    landmarks: [{ at: .3, side: 1, kind: 'chalet', off: 2 }, { at: .6, side: -1, kind: 'cow', off: 1.8 }, { at: .45, side: 1, kind: 'cherry', off: .6 }], photo: .3 },
  S8: { name: 'Old Town Fiorenza', row: 4, col: 2, kit: 'town', tod: 'afternoon', lanes: 3, diff: 3, sky: 'town',
    sections: [[150, 0, 0], [60, 0, 0, { span: { kind: 'bunting', color: '#8a6a4a', flags: ['#ff5f7a', '#ffd23a', '#3ab0e8', '#7ad860'], every: 6, h: 2000 } }], [30, 6, 0], [40, 0, 0], [30, -6, 0],
      [50, 0, 0, { tunnel: true, w: .85, lanes: 2, colors: { wall: ['#c8a880', '#b89870'], roof: '#7a6048', portal: '#e8c8a0' } }], [60, 2, 0], [60, 0, 0, { w: 1.35, lanes: 4, fountain: true }], [40, -2, 0], [30, 6, 0],
      [50, 0, 0, { span: { kind: 'bunting', color: '#8a6a4a', flags: ['#ff5f7a', '#ffffff', '#3a8a5a'], every: 6, h: 2000 } }], [30, -6, 0], [70, 3, 0], [60, -2, 0], [80, 0, 0], [40, 0, 0]],
    traffic: { taxi: 2, scooter: 3, van: 1, bus: 1 }, requests: [{ at: .35, type: 'photo', n: 1 }, { at: .7, type: 'pass', n: 10 }],
    landmarks: [{ at: .38, side: -1, kind: 'dome', off: 1.6 }, { at: .58, side: 1, kind: 'fountain', off: .4 }, { at: .2, side: 1, kind: 'stall', off: .25 }], photo: .38 },
  S9: { name: 'Vineyard Way', row: 4, col: 3, kit: 'vineyard', tod: 'lateafternoon', lanes: 3, diff: 3, sky: 'vineyard',
    sections: [[150, 0, 0], [70, 3, 2000], [70, -3, -2000], [80, 0, 0, { avenue: true }], [60, 4, 2000], [60, -4, -2000], [70, 0, 0], [60, 5, 0], [60, -3, 1500], [60, 3, -1500], [80, -4, 0], [60, 2, 0], [40, 0, 0]],
    traffic: { tractor: 1, pickup: 2, van: 1, sedan: 1 }, requests: [{ at: .2, type: 'gnomes', n: 10 }, { at: .62, type: 'ribbons', n: 5 }],
    landmarks: [{ at: .55, side: 1, kind: 'castle', off: 3.5 }, { at: .3, side: -1, kind: 'villa', off: 2.6 }, { at: .75, side: 1, kind: 'winecart', off: 1.3 }], photo: .55 },
  S10: { name: 'Seafoam Causeway', row: 4, col: 4, kit: 'lagoon', tod: 'lateafternoon', lanes: 2, diff: 5, sky: 'lagoon',
    sections: [[150, 0, 0], [120, 1, 0, { gusts: 1 }], [80, -2, 0, { gusts: 1 }], [60, 0, 0], [30, 0, 1300, { liftbridge: true }], [30, 0, -1300], [120, 2, 0, { gusts: 2 }], [90, -1, 0], [100, 0, 0, { gusts: 1 }], [80, 3, 0], [90, 0, 0]],
    traffic: { sedan: 2, truck: 2, camper: 1 }, requests: [{ at: .25, type: 'balloons', n: 12, drift: true }, { at: .65, type: 'speed', n: 240 }],
    landmarks: [{ at: .4, side: -1, kind: 'liftbridge', off: .3 }, { at: .2, side: 1, kind: 'saltpile', off: 2.5 }, { at: .7, side: 1, kind: 'flamingo', off: 1.5 }], photo: .4 },
  S11: { name: 'Golden Bay', row: 5, col: 1, kit: 'beach', tod: 'sunset', lanes: 3, diff: 1, sky: 'beachSunset', goal: 'A',
    groundL: W('sand', '#e8b880', '#e0b078', '#f8d0a0'), groundR: W('water', '#e87a6a', '#e07264', '#fff0c0'),
    rulesOverride: [{ s: 'palm', side: 'L', off: [.4, 1.6], every: 4, jitter: 2, size: [.9, 1.25] }, { s: 'umbrella', side: 'L', off: [.6, 2.2], every: 11, cluster: 2 }, { s: 'volleyball', side: 'L', off: [1.4, 2], every: 70 },
      { s: 'sailboat', side: 'R', off: [2, 5], every: 30, solid: false }, { s: 'lamp', side: 'R', off: [.1, .12], every: 10 }, { s: 'billboard', side: 'L', off: [.6, .8], every: 140 }],
    sections: [[150, 0, 0], [80, 2, 0], [70, -2, 0], [80, 0, 0, { lit: true, span: { kind: 'bunting', color: '#6a4a3a', flags: ['#ffcf4a', '#ff8a4a', '#ff5f7a'], every: 8, h: 2000 } }], [60, 3, 0], [60, -2, 600], [60, 0, -600],
      [90, 0, 0, { lit: true, span: { kind: 'bunting', color: '#6a4a3a', flags: ['#ffcf4a', '#ff8a4a', '#ff5f7a'], every: 8, h: 2000 } }], [70, -3, 0], [60, 2, 0], [80, 0, 0], [40, 0, 0]],
    traffic: { hatch: 2, icecream: .5, bus: 1, van: 1 }, requests: [{ at: .25, type: 'bouquets', n: 12 }, { at: .62, type: 'balloons', n: 14 }],
    landmarks: [{ at: .5, side: -1, kind: 'volleyball', off: 1.6 }, { at: .3, side: 1, kind: 'sailboat', off: 3 }], photo: .5 },
  S12: { name: 'Orchid Jungle', row: 5, col: 2, kit: 'jungle', tod: 'sunset', lanes: 3, diff: 2, sky: 'jungle', goal: 'B',
    sections: [[150, 0, 0], [70, 3, 0, { span: { kind: 'canopy', color: '#2a7a3a', dark: '#1e5a2a', every: 3, h: 2000 } }], [60, -4, 0], [60, 0, 800], [60, 5, -800, { span: { kind: 'canopy', color: '#2a7a3a', dark: '#1e5a2a', every: 3, h: 2000 } }],
      [80, 0, 0, { edgeL: { kind: 'rail', h: 360, color: ['#8a6a3a', '#7a5a2e'], post: '#5a3a1a' }, edgeR: { kind: 'rail', h: 360, color: ['#8a6a3a', '#7a5a2e'], post: '#5a3a1a' }, groundL: W('water', '#2a6a5a', '#286454', '#c8f0d8'), groundR: W('water', '#2a6a5a', '#286454', '#c8f0d8') }],
      [60, -3, 0], [50, 4, 0, { span: { kind: 'arch', color: '#8a8a7a', dark: '#6a6a5a', every: 25, h: 2200 } }], [60, -5, 0], [70, 0, 0, { span: { kind: 'canopy', color: '#2a7a3a', dark: '#1e5a2a', every: 3, h: 2000 } }], [60, 3, 0], [60, -3, 0], [60, 0, 0]],
    traffic: { pickup: 2, camper: 1, van: 1 }, requests: [{ at: .22, type: 'arches', n: 8 }, { at: .6, type: 'bees', n: 8 }],
    landmarks: [{ at: .4, side: 1, kind: 'ruin', off: 1.4 }, { at: .65, side: -1, kind: 'waterfall', off: 1.6 }], photo: .4 },
  S13: { name: 'Moonlit Riviera', row: 5, col: 3, kit: 'nightcity', tod: 'night', lanes: 4, diff: 3, sky: 'riviera', goal: 'C',
    sections: [[150, 0, 0, { lit: true }], [80, 2, 0, { lit: true }], [70, -3, 0, { lit: true }], [60, 0, 0, { tunnel: true, colors: { wall: ['#5a4a3a', '#4a3a2e'], roof: '#2a2220', portal: '#3a2e48', lamp: '#ffb040' } }], [60, 3, 0, { lit: true }], [60, -2, 0, { lit: true }],
      [70, 0, 0, { tunnel: true, colors: { wall: ['#5a4a3a', '#4a3a2e'], roof: '#2a2220', portal: '#3a2e48', lamp: '#ffb040' } }], [60, 3, 0, { lit: true, event: 'fireworks' }], [80, -2, 0, { lit: true, event: 'fireworks' }], [60, 2, 0, { lit: true, event: 'fireworks' }], [60, -3, 0, { lit: true, event: 'fireworks' }], [80, 0, 0, { lit: true, event: 'fireworks' }], [40, 0, 0, { lit: true }]],
    traffic: { taxi: 1.4, sedan: 2, bus: .6, scooter: 1.2 }, requests: [{ at: .3, type: 'close', n: 6 }, { at: .65, type: 'ribbons', n: 6 }],
    landmarks: [{ at: .55, side: 1, kind: 'casino', off: .5 }, { at: .25, side: -1, kind: 'yacht', off: 1.5 }, { at: .8, side: 1, kind: 'funicular', off: .6 }], photo: .55 },
  S14: { name: 'Starlight Desert', row: 5, col: 4, kit: 'nightdesert', tod: 'night', lanes: 3, diff: 4, sky: 'starDesert', goal: 'D',
    sections: [[150, 0, 0], [100, 0, 0], [50, 0, 3000], [50, 0, -3000], [80, 0, 0], [60, 5, 0], [50, 0, 3000], [50, 0, -3000], [40, 0, 2500], [40, 0, -2500], [20, 0, 0], [60, -5, 0], [50, 0, 2500], [50, 0, -2500], [50, 0, 0]],
    traffic: { truck: 2, pickup: 2, camper: 1 }, requests: [{ at: .25, type: 'draft', n: 6 }, { at: .6, type: 'cones', n: 12 }],
    landmarks: [{ at: .4, side: 1, kind: 'motel', off: 1.4 }, { at: .65, side: -1, kind: 'dish', off: 3 }], photo: .4 },
  S15: { name: 'Aurora Highlands', row: 5, col: 5, kit: 'highlands', tod: 'twilight', lanes: 2, diff: 5, sky: 'aurora', goal: 'E',
    sections: [[150, 0, 0], [60, 5, 0], [60, -6, 0], [50, 0, 2000], [50, 0, -2000], [60, 6, 0], [60, -5, 0], [40, 0, 1500], [40, 0, -1500], [50, 0, 0, { w: .85, bridge: true }], [60, -6, 0], [60, 5, 0], [50, 0, 2000], [50, 0, -2000], [60, 6, 0], [40, 0, 0]],
    traffic: { sedan: 1, camper: 1, truck: 1, pickup: 1 }, requests: [{ at: .2, type: 'drift', n: 2 }, { at: .58, type: 'clean', n: 0 }],
    landmarks: [{ at: .45, side: 1, kind: 'castleruin', off: 3 }, { at: .25, side: -1, kind: 'standingstone', off: 1.6 }], photo: .45 }
};
for (const [id, s] of Object.entries(OB.STAGES)) { s.id = id; s.length = s.sections.reduce((a, q) => a + q[0], 0); }

/* ---- the pyramid: stage (r, c) forks to (r+1, c) left and (r+1, c+1) right ---- */
OB.GRID = [['S1'], ['S2', 'S3'], ['S4', 'S5', 'S6'], ['S7', 'S8', 'S9', 'S10'], ['S11', 'S12', 'S13', 'S14', 'S15']];
OB.FORKS = {};
for (let r = 0; r < 4; r++) OB.GRID[r].forEach((id, c) => { OB.FORKS[id] = [OB.GRID[r + 1][c], OB.GRID[r + 1][c + 1]]; });
OB.stageAt = route => { let c = 0; for (const ch of route) if (ch === 'R') c++; return OB.GRID[route.length][c]; };
OB.routeStages = route => { const out = ['S1']; let c = 0; for (let i = 0; i < route.length; i++) { if (route[i] === 'R') c++; out.push(OB.GRID[i + 1][c]); } return out; };
OB.ALL_ROUTES = (() => { const out = []; for (let m = 0; m < 16; m++) out.push([0, 1, 2, 3].map(b => (m >> (3 - b)) & 1 ? 'R' : 'L').join('')); return out; })();

/* ---- the five goals ---- */
OB.GOALS = {
  A: { stage: 'S11', place: 'Lantern Pier', town: 'Porto Lucciola', sky: 'beachSunset', titles: { bloom: 'A Thousand Lanterns', bud: 'One Lantern', wilt: 'You Owe Me Gelato' } },
  B: { stage: 'S12', place: 'Petal Falls Chapel', town: 'Valle Orchidea', sky: 'jungle', titles: { bloom: 'Catch of the Day', bud: 'Cake for Two', wilt: 'Soaked and Laughing' } },
  C: { stage: 'S13', place: 'Grand Hotel Vespera', town: 'Vespera', sky: 'riviera', titles: { bloom: 'A Star Arrives', bud: 'Valet Parking', wilt: 'Noodles Under the Neon' } },
  D: { stage: 'S14', place: 'Stargazer Observatory', town: 'Monte Stella', sky: 'starDesert', titles: { bloom: 'Meteor Wishes', bud: 'One Shooting Star', wilt: 'Cocoa and Clouds' } },
  E: { stage: 'S15', place: 'Finisterra Lighthouse', town: 'Capo Finisterra', sky: 'aurora', titles: { bloom: 'The Green Flash', bud: 'The Last Sliver', wilt: 'Share the Jacket' } }
};

/* ---- fixed routes: AI Hub, Versus, missions (a stage list; ends at a goal or a sprint arch) ---- */
OB.ROUTES = {
  flower: { name: 'Flower Sprint', stages: ['S1', 'S2', 'S5'], sprint: true },
  cliff: { name: 'Cliff Sprint', stages: ['S1', 'S3', 'S6'], sprint: true },
  full: { name: 'Full Coast', stages: ['S1', 'S2', 'S5', 'S9', 'S13'], goal: 'C' }
};

/* ---- skies: gradient (top to horizon), sun or moon, clouds, far layers ---- */
OB.SKIES = {
  beachDawn: { grad: ['#3a4a9a', '#8a6ab8', '#e88aa8', '#ffb890', '#ffe0b0'], sun: { x: .7, y: .78, r: 18, color: '#fff2c8', halo: '#ffc890' }, clouds: { color: '#ffd0d8', shade: '#c890b8', y: .3, n: 7 },
    layers: [{ kind: 'sea', color: '#4a7ac8', hi: '#ffd8b0', y: .98 }, { kind: 'hills', color: '#7a6aa8', y: .93, height: .06, parallax: .05 }] },
  beachSunset: { grad: ['#2a2a7a', '#7a3a8a', '#e85a6a', '#ff9a5a', '#ffd070'], sun: { x: .35, y: .86, r: 24, color: '#fff0a0', halo: '#ff9a4a' }, clouds: { color: '#ff9a8a', shade: '#a04a7a', y: .35, n: 8 },
    layers: [{ kind: 'hills', color: '#5a2a5a', y: .95, height: .08, parallax: .05 }, { kind: 'sea', color: '#c85a5a', hi: '#ffe090', y: .98, right: true }] },
  fieldsMorning: { grad: ['#3a7ad8', '#6aa8ea', '#a8d0f2', '#dceaf4'], sun: { x: .8, y: .25, r: 13, color: '#fffbe8', halo: '#fff0b0' }, clouds: { color: '#ffffff', shade: '#c8d8f0', y: .28, n: 8 },
    layers: [{ kind: 'mountains', color: '#8a9ac8', y: .9, height: .2, parallax: .03, snow: '#f0f4ff' }, { kind: 'hills', color: '#8a7ab8', y: .96, height: .1, parallax: .06 }, { kind: 'balloons', y: .5, parallax: .04 }] },
  cliffsMorning: { grad: ['#2a72d0', '#5aa0e8', '#9ad0f4', '#d8f0fa'], sun: { x: .25, y: .2, r: 13, color: '#fffbe8', halo: '#fff4c0' }, clouds: { color: '#ffffff', shade: '#c8dcf0', y: .25, n: 6 },
    layers: [{ kind: 'sea', color: '#2a7ad0', hi: '#ffffff', y: .98 }, { kind: 'village', y: .96, parallax: .05 }] },
  prairie: { grad: ['#2a7ae0', '#5aa8f0', '#9ad0f8', '#e0f0fa'], sun: { x: .55, y: .16, r: 13, color: '#fffbe8', halo: '#fff4c0' }, clouds: { color: '#ffffff', shade: '#d0e0f4', y: .3, n: 9 },
    layers: [{ kind: 'hills', color: '#9ab870', y: .96, height: .05, parallax: .04 }, { kind: 'train', y: .965, parallax: .06 }] },
  lake: { grad: ['#2a80e0', '#5ab0f0', '#9ad8f8', '#e0f4fa'], sun: { x: .5, y: .12, r: 12, color: '#fffff0', halo: '#ffffd0' }, clouds: { color: '#ffffff', shade: '#d0e0f0', y: .26, n: 7 },
    layers: [{ kind: 'mountains', color: '#6a8ab0', y: .9, height: .22, parallax: .03, snow: '#ffffff' }, { kind: 'hills', color: '#3a6a4a', y: .97, height: .07, parallax: .06, pines: true }] },
  canyon: { grad: ['#2a70d0', '#5aa0e0', '#a8c8e0', '#f0d8b8'], sun: { x: .6, y: .12, r: 13, color: '#fffff0', halo: '#fff0c0' }, clouds: { color: '#ffffff', shade: '#e0d0c8', y: .22, n: 4 },
    layers: [{ kind: 'mesa', color: '#c86a4a', y: .97, height: .2, parallax: .04 }, { kind: 'mesa', color: '#a85a4a', y: .99, height: .12, parallax: .08, seed: 4 }] },
  alpine: { grad: ['#3a7ad8', '#6aa8e8', '#b0d4f0', '#f0eef4'], sun: { x: .3, y: .22, r: 12, color: '#fffbe8', halo: '#fff0c8' }, clouds: { color: '#ffffff', shade: '#d0d8f0', y: .3, n: 6 },
    layers: [{ kind: 'mountains', color: '#7a8ab8', y: .85, height: .32, parallax: .03, snow: '#ffffff' }, { kind: 'mountains', color: '#5a7a8a', y: .94, height: .16, parallax: .06, snow: '#e8f0f8', seed: 3 }] },
  town: { grad: ['#3a78d0', '#6aa8e0', '#b8d0e8', '#f4e4d0'], sun: { x: .72, y: .3, r: 13, color: '#fff8e0', halo: '#ffe0b0' }, clouds: { color: '#ffffff', shade: '#e0d0e0', y: .28, n: 6 },
    layers: [{ kind: 'hills', color: '#8a9a70', y: .95, height: .08, parallax: .04 }, { kind: 'roofs', y: .975, parallax: .07 }] },
  vineyard: { grad: ['#3a6ac8', '#7a9ad8', '#e0b8a0', '#ffd8a0'], sun: { x: .25, y: .55, r: 16, color: '#fff0c0', halo: '#ffc880' }, clouds: { color: '#ffe0c0', shade: '#c8a0a0', y: .28, n: 7 },
    layers: [{ kind: 'hills', color: '#7a8a5a', y: .93, height: .1, parallax: .04, cypress: true }, { kind: 'hills', color: '#6a7a4a', y: .97, height: .06, parallax: .07, seed: 7 }] },
  lagoon: { grad: ['#4a6ac8', '#9a8ad0', '#f0a8b0', '#ffd0a8'], sun: { x: .4, y: .6, r: 17, color: '#fff0c8', halo: '#ffb890' }, clouds: { color: '#ffd8d8', shade: '#c8a0c0', y: .3, n: 7 },
    layers: [{ kind: 'sea', color: '#7ab0d8', hi: '#ffe8c8', y: .98 }, { kind: 'saltpyramids', y: .975, parallax: .05 }] },
  jungle: { grad: ['#3a2a7a', '#8a3a7a', '#e86a5a', '#ffaa5a', '#ffd88a'], sun: { x: .6, y: .8, r: 20, color: '#fff0a0', halo: '#ff9050' }, clouds: { color: '#ff9a7a', shade: '#8a3a6a', y: .3, n: 6 },
    layers: [{ kind: 'hills', color: '#2a4a3a', y: .9, height: .2, parallax: .03, jungle: true }, { kind: 'hills', color: '#1a3a2a', y: .96, height: .1, parallax: .06, jungle: true, seed: 5 }] },
  riviera: { grad: ['#0a0a2a', '#1a1a4a', '#3a2a6a', '#6a3a7a'], moon: { x: .78, y: .2, r: 11, color: '#f4f0e0' }, stars: 70,
    layers: [{ kind: 'skyline', color: '#1e1a3a', y: .97, height: .2, parallax: .05 }, { kind: 'sea', color: '#1a2050', hi: '#ffd070', y: .99 }] },
  starDesert: { grad: ['#04041a', '#0e0e34', '#1e1a4a', '#3a2a5a'], moon: { x: .25, y: .24, r: 13, color: '#f4f0e0' }, stars: 160, shooting: true,
    layers: [{ kind: 'mesa', color: '#2a2040', y: .97, height: .12, parallax: .04 }, { kind: 'mesa', color: '#1e1830', y: .99, height: .07, parallax: .07, seed: 3 }] },
  aurora: { grad: ['#0a1030', '#1a2a5a', '#3a3a7a', '#8a5a8a', '#e88a7a'], moon: { x: .7, y: .25, r: 9, color: '#e8f0ff' }, stars: 90, aurora: true,
    layers: [{ kind: 'mountains', color: '#2a2a4a', y: .93, height: .18, parallax: .03, snow: '#8a8ab0' }, { kind: 'hills', color: '#2a2440', y: .97, height: .07, parallax: .06 }] },
  title: { grad: ['#2a2a7a', '#7a3a8a', '#e85a8a', '#ff9a6a', '#ffd88a'], sun: { x: .5, y: .84, r: 30, color: '#fff4c0', halo: '#ff9a5a' }, clouds: { color: '#ffb0a8', shade: '#a05080', y: .3, n: 8 },
    layers: [{ kind: 'sea', color: '#c8607a', hi: '#ffe0a0', y: .99 }] }
};
})();
