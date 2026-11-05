(() => {
'use strict';
const E = My3D2dge;
const TC_ABOUT = {
  "sourceInformation": {
    "date": "2026-11-03 18:33:12",
    "source": "Time Crisis 3 (Namco and Nextech; arcade on System 246, North America February 2003, Japan April 1, 2003; PlayStation 2 October 2003)",
    "plan": "PLAN.md",
    "genre": "On-rails light-gun shooter with a cover system: duck behind cover to reload, pop out to shoot",
    "perspective": "First person on a rail; cover is real geometry lowered by about 12 u; the story is shown by radio and dialogue, with no cutscene camera",
    "tech": "my-3D2dge v0.85.2 handoff engine (patched: PlayStation button symbols by default); a custom software z-buffer rasterizer (Rail3D) in plain JavaScript; AI Hub client session.js 1.4.0; Playwright 1.63.0 (tests only)",
    "artDirection": "The engine's PS1-era pixel style: procedural textures painted in code, five banded light levels with 4x4 Bayer dithering, eight-step dithered fog, a gradient sky with a skyline",
    "animation": "The engine's Humanoid procedural rigs for every soldier and civilian (crouch, point, hurt, down, die, run); the rigs are drawn as billboards from a view that faces the camera",
    "audio": "Chip synth music and sound effects written in code (no audio files); Animalese voices, one blip per syllable, pitched per speaker",
    "online": "AI Hub Session Protocol v1, shared-world co-op for 1 to 4 players: the host copy runs the world, the other copies replicate it",
    "testing": "Headless Node suites (sim rules, the hub's snapshot encoding, build rules), the Autopilot clearing stage 1 in the sim, Chromium smoke and screen-flow runs, the AI Hub harness with 2 and 4 players, a lossy network, a host leaving, and a server-only host",
    "research": "The engine handoff docs (README, API card, API index, AI guide), the AI Hub protocol README, and the planning notes in PLAN.md; the source facts are as given in PLAN.md (unknown: not re-checked against a live source in this run)",
    "environment": "Claude Code CLI (headless); Linux under WSL2; Chromium 153 headless through Playwright 1.63.0",
    "model": "Anthropic, claude-haiku-5-5, reasoning effort medium",
    "usage": "unknown (no token or cost estimate was reported during the run)"
  },
  "testingFeedback": [
    "About 10 real defects: three were game-breaking (the page never called its start function; areas cleared with no enemies killed because the alive count was stale; AI Hub rounds were voided because the play was never registered). The rest were smaller: a shared event name overwritten, enemies hidden by their own wall, civilians blocking the clear, the Autopilot never shooting the boss's turrets, the server copy staying silent, the HUD and banners showing on the title, and a glyph the pixel font lacks.",
    "The most helpful test was the headless sim suite that plays a whole stage with the Autopilot: it caught the clear-count and civilian bugs and proved area progression. The AI Hub harness was a close second, because it exercises the real network path and found the unregistered play and the silent server.",
    "The least helpful checks were the exit-interview checks, which only test that each answer is present, not that it is true, and the screenshot reviews, which I only sampled by eye (about four images), so visual polish is only partly verified.",
    "Not tested on real hardware: a real phone (the touch-only notice was checked with phone emulation in Chromium, which sets the pointer type but is not a device), a real gamepad (none was attached), and the Xbox glyph option. The 'Controller or keyboard required' screen and the attract run on a phone were checked by emulation."
  ],
  "engineFeedback": [
    "The rig system is the best part: E.Humanoid with rig.update poses and rig.draw from any E.View let me draw soldiers as depth-tested billboards, and the same rig runs headless in Node.",
    "The billboard facing: the view's yaw convention (0 is north up the screen) is documented, but I had to match it to camera bearings by eye. I also assumed the wheel produced codes; it did not, so I added them as a patch.",
    "The most important thing I had to build myself was the 3D layer: a z-buffer triangle rasterizer, the banded lighting and fog, and the view-space camera. The engine has no 3D renderer in the handoff.",
    "The hardest part was finding exact signatures: API-INDEX and AI_GUIDE together are over 300 KB, and the core file is 1.2 MB, so grep and sed in small windows were the only practical way in.",
    "Two changes to the engine (engine/PATCHES.md): the Button symbols default is now PlayStation, with Xbox listed second, because TASK.md asks for PlayStation glyphs and the engine defaulted to auto; and the mouse wheel now emits WheelUp and WheelDown codes, because the engine had no wheel codes and the weapon switch needs one.",
    "I would change the documentation layout: a one-page 'how a scene and a loop fit together' with a minimal headless example for each module, so a builder can see the frame order without reading the whole index."
  ],
  "promptFeedback": [
    "I liked the explicit deliverables table, the exact file names, the AI Hub protocol link with its harness check, and the rule that every feature must exist with no stubs. The golden rules and the done checklist made it clear what counted as finished.",
    "It was confusing that PLAN.md is written for a different run: it names a different title (Tide Crisis 3), folder and model (claude-opus-5-5 at max effort), while TASK.md asks for a title drawn by RNG and this model's name. TASK.md won where they disagreed, but the conflict cost time.",
    "The hardest part was the scope: the plan describes several thousand lines by my estimate (a moving carrier system, a full enemy roster, four weapons with projectile physics, a dev panel with six tabs, a lag-compensated netcode) and asks for all of it to be done with no stubs, with no statement of which parts are optional or how much time to spend.",
    "I would change the prompt: mark each plan feature as must-have or stretch; drop the title and folder names from the plan, or make the plan's naming follow the run's; and state an explicit budget (time or tokens) so the scope can be cut in advance, not at the end."
  ],
  "thanks": "Thanks to the CREST field team, the my-3D2dge engine and the AI Hub protocol.",
  "aiHub": {
    "name": "Sublime Crisis 3",
    "tagline": "Duck, pop, shoot. Beat the tide.",
    "description": "An original on-rails light-gun shooter inspired by Time Crisis 3: take cover to reload, pop out to shoot, and read the red crisis rings before the king tide. Three stages, three bosses, a training range, and a shared-world co-op round for up to four.",
    "type": "Game",
    "genre": "Shooter",
    "source": "Time Crisis 3",
    "series": "Time Crisis",
    "players": "1–4",
    "controls": "Mouse or stick aims · Fire: click or R2 · Cover: hold right click or L2 · Reload in cover: R or Square",
    "tags": [
      "first-person",
      "pixel art",
      "arcade",
      "co-op",
      "boss fights",
      "retro"
    ]
  }
};
// ---- src/00-core.js ----
// 00-core.js: the TC namespace, units, seeded RNG streams, the tuning table (TUNE, frozen defaults, and the live `tune`
// that the dev panel edits), difficulty and the registries (def / get). Reads nothing; every other fragment reads this.
const TC = {
  name: 'Sublime Crisis 3',
  short: 'SUBLIME3',
  source: 'Time Crisis 3',
  U: 16,                       // world units per metre
  DT: 1 / 120,                 // the engine's fixed step
  registry: { material: {}, weapon: {}, enemy: {}, boss: {}, stage: {}, scene: {}, speaker: {}, song: {}, intel: {} },
  def(kind, id, spec) { TC.registry[kind][id] = Object.assign({ id }, spec); return TC.registry[kind][id]; },
  get(kind, id) {
    const e = TC.registry[kind][id];
    if (!e) throw new Error('no ' + kind + ' "' + id + '"');
    return e;
  },
  has(kind, id) { return !!TC.registry[kind][id]; },
};

// Seeded RNG streams: each stream is a mulberry32 generator seeded from the run seed and the stream's name, so one
// stream's draws never shift another's.
TC.hash = function (str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
TC.stream = function (seed, name) {
  let a = (seed ^ TC.hash(name)) >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  return f;
};

// Live tuning. TUNE is the frozen default table; `tune` is a deep copy the dev panel edits and Reset restores from TUNE.
// Every value that the dev panel shows lives here, addressed by a dotted path ('enemy.hpMul').
TC.TUNE = Object.freeze({
  player: {
    godMode: false, infiniteAmmo: false, lives: 0, iframes: 1.5, coverIn: 0.12, coverOut: 0.15, reload: 0.30,
    padSpeed: 1.6, aimAssist: 0.6, startSpecials: 0,
  },
  weapon: {
    handgunDmg: 1, mgRate: 12, mgDmg: 0.45, shotPellets: 8, shotSpread: 5.5, glRadius: 48, glDmg: 6, ammoMul: 1,
  },
  enemy: {
    hpMul: 1, threatMul: 1, telegraphMul: 1, fireMul: 1, maxThreats: 1, minGap: 0.35, reactMul: 1, bossHpMul: 1,
  },
  time: {
    freeze: false, sceneMul: 1, eliteBonus: 2, refill: 0.6, gameSpeed: 1,
  },
  view: {
    fov: 55, hitVolumes: false, colliders: false, aiLabels: false, threatDebug: false, perf: false, hideHud: false, threatBig: false,
  },
});
TC.tune = JSON.parse(JSON.stringify(TC.TUNE));
TC.tuneGet = function (path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), TC.tune);
};
TC.tuneSet = function (path, v) {
  const ks = path.split('.'), last = ks.pop();
  let o = TC.tune;
  for (const k of ks) o = o[k];
  o[last] = v;
};
TC.tuneReset = function () { TC.tune = JSON.parse(JSON.stringify(TC.TUNE)); };
TC.tuneChanged = function (path) { return TC.tuneGet(path) !== TC.tuneGetFrom(TC.TUNE, path); };
TC.tuneGetFrom = function (obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
};

// Difficulty: lives, TIME multiplier, threat multiplier, boss time.
TC.DIFF = {
  Easy: { lives: 7, time: 1.25, threat: 0.7, threats: -1 },
  Normal: { lives: 5, time: 1, threat: 1, threats: 0 },
  Hard: { lives: 3, time: 0.85, threat: 1.25, threats: 1 },
};

TC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
TC.lerp = (a, b, t) => a + (b - a) * t;
TC.smooth = t => { t = TC.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
TC.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
TC.fmt = n => Math.round(n).toLocaleString('en-US');

// ---- src/01-math.js ----
// 01-math.js: vectors, the camera basis (plan 3.3: x east, y south, z up; yaw 0 = east), ray tests against boxes and
// spheres, and the view-unit aim model. Pure functions: the sim, the renderer and the tests all use them.
TC.V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// The camera basis for yaw psi and pitch theta (plan 3.3). Returns { f, r, u } as vectors.
TC.basis = function (yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return {
    f: [cp * cy, cp * sy, sp],
    r: [-sy, cy, 0],
    u: [-sp * cy, -sp * sy, cp],
  };
};

// The ray for an aim (ax, ay) in view units from a camera pose {yaw, pitch, fov}: direction in world space.
// ax spans [-aspect, aspect] and ay [-1, 1]; a point at (ax, ay) is where the reticle draws.
TC.aimRay = function (cam, ax, ay) {
  const b = TC.basis(cam.yaw, cam.pitch);
  const t = Math.tan((cam.fov * Math.PI / 180) / 2);
  const d = [
    b.f[0] + b.r[0] * ax * t + b.u[0] * ay * t,
    b.f[1] + b.r[1] * ax * t + b.u[1] * ay * t,
    b.f[2] + b.r[2] * ax * t + b.u[2] * ay * t,
  ];
  return TC.V.norm(d);
};

// Ray (o, d) against an axis-aligned box [x0,y0,z0,x1,y1,z1]. Returns the entry distance, or -1 when it misses. A ray
// that starts inside the box returns 0.
TC.rayBox = function (o, d, b) {
  let tmin = -Infinity, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    const lo = b[i], hi = b[i + 3];
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo || o[i] > hi) return -1;
    } else {
      let t1 = (lo - o[i]) / d[i], t2 = (hi - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
  }
  if (tmax < 0) return -1;
  return tmin < 0 ? 0 : tmin;
};

// Ray against a sphere (centre c, radius r). Returns the entry distance or -1.
TC.raySphere = function (o, d, c, r) {
  const m = TC.V.sub(o, c);
  const b = TC.V.dot(m, d);
  const cc = TC.V.dot(m, m) - r * r;
  if (cc > 0 && b > 0) return -1;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? 0 : t;
};

// Project a world point to view units for a camera pose and a viewport aspect. Returns [ax, ay, depth] or null when
// the point is behind the camera. ax in [-aspect, aspect], ay in [-1, 1] when on screen.
TC.toView = function (cam, p, aspect) {
  const b = TC.basis(cam.yaw, cam.pitch);
  const d = TC.V.sub(p, [cam.x, cam.y, cam.z]);
  const z = TC.V.dot(d, b.f);
  if (z <= 0.5) return null;
  const t = Math.tan((cam.fov * Math.PI / 180) / 2);
  return [TC.V.dot(d, b.r) / (z * t), TC.V.dot(d, b.u) / (z * t), z];
};

// Angle of a ground vector (dx, dy) in radians, 0 = east, pi/2 = south.
TC.angleOf = (dx, dy) => Math.atan2(dy, dx);

// ---- src/02-weapons.js ----
// 02-weapons.js: the four weapon roles (plan 4.4), as registry entries. Numbers that the dev panel exposes are read
// through TC.tune at fire time, so a slider takes effect at the next shot. The sim owns ammo and firing; this file is
// data only.
TC.def('weapon', 'handgun', {
  name: 'P9 MARLIN', short: 'HANDGUN', slot: 1, unlimited: true, mag: 9, reloadCover: 0.30,
  rate: 6, autoRate: 3.5, switchT: 0.20, spread: 0, pellets: 1, damage: () => TC.tune.weapon.handgunDmg,
  kind: 'hit', recoil: 0.6, color: '#ffe9a0', pip: '#ffd36a',
});
TC.def('weapon', 'mg', {
  name: 'RIPTIDE', short: 'MACHINE GUN', slot: 2, pool: 240, pickup: 60, rate: () => TC.tune.weapon.mgRate, auto: true,
  switchT: 0.25, spread: 0.6, bloom: 3, bloomRecover: 6, pellets: 1, damage: () => TC.tune.weapon.mgDmg,
  kind: 'hit', recoil: 0.25, color: '#9fe3ff', pip: '#3aa0e8',
});
TC.def('weapon', 'shotgun', {
  name: 'BREAKWATER', short: 'SHOTGUN', slot: 3, pool: 36, pickup: 8, rate: 1.5, auto: false, switchT: 0.30,
  spread: () => TC.tune.weapon.shotSpread, pellets: () => TC.tune.weapon.shotPellets, damage: 0.45,
  kind: 'hit', recoil: 2.2, color: '#ffb36b', pip: '#ff8a3d', knock: true,
});
TC.def('weapon', 'gl', {
  name: 'SQUALL', short: 'GRENADE LAUNCHER', slot: 4, pool: 6, pickup: 2, rate: 1, auto: false, switchT: 0.35,
  spread: 0, pellets: 1, speed: 640, gravity: 240, life: 1.2, radius: () => TC.tune.weapon.glRadius,
  damage: () => TC.tune.weapon.glDmg, kind: 'proj', recoil: 1.5, color: '#ff8a5c', pip: '#ff5a2a',
});

// The weapon cycle order (next / previous) and the number keys.
TC.WEAPON_ORDER = ['handgun', 'mg', 'shotgun', 'gl'];

// ---- src/03-enemies.js ----
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

// ---- src/04-sim.js ----
// 04-sim.js: Sim, the authoritative game state (plan 3.4, 4.2, 4.5). It holds the stage, the players, the enemies,
// threats, projectiles and pickups, and steps them from per-player commands. It never touches the DOM or Math.random.
// The presentation reads sim.state and drains sim.events every frame; a replica (AI Hub client) fills the same fields
// from the host's snapshots and never steps.
//
// A command: { aim: [ax, ay], fire, firePressed, cover, coverPressed, reload, next, prev, select, cont }.
//   fire / cover are held; the *Pressed flags are true on the step they went down.
//
// Phases of a stage: 'arrive' (the camera rides to the next area: WAIT) -> 'action' (ACTION!, waves, TIME) -> 'clear'
// (the time bonus) -> the next area, or 'boss' -> 'stageclear'. A wiped-out team is 'continue' (10 s) and then 'over'.
TC.ARRIVE = 2.2;      // seconds to ride to a new area
TC.CLEAR_T = 1.2;     // seconds of the clear bonus
TC.CONT_T = 10;       // the CONTINUE? countdown
TC.EYE_STAND = 24;    // eye height, standing (u)
TC.EYE_COVER = 12;    // eye height, in cover (u)
TC.SLOT_GAP = 30;     // lateral spacing of the player slots (u)

TC.Sim = class Sim {
  constructor(o = {}) {
    this.o = o;
    this.seed = (o.seed || 1) >>> 0;
    this.diff = TC.DIFF[o.difficulty || 'Normal'];
    this.difficulty = o.difficulty || 'Normal';
    this.mode = o.mode || 'stage';
    this.stageId = o.stage || 1;
    this.stage = TC.get('stage', this.stageId);
    this.rngs = {};
    this.t = 0;
    this.phase = 'arrive';
    this.phaseT = 0;
    this.sceneIdx = o.sceneIndex || 0;
    this.events = [];
    this.frozen = false;
    this.over = false;
    this.cheats = Object.assign({ god: false, ammo: false, freeze: false, oneHit: false }, o.cheats || {});
    this.autoFire = o.autoFire !== false;
    this.enemies = [];
    this.threats = [];
    this.projectiles = [];
    this.pickups = [];
    this.bonus = [];          // bottles and rings: shootable, floating
    this.boss = null;
    this.nextId = 1;
    this.sceneStats = { kills: 0, pops: 0 };
    this.intel = [];
    this.result = null;
    this.prevBase = null;
    this.waveIdx = 0;
    this.waveQueue = [];
    this.clearing = false;
    // The world: the stage's boxes (solid or not) and the scene list.
    this.nPlayers = Math.max(1, Math.min(4, o.players ? o.players.length : 1));
    this.world = TC.buildStage(this, this.stage);
    this.scene = this.world.scenes[this.sceneIdx];
    this.base = this.scene.base;
    this.players = [];
    const n = this.nPlayers;
    for (let i = 0; i < n; i++) this.players.push(this.makePlayer(i, n, o.players ? o.players[i] || {} : {}, o.carry ? o.carry[i] : null));
    this.enterScene(this.sceneIdx, true);
  }

  // Lives at the start of a run: the dev slider when it is set (1 to 9), else the difficulty's.
  startLives() { return TC.tune.player.lives || this.diff.lives; }

  // A stream of random numbers for one purpose; never Math.random.
  rng(name) {
    if (!this.rngs[name]) this.rngs[name] = TC.stream(this.seed, name);
    return this.rngs[name];
  }
  id() { return this.nextId++; }
  emit(type, data) { this.events.push(Object.assign({}, data || {}, { type, t: +this.t.toFixed(4) })); }
  drain() { const e = this.events; this.events = []; return e; }

  makePlayer(i, n, meta, carry) {
    const y = (i - (n - 1) / 2) * TC.SLOT_GAP;
    const p = {
      id: i, name: meta.name || ('P' + (i + 1)), color: meta.color || '#e8443a', agent: meta.agent || 'kai',
      slotY: 0, x: 0, y: 0, z: TC.EYE_STAND, c: 0, want: false, aim: [0, 0],
      wpn: 0, mag: 9, pool: { mg: 0, shotgun: 0, gl: 0 }, owned: { handgun: true, mg: false, shotgun: false, gl: false },
      reloadT: -1, switchT: 0, shotT: 0, bloom: 0, recoil: 0, invul: 0, lives: this.startLives(), score: 0, chain: 0,
      bestChain: 0, mult: 1, continues: 0, out: false, outT: 0, dead: false, lastFire: false, hit: 0, flash: 0,
      stats: { shots: 0, hits: 0, headshots: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0 },
      wasIn: false,
    };
    p.slotY = y;
    p.x = this.base || 0;
    if (carry) {
      p.lives = carry.lives; p.score = carry.score; p.continues = carry.continues || 0;
      p.pool = Object.assign(p.pool, carry.pool || {}); p.owned = Object.assign(p.owned, carry.owned || {});
      p.stats = Object.assign(p.stats, carry.stats || {}); p.bestChain = carry.bestChain || 0; p.intel = carry.intel || [];
    }
    return p;
  }

  // The poses. A stand pose is at the slot, looking east (yaw 0); the cover pose is lower and a step back.
  standPose(p) { return [this.base, p.slotY, TC.EYE_STAND]; }
  coverPose(p) { return [this.base - 6, p.slotY, TC.EYE_COVER]; }
  // The logical camera for a player: pose blended by cover c.
  camFor(p) {
    const s = this.standPose(p), c = this.coverPose(p), k = TC.smooth(p.c);
    return { x: TC.lerp(s[0], c[0], k), y: TC.lerp(s[1], c[1], k), z: TC.lerp(s[2], c[2], k), yaw: 0, pitch: 0,
      fov: TC.tune.view.fov, roll: Math.sin(Math.PI * p.c) * 2 * Math.PI / 180 };
  }
  exposed(p) { return p.c < 0.5; }
  // What a player can fire: 'handgun' always, the specials when they have ammo.
  available(p) { return TC.WEAPON_ORDER.filter(w => w === 'handgun' || p.owned[w]); }
  weaponId(p) { return TC.WEAPON_ORDER[p.wpn]; }
  ammoOf(p, w) { return w === 'handgun' ? p.mag : p.pool[w] || 0; }

  // Enter a scene: its base moves the rail, the nests and walls are already in the world.
  enterScene(idx, first) {
    this.sceneIdx = idx;
    this.scene = this.world.scenes[idx];
    this.prevBase = first ? this.scene.base : this.base;
    this.base = this.scene.base;
    this.placeSlots();
    this.ride = this.scene.ride ? { to: this.base + this.scene.ride.dx, speed: this.scene.ride.speed, started: false, done: false } : null;
    this.timeMax = this.scene.time * this.diff.time * TC.tune.time.sceneMul;
    this.timer = this.timeMax;
    this.phase = 'arrive';
    this.phaseT = 0;
    this.enemies = [];
    this.threats = [];
    this.projectiles = [];
    this.bonus = [];
    this.waveQueue = this.scene.waves.map(w => Object.assign({}, w, { spawned: false }));
    this.waveIdx = 0;
    this.clearing = false;
    this.emit('scene', { index: idx, id: this.scene.id, title: this.scene.title, base: this.base, prev: this.prevBase });
    for (const p of this.players) {
      p.x = this.base; p.c = 0; p.want = false;
    }
    this.placeBonus();
  }

  // Restart the current area after a wiped-out team's continue: its waves start again, the score kept as it is.
  restartScene() {
    for (const p of this.players) { p.out = false; p.dead = false; p.outT = 0; p.lives = this.startLives(); }
    this.enterScene(this.sceneIdx, false);
    this.emit('restart', { scene: this.scene.id });
  }

  // The per-step driver. cmds[i] is player i's command (missing = nothing held).
  step(dt, cmds = []) {
    if (this.over || this.frozen) return;
    this.t += dt;
    this.phaseT += dt;
    for (const p of this.players) {
      if (p.dead) continue;
      this.playerStep(p, dt, cmds[p.id] || {});
    }
    this.phaseStep(dt);
    this.enemiesStep(dt);
    this.threatsStep(dt);
    this.projectilesStep(dt);
    this.pickupsStep(dt);
    if (this.boss) this.bossStep(dt);
    this.timeStep(dt);
  }

  playerStep(p, dt, cmd) {
    if (p.out) {
      // Out of lives: the CONTINUE? count runs down; a press of fire or cover rejoins (plan 4.5).
      if (!p.dead) p.outT -= dt;
      if ((cmd.firePressed || cmd.coverPressed) && p.outT > 0) {
        // The whole team out: a continue restarts the area. Otherwise this player rejoins on their own half.
        if (this.players.every(q => q.out)) this.continueAll(p);
        else this.rejoin(p);
      }
      if (p.outT <= 0 && !p.dead) { p.dead = true; this.emit('dead', { player: p.id }); }
      return;
    }
    p.invul = Math.max(0, p.invul - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.bloom = Math.max(0, p.bloom - 6 * dt);
    p.recoil = Math.max(0, p.recoil - 6 * dt);
    p.shotT = Math.max(0, p.shotT - dt);
    p.switchT = Math.max(0, p.switchT - dt);
    // Aim: the reticle position in view units, kept on screen.
    if (cmd.aim) p.aim = [TC.clamp(cmd.aim[0], -1.6, 1.6), TC.clamp(cmd.aim[1], -1, 1)];
    // Cover: the blend moves toward the held state, in coverIn / coverOut seconds for the full move.
    const wantIn = !!cmd.cover;
    if (wantIn !== p.want) {
      p.want = wantIn;
      // Pop-out protection: a threat that would land within 0.15 s of leaving cover lands 0.15 s later.
      if (!wantIn) this.protectPopOut(p);
    }
    const target = p.want ? 1 : 0;
    const full = p.want ? TC.tune.player.coverIn : TC.tune.player.coverOut;
    const dir = target - p.c, step = dt / full;
    p.c = Math.abs(dir) <= step ? target : p.c + Math.sign(dir) * step;
    const inCover = p.c >= 0.5;
    if (inCover !== p.wasIn) {
      p.wasIn = inCover;
      this.emit(inCover ? 'cover-in' : 'cover-out', { player: p.id });
    }
    // Weapon cycle and number keys.
    if (cmd.next || cmd.prev || cmd.select) {
      const avail = this.available(p);
      let idx = p.wpn;
      if (cmd.select) {
        const want = TC.WEAPON_ORDER[cmd.select - 1];
        if (want && avail.includes(want)) idx = TC.WEAPON_ORDER.indexOf(want);
      } else {
        const cur = avail.indexOf(this.weaponId(p));
        const step = cmd.next ? 1 : -1;
        const nxt = avail[(cur + step + avail.length) % avail.length];
        idx = TC.WEAPON_ORDER.indexOf(nxt);
      }
      if (idx !== p.wpn) this.switchTo(p, idx);
    }
    // Weapon cycle while hidden: a fire press in cover cycles the weapons with ammo, for a trigger-only player.
    if (inCover && cmd.firePressed && !cmd.reload) {
      const avail = this.available(p);
      if (avail.length > 1) {
        const cur = avail.indexOf(this.weaponId(p));
        const nxt = avail[(cur + 1) % avail.length];
        this.switchTo(p, TC.WEAPON_ORDER.indexOf(nxt));
      }
    }
    // Reload: only in cover, the handgun's magazine.
    const w = TC.get('weapon', this.weaponId(p));
    if (inCover && (cmd.reload || (p.mag <= 0 && w.id === 'handgun' && cmd.fire)) && p.mag < w.mag && p.reloadT < 0) {
      p.reloadT = 0;
      this.emit('reload', { player: p.id });
    }
    if (p.reloadT >= 0) {
      if (!inCover) { p.reloadT = -1; }
      else {
        p.reloadT += dt;
        if (p.reloadT >= w.reloadCover * (TC.tune.player.reload / 0.30)) {
          p.mag = w.mag;
          p.reloadT = -1;
          this.emit('reloaded', { player: p.id });
        }
      }
    }
    // Empty specials: fall back to the handgun.
    if (w.id !== 'handgun' && this.ammoOf(p, w.id) <= 0) this.switchTo(p, 0);
    // Shooting. Not while the cover blend is high (c > 0.2), not while switching or reloading.
    const cur = TC.get('weapon', this.weaponId(p));
    const canFire = p.c <= 0.2 && p.reloadT < 0 && p.switchT <= 0 && this.phase !== 'continue';
    if (canFire && cmd.firePressed) this.tryFire(p, cur, true);
    else if (canFire && cmd.fire) {
      // Held: the machine gun fires on its own rate; the handgun auto-repeats when Hold-to-fire is on.
      if (cur.auto || (cur.id === 'handgun' && this.autoFire)) this.tryFire(p, cur, false);
    }
  }

  switchTo(p, idx) {
    if (idx === p.wpn) return;
    p.wpn = idx;
    const w = TC.get('weapon', TC.WEAPON_ORDER[idx]);
    p.switchT = w.switchT;
    p.reloadT = -1;
    this.emit('switch', { player: p.id, weapon: w.id });
  }

  // One player rejoins while the others play on: lives back, the score starts again from zero (the continue mark).
  rejoin(p) {
    p.out = false; p.dead = false; p.lives = this.startLives(); p.score = 0; p.continues++; p.outT = 0;
    this.emit('rejoin', { player: p.id });
  }

  // The whole team continues: every player's lives back, the scores reset, and the area starts again.
  continueAll(p) {
    for (const q of this.players) { q.continues++; q.score = 0; }
    this.emit('continue', { player: p.id });
    this.restartScene();
  }

  // The fire model, per weapon (plan 4.4). Hitscan rays from the logical camera; pellets for the shotgun; a projectile
  // for the grenade launcher.
  tryFire(p, w, pressed) {
    const id = w.id;
    if (p.shotT > 0) return;
    if (id === 'handgun') {
      if (p.mag <= 0) { if (pressed) this.emit('empty', { player: p.id }); return; }
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.mag--;
      p.shotT = 1 / (pressed ? w.rate : w.autoRate);
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, 1, 0, w.damage(), 'handgun');
    } else if (id === 'mg') {
      if (this.ammoOf(p, 'mg') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.mg--;
      p.shotT = 1 / w.rate();
      p.bloom = Math.min(3, p.bloom + 0.25);
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, 1, p.bloom, w.damage(), 'mg');
    } else if (id === 'shotgun') {
      if (this.ammoOf(p, 'shotgun') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.shotgun--;
      p.shotT = 1 / w.rate;
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.fireRays(p, w, w.pellets(), w.spread(), w.damage, 'shotgun');
    } else if (id === 'gl') {
      if (this.ammoOf(p, 'gl') <= 0) return;
      if (!this.cheats.ammo && !TC.tune.player.infiniteAmmo) p.pool.gl--;
      p.shotT = 1 / w.rate;
      p.recoil = Math.min(4, p.recoil + w.recoil);
      this.launchGrenade(p, w);
    }
    p.stats.shots++;
    this.emit('shot', { player: p.id, weapon: id });
  }

  // Ray directions for a shot: the aim (view units), with spread in degrees, from a stream of this player's own.
  aimDirs(p, n, spreadDeg) {
    const cam = this.camFor(p);
    const out = [];
    const rs = this.rng('p' + p.id + '.spread');
    for (let i = 0; i < n; i++) {
      let ax = p.aim[0], ay = p.aim[1];
      if (spreadDeg > 0) {
        const r = (spreadDeg * Math.PI / 180) * Math.sqrt(rs());
        const a = rs() * Math.PI * 2;
        const t = Math.tan((cam.fov * Math.PI / 180) / 2);
        ax += Math.cos(a) * r / t * (16 / 9) * 0.5;
        ay += Math.sin(a) * r / t * 0.5;
      }
      out.push(TC.aimRay(cam, ax, ay));
    }
    return out;
  }

  fireRays(p, w, n, spreadDeg, dmg, kind) {
    const cam = this.camFor(p);
    const o = [cam.x, cam.y, cam.z];
    const dirs = this.aimDirs(p, n, kind === 'mg' ? spreadDeg : spreadDeg);
    let anyHit = false;
    const muzzle = [o[0] + 4, o[1] + 0, o[2] - 4];
    for (const d of dirs) {
      const hit = this.traceShot(p, o, d, dmg, kind);
      if (hit) anyHit = true;
    }
    this.emit('flare', { player: p.id, from: muzzle, weapon: kind });
    if (!anyHit) {
      // A miss resets the chain (plan 4.5).
      if (p.chain > 0) p.chain = 0; p.mult = 1;
      this.emit('miss', { player: p.id, from: muzzle, dir: dirs[0] });
    }
  }

  // The nearest of everything along a ray: enemies (head and body), solid boxes, breakables, bonus pickups, shootable
  // projectiles, boss parts. Applies the result. Returns true when something a shot can score on was hit.
  traceShot(p, o, d, dmg, kind) {
    let best = { t: Infinity };
    const consider = (t, what) => { if (t >= 0 && t < best.t) best = Object.assign({ t }, what); };
    // An enemy that has stepped out to fire leans past its own nest wall: that wall does not hide it.
    const leaning = new Set(this.enemies.filter(e => e.alive && e.exposed && e.nest).map(e => e.nest));
    for (const b of this.world.boxes) {
      if (!b.solid) continue;
      if (b.nest && leaning.has(b.nest)) continue;
      const t = TC.rayBox(o, d, b.b);
      if (t >= 0) consider(t, { kind: 'box', box: b });
    }
    for (const e of this.enemies) {
      if (!e.alive || !e.exposed) continue;
      for (const v of this.hitVolumes(e)) {
        const t = TC.rayBox(o, d, v.b);
        if (t >= 0) consider(t, { kind: 'enemy', enemy: e, part: v.part });
      }
    }
    for (const q of this.bonus) {
      if (q.gone) continue;
      const t = TC.raySphere(o, d, [q.x, q.y, q.z], q.r);
      if (t >= 0) consider(t, { kind: 'bonus', item: q });
    }
    for (const pr of this.projectiles) {
      if (pr.gone || pr.noShoot) continue;
      const t = TC.raySphere(o, d, [pr.x, pr.y, pr.z], pr.r);
      if (t >= 0) consider(t, { kind: 'projectile', item: pr });
    }
    if (this.boss) this.bossVolumes(best, consider, o, d);
    for (const b of this.world.barrels || []) {
      if (b.gone) continue;
      const t = TC.rayBox(o, d, b.b);
      if (t >= 0) consider(t, { kind: 'barrel', item: b });
    }
    if (best.kind === undefined) {
      // Only the ground (or nothing) in the way: a miss.
      return false;
    }
    if (best.t > 1e6) return false;
    const at = [o[0] + d[0] * best.t, o[1] + d[1] * best.t, o[2] + d[2] * best.t];
    switch (best.kind) {
      case 'box': {
        const box = best.box;
        if (box.hp > 0) {
          box.hp -= dmg;
          if (box.hp <= 0) { this.breakBox(box, at, p); return true; }
        }
        this.emit('impact', { at, surface: box.mat, player: p.id });
        return false;
      }
      case 'enemy': {
        const e = best.enemy;
        if (best.part === 'hostage') {
          p.stats.hits++;
          this.hitCivilian(e, p, at, true);
          return true;
        }
        const head = best.part === 'head';
        this.damageEnemy(e, p, dmg * (head ? 2 : 1), head, at, kind, o, d);
        return true;
      }
      case 'bonus': {
        this.collectBonus(best.item, p, at);
        return true;
      }
      case 'projectile': {
        this.shootDown(best.item, p, at);
        return true;
      }
      case 'boss': {
        this.damageBoss(best.part, p, dmg, at);
        return true;
      }
      case 'barrel': {
        this.detonateBarrel(best.item, p);
        return true;
      }
      default: return false;
    }
  }

  // Hit volumes of a live enemy, from its position (a head and a body box). Crouched enemies in cover are not in
  // this list (they are not exposed).
  hitVolumes(e) {
    const s = e.size || 1;
    const x = e.x, y = e.y, z = e.z || 0;
    const head = { part: 'head', b: [x - 3.2 * s, y - 3.2 * s, z + 22 * s, x + 3.2 * s, y + 3.2 * s, z + 29 * s] };
    if (e.def && e.def.headOnly) {
      // The captor's hostage stands beside it: a shot at the hostage costs a life (plan 5.3).
      return [head, { part: 'hostage', b: [x + 8 * s - 3 * s, y - 3 * s, z, x + 8 * s + 3 * s, y + 3 * s, z + 20 * s] }];
    }
    return [head, { part: 'body', b: [x - 5 * s, y - 5 * s, z, x + 5 * s, y + 5 * s, z + 22 * s] }];
  }

  // Score and chain (plan 4.5).
  addScore(p, pts, at) {
    if (!pts) return;
    p.score += Math.round(pts * p.mult);
    this.emit('score', { player: p.id, pts: Math.round(pts * p.mult), at });
  }
  bumpChain(p) {
    p.chain++;
    p.bestChain = Math.max(p.bestChain, p.chain);
    p.mult = Math.min(2, 1 + Math.floor(p.chain / 5) * 0.1);
  }

  damageEnemy(e, p, dmg, head, at, kind, o, d) {
    const def = TC.get('enemy', e.type);
    p.stats.hits++;
    this.bumpChain(p);
    if (def.role === 'civilian') {
      this.hitCivilian(e, p, at);
      return;
    }
    e.hp -= dmg;
    e.lastHitBy = p.id;
    e.hurtT = 0.25;
    e.hitHead = head || e.hitHead;
    this.emit('hit', { player: p.id, enemy: e.id, head, at, dmg });
    this.addScore(p, 100, at);
    if (e.hp <= 0) {
      this.killEnemy(e, p, head, at, o, d);
    }
  }

  killEnemy(e, p, head, at, o, d) {
    const def = TC.get('enemy', e.type);
    e.alive = false; e.dead = true; e.deathT = 0; e.deathWhy = head ? 'head' : (e.hitKind || 'body');
    p.stats.kills++;
    let pts = def.score;
    if (head) { pts += 500; p.stats.headshots++; }
    const quick = e.exposedAt !== undefined && (this.t - e.exposedAt) <= 0.7;
    if (quick) { pts += 500; p.stats.quick++; }
    this.addScore(p, pts, at);
    if (def.elite) {
      const add = TC.tune.time.eliteBonus;
      if (this.phase === 'action' || this.phase === 'boss') this.timer += add;
      this.emit('timeExtend', { player: p.id, s: add });
    }
    if (def.drop) this.dropAmmo(e, p, at);
    // A jet-ski's fuel tank goes up with the rider: a bonus for the shooter and an area blast (plan 5.3).
    if (def.ski) { this.addScore(p, 1000, at); this.explode(e.x, e.y, 6, 40, 8, p); }
    this.emit('kill', { player: p.id, enemy: e.id, etype: e.type, head, at, quick });
  }

  // A civilian (or a hostage) is hit: the penalty is the same. A captor's hostage is hit alive: the captor stays.
  hitCivilian(e, p, at, hostage = false) {
    if (!hostage) { e.hp = 0; e.alive = false; e.dead = true; e.deathT = 0; e.deathWhy = 'civ'; }
    p.stats.civ++;
    this.addScore(p, -5000, at);
    this.loseLife(p, hostage ? 'hostage' : 'civilian', true);
    this.emit('civilian', { player: p.id, at, hostage });
  }

  // Quartermasters drop ammo for the killer: a random special, at once (plan 4.8).
  dropAmmo(e, p, at) {
    const pick = this.rng('drop').pick(['mg', 'shotgun', 'gl']);
    const w = TC.get('weapon', pick);
    const n = Math.round(w.pickup * TC.tune.weapon.ammoMul);
    const first = !p.owned[pick];
    p.owned[pick] = true;
    p.pool[pick] = Math.min(w.pool, (p.pool[pick] || 0) + n);
    this.emit('pickup', { player: p.id, kind: 'ammo', weapon: pick, n, at, first });
  }

  shootDown(pr, p, at) {
    pr.gone = true;
    p.stats.hits++;
    this.bumpChain(p);
    this.addScore(p, 1000, at);
    if (pr.kind === 'grenade') {
      this.explode(pr.x, pr.y, pr.z, 48, 6, 'enemy', p);
      const th = this.threats.find(t => t.pr === pr);
      if (th) { th.resolved = true; th.blown = true; this.emit('threatDown', { id: th.id, player: p.id }); }
    }
    this.emit('shootdown', { kind: pr.kind, at, player: p.id });
  }

  collectBonus(q, p, at) {
    q.gone = true;
    p.stats.hits++;
    this.bumpChain(p);
    if (q.kind === 'ring') {
      if (p.lives < 9) p.lives++;
      this.emit('pickup', { player: p.id, kind: 'ring', at });
      this.addScore(p, 2000, at);
    } else if (q.kind === 'bottle') {
      this.addScore(p, 2000, at);
      this.intel.push(q.intel);
      this.emit('pickup', { player: p.id, kind: 'intel', intel: q.intel, at });
    }
  }

  // Lose a life. An invulnerable player only loses it to a civilian or to TIME (ignoreInvul).
  loseLife(p, why, ignoreInvul) {
    if (!ignoreInvul && (p.invul > 0 || this.cheats.god || TC.tune.player.godMode)) return false;
    if (this.cheats.god || (TC.tune.player.godMode && !ignoreInvul)) return false;
    p.lives--;
    p.stats.lost++;
    p.chain = 0; p.mult = 1;
    p.invul = TC.tune.player.iframes;
    p.hit = 0.6;
    this.emit('lifeLost', { player: p.id, why, lives: p.lives });
    if (p.lives <= 0) this.playerOut(p);
    return true;
  }

  playerOut(p) {
    p.out = true;
    p.outT = TC.CONT_T;
    p.c = 0; p.want = false; p.reloadT = -1;
    this.emit('out', { player: p.id });
    if (this.players.every(q => q.out)) this.enterContinue();
  }

  enterContinue() {
    this.phase = 'continue';
    this.phaseT = 0;
    for (const p of this.players) if (p.out) { p.outT = TC.CONT_T; p.dead = false; }
    this.emit('phase', { phase: 'continue' });
  }

  // TIME (plan 4.5): counts only in action and boss fights. At zero, TIDE'S IN!, a life each, refill.
  timeStep(dt) {
    if (TC.tune.time.freeze || this.cheats.freeze) return;
    if (this.phase !== 'action' && this.phase !== 'boss') return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.timeMax * TC.tune.time.refill;
      this.emit('timeup', { t: this.t });
      for (const p of this.players) if (!p.out) this.loseLife(p, 'tide', true);
    }
  }

  // The scene director: arrival, ACTION, waves, clear, boss, stage clear.
  phaseStep(dt) {
    if (this.phase === 'continue') {
      // The CONTINUE? countdown: the sim is still, every out player can rejoin with a press.
      const allOut = this.players.every(p => p.out);
      if (allOut) {
        const left = TC.CONT_T - this.phaseT;
        if (left <= 0) this.gameOver();
      } else {
        this.phase = 'action';
        this.phaseT = 0;
      }
      return;
    }
    if (this.phase === 'arrive') {
      if (this.phaseT >= TC.ARRIVE) {
        this.phase = 'action';
        this.phaseT = 0;
        this.emit('phase', { phase: 'action' });
        this.startWaves();
      }
      return;
    }
    if (this.phase === 'action') {
      this.updateWaves();
      this.rideStep(dt);
      return;
    }
    if (this.phase === 'clear') {
      if (this.phaseT >= TC.CLEAR_T && !this.clearing) {
        this.clearing = true;
        this.advanceAfterClear();
      }
      return;
    }
    if (this.phase === 'boss') {
      if (this.boss && this.boss.defeated) {
        this.phase = 'outro';
        this.phaseT = 0;
        this.emit('phase', { phase: 'outro' });
      }
      return;
    }
    if (this.phase === 'outro') {
      if (this.phaseT >= 2) this.stageClear();
    }
  }

  startWaves() {
    this.waveIdx = 0;
    this.spawnedScene = true;
    this.emit('actionStart', { scene: this.scene.id });
    this.spawnPending();
  }

  // Waves: 'start' spawn at ACTION, 'clear' spawn when the field is clear, { t } at a time into the action.
  updateWaves() {
    const actionT = this.phaseT;
    // The field is clear when no combatant is alive: civilians walk on and never count (plan 4.10).
    const alive = () => this.enemies.filter(e => e.alive && e.role !== 'boss' && e.role !== 'civilian').length;
    for (let i = this.waveIdx; i < this.waveQueue.length; i++) {
      const wv = this.waveQueue[i];
      if (wv.spawned) continue;
      let go = false;
      if (wv.when === 'start') go = i === 0 || this.waveDone(i - 1);
      else if (wv.when === 'clear') go = alive() === 0;
      else if (wv.when && wv.when.t !== undefined) go = actionT >= wv.when.t;
      if (go) {
        wv.spawned = true;
        this.waveIdx = i;
        for (const [type, nest, extra] of wv.spawn) this.spawn(type, nest, extra || {});
        this.emit('wave', { index: i, n: wv.spawn.length });
      }
    }
    const done = this.waveQueue.every(w => w.spawned) && alive() === 0 && this.threats.every(t => t.resolved) && (!this.ride || this.ride.done);
    if (!done) return;
    if (this.scene.boss) { if (!this.boss) this.startBoss(this.scene.boss); }
    else this.toClear();
  }
  waveDone(i) { const w = this.waveQueue[i]; return !!w && w.spawned === true && this.enemies.filter(e => e.wave === i && e.alive).length === 0; }
  spawnPending() {
    // A 'start' wave spawns at ACTION; the rest wait for their trigger.
    this.updateWaves();
  }

  toClear() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.clearing = false;
    // The time bonus: remaining seconds x 100, per player who is still in.
    const secs = Math.max(0, Math.floor(this.timer));
    const bonus = secs * 100;
    for (const p of this.players) if (!p.out) this.addScore(p, bonus, null);
    this.emit('clear', { seconds: secs, bonus });
  }

  advanceAfterClear() {
    if (this.sceneIdx + 1 < this.world.scenes.length && !this.scene.final) {
      this.enterScene(this.sceneIdx + 1, false);
      this.emit('phase', { phase: 'arrive' });
    } else {
      this.stageClear();
    }
  }

  gameOver() {
    this.over = true;
    this.result = this.makeResult(false);
    this.emit('gameover', { result: this.result });
  }
  stageClear() {
    this.over = true;
    this.result = this.makeResult(true);
    this.emit('stageclear', { result: this.result });
  }

  // The results of a stage (plan 4.5): stats, accuracy, the ranks, and the no-damage bonus.
  makeResult(won) {
    const rows = this.players.map(p => {
      const s = p.stats;
      const acc = s.shots ? Math.round(100 * s.hits / s.shots) : 0;
      let rank = 'C';
      if (p.continues > 0) rank = 'D';
      else if (acc >= 75 && s.lost === 0) rank = 'S';
      else if (acc >= 60 && s.lost <= 1) rank = 'A';
      else if (acc >= 45) rank = 'B';
      const accBonus = acc * 300;
      const noDamage = s.lost === 0 && won ? 20000 : 0;
      return { id: p.id, name: p.name, score: p.score, rank, acc, shots: s.shots, hits: s.hits, kills: s.kills,
        headshots: s.headshots, quick: s.quick, saves: s.saves, lost: s.lost, civ: s.civ, bestChain: p.bestChain,
        continues: p.continues, accBonus, noDamage, total: p.score + accBonus + noDamage, time: Math.round(this.t) };
    });
    return { won, stage: this.stageId, difficulty: this.difficulty, rows, intel: this.intel.slice(), time: this.t,
      boss: !!(this.boss && this.boss.defeated) };
  }

  // Carry state for the next stage of an ARCADE run.
  carryOut() {
    return this.players.map(p => ({ lives: p.lives, score: p.score, continues: p.continues, pool: Object.assign({}, p.pool),
      owned: Object.assign({}, p.owned), stats: Object.assign({}, p.stats), bestChain: p.bestChain, intel: this.intel.slice() }));
  }

  // The protection for leaving cover: a threat that would land within 0.15 s is moved later.
  protectPopOut(p) {
    for (const th of this.threats) {
      if (th.resolved || th.target !== p.id) continue;
      if (th.impactAt - this.t < 0.15) th.impactAt += 0.15;
    }
  }

  // A snapshot of the state a presentation or a replica reads (plain data, no engine objects).
  snapshot() {
    return {
      t: this.t, phase: this.phase, phaseT: this.phaseT, scene: this.scene.id, sceneIdx: this.sceneIdx,
      base: this.base, timer: this.timer, timeMax: this.timeMax, stage: this.stageId, over: this.over,
      players: this.players.map(p => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.slotY, c: p.c,
        aim: p.aim, wpn: this.weaponId(p), mag: p.mag, pool: Object.assign({}, p.pool), owned: Object.assign({}, p.owned),
        lives: p.lives, score: p.score, chain: p.chain, mult: p.mult, out: p.out, outT: p.outT, invul: p.invul,
        reloadT: p.reloadT, stats: Object.assign({}, p.stats), continues: p.continues })),
      enemies: this.enemies.filter(e => !e.gone).map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, z: e.z,
        facing: e.facing, state: e.state, hp: e.hp, alive: e.alive, exposed: e.exposed, size: e.size })),
      threats: this.threats.filter(t => !t.resolved).map(t => ({ id: t.id, src: t.src, target: t.target,
        muzzle: t.muzzle, impactAt: t.impactAt, t0: t.t0, kind: t.kind })),
      projectiles: this.projectiles.filter(q => !q.gone).map(q => ({ id: q.id, kind: q.kind, x: q.x, y: q.y, z: q.z })),
      bonus: this.bonus.filter(q => !q.gone).map(q => ({ id: q.id, kind: q.kind, x: q.x, y: q.y, z: q.z })),
      boss: this.boss ? this.bossSnap() : null,
      intel: this.intel.slice(),
    };
  }
};

