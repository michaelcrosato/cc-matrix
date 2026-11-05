// OutBloom's data: the 15 stages of Bellafiore, the five goals, the Fioretti cars, the traffic, the Love in Bloom
// requests, the passengers, every line of text, the radio songs and the About pages. Plain objects; the sim reads them.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});

/* ---- the stages. layout: [segments, curve (+ bends right, −6..6), hill (units up, − down), tag?]. Tags: 'tunnel',
 *      'gust' (a crosswind), 'lift' (a hump: air), 'bridge' (rails both sides), 'seawall', 'span:palms', 'gallery' ---- */
OB.STAGES = [
  { id: 'S1', par: 73.4, name: 'Sunrise Strand', row: 1, col: 1, kit: 'beach', sky: 'ocean', time: 'dawn', lanes: 3, diff: 1,
    grass: ['#e8d8a0', '#dccb90'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [56, 2, 0], [32, 0, 0], [56, -3, 0], [48, 0, 800], [40, 3, -800], [72, 0, 0, 'span:palms'], [48, -2, 0], [40, 4, 0, 'seawall'], [64, 0, 1200], [56, 0, -1200], [48, -3, 0], [32, 0, 0]],
    traffic: { hatch: 3, van: 1, icecream: .4, bus: .6 },
    slots: [{ at: .18, type: 'balloons', n: 12 }, { at: .62, type: 'pass', n: 8 }],
    landmarks: ['ferris', 'huts', 'lifeguard'] },
  { id: 'S2', par: 71, name: 'Lavender Ridge', row: 2, col: 1, kit: 'fields', sky: 'day', time: 'morning', lanes: 3, diff: 1,
    grass: ['#8a7ac0', '#7e6eb4'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [64, 2.5, 0], [48, 0, 1500], [48, 0, -1500], [56, -2.5, 1500], [48, 0, -1500], [48, 3, 1500], [48, -3, -1500], [64, 4, 0], [56, -2, 1500], [56, 0, -1500], [64, 2, 0], [48, 0, 0]],
    traffic: { hatch: 2, van: 2, pickup: 1, camper: 1 },
    slots: [{ at: .25, type: 'cones', n: 8 }, { at: .65, type: 'drift', n: 2 }],
    landmarks: ['farmhouse', 'hives'] },
  { id: 'S3', par: 69.4, name: 'Lemon Cliffs', row: 2, col: 2, kit: 'cliffs', sky: 'day', time: 'morning', lanes: 2, diff: 3,
    grass: ['#c8b890', '#bcaa80'], road: ['#5a5a5a', '#555555'],
    layout: [[150, 0, 0], [48, 4, 0], [56, -4, 0], [48, 0, 0, 'tunnel'], [48, 5, 800], [48, -5, -800], [56, 4, 0], [48, -4, 0, 'gallery'], [48, 6, 0], [56, -6, 0], [48, 0, 0]],
    traffic: { scooter: 2, hatch: 2, van: 1, bus: .5 },
    slots: [{ at: .2, type: 'cones', n: 10 }, { at: .6, type: 'close', n: 5 }],
    landmarks: ['village', 'chapel'] },
  { id: 'S4', par: 75.3, name: 'Sunflower Prairie', row: 3, col: 1, kit: 'fields', sky: 'day', time: 'late morning', lanes: 4, diff: 1,
    grass: ['#e0b020', '#d4a418'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [160, 0, 0], [48, 1.5, 0], [64, -2, 0], [160, 0, 0], [48, 2, 0], [48, -1, 0], [56, 0, 0]],
    traffic: { tractor: 1.5, pickup: 2, sedan: 2, truck: 1 },
    slots: [{ at: .2, type: 'draft', n: 6 }, { at: .6, type: 'speed', n: 250 }],
    landmarks: ['barns', 'turbines', 'sunflower'] },
  { id: 'S5', par: 72, name: 'Lake Serenata', row: 3, col: 2, kit: 'lake', sky: 'day', time: 'noon', lanes: 3, diff: 2,
    grass: ['#5a9a5a', '#4e8c4e'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [64, 2, 0], [48, -2, 0], [88, 0, 0, 'bridge'], [48, 3, 0], [64, -4, 0], [64, 0, 0], [72, 2, 0], [64, -3, 0], [48, 0, 0]],
    traffic: { sedan: 2, camper: 2, van: 1, bus: .5 },
    slots: [{ at: .22, type: 'arches', n: 7 }, { at: .66, type: 'arches', n: 12 }],
    landmarks: ['steamer', 'boathouse', 'waterfall'] },
  { id: 'S6', par: 78.1, name: 'Rosa Canyon', row: 3, col: 3, kit: 'canyon', sky: 'desert', time: 'noon', lanes: 2, diff: 4,
    grass: ['#d88a50', '#c87c44'], road: ['#6a6070', '#625868'],
    layout: [[150, 0, 0], [56, 4, 0], [64, -5, 4000], [64, 0, -4000], [56, 5, 0, 'tunnel'], [48, -6, -4000], [48, 0, 4000], [48, 6, 0], [72, -5, 0], [48, 4, -4000], [56, 0, 4000], [48, 0, 0]],
    traffic: { pickup: 2, truck: 1, camper: 1 },
    slots: [{ at: .3, type: 'gnomes', n: 10 }, { at: .7, type: 'drift', n: 2 }],
    landmarks: ['mesa', 'arch', 'stand'] },
  { id: 'S7', par: 81.3, name: 'Cherry Pass', row: 4, col: 1, kit: 'alpine', sky: 'day', time: 'afternoon', lanes: 3, diff: 3,
    grass: ['#e8e8f0', '#dcdce8'], road: ['#5e5e66', '#5a5a62'],
    layout: [[150, 0, 0], [80, 0, 3000], [48, 6, 0], [40, -6, 0], [64, 0, 3000], [48, 5, 0], [48, -5, -3000], [64, 0, 0, 'tunnel'], [48, 6, -2000], [64, -4, 0], [56, 0, -2000], [48, 0, 0]],
    traffic: { sedan: 2, camper: 1, bus: 1, van: 1 },
    slots: [{ at: .25, type: 'drift', n: 2 }, { at: .6, type: 'clean', n: 0 }],
    landmarks: ['peaks', 'chalet', 'cherry'] },
  { id: 'S8', par: 75.8, name: 'Old Town Fiorenza', row: 4, col: 2, kit: 'town', sky: 'dusk', time: 'afternoon', lanes: 3, diff: 3,
    grass: ['#b8a890', '#aa9c84'], road: ['#7a7470', '#726c68'],
    layout: [[150, 0, 0], [56, 2, 0], [40, -6, 0], [32, 6, 0], [48, 0, 0, 'tunnel'], [56, -5, 0], [32, 5, 0], [48, 0, 0], [48, -3, 0], [64, 3, 0], [48, 0, 0], [56, -4, 0], [48, 0, 0]],
    traffic: { taxi: 2, scooter: 3, van: 1, bus: 1 },
    slots: [{ at: .35, type: 'balloons', n: 10 }, { at: .7, type: 'pass', n: 10 }],
    landmarks: ['dome', 'market', 'fountain'] },
  { id: 'S9', par: 71.1, name: 'Vineyard Way', row: 4, col: 3, kit: 'vineyard', sky: 'dusk', time: 'late afternoon', lanes: 3, diff: 3,
    grass: ['#7a9a4a', '#6e8e42'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [64, 3, 2000], [64, -3, -2000], [56, 4, 2000], [56, -4, -2000], [72, 0, 0], [48, 5, 0], [64, -3, 1500], [56, 0, -1500], [64, 3, 0], [48, 0, 0]],
    traffic: { tractor: 1, pickup: 2, van: 1, sedan: 1 },
    slots: [{ at: .2, type: 'gnomes', n: 10 }, { at: .62, type: 'arches', n: 5 }],
    landmarks: ['castle', 'villa', 'barrels'] },
  { id: 'S10', par: 77, name: 'Seafoam Causeway', row: 4, col: 4, kit: 'lagoon', sky: 'ocean', time: 'late afternoon', lanes: 2, diff: 5,
    grass: ['#7ac8c0', '#6cbcb4'], road: ['#686868', '#626262'],
    layout: [[150, 0, 0], [96, 0, 0, 'gust'], [72, 1, 0], [64, -1, 0, 'gust'], [96, 0, 0, 'gust'], [48, 0, 1800, 'lift'], [48, 0, -1800], [64, 2, 0, 'gust'], [72, -2, 0], [48, 0, 0]],
    traffic: { sedan: 2, truck: 2, camper: 1 },
    slots: [{ at: .25, type: 'balloons', n: 12 }, { at: .65, type: 'speed', n: 240 }],
    landmarks: ['flamingos', 'saltpyramid', 'liftbridge'] },
  { id: 'S11', par: 56.1, name: 'Golden Bay', row: 5, col: 1, kit: 'beach', sky: 'dusk', time: 'sunset', lanes: 3, diff: 1, goal: 'A',
    grass: ['#f0c890', '#e8bc84'], road: ['#6a6a6a', '#646464'],
    layout: [[150, 0, 0], [72, -2, 0], [64, 0, 0], [64, 2, 0], [72, 0, 0], [56, -2, 0], [64, 0, 0], [48, 1, 0], [64, 0, 0]],
    traffic: { hatch: 2, icecream: .5, bus: 1, van: 1 },
    slots: [{ at: .25, type: 'arches', n: 12 }, { at: .62, type: 'balloons', n: 14 }],
    landmarks: ['lanterns', 'sailboats', 'stage'] },
  { id: 'S12', par: 74.4, name: 'Orchid Jungle', row: 5, col: 2, kit: 'jungle', sky: 'forest', time: 'sunset', lanes: 3, diff: 3, goal: 'B',
    grass: ['#3a8a4a', '#348042'], road: ['#5e5a52', '#58544c'],
    layout: [[150, 0, 0], [64, 3, 0], [56, -4, 0], [48, 0, 0, 'bridge'], [64, 4, 0], [64, -3, 0], [72, 5, 0], [56, -5, 0], [64, 0, 0], [56, 3, 0], [48, 0, 0]],
    traffic: { pickup: 2, camper: 1, van: 1 },
    slots: [{ at: .22, type: 'cones', n: 8 }, { at: .6, type: 'cones', n: 8 }],
    landmarks: ['waterfall', 'ruins', 'orchid'] },
  { id: 'S13', par: 84.6, name: 'Moonlit Riviera', row: 5, col: 3, kit: 'nightcity', sky: 'city-night', time: 'night', lanes: 4, diff: 3, goal: 'C',
    grass: ['#2a2a3a', '#24243a'], road: ['#4a4a58', '#444452'],
    layout: [[150, 0, 0], [72, -2, 0], [64, 2, 0, 'tunnel'], [56, -3, 0], [64, 0, 0], [56, 3, 0, 'tunnel'], [64, -2, 0], [72, 0, 0], [56, 2, 0], [48, 0, 0]],
    traffic: { taxi: 2, sedan: 3, bus: 1, scooter: 2 },
    slots: [{ at: .3, type: 'close', n: 6 }, { at: .65, type: 'arches', n: 6 }],
    landmarks: ['casino', 'yachts', 'funicular'] },
  { id: 'S14', par: 66.7, name: 'Starlight Desert', row: 5, col: 4, kit: 'nightdesert', sky: 'night', time: 'night', lanes: 3, diff: 4, goal: 'D',
    grass: ['#c8a070', '#bc9466'], road: ['#5a5058', '#544a52'],
    layout: [[150, 0, 0], [120, 0, 1500], [64, 0, -1500], [96, 0, 2500], [72, 5, -2500], [72, -5, 0], [96, 0, 2000], [64, 0, -2000], [48, 0, 0]],
    traffic: { truck: 2, pickup: 2, camper: 1 },
    slots: [{ at: .25, type: 'draft', n: 6 }, { at: .6, type: 'cones', n: 12 }],
    landmarks: ['dish', 'motel', 'nightcacti'] },
  { id: 'S15', par: 68.5, name: 'Aurora Highlands', row: 5, col: 5, kit: 'highlands', sky: 'castle-night', time: 'twilight', lanes: 2, diff: 5, goal: 'E',
    grass: ['#7a6a9a', '#6e5e8e'], road: ['#5a5660', '#55515a'],
    layout: [[150, 0, 0], [48, 5, 800], [48, -5, -800], [56, 6, 0], [48, -6, 0], [64, 0, 1200], [48, 0, -1200], [56, 5, 0], [48, -5, 0, 'bridge'], [64, 0, 0], [48, 0, 0]],
    traffic: { sedan: 1, camper: 1, truck: 1, pickup: 1 },
    slots: [{ at: .2, type: 'drift', n: 2 }, { at: .58, type: 'clean', n: 0 }],
    landmarks: ['aurora', 'stones', 'castleruin'] },
];
// the pyramid: a stage forks to the stage below it on the left and below-right on the right
OB.stageAt = (row, col) => OB.STAGES.find(s => s.row === row && s.col === col);
OB.nextStages = s => s.goal ? [] : [OB.stageAt(s.row + 1, s.col), OB.stageAt(s.row + 1, s.col + 1)];
OB.GOALS = {
  A: { name: 'Lantern Pier', place: 'Porto Lucciola', stage: 'S11', sky: 'dusk' },
  B: { name: 'Petal Falls Chapel', place: 'Petal Falls', stage: 'S12', sky: 'forest' },
  C: { name: 'Grand Hotel Vespera', place: 'Vespera', stage: 'S13', sky: 'city-night' },
  D: { name: 'Stargazer Observatory', place: 'Stellaria', stage: 'S14', sky: 'night' },
  E: { name: 'Finisterra Lighthouse', place: 'Finisterra', stage: 'S15', sky: 'castle-night' },
};
// the three moods' lines: the arrival, the passenger's line, the caption, and the title. Passenger lines are keyed by mood.
OB.ENDINGS = {
  A: { place: 'Lantern Pier', props: 'lanterns', sky: 'dusk',
    Bloom: { arrive: 'A thousand lanterns rise over the pier. The crowd cheers.', title: 'BLOOM: A Star Arrives', lines: { marisol: 'Eee! A thousand lanterns, and one just for us!', vivi: 'Darling, the whole pier is looking at us. Divine.', juni: 'Lanterns! Get the shot, get the shot, GET IT!' } },
    Bud: { arrive: 'You release one lantern together, and the wind takes it out to sea.', title: 'BUD: Lantern Wishes', lines: { marisol: 'Next time we race to the lanterns, promise!', vivi: 'Adequate. Almost sentimental, which I shall deny.', juni: 'Okay, that was actually kinda sweet. Don\'t tell anyone.' } },
    Wilt: { arrive: 'The lanterns are already gone. She sulks on the pier steps.', title: 'WILT: Empty Pier', lines: { marisol: 'You owe me gelato. A big one, with the good cherries.', vivi: 'Nothing left but a moth, darling. Take me home.', juni: 'Boooring. The lanterns left, and so did my interest.' } } },
  B: { place: 'Petal Falls Chapel', props: 'bouquet', sky: 'forest',
    Bloom: { arrive: 'You crash a wedding by accident. The bride catches the bouquet.', title: 'BLOOM: The Bouquet Thief', lines: { marisol: 'Oh! She threw it right at you! Ha ha!', vivi: 'Don\'t get any ideas. Yet.', juni: 'Okay, that\'s the best scandal of the year, babe.' } },
    Bud: { arrive: 'The guests wave you in for cake and a dance.', title: 'BUD: Wedding Crasher', lines: { marisol: 'Pass the cake! Oh, the cake is pink!', vivi: 'The cake is dreadful, and I ate two slices.', juni: 'Free cake! Free dancing! Free everything!' } },
    Wilt: { arrive: 'Soaked by the waterfall spray, you both run off laughing.', title: 'WILT: Soaked to the Bone', lines: { marisol: 'My hair! It is ruined! I love it anyway.', vivi: 'My scarf is a sponge. A divine, ruined sponge.', juni: 'Soaked, bruised, and totally worth it. Yes.' } } },
  C: { place: 'Grand Hotel Vespera', props: 'carpet', sky: 'city-night',
    Bloom: { arrive: 'Red carpet, flashbulbs, and fireworks over the bay.', title: 'BLOOM: A Star Arrives', lines: { marisol: 'Wave, wave! They are waving at us!', vivi: 'Darling, the flashbulbs. Smile, the world is watching.', juni: 'Flashbulbs! Give me the fireworks, give me EVERYTHING!' } },
    Bud: { arrive: 'The valet takes the keys with a bow and a wink.', title: 'BUD: Valet Parking', lines: { marisol: 'He bowed! He BOWED at us! Ha!', vivi: 'Adequate. Almost fabulous. Take a bow, driver.', juni: 'The valet is so cute. Okay, not that cute.' } },
    Wilt: { arrive: 'The valet refuses to park "that dusty thing". You eat at the noodle cart.', title: 'WILT: Noodles Under the Neon', lines: { marisol: 'Noodles! Ooh, they are lovely noodles!', vivi: 'I secretly love it. Do not tell anyone I said so.', juni: 'Noodle cart! Best food in the whole coast, honestly.' } } },
  D: { place: 'Stargazer Observatory', props: 'dome', sky: 'night',
    Bloom: { arrive: 'The dome opens to a meteor shower. You both make a wish.', title: 'BLOOM: Shooting Stars', lines: { marisol: 'I wished for a second day exactly like this one!', vivi: 'Stars, darling. Honestly, the one thing I cannot buy.', juni: 'SHOOTING STARS! Did you get it? Did you get it?!' } },
    Bud: { arrive: 'One shooting star streaks over the observatory.', title: 'BUD: One Wish', lines: { marisol: 'Did you see it? Quick, make a wish!', vivi: 'I wished for a better hairstyle. It is a long shot.', juni: 'One star is still a star. Make it count, babe.' } },
    Wilt: { arrive: 'Clouds roll in. The astronomer offers you both cocoa.', title: 'WILT: Cocoa and Clouds', lines: { marisol: 'Cocoa? In this cold? Yes please, professor!', vivi: 'Cocoa will do. Under protest.', juni: 'Clouds ruined the shot, but the cocoa saved the night.' } } },
  E: { place: 'Finisterra Lighthouse', props: 'lighthouse', sky: 'castle-night',
    Bloom: { arrive: 'The green flash at sunset. Her hair is wild in the wind.', title: 'BLOOM: Green Flash', lines: { marisol: 'Best. Day. Ever. Say it with me!', vivi: 'Best. Day. Ever. I shall allow it.', juni: 'Best. Day. Ever. Okay, my camera is crying.' } },
    Bud: { arrive: 'The last sliver of sun slips into the sea.', title: 'BUD: Last Sliver', lines: { marisol: 'That was pretty. Let us do it again tomorrow!', vivi: 'Okay, that was pretty. Do not tell Bruno.', juni: 'Pretty good, honestly. Pretty pretty good.' } },
    Wilt: { arrive: 'The sun is gone and the wind is cold, so you share your jacket.', title: 'WILT: Sharing the Jacket', lines: { marisol: 'Brrr! Come here, closer, it is warmer closer.', vivi: 'Fine. Share. But only because you are cold.', juni: 'Cold, windy, and we are sharing. Okay, this is cute.' } } },
};
OB.ENDING_CAPTION = g => `GOAL ${g} • ${OB.GOALS[g].name.toUpperCase()}`;
/** the ending of a goal and mood: its place, its arrival line, its title, and each passenger's line */
OB.ending = (g, mood) => OB.ENDINGS[g] && OB.ENDINGS[g][mood];

