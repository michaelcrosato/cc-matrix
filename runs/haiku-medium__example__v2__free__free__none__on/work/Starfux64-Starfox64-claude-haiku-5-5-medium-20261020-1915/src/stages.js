// Stage definitions and a seeded script generator. Each stage is a long track along -Z.
// Events are placed at track distance `at`; the game spawns them when they come within range.

export const STAGES = [
  {
    id: 1,
    name: 'Corvane Outskirts',
    blurb: 'Ground batteries and a canyon run',
    length: 5200,
    bgm: 'stage1',
    seed: 1101,
    sky: { top: 0x1b3c78, horizon: 0xffb88a },
    fog: { color: 0xd9b38a, near: 260, far: 1150 },
    ground: { y: -16, colA: 0x7aa35f, colB: 0x6b9150, scale: 0.02 },
    pillars: true,
    weights: { squad: 4, turrets: 3, ring: 1.4, rocks: 0 },
    comms: [
      { at: 180, who: 'Rook', text: 'Ground batteries ahead. Stay low and keep moving.' },
      { at: 1500, who: 'Mira', text: 'Venom squadron on the left. Weapons hot!' },
      { at: 2800, who: 'Ortega', text: 'Hold a barrel roll when their bolts come close. It deflects them.' },
      { at: 4300, who: 'Rook', text: 'Canyon exit in sight. Keep the speed up.' },
    ],
  },
  {
    id: 2,
    name: 'Shear Belt',
    blurb: 'Tumbling rock and squadron fights',
    length: 5600,
    bgm: 'stage2',
    seed: 2202,
    sky: { top: 0x03040a, horizon: 0x1a2440 },
    fog: { color: 0x0b1020, near: 300, far: 1200 },
    ground: null,
    pillars: false,
    weights: { squad: 3, turrets: 0, ring: 1.2, rocks: 4 },
    comms: [
      { at: 200, who: 'Ortega', text: 'Asteroid belt. Watch your shield and the rock sizes.' },
      { at: 2000, who: 'Mira', text: 'Locking on takes a hold of fire. Release to launch homing missiles.' },
      { at: 3400, who: 'Rook', text: 'Bomb rings are gold. Grab them, you will need them.' },
      { at: 4900, who: 'Ortega', text: 'The Dreadnought is ahead. Get ready.' },
    ],
  },
  {
    id: 3,
    name: 'Morrow Dreadnought',
    blurb: 'Destroy the batteries, then the core',
    length: 4200,
    bgm: 'boss',
    seed: 3303,
    sky: { top: 0x12061f, horizon: 0x4a1a3c },
    fog: { color: 0x1a0a1e, near: 260, far: 1100 },
    ground: null,
    pillars: false,
    boss: true,
    weights: { squad: 3, turrets: 0, ring: 1.0, rocks: 1 },
    comms: [
      { at: 150, who: 'Ortega', text: 'Dreadnought sighted. Shield generators on both flanks.' },
      { at: 1400, who: 'Mira', text: 'Batteries are taking it. Keep the pressure on!' },
    ],
  },
];

// Seeded PRNG (mulberry32), so each stage is the same every run.
function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Picks an event kind from the stage's weights.
function pickKind(stage, r) {
  const entries = Object.entries(stage.weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [k, w] of entries) {
    if ((x -= w) < 0) return k;
  }
  return entries[0][0];
}

export function buildScript(stage) {
  const r = rng32(stage.seed);
  const events = [];
  let at = 320;
  const end = stage.boss ? stage.length - 420 : stage.length - 260;
  let i = 0;
  while (at < end) {
    const kind = pickKind(stage, r());
    const ev = { at, kind, id: i++ };
    if (kind === 'squad') {
      ev.x = (r() - 0.5) * 24;
      ev.y = 2 + r() * 8;
      ev.count = 3 + Math.floor(r() * 2);
      ev.vz = 14 + r() * 8;
      ev.hp = 2;
    } else if (kind === 'turrets') {
      ev.count = 3 + Math.floor(r() * 3);
      ev.span = 22;
    } else if (kind === 'rocks') {
      ev.count = 9 + Math.floor(r() * 9);
      ev.span = 170;
    } else if (kind === 'ring') {
      ev.x = (r() - 0.5) * 24;
      ev.y = (r() - 0.5) * 12;
      ev.bomb = r() < 0.35;
    }
    events.push(ev);
    at += 110 + r() * 80;
  }
  // A bomb ring halfway through each stage so the bomb is always learnable.
  events.push({ at: stage.length * 0.5, kind: 'ring', x: 0, y: 0, bomb: true, id: 900 });
  events.sort((a, b) => a.at - b.at);
  return events;
}