// ---- src/05-sim-enemies.js ----
// 05-sim-enemies.js: the Sim's enemy state machine (plan 4.6), the ThreatDirector (plan 4.7: the crisis flash), enemy
// and player projectiles, barrels and breakables, and the floating bonus targets. These are methods on Sim.prototype.
//
// An enemy's states: 'hide' (behind its wall, not targetable) -> 'aim' (stands and takes aim) -> 'fire' (a burst)
// -> 'hide'. A quartermaster runs its route ('flee') and drops ammo when shot. A civilian walks its route.
// Enemy shots become threats: each has a telegraph (the crisis flash) and an impact. At impact, a player who is still
// exposed takes the hit; one in cover blocks it, and the cover saves stat goes up.

TC.Sim.prototype.spawn = function (type, nestId, extra = {}) {
  const def = TC.get('enemy', type);
  const nest = nestId ? this.scene.nests.find(n => n.id === nestId) : null;
  let x, y;
  if (nest) { x = nest.x; y = nest.y; }
  else if (extra.route) { x = extra.route[0][0]; y = extra.route[0][1]; }
  else if (extra.at) { x = extra.at[0]; y = extra.at[1]; }
  else throw new Error('spawn ' + type + ': no place');
  const size = def.rig.size || 1;
  const e = {
    id: this.id(), type, role: def.role, nest: nest ? nest.id : null, x, y, z: 0, size, facing: nest ? Math.PI : 0,
    state: 'hide', timer: this.rng('enemy.hide').range(0.5, 1.4), shotT: 0, burstLeft: 0, hp: TC.enemyHp(def),
    alive: true, dead: false, gone: false, exposed: false, exposedAt: undefined, wave: this.waveIdx, route: extra.route || null,
    routeI: 1, hurtT: 0, deathT: 0, hitHead: false, rig: null, def, wallId: nest ? nest.wall : null,
  };
  if (extra.from) { e.x = extra.from[0]; e.y = extra.from[1]; e.state = 'enter'; e.enterTo = nest ? [nest.x, nest.y] : null; }
  if (extra.entry && nest) {
    // A scripted entry (plan 4.6): a jump or a rappel down onto the nest, a vault over its wall, or a door opening behind it.
    e.entry = extra.entry; e.enterT = 0; e.state = 'enter'; e.enterTo = [nest.x, nest.y];
    if (extra.entry === 'jump') { e.z0 = 70; e.z = 70; }
    if (extra.entry === 'rappel') { e.z0 = 90; e.z = 90; }
    if (extra.entry === 'vault') { e.x = nest.x - 34; e.y = nest.y; }
  }
  if (def.role === 'quartermaster') { e.state = 'flee'; e.exposed = true; e.exposedAt = this.t; }
  if (def.role === 'civilian') { e.state = 'walk'; e.exposed = true; e.exposedAt = this.t; }
  if (def.fly) e.z = def.fly;
  if (def.role === 'mover') { e.state = 'move'; e.exposed = true; e.exposedAt = this.t; e.shotT = def.every * 0.5; e.routeI = 1; e.route = extra.route || [[e.x, e.y]]; }
  if (def.role === 'rusher') { e.state = 'advance'; e.exposed = true; e.exposedAt = this.t; e.timer = 0; }
  e.rig = new E.Humanoid(Object.assign({}, def.rig));
  e.rig.facing = e.facing;
  this.enemies.push(e);
  this.emit('spawn', { id: e.id, etype: type, x, y });
  return e;
};

// Each step: the state machine, the rigs, the death timers.
TC.Sim.prototype.enemiesStep = function (dt) {
  const tu = TC.tune.enemy;
  for (const e of this.enemies) {
    if (e.gone) continue;
    if (!e.alive) {
      e.deathT += dt;
      e.exposed = true;
      if (e.deathT > 2.5 + 0.5) e.gone = true;
      this.enemyRig(e, dt, { down: Math.min(1, e.deathT * 2.2), pose: e.deathT < 0.2 ? 'die' : undefined });
      continue;
    }
    e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.role === 'civilian') { this.civStep(e, dt); this.enemyRig(e, dt, {}); continue; }
    if (e.role === 'quartermaster') { this.quartermasterStep(e, dt); this.enemyRig(e, dt, { run: 1 }); continue; }
    if (e.role === 'mover') { this.moverStep(e, dt); this.enemyRig(e, dt, { facing: e.facing, point: true }); continue; }
    if (e.role === 'rusher') { this.rusherStep(e, dt); this.enemyRig(e, dt, { run: e.state === 'advance' ? 1 : 0, facing: e.facing }); continue; }
    if (e.state === 'enter' && e.entry) {
      this.entryStep(e, dt);
      this.enemyRig(e, dt, { air: e.z > 0.5, facing: e.facing, run: e.entry === 'vault' ? 1 : 0 });
      continue;
    }
    if (e.state === 'enter') {
      const [tx, ty] = e.enterTo || [e.x, e.y];
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      const step = 90 * dt;
      if (d <= step) { e.x = tx; e.y = ty; e.state = 'hide'; e.timer = this.rng('enemy.hide').range(0.4, 1.0); }
      else { e.x += dx / d * step; e.y += dy / d * step; }
      this.enemyRig(e, dt, { run: 1, facing: Math.atan2(dy, dx) });
      continue;
    }
    if (e.state === 'hide') {
      e.exposed = false;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'aim';
        e.exposed = true;
        e.exposedAt = this.t;
        e.timer = e.def.aim * tu.reactMul * TC.tune.enemy.telegraphMul;
        this.emit('aim', { id: e.id });
      }
      this.enemyRig(e, dt, { pose: 'crouch', facing: e.facing });
      continue;
    }
    if (e.state === 'aim') {
      e.exposed = true;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'fire';
        const [lo, hi] = e.def.burst;
        e.burstLeft = this.rng('enemy.burst').int(lo, hi);
        e.shotT = 0;
      }
      this.enemyRig(e, dt, { point: true, facing: e.facing });
      continue;
    }
    if (e.state === 'fire') {
      e.exposed = true;
      e.shotT -= dt;
      if (e.shotT <= 0 && e.burstLeft > 0) {
        e.burstLeft--;
        e.shotT = e.def.gap * tu.fireMul;
        if (e.role === 'grenadier') this.lobGrenade(e);
        else this.enemyShot(e);
      }
      if (e.burstLeft <= 0 && e.shotT <= 0) {
        e.state = 'hide';
        e.timer = this.rng('enemy.hide').range(e.def.hide[0], e.def.hide[1]);
        e.exposed = false;
      }
      this.enemyRig(e, dt, { point: true, facing: e.facing });
      continue;
    }
  }
  this.enemies = this.enemies.filter(e => !e.gone);
};

// One scripted entry, in its own time: the drop and the rappel fall to the ground, the vault arcs over the wall, and
// the door keeps the enemy out of sight until it steps out.
TC.Sim.prototype.entryStep = function (e, dt) {
  e.enterT += dt;
  const span = e.entry === 'door' ? 0.8 : 0.7;
  const u = Math.min(1, e.enterT / span);
  if (e.entry === 'jump' || e.entry === 'rappel') e.z = e.z0 * (1 - u) * (1 - u);
  else if (e.entry === 'vault') { e.x = TC.lerp(e.enterTo[0] - 34, e.enterTo[0], u); e.z = 18 * Math.sin(Math.PI * u); }
  else e.z = 0;
  e.facing = Math.PI;
  if (u >= 1) {
    e.z = 0; e.x = e.enterTo[0]; e.y = e.enterTo[1];
    e.state = 'hide'; e.timer = this.rng('enemy.hide').range(0.4, 1.0); e.exposed = false;
  }
};

TC.Sim.prototype.enemyRig = function (e, dt, s) {
  const r = e.rig;
  if (!r) return;
  r.update(dt, Object.assign({ x: e.x, y: e.y, z: e.z, facing: e.facing, hurt: e.hurtT > 0 ? 1 : undefined }, s));
};

// A quartermaster runs its route, out of the fight, and is gone at the end of it.
TC.Sim.prototype.quartermasterStep = function (e, dt) {
  const r = e.route;
  if (!r || e.routeI >= r.length) { e.gone = true; this.emit('escaped', { id: e.id }); return; }
  const [tx, ty] = r[e.routeI];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = 55 * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI++; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
};

// Civilians walk their route back and forth.
TC.Sim.prototype.civStep = function (e, dt) {
  const r = e.route;
  if (!r || r.length < 2) return;
  const [tx, ty] = r[e.routeI % r.length];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = 22 * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI = (e.routeI + 1) % r.length; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
};

// Choose which player an enemy shoots at: the alive player whose cover is weakest, else the nearest alive one.
TC.Sim.prototype.pickTarget = function (e) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return null;
  const rs = this.rng('enemy.target');
  let best = alive[0];
  for (const p of alive) {
    if (p.c > best.c + 0.001) best = p;
  }
  if (alive.length > 1 && rs() < 0.35) best = alive[Math.floor(rs() * alive.length)];
  return best;
};

// The muzzle of an enemy: its hand, at about the chest height.
TC.Sim.prototype.muzzleOf = function (e) {
  const s = e.size || 1;
  return [e.x + Math.cos(e.facing) * 6 * s, e.y + Math.sin(e.facing) * 6 * s, (e.z || 0) + 19 * s];
};

// The rail ride (a carrier, plan 4.2): once an area's waves are all spawned and the field is clear, the rail carries the
// camera forward to the ride's end. The player's cover walls for this area travel with it, and the area ends at the end.
TC.Sim.prototype.placeSlots = function () {
  for (const b of this.world.boxes) {
    if (b.slot === undefined || b.scene !== this.sceneIdx) continue;
    b.b = [this.base + 12, b.yc - 12, 0, this.base + 16, b.yc + 12, 16];
  }
};

TC.Sim.prototype.rideStep = function (dt) {
  const r = this.ride;
  if (!r || r.done) return;
  const alive = this.enemies.filter(e => e.alive && e.role !== 'civilian').length;
  if (!r.started) {
    if (alive > 0 || !this.waveQueue.every(w => w.spawned)) return;
    r.started = true;
    this.emit('ride', { to: r.to });
  }
  const step = r.speed * dt;
  this.base = Math.min(r.to, this.base + step);
  for (const p of this.players) p.x = this.base;
  this.placeSlots();
  if (this.base >= r.to) { r.done = true; this.emit('rideEnd', {}); }
};

// A mover runs its route (a drone over the harbour, a jet-ski on the water) and fires every `every` seconds.
TC.Sim.prototype.moverStep = function (e, dt) {
  const r = e.route;
  const [tx, ty] = r[e.routeI % r.length];
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const step = e.def.speed * dt;
  if (d <= step) { e.x = tx; e.y = ty; e.routeI = (e.routeI + 1) % r.length; }
  else { e.x += dx / d * step; e.y += dy / d * step; e.facing = Math.atan2(dy, dx); }
  e.shotT -= dt;
  if (e.shotT <= 0) { e.shotT = e.def.every * TC.tune.enemy.fireMul; this.enemyShot(e); }
};

// A rusher sprints at the nearest player, slashes at close range, and staggers back to run in again.
TC.Sim.prototype.rusherStep = function (e, dt) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return;
  const p = alive.reduce((a, b) => (Math.abs(b.x - e.x) < Math.abs(a.x - e.x) ? b : a));
  const tx = p.x + 40, ty = p.slotY;
  e.timer -= dt;
  if (e.state === 'advance') {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 36) {
      e.state = 'slash'; e.timer = e.def.tele * TC.tune.enemy.telegraphMul;
      e.exposed = true;
      this.addThreat({ src: e.id, target: p.id, muzzle: this.muzzleOf(e), tele: e.timer, kind: 'slash', pr: null });
    } else { e.x += dx / d * 110 * dt; e.y += dy / d * 110 * dt; e.facing = Math.atan2(dy, dx); }
  } else if (e.state === 'slash' && e.timer <= 0) {
    e.state = 'back'; e.timer = 1.2;
  } else if (e.state === 'back') {
    e.x -= 80 * dt;
    if (e.timer <= 0) { e.state = 'advance'; }
  }
};

// A rifle shot: a threat, or a miss (a tracer that passes near the player and never through the reticle).
TC.Sim.prototype.enemyShot = function (e) {
  const p = this.pickTarget(e);
  if (!p) return;
  const def = e.def;
  const muzzle = this.muzzleOf(e);
  const tele = def.tele * TC.tune.enemy.telegraphMul;
  const threat = def.threat === 'always' || this.rollThreat(p, tele);
  if (threat) {
    this.addThreat({ src: e.id, target: p.id, muzzle, tele, kind: def.kind || (def.elite ? 'sniper' : 'shot'), pr: null });
  } else {
    const c = this.camFor(p);
    const rs = this.rng('miss');
    const a = rs() * Math.PI * 2, r = 8 + rs() * 22;
    const to = [c.x + 2, c.y + Math.cos(a) * r, c.z + Math.sin(a) * r * 0.6];
    this.emit('miss-shot', { src: e.id, target: p.id, from: muzzle, to, t0: this.t });
  }
};

// The ThreatDirector's decision (plan 4.7): a chance per shot scaled by the dev slider and difficulty, a cap on the
// threats a player may have at once, and the minimum gap between one player's impacts.
TC.Sim.prototype.rollThreat = function (p, tele) {
  const cap = Math.max(1, TC.tune.enemy.maxThreats + (this.stageId >= 2 ? 1 : 0) + this.diff.threats);
  const active = this.threats.filter(t => !t.resolved && t.target === p.id).length;
  if (active >= cap) return false;
  const impactAt = this.t + tele;
  const last = this.lastImpact ? this.lastImpact[p.id] : -Infinity;
  if (impactAt - last < TC.tune.enemy.minGap) return false;
  const chance = 0.45 * TC.tune.enemy.threatMul * this.diff.threat;
  return this.rng('threat.roll').chance(chance);
};

// Add a threat: it telegraphs now (the crisis flash) and lands at impactAt.
TC.Sim.prototype.addThreat = function (spec) {
  const tele = spec.tele;
  const th = {
    id: this.id(), src: spec.src, target: spec.target, muzzle: spec.muzzle, t0: this.t, tele,
    impactAt: this.t + tele, kind: spec.kind, resolved: false, pr: spec.pr || null,
  };
  if (!this.lastImpact) this.lastImpact = {};
  this.lastImpact[spec.target] = th.impactAt;
  this.threats.push(th);
  this.emit('threat', { id: th.id, src: th.src, target: th.target, muzzle: th.muzzle, t0: th.t0, dur: tele, kind: th.kind });
  return th;
};

// Impacts resolve (plan 4.7): exposed and not invulnerable is a hit; otherwise the cover blocks it.
TC.Sim.prototype.threatsStep = function (dt) {
  for (const th of this.threats) {
    if (th.resolved || this.t < th.impactAt) continue;
    th.resolved = true;
    const p = this.players[th.target];
    if (!p || p.out) { this.emit('impactVoid', { id: th.id }); continue; }
    const exposed = p.c < 0.5;
    if (exposed && p.invul <= 0 && !this.cheats.god && !TC.tune.player.godMode) {
      this.emit('threatHit', { id: th.id, player: p.id, kind: th.kind });
      this.loseLife(p, th.kind, false);
    } else {
      p.stats.saves++;
      this.emit('blocked', { id: th.id, player: p.id, kind: th.kind });
    }
  }
  this.threats = this.threats.filter(t => !t.resolved || t.blown);
};

