// ---------------------------------------------------------------------------------------------
// 01 · DATA — the town of Bellmore Point, NJ: its map, its places, its people, its missions.
// Everything here is plain data; the systems in the other modules read it.
// ---------------------------------------------------------------------------------------------
const TOWN = { W: 60, H: 40 };

// Cell codes:  # brick shop   B house (tile roof)   H hedge   T tree   F fence   W pool (deep: blocks)
//              g grass   w sidewalk   r road   y dirt yard / patio
function buildTownRows() {
  const g = Array.from({ length: TOWN.H }, () => Array(TOWN.W).fill('g'));
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && y >= 0 && x < TOWN.W && y < TOWN.H) g[y][x] = c;
    }
  };
  const ring = (x0, y0, x1, y1, c) => { rect(x0, y0, x1, y0, c); rect(x0, y1, x1, y1, c); rect(x0, y0, x0, y1, c); rect(x1, y0, x1, y1, c); };
  // the street, its sidewalks, and the hedges at the edge of town
  rect(0, 16, 59, 23, 'w');
  rect(0, 18, 59, 21, 'r');
  ring(0, 0, 59, 39, 'H');
  // the Balzano house on the hill, its fenced yard, the pool and the gate
  rect(4, 3, 13, 10, 'B');
  ring(2, 2, 22, 12, 'F');
  g[12][8] = 'g';
  rect(15, 5, 20, 8, 'W');
  g[3][16] = 'T'; g[3][21] = 'T'; g[11][18] = 'T';
  // the shops on the north side
  rect(24, 3, 31, 9, '#');                       // Ricci's Meats
  rect(36, 3, 44, 9, 'B');                       // Dorothy's Diner
  rect(48, 3, 56, 9, '#');                       // the Velvet Cannoli Lounge
  rect(46, 11, 56, 14, 'y');                     // the lounge patio
  g[11][47] = 'T'; g[11][55] = 'T';
  // the medical arts building on the south side, with its door on the sidewalk
  rect(24, 25, 31, 30, 'B');
  g[24][27] = 'w';
  // the lot on the south-west side
  rect(3, 25, 20, 34, 'y');
  g[26][2] = 'T'; g[33][5] = 'T'; g[29][10] = 'T'; g[36][15] = 'T'; g[27][18] = 'T';
  // Pappalardo Auto Body: the warehouse, its fenced yard, and the gate onto the lot
  rect(33, 25, 42, 36, 'y');
  ring(32, 24, 43, 37, 'F');
  g[30][32] = 'w';
  rect(44, 24, 57, 37, '#');
  // decorative hedges along the north sidewalk
  for (let x = 34; x <= 46; x += 4) g[10][x] = 'H';
  return g.map(row => row.join(''));
}

const TOWN_LEGEND = {
  '#': 1, B: 2, H: 3, T: 4, F: 5,
  g: { tile: 0, floor: 'grass' }, w: { tile: 0, floor: 'walk' }, r: { tile: 0, floor: 'road' },
  y: { tile: 0, floor: 'yard' }, W: { tile: 0, floor: 'water', block: true },
};
const TOWN_TYPES = {
  1: { h: 40, top: '#6a4a3a', side: '#4a3026', face: 'brick', roof: 'slab' },
  2: { h: 36, top: '#8a4a3a', side: '#d8c8a8', face: 'plaster', roof: 'tiles' },
  3: { h: 12, top: '#2f5a2f', side: '#1f3f20', face: 'hedge', roof: 'leaves' },
  4: { h: 30, top: '#3a7a3a', side: '#5a4a32', face: 'timber', roof: 'leaves' },
  5: { h: 10, top: '#8a7050', side: '#5a4a32', face: 'plank', roof: 'plain' },
};

