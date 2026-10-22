// Stage definitions: the flight track (a curve along the distance axis), the atmosphere, radio chatter,
// seeded enemy formations, pickups, and the route fork. Stages are data; the game runtime reads them.
import { pick, rng } from './util.js';

const TRACK_SPEED = 110; // baseline forward speed, units per second

// Formation builders. Each returns spawn records consumed by the game.
// Records: { s, type, lx, ly, vs, vx, vy, phase } where s is track distance and lx/ly are lateral offsets.
const FORMATIONS = {
  fighterLine: (r, s) => {
    const n = 3 + Math.floor(r() * 3);
    const ly = (r() * 2 - 1) * 4;
    const span = 9 + r() * 6;
    return Array.from({ length: n }, (_, i) => ({ s, type: 'drone', lx: -span + (2 * span * i) / (n - 1), ly, vs: -44, vx: 0, vy: 0, phase: i * 0.6 }));
  },
  fighterVee: (r, s) => {
    const cx = (r() * 2 - 1) * 9;
    const cy = (r() * 2 - 1) * 4 + 2;
    return [0, 1, 2, 3, 4].map((i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor((i + 1) / 2);
      return { s: s - row * 6, type: 'drone', lx: cx + side * row * 3.4, ly: cy - row * 1.6, vs: -46, vx: 0, vy: 0, phase: i };
    });
  },
  serpentPair: (r, s) => {
    const side = r() < 0.5 ? -1 : 1;
    return [
      { s, type: 'serpent', lx: side * 15, ly: 3 + r() * 3, vs: -78, vx: -side * 4, vy: 0, phase: 0 },
      { s: s + 60, type: 'serpent', lx: -side * 15, ly: -3 - r() * 3, vs: -78, vx: side * 4, vy: 0, phase: 1 },
    ];
  },
  sentinelRow: (r, s, cfg) => {
    const lx = (r() * 2 - 1) * 9;
    return [0, 1, 2].map((i) => ({ s: s + i * 90, type: 'sentinel', lx, ly: cfg.floorLy ?? -5, vs: 0, vx: 0, vy: 0, phase: i }));
  },
  minefield: (r, s) => Array.from({ length: 6 }, (_, i) => ({
    s: s + i * 22 + r() * 8,
    type: 'mine',
    lx: (r() * 2 - 1) * 12,
    ly: (r() * 2 - 1) * 6,
    vs: 0, vx: 0, vy: 0, phase: i,
  })),
  hulkBomber: (r, s) => [{ s, type: 'hulk', lx: (r() * 2 - 1) * 10, ly: (r() * 2 - 1) * 3, vs: -24, vx: 0, vy: 0, phase: 0 }],
  drift: (r, s) => Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { s, type: 'drone', lx: Math.cos(a) * 6, ly: Math.sin(a) * 6, vs: -36, vx: 0, vy: 0, phase: a };
  }),
  asteroidBelt: (r, s) => Array.from({ length: 7 + Math.floor(r() * 5) }, () => ({
    s: s + (r() * 2 - 1) * 180,
    type: 'asteroid',
    lx: (r() * 2 - 1) * 20,
    ly: (r() * 2 - 1) * 10,
    vs: 0, vx: 0, vy: 0,
    r: 1.4 + r() * 2.6,
    phase: r() * 100,
  })),
  wallTurrets: (r, s, cfg) => [0, 1].map((i) => ({
    s: s + i * 140,
    type: 'sentinel',
    lx: (r() < 0.5 ? -1 : 1) * (cfg.wallLx - 2.2),
    ly: -2 + r() * 4,
    vs: 0, vx: 0, vy: 0, phase: i,
  })),
};

// Builds the enemy and obstacle timeline for a stage from weighted formation choices.
function generateSpawns(seed, from, to, every, mix, cfg) {
  const r = rng(seed);
  const out = [];
  let s = from;
  while (s < to) {
    const kind = pick(r, mix);
    const batch = FORMATIONS[kind](r, s, cfg);
    out.push(...batch);
    s += every * (0.7 + r() * 0.6);
  }
  return out;
}

const PICKUP_KINDS = ['repair', 'bomb', 'laser'];

function generatePickups(seed, from, to, count) {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => ({
    s: from + ((to - from) * (i + 0.5)) / count,
    lx: (r() * 2 - 1) * 10,
    ly: (r() * 2 - 1) * 5,
    kind: PICKUP_KINDS[i % PICKUP_KINDS.length],
  }));
}

// Track curves: x and y offsets along the distance axis.
const curves = {
  aurelia: (s) => ({ x: 26 * Math.sin(s * 0.0016), y: 9 * Math.sin(s * 0.0011 + 1) }),
  kessar: (s) => ({ x: 18 * Math.sin(s * 0.0021), y: 8 * Math.cos(s * 0.0017) }),
  solace: (s) => ({ x: 34 * Math.sin(s * 0.0012), y: 3 * Math.sin(s * 0.003) }),
  cinder: (s) => ({ x: 20 * Math.sin(s * 0.0014), y: -6 + 3 * Math.sin(s * 0.0025) }),
  vorrack: () => ({ x: 0, y: 0 }),
};