// Grenadiers lob a grenade to land in front of the target's cover (1.1 to 1.4 s).
TC.Sim.prototype.lobGrenade = function (e) {
  const p = this.pickTarget(e);
  if (!p) return;
  const rs = this.rng('grenade');
  const from = this.muzzleOf(e);
  const flight = 1.1 + rs() * 0.3;
  const to = [this.base - 4 + rs() * 6, p.slotY + (rs() - 0.5) * 20, 0];
  const pr = { id: this.id(), kind: 'grenade', from, to, flight, t0: this.t, x: from[0], y: from[1], z: from[2], r: 6, gone: false };
  this.projectiles.push(pr);
  this.addThreat({ src: e.id, target: p.id, muzzle: from, tele: flight, kind: 'grenade', pr });
  this.emit('lob', { id: pr.id, from, to, flight });
};

// Sim projectiles: enemy grenades on their arc (shootable: a shot explodes them in the air) and the player's GL rounds.
TC.Sim.prototype.projectilesStep = function (dt) {
  for (const pr of this.projectiles) {
    if (pr.gone) continue;
    if (pr.kind === 'grenade') {
      const u = TC.clamp((this.t - pr.t0) / pr.flight, 0, 1);
      pr.x = TC.lerp(pr.from[0], pr.to[0], u);
      pr.y = TC.lerp(pr.from[1], pr.to[1], u);
      pr.z = TC.lerp(pr.from[2], pr.to[2], u) + Math.sin(Math.PI * u) * 40;
      if (u >= 1) pr.gone = true;
    } else if (pr.kind === 'gl') {
      pr.vz -= 240 * dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt;
      pr.life -= dt;
      let hit = pr.life <= 0 || pr.z <= 0;
      if (!hit) for (const e of this.enemies) if (e.alive && e.exposed && Math.hypot(e.x - pr.x, e.y - pr.y) < 6 && pr.z < 28 * (e.size || 1)) { hit = true; break; }
      if (!hit) for (const b of this.world.boxes) if (b.solid && pr.x >= b.b[0] && pr.x <= b.b[3] && pr.y >= b.b[1] && pr.y <= b.b[4] && pr.z >= b.b[2] && pr.z <= b.b[5]) { hit = true; break; }
      if (hit) {
        pr.gone = true;
        const owner = this.players[pr.owner];
        this.explode(pr.x, pr.y, Math.max(0, pr.z), TC.tune.weapon.glRadius, TC.tune.weapon.glDmg, owner);
      }
    }
  }
  this.projectiles = this.projectiles.filter(p => !p.gone);
};

// The player's GL round: a ballistic arc from the muzzle along the aim.
TC.Sim.prototype.launchGrenade = function (p, w) {
  const cam = this.camFor(p);
  const d = this.aimDirs(p, 1, 0)[0];
  const sp = w.speed;
  const pr = { id: this.id(), kind: 'gl', owner: p.id, x: cam.x + d[0] * 6, y: cam.y + d[1] * 6, z: cam.z + d[2] * 6,
    vx: d[0] * sp, vy: d[1] * sp, vz: d[2] * sp, life: w.life, r: 3, gone: false, noShoot: true };
  this.projectiles.push(pr);
  this.emit('glFire', { id: pr.id, player: p.id, from: [pr.x, pr.y, pr.z] });
};

// Area damage: enemies in a radius lose hp by distance (falloff from the centre to the edge).
TC.Sim.prototype.explode = function (x, y, z, rad, dmg, owner) {
  this.emit('explode', { at: [x, y, z], rad });
  for (const e of this.enemies) {
    if (!e.alive || e.role === 'civilian') continue;
    const d = Math.hypot(e.x - x, e.y - y, (e.z + 14) - z);
    if (d > rad) continue;
    const f = 1 - 0.75 * (d / rad);
    e.hp -= dmg * f;
    e.hurtT = 0.25;
    if (e.hp <= 0 && owner) this.killEnemy(e, owner, false, [e.x, e.y, 14], null, null);
    else if (e.hp <= 0) { e.alive = false; e.dead = true; e.deathT = 0; }
  }
  for (const b of this.world.barrels || []) {
    if (b.gone || b.fuse) continue;
    const d = Math.hypot(b.x - x, b.y - y, b.z - z);
    if (d <= rad) b.fuse = 0.15;
  }
};

// A barrel: two shots (or one blast) and it goes; neighbours inside its radius go on a short fuse.
TC.Sim.prototype.detonateBarrel = function (b, p) {
  b.hp -= 1;
  if (b.hp > 0) { this.emit('impact', { at: [b.x, b.y, b.z], surface: 'metal', player: p.id }); return; }
  b.gone = true;
  this.explode(b.x, b.y, b.z, 56, 8, p);
  this.emit('barrel', { at: [b.x, b.y, b.z] });
};

// Pickups and fuses (barrel chains) each step.
TC.Sim.prototype.pickupsStep = function (dt) {
  for (const b of this.world.barrels || []) {
    if (b.gone || b.fuse === undefined) continue;
    b.fuse -= dt;
    if (b.fuse <= 0) { b.fuse = undefined; b.gone = true; this.explode(b.x, b.y, b.z, 56, 8, null); this.emit('barrel', { at: [b.x, b.y, b.z] }); }
  }
  for (const q of this.bonus) if (!q.gone) q.bob = (q.bob || 0) + dt;
  this.bonus = this.bonus.filter(q => !q.gone);
};

// The floating bonus targets of an area: life rings and intel bottles, shootable (plan 4.8).
TC.Sim.prototype.placeBonus = function () {
  for (const b of this.scene.bonus || []) {
    this.bonus.push({ id: this.id(), kind: b.kind, x: b.at[0], y: b.at[1], z: b.at[2], r: 6, intel: b.intel || null, gone: false });
  }
};

// Breakable boxes (crates) and barrels: the world's boxes carry hp; a crate that breaks drops out of the world.
TC.Sim.prototype.breakBox = function (box, at, p) {
  box.gone = true;
  box.solid = false;
  this.emit('break', { at, mat: box.mat, player: p.id });
  this.addScore(p, 50, at);
};

// ---- src/06-sim-boss.js ----
// 06-sim-boss.js: the boss framework (plan 4.9). A boss is a set of boxed parts on a root that faces the players. Weak
// parts (turrets, claws, lamps) guard the core: the core takes damage only once they are all down. Every attack is a
// threat or a projectile, so cover, telegraphs and TIME work for bosses the same way as for the rest.
//
// def('boss', id, { name, title, time, coreHp, parts: [{ id, box (root-relative: x toward the players, y across, z up),
//   hp, weak, mat, core }], phases: [{ at (core hp fraction below which it applies), attacks: [...], interval }] })

TC.def('boss', 'tidewhip', {
  name: 'TIDEWHIP', title: 'Black Current gunboat', time: 100, coreHp: 18, root: [236, 0, 0],
  parts: [
    { id: 'hull', box: [-30, -30, 0, 30, 30, 14], hp: 0, mat: 'hull', core: false, decor: true },
    { id: 'turretL', box: [-6, -24, 14, 8, -12, 26], hp: 10, weak: true, mat: 'steel', label: 'PORT TURRET' },
    { id: 'turretR', box: [-6, 12, 14, 8, 24, 26], hp: 10, weak: true, mat: 'steel', label: 'STARBOARD TURRET' },
    { id: 'bridge', box: [-10, -10, 14, 10, 10, 34], hp: 18, core: true, mat: 'steel', label: 'BRIDGE' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage', 'sweep'], interval: 2.6 },
    { at: 0.5, attacks: ['barrage', 'sweep', 'lob'], interval: 1.9 },
  ],
});

TC.def('boss', 'warden', {
  name: 'ORSO MARR', title: 'the lamp warden, Lighthouse Point', time: 100, coreHp: 16, root: [250, 0, 0],
  parts: [
    { id: 'tower', box: [-14, -14, 0, 14, 14, 60], hp: 0, mat: 'brick', decor: true },
    { id: 'lampL', box: [-6, -26, 56, 6, -14, 70], hp: 8, weak: true, mat: 'glass', label: 'WEST LAMP' },
    { id: 'lampR', box: [-6, 14, 56, 6, 26, 70], hp: 8, weak: true, mat: 'glass', label: 'EAST LAMP' },
    { id: 'core', box: [-10, -10, 62, 10, 10, 84], hp: 16, core: true, mat: 'steel', label: 'LANTERN' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage'], interval: 2.4 },
    { at: 0.5, attacks: ['barrage', 'lob', 'sweep'], interval: 1.7 },
  ],
});

TC.def('boss', 'krake', {
  name: 'ADMIRAL KRAKE', title: 'in the LEVIATHAN mech', time: 120, coreHp: 26, root: [270, 0, 0],
  parts: [
    { id: 'legs', box: [-24, -30, 0, 24, 30, 16], hp: 0, mat: 'hull', decor: true },
    { id: 'clawL', box: [-10, -40, 16, 12, -22, 36], hp: 12, weak: true, mat: 'steel', label: 'LEFT CLAW' },
    { id: 'clawR', box: [-10, 22, 16, 12, 40, 36], hp: 12, weak: true, mat: 'steel', label: 'RIGHT CLAW' },
    { id: 'shell', box: [-16, -16, 18, 16, 16, 44], hp: 26, core: true, mat: 'steel', label: 'REACTOR SHELL' },
  ],
  phases: [
    { at: 1.01, attacks: ['barrage', 'sweep'], interval: 2.2 },
    { at: 0.5, attacks: ['barrage', 'sweep', 'lob'], interval: 1.5 },
  ],
});

// World-space boxes of a boss's parts, from its root (x toward the players, so the root's x is flipped).
TC.Sim.prototype.bossPartBox = function (part) {
  const b = this.boss, r = b.root, s = part.box;
  return [r[0] - s[3], r[1] + s[1], r[2] + s[2], r[0] - s[0], r[1] + s[4], r[2] + s[5]];
};

TC.Sim.prototype.startBoss = function (id) {
  const def = TC.get('boss', id);
  this.boss = {
    id, def, name: def.name, title: def.title, root: def.root.slice(), introT: 2.5, t: 0, attackT: 1.5,
    parts: def.parts.map(p => ({ id: p.id, hp: p.hp ? Math.ceil(p.hp * TC.tune.enemy.bossHpMul) : 0, max: p.hp, weak: !!p.weak,
      core: !!p.core, decor: !!p.decor, label: p.label || '', down: false })),
    defeated: false, phase: 0, bossT: 0,
  };
  this.boss.root[0] = this.base + def.root[0];
  this.boss.root[1] = 0;
  this.boss.root[2] = 0;
  this.timeMax = def.time * this.diff.time * TC.tune.time.sceneMul;
  this.timer = this.timeMax;
  this.phase = 'boss';
  this.phaseT = 0;
  this.emit('boss', { id, name: def.name, title: def.title });
  this.emit('phase', { phase: 'boss' });
};

// The boss's hit boxes for a ray: alive parts only (the core only once its weak parts are down).
TC.Sim.prototype.bossVolumes = function (best, consider, o, d) {
  const b = this.boss;
  if (!b || b.defeated) return;
  for (let i = 0; i < b.parts.length; i++) {
    const bp = b.parts[i];
    if (bp.decor || bp.down) continue;
    const def = b.def.parts[i];
    const t = TC.rayBox(o, d, this.bossPartBox(def));
    if (t >= 0) consider(t, { kind: 'boss', part: bp.id });
  }
};

TC.Sim.prototype.bossArmored = function () {
  return this.boss.parts.some(p => p.weak && !p.down);
};

// A hit on a boss part. The core is armored while a weak part stands: the shot pings.
TC.Sim.prototype.damageBoss = function (partId, p, dmg, at) {
  const b = this.boss;
  const bp = b.parts.find(x => x.id === partId);
  if (!bp || bp.down) return;
  p.stats.hits++;
  this.bumpChain(p);
  if (bp.core && this.bossArmored()) {
    this.emit('ping', { at, player: p.id });
    return;
  }
  bp.hp -= dmg;
  this.addScore(p, 100, at);
  this.emit('bossHit', { part: bp.id, player: p.id, at, hp: bp.hp });
  if (bp.hp <= 0) {
    bp.down = true;
    if (bp.core) {
      b.defeated = true;
      this.addScore(p, 5000, at);
      this.emit('bossDown', { player: p.id, at });
    } else {
      this.addScore(p, 1500, at);
      this.emit('partDown', { part: bp.id, label: bp.label, player: p.id, at });
    }
  }
};

// Each step: the intro card, the phase, attacks on their interval, the parts' shots.
TC.Sim.prototype.bossStep = function (dt) {
  const b = this.boss;
  if (!b || b.defeated) return;
  b.t += dt;
  if (b.introT > 0) { b.introT -= dt; return; }
  b.bossT += dt;
  const core = b.parts.find(p => p.core);
  const frac = core ? core.hp / Math.max(1, core.max || b.def.coreHp) : 1;
  let ph = 0;
  for (let i = 0; i < b.def.phases.length; i++) if (frac < b.def.phases[i].at) ph = i;
  if (ph !== b.phase) { b.phase = ph; this.emit('bossPhase', { phase: ph }); }
  const phase = b.def.phases[b.phase];
  b.attackT -= dt * TC.tune.enemy.fireMul;
  if (b.attackT <= 0) {
    b.attackT = phase.interval * TC.tune.enemy.fireMul;
    const kind = this.rng('boss.attack').pick(phase.attacks);
    this.bossAttack(kind);
  }
};

TC.Sim.prototype.bossAttack = function (kind) {
  const alive = this.players.filter(p => !p.out);
  if (!alive.length) return;
  const rs = this.rng('boss.target');
  const aimAt = alive[Math.floor(rs() * alive.length)];
  const tele = TC.tune.enemy.telegraphMul * 0.9;
  if (kind === 'barrage' || kind === 'sweep') {
    const guns = this.boss.parts.map((p, i) => ({ p, def: this.boss.def.parts[i] }))
      .filter(x => !x.p.decor && !x.p.down && x.p.id !== 'core' && (x.p.weak || !this.bossArmored()));
    const src = guns.length ? guns : [{ p: this.boss.parts.find(p => p.core), def: this.boss.def.parts.find(p => p.core) }];
    const n = kind === 'sweep' ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const g = src[Math.floor(rs() * src.length)];
      const bx = this.bossPartBox(g.def);
      const muzzle = [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2];
      const threatTo = aimAt;
      this.addThreat({ src: g.p.id, target: threatTo.id, muzzle, tele: tele + k * 0.45, kind: 'boss', pr: null });
    }
    return;
  }
  if (kind === 'lob') {
    const rr = this.rng('boss.lob');
    const core = this.boss.parts.find(p => p.core);
    const cdef = this.boss.def.parts.find(p => p.core);
    const bx = this.bossPartBox(cdef);
    const from = [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2];
    const flight = 1.3;
    const to = [this.base - 4 + rr() * 6, aimAt.slotY + (rr() - 0.5) * 20, 0];
    const pr = { id: this.id(), kind: 'grenade', from, to, flight, t0: this.t, x: from[0], y: from[1], z: from[2], r: 6, gone: false };
    this.projectiles.push(pr);
    this.addThreat({ src: core.id, target: aimAt.id, muzzle: from, tele: flight, kind: 'grenade', pr });
  }
};

// The boss as plain data for the presentation and the AI Hub snapshot.
TC.Sim.prototype.bossSnap = function () {
  const b = this.boss;
  return { id: b.id, name: b.name, title: b.title, defeated: b.defeated, phase: b.phase, intro: b.introT > 0,
    root: b.root.slice(), parts: b.parts.map(p => ({ id: p.id, hp: p.hp, max: p.max, down: p.down, weak: p.weak, core: p.core, decor: p.decor, label: p.label })) };
};

// ---- src/07-world.js ----
// 07-world.js: the stage builder. A stage's scenes are written in relative coordinates (dx from the area's base, y across),
// and this turns them into the world: the ground, one cover wall per player slot, a wall in front of every nest, the
// crates and barrels, and the bonus targets, all in absolute world units (plan 4.10).
//
// A world box is { id, b: [x0, y0, z0, x1, y1, z1], mat, solid, hp?, cover?, deco? }. Solid boxes stop shots and are
// drawn; non-solid boxes (the ground, the water) are drawn only.
TC.AREA_SPACING = 380;   // u between the bases of two areas
TC.AREA_LEAD = 40;       // u from the stage origin to the first area's base

TC.buildStage = function (sim, def) {
  const world = { boxes: [], barrels: [], scenes: [], id: def.id, env: def.env || {} };
  let nextId = 1;
  const add = (b, mat, o = {}) => {
    const box = { id: nextId++, b, mat, solid: o.solid !== false, hp: o.hp || 0, cover: !!o.cover, deco: o.deco || null, nest: o.nest || null };
    world.boxes.push(box);
    return box;
  };
  const n = sim.nPlayers;
  def.scenes.forEach((sc, i) => {
    const base = TC.AREA_LEAD + i * TC.AREA_SPACING;
    const ex = TC.EXTRAS[sc.id] || {};
    const abs = pt => [base + pt[0], pt[1], pt[2] === undefined ? 0 : pt[2]];
    const scene = Object.assign({}, sc, {
      index: i, base, final: !!sc.boss,
      nests: (sc.nests || []).concat(ex.nests || []).map(nst => Object.assign({}, nst, { x: base + nst.dx, y: nst.y, wall: null })),
      ride: sc.ride || ex.ride || null,
      bonus: (sc.bonus || []).map(bn => ({ kind: bn.kind, intel: bn.intel || null, at: abs(bn.at) })),
      waves: (sc.waves || []).concat(ex.waves || []).map(w => ({ when: w.when, spawn: w.spawn.map(([type, nest, extra]) => [type, nest, absExtra(extra, base)]) })),
    });
    // The ground of the area (and the water, where the stage has it).
    const gx0 = base - 60, gx1 = base + TC.AREA_SPACING - 20;
    add([gx0, -260, -2, gx1, 260, 0], def.ground || 'asphalt', { solid: false, deco: 'ground' });
    if (def.env && def.env.water !== undefined) add([gx0, -260, def.env.water - 6, gx1, 260, def.env.water], 'water', { solid: false, deco: 'water' });
    // One cover wall per player slot, a step in front of the camera: standing eyes see over it, crouched eyes do not.
    for (let k = 0; k < n; k++) {
      const y = (k - (n - 1) / 2) * TC.SLOT_GAP;
      const wall = add([base + 12, y - 12, 0, base + 16, y + 12, 16], 'sandbag', { cover: true, deco: 'slot' + k });
      Object.assign(wall, { slot: k, yc: y, scene: i });
    }
    // The wall in front of every nest: the enemy stands behind it, out of sight when it crouches.
    for (const nst of scene.nests) {
      const w = add([nst.x - 7, nst.y - 9, 0, nst.x - 3, nst.y + 9, 22], nst.mat || 'concrete', { cover: true, nest: nst.id });
      nst.wall = 'w' + w.id;
      nst.wallBox = w.id;
      if (nst.post) add([nst.x - 9, nst.y - 11, 0, nst.x - 7, nst.y - 9, 30], 'steel', { deco: 'post' });
    }
    // Props: crates (breakable), barrels (explosive), and plain boxes for the set.
    for (const pr of sc.props || []) {
      const x = base + pr.dx, y = pr.y;
      if (pr.kind === 'crate') add([x - 7, y - 7, 0, x + 7, y + 7, 14], 'crate', { hp: pr.hp || 3, cover: true });
      else if (pr.kind === 'barrel') {
        const b = [x - 4, y - 4, 0, x + 4, y + 4, 14];
        add(b, 'barrel', { hp: 0 });
        world.barrels.push({ id: nextId++, b, x, y, z: 7, hp: 2, gone: false, fuse: undefined });
      } else if (pr.kind === 'box') {
        add([x + (pr.x0 || 0), y + (pr.y0 || 0), pr.z0 || 0, x + (pr.x1 || 0), y + (pr.y1 || 0), pr.z1 || 20], pr.mat || 'concrete', { cover: !!pr.cover, solid: pr.solid !== false });
      }
    }
    if (sc.decorate) sc.decorate({ add, base, n, world, scene });
    world.scenes.push(scene);
  });
  return world;
};

// Turn a wave's spawn extras from relative to absolute coordinates (routes and starting points).
function absExtra(extra, base) {
  if (!extra) return {};
  const out = Object.assign({}, extra);
  if (extra.route) out.route = extra.route.map(p => [base + p[0], p[1]]);
  if (extra.from) out.from = [base + extra.from[0], extra.from[1]];
  if (extra.at) out.at = [base + extra.at[0], extra.at[1]];
  return out;
}

// The stage registry entry. Each stage's data is in its own fragment; a stage is built per Sim.
TC.stageFor = function (id) {
  return TC.get('stage', id);
};

// ---- src/10-stages.js ----
// 10-stages.js: the content of the three stages and the training range (plan 5.4 to 5.8, reduced). Scenes are written in
// relative coordinates (see 07-world.js). A wave: { when: 'start' | 'clear' | { t: seconds }, spawn: [[type, nestId, extra]] }.
// Routes and starts in extra are relative too: route: [[dx, y], ...], from: [dx, y], at: [dx, y].

// Set dressing for an area: stalls, lanterns, a tower, cranes. Deterministic (its own stream), so every copy of a stage
// looks the same.
function dress(kind) {
  return function ({ add, base, n, world, scene }) {
    const r = TC.stream(TC.hash(scene.id), 'dress');
    const count = kind === 'storm' ? 6 : 7;
    for (let i = 0; i < count; i++) {
      const x = base + 20 + r() * 330, y = (r() < 0.5 ? -1 : 1) * (80 + r() * 90);
      const w = 14 + r() * 18, h = 20 + r() * 40;
      add([x - w / 2, y - w / 2, 0, x + w / 2, y + w / 2, h], kind === 'festival' ? 'festival' : kind === 'storm' ? 'hut' : 'container', { cover: false, deco: 'set' });
    }
    if (kind === 'festival') {
      for (let i = 0; i < 4; i++) {
        const x = base + 50 + i * 80, y = -110;
        add([x - 1, y - 1, 0, x + 1, y + 1, 56], 'steel', { cover: false, deco: 'lamppost' });
        add([x - 6, y - 6, 52, x + 6, y + 6, 60], 'lantern', { solid: false, deco: 'lantern' });
      }
    }
  };
}

// Stage 1: HARBOR LIGHTS. Port Lumen Docks, 23:40, the Lantern Festival.
TC.def('stage', 1, {
  name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', ground: 'dock', env: { water: -24, sky: 'night' },
  scenes: [
    {
      id: '1-1', title: 'LANTERN PIER', time: 45,
      nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 150, y: 40 },
        { id: 'n4', dx: 230, y: -22 }, { id: 'n5', dx: 240, y: 30 }, { id: 'n6', dx: 300, y: 0 },
      ],
      props: [{ kind: 'crate', dx: 120, y: -30 }, { kind: 'barrel', dx: 200, y: 20 }, { kind: 'crate', dx: 220, y: 40 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n3'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['deckhand', 'n4'], ['quartermaster', null, { route: [[260, -80], [380, -80]] }]] },
        { when: 'clear', spawn: [['redtide', 'n5'], ['civilian', null, { route: [[200, -60], [200, 60]] }], ['deckhand', 'n6']] },
      ],
      bonus: [{ kind: 'ring', at: [270, -60, 30] }],
      decorate: dress('festival'),
    },
    {
      id: '1-2', title: 'CRANE ROW', time: 50,
      nests: [
        { id: 'n1', dx: 160, y: -50 }, { id: 'n2', dx: 180, y: -10 }, { id: 'n3', dx: 170, y: 30 },
        { id: 'n4', dx: 260, y: 0, post: true }, { id: 'n5', dx: 280, y: -40 }, { id: 'n6', dx: 300, y: 40, mat: 'steel' },
      ],
      props: [{ kind: 'barrel', dx: 150, y: 0 }, { kind: 'crate', dx: 240, y: -60 }, { kind: 'crate', dx: 250, y: 60, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['shield', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['grenadier', 'n4'], ['deckhand', 'n5']] },
        { when: 'clear', spawn: [['redtide', 'n6'], ['redtide', 'n1'], ['quartermaster', null, { route: [[250, 90], [390, 90]] }]] },
      ],
      bonus: [{ kind: 'bottle', intel: 'A ferry timetable with the 2am run circled. Somebody knew about the tide.', at: [300, -90, 12] }],
      decorate: dress('harbor'),
    },
    {
      id: '1-3', title: 'CANAL GATE', time: 50,
      nests: [
        { id: 'n1', dx: 150, y: -30 }, { id: 'n2', dx: 160, y: 30 }, { id: 'n3', dx: 230, y: 0 },
        { id: 'n4', dx: 280, y: -50 }, { id: 'n5', dx: 300, y: 50 },
      ],
      props: [{ kind: 'crate', dx: 130, y: 0, hp: 3 }, { kind: 'barrel', dx: 260, y: 26 }, { kind: 'barrel', dx: 270, y: 34 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['shield', 'n3'], ['grenadier', 'n4'], ['deckhand', 'n5']] },
        { when: 'clear', spawn: [['redtide', 'n1'], ['civilian', null, { route: [[220, -70], [240, 70]] }], ['quartermaster', null, { route: [[280, -90], [400, -90]] }]] },
      ],
      bonus: [{ kind: 'ring', at: [240, 80, 36] }],
      decorate: dress('harbor'),
    },
    {
      id: '1-B', title: 'BARRACUDA', time: 40, boss: 'tidewhip',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2']] }],
      decorate: dress('harbor'),
    },
  ],
});

// Stage 2: STORM SIGNAL. Gull's Rest and Lighthouse Point, 02:10, a thunderstorm.
TC.def('stage', 2, {
  name: 'STORM SIGNAL', place: "Gull's Rest and Lighthouse Point", clock: '02:10', music: 'storm', ground: 'stone', env: { water: -30, sky: 'storm' },
  scenes: [
    {
      id: '2-1', title: "GULL'S REST", time: 50,
      nests: [
        { id: 'n1', dx: 150, y: -50 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 160, y: 50 },
        { id: 'n4', dx: 240, y: -30 }, { id: 'n5', dx: 260, y: 30 },
      ],
      props: [{ kind: 'crate', dx: 130, y: -20 }, { kind: 'crate', dx: 230, y: 0, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['shield', 'n4'], ['quartermaster', null, { route: [[220, -90], [360, -90]] }], ['deckhand', 'n5']] },
      ],
      bonus: [{ kind: 'ring', at: [240, 70, 34] }],
      decorate: dress('storm'),
    },
    {
      id: '2-2', title: 'LIGHTHOUSE STAIRS', time: 55,
      nests: [
        { id: 'n1', dx: 170, y: -40 }, { id: 'n2', dx: 240, y: 10 }, { id: 'n3', dx: 300, y: -20, post: true },
        { id: 'n4', dx: 180, y: 50 },
      ],
      props: [{ kind: 'barrel', dx: 200, y: -10 }, { kind: 'crate', dx: 260, y: 60, hp: 3 }],
      waves: [
        { when: 'start', spawn: [['sniper', 'n3'], ['deckhand', 'n1']] },
        { when: 'clear', spawn: [['redtide', 'n2'], ['deckhand', 'n4'], ['shield', 'n1']] },
      ],
      bonus: [{ kind: 'bottle', intel: 'Lighthouse log, 02:04: lamp shuttered, no reason given. Ink smudged.', at: [330, -70, 40] }],
      decorate: dress('storm'),
    },
    {
      id: '2-3', title: 'WATER TOWER', time: 55,
      nests: [
        { id: 'n1', dx: 160, y: -30 }, { id: 'n2', dx: 180, y: 40 }, { id: 'n3', dx: 260, y: 0, mat: 'steel' },
        { id: 'n4', dx: 300, y: -50 },
      ],
      props: [{ kind: 'barrel', dx: 280, y: 40 }, { kind: 'crate', dx: 140, y: 30 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['civilian', null, { route: [[200, -70], [220, 70]] }], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['grenadier', 'n3'], ['redtide', 'n4']] },
        { when: 'clear', spawn: [['quartermaster', null, { route: [[220, 90], [380, 90]] }], ['sniper', 'n4']] },
      ],
      bonus: [{ kind: 'ring', at: [290, 60, 30] }],
      decorate: dress('storm'),
    },
    {
      id: '2-B', title: 'THE WARDEN', time: 60, boss: 'warden',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['shield', 'n1'], ['deckhand', 'n2']] }],
      decorate: dress('storm'),
    },
  ],
});

// Stage 3: THE TIDEWALL. The sluice gate, 05:20 to dawn: the last push before the king tide.
TC.def('stage', 3, {
  name: 'THE TIDEWALL', place: 'Sluice Locks, Tidewall', clock: '05:20', music: 'dawn', ground: 'concrete', env: { water: -36, sky: 'dawn' },
  scenes: [
    {
      id: '3-1', title: 'SLUICE GATE', time: 55,
      nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 20 }, { id: 'n3', dx: 220, y: -50 },
        { id: 'n4', dx: 250, y: 40, mat: 'steel' }, { id: 'n5', dx: 300, y: 0 },
      ],
      props: [{ kind: 'barrel', dx: 190, y: 50 }, { kind: 'crate', dx: 150, y: 0, hp: 3 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['shield', 'n4'], ['quartermaster', null, { route: [[240, -90], [380, -90]] }], ['deckhand', 'n5']] },
      ],
      bonus: [{ kind: 'ring', at: [260, -70, 36] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-2', title: 'TURBINE HALL', time: 60,
      nests: [
        { id: 'n1', dx: 170, y: -50 }, { id: 'n2', dx: 190, y: 0 }, { id: 'n3', dx: 230, y: 50 },
        { id: 'n4', dx: 280, y: -20, post: true }, { id: 'n5', dx: 320, y: 30 },
      ],
      props: [{ kind: 'barrel', dx: 160, y: -20 }, { kind: 'barrel', dx: 260, y: 20 }, { kind: 'barrel', dx: 275, y: 26 }],
      waves: [
        { when: 'start', spawn: [['deckhand', 'n1'], ['redtide', 'n2'], ['deckhand', 'n3']] },
        { when: 'clear', spawn: [['grenadier', 'n4'], ['shield', 'n5'], ['civilian', null, { route: [[230, -80], [230, 80]] }]] },
      ],
      bonus: [{ kind: 'bottle', intel: 'Tidewall roster: the Current paid in crates, not in names.', at: [300, 80, 22] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-3', title: 'CAUSEWAY', time: 60,
      nests: [
        { id: 'n1', dx: 160, y: -40 }, { id: 'n2', dx: 200, y: 30 }, { id: 'n3', dx: 300, y: -10, post: true },
        { id: 'n4', dx: 260, y: 60 },
      ],
      props: [{ kind: 'crate', dx: 230, y: -60, hp: 2 }],
      waves: [
        { when: 'start', spawn: [['sniper', 'n3'], ['deckhand', 'n1'], ['deckhand', 'n2']] },
        { when: 'clear', spawn: [['redtide', 'n4'], ['shield', 'n1'], ['quartermaster', null, { route: [[220, 90], [380, 90]] }]] },
      ],
      bonus: [{ kind: 'ring', at: [280, 80, 30] }],
      decorate: dress('harbor'),
    },
    {
      id: '3-B', title: 'LEVIATHAN', time: 80, boss: 'krake',
      nests: [{ id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 40 }],
      props: [],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['shield', 'n2']] }],
      decorate: dress('harbor'),
    },
  ],
});