// Named zones, in cells (first match wins). They decide what the other players see of you (the ghosts).
const ZONES = [
  ['home', 2, 2, 22, 14], ['deli', 22, 2, 33, 15], ['diner', 34, 2, 46, 15], ['lounge', 47, 2, 59, 15],
  ['vashti', 22, 24, 33, 31], ['yard', 32, 24, 43, 37], ['warehouse', 44, 24, 59, 39], ['lot', 0, 24, 21, 39],
  ['street', 0, 16, 59, 23],
];
function zoneAt(x, y) {
  const cx = Math.floor(x / 16), cy = Math.floor(y / 16);
  for (const [name, x0, y0, x1, y1] of ZONES) if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) return name;
  return 'street';
}

// Where the story takes place: the spawn points, and each chapter's checkpoint (cells).
const START_CELL = [8, 14];
const CHECKPOINT = { 1: [8, 14], 2: [50, 17], 3: [27, 20], 4: [30, 19], 5: [36, 20] };
const DUCKS = [[15, 6], [15, 8], [20, 5]];                   // rubber ducks at the pool (a side collection, on the shore)
const CANNOLI = [[42, 13], [52, 16], [34, 20]];              // pastry to heal from
const AMMO = [[38, 30], [36, 34], [41, 27]];                 // boxes of shells, in the yard
const CIVILIANS = [[13, 18], [30, 17], [46, 19], [56, 20], [9, 22]];

// Static set dressing: [shape, cell x, cell y, options]. Solid where it stands.
const DRESS = [
  ['barrel', 40, 13, { facing: .4 }], ['barrel', 52, 12, { facing: 2 }], ['crate', 22, 19, { facing: .3 }],
  ['barrel', 35, 27, { facing: .5 }], ['crate', 37, 28, { facing: 2.6 }], ['barrel', 40, 33, { facing: 1 }],
  ['crate', 34, 35, { facing: .1 }], ['crate', 41, 35, { facing: 2 }],
];
// Props (r.prop names) to dress the streets and yards: [name, cell x, cell y, options]
const PROPS = [
  ['streetlamp', 6, 19, { light: true }], ['streetlamp', 22, 17, { light: true }], ['streetlamp', 37, 22, { light: true }],
  ['streetlamp', 52, 22, { light: true }], ['streetlamp', 30, 21, { light: true }],
  ['hydrant', 14, 22, {}], ['trashcan', 33, 23, {}], ['trashcan', 45, 16, {}],
  ['awning', 27, 17, {}], ['awning', 42, 17, {}], ['sign', 39, 12, {}], ['sign', 28, 10, {}],
  ['pine', 26, 2, {}], ['bush', 9, 13, {}], ['bush', 17, 13, {}], ['flowers', 27, 13, {}], ['flowers', 47, 16, {}],
  ['fence', 1, 1, {}], ['tree', 2, 36, {}], ['pine', 4, 16, {}], ['bush', 30, 36, {}], ['lamp', 12, 16, { light: true }],
  ['lamp', 56, 26, { light: true }], ['streetlamp', 40, 38, { light: true }],
];

// The people of the town. kind: 'npc' talks; 'civ' runs; 'crew' and 'fed' fight; 'boss' too.
const NPC_DEFS = {
  ricci: { name: 'SAL RICCI', cell: [27, 11], face: 'bulky', hair: 'bald', outfit: 'coat', size: 1.3, colors: { coat: '#eeeae0', cloth: '#b03434', pants: '#2a2a30', skin: '#c88a64', hair: '#5a4a3a' }, turn: 3.4 },
  dorothy: { name: 'DOROTHY', cell: [40, 11], face: 'heroic', hair: 'long', outfit: 'tunic', size: 1.2, colors: { cloth: '#d07a8a', pants: '#3a3040', skin: '#e0b090', hair: '#8a5a3a' }, turn: 2.2 },
  tina: { name: 'TINA', cell: [51, 11], face: 'heroic', hair: 'ponytail', outfit: 'tunic', size: 1.2, colors: { cloth: '#2a2430', pants: '#18161c', skin: '#e0b090', hair: '#2a1a14' }, turn: -1.6 },
  lou: { name: 'BIG LOU', cell: [51, 14], face: 'bulky', hair: 'short', outfit: 'coat', size: 1.45, colors: { coat: '#3a3a42', cloth: '#5a2a2a', pants: '#20202a', skin: '#d4a07a', hair: '#8a8a8a' }, turn: 0 },
  vashti: { name: 'DR. VASHTI', cell: [27, 28], face: 'heroic', hair: 'long', outfit: 'robe', size: 1.2, colors: { cloth: '#6a3a6a', skin: '#e8c0a0', hair: '#c8b0a0' }, turn: 1.6 },
};

