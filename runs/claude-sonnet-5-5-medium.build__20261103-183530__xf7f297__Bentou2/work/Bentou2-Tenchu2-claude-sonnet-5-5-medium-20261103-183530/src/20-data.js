/* ---- DATA: tools, ranks, enemies, missions and the story. Missions are data: a new one is a new entry. ---- */
B.TOOLS = {
  rice:    { name: 'Rice Ball', stack: 3, hint: 'Eat: +40 health', unlock: 0, icon: '#f4f0e0' },
  poison:  { name: 'Poison Rice Ball', stack: 2, hint: 'A hungry guard eats it, and does not finish dinner', unlock: 0, icon: '#9ad04a' },
  dango:   { name: 'Sleep Dango', stack: 2, hint: 'The eater naps for 25 seconds', unlock: 1, icon: '#e8a0c8' },
  plum:    { name: 'Sour Plum', stack: 3, hint: 'Soft steps for 20 seconds', unlock: 1, icon: '#c04a6a' },
  shuriken:{ name: 'Shuriken', stack: 10, hint: 'Throw: 8 damage', unlock: 0, icon: '#c8c8d8' },
  smoke:   { name: 'Smoke Bomb', stack: 2, hint: 'Blinds guards for 6 seconds', unlock: 0, icon: '#9a9aaa' },
  caltrops:{ name: 'Caltrops', stack: 2, hint: 'Stuns and slows whoever steps on them', unlock: 0, icon: '#6a6a7a' },
  cracker: { name: 'Firecracker', stack: 3, hint: 'A noise that draws guards away', unlock: 0, icon: '#e8503a' },
  firepot: { name: 'Fire Pot', stack: 1, hint: 'Explodes: 45 damage, wakes everyone', unlock: 2, icon: '#ff8a2a' },
  cloak:   { name: 'Straw Cloak', stack: 1, hint: 'Nearly invisible for 15 seconds', unlock: 3, icon: '#c8a860' }
};
const SHORT = { rice: 'Rice', poison: 'Poison', dango: 'Dango', plum: 'Plum', shuriken: 'Shuriken', smoke: 'Smoke', caltrops: 'Caltrops', cracker: 'Cracker', firepot: 'Fire pot', cloak: 'Cloak' };
for (const k in SHORT) B.TOOLS[k].short = SHORT[k];
B.TOOL_ORDER = ['rice', 'poison', 'dango', 'plum', 'shuriken', 'smoke', 'caltrops', 'cracker', 'firepot', 'cloak'];
// the bento grades, best first: the rank names are lunchbox grades
B.RANKS = [['Grand Kaiseki', 'Not one grain out of place.'], ['Makunouchi', 'Well packed.'], ['Ekiben', 'Edible.'], ['Hinomaru', 'Plain rice and one plum. Hm.'], ['Leftovers', 'Even the dogs would refuse this box.']];
B.ENEMY = {
  ashigaru: { name: 'Ashigaru', hp: 40, walk: 30, run: 70, sight: 100, fov: 1.5, move: 'thrust', dmg: 12, wind: .42, weapon: 'staff', cloth: '#8a3a32', hat: 'helmet', build: 'chibi', size: 1.15, bark: 'guard' },
  samurai: { name: 'Samurai', hp: 70, walk: 32, run: 75, sight: 105, fov: 1.5, move: 'slash', dmg: 16, wind: .36, weapon: 'sword', cloth: '#3a4a7a', hat: 'helmet', build: 'heroic', size: 1.2, armor: true, bark: 'guard' },
  archer:  { name: 'Archer', hp: 30, walk: 28, run: 65, sight: 125, fov: 1.3, move: 'shoot', dmg: 14, wind: 1.1, weapon: 'gun', cloth: '#5a6a3a', hat: 'cap', build: 'chibi', size: 1.1, ranged: true, bark: 'guard' },
  ninja:   { name: 'Red Lantern', hp: 50, walk: 40, run: 95, sight: 110, fov: 1.7, move: 'slash', dmg: 10, wind: .28, weapon: 'sword', cloth: '#7a1a24', hat: null, hood: true, build: 'heroic', size: 1.15, bark: 'guard', quick: true },
  hound:   { name: 'Hound', hp: 20, walk: 45, run: 120, sight: 80, fov: 1.8, move: 'bite', dmg: 8, wind: .25, hound: true, bark: 'guard' },
  civ:     { name: 'Townsperson', hp: 15, walk: 25, run: 80, sight: 90, fov: 1.6, civ: true, weapon: null, cloth: '#7a8a5a', build: 'chibi', size: 1.05, bark: 'civil' },
  noble:   { name: 'Magistrate', hp: 25, walk: 25, run: 70, sight: 90, fov: 1.6, civ: true, target: true, weapon: null, cloth: '#6a3a7a', hat: 'crown', build: 'chibi', size: 1.1, bark: 'kanemori' },
  disguised:{ name: 'Servant', hp: 50, walk: 25, run: 95, sight: 110, fov: 1.7, civ: true, disguise: true, weapon: 'sword', cloth: '#7a8a5a', build: 'chibi', size: 1.05, bark: 'civil' }
};
B.BARKS = {
  idle: ['Another cold night...', 'The barracks rice tastes of sand.', 'When does my watch end?', 'My feet hurt.'],
  notice: ['Hm? What was that?', 'Is someone there?', 'A cat...?'],
  search: ['Show yourself!', 'I know I heard something.', 'Check the shadows!'],
  lost: ['...Must have been the wind.', 'Bah. My eyes play tricks.', 'Nothing. Back to my post.'],
  alert: ['Intruder!', 'Ninja! Over here!', 'Sound the bell!'],
  body: ["He's... dead?!", 'Assassin! Wake the garrison!'],
  bait: ['Oh? A rice ball... nobody will miss it.'], ill: ['Ugh... my stomach...'], sleepy: ['So... sleepy...'],
  hurt: ['Ngh-', 'M-mother...'], civil: ['Eek! Murderer!', 'Please, spare me!'], ninja: ['A Jubako rat.', 'Your lunch is over.']
};
/* ---- map builder: rectangles of characters in a grid; later ops draw over earlier ones ---- */
B.grid = (w, h, ops) => {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [c, x, y, ww = 1, hh = 1] of ops) for (let j = y; j < Math.min(h, y + hh); j++) for (let i = x; i < Math.min(w, x + ww); i++) g[j][i] = c;
  return g.map(r => r.join(''));
};
const outline = (c, x, y, w, h) => [[c, x, y, w, 1], [c, x, y + h - 1, w, 1], [c, x, y, 1, h], [c, x + w - 1, y, 1, h]];
B.TYPES = {
  1: { h: 56, top: '#3a3448', side: '#5a5068', face: 'stone', roof: 'plain', cut: true, cutH: 6 },
  2: { h: 30, top: '#4a4458', side: '#7a7088', face: 'stone', roof: 'slab' },
  3: { h: 40, top: '#6a3a32', side: '#c8b89a', face: 'plaster', roof: 'tiles', windows: { lit: .3 }, shutters: '#2a3a5a', door: { chance: .4 } },
  4: { h: 48, top: '#4a3a30', side: '#9a6a4a', face: 'brick', roof: 'slab', windows: { lit: .15 } },
  5: { h: 28, top: '#7a4a32', side: '#d0c0a0', face: 'timber', roof: 'tiles', windows: true, door: { chance: .6, color: '#5a2a1a' } },
  6: { h: 72, top: '#5a4a3a', side: '#a89878', face: 'sandstone', roof: 'plain', windows: { w: 3, h: 10, step: 22, lit: .5 } },
  7: { h: 64, top: '#3a4458', side: '#b8b0a0', face: 'stone', roof: 'tiles' },
  8: { h: 112, top: '#3a4458', side: '#c8c0b0', face: 'plaster', roof: 'tiles', windows: { lit: .4 } },
  9: { h: 160, top: '#2a3a58', side: '#d0c8b8', face: 'plaster', roof: 'tiles', windows: { lit: .6 } },
  10: { h: 10, top: '#3e7a3a', side: '#5a4a32', face: 'plank', roof: 'leaves' },
  11: { h: 22, top: '#9ab860', side: '#7a9a4a', face: 'hedge', roof: 'leaves' }
};
B.LEGEND = { '#': 1, W: 2, A: 3, B: 4, H: 5, T: 6, G: 7, K: 8, M: 9, p: 10, b: 11, ',': { floor: 'grass' }, '~': { floor: 'water' }, ':': { floor: 'gravel' }, '=': { floor: 'planks' }, '_': { floor: 'tatami' } };