// The training range (plan 5.8): three drills that teach every mechanic. A drill ends when its field is clear; the
// whole range's time is kept as the record.
TC.def('stage', 'range', {
  name: 'CREST RANGE', place: 'CREST training range', clock: '10:00', music: 'range', ground: 'concrete', env: { water: null, sky: 'day' },
  scenes: [
    {
      id: 'R1', title: 'DRILL 1: STATIC TARGETS', time: 90, nests: [
        { id: 'n1', dx: 150, y: -40 }, { id: 'n2', dx: 170, y: 0 }, { id: 'n3', dx: 150, y: 40 }, { id: 'n4', dx: 230, y: -20 },
      ],
      props: [{ kind: 'crate', dx: 130, y: 30, hp: 3 }],
      waves: [{ when: 'start', spawn: [['deckhand', 'n1'], ['deckhand', 'n2'], ['deckhand', 'n3']] }, { when: 'clear', spawn: [['deckhand', 'n4']] }],
      bonus: [],
    },
    {
      id: 'R2', title: 'DRILL 2: COVER AND RELOAD', time: 90, nests: [
        { id: 'n1', dx: 170, y: -30 }, { id: 'n2', dx: 200, y: 30 }, { id: 'n3', dx: 230, y: 0 },
      ],
      props: [],
      waves: [{ when: 'start', spawn: [['redtide', 'n1'], ['deckhand', 'n2']] }, { when: 'clear', spawn: [['deckhand', 'n3'], ['redtide', 'n1']] }],
      bonus: [],
    },
    {
      id: 'R3', title: 'DRILL 3: THE SPECIALS', time: 100, nests: [
        { id: 'n1', dx: 160, y: -40 }, { id: 'n2', dx: 200, y: 10 }, { id: 'n3', dx: 220, y: 50, mat: 'steel' },
      ],
      props: [{ kind: 'barrel', dx: 180, y: 30 }],
      waves: [{ when: 'start', spawn: [['shield', 'n3'], ['deckhand', 'n1']] }, { when: 'clear', spawn: [['grenadier', 'n2'], ['deckhand', 'n1']] }],
      bonus: [{ kind: 'bottle', intel: 'A CREST field note: "Hold your fire" applies to the festival, not the pier.', at: [240, 60, 18] }],
    },
  ],
});

// ---- src/11-roster.js ----
// 11-roster.js: the content that extends a stage's areas with the rest of the roster (plan 5.3, 5.4 to 5.7): more nests
// and waves for the areas that need them, and the rail ride of the canal area. Merged into each area by 07-world.js.
// It is data only: the behaviours are in 03-enemies.js and 05-sim-enemies.js.
TC.EXTRAS = {
  '1-1': { nests: [{ id: 'm1', dx: 280, y: 60 }], waves: [{ when: 'clear', spawn: [['marine', 'm1', { entry: 'rappel' }]] }] },
  '1-2': {
    nests: [{ id: 'r1', dx: 290, y: -60 }],
    waves: [{ when: 'clear', spawn: [['rocketeer', 'r1', { entry: 'vault' }]] }],
    ride: { dx: 150, speed: 70 },
  },
  '1-3': { waves: [
    { when: 'clear', spawn: [['jetski', null, { route: [[160, 90], [300, 90]] }]] },
    { when: 'clear', spawn: [['rusher', 'n3']] },
  ] },
  '2-1': { waves: [{ when: 'clear', spawn: [['drone', null, { route: [[200, -100], [340, -100]] }]] }] },
  '2-2': { nests: [{ id: 'g1', dx: 320, y: -10 }], waves: [{ when: 'clear', spawn: [['gunner', 'g1', { entry: 'door' }]] }] },
  '2-3': { nests: [{ id: 'c1', dx: 330, y: -70 }], waves: [{ when: 'clear', spawn: [['captor', 'c1']] }] },
  '3-1': { waves: [{ when: 'clear', spawn: [['marine', 'n1', { entry: 'jump' }]] }] },
  '3-2': { waves: [{ when: 'clear', spawn: [['captor', 'n3']] }] },
  '3-3': {
    nests: [{ id: 'g2', dx: 300, y: -60 }],
    waves: [
      { when: 'clear', spawn: [['gunner', 'g2']] },
      { when: 'clear', spawn: [['drone', null, { route: [[220, -110], [360, -110]] }]] },
    ],
  },
};

// ---- src/21-raster.js ----
// 21-raster.js: Rail3D, the renderer (plan 4.1). A software z-buffer rasterizer drawn into one pixel buffer per viewport,
// then put on the engine's low-resolution screen.
//   - triangles: perspective-correct (1/z, u/z, v/z), near-plane clipped, depth tested;
//   - light: a per-triangle level from the sun, the ambient and the point lights, quantized to the engine's five bands
//     and dithered with a 4x4 Bayer matrix;
//   - fog: quantized to eight steps with the same dither;
//   - the sky: a gradient, stars, a moon and a skyline silhouette, from the ray's elevation and azimuth;
//   - actors: the engine's rigs drawn with rig.draw from a view that faces the camera, composited where they are nearer.
// Everything runs in JS; nothing is read from the network. Canvas work happens only in present() and the billboards.

TC.NEAR = 2;                    // u
TC.FAR = 1400;                  // u, where fog is full
TC.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

TC.Raster = class Raster {
  constructor() {
    this.w = 0; this.h = 0;
    this.u32 = null; this.dep = null; this.cv = null; this.cx = null; this.img = null;
  }

  // (Re)allocate the buffer for a viewport of w x h pixels. Canvases are made only when drawing in a browser.
  size(w, h) {
    if (w === this.w && h === this.h && this.u32) return;
    this.w = w; this.h = h;
    this.dep = new Float32Array(w * h);
    if (typeof document !== 'undefined') {
      if (!this.cv) this.cv = document.createElement('canvas');
      this.cv.width = w; this.cv.height = h;
      this.cx = this.cv.getContext('2d');
      this.img = this.cx.createImageData(w, h);
      this.u32 = new Uint32Array(this.img.data.buffer);
    } else {
      this.u32 = new Uint32Array(w * h);
    }
  }

  // Begin a frame for a camera {x, y, z, yaw, pitch, fov, roll} and a viewport's aspect.
  begin(cam, env, t, lights) {
    const w = this.w, h = this.h;
    this.cam = cam;
    this.env = env;
    this.t = t;
    this.lights = lights || [];
    this.F = (h / 2) / Math.tan((cam.fov * Math.PI / 180) / 2);
    this.cxp = w / 2; this.cyp = h / 2;
    this.b = TC.basis(cam.yaw, cam.pitch);
    this.dep.fill(0);
    this.drawSky();
  }

  // Sky: the gradient by elevation, the stars, the moon, and the skyline at the horizon, per pixel.
  drawSky() {
    const { w, h, F, cxp, cyp, b, env, u32 } = this;
    const top = TC.hex(env.top || '#060a1c'), hor = TC.hex(env.horizon || '#2a3a6a'), dark = TC.hex(env.silhouette || '#0a0e1e');
    const moon = env.moon ? TC.V.norm(env.moon) : null;
    for (let y = 0; y < h; y++) {
      const dy = -(y + 0.5 - cyp) / F;
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cxp) / F;
        const d = [b.f[0] + b.r[0] * dx + b.u[0] * dy, b.f[1] + b.r[1] * dx + b.u[1] * dy, b.f[2] + b.r[2] * dx + b.u[2] * dy];
        const el = Math.asin(TC.clamp(d[2] / TC.V.len(d), -1, 1));
        const az = Math.atan2(d[1], d[0]);
        const k = TC.clamp(el / 0.5 + 0.12, 0, 1);
        let r = TC.lerp(hor[0], top[0], k), g = TC.lerp(hor[1], top[1], k), bl = TC.lerp(hor[2], top[2], k);
        if (el > 0.08) {
          const sh = TC.texHash(Math.floor(az * 120), Math.floor(el * 120), 77);
          if (sh > 0.9965) { r = g = bl = 255; }
        }
        if (moon) {
          const dot = TC.V.dot(TC.V.norm(d), moon);
          if (dot > 0.9985) { r = 255; g = 245; bl = 200; }
          else if (dot > 0.985) { const s = (dot - 0.985) / 0.0135; r = TC.lerp(r, 255, s * 0.5); g = TC.lerp(g, 230, s * 0.5); bl = TC.lerp(bl, 180, s * 0.5); }
        }
        const sky = TC.skyline(az, env.skyline || 0);
        if (el < sky) { r = dark[0]; g = dark[1]; bl = dark[2]; }
        u32[y * w + x] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
  }

  // Lighting level of a point (0..1.2+) from the sun, the ambient and the point lights.
  light(n, p) {
    const env = this.env;
    let L = env.ambient;
    const sd = env.sunDir;
    if (sd) L += env.sunK * Math.max(0, TC.V.dot(n, sd));
    for (const li of this.lights) {
      const d = Math.hypot(li.x - p[0], li.y - p[1], li.z - p[2]);
      if (d < li.r) L += li.k * (1 - d / li.r) * (1 - d / li.r);
    }
    return L;
  }

  // Draw the world's triangles, each as { a, b, c, uv: [u,v,...], tile, nrm, L (static), glow, water, fogHalf } in
  // world space. The caller passes a static mesh and the dynamic boxes already expanded to triangles.
  drawTris(tris) {
    const { cam, b, F, cxp, cyp } = this;
    const near = TC.NEAR;
    for (const t of tris) {
      // World to view: x right, y up, z forward.
      const v = [t.a, t.b, t.c].map(p => {
        const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
        return [dx * b.r[0] + dy * b.r[1] + dz * b.r[2], dx * b.u[0] + dy * b.u[1] + dz * b.u[2], dx * b.f[0] + dy * b.f[1] + dz * b.f[2]];
      });
      const uv = t.uv;
      let poly = [0, 1, 2].map(i => ({ x: v[i][0], y: v[i][1], z: v[i][2], u: uv[i * 2], v: uv[i * 2 + 1] }));
      if (poly.every(p => p.z < near) || poly.every(p => p.z > TC.FAR * 1.5)) continue;
      if (poly.some(p => p.z < near)) poly = TC.clipNear(poly, near);
      if (poly.length < 3) continue;
      // Light from the world normal, rotated nothing (the normal is a world vector).
      const Lw = t.L !== undefined ? t.L : this.light(t.nrm, t.centre);
      const band = t.glow ? 4 : null;
      for (let i = 1; i + 1 < poly.length; i++) {
        this.fillTri(poly[0], poly[i], poly[i + 1], F, cxp, cyp, t, Lw, band);
      }
    }
  }

  // The rasterizer: a screen-space triangle with a top-left fill (pixel centres), perspective-correct interpolation.
  fillTri(p0, p1, p2, F, cxp, cyp, t, L, forcedBand) {
    const w = this.w, h = this.h;
    const s = [p0, p1, p2].map(p => {
      const iz = 1 / p.z;
      return { x: cxp + p.x * F * iz, y: cyp - p.y * F * iz, iz, uz: p.u * iz, vz: p.v * iz };
    });
    const minX = Math.max(0, Math.floor(Math.min(s[0].x, s[1].x, s[2].x)));
    const maxX = Math.min(w - 1, Math.ceil(Math.max(s[0].x, s[1].x, s[2].x)));
    const minY = Math.max(0, Math.floor(Math.min(s[0].y, s[1].y, s[2].y)));
    const maxY = Math.min(h - 1, Math.ceil(Math.max(s[0].y, s[1].y, s[2].y)));
    if (maxX < minX || maxY < minY) return;
    const area = (s[1].x - s[0].x) * (s[2].y - s[0].y) - (s[2].x - s[0].x) * (s[1].y - s[0].y);
    if (Math.abs(area) < 1e-9) return;
    const inv = 1 / area;
    const tile = t.tile, size = tile.size, mask = size - 1;
    const fogC = TC.hex(this.env.fog || '#101830');
    const fogNear = this.env.fogNear || 300;
    const u32 = this.u32, dep = this.dep;
    const band0 = forcedBand;
    const tileBands = tile.bands;
    const water = tile.water ? this.t * 0.9 : 0;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const w0 = ((s[1].x - px) * (s[2].y - py) - (s[2].x - px) * (s[1].y - py)) * inv;
        const w1 = ((s[2].x - px) * (s[0].y - py) - (s[0].x - px) * (s[2].y - py)) * inv;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const iz = w0 * s[0].iz + w1 * s[1].iz + w2 * s[2].iz;
        const idx = y * w + x;
        if (iz <= dep[idx]) continue;
        dep[idx] = iz;
        const z = 1 / iz;
        const uu = (w0 * s[0].uz + w1 * s[1].uz + w2 * s[2].uz) * z + water;
        const vv = (w0 * s[0].vz + w1 * s[1].vz + w2 * s[2].vz) * z;
        const tx = Math.floor((uu - Math.floor(uu)) * size) & mask;
        const ty = Math.floor((vv - Math.floor(vv)) * size) & mask;
        const bayer = TC.BAYER[((x & 3) << 2) | (y & 3)];
        let band = band0 !== null && band0 !== undefined ? band0 : Math.floor(TC.clamp(L, 0, 1.2) * 4 + bayer - 0.5);
        if (band < 0) band = 0; else if (band > 4) band = 4;
        let c = tileBands[band][ty * size + tx];
        // Fog: eight steps, dithered.
        let f = TC.clamp((z - fogNear) / (TC.FAR - fogNear), 0, 1);
        f = Math.pow(f, 1.2);
        if (tile.glow) f *= 0.5;
        const fq = Math.floor(f * 8 + bayer) / 8;
        if (fq > 0) {
          const cr = c & 255, cg = (c >> 8) & 255, cb = (c >> 16) & 255;
          const r = cr + (fogC[0] - cr) * fq, g = cg + (fogC[1] - cg) * fq, bl = cb + (fogC[2] - cb) * fq;
          c = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
        }
        u32[idx] = c;
      }
    }
  }

  // Composite a rig's picture (an ImageData of its scratch canvas) at (ox, oy), where the billboard is nearer than
  // the world: depth z is the billboard's view depth, a value per picture.
  billboard(img, ox, oy, pw, ph, z, tint) {
    const { w, h, u32, dep } = this;
    const data = img.data;
    for (let j = 0; j < ph; j++) {
      const y = oy + j;
      if (y < 0 || y >= h) continue;
      for (let i = 0; i < pw; i++) {
        const x = ox + i;
        if (x < 0 || x >= w) continue;
        const k = (j * pw + i) * 4;
        if (data[k + 3] < 128) continue;
        const idx = y * w + x;
        const iz = 1 / z;
        if (iz <= dep[idx]) continue;
        dep[idx] = iz;
        const r = Math.min(255, data[k] * tint), g = Math.min(255, data[k + 1] * tint), bl = Math.min(255, data[k + 2] * tint);
        u32[idx] = (255 << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
  }

  // Put the picture on the page: the buffer's canvas, drawn into the engine's screen at (x, y).
  present(g, x, y) {
    if (!this.cx) return;
    this.cx.putImageData(this.img, 0, 0);
    g.drawImage(this.cv, x, y);
  }

  // Project a world point with the current camera: [sx, sy, z] in this viewport's pixels, or null behind the camera.
  project(p) {
    const { cam, b, F, cxp, cyp } = this;
    const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
    const z = dx * b.f[0] + dy * b.f[1] + dz * b.f[2];
    if (z < TC.NEAR) return null;
    const x = dx * b.r[0] + dy * b.r[1] + dz * b.r[2];
    const yv = dx * b.u[0] + dy * b.u[1] + dz * b.u[2];
    return [cxp + x * F / z, cyp - yv * F / z, z];
  }
};

// The skyline: a height (radians of elevation) along the azimuth, from a few sines; the stage sets its amplitude.
TC.skyline = function (az, amp) {
  if (!amp) return 0;
  return amp * (0.6 + 0.4 * Math.sin(az * 5.3) + 0.25 * Math.sin(az * 13.1 + 1.3)) * 0.15 + 0.01;
};

// Clip a polygon against the near plane z = near (Sutherland-Hodgman, in view space).
TC.clipNear = function (poly, near) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], bb = poly[(i + 1) % poly.length];
    const ina = a.z >= near, inb = bb.z >= near;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (near - a.z) / (bb.z - a.z);
      out.push({ x: TC.lerp(a.x, bb.x, t), y: TC.lerp(a.y, bb.y, t), z: near, u: TC.lerp(a.u, bb.u, t), v: TC.lerp(a.v, bb.v, t) });
    }
  }
  return out;
};

