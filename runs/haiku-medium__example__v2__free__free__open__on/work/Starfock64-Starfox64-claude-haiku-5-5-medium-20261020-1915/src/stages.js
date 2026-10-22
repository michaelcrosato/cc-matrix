// Mission scripts. Each stage is a time-ordered list of events that the Game runs.
// Events receive the Game and call its spawn helpers. Enemies spawned by a script
// are "required": the stage clears only when all of them are gone.

const V = (n) => n; // readability for formation sizes

export const SPEAKERS = {
  COMMAND: { name: 'COMMAND', color: '#ffd54a' },
  IVY: { name: 'IVY', color: '#7fe9ff' },
  ROOK: { name: 'ROOK', color: '#9dff8a' },
};

function ringLine(g, z, count, y = 1) {
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 5.5;
    g.spawnRing(x, y + Math.sin(i * 0.9) * 1.8, z - i * 1.8);
  }
}

function ringArc(g, z, count) {
  for (let i = 0; i < count; i++) {
    const a = (i / (count - 1)) * Math.PI;
    g.spawnRing(Math.cos(a) * 9, 1 + Math.sin(a) * 4.5, z - i * 3);
  }
}

function fighterV(g, n, z, kind = 'fighter', x0 = 0) {
  for (let i = 0; i < n; i++) {
    const off = Math.abs(i - (n - 1) / 2);
    g.spawn(kind, x0 + (i - (n - 1) / 2) * 4.2, 3 + off * 1.2, z - off * 6, { phase: i * 0.8 });
  }
}

function drones(g, n, z) {
  for (let i = 0; i < n; i++) {
    g.spawn('drone', (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 8 + 2, z - Math.random() * 16, { phase: Math.random() * 6 });
  }
}

function turrets(g, n, z) {
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 4.8;
    g.spawn('turret', x, -3.2, z - (i % 2) * 6);
  }
}

function fighterAmbush(g, z) {
  fighterV(g, 3, z, 'fighter', -7);
  fighterV(g, 3, z, 'fighter', 7);
}

function shower(g, n) {
  for (let i = 0; i < n; i++) {
    g.spawnAsteroid(
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 16 + 1,
      -120 - Math.random() * 60,
      1.4 + Math.random() * 1.6,
    );
  }
}

export const STAGES = [
  {
    id: 'plains',
    name: 'Ridgeback Plains',
    brief: 'Low-altitude assault over turret-studded ridges. Keep clear of the ground fire, and take down the gunship.',
    music: 'plains',
    env: 'plains',
    scroll: 26,
    length: 110,
    events: [
      { t: 0.5, run: (g) => g.radio('COMMAND', 'Pilot, welcome to Ridgeback. Keep low and watch the turrets.') },
      { t: 3, run: (g) => fighterV(g, V(4), -130) },
      { t: 5.5, run: (g) => g.radio('IVY', 'Copy. Scanners show fighters inbound, bearing north.') },
      { t: 9, run: (g) => turrets(g, 5, -120) },
      { t: 14, run: (g) => ringLine(g, -150, 7) },
      { t: 20, run: (g) => drones(g, 10, -110) },
      { t: 28, run: (g) => g.radio('ROOK', 'Ground pods! Lock on and clear them, Pilot.') },
      { t: 30, run: (g) => { g.spawn('bomber', -6, 2, -140); g.spawn('bomber', 6, 2, -150); } },
      { t: 38, run: (g) => fighterAmbush(g, -120) },
      { t: 46, run: (g) => ringArc(g, -140, 5) },
      { t: 52, run: (g) => { turrets(g, 6, -110); fighterV(g, 2, -130); } },
      { t: 62, run: (g) => g.radio('COMMAND', 'Warning. Heavy gunship inbound.') },
      { t: 64, run: (g) => g.banner('WARNING', 'Gunship approaching', 'warn') },
      { t: 66, run: (g) => g.spawn('gunship', 0, 2.5, -150, { required: true }) },
      { t: 80, run: (g) => drones(g, 8, -110) },
      { t: 92, run: (g) => ringLine(g, -140, 7) },
      { t: 100, run: (g) => fighterV(g, 4, -130) },
    ],
  },
  {
    id: 'belt',
    name: 'Shardfall Belt',
    brief: 'Open space through a shattered moon belt. Break asteroids with lasers and missiles. Destroy the Warden carrier\'s side pods, then its core.',
    music: 'belt',
    env: 'space',
    scroll: 30,
    length: 120,
    events: [
      { t: 0.5, run: (g) => g.radio('COMMAND', 'Shardfall Belt. Asteroids move fast. Shoot them before they reach you.') },
      { t: 2, run: (g) => shower(g, 12) },
      { t: 6, run: (g) => fighterV(g, 4, -130) },
      { t: 14, run: (g) => ringLine(g, -150, 7, 0) },
      { t: 20, run: (g) => shower(g, 10) },
      { t: 26, run: (g) => { fighterAmbush(g, -120); } },
      { t: 34, run: (g) => drones(g, 12, -110) },
      { t: 40, run: (g) => { g.spawn('bomber', -8, 0, -150); g.spawn('bomber', 8, 0, -150); } },
      { t: 48, run: (g) => ringArc(g, -130, 5) },
      { t: 56, run: (g) => g.radio('IVY', 'Scanners picking up a carrier ahead. Stay sharp.') },
      { t: 62, run: (g) => g.radio('ROOK', 'Ring gates ahead. Fly through them to restore shields.') },
      { t: 70, run: (g) => { shower(g, 14); fighterV(g, 3, -130); } },
      { t: 80, run: (g) => g.banner('WARNING', 'Warden carrier', 'warn') },
      { t: 82, run: (g) => g.spawn('carrier', 0, 1, -170, { required: true, boss: true }) },
      { t: 84, run: (g) => g.radio('COMMAND', "That's the Warden. Take out the side pods, then the core.") },
    ],
  },
];

export const WAVE_HELPERS = { fighterV, drones, turrets, shower };
