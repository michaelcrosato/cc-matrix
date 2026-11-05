// 03-enemies.js: the enemy archetypes (plan 4.6, 5.3), as registry entries. Each has hit points, the telegraph time its
// shots take to land, the fire pattern, its score, and the engine rig it is drawn with. The sim (05-sim-enemies.js)
// runs their state machine; the renderer draws the rigs as billboards.
//   hp:       hit points (times the dev slider enemy.hpMul, rounded up)
//   tele:     seconds from the muzzle flash to the impact (times enemy.telegraphMul)
//   threat:   'chance' (decided by the ThreatDirector) or 'always' (every shot is a threat)
//   burst:    [min, max] shots per exposure;  gap: seconds between the shots of a burst
//   hide:     [min, max] seconds out of sight between exposures;  aim: seconds of aim before the first shot
//   score:    points for the kill;  elite: TIME the kill adds (seconds);  drop: the ammo it drops on death
//   role:     'shooter' | 'quartermaster' (flees and drops ammo) | 'grenadier' (lobs grenades) | 'rusher' (charges and
//             slashes) | 'mover' (runs a route and fires every `every` s: drones fly at `fly` u, jet-skis ride water)
//             | 'civilian'
//   kind:     the shot's look ('rocket', 'zap', 'pistol', 'slash'); headOnly: only the head is a target
TC.def('enemy', 'deckhand', {
  name: 'Black Current deckhand', hp: 1, tele: 0.70, threat: 'chance', burst: [1, 2], gap: 0.55, hide: [1.2, 2.4], aim: 0.45,
  score: 300, role: 'shooter', rig: { build: 'chibi', weapon: 'gun', hat: 'cap', outfit: 'coat', size: 1.05,
    colors: { cloth: '#3a4a6a', pants: '#252d40', skin: '#e0ae84', hair: '#2a1d18' } },
});
TC.def('enemy', 'redtide', {
  name: 'Red Tide elite', hp: 1, tele: 0.45, threat: 'always', burst: [2, 3], gap: 0.36, hide: [0.9, 1.5], aim: 0.25,
  score: 800, elite: true, role: 'shooter', rig: { build: 'heroic', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.1,
    colors: { cloth: '#b8242b', pants: '#4a1418', skin: '#d9a07a', hair: '#1a1210' } },
});
TC.def('enemy', 'shield', {
  name: 'Ironbank trooper', hp: 3, tele: 0.90, threat: 'chance', burst: [1, 1], gap: 0.0, hide: [1.6, 2.6], aim: 0.8,
  score: 600, role: 'shooter', rig: { build: 'bulky', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.15,
    colors: { cloth: '#5c6470', pants: '#353b45', skin: '#c99670', hair: '#20201e' } },
});
TC.def('enemy', 'quartermaster', {
  name: 'Quartermaster', hp: 1, tele: 0, threat: 'none', burst: [0, 0], gap: 0, hide: [0, 0], aim: 0,
  score: 500, drop: true, role: 'quartermaster', rig: { build: 'chibi', weapon: null, hat: 'cap', outfit: 'shirt', size: 1.0,
    colors: { cloth: '#ff7a1a', pants: '#3b3138', skin: '#e0ae84', hair: '#4a3020' } },
});
TC.def('enemy', 'sniper', {
  name: 'Lighthouse sniper', hp: 1, tele: 1.20, threat: 'always', burst: [1, 1], gap: 0, hide: [2.4, 3.6], aim: 1.0,
  score: 900, elite: true, role: 'shooter', rig: { build: 'heroic', weapon: 'gun', hat: 'band', outfit: 'coat', size: 1.0,
    colors: { cloth: '#2b3a2a', pants: '#1c2418', skin: '#d9a07a', hair: '#333' } },
});
TC.def('enemy', 'grenadier', {
  name: 'Tidewall grenadier', hp: 2, tele: 1.20, threat: 'chance', burst: [1, 1], gap: 0, hide: [2.0, 3.0], aim: 0.8,
  score: 700, role: 'grenadier', rig: { build: 'bulky', weapon: 'gun', hat: 'cap', outfit: 'coat', size: 1.08,
    colors: { cloth: '#6b5a2e', pants: '#3a3018', skin: '#e0ae84', hair: '#2a1d18' } },
});
TC.def('enemy', 'marine', {
  name: 'Ironbank marine', hp: 2, tele: 0.85, threat: 'chance', burst: [3, 4], gap: 0.3, hide: [1.4, 2.2], aim: 0.5,
  score: 500, role: 'shooter', rig: { build: 'bulky', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.05,
    colors: { cloth: '#5a6a3a', pants: '#3a4226', skin: '#d9a07a', hair: '#222' } },
});
TC.def('enemy', 'rocketeer', {
  name: 'Tidewall rocketeer', hp: 2, tele: 1.3, threat: 'always', kind: 'rocket', burst: [1, 1], gap: 0, hide: [2, 3], aim: 0.8,
  score: 700, role: 'shooter', rig: { build: 'chibi', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.05,
    colors: { cloth: '#4a4f5a', pants: '#2a2e36', skin: '#e0ae84', hair: '#333' } },
});
TC.def('enemy', 'rusher', {
  name: 'Cutlass rusher', hp: 1.5, tele: 0.45, threat: 'always', kind: 'slash', burst: [1, 1], gap: 0, hide: [0, 0], aim: 0,
  score: 600, role: 'rusher', rig: { build: 'heroic', weapon: 'gun', hat: 'band', outfit: 'shirt', size: 1.0,
    colors: { cloth: '#2a2a2a', pants: '#1a1a1a', skin: '#c99670', hair: '#111' } },
});
TC.def('enemy', 'drone', {
  name: 'Patrol drone', hp: 2, tele: 0.9, threat: 'chance', kind: 'zap', fly: 40, every: 2.6, speed: 30, burst: [1, 1], gap: 0, mesh: 'drone',
  hide: [0, 0], aim: 0, score: 1500, role: 'mover', rig: { build: 'chibi', weapon: null, hat: null, outfit: 'shirt', size: 0.7,
    colors: { cloth: '#8a2a2a', pants: '#222', skin: '#cfd6e0', hair: '#111' } },
});
TC.def('enemy', 'jetski', {
  name: 'Jet-ski rider', hp: 1, tele: 1.0, threat: 'chance', kind: 'pistol', every: 2.2, speed: 60, burst: [1, 1], gap: 0, ski: true,
  hide: [0, 0], aim: 0, score: 1500, role: 'mover', rig: { build: 'chibi', weapon: 'gun', hat: 'cap', outfit: 'shirt', size: 1.0,
    colors: { cloth: '#2aa0c0', pants: '#1a2a3a', skin: '#e0ae84', hair: '#2a1d18' } },
});
TC.def('enemy', 'gunner', {
  name: 'Mounted gunner', hp: 3, tele: 1.0, threat: 'chance', burst: [5, 6], gap: 0.2, hide: [2, 3], aim: 0.6,
  score: 2500, role: 'shooter', rig: { build: 'bulky', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.1,
    colors: { cloth: '#4a3a2a', pants: '#2a2218', skin: '#d9a07a', hair: '#222' } },
});
TC.def('enemy', 'captor', {
  name: 'Red Tide captor', hp: 1, tele: 0.8, threat: 'always', headOnly: true, burst: [1, 1], gap: 0, hide: [2, 3], aim: 0.7,
  score: 5000, role: 'shooter', rig: { build: 'heroic', weapon: 'gun', hat: 'helmet', outfit: 'coat', size: 1.05,
    colors: { cloth: '#b8242b', pants: '#4a1418', skin: '#d9a07a', hair: '#1a1210' } },
});
TC.def('enemy', 'civilian', {
  name: 'Festival-goer', hp: 1, tele: 0, threat: 'none', burst: [0, 0], gap: 0, hide: [0, 0], aim: 0,
  score: -5000, role: 'civilian', rig: { build: 'chibi', weapon: null, hat: null, outfit: 'shirt', size: 0.95,
    colors: { cloth: '#f2c94c', pants: '#2d3a4a', skin: '#e9b98f', hair: '#6a3f22' } },
});

// Hit points after the dev multiplier, rounded up, never below 1.
TC.enemyHp = function (def) {
  return Math.max(1, Math.ceil(def.hp * TC.tune.enemy.hpMul));
};