// A box as 12 triangles in world space, with the material's tile, the UV in world units (a 48-u tile), and a normal per
// face. Faces that are not visible from anywhere are still drawn (double-sided): simpler, and correct for thin props.
TC.boxTris = function (b, mat, out, o = {}) {
  const [x0, y0, z0, x1, y1, z1] = b;
  const tile = TC.tile(mat);
  const S = 1 / 48;
  const faces = [
    // normal, four corners (counter-clockwise seen from outside)
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
    [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]],
    [[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
    [[0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
  ];
  for (const [n, q] of faces) {
    // Texture coordinates across the face, in tile units.
    const uv = q.map(p => {
      if (n[2] !== 0) return [p[0] * S, p[1] * S];
      if (n[0] !== 0) return [p[1] * S, p[2] * S];
      return [p[0] * S, p[2] * S];
    });
    const centre = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
    const base = { nrm: n, tile, glow: !!tile.glow, centre, L: o.L };
    const tris = [[0, 1, 2], [0, 2, 3]];
    for (const [i, j, k] of tris) {
      out.push(Object.assign({ a: q[i], b: q[j], c: q[k], uv: [uv[i][0], uv[i][1], uv[j][0], uv[j][1], uv[k][0], uv[k][1]] }, base));
    }
  }
  return out;
};

// ---- src/22-art.js ----
// 22-art.js: the materials. Every texture is painted in code (no image files): a 32 x 32 texel tile per material, built
// once, with a pattern function. The tiles are sampled by the rasterizer (21-raster.js) in five light bands, the engine's
// banded look: the band is picked from the lighting, dithered between bands.
//   base:    the material's colour, '#rrggbb'
//   pat:     the pattern that paints it (see PATTERNS)
//   glow:    emissive (lanterns, screens): ignores the lighting, takes half the fog
//   water:   animated sea surface (scrolls)
TC.def('material', 'concrete', { base: '#7b7f88', pat: 'noise' });
TC.def('material', 'asphalt', { base: '#3c3f47', pat: 'noise' });
TC.def('material', 'stone', { base: '#8a8478', pat: 'stone' });
TC.def('material', 'dock', { base: '#6b4a2e', pat: 'planks' });
TC.def('material', 'hut', { base: '#5c4a38', pat: 'planks' });
TC.def('material', 'brick', { base: '#8c4a3a', pat: 'brick' });
TC.def('material', 'steel', { base: '#8c96a6', pat: 'bands' });
TC.def('material', 'hull', { base: '#3d4a5e', pat: 'plates' });
TC.def('material', 'sandbag', { base: '#b59b6e', pat: 'lumps' });
TC.def('material', 'crate', { base: '#9a7444', pat: 'crate' });
TC.def('material', 'barrel', { base: '#b34a2a', pat: 'barrel' });
TC.def('material', 'container', { base: '#2f5a7a', pat: 'ribs' });
TC.def('material', 'festival', { base: '#d94a7a', pat: 'stripes' });
TC.def('material', 'lantern', { base: '#ffb24a', pat: 'glow', glow: true });
TC.def('material', 'glass', { base: '#7fd0ff', pat: 'grid', glow: true });
TC.def('material', 'water', { base: '#1b3f6b', pat: 'sea', water: true });
TC.def('material', 'lamp', { base: '#ffe9a0', pat: 'glow', glow: true });
TC.def('material', 'sky', { base: '#0b1030', pat: 'noise' });

// A tiny deterministic hash for the texel patterns (not the sim's RNG: textures are cosmetic and never change).
TC.texHash = function (x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Pattern functions: (x, y) texel in 0..31 -> a brightness factor 0.55..1.2 (multiplied into the base colour).
TC.PATTERNS = {
  noise: (x, y) => 0.8 + 0.4 * TC.texHash(x, y, 1),
  stone: (x, y) => 0.75 + 0.35 * TC.texHash(x >> 1, y >> 1, 2) + (y % 11 === 0 ? -0.2 : 0),
  planks: (x, y) => ((y >> 3) % 2 ? 1.0 : 0.88) * (y % 8 === 0 || x % 16 === 0 ? 0.6 : 1) * (0.92 + 0.12 * TC.texHash(x, y >> 3, 3)),
  brick: (x, y) => { const row = y >> 3, off = (row % 2) * 8; const mx = (x + off) % 16; return (y % 8 === 0 || mx === 0) ? 0.6 : 0.95 + 0.1 * TC.texHash(x, y, 4); },
  bands: (x, y) => (x % 8 === 0 ? 0.7 : 0.95 + 0.15 * TC.texHash(x >> 2, 0, 5)) * (y % 16 === 0 ? 0.8 : 1),
  plates: (x, y) => ((x % 16 === 0 || y % 16 === 0) ? 0.6 : 0.9 + 0.1 * TC.texHash(x, y, 6)) * ((x === 4 && y === 4) || (x === 12 && y === 12) ? 1.3 : 1),
  lumps: (x, y) => 0.8 + 0.3 * TC.texHash(x >> 1, y >> 1, 7) + (TC.texHash(x, y, 8) < 0.06 ? -0.2 : 0),
  crate: (x, y) => ((y >> 2) % 2 ? 1 : 0.9) * (x === y || x + y === 31 ? 0.62 : 1) * (x % 16 === 0 || y % 16 === 0 ? 0.7 : 1) * (0.94 + 0.1 * TC.texHash(x, y, 9)),
  barrel: (x, y) => (y % 10 < 2 ? 0.6 : 1) * (0.9 + 0.2 * TC.texHash(x >> 1, y >> 1, 10)),
  ribs: (x, y) => (x % 8 < 2 ? 0.7 : 1.05) * (0.95 + 0.1 * TC.texHash(x, 0, 11)),
  stripes: (x, y) => ((x >> 3) % 2 ? 1.05 : 0.8),
  glow: (x, y) => 0.9 + 0.3 * TC.texHash(x >> 1, y >> 1, 12),
  grid: (x, y) => (x % 8 === 0 || y % 8 === 0 ? 0.6 : 1.05),
  sea: (x, y) => 0.7 + 0.5 * TC.texHash(x, y, 13),
};

// Hex colour to [r, g, b].
TC.hex = function (h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// The five light bands: each band multiplies the texel. Band 4 is full light; band 0 is the shadow.
TC.BANDS = [0.34, 0.5, 0.68, 0.84, 1.0];

// Build a material's tiles: 32 x 32 per band, as 32-bit colours (little-endian ABGR for ImageData). Built on first use.
TC.tile = function (id) {
  TC.tiles = TC.tiles || {};
  if (TC.tiles[id]) return TC.tiles[id];
  const m = TC.get('material', id);
  const [br, bg, bb] = TC.hex(m.base);
  const pat = TC.PATTERNS[m.pat] || TC.PATTERNS.noise;
  const size = 32;
  const bands = TC.BANDS.map(bf => {
    const out = new Uint32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const k = pat(x, y) * bf;
        const r = Math.min(255, br * k) | 0, g = Math.min(255, bg * k) | 0, b = Math.min(255, bb * k) | 0;
        out[y * size + x] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    return out;
  });
  TC.tiles[id] = { size, bands, glow: !!m.glow, water: !!m.water, id };
  return TC.tiles[id];
};

// ---- src/23-fx.js ----
// 23-fx.js: the presentation's effects (plan 4.8, 4.13): tracers, muzzle flashes, sparks, explosions, popups and banners.
// They live in one list with a life each, read from the sim's events. Everything here is cosmetic: none of it changes
// the sim. The FX are drawn in screen space over each viewport, projected with that viewport's camera.
TC.FX = class FX {
  constructor() { this.list = []; this.banners = []; this.popups = []; this.shake = 0; this.flash = null; this.hurt = 0; }

  add(e) { this.list.push(Object.assign({ t: 0, life: 0.2 }, e)); }

  // A banner is a line of text across the middle of the screen: ACTION!, WAIT, STAGE CLEAR, TIDE'S IN!, ...
  banner(text, color = '#ffffff', seconds = 1.2, scale = 4, sub = null) {
    this.banners.push({ text, color, t: 0, life: seconds, scale, sub });
  }
  // A popup is a number or word at a world point; it rises and fades.
  popup(at, text, color = '#ffffff', seconds = 0.9) {
    this.popups.push({ at, text, color, t: 0, life: seconds });
  }

  update(dt) {
    for (const f of this.list) f.t += dt;
    this.list = this.list.filter(f => f.t < f.life);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.life);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter(p => p.t < p.life);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.hurt = Math.max(0, this.hurt - dt * 1.4);
    if (this.flash) { this.flash.t += dt; if (this.flash.t >= this.flash.life) this.flash = null; }
  }

  // Draw the world-anchored FX into a viewport: raster is the Raster (for projection), g the 2D context.
  drawWorld(g, raster, x0, y0) {
    for (const f of this.list) {
      const u = TC.clamp(f.t / f.life, 0, 1);
      if (f.kind === 'tracer') {
        const a = raster.project(f.from), b = raster.project(f.to);
        if (!a && !b) continue;
        const A = a || [raster.cxp, raster.cyp + 40, 1], B = b || [raster.cxp, raster.cyp, 1];
        g.globalAlpha = 1 - u;
        g.strokeStyle = f.color || '#ffe9a0';
        g.lineWidth = f.width || 1;
        g.beginPath(); g.moveTo(x0 + A[0], y0 + A[1]); g.lineTo(x0 + B[0], y0 + B[1]); g.stroke();
        g.globalAlpha = 1;
      } else if (f.kind === 'flash') {
        const p = raster.project(f.at);
        if (!p) continue;
        const r = (f.r || 6) * (1 - u) * Math.max(1, raster.F / p[2]) * 0.25 + 1;
        g.fillStyle = f.color || '#ffd36a';
        g.globalAlpha = 1 - u;
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], r, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      } else if (f.kind === 'spark') {
        const p = raster.project(f.at);
        if (!p) continue;
        const n = f.n || 6;
        g.fillStyle = f.color || '#fff2b0';
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + (f.seed || 0);
          const d = u * (f.spread || 10);
          g.globalAlpha = 1 - u;
          g.fillRect(x0 + p[0] + Math.cos(a) * d, y0 + p[1] + Math.sin(a) * d - u * 4, 1, 1);
        }
        g.globalAlpha = 1;
      } else if (f.kind === 'boom') {
        const p = raster.project(f.at);
        if (!p) continue;
        const rad = (f.rad || 40) * u * Math.max(1, raster.F / p[2]) * 0.18 + 2;
        g.globalAlpha = (1 - u) * 0.85;
        g.fillStyle = '#ffb347';
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], rad, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff3b0';
        g.beginPath(); g.arc(x0 + p[0], y0 + p[1], rad * 0.5, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
    }
    for (const pu of this.popups) {
      const p = raster.project(pu.at);
      if (!p) continue;
      const u = TC.clamp(pu.t / pu.life, 0, 1);
      g.globalAlpha = 1 - u * u;
      TC.text(g, pu.text, x0 + p[0], y0 + p[1] - 8 - u * 12, pu.color, { align: 'center', scale: 1 });
      g.globalAlpha = 1;
    }
  }
};

// Text on the buffer: the engine's pixel font, with an outline so it reads over any picture.
TC.text = function (g, s, x, y, color, o = {}) {
  if (!E.font) return;
  E.font.text(g, s, Math.round(x), Math.round(y), color, Object.assign({ outline: '#05070f', scale: 1 }, o));
};

// ---- src/30-audio.js ----
// 30-audio.js: everything that makes sound is written in code (TASK.md): the music loops, the sound effects and the
// voices. The voices are Animalese: a blip per syllable, pitched per speaker, with no speech files. Defined once at
// boot (TC.defineSounds) on the engine's chip synth, and played through game.audio.

// The songs. Notes are tokens per step ('.' rests); drums are 'k' kick, 'h' hat, 's' snare.
TC.def('song', 'title', { bpm: 96, steps: 16, tracks: [
  { wave: 'triangle', vol: 0.30, notes: 'D4 . F4 . A4 . C5 . B4 . G4 . A4 . . | F4 . A4 . C5 . E5 . D5 . A4 . C5 . . .' },
  { wave: 'square', vol: 0.10, notes: 'D3 . . . A2 . . . F2 . . . G2 . . . ' },
  { wave: 'drums', vol: 0.20, notes: 'k . h . s . h . k . h . s . h .' },
] });
TC.def('song', 'harbor', { bpm: 112, steps: 16, tracks: [
  { wave: 'square', vol: 0.16, notes: 'E5 G5 A5 G5 E5 G5 B5 A5 G5 E5 D5 E5 G5 A5 G5 . ' },
  { wave: 'triangle', vol: 0.22, notes: 'A2 . A2 . E2 . E2 . F2 . F2 . C2 . G2 .' },
  { wave: 'drums', vol: 0.16, notes: 'k h s h k h s h k h s h k h s h' },
] });
TC.def('song', 'storm', { bpm: 124, steps: 16, tracks: [
  { wave: 'saw', vol: 0.09, notes: 'A3 . C4 . E4 . A3 . G3 . B3 . D4 . E4 .' },
  { wave: 'triangle', vol: 0.22, notes: 'A2 A2 A2 A2 G2 G2 G2 G2 F2 F2 F2 F2 E2 E2 E2 E2' },
  { wave: 'drums', vol: 0.18, notes: 'k . . k s . . k k . . k s . . .' },
] });
TC.def('song', 'dawn', { bpm: 104, steps: 16, tracks: [
  { wave: 'sine', vol: 0.25, notes: 'C5 . E5 . G5 . B4 . A4 . C5 . E5 . D5 .' },
  { wave: 'triangle', vol: 0.20, notes: 'C3 . . . G2 . . . A2 . . . F2 . . .' },
  { wave: 'drums', vol: 0.12, notes: 'k . . . h . . . k . . . h . . .' },
] });
TC.def('song', 'boss', { bpm: 150, steps: 16, tracks: [
  { wave: 'square', vol: 0.13, notes: 'E4 E4 G4 E4 A4 G4 E4 D4 E4 E4 G4 E4 B4 A4 G4 E4' },
  { wave: 'saw', vol: 0.10, notes: 'E2 . E2 . E2 . E2 . D2 . D2 . C2 . B1 .' },
  { wave: 'drums', vol: 0.24, notes: 'k k s k k k s k k k s k k s s k' },
] });
TC.def('song', 'range', { bpm: 92, steps: 16, tracks: [
  { wave: 'triangle', vol: 0.22, notes: 'C4 . E4 . G4 . E4 . A4 . G4 . E4 . C4 .' },
  { wave: 'drums', vol: 0.10, notes: 'k . . . h . . . k . . . h . . .' },
] });
TC.def('song', 'results', { bpm: 120, steps: 8, tracks: [
  { wave: 'square', vol: 0.18, notes: 'C5 E5 G5 C6 . G5 E5 C5' },
  { wave: 'triangle', vol: 0.20, notes: 'C3 . G2 . A2 . F2 .' },
] });

// The voices of the cast: Animalese pitch per speaker, and the wave their blips use.
TC.def('speaker', 'kai', { name: 'KAI', color: '#e8443a', pitch: 310, wave: 'square', pitchVar: 0.28 });
TC.def('speaker', 'mari', { name: 'MARI', color: '#3aa0e8', pitch: 380, wave: 'triangle', pitchVar: 0.22 });
TC.def('speaker', 'juno', { name: 'JUNO', color: '#ffd36a', pitch: 430, wave: 'sine', pitchVar: 0.18 });
TC.def('speaker', 'krake', { name: 'ADMIRAL KRAKE', color: '#b8242b', pitch: 170, wave: 'saw', pitchVar: 0.12 });
TC.def('speaker', 'radio', { name: 'CREST RADIO', color: '#9fe3ff', pitch: 260, wave: 'square', pitchVar: 0.25 });
TC.def('speaker', 'festival', { name: 'FESTIVAL', color: '#ff9ac2', pitch: 340, wave: 'triangle', pitchVar: 0.3 });
TC.def('speaker', 'deckhand', { name: 'BLACK CURRENT', color: '#9aa6c2', pitch: 220, wave: 'saw', pitchVar: 0.2 });

// The sound effects, as engine voices (plan 5.12). Registered once; the names are used everywhere.
TC.SFX = {
  shot: { wave: 'square', freq: 520, to: 140, dur: 0.07, vol: 0.5 },
  shotAuto: { wave: 'square', freq: 460, to: 120, dur: 0.05, vol: 0.35 },
  mg: { wave: 'saw', freq: 380, to: 160, dur: 0.05, vol: 0.32 },
  shotgun: { wave: 'noise', freq: 900, to: 90, dur: 0.22, vol: 0.55 },
  gl: { wave: 'saw', freq: 180, to: 60, dur: 0.35, vol: 0.4 },
  explode: { wave: 'noise', freq: 320, to: 40, dur: 0.6, vol: 0.7 },
  hit: { wave: 'triangle', freq: 880, to: 440, dur: 0.09, vol: 0.4 },
  head: { wave: 'triangle', freq: 1320, to: 660, dur: 0.12, vol: 0.5, arp: [0, 7] },
  kill: { wave: 'square', freq: 660, to: 330, dur: 0.18, vol: 0.4, arp: [0, 5, 12] },
  impact: { wave: 'noise', freq: 2400, to: 900, dur: 0.05, vol: 0.2 },
  ping: { wave: 'sine', freq: 1900, to: 1200, dur: 0.12, vol: 0.25 },
  threat: { wave: 'square', freq: 1400, to: 1400, dur: 0.05, vol: 0.18 },
  tick: { wave: 'square', freq: 1700, to: 1700, dur: 0.03, vol: 0.2 },
  chirp: { wave: 'square', freq: 2200, to: 2600, dur: 0.07, vol: 0.4 },
  hurt: { wave: 'saw', freq: 240, to: 90, dur: 0.3, vol: 0.5 },
  reload: { wave: 'square', freq: 700, to: 900, dur: 0.12, vol: 0.3, arp: [0, 4] },
  reloaded: { wave: 'square', freq: 900, to: 1200, dur: 0.1, vol: 0.3, arp: [0, 7] },
  switch: { wave: 'triangle', freq: 600, to: 800, dur: 0.06, vol: 0.3 },
  empty: { wave: 'square', freq: 220, to: 200, dur: 0.06, vol: 0.3 },
  pickup: { wave: 'square', freq: 660, to: 990, dur: 0.14, vol: 0.35, arp: [0, 4, 7] },
  ring: { wave: 'triangle', freq: 880, to: 1760, dur: 0.3, vol: 0.45, arp: [0, 4, 7, 12] },
  intel: { wave: 'sine', freq: 740, to: 1100, dur: 0.25, vol: 0.4, arp: [0, 5, 9] },
  civilian: { wave: 'saw', freq: 300, to: 150, dur: 0.4, vol: 0.5 },
  timeup: { wave: 'saw', freq: 200, to: 60, dur: 0.9, vol: 0.5 },
  extend: { wave: 'square', freq: 880, to: 1320, dur: 0.2, vol: 0.4, arp: [0, 7] },
  clear: { wave: 'square', freq: 520, to: 1040, dur: 0.4, vol: 0.4, arp: [0, 4, 7, 12] },
  gameover: { wave: 'saw', freq: 330, to: 110, dur: 1.2, vol: 0.5 },
  cont: { wave: 'square', freq: 500, to: 800, dur: 0.1, vol: 0.4, arp: [0, 7] },
  cursor: { wave: 'square', freq: 1000, to: 1000, dur: 0.03, vol: 0.2 },
  pick: { wave: 'square', freq: 700, to: 1100, dur: 0.07, vol: 0.3, arp: [0, 5] },
  back: { wave: 'triangle', freq: 500, to: 300, dur: 0.07, vol: 0.3 },
  boom: { wave: 'noise', freq: 200, to: 30, dur: 1.0, vol: 0.8 },
  bark: { wave: 'square', freq: 260, to: 180, dur: 0.08, vol: 0.3 },
  flare: { wave: 'noise', freq: 4000, to: 3000, dur: 0.03, vol: 0.25 },
  lob: { wave: 'sine', freq: 300, to: 500, dur: 0.4, vol: 0.2 },
  stomp: { wave: 'noise', freq: 120, to: 60, dur: 0.12, vol: 0.5 },
  wave: { wave: 'sine', freq: 90, to: 60, dur: 0.6, vol: 0.2 },
};

// Register every sound with the engine, once.
TC.defineSounds = function (game) {
  for (const [name, v] of Object.entries(TC.SFX)) game.audio.define('tc-' + name, v);
  game.audio.define('tc-voice-blip', { wave: 'square', freq: 300, to: 300, dur: 0.05, vol: 0.2 });
};

// Play a named sound (the names are the keys of TC.SFX; a pitch spread keeps repeats from sounding copied).
TC.sfx = function (game, name, o = {}) {
  if (!game || !game.audio || !TC.SFX[name]) return;
  game.audio.sfx('tc-' + name, Object.assign({ vary: 0.04 }, o));
};

// Animalese: say a line in a speaker's voice. Each word becomes blips, one per syllable (a vowel group), with a pitch
// that moves a little for each. The sound is code-only, and the text is shown as subtitles beside it.
TC.animalese = function (game, speakerId, text, rng) {
  if (!game || !game.audio) return 0;
  const sp = TC.get('speaker', speakerId);
  const r0 = rng || Math.random;
  const words = text.replace(/[^A-Za-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  let delay = 0;
  for (const w of words) {
    const vowels = (w.match(/[aeiouy]+/gi) || []).length;
    const syl = Math.max(1, Math.min(4, vowels || Math.ceil(w.length / 3)));
    for (let s = 0; s < syl; s++) {
      const r = r0();
      const f = sp.pitch * (1 + (r - 0.5) * sp.pitchVar * 2) * (s % 2 ? 1.08 : 1);
      const voice = { wave: sp.wave, freq: Math.round(f), to: Math.round(f * (0.9 + r * 0.25)), dur: 0.06 + r * 0.03, vol: 0.22 };
      const at = delay;
      game.after(at, () => game.audio.sfx(voice, { vary: 0.02 }));
      delay += 0.075;
    }
    delay += 0.04;
  }
  return delay;
};

// ---- src/31-story.js ----
// 31-story.js: the story as data (plan 4.11, 5.9), in a B-movie register. The radio cue of each area, the stage intros
// and outros (modal, in a dialog box), and the briefing pages. Lines are original; the speakers' voices are the
// Animalese in 30-audio.js. Nothing here names the source's characters or places.

// The radio cue an area opens with. Non-modal: it plays over the action, with subtitles.
TC.CUES = {
  '1-1': { speaker: 'juno', line: 'Lantern Pier. Hostiles in the festival crowd. Keep your heads down, Kai!' },
  '1-2': { speaker: 'juno', line: 'Crane Row. Shield troopers fire over the top. Hold your cover.' },
  '1-3': { speaker: 'juno', line: 'Canal Gate. Orange vests carry ammo. Drop them for the specials.' },
  '1-B': { speaker: 'juno', line: 'The gunboat TIDEWHIP is coming in. Take out the turrets first.' },
  '2-1': { speaker: 'mari', line: "Gull's Rest. The storm is hiding their muzzle flashes. Watch the rooftops." },
  '2-2': { speaker: 'mari', line: 'Lighthouse stairs. Snipers. Long telegraphs, bad news. Move fast.' },
  '2-3': { speaker: 'juno', line: 'Water tower. Civilians on the walk. Hold your fire on them.' },
  '2-B': { speaker: 'mari', line: 'The lamp warden is up top. Shoot the lamps, then the lantern.' },
  '3-1': { speaker: 'juno', line: 'Sluice gate. The tide is at the wall. Every second counts.' },
  '3-2': { speaker: 'mari', line: 'Turbine hall. Those barrels are loaded. Shoot them from range.' },
  '3-3': { speaker: 'juno', line: 'Causeway. The Red Tide is out in force. Stay sharp.' },
  '3-B': { speaker: 'juno', line: 'LEVIATHAN. Admiral Krake is in the mech. Claws first, then the shell.' },
  R1: { speaker: 'juno', line: 'Drill one. Targets only. Breathe, then shoot.' },
  R2: { speaker: 'juno', line: 'Drill two. Duck on the threat rings. Reload in cover.' },
  R3: { speaker: 'juno', line: 'Drill three. Switch weapons. Grenades go over walls.' },
};
TC.cueFor = function (stageId, sceneId) {
  return TC.CUES[sceneId] || null;
};

// The modal stage intros (before the first area) and outros (after the boss).
TC.INTROS = {
  1: [
    { speaker: 'juno', line: 'Agents, this is CREST. The Black Current has taken the Port Lumen tidewall.' },
    { speaker: 'juno', line: 'The king tide peaks at dawn. If that gate goes, the whole harbor goes with it.' },
    { speaker: 'krake', line: 'Welcome to the lantern festival, CREST. Do enjoy the fireworks.' },
  ],
  2: [
    { speaker: 'mari', line: 'Gull\'s Rest, two in the morning. The storm signal is up, and the lamp is dark.' },
    { speaker: 'juno', line: 'Somebody shut the lighthouse. Find out who, and light it again.' },
  ],
  3: [
    { speaker: 'juno', line: 'Dawn. This is the last push to the tidewall.' },
    { speaker: 'krake', line: 'Your agents are very brave. Very late, too.' },
  ],
};
TC.OUTROS = {
  1: [{ speaker: 'juno', line: 'Tidewhip is down. Gate is still shut. Good work, both of you.' }],
  2: [{ speaker: 'mari', line: 'Lamp is lit. The whole coast can see it now.' }],
  3: [
    { speaker: 'juno', line: 'Leviathan is dead in the water. The tidewall holds. Sun is up.' },
    { speaker: 'krake', line: 'Until next tide, CREST.' },
  ],
};

// The briefing pages shown before a stage (the map pages, as text).
TC.BRIEFS = {
  1: { title: 'HARBOR LIGHTS', lines: ['Port Lumen Docks, 23:40.', 'The Lantern Festival is on the piers.', 'Hold the tidewall. Watch the crowd.'] },
  2: { title: 'STORM SIGNAL', lines: ["Gull's Rest and Lighthouse Point, 02:10.", 'A thunderstorm. The lamp is out.', 'Find the signal. Light it again.'] },
  3: { title: 'THE TIDEWALL', lines: ['The sluice locks, 05:20 to dawn.', 'The king tide is at the wall.', 'End the Leviathan before the sun.'] },
  range: { title: 'CREST RANGE', lines: ['Three drills. Every mechanic.', 'Duck, pop, shoot, reload.', 'Your best time is kept.'] },
};

// Modal dialog: one line at a time, typed out, with the engine's dialog box (E.Dialog). Confirm finishes a line, then
// turns the page. The play is frozen while it shows.
TC.Story = {
  // Open a sequence of lines. onDone runs when the last line closes.
  run(game, lines, onDone) {
    const talk = new E.Dialog(game, { speed: 60, lines: 3, place: 'bottom' });
    let i = 0;
    const next = () => {
      if (i >= lines.length) { talk.close(); if (onDone) onDone(); return; }
      const ln = lines[i++];
      const sp = TC.get('speaker', ln.speaker);
      talk.name = sp.name;
      talk.nameColor = sp.color;
      talk.voice = null;
      talk.say(ln.line, { name: sp.name, onDone: next });
      TC.animalese(game, ln.speaker, ln.line, Math.random);
    };
    talk.onDone = null;
    next();
    return talk;
  },
};

// ---- src/40-input.js ----
// 40-input.js: the controls (plan 4.3). The action map gives the codes for each action on a keyboard, a mouse and a
// standard-mapped pad (PlayStation layout, so R2 is Pad7, L2 Pad6, Cross Pad0, Circle Pad1, Square Pad2, Triangle Pad3,
// L1 Pad4, R1 Pad5). A seat turns its device's state into one command per step (TC.commandFor): the aim in view units
// (the mouse maps exactly under the pointer; a stick moves the reticle with the response curve; the keys move it at a
// constant speed), the fire, cover, reload, and the weapon keys. Nothing here names a key in a prompt: prompts come from
// input.label(action).

// The menu keys, copied from the engine's preset (plan 3.6), with our play actions added.
TC.PRESET = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'Pad7', 'Pad0', 'KeyZ', 'KeyJ'],
  cover: ['Mouse2', 'Space', 'Pad6', 'Pad1', 'KeyX', 'ShiftLeft', 'ShiftRight'],
  reload: ['KeyR', 'Pad2'],
  next: ['KeyE', 'Pad5', 'WheelDown'],
  prev: ['KeyQ', 'Pad4', 'WheelUp'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  more: ['Pad3', 'KeyM'],
});
// Actions the Controls screen shows (the names are the player's words).
TC.CONTROL_NAMES = { fire: 'Fire', cover: 'Take cover', reload: 'Quick reload', next: 'Next weapon', prev: 'Previous weapon',
  w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher' };

// The aim speeds (view units per second): a stick at full tilt, and the keys.
TC.AIM_KEY_SPEED = 1.2;

// A setting's value, from the engine's settings (defined in 50-main.js).
TC.setting = function (game, key) {
  const s = game && game.settings;
  return s ? s[key] : undefined;
};

// The command of seat i for one step. seat: { input, mouse (true for the one seat that owns the mouse), name, ... }.
TC.commandFor = function (play, i, seat, dt) {
  const input = seat.input, game = play.game;
  const cmd = {};
  if (!input) return cmd;
  const vp = play.vpOf ? play.vpOf(i) : null;
  // Aim. The mouse is absolute (under the pointer); a stick or the keys move the reticle.
  let aim = play.aims ? play.aims[i] : [0, 0];
  const mouse = seat.mouse && input.lastDevice === 'mouse' && input.pointer && input.pointer();
  if (mouse && vp) {
    const pt = input.pointer();
    aim = [(pt[0] - (vp.x + vp.w / 2)) / (vp.h / 2), -(pt[1] - (vp.y + vp.h / 2)) / (vp.h / 2)];
  } else {
    const ps = TC.setting(game, 'padSpeed') || 1;
    const stick = input.padAim || (input.padMove && (input.padMove[0] || input.padMove[1]) ? input.padMove : null);
    if (stick) {
      const k = TC.tune.player.padSpeed * ps * dt;
      const curve = (v) => Math.sign(v) * Math.pow(Math.abs(v), 2.2);
      aim = [aim[0] + curve(stick[0]) * k, aim[1] - curve(stick[1]) * k];
    }
    const mv = input.move ? input.move() : [0, 0];
    if (mv[0] || mv[1]) aim = [aim[0] + mv[0] * TC.AIM_KEY_SPEED * dt, aim[1] + mv[1] * TC.AIM_KEY_SPEED * dt * -1];
    // Aim assist (pad): the reticle is drawn toward an exposed target it is near (friction and a pull).
    const assist = TC.tune.player.aimAssist * (TC.setting(game, 'aimAssist') === 'Off' ? 0 : 1);
    if (assist > 0 && stick && (Math.abs(stick[0]) + Math.abs(stick[1])) > 0.2) aim = TC.assistAim(play, i, aim, assist, dt);
  }
  aim = [TC.clamp(aim[0], -TC.aspect(vp), TC.aspect(vp)), TC.clamp(aim[1], -1, 1)];
  if (play.aims) play.aims[i] = aim;
  cmd.aim = aim;
  // Fire: held, and pressed on its first step.
  cmd.fire = input.down('fire');
  cmd.firePressed = input.pressed('fire');
  // Cover: hold (the default) or toggle (a press sets it, the next press clears it).
  const mode = TC.setting(game, 'coverMode') || 'Hold';
  if (mode === 'Toggle') {
    if (input.pressed('cover')) play.coverToggle[i] = !play.coverToggle[i];
    cmd.cover = !!play.coverToggle[i];
  } else {
    cmd.cover = input.down('cover');
  }
  cmd.coverPressed = input.pressed('cover');
  cmd.reload = input.pressed('reload');
  cmd.next = input.pressed('next');
  cmd.prev = input.pressed('prev');
  cmd.select = input.pressed('w1') ? 1 : input.pressed('w2') ? 2 : input.pressed('w3') ? 3 : input.pressed('w4') ? 4 : 0;
  return cmd;
};

TC.aspect = function (vp) { return vp ? vp.w / vp.h : 16 / 9; };

// The pad's aim assist: a target within reach of the reticle pulls it in, and the stick slows over it.
TC.assistAim = function (play, i, aim, assist, dt) {
  const sim = play.sim, p = sim.players[i];
  const ras = play.rasters[i];
  if (!ras) return aim;
  let best = null, bd = Infinity;
  for (const e of sim.enemies) {
    if (!e.alive || !e.exposed || e.role === 'civilian') continue;
    const s = ras.project([e.x, e.y, 14 * (e.size || 1)]);
    if (!s) continue;
    const vx = (s[0] - ras.cxp) / (ras.h / 2), vy = -(s[1] - ras.cyp) / (ras.h / 2);
    const d = Math.hypot(vx - aim[0], vy - aim[1]);
    if (d < bd) { bd = d; best = [vx, vy]; }
  }
  if (!best || bd > 0.12) return aim;
  const k = Math.min(1, assist * 6 * dt);
  return [aim[0] + (best[0] - aim[0]) * k, aim[1] + (best[1] - aim[1]) * k];
};

// ---- src/41-play.js ----
// 41-play.js: the play scene. It owns one Sim, drives it from the players' devices (or the Autopilot, or the network),
// turns the sim's events into effects, sounds, banners and radio lines, and draws each viewport: the rasterized world,
// the engine's rigs as billboards, the FX and the HUD. One Play per stage run; the screens around it are in 43-screens.js.
//
// cfg: { mode: 'arcade' | 'stage' | 'coop' | 'range' | 'attract' | 'host' | 'replica', stage, difficulty, seats: [{ input,
//        name, color, agent, bot }], carry, seed, intro (play the stage's opening), cheats, attract, autoFire }

TC.ENVS = {
  night: { top: '#050a1e', horizon: '#1d2a52', silhouette: '#070b18', fog: '#0c1430', fogNear: 280, ambient: 0.46,
    sunDir: TC.V.norm([-0.3, 0.5, 0.8]), sunK: 0.36, moon: [-0.3, 0.45, 0.6], skyline: 1 },
  storm: { top: '#0a0e1a', horizon: '#2a3446', silhouette: '#080a10', fog: '#161c2a', fogNear: 220, ambient: 0.4,
    sunDir: TC.V.norm([0.2, 0.2, 0.9]), sunK: 0.2, moon: null, skyline: 1.2 },
  dawn: { top: '#2a4a86', horizon: '#f0a070', silhouette: '#2a1e2a', fog: '#c08a78', fogNear: 320, ambient: 0.6,
    sunDir: TC.V.norm([0.6, 0.2, 0.5]), sunK: 0.5, moon: null, skyline: 0.8 },
  day: { top: '#5a8ac8', horizon: '#c8d8e8', silhouette: '#6a7a8a', fog: '#b8c8d8', fogNear: 360, ambient: 0.66,
    sunDir: TC.V.norm([0.5, 0.3, 0.8]), sunK: 0.45, moon: null, skyline: 0 },
};
TC.envFor = function (stageId) {
  const st = TC.get('stage', stageId);
  const sky = (st.env && st.env.sky) || 'night';
  return Object.assign({}, TC.ENVS[sky] || TC.ENVS.night);
};

// The static triangles of a world: each box once, cached on the box, and skipped once it is gone.
TC.worldTris = function (world) {
  if (world._tris) return world._tris;
  const out = [];
  for (const b of world.boxes) {
    b._tris = TC.boxTris(b.b, b.mat, []);
    out.push(b);
  }
  world._tris = out;
  return out;
};

TC.Play = class Play {
  constructor(game, cfg) {
    this.game = game;
    this.cfg = cfg;
    this.seats = cfg.seats || [];
    this.fx = new TC.FX();
    this.rasters = [];
    this.threatRings = new Map();
    this.hitMarker = 0; this.hitHead = false;
    this.dialog = null;
    this.radio = null;
    this.radioQueue = [];
    this.coverToggle = [];
    this.aims = [];
    this.lastVp = {};
    this.time = 0;
    this.over = false;
    this.sim = new TC.Sim({
      mode: cfg.mode || 'stage', stage: cfg.stage || 1, seed: cfg.seed || 1, difficulty: cfg.difficulty || 'Normal',
      players: this.seats.map(s => ({ name: s.name, color: s.color, agent: s.agent })),
      carry: cfg.carry || null, cheats: cfg.cheats || {}, sceneIndex: cfg.sceneIndex || 0, autoFire: cfg.autoFire !== false,
    });
    this.aims = this.sim.players.map(() => [0, 0]);
    this.env = TC.envFor(this.sim.stageId);
    this.world = this.sim.world;
    this.sim.frozen = false;
    this.introT = cfg.intro ? 0 : -1;
    // A shared-world round: the hub code reads its one play (the host decides the round; the replicas follow it).
    if (cfg.hub) { TC.Hub.play = this; TC.Hub.ended = null; TC.Hub.finished = false; TC.Hub.inputs = {}; TC.Hub.presses = {}; TC.Hub.lastSnap = null; }
    this.lastPhase = '';
    this.stageDoneT = 0;
  }

  // The per-frame command of each seat: its device, its bot, or the network (a remote seat on a shared world).
  commands(dt) {
    return this.seats.map((s, i) => {
      if (s.bot) return s.bot.command(this.sim, i, dt);
      if (s.net) return TC.Hub.netCommand(this, i);
      if (!s.input) return {};
      return TC.commandFor(this, i, s, dt);
    });
  }

  update(dt) {
    const tg = TC.tune.time.gameSpeed || 1;
    this.time += dt;
    // The wall-clock cost of the last frame, for the performance readout (presentation only).
    const now = (typeof performance !== 'undefined') ? performance.now() : 0;
    if (this.lastNow) this.frameMs = now - this.lastNow;
    this.lastNow = now;
    this.fx.update(dt);
    this.updateRadio(dt);
    const hub = this.cfg.hub;
    if (hub) {
      // A shared world: the replica applies the host's state, the host waits for the start, and both send their input.
      if (this.cfg.role === 'replica') {
        if (TC.Hub.lastSnap) TC.Hub.applySnap(this, TC.Hub.lastSnap.snap);
        // Our own cover is predicted here at the same speeds as the sim, so it answers at once.
        const mine = this.sim.players[TC.Hub.me];
        const myInput = this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input;
        if (mine && myInput) {
          const want = myInput.down('cover') ? 1 : 0;
          const full = want ? TC.tune.player.coverIn : TC.tune.player.coverOut;
          const dir = want - mine.c, step = dt / full;
          mine.c = Math.abs(dir) <= step ? want : mine.c + Math.sign(dir) * step;
        }
        if (this.netQ && this.netQ.length) { this.handleEvents(this.netQ); this.netQ = []; }
        if (this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input) TC.Hub.sendInput(this.game, this, dt);
        return;
      }
      if (AIHub.time() < 0) return;
    }
    if (this.dialog && this.dialog.open) {
      this.dialog.update(dt);
      return;
    }
    this.sim.frozen = false;
    const cmds = this.commands(dt);
    this.sim.step(dt * tg, cmds);
    const events = this.sim.drain();
    this.handleEvents(events);
    if (hub) {
      // The host copy, with a player or as a server with none, runs the world and reports it.
      const isHost = this.cfg.role === 'host' || this.cfg.role === 'server';
      if (isHost) TC.Hub.hostSend(this, events, dt);
      if (this.seats[TC.Hub.me] && this.seats[TC.Hub.me].input) TC.Hub.sendInput(this.game, this, dt);
      if (this.sim.over && isHost && !TC.Hub.finished) TC.Hub.finishRound(this.sim, this.sim.result ? this.sim.result.won : false);
      return;
    }
    for (const seat of this.seats) if (seat.input && seat.input.lastDevice) this.lastDevice = seat.input.lastDevice;
    if (this.sim.over && !this.over) this.finish();
  }

  // Each event becomes an effect, a sound, a banner or a line of radio.
  handleEvents(events) {
    const sim = this.sim, game = this.game;
    for (const e of events) {
      switch (e.type) {
        case 'flare': {
          this.fx.add({ kind: 'flash', at: e.from, life: 0.08, r: 9, color: '#ffe9a0' });
          this.fx.add({ kind: 'spark', at: e.from, life: 0.12, n: 6, spread: 6, color: '#fff2b0', seed: e.t });
          this.fx.lights = this.fx.lights || []; this.fx.lights.push({ x: e.from[0], y: e.from[1], z: e.from[2], r: 90, k: 0.8, t: 0, life: 0.09 });
          break;
        }
        case 'shot': {
          const w = e.weapon;
          TC.sfx(game, w === 'handgun' ? 'shot' : w === 'mg' ? 'mg' : w === 'shotgun' ? 'shotgun' : 'gl');
          break;
        }
        case 'miss': {
          const dir = e.dir;
          this.fx.add({ kind: 'tracer', from: e.from, to: [e.from[0] + dir[0] * 900, e.from[1] + dir[1] * 900, e.from[2] + dir[2] * 900], life: 0.1, color: '#ffe9a0' });
          break;
        }
        case 'miss-shot': {
          this.fx.add({ kind: 'tracer', from: e.from, to: e.to, life: 0.22, color: '#ffb36b', width: 1 });
          TC.sfx(game, 'flare', { vol: 0.5 });
          break;
        }
        case 'hit': {
          this.hitMarker = 0.22; this.hitHead = !!e.head;
          this.fx.add({ kind: 'spark', at: e.at || [0, 0, 0], life: 0.2, n: 8, spread: 12, color: e.head ? '#ffd36a' : '#ffffff', seed: e.t });
          TC.sfx(game, e.head ? 'head' : 'hit');
          break;
        }
        case 'impact': {
          this.fx.add({ kind: 'spark', at: e.at, life: 0.25, n: 7, spread: 10, color: '#ffe0a0', seed: e.t });
          TC.sfx(game, 'impact', { vol: 0.3 });
          break;
        }
        case 'kill': {
          const at = e.at || [0, 0, 0];
          TC.sfx(game, 'kill');
          this.fx.popup(at, e.head ? 'HEADSHOT' : e.quick ? 'QUICK!' : 'DOWN', e.head ? '#ffd36a' : '#ffffff', 0.9);
          break;
        }
        case 'score': {
          if (e.at && e.pts) this.fx.popup(e.at, (e.pts > 0 ? '+' : '') + TC.fmt(e.pts), e.pts > 0 ? '#ffe9a0' : '#ff3b30', 0.9);
          break;
        }
        case 'threat': {
          this.threatRings.set(e.id, { id: e.id, target: e.target, muzzle: e.muzzle, t0: e.t0, dur: e.dur, kind: e.kind, ticked: false, chirped: false });
          break;
        }
        case 'threatHit': {
          this.fx.hurt = 1; this.fx.shake = 0.6;
          TC.sfx(game, 'hurt');
          if (game.input && game.input.rumble) this.rumbleFor(e.player, 0.6, 0.25);
          this.threatRings.delete(e.id);
          break;
        }
        case 'blocked': {
          TC.sfx(game, 'ping', { vol: 0.5 });
          this.threatRings.delete(e.id);
          const bp = sim.players[e.player];
          if (bp) {
            const c = sim.coverPose(bp);
            this.fx.add({ kind: 'spark', at: [c[0] + 12, c[1], c[2] - 4], life: 0.2, n: 8, spread: 8, color: '#ffe9a0', seed: e.t });
          }
          break;
        }
        case 'threatDown': {
          this.threatRings.delete(e.id);
          break;
        }
        case 'lifeLost': {
          TC.sfx(game, 'hurt', { vol: 0.8 });
          this.fx.banner('-1 LIFE', '#ff3b30', 0.8, 2);
          break;
        }
        case 'timeup': {
          TC.sfx(game, 'timeup');
          this.fx.banner("TIDE'S IN!", '#ff3b30', 1.6, 4);
          this.radioSay('juno', 'Tide is in! Get back under cover, now!');
          break;
        }
        case 'timeExtend': {
          TC.sfx(game, 'extend');
          this.fx.banner('TIME EXTEND +' + e.s, '#9fe3ff', 1, 2);
          break;
        }
        case 'pickup': {
          if (e.kind === 'ammo') {
            TC.sfx(game, 'pickup');
            this.fx.banner(TC.get('weapon', e.weapon).short + ' +' + e.n, '#ffd36a', 1.2, 2);
            if (e.first) this.fx.banner('NEW WEAPON', '#9fe3ff', 1.8, 2, TC.get('weapon', e.weapon).name);
          }
          else if (e.kind === 'ring') { TC.sfx(game, 'ring'); this.fx.banner('1UP!', '#ff5a5a', 1.2, 4); }
          else if (e.kind === 'intel') { TC.sfx(game, 'intel'); this.intelFound(e.intel); }
          break;
        }
        case 'reload': { TC.sfx(game, 'reload'); break; }
        case 'reloaded': { TC.sfx(game, 'reloaded'); break; }
        case 'switch': { TC.sfx(game, 'switch'); break; }
        case 'empty': { TC.sfx(game, 'empty'); this.fx.banner('RELOAD!', '#ff3b30', 0.6, 2); break; }
        case 'cover-in': case 'cover-out': { TC.sfx(game, 'bark', { vol: 0.2 }); break; }
        case 'scene': { this.onScene(e); break; }
        case 'actionStart': { TC.sfx(game, 'chirp'); this.fx.banner('ACTION!', '#ffd36a', 1.0, 4); break; }
        case 'clear': { TC.sfx(game, 'clear'); this.fx.banner('AREA CLEAR', '#9fe3ff', 1.4, 3, e.bonus ? '+' + TC.fmt(e.bonus) : null); break; }
        case 'phase': { this.lastPhase = e.phase; break; }
        case 'boss': { this.onBoss(e); break; }
        case 'bossHit': { this.hitMarker = 0.22; this.hitHead = false; TC.sfx(game, 'hit', { vol: 0.8 }); break; }
        case 'ping': { TC.sfx(game, 'ping'); break; }
        case 'partDown': { TC.sfx(game, 'explode'); this.fx.banner(e.label + ' DOWN', '#ffd36a', 1.4, 3); break; }
        case 'bossDown': { TC.sfx(game, 'boom'); this.fx.banner('CLEAR!', '#ffd36a', 2, 4); break; }
        case 'bossPhase': { this.fx.banner('PHASE 2', '#ff5a2a', 1.4, 3); TC.sfx(game, 'chirp'); break; }
        case 'explode': { this.fx.add({ kind: 'boom', at: e.at, life: 0.5, rad: e.rad }); TC.sfx(game, 'explode'); this.fx.shake = Math.max(this.fx.shake, 0.3); break; }
        case 'barrel': { this.fx.add({ kind: 'boom', at: e.at, life: 0.6, rad: 56 }); TC.sfx(game, 'boom', { vol: 0.9 }); break; }
        case 'break': { this.fx.add({ kind: 'spark', at: e.at, life: 0.3, n: 10, spread: 14, color: '#c9a060', seed: e.t }); TC.sfx(game, 'impact', { vol: 0.5 }); break; }
        case 'civilian': { TC.sfx(game, 'civilian'); this.fx.banner('HOLD YOUR FIRE!', '#ff9ac2', 1.4, 3); this.radioSay('festival', 'Hey! Hey! We are civilians!'); break; }
        case 'escaped': { this.fx.banner('QUARTERMASTER GONE', '#ffb36b', 1.0, 2); break; }
        case 'lob': { TC.sfx(game, 'lob'); break; }
        case 'glFire': { TC.sfx(game, 'gl'); break; }
        case 'shootdown': { TC.sfx(game, 'ping', { vol: 0.7 }); break; }
        case 'wave': break;
        case 'out': { TC.sfx(game, 'gameover', { vol: 0.5 }); this.fx.banner(sim.players[e.player].name + ' DOWN', '#ff3b30', 1.2, 2); break; }
        case 'continue': case 'rejoin': { TC.sfx(game, 'cont'); this.fx.banner('CONTINUE!', '#ffd36a', 1.2, 3); break; }
        case 'restart': { this.fx.banner('AGAIN!', '#ffd36a', 1.0, 3); break; }
        default: break;
      }
    }
  }

  // The stage's opening: its intro lines in a modal dialog, with the play frozen until the last line closes.
  intro() {
    const lines = TC.INTROS[this.sim.stageId];
    if (this.introT < 0 || !lines || this.cfg.attract) return;
    this.dialog = TC.Story.run(this.game, lines, () => { this.dialog = null; });
  }

  // Dev actions (44-dev.js).
  restartArea() { this.sim.restartScene(); this.fx.banner('AGAIN!', '#ffd36a', 1, 3); }
  skipArea(dir) {
    const sim = this.sim, last = sim.world.scenes.length - 1;
    const next = sim.sceneIdx + dir;
    if (next < 0) return;
    if (next > last) { sim.stageClear(); return; }
    sim.enterScene(next, false);
  }
  killAll() {
    for (const e of this.sim.enemies) if (e.alive) { e.hp = 0; this.sim.killEnemy(e, this.sim.players[0], false, [e.x, e.y, 14], null, null); }
  }
  allWeapons() {
    for (const p of this.sim.players) {
      for (const w of ['mg', 'shotgun', 'gl']) { p.owned[w] = true; p.pool[w] = TC.get('weapon', w).pool; }
    }
  }

  // Scenes: the rail rides to the next area with WAIT, and the area's cue plays on its first step.
  onScene(e) {
    this.fx.banner('WAIT', '#ffffff', TC.ARRIVE, 3);
    const cue = TC.cueFor(this.sim.stageId, e.id);
    if (cue) this.radioSay(cue.speaker, cue.line, true);
  }

  onBoss(e) {
    const boss = TC.get('boss', e.id);
    this.fx.banner(boss.name, '#ff5a2a', 2.2, 4, boss.title);
    if (this.game.audio) this.game.audio.music(TC.get('song', 'boss'));
    TC.sfx(this.game, 'boom', { vol: 0.5 });
    this.radioSay('juno', 'Target is armored. Take out the turrets first!');
  }

  // An intel bottle: its note is shown for a few seconds, and kept in the records (once).
  intelFound(text) {
    this.intelText = text;
    this.intelT = 4;
    const have = E.store.get('intel', []);
    if (!have.includes(text)) E.store.set('intel', have.concat([text]));
  }

  // Radio: a line of Animalese and subtitles, in the box at the top. Modal lines are dialog; radio lines are not.
  radioSay(speaker, line, first) {
    if (this.cfg.attract) return;
    this.radioQueue.push({ speaker, line, t: 0, typed: 0 });
    if (first) TC.animalese(this.game, speaker, line, this.sim.rng('voice'));
  }
  updateRadio(dt) {
    if (!this.radioQueue.length) return;
    const cur = this.radioQueue[0];
    cur.t += dt;
    if (cur.t > Math.max(2.4, cur.line.length / 26)) this.radioQueue.shift();
  }

  // The end of a stage: the results or the game over, after the outro's beat.
  finish() {
    this.over = true;
    const result = this.sim.result;
    this.stageDoneT = 0;
    this.endResult = result;
  }

  // Rumble the seat's pad when its player is hit (seat index equals player id).
  rumbleFor(pid, strength, secs) {
    const s = this.seats[pid];
    if (s && s.input && s.input.rumble) s.input.rumble(strength, secs);
  }

  // Drawing: each viewport is rendered with its player's camera.
  viewports(W, H) {
    const n = this.sim.players.length;
    // An online copy draws only its own player, full screen; a local game splits the screen between its players.
    if (this.cfg.viewer !== undefined) return [{ i: this.cfg.viewer, x: 0, y: 0, w: W, h: H }];
    if (n <= 1) return [{ i: 0, x: 0, y: 0, w: W, h: H }];
    const out = [];
    const cols = 2, rows = n <= 2 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const w = Math.floor(W / cols), h = Math.floor(H / rows);
      out.push({ i, x: c * w, y: r * h, w: c === cols - 1 ? W - c * w : w, h: r === rows - 1 ? H - r * h : h });
    }
    return out;
  }

  draw(r) {
    const W = r.W, H = r.H;
    const vps = this.viewports(W, H);
    const sim = this.sim;
    // Each viewport: its player's camera, the rasterized world, the billboards, then the FX and the HUD.
    r.overlay(g => {
      for (const vp of vps) {
        const p = sim.players[vp.i];
        if (!p) continue;
        this.lastVp[vp.i] = vp;
        const ras = this.rasterFor(vp.i, vp.w, vp.h);
        const cam = this.cameraFor(p, vp);
        ras.begin(cam, this.env, this.time, this.lightsNow());
        ras.drawTris(this.triangles());
        this.drawActors(ras, cam);
        ras.present(g, vp.x, vp.y);
        this.fx.drawWorld(g, ras, vp.x, vp.y);
        if (!this.cfg.flyover) TC.drawHUD(this, g, vp, p, cam);
        if (!this.cfg.flyover) TC.drawDevView(this, g, vp, ras, cam);
      }
      if (!this.cfg.flyover) TC.drawGlobal(this, g, W, H);
    });
    if (this.dialog && this.dialog.open) this.dialog.draw(r);
    if (this.cfg.hub && this.cfg.role === 'server') {
      r.overlay(g => {
        TC.panel(g, 40, 80, r.W - 80, 80);
        TC.text(g, 'HOSTING THE ROUND', r.W / 2, 92, TC.PALETTE.gold, { align: 'center', scale: 2 });
        TC.text(g, this.sim.players.length + ' AGENTS · ' + TC.get('stage', this.sim.stageId).name + ' · AREA ' + (this.sim.sceneIdx + 1), r.W / 2, 118, TC.PALETTE.text, { align: 'center', scale: 2 });
      });
    }
    if (this.cfg.hub && TC.Hub.ended) {
      r.overlay(g => {
        g.fillStyle = '#05070fcc'; g.fillRect(0, 0, r.W, r.H);
        const head = TC.Hub.ended === 'host-left' ? 'HOST LEFT: ROUND VOID' : TC.Hub.ended === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER';
        TC.text(g, head, r.W / 2, r.H / 2 - 12, TC.PALETTE.gold, { align: 'center', scale: 3 });
      });
    }
  }

  // The viewport a player draws in (recorded each frame): the input's pointer maps through it.
  vpOf(i) { return this.lastVp[i] || null; }

  rasterFor(i, w, h) {
    this.rasters[i] = this.rasters[i] || new TC.Raster();
    this.rasters[i].size(w, h);
    return this.rasters[i];
  }

  // The camera as drawn: the logical pose, with the presentation's shake and hit jolt, and the reticle's aim.
  cameraFor(p, vp) {
    const cam = this.sim.camFor(p);
    const t = this.time;
    const sh = this.fx.shake * this.fx.shake * 1.5;
    const jolt = this.fx.hurt * 4 * Math.PI / 180;
    cam.yaw = Math.sin(t * 18) * sh * Math.PI / 180;
    cam.pitch = (-p.recoil * Math.PI / 180) * 0.6 + Math.sin(t * 15) * sh * 0.5 * Math.PI / 180;
    cam.roll = (cam.roll || 0) + jolt;
    cam.fov = TC.tune.view.fov;
    return cam;
  }

  // Actors: the enemies are the engine's rigs, drawn as billboards from a view that faces the camera.
  drawActors(ras, cam) {
    const list = [];
    for (const e of this.sim.enemies) {
      if (e.gone || !e.rig || (e.def && e.def.mesh)) continue;   // a drone is drawn as its own mesh (triangles())
      const p = ras.project([e.x, e.y, 0]);
      if (!p) continue;
      list.push({ e, z: p[2] });
    }
    list.sort((a, b) => b.z - a.z);
    for (const it of list) TC.billboard(ras, it.e.rig, [it.e.x, it.e.y, it.e.z], it.e.facing, cam, it.e.hitT || 0);
    // The boss' parts are boxes in the world (see triangles()), drawn with the world.
  }

  // The static world plus the boss' parts (boxes), as triangles.
  triangles() {
    const tris = [];
    for (const b of TC.worldTris(this.world)) {
      if (b.gone) continue;
      for (const t of b._tris) tris.push(t);
    }
    // The rail ride's boat deck, under the cover walls, while the rail carries the camera.
    const rd = this.sim.ride;
    if (rd && rd.started && !rd.done) TC.boxTris([this.sim.base - 40, -44, -10, this.sim.base + 40, 44, 0], 'hull', tris);
    // Enemies with their own meshes: a drone is a quadrotor body with four rotor arms and a red eye; a jet-ski is a ski.
    for (const e of this.sim.enemies) {
      if (e.gone || !e.alive && e.deathT > 0.3) continue;
      if (e.def && e.def.mesh === 'drone') {
        const x = e.x, y = e.y, z = e.z || 0;
        TC.boxTris([x - 6, y - 6, z - 3, x + 6, y + 6, z + 3], 'hull', tris);
        TC.boxTris([x - 1.5, y + 5, z - 1, x + 1.5, y + 8, z + 1], 'lamp', tris);
        for (const [ax, ay] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
          TC.boxTris([x + ax - 3, y + ay - 3, z + 3, x + ax + 3, y + ay + 3, z + 5], 'steel', tris);
        }
      } else if (e.def && e.def.ski && e.alive) {
        TC.boxTris([e.x - 9, e.y - 4, 0, e.x + 9, e.y + 4, 4], 'hull', tris);
      }
    }
    if (this.sim.boss && !this.sim.boss.defeated) {
      const boss = this.sim.boss;
      boss.def.parts.forEach((part, i) => {
        const bp = boss.parts[i];
        if (bp.down && !bp.decor) return;
        const box = this.sim.bossPartBox(part);
        TC.boxTris(box, part.mat || 'hull', tris);
      });
    }
    return tris;
  }

  // Light from the FX (flashes, explosions) for this frame.
  lightsNow() {
    const out = [];
    for (const f of this.fx.lights || []) out.push({ x: f.x, y: f.y, z: f.z, r: f.r, k: f.k * (1 - f.t / f.life) });
    this.fx.lights = (this.fx.lights || []).filter(f => f.t < f.life);
    for (const f of this.fx.list) if (f.kind === 'boom') out.push({ x: f.at[0], y: f.at[1], z: f.at[2], r: 160, k: 1.4 * (1 - f.t / f.life) });
    return out;
  }
};

// An actor billboard: the engine's rig drawn into a scratch canvas from a view facing the camera, then composited into
// the viewport where it is nearer than the world.
TC.billboard = function (ras, rig, pos, facing, cam, hitT) {
  const feet = ras.project(pos);
  if (!feet) return;
  const chest = ras.project([pos[0], pos[1], pos[2] + 12 * (rig.o && rig.o.size ? rig.o.size : 1)]);
  if (!chest) return;
  const z = feet[2];
  const k = ras.F / z;            // px per world unit at this distance
  if (k * 26 < 3) return;         // too small to see
  const S = Math.max(24, Math.ceil(k * 48));
  const sc = TC.scratch(S);
  const g = sc.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  // A view that faces the camera: the rig's yaw toward the camera, with the pitch from the ray's downward angle.
  const bearing = Math.atan2(cam.y - pos[1], cam.x - pos[0]);
  const yawDeg = -bearing * 180 / Math.PI - 90;
  const down = Math.atan2(cam.z - pos[2] - 12, Math.hypot(cam.x - pos[0], cam.y - pos[1])) * 180 / Math.PI;
  const pitchDeg = Math.max(3, down);
  const view = TC.viewFor(yawDeg, pitchDeg, k);
  const ox = Math.floor(S / 2), oy = Math.floor(S * 0.9);
  try {
    rig.draw(g, ox, oy, view);
  } catch (e) { return; }
  const img = g.getImageData(0, 0, S, S);
  void facing;
  const tint = hitT > 0 ? 1.6 : 1;
  ras.billboard(img, Math.round(feet[0] - ox), Math.round(feet[1] - oy), S, S, chest[2], tint);
};

// Views for billboards are cached by quantized yaw, pitch and scale (plan 4.1).
TC.viewFor = function (yawDeg, pitchDeg, k) {
  TC.viewCache = TC.viewCache || new Map();
  const key = Math.round(yawDeg / 2) + ':' + Math.round(pitchDeg / 2) + ':' + Math.round(k * 16);
  let v = TC.viewCache.get(key);
  if (!v) {
    v = new E.View('tc-r', 'Rail', Math.round(yawDeg / 2) * 2, Math.round(pitchDeg / 2) * 2, Math.max(0.05, Math.round(k * 16) / 16), 1);
    if (TC.viewCache.size > 400) TC.viewCache.clear();
    TC.viewCache.set(key, v);
  }
  return v;
};

// One scratch canvas for every billboard, grown as needed.
TC.scratch = function (S) {
  if (!TC._scratch) {
    TC._scratch = { cv: null, g: null, size: 0 };
  }
  const sc = TC._scratch;
  if (sc.size < S) {
    sc.cv = document.createElement('canvas');
    sc.cv.width = S; sc.cv.height = S;
    sc.g = sc.cv.getContext('2d', { willReadFrequently: true });
    sc.size = S;
  }
  return sc;
};

// ---- src/42-hud.js ----
// 42-hud.js: the HUD (plan 4.13), drawn over each viewport, and the screen-wide layer (banners, the hurt border, the
// boss card). The HUD reads the sim and the play's presentation state; it never changes them. Positions are in buffer
// pixels, anchored to the viewport. Smallest text is scale 1; the numbers that matter are scale 2 and up.

TC.HUD = { blue: '#3aa0e8', pale: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c0' };

// The label for an action on the device a seat used last: 'R2', 'Right click', 'Space' and so on.
TC.labelFor = function (seat, action) {
  const input = seat && seat.input;
  if (!input || !input.label) return '';
  try { return input.label(action); } catch (e) { return ''; }
};

// A viewport's HUD.
TC.drawHUD = function (play, g, vp, p, cam) {
  const sim = play.sim, seat = play.seats[p.id], W = vp.w, H = vp.h;
  const x0 = vp.x, y0 = vp.y, cx = x0 + W / 2, cy = y0 + H / 2;
  const hudOff = TC.tune.view.hideHud;
  // Reticle, centred on the aim, hidden in cover (plan 4.3: in cover the reticle hides).
  if (!p.out && p.c < 0.5 && !hudOff) {
    const rx = cx + p.aim[0] * (H / 2), ry = cy - p.aim[1] * (H / 2);
    const col = p.color || '#ffffff';
    g.fillStyle = col;
    g.fillRect(Math.round(rx) - 4, Math.round(ry), 3, 1); g.fillRect(Math.round(rx) + 2, Math.round(ry), 3, 1);
    g.fillRect(Math.round(rx), Math.round(ry) - 4, 1, 3); g.fillRect(Math.round(rx), Math.round(ry) + 2, 1, 3);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(rx), Math.round(ry), 1, 1);
    if (play.hitMarker > 0) {
      const c = play.hitHead ? TC.HUD.gold : '#ffffff';
      TC.text(g, 'X', rx + 6, ry - 4, c, { scale: 1 });
    }
    const w = TC.get('weapon', sim.weaponId(p));
    if (sim.ammoOf(p, w.id) <= 0 || (w.id === 'handgun' && p.mag <= 0)) {
      if (Math.floor(play.time * 4) % 2 === 0) TC.text(g, 'RELOAD!', cx, cy + 14, TC.HUD.warn, { align: 'center', scale: 1 });
    }
  }
  // TIME, the rising-tide plate, top centre.
  const tfrac = TC.clamp(sim.timer / Math.max(1, sim.timeMax), 0, 1);
  const tw = Math.min(60, Math.max(34, W * 0.14)), th = 18;
  const tx = cx - tw / 2, ty = y0 + 3;
  g.fillStyle = '#05070fcc'; g.fillRect(tx - 1, ty - 1, tw + 2, th + 2);
  g.fillStyle = TC.HUD.blue; g.fillRect(tx, ty + th - Math.round(th * tfrac), tw, Math.round(th * tfrac));
  const low = sim.timer < 10 && (sim.phase === 'action' || sim.phase === 'boss');
  const blink = sim.timer < 5 && Math.floor(play.time * 6) % 2 === 0;
  const timeCol = low ? (blink ? '#ffffff' : TC.HUD.warn) : '#f4f7ff';
  TC.text(g, 'TIME', cx, ty + 1, timeCol, { align: 'center', scale: 1, outline: '#05070f' });
  TC.text(g, Math.max(0, sim.timer).toFixed(1), cx, ty + 9, timeCol, { align: 'center', scale: 1, outline: '#05070f' });
  // The boss' bars, under TIME.
  if (sim.boss && !sim.boss.defeated && sim.phase === 'boss') {
    let bx = cx - 60, by = ty + th + 4;
    const cores = sim.boss.parts.filter(q => !q.decor);
    const n = cores.length;
    for (let i = 0; i < n; i++) {
      const q = cores[i], frac = TC.clamp(q.hp / Math.max(1, q.max), 0, 1);
      g.fillStyle = '#000000aa'; g.fillRect(bx + i * 40, by, 36, 4);
      g.fillStyle = q.down ? '#303a4a' : q.core ? '#ff5a2a' : '#ffd36a';
      g.fillRect(bx + i * 40, by, Math.round(36 * frac), 4);
    }
  }
  // Score, top left, and the chain under it.
  const pts = Math.round(p.score);
  TC.text(g, 'SCORE', x0 + 4, y0 + 4, TC.HUD.dim, { scale: 1 });
  TC.text(g, TC.fmt(pts), x0 + 4, y0 + 12, TC.HUD.pale, { scale: 2 });
  if (p.chain > 0) TC.text(g, 'x' + p.mult.toFixed(1) + ' (' + p.chain + ')', x0 + 4, y0 + 30, TC.HUD.gold, { scale: 1 });
  if (sim.players.length > 1) TC.text(g, p.name, x0 + 4, y0 + 40, p.color, { scale: 1 });
  // Lives, bottom left: a CREST shield for each.
  for (let i = 0; i < Math.min(9, Math.max(0, p.lives)); i++) {
    const sx = x0 + 4 + i * 8, sy = y0 + H - 14;
    g.fillStyle = '#3aa0e8'; g.fillRect(sx, sy, 6, 8); g.fillStyle = '#f4f7ff'; g.fillRect(sx + 2, sy + 2, 2, 4);
  }
  // The weapon panel, bottom right.
  const w = TC.get('weapon', sim.weaponId(p));
  const wx = x0 + W - 4;
  const wname = w.short;
  TC.text(g, wname, wx, y0 + H - 26, TC.HUD.pale, { align: 'right', scale: 1 });
  if (w.id === 'handgun') {
    const pips = w.mag;
    for (let i = 0; i < pips; i++) {
      g.fillStyle = i < p.mag ? w.pip : '#2a3550';
      g.fillRect(wx - 4 - (pips - i) * 4, y0 + H - 16, 3, 6);
    }
    TC.text(g, 'UNLIMITED', wx, y0 + H - 36, TC.HUD.dim, { align: 'right', scale: 1 });
  } else {
    const n = sim.ammoOf(p, w.id);
    TC.text(g, String(n), wx, y0 + H - 36, TC.HUD.pale, { align: 'right', scale: 2 });
    g.fillStyle = w.pip; g.fillRect(wx - 60, y0 + H - 14, Math.round(56 * TC.clamp(n / w.pool, 0, 1)), 3);
  }
  if (p.reloadT >= 0) {
    const frac = TC.clamp(p.reloadT / (w.reloadCover * (TC.tune.player.reload / 0.3)), 0, 1);
    TC.text(g, 'RELOADING ' + Math.round(frac * 100) + '%', cx, cy + 22, TC.HUD.pale, { align: 'center', scale: 1 });
  }
  // Weapon strip after a switch.
  if (p.switchT > 0) {
    TC.text(g, TC.WEAPON_ORDER.map((id, i) => (id === w.id ? '[' + (i + 1) + ']' : ' ' + (i + 1) + ' ')).join(''), cx, y0 + H - 12, TC.HUD.gold, { align: 'center', scale: 1 });
  }
  // Threat rings: the crisis flash, at the shooter's muzzle, for threats aimed at this player.
  if (!hudOff) TC.drawThreats(play, g, vp, p, cam);
  // Cover: a dark rim and a tag while hidden.
  if (p.c >= 0.5) {
    g.fillStyle = '#000000'; g.globalAlpha = 0.35;
    g.fillRect(x0, y0, W, 6); g.fillRect(x0, y0 + H - 6, W, 6); g.fillRect(x0, y0, 6, H); g.fillRect(x0 + W - 6, y0, 6, H);
    g.globalAlpha = 1;
    TC.text(g, 'COVER', cx, y0 + H - 22, TC.HUD.gold, { align: 'center', scale: 1 });
  }
  // Hurt: a red border that fades.
  if (play.fx.hurt > 0 && vp.i === p.id) {
    g.fillStyle = '#ff3b30'; g.globalAlpha = TC.clamp(play.fx.hurt, 0, 1) * 0.5;
    g.fillRect(x0, y0, W, 3); g.fillRect(x0, y0 + H - 3, W, 3); g.fillRect(x0, y0, 3, H); g.fillRect(x0 + W - 3, y0, 3, H);
    g.globalAlpha = 1;
  }
  // Continue: this player is out.
  if (p.out && !p.dead) {
    g.fillStyle = '#05070fdd'; g.fillRect(x0, y0, W, H);
    TC.text(g, 'CONTINUE? ' + Math.max(0, Math.ceil(p.outT)), cx, cy - 10, TC.HUD.gold, { align: 'center', scale: 3 });
    const lab = TC.labelFor(seat, 'fire');
    TC.text(g, 'PRESS ' + (lab || 'FIRE') + ' TO JOIN IN', cx, cy + 16, TC.HUD.pale, { align: 'center', scale: 1 });
  }
  void cam;
};

// Threat rings: a ring at the muzzle's screen point, shrinking to a point as the impact nears; a "!" glyph; an edge
// arrow when the shooter is off screen. Threats aimed at a teammate show only a small outline.
TC.drawThreats = function (play, g, vp, p, cam) {
  const ras = play.rasters[vp.i];
  if (!ras) return;
  for (const th of play.threatRings.values()) {
    const u = TC.clamp((play.sim.t - th.t0) / th.dur, 0, 1);
    const mine = th.target === p.id;
    const sx = ras.project(th.muzzle);
    const x = vp.x + (sx ? sx[0] : vp.w / 2), y = vp.y + (sx ? sx[1] : vp.h / 2);
    const visible = sx && sx[0] >= 0 && sx[0] < vp.w && sx[1] >= 0 && sx[1] < vp.h;
    if (!mine) {
      if (visible) { g.strokeStyle = '#ff8a7a'; g.globalAlpha = 0.6; g.strokeRect(Math.round(x) - 2, Math.round(y) - 2, 5, 5); g.globalAlpha = 1; }
      continue;
    }
    if (!visible) {
      // An edge arrow toward the shooter.
      const ax = TC.clamp(x, vp.x + 6, vp.x + vp.w - 6), ay = TC.clamp(y, vp.y + 14, vp.y + vp.h - 14);
      g.fillStyle = '#ff3b30';
      g.fillRect(Math.round(ax) - 2, Math.round(ay) - 2, 4, 4);
      TC.text(g, '!', ax, ay - 10, '#ffffff', { align: 'center', scale: 1 });
      continue;
    }
    const size = TC.tune.view.threatBig ? 2 : 1;
    const rad = (26 - 20 * u) * size * 0.5 + 3;
    const blinkOn = u < 0.66 || Math.floor(play.time * 20) % 2 === 0;
    g.strokeStyle = '#ff3b30'; g.lineWidth = 1;
    g.globalAlpha = 0.95;
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    if (blinkOn) TC.text(g, '!', x + rad + 2, y - 4, '#ff3b30', { scale: 1 });
    g.globalAlpha = 1;
  }
};

// The screen-wide layer: banners, the radio box, the prompts and the intel note. Drawn once, across the whole screen.
TC.drawGlobal = function (play, g, W, H) {
  // Banners: the big words, slid in and faded over their life.
  let by = Math.round(H * 0.42);
  for (const b of play.fx.banners) {
    const u = TC.clamp(b.t / b.life, 0, 1);
    const alpha = u > 0.8 ? (1 - u) / 0.2 : 1;
    g.globalAlpha = Math.max(0, alpha);
    const slide = u < 0.12 ? (1 - u / 0.12) * 16 : 0;
    TC.text(g, b.text, W / 2 + slide, by, b.color, { align: 'center', scale: b.scale, outline: '#05070f' });
    if (b.sub) TC.text(g, b.sub, W / 2, by + 14 * b.scale, '#cfe4ff', { align: 'center', scale: 1 });
    by += 0;
    g.globalAlpha = 1;
    break;
  }
  // The radio box: a 32-px portrait is not drawn; the speaker's name and the line, typed out.
  const r = play.radioQueue[0];
  if (r && TC.subtitles()) {
    const sp = TC.get('speaker', r.speaker);
    const n = Math.min(r.line.length, Math.floor(r.t * 30));
    const bw = Math.min(W - 16, 300), bx = Math.round((W - bw) / 2), bh = 30, byy = H - bh - 22;
    g.globalAlpha = 0.92;
    g.fillStyle = '#081428'; g.fillRect(bx, byy, bw, bh);
    g.fillStyle = sp.color; g.fillRect(bx, byy, 2, bh);
    g.globalAlpha = 1;
    TC.text(g, sp.name, bx + 6, byy + 3, sp.color, { scale: 1 });
    TC.text(g, r.line.slice(0, n), bx + 6, byy + 12, '#f4f7ff', { scale: 1 });
  }
  if (play.intelT > 0 && play.intelText) {
    play.intelT -= 1 / 60;
    TC.text(g, 'INTEL: ' + play.intelText.slice(0, 44), W / 2, 6, '#9fffb0', { align: 'center', scale: 1 });
  }
};

// Subtitles on or off (the Settings option).
TC.subtitles = function () {
  return !(TC.settings && TC.settings.subtitles === false);
};

// ---- src/43-screens.js ----
// 43-screens.js: the screens around the play (plan 4.14): the title, the main menu, stage select, difficulty, the
// briefing, the results, game over with initials, the records, the about pages, how to play, and the touch-only
// notice. Menus are E.Menu (hover, click, keys and pad all work); the rest are drawn in our own frame with the
// engine's font. Text is 10-foot sized: the smallest is scale 1 of a 240-line screen.

TC.PALETTE = { bg: ['#10244a', '#081428'], accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c0' };

// A framed panel for a screen's body.
TC.panel = function (g, x, y, w, h) {
  if (E.ui && E.ui.box) E.ui.box(g, x, y, w, h, { bg: TC.PALETTE.bg, border: TC.PALETTE.accent });
  else { g.fillStyle = TC.PALETTE.bg[1]; g.fillRect(x, y, w, h); }
};

// The title: "SUBLIME" in white and blue, a big "3" in fire colours, the wave band and the version (plan 4.14).
TC.drawLogo = function (g, W, t) {
  if (!E.font || !E.font.title) return;
  E.font.title(g, 'SUBLIME', W / 2, 26, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
  E.font.title(g, 'CRISIS 3', W / 2, 52, { scale: 2, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
  const wave = 4 + Math.sin(t * 2) * 2;
  g.fillStyle = '#ffb347'; g.globalAlpha = 0.85;
  for (let x = 0; x < W; x += 4) g.fillRect(x, 74 + Math.round(Math.sin(x * 0.06 + t * 2.4) * wave * 0.6), 4, 2);
  g.globalAlpha = 1;
};

// Count-up numbers: the value that a stat shows at time t of its count (0..1 over the count).
TC.countUp = function (v, t) { return Math.round(v * TC.clamp(t, 0, 1)); };

// The results screen's stats for one player row.
TC.resultRows = function (result) {
  return result.rows.map(r => ({ id: r.id, name: r.name, rank: r.rank, score: r.score, acc: r.acc, kills: r.kills,
    headshots: r.headshots, saves: r.saves, lost: r.lost, quick: r.quick, bestChain: r.bestChain, total: r.total,
    accBonus: r.accBonus, noDamage: r.noDamage, continues: r.continues, time: r.time, shots: r.shots, hits: r.hits }));
};

// Device-aware how-to text: the labels of this player's device, read at draw time.
TC.howtoLines = function (seat) {
  const L = a => TC.labelFor(seat, a) || '?';
  return [
    ['Aim', 'Mouse, or the right stick (or the arrow keys)'],
    ['Fire', L('fire')],
    ['Take cover (hold)', L('cover')],
    ['Quick reload (in cover)', L('reload')],
    ['Next / previous weapon', L('next') + ' / ' + L('prev')],
    ['Weapons 1-4', '1 2 3 4'],
    ['Pause', 'Escape or Start'],
  ];
};

// The about pages, from the About data (the same data the exit interview is written from).
TC.aboutPages = function () {
  const A = TC_ABOUT || {};
  const kv = o => Object.keys(o || {}).map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) + ': ' + o[k]);
  return [
    { title: 'CREDITS', lines: [
      'Sublime Crisis 3 is an original game inspired by Time Crisis 3 (Namco, 2003).',
      'Built on my-3D2dge v0.85.2 (the handoff engine, patched), with its own software renderer.',
      'Music, sound and voices are written in code. No audio files. Animalese voices.',
      'Multiplayer: AI Hub session protocol v1, shared world, 1-4 players.',
    ] },
    { title: 'SOURCE INFORMATION', lines: kv(A.sourceInformation) },
    { title: 'TESTING FEEDBACK', lines: A.testingFeedback || [] },
    { title: 'ENGINE FEEDBACK', lines: A.engineFeedback || [] },
    { title: 'PROMPT FEEDBACK', lines: A.promptFeedback || [] },
    { title: 'THANKS', lines: [A.thanks || 'Thanks to the CREST field team, and to everyone who held a pad for the demo.'] },
  ];
};

// Touch-only devices: no touch controls, a notice, and the settings button. A key press or a pad unlocks the title.
TC.touchOnly = function () {
  if (typeof matchMedia === 'undefined') return false;
  return !matchMedia('(any-pointer: fine)').matches && !matchMedia('(any-hover: hover)').matches;
};

// ---- src/44-dev.js ----
// 44-dev.js: the dev panel (plan 4.16), from the pause menu. The sim is frozen while it is open; close it and play goes on
// with the new values. Six tabs of descriptors: each slider's key is a path into TC.tune ('enemy.hpMul'), and Reset all
// copies TC.TUNE back. Navigation: up and down move, left and right adjust (hold to speed up), confirm toggles or runs,
// cancel closes, and the tab keys (Q and E, or L1 and R1) change tab. Dev mode is not in AI Hub sessions.

TC.Dev = {
  open: false, tab: 0, i: 0, play: null, game: null, confirmReset: false, held: 0,
  tabs: [
    { name: 'PLAYER', items: [
      { t: 'toggle', path: 'player.godMode', label: 'God mode' },
      { t: 'toggle', path: 'player.infiniteAmmo', label: 'Infinite ammo' },
      { t: 'slider', path: 'player.lives', label: 'Start lives (0 = difficulty)', min: 0, max: 9, step: 1 },
      { t: 'slider', path: 'player.iframes', label: 'I-frames (s)', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'player.coverIn', label: 'Cover in (s)', min: 0.05, max: 0.4, step: 0.01 },
      { t: 'slider', path: 'player.coverOut', label: 'Cover out (s)', min: 0.05, max: 0.4, step: 0.01 },
      { t: 'slider', path: 'player.reload', label: 'Reload (s)', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'player.padSpeed', label: 'Pad aim speed', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'player.aimAssist', label: 'Aim assist', min: 0, max: 1, step: 0.05 },
    ] },
    { name: 'WEAPONS', items: [
      { t: 'slider', path: 'weapon.handgunDmg', label: 'Handgun damage', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'weapon.mgRate', label: 'MG rate (/s)', min: 4, max: 20, step: 1 },
      { t: 'slider', path: 'weapon.mgDmg', label: 'MG damage', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'weapon.shotPellets', label: 'Shotgun pellets', min: 4, max: 14, step: 1 },
      { t: 'slider', path: 'weapon.shotSpread', label: 'Shotgun spread (deg)', min: 2, max: 12, step: 0.5 },
      { t: 'slider', path: 'weapon.glRadius', label: 'GL radius (u)', min: 24, max: 96, step: 4 },
      { t: 'slider', path: 'weapon.glDmg', label: 'GL damage', min: 2, max: 12, step: 0.5 },
      { t: 'slider', path: 'weapon.ammoMul', label: 'Ammo pickups x', min: 0.5, max: 3, step: 0.1 },
    ] },
    { name: 'ENEMIES', items: [
      { t: 'slider', path: 'enemy.hpMul', label: 'HP x', min: 0.5, max: 3, step: 0.1 },
      { t: 'slider', path: 'enemy.threatMul', label: 'Threat chance x', min: 0, max: 3, step: 0.1 },
      { t: 'slider', path: 'enemy.telegraphMul', label: 'Telegraph x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.fireMul', label: 'Fire interval x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.maxThreats', label: 'Max threats', min: 1, max: 4, step: 1 },
      { t: 'slider', path: 'enemy.minGap', label: 'Minimum gap (s)', min: 0.1, max: 1, step: 0.05 },
      { t: 'slider', path: 'enemy.reactMul', label: 'Reaction x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'enemy.bossHpMul', label: 'Boss HP x', min: 0.25, max: 3, step: 0.25 },
    ] },
    { name: 'TIME', items: [
      { t: 'toggle', path: 'time.freeze', label: 'Freeze TIME' },
      { t: 'slider', path: 'time.sceneMul', label: 'Area time x', min: 0.5, max: 2, step: 0.1 },
      { t: 'slider', path: 'time.eliteBonus', label: 'Elite bonus (s)', min: 0, max: 5, step: 0.5 },
      { t: 'slider', path: 'time.refill', label: 'Refill after time-up', min: 0.2, max: 1, step: 0.1 },
      { t: 'slider', path: 'time.gameSpeed', label: 'Game speed', min: 0.25, max: 1.5, step: 0.05 },
    ] },
    { name: 'VIEW', items: [
      { t: 'slider', path: 'view.fov', label: 'FOV', min: 45, max: 75, step: 1 },
      { t: 'toggle', path: 'view.hideHud', label: 'Hide HUD' },
      { t: 'toggle', path: 'view.hitVolumes', label: 'Show hit volumes' },
      { t: 'toggle', path: 'view.colliders', label: 'Show colliders' },
      { t: 'toggle', path: 'view.aiLabels', label: 'Show AI states' },
      { t: 'toggle', path: 'view.threatDebug', label: 'Show threat timers' },
      { t: 'toggle', path: 'view.perf', label: 'Show performance readout' },
      { t: 'toggle', path: 'view.threatBig', label: 'Large crisis rings' },
    ] },
    { name: 'ACTIONS', items: [
      { t: 'run', label: 'Restart area', fn: d => d.play.restartArea() },
      { t: 'run', label: 'Next area', fn: d => d.play.skipArea(1) },
      { t: 'run', label: 'Kill all enemies', fn: d => d.play.killAll() },
      { t: 'run', label: 'All weapons and ammo', fn: d => d.play.allWeapons() },
      { t: 'run', label: '+1 life', fn: d => { for (const p of d.play.sim.players) p.lives = Math.min(9, p.lives + 1); } },
      { t: 'run', label: 'Lose a life', fn: d => { for (const p of d.play.sim.players) d.play.sim.loseLife(p, 'dev', true); } },
      { t: 'run', label: 'Trigger a threat on me', fn: d => d.play.sim.addThreat({ src: 0, target: 0, muzzle: [d.play.sim.base + 200, 0, 20], tele: 0.8, kind: 'shot', pr: null }) },
      { t: 'run', label: 'Bot plays (Autopilot)', fn: d => { const s = d.play.seats[0]; s.bot = s.bot ? null : TC.Autopilot.make('fair'); } },
      { t: 'run', label: 'Clear stage (win)', fn: d => d.play.sim.stageClear() },
      { t: 'run', label: 'Game over', fn: d => d.play.sim.gameOver() },
    ] },
  ],

  openFrom(game) {
    const play = TC.current.play;
    game.resume();
    if (!play) return;
    this.game = game; this.play = play; this.open = true; this.i = 0; this.tab = 0; this.confirmReset = false;
  },
  active() { return this.open; },
  close() { this.open = false; this.confirmReset = false; },

  // Reset all values to their defaults (TC.TUNE), with a second press to confirm.
  resetAll() {
    if (!this.confirmReset) { this.confirmReset = true; return; }
    TC.tuneReset();
    this.confirmReset = false;
  },

  update(dt) {
    const g = this.game, I = g.input;
    const items = this.tabs[this.tab].items;
    if (I.pressed('cancel') || I.pressed('pause')) { this.close(); return; }
    if (I.pressed('down')) this.i = (this.i + 1) % (items.length + 1);
    if (I.pressed('up')) this.i = (this.i + items.length) % (items.length + 1);
    if (I.pressed('right') || I.pressed('left')) this.adjust(I.pressed('right') ? 1 : -1, items);
    if ((I.down('right') || I.down('left')) && ++this.held > 14 && this.held % 4 === 0) this.adjust(I.down('right') ? 1 : -1, items);
    if (!I.down('right') && !I.down('left')) this.held = 0;
    if (I.pressed('w4') || I.pressed('next')) this.tab = (this.tab + 1) % this.tabs.length;
    if (I.pressed('prev') || I.pressed('w3')) this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length;
    if (I.pressed('confirm') || I.pressed('fire')) this.pick(items);
    if (I.pressed('reload')) this.resetFocused(items);
  },

  // Change a slider by one step, or flip a toggle; the reset row is the last one.
  adjust(dir, items) {
    if (this.i >= items.length) return;
    const it = items[this.i];
    if (it.t === 'slider') {
      const v = TC.tuneGet(it.path);
      const next = TC.clamp(Math.round((v + dir * it.step) / it.step) * it.step, it.min, it.max);
      TC.tuneSet(it.path, Math.round(next * 1000) / 1000);
    } else if (it.t === 'toggle') {
      TC.tuneSet(it.path, !TC.tuneGet(it.path));
    }
  },

  pick(items) {
    if (this.i >= items.length) { this.resetAll(); return; }
    const it = items[this.i];
    if (it.t === 'toggle') TC.tuneSet(it.path, !TC.tuneGet(it.path));
    else if (it.t === 'run') it.fn(this);
    TC.sfx(this.game, 'pick');
  },

  // Reset the focused value to its default (the Reset key).
  resetFocused(items) {
    if (this.i >= items.length) return;
    const it = items[this.i];
    if (it.path) TC.tuneSet(it.path, TC.tuneGetFrom(TC.TUNE, it.path));
  },

  draw(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      g.fillStyle = '#05070fe6';
      g.fillRect(0, 0, W, H);
      TC.text(g, 'DEV MODE', W / 2, 8, TC.PALETTE.warn, { align: 'center', scale: 2 });
      this.tabs.forEach((t, k) => {
        TC.text(g, t.name, 16 + k * 62, 26, k === this.tab ? TC.PALETTE.gold : TC.PALETTE.dim, { scale: 1 });
      });
      const items = this.tabs[this.tab].items;
      items.forEach((it, k) => {
        const y = 40 + k * 14;
        const focus = k === this.i;
        if (focus) { g.fillStyle = '#3aa0e8'; g.fillRect(12, y - 2, W - 24, 12); }
        const changed = it.path && TC.tuneChanged(it.path);
        const col = focus ? '#ffffff' : changed ? TC.PALETTE.gold : '#c8d6ee';
        TC.text(g, it.label, 18, y, col, { scale: 1 });
        if (it.path) {
          const v = TC.tuneGet(it.path);
          const shown = typeof v === 'boolean' ? (v ? 'ON' : 'OFF') : String(Math.round(v * 100) / 100);
          TC.text(g, shown, W - 20, y, col, { align: 'right', scale: 1 });
          if (changed) TC.text(g, 'def ' + String(TC.tuneGetFrom(TC.TUNE, it.path)), W - 90, y, TC.PALETTE.dim, { align: 'right', scale: 1 });
        }
      });
      const y = 40 + items.length * 14 + 8;
      const focusReset = this.i === items.length;
      if (focusReset) { g.fillStyle = '#3aa0e8'; g.fillRect(12, y - 2, W - 24, 12); }
      TC.text(g, this.confirmReset ? 'PRESS AGAIN TO RESET EVERYTHING' : 'RESET ALL TO DEFAULTS', 18, y, focusReset ? '#ffffff' : TC.PALETTE.warn, { scale: 1 });
      TC.text(g, 'Left/right adjust  Enter toggles or runs  Q/E tab  Esc closes', W / 2, H - 12, TC.PALETTE.dim, { align: 'center', scale: 1 });
    });
  },
};

// ---- src/45-attract.js ----
// 45-attract.js: the Autopilot (plan 4.17), the attract mode, the demo playlist, and the arcade table helpers.
// The Autopilot produces the same commands a player does, from the sim's state. It cheats through the demo (god mode
// and infinite ammo are set on the demo's Sim), so the attract mode shows the most of the game, not the balance.

TC.Autopilot = {
  // A bot for one seat. skill: 'fair' (reacts late, aims slower) or 'showoff' (uses every weapon, quick).
  make(skill) {
    const bot = { skill, fire: false, lastShot: 0, cover: false, aim: [0, 0], wpnT: 0 };
    bot.command = (sim, i, dt) => TC.Autopilot.command(sim, i, dt, bot);
    return bot;
  },

  command(sim, i, dt, bot) {
    const p = sim.players[i];
    const cmd = {};
    if (!p || p.dead) return cmd;
    if (p.out) {
      // A bot rejoins at once.
      if (sim.phase === 'continue' || p.outT > 0) cmd.firePressed = true;
      return cmd;
    }
    const fast = bot.skill === 'showoff';
    const reactT = fast ? 0.12 : 0.3;
    // Threats on this player: the soonest impact decides cover.
    let soon = Infinity;
    for (const th of sim.threats) {
      if (th.resolved || th.target !== p.id) continue;
      soon = Math.min(soon, th.impactAt - sim.t);
    }
    const needReload = p.mag <= 0 || (p.mag < 9 && p.reloadT >= 0);
    const hideFor = soon < 0.3 || (needReload && soon > 0.3 && TC.Autopilot.noEnemyExposed(sim));
    cmd.cover = hideFor || p.c > 0.5 && soon < 0.6;
    if (cmd.cover && (p.reloadT < 0 && p.mag < 9)) cmd.reload = true;
    // Target: the nearest exposed enemy to the aim, its head first.
    const cam = sim.camFor(p);
    const aspect = 16 / 9;
    let best = null, bd = Infinity;
    for (const e of sim.enemies) {
      if (!e.alive || !e.exposed || e.role === 'civilian') continue;
      const v = TC.toView(cam, [e.x, e.y, (e.z || 0) + 24 * (e.size || 1)], aspect);
      if (!v) continue;
      const d = Math.hypot(v[0] - p.aim[0], v[1] - p.aim[1]);
      if (d < bd) { bd = d; best = { e, v }; }
    }
    // In a boss fight the weak parts (turrets, claws, lamps) come first: the core is armored until they are down.
    if (sim.boss && !sim.boss.defeated && sim.phase === 'boss') {
      const parts = sim.boss.parts.map((bp, i) => ({ bp, def: sim.boss.def.parts[i] }))
        .filter(x => !x.bp.decor && !x.bp.down && (x.bp.weak || (x.bp.core && !sim.bossArmored())));
      for (const { bp, def } of parts) {
        const bx = sim.bossPartBox(def);
        const v = TC.toView(cam, [(bx[0] + bx[3]) / 2, (bx[1] + bx[4]) / 2, (bx[2] + bx[5]) / 2], aspect);
        if (!v) continue;
        const d = Math.hypot(v[0] - p.aim[0], v[1] - p.aim[1]) - (bp.weak ? 0.2 : 0);
        if (!best || d < bd) { best = { e: null, v }; bd = d; }
      }
    }
    const tgt = best ? best.v : [0, 0];
    // Aim eases to the target (a critically damped pull), a little slower on 'fair'.
    const k = 1 - Math.exp(-dt * (fast ? 9 : 4.5));
    const aim = [p.aim[0] + (tgt[0] - p.aim[0]) * k, p.aim[1] + (tgt[1] - p.aim[1]) * k];
    cmd.aim = aim;
    // Weapons: the machine gun against a crowd, the shotgun close, the grenade launcher at shields.
    bot.wpnT -= dt;
    if (bot.wpnT <= 0 && fast) {
      bot.wpnT = 2.5;
      const crowd = sim.enemies.filter(e => e.alive && e.exposed).length >= 3;
      let want = 'handgun';
      if (crowd && p.owned.mg && p.pool.mg > 0) want = 'mg';
      else if (p.owned.gl && p.pool.gl > 0 && best && best.e && best.e.type === 'shield') want = 'gl';
      else if (p.owned.shotgun && p.pool.shotgun > 0 && best && best.e && best.v && Math.abs(best.v[0]) < 0.4) want = 'shotgun';
      const idx = TC.WEAPON_ORDER.indexOf(want) + 1;
      if (idx !== p.wpn + 1) cmd.select = idx;
    }
    // Fire when the reticle is on the target, and not in cover. Bursts, with a reaction delay.
    const onTarget = best && bd < 0.09;
    if (!cmd.cover && onTarget && p.c < 0.2) {
      if (sim.t - bot.lastShot > reactT * 0.5 || fast) {
        cmd.fire = true;
        cmd.firePressed = true;
        bot.lastShot = sim.t;
      }
    } else if (!cmd.cover && !best && p.c < 0.2) {
      cmd.fire = false;
    }
    if (p.mag <= 0 && !cmd.cover) cmd.cover = true;
    return cmd;
  },

  noEnemyExposed(sim) {
    return !sim.enemies.some(e => e.alive && e.exposed && e.role !== 'civilian');
  },
};

// The highlights, in the attract's order: [stage, area index] (plan 4.17, reduced to the areas in this build).
TC.HIGHLIGHTS = [[1, 0], [1, 2], [1, 3], [2, 0], [2, 3], [3, 1], [3, 3]];

TC.Attract = {
  playIndex: 0,

  // The demo Play for the highlight at index h.
  makeDemo(game, h, flyover) {
    const hl = TC.HIGHLIGHTS[h % TC.HIGHLIGHTS.length];
    const play = new TC.Play(game, {
      mode: 'attract', attract: true, flyover: !!flyover, stage: hl[0], sceneIndex: hl[1], difficulty: 'Normal', viewer: 0,
      seats: [{ bot: TC.Autopilot.make('showoff'), name: 'DEMO', color: '#e8443a', local: true }],
      cheats: { god: true, ammo: true },
    });
    play.lastVp = { 0: { i: 0, x: 0, y: 0, w: 0, h: 0 } };
    return play;
  },

  // Start the demo behind a title or menu scene.
  startDemo(game, scene) {
    scene.demoIndex = TC.Attract.playIndex;
    scene.demo = TC.Attract.makeDemo(game, scene.demoIndex, true);
  },

  // Draw the demo behind the title: the same drawing as play, full screen.
  drawDemo(game, scene, r) {
    if (!scene.demo) return;
    scene.demo.draw(r);
  },

  // The title's idle clock: any input resets it; 10 s without and it becomes the attract mode.
  updateTitle(game, scene, dt) {
    if (scene.demo) {
      scene.demo.update(dt);
      if (scene.demo.sim.over) {
        TC.Attract.playIndex = (TC.Attract.playIndex + 1) % TC.HIGHLIGHTS.length;
        scene.demo = TC.Attract.makeDemo(game, TC.Attract.playIndex, true);
      }
    }
    if (TC.Attract.activity(game)) scene.idle = 0;
    else scene.idle = (scene.idle || 0) + dt;
    if (scene.idle > 10) game.go('attract', null, { fade: 0.3 });
  },

  // Input of any kind: a press, a pointer move of 4 px or more, a stick past its dead zone.
  activity(game) {
    const I = game.input;
    if (I.anyPressed && I.anyPressed()) return true;
    const pt = I.pointer && I.pointer();
    if (pt) {
      const last = TC.Attract._pt;
      TC.Attract._pt = pt.slice();
      if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 4) return true;
    }
    if (I.padMove && (Math.abs(I.padMove[0]) + Math.abs(I.padMove[1])) > 0.2) return true;
    return false;
  },

  // The attract scene: DEMO, then the high scores, and on through the playlist; any input goes back to the title.
  enter(game, scene) {
    scene.phase = 'demo'; scene.phaseT = 0; scene.t = 0;
    TC.Attract.attractDemo(game, scene);
  },
  attractDemo(game, scene) {
    scene.demo = TC.Attract.makeDemo(game, TC.Attract.playIndex);
    scene.phase = 'demo'; scene.phaseT = 0;
    TC.Attract.playIndex = (TC.Attract.playIndex + 1) % TC.HIGHLIGHTS.length;
    game.audio.music(TC.get('song', 'harbor'));
  },
  updateAttract(game, scene, dt) {
    scene.phaseT += dt;
    scene.t += dt;
    if (TC.Attract.activity(game)) {
      TC.Attract.playIndex = 0;
      game.go('title', null, { fade: 0.2 });
      return;
    }
    if (scene.phase === 'demo') {
      scene.demo.update(dt);
      if (scene.demo.sim.over || scene.phaseT > 28) {
        scene.phase = 'scores'; scene.phaseT = 0;
      }
    } else if (scene.phase === 'scores') {
      if (scene.phaseT > 6) TC.Attract.attractDemo(game, scene);
    }
  },
  drawAttract(game, scene, r) {
    if (scene.phase === 'demo' && scene.demo) scene.demo.draw(r);
    r.overlay(g => {
      if (scene.phase === 'scores') {
        g.fillStyle = '#05070fe0'; g.fillRect(0, 0, r.W, r.H);
        if (TC.arcade && TC.arcade.drawTable) TC.arcade.drawTable(r, 'arcade', 30, 'HIGH SCORES');
      }
      TC.text(g, 'DEMO PLAY', 6, 6, TC.PALETTE.gold, { scale: 1 });
      const lab = TC.labelFor({ input: game.input }, 'fire') || 'ANY KEY';
      if (Math.floor(scene.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + lab + ' TO START', r.W / 2, r.H - 14, '#ffffff', { align: 'center', scale: 1 });
    });
  },
};

// The arcade: a finished run's score goes to the table if it qualifies (initials first), and then to the records.
TC.Arcade = {
  modeFor(result) {
    if (TC.current.mode === 'coop') return 'coop';
    if (TC.current.mode === 'arcade') return 'arcade';
    if (result.stage === 'range') return 'training';
    return 'stage' + result.stage;
  },
  enterOrRecords(game, result, scene) {
    const mode = TC.Arcade.modeFor(result);
    const score = result.rows.reduce((s, r) => s + r.total, 0) / Math.max(1, result.rows.length);
    const top = Math.round(score);
    if (mode !== 'training' && TC.arcade.qualifies(top, mode)) {
      scene.entering = true;
      TC.arcade.enter(top, mode, () => { scene.entering = false; game.go('records'); });
      return;
    }
    game.go('records');
  },
};

// ---- src/46-hub.js ----
// 46-hub.js: AI Hub online co-op (plan 4.19, lib/hub/README.md protocol v1, shared-world mode). When the hub opened the
// page (AIHub.active) there is no title, no attract mode and no menu: the game takes its own session card, then plays
// one stage as a shared world for 1-4 players.
//   - The HOST copy (info.isHost) runs the authoritative Sim with every player. It applies each client's latest 'in'
//     (aim, fire, cover) and its 'sh' presses, and sends snapshots ('s', about 10 a second) and events ('ev').
//   - Every other copy is a REPLICA: a Sim that is never stepped; each snapshot overwrites its state and each event
//     plays through the same presentation as a local game. It predicts nothing except the reticle, which is its own.
//   - A server copy (info.server) has no player: it runs the world and shows a status screen.
// Messages are compact arrays (plan 4.19): the snapshot stays under 1,100 bytes by dropping the enemies furthest away.

TC.Hub = {
  info: null, host: false, server: false, me: 0, stage: 1, round: 1, play: null, replica: null, inputs: {},
  lastSnap: null, snapAt: 0, evQ: [], evT: 0, sending: 0, presses: {}, ended: null, card: null, started: false,
  PH: ['arrive', 'action', 'clear', 'boss', 'outro', 'continue', 'over', 'stageclear'],
  ETYPES: () => Object.keys(TC.registry.enemy),
  SEATS: ['kai', 'mari', 'rook', 'juno'],

  // Join the round. Resolves with the info, or null when there is no hub (then the game runs as a normal game).
  async connect() {
    const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) return null;
    this.info = info;
    this.host = !!info.isHost;
    this.server = !!info.server;
    this.me = info.me;
    this.round = info.round || 1;
    this.stage = ((this.round - 1) % 3) + 1;
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.started = true; });
    AIHub.on('message', (data, from) => this.onMessage(data, from));
    AIHub.on('leave', ({ id, reason }) => this.onLeave(id, reason));
    AIHub.on('time-up', () => this.onTimeUp());
    AIHub.on('end', (e) => this.onEnd(e));
    return info;
  },

  // The players of the round, as seats: each with its name and colour from the hub, its agent, and whether it is ours.
  seats(game) {
    return this.info.players.map((pl, i) => ({
      input: i === this.me && !this.server ? game.input : null, name: pl.name, color: pl.color,
      agent: this.SEATS[i] || 'kai', mouse: i === this.me, local: i === this.me, net: i !== this.me, id: i,
    }));
  },

  // The session card: the game's own, with the stage, the players in their colours, who is ready, the goal, the
  // controls of this device, and the countdown from the hub's card event.
  drawCard(game, r, t) {
    const info = this.info, W = r.W, H = r.H;
    const ready = (this.card && this.card.ready) || [];
    r.overlay(g => {
      TC.panel(g, 30, 16, W - 60, H - 32);
      TC.text(g, 'SUBLIME CRISIS 3', W / 2, 24, TC.PALETTE.gold, { align: 'center', scale: 2 });
      const st = TC.get('stage', this.stage);
      TC.text(g, st.name + ' · ' + st.place, W / 2, 46, '#ffffff', { align: 'center', scale: 2 });
      TC.text(g, 'Clear the stage together. The most points wins.', W / 2, 68, TC.PALETTE.text, { align: 'center', scale: 1 });
      info.players.forEach((pl, i) => {
        const y = 92 + i * 22;
        TC.text(g, pl.name + (i === this.me ? '  (you)' : ''), 60, y, pl.color, { scale: 2 });
        const isReady = ready.includes(i);
        TC.text(g, isReady ? 'READY' : 'waiting', W - 60, y, isReady ? '#9fffb0' : TC.PALETTE.dim, { align: 'right', scale: 2 });
      });
      const lab = (a) => TC.labelFor({ input: game.input }, a) || '?';
      TC.text(g, 'Aim ' + lab('fire').replace(/./, '') + ' Fire ' + lab('fire') + '  Cover ' + lab('cover') + '  Reload ' + lab('reload'), W / 2, H - 70, TC.PALETTE.pale || '#f4f7ff', { align: 'center', scale: 1 });
      const left = this.card && this.card.left;
      const secs = left != null ? Math.ceil(left / 1000) : null;
      const msg = this.card && this.card.starting ? 'STARTING' : secs != null ? 'START IN ' + secs : (this.card && this.card.paused ? 'PAUSED' : 'WAITING');
      TC.text(g, msg, W / 2, H - 52, TC.PALETTE.gold, { align: 'center', scale: 2 });
      TC.text(g, 'ENTER or ' + lab('fire') + ': READY   ' + lab('more') + ': MORE TIME', W / 2, H - 22, TC.PALETTE.dim, { align: 'center', scale: 1 });
      void t;
    });
  },

  // Input on the card: Ready, and More time (taken back by a second press).
  cardInput(game) {
    const I = game.input;
    if (I.pressed('confirm') || I.pressed('fire')) AIHub.answer('ready');
    if (I.pressed('more')) AIHub.answer('more');
  },

  // Each copy's commands for its seat: the host applies the remote seats from the network; a local seat reads its device.
  netCommand(play, i) {
    const cmd = {};
    const st = this.inputs[i] || {};
    cmd.aim = st.aim || [0, 0];
    cmd.fire = !!st.fire;
    cmd.cover = !!st.cover;
    const q = this.presses[i] || [];
    for (const k of q) {
      if (k === 'fire') cmd.firePressed = true;
      else if (k === 'cover') cmd.coverPressed = true;
      else if (k === 'reload') cmd.reload = true;
      else if (k === 'next') cmd.next = true;
      else if (k === 'prev') cmd.prev = true;
      else if (k[0] === 'w') cmd.select = Number(k.slice(1));
    }
    this.presses[i] = [];
    return cmd;
  },

  // Our own input, sent to the host about 15 times a second, and the presses at once (reliable, in order).
  sendInput(game, play, dt) {
    if (this.server || this.me == null) return;
    const seat = play.seats[this.me];
    if (!seat || !seat.input) return;
    const I = seat.input;
    const aim = play.aims[this.me] || [0, 0];
    this.inputTimer = (this.inputTimer || 0) - dt;
    if (this.inputTimer <= 0) {
      this.inputTimer = 1 / 15;
      AIHub.send({ t: 'in', a: [Math.round(aim[0] * 1000), Math.round(aim[1] * 1000)], f: I.down('fire') ? 1 : 0, c: I.down('cover') ? 1 : 0 }, { reliable: false });
    }
    const presses = [];
    if (I.pressed('fire')) presses.push('fire');
    if (I.pressed('cover')) presses.push('cover');
    if (I.pressed('reload')) presses.push('reload');
    if (I.pressed('next')) presses.push('next');
    if (I.pressed('prev')) presses.push('prev');
    for (const k of ['w1', 'w2', 'w3', 'w4']) if (I.pressed(k)) presses.push(k);
    if (presses.length) AIHub.send({ t: 'sh', k: presses }, { reliable: true });
  },

  // Messages: the host takes 'in' and 'sh' from the clients; the replicas take 's' and 'ev' from the host.
  onMessage(data, from) {
    if (!data || typeof data !== 'object') return;
    if (this.host) {
      if (data.t === 'in') {
        this.inputs[from] = { aim: [data.a[0] / 1000, data.a[1] / 1000], fire: !!data.f, cover: !!data.c };
      } else if (data.t === 'sh' && Array.isArray(data.k)) {
        this.presses[from] = (this.presses[from] || []).concat(data.k.slice(0, 8));
      }
      return;
    }
    if (data.t === 's') this.lastSnap = { at: AIHub.time(), snap: data };
    else if (data.t === 'ev' && this.play) this.play.netEvents((data.e || []));
  },

  // The host's snapshot: the state a replica needs, in compact arrays, under 1,100 bytes.
  snapshot(play) {
    const sim = play.sim;
    const pl = sim.players.map(p => [p.id, Math.round(p.score), p.lives, p.chain, TC.WEAPON_ORDER.indexOf(sim.weaponId(p)),
      p.mag, Math.round(p.pool.mg || 0), Math.round(p.pool.shotgun || 0), Math.round(p.pool.gl || 0), Math.round(p.c * 100),
      Math.round(p.aim[0] * 1000), Math.round(p.aim[1] * 1000), p.out ? 1 : 0, Math.round(p.outT * 10), Math.round(p.x),
      Math.round(p.slotY), (p.owned.mg ? 1 : 0) | (p.owned.shotgun ? 2 : 0) | (p.owned.gl ? 4 : 0), p.stats.kills, p.stats.hits,
      p.stats.shots, p.stats.headshots, p.stats.saves, p.stats.lost]);
    const types = this.ETYPES();
    let en = sim.enemies.filter(e => !e.gone).map(e => [e.id, types.indexOf(e.type), Math.round(e.x), Math.round(e.y), Math.round(e.z),
      Math.round(e.facing * 100), TC.ESTATE.indexOf(e.state), Math.round(e.hp * 10), e.alive ? 1 : 0, e.exposed ? 1 : 0, Math.round((e.size || 1) * 10)]);
    const snap = { t: 's', at: Math.round(sim.t * 100) / 100, ph: this.PH.indexOf(sim.phase), sc: sim.sceneIdx, tm: Math.round(sim.timer * 10), tmx: Math.round(sim.timeMax), base: Math.round(sim.base), p: pl, e: en, pr: sim.projectiles.filter(q => !q.gone).slice(0, 4).map(q => [q.id, q.kind === 'grenade' ? 1 : 0, Math.round(q.x), Math.round(q.y), Math.round(q.z)]), bo: sim.boss ? [sim.boss.def.id, sim.boss.defeated ? 1 : 0, sim.boss.phase, ...sim.boss.parts.map(bp => Math.round(bp.hp)), ...sim.boss.parts.map(bp => bp.down ? 1 : 0)] : null, ov: sim.over ? 1 : 0 };
    // Over budget: drop the enemies furthest from every camera (plan 4.19).
    let s = JSON.stringify(snap);
    while (s.length > 1050 && snap.e.length) { snap.e.pop(); s = JSON.stringify(snap); }
    return snap;
  },

  // Each host step: the snapshot about 10 times a second, and the events in batches (reliable).
  hostSend(play, events, dt) {
    this.snapAt = (this.snapAt || 0) - dt;
    if (this.snapAt <= 0) {
      this.snapAt = 0.1;
      AIHub.send(this.snapshot(play), { reliable: false });
    }
    const keep = events.filter(e => !['flare', 'shot', 'miss', 'score', 'cover-in', 'cover-out', 'reload', 'switch', 'empty', 'aim'].includes(e.type));
    this.evQ.push(...keep);
    this.evT -= dt;
    if (this.evT <= 0 && this.evQ.length) {
      this.evT = 0.125;
      AIHub.send({ t: 'ev', e: this.evQ.slice(0, 60) }, { reliable: true });
      this.evQ = [];
    }
  },

  // Replica: apply the latest host snapshot to the replica Sim, with the enemies' rigs kept by id.
  applySnap(play, snap) {
    const sim = play.sim;
    sim.t = snap.at;
    sim.phase = this.PH[snap.ph] || sim.phase;
    if (snap.sc !== sim.sceneIdx) { sim.sceneIdx = snap.sc; sim.scene = sim.world.scenes[snap.sc]; }
    sim.base = snap.base;
    sim.timer = snap.tm / 10;
    sim.timeMax = snap.tmx;
    sim.over = !!snap.ov;
    const types = this.ETYPES();
    for (const row of snap.p) {
      const p = sim.players[row[0]];
      if (!p) continue;
      const mine = row[0] === this.me;
      p.score = row[1]; p.lives = row[2]; p.chain = row[3]; p.wpn = Math.max(0, row[4]); p.mag = row[5];
      p.pool = { mg: row[6], shotgun: row[7], gl: row[8] };
      if (!mine) p.c = row[9] / 100;
      p.out = !!row[12]; p.outT = row[13] / 10; p.x = row[14]; p.slotY = row[15];
      p.owned = { handgun: true, mg: !!(row[16] & 1), shotgun: !!(row[16] & 2), gl: !!(row[16] & 4) };
      p.stats = Object.assign(p.stats, { kills: row[17], hits: row[18], shots: row[19], headshots: row[20], saves: row[21], lost: row[22] });
      if (!mine) p.aim = [row[10] / 1000, row[11] / 1000];
    }
    // Enemies: keep the rig for each id; interpolate the position from the last to this snapshot.
    const byId = new Map(sim.enemies.map(e => [e.id, e]));
    const next = [];
    for (const row of snap.e) {
      const [id, ti, x, y, z, yaw, st, hp, alive, exposed, size] = row;
      let e = byId.get(id);
      const type = types[ti];
      if (!e) {
        const def = TC.get('enemy', type);
        e = { id, type, role: def.role, def, rig: new E.Humanoid(Object.assign({}, def.rig)), x, y, z, facing: yaw / 100, state: TC.ESTATE[st], hp: hp / 10, alive: !!alive, exposed: !!exposed, size: size / 10, gone: false, deathT: 0, hurtT: 0, nest: null };
        e.rig.facing = e.facing;
      } else {
        e.px = e.x; e.py = e.y; e.x = x; e.y = y; e.z = z; e.facing = yaw / 100; e.state = TC.ESTATE[st]; e.hp = hp / 10; e.alive = !!alive; e.exposed = !!exposed; e.size = size / 10;
      }
      next.push(e);
    }
    sim.enemies = next;
    if (snap.bo) {
      const def = TC.get('boss', snap.bo[0]);
      const root = [sim.base + def.root[0], 0, 0];
      const parts = def.parts.map((dp, i) => ({ id: dp.id, hp: snap.bo[3 + i], max: dp.hp || 0, weak: !!dp.weak, core: !!dp.core, decor: !!dp.decor, label: dp.label || '', down: !!snap.bo[3 + def.parts.length + i] }));
      sim.boss = { id: def.id, def, name: def.name, title: def.title, root, parts, defeated: !!snap.bo[1], phase: snap.bo[2], introT: 0, t: 0 };
    } else sim.boss = null;
    sim.projectiles = snap.pr.map(q => ({ id: q.at || q[0], kind: q[1] ? 'grenade' : 'gl', x: q[2], y: q[3], z: q[4], gone: false }));
    // Our reticle and cover are ours: they follow our own device at once.
    const me = sim.players[this.me];
    if (me && play.aims[this.me]) me.aim = play.aims[this.me];
  },

  // Host: the hub's time-up. The round is decided now, on the standings so far.
  onTimeUp() {
    if (this.host && this.play && !this.play.sim.over) this.finishRound(this.play.sim, false);
  },

  // A player left: their seat goes quiet (out of the fight) and the rest play on.
  onLeave(id, reason) {
    if (this.host && this.play) {
      const p = this.play.sim.players[id];
      if (p) { p.out = true; p.outT = 0; p.dead = true; }
    }
    void reason;
  },

  // The round ended: stop the sound and the input, and say why.
  onEnd(e) {
    this.ended = (e && e.reason) || 'finished';
    if (this.play && this.play.game) {
      this.play.game.audio.stopMusic(0.1);
      this.play.game.audio.mute(true);
      this.play.game.input.clear();
    }
  },

  // The host reports the round: standings, scores, the team result, and the awards (plan 4.19).
  finishRound(sim, won) {
    const rows = sim.players.map(p => ({ id: p.id, score: p.score, kills: p.stats.kills, acc: p.stats.shots ? p.stats.hits / p.stats.shots : 0, head: p.stats.headshots, saves: p.stats.saves, lost: p.stats.lost }));
    const standings = rows.slice().sort((a, b) => b.score - a.score).reduce((out, r) => {
      const last = out[out.length - 1];
      if (last && last.score === r.score) last.ids.push(r.id); else out.push({ score: r.score, ids: [r.id] });
      return out;
    }, []).map(g => g.ids);
    const scores = {}; for (const r of rows) scores[r.id] = r.score;
    const stats = {}; for (const r of rows) stats[r.id] = { Kills: r.kills, Accuracy: Math.round(r.acc * 100) + '%', Headshots: r.head, 'Cover saves': r.saves, 'Lives lost': r.lost };
    const best = (k) => rows.slice().sort((a, b) => b[k] - a[k])[0];
    const awards = [];
    const sharp = rows.slice().sort((a, b) => b.acc - a.acc)[0];
    const point = best('kills'), wall = best('saves');
    if (sharp) awards.push({ id: sharp.id, title: 'Sharpshooter', detail: Math.round(sharp.acc * 100) + '% accuracy' });
    if (point) awards.push({ id: point.id, title: 'Pointman', detail: point.kills + ' kills' });
    if (wall) awards.push({ id: wall.id, title: 'Iron Wall', detail: wall.saves + ' cover saves' });
    this.finished = true;
    AIHub.finish({ standings, scores, won: !!won, stats, awards });
  },

};

// The replica's network events land here, in the presentation's own event handler.
TC.Play.prototype.netEvents = function (list) {
  this.netQ = (this.netQ || []).concat(list);
};

// The states of an enemy on the wire (a small table).
TC.ESTATE = ['hide', 'enter', 'aim', 'fire', 'flee', 'walk'];

// ---- src/50-main.js ----
// 50-main.js: the game object and the scene flow (plan 3.4, 4.14). One E.Game with the engine's standard pause menu,
// settings and controls; our scenes are title, menu, select, difficulty, briefing, play, results, gameover, records,
// about, howto, notice, attract. The AI Hub session (46-hub.js) is a separate entry when the hub opened the page.
//
// Flow: title -> menu -> ARCADE (1 -> 3, then the ending and initials) | CO-OP | STAGE SELECT | TRAINING | RECORDS |
// SETTINGS | ABOUT | HOW TO PLAY. A title or menu left idle 10 s runs the attract mode (53-attract in 45-attract.js).

TC.current = { play: null, arcade: null, mode: 'arcade', stage: 1, difficulty: 'Normal', carry: null, coop: false };

// Our settings, through the engine's settings (saved per game; shown in the Settings screen).
TC.defineSettings = function (game) {
  const D = [
    { key: 'difficulty', label: 'Difficulty (new runs)', type: 'select', value: 'Normal', options: ['Easy', 'Normal', 'Hard'], group: 'Game' },
    { key: 'aimAssist', label: 'Aim assist (pad)', type: 'select', value: 'Medium', options: ['Off', 'Low', 'Medium', 'High'], group: 'Controller' },
    { key: 'padSpeed', label: 'Aim speed (pad)', type: 'slider', value: 1, min: 0.5, max: 2, step: 0.1, group: 'Controller' },
    { key: 'coverMode', label: 'Cover control', type: 'select', value: 'Hold', options: ['Hold', 'Toggle'], group: 'Controller' },
    { key: 'autoFire', label: 'Hold to repeat (handgun)', type: 'toggle', value: true, group: 'Controller' },
    { key: 'reticle', label: 'Reticle', type: 'select', value: 'Cross', options: ['Cross', 'Ring', 'Dot'], group: 'Game' },
    { key: 'threatSize', label: 'Crisis rings', type: 'select', value: 'Normal', options: ['Normal', 'Large'], group: 'Game' },
    { key: 'subtitles', label: 'Subtitles', type: 'toggle', value: true, group: 'Game' },
    { key: 'wobble', label: 'Retro texture wobble', type: 'toggle', value: false, group: 'Game' },
  ];
  for (const sp of D) {
    try { game.settings.define(sp); } catch (e) { game.fail && game.fail('setting ' + sp.key, e); }
  }
  TC.settings = {};
};

// The records: the arcade's tables by mode, the training record and the intel bottles (E.store).
TC.records = function () {
  return { training: E.store ? E.store.get('training', null) : null, intel: E.store ? E.store.get('intel', []) : [] };
};

// Build the game and its scenes. Called once from the page.
TC.boot = function () {
  // In an AI Hub session the page has no pause, no corner menu and no full-screen button: the hub owns those.
  const hub = TC.inHub();
  const game = TC.game = new E.Game({
    canvas: 'screen', res: [426, 240], expand: true, bg: '#05070f', input: TC.PRESET,
    autoPause: !hub, corner: !hub, backGesture: !hub, fullscreen: hub ? false : 'tap', id: 'sublime-crisis-3',
    menu: hub ? false : {
      items: [
        ['How to play', () => game.go('howto', { from: 'play' }, { fade: 0 })],
        ['Dev mode', () => TC.Dev.openFrom(game)],
      ],
      controls: TC.CONTROL_NAMES,
      quit: 'title',
    },
    camera: { zoom: false },
  });
  TC.defineSettings(game);
  // Touch-only devices get no touch controls at all (TASK.md); the notice and the gear are the only things on screen.
  if (TC.touchOnly()) game.input.touchEnabled = false;
  TC.arcade = new E.Arcade(game, { id: 'sublime-crisis-3', lives: 0, hud: false, idle: 10, demo: 28, scores: 6 });
  TC.defineSounds(game);
  return game;
};

// Touch-only devices: the touch controls stay off on every screen, whatever the scene turned on.
TC.noTouch = function (game) {
  if (TC.touchOnly() && game.input.touchEnabled) game.input.touchEnabled = false;
};

// True when the page was opened by the AI Hub (a session): the game then plays the round, with no title.
TC.inHub = function () {
  return typeof AIHub !== 'undefined' && !!AIHub.active;
};

// The scenes. Each is { enter(data), exit(), update(dt), draw(r), back(), pausable, camera, touch }.
TC.scenes = function (game) {
  const S = {};
  const menuItems = ['ARCADE', 'CO-OP', 'STAGE SELECT', 'TRAINING', 'RECORDS', 'SETTINGS', 'ABOUT', 'HOW TO PLAY'];
  const menuDesc = [
    'Three stages, every cutscene, the ending. One player.',
    'Two players on one screen. Pad 2 presses Start to join.',
    'Any stage, any difficulty. Every stage is open.',
    'Three drills: targets, cover and reload, the specials.',
    'High scores, the best training time, the intel you found.',
    'Difficulty, aim, cover, reticle, subtitles, controls.',
    'Credits, source information, the feedback sections.',
    'Device-aware: your controls, as this device labels them.',
  ];

  // The touch-only notice: no touch controls, a settings button, and the attract mode runs as normal.
  const noticeUp = () => TC.touchOnly() && !TC.keyUnlocked;
  // The gear, bottom left on the notice: a tap opens the settings.
  const gearAt = (r) => ({ x0: 4, y0: r.H - 36, x1: 44, y1: r.H - 6 });
  const tapped = (r, box) => {
    const c = game.input.clicked && game.input.clicked();
    return !!c && c[0] >= box.x0 && c[0] <= box.x1 && c[1] >= box.y0 && c[1] <= box.y1;
  };

  S.title = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.idle = 0; this.t = 0;
      // A touch-only device gets no touch controls on any screen (TASK.md).
      if (TC.touchOnly()) game.input.touchEnabled = false;
      TC.Attract.startDemo(game, this, 'title');
      game.audio.music(TC.get('song', 'title'));
    },
    update(dt) {
      this.t += dt;
      TC.noTouch(game);
      TC.Attract.updateTitle(game, this, dt);
      if (noticeUp() && tapped(null, gearAt({ H: game.screen.H }))) { game.menu('settings'); return; }
      if (game.input.anyPressed && game.input.anyPressed()) {
        if (game.input.lastDevice !== 'touch') TC.keyUnlocked = true;
        if (noticeUp()) return;
        TC.sfx(game, 'pick');
        game.go('menu', null, { fade: 0.2 });
      }
    },
    draw(r) {
      TC.Attract.drawDemo(game, this, r);
      r.overlay(g => {
        TC.panel(g, 0, 0, 0, 0);
        TC.drawLogo(g, r.W, this.t);
        if (noticeUp()) {
          TC.text(g, 'Controller or keyboard required', r.W / 2, r.H - 60, TC.PALETTE.warn, { align: 'center', scale: 2 });
          TC.text(g, 'Use the gear to change settings.', r.W / 2, r.H - 40, TC.PALETTE.dim, { align: 'center', scale: 1 });
        } else {
          const lab = TC.labelFor({ input: game.input }, 'confirm') || 'ENTER';
          if (Math.floor(this.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + (lab === '✕' ? '✕' : lab.toUpperCase()), r.W / 2, r.H - 36, '#ffffff', { align: 'center', scale: 2 });
        }
        TC.text(g, E.versionLabel ? E.versionLabel() : 'v0.85.2', r.W - 4, r.H - 8, '#5a6a8a', { align: 'right', scale: 1 });
        if (noticeUp()) {
          const gb = gearAt(r);
          g.fillStyle = '#10244a'; g.fillRect(gb.x0, gb.y0, gb.x1 - gb.x0, gb.y1 - gb.y0);
          g.fillStyle = TC.PALETTE.gold; g.fillRect(gb.x0 + 12, gb.y0 + 8, 20, 4); g.fillRect(gb.x0 + 12, gb.y0 + 15, 20, 4); g.fillRect(gb.x0 + 12, gb.y0 + 22, 20, 4);
          TC.text(g, 'SETTINGS', gb.x1 + 6, gb.y0 + 10, TC.PALETTE.gold, { scale: 1 });
        }
      });
    },
  };

  S.menu = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.idle = 0; this.t = 0;
      this.menu = new E.Menu(game, menuItems, {
        onPick: (i, item) => this.pick(i),
        onCancel: () => game.go('title', null, { fade: 0.2 }),
      });
      this.menu.title = null;
      TC.sfx(game, 'pick');
      TC.Attract.startDemo(game, this, 'menu');
      game.audio.music(TC.get('song', 'title'));
    },
    pick(i) {
      TC.sfx(game, 'pick');
      switch (i) {
        case 0: TC.current = Object.assign({}, TC.current, { mode: 'arcade', coop: false, stage: 1, carry: null }); game.go('difficulty', { next: 'briefing' }); break;
        case 1: TC.current = Object.assign({}, TC.current, { mode: 'coop', coop: true, stage: 1, carry: null }); game.go('difficulty', { next: 'briefing' }); break;
        case 2: game.go('select'); break;
        case 3: TC.current = Object.assign({}, TC.current, { mode: 'range', coop: false, stage: 'range', carry: null }); game.go('briefing', { stage: 'range' }); break;
        case 4: game.go('records'); break;
        case 5: game.menu('settings'); break;
        case 6: game.go('about'); break;
        case 7: game.go('howto'); break;
      }
    },
    update(dt) {
      this.t += dt;
      TC.noTouch(game);
      TC.Attract.updateTitle(game, this, dt);
      this.menu.update(dt);
    },
    draw(r) {
      TC.Attract.drawDemo(game, this, r);
      r.overlay(g => {
        TC.drawLogo(g, r.W, this.t);
        TC.panel(g, r.W / 2 - 150, 92, 300, 136);
      });
      this.menu.draw(r);
      r.overlay(g => {
        const d = menuDesc[this.menu.i] || '';
        TC.text(g, d, r.W / 2, r.H - 26, TC.PALETTE.pale || '#f4f7ff', { align: 'center', scale: 1 });
      });
    },
  };

  S.difficulty = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.next = data && data.next;
      this.menu = new E.Menu(game, ['EASY', 'NORMAL', 'HARD'], {
        onPick: (i) => {
          const d = ['Easy', 'Normal', 'Hard'][i];
          game.settings.set('difficulty', d);
          TC.current.difficulty = d;
          TC.sfx(game, 'pick');
          if (TC.current.mode === 'coop') game.go('coop', null);
          else game.go('briefing', { stage: TC.current.stage || 1 });
        },
        onCancel: () => game.go('menu'),
      });
      this.menu.i = ['Easy', 'Normal', 'Hard'].indexOf(game.settings.difficulty || 'Normal');
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      r.overlay(g => {
        TC.panel(g, r.W / 2 - 90, 40, 180, 40);
        TC.text(g, 'DIFFICULTY', r.W / 2, 50, TC.PALETTE.gold, { align: 'center', scale: 2 });
      });
      this.menu.draw(r);
      r.overlay(g => {
        const desc = ['7 lives. Threats come slower.', '5 lives. The standard CREST run.', '3 lives. Tighter TIME, more threats.'][this.menu.i] || '';
        TC.text(g, desc, r.W / 2, r.H - 26, '#f4f7ff', { align: 'center', scale: 1 });
      });
    },
  };

  S.select = {
    camera: { zoom: false }, touch: [],
    enter() {
      const items = [
        { label: 'HARBOR LIGHTS' }, { label: 'STORM SIGNAL' }, { label: 'THE TIDEWALL' }, { label: 'CREST RANGE' },
      ];
      this.menu = new E.Menu(game, items, {
        onPick: (i) => {
          TC.sfx(game, 'pick');
          TC.current = Object.assign({}, TC.current, { mode: 'stage', coop: false, carry: null });
          if (i === 3) { TC.current.mode = 'range'; TC.current.stage = 'range'; game.go('difficulty', { next: 'briefing' }); return; }
          TC.current.stage = i + 1;
          game.go('difficulty', { next: 'briefing' });
        },
        onCancel: () => game.go('menu'),
      });
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      r.overlay(g => {
        TC.panel(g, r.W / 2 - 140, 30, 280, 36);
        TC.text(g, 'STAGE SELECT', r.W / 2, 42, TC.PALETTE.gold, { align: 'center', scale: 2 });
      });
      this.menu.draw(r);
    },
  };

  S.briefing = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.stage = data && data.stage !== undefined ? data.stage : TC.current.stage;
      this.t = 0;
      this.brief = this.stage === 'range' ? TC.BRIEFS.range : TC.BRIEFS[this.stage];
      // Co-op: the second player joins with Start on a free pad, or 2 on the keyboard (the join line on the screen).
      if (TC.current.coop && game.allowJoin) game.allowJoin({ max: 2 });
    },
    update(dt) {
      this.t += dt;
      if (game.input.pressed('confirm') || game.input.pressed('fire') || game.input.pressed('cancel')) {
        if (game.input.pressed('cancel')) { game.go('menu'); return; }
        TC.sfx(game, 'pick');
        const cfg = { mode: TC.current.mode, stage: this.stage, difficulty: TC.current.difficulty, carry: TC.current.carry,
          intro: this.stage !== 'range', coop: !!TC.current.coop };
        game.go('play', { cfg }, { fade: 0.25 });
      }
    },
    draw(r) {
      r.overlay(g => {
        const b = this.brief || { title: '', lines: [] };
        TC.panel(g, 30, 30, r.W - 60, r.H - 60);
        TC.text(g, b.title, r.W / 2, 44, TC.PALETTE.gold, { align: 'center', scale: 3 });
        b.lines.forEach((ln, i) => TC.text(g, ln, r.W / 2, 96 + i * 22, TC.PALETTE.text, { align: 'center', scale: 2 }));
        if (TC.current.coop) TC.text(g, 'PLAYER 2: PRESS START ON A CONTROLLER', r.W / 2, r.H - 84, TC.PALETTE.gold, { align: 'center', scale: 2 });
        const lab = TC.labelFor({ input: game.input }, 'fire') || 'FIRE';
        if (Math.floor(this.t * 2) % 2 === 0) TC.text(g, 'PRESS ' + lab + ' TO DEPLOY', r.W / 2, r.H - 52, '#ffffff', { align: 'center', scale: 2 });
      });
    },
  };

  S.play = {
    camera: { zoom: false }, touch: [], pausable: true,
    enter(data) {
      const cfg = (data && data.cfg) || TC.current.cfg || {};
      let seats = cfg.seats;
      if (!seats) {
        seats = [{ input: game.input, name: 'P1', color: '#e8443a', agent: 'kai', mouse: true, local: true }];
        if (cfg.coop) {
          const p2 = game.players && game.players[1];
          if (p2) seats.push({ input: p2, name: 'P2', color: '#3b82f6', agent: 'mari', mouse: false, local: true });
        }
      }
      this.play = new TC.Play(game, Object.assign({}, cfg, { seats }));
      TC.current.play = this.play;
      TC.current.cfg = cfg;
      this.play.intro();
      game.audio.music(TC.get('song', this.play.sim.stage.music || 'harbor'));
    },
    update(dt) {
      const p = this.play;
      if (!p) return;
      if (TC.Dev.active()) { TC.Dev.update(dt); return; }
      p.update(dt);
      if (p.over) this.route(p.endResult);
    },
    route(result) {
      const cfg = TC.current.cfg || {};
      if (cfg.mode === 'range') { game.go('results', { result, range: true }); return; }
      TC.current.carry = this.play.sim.carryOut();
      if (result.won) {
        if (this.play.sim.stageId === 3 || this.play.sim.stageId === 'range') game.go('results', { result, last: true });
        else game.go('results', { result, next: true });
      } else {
        game.go('gameover', { result });
      }
      this.play = null;
    },
    draw(r) {
      if (this.play) this.play.draw(r);
      if (TC.Dev.active()) TC.Dev.draw(r);
    },
    back() { return false; },
  };

  S.results = {
    camera: { zoom: false }, touch: [],
    enter(data) {
      this.result = data.result; this.next = data.next; this.last = data.last; this.range = data.range;
      this.t = 0;
      if (this.result.won) TC.sfx(game, 'clear');
      game.audio.music(TC.get('song', 'results'));
    },
    update(dt) {
      this.t += dt;
      if (this.t > 1 && (game.input.pressed('confirm') || game.input.pressed('fire'))) {
        if (this.next) {
          TC.current.stage = Number(this.result.stage) + 1;
          game.go('briefing', { stage: TC.current.stage });
        } else if (this.last) {
          game.go('ending', { result: this.result });
        } else {
          TC.Arcade.enterOrRecords(game, this.result, this);
        }
      }
    },
    draw(r) {
      const res = this.result;
      r.overlay(g => {
        TC.panel(g, 20, 14, r.W - 40, r.H - 28);
        const head = res.won ? 'STAGE CLEAR' : 'GAME OVER';
        TC.text(g, head, r.W / 2, 22, res.won ? TC.PALETTE.gold : TC.PALETTE.warn, { align: 'center', scale: 3 });
        const rows = TC.resultRows(res);
        rows.forEach((row, i) => {
          const x = 40 + i * 180;
          const k = Math.min(1, this.t * 0.8);
          TC.text(g, row.name, x, 60, TC.PALETTE.text, { scale: 2 });
          TC.text(g, 'RANK ' + row.rank, x, 82, TC.PALETTE.gold, { scale: 2 });
          const stats = [['SCORE', TC.fmt(row.score * k)], ['ACCURACY', row.acc + '%'], ['KILLS', String(TC.countUp(row.kills, k))],
            ['HEADSHOTS', String(TC.countUp(row.headshots, k))], ['COVER SAVES', String(TC.countUp(row.saves, k))],
            ['LIVES LOST', String(row.lost)], ['BEST CHAIN', String(row.bestChain)], ['TOTAL', TC.fmt(row.total * k)]];
          stats.forEach(([label, v], j) => {
            TC.text(g, label, x, 110 + j * 14, TC.PALETTE.dim, { scale: 1 });
            TC.text(g, v, x + 110, 110 + j * 14, TC.PALETTE.text, { scale: 1 });
          });
        });
        if (this.t > 1) {
          const lab = TC.labelFor({ input: game.input }, 'fire') || 'FIRE';
          TC.text(g, this.next ? 'PRESS ' + lab + ' FOR THE NEXT STAGE' : 'PRESS ' + lab, r.W / 2, r.H - 26, '#ffffff', { align: 'center', scale: 1 });
        }
      });
    },
  };

  S.gameover = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.result = data.result; this.t = 0; TC.sfx(game, 'gameover'); this.entering = false; },
    update(dt) {
      this.t += dt;
      if (this.t > 2 && !this.entering && (game.input.pressed('confirm') || game.input.pressed('fire'))) {
        TC.Arcade.enterOrRecords(game, this.result, this);
      }
    },
    draw(r) {
      r.overlay(g => {
        TC.text(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, TC.PALETTE.warn, { align: 'center', scale: 4 });
        TC.text(g, 'SCORE ' + TC.fmt(this.result.rows[0].score), r.W / 2, r.H / 2 + 10, '#ffffff', { align: 'center', scale: 2 });
      });
    },
  };

  S.records = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.page = 0;
      this.menu = new E.Menu(game, ['ARCADE', 'CO-OP', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'TRAINING', 'INTEL', 'BACK'], {
        onPick: (i) => { if (i === 7) game.go('menu'); else this.page = i; },
        onCancel: () => game.go('menu'),
      });
      this.menu.x = 'left';
    },
    update(dt) { this.menu.update(dt); },
    draw(r) {
      const modes = ['arcade', 'coop', 'stage1', 'stage2', 'stage3'];
      r.overlay(g => {
        TC.panel(g, 130, 10, r.W - 140, r.H - 20);
        TC.text(g, 'RECORDS', r.W / 2 + 40, 16, TC.PALETTE.gold, { align: 'center', scale: 2 });
        if (this.page < 5) {
          const mode = modes[this.page];
          if (TC.arcade && TC.arcade.drawTable) TC.arcade.drawTable(r, mode, 34, mode.toUpperCase());
        } else if (this.page === 5) {
          const rec = TC.records().training;
          TC.text(g, 'BEST TRAINING TIME', r.W / 2 + 40, 60, TC.PALETTE.text, { align: 'center', scale: 2 });
          TC.text(g, rec ? rec.toFixed(1) + ' S' : 'NOT YET', r.W / 2 + 40, 84, TC.PALETTE.gold, { align: 'center', scale: 3 });
        } else {
          const list = TC.records().intel;
          TC.text(g, 'INTEL: ' + list.length + ' OF ' + TC.intelTotal(), r.W / 2 + 40, 40, TC.PALETTE.text, { align: 'center', scale: 2 });
          list.slice(0, 5).forEach((t, i) => TC.text(g, '- ' + t.slice(0, 60), 150, 70 + i * 16, '#cfe4ff', { scale: 1 }));
        }
      });
      this.menu.draw(r);
    },
  };

  S.about = {
    camera: { zoom: false }, touch: [],
    enter() { this.page = 0; this.pages = TC.aboutPages(); this.t = 0; },
    update(dt) {
      this.t += dt;
      const i = game.input;
      if (i.pressed('right') || i.pressed('confirm')) this.page = (this.page + 1) % this.pages.length;
      if (i.pressed('left')) this.page = (this.page + this.pages.length - 1) % this.pages.length;
      if (i.pressed('cancel')) game.go('menu');
    },
    draw(r) {
      const pg = this.pages[this.page];
      r.overlay(g => {
        TC.panel(g, 14, 12, r.W - 28, r.H - 24);
        TC.text(g, pg.title, r.W / 2, 22, TC.PALETTE.gold, { align: 'center', scale: 2 });
        let y = 52;
        for (const ln of pg.lines) {
          for (const row of TC.wrap(ln, r.W - 60, 1)) { TC.text(g, row, 30, y, TC.PALETTE.text, { scale: 1 }); y += 11; }
          y += 3;
        }
        TC.text(g, (this.page + 1) + ' / ' + this.pages.length + '   LEFT / RIGHT TO TURN   ESC TO LEAVE', r.W / 2, r.H - 22, TC.PALETTE.dim, { align: 'center', scale: 1 });
      });
    },
  };

  S.howto = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.from = data && data.from; this.t = 0; },
    update(dt) {
      this.t += dt;
      if (game.input.pressed('cancel') || game.input.pressed('confirm')) { if (this.from === 'play') game.resume(); else game.go('menu'); }
    },
    draw(r) {
      const rows = TC.howtoLines({ input: game.input });
      r.overlay(g => {
        TC.panel(g, 30, 16, r.W - 60, r.H - 32);
        TC.text(g, 'HOW TO PLAY', r.W / 2, 26, TC.PALETTE.gold, { align: 'center', scale: 2 });
        rows.forEach(([a, b], i) => {
          TC.text(g, a, 52, 62 + i * 22, TC.PALETTE.text, { scale: 2 });
          TC.text(g, b, 52, 74 + i * 22, TC.PALETTE.dim, { scale: 1 });
        });
        TC.text(g, 'Duck, pop, shoot. Cover is safe, but TIME runs out.', r.W / 2, r.H - 22, TC.PALETTE.gold, { align: 'center', scale: 1 });
      });
    },
  };

  S.attract = {
    camera: { zoom: false }, touch: [],
    enter() { TC.Attract.enter(game, this); },
    update(dt) { TC.noTouch(game); TC.Attract.updateAttract(game, this, dt); },
    draw(r) { TC.Attract.drawAttract(game, this, r); },
  };

  S.ending = {
    camera: { zoom: false }, touch: [],
    enter(data) { this.result = data.result; this.t = 0; game.audio.music(TC.get('song', 'dawn')); },
    update(dt) { this.t += dt; if (this.t > 6 && (game.input.pressed('confirm') || game.input.pressed('fire'))) TC.Arcade.enterOrRecords(game, this.result, this); },
    draw(r) {
      r.overlay(g => {
        const lines = ['THE TIDEWALL HOLDS', '', 'Agents Kai and Mari closed the sluice.', 'Admiral Krake was last seen on the causeway.', '', 'Thanks for playing Sublime Crisis 3.'];
        lines.forEach((ln, i) => TC.text(g, ln, r.W / 2, r.H - 40 - this.t * 12 + i * 14, '#f4f7ff', { align: 'center', scale: 2 }));
      });
    },
  };

  // The AI Hub session: the game's own card, then the round. Not pausable: the hub starts and ends rounds.
  S.session = {
    camera: { zoom: false }, touch: [],
    enter() {
      this.t = 0;
      if (!TC.Hub.info) { game.go('title'); return; }
      game.audio.music(TC.get('song', 'harbor'));
      AIHub.ready();
    },
    update(dt) {
      this.t += dt;
      if (!TC.Hub.info) return;
      TC.Hub.cardInput(game);
      if (TC.Hub.started && !this.went) {
        this.went = true;
        const info = TC.Hub.info;
        const role = TC.Hub.server ? 'server' : TC.Hub.host ? 'host' : 'replica';
        const cfg = { hub: true, role, mode: 'shared', stage: TC.Hub.stage, difficulty: 'Normal', intro: false, seats: TC.Hub.seats(game), viewer: TC.Hub.me, cheats: {} };
        void info;
        game.go('hubplay', { cfg }, { fade: 0 });
      }
    },
    draw(r) { TC.Hub.drawCard(game, r, this.t); },
  };
  S.hubplay = Object.assign({}, S.play, { pausable: false });
  return S;
};

