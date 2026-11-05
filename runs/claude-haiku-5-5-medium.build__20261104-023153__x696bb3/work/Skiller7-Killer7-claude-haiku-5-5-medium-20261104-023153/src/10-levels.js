/* Skiller7: areas. Each area is data: floor rooms (tile rectangles, inclusive), rails (legs: polylines in metres, tile
 * centres, with the legs they lead to), camera shots per leg, waves, pickups, gates and the boss. Walls are the tiles
 * no room covers. Terrain areas (the slope) give their ground from a height function instead of rooms.
 * x is east, y is south (metres, tile centres at .5), z is up. */
S7.AREAS = {};

/* ---- Room 7: the save room. Sister Rosalind, the Cuckoo Clock, the Wardrobe, the Wax Bench, a bed under a mountain ---- */
S7.AREAS.room7 = {
  id: 'room7', title: 'ROOM 7', sub: 'PIZ NADA SANATORIUM, TOP FLOOR', kind: 'room', music: 'room7',
  size: [16, 12], rooms: [[1, 1, 14, 10]], ground: 'planks', side: 'block', start: 'idle',
  legs: { idle: { pts: [[7.5, 6.5], [8.5, 6.5]], next: [], shots: [] } },
  colors: { base: '#5a3f32', dark: '#3e2a22', light: '#7a5a48' }, wallColor: '#7a2a30', sky: '#0a0608',
  fog: { color: '#120a0c', near: 18, far: 60 },
  cam: { at: [6.6, 1.5, 3.1], fov: 58 }, lookAt: [8, 6, 1.6],
  props: [ ['bed', 4, 3.2, 0], ['clock', 12.2, 2.4, 0], ['wardrobe', 12.5, 6.5, 0], ['bench', 8, 9, 0] ]
};

/* ---- Target 00: the Grand Hotel Nada. Lobby, a junction (north: the ballroom; south: the stairs), the elevator shaft. ---- */
S7.AREAS.t00 = {
  id: 't00', title: 'TARGET 00', sub: 'GRAND HOTEL NADA', kind: 'rail', music: 'hotel', target: 0,
  size: [44, 24],
  rooms: [
    [2, 8, 12, 16],   // lobby
    [13, 11, 22, 12], // corridor
    [23, 9, 27, 14],  // junction hall
    [23, 2, 34, 7],   // ballroom
    [24, 8, 26, 8],   // ballroom link
    [35, 5, 35, 6],   // ballroom to shaft
    [25, 15, 26, 16], // stairs link
    [23, 17, 30, 22], // stairs
    [31, 19, 35, 20], // stair corridor
    [36, 4, 42, 21]   // elevator shaft hall
  ],
  start: 'lobby',
  legs: {
    lobby: { pts: [[3.5, 12.5], [12.5, 11.5], [22.5, 11.5], [25.5, 11.5]], next: ['north', 'south'], junction: true,
      shots: [ { from: 0, at: [2.5, 14.5, 3.4], fov: 56 }, { from: .5, at: [12.8, 11.6, 2.6], fov: 52 } ] },
    north: { pts: [[25.5, 11.5], [25.5, 8.5], [30.5, 5.5], [35.5, 5.5], [37.5, 6.5]], next: ['shaftN'],
      shots: [ { from: 0, at: [24.5, 14.2, 3.6], fov: 50 }, { from: .55, at: [33.5, 3.2, 3.4], fov: 54 } ] },
    south: { pts: [[25.5, 11.5], [25.5, 15.5], [25.5, 18.5], [30.5, 19.5], [33.5, 19.5], [37.5, 19.5]], next: ['shaftS'],
      shots: [ { from: 0, at: [23.5, 13.0, 3.0], fov: 52 }, { from: .6, at: [24.0, 18.0, 3.6], fov: 52 } ] },
    shaftN: { pts: [[37.5, 6.5], [38.5, 11.5], [39.5, 16.5]], next: [], boss: 'bellcaptain',
      shots: [ { from: 0, at: [36.5, 9.5, 2.8], fov: 56 } ] },
    shaftS: { pts: [[37.5, 19.5], [39.5, 16.5]], next: [], boss: 'bellcaptain',
      shots: [ { from: 0, at: [40.5, 20.0, 2.6], fov: 56 } ] }
  },
  waves: [
    { leg: 'lobby', at: .35, wave: 'lane' },
    { leg: 'north', at: .3, wave: 'ballroom' },
    { leg: 'north', at: .75, wave: 'ballroom' },
    { leg: 'south', at: .3, wave: 'stairs' },
    { leg: 'shaftN', at: .3, wave: 'shaft' },
    { leg: 'shaftS', at: .3, wave: 'shaft' }
  ],
  pickups: [
    { id: 't00-r1', leg: 'lobby', at: .9, kind: 'red' },
    { id: 't00-m1', leg: 'north', at: .15, kind: 'rime' },
    { id: 't00-r2', leg: 'south', at: .5, kind: 'red' },
    { id: 't00-m2', leg: 'south', at: .88, kind: 'rime' },
    { id: 't00-r3', leg: 'north', at: .92, kind: 'red' },
    { id: 't00-note1', leg: 'lobby', at: .6, kind: 'note', note: 'note-lift' },
    { id: 't00-note2', leg: 'north', at: .45, kind: 'note', note: 'note-ballroom' }
  ],
  // people you can talk to: Murmel the marmot in the lobby, Pim the lift boy's ghost on the stairs (he gives the door code)
  npcs: [ { id: 'murmel', leg: 'lobby', at: .25, lat: -1.4 }, { id: 'pim', leg: 'south', at: .3, lat: 1.3 } ],
  gates: [ { id: 'rope', leg: 'north', at: .55, kind: 'buyout', price: 2, label: 'MEMBERS ONLY', who: 'rurik' },
           { id: 'service', leg: 'south', at: .62, kind: 'code', code: '1926', label: 'SERVICE DOOR' } ],
  // the view of the rooms: lights and a few props (kind: chandelier, desk, plant, bell, piano, chair, palm, sign)
  props: [ ['chandelier', 17, 11.5, 5.6], ['chandelier', 28, 5.5, 5.4], ['desk', 6, 12, 0], ['palm', 9, 9.5, 0],
           ['palm', 4.5, 15, 0], ['chandelier', 26, 18.5, 5.4], ['palm', 33, 21.5, 0], ['bell', 38, 17, 0],
           ['chair', 29, 3, 0], ['chair', 32, 3, 0], ['piano', 28, 3.2, 0], ['desk', 19, 20.2, 0], ['palm', 40, 6.5, 0] ],
  lights: [ [7, 12, 3.6, '#ffd8a0'], [17, 11.5, 3.2, '#ffd8a0'], [25, 11.5, 3.6, '#ffe0b0'], [28, 5.5, 4.2, '#ffd8a0'],
            [26, 18.5, 3.6, '#ffc890'], [33, 19.5, 3.2, '#ffb0a0'], [39, 10, 3.6, '#ff8a7a'], [39, 19, 3.2, '#ff8a7a'] ],
  colors: { base: '#2a1e2c', dark: '#1a121c', light: '#4a3a4c' }, wallColor: '#4a2430', sky: '#05040a',
  fog: { color: '#0a0608', near: 30, far: 180 }, ambient: ['#6a5a6c', '#2a2030', 2.4],
  cam: { at: [5, 3, 5], fov: 56 }
};

