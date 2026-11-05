(() => {
'use strict';
/* ---- 00-core.js ---- */
/* MASH TV — 00-core: the engine handle, the MT namespace, the tuning registry, the arena's geometry and the run state.
 * Every file in src/ is a fragment of one IIFE (tools/build.mjs concatenates them in name order). */
const E = My3D2dge, { px, clamp, lerp, TAU } = E;
const MT = { NAME: 'MASH TV', MODEL: 'claude-haiku-5-5-medium', STAMP: '20261104-050305', BUILD: '' };
globalThis.MT = MT;
MT.ABOUT = {
  "sourceInformation": {
    "date": "2026-11-04 05:03:05",
    "source": "Smash TV (Williams Electronics arcade game, 1990)",
    "plan": "PLAN.md",
    "genre": "Twin-stick arena shooter (arcade), 1-4 players local co-op",
    "perspective": "Fixed three-quarter studio camera; overhead option in Settings",
    "tech": "my-3D2dge engine v0.85.2 (github.com/michaelcrosato/my-3d2dge, dist/handoff, patched: P1 HOOKS export, P3 arcade initials and continue for every player, P4 audio bus getter); Node v24.22.1; Playwright 1.63.0 for checks; single HTML, no libraries",
    "artDirection": "Retro-future TV studio: neon, chrome, marquee bulbs, sponsor logos, confetti; engine's PS1 look with HD humanoid rigs and custom painters",
    "animation": "Engine rigs (Humanoid, Blob) with poses and moves; custom painters for disco ball, dolly tank, cable snake and bosses",
    "audio": "All music, sound effects and voices synthesized in code (engine chip synth and notation; Animalese-style formant voices); no audio files",
    "online": "AI Hub Session Protocol v1, client aihub-session 1.4.0 (vendor/hub/session.js, pasted unmodified as the first script in head), mode shared-world, 1-4 players; the Lightning Round: rooms L1, L2, L3 and Mashy, host-run, with snapshots at 15 a second; local co-op 1-4 players",
    "testing": "Headless suites (npm test: core, input, contestant, weapons, economy, ratings, enemies, rooms, room-sweep, bosses, playthrough, ui, dev, attract, touch, audio, proof); AI Hub harness (vendor/hub/harness.html) passed for 2 players, 4 players with 150 ms latency, 5% loss and jitter, host leaving, and a server copy; browser checks in headless Chromium with real key presses",
    "research": "Engine docs read: API.md, AI_GUIDE.md (standard features, frame order, testing), API-INDEX.md, kits/arcade.js, my-3d2dge.js source for the input, join, arcade and audio APIs. Smash TV written from general knowledge; no web research on the source.",
    "environment": "Claude Code CLI (headless); Linux (WSL2); browser unknown",
    "model": "Anthropic, claude-haiku-5-5, reasoning effort medium",
    "usage": "unknown"
  },
  "testingFeedback": [
    "About 10 real game problems were found and fixed by the checks and the bot runs: walkers spawned from doors that never came in (a room that could not clear); a separation push that could take a walker through a wall; Lance's TV wall placed above the arena, so its shots never landed; the Green Room never started; the continue countdown never ticked; the attract scene was never registered; a menu that ran off the bottom of the title; the About screen was empty; a missing audio track warned every time prime time began; and enemy randomness that was not seeded. Several more were test-side (stale worlds between checks, a bot aiming at the body instead of the arms).",
    "Five of those would have stopped play: the walkers (a room never clears), the Lance wall (the fight cannot end), the continue countdown (the run hangs at the continue), the Green Room (the bonus never starts) and the attract mode (it cannot be reached).",
    "The most helpful test was the bot playthrough of the whole left path through all three episodes, plus the boss and Green Room runs. It exercised the whole flow and found the stalls that per-function checks missed.",
    "The least helpful test was the touch check, which only sets globals and reads one function, and the room sweep with god-mode bots, which shows that a room can be cleared but says nothing about whether it is fair."
  ],
  "engineFeedback": [
    "The arcade module (scores, initials, continue, the attract clock) and the input presets: they gave the run its frame for free once the patches were in. The scene and script system (game.script with until and any) made the whole run one readable flow.",
    "Yes. Arrows aiming while menus need them meant a hook into the input step that the engine did not export (patch P1). The arcade entry and continue read only player one (patch P3). The engine's audio.layer warns instead of returning quietly when a song lacks the track (I guarded the call). I also had to learn the overlay units (buffer pixels, about a third of a 1080p screen) by trial, and guessed the lobby's join behaviour from the source.",
    "The room runner (waves, doors, exits, keys and the hazards), the enemy archetypes and the boss framework, the PlayStation and Xbox glyph icons (the 5x7 font has no button symbols), the reaction table, and the Animalese voices. The engine gave the drawing, rigs and loop; the game logic is mine.",
    "The overlay units, which are buffer pixels, and the lack of a headless draw test: the drawing code can only be checked in a browser or by eye, while the rest is tested in a VM.",
    "Patches P1, P3 and P4, listed in engine/PATCHES.md. Each one exists because the engine kept a value private or read only player one.",
    "Export the input hook and the arcade's per-player input as defaults (so no patch is needed), and make audio.layer return quietly for a missing track."
  ],
  "promptFeedback": [
    "The room data (the wave tables, the map and the rules per room) is detailed enough to build from directly, and the exit-interview shape is clear.",
    "The size of the plan against one session: 18 rooms, 3 bosses, netcode and the AI Hub harness, 16 test suites and the browser checks. It was not clear which parts were required for this build and which were stretch goals, or whether the AI Hub integration is a must.",
    "The AI Hub shared-world netcode (snapshots, claims, host authority, the hub harness) was the hardest part to scope, and I did not build it. The test suites across all of them, in one session, were the next hardest.",
    "Split the plan into a first playable milestone (one episode, local co-op, the front end and the tests) and stretch milestones (episodes two and three, the Green Room, the AI Hub). Say which of the 16 suites are required for a first delivery."
  ],
  "aiHub": {
    "name": "MASH TV",
    "tagline": "Mash 'em! Cash 'em! Survive the show.",
    "description": "A 1-4 player twin-stick arena shooter inside the deadliest game show on TV: blast through studio rooms of goons and robots, grab cash and absurd prizes, keep the ratings up and survive to the Season Finale.",
    "type": "Game",
    "genre": "Shooter",
    "source": "Smash TV",
    "series": "",
    "players": "1–4",
    "controls": "WASD/left stick move · mouse/right stick aim & fire · Space/L2 slide · E/R1 Showstopper · Q/L1 Showboat",
    "tags": [
      "arcade",
      "co-op",
      "top-down",
      "comedy",
      "boss fights"
    ]
  }
};
MT.VERSION = 'v1.0 · ' + MT.MODEL;

/* ---------- tuning: every balance number is MT.T[key]; MT.TDEF holds the defaults (EXPORT TUNING pastes into it) ---------- */
MT.TDEF = { playerSpeed: 95, fireRate: 9, bulletSpeed: 330, dmgMul: 1, slideSpeed: 235, slideCooldown: .85, invulnTime: 1.2,
  hpPerLife: 0, startLives: 0, puDuration: 1, enemySpeed: 1, enemyHp: 1, enemyBulletSpeed: 1, contactDmg: 1, waveSize: 1,
  spawnGap: 1, bossHp: 1, dropMul: 1, cashMul: 1, ratingsGain: 1, ratingsDecay: 2.5, primeTime: 12, camZoom: 1, shakeMul: 1,
  timeScale: 1 };
// [key, label, group, min, max, step]
MT.TLIST = [
  ['playerSpeed', 'Player speed', 'PLAYER', 50, 160, 5], ['fireRate', 'Blaster shots a second', 'PLAYER', 3, 20, 1],
  ['bulletSpeed', 'Player bullet speed', 'PLAYER', 150, 600, 10], ['dmgMul', 'Player damage x', 'PLAYER', .25, 4, .25],
  ['slideSpeed', 'Slide speed', 'PLAYER', 120, 400, 5], ['slideCooldown', 'Slide cooldown (s)', 'PLAYER', .2, 3, .05],
  ['invulnTime', 'Invulnerable after a hit (s)', 'PLAYER', .2, 3, .1], ['hpPerLife', 'HP per life (0 = difficulty)', 'PLAYER', 0, 9, 1],
  ['startLives', 'Starting lives (0 = difficulty)', 'PLAYER', 0, 9, 1], ['puDuration', 'Power-up duration x', 'PLAYER', .25, 3, .25],
  ['enemySpeed', 'Enemy speed x', 'ENEMIES', .25, 2.5, .05], ['enemyHp', 'Enemy HP x', 'ENEMIES', .25, 4, .25],
  ['enemyBulletSpeed', 'Enemy bullet speed x', 'ENEMIES', .25, 2.5, .05], ['contactDmg', 'Contact damage', 'ENEMIES', 0, 3, 1],
  ['waveSize', 'Wave size x', 'ENEMIES', .25, 3, .05], ['spawnGap', 'Spawn gap x', 'ENEMIES', .25, 3, .05],
  ['bossHp', 'Boss HP x', 'ENEMIES', .1, 4, .1], ['dropMul', 'Drop chance x', 'ECONOMY', 0, 5, .25],
  ['cashMul', 'Cash x', 'ECONOMY', .25, 5, .25], ['ratingsGain', 'Ratings gain x', 'SHOW', 0, 5, .25],
  ['ratingsDecay', 'Ratings decay per second', 'SHOW', 0, 10, .5], ['primeTime', 'Prime Time length (s)', 'SHOW', 3, 30, 1],
  ['camZoom', 'Camera zoom x', 'CAMERA & TIME', .6, 1.6, .05], ['shakeMul', 'Screen shake x', 'CAMERA & TIME', 0, 2, .1],
  ['timeScale', 'Game speed', 'CAMERA & TIME', .1, 3, .05]];
MT.T = Object.assign({}, MT.TDEF);
const TUNE_KEY = 'mashtv:tuning';
(function loadTunes() { const s = E.store.get(TUNE_KEY, null); if (s && typeof s === 'object') for (const k in MT.TDEF) if (typeof s[k] === 'number') MT.T[k] = s[k]; })();
MT.tune = k => MT.T[k];
MT.tuned = () => Object.keys(MT.TDEF).filter(k => MT.T[k] !== MT.TDEF[k]);
MT.setTune = (k, v) => { MT.T[k] = v; if (MT.run) MT.run.devTouched = true; const o = {}; for (const key of MT.tuned()) o[key] = MT.T[key]; E.store.set(TUNE_KEY, o); return v; };
MT.resetTunes = () => { Object.assign(MT.T, MT.TDEF); E.store.set(TUNE_KEY, {}); };
MT.exportTunes = () => JSON.stringify(Object.fromEntries(MT.tuned().map(k => [k, MT.T[k]])));

/* ---------- difficulty: HP and lives, enemy scaling (§5.1, §5.7) ---------- */
MT.DIFF = {
  rookie: { id: 'rookie', name: 'ROOKIE', hp: 5, lives: 5, enemySpeed: .85, bullet: .8, mul: .8, line: 'EASY MONEY, KID. A BIT TOO EASY.' },
  contestant: { id: 'contestant', name: 'CONTESTANT', hp: 3, lives: 3, enemySpeed: 1, bullet: 1, mul: 1, line: 'THE STANDARD SHOW. THE STANDARD DEATH.' },
  champion: { id: 'champion', name: 'CHAMPION', hp: 1, lives: 3, enemySpeed: 1.15, bullet: 1, mul: 1.2, line: 'ONE HIT AND YOU\'RE A COMMERCIAL BREAK.' }
};

/* ---------- the arena: one TileMap of 23 x 15 cells, 16 units each; interior cells 1..21 x 1..13 ---------- */
MT.ARENA = { W: 368, H: 240, X0: 16, X1: 352, Y0: 16, Y1: 224, cx: 184, cy: 120, CELL: 16 };
MT.DOORS = {   // door centre and the direction a walker leaves by
  N: { x: 184, y: 8, out: [0, -1], map: [[10, 0], [11, 0], [12, 0]] },
  S: { x: 184, y: 232, out: [0, 1], map: [[10, 14], [11, 14], [12, 14]] },
  W: { x: 8, y: 120, out: [-1, 0], map: [[0, 6], [0, 7], [0, 8]] },
  E: { x: 360, y: 120, out: [1, 0], map: [[22, 6], [22, 7], [22, 8]] }
};
MT.OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
MT.cellXY = (cx, cy) => [24 + cx * 16, 24 + cy * 16];   // room cell [cx, cy] (0..20, 0..12) to world units
MT.inArena = (x, y, pad = 0) => x >= MT.ARENA.X0 + pad && x <= MT.ARENA.X1 - pad && y >= MT.ARENA.Y0 + pad && y <= MT.ARENA.Y1 - pad;
MT.clampArena = (b, pad = 4) => { b.x = clamp(b.x, MT.ARENA.X0 + pad, MT.ARENA.X1 - pad); b.y = clamp(b.y, MT.ARENA.Y0 + pad, MT.ARENA.Y1 - pad); };
MT.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ---------- seeded streams: gameplay draws only from these; Math.random is for cosmetics ---------- */
MT.seedAll = (seed) => {
  MT.rng = { spawn: E.rng(seed * 7 + 1), drops: E.rng(seed * 13 + 2), ai: E.rng(seed * 17 + 3), fx: Math.random };
  MT.rngFn = s => { const r = E.rng(s); return r; };
};
MT.seedAll(7);
MT.pick = (arr, r = MT.rng.spawn) => arr[Math.floor(r() * arr.length) % arr.length];
MT.chance = (p, r = MT.rng.drops) => r() < p;
MT.rand = (a, b, r = MT.rng.spawn) => a + (b - a) * r();

/* ---------- the event bus: gameplay emits, the reaction table turns events into lines, crowd, sting and banners ---------- */
MT.listeners = [];
MT.on = fn => MT.listeners.push(fn);
MT.emit = (type, data = {}) => { for (const fn of MT.listeners) fn(type, data); };

/* ---------- run state (MT.run) ---------- */
MT.newRun = (o = {}) => ({
  mode: o.mode || 'arcade', diff: MT.DIFF[o.diff || 'contestant'], seed: o.seed || (Math.random() * 1e9 | 0) || 1,
  ep: o.ep || 1, roomId: null, path: [], keys: 0, keyList: new Set(), prizesTaken: new Set(), prizeDeck: {},
  players: [], ratings: { R: 30, primeCD: 0, primeT: 0, stuntUsed: {}, lowT: 0, decayT: 0, lastGain: 0 },
  devTouched: false, cheats: {}, startedAt: 0, won: false, log: [], roomsCleared: 0, rounds: 0, time: 0
});
MT.run = null;
MT.eidSeq = 0;   // enemy ids (the host's ids go on the wire)
MT.slots = [
  { n: 1, name: 'ROCKET', color: '#e8443a', look: 0 }, { n: 2, name: 'VOLT', color: '#3b82f6', look: 1 },
  { n: 3, name: 'MOXIE', color: '#22c55e', look: 2 }, { n: 4, name: 'GOLDIE', color: '#f5b700', look: 3 }];
MT.GLOW = { red: '#ff3344', gold: '#ffcc33', magenta: '#ff2e88', cyan: '#2ee6ff', chrome: '#c8d0e0', shadow: '#140a24' };

/* ---- 01-input.js ---- */
/* MASH TV — 01-input: the two presets (menus and play), the preset-sync hook (engine patch P1), how a contestant reads
 * its intent, the any-input clock for the attract mode, touch-only detection and the button glyphs (PlayStation and Xbox). */

// menus: arrows and WASD navigate, Enter/Space confirm, Esc/Backspace back, Q/E turn pages (L1/R1 on a pad)
MT.MASH_MENU = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], extra: ['KeyM', 'Pad3']
};
// play: WASD (or the left stick) moves, the arrows aim and fire in eight ways, the mouse aims and Left click fires
MT.MASH_PLAY = {
  up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
// the menu's names on the Controls screen
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, extra: false };

// Which preset every player should use right now: the menu's while the pause menu or one of our overlays is open
MT.overlays = [];   // open overlays (dev panel, episode map, how to play); each has .open
MT.wantPreset = game => {
  const sc = game.scene;
  if (game.paused || MT.overlays.some(o => o.open) || (MT.NET && MT.netOverlay && MT.netOverlay.open) || MT.PLAY.mapOverlay || MT.PLAY.howOverlay || !sc || sc.mtPreset !== 'play') return 'menu';
  return 'play';
};
E.HOOKS.input.push((game) => {
  if (!game.players) return;
  const want = MT.wantPreset(game);
  for (const p of game.players) {
    if (p._mtPreset === want) continue;
    p.use(want === 'play' ? MT.MASH_PLAY : MT.MASH_MENU); p._mtPreset = want;
  }
});

// Any input on any device (the attract clock and the title's touch notice); DOM listeners are added by 99-main
MT.inputSerial = 0; MT.lastDevice = 'keyboard'; MT.keyedAt = 0;
MT.noteInput = (kind) => { MT.inputSerial++; if (kind) MT.lastDevice = kind; };
MT.pollPads = () => {   // a pad's button or a stick past .5 counts (the browser's pad list)
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
  let any = false;
  for (const p of pads) if (p) { if (p.buttons.some(b => b.pressed || b.value > .5) || p.axes.some(a => Math.abs(a) > .5)) any = true; }
  if (any) MT.noteInput('gamepad');
  return any;
};
MT.touchOnly = () => {
  if (typeof navigator === 'undefined' || !navigator.maxTouchPoints) return false;
  const fine = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches;
  return !fine && !MT.padConnected() && MT.inputSerial === 0 || (!fine && MT.lastDevice === 'touch' && !MT.padConnected());
};
MT.padConnected = () => { try { return typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean); } catch (e) { return false; } };

// How a contestant reads its intent each step (§4.3). Bots and remote players produce the same object.
MT.intentFrom = (I, c, game, world) => {
  const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, source: 'none' };
  const m = I.move(), mag = Math.min(1, Math.hypot(m[0], m[1]));
  if (mag > .05) { const d = game.view.screenDirToGround(m[0], m[1]), L = Math.hypot(d[0], d[1]) || 1; out.move = [d[0] / L * mag, d[1] / L * mag]; }
  const autoFire = game.settings.autoFire !== false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const d = game.view.screenDirToGround(I.padAim[0], I.padAim[1]);
    out.aim = Math.atan2(d[1], d[0]); out.fire = autoFire; out.source = 'stick';
  } else if (I.down('aimUp') || I.down('aimDown') || I.down('aimLeft') || I.down('aimRight')) {
    const sx = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), sy = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    const d = game.view.screenDirToGround(sx, sy); out.aim = Math.atan2(d[1], d[0]); out.fire = true; out.source = 'arrows';
  } else if (I.lastDevice === 'mouse' && I === game.input) {
    const g = game.mouseGround && game.mouseGround();
    if (g) out.aim = Math.atan2(g[1] - c.y, g[0] - c.x);
    out.fire = I.down('fire'); out.source = 'mouse';
  } else {
    out.fire = I.down('fire');
    out.aim = c.aim;
  }
  if (out.fire === false && I.down('fire') && out.aim !== null) out.fire = true;
  if (out.aim !== null && world && game.settings.aimAssist !== false && I.lastDevice === 'gamepad') {   // aim assist: pad only, within 170 and ±10°
    let best = null, bd = 170;
    for (const e of world.enemies) {
      if (!e.alive || e.kind === 'mime' && !e.counted) continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy); if (d > bd) continue;
      let da = Math.atan2(dy, dx) - out.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < .175) { best = { d, a: Math.atan2(dy, dx), da }; bd = d; }
    }
    if (best) out.aim = out.aim + best.da * .5;
  }
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
};

/* ---------- glyphs: PlayStation and Xbox icons drawn with E.px, keycaps, and the mouse ---------- */
MT.glyph = {
  // which family the setting asks for: PlayStation by default, Xbox (A B X Y) when the Settings option is picked
  family: game => (game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation'),
  // the pad button an action uses (standard mapping)
  padOf: { confirm: 'Pad0', cancel: 'Pad1', slide: 'Pad6', fire: 'Pad7', bomb: 'Pad5', showboat: 'Pad4', start: 'Pad9', pause: 'Pad9', reset: 'Pad3', extra: 'Pad3', tabL: 'Pad4', tabR: 'Pad5', move: 'stick', aim: 'stick' },
  // draws one icon; returns its width
  draw(g, x, y, action, input, o = {}) {
    const game = MT.G, s = o.scale || 1, dev = input ? input.lastDevice : 'keyboard';
    if (dev === 'gamepad') return this.pad(g, x, y, this.padOf[action] || 'Pad0', this.family(game), s, action);
    if (dev === 'mouse' && MT.mouseAction(input, action)) return this.mouse(g, x, y, MT.mouseAction(input, action), s);
    const label = input ? input.label(action) : '';
    return this.keycap(g, x, y, label || '?', s);
  },
  // a row of icons with labels: [[action, 'TEXT'], ...]
  prompt(g, x, y, pairs, input, o = {}) {
    let cx = x; const s = o.scale || 1;
    for (const [a, t] of pairs) {
      cx += this.draw(g, cx, y, a, input, { scale: s }) + 3 * s;
      cx += E.font.text(g, t, cx, y + 2 * s, o.color || '#fff7e8', { scale: s, shadow: '#000' }) + 8 * s;
    }
    return cx - x;
  },
  pad(g, x, y, code, fam, s, action) {   // 11 x 11 at scale 1
    const cx = x + 5 * s, cy = y + 5 * s, R = 5 * s;
    if (code === 'stick') { px.disc(g, cx, cy, R, '#2a2a33'); px.disc(g, cx, cy, R - 1 * s, '#7a7a88'); px.disc(g, cx, cy, 2 * s, '#e8e8f0'); return 11 * s; }
    if (code === 'Pad6' || code === 'Pad7' || code === 'Pad4' || code === 'Pad5') {   // shoulders and triggers: rounded tabs
      const lbl = { Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2' }[code], w = 15 * s, h = 9 * s;
      px.rect(g, x, y + 1 * s, w, h, '#2a2a33'); px.rect(g, x + s, y + 2 * s, w - 2 * s, h - 2 * s, '#c8cad8');
      const txt = fam === 'xbox' ? { Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT' }[code] : lbl;
      E.font.text(g, txt, x + (w - E.font.width(txt, { scale: s })) / 2, y + 2 * s, '#111', { scale: s }); return w + 2 * s;
    }
    if (code === 'Pad9') { px.rect(g, x, y + 2 * s, 11 * s, 6 * s, '#2a2a33'); px.rect(g, x + s, y + 3 * s, 9 * s, 4 * s, '#c8cad8'); return 13 * s; }
    if (code === 'Pad12' || code === 'Pad13' || code === 'Pad14' || code === 'Pad15') {
      px.rect(g, x + 4 * s, y, 3 * s, 11 * s, '#2a2a33'); px.rect(g, x, y + 4 * s, 11 * s, 3 * s, '#2a2a33');
      px.rect(g, x + 4 * s + s, y + s, s, 9 * s, '#c8cad8'); px.rect(g, x + s, y + 4 * s + s, 9 * s, s, '#c8cad8'); return 11 * s;
    }
    // face buttons: a dark disc with the family's symbol
    px.disc(g, cx, cy, R, '#15151c');
    if (fam === 'xbox') {
      const map = { Pad0: ['A', '#3ec45a'], Pad1: ['B', '#e0443a'], Pad2: ['X', '#3a8ae0'], Pad3: ['Y', '#f0c020'] }[code] || ['A', '#3ec45a'];
      px.disc(g, cx, cy, R - s, map[1]); const w = E.font.width(map[0], { scale: s }); E.font.text(g, map[0], cx - w / 2, cy - 3 * s, '#101010', { scale: s });
    } else {
      const k = { Pad0: ['x', '#7aa8ff'], Pad1: ['o', '#ff6a6a'], Pad2: ['s', '#ff8ad8'], Pad3: ['t', '#5fe0a0'] }[code] || ['x', '#7aa8ff'];
      this.symbol(g, cx, cy, k[0], k[1], s);
    }
    return 11 * s;
  },
  symbol(g, cx, cy, k, col, s) {   // ✕ ○ □ △ drawn in lines (the 5x7 font has none)
    const r = 3 * s;
    if (k === 'x') { px.line(g, cx - r, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy - r, cx - r, cy + r, col, s); }
    else if (k === 'o') { px.disc(g, cx, cy, r + s * .5, col); px.disc(g, cx, cy, r - s * .5, '#15151c'); }
    else if (k === 's') { px.line(g, cx - r, cy - r, cx + r, cy - r, col, s); px.line(g, cx + r, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy + r, cx - r, cy + r, col, s); px.line(g, cx - r, cy + r, cx - r, cy - r, col, s); }
    else { px.line(g, cx, cy - r, cx + r, cy + r, col, s); px.line(g, cx + r, cy + r, cx - r, cy + r, col, s); px.line(g, cx - r, cy + r, cx, cy - r, col, s); }
  },
  keycap(g, x, y, label, s) {
    const w = Math.max(11 * s, (E.font.width(label, { scale: s }) + 5 * s)), h = 11 * s;
    px.rect(g, x, y, w, h, '#2a2a33'); px.rect(g, x + s, y + s, w - 2 * s, h - 3 * s, '#e8e8f0');
    E.font.text(g, label, x + (w - E.font.width(label, { scale: s })) / 2, y + 2 * s, '#15151c', { scale: s });
    return w;
  },
  mouse(g, x, y, side, s) {
    const w = 8 * s, h = 11 * s; px.rect(g, x + 1 * s, y, w, h, '#2a2a33'); px.rect(g, x + 2 * s, y + s, w - 2 * s, h - 2 * s, '#c8cad8');
    px.rect(g, x + 2 * s, y + s, 2 * s, 4 * s, side === 'left' ? '#ffcc33' : '#7a7a88');
    px.rect(g, x + 5 * s, y + s, 2 * s, 4 * s, side === 'right' ? '#ffcc33' : '#7a7a88');
    return w + 2 * s;
  }
};
// mouse actions: the keyboard's default bindings with a mouse button (fire, bomb)
MT.mouseAction = (input, action) => {
  const m = input.map && input.map[action]; if (!m) return null;
  const b = m.find(c => c.startsWith('Mouse')); return b ? (b === 'Mouse2' ? 'right' : 'left') : null;
};

/* ---- 02-art.js ---- */
/* MASH TV — 02-art: the sets (floors, walls, lights per episode), the arena's TileMap, the doors, the contestants' looks,
 * the enemy rigs and the sprites for bullets and pickups. Every picture is drawn in code with E.px and the engine's rigs. */

/* ---------- the sets: one per episode, plus the Green Room (§9.2) ---------- */
MT.SETS = {
  studio: { id: 'studio', name: 'STUDIO 9', amb: .55, floor: [[24, 12, 40], [40, 20, 68]], line: [255, 204, 51], inlay: [255, 46, 136],
    wallTop: '#4a2a6a', wallSide: '#2a1446', face: 'plaster', roof: 'slab', glow: '#ff2e88', light: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ff2e88'], spot: true },
  warehouse: { id: 'warehouse', name: 'MEGAMART WAREHOUSE', amb: .6, floor: [[86, 88, 96], [98, 100, 110]], line: [230, 190, 40], inlay: [60, 60, 70],
    wallTop: '#6e7480', wallSide: '#4a4f5a', face: 'plank', roof: 'plain', glow: '#ffb020', light: ['#ffb020', '#ffb020', '#fff0c0'], spot: false },
  rooftop: { id: 'rooftop', name: 'THE ROOFTOP GALA', amb: .42, floor: [[30, 38, 52], [38, 46, 62]], line: [212, 175, 55], inlay: [150, 30, 40],
    wallTop: '#3a4a60', wallSide: '#202a3a', face: 'stone', roof: 'plain', glow: '#ffcc33', light: ['#ffcc33', '#2ee6ff', '#ff8a4a'], spot: true },
  greenroom: { id: 'greenroom', name: 'THE GREEN ROOM', amb: .62, floor: [[20, 84, 48], [24, 96, 56]], line: [255, 204, 51], inlay: [200, 170, 60],
    wallTop: '#4a3420', wallSide: '#2e1e10', face: 'plank', roof: 'plain', glow: '#ffcc66', light: ['#ffcc66', '#ffcc66'], spot: false }
};
MT.setFloor = (set, x, y) => {
  const s = MT.SETS[set] || MT.SETS.studio, c = s.floor;
  if (set === 'rooftop') { const red = Math.abs(y - 120) < 9; if (red) return [150, 30, 40]; if (Math.hypot(x - 184, y - 120) < 26 && Math.hypot(x - 184, y - 120) > 22) return [212, 175, 55]; }
  if (set === 'warehouse') { if (Math.abs(y - 56) < 1.4 || Math.abs(y - 184) < 1.4 || Math.abs(x - 92) < 1.4 || Math.abs(x - 276) < 1.4) return s.line; }
  if (set === 'studio') { const d = ((Math.floor(x / 16) + Math.floor(y / 16)) & 1); const base = c[d]; if (Math.abs(((x - 184) + (y - 120)) % 96) < 1.1 && Math.abs(x - 184) < 150 && Math.abs(y - 120) < 90) return [96, 26, 70]; const L = MT.logoAt(x, y); if (L) return L; return base; }
  if (set === 'greenroom') { const d = ((Math.floor(x / 24) + Math.floor(y / 24)) & 1); return d ? c[1] : c[0]; }
  return c[((Math.floor(x / 16) + Math.floor(y / 16)) & 1)];
};
MT.setWall = (set) => {
  const s = MT.SETS[set] || MT.SETS.studio;
  return { 1: { h: 26, top: s.wallTop, side: s.wallSide, face: s.face, roof: s.roof, cut: true },
    2: { h: 26, top: '#6a6a78', side: '#3a3a46', face: 'plank', roof: 'plain' },
    3: { h: 26, top: s.wallTop, side: s.wallSide, face: s.face, roof: s.roof, cut: true } };
};

/* ---------- the arena: a TileMap of 23 x 15 cells; '#' wall, '=' door gap (closed: a wall type), '+' the south wall (cut) ---------- */
MT.ARENA_ROWS = (() => {
  const rows = [];
  for (let y = 0; y < 15; y++) {
    let r = '';
    for (let x = 0; x < 23; x++) {
      if (y === 14 && x >= 1 && x <= 21) { r += (x >= 10 && x <= 12) ? '=' : '+'; continue; }
      if (y === 14) { r += '#'; continue; }
      if (y === 0 && x >= 10 && x <= 12) { r += '='; continue; }
      if (x === 0 && y >= 6 && y <= 8) { r += '='; continue; }
      if (x === 22 && y >= 6 && y <= 8) { r += '='; continue; }
      if (y === 0 || x === 0 || x === 22) { r += '#'; continue; }
      r += '.';
    }
    rows.push(r);
  }
  return rows;
})();
// the MASH TV logo on the studio floor: the engine's title font rasterized once into an offscreen canvas (browsers only),
// then sampled by the floor texture, so the lettering is the floor's own (§9.4 item 2)
MT.logo = null;
MT.buildLogo = () => {
  if (MT.logo !== null || typeof document === 'undefined' || !document.createElement) { MT.logo = MT.logo || false; return; }
  try {
    const c = document.createElement('canvas'); c.width = 160; c.height = 56; const g = c.getContext('2d');
    E.font.title(g, 'MASH TV', 80, 6, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
    MT.logo = { data: g.getImageData(0, 0, 160, 56).data, w: 160, h: 56 };
  } catch (e) { MT.logo = false; }
};
MT.logoAt = (x, y) => {
  if (!MT.logo) return null;
  const px_ = Math.floor(x - 104), py = Math.floor(y - 92);
  if (px_ < 0 || py < 0 || px_ >= MT.logo.w || py >= MT.logo.h) return null;
  const i = (py * MT.logo.w + px_) * 4;
  return MT.logo.data[i + 3] > 128 ? [MT.logo.data[i], MT.logo.data[i + 1], MT.logo.data[i + 2]] : null;
};
MT.buildMap = (set) => {
  MT.buildLogo();
  const s = MT.SETS[set] || MT.SETS.studio;
  const map = new E.TileMap({ rows: MT.ARENA_ROWS, legend: { '#': 1, '=': 2, '+': 3 }, types: MT.setWall(set),
    floorTex: (x, y) => MT.setFloor(set, x, y), outside: s.wallSide });
  return map;
};
// which door cells a door's shutter occupies, and the door's cells in the room map
MT.DOOR_CELLS = { N: [[10, 0], [11, 0], [12, 0]], S: [[10, 14], [11, 14], [12, 14]], W: [[0, 6], [0, 7], [0, 8]], E: [[22, 6], [22, 7], [22, 8]] };

/* ---------- the door painter: a shutter that rolls up, a beacon and the exit sign (§5.5) ---------- */
MT.paintDoor = (r, d, W) => {
  const D = MT.DOORS[d], dr = d === 'N' || d === 'S';
  const st = d === 'N' || d === 'S' ? W.doorState[d] : W.doorState[d];
  const open = st.state === 'open' || st.state === 'opening' || st.state === 'closing' ? st.up : 0;   // 0 closed .. 1 up
  const exit = st.state === 'exit';
  const pulse = .5 + .5 * Math.sin(W.time * 6);
  const col = exit ? '#2ee66a' : st.state === 'open' || st.state === 'opening' ? '#ff3344' : '#7a2a3a';
  r.queue(D.x, D.y, 12, g => {   // the frame and the shutter (drawn over the wall, in the gap)
    const cx = D.x, cy = D.y;
    const a = r.w(cx - (dr ? 20 : 0), cy - (dr ? 0 : 20), 0), b = r.w(cx + (dr ? 20 : 0), cy + (dr ? 0 : 20), 0);
    const h = r.w(cx, cy, 26), hb = r.w(cx, cy, 0);
    const k = Math.max(0, 1 - open);
    if (k > .01) {
      const sx = (b[0] - a[0]) * k, sy = (b[1] - a[1]) * k;
      px.poly(g, [[a[0], a[1]], [a[0] + sx, a[1] + sy], [a[0] + sx, a[1] + sy - (hb[1] - h[1])], [a[0], a[1] - (hb[1] - h[1])]], '#5c5c6e');
    }
    px.line(g, a[0], a[1], a[0] - 3, a[1] - 14, '#e8c440', 2);
    px.line(g, b[0], b[1], b[0] + 3, b[1] - 14, '#e8c440', 2);
    px.disc(g, h[0], h[1] - 14, 3, col);
    if (exit) px.disc(g, h[0], h[1] - 14, 5 + pulse * 2, 'rgba(46,230,106,0.35)');
  });
  if (exit) { r.sign = r.sign || []; }
};

/* ---------- the contestants' looks (§9.3): the slot fixes the colour; four builds ---------- */
MT.LOOKS = [
  { name: 'ROCKET', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'short', hat: null, colors: { cloth: '#e8443a', coat: '#e8443a', pants: '#e8443a', skin: '#f0c8a0', hair: '#3a2a20', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } },
  { name: 'VOLT', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'ponytail', hat: { style: 'band', color: '#2a2a33' }, colors: { cloth: '#3b82f6', coat: '#3b82f6', pants: '#2a52a8', skin: '#e8b890', hair: '#f2d86a', boot: '#15121c', glove: '#b8c0d0', trim: '#ffffff' } },
  { name: 'MOXIE', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'spiky', hat: 'cap', colors: { cloth: '#22c55e', coat: '#22c55e', pants: '#1a7a40', skin: '#d8a880', hair: '#15121c', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } },
  { name: 'GOLDIE', build: 'heroic', size: 1.1, outfit: 'shirt', hair: 'long', hat: { style: 'band', color: '#ff8ad8' }, colors: { cloth: '#f5b700', coat: '#f5b700', pants: '#c08a00', skin: '#f2d0b0', hair: '#8a4a20', boot: '#15121c', glove: '#15121c', trim: '#ffffff' } }
];
MT.LANCE_LOOK = { name: 'LANCE LUSTRE', build: 'heroic', size: 1.3, outfit: 'coat', hair: 'spiky', hat: null, colors: { cloth: '#7a2ab8', coat: '#7a2ab8', pants: '#15121c', skin: '#e8b890', hair: '#d8dce8', boot: '#15121c', glove: '#ffffff', trim: '#ffcc33' } };
MT.PENNY_LOOK = { name: 'PENNY PRIZE', build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: null, colors: { cloth: '#1fa8a0', coat: '#1fa8a0', pants: '#1fa8a0', skin: '#f5d0b8', hair: '#f06ab8', boot: '#15121c', glove: '#ffffff', trim: '#ffffff' } };
// an enemy's rig: the options its Humanoid or Blob is built with
MT.RIGS = {
  goon: { kind: 'humanoid', o: { size: 1.0, build: 'bulky', weapon: 'staff', outfit: 'coat', hair: 'short', hat: 'helmet', colors: { cloth: '#2a3a52', coat: '#2a3a52', pants: '#1a2230', skin: '#c89070', hair: '#222', boot: '#111', glove: '#111', plate: '#8a94a8', metal: '#c0c8d8' } } },
  popper: { kind: 'humanoid', o: { size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'spiky', hat: 'cap', colors: { cloth: '#ffcc33', coat: '#ffcc33', pants: '#cc3366', skin: '#f2c8a0', hair: '#c02080', boot: '#222', glove: '#222' } } },
  mime: { kind: 'humanoid', trapped: true, o: { size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', colors: { cloth: '#fafafa', coat: '#222', pants: '#111', skin: '#fbfbff', hair: '#111', boot: '#111', glove: '#fff' } } },
  heckler: { kind: 'humanoid', o: { size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'long', hat: 'band', colors: { cloth: '#ff3344', coat: '#ff3344', pants: '#fff', skin: '#e0b090', hair: '#e04a20', boot: '#222', glove: '#ffcc33' } } },
  hecklerKing: { kind: 'humanoid', o: { size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'long', hat: 'crown', colors: { cloth: '#ff3344', coat: '#ff3344', pants: '#fff', skin: '#e0b090', hair: '#e04a20', boot: '#222', glove: '#ffcc33', plate: '#ffcc33' } } },
  brute: { kind: 'humanoid', o: { size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', hat: null, colors: { cloth: '#8a5a32', coat: '#8a5a32', pants: '#5a3a22', skin: '#9a6a3a', hair: '#5a3a22', boot: '#222', glove: '#222' } } },
  clapbot: { kind: 'blob', o: { R: 6, colors: { dk: '#3a4150', base: '#c8d0e0', lt: '#f0f4ff', spec: '#ffffff', eye: '#ffcc33', pupil: '#222' }, ears: 'cat' } }
};
MT.CROWD_LOOK = { size: .8, build: 'chibi', weapon: null, hair: 'short', hat: null, outfit: 'shirt', colors: { cloth: '#7a6aa8', pants: '#333', skin: '#e8c0a0', hair: '#4a3a2a', boot: '#222', glove: '#222' } };

// rigs are built once per kind and posed each step; their draw code reads only what the render state gives them
MT.makeRig = (spec) => {
  if (!spec) return null;
  if (spec.kind === 'blob') return new E.Blob(spec.o);
  const rig = new E.Humanoid(Object.assign({}, spec.o, { colors: Object.assign({}, spec.o.colors) }));
  if (spec.trapped) {   // the mime 'trapped in a box': both hands flat on the glass at chest height, sliding along it
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const J = this.J, slide = Math.sin(this.t * 1.6) * 2.2;
      J.elbowL = [2.2, -8 + slide, 10]; J.elbowR = [2.2, 8 + slide, 10];
      J.handL = [4.2, -6 + slide, 15]; J.handR = [4.2, 6 + slide, 15];
    };
  }
  return rig;
};
MT.lookRig = (slot) => new E.Humanoid(Object.assign({}, MT.LOOKS[slot % 4], { colors: Object.assign({}, MT.LOOKS[slot % 4].colors) }));

/* ---------- sprites: bullets, pickups and icons, designed at 8-16 px ---------- */
MT.SPR = {};
MT.initSprites = () => {
  const S = MT.SPR;
  S.bolt = E.sprite(['.yy.', 'yWWy', 'yWWy', '.yy.'], { y: '#ffcc33', W: '#fffbe0' }, 1);
  S.bolt2 = E.sprite(['.cc.', 'cWWc', '.cc.'], { c: '#ff2e88', W: '#ffd0ec' }, 1);
  S.rocket = E.sprite(['.rr..', 'rrrr.', 'WWrrr', 'rrrr.', '.rr..'], { r: '#e8443a', W: '#fff0c0' }, 1);
  S.popcorn = E.sprite(['.yy.', 'yWyy', 'yyWy', '.yy.'], { y: '#f8e070', W: '#fffdf0' }, 1);
  S.kernel = E.sprite(['yy', 'Wy'], { y: '#ffe070', W: '#ffffff' }, 1);
  S.record = E.sprite(['.gg.', 'gWWg', 'gWWg', '.gg.'], { g: '#ffcc33', W: '#222' }, 1);
  S.orb = E.sprite(['.oo.', 'oWWo', '.oo.'], { o: '#ff9a3c', W: '#fff2a0' }, 1);
  S.shard = E.sprite(['oo', 'Wo'], { o: '#ffb050', W: '#fff' }, 1);
  S.coin = E.sprite(['.yy.', 'yWyy', 'yyWy', '.yy.'], { y: '#ffd040', W: '#fff8c0' }, 1);
  S.card = E.sprite(['wwww', 'wWWw', 'wwww'], { w: '#f4f4ff', W: '#ff8a8a' }, 1);
  S.bill = E.sprite(['gggggg', 'gGGGGg', 'gggggg'], { g: '#2f8a3a', G: '#8ae08a' }, 2);
  S.stack = E.sprite(['gggggggg', 'GGGGGGGG', 'gggggggg', 'GGGGGGGG'], { g: '#2f8a3a', G: '#7ad07a' }, 2);
  S.gold = E.sprite(['yyyyyy', 'YYYYYY', 'yyyyyy', 'YYYYYY'], { y: '#c8901a', Y: '#ffd850' }, 2);
  S.case = E.sprite(['cccccc', 'cWcccc', 'cccccc', 'cccccc'], { c: '#d8dce8', W: '#2a2a33' }, 2);
  S.prize = E.sprite(['rrrrrr', 'rWrrWr', 'rrrrrr', 'rrWWrr', 'rrrrrr'], { r: '#ff3344', W: '#ffffff' }, 2);
  S.key = E.sprite(['.kk.', 'kWWk', 'kkkk', '.k.k', '.kk.'], { k: '#ffcc33', W: '#fff8c0' }, 2);
  S.capsule = E.sprite(['tttttt', 'tXXXXt', 'tXXXXt', 'tttttt'], { t: '#2a2a3a', X: '#2ee6ff' }, 2);
  S.flash = E.sprite(['..f..', '.fWf.', 'fWWWf', '.fWf.', '..f..'], { f: '#ffffff', W: '#ffffe0' }, 1);
  S.star = E.sprite(['..s..', '.sss.', 'sssss', '.sss.', '..s..'], { s: '#ffdf40' }, 1);
  S.statuette = E.sprite(['..g..', '.ggg.', '.gWg.', '.ggg.', '..g..', '.ggg.', '.ggg.'], { g: '#ffcc33', W: '#fff' }, 3);
  S.crate = E.sprite(['ccccccc', 'cwwwwwc', 'cwccccc', 'cccccc', 'ccccccc'], { c: '#8a5a32', w: '#c08a50' }, 2);
  S.tomato = E.sprite(['.rr.', 'rWrr', '.rr.'], { r: '#ff3a2a', W: '#ffb0a0' }, 1);
  S.splat = E.sprite(['..rr..', '.rrrr.', 'rrrrrr', '.rrrr.', '..rr..'], { r: '#c02020' }, 1);
  return S;
};
// the twelve prize icons are drawn as small coloured boxes with their first letter (§7.6), as a banner's badge
MT.prizeIcon = (name) => {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['#ff8ad8', '#5fe0a0', '#ffcc33', '#2ee6ff', '#ff6a6a', '#b08aff'][h % 6];
};

/* ---- 03-audio.js ---- */
/* MASH TV — 03-audio: every sound, song and voice is made in code. Sound effects are voices defined on the engine's
 * chip synth; music is engine notation; the voices ("babble") are Animalese-style formant syllables on the effects bus. */

MT.SFX = {   // name: a voice for audio.define (wave, freq, to, dur, vol, arp, vib; wave 'noise' for hiss)
  pew: { wave: 'square', freq: 880, to: 420, dur: .08, vol: .18 }, spread: { wave: 'saw', freq: 620, to: 300, dur: .12, vol: .16, arp: [0, 4, 7] },
  rocket: { wave: 'noise', freq: 220, to: 120, dur: .35, vol: .22 }, boom: { wave: 'noise', freq: 140, to: 40, dur: .45, vol: .42 },
  pop: { wave: 'square', freq: 1200, to: 300, dur: .05, vol: .2 }, popcorn: { wave: 'pulse', freq: 900, to: 1500, dur: .07, vol: .16 },
  laser: { wave: 'saw', freq: 180, to: 190, dur: .12, vol: .1, vib: [30, .2] }, records: { wave: 'triangle', freq: 330, to: 660, dur: .16, vol: .14, vib: [14, .05] },
  shield: { wave: 'sine', freq: 520, to: 560, dur: .25, vol: .12, vib: [6, .08] }, speed: { wave: 'pulse', freq: 300, to: 900, dur: .2, vol: .14 },
  slide: { wave: 'noise', freq: 900, to: 300, dur: .22, vol: .18 }, showboat: { wave: 'triangle', freq: 523, to: 1046, dur: .3, vol: .24, arp: [0, 4, 7, 12] },
  flash: { wave: 'noise', freq: 4000, to: 800, dur: .12, vol: .5 }, cash: { wave: 'square', freq: 1046, to: 1568, dur: .12, vol: .18, arp: [0, 7] },
  prize: { wave: 'triangle', freq: 523, to: 1046, dur: .45, vol: .28, arp: [0, 4, 7, 12, 16] }, key: { wave: 'sine', freq: 1318, to: 1760, dur: .4, vol: .3, arp: [0, 7, 12] },
  powerup: { wave: 'pulse', freq: 330, to: 990, dur: .3, vol: .18, arp: [0, 4, 7, 12] }, pwrexp: { wave: 'square', freq: 660, to: 220, dur: .09, vol: .14 },
  oneup: { wave: 'triangle', freq: 660, to: 1320, dur: .45, vol: .26, arp: [0, 4, 7, 12, 16, 19] }, death: { wave: 'saw', freq: 360, to: 90, dur: .6, vol: .3 },
  respawn: { wave: 'sine', freq: 1400, to: 300, dur: .35, vol: .14 }, land: { wave: 'noise', freq: 300, to: 90, dur: .15, vol: .3 },
  buzz: { wave: 'square', freq: 150, to: 110, dur: .3, vol: .3 }, hit: { wave: 'noise', freq: 600, to: 200, dur: .1, vol: .3 },
  goon: { wave: 'saw', freq: 150, to: 95, dur: .14, vol: .14 }, bash: { wave: 'noise', freq: 1800, to: 600, dur: .08, vol: .18 },
  clap: { wave: 'noise', freq: 2400, to: 1800, dur: .06, vol: .2 }, hop: { wave: 'square', freq: 420, to: 760, dur: .09, vol: .12 },
  fuse: { wave: 'noise', freq: 3000, to: 2000, dur: .6, vol: .1 }, mime: { wave: 'sine', freq: 880, to: 880, dur: .1, vol: .14 },
  pfft: { wave: 'noise', freq: 800, to: 400, dur: .3, vol: .2 }, disco: { wave: 'triangle', freq: 1700, to: 2300, dur: .22, vol: .12, vib: [24, .1] },
  beam: { wave: 'saw', freq: 1400, to: 300, dur: .18, vol: .12 }, boo: { wave: 'saw', freq: 220, to: 150, dur: .5, vol: .2, vib: [5, .04] },
  splat: { wave: 'noise', freq: 500, to: 200, dur: .2, vol: .26 }, tank: { wave: 'saw', freq: 90, to: 60, dur: .35, vol: .3 },
  shell: { wave: 'noise', freq: 260, to: 80, dur: .3, vol: .3 }, snake: { wave: 'noise', freq: 2200, to: 1500, dur: .3, vol: .14 },
  snap: { wave: 'square', freq: 1500, to: 200, dur: .06, vol: .2 }, roar: { wave: 'saw', freq: 110, to: 70, dur: .8, vol: .32, vib: [9, .05] },
  stomp: { wave: 'noise', freq: 120, to: 50, dur: .25, vol: .4 }, crash: { wave: 'noise', freq: 900, to: 120, dur: .4, vol: .35 },
  confetti: { wave: 'noise', freq: 6000, to: 2000, dur: .2, vol: .18 }, klaxon: { wave: 'square', freq: 440, to: 330, dur: .5, vol: .18, vib: [8, .1] },
  door: { wave: 'noise', freq: 200, to: 120, dur: .4, vol: .25 }, beacon: { wave: 'square', freq: 1800, to: 1800, dur: .03, vol: .06 },
  vent: { wave: 'noise', freq: 700, to: 2000, dur: .55, vol: .26 }, cheer: { wave: 'triangle', freq: 500, to: 800, dur: .6, vol: .2, vib: [7, .04] },
  applause: { wave: 'noise', freq: 3000, to: 3000, dur: 1.2, vol: .18 }, laugh: { wave: 'square', freq: 500, to: 380, dur: .12, vol: .14, arp: [0, -2, 0, -4] },
  ooh: { wave: 'triangle', freq: 600, to: 330, dur: .4, vol: .16, vib: [5, .04] }, drum: { wave: 'noise', freq: 180, to: 180, dur: .05, vol: .32 },
  click: { wave: 'square', freq: 1800, to: 1800, dur: .02, vol: .12 }, static: { wave: 'noise', freq: 5000, to: 4000, dur: .4, vol: .22 },
  flip: { wave: 'square', freq: 220, to: 880, dur: .14, vol: .16 }, shutter: { wave: 'noise', freq: 2400, to: 900, dur: .09, vol: .3 },
  tick: { wave: 'square', freq: 1000, to: 1000, dur: .03, vol: .12 }, bell: { wave: 'sine', freq: 1046, to: 1046, dur: .6, vol: .24 },
  lose: { wave: 'triangle', freq: 392, to: 196, dur: 1.2, vol: .3, arp: [0, -3, -6, -12] }, blip: { wave: 'square', freq: 1300, to: 1300, dur: .03, vol: .1 },
  countdown: { wave: 'square', freq: 660, to: 660, dur: .12, vol: .2 }, wheel: { wave: 'square', freq: 1700, to: 1700, dur: .02, vol: .15 },
  drumroll: { wave: 'noise', freq: 300, to: 300, dur: .9, vol: .16 }, bankrupt: { wave: 'saw', freq: 300, to: 110, dur: .9, vol: .3, arp: [0, -5, -10] },
  sting: { wave: 'square', freq: 523, to: 784, dur: .25, vol: .2, arp: [0, 4, 7, 12] }, banner: { wave: 'pulse', freq: 440, to: 880, dur: .18, vol: .2 },
  zap: { wave: 'saw', freq: 1500, to: 200, dur: .12, vol: .16 }, thud: { wave: 'sine', freq: 120, to: 60, dur: .18, vol: .4 }
};
// the babble voices (§10.3): base pitch, syllables a second, wave, formant factor, and the character's gibberish mood
MT.VOICES = {
  lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1.0, bright: 1.2 }, penny: { f0: 300, speed: 12, wave: 'square', formant: 1.18, bright: 1.1 },
  annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, bright: .8, echo: true }, network: { f0: 70, speed: 8, wave: 'square', formant: .8, bright: .9 },
  mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, bright: 1 }, contestant1: { f0: 200, speed: 12, wave: 'square', formant: 1.05, bright: 1 },
  contestant2: { f0: 240, speed: 12, wave: 'square', formant: 1.05, bright: 1 }, contestant3: { f0: 180, speed: 12, wave: 'square', formant: 1.05, bright: 1 },
  contestant4: { f0: 160, speed: 12, wave: 'square', formant: 1.05, bright: 1 }, goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9, bright: .9 }
};
const VOWEL = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
MT.babble = {
  seedOf: s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; },
  // says a line on the voice's syllables; returns the line's duration in seconds (headless: the duration only)
  say(text, voiceId, o = {}) {
    const V = MT.VOICES[voiceId] || MT.VOICES.lance, speed = (o.speed || 1) * V.speed;
    const words = String(text).toUpperCase().replace(/[^A-Z0-9 ,.!?'…-]/g, ' ').split(/\s+/).filter(Boolean);
    const sylls = [];
    for (const w of words) {
      const groups = w.toLowerCase().match(/[aeiouy]+|[^aeiouy]+/g) || [w];
      const n = Math.min(4, Math.max(1, groups.filter(s => /[aeiouy]/.test(s)).length));
      for (let i = 0; i < n; i++) sylls.push({ word: w, i, n, emph: /!/.test(text) || w === w.toUpperCase() && w.length > 2 });
    }
    const dur = sylls.length / speed + (String(text).match(/[.!?]/g) || []).length * .16 + (String(text).match(/,/g) || []).length * .08;
    const G = MT.G, ctx = G && G.audio && G.audio.ctx;
    if (!ctx || !G.audio.bus) return dur;
    const t0 = ctx.currentTime + .03, bus = G.audio.bus, seed = this.seedOf(String(text));
    let t = t0; const rnd = E.rng(seed);
    sylls.forEach((s, k) => {
      const step = 1 / speed, base = V.f0 * (1 + (rnd() * .08 - .04)) * (s.emph ? 1.2 : 1);
      const vowel = (s.word.toLowerCase().match(/[aeiou]/) || ['a'])[0], [f1, f2] = VOWEL[vowel] || VOWEL.a;
      const osc = ctx.createOscillator(), g = ctx.createGain(), b1 = ctx.createBiquadFilter(), b2 = ctx.createBiquadFilter();
      osc.type = V.wave; osc.frequency.setValueAtTime(base, t); osc.frequency.linearRampToValueAtTime(base * (k === sylls.length - 1 ? .8 : 1.1), t + step * .8);
      b1.type = 'bandpass'; b1.frequency.value = f1 * V.formant; b1.Q.value = 8; b2.type = 'bandpass'; b2.frequency.value = f2 * V.formant; b2.Q.value = 8;
      osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g); g.connect(bus);
      const len = Math.min(.12, step * .85);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .005); g.gain.setValueAtTime(.12, t + len - .03); g.gain.linearRampToValueAtTime(0, t + len);
      osc.start(t); osc.stop(t + len + .02); t += step * (rnd() * .1 + .95);
    });
    return dur;
  },
  // the crowd: cheers, oohs, laughs, applause and boos (intensity 0..1 scales the voices and their level)
  crowd(kind, intensity = .6) {
    const G = MT.G; if (!G || !G.audio) return;
    const n = Math.round(4 + 6 * intensity);
    const key = { cheer: 'cheer', ooh: 'ooh', laugh: 'laugh', applause: 'applause', boo: 'boo' }[kind];
    if (key === 'applause') { for (let i = 0; i < Math.round(8 + 6 * intensity); i++) G.audio.sfx('clap', { vol: .3 * intensity, pitch: .8 + Math.random() * .6 }); return; }
    if (key) G.audio.sfx(key, { vol: .4 + .4 * intensity, pitch: .9 + Math.random() * .2 });
    if (n) MT.babble.say(kind === 'cheer' ? 'WOO! YAY!' : kind === 'ooh' ? 'OOOH' : kind === 'laugh' ? 'HA HA HA' : 'BOO', 'contestant2', { speed: 1.3 });
  }
};

/* ---------- songs (engine notation: a note, '-' holds, '.' rests, drums k s h o c t; 16 steps is one bar) ---------- */
const bar = s => s.replace(/\|/g, ' ').trim().split(/\s+/);
const rep = (s, n) => Array(n).fill(s).join(' ');
MT.SONGS = {
  theme: { bpm: 132, steps: 4, tracks: [
    { wave: 'square', vol: .16, notes: rep('G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 2) + ' G5 - - - E5 - C5 - D5 - - - . . . . ' + rep('A4 . C5 . F5 . A5 - - . F5 . A5 . C6 -', 2) + ' A5 - - - F5 - D5 - C5 - - - . . . .' },
    { wave: 'triangle', vol: .18, notes: rep('C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .', 2) + ' ' + rep('F2 . F2 . C3 . C3 . G2 . G2 . C3 . C3 .', 1) },
    { wave: 'drums', vol: .4, notes: rep('k . h . s . h o k k h . s . h o', 4) }] },
  studioBattle: { bpm: 150, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('E2 E2 . E2 . G2 . E2 . A2 . A2 . G2 . E2 .', 4) },
    { name: 'lead', wave: 'square', vol: .1, notes: rep('E4 . G4 . B4 . E5 . D5 . B4 . G4 . E4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('C5 - - - E5 - - - G5 - - - C6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . h . s . h . k . h . s h s .', 4) },
    { name: 'intense', wave: 'drums', vol: .25, on: false, notes: rep('k k s k k s k s', 8) }] },
  warehouseFunk: { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('D2 . D2 D2 . F2 . D2 . C2 . C2 . G2 .', 4) },
    { name: 'lead', wave: 'pulse', vol: .08, notes: rep('D4 . F4 . A4 . C5 . B4 . A4 . F4 . D4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('D5 - - - F5 - - - A5 - - - D6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . h . s . h . k . k . s . h .', 4) },
    { name: 'intense', wave: 'drums', vol: .22, on: false, notes: rep('k h k h s h k h', 8) }] },
  finaleOverture: { bpm: 160, steps: 4, tracks: [
    { name: 'strings', wave: 'saw', vol: .07, notes: rep('A3 - - - C4 - - - E4 - - - A4 - - -', 4) + ' ' + rep('F3 - - - A3 - - - C4 - - - F4 - - -', 4) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('A2 . A2 . E2 . E2 . F2 . F2 . G2 . G2 .', 4) },
    { name: 'lead', wave: 'square', vol: .09, notes: rep('A4 . C5 . E5 . A5 . G5 . E5 . C5 . A4 .', 4) },
    { name: 'prime', wave: 'saw', vol: .09, on: false, notes: rep('A5 - - - C6 - - - E6 - - - A6 - - -', 4) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . . . s . . . k . . k s . . .', 4) },
    { name: 'intense', wave: 'drums', vol: .25, on: false, notes: rep('k k s k k k s k', 8) }] },
  bossShowdown: { bpm: 170, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .15, notes: rep('E2 E2 E2 E2 D2 D2 D2 D2 C2 C2 C2 C2 B1 B1 B1 B1', 4) },
    { name: 'lead', wave: 'square', vol: .08, notes: rep('E4 . E4 G4 B4 . A4 . G4 . E4 . B3 - - -', 4) },
    { name: 'phase2', wave: 'drums', vol: .4, on: false, notes: rep('k k s k k k s s', 8) },
    { name: 'drums', wave: 'drums', vol: .4, notes: rep('k . s . k . s . k k s . k . s s', 4) }] },
  commercial: { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .14, notes: rep('C5 E5 G5 C6 . G5 E5 C5 D5 F5 A5 D6 . A5 F5 D5', 2) + ' ' + rep('E5 G5 B5 E6 . B5 G5 E5 F5 A5 C6 F6 . C6 A5 F5', 2) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('C3 . C3 . G2 . G2 . F2 . F2 . G2 . G2 .', 4) },
    { name: 'drums', wave: 'drums', vol: .35, notes: rep('k . h . s . h . k . h . s h s .', 4) }] },
  recap: { bpm: 100, steps: 4, tracks: [
    { name: 'keys', wave: 'sine', vol: .14, notes: rep('D4 F4 A4 C5 . . . . E4 G4 B4 D5 . . . .', 4) },
    { name: 'bass', wave: 'triangle', vol: .2, notes: rep('D2 . . . G2 . . . C2 . . . A2 . . .', 4) },
    { name: 'drums', wave: 'drums', vol: .25, notes: rep('h . . h . h . . h . . h . h . .', 4) }] },
  ending: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .18, notes: rep('G4 - - - C5 - - - E5 - - - G5 - - -', 2) + ' ' + rep('A4 - - - C5 - - - F5 - - - A5 - - -', 2) },
    { wave: 'sine', vol: .18, notes: rep('C3 - - - G2 - - - A2 - - - F2 - - -', 2) }] }
};
MT.LAYERS = { prime: 'prime', intense: 'intense', phase2: 'phase2' };
MT.music = (id, o = {}) => { const G = MT.G; if (!G) return; if (id === null) return G.audio.music(null); return G.audio.music(MT.SONGS[id], { fade: o.fade === undefined ? .6 : o.fade }); };
MT.sting = (id) => { const G = MT.G; if (G && MT.SONGS[id]) G.audio.sting(MT.SONGS[id], { at: 'bar' }); };
MT.layer = (name, vol, fade) => { const G = MT.G; if (!G || !G.audio || !G.audio.song || !G.audio.song.tracks || !G.audio.song.tracks.some(t => t.name === name)) return; G.audio.layer(name, vol, fade); };
MT.sfx = (name, o) => { const G = MT.G; if (G && G.audio) G.audio.sfx(name, o); };
MT.duck = (on) => { const G = MT.G; if (G && G.audio) G.audio.duck(on); };

/* ---- 04-content.js ---- */
/* MASH TV — 04-content: the episodes, their maps, their rooms (§7), the prize tables (§7.6), the sponsors and every line of
 * text (§8). Rooms are data: the §5.7 format. A wave is { at, left, spawn: [[door, kind, n, gap]], items: [[kind, where]] }. */

const WV = (at, left, spawn, items) => ({ at, left: left === null ? undefined : left, spawn, items: items || [] });
// a room: id, name, episode, type (start | battle | hazard | key | armory | cash | boss | bonus), set, cell on the map, exits, par, key rule
const RM = (o) => Object.assign({ place: [], items: [], hazards: [], waves: [], crates: [], locks: [], par: 70, exits: {}, set: 'studio' }, o);

MT.EPISODES = [
  { id: 1, title: 'THE PILOT', set: 'studio', song: 'studioBattle', stunt: { kind: 'clapbot', n: 12, label: '12 CLAPBOTS' }, boss: 'mashy',
    intro: 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!', subtitle: 'LIVE FROM STUDIO 9',
    prizes: [['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!'], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!'],
      ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!'], ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!'],
      ['A DRY-LAND JET SKI', 8000, 'IT DOESN\'T FLOAT, BUT IT LOOKS GREAT!'], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!']],
    map: { '1-1': [1, 1], '1-2': [0, 1], '1-3': [2, 1], '1-4': [0, 0], '1-5': [1, 0], '1-6': [2, 0], '1-B': [1, -1] } },
  { id: 2, title: 'SWEEPS WEEK', set: 'warehouse', song: 'warehouseFunk', stunt: { kind: 'tank', n: 1, label: 'A DOLLY TANK' }, boss: 'wheel',
    intro: 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!', subtitle: 'LIVE FROM THE MEGAMART PRIZE WAREHOUSE!',
    prizes: [['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!'], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!'],
      ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!'], ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!'],
      ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!'], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!']],
    map: { '2-1': [1, 1], '2-2': [0, 1], '2-3': [2, 1], '2-4': [0, 0], '2-5': [1, 0], '2-6': [2, 0], '2-B': [1, -1] } },
  { id: 3, title: 'THE SEASON FINALE', set: 'rooftop', song: 'finaleOverture', stunt: { kind: 'brute', n: 1, label: 'A MASCOT BRUTE' }, boss: 'lance',
    intro: 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!', subtitle: 'LIVE FROM THE ROOFTOP GALA',
    prizes: [['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!'], ['A PERSONAL WEATHER MACHINE', 15000, 'RAIN ON EVERYONE\'S PARADE!'],
      ['A DIAMOND TOOTHBRUSH', 8000, 'FOR A SMILE LIKE LANCE\'S!'], ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!'],
      ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!'], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!']],
    map: { '3-1': [1, 1], '3-2': [0, 1], '3-3': [2, 1], '3-4': [0, 0], '3-5': [1, 0], '3-6': [2, 0], '3-B': [1, -1] } }
];
MT.LIFE_MARKS = [250000, 750000, 1500000, 3000000];
MT.GREEN_PRIZE = ['THE NETWORK (YES, ALL OF IT)', 100000, 'YOU OWN THE SHOW NOW!'];

MT.ROOMS = {
  /* ===================== EPISODE 1: THE PILOT (Studio 9) ===================== */
  '1-1': RM({ id: '1-1', name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true,
    waves: [WV(2, null, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), WV(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]),
      WV(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), WV(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), WV(8, 5, [['all', 'goon', 5], ['N', 'popper', 2]])] }),
  '1-2': RM({ id: '1-2', name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: 'mimes',
    place: [['mime', 3, 3], ['mime', 7, 2], ['mime', 13, 2], ['mime', 17, 3], ['mime', 5, 6], ['mime', 15, 6], ['mime', 3, 9], ['mime', 7, 10], ['mime', 13, 10], ['mime', 17, 9]],
    waves: [WV(2, null, [['S', 'goon', 8]]), WV(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), WV(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]),
      WV(8, 4, [['all', 'clapbot', 3]]), WV(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]])] }),
  '1-3': RM({ id: '1-3', name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
    waves: [WV(2, null, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), WV(8, 3, [['N', 'goon', 12]]), WV(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]),
      WV(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), WV(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] }),
  '1-4': RM({ id: '1-4', name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 80, key: 'survive', survive: 35, cageUntil: 20,
    streams: [{ every: 1.2, spawn: [['N', 'goon', 1], ['S', 'goon', 1], ['E', 'goon', 1], ['W', 'goon', 1]] }, { every: 4, spawn: [['random', 'clapbot', 2]] }, { every: 7, spawn: [['random', 'popper', 1]] }],
    items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']],
    final: [['all', 'goon', 4]], waves: [] }),
  '1-5': RM({ id: '1-5', name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80,
    items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]],
    waves: [WV(3, null, [['all', 'goon', 8]]), WV(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), WV(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]),
      WV(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), WV(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] }),
  '1-6': RM({ id: '1-6', name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: 'crate', cashMul: 1.5, dropBoost: 2,
    crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]],
    waves: [WV(2, null, [['N', 'goon', 10]]), WV(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), WV(8, 4, [['all', 'clapbot', 4]]),
      WV(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]])] }),

  /* ===================== EPISODE 2: SWEEPS WEEK (MegaMart Prize Warehouse) ===================== */
  '2-1': RM({ id: '2-1', name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', set: 'warehouse', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70,
    waves: [WV(2, null, [['N', 'goon', 10], ['S', 'goon', 10]]), WV(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), WV(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]),
      WV(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), WV(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] }),
  '2-2': RM({ id: '2-2', name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', set: 'warehouse', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: 'place', keyAt: [19, 5],
    hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }],
    waves: [WV(2, null, [['E', 'goon', 12]]), WV(8, 4, [['W', 'clapbot', 10]]), WV(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]),
      WV(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), WV(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] }),
  '2-3': RM({ id: '2-3', name: 'DISCO DEPOT', ep: 2, type: 'battle', set: 'warehouse', cell: [2, 2], exits: { N: '2-6' }, par: 70,
    waves: [WV(2, null, [['N', 'discoBig', 2]]), WV(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), WV(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]),
      WV(8, 4, [['all', 'clapbot', 5]]), WV(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] }),
  '2-4': RM({ id: '2-4', name: 'TOMATO TERRITORY', ep: 2, type: 'battle', set: 'warehouse', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: 'carrier', carrier: 'hecklerKing',
    waves: [WV(2, null, [['audience', 'heckler', 4]]), WV(8, 2, [['N', 'goon', 12]]), WV(8, 4, [['audience', 'heckler', 6]]),
      WV(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]), WV(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] }),
  '2-5': RM({ id: '2-5', name: 'TANK YARD', ep: 2, type: 'armory', set: 'warehouse', cell: [1, 1], exits: { N: '2-B' }, par: 80,
    items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]],
    waves: [WV(2, null, [['N', 'tank', 1]]), WV(10, 1, [['all', 'goon', 8]]), WV(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]),
      WV(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), WV(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] }),
  '2-6': RM({ id: '2-6', name: 'BLOWOUT SALE', ep: 2, type: 'cash', set: 'warehouse', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: 'crate', cashMul: 1.5,
    crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]],
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4]]), WV(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]),
      WV(8, 3, [['all', 'clapbot', 5]]), WV(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] }),

  /* ===================== EPISODE 3: THE SEASON FINALE (Rooftop Gala, night) ===================== */
  '3-1': RM({ id: '3-1', name: 'RED CARPET RIOT', ep: 3, type: 'start', set: 'rooftop', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75,
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), WV(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]),
      WV(9, 3, [['N', 'brute', 1]]), WV(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] }),
  '3-2': RM({ id: '3-2', name: 'PYRO PIT', ep: 3, type: 'hazard', set: 'rooftop', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: 'final',
    hazards: [{ kind: 'vents', cells: [[4, 3], [8, 3], [12, 3], [16, 3], [4, 6], [8, 6], [12, 6], [16, 6], [4, 9], [8, 9], [12, 9], [16, 9]] }],
    waves: [WV(2, null, [['N', 'goon', 12]]), WV(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), WV(8, 4, [['S', 'popper', 4]], [['records', 'drop']]),
      WV(8, 3, [['audience', 'heckler', 4]]), WV(8, 3, [['script', 'finaleBurst']], []), WV(null, 0, [['all', 'goon', 4]])] }),
  '3-3': RM({ id: '3-3', name: 'CABLE TANGLE', ep: 3, type: 'battle', set: 'rooftop', cell: [2, 2], exits: { N: '3-6' }, par: 75,
    waves: [WV(2, null, [['N', 'snake', 1]]), WV(8, null, [['all', 'goon', 6]]), WV(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]),
      WV(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), WV(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] }),
  '3-4': RM({ id: '3-4', name: 'PENTHOUSE VAULT', ep: 3, type: 'key', set: 'rooftop', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: 'vault',
    locks: [[1, 0], [3, 0], [5, 0], [7, 0]],
    waves: [WV(2, null, [['all', 'goon', 8]]), WV(8, 4, [['audience', 'heckler', 4]]), WV(8, 3, [['E', 'tank', 1]]), WV(8, 3, [['all', 'clapbot', 5]]),
      WV(8, 3, [['N', 'brute', 1]])] }),
  '3-5': RM({ id: '3-5', name: 'THE AFTER-PARTY', ep: 3, type: 'armory', set: 'rooftop', cell: [1, 1], exits: { N: '3-B' }, par: 85,
    items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]],
    waves: [WV(2, null, [['N', 'snake', 1], ['S', 'goon', 10]]), WV(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), WV(8, 3, [['audience', 'heckler', 6]]),
      WV(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), WV(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] }),
  '3-6': RM({ id: '3-6', name: 'MASCOT MAYHEM', ep: 3, type: 'battle', set: 'rooftop', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: 'carrier', carrier: 'brute',
    waves: [WV(2, null, [['N', 'brute', 1]]), WV(10, 1, [['all', 'goon', 8]]), WV(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]),
      WV(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), WV(10, 2, [['N', 'brute', 2]])] }),

  /* ===================== BOSS ROOMS (§5.9) and the Green Room (§7.4) ===================== */
  '1-B': RM({ id: '1-B', name: 'SOUNDSTAGE 9: MASHY\'S BIG DEBUT', ep: 1, type: 'boss', boss: 'mashy', set: 'studio', cell: [1, 0], exits: {}, par: 0 }),
  '2-B': RM({ id: '2-B', name: 'THE BIG SPIN', ep: 2, type: 'boss', boss: 'wheel', set: 'warehouse', cell: [1, 0], exits: {}, par: 0 }),
  '3-B': RM({ id: '3-B', name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', boss: 'lance', set: 'rooftop', cell: [1, 0], exits: {}, par: 0 }),
  'greenroom': RM({ id: 'greenroom', name: 'THE GREEN ROOM', ep: 0, type: 'bonus', set: 'greenroom', cell: [1, 1], exits: {}, par: 0 })
};
// the Lightning Round (AI Hub sessions, §7.5): room 1-1's waves (no tutorial), 1-2, 2-3 and Mashy; each has one exit, N, to the next
MT.LIGHTNING = [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB'], ['LB', '1-B', null]];
for (const [id, from, next] of MT.LIGHTNING) {
  const src = MT.ROOMS[from];
  MT.ROOMS[id] = Object.assign({}, src, { id, name: id === 'LB' ? src.name : 'LIGHTNING: ' + src.name, tutorial: false, exits: next ? { N: next } : {}, lightning: true });
}
// the room a walker ends up in through a door of `from`: an episode's start room is entered from S
MT.roomAt = (from, dir) => MT.ROOMS[from] && MT.ROOMS[from].exits[dir];
MT.episodeRooms = ep => Object.values(MT.ROOMS).filter(r => r.ep === ep && r.type !== 'boss');
MT.startRoom = ep => `${ep}-1`;
MT.bossRoom = ep => `${ep}-B`;
// the room sequence that counts for the lightning round and the walk-through tests: the left path (§6.1)
MT.LEFT_PATH = { 1: ['1-1', '1-2', '1-4', '1-5', '1-B'], 2: ['2-1', '2-2', '2-4', '2-5', '2-B'], 3: ['3-1', '3-2', '3-4', '3-5', '3-B'] };
MT.RIGHT_PATH = { 1: ['1-1', '1-3', '1-6', '1-5', '1-B'], 2: ['2-1', '2-3', '2-6', '2-5', '2-B'], 3: ['3-1', '3-3', '3-6', '3-5', '3-B'] };
MT.ENTRY_DOOR = id => (id.endsWith('-1') || id.endsWith('-B') || id === 'greenroom') ? 'S' : null;   // else the opposite of the door walked through

/* ---------- the text (§8): lines are keyed by id and substituted: {NAME} {PRIZE} {N}; the logic never holds a word ---------- */
MT.TEXT = {
  coldOpen: [
    ['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!'],
    ['LANCE', 'GOOD EVENING, PLANET EARTH! I\'M LANCE LUSTRE, AND THIS IS THE ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!'],
    ['LANCE', 'TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!'],
    ['PENNY', 'AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!'],
    ['LANCE', 'LET\'S PLAY... MASH TV! KA-CHING! KA-BOOM!']],
  look: ['A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!', 'A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!',
    'THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!', 'WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!'],
  cards: { 1: ['EPISODE 1', 'THE PILOT', 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!'], 2: ['EPISODE 2', 'SWEEPS WEEK', 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!'],
    3: ['EPISODE 3', 'THE SEASON FINALE', 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!'] },
  bossIntro: {
    mashy: ['PENNY: OOH, HERE HE COMES!', 'LANCE: PLEASE WELCOME THE NETWORK\'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!', 'MASHY: MASHY LOVE YOU! MASHY MASH YOU!'],
    wheel: ['LANCE: IT\'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!'],
    lance: ['LANCE: YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!'] },
  bossLine: {
    mashyP3: 'UH-OH! MASHY\'S GONE MASHY!', mashyDown: 'MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!',
    wheelLoose: 'THE WHEEL\'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!', wheelDown: 'THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!',
    lanceBreak: 'WE\'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!', lanceDown: 'THIS... ISN\'T... OVER... PLEASE... STAND... BY...',
    networkIntro: 'THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED.', networkDown: 'SIGNAL... LOST...'
  },
  enemyIntro: {
    goon: ['OUR SECURITY GOONS! UNION-MADE AND UNDERPAID!', 'ONE SHOT EACH. DON\'T GET SURROUNDED.'],
    clapbot: ['THE CLAPBOTS! THEY CLAP! THEY HOP! THEY BITE!', 'FAST AND ERRATIC. KEEP MOVING.'],
    popper: ['PARTY POPPERS! KEEP YOUR DISTANCE, THEY\'RE A BLAST!', 'SHOOT THEM BEFORE THEY GET CLOSE.'],
    mime: ['LAND MIMES! TRAPPED IN A BOX... OF EXPLOSIVES!', 'SHOOT THEM FROM A DISTANCE.'],
    disco: ['DISCO NEVER DIED! IT JUST GOT ARMED!', 'THEY BOUNCE. WATCH THE LIGHT BEAMS.'],
    heckler: ['OUR STUDIO AUDIENCE HAS... OPINIONS! AND TOMATOES!', 'DODGE THE RED RINGS. SPLATS SLOW YOU.'],
    tank: ['THE DOLLY TANK! SMILE FOR THE CAMERA... FOREVER!', 'MOVE WHEN THE LENS FLASHES.'],
    snake: ['CABLE SNAKES! WHO LEFT THESE WIRES LYING AROUND?', 'SHOOT THE SEGMENTS OFF.'],
    brute: ['BRAND MASCOT ALERT! IT\'S... THE CEREAL KILLER!', 'SIDESTEP THE CHARGE. STUNNED, IT TAKES DOUBLE DAMAGE.']
  },
  roomStart: ['DOORS OPEN IN 3... 2... OH, THEY\'RE ALREADY OPEN!', 'THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!',
    'MASH \'EM! CASH \'EM! KA-CHING! KA-BOOM!', 'DON\'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!', 'LET\'S GET READY TO... MASH!',
    'OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!', 'THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!', 'MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!'],
  roomClear: ['ROOM CLEAR! THE JANITORS HATE YOU!', 'MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!', 'NOW THAT\'S MUST-MASH TV!',
    'PICK A DOOR, ANY DOOR! THEY\'RE ALL TERRIBLE!', 'STAY TUNED... AND STAY ALIVE!', 'WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!'],
  hurt: ['OOH! THAT\'S GONNA LEAVE A MARK!', 'WALK IT OFF! THE NETWORK DOESN\'T PAY FOR BANDAGES!', 'SO CLOSE! I MEAN... HOORAY!'],
  death: ['MASHED! LET\'S SEE THAT AGAIN IN SLOW MOTION!', 'DON\'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!',
    'THEY\'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!', 'AND DOWN GOES {NAME}! THE CROWD GOES MILD!'],
  multi: ['MULTI-MASH!', 'A TRIPLE! THE SPONSORS LOVE A TRIPLE!', 'TOTAL MASH-ACRE!'],
  showboat: ['WORK THAT CAMERA!', 'SHOWMANSHIP! OR STUPIDITY! SAME THING!', 'THE CAMERAS LOVE YOU! THE GOONS DON\'T!'],
  prime: ['RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!', 'PRIME TIME, BABY! FIVE TIMES THE CASH!', 'THE SPONSORS ARE WEEPING WITH JOY!'],
  stunt: ['WE\'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!', 'BORING! RELEASE THE STUNT!', 'THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!'],
  key: ['A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!', 'ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!'],
  prize: 'OOOH! {PRIZE}!', prizeWin: 'YOU WON {PRIZE}! IT\'S WORTH MONEY! PROBABLY!',
  encore: 'ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!', hurry: 'PICK A DOOR! WE\'RE PAYING OVERTIME HERE!',
  lowHp: 'ONE MORE HIT AND YOU\'RE A COMMERCIAL BREAK!',
  hints: {
    move: 'MOVE WITH THE STICK OR WASD, AIM AND FIRE WITH THE RIGHT STICK OR MOUSE', capsule: 'WALK OVER POWER-UPS', showboat: 'SHOWBOAT NEAR ENEMIES FOR RATINGS',
    slide: 'SLIDE THROUGH DANGER', showstop: 'SHOWSTOPPER CLEARS THE SCREEN', exit: 'PICK A DOOR!', dropIn: 'PRESS START TO JOIN'
  },
  recapIntro: 'LET\'S SEE WHAT OUR CONTESTANTS WON!', recapOutro: 'SEE YOU AFTER THE BREAK!',
  keysOpen: 'YOU FOUND THE GOLDEN KEYS! THE GREEN ROOM IS OPEN!',
  greenIntro: 'YOU FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!',
  endingA: ['CONGRATULATIONS! YOU SURVIVED THE SEASON!'],
  endingANext: 'HELLO, PLANET EARTH! NEXT SEASON ON MASH TV...',
  endingB: ['BREAKING NEWS! TONIGHT\'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!', 'MASH TV HAS BEEN... CANCELLED!'],
  gameOver: ['AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!', 'YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!'],
  continueLine: 'WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!',
  sponsors: [['KRUNCH-O', 'THE CEREAL THAT CRUNCHES BACK!'], ['MEGAMART', 'WE SELL EVERYTHING. EVEN THIS SHOW.'], ['DOOM COLA', 'TASTE THE END'], ['LAFF TRAK', 'CANNED LAUGHTER FOR AWKWARD SILENCES']],
  steal: 'THE NETWORK TAKES ITS CUT!', sessionEnd: 'THAT\'S OUR SHOW! TUNE IN NEXT ROUND!', technical: 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.'
};
// the pool of lines for each reaction: random without repeats (§8.4)
MT.pools = {};
MT.pick_unique = (key, list) => {
  const used = MT.pools[key] || (MT.pools[key] = { left: [] });
  if (!used.left.length) used.left = list.slice();
  const i = Math.floor(MT.rng.fx() * used.left.length);
  return used.left.splice(i, 1)[0];
};
MT.fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

/* ---- 05-contestant.js ---- */
/* MASH TV — 05-contestant: a contestant (§5.1), its weapons and add-ons (§5.2), its shot pools and their collisions.
 * The contestant reads an intent object (01-input) and never an E.Input directly. */

MT.WEAPONS = {   // primaries: one at a time; the add-ons stack on top
  blaster: { name: 'STUDIO BLASTER', kind: 'primary', rate: 'fireRate', dur: Infinity },
  spread: { name: 'TRIPLE PLAY', kind: 'primary', rate: 8, dur: 14 },
  rockets: { name: 'PRIME-TIME ROCKETS', kind: 'primary', rate: 3.5, dur: 12 },
  popcorn: { name: 'POPCORN POPPER', kind: 'primary', rate: 2.5, dur: 12 },
  laser: { name: 'LIMELIGHT LASER', kind: 'primary', rate: 0, dur: 10 },
  records: { name: 'GOLD RECORDS', kind: 'addon', dur: 15 },
  shield: { name: 'SPONSOR SHIELD', kind: 'addon', dur: 8 },
  speed: { name: 'SPEED SNEAKERS', kind: 'addon', dur: 10 },
  bomb: { name: 'SHOWSTOPPER', kind: 'instant' },
  life: { name: 'ENCORE', kind: 'instant' }
};
MT.PRIMARY_ORDER = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];

class Contestant {
  constructor(W, slot, o = {}) {
    this.W = W; this.slot = slot; this.n = slot + 1; this.id = 'c' + slot;
    this.look = MT.LOOKS[slot % 4]; this.name = MT.slots[slot].name; this.color = MT.slots[slot].color;
    this.x = o.x || 0; this.y = o.y || 0; this.r = 6; this.face = o.face !== undefined ? o.face : -Math.PI / 2; this.aim = null;
    this.diff = W.diff; this.maxHp = o.hp || this.diff.hp; this.hp = this.maxHp;
    this.lives = o.lives !== undefined ? o.lives : (MT.T.startLives || this.diff.lives); this.lives = o.lives !== undefined ? o.lives : this.lives;
    this.cash = o.cash || 0; this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.bombs = o.bombs !== undefined ? o.bombs : 2;
    this.weapon = { id: 'blaster', t: Infinity }; this.addons = {};
    this.state = 'play'; this.invulnT = 0; this.slideT = 0; this.slideCd = 0; this.slideDir = [0, 0]; this.fireCd = 0;
    this.showT = 0; this.showCd = 0; this.showGain = 0; this.showPose = 'cheer'; this.hurtT = 0; this.respawnT = 0; this.walkT = 1.2;
    this.dropZ = 0; this.dead = false; this.vx = 0; this.vy = 0; this.lastIntent = null; this.orbit = 0; this.records = []; this.blink = 0;
    this.continues = 0; this.kick = 0; this.rig = MT.lookRig(slot); this.pm = 0;
    this.speedMul = 1; this.bombFlash = 0; this.lastHitBy = null; this.arrowT = 2.5;
  }
  get alive() { return this.state === 'play' || this.state === 'walk'; }
  get inPlay() { return this.state === 'play' || this.state === 'walk' || this.state === 'drop'; }
  get wpn() { return this.weapon.id; }
  get addonsOn() { return Object.keys(this.addons).filter(k => this.addons[k].t > 0); }
  get shielded() { return (this.addons.shield && this.addons.shield.t > 0) || false; }
  get slowed() { return this.W.splatAt(this.x, this.y) ? .6 : 1; }

  // gives a pickup's weapon or add-on, the same way for a claim made by anyone
  give(kind) {
    const T = MT.T.puDuration, def = MT.WEAPONS[kind];
    if (!def) return;
    if (def.kind === 'primary') {
      if (this.weapon.id !== kind) { this.weapon = { id: kind, t: def.dur * T }; this.fireCd = 0; }
      else this.weapon.t = def.dur * T;
      this.W.emit('powerup', { c: this, kind });
    } else if (def.kind === 'addon') { this.addons[kind] = { t: def.dur * T }; this.W.emit('powerup', { c: this, kind }); }
    else if (kind === 'bomb') { if (this.bombs >= 3) this.W.cashGive(this, 2000, null, 'SHOWSTOPPER'); else this.bombs++; this.W.emit('bomb-pickup', { c: this }); }
    else if (kind === 'life') { this.lives++; this.W.emit('encore', { c: this }); }
  }

  // each step: movement, slide, fire, showboat, the timers and the rig's pose (the rig is posed by the world)
  step(dt, I, W) {
    this.kick = Math.max(0, this.kick - dt * 3);
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    this.bombFlash = Math.max(0, this.bombFlash - dt);
    this.arrowT = Math.max(0, this.arrowT - dt);
    for (const k in this.addons) { this.addons[k].t -= dt; if (this.addons[k].t <= 0) { delete this.addons[k]; W.emit('pwrexp', { c: this, kind: k }); } }
    if (this.weapon.id !== 'blaster') { this.weapon.t -= dt; if (this.weapon.t <= 0) { this.weapon = { id: 'blaster', t: Infinity }; W.emit('pwrexp', { c: this, kind: 'blaster' }); } }
    this.speedMul = this.addons.speed ? 1.45 : 1;
    if (this.state === 'dead') { this.respawnT -= dt; if (this.respawnT <= 0) this.beginDrop(W); return; }
    if (this.state === 'drop') { this.dropZ = Math.max(0, this.dropZ - 140 * dt); if (this.dropZ <= 0) { this.state = 'play'; this.invulnT = 2.5; this.bombs = Math.max(1, this.bombs); this.arrowT = 3; W.emit('land', { c: this }); } return; }
    if (this.state === 'out') return;
    if (this.walkT > 0) { this.walkT -= dt; this.state = 'walk'; this.invulnT = Math.max(this.invulnT, .5); this.walkTarget(W, dt); if (this.walkT <= 0) this.state = 'play'; return; }
    if (this.state !== 'play') return;
    const cannot = this.showT > 0;
    if (this.showCd > 0) this.showCd -= dt;
    if (this.slideCd > 0) this.slideCd -= dt;
    if (this.slideT > 0) {   // the slide: a dive in the move direction (or the facing)
      this.slideT -= dt;
      const sp = MT.T.slideSpeed * this.slowed;
      this.move(this.slideDir[0] * sp * dt, this.slideDir[1] * sp * dt, W);
      if (this.slideT <= 0) this.slideCd = MT.T.slideCooldown * (this.addons.speed ? .6 : 1);
    } else if (cannot) {
      this.showT -= dt;
      if (this.showT <= 0) this.finishShowboat(W);
    } else {
      const sp = MT.T.playerSpeed * this.speedMul * this.slowed;
      if (I.move) this.move(I.move[0] * sp * dt, I.move[1] * sp * dt, W);
      if (I.aim !== null) { this.aim = I.aim; this.face = I.aim; }
      else if (I.move && (I.move[0] || I.move[1])) { this.face = Math.atan2(I.move[1], I.move[0]); this.aim = null; }
      if (I.slide && this.slideCd <= 0) this.startSlide(I);
      if (I.bomb) W.showstop(this);
      if (I.showboat && this.showCd <= 0) this.startShowboat(W);
      if (I.fire) this.fire(dt, W, I);
      else this.fireCd = Math.min(this.fireCd, 0);
    }
    this.records.length && this.updateRecords(dt, W);
    if (this.addons.records && !this.records.length) this.makeRecords();
    if (!this.addons.records) this.records.length = 0;
    this.lastIntent = I;
  }
  walkTarget(W, dt) {   // the walk-in: from the entry door to the formation (§5.1)
    const f = W.formation(this.slot), dx = f[0] - this.x, dy = f[1] - this.y, d = Math.hypot(dx, dy);
    if (d > .5) { const s = Math.min(d, 80 * dt); this.move(dx / d * s, dy / d * s, W); this.face = Math.atan2(dy, dx); }
  }
  move(dx, dy, W) {
    this.x += dx; this.y += dy; W.wallClamp(this);
    if (this.state === 'play') W.touchFloor(this);
  }
  startSlide(I) {
    const d = I.move && (I.move[0] || I.move[1]) ? I.move : [Math.cos(this.face), Math.sin(this.face)], L = Math.hypot(d[0], d[1]) || 1;
    this.slideDir = [d[0] / L, d[1] / L]; this.slideT = .28; this.face = Math.atan2(this.slideDir[1], this.slideDir[0]);
    this.W.emit('slide', { c: this });
  }
  startShowboat(W) {
    this.showT = .6; this.showCd = 3; this.showGain = 0; this.poseIdx = (this.poseIdx || 0) + 1; this.showPose = ['cheer', 'hips', 'wave'][this.poseIdx % 3];
    W.emit('showboat-start', { c: this });
  }
  finishShowboat(W) {   // ratings gain 4 + 3n + 3m (cap 30), where n counts within 64 and m within 32 (§5.1)
    let n = 0, m = 0;
    for (const e of W.enemies) if (e.alive && e.counted) { const d = MT.dist(this.x, this.y, e.x, e.y); if (d <= 64) n++; if (d <= 32) m++; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m) * MT.T.ratingsGain * (this.hitInPose ? 0 : 1);
    this.hitInPose = false;
    if (gain > 0) { W.ratingsAdd(gain, 'boat'); W.popup(this.x, this.y, 'STYLE +' + Math.round(gain), this.color); }
    this.boatGain += gain; W.emit('boat', { c: this, gain, n, m });
  }
  fire(dt, W, I) {
    const aim = this.aim !== null ? this.aim : this.face;
    this.fireCd -= dt;
    const id = this.weapon.id;
    if (id === 'laser') { W.laserBeam(this, aim, dt); return; }
    const def = MT.WEAPONS[id], rate = def.rate === 'fireRate' ? MT.T.fireRate : def.rate;
    while (this.fireCd <= 0) {
      this.fireCd += 1 / rate; this.shoot(W, aim, id);
      if (this.fireCd < -.2) this.fireCd = 0;
    }
  }
  shoot(W, aim, id) {
    const mx = this.x + Math.cos(aim) * 10, my = this.y + Math.sin(aim) * 10;
    if (id === 'blaster') { W.pshot(mx, my, aim, MT.T.bulletSpeed, 1 * MT.T.dmgMul, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'spread') { for (const d of [-13, 0, 13]) W.pshot(mx, my, aim + d * Math.PI / 180, MT.T.bulletSpeed, 1 * MT.T.dmgMul, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'rockets') { W.rocket(mx, my, aim, this); W.emit('shoot', { c: this, w: id }); }
    else if (id === 'popcorn') { W.popcorn(this, aim); W.emit('shoot', { c: this, w: id }); }
  }
  makeRecords() { this.records = [{ a: 0 }, { a: Math.PI }]; }
  updateRecords(dt, W) {
    this.orbit += 4.2 * dt;
    for (const o of this.records) { o.x = this.x + Math.cos(this.orbit + o.a) * 26; o.y = this.y + Math.sin(this.orbit + o.a) * 26; }
    for (const o of this.records) W.recordHits(this, o, dt);
  }
  // a hit on the contestant (damage pipeline: §5.1); returns true if it landed
  hurt(dmg, src, W) {
    if (this.state !== 'play' && this.state !== 'walk') return false;
    if (this.W && this.W.run && this.W.run.cheats && this.W.run.cheats.god) return false;
    if (this.invulnT > 0 || this.shielded) return false;
    if (this.slideT > .06) return false;   // the slide's i-frames: its first 0.22 s (slideT runs .28 down to 0)
    this.hp -= dmg; this.hurtT = .35; this.invulnT = MT.T.invulnTime; this.hitInPose = true; this.showT = 0;
    W.emit('hurt', { c: this, dmg, src });
    if (src && src.x !== undefined) { const L = Math.hypot(this.x - src.x, this.y - src.y) || 1; this.x += (this.x - src.x) / L * 6; this.y += (this.y - src.y) / L * 6; W.wallClamp(this); }
    if (this.hp <= 0) this.die(W);
    return true;
  }
  die(W) {
    this.deaths++;
    if (W.run && W.run.mode === 'session') { this.cash = Math.max(0, this.cash - 2500); this.lives = 99; W.emit('death', { c: this }); this.state = 'dead'; this.respawnT = 2.0; this.weapon = { id: 'blaster', t: Infinity }; this.addons = {}; this.records = []; this.slideT = 0; this.showT = 0; this.hp = this.maxHp; return; }
    this.lives = Math.max(0, this.lives - 1); this.weapon = { id: 'blaster', t: Infinity }; this.addons = {}; this.records = [];
    this.slideT = 0; this.showT = 0;
    W.ratingsAdd(-25, 'death'); W.emit('death', { c: this });
    if (this.lives > 0) { this.state = 'dead'; this.respawnT = 2.0; }
    else { this.state = 'out'; this.hp = 0; this.respawnT = 0; W.emit('out', { c: this }); }
    this.hp = this.maxHp;
  }
  beginDrop(W) {   // the cable drop: from the ceiling under a spotlight, near the entry door
    const p = W.dropPoint(this.slot);
    this.x = p[0]; this.y = p[1]; this.state = 'drop'; this.dropZ = 70; this.walkT = 0; this.hp = this.maxHp; this.kick = 1;
    this.bombs = Math.max(this.bombs, 1); W.emit('respawn', { c: this });
  }
  // the Start press brings an out contestant back: full lives, half the winnings (the producer's cut)
  continueOn(W) {
    this.state = 'drop'; this.dropZ = 70; this.lives = this.diff.lives; this.hp = this.maxHp; this.cash = Math.floor(this.cash / 2);
    this.continues++; this.bombs = Math.max(this.bombs, 1); this.records = []; this.addons = {}; this.weapon = { id: 'blaster', t: Infinity };
    const p = W.dropPoint(this.slot); this.x = p[0]; this.y = p[1]; W.emit('steal', { c: this });
  }
  get rsState() {
    const pose = this.state === 'out' || this.state === 'dead' ? 'down' : this.showT > 0 ? this.showPose : undefined;
    return { x: this.x, y: this.y, z: this.dropZ, vx: this.vx, vy: this.vy, facing: this.face, aim: this.aim !== null ? this.aim : undefined,
      point: this.fireCd > -.05 && this.aim !== null && this.state === 'play' && !this.showT, hurt: this.hurtT > 0, pose, flip: this.slideT > 0 ? 1 - this.slideT / .28 : undefined,
      expr: this.showT > 0 ? 'smile' : this.hurtT > 0 ? 'wince' : undefined, down: this.state === 'out' ? 1 : undefined };
  }
}

/* ---------- the pools: pShots (team p) and fShots (team f), rockets, popcorn bags and kernels ---------- */
MT.projectiles = {
  pshot(W, x, y, a, speed, dmg, owner) {
    W.pShots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 2.5, dmg, owner, life: .9, kind: 'bolt' });
  },
  rocket(W, x, y, a, owner) {
    W.rockets.push({ x, y, a, speed: 180, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: .9, owner, t: 0, trail: [] });
  },
  popcorn(W, c, a) {
    const tx = c.x + Math.cos(a) * 90, ty = c.y + Math.sin(a) * 90;
    W.lobs.push({ sx: c.x, sy: c.y, x: c.x, y: c.y, z: 4, tx, ty, t: 0, dur: .6, owner: c, kind: 'popcorn' });
  },
  updateRockets(W, dt) {
    for (const k of W.rockets) {
      k.t += dt; k.life -= dt; const sp = Math.min(300, 180 + 120 * k.t / .5);
      k.x += Math.cos(k.a) * sp * dt; k.y += Math.sin(k.a) * sp * dt;
      k.trail.push([k.x, k.y]); if (k.trail.length > 6) k.trail.shift();
      let hit = null;
      for (const e of W.enemies) if (e.alive && MT.dist(k.x, k.y, e.x, e.y) < e.r + 3) { hit = e; break; }
      if (hit || k.life <= 0 || !MT.inArena(k.x, k.y, -4)) { W.rocketBoom(k, hit); k.dead = true; }
    }
    W.rockets = W.rockets.filter(k => !k.dead);
  },
  updateLobs(W, dt) {
    for (const l of W.lobs) {
      l.t += dt; const u = Math.min(1, l.t / l.dur);
      l.x = lerpN(l.sx, l.tx, u); l.y = lerpN(l.sy, l.ty, u); l.z = 4 + 40 * Math.sin(Math.PI * u);
      if (u >= 1) { l.dead = true; if (l.kind === 'tomato') W.tomatoSplat(l); else W.popcornBoom(l); }
    }
    W.lobs = W.lobs.filter(l => !l.dead);
  },
  updateShots(W, dt) {
    for (const s of W.pShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || !MT.inArena(s.x, s.y, -1)) s.dead = true;
      else if (W.doorBlocks(s.x, s.y)) s.dead = true;
    }
    W.pShots = W.pShots.filter(s => !s.dead);
    for (const s of W.fShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.z !== undefined) { s.vz -= 500 * dt; s.z = Math.max(0, s.z + s.vz * dt); }
      if (s.life <= 0 || !MT.inArena(s.x, s.y, -2)) s.dead = true;
    }
    W.fShots = W.fShots.filter(s => !s.dead);
  }
};
function lerpN(a, b, t) { return a + (b - a) * t; }

/* ---- 06-enemies.js ---- */
/* MASH TV — 06-enemies: the archetypes (§5.8). Each has its HP, speed, cash and ratings, its drop table and an update
 * that telegraphs every attack for at least 0.3 s. Enemies spawn from doors, the audience or the ceiling (drop). */

// the drop table: [item, chance]; cash and prizes are rolled by the world, capsules by a random kind
MT.DROPS = {
  goon: [['bill', .08], ['capsule', .012], ['prize', .01]], clapbot: [['bill', .1]], popper: [['stack', .1], ['capsule', .03]],
  mime: [['bill', .3]], disco: [['stack', .2], ['capsule', .05]], discoBig: [['stack', .4], ['capsule', .1]], heckler: [['prize', .06], ['capsule', .04]],
  tank: [['case', .15], ['capsule', .15]], snake: [['case', .3]], brute: [['case', .4], ['capsule', .25]], hecklerKing: [], lock: []
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];

class Enemy {
  constructor(W, kind, x, y, o = {}) {
    const D = MT.ENEMY[kind];
    this.W = W; this.kind = kind; this.D = D; this.id = ++MT.eidSeq; this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.z = 0;
    this.r = o.r || D.r; this.face = o.face !== undefined ? o.face : MT.rng.ai() * TAU_;
    const hpMul = MT.T.enemyHp * (o.hpMul || 1);
    this.maxHp = Math.max(1, Math.round((o.hp || D.hp) * hpMul)); this.hp = this.maxHp;
    this.alive = true; this.counted = o.counted !== undefined ? o.counted : D.counted !== false; this.t = 0; this.cd = o.cd || (D.cd0 !== undefined ? D.cd0 : .5 + MT.rng.ai());
    this.entering = !!o.entering; this.stun = 0; this.flash = 0; this.wind = 0; this.state = 'idle';
    this.carry = !!o.carry; this.killer = null; this.spawnIdx = o.idx || 0; this.puddle = 0;
    this.rig = null; this.parent = o.parent || null; this.seg = o.seg || 0; this.hist = o.hist || null; this.tgt = null;
    if (D.init) D.init(this, o);
  }
  get speed() { return this.D.speed * MT.T.enemySpeed * (MT.run && MT.run.diff ? MT.run.diff.enemySpeed : 1) * (this.stun > 0 ? 0 : 1) * (this.puddle > 0 ? .6 : 1); }
  get rat() { return this.D.rat || 1; }
  get cash() { return this.D.cash || 0; }
  get hpPct() { return this.hp / this.maxHp; }
}
const TAU_ = Math.PI * 2;

// the spawn and movement helpers shared by every archetype
MT.enemyHelpers = {
  near(e, W) { return W.nearestPlayer(e.x, e.y); },
  stepToward(e, tx, ty, sp, dt, W) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (!e.entering) MT.clampArena(e, 2);
  },
  wander(e, dt) { e.face += Math.sin(e.t * 2 + e.r) * dt * 2; },
  separate(e, W) {   // a soft push from the others, so the crowd doesn't stack
    for (const o of W.enemies) {
      if (o === e || !o.alive || o.parent === e || e.parent === o || o.kind === 'lock' || o.kind === 'crate') continue;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 10) { const push = (10 - d) * .5; e.x += dx / d * push * .3; e.y += dy / d * push * .3; }
    }
    if (!e.entering) MT.clampArena(e, 2);   // (the push never takes a walker through a wall)
  },
  inRange(e, p, r) { return p && MT.dist(e.x, e.y, p.x, p.y) < r; }
};

// the archetypes. Speeds in units a second, rat is the ratings gain, cash the kill value (§5.8).
MT.ENEMY = {
  goon: { hp: 1, r: 6, speed: 52, rat: 1, cash: 100, drops: 'goon',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      const d = MT.dist(e.x, e.y, p.x, p.y);
      if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.swing = .15; if (MT.dist(e.x, e.y, p.x, p.y) < 16) W.hurtPlayer(p, MT.T.contactDmg, e); e.cd = 1.0; } return; }
      if (e.swing > 0) { e.swing -= dt; return; }
      if (d < 16 && e.cd <= 0) { e.wind = .3; W.emit('telegraph', { e, kind: 'goon' }); return; }
      e.cd -= dt;
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed * (1 + .12 * (Math.sin(e.t * 3 + e.r))), dt, W);
      MT.enemyHelpers.separate(e, W);
    }, cd0: .5 },
  clapbot: { hp: 1, r: 6, speed: 115, rat: 1, cash: 150, drops: 'clapbot',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.hop > 0) { e.hop -= dt; e.x += e.vx * dt; e.y += e.vy * dt; if (!e.entering) MT.clampArena(e, 2); }
      else {
        e.hopCd = (e.hopCd || 0) - dt;
        if (e.hopCd <= 0) {
          e.wind = .25; e.hopCd = .4;
          const a = Math.atan2(p.y - e.y, p.x - e.x) + (MT.rng.ai() * 2 - 1) * .7;
          e.hopA = a;
        }
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.hop = .2; e.vx = Math.cos(e.hopA) * e.speed; e.vy = Math.sin(e.hopA) * e.speed; e.face = e.hopA; W.emit('hop', { e }); } }
      }
      e.clap = (e.clap || 0) + dt * 12;
      if (MT.dist(e.x, e.y, p.x, p.y) < 9 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
      MT.enemyHelpers.separate(e, W);
    }, cd0: 0 },
  popper: { hp: 2, r: 7, speed: 38, rat: 2, cash: 250, drops: 'popper',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.fuse !== undefined) { e.fuse -= dt; e.swell = 1 - Math.max(0, e.fuse) / .6; if (e.fuse <= 0) W.burstShards(e, 8, 90, 1.2); if (e.fuse <= 0) { e.alive = false; W.enemyDied(e, p, 'burst'); } return; }
      if (MT.dist(e.x, e.y, p.x, p.y) < 18) { e.fuse = .6; W.emit('telegraph', { e, kind: 'popper' }); return; }
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed * (1 + .3 * Math.abs(Math.sin(e.t * 6))), dt, W);
      MT.enemyHelpers.separate(e, W);
    }, cd0: 0 },
  mime: { hp: 1, r: 6, speed: 0, rat: 2, cash: 300, drops: 'mime', counted: false,
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      e.alpha = .45;
      if (e.blast !== undefined) { e.blast -= dt; if (e.blast <= 0) { e.alive = false; W.blastRing(e.x, e.y, 36, 1, e); W.enemyDied(e, null, 'blast'); } return; }
      if (MT.dist(e.x, e.y, p.x, p.y) < 34) { e.blast = .7; W.emit('telegraph', { e, kind: 'mime' }); }
    }, cd0: 0 },
  disco: { hp: 5, r: 8, speed: 70, rat: 3, cash: 400, drops: 'disco',
    init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); },
    update(e, dt, W) {
      e.x += e.vx * dt * MT.T.enemySpeed; e.y += e.vy * dt * MT.T.enemySpeed;
      const A = MT.ARENA;
      if (e.x < A.X0 + 8 || e.x > A.X1 - 8) { e.vx = -e.vx; e.x = Math.max(A.X0 + 8, Math.min(A.X1 - 8, e.x)); }
      if (e.y < A.Y0 + 8 || e.y > A.Y1 - 8) { e.vy = -e.vy; e.y = Math.max(A.Y0 + 8, Math.min(A.Y1 - 8, e.y)); }
      e.spin = (e.spin || 0) + dt * 2;
      if (e.fire !== undefined) { e.fire -= dt; if (e.fire <= 0) { e.fire = undefined; const ang = e.pattern ? [0, 1, 2, 3].map(i => i * Math.PI / 2) : [0, 1, 2, 3].map(i => Math.PI / 4 + i * Math.PI / 2); for (const a of ang) W.fShot(e.x, e.y, a + (e.pattern ? 0 : 0), 110 * MT.T.enemyBulletSpeed * (MT.run.diff.bullet), 'beam'); e.pattern = !e.pattern; e.flash = 0; } return; }
      e.cd -= dt; if (e.cd <= 0) { e.cd = 3; e.fire = .4; e.flash = .4; W.emit('telegraph', { e, kind: 'disco' }); }
      const p = W.nearestPlayer(e.x, e.y); if (p && MT.dist(e.x, e.y, p.x, p.y) < e.r + 6 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 1.2 },
  discoBig: { hp: 10, r: 11, speed: 70, rat: 3, cash: 800, drops: 'discoBig', base: 'disco',
    init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); },
    update(e, dt, W) { MT.ENEMY.disco.update(e, dt, W); },
    onDeath(e, W) { for (let i = 0; i < 2; i++) W.spawnEnemy('discoSmall', e.x + (i ? 6 : -6), e.y, { hp: 3, hpMul: 1, counted: true, cd: 2 }); }, cd0: 1.2 },
  discoSmall: { hp: 3, r: 7, speed: 70, rat: 2, cash: 400, drops: 'disco', update(e, dt, W) { MT.ENEMY.disco.update(e, dt, W); }, init(e) { e.vx = 70 * (MT.rng.ai() < .5 ? 1 : -1); e.vy = 70 * (MT.rng.ai() < .5 ? 1 : -1); }, cd0: 2 },
  heckler: { hp: 3, r: 6, speed: 45, rat: 2, cash: 350, drops: 'heckler',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.entering) { e.arc = e.arc || { t: 0 }; e.arc.t += dt; const u = Math.min(1, e.arc.t / .7); e.x = lerpN2(e.arc.sx, e.arc.tx, u); e.y = lerpN2(e.arc.sy, e.arc.ty, u); e.z = 30 * Math.sin(Math.PI * u); if (u >= 1) { e.entering = false; e.z = 0; } return; }
      const d = MT.dist(e.x, e.y, p.x, p.y);
      const want = d < 70 ? -1 : d > 110 ? 1 : 0;
      if (want) { const dx = p.x - e.x, dy = p.y - e.y, L = d || 1; e.x += dx / L * want * e.speed * dt; e.y += dy / L * want * e.speed * dt; }
      e.x += Math.cos(e.t * .8 + e.r) * e.speed * .4 * dt; e.y += Math.sin(e.t * .8 + e.r) * e.speed * .4 * dt;
      if (!e.entering) MT.clampArena(e, 3);
      e.face = Math.atan2(p.y - e.y, p.x - e.x);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.2; W.lobTomato(e, p, .6); }
    }, cd0: 1.5 },
  hecklerKing: { hp: 12, r: 7, speed: 45, rat: 6, cash: 1500, drops: 'hecklerKing', base: 'heckler', carry: true,
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.entering) { MT.ENEMY.heckler.update(e, dt, W); return; }
      const d = MT.dist(e.x, e.y, p.x, p.y), want = d < 70 ? -1 : d > 110 ? 1 : 0;
      if (want) { const dx = p.x - e.x, dy = p.y - e.y, L = d || 1; e.x += dx / L * want * e.speed * dt; e.y += dy / L * want * e.speed * dt; }
      MT.clampArena(e, 3); e.face = Math.atan2(p.y - e.y, p.x - e.x); e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.6; for (let i = 0; i < 3; i++) setTimeout_(() => W.lobTomato(e, p, .6), i * 300); }
    }, cd0: 1.5 },
  tank: { hp: 14, r: 12, speed: 26, rat: 6, cash: 1000, drops: 'tank',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      const want = Math.atan2(p.y - e.y, p.x - e.x);
      let da = want - e.turret; da = Math.atan2(Math.sin(da), Math.cos(da)); e.turret += Math.max(-1.4 * dt, Math.min(1.4 * dt, da));
      e.face += Math.sin(e.t * .7) * dt * .4;
      if (!e.stop) MT.enemyHelpers.stepToward(e, e.x + Math.cos(e.face) * 50, e.y + Math.sin(e.face) * 50, e.speed, dt, W);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 2.4; e.flashT = .4; W.emit('telegraph', { e, kind: 'tank' }); e.fireAt = .4; }
      if (e.fireAt !== undefined) { e.fireAt -= dt; if (e.fireAt <= 0) { e.fireAt = undefined; W.fShot(e.x + Math.cos(e.turret) * 12, e.y + Math.sin(e.turret) * 12, e.turret, 120 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'shell'); W.emit('tank-fire', { e }); } }
      if (e.flashT > 0) e.flashT -= dt;
      e.tread = (e.tread || 0) + Math.hypot(e.vx || 0, e.vy || 0) * dt * .2;
    }, cd0: 1, onDeath(e, W) { W.blastRing(e.x, e.y, 30, 1, e); } },
  snake: { hp: 8, r: 6, speed: 60, rat: 5, cash: 1200, drops: 'snake', custom: true,
    init(e) { e.hist = []; e.lunge = 0; },
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.parent) { return; }   // segments follow their head's path history
      e.weave = (e.weave || 0) + dt * 6;
      e.cd -= dt;
      if (e.lungeT !== undefined) { e.lungeT -= dt; if (e.lungeT <= 0) { e.lungeT = undefined; e.cd = 3; } else { e.lunge = 1; } }
      if (e.cd <= 0 && e.lungeT === undefined) { e.cd = 1.5; e.lungeT = .5; W.emit('telegraph', { e, kind: 'snake' }); }
      const sp = e.speed * (e.lunge ? 1.5 : 1) * MT.T.enemySpeed;
      const dx = p.x - e.x, dy = p.y - e.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, w = Math.sin(e.weave) * .6;
      MT.enemyHelpers.stepToward(e, e.x + (dx / L + nx * w) * 30, e.y + (dy / L + ny * w) * 30, sp, dt, W);
      e.lunge = 0;
      e.hist.unshift([e.x, e.y]); if (e.hist.length > 80) e.hist.length = 80;
      if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 1.2 },
  snakeSeg: { hp: 2, r: 4.5, speed: 0, rat: 1, cash: 150, drops: null, update(e, dt, W) {
      const h = e.parent; if (!h || !h.alive) { e.alive = false; return; }
      const i = Math.min(h.hist.length - 1, (e.seg + 1) * 6); const q = h.hist[Math.max(0, i)] || [h.x, h.y];
      e.x = q[0]; e.y = q[1];
      const p = W.nearestPlayer(e.x, e.y); if (p && MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .6; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 0 },
  brute: { hp: 24, r: 14, speed: 40, rat: 8, cash: 2000, drops: 'brute',
    update(e, dt, W) {
      const p = W.nearestPlayer(e.x, e.y); if (!p) return;
      if (e.stun > 0) { e.stun -= dt; e.wobble = (e.wobble || 0) + dt * 10; if (e.stun <= 0) e.stun = 0; return; }
      e.cd -= dt;
      if (e.charge > 0) {   // a straight charge; a wall stuns it
        e.charge -= dt; e.x += e.vx * dt; e.y += e.vy * dt;
        const A = MT.ARENA; if (e.x < A.X0 + 14 || e.x > A.X1 - 14 || e.y < A.Y0 + 14 || e.y > A.Y1 - 14) { e.stun = 1.5; e.charge = 0; W.emit('wallhit', { e }); W.shake(3); MT.clampArena(e, 14); }
        if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 6 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, 2 * MT.T.contactDmg, e); e.touchCd = .6; }
        e.touchCd = (e.touchCd || 0) - dt; return;
      }
      if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.charge = 1.4; const a = Math.atan2(p.y - e.y, p.x - e.x); e.vx = Math.cos(a) * 220; e.vy = Math.sin(a) * 220; } return; }
      if (e.cd <= 0) { e.cd = 4; e.tele = .8; W.emit('telegraph', { e, kind: 'brute' }); return; }
      MT.enemyHelpers.stepToward(e, p.x, p.y, e.speed, dt, W);
      if (MT.dist(e.x, e.y, p.x, p.y) < e.r + 4 && (e.touchCd || 0) <= 0) { W.hurtPlayer(p, MT.T.contactDmg, e); e.touchCd = .9; }
      e.touchCd = (e.touchCd || 0) - dt;
    }, cd0: 2 },
  lock: { hp: 15, r: 7, speed: 0, rat: 2, cash: 500, counted: false, drops: null, update() {} },
  crate: { hp: 3, r: 8, speed: 0, rat: 0, cash: 0, counted: false, drops: null, update() {} }
};
const lerpN2 = (a, b, t) => a + (b - a) * t;
const setTimeout_ = (fn, ms) => { (MT.G && MT.G.after) ? MT.G.after(ms / 1000, fn) : fn(); };
// a base kind inherits the behaviour of the kind it names
for (const k in MT.ENEMY) { const D = MT.ENEMY[k]; if (D.base) { const B = MT.ENEMY[D.base]; for (const f of ['update', 'init', 'onDeath']) if (!D[f] && B[f]) D[f] = B[f]; if (D.base === 'heckler') D.update = D.update || B.update; } }
MT.ENEMY.discoBig.init = MT.ENEMY.disco.init; MT.ENEMY.discoBig.onDeath = MT.ENEMY.discoBig.onDeath;
// the shape of an enemy's rig, for the spawn and the draw
MT.kindLabel = { goon: 'STUDIO SECURITY', clapbot: 'APPLAUSE ROBOT', popper: 'PARTY POPPER', mime: 'LAND MIME', disco: 'DISCO BALL', discoBig: 'DISCO BALL',
  heckler: 'STUDIO AUDIENCE', hecklerKing: 'THE HECKLER KING', tank: 'DOLLY TANK', snake: 'CABLE SNAKE', brute: 'THE CEREAL KILLER', lock: 'VAULT LOCK', crate: 'PRIZE CRATE' };
// the paparazzi in the Green Room: harmless, they wander and flash their cameras every few seconds
MT.ENEMY.paparazzo = { hp: 1, r: 6, speed: 30, rat: 0, cash: 0, counted: false, drops: null,
  update(e, dt, W) { e.t += 0; e.wander = (e.wander || 0) + dt; e.face += Math.sin(e.t + e.r) * dt; e.x += Math.cos(e.face) * 14 * dt; e.y += Math.sin(e.face) * 14 * dt; MT.clampArena(e, 8); e.flashT = (e.flashT || 2) - dt; if (e.flashT <= 0) { e.flashT = 3; e.flashW = .15; W.emit('flash', { e }); } e.flashW = Math.max(0, (e.flashW || 0) - dt); } };
MT.RIGS.paparazzo = { kind: 'humanoid', o: { size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: 'cap', colors: { cloth: '#6a5a4a', coat: '#6a5a4a', pants: '#2a2a2a', skin: '#e0b090', hair: '#3a2a20', boot: '#111', glove: '#111' } } };

/* ---- 07-world.js ---- */
/* MASH TV — 07-world: the room as a simulation (§5.5–§5.7, §5.4, §5.3). One World per room: its arena, doors, waves, enemies,
 * shots, pickups, hazards, the ratings, and the room phases ENTER → INTRO → WAVES → CLEAR → EXIT. It emits events (W.evq); the
 * play scene turns them into sound, banners and lines through the reaction table. It draws nothing (09-draw does). */

// the generator scheduler: a task yields a number (seconds), a function (a condition), or nothing (one step)
MT.task = (gen) => ({ gen, wait: 0, cond: null, done: false });

class World {
  constructor(run, roomId, o = {}) {
    this.run = run; this.id = roomId; this.R = MT.ROOMS[roomId]; this.set = this.R.set; this.ep = this.R.ep;
    this.map = MT.buildMap(this.set); this.time = 0; this.phase = 'enter'; this.phaseT = 0; this.entry = o.entry || MT.ENTRY_DOOR(roomId) || 'S';
    this.enemies = []; this.pShots = []; this.fShots = []; this.rockets = []; this.lobs = []; this.pickups = []; this.splats = []; this.decals = [];
    this.evq = []; this.tasks = []; this.spawnQ = []; this.doorState = {}; this.pops = []; this.banners = []; this.stats = { kills: 0, hits: 0, spawned: 0, kinds: {} };
    this.kindsSeen = new Set(); this.players = o.players;
    this.solids = []; this.hazards = []; this.vents = []; this.conveyors = []; this.keyHolder = null; this.keyPlaced = false; this.waveIdx = 0;
    this.waveStart = 0; this.clearT = 0; this.clearTime = 0; this.hurryT = 0; this.exitT = 0; this.exitPick = null; this.wavesDone = false;
    this.stunt = false; this.lowRatT = 0; this.mimeOpen = false; this.survive = null; this.cage = null; this.bonusAt = 0; this.primeAt = -1;
    this.players_n = this.players.length || 1; this.doorDelay = 0; this.lastPlayerXY = [0, 0]; this.reactEvents = [];
    this.ceilingPts = [];
    for (const d of ['N', 'S', 'E', 'W']) this.doorState[d] = { state: 'closed', t: 0, up: 0, queue: [], exitOn: false, lastSpawn: 0 };
    this.buildRoom();
    if (this.R.type === 'boss') this.boss = new MT.BOSS_CLASS[this.R.boss](this);
  }
  get diffMul() { return this.run.diff.mul; }
  get aliveCounted() { return this.enemies.filter(e => e.alive && e.counted).length; }
  get multiplier() { return this.primeOn ? 5 : this.ratingMul(this.run.ratings.R); }
  ratingMul(R) { return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  emit(type, data = {}) { this.evq.push({ type, data, t: this.time }); }
  // the walk-in: contestants start at the entry door and walk to a 2 x 2 formation 40 units inside (§5.1)
  formationCentre() { return { S: [184, 192], N: [184, 48], W: [48, 120], E: [320, 120] }[this.entry] || [184, 192]; }
  formation(slot) { const c = this.formationCentre(), f = [[-14, 8], [14, 8], [-14, -8], [14, -8]][slot % 4]; return [c[0] + f[0], c[1] + f[1]]; }
  doorStart() { return { S: [184, 218], N: [184, 22], W: [22, 120], E: [346, 120] }[this.entry] || [184, 218]; }
  dropPoint(slot) { const c = this.formationCentre(); return [c[0] + (slot % 2 ? 22 : -22), c[1]]; }
  nearestPlayer(x, y) {
    let best = null, bd = 1e9;
    for (const c of this.players) { if (!c.inPlay || c.state === 'out') continue; const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  get livePlayers() { return this.players.filter(c => c.state === 'play' || c.state === 'walk' || c.state === 'drop' || c.state === 'dead'); }
  hurtPlayer(c, dmg, src) {
    const real = Math.max(1, Math.round(dmg)); if (dmg <= 0) return false;
    if (!c.hurt(real, src, this)) return false;
    this.run.ratings.R = Math.max(0, this.run.ratings.R - 12 * MT.T.ratingsGain); this.run.ratings.lastGain = this.time;
    return true;
  }
  wallClamp(c) {
    const A = MT.ARENA, pad = 6;
    const openN = this.doorState.N.state === 'exit', openS = this.doorState.S.state === 'exit', openE = this.doorState.E.state === 'exit', openW = this.doorState.W.state === 'exit';
    // a door that is an exit (or open) lets a contestant through its gap, to the trigger
    const inN = c.x > 160 && c.x < 208, inS = inN, inE = c.y > 96 && c.y < 144, inW = inE;
    if (c.x < A.X0 + pad && !(openW && inW)) c.x = A.X0 + pad;   // (exits only: an open door during a wave is a wall)
    if (c.x > A.X1 - pad && !(openE && inE)) c.x = A.X1 - pad;
    if (c.y < A.Y0 + pad && !(openN && inN)) c.y = A.Y0 + pad;
    if (c.y > A.Y1 - pad && !(openS && inS)) c.y = A.Y1 - pad;
    if (c.y < A.Y0 - 14 && openN) c.y = A.Y0 - 14; if (c.y > A.Y1 + 14 && openS) c.y = A.Y1 + 14;
    if (c.x < A.X0 - 14 && openW) c.x = A.X0 - 14; if (c.x > A.X1 + 14 && openE) c.x = A.X1 + 14;
    for (const s of this.solids) { const dx = c.x - s.x, dy = c.y - s.y, d = Math.hypot(dx, dy), m = s.r + c.r; if (d < m && d > 0) { c.x = s.x + dx / d * m; c.y = s.y + dy / d * m; } }
    if (this.cage && this.cage.up < 1) { const dx = c.x - this.cage.x, dy = c.y - this.cage.y, d = Math.hypot(dx, dy); if (d < 14 + c.r && d > 0) { c.x = this.cage.x + dx / d * (14 + c.r); c.y = this.cage.y + dy / d * (14 + c.r); } }
  }
  touchFloor(c) { /* conveyors push, splats slow: applied in step */ }
  doorBlocks(x, y) {   // a closed door is a wall: shots stop at it
    for (const d of ['N', 'S', 'E', 'W']) {
      const st = this.doorState[d]; if (st.state === 'exit' || st.state === 'open' || st.state === 'opening') continue;
      const D = MT.DOORS[d];
      if (d === 'N' && y < A_Y0 + 2 && x > 160 && x < 208) return true;
      if (d === 'S' && y > A_Y1 - 2 && x > 160 && x < 208) return true;
      if (d === 'W' && x < A_X0 + 2 && y > 96 && y < 144) return true;
      if (d === 'E' && x > A_X1 - 2 && y > 96 && y < 144) return true;
    }
    return false;
  }
  splatAt(x, y) { for (const s of this.splats) if (s.t > 0 && MT.dist(s.x, s.y, x, y) < s.r) return true; return false; }
  ratingsAdd(amount, why) {
    const rt = this.run.ratings; const k = MT.T.ratingsGain;
    const gain = amount > 0 ? amount * k : amount;
    rt.R = clampN(rt.R + gain, 0, 100); if (amount > 0) rt.lastGain = this.time;
    if (rt.R >= 100 && rt.primeCD <= 0 && !this.primeOn) this.startPrime();
  }
  startPrime() {
    this.primeOn = true; this.primeT = MT.T.primeTime; this.run.ratings.primeCD = 20;
    this.emit('prime', {}); for (let i = 0; i < 3; i++) this.spawnPickup(['capsule'], MT.rand(40, 330), MT.rand(30, 210), { cap: MT.pick(MT.CAPSULES) });
  }
  popup(x, y, text, color) { this.pops.push({ x, y, z: 14, text: String(text), color: color || '#ffe080', t: 1.2 }); }
  shake(n) { this.shakeN = Math.max(this.shakeN || 0, n); }
  // cash in the collector's pocket, ratings and the multiplier (§5.3)
  cashGive(c, amount, pos, label) {
    const v = Math.round(amount * this.multiplier * (this.roomCashMul || 1) * (label === 'pick' ? MT.T.cashMul : 1));
    c.cash += v; this.popup(pos ? pos.x : c.x, pos ? pos.y : c.y, '+$' + v.toLocaleString('en-US') + (label && label !== 'pick' ? ' ' + label : ''), c.color);
    this.emit('cash', { c, v }); this.checkEncore(c); return v;
  }
  // an extra life at each winnings threshold: $250,000, $750,000, $1,500,000 and $3,000,000 (§5.1)
  checkEncore(c) {
    c.lifeMark = c.lifeMark || 0;
    while (c.lifeMark < MT.LIFE_MARKS.length && c.cash >= MT.LIFE_MARKS[c.lifeMark]) { c.lifeMark++; c.lives++; this.emit('encore', { c }); }
  }
  // the room's initial state: door shutters, the walls, the key rules and the enemies waiting in the room
  buildRoom() {
    const R = this.R;
    this.roomCashMul = R.cashMul || 1;
    this.dropBoost = R.dropBoost || 1;
    if (R.key === 'crate') this.keyCrate = MT.rng.spawn() * (R.crates || []).length | 0;
    for (const [cx, cy] of (R.crates || [])) { const [x, y] = MT.cellXY(cx, cy); this.enemies.push(this.mk('crate', x, y, { counted: false })); this.solids.push({ x, y, r: 8 }); }
    for (const [cx, cy] of (R.locks || [])) { const x = 24 + cx * 16, y = 14; this.enemies.push(this.mk('lock', x, y, { counted: false })); }
    if (R.key === 'vault') this.vaultLocks = (R.locks || []).length;
    for (const [kind, cx, cy] of (R.place || [])) { const [x, y] = MT.cellXY(cx, cy); const e = this.mk(kind, x, y, { counted: false }); e.mimeKey = true; this.enemies.push(e); }
    if (R.key === 'mimes') this.mimesLeft = (R.place || []).length;
    for (const h of (R.hazards || [])) this.setupHazard(h);
    this.scheduleItems();
    if (R.key === 'place') { const [cx, cy] = R.keyAt; const [x, y] = MT.cellXY(cx, cy); this.keyPickup = this.mkPickup('key', x, y, { persist: true, belt: true }); this.pickups.push(this.keyPickup); }
    if (R.type === 'key' && R.survive) { this.cage = { x: 184, y: 120, r: 14, up: 0 }; this.keyPickup = this.mkPickup('key', 184, 120, { persist: true, caged: true }); this.pickups.push(this.keyPickup); }
    this.phase = 'enter'; this.phaseT = 0; this.placePlayers();
  }
  setupHazard(h) {
    if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const r = h.rows[i], y0 = 24 + (r - 1) * 16 - 4, dir = h.dirs[i]; this.conveyors.push({ y0, y1: y0 + 32, dir, dirTimer: 12, warn: 0, rowIdx: r }); }
    if (h.kind === 'vents') { this.vents = h.cells.map(([cx, cy], i) => ({ x: 24 + cx * 16, y: 24 + cy * 16, cx, cy, state: 'idle', t: 0, id: i })); this.ventCycle = 0; this.ventT = 1.5; }
  }
  placePlayers() {
    const d = this.doorStart();
    this.players.forEach((c, i) => {
      if (c.state === 'out') return;
      c.x = d[0] + (i % 2 ? 10 : -10) * (this.entry === 'S' || this.entry === 'N' ? 1 : 0);
      c.y = d[1] + (i % 2 ? 10 : -10) * (this.entry === 'W' || this.entry === 'E' ? 1 : 0);
      c.state = 'walk'; c.walkT = 1.2; c.invulnT = 2; c.arrowT = 3;
    });
  }

  mk(kind, x, y, o = {}) {
    const e = new Enemy(this, kind, x, y, o);
    if (o.carry || (this.R.key === 'carrier' && this.R.carrier === kind)) e.carry = true;
    return e;
  }
  spawnEnemy(kind, x, y, o = {}) {
    if (this.enemies.length > 260) return null;
    const e = this.mk(kind, x, y, o);
    if (e.D.custom && kind === 'snake') { for (let k = 0; k < 10; k++) { const s = new Enemy(this, 'snakeSeg', x, y, { parent: e, seg: k, counted: true }); this.enemies.push(s); } }
    this.enemies.push(e); this.kindsSeen.add(kind); this.stats.spawned++; this.stats.kinds[kind] = (this.stats.kinds[kind] || 0) + 1;
    return e;
  }
  // a spawn request from a door, the audience or the ceiling (§5.5)
  spawnAt(where, kind, n, gap) {
    for (let i = 0; i < n; i++) {
      const t = i * gap * MT.T.spawnGap;
      this.spawnQ.push({ t: this.time + t, where, kind, idx: i });
    }
  }
  doorPoint(d) { const D = MT.DOORS[d]; return [D.x + D.out[0] * 20, D.y + D.out[1] * 20]; }
  // runs one queued spawn: a door opens for it, a heckler arcs in, a drop lands from the ceiling
  runSpawn(s) {
    const { where, kind } = s;
    if (where === 'audience') {
      const side = MT.rng.spawn() < .5 ? 'W' : 'E', sx = side === 'W' ? -30 : 398, sy = MT.rand(60, 180);
      const tx = side === 'W' ? MT.rand(30, 80) : MT.rand(290, 340), ty = MT.rand(50, 190);
      const e = this.spawnEnemy(kind, sx, sy, { entering: true, cd: 1.6 }); if (e) { e.arc = { sx, sy, tx, ty, t: 0 }; e.z = 0; }
      return;
    }
    if (where === 'drop') {
      const p = this.randomFreePoint(); this.dropShadows = this.dropShadows || []; this.dropShadows.push({ x: p[0], y: p[1], t: .6, kind });
      this.pendingDrop = this.pendingDrop || []; this.pendingDrop.push({ x: p[0], y: p[1], kind, t: .6 });
      return;
    }
    if (Array.isArray(where)) { const [cx, cy] = where; const [x, y] = MT.cellXY(cx, cy); this.spawnEnemy(kind, x, y, { }); return; }
    const d = where === 'random' ? MT.pick(['N', 'S', 'E', 'W'], MT.rng.spawn) : where;
    const D = MT.DOORS[d]; if (!D) return;
    const st = this.doorState[d];
    if (st.state === 'closed' || st.state === 'closing') { st.state = 'opening'; st.t = 0; this.emit('door-open', { d }); }
    const [x, y] = this.doorPoint(d);
    this.spawnEnemy(kind, x, y, { entering: true, face: Math.atan2(D.out[1], D.out[0]) + (MT.rng.spawn() - .5) * .6 });
    st.lastSpawn = this.time;
  }
  randomFreePoint() {   // a free point at least 50 from every contestant
    for (let i = 0; i < 60; i++) {
      const x = MT.rand(40, 330), y = MT.rand(40, 200);
      if (this.players.every(c => MT.dist(c.x, c.y, x, y) >= 50)) return [x, y];
    }
    return [184, 120];
  }
  spawnPickup(kinds, x, y, o = {}) { const k = MT.pick(kinds); const p = this.mkPickup(k, x, y, o); this.pickups.push(p); return p; }
  mkPickup(kind, x, y, o = {}) {
    const P = { kind, x, y, z: 0, life: o.persist ? Infinity : 9, age: 0, persist: !!o.persist, cap: o.cap, belt: o.belt, caged: o.caged, timer: o.timer, val: 0 };
    if (kind === 'bill') P.val = 100; else if (kind === 'stack') P.val = 500; else if (kind === 'gold') P.val = 1000; else if (kind === 'case') P.val = 5000;
    if (kind === 'prize') P.prize = this.nextPrize(); P.val = P.prize ? P.prize[1] : 0;
    if (kind === 'capsule') P.kind = 'capsule';
    if (kind === 'statuette') P.persist = true;
    if (kind === 'bomb' || kind === 'life') P.kind = kind;
    return P;
  }
  nextPrize() {
    const ep = MT.EPISODES[this.ep - 1] || MT.EPISODES[0], deck = this.run.prizeDeck[this.ep] || (this.run.prizeDeck[this.ep] = ep.prizes.map((_, i) => i));
    if (!deck.length) return null;   // no repeats: the table is shuffled with the run's seed, then runs out
    const i = Math.floor(MT.rng.drops() * deck.length) % deck.length;
    return ep.prizes[deck.splice(i, 1)[0]];
  }
  // what a dead enemy leaves behind (§5.8): the drop table scaled by the Drop chance slider
  dropFrom(e) {
    const t = MT.DROPS[e.kind]; if (!t) return;
    for (const [item, p] of t) {
      if (MT.rng.drops() < p * MT.T.dropMul * (this.dropBoost || 1)) {
        const it = item === 'capsule' ? 'capsule' : item === 'prize' ? 'prize' : item;
        const pk = it === 'bill' ? 'bill' : it === 'stack' ? 'stack' : it === 'case' ? 'case' : it === 'prize' ? 'prize' : 'capsule';
        const pu = this.mkPickup(pk, e.x, e.y, { cap: pk === 'capsule' ? MT.pick(MT.CAPSULES, MT.rng.drops) : undefined });
        if (pu.kind === 'prize' && !pu.prize) continue;
        this.pickups.length < 60 && this.pickups.push(pu);
      }
    }
    if (e.carry && this.R.key !== 'place') this.keyDrop(e.x, e.y);
  }
  keyDrop(x, y) { if (this.keyDropped) return; this.keyDropped = true; this.pickups.push(this.mkPickup('key', x, y, { persist: true })); }
  // a hit on an enemy: the damage pipeline (§5.8). Brutes stunned take double damage; bosses have their own.
  damageEnemy(e, dmg, killer, src) {
    if (!e.alive) return false;
    if (e.kind === 'crate' || e.kind === 'lock') {
      e.hp -= dmg; this.popup(e.x, e.y, '', '#fff'); if (e.hp <= 0) this.enemyDied(e, killer, 'break'); this.sparks(e.x, e.y, 3); return true;
    }
    let m = e.stun > 0 && e.kind === 'brute' ? 2 : 1;
    if (e.kind === 'mime' && e.blast === undefined) { this.enemyDied(e, killer, 'pop'); return true; }   // a mime shot first pops harmlessly
    e.hp -= dmg * m; e.flash = .12; this.stats.hits++;
    if (e.hp <= 0) { this.enemyDied(e, killer, 'kill'); return true; }
    this.emit('hit', { e, dmg, killer }); return true;
  }
  enemyDied(e, killer, why) {
    if (e.deadDone) return; e.deadDone = true;
    e.alive = false; e.hp = 0;
    if (killer && killer.kills !== undefined) { killer.kills++; }
    if (e.kind === 'crate') { this.crateSpill(e, killer); return; }
    if (e.kind === 'lock') { this.lockBroke(e, killer); return; }
    if (e.kind === 'snakeSeg') { this.emit('segment', { e }); }
    const cash = e.cash;
    if (killer && cash) this.cashGive(killer, cash, { x: e.x, y: e.y }, '');
    if (e.rat) this.ratingsAdd(e.rat * 1, 'kill');
    this.stats.kills++;
    this.emit('kill', { e, killer, why, big: ['tank', 'brute', 'snake', 'disco', 'discoBig'].includes(e.kind) });
    if (e.D.onDeath) e.D.onDeath(e, this);
    if (e.kind === 'mime' && this.R.key === 'mimes') { this.mimesLeft--; if (this.mimesLeft <= 0) this.keyDrop(e.x, e.y); }
    if (e.kind === 'tank' && why !== 'burst') this.blastRing(e.x, e.y, 30, 1, e);
    this.burst(e);
    this.dropFrom(e);
    if (e.kind === 'hecklerKing') this.keyDrop(e.x, e.y);
    if (e.kind === 'brute' && e.carry) this.keyDrop(e.x, e.y);
  }
  crateSpill(e, killer) {
    const n = 3 + Math.floor(MT.rng.drops() * 3);
    for (let i = 0; i < n; i++) this.pickups.push(this.mkPickup('bill', e.x + MT.rand(-8, 8), e.y + MT.rand(-8, 8)));
    if (MT.rng.drops() < .5) this.pickups.push(this.mkPickup('prize', e.x, e.y));
    if (this.R.key === 'crate' && this.crateIndex(e) === this.keyCrate) this.keyDrop(e.x, e.y);
    this.burst(e); this.emit('crate', { e });
  }
  crateIndex(e) { const C = this.enemies.filter(o => o.kind === 'crate'); return C.indexOf(e); }
  lockBroke(e, killer) {
    this.burst(e); this.emit('lock', { e });
    if (this.enemies.filter(o => o.kind === 'lock' && o.alive).length === 0 && this.R.key === 'vault') {
      for (let i = 0; i < 10; i++) this.pickups.push(this.mkPickup('bill', 184 + MT.rand(-30, 30), 120 + MT.rand(-30, 30)));
      this.pickups.push(this.mkPickup('key', 184, 60, { persist: true })); this.emit('vault', {});
    }
  }
  // the burst on death: confetti in the enemy's palette and a shake for the big ones
  burst(e) { this.bursts = this.bursts || []; this.bursts.push({ x: e.x, y: e.y, t: .5, big: ['tank', 'brute', 'snake'].includes(e.kind), kind: e.kind }); }
  sparks(x, y, n) { this.bursts = this.bursts || []; this.bursts.push({ x, y, t: .25, big: false, kind: 'spark', n }); }
  blastRing(x, y, r, dmg, source) {
    this.rings = this.rings || []; this.rings.push({ x, y, r, t: .35 });
    for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, x, y) < r) this.hurtPlayer(c, dmg, { x, y });
    for (const o of this.enemies) if (o.alive && o !== source && o.counted && MT.dist(o.x, o.y, x, y) < r) this.damageEnemy(o, 3, null);
  }
  // foe bullets (§5.8): kinds orb, shard, beam, shell, tomato, butter, gravy, coin, card, static, tot
  fShot(x, y, a, speed, kind, o = {}) {
    const s = { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, kind, r: kind === 'beam' ? 2 : kind === 'shell' ? 4 : 2.5, life: 6, team: 'f', dmg: 1, z: o.z, vz: o.vz };
    if (this.fShots.length > 220) return null;
    this.fShots.push(s); return s;
  }
  burstShards(e, n, speed, life) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.fShots.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed * MT.T.enemyBulletSpeed, vy: Math.sin(a) * speed * MT.T.enemyBulletSpeed, kind: 'shard', r: 2, life, team: 'f', dmg: 1 }); } this.burst(e); }
  lobTomato(e, p, t) {
    const vx = p.vx || 0, vy = p.vy || 0, tx = p.x + vx * t, ty = p.y + vy * t;
    this.lobs.push({ sx: e.x, sy: e.y, x: e.x, y: e.y, z: 14, tx, ty, t: 0, dur: t, kind: 'tomato', owner: e });
    this.decals.push({ x: tx, y: ty, t: t + .1, kind: 'ring' });
    this.emit('telegraph', { e, kind: 'heckler' });
  }
  popcorn(c, a) { MT.projectiles.popcorn(this, c, a); }
  pshot(x, y, a, speed, dmg, owner) { MT.projectiles.pshot(this, x, y, a, speed, dmg, owner); }
  rocket(x, y, a, owner) { MT.projectiles.rocket(this, x, y, a, owner); }
  rocketBoom(k, hit) {
    this.blastRing2(k.x, k.y, 24, 3, k.owner, hit ? 4 : 0);
    this.emit('boom', { x: k.x, y: k.y }); this.rings = this.rings || []; this.rings.push({ x: k.x, y: k.y, r: 24, t: .3 });
  }
  blastRing2(x, y, r, splash, owner, direct) {
    for (const o of this.enemies) if (o.alive && o.counted && MT.dist(o.x, o.y, x, y) < r + o.r) this.damageEnemy(o, splash * MT.T.dmgMul, owner);
    if (direct) for (const o of this.enemies) if (o.alive && MT.dist(o.x, o.y, x, y) < o.r + 3) { this.damageEnemy(o, direct * MT.T.dmgMul, owner); break; }
  }
  popcornBoom(l) {
    this.blastRing2(l.x, l.y, 18, 2, l.owner.kind ? null : l.owner, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; this.pShots.push({ x: l.x, y: l.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, dmg: 1.5, owner: l.owner, life: .35, kind: 'kernel', pierce: 1, hitSet: new Set() }); }
    this.rings = this.rings || []; this.rings.push({ x: l.x, y: l.y, r: 18, t: .25 });
    this.emit('pop', { x: l.x, y: l.y });
  }
  laserBeam(c, aim, dt) {
    const want = aim; let d = (want - (c.laserA ?? want)); d = Math.atan2(Math.sin(d), Math.cos(d));
    c.laserA = (c.laserA ?? want) + clampN(d, -7 * dt, 7 * dt);
    const a = c.laserA, mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10;
    let L = 0; while (L < 420 && MT.inArena(mx + Math.cos(a) * L, my + Math.sin(a) * L, -1) && !this.doorBlocks(mx + Math.cos(a) * L, my + Math.sin(a) * L)) L += 4;
    c.laser = { x0: mx, y0: my, x1: mx + Math.cos(a) * L, y1: my + Math.sin(a) * L, t: .05 };
    for (const e of this.enemies) if (e.alive) {
      const px = e.x - mx, py = e.y - my, t = clampN((px * Math.cos(a) + py * Math.sin(a)), 0, L), dx = mx + Math.cos(a) * t - e.x, dy = my + Math.sin(a) * t - e.y;
      if (Math.hypot(dx, dy) < e.r + 2) this.damageEnemy(e, 16 * dt * MT.T.dmgMul, c);
    }
    if (this.laserHum === undefined || c.laserT === undefined || this.time - c.laserT > .12) { c.laserT = this.time; this.emit('laser', { c }); }
  }
  recordHits(c, o, dt) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (MT.dist(e.x, e.y, o.x, o.y) < e.r + 4) { e.recCd = e.recCd || 0; if (e.recCd <= 0) { e.recCd = .15; this.damageEnemy(e, 2 * MT.T.dmgMul, c); } }
    }
    for (const s of this.fShots) if (MT.dist(s.x, s.y, o.x, o.y) < 6 && ['orb', 'shard', 'coin', 'card', 'static'].includes(s.kind)) s.dead = true;
  }
  // the showstopper: every enemy on screen takes 25, foe bullets go, enemies stun for a second (§5.1)
  showstop(c) {
    if (!c.infiniteBombs && c.bombs <= 0) return false;
    if (!c.infiniteBombs) c.bombs--;
    c.bombFlash = .12; this.flashT = .12; this.emit('showstop', { c });
    this.fShots.length = 0; this.rings = this.rings || []; this.rings.push({ x: c.x, y: c.y, r: 120, t: .45 });
    for (const e of this.enemies) if (e.alive) { if (e.counted || e.kind === 'crate' || e.kind === 'lock') this.damageEnemy(e, 25 * MT.T.dmgMul, c); e.stun = e.kind === 'brute' ? e.stun : 1.0; }
    this.ratingsAdd(8, 'stop');
    if (this.onShowstop) this.onShowstop(c);
    return true;
  }
  // the contact of records and shield on enemies, once a step
  shieldContact(dt) {
    for (const c of this.players) if (c.shielded && c.inPlay) for (const e of this.enemies) if (e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 12) { e.shieldCd = (e.shieldCd || 0) - dt; if (e.shieldCd <= 0) { e.shieldCd = .2; this.damageEnemy(e, 1, c); } }
  }
  // the exit triggers: the first contestant into an exit's gap picks it; 0.8 s later everyone goes
  exitCheck() {
    if (this.phase !== 'exit' || this.exitPick) return;
    for (const d of ['N', 'S', 'E', 'W']) {
      const st = this.doorState[d]; if (st.state !== 'exit') continue;
      const T = MT.DOORS[d];
      for (const c of this.players) {
        if (!c.inPlay || c.state === 'out') continue;
        const beyond = d === 'N' ? c.y < MT.ARENA.Y0 - 4 : d === 'S' ? c.y > MT.ARENA.Y1 + 4 : d === 'W' ? c.x < MT.ARENA.X0 - 4 : c.x > MT.ARENA.X1 + 4;
        if (beyond) { this.exitPick = { d, c, t: .8 }; this.emit('exit-pick', { d, c, to: this.R.exits[d] }); return; }
      }
    }
  }
  allClear() { return !this.enemies.some(e => e.alive && e.counted) && this.spawnQ.length === 0 && !this.pendingDrop?.length; }
  // the room script (§5.7): waves start by their timers or when few enough counted enemies remain
  runWaves() {
    const R = this.R;
    if (R.survive) return this.runSurvive();
    this.tasks.push(MT.task(this.waveScript(R)));
  }
  *waveScript(R) {
    const players = Math.max(1, this.players.filter(c => c.state !== 'out').length);
    const scale = (n) => Math.max(1, Math.round(n * (1 + .35 * (players - 1)) * MT.T.waveSize * this.diffMul));
    let lastAt = 0;
    for (let wi = 0; wi < R.waves.length; wi++) {
      const w = R.waves[wi];
      if (w.spawn.length && w.spawn[0][0] === 'script') { this.runScript(w.spawn[0][1]); yield 1; continue; }
      const start = this.time;
      // wait: at seconds since the previous wave began, or when the counted field thins to 'left'
      while (true) {
        const elapsed = this.time - start;
        if (w.at !== undefined && w.at !== null && elapsed >= w.at) break;
        if (w.left !== undefined && this.aliveCounted <= w.left && (w.at === undefined || w.at === null || elapsed >= .5)) break;
        if ((w.at === undefined || w.at === null) && w.left === undefined) break;
        yield 0.05;
      }
      this.waveIdx = wi + 1;
      for (const [door, kind, n, gap = .25] of w.spawn) {
        const k = scale(n);
        if (door === 'all') for (const d of ['N', 'S', 'E', 'W']) this.spawnAt(d, kind, k, gap);
        else if (door === 'sides') for (const d of ['E', 'W']) this.spawnAt(d, kind, k, gap);
        else if (door === 'ends') for (const d of ['N', 'S']) this.spawnAt(d, kind, k, gap);
        else if (door === 'audience') this.spawnAt('audience', kind, k, gap);
        else if (door === 'drop') this.spawnAt('drop', kind, k, gap);
        else if (door === 'random') this.spawnAt('random', kind, k, gap);
        else if (Array.isArray(door)) this.spawnAt(door, kind, k, gap);
        else this.spawnAt(door, kind, k, gap);
      }
      for (const it of (w.items || [])) this.waveItem(it);
      this.emit('wave', { i: wi + 1, n: R.waves.length });
    }
    this.wavesDone = true;
  }
  waveItem([kind, where]) {
    const at = where === 'center' ? [184, 120] : where === 'drop' ? this.randomFreePoint() : [24 + 16 * (where[0] || 0), 24 + 16 * (where[1] || 0)];
    this.pickups.push(this.mkPickup('capsule', at[0], at[1], { cap: kind }));
  }
  runScript(name) {   // scripted events: the Pyro Pit's finale burst
    if (name === 'finaleBurst') {
      this.tasks.push(MT.task((function* (W) {
        for (const v of W.vents) { v.burst = true; }
        W.vents.forEach((v, i) => { v.fireAt = .6 + (i % 4) * .15; });
        yield 3.0;
        W.pickups.push(W.mkPickup('key', 184, 120, { persist: true }));
        W.emit('key-rise', {});
      })(this)));
    }
  }
  // the survive room (1-4): the streams and the timer, the cage lifting at 20 s, the final wave at the end
  runSurvive() {
    const R = this.R;
    this.survive = { t: 0, streams: R.streams.map(s => ({ t: 0, every: s.every, spawn: s.spawn })), done: false };
    this.tasks.push(MT.task((function* (W) {   // the timer, then the last wave: all goons from every door
      yield R.survive;
      W.survive.done = true;
      for (const [door, kind, n] of R.final) for (const d of (door === 'all' ? ['N', 'S', 'E', 'W'] : [door])) W.spawnAt(d, kind, n, .3);
      yield 1;
      W.wavesDone = true;
    })(this)));
  }
  stepSurvive(dt) {
    const S = this.survive; if (!S || S.done) return;
    S.t += dt;
    if (S.t > this.R.cageUntil && this.cage && this.cage.up < 1) { this.cage.up = Math.min(1, this.cage.up + dt * 1.4); if (this.cage.up >= 1) { this.cage = null; this.emit('cage-open', {}); } }
    for (const st of S.streams) { st.t += dt; if (st.t >= st.every) { st.t = 0; for (const [d, kind, n] of st.spawn) { if (d === 'random') this.spawnAt('random', kind, n, .2); else for (const dd of ['N', 'S', 'E', 'W']) if (st.spawn.length > 1 || d === dd) this.spawnAt(dd, kind, n, .2); } } }
    if (this.keyPickup && !this.cage) { this.keyPickup.caged = false; }
  }
  // hazards: conveyors push, vents fire on a pattern, splats slow (§5.5)
  stepHazards(dt) {
    for (const cv of this.conveyors) {
      cv.dirTimer -= dt;
      if (cv.dirTimer < 1.5 && !cv.warned) { cv.warned = true; this.emit('conveyor-warn', {}); }
      if (cv.dirTimer <= 0) { cv.dir = -cv.dir; cv.dirTimer = 12; cv.warned = false; }
      const push = 40 * cv.dir * dt;
      const inBelt = (x, y) => y > cv.y0 && y < cv.y1;
      for (const c of this.players) if (c.inPlay && inBelt(c.x, c.y) && c.state === 'play') { c.x += push; if (c.x < MT.ARENA.X0 + 6) c.x = MT.ARENA.X0 + 6; if (c.x > MT.ARENA.X1 - 6) c.x = MT.ARENA.X1 - 6; }
      for (const e of this.enemies) if (e.alive && inBelt(e.x, e.y) && e.counted) e.x += push;
      for (const p of this.pickups) if (p.belt && inBelt(p.x, p.y)) { p.x += push * .9; if (p.x < 40) p.x = 340; if (p.x > 344) p.x = 40; }
    }
    if (this.vents.length) this.stepVents(dt);
    for (const s of this.splats) { s.t -= dt; }
    this.splats = this.splats.filter(s => s.t > 0);
  }
  stepVents(dt) {
    this.ventT -= dt;
    if (this.ventT <= 0) {   // the pattern cycles every 3.5 s: a row, a column, a checker, all but one lane
      this.ventT = 3.5; this.ventCycle = (this.ventCycle + 1) % 4;
      const lane = Math.floor(MT.rng.spawn() * 4);
      for (const v of this.vents) {
        const row = Math.round((v.cy - 3) / 3), col = Math.round((v.cx - 4) / 4);
        let on = false;
        if (this.ventCycle === 0) on = row === (this.ventIdx || 0) % 3;
        else if (this.ventCycle === 1) on = col === (this.ventIdx || 0) % 4;
        else if (this.ventCycle === 2) on = (row + col) % 2 === 0;
        else on = col !== lane;
        if (on && v.state === 'idle') { v.state = 'telegraph'; v.t = 1.0; this.emit('vent-tele', { v }); }
      }
      this.ventIdx = (this.ventIdx || 0) + 1;
    }
    for (const v of this.vents) {
      if (v.fireAt !== undefined) { v.fireAt -= dt; if (v.fireAt <= 0) { v.fireAt = undefined; v.state = 'telegraph'; v.t = 1.0; } }
      if (v.state === 'telegraph') { v.t -= dt; if (v.t <= 0) { v.state = 'flame'; v.t = 1.2; this.emit('vent-fire', { v }); } }
      else if (v.state === 'flame') {
        v.t -= dt;
        for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, v.x, v.y) < 12) this.hurtPlayer(c, 1, { x: v.x, y: v.y });
        for (const e of this.enemies) if (e.alive && e.counted && MT.dist(e.x, e.y, v.x, v.y) < 12) this.damageEnemy(e, 3 * dt, null);
        if (v.t <= 0) v.state = 'idle';
      }
    }
  }
  // the room clock: the spawns queue, pendings, pickups' lifetimes, the stunt, Prime Time and the decays
  step(dt) {
    this.time += dt; this.phaseT += dt;
    this.tickTasks(dt);
    this.evq.length > 500 && (this.evq.length = 0);
    // queued spawns that are due
    if (this.spawnQ.length) {
      const due = this.spawnQ.filter(s => s.t <= this.time);
      if (due.length) { this.spawnQ = this.spawnQ.filter(s => s.t > this.time); for (const s of due) this.runSpawn(s); }
    }
    if (this.pendingDrop) { for (const d of this.pendingDrop) { d.t -= dt; if (d.t <= 0) { d.done = true; this.spawnEnemy(d.kind, d.x, d.y, {}); } } this.pendingDrop = this.pendingDrop.filter(d => !d.done); }
    for (const d of ['N', 'S', 'E', 'W']) this.stepDoor(d, dt);
    this.stepHazards(dt);
    if (this.survive) this.stepSurvive(dt);
    // the contestants
    for (const c of this.players) {
      if (c.state === 'out') continue;
      if (c.state === 'dead') { c.step(dt, { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false }, this); continue; }
      const I = c.intent || { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
      c.step(dt, I, this);
      c.intent = null;
    }
    // the enemies: AI, then their attacks on contestants
    for (const e of this.enemies) if (e.alive) {
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.entering && !e.arc) {   // a spawn from a door walks straight in, through the wall, until it is inside
        const dx = 184 - e.x, dy = 120 - e.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 60 * MT.T.enemySpeed * dt);
        e.x += dx / d * st; e.y += dy / d * st; e.face = Math.atan2(dy, dx);
        if (MT.inArena(e.x, e.y, 0)) e.entering = false;
        continue;
      }
      e.D.update.call(e.D, e, dt, this);
    }
    for (const e of this.enemies) if (e.entering && MT.inArena(e.x, e.y, 0)) e.entering = false;
    this.enemies = this.enemies.filter(e => e.alive);
    // the projectiles and the shields
    MT.projectiles.updateRockets(this, dt);
    MT.projectiles.updateLobs(this, dt);
    MT.projectiles.updateShots(this, dt);
    this.shieldContact(dt);
    this.collideShots(dt);
    this.collideFoes(dt);
    this.updatePickups(dt);
    this.updateRunningRatings(dt);
    this.stepBossHazards(dt);
    this.exitCheck();
    if (this.exitPick) { this.exitPick.t -= dt; if (this.exitPick.t <= 0) { const p = this.exitPick; this.exitPick = null; this.leaveDoor = p.d; this.leaveTo = this.R.exits[p.d]; this.emit('leave', { d: p.d, to: this.leaveTo }); this.phase = 'left'; } }
    // the phases
    this.stepPhase(dt);
    this.tickMisc(dt);
  }
  tickMisc(dt) {
    for (const p of this.pops) { p.t -= dt; p.z += 16 * dt; }
    this.pops = this.pops.filter(p => p.t > 0);
    if (this.bursts) { for (const b of this.bursts) b.t -= dt; this.bursts = this.bursts.filter(b => b.t > 0); }
    if (this.rings) { for (const r of this.rings) r.t -= dt; this.rings = this.rings.filter(r => r.t > 0); }
    for (const d of this.decals) d.t -= dt; this.decals = this.decals.filter(d => d.t > 0);
    if (this.dropShadows) { for (const s of this.dropShadows) s.t -= dt; this.dropShadows = this.dropShadows.filter(s => s.t > 0); }
    if (this.flashT) this.flashT = Math.max(0, this.flashT - dt);
    if (this.shakeN) this.shakeN = Math.max(0, this.shakeN - dt * 20);
    for (const c of this.players) { if (c.laser) { c.laser.t -= dt; if (c.laser.t <= 0) c.laser = null; } }
    if (this.phase === 'bonus') this.bonusT = (this.bonusT || 0) + dt;
    if (this.primeOn) { this.primeT -= dt; if (this.primeT <= 0) { this.primeOn = false; this.run.ratings.R = 60; this.emit('prime-end', {}); } }
    this.run.ratings.primeCD = Math.max(0, this.run.ratings.primeCD - dt);
    for (const d of ['N', 'S', 'E', 'W']) this.doorState[d].exitOn = this.doorState[d].state === 'exit';
  }
  stepDoor(d, dt) {
    const st = this.doorState[d];
    if (st.state === 'opening') { st.t += dt; st.up = Math.min(1, st.t / .35); if (st.t >= .35) { st.state = 'open'; st.t = 0; st.up = 1; } }
    else if (st.state === 'open') { st.t += dt; const busy = this.spawnQ.some(s => s.where === d) || this.enemies.some(e => e.entering && e.spawnDoor === d); if (!busy && st.t > .6 && this.phase !== 'exit') { st.state = 'closing'; st.t = 0; } }
    else if (st.state === 'closing') { st.t += dt; st.up = Math.max(0, 1 - st.t / .3); if (st.t >= .3) { st.state = 'closed'; st.up = 0; st.t = 0; } }
    if (st.state === 'exit') st.up = 1;
  }
  updateRunningRatings(dt) {
    const rt = this.run.ratings;
    if (this.time - rt.lastGain > 2.5) rt.R = Math.max(0, rt.R - MT.T.ratingsDecay * dt);
    if (rt.R < 5 && this.phase === 'waves' && !this.stunt && this.players.some(c => c.inPlay)) { this.lowRatT += dt; if (this.lowRatT >= 10) this.runStunt(); }
    else this.lowRatT = 0;
    if (rt.primeCD > 0 && rt.R >= 100 && !this.primeOn) rt.R = 99;
  }
  runStunt() {   // the producers release the episode's stunt from a random door, once per room (§5.4)
    this.stunt = true; const S = MT.EPISODES[this.ep - 1].stunt;
    this.emit('stunt', { stunt: S });
    this.ratingsAdd(15, 'stunt');
    for (let i = 0; i < S.n; i++) {
      const d = MT.pick(['N', 'S', 'E', 'W'], MT.rng.spawn);
      if (S.kind === 'clapbot') this.spawnAt(d, 'clapbot', 1, .2);
      else if (S.kind === 'tank') this.spawnAt(d, 'tank', 1, .2);
      else this.spawnAt(d, 'brute', 1, .2);
    }
  }
  // the phases: ENTER (1.2 s walk-in), INTRO (the room's line), WAVES, CLEAR (bonus, banner), EXIT (doors open), LEFT
  stepPhase(dt) {
    const R = this.R;
    if (this.phase === 'enter') {
      if (this.phaseT >= 1.2) { this.phase = 'intro'; this.phaseT = 0; this.emit('room-intro', { room: R }); }
      return;
    }
    if (this.phase === 'intro') {
      if (this.phaseT >= 1.6 || this.noIntro) { if (this.R.type === 'boss') { this.phase = 'boss'; this.phaseT = 0; return; } this.phase = 'waves'; this.phaseT = 0; this.waveStart = this.time; this.runWaves(); this.emit('waves', {}); }
      return;
    }
    if (this.phase === 'waves') {
      if (this.survive && this.survive.done && this.wavesDone && this.allClear()) this.enterClear();
      else if (!this.survive && this.wavesDone && this.allClear()) this.enterClear();
      if (this.R.type === 'key' && this.R.survive && this.survive && !this.survive.done) { /* counting down */ }
      return;
    }
    if (this.phase === 'clear') {
      this.clearT += dt;
      if (this.clearT > .8) { this.phase = 'exit'; this.phaseT = 0; this.openExits(); }
      return;
    }
    if (this.phase === 'exit') {
      this.hurryT += dt;
      if (this.hurryT > 25 && (this.hurryT - 25) % 6 < dt) { for (const d of ['N', 'S', 'E', 'W']) if (!this.R.exits[d]) this.spawnAt(d, 'clapbot', 4, .2); this.emit('hurry', {}); }
      return;
    }
    if (this.phase === 'left') { return; }
    if (this.phase === 'boss' || this.phase === 'bossdone') return;
  }
  tickTasks(dt) {
    for (const t of this.tasks) {
      if (t.done) continue;
      if (t.wait > 0) { t.wait -= dt; continue; }
      if (t.cond) { if (!t.cond()) continue; t.cond = null; }
      const r = t.gen.next(); if (r.done) { t.done = true; continue; }
      const v = r.value;
      if (typeof v === 'number') t.wait = v; else if (typeof v === 'function') t.cond = v;
    }
    this.tasks = this.tasks.filter(t => !t.done);
  }
  enterClear() {
    this.phase = 'clear'; this.phaseT = 0; this.clearT = 0;
    this.clearTime = this.time - this.waveStart;
    const par = this.R.par, mul = this.multiplier;
    for (const c of this.players) if (c.state === 'play' || c.state === 'walk') {
      const bonus = 1000 * this.ep * mul * (this.clearTime <= par ? 1.5 : 1);
      c.cash += Math.round(bonus);
      this.popup(c.x, c.y, '+$' + Math.round(bonus).toLocaleString('en-US') + ' CLEAR', c.color);
    }
    this.run.roomsCleared++;
    this.magnetOn = true;
    this.emit('clear', { par: this.clearTime <= par, time: this.clearTime });
  }
  openExits() {   // the room's exits open: their cells become floor, and the signs light
    this.phase = 'exit'; this.hurryT = 0;
    for (const d of Object.keys(this.R.exits)) {
      this.doorState[d].state = 'exit'; this.doorState[d].to = this.R.exits[d];
      for (const [cx, cy] of MT.DOOR_CELLS[d]) this.map.set(cx, cy, 0);
    }
    this.emit('exits', { exits: this.R.exits });
  }
  // pickups: collected by the contestant that touches them, keys shared, prizes and cash to the collector (§5.3)
  updatePickups(dt) {
    for (const p of this.pickups) {
      p.age += dt; if (!p.persist) p.life -= dt;
      if (p.caged && this.cage) continue;
      if (this.magnetOn && p.kind !== 'capsule' && p.kind !== 'bomb' && p.kind !== 'life' && p.kind !== 'statuette') {
        let best = null, bd = 60;
        for (const c of this.players) { if (!c.inPlay) continue; const d = MT.dist(c.x, c.y, p.x, p.y); if (d < bd) { bd = d; best = c; } }
        if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; p.x += dx / d * 60 * dt; p.y += dy / d * 60 * dt; }
      }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);
    for (const p of this.pickups) {
      if (p.collected) continue;
      for (const c of this.players) {
        if (!c.alive && c.state !== 'drop') continue;
        if (c.state !== 'play') continue;
        if (MT.dist(c.x, c.y, p.x, p.y) < c.r + 7) { this.collect(c, p); break; }
      }
    }
    this.pickups = this.pickups.filter(p => !p.collected);
    if (this.pickups.filter(p => p.kind === 'bill' || p.kind === 'stack').length > 25) { this.pickups = this.pickups.filter(p => !(p.kind === 'bill' && p.life < 3)); }
    if (this.pickups.filter(p => p.kind === 'capsule').length > 3) { this.pickups = this.pickups.filter(p => p.kind !== 'capsule' || !p.spill || true); }
  }
  collect(c, p) {
    p.collected = true;
    switch (p.kind) {
      case 'bill': case 'stack': case 'gold': case 'case': this.cashGive(c, p.val, null, 'pick'); this.emit('pick-cash', { c, kind: p.kind }); break;
      case 'prize': if (p.prize) { c.prizes.push(p.prize); this.cashGive(c, p.prize[1], null, 'pick'); this.ratingsAdd(2, 'prize'); this.emit('prize', { c, prize: p.prize }); } break;
      case 'key': this.takeKey(c, p); break;
      case 'capsule': c.give(p.cap); this.emit('capsule', { c, cap: p.cap }); break;
      case 'bomb': c.bombs = Math.min(3, c.bombs + 1); this.emit('bomb-pickup', { c }); break;
      case 'life': c.lives++; this.emit('encore', { c }); break;
      case 'statuette': this.bonusWon = true; this.cashGive(c, 100000, null, 'THE NETWORK'); this.emit('statuette', { c }); break;
    }
  }
  takeKey(c, p) {
    if (this.run.mode === 'session') { this.cashGive(c, 10000, null, 'KEY'); this.emit('key', { c, n: 0 }); return; }   // the Lightning Round pays for a key
    const k = this.run.keys; if (k >= 9) return;
    this.run.keys = k + 1; this.run.keyList.add(this.id + ':' + (p.id || k));
    this.ratingsAdd(5, 'key'); this.emit('key', { c, n: this.run.keys });
  }
  // the room's exit to the next: the run path grows here
  result() { return { id: this.id, time: this.time, kills: this.stats.kills, cleared: this.phase === 'left' || this.phase === 'clear' || this.phase === 'exit' }; }
}
const A_X0 = 16, A_X1 = 352, A_Y0 = 16, A_Y1 = 224;
const door_all = (final) => (final || []).some(f => f[0] === 'all');
function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ---- 08-collide.js ---- */
/* MASH TV — 08-collide: the shot collisions, the foe bullets against contestants, the near misses and the tomato splats.
 * It extends World (07) with methods that need no state of their own. */

Object.assign(World.prototype, {
  // player shots against enemies and bosses: the first target hit takes the shot (kernels pierce one more)
  collideShots(dt) {
    for (const s of this.pShots) {
      if (s.dead) continue;
      if (this.boss && this.boss.alive && this.boss.hitBy(s, this)) { if (!s.pierce) { s.dead = true; continue; } }
      for (const e of this.enemies) {
        if (!e.alive || s.hitSet && s.hitSet.has(e)) continue;
        if (MT.dist(s.x, s.y, e.x, e.y) < e.r + s.r) {
          this.damageEnemy(e, s.dmg, s.owner);
          if (s.pierce !== undefined) { (s.hitSet || (s.hitSet = new Set())).add(e); if (--s.pierce < 0) { s.dead = true; } }
          else s.dead = true;
          if (s.dead) break;
        }
      }
    }
    this.pShots = this.pShots.filter(s => !s.dead);
  },
  // foe bullets against contestants: a hit costs what the bullet does; a bullet within 7 is a near miss (+0.5, three a second)
  collideFoes(dt) {
    this.nearMissT = Math.max(0, (this.nearMissT || 0) - dt);
    for (const s of this.fShots) {
      if (s.dead) continue;
      for (const c of this.players) {
        if (!c.inPlay || c.state === 'out') continue;
        const d = MT.dist(s.x, s.y, c.x, c.y);
        if (d < c.r + s.r) {
          if (s.kind === 'shell') this.blastRing(s.x, s.y, 16, 1, null);
          else this.hurtPlayer(c, s.dmg, s);
          s.dead = true; break;
        }
        if (d < 7 + c.r && !s.nearMiss && this.nearMissT <= 0) { s.nearMiss = true; this.nearMissT = .34; this.ratingsAdd(.5, 'near'); }
      }
      if (!s.dead && s.kind === 'shell' && !MT.inArena(s.x, s.y, -6)) { this.blastRing(s.x, s.y, 16, 1, null); s.dead = true; }
    }
    this.fShots = this.fShots.filter(s => !s.dead);
  },
  // a tomato lands: a splat that hurts within 10 and slows walkers for 6 s (§5.8)
  tomatoSplat(l) {
    this.splats.push({ x: l.x, y: l.y, r: 14, t: 6, puddle: true });
    for (const c of this.players) if (c.inPlay && MT.dist(c.x, c.y, l.x, l.y) < 10) this.hurtPlayer(c, 1, { x: l.x, y: l.y });
    this.emit('splat', { x: l.x, y: l.y });
  },
  // the room's pickups that are placed at its start (capsules on a timer, the keys on belts)
  scheduleItems() {
    for (const it of (this.R.items || [])) {
      const [t, kind, where] = it;
      this.tasks.push(MT.task((function* (W) {
        yield t;
        const at = where === 'center' ? [184, 120] : where === 'drop' ? W.randomFreePoint() : Array.isArray(where) ? [24 + where[0] * 16, 24 + where[1] * 16] : [184, 120];
        W.pickups.push(W.mkPickup(kind === 'bomb' || kind === 'life' ? kind : 'capsule', at[0], at[1], { cap: kind }));
      })(this)));
    }
  }
});

/* ---- 09-bosses.js ---- */
/* MASH TV — 09-bosses: the boss framework (§5.9) and its three bosses. A boss has parts (each with HP and armour), phases
 * written as task scripts, and a death that pours out the reward. Its drawing reads only its own state. */

class Boss {
  constructor(W, kind, o = {}) {
    this.W = W; this.kind = kind; this.x = o.x || 184; this.y = o.y || -30; this.parts = []; this.tasks = []; this.alive = true;
    this.phase = 0; this.t = 0; this.scale = 1 + .5 * (W.players.filter(c => c.inPlay).length - 1);
    this.hpMul = MT.T.bossHp * this.scale;
    this.hitFlash = 0; this.dying = 0; this.stance = 'enter';
  }
  part(id, ox, oy, r, hp, o = {}) {
    const p = Object.assign({ id, ox, oy, r, max: Math.round(hp * this.hpMul), hp: Math.round(hp * this.hpMul), armor: 1, alive: true, weak: 1 }, o);
    this.parts.push(p); return p;
  }
  partPos(p) { return [this.x + p.ox, this.y + p.oy]; }
  get body() { return this.parts[0]; }
  hitBy(s, W) {
    for (const p of this.parts) {
      if (!p.alive || p.open === false) continue;
      const [px, py] = this.partPos(p);
      if (MT.dist(s.x, s.y, px, py) < p.r + s.r) {
        const f = p.armor * p.weak;
        if (f < .2) { W.sparks(s.x, s.y, 2); return true; }
        p.hp -= s.dmg * f * MT.T.dmgMul; this.hitFlash = .1; W.stats.hits++;
        if (p.hp <= 0) { p.alive = false; this.partDestroyed(p, W); }
        return true;
      }
    }
    return false;
  }
  partDestroyed(p, W) { W.ratingsAdd(10, 'part'); W.burst({ x: this.x + p.ox, y: this.y + p.oy }); W.popup(this.x + p.ox, this.y + p.oy, 'DESTROYED', '#ff8a4a'); if (p.onDestroy) p.onDestroy(this, W); }
  damageAll(n, W) { for (const p of this.parts) if (p.alive && p.id !== 'hub') { p.hp -= n * p.armor; if (p.hp <= 0) { p.alive = false; this.partDestroyed(p, W); } } }
  step(dt, W) {
    this.t += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
    MT.tickTasksOf(this, dt);
    this.updateParts(dt, W);
  }
  updateParts() {}
  // the death: the reward shower and the end (§5.9); the boss's own line
  die(W) {
    if (!this.alive) return; this.alive = false; this.dying = 2.5; this.dyingT = 0; this.tasks = [];
    W.emit('boss-dies', { boss: this.kind });
    for (let i = 0; i < 30; i++) W.pickups.push(W.mkPickup('bill', this.x + MT.rand(-60, 60), this.y + MT.rand(-40, 40)));
    for (let i = 0; i < 2; i++) W.pickups.push(W.mkPickup('prize', this.x + MT.rand(-40, 40), this.y + MT.rand(-30, 30)));
    W.pickups.push(W.mkPickup('capsule', this.x, this.y + 30, { cap: MT.pick(MT.CAPSULES) }));
    W.shake(10); W.flashT = .3;
  }
}
MT.tickTasksOf = (o, dt) => {
  for (const t of o.tasks) {
    if (t.done) continue;
    if (t.wait > 0) { t.wait -= dt; continue; }
    if (t.cond) { if (!t.cond()) continue; t.cond = null; }
    const r = t.gen.next(); if (r.done) { t.done = true; continue; }
    if (typeof r.value === 'number') t.wait = r.value; else if (typeof r.value === 'function') t.cond = r.value;
  }
  o.tasks = o.tasks.filter(t => !t.done);
};
const nearestOf = (W, x, y) => W.nearestPlayer(x, y) || W.players.find(c => c.inPlay) || null;
const aimAt = (W, x, y) => { const p = nearestOf(W, x, y); return p ? Math.atan2(p.y - y, p.x - x) : Math.PI / 2; };

/* ---------------- MASHY, THE NETWORK'S BELOVED MASCOT (room 1-B) ---------------- */
class Mashy extends Boss {
  constructor(W) {
    super(W, 'mashy', { x: 184, y: -30 });
    this.body2 = this.part('body', 0, 0, 26, 160, { armor: .15 });
    this.arms = [this.part('left', -30, 6, 10, 45, { onDestroy: (b, W2) => b.armGone(W2) }), this.part('right', 30, 6, 10, 45, { onDestroy: (b, W2) => b.armGone(W2) })];
    this.hatch = this.part('hatch', 0, 14, 9, 80, { weak: 2, open: false });
    this.armsLeft = 2; this.hpPct = 1; this.tasks.push(MT.task(this.script(W)));
    this.armFast = 1;
  }
  armGone(W) { this.armsLeft--; this.body2.armor = this.armsLeft > 0 ? .15 : .5; W.popup(this.x, this.y - 20, 'ARM OFF!', '#ffcc33'); if (this.armsLeft === 0) { this.stance = 'phase2'; this.armFast = 1.3; } }
  *script(W) {
    // entrance: the north door bursts open and Mashy rolls in to y 70 over two seconds
    this.stance = 'enter'; W.sfx && 0;
    for (let k = 0; k < 40; k++) { this.y = -30 + (100) * (k / 40) * (k / 40 < 1 ? 1 : 1); yield .05; }
    this.y = 70; W.emit('boss-intro-done', { boss: 'mashy' });
    W.emit('boss-line', { key: 'mashy-intro' });
    this.stance = 'phase1';
    this.tasks.push(MT.task(this.cannons(W)));
    this.tasks.push(MT.task(this.gatling(W)));
    this.tasks.push(MT.task(this.phaseSwitch(W)));
    this.tasks.push(MT.task(this.drift(W)));
  }
  *drift(W) { let dir = 1; while (true) { if (this.parts[0].alive && this.stance !== 'phase3') { this.x += 30 * dir * .05; if (this.x > 280) dir = -1; if (this.x < 88) dir = 1; } yield .05; } }
  *cannons(W) {   // the Butter Cannon: a five-way spread at the nearest contestant, every 1.8 s
    while (true) {
      yield 1.8 / this.armFast;
      if (this.stance !== 'phase1' || !this.arms.some(a => a.alive)) continue;
      const a = aimAt(W, this.x, this.y);
      for (let i = -2; i <= 2; i++) W.fShot(this.x - 14 * (this.arms[0].alive ? 1 : 0), this.y + 6, a + i * .225, 95 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'butter');
    }
  }
  *gatling(W) {   // the Gravy Gatling: a 1.2 s stream, sweeping 100 degrees, every 3.2 s
    while (true) {
      yield 3.2 / this.armFast;
      if (this.stance !== 'phase1' || !this.arms[1].alive) continue;
      const a0 = aimAt(W, this.x, this.y) - .87, t0 = 0;
      for (let k = 0; k < 12; k++) { const a = a0 + k / 12 * 1.75; W.fShot(this.x + 30, this.y + 6, a, 120 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'gravy'); yield .1; }
    }
  }
  *phaseSwitch(W) {
    yield () => this.armsLeft === 0; this.stance = 'phase2';
    this.hatch.open = false;
    this.tasks.push(MT.task(this.hatchLoop(W)));
    this.tasks.push(MT.task(this.ring(W)));
    this.tasks.push(MT.task(this.tots(W)));
    this.tasks.push(MT.task(this.goonsS(W)));
    yield () => this.body2.hp < this.body2.max * .35; this.stance = 'phase3';
    W.emit('boss-line', { key: 'mashy-phase3' }); W.popup(this.x, this.y - 30, 'MASHY\'S GONE MASHY!', '#ff3344');
    this.tasks.push(MT.task(this.charges(W)));
    this.tasks.push(MT.task(this.clapbotsEW(W)));
  }
  *hatchLoop(W) { while (this.stance === 'phase2') { this.hatch.open = false; yield 2.3; this.hatch.open = true; yield 2.2; } }
  *ring(W) { while (this.stance === 'phase2' || this.stance === 'phase3') { yield 2.5; if (this.hatch.open) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + (Math.floor(this.t) % 2) * .13; W.fShot(this.x, this.y, a, 80 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'orb'); } } }
  *tots(W) { while (this.stance === 'phase2') { yield 5; for (let i = 0; i < 3; i++) { const t = nearestOf(W, this.x, this.y); if (!t) break; W.lobs.push({ sx: this.x, sy: this.y, x: this.x, y: this.y, z: 20, tx: t.x, ty: t.y, t: 0, dur: .9, kind: 'tot', owner: this }); } } }
  *goonsS(W) { while (this.stance === 'phase2') { yield 9; W.spawnAt('S', 'goon', 6, .2); } }
  *charges(W) {   // phase 3: a 0.9 s rev, then 170 u/s toward the target, bouncing off the walls; three, then a rest with the hatch open
    for (let k = 0; k < 3; k++) {
      yield 1.5; const p = nearestOf(W, this.x, this.y); if (!p) { k--; continue; }
      W.emit('telegraph', { e: this, kind: 'mashy' }); yield .9;
      const a = Math.atan2(p.y - this.y, p.x - this.x); this.vx = Math.cos(a) * 170; this.vy = Math.sin(a) * 170;
      for (let s = 0; s < 150; s++) { this.x += this.vx * .02; this.y += this.vy * .02; if (this.x < 40 || this.x > 328) this.vx = -this.vx; if (this.y < 40 || this.y > 200) this.vy = -this.vy; this.x = Math.max(40, Math.min(328, this.x)); this.y = Math.max(40, Math.min(200, this.y)); if (MT.dist(this.x, this.y, p.x, p.y) < 20) break; yield .02; }
    }
    this.hatch.open = true; yield 2.5; this.hatch.open = false;
    this.tasks.push(MT.task(this.charges(W)));
  }
  *clapbotsEW(W) { while (this.stance === 'phase3') { yield 10; W.spawnAt('E', 'clapbot', 3, .2); W.spawnAt('W', 'clapbot', 3, .2); } }
  updateParts(dt, W) {
    this.hatch.open = this.hatch.open && this.stance !== 'phase1';
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    this.body2.hp = Math.max(this.body2.hp, 0);
    if (this.parts[0].alive === false) { this.die(W); return; }
    // the arms ride the body; the body is down when its HP is gone
    for (const a of this.arms) a.hp <= 0 && a.alive && (a.alive = false);
    if (this.body2.hp <= 0 && this.alive) { this.body2.alive = false; this.die(W); }
  }
  draw(r) {}
}

/* ---------------- THE WHEEL OF MISFORTUNE (room 2-B) ---------------- */
MT.WHEEL_SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
class Wheel extends Boss {
  constructor(W) {
    super(W, 'wheel', { x: 184, y: 52 });
    this.hub = this.part('hub', 0, 0, 14, 220, { armor: .15, id: 'hub' });
    this.clusters = MT.WHEEL_SEGS.map((name, i) => this.part('c' + i, 0, 0, 7, 18, { seg: i, name, onDestroy: (b, W2) => b.clusterGone(i, W2) }));
    this.angle = 0; this.spin = 0; this.spinSpeed = 0; this.segAlive = 8; this.loose = false; this.stunned = 0; this.seg = -1; this.nextAttack = 0; this.faster = 1;
    this.tasks.push(MT.task(this.script(W)));
  }
  clusterGone(i, W) { this.clusters[i].alive = false; this.segAlive--; W.popup(this.x, this.y + 40, 'VOID', '#666'); if (this.segAlive <= 4 && !this.loose) { this.loose = true; W.emit('boss-line', { key: 'wheel-loose' }); this.hub.armor = .5; this.tasks.push(MT.task(this.rollAround(W))); } }
  get hpLeft() { return this.hub.hp; }
  *script(W) {
    yield 1.8;   // the wheel drops onto its mount
    W.emit('boss-intro-done', { boss: 'wheel' }); W.emit('boss-line', { key: 'wheel-intro' });
    while (!this.loose && this.alive) {
      // spin for 2.5 s, then stop on a random living segment
      const spinT = 2.5 / this.faster; let t = 0;
      while (t < spinT) { this.spinSpeed = 6 * (1 - t / spinT) + 1; this.angle += this.spinSpeed * .02; t += .02; yield .02; }
      const alive = this.clusters.map((c, i) => c.alive ? i : -1).filter(i => i >= 0);
      if (!alive.length) break;
      const forced = this.forcedSegs && this.forcedSegs.length ? MT.WHEEL_SEGS.indexOf(this.forcedSegs.shift()) : -1;   // (the attract reel forces its segments)
      this.seg = forced >= 0 && this.clusters[forced].alive ? forced : alive[Math.floor(MT.rng.ai() * alive.length)];
      const target = -this.seg * Math.PI / 4 - Math.PI / 2;
      const a0 = this.angle, da = ((target - a0) % (Math.PI * 2) + Math.PI * 8) % (Math.PI * 2);
      for (let k = 0; k <= 50; k++) { const u = k / 50; this.angle = a0 + da * (1 - Math.pow(1 - u, 3)); if (k % 8 === 0) W.emit('wheel-click', {}); yield .04; }
      W.emit('boss-line', { key: 'wheel-seg', name: MT.WHEEL_SEGS[this.seg] });
      W.popup(this.x, this.y - 40, MT.WHEEL_SEGS[this.seg], '#ffcc33');
      yield* this.attack(W, MT.WHEEL_SEGS[this.seg]);
    }
    if (this.alive && this.loose) yield () => false;
  }
  *attack(W, name) {
    const p = () => nearestOf(W, this.x, this.y);
    const f = MT.T.enemyBulletSpeed * MT.run.diff.bullet;
    switch (name) {
      case 'TOMATO TIME': for (let i = 0; i < 8; i++) { const t = p(); if (t) W.lobTomato({ x: 184 + MT.rand(-120, 120), y: 20 }, t, .6); yield .3; } yield 1; break;
      case 'LASER LIGHTS': {   // four beams from the hub, sweeping 1.2 rad over four seconds (telegraphed for 0.8 s first)
        const beams = [0, 1, 2, 3].map(i => ({ a0: i * Math.PI / 2 + .2, t: 0, hit: 0 })); W.beams = (W.beams || []).concat(beams.map(b => Object.assign(b, { owner: this })));
        const life = { t: 0 }; this._beams = beams;
        for (let t = 0; t < 4.8; t += .05) { for (const b of beams) { b.a = b.a0 + Math.max(0, (t - .8)) / 4 * 1.2; b.t = t; } yield .05; }
        this._beams = null; W.beams = (W.beams || []).filter(b => !beams.includes(b)); break;
      }
      case 'MIME TIME': for (let i = 0; i < 6; i++) { let x, y, k = 0; do { x = MT.rand(40, 330); y = MT.rand(40, 200); k++; } while (W.players.some(c => MT.dist(c.x, c.y, x, y) < 40) && k < 50); W.spawnEnemy('mime', x, y, { counted: false }); } yield 1; break;
      case 'BANKRUPT': for (let ring = 0; ring < 2; ring++) { for (let i = 0; i < 20; i++) W.fShot(this.x, this.y, i / 20 * Math.PI * 2 + ring * .15, 85 * f, 'coin'); W.ratingsAdd(-10, 'bankrupt'); yield .4; } MT.sting('bankrupt'); yield 1; break;
      case 'DISCO FEVER': for (let i = 0; i < 2; i++) W.spawnEnemy('disco', this.x + (i ? 20 : -20), this.y + 30, { entering: false, cd: 3 }); yield 1; break;
      case 'GOON SQUAD': W.spawnAt('E', 'goon', 4, .2); W.spawnAt('W', 'goon', 4, .2); W.spawnAt('S', 'goon', 4, .2); yield 1; break;
      case 'JACKPOT': for (let i = 0; i < 20; i++) W.pickups.push(W.mkPickup('bill', MT.rand(60, 310), MT.rand(60, 210))); W.pickups.push(W.mkPickup('capsule', 184, 120, { cap: MT.pick(MT.CAPSULES) })); this.hub.armor = 1; this.stunned = 3; yield 3; this.hub.armor = .15; break;
      case 'SPIN AGAIN': this.faster = 1.5; this.spinAgainBullet = 1.2; yield .5; this.faster = 1; break;
    }
  }
  *rollAround(W) {   // phase 2: the wheel tears off its mount and rolls at 85 u/s, bouncing off the walls
    this.rolling = true; this.vx = 85 * (MT.rng.ai() < .5 ? 1 : -1); this.vy = 60;
    yield 1;
    this.rolling = true;
  }
  updateParts(dt, W) {
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    for (const c of this.clusters) if (c.alive) { const a = this.angle + c.seg * Math.PI / 4; c.ox = Math.cos(a) * 34; c.oy = Math.sin(a) * 34; }
    if (this.rolling) {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < 50 || this.x > 318) { this.vx = -this.vx; W.fSpray && 0; for (let i = 0; i < 8; i++) W.fShot(this.x, this.y, i / 8 * 6.28, 60, 'orb'); }
      if (this.y < 40 || this.y > 200) this.vy = -this.vy;
      this.x = Math.max(44, Math.min(324, this.x)); this.y = Math.max(40, Math.min(200, this.y));
      this.angle += this.vx * dt / 44;   // the wheel turns as it rolls
      for (const c of W.players) if (c.inPlay && MT.dist(c.x, c.y, this.x, this.y) < 40 && (this._roll || 0) <= 0) { W.hurtPlayer(c, 2, this); this._roll = .8; }
      this._roll = Math.max(0, (this._roll || 0) - dt);
    }
    if (this.hub.hp <= 0 && this.alive) { this.hub.alive = false; this.die(W); }
  }
  draw(r) {}
}

/* ---------------- LANCE LUSTRE LIVE! → THE NETWORK (room 3-B) ---------------- */
class Lance extends Boss {
  constructor(W) {
    super(W, 'lance', { x: 184, y: 90 });
    this.podium = this.part('podium', 0, 0, 22, 260, { armor: 1 });
    this.turrets = [this.part('tL', -22, -6, 8, 30), this.part('tR', 22, -6, 8, 30)];
    this.phaseName = 'starmaker'; this.lanceAway = false; this.netwk = false; this.tvs = []; this.eye = null; this.channelsOff = 0;
    this.tasks.push(MT.task(this.script(W)));
  }
  *script(W) {
    yield 1.5; W.emit('boss-intro-done', { boss: 'lance' }); W.emit('boss-line', { key: 'lance-intro' });
    this.tasks.push(MT.task(this.patterns(W)));
    this.tasks.push(MT.task(this.breaks(W)));
    this.tasks.push(MT.task(this.hover(W)));
  }
  *hover(W) { while (this.phaseName === 'starmaker') { const p = nearestOf(W, this.x, this.y); if (p) { const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1; const want = 120; this.x += (dx / d * (want - d)) * .02; this.y += (dy / d * (want - d)) * .02; } this.x = Math.max(60, Math.min(308, this.x)); this.y = Math.max(40, Math.min(150, this.y)); yield .02; } }
  *patterns(W) {
    const f = MT.T.enemyBulletSpeed * MT.run.diff.bullet;
    while (this.phaseName === 'starmaker') {
      // CUE CARD CYCLONE: three arms of card bullets spiralling, 12 a second for 3 s
      for (let k = 0; k < 36 && this.phaseName === 'starmaker'; k++) { for (let a = 0; a < 3; a++) W.fShot(this.x, this.y, k * .25 + a * 2.094, 100 * f, 'card'); yield .25; }
      yield 1;
      // MIC DROP: a shadow telegraphs the landing, then the slam: 24 orbs and a shockwave
      const p = nearestOf(W, this.x, this.y); const tx = p ? p.x : 184, ty = p ? p.y : 120;
      W.decals.push({ x: tx, y: ty, t: 1.0, kind: 'shadow', r: 30 });
      yield 1.0;
      this.x = tx; this.y = ty - 20;
      for (let i = 0; i < 24; i++) W.fShot(tx, ty, i / 24 * Math.PI * 2, 80 * f, 'orb');
      W.rings = (W.rings || []); W.rings.push({ x: tx, y: ty, r: 80, t: .5 });
      for (const c of W.players) if (c.inPlay && MT.dist(c.x, c.y, tx, ty) < 80 && c.slideT <= 0) W.hurtPlayer(c, 1, { x: tx, y: ty });
      yield 1.5;
      // SPOTLIGHT SWEEP: each living turret throws a cone that sweeps the floor
      if (this.turrets.some(t => t.alive)) { W.spots = this.turrets.filter(t => t.alive).map((t, i) => ({ x: this.x + (i ? 22 : -22), y: this.y, a: i ? Math.PI * .75 : Math.PI * .25, t: 0, sweep: 3 })); yield 3; W.spots = []; }
      yield 1;
    }
  }
  *breaks(W) {   // COMMERCIAL BREAK at 66 % and 33 %: Lance flies off, adds arrive for 12 s
    for (const at of [.66, .33]) {
      yield () => this.podium.hp <= this.podium.max * at || this.phaseName !== 'starmaker';
      if (this.phaseName !== 'starmaker') return;
      this.lanceAway = true; W.emit('boss-line', { key: 'lance-break' }); W.emit('commercial', {});
      W.spawnAt('E', 'goon', 3, .2); W.spawnAt('W', 'goon', 3, .2); W.spawnAt('N', 'clapbot', 3, .2); W.spawnAt('S', 'brute', 1, .2);
      yield 12; this.lanceAway = false;
    }
  }
  partDestroyedHook() {}
  updateParts(dt, W) {
    if (this.dying > 0) { this.dyingT += dt; this.dying -= dt; if (this.dying <= 0) W.bossDone(this); return; }
    if (this.phaseName === 'starmaker' && this.podium.hp <= 0) { this.phaseName = 'robot'; this.podium.alive = false; W.emit('boss-line', { key: 'lance-down' }); W.emit('lance-robot', {}); this.tasks.push(MT.task(this.network(W))); }
    if (this.phaseName === 'network') { this.updateNetwork(dt, W); }
  }
  *network(W) {   // the robot reveal, then the north wall rises: 12 TVs and THE EYE
    yield 2.5; this.phaseName = 'network'; W.emit('network-rise', {});
    this.x = 184; this.y = 84;   // the wall: a 4 x 3 grid of TVs and THE EYE, all inside the arena
    this.tvs = []; for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) this.tvs.push(this.part('tv' + (row * 4 + col), -66 + col * 44, -64 + row * 16, 10, 22, { tv: true, ch: 'idle', timer: 3 + col * .4 }));
    this.eye = this.part('eye', 0, -40, 18, 300, { armor: .15, eye: true, open: false });
    this.netTimer = 0;
    W.emit('boss-line', { key: 'network-intro' });
  }
  updateNetwork(dt, W) {
    for (const t of this.tvs) {
      if (!t.alive) continue;
      t.timer -= dt; if (t.timer <= 0) { t.timer = 4 + MT.rng.ai() * 2; t.ch = MT.pick(['static', 'news', 'cartoon', 'shopping', 'lance'], MT.rng.ai); this.channel(t, W); }
    }
    this.channelsOff = this.tvs.filter(t => !t.alive).length;
    this.eye.armor = this.channelsOff >= 8 ? 1 : .15;
    this.eye.open = this.channelsOff >= 8;
    if (this.eye.open) { this.netTimer += dt; }
    if (this.eye.hp <= 0 && this.alive) { this.eye.alive = false; W.emit('boss-line', { key: 'network-down' }); this.die(W); }
  }
  channel(t, W) {   // each channel flips with a 0.5 s flicker, and at most four TVs are active at once
    const [x, y] = this.partPos(t); const p = nearestOf(W, x, y);
    if (t.ch === 'static' && p) for (let i = 0; i < 5; i++) W.fShot(x, y, Math.atan2(p.y - y, p.x - x) + (i - 2) * .12, 110 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'static');
    else if (t.ch === 'news' && p) { W.beams = (W.beams || []).concat([{ x: p.x, y: 0, vertical: true, t: .8, life: 1, owner: this }]); }
    else if (t.ch === 'cartoon') { W.spawnEnemy('clapbot', x, y + 10, {}); W.spawnEnemy('clapbot', x + 6, y + 10, {}); }
    else if (t.ch === 'shopping') W.pickups.push(W.mkPickup('bill', p ? p.x + 20 : 184, p ? p.y : 120));
    else if (t.ch === 'lance') for (let i = -1; i <= 1; i++) W.fShot(x, y, Math.PI / 2 + i * .3, 100 * MT.T.enemyBulletSpeed * MT.run.diff.bullet, 'orb');
  }
  draw(r) {}
}

// the boss classes by room
MT.BOSS_CLASS = { mashy: Mashy, wheel: Wheel, lance: Lance };

/* ---- 10-draw.js ---- */
/* MASH TV — 10-draw: the room as the screen shows it: floor, walls and doors, the hazards and decals, the props, the pickups,
 * the rigs and the custom painters of the disco ball, the dolly tank, the cable snake and the bosses, and the shots. */

// the custom painters: each takes (r, e) and draws in the enemy's ground position
MT.paint = {
  disco(r, e) {   // a faceted ball: rotating glints, a light flare when it fires
    r.actor(e.x, e.y, 10 + (e.r > 9 ? 4 : 0), (g, ox, oy) => {
      const R = (e.r > 9 ? 9 : 6), a = e.spin || 0, hot = e.fire !== undefined;
      px.disc(g, ox, oy, R + 1, '#101018'); px.disc(g, ox, oy, R, hot ? '#ffffff' : '#c8c8e0');
      for (let i = 0; i < 6; i++) { const t = a + i * 1.05; px.dot(g, ox + Math.cos(t) * R * .6, oy + Math.sin(t) * R * .45, i % 2 ? '#ff3ab8' : '#3ad8ff'); }
      px.disc(g, ox - R * .35, oy - R * .35, R * .25, '#ffffff');
    }, { outline: true });
  },
  tank(r, e) {   // a camera dolly: box chassis, a lens turret, scrolling treads
    r.actor(e.x, e.y, 0, (g, ox, oy) => {
      const c = Math.cos(e.face), s = Math.sin(e.face);
      const pts = [[-14, -10], [14, -10], [14, 10], [-14, 10]].map(([u, v]) => [ox + c * u - s * v, oy + s * u + c * v + 0]);
      px.poly(g, pts, '#2c3440'); px.poly(g, pts.map(([x, y]) => [x, y - 6]), '#4a5566');
      const tr = (e.tread || 0) % 4;
      for (let i = 0; i < 4; i++) px.line(g, ox - 14 + ((i * 4 + tr) % 14), oy + 9, ox - 14 + ((i * 4 + tr) % 14), oy + 11, '#111', 1);
      const tx = ox + Math.cos(e.turret) * 4, ty = oy - 6 + Math.sin(e.turret) * 2;
      px.disc(g, tx, ty - 4, 6, '#1a1f28'); px.disc(g, tx + Math.cos(e.turret) * 5, ty - 4 + Math.sin(e.turret) * 3, 3, e.flashT > 0 ? '#ffffff' : '#ff3344');
    }, { outline: true });
  },
  snake(r, e) {   // a head plug and cable segments (striped discs), drawn with its segments
    r.actor(e.x, e.y, 2, (g, ox, oy) => { px.disc(g, ox, oy, 5, '#1a1a22'); px.disc(g, ox, oy, 3.4, e.lunge ? '#ff3344' : '#44d0a0'); px.dot(g, ox + 1, oy - 1, '#ffffff'); }, { outline: true });
  },
  snakeSeg(r, e) {
    r.queue(e.x, e.y, 2, g => { const [ox, oy] = r.w(e.x, e.y, 2); px.disc(g, ox, oy, 3.2, e.seg % 2 ? '#2a2a38' : '#44d0a0'); px.disc(g, ox, oy, 1.4, '#ffe040'); });
  },
  lock(r, e) { r.queue(e.x, e.y, 6, g => { const [ox, oy] = r.w(e.x, e.y, 6); px.disc(g, ox, oy, 6, '#8a94a8'); px.disc(g, ox, oy, 3, '#2a2a33'); }); },
  crate(r, e) { r.queue(e.x, e.y, 0, g => { r.box(g, e.x - 7, e.y - 7, 0, e.x + 7, e.y + 7, 12, '#c08a50', '#8a5a32'); }); }
};

Object.assign(World.prototype, {
  draw(r, ctx) {
    const G = MT.G;
    this.map.drawFloor(r);
    this.drawOutside(r);
    this.drawSetLights(r);
    this.drawDecals(r);
    this.drawHazards(r);
    this.map.queueWalls(r);
    for (const d of ['N', 'S', 'E', 'W']) MT.paintDoor(r, d, this);
    this.drawProps(r);
    for (const p of this.pickups) this.drawPickup(r, p);
    for (const e of this.enemies) this.drawEnemy(r, e);
    if (this.boss && this.boss.alive || this.boss && this.boss.dying > 0) this.drawBoss(r);
    for (const c of this.players) this.drawContestant(r, c, ctx);
    for (const s of this.pShots) this.drawShot(r, s, true);
    for (const s of this.fShots) this.drawShot(r, s, false);
    for (const k of this.rockets) this.drawRocket(r, k);
    for (const l of this.lobs) this.drawLob(r, l);
    for (const c of this.players) if (c.laser) this.drawLaser(r, c);
    this.drawBeams(r);
    this.drawSpots(r);
    for (const b of (this.bursts || [])) this.drawBurst(r, b);
    for (const rg of (this.rings || [])) this.drawRing(r, rg);
    if (this.flashT > 0) r.overlay(g => { g.fillStyle = 'rgba(255,255,255,' + (this.flashT / .12 * .5) + ')'; g.fillRect(0, 0, r.bw, r.bh); });
    for (const p of this.pops) r.text(p.text, ...r.w(p.x, p.y, 14), p.color, { align: 'center' });
  },
  // the outside dressing (§9.2): bleachers with audience on the east and west, the jumbotron above the north wall, camera cranes
  // and the front-row audience to the south; it shows when a wide screen reveals the studio around the arena
  drawOutside(r) {
    const tint = this.set === 'rooftop' ? [70, 80, 120] : this.set === 'warehouse' ? [120, 110, 100] : [90, 70, 130];
    const col = (a, k) => '#' + tint.map(v => Math.min(255, Math.round(v * (k || 1) * (1 + a * .15))).toString(16).padStart(2, '0')).join('');
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -130 : 378, x1 = side < 0 ? -10 : 498;
      for (let k = 0; k < 4; k++) {
        const y0 = 30 + k * 14, y1 = 240 - k * 14, z1 = 8 + k * 9;
        r.queue(side < 0 ? x1 : x0, (y0 + y1) / 2, 0, g => r.box(g, x0 + k * 4, y0, 0, x1 - k * 4, y1, z1, col(k, 1.2), col(k, .7)));
        for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
          const hx = x0 + 8 + i * 14, hy = y0 + 10 + j * 22; const cls = (i + j + k) % 4;
          r.queue(hx, hy, z1 + 2, g => { const [ox, oy] = r.w(hx, hy, z1 + 2); px.disc(g, ox, oy, 2.5, ['#ffcc33', '#2ee6ff', '#ff2e88', '#f4f4ff'][cls]); px.disc(g, ox, oy + 3, 2, '#2a1446'); });
        }
      }
    }
    // the jumbotron: a frame, a live face (it cycles the logo, the ratings, a sponsor), with scanlines
    const jt = Math.floor(this.time * .5) % 3;
    r.queue(184, -36, 40, g => r.box(g, 124, -68, 40, 244, -4, 86, '#2a2a40', '#15152a'));
    r.queue(184, -36, 88, g => { const [ox, oy] = r.w(184, -36, 88); px.rect(g, ox - 52, oy - 2, 104, 20, '#0a0a18'); E.font.title(g, jt === 0 ? 'MASH TV' : jt === 1 ? 'RATINGS' : 'KRUNCH-O', ox, oy, { scale: 1, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); });
    // camera cranes at the south corners, and the front row
    for (const cx of [54, 314]) r.queue(cx, 272, 0, g => r.box(g, cx - 3, 268, 0, cx + 3, 276, 60, '#3a3a4a', '#222230'));
    for (let i = 0; i < 18; i++) { const hx = 40 + i * 16, hy = 262; r.queue(hx, hy, 4, g => { const [ox, oy] = r.w(hx, hy, 4); px.disc(g, ox, oy, 2.4, ['#ffcc33', '#2ee6ff', '#ff2e88'][i % 3]); }); }
  },
  drawSetLights(r) {
    const S = MT.SETS[this.set]; if (!S || !MT.G || !MT.G.lights) return;
    S.light.forEach((col, i) => { const a = this.time * .4 + i * 1.7; MT.G.lights.add(184 + Math.cos(a) * 120, 120 + Math.sin(a * .7) * 70, 30, 80, S.spot ? .55 : .35, { color: col }); });
  },
  drawDecals(r) {
    for (const s of this.splats) r.decal(() => r.groundDisc(s.x, s.y, s.r, '#c02020', .45));
    for (const d of this.decals) {
      if (d.kind === 'ring') r.decal(() => r.groundRing(d.x, d.y, 12, '#ff3344', .7));
      else if (d.kind === 'shadow') r.decal(() => r.groundDisc(d.x, d.y, d.r, '#000000', .45));
    }
    for (const s of (this.dropShadows || [])) r.decal(() => r.groundDisc(s.x, s.y, 10, '#000', .5));
    for (const v of (this.vents || [])) {
      if (v.state === 'telegraph') r.decal(() => r.groundDisc(v.x, v.y, 10, '#ffb020', .35 + .3 * Math.sin(this.time * 20)));
      if (v.state === 'flame') { r.decal(() => r.groundDisc(v.x, v.y, 12, '#ff6a20', .6)); r.queue(v.x, v.y, 4, g => { const [ox, oy] = r.w(v.x, v.y, 4); px.disc(g, ox, oy - 8, 7 + Math.sin(this.time * 30) * 2, '#ffd060'); px.disc(g, ox, oy - 4, 5, '#ff6a20'); }, { emissive: true }); }
    }
    for (const b of (this.beamsGround || [])) r.decal(() => r.groundDisc(b.x, b.y, 4, '#ff3344', .5));
  },
  drawHazards(r) {
    for (const cv of this.conveyors) {
      const d = cv.dir;
      r.decal(() => { for (let x = 24; x < 344; x += 12) r.groundDisc(x, (cv.y0 + cv.y1) / 2, 2.6, d > 0 ? '#ffcc33' : '#2ee6ff', .6); });
    }
  },
  drawProps(r) {
    if (this.set === 'greenroom') {
      for (const sx of [70, 300]) r.queue(sx, 60, 0, g => r.box(g, sx - 22, 52, 0, sx + 22, 70, 9, '#7a2a3a', '#4a1a26'));
      r.queue(184, 200, 0, g => r.box(g, 168, 194, 0, 200, 206, 12, '#e8e0d0', '#9a8a70'));
      r.queue(184, 200, 13, g => { const [ox, oy] = r.w(184, 200, 13); px.disc(g, ox, oy, 6, '#ff8ad8'); px.disc(g, ox, oy - 2, 3, '#fff7e8'); }, { emissive: false });
      for (const tx of [120, 248]) r.queue(tx, 16, 14, g => { const [ox, oy] = r.w(tx, 16, 14); px.rect(g, ox - 10, oy - 7, 20, 14, '#15151c'); px.rect(g, ox - 8, oy - 5, 16, 10, '#2ee6ff'); });
    }
    for (const e of this.enemies) if (e.kind === 'crate' || e.kind === 'lock') MT.paint[e.kind](r, e);
    if (this.cage) r.queue(this.cage.x, this.cage.y, 0, g => { for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, [ox, oy] = r.w(this.cage.x + Math.cos(a) * 14 * (1 - this.cage.up), this.cage.y + Math.sin(a) * 14 * (1 - this.cage.up), 0); px.disc(g, ox, oy, 1.5, '#ffcc33'); } });
    for (const [cx, cy] of (this.R.locks || []) ) { const [x, y] = [24 + cx * 16, 14]; r.queue(x, y, 0, () => {}); }
  },
  drawPickup(r, p) {
    const S = MT.SPR; const bob = Math.sin((p.age || 0) * 4) * 1.5;
    const blink = !p.persist && p.life < 2.5 && Math.floor(p.life * 10) % 2;
    if (blink) return;
    const z = 4 + bob;
    if (p.kind === 'bill') r.sprite(p.x, p.y, z, S.bill, { glow: .4 });
    else if (p.kind === 'stack') r.sprite(p.x, p.y, z, S.stack, { glow: .5 });
    else if (p.kind === 'gold') r.sprite(p.x, p.y, z, S.gold, { glow: .7 });
    else if (p.kind === 'case') r.sprite(p.x, p.y, z, S.case, { glow: .7 });
    else if (p.kind === 'prize') r.sprite(p.x, p.y, z, S.prize, { glow: .8 });
    else if (p.kind === 'key') r.sprite(p.x, p.y, z + 4, S.key, { glow: 1 });
    else if (p.kind === 'capsule') { r.sprite(p.x, p.y, z + 4, S.capsule, { glow: .6 }); r.queue(p.x, p.y, z + 12, g => { const [ox, oy] = r.w(p.x, p.y, z + 12); E.font.text(g, (MT.WEAPONS[p.cap] || {}).name ? (p.cap || '?')[0].toUpperCase() : '?', ox - 3, oy - 3, '#2ee6ff', { scale: 1 }); }); }
    else if (p.kind === 'bomb') r.sprite(p.x, p.y, z + 4, S.flash, { glow: 1 });
    else if (p.kind === 'life') r.sprite(p.x, p.y, z + 4, S.star, { glow: 1 });
    else if (p.kind === 'statuette') r.sprite(p.x, p.y, z + 4, S.statuette, { glow: 1 });
    if (p.kind === 'statuette') { r.decal(() => r.groundDisc(p.x, p.y, 34, '#ffffcc', .18)); r.decal(() => r.groundRing(p.x, p.y, 22, '#ffcc33', .5)); }
    if (p.kind === 'prize' || p.kind === 'key') r.decal(() => r.groundDisc(p.x, p.y, 6, p.kind === 'key' ? '#ffcc33' : '#ff8ad8', .25));
  },
  drawEnemy(r, e) {
    if (!e.alive) return;
    if (e.kind === 'snakeSeg') { MT.paint.snakeSeg(r, e); return; }
    if (e.kind === 'crate' || e.kind === 'lock') return;
    if (e.kind === 'disco' || e.kind === 'discoBig' || e.kind === 'discoSmall') { MT.paint.disco(r, e); return; }
    if (e.kind === 'tank') { MT.paint.tank(r, e); return; }
    if (e.kind === 'snake') { MT.paint.snake(r, e); return; }
    if (!e.rig) return;
    const alpha = e.alpha || 1;
    // the mime's 'trapped in a box': a glass box it presses against, shaking as the telegraph builds
    let dx = (e.kind === 'brute' && e.stun > 0) ? Math.sin(this.time * 14) * 2.5 : 0;   // the brute's stunned wobble
    if (e.kind === 'mime') {
      dx = e.blast !== undefined ? Math.sin(this.time * 60) * 2.2 : 0;
      const B = 13, H = 26, cx = e.x, cy = e.y;
      r.queue(cx, cy, 0, g => {
        const c = [[-B, -B, 0], [B, -B, 0], [B, B, 0], [-B, B, 0]].map(([u, v]) => r.w(cx + u, cy + v, 0));
        const t = [[-B, -B, H], [B, -B, H], [B, B, H], [-B, B, H]].map(([u, v]) => r.w(cx + u, cy + v, H));
        const col = e.blast !== undefined ? '#ff3344' : '#9fe6ff';
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; px.line(g, c[i][0], c[i][1], c[j][0], c[j][1], col, 1); px.line(g, t[i][0], t[i][1], t[j][0], t[j][1], col, 1); px.line(g, c[i][0], c[i][1], t[i][0], t[i][1], col, 1); }
      }, { emissive: true });
    }
    r.shadow(e.x, e.y, e.r + 1, .35, undefined, 0);
    r.actor(e.x + dx, e.y, e.z || 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : undefined, alpha, outline: true });
    // the brute stunned: stars orbiting its head
    if (e.kind === 'brute' && e.stun > 0) {
      for (let k = 0; k < 3; k++) { const a = this.time * 5 + k * 2.1; const sx = e.x + Math.cos(a) * 10, sy = e.y + Math.sin(a) * 4; r.queue(sx, sy, 48, g => { const [ox, oy] = r.w(sx, sy, 48); px.disc(g, ox, oy, 2, '#ffe040'); px.line(g, ox - 3, oy, ox + 3, oy, '#fff7c0', 1); px.line(g, ox, oy - 3, ox, oy + 3, '#fff7c0', 1); }, { emissive: true }); }
    }
    if (e.kind === 'mime' && e.blast !== undefined) r.queue(e.x, e.y, 30, g => { const [ox, oy] = r.w(e.x, e.y, 30); px.disc(g, ox, oy, 4 + Math.sin(this.time * 40) * 2, '#ff3344'); });
    if (e.wind > 0) r.queue(e.x, e.y, 30, g => { const [ox, oy] = r.w(e.x, e.y, 30); px.disc(g, ox, oy, 3, '#ffcc33'); });
  },
  drawContestant(r, c, ctx) {
    if (!c.rig) return;
    if (c.state === 'out') { /* a down body */ }
    const blinkOff = c.invulnT > 0 && Math.floor(this.time * 12) % 2 === 0 && c.state === 'play';
    if (blinkOff && c.state !== 'dead') return;
    r.shadow(c.x, c.y, 6, .35, undefined, 0);
    r.actor(c.x, c.y, c.dropZ || 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { flash: c.hurtT > 0 ? '#ff3344' : undefined, outline: true });
    if (c.shielded) r.queue(c.x, c.y, 12, g => { const [ox, oy] = r.w(c.x, c.y, 12); px.disc(g, ox, oy, 15, 'rgba(255,46,136,0.18)'); px.disc(g, ox, oy, 15, 'rgba(255,46,136,0.12)'); });
    for (const o of (c.records || [])) r.queue(o.x, o.y, 6, g => { const [ox, oy] = r.w(o.x, o.y, 6); px.disc(g, ox, oy, 3.2, '#ffcc33'); px.disc(g, ox, oy, 1, '#fff7c0'); }, { emissive: true });
  },
  drawShot(r, s, mine) {
    const col = mine ? '#fff7c0' : ({ butter: '#ffe070', gravy: '#b06a20', coin: '#ffd040', card: '#f4f4ff', static: '#c0ffff', shard: '#ffb050', beam: '#ff9a3c', shell: '#ffb020', orb: '#ff9a3c', tot: '#e0c060' })[s.kind] || '#ff9a3c';
    r.queue(s.x, s.y, s.z || 4, g => {
      const [ox, oy] = r.w(s.x, s.y, s.z || 4);
      if (mine) { px.disc(g, ox, oy, 2.6, '#ffcc33'); px.disc(g, ox, oy, 1.2, '#ffffff'); }
      else { px.disc(g, ox, oy, s.kind === 'shell' ? 4 : 2.6, '#14060a'); px.disc(g, ox, oy, s.kind === 'shell' ? 3 : 1.8, col); px.disc(g, ox - .5, oy - .5, .8, '#ffffe0'); }
    }, { emissive: !mine });
  },
  drawRocket(r, k) {
    r.queue(k.x, k.y, 5, g => { const [ox, oy] = r.w(k.x, k.y, 5); for (const [tx, ty] of k.trail) { const [a, b] = r.w(tx, ty, 5); px.dot(g, a, b, '#ffb060'); } px.disc(g, ox, oy, 3, '#e8443a'); px.disc(g, ox - 1, oy - 1, 1.2, '#fff0c0'); }, { emissive: true });
  },
  drawLob(r, l) {
    const col = l.kind === 'tomato' ? '#ff3a2a' : l.kind === 'tot' ? '#e0c060' : '#fff7c0';
    r.queue(l.x, l.y, l.z || 6, g => { const [ox, oy] = r.w(l.x, l.y, l.z || 6); px.disc(g, ox, oy, 3.6, col); px.disc(g, ox - 1, oy - 1, 1, '#ffffff'); }, { emissive: true });
  },
  drawLaser(r, c) {
    const L = c.laser;
    r.queue(c.x, c.y, 6, g => { const [a, b] = r.w(L.x0, L.y0, 6), [x2, y2] = r.w(L.x1, L.y1, 6); px.line(g, a, b, x2, y2, '#ff3ab8', 3); px.line(g, a, b, x2, y2, '#ffffff', 1); }, { emissive: true });
  },
  drawBeams(r) {
    for (const b of (this.beams || [])) {
      if (b.vertical) { if (b.tele > 0) r.decal(() => r.groundDisc(b.x, 120, 4, '#ff3344', .4)); else r.queue(b.x, 120, 40, g => { const [a, c] = r.w(b.x, 0, 40), [d, e] = r.w(b.x, 240, 40); px.line(g, a, c, d, e, '#ff3344', 6); }, { emissive: true }); continue; }
      const x2 = b.x0 + Math.cos(b.a) * 300, y2 = b.y0 + Math.sin(b.a) * 300;
      if (b.active) r.queue(b.x0, b.y0, 12, g => { const [a, c] = r.w(b.x0, b.y0, 12), [d, e] = r.w(x2, y2, 12); px.line(g, a, c, d, e, '#ff3344', 3); px.line(g, a, c, d, e, '#ffd0d0', 1); }, { emissive: true });
      else r.decal(() => { for (let k = 0; k <= 12; k++) r.groundDisc(b.x0 + Math.cos(b.a) * k * 25, b.y0 + Math.sin(b.a) * k * 25, 1.5, '#ff3344', .5); });
    }
  },
  drawSpots(r) {
    for (const s of (this.spots || [])) r.decal(() => r.groundArc(s.x, s.y, 4, 170, s.a - .4, s.a + .4, '#ffffe0', .25));
  },
  drawBurst(r, b) {
    const k = b.big ? 1.6 : 1, n = (MT.G && MT.G.settings.confetti === 'tasteful') ? (b.big ? 7 : 3) : (b.big ? 14 : 6);
    r.queue(b.x, b.y, 4, g => { const [ox, oy] = r.w(b.x, b.y, 4); const cols = ['#ffcc33', '#ff2e88', '#2ee6ff', '#ffffff']; for (let i = 0; i < n; i++) { const a = i * 2.4 + b.t * 9, d = (1 - b.t * 2) * 16 * k; px.dot(g, ox + Math.cos(a) * d, oy + Math.sin(a) * d * .6 - (1 - b.t * 2) * 6, cols[i % 4]); } }, { emissive: true });
  },
  drawRing(r, rg) {
    r.decal(() => r.groundRing(rg.x, rg.y, rg.r * (1 - rg.t * 1.5 > 0 ? 1 : 1), '#ffb020', Math.max(0, rg.t * 2)));
  },
  drawBoss(r) {
    const b = this.boss; if (!b) return;
    if (b.kind === 'mashy') return this.drawMashy(r, b);
    if (b.kind === 'wheel') return this.drawWheel(r, b);
    if (b.kind === 'lance') return this.drawLance(r, b);
  },
  drawMashy(r, b) {
    r.shadow(b.x, b.y, 30, .4, undefined, 0);
    r.actor(b.x, b.y, 20, (g, ox, oy) => {
      px.disc(g, ox, oy, 26, '#d8c08a'); px.disc(g, ox, oy, 23, '#eed8a0'); px.disc(g, ox - 8, oy - 8, 4, '#ffffff');
      px.disc(g, ox - 8, oy - 6, 4, '#ffffff'); px.disc(g, ox + 8, oy - 6, 4, '#ffffff'); px.disc(g, ox - 8, oy - 6, 1.6, '#222'); px.disc(g, ox + 8, oy - 6, 1.6, '#222');
      px.line(g, ox - 10, oy + 6, ox + 10, oy + 6, '#7a4a20', 2);
      if (b.hatch.open) px.disc(g, ox, oy + 14, 9, '#5a1a1a');
      for (const a of b.arms) if (a.alive) { px.disc(g, ox + (a.ox || 0), oy + 6, 10, '#7a5a30'); px.disc(g, ox + (a.ox || 0), oy + 6, 7, '#9a7a40'); }
      px.poly(g, [[ox - 10, oy + 26], [ox + 10, oy + 26], [ox + 4, oy + 34], [ox - 4, oy + 34]], '#15121c');   // the bow tie and tread
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
  },
  drawWheel(r, b) {
    r.actor(b.x, b.y, 40, (g, ox, oy) => {
      px.disc(g, ox, oy, 44, '#2a1640'); px.disc(g, ox, oy, 41, '#ffcc33');
      for (let i = 0; i < 8; i++) { const a0 = b.angle + i * Math.PI / 4, a1 = a0 + Math.PI / 4; const c = b.clusters[i]; const col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#22c55e', '#ff6a6a', '#b08aff', '#5fe0a0', '#ff8ad8'][i]; px.poly(g, [[ox, oy], [ox + Math.cos(a0) * 38, oy + Math.sin(a0) * 38], [ox + Math.cos(a1) * 38, oy + Math.sin(a1) * 38]], i % 2 ? col : '#3a2a50'); if (c.alive) px.disc(g, ox + Math.cos(a0 + Math.PI / 8) * 34, oy + Math.sin(a0 + Math.PI / 8) * 34, 7, '#fff7c0'); }
      px.disc(g, ox, oy, 14, b.hub.hp > 0 ? '#c8d0e0' : '#444');
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
  },
  drawLance(r, b) {
    r.shadow(b.x, b.y, 22, .35, undefined, 0);
    if (b.phaseName === 'starmaker') r.actor(b.x, b.y, 10, (g, ox, oy) => {
      px.disc(g, ox, oy, 22, '#caa030'); px.disc(g, ox, oy, 18, '#ffd850'); px.disc(g, ox, oy - 4, 9, '#f5e6b0');
      for (const t of b.turrets) if (t.alive) px.disc(g, ox + t.ox, oy + t.oy, 8, '#fafafa');
    }, { flash: b.hitFlash > 0 ? '#ffffff' : undefined, outline: true });
    if (b.phaseName === 'starmaker') for (const jx of [-12, 12]) { r.queue(b.x + jx, b.y + 20, 2, g => { const [ox, oy] = r.w(b.x + jx, b.y + 20, 2); const f = 4 + Math.sin(this.time * 40 + jx) * 2; px.disc(g, ox, oy + 2, f, 'rgba(255,160,60,0.8)'); px.disc(g, ox, oy + 1, f * .5, '#ffe9a0'); }, { emissive: true }); }
    else if (b.phaseName === 'network') {
      for (const t of b.tvs) { if (!t.alive) continue; r.queue(b.x + t.ox, b.y + t.oy, 12, g => { const [ox, oy] = r.w(b.x + t.ox, b.y + t.oy, 12); px.rect(g, ox - 9, oy - 7, 18, 13, '#15151c'); px.rect(g, ox - 7, oy - 5, 14, 9, t.ch === 'static' ? '#ffffff' : t.ch === 'news' ? '#ff3344' : '#2ee6ff'); }, { emissive: true }); }
      r.queue(b.x + b.eye.ox, b.y + b.eye.oy, 20, g => { const [ox, oy] = r.w(b.x + b.eye.ox, b.y + b.eye.oy, 20); px.disc(g, ox, oy, 18, '#1a0a20'); px.disc(g, ox, oy, b.eye.open ? 12 : 9, b.eye.open ? '#ff3344' : '#5a2a6a'); px.disc(g, ox, oy, 4, '#ffffff'); }, { emissive: true });
    }
  }
});
MT.tickScripts = null;

/* ---- 11-play.js ---- */
/* MASH TV — 11-play: the run, the reaction table (events → sound, banners, lines, crowd), the lower third, and the play scene.
 * The run's whole flow is one generator (episode cards, rooms, map cards, bosses, continue, the end) run by game.script. */

/* ---------- the banners and the lower third (the broadcast layer, §5.12) ---------- */
MT.banners = [];
MT.lines = [];       // queued lines: { speaker, text, prio, voice, dur }
MT.lineNow = null;
MT.lastLineAt = -10;
MT.banner = (text, color, t = 2.2) => { MT.banners.push({ text, color: color || '#ffcc33', t, age: 0 }); };
MT.say = (speaker, text, o = {}) => { const L = { speaker, text: MT.fill(text, o.vars), prio: o.prio || 1, dur: o.dur, voice: o.voice || ({ LANCE: 'lance', PENNY: 'penny', ANNC: 'annc', NETWORK: 'network', MASHY: 'mashy' }[speaker] || 'lance') }; MT.lines.push(L); MT.lines.sort((a, b) => b.prio - a.prio); return L; };

// the reaction table: one place from events to what the player sees and hears. Gameplay code only emits events.
MT.react = {
  kill(d, W) { const big = d.big; MT.sfx(MT.killSfx(d.e.kind)); if (big) MT.babble.crowd('cheer', .9); else if (Math.random() < .3) MT.babble.crowd('cheer', .3); },
  hurt(d) { MT.sfx('hit'); MT.sfx('buzz', { vol: .6 }); MT.babble.crowd('ooh', .5); MT.lineFrom('hurt', 2); if (d.c.hp === 1) MT.say('LANCE', MT.TEXT.lowHp, { prio: 3 }); },
  death(d) { MT.sfx('death'); MT.lineFrom('death', 3, { NAME: d.c.name }); MT.babble.crowd('laugh', .6); MT.banner('MASHED!', '#ff3344', 1.8); },
  out(d) { MT.banner(d.c.name + ': OUT', '#ff3344', 2.5); MT.sfx('lose'); },
  respawn(d) { MT.sfx('respawn'); },
  land(d) { MT.sfx('land'); },
  shoot(d) { if (d.w === 'blaster') MT.sfx('pew', { vol: .3 }); else if (d.w === 'spread') MT.sfx('spread', { vol: .5 }); else if (d.w === 'rockets') MT.sfx('rocket', { vol: .5 }); else if (d.w === 'popcorn') MT.sfx('pop', { vol: .6 }); },
  slide(d) { MT.sfx('slide'); },
  showboat(d) { },
  'showboat-start'(d) { MT.sfx('showboat'); MT.lineFrom('showboat', 2); },
  boat(d) { if (d.gain >= 15) MT.babble.crowd('cheer', .8); },
  showstop(d) { MT.sfx('flash'); MT.sfx('boom'); MT.banner('SHOWSTOPPER!', '#ffffff', 1.2); },
  powerup(d) { MT.sfx('powerup'); MT.banner((MT.WEAPONS[d.kind] || {}).name || d.kind, '#2ee6ff', 1.4); },
  pwrexp(d) { MT.sfx('pwrexp', { vol: .5 }); },
  'bomb-pickup'(d) { MT.sfx('powerup'); },
  encore(d) { MT.sfx('oneup'); MT.banner('ENCORE!', '#ffcc33', 2); if (MT.chatter() !== 'off') MT.say('LANCE', MT.TEXT.encore, { prio: 3 }); },
  flash(d) { if (MT.G && MT.G.settings.reduceMotion !== true) MT.G.flash('#ffffff', .15, .5); },
  cash(d) { if (d.v >= 1000) MT.sfx('cash', { vol: .5 }); else MT.sfx('cash', { vol: .25 }); },
  'pick-cash'(d) { },
  prize(d) { MT.sfx('prize'); MT.banner('YOU WON: ' + d.prize[0] + '! $' + d.prize[1].toLocaleString('en-US'), '#ff8ad8', 3); MT.say('PENNY', MT.fill(MT.TEXT.prize, { PRIZE: d.prize[0] }), { prio: 2 }); MT.say('PENNY', d.prize[2], { prio: 2 }); },
  key(d) { MT.sfx('key'); MT.banner('GOLDEN KEY ' + d.n + '/9', '#ffcc33', 2.2); if (d.n === 1) MT.say('LANCE', MT.TEXT.key[0], { prio: 3 }); else if (d.n === 2) MT.say('LANCE', MT.TEXT.key[1], { prio: 3 }); },
  prime(d) { MT.sfx('sting'); MT.banner('PRIME TIME!', '#ff2e88', 2.6); MT.lineFrom('prime', 3); MT.babble.crowd('cheer', 1); MT.layer('prime', .9, .3); },
  'prime-end'(d) { MT.layer('prime', 0, .4); },
  stunt(d) { MT.banner('WE\'RE LOSING VIEWERS!', '#ff8a4a', 2.4); MT.lineFrom('stunt', 2); MT.sfx('klaxon', { vol: .6 }); },
  clear(d) { MT.sfx('sting'); MT.banner('ROOM CLEAR!', '#ffcc33', 2); MT.lineFrom('roomClear', 2); MT.babble.crowd('applause', .8); },
  exits(d) { MT.sfx('door'); MT.say('ANNC', MT.TEXT.hints.exit, { prio: 1 }); },
  leave(d) { MT.sfx('door'); },
  hurry(d) { MT.say('LANCE', MT.TEXT.hurry, { prio: 2 }); MT.sfx('klaxon', { vol: .4 }); },
  door(d) { MT.sfx('door', { vol: .4 }); },
  'door-open'(d) { MT.sfx('klaxon', { vol: .25 }); MT.sfx('door', { vol: .2 }); },
  telegraph(d) { const k = d.kind; if (k === 'goon') MT.sfx('goon', { vol: .25 }); else if (k === 'popper') MT.sfx('fuse'); else if (k === 'mime') MT.sfx('mime'); else if (k === 'disco') MT.sfx('disco'); else if (k === 'tank') MT.sfx('shell', { vol: .2 }); else if (k === 'brute') MT.sfx('roar'); else if (k === 'snake') MT.sfx('snake', { vol: .4 }); else if (k === 'heckler') MT.sfx('splat', { vol: .15 }); },
  'tank-fire'(d) { MT.sfx('tank'); },
  hop(d) { MT.sfx('hop', { vol: .2 }); },
  splat(d) { MT.sfx('splat', { vol: .4 }); },
  pop(d) { MT.sfx('pop', { vol: .4 }); },
  boom(d) { MT.sfx('boom', { vol: .3 }); },
  wallhit(d) { MT.sfx('crash'); MT.sfx('stomp'); },
  'vent-tele'(d) { MT.sfx('vent', { vol: .15 }); },
  'vent-fire'(d) { MT.sfx('vent', { vol: .4 }); },
  'conveyor-warn'(d) { MT.sfx('klaxon', { vol: .3 }); MT.banner('BELTS REVERSING!', '#ffb020', 1.2); },
  'wheel-click'(d) { MT.sfx('wheel', { vol: .35 }); },
  laser(d) { MT.sfx('laser', { vol: .2 }); },
  segment(d) { MT.sfx('snap'); },
  crate(d) { MT.sfx('pop'); MT.sfx('cash', { vol: .4 }); },
  lock(d) { MT.sfx('crash', { vol: .3 }); },
  vault(d) { MT.sfx('prize'); MT.banner('THE SAFE IS OPEN!', '#ffcc33', 2.4); },
  'key-rise'(d) { MT.sfx('key'); },
  'cage-open'(d) { MT.sfx('sting'); MT.banner('THE CAGE IS UP!', '#ffcc33', 1.8); },
  steal(d) { MT.banner(MT.TEXT.steal, '#ffcc33', 2.2); MT.sfx('oneup', { vol: .5 }); },
  'boss-dies'(d) { MT.sfx('crash'); MT.sfx('boom'); MT.babble.crowd('cheer', 1); },
  'boss-line'(d) { MT.bossLine(d.key, d); },
  'boss-intro-done'(d) { },
  'network-rise'(d) { MT.sfx('static'); },
  'lance-robot'(d) { MT.sfx('sting'); MT.say('ANNC', 'LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!', { prio: 4 }); },
  commercial(d) { MT.music('commercial'); MT.babble.crowd('laugh', .5); },
  'wave'(d) { },
  statuette(d) { MT.sfx('prize'); },
  'telegraph-boss'(d) { },
  'bomb'(d) { },
  'segment-done'(d) { },
  'pick-capsule'(d) { }
};
MT.killSfx = k => ({ goon: 'bash', clapbot: 'clap', popper: 'pop', mime: 'pfft', disco: 'disco', discoBig: 'disco', heckler: 'splat', tank: 'boom', snake: 'snap', brute: 'roar', hecklerKing: 'key' })[k] || 'pop';
// the event rate limit: a line from a pool at most once every 6 s (§5.12); the pool never repeats until it runs out
MT.chatter = () => (MT.G && MT.G.settings.chatter) || 'normal';
MT.lineFrom = (key, prio, vars = {}) => {
  if (MT.chatter() === 'off' || (MT.chatter() === 'less' && prio < 3)) return;
  if (MT.G && MT.G.time - MT.lastLineAt < 6 && prio < 3) return;
  const list = MT.TEXT[key] || [];
  const text = Array.isArray(list) ? MT.pick_unique(key, list) : list;
  if (!text) return;
  MT.lastLineAt = MT.G ? MT.G.time : 0;
  MT.say('LANCE', MT.fill(text, vars), { prio });
};
MT.bossLine = (key, d) => {
  const B = MT.TEXT.bossLine;
  const map = { 'mashy-intro': ['MASHY', MT.TEXT.bossIntro.mashy[2]], 'mashy-phase3': ['LANCE', B.mashyP3], 'wheel-intro': ['LANCE', MT.TEXT.bossIntro.wheel[0]], 'wheel-loose': ['LANCE', B.wheelLoose],
    'wheel-seg': ['LANCE', (d && d.name) + '!'], 'lance-intro': ['LANCE', MT.TEXT.bossIntro.lance[0]], 'lance-break': ['LANCE', B.lanceBreak], 'lance-down': ['LANCE', B.lanceDown],
    'network-intro': ['NETWORK', B.networkIntro], 'network-down': ['NETWORK', B.networkDown] };
  const e = map[key]; if (e) MT.say(e[0], e[1], { prio: 4, voice: e[0] === 'NETWORK' ? 'network' : e[0] === 'MASHY' ? 'mashy' : 'lance' });
};
MT.reactTo = (ev) => { const f = MT.react[ev.type]; if (f) { try { f(ev.data, ev); } catch (err) { if (MT.G) MT.G.fail('react ' + ev.type, err); } } };

/* ---------- the run: created at START THE SHOW; the flow of the whole game is run from here ---------- */
MT.startRun = (o) => {
  const run = MT.run = MT.newRun(o);
  MT.seedAll(run.seed);
  run.players = [];
  for (const slot of o.slots) run.players.push({ slot, c: null });
  return run;
};
MT.makeContestants = (run, W0) => {
  for (const p of run.players) if (!p.c) { p.c = new Contestant(W0 || { diff: run.diff }, p.slot, { lives: run.diff.lives, hp: run.diff.hp }); p.c.input = p.input; p.c.netRemote = !!p.remote; }
  return run.players.map(p => p.c);
};
MT.stillIn = (run) => run.players.some(p => p.c && p.c.state !== 'out');
MT.allOut = (run) => run.players.length > 0 && run.players.every(p => p.c && p.c.state === 'out');

// how many contestants are still in, and the roster for a room's walk-in
MT.roster = (run) => run.players.map(p => p.c).filter(c => c && c.state !== 'out');

/* ---------- the play scene ---------- */
MT.PLAY = { W: null, flow: null, paused: false, cutting: false, hintsSeen: {}, overlayOn: false, mapCard: null, card: null, stageName: '' };
MT.setRoom = (W) => { MT.PLAY.W = W; };
// a drop-in during a run: the next free slot, a contestant that cable-drops in by the entry door (§5.1)
MT.dropIn = (input) => {
  const run = MT.run, W = MT.PLAY.W; if (!run || !W || run.players.length >= 4) return;
  const slot = MT.G.players.indexOf(input); if (slot < 0 || run.players.some(p => p.slot === slot)) return;
  const c = new Contestant(W, slot, { lives: run.diff.lives, hp: run.diff.hp, cash: 0 });
  c.input = input; c.W = W; const d = W.dropPoint(slot); c.x = d[0]; c.y = d[1]; c.state = 'drop'; c.dropZ = 70;
  run.players.push({ slot, input, c }); W.players.push(c); MT.banner(c.name + ' DROPS IN', c.color, 2); MT.sfx('respawn');
};

// one tick of the play scene: the intents, the world step, the rigs and the event queue
MT.playStep = (G, dt) => {
  const S = MT.PLAY, W = S.W, run = MT.run; if (!W || !run) return;
  if (MT.dev && MT.dev.open && MT.dev.freeze && !MT.dev.frameStep) return;
  MT.dev && (MT.dev.frameStep = false);
  if (S.cutting || S.holdWorld) return;
  const players = G.players, cheats = (run && run.cheats) || {};
  // each contestant's intent from its own input (its own pad or half-keyboard)
  for (const c of W.players) {
    c.infiniteBombs = !!cheats.infinite; if (cheats.infinite) c.bombs = Math.max(c.bombs, 3);
    if (cheats.autopilot && c === W.players[0]) { c.intent = MT.bot(c, W); continue; }
    if (c.netRemote) { c.intent = MT.netRemoteIntent(c); continue; }   // another copy's player: its last intent, run by the host
    if (c.bot) { c.intent = MT.bot(c, W); continue; }
    const I = c.input || G.input;
    if (!I) { c.intent = null; continue; }
    c.intent = MT.intentFrom(I, c, G, W);
    if (MT.NET.on && MT.netOverlay.open && c.slot === MT.NET.me) c.intent = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  }
  const wdt = dt * (G.timeScale || 1);
  W.step(wdt);
  // the rigs, from this step's state (their draw reads them)
  if (!MT.cfg.skipRigs) {
    for (const c of W.players) if (c.rig) c.rig.update(wdt, c.rsState);
    for (const e of W.enemies) if (e.alive && !e.rig && MT.RIGS[e.kind] && MT.RIGS[e.kind].kind !== 'custom') e.rig = MT.makeRig(MT.RIGS[e.kind]);
    for (const e of W.enemies) if (e.rig) e.rig.update(wdt, { x: e.x, y: e.y, z: e.z || 0, vx: e.vx || 0, vy: e.vy || 0, facing: e.face || 0, hurt: e.flash > 0, pose: e.wind > 0 ? 'cheer' : undefined, flip: undefined });
  }
  if (W.boss && W.boss.alive) W.boss.step(wdt, W);
  else if (W.boss && W.boss.dying > 0) W.boss.step(wdt, W);
  // events go to the reaction table
  const ev = W.evq; W.evq = [];
  for (const e of ev) { MT.reactTo(e); if (MT.NET.on && MT.NET.host) MT.netEvent(e); }
  if (MT.NET.on && MT.NET.host) MT.netHostStep(G, W, run, dt);
};
MT.cfg = { skipRigs: false };

// the boss room: the boss joins the World's step and its parts take the shots (bossDone ends the room)
World.prototype.bossDone = function (boss) {
  this.bossOver = true; this.phase = 'bossdone'; this.phaseT = 0; this.emit('boss-dead', { boss: boss.kind });
};
World.prototype.stepBossHazards = function (dt) {
  for (const b of (this.beams || [])) {
    if (b.vertical) { if (b.tele === undefined) b.tele = b.t; b.tele -= dt; if (b.tele <= 0) { b.life = (b.life || 1) - dt; for (const c of this.players) if (c.inPlay && Math.abs(c.x - b.x) < 10 && !(b.hit && b.hit.has(c))) { (b.hit || (b.hit = new Set())).add(c); this.hurtPlayer(c, 1, { x: b.x, y: 120 }); } } if (b.life <= 0) b.dead = true; continue; }
    if (b.t !== undefined && b.a === undefined) continue;
    b.active = (b.t || 0) > .8;
    if (b.active) for (const c of this.players) { if (!c.inPlay) continue; const a = Math.atan2(c.y - b.y0, c.x - b.x0); let da = a - b.a; da = Math.atan2(Math.sin(da), Math.cos(da)); const d = MT.dist(c.x, c.y, b.x0, b.y0); if (Math.abs(da) < .08 && d < 300 && !(b.hitAt && b.hitAt.get(c) > this.time - .5)) { (b.hitAt || (b.hitAt = new Map())).set(c, this.time); this.hurtPlayer(c, 1, { x: b.x0, y: b.y0 }); } }
  }
  if (this.beams) this.beams = this.beams.filter(b => !b.dead);
  if (this.spots) for (const s of this.spots) { s.t += dt; s.a = s.a + Math.sin(s.t * 2) * .02; for (const c of this.players) { if (!c.inPlay) continue; const a = Math.atan2(c.y - s.y, c.x - s.x); let da = a - s.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .4 && MT.dist(c.x, c.y, s.x, s.y) < 170) { c.spotT = (c.spotT || 0) + dt; if (c.spotT >= .4) { c.spotT = 0; this.hurtPlayer(c, 1, { x: s.x, y: s.y }); } } else c.spotT = 0; } }
};

/* ---- 12-hud.js ---- */
/* MASH TV — 12-hud: the in-play HUD (§11.4) and the broadcast cards, drawn in screen pixels over the arena. Every position
 * anchors to r.W and r.H, so it fits any screen shape. */

MT.hud = {
  // the lower third: one line at a time, typed out at 45 characters a second (§5.12)
  lowerThird(r, ctx) {
    const L = MT.lineNow; if (!L || !MT.settings().subtitles) return;
    const chars = Math.min(L.text.length, Math.floor(L.t * 45)), text = L.text.slice(0, chars);
    const w = Math.min(r.W - 40, 300), x = Math.round(r.W / 2 - w / 2), y = r.H - 58;
    r.overlay(g => {
      E.ui.box(g, x, y, w, 40, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .92 });
      const nameCol = L.speaker === 'LANCE' ? '#ffcc33' : L.speaker === 'PENNY' ? '#2ee6ff' : L.speaker === 'NETWORK' ? '#ff3344' : '#ff8ad8';
      E.font.text(g, L.speaker, x + 6, y + 4, nameCol, { scale: 1, shadow: '#000' });
      E.font.text(g, text, x + 6, y + 15, '#fff7e8', { scale: 1, shadow: '#000', wrap: w - 12 });
    });
  },
  // the banners: big, bulb-framed, sliding in
  banners(r) {
    let y = Math.round(r.H * .36);
    for (const b of MT.banners.slice(0, 2)) {
      const k = Math.min(1, b.age / .2), slide = Math.round((1 - k) * 60), w = Math.min(r.W - 40, E.font.width(b.text, { scale: 2 }) + 40);
      const x = Math.round(r.W / 2 - w / 2) + slide;
      r.overlay(g => { E.ui.box(g, x, y, w, 26, { bg: ['#14072a', '#0a0316'], border: b.color, alpha: .9 }); E.font.text(g, b.text, r.W / 2 + slide, y + 6, b.color, { scale: 2, align: 'center', shadow: '#000' }); });
      y += 30;
    }
  },
  // the RATINGS gauge: a TV dial with a needle, the multiplier, and the APPLAUSE light
  ratings(r, run, W) {
    const R = run.ratings.R, cx = Math.round(r.W / 2), y = 8, w = 110;
    r.overlay(g => {
      E.ui.box(g, cx - w / 2, y, w, 22, { bg: ['#120822', '#07030f'], border: '#ff2e88', alpha: .92 });
      E.font.text(g, 'RATINGS', cx, y + 2, '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
      px.rect(g, cx - w / 2 + 6, y + 13, w - 12, 4, '#2a1446');
      px.rect(g, cx - w / 2 + 6, y + 13, Math.round((w - 12) * R / 100), 4, R >= 100 ? '#ff2e88' : '#2ee6ff');
      const mul = W ? W.multiplier : 1;
      E.font.text(g, 'x' + mul, cx + w / 2 - 6, y + 2, '#ffffff', { scale: 1, align: 'right', shadow: '#000' });
      if (W && W.primeOn) E.font.text(g, 'PRIME TIME', cx, y + 26, (Math.floor(W.time * 4) % 2 ? '#ff2e88' : '#ffcc33'), { scale: 1, align: 'center', shadow: '#000' });
      if (MT.G && run) E.font.text(g, '★ ' + run.keys + '/9', cx, y + 26 + (W && W.primeOn ? 10 : 0), '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
    });
  },
  // a player's panel: portrait-free, the name in its colour, cash, HP pips, lives, the weapon bar and add-ons
  panel(r, c, slot) {
    const w = 96, h = 30, pad = 4, cornerX = slot % 2 === 0 ? pad : r.W - w - pad, cornerY = slot < 2 ? (r.H >= 200 ? 40 : 30) : r.H - h - 48;
    r.overlay(g => {
      E.ui.box(g, cornerX, cornerY, w, h, { bg: ['#140a24', '#070310'], border: c.color, alpha: .86 });
      E.font.text(g, c.n + ' ' + c.name, cornerX + 4, cornerY + 2, c.color, { scale: 1, shadow: '#000' });
      const cash = '$' + c.cash.toLocaleString('en-US');
      E.font.text(g, cash, cornerX + 4, cornerY + 11, '#fff7e8', { scale: 1, shadow: '#000' });
      for (let i = 0; i < c.maxHp; i++) px.rect(g, cornerX + w - 10 - i * 5, cornerY + 3, 3, 4, i < c.hp ? '#ff3344' : '#3a2a40');
      for (let i = 0; i < Math.min(c.lives, 6); i++) px.disc(g, cornerX + 6 + i * 7, cornerY + h - 4, 2.5, c.color);
      if (c.weapon.id !== 'blaster') { const pct = c.weapon.t / (MT.WEAPONS[c.weapon.id].dur * MT.T.puDuration); E.ui.bar(g, cornerX + 4, cornerY + 20, 44, 3, Math.max(0, Math.min(1, pct)), '#2ee6ff'); E.font.text(g, (MT.WEAPONS[c.weapon.id].name || '').slice(0, 12), cornerX + 50, cornerY + 18, '#2ee6ff', { scale: 1 }); }
      if (c.bombs > 0) E.font.text(g, '★'.repeat(Math.min(3, c.bombs)), cornerX + w - 30, cornerY + 17, '#ffcc33', { scale: 1 });
      if (c.state === 'out') { E.ui.box(g, cornerX, cornerY, w, h, { bg: ['#000', '#000'], alpha: .6 }); E.font.text(g, 'OUT - START', cornerX + 6, cornerY + 11, '#ff3344', { scale: 1, shadow: '#000' }); }
    });
  },
  // the room name, the wave dots and the prompts under the arena
  roomBar(r, W) {
    if (!W) return;
    const txt = W.R.type === 'boss' ? W.R.name : (W.R.id + ' ' + W.R.name);
    r.overlay(g => { E.font.text(g, txt, r.W / 2, r.H - 14, '#c8c0e0', { scale: 1, align: 'center', shadow: '#000' }); });
    if (W.phase === 'exit' && !MT.G.paused) { const p = (Math.floor(W.time * 2) % 2) ? '#ffcc33' : '#ffffff'; r.overlay(g => E.font.text(g, 'PICK A DOOR!', r.W / 2, r.H / 2 + 50, p, { scale: 2, align: 'center', shadow: '#000' })); }
  },
  bugs(r) {
    const on = Math.floor(MT.G.time * 2) % 2;
    r.overlay(g => { if (on) px.disc(g, 8, 8, 2.5, '#ff3344'); E.font.text(g, 'LIVE', 14, 5, '#ffffff', { scale: 1, shadow: '#000' }); E.font.text(g, 'MASH 9', 8, 16, '#ffcc33', { scale: 1, shadow: '#000' }); });
  },
  bossBar(r, W) {
    const b = W && W.boss; if (!b || !b.alive && !(b.dying > 0)) return;
    const hp = b.parts.filter(p => p.id !== 'hub' || true).reduce((s, p) => s + Math.max(0, p.hp), 0), max = b.parts.reduce((s, p) => s + p.max, 0) || 1;
    const name = { mashy: 'MASHY', wheel: 'THE WHEEL OF MISFORTUNE', lance: W.phaseName === 'network' ? 'THE NETWORK' : 'LANCE LUSTRE' }[b.kind];
    const w = Math.min(r.W - 120, 260), x = Math.round(r.W / 2 - w / 2), y = 40;
    r.overlay(g => { E.font.text(g, name, r.W / 2, y - 10, '#ffcc33', { scale: 1, align: 'center', shadow: '#000' }); E.ui.bar(g, x, y, w, 6, Math.min(1, hp / max), '#ff3344'); });
  },
  // the cards: the episode title card, the NEXT ON MASH TV map card, the recap, the continue
  card(r, title, sub, line, sec) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.82)');
      E.font.title(g, title, r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
      E.font.text(g, sub, r.W / 2, r.H / 2 + 6, '#fff7e8', { scale: 2, align: 'center', shadow: '#000' });
      if (line) E.font.text(g, line, r.W / 2, r.H / 2 + 36, '#2ee6ff', { scale: 1, align: 'center', shadow: '#000', wrap: r.W - 60 });
    });
  },
  mapCard(r, ep, roomId) {
    const E2 = MT.EPISODES[ep - 1]; if (!E2) return;
    r.overlay(g => {
      px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.9)');
      E.font.title(g, 'NEXT ON MASH TV', r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
      const cx = r.W / 2, cy = r.H / 2 + 14, step = Math.min(r.W / 5, r.H / 3.6);
      for (const id of Object.keys(E2.map)) {
        const [mx, my] = E2.map[id], x = cx + mx * step, y = cy - my * step * .9 + 10;
        const room = MT.ROOMS[id], cur = id === roomId;
        E.ui.box(g, x - 46, y - 14, 92, 28, { bg: cur ? ['#ffcc33', '#b07a00'] : ['#241240', '#0e061e'], border: cur ? '#fff7e8' : '#ff2e88', alpha: .95 });
        E.font.text(g, id + ' ' + (room ? room.name.split(' ')[0] : ''), x, y - 6, cur ? '#15121c' : '#fff7e8', { scale: 1, align: 'center' });
        if (room && room.key) E.font.text(g, '★', x + 38, y - 14, '#ffcc33', { scale: 1 });
      }
    });
  }
};
MT.settings = () => (MT.G ? { subtitles: MT.G.settings.subtitles !== false } : { subtitles: true });

/* ---- 13-flow.js ---- */
/* MASH TV — 13-flow: the whole run as one generator (game.script): the cold open, the episode cards, the rooms and their map
 * cards, the boss rooms, the recap, continue, game over, the Green Room, the two endings, the initials and the credits.
 * The play scene (below) only ticks the World; the flow decides what happens next. */

MT.PLAY.lineWait = () => !MT.lineNow && MT.lines.length === 0;
MT.anyConfirm = () => MT.G && (MT.G.players || [MT.G.input]).some(p => p.pressed('confirm') || p.pressed('start') || p.clicked && p.clicked());
// say the lines of a list in order, each for its own time (the babble sets it); confirm skips a line
MT.sayAll = function* (list, speaker) {
  for (const item of list) {
    const [who, text] = Array.isArray(item) ? item : [speaker || 'LANCE', item];
    MT.say(who, text, { prio: 5 });
  }
  yield E.until(MT.PLAY.lineWait);
};
// a card: a static wipe, the title in the broadcast type, and a line; confirm skips it
MT.cardWait = function* (title, sub, line, sec = 2.8, sting) {
  MT.PLAY.card = { title, sub, line, t: 0, sec };
  if (sting) MT.music(sting);
  MT.sfx('static');
  yield E.any([sec, () => MT.anyConfirm()]);
  MT.PLAY.card = null;
};

MT.spawnWorld = (G, run, roomId, entry) => {
  const S = MT.PLAY, players = MT.makeContestants(run, null);
  const W = new World(run, roomId, { entry, players });
  for (const c of players) if (c.state !== 'out') { c.W = W; }
  S.W = W; S.holdWorld = false; S.cutting = false;
  return W;
};

// the flow for one run. Each room: spawn, wait for its end, and go on by the door walked through.
MT.flow = function* (G, run, o = {}) {
  const S = MT.PLAY;
  S.holdWorld = true;
  if (!o.skipCold) yield* MT.coldOpen(G);
  for (let ep = o.startEp || 1; ep <= 3; ep++) {
    run.ep = ep;
    const E1 = MT.EPISODES[ep - 1];
    MT.music(null);
    if (!(o.skipCard && ep === (o.startEp || 1)) && !o.room) {
      const c = MT.cards[ep] || [];
      yield* MT.cardWait('EPISODE ' + ep, E1.title, c[2], 3.4, 'theme');
      yield* MT.sayAll([['LANCE', (MT.TEXT.cards[ep] || [])[2]]]);
    }
    let roomId = (ep === (o.startEp || 1) && o.room) || MT.startRoom(ep), entry = 'S';
    while (true) {
      const set = MT.ROOMS[roomId].set; MT.music(E1.song);
      const W = MT.spawnWorld(G, run, roomId, entry);
      MT.roomArrive(G, W);
      // the room runs until it ends: the exit taken, the boss dead, or everyone out
      while (true) {
        yield E.until(() => W.phase === 'left' || W.bossOver || (MT.allOut(run) && !W.bossOver));
        if (MT.allOut(run) && W.phase !== 'left' && !W.bossOver) {
          // all out: the CONTINUE countdown, then the room restarts with its lives back
          const ok = yield* MT.continueFlow(G, run);
          if (!ok) { yield* MT.gameOver(G, run, ep); return; }
          for (const p of run.players) if (p.c) p.c.continueOn(W);
          continue;
        }
        break;
      }
      if (W.bossOver) { yield* MT.bossDefeat(G, run, ep, W); break; }
      const d = W.leaveDoor || 'N', to = W.leaveTo;
      if (!to) { roomId = MT.startRoom(ep); entry = 'S'; continue; }
      // the NEXT ON MASH TV card, then the walk through the door to the next room
      S.holdWorld = true; S.mapCard = { ep, roomId: to, t: 0 }; MT.sfx('static');
      yield E.any([2.5, () => MT.anyConfirm()]);
      S.mapCard = null; S.holdWorld = false;
      roomId = to; entry = MT.OPP[d];
    }
    if (MT.PLAY.recap) MT.PLAY.recap = null;
  }
  // after episode three: the Green Room, or the first ending
  const keys = run.keys;
  if (keys >= 5) yield* MT.greenRoom(G, run); else yield* MT.endingA(G, run);
  yield* MT.credits(G, run);
  MT.finishRun(G, run);
};
// the first room of an episode, and the start of an arrival: the play scene shows what the room says
MT.startRoom = (ep) => MT.startRoomId(ep);
MT.startRoomId = (ep) => `${ep}-1`;
MT.roomArrive = (G, W) => {
  MT.PLAY.stage = 'room:' + W.id;
  if (W.R.type === 'boss' || W.R.id === '1-1') { /* the lines come from the room's own script */ }
  MT.lineFrom('roomStart', 1);
  MT.banner(W.R.name, '#ffcc33', 2.2);
  if (W.R.tutorial) MT.PLAY.tutor = 0;
  if (W.R.id === '1-1') MT.hintOnce('move');
};
MT.hintOnce = (k) => { const run = MT.run; if (!run) return; run.hints = run.hints || {}; if (run.hints[k]) return; run.hints[k] = 1; MT.say('ANNC', MT.TEXT.hints[k] || '', { prio: 1 }); };
MT.cards = MT.TEXT.cards;

// the cold open (§8.1): the studio's dark, the logo, the contestants' one-liners, the FCC line, the title
MT.coldOpen = function* (G) {
  const S = MT.PLAY;
  S.cold = true; S.holdWorld = true; MT.music('theme');
  yield 1.2;
  MT.banner('MASH TV', '#ff2e88', 2.6); MT.sfx('applause'); MT.babble.crowd('applause', .8);
  yield* MT.sayAll(MT.TEXT.coldOpen.map(([who, t]) => [who, MT.fill(t, { N: MT.run.players.length })]));
  for (const p of MT.run.players) { const c = p.c; if (c) MT.say('LANCE', MT.TEXT.look[p.slot], { prio: 5 }); }
  yield E.until(MT.PLAY.lineWait);
  S.cold = false;
};

// a boss room: the intro lines, then the boss's own script runs
MT.bossDefeat = function* (G, run, ep, W) {
  const S = MT.PLAY;
  S.holdWorld = true;
  yield* MT.sayAll(MT.TEXT.bossLine.mashyDown ? [['LANCE', W.boss.kind === 'mashy' ? MT.TEXT.bossLine.mashyDown : W.boss.kind === 'wheel' ? MT.TEXT.bossLine.wheelDown : 'LANCE WAS A ROBOT ALL ALONG!']] : []);
  yield 2.5;
  yield* MT.recap(G, run, ep);
};
MT.recap = function* (G, run, ep) {
  const S = MT.PLAY, E1 = MT.EPISODES[ep - 1];
  MT.music('recap');
  S.recap = { ep, t: 0, rows: run.players.map(p => p.c).filter(Boolean) };
  MT.say('PENNY', MT.TEXT.recapIntro, { prio: 5 });
  for (const c of S.recap.rows) for (const pr of c.prizes) MT.say('PENNY', pr[2], { prio: 2 });
  yield E.any([18, () => MT.anyConfirm() && MT.PLAY.lineWait()]);
  S.recap = null;
  MT.say('LANCE', MT.TEXT.recapOutro, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  S.holdWorld = false;
};
MT.continueFlow = function* (G, run) {
  const hold = { res: null };
  MT.cab.continue(10, ok => { hold.res = ok; });
  MT.say('LANCE', MT.TEXT.continueLine, { prio: 5 });
  yield E.until(() => hold.res !== null);
  return hold.res;
};
MT.gameOver = function* (G, run, ep) {
  MT.music('ending');
  MT.sfx('lose');
  for (const line of MT.TEXT.gameOver) MT.say('LANCE', line, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield 1;
  MT.toScene(G, 'gameover', { ep });
};
MT.greenRoom = function* (G, run) {   // §7.4: 40 s, cash and boxes from the ceiling, paparazzi, the statuette at 30 s
  const S = MT.PLAY;
  MT.music('recap');
  yield* MT.cardWait('THE GREEN ROOM', 'THE NETWORK\'S SECRET BONUS', MT.TEXT.greenIntro, 3.2, 'recap');
  const W = MT.spawnWorld(G, run, 'greenroom', 'S');
  W.phase = 'bonus'; W.bonusT = 0; W.bonusWon = false;
  W.tasks.push(MT.task((function* () { for (let k = 0; k < 120; k++) { yield .25; const [x, y] = W.randomFreePoint(); if (W.pickups.length < 40) W.pickups.push(W.mkPickup(k % 3 ? 'bill' : 'stack', x, y)); if (k % 4 === 0 && W.pickups.length < 40) W.pickups.push(W.mkPickup('prize', x, y)); } })()));
  W.tasks.push(MT.task((function* () { yield 30; W.pickups.push(W.mkPickup('statuette', 184, 120)); })()));
  for (let i = 0; i < 6; i++) W.spawnEnemy('paparazzo', MT.rand(60, 300), MT.rand(50, 190), { counted: false });
  yield E.until(() => W.bonusWon || W.bonusT >= 40);
  MT.say('PENNY', W.bonusWon ? MT.TEXT.prize : 'NOTHING! THE NETWORK KEEPS IT ALL!', { prio: 4 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.endingB(G, run);
};
MT.endingA = function* (G, run) {
  MT.music('ending');
  MT.say('PENNY', MT.TEXT.endingA[0], { prio: 5 });
  MT.say('LANCE', MT.TEXT.endingANext, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.cardWait('MASH TV WILL RETURN.', 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM', '', 4.2);
};
MT.endingB = function* (G, run) {
  MT.music('ending');
  for (const l of MT.TEXT.endingB) MT.say('ANNC', l, { prio: 5 });
  yield E.until(MT.PLAY.lineWait);
  yield* MT.cardWait('MASH TV - CANCELLED.', 'THANKS FOR WATCHING.', 'CHANNEL 3,000: TONIGHT: MASHED POTATOES!', 4.2);
};
MT.credits = function* (G, run) {
  MT.music('ending');
  MT.PLAY.credits = { t: 0 };
  yield E.any([24, () => MT.anyConfirm()]);
  MT.PLAY.credits = null;
};
// the high-score entry: each qualifying contestant enters initials on their own input (patch P3)
MT.finishRun = (G, run) => {
  const order = run.players.map(p => p.c).filter(Boolean).sort((a, b) => b.cash - a.cash);
  const next = () => {
    const c = order.shift();
    if (!c) { MT.toScene(G, 'scores', { fromRun: true }); return; }
    if (run.mode !== 'arcade' || run.devTouched || !MT.cab.qualifies(c.cash, '')) return next();
    MT.cab.enter(c.cash, '', () => { MT.cab.clear(); next(); }, c.input || G.input);
  };
  next();
};
MT.toScene = (G, name, data) => { MT.PLAY.stop = true; G.go(name, data, { fade: 'black' }); };

/* ---- 14-scenes.js ---- */
/* MASH TV — 14-scenes: the front end (title and main menu, difficulty, the contestant lobby, episodes, how to play, top
 * earners, about and credits, game over) and the play scene that ticks the World and draws the broadcast. Every screen works
 * with a pad, the keyboard, or the mouse (hover moves focus, click picks). */

// a list of rows that every player can move through; mouse hover focuses, a click picks (screen-pixel rows from the last draw)
class MenuList {
  constructor(items, o = {}) { this.items = items; this.focus = o.focus || 0; this.rects = []; this.onPick = o.onPick; this.onFocus = o.onFocus; this.y0 = o.y0 || 90; this.rowH = o.rowH || 22; this.w = o.w || 220;   /* (buffer pixels: the overlay's units, a third of a 1080p screen's) */ this.x = o.x; this.cx = o.cx; }
  update(G) {
    const ps = G.players || [G.input];
    for (const p of ps) {
      if (p.repeat('up', .3, .14)) this.move(-1);
      if (p.repeat('down', .3, .14)) this.move(1);
    }
    for (const p of ps) {
      if (p.pressed('confirm') || p.pressed('start')) { this.pick(this.focus); break; }
      const pt = p.pointer && p.pointer(); if (pt) { const i = this.rects.findIndex(r => pt[0] >= r[0] && pt[0] < r[0] + r[2] && pt[1] >= r[1] && pt[1] < r[1] + r[3]); if (i >= 0 && i !== this.focus) { this.focus = i; if (this.onFocus) this.onFocus(i); } }
      const c = p.clicked && p.clicked(); if (c) { const i = this.rects.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (i >= 0) { this.focus = i; this.pick(i); break; } }
    }
  }
  move(d) { let n = this.focus + d; while (this.items[n] && this.items[n].disabled) n += d; if (n >= 0 && n < this.items.length) { this.focus = n; if (this.onFocus) this.onFocus(n); MT.sfx('blip', { vol: .4 }); } }
  pick(i) { const it = this.items[i]; if (!it || it.disabled) return; MT.sfx('confirm'); if (this.onPick) this.onPick(i, it); }
  draw(r) {
    const cx = this.cx !== undefined ? this.cx : r.W / 2, w = this.w, x = Math.round(cx - w / 2); this.rects = [];
    this.items.forEach((it, i) => {
      const y = Math.round(this.y0 + i * this.rowH), foc = i === this.focus, h = this.rowH - 3;
      this.rects.push([x, y, w, h]);
      r.overlay(g => {
        E.ui.box(g, x, y, w, h, { bg: foc ? ['#ffcc33', '#b07a00'] : ['#241240', '#0e061e'], border: foc ? '#fff7e8' : '#ff2e88', alpha: .95 });
        const col = it.disabled ? '#6a5a7a' : foc ? '#15121c' : '#fff7e8';
        E.font.text(g, it.label, cx, y + Math.round((h - 7) / 2), col, { scale: 2, align: 'center', shadow: foc ? undefined : '#000' });
      });
    });
  }
}
MT.MenuList = MenuList;
// the front-end idle clock (10 s on the title and the menus: the attract mode, §12)
MT.idle = { t: 0, serial: -1 };
MT.idleTick = (G, dt) => {
  const any = (G.players || [G.input]).some(p => p.anyPressed && p.anyPressed()) || (G.players || []).some(p => p.pointer && p.pointer() && p.pointer()[0] !== undefined && MT.idle.moved);
  if (MT.inputSerial !== MT.idle.serial || any) { MT.idle.t = 0; MT.idle.serial = MT.inputSerial; return false; }
  MT.idle.t += dt;
  return MT.idle.t >= 10;
};
MT.hudSafe = (r) => ({ top: Math.round(r.H * .04) });

/* ---------- the touch-only notice (§11.7) ---------- */
MT.touchNotice = (r, G) => {
  r.overlay(g => {
    E.ui.box(g, r.W / 2 - 150, r.H / 2 - 40, 300, 80, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .95 });
    E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, r.H / 2 - 22, '#ffcc33', { scale: 1, align: 'center' });
  });
};

/* ---------- scene: title (logo, the main menu) ---------- */
MT.menu = {};
MT.scenes = {};
MT.scenes.title = {
  view: 'threequarter', res: 'ps1', expand: true, pausable: false, touch: [], corner: undefined,
  enter() { MT.idle.t = 0; MT.idle.serial = MT.inputSerial; MT.music('theme'); MT.PLAY.stop = false;
    const items = [{ label: 'START THE SHOW', id: 'start' }, { label: 'EPISODES', id: 'episodes' }, { label: 'HOW TO PLAY', id: 'howto' },
      { label: 'TOP EARNERS', id: 'scores' }, { label: 'OPTIONS', id: 'options' }, { label: 'ABOUT & CREDITS', id: 'about' }];
    MT.menu.title = new MenuList(items, { y0: 0, w: 200, rowH: 19, onPick: (i, it) => MT.titlePick(it.id) });
    MT.menu.title.y0 = 0; MT.menu.title.rowY = 0;
  },
  update(dt) {
    const G = MT.G;
    if (MT.touchOnly()) { if (G.input.pressed('confirm')) {} }
    if (MT.idleTick(G, dt)) { G.go('attract'); return; }
    if (MT.touchOnly() || MT.lockedTouch) return;
    MT.menu.title.update(G);
  },
  draw(r) {
    const G = MT.G;
    r.sky(['#140a34', '#3a1c66']);
    MT.drawSpotlights(r, 0);
    const m = Math.round(r.H * .2);
    r.overlay(g => { E.font.title(g, 'MASH TV', r.W / 2, m, { scale: Math.max(2, Math.round(r.W / 140)), colors: ['#ff2e88', '#ffcc33'], align: 'center' }); });
    r.text('LIVE FROM STUDIO 9', r.W / 2, m + 30, '#2ee6ff', { align: 'center', scale: 1, shadow: '#000' });
    const mm = MT.menu.title; mm.cx = r.W / 2; mm.y0 = Math.round(r.H * .42); mm.draw(r);
    if (MT.touchOnly()) { MT.touchNotice(r, G); r.overlay(g => { E.ui.box(g, r.W / 2 - 60, r.H / 2 + 10, 120, 20, { bg: ['#241240', '#0e061e'], border: '#ffcc33', alpha: .95 }); E.font.text(g, 'SETTINGS', r.W / 2, r.H / 2 + 16, '#fff7e8', { scale: 1, align: 'center' }); }); const c = G.input.clicked && G.input.clicked(), R = [r.W / 2 - 60, r.H / 2 + 10, 120, 20]; if (c && c[0] >= R[0] && c[0] <= R[0] + R[2] && c[1] >= R[1] && c[1] <= R[1] + R[3]) G.menu('settings'); }
    MT.drawBrand(r);
    MT.glyphBar(r, [['confirm', 'SELECT']]);
  }
};
MT.titlePick = (id) => {
  const G = MT.G;
  if (id === 'start') return G.go('difficulty');
  if (id === 'episodes') return G.go('episodes');
  if (id === 'howto') return G.go('howto', { page: 0 });
  if (id === 'scores') return G.go('scores');
  if (id === 'options') return G.menu('settings');
  if (id === 'about') return G.go('about', { page: 0 });
};
MT.drawBrand = (r) => r.overlay(g => E.font.text(g, MT.VERSION, 6, r.H - 10, '#7a6a9a', { scale: 1 }));
MT.drawSpotlights = (r, k) => {
  if (!MT.G) return;
  for (let i = 0; i < 4; i++) { const a = MT.G.time * .5 + i * 1.6; MT.G.lights && MT.G.lights.add(184 + Math.cos(a) * 140, 120 + Math.sin(a) * 60, 40, 90, .5, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ff2e88'][i] }); }
};
MT.glyphBar = (r, pairs) => r.overlay(g => { MT.glyph.prompt(g, 8, r.H - 22, pairs.map(([a, t]) => [a, t]), MT.G.input, { scale: 1 }); });

/* ---------- scene: difficulty ---------- */
MT.scenes.difficulty = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { MT.menu.diff = new MenuList([{ label: 'ROOKIE', id: 'rookie' }, { label: 'CONTESTANT', id: 'contestant' }, { label: 'CHAMPION', id: 'champion' }], { y0: 0, w: 260, rowH: 26, onPick: (i, it) => { MT.pickDiff = it.id; MT.G.go('lobby'); }, onFocus: i => MT.diffFocus = i }); MT.diffFocus = 1; },
  update(dt) { if (MT.G.input.pressed('cancel') || MT.G.input.pressed('pause')) return MT.G.go('title'); MT.menu.diff.update(MT.G); if (MT.idleTick(MT.G, dt)) MT.G.go('attract'); },
  draw(r) {
    r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.title(g, 'CHOOSE YOUR DIFFICULTY', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    const m = MT.menu.diff; m.cx = r.W / 2; m.y0 = Math.round(r.H * .3); m.draw(r);
    const d = Object.values(MT.DIFF)[MT.diffFocus];
    r.overlay(g => { E.ui.box(g, 40, r.H - 80, r.W - 80, 40, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .9 }); E.font.text(g, d.line + '  HP ' + d.hp + ', LIVES ' + d.lives, r.W / 2, r.H - 72, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' }); });
    MT.glyphBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  }
};

/* ---------- scene: lobby (TONIGHT'S CONTESTANTS: up to four, locally) ---------- */
MT.lobby = { entries: [], countdown: null };
MT.scenes.lobby = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() {
    const G = MT.G; MT.lobby.entries = [{ slot: 0, input: G.input, look: 0, ready: false }]; MT.lobby.countdown = null;
    G.allowJoin({ max: 4, keys: false, onJoin: (input) => { const n = G.players.indexOf(input); MT.lobby.entries.push({ slot: n, input, look: n, ready: false }); MT.sfx('confirm'); MT.lobbyAdded = true; } });
    MT.music(null);
  },
  exit() { MT.G.allowJoin(false); },
  update(dt) {
    const G = MT.G, L = MT.lobby;
    if (L.countdown !== null) { L.countdown -= dt; if (L.countdown <= 0) { MT.lobbyStart(G, L); } return; }
    for (const e of L.entries) {
      const I = e.input;
      if (I.pressed('left')) { e.look = (e.look + 3) % 4; MT.sfx('blip', { vol: .4 }); }
      if (I.pressed('right')) { e.look = (e.look + 1) % 4; MT.sfx('blip', { vol: .4 }); }
      if (I.pressed('confirm')) { e.ready = !e.ready; MT.sfx(e.ready ? 'confirm' : 'cancel'); }
      if (I.pressed('cancel')) { if (e === L.entries[0]) { G.go('difficulty'); return; } L.entries = L.entries.filter(x => x !== e); MT.sfx('cancel'); }
    }
    if (L.entries.length && L.entries.every(e => e.ready)) { L.countdown = 2; MT.banner("LET'S PLAY!", '#ffcc33', 2); MT.sfx('countdown'); }
    if (MT.lobbyAdded) MT.lobbyAdded = false;
  },
  draw(r) {
    const L = MT.lobby, G = MT.G;
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => E.font.title(g, "TONIGHT'S CONTESTANTS", r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    for (let s = 0; s < 4; s++) {
      const x = Math.round(r.W * (.14 + s * .24)), y = Math.round(r.H * .58), e = L.entries.find(q => q.slot === s || q.slot === undefined) ;
      const ent = L.entries[s];
      r.overlay(g => {
        E.ui.box(g, x - 36, y - 60, 72, 84, { bg: ent ? ['#241240', '#0e061e'] : ['#130a20', '#060310'], border: MT.slots[s].color, alpha: .9 });
        if (ent) {
          E.font.text(g, MT.LOOKS[ent.look].name, x, y - 52, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' });
          E.font.text(g, (ent.ready ? 'READY' : 'NOT YET'), x, y + 30, ent.ready ? '#7ad06a' : '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
        } else E.font.text(g, 'PRESS START', x, y - 4, '#8a7aa8', { scale: 1, align: 'center', wrap: 60 });
      });
      if (ent) MT.drawLookIn(r, x, y - 10, ent, s);
    }
    if (L.countdown !== null) r.overlay(g => E.font.title(g, Math.ceil(L.countdown) + '', r.W / 2, r.H / 2, { scale: 4, align: 'center', colors: ['#ffcc33', '#ff2e88'] }));
    r.overlay(g => E.font.text(g, 'ENTER / PAD SELECT TO READY, LEFT RIGHT TO CHANGE LOOK', r.W / 2, r.H - 40, '#c8c0e0', { scale: 1, align: 'center', shadow: '#000' }));
    MT.glyphBar(r, [['confirm', 'READY'], ['left', 'LOOK'], ['cancel', 'BACK']]);
  }
};
MT.drawLookIn = (r, x, y, ent, s) => {
  r.queue(x, y + 20, 6, g => { /* a portrait stand-in: the look's colours in a disc */ const [ox, oy] = r.w(x, y + 20, 6); px.disc(g, ox, oy, 12, MT.slots[s].color); px.disc(g, ox, oy - 6, 6, '#e8c8a0'); });
};
MT.lobbyStart = (G, L) => {
  const ents = L.entries.map(e => ({ slot: e.slot, input: e.input, look: e.look }));
  for (const e of ents) MT.slots[e.slot % 4].look = e.look;
  MT.startNewRun(G, { mode: 'arcade', diff: MT.pickDiff || 'contestant', slots: ents.map(e => e.slot), inputs: ents });
};
MT.startNewRun = (G, o) => {
  const run = MT.startRun({ mode: o.mode, diff: o.diff, slots: o.slots, seed: (Math.random() * 1e9 | 0) + 1 });
  run.players = o.inputs.map(e => ({ slot: e.slot, input: e.input, c: null }));
  G.go('play', { run, startEp: 1, cold: true });
};

/* ---------- scene: episodes (rehearsal: the same rules, no high score) ---------- */
MT.scenes.episodes = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() {
    const reached = E.store.get('mashtv:reached', 1);
    MT.menu.eps = new MenuList(MT.EPISODES.map((e, i) => ({ label: 'EPISODE ' + e.id + ': ' + e.title, id: e.id, disabled: e.id > reached })), { y0: 0, w: 380, rowH: 28,
      onPick: (i, it) => { MT.rehearsal = it.id; MT.G.go('lobby', { rehearsal: true }); } });
  },
  update(dt) { if (MT.G.input.pressed('cancel')) return MT.G.go('title'); MT.menu.eps.update(MT.G); },
  draw(r) {
    r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.title(g, 'EPISODES', r.W / 2, 22, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    const m = MT.menu.eps; m.cx = r.W / 2; m.y0 = Math.round(r.H * .34); m.draw(r);
    r.overlay(g => E.font.text(g, 'LOCKED EPISODES OPEN WHEN YOU REACH THEM', r.W / 2, r.H - 40, '#8a7aa8', { scale: 1, align: 'center' }));
    MT.glyphBar(r, [['confirm', 'PLAY'], ['cancel', 'BACK']]);
  }
};

/* ---------- scene: how to play (3 pages) ---------- */
MT.HOWTO = [
  ['CONTROLS', ['MOVE: stick or WASD', 'AIM AND FIRE: right stick or mouse (fires while pushed)', 'SLIDE: dodge with i-frames', 'SHOWSTOPPER: screen bomb', 'SHOWBOAT: taunt for ratings', 'PAUSE: Options or Esc']],
  ['THE SHOW', ['Clear each room, then pick a door. Cash grows x multiplier with ratings.', 'Ratings reach 100: PRIME TIME. Ratings fall when you do nothing.', 'Golden keys: 9 in all. 5 opens the Green Room.', 'Lose all lives and your winnings are halved to continue.']],
  ['POWER-UPS', ['TRIPLE PLAY: three bolts.', 'PRIME-TIME ROCKETS: splash.', 'POPCORN POPPER: lobbed bags.', 'LIMELIGHT LASER: a beam through a line.', 'GOLD RECORDS: orbiting discs.', 'SPONSOR SHIELD, SPEED SNEAKERS, ENCORE (+1 life)']]
];
MT.scenes.howto = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.howPage = (d && d.page) || 0; },
  update(dt) {
    const I = MT.G.input;
    if (I.pressed('right') || I.pressed('tabR')) MT.howPage = (MT.howPage + 1) % MT.HOWTO.length;
    if (I.pressed('left') || I.pressed('tabL')) MT.howPage = (MT.howPage + MT.HOWTO.length - 1) % MT.HOWTO.length;
    if (I.pressed('cancel') || I.pressed('confirm')) return MT.G.go('title');
    if (MT.idleTick(MT.G, dt)) MT.G.go('attract');
  },
  draw(r) {
    const [title, lines] = MT.HOWTO[MT.howPage];
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => { E.font.title(g, 'HOW TO PLAY', r.W / 2, 18, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, title + '  ' + (MT.howPage + 1) + '/' + MT.HOWTO.length, r.W / 2, 56, '#2ee6ff', { scale: 2, align: 'center' }); });
    lines.forEach((l, i) => r.overlay(g => E.font.text(g, l, 22, 92 + i * 20, '#fff7e8', { scale: 1, shadow: '#000', wrap: r.W - 44 })));
    MT.glyphBar(r, [['left', 'PAGE'], ['confirm', 'BACK']]);
  }
};

/* ---------- scene: top earners (the arcade table) ---------- */
MT.scenes.scores = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.scoresFrom = d && d.fromRun; },
  update(dt) { if (MT.G.input.pressed('confirm') || MT.G.input.pressed('cancel') || MT.G.input.pressed('start')) MT.G.go('title'); if (MT.idleTick(MT.G, dt)) MT.G.go('attract'); },
  draw(r) {
    r.sky(['#2a1408', '#6a3a1a']);
    r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(20,8,4,0.5)'));
    MT.cab.drawTable(r, '', 40, 'TOP EARNERS');
    MT.glyphBar(r, [['confirm', 'BACK']]);
  }
};

/* ---------- scene: about & credits (pages from src/about.json) ---------- */
MT.scenes.about = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter(d) { MT.aboutPage = (d && d.page) || 0; },
  update(dt) {
    const I = MT.G.input, n = MT.ABOUT_PAGES().length;
    if (I.pressed('right') || I.pressed('confirm') || I.pressed('tabR')) MT.aboutPage = Math.min(n - 1, MT.aboutPage + 1);
    if (I.pressed('left') || I.pressed('tabL')) MT.aboutPage = Math.max(0, MT.aboutPage - 1);
    if (I.pressed('cancel')) return MT.G.go('title');
    if (MT.idleTick(MT.G, dt)) MT.G.go('attract');
  },
  draw(r) {
    const pages = MT.ABOUT_PAGES(), p = pages[MT.aboutPage];
    r.sky(['#140a34', '#3a1c66']);
    r.overlay(g => { E.font.title(g, p.title, r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); });
    let y = 58; const lh = E.font.lineHeight({ scale: 1 });
    for (const line of p.lines) { for (const piece of E.font.wrap(line, r.W - 32, { scale: 1 })) { r.overlay(g => E.font.text(g, piece, 16, y, '#fff7e8', { scale: 1 })); y += lh; } y += lh / 2; }
    r.overlay(g => E.font.text(g, (MT.aboutPage + 1) + '/' + pages.length, r.W - 20, r.H - 12, '#8a7aa8', { scale: 1, align: 'right' }));
    MT.glyphBar(r, [['left', 'PAGE'], ['cancel', 'BACK']]);
  }
};
MT.ABOUT_PAGES = () => {
  const A = MT.ABOUT;
  const kv = o => Object.keys(o).map(k => k[0].toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1') + ': ' + o[k]);
  return [
    { title: 'MASH TV', lines: ['A 1-4 player twin-stick arena shooter inside the deadliest game show on TV. Built with the my-3D2dge engine.', 'Original music, sound effects and voices, all made in code. Inspired by Smash TV (1990).', 'Model: ' + MT.MODEL + '.'] },
    { title: 'SOURCE INFORMATION', lines: kv(A.sourceInformation) },
    { title: 'TESTING FEEDBACK', lines: A.testingFeedback },
    { title: 'ENGINE FEEDBACK', lines: A.engineFeedback },
    { title: 'PROMPT FEEDBACK', lines: A.promptFeedback }
  ];
};

/* ---------- scene: game over (the sad trombone, the contestants down) ---------- */
MT.scenes.gameover = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { MT.gameOverT = 0; MT.music(null); },
  update(dt) { MT.gameOverT += dt; if (MT.gameOverT > 2 && (MT.G.input.pressed('confirm') || MT.G.input.pressed('start'))) MT.G.go('title'); },
  draw(r) {
    r.sky(['#301010', '#6a2a2a']);
    r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#ff3344', '#ffcc33'] }));
    r.overlay(g => E.font.text(g, 'AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!', r.W / 2, r.H / 2 + 6, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' }));
    MT.glyphBar(r, [['confirm', 'TITLE']]);
  }
};

/* ---------- scene: the play scene (the run; the World is ticked by the flow's room) ---------- */
MT.scenes.play = {
  mtPreset: 'play', input: MT.MASH_PLAY, view: 'threequarter', res: 'ps1', expand: true, pausable: true, touch: [],
  camera: { zoom: false }, corner: undefined,
  enter(d) {
    const G = MT.G, S = MT.PLAY;
    G.setView(G.settings.camView === 'overhead' ? 'topdown' : 'threequarter');
    if (!(d && d.session)) G.allowJoin({ max: 4, keys: false, onJoin: (input) => MT.dropIn(input) });
    MT.scenes.play.pausable = !(d && d.session);   // a session never pauses: Esc opens its own overlay
    G.lights.enabled = true; G.lights.ambient = .55; G.lights.dark = [6, 3, 16]; G.lights.refresh && G.lights.refresh();
    G.follow && G.follow(null); G.cam.bounds = null; G.focus(184, 120, 0);
    MT.inRun = true;
    if (!MT.run) return G.go('title');
    if (d && d.rehearsal) MT.run.mode = 'rehearsal';
    S.stop = false; S.cutting = false; S.holdWorld = true; S.cold = false;
    S.job && S.job.cancel && S.job.cancel();
    if (d && d.session) S.job = MT.NET.host ? G.script(MT.sessionFlow(G, MT.run)) : null;
    else S.job = G.script(MT.flow(G, MT.run, { startEp: (d && d.startEp) || 1, skipCold: !(d && d.cold), room: d && d.room, skipCard: !!(d && d.room) }));
    MT.cab = MT.cab || null;
    MT.joinMid = true;
  },
  exit() { const G = MT.G; G.lights.enabled = false; G.allowJoin(false); MT.PLAY.W = null; MT.PLAY.job = null; },
  update(dt) {
    const G = MT.G, S = MT.PLAY;
    if (!MT.run) return;
    G.focus(184, 120, 0); MT.fitCamera(G);
    // a contestant out of lives: Start continues just them, at half their winnings
    for (const c of (S.W ? S.W.players : [])) if (c.state === 'out' && c.input && c.input.pressed('start') && MT.allOut(MT.run) === false) { c.continueOn(S.W); MT.banner(c.name + ' IS BACK', c.color, 1.8); }
    MT.updateLines(dt); MT.updateBanners(dt);
    MT.cab.update(dt);   // the continue countdown and the cards (the arcade's clock)
    if (S.recap) S.recap.t = (S.recap.t || 0) + dt;
    if (MT.cab.continuing || MT.cab.entry) return;
    if (S.ending) { MT.endingStep(G, dt); return; }
    if (MT.NET.on) { if (MT.NET.ended) { G.go('sessionend', null, { fade: 0 }); return; } if (G.input.pressed('pause') || (G.players || []).some(p => p.pressed('pause'))) MT.netOverlay.open = !MT.netOverlay.open; if (MT.netOverlay.open) MT.netOverlayUpdate(G); }
    if (MT.dev.open) { MT.dev.update(G, dt); return; }
    if (S.mapOverlay || S.howOverlay) { const I = G.input; if (I.pressed('cancel') || I.pressed('confirm')) { S.mapOverlay = null; S.howOverlay = null; } return; }
    if (MT.NET.on && !MT.NET.host) MT.netClientStep(G, dt);
    else if (S.W && !S.holdWorld && !S.cold) MT.playStep(G, dt);
    else if (S.W && S.holdWorld) { MT.playStep(G, 0); }
    if (S.greenRoom && S.W) { /* the bonus is run by the flow */ }
  },
  draw(r) {
    const G = MT.G, S = MT.PLAY, W = S.W;
    if (!MT.run) { r.sky(['#140a34', '#3a1c66']); return; }
    const set = W ? MT.SETS[W.set] : MT.SETS.studio;
    if (S.ending) { MT.drawEnding(r, S.ending); MT.hud.lowerThird(r, {}); return; }
    r.sky(['#0a0418', '#241040']);
    if (W) W.draw(r, {});
    if (W) { MT.hud.ratings(r, MT.run, W); MT.hud.roomBar(r, W); }
    if (W) MT.hud.bossBar(r, W);
    for (const c of (W ? W.players : [])) { if (c.slot !== undefined && c.n) MT.hud.panel(r, c, c.slot); }
    MT.hud.bugs(r);
    MT.hud.banners(r);
    if (MT.lineNow && !S.cold) MT.hud.lowerThird(r, {});
    if (S.cold) MT.hud.lowerThird(r, {});
    if (S.card) MT.hud.card(r, S.card.title, S.card.sub, S.card.line);
    if (S.mapCard && W) MT.hud.mapCard(r, S.mapCard.ep, S.mapCard.roomId);
    if (S.recap) MT.drawRecap(r, S.recap);
    if (S.credits) MT.drawCredits(r, S.credits);
    if (MT.dev && MT.dev.badge && MT.dev.badge()) r.overlay(g => { E.ui.box(g, r.W - 56, 4, 52, 14, { bg: ['#ff8a2a', '#c04a00'], alpha: .95 }); E.font.text(g, 'DEV', r.W - 30, 7, '#15121c', { scale: 1, align: 'center' }); });
    if (W && W.phase === 'exit') {}
    if (S.greenRoom) r.overlay(g => E.font.title(g, 'GREEN ROOM', r.W / 2, 60, { scale: 2, align: 'center', colors: ['#ffcc33', '#2ee6ff'] }));
    if (S.mapOverlay && W) { r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.7)')); MT.hud.mapCard(r, W.ep, W.id); }
    if (S.howOverlay) MT.drawHowOverlay(r, S.howOverlay);
    if (MT.NET.on && MT.netOverlay.open) MT.netOverlayDraw(r);
    MT.cab.draw(r, [0, 0, r.W, r.H]);   // the continue countdown, the initials entry and the cards
    if (MT.dev.open) MT.dev.draw(r);
    if (S.stop) return;
  }
};
MT.drawRecap = (r, R) => {
  const t = R.t || 0, shown = Math.floor(t / 1.4);
  const list = R.rows.map(c => ({ c, prizes: c.prizes }));
  const all = list.reduce((n, row) => n + row.prizes.length, 0);
  r.overlay(g => { px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,6,20,0.92)'); E.font.title(g, 'PRIZE RECAP: EPISODE ' + R.ep, r.W / 2, 10, { scale: 2, align: 'center', colors: ['#ff8ad8', '#ffcc33'] }); });
  // Penny's turntable stage
  r.overlay(g => { E.ui.box(g, r.W / 2 - 70, r.H - 60, 140, 26, { bg: ['#1fa8a0', '#0c5a55'], border: '#2ee6ff', alpha: .9 }); E.font.text(g, 'PENNY PRIZE', r.W / 2, r.H - 52, '#ffffff', { scale: 1, align: 'center', shadow: '#000' }); });
  let idx = 0;
  R.rows.forEach((c, i) => {
    const x = Math.round(r.W * (.2 + i * .22));
    const k = Math.min(1, Math.max(0, (t - i * .3) / 3));
    const total = Math.round(c.cash * k);
    r.overlay(g => {
      E.ui.box(g, x - 46, 26, 92, 26, { bg: ['#241240', '#0e061e'], border: c.color, alpha: .9 });
      E.font.text(g, c.name, x, 30, c.color, { scale: 1, align: 'center', shadow: '#000' });
      E.font.text(g, '$' + total.toLocaleString('en-US'), x, 42, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' });
    });
    c.prizes.forEach((p, j) => {
      if (idx++ >= shown) return;
      r.overlay(g => { E.font.text(g, p[0].slice(0, 24), x, 60 + j * 14, '#ff8ad8', { scale: 1, align: 'center', shadow: '#000' }); });
    });
  });
  if (shown >= all && all > 0) {
    const mvp = R.rows.slice().sort((a, b) => b.cash - a.cash)[0];
    r.overlay(g => E.font.title(g, 'EPISODE MVP: ' + mvp.name, r.W / 2, r.H / 2 + 20, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff2e88'] }));
  }
  if (shown > 0 && shown <= all && t % 1.4 < .1) MT.sfx('prize', { vol: .3 });
  MT.drawLines(r, 'RECAP');
};
MT.drawCredits = (r, C) => {
  const y = Math.round(r.H - (C.t += 0) * 0 - 10 - MT.G.time * 0 * 0);
  r.overlay(g => { px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,6,20,0.92)'); E.font.title(g, 'MASH TV', r.W / 2, r.H / 3, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, 'MADE WITH THE MY-3D2DGE ENGINE', r.W / 2, r.H / 3 + 40, '#fff7e8', { scale: 1, align: 'center' }); E.font.text(g, 'ORIGINAL MUSIC, SOUND AND VOICES MADE IN CODE', r.W / 2, r.H / 3 + 56, '#fff7e8', { scale: 1, align: 'center' }); E.font.text(g, 'INSPIRED BY SMASH TV (1990). MODEL: ' + MT.MODEL, r.W / 2, r.H / 3 + 72, '#2ee6ff', { scale: 1, align: 'center' }); });
};
MT.drawLines = (r, tag) => {};

// the lower third's clock: lines type out, each for its own time, the voice playing with it
MT.updateLines = (dt) => {
  const L = MT.lineNow;
  if (L) { L.t += dt; if (!L.voiced) { L.voiced = true; const d = MT.babble.say(L.text, L.voice, {}); L.dur = Math.max(2.4, d + 1); } if (L.t >= L.dur) MT.lineNow = null; return; }
  if (MT.lines.length) { const n = MT.lines.shift(); n.t = 0; MT.lineNow = n; }
};
MT.updateBanners = (dt) => { for (const b of MT.banners) b.age += dt, b.t -= dt; MT.banners = MT.banners.filter(b => b.t > 0); };
// fit the arena to the screen (§5.5): the walled arena fills the screen, leaving room for the HUD at top and bottom
MT.fitCamera = (G) => {
  if (!G.W || !G.H) return;
  const zoom = Math.min(G.W / 390, (G.H - 44) / 262);
  const z = clampZ(zoom * MT.T.camZoom);
  if (Math.abs((G.zoom || 1) - z) > .01) G.setZoom(z);
};
const clampZ = z => Math.max(.6, Math.min(2.4, z));

/* ---- 15-attract.js ---- */
/* MASH TV — 15-attract: the attract mode (§12). After 10 s on the front end, a looping demo plays ten reels of the real game:
 * bot contestants with cheats (god mode, endless Showstoppers) that show as much of the show as they can. Any input
 * returns to the title. The bot is also what the tests drive. */

// the bot (§12): a potential field of enemies and foe bullets, pickups and the room centre; it aims and fires always
MT.bot = (c, W) => {
  const I = { move: [0, 0], aim: null, fire: true, slide: false, bomb: false, showboat: false, source: 'bot' };
  let fx = 0, fy = 0, target = null, bd = 1e9;
  for (const e of W.enemies) {
    if (!e.alive || !e.counted) continue;
    const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (d < bd) { bd = d; target = e; }
    if (d < 90) { const w = (90 - d) / 90 * 1.6; fx += dx / d * w; fy += dy / d * w; }
  }
  for (const s of W.fShots) { const d = MT.dist(s.x, s.y, c.x, c.y); if (d < 50) { fx += (c.x - s.x) / (d || 1) * (50 - d) / 50 * 2; fy += (c.y - s.y) / (d || 1) * (50 - d) / 50 * 2; } if (d < 14 && !c.slideCd) I.slide = c.slideCd <= 0; }
  for (const p of W.pickups) { if (!p.collected && p.kind !== 'key') { const d = MT.dist(p.x, p.y, c.x, c.y) || 1; if (d < 140) { const w = .6 * (p.val ? Math.log10(p.val + 10) : 1) / d * 10; fx += (p.x - c.x) / d * w; fy += (p.y - c.y) / d * w; } } }
  // the room centre pulls gently; the exit, when the room is clear
  if (W.phase === 'exit' && W.R.exits) { const d = Object.keys(W.R.exits)[0]; if (d) { const D = MT.DOORS[d]; fx += (D.x - c.x) * .02; fy += (D.y - c.y) * .02; } }
  else { fx += (184 - c.x) * .01; fy += (120 - c.y) * .01; }
  const L = Math.hypot(fx, fy) || 1, sp = Math.min(1, L);
  I.move = [fx / L * sp, fy / L * sp];
  const B = W.boss && W.boss.alive ? W.boss : null;
  if (B && (!target || bd > 120)) {   // the bot shoots the part with the least armour first (an arm before the body)
    const parts = B.parts.filter(p => p.alive && p.open !== false && p.armor >= .5 && p.hp > 0);
    const pt = parts.length ? parts.map(p => ({ p, d: MT.dist(c.x, c.y, B.x + p.ox, B.y + p.oy) })).sort((a, b) => a.d - b.d)[0].p : B.body || B.parts[0];
    I.aim = Math.atan2(B.y + pt.oy - c.y, B.x + pt.ox - c.x); I.fire = true;
  }
  else if (target) { I.aim = Math.atan2(target.y - c.y, target.x - c.x); I.fire = true; }
  const near = W.enemies.filter(e => e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 120).length;
  I.bomb = near >= 25 && c.bombs > 0;
  I.showboat = W.enemies.filter(e => e.alive && e.counted && MT.dist(e.x, e.y, c.x, c.y) < 60).length >= 3 && c.hp >= c.maxHp && c.showCd <= 0;
  return I;
};

MT.REELS = [
  { kind: 'card', caption: 'TONIGHT ON MASH TV!', dur: 6, title: 'MASH TV', sub: 'LIVE FROM STUDIO 9', lines: [['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!']] },
  { kind: 'room', room: '1-1', dur: 18, caption: 'MASH \'EM!', weapon: 'spread' },
  { kind: 'room', room: '1-2', dur: 14, caption: 'CASH \'EM!', weapon: 'rockets' },
  { kind: 'boss', boss: 'mashy', room: '1-B', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', phase: 2 },
  { kind: 'room', room: '2-2', dur: 16, caption: 'PRIME TIME = 5x CASH!', weapon: 'popcorn', prime: true },
  { kind: 'boss', boss: 'wheel', room: '2-B', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!' },
  { kind: 'room', room: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', weapon: 'records' },
  { kind: 'boss', boss: 'lance', room: '3-B', dur: 16, caption: 'NOBODY CANCELS LANCE LUSTRE!' },
  { kind: 'card', caption: 'BIG PRIZES!', dur: 8, title: 'PRIZE RECAP', sub: 'PRIZES: A SELF-AWARE TOASTER $2,500 / A DRY-LAND JET SKI $8,000 / A SLIGHTLY HAUNTED ROBO-BUTLER $6,000', lines: [['PENNY', 'OOOH! A SELF-AWARE TOASTER!']] },
  { kind: 'table', caption: 'TOP EARNERS', dur: 6 }
];
MT.attract = { reel: -1, t: 0, W: null, c: null, caption: '' };
MT.attractReel = (G, i) => {
  const A = MT.attract, R = MT.REELS[i % MT.REELS.length];
  A.reel = i % MT.REELS.length; A.t = 0; A.caption = R.caption; A.W = null; A.c = null; A.cardSaid = false;
  if (R.kind === 'room' || R.kind === 'boss') {
    MT.seedAll(11 + i);
    const run = MT.run = MT.newRun({ mode: 'attract', diff: 'champion', seed: 11 + i });
    run.attract = true; run.ep = +R.room[0] || 1;
    const c = new Contestant({ diff: MT.DIFF.champion }, 0, { x: 184, y: 180, hp: 99, lives: 99, bombs: 9 });
    c.bot = true; c.input = null; c.infiniteBombs = true; c.hp = 99; c.maxHp = 99; c.weapon = { id: R.weapon || 'blaster', t: 60 };
    if (R.weapon === 'records') c.addons.records = { t: 60 }, c.makeRecords();
    if (R.weapon === 'popcorn' || R.weapon === 'spread' || R.weapon === 'rockets') c.weapon = { id: R.weapon, t: 60 };
    run.players = [{ slot: 0, input: null, c }];
    run.ratings.R = R.prime ? 99 : 40;
    const W = new World(run, R.room, { entry: 'S', players: [c] });
    c.W = W; c.walkT = .2;
    if (R.kind === 'boss') { W.boss = new MT.BOSS_CLASS[R.boss](W); W.phase = 'boss'; if (R.phase) { /* the mashy script runs phase 2 by its own clock */ } }
    else { W.noIntro = false; }
    A.W = W; A.c = c; A.run = run; A.reelDef = R; A.forcedDone = false;
    if (R.prime) W.ratingsAdd(100, 'prime');
  }
  if (R.kind === 'card') { A.reelDef = R; A.cardLines = R.lines || []; }
};
// the reels' forced moments (§12): the key at 10 s, Mashy's arms off, the wheel's segments, the Starmaker's cut to the Network, the announcer
MT.attractForce = (A, dt) => {
  const R = A.reelDef, W = A.W; if (!R || !W) return;
  if (R.kind === 'room' && R.room === '1-2' && A.t >= 10 && !A.forcedDone) { A.forcedDone = true; W.pickups.push(W.mkPickup('key', 184, 120, { persist: true })); }
  if (R.boss === 'mashy' && W.boss && !A.forcedDone && A.t >= 2) { A.forcedDone = true; const B = W.boss; B.parts[1].hp = 0; B.parts[1].alive = false; B.parts[2].hp = 0; B.parts[2].alive = false; B.armsLeft = 0; B.body2.armor = .5; }
  if (R.boss === 'wheel' && W.boss && !A.forcedDone) { A.forcedDone = true; W.boss.forcedSegs = ['JACKPOT', 'TOMATO TIME']; }
  if (R.boss === 'lance' && W.boss && A.t >= 8 && !A.forcedDone) { A.forcedDone = true; W.boss.podium.hp = 0; }
};
MT.scenes.attract = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() { MT.attract.reel = -1; MT.attractNext(MT.G); MT.music('theme', { fade: .3 }); MT.attractIdle = 0; },
  exit() { MT.run = null; MT.G.lights.enabled = false; },
  update(dt) {
    const G = MT.G, A = MT.attract;
    if ((G.players || [G.input]).some(p => p.anyPressed && p.anyPressed()) || MT.inputSerial !== (MT.attractSerial ?? MT.inputSerial)) { G.go('title', null, { fade: 0 }); return; }
    MT.attractSerial = MT.inputSerial;
    A.t += dt;
    if (A.W && A.reelDef) MT.attractForce(A, dt);
    if (A.W) { if (A.c) { A.c.invulnT = 5; A.c.hp = 99; A.c.bombs = 9; A.c.intent = MT.bot(A.c, A.W); } A.W.step(dt * 1); const ev = A.W.evq; A.W.evq = []; for (const e of ev) if (e.type === 'boss-line') MT.reactTo(e); if (A.W.boss && A.W.boss.alive) A.W.boss.step(dt, A.W); }
    if (A.W) A.W.evq.length = 0;
    if (A.t >= MT.REELS[A.reel].dur) MT.attractNext(G);
    const RC = MT.REELS[A.reel];
    if (RC && RC.kind === 'card' && !A.cardSaid) { A.cardSaid = true; for (const [w, t] of (RC.lines || [])) MT.say(w, t, { prio: 3 }); }
    MT.updateLines(dt); MT.updateBanners(dt);
    G.focus(184, 120, 0); MT.fitCamera(G);
  },
  draw(r) {
    const G = MT.G, A = MT.attract, R = MT.REELS[A.reel];
    if (A.W) { r.sky(['#0a0418', '#241040']); A.W.draw(r, {}); }
    else { r.sky(['#140a34', '#3a1c66']); }
    if (R && R.kind === 'card') r.overlay(g => { E.font.title(g, R.title, r.W / 2, r.H / 2 - 30, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] }); E.font.text(g, R.sub, r.W / 2, r.H / 2 + 10, '#fff7e8', { scale: 1, align: 'center' }); });
    if (R && R.kind === 'table') { r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.8)')); MT.cab.drawTable(r, 'show', 40, 'TOP EARNERS'); }
    r.overlay(g => { E.font.text(g, 'DEMO PLAY', 8, r.H - 30, '#ffcc33', { scale: 1, shadow: '#000' }); });
    if (A.caption) r.overlay(g => { E.ui.box(g, 20, r.H - 62, r.W - 40, 22, { bg: ['#1a0a30', '#0c0418'], border: '#ff2e88', alpha: .9 }); E.font.text(g, A.caption, r.W / 2, r.H - 56, '#fff7e8', { scale: 2, align: 'center', shadow: '#000' }); });
    if (Math.floor(G.time * 2) % 2) r.overlay(g => E.font.text(g, 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#ffffff', { scale: 1, align: 'center', shadow: '#000' }));
    if (A.W && A.W.id) MT.hud.bugs(r);
    if (MT.lineNow) MT.hud.lowerThird(r, {});
    MT.hud.banners(r);
  }
};
MT.attractNext = (G) => {
  MT.attract.reel = (MT.attract.reel + 1) % MT.REELS.length;
  MT.attractReel(G, MT.attract.reel);
};

/* ---- 16-dev.js ---- */
/* MASH TV — 16-dev: dev mode (§13), opened from the pause menu. A panel over the right side of the screen with live sliders
 * for every balance number (MT.T), the cheats, the actions, the warp list, the spawns and the debug overlays. FREEZE stops the
 * room while it is open. A DEV badge shows whenever a tuning or a cheat differs from its default. */

MT.DEV_TABS = ['PLAYER', 'ENEMIES', 'ECONOMY', 'SHOW', 'CAMERA & TIME', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
MT.DEV_CHEATS = [['god', 'God mode (all contestants)'], ['infinite', 'Infinite Showstoppers'], ['onehit', 'One-hit kills'], ['freeze', 'Freeze enemies'], ['noclip', 'No clip'], ['autopilot', 'Autopilot P1 (the bot drives)'], ['partner', 'Bot partner (adds a contestant)'], ['mute', 'Mute host chatter']];
MT.DEV_ACTIONS = [['killall', 'Kill all enemies'], ['clearroom', 'Clear the room (jump to EXIT)'], ['nextroom', 'Next room (first exit)'], ['restart', 'Restart the room'],
  ['weapon', 'Give the next weapon'], ['addon', 'Give the next add-on'], ['life', '+1 life'], ['bomb', '+1 Showstopper'], ['cash', '+$100,000'], ['key', '+1 golden key'],
  ['maxr', 'Max ratings'], ['prime', 'Trigger Prime Time'], ['stunt', 'Trigger a ratings stunt'], ['step', 'Frame step (1/30 s, frozen)'], ['export', 'EXPORT TUNING (log it)'], ['resetall', 'RESET ALL TUNING TO DEFAULTS']];
MT.DEV_SPAWN = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'tank', 'snake', 'brute'];
MT.dev = { open: false, tab: 0, row: 0, freeze: true, debug: { hitboxes: false, waves: true, stats: true }, exported: '', rects: [], spawnKind: 0, spawnN: 1, spawnWhere: 0, warpIdx: 0, msg: '' };
MT.dev.badge = () => MT.tuned().length > 0 || MT.run && MT.run.cheatsOn && Object.values(MT.run.cheats || {}).some(Boolean) || MT.run && MT.run.devTouched;

MT.devRows = () => {
  const D = MT.dev, tab = MT.DEV_TABS[D.tab], rows = [];
  if (tab === 'CHEATS') { for (const [k, label] of MT.DEV_CHEATS) rows.push({ label, value: () => (MT.runCheats()[k] ? 'ON' : 'OFF'), act: () => MT.toggleCheat(k) }); }
  else if (tab === 'ACTIONS') { for (const [k, label] of MT.DEV_ACTIONS) rows.push({ label, act: () => MT.devAction(k) }); }
  else if (tab === 'WARP') {
    const list = Object.keys(MT.ROOMS).concat(['lightning']);
    for (const id of list) rows.push({ label: 'ROOM ' + id, act: () => { MT.G.debug.quickRoom(id, 7); MT.dev.open = false; } });
    for (const s of ['cold', 'card1', 'card2', 'card3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'endingA', 'endingB', 'credits']) rows.push({ label: 'SCENE ' + s.toUpperCase(), act: () => { MT.devWarpScene(s); } });
  }
  else if (tab === 'SPAWN') {
    rows.push({ label: 'KIND', value: () => MT.DEV_SPAWN[D.spawnKind], act: () => { D.spawnKind = (D.spawnKind + 1) % MT.DEV_SPAWN.length; } });
    rows.push({ label: 'COUNT', value: () => String(D.spawnN), act: () => { D.spawnN = [1, 5, 10][([1, 5, 10].indexOf(D.spawnN) + 1) % 3]; } });
    rows.push({ label: 'WHERE', value: () => ['N', 'E', 'S', 'W', 'drop', 'audience'][D.spawnWhere], act: () => { D.spawnWhere = (D.spawnWhere + 1) % 6; } });
    rows.push({ label: 'SPAWN IT', act: () => { const W = MT.PLAY.W; if (!W) return; const where = ['N', 'E', 'S', 'W', 'drop', 'audience'][D.spawnWhere]; W.spawnAt(where, MT.DEV_SPAWN[D.spawnKind], D.spawnN, .15); D.msg = 'SPAWNED ' + D.spawnN + ' ' + MT.DEV_SPAWN[D.spawnKind]; } });
  }
  else if (tab === 'DEBUG') {
    rows.push({ label: 'HITBOXES', value: () => (D.debug.hitboxes ? 'ON' : 'OFF'), act: () => { D.debug.hitboxes = !D.debug.hitboxes; } });
    rows.push({ label: 'WAVE TIMELINE', value: () => (D.debug.waves ? 'ON' : 'OFF'), act: () => { D.debug.waves = !D.debug.waves; } });
    rows.push({ label: 'STATS', value: () => (D.debug.stats ? 'ON' : 'OFF'), act: () => { D.debug.stats = !D.debug.stats; } });
    rows.push({ label: 'FREEZE WORLD WHILE OPEN', value: () => (D.freeze ? 'ON' : 'OFF'), act: () => { D.freeze = !D.freeze; } });
  }
  else {
    const groupKeys = MT.TLIST.filter(t => t[2] === tab);
    for (const [k, label, , min, max, step] of groupKeys) rows.push({ label, key: k, value: () => MT.fmtTune(k), slider: [min, max], step, act: () => MT.setTune(k, MT.T[k]) });
    if (tab === 'PLAYER') rows.push({ label: 'RESET ALL TO DEFAULTS', act: () => { MT.resetTunes(); D.msg = 'TUNING RESET'; } });
  }
  return rows;
};
MT.fmtTune = k => { const v = MT.T[k]; return Number.isInteger(v) ? String(v) : (+v).toFixed(2).replace(/0$/, ''); };
MT.runCheats = () => (MT.run && MT.run.cheats) || {};
MT.toggleCheat = (k) => { const run = MT.run; if (!run) return; run.cheats = run.cheats || {}; run.cheats[k] = !run.cheats[k]; run.cheatsOn = true; if (k === 'partner' && run.cheats[k]) MT.addBotPartner(); };
MT.addBotPartner = () => { const W = MT.PLAY.W; if (!W || W.players.length >= 4) return; const c = new Contestant(W, W.players.length, { x: 184, y: 190 }); c.bot = true; c.state = 'walk'; c.walkT = 1.2; W.players.push(c); c.W = W; };
MT.devAction = (k) => {
  const W = MT.PLAY.W, run = MT.run, D = MT.dev, P = W && W.players.find(c => c.inPlay) || (W && W.players[0]);
  switch (k) {
    case 'killall': if (W) for (const e of W.enemies) if (e.alive) W.damageEnemy(e, 9999, P); if (W && W.boss) W.boss.damageAll(9999, W); break;
    case 'clearroom': if (W && W.phase === 'waves') { W.wavesDone = true; W.enemies.forEach(e => { e.alive = false; }); W.spawnQ = []; } break;
    case 'nextroom': if (W && W.R.exits) { const d = Object.keys(W.R.exits)[0]; if (d) { W.leaveDoor = d; W.leaveTo = W.R.exits[d]; W.phase = 'left'; } } break;
    case 'restart': if (W) MT.G.debug.quickRoom(W.id, 7); break;
    case 'weapon': if (P) { const ids = MT.PRIMARY_ORDER; P.give(ids[(ids.indexOf(P.weapon.id) + 1) % ids.length]); } break;
    case 'addon': if (P) P.give(['records', 'shield', 'speed'][Math.floor(MT.rng.spawn() * 3)]); break;
    case 'life': if (P) P.lives++; break;
    case 'bomb': if (P) P.bombs = Math.min(9, P.bombs + 1); break;
    case 'cash': if (P) P.cash += 100000; break;
    case 'key': if (run) run.keys = Math.min(9, run.keys + 1); break;
    case 'maxr': if (run) run.ratings.R = 100; break;
    case 'prime': if (W) { run.ratings.primeCD = 0; W.ratingsAdd(100, 'dev'); } break;
    case 'stunt': if (W) W.runStunt(); break;
    case 'step': if (W) W.step(1 / 30); break;
    case 'export': D.exported = MT.exportTunes(); console.log('MASH TV TUNING ' + D.exported); D.msg = 'EXPORTED: ' + (D.exported || '(defaults)'); break;
    case 'resetall': MT.resetTunes(); D.msg = 'TUNING RESET'; break;
  }
};
MT.devWarpScene = (s) => {
  const G = MT.G, map = { cold: 'coldopen', card1: 'card1', card2: 'card2', card3: 'card3', recap1: 'recap1', recap2: 'recap2', recap3: 'recap3', continue: 'continue', gameover: 'gameover', endingA: 'endingA', endingB: 'endingB', credits: 'credits' };
  MT.dev.open = false; MT.PLAY.devWarp = map[s];
};
// the panel: a right-side column, ten tabs, rows of sliders and buttons (10-foot sized)
MT.dev.update = (G, dt) => {
  const D = MT.dev, rows = MT.devRows(); if (!D.open) return;
  const ps = G.players || [G.input];
  if (D.row >= rows.length) D.row = Math.max(0, rows.length - 1);
  for (const p of ps) {
    if (p.repeat('up', .3, .09)) D.row = (D.row + rows.length - 1) % rows.length;
    if (p.repeat('down', .3, .09)) D.row = (D.row + 1) % rows.length;
    if (p.pressed('tabR')) { D.tab = (D.tab + 1) % MT.DEV_TABS.length; D.row = 0; }
    if (p.pressed('tabL')) { D.tab = (D.tab + MT.DEV_TABS.length - 1) % MT.DEV_TABS.length; D.row = 0; }
    const r = rows[D.row]; if (!r) continue;
    if (r.slider && (p.repeat('left', .3, .07) || p.repeat('right', .3, .07))) { const dir = p.repeat('right', .3, .07) ? 1 : -1; const v = MT.T[r.key] + dir * r.step; MT.setTune(r.key, +clampTo(v, r.slider[0], r.slider[1]).toFixed(4)); }
    if (p.pressed('reset') && r.key) { MT.setTune(r.key, MT.TDEF[r.key]); D.msg = 'RESET ' + r.label; }
    if (p.pressed('confirm')) r.act && r.act();
    if (p.pressed('cancel')) { D.open = false; }
  }
  // the mouse: hover focuses a row, a click on a row activates it, a click on a slider's bar sets it
  for (const p of ps) {
    const pt = p.pointer && p.pointer(); if (pt) { const i = D.rects.findIndex(q => q && pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3]); if (i >= 0) D.row = D.rects[i][4]; }
    const c = p.clicked && p.clicked(); if (c) { const i = D.rects.findIndex(q => q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]); if (i >= 0) { D.row = D.rects[i][4]; const r = rows[D.row]; if (r && r.slider && c[0] > D.rects[i][0] + D.rects[i][2] * .5) { const u = (c[0] - (D.rects[i][0] + D.rects[i][2] * .5)) / (D.rects[i][2] * .5); MT.setTune(r.key, +(r.slider[0] + (r.slider[1] - r.slider[0]) * clamp01((c[0] - D.rects[i][0] - D.rects[i][2] * .5) / (D.rects[i][2] * .5))).toFixed(4)); } else if (r) r.act && r.act(); } }
  }
  if (D.freeze && MT.PLAY.W) { /* the play scene skips the world while open */ }
};
const clampTo = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = v => Math.max(0, Math.min(1, v));
MT.dev.draw = (r) => {
  const D = MT.dev; if (!D.open) return;
  const rows = MT.devRows(), x0 = Math.round(r.W * .54), w = r.W - x0 - 6, y0 = 6, H = r.H - 12;
  D.rects = [];
  r.overlay(g => {
    E.ui.box(g, x0, y0, w, H, { bg: ['#140a24', '#070310'], border: '#ff8a2a', alpha: .94 });
    E.font.title(g, 'DEV MODE', x0 + w / 2, y0 + 6, { scale: 2, align: 'center', colors: ['#ff8a2a', '#ffcc33'] });
    E.font.text(g, MT.DEV_TABS.map((t, i) => (i === D.tab ? '[' + t + ']' : '')).join(' ').trim(), x0 + 8, y0 + 30, '#ffcc33', { scale: 1, wrap: w - 16 });
  });
  let y = y0 + 52;
  rows.forEach((row, i) => {
    const foc = i === D.row, rh = 16;
    if (y + rh > y0 + H - 36) return;
    D.rects.push([x0 + 6, y, w - 12, rh, i]);
    r.overlay(g => {
      if (foc) px.rect(g, x0 + 6, y, w - 12, rh - 2, '#ffcc33');
      E.font.text(g, row.label, x0 + 10, y + 4, foc ? '#15121c' : '#fff7e8', { scale: 1 });
      if (row.value) E.font.text(g, row.value(), x0 + w - 10, y + 4, foc ? '#15121c' : '#2ee6ff', { scale: 1, align: 'right' });
      if (row.slider) { const t = (MT.T[row.key] - row.slider[0]) / (row.slider[1] - row.slider[0]); px.rect(g, x0 + w * .58, y + 13, w * .3, 1, '#4a3a60'); px.rect(g, x0 + w * .58 + w * .3 * clamp01(t) - 1, y + 10, 3, 6, foc ? '#15121c' : '#ff8a2a'); }
    });
    y += rh;
  });
  r.overlay(g => {
    E.font.text(g, D.msg || '', x0 + 8, y0 + H - 34, '#ffcc33', { scale: 1, wrap: w - 16 });
    E.font.text(g, 'UP/DOWN ROW  LEFT/RIGHT VALUE  R RESET  L1/R1 TAB  O CLOSE', x0 + 8, y0 + H - 16, '#8a7aa8', { scale: 1, wrap: w - 16 });
  });
  if (D.debug.stats && MT.PLAY.W) { const W = MT.PLAY.W; r.overlay(g => { E.font.text(g, 'ENEMIES ' + W.enemies.filter(e => e.alive).length + '  SHOTS ' + (W.pShots.length + W.fShots.length) + '  PICKUPS ' + W.pickups.length + '  PHASE ' + W.phase + '  R ' + Math.round(MT.run.ratings.R), 8, r.H - 46, '#ffcc33', { scale: 1, shadow: '#000' }); }); }
  if (D.debug.waves && MT.PLAY.W) { const W = MT.PLAY.W; r.overlay(g => E.font.text(g, 'WAVE ' + W.waveIdx + '/' + W.R.waves.length + '  COUNTED ' + W.aliveCounted, 8, r.H - 60, '#2ee6ff', { scale: 1, shadow: '#000' })); }
};
MT.openDev = () => { MT.dev.open = true; MT.dev.row = 0; MT.dev.tab = 0; MT.overlays.indexOf(MT.dev) < 0 && MT.overlays.push(MT.dev); };
MT.openMap = () => { MT.PLAY.mapOverlay = { t: 0 }; };
MT.openHowTo = () => { MT.PLAY.howOverlay = { page: 0 }; };
MT.overlays.push(MT.dev);

/* ---- 17-net.js ---- */
/* MASH TV — 17-net: AI Hub Session Protocol v1, shared-world (the Lightning Round, §14.2–§14.4). The host's copy runs the world
 * (or a server copy runs it with no player); each other copy sends its player's intent to the host and mirrors the world the
 * host sends: a snapshot 15 times a second, the room on every change, the events as they happen. Only the host finishes. */

MT.NET = { on: false, info: null, host: false, server: false, me: -1, players: [], intents: {}, lastIntentAt: {}, evOut: [], sendT: 0,
  mirror: null, started: false, finished: false, card: null, room: null, goal: '', howto: '', endReason: null, endStandings: null, leftIds: {} };
MT.NET_KINDS = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'discoSmall', 'heckler', 'hecklerKing', 'tank', 'snake', 'snakeSeg', 'brute', 'lock', 'crate', 'paparazzo'];
MT.NET_SHOTS = ['orb', 'shard', 'beam', 'shell', 'tomato', 'butter', 'gravy', 'coin', 'card', 'static', 'tot', 'kernel', 'bolt'];
MT.NET_PICK = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life', 'statuette'];
MT.NET_STATE = ['play', 'walk', 'drop', 'dead', 'out'];
MT.NET_PHASE = ['enter', 'intro', 'waves', 'clear', 'exit', 'left', 'boss', 'bossdone', 'bonus'];
MT.NET_WPN = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];
MT.NET_EV = ['kill', 'hurt', 'death', 'prime', 'prime-end', 'clear', 'key', 'boss-line', 'boss-dies', 'showstop', 'boom', 'stunt', 'out', 'encore', 'steal'];
MT.safeName = s => String(s || '').replace(/[^\x20-\x7e]/g, '?').slice(0, 12);
MT.hub = () => (typeof globalThis !== 'undefined' && globalThis.AIHub) || null;
MT.netSend = (data, o) => { const h = MT.hub(); return h ? h.send(data, o) : false; };

// the host's snapshot: integers only, the lists capped so the message stays well under the 16 KB limit (§ the README)
MT.netEncode = (W, run) => {
  const q = Math.round;
  const P = W.players.map(c => [c.slot, q(c.x), q(c.y), q(((c.aim !== null ? c.aim : c.face) || 0) * 100), c.hp, c.lives, c.cash, c.bombs, MT.NET_STATE.indexOf(c.state), MT.NET_WPN.indexOf(c.weapon.id) < 0 ? 0 : MT.NET_WPN.indexOf(c.weapon.id), (c.shielded ? 1 : 0) | (c.addonsOn && c.addonsOn.includes('speed') ? 2 : 0) | (c.addonsOn && c.addonsOn.includes('records') ? 4 : 0), q(c.dropZ || 0), c.showT > 0 ? 1 : 0, c.hurtT > 0 ? 1 : 0, c.kills, c.deaths, c.prizes.length]);
  let E = W.enemies.filter(e => e.alive && MT.NET_KINDS.includes(e.kind)).map(e => [e.id, MT.NET_KINDS.indexOf(e.kind), q(e.x), q(e.y), q((e.face || 0) * 100), q((e.hp / e.maxHp || 0) * 100), (e.wind > 0 ? 1 : 0) | (e.entering ? 2 : 0) | (e.flash > 0 ? 4 : 0) | (e.alpha !== undefined ? 8 : 0) | (e.blast !== undefined ? 16 : 0) | (e.fuse !== undefined ? 32 : 0), q(e.z || 0), e.parent ? e.parent.id : 0, e.seg || 0]);
  let B = W.fShots.map(s => [MT.NET_SHOTS.indexOf(s.kind) < 0 ? 0 : MT.NET_SHOTS.indexOf(s.kind), q(s.x), q(s.y), q(s.z || 0)]);
  let M = W.pShots.map(s => [q(s.x), q(s.y)]);
  let K = W.pickups.map(p => [MT.NET_PICK.indexOf(p.kind) < 0 ? 0 : MT.NET_PICK.indexOf(p.kind), q(p.x), q(p.y), p.persist ? 0 : q(p.life), p.cap ? MT.NET_SHOTS.length + Math.max(0, MT.CAPSULES.indexOf(p.cap)) : 0]);
  const bo = W.boss ? MT.netEncodeBoss(W.boss) : null;
  const pl = { t: 's', a: q(W.time * 100), rm: W.id, ph: MT.NET_PHASE.indexOf(W.phase), R: q(run.ratings.R), X: W.multiplier, k: run.keys, pm: W.primeOn ? 1 : 0, P, E, B, M, K,
    V: (W.vents || []).map(v => (v.state === 'idle' ? 0 : v.state === 'telegraph' ? 1 : 2)), C: (W.conveyors || []).map(c => c.dir), Sp: W.splats.map(s => [q(s.x), q(s.y), q(s.t)]), Bo: bo,
    Be: (W.beams || []).map(b => b.vertical ? [1, q(b.x), q(b.tele || 0)] : [0, q(b.x0), q(b.y0), q((b.a || 0) * 100), b.active ? 1 : 0]), ev: MT.NET.evOut.splice(0, 40) };
  // stay under 12 KB: trim the longest lists first
  let txt = JSON.stringify(pl);
  for (let guard = 0; txt.length > 11800 && guard < 20; guard++) { if (pl.E.length > 40) pl.E.length = Math.floor(pl.E.length * .8); else if (pl.B.length > 40) pl.B.length = Math.floor(pl.B.length * .8); else if (pl.K.length > 10) pl.K.length = 10; else break; txt = JSON.stringify(pl); }
  return pl;
};
MT.netEncodeBoss = (b) => {
  const parts = b.parts.map(p => [Math.round(p.hp), p.alive ? 1 : 0, p.open === false ? 0 : 1, Math.round((p.armor || 1) * 100), Math.round(p.ox || 0), Math.round(p.oy || 0)]);
  return { k: b.kind, x: Math.round(b.x), y: Math.round(b.y), al: b.alive ? 1 : 0, dy: b.dying > 0 ? 1 : 0, st: b.stance || b.phaseName || '', an: Math.round((b.angle || 0) * 100), pa: parts, ph: b.phaseName || '' };
};
// the mirror world: the same room data, with the entities the host sends in place of its own
MT.netApplyBoss = (W, bo) => {
  if (!bo) { W.boss = null; return; }
  if (!W.boss || W.boss.kind !== bo.k) W.boss = new MT.BOSS_CLASS[bo.k](W);
  const b = W.boss; b.x = bo.x; b.y = bo.y; b.alive = !!bo.al; b.dying = bo.dy ? 1 : 0; b.stance = bo.st; b.phaseName = bo.ph || b.phaseName; b.angle = bo.an / 100;
  bo.pa.forEach((p, i) => { const q = b.parts[i]; if (!q) return; q.hp = p[0]; q.alive = !!p[1]; q.open = p[2] === 1; q.armor = p[3] / 100; q.ox = p[4]; q.oy = p[5]; });
  if (b.kind === 'mashy') { b.hatch.open = b.parts[3] ? b.parts[3].open : b.hatch.open; b.body2.armor = b.body2.armor; }
  if (b.kind === 'lance') b.eye && (b.eye.open = !!(b.parts[b.parts.length - 1] && b.parts[b.parts.length - 1].open));
  if (b.kind === 'wheel') b.hub && (b.hub.armor = b.hub.armor);
};
MT.netApply = (W, s, run) => {
  if (!W) return;
  // players: the mirrors by slot; this copy's own player keeps its own position (prediction)
  for (const row of s.P) {
    const slot = row[0]; let c = W.players.find(q => q.slot === slot);
    if (!c) { c = new MT.Contestant(W, slot, { lives: 99, hp: 3 }); c.input = null; W.players.push(c); c.W = W; }
    const own = MT.NET.me === slot && !MT.NET.server;
    if (!own) { c.x = row[1]; c.y = row[2]; c.face = row[3] / 100; c.aim = null; }
    c.hp = row[4]; c.lives = row[5]; c.cash = row[6]; c.bombs = row[7]; c.state = MT.NET_STATE[row[8]] || 'play';
    c.weapon = { id: MT.NET_WPN[row[9]] || 'blaster', t: Infinity }; c.dropZ = row[11]; c.showT = row[12] ? .3 : 0; c.hurtT = row[13] ? .2 : 0;
    c.kills = row[14]; c.deaths = row[15]; c.netFlags = row[10];
    c.addons = {}; if (row[10] & 1) c.addons.shield = { t: 1 }; if (row[10] & 2) c.addons.speed = { t: 1 }; if (row[10] & 4) c.addons.records = { t: 1 };
    c.netSeen = true;
  }
  W.players = W.players.filter(c => s.P.some(r => r[0] === c.slot));
  // enemies: the mirror objects by host id
  const byId = MT.NET.mirror.enemies || (MT.NET.mirror.enemies = new Map()), seen = new Set(), list = [];
  for (const r of s.E) {
    const id = r[0]; seen.add(id);
    let e = byId.get(id);
    const kind = MT.NET_KINDS[r[1]];
    if (!e || e.kind !== kind) { e = { id, kind, D: MT.ENEMY[kind], r: MT.ENEMY[kind].r, counted: MT.ENEMY[kind].counted !== false, alive: true, rig: null, t: 0 }; byId.set(id, e); }
    const f = r[6];
    Object.assign(e, { x: r[2], y: r[3], face: r[4] / 100, hpPct: r[5] / 100, wind: f & 1 ? .3 : 0, entering: !!(f & 2), flash: f & 4 ? .1 : 0, alpha: f & 8 ? .45 : undefined, blast: f & 16 ? .5 : undefined, fuse: f & 32 ? .5 : undefined, z: r[7], alive: true, parentId: r[8], seg: r[9] });
    if (e.kind === 'snakeSeg') { const h = byId.get(e.parentId); e.parent = h || null; }
    list.push(e);
  }
  for (const id of [...byId.keys()]) if (!seen.has(id)) byId.delete(id);
  W.enemies = list;
  // every enemy's hp fraction stands as max hp for the health look
  for (const e of list) { e.maxHp = 1; e.hp = e.hpPct; }
  W.fShots = s.B.map(b => ({ kind: MT.NET_SHOTS[b[0]], x: b[1], y: b[2], z: b[3], team: 'f' }));
  W.pShots = s.M.map(m => ({ x: m[0], y: m[1], team: 'p' }));
  W.pickups = s.K.map(k => { const kind = MT.NET_PICK[k[0]]; const p = { kind, x: k[1], y: k[2], life: k[3] || 9, persist: k[3] === 0, age: W.time, cap: k[4] >= MT.NET_SHOTS.length ? MT.CAPSULES[k[4] - MT.NET_SHOTS.length] : undefined, val: 0 }; return p; });
  if (W.vents) W.vents.forEach((v, i) => { const st = s.V[i]; v.state = st === 1 ? 'telegraph' : st === 2 ? 'flame' : 'idle'; });
  if (W.conveyors) W.conveyors.forEach((cv, i) => { if (s.C[i] !== undefined) cv.dir = s.C[i]; });
  W.splats = s.Sp.map(p => ({ x: p[0], y: p[1], t: p[2], r: 14 }));
  W.beams = s.Be.map(b => b[0] ? { vertical: true, x: b[1], tele: b[2] } : { x0: b[1], y0: b[2], a: b[3] / 100, active: !!b[4] });
  W.phase = MT.NET_PHASE[s.ph] || W.phase;
  W.primeOn = !!s.pm;
  MT.netApplyBoss(W, s.Bo);
  run.ratings.R = s.R; run.keys = s.k;
  for (const ev of s.ev) MT.netReact(W, ev);
};
// events as they happen: the copy reacts to them as it would at home
MT.netEvent = (ev) => {
  const d = ev.data || {};
  const row = { ty: ev.type };
  if (ev.type === 'kill' && d.e) { row.k = MT.NET_KINDS.indexOf(d.e.kind); row.big = !!d.big; row.x = Math.round(d.e.x); row.y = Math.round(d.e.y); }
  if (ev.type === 'hurt' && d.c) row.s = d.c.slot;
  if (ev.type === 'death' && d.c) row.s = d.c.slot;
  if (ev.type === 'key' && d.n !== undefined) row.n = d.n;
  if (ev.type === 'boss-line') row.key = d.key;
  if (ev.type === 'showstop' && d.c) row.s = d.c.slot;
  if (ev.type === 'boom' || ev.type === 'stunt') { row.x = Math.round(d.x || 0); row.y = Math.round(d.y || 0); }
  if (ev.type === 'out' && d.c) row.s = d.c.slot;
  if (!MT.NET_EV.includes(ev.type)) return;
  MT.NET.evOut.push(row);
};
MT.netReact = (W, row) => {
  const cOf = s => W.players.find(c => c.slot === s);
  const data = {};
  if (row.ty === 'kill') data.e = { kind: MT.NET_KINDS[row.k], x: row.x, y: row.y }, data.big = row.big;
  if (row.s !== undefined) data.c = cOf(row.s) || W.players[0];
  if (row.n !== undefined) data.n = row.n;
  if (row.key !== undefined) data.key = row.key;
  if (row.x !== undefined && row.ty !== 'kill') { data.x = row.x; data.y = row.y; }
  if (row.ty === 'prime' || row.ty === 'clear') {}
  MT.reactTo({ type: row.ty, data });
};
// remote contestants: their last intent, held for up to a second; the host runs them
MT.netRemoteIntent = (c) => {
  const row = MT.NET.intents[c.slot]; const at = MT.NET.lastIntentAt[c.slot] || -1e9;
  if (!row || (MT.G.time - at) > 1) return { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  return row;
};
// a copy's own player, sent to the host 15 times a second (the host also runs it: the copy sends, the host decides)
MT.netSendIntent = (I) => {
  MT.netSend({ t: 'i', m: I.move.map(v => Math.round(v * 100) / 100), a: I.aim === null ? null : Math.round(I.aim * 100) / 100, f: I.fire ? 1 : 0, sl: I.slide ? 1 : 0, bo: I.bomb ? 1 : 0, sb: I.showboat ? 1 : 0 }, { reliable: false });
};
MT.netOnMessage = (data, from) => {
  if (!data || typeof data !== 'object') return;
  if (data.t === 'i' && MT.NET.host) {
    MT.NET.intents[from] = { move: data.m || [0, 0], aim: data.a, fire: !!data.f, slide: !!data.sl, bomb: !!data.bo, showboat: !!data.sb, source: 'remote' };
    MT.NET.lastIntentAt[from] = MT.G.time;
  } else if (data.t === 's' && !MT.NET.host) {
    MT.NET.lastSnap = data;
  } else if (data.t === 'room' && !MT.NET.host) {
    MT.netMirrorRoom(data.rm);
  }
};
// the copy's room: a mirror World on each change (the host's room message comes first, reliable)
MT.netMirrorRoom = (rm) => {
  const run = MT.run, G = MT.G; if (!run) return;
  if (MT.PLAY.W && MT.PLAY.W.id === rm && MT.NET.mirror) return;
  const W = new World(run, rm, { entry: 'S', players: run.players.map(p => p.c).filter(Boolean) });
  W.mirror = true; MT.NET.mirror = { enemies: new Map() };
  MT.PLAY.W = W; MT.NET.room = rm; run.roomsSeen = (run.roomsSeen || 0) + 1;
  MT.banner(MT.ROOMS[rm].name, '#ffcc33', 2);
};
// the host's messages for the room and the snapshot, and the events of each step
MT.netHostStep = (G, W, run, dt) => {
  MT.NET.sendT -= dt;
  if (MT.NET.sendT > 0) return;
  MT.NET.sendT = 1 / 15;
  MT.netSend(MT.netEncode(W, run), { reliable: false });
};
MT.netRoomMessage = (rm) => MT.netSend({ t: 'room', rm }, { reliable: true });

// the host's session flow: the four rooms in order, the boss last; then the finish (§14.4)
MT.sessionFlow = function* (G, run) {
  const S = MT.PLAY;
  for (const [id] of MT.LIGHTNING) {
    const W = MT.spawnWorld(G, run, id, 'S');
    MT.netRoomMessage(id);
    MT.netEvent({ type: 'room', data: {} });
    yield E.until(() => W.phase === 'left' || W.bossOver || (MT.allDownInSession(run)));
    if (W.bossOver) { yield 3; MT.netFinish(run, true); return; }
    if (MT.allDownInSession(run)) { MT.netFinish(run, false); return; }
    S.mapCard = { ep: 0, roomId: id, t: 0 };
    yield E.any([2.5, () => false]);
    S.mapCard = null;
  }
  MT.netFinish(run, false);
};
MT.allDownInSession = (run) => run.players.length > 0 && run.players.every(p => p.c && p.c.state === 'out');
// the standings: by cash, ties together; the scores; the stats; the awards; once, from the host
MT.netFinish = (run, won) => {
  if (MT.NET.finished || !MT.NET.host) return;
  MT.NET.finished = true;
  const cs = run.players.map(p => p.c).filter(Boolean);
  const order = [...new Set(cs.map(c => c.cash))].sort((a, b) => b - a);
  const standings = order.map(v => cs.filter(c => c.cash === v).map(c => c.slot));
  const scores = {}, stats = {};
  for (const c of cs) { scores[c.slot] = c.cash; stats[c.slot] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
  const top = cs.slice().sort((a, b) => b.cash - a.cash)[0];
  const awards = top ? [{ id: top.slot, title: 'BIGGEST EARNER', detail: '$' + top.cash.toLocaleString('en-US') }] : [];
  const h = MT.hub(); if (h) h.finish({ standings, scores, won, stats, awards });
  MT.banner(won ? 'SIGNAL LOST: MASH TV WINS!' : 'THAT\'S OUR SHOW!', '#ffcc33', 4);
};

/* ---- 18-session.js ---- */
/* MASH TV — 18-session: the AI Hub session around the Lightning Round: the join (connect, then ready with no key press), the
 * card (our own: the line-up, the answers, the time left), the start, the play (host or mirror), the Esc overlay that never
 * pauses, and the end (§14.2). Outside a session none of this runs. */

MT.sessionStart = (info) => {
  const G = MT.G, N = MT.NET;
  N.info = info; N.host = !!info.isHost; N.server = !!info.server; N.me = info.me; N.on = true;
  const seats = info.players.map(p => p.id);
  MT.seedAll(info.seed || 7);
  const run = MT.startRun({ mode: 'session', diff: 'contestant', slots: seats, seed: info.seed || 7 });
  run.players = seats.map(id => ({ slot: id, input: (!info.server && id === info.me) ? G.input : null, remote: info.server || id !== info.me, c: null }));
  run.diff = MT.DIFF.contestant;
  const meta = (n) => { const el = typeof document !== 'undefined' && document.querySelector('meta[name="' + n + '"]'); return el ? el.getAttribute('content') : ''; };
  N.meta = { goal: meta('hub:session-goal'), howto: meta('hub:session-howto') };
  const h = MT.hub();
  h.on('card', c => { N.card = c; });
  h.on('start', () => { N.started = true; });
  h.on('message', (data, from) => MT.netOnMessage(data, from));
  h.on('leave', ({ id, reason }) => {
    const p = run.players.find(q => q.slot === id); if (!p || !p.c) return;
    p.c.state = 'out'; p.c.lives = 0; N.leftIds[id] = reason; MT.banner(MT.safeName(info.players.find(q => q.id === id)?.name) + ' LEFT THE STUDIO', '#ff3344', 2.5);
    MT.sfx('confetti'); MT.netCheckAllLeft(run);
  });
  h.on('time-up', () => { if (N.host && MT.PLAY.W) MT.netFinish(run, false); });
  h.on('end', ({ reason, standings }) => { N.endReason = reason; N.endStandings = standings || null; N.ended = true; G.input.clear && G.input.clear(); G.audio.stopMusic && G.audio.stopMusic(.3); G.audio.mute(true); });
};
MT.netCheckAllLeft = (run) => { if (MT.NET.host && run.players.every(p => !p.c || p.c.state === 'out') && !MT.NET.finished) MT.netFinish(run, false); };

// the join: connect with the card on, then ready() once: the card answers Ready and More time
MT.scenes.hubwait = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [],
  enter() { const G = MT.G; const h = MT.hub(); h.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => { if (!info) { G.go('title', null, { fade: 0 }); return; } MT.sessionStart(info); G.go('sessioncard', null, { fade: 0 }); }); },
  update() {}, draw(r) { r.sky(['#140a34', '#3a1c66']); r.overlay(g => E.font.text(g, 'JOINING THE STUDIO...', r.W / 2, r.H / 2, '#fff7e8', { scale: 2, align: 'center' })); }
};
// the card: our own (connect({card: true})): the players lined up, who is ready, how to win, this player's controls, the time
MT.scenes.sessioncard = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() {
    const N = MT.NET, h = MT.hub(); MT.cardRects = {};
    h.ready();   // loaded: the round can start, with no key press
    MT.music('theme');
    MT.say('LANCE', 'TONIGHT, ' + N.info.players.length + ' CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!', { prio: 5 });
    if (!MT._enterKeyBackstop) { MT._enterKeyBackstop = true; if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', e => { if (MT.G && MT.G.sceneName === 'sessioncard' && (e.code === 'Enter' || e.key === 'Enter')) MT.hub().answer('ready'); }); }
  },
  update(dt) {
    const G = MT.G, h = MT.hub(), N = MT.NET;
    for (const p of (G.players || [G.input])) {
      if (p.pressed('confirm') || p.pressed('start')) h.answer('ready');
      if (p.pressed('extra') || p.pressed('reset') && false) h.answer('more');
    }
    const c = MT.cardRects.ready, m = MT.cardRects.more, pt = G.input.clicked && G.input.clicked();
    if (pt && c && pt[0] >= c[0] && pt[0] <= c[0] + c[2] && pt[1] >= c[1] && pt[1] <= c[1] + c[3]) h.answer('ready');
    if (pt && m && pt[0] >= m[0] && pt[0] <= m[0] + m[2] && pt[1] >= m[1] && pt[1] <= m[1] + m[3]) h.answer('more');
    if (N.started && h.time() >= 0) G.go('play', { session: true }, { fade: 0 });
  },
  draw(r) {
    const N = MT.NET, card = N.card || {}, info = N.info, ready = card.ready || [];
    r.sky(['#140a34', '#3a1c66']);
    MT.drawSpotlights(r, 0);
    r.overlay(g => E.font.title(g, 'MASH TV', r.W / 2, 12, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    r.overlay(g => E.font.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, 40, '#2ee6ff', { scale: 1, align: 'center', shadow: '#000' }));
    const n = info.players.length;
    info.players.forEach((p, i) => {
      const x = Math.round(r.W * (.5 + (i - (n - 1) / 2) * .22)) - 40, y = 56, col = MT.slots[p.id % 4].color;
      r.overlay(g => {
        E.ui.box(g, x, y, 80, 60, { bg: ['#241240', '#0e061e'], border: col, alpha: .95 });
        E.font.text(g, MT.safeName(p.name), x + 40, y + 6, col, { scale: 1, align: 'center', shadow: '#000' });
        E.font.text(g, MT.LOOKS[p.id % 4].name, x + 40, y + 20, '#fff7e8', { scale: 1, align: 'center' });
        E.font.text(g, ready.includes(p.id) ? 'READY' : 'NOT YET', x + 40, y + 40, ready.includes(p.id) ? '#7ad06a' : '#ffcc33', { scale: 1, align: 'center' });
      });
    });
    const left = card.left, t = N.started ? (MT.hub().time() < 0 ? 'STARTING: ' + Math.ceil(-MT.hub().time() / 1000) : 'MASH!') : card.paused ? 'PAUSED: MORE TIME' : left != null ? 'STARTS IN ' + Math.ceil(left / 1000) : 'GET READY';
    r.overlay(g => E.font.text(g, t, r.W / 2, 124, '#ffcc33', { scale: 2, align: 'center', shadow: '#000' }));
    r.overlay(g => E.font.text(g, 'HOW TO WIN: ' + (N.meta.goal || 'GRAB THE MOST CASH, BEAT MASHY TOGETHER').toUpperCase(), r.W / 2, 150, '#fff7e8', { scale: 1, align: 'center', shadow: '#000', wrap: r.W - 40 }));
    const mine = MT.glyph;
    r.overlay(g => { const x = r.W / 2 - 62, y = 176; E.ui.box(g, x, y, 56, 18, { bg: ['#7ad06a', '#2a7a2a'], border: '#fff7e8', alpha: .95 }); E.font.text(g, 'READY', x + 28, y + 5, '#101010', { scale: 1, align: 'center' }); MT.cardRects.ready = [x, y, 56, 18]; });
    r.overlay(g => { const x = r.W / 2 + 6, y = 176; E.ui.box(g, x, y, 62, 18, { bg: ['#241240', '#0e061e'], border: '#ffcc33', alpha: .95 }); E.font.text(g, 'MORE TIME', x + 31, y + 5, '#fff7e8', { scale: 1, align: 'center' }); MT.cardRects.more = [x, y, 62, 18]; });
    r.overlay(g => { MT.glyph.prompt(g, 10, r.H - 26, [['confirm', 'READY'], ['extra', 'MORE TIME']], MT.G.input, { scale: 1 }); E.font.text(g, (N.meta.howto || 'MOVE LEFT STICK / WASD · FIRE RIGHT STICK / MOUSE · SLIDE SPACE / L2 · SHOWSTOPPER E / R1').toUpperCase(), 10, r.H - 40, '#8a7aa8', { scale: 1, wrap: r.W - 20 }); });
  }
};
// the end of the round (§14.2 end): the reason, and the standings if there are any
MT.scenes.sessionend = {
  view: 'threequarter', res: 'ps1', expand: true, touch: [], pausable: false,
  enter() { MT.music('ending'); },
  update() {},
  draw(r) {
    const N = MT.NET, reason = N.endReason;
    r.sky(['#140a34', '#3a1c66']);
    const line = reason === 'finished' ? "THAT'S OUR SHOW!" : reason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : reason === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.';
    r.overlay(g => E.font.title(g, line, r.W / 2, r.H / 2 - 40, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] }));
    if (N.endStandings) N.endStandings.slice(0, 4).forEach((ids, i) => r.overlay(g => E.font.text(g, (i + 1) + '. ' + ids.map(id => MT.safeName((N.info.players.find(p => p.id === id) || {}).name)).join(' / '), r.W / 2, r.H / 2 + 6 + i * 12, '#fff7e8', { scale: 1, align: 'center', shadow: '#000' })));
  }
};
// the Esc overlay in a session: volume, music, button symbols, close. It never pauses the round.
MT.netOverlay = { open: false, row: 0 };
MT.netOverlayRows = () => [
  { label: 'VOLUME  ' + Math.round(MT.G.audio.volume * 100) + '%', act: (d) => { MT.G.audio.setVolume(Math.max(0, Math.min(1, MT.G.audio.volume + (d || 0.1)))); } },
  { label: 'MUSIC  ' + (MT.G.audio.musicVolume > 0 ? 'ON' : 'OFF'), act: () => { MT.G.audio.musicVolume = MT.G.audio.musicVolume > 0 ? 0 : 0.7; MT.G.audio.applyVolume && MT.G.audio.applyVolume(); } },
  { label: 'BUTTON SYMBOLS  ' + (MT.G.settings.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION'), act: () => { MT.G.settings.set('glyphs', MT.G.settings.glyphs === 'xbox' ? 'playstation' : 'xbox'); } },
  { label: 'CLOSE', act: () => { MT.netOverlay.open = false; } }
];
MT.netOverlayUpdate = (G) => {
  const O = MT.netOverlay; const rows = MT.netOverlayRows();
  for (const p of (G.players || [G.input])) {
    if (p.pressed('down')) O.row = (O.row + 1) % rows.length;
    if (p.pressed('up')) O.row = (O.row + rows.length - 1) % rows.length;
    if (p.pressed('right')) rows[O.row].act(0.1);
    if (p.pressed('left')) rows[O.row].act(-0.1);
    if (p.pressed('confirm')) rows[O.row].act(0);
    if (p.pressed('cancel')) O.open = false;
  }
};
MT.netOverlayDraw = (r) => {
  const O = MT.netOverlay, rows = MT.netOverlayRows();
  r.overlay(g => { E.ui.box(g, r.W / 2 - 90, r.H / 2 - 50, 180, 100, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .97 }); E.font.text(g, 'SESSION OPTIONS', r.W / 2, r.H / 2 - 42, '#ffcc33', { scale: 1, align: 'center' }); });
  rows.forEach((row, i) => r.overlay(g => E.font.text(g, (i === O.row ? '> ' : '  ') + row.label, r.W / 2 - 80, r.H / 2 - 26 + i * 16, i === O.row ? '#ffffff' : '#c8c0e0', { scale: 1 })));
};
// a copy that is not the host: its own player moves at once (prediction), its intent goes to the host, and the host's
// snapshot replaces the rest; the rigs and the world are posed from what the snapshot says
MT.netClientStep = (G, dt) => {
  const N = MT.NET, W = MT.PLAY.W, run = MT.run; if (!W || !run) return;
  if (N.lastSnap && N.lastSnap !== N.appliedSnap) { N.appliedSnap = N.lastSnap; MT.netApply(W, N.lastSnap, run); }
  W.time += dt;
  const own = W.players.find(c => c.slot === N.me);
  const zero = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
  const I = (own && !MT.netOverlay.open) ? MT.intentFrom(G.input, own, G, W) : zero;
  if (own && I.move && (I.move[0] || I.move[1]) && own.state === 'play') { own.x += I.move[0] * MT.T.playerSpeed * dt; own.y += I.move[1] * MT.T.playerSpeed * dt; W.wallClamp(own); }
  N.intentT = (N.intentT || 0) - dt;
  if (N.intentT <= 0) { N.intentT = 1 / 15; MT.netSendIntent(I); }
  for (const c of W.players) { if (!c.rig) c.rig = MT.lookRig(c.slot); c.rig.update(dt, c.rsState); }
  for (const e of W.enemies) { if (!e.rig && MT.RIGS[e.kind] && MT.RIGS[e.kind].kind !== 'custom') e.rig = MT.makeRig(MT.RIGS[e.kind]); if (e.rig) e.rig.update(dt, { x: e.x, y: e.y, z: e.z || 0, vx: 0, vy: 0, facing: e.face || 0, hurt: e.flash > 0, pose: e.wind > 0 ? 'cheer' : undefined }); }
  if (W.boss) W.boss.t = (W.boss.t || 0) + dt;
};

/* ---- 19-endings.js ---- */
/* MASH TV — 19-endings: the two endings staged in the play scene (§8.2): the contestants posed in a row under the spotlight,
 * Ending A's spare Lance robot booting up behind the curtain, and Ending B's red OFF switch with the studio lights going out
 * one by one. The flow waits on MT.stage(kind); the play scene steps and draws the stage while it is up. */

MT.endX = (i, n) => 184 + (i - (n - 1) / 2) * 44;

// the stage runs for its time, or until a confirm after a second; then the flow's end card follows
MT.stage = function* (kind) {
  const S = MT.PLAY, dur = kind === 'a' ? 13 : 15;
  S.ending = { kind, t: 0, dur, done: false, lanceRig: null };
  MT.lines.length = 0; MT.lineNow = null;
  const lines = kind === 'a' ? [['PENNY', MT.TEXT.endingA[0]], ['LANCE', MT.TEXT.endingANext]] : [['ANNC', MT.TEXT.endingB[0]], ['ANNC', MT.TEXT.endingB[1]]];
  for (const [w, t] of lines) MT.say(w, t, { prio: 5 });
  MT.music('ending');
  yield E.any([dur, () => (S.ending && S.ending.done) || (S.ending && S.ending.t > 1 && MT.anyConfirm())]);
  S.ending = null;
};
MT.endingStep = (G, dt) => {
  const X = MT.PLAY.ending; if (!X) return;
  X.t += dt; if (X.t >= X.dur) X.done = true;
  const beat = 60 / (MT.SONGS.ending.bpm || 96);   // the ending's tempo: each cue lands on a beat of its song
  const cues = X.kind === 'a' ? [[4, 'static'], [6, 'powerup'], [9, 'sting']] : [[6, 'drumroll'], [8, 'click'], [9, 'click'], [10, 'click'], [11, 'click'], [12, 'click'], [13, 'boo'], [14, 'lose']];
  for (const [beats, sfx] of cues) { if (!X.beats) X.beats = {}; if (!X.beats[beats] && X.t >= beats * beat) { X.beats[beats] = 1; MT.sfx(sfx); } }
  const cs = MT.run ? MT.run.players.map(p => p.c).filter(Boolean) : [];
  cs.forEach((c, i) => {
    if (!c.rig) c.rig = MT.lookRig(c.slot);
    const pose = X.kind === 'a' ? 'cheer' : (X.t < 6 ? 'point' : 'cheer');
    c.rig.update(dt, { x: MT.endX(i, cs.length), y: 130, z: 0, vx: 0, vy: 0, facing: X.kind === 'a' ? -Math.PI / 2 : -Math.PI / 2, pose, expr: 'smile' });
  });
  if (X.kind === 'a' && X.t > 5) {
    if (!X.lanceRig) X.lanceRig = new E.Humanoid(MT.LANCE_LOOK);
    X.lanceRig.update(dt, { x: 262, y: 84, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: X.t < 9 ? 'wince' : 'smile', pose: X.t < 9 ? undefined : 'wave' });
  }
};
MT.drawEnding = (r, X) => {
  const lightsOut = X.kind === 'b' ? Math.min(1, Math.max(0, (X.t - 6) / 7)) : 0;
  r.sky(X.kind === 'a' ? ['#140a34', '#3a1c66'] : ['#080410', '#1a0a14']);
  // the contestants, under the spotlight
  const cs = MT.run ? MT.run.players.map(p => p.c).filter(Boolean) : [];
  if (X.kind === 'b') r.queue(184, 188, 0, g => r.box(g, 170, 180, 0, 198, 196, 14, '#7a1010', '#4a0808'));
  if (X.kind === 'b') r.overlay(g => E.font.text(g, 'OFF', r.W / 2, r.H * .68, '#ffffff', { scale: 2, align: 'center', shadow: '#000' }));
  cs.forEach((c, i) => { const x = MT.endX(i, cs.length); if (!c.rig) return; r.shadow(x, 130, 6, .35, undefined, 0); r.actor(x, 130, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { outline: true }); });
  if (X.kind === 'a' && X.t > 5 && X.lanceRig) {
    const glitch = X.t < 9 && Math.floor(X.t * 20) % 3 === 0;
    if (!glitch) r.actor(262, 84, 0, (g, ox, oy) => X.lanceRig.draw(g, ox, oy, r.view), { outline: true });
    if (X.t < 9) r.overlay(g => E.font.text(g, 'REBOOTING...', r.W - 90, 40, '#2ee6ff', { scale: 1, shadow: '#000' }));
  }
  if (lightsOut > 0) r.overlay(g => px.rect(g, 0, 0, r.bw, r.bh, 'rgba(0,0,0,' + (lightsOut * .9).toFixed(2) + ')'));
  r.overlay(g => E.font.title(g, X.kind === 'a' ? 'THE SEASON SURVIVED' : 'MASH TV, CANCELLED', r.W / 2, 16, { scale: 2, align: 'center', colors: X.kind === 'a' ? ['#ffcc33', '#ff2e88'] : ['#ff3344', '#ffffff'] }));
};
// the endings as the flow runs them: the staged scene, then the end card
MT.endingA = function* (G, run) {
  yield* MT.stage('a');
  yield* MT.cardWait('MASH TV WILL RETURN.', 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM', '', 4.2);
};
MT.endingB = function* (G, run) {
  yield* MT.stage('b');
  yield* MT.cardWait('MASH TV - CANCELLED.', 'THANKS FOR WATCHING.', 'CHANNEL 3,000: TONIGHT: MASHED POTATOES!', 4.2);
};

/* ---- 99-main.js ---- */
/* MASH TV — 99-main: the engine game, its settings and pause menu, the scenes, the sound and sprites set up once, the idle
 * clock, deep links for checks and screenshots, and the debug handle. The IIFE closes here. */

MT.G = null;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], bg: '#07060d',
  menu: { controls: MT.CONTROL_NAMES, quit: 'title', items: [
    ['Dev mode', () => MT.openDev && MT.openDev()],
    ['Episode map', () => MT.openMap && MT.openMap()],
    ['How to play', () => MT.openHowTo && MT.openHowTo()]] } });
MT.G = game;
// settings: ours, beside the engine's standard ones (saved per game by the engine)
game.settings.define({ key: 'aimAssist', group: 'Mash TV', label: 'Aim assist (controller)', type: 'toggle', value: true, help: 'The aim nudges toward an enemy in front' });
game.settings.define({ key: 'autoFire', group: 'Mash TV', label: 'Auto-fire with the right stick', type: 'toggle', value: true, help: 'Fire while the right stick is pushed' });
game.settings.define({ key: 'camView', group: 'Mash TV', label: 'Camera', options: [['studio', 'Studio'], ['overhead', 'Overhead']], value: 'studio', help: 'Studio: a high three-quarter view. Overhead: from above', apply: (g, v) => { if (g.sceneName === 'play') g.setView(v === 'overhead' ? 'topdown' : 'threequarter'); } });
game.settings.define({ key: 'subtitles', group: 'Mash TV', label: 'Subtitles', type: 'toggle', value: true, help: 'The lower third under the show' });
game.settings.define({ key: 'chatter', group: 'Mash TV', label: 'Host chatter', options: [['normal', 'Normal'], ['less', 'Less'], ['off', 'Off']], value: 'normal', help: 'How often the host talks' });
game.settings.define({ key: 'confetti', group: 'Mash TV', label: 'Confetti amount', options: [['party', 'Party'], ['tasteful', 'Tasteful']], value: 'party', help: 'How much confetti flies' });
// the engine's button symbols: PlayStation by default, Xbox (A B X Y) on request
game.lights.enabled = false;

// sound and sprites, made once
for (const k in MT.SFX) game.audio.define(k, MT.SFX[k]);
MT.initSprites();
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10, demo: 1e9, scores: 6, lives: 3 });

// the idle clock and the any-input listeners (keyboard, mouse, touch, pads polled each step)
if (typeof window !== 'undefined' && window.addEventListener) {
  const note = (k) => () => MT.noteInput(k);
  window.addEventListener('keydown', e => { MT.keyedAt = game.time; MT.noteInput('keyboard'); });
  window.addEventListener('mousedown', note('mouse'));
  window.addEventListener('wheel', note('mouse'));
  window.addEventListener('touchstart', note('touch'), { passive: true });
  window.addEventListener('gamepadbuttondown', note('gamepad'));
  window.addEventListener('mousemove', e => { if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 8) MT.noteInput('mouse'); });
}
E.HOOKS.step.push((g, dt) => { if (g.sceneName !== 'play') MT.pollPads(); });

// the scene switcher and the flow's end: a game in progress returns to the title on quit
const inHub = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);   // a session opens straight into the round
game.start({ scenes: MT.scenes, scene: inHub ? 'hubwait' : 'title', fade: 0 });
MT.G = game;

MT.World = World; MT.Contestant = Contestant; MT.Enemy = Enemy; MT.Boss = Boss;   // the classes, for the tests and the tools
// deep links (#room=1-1, #boss=1, #dev, #card, #lobby …) for checks and screenshots: read once at boot
MT.deepLink = () => {
  if (typeof location === 'undefined') return;
  const h = (location.hash || '').replace(/^#/, ''); if (!h) return;
  const [k, v] = h.split('='); const seed = +(new URLSearchParams(location.search || '').get('seed') || 7);
  const go = (scene, d) => game.go(scene, d, { fade: 0 });
  if (k === 'title') go('title');
  else if (k === 'lobby') go('lobby');
  else if (k === 'howto') go('howto', { page: 0 });
  else if (k === 'scores') go('scores');
  else if (k === 'about') go('about', { page: 0 });
  else if (k === 'attract') go('attract');
  else if (k === 'room' || k === 'boss' || k === 'greenroom') MT.quickRoom(game, k === 'room' ? v : k === 'boss' ? MT.bossRoom(+v || 1) : 'greenroom', seed);
  else if (k === 'gameover') go('gameover');
};
// an in-scene room start for tests and screenshots: one bot-free contestant, the room loaded at once
MT.quickRoom = (G, roomId, seed = 7) => {
  MT.seedAll(seed);
  const run = MT.startRun({ mode: 'test', diff: 'contestant', slots: [0], seed });
  run.players = [{ slot: 0, input: G.input, c: null }];
  run.ep = MT.ROOMS[roomId].ep || 1;
  G.go('play', { run, startEp: run.ep, cold: false, skipCold: true, room: roomId }, { fade: 0 });
  MT.overrideStart = roomId;
};

// the debug handle for tests and tools: the state of the run and the room
game.debug = {
  snapshot() {
    const W = MT.PLAY.W, run = MT.run;
    return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: W && W.id, phase: W && W.phase, wave: W && W.waveIdx,
      alive: W && W.aliveCounted, enemies: W && W.enemies.filter(e => e.alive).length, bullets: W && W.pShots.length + (W.fShots ? W.fShots.length : 0),
      pickups: W && W.pickups.length, R: run && Math.round(run.ratings.R), keys: run && run.keys,
      players: W ? W.players.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.weapon.id, state: c.state })) : [],
      boss: W && W.boss && { kind: W.boss.kind, alive: W.boss.alive, stance: W.boss.stance, parts: W.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) },
      bossOver: W && !!W.bossOver, errors: game.errors.length };
  },
  tune: (k, v) => MT.setTune(k, v), resetTunes: () => MT.resetTunes(),
  quickRoom: (room, seed) => MT.quickRoom(game, room, seed)
};
game.stateHash = () => JSON.stringify(game.debug.snapshot());
MT.deepLink();
})();
