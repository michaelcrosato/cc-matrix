// Content: environments, cars, courses (a small track language), puzzles, survival gauntlets, text.
export const U = 16;

/** DSL: S60 straight 60m; R90:40 / L90:40 turn 90° over 40m of road; H3:40 climb 3m over 40m; J12:3 ramp then a 12m gap
 *  (+ 3m ramp rise); cp = checkpoint here; bo = boost pad here; dirt / ice / road = surface from here; w9 = width from here */
export function parse(src) {
  const segs = []; let surf = 'road', w = 0;
  for (const t of src.trim().split(/\s+/)) {
    let m;
    if (t === 'cp') { segs[segs.length - 1].cp = true; continue; }
    if (t === 'bo') { segs[segs.length - 1].boost = true; continue; }
    if (['dirt', 'ice', 'road'].includes(t)) { surf = t; continue; }
    if ((m = /^w(\d+)$/.exec(t))) { w = +m[1]; continue; }
    const o = { surf }; if (w) o.w = w;
    if ((m = /^S(\d+)$/.exec(t))) o.len = +m[1];
    else if ((m = /^([LR])(\d+):(\d+)$/.exec(t))) { o.len = +m[3]; o.turn = (m[1] === 'R' ? 1 : -1) * +m[2]; }
    else if ((m = /^H(-?\d+):(\d+)$/.exec(t))) { o.len = +m[2]; o.dz = +m[1]; }
    else if ((m = /^J(\d+):(\d+)$/.exec(t))) { o.len = 14; o.dz = +m[2]; o.jump = +m[1]; o.drop = +m[2] + 1; }
    else throw new Error('bad token ' + t);
    segs.push(o);
  }
  return segs;
}

export const ENVS = {
  dust: { id: 'dust', name: 'DUSTBOWL', blurb: 'Dry lakes, red mesas, muscle cars.', car: 'coyote', ground: 'sand', off: 'sand',
    colors: { base: '#d8b070', dark: '#c49a5c', light: '#e6c688' }, sky: ['#6aa8e8', '#f4d6a0'], fog: ['#f0d6a8', 900, 3200], sun: '#fff0d0', road: '#4c4a4e', wall: '#d8b8a0', kerbs: ['#f4f0e8', '#d8402a'], props: ['cactus', 'rock', 'bones'], accent: '#ff9a3a', side: 'earth', music: 'dust' },
  hedge: { id: 'hedge', name: 'HEDGEROW', blurb: 'Lanes, ditches and flying hedges.', car: 'pebble', ground: 'grass', off: 'grass',
    colors: { base: '#5a9a3a', dark: '#4a8a32', light: '#6aaa4a' }, sky: ['#4a8ae0', '#cfe4f4'], fog: ['#cfe4f4', 900, 3200], sun: '#fff4dc', road: '#56565c', wall: '#c8c4b8', kerbs: ['#f4f0e8', '#2a6ad8'], props: ['tree', 'bush', 'fence'], accent: '#4ac86a', side: 'earth', music: 'hedge' },
  frost: { id: 'frost', name: 'FROSTPEAK', blurb: 'Packed snow, black ice, big trucks.', car: 'moose', ground: 'snow', off: 'snow',
    colors: { base: '#e4eef8', dark: '#cddcec', light: '#f6fbff' }, sky: ['#7aa8d8', '#e8f2fc'], fog: ['#e0ecf8', 800, 2800], sun: '#e8f0ff', road: '#5a6272', wall: '#a8bcd0', kerbs: ['#f4f8ff', '#3a78c8'], props: ['pine', 'rock', 'lamp'], accent: '#6ad0ff', side: 'earth', music: 'frost' }
};

export const CARS = {
  coyote: { id: 'coyote', name: 'COYOTE', note: 'Muscle. Fast, loose, loud.', top: 590, accel: 340, brake: 560, turn: 2.25, grip: 10.5, drift: 3, hop: 0, color: '#e8632a' },
  pebble: { id: 'pebble', name: 'PEBBLE', note: 'Hatch. Grips like a limpet.', top: 520, accel: 380, brake: 560, turn: 2.5, grip: 13.5, drift: 4, hop: 0, color: '#2f7ae0' },
  moose: { id: 'moose', name: 'MOOSE', note: 'Truck. Heavy, calm, sure on ice.', top: 480, accel: 320, brake: 520, turn: 2.1, grip: 9.5, drift: 3.4, hop: 0, color: '#3aa86a', surfaces: { ice: { grip: .5 }, snow: { top: .8, grip: .8 } } }
};
export const PAINTS = [['Fire', '#e8452a'], ['Lemon', '#f5d020'], ['Lime', '#58c84a'], ['Sky', '#3a9ae8'], ['Plum', '#9a4ad0'], ['Hot pink', '#ff5aa8'], ['Chalk', '#e8e8f0'], ['Coal', '#3a3a46']];