export const STAGES = {
  aurelia: {
    id: 'aurelia',
    name: 'Aurelia Approach',
    sub: 'Lylat outer ring',
    music: 'aurelia',
    env: 'space',
    length: 8600,
    speed: TRACK_SPEED,
    bounds: { x: 16, y: 9 },
    curve: curves.aurelia,
    atmosphere: { top: 0x0b1c4a, bottom: 0x4a2f6e, fog: 0x2a2456, sunColor: 0xffe2b8, hemiSky: 0xaec2ff, hemiGround: 0x3a2a4a },
    cfg: { floorLy: -5 },
    mix: ['fighterLine', 'fighterVee', 'serpentPair', 'drift', 'hulkBomber', 'minefield', 'sentinelRow'],
    spawns: null,
    pickups: null,
    fork: { s: 8400, left: 'kessar', right: 'solace' },
    boss: null,
    props: [
      { type: 'planet', s: 2400, lx: -420, ly: 180, r: 120, base: 0x6e3f8f, halo: 0xc58cff },
      { type: 'planet', s: 6200, lx: 520, ly: -60, r: 70, base: 0x2e6e7a, halo: 0x7fe7ff },
    ],
    radio: [
      { s: 300, who: 'marlow', text: 'Ace, this is Command. Aurelia sector is hot. Stay sharp.' },
      { s: 1400, who: 'rook', text: 'Dragoons on the scope. Stay on my wing, Ace.' },
      { s: 3300, who: 'tully', text: 'Sensors say the ring gates split into two routes ahead.' },
      { s: 5200, who: 'marlow', text: 'Heavy bomber inbound. Hit the engines to bring it down.' },
      { s: 7600, who: 'rook', text: 'Ring gates ahead! Fly through the blue gate for Kessar, red for Solace.' },
      { s: 8150, who: 'marlow', text: 'Pick a route, Ace. Both lead to Vorrack.' },
    ],
    briefing: 'The Vorrack empire has pushed into the Aurelia ring. Cut through the dragoon screen and choose your route to the Vorrack homeworld.',
  },
  kessar: {
    id: 'kessar',
    name: 'Kessar Debris Belt',
    sub: 'Route A: shattered moon belt',
    music: 'kessar',
    env: 'belt',
    length: 10200,
    speed: TRACK_SPEED,
    bounds: { x: 18, y: 10 },
    curve: curves.kessar,
    atmosphere: { top: 0x04050e, bottom: 0x1b1a30, fog: 0x0c0c18, sunColor: 0xfff0dd, hemiSky: 0x8ea0c8, hemiGround: 0x1a1c2a, fogNear: 220, fogFar: 1300 },
    cfg: { floorLy: -5 },
    mix: ['asteroidBelt', 'asteroidBelt', 'fighterLine', 'serpentPair', 'minefield', 'drift'],
    spawns: null,
    pickups: null,
    fork: null,
    boss: null,
    props: [
      { type: 'planet', s: 3400, lx: 380, ly: 120, r: 160, base: 0x3a3f58, halo: 0x6f7fbf },
    ],
    radio: [
      { s: 300, who: 'tully', text: 'Kessar belt. Fragments everywhere. Watch the rock, Ace.' },
      { s: 2600, who: 'rook', text: 'Dragoons are using the debris as cover. Flush them out.' },
      { s: 5000, who: 'marlow', text: 'Lasers chip the rock. Lock on to pick off the escorts.' },
      { s: 8200, who: 'tully', text: 'Fighters ahead. Roll to deflect their shots.' },
      { s: 9500, who: 'marlow', text: 'Clear of the belt soon. Good flying, Ace.' },
    ],
    briefing: 'Route A runs through the Kessar debris belt. Asteroids block your lasers and your path. Destroy the escorts and keep moving.',
  },
  solace: {
    id: 'solace',
    name: 'Solace Canyon',
    sub: 'Route B: ground-hugging gorge',
    music: 'solace',
    env: 'canyon',
    length: 10000,
    speed: TRACK_SPEED,
    bounds: { x: 10, y: 6 },
    curve: curves.solace,
    atmosphere: { top: 0x3b6fb0, bottom: 0xe8a86a, fog: 0xd8966a, sunColor: 0xffc890, hemiSky: 0xffd6a8, hemiGround: 0x5a3a2a, fogNear: 200, fogFar: 1400 },
    cfg: { floorLy: -5, wallLx: 12 },
    mix: ['fighterVee', 'sentinelRow', 'wallTurrets', 'serpentPair', 'hulkBomber', 'fighterLine'],
    spawns: null,
    pickups: null,
    fork: null,
    boss: null,
    props: [],
    radio: [
      { s: 300, who: 'marlow', text: 'Route B: Solace Canyon. Walls are close, keep your wings level.' },
      { s: 2500, who: 'rook', text: 'Turrets on the canyon wall! Barrel roll to deflect their fire.' },
      { s: 5200, who: 'tully', text: 'Hulk bomber coming down the gorge. Hit its engines.' },
      { s: 8000, who: 'marlow', text: 'Dragoon wings ahead. Rapid lasers, Ace.' },
      { s: 9500, who: 'rook', text: 'Canyon opens up. Cinder Dunes ahead. Nice work.' },
    ],
    briefing: 'Route B cuts through Solace Canyon. Wall turrets cover the gorge; the canyon walls are your hard limits.',
  },
  cinder: {
    id: 'cinder',
    name: 'Cinder Dunes',
    sub: 'Open sky over the dunes',
    music: 'cinder',
    env: 'dunes',
    length: 10400,
    speed: TRACK_SPEED,
    bounds: { x: 17, y: 8 },
    curve: curves.cinder,
    atmosphere: { top: 0x2c6ba8, bottom: 0xf2c48a, fog: 0xe5c08e, sunColor: 0xffe6b0, hemiSky: 0xffe7c0, hemiGround: 0x6a4a2a, fogNear: 260, fogFar: 1800 },
    cfg: { floorLy: -4 },
    mix: ['fighterVee', 'fighterLine', 'sentinelRow', 'hulkBomber', 'serpentPair', 'minefield', 'drift'],
    spawns: null,
    pickups: null,
    fork: null,
    boss: null,
    props: [],
    radio: [
      { s: 300, who: 'marlow', text: 'Cinder Dunes. Low altitude, long sight lines. Stay low.' },
      { s: 3000, who: 'tully', text: 'Sentinels in the dunes. They track you, so keep moving.' },
      { s: 6000, who: 'rook', text: 'Vorrack command ship on long-range scan. Brace for an assault.' },
      { s: 9000, who: 'marlow', text: 'The Vorrack Citadel is ahead. This is the last push, Ace.' },
      { s: 10000, who: 'rook', text: 'Titan signature confirmed. All wings, form up.' },
    ],
    briefing: 'Cinder Dunes lies between the canyon and the Citadel. Sentinels track low; use boost and brake to break their lock.',
  },
  vorrack: {
    id: 'vorrack',
    name: 'Vorrack Citadel',
    sub: 'Boss: the Vorrack Titan',
    music: 'vorrack',
    env: 'citadel',
    length: 6600,
    speed: TRACK_SPEED,
    bounds: { x: 17, y: 9 },
    curve: curves.vorrack,
    atmosphere: { top: 0x0a0010, bottom: 0x3a0b22, fog: 0x2a0a1c, sunColor: 0xff9a7a, hemiSky: 0xff8a7a, hemiGround: 0x2a0a1c, fogNear: 240, fogFar: 1500 },
    cfg: { floorLy: -5 },
    mix: ['fighterLine', 'serpentPair', 'drift', 'hulkBomber', 'minefield'],
    spawns: null,
    pickups: null,
    fork: null,
    boss: { s: 5600, name: 'Vorrack Titan' },
    props: [
      { type: 'planet', s: 5800, lx: -300, ly: 140, r: 180, base: 0x2a0a18, halo: 0xff3a6a },
    ],
    radio: [
      { s: 300, who: 'marlow', text: 'Citadel defenses are active. Expect everything they have.' },
      { s: 2400, who: 'rook', text: 'Dragoons from the spires. Keep formation.' },
      { s: 4600, who: 'tully', text: 'Titan core is shielded by two gun pods. Take the pods down first.' },
      { s: 5400, who: 'marlow', text: 'Titan shields collapsing... core is exposed. Now, Ace!' },
    ],
    briefing: 'The Vorrack Citadel guards the homeworld. Destroy the Titan\'s gun pods, then strike the exposed core.',
  },
};

