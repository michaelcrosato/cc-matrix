import { spawnEnemy, spawnPickup, enemies } from './entities.js';
import { player } from './player.js';

// Stage data: time-based scripts that spawn waves ahead of the ship, drop rings and play dialogue.
// Spawn distance is measured ahead of the ship's facing, so waves still work after a U-turn.

const AHEAD = 200;

function ahead(dist) {
  return -player.facing * dist;
}

function spawn(type, x, y, dist, extra) {
  return spawnEnemy(type, x, y, ahead(dist), extra);
}

function ring(x, y, dist) {
  spawnPickup('ring', x, y, ahead(dist));
}

// Each stage has a `script` of { t, run(say) } entries plus a length or boss-clear condition.
export const ROUTES = {
  alpha: {
    id: 'alpha',
    name: 'Sector Alpha: Venom Approach',
    palette: 'space',
    briefing: 'Venom fighters are massing ahead. Hold the line and keep your lock-on sharp.',
    length: 70,
    bossStage: false,
    script: [
      { t: 2, say: ['Capt. Vance', 'Vector, you are cleared for launch. Watch for the first Venom wing.'] },
      { t: 4, run: () => { for (let i = 0; i < 4; i++) spawn('fighter', -7 + i * 4.6, 3.5, AHEAD + i * 8); } },
      { t: 9, run: () => { for (let i = 0; i < 3; i++) spawn('fighter', 6 - i * 6, 1.2, AHEAD); } },
      { t: 12, say: ['Mira', 'Contacts on the left flank. Lock and release, Vector. Missiles will do the rest.'] },
      { t: 14, run: () => { spawn('interceptor', -6, 5, AHEAD); spawn('interceptor', 6, 5, AHEAD + 20); } },
      { t: 18, run: () => { for (let i = 0; i < 5; i++) ring(-8 + i * 4, 2.5, AHEAD - 30); } },
      { t: 24, run: () => { for (let i = 0; i < 4; i++) spawn('fighter', -8 + i * 5.3, 4 - (i % 2) * 2, AHEAD + i * 10); } },
      { t: 28, say: ['Dr. Holt', 'Shield is holding at ninety percent. Barrel roll deflects shots, use it when they line up.'] },
      { t: 30, run: () => { spawn('interceptor', 0, 6, AHEAD); spawn('interceptor', -9, 2, AHEAD + 15); spawn('interceptor', 9, 2, AHEAD + 15); } },
      { t: 36, run: () => { for (let i = 0; i < 6; i++) ring(-9 + i * 3.6, 4 + Math.sin(i) * 1.5, AHEAD - 40); spawnPickup('bomb', 0, 3, ahead(AHEAD - 60)); } },
      { t: 42, run: () => { spawn('striker', 0, 3, AHEAD + 40); } },
      { t: 44, say: ['Capt. Vance', 'Striker in the lane. Lock its engines and boost past the broadside.'] },
      { t: 50, run: () => { for (let i = 0; i < 5; i++) spawn('fighter', -9 + i * 4.5, 2.5 + (i % 2), AHEAD); } },
      { t: 56, run: () => { spawn('interceptor', -5, 4, AHEAD); spawn('interceptor', 5, 4, AHEAD + 10); spawn('interceptor', 0, 6, AHEAD + 20); } },
      { t: 62, say: ['Mira', 'Route split ahead. Canyon is faster but hotter. Station is slower and has more guns.'] },
      { t: 64, run: () => { for (let i = 0; i < 4; i++) ring(-6 + i * 4, 2.5, AHEAD - 50); } },
    ],
    onComplete: 'choose-route',
  },

  canyon: {
    id: 'canyon',
    name: 'Route B: Canyon Run',
    palette: 'canyon',
    briefing: 'Walls are lined with turrets. Stay low, stay fast, stay alive.',
    length: 60,
    bossStage: false,
    script: [
      { t: 2, say: ['Capt. Vance', 'Canyon run. The walls have turrets. Keep the nose down and move.'] },
      { t: 4, run: () => { for (const x of [-11, 11]) spawn('turret', x, -4, AHEAD); } },
      { t: 8, run: () => { for (const x of [-11, 11]) spawn('turret', x, -4, AHEAD - 20); spawn('interceptor', 0, 3, AHEAD); } },
      { t: 12, run: () => { for (let i = 0; i < 6; i++) ring(-7 + (i % 3) * 7, 1 + Math.floor(i / 3) * 3, AHEAD - 10); } },
      { t: 16, run: () => { for (let i = 0; i < 4; i++) spawn('fighter', -9 + i * 6, 4, AHEAD + i * 8); } },
      { t: 22, say: ['Dr. Holt', 'Turret shells arc slowly. Boost across the lane to beat them.'] },
      { t: 24, run: () => { for (const x of [-11, 0, 11]) spawn('turret', x, -4, AHEAD); spawn('interceptor', x * 0.6, 4, AHEAD + 10); } },
      { t: 30, run: () => { spawnPickup('shield', 0, 3, ahead(AHEAD - 40)); spawnPickup('bomb', -6, 2, ahead(AHEAD - 50)); } },
      { t: 34, run: () => { for (let i = 0; i < 5; i++) spawn('turret', -11 + i * 5.5, -4, AHEAD - (i % 2) * 15); } },
      { t: 40, say: ['Mira', 'Interceptors on the right. Lock them, release, then break left.'] },
      { t: 42, run: () => { spawn('interceptor', 8, 3, AHEAD); spawn('interceptor', 9, 5, AHEAD + 12); spawn('interceptor', 3, 6, AHEAD + 22); } },
      { t: 48, run: () => { for (let i = 0; i < 6; i++) ring(-8 + i * 3.2, 3, AHEAD - 30); } },
      { t: 54, run: () => { spawn('striker', 0, 3, AHEAD + 30); } },
    ],
    onComplete: 'boss',
  },

  station: {
    id: 'station',
    name: 'Route C: Orbital Station',
    palette: 'station',
    briefing: 'Venom shipyards ahead. Strikers guard the approach. Expect heavy fire.',
    length: 66,
    bossStage: false,
    script: [
      { t: 2, say: ['Capt. Vance', 'Orbital station ahead. Strikers guard the approach. Heavy fire.'] },
      { t: 5, run: () => { spawn('striker', -6, 2, AHEAD); spawn('striker', 6, 2, AHEAD + 30); } },
      { t: 10, run: () => { for (let i = 0; i < 4; i++) spawn('fighter', -8 + i * 5.3, 4, AHEAD + i * 6); } },
      { t: 14, say: ['Rex', 'Dropping wing pods. Keep the lock tight on the strikers.'] },
      { t: 16, run: () => { spawn('interceptor', -5, 5, AHEAD); spawn('interceptor', 5, 5, AHEAD + 8); } },
      { t: 22, run: () => { for (let i = 0; i < 6; i++) ring(-9 + i * 3.6, 2 + Math.sin(i * 0.9) * 2, AHEAD - 40); } },
      { t: 28, run: () => { spawn('striker', 0, 3, AHEAD + 20); spawn('turret', -10, -4, AHEAD); spawn('turret', 10, -4, AHEAD); } },
      { t: 32, say: ['Dr. Holt', 'Strikers have shield ribs between the pods. Shoot the engine glow.'] },
      { t: 36, run: () => { for (let i = 0; i < 5; i++) spawn('fighter', -9 + i * 4.5, 2.5 + (i % 2), AHEAD + i * 5); } },
      { t: 40, run: () => { spawnPickup('shield', 0, 3, ahead(AHEAD - 40)); spawnPickup('bomb', 3, 2, ahead(AHEAD - 55)); } },
      { t: 44, run: () => { spawn('striker', -5, 3, AHEAD); spawn('striker', 5, 3, AHEAD + 16); } },
      { t: 50, run: () => { for (let i = 0; i < 4; i++) spawn('interceptor', -8 + i * 5, 4, AHEAD + i * 6); } },
      { t: 56, say: ['Mira', 'The core is just ahead. Brace for the Warden.'] },
    ],
    onComplete: 'boss',
  },

  boss: {
    id: 'boss',
    name: 'Final Approach: The Warden',
    palette: 'boss',
    briefing: 'The Warden core is awake. Three phases. Hold lock, release on the core, and use bombs.',
    length: 999,
    bossStage: true,
    script: [
      { t: 2, say: ['Capt. Vance', 'That is the Warden. Pick your moment and take it apart.'] },
      { t: 5, run: () => { spawn('warden', 0, 4, 170); stageRun.bossSpawned = true; } },
      { t: 8, say: ['Rex', 'Shield pods on both arms. Shoot the crown when it opens.'] },
      { t: 14, run: () => { for (let i = 0; i < 4; i++) spawn('fighter', -8 + i * 5.3, 3 + (i % 2), AHEAD); } },
      { t: 22, run: () => { spawn('interceptor', -6, 5, AHEAD); spawn('interceptor', 6, 5, AHEAD + 10); } },
      { t: 28, say: ['Dr. Holt', 'Phase two. Its fire pattern spreads. Keep moving left and right.'] },
      { t: 36, run: () => { spawnPickup('bomb', 0, 3, ahead(60)); spawnPickup('shield', 6, 2, ahead(70)); } },
      { t: 44, say: ['Capt. Vance', 'Final phase. Everything you have. Do not let it reach the planet.'] },
    ],
    onComplete: 'victory',
  },
};