/* ---- cars: the Fioretti line (original; no real maker). top km/h, 0-100 s, steer, drift grip, weight, cylinders ---- */
OB.CARS = [
  { id: 'primavera', name: 'Primavera 300 Spider', year: 1962, class: 'Novice', top: 245, zero: 5.8, steer: 2.35, grip: .92, weight: .85, cyl: 4, paints: ['#f4eedc', '#e8c870', '#a0d8b0', '#f0a0b0'], body: 'round', free: true },
  { id: 'orchidea', name: 'Orchidea Spider', year: 2004, class: 'Novice+', top: 272, zero: 4.5, steer: 2.20, grip: .85, weight: 1, cyl: 8, paints: ['#e0503a', '#3a7ad8', '#f0c020', '#a03070'], body: 'wedge', free: true },
  { id: 'gardenia', name: 'Gardenia GT Targa', year: 1987, class: 'Intermediate', top: 292, zero: 4.0, steer: 2.00, grip: .78, weight: 1.05, cyl: 6, paints: ['#f4f0f0', '#ff80b0', '#80c0ff', '#ffd0a0'], body: 'targa', bed: 600 },
  { id: 'magnolia', name: 'Magnolia V12 Barchetta', year: 1998, class: 'Intermediate+', top: 305, zero: 4.2, steer: 1.95, grip: .84, weight: 1.2, cyl: 12, paints: ['#1a3a7a', '#a02040', '#2a7a50', '#e8e0d0'], body: 'barchetta', bed: 900 },
  { id: 'girasole', name: 'Girasole Hyper Spider', year: 2026, class: 'Expert', top: 330, zero: 3.0, steer: 1.85, grip: .80, weight: 1.1, cyl: 12, paints: ['#ffd030', '#ff9020', '#1a1a20', '#f8f8f8'], body: 'hyper', bed: 1500 },
];
/** the car's physics numbers: the 0-100 time gives the start acceleration A0 (km/h per second) */
/** the drag: quadratic, so the top speed is where the pull falls to it (the plan's drag, with its base removed) */
OB.DRAG_QUAD = 1.2e-5;
/** the time to 100 km/h for an acceleration A0 (km/h a second) to a top speed vt, by a short simulation */
OB.zeroTime = (A0, vt) => {
  let v = 0, t = 0;
  while (v < 100 && t < 30) { const dv = A0 * (1 - Math.pow(v / vt, 1.6)) - OB.DRAG_QUAD * v * v; v += dv * .01; t += .01; if (v < 0) v = 0; }
  return t;
};
/** the car's numbers: its acceleration is the one that reaches 100 km/h in its rated 0-100 time (bisected) */
OB.carStats = c => {
  let lo = 5, hi = 200;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (OB.zeroTime(mid, c.top) > c.zero) lo = mid; else hi = mid; }
  return { vtop: c.top, A0: (lo + hi) / 2, steer: c.steer, grip: c.grip, weight: c.weight };
};
OB.CAR_ORDER = OB.CARS.map(c => c.id);

