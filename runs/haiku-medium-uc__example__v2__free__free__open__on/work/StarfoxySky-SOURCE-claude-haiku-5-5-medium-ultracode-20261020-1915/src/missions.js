// Mission definitions. A mission is a distance-driven script: each event fires
// when the ship's travelled distance reaches `d`. Enemies are spawned `AHEAD`
// units in front of the ship so they arrive on screen, not on top of it.

import { makeDrone, makeInterceptor, makeTurret, makeGunship } from './enemies.js';

export const AHEAD = 190;

const at = (d, run) => ({ d, run });
const zAhead = (d, extra = 0) => -(d + AHEAD + extra);

// A V-shaped formation of drones, pointing at the ship.
function formationV(g, cx, cy, d, n = 5, spacing = 5) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.ceil(i / 2);
    g.addEnemy(makeDrone(g, cx + side * k * spacing, cy - k * 2.4, zAhead(d, k * 6), { amp: 2.5, w: 1.6, vz: 0 }));
  }
}

function lineDrones(g, cx, cy, d, n, spacing, amp = 5) {
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * spacing;
    g.addEnemy(makeDrone(g, x, cy, zAhead(d), { amp, w: 1.2 + Math.random() * 0.4, every: 2.2 + Math.random() }));
  }
}

function turretPair(g, d, x) {
  for (const sx of [-x, x]) {
    const z = zAhead(d, Math.random() * 20);
    const y = g.world.groundY(sx, z) + 0.6;
    g.addEnemy(makeTurret(g, sx, y, z));
  }
}

function ringLine(g, d, n, y = 0) {
  for (let i = 0; i < n; i++) g.addPickup('ring', (i - (n - 1) / 2) * 6, y, zAhead(d));
}

// Continuous asteroid field used by the Belt route.
function beltField(from, to, step = 26) {
  const out = [];
  for (let d = from; d < to; d += step) {
    out.push(at(d, (g) => {
      const n = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const size = 0.9 + Math.random() * 1.8;
        const model = ['rock0', 'rock1', 'rock2'][Math.floor(Math.random() * 3)];
        const x = (Math.random() * 2 - 1) * 26;
        const y = (Math.random() * 2 - 1) * 10;
        const z = zAhead(d, Math.random() * 40);
        const vel = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 1.5, z: 0 };
        g.addRock(model, x, y, z, size, vel);
      }
    }));
  }
  return out;
}

// Pillars alternate sides through the canyon.
function canyonPillars(from, to, step = 140) {
  const out = [];
  let side = -1;
  for (let d = from; d < to; d += step) {
    const x = side * (4 + Math.random() * 3);
    side *= -1;
    out.push(at(d, (g) => g.world.addPillar(x, zAhead(d), 26)));
  }
  return out;
}

