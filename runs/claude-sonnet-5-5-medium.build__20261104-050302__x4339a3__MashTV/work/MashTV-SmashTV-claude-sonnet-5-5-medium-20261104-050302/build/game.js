
// ===== 00-core.js =====
// MASH TV: core. Opens the one IIFE that 90-main closes.
(() => {
'use strict';
const E = My3D2dge;
const MT = (typeof window !== 'undefined' ? window : globalThis).MT = { E, VERSION: '1.0.0', cfg: { skipRigs: false }, BUILD: '2026-11-04T13:05:02.461Z' };

// ---- arena geometry -------------------------------------------------------------------------------------------
const AW = 368, AH = 240, CX = 184, CY = 120;
const DOORS = { N: { x: 184, y: 8, dx: 0, dy: -1, opp: 'S', cells: [[10, 0], [11, 0], [12, 0]] },
  S: { x: 184, y: 232, dx: 0, dy: 1, opp: 'N', cells: [[10, 14], [11, 14], [12, 14]] },
  W: { x: 8, y: 120, dx: -1, dy: 0, opp: 'E', cells: [[0, 6], [0, 7], [0, 8]] },
  E: { x: 360, y: 120, dx: 1, dy: 0, opp: 'W', cells: [[22, 6], [22, 7], [22, 8]] } };
const cellXY = (cx, cy) => [24 + cx * 16, 24 + cy * 16];
Object.assign(MT, { AW, AH, CX, CY, DOORS, cellXY });

MT.mem = {};
MT.sget = (k, f) => { let v; try { v = E.store.get(k, undefined); } catch (e) { v = undefined; } return v !== undefined && v !== null ? v : (MT.mem[k] !== undefined ? MT.mem[k] : f); };
MT.sset = (k, v) => { MT.mem[k] = v; try { E.store.set(k, v); } catch (e) { /* blocked */ } };
// ---- tuning registry ------------------------------------------------------------------------------------------
// key: [default, min, max, step, label, group]
const TDEF = {
  playerSpeed: [95, 50, 160, 5, 'Player speed', 'PLAYER'], fireRate: [9, 3, 20, 1, 'Blaster shots / s', 'PLAYER'],
  bulletSpeed: [330, 150, 600, 10, 'Player bullet speed', 'PLAYER'], dmgMul: [1, .25, 4, .25, 'Player damage x', 'PLAYER'],
  slideSpeed: [235, 120, 400, 5, 'Slide speed', 'PLAYER'], slideCooldown: [.85, .2, 3, .05, 'Slide cooldown (s)', 'PLAYER'],
  invulnTime: [1.2, .2, 3, .1, 'I-frames after a hit (s)', 'PLAYER'], hpPerLife: [0, 0, 9, 1, 'HP per life (0 = auto)', 'PLAYER'],
  startLives: [0, 0, 9, 1, 'Start lives (0 = auto)', 'PLAYER'], puDuration: [1, .25, 3, .25, 'Power-up time x', 'PLAYER'],
  enemySpeed: [1, .25, 2.5, .05, 'Enemy speed x', 'ENEMIES'], enemyHp: [1, .25, 4, .25, 'Enemy HP x', 'ENEMIES'],
  enemyBulletSpeed: [1, .25, 2.5, .05, 'Enemy bullet speed x', 'ENEMIES'], contactDmg: [1, 0, 3, 1, 'Contact damage', 'ENEMIES'],
  waveSize: [1, .25, 3, .05, 'Wave size x', 'ENEMIES'], spawnGap: [1, .25, 3, .05, 'Spawn gap x', 'ENEMIES'], bossHp: [1, .1, 4, .1, 'Boss HP x', 'ENEMIES'],
  dropMul: [1, 0, 5, .25, 'Drop chance x', 'ECONOMY'], cashMul: [1, .25, 5, .25, 'Cash x', 'ECONOMY'],
  ratingsGain: [1, 0, 5, .25, 'Ratings gain x', 'SHOW'], ratingsDecay: [2.5, 0, 10, .5, 'Ratings decay / s', 'SHOW'], primeTime: [12, 3, 30, 1, 'Prime Time length (s)', 'SHOW'],
  camZoom: [1, .6, 1.6, .05, 'Camera zoom x', 'CAMERA & TIME'], shakeMul: [1, 0, 2, .1, 'Screen shake x', 'CAMERA & TIME'], timeScale: [1, .1, 3, .05, 'Game speed', 'CAMERA & TIME']
};
const T = {}; for (const k in TDEF) T[k] = TDEF[k][0];
const STORE_T = 'mashtv:tuning';
function loadTunes() { const s = MT.sget(STORE_T, null); if (s && typeof s === 'object') for (const k in s) if (k in TDEF && typeof s[k] === 'number') T[k] = Math.min(TDEF[k][2], Math.max(TDEF[k][1], s[k])); }
function saveTunes() { const o = {}; for (const k in TDEF) if (T[k] !== TDEF[k][0]) o[k] = T[k]; MT.sset(STORE_T, o); }
function setTune(k, v) { const d = TDEF[k]; if (!d) return; T[k] = Math.round(Math.min(d[2], Math.max(d[1], v)) / (d[3] / 10)) * (d[3] / 10); T[k] = +T[k].toFixed(3); saveTunes(); if (MT.game && k === 'timeScale') MT.game.timeScale = T[k]; }
function resetTune(k) { setTune(k, TDEF[k][0]); }
function resetTunes() { for (const k in TDEF) T[k] = TDEF[k][0]; saveTunes(); if (MT.game) MT.game.timeScale = 1; }
function tuneTouched() { for (const k in TDEF) if (T[k] !== TDEF[k][0]) return true; return false; }
function tuneDiff() { const o = {}; for (const k in TDEF) if (T[k] !== TDEF[k][0]) o[k] = T[k]; return o; }
Object.assign(MT, { TDEF, T, setTune, resetTune, resetTunes, loadTunes, tuneTouched, tuneDiff });

// ---- seeded streams ---------------------------------------------------------------------------------------------
MT.rng = {};
MT.seedAll = function (seed) {
  seed = (seed | 0) || 1; MT.seed = seed;
  MT.rng.spawn = E.rng(seed * 7 + 1); MT.rng.drops = E.rng(seed * 13 + 5); MT.rng.ai = E.rng(seed * 31 + 9); MT.rng.fx = E.rng(seed * 57 + 3);
};
MT.seedAll(1);
const fxr = () => Math.random();   // cosmetics only
const R = { ai: () => MT.rng.ai(), spawn: () => MT.rng.spawn(), drops: () => MT.rng.drops() };
const rr = (s, a, b) => a + R[s]() * (b - a);
const pickOf = (s, list) => list[Math.floor(R[s]() * list.length) % list.length];
Object.assign(MT, { fxr, R, rr, pickOf });

// ---- event bus --------------------------------------------------------------------------------------------------
const bus = {};
MT.on = (n, f) => { (bus[n] = bus[n] || []).push(f); return () => { bus[n] = bus[n].filter(x => x !== f); }; };
MT.emit = (n, ...a) => { for (const f of (bus[n] || []).slice()) f(...a); };

// ---- small helpers ----------------------------------------------------------------------------------------------
const clamp = E.clamp, hyp = Math.hypot, TAU = Math.PI * 2;
const fmt$ = n => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist = (a, b) => hyp(a.x - b.x, a.y - b.y);
const norm = (x, y) => { const l = hyp(x, y) || 1; return [x / l, y / l]; };
const lerpA = (a, b, t) => a + E.angDiff(a, b) * t;
const plural = (n, s) => n + ' ' + s + (n === 1 ? '' : 'S');
const mix = (c1, c2, t) => E.mix ? E.mix(c1, c2, t) : c1;
Object.assign(MT, { clamp, hyp, TAU, fmt$, angTo, dist, norm, lerpA, plural });
MT.PCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
MT.PNAMES = ['ROCKET', 'VOLT', 'MOXIE', 'GOLDIE'];
MT.hasDOM = typeof document !== 'undefined' && typeof document.createElement === 'function' && !!(typeof window !== 'undefined' && window.document);

MT.ABOUT = {"sourceInformation":{"date":"2026-11-04 05:03:02","source":"Smash TV (Williams Electronics arcade game, 1990)","plan":"PLAN.md","genre":"Twin-stick arena shooter (arcade), with co-op for 1-4 players and a route choice between rooms","perspective":"Fixed single-screen arena seen from a high three-quarter studio camera (a top-down camera is a Settings option)","tech":"my-3D2dge v0.85.2 full edition (4 small patches: HOOKS export, PlayStation/Xbox glyph setting, Arcade input per player, audio bus getter); AI Hub client aihub-session 1.4.0 inlined unmodified; plain JavaScript in one IIFE; Node v24.22.1 and Playwright 1.63.0 for the tests","artDirection":"A retro-future TV studio on the engine's native PS1-style look: HD Humanoid rigs, textured tile floors, neon, chrome, marquee bulbs, confetti instead of gore, canvas lighting on every scene, and new string sprites, painters and set dressing for every enemy, boss and prop","animation":"The engine's rig and pose system (gait, point, roll, hurt, die, cheer, hips, wave, bash and throw moves) plus new motion: the mime in a box, the brute's stomp and stun wobble, hop squash on the clapbots, the wheel's eased spin with pointer clicks, boss arm recoil and tread scroll, the Starmaker's mic-drop slam and the Network's channel flips","audio":"Everything is synthesized in code with the Web Audio API through the engine's audio bus: 8 original songs with layers (generated from seeded melodies and hand-written motifs), about 90 sound effects, Animalese-style formant voices for Lance, Penny, the Announcer, the Network and Mashy, and a synthesized crowd. No audio files.","online":"AI Hub Session Protocol v1, shared-world mode, 1-4 players (host, client and server copies; the Lightning Round); local co-op for 1-4 on one screen; no other network use","testing":"Headless only, no subagents: scripted suites on game.advance and game.debug (core, input, contestant, weapons, economy, ratings, enemies, rooms, a sweep of every room with god-mode bots, all three bosses, a scripted full playthrough with the Green Room ending, a losing run through CONTINUE and Game Over, UI, dev mode, attract mode, touch-only, audio, determinism), a fake-hub netcode loopback (latency, jitter, loss, rate limit, a server copy), the real AI Hub harness in 4 scenarios, and a Playwright browser pass with screenshots","research":"none: written from general knowledge of Smash TV (1990); every name, line, level, enemy, boss and tune is original","environment":"Claude Code CLI (headless); Linux (WSL2); browser unknown (tested in Playwright Chromium 1243 with SwiftShader)","model":"Anthropic, claude-sonnet-5-5, reasoning effort medium","usage":"unknown"},"testingFeedback":["About 12 real issues: the game failed to load at first (a module used the World class before it existed), the map card froze the second time it appeared (scene objects are shared, so a 'left' flag stayed set), the Green Room crashed on the first prize (no prize table for episode 4), room 2-2 had no key (the belt rule was never written), player names showed 'undefined' (an undefined option overwrote the default), the attract mode took a fade to exit, a layer warning on boss songs, storage not persisting headless, plus several test-setup slips and some HUD overlaps that screenshots showed.","3 critical or game-breaking: the load-order crash, the frozen map card (it would have stopped every run after room 2), and the Green Room prize crash.","The scripted whole-game playthrough with two god-mode bots, together with the all-rooms sweep: they walk every scene in order and found the stuck card and the crashes in minutes. The fake-hub loopback and then the real AI Hub harness were next, because the netcode had to be right the first time.","The pixel-variance 'draws a real frame' checks and the exact-number unit checks (fire rate within a margin, slide distance): they passed from the start and never caught anything the playthrough did not. Balance by bot also taught little: the bot clears rooms in 17-28 s, well under the 50-90 s target, because it aims perfectly."],"engineFeedback":["The Humanoid rigs: dressed, posed and lit they look like a PS1 game with almost no art work, and every attack comes with a usable move (bash, throw). Also headless game.advance with exact steps, which made a scripted playthrough and a netcode loopback possible, and the standard pause menu, settings and Controls screen that came for free.","Yes, several times: Input.use() clears held keys, so switching the preset in the step a key goes down drops it; scene objects are reused, so state set in enter() leaks between visits; game.go() fades, so the scene changes a few steps later; game.after() timers die on a scene change; E.store does not persist headless; the 5x7 font has no middle dot or PlayStation symbols; Bullets.hit needs the team name you gave it.","The whole shared-world netcode (snapshots, interpolation, claims, client prediction for the own contestant), the UI kit with bulb-framed focus lists and glyph icons for PlayStation, Xbox, keys and mouse, the Babble formant voices and the song generator, the three-boss framework, the wave/room data format, the bot, dev mode and the attract director.","Keeping one fixed arena readable at any screen shape: fitting the zoom to the walls while tall bosses and the HUD need room above them, and keeping arrows as 'aim' in play but 'navigate' in menus on the same device, which needs a hook that swaps presets every step.","Four small patches in engine/PATCHES.md: P1 exports HOOKS so the input preset can be swapped each step; P2 makes the button-symbol setting default to PlayStation with an Xbox option applied to every player; P3 lets E.Arcade take initials from a chosen player's input and take the CONTINUE press from any player; P4 exposes the audio effects bus so voices obey volume and mute.","Per-player input presets that switch without clear(), with menu navigation as a separate layer. Keys held across a preset change are lost, and an arrow cannot be 'aim' for the game and 'move' for the menu without a hook."],"promptFeedback":["The plan was a real blueprint: exact numbers for every weapon, enemy and room, a file layout, a message table for the netcode, a milestone order that put the risky netcode early, and a test table that said what each suite must prove. Having the names of engine APIs already checked saved a lot of guessing.","A few small clashes: Mashy's body armor is given two ways, the jumbotron is world-space in one section and a HUD element in another, 'the first player into an exit picks it' versus a team route, and the plan lists 18 hand-written rooms next to a 'medium effort' budget. TASK.md and PLAN.md agree on the big things.","Breadth. Three multi-phase bosses, nine enemy types, 18 rooms, four input devices, local co-op, a shared-world netcode that must pass a strict harness, a dev mode, an attract mode, and 10-foot UI, all checked only with headless tools and a few screenshots.","Mark which parts are must-have and which are polish, so the work can be cut by priority instead of by running out. Add the known engine gotchas (presets clearing held keys, scene reuse, store headless). Provide skeleton test files and the fake hub, since every builder writes them again."],"aiHub":{"name":"MASH TV","tagline":"Mash 'em! Cash 'em! Survive the show.","description":"A 1-4 player twin-stick arena shooter inside the deadliest game show on TV: blast through studio rooms of goons and robots, grab cash and absurd prizes, keep the ratings up and survive to the Season Finale.","type":"Game","genre":"Shooter","source":"Smash TV","series":"","players":"1–4","controls":"WASD/left stick move · mouse/right stick aim & fire · Space/L2 slide · E/R1 Showstopper · Q/L1 Showboat","tags":["arcade","co-op","top-down","pixel art","comedy","boss fights"]}};

// ===== 01-input.js =====
// MASH TV: input presets, the preset-sync hook (P1), contestant intent, idle detection, touch-only detection.
const MASH_MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM'] };
const MASH_PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.MENU = MASH_MENU; MT.PLAY = MASH_PLAY;
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)', aimDown: 'Fire down (keyboard)',
  aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

MT.overlay = { open: 0 };           // >0 while one of our overlays is up (dev panel, session overlay, map): inputs use the menu preset
MT.wantPlayPreset = () => !!(MT.game && MT.game.sceneName === 'play' && !MT.game.paused && !MT.overlay.open);

MT.installInputHook = function (game) {
  E.HOOKS.input.push(g => {
    if (g !== game) return;
    const want = MT.wantPlayPreset() ? MASH_PLAY : MASH_MENU;
    for (const p of g.players) if (p.preset !== want) p.use(want);
  });
};

// ---- idle (any input on any device) -------------------------------------------------------------------------------
const idle = MT.idle = { t: 0, flag: false, mx: null, my: null, padSeen: false };
idle.poke = () => { idle.flag = true; };
idle.hook = function () {
  if (!MT.hasDOM) return;
  const on = (t, n, f) => t.addEventListener(n, f, { passive: true, capture: true });
  on(window, 'keydown', () => { idle.flag = true; MT.keyEver = true; touchLift(); });
  on(window, 'mousedown', () => { idle.flag = true; });
  on(window, 'pointerdown', e => { idle.flag = true; if (e.pointerType === 'touch') idle.touched = true; });
  on(window, 'wheel', e => { idle.flag = true; MT.wheel = (MT.wheel || 0) + (e.deltaY || 0); });
  on(window, 'touchstart', () => { idle.flag = true; });
  on(window, 'mousemove', e => { if (idle.mx === null) { idle.mx = e.clientX; idle.my = e.clientY; return; } if (Math.hypot(e.clientX - idle.mx, e.clientY - idle.my) > 8) { idle.flag = true; idle.mx = e.clientX; idle.my = e.clientY; } });
  on(window, 'gamepadconnected', () => { idle.flag = true; MT.padEver = true; touchLift(); });
};
function touchLift() { if (MT.touchOnly) { MT.touchOnly = false; MT.emit('touchlift'); } }
// poll gamepads (buttons / sticks past .5) + the engine's own pressed flags; returns true if any input happened this step
idle.step = function (game, dt) {
  let any = idle.flag; idle.flag = false;
  for (const p of game.players) if (p.anyPressed && p.anyPressed()) { any = true; MT.lastIn = p; }
  if (MT.hasDOM && navigator.getGamepads) {
    try { for (const p of navigator.getGamepads()) if (p && p.connected) { MT.padEver = true; if (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .5)) { any = true; touchLift(); } } } catch (e) { /* blocked */ }
  }
  if (any) idle.t = 0; else idle.t += dt;
  return any;
};
// touch-only: coarse pointer, no fine pointer, no pad, no key yet
MT.detectTouchOnly = function () {
  if (!MT.hasDOM) return false;
  let fine = true; try { fine = matchMedia('(any-pointer: fine)').matches; } catch (e) { /* */ }
  return (navigator.maxTouchPoints > 0) && !fine && !MT.padEver && !MT.keyEver;
};

// ---- intent -----------------------------------------------------------------------------------------------------------
// input -> { move:[gx,gy], aim: angle|null, fire, slide, bomb, showboat, mouse }
MT.intentFrom = function (input, c, world) {
  const game = MT.game, I = input, out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: '' };
  const m = I.move(); if (m[0] || m[1]) out.move = game.view.screenDirToGround(m[0], m[1]);
  const L = Math.hypot(out.move[0], out.move[1]); if (L > 1) { out.move[0] /= L; out.move[1] /= L; }
  const pa = I.padAim;
  if (pa && Math.hypot(pa[0], pa[1]) > .35) {
    const d = game.view.screenDirToGround(pa[0], pa[1]); out.aim = Math.atan2(d[1], d[0]); out.fire = !!game.settings.autoFire || I.down('fire'); out.aimSrc = 'pad';
  } else {
    const ax = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), ay = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (ax || ay) { const d = game.view.screenDirToGround(ax, ay); out.aim = Math.atan2(d[1], d[0]); out.fire = true; out.aimSrc = 'keys'; }
    else if (I.lastDevice === 'mouse' || (I.mouse && I.mouse.active && I.clock - I.mouse.t < 2 && I.lastDevice !== 'gamepad')) {
      const g = (I === game.input) ? game.mouseGround() : null;
      if (g && c) { out.aim = Math.atan2(g[1] - c.y, g[0] - c.x); out.aimSrc = 'mouse'; out.mouseAt = g; }
      out.fire = I.down('fire');
    } else if (I.down('fire')) out.fire = true;
  }
  if (out.aim !== null && out.aimSrc === 'pad' && game.settings.aimAssist && world) out.aim = MT.aimAssist(world, c, out.aim);
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
};
MT.aimAssist = function (world, c, aim) {
  let best = null, bd = 170;
  for (const e of world.enemies) { if (!e.alive || e.noTarget) continue; const d = MT.dist(c, e); if (d > bd) continue; const da = Math.abs(E.angDiff(aim, MT.angTo(c, e))); if (da < .175) { best = e; bd = d; } }
  return best ? aim + E.angDiff(aim, MT.angTo(c, best)) * .5 : aim;
};

// ===== 02-glyphs.js =====
// MASH TV: button glyph icons and prompts (the 5x7 font has no X O [] /\ symbols).
const PADCODE = { confirm: 'Pad0', select: 'Pad0', cancel: 'Pad1', back: 'Pad1', slide: 'Pad6', bomb: 'Pad5', showboat: 'Pad4', fire: 'Pad7',
  pause: 'Pad9', start: 'Pad9', join: 'Pad9', tabL: 'Pad4', tabR: 'Pad5', reset: 'Pad3', more: 'Pad3', ready: 'Pad0', skip: 'Pad0', move: 'StickL', aim: 'StickR', dpad: 'Pad12', pgL: 'Pad14', pgR: 'Pad15' };
const KEYCODE = { confirm: 'Enter', select: 'Enter', cancel: 'Esc', back: 'Esc', slide: 'Space', bomb: 'E', showboat: 'Q', fire: 'Mouse0',
  pause: 'Esc', start: 'Enter', join: 'Enter', tabL: 'Q', tabR: 'E', reset: 'R', more: 'M', ready: 'Enter', skip: 'Enter', move: 'WASD', aim: 'Mouse', dpad: 'Arrows', pgL: 'Left', pgR: 'Right' };
const PS = { Pad0: ['x', '#7aa8ff'], Pad1: ['o', '#ff6a6a'], Pad2: ['s', '#ff8ad8'], Pad3: ['t', '#5fe0a0'] };
const XB = { Pad0: ['A', '#4ccf6a'], Pad1: ['B', '#ff5a5a'], Pad2: ['X', '#5a9aff'], Pad3: ['Y', '#ffd23a'] };
const PSN = { Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CRE', Pad9: 'OPT', Pad10: 'L3', Pad11: 'R3' };
const XBN = { Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU', Pad10: 'LS', Pad11: 'RS' };
const MT_glyph = MT.glyph = {};
function device(input) { const d = input ? input.lastDevice : 'keyboard'; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'key'; }
function family(input) { return (input && input.padStyle ? input.padStyle() : 'playstation') === 'xbox' ? 'xbox' : 'playstation'; }
MT_glyph.family = family;
// what to show for logical prompt id on this input: { kind: 'pad'|'key'|'mouse', code }
MT_glyph.resolve = function (id, input) {
  const d = device(input), bind = input && input.bindings && input.bindings[id];
  if (d === 'pad') { const c = (bind && bind.pad && bind.pad[0]) || PADCODE[id] || id; return { kind: 'pad', code: c }; }
  let k = (bind && bind.keys && bind.keys[0]) || KEYCODE[id] || id;
  if (d === 'mouse' || k.startsWith('Mouse')) { if (id === 'fire') return { kind: 'mouse', code: 'Mouse0' }; if (id === 'bomb' && d === 'mouse') return { kind: 'mouse', code: 'Mouse2' }; if (id === 'aim') return { kind: 'mouse', code: 'Mouse' }; }
  if (/^Key[A-Z]$/.test(k)) k = k.slice(3); if (k === 'ShiftLeft') k = 'Shift'; if (k === 'Escape') k = 'Esc';
  return { kind: 'key', code: k };
};
const dark = '#140a24';
function discBg(g, x, y, c) { E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 4, c || '#2a1446'); }
function drawPadCode(g, x, y, code, fam) {
  const t = (fam === 'xbox' ? XB : PS)[code];
  if (t) {
    E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 4, '#2a1446');
    if (fam === 'xbox') E.font.text(g, t[0], x + 5, y + 1, t[1], { align: 'center', outline: false });
    else {
      const c = t[1], X = x + 5, Y = y + 5;
      if (t[0] === 'x') { E.px.line(g, X - 2, Y - 2, X + 2, Y + 2, c, 1); E.px.line(g, X - 2, Y + 2, X + 2, Y - 2, c, 1); E.px.line(g, X - 2, Y - 1, X + 1, Y + 2, c, 1); E.px.line(g, X - 1, Y - 2, X + 2, Y + 1, c, 1); }
      else if (t[0] === 'o') { E.px.disc(g, X, Y, 3, c); E.px.disc(g, X, Y, 1.4, '#2a1446'); }
      else if (t[0] === 's') { E.px.rect(g, X - 2, Y - 2, 5, 5, c); E.px.rect(g, X - 1, Y - 1, 3, 3, '#2a1446'); }
      else { E.px.poly(g, [[X, Y - 3], [X + 3, Y + 2], [X - 3, Y + 2]], c); E.px.poly(g, [[X, Y - 1], [X + 1.4, Y + 1], [X - 1.4, Y + 1]], '#2a1446'); }
    }
    return 11;
  }
  const nm = (fam === 'xbox' ? XBN : PSN)[code];
  if (nm) { const w = E.font.width(nm) + 5; E.px.rect(g, x, y + 1, w, 9, dark); E.px.rect(g, x + 1, y + 2, w - 2, 7, fam === 'xbox' ? '#3a3a52' : '#34335a'); E.font.text(g, nm, x + w / 2, y + 2, '#fff', { align: 'center', outline: false }); return w; }
  if (code === 'Pad12' || code === 'Pad13' || code === 'Pad14' || code === 'Pad15') { discBg(g, x, y); E.px.rect(g, x + 4, y + 2, 3, 7, '#e8e8f0'); E.px.rect(g, x + 2, y + 4, 7, 3, '#e8e8f0'); return 11; }
  if (code === 'StickL' || code === 'StickR') { E.px.disc(g, x + 5, y + 5, 5, dark); E.px.disc(g, x + 5, y + 5, 3.4, '#8a86b0'); E.px.disc(g, x + 5, y + 5, 1.6, '#34335a'); E.font.text(g, code === 'StickL' ? 'L' : 'R', x + 13, y + 2, '#fff', { outline: false }); return 18; }
  E.px.rect(g, x, y + 1, 11, 9, dark); E.font.text(g, '?', x + 5, y + 2, '#fff', { align: 'center', outline: false }); return 11;
}
function drawKey(g, x, y, label) {
  const w = Math.max(11, E.font.width(label) + 6);
  E.px.rect(g, x, y + 1, w, 10, dark); E.px.rect(g, x + 1, y, w - 2, 9, '#e8e4f4'); E.px.rect(g, x + 1, y + 8, w - 2, 1, '#a8a2c8');
  E.font.text(g, label, x + w / 2, y + 1, '#1a1030', { align: 'center', outline: false }); return w;
}
function drawMouse(g, x, y, code) {
  E.px.rect(g, x, y, 9, 11, dark); E.px.rect(g, x + 1, y + 1, 7, 9, '#d8d4ec'); E.px.rect(g, x + 4, y + 1, 1, 4, dark); E.px.rect(g, x + 1, y + 5, 7, 1, dark);
  if (code === 'Mouse0') E.px.rect(g, x + 1, y + 1, 3, 4, '#ffcc33'); else if (code === 'Mouse2') E.px.rect(g, x + 5, y + 1, 3, 4, '#ffcc33'); else E.px.rect(g, x + 3, y + 3, 3, 3, '#ffcc33');
  return 9;
}
// draw one icon, returns its width
MT_glyph.draw = function (g, x, y, id, input, o = {}) {
  const r = MT_glyph.resolve(id, input);
  if (r.kind === 'pad') return drawPadCode(g, x, y, r.code, family(input));
  if (r.kind === 'mouse') return drawMouse(g, x, y, r.code);
  return drawKey(g, x, y, r.code);
};
MT_glyph.width = function (id, input) {
  const r = MT_glyph.resolve(id, input);
  if (r.kind === 'mouse') return 9; if (r.kind === 'key') return Math.max(11, E.font.width(r.code) + 6);
  const fam = family(input), t = (fam === 'xbox' ? XB : PS)[r.code]; if (t) return 11;
  const nm = (fam === 'xbox' ? XBN : PSN)[r.code]; if (nm) return E.font.width(nm) + 5; return r.code.startsWith('Stick') ? 18 : 11;
};
// a row of icon + label pairs; returns total width. align: 'left' | 'center' | 'right'
MT_glyph.prompt = function (g, x, y, pairs, input, o = {}) {
  let tw = 0; const gap = 9;
  for (const [id, label] of pairs) tw += MT_glyph.width(id, input) + 3 + E.font.width(label) + gap;
  tw -= gap; let px = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  for (const [id, label] of pairs) {
    const w = MT_glyph.draw(g, Math.round(px), y, id, input);
    E.font.text(g, label, Math.round(px + w + 3), y + 2, o.color || '#fff7e8', { shadow: '#000', outline: false });
    px += w + 3 + E.font.width(label) + gap;
  }
  return tw;
};
// the input whose device decides prompts: the one that last pressed anything (any player)
MT.lastInput = function () { return MT.lastIn && MT.game.players.includes(MT.lastIn) ? MT.lastIn : MT.game.input; };

// ===== 03-audio.js =====
// MASH TV: music, sound effects, Babble voices and the crowd: all synthesized in code, no audio files.
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const mname = m => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const SCALES = { maj: [0, 2, 4, 5, 7, 9, 11], min: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], mix: [0, 2, 4, 5, 7, 9, 10] };
const RHY = ['x.x.x.x-x.x.x---', 'x--x--x-x-x-x...', 'x.xx.xx.x.xx.x--', 'x---x---x-x-x---', 'x.x.xx.-x.x.xx.-', 'x-x-x-x-x-x-x-x-', 'x..x..x.x..x.x--', 'xx.xx.xx.xx.x---'];
function lead(seed, root, scale, chords, rhy, oct) {
  const rnd = E.rng(seed), sc = SCALES[scale]; const out = []; let deg = 4;
  for (let b = 0; b < chords.length; b++) {
    const pat = RHY[rhy[b % rhy.length]], cr = chords[b]; let bar = [];
    for (const ch of pat) {
      if (ch === 'x') { const step = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd() * 8)]; deg = Math.max(0, Math.min(12, deg + step)); if (rnd() < .3) { const tones = [0, 2, 4]; deg = Math.round(deg / 7) * 7 + tones[Math.floor(rnd() * 3)] + (chords[b] - root >= 5 ? 0 : 0); deg = Math.max(0, Math.min(13, deg)); } const m = root + (oct || 12) + sc[deg % 7] + 12 * Math.floor(deg / 7) - 12; bar.push(mname(m)); }
      else bar.push(ch === '-' ? '-' : '.');
    }
    out.push(bar.join(' '));
  }
  return out.join(' ');
}
function bassLine(roots, pat, rootMidi) { return roots.map(r => pat.map(c => c === 'x' ? mname(r) : c === 'o' ? mname(r + 12) : c === '5' ? mname(r + 7) : '.').join(' ')).join(' '); }
const rep = (s, n) => Array(n).fill(s).join(' ');
function makeSongs() {
  const S = {};
  // THEME: brassy fanfare, C major, 132 bpm (a developed original motif)
  const L1 = 'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 - G5 - - - E5 - C5 - D5 - - - . . . . A4 . D5 . F5 . A5 - - . F5 . A5 . B5 - A5 - - - F5 - D5 - E5 - - - . . . . C5 . E5 . G5 . C6 - - . G5 . E5 . G5 - F5 - - - A5 - C6 - B5 - A5 - G5 - - - E5 . G5 . C6 . E6 - D6 - C6 - A5 - G5 - C6 - - - - - - - . . . . . . . . ';
  const L2 = 'E5 . G5 . C6 . E6 - - . C6 . E6 . F6 - E6 - - - C6 - G5 - A5 - - - . . . . F5 . A5 . C6 . F6 - - . D6 . F6 . G6 - F6 - - - D6 - B5 - C6 - - - . . . . E6 . D6 . C6 . B5 - A5 . G5 . E5 . G5 - A5 . B5 . C6 . D6 - E6 - D6 - C6 - G5 - - - C6 - - - - - - - . . . . . . . . ';
  S.theme = { bpm: 132, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: L1 + L2 }, { wave: 'pulse', vol: .06, notes: L1.split(' ').map((n, i) => i % 2 ? '.' : n === '-' ? '.' : n).join(' ') + ' ' + L2 }, { wave: 'triangle', vol: .2, notes: [48, 55, 57, 53, 48, 53, 55, 48, 52, 53, 57, 55, 48, 53, 55, 48].map(r => ['x', '.', 'x', '.', 'o', '.', 'x', '.', 'x', '.', 'x', '.', 'o', '.', 'x', '.'].map(c => c === 'x' ? mname(r) : c === 'o' ? mname(r + 12) : '.').join(' ')).join(' ') }, { wave: 'drums', vol: .22, notes: rep('k . h . s . h . k k h . s . h o', 16) }] };
  const bat = (name, o) => {
    const bars = o.chords.length; const lt = lead(o.seed, o.root, o.scale, o.chords.map(c => c), o.rhy, 12), lt2 = lead(o.seed + 7, o.root, o.scale, o.chords, o.rhy.slice().reverse(), 24);
    S[name] = { bpm: o.bpm, steps: 4, tracks: [{ name: 'lead', wave: o.leadWave, vol: .1, notes: lt }, { name: 'bass', wave: 'triangle', vol: .24, notes: bassLine(o.chords, o.bass) }, { name: 'drums', wave: 'drums', vol: .22, notes: rep(o.drums, bars) },
      { name: 'prime', wave: 'saw', vol: .1, on: false, notes: o.chords.map(c => ['x', '.', '.', 'x', '.', '.', 'x', '.', 'x', '.', '.', 'x', '.', '.', 'x', '.'].map(q => q === 'x' ? mname(c + 24) : '.').join(' ')).join(' ') },
      { name: 'intense', wave: 'drums', vol: .16, on: false, notes: rep('h h h h h h h h h h h h h h h h', bars).replace(/h/g, (m, i) => (i % 4 === 2 ? 't' : 'h')) },
      { name: 'arp', wave: 'pulse', vol: .05, notes: lt2 }] };
  };
  bat('studioBattle', { bpm: 150, root: 57, scale: 'min', chords: [45, 45, 53, 52, 45, 48, 50, 52], seed: 11, rhy: [0, 2, 4, 6], leadWave: 'square', bass: 'x.xo.x.5x.xo.x.x'.split(''), drums: 'k . h . s . h . k k h . s . h o' });
  bat('warehouseFunk', { bpm: 128, root: 55, scale: 'dor', chords: [43, 43, 48, 46, 43, 43, 50, 48], seed: 23, rhy: [1, 3, 0, 5], leadWave: 'pulse', bass: 'x..xo.x.x..xo.5.'.split(''), drums: 'k . h o k . h . k . h o k . h c' });
  bat('finaleOverture', { bpm: 160, root: 52, scale: 'min', chords: [40, 40, 36, 38, 40, 43, 41, 38], seed: 37, rhy: [6, 4, 7, 2], leadWave: 'saw', bass: 'x.x.x.x.xxx.x.o.'.split(''), drums: 'k . . k . . s . k . k . s . t t' });
  S.bossShowdown = { bpm: 170, steps: 4, tracks: [{ name: 'lead', wave: 'saw', vol: .1, notes: lead(51, 50, 'min', [38, 38, 41, 43, 38, 36, 41, 43], [7, 2, 4, 6], 12) }, { name: 'bass', wave: 'triangle', vol: .26, notes: bassLine([38, 38, 41, 43, 38, 36, 41, 43], 'xxoxxoxxxxoxxoxx'.split('')) }, { name: 'drums', wave: 'drums', vol: .24, notes: rep('k . k . s . k k k . k . s . t s', 8) }, { name: 'phase2', wave: 'square', vol: .08, on: false, notes: lead(77, 50, 'min', [38, 38, 41, 43, 38, 36, 41, 43], [0, 5, 7, 1], 24) }] };
  S.commercial = { bpm: 112, steps: 4, tracks: [{ wave: 'square', vol: .12, notes: 'C5 . E5 . G5 . E5 . C5 . G4 . C5 - - - D5 . F5 . A5 . F5 . D5 . A4 . D5 - - - E5 . G5 . B5 . G5 . E5 . B4 . E5 - - - C5 - E5 - G5 - C6 - - - - - . . . .' }, { wave: 'triangle', vol: .2, notes: 'C3 . G3 . C3 . G3 . D3 . A3 . D3 . A3 . E3 . B3 . E3 . B3 . C3 . G3 . C4 - - -' }, { wave: 'drums', vol: .14, notes: rep('k . h . s . h . k . h . s . h h', 4) }] };
  S.recap = { bpm: 100, steps: 4, tracks: [{ wave: 'sine', vol: .16, notes: 'E5 . . G5 . . B5 - - - . . A5 . . G5 . . D5 - - - . . . . E5 . . G5 . . C6 - - - . . B5 . . A5 . . G5 - - - . . . .' }, { wave: 'triangle', vol: .18, notes: 'C3 . . . G3 . . . E3 . . . G3 . . . F3 . . . C4 . . . A3 . . . C4 . . . D3 . . . A3 . . . F3 . . . A3 . . . G3 . . . D4 . . . B3 . . .' }, { wave: 'drums', vol: .1, notes: rep('. . h . s . h . . . h . s . h h', 4) }] };
  S.ending = { bpm: 96, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'C5 . E5 . G5 - - - E5 . G5 . A5 - - - G5 - - - E5 - C5 - D5 - - - - - - - F5 . A5 . C6 - - - A5 . C6 . D6 - - - C6 - - - A5 - F5 - G5 - - - - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 - - - G2 - - - A2 - - - F2 - - - F3 - - - C3 - - - D3 - - - G2 - - -' }, { wave: 'sine', vol: .08, notes: 'E4 - - - D4 - - - C4 - - - C4 - - - A4 - - - G4 - - - F4 - - - D4 - - -' }, { wave: 'drums', vol: .1, notes: rep('k . . . . . h . s . . . . . h .', 4) }] };
  return S;
}
MT.SONGS = makeSongs();
// ---- music director ----
MT.music = {
  cur: null,
  play(id, o = {}) { const g = MT.game; if (!g || !g.audio) return; if (MT.music.cur === id && !o.restart) return; MT.music.cur = id; const s = MT.SONGS[id]; if (!s) return; try { g.audio.music(s, { fade: o.fade === undefined ? .6 : o.fade }); } catch (e) { /* no audio */ } },
  stop(f) { const g = MT.game; MT.music.cur = null; try { g.audio.music(null, { fade: f || .4 }); } catch (e) { /* */ } },
  layer(name, v, fade) { const s = MT.SONGS[MT.music.cur]; if (!s || !s.tracks.some(t => t.name === name)) return; try { MT.game.audio.layer(name, v, fade === undefined ? .3 : fade); } catch (e) { /* */ } },
  intense(on) { if (MT.music._i !== on) { MT.music._i = on; MT.music.layer('intense', on ? 1 : 0, .6); } }
};
// ---- sound effects ----
const V = (wave, freq, to, dur, vol, o) => Object.assign({ wave, freq, to, dur, vol: vol === undefined ? .25 : vol }, o);
const seq = (notes, step, wave, dur, vol, o) => notes.map((n, i) => Object.assign({ wave, freq: n, dur: dur || step * 1.4, vol: vol || .22, delay: i * step }, o));
const noise = (f0, f1, dur, vol, o) => Object.assign({ wave: 'noise', freq: f0, to: f1, dur, vol, filter: 'bandpass', q: 1.2 }, o);
MT.SFX = {
  shot_blaster: V('square', 880, 330, .09, .13), shot_spread: [V('square', 760, 300, .09, .1), V('pulse', 900, 400, .1, .08, { delay: .02 }), V('square', 1000, 450, .09, .06, { delay: .04 })],
  shot_rockets: [noise(900, 200, .35, .2, { filter: 'lowpass' }), V('saw', 220, 90, .3, .12)], shot_popcorn: [V('triangle', 300, 180, .12, .22), V('sine', 150, 90, .15, .2)],
  laser: [V('saw', 120, 130, .15, .08, { vib: [30, .03] }), V('sine', 800, 790, .15, .06)], pop: [noise(1800, 300, .08, .16), V('square', 600, 200, .06, .1)],
  hitE: V('square', 300, 150, .05, .08), boom: [noise(300, 40, .5, .4, { filter: 'lowpass' }), V('sine', 120, 35, .5, .35)], rocketBoom: [noise(400, 50, .6, .45, { filter: 'lowpass' }), V('sine', 110, 30, .6, .4)],
  popcorn: [noise(2000, 900, .06, .18), V('triangle', 500, 700, .08, .14)], baton: noise(800, 300, .08, .1), clap: [noise(2400, 1800, .04, .14), noise(2400, 1800, .04, .1, { delay: .06 })],
  popperPop: [noise(3000, 400, .2, .3), V('square', 900, 120, .15, .14)], fuse: noise(3500, 3000, .5, .08, { filter: 'highpass' }), beep: V('square', 1800, 1800, .07, .1),
  mimeBlast: [noise(500, 80, .3, .3, { filter: 'lowpass' }), V('sine', 200, 60, .3, .3)], pfft: noise(2200, 600, .12, .12), beam: V('saw', 1400, 500, .12, .1), boo: V('saw', 220, 160, .3, .1, { vib: [8, .05] }),
  splat: [noise(500, 150, .15, .22), V('sine', 200, 80, .12, .15)], lens: [V('sine', 2000, 4000, .25, .08), V('triangle', 1200, 2400, .25, .06)], shell: [V('saw', 140, 50, .25, .22), noise(900, 120, .2, .22)],
  roar: [V('saw', 90, 70, .7, .26, { vib: [14, .08] }), noise(400, 200, .7, .12)], stomp: [V('sine', 90, 40, .25, .35), noise(200, 60, .2, .2, { filter: 'lowpass' })], crash: [noise(400, 60, .4, .35, { filter: 'lowpass' }), V('sine', 80, 30, .35, .3)],
  tink: [V('triangle', 2400, 2000, .05, .1), V('square', 3200, 2800, .04, .05)], bossHit: V('square', 220, 90, .08, .14), doorOpen: [V('saw', 200, 400, .35, .12), noise(600, 1200, .35, .1)], doorSlam: [noise(300, 60, .2, .35, { filter: 'lowpass' }), V('sine', 100, 40, .2, .3)],
  pyro: [noise(300, 900, .6, .25), V('saw', 80, 120, .6, .1)], alarm: seq([880, 660, 880, 660], .12, 'square', .1, .14), wheelClick: V('square', 1500, 1200, .025, .12), zip: V('saw', 1200, 300, .4, .1), land: [noise(400, 100, .1, .25, { filter: 'lowpass' }), V('sine', 100, 50, .1, .25)],
  slide: noise(2200, 500, .22, .16), flourish: seq(['C5', 'E5', 'G5', 'C6', 'E6'], .05, 'square', .09, .13), bomb: [noise(4000, 3000, .06, .3, { filter: 'highpass' }), noise(300, 40, .6, .4, { filter: 'lowpass' }), V('sine', 130, 30, .6, .36, { delay: .04 })],
  cash: [V('square', 1568, 1568, .06, .14), V('square', 2093, 2093, .16, .14, { delay: .06 })], coin: V('square', 1300, 1700, .05, .06), buzzer: [V('saw', 130, 120, .22, .22), V('square', 97, 90, .22, .14)],
  death: [V('saw', 400, 70, .8, .22, { vib: [9, .06] })], oneup: seq(['E5', 'G5', 'E6', 'C6', 'D6', 'G6'], .07, 'square', .1, .16), powerup: seq(['C5', 'E5', 'G5', 'C6', 'E6'], .045, 'square', .08, .13), expire: V('square', 500, 300, .06, .1),
  prizeFanfare: seq(['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6', 'G6'], .06, 'square', .12, .15), keyChime: seq(['E6', 'B6', 'E7'], .08, 'sine', .3, .15), primeSting: seq(['C5', 'C5', 'G5', 'C6', 'E6', 'G6', 'C7'], .07, 'saw', .18, .16),
  fanfare: seq(['G5', 'C6', 'E6', 'G6'], .08, 'square', .16, .15), tada: seq(['C5', 'E5', 'G5', 'C6'], .1, 'square', .2, .16).concat(seq(['E6', 'G6'], .1, 'square', .45, .14).map(v => Object.assign(v, { delay: v.delay + .4 }))),
  bossFanfare: seq(['C5', 'G5', 'C6', 'E6', 'G6', 'C7', 'G6', 'C7'], .1, 'saw', .22, .17), bankrupt: seq(['G4', 'F4', 'E4', 'D4', 'C4'], .16, 'saw', .26, .16, { vib: [6, .04] }), jingle: seq(['C5', 'E5', 'G5', 'E5', 'C5', 'G5', 'C6'], .09, 'square', .1, .14),
  glitch: [noise(2000, 200, .5, .2), V('square', 600, 90, .45, .12, { vib: [40, .2] })], channelFlip: noise(3000, 800, .1, .14), partDown: [noise(500, 80, .4, .3, { filter: 'lowpass' }), V('triangle', 300, 60, .3, .2)],
  bossDead: seq(['C4', 'C5', 'G4', 'C5', 'E5', 'G5', 'C6'], .12, 'saw', .24, .18), slam: [noise(300, 40, .4, .4, { filter: 'lowpass' }), V('sine', 100, 28, .4, .4)], hatch: V('triangle', 300, 600, .2, .16),
  mashStart: [V('square', 330, 330, .08, .15), V('square', 440, 440, .08, .15, { delay: .09 }), V('saw', 660, 880, .25, .17, { delay: .18 })], beacon: seq(['E5', 'G5'], .1, 'sine', .12, .12), drumHit: [noise(200, 80, .15, .3, { filter: 'lowpass' }), V('sine', 140, 60, .2, .3)],
  blip: V('square', 700, 700, .035, .08), confirm: [V('sine', 880, 880, .12, .16), V('sine', 1320, 1320, .18, .12, { delay: .05 })], back: V('square', 500, 300, .07, .1), tick: V('square', 1000, 1000, .03, .07), type: V('square', 500, 540, .02, .04),
  cheerSt: seq(['C6', 'E6', 'G6'], .04, 'square', .06, .06)
};
MT.sfxFrame = { n: {}, f: -1 };
MT.sfx = function (name, o) {
  const g = MT.game; if (!g || !g.audio || g.headless) return; const fr = MT.sfxFrame, f = Math.floor(g.real * 60);
  if (fr.f !== f) { fr.f = f; fr.n = {}; } if ((fr.n[name] = (fr.n[name] || 0) + 1) > 3) return;
  if (!g.audio.presets[name] && MT.SFX[name]) g.audio.define(name, MT.SFX[name]);
  try { g.audio.sfx(name, o); } catch (e) { /* no audio */ }
};
MT.audioDuck = function (secs) { const g = MT.game; if (!g || !g.audio || g.headless) return; try { g.audio.duck(true); MT._duckUntil = g.real + secs; } catch (e) { /* */ } };
MT.audioTick = function () { const g = MT.game; if (MT._duckUntil && g.real > MT._duckUntil) { MT._duckUntil = 0; try { g.audio.duck(false); } catch (e) { /* */ } } };
// ---- Babble: formant-synth gibberish voices ----
const VOW = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
const VOICES = {
  lance: { f0: 135, sp: 13, wave: 'sawtooth', fm: 1.0, swoop: 1.3 }, penny: { f0: 300, sp: 12, wave: 'square', fm: 1.18, giggle: 1 }, annc: { f0: 85, sp: 7, wave: 'sawtooth', fm: .85, echo: 1 },
  network: { f0: 70, sp: 8, wave: 'square', fm: .8, crush: 1, mono: 1 }, mashy: { f0: 110, sp: 9, wave: 'triangle', fm: .9, bounce: 1 }, goon: { f0: 95, sp: 10, wave: 'sawtooth', fm: .9 },
  c0: { f0: 160, sp: 12, wave: 'square', fm: 1.05 }, c1: { f0: 190, sp: 12, wave: 'square', fm: 1.05 }, c2: { f0: 215, sp: 12, wave: 'square', fm: 1.05 }, c3: { f0: 240, sp: 12, wave: 'square', fm: 1.05 }
};
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function syllables(word) { const m = word.toLowerCase().match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]+$)?|[^aeiouy]+$/g) || [word]; return m.slice(0, 4); }
function plan(text, vid, o) {
  const v = VOICES[vid] || VOICES.lance, sp = (o && o.speed) || v.sp, out = []; let t = 0; const words = text.split(/\s+/).filter(Boolean);
  const q = text.trim().endsWith('?'), ex = /!/.test(text);
  words.forEach((wd, wi) => {
    const sy = syllables(wd.replace(/[^A-Za-z']/g, '') || 'a'), h = hashStr(wd.toLowerCase());
    sy.forEach((s, si) => {
      const vm = s.toLowerCase().match(/[aeiouy]/), ch = vm ? vm[0] === 'y' ? 'i' : vm[0] : 'a', on = s.toLowerCase()[0], cls = /[bdgkpqtc]/.test(on) ? 'p' : /[fshvzxj]/.test(on) ? 'f' : /[mn]/.test(on) ? 'n' : 'x';
      const dur = (1 / sp) * (.75 + ((h >> (si * 3)) & 7) / 14); const prog = wi / Math.max(1, words.length - 1);
      let cont = 1 + (q ? prog * .4 : -prog * .25) + ((h >> (si + 2)) & 3) * .03 - .04; if (ex && wd.endsWith('!') && si === sy.length - 1) cont *= 1.2; if (v.mono) cont = 1; if (v.swoop && si === 0) cont *= 1 + (wi % 2) * .12;
      out.push({ t, dur, ch, cls, f0: v.f0 * cont * (1 + (((h >> (si * 5)) & 15) - 8) * .005), v });
      t += dur;
    });
    t += /[,]$/.test(wd) ? .08 : /\.\.\.$/.test(wd) ? .3 : /[.!?]$/.test(wd) ? .16 : .02;
  });
  return { out, dur: t + .05 };
}
let _crush = null;
function voiceSyl(ctx, bus, s, t0, vol) {
  const v = s.v, t = t0 + s.t, f1 = VOW[s.ch][0] * v.fm, f2 = VOW[s.ch][1] * v.fm;
  const osc = ctx.createOscillator(); osc.type = v.wave; osc.frequency.setValueAtTime(s.f0, t); osc.frequency.linearRampToValueAtTime(s.f0 * (v.bounce ? 1.12 : 1.03), t + s.dur);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = s.f0 * .02; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + s.dur + .05);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, t + Math.max(.006, s.dur - .03)); g.gain.linearRampToValueAtTime(0, t + s.dur);
  for (const f of [f1, f2]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 8; const og = ctx.createGain(); og.gain.value = f === f1 ? 1.2 : .8; osc.connect(bp); bp.connect(og); og.connect(g); }
  let out = g;
  if (v.crush) { const ws = ctx.createWaveShaper(); if (!_crush) { _crush = new Float32Array(257); for (let i = 0; i < 257; i++) { const x = i / 128 - 1; _crush[i] = Math.round(x * 4) / 4; } } ws.curve = _crush; g.connect(ws); out = ws; }
  out.connect(bus);
  if (v.echo) { const d = ctx.createDelay(1); d.delayTime.value = .18; const fb = ctx.createGain(); fb.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(bus); }
  osc.start(t); osc.stop(t + s.dur + .06);
  if (s.cls !== 'x' && MT.game.audio._noise) { const n = ctx.createBufferSource(); n.buffer = MT.game.audio._noise; const f = ctx.createBiquadFilter(); f.type = s.cls === 'p' ? 'bandpass' : s.cls === 'f' ? 'highpass' : 'lowpass'; f.frequency.value = s.cls === 'p' ? 3000 : s.cls === 'f' ? 5000 : 300; const ng = ctx.createGain(); const nd = s.cls === 'p' ? .015 : s.cls === 'f' ? .05 : .04; ng.gain.setValueAtTime(vol * (s.cls === 'n' ? 1.5 : .5), t); ng.gain.exponentialRampToValueAtTime(.0005, t + nd); n.connect(f); f.connect(ng); ng.connect(bus); n.start(t); n.stop(t + nd + .02); }
}
MT.babble = {
  say(text, vid, o) {
    const p = plan(text || ' ', vid, o), g = MT.game;
    if (vid === 'goon') { MT.babble._g = (MT.babble._g || 0); }
    try {
      if (!g || !g.audio || g.headless || g.audio.muted) return p.dur;
      const au = g.audio; if (!au._init() || !au.ctx || au.ctx.state !== 'running') return p.dur;
      const ctx = au.ctx, bus = au.bus || au._sfxBus, t0 = ctx.currentTime + .03;
      for (const s of p.out) voiceSyl(ctx, bus, s, t0, vid === 'goon' ? .09 : .16);
      if (VOICES[vid] && VOICES[vid].giggle) for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: p.dur + i * .06, dur: .05, ch: 'i', cls: 'x', f0: 700 + i * 120, v: VOICES.penny }, t0, .1);
    } catch (e) { /* audio unavailable */ }
    return p.dur;
  },
  grunt(vid) { if (MT.babble._gc > 2) return; MT.babble._gc = (MT.babble._gc || 0) + 1; MT.babble.say('hup', vid || 'goon'); }
};
// ---- crowd ----
MT.crowd = function (kind, k) {
  const g = MT.game; if (!g || !g.audio || g.headless) return; k = Math.max(.1, Math.min(1, k || .5));
  try {
    const au = g.audio; if (!au._init() || !au.ctx || au.ctx.state !== 'running') return; const ctx = au.ctx, bus = au.bus || au._sfxBus, t0 = ctx.currentTime + .02;
    if (kind === 'cheer') { const n = 4 + Math.round(k * 6); for (let i = 0; i < n; i++) voiceSyl(ctx, bus, { t: Math.random() * .12, dur: .5 + Math.random() * .3, ch: i % 2 ? 'o' : 'a', cls: 'x', f0: (220 + Math.random() * 180) * (1 + k * .2), v: { wave: 'sawtooth', fm: 1 + (Math.random() - .5) * .2 } }, t0, .03 + k * .03); MT.sfx('applause'); }
    else if (kind === 'ooh') { for (let i = 0; i < 5; i++) voiceSyl(ctx, bus, { t: Math.random() * .08, dur: .6, ch: 'u', cls: 'x', f0: 300 - i * 6 + Math.random() * 40, v: { wave: 'triangle', fm: 1 } }, t0, .05 * k + .03); }
    else if (kind === 'laugh') { for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: i * .2 + c * .02, dur: .1, ch: 'a', cls: 'f', f0: 250 + c * 30 - i * 10, v: { wave: 'sawtooth', fm: 1 } }, t0, .04); }
    else if (kind === 'gasp') { voiceSyl(ctx, bus, { t: 0, dur: .3, ch: 'a', cls: 'f', f0: 400, v: { wave: 'triangle', fm: 1 } }, t0, .06); }
    else if (kind === 'boo') { for (let i = 0; i < 4; i++) voiceSyl(ctx, bus, { t: Math.random() * .1, dur: .7, ch: 'u', cls: 'x', f0: 110 + Math.random() * 20, v: { wave: 'sawtooth', fm: .8 } }, t0, .05); }
  } catch (e) { /* */ }
};
MT.SFX.applause = Array.from({ length: 14 }, (_, i) => noise(2600 + (i % 4) * 400, 1800, .05, .09, { delay: i * .09 + (i % 3) * .02, q: .8 }));

// ===== 04-art-sets.js =====
// MASH TV: studio sets (floors, walls, doors, outside dressing, lights) and string sprites.
const H = E.hex, hash = (x, y) => { let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// ---- logo mask (rasterised once from the engine's title font; browsers only) ----
let LOGO = null;
function logoMask() {
  if (LOGO !== null) return LOGO; LOGO = false;
  try {
    if (!MT.hasDOM) return LOGO; const c = document.createElement('canvas'); c.width = 160; c.height = 44; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    E.font.title(g, 'MASH TV', 80, 8, { scale: 4, align: 'center', colors: ['#ffffff', '#ffffff'], outline: false, depth: 0 });
    const d = g.getImageData(0, 0, 160, 44).data; LOGO = { w: 160, h: 44, a: d };
  } catch (e) { LOGO = false; }
  return LOGO;
}
function logoAt(x, y) { const L = logoMask(); if (!L) return 0; const u = Math.floor(x - (CX - 80)), v = Math.floor(y - (CY - 22)); if (u < 0 || v < 0 || u >= L.w || v >= L.h) return 0; return L.a[(v * L.w + u) * 4 + 3] > 120 ? 1 : 0; }
const CX0 = MT.CX, CY0 = MT.CY;
// ---- floors ----
const F_STUDIO = (x, y) => {
  const s = 16, cx = Math.floor(x / s), cy = Math.floor(y / s), lx = x - cx * s, ly = y - cy * s;
  const edge = x < 16 || x > 352 || y < 16 || y > 224;
  let c = H(((cx + cy) & 1) ? '#2a1446' : '#1d0e36');
  const gl = (lx + ly) % 16; if (gl < 3) c = mixc(c, H('#4a2a7a'), .5);
  if (lx < 1 || ly < 1) c = mixc(c, H('#ff2e88'), .35);
  if ((cx === 1 || cx === 21 || cy === 1 || cy === 13) && !edge) { if (lx > 6 && lx < 10 || ly > 6 && ly < 10) c = mixc(c, H('#ffcc33'), .3); }
  if (logoAt(x, y)) c = mixc(H('#ff2e88'), H('#ffcc33'), Math.min(1, Math.max(0, (y - 98) / 44)));
  else if (x > 104 && x < 264 && y > 98 && y < 142 && logoMask()) { const bx = x - 104, by = y - 98; if (bx < 1 || by < 1 || bx > 158 || by > 42) c = mixc(c, H('#ffcc33'), .5); }
  return c;
};
const F_WARE = (x, y) => {
  const n = hash(Math.floor(x / 2), Math.floor(y / 2)); let c = mixc(H('#6e7078'), H('#7e8088'), n);
  const gx = x % 48, gy = y % 48; if (gx < .8 || gy < .8) c = H('#5a5c62');
  if (Math.abs((x % 96) - 48) < 1 && y > 20 && y < 220) c = mixc(c, H('#d8b030'), .75); if (Math.abs((y % 120) - 60) < 1 && x > 20 && x < 350) c = mixc(c, H('#d8b030'), .75);
  if (hash(Math.floor(x / 3), Math.floor(y / 3)) > .965) c = mixc(c, H('#4a4c52'), .5);
  return c;
};
const F_ROOF = (x, y) => {
  const s = 16, cx = Math.floor(x / s), cy = Math.floor(y / s), lx = x - cx * s, ly = y - cy * s; let c = mixc(H('#2a3038'), H('#38404a'), hash(cx, cy));
  if (lx < 1 || ly < 1) c = H('#1a1e24');
  if (x > 160 && x < 208) { c = mixc(H('#a01830'), H('#c02844'), hash(Math.floor(x / 3), Math.floor(y / 3)) * .5); if (x < 163 || x > 205) c = H('#ffcc33'); }
  const d = Math.hypot(x - 184, y - 120); if (Math.abs(d - 44) < 1.4 && x < 160 || Math.abs(d - 44) < 1.4 && x > 208) c = H('#ffcc33');
  return c;
};
const F_GREEN = (x, y) => {
  let c = mixc(H('#0f5a3a'), H('#176b45'), hash(Math.floor(x / 2), Math.floor(y / 2)));
  const px = x % 24, py = y % 24; if (Math.abs(px - 12) + Math.abs(py - 12) < 4) c = H('#e0b030'); if (px < 1 || py < 1) c = H('#0a3f28');
  return c;
};
MT.SETS = {
  studio: { name: 'STUDIO 9', floorTex: F_STUDIO, outside: '#0a0414', wall: { top: '#3a1f66', side: '#56278a', face: 'plaster', roof: 'plain' }, door: { top: '#caa030', side: '#8a6a18', face: 'plank', roof: 'plain' }, ambient: .62, trim: '#ffcc33', neon: '#ff2e88', song: 'studioBattle' },
  warehouse: { name: 'MEGAMART', floorTex: F_WARE, outside: '#16181c', wall: { top: '#7a8088', side: '#9aa0a8', face: 'plank', roof: 'slab' }, door: { top: '#c04030', side: '#a8b0b8', face: 'plank', roof: 'slab' }, ambient: .66, trim: '#f0c828', neon: '#ffaa30', song: 'warehouseFunk' },
  rooftop: { name: 'ROOFTOP', floorTex: F_ROOF, outside: '#080c18', wall: { top: '#c0a040', side: '#243c58', face: 'plain', roof: 'plain' }, door: { top: '#caa030', side: '#a88a28', face: 'plank', roof: 'plain' }, ambient: .5, trim: '#ffcc33', neon: '#2ee6ff', song: 'finaleOverture' },
  greenroom: { name: 'GREEN ROOM', floorTex: F_GREEN, outside: '#06180e', wall: { top: '#6a4a2a', side: '#8a6238', face: 'plank', roof: 'plain' }, door: { top: '#caa030', side: '#a88a28', face: 'plank', roof: 'plain' }, ambient: .62, trim: '#e0b030', neon: '#7affb0', song: 'recap' }
};
// ---- string sprites ----
const SP = MT.spr = {};
const mk = (rows, pal, sc) => E.sprite(rows, pal, sc || 1);
SP.bill = mk(['.gggggg.', 'gGGgGGgg', 'gG$gg$Gg', 'gGGgGGgg', '.gggggg.'], { g: '#2f9a4a', G: '#6ad27a', $: '#c8ffd0' });
SP.stack = mk(['.bbbbbb.', 'gGGggGGg', 'gGGggGGg', 'bbbbbbbb', 'gGGggGGg', '.gggggg.'], { g: '#2f9a4a', G: '#6ad27a', b: '#e8d048' });
SP.bar = mk(['..yyyyyy..', '.yYYYYYYy.', 'yYwYYYYYYy', 'yyyyyyyyyy', '.dddddddd.'], { y: '#e8a818', Y: '#ffd848', w: '#fffbe0', d: '#8a5a08' });
SP.case = mk(['..ssss..', '.s....s.', 'sSSSSSSs', 'sS$$$$Ss', 'sSS$$SSs', 'sSSSSSSs', 'dddddddd'], { s: '#9aa0b0', S: '#d0d6e4', $: '#2f9a4a', d: '#5a6070' });
const boxPal = { red: ['#d02838', '#ff5a68', '#ffd23a'], blue: ['#2858d0', '#5a8aff', '#ffd23a'], gold: ['#d89820', '#ffd848', '#ff3344'] };
SP.prize = {}; for (const k in boxPal) { const [a, b, c] = boxPal[k]; SP.prize[k] = mk(['..cc..cc..', '...cccc...', 'aaaacbbaaa', 'abbbcbbbba', 'abbbcbbbba', 'cccccccccc', 'abbbcbbbba', 'aaaacaaaaa'], { a, b, c }); }
SP.key = mk(['..yyy...', '.yYYYy..', '.yY.Yy..', '.yYYYy..', '..yYy...', '..yYyyy.', '..yYY.Y.', '..yYyyy.', '..yYy.Y.'], { y: '#e8a818', Y: '#ffe068' });
SP.bomb = mk(['..wwww..', '.wWWWWw.', 'wWwwwwWw', 'wWwyywWw', 'wWwwwwWw', '.wWWWWw.', '..dddd..'], { w: '#c8d0e0', W: '#fff', y: '#ffe068', d: '#6a6a80' });
SP.life = mk(['....y....', '....y....', '..yyYyy..', 'yyYYYYYyy', '.yYYuYYy.', '..yYYYy..', '.yYy.yYy.', '.yy...yy.'], { y: '#e8a818', Y: '#ffe068', u: '#fff' });
SP.statue = mk(['....yy....', '...yYYy...', '....yy....', '..yyYYyy..', '.yYYYYYYy.', '..yYYYYy..', '...yYYy...', '...yYYy...', '..yyYYyy..', '.yyyyyyyy.', '.dddddddd.'], { y: '#e8a818', Y: '#ffe068', d: '#8a5a08' }, 2);
SP.cap = mk(['.sssssss.', 'sSSSSSSSs', 'sSggggggSs', 'sSggggggSs', 'sSggggggSs', 'sSSSSSSSs', '.sssssss.', '..d...d..'], { s: '#2a1a4a', S: '#8a86b0', g: '#101828', d: '#2a1a4a' });
SP.rocket = mk(['.rr.', 'rWWr', 'rWWr', 'oyyo', '.oo.'], { r: '#ff3344', W: '#fff', o: '#ff9a3c', y: '#ffe068' });
SP.bag = mk(['.ww.', 'wyyw', 'wyyw', 'wwww'], { w: '#fff', y: '#ffd23a' });
SP.record = mk(['.yyyy.', 'yYYYYy', 'yYddYy', 'yYddYy', 'yYYYYy', '.yyyy.'], { y: '#e8a818', Y: '#ffe068', d: '#3a2a08' });
SP.heart = mk(['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#d02838', R: '#ff6a7a' });
SP.head = mk(['.ss.', 'ssss', 'ssss', '.ss.'], { s: '#ffd0a0' });
SP.live = mk(['.rr.', 'rrrr', '.rr.'], { r: '#ff3344' });
SP.tomato = mk(['.gg.', 'rrrr', 'rRrr', 'rrrr', '.rr.'], { r: '#d02828', R: '#ff6a5a', g: '#3a9a3a' });
SP.tot = mk(['.bb.', 'bBBb', 'bBBb', '.bb.'], { b: '#a87838', B: '#d8a860' });
SP.shell = mk(['.oo.', 'oyyo', 'oyyo', '.oo.'], { o: '#c06030', y: '#ffd070' });
// prize icons (12x12): six silhouettes recoloured per prize index
const SIL = [
  ['....kkkk....', '..kkkkkkkk..', '.kkKKKKKKkk.', '.kKKKKKKKKk.', '.kKKKKKKKKk.', '.kKKwwwKKKk.', '.kKKKKKKKKk.', '.kkkkkkkkkk.', '..k......k..'],
  ['.....kk.....', '....kKKk....', '...kKKKKk...', '..kKKwwKKk..', '..kKKKKKKk..', '..kKKKKKKk..', '...kkkkkk...', '...kK..Kk...', '..kk....kk..'],
  ['kkkkkkkkkkkk', 'kKKKKKKKKKKk', 'kKwwwKKKKKKk', 'kKwwwKKKKKKk', 'kKKKKKKKKKKk', 'kKKKKKKKKKKk', 'kkkkkkkkkkkk', '...kk..kk...'],
  ['............', '....kkkkk...', '..kkKKKKkk..', '.kKKwwKKKKk.', 'kkkkkkkkkkkk', 'kKKKKKKKKKKk', '.kk.kkkk.kk.', '..kk....kk..'],
  ['..kk....kk..', '.kKKk..kKKk.', '.kKKkkkkKKk.', '..kKKKKKKk..', '..kKwKKwKk..', '..kKKKKKKk..', '...kkkkkk...', '....kKKk....'],
  ['.....kk.....', '....kKKk....', '.kkkkKKkkkk.', 'kKKKKKKKKKKk', '.kkkkKKkkkk.', '....kKKk....', '....kKKk....', '...kkkkkk...']];
const PRIZE_COL = ['#d04030', '#3070d0', '#30a060', '#d09020', '#a040c0', '#30b0c0', '#c05080', '#708030', '#e06820'];
MT.prizeIcon = (i) => { MT._pi = MT._pi || {}; if (!MT._pi[i]) { const c = PRIZE_COL[i % PRIZE_COL.length]; MT._pi[i] = mk(SIL[i % SIL.length], { k: '#14081c', K: c, w: '#fff' }); } return MT._pi[i]; };
const _cp = {}; MT.capSprite = id => _cp[id] || (_cp[id] = E.sprite(['.sssssss.', 'sSSSSSSSs', 'sSggggggSs', 'sSggggggSs', 'sSggggggSs', 'sSSSSSSSs', '.sssssss.', '..d...d..'], { s: '#2a1a4a', S: '#8a86b0', g: ({ spread: '#18603a', rockets: '#702020', popcorn: '#807020', laser: '#206078', records: '#706010', shield: '#203878', speed: '#602070' })[id] || '#101828', d: '#2a1a4a' }, 1));

// ===== 10-world.js =====
// MASH TV: the World. Owns everything in a room. step() is authoritative (solo / host / server); mirror() is a hub client.
MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', kind: 'primary', letter: 'B', rate: () => MT.T.fireRate, dur: 0 },
  spread: { name: 'TRIPLE PLAY', kind: 'primary', letter: 'S', rate: () => 8, dur: 14 },
  rockets: { name: 'PRIME-TIME ROCKETS', kind: 'primary', letter: 'R', rate: () => 3.5, dur: 12 },
  popcorn: { name: 'POPCORN POPPER', kind: 'primary', letter: 'P', rate: () => 2.5, dur: 12 },
  laser: { name: 'LIMELIGHT LASER', kind: 'primary', letter: 'L', rate: () => 0, dur: 10 },
  records: { name: 'GOLD RECORDS', kind: 'addon', letter: 'G', dur: 15 },
  shield: { name: 'SPONSOR SHIELD', kind: 'addon', letter: 'K', dur: 8 },
  speed: { name: 'SPEED SNEAKERS', kind: 'addon', letter: 'F', dur: 10 }
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.DIFF = { ROOKIE: { hp: 5, lives: 5, es: .85, eb: .8, scale: .8 }, CONTESTANT: { hp: 3, lives: 3, es: 1, eb: 1, scale: 1 }, CHAMPION: { hp: 1, lives: 3, es: 1.15, eb: 1, scale: 1.2 } };
MT.ENEMIES = {};
MT.BOSSES = {};

// ---- arena map ---------------------------------------------------------------------------------------------------
MT.buildMap = function (set) {
  const rows = [];
  for (let y = 0; y < 15; y++) { let s = ''; for (let x = 0; x < 23; x++) s += (x === 0 || x === 22 || y === 0 || y === 14) ? '#' : '.'; rows.push(s); }
  for (const d of Object.values(MT.DOORS)) for (const [cx, cy] of d.cells) rows[cy] = rows[cy].slice(0, cx) + 'D' + rows[cy].slice(cx + 1);
  const S = MT.SETS[set] || MT.SETS.studio;
  const map = new E.TileMap({ rows, legend: { '#': 1, 'D': 2 }, floorTex: S.floorTex, outside: S.outside || '#0a0414', ao: 3,
    types: { 1: Object.assign({ h: 26, cut: true }, S.wall), 2: Object.assign({ h: 24, cut: true }, S.door) } });
  return map;
};

// ---- contestants -------------------------------------------------------------------------------------------------
MT.newContestant = function (slot, o = {}) {
  const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
  const hp = MT.T.hpPerLife || d.hp, lives = MT.T.startLives || d.lives;
  const c = Object.assign({ slot, name: MT.PNAMES[(o.look !== undefined ? o.look : slot) % 4] || 'P' + (slot + 1), look: slot, color: MT.PCOL[slot % 4], kind: 'local', input: null,
    x: 184, y: 160, z: 0, r: 6, vx: 0, vy: 0, face: -Math.PI / 2, aim: -Math.PI / 2, hp, maxHp: hp, lives, cash: 0, kills: 0, deaths: 0, prizes: [], bombs: 2,
    wpn: 'blaster', wT: 0, addons: {}, state: 'alive', invuln: 0, hurtT: 0, slideT: 0, slideCd: 0, slideDir: [0, 1], boatT: 0, boatCd: 0, fireCd: 0, respawnT: 0, down: 0,
    continues: 0, nextLife: 250000, boatGain: 0, pose: null, expr: null, intent: null, laserOn: false, recC: 0, lastMove: [0, 1], arrowT: 0, flash: 0, alpha: 1, landK: 0, dropZ: 0, sneakT: 0 }, Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)));
  c.body = new E.Body({ x: c.x, y: c.y, r: c.r });
  return c;
};
MT.EXTRA_LIVES = [250000, 750000, 1500000, 3000000];

class World {
  constructor(o = {}) {
    const game = this.game = MT.game;
    this.mode = o.mode || 'solo';              // 'solo' | 'host' | 'server' | 'client'
    this.session = !!o.session; this.demo = !!o.demo;
    this.cs = o.contestants || [];             // contestants (live objects)
    this.room = o.room; this.rm = o.room;
    this.set = o.room ? (o.room.set || 'studio') : 'studio';
    this.map = MT.buildMap(this.set);
    this.pShots = new E.Bullets(game, { max: 400 }); this.fShots = new E.Bullets(game, { max: 700, sparks: false });
    this.enemies = []; this.pickups = []; this.rockets = []; this.bags = []; this.lobs = []; this.shells = []; this.flames = []; this.decals = []; this.pops = [];
    this.props = []; this.nextId = 1; this.time = 0; this.phase = 'enter'; this.phaseT = 0; this.boss = null; this.crates = [];
    this.doors = {}; for (const k in MT.DOORS) this.doors[k] = { state: 'closed', t: 0, queue: [], hold: 0, exit: null, openT: 0 };
    this.spawnQ = []; this.waveI = -1; this.waveT = 0; this.wavesDone = false; this.itemQ = []; this.survive = null;
    this.rat = { R: o.R !== undefined ? o.R : 20, X: 1, prime: 0, cool: 0, lastGain: 0, lowT: 0, stunt: false, kills: [], last: 0 };
    this.events = []; this.evSeq = 0; this.keyDropped = false; this.exitPicked = null; this.exitT = 0; this.hurryT = 0; this.hazards = []; this.stats = { kills: 0 };
    this.seenKinds = {}; this.time0 = 0; this.cleared = false; this.clearTime = 0; this.bossDead = false; this.statuette = null; this.shakeT = 0; this.drops = { caps: 0 };
    this.entry = o.entry || 'S'; this.freezeE = 0; this.stunT = 0; this.onExit = o.onExit || null; this.onBossDone = o.onBossDone || null; this.onDone = o.onDone || null;
    this.cheats = o.cheats || MT.cheats; this.audience = []; this.lowSeen = {}; this.jackpot = 0;
    if (this.room) this.setupRoom();
  }
  get nPlayers() { return Math.max(1, this.cs.filter(c => c.state !== 'gone').length); }
  alive() { let n = 0; for (const e of this.enemies) if (e.alive && e.count !== false) n++; for (const d of Object.values(this.doors)) n += d.queue.length; for (const q of this.spawnQ) n += q.n || 1; return n; }
  living() { return this.cs.filter(c => c.state === 'alive' || c.state === 'walkin' || c.state === 'drop'); }
  event(name, data) { const ev = { seq: ++this.evSeq, name, data: data || {} }; this.events.push(ev); if (this.events.length > 80) this.events.shift(); if (MT.react) MT.react.handle(this, ev); if (this.evHook) this.evHook(ev); return ev; }

  // ---- room setup ---------------------------------------------------------------------------------------------------
  setupRoom() {
    const rm = this.rm, S = MT.SETS[this.set];
    this.phase = 'enter'; this.phaseT = 0;
    for (const c of this.cs) this.placeAtEntry(c);
    if (this.mode !== 'client') {
    for (const p of (rm.place || [])) { const [k, cx, cy] = p, [x, y] = MT.cellXY(cx, cy); this.spawnEnemy(k, x, y, { placed: true }); }
    if (rm.crates) for (const [cx, cy] of rm.crates) { const [x, y] = MT.cellXY(cx, cy); this.spawnEnemy('crate', x, y, {}); }
    if (rm.locks) for (const [cx, cy] of rm.locks) { const [x, y] = MT.cellXY(cx, cy); const e = this.spawnEnemy('lock', x, y + 4, {}); }
    for (const it of (rm.items || [])) this.itemQ.push({ at: it[0], kind: it[1], where: it[2], done: false });
    if (rm.key && rm.key.rule === 'crate') { const cs = this.enemies.filter(e => e.kind === 'crate'); if (cs.length) cs[Math.floor(MT.R.spawn() * cs.length)].carryKey = true; }
    if (rm.key && rm.key.rule === 'belt') { const [kx, ky] = MT.cellXY(19, 5); this.addPickup('key', kx, ky, { fixed: true }); }
    if (rm.key && rm.key.rule === 'survive') { this.survive = { len: rm.surviveLen || 35, t: 0 }; this.spawnKeyCage(); }
    if (rm.hazards) for (const h of rm.hazards) this.hazards.push(MT.makeHazard(this, h));
    if (rm.boss) this.bossSetup();
    }
    this.audience = []; for (let i = 0; i < 26; i++) this.audience.push({ x: i < 13 ? -20 - (i % 4) * 24 - MT.fxr() * 6 : 388 + (i % 4) * 24 + MT.fxr() * 6, y: 30 + Math.floor(i / 2) % 7 * 28 + MT.fxr() * 6, v: i % 8, ph: MT.fxr() * 6.28, sign: i % 11 === 3 ? 'MASH!' : i % 11 === 7 ? 'KA-CHING!' : i % 13 === 5 ? 'HI MOM' : null });
  }
  placeAtEntry(c) {
    const d = MT.DOORS[this.entry], ix = -d.dx, iy = -d.dy, lx = -iy, ly = ix, idx = Math.max(0, this.cs.indexOf(c)), side = idx % 2 ? 1 : -1, row = idx >> 1;
    c.x = c.body.x = d.x + ix * 14 + lx * side * 6; c.y = c.body.y = d.y + iy * 14 + ly * side * 6;
    c.walkTo = [d.x + ix * (56 + row * 22) + lx * side * 16, d.y + iy * (56 + row * 22) + ly * side * 16];
    if (c.state !== 'out') c.state = 'walkin'; c.walkT = 1.2; c.invuln = Math.max(c.invuln, 1.4); c.arrowT = 3;
    c.vx = c.vy = 0; c.body.vx = c.body.vy = 0; c.z = 0; c.body.z = 0; c.face = Math.atan2(iy, ix); c.aim = c.face;
  }
  spawnKeyCage() { const [x, y] = [184, 120]; this.keyCage = { x, y, r: 16, open: false }; const k = this.addPickup('key', x, y, { fixed: true }); k.caged = true; this.map.solid && 0; }

  // ---- spawning ------------------------------------------------------------------------------------------------------
  scaleN(n) {
    const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].scale, p = this.session ? this.nPlayers : this.nPlayers;
    return Math.max(1, Math.round(n * (1 + .35 * (p - 1)) * MT.T.waveSize * d));
  }
  queueSpawn(door, kind, n, gap) {
    n = this.scaleN(n); gap = (gap || .25) * MT.T.spawnGap;
    const doors = door === 'all' ? ['N', 'E', 'S', 'W'] : door === 'sides' ? ['E', 'W'] : door === 'ends' ? ['N', 'S'] : null;
    if (doors) { for (const d of doors) this.queueSpawn(d, kind, Math.max(1, Math.round(n / (door === 'all' ? 1 : 1))), gap / MT.T.spawnGap); return; }
    if (DOORS_OK[door]) { const d = this.doors[door]; for (let i = 0; i < n; i++) d.queue.push({ kind, at: this.time + i * gap, o: {} }); return; }
    // audience, drop, [cx,cy]
    for (let i = 0; i < n; i++) this.spawnQ.push({ kind, at: this.time + .1 + i * gap, where: door });
  }
  spawnEnemy(kind, x, y, o = {}) {
    const A = MT.ENEMIES[kind]; if (!A) throw new Error('unknown enemy ' + kind);
    const hpMul = MT.T.enemyHp;
    const e = { id: this.nextId++, kind, x, y, z: 0, r: A.r, vx: 0, vy: 0, face: Math.PI / 2, state: 'idle', t: 0, t2: 0, flash: 0, alpha: 1, alive: true, hp: Math.max(.5, A.hp * (o.hpMul || 1) * (A.noHpMul ? 1 : hpMul)), count: A.count !== false, stun: 0, kb: [0, 0], entering: !!o.entering, seed: MT.R.ai(), cd: 0.6 + MT.R.ai(), age: 0 };
    e.max = e.hp; e.hpPct = 1; e.body = new E.Body({ x, y, r: A.r }); if (o.placed) e.placed = true;
    Object.assign(e, o.props || {}); if (o.carryKey) e.carryKey = true; if (A.make) A.make(this, e, o);
    this.enemies.push(e); this.seenKinds[kind] = (this.seenKinds[kind] || 0) + 1;
    if (!this.introSeen) this.introSeen = {}; this.event('enemy', { kind, first: !MT.run || !MT.run.seenEnemies[kind] });
    if (MT.run) MT.run.seenEnemies[kind] = true;
    return e;
  }
  spawnAtDoor(dn, q) {
    const d = MT.DOORS[dn]; const jitter = (MT.R.spawn() - .5) * 30;
    const x = d.x + d.dx * 20 + (d.dx === 0 ? jitter : 0), y = d.y + d.dy * 20 + (d.dy === 0 ? jitter : 0);
    const e = this.spawnEnemy(q.kind, x, y, { entering: true, props: q.props, carryKey: q.carryKey });
    e.face = Math.atan2(-d.dy, -d.dx); return e;
  }
  spawnWhere(q) {
    const w = q.where; let x, y, o = {};
    if (w === 'audience') { const left = MT.R.spawn() < .5; x = left ? -30 : 398; y = 40 + MT.R.spawn() * 160; const tx = left ? 30 + MT.R.spawn() * 120 : 218 + MT.R.spawn() * 120, ty = 40 + MT.R.spawn() * 160; o.props = { leap: { x0: x, y0: y, x1: tx, y1: ty, t: 0 } }; x = x; }
    else if (w === 'drop') {
      let tries = 0; do { x = 40 + MT.R.spawn() * 288; y = 40 + MT.R.spawn() * 160; tries++; } while (tries < 20 && this.living().some(c => MT.hyp(c.x - x, c.y - y) < 50));
      this.pops.push({ x, y, t: .6, kind: 'shadow' }); o.props = { dropT: .6 };
    } else if (Array.isArray(w)) [x, y] = MT.cellXY(w[0], w[1]);
    const e = this.spawnEnemy(q.kind, x, y, Object.assign(o, { carryKey: q.carryKey }));
    if (o.props && o.props.leap) { e.entering = true; e.invuln = true; e.z = 0; }
    if (o.props && o.props.dropT) { e.invuln = true; e.hidden = true; }
    return e;
  }

  // ---- pickups -------------------------------------------------------------------------------------------------------
  addPickup(kind, x, y, o = {}) {
    const p = Object.assign({ id: this.nextId++, kind, x, y, z: 0, ttl: o.fixed ? 1e9 : 9, t: 0, vx: 0, vy: 0, r: 7, w: null }, o);
    if (kind === 'cap' && !p.w) p.w = MT.pickOf('drops', MT.CAPSULES);
    if (kind === 'cap') { if (this.pickups.filter(q => q.kind === 'cap').length >= 3) return null; }
    else if (['bill', 'stack', 'bar', 'case'].includes(kind) && this.pickups.filter(q => q.cash).length >= 25) return null;
    if (['bill', 'stack', 'bar', 'case'].includes(kind)) p.cash = true;
    if (kind === 'prize') { p.prizeIdx = o.prizeIdx !== undefined ? o.prizeIdx : this.nextPrize(); p.col = p.col || ['red', 'blue', 'gold'][Math.floor(MT.R.drops() * 3)]; }
    p.vz = o.vz === undefined ? 0 : o.vz;
    this.pickups.push(p); return p;
  }
  nextPrize() {
    const run = MT.run; if (!run) return 0; const ep = MT.EPISODES[Math.min(3, run.ep)] || MT.EPISODES[1];
    if (!run.prizeBag || !run.prizeBag.length) { const idx = ep.prizes.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(MT.R.drops() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } run.prizeBag = idx; }
    return run.prizeBag.shift();
  }
  scatterCash(x, y, n, boss) {
    for (let i = 0; i < n; i++) { const a = MT.R.drops() * MT.TAU, v = 30 + MT.R.drops() * 70; const k = MT.R.drops() < .15 ? 'bar' : MT.R.drops() < .5 ? 'stack' : 'bill'; const p = this.addPickup(k, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: 90 + MT.R.drops() * 60, ttl: 14 }); }
  }
  dropRoll(e, A) {
    const mul = MT.T.dropMul * ((this.rm && this.rm.billMul && 1) || 1);
    for (const [k, p] of (A.drops || [])) {
      let pp = p * mul * (k === 'bill' && this.rm && this.rm.cashRoom ? 2 : 1);
      if (MT.R.drops() < pp) {
        if (k === 'cap') this.addPickup('cap', e.x, e.y); else if (k === 'prize') this.addPickup('prize', e.x, e.y); else this.addPickup(k, e.x, e.y, { vx: (MT.R.drops() - .5) * 40, vy: (MT.R.drops() - .5) * 40, vz: 60 });
        break;
      }
    }
  }
  collect(c, p) {
    const mul = (this.rm && this.rm.cashRoom ? 1.5 : 1) * MT.T.cashMul * this.rat.X;
    const give = (v, label) => { const amt = Math.round(v * mul); this.addCash(c, amt); this.event('cash', { slot: c.slot, amt, x: p.x, y: p.y }); return amt; };
    switch (p.kind) {
      case 'bill': give(100); break; case 'stack': give(500); break; case 'bar': give(1000); break; case 'case': give(5000); break;
      case 'prize': {
        const ep = MT.EPISODES[Math.min(3, (MT.run && MT.run.ep) || 1)], pr = ep.prizes[p.prizeIdx % ep.prizes.length], amt = give(pr.value);
        c.prizes.push({ name: pr.name, value: pr.value, joke: pr.joke, ep: (MT.run && MT.run.ep) || 1 }); this.addRating(2); this.event('prize', { slot: c.slot, name: pr.name, value: pr.value, joke: pr.joke, amt });
        break; }
      case 'key': this.collectKey(c, p); break;
      case 'cap': this.giveWeapon(c, p.w); this.event('capsule', { slot: c.slot, w: p.w, x: p.x, y: p.y }); break;
      case 'bomb': if (c.bombs >= 3) give(2000); else c.bombs++; this.event('pickup', { slot: c.slot, kind: 'bomb' }); break;
      case 'life': c.lives++; this.event('life', { slot: c.slot }); break;
      case 'statue': this.event('statuette', { slot: c.slot }); give(100000); c.prizes.push({ name: 'THE NETWORK (YES, ALL OF IT)', value: 100000, joke: 'YOU OWN THE SHOW NOW!', ep: 4 }); this.statuette = { who: c.slot }; break;
    }
    p.dead = true;
  }
  collectKey(c, p) {
    const run = MT.run;
    if (this.session) { this.addCash(c, 10000); this.event('cash', { slot: c.slot, amt: 10000, x: p.x, y: p.y }); this.event('key', { slot: c.slot, n: 0, bonus: true }); return; }
    if (run) run.keys++; this.addRating(5); this.event('key', { slot: c.slot, n: run ? run.keys : 0, first: run && run.keys === 1 });
  }
  addCash(c, amt) {
    c.cash += amt; c.recC += amt;
    while (c.cash >= c.nextLife && c.nextLife > 0) { const i = MT.EXTRA_LIVES.indexOf(c.nextLife); c.lives++; c.nextLife = MT.EXTRA_LIVES[i + 1] || 0; this.event('life', { slot: c.slot, encore: true }); }
  }
  giveWeapon(c, id) {
    const W = MT.WEAPONS[id]; if (!W) return; const dur = W.dur * MT.T.puDuration;
    if (W.kind === 'primary') { c.wpn = id; c.wT = dur; c.wMax = dur; } else { c.addons[id] = dur; (c.addMax = c.addMax || {})[id] = dur; }
    this.event('weapon', { slot: c.slot, w: id });
  }

  // ---- ratings -----------------------------------------------------------------------------------------------------
  addRating(v) {
    const r = this.rat; if (r.prime > 0 || v === 0) { if (v > 0) r.lastGain = 0; return; }
    v *= MT.T.ratingsGain; r.R = Math.min(100, r.R + v); if (v > 0) r.lastGain = 0;
    if (r.R >= 100 && r.cool <= 0 && !this.session_noprime) this.startPrime();
  }
  loseRating(v) { if (this.rat.prime > 0) return; this.rat.R = Math.max(0, this.rat.R - v); }
  startPrime() {
    const r = this.rat; r.prime = MT.T.primeTime; r.R = 100; this.event('prime', {});
    for (let i = 0; i < 3; i++) { const a = MT.R.spawn() * MT.TAU; this.addPickup('cap', 184, 20, { vx: Math.cos(a) * 60, vy: 40 + Math.abs(Math.sin(a)) * 40, vz: 120, ttl: 14 }); }
  }
  tickRatings(dt) {
    const r = this.rat; r.lastGain += dt;
    if (r.prime > 0) { r.prime -= dt; r.X = 5; if (r.prime <= 0) { r.prime = 0; r.R = 60; r.cool = 20; this.event('primeEnd', {}); } }
    else {
      if (r.cool > 0) r.cool -= dt;
      if (r.lastGain > 2.5 && this.phase === 'waves') r.R = Math.max(0, r.R - MT.T.ratingsDecay * dt);
      r.X = r.R >= 80 ? 5 : r.R >= 60 ? 4 : r.R >= 40 ? 3 : r.R >= 20 ? 2 : 1;
    }
    // stunt: R < 5 for 10 s during waves
    if (this.phase === 'waves' && r.R < 5 && r.prime <= 0) { r.lowT += dt; if (r.lowT >= 10 && !r.stunt) this.releaseStunt(); } else r.lowT = 0;
    // multi-kill window
    r.kills = r.kills.filter(t => this.time - t < .4);
  }
  releaseStunt() {
    this.rat.stunt = true; this.rat.R += 15; const ep = MT.EPISODES[Math.min(3, (MT.run && MT.run.ep) || 1)]; const k = ep.stunt;
    const dn = MT.pickOf('spawn', ['N', 'E', 'S', 'W']);
    if (k === 'clapbot') this.queueSpawn(dn, 'clapbot', 12, .15); else this.queueSpawn(dn, k, 1, 1);
    this.event('stunt', {});
  }

  // ---- damage --------------------------------------------------------------------------------------------------------
  hurtEnemy(e, dmg, src, o = {}) {
    if (!e.alive || e.invuln || this.mode === 'client') return false;
    if (this.cheats && this.cheats.oneHit && src && src.slot !== undefined) dmg = 9999;
    if (e.vulnerable) dmg *= 2;
    const A = MT.ENEMIES[e.kind]; if (A.armor) dmg *= A.armor(e);
    e.hp -= dmg; e.flash = .09; e.hpPct = Math.max(0, e.hp / e.max);
    if (o.ang !== undefined && A.kb !== 0 && !e.noKb) { const k = (A.kb === undefined ? 40 : A.kb); e.kb = [Math.cos(o.ang) * k, Math.sin(o.ang) * k]; }
    if (A.onHit) A.onHit(this, e, dmg, src);
    if (e.hp <= 0) this.killEnemy(e, src, o);
    else if (!o.quiet) { this.game.particles.sparks(e.x, e.y, 12, 2, o.ang !== undefined ? o.ang : null); this.event('hit', { id: e.id, x: e.x, y: e.y }); }
    return true;
  }
  killEnemy(e, src, o = {}) {
    if (!e.alive) return; e.alive = false; const A = MT.ENEMIES[e.kind];
    const c = src && src.slot !== undefined ? this.cs.find(q => q.slot === src.slot) : null;
    if (A.onDie) A.onDie(this, e, src);
    const mul = (this.rm && this.rm.cashRoom ? 1.5 : 1) * MT.T.cashMul * this.rat.X;
    if (A.cash && !e.noCash) { const amt = Math.round(A.cash * (e.big ? 2 : 1) * mul); if (c) { this.addCash(c, amt); } this.event('cash', { slot: c ? c.slot : -1, amt, x: e.x, y: e.y, kill: true }); }
    if (c) { c.kills++; } this.stats.kills++;
    if (A.rat && !e.noRating) { this.addRating(A.rat); const r = this.rat; r.kills.push(this.time); if (r.kills.length > 2) { this.addRating(2); if (r.kills.length === 4 || r.kills.length === 6) this.event('multikill', { n: r.kills.length }); } }
    this.game.particles.bits(e.x, e.y, 12, A.big ? 22 : 10, A.palette || ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff']);
    this.event('kill', { id: e.id, kind: e.kind, x: e.x, y: e.y, big: !!A.big });
    if (A.big) { this.game.particles.explosion(e.x, e.y, 10, A.big === true ? 1 : A.big); this.game.shake(4); if (!this.session && !this.game.headless) this.game.freeze(.03); }
    if (e.carryKey) this.addPickup('key', e.x, e.y, { fixed: true, vz: 80 });
    if (e.kind === 'crate') this.crateSpill(e);
    this.dropRoll(e, A);
    if (this.rm && this.rm.key && this.rm.key.rule === 'mimes' && e.placed && e.kind === 'mime') { if (!this.enemies.some(q => q.alive && q.placed && q.kind === 'mime') && !this.keyDropped) { this.keyDropped = true; this.addPickup('key', e.x, e.y, { fixed: true, vz: 80 }); this.event('mimeKey', {}); } }
  }
  crateSpill(e) { const n = 3 + Math.floor(MT.R.drops() * 3); for (let i = 0; i < n; i++) { const a = MT.R.drops() * MT.TAU; this.addPickup(MT.R.drops() < .3 ? 'stack' : 'bill', e.x, e.y, { vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, vz: 90 }); } if (MT.R.drops() < .5) this.addPickup('prize', e.x, e.y, { vx: 10, vy: 10, vz: 80 }); }

  hurtContestant(c, dmg, srcKind, srcId, ang) {
    if (c.kind === 'remote' || c.kind === 'mirror') return false;
    if (c.state !== 'alive' || c.invuln > 0 || c.slideT > .06 || c.addons.shield > 0) return false;
    if (this.cheats && this.cheats.god) return false;
    if (c.boatT > 0) { c.boatT = 0; c.boatCancel = true; }
    c.hp -= dmg; c.invuln = MT.T.invulnTime; c.hurtT = .4; c.flash = .1;
    if (ang !== undefined) { c.body.vx = Math.cos(ang) * 120; c.body.vy = Math.sin(ang) * 120; c.kbT = .12; }
    this.loseRating(12); this.game.particles.sparks(c.x, c.y, 12, 6); this.game.shake(2.5);
    if (c.input && c.input.rumble) c.input.rumble(.5, .15);
    this.event('hurt', { slot: c.slot, hp: c.hp, x: c.x, y: c.y, src: srcKind, id: srcId, dmg });
    if (c.hp <= 0) this.killContestant(c);
    else if (c.hp === 1 && !this.lowSeen[c.slot]) { this.lowSeen[c.slot] = true; this.event('lowHp', { slot: c.slot }); }
    return true;
  }
  killContestant(c) {
    c.hp = 0; c.state = 'dying'; c.respawnT = 2; c.deaths++; if (!this.session) c.lives--; c.pose = 'die'; c.down = 0; c.wpn = 'blaster'; c.wT = 0; c.addons = {};
    this.loseRating(25); this.game.particles.bits(c.x, c.y, 10, 24, [c.color, '#fff', '#ffcc33']);
    this.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name, lives: c.lives });
    if (this.session && c.kind !== 'mirror') { c.cash = Math.max(0, c.cash - 2500); }
  }
  respawn(c) {
    if (c.lives <= 0 && !this.session) { c.state = 'out'; c.pose = null; this.event('out', { slot: c.slot }); this.checkAllOut(); return; }
    if (this.session && c.lives < 0) c.lives = 0;
    c.state = 'drop'; c.hp = c.maxHp; c.dropZ = 70; c.invuln = 2.5; c.pose = null; c.down = 0; c.bombs = Math.max(c.bombs, 1); c.arrowT = 3;
    const d = MT.DOORS[this.entry]; const sx = 184 + (c.slot % 2 ? 24 : -24); c.x = c.body.x = sx; c.y = c.body.y = 150; c.z = 70; c.body.z = 70;
    this.event('drop', { slot: c.slot });
  }
  checkAllOut() { if (this.cs.length && this.cs.every(q => q.state === 'out' || q.state === 'gone') && this.onAllOut) this.onAllOut(); }
}
const DOORS_OK = { N: 1, E: 1, S: 1, W: 1 };
MT.World = World;

// ===== 11-step.js =====
// MASH TV: the authoritative step: contestants, weapons, projectiles, collisions, doors, waves, phases.
const WP = World.prototype;
const SMALL_FOE = { orb: 1, shard: 1, coin: 1, card: 1, static: 1, butter: 1, gravy: 1, beam: 0 };

WP.dm = function () { return MT.T.dmgMul * (this.dmgBoost || 1); };
WP.getIntent = function (c) {
  if (c.kind === 'remote') return c.intent || { move: [0, 0], aim: null, fire: false };
  if (c.kind === 'bot' || (c.auto && MT.bot)) return MT.bot.think(this, c);
  if (c.input && !MT.overlay.open && !(this.session && MT.sessionOverlay && MT.sessionOverlay.open) && !this.inputOff) return MT.intentFrom(c.input, c, this);
  return { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false };
};

WP.foeShot = function (x, y, ang, speed, kind, o = {}) {
  const d = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
  const sp = Math.min(130, speed) * MT.T.enemyBulletSpeed * d.eb * (this.bulletBoost || 1);
  const col = { orb: '#ff9a3c', shard: '#ffd23a', beam: '#ffe9a0', static: '#d8f0ff', card: '#ff6a9a', coin: '#ffd23a', butter: '#ffe27a', gravy: '#b86a30', tot: '#d8a050' }[kind] || '#ff9a3c';
  const b = this.fShots.fire({ x, y, z: o.z === undefined ? 12 : o.z, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: o.r || ({ shard: 2, beam: 2, static: 2, card: 3, coin: 3 }[kind] || 3), team: 'f', color: col, core: '#fff', life: o.life || 4, dmg: 1, data: { id: this.nextId++, kind } });
  if (b) { b.kind = kind; b.id = b.data.id; b.ang = ang; b.spin = o.spin; }
  return b;
};
WP.lob = function (kind, x, y, tx, ty, o = {}) {
  const a = E.arc({ x, y, z: o.z0 || 12 }, { x: tx, y: ty, z: 0 }, 260, { time: o.time || .7 });
  const l = { id: this.nextId++, kind, x, y, z: o.z0 || 12, vx: a.vx, vy: a.vy, vz: a.vz, tx, ty, t: 0, owner: o.owner };
  this.lobs.push(l); return l;
};
WP.splat = function (x, y, kind) {
  const r = kind === 'tot' ? 0 : 10;
  this.decals.push({ kind: kind === 'tomato' ? 'tomato' : 'scorch', x, y, t: 6, life: 6 });
  if (kind === 'tomato') { this.puddles = this.puddles || []; this.puddles.push({ x, y, r: 14, t: 6 }); this.event('splat', { x, y }); }
  for (const c of this.cs) if (c.state === 'alive' && r && MT.hyp(c.x - x, c.y - y) < r + 5) this.hurtContestant(c, 1, 'tomato', 0, MT.angTo({ x, y }, c));
  this.game.particles.bits(x, y, 4, 8, kind === 'tomato' ? ['#d02828', '#ff5a3a', '#fff'] : ['#ffd23a', '#fff']);
};
WP.explode = function (x, y, r, dmgC, dmgE, owner, o = {}) {
  this.game.particles.explosion(x, y, 8, o.size || 1); this.event('boom', { x, y, r });
  this.decals.push({ kind: 'scorch', x, y, t: 5, life: 5 });
  if (dmgC) for (const c of this.cs) if (c.state === 'alive' && MT.hyp(c.x - x, c.y - y) < r + 4) this.hurtContestant(c, dmgC, o.src || 'blast', 0, MT.angTo({ x, y }, c));
  if (dmgE) for (const e of this.enemies) if (e.alive && !e.hidden && MT.hyp(e.x - x, e.y - y) < r + e.r) this.hurtEnemy(e, dmgE, owner !== undefined ? { slot: owner } : null, { ang: MT.angTo({ x, y }, e), quiet: true });
  if (dmgE && this.boss) this.boss.hitCircle(this, x, y, r, dmgE, owner);
};

// ---- contestants ----------------------------------------------------------------------------------------------------
WP.puddleSlow = function (c) { if (!this.puddles) return 1; for (const p of this.puddles) if (MT.hyp(c.x - p.x, c.y - p.y) < p.r) return .6; return 1; };
WP.updateContestant = function (c, dt) {
  if (c.kind === 'remote') return this.updateRemote(c, dt);
  const I = c.intent || { move: [0, 0] }, g = this.game;
  c.flash = Math.max(0, c.flash - dt); c.hurtT = Math.max(0, c.hurtT - dt); c.arrowT = Math.max(0, c.arrowT - dt);
  if (c.invuln > 0) c.invuln -= dt; c.slideCd = Math.max(0, c.slideCd - dt); c.boatCd = Math.max(0, c.boatCd - dt); c.fireCd = Math.max(0, c.fireCd - dt);
  c.landK = Math.max(0, c.landK - dt * 3);
  if (c.wT > 0 && c.wpn !== 'blaster') { c.wT -= dt; if (c.wT <= 0) { c.wpn = 'blaster'; c.wT = 0; this.event('expire', { slot: c.slot }); } }
  for (const k in c.addons) { c.addons[k] -= dt; if (c.addons[k] <= 0) { delete c.addons[k]; this.event('expire', { slot: c.slot }); } }
  c.laserOn = false;
  if (c.state === 'walkin') {
    const dx = c.walkTo[0] - c.x, dy = c.walkTo[1] - c.y, L = Math.hypot(dx, dy);
    c.walkT -= dt; const sp = L > 3 ? 70 : 0; c.body.vx = dx / (L || 1) * sp; c.body.vy = dy / (L || 1) * sp; c.body.update(dt, this.noClipMap()); c.x = c.body.x; c.y = c.body.y;
    c.vx = c.body.vx; c.vy = c.body.vy; if (sp) c.face = Math.atan2(dy, dx);
    if (c.walkT <= 0) { c.state = 'alive'; c.invuln = Math.max(c.invuln, .3); }
    return;
  }
  if (c.state === 'dying') { c.respawnT -= dt; c.down = Math.min(1, c.down + dt * 2); if (c.respawnT <= 0) this.respawn(c); return; }
  if (c.state === 'drop') {
    c.dropZ = Math.max(0, c.dropZ - dt * 140); c.z = c.dropZ; if (c.dropZ <= 0) { c.state = 'alive'; c.landK = 1; this.game.particles.dust(c.x, c.y, 2, 6); this.event('land', { slot: c.slot }); } return;
  }
  if (c.state === 'out') {
    if (c.input && c.input.pressed('start') && !this.session) { c.lives = MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].hp ? (MT.T.startLives || MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].lives) : 3; c.cash = Math.floor(c.cash / 2); c.continues++; this.respawn(c); this.event('rejoin', { slot: c.slot }); }
    return;
  }
  if (c.state !== 'alive') return;
  // facing & aim
  if (I.aim !== null && I.aim !== undefined) c.aim = I.aim; else if (I.move[0] || I.move[1]) c.aim = Math.atan2(I.move[1], I.move[0]);
  const firing = !!I.fire && c.boatT <= 0; c.fireOn = firing && c.slideT < .2;
  const moving = Math.hypot(I.move[0], I.move[1]) > .1;
  if (firing) c.face = c.aim; else if (moving) c.face = Math.atan2(I.move[1], I.move[0]);
  if (moving) c.lastMove = [I.move[0], I.move[1]];
  // slide
  if (I.slide && c.slideCd <= 0 && c.slideT <= 0 && c.boatT <= 0) {
    const d = moving ? norm2(I.move) : [Math.cos(c.face), Math.sin(c.face)]; c.slideDir = d; c.slideT = .28; c.slideCd = MT.T.slideCooldown * (c.addons.speed > 0 ? .6 : 1);
    this.event('slide', { slot: c.slot, x: c.x, y: c.y }); g.particles.dust(c.x, c.y, 2, 6);
  }
  let vx, vy;
  const spd = MT.T.playerSpeed * (c.addons.speed > 0 ? 1.45 : 1) * this.puddleSlow(c);
  if (c.slideT > 0) { c.slideT -= dt; vx = c.slideDir[0] * MT.T.slideSpeed; vy = c.slideDir[1] * MT.T.slideSpeed; c.slideU = 1 - c.slideT / .28; }
  else if (c.boatT > 0) { vx = vy = 0; }
  else if (c.kbT > 0) { c.kbT -= dt; vx = c.body.vx * .9; vy = c.body.vy * .9; }
  else { vx = I.move[0] * spd; vy = I.move[1] * spd; c.slideU = 0; }
  // conveyors etc.
  const push = this.pushAt(c.x, c.y); vx += push[0]; vy += push[1];
  c.body.vx = vx; c.body.vy = vy;
  if (this.cheats && this.cheats.noclip) { c.body.x += vx * dt; c.body.y += vy * dt; } else c.body.update(dt, this.map);
  c.x = c.body.x; c.y = c.body.y; c.vx = vx; c.vy = vy; this.pushOutStatics(c);
  // showboat
  if (I.showboat && c.boatCd <= 0 && c.boatT <= 0 && c.slideT <= 0) { c.boatT = .6; c.boatCd = 3; c.boatCancel = false; c.boatPose = ['cheer', 'hips', 'wave'][(c.boatN = (c.boatN || 0) + 1) % 3]; }
  if (c.boatT > 0) { c.boatT -= dt; if (c.boatT <= 0) this.finishShowboat(c); }
  // bomb
  if (I.bomb && (c.bombs > 0 || (this.cheats && this.cheats.infBombs))) { if (!(this.cheats && this.cheats.infBombs)) c.bombs--; this.showstopper(c); }
  // weapons
  if (firing && c.slideT < .2) this.fireWeapon(c, dt);
  this.addonStep(c, dt);
  if (c.wpn === 'laser' && !c.laserOn) c.laserHum = 0;
};
const norm2 = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
WP.noClipMap = function () { return this.map; };
WP.finishShowboat = function (c) {
  if (c.boatCancel) { c.boatCancel = false; return; }
  let n = 0, m = 0; for (const e of this.enemies) if (e.alive && e.count !== false) { const d = MT.hyp(e.x - c.x, e.y - c.y); if (d < 64) n++; if (d < 32) m++; }
  const gain = Math.min(30, 4 + 3 * n + 3 * m); this.addRating(gain); c.boatGain += gain;
  this.event('showboat', { slot: c.slot, gain, x: c.x, y: c.y, n });
};
WP.showstopper = function (c) {
  this.game.flash('#ffffff', .12, .7); this.game.particles.ring(c.x, c.y, 8, 190, '#ffffff', .5); this.game.particles.glints(c.x, c.y, 14, 30, '#fff');
  if (this.mode !== 'client') { for (const e of this.enemies) if (e.alive && !e.hidden) { this.hurtEnemy(e, 25, { slot: c.slot }, { quiet: true, ang: MT.angTo(c, e) }); if (e.alive) e.stun = Math.max(e.stun || 0, 1); }
  if (this.boss) this.boss.hitAll(this, 30, c.slot); this.fShots.clear(); this.lobs.length = 0; this.addRating(8); } this.event('bomb', { slot: c.slot, x: c.x, y: c.y });
  if (!this.session && !this.game.headless) this.game.freeze(.08);
};

// ---- weapons --------------------------------------------------------------------------------------------------------------
WP.fireWeapon = function (c, dt) {
  const w = c.wpn, a = c.aim, mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10, sp = MT.T.bulletSpeed, dmg = this.dm();
  if (w === 'laser') { c.laserOn = true; this.laserStep(c, dt); return; }
  if (c.fireCd > 0) return;
  const shot = (ang, d, col) => { const b = this.pShots.fire({ x: mx, y: my, z: 14, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 2.5, life: .9, team: 'p', color: col || '#ffe066', core: '#fff', dmg: d, data: { owner: c.slot, w } }); return b; };
  if (w === 'blaster') { shot(a, dmg); c.fireCd = 1 / MT.T.fireRate; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'spread') { for (const o of [-.227, 0, .227]) shot(a + o, dmg, '#7affb0'); c.fireCd = 1 / 8; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'rockets') { this.rockets.push({ id: this.nextId++, x: mx, y: my, a, v: 180, t: 0, owner: c.slot, dmg }); c.fireCd = 1 / 3.5; this.event('shot', { slot: c.slot, w }); }
  else if (w === 'popcorn') {
    let dist = 90; if (c.intent && c.intent.mouseAt) dist = Math.min(90, MT.hyp(c.intent.mouseAt[0] - c.x, c.intent.mouseAt[1] - c.y));
    const tx = c.x + Math.cos(a) * dist, ty = c.y + Math.sin(a) * dist; const l = this.lob('bag', mx, my, tx, ty, { time: .55, owner: c.slot }); l.dmg = dmg; c.fireCd = 1 / 2.5; this.event('shot', { slot: c.slot, w });
  }
};
WP.laserStep = function (c, dt) {
  const a = c.aim, ox = c.x + Math.cos(a) * 10, oy = c.y + Math.sin(a) * 10; let len = 0;
  for (; len < 400; len += 4) { const x = ox + Math.cos(a) * len, y = oy + Math.sin(a) * len; if (this.map.heightAt(x, y) > 10) break; }
  c.laserLen = len; c.laserA = a;
  const dx = Math.cos(a), dy = Math.sin(a);
  for (const e of this.enemies) {
    if (!e.alive || e.hidden || e.invuln) continue; const px = e.x - ox, py = e.y - oy, t = px * dx + py * dy; if (t < 0 || t > len + e.r) continue;
    const d = Math.abs(px * dy - py * dx); if (d < e.r + 2) this.hurtEnemy(e, 16 * dt * this.dm(), { slot: c.slot }, { quiet: true, ang: a });
  }
  if (this.boss) this.boss.hitRay(this, ox, oy, a, len, 16 * dt * this.dm(), c.slot);
  c.laserHum = (c.laserHum || 0) - dt; if (c.laserHum <= 0) { c.laserHum = .12; this.event('laser', { slot: c.slot }); }
  if (MT.fxr() < .3) this.game.particles.sparks(ox + dx * len, oy + dy * len, 10, 1);
};
WP.addonStep = function (c, dt) {
  if (c.addons.records > 0) {
    c.recA = (c.recA || 0) + 4.2 * dt;
    for (let k = 0; k < 2; k++) {
      const ang = c.recA + k * Math.PI, rx = c.x + Math.cos(ang) * 26, ry = c.y + Math.sin(ang) * 26;
      for (const e of this.enemies) { if (!e.alive || e.hidden || e.invuln) continue; if (MT.hyp(e.x - rx, e.y - ry) < e.r + 5 && !(e.recCd > this.time)) { e.recCd = this.time + .15; this.hurtEnemy(e, 2 * this.dm(), { slot: c.slot }, { ang }); } }
      for (const b of this.fShots.list) if (!b.dead && SMALL_FOE[b.kind] && MT.hyp(b.x - rx, b.y - ry) < b.r + 6) { b.dead = true; this.game.particles.sparks(b.x, b.y, 12, 3); }
      if (this.boss) this.boss.hitCircle(this, rx, ry, 5, 2 * this.dm() * dt * 3, c.slot);
    }
  }
  if (c.addons.shield > 0) for (const e of this.enemies) { if (!e.alive || e.hidden || e.invuln) continue; if (MT.hyp(e.x - c.x, e.y - c.y) < e.r + 14 && !(e.shCd > this.time)) { e.shCd = this.time + .2; this.hurtEnemy(e, 1, { slot: c.slot }, { ang: MT.angTo(c, e) }); } }
  if (c.addons.speed > 0 && MT.hyp(c.vx, c.vy) > 40 && MT.fxr() < .3) c.ghostT = .2;
};

// ---- projectiles --------------------------------------------------------------------------------------------------------
WP.targetList = function () {
  const t = []; for (const e of this.enemies) if (e.alive && !e.hidden && !e.invuln) t.push(e);
  if (this.boss) for (const p of this.boss.hitParts()) t.push(p);
  return t;
};
WP.updateProjectiles = function (dt) {
  this.pShots.update(dt, this.map); this.fShots.update(dt, this.map);
  for (const b of this.fShots.list) { if (b.kind === 'card') b.spinA = (b.spinA || 0) + dt * 10; if (b.kind === 'shell' && b.dead) { /* handled in onWall */ } }
  // player bolts vs targets
  const targets = this.targetList();
  this.pShots.hit(targets, (b, t) => {
    const ang = Math.atan2(b.vy, b.vx), owner = b.data.owner;
    if (t.isPart) t.boss.hitPart(this, t, b.dmg, owner, ang); else this.hurtEnemy(t, b.dmg, { slot: owner }, { ang });
  }, 'p');
  // rockets
  for (const k of this.rockets) {
    k.t += dt; k.v = Math.min(300, k.v + 130 * dt); k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt;
    if (MT.fxr() < .8) this.game.particles.smoke(k.x - Math.cos(k.a) * 4, k.y - Math.sin(k.a) * 4, 12, 1, { size: 3 });
    let boom = k.t > .9 || this.map.heightAt(k.x, k.y) > 8;
    if (!boom) for (const t of targets) if (MT.hyp(t.x - k.x, t.y - k.y) < (t.r || 8) + 3) { boom = true; if (t.isPart) t.boss.hitPart(this, t, 4 * this.dm(), k.owner, k.a); else this.hurtEnemy(t, 4 * this.dm(), { slot: k.owner }, { ang: k.a, quiet: true }); break; }
    if (boom) { k.dead = true; this.explode(k.x, k.y, 24, 0, 3 * this.dm(), k.owner); this.event('rocketBoom', { x: k.x, y: k.y }); }
  }
  this.rockets = this.rockets.filter(k => !k.dead);
  // lobs: bags, tomatoes, tots, shells-in-air
  for (const l of this.lobs) {
    l.t += dt; l.vz -= 260 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    if (l.z <= 0 && l.t > .05) {
      l.dead = true;
      if (l.kind === 'bag') { this.explode(l.x, l.y, 18, 0, 2 * (l.dmg || 1), l.owner, { size: .6 }); for (let i = 0; i < 6; i++) { const a = i / 6 * MT.TAU; this.pShots.fire({ x: l.x, y: l.y, z: 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2.5, life: .35, team: 'p', pierce: true, color: '#fff2b0', core: '#fff', dmg: 1.5 * (l.dmg || 1), data: { owner: l.owner, w: 'popcorn' } }); } this.event('pop', { x: l.x, y: l.y }); }
      else if (l.kind === 'tomato') this.splat(l.x, l.y, 'tomato');
      else if (l.kind === 'tot') { this.splat(l.x, l.y, 'tot'); for (let i = 0; i < 6; i++) this.foeShot(l.x, l.y, i / 6 * MT.TAU + .3, 80, 'shard', { life: 1.4, z: 8 }); }
    }
  }
  this.lobs = this.lobs.filter(l => !l.dead);
  // foe shots vs contestants
  for (const b of this.fShots.list) {
    if (b.dead) continue;
    for (const c of this.cs) {
      if (c.state !== 'alive') continue; const d = MT.hyp(b.x - c.x, b.y - c.y);
      if (d < b.r + 4.5) { b.dead = true; if (b.kind === 'shell') this.explode(b.x, b.y, 16, 1, 1, undefined, { src: 'shell', size: .7 }); else this.hurtContestant(c, b.dmg || 1, b.kind, b.id, Math.atan2(b.vy, b.vx)); break; }
      else if (d < b.r + 7 && !b.near && c.invuln <= 0 && (this.nearCap = (this.nearCap || 0)) < 3) { b.near = true; this.nearCap++; this.addRating(.5); }
    }
  }
  this.nearCap = (this.time % 1 < dt) ? 0 : this.nearCap;
  for (const b of this.fShots.list) if (b.dead && b.kind === 'shell' && !b.done) { b.done = true; this.explode(b.x, b.y, 16, 1, 1, undefined, { src: 'shell', size: .7 }); }
  this.pShots.list = this.pShots.list.filter(b => !b.dead);
};

// ---- enemies ------------------------------------------------------------------------------------------------------------
WP.updateEnemies = function (dt) {
  if (this.freezeE > 0) { this.freezeE -= dt; if (this.cheats) return; }
  if (this.cheats && this.cheats.freezeEnemies) return;
  const hash = this.hash || (this.hash = new E.SpatialHash(24)); hash.build(this.enemies.filter(e => e.alive && !e.noSep));
  const living = this.living().filter(c => c.state === 'alive');
  for (const e of this.enemies) {
    if (!e.alive) continue; const A = MT.ENEMIES[e.kind];
    e.age += dt; e.t += dt; e.flash = Math.max(0, e.flash - dt); e.hpPct = Math.max(0, e.hp / e.max);
    if (e.stun > 0) { e.stun -= dt; e.vx = e.vy = 0; if (A.stunUpdate) A.stunUpdate(this, e, dt); continue; }
    if (e.dropT !== undefined && e.dropT > 0) { e.dropT -= dt; e.hidden = e.dropT > 0; if (e.dropT <= 0) { e.invuln = false; e.hidden = false; this.game.particles.dust(e.x, e.y, 2, 8); if (living.some(c => MT.hyp(c.x - e.x, c.y - e.y) < 14)) for (const c of living) if (MT.hyp(c.x - e.x, c.y - e.y) < 14) this.hurtContestant(c, 1, 'drop', 0, MT.angTo(e, c)); } continue; }
    if (e.leap) { const L = e.leap; L.t += dt / .7; const u = Math.min(1, L.t); e.x = L.x0 + (L.x1 - L.x0) * u; e.y = L.y0 + (L.y1 - L.y0) * u; e.z = Math.sin(u * Math.PI) * 40; e.face = Math.atan2(L.y1 - L.y0, L.x1 - L.x0); if (u >= 1) { e.leap = null; e.z = 0; e.invuln = false; e.entering = false; } e.body.x = e.x; e.body.y = e.y; continue; }
    // target
    let tgt = null, td = 1e9; for (const c of living) { const d = MT.hyp(c.x - e.x, c.y - e.y); if (d < td) { td = d; tgt = c; } }
    e.tgt = tgt; e.td = td;
    if (A.update) A.update(this, e, dt, tgt, td);
    // knockback
    if (e.kb[0] || e.kb[1]) { e.x += e.kb[0] * dt * 3; e.y += e.kb[1] * dt * 3; e.kb[0] *= .85; e.kb[1] *= .85; if (Math.abs(e.kb[0]) + Math.abs(e.kb[1]) < 2) e.kb = [0, 0]; }
    // separation
    if (!e.noSep) hash.near(e.x, e.y, 10, o => { if (o === e || !o.alive) return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || .1; if (d < 10) { e.x += dx / d * (10 - d) * .3; e.y += dy / d * (10 - d) * .3; } });
    // walls
    if (e.entering) {
      if (e.x > 16 + e.r && e.x < 352 - e.r && e.y > 16 + e.r && e.y < 224 - e.r) e.entering = false;
    } else if (!e.noWall && A.collide !== false) {
      e.body.x = e.x; e.body.y = e.y; e.body.vx = 0; e.body.vy = 0; e.body.update(0, this.map); e.x = e.body.x; e.y = e.body.y;
      e.x = MT.clamp(e.x, 16 + e.r, 352 - e.r); e.y = MT.clamp(e.y, 16 + e.r, 224 - e.r);
    }
    if (!e.noPush) { const p = this.pushAt(e.x, e.y); e.x += p[0] * dt; e.y += p[1] * dt; }
    // contact damage
    if (A.contact && !e.harmless) for (const c of living) if (MT.hyp(c.x - e.x, c.y - e.y) < e.r + c.r * .75) this.hurtContestant(c, Math.max(0, Math.round(A.contact * MT.T.contactDmg)) || 0, 'contact', e.id, MT.angTo(e, c));
  }
  this.enemies = this.enemies.filter(e => e.alive || (e.deadT = (e.deadT || 0) + dt) < 0);
};
// shared enemy movement helpers (enemy speed multipliers applied)
MT.eSpeed = function (sp) { return sp * MT.T.enemySpeed * MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'].es; };
MT.moveToward = function (w, e, tx, ty, sp, dt) { const dx = tx - e.x, dy = ty - e.y, L = Math.hypot(dx, dy) || 1; e.vx = dx / L * sp; e.vy = dy / L * sp; e.x += e.vx * dt; e.y += e.vy * dt; e.face = Math.atan2(dy, dx); };

// ---- pickups -----------------------------------------------------------------------------------------------------------------
WP.updatePickups = function (dt) {
  const clear = this.phase === 'clear' || this.phase === 'exit';
  for (const p of this.pickups) {
    p.t += dt; if (p.ttl < 1e8) p.ttl -= dt; if (p.ttl <= 0) { p.dead = true; continue; }
    if (p.z > 0 || p.vz > 0) { p.vz -= 260 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.z <= 0) { p.z = 0; p.vz = Math.abs(p.vz) > 50 ? -p.vz * .35 : 0; p.vx *= .5; p.vy *= .5; } p.x = MT.clamp(p.x, 20, 348); p.y = MT.clamp(p.y, 20, 220); }
    const push = this.pushAt(p.x, p.y); if (push[0] || push[1]) { p.x += push[0] * dt; p.y += push[1] * dt; if (p.x < 6) p.x += 372; if (p.x > 374) p.x -= 372; }
    let best = null, bd = 1e9;
    for (const c of this.cs) { if (c.state !== 'alive' && c.state !== 'walkin') continue; const d = MT.hyp(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (!best) continue;
    if (clear && p.cash && bd < 60) { const k = 90 * dt / (bd || 1); p.x += (best.x - p.x) * k * .5 + (best.x - p.x) / bd * 60 * dt; p.y += (best.y - p.y) * k * .5 + (best.y - p.y) / bd * 60 * dt; }
    if (p.caged && !this.keyCage.open) continue;
    if (bd < best.r + p.r && (p.z < 14)) { if (this.mode === 'server') continue; this.collect(best, p); }
  }
  this.pickups = this.pickups.filter(p => !p.dead);
  if (this.puddles) { for (const p of this.puddles) p.t -= dt; this.puddles = this.puddles.filter(p => p.t > 0); }
  for (const d of this.decals) d.t -= dt; this.decals = this.decals.filter(d => d.t > 0);
  for (const p of this.pops) p.t -= dt; this.pops = this.pops.filter(p => p.t > 0);
};
WP.pushAt = function (x, y) { let px = 0, py = 0; for (const h of this.hazards) if (h.push) { const v = h.push(x, y); px += v[0]; py += v[1]; } return [px, py]; };

// ---- doors ----------------------------------------------------------------------------------------------------------------------
WP.setDoorCells = function (dn, id) { for (const [cx, cy] of MT.DOORS[dn].cells) this.map.set(cx, cy, id); };
WP.updateDoors = function (dt) {
  for (const dn in this.doors) {
    const d = this.doors[dn]; d.t += dt;
    if (d.state === 'exit') continue;
    if (d.state === 'closed') { if (d.queue.length && d.queue[0].at - this.time < .35) { d.state = 'opening'; d.t = 0; this.event('doorOpen', { door: dn }); } }
    else if (d.state === 'opening') { if (d.t >= .35) { d.state = 'open'; d.t = 0; d.hold = 0; } }
    else if (d.state === 'open') {
      let spawned = 0;
      while (d.queue.length && d.queue[0].at <= this.time && spawned < 2) { const q = d.queue.shift(); this.spawnAtDoor(dn, q); spawned++; }
      if (!d.queue.length) { d.hold += dt; if (d.hold > .6) { d.state = 'closing'; d.t = 0; } } else d.hold = 0;
    } else if (d.state === 'closing') { if (d.t >= .3) { d.state = 'closed'; d.t = 0; this.game.particles.dust(MT.DOORS[dn].x, MT.DOORS[dn].y, 4, 6); this.event('doorSlam', { door: dn }); } }
  }
  for (let i = this.spawnQ.length - 1; i >= 0; i--) { const q = this.spawnQ[i]; if (q.at <= this.time) { this.spawnQ.splice(i, 1); this.spawnWhere(q); } }
};
WP.openExits = function () {
  for (const dn in (this.rm.exits || {})) { const d = this.doors[dn]; d.state = 'exit'; d.exit = this.rm.exits[dn]; this.setDoorCells(dn, 0); }
  this.event('exitsOpen', {});
};

// ---- waves & phases ----------------------------------------------------------------------------------------------------
WP.startWave = function (i) {
  const w = this.rm.waves[i]; this.waveI = i; this.waveT = this.time;
  for (const s of (w.spawn || [])) { const [door, kind, n, gap] = s; const key = this.rm.key; this.queueSpawn(door, kind, n, gap); if (key && key.rule === 'carrier' && key.kind === kind && i === (key.wave !== undefined ? key.wave : this.rm.waves.length - 1)) this.markCarrier(door, kind); }
  for (const it of (w.items || [])) this.dropItem(it[0], it[1]);
  if (w.script && MT.SCRIPTS[w.script]) MT.SCRIPTS[w.script](this);
  this.event('wave', { i, n: this.rm.waves.length });
};
WP.markCarrier = function (door, kind) {
  const nth = this.rm.key.nth || 1; let seen = 0;
  const arr = DOORS_OK[door] ? this.doors[door].queue : this.spawnQ;
  const list = arr.filter(q => q.kind === kind); const q = list[Math.min(list.length, nth) - 1]; if (q) q.carryKey = true;
};
WP.dropItem = function (kind, where) {
  let x = 184, y = 120, fixed = false, o = {};
  if (Array.isArray(where)) { [x, y] = MT.cellXY(where[0], where[1]); fixed = true; o.pedestal = true; }
  else if (where === 'drop') { let t = 0; do { x = 40 + MT.R.drops() * 288; y = 40 + MT.R.drops() * 160; t++; } while (t < 20 && this.living().some(c => MT.hyp(c.x - x, c.y - y) < 40)); o.z = 90; }
  const k = ['bomb', 'life'].includes(kind) ? kind : 'cap'; o.fixed = fixed; if (k === 'cap') o.w = kind; if (!fixed) o.ttl = 14;
  const p = this.addPickup(k, x, y, o); if (p && o.z) { p.z = o.z; }
  return p;
};
WP.runWaves = function (dt) {
  const rm = this.rm, tw = this.time - this.time0;
  for (const it of this.itemQ) if (!it.done && tw >= it[0] || (!it.done && it.at !== undefined && tw >= it.at)) { it.done = true; this.dropItem(it.kind, it.where); }
  if (this.survive) return this.runSurvive(dt);
  if (rm.green) return this.runGreen(dt);
  const nextI = this.waveI + 1;
  if (nextI < rm.waves.length) {
    const w = rm.waves[nextI]; const since = nextI === 0 ? tw : this.time - this.waveT; let go = false;
    if (nextI === 0) go = since >= (w.at || 0); else { if (w.at !== undefined && since >= w.at) go = true; if (w.left !== undefined && this.alive() <= w.left) go = true; if (w.at === undefined && w.left === undefined) go = true; }
    if (go) this.startWave(nextI);
  } else if (!this.wavesDone) this.wavesDone = true;
  if (this.wavesDone && this.alive() === 0 && !this.scriptBusy) this.roomClear();
};
WP.runSurvive = function (dt) {
  const s = this.survive, rm = this.rm; s.t += dt; const tw = s.t;
  s.acc = s.acc || { g: 0, c: 0, p: 0 };
  if (tw < s.len) {
    s.acc.g += dt; s.acc.c += dt; s.acc.p += dt;
    if (s.acc.g >= 1.2) { s.acc.g = 0; for (const d of 'NESW') this.queueSpawn(d, 'goon', 1, .1); }
    if (s.acc.c >= 4) { s.acc.c = 0; this.queueSpawn(MT.pickOf('spawn', ['N', 'E', 'S', 'W']), 'clapbot', 2, .2); }
    if (s.acc.p >= 7) { s.acc.p = 0; this.queueSpawn(MT.pickOf('spawn', ['N', 'E', 'S', 'W']), 'popper', 1, .2); }
    if (tw >= 20 && this.keyCage && !this.keyCage.open) { this.keyCage.open = true; this.event('cageOpen', {}); }
  } else if (!s.last) { s.last = true; this.queueSpawn('all', 'goon', 4, .2); this.wavesDone = true; }
  if (s.last && this.alive() === 0) this.roomClear();
};
WP.roomClear = function () {
  if (this.phase !== 'waves') return;
  this.phase = 'clear'; this.phaseT = 0; this.cleared = true; this.clearTime = this.time - this.time0; this.fShots.clear();
  const ep = (MT.run && MT.run.ep) || 1, fast = this.rm.par && this.clearTime < this.rm.par;
  for (const c of this.cs) if (c.state === 'alive') { const amt = Math.round(1000 * ep * this.rat.X * (fast ? 1.5 : 1)); this.addCash(c, amt); }
  if (this.rm.key && this.rm.key.rule === 'final' && !this.keyDropped) { this.keyDropped = true; this.addPickup('key', 184, 120, { fixed: true, vz: 100 }); }
  this.event('clear', { fast, time: this.clearTime });
};
WP.stepPhase = function (dt) {
  const rm = this.rm;
  if (this.phase === 'enter') { if (this.phaseT >= 1.2) { this.phase = rm.boss ? 'bossIntro' : 'intro'; this.phaseT = 0; this.event(rm.boss ? 'bossIntro' : 'roomIntro', { room: rm.id }); } }
  else if (this.phase === 'intro') { if (this.phaseT >= (this.demo ? .3 : (this.rm.green ? 1 : 2))) { this.phase = 'waves'; this.phaseT = 0; this.time0 = this.time; this.event('roomStart', {}); } }
  else if (this.phase === 'bossIntro') { if (this.boss.introUpdate) this.boss.introUpdate(this, dt); if (this.bossIntroDone || this.phaseT > 4.2) { this.phase = 'boss'; this.phaseT = 0; this.time0 = this.time; this.boss.start(this); } }
  else if (this.phase === 'waves') this.runWaves(dt);
  else if (this.phase === 'boss') { this.boss.update(this, dt); if (this.boss.dead) { this.phase = 'bossDeath'; this.phaseT = 0; this.boss.deathStart(this); } }
  else if (this.phase === 'bossDeath') { this.boss.deathUpdate(this, dt); if (this.phaseT >= 3.2) { this.phase = 'clear'; this.phaseT = 0; this.bossDead = true; this.cleared = true; this.event('clear', { boss: true }); if (this.onBossDone) this.onBossDone(this); } }
  else if (this.phase === 'clear') {
    if (this.phaseT >= 1.5 && !rm.boss) { this.phase = 'exit'; this.phaseT = 0; this.openExits(); this.event('exit', {}); }
  } else if (this.phase === 'exit') {
    if (this.exitPicked) { this.exitT -= dt; if (this.exitT <= 0 && this.onExit) { const cb = this.onExit; this.onExit = null; cb(this.exitPicked, this.doors[this.exitPicked].exit); } }
    else {
      for (const dn in this.doors) { const d = this.doors[dn]; if (d.state !== 'exit') continue; const D = MT.DOORS[dn]; for (const c of this.cs) if (c.state === 'alive' && MT.hyp(c.x - D.x, c.y - D.y) < 14) { this.exitPicked = dn; this.exitT = .8; this.event('exitPicked', { door: dn }); break; } if (this.exitPicked) break; }
      this.hurryT += dt;
      if (this.hurryT > 25 && !this.hurried) { this.hurried = true; this.event('hurry', {}); }
      if (this.hurried) { this.hurryAcc = (this.hurryAcc || 0) + dt; if (this.hurryAcc >= 6) { this.hurryAcc = 0; for (const dn in this.doors) if (this.doors[dn].state !== 'exit') this.queueSpawn(dn, 'clapbot', 4, .2); } }
    }
  }
};

// ---- the step ------------------------------------------------------------------------------------------------------------
WP.step = function (dt) {
  if (this.mode === 'client') return this.mirrorStep(dt);
  this.time += dt; this.phaseT += dt;
  for (const c of this.cs) if (c.state !== 'gone') c.intent = (this.phase === 'enter' || this.phase === 'bossIntro' && this.bossIntroLock) ? { move: [0, 0] } : this.getIntent(c);
  for (const c of this.cs) if (c.state !== 'gone') this.updateContestant(c, dt);
  this.updateEnemies(dt);
  this.updateProjectiles(dt);
  for (const h of this.hazards) h.update(dt, this);
  this.updatePickups(dt);
  this.updateDoors(dt);
  this.stepPhase(dt);
  this.tickRatings(dt);
  if (this.keyCage && this.keyCage.open && !this.keyCage.gone) { this.keyCage.gone = true; }
  this.shakeT = Math.max(0, this.shakeT - dt);
  if (!MT.cfg.skipRigs) this.animate(dt);
  if (this.cheats && this.cheats.god) for (const c of this.cs) if (c.state === 'alive') c.invuln = Math.max(c.invuln, .1);
  if (this.onAllOut && this.cs.length && this.cs.every(q => q.state === 'out' || q.state === 'gone') && !this.allOutFired) { this.allOutFired = true; this.onAllOut(); }
};

// ---- the Green Room (bonus) ----------------------------------------------------------------------------------------------
WP.runGreen = function (dt) {
  const tw = this.time - this.time0, g = this.green = this.green || { acc: 0, flash: 3, statue: false, done: false, flashT: 0 };
  g.acc += dt * 4; while (g.acc >= 1) { g.acc--; const x = 30 + MT.R.drops() * 308, y = 30 + MT.R.drops() * 180; const k = MT.R.drops(); this.addPickup(k < .12 ? 'prize' : k < .5 ? 'bill' : k < .8 ? 'stack' : 'bar', x, y, { z: 80, ttl: 8 }); }
  g.flash -= dt; if (g.flash <= 0) { g.flash = 3; this.game.flash('#ffffff', .15, .5); this.event('camFlash', {}); }
  if (tw >= 30 && !g.statue) { g.statue = true; this.addPickup('statue', 184, 120, { fixed: true, vz: 100 }); this.event('statueRise', {}); }
  if ((tw >= 40 || this.statuette) && !g.done) { g.done = true; this.phase = 'clear'; this.phaseT = 0; this.cleared = true; if (this.onDone) this.onDone(); }
};

// ===== 12-enemies.js =====
// MASH TV: enemy archetypes (the 5.8 table). Every attack has a wind-up of at least 0.3 s.
const EN = MT.ENEMIES;
const KONF = ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'];
const sp = (e, base) => MT.eSpeed(base + (e.seed - .5) * 12);
function chase(w, e, dt, speed, tgt) {
  if (!tgt) { e.vx = e.vy = 0; return; }
  MT.moveToward(w, e, tgt.x, tgt.y, speed, dt);
}

EN.goon = { hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, palette: ['#3a3a5a', '#ffcc33', '#fff', '#ff2e88'], drops: [['bill', .08], ['cap', .012], ['prize', .01]],
  update(w, e, dt, tgt, td) {
    if (e.state === 'wind') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'recover'; e.t2 = .4; if (tgt && MT.hyp(tgt.x - e.x, tgt.y - e.y) < 22) w.hurtContestant(tgt, 1, 'baton', e.id, e.face); w.event('swing', { x: e.x, y: e.y }); } return; }
    if (e.state === 'recover') { e.t2 -= dt; if (e.t2 <= 0) e.state = 'walk'; return; }
    e.state = 'walk';
    if (tgt && td < 16 && e.cd <= 0) { e.state = 'wind'; e.t2 = .32; e.cd = 1.4; e.face = MT.angTo(e, tgt); return; }
    e.cd -= dt; chase(w, e, dt, sp(e, 52), tgt);
  } };
EN.clapbot = { hp: 1, speed: 115, r: 5.5, contact: 1, cash: 150, rat: 1, palette: ['#c8d0e0', '#2ee6ff', '#ffcc33', '#fff'], drops: [['bill', .1]],
  update(w, e, dt, tgt, td) {
    e.t2 -= dt;
    if (e.state === 'hop') { if (e.t2 <= 0) { e.state = 'squat'; e.t2 = .15; e.vx = e.vy = 0; w.event('clap', { x: e.x, y: e.y }); } else { e.x += e.vx * dt; e.y += e.vy * dt; } return; }
    if (e.state === 'squat' || e.state === 'idle') { if (e.t2 <= 0) { if (tgt) { const a = MT.angTo(e, tgt) + (MT.R.ai() - .5) * 1.4; const s = MT.eSpeed(115); e.vx = Math.cos(a) * s; e.vy = Math.sin(a) * s; e.face = a; } e.state = 'hop'; e.t2 = .25; } }
  } };
function popperBurst(w, e) {
  if (e.burst) return; e.burst = true;
  for (let i = 0; i < 8; i++) w.foeShot(e.x, e.y, i / 8 * MT.TAU + .2, 90, 'shard', { life: 1.2, z: 8 });
  w.game.particles.bits(e.x, e.y, 10, 12, KONF); w.event('popperBurst', { x: e.x, y: e.y });
}
EN.popper = { hp: 2, speed: 38, r: 6, contact: 0, cash: 250, rat: 2, palette: KONF, drops: [['stack', .1], ['cap', .03]],
  onDie(w, e) { popperBurst(w, e); },
  update(w, e, dt, tgt, td) {
    if (e.state === 'fuse') { e.t2 -= dt; if (e.t2 <= 0) { e.noCash = false; w.killEnemy(e, null); } return; }
    if (tgt && td < 18) { e.state = 'fuse'; e.t2 = .6; e.vx = e.vy = 0; w.event('fuse', { x: e.x, y: e.y }); return; }
    e.state = 'walk'; chase(w, e, dt, sp(e, 38), tgt);
  } };
EN.mime = { hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, count: false, palette: ['#fff', '#222', '#ff3344', '#fff'], drops: [['bill', .3]], kb: 0,
  onDie(w, e) { w.game.particles.smoke(e.x, e.y, 10, 4, { size: 4, color: '#fff' }); w.event('mimePfft', { x: e.x, y: e.y }); },
  update(w, e, dt, tgt, td) {
    e.alpha = .45;
    if (e.state === 'tele') { e.t2 -= dt; if (e.t2 <= 0) { for (const c of w.living()) if (c.state === 'alive' && MT.hyp(c.x - e.x, c.y - e.y) < 36 + 4) w.hurtContestant(c, 1, 'mime', e.id, MT.angTo(e, c)); w.game.particles.explosion(e.x, e.y, 6, .6); w.event('mimeBlast', { x: e.x, y: e.y }); e.noCash = true; e.noRating = true; e.alive = false; } return; }
    if (tgt && td < 34) { e.state = 'tele'; e.t2 = .7; w.event('mimeBeep', { x: e.x, y: e.y }); }
  } };
function discoInit(big) { return function (w, e) { e.big = big; if (big) { e.r = 9; } const a = (Math.floor(MT.R.ai() * 4) + .5) * Math.PI / 2; e.dx = Math.cos(a) > 0 ? 1 : -1; e.dy = Math.sin(a) > 0 ? 1 : -1; e.pat = 0; e.cd = 1.5 + MT.R.ai() * 1.5; }; }
EN.disco = { hp: 5, speed: 70, r: 7, contact: 1, cash: 400, rat: 3, palette: ['#c8d0e0', '#ff2e88', '#2ee6ff', '#fff'], drops: [['stack', .2], ['cap', .05]], make: discoInit(false),
  onDie(w, e) { if (e.big) for (let i = 0; i < 2; i++) { const c = w.spawnEnemy('disco', e.x + (i ? 8 : -8), e.y, { hpMul: .6 }); c.hp = c.max = 3 * MT.T.enemyHp; c.dx = i ? 1 : -1; c.dy = e.dy; c.entering = false; } },
  update(w, e, dt) {
    const s = MT.eSpeed(70) * .7071; e.x += e.dx * s * dt; e.y += e.dy * s * dt; e.spin = (e.spin || 0) + dt * 2;
    if (e.x < 16 + e.r) { e.x = 16 + e.r; e.dx = 1; } else if (e.x > 352 - e.r) { e.x = 352 - e.r; e.dx = -1; }
    if (e.y < 16 + e.r) { e.y = 16 + e.r; e.dy = 1; } else if (e.y > 224 - e.r) { e.y = 224 - e.r; e.dy = -1; }
    e.entering = false;
    if (e.state === 'flare') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'idle'; const off = e.pat++ % 2 ? Math.PI / 4 : 0; for (let i = 0; i < 4; i++) w.foeShot(e.x, e.y, off + i * Math.PI / 2, 110, 'beam', { life: 3, z: 14 }); w.event('beam', { x: e.x, y: e.y }); } return; }
    e.cd -= dt; if (e.cd <= 0) { e.cd = 3; e.state = 'flare'; e.t2 = .4; }
  } };
EN.discoBig = Object.assign({}, EN.disco, { hp: 10, r: 9, make: discoInit(true), alias: 'disco' });
function throwAt(w, e, tgt, n) {
  const lead = .6, px = tgt.x + (tgt.vx || 0) * lead, py = tgt.y + (tgt.vy || 0) * lead;
  for (let i = 0; i < n; i++) { const o = n > 1 ? (i - 1) * 16 : 0; w.lob('tomato', e.x, e.y, MT.clamp(px + o, 24, 344), MT.clamp(py + (i % 2) * 10, 24, 216), { time: .6 + i * .08 }); }
  w.event('throw', { x: e.x, y: e.y });
}
function hecklerUpdate(king) {
  return function (w, e, dt, tgt, td) {
    e.entering = false;
    if (!tgt) return;
    if (e.state === 'throw') { e.t2 -= dt; e.face = MT.angTo(e, tgt); if (e.t2 <= 0) { throwAt(w, e, e.aimAt || tgt, king ? 3 : 1); e.state = 'strafe'; e.cd = king ? 2.8 : 2.2; } return; }
    const want = td < 70 ? -1 : td > 110 ? 1 : 0, a = MT.angTo(e, tgt), s = MT.eSpeed(45), side = Math.sin(e.age * .8 + e.seed * 6) > 0 ? 1 : -1;
    e.vx = Math.cos(a) * s * want + Math.cos(a + Math.PI / 2) * s * .5 * side; e.vy = Math.sin(a) * s * want + Math.sin(a + Math.PI / 2) * s * .5 * side;
    e.x += e.vx * dt; e.y += e.vy * dt; e.face = a; e.state = 'strafe'; e.cd -= dt;
    if (e.cd <= 0) { e.state = 'throw'; e.t2 = .45; e.aimAt = { x: tgt.x + (tgt.vx || 0) * .6, y: tgt.y + (tgt.vy || 0) * .6 }; }
  };
}
EN.heckler = { hp: 3, speed: 45, r: 6, contact: 0, cash: 350, rat: 2, palette: ['#d02828', '#fff', '#ffcc33', '#2ee6ff'], drops: [['prize', .06], ['cap', .04]], update: hecklerUpdate(false) };
EN.hecklerKing = { hp: 12, speed: 45, r: 7, contact: 0, cash: 1500, rat: 6, palette: ['#ffcc33', '#d02828', '#fff', '#ff2e88'], drops: [], big: .5, update: hecklerUpdate(true), make(w, e) { e.king = true; } };
EN.tank = { hp: 14, speed: 26, r: 10, contact: 1, cash: 1000, rat: 6, big: 1.2, palette: ['#4a5a6a', '#ffcc33', '#ff9a3c', '#ccc'], drops: [['case', .15], ['cap', .15]], make(w, e) { e.turret = 0; e.body_a = 0; },
  onDie(w, e) { w.explode(e.x, e.y, 28, 1, 6, undefined, { size: 1.3, src: 'tankBoom' }); },
  update(w, e, dt, tgt, td) {
    e.entering = false; if (!tgt) return; const a = MT.angTo(e, tgt);
    e.turret = MT.lerpA(e.turret, a, Math.min(1, 1.4 * dt / Math.max(.05, Math.abs(E.angDiff(e.turret, a)))));
    e.body_a = MT.lerpA(e.body_a, a, Math.min(1, .5 * dt / Math.max(.05, Math.abs(E.angDiff(e.body_a, a)))));
    const s = MT.eSpeed(26); if (e.state !== 'aim') { e.vx = Math.cos(e.body_a) * s; e.vy = Math.sin(e.body_a) * s; if (td > 40) { e.x += e.vx * dt; e.y += e.vy * dt; } e.treadT = (e.treadT || 0) + s * dt; } e.face = e.body_a;
    if (e.state === 'aim') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 2.4; e.recoil = .2; const b = w.foeShot(e.x + Math.cos(e.turret) * 12, e.y + Math.sin(e.turret) * 12, e.turret, 120, 'shell', { r: 4, life: 3 }); if (b) { b.kind = 'shell'; b.data.kind = 'shell'; } w.event('shell', { x: e.x, y: e.y }); } return; }
    if (e.recoil > 0) e.recoil -= dt;
    e.cd -= dt; if (e.cd <= 0) { e.state = 'aim'; e.t2 = .45; w.event('lens', { x: e.x, y: e.y }); }
  } };
EN.snake = { hp: 8, speed: 60, r: 6, contact: 1, cash: 1200, rat: 5, palette: ['#3a3a4a', '#ffcc33', '#ff3344', '#fff'], drops: [['case', .3]], big: .6, kb: 20,
  make(w, e) { e.hist = []; e.lastX = e.x; e.lastY = e.y; e.segs = []; for (let i = 0; i < 10; i++) { const s = w.spawnEnemy('segment', e.x, e.y, { props: { parent: e.id, idx: i } }); s.entering = e.entering; e.segs.push(s.id); } e.dirA = MT.R.ai() * MT.TAU; },
  onDie(w, e) { for (const s of w.enemies) if (s.kind === 'segment' && s.parent === e.id && s.alive) { s.noCash = true; s.noRating = true; s.alive = false; w.game.particles.bits(s.x, s.y, 8, 4, KONF); } },
  update(w, e, dt, tgt, td) {
    if (!tgt) return; e.t2 -= dt; const a = MT.angTo(e, tgt);
    if (e.state === 'rear') { if (e.t2 <= 0) { e.state = 'lunge'; e.t2 = .6; e.face = a; } return; }
    let s = MT.eSpeed(60); if (e.state === 'lunge') { s *= 1.5; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 3 + MT.R.ai() * 2; } } else { e.cd -= dt; if (e.cd <= 0 && td < 110) { e.state = 'rear'; e.t2 = .5; return; } }
    const wa = a + Math.sin(e.age * 3) * .7; e.x += Math.cos(wa) * s * dt; e.y += Math.sin(wa) * s * dt; e.face = wa;
    const d = Math.hypot(e.x - e.lastX, e.y - e.lastY); if (d >= 6) { e.hist.unshift([e.x, e.y]); e.lastX = e.x; e.lastY = e.y; if (e.hist.length > 40) e.hist.pop(); }
  } };
EN.segment = { hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, count: false, noSep: true, noWall: true, palette: ['#3a3a4a', '#ffcc33', '#fff'], drops: [], kb: 0,
  update(w, e, dt) {
    const h = w.enemies.find(q => q.id === e.parent && q.alive); if (!h) { e.alive = false; return; }
    let order = 0; for (const o of w.enemies) if (o.kind === 'segment' && o.parent === e.parent && o.alive && o.idx < e.idx) order++;
    const p = h.hist[order]; if (p) { e.x += (p[0] - e.x) * Math.min(1, dt * 20); e.y += (p[1] - e.y) * Math.min(1, dt * 20); } else { e.x += (h.x - e.x) * Math.min(1, dt * 6); e.y += (h.y - e.y) * Math.min(1, dt * 6); }
    e.entering = false; e.face = h.face;
  } };
EN.brute = { hp: 24, speed: 40, r: 10, contact: 2, cash: 2000, rat: 8, big: 1.4, palette: ['#8a5a32', '#ff3344', '#ffcc33', '#fff'], drops: [['case', .4], ['cap', .25]], kb: 8,
  make(w, e) { e.cd = 2 + MT.R.ai() * 2; },
  update(w, e, dt, tgt, td) {
    e.vulnerable = false;
    if (e.state === 'stunned') { e.vulnerable = true; e.t2 -= dt; if (e.t2 <= 0) { e.state = 'walk'; e.cd = 3; } return; }
    if (!tgt) return;
    if (e.state === 'tele') { e.t2 -= dt; if (e.t2 <= 0) { e.state = 'charge'; e.t2 = 1.4; e.cA = MT.angTo(e, tgt); w.event('roar', { x: e.x, y: e.y }); } return; }
    if (e.state === 'charge') {
      e.t2 -= dt; const s = MT.eSpeed(220); e.x += Math.cos(e.cA) * s * dt; e.y += Math.sin(e.cA) * s * dt; e.face = e.cA; e.vx = Math.cos(e.cA) * s; e.vy = Math.sin(e.cA) * s;
      if (e.x < 16 + e.r + 1 || e.x > 352 - e.r - 1 || e.y < 16 + e.r + 1 || e.y > 224 - e.r - 1 || e.t2 <= 0) { const hit = e.t2 > 0; e.state = 'stunned'; e.t2 = 1.5; e.x = MT.clamp(e.x, 16 + e.r, 352 - e.r); e.y = MT.clamp(e.y, 16 + e.r, 224 - e.r); if (hit) { w.game.shake(4); w.game.particles.dust(e.x, e.y, 6, 8); w.event('wallCrash', { x: e.x, y: e.y }); } }
      return;
    }
    e.state = 'walk'; chase(w, e, dt, MT.eSpeed(40), tgt); e.cd -= dt; if (e.cd <= 0) { e.state = 'tele'; e.t2 = .85; e.cd = 4; e.face = MT.angTo(e, tgt); w.event('stomp', { x: e.x, y: e.y }); }
  } };
EN.crate = { hp: 3, speed: 0, r: 8, contact: 0, cash: 0, rat: 0, count: false, noSep: true, static: true, noWall: true, palette: ['#c8a050', '#8a5a32', '#fff'], drops: [], kb: 0, noHpMul: true, update() {} };
EN.lock = { hp: 15, speed: 0, r: 6, contact: 0, cash: 500, rat: 2, count: false, noSep: true, static: true, noWall: true, palette: ['#ffcc33', '#888', '#fff'], drops: [], kb: 0, noHpMul: true, update() {},
  onDie(w, e) { if (!w.enemies.some(q => q.alive && q !== e && q.kind === 'lock')) { w.safeOpen = true; w.event('safeOpen', {}); if (w.rm.key && w.rm.key.rule === 'vault') w.addPickup('key', 90, 40, { fixed: true, vz: 90 }); for (let i = 0; i < 10; i++) { const a = MT.R.drops() * MT.TAU; w.addPickup('stack', 90, 36, { vx: Math.cos(a) * 60, vy: 20 + Math.abs(Math.sin(a)) * 50, vz: 100 }); } } } };
// push contestants out of static enemies (crates)
WP.pushOutStatics = function (c) {
  for (const e of this.enemies) if (e.alive && e.static && e.kind === 'crate') { const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy), m = e.r + c.r - 1; if (d < m && d > .01) { c.body.x = c.x = e.x + dx / d * m; c.body.y = c.y = e.y + dy / d * m; } }
};

// ===== 13-bosses.js =====
// MASH TV: the boss framework and the three bosses. Boss drawing reads only the fields below (x, y, phase, sub, rot, open, parts[]).
WP.nearest = function (x, y) { let b = null, bd = 1e9; for (const c of this.cs) if (c.state === 'alive') { const d = MT.hyp(c.x - x, c.y - y); if (d < bd) { bd = d; b = c; } } return b || this.cs[0] || { x: 184, y: 160 }; };
WP.ring = function (x, y, n, speed, off, kind, o) { for (let i = 0; i < n; i++) this.foeShot(x, y, off + i / n * MT.TAU, speed, kind || 'orb', o); };
WP.bossSetup = function () { const B = MT.BOSSES[this.rm.boss]; this.boss = new B(this); this.bossIntroLock = false; };

class Boss {
  constructor(w, kind, name) {
    this.kind = kind; this.name = name; this.x = 184; this.y = 70; this.phase = 1; this.sub = 'idle'; this.t = 0; this.dead = false; this.parts = []; this.rot = 0; this.open = false;
    this.mul = MT.T.bossHp * (1 + .5 * (Math.max(1, w.nPlayers) - 1)); this.rs = this; this.timers = {}; this.stunT = 0; this.deathT = 0; this.flash = 0; this.hidden = false;
  }
  addPart(id, ox, oy, r, hp, o = {}) { const p = Object.assign({ id, ox, oy, r, hp: hp * this.mul, max: hp * this.mul, armor: 1, weak: 1, alive: true, active: true, flash: 0 }, o); this.parts.push(p); return p; }
  part(id) { return this.parts.find(p => p.id === id); }
  px(p) { return this.x + p.ox; } py(p) { return this.y + p.oy; }
  partAlive(id) { const p = this.part(id); return !!(p && p.alive); }
  hitParts() { const out = []; if (this.hidden || this.dead) return out; for (const p of this.parts) if (p.alive && p.active) out.push({ isPart: true, boss: this, part: p, x: this.px(p), y: this.py(p), r: p.r, alive: true }); return out; }
  armorOf(p) { const a = typeof p.armor === 'function' ? p.armor(this) : p.armor; return a * (p.weakNow ? p.weakNow(this) : 1); }
  hitPart(w, t, dmg, owner, ang) {
    const p = t.part; if (!p.alive) return; let d = dmg * this.armorOf(p);
    if (this.invulnerable && this.invulnerable(p)) d = 0;
    if (w.cheats && w.cheats.oneHit) d = 9999;
    if (d < dmg * .2 && d > 0) { w.game.particles.sparks(t.x, t.y, 14, 2); w.event('tink', { x: t.x, y: t.y }); }
    else if (d > 0) { w.game.particles.sparks(t.x, t.y, 14, 2, ang); w.event('bossHit', { x: t.x, y: t.y }); }
    p.hp -= d; p.flash = .08; this.flash = .08;
    if (p.hp <= 0) this.killPart(w, p, owner);
  }
  killPart(w, p, owner) {
    p.alive = false; p.hp = 0; const x = this.px(p), y = this.py(p);
    w.game.particles.explosion(x, y, 14, 1); w.game.shake(4); w.addRating(10); w.event('partDown', { id: p.id, x, y, boss: this.kind });
    const c = w.cs.find(q => q.slot === owner); if (c) w.addCash(c, 1000 * ((MT.run && MT.run.ep) || 1));
    if (p.onDestroy) p.onDestroy(w, this);
  }
  hitCircle(w, x, y, r, dmg, owner) { for (const t of this.hitParts()) if (MT.hyp(t.x - x, t.y - y) < r + t.r) this.hitPart(w, t, dmg, owner, 0); }
  hitRay(w, ox, oy, a, len, dmg, owner) { const dx = Math.cos(a), dy = Math.sin(a); for (const t of this.hitParts()) { const px = t.x - ox, py = t.y - oy, tt = px * dx + py * dy; if (tt < 0 || tt > len + t.r) continue; if (Math.abs(px * dy - py * dx) < t.r + 2) this.hitPart(w, t, dmg, owner, a); } }
  hitAll(w, dmg, owner) { for (const t of this.hitParts()) this.hitPart(w, t, dmg, owner, 0); }
  tick(dt) { for (const k in this.timers) if (this.timers[k] > 0) this.timers[k] -= dt; for (const p of this.parts) if (p.flash > 0) p.flash -= dt; if (this.flash > 0) this.flash -= dt; }
  due(k, every, dt) { if (this.timers[k] === undefined) this.timers[k] = every; if (this.timers[k] <= 0) { this.timers[k] = every; return true; } return false; }
  hpFrac() { let hp = 0, max = 0; for (const p of this.parts) if (p.main) { hp += Math.max(0, p.hp); max += p.max; } return max ? hp / max : 0; }
  start(w) {} introUpdate(w, dt) {} deathStart(w) { this.deathT = 0; } deathUpdate(w, dt) {}
  toNet() { return [this.kind, Math.round(this.x * 10), Math.round(this.y * 10), this.phase, this.sub, Math.round(this.rot * 1000), this.open ? 1 : 0, this.hidden ? 1 : 0, this.dead ? 1 : 0, this.parts.map(p => p.alive ? Math.max(1, Math.round(p.hp / p.max * 100)) : 0), this.extra ? this.extra() : 0]; }
  fromNet(a) { this.x = a[1] / 10; this.y = a[2] / 10; this.phase = a[3]; this.sub = a[4]; this.rot = a[5] / 1000; this.open = !!a[6]; this.hidden = !!a[7]; this.dead = !!a[8]; a[9].forEach((v, i) => { const p = this.parts[i]; if (p) { p.alive = v > 0; p.hp = v / 100 * p.max; } }); if (this.fromExtra) this.fromExtra(a[10]); }
  contact(w, dt) { for (const c of w.cs) if (c.state === 'alive' && MT.hyp(c.x - this.x, c.y - this.y) < (this.contactR || 0) + c.r * .7) w.hurtContestant(c, this.contactDmg || 1, 'boss', 0, MT.angTo(this, c)); }
}
MT.Boss = Boss;
const chain = (w, x, y, n) => { for (let i = 0; i < n; i++) w.game.after(i * .15, () => w.game.particles.explosion(x + (MT.fxr() - .5) * 40, y + (MT.fxr() - .5) * 30, 10, 1)); };

// ---- MASHY ----------------------------------------------------------------------------------------------------------------
class Mashy extends Boss {
  constructor(w) {
    super(w, 'mashy', 'MASHY'); this.x = 184; this.y = -40; this.contactR = 26; this.dir = 1; this.contactDmg = 1; this.sub = 'enter';
    this.addPart('body', 0, 0, 26, 160, { main: true, armor: b => (b.partAlive('armL') || b.partAlive('armR')) ? .15 : .5 });
    this.addPart('armL', -30, 6, 10, 45); this.addPart('armR', 30, 6, 10, 45);
    this.addPart('hatch', 0, 14, 9, 160 * .5, { active: false, weakNow: b => 2, armor: 1, hatch: true });
    this.part('hatch').hp = this.part('hatch').max = 80 * this.mul;
    this.part('armL').onDestroy = (w, b) => { w.game.particles.smoke(b.x - 30, b.y + 6, 12, 8); };
    this.part('armR').onDestroy = (w, b) => { w.game.particles.smoke(b.x + 30, b.y + 6, 12, 8); };
    this.part('hatch').main = false; this.eyeJ = 0; this.treadT = 0;
  }
  introUpdate(w, dt) { this.t += dt; this.y = Math.min(70, this.y + 55 * dt); this.treadT += 55 * dt; }
  start(w) { this.sub = 'fight'; this.y = 70; this.t = 0; }
  update(w, dt) {
    this.tick(dt); this.t += dt; this.eyeJ += dt; const body = this.part('body'), hatch = this.part('hatch');
    const armL = this.partAlive('armL'), armR = this.partAlive('armR');
    if (this.phase === 1 && !armL && !armR) { this.phase = 2; this.t = 0; this.timers = {}; }
    if (this.phase === 2 && body.hp / body.max < .35) { this.phase = 3; this.t = 0; this.timers = {}; this.sub = 'rest'; this.charges = 0; w.event('bossPhase3', { boss: 'mashy' }); this.restT = 1; }
    hatch.active = this.open && hatch.alive;
    const near = w.nearest(this.x, this.y);
    if (this.phase === 1) {
      this.x += this.dir * 30 * dt; this.treadT += 30 * dt; if (this.x > 268) this.dir = -1; if (this.x < 100) this.dir = 1; this.y = 70;
      const fast = (armL ^ armR) ? 1.3 : 1;
      if (armL && this.due('butter', 1.8 / fast, dt)) { const a = MT.angTo({ x: this.x - 30, y: this.y + 6 }, near); for (let i = -2; i <= 2; i++) w.foeShot(this.x - 30, this.y + 10, a + i * .225, 95, 'butter', { r: 3.5 }); w.event('bossShoot', { x: this.x, y: this.y }); }
      if (armR) { if (this.sub === 'stream') { this.streamT -= dt; this.streamAcc += dt * 10 * fast; while (this.streamAcc >= 1) { this.streamAcc--; const u = 1 - this.streamT / 1.2; w.foeShot(this.x + 30, this.y + 10, this.streamA + (u - .5) * 1.75, 120, 'gravy', { r: 3 }); } if (this.streamT <= 0) this.sub = 'fight'; }
        else if (this.due('gravy', 3.2 / fast, dt)) { this.sub = 'stream'; this.streamT = 1.2; this.streamAcc = 0; this.streamA = MT.angTo({ x: this.x + 30, y: this.y }, near); } }
    } else if (this.phase === 2) {
      this.x += this.dir * 25 * dt; this.treadT += 25 * dt; if (this.x > 268) this.dir = -1; if (this.x < 100) this.dir = 1;
      if (this.open) { if (this.t - this.openAt > 2.2) this.open = false; } else if (this.due('hatch', 4.5, dt)) { this.open = true; this.openAt = this.t; w.event('hatchOpen', {}); }
      if (this.due('ring', 2.5, dt)) { this.ringN = (this.ringN || 0) + 1; w.ring(this.x, this.y + 8, 14, 80, this.ringN % 2 ? .22 : 0, 'orb'); }
      if (this.due('tot', 5, dt)) for (let i = 0; i < 3; i++) { const c = w.cs[i % Math.max(1, w.cs.length)] || near; w.lob('tot', this.x, this.y, MT.clamp(c.x + (i - 1) * 24, 30, 338), MT.clamp(c.y, 40, 210), { time: .9 }); }
      if (this.due('goons', 9, dt)) w.queueSpawn('S', 'goon', 6, .3);
    } else {
      if (this.sub === 'rest') { this.restT -= dt; this.open = true; if (this.restT <= 0) { this.open = false; this.sub = 'tele'; this.teleT = .9; this.ca = MT.angTo(this, near); } }
      else if (this.sub === 'tele') { this.teleT -= dt; this.ca = MT.angTo(this, near); this.treadT += 20 * dt; if (this.teleT <= 0) { this.sub = 'charge'; this.cvx = Math.cos(this.ca) * 170; this.cvy = Math.sin(this.ca) * 170; } }
      else if (this.sub === 'charge') {
        this.x += this.cvx * dt; this.y += this.cvy * dt; this.treadT += 170 * dt; let hit = false;
        if (this.x < 46) { this.x = 46; this.cvx = Math.abs(this.cvx); hit = true; } if (this.x > 322) { this.x = 322; this.cvx = -Math.abs(this.cvx); hit = true; }
        if (this.y < 44) { this.y = 44; this.cvy = Math.abs(this.cvy); hit = true; } if (this.y > 196) { this.y = 196; this.cvy = -Math.abs(this.cvy); hit = true; }
        this.contactDmg = 2; this.contact(w, dt);
        if (hit) { w.game.shake(5); this.charges++; w.event('wallCrash', { x: this.x, y: this.y }); this.sub = this.charges % 3 === 0 ? 'rest2' : 'tele'; this.teleT = .9; this.restT = 2.5; if (this.sub === 'rest2') { this.sub = 'rest'; } }
      }
      if (this.due('clap', 10, dt)) w.queueSpawn('sides', 'clapbot', 3, .2);
      if (this.sub !== 'charge') { this.contactDmg = 1; }
      if (this.sub === 'rest') this.y += (70 - this.y) * Math.min(1, dt * 1.5);
    }
    this.x = MT.clamp(this.x, 46, 322);
    if (this.phase < 3 || this.sub !== 'charge') this.contact(w, dt);
    if (this.part('body').hp <= 0) this.dead = true;
  }
  deathStart(w) { this.open = true; this.hidden = false; w.event('bossDead', { boss: 'mashy', x: this.x, y: this.y }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); }
  deathUpdate(w, dt) {
    this.deathT += dt; if (Math.floor((this.deathT - dt) * 7) !== Math.floor(this.deathT * 7) && this.deathT < 2) w.game.particles.explosion(this.x + (MT.fxr() - .5) * 60, this.y + (MT.fxr() - .5) * 40, 14, 1);
    if (this.deathT >= 2 && !this.shower) { this.shower = true; w.game.flash('#ffffff', .3, .8); w.game.particles.bits(this.x, this.y, 20, 60, ['#e8d8a0', '#fff', '#c8a860']); w.scatterCash(this.x, this.y, 30); w.addPickup('prize', this.x - 20, this.y + 20, { vz: 120, vx: -30, vy: 30 }); w.addPickup('prize', this.x + 20, this.y + 20, { vz: 120, vx: 30, vy: 30 }); w.addPickup('cap', this.x, this.y + 30, { vz: 120 }); this.gone = true; }
  }
  extra() { return [Math.round(this.treadT * 10), this.ca ? Math.round(this.ca * 100) : 0, this.sub === 'tele' ? 1 : 0]; }
  fromExtra(a) { if (!a) return; this.treadT = a[0] / 10; this.ca = a[1] / 100; this.teleOn = !!a[2]; }
}
MT.BOSSES.mashy = Mashy;

// ---- THE WHEEL OF MISFORTUNE -------------------------------------------------------------------------------------------------
const SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
MT.WHEEL_SEGS = SEGS;
class Wheel extends Boss {
  constructor(w) {
    super(w, 'wheel', 'THE WHEEL OF MISFORTUNE'); this.x = 184; this.y = 74; this.contactR = 0; this.rot = 0; this.sub = 'idle'; this.void = [0, 0, 0, 0, 0, 0, 0, 0]; this.pointerSeg = 0; this.click = 0;
    this.addPart('core', 0, 0, 14, 220, { main: true, armor: b => (b.phase === 1 && !b.jackpotOn) ? .15 : 1 });
    for (let i = 0; i < 8; i++) { const p = this.addPart('b' + i, 0, 0, 7, 18); p.seg = i; p.onDestroy = (w, b) => { b.void[i] = 1; }; }
    this.forced = null;
  }
  segAngle(i) { return this.rot + (i + .5) * Math.PI / 4; }
  hitParts() { for (const p of this.parts) if (p.seg !== undefined) { const a = this.segAngle(p.seg); p.ox = Math.cos(a) * 34; p.oy = Math.sin(a) * 34; } return super.hitParts(); }
  introUpdate(w, dt) { this.rot += dt * 2; }
  start(w) { this.sub = 'spin'; this.t = 0; this.spinFrom = this.rot; this.spinDur = 2.5; this.pick(w); }
  pick(w) {
    const live = []; for (let i = 0; i < 8; i++) if (!this.void[i]) live.push(i);
    this.target = this.forced && this.forced.length ? this.forced.shift() : live[Math.floor(MT.R.ai() * live.length)] !== undefined ? live[Math.floor(MT.R.ai() * live.length)] : 7;
    if (this.void[this.target]) this.target = live[0];
    const dest = -Math.PI / 2 - (this.target + .5) * Math.PI / 4; let delta = ((dest - this.spinFrom) % MT.TAU + MT.TAU) % MT.TAU; delta += MT.TAU * (3 + Math.floor(MT.R.ai() * 2)); this.spinTo = this.spinFrom + delta;
  }
  update(w, dt) {
    this.tick(dt); this.t += dt; const core = this.part('core');
    const gone = this.void.reduce((a, b) => a + b, 0);
    if (this.phase === 1 && gone >= 4) { this.phase = 2; this.sub = 'break'; this.t = 0; w.event('wheelBreaks', {}); w.game.shake(6); this.vx = 60; this.vy = 60; this.contactR = 40; this.contactDmg = 2; this.rollT = 0; }
    if (this.sub === 'spin') {
      const u = Math.min(1, this.t / this.spinDur), k = E.ease.outCubic(u), prev = this.rot; this.rot = this.spinFrom + (this.spinTo - this.spinFrom) * k;
      const segNow = Math.floor((((-Math.PI / 2 - this.rot) % MT.TAU + MT.TAU) % MT.TAU) / (Math.PI / 4)); if (segNow !== this.pointerSeg) { this.pointerSeg = segNow; this.click = .1; w.event('wheelClick', {}); }
      if (u >= 1) { this.sub = 'attack'; this.t = 0; this.stopped = this.target; w.event('wheelStop', { seg: this.target, name: SEGS[this.target] }); this.beginAttack(w); }
    } else if (this.sub === 'attack') { this.attackUpdate(w, dt); }
    else if (this.sub === 'stun') { this.stunT -= dt; if (this.stunT <= 0) { this.jackpotOn = false; this.nextSpin(w); } }
    else if (this.sub === 'break') {
      // phase 2: rolls around the arena
      this.x += this.vx * dt; this.y += this.vy * dt; this.rot += dt * 3; let hit = false;
      if (this.x < 56) { this.x = 56; this.vx = Math.abs(this.vx); hit = true; } if (this.x > 312) { this.x = 312; this.vx = -Math.abs(this.vx); hit = true; }
      if (this.y < 76) { this.y = 76; this.vy = Math.abs(this.vy); hit = true; } if (this.y > 184) { this.y = 184; this.vy = -Math.abs(this.vy); hit = true; }
      const sp = 85, l = Math.hypot(this.vx, this.vy) || 1; this.vx *= sp / l; this.vy *= sp / l;
      if (hit) { w.event('wallCrash', { x: this.x, y: this.y }); for (let i = 0; i < 8; i++) w.foeShot(this.x, this.y, i / 8 * MT.TAU + this.t, 75, 'orb'); }
      this.contact(w, dt);
      if (this.t > 6 && this.sub === 'break') { this.sub = 'spin2'; this.t = 0; this.spinFrom = this.rot; this.spinDur = 1.8; this.pick(w); this.vxs = this.vx; this.vys = this.vy; }
    } else if (this.sub === 'spin2') {
      const u = Math.min(1, this.t / this.spinDur); this.rot = this.spinFrom + (this.spinTo - this.spinFrom) * E.ease.outCubic(u);
      if (u >= 1) { this.stopped = this.target; w.event('wheelStop', { seg: this.target, name: SEGS[this.target] }); this.beginAttack(w); this.sub = 'attack2'; this.t = 0; }
    } else if (this.sub === 'attack2') { this.attackUpdate(w, dt); }
    if (this.click > 0) this.click -= dt;
    core.main = true; if (core.hp <= 0) this.dead = true;
  }
  nextSpin(w) { this.sub = this.phase === 2 ? 'break' : 'spin'; this.t = 0; this.spinFrom = this.rot; this.spinDur = this.fastSpin ? 1.6 : 2.5; this.fastSpin = false; if (this.phase === 1) this.pick(w); else { this.vx = this.vxs || 60; this.vy = this.vys || 60; } this.attackTimes = null; this.beams = null; }
  beginAttack(w) {
    const s = this.stopped, near = w.nearest(this.x, this.y); this.attackT = 0; this.attackDur = 4 + MT.R.ai() * 2; this.fired = 0; this.beams = null;
    switch (s) {
      case 0: this.attackDur = 3.2; break;
      case 1: this.beams = [0, 1, 2, 3].map(i => ({ a: MT.R.ai() * MT.TAU + i * Math.PI / 2, t: 0 })); this.attackDur = 5.2; break;
      case 2: { let n = 0, tries = 0; while (n < 6 && tries < 80) { tries++; const x = 40 + MT.R.ai() * 288, y = 70 + MT.R.ai() * 140; if (w.living().every(c => MT.hyp(c.x - x, c.y - y) > 40)) { const m = w.spawnEnemy('mime', x, y, {}); m.entering = false; w.game.particles.smoke(x, y, 8, 5, { size: 3, color: '#fff' }); n++; } } this.attackDur = 2.5; break; }
      case 3: w.loseRating(10); w.event('bankrupt', {}); for (let k = 0; k < 2; k++) w.ring(this.x, this.y, 20, 85 * (this.boost || 1), k * .157, 'coin'); this.attackDur = 2.5; break;
      case 4: for (let i = 0; i < 2; i++) { const e = w.spawnEnemy('disco', this.x + (i ? 30 : -30), this.y + 20, {}); e.entering = false; } this.attackDur = 4; break;
      case 5: w.queueSpawn('sides', 'goon', 5, .25); w.queueSpawn('S', 'goon', 2, .25); this.attackDur = 5; break;
      case 6: w.game.particles.bits(184, 120, 30, 60, ['#ffcc33', '#fff', '#ff2e88']); w.scatterCash(this.x, this.y + 30, 20); w.addPickup('cap', this.x, this.y + 40, { vz: 100 }); this.jackpotOn = true; this.stunT = 3; this.sub = this.phase === 2 ? 'stun' : 'stun'; w.event('jackpot', {}); return;
      case 7: this.fastSpin = true; this.boost = 1.2; w.event('spinAgain', {}); this.nextSpin(w); return;
    }
    this.sub = this.phase === 2 ? 'attack2' : 'attack';
  }
  attackUpdate(w, dt) {
    this.attackT += dt; const s = this.stopped, near = w.nearest(this.x, this.y);
    if (s === 0) { const want = Math.floor(this.attackT / .3); while (this.fired < Math.min(8, want)) { this.fired++; const left = MT.R.ai() < .5, c = w.cs[this.fired % Math.max(1, w.cs.length)] || near; const ax = left ? -30 : 398, ay = 40 + MT.R.ai() * 160; w.lob('tomato', ax, ay, MT.clamp(c.x + (MT.R.ai() - .5) * 30, 26, 342), MT.clamp(c.y + (MT.R.ai() - .5) * 30, 26, 214), { time: .8, z0: 30 }); w.event('throw', { x: ax, y: ay }); } }
    if (s === 1 && this.beams) { for (const b of this.beams) { b.t += dt; const tele = .8; if (b.t > tele) { const u = Math.min(1, (b.t - tele) / 4); b.ang = b.a + u * 1.2; for (const c of w.cs) if (c.state === 'alive') { const px = c.x - this.x, py = c.y - this.y, ax = Math.cos(b.ang), ay = Math.sin(b.ang), tt = px * ax + py * ay; if (tt > 0 && Math.abs(px * ay - py * ax) < 5) w.hurtContestant(c, 1, 'beam', 0, b.ang); } } else b.ang = b.a; } }
    if (this.attackT >= this.attackDur) { this.boost = 1; this.nextSpin(w); this.beams = null; }
    if (this.phase === 2 && this.sub === 'attack2') { /* wheel stands still while landing; the roll resumes */ if (this.attackT >= this.attackDur) { this.sub = 'break'; this.t = 0; this.vx = this.vxs || 60; this.vy = this.vys || 60; } }
  }
  deathStart(w) { w.event('bossDead', { boss: 'wheel', x: this.x, y: this.y }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.beams = null; }
  deathUpdate(w, dt) { this.deathT += dt; this.rot += dt * Math.max(0, 6 - this.deathT * 2.5); if (Math.floor((this.deathT - dt) * 6) !== Math.floor(this.deathT * 6) && this.deathT < 2.4) w.game.particles.explosion(this.x + (MT.fxr() - .5) * 60, this.y + (MT.fxr() - .5) * 60, 10, .8); if (this.deathT >= 2.4 && !this.shower) { this.shower = true; w.game.flash('#fff', .3, .7); w.scatterCash(this.x, this.y, 30); w.addPickup('prize', this.x - 16, this.y + 20, { vz: 120, vx: -30 }); w.addPickup('prize', this.x + 16, this.y + 20, { vz: 120, vx: 30 }); w.addPickup('cap', this.x, this.y + 30, { vz: 120 }); } }
  extra() { return [this.stopped === undefined ? -1 : this.stopped, this.jackpotOn ? 1 : 0, this.beams ? this.beams.map(b => Math.round((b.ang || b.a) * 100) + (b.t > .8 ? 10000 : 0)) : 0, this.void.join('')]; }
  fromExtra(a) { if (!a) return; this.stopped = a[0] < 0 ? undefined : a[0]; this.jackpotOn = !!a[1]; this.beams = a[2] ? a[2].map(v => ({ ang: (v % 10000) / 100, t: v >= 10000 ? 1 : 0 })) : null; this.void = a[3].split('').map(Number); }
}
MT.BOSSES.wheel = Wheel;

// ---- LANCE LUSTRE LIVE! -> THE NETWORK ------------------------------------------------------------------------------------------------
class Lance extends Boss {
  constructor(w) {
    super(w, 'lance', 'LANCE LUSTRE'); this.x = 184; this.y = 96; this.contactR = 0; this.stage = 'starmaker'; this.sub = 'enter'; this.cycle = 0; this.bob = 0; this.breaks = 0; this.wallU = 0; this.channels = []; this.eyeOpen = 0;
    this.addPart('podium', 0, 0, 22, 260, { main: true }); this.addPart('turL', -38, 4, 8, 30); this.addPart('turR', 38, 4, 8, 30);
    for (let i = 0; i < 12; i++) { const col = i % 4, row = Math.floor(i / 4); const tx = [96, 132, 236, 272][col], ty = 28 + row * 22; const p = this.addPart('tv' + i, 0, 0, 10, 22, { active: false, alive: false, tv: true, tx, ty }); p.hp = p.max = 22 * this.mul; }
    this.addPart('eye', 0, 0, 18, 300, { active: false, alive: false, main: false, armor: b => b.tvsGone() >= 8 ? 1 : .15 });
    this.cones = []; this.shock = null; this.slam = null; this.entered = false;
  }
  tvsGone() { return this.parts.filter(p => p.tv && !p.alive && p.wasAlive).length; }
  px(p) { return p.tv ? p.tx : p.id === 'eye' ? 184 : this.x + p.ox; }
  py(p) { return p.tv ? p.ty : p.id === 'eye' ? 54 : this.y + p.oy; }
  introUpdate(w, dt) { this.t += dt; this.bob += dt; }
  start(w) { this.sub = 'cycle'; this.t = 0; this.timers = {}; this.pattern = 0; this.startPattern(w); }
  invulnerable(p) { return this.hidden; }
  update(w, dt) { this.tick(dt); this.t += dt; this.bob += dt; if (this.stage === 'starmaker') this.updateA(w, dt); else this.updateB(w, dt); }
  hover(w, dt) {
    const near = w.nearest(this.x, this.y), d = MT.hyp(near.x - this.x, near.y - this.y), a = MT.angTo(near, this);
    let tx = this.x, ty = this.y; if (d < 100 || d > 140) { const want = MT.clamp(d, 100, 140); tx = near.x + Math.cos(a) * want; ty = near.y + Math.sin(a) * want; }
    tx = MT.clamp(tx, 70, 298); ty = MT.clamp(ty, 84, 125); this.x += (tx - this.x) * Math.min(1, dt * 1.2); this.y += (ty - this.y) * Math.min(1, dt * 1.2);
  }
  startPattern(w) { const seq = ['cyclone', 'micdrop', 'sweep']; this.sub = seq[this.pattern % 3]; this.pattern++; this.t = 0; this.cyc = 0; this.slam = null; this.cones = []; if (this.sub === 'sweep') { this.cones = ['turL', 'turR'].filter(id => this.partAlive(id)).map((id, i) => ({ id, a: MT.angTo(this, w.nearest(this.x, this.y)) + (i ? .5 : -.5), dir: i ? -1 : 1, lit: 0, t: 0 })); if (!this.cones.length) { this.cones = []; } } }
  updateA(w, dt) {
    const pod = this.part('podium'), f = pod.hp / pod.max;
    if (this.sub === 'break') {
      this.t += 0; this.breakT -= dt; this.hidden = true; this.x += (184 - this.x) * dt; this.y = Math.max(40, this.y - 60 * dt);
      if (this.breakT <= 0 || (this.breakT < 9.5 && w.alive() === 0)) { this.hidden = false; this.y = 96; this.x = 184; this.sub = 'cycle'; this.pattern = 0; this.startPattern(w); }
      return;
    }
    if (this.hidden) this.hidden = false;
    if (f <= .66 && this.breaks === 0 || f <= .33 && this.breaks === 1) { this.breaks++; this.sub = 'break'; this.breakT = 12; this.hidden = true; w.fShots.clear(); w.event('commercial', {}); w.queueSpawn('N', 'goon', 6, .3); w.queueSpawn('sides', 'clapbot', 3, .3); w.queueSpawn('S', 'brute', 1, .5); return; }
    if (pod.hp <= 0) { this.crash(w); return; }
    if (this.sub !== 'micdrop' || this.slam == null || this.slam.state === 'rise') this.hover(w, dt);
    const near = w.nearest(this.x, this.y);
    if (this.sub === 'cyclone') {
      this.cyc += dt * 12; while (this.cycFired === undefined || this.cycFired < Math.floor(this.cyc)) { this.cycFired = (this.cycFired === undefined ? 0 : this.cycFired) + 1; const k = this.cycFired; for (let arm = 0; arm < 3; arm++) w.foeShot(this.x, this.y + 6, this.t * 1.4 + arm * MT.TAU / 3, 100, 'card', { r: 3 }); if (k > 36) break; } if (this.t > 3) { this.cycFired = undefined; this.startPattern(w); }
    } else if (this.sub === 'micdrop') {
      if (!this.slam) { this.slam = { state: 'tele', t: 0, x: near.x, y: near.y }; }
      const s = this.slam; s.t += dt;
      if (s.state === 'tele') { s.x += (near.x - s.x) * Math.min(1, dt * 2); s.y += (near.y - s.y) * Math.min(1, dt * 2); if (s.t >= 1) { s.state = 'rise'; s.t = 0; } }
      else if (s.state === 'rise') { if (s.t >= .5) { s.state = 'fall'; s.t = 0; this.x = s.x; this.y = s.y; } }
      else if (s.state === 'fall') { if (s.t >= .2) { s.state = 'done'; s.t = 0; w.game.shake(6); w.event('micDrop', { x: s.x, y: s.y }); w.ring(s.x, s.y, 24, 90, 0, 'orb'); this.shock = { x: s.x, y: s.y, r: 4, hit: {} }; } }
      else if (s.state === 'done' && s.t > 1.2) this.startPattern(w);
    } else if (this.sub === 'sweep') {
      for (const c of this.cones) { c.t += dt; c.a += c.dir * dt * .55; c.lit = c.t > .5 ? 1 : 0; if (c.lit) for (const q of w.cs) if (q.state === 'alive') { const ang = MT.angTo(this, q), inCone = Math.abs(E.angDiff(c.a, ang)) < .16 && MT.hyp(q.x - this.x, q.y - this.y) > 20; if (inCone) { q.litT = (q.litT || 0) + dt; if (q.litT >= .4) { q.litT = 0; w.hurtContestant(q, 1, 'spotlight', 0, ang); } } else q.litT = Math.max(0, (q.litT || 0) - dt); } }
      if (this.t > 5.5) this.startPattern(w);
    }
    if (this.shock) { this.shock.r += 120 * dt; for (const c of w.cs) if (c.state === 'alive') { const d = MT.hyp(c.x - this.shock.x, c.y - this.shock.y); if (Math.abs(d - this.shock.r) < 5 && !this.shock.hit[c.slot]) { this.shock.hit[c.slot] = 1; w.hurtContestant(c, 1, 'shockwave', 0, MT.angTo(this.shock, c)); } } if (this.shock.r > 80) this.shock = null; }
    for (const p of this.parts) if (p.id.startsWith('tur')) p.active = p.alive;
  }
  crash(w) {
    this.sub = 'crash'; this.stage = 'transition'; this.t = 0; w.fShots.clear(); this.cones = []; this.shock = null; w.event('lanceRobot', { x: this.x, y: this.y }); w.game.particles.explosion(this.x, this.y, 12, 2); w.game.shake(8);
    for (const p of this.parts) if (!p.tv && p.id !== 'eye') { p.alive = false; p.active = false; }
    w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.pause = 5.5;
  }
  updateB(w, dt) {
    if (this.stage === 'transition') {
      this.pause -= dt; if (this.pause > 0) { this.wallU = Math.max(0, Math.min(1, (3.5 - this.pause) / 2.5)); return; }
      this.stage = 'network'; this.sub = 'fight'; this.t = 0; this.timers = {}; this.hidden = false; this.wallU = 1; w.event('networkReveal', {});
      for (const p of this.parts) if (p.tv) { p.alive = true; p.active = true; p.wasAlive = true; p.hp = p.max; } const eye = this.part('eye'); eye.alive = true; eye.active = true; eye.hp = eye.max = 300 * this.mul; eye.main = true; this.part('podium').main = false; this.name = 'THE NETWORK';
      return;
    }
    const eye = this.part('eye'), near = w.nearest(184, 54); const gone = this.tvsGone();
    this.channels = this.channels.filter(ch => { ch.t += dt; const p = this.part('tv' + ch.i); if (!p || !p.alive) return false; return ch.t < ch.len; });
    if (this.channels.length < 4 && this.due('flip', 1.2, dt)) {
      const alive = this.parts.filter(p => p.tv && p.alive && !this.channels.some(c => 'tv' + c.i === p.id)); if (alive.length) {
        const p = alive[Math.floor(MT.R.ai() * alive.length)], i = +p.id.slice(2), ch = ['static', 'news', 'cartoon', 'shopping', 'lance'][Math.floor(MT.R.ai() * 5)];
        this.channels.push({ i, ch, t: 0, len: ch === 'news' ? 2 : 1.2, fired: false, tele: .5 }); this.timers.flip = 1.2 + MT.R.ai() * 1.8; w.event('channel', { ch, i });
      }
    }
    for (const c of this.channels) {
      const p = this.part('tv' + c.i), x = this.px(p), y = this.py(p);
      if (c.t > c.tele && !c.fired) { c.fired = true;
        if (c.ch === 'static') for (let k = 0; k < 5; k++) w.foeShot(x, y, MT.angTo({ x, y }, near) + (k - 2) * .18, 95, 'static', { r: 2 });
        else if (c.ch === 'cartoon') { for (let k = 0; k < 2; k++) { const e = w.spawnEnemy('clapbot', x + (k ? 8 : -8), y + 14, {}); e.entering = false; } }
        else if (c.ch === 'shopping') w.addPickup('bill', x, y + 20, { vz: 60, ttl: 8 });
        else if (c.ch === 'lance') for (const o of [-.35, 0, .35]) w.foeShot(x, y, MT.angTo({ x, y }, near) + o, 100, 'orb');
      }
      if (c.ch === 'news' && c.t > c.tele + .8 && c.t < c.tele + 1.8) for (const q of w.cs) if (q.state === 'alive' && Math.abs(q.x - x) < 5 + q.r * .6 && q.y > y) w.hurtContestant(q, 1, 'newsbeam', 0, Math.PI / 2);
    }
    eye.active = true;
    if (gone >= 8) { this.eyeOpen = Math.min(1, this.eyeOpen + dt * 2); if (this.due('eye', 3, dt)) { this.eyeMode = (this.eyeMode || 0) + 1; this.eyeT = 0; } this.eyeT = (this.eyeT || 0) + dt; if (this.eyeMode) { if (this.eyeMode % 2) { this.spA = (this.spA || 0) + dt * 2.2; this.spAcc = (this.spAcc || 0) + dt * 10; while (this.spAcc >= 1) { this.spAcc--; for (let arm = 0; arm < 2; arm++) w.foeShot(184, 60, this.spA + arm * Math.PI, 95, 'orb'); } } else if (this.eyeT < dt * 1.5) w.ring(184, 60, 18, 85, MT.R.ai(), 'orb'); } }
    if (eye.hp <= 0) this.dead = true;
  }
  deathStart(w) { w.event('bossDead', { boss: 'lance', x: 184, y: 54 }); w.fShots.clear(); w.enemies.forEach(e => { if (e.alive) { e.noCash = true; e.alive = false; } }); this.channels = []; }
  deathUpdate(w, dt) { this.deathT += dt; const k = Math.floor(this.deathT * 4); if (k !== this.lastK && k < 12) { this.lastK = k; const p = this.parts.filter(q => q.tv)[k]; if (p) { w.game.particles.explosion(this.px(p), this.py(p), 10, 1); p.alive = false; } } if (this.deathT >= 2.8 && !this.shower) { this.shower = true; w.game.flash('#fff', .6, 1); w.scatterCash(184, 80, 30); w.addPickup('prize', 160, 90, { vz: 120 }); w.addPickup('prize', 208, 90, { vz: 120 }); } }
  extra() { return [this.stage, Math.round(this.wallU * 100), Math.round(this.eyeOpen * 100), this.channels.map(c => [c.i, c.ch, Math.round(c.t * 10)]), this.cones.map(c => [Math.round(c.a * 100), c.lit]), this.slam ? [this.slam.state, Math.round(this.slam.x), Math.round(this.slam.y)] : 0, this.shock ? [Math.round(this.shock.x), Math.round(this.shock.y), Math.round(this.shock.r)] : 0, this.parts.map(p => p.alive ? 1 : 0).join('')]; }
  fromExtra(a) { if (!a) return; this.stage = a[0]; this.wallU = a[1] / 100; this.eyeOpen = a[2] / 100; this.channels = a[3].map(c => ({ i: c[0], ch: c[1], t: c[2] / 10, tele: .5 })); this.cones = a[4].map(c => ({ a: c[0] / 100, lit: c[1] })); this.slam = a[5] ? { state: a[5][0], x: a[5][1], y: a[5][2], t: 0 } : null; this.shock = a[6] ? { x: a[6][0], y: a[6][1], r: a[6][2] } : null; if (this.stage !== 'starmaker') for (const p of this.parts) if (p.tv) p.wasAlive = true; }
}
MT.BOSSES.lance = Lance;

// ===== 14-draw.js =====
// MASH TV: drawing a World: floor, outside dressing, walls, doors, props, entities, lights.
const WPD = World.prototype;
MT.fitZoom = function (game, map, extra) {
  const b = map.bounds(game.view); const bw = b.x1 - b.x0, bh = b.y1 - b.y0; if (!(bw > 0)) return 1;
  const W = game.W || 427, H = game.H || 240, z = Math.min(W / (bw + 8), (H - 40 - (extra || 0)) / (bh + 4));
  return MT.clamp(z, .6, 1.6) * MT.T.camZoom;
};
WPD.drawOutside = function (r) {
  const S = MT.SETS[this.set], t = this.time, R = this.rat.R / 100;
  // bleachers east and west
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -130 : 378, x1 = side < 0 ? -10 : 498;
    r.queue(side < 0 ? -70 : 438, 120, 0, g => { for (let step = 0; step < 4; step++) { const xa = side < 0 ? -10 - (step + 1) * 30 : 378 + step * 30, xb = xa + 30; r.box(g, xa, 8, 0, xb, 232, 6 + step * 6, S.neon === '#ff2e88' ? '#5a2a8a' : '#4a4a58', '#2a1a4a'); } }, {});
    for (const a of this.audience) { if ((a.x < 0) !== (side < 0)) continue; const bob = Math.sin(t * (2 + R * 4) + a.ph) * (1 + R * 3), cheer = this.rat.prime > 0 || (this.cheerT > 0 && ((a.ph * 3) | 0) % 2); r.queue(a.x, a.y, 14 + Math.floor((side < 0 ? -a.x - 10 : a.x - 378) / 30) * 6, g => { const [sx, sy] = r.w(a.x, a.y, 14 + Math.floor((side < 0 ? -a.x - 10 : a.x - 378) / 30) * 6 + bob); const c = ['#ff2e88', '#2ee6ff', '#ffcc33', '#7affb0', '#ff8a30', '#c8a0ff', '#fff', '#ff5a5a'][a.v]; px.rect(g, sx - 3, sy, 7, 6, c); px.disc(g, sx, sy - 3, 3, ['#f0c8a0', '#d89a70', '#8a5a40', '#f4d0b0'][a.v % 4]); px.rect(g, sx - 3, sy - 6, 7, 2, ['#222', '#6a3a1a', '#e0c060', '#a03020'][(a.v >> 1) % 4]); if (cheer) { px.rect(g, sx - 5, sy - 4, 1, 4, c); px.rect(g, sx + 5, sy - 4, 1, 4, c); } if (a.sign) { px.rect(g, sx - 8, sy - 14, 17, 7, '#fff7e8'); E.font.text(g, a.sign, sx, sy - 13, '#14081c', { align: 'center', font: 'tiny', outline: false }); } }, {}); }
  }
  // north truss & signs, south dolly track
  r.queue(184, -20, 70, g => { const [a, b] = [r.w(20, -20, 76), r.w(348, -20, 76)]; px.rect(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), 3, '#8a90a0'); px.rect(g, Math.round(a[0]), Math.round(a[1]) + 3, Math.round(b[0] - a[0]), 1, '#3a3a50'); for (let i = 0; i < 12; i++) { const [lx, ly] = r.w(36 + i * 26, -20, 74); px.disc(g, lx, ly + 3, 2, Math.floor(t * 4 + i) % 3 === 0 ? '#fff7a0' : '#ffcc33'); } const [sx, sy] = r.w(184, -20, 90); const on = Math.floor(t * 2) % 2; px.rect(g, sx - 26, sy, 52, 11, '#14081c'); E.font.text(g, 'ON AIR', sx, sy + 2, on ? '#ff3344' : '#7a1020', { align: 'center', outline: false }); }, {});
  r.queue(184, 262, 0, g => { const [a] = r.w(20, 262, 0), [b] = r.w(348, 262, 0), [, y] = r.w(20, 262, 0); px.rect(g, Math.round(a), Math.round(y), Math.round(b - a), 2, '#6a6a80'); px.rect(g, Math.round(a), Math.round(y) + 4, Math.round(b - a), 2, '#6a6a80'); }, {});
  for (const cx of [54, 314]) r.queue(cx, 268, 0, g => { const [sx, sy] = r.w(cx, 268, 0); px.rect(g, sx - 6, sy - 8, 12, 8, '#2a2a3a'); px.rect(g, sx - 3, sy - 14, 6, 6, '#14081c'); px.disc(g, sx + 4, sy - 11, 2, '#7a9aff'); px.rect(g, sx - 1, sy - 30, 3, 22, '#6a6a80'); }, {});
};
WPD.drawWalls = function (r) {
  const S = MT.SETS[this.set]; this.map.queueWalls(r);
  // marquee bulbs along the top of the north, east and west walls
  const t = this.time;
  r.queue(184, 8, 27, g => { for (let i = 0; i < 23; i++) { const [sx, sy] = r.w(8 + i * 16, 14, 27); const on = Math.floor(t * 6 - i * .5) % 3 === 0; px.rect(g, sx - 1, sy - 1, 2, 2, on ? '#fff7a0' : S.trim === '#ffcc33' ? '#8a6a18' : '#555'); } }, { emissive: true });
  r.queue(8, 120, 27, g => { for (let i = 0; i < 14; i++) for (const x of [14, 354]) { const [sx, sy] = r.w(x, 8 + i * 16, 27); const on = Math.floor(t * 6 + i * .5) % 3 === 0; px.rect(g, sx - 1, sy - 1, 2, 2, on ? '#fff7a0' : '#8a6a18'); } }, { emissive: true });
};
WPD.drawDoors = function (r) {
  const t = this.time;
  for (const dn in this.doors) {
    const d = this.doors[dn], D = MT.DOORS[dn]; const open = d.state === 'opening' || d.state === 'open', exit = d.state === 'exit', closing = d.state === 'closing';
    const col = exit ? '#30ff70' : open || closing ? '#ff3344' : '#552030', pulse = Math.floor(t * 6) % 2;
    r.queue(D.x, D.y, 30, g => {
      const [sx, sy] = r.w(D.x - D.dx * 4, D.y - D.dy * 4, 32); px.disc(g, sx, sy, 3, '#14081c'); px.disc(g, sx, sy, 2.2, (exit || open) && pulse ? col : (exit || open ? '#a02030' : '#552030')); if (exit || open) px.blend(g, .4, 'add', () => px.disc(g, sx, sy, 7, col));
      if (exit) { const nm = (MT.ROOMS[d.exit] || {}).name || 'NEXT', ty = (MT.ROOMS[d.exit] || {}).type || 'battle'; const [tx, ty2] = r.w(D.x - D.dx * 10, D.y - D.dy * 10, 40); const wd = E.font.width(nm) + 10; px.rect(g, Math.round(tx - wd / 2), Math.round(ty2 - 14), wd, 14, '#14081c'); px.rect(g, Math.round(tx - wd / 2 + 1), Math.round(ty2 - 13), wd - 2, 12, '#0c3a1c'); E.font.text(g, nm, Math.round(tx), Math.round(ty2 - 11), '#aaffc8', { align: 'center', outline: false }); const keyRoom = MT.ROOMS[d.exit] && MT.ROOMS[d.exit].key; E.font.text(g, (MT.TEXT.roomTypes[ty] || '') + (keyRoom ? '  ★' : ''), Math.round(tx), Math.round(ty2 + 2), keyRoom ? '#ffcc33' : '#c8c0e0', { align: 'center', outline: false, shadow: '#000' }); }
    }, { emissive: true });
    if (exit) this.game.lights.add(D.x - D.dx * 8, D.y - D.dy * 8, 16, 40, .8, { color: '#30ff70' }); else if (open) this.game.lights.add(D.x - D.dx * 8, D.y - D.dy * 8, 16, 34, .6, { color: '#ff3344' });
    if (open || closing || exit) r.decal(() => { for (let k = 0; k < 6; k++) { const o = (k - 2.5) * 8; const p = r.w(D.x + D.dx * 0 + (D.dx === 0 ? o : 0) - D.dx * 10, D.y + (D.dy === 0 ? o : 0) - D.dy * 10, 0); px.rect(r.tgt, Math.round(p[0]) - 2, Math.round(p[1]), 4, 2, k % 2 ? '#14081c' : '#f0c828'); } });
  }
};
WPD.drawSetProps = function (r) {
  const S = MT.SETS[this.set], t = this.time;
  const corners = [[22, 22], [346, 22], [22, 218], [346, 218]];
  for (const [x, y] of corners) {
    if (this.set === 'studio') r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 0), [, ty] = r.w(x, y, 20); px.rect(g, sx - 1, ty, 2, sy - ty, '#8a90a0'); px.disc(g, sx, ty, 4, '#14081c'); px.disc(g, sx, ty, 3, '#fff7a0'); }, { emissive: false });
    else if (this.set === 'warehouse') r.shape('crate', x, y, 0, { facing: x * .3, scale: .9 });
    else if (this.set === 'rooftop') r.prop('lamp', x, y, 0, { light: true });
    else r.prop('lamp', x, y, 0, { light: true });
  }
  if (this.set === 'greenroom') { r.shape('table', 60, 40, 0, {}); r.shape('chair', 80, 46, 0, {}); }
  // sweeping spotlights
  const g = this.game; if (this.set === 'studio' || this.set === 'rooftop') for (let i = 0; i < 4; i++) { const [x, y] = corners[i], a = Math.sin(t * .5 + i * 1.7) * .8 + (i < 2 ? Math.PI / 2 : -Math.PI / 2); g.lights.add(x + Math.cos(a) * 80, y + Math.sin(a) * 60, 10, 70, .3, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a60ff'][i] }); }
  if (this.set === 'rooftop' && Math.floor(t / 4) !== Math.floor((t - .016) / 4)) g.lights.add(184, -40, 40, 200, .25, { color: ['#ff6a30', '#ffd23a', '#7affff'][Math.floor(t / 4) % 3] });
};
WPD.drawHazards = function (r) {
  for (const h of this.hazards) {
    if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const y0 = 16 + h.rows[i] * 16, y1 = y0 + 32, dir = h.dirs[i]; r.decal(() => { const a = r.w(16, y0, 0), b = r.w(352, y1, 0); px.rect(r.tgt, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1]), h.warn ? '#5a2a2a' : '#25252e'); for (let x = 0; x < 336; x += 16) { const xx = 16 + ((x + (this.time * 40 * dir * h.speedK) % 16 + 16) % 336); const p = r.w(xx, y0 + 16, 0); px.line(r.tgt, p[0] - dir * 3, p[1] - 3, p[0], p[1], h.warn ? '#ff5a5a' : '#f0c828', 1); px.line(r.tgt, p[0] - dir * 3, p[1] + 3, p[0], p[1], h.warn ? '#ff5a5a' : '#f0c828', 1); } }); }
    if (h.kind === 'pyro') for (const v of h.vents) {
      r.decal(() => { const p = r.w(v.x, v.y, 0); px.rect(r.tgt, Math.round(p[0]) - 6, Math.round(p[1]) - 3, 12, 6, '#14081c'); for (let k = -4; k <= 4; k += 2) px.rect(r.tgt, Math.round(p[0]) + k, Math.round(p[1]) - 2, 1, 4, v.state === 'tele' ? '#ff6a3a' : '#444'); if (v.state === 'tele') r.groundRing(v.x, v.y, 12, '#ff5a3a', .6 + Math.sin(this.time * 30) * .3); });
      if (v.state === 'fire') { this.game.particles.fire(v.x, v.y, 2, 1, { size: 5 }); r.queue(v.x, v.y, 12, g => { const [sx, sy] = r.w(v.x, v.y, 0), [, ty] = r.w(v.x, v.y, 34); px.glow(g, 1); px.ell(g, sx, (sy + ty) / 2, 8, (sy - ty) / 2, '#ff6a20'); px.ell(g, sx, (sy + ty) / 2 + 2, 5, (sy - ty) / 2 - 3, '#ffd23a'); }, { emissive: true }); this.game.lights.add(v.x, v.y, 14, 44, .8, { color: '#ff7a30' }); }
    }
  }
};
WPD.drawRoomExtras = function (r) {
  const rm = this.rm; if (!rm) return;
  if (rm.id === '3-4' || rm.locks) { r.queue(90, 10, 0, g => { const [a, b] = r.w(24, 14, 26), [c, d] = r.w(120, 14, 0); px.rect(g, Math.round(a), Math.round(b), Math.round(c - a), Math.round(d - b), this.safeOpen ? '#06060a' : '#5a5a70'); px.rect(g, Math.round(a), Math.round(b), Math.round(c - a), 1, '#ffcc33'); if (!this.safeOpen) E.font.text(g, 'VAULT', Math.round((a + c) / 2), Math.round(b + 3), '#ffd23a', { align: 'center', outline: false }); }, {}); }
  if (this.keyCage && !this.keyCage.open) { const k = this.keyCage; r.queue(k.x, k.y, 10, g => { const [sx, sy] = r.w(k.x, k.y, 0), u = r.w(k.x + 14, k.y, 0)[0] - sx; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, x = sx + Math.cos(a) * u, y = sy + Math.sin(a) * u * .6; px.rect(g, Math.round(x), Math.round(y - 14), 1, 14, '#c8d0e0'); } px.ell(g, sx, sy - 14, u, u * .6, '#8a90a0'); if (this.survive) { const left = Math.max(0, Math.ceil(this.survive.len - this.survive.t)); E.font.text(g, String(left), sx, sy - 28, '#fff', { align: 'center', scale: 2, shadow: '#000', outline: false }); } }, {}); }
};
WPD.draw = function (r) {
  const S = MT.SETS[this.set] || MT.SETS.studio, g = this.game;
  g.lights.enabled = true; g.lights.ambient = S.ambient;
  this.map.drawFloor(r);
  MT.paint.telegraphs(r, this);
  this.drawOutside(r);
  this.drawWalls(r); this.drawDoors(r); this.drawSetProps(r); this.drawHazards(r); this.drawRoomExtras(r);
  MT.paint.pickups(r, this);
  for (const e of this.enemies) if (e.alive) MT.paint.enemy(r, e, this);
  if (this.boss && !this.boss.gone) MT.paint.boss(r, this.boss, this);
  for (const c of this.cs) MT.paint.contestant(r, c, this);
  MT.paint.bullets(r, this);
  if (this.rat.prime > 0) { const t = this.time; g.lights.add(184, 120, 30, 220, .15 + (Math.floor(t * 8) % 2) * .1, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][Math.floor(t * 4) % 3] }); }
};

// ===== 15-art-chars.js =====
// MASH TV: rigs, looks and painters for contestants, host, enemies and bosses. Draw code reads only render state (the entity's fields).
const px = E.px, TN = E.tones;
MT.LOOKS = [
  { name: 'ROCKET', hair: 'short', hat: null, hc: '#2a1a10' }, { name: 'VOLT', hair: 'ponytail', hat: 'band', hc: '#6a3a1a' },
  { name: 'MOXIE', hair: 'spiky', hat: 'cap', hc: '#c05020' }, { name: 'GOLDIE', hair: 'long', hat: 'band', hc: '#f0d060' }];
MT.makeRig = function (spec) { try { return new E.Humanoid(spec); } catch (e) { MT.game.fail && MT.game.fail('rig', e); return null; } };
MT.contestantRig = function (c) {
  const L = MT.LOOKS[c.look % 4], col = c.color, t = TN(col);
  return MT.makeRig({ size: 1.1, build: 'heroic', weapon: 'gun', outfit: 'shirt', hair: L.hair, hat: L.hat ? { style: L.hat, color: col } : undefined, sleeves: 'long',
    colors: { cloth: col, pants: t.sh, boot: '#14081c', glove: '#f0f0f8', hair: L.hc, trim: '#ffffff', belt: '#ffffff', skin: ['#f0c8a0', '#d89a70', '#f4d0b0', '#c88a60'][c.look % 4] } });
};
const ENEMY_RIG = {
  goon: () => MT.makeRig({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'coat', hat: { style: 'helmet', color: '#2a2a44' }, hair: 'bald', colors: { cloth: '#2a2a44', coat: '#2a2a44', pants: '#1a1a2c', boot: '#0c0c14', trim: '#ffcc33', metal: '#222', glove: '#111' } }),
  popper: () => MT.makeRig({ size: 1.0, build: 'chibi', weapon: null, outfit: 'tunic', hat: { style: 'pointed', color: '#ff2e88' }, hair: 'short', colors: { cloth: '#2ee6ff', pants: '#ffcc33', boot: '#ff2e88', hair: '#ffcc33', trim: '#fff' } }),
  mime: () => MT.makeRig({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hat: { style: 'band', color: '#111' }, hair: 'short', colors: { skin: '#f6f6f6', cloth: '#f2f2f2', pants: '#1a1a1a', boot: '#111', glove: '#fff', hair: '#111', trim: '#222' } }),
  heckler: () => MT.makeRig({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'spiky', colors: { cloth: '#d02828', pants: '#3a4a7a', boot: '#222', hair: '#6a3a1a', trim: '#fff' } }),
  hecklerKing: () => MT.makeRig({ size: 1.15, build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'crown', color: '#ffcc33' }, hair: 'spiky', colors: { cloth: '#ffcc33', coat: '#d02828', pants: '#3a4a7a', boot: '#222', hair: '#6a3a1a', trim: '#fff' } }),
  brute: () => MT.makeRig({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hat: { style: 'helmet', color: '#8a5a32' }, hair: 'bald', colors: { skin: '#8a5a32', cloth: '#e8e0b8', pants: '#8a5a32', boot: '#3a2410', glove: '#8a5a32', trim: '#ff3344', metal: '#8a5a32' } }),
  lance: () => MT.makeRig({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', colors: { cloth: '#7a2ab0', coat: '#7a2ab0', pants: '#111', boot: '#111', glove: '#fff', hair: '#e0e0f0', trim: '#ffcc33', skin: '#f0c8a0' } }),
  penny: () => MT.makeRig({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', colors: { cloth: '#20b0a8', pants: '#20b0a8', boot: '#111', glove: '#fff', hair: '#ff8ad8', trim: '#ffd23a', skin: '#f0c8a0' } }),
  annc: () => MT.makeRig({ size: 1.2, build: 'bulky', weapon: null, outfit: 'coat', hair: 'bald', colors: { cloth: '#222', coat: '#222', pants: '#111', boot: '#111', skin: '#d8a880', trim: '#fff' } }),
  paparazzi: () => MT.makeRig({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#444' }, hair: 'short', colors: { cloth: '#8a7a5a', coat: '#8a7a5a', pants: '#333', boot: '#111', hair: '#222' } })
};
MT.cachedRig = function (key) { MT._rigs = MT._rigs || {}; if (!MT._rigs[key]) MT._rigs[key] = ENEMY_RIG[key] ? ENEMY_RIG[key]() : null; return MT._rigs[key]; };
MT.hostRig = k => MT.cachedRig(k);
const BLOB = () => { try { return new E.Blob({ R: 6, colors: { dk: '#5a6478', base: '#c8d0e0', lt: '#f0f4ff', spec: '#fff', eye: '#fff', pupil: '#14081c' }, feet: true, mouth: true }); } catch (e) { return null; } };

// ---- animation (rigs updated each step; skipped when MT.cfg.skipRigs) ----
World.prototype.animate = function (dt) {
  for (const c of this.cs) {
    if (c.state === 'gone') continue; if (!c.rig) c.rig = MT.contestantRig(c); if (!c.rig) continue;
    const boat = c.boatT > 0, pose = c.state === 'dying' ? 'die' : boat ? c.boatPose : c.pose;
    c.rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.vx, vy: c.vy, facing: c.face, point: c.state === 'alive' && !boat && (c.fireOn || c.laserOn || c.fireCd > 0), hurt: c.hurtT > 0, flip: c.slideT > 0 ? c.slideU : 0, pose, expr: boat ? 'smile' : undefined, down: c.state === 'dying' ? c.down : 0, land: c.landK > 0 ? c.landK : undefined });
  }
  for (const e of this.enemies) this.animEnemy(e, dt);
};
World.prototype.animEnemy = function (e, dt) {
  const A = MT.ENEMIES[e.kind]; const key = e.kind === 'discoBig' ? null : e.kind;
  if (key === 'clapbot') { if (!e.blob) e.blob = BLOB(); if (e.blob) e.blob.update(dt, { squash: e.state === 'squat' ? -.35 : e.state === 'hop' ? .3 : 0, walk: e.state === 'hop' ? 1 : 0 }); return; }
  if (!ENEMY_RIG[key]) return; if (!e.rig) e.rig = MT.cachedRigFresh(key); if (!e.rig) return;
  const o = { x: e.x, y: e.y, z: e.z, vx: e.vx || 0, vy: e.vy || 0, facing: e.face, hurt: e.flash > 0 };
  if (key === 'goon' || key === 'brute') { if (e.state === 'wind') o.attack = E.move('bash', Math.min(.45, 1 - e.t2 / .32 * .55)); else if (e.state === 'tele') o.pose = 'crouch'; else if (e.state === 'charge') o.sprint = true; else if (e.state === 'stunned') o.pose = 'kneel'; }
  if (key === 'heckler' || key === 'hecklerKing') { if (e.state === 'throw') o.attack = E.move('throw', Math.min(.6, 1 - e.t2 / .45)); }
  if (key === 'mime') { o.pose = 'guard'; if (e.state === 'tele') { o.x += Math.sin(e.t * 60) * .8; } }
  if (key === 'popper') { o.point = false; }
  e.rig.update(dt, o);
};
MT.cachedRigFresh = k => ENEMY_RIG[k] ? ENEMY_RIG[k]() : null;

// ---- painters ----
MT.paint = {};
function shadow(r, x, y, rad, a) { r.shadow(x, y, rad, a === undefined ? .45 : a); }
MT.paint.contestant = function (r, c, w) {
  if (c.state === 'gone') return; const t = w.time;
  if (c.state === 'out') return;
  shadow(r, c.x, c.y, 6, c.state === 'drop' ? .25 : .5);
  r.decal(() => r.groundRing(c.x, c.y, 8, c.color, .8));
  if (c.state === 'drop') r.queue(c.x, c.y, 0, g => { const [sx, sy] = r.w(c.x, c.y, c.z + 14), [tx, ty] = r.w(c.x, c.y, 200); px.line(g, sx, sy, tx, ty, '#c8d0e0', 1); }, {});
  const blink = c.invuln > 0 && c.state !== 'dying' && c.addons.shield <= 0 && (Math.floor(t * 24) % 2 === 0);
  if (c.rig) r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { alpha: blink ? .35 : 1, flash: c.flash > 0 ? '#ffffff' : undefined, ghost: c.ghostT > 0 ? { color: c.color, life: .25, alpha: .5, owner: c } : undefined });
  else r.queue(c.x, c.y, c.z, g => { const [sx, sy] = r.w(c.x, c.y, c.z); px.disc(g, sx, sy - 8, 6, c.color); }, {});
  // number plate / arrow
  if (c.arrowT > 0 || c.state === 'dying') r.queue(c.x, c.y, 40, g => { const [sx, sy] = r.w(c.x, c.y, 44 + Math.sin(t * 6) * 2); px.poly(g, [[sx - 4, sy - 4], [sx + 4, sy - 4], [sx, sy + 2]], c.color); E.font.text(g, 'P' + (c.slot + 1), sx, sy - 13, '#fff', { align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
  if (c.addons.shield > 0) r.queue(c.x, c.y, 10, g => { const [sx, sy] = r.w(c.x, c.y, 12), u = (r.w(c.x + 12, c.y, 12)[0] - sx); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, u, '#4a8aff')); if (Math.floor(t * 8) % 2) E.font.text(g, 'K', sx, sy - 3, '#ffcc33', { align: 'center', outline: false }); }, { emissive: true });
  if (c.addons.records > 0) for (let k = 0; k < 2; k++) { const a = (c.recA || 0) + k * Math.PI, x = c.x + Math.cos(a) * 26, y = c.y + Math.sin(a) * 26; r.sprite(x, y, 12, MT.spr.record, { anchor: 'center', glow: 1 }); }
  if (c.laserOn && c.laserLen) { const a = c.laserA, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10, x1 = x0 + Math.cos(a) * c.laserLen, y1 = y0 + Math.sin(a) * c.laserLen; r.queue((x0 + x1) / 2, (y0 + y1) / 2, 14, g => { const [ax, ay] = r.w(x0, y0, 14), [bx, by] = r.w(x1, y1, 14); px.glow(g, 1); px.line(g, ax, ay, bx, by, '#7affff', 3); px.line(g, ax, ay, bx, by, '#ffffff', 1); }, { emissive: true }); w.game.lights.add(x0 + Math.cos(a) * c.laserLen * .5, y0 + Math.sin(a) * c.laserLen * .5, 14, 50, .6, { color: '#7affff' }); }
};
const CONF = ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff'];
MT.paint.enemy = function (r, e, w) {
  if (e.hidden) return;
  const t = w.time + e.seed * 7, K = e.kind;
  if (K === 'crate') { r.shape('crate', e.x, e.y, 0, { facing: e.seed * 3, scale: .8 }); if (e.carryKey) r.sprite(e.x, e.y, 28, MT.spr.key, { anchor: 'center', glow: 1 }); return; }
  if (K === 'lock') { r.queue(e.x, e.y, 12, g => { const [sx, sy] = r.w(e.x, e.y, 14); px.disc(g, sx, sy, 5, '#14081c'); px.disc(g, sx, sy, 4, e.flash > 0 ? '#fff' : '#ffcc33'); px.rect(g, sx - 1, sy - 1, 2, 4, '#14081c'); }, {}); return; }
  if (K === 'segment') { r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 6); px.disc(g, sx, sy, 3.6, '#14081c'); px.disc(g, sx, sy, 3, e.flash > 0 ? '#fff' : (e.idx % 2 ? '#3a3a4a' : '#ffcc33')); px.dot(g, sx - 1, sy - 1, '#ffffff'); }, {}); return; }
  shadow(r, e.x, e.y, e.r * .9, .4);
  if (K === 'disco' || K === 'discoBig') { r.queue(e.x, e.y, 12, g => { const [sx, sy] = r.w(e.x, e.y, 12 + e.r), rad = e.r * 1.25 * (e.big ? 1.1 : 1); px.disc(g, sx, sy, rad + 1, '#14081c'); px.disc(g, sx, sy, rad, e.flash > 0 ? '#fff' : '#9aa0b8'); for (let i = -2; i <= 2; i++) { px.line(g, sx - rad, sy + i * rad / 3, sx + rad, sy + i * rad / 3, '#c8d0e8', 1); px.line(g, sx + i * rad / 3, sy - rad, sx + i * rad / 3, sy + rad, '#c8d0e8', 1); } const a = (e.spin || 0); for (let i = 0; i < 4; i++) { const gx = sx + Math.cos(a + i * 1.7) * rad * .6, gy = sy + Math.sin(a * 1.3 + i * 2.1) * rad * .6; px.dot(g, gx, gy, i % 2 ? '#ff2e88' : '#2ee6ff'); px.dot(g, gx + 1, gy, '#fff'); } if (e.state === 'flare') { px.blend(g, .6, 'add', () => px.disc(g, sx, sy, rad * 1.7, '#ffffff')); } }, { emissive: e.state === 'flare' }); return; }
  if (K === 'tank') { r.queue(e.x, e.y, 6, g => { const a = e.body_a || 0, ca = Math.cos(a), sa = Math.sin(a), P = (fx, fy, z) => r.w(e.x + ca * fx - sa * fy, e.y + sa * fx + ca * fy, z); const quad = (pts, c) => px.poly(g, pts.map(p => P(...p)), c); const fl = e.flash > 0;
      for (const sd of [-1, 1]) quad([[-11, sd * 8, 3], [11, sd * 8, 3], [11, sd * 12, 3], [-11, sd * 12, 3]], '#14081c');
      quad([[-11, -8, 6], [12, -8, 6], [12, 8, 6], [-11, 8, 6]], fl ? '#fff' : '#4a5a6a'); quad([[-9, -6, 9], [10, -6, 9], [10, 6, 9], [-9, 6, 9]], fl ? '#fff' : '#6a7a8c');
      const tc = Math.cos(e.turret || 0), ts = Math.sin(e.turret || 0), rc = (e.recoil > 0 ? -3 : 0); const [bx, by] = r.w(e.x, e.y, 14), [ex, ey] = r.w(e.x + tc * (16 + rc), e.y + ts * (16 + rc), 14);
      px.disc(g, bx, by, 6, '#14081c'); px.disc(g, bx, by, 5, fl ? '#fff' : '#8a9aac'); px.line(g, bx, by, ex, ey, '#14081c', 4); px.line(g, bx, by, ex, ey, '#cdd6e2', 2); px.disc(g, ex, ey, 2.4, e.state === 'aim' && Math.floor(t * 20) % 2 ? '#ffffff' : '#ff3344'); }, { emissive: e.state === 'aim' });
    if (e.state === 'aim') r.decal(() => { const [ax, ay] = r.w(e.x, e.y, 1), [bx, by] = r.w(e.x + Math.cos(e.turret) * 160, e.y + Math.sin(e.turret) * 160, 1); px.line(r.tgt, ax, ay, bx, by, '#ff5a5a', 1); }); return; }
  if (K === 'snake') { r.queue(e.x, e.y, 8, g => { const [sx, sy] = r.w(e.x, e.y, 8); const rr = e.state === 'rear' ? 6 : 5.4; px.disc(g, sx, sy, rr + 1, '#14081c'); px.disc(g, sx, sy, rr, e.flash > 0 ? '#fff' : '#2a2a3a'); const a = e.face || 0; const [fx, fy] = [Math.cos(a), Math.sin(a) * .8]; px.rect(g, Math.round(sx + fx * 5 - 1), Math.round(sy + fy * 5 - 3), 3, 2, '#ffd23a'); px.rect(g, Math.round(sx + fx * 5 - 1), Math.round(sy + fy * 5 + 1), 3, 2, '#ffd23a'); px.dot(g, sx + fx * 2, sy - 2, '#ff3344'); px.dot(g, sx + fx * 2 + 2, sy - 2, '#ff3344'); }, {}); return; }
  if (K === 'clapbot') { if (!e.blob) return r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 7); px.disc(g, sx, sy, 5, '#c8d0e0'); }, {});
    r.actor(e.x, e.y, e.state === 'hop' ? 4 : 0, (g, ox, oy) => { e.blob.draw(g, ox, oy, r.view); const h = Math.sin(w.time * 20) * 3; px.disc(g, ox - 8 + h, oy - 8, 2.2, '#ffcc33'); px.disc(g, ox + 8 - h, oy - 8, 2.2, '#ffcc33'); px.line(g, ox, oy - 12, ox, oy - 16, '#ccc', 1); px.dot(g, ox, oy - 17, '#ff3344'); }, { flash: e.flash > 0 ? '#fff' : undefined }); return; }
  if (e.rig) {
    const alpha = K === 'mime' ? .45 : 1, popFlash = K === 'popper' && e.state === 'fuse' ? (Math.floor(t * 14) % 2 ? '#ff3344' : '#ffffff') : null;
    r.actor(e.x, e.y, e.z || 0, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { alpha, flash: e.flash > 0 ? '#ffffff' : popFlash || (e.vulnerable ? '#ffe0a0' : undefined), flashMix: popFlash ? .5 : e.vulnerable ? .25 : .75, every: (K === 'goon' || K === 'clapbot') ? undefined : undefined });
    if (K === 'mime') r.queue(e.x, e.y, 20, g => { const hw = 9, P = (dx, dy, z) => r.w(e.x + dx, e.y + dy, z); for (const [a, b] of [[[-hw, -hw], [hw, -hw]], [[hw, -hw], [hw, hw]], [[hw, hw], [-hw, hw]], [[-hw, hw], [-hw, -hw]]]) { const p = P(a[0], a[1], 0), q = P(b[0], b[1], 0), p2 = P(a[0], a[1], 30), q2 = P(b[0], b[1], 30); px.blend(g, .5, 'add', () => { px.line(g, p[0], p[1], q[0], q[1], '#9ad8ff', 1); px.line(g, p2[0], p2[1], q2[0], q2[1], '#9ad8ff', 1); px.line(g, p[0], p[1], p2[0], p2[1], '#9ad8ff', 1); }); } if (e.state === 'tele') { const [sx, sy] = r.w(e.x, e.y, 34); E.font.text(g, '!', sx, sy - 6, '#ff3344', { align: 'center', outline: false }); } }, { emissive: true });
    if (K === 'brute') { if (e.state === 'stunned') r.queue(e.x, e.y, 40, g => { for (let i = 0; i < 3; i++) { const a = w.time * 4 + i * 2.1, [sx, sy] = r.w(e.x + Math.cos(a) * 9, e.y + Math.sin(a) * 9, 38); px.dot(g, sx, sy, '#ffe068'); px.dot(g, sx + 1, sy, '#fff'); } }, { emissive: true }); }
    if (K === 'hecklerKing' && e.carryKey) r.sprite(e.x, e.y, 36, MT.spr.key, { anchor: 'center', glow: 1 });
  } else r.queue(e.x, e.y, 6, g => { const [sx, sy] = r.w(e.x, e.y, 8); px.disc(g, sx, sy, e.r, '#c04060'); }, {});
  if (e.carryKey && K !== 'hecklerKing' && K !== 'crate') r.sprite(e.x, e.y, (K === 'brute' ? 52 : 34), MT.spr.key, { anchor: 'center', glow: 1 });
};
// telegraphs drawn on the floor
MT.paint.telegraphs = function (r, w) {
  for (const e of w.enemies) { if (!e.alive || e.hidden) continue;
    if (e.kind === 'brute' && e.state === 'tele') r.decal(() => { const a = MT.angTo(e, e.tgt || e), L = 160; const [ax, ay] = r.w(e.x, e.y, 1), [bx, by] = r.w(e.x + Math.cos(e.face) * L, e.y + Math.sin(e.face) * L, 1); px.line(r.tgt, ax, ay, bx, by, '#ff3344', 2); r.groundRing(e.x, e.y, 14 + (1 - e.t2 / .85) * 14, '#ff5a5a', .9); });
    if (e.kind === 'mime' && e.state === 'tele') r.decal(() => r.groundDisc(e.x, e.y, 36, '#ff3344', .25));
    if (e.kind === 'popper' && e.state === 'fuse') r.decal(() => r.groundRing(e.x, e.y, 10 + (1 - e.t2 / .6) * 8, '#ffcc33', .8));
    if ((e.kind === 'heckler' || e.kind === 'hecklerKing') && e.state === 'throw' && e.aimAt) r.decal(() => { r.groundRing(e.aimAt.x, e.aimAt.y, 10, '#ff3344', .9); r.groundDisc(e.aimAt.x, e.aimAt.y, 10, '#ff3344', .2); });
    if (e.kind === 'goon' && e.state === 'wind') r.decal(() => r.groundArc(e.x, e.y, 6, 20, e.face - .6, e.face + .6, '#ff5a5a', .45));
  }
  for (const l of w.lobs) if (l.kind === 'tomato') r.decal(() => { r.groundRing(l.tx, l.ty, 10, '#ff3344', .9); r.groundDisc(l.tx, l.ty, 10 * Math.min(1, l.t / .7), '#ff3344', .25); });
  for (const p of w.pops) if (p.kind === 'shadow') r.decal(() => r.groundDisc(p.x, p.y, 8 + (1 - p.t / .6) * 6, '#000', .5));
  if (w.puddles) for (const p of w.puddles) r.decal(() => r.groundDisc(p.x, p.y, p.r, '#a01820', Math.min(.55, p.t / 3)));
  for (const d of w.decals) r.decal(() => { if (d.kind === 'tomato') r.groundDisc(d.x, d.y, 9, '#b02020', Math.min(.5, d.t / 3)); else r.groundDisc(d.x, d.y, 7, '#000', Math.min(.45, d.t / 3)); });
};
MT.paint.bullets = function (r, w) {
  w.pShots.draw(r);
  for (const b of w.fShots.list) {
    r.queue(b.x, b.y, b.z, g => {
      const [sx, sy] = r.w(b.x, b.y, b.z), u = Math.max(1.4, (r.w(b.x + b.r, b.y, b.z)[0] - sx)); px.glow(g, 1);
      if (b.kind === 'card') { const a = b.spinA || 0, c = Math.cos(a) * u, s2 = Math.sin(a) * u; px.poly(g, [[sx - c - s2 * .5, sy - s2 + c * .3], [sx + c - s2 * .5, sy + s2 + c * .3], [sx + c + s2 * .5, sy + s2 - c * .3], [sx - c + s2 * .5, sy - s2 - c * .3]], '#14081c'); px.disc(g, sx, sy, u * .8, '#ff6a9a'); px.dot(g, sx, sy, '#fff'); }
      else if (b.kind === 'beam') { px.line(g, sx - b.vx * .03, sy - b.vy * .02, sx, sy, '#ffe9a0', 2); px.disc(g, sx, sy, u, '#ffe9a0'); }
      else if (b.kind === 'shell') { px.disc(g, sx, sy, u + 1, '#14081c'); px.disc(g, sx, sy, u, '#ff7a30'); px.dot(g, sx, sy, '#fff'); }
      else { px.disc(g, sx, sy, u + 1, '#14081c'); px.disc(g, sx, sy, u, b.color); px.dot(g, sx, sy, '#ffffff'); }
    }, { emissive: true });
  }
  for (const k of w.rockets) r.sprite(k.x, k.y, 12, MT.spr.rocket, { anchor: 'center', rot: k.a + Math.PI / 2, glow: 1 });
  for (const l of w.lobs) { r.shadow(l.x, l.y, 3, .4); r.sprite(l.x, l.y, Math.max(2, l.z), l.kind === 'bag' ? MT.spr.bag : l.kind === 'tomato' ? MT.spr.tomato : MT.spr.tot, { anchor: 'center' }); }
};
MT.paint.pickups = function (r, w) {
  for (const p of w.pickups) {
    if (p.ttl < 2.5 && Math.floor(p.ttl * 8) % 2) continue; const bob = Math.sin(w.time * 4 + p.id) * 1.5 + 5 + p.z;
    let spr = null;
    if (p.kind === 'bill') spr = MT.spr.bill; else if (p.kind === 'stack') spr = MT.spr.stack; else if (p.kind === 'bar') spr = MT.spr.bar; else if (p.kind === 'case') spr = MT.spr.case; else if (p.kind === 'prize') spr = MT.spr.prize[p.col || 'red'];
    else if (p.kind === 'key') spr = MT.spr.key; else if (p.kind === 'bomb') spr = MT.spr.bomb; else if (p.kind === 'life') spr = MT.spr.life; else if (p.kind === 'statue') spr = MT.spr.statue; else if (p.kind === 'cap') spr = MT.capSprite(p.w);
    if (p.pedestal) r.queue(p.x, p.y, 0, g => { const [sx, sy] = r.w(p.x, p.y, 0), u = r.w(p.x + 10, p.y, 0)[0] - sx; px.disc(g, sx, sy, u, '#14081c'); px.disc(g, sx, sy - 1, u * .85, '#caa030'); px.disc(g, sx, sy - 2, u * .6, '#ffe068'); }, {});
    r.shadow(p.x, p.y, 4, .35);
    if (spr) r.sprite(p.x, p.y, bob + 4, spr, { anchor: 'center', glow: p.kind === 'cap' || p.kind === 'key' || p.kind === 'statue' ? 1 : .4 });
    if (p.kind === 'cap') r.queue(p.x, p.y, bob + 8, g => { const [sx, sy] = r.w(p.x, p.y, bob + 4); const W = MT.WEAPONS[p.w]; E.font.text(g, W ? W.letter : '?', sx, sy - 3, '#ffffff', { align: 'center', outline: false }); }, { emissive: true });
    if (p.kind === 'key' || p.kind === 'cap' || p.kind === 'statue') w.game.lights.add(p.x, p.y, 16, 28, .5, { color: p.kind === 'cap' ? '#9ad8ff' : '#ffcc33' });
  }
};

// ===== 16-art-bosses.js =====
// MASH TV: boss painters (read only boss fields).
MT.paint.boss = function (r, b, w) {
  if (b.hidden && !(b.kind === 'lance' && b.stage !== 'starmaker')) return;
  const t = w.time;
  if (b.kind === 'mashy') paintMashy(r, b, w, t); else if (b.kind === 'wheel') paintWheel(r, b, w, t); else paintLance(r, b, w, t);
};
const U = (r, x, y, z) => { const [a] = r.w(x, y, z), [c] = r.w(x + 10, y, z); return (c - a) / 10; };
function partFlash(b, id) { const p = b.part(id); return p && p.flash > 0; }
function paintMashy(r, b, w, t) {
  r.shadow(b.x, b.y, 28, .5);
  if (b.sub === 'tele') r.decal(() => { const [ax, ay] = r.w(b.x, b.y, 1), [bx, by] = r.w(b.x + Math.cos(b.ca) * 220, b.y + Math.sin(b.ca) * 220, 1); px.line(r.tgt, ax, ay, bx, by, '#ff3344', 2); r.groundRing(b.x, b.y, 30 + Math.sin(t * 30) * 2, '#ff5a5a', .8); });
  r.queue(b.x, b.y + 6, 0, g => {
    const [cx, cy] = r.w(b.x, b.y, 0), u = U(r, b.x, b.y, 0), fl = b.flash > 0, mad = b.phase === 3;
    // treads
    for (const sd of [-1, 1]) { const x0 = cx + sd * 22 * u - 8 * u, y0 = cy - 6 * u; px.rect(g, Math.round(x0), Math.round(y0), Math.round(16 * u), Math.round(10 * u), '#14081c'); px.rect(g, Math.round(x0 + 1), Math.round(y0 + 1), Math.round(16 * u - 2), Math.round(10 * u - 2), '#3a3a4a'); for (let i = 0; i < 4; i++) { const yy = y0 + ((i * 3 + (b.treadT || 0) * 2) % (10 * u)); px.rect(g, Math.round(x0 + 1), Math.round(yy), Math.round(16 * u - 2), 1, '#1c1c28'); } }
    // body potato
    const by = cy - 26 * u; px.ell(g, cx, by, 27 * u, 25 * u, '#14081c'); px.ell(g, cx, by, 26 * u, 24 * u, fl ? '#fff' : (mad ? '#d89060' : '#d8b878')); px.ell(g, cx - 6 * u, by - 7 * u, 13 * u, 10 * u, fl ? '#fff' : (mad ? '#e8a878' : '#ecd49a'));
    for (const [dx, dy] of [[-12, 6], [14, -4], [6, 12], [-4, -12]]) px.dot(g, cx + dx * u, by + dy * u, '#a08848');
    // tux + bow tie
    px.poly(g, [[cx - 14 * u, by + 14 * u], [cx + 14 * u, by + 14 * u], [cx + 10 * u, by + 24 * u], [cx - 10 * u, by + 24 * u]], '#14081c'); px.poly(g, [[cx - 5 * u, by + 14 * u], [cx + 5 * u, by + 14 * u], [cx, by + 24 * u]], '#fff');
    px.poly(g, [[cx, by + 12 * u], [cx - 7 * u, by + 8 * u], [cx - 7 * u, by + 16 * u]], '#ff2e88'); px.poly(g, [[cx, by + 12 * u], [cx + 7 * u, by + 8 * u], [cx + 7 * u, by + 16 * u]], '#ff2e88'); px.disc(g, cx, by + 12 * u, 2 * u, '#c01860');
    // eyes
    const j = Math.sin(b.eyeJ * 9) * 1.2 * u; for (const sd of [-1, 1]) { px.disc(g, cx + sd * 8 * u, by - 6 * u, 6 * u, '#14081c'); px.disc(g, cx + sd * 8 * u, by - 6 * u, 5 * u, '#fff'); px.disc(g, cx + sd * 8 * u + j, by - 5 * u + Math.abs(j), 2.4 * u, mad ? '#ff3344' : '#14081c'); }
    // mouth / hatch
    const hp = b.part('hatch'), open = b.open; px.ell(g, cx, by + 6 * u, 10 * u, open ? 6 * u : 2.4 * u, '#14081c'); if (open) px.ell(g, cx, by + 6 * u, 8 * u, 4.6 * u, hp.flash > 0 ? '#fff' : '#ff6a3a'); else px.rect(g, Math.round(cx - 8 * u), Math.round(by + 6 * u), Math.round(16 * u), 1, '#fff');
    // arms
    const near = b.aimA !== undefined ? b.aimA : Math.PI / 2;
    if (b.partAlive('armL')) { const ax = cx - 30 * u, ay = by + 6 * u; px.disc(g, ax, ay, 8 * u, '#14081c'); px.disc(g, ax, ay, 7 * u, partFlash(b, 'armL') ? '#fff' : '#9aa0b0'); px.rect(g, Math.round(ax - 3 * u), Math.round(ay), Math.round(6 * u), Math.round(12 * u), '#14081c'); px.rect(g, Math.round(ax - 2 * u), Math.round(ay), Math.round(4 * u), Math.round(11 * u), '#ffe27a'); px.dot(g, ax, ay + 12 * u, '#fff'); }
    else { px.disc(g, cx - 30 * u, by + 6 * u, 4 * u, '#444'); }
    if (b.partAlive('armR')) { const ax = cx + 30 * u, ay = by + 6 * u; px.disc(g, ax, ay, 8 * u, '#14081c'); px.disc(g, ax, ay, 7 * u, partFlash(b, 'armR') ? '#fff' : '#9aa0b0'); for (let i = -1; i <= 1; i++) { px.rect(g, Math.round(ax + i * 3.5 * u - 1), Math.round(ay), 3, Math.round(12 * u), '#14081c'); px.rect(g, Math.round(ax + i * 3.5 * u), Math.round(ay), 1, Math.round(11 * u), '#b86a30'); } }
    else { px.disc(g, cx + 30 * u, by + 6 * u, 4 * u, '#444'); }
    if (b.sub === 'stream') px.blend(g, .5, 'add', () => px.disc(g, cx + 30 * u, by + 18 * u, 4 * u, '#ffaa50'));
  }, { solid: true });
}
function paintWheel(r, b, w, t) {
  r.shadow(b.x, b.y, 30, .4);
  r.queue(b.x, b.y + 8, 0, g => {
    const rolling = b.phase === 2, zc = 44, [cx, cy] = r.w(b.x, b.y, zc), u = U(r, b.x, b.y, zc), R = 44 * u, fl = b.flash > 0;
    if (!rolling) { px.rect(g, Math.round(cx - 6 * u), Math.round(cy), Math.round(12 * u), Math.round(40 * u), '#14081c'); px.rect(g, Math.round(cx - 4 * u), Math.round(cy), Math.round(8 * u), Math.round(40 * u), '#5a5a70'); }
    px.disc(g, cx, cy, R + 3 * u, '#14081c'); px.disc(g, cx, cy, R + 1.5 * u, '#ffcc33');
    const COL = ['#d02838', '#2858d0', '#e8d030', '#101018', '#ff2e88', '#30a860', '#ffcc33', '#8a40d0'], NAMES = ['TOMATO', 'LASER', 'MIME', 'BANKRUPT', 'DISCO', 'GOONS', 'JACKPOT', 'SPIN'];
    for (let i = 0; i < 8; i++) {
      const a0 = b.rot + i * Math.PI / 4, a1 = a0 + Math.PI / 4, pts = [[cx, cy]]; for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      px.poly(g, pts, b.void[i] ? '#050508' : COL[i]); const am = a0 + Math.PI / 8; px.line(g, cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, '#14081c', 1);
      if (R > 12) E.font.text(g, b.void[i] ? 'VOID' : NAMES[i], Math.round(cx + Math.cos(am) * R * .66), Math.round(cy + Math.sin(am) * R * .66 - 2), '#fff', { align: 'center', font: 'tiny', outline: false, shadow: '#000' });
      if (!b.void[i]) { const bx = cx + Math.cos(am) * R * .88, by = cy + Math.sin(am) * R * .88, lit = Math.floor(t * 6 + i) % 2; px.disc(g, bx, by, 3 * u, '#14081c'); px.disc(g, bx, by, 2.4 * u, partFlash(b, 'b' + i) ? '#fff' : lit ? '#fff7a0' : '#ffb030'); }
    }
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + b.rot * .3; if (Math.floor(t * 8 + i) % 2) px.dot(g, cx + Math.cos(a) * (R + 1.5 * u), cy + Math.sin(a) * (R + 1.5 * u), '#fff'); }
    px.disc(g, cx, cy, 15 * u, '#14081c'); px.disc(g, cx, cy, 13.5 * u, fl || partFlash(b, 'core') ? '#fff' : b.jackpotOn ? '#ffe068' : '#c8d0e0'); E.font.text(g, '$', Math.round(cx), Math.round(cy - 3), '#14081c', { align: 'center', outline: false });
    const kick = b.click > 0 ? 2 : 0; px.poly(g, [[cx - 5 * u, cy - R - 7 * u - kick], [cx + 5 * u, cy - R - 7 * u - kick], [cx, cy - R + 3 * u]], '#14081c'); px.poly(g, [[cx - 3.5 * u, cy - R - 6 * u - kick], [cx + 3.5 * u, cy - R - 6 * u - kick], [cx, cy - R + 1 * u]], '#ff3344');
  }, { solid: true });
  if (b.beams) for (const bm of b.beams) { const a = bm.ang !== undefined ? bm.ang : bm.a, live = bm.t > .8; r.decal(() => { const [ax, ay] = r.w(b.x, b.y, 1), [bx, by] = r.w(b.x + Math.cos(a) * 400, b.y + Math.sin(a) * 400, 1); px.line(r.tgt, ax, ay, bx, by, live ? '#ff3a6a' : '#ff9ab0', live ? 3 : 1); }); }
}
function paintLance(r, b, w, t) {
  if (b.stage === 'starmaker' || b.stage === 'transition' && b.sub !== 'crash') {
    if (b.hidden) return;
    r.shadow(b.x, b.y, 24, .35 + Math.sin(b.bob * 2) * .05);
    const z = 26 + Math.sin(b.bob * 2.4) * 3;
    for (const c of b.cones) if (c.lit || true) r.decal(() => { r.groundArc(b.x, b.y, 14, 150, c.a - .16, c.a + .16, c.lit ? '#fff7a0' : '#ffe9a0', c.lit ? .55 : .15); });
    if (b.slam) { const s = b.slam; if (s.state === 'tele') r.decal(() => { r.groundRing(s.x, s.y, 30, '#ff3344', .9); r.groundDisc(s.x, s.y, 30 * Math.min(1, s.t), '#ff3344', .25); }); }
    if (b.shock) r.decal(() => r.groundRing(b.shock.x, b.shock.y, b.shock.r, '#ffffff', .9));
    const rig = MT.hostRig('lance'); const up = b.slam && (b.slam.state === 'rise') ? 40 + b.slam.t * 200 : 0;
    r.queue(b.x, b.y, 4, g => {
      const [cx, cy] = r.w(b.x, b.y, z + up), u = U(r, b.x, b.y, z), fl = b.flash > 0;
      px.ell(g, cx, cy + 4 * u, 24 * u, 10 * u, '#14081c'); px.ell(g, cx, cy + 3 * u, 23 * u, 9 * u, fl ? '#fff' : '#e8a818'); px.ell(g, cx, cy + 1 * u, 18 * u, 6 * u, '#ffe068');
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + t * 3; px.dot(g, cx + Math.cos(a) * 21 * u, cy + 3 * u + Math.sin(a) * 8 * u, Math.floor(t * 10 + i) % 2 ? '#fff' : '#ff2e88'); }
      px.blend(g, .5, 'add', () => { px.ell(g, cx, cy + 12 * u, 14 * u, 4 * u, Math.floor(t * 20) % 2 ? '#2ee6ff' : '#9affff'); });
      for (const [id, sd] of [['turL', -1], ['turR', 1]]) if (b.partAlive(id)) { const tx = cx + sd * 38 * u, ty = cy; px.disc(g, tx, ty, 8 * u, '#14081c'); px.disc(g, tx, ty, 7 * u, partFlash(b, id) ? '#fff' : '#9aa0b0'); px.disc(g, tx, ty, 4 * u, '#fff7a0'); }
    }, { solid: true });
    if (rig) r.actor(b.x, b.y, z + 8 + up, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: b.flash > 0 ? '#fff' : undefined });
  } else if (b.sub === 'crash') {
    const rig = MT.hostRig('lance'); r.queue(b.x, b.y, 4, g => { const [cx, cy] = r.w(b.x, b.y, 4), u = U(r, b.x, b.y, 4); px.ell(g, cx, cy, 22 * u, 9 * u, '#5a4a20'); px.blend(g, .6, 'add', () => px.disc(g, cx, cy - 6 * u, 10 * u, '#ff9a3c')); }, {});
    if (rig) r.actor(b.x + 18, b.y + 10, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), {});
  }
  if (b.stage === 'network' || (b.stage === 'transition' && b.sub === 'crash')) {
    const wu = b.wallU;
    r.queue(184, 20, 30, g => {
      const [x0, y0] = r.w(76, 16, 70 * wu), [x1, y1] = r.w(292, 16, 0); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), '#06060c'); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0), 1, '#ffcc33');
      if (wu < .99) return;
      for (const p of b.parts) if (p.tv && p.alive) {
        const x = b.px(p), y = b.py(p), [sx, sy] = r.w(x, y, 30), u = U(r, x, y, 30), ch = b.channels.find(c => 'tv' + c.i === p.id), fl = p.flash > 0;
        px.rect(g, Math.round(sx - 12 * u), Math.round(sy - 9 * u), Math.round(24 * u), Math.round(18 * u), '#14081c'); px.rect(g, Math.round(sx - 10.5 * u), Math.round(sy - 7.5 * u), Math.round(21 * u), Math.round(15 * u), fl ? '#fff' : '#2a2a3a');
        const sw = Math.round(18 * u), sh = Math.round(12 * u), X = Math.round(sx - 9 * u), Y = Math.round(sy - 6 * u);
        if (!ch) { px.rect(g, X, Y, sw, sh, '#10182a'); px.rect(g, X, Y + Math.round((t * 10 + x) % sh), sw, 1, '#1c2c4a'); }
        else { const tele = ch.t < .5; if (tele && Math.floor(t * 30) % 2) px.rect(g, X, Y, sw, sh, '#ffffff'); else if (ch.ch === 'static') { for (let i = 0; i < 18; i++) px.rect(g, X + Math.floor(MT.fxr() * sw), Y + Math.floor(MT.fxr() * sh), 2, 1, MT.fxr() < .5 ? '#fff' : '#888'); px.rect(g, X, Y, sw, sh, 'rgba(0,0,0,0)'); } else if (ch.ch === 'news') { px.rect(g, X, Y, sw, sh, '#1840a0'); px.rect(g, X, Y + sh - 3, sw, 3, '#d02838'); px.rect(g, X + 2, Y + 2, 6, 5, '#f0c8a0'); } else if (ch.ch === 'cartoon') { px.rect(g, X, Y, sw, sh, '#60d0ff'); px.disc(g, X + sw / 2, Y + sh / 2, 3 * u, '#ffcc33'); } else if (ch.ch === 'shopping') { px.rect(g, X, Y, sw, sh, '#30a860'); E.font.text(g, '$', X + sw / 2, Y + 1, '#fff', { align: 'center', outline: false }); } else { px.rect(g, X, Y, sw, sh, '#7a2ab0'); px.disc(g, X + sw / 2, Y + sh / 2, 4 * u, '#f0c8a0'); px.rect(g, X + sw / 2 - 2, Y + sh / 2 + 1, 4, 1, '#fff'); } }
        if (ch && ch.ch === 'news' && ch.t > ch.tele) { const [bx, by] = r.w(x, y + 200, 0); const live = ch.t > ch.tele + .8; px.line(g, sx, sy + 9 * u, bx, by, live ? '#ffffff' : '#ff9ab0', live ? 4 : 1); }
      }
      const eye = b.part('eye'); if (eye.alive) { const [ex, ey] = r.w(184, 54, 36), u = U(r, 184, 54, 36), op = b.eyeOpen; px.disc(g, ex, ey, 21 * u, '#14081c'); px.disc(g, ex, ey, 19 * u, eye.flash > 0 ? '#fff' : '#c8d0e0'); px.disc(g, ex, ey, 14 * u, '#101828'); px.disc(g, ex, ey, (6 + op * 5) * u, op > .5 ? '#ff3344' : '#2ee6ff'); px.dot(g, ex - 3 * u, ey - 3 * u, '#fff'); }
    }, { solid: true });
  }
}

// ===== 19-react.js =====
// MASH TV: the broadcast layer. Gameplay emits events; this table turns them into lines, crowd, stings and banners (cosmetic only: safe on hub clients).
MT.hud = MT.hud || { banner() {}, popup() {}, tutorial() {} };   // replaced by 31-hud
const lines = MT.lines = { cur: null, q: [], lastQuip: -99, now: 0, last: null };
lines.allowed = prio => { if (MT.cheats && MT.cheats.muteChatter && prio < 3) return false; const c = MT.game && MT.game.settings.chatter; if (prio >= 3) return true; if (c === 'Off') return prio >= 2 && false; if (c === 'Less') return prio >= 1; return true; };
lines.say = function (spk, text, o = {}) {
  const prio = o.prio === undefined ? 1 : o.prio;
  if (!lines.allowed(prio) && !o.force) return null;
  if (prio === 0) { if (lines.now - lines.lastQuip < 6) return null; lines.lastQuip = lines.now; }
  const item = { spk, text, prio, hint: o.hint, done: false, t: 0, dur: 0, voice: o.voice, silent: !!o.silent };
  if (lines.cur && prio > lines.cur.prio) { lines.cur.done = true; lines.cur = null; lines.q = lines.q.filter(q => q.prio >= prio); }
  else if (lines.cur && prio === 0) return null;
  if (lines.cur) { if (lines.q.length < 4) lines.q.push(item); } else lines.start(item);
  return item;
};
lines.start = function (item) {
  lines.cur = item; item.t = 0;
  const voice = item.voice || ({ LANCE: 'lance', PENNY: 'penny', ANNC: 'annc', NETWORK: 'network', MASHY: 'mashy', SPONSOR: 'lance' }[item.spk] || 'lance');
  item.dur = MT.babble ? MT.babble.say(item.text, voice, { emotion: 1 }) : item.text.length / 14; item.dur = Math.max(.8, item.dur);
  if (MT.audioDuck) MT.audioDuck(item.dur + .4);
};
lines.update = function (dt) {
  lines.now += dt; const c = lines.cur; if (!c) return;
  c.t += dt; if (c.t > c.dur + .9 || c.skip) { c.done = true; lines.cur = null; if (lines.q.length) { lines.q.sort((a, b) => b.prio - a.prio); lines.start(lines.q.shift()); } }
};
lines.skip = function () { if (lines.cur) lines.cur.skip = true; };
lines.clear = function () { lines.cur = null; lines.q = []; };
lines.shown = function () { const c = lines.cur; if (!c) return ''; const n = Math.ceil(c.text.length * Math.min(1, c.t / (c.dur * .92))); return c.text.slice(0, n); };
// a cutscene line: returns a handle {done}; yield E.until(() => h.done)
lines.cut = function (spk, text, o = {}) { const it = lines.say(spk, MT.sub(text, o.vars || {}), { prio: 3, force: true, voice: o.voice }); return it || { done: true }; };
const pool = (key, vars) => { const p = MT.TEXT.pool[key]; const i = (lines.pi = lines.pi || {}); i[key] = ((i[key] || 0) + 1 + Math.floor(MT.fxr() * 3)) % p.length; return MT.sub(p[i[key]], vars); };
MT.react = {
  handle(w, ev) {
    const d = ev.data, g = w.game, S = MT.sfx, C = MT.crowd, hud = MT.hud, T = MT.TEXT;
    switch (ev.name) {
      case 'shot': S('shot_' + d.w, { x: 1 }); break;
      case 'laser': S('laser'); break;
      case 'slide': S('slide'); break;
      case 'hit': S('hitE'); break;
      case 'kill': S('pop'); break;
      case 'boom': S('boom'); break;
      case 'rocketBoom': S('rocketBoom'); break;
      case 'pop': S('popcorn'); break;
      case 'swing': S('baton'); break;
      case 'clap': S('clap'); break;
      case 'popperBurst': S('popperPop'); break;
      case 'fuse': S('fuse'); break;
      case 'mimeBeep': S('beep'); break;
      case 'mimeBlast': S('mimeBlast'); break;
      case 'mimePfft': S('pfft'); break;
      case 'beam': S('beam'); break;
      case 'throw': S('boo'); break;
      case 'splat': S('splat'); break;
      case 'lens': S('lens'); break;
      case 'shell': S('shell'); break;
      case 'roar': S('roar'); break;
      case 'stomp': S('stomp'); break;
      case 'wallCrash': S('crash'); break;
      case 'tink': S('tink'); break;
      case 'bossHit': S('bossHit'); break;
      case 'doorOpen': S('doorOpen'); break;
      case 'doorSlam': S('doorSlam'); break;
      case 'pyro': S('pyro'); break;
      case 'beltAlarm': S('alarm'); break;
      case 'wheelClick': S('wheelClick'); break;
      case 'drop': S('zip'); break;
      case 'land': S('land'); break;
      case 'cageOpen': S('fanfare'); hud.banner('KEY CAGE OPEN!', '#ffcc33', 1.6); break;
      case 'safeOpen': S('fanfare'); hud.banner('THE SAFE IS OPEN!', '#ffcc33', 1.6); break;
      case 'cash': { const c = w.cs.find(q => q.slot === d.slot); if (d.amt > 0 && !d.kill || (d.kill && c)) { g.particles.text(d.x, d.y, 14, '+' + MT.fmt$(d.amt), c ? c.color : '#ffd23a', { scale: d.amt >= 5000 ? 2 : 1 }); } if (!d.kill) S('cash'); else S('coin'); break; }
      case 'bomb': S('bomb'); C('gasp', .5); hud.banner('SHOWSTOPPER!', '#ffffff', .8); break;
      case 'showboat': { S('flourish'); C('cheer', Math.min(1, d.gain / 20)); g.particles.text(d.x, d.y, 30, 'STYLE +' + Math.round(d.gain), '#ff8ad8', { scale: 2 }); if (d.gain >= 10) lines.say('LANCE', pool('boat'), { prio: 0 }); break; }
      case 'multikill': C('cheer', .6); lines.say('LANCE', d.n >= 6 ? T.pool.multi[2] : d.n >= 4 ? T.pool.multi[1] : T.pool.multi[0], { prio: 0 }); break;
      case 'hurt': S('buzzer'); C('ooh', .6); if (MT.fxr() < .5) lines.say('LANCE', pool('hurt'), { prio: 0 }); break;
      case 'lowHp': lines.say('LANCE', pool('low'), { prio: 1 }); break;
      case 'death': S('death'); C('laugh', .7); hud.banner('MASHED!', '#ff3344', 1.4); lines.say('LANCE', pool('death', { NAME: d.name }), { prio: 1 }); break;
      case 'out': hud.banner('OUT OF LIVES!', '#ff3344', 1.4); break;
      case 'rejoin': S('oneup'); break;
      case 'weapon': { S('powerup'); const W = MT.WEAPONS[d.w]; if (W) hud.banner(W.name + '!', '#7affb0', 1.1); break; }
      case 'capsule': g.particles.glints(d.x, d.y, 12, 6, '#fff'); break;
      case 'expire': S('expire'); hud.banner('BACK TO BASICS', '#c8c0e0', .9); break;
      case 'pickup': S('powerup'); break;
      case 'prize': { S('prizeFanfare'); hud.banner('YOU WON: ' + d.name + '! (' + MT.fmt$(d.value) + ')', '#ffcc33', 2.4); C('cheer', .6); lines.say('PENNY', 'OOOH! ' + d.name + '! ' + d.joke, { prio: 1 }); break; }
      case 'key': { S('keyChime'); if (d.bonus) hud.banner('KEY BONUS +$10,000!', '#ffcc33', 1.4); else hud.banner('GOLDEN KEY ' + d.n + '/' + MT.KEYS_TOTAL, '#ffcc33', 1.8); if (d.first) lines.say('LANCE', T.pool.key[0], { prio: 1 }); else lines.say('LANCE', T.pool.key[1], { prio: 0 }); break; }
      case 'mimeKey': lines.say('LANCE', T.pool.mime[0], { prio: 1 }); break;
      case 'life': S('oneup'); hud.banner('ENCORE!', '#ffcc33', 1.4); lines.say('LANCE', T.pool.life[0], { prio: 0 }); break;
      case 'prime': S('primeSting'); hud.banner('PRIME TIME!', '#ff2e88', 2); C('cheer', 1); if (MT.music) MT.music.layer('prime', 1); lines.say('LANCE', pool('prime'), { prio: 1 }); break;
      case 'primeEnd': if (MT.music) MT.music.layer('prime', 0); break;
      case 'stunt': hud.banner("WE'RE LOSING VIEWERS!", '#ff3344', 2); S('alarm'); lines.say('LANCE', pool('stunt'), { prio: 1 }); break;
      case 'bankrupt': S('bankrupt'); hud.banner('BANKRUPT!', '#ff3344', 1.6); break;
      case 'jackpot': S('fanfare'); break;
      case 'spinAgain': hud.banner('SPIN AGAIN!', '#2ee6ff', 1.2); break;
      case 'wheelStop': hud.banner(MT.WHEEL_SEGS[d.seg] + '!', '#ffcc33', 1.6); S('drumHit'); lines.say('LANCE', MT.WHEEL_SEGS[d.seg] + '!', { prio: 2 }); break;
      case 'wheelBreaks': hud.banner('THE WHEEL BREAKS LOOSE!', '#ff3344', 2); lines.say('LANCE', T.boss.wheel.phase3, { prio: 3, force: true }); break;
      case 'bossPhase3': hud.banner("MASHY'S GONE MASHY!", '#ff3344', 2); lines.say('LANCE', T.boss.mashy.phase3, { prio: 3, force: true }); break;
      case 'commercial': hud.banner("WE'LL BE RIGHT BACK!", '#2ee6ff', 2.5); S('jingle'); lines.say('LANCE', T.boss.lance.commercial[0][1], { prio: 3, force: true }); break;
      case 'lanceRobot': S('glitch'); hud.banner('LANCE WAS A ROBOT ALL ALONG!', '#ff2e88', 3); break;
      case 'networkReveal': S('glitch'); hud.banner('THE NETWORK', '#2ee6ff', 2.5); break;
      case 'channel': S('channelFlip'); break;
      case 'partDown': S('partDown'); break;
      case 'bossDead': S('bossDead'); C('cheer', 1); break;
      case 'micDrop': S('slam'); break;
      case 'hatchOpen': S('hatch'); break;
      case 'enemy': if (d.first && T.intro[d.kind] && w.mode !== 'client' && !w.session && !w.demo) { lines.say('LANCE', T.intro[d.kind][0], { prio: 2, hint: T.intro[d.kind][1] }); } break;
      case 'roomIntro': S('mashStart'); if (!w.demo) lines.say('LANCE', pool('roomStart'), { prio: 0 }); break;
      case 'roomStart': break;
      case 'wave': break;
      case 'clear': if (!d.boss) { S('tada'); hud.banner('ROOM CLEAR!', '#7affb0', 1.8); C('cheer', .8); lines.say('LANCE', pool('clear'), { prio: 1 }); } else { S('bossFanfare'); } break;
      case 'exit': hud.banner('PICK A DOOR!', '#ffcc33', 2); S('beacon'); break;
      case 'exitPicked': break;
      case 'hurry': hud.banner('HURRY UP!', '#ff3344', 1.5); lines.say('LANCE', T.pool.hurry[0], { prio: 1 }); break;
      case 'statuette': S('prizeFanfare'); hud.banner('THE NETWORK (YES, ALL OF IT)!', '#ffcc33', 3); break;
      case 'leave': hud.banner(d.name + ' LEFT THE STUDIO', '#c8c0e0', 1.8); break;
    }
  }
};

// ===== 20-content.js =====
// MASH TV: episodes, maps and rooms as data (section 7). A room is one entry; wave strings are parsed by W().
// wave string: "@2 N goon 6 .35, S goon 6 +spread@center" | cond: @sec and/or <=left joined by '|'; '+item@where'; '!script'
function W(s) {
  const sp = s.indexOf(' '), cond = s.slice(0, sp), rest = s.slice(sp + 1), w = { spawn: [], items: [] };
  for (const c of cond.split('|')) { if (c[0] === '@') w.at = +c.slice(1); else if (c.startsWith('<=')) w.left = +c.slice(2); }
  for (let part of rest.split(',')) {
    part = part.trim(); if (!part) continue;
    if (part[0] === '+') { const [k, where] = part.slice(1).split('@'); w.items.push([k, where === 'center' ? 'center' : where === 'drop' ? 'drop' : where.split('.').map(Number)]); }
    else if (part[0] === '!') { w.script = part.slice(1); w.final = true; }
    else { const t = part.split(' '); let door = t[0]; if (door.includes('.')) door = door.split('.').map(Number); w.spawn.push([door, t[1], +t[2], t[3] ? +t[3] : .25]); }
  }
  return w;
}
MT.W = W;
const room = (id, name, o) => Object.assign({ id, name, ep: +id[0], type: 'battle', waves: [], par: 70, exits: {}, set: ['studio', 'warehouse', 'rooftop'][+id[0] - 1] }, o, { waves: (o.waves || []).map(W) });
const RM = {};
const add = (r) => { RM[r.id] = r; return r; };
// ---- EPISODE 1 ----
add(room('1-1', 'OPENING NUMBER', { type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true, waves: [
  '@2 N goon 6 .35, S goon 6 .35', '<=2|@10 E goon 8, W goon 8', '<=4|@8 all goon 3, +spread@center', '<=4|@8 N clapbot 6, S clapbot 6', '<=5|@8 all goon 5, N popper 2'] }));
add(room('1-2', 'MIME FIELD', { type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' }, place: [3, 7, 13, 17, 5, 15, 3, 7, 13, 17].map((x, i) => ['mime', x, [3, 2, 2, 3, 6, 6, 9, 10, 10, 9][i]]), waves: [
  '@2 S goon 8', '<=3|@8 N popper 2, E goon 8', '<=3|@10 W goon 10, +rockets@drop', '<=4|@8 all clapbot 3', '<=3|@8 N popper 3, S popper 3, E goon 6'] }));
add(room('1-3', 'CLAP TRAP', { type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65, waves: [
  '@2 E clapbot 8, W clapbot 8', '<=3|@8 N goon 12', '<=4|@8 all clapbot 5, +records@drop', '<=4|@8 S popper 4, E goon 8', '<=3|@8 all clapbot 6, N goon 6'] }));
add(room('1-4', 'KEY GAUNTLET', { type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 60, key: { rule: 'survive' }, surviveLen: 35, items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']], waves: [] }));
add(room('1-5', 'WEAPONS LOCKER', { type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80, items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]], waves: [
  '@3 all goon 8', '<=4|@8 N popper 4, S popper 4', '<=5|@8 E clapbot 10, W clapbot 10', '<=5|@8 all goon 8, +speed@drop', '<=4|@10 N goon 12, S goon 12, sides popper 2'] }));
add(room('1-6', 'CASH COW CORRAL', { type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, cashRoom: true, key: { rule: 'crate' }, crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]], waves: [
  '@2 N goon 10', '<=3|@8 E goon 10, W goon 10', '<=4|@8 all clapbot 4', '<=4|@8 S popper 3, N popper 3, all goon 3'] }));
add(room('1-B', "MASHY'S BIG DEBUT", { type: 'boss', cell: [1, 0], boss: 'mashy', exits: {}, par: 0 }));
// ---- EPISODE 2 ----
add(room('2-1', 'AISLE 9 RUMBLE', { type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70, waves: [
  '@2 N goon 10, S goon 10', '<=4|@8 E disco 1, W disco 1', '<=3|@10 all goon 6, +popcorn@center', '<=4|@8 N popper 3, S clapbot 10', '<=4|@8 E disco 2, W goon 12'] }));
add(room('2-2', 'CONVEYOR CHAOS', { type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt' }, hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }], waves: [
  '@2 E goon 12', '<=4|@8 W clapbot 10', '<=4|@8 N popper 4, S popper 4', '<=4|@8 all goon 8, +laser@drop', '<=3|@8 E disco 2, W disco 1'] }));
add(room('2-3', 'DISCO DEPOT', { type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70, waves: [
  '@2 N discoBig 2', '<=2|@10 E goon 10, W goon 10', '<=4|@8 S disco 2, +laser@drop', '<=4|@8 all clapbot 5', '<=3|@9 N discoBig 2, S goon 8'] }));
add(room('2-4', 'TOMATO TERRITORY', { type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier', kind: 'hecklerKing' }, waves: [
  '@2 audience heckler 4', '<=2|@8 N goon 12', '<=4|@8 audience heckler 6', '<=4|@8 S popper 4, E clapbot 8', '<=3|@8 audience hecklerKing 1, audience heckler 3, +life@drop'] }));
add(room('2-5', 'TANK YARD', { type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80, items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]], waves: [
  '@2 N tank 1', '<=1|@10 all goon 8', '<=4|@8 E tank 1, W tank 1', '<=2|@10 S popper 4, N clapbot 10, +shield@drop', '<=3|@9 N tank 2, all goon 6'] }));
add(room('2-6', 'BLOWOUT SALE', { type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, cashRoom: true, key: { rule: 'crate' }, crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]], waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4', '<=3|@8 E disco 1, W disco 1', '<=3|@8 all clapbot 5', '<=3|@8 N tank 1, S goon 10'] }));
add(room('2-B', 'THE BIG SPIN', { type: 'boss', cell: [1, 0], boss: 'wheel', exits: {}, par: 0 }));
// ---- EPISODE 3 ----
add(room('3-1', 'RED CARPET RIOT', { type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75, waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4, N disco 1', '<=3|@8 E tank 1, W popper 4', '<=3|@9 N brute 1', '<=2|@10 all clapbot 6, S goon 8'] }));
add(room('3-2', 'PYRO PIT', { type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' }, hazards: [{ kind: 'pyro', vents: [4, 8, 12, 16].flatMap(x => [3, 6, 9].map(y => [x, y])) }], waves: [
  '@2 N goon 12', '<=4|@8 E clapbot 10, W clapbot 10', '<=4|@8 S popper 4, +records@drop', '<=3|@8 audience heckler 4', '<=3|@8 !finaleBurst, all goon 4'] }));
add(room('3-3', 'CABLE TANGLE', { type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75, waves: [
  '@2 N snake 1', '@8 all goon 6', '<=4|@10 E snake 1, W snake 1', '<=3|@10 S popper 4, +laser@drop', '<=2|@10 N snake 2, all clapbot 3'] }));
add(room('3-4', 'PENTHOUSE VAULT', { type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' }, locks: [[1, 0], [3, 0], [5, 0], [7, 0]], waves: [
  '@2 all goon 8', '<=4|@8 audience heckler 4', '<=3|@8 E tank 1', '<=3|@8 all clapbot 5', '<=3|@8 N brute 1'] }));
add(room('3-5', 'THE AFTER-PARTY', { type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85, items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]], waves: [
  '@2 N snake 1, S goon 10', '<=3|@8 E discoBig 1, W tank 1', '<=3|@8 audience heckler 6', '<=3|@9 N brute 1, all clapbot 4', '<=3|@9 all goon 10, N popper 4'] }));
add(room('3-6', 'MASCOT MAYHEM', { type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier', kind: 'brute', nth: 2 }, waves: [
  '@2 N brute 1', '<=1|@10 all goon 8', '<=3|@8 E brute 1, W popper 4', '<=3|@8 S snake 1, +rockets@drop', '<=2|@10 N brute 2'] }));
add(room('3-B', 'LANCE LUSTRE LIVE!', { type: 'boss', cell: [1, 0], boss: 'lance', exits: {}, par: 0 }));
add(Object.assign(room('GR', 'THE GREEN ROOM', { type: 'bonus', waves: [], par: 0, set: 'greenroom' }), { ep: 4, green: true }));
MT.ROOMS = RM;
// the Lightning Round (AI Hub): reuse episode rooms with one NEXT exit each
MT.LIGHTNING = ['L1', 'L2', 'L3', 'LB'];
for (const [lid, src, next] of [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB'], ['LB', '1-B', null]]) {
  const s = RM[src]; RM[lid] = Object.assign({}, s, { id: lid, lightning: true, tutorial: false, exits: next ? { N: next } : {}, key: s.key && s.key.rule === 'mimes' ? s.key : null });
}
// ---- episodes ----
const PR = (ep, rows) => rows.map(([name, value, joke]) => ({ name, value, joke }));
MT.EPISODES = {
  1: { n: 1, name: 'THE PILOT', set: 'studio', song: 'studioBattle', stunt: 'clapbot', start: '1-1', boss: '1-B', place: 'STUDIO 9', intro: 'ep1', prizes: PR(1, [
    ['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!'], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!'], ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!'],
    ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!'], ['A DRY-LAND JET SKI', 8000, "IT DOESN'T FLOAT, BUT IT LOOKS GREAT!"], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!']]) },
  2: { n: 2, name: 'SWEEPS WEEK', set: 'warehouse', song: 'warehouseFunk', stunt: 'tank', start: '2-1', boss: '2-B', place: 'THE MEGAMART PRIZE WAREHOUSE', intro: 'ep2', prizes: PR(2, [
    ['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!'], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!'], ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!'],
    ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!'], ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!'], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!']]) },
  3: { n: 3, name: 'THE SEASON FINALE', set: 'rooftop', song: 'finaleOverture', stunt: 'brute', start: '3-1', boss: '3-B', place: 'THE ROOFTOP GALA', intro: 'ep3', prizes: PR(3, [
    ['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!'], ['A PERSONAL WEATHER MACHINE', 15000, "RAIN ON EVERYONE'S PARADE!"], ['A DIAMOND TOOTHBRUSH', 8000, "FOR A SMILE LIKE LANCE'S!"],
    ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!'], ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!'], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!']]) }
};
MT.KEYS_NEEDED = 5; MT.KEYS_TOTAL = 9;
// keys per episode: left path gets 2 (rooms 1-2 'mimes' and 1-4 'survive'); right path 1 (1-6 crate); ep3 etc. -> 3 each, 9 in all
MT.roomsWithKeys = ep => Object.values(RM).filter(r => r.ep === ep && r.key).map(r => r.id);
// ---- scripted wave events & hazards ----
MT.SCRIPTS = {
  finaleBurst(w) { const h = w.hazards.find(q => q.kind === 'pyro'); if (!h) return; w.scriptBusy = true; h.burst(w, 2, () => { w.scriptBusy = false; w.queueSpawn('all', 'goon', 4, .25); }); }
};
MT.makeHazard = function (w, spec) {
  if (spec.kind === 'conveyor') {
    const h = { kind: 'conveyor', rows: spec.rows, dirs: spec.dirs.slice(), t: 0, warn: 0, speedK: 1 };
    h.push = (x, y) => { for (let i = 0; i < h.rows.length; i++) { const y0 = 24 - 8 + h.rows[i] * 16, y1 = y0 + 32; if (y > y0 && y < y1) return [h.dirs[i] * 40 * h.speedK, 0]; } return [0, 0]; };
    h.update = (dt, w) => {
      h.t += dt; const p = h.t % 12; if (p > 10.5) { h.warn = 1; h.speedK = Math.max(.15, 1 - (p - 10.5) / 1.5 * .85); if (!h.alarm) { h.alarm = true; w.event('beltAlarm', {}); } }
      else { h.warn = 0; h.alarm = false; h.speedK = 1; }
      if (p < dt && h.t > 1) { h.dirs = h.dirs.map(d => -d); }
    };
    h.state = () => h.dirs.join(',');
    return h;
  }
  if (spec.kind === 'pyro') {
    const vents = spec.vents.map(([cx, cy]) => { const [x, y] = MT.cellXY(cx, cy); return { cx, cy, x, y, state: 'off', t: 0 }; });
    const h = { kind: 'pyro', vents, t: 0, patN: 0, pending: 0, cb: null };
    const pats = [v => v.cy === [3, 6, 9][h.patN % 3 === 0 ? (h.patN / 4 | 0) % 3 : 0], null];
    h.fire = (v, tele) => { if (v.state === 'off') { v.state = 'tele'; v.t = tele || 1; } };
    h.pattern = (w) => {
      const n = h.patN++, kinds = ['rows', 'cols', 'checker', 'allButLane']; const k = kinds[n % 4]; const xs = [4, 8, 12, 16], ys = [3, 6, 9];
      const lane = xs[Math.floor(MT.R.ai() * 4)], row = ys[Math.floor(MT.R.ai() * 3)], col = xs[Math.floor(MT.R.ai() * 4)];
      for (const v of vents) { let on = false; if (k === 'rows') on = v.cy === row; else if (k === 'cols') on = v.cx === col; else if (k === 'checker') on = ((v.cx / 4 | 0) + (v.cy / 3 | 0)) % 2 === 0; else on = v.cx !== lane; if (on) h.fire(v, 1); }
    };
    h.burst = (w, times, cb) => { h.bursting = { left: times, cb, gap: 0 }; };
    h.update = (dt, w) => {
      h.t += dt;
      if (!h.bursting && w.phase === 'waves' && h.t > 3.5) { h.t = 0; h.pattern(w); }
      if (h.bursting) { const b = h.bursting; if (vents.every(v => v.state === 'off')) { if (b.left > 0) { b.left--; for (const v of vents) h.fire(v, 1); } else { h.bursting = null; if (b.cb) b.cb(); } } }
      for (const v of vents) {
        if (v.state === 'off') continue; v.t -= dt;
        if (v.state === 'tele' && v.t <= 0) { v.state = 'fire'; v.t = 1.2; w.event('pyro', { x: v.x, y: v.y }); }
        else if (v.state === 'fire') {
          for (const c of w.cs) if (c.state === 'alive' && MT.hyp(c.x - v.x, c.y - v.y) < 12) w.hurtContestant(c, 1, 'flame', 0, MT.angTo(v, c));
          for (const e of w.enemies) if (e.alive && !e.invuln && MT.hyp(e.x - v.x, e.y - v.y) < 12 + e.r * .5) w.hurtEnemy(e, 3 * dt, null, { quiet: true });
          if (v.t <= 0) { v.state = 'off'; }
        }
      }
    };
    return h;
  }
  throw new Error('hazard ' + spec.kind);
};

// ===== 21-text.js =====
// MASH TV: every word of text lives here (or in the prize tables of 20-content). {NAME} {PRIZE} {N} are substituted.
MT.TEXT = {
  title: 'MASH TV', sub: 'LIVE FROM STUDIO 9', tagline: "MASH 'EM! CASH 'EM! SURVIVE THE SHOW.",
  looks: { ROCKET: 'A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!', VOLT: 'A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!', MOXIE: 'THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!', GOLDIE: 'WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!' },
  coldOpen: [
    ['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!'],
    ['LANCE', "GOOD EVENING, PLANET EARTH! I'M LANCE LUSTRE, AND THIS IS THE ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!"],
    ['LANCE', 'TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!'],
    ['PENNY', 'AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!'],
    ['LANCE', "LET'S PLAY... MASH TV! KA-CHING! KA-BOOM!"]],
  ep: { 1: [['LANCE', 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!']],
    2: [['LANCE', "IT'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!"], ['PENNY', 'LIVE FROM THE MEGAMART PRIZE WAREHOUSE!']],
    3: [['LANCE', 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!']] },
  boss: {
    mashy: { intro: [['PENNY', 'OOH, HERE HE COMES!'], ['LANCE', 'PLEASE WELCOME THE NETWORK\'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!'], ['MASHY', 'MASHY LOVE YOU! MASHY MASH YOU!']], phase3: "UH-OH! MASHY'S GONE MASHY!", dead: 'MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!' },
    wheel: { intro: [['LANCE', "IT'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!"]], phase3: "THE WHEEL'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!", dead: 'THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!' },
    lance: { intro: [['LANCE', 'YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!']], commercial: [['LANCE', "WE'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!"], ['SPONSOR', 'KRUNCH-O! THE CEREAL THAT CRUNCHES BACK!']],
      robot: [['LANCE', 'THIS... ISN\'T... OVER... PLEASE... STAND... BY...'], ['ANNC', 'LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!']], network: [['NETWORK', 'THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED.']], dead: [['NETWORK', 'SIGNAL... LOST...']] } },
  recapIntro: { 1: ["LET'S SEE WHAT OUR CONTESTANTS WON!", 'SEE YOU AFTER THE BREAK!'], 2: ["LET'S SEE WHAT OUR CONTESTANTS WON!", "DON'T GO ANYWHERE! LEGALLY, YOU CAN'T!"], 3: ["WHAT A SEASON! LET'S COUNT IT UP!", 'ONE LAST MESSAGE FROM OUR SPONSORS!'] },
  greenEntry: 'YOU FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!',
  endA: [['PENNY', 'CONGRATULATIONS! YOU SURVIVED THE SEASON!'], ['LANCE', '...HELLO, PLANET EARTH! NEXT SEASON ON MASH TV...']], endAcard: 'MASH TV WILL RETURN.', endAhint: 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM',
  endB: [['ANNC', "BREAKING NEWS! TONIGHT'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!"], ['ANNC', 'MASH TV HAS BEEN... CANCELLED!']], endBcard: 'MASH TV - CANCELLED. THANKS FOR WATCHING.', endBstinger: 'TONIGHT: MASHED POTATOES!', endBchan: 'CHANNEL 3,000',
  gameOver: ['AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!', 'YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!'], cont: 'WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!',
  sessionEnd: "THAT'S OUR SHOW! TUNE IN NEXT ROUND!", sessionDiff: 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.', sessionSat: 'YOU SAT THIS ONE OUT', sessionOver: 'THANKS FOR WATCHING',
  intro: {
    goon: ['OUR SECURITY GOONS! UNION-MADE AND UNDERPAID!', "ONE SHOT EACH. DON'T GET SURROUNDED."], clapbot: ['THE CLAPBOTS! THEY CLAP! THEY HOP! THEY BITE!', 'FAST AND ERRATIC. KEEP MOVING.'],
    popper: ["PARTY POPPERS! KEEP YOUR DISTANCE, THEY'RE A BLAST!", 'SHOOT THEM BEFORE THEY GET CLOSE.'], mime: ['LAND MIMES! TRAPPED IN A BOX... OF EXPLOSIVES!', 'SHOOT THEM FROM A DISTANCE.'],
    disco: ['DISCO NEVER DIED! IT JUST GOT ARMED!', 'THEY BOUNCE. WATCH THE LIGHT BEAMS.'], heckler: ['OUR STUDIO AUDIENCE HAS... OPINIONS! AND TOMATOES!', 'DODGE THE RED RINGS. SPLATS SLOW YOU.'],
    tank: ['THE DOLLY TANK! SMILE FOR THE CAMERA... FOREVER!', 'MOVE WHEN THE LENS FLASHES.'], snake: ['CABLE SNAKES! WHO LEFT THESE WIRES LYING AROUND?', 'SHOOT THE SEGMENTS OFF.'],
    brute: ["BRAND MASCOT ALERT! IT'S... THE CEREAL KILLER!", 'SIDESTEP THE CHARGE. STUNNED, IT TAKES DOUBLE DAMAGE.'] },
  pool: {
    roomStart: ['DOORS OPEN IN 3... 2... OH, THEY\'RE ALREADY OPEN!', 'THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!', "MASH 'EM! CASH 'EM! KA-CHING! KA-BOOM!", "DON'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!", "LET'S GET READY TO... MASH!", 'OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!', 'THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!', 'MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!'],
    clear: ['ROOM CLEAR! THE JANITORS HATE YOU!', 'MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!', "NOW THAT'S MUST-MASH TV!", "PICK A DOOR, ANY DOOR! THEY'RE ALL TERRIBLE!", 'STAY TUNED... AND STAY ALIVE!', 'WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!'],
    hurt: ["OOH! THAT'S GONNA LEAVE A MARK!", "WALK IT OFF! THE NETWORK DOESN'T PAY FOR BANDAGES!", 'SO CLOSE! I MEAN... HOORAY!'],
    death: ['MASHED! LET\'S SEE THAT AGAIN IN SLOW MOTION!', "DON'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!", "THEY'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!", 'AND DOWN GOES {NAME}! THE CROWD GOES MILD!'],
    multi: ['MULTI-MASH!', 'A TRIPLE! THE SPONSORS LOVE A TRIPLE!', 'TOTAL MASH-ACRE!'], boat: ['WORK THAT CAMERA!', 'SHOWMANSHIP! OR STUPIDITY! SAME THING!', "THE CAMERAS LOVE YOU! THE GOONS DON'T!"],
    prime: ['RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!', 'PRIME TIME, BABY! FIVE TIMES THE CASH!', 'THE SPONSORS ARE WEEPING WITH JOY!'],
    stunt: ["WE'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!", 'BORING! RELEASE THE STUNT!', 'THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!'],
    key: ['A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!', 'ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!'],
    life: ['ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!'], hurry: ['PICK A DOOR! WE\'RE PAYING OVERTIME HERE!'], low: ["ONE MORE HIT AND YOU'RE A COMMERCIAL BREAK!"], mime: ['MIME OVER MATTER!']
  },
  tut: { move: 'MOVE', aim: 'AIM + FIRE', cap: 'WALK OVER POWER-UPS', boat: 'SHOWBOAT NEAR ENEMIES FOR RATINGS', slide: 'SLIDE THROUGH DANGER', bomb: 'SHOWSTOPPER CLEARS THE SCREEN', door: 'PICK A DOOR!' },
  sponsors: [['KRUNCH-O', 'THE CEREAL THAT CRUNCHES BACK'], ['MEGAMART', 'WE SELL EVERYTHING. EVEN THIS SHOW.'], ['DOOM COLA', 'TASTE THE END'], ['LAFF TRAK', 'CANNED LAUGHTER FOR AWKWARD SILENCES']],
  roomTypes: { start: 'START', battle: 'BATTLE', key: 'KEY', armory: 'ARMORY', cash: 'CASH', hazard: 'HAZARD', boss: 'BOSS' },
  howto: [
    { title: 'CONTROLS', rows: [['move', 'MOVE'], ['aim', 'AIM AND FIRE'], ['slide', 'SLIDE (DODGE)'], ['bomb', 'SHOWSTOPPER (SCREEN BOMB)'], ['showboat', 'SHOWBOAT (TAUNT FOR RATINGS)'], ['pause', 'PAUSE AND DEV MODE']], note: 'KEYBOARD ONLY? ARROW KEYS FIRE IN EIGHT WAYS. A SECOND PAD? PRESS START TO JOIN.' },
    { title: 'THE SHOW', lines: ['SEALED STUDIO ROOMS. FOUR DOORS. HORDES.', 'SHOOT EVERYTHING. GRAB CASH AND ABSURD PRIZES.', 'KEEP THE RATINGS UP: THEY MULTIPLY YOUR CASH.', 'AT 100 IT\'S PRIME TIME: FIVE TIMES THE CASH!', 'CLEAR THE ROOM, THEN PICK AN EXIT DOOR.', 'COLLECT FIVE GOLDEN KEYS FOR THE GREEN ROOM.'] },
    { title: 'POWER-UPS 1', caps: ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield'] },
    { title: 'POWER-UPS 2', caps: ['speed', 'bomb', 'life'] }],
  capLines: { spread: 'THREE BOLTS AT ONCE', rockets: 'BIG BOOM, BIG SPLASH', popcorn: 'LOBBED BAGS THAT POP', laser: 'PIERCES EVERYTHING IN A LINE', records: 'ORBITING DISCS BLOCK SHOTS', shield: 'INVULNERABLE BUBBLE', speed: 'RUN AND SLIDE FASTER', bomb: 'SHOWSTOPPER: +1 SCREEN BOMB', life: 'ENCORE: +1 LIFE' }
};
MT.sub = (s, o = {}) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));

// ===== 30-ui-kit.js =====
// MASH TV: UI kit: bulb frames, focus lists, sliders, banners, lower thirds, cards. Widgets work headless (state only).
const UI = MT.ui = {};
const F = E.font;
UI.t = 0;
UI.pointer = () => { const g = MT.game; try { return g.input.pointer ? g.input.pointer() : null; } catch (e) { return null; } };
UI.clicked = () => { const g = MT.game; try { return g.input.clicked ? g.input.clicked() : null; } catch (e) { return null; } };
UI.anyPressed = a => MT.game.players.some(p => p.pressed(a));
UI.anyRepeat = a => MT.game.players.some(p => p.repeat && p.repeat(a, .35, .09));
UI.promptInput = () => MT.lastInput();
UI.inRect = (p, x, y, w, h) => p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
// a bulb-framed box
UI.bulbs = function (g, x, y, w, h, t, color, on) {
  const n = Math.max(4, Math.floor((w + h) / 5)); let per = 2 * (w + h);
  for (let i = 0; i < n; i++) { const d = i / n * per; let bx, by; if (d < w) { bx = x + d; by = y; } else if (d < w + h) { bx = x + w; by = y + d - w; } else if (d < 2 * w + h) { bx = x + w - (d - w - h); by = y + h; } else { bx = x; by = y + h - (d - 2 * w - h); } const lit = on ? ((Math.floor(t * 8 - i * .6) % 3) === 0) : (i % 2 === 0); px.rect(g, Math.round(bx) - 1, Math.round(by) - 1, 2, 2, lit ? (color || '#fff7a0') : '#6a4a10'); }
};
UI.panel = function (g, x, y, w, h, o = {}) {
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .92 : o.alpha });
  if (o.bulbs) UI.bulbs(g, x - 1, y - 1, w + 2, h + 2, UI.t, o.color, o.chase);
};
UI.text = (g, s, x, y, c, o) => F.text(g, s, Math.round(x), Math.round(y), c || '#fff7e8', Object.assign({ shadow: '#000', outline: false }, o));
UI.title = (g, s, x, y, scale, o) => F.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: scale || 3, align: 'center', colors: ['#ff2e88', '#ffcc33'], depth: 2, depthColor: '#5a1a50' }, o));
// prompt bar at the bottom of the screen
UI.promptBar = function (r, pairs) { r.overlay(g => { E.px.rect(g, 0, r.H - 17, r.W, 17, 'rgba(10,4,20,.8)'); MT.glyph.prompt(g, r.W / 2, r.H - 14, pairs, UI.promptInput(), { align: 'center' }); }); };
// ---- Menu: vertical focus list ----
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = Object.assign({ y: 100, rowH: 22, w: 190, scale: 2 }, o); this.rects = []; this.t = 0; this.moved = false; }
  get cur() { return this.items[this.i]; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, items.length - 1); }
  update(dt) {
    this.t += dt; const n = this.items.length; if (!n) return;
    if (UI.anyRepeat('up')) { this.move(-1); } if (UI.anyRepeat('down')) { this.move(1); }
    const it = this.cur;
    if (it && it.adjust) { if (UI.anyRepeat('left')) it.adjust(-1); if (UI.anyRepeat('right')) it.adjust(1); }
    const p = UI.pointer(), mv = this._pp && p && (Math.abs(p[0] - this._pp[0]) + Math.abs(p[1] - this._pp[1]) > 0.5); this._pp = p;
    if (p && mv) for (let k = 0; k < this.rects.length; k++) if (UI.inRect(p, ...this.rects[k]) && !this.items[k].disabled) { if (this.i !== k) { this.i = k; MT.sfx('blip'); } }
    const c = UI.clicked(); if (c) for (let k = 0; k < this.rects.length; k++) if (UI.inRect(c, ...this.rects[k]) && !this.items[k].disabled) { this.i = k; this.pick(); return; }
    if (UI.anyPressed('confirm') || UI.anyPressed('start')) this.pick();
    else if (UI.anyPressed('cancel') && this.o.onCancel) { MT.sfx('back'); this.o.onCancel(); }
  }
  move(d) { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; MT.sfx('blip'); } }
  pick() { const it = this.cur; if (!it || it.disabled) return; MT.sfx('confirm'); if (it.onPick) it.onPick(this.i, it); }
  draw(r) {
    const o = this.o, W = r.W; this.rects = [];
    r.overlay(g => {
      const x = o.x === undefined ? (W - o.w) / 2 : o.x;
      this.items.forEach((it, k) => {
        const y = o.y + k * o.rowH, foc = k === this.i, rect = [x, y, o.w, o.rowH - 3]; this.rects[k] = rect;
        if (foc) { const bump = 1 + Math.sin(UI.t * 6) * .01; UI.panel(g, x - 4, y - 2, o.w + 8, o.rowH, { bulbs: true, chase: true, color: '#fff7a0', bg: ['#5a1a66', '#2a0f40'] }); }
        else E.ui.box(g, x, y, o.w, o.rowH - 3, { bg: ['#2a1446', '#1a0c2c'], border: '#4a2a6a', alpha: .75 });
        const label = typeof it.label === 'function' ? it.label() : it.label; const col = it.disabled ? '#6a5a80' : foc ? '#ffe068' : '#fff7e8';
        UI.text(g, label, x + (it.value ? 8 : o.w / 2), y + (o.rowH - 3 - 7 * o.scale) / 2, col, { align: it.value ? 'left' : 'center', scale: o.scale });
        if (it.value) UI.text(g, typeof it.value === 'function' ? it.value() : it.value, x + o.w - 8, y + (o.rowH - 3 - 7 * o.scale) / 2, foc ? '#7affb0' : '#c8c0e0', { align: 'right', scale: o.scale });
      });
    });
  }
}
UI.Menu = Menu;
// ---- banners (centre, big, bulb-framed) ----
const banners = UI.banners = [];
UI.banner = function (text, color, secs) { banners.push({ text, color: color || '#ffcc33', t: 0, dur: secs || 1.6 }); if (banners.length > 3) banners.shift(); };
UI.updateBanners = dt => { for (const b of banners) b.t += dt; for (let i = banners.length - 1; i >= 0; i--) if (banners[i].t > banners[i].dur) banners.splice(i, 1); };
UI.drawBanners = function (r) {
  if (!banners.length) return;
  r.overlay(g => {
    let y = r.H * .3;
    for (const b of banners) {
      const u = Math.min(1, b.t / .25), out = Math.max(0, (b.t - (b.dur - .3)) / .3), k = E.ease.outBack(u), sc = text => text.length > 24 ? 1 : 2; const s = sc(b.text);
      const w = F.width(b.text, { scale: s }) + 24, h = 7 * s + 14, x = r.W / 2 - w / 2 * k, ww = w * k;
      if (ww < 4) continue; g.save && g.save(); const a = 1 - out;
      px.blend(g, a, 'normal', () => { UI.panel(g, Math.round(r.W / 2 - ww / 2), Math.round(y), Math.round(ww), h, { bulbs: true, chase: true, color: b.color, bg: ['#240a40', '#0c0418'], border: b.color }); if (u > .6) UI.text(g, b.text, r.W / 2, y + 7, b.color, { align: 'center', scale: s }); });
      y += h + 4;
    }
  });
};
// ---- lower third ----
UI.drawLowerThird = function (r) {
  const c = MT.lines.cur; if (!c || (MT.game.settings.subtitles === false)) return; const txt = MT.lines.shown();
  r.overlay(g => {
    const w = Math.min(r.W - 24, 330), x = (r.W - w) / 2, lines = F.wrap(txt || ' ', w - 16, {}), h = 18 + lines.length * 9 + (c.hint ? 10 : 0), y = r.H - h - 22;
    UI.panel(g, Math.round(x), Math.round(y), Math.round(w), h, { bulbs: false, bg: ['#240a40', '#0c0418'], alpha: .82 });
    const nameCol = { LANCE: '#ff2e88', PENNY: '#2ee6ff', ANNC: '#ffcc33', MASHY: '#d8b878', NETWORK: '#7affb0', SPONSOR: '#ffcc33' }[c.spk] || '#fff';
    const nm = { LANCE: 'LANCE LUSTRE', PENNY: 'PENNY PRIZE', ANNC: 'ANNOUNCER', MASHY: 'MASHY', NETWORK: 'THE NETWORK', SPONSOR: 'SPONSOR' }[c.spk] || c.spk;
    px.rect(g, Math.round(x + 6), Math.round(y - 5), F.width(nm) + 10, 10, nameCol); UI.text(g, nm, x + 11, y - 3, '#14081c', { shadow: false });
    lines.forEach((l, i) => UI.text(g, l, x + 8, y + 8 + i * 9, '#fff7e8'));
    if (c.hint && c.t > c.dur * .5) UI.text(g, c.hint, x + 8, y + h - 12, '#7affb0');
  });
};
// ---- popups, tutorial prompts ----
MT.hud = { banner: UI.banner, tut: null, popups: [] };
// ---- cards: a TV title card ----
UI.card = function (r, big, small, sub, t, color) {
  r.overlay(g => {
    E.px.rect(g, 0, 0, r.W, r.H, '#05020c');
    for (let i = 0; i < 30; i++) E.px.rect(g, 0, (i * 9 + t * 40) % r.H, r.W, 1, 'rgba(255,255,255,.05)');
    const k = E.ease.outBounce(Math.min(1, t / .7));
    UI.bulbs(g, 14, 14, r.W - 28, r.H - 28, t, color || '#fff7a0', true);
    UI.text(g, big, r.W / 2, r.H / 2 - 50 - (1 - k) * 80, color || '#ff2e88', { align: 'center', scale: 3 });
    UI.title(g, small, r.W / 2, r.H / 2 - 18 + (1 - k) * 40, 3);
    if (sub) UI.text(g, sub, r.W / 2, r.H / 2 + 36, '#c8c0e0', { align: 'center' });
  });
};
// ---- TV static wipe ----
UI.static = function (r, t, a) { r.overlay(g => { px.blend(g, a, 'normal', () => { for (let i = 0; i < 140; i++) E.px.rect(g, Math.floor(MT.fxr() * r.W), Math.floor(MT.fxr() * r.H), 1 + Math.floor(MT.fxr() * 20), 1 + Math.floor(MT.fxr() * 2), MT.fxr() < .5 ? '#fff' : '#555'); E.px.rect(g, 0, Math.floor((t * 300) % r.H), r.W, 3, '#ccc'); }); }); };
// ---- slider-ish value row used by dev mode ----
UI.bar = (g, x, y, w, h, u, c) => { E.px.rect(g, x, y, w, h, '#14081c'); E.px.rect(g, x + 1, y + 1, Math.round((w - 2) * MT.clamp(u, 0, 1)), h - 2, c || '#ffcc33'); };

// ===== 31-hud.js =====
// MASH TV: the in-play HUD (drawn in r.overlay, anchored to r.W / r.H).
const HUD = MT.hud;
HUD.tutorials = []; HUD.tutSeen = {};
HUD.tutorial = function (id, act, text, secs) { if (HUD.tutSeen[id] || (MT.run && MT.run.mode !== 'arcade' && MT.run.mode !== 'rehearsal')) return; HUD.tutSeen[id] = true; HUD.tutorials.push({ act, text, t: 0, dur: secs || 4 }); };
HUD.reset = function () { HUD.tutSeen = {}; HUD.tutorials.length = 0; };
HUD.update = function (dt) { UI.t += dt; UI.updateBanners(dt); for (const t of HUD.tutorials) t.t += dt; HUD.tutorials = HUD.tutorials.filter(t => t.t < t.dur); MT.lines.update(dt); };
function slotPanelPos(slot, r) { const w = 100, h = 30; return [slot === 0 || slot === 2 ? 4 : r.W - w - 4, slot < 2 ? 14 + (slot === 0 ? 0 : 0) : r.H - h - 20]; }
HUD.drawPlayer = function (g, r, c, w) {
  const [x, y] = slotPanelPos(c.slot, r), W = 100, Hh = 31, col = c.color;
  E.ui.box(g, x, y, W, Hh, { bg: ['#2a1446', '#140a24'], border: col, alpha: .82 });
  if (c.rig && !MT.cfg.skipRigs) { try { c.rig.drawPortrait(g, x + 2, y + 2, 16, {}); } catch (e) { /* */ } } else px.disc(g, x + 10, y + 10, 6, col);
  UI.text(g, c.name, x + 21, y + 2, col, { font: 'tiny' });
  UI.text(g, c.state === 'out' ? 'OUT' : MT.fmt$(c.cash), x + 21, y + 8, c.state === 'out' ? '#ff5a5a' : '#fff7e8', { scale: 1 });
  // hp pips
  for (let i = 0; i < c.maxHp; i++) { const on = i < c.hp; px.rect(g, x + 21 + i * 6, y + 18, 5, 5, '#14081c'); px.rect(g, x + 22 + i * 6, y + 19, 3, 3, on ? '#ff3a5a' : '#4a2a3a'); }
  // lives
  for (let i = 0; i < Math.min(6, Math.max(0, c.lives)); i++) px.disc(g, x + 4 + i * 6, y + 25, 2.2, col);
  if (c.lives > 6) UI.text(g, '+' + (c.lives - 6), x + 40, y + 22, '#fff', { font: 'tiny' });
  // bombs
  for (let i = 0; i < c.bombs; i++) px.disc(g, x + W - 8 - i * 7, y + 26, 2.6, '#e8e8f8');
  // weapon
  const W2 = MT.WEAPONS[c.wpn]; if (c.wpn !== 'blaster') { px.rect(g, x + W - 22, y + 3, 19, 9, '#14081c'); UI.text(g, W2.letter, x + W - 17, y + 4, '#7affb0'); const u = c.wMax ? c.wT / c.wMax : 0; px.rect(g, x + W - 22, y + 13, Math.round(19 * u), 2, c.wT < 2 && Math.floor(w.time * 8) % 2 ? '#ff3344' : '#7affb0'); }
  let ax = x + 52; for (const k in c.addons) { const lt = c.addons[k]; if (lt < 2 && Math.floor(w.time * 8) % 2) continue; px.rect(g, ax, y + 3, 9, 9, '#14081c'); UI.text(g, MT.WEAPONS[k].letter, ax + 2, y + 4, '#ffcc33', { font: 'tiny' }); ax += 10; }
  if (c.state === 'out') { MT.glyph.draw(g, x + 4, y + Hh + 2, 'start', MT.lastInput()); UI.text(g, 'TO CONTINUE', x + 20, y + Hh + 4, '#ffcc33', { font: 'tiny' }); }
};
HUD.draw = function (r, w, scene) {
  r.overlay(g => {
    UI.t = UI.t;
    // top-left bugs
    px.rect(g, 4, 3, 36, 9, 'rgba(10,4,20,.7)'); px.disc(g, 8, 7, 2, Math.floor(UI.t * 2) % 2 ? '#ff3344' : '#7a1020'); UI.text(g, 'LIVE', 13, 4, '#fff', { font: 'tiny' }); UI.text(g, 'MASH 9', 4, 12, '#ffcc33', { font: 'tiny', shadow: '#000' });
  });
  // ratings gauge top centre
  r.overlay(g => {
    const cx = r.W / 2, y = 3, R = w.rat.R, X = w.rat.X, prime = w.rat.prime > 0;
    E.ui.box(g, cx - 54, y, 108, 20, { bg: ['#2a1446', '#140a24'], border: prime ? (Math.floor(UI.t * 8) % 2 ? '#ff2e88' : '#ffcc33') : '#ffcc33', alpha: .85 });
    UI.text(g, 'RATINGS', cx - 50, y + 2, '#c8c0e0', { font: 'tiny' });
    UI.bar(g, cx - 50, y + 9, 60, 6, R / 100, prime ? '#ff2e88' : R > 60 ? '#7affb0' : R > 30 ? '#ffcc33' : '#ff5a5a');
    UI.text(g, prime ? 'PRIME!' : '×' + X, cx + 16, y + 5, prime ? '#ff2e88' : '#ffcc33', { scale: prime ? 1 : 2 });
    if (!prime && w.rat.cool <= 0) { /* applause light */ px.disc(g, cx + 48, y + 5, 2, R > 85 && Math.floor(UI.t * 6) % 2 ? '#fff7a0' : '#4a3a20'); }
    const run = MT.run; const info = (w.rm ? w.rm.id + ' ' + w.rm.name : ''); UI.text(g, info, cx, y + 22, '#fff7e8', { align: 'center', font: 'tiny', shadow: '#000' });
    if (run && !w.session) UI.text(g, '★ ' + run.keys + '/' + MT.KEYS_TOTAL, cx + 56, y + 5, '#ffcc33', { font: 'tiny' });
    if (run && run.diff && !w.session) UI.text(g, run.diff[0] + run.diff.slice(1).toLowerCase(), cx - 56, y + 5, '#c8c0e0', { align: 'right', font: 'tiny' });
    // boss bar
    const b = w.boss;
    if (b && (w.phase === 'boss' || w.phase === 'bossDeath')) {
      const mains = b.parts.filter(p => p.main && p.alive); const hp = b.parts.filter(p => p.main).reduce((a, p) => a + Math.max(0, p.hp), 0), max = b.parts.filter(p => p.main).reduce((a, p) => a + p.max, 0);
      const bw = 140, bx = cx - bw / 2, by = y + 31; px.rect(g, bx - 1, by - 1, bw + 2, 10, '#14081c'); UI.bar(g, bx, by, bw, 8, max ? hp / max : 0, '#ff3a5a'); UI.text(g, b.name, cx, by + 1, '#fff', { align: 'center', font: 'tiny', shadow: '#000' });
      const parts = b.parts.filter(p => !p.tv && !p.seg); let i = 0; for (const p of b.parts) if (!p.main && p.alive && p.active !== false && !p.tv && p.seg === undefined) { px.rect(g, bx + i * 8, by + 10, 6, 3, '#ffcc33'); i++; }
    }
  });
  for (const c of w.cs) HUD.drawPlayer0(r, c, w);
  // wave dots / pick a door
  r.overlay(g => {
    if (w.rm && w.phase === 'waves' && !w.survive && !w.rm.boss) { const n = w.rm.waves.length; for (let i = 0; i < n; i++) px.disc(g, r.W / 2 - (n - 1) * 4 + i * 8, r.H - 8, 2.2, i <= w.waveI ? '#ffcc33' : '#4a3a60'); }
    if (w.phase === 'exit' && !w.exitPicked && !MT.lines.cur) UI.text(g, 'PICK A DOOR!', r.W / 2, r.H - 20, Math.floor(UI.t * 4) % 2 ? '#7affb0' : '#fff', { align: 'center', scale: 2 });
  });
  // tutorial prompts
  r.overlay(g => {
    let y = r.H - (MT.lines.cur ? 62 : 36); for (const t of HUD.tutorials) {
      const pairs = t.act ? [[t.act, t.text]] : null; const w2 = (pairs ? MT.glyph.width(t.act, MT.lastInput()) + 6 : 0) + F.width(t.text) + 16; const x = (r.W - w2) / 2;
      UI.panel(g, Math.round(x), y, Math.round(w2), 16, { bulbs: false }); if (pairs) MT.glyph.prompt(g, x + 8, y + 3, pairs, MT.lastInput()); else UI.text(g, t.text, x + 8, y + 4, '#7affb0'); y -= 18;
    }
  });
  UI.drawLowerThird(r); UI.drawBanners(r);
  if (MT.devBadge && MT.devBadge()) r.overlay(g => { px.rect(g, r.W / 2 - 14, r.H - 40, 28, 10, '#ff8a20'); UI.text(g, 'DEV', r.W / 2, r.H - 39, '#14081c', { align: 'center', shadow: false }); });
  // mouse reticle
  const c0 = w.cs[0]; if (c0 && c0.input && c0.intent && c0.intent.aimSrc === 'mouse' && c0.intent.mouseAt) {
    const m = r.w(c0.intent.mouseAt[0], c0.intent.mouseAt[1], 0); r.overlay(g => { px.line(g, m[0] - 5, m[1], m[0] - 2, m[1], '#ffcc33', 1); px.line(g, m[0] + 2, m[1], m[0] + 5, m[1], '#ffcc33', 1); px.line(g, m[0], m[1] - 5, m[0], m[1] - 2, '#ffcc33', 1); px.line(g, m[0], m[1] + 2, m[0], m[1] + 5, '#ffcc33', 1); px.dot(g, m[0], m[1], c0.color); });
  }
};
HUD.drawPlayer0 = function (r, c, w) { r.overlay(g => HUD.drawPlayer(g, r, c, w)); };
HUD.cursorOn = function (on) { try { const el = MT.game.screen.canvas; if (el) el.style.cursor = on ? 'none' : ''; } catch (e) { /* */ } };

// ===== 32-screens.js =====
// MASH TV: front-end and between-room scenes (title, difficulty, lobby, how to play, episodes, scores, about, cards, recap, endings).
const SC = MT.scenes = MT.scenes || {};
const cx = r => r.W / 2;
// ---- shared backdrop: studio dark with sweeping spotlights and marquee frame ----
MT.backdrop = function (r, t, o = {}) {
  r.sky(o.sky || ['#0a0418', '#2a1050', '#12082a']);
  r.overlay(g => {
    px.blend(g, .22, 'add', () => { for (let i = 0; i < 4; i++) { const a = Math.sin(t * .6 + i * 1.9) * .5, x0 = r.W * (i + .5) / 4, col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a60ff'][i]; px.poly(g, [[x0 - 4, 0], [x0 + 4, 0], [x0 + a * r.H * 1.2 + 40, r.H], [x0 + a * r.H * 1.2 - 40, r.H]], col); } });
    px.rect(g, 0, r.H - 40, r.W, 40, '#14081c'); for (let x = 0; x < r.W; x += 12) px.rect(g, x, r.H - 40, 1, 40, '#1c0e2c');
    if (o.bulbs !== false) UI.bulbs(g, 3, 3, r.W - 6, r.H - 6, t, '#fff7a0', true);
  });
};
// front-end idle → attract (10 s without input on any device)
MT.frontIdle = function (dt, ok) {
  const game = MT.game; MT.idle.step(game, dt);
  if (MT.idle.t >= 10 && ok !== false && !(game.menuOpen && game.menuOpen())) { MT.idle.t = 0; game.go('attract'); return true; }
  return false;
};
MT.resetIdle = () => { MT.idle.t = 0; };
function bgText(g, s, x, y, c, o) { UI.text(g, s, x, y, c, o); }

// ---- TITLE ----
SC.title = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.state = 'press'; MT.music.play('theme'); MT.hud.cursorOn(true); MT.resetIdle(); MT.touchOnly = MT.detectTouchOnly(); this.menu = null; this.lastTouch = MT.touchOnly; MT.net && MT.net.onTitle && MT.net.onTitle(); this.run = null; MT.run = null; MT.cheatsReset && MT.cheatsReset(); MT.game.timeScale = 1; MT.overlay.open = 0; MT.ov.cur = null; MT.game.allowJoin(false); },
  buildMenu() {
    const game = MT.game;
    this.menu = new UI.Menu([
      { label: 'START THE SHOW', onPick: () => game.go('difficulty') }, { label: 'EPISODES', onPick: () => game.go('episodes') }, { label: 'HOW TO PLAY', onPick: () => game.go('howto') },
      { label: 'TOP EARNERS', onPick: () => game.go('scores', { fresh: false }) }, { label: 'OPTIONS', onPick: () => game.menu('settings') }, { label: 'ABOUT & CREDITS', onPick: () => game.go('about') }], { y: 108, rowH: 18, w: 170, scale: 1 });
  },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game; MT.lines.update(dt);
    if (MT.touchOnly) {
      if (!MT.detectTouchOnly() && (MT.keyEver || MT.padEver)) MT.touchOnly = false;
      const c = UI.clicked(); if (c && this.btn && UI.inRect(c, ...this.btn)) game.menu('settings');
      if (MT.frontIdle(dt)) return; return;
    }
    if (this.state === 'press') {
      if (game.players.some(p => p.anyPressed()) || UI.clicked()) { this.state = 'menu'; this.buildMenu(); MT.sfx('confirm'); MT.resetIdle(); game.players.forEach(p => p.consumeAll()); }
    } else { this.menu.update(dt); }
    MT.frontIdle(dt);
  },
  draw(r) {
    MT.backdrop(r, this.t);
    const game = MT.game, k = E.ease.outBounce(Math.min(1, this.t / 1.1));
    r.overlay(g => {
      const ly = 20 + (k - 1) * 90 + (this.state === 'menu' ? 0 : 20);
      // CRT tv outline with bunny ears
      const tw = 210, th = 70, tx = r.W / 2 - tw / 2, ty = ly + 6;
      px.line(g, r.W / 2 - 4, ty, r.W / 2 - 26, ty - 14, '#c8d0e0', 2); px.line(g, r.W / 2 + 4, ty, r.W / 2 + 26, ty - 14, '#c8d0e0', 2); px.disc(g, r.W / 2 - 26, ty - 14, 2, '#ffcc33'); px.disc(g, r.W / 2 + 26, ty - 14, 2, '#ffcc33');
      E.ui.box(g, tx, ty, tw, th, { bg: ['#1c1034', '#0c0418'], border: '#c8d0e0', alpha: 1 });
      UI.bulbs(g, tx - 2, ty - 2, tw + 4, th + 4, this.t, '#fff7a0', true);
      UI.title(g, 'MASH TV', r.W / 2, ty + 12, 5);
      UI.text(g, MT.TEXT.sub, r.W / 2, ty + th - 14, '#2ee6ff', { align: 'center', scale: 1 });
      const sp = Math.floor(this.t * 3) % 4; px.dot(g, tx + tw - 18, ty + 14 - sp, '#fff'); px.line(g, tx + tw - 18, ty + 9, tx + tw - 18, ty + 19, '#fff', 1); px.line(g, tx + tw - 23, ty + 14, tx + tw - 13, ty + 14, '#fff', 1);
      if (MT.touchOnly) {
        const bw = 250, bh = 78, bx = r.W / 2 - bw / 2, by = r.H / 2 + 10; UI.panel(g, bx, by, bw, bh, { bulbs: true, chase: true });
        UI.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', r.W / 2, by + 10, '#ff5a8a', { align: 'center', scale: 1 }); UI.text(g, 'CONNECT A GAMEPAD OR PRESS A KEY', r.W / 2, by + 24, '#c8c0e0', { align: 'center' });
        this.btn = [r.W / 2 - 50, by + 42, 100, 26]; E.ui.box(g, ...this.btn, { bg: ['#5a1a66', '#2a0f40'], border: '#ffcc33', alpha: 1 }); UI.text(g, 'SETTINGS', r.W / 2, by + 49, '#ffe068', { align: 'center', scale: 1 });
      } else if (this.state === 'press') {
        if (Math.floor(this.t * 2) % 2 === 0) { const pi = MT.lastInput(); const w = F.width('PRESS  ') + MT.glyph.width('confirm', pi); UI.text(g, 'PRESS', r.W / 2 - w / 2, r.H / 2 + 42, '#ffe068', { scale: 1 }); MT.glyph.draw(g, r.W / 2 - w / 2 + F.width('PRESS ') + 3, r.H / 2 + 40, 'confirm', pi); }
        UI.text(g, MT.TEXT.tagline, r.W / 2, r.H / 2 + 62, '#c8c0e0', { align: 'center' });
      }
      UI.text(g, E.versionLabel ? E.versionLabel() + ' · MASH TV ' + MT.VERSION : MT.VERSION, 6, r.H - 10, '#7a6a98', { font: 'tiny' });
    });
    if (this.state === 'menu' && !MT.touchOnly) { this.menu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['dpad', 'MOVE']]); }
  }
};
// ---- DIFFICULTY ----
SC.difficulty = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; const g = MT.game; this.menu = new UI.Menu(['ROOKIE', 'CONTESTANT', 'CHAMPION'].map(n => ({ label: n, onPick: () => { this.pick = n; g.go('lobby', { diff: n }); } })), { y: 76, rowH: 24, w: 170, scale: 2, start: 1, onCancel: () => g.go('title') }); MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; this.menu.update(dt); MT.frontIdle(dt); },
  draw(r) {
    MT.backdrop(r, this.t); const it = ['ROOKIE', 'CONTESTANT', 'CHAMPION'][this.menu.i], d = MT.DIFF[it];
    r.overlay(g => { UI.title(g, 'CHOOSE YOUR ODDS', r.W / 2, 26, 3); const desc = { ROOKIE: 'EASY GOONS. SLOW BULLETS. A SOFT LANDING.', CONTESTANT: 'THE SHOW AS THE NETWORK INTENDED.', CHAMPION: 'ONE HIT AND YOU\'RE A COMMERCIAL BREAK.' }[it];
      UI.panel(g, r.W / 2 - 150, 156, 300, 44, { bulbs: false }); UI.text(g, desc, r.W / 2, 162, '#fff7e8', { align: 'center' }); UI.text(g, 'HP ' + d.hp + '   LIVES ' + d.lives, r.W / 2, 178, '#7affb0', { align: 'center', scale: 1 }); });
    this.menu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
  }
};
// ---- LOBBY ----
SC.lobby = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const game = MT.game; this.t = 0; this.diff = d.diff || 'CONTESTANT'; this.slots = [{ in: true, ready: false, look: 0, input: game.input }, { in: false }, { in: false }, { in: false }]; this.count = null;
    game.allowJoin({ max: 4, keys: false, onJoin: (input, n) => { const s = this.slots[n - 1]; if (s) { s.in = true; s.ready = false; s.look = n - 1; s.input = input; } } });
    for (let i = 1; i < game.players.length; i++) { const s = this.slots[i]; if (s) { s.in = true; s.ready = false; s.look = i; s.input = game.players[i]; } }
    this.rigs = {}; MT.resetIdle();
  },
  exit() { MT.game.allowJoin(false); },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game; MT.idle.step(game, dt);
    if (MT.idle.t >= 10 && this.slots.filter(s => s.in).length === 1 && !this.slots[0].ready) { MT.idle.t = 0; game.go('attract'); return; }
    this.slots.forEach((s, i) => { if (!s.in) return; const I = s.input; if (!I) return;
      if (!s.ready) { if (I.pressed('left')) { s.look = (s.look + 3) % 4; MT.sfx('blip'); } if (I.pressed('right')) { s.look = (s.look + 1) % 4; MT.sfx('blip'); } if (I.pressed('confirm') || I.pressed('start') && false) { s.ready = true; MT.sfx('confirm'); } else if (I.pressed('cancel')) { if (i === 0) { MT.sfx('back'); game.go('difficulty'); return; } s.in = false; game.removePlayer(I); } }
      else if (I.pressed('cancel')) { s.ready = false; MT.sfx('back'); } });
    const c = UI.clicked(); if (c) { const bw = r_lastW / 4; for (let i = 0; i < 4; i++) { const x = i * bw; if (c[0] >= x && c[0] < x + bw && this.slots[i].in && c[1] > 60 && c[1] < 170) { const s = this.slots[i]; if (c[0] > x + bw * .6 && !s.ready) s.look = (s.look + 1) % 4; else if (c[0] < x + bw * .4 && !s.ready) s.look = (s.look + 3) % 4; else s.ready = !s.ready; MT.sfx('confirm'); } } }
    const ins = this.slots.filter(s => s.in);
    if (ins.length && ins.every(s => s.ready)) { if (this.count === null) { this.count = 2; MT.sfx('mashStart'); } this.count -= dt; if (this.count <= 0) this.start(); } else this.count = null;
  },
  start() {
    const game = MT.game, players = []; this.slots.forEach((s, i) => { if (s.in) players.push({ slot: i, look: s.look, input: s.input }); });
    MT.newRun({ mode: 'arcade', diff: this.diff, players }); game.go('coldOpen');
  },
  draw(r) {
    r_lastW = r.W; MT.backdrop(r, this.t);
    r.overlay(g => {
      UI.title(g, "TONIGHT'S CONTESTANTS", r.W / 2, 12, 2);
      const bw = r.W / 4;
      this.slots.forEach((s, i) => {
        const x = i * bw + 4, w = bw - 8, y = 40, col = MT.PCOL[i];
        E.ui.box(g, x, y, w, 120, { bg: s.in ? ['#2a1446', '#140a24'] : ['#140a24', '#0a0414'], border: s.in ? col : '#3a2a50', alpha: .9 });
        px.blend(g, .25, 'add', () => px.poly(g, [[x + w / 2 - 6, y], [x + w / 2 + 6, y], [x + w - 6, y + 100], [x + 6, y + 100]], s.in ? col : '#444'));
        px.ell(g, x + w / 2, y + 104, w / 2 - 8, 6, s.in ? col : '#3a2a50');
        if (s.in) {
          const L = MT.LOOKS[s.look]; const key = i + ':' + s.look; if (!this.rigs[key]) this.rigs[key] = MT.contestantRig({ look: s.look, color: col }); const rig = this.rigs[key];
          if (rig && !MT.cfg.skipRigs) { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.ready ? 'cheer' : 'hips', expr: s.ready ? 'smile' : undefined }); try { rig.drawPortrait(g, x + w / 2 - 22, y + 14, 44, {}); } catch (e) { /* */ } }
          UI.text(g, MT.PNAMES[s.look], x + w / 2, y + 62, col, { align: 'center' }); UI.text(g, 'P' + (i + 1), x + 6, y + 4, col, { scale: 1 });
          const lines = F.wrap(MT.TEXT.looks[MT.PNAMES[s.look]], w - 8, { font: 'tiny' }); lines.slice(0, 4).forEach((l, k) => UI.text(g, l, x + w / 2, y + 74 + k * 7, '#c8c0e0', { align: 'center', font: 'tiny' }));
          UI.text(g, s.ready ? 'READY!' : '←  →', x + w / 2, y + 104, s.ready ? '#7affb0' : '#ffe068', { align: 'center' });
        } else { UI.text(g, 'EMPTY PODIUM', x + w / 2, y + 44, '#6a5a80', { align: 'center' }); { const fake = { lastDevice: 'gamepad', padStyle: () => MT.glyph.family(MT.lastInput()) }; const gw = MT.glyph.width('join', fake); const tw = gw + 4 + F.width('TO JOIN'); MT.glyph.draw(g, Math.round(x + w / 2 - tw / 2), y + 60, 'join', fake); UI.text(g, 'TO JOIN', Math.round(x + w / 2 - tw / 2 + gw + 4), y + 62, '#fff7e8', { scale: 1 }); UI.text(g, 'ON A GAMEPAD', x + w / 2, y + 74, '#c8c0e0', { align: 'center', font: 'tiny' }); } }
      });
      if (this.count !== null) UI.title(g, "LET'S PLAY!  " + Math.max(1, Math.ceil(this.count)), r.W / 2, 172, 3);
    });
    UI.promptBar(r, [['confirm', 'READY'], ['pgL', 'LOOK'], ['cancel', 'BACK']]);
  }
};
let r_lastW = 427;
// ---- HOW TO PLAY ----
SC.howto = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.page = 0; this.t = 0; this.from = d && d.from; MT.resetIdle(); },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game, n = MT.TEXT.howto.length;
    if (UI.anyPressed('right') || UI.anyPressed('tabR')) { this.page = (this.page + 1) % n; MT.sfx('tick'); } if (UI.anyPressed('left') || UI.anyPressed('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    const c = UI.clicked(); if (c) { if (c[0] > r_lastW / 2) this.page = (this.page + 1) % n; else this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    if (UI.anyPressed('cancel') || UI.anyPressed('confirm') && this.page === n - 1) { MT.sfx('back'); game.go('title'); } MT.frontIdle(dt);
  },
  draw(r) { r_lastW = r.W; MT.backdrop(r, this.t); MT.drawHowtoPage(r, this.page); UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'BACK']]); }
};
MT.drawHowtoPage = function (r, page) {
  const P = MT.TEXT.howto[page], pi = MT.lastInput();
  r.overlay(g => {
    UI.title(g, 'HOW TO PLAY', r.W / 2, 10, 3); UI.panel(g, 16, 36, r.W - 32, r.H - 74, { bulbs: false });
    UI.text(g, P.title + '   ' + (page + 1) + '/' + MT.TEXT.howto.length, r.W / 2, 42, '#ffcc33', { align: 'center', scale: 1 });
    if (P.rows) { P.rows.forEach(([id, label], i) => { const y = 60 + i * 20; MT.glyph.draw(g, 40, y, id, pi); UI.text(g, label, 90, y + 2, '#fff7e8', { scale: 1 }); }); UI.text(g, P.note, r.W / 2, r.H - 56, '#7affb0', { align: 'center', font: 'tiny' }); }
    else if (P.lines) P.lines.forEach((l, i) => UI.text(g, l, r.W / 2, 62 + i * 18, '#fff7e8', { align: 'center' }));
    else if (P.caps) P.caps.forEach((id, i) => {
      const y = 58 + i * 20, W = MT.WEAPONS[id]; let spr = id === 'bomb' ? MT.spr.bomb : id === 'life' ? MT.spr.life : MT.capSprite(id); px.sprite(g, spr, 38, y + 2);
      const nm = id === 'bomb' ? 'SHOWSTOPPER' : id === 'life' ? 'ENCORE' : W.name; UI.text(g, nm, 70, y, '#ffcc33', { scale: 1 }); UI.text(g, MT.TEXT.capLines[id], 70, y + 9, '#c8c0e0', { font: 'tiny' });
    });
  });
};
// ---- EPISODES (rehearsal) ----
SC.episodes = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; const g = MT.game, un = MT.sget('mashtv:unlocked', 1); this.menu = new UI.Menu([1, 2, 3].map(n => ({ label: () => 'EPISODE ' + n + (n > un ? '  (LOCKED)' : ''), disabled: n > un, onPick: () => { MT.newRun({ mode: 'rehearsal', diff: 'CONTESTANT', players: [{ slot: 0, look: 0 }], ep: n }); MT.flow.startEpisode(n); } })), { y: 76, rowH: 24, w: 220, scale: 2, onCancel: () => g.go('title') }); MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; this.menu.update(dt); MT.frontIdle(dt); },
  draw(r) { MT.backdrop(r, this.t); const n = this.menu.i + 1, E_ = MT.EPISODES[n]; r.overlay(g => { UI.title(g, 'EPISODES', r.W / 2, 22, 3); UI.panel(g, r.W / 2 - 140, 160, 280, 36, {}); UI.text(g, E_.name + ' · ' + E_.place, r.W / 2, 166, '#ffe068', { align: 'center' }); UI.text(g, 'REHEARSAL: NO HIGH SCORES', r.W / 2, 180, '#c8c0e0', { align: 'center', font: 'tiny' }); }); this.menu.draw(r); UI.promptBar(r, [['confirm', 'REHEARSE'], ['cancel', 'BACK']]); }
};
// ---- SCORES ----
SC.scores = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.fresh = d && d.fresh; this.hold = d && d.hold; this.fromAttract = d && d.attract; MT.resetIdle(); },
  update(dt) { this.t += dt; UI.t += dt; const game = MT.game; if (UI.anyPressed('confirm') || UI.anyPressed('cancel') || UI.clicked()) { MT.sfx('back'); game.go('title'); } MT.frontIdle(dt); },
  draw(r) { MT.backdrop(r, this.t, { sky: ['#2a1a05', '#5a3a0a', '#2a1a05'] }); r.overlay(g => { UI.title(g, 'TOP EARNERS', r.W / 2, 8, 3, { colors: ['#fff7a0', '#e8a818'] }); const t = MT.cab.table('show'); for (let i = 0; i < 10; i++) { const e = t[i], y = 42 + i * 16, c = i === 0 ? '#ffe068' : '#fff7e8'; UI.text(g, (i + 1) + '.', r.W / 2 - 100, y, c, { align: 'right' }); UI.text(g, e ? e.name : '---', r.W / 2 - 90, y, c); UI.text(g, MT.fmt$(e ? e.score : 0), r.W / 2 + 100, y, c, { align: 'right' }); } }); UI.promptBar(r, [['confirm', 'BACK']]); }
};
// ---- ABOUT & CREDITS ----
MT.aboutPages = function () {
  const A = MT.ABOUT, S = A.sourceInformation, pages = [];
  pages.push({ title: 'ABOUT MASH TV', lines: ['A 1-4 PLAYER TWIN-STICK ARENA SHOOTER SET INSIDE THE', 'DEADLIEST GAME SHOW ON TELEVISION.', '', 'THREE EPISODES. THREE BOSSES. NINE GOLDEN KEYS.', 'FIVE OF THEM OPEN THE GREEN ROOM.', '', 'BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED', 'WITH CONFETTI.', '', 'INSPIRED BY SMASH TV (1990). ALL TEXT, ART, MUSIC AND', 'SOUND ARE ORIGINAL AND MADE IN CODE.'] });
  pages.push({ title: 'CREDITS', lines: ['MASH TV', 'MADE WITH THE MY-3D2DGE ENGINE V0.85.2', 'HOSTED ON THE AI HUB (SESSION PROTOCOL V1)', 'MODEL: ANTHROPIC CLAUDE-SONNET-5-5, MEDIUM EFFORT', 'PLAN: PLAN.MD BY CLAUDE-OPUS-5-5', 'ORIGINAL MUSIC, SOUND AND ANIMALESE VOICES SYNTHESIZED', 'IN CODE. NO AUDIO FILES.', '', 'LANCE LUSTRE AND PENNY PRIZE ARE FICTIONAL AND', 'ARE NOT LEGALLY OBLIGATED TO LIKE YOU.'] });
  const kv = (o) => Object.entries(o).map(([k, v]) => [k.replace(/([A-Z])/g, ' $1').toUpperCase(), String(v)]);
  const rows = kv(S), groups = []; let cur = [], hh = 0; for (const rw of rows) { const h = 14 + Math.min(8, Math.ceil(rw[1].length / 70)) * 9; if (hh + h > 150 && cur.length) { groups.push(cur); cur = []; hh = 0; } cur.push(rw); hh += h; } if (cur.length) groups.push(cur); groups.forEach((gp, i) => pages.push({ title: 'SOURCE INFORMATION ' + (i + 1) + '/' + groups.length, kv: gp }));
  const Q = { testingFeedback: ['HOW MANY ISSUES DID TESTING CATCH?', 'HOW MANY WERE CRITICAL?', 'MOST HELPFUL TEST?', 'LEAST HELPFUL TEST?'], engineFeedback: ['WHAT DID YOU LIKE MOST?', 'DID YOU GET STUCK OR GUESS WRONG?', 'WHAT DID YOU HAVE TO BUILD YOURSELF?', 'WHAT WAS THE HARDEST PART?', 'WHAT DID YOU CHANGE IN THE ENGINE?', 'WHAT ONE THING WOULD YOU CHANGE?'], promptFeedback: ['WHAT DID YOU LIKE MOST?', 'WHAT WAS CONFUSING?', 'WHAT WAS THE HARDEST THING?', 'WHAT WOULD YOU CHANGE?'] };
  for (const [key, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) A[key].forEach((a, i) => pages.push({ title: title + ' ' + (i + 1) + '/' + A[key].length, q: Q[key][i], a: String(a) }));
  return pages;
};
SC.about = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.page = 0; this.pages = MT.aboutPages(); MT.resetIdle(); },
  update(dt) {
    this.t += dt; UI.t += dt; const n = this.pages.length;
    if (UI.anyPressed('right') || UI.anyPressed('tabR')) { this.page = (this.page + 1) % n; MT.sfx('tick'); } if (UI.anyPressed('left') || UI.anyPressed('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('tick'); }
    const c = UI.clicked(); if (c) { this.page = c[0] > r_lastW / 2 ? (this.page + 1) % n : (this.page + n - 1) % n; MT.sfx('tick'); }
    if (UI.anyPressed('cancel')) { MT.sfx('back'); MT.game.go('title'); } MT.frontIdle(dt);
  },
  draw(r) {
    r_lastW = r.W; MT.backdrop(r, this.t); const P = this.pages[this.page];
    r.overlay(g => {
      UI.title(g, 'ABOUT & CREDITS', r.W / 2, 8, 2); UI.panel(g, 14, 30, r.W - 28, r.H - 66, {}); UI.text(g, P.title + '   [' + (this.page + 1) + '/' + this.pages.length + ']', r.W / 2, 35, '#ffcc33', { align: 'center' });
      const W = r.W - 52;
      if (P.lines) P.lines.forEach((l, i) => UI.text(g, l, r.W / 2, 52 + i * 11, '#fff7e8', { align: 'center' }));
      else if (P.kv) { let y = 50; for (const [k, v] of P.kv) { UI.text(g, k, 24, y, '#7affb0', { font: 'tiny' }); const ls = F.wrap(v, W - 6, {}); ls.slice(0, 8).forEach((l, i) => UI.text(g, l, 24, y + 7 + i * 9, '#fff7e8')); y += 14 + Math.min(8, ls.length) * 9; } }
      else if (P.q) { UI.text(g, P.q, 24, 50, '#7affb0'); F.wrap(P.a, W, {}).slice(0, 12).forEach((l, i) => UI.text(g, l, 24, 66 + i * 10, '#fff7e8')); }
    });
    UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'BACK']]);
  }
};
// ---- EPISODE CARD ----
SC.episodeCard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.left = false; this.ep = MT.EPISODES[d.ep]; MT.music.play('theme'); MT.sfx('mashStart'); this.lines = MT.TEXT.ep[d.ep]; this.li = 0; this.done = false; const g = MT.game; const self = this; MT.lines.clear(); g.script(function* () { yield .8; for (const [s, t] of self.lines) { const h = MT.lines.cut(s, t); yield E.until(() => h.done); } self.done = true; }); },
  update(dt) { this.t += dt; UI.t += dt; MT.lines.update(dt); if (UI.anyPressed('confirm') || UI.anyPressed('start')) { if (MT.lines.cur) MT.lines.skip(); else if (this.t > 1) this.done = true; } if (this.done && this.t > 1.5) { this.done = false; MT.flow.afterEpisodeCard(this.d.ep); } },
  draw(r) { UI.card(r, 'EPISODE ' + this.d.ep, this.ep.name, this.ep.place, this.t, '#ff2e88'); UI.drawLowerThird(r); }
};
// ---- NEXT ON MASH TV (map card) ----
MT.mapNodePos = (rm, r) => { const ox = r.W / 2 - 3 * 64 / 2 - 10, oy = 52; return [ox + rm.cell[0] * 74 + 32, oy + rm.cell[1] * 46 + 16]; };
MT.drawMap = function (r, ep, cur, o = {}) {
  const rooms = Object.values(MT.ROOMS).filter(q => q.ep === ep && q.cell), run = MT.run, t = o.t || 0;
  r.overlay(g => {
    // edges
    for (const rm of rooms) for (const dn in rm.exits) { const to = MT.ROOMS[rm.exits[dn]]; if (!to || !to.cell) continue; const a = MT.mapNodePos(rm, r), b = MT.mapNodePos(to, r), vis = run && run.path.includes(rm.id) && run.path.includes(to.id), chosen = o.to === to.id && o.from === rm.id; px.line(g, a[0], a[1], b[0], b[1], chosen ? (Math.floor(t * 8) % 2 ? '#fff' : '#7affb0') : vis ? '#ffcc33' : '#4a3a70', chosen ? 3 : 2); }
    for (const rm of rooms) {
      const [x, y] = MT.mapNodePos(rm, r), here = rm.id === cur, vis = run && run.path.includes(rm.id), isTo = rm.id === o.to;
      const w = 64, h = 30; const col = isTo ? '#7affb0' : here ? '#ff2e88' : vis ? '#ffcc33' : '#6a5a90';
      E.ui.box(g, x - w / 2, y - h / 2, w, h, { bg: here || isTo ? ['#5a1a66', '#2a0f40'] : ['#2a1446', '#140a24'], border: col, alpha: 1 });
      if ((here || isTo) && Math.floor(t * 4) % 2) UI.bulbs(g, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, t, '#fff7a0', true);
      UI.text(g, rm.id, x - w / 2 + 3, y - h / 2 + 2, col, { font: 'tiny' }); UI.text(g, rm.name.length > 15 ? rm.name.slice(0, 14) + '.' : rm.name, x, y - 3, '#fff7e8', { align: 'center', font: 'tiny' });
      UI.text(g, MT.TEXT.roomTypes[rm.type] || '', x, y + 6, '#c8c0e0', { align: 'center', font: 'tiny' });
      if (rm.key) px.sprite(g, MT.spr.key, x + w / 2 - 8, y - h / 2 + 1);
    }
  });
};
SC.mapcard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.left = false; MT.music.play('commercial'); MT.sfx('channelFlip'); this.to = MT.ROOMS[d.to]; },
  update(dt) { this.t += dt; UI.t += dt; if ((UI.anyPressed('confirm') || UI.anyPressed('start')) && this.t > .4) this.t = Math.max(this.t, 2.5); if (this.t >= 2.5 && !this.left) { this.left = true; MT.flow.enterRoom(this.d.to, MT.DOORS[this.d.dir].opp); } },
  draw(r) { MT.backdrop(r, this.t); r.overlay(g => { UI.title(g, 'NEXT ON MASH TV', r.W / 2, 8, 3); UI.text(g, this.to.id + '  ' + this.to.name, r.W / 2, r.H - 40, '#7affb0', { align: 'center', scale: 2 }); }); MT.drawMap(r, this.to.ep, this.d.from, { to: this.d.to, from: this.d.from, t: this.t }); UI.static(r, this.t, Math.max(0, .5 - this.t * 3)); if (this.t > 2.1) UI.static(r, this.t, (this.t - 2.1) * 2); }
};

// ===== 33-dev.js =====
// MASH TV: dev mode (pause menu -> DEV MODE). Live tuning sliders with reset, cheats, actions, warp, spawn, debug overlays. Standalone only.
MT.dbg = { hitboxes: false, ai: false, waves: false, stats: false, doors: false, camera: false };
MT.cheatsReset = () => { for (const k in MT.cheats) MT.cheats[k] = false; };
MT.wheel = 0;
const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
const ORDER = ['playerSpeed', 'fireRate', 'bulletSpeed', 'dmgMul', 'slideSpeed', 'slideCooldown', 'invulnTime', 'hpPerLife', 'startLives', 'puDuration', 'enemySpeed', 'enemyHp', 'enemyBulletSpeed', 'contactDmg', 'waveSize', 'spawnGap', 'bossHp', 'dropMul', 'cashMul', 'ratingsGain', 'ratingsDecay', 'primeTime', 'camZoom', 'shakeMul', 'timeScale'];
const WARPS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', 'greenroom', 'L1', 'L2', 'L3', 'LB', 'coldopen', 'ep1', 'ep2', 'ep3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'initials', 'endinga', 'endingb', 'credits', 'card'];
class Dev {
  constructor() { this.tab = 0; this.sel = 0; this.page = 0; this.rects = []; this.tabRects = []; this.confirmT = 0; this.exportText = ''; this.spawn = { kind: 0, n: 1, where: 0, pick: 0, w: 0, a: 0 }; this.frozen = true; this.holdT = 0; }
  get w() { return MT.worldNow; }
  rows() {
    const w = this.w, T = MT.T, D = MT.TDEF, rows = [];
    const slider = k => ({ type: 'slider', key: k, label: D[k][4], get: () => T[k], def: D[k][0], min: D[k][2 - 1], max: D[k][2], step: D[k][3], set: v => { MT.setTune(k, v); if (MT.run) MT.run.devTouched = MT.run.devTouched || false; }, reset: () => MT.resetTune(k) });
    const tog = (label, o, key, fn) => ({ type: 'toggle', label, get: () => !!o[key], set: v => { o[key] = v; if (fn) fn(v); if (MT.run && v) MT.run.devTouched = true; } });
    const act = (label, fn) => ({ type: 'action', label, fn });
    const choice = (label, get, set, list) => ({ type: 'choice', label, get, set, list });
    if (this.tab === 0) { const per = 6, ks = ORDER.slice(this.page * per, this.page * per + per); for (const k of ks) rows.push(slider(k)); rows.push(act('RESET ALL TO DEFAULTS', () => { if (this.confirmT > 0) { MT.resetTunes(); this.confirmT = 0; MT.sfx('confirm'); } else { this.confirmT = 3; } })); rows[rows.length - 1].dyn = () => this.confirmT > 0 ? 'SURE? PRESS AGAIN' : 'RESET ALL TO DEFAULTS'; }
    else if (this.tab === 1) {
      rows.push(tog('FREEZE WORLD WHILE OPEN', this, 'frozen', v => { MT.ov.freeze = v; }));
      rows.push(tog('God mode', MT.cheats, 'god')); rows.push(tog('Infinite Showstoppers', MT.cheats, 'infBombs')); rows.push(tog('One-hit kills', MT.cheats, 'oneHit')); rows.push(tog('Freeze enemies', MT.cheats, 'freezeEnemies')); rows.push(tog('No clip', MT.cheats, 'noclip'));
      rows.push(tog('Autopilot P1', MT.cheats, 'autopilot', v => { if (w && w.cs[0]) w.cs[0].auto = v; })); rows.push(tog('Bot partner', MT.cheats, 'botPartner', v => { if (v && MT.worldNow && !MT.botPartner) MT.botPartner = MT.addBot(1); else if (!v && MT.botPartner) { MT.botPartner.state = 'gone'; const run = MT.run; run.cs = run.cs.filter(c => c !== MT.botPartner); if (w) w.cs = run.cs; MT.botPartner = null; } })); rows.push(tog('Mute host chatter', MT.cheats, 'muteChatter'));
    } else if (this.tab === 2) {
      const c0 = () => w && w.cs[0], WL = Object.keys(MT.WEAPONS);
      rows.push(act('Kill all enemies', () => game_.debug.killAll())); rows.push(act('Clear the room (jump to EXIT)', () => game_.debug.clearRoom())); rows.push(act('Next room (first exit)', () => { if (w && w.rm.exits) { const dn = Object.keys(w.rm.exits)[0]; if (dn) { w.phase = w.phase === 'exit' ? 'exit' : w.phase; game_.debug.clearRoom(); w.phase = 'clear'; w.phaseT = 99; game_.after(.1, () => game_.debug.chooseExit(dn)); } } }));
      rows.push(act('Restart the room', () => { if (w) { MT.closeOverlay(); game_.go('play', { room: w.rm.id, entry: w.entry }, { fade: 0 }); } }));
      rows.push(choice('Weapon / add-on', () => WL[this.spawn.w], v => { this.spawn.w = (this.spawn.w + v + WL.length) % WL.length; }, WL)); rows.push(act('GIVE the weapon / add-on', () => { if (c0()) w.giveWeapon(c0(), WL[this.spawn.w]); }));
      rows.push(act('+1 life', () => { if (c0()) c0().lives++; })); rows.push(act('+1 Showstopper', () => { if (c0()) c0().bombs = Math.min(9, c0().bombs + 1); })); rows.push(act('+$100,000', () => { if (c0()) w.addCash(c0(), 100000); })); rows.push(act('+1 key', () => { if (MT.run) MT.run.keys++; }));
      rows.push(act('Max ratings', () => { if (w) w.rat.R = 99.9; })); rows.push(act('Trigger Prime Time', () => { if (w) w.startPrime(); })); rows.push(act('Trigger a Ratings Stunt', () => { if (w) w.releaseStunt(); }));
      rows.push(act('Frame step (1/30 s)', () => { MT.ov.cur.stepOnce = true; })); rows.push(act('EXPORT TUNING', () => { this.exportText = JSON.stringify(MT.tuneDiff()); console.log('MASH TV tuning: ' + this.exportText); }));
      const per = 6; this.pages = Math.ceil(rows.length / per); return rows.slice(this.page * per, this.page * per + per);
    } else if (this.tab === 3) { const per = 6; this.pages = Math.ceil(WARPS.length / per); for (const t of WARPS.slice(this.page * per, this.page * per + per)) rows.push(act('WARP: ' + (MT.ROOMS[t] ? t + ' ' + MT.ROOMS[t].name : t.toUpperCase()), () => { MT.closeOverlay(); game_.resume && game_.resume(); MT.run && (MT.run.devTouched = true); MT.warp(t, { mode: 'test', players: MT.run ? MT.run.cs.length : 1, seed: MT.seed }); })); return rows; }
    else if (this.tab === 4) {
      const kinds = Object.keys(MT.ENEMIES).filter(k => k !== 'segment'), wheres = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], pk = ['bill', 'stack', 'bar', 'case', 'prize', 'key', 'cap', 'bomb', 'life'], S = this.spawn;
      rows.push(choice('Enemy', () => kinds[S.kind], v => { S.kind = (S.kind + v + kinds.length) % kinds.length; }, kinds)); rows.push(choice('Count', () => [1, 5, 10][S.n], v => { S.n = (S.n + v + 3) % 3; }, [1, 5, 10]));
      rows.push(choice('Where', () => wheres[S.where], v => { S.where = (S.where + v + wheres.length) % wheres.length; }, wheres)); rows.push(act('SPAWN!', () => MT.devSpawn(kinds[S.kind], [1, 5, 10][S.n], wheres[S.where])));
      rows.push(choice('Pickup', () => pk[S.pick], v => { S.pick = (S.pick + v + pk.length) % pk.length; }, pk)); rows.push(act('GIVE pickup at P1', () => { if (w && w.cs[0]) { const k = pk[S.pick]; w.addPickup(k, w.cs[0].x + 14, w.cs[0].y, { w: k === 'cap' ? Object.keys(MT.WEAPONS)[S.w] : undefined, fixed: false, ttl: 20 }); } }));
    } else { for (const k of Object.keys(MT.dbg)) rows.push(tog('Show ' + { hitboxes: 'hitboxes', ai: 'AI targets and states', waves: 'wave timeline', stats: 'stats', doors: 'door states', camera: 'camera bounds' }[k], MT.dbg, k)); }
    return rows;
  }
  update(dt) {
    const game = game_; MT.idle.step(game, dt);
    this.confirmT = Math.max(0, this.confirmT - dt);
    const rows = this.cur = this.rows(); const n = rows.length; if (this.sel >= n) this.sel = n - 1;
    const P = game.players, any = a => P.some(p => p.pressed(a)), rep = a => P.some(p => p.repeat(a, .35, .07));
    if (any('cancel') || any('pause')) { this.close(); return; }
    if (any('tabR')) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; this.page = 0; MT.sfx('tick'); } if (any('tabL')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; this.page = 0; MT.sfx('tick'); }
    if (rep('up')) { if (this.sel === 0 && this.pageable() && this.page > 0) { this.page--; this.sel = 5; } else this.sel = (this.sel + n - 1) % n; MT.sfx('blip'); }
    if (rep('down')) { if (this.pageable() && this.sel === n - 1 && this.tab !== 0) { this.page = (this.page + 1) % this.pageCount(); this.sel = 0; } else if (this.tab === 0 && this.sel === 5 && this.page < 4) { this.page++; this.sel = 0; } else this.sel = (this.sel + 1) % n; MT.sfx('blip'); }
    const r = rows[this.sel], p = UI.pointer(), c = UI.clicked();
    if (p && this._pp && (Math.abs(p[0] - this._pp[0]) + Math.abs(p[1] - this._pp[1]) > .5)) this.rects.forEach((q, i) => { if (UI.inRect(p, ...q)) this.sel = i; }); this._pp = p;
    if (c) { this.tabRects.forEach((q, i) => { if (UI.inRect(c, ...q)) { this.tab = i; this.sel = 0; this.page = 0; } }); this.rects.forEach((q, i) => { if (UI.inRect(c, ...q)) { this.sel = i; const rw = rows[i]; if (rw.type === 'slider') { const u = MT.clamp((c[0] - this.barX) / this.barW, 0, 1); rw.set(rw.min + (rw.max - rw.min) * u); } else this.activate(rw); } }); }
    if (r) {
      if (r.type === 'slider') { if (rep('left')) r.set(r.get() - r.step); if (rep('right')) r.set(r.get() + r.step); if (MT.wheel) { r.set(r.get() - Math.sign(MT.wheel) * r.step); MT.wheel = 0; } if (any('reset')) { r.reset(); MT.sfx('back'); } if (any('confirm')) { r.set(r.get() + r.step); } }
      else if (r.type === 'toggle') { if (any('confirm') || any('left') || any('right')) { r.set(!r.get()); MT.sfx('tick'); } }
      else if (r.type === 'choice') { if (rep('left')) r.set(-1); if (rep('right') || any('confirm')) r.set(1); }
      else if (r.type === 'action') { if (any('confirm')) this.activate(r); }
    }
    MT.wheel = 0;
    // paging for TUNING / ACTIONS / WARP with L2-ish: left/right on actions pages
    if (this.pageable() && r && r.type === 'action' && any('right')) { this.page = (this.page + 1) % this.pageCount(); this.sel = 0; }
    if (this.pageable() && r && r.type === 'action' && any('left')) { this.page = (this.page + this.pageCount() - 1) % this.pageCount(); this.sel = 0; }
  }
  pageable() { return this.tab === 0 || this.tab === 2 || this.tab === 3; }
  pageCount() { return this.tab === 0 ? 5 : (this.pages || 1); }
  activate(r) { if (r.type === 'toggle') r.set(!r.get()); else if (r.type === 'action') { MT.sfx('confirm'); r.fn(); } else if (r.type === 'choice') r.set(1); }
  close() { this.confirmT = 0; MT.sfx('back'); MT.closeOverlay(); }
  draw(r) {
    const rows = this.cur || this.rows(), x = Math.round(r.W * .55), y = 24, w = Math.round(r.W * .45) - 4, h = r.H - 28; this.rects = []; this.tabRects = [];
    r.overlay(g => {
      UI.panel(g, x, y, w, h, { bulbs: true, chase: true, color: '#ff8a20', border: '#ff8a20' });
      TABS.forEach((t, i) => { const tw = Math.floor((w - 8) / TABS.length), tx = x + 4 + i * tw; this.tabRects[i] = [tx, y + 3, tw - 2, 12]; px.rect(g, tx, y + 3, tw - 2, 12, i === this.tab ? '#ff8a20' : '#2a1a3a'); UI.text(g, t, tx + (tw - 2) / 2, y + 5, i === this.tab ? '#14081c' : '#c8c0e0', { align: 'center', shadow: false, font: 'tiny' }); });
      const hdr = this.tab === 0 ? ['PLAYER', 'PLAYER', 'ENEMIES', 'ECONOMY', 'SHOW', 'CAMERA & TIME'][Math.min(5, this.page + (this.page > 0 ? 1 : 0))] + '  ' + (this.page + 1) + '/5' : this.pageable() ? 'PAGE ' + (this.page + 1) + '/' + this.pageCount() : '';
      UI.text(g, 'DEV MODE  ' + hdr, x + 6, y + 19, '#ff8a20', { scale: 1 });
      const rh = 18; this.barX = x + w * .56; this.barW = w * .30;
      rows.forEach((rw, i) => {
        const yy = y + 32 + i * rh, foc = i === this.sel; this.rects[i] = [x + 4, yy - 2, w - 8, rh - 1];
        if (foc) px.rect(g, x + 4, yy - 2, w - 8, rh - 1, '#4a2a6a');
        const lab = rw.dyn ? rw.dyn() : rw.label;
        if (rw.type === 'slider') { const v = rw.get(), u = (v - rw.min) / (rw.max - rw.min), diff = v !== rw.def; UI.text(g, lab, x + 8, yy + 2, diff ? '#ff8a20' : '#fff7e8', { font: 'tiny' }); UI.bar(g, this.barX, yy + 1, this.barW, 8, u, diff ? '#ff8a20' : '#ffcc33'); px.rect(g, Math.round(this.barX + this.barW * (rw.def - rw.min) / (rw.max - rw.min)), yy, 1, 10, '#fff'); UI.text(g, String(+v.toFixed(2)), x + w - 8, yy + 2, '#7affb0', { align: 'right', font: 'tiny' }); }
        else if (rw.type === 'toggle') { UI.text(g, lab, x + 8, yy + 2, '#fff7e8', { font: 'tiny' }); UI.text(g, rw.get() ? 'ON' : 'OFF', x + w - 8, yy + 2, rw.get() ? '#7affb0' : '#7a6a98', { align: 'right', font: 'tiny' }); }
        else if (rw.type === 'choice') { UI.text(g, lab, x + 8, yy + 2, '#fff7e8', { font: 'tiny' }); UI.text(g, '< ' + String(rw.get()).toUpperCase() + ' >', x + w - 8, yy + 2, '#ffe068', { align: 'right', font: 'tiny' }); }
        else UI.text(g, lab, x + 8, yy + 2, foc ? '#ffe068' : '#fff7e8', { font: 'tiny' });
      });
      if (this.exportText) { F.wrap(this.exportText, w - 12, { font: 'tiny' }).slice(0, 6).forEach((l, i) => UI.text(g, l, x + 6, y + h - 66 + i * 7, '#7affb0', { font: 'tiny' })); }
      MT.glyph.prompt(g, x + w / 2, y + h - 14, [['tabL', 'TAB'], ['reset', 'RESET'], ['cancel', 'CLOSE']], UI.promptInput(), { align: 'center' });
    });
    if (this.w) this.drawDebug(r, this.w);
  }
  drawDebug(r, w) {
    const D = MT.dbg; if (!Object.values(D).some(Boolean)) return;
    if (D.hitboxes) r.decal(() => { for (const e of w.enemies) if (e.alive) r.groundRing(e.x, e.y, e.r, '#ff0000', 1); for (const c of w.cs) r.groundRing(c.x, c.y, c.r, '#00ff00', 1); for (const b of w.fShots.list) r.groundRing(b.x, b.y, b.r, '#ffff00', 1); for (const b of w.pShots.list) r.groundRing(b.x, b.y, b.r, '#00ffff', 1); if (w.boss) for (const t of w.boss.hitParts()) r.groundRing(t.x, t.y, t.r, '#ff00ff', 1); });
    r.overlay(g => {
      if (D.ai) for (const e of w.enemies) if (e.alive) { const [sx, sy] = r.w(e.x, e.y, 20); UI.text(g, e.kind + ':' + e.state, sx, sy, '#fff', { align: 'center', font: 'tiny' }); }
      if (D.waves) { UI.text(g, 'WAVE ' + (w.waveI + 1) + '/' + ((w.rm.waves || []).length) + '  ALIVE ' + w.alive() + '  T ' + (w.time - w.time0).toFixed(1), 8, r.H - 70, '#7affb0', { font: 'tiny' }); const nx = (w.rm.waves || [])[w.waveI + 1]; if (nx) UI.text(g, 'NEXT: ' + (nx.at !== undefined ? 'AT ' + nx.at : '') + (nx.left !== undefined ? ' LEFT<=' + nx.left : ''), 8, r.H - 62, '#7affb0', { font: 'tiny' }); }
      if (D.stats) UI.text(g, 'ENEMIES ' + w.enemies.length + ' FOE ' + w.fShots.list.length + ' PLY ' + w.pShots.list.length + ' PICK ' + w.pickups.length + ' ERR ' + MT.game.errors.length, 8, r.H - 54, '#ffe068', { font: 'tiny' });
      if (D.doors) for (const dn in w.doors) { const d = MT.DOORS[dn], [sx, sy] = r.w(d.x, d.y, 30); UI.text(g, dn + ':' + w.doors[dn].state + ' q' + w.doors[dn].queue.length, sx, sy, '#ff8a20', { align: 'center', font: 'tiny' }); }
      if (D.camera) { const b = w.map.bounds(MT.game.view); px.rect(g, 0, 0, 1, r.H, '#f0f'); UI.text(g, 'BOUNDS ' + Math.round(b.x1 - b.x0) + 'x' + Math.round(b.y1 - b.y0) + ' ZOOM ' + MT.game.zoom.toFixed(2), 8, r.H - 46, '#f0f', { font: 'tiny' }); }
    });
  }
}
let game_ = null;
MT.openDev = function () {
  const g = game_ = MT.game; if (MT.inSession || (MT.run && (MT.run.mode === 'session' || MT.run.mode === 'attract'))) return;
  if (g.paused && g.resume) g.resume();
  const d = new Dev(); MT.ov.freeze = true; d.frozen = true; MT.openOverlay(d);
};
MT.openMapOverlay = function () { game_ = MT.game; if (MT.game.paused) MT.game.resume(); const o = { update(dt) { if (UI.anyPressed('cancel') || UI.anyPressed('confirm') || UI.clicked()) MT.closeOverlay(); }, draw(r) { r.overlay(g => px.rect(g, 0, 0, r.W, r.H, 'rgba(5,2,12,.88)')); r.overlay(g => UI.title(g, 'EPISODE MAP', r.W / 2, 8, 3)); const w = MT.worldNow; MT.drawMap(r, w ? w.rm.ep : 1, w ? w.rm.id : '', { t: UI.t }); UI.promptBar(r, [['confirm', 'CLOSE']]); } }; MT.openOverlay(o); };
MT.openHowtoOverlay = function () { game_ = MT.game; if (MT.game.paused) MT.game.resume(); let page = 0; const o = { update(dt) { const n = MT.TEXT.howto.length; if (UI.anyPressed('right') || UI.anyPressed('tabR')) page = (page + 1) % n; if (UI.anyPressed('left') || UI.anyPressed('tabL')) page = (page + n - 1) % n; if (UI.anyPressed('cancel')) MT.closeOverlay(); }, draw(r) { MT.drawHowtoPage(r, page); UI.promptBar(r, [['pgL', 'PAGE'], ['cancel', 'CLOSE']]); } }; MT.openOverlay(o); };
// spawn helper
MT.devSpawn = function (kind, n, where) {
  const w = MT.worldNow; if (!w || !MT.ENEMIES[kind]) return null; let out = [];
  if (where === 'reticle') { const c = w.cs[0], m = c && c.intent && c.intent.mouseAt; const x = m ? m[0] : c ? c.x + Math.cos(c.aim) * 60 : 184, y = m ? m[1] : c ? c.y + Math.sin(c.aim) * 60 : 120; for (let i = 0; i < n; i++) { const e = w.spawnEnemy(kind, x + (i % 5) * 8 - 16, y + Math.floor(i / 5) * 8, {}); e.entering = false; out.push(e); } }
  else w.queueSpawn(where, kind, n, .2);
  return out;
};

// ===== 34-cutscenes.js =====
// MASH TV: scripted scenes: cold open, prize recap, game over, initials, endings, credits.
// speaker portrait
MT.drawSpeaker = function (g, spk, x, y, s, t) {
  const rigOf = { LANCE: 'lance', PENNY: 'penny', ANNC: null };
  E.ui.box(g, x, y, s, s, { bg: ['#3a1a5a', '#14081c'], border: '#ffcc33', alpha: 1 });
  if (spk === 'LANCE' || spk === 'PENNY') { const rig = MT.hostRig(rigOf[spk]); if (rig && !MT.cfg.skipRigs) { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: MT.lines.cur && Math.floor(t * 8) % 2 ? 'shout' : 'smile', pose: Math.floor(t * .7) % 2 ? 'wave' : 'hips' }); try { rig.drawPortrait(g, x + 2, y + 2, s - 4, { zoom: 3 }); } catch (e) { /* */ } } }
  else if (spk === 'ANNC') { px.disc(g, x + s / 2, y + s / 2, s / 3, '#222'); px.rect(g, x + s / 2 - 3, y + s / 2 - 12, 6, 16, '#aaa'); for (let i = 0; i < 3; i++) px.blend(g, .5, 'add', () => px.disc(g, x + s / 2, y + s / 2, s / 3 + 4 + i * 5 + Math.sin(t * 6) * 2, '#ffcc33')); UI.text(g, 'ON AIR', x + s / 2, y + s - 10, '#ff3344', { align: 'center' }); }
  else if (spk === 'NETWORK') { for (let i = 0; i < 40; i++) px.rect(g, x + 2 + Math.floor(MT.fxr() * (s - 6)), y + 2 + Math.floor(MT.fxr() * (s - 6)), 3, 2, MT.fxr() < .5 ? '#7affb0' : '#0c3a28'); UI.text(g, 'SIGNAL', x + s / 2, y + s / 2 - 3, '#7affb0', { align: 'center' }); }
  else if (spk === 'MASHY') { px.ell(g, x + s / 2, y + s / 2, s * .4, s * .38, '#d8b878'); for (const sd of [-1, 1]) { px.disc(g, x + s / 2 + sd * s * .14, y + s * .4, s * .09, '#fff'); px.disc(g, x + s / 2 + sd * s * .14 + Math.sin(t * 9), y + s * .42, s * .04, '#14081c'); } px.ell(g, x + s / 2, y + s * .62, s * .14, s * .05, '#14081c'); }
  else if (spk === 'SPONSOR') { UI.text(g, 'KRUNCH-O', x + s / 2, y + s / 2 - 4, '#ffcc33', { align: 'center' }); }
};
// a generic cutscene: list of [speaker, text, opts]; done() when finished (skippable: confirm skips the line; hold start skips all)
function Cut(list, done) { this.list = list; this.done = done; this.i = -1; this.t = 0; this.cur = null; this.end = false; this.hold = 0; }
Cut.prototype.update = function (dt) {
  this.t += dt; MT.lines.update(dt); const P = MT.game.players;
  if (P.some(p => p.down('start') || p.down('confirm'))) this.hold += dt; else this.hold = 0;
  if (this.hold > 1.2 && !this.end) { this.end = true; MT.lines.clear(); this.done(); return; }
  if (this.end) return;
  if (P.some(p => p.pressed('confirm') || p.pressed('start'))) MT.lines.skip();
  if (!this.cur || this.cur.done) { this.i++; if (this.i >= this.list.length) { this.end = true; this.done(); return; } const [s, t, o] = this.list[this.i]; this.spk = s; this.opts = o || {}; if (this.opts.onStart) this.opts.onStart(); this.cur = MT.lines.cut(s, t, {}); }
};
MT.Cut = Cut;
const SC2 = MT.scenes;
SC2.coldOpen = {
  input: MT.MENU, camera: { zoom: false },
  enter() {
    const run = MT.run, T = MT.TEXT; this.t = 0; MT.music.play('theme'); MT.lines.clear(); MT.ui.banners.length = 0;
    const list = []; for (const [s, t] of T.coldOpen) { list.push([s, MT.sub(t, { N: run.cs.length }), s === 'ANNC' ? { flash: true } : null]); if (t.startsWith('TONIGHT')) for (const c of run.cs) list.push(['LANCE', MT.PNAMES[c.look] + ': ' + T.looks[MT.PNAMES[c.look]], { who: c }]); }
    this.cut = new Cut(list, () => { MT.flow.startEpisode(1); }); this.who = null;
  },
  update(dt) { this.t += dt; UI.t += dt; this.cut.update(dt); if (this.cut.opts && this.cut.opts.who) this.who = this.cut.opts.who; else if (this.cut.cur && !(this.cut.opts && this.cut.opts.who)) this.who = null; },
  draw(r) {
    MT.backdrop(r, this.t);
    r.overlay(g => {
      const t = this.t; UI.title(g, 'MASH TV', r.W / 2, 14, 4); UI.text(g, MT.TEXT.sub, r.W / 2, 44, '#2ee6ff', { align: 'center' });
      const spk = this.cut.spk || 'ANNC'; MT.drawSpeaker(g, this.who ? 'LANCE' : spk, r.W / 2 - 40, 62, 80, t);
      if (this.who && this.who.rig === undefined) this.who.rig = null; // contestant card
      if (this.who) { const c = this.who; if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, r.W / 2 + 50, 70, 56, {}); } catch (e) { /* */ } } UI.text(g, MT.PNAMES[c.look], r.W / 2 + 78, 130, c.color, { align: 'center' }); }
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'hips' }); try { c.rig.drawPortrait(g, 14 + i * 34, r.H - 82, 30, {}); } catch (e) { /* */ } } });
    });
    UI.drawLowerThird(r); MT.glyphHold(r, 'HOLD TO SKIP');
  }
};
MT.glyphHold = (r, text) => r.overlay(g => { MT.glyph.prompt(g, r.W - 6, 6, [['confirm', text]], MT.lastInput(), { align: 'right' }); });
// ---- PRIZE RECAP ----
SC2.recap = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const run = MT.run, ep = d.ep; this.ep = ep; this.t = 0; this.left = false; MT.music.play('commercial'); MT.lines.clear(); const T = MT.TEXT.recapIntro[ep];
    this.cols = run.cs.map(c => ({ c, prizes: c.prizes.filter(p => p.ep === ep), shown: 0, total: 0, earn: c.cash - (run.epStart[c.slot] || 0), shownEarn: 0 }));
    this.order = []; const mx = Math.max(0, ...this.cols.map(q => q.prizes.length)); for (let i = 0; i < mx; i++) this.cols.forEach((q, k) => { if (q.prizes[i]) this.order.push([k, i]); });
    this.ri = 0; this.nt = 1.4; this.phase = 'prizes'; this.speed = 1; this.mvp = this.cols.reduce((a, b) => (b.earn > (a ? a.earn : -1) ? b : a), null);
    MT.lines.say('PENNY', T[0], { prio: 3, force: true });
  },
  update(dt) {
    this.t += dt; UI.t += dt; MT.lines.update(dt); const P = MT.game.players, fast = P.some(p => p.down('confirm')) ? 3 : 1;
    if (this.phase === 'prizes') { this.nt -= dt * fast; if (this.nt <= 0) { if (this.ri < this.order.length) { const [k, i] = this.order[this.ri++], q = this.cols[k], pz = q.prizes[i]; q.shown = i + 1; q.total += pz.value; MT.sfx('prizeFanfare'); MT.sfx('coin'); MT.lines.say('PENNY', pz.joke, { prio: 3, force: true }); this.nt = 1.5; } else { this.phase = 'count'; this.nt = 0; this.ct = 0; } } }
    else if (this.phase === 'count') { this.ct += dt * fast; for (const q of this.cols) q.shownEarn = Math.min(q.earn, q.earn * Math.min(1, this.ct / 1.2)); if (this.ct > 1.6) { this.phase = 'mvp'; this.nt = 2.5; MT.sfx('tada'); MT.lines.say('LANCE', MT.TEXT.recapIntro[this.ep][1], { prio: 3, force: true }); } }
    else if (this.phase === 'mvp') { this.nt -= dt; if (this.nt <= 0 || (P.some(p => p.pressed('confirm')) && this.nt < 1.9)) { this.phase = 'wait'; } }
    else if (this.phase === 'wait') { if (P.some(p => p.pressed('confirm') || p.pressed('start')) && !this.left) { this.left = true; MT.flow.afterRecap(this.ep); } }
  },
  draw(r) {
    MT.backdrop(r, this.t, { sky: ['#0a1428', '#1a2a50', '#0a1428'] });
    r.overlay(g => {
      UI.title(g, 'PRIZE RECAP', r.W / 2, 8, 3); const pen = MT.hostRig('penny'); UI.text(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[this.ep].name, r.W / 2, 32, '#2ee6ff', { align: 'center' });
      const n = this.cols.length, cw = Math.min(100, (r.W - 20) / n - 4);
      this.cols.forEach((q, k) => {
        const x = r.W / 2 - (n * (cw + 4)) / 2 + k * (cw + 4), y = 46, c = q.c; E.ui.box(g, x, y, cw, 150, { bg: ['#2a1446', '#140a24'], border: c.color, alpha: .92 });
        if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, x + 3, y + 3, 24, {}); } catch (e) { /* */ } }
        UI.text(g, c.name, x + 30, y + 4, c.color, { scale: 1 }); UI.text(g, MT.fmt$(c.cash - q.earn + q.shownEarn), x + 30, y + 14, '#fff7e8', { font: 'tiny' });
        if (!q.prizes.length) UI.text(g, 'NOTHING BUT FEAR', x + cw / 2, y + 60, '#6a5a80', { align: 'center', font: 'tiny' });
        for (let i = 0; i < Math.min(5, q.shown); i++) { const pz = q.prizes[i], yy = y + 34 + i * 22; px.sprite(g, MT.prizeIcon((pz.name.length + i * 3) % 9), x + 4, yy); const nm = F.wrap(pz.name, cw - 24, { font: 'tiny' }); nm.slice(0, 2).forEach((l, kk) => UI.text(g, l, x + 20, yy + kk * 6, '#fff7e8', { font: 'tiny' })); UI.text(g, MT.fmt$(pz.value), x + cw - 3, yy + 12, '#7affb0', { align: 'right', font: 'tiny' }); }
        if (q.shown > 5) UI.text(g, '+' + (q.shown - 5) + ' MORE', x + cw / 2, y + 144, '#c8c0e0', { align: 'center', font: 'tiny' });
        if (this.phase === 'mvp' || this.phase === 'wait') { if (this.mvp === q) { UI.text(g, 'MVP!', x + cw / 2, y + 126, Math.floor(UI.t * 6) % 2 ? '#ffe068' : '#ff2e88', { align: 'center', scale: 2 }); } }
        UI.text(g, 'WON ' + MT.fmt$(q.total), x + cw / 2, y + 138, '#ffe068', { align: 'center', font: 'tiny' });
      });
      if (this.phase === 'mvp' || this.phase === 'wait') UI.text(g, 'EPISODE MVP: ' + (this.mvp ? this.mvp.c.name : '-'), r.W / 2, r.H - 54, '#ffe068', { align: 'center', scale: 1 });
    });
    UI.drawLowerThird(r); if (this.phase === 'wait') UI.promptBar(r, [['confirm', 'CONTINUE']]); else UI.promptBar(r, [['confirm', 'SPEED UP']]);
  }
};
// ---- GAME OVER ----
SC2.gameover = {
  input: MT.MENU, camera: { zoom: false },
  enter() { this.t = 0; this.step = 0; this.left = false; this.fin = false; MT.music.stop(.3); MT.sfx('bankrupt'); MT.lines.clear(); const T = MT.TEXT.gameOver; const self = this; MT.game.script(function* () { yield .6; for (const s of T) { const h = MT.lines.cut('LANCE', s); yield E.until(() => h.done); } self.fin = true; }); MT.crowd('boo', 1); },
  update(dt) { this.t += dt; UI.t += dt; MT.lines.update(dt); if ((MT.game.players.some(p => p.pressed('confirm') || p.pressed('start')) && this.t > 1) || this.fin) { if (MT.lines.cur) MT.lines.skip(); else if (!this.left && (this.fin || this.t > 1)) { this.left = true; MT.flow.finishRun('over'); } } },
  draw(r) {
    r.sky(['#05020a', '#14081c', '#05020a']);
    r.overlay(g => {
      px.blend(g, .3, 'add', () => px.poly(g, [[r.W / 2 - 14, 0], [r.W / 2 + 14, 0], [r.W / 2 + 90, r.H], [r.W / 2 - 90, r.H]], '#fff7a0'));
      UI.title(g, 'AND THAT\'S A WRAP!', r.W / 2, 18, 3, { colors: ['#ff5a5a', '#8a1020'] });
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); const x = r.W / 2 - run.cs.length * 22 + i * 44; if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'down', down: 1 }); try { c.rig.drawPortrait(g, x, 80, 40, { tint: '#808080' }); } catch (e) { /* */ } } UI.text(g, MT.fmt$(c.cash), x + 20, 124, '#ffe068', { align: 'center' }); });
    });
    UI.drawLowerThird(r); UI.promptBar(r, [['confirm', 'CONTINUE']]);
  }
};
// ---- INITIALS ----
SC2.initials = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.list = d.list.slice(); this.run = MT.run; this.cur = null; MT.music.play('recap'); this.next(); },
  next() {
    const run = this.run; if (!this.list.length) { MT.game.go('scores', { fresh: true }); return; }
    const slot = this.list.shift(), c = run.cs.find(q => q.slot === slot); this.cur = c; MT.cab.enter(c.cash, 'show', () => { this.cur = null; this.next(); }, c.input || MT.game.input);
  },
  update(dt) { this.t += dt; UI.t += dt; MT.cab.update(dt); },
  draw(r) { MT.backdrop(r, this.t, { sky: ['#2a1a05', '#5a3a0a', '#2a1a05'] }); r.overlay(g => { UI.title(g, 'NEW TOP EARNER!', r.W / 2, 8, 3, { colors: ['#fff7a0', '#e8a818'] }); if (this.cur) UI.text(g, this.cur.name, r.W / 2, 34, this.cur.color, { align: 'center', scale: 2 }); }); MT.cab.draw(r); }
};
// ---- ENDINGS ----
SC2.ending = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    this.which = d.which; this.t = 0; this.left = false; this.fin = false; this.hint = null; this.stinger = false; const T = MT.TEXT; this.card = null; this.lights = 1; this.sw = 0; this.stage = 0; MT.lines.clear(); MT.music.play('ending');
    const self = this, list = d.which === 'A' ? T.endA.map(a => a.slice()) : T.endB.map(a => a.slice());
    this.cut = new Cut(list, () => { self.afterCut(); });
  },
  afterCut() {
    const self = this, T = MT.TEXT; this.stage = 1; this.t2 = 0; MT.game.script(function* () {
      if (self.which === 'A') { self.card = T.endAcard; MT.sfx('tada'); yield 3.5; self.hint = T.endAhint; yield 3; }
      else { for (let i = 1; i <= 8; i++) { self.lights = 1 - i / 8; MT.sfx('beacon'); MT.crowd('cheer', i / 8); yield .5; } self.card = T.endBcard; MT.sfx('tada'); yield 3.5; self.stinger = true; MT.lines.cut('LANCE', T.endBstinger); yield 4; }
      self.fin = true;
    });
  },
  update(dt) { this.t += dt; UI.t += dt; if (this.stage === 0) { if (this.which === 'B' && this.cut.i >= 1) this.sw = Math.min(1, this.sw + dt); this.cut.update(dt); } else { MT.lines.update(dt); if (MT.game.players.some(p => p.pressed('confirm') || p.pressed('start'))) { if (MT.lines.cur) MT.lines.skip(); } if (this.fin && !this.left) { this.left = true; MT.game.go('credits', { which: this.which }); } } },
  draw(r) {
    MT.backdrop(r, this.t, this.which === 'B' ? { sky: ['#06140c', '#0c3a28', '#06140c'] } : {});
    r.overlay(g => {
      const run = MT.run; run.cs.forEach((c, i) => { if (!c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); const x = r.W / 2 - run.cs.length * 25 + i * 50; if (c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' }); try { c.rig.drawPortrait(g, x, 120, 44, {}); } catch (e) { /* */ } } });
      if (this.stage === 0) MT.drawSpeaker(g, this.cut.spk || 'PENNY', r.W / 2 - 34, 24, 68, this.t);
      if (this.which === 'B' && this.stage === 0 && this.cut.i >= 1) { const bx = r.W / 2 - 14, by = 100; px.rect(g, bx - 6, by + 10, 40, 10, '#3a3a50'); px.disc(g, bx + 14, by + 6, 12, '#14081c'); px.disc(g, bx + 14, by + 6 + this.sw * 2, 10, this.sw > .5 ? '#a01020' : '#ff3344'); UI.text(g, 'OFF', bx + 14, by + 3, '#fff', { align: 'center', font: 'tiny' }); }
      if (this.card) { px.rect(g, 0, r.H / 2 - 26, r.W, 52, 'rgba(0,0,0,.7)'); UI.title(g, this.card, r.W / 2, r.H / 2 - 14, this.card.length > 22 ? 2 : 3); }
      if (this.hint) UI.text(g, this.hint, r.W / 2, r.H / 2 + 36, '#7affb0', { align: 'center' });
      if (this.which === 'B' && this.stinger) { E.ui.box(g, r.W / 2 - 80, r.H - 80, 160, 40, { bg: ['#3a2a14', '#1c1408'], border: '#c8a050', alpha: 1 }); UI.text(g, MT.TEXT.endBchan, r.W / 2, r.H - 76, '#ffcc33', { align: 'center', font: 'tiny' }); }
      if (this.lights < 1) px.rect(g, 0, 0, r.W, r.H, 'rgba(0,0,0,' + (1 - this.lights) * .8 + ')');
    });
    UI.drawLowerThird(r);
  }
};
SC2.credits = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) { this.t = 0; this.d = d; this.left = false; MT.music.play('ending'); this.y0 = 0; },
  update(dt) { this.t += dt; UI.t += dt; if ((MT.game.players.some(p => p.pressed('confirm') || p.pressed('cancel')) && this.t > 2) || this.t > 34) { if (!this.left) { this.left = true; MT.flow.afterEnding(); } } },
  draw(r) {
    MT.backdrop(r, this.t, { sky: ['#05020a', '#14081c', '#05020a'] });
    const L = ['MASH TV', 'LIVE FROM STUDIO 9', '', 'STARRING', 'ROCKET · VOLT · MOXIE · GOLDIE', '', 'WITH', 'LANCE LUSTRE AS HIMSELF (A ROBOT)', 'PENNY PRIZE', 'THE ANNOUNCER', 'MASHY, THE NETWORK\'S BELOVED MASCOT', '', 'MADE WITH THE MY-3D2DGE ENGINE', 'ORIGINAL MUSIC, SOUND AND VOICES SYNTHESIZED IN CODE', 'ANTHROPIC CLAUDE-SONNET-5-5', 'PLANNED BY CLAUDE-OPUS-5-5', 'AI HUB SESSION PROTOCOL V1', '', 'INSPIRED BY SMASH TV (1990)', '', this.d.which === 'B' ? 'MASH TV - CANCELLED.' : 'MASH TV WILL RETURN.', 'THANKS FOR WATCHING'];
    r.overlay(g => { L.forEach((l, i) => { const y = r.H - this.t * 14 + i * 14; if (y > -10 && y < r.H) UI.text(g, l, r.W / 2, y, i === 0 ? '#ff2e88' : '#fff7e8', { align: 'center', scale: i === 0 ? 2 : 1 }); }); });
    UI.promptBar(r, [['confirm', 'SKIP']]);
  }
};

// ===== 40-bot.js =====
// MASH TV: the bot. A potential field: repelled by enemies, foe bullets and hazards; attracted to pickups and the chosen exit; aims with lead and always fires.
MT.botRoute = {};   // room id -> exit direction; otherwise the first listed exit
MT.bot = {
  think(w, c) {
    const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'bot' }; const o = c.botOpts || {};
    if (c.state !== 'alive' && c.state !== 'walkin') return out;
    let mx = 0, my = 0;
    const live = w.enemies.filter(e => e.alive && !e.hidden); const counted = live.filter(e => e.count !== false);
    // --- repel enemies
    for (const e of live) {
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1; const danger = (e.kind === 'brute' || e.kind === 'tank' || e.kind === 'snake' ? 1.6 : e.kind === 'mime' ? 1.4 : e.kind === 'crate' || e.kind === 'lock' || e.kind === 'segment' ? 0 : 1);
      const R = (e.kind === 'mime' ? 50 : e.kind === 'brute' ? 90 : 62) * (danger ? 1 : 0); if (d < R) { const k = (R - d) / R * danger * 2.2; mx += dx / d * k; my += dy / d * k; }
    }
    // --- bullets (predicted)
    let threat = null, tmin = 1e9;
    for (const b of w.fShots.list) { if (b.dead) continue; const px = b.x + b.vx * .3, py = b.y + b.vy * .3; const dx = c.x - px, dy = c.y - py, d = Math.hypot(dx, dy); if (d < 40) { const k = (40 - d) / 40 * 1.8; mx += dx / (d || 1) * k; my += dy / (d || 1) * k; }
      const rx = c.x - b.x, ry = c.y - b.y, sp = Math.hypot(b.vx, b.vy) || 1, t = (rx * b.vx + ry * b.vy) / (sp * sp); if (t > 0 && t < .3) { const cx = b.x + b.vx * t - c.x, cy = b.y + b.vy * t - c.y; if (Math.hypot(cx, cy) < b.r + 9 && t < tmin) { tmin = t; threat = b; } } }
    for (const l of w.lobs) { if (l.kind === 'tomato' || l.kind === 'tot') { const d = Math.hypot(c.x - l.tx, c.y - l.ty); if (d < 24) { mx += (c.x - l.tx) / (d || 1) * 1.5; my += (c.y - l.ty) / (d || 1) * 1.5; } } }
    for (const h of w.hazards) if (h.kind === 'pyro') for (const v of h.vents) if (v.state !== 'off') { const d = Math.hypot(c.x - v.x, c.y - v.y); if (d < 30) { mx += (c.x - v.x) / (d || 1) * 2.4; my += (c.y - v.y) / (d || 1) * 2.4; } }
    if (w.boss && !w.boss.hidden) { const b = w.boss, d = Math.hypot(c.x - b.x, c.y - b.y); const R = (b.contactR || 0) + 40; if (b.contactR && d < R) { mx += (c.x - b.x) / (d || 1) * 2; my += (c.y - b.y) / (d || 1) * 2; } if (b.kind === 'mashy' && b.sub === 'tele') { const px2 = c.x - b.x, py2 = c.y - b.y; mx += -Math.sin(b.ca) * Math.sign(px2 * -Math.sin(b.ca) + py2 * Math.cos(b.ca)) * 1.2; my += Math.cos(b.ca) * Math.sign(px2 * -Math.sin(b.ca) + py2 * Math.cos(b.ca)) * 1.2; } }
    // --- attraction
    let best = null, bv = 0;
    for (const p of w.pickups) { if (p.caged && !w.keyCage.open) continue; const d = Math.hypot(p.x - c.x, p.y - c.y); if (d > 200) continue; const val = { key: 9, cap: 6, bomb: 4, life: 5, prize: 4, case: 3, bar: 2.5, stack: 2, bill: 1.2, statue: 20 }[p.kind] || 1; const sc = val / (d + 20); if (sc > bv) { bv = sc; best = p; } }
    if (best && !(o.noPickups)) { const dx = best.x - c.x, dy = best.y - c.y, d = Math.hypot(dx, dy) || 1; const k = Math.min(1.6, 1.0 + (best.kind === 'key' ? 1 : 0)); mx += dx / d * k; my += dy / d * k; }
    // exit
    if (w.phase === 'exit' || (w.phase === 'clear' && w.rm.boss && false)) {
      let dn = o.route && o.route[w.rm.id] || MT.botRoute[w.rm.id] || Object.keys(w.rm.exits)[0]; if (!w.rm.exits[dn]) dn = Object.keys(w.rm.exits)[0];
      if (dn) { const D = MT.DOORS[dn], dx = D.x - c.x, dy = D.y - c.y, d = Math.hypot(dx, dy) || 1; const pickupLeft = w.pickups.some(p => (p.cash || p.kind === 'key' || p.kind === 'cap') && Math.hypot(p.x - c.x, p.y - c.y) < 120) && w.phaseT < 10; mx += dx / d * (pickupLeft ? .5 : 2.5); my += dy / d * (pickupLeft ? .5 : 2.5); }
    } else if (!best || bv < .005) { const dx = MT.CX - c.x, dy = MT.CY - c.y, d = Math.hypot(dx, dy) || 1; if (d > 30) { mx += dx / d * .35; my += dy / d * .35; } }
    // walls
    const wm = 26; if (c.x < 16 + wm && !(w.phase === 'exit')) mx += (16 + wm - c.x) / wm * 1.2; if (c.x > 352 - wm) mx -= (c.x - 352 + wm) / wm * 1.2; if (c.y < 16 + wm) my += (16 + wm - c.y) / wm * 1.2; if (c.y > 224 - wm) my -= (c.y - 224 + wm) / wm * 1.2;
    if (c.state === 'walkin') { out.move = [0, 0]; }
    const ml = Math.hypot(mx, my); if (ml > .05) { out.move = [mx / ml * Math.min(1, ml), my / ml * Math.min(1, ml)]; }
    // --- aim at the best target
    let tgt = null, td = 1e9;
    const near = counted.filter(e => !e.entering || true); const pool = counted.length ? counted : live.filter(e => e.kind !== 'mime' || Math.hypot(e.x - c.x, e.y - c.y) > 40);
    for (const e of pool) { if (e.invuln) continue; const d = Math.hypot(e.x - c.x, e.y - c.y) - (e.kind === 'crate' || e.kind === 'lock' ? 20 : 0); if (d < td) { td = d; tgt = e; } }
    let bt = null; if (w.boss && !w.boss.hidden && (w.phase === 'boss' || w.phase === 'bossIntro')) {
      let bs = -1; for (const t of w.boss.hitParts()) { const d = Math.hypot(t.x - c.x, t.y - c.y); const pri = (t.part.main ? 1 : 3) * (t.part.tv ? 1.5 : 1) * (w.boss.armorOf(t.part) < .5 ? .2 : 1); const s = pri / (d + 30); if (s > bs) { bs = s; bt = t; } }
    }
    const T = (bt && (!tgt || td > 60)) ? bt : tgt;
    if (T) { const d = Math.hypot(T.x - c.x, T.y - c.y), lead = d / (MT.T.bulletSpeed || 330); const vx = T.vx || 0, vy = T.vy || 0; out.aim = Math.atan2(T.y + vy * lead - c.y, T.x + vx * lead - c.x); out.fire = true; }
    else { out.aim = c.aim; out.fire = false; }
    if (c.wpn === 'popcorn') out.fire = out.fire && td < 140;
    // --- actions
    if (threat && tmin < .25 && c.slideCd <= 0 && !o.noSlide) { out.slide = true; const px = -threat.vy, py = threat.vx, l = Math.hypot(px, py) || 1; out.move = [px / l, py / l]; if (c.x < 40 || c.x > 328) out.move = [-px / l, -py / l]; }
    const close = live.filter(e => e.count !== false && Math.hypot(e.x - c.x, e.y - c.y) < 120).length;
    if ((close >= 25 || (o.bombBoss && w.boss && w.phase === 'boss' && w.time % 20 < .05)) && (c.bombs > 0 || w.cheats.infBombs)) out.bomb = true;
    else if (c.hp >= c.maxHp && c.boatCd <= 0 && c.slideT <= 0 && !threat) { const c60 = live.filter(e => e.count !== false && Math.hypot(e.x - c.x, e.y - c.y) < 60).length; if (c60 >= 3 && !o.noBoat) out.showboat = true; }
    if (o.forceBoat && c.boatCd <= 0) out.showboat = true;
    return out;
  }
};
MT.addBot = function (look) {
  const run = MT.run, w = MT.worldNow; if (!run) return null; const slot = [0, 1, 2, 3].find(s => !run.cs.some(c => c.slot === s)); if (slot === undefined) return null;
  const c = MT.newContestant(slot, { look: look === undefined ? slot : look, kind: 'bot', input: null }); c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c); c.state = 'alive'; if (w) { w.respawn(c); c.hp = c.maxHp; if (!w.cs.includes(c)) w.cs.push(c); } return c;
};

// ===== 41-attract.js =====
// MASH TV: the attract mode. After 10 s idle on any front-end screen the real game plays itself (2 cheating bots), looping 10 reels. Any input exits.
MT.attract = {};
const REELS = [
  { kind: 'cold', dur: 7, caption: 'TONIGHT ON MASH TV!' },
  { room: '1-1', dur: 18, caption: "MASH 'EM!", weapon: [[6, 'spread']] },
  { room: '1-2', dur: 14, caption: "CASH 'EM!", weapon: [[1, 'rockets']], keyAt: 10 },
  { room: '1-B', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', boss: 'mashy2' },
  { room: '2-2', dur: 16, caption: 'PRIME TIME = 5× CASH!', weapon: [[1, 'popcorn'], [3, 'laser']], primeAt: 5 },
  { room: '2-B', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!', boss: 'wheel' },
  { room: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', weapon: [[1, 'records'], [1, 'shield']], showboat: true },
  { room: '3-B', dur: 24, caption: 'NOBODY CANCELS LANCE LUSTRE!', boss: 'lance' },
  { kind: 'recap', dur: 8, caption: 'BIG PRIZES!' },
  { kind: 'scores', dur: 6, caption: '' }];
MT.attract.REELS = REELS;
const A = {
  input: MT.MENU, camera: { zoom: false },
  enter(d) {
    const game = MT.game; this.idx = d && d.idx || 0; this.t = 0; this.grace = .35; this.loops = 0;
    MT.touchOnly = MT.touchOnly; MT.idle.flag = false; MT.idle.t = 0; game.players.forEach(p => p.consumeAll());
    const run = MT.newRun({ mode: 'attract', diff: 'CONTESTANT', players: [{ slot: 0, look: 0, bot: true }, { slot: 1, look: 1, bot: true }] }); this.run = run; MT.cheatsSave = Object.assign({}, MT.cheats);
    this.cheats = { god: true, infBombs: true, oneHit: false, freezeEnemies: false, noclip: false };
    for (const c of run.cs) { c.input = null; c.kind = 'bot'; c.prizes = []; }
    if (game.audio && !game.headless) { this.mv = game.audio.musicVolume; game.audio.musicVolume = this.mv * .45; try { game.audio.applyVolume(); } catch (e) { /* */ } }
    this.reel(this.idx); MT.hud.cursorOn(true);
  },
  exit() { const game = MT.game; if (this.mv !== undefined && game.audio) { game.audio.musicVolume = this.mv; try { game.audio.applyVolume(); } catch (e) { /* */ } } MT.worldNow = null; this.w = null; MT.hud.banners && 0; MT.lines.clear(); MT.ui.banners.length = 0; },
  reel(i) {
    const R = this.R = REELS[i % REELS.length]; this.idx = i % REELS.length; this.rt = 0; this.fired = {}; MT.ui.banners.length = 0; MT.lines.clear(); MT.worldNow = null; this.w = null;
    const run = this.run; run.seen = {}; MT.seedAll(100 + i);
    if (R.caption) MT.hud.banner(R.caption, '#ffcc33', 3);
    if (R.room) {
      const rm = MT.ROOMS[R.room]; run.ep = rm.ep; run.path = [R.room];
      for (const c of run.cs) { c.hp = c.maxHp; c.lives = 3; c.state = 'alive'; c.wpn = 'blaster'; c.wT = 0; c.addons = {}; c.bombs = 3; c.invuln = 0; c.cash = c.cash || 0; c.botOpts = { forceBoat: false }; }
      if (R.showboat) run.cs[0].botOpts.forceBoat = true;
      const w = this.w = new MT.World({ room: rm, contestants: run.cs, entry: 'S', demo: true, cheats: this.cheats }); MT.worldNow = w; w.dmgBoost = 3; w.cheats = this.cheats;
      w.phase = rm.boss ? 'bossIntro' : 'enter'; if (rm.boss) { w.bossIntroDone = true; }
      MT.music.play(rm.boss ? 'bossShowdown' : MT.EPISODES[rm.ep].song);
    } else if (R.kind === 'recap') {
      for (const c of run.cs) { c.prizes = MT.EPISODES[2].prizes.slice(c.slot, c.slot + 3 + c.slot).map(p => ({ name: p.name, value: p.value, joke: p.joke, ep: 2 })); c.cash = 90000 + c.slot * 31000; run.epStart[c.slot] = 20000; }
      const rc = this.rc = Object.create(MT.scenes.recap); rc.enter({ ep: 2 }); rc.left = true;
    } else if (R.kind === 'cold') { MT.music.play('theme'); MT.lines.say('ANNC', "LIVE FROM STUDIO 9... IT'S... MASH TV!", { prio: 3, force: true }); this.spk = 'ANNC'; }
    else if (R.kind === 'scores') { MT.music.play('theme'); }
  },
  update(dt) {
    const game = MT.game; this.t += dt; this.rt += dt; UI.t += dt; MT.hud.update(dt); this.grace -= dt;
    const any = MT.idle.step(game, dt); if (this.grace > 0) { MT.idle.t = 0; } else if (any) { MT.sfx('back'); MT.idle.t = 0; game.go('title', {}, { fade: 0 }); return; }
    const R = this.R, w = this.w;
    if (this.rc) this.rc.update(dt);
    if (R.kind === 'cold' && this.rt > 3 && !this.fired.lance) { this.fired.lance = 1; this.spk = 'LANCE'; MT.lines.say('LANCE', 'GOOD EVENING, PLANET EARTH! KA-CHING! KA-BOOM!', { prio: 3, force: true }); }
    if (R.kind === 'cold') MT.lines.update(dt);
    if (w) {
      for (const [at, id] of (R.weapon || [])) if (this.rt >= at && !this.fired['w' + at + id]) { this.fired['w' + at + id] = 1; for (const c of w.cs) w.giveWeapon(c, id); for (const c of w.cs) { c.wT = 999; for (const k in c.addons) c.addons[k] = 999; } }
      if (R.keyAt && this.rt >= R.keyAt && !this.fired.key) { this.fired.key = 1; for (const e of w.enemies) if (e.alive && e.placed && e.kind === 'mime') { e.noCash = true; w.killEnemy(e, { slot: 0 }); } }
      if (R.primeAt && this.rt >= R.primeAt && !this.fired.prime) { this.fired.prime = 1; w.startPrime(); }
      if (R.boss && w.phase === 'boss' && !this.fired.boss) { this.fired.boss = 1; const b = w.boss; if (R.boss === 'mashy2') { b.part('armL').hp = 0; b.killPart(w, b.part('armL'), 0); b.killPart(w, b.part('armR'), 0); b.part('body').hp = b.part('body').max * .55; } if (R.boss === 'wheel') b.forced = [6, 0, 3]; if (R.boss === 'lance') { b.pattern = 1; b.startPattern(w); } }
      if (R.boss === 'lance' && this.rt > 10 && !this.fired.cut && w.boss && w.phase === 'boss') { this.fired.cut = 1; const p = w.boss.part('podium'); p.hp = 1; }
      if (R.showboat && this.rt > 8 && !this.fired.bomb) { this.fired.bomb = 1; w.showstopper(w.cs[1]); }
      if (w.phase === 'bossIntro') { w.bossIntroDone = true; }
      for (const c of w.cs) if (c.state === 'out' || c.state === 'dying') { c.lives = 3; }
      if (w.phase === 'exit' && !w.exitPicked) { /* stay put */ }
      w.step(dt); MT.lines.update(dt);
      game.focus(MT.CX, MT.CY, 0); const ex = w.rm.boss && w.rm.boss !== 'mashy' ? 46 : w.rm.boss ? 22 : 6; const z = MT.fitZoom(game, w.map, ex); if (Math.abs(z - (this._z || 0)) > .002) { this._z = z; game.setZoom(z); } game.cam.offset = [0, Math.round(ex / 2)];
      game.cam.bounds = v => w.map.bounds(v);
    }
    if (this.rt >= R.dur) { let n = this.idx + 1; if (n >= REELS.length) { n = 0; this.loops++; } this.rc = null; this.reel(n); }
  },
  draw(r) {
    const R = this.R, w = this.w;
    if (w) { w.draw(r); MT.hud.draw(r, w, this); }
    else if (R.kind === 'cold') { MT.backdrop(r, this.rt); r.overlay(g => { UI.title(g, 'MASH TV', r.W / 2, 22, 5); UI.text(g, MT.TEXT.sub, r.W / 2, 62, '#2ee6ff', { align: 'center' }); MT.drawSpeaker(g, this.spk || 'ANNC', r.W / 2 - 34, 84, 68, this.rt); }); UI.drawLowerThird(r); UI.drawBanners(r); }
    else if (this.rc) { this.rc.draw(r); UI.drawBanners(r); }
    else if (R.kind === 'scores') { MT.scenes.scores.draw.call({ t: this.rt }, r); }
    r.overlay(g => {
      px.rect(g, r.W - 70, 4, 66, 10, 'rgba(10,4,20,.8)'); UI.text(g, 'DEMO PLAY', r.W - 37, 5, '#ff2e88', { align: 'center', font: 'tiny' });
      const pi = MT.lastInput(); if (Math.floor(this.t * 2) % 2 === 0) { const label = 'PRESS ANY BUTTON'; const wd = F.width(label) + 14; px.rect(g, r.W / 2 - wd / 2, r.H - 15, wd, 12, 'rgba(10,4,20,.85)'); UI.text(g, label, r.W / 2, r.H - 13, '#ffe068', { align: 'center' }); }
    });
  }
};
MT.attract.scene = A;

// ===== 50-net.js =====
// MASH TV: AI Hub Session Protocol v1, shared-world. The host (or a server copy) simulates; clients mirror and run their own contestant.
const N = MT.net = { hub: null, info: null, role: 'none', state: 'idle', card: null, scenes: {}, snapN: 0, sent: 0, standingsSent: false };
const KINDS = Object.keys(MT.ENEMIES), STATES = ['idle', 'walk', 'wind', 'recover', 'hop', 'squat', 'fuse', 'tele', 'flare', 'throw', 'strafe', 'aim', 'rear', 'lunge', 'charge', 'stunned', 'stunned2'];
const PK = ['bill', 'stack', 'bar', 'case', 'prize', 'key', 'cap', 'bomb', 'life', 'statue'], FK = ['orb', 'shard', 'beam', 'tomato', 'shell', 'butter', 'gravy', 'coin', 'card', 'static', 'tot'];
const PHASES = ['enter', 'intro', 'waves', 'clear', 'exit', 'bossIntro', 'boss', 'bossDeath'], DSTATE = { closed: 0, opening: 1, open: 1, exit: 2, closing: 3 };
const WK = Object.keys(MT.WEAPONS), BRADIUS = { shard: 2, beam: 2, static: 2, card: 3, coin: 3, shell: 4 };
const ARCH_R = k => (MT.ENEMIES[k] || {}).r || 6;
const FLAG = { fire: 1, slide: 2, boat: 4, dying: 8, out: 16, laser: 32 };
const clip12 = n => String(n == null ? '' : n).replace(/[^\x20-\x7e]/g, '?').slice(0, 12);
N.rt = () => (N.hub && N.hub.time ? N.hub.time() : 0);
N.send = function (data, reliable) { const h = N.hub; if (!h) return false; try { const ok = h.send(data, { reliable: !!reliable }); N.sent++; return ok; } catch (e) { return false; } };

// ---- begin: connect, seat contestants, show our card ------------------------------------------------------------------------
N.begin = function (game) {
  const hub = N.hub = MT.hubOverride || (typeof window !== 'undefined' ? window : globalThis).AIHub; if (!hub) return;
  Promise.resolve(hub.connect({ mode: 'shared-world', seats: [1, 4], card: true })).then(info => {
    if (!info) { N.hub = null; return; }
    N.info = info; N.role = info.server ? 'server' : info.isHost ? 'host' : 'client'; N.state = 'card'; MT.net.active = true;
    const players = info.players.map(p => ({ slot: p.id, look: p.id, name: clip12(p.name), input: p.id === info.me ? game.input : null, kind: p.id === info.me ? 'local' : (N.role === 'client' ? 'mirror' : 'remote') }));
    const run = MT.newRun({ mode: 'session', diff: 'CONTESTANT', players, seed: info.seed || 7 }); run.session = true;
    info.players.forEach((p, i) => { const c = run.cs[i]; c.color = p.color || MT.PCOL[i]; c.lives = 99; c.bombs = 2; c.name = clip12(p.name).toUpperCase(); c.pid = p.id; c.nextLife = 0; });
    hub.on('card', c => { N.card = c; }); hub.on('start', s => { N.state = 'countdown'; N.starting = true; });
    hub.on('message', N.onMessage); hub.on('leave', N.onLeave); hub.on('time-up', () => N.onTimeUp()); hub.on('end', e => N.onEnd(e));
    game.go('sessionCard'); hub.ready();
    if (MT.hasDOM) window.addEventListener('keydown', e => { if (e.key === 'Enter' && N.state === 'card') hub.answer('ready'); });
  });
};
N.previewCard = function () {
  const fake = { me: 0, host: 0, isHost: true, players: [{ id: 0, name: 'ROCKET', color: '#e8443a' }, { id: 1, name: 'VOLT', color: '#3b82f6' }, { id: 2, name: 'MOXIE', color: '#22c55e' }], seed: 5 };
  N.info = fake; N.preview = true; N.card = { left: 14000, ready: [1], asked: false, paused: false };
  const players = fake.players.map(p => ({ slot: p.id, look: p.id, name: p.name, input: p.id === 0 ? MT.game.input : null })); MT.newRun({ mode: 'test', players }); MT.game.go('sessionCard');
};
N.previewLightning = function (o) { MT.warp('L1', { players: o.players || 2, mode: 'test', bot: true, god: true }); };

// ---- the session card ------------------------------------------------------------------------------------------------------------
N.scenes.sessionCard = {
  input: MT.MENU, camera: { zoom: false }, pausable: false,
  enter() { this.t = 0; this.cd = null; N.cardScene = this; MT.music.play('theme'); MT.hud.cursorOn(true); this.rigs = {}; this.said = false; MT.lines.clear(); this.ph = 0; },
  exit() { N.cardScene = null; },
  update(dt) {
    this.t += dt; UI.t += dt; const game = MT.game, hub = N.hub, I = game.players, card = N.card || {};
    if (!this.said && this.t > .5) { this.said = true; MT.lines.say('LANCE', "WELCOME TO THE LIGHTNING ROUND! GRAB THE MOST CASH, AND BEAT MASHY TOGETHER!", { prio: 3, force: true }); }
    MT.lines.update(dt);
    if (hub && !N.preview) {
      if (I.some(p => p.pressed('confirm') || p.pressed('start')) && !N.starting) hub.answer('ready');
      if (I.some(p => p.pressed('tabL') || p.pressed('more') || p.pressed('reset'))) hub.answer('more');
      const c = UI.clicked(); if (c && this.btn) { if (UI.inRect(c, ...this.btn[0])) hub.answer('ready'); else if (UI.inRect(c, ...this.btn[1])) hub.answer('more'); }
      const tm = hub.time ? hub.time() : -Infinity;
      if (N.starting && isFinite(tm)) { this.cd = tm; if (tm >= 0 && !this.went) { this.went = true; N.startPlay(); } }
    }
  },
  draw(r) {
    MT.backdrop(r, this.t); const card = N.card || {}, info = N.info || { players: [] }, run = MT.run;
    r.overlay(g => {
      UI.title(g, 'MASH TV', r.W / 2, 6, 3); UI.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, 28, '#2ee6ff', { align: 'center' });
      const n = info.players.length, bw = Math.min(90, (r.W - 20) / Math.max(1, n));
      info.players.forEach((p, i) => { const x = r.W / 2 - n * bw / 2 + i * bw, y = 40, rdy = (card.ready || []).includes(p.id), col = p.color || MT.PCOL[i], c = run && run.cs[i];
        E.ui.box(g, x + 2, y, bw - 4, 64, { bg: ['#2a1446', '#140a24'], border: col, alpha: .92 }); if (c && !c.rig && !MT.cfg.skipRigs) c.rig = MT.contestantRig(c); if (c && c.rig && !MT.cfg.skipRigs) { c.rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: rdy ? 'cheer' : 'hips' }); try { c.rig.drawPortrait(g, x + bw / 2 - 18, y + 4, 36, {}); } catch (e) { /* */ } }
        UI.text(g, clip12(p.name).toUpperCase(), x + bw / 2, y + 44, col, { align: 'center', font: 'tiny' }); UI.text(g, rdy ? '✓ READY' : '...', x + bw / 2, y + 54, rdy ? '#7affb0' : '#7a6a98', { align: 'center', font: 'tiny' }); });
      UI.panel(g, 12, 110, r.W - 24, 34, {}); UI.text(g, 'HOW TO WIN: GRAB THE MOST CASH - BEAT MASHY TOGETHER', r.W / 2, 114, '#ffe068', { align: 'center' });
      const pi = MT.lastInput(); MT.glyph.prompt(g, r.W / 2, 128, [['move', 'MOVE'], ['aim', 'AIM+FIRE'], ['slide', 'SLIDE'], ['bomb', 'BOMB']], pi, { align: 'center' });
      const left = card.paused ? 'PAUSED' : card.starting || N.starting ? 'STARTING' : card.left != null ? Math.ceil(card.left / 1000) + 's' : '...';
      UI.text(g, 'TIME LEFT: ' + left, r.W / 2, 150, '#c8c0e0', { align: 'center' });
      const b1 = [r.W / 2 - 96, 164, 90, 20], b2 = [r.W / 2 + 6, 164, 90, 20]; this.btn = [b1, b2];
      E.ui.box(g, ...b1, { bg: ['#1a5a2a', '#0a2a14'], border: '#7affb0', alpha: 1 }); UI.text(g, 'READY', b1[0] + 45, b1[1] + 6, '#7affb0', { align: 'center' });
      E.ui.box(g, ...b2, { bg: ['#2a3a5a', '#101a2a'], border: '#2ee6ff', alpha: 1 }); UI.text(g, card.asked ? 'TAKE BACK' : 'MORE TIME', b2[0] + 45, b2[1] + 6, '#2ee6ff', { align: 'center' });
      MT.glyph.prompt(g, r.W / 2, r.H - 26, [['confirm', 'READY'], ['more', 'MORE TIME']], pi, { align: 'center' });
      if (this.cd !== null && isFinite(this.cd) && this.cd < 0) { const k = Math.ceil(-this.cd / 1000); UI.text(g, String(k), r.W / 2, r.H / 2 - 20, '#fff', { align: 'center', scale: 6 }); }
      else if (this.cd !== null && this.cd >= 0) UI.text(g, 'MASH!', r.W / 2, r.H / 2 - 20, '#ff2e88', { align: 'center', scale: 5 });
    });
    UI.drawLowerThird(r);
  }
};
N.startPlay = function () {
  N.state = 'play'; const run = MT.run; for (const c of run.cs) { c.cash = 0; c.kills = 0; c.hp = c.maxHp; c.state = 'alive'; }
  N.roomSeq = 1; N.over = false; N.finished = false; N.gone = {}; MT.sessionOverlay = { open: false };
  MT.game.go('play', { room: 'L1', entry: 'S', netMode: N.role === 'client' ? 'client' : N.role }, { fade: 0 });
};
// ---- play-scene glue ------------------------------------------------------------------------------------------------------------------
N.onWorld = function (w, scene) {
  N.w = w; N.scene = scene; w.net = { snaps: [], lastSeq: 0, evs: [], q: [], lastC: 0, lastS: 0, lastE: 0, mir: new Map(), pk: new Map(), claimed: new Set() }; N.sc = 0;
  w.evHook = ev => N.onEvent(w, ev);
  if (N.role === 'client') for (const c of w.cs) if (c.kind !== 'local') { c.kind = 'mirror'; }
  if (N.role === 'host' || N.role === 'server') for (const c of w.cs) if (c.kind !== 'local') c.kind = 'remote';
  w.session = true; if (N.role !== 'client') { w.mode = N.role; }
  if (N.role === 'server') for (const c of w.cs) c.kind = 'remote';
  N.roomChanged = false; MT.sessionOverlay = MT.sessionOverlay || { open: false }; N.sessionMenu = null;
};
N.onWorldExit = function () { N.w = null; };
N.onEvent = function (w, ev) {
  if (!N.info) return; const me = N.info.me;
  if (w.mode === 'client') {
    if (ev.name === 'hurt' && ev.data.slot === me) w.net.q.push(['hurt', ev.data.dmg || 1, ev.data.src || '', ev.data.id || 0]);
    else if (ev.name === 'death' && ev.data.slot === me) w.net.q.push(['died']);
    else if (ev.name === 'bomb' && ev.data.slot === me) w.net.q.push(['bomb', Math.round(ev.data.x), Math.round(ev.data.y)]);
    else if (ev.name === 'showboat' && ev.data.slot === me) w.net.q.push(['boat', Math.round(ev.data.gain)]);
    else if (ev.name === 'drop' && ev.data.slot === me) w.net.q.push(['respawn']);
  }
};
N.update = function (w, dt, scene) {
  const game = MT.game, hub = N.hub; if (!hub || N.state === 'ended') return;
  // session overlay (never pauses)
  if (game.players.some(p => p.pressed('pause') && !(p.held && p.held.has && p.held.has('Pad8')))) { MT.sessionOverlay.open = !MT.sessionOverlay.open; MT.overlay.open = MT.sessionOverlay.open ? 1 : 0; if (MT.sessionOverlay.open) N.openMenu(); }
  if (MT.sessionOverlay.open && N.sessionMenu) N.sessionMenu.update(dt);
  w.net.time = N.rt();
  if (w.mode === 'client') N.clientStep(w, dt); else N.hostStep(w, dt);
};
N.openMenu = function () {
  const g = MT.game, set = (k, v) => g.settings.set(k, Math.max(0, Math.min(1, +(v).toFixed(2))));
  N.sessionMenu = new UI.Menu([
    { label: 'VOLUME', value: () => Math.round(g.settings.volume * 100) + '%', adjust: d => set('volume', g.settings.volume + d * .1) }, { label: 'MUSIC', value: () => Math.round(g.settings.music * 100) + '%', adjust: d => set('music', g.settings.music + d * .1) },
    { label: 'BUTTON SYMBOLS', value: () => g.settings.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', adjust: () => g.settings.set('glyphs', g.settings.glyphs === 'xbox' ? 'playstation' : 'xbox'), onPick: () => g.settings.set('glyphs', g.settings.glyphs === 'xbox' ? 'playstation' : 'xbox') },
    { label: 'CLOSE', onPick: () => { MT.sessionOverlay.open = false; MT.overlay.open = 0; } }], { y: 70, rowH: 22, w: 230, scale: 1, onCancel: () => { MT.sessionOverlay.open = false; MT.overlay.open = 0; } });
};
N.drawOverlay = function (r, w) {
  if (N.role === 'server') { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#05020c'); UI.title(g, 'STUDIO SERVER', r.W / 2, 60, 3); UI.text(g, 'HOSTING THE ROUND FOR ' + (N.info ? N.info.players.length : 0) + ' CONTESTANTS', r.W / 2, 100, '#c8c0e0', { align: 'center' }); UI.text(g, 'ROOM ' + (w.rm ? w.rm.id : '') + '   ENEMIES ' + w.enemies.length, r.W / 2, 114, '#7affb0', { align: 'center' }); }); }
  if (MT.sessionOverlay && MT.sessionOverlay.open && N.sessionMenu) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, 'rgba(5,2,12,.6)'); UI.title(g, 'MASH TV', r.W / 2, 30, 3); }); N.sessionMenu.draw(r); UI.promptBar(r, [['confirm', 'SELECT'], ['pgL', 'ADJUST'], ['cancel', 'CLOSE']]); }
};
// ---- host --------------------------------------------------------------------------------------------------------------------------------
N.hostStep = function (w, dt) {
  const net = w.net, hub = N.hub;
  // remote contestant reports are applied in onMessage; step the world
  w.step(dt); N.fx = 0;
  const now = N.rt(); if (now - net.lastS >= 66) { net.lastS = now; N.sendSnapshot(w); }
  if (w.boss && w.boss.dead && w.phase === 'clear' && !N.bossT) N.bossT = 3;
  if (N.bossT) { N.bossT -= dt; if (N.bossT <= 0 && !N.finished) N.finish(true); }
  if (N.role === 'server') { /* no local contestant */ }
  // finish when nobody is left
  if (w.cs.length && w.cs.every(c => c.state === 'gone') && !N.finished) N.finish(false);
};
N.sendSnapshot = function (w) {
  const net = w.net, d = w.doors; let dr = 0; ['N', 'E', 'S', 'W'].forEach((k, i) => { dr |= (DSTATE[d[k].state] || 0) << (i * 2); });
  const P = w.cs.filter(c => c.state !== 'gone').map(c => [c.slot, Math.round(c.x * 10), Math.round(c.y * 10), Math.round(c.aim * 1000), (c.fireOn ? FLAG.fire : 0) | (c.slideT > 0 ? FLAG.slide : 0) | (c.boatT > 0 ? FLAG.boat : 0) | (c.state === 'dying' ? FLAG.dying : 0) | (c.state === 'out' ? FLAG.out : 0) | (c.laserOn ? FLAG.laser : 0), Math.max(0, WK.indexOf(c.wpn)), Math.round(c.wT * 10), c.hp, c.lives, Math.round(c.cash), c.bombs, c.kills, Math.round(c.face * 100), c.state === 'drop' ? 1 : 0]);
  const E_ = []; for (const e of w.enemies) { if (!e.alive || E_.length >= 160) continue; E_.push([e.id, KINDS.indexOf(e.kind), Math.round(e.x * 10), Math.round(e.y * 10), Math.round(e.face * 100), Math.max(0, STATES.indexOf(e.state)), Math.round(e.hpPct * 100), (e.carryKey ? 1 : 0) | (e.big ? 2 : 0) | (e.hidden ? 4 : 0) | (e.vulnerable ? 8 : 0) | (e.stunnedFlag ? 16 : 0), e.kind === 'tank' ? Math.round(e.turret * 100) : e.kind === 'segment' ? e.idx : e.kind === 'disco' ? Math.round((e.spin || 0) * 100) : 0]); }
  const B = []; for (const b of w.fShots.list) { if (b.dead || B.length >= 220) continue; B.push([b.id, Math.max(0, FK.indexOf(b.kind)), Math.round(b.x * 10), Math.round(b.y * 10), Math.round(b.vx), Math.round(b.vy), Math.round(b.z), 0]); }
  for (const l of w.lobs) if (B.length < 230 && (l.kind === 'tomato' || l.kind === 'tot')) B.push([l.id, Math.max(0, FK.indexOf(l.kind)), Math.round(l.x * 10), Math.round(l.y * 10), Math.round(l.vx), Math.round(l.vy), Math.round(l.z), Math.round(l.vz), Math.round(l.tx), Math.round(l.ty)]);
  const K = []; for (const p of w.pickups) { if (p.dead || K.length >= 40) continue; K.push([p.id, PK.indexOf(p.kind), Math.round(p.x * 10), Math.round(p.y * 10), p.ttl > 1e8 ? -1 : Math.round(p.ttl * 10), p.kind === 'cap' ? WK.indexOf(p.w) : p.kind === 'prize' ? p.prizeIdx : 0, Math.round(p.z), p.kind === 'prize' ? ['red', 'blue', 'gold'].indexOf(p.col) : 0, p.pedestal ? 1 : 0]); }
  const now = N.rt(), V = w.events.filter(e => e.seq > (net.lastEv || 0) - 0 && now - (e.at || (e.at = now)) < 1000).map(e => [e.seq, e.name, N.trimData(e.data)]);
  const snap = { t: 's', a: now | 0, n: ++N.snapN, rm: N.roomSeq || 1, ph: Math.max(0, PHASES.indexOf(w.phase)), pt: Math.round(w.phaseT * 10), dr, R: Math.round(w.rat.R * 10), X: w.rat.X, pm: Math.round(w.rat.prime * 10), k: MT.run ? MT.run.keys : 0, wv: w.waveI, P, E: E_, B, K, G: w.boss ? w.boss.toNet() : 0, V };
  N.lastSnapSize = JSON.stringify(snap).length; if (N.lastSnapSize > N.maxSnap) N.maxSnap = N.lastSnapSize; N.maxSnap = N.maxSnap || N.lastSnapSize;
  N.send(snap, false);
};
N.trimData = function (d) { const o = {}; for (const k in d) { const v = d[k]; if (typeof v === 'number') o[k] = Math.round(v * 10) / 10; else if (typeof v === 'string' || typeof v === 'boolean') o[k] = v; } return o; };
N.onMessage = function (m, from) {
  const w = N.w; if (!m || typeof m !== 'object') return;
  if (m.t === 'room') { if (N.role === 'client') N.clientRoom(m); return; }
  if (m.t === 'over') { N.overData = m; return; }
  if (!w) return;
  if (N.role === 'client') { if (m.t === 's' && m.rm === (N.roomSeq || 1)) { const net = w.net; net.snaps.push(m); if (net.snaps.length > 12) net.snaps.shift(); } return; }
  // host / server
  const c = w.cs.find(q => q.slot === from); if (!c) return;
  if (m.t === 'c') { const s = m.s; if (!s || (c.lastA !== undefined && m.a < c.lastA)) return; c.lastA = m.a; c.rep = { x: s[0] / 10, y: s[1] / 10, aim: s[2] / 1000, flags: s[3], wpn: WK[s[4]] || 'blaster', wT: s[5] / 10, hp: s[6], lives: s[7], t: N.rt() }; if (s[8] !== undefined) c.rep.face = s[8] / 100; }
  else if (m.t === 'ce') {
    for (const ev of m.ev || []) {
      const k = ev[0];
      if (k === 'claim') { const p = w.pickups.find(q => q.id === ev[1]); if (p && !p.dead && Math.hypot(c.x - p.x, c.y - p.y) < 40 + 14) { if (p.kind === 'cap') { p.dead = true; } else w.collect(c, p); } }
      else if (k === 'hurt') { w.loseRating(12); if (ev[3]) for (const b of w.fShots.list) if (b.id === ev[3]) b.dead = true; w.event('hurt', { slot: c.slot, hp: c.hp, x: c.x, y: c.y, src: ev[2] || '' }); }
      else if (k === 'died') { c.deaths++; c.cash = Math.max(0, c.cash - 2500); w.loseRating(25); w.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name, lives: 99 }); }
      else if (k === 'bomb') { c.x = ev[1]; c.y = ev[2]; w.showstopper(c); }
      else if (k === 'boat') { w.addRating(Math.min(30, ev[1])); c.boatGain += ev[1]; w.event('showboat', { slot: c.slot, gain: ev[1], x: c.x, y: c.y, n: 0 }); }
    }
  }
};
WP.updateRemote = function (c, dt) {
  const r = c.rep; c.flash = Math.max(0, c.flash - dt); c.fireCd = Math.max(0, c.fireCd - dt); c.invuln = Math.max(0, c.invuln - dt);
  if (!r) { c.state = c.state === 'gone' ? 'gone' : 'alive'; return; }
  const k = Math.min(1, dt * 14), ox = c.x, oy = c.y; c.x += (r.x - c.x) * k; c.y += (r.y - c.y) * k; c.body.x = c.x; c.body.y = c.y; c.vx = (c.x - ox) / (dt || 1); c.vy = (c.y - oy) / (dt || 1);
  c.aim = r.aim; if (r.face !== undefined) c.face = r.face; c.wpn = r.wpn; c.wT = r.wT; c.hp = r.hp; c.fireOn = !!(r.flags & FLAG.fire);
  c.state = (r.flags & FLAG.dying) ? 'dying' : (r.flags & FLAG.out) ? 'out' : 'alive'; c.slideT = (r.flags & FLAG.slide) ? .1 : 0; c.boatT = (r.flags & FLAG.boat) ? .3 : 0; c.laserOn = !!(r.flags & FLAG.laser); if (c.laserOn) { c.laserA = c.aim; }
  if (c.state === 'alive' && (r.flags & (FLAG.fire | FLAG.laser)) && !(r.flags & FLAG.slide)) this.fireWeapon(c, dt);
  if (c.state === 'dying') c.down = Math.min(1, c.down + dt * 2); else c.down = 0;
  this.pushOutStatics && 0;
};
N.onLeave = function (m) {
  const w = N.w; if (!m) return; N.gone = N.gone || {}; N.gone[m.id] = true; const c = MT.run && MT.run.cs.find(q => q.slot === m.id); if (!c) return;
  if (w && N.role !== 'client' || N.role === 'client') { c.state = 'gone'; if (w) { w.event('leave', { slot: m.id, name: c.name }); w.game.particles.bits(c.x, c.y, 10, 20, [c.color, '#fff']); } }
  if (N.role !== 'client' && MT.run.cs.every(q => q.state === 'gone')) N.finish(false);
};
N.onTimeUp = function () { if (N.role !== 'client') N.finish(false); };
N.standings = function () {
  const run = MT.run, cs = run.cs.filter(c => c.state !== 'gone'); cs.sort((a, b) => b.cash - a.cash); const groups = []; for (const c of cs) { if (groups.length && groups[groups.length - 1].cash === c.cash) groups[groups.length - 1].ids.push(c.slot); else groups.push({ cash: c.cash, ids: [c.slot] }); }
  return groups.map(g => g.ids);
};
N.finish = function (won) {
  if (N.finished || N.role === 'client') return; N.finished = true; const run = MT.run, w = N.w;
  const standings = N.standings(), scores = {}, stats = {}; for (const c of run.cs) { scores[c.slot] = Math.round(c.cash); stats[c.slot] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
  const best = (f) => run.cs.reduce((a, c) => (!a || f(c) > f(a) ? c : a), null), awards = [];
  const rich = best(c => c.cash), killer = best(c => c.kills), fav = best(c => c.boatGain);
  if (rich) awards.push({ id: rich.slot, title: 'BIGGEST EARNER', detail: MT.fmt$(rich.cash) }); if (killer) awards.push({ id: killer.slot, title: 'MOST MASHES', detail: killer.kills + ' KILLS' }); if (fav && fav.boatGain > 0) awards.push({ id: fav.slot, title: 'CROWD FAVORITE', detail: Math.round(fav.boatGain) + ' STYLE' });
  const over = { t: 'over', won: !!won, standings, scores, stats, awards }; N.overData = over; N.send(over, true);
  try { N.hub.finish({ standings, scores, won: !!won, stats, awards }); } catch (e) { /* */ }
};
N.exitRoom = function (w, dir, dest) {
  if (N.role === 'client') return; N.roomSeq = (N.roomSeq || 1) + 1; N.send({ t: 'room', rm: N.roomSeq, id: dest, entry: MT.DOORS[dir].opp }, true);
  N.goRoom(dest, MT.DOORS[dir].opp);
};
N.goRoom = function (id, entry) { for (const c of MT.run.cs) if (c.state === 'dying' || c.state === 'drop') { c.state = 'alive'; c.hp = c.maxHp; } MT.game.go('play', { room: id, entry, netMode: N.role === 'client' ? 'client' : N.role, R: N.w ? N.w.rat.R : undefined }, { fade: 0 }); };
N.clientRoom = function (m) { if (m.rm <= (N.roomSeq || 1)) return; N.roomSeq = m.rm; N.goRoom(m.id, m.entry); };
N.bossDone = function (w) { /* host: finish() is called 3 s later in hostStep */ };
N.onEnd = function (e) {
  N.state = 'ended'; const game = MT.game; try { game.input.clear(); } catch (x) { /* */ } try { MT.music.stop(.3); game.audio.mute(true); } catch (x) { /* */ }
  game.go('sessionEnd', { reason: e && e.reason, standings: (e && e.standings) || (N.overData && N.overData.standings) || [], over: N.overData }, { fade: 0 });
};
N.scenes.sessionEnd = {
  input: MT.MENU, camera: { zoom: false }, pausable: false,
  enter(d) { this.d = d; this.t = 0; MT.overlay.open = 1; MT.sessionOverlay = { open: false }; },
  update(dt) { this.t += dt; UI.t += dt; },
  draw(r) {
    const d = this.d, reason = d.reason, T = MT.TEXT; const head = reason === 'finished' ? T.sessionEnd : reason === 'sat-out' ? T.sessionSat : reason === 'session-ended' ? T.sessionOver : T.sessionDiff;
    MT.backdrop(r, this.t, reason === 'finished' ? {} : { sky: ['#05020a', '#14081c', '#05020a'] });
    r.overlay(g => {
      UI.title(g, head, r.W / 2, 18, head.length > 26 ? 2 : 3);
      if (reason === 'finished') {
        const run = MT.run, over = d.over || {}, st = d.standings && d.standings.length ? d.standings : (over.standings || []); let y = 56, rank = 1;
        for (const grp of st) { for (const id of grp) { const c = run.cs.find(q => q.slot === id); if (!c) continue; UI.text(g, rank + '.', r.W / 2 - 100, y, '#ffe068'); UI.text(g, c.name, r.W / 2 - 84, y, c.color); UI.text(g, MT.fmt$(over.scores ? over.scores[id] : c.cash), r.W / 2 + 100, y, '#fff7e8', { align: 'right' }); y += 14; } rank += grp.length; }
        (over.awards || []).forEach((a, i) => { const c = run.cs.find(q => q.slot === a.id); UI.text(g, a.title + ': ' + (c ? c.name : '?') + '  ' + a.detail, r.W / 2, y + 10 + i * 11, '#7affb0', { align: 'center', font: 'tiny' }); });
        UI.text(g, over.won ? 'MASHY HAS BEEN MASHED!' : 'MASHY LIVES TO MASH ANOTHER DAY', r.W / 2, r.H - 40, over.won ? '#7affb0' : '#ff8a8a', { align: 'center' });
      }
    });
  }
};
// ---- client ---------------------------------------------------------------------------------------------------------------------------------
N.clientStep = function (w, dt) {
  const net = w.net, hub = N.hub, me = N.info.me, now = N.rt();
  w.time += dt; w.phaseT += dt; MT.lines.update(0);
  const mine = w.cs.find(c => c.slot === me);
  const rt = now - 120, S = net.snaps; let a = null, b = null;
  for (let i = S.length - 1; i >= 0; i--) { if (S[i].a <= rt) { a = S[i]; b = S[i + 1] || null; break; } }
  if (!a && S.length) a = S[0]; const latest = S[S.length - 1];
  if (latest) N.applyLatest(w, latest, now, mine);
  if (a) N.interpolate(w, a, b || a, rt, dt, mine);
  // own contestant: fully local
  if (mine) {
    mine.intent = w.getIntent(mine); w.updateContestant(mine, dt); N.localHurt(w, mine, dt, now); N.localPickups(w, mine);
    mine.fireOn = !!(mine.intent && mine.intent.fire);
    if (now - net.lastC >= 80) { net.lastC = now; N.send({ t: 'c', a: now | 0, s: [Math.round(mine.x * 10), Math.round(mine.y * 10), Math.round(mine.aim * 1000), (mine.fireOn ? FLAG.fire : 0) | (mine.slideT > 0 ? FLAG.slide : 0) | (mine.boatT > 0 ? FLAG.boat : 0) | (mine.state === 'dying' ? FLAG.dying : 0) | (mine.laserOn ? FLAG.laser : 0), Math.max(0, WK.indexOf(mine.wpn)), Math.round(mine.wT * 10), mine.hp, mine.lives, Math.round(mine.face * 100)] }, false); }
    if (now - net.lastE >= 250 && net.q.length) { net.lastE = now; N.send({ t: 'ce', ev: net.q.splice(0, 12) }, true); }
    if (w.phase === 'exit' && !w.exitPicked) { /* host decides on reported positions */ }
  }
  // cosmetic bullets of the others, from snapshot flags
  for (const c of w.cs) if (c.kind === 'mirror' && c.state === 'alive' && c.fireOn && !(c.slideT > 0)) { c.fireCd -= dt; if (c.fireCd <= 0) { c.fireCd = 1 / (MT.WEAPONS[c.wpn] && MT.WEAPONS[c.wpn].rate ? Math.max(3, MT.WEAPONS[c.wpn].rate()) : 9); w.pShots.fire({ x: c.x + Math.cos(c.aim) * 10, y: c.y + Math.sin(c.aim) * 10, z: 14, vx: Math.cos(c.aim) * 330, vy: Math.sin(c.aim) * 330, r: 2.5, life: .9, team: 'p', color: '#ffe066', core: '#fff', dmg: 0, data: { owner: c.slot } }); } c.laserLen = 160; }
  w.pShots.update(dt, w.map); for (const b of w.pShots.list) for (const e of w.enemies) if (!b.dead && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 2) { b.dead = true; w.game.particles.sparks(b.x, b.y, 12, 2); }
  w.pShots.list = w.pShots.list.filter(b => !b.dead);
  w.flash = 0; if (!MT.cfg.skipRigs) w.animate(dt);
  w.updatePickupsClient && 0;
  for (const p of w.pickups) p.t += dt;
  if (w.boss) { w.boss.eyeJ = (w.boss.eyeJ || 0) + dt; w.boss.bob = (w.boss.bob || 0) + dt; w.boss.tick && w.boss.tick(dt); }
  if (w.puddles) { for (const p of w.puddles) p.t -= dt; w.puddles = w.puddles.filter(p => p.t > 0); } for (const d of w.decals) d.t -= dt; w.decals = w.decals.filter(d => d.t > 0);
  for (const e of w.enemies) { e.age += dt; e.t += dt; e.sT = (e.sT || 0) + dt; e.flash = Math.max(0, e.flash - dt); const dur = { wind: .32, fuse: .6, tele: e.kind === 'brute' ? .85 : .7, throw: .45, aim: .45, flare: .4, rear: .5 }[e.state]; e.t2 = dur ? Math.max(0, dur - e.sT) : 0; }
  w.tickRatings && 0;
};
N.applyLatest = function (w, S, now, mine) {
  const net = w.net; // rating / phase / doors / pickups / boss / foe bullets / events
  w.rat.R = S.R / 10; w.rat.X = S.X; w.rat.prime = S.pm / 10; if (MT.run) MT.run.keys = S.k; w.waveI = S.wv;
  const ph = PHASES[S.ph] || w.phase; if (ph !== w.phase) { w.phase = ph; w.phaseT = S.pt / 10; if (ph === 'exit') { w.rm.exits && 0; } }
  ['N', 'E', 'S', 'W'].forEach((k, i) => { const code = (S.dr >> (i * 2)) & 3, d = w.doors[k]; const st = ['closed', 'open', 'exit', 'closing'][code]; if (d.state !== st) { d.state = st; d.t = 0; if (st === 'exit') { d.exit = w.rm.exits && w.rm.exits[k] || null; w.setDoorCells(k, 0); } else if (st === 'closed') w.setDoorCells(k, 2); } if (st === 'exit' && !d.exit) d.exit = w.rm.exits && w.rm.exits[k] || null; });
  // pickups
  const seen = new Set(); w.pickups = [];
  for (const e of S.K) { const id = e[0]; seen.add(id); if (net.claimed.has(id)) continue; let p = net.pk.get(id); const kind = PK[e[1]] || 'bill'; if (!p) { p = { id, kind, t: 0, vx: 0, vy: 0, r: 7 }; net.pk.set(id, p); } p.x = e[2] / 10; p.y = e[3] / 10; p.ttl = e[4] < 0 ? 1e9 : e[4] / 10; p.z = e[6]; if (kind === 'cap') p.w = WK[e[5]]; if (kind === 'prize') { p.prizeIdx = e[5]; p.col = ['red', 'blue', 'gold'][e[7]] || 'red'; } p.pedestal = !!e[8]; if (['bill', 'stack', 'bar', 'case'].includes(kind)) p.cash = true; w.pickups.push(p); }
  for (const id of [...net.pk.keys()]) if (!seen.has(id)) net.pk.delete(id); for (const id of [...net.claimed]) if (!seen.has(id)) net.claimed.delete(id);
  // foe bullets (newest snapshot, drawn at now) and lobs
  const dtS = Math.max(0, (now - S.a) / 1000); w.fShots.list = []; w.lobs = [];
  for (const e of S.B) { const kind = FK[e[1]] || 'orb', x = e[2] / 10 + e[4] * dtS, y = e[3] / 10 + e[5] * dtS;
    if (e.length > 8) { const z = e[6] + e[7] * dtS - 130 * dtS * dtS; w.lobs.push({ id: e[0], kind, x, y, z: Math.max(0, z), vx: e[4], vy: e[5], vz: e[7], tx: e[8], ty: e[9], t: .4 }); }
    else w.fShots.list.push({ id: e[0], kind, x, y, z: e[6], vx: e[4], vy: e[5], r: BRADIUS[kind] || 3, color: ({ orb: '#ff9a3c', shard: '#ffd23a', beam: '#ffe9a0', static: '#d8f0ff', card: '#ff6a9a', coin: '#ffd23a', butter: '#ffe27a', gravy: '#b86a30', tot: '#d8a050', shell: '#ff7a30' })[kind] || '#ff9a3c', core: '#fff', dead: false, spinA: now / 100, near: false }); }
  // events
  for (const ev of S.V) { if (ev[0] <= net.lastSeq) continue; net.lastSeq = ev[0]; const e = { seq: ev[0], name: ev[1], data: ev[2] }; if (e.data.slot === undefined || true) { MT.react.handle(w, e); N.clientFx(w, e); } }
  if (S.G) { const kind = S.G[0]; if (!w.boss && MT.BOSSES[kind]) { w.boss = new MT.BOSSES[kind](w); } if (w.boss) { w.boss.fromNet(S.G); if (w.phase === 'bossIntro' && w.boss.introUpdate) { /* position from net */ } } }
};
N.clientFx = function (w, ev) {
  const d = ev.data, g = w.game, P = g.particles;
  if (ev.name === 'kill') { P.bits(d.x, d.y, 12, d.big ? 22 : 10, ['#ff2e88', '#2ee6ff', '#ffcc33', '#fff']); if (d.big) { P.explosion(d.x, d.y, 10, 1); g.shake(3); } }
  else if (ev.name === 'boom' || ev.name === 'rocketBoom') P.explosion(d.x, d.y, 8, .8);
  else if (ev.name === 'hit') P.sparks(d.x, d.y, 12, 2);
  else if (ev.name === 'bomb') { g.flash('#ffffff', .12, .6); P.ring(d.x, d.y, 8, 190, '#ffffff', .5); }
  else if (ev.name === 'doorSlam') P.dust(184, 120, 2, 3);
  else if (ev.name === 'mimeBlast') { P.explosion(d.x, d.y, 6, .6); const me = w.cs.find(c => c.kind === 'local'); if (me && me.state === 'alive' && Math.hypot(me.x - d.x, me.y - d.y) < 40) w.hurtContestant(me, 1, 'mime', 0, 0); }
  else if (ev.name === 'popperBurst') P.bits(d.x, d.y, 10, 12, ['#ff2e88', '#2ee6ff', '#ffcc33']);
  else if (ev.name === 'death') { const c = w.cs.find(q => q.slot === d.slot); if (c && c.kind === 'mirror') P.bits(c.x, c.y, 10, 24, [c.color, '#fff']); }
};
N.interpolate = function (w, a, b, rt, dt, mine) {
  const net = w.net, u = b.a > a.a ? MT.clamp((rt - a.a) / (b.a - a.a), 0, 1.4) : 1;
  // contestants (others)
  const bm = new Map(); for (const e of b.P) bm.set(e[0], e); const am = new Map(); for (const e of a.P) am.set(e[0], e);
  for (const c of w.cs) {
    const eb = bm.get(c.slot), ea = am.get(c.slot) || eb; if (!eb) continue;
    c.cash = eb[9]; c.kills = eb[11]; c.bombs = eb[10] !== undefined && c.kind === 'mirror' ? eb[10] : c.bombs;
    if (c.kind !== 'mirror') continue;
    const ox = c.x, oy = c.y; c.x = ea[1] / 10 + (eb[1] - ea[1]) / 10 * u; c.y = ea[2] / 10 + (eb[2] - ea[2]) / 10 * u; c.body.x = c.x; c.body.y = c.y; c.vx = (c.x - ox) / (dt || 1); c.vy = (c.y - oy) / (dt || 1); c.aim = eb[3] / 1000; c.face = eb[12] / 100;
    const fl = eb[4]; c.fireOn = !!(fl & FLAG.fire); c.slideT = (fl & FLAG.slide) ? .1 : 0; c.boatT = (fl & FLAG.boat) ? .3 : 0; c.laserOn = !!(fl & FLAG.laser); c.laserA = c.aim; c.laserLen = 160;
    c.state = (fl & FLAG.dying) ? 'dying' : (fl & FLAG.out) ? 'out' : 'alive'; c.down = c.state === 'dying' ? 1 : 0; c.wpn = WK[eb[5]] || 'blaster'; c.wT = eb[6] / 10; c.hp = eb[7]; c.lives = eb[8];
    if (c.state === 'gone') continue;
  }
  // enemies
  const am2 = new Map(); for (const e of a.E) am2.set(e[0], e); const alive = new Set();
  for (const e of b.E) {
    alive.add(e[0]); let m = net.mir.get(e[0]); const kind = KINDS[e[1]] || 'goon', ea = am2.get(e[0]) || e;
    if (!m) { m = { id: e[0], kind, x: 0, y: 0, z: 0, r: ARCH_R(kind), vx: 0, vy: 0, face: 0, state: 'idle', t: 0, t2: 0, flash: 0, alpha: 1, alive: true, hp: 1, max: 1, hpPct: 1, seed: ((e[0] * 7919) % 1000) / 1000, age: 0, kb: [0, 0], entering: false, sT: 0 }; net.mir.set(e[0], m); m.x = e[2] / 10; m.y = e[3] / 10; }
    const nx = ea[2] / 10 + (e[2] - ea[2]) / 10 * u, ny = ea[3] / 10 + (e[3] - ea[3]) / 10 * u; m.vx = (nx - m.x) / (dt || 1); m.vy = (ny - m.y) / (dt || 1); m.x = nx; m.y = ny; m.face = e[4] / 100;
    const st = STATES[e[5]] || 'idle'; if (st !== m.state) { m.state = st; m.sT = 0; } const pct = e[6] / 100; if (pct < m.hpPct - .01) m.flash = .09; m.hpPct = pct;
    m.carryKey = !!(e[7] & 1); m.big = !!(e[7] & 2); m.hidden = !!(e[7] & 4); m.vulnerable = !!(e[7] & 8); if (kind === 'tank') m.turret = e[8] / 100; else if (kind === 'segment') m.idx = e[8]; else if (kind === 'disco') m.spin = e[8] / 100; if (kind === 'discoBig') m.big = true; m.body = m.body || { x: m.x, y: m.y };
    if (kind === 'tank') m.body_a = m.face;
  }
  for (const id of [...net.mir.keys()]) if (!alive.has(id)) net.mir.delete(id);
  w.enemies = [...net.mir.values()];
};
N.localHurt = function (w, c, dt, now) {
  if (c.state !== 'alive' || c.invuln > 0) return;
  for (const b of w.fShots.list) { if (Math.hypot(b.x - c.x, b.y - c.y) < b.r + 4.5) { b.dead = true; w.hurtContestant(c, 1, b.kind, b.id, Math.atan2(b.vy || 0, b.vx || 0)); if (c.invuln > 0) return; } }
  for (const e of w.enemies) { const A = MT.ENEMIES[e.kind]; if (A && A.contact && !e.hidden && Math.hypot(e.x - c.x, e.y - c.y) < e.r + c.r * .75) { w.hurtContestant(c, Math.max(1, A.contact), 'contact', e.id, MT.angTo(e, c)); return; } }
  for (const l of w.lobs) if (l.z <= 2 && l.kind === 'tomato' && Math.hypot(l.x - c.x, l.y - c.y) < 14) { w.hurtContestant(c, 1, 'tomato', l.id, 0); return; }
  if (w.boss && w.boss.contactR) { const b = w.boss; if (Math.hypot(b.x - c.x, b.y - c.y) < b.contactR + c.r * .7 && b.sub !== 'tele') w.hurtContestant(c, b.contactDmg || 1, 'boss', 0, MT.angTo(b, c)); }
};
N.localPickups = function (w, c) {
  if (c.state !== 'alive' && c.state !== 'walkin') return; const net = w.net;
  for (const p of w.pickups) { if (net.claimed.has(p.id) || p.caged) continue; if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r && p.z < 14) {
    net.claimed.add(p.id); net.q.push(['claim', p.id]);
    if (p.kind === 'cap') { w.giveWeapon(c, p.w); w.event('capsule', { slot: c.slot, w: p.w, x: p.x, y: p.y }); }
    else if (p.kind === 'bomb') { if (c.bombs < 3) c.bombs++; w.event('pickup', { slot: c.slot, kind: 'bomb' }); }
    else if (p.kind === 'life') w.event('life', { slot: c.slot });
    else { w.event('cash', { slot: c.slot, amt: { bill: 100, stack: 500, bar: 1000, case: 5000, prize: 1500, key: 0 }[p.kind] || 0, x: p.x, y: p.y }); if (p.kind === 'key') w.event('key', { slot: c.slot, n: 0, bonus: true }); }
  } }
  w.pickups = w.pickups.filter(p => !net.claimed.has(p.id));
};
// the client's mirror step
WP.mirrorStep = function (dt) { /* the client's step is driven by MT.net.update (clientStep) */ };

// ===== 60-play.js =====
// MASH TV: the run, the flow between scenes, and the play scene.
MT.cheats = { god: false, infBombs: false, oneHit: false, freezeEnemies: false, noclip: false, autopilot: false, botPartner: false, muteChatter: false };
MT.ov = { cur: null, freeze: true };   // dev panel and other overlays
MT.openOverlay = function (o) { MT.ov.cur = o; MT.overlay.open = 1; };
MT.closeOverlay = function () { MT.ov.cur = null; MT.overlay.open = 0; };
MT.devBadge = () => !!(MT.run && MT.run.mode !== 'session' && (MT.tuneTouched() || Object.values(MT.cheats).some(Boolean) || MT.run.devTouched));

// ---- the run ----------------------------------------------------------------------------------------------------------
MT.newRun = function (o = {}) {
  const game = MT.game;
  const run = MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed: o.seed || (Date.now() % 100000) + 1, ep: o.ep || 1, roomId: null, path: [], keys: 0, seenEnemies: {}, prizeBag: null, cs: [], devTouched: false, startT: game.time, epStart: {}, lastEntry: 'S' };
  MT.seedAll(run.seed); MT.hud.reset && MT.hud.reset();
  const slots = o.players || [{ slot: 0, look: 0 }];
  for (const p of slots) {
    const c = MT.newContestant(p.slot, { look: p.look === undefined ? p.slot : p.look, input: p.input || game.players[p.slot] || null, kind: p.kind || 'local', name: p.name });
    if (p.bot) c.kind = 'bot';
    c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c);
  }
  return run;
};
MT.flow = {
  startEpisode(ep) { const run = MT.run; run.ep = ep; run.epStart = {}; for (const c of run.cs) run.epStart[c.slot] = c.cash; run.keysAtEpStart = run.keys; run.prizeBag = null; MT.game.go('episodeCard', { ep }); },
  enterRoom(id, entry) { MT.run.lastEntry = entry; MT.game.go('play', { room: id, entry }, { fade: 'dissolve', seconds: .35 }); },
  afterEpisodeCard(ep) { MT.flow.enterRoom(MT.EPISODES[ep].start, 'S'); },
  afterBoss() { const run = MT.run; if (run.mode === 'session') return; MT.game.go('recap', { ep: run.ep }); },
  afterRecap(ep) {
    const run = MT.run;
    if (ep < 3) { MT.flow.startEpisode(ep + 1); return; }
    if (run.keys >= MT.KEYS_NEEDED && run.mode !== 'rehearsal') { run.green = true; MT.flow.enterRoom('GR', 'S'); }
    else MT.game.go('ending', { which: 'A' });
  },
  afterEnding() { MT.flow.finishRun('win'); },
  finishRun(how) {
    const run = MT.run; if (!run) { MT.game.go('title'); return; }
    if (run.mode === 'rehearsal' || run.mode === 'attract' || run.mode === 'test' || MT.devBadge()) { MT.game.go('scores', { fresh: false }); return; }
    const q = run.cs.filter(c => MT.cab.qualifies(c.cash, 'show')); MT.game.go('initials', { list: q.map(c => c.slot), how });
  },
  gameOver() { MT.game.go('gameover', {}); }
};
MT.unlock = ep => { const u = MT.sget('mashtv:unlocked', 1); if (ep > u) MT.sset('mashtv:unlocked', ep); };

// ---- the play scene -------------------------------------------------------------------------------------------------------
const play = MT.scenes = MT.scenes || {};
play.play = {
  pausable: true, camera: { zoom: false }, input: MT.PLAY,
  enter(d) {
    const game = MT.game, run = MT.run || (MT.newRun({ mode: 'test' })); const rm = MT.ROOMS[d.room]; if (!rm) throw new Error('no room ' + d.room);
    this.d = d; run.roomId = d.room; if (!run.path.includes(d.room)) run.path.push(d.room); if (run.mode === 'arcade' || run.mode === 'rehearsal') { if (rm.ep) MT.unlock(rm.ep); }
    this.session = run.mode === 'session'; this.pausable = !this.session; this.cont = null; this.over = false; this.leaving = false; this.sceneT = 0;
    for (const c of run.cs) { c.rig = c.rig || null; if (c.state === 'gone') continue; if (c.state === 'out') c.state = 'out'; else c.state = 'alive'; }
    const w = this.w = new MT.World({ room: rm, contestants: run.cs, entry: d.entry || 'S', session: this.session, demo: run.mode === 'attract', mode: d.netMode || 'solo', R: d.R });
    MT.worldNow = w; w.onExit = (dir, dest) => this.exitRoom(dir, dest); w.onBossDone = () => this.bossDone(); w.onAllOut = () => this.allOut();
    w.onDone = () => this.greenDone();
    game.lights.enabled = true; game.lights.ambient = MT.SETS[w.set].ambient; game.timeScale = MT.T.timeScale;
    game.cam.bounds = v => w.map.bounds(v); game.focus(MT.CX, MT.CY, 0); this._z = 0;
    const ep = MT.EPISODES[rm.ep]; const song = rm.boss ? 'bossShowdown' : rm.green ? 'recap' : ep ? ep.song : 'studioBattle'; MT.music.play(song, { fade: .5 }); MT.music._i = null;
    MT.hud.cursorOn(false); MT.lines.clear();
    if (!this.session && run.mode !== 'attract') game.allowJoin({ max: 4, keys: false, onJoin: (input, n) => this.dropIn(input, n) }); else game.allowJoin(false);
    if (MT.net && w.session) MT.net.onWorld(w, this);
    this.bossLines = false; this.robotLines = false;
    MT.emit('roomEnter', w);
  },
  exit() { MT.hud.cursorOn(true); MT.worldNow = null; if (MT.net && MT.net.onWorldExit) MT.net.onWorldExit(); MT.closeOverlay(); this.w = null; MT.music._i = null; },
  dropIn(input, n) {
    const run = MT.run, w = this.w; if (!w || run.cs.find(c => c.input === input)) return;
    const slot = [0, 1, 2, 3].find(s => !run.cs.some(c => c.slot === s)); if (slot === undefined) return;
    const c = MT.newContestant(slot, { look: slot, input }); c.nextLife = MT.EXTRA_LIVES[0]; run.cs.push(c); c.state = 'alive'; w.respawn(c); c.hp = c.maxHp; if (w.cs !== run.cs) w.cs.push(c);
  },
  update(dt) {
    const w = this.w, game = MT.game; if (!w) return; this.sceneT += dt; MT.audioTick();
    MT.hud.update(dt);
    // overlays (dev panel etc.)
    const ov = MT.ov.cur; if (ov) { ov.update(dt); }
    this.pausable = !this.session && !ov;
    let dtw = dt; if (ov && MT.ov.freeze && !(ov.stepOnce)) dtw = 0; if (ov && ov.stepOnce) { dtw = 1 / 30; ov.stepOnce = false; }
    if (this.cont) { MT.cab.update(dt); if (MT.cab.continuing) { dtw = 0; } }
    if (this.session && MT.net) { MT.net.update(w, dt, this); }
    else {
      if (w.phase === 'bossIntro' && !this.bossLines) { this.bossLines = true; this.startBossIntro(); }
      w.step(dtw);
    }
    if (w.phase === 'bossIntro' && (MT.game.players.some(p => p.pressed('confirm'))) && !this.session) MT.lines.skip();
    if (w.boss && !this.deadLine && w.phase === 'bossDeath') { this.deadLine = true; const k = w.boss.kind, T = MT.TEXT.boss[k]; if (k === 'lance') { for (const [s, t] of T.dead) MT.lines.say(s, t, { prio: 3, force: true }); } else MT.lines.say('LANCE', T.dead, { prio: 3, force: true }); }
    if (w.boss && w.boss.kind === 'lance') {
      if (w.boss.sub === 'crash' && !this.robotLines) { this.robotLines = true; for (const [s, t] of MT.TEXT.boss.lance.robot) MT.lines.say(s, t, { prio: 3, force: true }); }
      if (w.boss.stage === 'network' && !this.netLines) { this.netLines = true; MT.music.layer('phase2', 1, 1); for (const [s, t] of MT.TEXT.boss.lance.network) MT.lines.say(s, t, { prio: 3, force: true }); }
    }
    if (w.boss && w.boss.phase >= 2) MT.music.layer('phase2', 1, 1);
    game.focus(MT.CX, MT.CY, 0);
    const ex = w.rm.boss && w.rm.boss !== 'mashy' ? 46 : w.rm.boss ? 22 : 6; const z = MT.fitZoom(game, w.map, ex); if (Math.abs(z - this._z) > .002) { this._z = z; game.setZoom(z); } game.cam.offset = [0, Math.round(ex / 2)];
    MT.music.intense(w.alive() >= 30 && !w.boss);
    if (this.w && w.cheats !== MT.cheats) w.cheats = MT.cheats;
    if (!this.session && game.settings.camView === 'Overhead' && game.view.id !== 'topdown') game.setView('topdown'); else if (!this.session && game.settings.camView !== 'Overhead' && game.view.id !== 'threequarter') game.setView('threequarter');
    // tutorials (arcade first room)
    if (w.rm.tutorial && w.phase === 'waves') this.tutorials(w);
    if (w.cs.some(c => c.intent && c.intent.aimSrc === 'mouse')) MT.hud.cursorOn(true && false);
    const mouseAim = w.cs[0] && w.cs[0].intent && w.cs[0].intent.aimSrc === 'mouse' && w.cs[0].state === 'alive'; MT.hud.cursorOn(!mouseAim && !!MT.ov.cur);
  },
  tutorials(w) {
    const H = MT.hud, T = MT.TEXT.tut;
    if (w.waveI === 0) { H.tutorial('move', 'move', T.move, 4); H.tutorial('aim', 'aim', T.aim, 4); }
    if (w.pickups.some(p => p.kind === 'cap')) H.tutorial('cap', null, T.cap, 4);
    if (w.waveI >= 2) H.tutorial('boat', 'showboat', T.boat, 4);
    if (w.waveI >= 3) H.tutorial('slide', 'slide', T.slide, 4);
    if (w.alive() >= 20) H.tutorial('bomb', 'bomb', T.bomb, 4);
  },
  startBossIntro() {
    const w = this.w, k = w.boss.kind, list = MT.TEXT.boss[k].intro, game = MT.game;
    game.script(function* () { for (const [s, t] of list) { const h = MT.lines.cut(s, t); yield E.until(() => h.done); } w.bossIntroDone = true; });
    MT.music.play('bossShowdown'); w.bossIntroLock = true; game.after(1.2, () => { if (w) w.bossIntroLock = false; });
  },
  exitRoom(dir, dest) {
    if (this.leaving) return; this.leaving = true; const run = MT.run;
    if (this.session) { MT.net.exitRoom(this.w, dir, dest); return; }
    MT.game.go('mapcard', { from: this.w.rm.id, to: dest, dir, ep: this.w.rm.ep }, { fade: 'dissolve', seconds: .4 });
  },
  bossDone() {
    if (this.over) return; this.over = true;
    if (this.session) { MT.net.bossDone(this.w); return; }
    const run = MT.run; if (run.mode === 'arcade' || run.mode === 'rehearsal') MT.unlock(Math.min(3, run.ep + 1));
    MT.game.after(1.2, () => { if (run.mode === 'test' && MT.test && MT.test.noFlow) return; MT.flow.afterBoss(); });
  },
  greenDone() { if (this.over) return; this.over = true; MT.game.after(1.2, () => MT.game.go('ending', { which: 'B' })); },
  allOut() {
    const w = this.w, run = MT.run; if (this.session || this.cont) return;
    if (run.mode === 'attract') { return; }
    this.cont = true; MT.lines.say('LANCE', MT.TEXT.cont, { prio: 3, force: true });
    MT.cab.continue(10, ok => { this.cont = null; if (ok) this.continueRun(); else MT.flow.gameOver(); });
  },
  continueRun() {
    const w = this.w, run = MT.run, d = MT.DIFF[run.diff]; w.allOutFired = false;
    for (const c of run.cs) { c.lives = MT.T.startLives || d.lives; c.cash = Math.floor(c.cash / 2); c.continues++; c.hp = c.maxHp; if (c.state === 'out') w.respawn(c); }
    MT.hud.banner('THE NETWORK TAKES ITS CUT!', '#ff3344', 2);
  },
  draw(r) {
    const w = this.w, game = MT.game; if (!w) return;
    w.draw(r);
    MT.hud.draw(r, w, this);
    if (this.cont) MT.cab.draw(r);
    if (MT.ov.cur) MT.ov.cur.draw(r);
    if (this.session && MT.net) MT.net.drawOverlay(r, w);
  }
};

// ===== 90-main.js =====
// MASH TV: boot. Creates the game, registers scenes and settings, handles deep links and the debug handle.
(function boot() {
  const win = typeof window !== 'undefined' ? window : globalThis;
  const hub = win.AIHub, inSession = !!(hub && hub.active);
  MT.inSession = inSession;
  MT.loadTunes();
  const hash = (typeof location !== 'undefined' && location.hash) ? location.hash.slice(1) : '';
  const opts = {}; hash.split('&').forEach(p => { const [k, v] = p.split('='); if (k) opts[k] = v === undefined ? true : v; });
  MT.hashOpts = opts;
  const game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MT.MENU, id: 'mashtv', headless: typeof document === 'undefined' ? true : undefined,
    corner: !inSession, autoPause: !inSession, backGesture: !inSession, fullscreen: inSession ? 'button' : undefined,
    menu: {
      items: inSession ? [] : [['Dev mode', () => MT.openDev && MT.openDev()], ['Episode map', () => MT.openMapOverlay && MT.openMapOverlay()], ['How to play', () => MT.openHowtoOverlay && MT.openHowtoOverlay()]],
      settings: [
        { key: 'aimAssist', label: 'Aim assist (controller)', value: true, help: 'Nudges the right stick toward enemies close to your aim' },
        { key: 'autoFire', label: 'Auto-fire with the right stick', value: true },
        { key: 'camView', label: 'Camera', options: ['Studio', 'Overhead'], value: 'Studio', help: 'Studio is the three-quarter camera; Overhead is straight down' },
        { key: 'subtitles', label: 'Subtitles', value: true },
        { key: 'chatter', label: 'Host chatter', options: ['Normal', 'Less', 'Off'], value: 'Normal' },
        { key: 'confetti', label: 'Confetti amount', options: ['Party', 'Tasteful'], value: 'Party' }],
      controls: MT.CONTROL_NAMES, quit: inSession ? false : 'title' }
  });
  MT.game = game; win.MT.game = game;
  try { MT.shell = new E.Shell(game, { theme: { ink: '#fff7e8', paper: 'rgba(20,8,34,.94)', accent: '#ffcc33', danger: '#ff4d6d', line: 'rgba(255,204,51,.35)', titleFont: 'Impact, "Arial Black", system-ui' } }); } catch (e) { game.fail && game.fail('shell theme', e); }
  MT.installInputHook(game); MT.idle.hook();
  MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10 });
  game.input.touchEnabled = false;
  const scenes = {};
  for (const k in MT.scenes) { const s = Object.assign({ touch: [] }, MT.scenes[k]); scenes[k] = s; }
  if (MT.net && MT.net.scenes) for (const k in MT.net.scenes) scenes[k] = Object.assign({ touch: [] }, MT.net.scenes[k]);
  if (MT.attract && MT.attract.scene) scenes.attract = Object.assign({ touch: [] }, MT.attract.scene);
  MT.sceneTable = scenes;
  // debug handle
  game.debug = {
    snapshot() {
      const w = MT.worldNow, run = MT.run; const byKind = {}; if (w) for (const e of w.enemies) if (e.alive) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: w && w.rm && w.rm.id, phase: w && w.phase, wave: w && w.waveI, alive: w ? w.alive() : 0, byKind, bullets: w ? w.fShots.list.length : 0, pickups: w ? w.pickups.length : 0,
        R: w && w.rat.R, X: w && w.rat.X, keys: run && run.keys, prime: w && w.rat.prime,
        players: w ? w.cs.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.wpn, state: c.state, bombs: c.bombs, kills: c.kills })) : [],
        boss: w && w.boss ? { kind: w.boss.kind, phase: w.boss.phase, sub: w.boss.sub, stage: w.boss.stage, parts: w.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) } : null, errors: game.errors.length };
    },
    warp(target, o) { return MT.warp(target, o); }, spawn(kind, n, where) { return MT.devSpawn && MT.devSpawn(kind, n, where); }, give(kind, slot) { const w = MT.worldNow; if (w) w.giveWeapon(w.cs[slot || 0], kind); },
    cheat(name, on) { MT.cheats[name] = on === undefined ? true : on; }, tune(k, v) { MT.setTune(k, v); }, resetTunes() { MT.resetTunes(); },
    killAll() { const w = MT.worldNow; if (w) for (const e of w.enemies) if (e.alive) w.killEnemy(e, { slot: 0 }); }, clearRoom() { const w = MT.worldNow; if (w) { for (const e of w.enemies) if (e.alive) { e.noCash = true; w.killEnemy(e, null); } for (const d of Object.values(w.doors)) d.queue.length = 0; w.spawnQ.length = 0; w.wavesDone = true; w.waveI = (w.rm.waves || []).length; } },
    chooseExit(dir) { const w = MT.worldNow; if (w) { w.exitPicked = dir; w.exitT = .01; } }, teleport(slot, x, y) { const w = MT.worldNow; const c = w && w.cs[slot]; if (c) { c.x = c.body.x = x; c.y = c.body.y = y; } },
    bot(slot, o) { const w = MT.worldNow; const c = w && w.cs[slot]; if (c) { c.kind = 'bot'; c.botOpts = o || {}; } }, addBot(look) { return MT.addBot && MT.addBot(look); },
    netFake(h) { win.AIHub = h; MT.hubOverride = h; }, seed(n) { MT.seedAll(n); }, stateHash() { return MT.stateHash(); }
  };
  game.stateHash = () => game.debug.stateHash();
  MT.stateHash = function () { const w = MT.worldNow; if (!w) return 0; let h = 2166136261; const mix = v => { h ^= Math.round(v * 100) | 0; h = Math.imul(h, 16777619); }; for (const c of w.cs) { mix(c.x); mix(c.y); mix(c.hp); mix(c.cash); } for (const e of w.enemies) { mix(e.x); mix(e.y); mix(e.hp); } mix(w.rat.R); mix(w.time); return h >>> 0; };
  // warp (deep links, dev mode, tests)
  MT.warp = function (target, o = {}) {
    const ROOM = MT.ROOMS[target]; const players = []; const n = o.players || 1;
    const mkRun = (extra) => { const slots = []; for (let i = 0; i < n; i++) slots.push({ slot: i, look: i, bot: o.bot, input: i === 0 ? game.input : game.players[i] || null }); const run = MT.newRun(Object.assign({ mode: o.mode || 'test', diff: o.diff || 'CONTESTANT', players: slots, seed: o.seed || MT.seed }, extra)); if (o.keys) run.keys = o.keys; return run; };
    if (ROOM) { mkRun({ ep: ROOM.ep }); if (o.god) MT.cheats.god = true; for (const c of MT.run.cs) { if (o.lives) c.lives = o.lives; if (o.bot) c.kind = 'bot'; } game.go('play', { room: target, entry: o.entry || 'S' }, { fade: 0 }); return true; }
    const T = { title: () => game.go('title'), lobby: () => game.go('lobby', { diff: 'CONTESTANT' }), howto: () => game.go('howto'), scores: () => game.go('scores', {}), about: () => game.go('about'), attract: () => game.go('attract'), episodes: () => game.go('episodes'), difficulty: () => game.go('difficulty'),
      coldopen: () => { mkRun({}); game.go('coldOpen'); }, ep1: () => { mkRun({ ep: 1 }); game.go('episodeCard', { ep: 1 }); }, ep2: () => { mkRun({ ep: 2 }); game.go('episodeCard', { ep: 2 }); }, ep3: () => { mkRun({ ep: 3 }); game.go('episodeCard', { ep: 3 }); },
      recap1: () => { fakeRecap(1); }, recap2: () => { fakeRecap(2); }, recap3: () => { fakeRecap(3); }, gameover: () => { mkRun({}); game.go('gameover'); }, initials: () => { const r = mkRun({}); r.cs[0].cash = 123456; game.go('initials', { list: [0] }); },
      endinga: () => { mkRun({}); game.go('ending', { which: 'A' }); }, endingb: () => { mkRun({}); game.go('ending', { which: 'B' }); }, credits: () => { mkRun({}); game.go('credits', { which: 'A' }); },
      greenroom: () => { const r = mkRun({ ep: 3 }); r.keys = 6; game.go('play', { room: 'GR', entry: 'S' }, { fade: 0 }); }, card: () => { MT.net && MT.net.previewCard && MT.net.previewCard(); }, lightning: () => { MT.net && MT.net.previewLightning && MT.net.previewLightning(o); } };
    const fakeRecap = ep => { const r = mkRun({ ep }); r.cs.forEach((c, i) => { c.cash = 80000 + i * 20000; r.epStart[c.slot] = 0; for (const p of MT.EPISODES[ep].prizes.slice(0, 3 + i)) c.prizes.push({ name: p.name, value: p.value, joke: p.joke, ep }); }); game.go('recap', { ep }); };
    if (T[target]) { T[target](); return true; }
    return false;
  };
  const boot = { title: 'MASH TV', version: MT.VERSION, steps: [['Warming up the spotlights', () => { for (const k in MT.SETS) MT.SETS[k].floorTex(100, 100); }], ['Tuning the laugh track', () => { for (const k in MT.SONGS) MT.SONGS[k].tracks.length; }]], messages: ['Polishing the jumbotron', 'Teaching the goons to clap'] };
  game.start({ scenes, scene: 'title', boot });
  if (inSession && MT.net) MT.net.begin(game);
  else if (opts.room || opts.boss || opts.dev || opts.card || opts.lightning || Object.keys(opts).length) {
    const o = { seed: opts.seed ? +opts.seed : undefined, players: opts.players ? +opts.players : 1, bot: opts.bot ? true : false, god: !!opts.god };
    game.booted && game.booted.then ? game.booted.then(() => deep(o)) : deep(o);
  }
  function deep(o) {
    const key = ['room', 'boss', 'dev', 'card', 'lightning', 'greenroom', 'recap', 'ending', 'gameover', 'initials', 'credits', 'attract', 'title', 'lobby', 'howto', 'scores', 'about', 'continue', 'ep', 'coldopen'].find(k => k in opts); if (!key) return;
    let target = key;
    if (key === 'room') target = opts.room; else if (key === 'boss') target = ['1-B', '2-B', '3-B'][+opts.boss - 1]; else if (key === 'dev') { target = '1-1'; } else if (key === 'recap') target = 'recap' + opts.recap; else if (key === 'ending') target = 'ending' + opts.ending; else if (key === 'ep') target = 'ep' + opts.ep;
    MT.warp(target, o);
    if (key === 'dev') setTimeout(() => MT.openDev && MT.openDev(), 1200);
    if (key === 'continue') { MT.warp('1-1', o); setTimeout(() => { const s = game.scene; if (s && s.w) { for (const c of MT.run.cs) { c.lives = 0; c.state = 'out'; } if (s.allOut) s.allOut(); } }, 1500); }
  }
  MT.booted = true;
})();
})();