/* ---- Target 01: Après. The village lane (rooms of chalets), the black ski run (terrain), the plateau of the Powder King ---- */
S7.AREAS.t01 = {
  id: 't01', title: 'TARGET 01', sub: 'APRÈS PISTE', kind: 'rail', music: 'slope', target: 1,
  terrain: true,
  legs: {
    lane: { pts: [[60.5, 6.5], [60.5, 30.5], [60.5, 56.5]], next: ['slope'],
      shots: [ { from: 0, at: [57.5, 2.5, 4.2], fov: 52 }, { from: .5, at: [66.5, 36.5, 3.5], fov: 54 } ] },
    slope: { pts: [[60.5, 56.5], [68.5, 88.5], [52.5, 118.5], [64.5, 150.5], [60.5, 176.5]], next: ['plateau'], ski: true,
      shots: [ { from: 0, at: [57.5, 56.5, 4.8], fov: 56 }, { from: .5, at: [72.5, 112.5, 9.0], fov: 60 } ] },
    plateau: { pts: [[60.5, 176.5], [60.5, 192.5]], next: [], boss: 'powderking',
      shots: [ { from: 0, at: [55.5, 170.5, 6.5], fov: 58 } ] }
  },
  waves: [
    { leg: 'lane', at: .3, wave: 'lane' },
    { leg: 'lane', at: .75, wave: 'lane' },
    { leg: 'slope', at: .25, wave: 'slope' },
    { leg: 'slope', at: .7, wave: 'slope' },
    { leg: 'plateau', at: .2, wave: 'plateau' }
  ],
  pickups: [
    { id: 't01-r1', leg: 'lane', at: .15, kind: 'red' },
    { id: 't01-m1', leg: 'lane', at: .2, kind: 'rime' },
    { id: 't01-m3', leg: 'lane', at: .34, kind: 'rime' },
    { id: 't01-m2', leg: 'slope', at: .35, kind: 'rime' },
    { id: 't01-r2', leg: 'slope', at: .8, kind: 'red' },
    { id: 't01-note', leg: 'slope', at: .5, kind: 'note', note: 'note-powder' }
  ],
  npcs: [ { id: 'murmel', leg: 'lane', at: .6, lat: 1.5 }, { id: 'hansi', leg: 'slope', at: .15, lat: -1.6 } ],
  gates: [ { id: 'rope1', leg: 'lane', at: .5, kind: 'buyout', price: 4, label: 'MEMBERS ONLY', who: 'rurik' } ],
  // the terrain: flat village, a steep black run that drops toward the plateau, the plateau itself
  groundZ(x, y) {
    if (y < 58) return 27 - .06 * y;
    if (y < 178) return 27 - .06 * 58 - (y - 58) * .4 + Math.sin(y * .21) * .35 + Math.sin(x * .3) * .25;
    return 27 - .06 * 58 - 120 * .4;
  },
  props: [ ['chalet', 52, 14], ['chalet', 70, 14], ['chalet', 52, 24], ['chalet', 70, 26], ['chalet', 52, 36], ['chalet', 70, 38],
           ['pine', 48, 18], ['pine', 74, 20], ['pine', 48, 32], ['pine', 75, 34], ['pine', 50, 60], ['pine', 72, 66],
           ['pine', 46, 92], ['pine', 80, 100], ['pine', 45, 130], ['pine', 78, 140], ['pine', 70, 170] ],
  cam: { at: [55, 2, 6], fov: 56 }, colors: { base: '#e8eef8', dark: '#b0bcd8', light: '#ffffff' },
  fog: { color: '#c8d4ea', near: 90, far: 620 }, sky: ['#3a5a9a', '#b8c8e6', '#dce6f4'], music2: 'boss'
};