/* ---- traffic (plan §8.6). half-width in half-roads, speed range in km/h, shape, length in segments ---- */
OB.TRAFFIC = {
  hatch: { name: 'hatchback', v: [95, 120], w: .18, cols: ['#3060d0', '#e0e0e0', '#30a050', '#e0b020', '#a03070'], body: 'car', len: 1 },
  sedan: { name: 'sedan', v: [100, 130], w: .20, cols: ['#607080', '#d0d0d8', '#8a3020', '#2a4a60'], body: 'car', len: 1 },
  taxi: { name: 'taxi', v: [90, 115], w: .20, cols: ['#f0c020'], body: 'car', len: 1, roof: true },
  van: { name: 'delivery van', v: [85, 110], w: .22, cols: ['#f4f0e8', '#70b8e0'], body: 'van', len: 1 },
  pickup: { name: 'pickup', v: [90, 115], w: .21, cols: ['#8a5a3a', '#c8c0b0', '#3a5a3a'], body: 'pickup', len: 1 },
  camper: { name: 'camper van', v: [70, 95], w: .23, cols: ['#e8a040', '#70c0a0'], body: 'van', len: 1, board: true },
  bus: { name: 'tour bus', v: [70, 90], w: .27, cols: ['#e05050', '#f0f0f0'], body: 'bus', len: 2 },
  truck: { name: 'flower lorry', v: [65, 85], w: .30, cols: ['#f8f8f8', '#e8a0c0'], body: 'truck', len: 2 },
  tractor: { name: 'tractor', v: [35, 50], w: .24, cols: ['#3a9a3a', '#c8c040'], body: 'tractor', len: 1 },
  scooter: { name: 'scooter', v: [80, 100], w: .10, cols: ['#e05080', '#40a0e0'], body: 'scooter', len: 1 },
  icecream: { name: 'ice-cream van', v: [60, 75], w: .24, cols: ['#ffffff', '#ff8ac0'], body: 'van', len: 1, jingle: true },
};