// Missions. Each chapter: a title, the objective text, and where it's checked. The order is the story.
const CHAPTERS = {
  1: { title: 'COLLECTIONS', goal: 'Collect from Sal, Dorothy and Tina' },
  2: { title: 'SIT-DOWN', goal: 'Go see Big Lou on the lounge patio' },
  3: { title: 'SESSION', goal: 'Dr. Vashti is expecting you' },
  4: { title: 'THE YARD', goal: 'Get to the Pappalardo yard and see Gus' },
  5: { title: 'HEAT', goal: 'The Feds are on the street. Get home to Ma' },
};

// The story's talk. Each conversation is a set of nodes; a node has lines, a speaker and either a
// next node or choices. A choice's fx moves respect, stress or heat; a flag records what was said.
const CONVS = {
  intro: { start: 'a', nodes: {
    a: { who: 'nobody', text: ['Ma wants you for Sunday gravy.', 'Get the envelopes first. Then you can eat.'], next: null },
  } },
  ricci: { start: 'a', nodes: {
    a: { who: 'ricci', text: ['Dom! Tell your uncle the envelope is light this week.', 'Ha. I\'m kidding. Here. Take it before the cannoli goes stale.'], next: null },
  } },
  dorothy: { start: 'a', nodes: {
    a: { who: 'dorothy', text: ['Dom, sweetheart. Sit. You want the cheesecake or you want to talk about it?', 'Don\'t answer. Here, the envelope. The pie\'s on me.'], next: null },
  } },
  tina: { start: 'a', nodes: {
    a: { who: 'tina', text: ['The lounge is paid up. Lou says you should go see him out back.', 'Here\'s the cash. Count it in front of me, that\'s how we do it.'], next: null },
  } },
  lou: { start: 'a', nodes: {
    a: { who: 'lou', text: ['You know why I called you out here?', 'Sit. The cigar is ugly, but the chair is comfortable.'], choices: [
      { t: '"Because I missed your birthday."', fx: { respect: 1 }, next: 'b1' },
      { t: '"I heard Gus Pappalardo is running his mouth."', fx: { respect: 2, flag: 'gus' }, next: 'b2' },
      { t: '"Ma is making gravy. I have to go."', fx: { respect: -1, stress: 6 }, next: 'b3' },
    ] },
    b1: { who: 'lou', text: ['Ha! That birthday cost me a lot of pride. Now listen.', 'Gus has his boys at the auto body. Go out there and talk to him. Politely.'], next: 'end' },
    b2: { who: 'lou', text: ['That\'s my nephew. He talks in his sleep. Good, you listened.', 'Gus is at the auto body. Go out and make him sorry he opened his mouth. Politely first.'], next: 'end' },
    b3: { who: 'lou', text: ['Gravy can wait. Everything can wait except Gus.', 'Go see the doctor first. You look like a man who didn\'t sleep.'], next: 'end' },
    end: { who: 'lou', text: ['Go on. Be a good boy.'], next: null },
  } },
  vashti: { start: 'a', nodes: {
    a: { who: 'vashti', text: ['Sit. Let\'s start with the week. How did it feel?'], choices: [
      { t: '"Like a parade with no floats."', fx: { stress: -6 }, next: 'b' },
      { t: '"Fine. Everybody\'s fine."', fx: { stress: 6 }, next: 'c' },
      { t: '"I drove around and looked at the ducks."', fx: { stress: -10 }, next: 'd' },
    ] },
    b: { who: 'vashti', text: ['A parade with no floats is just people standing in the street. Stay with that. What\'s the feeling?'], next: 'panic' },
    c: { who: 'vashti', text: ['"Fine" is a word people use in elevators. Let\'s try another one.'], next: 'panic' },
    d: { who: 'vashti', text: ['Ducks are a good answer. Ducks don\'t ask you for anything.'], next: 'panic' },
    panic: { who: 'vashti', text: ['When the panic comes in, what do you do with your hands?'], choices: [
      { t: '"Breathe. Count to ten."', fx: { stress: -12 }, next: 'e' },
      { t: '"Break something."', fx: { stress: 12 }, next: 'f' },
      { t: '"Eat something."', fx: { stress: -6, heal: 25 }, next: 'g' },
    ] },
    e: { who: 'vashti', text: ['Good. Count to ten, then tell me the number. Next week, we\'ll count together.'], next: 'close' },
    f: { who: 'vashti', text: ['Breaking things makes a mess. You know that. We\'ll work on the mess.'], next: 'close' },
    g: { who: 'vashti', text: ['Food is a legitimate tool. Bring a cannoli next time. I\'ll take half.'], next: 'close' },
    close: { who: 'vashti', text: ['That\'s it for today. Go home. Sleep if you can. We\'ll pick it up next week.'], next: null },
  } },
  gus: { start: 'a', nodes: {
    a: { who: 'gus', text: ['Dom. Lou sent you? That\'s sweet. Tell him I said hello and that his cannoli is dry.'], next: 'b' },
    b: { who: 'gus', text: ['Now you want to dance? Okay. Let\'s dance.'], next: null },
  } },
  feds: { start: 'a', nodes: {
    a: { who: 'fed', text: ['FBI! Nobody move. Hands where I can see them!'], next: null },
  } },
  downed: { start: 'a', nodes: {
    a: { who: 'nobody', text: ['You went down. Ma sent a car. You\'re going to be fine.', 'Probably.'], next: null },
  } },
  home: { start: 'a', nodes: {
    a: { who: 'ma', text: ['There you are! Sit. The gravy has been ready since Tuesday.', 'Next time you bring the Feds, bring a bigger pot.'], next: null },
  } },
};