const RAW = [
  { id: 'D1', env: 'dust', name: 'First Gear', start: { x: 40, y: 60, angle: 0 }, src: 'S60 S50 bo R90:50 S60 cp S40 R90:50 S70 L45:30 S40 cp L45:30 S60 R90:50 S50 bo S50 L45:30 S60 R45:30 S60' },
  { id: 'D2', env: 'dust', name: 'Dry Spell', start: { x: 40, y: 40, angle: 0 }, src: 'S60 R60:40 S50 L60:40 S40 bo cp S40 J10:2 S50 R90:50 S50 cp R90:50 S40 J10:2 S50 bo L90:50 S60' },
  { id: 'D3', env: 'dust', name: 'The Big Crack', start: { x: 40, y: 40, angle: 0 }, src: 'S80 bo L45:40 S40 R45:40 S40 cp dirt S40 R90:46 S40 L90:46 S40 road cp S50 H4:50 J12:3 S60 bo R90:46 S60 cp J14:3 S60 L90:46 S50' },
  { id: 'R1', env: 'hedge', name: 'Lane Changer', start: { x: 40, y: 40, angle: 0 }, src: 'S60 R90:40 S40 L90:40 S40 cp R90:40 S50 R90:40 S50 bo L90:40 S40 cp L90:40 S60 S50 R45:30 S60 L45:30 S40' },
  { id: 'R2', env: 'hedge', name: 'Hedge Hopper', start: { x: 40, y: 40, angle: 0 }, src: 'S70 bo R90:44 S40 dirt L45:30 S30 R45:30 S40 cp road S40 J10:2 S40 L90:44 S40 cp R90:44 S40 bo J10:2 S50 R45:30 S50' },
  { id: 'R3', env: 'hedge', name: 'Mud Rush', start: { x: 40, y: 40, angle: 0 }, src: 'S60 dirt S50 R90:40 S30 L90:40 S30 cp R90:40 S40 road bo S40 H3:40 J12:3 S50 cp L90:44 S40 R90:44 S40 bo J10:2 S60 dirt S40 L90:40 S40' },
  { id: 'S1', env: 'frost', name: 'Cold Open', start: { x: 40, y: 40, angle: 0 }, src: 'S70 R90:50 S50 bo L90:50 S50 cp ice S50 road R90:50 S60 cp L45:30 S50 R45:30 S40 bo S40 L90:50 S60' },
  { id: 'S2', env: 'frost', name: 'Black Ice Waltz', start: { x: 40, y: 40, angle: 0 }, src: 'S60 bo ice R45:36 S30 L90:44 S30 R45:36 S40 cp road S40 H4:40 J10:2 S50 R90:44 S40 cp ice L90:44 S50 road bo S50' },
  { id: 'S3', env: 'frost', name: 'Summit Fever', start: { x: 40, y: 40, angle: 0 }, src: 'S60 bo R90:44 S40 H3:40 cp ice S40 L90:44 S40 road J12:3 S50 cp R90:44 S40 bo L90:44 S40 H-2:30 J12:2 S50 cp R45:30 S40 L45:30 S60 bo' }
];
export const COURSES = {}; export const COURSE_IDS = [];
for (const r of RAW) { COURSES[r.id] = { id: r.id, env: r.env, name: r.name, start: r.start, width: 8, segs: parse(r.src) }; COURSE_IDS.push(r.id); }

export const BLOCKS = {
  S: { label: 'Straight', cost: 10, tok: 'S40' }, R: { label: 'Right 90', cost: 20, tok: 'R90:44' }, L: { label: 'Left 90', cost: 20, tok: 'L90:44' },
  r: { label: 'Right 45', cost: 15, tok: 'R45:30' }, l: { label: 'Left 45', cost: 15, tok: 'L45:30' },
  U: { label: 'Hill', cost: 30, tok: 'H3:40' }, J: { label: 'Jump', cost: 60, tok: 'J10:2' }, B: { label: 'Boost', cost: 25, tok: 'S40 bo' }, C: { label: 'Checkpoint', cost: 15, tok: 'S20 cp' },
  D: { label: 'Dirt', cost: 5, tok: 'dirt S40 road' }, I: { label: 'Ice', cost: 5, tok: 'ice S40 road' }
};
export const PUZZLES = [
  { id: 'P1', env: 'dust', name: 'Three Pieces', start: { x: 40, y: 40, angle: 0 }, pre: 'S60 R90:44', inv: 'S R L S', slots: 2, post: 'S60 cp', solution: 'S S', hint: 'Keep it simple: the road is already pointing at the finish.' },
  { id: 'P2', env: 'hedge', name: 'Dog Leg', start: { x: 40, y: 40, angle: 0 }, pre: 'S60', inv: 'R L S S R', slots: 3, post: 'S40 cp', solution: 'R S L', hint: 'Right, straight, left brings the road back to level.' },
  { id: 'P3', env: 'frost', name: 'Hop The Crack', start: { x: 40, y: 40, angle: 0 }, pre: 'S60 cp', inv: 'J S S U L', slots: 2, post: 'S60 cp', solution: 'S J', hint: 'A jump needs a run-up. Straight first.' }
];
export const SURVIVAL = {
  dust: { name: 'Ghost Guild: Dustbowl', courses: ['D1', 'D2', 'D3'] },
  hedge: { name: 'Ghost Guild: Hedgerow', courses: ['R1', 'R2', 'R3'] },
  frost: { name: 'Ghost Guild: Frostpeak', courses: ['S1', 'S2', 'S3'] }
};
export const RIVALS = [['SPOOK', '#c8c8ff'], ['WISP', '#80e0ff'], ['DUSKY', '#ffb0e0']];
export const TXT = {
  title: 'CRACKMANIA', tag: 'CRACK THE CLOCK',
  medals: ['', 'BRONZE', 'SILVER', 'GOLD', 'AUTHOR'],
  quips: ['Coffee break over.', 'Rubber side down.', 'That was a lot of air.', 'The clock blinked first.', 'Smooth. Suspiciously smooth.', 'Respawn is not a personality.']
};
export const CAST = [
  { id: 'coco', name: 'COCO', color: '#ff9a3a', pitch: 1.3, lines: ['Hi. I am Coco. I time things.', 'My record is on every sign. Try not to read it.', 'Three medals and a smile. Good luck.'] },
  { id: 'gus', name: 'GUS', color: '#6ad0ff', pitch: .8, lines: ['Gus. I fix cars. Mostly after you.', 'Snow is just sand that gave up.', 'The Big Crack is a jump. Do not look down.'] }
];