/* ---- Love in Bloom requests (plan §8.7). Implemented types; each has its call-out, the card icon, and the rule ---- */
OB.REQUESTS = {
  balloons: { call: 'POP THE BALLOONS!', icon: 'balloon', count: 'n', measure: 'popped' },
  bees: { call: 'DODGE THE BEES!', icon: 'bee', count: 'n', measure: 'stings' },
  ribbons: { call: 'CUT THE RIBBONS!', icon: 'ribbon', count: 'n', measure: 'cut' },
  bouquets: { call: 'GRAB THE BOUQUETS!', icon: 'bouquet', count: 'n', measure: 'collected' },
  photo: { call: 'STOP FOR A PHOTO!', icon: 'photo', count: 'n', measure: 'photo' },
  gnomes: { call: 'BONK THE GNOMES!', icon: 'gnome', count: 'n', measure: 'bonked' },
  cones: { call: 'SLALOM THE CONES!', icon: 'cone', count: 'n', measure: 'slalom' },
  arches: { call: 'THROUGH THE ARCHES!', icon: 'arch', count: 'n', measure: 'passed' },
  pass: { call: 'PASS {n} CARS!', icon: 'pass', count: 'n', measure: 'overtakes' },
  close: { call: 'CLOSE CALLS!', icon: 'close', count: 'n', measure: 'nearmisses' },
  speed: { call: 'KEEP IT OVER {n}!', icon: 'speed', count: 'n', measure: 'speed' },
  clean: { call: 'NOT A SCRATCH!', icon: 'clean', count: 'n', measure: 'contacts' },
  draft: { call: 'STAY IN THE DRAFT!', icon: 'draft', count: 'n', measure: 'draft' },
  drift: { call: 'DRIFT FOR ME!', icon: 'drift', count: 'n', measure: 'drift' },
};
/** the request's grade thresholds: [perfect, great, good] (the rules of plan §8.7, in the same order) */
OB.REQUEST_RULES = {
  balloons: [.9, .7, .45], gnomes: [.9, .7, .45], cones: [.9, .7, .45], arches: [1, .75, .5], bouquets: [.9, .7, .45], ribbons: [1, .7, .4], bees: [0, 1, 2], photo: [1, 1, 1],
  pass: [1, .75, .5], close: [1, .7, .4], speed: [.95, .8, .6], clean: [0, 0, 1], draft: [6, 4, 2], drift: [1, .7, .4],
};