export const MISSIONS = [
  {
    id: 'training',
    name: 'Training Sortie',
    env: 'plains',
    speed: 34,
    length: 2400,
    map: { col: 0, row: 1 },
    music: { name: 'training', bpm: 118, roots: [45, 41, 43, 48], minor: true, lead: true, hats: true },
    briefing: [
      'A quiet sky over the plains. Learn the ship, then go.',
      'Targets are drones, turrets and interceptors. Watch for hints on screen.',
    ],
    script: [
      at(0, (g) => g.say('Command', 'Welcome, pilot. Training sortie: fly the lane and stay sharp.', 5)),
      at(30, (g) => g.hint('LEFT STICK  Fly across the lane', 6)),
      at(200, (g) => g.hint('CROSS  Fire lasers. Hold for rapid fire.', 6)),
      at(320, (g) => lineDrones(g, 0, 1, 320, 5, 6)),
      at(450, (g) => g.hint('SQUARE  Hold to lock on, release to launch homing missiles.', 7)),
      at(520, (g) => formationV(g, 0, 3, 520, 5)),
      at(700, (g) => g.hint('L1 / R1  Barrel roll. Deflects enemy shots and dodges.', 6)),
      at(800, (g) => turretPair(g, 800, 10)),
      at(960, (g) => g.hint('CIRCLE  Smart bomb. You have three per sortie.', 6)),
      at(1000, (g) => g.addPickup('bomb', 0, 0, zAhead(1000))),
      at(1120, (g) => {
        g.addEnemy(makeInterceptor(g, -8, 2, zAhead(1120)));
        g.addEnemy(makeInterceptor(g, 8, -2, zAhead(1120, 20)));
      }),
      at(1280, (g) => g.hint('TRIANGLE  Boost.     L2  Brake.', 6)),
      at(1400, (g) => g.addEnemy(makeGunship(g, 0, 0, zAhead(1400)))),
      at(1650, (g) => g.addPickup('heal', 6, 0, zAhead(1650))),
      at(1700, (g) => lineDrones(g, 0, 0, 1700, 7, 5, 7)),
      at(1950, (g) => ringLine(g, 1950, 5)),
      at(2150, (g) => g.say('Command', 'Good flying. Sky Plains is next. Your call on the route.', 5)),
    ],
  },
  {
    id: 'plains',
    name: 'Sky Plains',
    env: 'plains',
    speed: 40,
    length: 5200,
    map: { col: 1, row: 1 },
    music: { name: 'plains', bpm: 124, roots: [45, 41, 43, 40], minor: true, lead: true, hats: true },
    briefing: [
      'Hostile armor is massing over the plains. Clear the sky and keep the ring line intact.',
      'Route fork ahead: the Canyon Run or the Asteroid Belt.',
    ],
    script: [
      at(0, (g) => g.say('Command', 'Plains sector. Enemy fighters incoming on your six.', 4)),
      at(180, (g) => lineDrones(g, 0, 2, 180, 6, 6)),
      at(420, (g) => turretPair(g, 420, 12)),
      at(600, (g) => formationV(g, -6, 4, 600, 5)),
      at(780, (g) => g.addPickup('heal', -5, 0, zAhead(780))),
      at(900, (g) => { g.addEnemy(makeInterceptor(g, -10, 3, zAhead(900))); g.addEnemy(makeInterceptor(g, 10, 0, zAhead(900))); }),
      at(1100, (g) => ringLine(g, 1100, 7, 3)),
      at(1300, (g) => g.addEnemy(makeGunship(g, -8, 2, zAhead(1300)))),
      at(1500, (g) => g.say('Rook', 'Gunship on the left. Keep your lasers on it.', 4)),
      at(1600, (g) => { turretPair(g, 1600, 8); turretPair(g, 1620, 16); }),
      at(1850, (g) => lineDrones(g, 0, 0, 1850, 8, 4.5, 6)),
      at(2100, (g) => g.addPickup('bomb', 4, 2, zAhead(2100))),
      at(2200, (g) => formationV(g, 0, 5, 2200, 7)),
      at(2450, (g) => g.addEnemy(makeGunship(g, 0, 0, zAhead(2450)))),
      at(2700, (g) => ringLine(g, 2700, 6, -2)),
      at(2950, (g) => g.say('Command', 'Fork in the route. Canyon Run or Asteroid Belt, pilot.', 5)),
      at(3100, (g) => lineDrones(g, 0, 3, 3100, 6, 5)),
      at(3400, (g) => { turretPair(g, 3400, 14); g.addEnemy(makeInterceptor(g, 0, 6, zAhead(3400))); }),
      at(3700, (g) => g.addPickup('heal', 0, 0, zAhead(3700))),
      at(3900, (g) => formationV(g, 6, 2, 3900, 5)),
      at(4200, (g) => g.addEnemy(makeGunship(g, 8, 0, zAhead(4200)))),
      at(4500, (g) => ringLine(g, 4500, 5, 0)),
      at(4800, (g) => g.say('Rook', 'Sky clear for now. Keep moving.', 4)),
    ],
  },
  {
    id: 'canyon',
    name: 'Canyon Run',
    env: 'canyon',
    speed: 38,
    length: 4400,
    map: { col: 2, row: 0 },
    music: { name: 'canyon', bpm: 140, roots: [38, 41, 36, 43], minor: true, lead: true, hats: true },
    briefing: [
      'Narrow canyon, rock spires every few hundred meters. Thread the gaps.',
      'Pillars and walls will stop you cold. Hit them and you lose hull.',
    ],
    script: [
      at(0, (g) => g.say('Command', 'Canyon Run. Stay between the walls and watch the spires.', 5)),
      ...canyonPillars(220, 4100, 170),
      at(300, (g) => lineDrones(g, 0, 2, 300, 5, 6)),
      at(520, (g) => { turretPair(g, 520, 9); }),
      at(700, (g) => g.addPickup('heal', 0, 0, zAhead(700))),
      at(860, (g) => formationV(g, 0, 4, 860, 5)),
      at(1040, (g) => g.addEnemy(makeInterceptor(g, -6, 2, zAhead(1040)))),
      at(1200, (g) => ringLine(g, 1200, 5, 1)),
      at(1400, (g) => g.say('Kira', 'Walls on both sides. Our turrets are stacked on the rim.', 4)),
      at(1500, (g) => { turretPair(g, 1500, 9); turretPair(g, 1530, 7); }),
      at(1750, (g) => g.addEnemy(makeGunship(g, 0, 3, zAhead(1750)))),
      at(1950, (g) => g.addPickup('bomb', 0, 0, zAhead(1950))),
      at(2100, (g) => lineDrones(g, 0, 4, 2100, 7, 4, 4)),
      at(2350, (g) => { g.addEnemy(makeInterceptor(g, -5, 0, zAhead(2350))); g.addEnemy(makeInterceptor(g, 5, 0, zAhead(2350, 25))); }),
      at(2600, (g) => ringLine(g, 2600, 6, 2)),
      at(2800, (g) => { turretPair(g, 2800, 8); }),
      at(3000, (g) => formationV(g, 0, 2, 3000, 6)),
      at(3300, (g) => g.addEnemy(makeGunship(g, -6, 1, zAhead(3300)))),
      at(3600, (g) => g.addPickup('heal', 3, 0, zAhead(3600))),
      at(3800, (g) => lineDrones(g, 0, 2, 3800, 6, 5)),
      at(4100, (g) => g.say('Command', 'Canyon mouth ahead. Hold formation.', 4)),
    ],
  },
  {
    id: 'belt',
    name: 'Asteroid Belt',
    env: 'belt',
    speed: 40,
    length: 4600,
    map: { col: 2, row: 2 },
    music: { name: 'belt', bpm: 110, roots: [40, 38, 41, 36], minor: false, lead: true, hats: false },
    briefing: [
      'Rock field in open space. Shoot big rocks to break them up, and watch the drift.',
      'Ram a rock and the hull takes the hit.',
    ],
    script: [
      at(0, (g) => g.say('Command', 'Asteroid belt. No ground here, just rock and enemy patrols.', 5)),
      ...beltField(60, 4300, 30),
      at(300, (g) => lineDrones(g, 0, 0, 300, 5, 6)),
      at(600, (g) => g.addPickup('heal', 0, 0, zAhead(600))),
      at(800, (g) => formationV(g, 0, 3, 800, 5)),
      at(1000, (g) => { g.addEnemy(makeInterceptor(g, -8, 0, zAhead(1000))); g.addEnemy(makeInterceptor(g, 8, 2, zAhead(1000, 20))); }),
      at(1200, (g) => ringLine(g, 1200, 6, 0)),
      at(1450, (g) => g.addEnemy(makeGunship(g, 0, 0, zAhead(1450)))),
      at(1650, (g) => g.say('Kira', 'Rocks are shielding their patrols. Break them open.', 4)),
      at(1800, (g) => lineDrones(g, -4, -2, 1800, 6, 5, 6)),
      at(2050, (g) => g.addPickup('bomb', -4, 0, zAhead(2050))),
      at(2200, (g) => formationV(g, 6, 0, 2200, 7)),
      at(2500, (g) => g.addEnemy(makeGunship(g, 6, 2, zAhead(2500)))),
      at(2750, (g) => ringLine(g, 2750, 6, -1)),
      at(3000, (g) => { g.addEnemy(makeInterceptor(g, 0, 4, zAhead(3000))); g.addEnemy(makeInterceptor(g, -5, -3, zAhead(3000, 20))); }),
      at(3250, (g) => lineDrones(g, 0, 2, 3250, 7, 4.5, 5)),
      at(3500, (g) => g.addPickup('heal', 0, 3, zAhead(3500))),
      at(3750, (g) => g.addEnemy(makeGunship(g, -6, 0, zAhead(3750)))),
      at(4050, (g) => g.say('Command', 'Last stretch of the belt. Stay sharp.', 4)),
    ],
  },
  {
    id: 'core',
    name: 'Venom Core',
    env: 'core',
    speed: 36,
    length: 1600,
    boss: true,
    map: { col: 3, row: 1 },
    music: { name: 'core', bpm: 150, roots: [37, 35, 39, 34], minor: true, lead: true, hats: true, kick: true },
    briefing: [
      'The Venom Core is a fortress with two shield generators and four turrets.',
      'Break both shields to expose the core. Turrets down, it fires rings. Finish it.',
    ],
    script: [
      at(0, (g) => g.say('Command', 'Venom Core ahead. Its shields will hold until the generators fall.', 6)),
      at(150, (g) => lineDrones(g, 0, 2, 150, 6, 6)),
      at(350, (g) => formationV(g, 0, 4, 350, 5)),
      at(500, (g) => g.addPickup('heal', -4, 0, zAhead(500))),
      at(650, (g) => { g.addEnemy(makeInterceptor(g, -8, 2, zAhead(650))); g.addEnemy(makeInterceptor(g, 8, 0, zAhead(650, 20))); }),
      at(850, (g) => g.addEnemy(makeGunship(g, 0, 2, zAhead(850)))),
      at(1050, (g) => g.addPickup('bomb', 0, 0, zAhead(1050))),
      at(1200, (g) => lineDrones(g, 0, 3, 1200, 6, 5, 5)),
      at(1420, (g) => g.say('Kira', 'Core signature on the scope. Get ready, pilot.', 4)),
      at(1500, (g) => g.spawnBoss()),
    ],
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id);
}

// Unlock chain: Training -> Sky Plains -> (Canyon Run | Asteroid Belt) -> Venom Core.
export function isUnlocked(id, done) {
  switch (id) {
    case 'training': return true;
    case 'plains': return !!done.training;
    case 'canyon':
    case 'belt': return !!done.plains;
    case 'core': return !!(done.canyon || done.belt);
    default: return false;
  }
}