// Fill in spawns and pickups once, from fixed seeds, so every playthrough is identical.
const SEEDS = { aurelia: 101, kessar: 202, solace: 303, cinder: 404, vorrack: 505 };
for (const id of Object.keys(STAGES)) {
  const st = STAGES[id];
  const cfg = st.cfg;
  const from = 700;
  const to = st.length - 700;
  const every = id === 'kessar' ? 300 : 430;
  const spawns = generateSpawns(SEEDS[id], from, to, every, st.mix, cfg);
  if (st.env === 'belt') spawns.push(...generateSpawns(SEEDS[id] + 1, from, to, 260, ['asteroidBelt'], cfg));
  if (st.env === 'canyon') spawns.push(...generateSpawns(SEEDS[id] + 2, from, to, 900, ['wallTurrets'], cfg));
  if (st.fork) spawns.push(...generateSpawns(SEEDS[id] + 3, 2600, st.fork.s - 900, 1400, ['hulkBomber'], cfg));
  spawns.sort((a, b) => a.s - b.s);
  st.spawns = spawns;
  st.pickups = generatePickups(SEEDS[id] + 9, 900, st.length - 900, 8);
}

// Route order in the campaign. Aurelia forks to Kessar or Solace, both then lead to Cinder, then the Citadel.
export const CAMPAIGN_ORDER = ['aurelia', 'kessar', 'solace', 'cinder', 'vorrack'];

export function nextStage(id, route) {
  if (id === 'aurelia') return route || 'kessar';
  if (id === 'kessar' || id === 'solace') return 'cinder';
  if (id === 'cinder') return 'vorrack';
  return null;
}