/* ---- the passengers (plan §8.5). Each loves some requests (×1.2 petals) and speaks in her own voice ---- */
OB.CAST = {
  marisol: { hairStyle: 'long', outfit: 'robe', name: 'Marisol Fontaine', bio: 'Florist. Sunny, giggly, full of sunflower clips.', loves: ['balloons', 'gnomes', 'arches', 'pass'], f0: 290, rate: 13, wave: 'pulse', fill: '#ffb3d1', hair: '#7a3a20' },
  vivi: { hairStyle: 'short', outfit: 'coat', name: 'Vivienne Montclair', bio: 'Socialite. Dramatic, demanding, secretly soft.', loves: ['clean', 'speed', 'pass', 'arches'], f0: 230, rate: 11, wave: 'saw', fill: '#2a2a3a', hair: '#141414' },
  juni: { hairStyle: 'spiky', outfit: 'tunic', hat: 'cap', name: 'Juniper Park', bio: 'Stunt photographer. Breathless slang, pink spiky hair.', loves: ['close', 'drift', 'draft', 'cones'], f0: 320, rate: 15, wave: 'pulse', fill: '#ff7ab8', hair: '#e04a9a' },
};
OB.CAST_ORDER = ['marisol', 'vivi', 'juni'];

/* ---- the lines (plan §8.11). Each reaction has 4 variants; the seed lines are the first of each. ---- */
OB.LINES = {
  marisol: {
    start: ['Coast to coast? With you? Let\'s GO!', 'Oh! The sun! Hold my flower and let\'s go!', 'Sunflowers and sea, my favourite day!', 'Don\'t you dare slow down for the sunrise!'],
    balloons: ['Ooh, balloons! Pop them all for me!', 'Pink ones! Get the pink ones!', 'Yes, yes, that big one!', 'Bonus points for the heart-shaped!'],
    perfect: ['Eee! You\'re amazing!', 'Again, again! Do it again!', 'That was perfect, I\'m going to cry!', 'Full bloom, champ!'],
    great: ['Lovely! Almost perfect!', 'That\'s my driver!', 'So close to perfect, I love it!'],
    good: ['Okay! Not bad at all!', 'We\'ll get the rest next time.'],
    miss: ['Aww… you missed so many.', 'Oh no, my poor balloons!', 'Next one, promise?'],
    crash: ['Kyaaa! My hair!', 'My sunflower clip! Where is it?!', 'Hee! Okay, that was a bump.'],
    near: ['Hee! That was close!', 'Ooh, did we almost kiss that bus?'],
    air: ['Hee! We\'re flying!', 'Oh! Up we go!'],
    left: ['Left! I want to smell the lavender!', 'Left, left! The fields are calling!'],
    right: ['Right! I want to see the cliffs!', 'Right! Ooh, the lemons!'],
    checkpoint: ['Lavender! Smell that?', 'Look, the next part is even prettier!', 'Keep it going, champ!'],
    low: ['Hurry, the sun\'s slipping!', 'We\'re running out of day!'],
    goal: ['We made it! Coast to coast!', 'Did you see the sea?!'],
    fail: ['Aww, that one got away.', 'Hmm, not my favourite. Next!'],
  },
  vivi: {
    start: ['Darling, do try not to dent anything.', 'Drive as if the car were a diamond.', 'Faster, but elegantly. Off you go.', 'Oh, I am so bored already. Go!'],
    speed: ['Faster. I refuse to arrive second.', 'Faster, darling! The sun is waiting!', 'Hmm, more speed. I like it.'],
    pass: ['Yes! Pass them all, darling!', 'Look at them eat our dust! Divine!'],
    perfect: ['Now THAT is how one arrives!', 'Gorgeous. Simply gorgeous.', 'Bravo, darling!'],
    great: ['Hmm. Adequate. Barely.', 'Passable, I suppose.', 'Not bad. Not bad at all.'],
    good: ['Well. It was something.', 'I expected worse. Honestly.'],
    miss: ['Dreadful. Truly dreadful.', 'Do pay attention, darling.'],
    crash: ['Was that a… car? Unacceptable.', 'My scarf! My scarf!', 'Darling, we are not amused.'],
    near: ['Ooh, scandalous!', 'Everyone saw that. Divine!'],
    air: ['Oh my! We are airborne! Lovely!'],
    left: ['Left, the lavender. How very rustic.', 'Left. Fine. Sigh.'],
    right: ['Right, the cliffs. Everyone who matters goes that way.', 'Right! Darling, the view!'],
    checkpoint: ['Adequate progress, darling.', 'Keep it up, I am watching.'],
    low: ['The sun is setting on my patience, darling.', 'Time, darling. Time!'],
    goal: ['We have arrived. Naturally.', 'Darling, I forgive you. Just this once.'],
    fail: ['Shall we talk about it?', 'I shall pretend that did not happen.'],
  },
  juni: {
    start: ['Okay okay okay, get me some ACTION!', 'Let\'s GO, let\'s go, let\'s GO!', 'I can hear the waves! Floor it!', 'Ready, set, ACTION!'],
    close: ['Closer! Closer! I need the shot!', 'Ooh, closer! Like sardines!', 'Get in there! Get in there!'],
    drift: ['Drift it! Drift it! DRIFT!', 'Smoke! I want smoke!', 'Ha! Slide, baby, slide!'],
    perfect: ['Best shot of my LIFE!', 'Give me another one, that was SICK!', 'Yes! Yes! Yes! Chef\'s kiss!'],
    great: ['Solid! Almost too spicy.', 'Nice one, babe!', 'Good energy, good energy!'],
    good: ['Decent! Let\'s spice it up.', 'Okay, that\'ll do.'],
    miss: ['Boooring. Give me danger!', 'Oof. Flat. Next!'],
    crash: ['Ouch! Okay, that was a LOT of danger.', 'Whoa, my camera! It\'s fine. It\'s fine!'],
    near: ['WHOA, did you see that?!', 'Okay that was insane. Again!'],
    air: ['We\'re FLYING!', 'Airtime! Yes!'],
    left: ['Left! Left! The lavender is back there!', 'Left, grab the scenic route!'],
    right: ['Right! Cliffs, baby, cliffs!', 'Right! Tunnel vibes!'],
    checkpoint: ['Ooh, a new bit! Let\'s GO!', 'More road, more road!'],
    low: ['The sun is almost gone, no time!', 'Clock is ticking!'],
    goal: ['Goal! We did it! Give me the high-five!', 'Coast to coast, baby!'],
    fail: ['Meh. Next, next!', 'That one\'s done. Onwards.'],
  },
  bruno: {
    start: ['Morning, champ! The west coast is waiting!', 'Ho ho! Let\'s see some flowers fly!', 'Bruno says: go fast, but not too fast!'],
    checkpoint: ['Look at that, champ! Keep it going!', 'Bravo! That is a time-extender, in my day!'],
    goal: ['Mamma mia, what a finish!', 'Ho ho! That is how it is done!'],
    fail: ['Again, champ! Even I spun out in \'79.', 'Ha! Do not give up!'],
  },
  announcer: {
    checkpoint: ['CHECKPOINT!'], time: ['TIME EXTENDED!'], goal: ['GOAL!'], full: ['FULL BLOOM!'],
    perfect: ['PERFECT START!'], record: ['NEW RECORD!'],
  },
};
/** a line from a pool, chosen by a seeded stream so one event always says the same line */
OB.line = (who, key, seed = 0) => {
  const pool = (OB.LINES[who] || {})[key];
  if (!pool || !pool.length) return '';
  return pool[Math.abs(seed | 0) % pool.length];
};