/* ---- MISSIONS ---- */
const M = B.MISSIONS = [];
// mission 0: the Trial of the Second Tier
M.push({
  id: 'trial', n: 0, name: 'The Trial of the Second Tier', place: 'Jubako-ya, back garden', w: 40, h: 28, ambient: .52, weather: { kind: 'leaves', amount: .3 }, music: 'm0', par: 420, loadHint: ['rice', 'poison', 'shuriken', 'smoke', 'cracker', 'caltrops', 'rice', 'shuriken'],
  ops: [...outline('#', 0, 0, 40, 28), ['A', 1, 1, 6, 3], ['b', 8, 2, 4, 1], [',', 13, 1, 7, 4], ['p', 3, 6, 2, 2], ['W', 8, 6, 1, 3], ['W', 11, 6, 1, 3], ['B', 28, 5, 4, 4], ['B', 30, 9, 4, 3],
    ['~', 14, 9, 6, 3], [':', 3, 18, 12, 6], [',', 24, 14, 6, 3], ['T', 36, 2, 2, 2], ['p', 20, 20, 2, 1], ['W', 22, 12, 1, 6], ['b', 26, 22, 6, 1]],
  hero: [3, 5], exit: [4, 5, 2.2], exitName: 'THE BACK PORCH', lanterns: [[6, 6], [14, 14], [24, 12], [9, 21], [27, 15]],
  props: [['tree', 12, 14, { size: 1.5 }], ['lamp', 6, 6, {}], ['lamp', 24, 12, {}], ['lamp', 27, 15, {}], ['barrel', 2, 8, {}], ['crate', 7, 10, {}], ['bush', 22, 18, {}], ['pine', 33, 18, { size: 1.4 }], ['flowers', 5, 14, {}]],
  guards: [
    { type: 'ashigaru', tag: 'ume', at: [14, 5], route: [[14, 5], [18, 5], [18, 3], [14, 3]], name: 'Disciple Ume' },
    { type: 'ashigaru', tag: 'kiku', at: [11, 8], mode: 'post', name: 'Disciple Kiku' },
    { type: 'ashigaru', tag: 'masa', at: [30, 13], route: [[30, 13], [26, 13], [26, 20], [34, 20]], name: 'Disciple Masa' },
    { type: 'samurai', tag: 'daikon', at: [20, 17], mode: 'post', name: 'Big Daikon', bait: true }
  ],
  boss: { id: 'ittetsu', at: [8, 21], trigger: [8, 20, 5], arena: [3, 18, 15, 24] },
  objectives: [
    { id: 'cut', text: 'Silence two disciples with Silent Cuts', kind: 'cuts', n: 2, req: true },
    { id: 'roof', text: 'Reach the kura roof with the kaginawa', kind: 'reach', at: [29.5, 6.5, 40], req: true },
    { id: 'bait', text: 'Feed Big Daikon a poison rice ball', kind: 'killtag', tag: 'daikon', req: false },
    { id: 'boss', text: 'Pass Brother Ittetsu\'s sparring', kind: 'boss', req: true }
  ],
  hints: [
    { at: [4, 6, 3], who: 'granny', text: 'Walk softly. A guard hears your feet before he sees your face.', once: 1 },
    { at: [12, 4, 3], who: 'granny', text: 'Come from behind and press the Silent Cut. A man who cannot see you cannot stop you.', once: 1 },
    { at: [10, 9, 2.5], who: 'granny', text: 'Crouch in the tall grass or the dark. Light is a shout. Shadow is a whisper.', once: 1 },
    { at: [26, 8, 4], who: 'granny', text: 'The roof is a road for those with a rope. Face the kura and press the kaginawa.', once: 1 },
    { at: [20, 15, 4], who: 'granny', text: 'Hungry men are careless men. Drop a poison rice ball and wait.', once: 1 },
    { at: [10, 18, 4], who: 'granny', text: 'The gauge in your belly is your ki. When it shouts, you whisper.', once: 1 }
  ],
  intro: 'prologue', outro: 'trialEnd'
});
// mission 1: Rice and Ash
M.push({
  id: 'rice', n: 1, name: 'Rice and Ash', place: 'Castle town, the canal ward', w: 56, h: 42, ambient: .45, weather: { kind: 'leaves', amount: .35 }, music: 'm1', par: 780, loadHint: ['poison', 'poison', 'shuriken', 'smoke', 'cracker', 'caltrops', 'rice', 'shuriken'],
  ops: [...outline('#', 0, 0, 56, 42), ...outline('W', 2, 1, 36, 16), [',', 3, 2, 3, 1], [':', 12, 3, 14, 12], ...outline('H', 28, 3, 8, 7), ['_', 29, 4, 6, 5], ['_', 31, 9, 2, 1], ['T', 35, 12, 2, 2], ['B', 4, 11, 4, 3], ['~', 4, 6, 5, 3],
    [':', 18, 16, 2, 1], ['A', 3, 20, 4, 3], ['A', 9, 20, 3, 3], ['A', 20, 20, 3, 3], ['A', 40, 20, 4, 3], ['A', 48, 21, 4, 3], ['B', 14, 24, 3, 3], ['A', 34, 25, 4, 3], ['A', 4, 26, 3, 3], ['A', 44, 26, 3, 3],
    ['p', 26, 21, 2, 1], ['W', 26, 24, 8, 1], ['W', 46, 15, 6, 1], ['~', 1, 35, 54, 6], ['=', 1, 34, 6, 1], [',', 30, 17, 6, 2], [',', 18, 30, 6, 3], ['B', 40, 30, 5, 3]],
  hero: [52, 36], exit: [2, 36, 2.4], exitName: 'THE CANAL BOAT', lanterns: [[10, 13], [14, 15], [30, 6], [33, 6], [20, 18], [26, 19], [30, 22], [38, 22], [12, 28], [48, 28]],
  props: [['lamp', 20, 19, {}], ['lamp', 30, 22, {}], ['lamp', 12, 28, {}], ['lamp', 48, 28, {}], ['barrel', 9, 18, {}], ['crate', 16, 23, {}], ['cart', 24, 28, {}], ['barrel', 38, 28, {}], ['tree', 6, 17, { size: 1.5 }],
    ['lamp', 13, 15, {}], ['lamp', 32, 5, {}], ['bush', 27, 17, {}], ['pine', 50, 19, { size: 1.4 }], ['crate', 42, 33, {}]],
  guards: [
    { type: 'samurai', at: [28, 20], route: [[28, 20], [38, 20], [38, 28], [28, 28]] },
    { type: 'samurai', at: [20, 26], route: [[20, 26], [20, 18], [12, 18], [12, 26]] },
    { type: 'ashigaru', at: [14, 28], route: [[14, 28], [24, 28], [24, 32], [14, 32]] },
    { type: 'ashigaru', at: [44, 24], route: [[44, 24], [50, 24], [50, 30], [44, 30]] },
    { type: 'ashigaru', at: [36, 31], mode: 'post' }, { type: 'hound', at: [42, 29], route: [[42, 29], [47, 29], [47, 33], [42, 33]] },
    { type: 'ashigaru', at: [17, 17], mode: 'post' }, { type: 'ashigaru', at: [20, 17], mode: 'post' },
    { type: 'archer', at: [35.5, 12.5], z: 72, mode: 'post' },
    { type: 'samurai', at: [30, 8], mode: 'post' }, { type: 'civ', at: [31, 5], mode: 'post' }, { type: 'civ', at: [33, 7], mode: 'post' },
    { type: 'noble', tag: 'kanemori', at: [32, 6], mode: 'post', name: 'Magistrate Kanemori' },
    { type: 'civ', at: [26, 19], mode: 'post' }, { type: 'civ', at: [29, 20], mode: 'post' }, { type: 'ashigaru', at: [7, 8], route: [[7, 8], [11, 8], [11, 13], [7, 13]] }
  ],
  boss: { id: 'gonroku', at: [19, 8], trigger: [19, 14, 3], arena: [12, 3, 25, 14] },
  pickups: [['dango', 10, 5], ['plum', 6, 28], ['shuriken', 46, 18]],
  bell: [25, 22], reinforce: [[27, 24], [31, 24]], ledger: [6, 14],
  objectives: [
    { id: 'boss', text: 'Defeat Gonroku the Iron Ox in the court', kind: 'boss', req: true },
    { id: 'target', text: 'Silence Magistrate Kanemori', kind: 'killtag', tag: 'kanemori', req: true },
    { id: 'ledger', text: 'Take Kanemori\'s ledger from the kura', kind: 'item', at: [6, 14, 0], req: false },
    { id: 'out', text: 'Slip out by the canal boat', kind: 'exit', req: true }
  ],
  intro: 'brief1', outro: 'debrief1'
});
// mission 2: the fort at Kiri Lake
M.push({
  id: 'lake', n: 2, name: 'The Fort at Kiri Lake', place: 'Kiri Lake, the Red Lantern fort', w: 60, h: 40, ambient: .4, weather: { kind: 'rain', amount: .8, lightning: .2 }, music: 'm2', par: 900, loadHint: ['poison', 'dango', 'shuriken', 'smoke', 'cracker', 'caltrops', 'plum', 'firepot'],
  ops: [...outline('#', 0, 0, 60, 40), ['~', 6, 1, 10, 38], [',', 1, 1, 5, 38], ['A', 2, 3, 3, 3], ['A', 2, 30, 3, 3], ['W', 17, 1, 1, 38], ['W', 17, 1, 41, 1], ['W', 17, 37, 41, 1], ['W', 57, 1, 1, 37],
    ['T', 18, 2, 2, 2], ['T', 55, 2, 2, 2], ['T', 18, 34, 2, 2], ['T', 55, 34, 2, 2], ['B', 21, 10, 6, 5], ['B', 33, 8, 3, 3], ['B', 33, 14, 3, 3], [':', 22, 4, 26, 4], ['A', 40, 20, 5, 4], ['p', 30, 26, 3, 1], ['b', 50, 8, 4, 1],
    ['W', 17, 24, 1, 2], ['=', 8, 27, 8, 4], ['=', 6, 34, 40, 2], ['p', 21, 30, 1, 1], ['p', 28, 30, 1, 1], ['p', 36, 30, 1, 1], ['_', 50, 10, 4, 4], ['B', 40, 28, 6, 3]],
  hero: [3, 20], exit: [2, 22, 2.4], exitName: 'THE ESCAPE BOAT', lanterns: [[22, 16], [34, 6], [48, 12], [26, 24], [38, 32], [52, 22], [10, 28]],
  props: [['lamp', 22, 16, {}], ['lamp', 38, 32, {}], ['lamp', 52, 22, {}], ['barrel', 26, 17, {}], ['crate', 28, 17, {}], ['pine', 4, 12, { size: 1.5 }], ['pine', 4, 26, { size: 1.5 }], ['reed', 5, 20, {}], ['bush', 3, 36, {}], ['lamp', 34, 6, {}], ['lamp', 10, 28, {}]],
  guards: [
    { type: 'archer', at: [18.5, 2.5], z: 72, mode: 'post' }, { type: 'archer', at: [55.5, 2.5], z: 72, mode: 'post' }, { type: 'archer', at: [18.5, 34.5], z: 72, mode: 'post' }, { type: 'archer', at: [55.5, 34.5], z: 72, mode: 'post' },
    { type: 'ninja', at: [30, 6], route: [[30, 6], [44, 6], [44, 12], [30, 12]] }, { type: 'ninja', at: [24, 20], route: [[24, 20], [24, 30], [34, 30], [34, 20]] },
    { type: 'ashigaru', at: [22, 18], mode: 'post' }, { type: 'ashigaru', at: [26, 16], mode: 'post' }, { type: 'ashigaru', at: [46, 18], route: [[46, 18], [52, 18], [52, 26], [46, 26]] },
    { type: 'hound', at: [50, 28], route: [[50, 28], [54, 28], [54, 33], [48, 33]] }, { type: 'samurai', at: [37, 22], route: [[37, 22], [48, 22], [48, 30], [37, 30]] },
    { type: 'ashigaru', at: [28, 34], route: [[28, 34], [40, 34], [40, 30], [28, 30]] }, { type: 'ninja', at: [52, 12], mode: 'post' }
  ],
  boss: { id: 'hotaru', at: [11, 29], trigger: [11, 29, 5], arena: [6, 27, 16, 31] },
  escort: { at: [52, 12], goal: [11, 29] }, lever: [21, 17], gate: [17, 24],
  pickups: [['firepot', 46, 14], ['dango', 25, 26], ['smoke', 12, 5]], posts: [[21, 36], [28, 36], [36, 36]],
  bell: [20, 15], reinforce: [[20, 13], [22, 13]],
  objectives: [
    { id: 'tobei', text: 'Find Tobei in the bamboo cage', kind: 'escort', req: true },
    { id: 'lever', text: 'Throw the lever to open the water gate', kind: 'lever', req: true },
    { id: 'barges', text: 'Cut the rice barges loose (3 posts)', kind: 'posts', req: false },
    { id: 'boss', text: 'Face Hotaru on the pier with Tobei', kind: 'boss', req: true },
    { id: 'out', text: 'Escape by boat with Tobei', kind: 'exit', req: true }
  ],
  intro: 'brief2', outro: 'debrief2'
});
// mission 3: Moon over Kokaku
M.push({
  id: 'moon', n: 3, endOnDone: true, name: 'Moon over Kokaku', place: 'Kokaku Castle, the moon-viewing', w: 56, h: 50, ambient: .62, weather: { kind: 'leaves', amount: .5 }, music: 'm3', par: 1080, loadHint: ['poison', 'dango', 'shuriken', 'smoke', 'cracker', 'firepot', 'plum', 'cloak'],
  ops: [...outline('#', 0, 0, 56, 50), ['~', 1, 1, 54, 48], ['.', 4, 4, 48, 40], ...outline('#', 4, 4, 48, 40), [',', 5, 5, 46, 14], ['T', 5, 5, 2, 2], ['T', 49, 5, 2, 2], ...outline('H', 12, 8, 10, 5), ['_', 13, 9, 8, 3], ['_', 16, 12, 2, 1], ['W', 5, 20, 46, 1], [':', 5, 21, 46, 22], ['W', 26, 20, 4, 1],
    ['G', 18, 26, 16, 14], ['K', 22, 29, 8, 8], ['M', 24, 31, 4, 4], ['p', 8, 8, 1, 1], ['p', 40, 8, 1, 1], ['p', 36, 14, 2, 1], ['b', 30, 6, 6, 1], ['B', 8, 28, 5, 4], ['B', 40, 28, 5, 4], ['~', 36, 24, 6, 3]],
  hero: [24, 45], exit: [27, 45, 2], exitName: 'THE MOAT', lanterns: [[10, 10], [16, 16], [28, 10], [40, 12], [12, 24], [44, 24], [30, 24], [18, 42], [36, 42]],
  props: [['lamp', 10, 10, {}], ['lamp', 28, 10, {}], ['lamp', 40, 12, {}], ['lamp', 12, 24, {}], ['lamp', 44, 24, {}], ['pine', 8, 16, { size: 1.5 }], ['pine', 46, 16, { size: 1.5 }], ['lamp', 18, 42, {}], ['lamp', 36, 42, {}], ['flowers', 20, 15, {}], ['bush', 34, 17, {}]],
  guards: [
    { type: 'archer', at: [5.5, 5.5], z: 72, mode: 'post' }, { type: 'archer', at: [49.5, 5.5], z: 72, mode: 'post' },
    { type: 'samurai', at: [12, 16], route: [[12, 16], [40, 16], [40, 12], [12, 12]] }, { type: 'civ', at: [24, 14], mode: 'post' }, { type: 'civ', at: [30, 14], mode: 'post' }, { type: 'civ', at: [36, 10], mode: 'post' },
    { type: 'disguised', at: [26, 11], mode: 'post' }, { type: 'disguised', at: [16, 14], mode: 'post' }, { type: 'disguised', at: [34, 15], mode: 'post' },
    { type: 'civ', at: [20, 6], mode: 'post' }, { type: 'civ', at: [38, 6], mode: 'post' }, { type: 'ninja', at: [14, 22], route: [[14, 22], [44, 22], [44, 42], [14, 42]] },
    { type: 'samurai', at: [9, 40], route: [[9, 40], [9, 24], [16, 24], [16, 40]] }, { type: 'ashigaru', at: [38, 40], route: [[38, 40], [46, 40], [46, 26], [38, 26]] },
    { type: 'samurai', at: [20, 25], mode: 'post', z: 0 }, { type: 'archer', at: [32.5, 27.5], z: 64, mode: 'post' }, { type: 'archer', at: [25.5, 30.5], z: 112, mode: 'post' },
    { type: 'hound', at: [30, 42], route: [[30, 42], [40, 42], [40, 38], [30, 38]] }
  ],
  boss: { id: 'kurogane', at: [26, 33], trigger: [26, 33, 2.4], arena: [24, 31, 28, 35] },
  flask: [16, 10], bell: [28, 22], reinforce: [[24, 22], [32, 22]],
  objectives: [
    { id: 'flask', text: 'Find the poisoned flask in the tea pavilion', kind: 'item', at: [16, 10, 0], req: true },
    { id: 'climb', text: 'Climb the keep: three tiers to the roof', kind: 'reach', at: [26, 33, 160], req: true },
    { id: 'boss', text: 'Defeat Chamberlain Kurogane', kind: 'boss', req: true }
  ],
  intro: 'brief3', outro: 'ending'
});
// the night delivery: the Shadow Trial, also the AI Hub round (every player plays their own copy of it)
B.DELIVERY = {
  id: 'delivery', n: 9, name: 'Night Delivery', place: 'Sakubei\'s rice depot', w: 34, h: 30, ambient: .4, weather: { kind: 'leaves', amount: .3 }, music: 'm1', par: 300, trial: true, loadHint: ['poison', 'rice', 'shuriken', 'smoke', 'cracker', 'caltrops', 'rice', 'shuriken'],
  ops: [...outline('#', 0, 0, 34, 30), ['~', 1, 1, 32, 2], ...outline('W', 1, 4, 32, 18), ['d', 16, 4, 1, 1], ['B', 4, 6, 3, 4], ['B', 27, 6, 3, 4], ['T', 15, 6, 2, 2], ...outline('H', 13, 11, 8, 3), ['_', 14, 12, 6, 1], ['_', 16, 13, 2, 1], [',', 3, 11, 3, 3], [',', 27, 17, 4, 3], ['~', 10, 16, 8, 3], ['p', 22, 13, 2, 1]],
  hero: [16, 26], exit: [16, 3, 2.2], exitName: 'THE CANAL GATE', lanterns: [[6, 15], [28, 14], [16, 10], [16, 20], [8, 24]],
  props: [['lamp', 6, 15, {}], ['lamp', 28, 14, {}], ['lamp', 16, 20, {}], ['barrel', 3, 8, {}], ['crate', 24, 8, {}], ['barrel', 20, 8, {}], ['tree', 10, 25, { size: 1.5 }], ['lamp', 8, 24, {}]],
  guards: [
    { type: 'samurai', at: [8, 18], route: [[8, 18], [26, 18], [26, 8], [8, 8]] }, { type: 'ashigaru', at: [20, 24], route: [[20, 24], [30, 24], [30, 20], [20, 20]] }, { type: 'archer', at: [15.5, 6.5], z: 72, mode: 'post' },
    { type: 'hound', at: [8, 14], route: [[8, 14], [8, 21], [12, 21], [12, 14]] }, { type: 'civ', at: [19, 12], mode: 'post' },
    { type: 'noble', tag: 'sakubei', at: [16, 12], mode: 'post', name: 'Sakubei the Rice Broker' }
  ],
  bell: [24, 20], reinforce: [[22, 22]],
  objectives: [{ id: 'target', text: 'Silence Sakubei in the counting hall', kind: 'killtag', tag: 'sakubei', req: true }, { id: 'out', text: 'Leave by the canal gate', kind: 'exit', req: true }]
};
B.LEGEND.d = { floor: 'planks' };
B.missionById = id => id === 'delivery' ? B.DELIVERY : M.find(m => m.id === id);