export const ROUTE_ORDER = ['alpha', 'canyon', 'station', 'boss'];

// Runtime cursor for the active stage.
export const stageRun = {
  route: null,
  t: 0,
  next: 0,
  done: false,
  bossSpawned: false,
};

export function startStage(routeId) {
  stageRun.route = ROUTES[routeId];
  stageRun.t = 0;
  stageRun.next = 0;
  stageRun.done = false;
  stageRun.bossSpawned = false;
}

// Runs due script entries. `say(speaker, text)` is provided by game.js.
export function updateStage(dt, say) {
  const r = stageRun.route;
  if (!r || stageRun.done) return;
  stageRun.t += dt;
  while (stageRun.next < r.script.length && r.script[stageRun.next].t <= stageRun.t) {
    const entry = r.script[stageRun.next];
    stageRun.next++;
    if (entry.say) say(entry.say[0], entry.say[1]);
    if (entry.run) entry.run();
  }
}

// A non-boss stage is complete once its timeline has run out and the field is clear.
// The boss stage is complete when the Warden is destroyed.
export function stageComplete() {
  const r = stageRun.route;
  if (!r) return false;
  if (r.bossStage) return stageRun.bossSpawned && !enemies.some((e) => e.boss && e.alive);
  return stageRun.t >= r.length && stageRun.next >= r.script.length && !enemies.some((e) => e.alive);
}

export function stageProgress() {
  const r = stageRun.route;
  if (!r) return 0;
  if (r.bossStage) return stageRun.bossSpawned ? 1 : 0;
  return Math.min(1, stageRun.t / r.length);
}