/* ---- the radio: the stations in dial order (plan §8.10), and the songs they play ---- */
OB.STATIONS = [
  { freq: '88.6', name: 'PETAL FM', song: 'sunburst' },
  { freq: '91.2', name: 'SUN FM', song: 'coastline' },
  { freq: '94.8', name: 'SHORE FM', song: 'shuffle' },
  { freq: '99.1', name: 'VESPA FM', song: 'vendetta' },
  { freq: '103.5', name: 'PASTEL FM', song: 'pastel' },
  { freq: '106.3', name: 'ZEST FM', song: 'lemon', unlock: 'lemon-drop' },
  { freq: '108.8', name: 'MOON FM', song: 'moonflower', unlock: 'moonflower' },
];

/* ---- the About & Credits (plan §7.25) and the exit-interview answers. Every answer is read from here, so the
 *      in-game pages, the reply and exit-interview.json stay the same text. ---- */
OB.ABOUT = {
  credits: [
    'OutBloom 2006: Coast 2 Coast',
    'A demo built on the my-3D2dge engine (MIT).',
    'AI Hub session protocol, client 1.4.0.',
    'Inspired by OutRun 2006: Coast 2 Coast (SEGA / Sumo Digital, 2006).',
    'An original homage. Not affiliated with or endorsed by SEGA or Sumo Digital.',
  ],
};
})();