/* ---- STORY: earnest, terse feudal drama; the jokes are deadpan and come from the world. Each line: [speaker, text] ---- */
const NAMES = { granny: 'GRANNY', sojiro: 'SOJIRO', kaede: 'KAEDE', takanori: 'LORD TAKANORI', kurogane: 'KUROGANE', ittetsu: 'BROTHER ITTETSU', gonroku: 'GONROKU', kanemori: 'KANEMORI', hotaru: 'HOTARU', tobei: 'TOBEI', narr: '' };
B.NAMES = NAMES;
B.STORY = {
  prologue: [['narr', 'The Sengoku era. Lords devour lords, and the land devours the poor.'], ['narr', 'In Kasugai Province the granaries are full, and the people starve.'], ['narr', 'In the shadow of Kokaku Castle stands a humble shop, the Jubako-ya.'], ['narr', 'It sells lunchboxes to the lord\'s household. Every box has two tiers. So does the shop.'],
    ['granny', 'Rice that is never tested is only seed. Tonight, you two are tested.'], ['kaede', 'Finally. Six years of folding boxes.'], ['sojiro', '...We are ready, Master.'], ['granny', 'Ready? The rice says when it is ready. Not the cook. Go.']],
  trialEnd: [['ittetsu', '...Well struck. She was right about you.'], ['granny', 'Your rice is cooked. Whether it is seasoned, the world will decide.'], ['granny', 'Pack your bento. The lord has a request.']],
  brief1: [['takanori', 'Magistrate Kanemori swears the harvest failed. Yet his storehouses groan with rice.'], ['kurogane', 'My lord, Kanemori has served your house for twenty years. To accuse without proof is-'], ['takanori', 'Enough, Kurogane. Leave us.'],
    ['takanori', 'Grandmother. The law cannot reach him. Can your boxes?'], ['granny', 'Every box reaches its table, my lord.'], ['granny', 'He feasts tonight by the canal. He will not finish his meal. And bring me any letter he keeps. A man who hides rice also hides paper.']],
  debrief1: [['sojiro', 'Heaven was too slow.'], ['kaede', 'You should have shared.'], ['granny', 'Black iron. Kurogane\'s seal.'], ['granny', 'The rice was sold to the Red Lanterns. Sake-house ninja. They are paid in silver, and they pay in poison.'], ['granny', 'Tobei carried a copy to the lake. He has not come home.']],
  brief2: [['granny', 'Tobei is a fool with good feet. The Red Lanterns hold him at Kiri Lake. Bring him home.'], ['kaede', 'And the rice barges?'], ['granny', 'Rice belongs in bellies, not in a traitor\'s war chest. Cut them loose. The river knows the way to the villages.']],
  debrief2: [['tobei', 'You came! I knew you would. I mean, I hoped. I mean... is that a rice ball?'], ['hotaru', 'Tell your grandmother: on the night of the full moon, your lord drinks his last.'], ['granny', 'The moon-viewing. Kurogane hosts it. Hm.']],
  brief3: [['granny', 'Kurogane hosts the moon-viewing. The Red Lanterns pour the sake. Find the poisoned flask before the lord raises his cup. Then go up. A man like Kurogane always waits at the top.'], ['sojiro', 'And if he wears the castle\'s colors?'], ['granny', 'Then cut through the colors.']],
  ending: [['narr', 'In the castle town at dawn, the lord opens the granaries. The people line up with bowls.'], ['granny', 'Black lacquer. The clan\'s crest. You are apprentices no longer. You are Lunchbox Assassins. Seen by none.'], ['kaede', '...Fed by all.'], ['sojiro', 'Hm.'], ['narr', 'In a red-lantern sake house, Hotaru turns a shard of the oni mask in her fingers.'], ['hotaru', 'Two tiers... Then I shall be the lid.']],
  bossIn: {
    ittetsu: [['ittetsu', 'Ha! The old woman sends me children. Draw, little dumplings.']],
    gonroku: [['gonroku', 'The magistrate pays me by the bowl. Tonight, I eat well.']],
    hotaru: [['hotaru', 'The Jubako-ya sends its children to fetch its fool. How sweet. Like bean paste.']],
    kurogane: [['kurogane', 'Little boxes. Do you know what a lord is? A mouth. Feed it fear, and it rules a hundred years.'], ['kurogane', 'Takanori feeds it rice. I will be the new mouth. Shuten. Wake.']]
  },
  bossPhase: { gonroku: 'RAAAH! Stand still, mosquito!', hotaru: 'Which of me will you cut?', kurogane: 'THE MOON... TASTES OF IRON!' },
  bossOut: { ittetsu: '...Well struck.', gonroku: 'The rice... was always... his...', hotaru: 'Hm. Sharper than you look.', kurogane: 'The mask... was hungrier... than I...' },
  kanemoriFear: 'W-wait! I only followed orders! The man with the iron seal promised me a castle!',
  tobeiBarks: ['Waiting. Quietly. Like a pickle in a jar.', 'Following!']
};
