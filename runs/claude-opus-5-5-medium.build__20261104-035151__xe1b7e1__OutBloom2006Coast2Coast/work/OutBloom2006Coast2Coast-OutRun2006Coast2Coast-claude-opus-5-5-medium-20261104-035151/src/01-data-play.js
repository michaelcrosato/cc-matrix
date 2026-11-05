/* Play data: the Fioretti cars and paints, traffic types, the 14 Love in Bloom requests, the 14 Coast 2 Coast Tour
 * missions and the Garage Garden beds. Plain objects: add a car, a request or a mission here. */
(() => {
'use strict';
const OB = window.OB;

/* ---- the cars (PLAN §8.4): top km/h, 0-100 s, steering, drift grip, cylinders (the engine note), look ---- */
OB.CARS = {
  primavera: { name: 'Primavera 300 Spider', year: 1962, top: 245, acc: 5.8, steer: 2.35, grip: .92, cyl: 4, tone: 1400, cls: 'Novice', look: 'classic', paint: '#f4e8c8', trim: '#d8d8e0', hoops: false, fins: true },
  orchidea: { name: 'Orchidea Spider', year: 2004, top: 272, acc: 4.5, steer: 2.2, grip: .85, cyl: 8, tone: 2200, cls: 'Novice+', look: 'modern', paint: '#e8402a', trim: '#c8c8d0', hoops: true },
  gardenia: { name: 'Gardenia GT Targa', year: 1987, top: 292, acc: 4.0, steer: 2.0, grip: .78, cyl: 12, tone: 3200, cls: 'Intermediate', look: 'wedge', paint: '#f4f0f4', trim: '#f070a0', targa: true },
  magnolia: { name: 'Magnolia V12 Barchetta', year: 1998, top: 305, acc: 4.2, steer: 1.95, grip: .84, cyl: 12, tone: 2600, cls: 'Intermediate+', look: 'barchetta', paint: '#1a3a9a', trim: '#e0e0e8', humps: true },
  girasole: { name: 'Girasole Hyper Spider', year: 2026, top: 330, acc: 3.0, steer: 1.85, grip: .8, cyl: 12, tone: 3600, cls: 'Expert', look: 'hyper', paint: '#f8c818', trim: '#2a2a30', leds: true, hybrid: true },
  primaveraB: { name: 'Primavera Bloom Edition', year: 1962, top: 253, acc: 5.5, steer: 2.45, grip: .96, cyl: 4, tone: 1500, cls: 'Novice', look: 'classic', paint: '#f8d8e8', trim: '#e8c060', fins: true, bloom: true },
  orchideaB: { name: 'Orchidea Bloom Edition', year: 2004, top: 280, acc: 4.2, steer: 2.3, grip: .89, cyl: 8, tone: 2300, cls: 'Novice+', look: 'modern', paint: '#ff5fa2', trim: '#e8c060', hoops: true, bloom: true }
};
OB.CAR_ORDER = ['primavera', 'orchidea', 'gardenia', 'magnolia', 'girasole', 'primaveraB', 'orchideaB'];
OB.PAINTS = {
  base: { name: 'Factory', colors: null },   // each car's own first paint, then these three
  baseExtra: ['#2a6ad0', '#f0f0f0', '#2a2a30'],
  pastel: { name: 'Pastel', colors: ['#a8d8f0', '#f8c8d8', '#c8f0c8', '#e8d8f8'] },
  metallic: { name: 'Metallic', colors: ['#a8b0c0', '#c89848', '#5a7a9a', '#8a2a3a'] },
  retro: { name: 'Retro', colors: ['#3a7a5a', '#d87a2a', '#e8d8a8', '#6a3a2a'] },
  neon: { name: 'Neon', colors: ['#3af0a0', '#ff3ac8', '#3ad8ff', '#d8ff3a'] }
};
OB.paintsFor = (car, profile) => {
  const c = OB.CARS[car], list = [c.paint].concat(OB.PAINTS.baseExtra);
  for (const k of ['pastel', 'metallic', 'retro', 'neon']) if (!profile || profile.unlocked.paints.includes(k)) list.push(...OB.PAINTS[k].colors);
  return list;
};

/* ---- traffic (PLAN §8.6): km/h range, half width (half roads), length (units), look ---- */
OB.TRAFFIC = {
  hatch: { name: 'hatchback', v: [95, 120], hw: .15, len: 380, h: 150, colors: ['#3a6ad0', '#e8e8e8', '#4aa050', '#e8b030', '#a83a6a'] },
  sedan: { name: 'sedan', v: [100, 130], hw: .16, len: 460, h: 150, colors: ['#5a5a6a', '#2a3a6a', '#8a8a90', '#6a2a2a'] },
  taxi: { name: 'taxi', v: [90, 115], hw: .16, len: 460, h: 160, colors: ['#f0c020'] },
  van: { name: 'delivery van', v: [85, 110], hw: .18, len: 520, h: 260, colors: ['#f0f0f0', '#e8e0c8'] },
  pickup: { name: 'pickup', v: [90, 115], hw: .17, len: 500, h: 180, colors: ['#c83a2a', '#3a5a8a', '#6a7a4a'] },
  camper: { name: 'camper van', v: [70, 95], hw: .19, len: 560, h: 280, colors: ['#e8d0a0', '#a8d0c8'] },
  bus: { name: 'tour bus', v: [70, 90], hw: .22, len: 1000, h: 330, colors: ['#e86a3a', '#3a9ad8'] },
  truck: { name: 'flower lorry', v: [65, 85], hw: .24, len: 1000, h: 340, colors: ['#4a8a4a', '#c8a03a'] },
  tractor: { name: 'tractor', v: [35, 50], hw: .2, len: 420, h: 260, colors: ['#3a9a3a', '#d83a2a'] },
  scooter: { name: 'scooter', v: [80, 100], hw: .08, len: 220, h: 170, colors: ['#e83a3a', '#7ad0e8', '#f0e8d8'] },
  icecream: { name: 'ice-cream truck', v: [60, 75], hw: .2, len: 560, h: 280, colors: ['#f8e0f0'] }
};

/* ---- Love in Bloom requests (PLAN §8.7): call-out, icon, what it counts, its window, thresholds
 * [Perfect, Great, Good] (fractions of n, counts or seconds), and how many objects ---- */
OB.REQUESTS = {
  pass: { callout: 'PASS {n} CARS!', icon: 'car', n: [6, 9], window: 15, measure: 'count', th: [1, .75, .5], traffic: 1.6 },
  drift: { callout: 'DRIFT FOR ME!', icon: 'drift', n: [6000, 9000], window: 16, measure: 'count', th: [1, .7, .4] },
  ribbons: { callout: 'CUT THE RIBBONS!', icon: 'ribbon', n: [4, 6], window: 16, measure: 'objects', th: [1, .7, .4] },
  balloons: { callout: 'POP THE BALLOONS!', icon: 'balloon', n: [10, 14], window: 14, measure: 'objects', th: [.9, .7, .45] },
  gnomes: { callout: 'BONK THE GNOMES!', icon: 'gnome', n: [8, 11], window: 14, measure: 'objects', th: [.9, .7, .45] },
  bees: { callout: 'DODGE THE BEES!', icon: 'bee', n: [6, 9], window: 14, measure: 'hits', th: [0, 1, 2] },
  cones: { callout: 'SLALOM THE CONES!', icon: 'cone', n: [8, 11], window: 14, measure: 'objects', th: [.9, .7, .45] },
  arches: { callout: 'THROUGH THE ARCHES!', icon: 'arch', n: [6, 8], window: 14, measure: 'objects', th: [1, .75, .5] },
  speed: { callout: 'KEEP IT OVER {v}!', icon: 'speed', n: [230, 250], window: 12, measure: 'share', th: [.95, .8, .6] },
  clean: { callout: 'NOT A SCRATCH!', icon: 'shield', n: [0, 0], window: 15, measure: 'hits', th: [0, 0, 1], traffic: 1.5 },
  draft: { callout: 'STAY IN THE DRAFT!', icon: 'wind', n: [6, 6], window: 16, measure: 'seconds', th: [1, .67, .34], traffic: 1.3 },
  close: { callout: 'CLOSE CALLS!', icon: 'zap', n: [5, 6], window: 15, measure: 'count', th: [1, .7, .4], traffic: 1.5 },
  bouquets: { callout: 'GRAB THE BOUQUETS!', icon: 'bouquet', n: [10, 13], window: 14, measure: 'objects', th: [.9, .7, .45] },
  photo: { callout: 'STOP FOR A PHOTO!', icon: 'camera', n: [1, 1], window: 18, measure: 'photo', th: [3, 2, 1] }
};
OB.REQUEST_TYPES = Object.keys(OB.REQUESTS);
OB.RATINGS = ['PERFECT', 'GREAT', 'GOOD', 'MISS'];
OB.RATING_PETALS = [5, 3, 2, 0];
OB.GRADES = [['AAA', .92], ['AA', .82], ['A', .7], ['B', .55], ['C', .4], ['D', .25], ['E', 0]];
OB.gradeOf = f => OB.GRADES.find(g => f >= g[1])[0];
OB.moodOfGrade = g => ['AAA', 'AA', 'A'].includes(g) ? 'bloom' : ['B', 'C'].includes(g) ? 'bud' : 'wilt';

/* ---- the Coast 2 Coast Tour (PLAN §8.8). th: thresholds for C, B, A, AAA (higher is better; for 'time' kinds lower
 * is better). Map positions are on the Tour map (0..1). ---- */
OB.MISSIONS = [
  { id: 'B1', giver: 'bruno', title: 'First Light Sprint', route: ['S1'], end: 'sprint', kind: 'sprint', clock: 52, th: [0, 5, 9, 13], unit: 's left', seeds: 150, map: [.86, .5],
    brief: ['A sprint to warm the tyres, champ!', 'Reach the arch before the clock runs out.'], rule: 'Reach the sprint arch. Time left decides the rank.' },
  { id: 'B2', giver: 'bruno', title: 'Drift Duel', route: ['S2'], end: 'sprint', kind: 'driftduel', rival: 'kiki', th: [0, .1, .25, .45], thText: ['Win', 'Win by 10%', 'Win by 25%', 'Win by 45%'], unit: 'margin', seeds: 200, unlock: 'bed:gardenia', after: 'B1', map: [.72, .32],
    brief: ['Kiki Rapido thinks she owns the bends.', 'Out-drift her by the end of the ridge!'], rule: 'More drift points than Kiki by the arch.' },
  { id: 'B3', giver: 'bruno', title: 'Draft Dash', route: ['S4'], end: 'sprint', kind: 'draftdash', rival: 'brambles', th: [0, .1, .25, .4], thText: ['Win', 'Win by 10%', 'Win by 25%', 'Win by 40%'], unit: 'margin', seeds: 250, after: 'B2', map: [.58, .2],
    brief: ['The Bramble brothers live in the slipstream.', 'Draft more than they do, then beat them to the arch.'], rule: 'Slipstream points plus finishing first.' },
  { id: 'B4', giver: 'bruno', title: 'Last One Wilts', route: ['S5', 'S8', 'S12'], end: 'goal', kind: 'knockout', rival: 'all', th: [2, 1, 1.5, 1.8], thText: ['Top 2', '1st', '1st by 2 s', '1st by 5 s'], unit: 'place', seeds: 300, unlock: 'bed:songLemon', after: 'B3', map: [.4, .35],
    brief: ['Five cars. Last at each checkpoint is out.', 'In my day we called this Tuesday!'], rule: 'The last car at each checkpoint wilts. Finish first.' },
  { id: 'M1', giver: 'marisol', title: 'Balloon Bonanza', route: ['S1'], end: 'sprint', kind: 'collect', obj: 'balloons', count: 40, th: [20, 26, 32, 38], unit: 'popped', seeds: 150, map: [.9, .7],
    brief: ['The florists\' fair lost its balloons!', 'Pop as many as you can for me. Hee!'], rule: 'Pop balloons all along the strand.' },
  { id: 'M2', giver: 'marisol', title: 'Gnome Patrol', route: ['S9'], end: 'sprint', kind: 'collect', obj: 'gnomes', count: 24, bees: true, th: [10, 14, 18, 22], unit: 'net', seeds: 200, unlock: 'bed:outfitMarisol', after: 'M1', map: [.42, .62],
    brief: ['Garden gnomes escaped onto the road!', 'Bonk them home. Mind the bees!'], rule: 'Bonk gnomes. A bee sting costs 2.' },
  { id: 'M3', giver: 'marisol', title: 'Bouquet Toss', route: ['S5'], end: 'sprint', kind: 'collect', obj: 'bouquets', count: 30, th: [14, 19, 24, 28], unit: 'caught', seeds: 250, unlock: 'bed:songMoon', after: 'M2', map: [.55, .5],
    brief: ['Every wedding on the lake is throwing bouquets.', 'Catch them all and I\'ll make the biggest one ever!'], rule: 'Catch bouquets around the lake.' },
  { id: 'V1', giver: 'vivi', title: 'Not a Scratch', route: ['S8'], end: 'sprint', kind: 'clean', th: [12, 6, 2, 0], thText: ['Par + 12 s', 'Par + 6 s', 'Par + 2 s', 'Under par'], unit: 's over par', seeds: 200, map: [.38, .48],
    brief: ['Darling, through the old town, please.', 'Quickly. And without a single scratch.'], rule: 'No contacts at all. Faster is better.' },
  { id: 'V2', giver: 'vivi', title: 'Fashionably Fast', route: ['S10'], end: 'sprint', kind: 'speedkeep', v: 240, th: [.7, .8, .88, .95], thText: ['70% of the way', '80%', '88%', '95%'], unit: 'share', seeds: 250, unlock: 'bed:magnolia', after: 'V1', map: [.3, .78],
    brief: ['I refuse to dawdle across a causeway.', 'Over 240 the whole way. In the wind, yes.'], rule: 'Stay over 240 km/h across the causeway.' },
  { id: 'V3', giver: 'vivi', title: 'Heartbreakers', route: ['S11'], end: 'goal', kind: 'heartbreak', rival: 'lustres', th: [1, 10, 18, 99], thText: ['Any petals left', '10 petals', '18 petals', 'Theirs at 0'], unit: 'petals', seeds: 300, unlock: 'bed:outfitVivi', after: 'V2', map: [.14, .25],
    brief: ['The Lustres. Gold outfits. At SUNSET.', 'Pass them and steal their petals. Every one.'], rule: 'Both couples start on 20 petals. Behind them you lose petals; passing steals 2.' },
  { id: 'J1', giver: 'juni', title: 'Close Calls', route: ['S3'], end: 'sprint', kind: 'count', what: 'nearmiss', th: [8, 12, 15, 20], unit: 'near misses', seeds: 150, map: [.7, .62],
    brief: ['Okay okay, I need the shot.', 'Near misses! Close as you dare!'], rule: 'Count near misses along the cliffs.' },
  { id: 'J2', giver: 'juni', title: 'Ribbon Cutter', route: ['S7'], end: 'sprint', kind: 'collect', obj: 'ribbons', count: 16, th: [8, 11, 14, 16], unit: 'ribbons', seeds: 200, unlock: 'bed:outfitJuni', after: 'J1', map: [.5, .12],
    brief: ['Wedding cars with ribbons between them!', 'Split \'em down the middle. For ART.'], rule: 'Drive through the gap between ribbon cars.' },
  { id: 'J3', giver: 'juni', title: 'The Perfect Shot', route: ['S6'], end: 'sprint', kind: 'photo3', th: [3, 6, 7, 9], unit: 'stars', seeds: 250, unlock: 'bed:mirror', after: 'J2', map: [.62, .82],
    brief: ['Three photo spots in the canyon.', 'Stop in the box, I click, we fly!'], rule: 'Three photo boxes: Perfect 3, Great 2, Good 1.' },
  { id: 'F', giver: 'bruno', title: 'Coast 2 Coast', route: null, end: 'goal', kind: 'love', th: [.55, .7, .82, .92], thText: ['Grade B', 'Grade A', 'Grade AA', 'Grade AAA'], unit: 'grade', seeds: 500, unlock: 'bed:girasole', needs: 9, map: [.12, .55],
    brief: ['Everyone is waiting at the far coast!', 'One day, one road, the whole island. Go, champ!'], rule: 'The full coast, forks open, Love in Bloom rules. Grade B or better.' }
];
OB.MISSION = {}; for (const m of OB.MISSIONS) OB.MISSION[m.id] = m;
OB.RANKS = ['C', 'B', 'A', 'AAA'];
OB.RANK_MULT = { C: 1, B: 1.25, A: 1.5, AAA: 2 };

/* ---- the Garage Garden (PLAN §8.9) ---- */
OB.BEDS = [
  { id: 'gardenia', name: 'Gardenia GT Targa', kind: 'car', cost: 600, needs: 'B2', icon: 'car' },
  { id: 'magnolia', name: 'Magnolia V12 Barchetta', kind: 'car', cost: 900, needs: 'V2', icon: 'car' },
  { id: 'girasole', name: 'Girasole Hyper Spider', kind: 'car', cost: 1500, needs: 'F', icon: 'car' },
  { id: 'primaveraB', name: 'Primavera Bloom Edition', kind: 'car', cost: 400, icon: 'car' },
  { id: 'orchideaB', name: 'Orchidea Bloom Edition', kind: 'car', cost: 500, icon: 'car' },
  { id: 'songLemon', name: 'Song: Lemon Drop Rush', kind: 'song', song: 5, cost: 300, needs: 'B4', icon: 'note' },
  { id: 'songMoon', name: 'Song: Moonflower', kind: 'song', song: 6, cost: 300, needs: 'M3', icon: 'note' },
  { id: 'pastel', name: 'Paint pack: Pastel', kind: 'paint', cost: 100, icon: 'paint' },
  { id: 'metallic', name: 'Paint pack: Metallic', kind: 'paint', cost: 100, icon: 'paint' },
  { id: 'retro', name: 'Paint pack: Retro', kind: 'paint', cost: 100, icon: 'paint' },
  { id: 'neon', name: 'Paint pack: Neon', kind: 'paint', cost: 100, icon: 'paint' },
  { id: 'outfitMarisol', name: 'Marisol: Picnic Gingham', kind: 'outfit', who: 'marisol', cost: 150, needs: 'M2', icon: 'dress' },
  { id: 'outfitVivi', name: 'Vivi: Gala Gown', kind: 'outfit', who: 'vivi', cost: 150, needs: 'V3', icon: 'dress' },
  { id: 'outfitJuni', name: 'Juni: Rally Suit', kind: 'outfit', who: 'juni', cost: 150, needs: 'J2', icon: 'dress' },
  { id: 'mirror', name: 'Mirror Roads', kind: 'mirror', cost: 800, needs: 'J3', icon: 'mirror' }
];

/* ---- the radio (PLAN §8.10): stations in dial order; the songs are in 01-data-music.js ---- */
OB.STATIONS = [
  { freq: '88.6', name: 'PETAL FM', song: 'sunburst' }, { freq: '91.2', name: 'SUN FM', song: 'coastline' }, { freq: '94.8', name: 'SHORE FM', song: 'shuffle' },
  { freq: '99.1', name: 'VESPA FM', song: 'vespa' }, { freq: '103.5', name: 'PASTEL FM', song: 'pastel' }, { freq: '106.3', name: 'ZEST FM', song: 'lemon', locked: 'songLemon' },
  { freq: '108.8', name: 'MOON FM', song: 'moonflower', locked: 'songMoon' }
];
})();
