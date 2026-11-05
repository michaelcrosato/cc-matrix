// The live tuning values (the dev mode's sliders write them; the battle reads them every step), the difficulty presets
// and the entity types. Numbers are the VETERAN defaults; the presets scale them.
(() => {
'use strict';
const WP = globalThis.WP;

// key, label, default, min, max, step, what it does
WP.TUNING_SPEC = [
  ['crosshairSpeed', 'Crosshair speed', 150, 60, 320, 10, 'pixels a second, on the pad or keys'],
  ['fireRate', 'Fire rate', 10, 3, 18, 1, 'rounds a second while the trigger is held'],
  ['magSize', 'Magazine size', 30, 10, 60, 5, 'rounds in a magazine'],
  ['spares', 'Spare magazines', 4, 0, 8, 1, 'magazines carried at the start'],
  ['grenades', 'Grenades at start', 5, 0, 10, 1, 'grenades carried at the start'],
  ['telegraph', 'Telegraph time', 1.5, 0.6, 3, 0.1, 'seconds a closing ring gives before a shot lands'],
  ['enemyDamage', 'Enemy damage', 8, 2, 30, 1, 'damage meter a landed shot adds'],
  ['enemyRate', 'Enemy fire interval', 1, 0.3, 3, 0.1, 'multiplier on the time between enemy shots'],
  ['railSpeed', 'Rail speed', 1, 0.3, 2.5, 0.1, 'multiplier on how fast the camera rides the rail'],
  ['bossHealth', 'Boss health', 1, 0.25, 3, 0.25, 'multiplier on each boss\'s health'],
  ['density', 'Enemy density', 1, 0.5, 2, 0.1, 'multiplier on enemies per beat'],
  ['bloom', 'Bloom', 1, 0, 3, 0.1, 'how far the crosshair opens while firing'],
];
WP.T = {};
WP.resetTuning = () => { for (const s of WP.TUNING_SPEC) WP.T[s[0]] = s[2]; };
WP.resetTuning();

// the difficulty presets: RECRUIT is kind, VETERAN is the reference, ARCADE is unforgiving. Only ARCADE ends the run
// when the magazines and the grenades run dry; the others drop a magazine on the field.
WP.DIFF = {
  recruit: { label: 'RECRUIT', telegraph: 1.35, damage: 0.6, emergency: true, cheer: 'Easy' },
  veteran: { label: 'VETERAN', telegraph: 1.0, damage: 1, emergency: true, cheer: 'Normal' },
  arcade: { label: 'ARCADE', telegraph: 0.8, damage: 1.3, emergency: false, cheer: 'Hard' },
};

// entity types. kind: soldier | vehicle | boat | air | civilian | hostage | animal | crate | cover | rocket | pickup | boss
// w, h: body width and height in world units. hp: hits to kill (brute: head x4). score: points (negative: a penalty).
// weapon: how it attacks (gun, burst, sniper, knife, grenade, mortar, rocket, shell, missile, none). quota: the quota it counts for.
WP.TYPES = {
  soldier: { kind: 'soldier', w: 9, h: 20, hp: 1, score: 100, sprite: 'soldier', weapon: 'gun', quota: 'soldier', dmg: 1 },
  runner: { kind: 'soldier', w: 9, h: 20, hp: 1, score: 100, sprite: 'soldier', weapon: 'gun', quota: 'soldier', dmg: 1, runs: true },
  grenadier: { kind: 'soldier', w: 9, h: 20, hp: 2, score: 150, sprite: 'soldier', weapon: 'grenade', quota: 'soldier', dmg: 1.2 },
  officer: { kind: 'soldier', w: 9, h: 20, hp: 2, score: 600, sprite: 'soldier', weapon: 'gun', quota: 'soldier', dmg: 1.2 },
  rpg: { kind: 'soldier', w: 9, h: 20, hp: 2, score: 300, sprite: 'soldier', weapon: 'rocket', quota: 'soldier', dmg: 1.3 },
  para: { kind: 'soldier', w: 9, h: 20, hp: 1, score: 150, sprite: 'soldier', weapon: 'gun', quota: 'soldier', dmg: 1, runs: true },
  knife: { kind: 'soldier', w: 9, h: 20, hp: 1, score: 200, sprite: 'soldier', weapon: 'knife', quota: 'soldier', dmg: 1 },
  brute: { kind: 'soldier', w: 13, h: 24, hp: 8, score: 500, sprite: 'brute', weapon: 'burst', quota: 'soldier', dmg: 0.8, headMult: 4 },
  sniper: { kind: 'soldier', w: 9, h: 20, hp: 1, score: 400, sprite: 'soldier', weapon: 'sniper', quota: 'soldier', dmg: 1.3 },
  mortar: { kind: 'soldier', w: 12, h: 12, hp: 1, score: 200, sprite: 'mortar', weapon: 'mortar', quota: 'soldier', dmg: 1.4, rise1: true },
  jeep: { kind: 'vehicle', w: 30, h: 14, hp: 3, score: 1000, sprite: 'jeep', weapon: 'rocket', quota: 'vehicle', dmg: 1.6 },
  truck: { kind: 'vehicle', w: 40, h: 18, hp: 20, score: 1200, sprite: 'truck', weapon: 'none', quota: 'vehicle', dmg: 0 },
  apc: { kind: 'vehicle', w: 38, h: 20, hp: 32, score: 2000, sprite: 'apc', weapon: 'rocket', quota: 'vehicle', dmg: 1.8 },
  tank: { kind: 'vehicle', w: 40, h: 22, hp: 48, score: 3000, sprite: 'tank', weapon: 'shell', quota: 'vehicle', dmg: 2.0 },
  skiff: { kind: 'boat', w: 24, h: 10, hp: 10, score: 800, sprite: 'skiff', weapon: 'burst', quota: 'boat', dmg: 0.7 },
  gunboat: { kind: 'boat', w: 34, h: 14, hp: 26, score: 1500, sprite: 'gunboat', weapon: 'burst', quota: 'boat', dmg: 0.9 },
  heli: { kind: 'air', w: 44, h: 16, hp: 34, score: 3000, sprite: 'heli', weapon: 'missile', quota: 'air', dmg: 1.5, fly: true },
  civilian: { kind: 'civilian', w: 8, h: 18, hp: 1, score: -500, sprite: 'civilian' },
  hostage: { kind: 'hostage', w: 9, h: 20, hp: 1, score: 0, sprite: 'hostage' },
  goat: { kind: 'animal', w: 11, h: 9, hp: 1, score: 50, sprite: 'goat' },
  crate: { kind: 'crate', w: 12, h: 12, hp: 1, score: 100, sprite: 'crate' },
  dynamite: { kind: 'crate', w: 12, h: 12, hp: 1, score: 200, sprite: 'dynamite' },
  sandbag: { kind: 'cover', w: 26, h: 8, hp: 0, score: 0, sprite: 'sandbag' },
  rocket: { kind: 'rocket', w: 4, h: 4, hp: 1, score: 50, sprite: 'rocket' },
  pickup: { kind: 'pickup', w: 8, h: 8, hp: 1, score: 0, sprite: 'pickup' },
};

// the projectiles the enemy fires: speed (world units a second toward the camera), dmg (times enemyDamage), and whether it
// arcs (lands at a depth) or flies flat. Every one can be shot out of the air.
WP.PROJ = {
  rocket: { speed: 88, dmg: 1.6, color: '#ffb040' },
  knife: { speed: 120, dmg: 1.0, color: '#d8e0e8' },
  grenade: { speed: 60, dmg: 1.4, color: '#7ac060' },
  mortar: { speed: 40, dmg: 1.6, color: '#c0a060' },
  shell: { speed: 70, dmg: 2.0, color: '#ff8a30' },
  missile: { speed: 75, dmg: 1.4, color: '#ff5a3a' },
};

// the bosses. parts: the weak points are the head (top third; x3 damage). shield: body damage x .25 (the riot shield).
// special: what else the boss does (see 20-battle.js). rate: seconds between attacks.
WP.BOSSES = {
  bigEar: { name: 'BIG EAR', hp: 40, w: 60, h: 46, rate: 6.0, volley: 2, special: 'paratroopers', sprite: 'bigEar', kind: 'boss', path: 'park' },
  crocodile: { name: 'CROCODILE', hp: 45, w: 56, h: 26, rate: 3.6, volley: 4, special: 'weave', sprite: 'crocodile', kind: 'boss', path: 'weave' },
  warthog: { name: 'WARTHOG', hp: 50, w: 46, h: 44, rate: 4.0, volley: 1, special: 'nozzle', sprite: 'warthog', kind: 'boss', path: 'sway' },
  ironHog: { name: 'IRON HOG', hp: 55, w: 88, h: 40, rate: 4.4, volley: 3, special: 'vents', sprite: 'ironHog', kind: 'boss', path: 'track' },
  tusk: { name: 'MAJOR TUSK', hp: 60, w: 40, h: 70, rate: 3.0, volley: 3, special: 'shield', sprite: 'tusk', kind: 'boss', path: 'stand', shield: true },
  hyenaOne: { name: 'HYENA ONE', hp: 60, w: 60, h: 30, rate: 4.6, volley: 3, special: 'salvo', sprite: 'hyenaOne', kind: 'boss', path: 'fly', flies: true },
};
})();