// The speakers' voices: each one gets its own pitch of gibberish "Animalese" blips per letter.
const VOICES = {
  nobody: [{ wave: 'triangle', freq: 300, dur: .04, vol: .08 }],
  ricci: [{ wave: 'square', freq: 180, dur: .05, vol: .07 }, { wave: 'square', freq: 210, dur: .05, vol: .07 }],
  dorothy: [{ wave: 'triangle', freq: 460, dur: .04, vol: .08 }, { wave: 'triangle', freq: 520, dur: .04, vol: .07 }],
  tina: [{ wave: 'pulse', freq: 600, dur: .035, vol: .06 }, { wave: 'pulse', freq: 680, dur: .035, vol: .06 }],
  lou: [{ wave: 'square', freq: 120, dur: .06, vol: .08 }, { wave: 'square', freq: 150, dur: .06, vol: .08 }],
  vashti: [{ wave: 'sine', freq: 380, dur: .05, vol: .07 }, { wave: 'sine', freq: 420, dur: .05, vol: .07 }],
  gus: [{ wave: 'saw', freq: 200, dur: .045, vol: .05 }, { wave: 'saw', freq: 240, dur: .045, vol: .05 }],
  fed: [{ wave: 'square', freq: 260, dur: .035, vol: .06 }, { wave: 'square', freq: 300, dur: .035, vol: .06 }],
  ma: [{ wave: 'triangle', freq: 400, dur: .04, vol: .08 }, { wave: 'triangle', freq: 440, dur: .04, vol: .08 }],
};
const SPEAKER_NAMES = { nobody: '', ricci: 'SAL RICCI', dorothy: 'DOROTHY', tina: 'TINA', lou: 'BIG LOU', vashti: 'DR. VASHTI', gus: 'GUS PAPPALARDO', fed: 'FBI AGENT', ma: 'MA' };