/* ---- the Echo Run: the black run alone, timed (the ski leg, no waves) ---- */
S7.AREAS.echo = {
  id: 'echo', title: 'ECHO RUN', sub: 'THE BLACK RUN, AGAINST THE CLOCK', kind: 'rail', music: 'slope', target: 2,
  terrain: true, echo: true,
  legs: {
    run: { pts: [[60.5, 56.5], [68.5, 88.5], [52.5, 118.5], [64.5, 150.5], [60.5, 176.5]], next: [], ski: true, finish: true,
      shots: [ { from: 0, at: [57.5, 56.5, 4.8], fov: 56 }, { from: .5, at: [72.5, 112.5, 9.0], fov: 60 } ] }
  },
  waves: [], pickups: [], gates: [], groundZ: S7.AREAS.t01.groundZ,
  props: S7.AREAS.t01.props, cam: { at: [55, 2, 6], fov: 56 }, colors: S7.AREAS.t01.colors,
  fog: S7.AREAS.t01.fog, sky: S7.AREAS.t01.sky
};

/* ---- geometry helpers used by the sim and the presenter ---- */
S7.areaGrid = (area) => {
  if (area._grid) return area._grid;
  const [w, h] = area.size, g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill('#'));
  for (const [x0, y0, x1, y1] of area.rooms || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = '.';
  area._grid = g.map(r => r.join(''));
  return area._grid;
};
/** ground height (metres) under a point, from the terrain function or the rooms (flat) */
S7.groundZ = (area, x, y) => (area.groundZ ? area.groundZ(x, y) : 0);
S7.isFloor = (area, x, y) => {
  if (area.terrain) return true;
  const g = S7.areaGrid(area), tx = Math.floor(x), ty = Math.floor(y);
  return ty >= 0 && ty < g.length && tx >= 0 && tx < g[0].length && g[ty][tx] === '.';
};

/** the legs' lengths and sample tables (metres). A leg is sampled every 0.05 m for quick lookup by distance. */
S7.prepareLegs = (area) => {
  if (area._prepared) return area;
  for (const id in area.legs) {
    const L = area.legs[id];
    L.id = id;
    L.seg = [];
    let total = 0;
    for (let i = 0; i < L.pts.length - 1; i++) {
      const [ax, ay] = L.pts[i], [bx, by] = L.pts[i + 1], len = Math.hypot(bx - ax, by - ay);
      L.seg.push({ x0: ax, y0: ay, x1: bx, y1: by, s0: total, len, dx: (bx - ax) / len, dy: (by - ay) / len });
      total += len;
    }
    L.len = total;
    L.shots = (L.shots || []).slice().sort((a, b) => a.from - b.from);
  }
  area._prepared = true;
  return area;
};
/** the point and heading at distance s along a leg */
S7.legAt = (area, legId, s) => {
  const L = area.legs[legId];
  s = S7.clamp(s, 0, L.len);
  let seg = L.seg[L.seg.length - 1];
  for (const g of L.seg) if (s <= g.s0 + g.len) { seg = g; break; }
  const t = S7.clamp((s - seg.s0) / seg.len, 0, 1);
  const x = seg.x0 + (seg.x1 - seg.x0) * t, y = seg.y0 + (seg.y1 - seg.y0) * t;
  return { x, y, z: S7.groundZ(area, x, y), dx: seg.dx, dy: seg.dy, ang: Math.atan2(seg.dy, seg.dx) };
};
/** the shot that frames distance s on a leg */
S7.shotAt = (area, legId, s) => {
  const L = area.legs[legId], f = L.len ? s / L.len : 0;
  let shot = L.shots[0] || null;
  for (const sh of L.shots) if (f >= sh.from) shot = sh;
  return shot;
};

/** where a person stands: on the rail, a metre or so to one side */
S7.npcPos = (area, n) => {
  const q = S7.legAt(area, n.leg, n.at * area.legs[n.leg].len);
  return { x: q.x - q.dy * n.lat, y: q.y + q.dx * n.lat, z: q.z };
};