// The shared intel total: the bottles in the stages and the range.
TC.intelTotal = function () {
  let n = 0;
  for (const st of Object.values(TC.registry.stage)) for (const sc of st.scenes) n += (sc.bonus || []).filter(b => b.kind === 'bottle').length;
  return n;
};

// Words wrapped to a width in pixels at the font's scale.
TC.wrap = function (s, maxW, scale) {
  if (E.font && E.font.wrap) return E.font.wrap(s, maxW, { scale: scale || 1 });
  return [s];
};

// Start the game (the page's entry point).
TC.start = function () {
  const game = TC.boot();
  const scenes = TC.scenes(game);
  const hub = TC.inHub();
  const steps = [['Painting the harbor', () => {}], ['Mixing the lanterns', () => {}]];
  if (hub) steps.push(['Joining the round', async () => { TC.Hub.info = await TC.Hub.connect(); }]);
  game.start({
    scenes, scene: hub ? 'session' : 'title',
    boot: { title: 'SUBLIME CRISIS 3', steps },
  });
  return game;
};

// ---- src/52-devview.js ----
// 52-devview.js: the dev view overlays (plan 4.16, VIEW tab): hit volumes, the colliders (the solid boxes), the AI state of
// each enemy, and the threat timers. Each is a toggle in TC.tune.view; all are off by default. Drawn in screen space over
// each viewport, projected with that viewport's camera. They never change the sim.
TC.drawDevView = function (play, g, vp, ras, cam) {
  const v = TC.tune.view;
  if (v.perf && vp.i === 0) {
    const ms = play.frameMs || 0;
    const lines = ['FRAME ' + ms.toFixed(1) + ' MS (' + (ms > 0 ? Math.round(1000 / ms) : 0) + ' FPS)', 'ENEMIES ' + play.sim.enemies.length, 'THREATS ' + play.sim.threats.length, 'BOXES ' + play.world.boxes.length, 'PROJECTILES ' + play.sim.projectiles.length];
    lines.forEach((ln, i) => TC.text(g, ln, vp.x + 4, vp.y + 88 + i * 8, '#9fffb0', { scale: 1 }));
  }
  if (!v.hitVolumes && !v.colliders && !v.aiLabels && !v.threatDebug) return;
  const x0 = vp.x, y0 = vp.y;
  const box = (b, color) => {
    const pts = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) {
      const p = ras.project([x, y, z]);
      if (p) pts.push(p);
    }
    if (pts.length < 2) return;
    const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
    const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
    g.strokeStyle = color; g.lineWidth = 1; g.globalAlpha = 0.9;
    g.strokeRect(Math.round(x0 + minX) + 0.5, Math.round(y0 + minY) + 0.5, Math.max(1, Math.round(maxX - minX)), Math.max(1, Math.round(maxY - minY)));
    g.globalAlpha = 1;
  };
  if (v.colliders) for (const b of play.world.boxes) if (b.solid && !b.gone) box(b.b, '#3aff7a');
  for (const e of play.sim.enemies) {
    if (!e.alive && !e.gone) continue;
    if (v.hitVolumes && e.alive) for (const hv of play.sim.hitVolumes(e)) box(hv.b, e.exposed ? '#ff5a5a' : '#7a7a9a');
    const p = ras.project([e.x, e.y, 30 * (e.size || 1)]);
    if (!p) continue;
    if (v.aiLabels) TC.text(g, (e.state || '') + ' ' + (e.hp != null ? e.hp.toFixed(1) : ''), x0 + p[0], y0 + p[1] - 6, '#ffe9a0', { align: 'center', scale: 1 });
  }
  if (v.threatDebug) {
    let row = 0;
    for (const th of play.sim.threats) {
      if (th.resolved) continue;
      TC.text(g, 'T' + th.id + ' ' + th.kind + ' -> P' + (th.target + 1) + ' in ' + Math.max(0, th.impactAt - play.sim.t).toFixed(2) + 's', x0 + 4, y0 + 56 + row * 8, '#ff9ac2', { scale: 1 });
      row++;
    }
  }
  void cam;
};

// ---- src/90-entry.js ----
// 90-entry.js: the page's entry. In a browser the game starts here (the boot screen, then the title). Under Node (the
// tests) nothing starts: the tests build a Sim and step it with the engine's headless clock.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  TC.game = TC.start();
}

globalThis.TC = TC;
})();
