
// ===== 00-core.js
// MASH TV — core: the namespace, constants, seeded random streams, the tuning registry and the event bus.
// Every file in src/ is a fragment of one IIFE: this one opens it, 90-main.js closes it.
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const MT = {};
(typeof window !== 'undefined' ? window : globalThis).MT = MT;
MT.E = E;
MT.VERSION = '1.0.0';
MT.cfg = { skipRigs: false };

// ---------------------------------------------------------------- arena geometry (world units; a tile is 16)
const T16 = 16;
const AR = MT.AR = {
  cols: 23, rows: 15, W: 368, H: 240, cx: 184, cy: 120,
  x0: 16, y0: 16, x1: 352, y1: 224,                                   // the interior
  doors: { N: { x: 184, y: 8, nx: 0, ny: 1 }, S: { x: 184, y: 232, nx: 0, ny: -1 }, W: { x: 8, y: 120, nx: 1, ny: 0 }, E: { x: 360, y: 120, nx: -1, ny: 0 } },
  doorCells: { N: [[10, 0], [11, 0], [12, 0]], S: [[10, 14], [11, 14], [12, 14]], W: [[0, 6], [0, 7], [0, 8]], E: [[22, 6], [22, 7], [22, 8]] },
  opposite: { N: 'S', S: 'N', E: 'W', W: 'E' }
};
MT.cell = (cx, cy) => [24 + cx * T16, 24 + cy * T16];                  // interior cell -> world point
MT.toCell = (x, y) => [Math.round((x - 24) / T16), Math.round((y - 24) / T16)];
MT.inInterior = (x, y, m = 0) => x >= AR.x0 + m && x <= AR.x1 - m && y >= AR.y0 + m && y <= AR.y1 - m;
MT.clampInterior = (o, m = 6) => { o.x = clamp(o.x, AR.x0 + m, AR.x1 - m); o.y = clamp(o.y, AR.y0 + m, AR.y1 - m); };

// ---------------------------------------------------------------- random streams (gameplay only from these)
MT.rng = {};
MT.seed = function (s) {
  s = (s >>> 0) || 1; MT.rng.seed = s;
  for (const [k, o] of [['spawn', 11], ['drops', 23], ['ai', 37], ['fx', 51], ['prize', 71]]) MT.rng[k] = E.rng((s * 2654435761 + o) >>> 0);
};
MT.seed(1);
MT.R = (k = 'ai') => MT.rng[k]();
MT.Rr = (a, b, k = 'ai') => a + (b - a) * MT.rng[k]();
MT.Ri = (a, b, k = 'ai') => Math.floor(a + (b - a + 1) * MT.rng[k]());
MT.Rpick = (list, k = 'ai') => list[Math.floor(MT.rng[k]() * list.length) % list.length];
MT.chance = (p, k = 'drops') => MT.rng[k]() < p;
MT.shuffle = (list, k = 'prize') => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(MT.rng[k]() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
MT.fxr = () => Math.random();                                           // cosmetics only

// ---------------------------------------------------------------- the tuning registry: every balance number lives here
// [key, label, default, min, max, step, group]
MT.TDEF = [
  ['playerSpeed', 'Player speed', 95, 50, 160, 5, 'PLAYER'],
  ['fireRate', 'Blaster shots per second', 9, 3, 20, 1, 'PLAYER'],
  ['bulletSpeed', 'Player bullet speed', 330, 150, 600, 10, 'PLAYER'],
  ['dmgMul', 'Player damage x', 1, .25, 4, .25, 'PLAYER'],
  ['slideSpeed', 'Slide speed', 235, 120, 400, 5, 'PLAYER'],
  ['slideCooldown', 'Slide cooldown (s)', .85, .2, 3, .05, 'PLAYER'],
  ['invulnTime', 'Invulnerable after a hit (s)', 1.2, .2, 3, .1, 'PLAYER'],
  ['hpPerLife', 'HP per life (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['startLives', 'Starting lives (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['puDuration', 'Power-up duration x', 1, .25, 3, .25, 'PLAYER'],
  ['enemySpeed', 'Enemy speed x', 1, .25, 2.5, .05, 'ENEMIES'],
  ['enemyHp', 'Enemy HP x', 1, .25, 4, .25, 'ENEMIES'],
  ['enemyBulletSpeed', 'Enemy bullet speed x', 1, .25, 2.5, .05, 'ENEMIES'],
  ['contactDmg', 'Contact damage', 1, 0, 3, 1, 'ENEMIES'],
  ['waveSize', 'Wave size x', 1, .25, 3, .05, 'ENEMIES'],
  ['spawnGap', 'Spawn gap x', 1, .25, 3, .05, 'ENEMIES'],
  ['bossHp', 'Boss HP x', 1, .1, 4, .1, 'ENEMIES'],
  ['dropMul', 'Drop chance x', 1, 0, 5, .25, 'ECONOMY'],
  ['cashMul', 'Cash x', 1, .25, 5, .25, 'ECONOMY'],
  ['ratingsGain', 'Ratings gain x', 1, 0, 5, .25, 'SHOW'],
  ['ratingsDecay', 'Ratings decay per second', 2.5, 0, 10, .5, 'SHOW'],
  ['primeTime', 'Prime Time length (s)', 12, 3, 30, 1, 'SHOW'],
  ['camZoom', 'Camera zoom x', 1, .6, 1.6, .05, 'CAMERA & TIME'],
  ['shakeMul', 'Screen shake x', 1, 0, 2, .1, 'CAMERA & TIME'],
  ['timeScale', 'Game speed', 1, .1, 3, .05, 'CAMERA & TIME']
];
MT.T = {};
MT.TDEFAULT = {};
for (const d of MT.TDEF) { MT.T[d[0]] = d[2]; MT.TDEFAULT[d[0]] = d[2]; }
MT.tdef = k => MT.TDEF.find(d => d[0] === k);
MT.setTune = (k, v, save = true) => {
  const d = MT.tdef(k); if (!d) return;
  v = clamp(Math.round(v / d[5]) * d[5], d[3], d[4]); v = Math.round(v * 1000) / 1000;
  MT.T[k] = v; if (save) MT.saveTunes();
  if (k === 'timeScale' && MT.game && MT.run && MT.run.mode !== 'session') MT.game.timeScale = v;
};
MT.resetTunes = (k) => { for (const d of MT.TDEF) if (!k || d[0] === k) MT.T[d[0]] = d[2]; MT.saveTunes(); if (MT.game) MT.game.timeScale = MT.T.timeScale; };
MT.tunesChanged = () => MT.TDEF.filter(d => MT.T[d[0]] !== d[2]);
MT._mem = {};
MT.store = { get(k, d) { try { const v = E.store.get(k, undefined); if (v !== undefined && v !== null) return v; } catch (e) { /* blocked */ } return k in MT._mem ? MT._mem[k] : d; }, set(k, v) { MT._mem[k] = JSON.parse(JSON.stringify(v)); try { E.store.set(k, v); } catch (e) { /* kept for the visit */ } } };
MT.saveTunes = () => MT.store.set('mashtv:tuning', MT.T);
MT.loadTunes = () => { try { const s = MT.store.get('mashtv:tuning', null); if (s) for (const d of MT.TDEF) if (typeof s[d[0]] === 'number') MT.T[d[0]] = clamp(s[d[0]], d[3], d[4]); } catch (e) { /* ignore */ } };

// ---------------------------------------------------------------- cheats (dev mode)
MT.CHEATS = { god: false, infBombs: false, oneHit: false, freeze: false, noclip: false, autopilot: false, botPartner: false, muteHost: false };
MT.devActive = () => MT.tunesChanged().length > 0 || Object.values(MT.CHEATS).some(Boolean);

// ---------------------------------------------------------------- the event bus
const BUS = {};
MT.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => { BUS[ev] = BUS[ev].filter(f => f !== fn); }; };
MT.emit = (ev, data) => { const L = BUS[ev]; if (L) for (const f of L.slice()) { try { f(data); } catch (e) { if (MT.game) MT.game.fail('event ' + ev, e); else throw e; } } };

// ---------------------------------------------------------------- small helpers
MT.money = n => '$' + Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
MT.d2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
MT.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
MT.ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
MT.angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
MT.approachAng = (a, b, step) => { const d = MT.angDiff(a, b); return Math.abs(d) <= step ? b : a + Math.sign(d) * step; };
MT.ease = E.ease;
MT.fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
MT.safeName = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .!?\-']/g, '?').slice(0, 12);
let _ids = 1;
MT.nid = () => _ids++;
MT.resetIds = () => { _ids = 1; };
MT.COLORS = { p: ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'], magenta: '#ff2e88', cyan: '#2ee6ff', gold: '#ffcc33', chrome: '#c8d0e0', tally: '#ff3344', shadow: '#140a24', shadow2: '#2a1446', ink: '#fff7e8', foe: '#ff9a3c', foeCore: '#fff2a0' };

MT.ABOUT = {"sourceInformation":{"date":"2026-11-04 05:02:59","source":"Smash TV (Williams Electronics arcade game, 1990)","plan":"PLAN.md","genre":"Twin-stick arena shooter (arcade), 1-4 player co-op","perspective":"Fixed single-screen arena from a high three-quarter studio camera (threequarter view, pitch 55); Overhead (topdown) as a Settings option","tech":"my-3D2dge handoff v0.85.2 (commit 4390a98, full edition with the arcade module) with 4 small patches; AI Hub session client aihub-session 1.4.0; plain JavaScript in one IIFE; Node 24.22.1 and Playwright 1.63.0 for tests","artDirection":"The engine's native PS1-style pixel look (320x240 expanded, HD Humanoid rigs, textured TileMap, canvas lighting) dressed as a retro-future TV studio: neon, chrome, marquee bulbs, sponsor logos, confetti, spotlights and a jumbotron","animation":"The engine's procedural rig system (Humanoid and Blob, E.MOVES attacks, poses, flips, landings) plus new motion: the mime's trapped-in-a-box joint post-process, cable drops, boss part tweens, wheel spin easing, TV channel flips","audio":"All synthesized in code: 8 original songs in the engine's notation with layers and 14 stings, about 70 custom sound effects, and Animalese/Simlish Babble voices from a small formant synth for the host, co-host, announcer, bosses, contestants and the crowd","online":"AI Hub Session Protocol v1, shared-world mode, 1-4 players (the Lightning Round); local co-op 1-4 on one screen","testing":"One command (npm test) runs 20 suites: 18 headless Node suites driving game.advance and game.debug (including room-sweep over all 26 rooms and a scripted playthrough of the whole game) plus 2 Playwright suites: the deliverable over file:// at 1280x720, 1920x1080 and a touch phone, and the AI Hub harness 4 times (2 players; 4 players at 150 ms +-50 ms with 5% loss; host leaving; a server copy) on an in-process 127.0.0.1 server on an OS-picked port. Screenshots only for looks. Finally a full run of the whole game in Chromium driven only by real keyboard and mouse events (no bots in control, no cheats): title to the Season Finale and Ending A (13.6 min), then again collecting the keys: all three episodes, the Green Room, Ending B, credits, initials, Top Earners and back to the title (12.6 min), 0 errors.","research":"Read the engine handoff docs (API.md, AI_GUIDE.md sections, ASSETS.md, API-INDEX.md by grep) and the AI Hub protocol README and harness; no web research on the source","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort medium","usage":"unknown (no usage figures are visible to the model in this session)"},"questions":{"testingFeedback":["How many issues did testing catch?","How many were critical or game breaking?","Most helpful test?","Least helpful test?"],"engineFeedback":["What did you like most?","Did you get stuck or guess wrong?","Most important thing you built yourself?","Hardest part?","What did you change in the engine?","One thing you would change?"],"promptFeedback":["What did you like most?","What was confusing?","Hardest thing to do?","What would you change?"]},"testingFeedback":["About 16 real issues: contestants could not walk out of exit doors; enemy painters crashed on a missing render state (an error every frame); a missing hpPct field; waves advancing before queued spawns arrived; boss phase coroutines killed by the runner right after their intro (bosses never attacked); the recap and ending scenes keeping flags from the previous visit (the run stalled after Episode 2); a party popper bursting twice; the attract mode's boss reel jumping into the recap; an unseeded Math.random in boss cash; tunings not persisting where storage is absent; the camera fit clamped so the arena was cropped; title menu overlapping the logo; lower third covering the session card buttons; illegible wheel labels. The full real-input run then found a disco ball that could stick in a corner forever (the room could never clear), and the boss bar covering Mashy's head.","5 would be game breaking: no way out of a room after a clear, the per-frame draw crash, bosses that never attacked, the run stalling at the second Prize Recap, and the disco ball stuck in a corner.","The scripted whole-game playthrough (two bots on the left path through all three episodes, the Green Room, Ending B, initials and Top Earners): it found the recap stall and proved every system connects. The room-sweep, which found the boss coroutine bug, was a close second. The full real-input run to the Season Finale was the only test that found the stuck disco ball.","The first version of the enemy-count convergence check in the netcode loopback: it compared one instant of host and client during a spawn burst, so it measured latency rather than mirroring, and had to be rewritten as an average."],"engineFeedback":["The amount that comes free and works headless: fixed-step game.advance with exact determinism, Humanoid rigs that look good dressed with a few options, the standard pause/settings/controls menus, canvas lighting, and scenes with fades. Writing tests that play the whole game in seconds was easy.","Yes: I assumed the camera fit would land near zoom 1, but the threequarter view's base scale is about 1.5, so my clamp cropped the arena; I guessed r.overlay text glyphs like the multiplication sign and middle dot exist in the tiny font (they don't); and game.addPlayer also fires allowJoin's onJoin, which I didn't expect.","The shared-world netcode (host-authoritative world, client mirror with local prediction, snapshots, claims and hurts) and the boss framework with coroutine phases; also the PlayStation/Xbox glyph icons, since the font has no face-button symbols.","Fitting a fixed single-screen arena to an expanding screen (map.bounds, base view scale and zoom interact), and keeping arrows as aim keys in play while the engine's menus need them to navigate.","Four small patches, each marked MASH TV PATCH: E.HOOKS exposed so presets can switch per player before the Shell reads navigation; the glyphs setting defaulting to PlayStation with an Xbox option applied to every player; E.Arcade initials and continue reading any player's input; and an audio bus getter so the Babble voices obey volume and mute.","A built-in per-player input-preset stack for menus versus play (and face-button glyph icons in the font), so twin-stick games don't need a hook to make arrows aim in play and navigate in menus."],"promptFeedback":["It is concrete about what done means (single file, exit interview shape, attract mode, dev sliders, controller-first rules) and the plan it pointed to was detailed enough to build from directly.","The relationship between 'feature-complete demo' and the plan's very large scope (18 rooms, 3 multi-phase bosses, shared-world netcode) at medium effort; and whether Source Information's Plan field should name the file or its author.","Making shared-world multiplayer pass the hub harness while keeping the same game playable locally with 1-4 players and an attract mode, all in one file.","Say how much of a large plan to prioritise when time is limited, and give the expected exit-interview usage source (the model cannot see token or cost figures)."],"aiHub":{"name":"MASH TV","tagline":"Mash 'em! Cash 'em! Survive the show.","description":"A 1-4 player twin-stick arena shooter inside the deadliest game show on TV: blast through studio rooms of goons and robots, grab cash and absurd prizes, keep the ratings up and survive to the Season Finale.","type":"Game","genre":"Shooter","source":"Smash TV","series":"","players":"1–4","controls":"WASD/left stick move · mouse/right stick aim & fire · Space/L2 slide · E/R1 Showstopper · Q/L1 Showboat","tags":["arcade","co-op","top-down","pixel art","comedy","boss fights"]}};
MT.BUILD = "2026-11-04T17:02:51.785Z";

// ===== 01-input.js
// ---------------------------------------------------------------- input: presets, the preset-sync hook, intents, idle, touch-only
// A preset lists every action it uses. Arrows aim in play, navigate in menus: two presets, switched by a hook (engine patch P1).
MT.MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM', 'Pad3'] };
MT.PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

MT.overlay = { open: false };   // one of our own overlays (dev panel, map, how-to, session menu) is open in play
MT.wantPreset = () => {
  const g = MT.game, s = g && g.scene; if (!s) return MT.MENU;
  if (g.paused || MT.overlay.open || (g.shell && g.shell.screen)) return MT.MENU;
  return s.input === MT.PLAY || s.playInput ? MT.PLAY : MT.MENU;
};
MT.syncPresets = (g) => {
  const want = MT.wantPreset();
  for (const p of g.players) if (p.preset !== want) { p.use(want); }
};
E.HOOKS.input.push((g) => { if (g === MT.game) { MT.syncPresets(g); MT.idle.tick(g); } });

// ---------------------------------------------------------------- intents: what a contestant wants this step
MT.NOINTENT = () => ({ move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, start: false });
MT.intentFrom = (I, c, W) => {
  const g = MT.game, it = MT.NOINTENT();
  if (!I || MT.overlay.open && I === g.input) return it;
  const m = I.move(), d = g.view.screenDirToGround(m[0], m[1]);
  it.move = [d[0], d[1]];
  let aim = null, fire = false, fromPad = false;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const a = g.view.screenDirToGround(I.padAim[0], I.padAim[1]); aim = Math.atan2(a[1], a[0]); fire = g.settings.autoFire !== false; fromPad = true;
  } else if (I.down('aimUp') || I.down('aimDown') || I.down('aimLeft') || I.down('aimRight')) {
    const sx = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), sy = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (sx || sy) { const a = g.view.screenDirToGround(sx, sy); aim = Math.atan2(a[1], a[0]); fire = true; }
  } else if (I === g.input && I.mouse && (I.lastDevice === 'mouse' || (I.mouse.active && I.clock - (I.mouse.t || -99) < 2))) {
    const mg = g.mouseGround();
    if (mg && c) { aim = Math.atan2(mg[1] !== undefined ? mg[1] - c.y : mg.y - c.y, mg[0] !== undefined ? mg[0] - c.x : mg.x - c.x); }
    fire = I.down('fire');
  }
  if (aim === null) { fire = I.down('fire'); if (c) aim = fire ? (c.aim !== undefined ? c.aim : c.facing) : null; }
  else if (I.down('fire')) fire = true;
  if (aim !== null && fromPad && W && g.settings.aimAssist !== false && c) aim = MT.aimAssist(c, aim, W);
  it.aim = aim; it.fire = fire;
  it.slide = I.pressed('slide'); it.bomb = I.pressed('bomb'); it.showboat = I.pressed('showboat'); it.start = I.pressed('start');
  return it;
};
MT.aimAssist = (c, aim, W) => {
  let best = null, bd = 1e9;
  for (const e of W.enemies) {
    if (e.dead || e.entering) continue;
    const d = MT.dist(c, e); if (d > 170) continue;
    const da = Math.abs(MT.angDiff(aim, MT.ang(c, e))); if (da > .1745) continue;
    if (da * 100 + d < bd) { bd = da * 100 + d; best = e; }
  }
  return best ? aim + MT.angDiff(aim, MT.ang(c, best)) * .5 : aim;
};

// ---------------------------------------------------------------- idle: any input on any device (the attract mode's clock)
MT.idle = {
  t: 0, _poke: false, _last: null, _mx: null, _my: null, wired: false,
  poke() { this._poke = true; },
  wire() {
    if (this.wired || typeof window === 'undefined' || !window.addEventListener) return; this.wired = true;
    const p = () => this.poke();
    window.addEventListener('keydown', p, true); window.addEventListener('mousedown', p, true); window.addEventListener('wheel', p, { capture: true, passive: true });
    window.addEventListener('touchstart', p, { capture: true, passive: true }); window.addEventListener('pointerdown', p, true);
    window.addEventListener('mousemove', e => { if (this._mx === null) { this._mx = e.clientX; this._my = e.clientY; return; } if (Math.hypot(e.clientX - this._mx, e.clientY - this._my) > 8) { this._mx = e.clientX; this._my = e.clientY; p(); } }, true);
  },
  padActive() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    let pads; try { pads = navigator.getGamepads(); } catch (e) { return false; }
    for (const pd of pads || []) { if (!pd) continue; for (const b of pd.buttons || []) if (b && (b.pressed || b.value > .5)) return true; for (const a of pd.axes || []) if (Math.abs(a) > .5) return true; }
    return false;
  },
  tick(g) {
    this.wire();
    let any = this._poke || this.padActive(); this._poke = false;
    if (!any) for (const p of g.players) if (p.anyPressed() || (p.clicked && p.clicked())) { any = true; break; }
    this.fired = any;
    if (any) { this.t = 0; MT.touchOnlyLift && MT.touchOnlyLift('input'); } else this.t += 1 / 120;
  }
};

// ---------------------------------------------------------------- touch-only devices: no touch controls, a notice instead
MT.touch = { only: false, lifted: false };
MT.detectTouch = () => {
  if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') { MT.touch.only = false; return false; }
  let fine = false; try { fine = matchMedia('(any-pointer: fine)').matches; } catch (e) { fine = false; }
  let pad = false; try { pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { pad = false; }
  MT.touch.only = !MT.touch.lifted && (navigator.maxTouchPoints || 0) > 0 && !fine && !pad;
  return MT.touch.only;
};
MT.touchOnlyLift = (why) => {
  if (!MT.touch.only) return;
  if (why === 'input') {   // only a key or a pad lifts it, never a tap
    const g = MT.game, I = g && g.input; if (!I || I.lastDevice === 'touch') return;
    if (I.lastDevice !== 'keyboard' && I.lastDevice !== 'gamepad') return;
  }
  MT.touch.only = false; MT.touch.lifted = true;
};
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('gamepadconnected', () => MT.touchOnlyLift('pad'));
  window.addEventListener('keydown', () => { if (MT.touch.only) { MT.touch.only = false; MT.touch.lifted = true; } }, true);
}

// ===== 02-glyphs.js
// ---------------------------------------------------------------- glyphs: button icons that follow the device used last
// The 5x7 font has no ✕ ○ □ △, so the PlayStation and Xbox buttons, keycaps and the mouse are small pixel icons.
MT.glyph = (() => {
  const F = E.font;
  const PS = { Pad0: ['cross', '#7aa8ff'], Pad1: ['circle', '#ff6a6a'], Pad2: ['square', '#ff8ad8'], Pad3: ['triangle', '#5fe0a0'],
    Pad4: ['tab', 'L1'], Pad5: ['tab', 'R1'], Pad6: ['tab', 'L2'], Pad7: ['tab', 'R2'], Pad8: ['pill', 'CREATE'], Pad9: ['pill', 'OPTIONS'],
    Pad10: ['stick', 'L3'], Pad11: ['stick', 'R3'], Pad12: ['dpad', 'u'], Pad13: ['dpad', 'd'], Pad14: ['dpad', 'l'], Pad15: ['dpad', 'r'] };
  const XB = { Pad0: ['letter', 'A', '#5fd86a'], Pad1: ['letter', 'B', '#ff5a5a'], Pad2: ['letter', 'X', '#5a9aff'], Pad3: ['letter', 'Y', '#ffd23a'],
    Pad4: ['tab', 'LB'], Pad5: ['tab', 'RB'], Pad6: ['tab', 'LT'], Pad7: ['tab', 'RT'], Pad8: ['pill', 'VIEW'], Pad9: ['pill', 'MENU'],
    Pad10: ['stick', 'LS'], Pad11: ['stick', 'RS'], Pad12: ['dpad', 'u'], Pad13: ['dpad', 'd'], Pad14: ['dpad', 'l'], Pad15: ['dpad', 'r'] };
  const KEYNAMES = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', NumpadEnter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB' };
  const tw = (s) => F.width(s);
  const txt = (g, s, x, y, c) => F.text(g, s, x, y, c, { outline: false });
  const S = (g, x, y, w, h, c, k) => px.rect(g, x, y, w * k, h * k, c);

  function family(I) { const gl = (I && I.glyphs) || 'playstation'; return gl === 'xbox' ? 'xbox' : 'playstation'; }
  function deviceOf(I) { const d = I ? I.lastDevice : 'keyboard'; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; }
  function codeFor(action, I, dev = deviceOf(I)) {
    if (action === 'move' || action === 'aim') return action;
    const codes = (I && I.map && I.map[action]) || (MT.PLAY[action] || MT.MENU[action] || []);
    if (dev === 'gamepad') return codes.find(c => /^Pad\d+$/.test(c)) || codes[0];
    if (dev === 'mouse') { const m = codes.find(c => c.startsWith('Mouse')); if (m) return m; }
    return codes.find(c => !c.startsWith('Pad') && !c.startsWith('Act:') && !c.startsWith('Mouse')) || codes.find(c => c.startsWith('Mouse')) || codes[0];
  }
  // each icon: a function (g, x, y, k) -> width drawn; y is the top; 11 px tall at k 1
  function disc(g, x, y, k, fill) { px.disc(g, x + 5 * k, y + 5 * k, 5 * k + .4, '#0e0a18'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, fill || '#2a2238'); }
  function psFace(g, x, y, k, shape, col) {
    disc(g, x, y, k); const cx = x + 5 * k, cy = y + 5 * k, s = 2.4 * k;
    if (shape === 'cross') { px.line(g, cx - s, cy - s, cx + s, cy + s, col, k); px.line(g, cx - s, cy + s, cx + s, cy - s, col, k); }
    else if (shape === 'circle') { px.disc(g, cx, cy, s + .6 * k, col); px.disc(g, cx, cy, s - .6 * k, '#2a2238'); }
    else if (shape === 'square') { px.rect(g, cx - s, cy - s, s * 2, k, col); px.rect(g, cx - s, cy + s - k, s * 2, k, col); px.rect(g, cx - s, cy - s, k, s * 2, col); px.rect(g, cx + s - k, cy - s, k, s * 2, col); }
    else if (shape === 'triangle') { const a = [cx, cy - s - .5], b = [cx - s - .5, cy + s - .3], c = [cx + s + .5, cy + s - .3]; px.line(g, a[0], a[1], b[0], b[1], col, k); px.line(g, b[0], b[1], c[0], c[1], col, k); px.line(g, c[0], c[1], a[0], a[1], col, k); }
    return 11 * k;
  }
  function letter(g, x, y, k, L, col) {
    disc(g, x, y, k, '#1c1a22'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, col);
    F.text(g, L, x + 5 * k - (tw(L) * k) / 2 + .5, y + 2 * k, '#101010', { scale: k, outline: false }); return 11 * k;
  }
  function tab(g, x, y, k, L) {
    const w = (tw(L) + 6) * k; px.rect(g, x, y + k, w, 9 * k, '#0e0a18'); px.rect(g, x + k, y + 2 * k, w - 2 * k, 7 * k, '#3a3248');
    px.rect(g, x + k, y + 2 * k, w - 2 * k, k, '#6a6080'); F.text(g, L, x + 3 * k, y + 2.5 * k, '#f4f0ff', { scale: k, outline: false }); return w;
  }
  function pill(g, x, y, k, L) {
    const w = (tw(L) + 8) * k; px.rect(g, x + k, y + 2 * k, w - 2 * k, 7 * k, '#0e0a18'); px.rect(g, x, y + 3 * k, w, 5 * k, '#0e0a18');
    px.rect(g, x + 2 * k, y + 3 * k, w - 4 * k, 5 * k, '#4a4058'); F.text(g, L, x + 4 * k, y + 2.5 * k, '#f4f0ff', { scale: k, outline: false }); return w;
  }
  function stick(g, x, y, k, L) {
    px.disc(g, x + 5 * k, y + 5 * k, 5.4 * k, '#0e0a18'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, '#5a5070'); px.disc(g, x + 5 * k, y + 5 * k, 3.2 * k, '#2a2238');
    F.text(g, L, x + 5 * k - tw(L) * k / 2 + .5, y + 2 * k, '#f4f0ff', { scale: k, outline: false }); return 11 * k;
  }
  function dpad(g, x, y, k, dir) {
    px.rect(g, x + 3 * k, y, 5 * k, 11 * k, '#0e0a18'); px.rect(g, x, y + 3 * k, 11 * k, 5 * k, '#0e0a18');
    px.rect(g, x + 4 * k, y + k, 3 * k, 9 * k, '#5a5070'); px.rect(g, x + k, y + 4 * k, 9 * k, 3 * k, '#5a5070');
    const hi = '#ffcc33', m = { u: [4, 1], d: [4, 7], l: [1, 4], r: [7, 4], all: null }[dir];
    if (m) px.rect(g, x + m[0] * k, y + m[1] * k, 3 * k, 3 * k, hi); else { px.rect(g, x + 4 * k, y + 4 * k, 3 * k, 3 * k, hi); }
    return 11 * k;
  }
  function keycap(g, x, y, k, L) {
    const w = Math.max(11, tw(L) + 6) * k;
    px.rect(g, x, y, w, 11 * k, '#0e0a18'); px.rect(g, x + k, y + k, w - 2 * k, 9 * k, '#d8d0e8'); px.rect(g, x + k, y + 8 * k, w - 2 * k, 2 * k, '#9a90b0');
    px.rect(g, x + k, y + k, w - 2 * k, k, '#ffffff'); F.text(g, L, x + w / 2 - tw(L) * k / 2 + .5, y + 1.5 * k, '#1a1424', { scale: k, outline: false }); return w;
  }
  function mouse(g, x, y, k, btn) {
    px.rect(g, x + 1 * k, y, 8 * k, 11 * k, '#0e0a18'); px.rect(g, x + 2 * k, y + k, 6 * k, 9 * k, '#d8d0e8');
    px.rect(g, x + 4.5 * k, y + k, k, 4 * k, '#0e0a18'); px.rect(g, x + 2 * k, y + 5 * k, 6 * k, k, '#0e0a18');
    if (btn === 0) px.rect(g, x + 2 * k, y + k, 2.5 * k, 4 * k, '#ff2e88'); else if (btn === 2) px.rect(g, x + 5.5 * k, y + k, 2.5 * k, 4 * k, '#ff2e88');
    else if (btn === 'move') { px.rect(g, x + 2 * k, y + k, 6 * k, 4 * k, '#2ee6ff'); }
    return 10 * k;
  }
  function drawCode(g, x, y, code, I, k = 1) {
    if (!code) return 0;
    if (code === 'move' || code === 'aim') {
      const dev = deviceOf(I);
      if (dev === 'gamepad') return stick(g, x, y, k, code === 'move' ? (family(I) === 'xbox' ? 'LS' : 'L') : (family(I) === 'xbox' ? 'RS' : 'R'));
      if (code === 'move') { let w = 0; for (const L of ['W', 'A', 'S', 'D']) w += keycap(g, x + w, y, k, L) + k; return w - k; }
      return mouse(g, x, y, k, 'move');
    }
    if (/^Pad\d+$/.test(code)) {
      const t = (family(I) === 'xbox' ? XB : PS)[code]; if (!t) return keycap(g, x, y, k, code);
      if (t[0] === 'cross' || t[0] === 'circle' || t[0] === 'square' || t[0] === 'triangle') return psFace(g, x, y, k, t[0], t[1]);
      if (t[0] === 'letter') return letter(g, x, y, k, t[1], t[2]);
      return ({ tab, pill, stick, dpad })[t[0]](g, x, y, k, t[1]);
    }
    if (code === 'Mouse0') return mouse(g, x, y, k, 0);
    if (code === 'Mouse2') return mouse(g, x, y, k, 2);
    let L = KEYNAMES[code]; if (!L) { L = I && I.codeLabel ? I.codeLabel(code) : code.replace(/^Key|^Digit/, ''); L = String(L).toUpperCase().slice(0, 6); }
    return keycap(g, x, y, k, L);
  }
  const api = {
    codeFor, deviceOf, family,
    draw(g, x, y, action, I, o = {}) { return drawCode(g, Math.round(x), Math.round(y), codeFor(action, I), I, o.scale || 1); },
    width(action, I, o = {}) { return api.measure([[action, '']], I, o); },
    measure(items, I, o = {}) {
      const k = o.scale || 1; let w = 0;
      for (const [a, label] of items) { const code = codeFor(a, I); w += codeWidth(code, I, k) + (label ? 3 * k + tw(label) * k : 0) + 10 * k; }
      return Math.max(0, w - 10 * k);
    },
    // a row of [action, 'TEXT'] pairs: icon then label; o.align 'center' centres it on x
    prompt(g, x, y, items, I, o = {}) {
      const k = o.scale || 1; if (o.align === 'center') x -= api.measure(items, I, o) / 2;
      x = Math.round(x); y = Math.round(y);
      for (const [a, label] of items) {
        const w = api.draw(g, x, y, a, I, { scale: k }); x += w;
        if (label) { x += 3 * k; F.text(g, label, x, y + 2 * k, o.color || '#fff7e8', { scale: k, shadow: '#000', outline: false }); x += tw(label) * k; }
        x += 10 * k;
      }
      return x;
    }
  };
  function codeWidth(code, I, k) {
    if (code === 'move') return deviceOf(I) === 'gamepad' ? 11 * k : (11 * 4 + 3) * k;
    if (code === 'aim') return deviceOf(I) === 'gamepad' ? 11 * k : 10 * k;
    if (/^Pad\d+$/.test(code)) { const t = (family(I) === 'xbox' ? XB : PS)[code]; if (!t) return 11 * k; if (t[0] === 'tab') return (tw(t[1]) + 6) * k; if (t[0] === 'pill') return (tw(t[1]) + 8) * k; return 11 * k; }
    if (code && code.startsWith('Mouse')) return 10 * k;
    let L = KEYNAMES[code]; if (!L) { L = I && I.codeLabel ? I.codeLabel(code) : String(code); L = String(L).toUpperCase().slice(0, 6); }
    return Math.max(11, tw(L) + 6) * k;
  }
  return api;
})();

// ===== 03-audio-music.js
// ---------------------------------------------------------------- music: original songs in the engine's notation, layers, stings
MT.SONGS = (() => {
  const rep = (s, n) => Array(n).fill(s).join(' | ');
  const cat = (...a) => a.join(' | ');
  const S = {};
  // the theme: a brassy game-show fanfare in C major
  S.theme = { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: cat(
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'G5 - - - E5 - C5 - D5 - - - . . . .',
      'F4 . A4 . C5 . F5 - - . C5 . F5 . G5 -', 'E5 - - - C5 - A4 - G4 - - - . . . .',
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'C6 - - - A5 - G5 - E5 - - - D5 - E5 -',
      'F5 - - - D5 - B4 - G5 - - - F5 - D5 -', 'C5 - - - - - - - . . G4 . C5 . . .') },
    { name: 'brass', wave: 'saw', vol: .06, notes: cat(
      'C4 - - - . . C4 . E4 - - - . . E4 .', 'G4 - - - . . G4 . G4 - - - . . . .',
      'F4 - - - . . F4 . A4 - - - . . A4 .', 'G4 - - - . . G4 . B4 - - - . . . .',
      'C4 - - - . . C4 . E4 - - - . . E4 .', 'A4 - - - . . A4 . C5 - - - . . . .',
      'F4 - - - . . F4 . G4 - - - . . G4 .', 'E4 - - - - - - - . . . . . . . .') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: cat('C3 . C3 . G2 . G2 . A2 . A2 . F2 . G2 .', 'C3 . C3 . E3 . G2 . G2 . G2 . B2 . G2 .',
      'F2 . F2 . C3 . F2 . A2 . A2 . F2 . G2 .', 'G2 . G2 . D3 . G2 . G2 . B2 . D3 . G2 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: 'k . h . s . h . k k h . s . h o' }
  ] };
  // Episode 1: driving studio funk
  S.studioBattle = { bpm: 150, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('E2 . E3 E2 . E2 G2 . A2 . A3 A2 . G2 B2 .', 'E2 . E3 E2 . E2 G2 . D3 . D3 B2 . A2 G2 .',
      'C3 . C3 C2 . C3 E3 . D3 . D3 D2 . D3 F#3 .', 'E2 . E3 E2 . E2 G2 . B2 . B2 A2 . G2 F#2 .') },
    { name: 'lead', wave: 'square', vol: .1, notes: cat('E5 . . G5 . . A5 . B5 - A5 . G5 . E5 .', 'D5 . E5 . . . . . G5 . . A5 . . B5 .',
      'C6 . . B5 . . A5 . G5 - A5 . B5 . D6 .', 'B5 - - - A5 . G5 . E5 - - - . . . .',
      'E5 . E5 . G5 . E5 . A5 . G5 . E5 . D5 .', 'E5 - - . . . D5 . E5 . G5 . A5 - - .',
      'C6 . B5 . A5 . G5 . A5 . G5 . E5 . G5 .', 'E5 - - - - - - - . . . . B4 . D5 .') },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: cat('. . E4 . . . G4 . . . A4 . . . B4 .', '. . E4 . . . G4 . . . D5 . . . B4 .',
      '. . C5 . . . E5 . . . D5 . . . F#5 .', '. . B4 . . . G4 . . . E4 - - - . .') },
    { name: 'drums', wave: 'drums', vol: .24, notes: 'k . h k s . h . k . h k s . h o' },
    { name: 'intense', wave: 'drums', vol: .16, on: false, notes: 'h h t h h h t h h h t h c h t h' }
  ] };
  // Episode 2: four-on-the-floor disco funk
  S.warehouseFunk = { bpm: 128, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('D2 . D3 . D2 . D3 . F2 . F3 . F2 . F3 .', 'G2 . G3 . G2 . G3 . A2 . A3 . A2 . C3 .',
      'D2 . D3 . D2 . D3 . F2 . F3 . F2 . F3 .', 'Bb2 . Bb2 . A2 . A2 . G2 . G2 . A2 . C#3 .') },
    { name: 'lead', wave: 'pulse', vol: .1, notes: cat('A4 . D5 . F5 . A5 - G5 . F5 . E5 . D5 .', 'C5 . D5 . . . F5 . E5 - - - C5 . . .',
      'A4 . D5 . F5 . A5 - C6 . A5 . G5 . F5 .', 'G5 - - . F5 . E5 . D5 - - - . . . .') },
    { name: 'strings', wave: 'saw', vol: .04, notes: cat('D4 - - - - - - - F4 - - - - - - -', 'G4 - - - - - - - A4 - - - - - - -',
      'D4 - - - - - - - F4 - - - - - - -', 'Bb4 - - - - - - - A4 - - - - - - -') },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: cat('. . F5 . F5 . . . . . A5 . A5 . . .', '. . G5 . G5 . . . . . C6 . C6 . . .') },
    { name: 'drums', wave: 'drums', vol: .24, notes: 'k . o . s . o . k . o . s . o h' },
    { name: 'intense', wave: 'drums', vol: .15, on: false, notes: 't h t h t h c h t h t h t h c c' }
  ] };
  // Episode 3: a dramatic minor overture
  S.finaleOverture = { bpm: 160, steps: 4, tracks: [
    { name: 'bass', wave: 'triangle', vol: .24, notes: cat('A2 . A2 A3 . A2 . A2 F2 . F2 F3 . F2 . F2', 'D2 . D2 D3 . D2 . D2 E2 . E2 E3 . E2 G#2 E2') },
    { name: 'strings', wave: 'saw', vol: .07, notes: cat('A4 - - - C5 - - - E5 - - - F5 - - -', 'D5 - - - C5 - - - B4 - - - G#4 - - -',
      'A4 - - - E5 - - - A5 - - - G5 - F5 -', 'E5 - - - D5 - B4 - E5 - - - - - - -') },
    { name: 'lead', wave: 'square', vol: .09, notes: cat('E5 . A5 . C6 . B5 . A5 . E5 . F5 - - .', 'D5 . F5 . A5 . G5 . E5 - - - . . . .',
      'E5 . A5 . C6 . E6 . D6 . C6 . B5 . A5 .', 'G#5 - - - B5 - - - E6 - - - . . . .') },
    { name: 'prime', wave: 'pulse', vol: .08, on: false, notes: cat('A5 . . A5 . . A5 . F5 . . F5 . . F5 .', 'D5 . . D5 . . D5 . E5 . . E5 . . G#5 .') },
    { name: 'drums', wave: 'drums', vol: .25, notes: 'k . h . s . h k k . h . s . t t' },
    { name: 'intense', wave: 'drums', vol: .16, on: false, notes: 'k h k h s h k h k h k h s t s t' }
  ] };
  // every boss: relentless, minor
  S.bossShowdown = { bpm: 170, steps: 4, tracks: [
    { name: 'bass', wave: 'saw', vol: .1, notes: cat('D2 D2 D3 D2 D2 D3 D2 D2 F2 F2 F3 F2 E2 E2 E3 E2', 'D2 D2 D3 D2 D2 D3 D2 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 A1') },
    { name: 'sub', wave: 'triangle', vol: .2, notes: cat('D2 - - - D2 - - - F2 - - - E2 - - -', 'D2 - - - D2 - - - Bb1 - - - A1 - - -') },
    { name: 'lead', wave: 'square', vol: .09, notes: cat('D5 . . F5 . . A5 . G#5 . A5 . . . . .', 'D5 . . F5 . . A5 . C6 . A5 . G5 . F5 .',
      'E5 . . G5 . . Bb5 . A5 . G5 . F5 . E5 .', 'D5 - - - C#5 - - - D5 - - - . . . .') },
    { name: 'phase2', wave: 'pulse', vol: .08, on: false, notes: cat('D6 . A5 . D6 . A5 . F6 . C6 . E6 . A5 .', 'D6 . A5 . D6 . A5 . Bb5 . F5 . C#6 . A5 .') },
    { name: 'drums', wave: 'drums', vol: .26, notes: 'k k h k s . h k k k h k s . s s' }
  ] };
  // the sponsors: a cheesy jingle
  S.commercial = { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: cat('C5 . F5 . A5 . F5 . C6 - - - A5 . . .', 'Bb5 . G5 . E5 . G5 . F5 - - - . . . .') },
    { name: 'bass', wave: 'triangle', vol: .2, notes: cat('F2 . C3 . F2 . C3 .', 'C3 . G2 . C3 . G2 .') },
    { name: 'drums', wave: 'drums', vol: .18, notes: 'k . h . s . h . k . h h s . h .' }
  ] };
  // the prize recap and the green room: a lounge groove
  S.recap = { bpm: 100, steps: 4, tracks: [
    { name: 'rhodes', wave: 'sine', vol: .14, notes: cat('F4 A4 C5 E5 - - - - D4 F4 A4 C5 - - - -', 'G4 Bb4 D5 F5 - - - - C4 E4 G4 Bb4 - - - -') },
    { name: 'lead', wave: 'triangle', vol: .14, notes: cat('A5 - - - G5 . F5 . E5 - - - . . . .', 'D5 - - - F5 . A5 . G5 - - - . . E5 .') },
    { name: 'bass', wave: 'triangle', vol: .18, notes: cat('F2 - . F2 A2 - C3 -', 'D2 - . D2 F2 - A2 -', 'G2 - . G2 Bb2 - D3 -', 'C2 - . C2 E2 - G2 -') },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h h k . h . s . h .' }
  ] };
  // endings and credits: a warm reprise of the theme
  S.ending = { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .16, notes: cat('G4 - C5 - E5 - G5 - - - E5 - G5 - A5 -', 'G5 - - - E5 - C5 - D5 - - - - - - -',
      'F4 - A4 - C5 - F5 - - - C5 - F5 - G5 -', 'E5 - - - - - - - C5 - - - - - - -') },
    { name: 'pad', wave: 'sine', vol: .1, notes: cat('C4 - - - - - - - E4 - - - - - - -', 'G3 - - - - - - - B3 - - - - - - -', 'F3 - - - - - - - A3 - - - - - - -', 'C4 - - - - - - - G3 - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .16, notes: cat('C3 - - - G2 - - -', 'G2 - - - D3 - - -', 'F2 - - - C3 - - -', 'C3 - - - G2 - - -') },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . . . h . . . s . . . h . . h' }
  ] };
  // stings: short songs played once over the music
  const sting = (bpm, tracks) => ({ bpm, steps: 4, tracks });
  S.stClear = sting(180, [{ wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - G5 C6 - - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 . G3 . C4 - - - - - - -' }, { wave: 'drums', vol: .2, notes: 'k . s . k k s . c . . .' }]);
  S.stPrize = sting(200, [{ wave: 'pulse', vol: .14, notes: 'G5 C6 E6 G6 - - E6 G6 - - - -' }, { wave: 'sine', vol: .12, notes: 'C5 E5 G5 C6 - - - - - - - -' }]);
  S.stKey = sting(160, [{ wave: 'sine', vol: .18, notes: 'E6 B6 E7 - G#6 B6 E7 - - - - -' }, { wave: 'triangle', vol: .1, notes: 'E4 - - - B4 - - - E5 - - -' }]);
  S.stPrime = sting(170, [{ wave: 'saw', vol: .1, notes: 'C5 . C5 . C5 G5 - - E5 . G5 . C6 - - - - - - -' }, { wave: 'square', vol: .1, notes: 'E5 . E5 . E5 B5 - - G5 . B5 . E6 - - - - - - -' }, { wave: 'drums', vol: .22, notes: 'k . k . k s . . k . s . c . . . . . . .' }]);
  S.stOneup = sting(220, [{ wave: 'square', vol: .14, notes: 'E5 G5 E6 C6 D6 G6 - - - -' }]);
  S.stBankrupt = sting(120, [{ wave: 'saw', vol: .12, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' }, { wave: 'triangle', vol: .18, notes: 'G2 - F#2 - F2 - E2 - - - - - - - . .' }]);
  S.stGameOver = sting(90, [{ wave: 'saw', vol: .12, notes: 'G4 - - F#4 - - F4 - - E4 - - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'C3 - - B2 - - Bb2 - - A2 - - - - - - - -' }]);
  S.stMash = sting(180, [{ wave: 'saw', vol: .14, notes: 'C4 C5 - G4 C5 - - -' }, { wave: 'drums', vol: .26, notes: 'k . k s . c . .' }]);
  S.stBossDown = sting(150, [{ wave: 'square', vol: .14, notes: 'C5 . C5 . C5 . G5 - - - E5 . G5 . C6 - - - - - - - - -' }, { wave: 'saw', vol: .07, notes: 'C4 - - - - - E4 - - - - - G4 - - - - - C5 - - - - -' }, { wave: 'drums', vol: .24, notes: 'k . k . k . s . . . k . s . c . . . . . . . . .' }]);
  S.stCard = sting(140, [{ wave: 'square', vol: .14, notes: 'G4 C5 E5 G5 - - - -' }, { wave: 'drums', vol: .2, notes: 'k . s . c . . .' }]);
  S.stJingle = sting(132, [{ wave: 'pulse', vol: .14, notes: 'C5 F5 A5 C6 - A5 C6 - F6 - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'F3 - C3 - F3 - C3 - F2 - - - - - - -' }]);
  S.stDrumroll = sting(240, [{ wave: 'drums', vol: .2, notes: 's s s s s s s s s s s s s s s s s s s s s s s s c . . .' }]);
  return S;
})();

MT.music = {
  cur: null,
  play(id, o = {}) {
    const a = MT.game && MT.game.audio; if (!a) return;
    if (!id) { this.cur = null; a.stopMusic(o.fade === undefined ? .4 : o.fade); return; }
    if (this.cur === id && !o.restart) return;
    const song = MT.SONGS[id]; if (!song) throw new Error('no song ' + id);
    this.cur = id; a.music(song, { fade: o.fade === undefined ? .6 : o.fade, restart: !!o.restart });
  },
  layer(name, vol, fade = .4) { const a = MT.game && MT.game.audio; if (a && a.song) { try { a.layer(name, vol, fade); } catch (e) { /* a song without that layer */ } } },
  sting(id) { const a = MT.game && MT.game.audio; if (a && MT.SONGS[id]) a.sting(MT.SONGS[id], { at: 'now', duck: .45 }); }
};

// ===== 04-audio-sfx.js
// ---------------------------------------------------------------- sound effects (all synthesized; each with its own contour)
MT.SFX = {
  // weapons
  pew: [{ wave: 'square', freq: 1400, to: 520, dur: .07, vol: .09 }],
  triple: [{ wave: 'pulse', freq: 1100, to: 400, dur: .08, vol: .08 }, { wave: 'pulse', freq: 1500, to: 600, dur: .06, vol: .05, delay: .015 }],
  rocket: [{ wave: 'noise', freq: 900, to: 300, dur: .25, vol: .14, filter: 'bandpass' }, { wave: 'saw', freq: 140, to: 260, dur: .2, vol: .06 }],
  boom: [{ wave: 'noise', freq: 600, to: 60, dur: .45, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 120, to: 35, dur: .4, vol: .25 }],
  bigboom: [{ wave: 'noise', freq: 500, to: 40, dur: .9, vol: .36, filter: 'lowpass' }, { wave: 'triangle', freq: 90, to: 25, dur: .8, vol: .3 }, { wave: 'noise', freq: 3000, to: 400, dur: .3, vol: .12, delay: .05 }],
  thunk: [{ wave: 'triangle', freq: 220, to: 90, dur: .12, vol: .2 }, { wave: 'noise', freq: 500, dur: .06, vol: .08 }],
  kernel: [{ wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .12, filter: 'highpass' }],
  hum: [{ wave: 'saw', freq: 110, dur: .14, vol: .05, hold: true, vib: [30, .05] }, { wave: 'sine', freq: 880, dur: .14, vol: .03, hold: true }],
  whirr: [{ wave: 'triangle', freq: 300, to: 900, dur: .3, vol: .08, vib: [20, .1] }],
  shieldUp: [{ wave: 'sine', freq: 300, to: 1200, dur: .35, vol: .12, vib: [12, .05] }],
  squeak: [{ wave: 'square', freq: 1800, to: 2600, dur: .06, vol: .06 }],
  // contestants
  whoosh: [{ wave: 'noise', freq: 600, to: 2400, dur: .2, vol: .12, filter: 'bandpass', q: 2 }],
  flourish: [{ wave: 'square', freq: 'C5', dur: .3, vol: .08, arp: [0, 4, 7, 12, 16], step: .05 }],
  flashbulb: [{ wave: 'noise', freq: 5000, to: 1200, dur: .12, vol: .2, filter: 'highpass' }, { wave: 'sine', freq: 2400, to: 300, dur: .2, vol: .1 }],
  buzzer: [{ wave: 'saw', freq: 110, dur: .32, vol: .14, hold: true }, { wave: 'square', freq: 116, dur: .32, vol: .08, hold: true }],
  wah: [{ wave: 'saw', freq: 330, to: 110, dur: .6, vol: .12, vib: [6, .04] }],
  zip: [{ wave: 'saw', freq: 2000, to: 400, dur: .35, vol: .06 }],
  land: [{ wave: 'triangle', freq: 160, to: 60, dur: .12, vol: .2 }, { wave: 'noise', freq: 400, dur: .08, vol: .08 }],
  kaching: [{ wave: 'square', freq: 'B5', dur: .05, vol: .08 }, { wave: 'square', freq: 'E6', dur: .22, vol: .09, delay: .05 }, { wave: 'noise', freq: 6000, dur: .05, vol: .05, filter: 'highpass', delay: .05 }],
  chime: [{ wave: 'sine', freq: 'E6', dur: .5, vol: .12 }, { wave: 'sine', freq: 'B6', dur: .5, vol: .08, delay: .08 }],
  powerup: [{ wave: 'square', freq: 'C5', dur: .4, vol: .09, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 }],
  expire: [{ wave: 'square', freq: 800, to: 300, dur: .15, vol: .07 }],
  tick: [{ wave: 'square', freq: 2200, dur: .03, vol: .05 }],
  oneup: [{ wave: 'square', freq: 'E5', dur: .5, vol: .1, arp: [0, 3, 12, 8, 10, 15], step: .07 }],
  // enemies
  grunt: [{ wave: 'saw', freq: 140, to: 90, dur: .12, vol: .07 }],
  swish: [{ wave: 'noise', freq: 1500, to: 600, dur: .1, vol: .08 }],
  hop: [{ wave: 'square', freq: 400, to: 800, dur: .06, vol: .05 }],
  clap: [{ wave: 'noise', freq: 1800, dur: .04, vol: .1, filter: 'bandpass', q: 1.5 }],
  hiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .06, filter: 'highpass', hold: true }],
  pop: [{ wave: 'square', freq: 900, to: 140, dur: .08, vol: .12 }, { wave: 'noise', freq: 2000, dur: .05, vol: .1 }],
  beep: [{ wave: 'square', freq: 1500, dur: .06, vol: .07 }],
  pfft: [{ wave: 'noise', freq: 800, to: 300, dur: .2, vol: .1 }],
  shimmer: [{ wave: 'sine', freq: 'C6', dur: .4, vol: .06, arp: [0, 7, 12, 19], step: .04, loop: true }],
  zap: [{ wave: 'saw', freq: 1600, to: 200, dur: .12, vol: .07 }],
  boo: [{ wave: 'saw', freq: 120, to: 95, dur: .4, vol: .06, vib: [5, .05] }],
  splat: [{ wave: 'noise', freq: 400, to: 120, dur: .18, vol: .16, filter: 'lowpass' }],
  whine: [{ wave: 'sine', freq: 600, to: 2400, dur: .4, vol: .07 }],
  shell: [{ wave: 'square', freq: 200, to: 80, dur: .15, vol: .14 }, { wave: 'noise', freq: 900, dur: .1, vol: .12 }],
  snap: [{ wave: 'noise', freq: 3000, dur: .04, vol: .12, filter: 'highpass' }, { wave: 'square', freq: 600, to: 200, dur: .05, vol: .06 }],
  roar: [{ wave: 'saw', freq: 90, to: 60, dur: .6, vol: .14, vib: [18, .12] }, { wave: 'noise', freq: 300, dur: .5, vol: .1, filter: 'lowpass' }],
  stomp: [{ wave: 'triangle', freq: 90, to: 40, dur: .2, vol: .25 }, { wave: 'noise', freq: 250, dur: .15, vol: .12, filter: 'lowpass' }],
  crash: [{ wave: 'noise', freq: 1200, to: 200, dur: .35, vol: .2 }, { wave: 'triangle', freq: 70, to: 30, dur: .3, vol: .25 }],
  confetti: [{ wave: 'noise', freq: 3500, to: 1500, dur: .08, vol: .1, filter: 'bandpass' }, { wave: 'square', freq: 700, to: 1400, dur: .05, vol: .04 }],
  tink: [{ wave: 'sine', freq: 3200, dur: .06, vol: .06 }],
  // studio
  klaxon: [{ wave: 'square', freq: 520, dur: .18, vol: .07, hold: true }, { wave: 'square', freq: 440, dur: .18, vol: .07, hold: true, delay: .18 }],
  rollup: [{ wave: 'noise', freq: 300, to: 900, dur: .32, vol: .1, filter: 'bandpass' }],
  slam: [{ wave: 'noise', freq: 400, to: 80, dur: .2, vol: .2, filter: 'lowpass' }, { wave: 'triangle', freq: 80, dur: .15, vol: .2 }],
  alarm: [{ wave: 'square', freq: 900, to: 600, dur: .25, vol: .07 }, { wave: 'square', freq: 900, to: 600, dur: .25, vol: .07, delay: .3 }],
  pyro: [{ wave: 'noise', freq: 300, to: 1200, dur: .5, vol: .18, filter: 'bandpass' }],
  click: [{ wave: 'square', freq: 3000, dur: .015, vol: .05 }],
  static: [{ wave: 'noise', freq: 4000, dur: .3, vol: .08, filter: 'highpass', hold: true }],
  channel: [{ wave: 'noise', freq: 2000, dur: .08, vol: .08 }, { wave: 'square', freq: 1200, dur: .03, vol: .04, delay: .08 }],
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .1, filter: 'highpass' }, { wave: 'noise', freq: 2500, dur: .03, vol: .08, delay: .05 }],
  // ui
  blip: [{ wave: 'square', freq: 880, dur: .03, vol: .05 }],
  bell: [{ wave: 'sine', freq: 'A5', dur: .25, vol: .1 }, { wave: 'sine', freq: 'E6', dur: .25, vol: .06, delay: .02 }],
  back: [{ wave: 'square', freq: 500, to: 300, dur: .08, vol: .06 }],
  page: [{ wave: 'noise', freq: 1500, to: 3000, dur: .08, vol: .06 }],
  slider: [{ wave: 'square', freq: 1200, dur: .02, vol: .04 }],
  type: [{ wave: 'square', freq: 1500, dur: .015, vol: .03 }],
  countdown: [{ wave: 'square', freq: 660, dur: .12, vol: .08 }],
  go: [{ wave: 'square', freq: 1320, dur: .3, vol: .1 }]
};
MT._sfxFrame = { n: {}, t: -1 };
MT.sfx = (name, o = {}) => {
  const g = MT.game; if (!g || g.headless || !g.audio) return;
  if (MT.run && MT.run.mode === 'session' && MT.net && MT.net.ended) return;
  const f = MT._sfxFrame; if (f.t !== g.real) { f.t = g.real; f.n = {}; }
  f.n[name] = (f.n[name] || 0) + 1; if (f.n[name] > 3) return;
  const v = MT.SFX[name]; if (!v) throw new Error('no sound ' + name);
  g.audio.sfx(v, o);
};

// ===== 05-babble.js
// ---------------------------------------------------------------- Babble: Animalese/Simlish gibberish voices and the crowd
// A small formant synth on the engine's audio context, routed through its effects bus (engine patch P4) so volume and mute apply.
MT.babble = (() => {
  const VOICES = {
    lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1.0, swoop: 1.5 },
    penny: { f0: 300, speed: 12, wave: 'pulse', formant: 1.18, trill: true },
    annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, echo: true },
    network: { f0: 70, speed: 8, wave: 'square', formant: .8, robot: true },
    mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, bounce: true },
    sponsor: { f0: 220, speed: 10, wave: 'square', formant: 1.1, sing: true },
    goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9 },
    contestant1: { f0: 170, speed: 12, wave: 'pulse', formant: 1.05 },
    contestant2: { f0: 230, speed: 12, wave: 'pulse', formant: 1.1 },
    contestant3: { f0: 160, speed: 12, wave: 'pulse', formant: 1.0 },
    contestant4: { f0: 240, speed: 12, wave: 'pulse', formant: 1.12 }
  };
  const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700], y: [300, 2600] };
  const PLOS = 'bdgkpqtc', FRIC = 'fhjsvxz', NAS = 'mnlrw';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  let noiseBuf = null, pulseWave = null, crusher = null, echoNode = null;
  const ctxOK = () => { const a = MT.game && MT.game.audio; return a && !MT.game.headless && a.ctx && !a.muted && a.ready !== false ? a : null; };
  function nodes(a) {
    const c = a.ctx;
    if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (!pulseWave) { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .3); pulseWave = c.createPeriodicWave(re, im); }
    if (!crusher) { crusher = c.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) cv[i] = Math.round(((i / 128) - 1) * 4) / 4; crusher.curve = cv; crusher.connect(a.bus); }
    if (!echoNode) { const d = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .16; fb.gain.value = .35; wet.gain.value = .5; d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(a.bus); echoNode = d; }
  }
  // split text into words and syllables; return the plan with timings (used headless for durations too)
  function plan(text, v) {
    const words = String(text).split(/(\s+|[,.!?]+|\.\.\.)/).filter(w => w && w.trim() !== '' || /[,.!?]/.test(w));
    const out = []; let t = 0; const syl = 1 / v.speed;
    const ending = /\?\s*$/.test(text) ? 'q' : /!\s*$/.test(text) ? 'x' : 'd';
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      if (/^\.\.\.$/.test(w) || /\.\.\./.test(w)) { t += .3; continue; }
      if (/^[,]+$/.test(w)) { t += .08; continue; }
      if (/^[.!?]+$/.test(w)) { t += .16; continue; }
      const lw = w.toLowerCase().replace(/[^a-z0-9']/g, ''); if (!lw) continue;
      const groups = lw.match(/[^aeiouy]*[aeiouy]+/g) || [lw]; const n = Math.min(4, groups.length);
      const h = hash(lw), caps = w === w.toUpperCase() && /[A-Z]/.test(w) && w.length > 1;
      for (let k = 0; k < n; k++) {
        const gpart = groups[k], on = gpart.replace(/[aeiouy]+$/, ''), vow = (gpart.match(/[aeiouy]/) || ['a'])[0];
        const cls = !on ? null : PLOS.includes(on[0]) ? 'p' : FRIC.includes(on[0]) ? 'f' : NAS.includes(on[0]) ? 'n' : 'p';
        const jitter = 1 + (((h >> (k * 3)) & 15) / 15 - .5) * .08;
        const prog = (wi + k / n) / Math.max(1, words.length);
        let contour = 1 + Math.sin(prog * Math.PI) * .08;
        if (ending === 'q') contour *= 1 + prog * .25; else contour *= 1 - prog * .12;
        if (ending === 'x' && wi >= words.length - 3) contour *= 1.2;
        if (caps && k === 0 && ((h & 3) === 0)) contour *= 1.1;
        const len = syl * (.85 + ((h >> (k * 5)) & 7) / 20);
        out.push({ t, len, cls, vow, mul: contour * jitter });
        t += len;
      }
      t += syl * .25;
    }
    return { syll: out, dur: t + .1 };
  }
  function syllable(a, v, s, t0, vol, dest) {
    const c = a.ctx, t = t0 + s.t, f = v.f0 * s.mul * (v.bounce ? (1 + .15 * Math.sin(s.t * 20)) : 1);
    if (s.cls) {
      const src = c.createBufferSource(); src.buffer = noiseBuf; const bf = c.createBiquadFilter(), g = c.createGain();
      const d = s.cls === 'p' ? .015 : s.cls === 'f' ? .05 : .04;
      if (s.cls === 'n') { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * .9; const gn = c.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol * .5, t + .005); gn.gain.linearRampToValueAtTime(0, t + d); o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + .02); }
      else {
        bf.type = s.cls === 'p' ? 'bandpass' : 'highpass'; bf.frequency.value = s.cls === 'p' ? 3000 : 4000; bf.Q.value = 1;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .6, t + .003); g.gain.linearRampToValueAtTime(0, t + d);
        src.connect(bf); bf.connect(g); g.connect(dest); src.start(t, Math.random() * .5); src.stop(t + d + .02);
      }
    }
    const vs = t + (s.cls ? .012 : 0), ve = vs + s.len * .82;
    const o = c.createOscillator();
    if (v.wave === 'pulse') o.setPeriodicWave(pulseWave); else o.type = v.wave;
    o.frequency.setValueAtTime(f, vs);
    if (v.swoop) o.frequency.linearRampToValueAtTime(f * (1 + (s.mul - 1) * v.swoop + .06), ve);
    else if (!v.robot) o.frequency.linearRampToValueAtTime(f * .97, ve);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * (v.robot ? 0 : .02); lfo.connect(lg); lg.connect(o.frequency); lfo.start(vs); lfo.stop(ve + .05);
    const g = c.createGain(); g.gain.setValueAtTime(0, vs); g.gain.linearRampToValueAtTime(vol, vs + .005); g.gain.setValueAtTime(vol, Math.max(vs + .006, ve - .03)); g.gain.linearRampToValueAtTime(0, ve);
    const fm = FORMANTS[s.vow] || FORMANTS.a;
    for (const fr of fm) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr * v.formant; bp.Q.value = 8; o.connect(bp); bp.connect(g); }
    const dry = c.createGain(); dry.gain.value = .25; o.connect(dry); dry.connect(g);
    g.connect(dest); o.start(vs); o.stop(ve + .05);
  }
  const api = {
    VOICES,
    duration(text, voice = 'lance') { return plan(text, VOICES[voice] || VOICES.lance).dur; },
    say(text, voice = 'lance', o = {}) {
      const v = Object.assign({}, VOICES[voice] || VOICES.lance); if (o.speed) v.speed *= o.speed;
      const p = plan(text, v), a = ctxOK();
      if (!a) return p.dur;
      try {
        nodes(a); const dest = v.robot ? crusher : a.bus, t0 = a.ctx.currentTime + .02, vol = (o.vol || .22);
        for (const s of p.syll) syllable(a, v, s, t0, vol, dest);
        if (v.echo) for (const s of p.syll) syllable(a, v, s, t0, vol * .5, echoNode);
        if (v.trill) { const last = p.syll[p.syll.length - 1]; if (last) for (let k = 0; k < 3; k++) syllable(a, v, { t: last.t + last.len + k * .05, len: .05, cls: null, vow: 'i', mul: 1.3 + k * .1 }, t0, vol * .6, dest); }
      } catch (e) { /* sound is best-effort */ }
      return p.dur;
    },
    // the crowd: cheer, ooh, laugh, applause, boo; intensity 0..1 scales voices and volume
    crowd(kind, intensity = .6) {
      const a = ctxOK(); if (!a) return; nodes(a);
      const c = a.ctx, t0 = c.currentTime + .01, n = Math.round(3 + intensity * 7), vol = .03 + intensity * .05, bus = a.bus;
      try {
        if (kind === 'applause') {
          const cnt = Math.round((8 + Math.random() * 6) * 1.5 * (.5 + intensity));
          for (let i = 0; i < cnt; i++) { const t = t0 + Math.random() * 1.5, src = c.createBufferSource(); src.buffer = noiseBuf; const bf = c.createBiquadFilter(), g = c.createGain(); bf.type = 'bandpass'; bf.frequency.value = 1200 + Math.random() * 1800; bf.Q.value = 1.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * 1.6, t + .002); g.gain.exponentialRampToValueAtTime(.0005, t + .05); src.connect(bf); bf.connect(g); g.connect(bus); src.start(t, Math.random() * .5); src.stop(t + .07); }
          return;
        }
        const shape = { cheer: ['o', 'a', 1.0, 1.25, .6], ooh: ['u', 'u', 1.1, .75, .7], laugh: ['a', 'a', 1, 1, .12], boo: ['u', 'o', .6, .9, .7], murmur: ['e', 'o', .9, .95, .2] }[kind] || ['a', 'a', 1, 1, .4];
        for (let i = 0; i < n; i++) {
          const v = { f0: 120 + Math.random() * 200, speed: 10, wave: Math.random() < .5 ? 'sawtooth' : 'triangle', formant: .9 + Math.random() * .3 };
          if (kind === 'laugh') { for (let k = 0; k < 5; k++) syllable(a, v, { t: Math.random() * .1 + k * .2, len: .1, cls: 'f', vow: 'a', mul: 1 - k * .04 }, t0, vol * .6, bus); }
          else syllable(a, v, { t: Math.random() * .2, len: shape[4] + Math.random() * .3, cls: null, vow: Math.random() < .5 ? shape[0] : shape[1], mul: shape[2] }, t0, vol * .7, bus);
        }
        if (kind === 'cheer') api.crowd('applause', intensity * .7);
      } catch (e) { /* best-effort */ }
    },
    _amb: 0,
    ambience(dt, level) {   // a quiet murmur under play: random soft syllables
      this._amb -= dt; if (this._amb > 0) return; this._amb = .45 + Math.random() * .6;
      if (level > 0) api.crowd('murmur', .1 + level * .2);
    }
  };
  return api;
})();

// ===== 06-art-studio.js
// ---------------------------------------------------------------- the sets: floors, walls, doors, outside dressing, the jumbotron, lights
MT.sets = (() => {
  const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const n2 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
  // the logo decal: "MASH TV" rasterized once, sampled by the studio floor
  let logoData = null;
  function logo() {
    if (logoData !== null) return logoData;
    logoData = false;
    try {
      if (typeof document === 'undefined') return false;
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 40; const g = cv.getContext('2d');
      E.font.title(g, 'MASH TV', 80, 6, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'], outline: '#1a0a24', depth: 0 });
      logoData = { w: 160, h: 40, d: g.getImageData(0, 0, 160, 40).data };
    } catch (e) { logoData = false; }
    return logoData;
  }
  const C = {
    studioA: hx('#1c0f2c'), studioB: hx('#24143a'), gloss: hx('#3a2458'), mag: hx('#ff2e88'), gold: hx('#ffcc33'),
    conA: hx('#5a5a62'), conB: hx('#4e4e58'), yel: hx('#e8c020'), scuff: hx('#3a3a42'),
    slA: hx('#262a36'), slB: hx('#2e3240'), carpet: hx('#8a1020'), carpetHi: hx('#b02030'),
    grA: hx('#0e4a32'), grB: hx('#12583a'), grGold: hx('#c8a040')
  };
  function studioFloor(x, y) {
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), lx = x - tx * 16, ly = y - ty * 16;
    let c = (tx + ty) & 1 ? C.studioA : C.studioB;
    if (lx < 1 || ly < 1) c = mixc(c, C.mag, .25);
    if ((tx % 4 === 0 && lx < 1.2) || (ty % 4 === 0 && ly < 1.2)) c = mixc(c, C.gold, .45);
    if (ly > 10 && ly < 13 && lx > 2 && lx < 12) c = mixc(c, C.gloss, .5);   // the gloss
    const L = logo();
    if (L && Math.abs(x - 184) < 80 && Math.abs(y - 120) < 20) {
      const u = Math.floor(x - 104), v = Math.floor((y - 100) * 2);
      if (u >= 0 && u < L.w && v >= 0 && v < L.h) { const i = (v * L.w + u) * 4; if (L.d[i + 3] > 100) c = mixc(c, [L.d[i], L.d[i + 1], L.d[i + 2]], .55); }
    }
    if (Math.abs(Math.hypot(x - 184, y - 120) - 46) < 1) c = mixc(c, C.gold, .4);
    return c;
  }
  function warehouseFloor(x, y) {
    let c = n2(Math.floor(x / 3), Math.floor(y / 3)) < .5 ? C.conA : C.conB;
    if (n2(Math.floor(x / 9), Math.floor(y / 7)) > .93) c = mixc(c, C.scuff, .6);
    if (Math.abs(x - 44) < 1.5 || Math.abs(x - 324) < 1.5 || Math.abs(y - 36) < 1.5 || Math.abs(y - 204) < 1.5) c = C.yel;
    if ((x % 64) < 1 || (y % 64) < 1) c = mixc(c, hx('#333338'), .5);
    return c;
  }
  function rooftopFloor(x, y) {
    const tx = Math.floor(x / 12), ty = Math.floor(y / 8), lx = x % 12, ly = y % 8;
    let c = ((tx + ty * 3) % 3) ? C.slA : C.slB; if (lx < .8 || ly < .8) c = mixc(c, hx('#10121a'), .6);
    if (Math.abs(x - 184) < 22) { c = n2(Math.floor(x / 2), Math.floor(y / 2)) < .5 ? C.carpet : C.carpetHi; if (Math.abs(x - 184) > 20) c = C.gold; }
    const d = Math.hypot(x - 184, y - 120); if (Math.abs(d - 40) < 1.6) c = C.gold;
    if (d < 40 && Math.abs(x - 184) < 22 && Math.abs(y - 120) < 14 && (Math.abs(x - 184) < 2 || (Math.abs(y - 120) > 11))) c = mixc(c, C.gold, .7);
    return c;
  }
  function greenFloor(x, y) {
    const k = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1); let c = k ? C.grA : C.grB;
    const lx = x % 16, ly = y % 16; if (Math.abs(lx - 8) + Math.abs(ly - 8) < 1.5) c = C.grGold;
    return c;
  }
  const SETS = {
    studio: { name: 'STUDIO 9', floor: studioFloor, wall: { h: 26, top: '#ffcc33', side: '#4a1a5c', face: '#5a1e6c cloth', roof: 'plain', cut: true },
      ambient: .55, outside: '#140a24', sky: null, lightCols: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a7aff'], bulbs: '#ffcc33', shutter: ['#c8a040', '#7a5a20'] },
    warehouse: { name: 'MEGAMART PRIZE WAREHOUSE', floor: warehouseFloor, wall: { h: 26, top: '#9aa0aa', side: '#5a606a', face: '#7a808c planks', roof: 'plain', cut: true },
      ambient: .6, outside: '#16161c', lightCols: ['#d8f0ff', '#d8f0ff', '#ffb040', '#d8f0ff'], bulbs: '#ffb040', shutter: ['#8a8f9a', '#4a4f5a'] },
    rooftop: { name: 'THE ROOFTOP GALA', floor: rooftopFloor, wall: { h: 14, top: '#ffcc33', side: '#2a4a6a', face: '#3a6a8a glaze', roof: 'plain', cut: true },
      ambient: .4, outside: '#0a0c1a', lightCols: ['#ffd890', '#ffd890', '#90e0ff', '#ffd890'], bulbs: '#ffe0a0', shutter: ['#b89a50', '#5a4a28'] },
    greenroom: { name: 'THE GREEN ROOM', floor: greenFloor, wall: { h: 26, top: '#c8a040', side: '#4a2a14', face: '#6a3a1a planks', roof: 'plain', cut: true },
      ambient: .6, outside: '#120a06', lightCols: ['#ffcf80', '#ffcf80', '#ffcf80', '#ffcf80'], bulbs: '#ffcf80', shutter: ['#8a6030', '#4a3018'] }
  };
  // audience sprites: head and shoulders, recolored per seat
  const AUD = [
    ['..hh..', '.hhhh.', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc'],
    ['.hhhh.', 'hhhhhh', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc'],
    ['......', '..hh..', '.hssh.', '.s..s.', '..ss..', '.cccc.', 'cccccc'],
    ['h....h', '.hhhh.', '.ssss.', '.s..s.', '..ss..', 'cccccc', 'cccccc']
  ];
  const AUDPAL = [['#3a2a1a', '#f0c8a0', '#e8443a'], ['#e8d060', '#d8a880', '#3b82f6'], ['#1a1a1a', '#8a5a3a', '#22c55e'], ['#c84a2a', '#f0d0b0', '#ff2e88'],
    ['#6a6a6a', '#e0b090', '#9a7aff'], ['#2a1a0a', '#6a4028', '#ffcc33'], ['#f0f0f0', '#f0c8a0', '#2ee6ff'], ['#4a2a6a', '#d8a880', '#f5b700']];
  let audSpr = null;
  const audience = () => audSpr || (audSpr = AUDPAL.map((p, i) => E.sprite(AUD[i % AUD.length], { h: p[0], s: p[1], c: p[2] })));
  const SIGNS = ['MASH!', 'KA-CHING!', 'HI MOM', '$$$', 'LANCE!'];

  // ---------------------------------------------------------------- per-frame dressing
  function seats(side) {   // audience seat positions on a bleacher block
    const out = [];
    for (let row = 0; row < 4; row++) for (let k = 0; k < 12; k++) {
      const x = side === 'W' ? -24 - row * 22 : 392 + row * 22, y = 18 + k * 18 + (row & 1) * 9;
      out.push([x, y, 6 + row * 8, (row * 12 + k) % 8, row, k]);
    }
    return out;
  }
  const SEATS = { W: seats('W'), E: seats('E') };
  const FRONT = Array.from({ length: 14 }, (_, k) => [30 + k * 24, 262 + (k & 1) * 4, 2, (k * 3) % 8, 0, k]);
  function drawBleachers(r, W, set) {
    const shade = E.tones(set === 'warehouse' ? '#4a4a52' : set === 'rooftop' ? '#2a2a40' : '#3a1a4a');
    for (const side of ['W', 'E']) {
      for (let row = 0; row < 4; row++) {
        const x0 = side === 'W' ? -34 - row * 22 : 382 + row * 22;
        r.queue(x0 + 10, 120, 0, g => r.box(g, x0, 6, 0, x0 + 20, 234, 4 + row * 8, shade.lt, shade.sh), { bias: -2 });
      }
    }
    const R = W ? W.ratings.R : 30, prime = W && W.ratings.prime > 0, t = MT.game ? MT.game.time : 0, spr = audience();
    for (const side of ['W', 'E']) for (const s of SEATS[side]) {
      let bob = Math.abs(Math.sin(t * (2 + R / 20) + s[5] * .7 + s[4])) * (1 + R / 25);
      if (prime) bob = Math.max(0, Math.sin(t * 6 - s[5] * .5)) * 6;
      const z = s[2] + 2 + bob;
      r.sprite(s[0], s[1], z, spr[s[3]], { outline: false });
      if ((s[5] + s[4]) % 9 === 0 && R > 40) r.queue(s[0], s[1], z + 9, g => { const p = r.w(s[0], s[1], z + 12); const txt = SIGNS[(s[5] + s[4]) % SIGNS.length]; const w = E.font.width(txt); px.rect(g, p[0] - w / 2 - 2, p[1] - 4, w + 4, 9, '#fff7e8'); E.font.text(g, txt, p[0] - w / 2, p[1] - 3, '#1a0a24', { outline: false }); });
    }
    for (const s of FRONT) {
      const bob = Math.abs(Math.sin(t * (2 + R / 20) + s[5])) * (1 + R / 30);
      r.sprite(s[0], s[1], s[2] + bob, spr[s[3]], { outline: false });
    }
  }
  function drawCranes(r, set) {
    const tn = MT.game ? MT.game.time : 0, mt = E.tones('#3a3a48'), rd = E.tones('#c8d0e0');
    for (const [x, y] of [[54, 272], [314, 272]]) {
      r.queue(x, y, 0, g => {
        r.box(g, x - 10, y - 4, 0, x + 10, y + 4, 6, mt.lt, mt.sh);
        const a = Math.sin(tn * .4 + x) * .4, top = r.w(x, y, 40), arm = r.w(x + Math.cos(a) * 30, y - 20 + Math.sin(a) * 8, 52), base = r.w(x, y, 6);
        px.line(g, base[0], base[1], top[0], top[1], mt.base, 2); px.line(g, top[0], top[1], arm[0], arm[1], rd.base, 2);
        px.rect(g, arm[0] - 4, arm[1] - 3, 8, 6, '#1a1a22'); px.disc(g, arm[0] + 4, arm[1], 2, '#2ee6ff'); px.dot(g, arm[0] - 3, arm[1] - 4, '#ff3344');
      });
    }
    // the ON AIR and APPLAUSE signs at the front
    r.queue(184, 290, 0, g => {
      const p = r.w(184, 290, 30), W = MT.W, on = W && (W.ratings.applause > 0 || W.ratings.prime > 0) && Math.floor(tn * 6) % 2 === 0;
      px.rect(g, p[0] - 70, p[1] - 6, 46, 12, '#1a0a14'); E.font.text(g, 'ON AIR', p[0] - 64, p[1] - 3, Math.floor(tn * 2) % 2 ? '#ff3344' : '#7a1a22', { outline: false });
      px.rect(g, p[0] + 22, p[1] - 6, 56, 12, '#1a0a14'); E.font.text(g, 'APPLAUSE', p[0] + 26, p[1] - 3, on ? '#ffcc33' : '#5a4a20', { outline: false });
    });
  }
  function drawSkyline(r) {
    const tn = MT.game ? MT.game.time : 0;
    r.queue(184, -60, 0, g => {
      for (let i = 0; i < 30; i++) {
        const x = -150 + i * 23, h = 40 + ((i * 37) % 7) * 14, base = r.w(x, -70, 0), top = r.w(x, -70, h);
        px.rect(g, base[0] - 9, top[1], 18, base[1] - top[1], '#0e1226');
        for (let k = 0; k < h / 8; k++) for (let j = 0; j < 3; j++) if (((i * 7 + k * 3 + j) % 5) < 2) px.dot(g, base[0] - 6 + j * 5, top[1] + 3 + k * 6, (i + k) % 3 ? '#ffd890' : '#7ae0ff');
      }
    }, { bias: -40 });
    // fireworks every few seconds
    const k = Math.floor(tn / 2.6), u = (tn % 2.6) / 2.6;
    if (u < .6) {
      const fx = 40 + (k * 97) % 290, fz = 110 + (k * 31) % 40;
      r.queue(fx, -80, fz, g => {
        const p = r.w(fx, -80, fz), rad = u * 34, col = ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a'][k % 4];
        for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; px.dot(g, p[0] + Math.cos(an) * rad, p[1] + Math.sin(an) * rad * .8 + u * u * 10, col); }
      }, { emissive: true, bias: -30 });
      if (u < .15 && MT.game) MT.game.lights.add(fx, 0, fz, 120, .3, { color: '#ffd0a0' });
    }
  }
  function drawWarehouseRacks(r) {
    const mt = E.tones('#4a5a7a'), pr = ['#e8e8f0', '#3a3a48', '#c84a2a', '#3b82f6'];
    for (const y of [-28, -52]) for (let i = 0; i < 6; i++) {
      const x = 24 + i * 64;
      r.queue(x, y, 0, g => {
        r.box(g, x - 28, y - 6, 0, x + 28, y + 6, 4, mt.lt, mt.sh); r.box(g, x - 28, y - 6, 24, x + 28, y + 6, 27, mt.lt, mt.sh);
        for (let j = 0; j < 3; j++) { const c = E.tones(pr[(i + j) % 4]); r.box(g, x - 24 + j * 17, y - 4, 4, x - 12 + j * 17, y + 4, 18, c.lt, c.sh); }
      });
    }
  }
  function drawJumbotron(r, W) {
    const x0 = 124, x1 = 244, y = -40, z0 = 50, z1 = 112;
    r.queue(184, y, z0, g => {
      const a = r.w(x0, y, z1), b = r.w(x1, y, z0), w = b[0] - a[0], h = b[1] - a[1];
      if (w < 8 || h < 8) return;
      px.rect(g, a[0] - 3, a[1] - 3, w + 6, h + 6, '#2a2a36'); px.rect(g, a[0] - 2, a[1] - 2, w + 4, h + 4, '#0a0a10');
      MT.jumbo.drawScreen(g, a[0], a[1], w, h, W);
      const tn = MT.game ? MT.game.time : 0;
      for (let i = 0; i < 24; i++) { const on = (i + Math.floor(tn * 8)) % 4 === 0; const t = i / 24; px.dot(g, a[0] - 2 + t * (w + 4), a[1] - 4, on ? '#ffcc33' : '#6a5020'); px.dot(g, a[0] - 2 + t * (w + 4), b[1] + 3, on ? '#ffcc33' : '#6a5020'); }
    }, { emissive: true });
    // the truss and lamps
    r.queue(184, -14, 40, g => { const a = r.w(-20, -14, 44), b = r.w(388, -14, 44); px.line(g, a[0], a[1], b[0], b[1], '#5a5a6a', 2); for (let i = 0; i < 10; i++) { const p = r.w(-20 + i * 45, -14, 44); px.rect(g, p[0] - 2, p[1], 5, 4, '#2a2a36'); } });
  }
  function drawMarquee(r, set) {   // chasing bulbs along the wall tops
    const s = SETS[set], tn = MT.game ? MT.game.time : 0, h = s.wall.h + .5, k = Math.floor(tn * 10);
    r.queue(184, 2, h, g => {
      for (let i = 0; i <= 46; i++) { const x = 4 + i * 7.83; if (x > 158 && x < 210) continue; const p = r.w(x, 2, h); px.dot(g, p[0], p[1], (i + k) % 3 === 0 ? s.bulbs : '#4a3a20'); }
    }, { emissive: true, bias: 1 });
    for (const xs of [2, 366]) r.queue(xs, 120, h, g => {
      for (let i = 0; i <= 30; i++) { const y = 4 + i * 7.8; if (y > 94 && y < 146) continue; const p = r.w(xs, y, h); px.dot(g, p[0], p[1], (i + k) % 3 === 0 ? s.bulbs : '#4a3a20'); }
    }, { emissive: true, bias: 1 });
  }
  function lights(r, set, W) {
    const s = SETS[set], L = MT.game.lights, tn = MT.game.time;
    for (let i = 0; i < 4; i++) {
      const a = tn * .35 + i * Math.PI / 2, x = 184 + Math.cos(a) * 110, y = 120 + Math.sin(a * 1.3) * 60;
      L.add(x, y, 0, 90, set === 'rooftop' ? .45 : .5, { color: s.lightCols[i] });
    }
    if (set === 'rooftop') { const a = Math.sin(tn * .5) * .8; L.add(184 + Math.sin(a) * 150, 60 + Math.cos(a) * 40, 0, 70, .5, { color: '#c0e8ff' }); }
    if (W && W.ratings.prime > 0 && !(MT.game.settings.reduceMotion) && Math.floor(tn * 8) % 2 === 0 && MT.game.settings.flashes !== false) L.add(184, 120, 0, 260, .25, { color: '#ffffff' });
  }
  function outside(r, set, W) {
    if (set === 'greenroom') {   // panelling, framed headshots of Lance, sofas
      for (const x of [60, 150, 230, 310]) r.queue(x, -2, 0, g => { const p = r.w(x, -2, 40); px.rect(g, p[0] - 10, p[1] - 8, 20, 16, '#c8a040'); px.rect(g, p[0] - 8, p[1] - 6, 16, 12, '#2a1a3a'); if (MT.cast && MT.cast.lance && !MT.cfg.skipRigs) MT.cast.lance.drawPortrait(g, p[0] - 7, p[1] - 6, 12, { zoom: 3 }); });
      return;
    }
    drawBleachers(r, W, set); drawCranes(r, set); drawJumbotron(r, W);
    if (set === 'rooftop') drawSkyline(r);
    if (set === 'warehouse') drawWarehouseRacks(r);
  }
  return { SETS, outside, lights, drawMarquee, get: id => SETS[id] || SETS.studio, audience };
})();

// ---------------------------------------------------------------- the jumbotron's screen (also drawn small in the lower third)
MT.jumbo = {
  drawScreen(g, x, y, w, h, W) {
    const tn = MT.game ? MT.game.time : 0, L = MT.lines && MT.lines.current;
    px.rect(g, x, y, w, h, '#0c0618');
    if (L && L.speaker && MT.cast && MT.cast.portraitOf(L.speaker) && !MT.cfg.skipRigs) {
      const rig = MT.cast.portraitOf(L.speaker), sz = Math.min(w, h) - 4;
      rig.drawPortrait(g, Math.round(x + (w - sz) / 2), Math.round(y + 2), sz, { zoom: 2.6, bg: '#2a1446' });
      E.font.text(g, MT.TEXT.speakers[L.speaker] || L.speaker, x + 3, y + h - 9, '#ffcc33', { outline: false, shadow: '#000' });
    } else if (W && W.jumboClock !== undefined && W.jumboClock !== null) {
      E.font.text(g, MT.fmtTime(W.jumboClock), x + w / 2, y + h / 2 - 7, '#ff3344', { align: 'center', scale: 2, outline: false });
    } else {
      const k = Math.floor(tn / 4) % 3;
      if (k === 0) MT.drawLogo(g, x + w / 2, y + h / 2 - 12, Math.max(1, Math.floor(w / 80)), true);
      else if (k === 1 && W) { E.font.text(g, 'RATINGS', x + w / 2, y + 6, '#2ee6ff', { align: 'center', outline: false }); E.font.text(g, String(Math.round(W.ratings.R)), x + w / 2, y + h / 2 - 4, '#ffcc33', { align: 'center', scale: 2, outline: false }); }
      else { const sp = MT.TEXT.sponsors[Math.floor(tn / 12) % MT.TEXT.sponsors.length]; E.font.text(g, sp[0], x + w / 2, y + h / 2 - 10, '#ff2e88', { align: 'center', scale: 2, outline: false }); E.font.text(g, sp[1].slice(0, 26), x + w / 2, y + h / 2 + 8, '#fff7e8', { align: 'center', font: 'tiny', outline: false }); }
    }
    for (let yy = y; yy < y + h; yy += 2) px.blend(g, .25, 'multiply', () => px.rect(g, x, yy, w, 1, '#404040'));
  }
};

// ---------------------------------------------------------------- the MASH TV logo: a CRT with bunny ears, the title in a magenta-to-gold gradient
MT.drawLogo = (g, cx, y, scale = 3, small = false) => {
  const s = scale, F = E.font, tn = MT.game ? MT.game.real : 0;
  if (!small) {
    const w = 64 * s, h = 30 * s, x = Math.round(cx - w / 2), yy = Math.round(y - 6 * s);
    px.line(g, cx - 4 * s, yy, cx - 16 * s, yy - 14 * s, '#c8d0e0', Math.max(1, s / 2)); px.line(g, cx + 4 * s, yy, cx + 14 * s, yy - 16 * s, '#c8d0e0', Math.max(1, s / 2));
    px.disc(g, cx - 16 * s, yy - 14 * s, s, '#ff3344'); px.disc(g, cx + 14 * s, yy - 16 * s, s, '#ff3344');
    px.rect(g, x - 2, yy - 2, w + 4, h + 4, '#0e0618'); px.rect(g, x, yy, w, h, '#3a1a4e'); px.rect(g, x + s * 2, yy + s * 2, w - s * 4, h - s * 6, '#140a24');
    for (let i = 0; i < 3; i++) px.disc(g, x + w - s * 6 - i * s * 4, yy + h - s * 2, s, i === 0 ? '#ffcc33' : '#7a5a8a');
    const sp = (Math.sin(tn * 3) + 1) / 2; px.dot(g, x + w - s * 4, yy + s * 3, sp > .5 ? '#ffffff' : '#ffcc33');
  }
  F.title(g, 'MASH TV', cx, y, { scale: s, align: 'center', colors: ['#ff2e88', '#ff7a5a', '#ffcc33'], outline: '#1a0a24', depth: Math.max(1, s - 1), depthColor: '#5a0a3a' });
};

// ===== 07-art-chars.js
// ---------------------------------------------------------------- characters: contestant looks, the hosts, enemy rigs and painters
MT.pk = (r, x = 184, y = 120, z = 0) => { const a = r.w(x, y, z), b = r.w(x + 10, y, z); return Math.max(.3, (b[0] - a[0]) / 10); };   // pixels per world unit
const tonesCache = {};
MT.tn = c => tonesCache[c] || (tonesCache[c] = E.tones(c));

MT.looks = (() => {
  const LOOKS = [
    { id: 'rocket', name: 'ROCKET', hair: 'short', hat: null, hairC: '#3a2414', skin: '#e8b48a', trim: '#ffffff', glove: '#1a1a22' },
    { id: 'volt', name: 'VOLT', hair: 'ponytail', hat: { style: 'band', color: '#2ee6ff' }, hairC: '#f0d070', skin: '#f2c8a0', trim: '#c8d0e0', glove: '#c8d0e0' },
    { id: 'moxie', name: 'MOXIE', hair: 'spiky', hat: { style: 'cap', color: '#1a1a22' }, hairC: '#6a2a1a', skin: '#a8724a', trim: '#ffffff', glove: '#1a1a22' },
    { id: 'goldie', name: 'GOLDIE', hair: 'long', hat: { style: 'band', color: '#ff2e88' }, hairC: '#c84a2a', skin: '#f0c098', trim: '#fff7e8', glove: '#fff7e8' }
  ];
  function make(look, color, size = 1.1) {
    const L = LOOKS[look % 4], sh = E.shade ? E.shade(color, -.35) : color;
    return new E.Humanoid({ size, build: 'heroic', weapon: 'gun', outfit: 'shirt', hair: L.hair, hat: L.hat || undefined, sleeves: 'long',
      colors: { skin: L.skin, hair: L.hairC, cloth: color, pants: color, boot: '#1a1a22', belt: '#fff7e8', trim: L.trim, glove: L.glove, metal: '#c8d0e0', hilt: '#3a3a48', eye: '#1a1424' } });
  }
  return { LOOKS, make };
})();

MT.cast = {
  lance: null, penny: null, annc: null, mashy: null, network: null,
  build() {
    if (this.lance) return;
    this.lance = new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long',
      colors: { skin: '#f0c098', hair: '#d8dce8', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff', eye: '#1a1424' }, face: { eyes: 'big' } });
    this.penny = new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', sleeves: 'long',
      colors: { skin: '#f6d0b0', hair: '#ff7ac8', cloth: '#1ab0a8', coat: '#1ab0a8', pants: '#1ab0a8', boot: '#fff7e8', trim: '#ffffff', glove: '#ffffff', eye: '#1a1424' }, face: { eyes: 'big' } });
    this.robo = new E.Humanoid({ size: 1.3, build: 'heroic', weapon: null, outfit: 'coat', hair: 'bald', sleeves: 'long',
      colors: { skin: '#9aa0b0', hair: '#5a5a6a', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff', eye: '#ff3344' }, eyeGlow: '#ff3344' });
    this.annc = (g, x, y, size) => { px.rect(g, x, y, size, size, '#1a0a24'); const c = x + size / 2, m = y + size / 2; px.disc(g, c, m, size * .32, '#3a3a48'); px.disc(g, c, m, size * .22, '#14141c'); for (let i = 0; i < 4; i++) px.rect(g, c - size * .18, m - size * .15 + i * size * .1, size * .36, 1, '#5a5a6a'); E.font.text(g, 'ANNC', c, y + size - 8, '#ffcc33', { align: 'center', font: 'tiny', outline: false }); };
    this.mashyP = (g, x, y, size) => MT.paint.mashyFace(g, x + size / 2, y + size / 2 + 2, size / 34);
    this.networkP = (g, x, y, size) => { px.rect(g, x, y, size, size, '#0a0a12'); const c = x + size / 2, m = y + size / 2; px.disc(g, c, m, size * .36, '#2a2a3a'); px.disc(g, c, m, size * .26, '#ff3344'); px.disc(g, c, m, size * .12, '#14040a'); px.dot(g, c - size * .08, m - size * .1, '#ffffff'); };
    this.sponsorP = (g, x, y, size) => { px.rect(g, x, y, size, size, '#ffcc33'); E.font.text(g, 'KRUNCH', x + size / 2, y + size / 2 - 7, '#c8202a', { align: 'center', font: 'tiny', outline: false }); E.font.text(g, '-O!', x + size / 2, y + size / 2 + 1, '#c8202a', { align: 'center', outline: false }); };
    for (const [rig, f] of [[this.lance, 0], [this.penny, .3], [this.robo, 0]]) rig.update(0, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
  },
  portraitOf(sp) {
    this.build();
    if (sp === 'LANCE') return MT.run && MT.run.lanceRobot ? this.robo : this.lance;
    if (sp === 'PENNY') return this.penny;
    return null;
  },
  drawPortrait(g, sp, x, y, size, o = {}) {
    this.build();
    const rig = this.portraitOf(sp);
    if (rig) { if (!MT.cfg.skipRigs) rig.drawPortrait(g, x, y, size, Object.assign({ zoom: 2.6, bg: '#2a1446', frame: true }, o)); return; }
    const f = { ANNC: this.annc, MASHY: this.mashyP, NETWORK: this.networkP, SPONSOR: this.sponsorP }[sp];
    if (f) f(g, x, y, size);
    else if (/^P\d$/.test(sp) && MT.W) { const c = MT.W.contestants.find(c => 'P' + (c.slot + 1) === sp); if (c && c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x, y, size, { zoom: 2.6, bg: '#2a1446', frame: true }); }
  },
  tick(dt) {   // the hosts' rigs keep blinking for their portraits
    this.build(); const talking = MT.lines && MT.lines.current;
    for (const [rig, sp] of [[this.lance, 'LANCE'], [this.penny, 'PENNY'], [this.robo, 'LANCE']]) rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: talking && talking.speaker === sp ? (Math.floor(MT.game.real * 9) % 2 ? 'shout' : 'smile') : 'smile' });
  }
};

// enemy rigs (Humanoids and Blobs), shared looks per kind
MT.enemyRig = (kind) => {
  switch (kind) {
    case 'goon': return new E.Humanoid({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#1a2448' }, sleeves: 'short',
      colors: { skin: '#d8a078', hair: '#2a1a10', cloth: '#2a3a6a', pants: '#1a2244', boot: '#0a0a10', belt: '#ffcc33', metal: '#1a1a20', hilt: '#3a3a48' } });
    case 'popper': return new E.Humanoid({ size: 1.0, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'pointed', color: '#ff2e88' },
      colors: { skin: '#f0c8a0', hair: '#c84a2a', cloth: '#ffcc33', pants: '#2ee6ff', boot: '#ff2e88' } });
    case 'mime': return new E.Humanoid({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#101014' }, sleeves: 'long',
      colors: { skin: '#f4f2f0', hair: '#101014', cloth: '#e8e8ee', trim: '#101014', pants: '#101014', boot: '#101014', glove: '#ffffff', eye: '#101014' } });
    case 'heckler': case 'hecklerKing': return new E.Humanoid({ size: kind === 'hecklerKing' ? 1.15 : .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: kind === 'hecklerKing' ? 'spiky' : 'short',
      hat: kind === 'hecklerKing' ? { style: 'crown', color: '#ffcc33' } : undefined, colors: { skin: '#e0b090', hair: '#4a2a1a', cloth: kind === 'hecklerKing' ? '#c8202a' : '#2a8a4a', pants: '#3a3a5a', boot: '#ffffff', glove: '#ffcc33' } });
    case 'brute': return new E.Humanoid({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'none',
      colors: { skin: '#8a5a2a', hair: '#6a3a1a', cloth: '#ffcc33', pants: '#8a5a2a', boot: '#5a3a1a', glove: '#8a5a2a' } });
    case 'paparazzi': return new E.Humanoid({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a3a30' },
      colors: { skin: '#e0b090', cloth: '#8a7a5a', coat: '#8a7a5a', pants: '#3a3a40', boot: '#1a1a1a' } });
    case 'clapbot': return new E.Blob({ R: 6, colors: { dk: '#4a5060', base: '#9aa4b8', lt: '#d8e0f0', spec: '#ffffff', eye: '#2ee6ff', pupil: '#0a2a3a' }, feet: true, mouth: true, face: 'front' });
    default: return null;
  }
};

// ---------------------------------------------------------------- painters for bodies that are not people (read only the render state)
MT.paint = {
  shade(g, x, y, rad, c, rs = 1) { const t = MT.tn(c); px.disc(g, x, y, rad + 1, '#140c1c'); px.disc(g, x, y, rad, t.sh); px.disc(g, x - rad * .15, y - rad * .2, rad * .78, t.base); px.disc(g, x - rad * .35, y - rad * .4, rad * .35, t.lt); px.dot(g, x - rad * .45, y - rad * .5, t.hi); },
  disco(r, e) {
    const s = e.rs, big = e.big, R = big ? 11 : 7.5;
    r.shadow(s.x, s.y, R, .4);
    r.queue(s.x, s.y, 4 + R, g => {
      const p = r.w(s.x, s.y, 4 + R), k = MT.pk(r), rad = R * k, t = MT.game.time + s.x * .01, fl = s.flash > 0;
      px.disc(g, p[0], p[1], rad + 1, '#140c1c'); px.disc(g, p[0], p[1], rad, fl ? '#ffffff' : '#7a8098');
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
        const u = i / 3.5, v = j / 3.5; if (u * u + v * v > .9) continue;
        const lit = ((i + j + Math.floor(t * 6)) % 3 + 3) % 3;
        px.rect(g, p[0] + u * rad - k, p[1] + v * rad - k, Math.max(1, k * 1.6), Math.max(1, k * 1.6), lit === 0 ? '#ffffff' : lit === 1 ? '#c8d0e0' : '#5a6078');
      }
      if (s.state === 'flare') for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); px.line(g, p[0], p[1], p[0] + Math.cos(an) * rad * 1.8, p[1] + Math.sin(an) * rad * 1.8, '#ffcc33'); }
      px.dot(g, p[0] - rad * .4, p[1] - rad * .5, '#ffffff');
    }, { emissive: s.state === 'flare' });
  },
  tank(r, e) {
    const s = e.rs, c = Math.cos(s.face), sn = Math.sin(s.face), T = MT.tn('#5a5a6a'), Y = MT.tn('#e8c020');
    r.shadow(s.x, s.y, 14, .45);
    r.queue(s.x, s.y, 0, g => {
      const P = (f, w, z) => r.w(s.x + c * f - sn * w, s.y + sn * f + c * w, z);
      const fl = s.flash > 0;
      for (const side of [-1, 1]) { const q = [P(12, side * 9, 0), P(12, side * 6, 0), P(-12, side * 6, 0), P(-12, side * 9, 0)]; px.poly(g, [P(12, side * 9, 5), P(12, side * 6, 5), P(-12, side * 6, 5), P(-12, side * 9, 5)], '#1a1a20'); px.poly(g, q, '#2a2a30');
        for (let i = 0; i < 6; i++) { const f = -12 + ((i * 4 + (e.tread || 0)) % 24); const a = P(f, side * 9, 5), b = P(f, side * 6, 5); px.line(g, a[0], a[1], b[0], b[1], '#5a5a62'); } }
      const top = [P(11, -7, 10), P(11, 7, 10), P(-11, 7, 10), P(-11, -7, 10)];
      px.poly(g, [P(11, -7, 4), P(11, 7, 4), P(11, 7, 10), P(11, -7, 10)], fl ? '#ffffff' : Y.sh); px.poly(g, top, fl ? '#ffffff' : Y.base);
      const tc = Math.cos(s.aim || s.face), ts = Math.sin(s.aim || s.face), cam = r.w(s.x, s.y, 14), lens = r.w(s.x + tc * 14, s.y + ts * 14, 15);
      px.rect(g, cam[0] - 6, cam[1] - 6, 12, 9, '#1a1a22'); px.rect(g, cam[0] - 5, cam[1] - 5, 10, 7, T.base); px.line(g, cam[0], cam[1] - 1, lens[0], lens[1], '#1a1a22', 4);
      px.disc(g, lens[0], lens[1], 3, '#1a1a22'); px.disc(g, lens[0], lens[1], 2, s.state === 'aim' ? (Math.floor(MT.game.time * 20) % 2 ? '#ffffff' : '#ff3344') : '#2ee6ff');
      px.dot(g, cam[0] + 3, cam[1] - 4, '#ff3344');
    });
    if (s.state === 'aim') r.decal(() => { const tc = Math.cos(s.aim), ts = Math.sin(s.aim); for (let d = 16; d < 200; d += 8) r.groundDisc(s.x + tc * d, s.y + ts * d, 1.2, '#ff3344', .6); });
  },
  snakeSeg(r, x, y, flash, i) {
    r.shadow(x, y, 5, .3);
    r.queue(x, y, 5, g => { const p = r.w(x, y, 5), k = MT.pk(r); MT.paint.shade(g, p[0], p[1], 4.6 * k, flash ? '#ffffff' : (i % 2 ? '#3a3a3a' : '#e8c020')); });
  },
  snakeHead(r, e) {
    const s = e.rs; r.shadow(s.x, s.y, 7, .35);
    r.queue(s.x, s.y, 6, g => {
      const p = r.w(s.x, s.y, 6 + (s.state === 'rear' ? 4 : 0)), k = MT.pk(r), c = Math.cos(s.face), sn = Math.sin(s.face);
      MT.paint.shade(g, p[0], p[1], 6.5 * k, s.flash > 0 ? '#ffffff' : '#2a2a32');
      const tip = [p[0] + c * 7 * k, p[1] + sn * 5 * k];
      px.line(g, tip[0] - sn * 2 * k, tip[1] + c * 2 * k, tip[0] + c * 4 * k - sn * 2 * k, tip[1] + sn * 3 * k + c * 2 * k, '#c8d0e0', 2);
      px.line(g, tip[0] + sn * 2 * k, tip[1] - c * 2 * k, tip[0] + c * 4 * k + sn * 2 * k, tip[1] + sn * 3 * k - c * 2 * k, '#c8d0e0', 2);
      px.disc(g, p[0] - sn * 3 * k, p[1] - 2 * k, 1.5 * k, '#ff3344'); px.disc(g, p[0] + sn * 3 * k, p[1] - 2 * k, 1.5 * k, '#ff3344');
    });
  },
  clapHands(r, e) {   // drawn over the clapbot's blob: two clapper hands and an antenna
    const s = e.rs, t = s.clap || 0;
    r.queue(s.x, s.y + .5, 10, g => {
      const p = r.w(s.x, s.y, 9), k = MT.pk(r), gap = (1 + Math.cos(t * 18)) * 2.2 * k;
      px.rect(g, p[0] - 9 * k - gap / 2, p[1] - 3 * k, 4 * k, 6 * k, '#ffcc33'); px.rect(g, p[0] + 5 * k + gap / 2, p[1] - 3 * k, 4 * k, 6 * k, '#ffcc33');
      const a = r.w(s.x, s.y, 16); px.line(g, a[0], a[1], a[0] + 2 * k, a[1] - 5 * k, '#c8d0e0'); px.disc(g, a[0] + 2 * k, a[1] - 5 * k, 1.3 * k, Math.floor(MT.game.time * 6) % 2 ? '#ff3344' : '#ffcc33');
    }, { bias: 2 });
  },
  mascotHead(r, e, rig) {   // the Cereal Killer's giant bear head and cereal-box emblem
    const s = e.rs;
    r.queue(s.x, s.y + .5, 34, g => {
      const p = r.w(s.x, s.y, 34), k = MT.pk(r), fl = s.flash > 0;
      MT.paint.shade(g, p[0], p[1] - 2 * k, 9 * k, fl ? '#ffffff' : '#9a6a3a');
      px.disc(g, p[0] - 7 * k, p[1] - 9 * k, 3 * k, '#7a4a2a'); px.disc(g, p[0] + 7 * k, p[1] - 9 * k, 3 * k, '#7a4a2a');
      px.disc(g, p[0], p[1] + 2 * k, 4 * k, '#e8c8a0'); px.dot(g, p[0], p[1] + 1 * k, '#1a0a0a');
      const angry = s.state === 'tele' || s.state === 'charge';
      px.disc(g, p[0] - 3.5 * k, p[1] - 4 * k, 1.6 * k, angry ? '#ff3344' : '#ffffff'); px.disc(g, p[0] + 3.5 * k, p[1] - 4 * k, 1.6 * k, angry ? '#ff3344' : '#ffffff');
      px.dot(g, p[0] - 3.5 * k, p[1] - 4 * k, '#000'); px.dot(g, p[0] + 3.5 * k, p[1] - 4 * k, '#000');
      const ch = r.w(s.x, s.y, 20); px.rect(g, ch[0] - 4 * k, ch[1] - 4 * k, 8 * k, 7 * k, '#c8202a'); E.font.text(g, 'K', ch[0] - 2, ch[1] - 3, '#ffcc33', { outline: false });
      if (s.state === 'stun') for (let i = 0; i < 3; i++) { const a = MT.game.time * 5 + i * 2.1; px.dot(g, p[0] + Math.cos(a) * 10 * k, p[1] - 12 * k + Math.sin(a) * 3 * k, '#ffcc33'); }
    }, { bias: 3 });
  },
  partyHorn(r, e) {   // the popper's swelling party popper (drawn over its rig)
    const s = e.rs, sw = s.state === 'fuse' ? 1 + (s.t || 0) * 1.2 : 1;
    r.queue(s.x, s.y + .5, 14, g => {
      const p = r.w(s.x, s.y, 13), k = MT.pk(r) * sw;
      px.poly(g, [[p[0] - 5 * k, p[1] + 3 * k], [p[0] + 5 * k, p[1] + 3 * k], [p[0], p[1] - 7 * k]], s.flash > 0 || (s.state === 'fuse' && Math.floor(MT.game.time * 16) % 2) ? '#ffffff' : '#ff2e88');
      px.line(g, p[0] - 3 * k, p[1], p[0] + 3 * k, p[1] - 2 * k, '#ffcc33'); px.line(g, p[0] - 2 * k, p[1] - 3 * k, p[0] + 2 * k, p[1] - 5 * k, '#2ee6ff');
      if (s.state === 'fuse') { const f = [p[0] + Math.sin(MT.game.time * 30) * 2, p[1] - 8 * k]; px.dot(g, f[0], f[1], '#ffffff'); px.dot(g, f[0] + 1, f[1] - 1, '#ffcc33'); }
    }, { bias: 2, emissive: s.state === 'fuse' });
  },
  foamFinger(r, e) {
    const s = e.rs;
    r.queue(s.x, s.y + .5, 20, g => { const p = r.w(s.x + Math.cos(s.face + 1.2) * 5, s.y + Math.sin(s.face + 1.2) * 5, 22), k = MT.pk(r); px.rect(g, p[0] - 2 * k, p[1] - 6 * k, 4 * k, 7 * k, '#ffcc33'); px.rect(g, p[0] - .8 * k, p[1] - 10 * k, 2 * k, 4 * k, '#ffcc33'); E.font.text(g, '1', p[0] - 1, p[1] - 5 * k, '#c8202a', { font: 'tiny', outline: false }); }, { bias: 2 });
  },
  crate(r, e) {
    const s = e.rs, C = MT.tn(s.flash > 0 ? '#ffffff' : '#c84a2a'), R = MT.tn('#ffcc33');
    r.shadow(s.x, s.y, 9, .4);
    r.queue(s.x, s.y, 0, g => { r.box(g, s.x - 8, s.y - 8, 0, s.x + 8, s.y + 8, 14 - (1 - (s.hp / s.max)) * 3, C.lt, C.sh); const a = r.w(s.x, s.y - 8, 14), b = r.w(s.x, s.y + 8, 14); px.line(g, a[0], a[1], b[0], b[1], R.base, 2); const c1 = r.w(s.x, s.y + 8, 0), c2 = r.w(s.x, s.y + 8, 14); px.line(g, c1[0], c1[1], c2[0], c2[1], R.base, 2); const t = r.w(s.x, s.y, 15); px.disc(g, t[0] - 3, t[1] - 2, 2.5, R.lt); px.disc(g, t[0] + 3, t[1] - 2, 2.5, R.lt); });
  },
  lock(r, e) {
    const s = e.rs;
    r.queue(s.x, s.y, 0, g => { const p = r.w(s.x, s.y, 16), k = MT.pk(r); px.rect(g, p[0] - 5 * k, p[1] - 6 * k, 10 * k, 12 * k, '#1a1a22'); px.rect(g, p[0] - 4 * k, p[1] - 5 * k, 8 * k, 10 * k, s.flash > 0 ? '#ffffff' : '#c8d0e0'); px.disc(g, p[0], p[1], 2.5 * k, '#3a3a48'); px.rect(g, p[0] - 4 * k, p[1] + 3 * k, 8 * k * (s.hp / s.max), 1.5 * k, '#22c55e'); });
  }
};

// ===== 08-sprites.js
// ---------------------------------------------------------------- string sprites: pickups, prizes, icons
MT.spr = (() => {
  const S = (rows, pal) => E.sprite(rows, pal);
  const spr = {
    bill: S(['gggggggggg', 'gGGGGGGGGg', 'gGgG$$GgGg', 'gGGGGGGGGg', 'gggggggggg'], { g: '#2a8a3a', G: '#7ad88a', $: '#fff7a0' }),
    stack: S(['.gggggggg.', 'gGGGGGGGGg', 'gGGyyyyGGg', 'gggggggggg', 'gGGGGGGGGg', 'gggggggggg'], { g: '#2a7a3a', G: '#8ae09a', y: '#ffcc33' }),
    gold: S(['..hhhhhh..', '.hYYYYYYh.', 'hYYYwYYYYh', 'yyyyyyyyyy', 'yoooooooyy'], { h: '#fff4b0', Y: '#ffd040', w: '#ffffff', y: '#d8a020', o: '#a07010' }),
    case: S(['...kkkk...', '..k....k..', 'ssssssssss', 'sSSSSSSSSs', 'sSSS$$SSSs', 'sSSSSSSSSs', 'ssssssssss'], { k: '#5a5a6a', s: '#6a7080', S: '#d8e0f0', $: '#2a8a3a' }),
    key: S(['.yyy......', 'y...y.....', 'y.w.yyyyyy', 'y...y..y.y', '.yyy...y..'], { y: '#ffcc33', w: '#ffffff' }),
    bulb: S(['.www.', 'wWWWw', 'wWyWw', '.www.', '.sss.', '.sss.'], { w: '#c8d0e0', W: '#ffffff', y: '#ffe060', s: '#6a6a7a' }),
    star: S(['....y....', '...yYy...', 'yyyYYYyyy', '.yYYYYYy.', '..yYYYy..', '.yYy.yYy.', '.yy...yy.'], { y: '#e8a020', Y: '#ffe060' }),
    statue: S(['...yy...', '..yYYy..', '..yYYy..', '.yyYYyy.', 'y.yYYy.y', '..yYYy..', '..yYYy..', '..yYYy..', '.yyyyyy.', 'kkkkkkkk', 'kKKKKKKk'], { y: '#d8a020', Y: '#ffe060', k: '#3a2a1a', K: '#6a4a2a' }),
    tomatoSplat: null
  };
  const BOX = ['.b..b.', 'bbbbbb', 'cccccc', 'cCcCcc', 'cccccc', 'cccccc'];
  spr.prizeR = S(BOX, { b: '#ffcc33', c: '#c8202a', C: '#ff6a6a' });
  spr.prizeB = S(BOX, { b: '#ffffff', c: '#2a5ac8', C: '#6a9aff' });
  spr.prizeG = S(BOX, { b: '#c8202a', c: '#d8a020', C: '#fff0a0' });
  // 12x12 prize icons: a handful of silhouettes, each prize picks one with its colors
  const ICONS = {
    toaster: ['............', '...ww..ww...', '..wwwwwwww..', '.mmmmmmmmmm.', '.mMMMMMMMMm.', '.mMMMMMMMMmk', '.mMMMMMMMMmk', '.mmmmmmmmmm.', '..d......d..'],
    blender: ['....kkkk....', '...cCCCCc...', '...cCCCCc...', '....cCCc....', '....cCCc....', '...mmmmmm...', '...mMMMMm...', '...mmmmmm...'],
    box: ['............', '..cccccccc..', '.cCCCCCCCCc.', '.cCCwwCCCCc.', '.cCCCCCCCCc.', '.cccccccccc.', '..k......k..'],
    vehicle: ['............', '....cccc....', '...cCCCCc...', '.mmmmmmmmmm.', 'mMMMMMMMMMMm', 'mmmmmmmmmmmm', '.kk......kk.', '.kk......kk.'],
    robot: ['....kkkk....', '...mMMMMm...', '...mwMMwm...', '...mMMMMm...', '..cccccccc..', '..cCCCCCCc..', '..cCCCCCCc..', '...k....k...', '...k....k...'],
    screen: ['kkkkkkkkkkkk', 'kCCCCCCCCCCk', 'kCwCCCCCCCCk', 'kCCCCCCCCCCk', 'kCCCCCCCCCCk', 'kkkkkkkkkkkk', '.....mm.....', '...mmmmmm...'],
    gem: ['....wwww....', '...wCCCCw...', '..wCCwCCCw..', '...cCCCCc...', '....cCCc....', '.....cc.....'],
    moon: ['....yyyy....', '..yyYYYYyy..', '.yYYYcYYYYy.', '.yYYYYYYcYy.', '.yYcYYYYYYy.', '..yyYYYYyy..', '....yyyy....']
  };
  const cache = {};
  spr.icon = (shape, c1, c2) => { const k = shape + c1 + c2; return cache[k] || (cache[k] = S(ICONS[shape] || ICONS.box, { c: E.tones(c1).sh, C: c1, m: E.tones(c2).sh, M: c2, w: '#ffffff', k: '#1a1424', d: '#3a3a48', y: '#d8a020', Y: '#ffe060' })); };
  return spr;
})();

// ---------------------------------------------------------------- the power-up capsule: a mini TV showing the power-up's letter
MT.drawCapsule = (g, x, y, wid, k = 1, t = 0) => {
  const W = MT.WEAPONS[wid] || MT.ADDONS[wid] || { letter: '?', color: '#ffffff' };
  px.rect(g, x - 6 * k, y - 5 * k, 12 * k, 10 * k, '#14101c');
  px.rect(g, x - 5 * k, y - 4 * k, 10 * k, 8 * k, '#c8d0e0');
  px.rect(g, x - 4 * k, y - 3 * k, 8 * k, 6 * k, Math.floor(t * 4) % 2 ? W.color : E.tones(W.color).sh);
  E.font.text(g, W.letter, x - E.font.width(W.letter) * k / 2 + .5, y - 3 * k, '#14101c', { scale: k, outline: false });
  px.line(g, x - 2 * k, y - 5 * k, x - 4 * k, y - 8 * k, '#c8d0e0'); px.line(g, x + 2 * k, y - 5 * k, x + 4 * k, y - 8 * k, '#c8d0e0');
};

// ===== 10-arena.js
// ---------------------------------------------------------------- the arena: a 23 x 15 studio room, four doors, hazards, the camera fit
MT.Arena = class Arena {
  constructor(setId) {
    this.setId = setId; const S = MT.sets.get(setId); this.set = S;
    const rows = [];
    for (let y = 0; y < AR.rows; y++) {
      let row = '';
      for (let x = 0; x < AR.cols; x++) {
        const edge = x === 0 || y === 0 || x === AR.cols - 1 || y === AR.rows - 1;
        const door = (y === 0 || y === AR.rows - 1) && x >= 10 && x <= 12 || (x === 0 || x === AR.cols - 1) && y >= 6 && y <= 8;
        row += edge && !door ? (y === AR.rows - 1 ? '_' : '#') : '.';
      }
      rows.push(row);
    }
    const wall = Object.assign({}, S.wall);
    this.map = MT.game && MT.game.headless ? null : new E.TileMap({ rows, legend: { '#': 1, '_': 2 },
      types: { 1: Object.assign({}, wall, { cut: false }), 2: Object.assign({}, wall, { cut: true, cutH: 4 }) }, floorTex: (x, y) => S.floor(x, y), outside: S.outside, ao: 4 });
    this.doors = {};
    for (const d of ['N', 'E', 'S', 'W']) this.doors[d] = { dir: d, state: 'closed', t: 0, open: 0, queue: [], gapT: 0, idle: 0, dest: null, label: '', icon: '', beacon: 0 };
    this.hazards = { conveyor: null, vents: null };
    this.splats = []; this.scorches = []; this.confetti = [];
    this.cage = null; this.pedestals = []; this.safe = null;
  }
  // ------------------------------------------------ doors
  door(d) { return this.doors[d]; }
  queueSpawn(d, kind, n, gap = .25, opts = {}) {
    const D = this.doors[d]; if (!D) return;
    for (let i = 0; i < n; i++) D.queue.push({ kind, gap: gap * MT.T.spawnGap, opts });
    if (D.state === 'closed' || D.state === 'closing') { D.state = 'opening'; D.t = 0; MT.emit('door', { d, state: 'opening' }); }
  }
  setExit(d, dest, label, icon) { const D = this.doors[d]; D.queue.length = 0; D.state = 'exit'; D.t = 0; D.dest = dest; D.label = label; D.icon = icon; }
  closeAll() { for (const d in this.doors) { const D = this.doors[d]; D.queue.length = 0; if (D.state !== 'closed') { D.state = 'closing'; D.t = 0; } } }
  slam(d) { const D = this.doors[d]; if (D) { D.state = 'closing'; D.t = 0; D.queue.length = 0; } }
  openFor(d) { const D = this.doors[d]; if (D) { D.state = 'open'; D.open = 1; D.idle = 0; } }
  update(dt, W) {
    for (const d in this.doors) {
      const D = this.doors[d]; D.t += dt; D.beacon += dt;
      if (D.state === 'opening') { D.open = Math.min(1, D.t / .35); if (D.t >= .35) { D.state = 'open'; D.t = 0; D.gapT = 0; D.idle = 0; } }
      else if (D.state === 'open') {
        D.open = 1;
        if (D.queue.length) { D.gapT -= dt; if (D.gapT <= 0) { const q = D.queue.shift(); D.gapT = q.gap; W.spawnAtDoor(q.kind, d, q.opts); D.idle = 0; } }
        else { D.idle += dt; if (D.idle > .6 && !D.hold) { D.state = 'closing'; D.t = 0; MT.emit('door', { d, state: 'closing' }); } }
      } else if (D.state === 'closing') { D.open = Math.max(0, 1 - D.t / .3); if (D.t >= .3) { D.state = 'closed'; D.open = 0; if (D.queue.length) { D.state = 'opening'; D.t = 0; } } }
      else if (D.state === 'exit') D.open = Math.min(1, D.open + dt * 3);
      else D.open = 0;
    }
    // hazards
    const cv = this.hazards.conveyor;
    if (cv) {
      cv.t += dt; cv.scroll += dt * cv.speed * cv.dirMul;
      if (!cv.warning && cv.t > 10.5) { cv.warning = true; MT.emit('conveyorWarn', {}); }
      if (cv.warning) cv.speed = Math.max(.15, 1 - (cv.t - 10.5) / 1.5);
      if (cv.t >= 12) { cv.t = 0; cv.dirMul *= -1; cv.warning = false; cv.speed = 1; }
    }
    const vt = this.hazards.vents;
    if (vt) {
      vt.t += dt;
      for (const v of vt.list) { if (v.tele > 0) { v.tele -= dt; if (v.tele <= 0) { v.fire = 1.2; MT.emit('pyro', { x: v.x, y: v.y }); } } else if (v.fire > 0) v.fire -= dt; }
      if (!vt.burst && vt.t >= vt.every) { vt.t = 0; this.fireVents(vt.patterns[vt.k++ % vt.patterns.length]); }
    }
    for (const s of this.splats) s.t -= dt; E.prune(this.splats, s => s.t <= 0);
    for (const s of this.scorches) s.t -= dt; E.prune(this.scorches, s => s.t <= 0);
    for (const s of this.confetti) s.t -= dt; E.prune(this.confetti, s => s.t <= 0);
    if (this.cage && this.cage.lift) this.cage.h = Math.max(0, this.cage.h - dt * 40);
  }
  // conveyor belts: interior row pairs, each pushing at 40 u/s
  addConveyor(rows, dirs) { this.hazards.conveyor = { rows, dirs, t: 0, speed: 1, dirMul: 1, scroll: 0, warning: false }; }
  conveyorPush(o) {
    const cv = this.hazards.conveyor; if (!cv) return 0;
    for (let i = 0; i < cv.rows.length; i++) { const y0 = 16 + cv.rows[i] * 16, y1 = y0 + 32; if (o.y >= y0 && o.y < y1) return cv.dirs[i] * cv.dirMul * cv.speed * 40; }
    return 0;
  }
  addVents(cxs, cys, patterns, every = 3.5) {
    const list = []; for (const cy of cys) for (const cx of cxs) { const [x, y] = MT.cell(cx, cy); list.push({ cx, cy, x, y, tele: 0, fire: 0, ci: cxs.indexOf(cx), ri: cys.indexOf(cy) }); }
    this.hazards.vents = { list, patterns, every, t: 1.5, k: 0, cols: cxs.length, rowsN: cys.length };
  }
  fireVents(pattern, tele = 1) {
    const vt = this.hazards.vents; if (!vt) return;
    const lane = MT.Ri(0, vt.cols - 1, 'spawn'), row = MT.Ri(0, vt.rowsN - 1, 'spawn'), col = MT.Ri(0, vt.cols - 1, 'spawn');
    for (const v of vt.list) {
      const on = pattern === 'all' || pattern === 'rows' && v.ri === row || pattern === 'cols' && v.ci === col || pattern === 'checker' && ((v.ci + v.ri + vt.k) & 1) === 0 || pattern === 'allButLane' && v.ci !== lane;
      if (on && v.tele <= 0 && v.fire <= 0) { v.tele = tele; }
    }
    MT.emit('ventTele', {});
  }
  ventAt(x, y) { const vt = this.hazards.vents; if (!vt) return null; for (const v of vt.list) if (v.fire > 0 && Math.hypot(x - v.x, y - v.y) < 12) return v; return null; }
  splatAt(x, y) { for (const s of this.splats) if (Math.hypot(x - s.x, y - s.y) < 14) return s; return null; }
  addSplat(x, y) { this.splats.push({ x, y, t: 6, r: 14 }); if (this.splats.length > 24) this.splats.shift(); }
  // ------------------------------------------------ contestants keep to the interior, except through an exit door
  clampContestant(c) {
    const m = c.r || 6; let lx0 = AR.x0 + m, lx1 = AR.x1 - m, ly0 = AR.y0 + m, ly1 = AR.y1 - m;
    for (const d in this.doors) {
      const D = this.doors[d]; if (D.state !== 'exit') continue;
      const P = AR.doors[d];
      if ((d === 'N' || d === 'S') && Math.abs(c.x - P.x) < 22 - m) { if (d === 'N') ly0 = -30; else ly1 = AR.H + 30; }
      if ((d === 'E' || d === 'W') && Math.abs(c.y - P.y) < 22 - m) { if (d === 'W') lx0 = -30; else lx1 = AR.W + 30; }
    }
    // outside the interior (in a door's passage) the walls either side still hold
    if (c.y < AR.y0 || c.y > AR.y1) { const P = AR.doors[c.y < AR.y0 ? 'N' : 'S']; lx0 = Math.max(lx0, P.x - 22 + m); lx1 = Math.min(lx1, P.x + 22 - m); }
    if (c.x < AR.x0 || c.x > AR.x1) { const P = AR.doors[c.x < AR.x0 ? 'W' : 'E']; ly0 = Math.max(ly0, P.y - 22 + m); ly1 = Math.min(ly1, P.y + 22 - m); }
    c.x = clamp(c.x, lx0, lx1); c.y = clamp(c.y, ly0, ly1);
  }
  exitHit(c) {
    for (const d in this.doors) {
      const D = this.doors[d]; if (D.state !== 'exit') continue;
      if (d === 'N' && c.y < 4 || d === 'S' && c.y > AR.H - 4 || d === 'W' && c.x < 4 || d === 'E' && c.x > AR.W - 4) return d;
    }
    return null;
  }
  // ------------------------------------------------ the camera: fit the walled arena to the screen
  fitCamera(game, force) {
    const g = game; if (g.headless) return;
    const r = g.r, W = r ? r.W : g.W, H = r ? r.H : g.H;
    if (!force && this._fit && this._fit[0] === W && this._fit[1] === H && this._fit[2] === MT.T.camZoom && this._fit[3] === g.baseView) return;
    this._fit = [W, H, MT.T.camZoom, g.baseView];
    const v = g.baseView || g.view, b = this.map.bounds(v), bw = b.x1 - b.x0 - 16, bh = b.y1 - b.y0 - 16;
    const z = clamp(Math.min((W - 6) / bw, (H - 58) / bh), .4, 1.6) * MT.T.camZoom;
    g.setZoom(clamp(z, .5, 3));
  }
  // ------------------------------------------------ drawing
  draw(r, W) {
    const S = this.set, tn = MT.game.time;
    if (this.map) this.map.drawFloor(r);
    // decals: belts, vents, splats, scorch marks, confetti
    r.decal(() => {
      const cv = this.hazards.conveyor;
      if (cv) for (let i = 0; i < cv.rows.length; i++) {
        const y0 = 16 + cv.rows[i] * 16, dir = cv.dirs[i] * cv.dirMul;
        r.groundDisc(184, y0 + 16, 1, '#000', 0);
        for (let x = 16; x < 352; x += 4) for (const yy of [y0 + 1, y0 + 31]) r.groundDisc(x + 2, yy, 1.4, '#1a1a1a', .9);
        for (let x = 0; x < 336; x += 14) { const xx = 16 + ((x + cv.scroll * 1 + 1000 * 14) % 336); const c = cv.warning && Math.floor(tn * 8) % 2 ? '#ff3344' : '#e8c020'; r.groundArc(xx, y0 + 16, 4, 9, dir > 0 ? -0.6 : Math.PI - .6, dir > 0 ? .6 : Math.PI + .6, c, .55); }
      }
      const vt = this.hazards.vents;
      if (vt) for (const v of vt.list) { r.groundRing(v.x, v.y, 9, '#5a5a62', 1); r.groundDisc(v.x, v.y, 8, '#1a1a22', .9); if (v.tele > 0) r.groundDisc(v.x, v.y, 12 * (1 - v.tele) + 3, '#ff6a20', .6); }
      for (const s of this.splats) r.groundDisc(s.x, s.y, s.r * Math.min(1, s.t), '#c8202a', .6);
      for (const s of this.scorches) r.groundDisc(s.x, s.y, s.r, '#14100c', Math.min(.6, s.t / 4));
      for (const s of this.confetti) r.groundDisc(s.x, s.y, 1.2, s.c, Math.min(1, s.t / 3));
      if (this.cage) r.groundRing(AR.cx, AR.cy, 14, '#ffcc33', 1);
    });
    // pyro flames
    const vt = this.hazards.vents;
    if (vt) for (const v of vt.list) if (v.fire > 0) {
      r.queue(v.x, v.y, 0, g => { const k = MT.pk(r); for (let i = 0; i < 6; i++) { const p = r.w(v.x + Math.sin(tn * 20 + i) * 4, v.y + Math.cos(tn * 17 + i) * 4, 6 + i * 6 + Math.sin(tn * 30 + i) * 3); px.disc(g, p[0], p[1], (7 - i) * k, i < 2 ? '#ffffff' : i < 4 ? '#ffcc33' : '#ff6a20'); } }, { emissive: true });
      MT.game.lights.add(v.x, v.y, 10, 50, .8, { color: '#ff8a30' });
    } else if (v.tele > 0 && Math.floor(tn * 10) % 2) MT.game.particles.sparks && MT.fxr() < .1 && MT.game.particles.sparks(v.x, v.y, 2, 1, -Math.PI / 2);
    // doors: shutters, beacons, exit signs
    for (const d in this.doors) this.drawDoor(r, this.doors[d], S);
    MT.sets.drawMarquee(r, this.setId);
    if (this.map) this.map.queueWalls(r);
    // the prize cage (1-4)
    if (this.cage && this.cage.h > 0) r.queue(AR.cx, AR.cy + 14, 0, g => { const h = this.cage.h; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = AR.cx + Math.cos(a) * 14, y = AR.cy + Math.sin(a) * 14; const p0 = r.w(x, y, 0), p1 = r.w(x, y, h); px.line(g, p0[0], p0[1], p1[0], p1[1], '#ffcc33', 1); } const t = r.groundPts ? null : null; const top = r.w(AR.cx, AR.cy, h); px.rect(g, top[0] - 12, top[1] - 1, 24, 2, '#ffcc33'); });
    for (const p of this.pedestals) r.queue(p.x, p.y, 0, g => { const T = MT.tn('#c8d0e0'); r.box(g, p.x - 7, p.y - 7, 0, p.x + 7, p.y + 7, 5, T.lt, T.sh); }, { bias: -1 });
    if (this.safe) this.drawSafe(r);
  }
  drawDoor(r, D, S) {
    const P = AR.doors[D.dir], horiz = D.dir === 'N' || D.dir === 'S', h = S.wall.h, sh = MT.tn(S.shutter[0]), tn = MT.game.time;
    const x0 = horiz ? P.x - 24 : P.x - 8, x1 = horiz ? P.x + 24 : P.x + 8, y0 = horiz ? P.y - 8 : P.y - 24, y1 = horiz ? P.y + 8 : P.y + 24;
    const hz = h * (1 - D.open);
    if (D.dir === 'S' && hz > 4) { /* the south door is cut down for the camera like its wall */ }
    const top = D.dir === 'S' ? Math.min(hz, 4) : hz;
    if (top > .5) r.queue(P.x, P.y, 0, g => {
      r.box(g, x0, y0, h - top, x1, y1, h, sh.lt, sh.sh);
      for (let k = 1; k < 5; k++) { const z = h - top + top * k / 5; const a = r.w(horiz ? x0 : P.x + P.nx * 8, horiz ? P.y + P.ny * 8 : y0, z), b = r.w(horiz ? x1 : P.x + P.nx * 8, horiz ? P.y + P.ny * 8 : y1, z); px.line(g, a[0], a[1], b[0], b[1], sh.deep); }
    }, { occluder: true });
    // hazard stripes on the threshold, the frame posts
    r.decal(() => { for (let k = -2; k <= 2; k++) r.groundDisc(P.x + (horiz ? k * 9 : P.nx * 10), P.y + (horiz ? P.ny * 10 : k * 9), 2.2, k & 1 ? '#1a1a1a' : '#e8c020', .8); });
    // beacons
    const exit = D.state === 'exit', red = D.state === 'opening' || D.state === 'open', bz = h + 4;
    const bx = P.x + (horiz ? 28 : 0), by = P.y + (horiz ? 0 : -28);
    if (exit || red) {
      const on = Math.floor(D.beacon * 6) % 2 === 0;
      r.queue(bx, by, bz, g => { const p = r.w(bx, by, bz); px.disc(g, p[0], p[1], 2.5, on ? (exit ? '#22ff66' : '#ff3344') : (exit ? '#0a5a2a' : '#5a0a14')); }, { emissive: true });
      if (on) MT.game.lights.add(P.x + P.nx * 20, P.y + P.ny * 20, 4, 46, .6, { color: exit ? '#40ff80' : '#ff3040' });
    }
    if (exit && D.label) {
      const sx = P.x + P.nx * 2, sy = P.y + P.ny * 2;
      r.queue(sx, sy, h + 12, g => {
        const p = r.w(sx, sy, h + 12), L = D.label, w = E.font.width(L) + 18;
        px.rect(g, p[0] - w / 2 - 1, p[1] - 7, w + 2, 14, '#0a2a14'); px.rect(g, p[0] - w / 2, p[1] - 6, w, 12, '#14401e');
        E.font.text(g, L, p[0] - w / 2 + 14, p[1] - 3, Math.floor(tn * 3) % 2 ? '#a0ffb0' : '#ffffff', { outline: false });
        MT.hud && MT.hud.roomIcon(g, p[0] - w / 2 + 3, p[1] - 4, D.icon);
      }, { emissive: true, bias: 20 });
    }
  }
  drawSafe(r) {
    const s = this.safe;
    r.queue(72, 6, 0, g => { const T = MT.tn('#5a6070'); r.box(g, 20, 2, 0, 124, 15, 26, T.lt, T.sh); if (s.open) { const a = r.w(30, 16, 4), b = r.w(114, 16, 24); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], '#14101c'); } else { const p = r.w(72, 16, 13); px.disc(g, p[0], p[1], 6, '#c8d0e0'); px.disc(g, p[0], p[1], 4, '#3a3a48'); } }, { bias: -2 });
  }
};

// ===== 11-contestant.js
// ---------------------------------------------------------------- the contestant (a player): move, aim, fire, slide, Showstopper, Showboat
MT.DIFF = {
  ROOKIE: { hp: 5, lives: 5, enemySpeed: .85, bullets: .8, wave: .8, label: 'ROOKIE', desc: 'MORE HEALTH, MORE LIVES, SLOWER FOES.' },
  CONTESTANT: { hp: 3, lives: 3, enemySpeed: 1, bullets: 1, wave: 1, label: 'CONTESTANT', desc: 'THE SHOW AS THE NETWORK INTENDED.' },
  CHAMPION: { hp: 1, lives: 3, enemySpeed: 1.15, bullets: 1, wave: 1.2, label: 'CHAMPION', desc: 'ONE HIT AND YOU ARE MASHED. FOR LEGENDS.' }
};
MT.diff = () => MT.DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'];
MT.maxHp = () => MT.T.hpPerLife || MT.diff().hp;
MT.startLives = () => MT.T.startLives || MT.diff().lives;
MT.EXTRA_LIVES = [250000, 750000, 1500000, 3000000];

MT.Contestant = class Contestant {
  constructor(slot, o = {}) {
    this.id = slot; this.slot = slot; this.look = o.look !== undefined ? o.look : slot; this.color = MT.COLORS.p[slot % 4];
    this.name = o.name || MT.looks.LOOKS[this.look % 4].name; this.input = o.input || null; this.ctl = o.ctl || 'local';
    this.x = AR.cx; this.y = AR.cy; this.z = 0; this.vx = 0; this.vy = 0; this.kvx = 0; this.kvy = 0; this.r = 6;
    this.facing = -Math.PI / 2; this.aim = -Math.PI / 2;
    this.hp = MT.maxHp(); this.lives = MT.startLives(); this.cash = 0; this.bombs = 2;
    this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    this.state = 'play'; this.t = 0; this.invuln = 0; this.slideT = 0; this.slideCd = 0; this.slideDir = [0, -1]; this.fireCd = 0;
    this.boat = 0; this.boatCd = 0; this.boatPose = 0; this.boatHit = false; this.hurtT = 0; this.arrowT = 3;
    this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.nextLife = 0; this.firing = false; this.laserOn = false;
    this.bot = null; this.intent = MT.NOINTENT(); this.walk = null; this.landT = 0; this.godMode = false;
    this.rig = MT.looks.make(this.look, this.color);
  }
  get alive() { return this.state === 'play' || this.state === 'walkin' || this.state === 'drop'; }
  get canBeHit() { return this.state === 'play'; }
  setLook(look) { this.look = look; this.rig = MT.looks.make(look, this.color); if (!this.named) this.name = MT.looks.LOOKS[look % 4].name; }
  resetRun() { this.hp = MT.maxHp(); this.lives = MT.startLives(); this.cash = 0; this.bombs = 2; this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 }; this.prizes = []; this.kills = 0; this.deaths = 0; this.boatGain = 0; this.nextLife = 0; this.state = 'play'; }
  placeWalkIn(entry, k, n) {
    const P = AR.doors[entry] || AR.doors.S, off = (k - (n - 1) / 2) * 16;
    const sx = P.x + (P.nx === 0 ? off : 0) - P.nx * 16, sy = P.y + (P.ny === 0 ? off : 0) - P.ny * 16;
    const tx = P.x + P.nx * 46 + (P.nx === 0 ? (k % 2 ? 9 : -9) : (k >= 2 ? 10 : -10)) + (P.nx === 0 ? 0 : 0), ty = P.y + P.ny * 46 + (P.ny === 0 ? (k % 2 ? 9 : -9) : (k >= 2 ? -10 : 10));
    this.x = sx; this.y = sy; this.z = 0; this.walk = { sx, sy, tx: tx + (P.nx === 0 ? (k - 1.5) * 4 : 0), ty, t: 0 };
    if (this.state !== 'out' && this.state !== 'gone') { this.state = 'walkin'; this.t = 0; }
    this.facing = Math.atan2(P.ny, P.nx); this.aim = this.facing; this.invuln = 1.2; this.arrowT = 3; this.slideT = 0; this.boat = 0;
  }
  update(dt, it, W) {
    this.t += dt; this.intent = it;
    const T = MT.T;
    for (const k in this.addons) if (this.addons[k] > 0) { this.addons[k] -= dt; if (this.addons[k] <= 0) { this.addons[k] = 0; W.event('addonEnd', { slot: this.slot, k }); } }
    if (this.wpn !== 'blaster') { this.wpnT -= dt; if (this.wpnT <= 0) { this.wpn = 'blaster'; this.wpnT = 0; W.event('wpnEnd', { slot: this.slot }); } }
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.arrowT = Math.max(0, this.arrowT - dt);
    this.slideCd = Math.max(0, this.slideCd - dt); this.fireCd -= dt; this.boatCd = Math.max(0, this.boatCd - dt); this.landT = Math.max(0, this.landT - dt);
    this.firing = false; this.laserOn = false;
    if (this.state === 'walkin') {
      const w = this.walk; w.t += dt; const u = Math.min(1, w.t / 1.2);
      const nx = lerp(w.sx, w.tx, MT.ease.outQuad(u)), ny = lerp(w.sy, w.ty, MT.ease.outQuad(u));
      this.vx = (nx - this.x) / Math.max(dt, 1e-4); this.vy = (ny - this.y) / Math.max(dt, 1e-4); this.x = nx; this.y = ny;
      if (u >= 1) { this.state = 'play'; this.vx = this.vy = 0; }
      return this.pose(dt);
    }
    if (this.state === 'dead') {
      this.vx = this.vy = 0;
      if (this.t >= 2) { if (this.lives > 0) this.respawn(W); else { this.state = 'out'; this.t = 0; W.event('out', { slot: this.slot }); } }
      return this.pose(dt);
    }
    if (this.state === 'drop') {
      const u = Math.min(1, this.t / .5); this.z = 70 * (1 - MT.ease.inQuad(u));
      if (u >= 1) { this.z = 0; this.state = 'play'; this.invuln = 2.5; this.landT = .3; if (this.rig && this.rig.land) this.rig.land(.6); W.event('landed', { slot: this.slot, x: this.x, y: this.y }); }
      return this.pose(dt);
    }
    if (this.state === 'out') {
      if (it.start) W.continueContestant(this);
      return;
    }
    if (this.state === 'gone') return;
    // ---- play
    let mx = it.move[0], my = it.move[1]; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    if (this.boat > 0) {
      this.boat -= dt; mx = my = 0;
      if (this.boat <= 0) { this.boat = 0; if (!this.boatHit) W.showboatDone(this); }
    } else if (it.showboat && this.boatCd <= 0 && this.slideT <= 0) { this.boat = .6; this.boatCd = 3; this.boatHit = false; this.boatPose = (this.boatPose + 1) % 3; W.event('boatStart', { slot: this.slot }); }
    if (it.slide && this.slideCd <= 0 && this.boat <= 0) {
      this.slideDir = ml > .2 ? [mx / Math.max(ml, 1e-3) * (ml > 1 ? 1 : 1), my / Math.max(ml, 1e-3)] : [Math.cos(this.facing), Math.sin(this.facing)];
      const L = Math.hypot(this.slideDir[0], this.slideDir[1]) || 1; this.slideDir = [this.slideDir[0] / L, this.slideDir[1] / L];
      this.slideT = .28; this.slideCd = T.slideCooldown * (this.addons.speed > 0 ? .6 : 1); W.event('slide', { slot: this.slot, x: this.x, y: this.y });
    }
    let spd = T.playerSpeed * (this.addons.speed > 0 ? 1.45 : 1);
    if (W.arena.splatAt(this.x, this.y)) spd *= .6;
    if (this.slideT > 0) { this.slideT -= dt; this.vx = this.slideDir[0] * T.slideSpeed; this.vy = this.slideDir[1] * T.slideSpeed; }
    else { this.vx = mx * spd; this.vy = my * spd; }
    const push = W.arena.conveyorPush(this);
    this.x += (this.vx + this.kvx + push) * dt; this.y += (this.vy + this.kvy) * dt;
    const kd = Math.exp(-dt * 10); this.kvx *= kd; this.kvy *= kd;
    if (!(MT.CHEATS.noclip && this.ctl === 'local' && this.slot === 0)) W.arena.clampContestant(this);
    for (const e of W.solids) { const d = MT.dist(this, e), m = this.r + e.r; if (d < m && d > 0) { this.x = e.x + (this.x - e.x) / d * m; this.y = e.y + (this.y - e.y) / d * m; } }
    if (W.arena.cage && W.arena.cage.h > 10) { const d = Math.hypot(this.x - AR.cx, this.y - AR.cy); if (d < 20 && d > 0) { this.x = AR.cx + (this.x - AR.cx) / d * 20; this.y = AR.cy + (this.y - AR.cy) / d * 20; } }
    if (it.aim !== null && it.aim !== undefined) this.aim = it.aim;
    if (it.fire && this.boat <= 0) { this.firing = true; MT.WEAPONS[this.wpn].fire(this, W, dt); }
    if (it.bomb && this.boat <= 0) W.showstopper(this);
    if (this.firing) this.facing = this.aim; else if (ml > .15) this.facing = Math.atan2(my, mx);
    this.pose(dt);
  }
  get iframes() { return this.slideT > .06 || this.invuln > 0 || this.state !== 'play' || this.addons.shield > 0 || this.godMode || MT.CHEATS.god || (MT.run && MT.run.mode === 'attract'); }
  pose(dt) {
    const rig = this.rig; if (!rig || MT.cfg.skipRigs) return;
    const st = { x: this.x, y: this.y, z: this.z, vx: this.vx, vy: this.vy, facing: this.facing, point: this.firing || this.state === 'play' && this.intent && this.intent.aim !== null && this.firing, hurt: this.hurtT > 0 };
    if (this.slideT > 0) st.flip = 1 - this.slideT / .28;
    if (this.boat > 0) { st.pose = ['cheer', 'hips', 'wave'][this.boatPose]; st.expr = 'smile'; st.point = false; }
    if (this.state === 'dead') { st.pose = this.t < .9 ? 'die' : undefined; st.down = this.t >= .9 ? 1 : 0; st.expr = 'wince'; }
    if (this.state === 'drop') st.air = true;
    if (this.cheer) { st.pose = 'cheer'; st.expr = 'smile'; }
    if (this.hurtT > 0) st.expr = 'wince';
    rig.update(dt, st);
  }
  hurt(dmg, src, W) {
    if (this.iframes || this.ctl === 'remote' || this.ctl === 'mirror') return false;
    if (MT.run && MT.run.mode === 'session' && MT.net && !MT.net.isHostSim(this)) return false;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg; this.invuln = MT.T.invulnTime; this.hurtT = .3; this.boatHit = this.boat > 0; this.boat = 0;
    if (src) { const a = Math.atan2(this.y - src.y, this.x - src.x); this.kvx = Math.cos(a) * 120; this.kvy = Math.sin(a) * 120; }
    if (this.input && this.input.rumble) this.input.rumble(.5, .15);
    W.event('hurt', { slot: this.slot, x: this.x, y: this.y, hp: this.hp });
    if (this.hp <= 0) this.die(W);
    return true;
  }
  die(W) {
    this.hp = 0; this.state = 'dead'; this.t = 0; this.deaths++; this.boat = 0; this.slideT = 0;
    if (MT.run && MT.run.mode === 'session') { this.cash = Math.max(0, this.cash - 2500); }
    else this.lives = Math.max(0, this.lives - 1);
    this.wpn = 'blaster'; this.wpnT = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    W.event('death', { slot: this.slot, x: this.x, y: this.y, name: this.name });
  }
  respawn(W) {
    const e = W.entry || 'S', P = AR.doors[e];
    this.x = clamp(P.x + P.nx * 50 + (this.slot - 1.5) * 14 * (P.nx === 0 ? 1 : 0), AR.x0 + 12, AR.x1 - 12);
    this.y = clamp(P.y + P.ny * 50 + (this.slot - 1.5) * 14 * (P.ny === 0 ? 1 : 0), AR.y0 + 12, AR.y1 - 12);
    if (MT.run && MT.run.mode === 'session') { /* unlimited lives in the Lightning Round */ }
    this.hp = MT.maxHp(); this.bombs = Math.max(1, this.bombs); this.state = 'drop'; this.t = 0; this.z = 70; this.invuln = 3; this.arrowT = 3;
    W.event('respawn', { slot: this.slot, x: this.x, y: this.y });
  }
  addCash(v, W) {
    this.cash += v;
    if (MT.run && MT.run.mode !== 'session') while (this.nextLife < MT.EXTRA_LIVES.length && this.cash >= MT.EXTRA_LIVES[this.nextLife]) { this.nextLife++; this.lives++; W.event('extraLife', { slot: this.slot, x: this.x, y: this.y }); }
  }
  get rs() { return this; }
  draw(r, W) {
    if (this.state === 'out' || this.state === 'gone') return;
    const blink = this.invuln > 0 && this.state === 'play' && Math.floor(MT.game.time * 12) % 2 === 0;
    if (this.state === 'drop') {
      r.queue(this.x, this.y, this.z + 40, g => { const a = r.w(this.x, this.y, this.z + 34), top = r.w(this.x, this.y, 200); px.line(g, a[0], a[1], top[0], Math.max(-4, top[1]), '#2a2a36', 1); }, { bias: -1 });
      r.decal(() => r.groundDisc(this.x, this.y, 16, '#fff7c0', .25));
      MT.game.lights.add(this.x, this.y, 0, 40, .7, { color: '#fff0c0' });
    }
    r.shadow(this.x, this.y, 7, .45);
    if (!MT.cfg.skipRigs && this.rig) r.actor(this.x, this.y, this.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { alpha: blink ? .45 : 1, flash: this.hurtT > 0 ? '#ffffff' : false, ghost: this.addons.speed > 0 ? { color: this.color, life: .18, alpha: .5, owner: this } : undefined, key: this });
    // the back number and the P arrow
    const tn = MT.game.time;
    if (this.arrowT > 0 || (W && W.contestants.length > 1 && this.state === 'play' && Math.floor(tn * 2) % 4 === 0 && false)) r.queue(this.x, this.y, 52, g => { const p = r.w(this.x, this.y, 52 + Math.sin(tn * 8) * 2); px.poly(g, [[p[0] - 4, p[1]], [p[0] + 4, p[1]], [p[0], p[1] + 5]], this.color); E.font.text(g, 'P' + (this.slot + 1), p[0], p[1] - 9, this.color, { align: 'center', outline: '#000' }); }, { bias: 30 });
    if (this.addons.shield > 0) r.queue(this.x, this.y, 14, g => { const p = r.w(this.x, this.y, 14), k = MT.pk(r); px.blend(g, .35, 'add', () => px.disc(g, p[0], p[1], 15 * k, '#2ee6ff')); if (Math.floor(tn * 5) % 3) E.font.text(g, 'KRUNCH-O', p[0], p[1] - 3, '#ffcc33', { align: 'center', font: 'tiny', outline: false }); px.blend(g, .7, 'add', () => { for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2; px.dot(g, p[0] + Math.cos(an) * 15 * k, p[1] + Math.sin(an) * 15 * k, '#c8f8ff'); } }); }, { emissive: true, bias: 2 });
    if (this.boat > 0) r.queue(this.x, this.y, 46, g => { const p = r.w(this.x, this.y, 46); for (let i = 0; i < 3; i++) { const a = tn * 6 + i * 2.1; px.dot(g, p[0] + Math.cos(a) * 9, p[1] + Math.sin(a) * 4, '#ffcc33'); } }, { emissive: true, bias: 5 });
  }
};

// ===== 12-weapons.js
// ---------------------------------------------------------------- weapons, add-ons and the projectile pools
MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', letter: 'B', color: '#fff7a0', dur: 0, rate: () => MT.T.fireRate, desc: 'YOUR TRUSTY STARTER. NINE SHOTS A SECOND.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / this.rate(); W.fireBolt(c, c.aim, 1); W.event('shot', { w: 'blaster', slot: c.slot }, false); } },
  spread: { name: 'TRIPLE PLAY', letter: 'S', color: '#ff8ad8', dur: 14, desc: 'THREE BOLTS AT ONCE. CROWDS HATE IT.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 8; for (const d of [-.227, 0, .227]) W.fireBolt(c, c.aim + d, 1); W.event('shot', { w: 'spread', slot: c.slot }, false); } },
  rockets: { name: 'PRIME-TIME ROCKETS', letter: 'R', color: '#ff6a3a', dur: 12, desc: 'SLOW, LOUD AND SPLASHY. HITS EVERYTHING NEARBY.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 3.5; W.fireRocket(c); W.event('shot', { w: 'rockets', slot: c.slot }, false); } },
  popcorn: { name: 'POPCORN POPPER', letter: 'P', color: '#ffe060', dur: 12, desc: 'LOBS A BAG THAT BURSTS INTO HOT KERNELS.',
    fire(c, W) { if (c.fireCd > 0) return; c.fireCd = 1 / 2.5; W.fireBag(c); W.event('shot', { w: 'popcorn', slot: c.slot }, false); } },
  laser: { name: 'LIMELIGHT LASER', letter: 'L', color: '#2ee6ff', dur: 10, desc: 'A BEAM THAT PIERCES EVERY FOE IN THE LINE.',
    fire(c, W, dt) { c.laserOn = true; c.laserAng = c.laserAng === undefined ? c.aim : MT.approachAng(c.laserAng, c.aim, 7 * dt); W.laser(c, dt); if (c.fireCd <= 0) { c.fireCd = .12; W.event('shot', { w: 'laser', slot: c.slot }, false); } } }
};
MT.ADDONS = {
  records: { name: 'GOLD RECORDS', letter: 'G', color: '#ffcc33', dur: 15, desc: 'TWO GOLD DISCS ORBIT YOU, BLOCKING SMALL SHOTS.' },
  shield: { name: 'SPONSOR SHIELD', letter: 'B', color: '#2ee6ff', dur: 8, desc: 'A BUBBLE NOTHING GETS THROUGH. BROUGHT TO YOU BY KRUNCH-O.' },
  speed: { name: 'SPEED SNEAKERS', letter: 'F', color: '#22c55e', dur: 10, desc: 'RUN FASTER AND SLIDE MORE OFTEN.' }
};
MT.CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.capLetter = { spread: 'S', rockets: 'R', popcorn: 'P', laser: 'L', records: 'G', shield: 'B', speed: 'F' };

// small bullets that the gold records and showstopper wipe out
MT.SMALL_FOE = { orb: 1, shard: 1, coin: 1, card: 1, static: 1, beam: 1, butter: 1, gravy: 1 };

MT.Shots = class Shots {
  constructor(team) { this.team = team; this.list = []; }
  fire(b) {
    const s = Object.assign({ id: MT.nid(), z: 10, vz: 0, r: 2.5, life: 1, dmg: 1, pierce: 0, grav: 0, kind: 'orb', t: 0 }, b);
    s.team = this.team; this.list.push(s); if (this.list.length > 700) this.list.shift(); return s;
  }
  clear() { this.list.length = 0; }
  update(dt, W) {
    for (const b of this.list) {
      if (b.dead) continue;
      b.t += dt; b.life -= dt;
      if (b.accel) { const sp = Math.hypot(b.vx, b.vy), ns = Math.min(b.accel[1], sp + b.accel[0] * dt), k = ns / Math.max(1, sp); b.vx *= k; b.vy *= k; }
      if (b.kind === 'card') { const a = Math.atan2(b.vy, b.vx) + Math.sin(b.t * 6) * dt * .6, sp = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; }
      if (b.kind === 'static') { b.x += (MT.R('fx') - .5) * 1.4; b.y += (MT.R('fx') - .5) * 1.4; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.grav) { b.vz -= b.grav * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.dead = true; W.landLob(b); continue; } }
      if (!b.grav && (b.x < AR.x0 - 2 || b.x > AR.x1 + 2 || b.y < AR.y0 - 2 || b.y > AR.y1 + 2)) { b.dead = true; W.bulletWall(b); continue; }
      if (b.grav && (b.x < -40 || b.x > AR.W + 40 || b.y < -40 || b.y > AR.H + 40)) { b.dead = true; continue; }
      if (b.life <= 0) { b.dead = true; if (b.kind === 'rocket' || b.kind === 'shell') W.explode(b); }
    }
    E.prune(this.list, b => b.dead);
  }
  draw(r) {
    const tn = MT.game.time;
    for (const b of this.list) {
      if (b.dead) continue;
      if (b.grav) r.shadow(b.x, b.y, b.kind === 'bag' ? 4 : 3, .35);
      r.queue(b.x, b.y, b.z, g => MT.drawShot(g, r, b, tn), { emissive: true });
    }
  }
};
MT.drawShot = (g, r, b, tn) => {
  const p = r.w(b.x, b.y, b.z), k = MT.pk(r), a = Math.atan2(b.vy, b.vx), c = Math.cos(a), s = Math.sin(a);
  switch (b.kind) {
    case 'bolt': { const col = b.owner !== undefined ? MT.COLORS.p[b.owner % 4] : '#fff7a0'; px.line(g, p[0] - c * 5 * k, p[1] - s * 3 * k, p[0] + c * 2 * k, p[1] + s * 1.2 * k, col, Math.max(2, 2.4 * k)); px.line(g, p[0] - c * 3 * k, p[1] - s * 2 * k, p[0] + c * 2 * k, p[1] + s * 1.2 * k, '#ffffff', Math.max(1, 1.2 * k)); break; }
    case 'kernel': px.disc(g, p[0], p[1], 1.8 * k, '#fff4c0'); px.dot(g, p[0], p[1], '#ffcc33'); break;
    case 'rocket': px.line(g, p[0] - c * 6 * k, p[1] - s * 4 * k, p[0] + c * 3 * k, p[1] + s * 2 * k, '#c8d0e0', Math.max(2, 3 * k)); px.disc(g, p[0] - c * 7 * k, p[1] - s * 4.5 * k, 2 * k, Math.floor(tn * 30) % 2 ? '#ffcc33' : '#ff6a20'); px.dot(g, p[0] + c * 3 * k, p[1] + s * 2 * k, '#ff3344'); break;
    case 'bag': px.rect(g, p[0] - 3 * k, p[1] - 4 * k, 6 * k, 7 * k, '#ffffff'); px.rect(g, p[0] - 3 * k, p[1] - 4 * k, 2 * k, 7 * k, '#ff3344'); px.rect(g, p[0] + 1 * k, p[1] - 4 * k, 2 * k, 7 * k, '#ff3344'); px.dot(g, p[0], p[1] - 5 * k, '#fff4c0'); break;
    case 'tomato': px.disc(g, p[0], p[1], 3.2 * k, '#4a0a0a'); px.disc(g, p[0], p[1], 2.6 * k, '#e82a2a'); px.dot(g, p[0] - k, p[1] - k, '#ffaaaa'); px.dot(g, p[0], p[1] - 3 * k, '#2a8a2a'); break;
    case 'tot': px.rect(g, p[0] - 3 * k, p[1] - 2 * k, 6 * k, 4 * k, '#4a2a0a'); px.rect(g, p[0] - 2.5 * k, p[1] - 1.5 * k, 5 * k, 3 * k, '#e8a840'); break;
    case 'shell': px.disc(g, p[0], p[1], 3.4 * k, '#1a1a1a'); px.disc(g, p[0], p[1], 2.4 * k, '#ff6a20'); px.dot(g, p[0], p[1], '#ffffff'); break;
    case 'coin': { const w = Math.abs(Math.cos(tn * 10 + b.id)) * 2.6 * k + .8; px.ell ? px.ell(g, p[0], p[1], w + .8, 3.4 * k, '#3a2a0a') : px.disc(g, p[0], p[1], 3.4 * k, '#3a2a0a'); px.ell ? px.ell(g, p[0], p[1], w, 2.6 * k, '#ffcc33') : px.disc(g, p[0], p[1], 2.6 * k, '#ffcc33'); break; }
    case 'card': { const sp = tn * 12 + b.id; const ca = Math.cos(sp), sa = Math.sin(sp); const P = (u, v) => [p[0] + (u * ca - v * sa) * k, p[1] + (u * sa + v * ca) * k]; px.poly(g, [P(-3, -2), P(3, -2), P(3, 2), P(-3, 2)], '#1a0a14'); px.poly(g, [P(-2.4, -1.4), P(2.4, -1.4), P(2.4, 1.4), P(-2.4, 1.4)], '#fff7e8'); px.dot(g, p[0], p[1], '#c8202a'); break; }
    case 'static': for (let i = 0; i < 4; i++) px.dot(g, p[0] + (MT.fxr() - .5) * 6 * k, p[1] + (MT.fxr() - .5) * 6 * k, i % 2 ? '#ffffff' : '#9a9aff'); px.disc(g, p[0], p[1], 1.5 * k, '#c8c8ff'); break;
    case 'beam': px.line(g, p[0] - c * 6 * k, p[1] - s * 4 * k, p[0] + c * 6 * k, p[1] + s * 4 * k, '#6a2a00', Math.max(2, 3 * k)); px.line(g, p[0] - c * 5 * k, p[1] - s * 3 * k, p[0] + c * 5 * k, p[1] + s * 3 * k, '#ffe060', Math.max(1, 1.5 * k)); break;
    case 'shard': { const col = ['#ff2e88', '#2ee6ff', '#ffcc33', '#9aff6a'][b.id % 4]; px.disc(g, p[0], p[1], 2.4 * k, '#3a0a1a'); px.disc(g, p[0], p[1], 1.6 * k, col); break; }
    case 'butter': px.rect(g, p[0] - 3 * k, p[1] - 2 * k, 6 * k, 4 * k, '#5a4a0a'); px.rect(g, p[0] - 2.4 * k, p[1] - 1.4 * k, 4.8 * k, 2.8 * k, '#ffe680'); break;
    case 'gravy': px.disc(g, p[0], p[1], 3 * k, '#2a1406'); px.disc(g, p[0], p[1], 2.2 * k, '#a0602a'); px.dot(g, p[0] - k, p[1] - k, '#e0a060'); break;
    default: px.disc(g, p[0], p[1], 3.4 * k, '#3a1400'); px.disc(g, p[0], p[1], 2.6 * k, MT.COLORS.foe); px.disc(g, p[0], p[1], 1.3 * k, MT.COLORS.foeCore);
  }
};

// ===== 13-enemies.js
// ---------------------------------------------------------------- enemies: archetypes as data plus behaviour (a registry: add one entry for a new foe)
// Each draws only from its render state (the enemy object's x, y, z, face, state, t, hpPct, flash), so hub clients draw the same.
const espd = () => MT.T.enemySpeed * MT.diff().enemySpeed;
const bspd = () => MT.T.enemyBulletSpeed * MT.diff().bullets;
const towards = (e, tx, ty, sp) => { const a = Math.atan2(ty - e.y, tx - e.x); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; };
const humanDraw = (r, e, o = {}) => {
  r.shadow(e.x, e.y, o.sh || 6, .4);
  if (MT.cfg.skipRigs || !e.rig) return;
  r.actor(e.x, e.y, e.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : false, alpha: o.alpha || 1, outline: o.outline !== false, every: o.every, key: e });
};
const poseHuman = (e, dt, extra = {}) => {
  if (MT.cfg.skipRigs || !e.rig) return;
  e.rig.update(dt, Object.assign({ x: e.x, y: e.y, z: e.z, vx: e.vx, vy: e.vy, facing: e.face, hurt: e.flash > 0 }, extra));
};
MT.ENEMIES = {
  goon: { name: 'STUDIO SECURITY', hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, counted: true, drops: [['bill', .08], ['cap', .012], ['prize', .01]],
    init(e) { e.spd = this.speed + MT.Rr(-6, 6); e.atk = null; e.wob = MT.Rr(0, 6.28); },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) { e.vx *= .9; e.vy *= .9; return; }
      const d = MT.dist(e, tg);
      if (e.atk) {
        e.atk.t += dt; e.vx = e.vy = 0;
        if (e.atk.phase === 'wind' && e.atk.t >= .3) { e.atk.phase = 'active'; e.atk.t = 0; W.event('swish', { x: e.x, y: e.y }, false); if (d < 18) tg.hurt(MT.T.contactDmg, e, W); }
        else if (e.atk.phase === 'active' && e.atk.t >= .12) { e.atk.phase = 'recover'; e.atk.t = 0; }
        else if (e.atk.phase === 'recover' && e.atk.t >= .35) e.atk = null;
        return;
      }
      if (d < 16) { e.atk = { phase: 'wind', t: 0 }; return; }
      e.wob += dt * 2; const a = MT.ang(e, tg) + Math.sin(e.wob) * .35, sp = e.spd * espd();
      e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a;
    },
    pose(e, dt) { const u = e.atk ? e.atk.t / (e.atk.phase === 'wind' ? .3 : e.atk.phase === 'active' ? .12 : .35) : 0; poseHuman(e, dt, { attack: e.atk ? { spec: E.MOVES.bash, phase: e.atk.phase, u: Math.min(1, u) } : null }); },
    draw(r, e) { humanDraw(r, e, { every: 2 }); }
  },
  clapbot: { name: 'APPLAUSE ROBOT', hp: 1, speed: 115, r: 6, contact: 1, cash: 150, rat: 1, counted: true, drops: [['bill', .1]],
    init(e) { e.hopT = MT.Rr(0, .4); e.clap = 0; },
    update(e, dt, W) {
      e.hopT -= dt; e.clap += dt;
      const tg = W.target(e);
      if (e.hopT <= 0 && tg) { e.hopT = .4; const a = MT.ang(e, tg) + MT.Rr(-.7, .7), sp = this.speed * espd(); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; e.hopU = 0; if (e.rig && e.rig.kick) e.rig.kick(.35); W.event('hop', { x: e.x, y: e.y }, false); }
      e.hopU = (e.hopU || 0) + dt; if (e.hopU > .25) { e.vx *= .8; e.vy *= .8; }
      e.z = e.hopU < .25 ? Math.sin(e.hopU / .25 * Math.PI) * 6 : 0;
    },
    pose(e, dt) { if (e.rig && !MT.cfg.skipRigs) e.rig.update(dt, { squash: e.hopT > .32 ? -.3 : 0, look: [Math.cos(e.face), Math.sin(e.face)], walk: .5 }); },
    draw(r, e) { r.shadow(e.x, e.y, 6, .4); if (!MT.cfg.skipRigs && e.rig) r.actor(e.x, e.y, e.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: e.flash > 0 ? '#ffffff' : false, every: 2, key: e }); MT.paint.clapHands(r, e); }
  },
  popper: { name: 'PARTY POPPER', hp: 2, speed: 38, r: 6, contact: 1, cash: 250, rat: 2, counted: true, drops: [['stack', .1], ['cap', .03]],
    init(e) { e.fuse = 0; },
    update(e, dt, W) {
      if (e.state === 'fuse') { e.vx = e.vy = 0; e.t += dt; if (e.t >= .6) { e.state = 'burst'; W.popperBurst(e); W.kill(e, null, { silent: true }); } return; }
      const tg = W.target(e); if (!tg) return;
      if (MT.dist(e, tg) < 18) { e.state = 'fuse'; e.t = 0; W.event('fuse', { x: e.x, y: e.y }, false); return; }
      towards(e, tg.x, tg.y, this.speed * espd());
    },
    onDeath(e, W) { if (e.state !== 'burst') { e.state = 'burst'; W.popperBurst(e); } },
    pose(e, dt) { poseHuman(e, dt, { expr: e.state === 'fuse' ? 'shout' : null }); },
    draw(r, e) { humanDraw(r, e); MT.paint.partyHorn(r, e); }
  },
  mime: { name: 'LAND MIME', hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, counted: false, drops: [['bill', .3]],
    init(e) { e.box = MT.Rr(0, 6.28); },
    update(e, dt, W) {
      e.vx = e.vy = 0; e.box += dt;
      if (e.state === 'tele') { e.t += dt; if (Math.floor(e.t * 8) !== Math.floor((e.t - dt) * 8)) W.event('beep', { x: e.x, y: e.y }, false); if (e.t >= .7) { W.mimeBlast(e); W.kill(e, null, { silent: true, noDrop: true }); } return; }
      for (const c of W.contestants) if (c.canBeHit && MT.dist(e, c) < 34) { e.state = 'tele'; e.t = 0; return; }
    },
    pose(e, dt) { poseHuman(e, dt, { expr: e.state === 'tele' ? 'shout' : 'smile' }); },
    draw(r, e) { humanDraw(r, e, { alpha: e.state === 'tele' ? 1 : .5, outline: e.state === 'tele' }); if (e.state === 'tele') r.decal(() => r.groundRing(e.x, e.y, 36, Math.floor(e.t * 10) % 2 ? '#ff3344' : '#ffffff', .8)); }
  },
  disco: { name: 'DISCO BALL', hp: 5, speed: 70, r: 7, contact: 1, cash: 400, rat: 3, counted: true, drops: [['stack', .2], ['cap', .05]],
    init(e, o) { e.big = !!(o && o.big); if (e.big) { e.hp = e.max = 10 * MT.T.enemyHp; e.r = 10; e.cash = 800; } const a = Math.PI / 4 + MT.Ri(0, 3, 'spawn') * Math.PI / 2; e.dx = Math.cos(a); e.dy = Math.sin(a); e.shotT = MT.Rr(1.5, 3); e.cross = false; },
    update(e, dt, W) {
      const sp = this.speed * espd(); e.vx = e.dx * sp; e.vy = e.dy * sp;
      if (e.x <= AR.x0 + e.r + .5 && e.dx < 0 || e.x >= AR.x1 - e.r - .5 && e.dx > 0) e.dx *= -1;   // (the wall clamp leaves it exactly on the edge)
      if (e.y <= AR.y0 + e.r + .5 && e.dy < 0 || e.y >= AR.y1 - e.r - .5 && e.dy > 0) e.dy *= -1;
      e.shotT -= dt;
      if (e.shotT <= .4 && e.state !== 'flare') { e.state = 'flare'; W.event('shimmer', { x: e.x, y: e.y }, false); }
      if (e.shotT <= 0) { e.shotT = 3; e.state = 'move'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); W.foe(e, 'beam', a, 110); } e.cross = !e.cross; W.event('zap', { x: e.x, y: e.y }, false); }
    },
    onDeath(e, W) { if (e.big) for (const s of [-1, 1]) { const n = W.spawnAt('disco', e.x + s * 8, e.y, {}); if (n) { n.hp = n.max = 3 * MT.T.enemyHp; n.dx = s * .707; n.dy = -.707; } } },
    draw(r, e) { MT.paint.disco(r, e); }
  },
  heckler: { name: 'STUDIO AUDIENCE', hp: 3, speed: 45, r: 6, contact: 1, cash: 350, rat: 2, counted: true, drops: [['prize', .06], ['cap', .04]],
    init(e) { e.throwT = MT.Rr(1, 2.2); e.strafe = MT.R() < .5 ? 1 : -1; e.throwU = 0; },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      const d = MT.dist(e, tg), a = MT.ang(e, tg); e.face = a;
      const want = d < 70 ? -1 : d > 110 ? 1 : 0, sp = this.speed * espd();
      e.vx = Math.cos(a) * want * sp + Math.cos(a + Math.PI / 2) * e.strafe * sp * .7; e.vy = Math.sin(a) * want * sp + Math.sin(a + Math.PI / 2) * e.strafe * sp * .7;
      if (MT.R() < dt * .4) e.strafe *= -1;
      e.throwT -= dt; e.throwU = Math.max(0, e.throwU - dt);
      if (e.throwT <= 0) { e.throwT = 2.2; e.throwU = .5; const n = e.kind === 'hecklerKing' ? 3 : 1; for (let i = 0; i < n; i++) W.lobTomato(e, tg, (i - (n - 1) / 2) * 22); }
    },
    pose(e, dt) { poseHuman(e, dt, { attack: e.throwU > 0 ? { spec: E.MOVES.throw, phase: e.throwU > .25 ? 'active' : 'recover', u: 1 - (e.throwU % .25) / .25 } : null }); },
    draw(r, e) { humanDraw(r, e); MT.paint.foamFinger(r, e); }
  },
  tank: { name: 'DOLLY TANK', hp: 14, speed: 26, r: 12, contact: 1, cash: 1000, rat: 6, counted: true, big: true, drops: [['case', .15], ['cap', .15]],
    init(e) { e.aim = e.face; e.shotT = 2; e.tread = 0; },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      const want = MT.ang(e, tg); e.face = MT.approachAng(e.face, want, .7 * dt); e.aim = MT.approachAng(e.aim, want, (e.state === 'aim' ? .4 : 1.4) * dt);
      const sp = this.speed * espd(), d = MT.dist(e, tg); e.vx = Math.cos(e.face) * sp * (d > 60 ? 1 : 0); e.vy = Math.sin(e.face) * sp * (d > 60 ? 1 : 0);
      e.tread += Math.hypot(e.vx, e.vy) * dt;
      e.shotT -= dt;
      if (e.shotT <= .4 && e.state !== 'aim') { e.state = 'aim'; W.event('whine', { x: e.x, y: e.y }, false); }
      if (e.shotT <= 0) { e.shotT = 2.4; e.state = 'move'; const b = W.foe(e, 'shell', e.aim, 120, { r: 3.5, life: 2.5 }); if (b) { b.x = e.x + Math.cos(e.aim) * 14; b.y = e.y + Math.sin(e.aim) * 14; } W.event('shellFire', { x: e.x, y: e.y }, false); }
    },
    onDeath(e, W) { W.explode({ x: e.x, y: e.y, r: 30, dmg: 3, team: 'p', big: true }); },
    draw(r, e) { MT.paint.tank(r, e); }
  },
  snake: { name: 'CABLE SNAKE', hp: 8, speed: 60, r: 7, contact: 1, cash: 1200, rat: 5, counted: true, drops: [['case', .3]],
    init(e, o, W) { e.path = []; e.segs = []; e.weave = 0; e.lungeT = MT.Rr(2, 4); for (let i = 0; i < 10; i++) { const s = W.spawnAt('seg', e.x, e.y, { parent: e, i }); if (s) e.segs.push(s); } },
    update(e, dt, W) {
      const tg = W.target(e); if (!tg) return;
      e.weave += dt * 3; e.lungeT -= dt;
      let sp = this.speed * espd();
      if (e.state === 'rear') { e.t += dt; sp = 10; if (e.t >= .45) { e.state = 'lunge'; e.t = 0; } }
      else if (e.state === 'lunge') { e.t += dt; sp *= 1.5; if (e.t >= .7) { e.state = 'move'; e.lungeT = MT.Rr(2.5, 4); } }
      else if (e.lungeT <= 0 && MT.dist(e, tg) < 110) { e.state = 'rear'; e.t = 0; W.event('hiss', { x: e.x, y: e.y }, false); }
      const a = MT.ang(e, tg) + (e.state === 'move' ? Math.sin(e.weave) * .6 : 0); e.face = MT.approachAng(e.face, a, 4 * dt);
      e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
      const last = e.path[0]; if (!last || Math.hypot(e.x - last[0], e.y - last[1]) >= 6) { e.path.unshift([e.x, e.y]); if (e.path.length > 40) e.path.pop(); }
      E.prune(e.segs, s => s.dead);
      e.segs.forEach((s, i) => { const p = e.path[Math.min(e.path.length - 1, i + 1)]; if (p) { s.x = p[0]; s.y = p[1]; } });
    },
    onDeath(e, W) { for (const s of e.segs) if (!s.dead) W.kill(s, null, { silent: false }); },
    draw(r, e) { MT.paint.snakeHead(r, e); }
  },
  seg: { name: 'CABLE', hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, counted: false, drops: [], net: true,
    init(e, o) { e.parent = o && o.parent; e.i = o ? o.i : 0; },
    update(e) { e.vx = e.vy = 0; if (!e.parent || e.parent.dead) e.dead = true; },
    draw(r, e) { MT.paint.snakeSeg(r, e.x, e.y, e.flash > 0, e.i || 0); }
  },
  brute: { name: 'THE CEREAL KILLER', hp: 24, speed: 40, r: 10, contact: 2, cash: 2000, rat: 8, counted: true, big: true, drops: [['case', .4], ['cap', .25]],
    init(e) { e.chargeT = MT.Rr(2.5, 4); e.cdx = 0; e.cdy = 0; },
    update(e, dt, W) {
      const tg = W.target(e);
      if (e.state === 'stun') { e.vx = e.vy = 0; e.t += dt; if (e.t >= 1.5) { e.state = 'move'; e.chargeT = 4; } return; }
      if (e.state === 'tele') { e.vx = e.vy = 0; e.t += dt; if (Math.floor(e.t * 5) !== Math.floor((e.t - dt) * 5)) W.event('stomp', { x: e.x, y: e.y }, false); if (e.t >= .8) { e.state = 'charge'; e.t = 0; } return; }
      if (e.state === 'charge') {
        e.t += dt; const sp = 220 * espd(); e.vx = e.cdx * sp; e.vy = e.cdy * sp;
        if (e.x <= AR.x0 + e.r + 1 || e.x >= AR.x1 - e.r - 1 || e.y <= AR.y0 + e.r + 1 || e.y >= AR.y1 - e.r - 1) { e.state = 'stun'; e.t = 0; W.event('crash', { x: e.x, y: e.y }); }
        else if (e.t >= 1.4) { e.state = 'move'; e.chargeT = 4; }
        return;
      }
      if (!tg) return;
      towards(e, tg.x, tg.y, this.speed * espd()); e.chargeT -= dt;
      if (e.chargeT <= 0) { e.state = 'tele'; e.t = 0; const a = MT.ang(e, tg); e.cdx = Math.cos(a); e.cdy = Math.sin(a); e.face = a; W.event('roar', { x: e.x, y: e.y }); }
    },
    dmgMul(e) { return e.state === 'stun' ? 2 : 1; },
    pose(e, dt) { poseHuman(e, dt, { pose: e.state === 'tele' ? 'crouch' : undefined, sprint: e.state === 'charge', stance: 'guard', expr: 'angry' }); },
    draw(r, e) {
      humanDraw(r, e, { sh: 10 }); MT.paint.mascotHead(r, e);
      if (e.state === 'tele') r.decal(() => { for (let d = 10; d < 240; d += 10) r.groundDisc(e.x + e.cdx * d, e.y + e.cdy * d, 2, '#ff3344', .55); r.groundRing(e.x, e.y, 10 + e.t * 30, '#ffcc33', .6); });
    }
  },
  crate: { name: 'PRIZE CRATE', hp: 3, speed: 0, r: 8, contact: 0, cash: 0, rat: 1, counted: false, solid: true, drops: [],
    init(e) { e.static = true; },
    update(e) { e.vx = e.vy = 0; },
    onDeath(e, W) { W.crateSpill(e); },
    draw(r, e) { MT.paint.crate(r, e); }
  },
  lock: { name: 'VAULT LOCK', hp: 15, speed: 0, r: 7, contact: 0, cash: 500, rat: 2, counted: false, drops: [],
    init(e) { e.static = true; },
    update(e) { e.vx = e.vy = 0; },
    onDeath(e, W) { W.lockBroken(e); },
    draw(r, e) { MT.paint.lock(r, e); }
  },
  paparazzi: { name: 'PAPARAZZI', hp: 999, speed: 30, r: 6, contact: 0, cash: 0, rat: 0, counted: false, harmless: true, drops: [],
    init(e) { e.wT = 0; e.flashT = 0; },
    update(e, dt) { e.wT -= dt; if (e.wT <= 0) { e.wT = MT.Rr(1, 3); const a = MT.Rr(0, 6.28); e.vx = Math.cos(a) * 30; e.vy = Math.sin(a) * 30; e.face = a; } e.flashT = Math.max(0, e.flashT - dt); },
    pose(e, dt) { poseHuman(e, dt, { pose: e.flashT > 0 ? 'cast' : undefined }); },
    draw(r, e) { humanDraw(r, e); r.queue(e.x, e.y + .5, 20, g => { const p = r.w(e.x + Math.cos(e.face) * 5, e.y + Math.sin(e.face) * 5, 20); px.rect(g, p[0] - 3, p[1] - 2, 6, 4, '#1a1a22'); px.dot(g, p[0], p[1], e.flashT > 0 ? '#ffffff' : '#2ee6ff'); }, { bias: 2 }); if (e.flashT > .1) MT.game.lights.add(e.x, e.y, 20, 60, 1, { color: '#ffffff' }); }
  }
};
MT.ENEMIES.discoBig = MT.ENEMIES.disco;
MT.ENEMIES.hecklerKing = Object.assign({}, MT.ENEMIES.heckler, { name: 'THE HECKLER KING', hp: 12, cash: 1500, rat: 6, drops: [] });
MT.ENEMIES.goon.pose = MT.ENEMIES.goon.pose;
MT.KIND_LIST = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute', 'crate'];
// the mime's "trapped in a box": its hands flat on invisible walls, sliding on a slow sine (post-processed joints)
MT.mimeBox = (rig, e) => {
  if (!rig || rig._boxed) return; rig._boxed = true; const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J; if (!J || !J.shL || !e) return;
    const tele = e.state === 'tele', t = (e.box || 0), sh = tele ? Math.sin(t * 60) * .8 : 0;
    const zH = J.shC[2] + 2 + Math.sin(t * 1.3) * 3, zL = J.shC[2] - 3 + Math.sin(t * 1.3 + 1.6) * 3;
    J.handL = [J.shL[0] + 5 + sh, J.shL[1] - 1.5, tele ? J.head[2] + 4 : zH]; J.elbowL = [J.shL[0] + 2.5, J.shL[1] - 2.5, (J.shL[2] + J.handL[2]) / 2 - 1];
    J.handR = [J.shR[0] + 5 - sh, J.shR[1] + 1.5, tele ? J.head[2] + 4 : zL]; J.elbowR = [J.shR[0] + 2.5, J.shR[1] + 2.5, (J.shR[2] + J.handR[2]) / 2 - 1];
  };
};

// ===== 14-pickups.js
// ---------------------------------------------------------------- pickups: cash, prizes, keys, capsules, bombs, lives, the statuette
MT.PICKUPS = {
  bill: { value: 100, cash: true, spr: () => MT.spr.bill },
  stack: { value: 500, cash: true, spr: () => MT.spr.stack },
  gold: { value: 1000, cash: true, spr: () => MT.spr.gold },
  case: { value: 5000, cash: true, spr: () => MT.spr.case },
  prize: { spr: p => [MT.spr.prizeR, MT.spr.prizeB, MT.spr.prizeG][(p.id || 0) % 3] },
  key: { permanent: true, spr: () => MT.spr.key },
  cap: { cap: true },
  bomb: { spr: () => MT.spr.bulb },
  life: { spr: () => MT.spr.star },
  statue: { permanent: true, spr: () => MT.spr.statue }
};
MT.Pickup = class Pickup {
  constructor(kind, x, y, o = {}) {
    this.id = o.id || MT.nid(); this.kind = kind; this.x = x; this.y = y; this.z = o.z || 0; this.vx = o.vx || 0; this.vy = o.vy || 0; this.vz = o.vz || 0;
    this.w = o.w || null; this.prize = o.prize || null; this.placed = !!o.placed; this.dropFrom = o.dropFrom || 0;
    const P = MT.PICKUPS[kind]; this.ttl = P.permanent || o.placed ? Infinity : 9; this.t = 0; this.dead = false;
  }
  update(dt, W) {
    this.t += dt; this.ttl -= dt; if (this.ttl <= 0) { this.dead = true; return; }
    if (this.z > 0 || this.vz) { this.vz -= 500 * dt; this.z += this.vz * dt; if (this.z <= 0) { this.z = 0; this.vz = Math.abs(this.vz) > 60 ? -this.vz * .3 : 0; } }
    this.x += this.vx * dt; this.y += this.vy * dt; const k = Math.exp(-dt * 4); this.vx *= k; this.vy *= k;
    const push = W.arena.conveyorPush(this);
    if (push) { this.x += push * dt; if (this.kind === 'key') { if (this.x < AR.x0 - 4) this.x = AR.x1 + 2; else if (this.x > AR.x1 + 4) this.x = AR.x0 - 2; } }
    if (!(this.kind === 'key' && W.arena.hazards.conveyor)) MT.clampInterior(this, 4);
    else { this.y = clamp(this.y, AR.y0 + 4, AR.y1 - 4); }
  }
  draw(r, W) {
    if (this.ttl < 2.5 && Math.floor(this.t * 10) % 2) return;
    const bob = Math.sin(this.t * 4 + this.id) * 1.5 + 3, z = this.z + bob, tn = MT.game.time;
    r.shadow(this.x, this.y, 4, .35);
    if (this.kind === 'cap') {
      r.queue(this.x, this.y, z + 6, g => { const p = r.w(this.x, this.y, z + 6); MT.drawCapsule(g, p[0], p[1], this.w, 1, tn); }, { emissive: true });
      MT.game.lights.add(this.x, this.y, 6, 26, .5, { color: (MT.WEAPONS[this.w] || MT.ADDONS[this.w]).color });
      return;
    }
    const P = MT.PICKUPS[this.kind], spr = P.spr(this);
    r.sprite(this.x, this.y, z, spr, { glow: this.kind === 'key' || this.kind === 'statue' ? .9 : .4 });
    if (this.kind === 'key' || this.kind === 'statue') { MT.game.lights.add(this.x, this.y, 8, 40, .8, { color: '#ffd060' }); if (Math.floor(tn * 3) % 2) r.queue(this.x, this.y, z + 10, g => { const p = r.w(this.x + 4, this.y, z + 10); px.dot(g, p[0], p[1], '#ffffff'); px.dot(g, p[0] - 1, p[1], '#fff0a0'); px.dot(g, p[0] + 1, p[1], '#fff0a0'); px.dot(g, p[0], p[1] - 1, '#fff0a0'); px.dot(g, p[0], p[1] + 1, '#fff0a0'); }, { emissive: true }); }
  }
};

// ===== 15-ratings.js
// ---------------------------------------------------------------- ratings: the show's heartbeat (shared by the team)
MT.Ratings = class Ratings {
  constructor() { this.R = 30; this.since = 0; this.prime = 0; this.primeCd = 0; this.low = 0; this.stuntDone = false; this.applause = 0; this.nearT = 0; this.nearN = 0; this.kills = []; this.primeCount = 0; }
  get X() { if (this.prime > 0) return 5; const R = this.R; return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  gain(v, W, why) {
    if (v <= 0) return; v *= MT.T.ratingsGain; if (v <= 0) return;
    this.R = Math.min(100, this.R + v); this.since = 0; if (v >= 4) this.applause = 1.2;
    if (this.R >= 100 && this.prime <= 0 && this.primeCd <= 0 && W) this.startPrime(W);
  }
  lose(v) { if (this.prime > 0) return; this.R = Math.max(0, this.R - v); }
  startPrime(W) { this.prime = MT.T.primeTime; this.primeCount++; W.event('prime', {}); W.primeShower(); }
  kill(W) {   // multi-kill: +2 for each kill past 2 within 0.4 s
    const t = MT.game.time; this.kills.push(t); while (this.kills.length && t - this.kills[0] > .4) this.kills.shift();
    if (this.kills.length > 2) { this.gain(2, W); if (this.kills.length === 3 || this.kills.length === 6 || this.kills.length === 10) W.event('multi', { n: this.kills.length }); }
  }
  near(W) { const t = MT.game.time; if (t - this.nearT > 1) { this.nearT = t; this.nearN = 0; } if (this.nearN < 3) { this.nearN++; this.gain(.5, W); } }
  update(dt, W, waves) {
    this.applause = Math.max(0, this.applause - dt); this.primeCd = Math.max(0, this.primeCd - dt);
    if (this.prime > 0) { this.prime -= dt; this.R = 100; if (this.prime <= 0) { this.prime = 0; this.R = 60; this.primeCd = 20; W.event('primeEnd', {}); } return; }
    this.since += dt; if (this.since > 2.5) this.R = Math.max(0, this.R - MT.T.ratingsDecay * dt);
    if (waves && !this.stuntDone) { if (this.R < 5) { this.low += dt; if (this.low >= 10) { this.stuntDone = true; this.low = 0; W.stunt(); this.gain(15, W); } } else this.low = 0; }
  }
};

// ===== 16-waves.js
// ---------------------------------------------------------------- the room script runner: waves, items, key rules, survive rooms
MT.scaleN = (n) => {
  const pl = MT.W ? Math.max(1, MT.W.contestants.filter(c => c.state !== 'gone').length) : 1;
  return Math.max(1, Math.round(n * (1 + .35 * (pl - 1)) * MT.T.waveSize * MT.diff().wave));
};
MT.spawnEntry = (W, entry) => {
  let [door, kind, n, gap] = entry; gap = gap === undefined ? .25 : gap;
  const N = MT.scaleN(n), opts = entry[4] || {};
  const list = door === 'all' ? ['N', 'E', 'S', 'W'] : door === 'sides' ? ['E', 'W'] : door === 'ends' ? ['N', 'S'] : null;
  if (list) { for (const d of list) W.arena.queueSpawn(d, kind, N, gap, opts); return N * list.length; }
  if (door === 'audience') { for (let i = 0; i < N; i++) W.later(i * .35 * MT.T.spawnGap, () => W.spawnAudience(kind, i % 2 ? 'E' : 'W', opts), true); return N; }
  if (door === 'drop') { for (let i = 0; i < N; i++) W.later(i * .3 * MT.T.spawnGap, () => W.spawnDrop(kind, opts), true); return N; }
  if (Array.isArray(door)) { const [x, y] = MT.cell(door[0], door[1]); for (let i = 0; i < N; i++) W.spawnAt(kind, x + i * 6, y, opts); return N; }
  W.arena.queueSpawn(door, kind, N, gap, opts); return N;
};
MT.runRoom = function* (W, room) {
  W.waveIdx = -1; W.wavesTotal = (room.waves || []).length; W.allSpawned = false;
  if (room.survive) { yield* MT.runSurvive(W, room); }
  else {
    for (let i = 0; i < (room.waves || []).length; i++) {
      const w = room.waves[i];
      if (i === 0) yield w.at || 0;
      else { const c = []; if (w.at !== undefined) c.push(w.at); if (w.left !== undefined) c.push(() => W.alive() + W.pending() <= MT.scaleLeft(w.left)); if (!c.length) c.push(0); yield E.any(c); }
      W.waveIdx = i; W.waveStart = W.t; W.event('wave', { i, n: W.wavesTotal });
      for (const s of w.spawn || []) MT.spawnEntry(W, s);
      for (const it of w.items || []) W.placeItem(it[0], it[1]);
      if (w.script && MT.SCRIPTS[w.script]) yield* MT.SCRIPTS[w.script](W, room);
    }
  }
  yield E.until(() => W.queuesEmpty());
  W.allSpawned = true;
};
MT.scaleLeft = (left) => Math.round(left * (1 + .35 * Math.max(0, (MT.W ? MT.W.contestants.length : 1) - 1)));
MT.runSurvive = function* (W, room) {
  const S = room.survive; W.surviveT = S.dur; W.jumboClock = S.dur; W.waveIdx = 0; W.wavesTotal = 2;
  const timers = S.streams.map(s => ({ s, t: s[0] * .5 }));
  let t = 0, cage = false;
  while (t < S.dur) {
    const dt = W.lastDt || 1 / 120;
    yield; t += dt; W.surviveT = S.dur - t; W.jumboClock = Math.max(0, S.dur - t);
    if (!cage && t >= S.cageAt) { cage = true; if (W.arena.cage) W.arena.cage.lift = true; W.event('cageOpen', {}); }
    for (const tm of timers) { tm.t -= dt; if (tm.t <= 0) { tm.t += tm.s[0]; const door = tm.s[1] === 'each' ? 'all' : tm.s[1] === 'random' ? MT.Rpick(['N', 'E', 'S', 'W'], 'spawn') : tm.s[1]; MT.spawnEntry(W, [door, tm.s[2], tm.s[3], .3]); } }
  }
  W.jumboClock = null; W.waveIdx = 1; W.event('wave', { i: 1, n: 2 });
  for (const s of S.final) MT.spawnEntry(W, s);
};
MT.SCRIPTS = {
  finaleBurst: function* (W) {
    W.event('finaleBurst', {});
    for (let k = 0; k < 2; k++) { W.arena.fireVents('all', 1); yield 2.6; }
  }
};
// key rules: each yields exactly one key per room
MT.keyRules = {
  setup(W, room) {
    const K = room.key; if (!K || !W.keysOn) return;
    W.keyRule = K.rule; W.keyGiven = false;
    if (K.rule === 'place' || K.rule === 'belt') { const [x, y] = MT.cell(K.at[0], K.at[1]); W.dropKey(x, y, true); }
    if (K.rule === 'crate') { const crates = W.enemies.filter(e => e.kind === 'crate'); if (crates.length) crates[MT.Ri(0, crates.length - 1, 'spawn')].hasKey = true; }
    if (K.rule === 'survive') { W.arena.cage = { h: 26, lift: false }; W.dropKey(AR.cx, AR.cy, true); }
    if (K.rule === 'vault') { W.arena.safe = { open: false }; for (const [cx] of [[1], [3], [5], [7]]) { const [x] = MT.cell(cx, 0); W.spawnAt('lock', x, 20, {}); } }
  },
  onKill(W, e) {
    const K = W.room.key; if (!K || W.keyGiven || !W.keysOn) return;
    if (K.rule === 'mimes' && e.kind === 'mime' && e.placed && !W.enemies.some(o => o !== e && !o.dead && o.kind === 'mime' && o.placed)) W.dropKey(e.x, e.y);
    if (K.rule === 'carrier' && e.carrier) W.dropKey(e.x, e.y);
    if (K.rule === 'crate' && e.hasKey) W.dropKey(e.x, e.y);
  },
  onSpawn(W, e) {
    const K = W.room.key; if (!K || K.rule !== 'carrier' || W.keyGiven || !W.keysOn) return;
    if (e.kind === K.kind) { W._carrierN = (W._carrierN || 0) + 1; if (W._carrierN === (K.nth || 1) && (K.wave === undefined || W.waveIdx === K.wave)) e.carrier = true; else if (K.wave !== undefined && W.waveIdx !== K.wave) W._carrierN--; }
  },
  onRoomEnd(W) {
    const K = W.room.key; if (!K || W.keyGiven || !W.keysOn) return;
    if (K.rule === 'final') W.dropKey(AR.cx, AR.cy, true, true);
  }
};

// ===== 17-bosses.js
// ---------------------------------------------------------------- bosses: one framework (parts, armor, weak points, phases as coroutines)
MT.Boss = class Boss {
  constructor(W, kind, name, parts) {
    this.W = W; this.kind = kind; this.name = name; this.x = AR.cx; this.y = -40; this.z = 0; this.vx = 0; this.vy = 0; this.r = 26;
    const pl = Math.max(1, W.contestants.filter(c => c.state !== 'gone').length), k = MT.T.bossHp * (1 + .5 * (pl - 1));
    this.parts = parts.map(p => Object.assign({ armor: 1, weak: 1, alive: true, open: true, flash: 0 }, p, { hp: p.hp * k, max: p.hp * k }));
    this.phase = 'intro'; this.introDone = false; this.dead = false; this.deathT = 0; this.co = null; this.wait = 0; this.cond = null; this.t = 0; this.fireMul = 1;
    this.netKeys = [];
  }
  part(id) { return this.parts.find(p => p.id === id); }
  partPos(p) { return [this.x + (p.ox || 0), this.y + (p.oy || 0)]; }
  get hpPct() { const a = this.parts.reduce((s, p) => s + Math.max(0, p.hp), 0), b = this.parts.reduce((s, p) => s + p.max, 0); return b ? a / b : 0; }
  run(gen) { this.co = gen; this.wait = 0; this.cond = null; }
  setPhase(name) { this.phase = name; const f = this['ph_' + name]; this.run(f ? f.call(this, this.W) : null); this.W.event('bossPhase', { kind: this.kind, phase: name }); }
  stepCo(dt) {
    if (!this.co) return;
    if (this.wait > 0) { this.wait -= dt; if (this.wait > 0) return; }
    if (this.cond) { if (!this.cond()) return; this.cond = null; }
    const co = this.co, r = co.next();
    if (this.co !== co) return;   // the phase switched inside that step: the new coroutine runs from the next step
    if (r.done) { this.co = null; return; }
    const v = r.value; if (typeof v === 'number') this.wait = v; else if (typeof v === 'function') this.cond = v;
  }
  update(dt, W) {
    this.t += dt; for (const p of this.parts) p.flash = Math.max(0, p.flash - dt);
    if (this.dead) { this.deathT += dt; this.dying && this.dying(dt, W); return; }
    if (W.phase === 'bossIntro' && MT.game.players.some(p => p.pressed('confirm')) && this.skipIntro) this.skipIntro();
    this.stepCo(dt); this.tick && this.tick(dt, W);
    for (const c of W.contestants) if (c.state === 'play') for (const p of this.parts) if (p.alive && p.solid !== false) { const [x, y] = this.partPos(p), d = Math.hypot(c.x - x, c.y - y), m = p.r + c.r; if (d < m && d > 0) { c.x = x + (c.x - x) / d * m; c.y = y + (c.y - y) / d * m; } }
  }
  hittable(p) { return p.alive && p.open && this.introDone && !this.dead && !this.away; }
  hitTest(b) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [x, y] = this.partPos(p); if (Math.hypot(b.x - x, b.y - y) < p.r + b.r) return p; } return null; }
  damagePart(p, dmg, owner) {
    if (!this.hittable(p)) return;
    if (MT.CHEATS.oneHit) dmg = p.hp;
    const arm = typeof p.armor === 'function' ? p.armor.call(this) : p.armor, d = dmg * arm * p.weak;
    p.flash = .06;
    if (arm < .3) { this.W.event('tink', { x: this.partPos(p)[0], y: this.partPos(p)[1] }, false); if (!MT.CHEATS.oneHit) return; }
    p.hp -= d; if (owner && d > 0 && MT.R('drops') < .3) owner.addCash(Math.round(20 * this.W.ratings.X * MT.T.cashMul), this.W);
    if (p.hp <= 0) { p.hp = 0; p.alive = false; const [x, y] = this.partPos(p); this.W.event('partDown', { x, y, id: p.id, kind: this.kind }); this.W.ratings.gain(10, this.W); if (owner) owner.addCash(Math.round(5000 * this.W.ratings.X * MT.T.cashMul), this.W); this.onPart && this.onPart(p, this.W); }
  }
  splash(x, y, r, dmg, owner) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [px2, py2] = this.partPos(p); if (Math.hypot(px2 - x, py2 - y) < r + p.r) this.damagePart(p, dmg, owner); } }
  laser(x0, y0, dx, dy, L, dmg, c) { for (const p of this.parts) { if (!this.hittable(p)) continue; const [x, y] = this.partPos(p), t = (x - x0) * dx + (y - y0) * dy; if (t < 0 || t > L) continue; if (Math.hypot(x0 + dx * t - x, y0 + dy * t - y) < p.r) this.damagePart(p, dmg, c); } }
  bomb(dmg, c) { for (const p of this.parts) if (this.hittable(p)) this.damagePart(p, dmg / Math.max(1, this.parts.filter(q => q.alive).length) * 2, c); }
  contact(c, W) { if (this.dead || this.away || !this.introDone) return; const R = this.contactR; if (R && Math.hypot(c.x - this.x, c.y - this.y) < R + c.r) c.hurt(this.contactDmg || 1, this, W); }
  die(W) {
    if (this.dead) return; this.dead = true; this.deathT = 0; W.event('bossDie', { kind: this.kind, x: this.x, y: this.y });
    W.fShots.clear(); for (const e of W.enemies) if (!e.dead && e.counted) W.kill(e, null, { silent: true });
  }
  shower(W, n = 30) {
    for (let i = 0; i < n; i++) W.addPickup(MT.Rpick(['bill', 'stack', 'stack', 'gold', 'case'], 'drops'), this.x, this.y, { vx: MT.Rr(-140, 140, 'drops'), vy: MT.Rr(-20, 160, 'drops'), vz: MT.Rr(100, 220, 'drops'), z: 10 });
    for (let i = 0; i < 2; i++) W.addPickup('prize', this.x, this.y, { vx: MT.Rr(-80, 80, 'drops'), vy: MT.Rr(30, 120, 'drops'), vz: 200, z: 10 });
    W.addPickup('cap', this.x, this.y, { w: MT.Rpick(MT.CAPSULES, 'drops'), vy: 80, vz: 200, z: 10 });
  }
  aimAt(W) { const t = W.target(this); return t ? MT.ang(this, t) : Math.PI / 2; }
  toNet() { const o = [this.kind, Math.round(this.x), Math.round(this.y), Math.round(this.z), this.phase, this.parts.map(p => (p.alive ? 1 : 0) + (p.open ? 2 : 0)).join(''), this.parts.map(p => Math.round(p.hp / p.max * 99)), this.dead ? 1 : 0, this.introDone ? 1 : 0]; for (const k of this.netKeys) o.push(typeof this[k] === 'number' ? Math.round(this[k] * 100) / 100 : this[k]); return o; }
  fromNet(a) {
    this.x = a[1]; this.y = a[2]; this.z = a[3]; this.phase = a[4]; const bits = String(a[5]);
    this.parts.forEach((p, i) => { const b = +bits[i] || 0; p.alive = !!(b & 1); p.open = !!(b & 2); p.hp = (a[6][i] || 0) / 99 * p.max; });
    this.dead = !!a[7]; this.introDone = !!a[8]; this.netKeys.forEach((k, i) => { this[k] = a[9 + i]; });
  }
};

// ======================================================================= BOSS 1: MASHY
MT.paint.mashyFace = (g, cx, cy, k, o = {}) => {
  const T = MT.tn('#d8b070');
  px.disc(g, cx, cy, 15 * k, '#2a1a0a'); px.disc(g, cx, cy, 14 * k, T.sh); px.disc(g, cx - 2 * k, cy - 2 * k, 12 * k, T.base); px.disc(g, cx - 5 * k, cy - 6 * k, 4 * k, T.lt);
  for (const [dx, dy] of [[-6, 4], [7, -3], [3, 8], [-8, -6]]) px.dot(g, cx + dx * k, cy + dy * k, T.deep);
  const j = o.jiggle || 0, red = o.angry;
  for (const s of [-1, 1]) { px.disc(g, cx + s * 5 * k, cy - 3 * k, 3.6 * k, '#ffffff'); px.disc(g, cx + s * 5 * k + Math.sin(j + s) * 1.2 * k, cy - 3 * k + Math.cos(j * 1.3) * 1.2 * k, 1.6 * k, red ? '#ff3344' : '#1a1a1a'); }
  const mo = o.open || 0; px.rect(g, cx - 6 * k, cy + 4 * k, 12 * k, (2 + mo * 5) * k, '#3a0a0a'); if (mo > .2) px.rect(g, cx - 4 * k, cy + 5 * k, 8 * k, mo * 3 * k, '#ff6a8a');
  px.rect(g, cx - 6 * k, cy + 4 * k, 12 * k, k, '#fff7e8');
};
MT.BOSSES = {};
MT.BOSSES.mashy = {
  name: 'MASHY', create(W) { return new MT.Mashy(W); }
};
MT.Mashy = class Mashy extends MT.Boss {
  constructor(W) {
    super(W, 'mashy', 'MASHY', [
      { id: 'body', ox: 0, oy: 0, r: 26, hp: 160, armor() { return this.part('armL').alive || this.part('armR').alive ? .15 : .5; } },
      { id: 'armL', ox: -30, oy: 6, r: 10, hp: 45 }, { id: 'armR', ox: 30, oy: 6, r: 10, hp: 45 },
      { id: 'hatch', ox: 0, oy: 14, r: 9, hp: 60, weak: 2, open: false, solid: false }]);
    this.x = AR.cx; this.y = -30; this.dir = 1; this.hatchU = 0; this.charging = false; this.tread = 0; this.recoil = 0; this.chargeLine = null; this.netKeys = ['hatchU', 'tread', 'recoil', 'dir'];
    this.contactR = 30; this.contactDmg = 2;
    this.setPhase('intro');
  }
  skipIntro() { this.y = 70; this.introDone = true; this.setPhase('p1'); }
  *ph_intro(W) { W.arena.openFor('N'); W.event('bossIntro', { kind: 'mashy' }); while (this.y < 70) { this.y += 50 * W.lastDt; this.tread += W.lastDt * 30; yield; } W.arena.slam('N'); yield 1.2; this.introDone = true; this.setPhase('p1'); }
  *ph_p1(W) {
    let bT = 1, gT = 2.2;
    while (true) {
      const dt = W.lastDt; this.x += this.dir * 30 * dt; this.tread += dt * 30; if (this.x > 280) this.dir = -1; if (this.x < 88) this.dir = 1;
      const L = this.part('armL').alive, R = this.part('armR').alive, mul = (L && R) ? 1 : 1.3;
      if (!L && !R) { this.setPhase('p2'); return; }
      bT -= dt * mul; gT -= dt * mul;
      if (L && bT <= 0) { bT = 1.8; const a = this.aimAt(W); for (let k = 0; k < 5; k++) { const b = W.foe(this, 'butter', a - .45 + k * .225, 95); if (b) { b.x = this.x - 30; b.y = this.y + 12; } } this.recoil = .2; W.event('cannon', { x: this.x - 30, y: this.y }, false); }
      if (R && gT <= 0) { gT = 3.2; const a0 = this.aimAt(W) - .87; for (let k = 0; k < 12; k++) W.later(k * .1, () => { if (!this.part('armR').alive || this.dead) return; const b = W.foe(this, 'gravy', a0 + k / 11 * 1.74, 120); if (b) { b.x = this.x + 30; b.y = this.y + 12; } }); }
      this.recoil = Math.max(0, this.recoil - dt);
      yield;
    }
  }
  *ph_p2(W) {
    W.event('mashyArms', {});
    let hT = 2, rT = 1, tT = 3, gT = 4, off = 0;
    while (true) {
      const dt = W.lastDt; this.x += this.dir * 24 * dt; this.tread += dt * 24; if (this.x > 280) this.dir = -1; if (this.x < 88) this.dir = 1;
      hT -= dt; rT -= dt; tT -= dt; gT -= dt;
      const h = this.part('hatch'); const cyc = (this.t % 4.5); h.open = cyc > 2.3; this.hatchU = h.open ? Math.min(1, this.hatchU + dt * 5) : Math.max(0, this.hatchU - dt * 5);
      if (rT <= 0) { rT = 2.5; off = off ? 0 : Math.PI / 14; for (let k = 0; k < 14; k++) { const b = W.foe(this, 'orb', k / 14 * Math.PI * 2 + off, 80); } W.event('ring', { x: this.x, y: this.y }, false); }
      if (tT <= 0) { tT = 5; for (let k = 0; k < 3; k++) { const t = W.target(this); if (t) W.lob(this, clamp(t.x + MT.Rr(-40, 40), 30, 338), clamp(t.y + MT.Rr(-30, 30), 40, 210), 'tot', { time: 1.0, z: 30 }); } W.event('throw', { x: this.x, y: this.y }, false); }
      if (gT <= 0) { gT = 9; MT.spawnEntry(W, ['S', 'goon', 6, .3]); }
      if (this.part('body').hp / this.part('body').max < .35) { this.setPhase('p3'); return; }
      yield;
    }
  }
  *ph_p3(W) {
    W.event('mashyMad', {});
    const h = this.part('hatch'); let addT = 2;
    while (true) {
      for (let n = 0; n < 3; n++) {
        h.open = false; this.hatchU = 0; const t = W.target(this); if (!t) { yield .5; continue; }
        const a = MT.ang(this, t); this.chargeLine = a; W.event('rev', { x: this.x, y: this.y }, false);
        for (let k = 0; k < 108; k++) { addT -= W.lastDt; yield; }
        this.chargeLine = null; let dx = Math.cos(a), dy = Math.sin(a), tt = 0;
        while (tt < 2.5) { const dt = W.lastDt; tt += dt; this.x += dx * 170 * dt; this.y += dy * 170 * dt; this.tread += dt * 170; addT -= dt;
          let hit = false; if (this.x < 50) { this.x = 50; dx = Math.abs(dx); hit = true; } if (this.x > 318) { this.x = 318; dx = -Math.abs(dx); hit = true; } if (this.y < 50) { this.y = 50; dy = Math.abs(dy); hit = true; } if (this.y > 194) { this.y = 194; dy = -Math.abs(dy); hit = true; }
          if (hit) { W.event('crash', { x: this.x, y: this.y }); break; }
          yield; }
        if (addT <= 0) { addT = 10; MT.spawnEntry(W, ['E', 'clapbot', 3, .2]); MT.spawnEntry(W, ['W', 'clapbot', 3, .2]); }
      }
      h.open = true; for (let k = 0; k < 300; k++) { this.hatchU = Math.min(1, this.hatchU + W.lastDt * 5); addT -= W.lastDt; yield; }
    }
  }
  tick(dt, W) { if (this.part('body').hp <= 0 && !this.dead) { this.die(W); } }
  damagePart(p, dmg, owner) {
    if (p.id === 'hatch') { if (!this.hittable(p)) return; const b = this.part('body'); b.hp -= (MT.CHEATS.oneHit ? b.hp : dmg * 2); b.flash = p.flash = .06; if (b.hp <= 0) { b.hp = 0; b.alive = false; this.die(this.W); } return; }
    super.damagePart(p, dmg, owner);
  }
  onPart(p, W) { if (p.id === 'armL' || p.id === 'armR') W.event('armOff', { x: this.partPos(p)[0], y: this.partPos(p)[1] }); if (p.id === 'body') this.die(W); }
  dying(dt, W) { if (this.deathT < 2 && Math.floor(this.deathT * 8) !== Math.floor((this.deathT - dt) * 8)) W.event('boom', { x: this.x + MT.Rr(-26, 26, 'fx'), y: this.y + MT.Rr(-14, 14, 'fx'), big: true }); if (this.deathT >= 2 && !this.showered) { this.showered = true; W.event('bossBurst', { kind: 'mashy', x: this.x, y: this.y }); this.shower(W); } }
  draw(r, W) {
    if (this.showered) return;
    const x = this.x, y = this.y, T = MT.tn('#d8b070'), tn = MT.game.time, fl = (id) => this.part(id) && this.part(id).flash > 0;
    r.shadow(x, y, 30, .5);
    if (this.chargeLine !== null && this.chargeLine !== undefined) r.decal(() => { const a = this.chargeLine; for (let d = 30; d < 300; d += 10) r.groundDisc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.5, '#ff3344', .6); });
    r.queue(x, y, 0, g => {
      const k = MT.pk(r);
      for (const s of [-1, 1]) { const a = r.w(x + s * 22, y + 14, 0); px.rect(g, a[0] - 7 * k, a[1] - 9 * k, 14 * k, 10 * k, '#1a1a20'); for (let i = 0; i < 4; i++) { const yy = a[1] - 8 * k + ((i * 2.5 + this.tread * .3) % 10) * k; px.rect(g, a[0] - 7 * k, yy, 14 * k, k, '#4a4a52'); } }
      const b = r.w(x, y, 26); const f = fl('body') || (this.dead && Math.floor(tn * 20) % 2);
      px.disc(g, b[0], b[1] + 6 * k, 25 * k, '#1a1014'); px.disc(g, b[0], b[1] + 6 * k, 24 * k, f ? '#ffffff' : '#141018');
      px.poly(g, [[b[0] - 6 * k, b[1] - 6 * k], [b[0] + 6 * k, b[1] - 6 * k], [b[0], b[1] + 14 * k]], '#fff7e8');
      px.poly(g, [[b[0] - 7 * k, b[1] - 9 * k], [b[0], b[1] - 5 * k], [b[0] - 7 * k, b[1] - 1 * k]], '#c8202a'); px.poly(g, [[b[0] + 7 * k, b[1] - 9 * k], [b[0], b[1] - 5 * k], [b[0] + 7 * k, b[1] - 1 * k]], '#c8202a');
      MT.paint.mashyFace(g, b[0], b[1] - 20 * k, k * 1.1, { jiggle: tn * 9, open: this.hatchU, angry: this.phase === 'p3' });
      for (const [id, s] of [['armL', -1], ['armR', 1]]) {
        const p = this.part(id); if (!p.alive) continue; const a = r.w(x + s * 30, y + 6, 18), rc = this.recoil * 8 * k;
        px.disc(g, a[0], a[1], 9 * k, '#1a1014'); px.disc(g, a[0], a[1], 8 * k, fl(id) ? '#ffffff' : '#7a7a8a');
        const ang = this.aimAt(W), tip = [a[0] + Math.cos(ang) * (14 * k - rc), a[1] + Math.sin(ang) * 10 * k];
        px.line(g, a[0], a[1], tip[0], tip[1], s < 0 ? '#ffe680' : '#a0602a', Math.max(3, 5 * k)); px.disc(g, tip[0], tip[1], 3 * k, '#2a2a30');
        E.font.text(g, s < 0 ? 'BUTTER' : 'GRAVY', a[0], a[1] - 14 * k, '#ffcc33', { align: 'center', font: 'tiny', outline: '#000' });
      }
      if (this.phase === 'p3') for (let i = 0; i < 2; i++) px.dot(g, b[0] + MT.fxr() * 30 - 15, b[1] - 34 * k - MT.fxr() * 8, '#5a5a5a');
    });
  }
};

// ======================================================================= BOSS 2: THE WHEEL OF MISFORTUNE
MT.WHEEL_SEGS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
MT.WHEEL_COLS = ['#c8202a', '#2ee6ff', '#e8e8f0', '#1a1a1a', '#ff2e88', '#2a3a6a', '#ffcc33', '#22c55e'];
MT.BOSSES.wheel = { name: 'THE WHEEL OF MISFORTUNE', create(W) { return new MT.Wheel(W); } };
MT.Wheel = class Wheel extends MT.Boss {
  constructor(W) {
    const parts = MT.WHEEL_SEGS.map((n, i) => ({ id: 'seg' + i, seg: i, ox: 0, oy: 0, r: 8, hp: 18 }));
    parts.push({ id: 'core', ox: 0, oy: 0, r: 14, hp: 220, armor() { return this.phase === 'p2' || this.jackpot > 0 ? 1 : .15; } });
    super(W, 'wheel', 'THE WHEEL OF MISFORTUNE', parts);
    this.x = AR.cx; this.y = 52; this.z = 0; this.ang = 0; this.spin = 0; this.jackpot = 0; this.landed = -1; this.bulletMul = 1; this.beams = []; this.rollVX = 0; this.rollVY = 0; this.tilt = 0; this.rise = 0;
    this.netKeys = ['ang', 'jackpot', 'landed', 'tilt', 'rise']; this.forced = []; this.setPhase('intro');
  }
  partPos(p) { if (p.seg === undefined) return [this.x, this.y]; const a = this.ang + (p.seg + .5) / 8 * Math.PI * 2; return [this.x + Math.cos(a) * 34, this.y + Math.sin(a) * 34 * .55]; }
  skipIntro() { this.rise = 1; this.introDone = true; this.setPhase('p1'); }
  *ph_intro(W) { W.event('bossIntro', { kind: 'wheel' }); while (this.rise < 1) { this.rise = Math.min(1, this.rise + W.lastDt * .5); this.ang += W.lastDt * 2; yield; } yield 1.5; this.introDone = true; this.setPhase('p1'); }
  living() { return this.parts.filter(p => p.seg !== undefined && p.alive).map(p => p.seg); }
  *spinTo(W, dur = 2.5, mult = 1) {
    const live = this.living(); if (!live.length) return -1;
    const pick = this.forced.length ? (live.includes(this.forced[0]) ? this.forced.shift() : (this.forced.shift(), MT.Rpick(live, 'ai'))) : MT.Rpick(live, 'ai');
    // the pointer is at the top (angle -PI/2): land pick's centre there
    const target = -Math.PI / 2 - (pick + .5) / 8 * Math.PI * 2, a0 = this.ang, turns = Math.PI * 2 * (3 * mult);
    let end = target; while (end < a0 + turns) end += Math.PI * 2;
    W.event('spin', {}); let t = 0, lastSeg = -1;
    while (t < dur / mult) { t += W.lastDt; const u = Math.min(1, t / (dur / mult)); this.ang = a0 + (end - a0) * MT.ease.outCubic(u); const seg = Math.floor(((-Math.PI / 2 - this.ang) / (Math.PI * 2) * 8 % 8 + 8) % 8); if (seg !== lastSeg) { lastSeg = seg; W.event('wheelClick', {}, false); } yield; }
    this.landed = pick; W.event('wheelLand', { seg: pick, name: MT.WHEEL_SEGS[pick] }); return pick;
  }
  *attack(W, seg) {
    const bm = this.bulletMul; this.bulletMul = 1;
    const sp = (s) => s * bm;
    switch (MT.WHEEL_SEGS[seg]) {
      case 'TOMATO TIME': for (let i = 0; i < 8; i++) { const t = W.living()[i % Math.max(1, W.living().length)] || W.target(this); if (t) W.lob({ x: i % 2 ? -20 : 388, y: MT.Rr(40, 200), kind: 'heckler' }, clamp(t.x + MT.Rr(-20, 20), 24, 344), clamp(t.y + MT.Rr(-20, 20), 24, 216), 'tomato', { time: 1.1, z: 30 }); yield .3; } yield 2; break;
      case 'LASER LIGHTS': {
        const base = this.aimAt(W); this.beams = [0, 1, 2, 3].map(k => ({ a: base + k * Math.PI / 2, tele: .8, on: 0 }));
        let t = 0; while (t < 4.8) { const dt = W.lastDt; t += dt; for (const b of this.beams) { if (b.tele > 0) b.tele -= dt; else { b.on += dt; b.a += .3 * dt * bm; } } this.beamHurt(W); yield; }
        this.beams = []; break;
      }
      case 'MIME TIME': for (let i = 0; i < 6; i++) { const t = MT.Rpick(W.living().length ? W.living() : [{ x: 184, y: 150 }], 'spawn'); let x, y, k = 0; do { const a = MT.Rr(0, 6.28, 'spawn'), d = MT.Rr(46, 90, 'spawn'); x = clamp(t.x + Math.cos(a) * d, 30, 338); y = clamp(t.y + Math.sin(a) * d, 90, 210); k++; } while (k < 10 && W.living().some(c => Math.hypot(c.x - x, c.y - y) < 40)); W.spawnAt('mime', x, y, {}); W.event('puff', { x, y }, false); } yield 4; break;
      case 'BANKRUPT': W.ratings.lose(10); W.event('bankrupt', {}); for (let ring = 0; ring < 2; ring++) { for (let k = 0; k < 20; k++) W.foe(this, 'coin', k / 20 * Math.PI * 2 + ring * .157, sp(85)); yield .6; } yield 3; break;
      case 'DISCO FEVER': for (let i = 0; i < 2; i++) { const e = W.spawnAt('disco', this.x + (i ? 20 : -20), this.y + 30, {}); e.dy = .707; e.dx = i ? .707 : -.707; } yield 5; break;
      case 'GOON SQUAD': MT.spawnEntry(W, ['E', 'goon', 4, .25]); MT.spawnEntry(W, ['W', 'goon', 4, .25]); MT.spawnEntry(W, ['S', 'goon', 4, .25]); yield 5; break;
      case 'JACKPOT': W.event('jackpot', {}); for (let i = 0; i < 20; i++) W.addPickup(MT.Rpick(['bill', 'stack', 'gold'], 'drops'), MT.Rr(40, 328, 'drops'), MT.Rr(90, 210, 'drops'), { z: 90 }); W.addPickup('cap', MT.Rr(80, 288, 'drops'), MT.Rr(100, 200, 'drops'), { z: 90, w: MT.Rpick(MT.CAPSULES, 'drops') }); this.jackpot = 3; while (this.jackpot > 0) { this.jackpot -= W.lastDt; yield; } this.jackpot = 0; break;
      case 'SPIN AGAIN': W.event('spinAgain', {}); this.bulletMul = 1.2; { const s2 = yield* this.spinTo(W, 2.5, 1.5); if (s2 >= 0 && MT.WHEEL_SEGS[s2] !== 'SPIN AGAIN') yield* this.attack(W, s2); } break;
    }
  }
  beamHurt(W) {
    for (const b of this.beams) { if (b.tele > 0) continue; const dx = Math.cos(b.a), dy = Math.sin(b.a);
      for (const c of W.contestants) { if (!c.canBeHit) continue; const t = (c.x - this.x) * dx + (c.y - this.y) * dy; if (t < 0) continue; if (Math.hypot(this.x + dx * t - c.x, this.y + dy * t - c.y) < 5 + c.r * .6) c.hurt(1, c, W); } }
  }
  *ph_p1(W) {
    while (true) {
      if (this.living().length <= 4) { this.setPhase('p2'); return; }
      const seg = yield* this.spinTo(W); if (seg < 0) { this.setPhase('p2'); return; }
      yield .8; yield* this.attack(W, seg); yield 1;
    }
  }
  *ph_p2(W) {
    W.event('wheelLoose', {}); this.rollVX = 85; this.rollVY = 60; let landT = 6;
    while (true) {
      const dt = W.lastDt; this.x += this.rollVX * dt; this.y += this.rollVY * dt; this.ang += dt * 3 * Math.sign(this.rollVX); landT -= dt;
      let hit = false; if (this.x < 56) { this.x = 56; this.rollVX = Math.abs(this.rollVX); hit = true; } if (this.x > 312) { this.x = 312; this.rollVX = -Math.abs(this.rollVX); hit = true; } if (this.y < 48) { this.y = 48; this.rollVY = Math.abs(this.rollVY); hit = true; } if (this.y > 196) { this.y = 196; this.rollVY = -Math.abs(this.rollVY); hit = true; }
      if (hit) { for (let k = 0; k < 8; k++) W.foe(this, 'orb', k / 8 * Math.PI * 2, 90); W.event('crash', { x: this.x, y: this.y }, false); }
      if (landT <= 0) { landT = 6; const live = this.living(); if (live.length) { const seg = MT.Rpick(live, 'ai'); this.landed = seg; W.event('wheelLand', { seg, name: MT.WHEEL_SEGS[seg] }); const g = this.attack(W, seg); let r = g.next(); while (!r.done) { if (typeof r.value === 'number') { let w = r.value; while (w > 0) { w -= W.lastDt; this.x += this.rollVX * W.lastDt * .3; yield; } } else yield; r = g.next(); } } }
      yield;
    }
  }
  get contactR() { return this.phase === 'p2' ? 40 * .7 : 0; }
  get contactDmg() { return 2; }
  tick(dt, W) { if (this.part('core').hp <= 0 && !this.dead) this.die(W); }
  onPart(p, W) { if (p.seg !== undefined) W.event('segVoid', { name: MT.WHEEL_SEGS[p.seg] }); if (p.id === 'core') this.die(W); }
  dying(dt, W) { this.tilt = Math.min(1, this.deathT / 1.5); this.ang += dt * (8 - this.deathT * 3); if (this.deathT < 2.4 && Math.floor(this.deathT * 6) !== Math.floor((this.deathT - dt) * 6)) W.event('boom', { x: this.x + MT.Rr(-30, 30, 'fx'), y: this.y + MT.Rr(-12, 12, 'fx'), big: true }); if (this.deathT >= 2.4 && !this.showered) { this.showered = true; W.event('bossBurst', { kind: 'wheel', x: this.x, y: this.y }); this.shower(W); } }
  draw(r, W) {
    if (this.showered) return;
    const x = this.x, y = this.y, tn = MT.game.time, Rr = 44, flat = .55 + this.tilt * .35, lift = (1 - this.tilt) * 40 * this.rise;
    r.shadow(x, y + 6, 40, .5);
    for (const b of this.beams) r.queue(x, y, 30, g => { const a = r.w(x, y, 10), e = r.w(x + Math.cos(b.a) * 400, y + Math.sin(b.a) * 400, 10); if (b.tele > 0) { if (Math.floor(tn * 16) % 2) px.line(g, a[0], a[1], e[0], e[1], '#ff3344', 1); } else { px.line(g, a[0], a[1], e[0], e[1], '#ffffff', 3); px.line(g, a[0], a[1], e[0], e[1], '#2ee6ff', 1); } }, { emissive: true });
    if (this.phase !== 'p2' && !this.dead) r.queue(x, y - 8, 0, g => { const T = MT.tn('#5a4a6a'); r.box(g, x - 8, y - 14, 0, x + 8, y - 6, 40, T.lt, T.sh); }, { bias: -3 });
    r.queue(x, y, lift, g => {
      const c = r.w(x, y, lift + 14), k = MT.pk(r);
      for (let i = 0; i < 8; i++) {
        const p = this.parts[i], a0 = this.ang + i / 8 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 8, pts = [[c[0], c[1]]];
        for (let s = 0; s <= 6; s++) { const a = a0 + (a1 - a0) * s / 6; pts.push([c[0] + Math.cos(a) * Rr * k, c[1] + Math.sin(a) * Rr * k * flat]); }
        const col = p.alive ? MT.WHEEL_COLS[i] : '#14101c'; px.poly(g, pts, p.flash > 0 ? '#ffffff' : (this.landed === i && Math.floor(tn * 8) % 2 ? '#ffffff' : col));
        const am = (a0 + a1) / 2, lx = c[0] + Math.cos(am) * Rr * .62 * k, ly = c[1] + Math.sin(am) * Rr * .62 * k * flat;
        if (p.alive) { for (let b = 0; b < 3; b++) { const bb = am - .18 + b * .18; px.disc(g, c[0] + Math.cos(bb) * 34 * k, c[1] + Math.sin(bb) * 34 * k * flat, 2.2 * k, (b + Math.floor(tn * 8)) % 3 ? '#fff4b0' : '#ffcc33'); } px.disc(g, lx, ly, 2.5 * k, i === 3 ? '#ffcc33' : '#14101c'); }
        else px.line(g, lx - 3 * k, ly - 3 * k, lx + 3 * k, ly + 3 * k, '#5a4a6a', 1);
      }
      for (let s = 0; s < 32; s++) { const a = s / 32 * Math.PI * 2; px.dot(g, c[0] + Math.cos(a) * (Rr + 1) * k, c[1] + Math.sin(a) * (Rr + 1) * k * flat, '#ffcc33'); }
      const core = this.part('core'); MT.paint.shade(g, c[0], c[1], 13 * k, core.flash > 0 ? '#ffffff' : this.jackpot > 0 ? '#ffcc33' : '#c8d0e0');
      E.font.text(g, '$', c[0], c[1] - 3, '#3a2a00', { align: 'center', outline: false });
      if (this.phase !== 'p2') { const tp = [c[0], c[1] - Rr * k * flat - 4]; px.poly(g, [[tp[0] - 4, tp[1] - 6], [tp[0] + 4, tp[1] - 6], [tp[0], tp[1] + 3]], '#ff3344'); }
    }, { emissive: false });
    MT.game.lights.add(x, y, 20, 70, .5, { color: '#ffe080' });
  }
};

// ======================================================================= BOSS 3: LANCE LUSTRE LIVE! -> THE NETWORK
MT.BOSSES.lance = { name: 'LANCE IN THE STARMAKER 9000', create(W) { return new MT.Starmaker(W); } };
MT.Starmaker = class Starmaker extends MT.Boss {
  constructor(W) {
    super(W, 'lance', 'LANCE IN THE STARMAKER 9000', [
      { id: 'podium', ox: 0, oy: 0, r: 22, hp: 260 }, { id: 'turL', ox: -28, oy: 4, r: 8, hp: 30 }, { id: 'turR', ox: 28, oy: 4, r: 8, hp: 30 }]);
    this.x = AR.cx; this.y = 60; this.z = 120; this.hover = 0; this.cones = []; this.mic = null; this.shock = null; this.away = false; this.breaks = 0; this.form = 'starmaker';
    this.tvs = []; this.eye = null; this.wallRise = 0; this.peel = 0; this.netKeys = ['hover', 'form', 'wallRise', 'peel', 'away'];
    this.rig = MT.cfg.skipRigs ? null : new E.Humanoid({ size: 1.4, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long', colors: { skin: '#f0c098', hair: '#d8dce8', cloth: '#7a2a9a', coat: '#6a1a8a', pants: '#14101c', boot: '#0a0a10', trim: '#ffcc33', glove: '#ffffff' } });
    this.setPhase('intro');
  }
  skipIntro() { this.z = 20; this.introDone = true; this.setPhase('pA'); }
  *ph_intro(W) { W.event('bossIntro', { kind: 'lance' }); while (this.z > 20) { this.z -= W.lastDt * 40; yield; } this.z = 20; yield 2.5; this.introDone = true; this.setPhase('pA'); }
  podiumHp() { const p = this.part('podium'); return p.hp / p.max; }
  *ph_pA(W) {
    const pats = ['cyclone', 'mic', 'sweep'];
    let k = 0;
    while (true) {
      if (this.breaks === 0 && this.podiumHp() < .66 || this.breaks === 1 && this.podiumHp() < .33) { yield* this.commercial(W); continue; }
      const p = this.forcePat || pats[k++ % 3]; this.forcePat = null;
      if (p === 'cyclone') yield* this.cyclone(W); else if (p === 'mic') yield* this.micDrop(W); else yield* this.sweep(W);
      yield 1;
    }
  }
  *cyclone(W) {
    W.event('cyclone', {}); let t = 0, acc = 0;
    while (t < 3) { const dt = W.lastDt; t += dt; acc += dt * 12; while (acc >= 1) { acc--; for (let a = 0; a < 3; a++) W.foe(this, 'card', t * 1.4 + a * Math.PI * 2 / 3, 95); } yield; }
  }
  *micDrop(W) {
    const t0 = W.target(this); if (!t0) return; const tx = clamp(t0.x, 40, 328), ty = clamp(t0.y, 60, 200);
    W.event('micDrop', {}); this.mic = { x: tx, y: ty, t: 0 };
    const sx = this.x, sy = this.y; let t = 0;
    while (t < 1.0) { const dt = W.lastDt; t += dt; this.mic.t = t; this.z = 20 + Math.sin(t / 1 * Math.PI / 2) * 60; this.x = lerp(sx, tx, t); this.y = lerp(sy, ty - 10, t); yield; }
    this.z = 0; this.x = tx; this.y = ty - 10; this.mic = null; W.event('slam', { x: tx, y: ty });
    for (let a = 0; a < 24; a++) W.foe(this, 'orb', a / 24 * Math.PI * 2, 80);
    this.shock = { x: tx, y: ty, r: 10, hit: new Set() }; while (this.shock.r < 80) { this.shock.r += W.lastDt * 110; for (const c of W.contestants) { if (!c.canBeHit || this.shock.hit.has(c.slot)) continue; const d = Math.hypot(c.x - tx, c.y - ty); if (Math.abs(d - this.shock.r) < 6) { this.shock.hit.add(c.slot); c.hurt(1, this.shock, W); } } yield; }
    this.shock = null; t = 0; while (t < .8) { t += W.lastDt; this.z = 20 * (t / .8); yield; }
  }
  *sweep(W) {
    W.event('sweep', {}); this.cones = [];
    for (const [id, s] of [['turL', -1], ['turR', 1]]) if (this.part(id).alive) this.cones.push({ id, s, a: Math.PI / 2 - s * .9, lit: {} });
    if (!this.cones.length) { yield 1; return; }
    let t = 0; while (t < 4) { const dt = W.lastDt; t += dt;
      for (const cn of this.cones) { if (!this.part(cn.id).alive) continue; cn.a += cn.s * dt * .45; const [ox, oy] = this.partPos(this.part(cn.id));
        for (const c of W.contestants) { if (!c.canBeHit) { cn.lit[c.slot] = 0; continue; } const a = Math.atan2(c.y - oy, c.x - ox), d = Math.hypot(c.x - ox, c.y - oy); if (Math.abs(MT.angDiff(cn.a, a)) < .22 && d < 230) { cn.lit[c.slot] = (cn.lit[c.slot] || 0) + dt; if (cn.lit[c.slot] >= .4) { cn.lit[c.slot] = 0; c.hurt(1, { x: ox, y: oy }, W); } } else cn.lit[c.slot] = 0; } }
      yield; }
    this.cones = [];
  }
  *commercial(W) {
    this.breaks++; W.event('commercial', {}); this.away = true;
    let t = 0; while (t < 1) { t += W.lastDt; this.z += W.lastDt * 150; yield; }
    MT.spawnEntry(W, ['all', 'goon', 3, .3]); MT.spawnEntry(W, ['sides', 'clapbot', 3, .25]); MT.spawnEntry(W, ['N', 'brute', 1]);
    yield 1.5; t = 0; while (t < 12 && W.alive() > 0) { t += W.lastDt; yield; }
    W.event('backFromBreak', {}); while (this.z > 20) { this.z -= W.lastDt * 150; yield; } this.z = 20; this.away = false;
  }
  tick(dt, W) {
    this.hover += dt; if (this.form === 'starmaker' && !this.mic && !this.away && W.phase === 'boss') {
      const t = W.target(this); if (t) { const d = MT.dist(this, t), a = MT.ang(this, t), want = d < 100 ? -1 : d > 140 ? 1 : 0; this.x = clamp(this.x + Math.cos(a) * want * 40 * dt, 50, 318); this.y = clamp(this.y + Math.sin(a) * want * 40 * dt, 46, 120); }
    }
    if (this.form === 'starmaker' && this.part('podium').hp <= 0 && !this.revealing) { this.revealing = true; this.run(this.reveal(W)); }
    if (this.form === 'network') { const eye = this.part('eye'); if (eye && eye.hp <= 0 && !this.dead) this.die(W); }
    if (this.rig && !MT.cfg.skipRigs) this.rig.update(dt, { x: this.x, y: this.y, z: this.z + 22, facing: Math.PI / 2, pose: this.form === 'starmaker' ? (this.mic ? 'cheer' : ['wave', 'hips', 'cast'][Math.floor(this.hover / 2) % 3]) : 'down', expr: 'shout' });
  }
  *reveal(W) {
    this.away = true; W.fShots.clear(); this.cones = []; this.mic = null; this.shock = null; W.event('lanceDown', {}); for (const e of W.enemies) if (!e.dead && e.counted) W.kill(e, null, { silent: true });
    let t = 0; while (t < 1.2) { t += W.lastDt; this.z = Math.max(0, this.z - W.lastDt * 60); yield; }
    W.event('boom', { x: this.x, y: this.y, big: true }); yield 1.2;
    t = 0; while (t < 1.5) { t += W.lastDt; this.peel = t / 1.5; yield; } MT.run && (MT.run.lanceRobot = true); W.event('robotReveal', {});
    yield 3;
    // THE NETWORK: the north wall rises, a wall of twelve TVs around THE EYE
    this.form = 'network'; this.name = 'THE NETWORK'; this.x = AR.cx; this.y = 52; this.z = 0; W.event('networkReveal', {});
    const cols = [96, 140, 228, 272], rows = [30, 52, 74], k = MT.T.bossHp * (1 + .5 * (Math.max(1, W.contestants.length) - 1));
    this.parts = []; let i = 0;
    for (const yy of rows) for (const xx of cols) this.parts.push({ id: 'tv' + i, tv: i++, ox: xx - AR.cx, oy: yy - 52, r: 10, hp: 22 * k, max: 22 * k, armor: 1, weak: 1, alive: true, open: true, flash: 0, ch: 'off', chT: MT.Rr(1, 4), tele: 0, act: 0 });
    this.parts.push({ id: 'eye', ox: 0, oy: 0, r: 18, hp: 300 * k, max: 300 * k, armor: () => this.parts.filter(p => p.tv !== undefined && p.alive).length > 4 ? .15 : 1, weak: 1, alive: true, open: true, flash: 0 });
    t = 0; while (t < 2) { t += W.lastDt; this.wallRise = t / 2; yield; } this.wallRise = 1; this.away = false; this.revealing = false;
    this.setPhase('pB');
  }
  *ph_pB(W) {
    let eyeT = 3, mode = 0;
    while (true) {
      const dt = W.lastDt; const tvs = this.parts.filter(p => p.tv !== undefined);
      const active = tvs.filter(p => p.alive && p.ch !== 'off').length;
      for (const p of tvs) {
        if (!p.alive) continue;
        if (p.ch === 'off') { p.chT -= dt; if (p.chT <= 0 && active < 4) { p.ch = this.forceCh || MT.Rpick(['STATIC', 'NEWS', 'CARTOON', 'SHOPPING', 'LANCE'], 'ai'); this.forceCh = null; p.tele = .5; p.act = 0; W.event('channel', {}, false); } else if (p.chT <= 0) p.chT = 1; continue; }
        if (p.tele > 0) { p.tele -= dt; if (p.tele <= 0) this.tvFire(W, p); continue; }
        p.act += dt; if (p.ch === 'NEWS') this.newsHurt(W, p);
        if (p.act > (p.ch === 'NEWS' ? 1.8 : 1)) { p.ch = 'off'; p.chT = MT.Rr(4, 6, 'ai'); }
      }
      if (tvs.filter(p => p.alive).length <= 4) { eyeT -= dt; if (eyeT <= 0) { eyeT = 3; mode ^= 1; if (mode) { for (let k = 0; k < 18; k++) W.foe(this, 'orb', k / 18 * Math.PI * 2, 85); } else W.later(0, () => this.spiral(W)); W.event('eyeFire', {}, false); } }
      yield;
    }
  }
  spiral(W) { for (let i = 0; i < 24; i++) W.later(i * .08, () => { if (this.dead) return; for (const s of [0, Math.PI]) { const b = W.foe(this, 'static', this.t * 2 + s + i * .2, 80); } }); }
  tvFire(W, p) {
    const [x, y] = this.partPos(p), o = { x, y, r: 10, kind: 'tv' };
    if (p.ch === 'STATIC') { const t = W.target(o); if (t) for (let k = 0; k < 5; k++) W.foe(o, 'static', MT.ang(o, t) + (k - 2) * .14, 80); }
    else if (p.ch === 'CARTOON') { for (let k = 0; k < 2; k++) { const e = W.spawnAt('clapbot', x + (k ? 10 : -10), y + 18, {}); } }
    else if (p.ch === 'SHOPPING') W.addPickup(MT.Rpick(['stack', 'gold'], 'drops'), x, y + 22, { vy: 60, vz: 120, z: 10 });
    else if (p.ch === 'LANCE') { const t = W.target(o); if (t) for (let k = -1; k <= 1; k++) W.foe(o, 'card', MT.ang(o, t) + k * .3, 90); }
  }
  newsHurt(W, p) { if (p.act < .8) return; const [x] = this.partPos(p); for (const c of W.contestants) if (c.canBeHit && Math.abs(c.x - x) < 7 + c.r * .5 && c.y > 80) c.hurt(1, { x, y: c.y - 5 }, W); }
  onPart(p, W) { if (p.tv !== undefined) W.event('tvDown', { x: this.partPos(p)[0], y: this.partPos(p)[1] }); if (p.id === 'eye') this.die(W); }
  dying(dt, W) { if (this.deathT < 2.6 && Math.floor(this.deathT * 6) !== Math.floor((this.deathT - dt) * 6)) { const p = MT.Rpick(this.parts, 'fx'), [x, y] = this.partPos(p); W.event('boom', { x, y, big: true }); } if (this.deathT >= 2.6 && !this.showered) { this.showered = true; W.event('signalLost', {}); this.shower(W, 40); } }
  get contactR() { return this.form === 'starmaker' && this.z < 8 ? 20 : 0; }
  draw(r, W) {
    const tn = MT.game.time, x = this.x, y = this.y;
    if (this.form === 'starmaker') {
      if (this.mic) r.decal(() => { r.groundDisc(this.mic.x, this.mic.y, 30 * (.4 + this.mic.t * .6), '#ff3344', .35); r.groundRing(this.mic.x, this.mic.y, 30, '#ffcc33', .9); });
      if (this.shock) r.decal(() => r.groundRing(this.shock.x, this.shock.y, this.shock.r, '#ffffff', .9));
      for (const cn of this.cones) { const p = this.part(cn.id); if (!p.alive) continue; const [ox, oy] = this.partPos(p); r.decal(() => r.groundArc(ox, oy, 6, 230, cn.a - .22, cn.a + .22, '#fff4c0', .35)); for (let d = 40; d < 230; d += 50) MT.game.lights.add(ox + Math.cos(cn.a) * d, oy + Math.sin(cn.a) * d, 0, 26, .5, { color: '#fff4c0' }); }
      if (this.away && !this.revealing) return;
      const z = this.z + Math.sin(this.hover * 2) * 2; r.shadow(x, y, 24, .5);
      r.queue(x, y, z, g => {
        const k = MT.pk(r), b = r.w(x, y, z), T = MT.tn('#ffcc33'), pod = this.part('podium'), fl = pod.flash > 0;
        for (const s of [-1, 1]) { const j = r.w(x + s * 14, y, z - 2); px.disc(g, j[0], j[1] + 3 * k, 4 * k, Math.floor(tn * 20) % 2 ? '#ffcc33' : '#ff6a20'); }
        px.poly(g, [[b[0] - 20 * k, b[1]], [b[0] + 20 * k, b[1]], [b[0] + 15 * k, b[1] - 20 * k], [b[0] - 15 * k, b[1] - 20 * k]], fl ? '#ffffff' : T.sh);
        px.poly(g, [[b[0] - 15 * k, b[1] - 20 * k], [b[0] + 15 * k, b[1] - 20 * k], [b[0] + 12 * k, b[1] - 24 * k], [b[0] - 12 * k, b[1] - 24 * k]], fl ? '#ffffff' : T.lt);
        E.font.text(g, '9000', b[0], b[1] - 14 * k, '#5a0a3a', { align: 'center', font: 'tiny', outline: false });
        for (const [id, s] of [['turL', -1], ['turR', 1]]) { const p = this.part(id); if (!p.alive) continue; const q = r.w(x + s * 28, y + 4, z + 8); px.disc(g, q[0], q[1], 6 * k, '#1a1a22'); px.disc(g, q[0], q[1], 5 * k, p.flash > 0 ? '#ffffff' : '#c8d0e0'); px.disc(g, q[0] + 1, q[1] + 1, 2.5 * k, '#fff4b0'); }
      });
      if (this.rig && !MT.cfg.skipRigs && this.peel < 1) r.actor(x, y + 1, z + 22, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { flash: this.part('podium').flash > 0 ? '#ffffff' : false });
      if (this.peel > 0) r.queue(x, y + 2, z + 50, g => { const p = r.w(x, y, z + 50), k = MT.pk(r); px.disc(g, p[0], p[1], 7 * k, '#5a5a6a'); for (let i = 0; i < 4; i++) px.rect(g, p[0] - 5 * k, p[1] - 3 * k + i * 2 * k, 10 * k, k, '#1a1a22'); px.dot(g, p[0] - 3 * k, p[1] - 4 * k, '#ff3344'); px.dot(g, p[0] + 3 * k, p[1] - 4 * k, '#ff3344'); if (this.peel < 1) px.rect(g, p[0] - 7 * k, p[1] - 8 * k + this.peel * 16 * k, 14 * k, 6 * k, '#f0c098'); }, { bias: 4 });
      return;
    }
    // the TV wall and THE EYE
    if (this.showered) return;
    r.queue(184, 20, 0, g => { const T = MT.tn('#2a2a3a'), h = 20 + 50 * this.wallRise; r.box(g, 60, 14, 0, 308, 22, h, T.lt, T.sh); }, { bias: -5 });
    for (const p of this.parts) {
      const [px0, py0] = this.partPos(p);
      if (p.tv !== undefined) r.queue(px0, py0, 0, g => {
        const T = MT.tn('#3a3a48'); r.box(g, px0 - 3, py0 - 2, 0, px0 + 3, py0 + 2, 8, T.lt, T.sh);
        const a = r.w(px0, py0, 22), k = MT.pk(r); px.rect(g, a[0] - 10 * k, a[1] - 8 * k, 20 * k, 16 * k, '#14141c');
        if (!p.alive) { px.rect(g, a[0] - 8 * k, a[1] - 6 * k, 16 * k, 12 * k, '#0a0a0a'); px.line(g, a[0] - 6 * k, a[1] - 5 * k, a[0] + 5 * k, a[1] + 4 * k, '#5a5a6a'); return; }
        const sc = p.flash > 0 ? '#ffffff' : p.tele > 0 && Math.floor(tn * 16) % 2 ? '#ffffff' : p.ch === 'off' ? '#1a2a3a' : p.ch === 'NEWS' ? '#2a4aa8' : p.ch === 'CARTOON' ? '#ffcc33' : p.ch === 'SHOPPING' ? '#22c55e' : p.ch === 'LANCE' ? '#7a2a9a' : '#8a8aa8';
        px.rect(g, a[0] - 8 * k, a[1] - 6 * k, 16 * k, 12 * k, sc);
        if (p.ch === 'STATIC') for (let i = 0; i < 12; i++) px.dot(g, a[0] - 8 * k + MT.fxr() * 16 * k, a[1] - 6 * k + MT.fxr() * 12 * k, '#ffffff');
        if (p.ch === 'LANCE' && MT.cast.robo && !MT.cfg.skipRigs) MT.cast.robo.drawPortrait(g, a[0] - 6 * k, a[1] - 6 * k, 12 * k, { zoom: 3 });
        if (p.ch !== 'off' && p.ch !== 'LANCE') E.font.text(g, p.ch.slice(0, 4), a[0], a[1] - 2, '#14101c', { align: 'center', font: 'tiny', outline: false });
      }, { emissive: p.alive && p.ch !== 'off' });
      if (p.tv !== undefined && p.alive && p.ch === 'NEWS') r.decal(() => { const on = p.tele <= 0 && p.act >= .8; for (let yy = py0 + 12; yy < 224; yy += 6) r.groundDisc(px0, yy, on ? 6 : 1.5, on ? '#9ad0ff' : '#ff3344', on ? .7 : .8); });
      if (p.id === 'eye') r.queue(px0, py0, 30, g => {
        const a = r.w(px0, py0, 30), k = MT.pk(r), open = p.armor() >= 1, fl = p.flash > 0;
        px.disc(g, a[0], a[1], 19 * k, '#14141c'); px.disc(g, a[0], a[1], 17 * k, fl ? '#ffffff' : '#c8d0e0');
        px.disc(g, a[0], a[1], (open ? 11 + Math.sin(tn * 3) * 2 : 5) * k, '#ff3344'); px.disc(g, a[0], a[1], (open ? 5 : 2) * k, '#14040a'); px.dot(g, a[0] - 4 * k, a[1] - 5 * k, '#ffffff');
        E.font.text(g, 'THE EYE', a[0], a[1] + 20 * k, '#ff3344', { align: 'center', font: 'tiny', outline: '#000' });
      }, { emissive: true });
    }
  }
};

// ===== 18-world.js
// ---------------------------------------------------------------- the World: everything in one room, stepped authoritatively
MT.World = class World {
  constructor(o) {
    this.room = o.room; this.ep = o.room.ep || 1; this.mode = o.mode || 'arcade'; this.entry = o.entry || 'S';
    this.arena = new MT.Arena(o.room.set || (MT.EPISODES[this.ep] || {}).set || 'studio');
    this.contestants = o.contestants || []; this.enemies = []; this.pickups = []; this.solids = [];
    this.pShots = new MT.Shots('p'); this.fShots = new MT.Shots('f');
    this.ratings = o.ratings || new MT.Ratings(); this.ratings.stuntDone = false; this.ratings.low = 0;
    this.boss = null; this.phase = 'enter'; this.phaseT = 0; this.t = 0; this.timers = []; this.scripts = [];
    this.events = []; this.seq = o.seq || 0; this.keysOn = o.keysOn !== false; this.keyGiven = false;
    this.hash = new E.SpatialHash(32); this.waveIdx = -1; this.wavesTotal = 0; this.allSpawned = false; this.cleared = false;
    this.exitDir = null; this.exitT = 0; this.hurryT = 0; this.cashMul = o.room.cashMul || 1; this.dropBoost = o.room.dropBoost || 1;
    this.laserBeams = []; this.jumboClock = null; this.stats = { spawned: {}, killed: {} }; this.lastDt = 1 / 120; this.result = null;
    this.tutorial = o.tutorial || false; this.intro = o.intro !== false; this.onLeave = o.onLeave || null;
    MT.W = this;
  }
  // ------------------------------------------------ lifecycle
  start() {
    const room = this.room, n = this.contestants.length;
    this.contestants.forEach((c, k) => { if (c.state === 'gone') return; c.placeWalkIn(this.entry, k, n); if (c.state === 'out') { c.x = -100; } });
    this.arena.slam(this.entry);
    for (const [kind, cx, cy] of room.place || []) { const [x, y] = MT.cell(cx, cy); const e = this.spawnAt(kind, x, y, { placed: true }); if (e) e.placed = true; }
    for (const [at, item, where] of room.items || []) this.later(at + 1.2, () => this.placeItem(item, where, true));
    if (room.hazards) for (const h of room.hazards) { if (h.kind === 'conveyor') this.arena.addConveyor(h.rows, h.dirs); if (h.kind === 'vents') this.arena.addVents(h.cx, h.cy, h.patterns, h.every); }
    if (room.pedestals) for (const p of room.pedestals) { const [x, y] = MT.cell(p[0], p[1]); this.arena.pedestals.push({ x, y }); }
    MT.keyRules.setup(this, room);
    this.event('roomEnter', { id: room.id, name: room.name, boss: !!room.boss, ep: this.ep });
  }
  dispose() { for (const s of this.scripts) s.cancel(); this.scripts.length = 0; this.timers.length = 0; if (MT.W === this) MT.W = null; }
  later(t, fn, spawn) { this.timers.push({ at: this.t + t, fn, spawn: !!spawn }); }
  pending() { let n = 0; for (const d in this.arena.doors) n += this.arena.doors[d].queue.filter(q => MT.ENEMIES[q.kind].counted).length; for (const t of this.timers) if (t.spawn) n++; return n; }
  script(gen) { const s = MT.game.script(gen); this.scripts.push(s); return s; }
  event(name, data = {}, net = true) {
    data.ev = name; MT.emit('world:' + name, data); MT.react.on(name, data, this);
    if (net) { this.seq++; this.events.push({ seq: this.seq, name, data, t: this.t }); if (this.events.length > 60) this.events.shift(); }
  }
  setPhase(p) { this.phase = p; this.phaseT = 0; this.event('phase', { p }, false); }
  // ------------------------------------------------ queries
  target(e) {
    let best = null, bd = 1e18;
    for (const c of this.contestants) { if (!(c.state === 'play' || c.state === 'drop' || c.state === 'walkin')) continue; const d = MT.d2(e, c); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  alive() { let n = 0; for (const e of this.enemies) if (!e.dead && e.counted) n++; return n; }
  queuesEmpty() { for (const d in this.arena.doors) if (this.arena.doors[d].queue.length) return false; return !this.timers.some(t => t.spawn); }
  living() { return this.contestants.filter(c => c.state !== 'out' && c.state !== 'gone'); }
  // ------------------------------------------------ spawning
  spawnAt(kind, x, y, o = {}) {
    const A = MT.ENEMIES[kind]; if (!A) throw new Error('no enemy ' + kind);
    const big = kind === 'discoBig';
    const e = { id: MT.nid(), kind: big ? 'disco' : kind, A, x, y, z: 0, vx: 0, vy: 0, r: A.r, hp: A.hp * (kind === 'crate' || kind === 'lock' || kind === 'paparazzi' ? 1 : MT.T.enemyHp), state: 'move', t: 0, face: Math.PI / 2,
      flash: 0, stun: 0, counted: A.counted, cash: A.cash, dead: false, entering: null, leap: null, dropT: 0, placed: !!o.placed };
    e.max = e.hp; e.rs = e;   // the render state the painters read (the enemy itself, or a mirror's copy)
    A.init && A.init(e, Object.assign({ big }, o), this);
    e.rig = MT.cfg.skipRigs ? null : (MT.enemyRig(e.kind) || null);
    if (e.kind === 'mime' && e.rig) MT.mimeBox(e.rig, e);
    this.enemies.push(e); if (A.solid) this.solids.push(e);
    this.stats.spawned[kind] = (this.stats.spawned[kind] || 0) + 1; MT.run && (MT.run.seen[kind] = true);
    MT.keyRules.onSpawn(this, e); this.event('spawn', { kind, id: e.id }, false);
    return e;
  }
  spawnAtDoor(kind, d, o) {
    const P = AR.doors[d], j = MT.Rr(-14, 14, 'spawn');
    const x = P.x - P.nx * 22 + (P.nx === 0 ? j : 0), y = P.y - P.ny * 22 + (P.ny === 0 ? j : 0);
    const e = this.spawnAt(kind, x, y, o); e.entering = { nx: P.nx, ny: P.ny }; e.face = Math.atan2(P.ny, P.nx); return e;
  }
  spawnAudience(kind, side, o) {
    const sx = side === 'W' ? -30 : 398, sy = MT.Rr(40, 200, 'spawn'), tx = side === 'W' ? MT.Rr(40, 120, 'spawn') : MT.Rr(248, 328, 'spawn'), ty = MT.Rr(40, 200, 'spawn');
    const e = this.spawnAt(kind, sx, sy, o); e.leap = { sx, sy, tx, ty, t: 0, d: .7 }; e.z = 20; this.event('leap', { x: sx, y: sy }, false); return e;
  }
  spawnDrop(kind, o) {
    let x = AR.cx, y = AR.cy;
    for (let k = 0; k < 20; k++) { x = MT.Rr(40, 328, 'spawn'); y = MT.Rr(40, 200, 'spawn'); if (this.contestants.every(c => c.state === 'out' || Math.hypot(c.x - x, c.y - y) > 50)) break; }
    const e = this.spawnAt(kind, x, y, o); e.dropT = .9; e.z = 90; return e;
  }
  // ------------------------------------------------ player fire
  fireBolt(c, a, dmg) {
    const mx = c.x + Math.cos(a) * 10, my = c.y + Math.sin(a) * 10, sp = MT.T.bulletSpeed;
    this.pShots.fire({ kind: 'bolt', x: mx, y: my, z: 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 2.5, life: .9, dmg: dmg * MT.T.dmgMul, owner: c.slot });
  }
  fireRocket(c) { const a = c.aim; this.pShots.fire({ kind: 'rocket', x: c.x + Math.cos(a) * 10, y: c.y + Math.sin(a) * 10, z: 14, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, accel: [400, 300], r: 3, life: .9, dmg: 4 * MT.T.dmgMul, splash: 3 * MT.T.dmgMul, owner: c.slot }); }
  fireBag(c) {
    const a = c.aim; let d = 90;
    if (c === (MT.game.input && this.contestants[0]) && MT.game.input.lastDevice === 'mouse') { const m = MT.game.mouseGround(); if (m) d = clamp(Math.hypot(m[0] - c.x, m[1] - c.y), 30, 90); }
    const tx = c.x + Math.cos(a) * d, ty = c.y + Math.sin(a) * d, t = .55, vz = 500 * t / 2 + (0 - 12) / t;
    this.pShots.fire({ kind: 'bag', x: c.x, y: c.y, z: 12, vx: (tx - c.x) / t, vy: (ty - c.y) / t, vz, grav: 500, r: 3, life: 3, dmg: 2 * MT.T.dmgMul, owner: c.slot });
  }
  laser(c, dt) {
    const a = c.laserAng, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10, dx = Math.cos(a), dy = Math.sin(a);
    let L = 600; for (const [lim, d] of [[AR.x0, dx], [AR.x1, dx]]) { const t = (lim - x0) / d; if (d && t > 0) L = Math.min(L, t); } for (const [lim, d] of [[AR.y0, dy], [AR.y1, dy]]) { const t = (lim - y0) / d; if (d && t > 0) L = Math.min(L, t); }
    this.laserBeams.push({ x0, y0, x1: x0 + dx * L, y1: y0 + dy * L, c: c.slot });
    const dmg = 16 * dt * MT.T.dmgMul;
    for (const e of this.enemies) { if (e.dead || e.entering || e.leap || e.A.harmless) continue; const t = (e.x - x0) * dx + (e.y - y0) * dy; if (t < 0 || t > L) continue; const px2 = x0 + dx * t - e.x, py2 = y0 + dy * t - e.y; if (px2 * px2 + py2 * py2 < (e.r + 2) * (e.r + 2)) this.damage(e, dmg, c, true); }
    if (this.boss) this.boss.laser(x0, y0, dx, dy, L, dmg, c);
  }
  // ------------------------------------------------ foe fire
  foe(e, kind, a, speed, o = {}) {
    if (MT.CHEATS.freeze) return null;
    const sp = speed * bspd();
    return this.fShots.fire(Object.assign({ kind, x: e.x + Math.cos(a) * (e.r + 2), y: e.y + Math.sin(a) * (e.r + 2), z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: kind === 'shard' ? 2 : 3, life: 3.2, src: e.kind }, o));
  }
  lob(from, tx, ty, kind, o = {}) {
    if (MT.CHEATS.freeze) return null;
    const t = (o.time || .9) / Math.max(.5, bspd()), g = 400, z0 = o.z || 18, vz = g * t / 2 - z0 / t;
    return this.fShots.fire(Object.assign({ kind, x: from.x, y: from.y, z: z0, vx: (tx - from.x) / t, vy: (ty - from.y) / t, vz, grav: g, r: 3, life: 6, tx, ty, src: from.kind }, o));
  }
  lobTomato(e, tg, off = 0) {
    const tx = clamp(tg.x + (tg.vx || 0) * .6 + off, AR.x0 + 6, AR.x1 - 6), ty = clamp(tg.y + (tg.vy || 0) * .6, AR.y0 + 6, AR.y1 - 6);
    this.lob(e, tx, ty, 'tomato', { time: .9 }); this.event('throw', { x: e.x, y: e.y }, false);
  }
  landLob(b) {
    if (b.team === 'p') {   // the popcorn bag bursts into kernels
      this.explode({ x: b.x, y: b.y, r: 18, dmg: b.dmg, team: 'p', owner: b.owner, small: true });
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.pShots.fire({ kind: 'kernel', x: b.x, y: b.y, z: 6, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, life: .35, dmg: 1.5 * MT.T.dmgMul, pierce: 1, owner: b.owner }); }
      this.event('popcorn', { x: b.x, y: b.y }, false); return;
    }
    if (b.kind === 'tomato') { this.arena.addSplat(b.x, b.y); this.event('splat', { x: b.x, y: b.y }); for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - b.x, c.y - b.y) < 10 + c.r) c.hurt(1, b, this); return; }
    if (b.kind === 'tot') { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + MT.R() * .5; this.fShots.fire({ kind: 'shard', x: b.x, y: b.y, z: 8, vx: Math.cos(a) * 85 * bspd(), vy: Math.sin(a) * 85 * bspd(), r: 2, life: 1.4 }); } this.event('pop', { x: b.x, y: b.y }, false); return; }
    if (b.kind === 'mic') { this.boss && this.boss.micLand && this.boss.micLand(b); }
  }
  bulletWall(b) { if (b.kind === 'rocket' || b.kind === 'shell') this.explode(b); else if (b.team === 'p' && MT.fxr() < .5) this.event('spark', { x: b.x, y: b.y }, false); }
  explode(b) {
    const big = b.big, r = b.r && b.r > 6 ? b.r : (b.kind === 'shell' ? 16 : b.kind === 'rocket' ? 24 : 18);
    this.event('boom', { x: b.x, y: b.y, big: !!big, small: !!b.small }, true);
    this.arena.scorches.push({ x: b.x, y: b.y, r: r * .6, t: 6 });
    if (b.team === 'p') {
      const dmg = b.splash !== undefined ? b.splash : (b.dmg || 2), owner = b.owner !== undefined ? this.contestants.find(c => c.slot === b.owner) : null;
      for (const e of this.enemies) if (!e.dead && !e.entering && !e.leap && !e.A.harmless && Math.hypot(e.x - b.x, e.y - b.y) < r + e.r) this.damage(e, dmg, owner);
      if (this.boss) this.boss.splash(b.x, b.y, r, dmg, owner);
    } else {
      for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - b.x, c.y - b.y) < r + c.r - 2) c.hurt(1, b, this);
    }
  }
  popperBurst(e) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const s = this.foe(e, 'shard', a, 90, { life: 1.2, r: 2 }); if (s) { s.x = e.x; s.y = e.y; } } this.event('pop', { x: e.x, y: e.y, big: true }); }
  mimeBlast(e) { this.event('boom', { x: e.x, y: e.y, small: true }); for (const c of this.contestants) if (c.canBeHit && Math.hypot(c.x - e.x, c.y - e.y) < 36) c.hurt(1, e, this); }
  // ------------------------------------------------ damage and death
  damage(e, dmg, src, quiet) {
    if (e.dead || e.A.harmless || e.leap || (e.dropT > .3)) return;
    if (MT.CHEATS.oneHit && src) dmg = e.hp;
    if (src && MT.run && MT.run.mode === 'attract') dmg *= 3;
    dmg *= (e.A.dmgMul ? e.A.dmgMul(e) : 1);
    e.hp -= dmg; e.flash = .08;
    if (!quiet) this.event('hit', { x: e.x, y: e.y, k: e.kind }, false);
    if (e.hp <= 0) this.kill(e, src);
  }
  kill(e, src, o = {}) {
    if (e.dead) return; e.dead = true;
    if (e.A.onDeath) e.A.onDeath(e, this);
    MT.keyRules.onKill(this, e);
    this.stats.killed[e.kind] = (this.stats.killed[e.kind] || 0) + 1; if (MT.run) MT.run.killedKinds[e.kind] = true;
    if (o.silent) { this.event('die', { x: e.x, y: e.y, k: e.kind, id: e.id }); return; }
    const X = this.ratings.X;
    const killer = src || null, cash = Math.round((e.cash || 0) * X * MT.T.cashMul * this.cashMul);
    if (killer) { killer.kills++; if (cash) killer.addCash(cash, this); }
    this.ratings.gain(e.A.rat || 0, this); this.ratings.kill(this);
    this.event('die', { x: e.x, y: e.y, k: e.kind, id: e.id, cash, slot: killer ? killer.slot : -1, big: !!e.A.big });
    if (!o.noDrop) this.rollDrops(e);
  }
  rollDrops(e) {
    const caps = this.pickups.filter(p => p.kind === 'cap').length, cash = this.pickups.filter(p => MT.PICKUPS[p.kind].cash).length;
    for (const [k, p] of e.A.drops || []) {
      const mul = MT.T.dropMul * (k === 'bill' ? this.dropBoost : 1);
      if (!MT.chance(p * mul)) continue;
      if (k === 'cap' && caps >= 3) continue; if (MT.PICKUPS[k] && MT.PICKUPS[k].cash && cash >= 25) continue;
      if (k === 'cap') this.addPickup('cap', e.x, e.y, { w: MT.Rpick(MT.CAPSULES, 'drops') });
      else this.addPickup(k, e.x, e.y);
      break;
    }
  }
  crateSpill(e) {
    for (let i = 0, n = MT.Ri(3, 5, 'drops'); i < n; i++) this.addPickup(MT.Rpick(['bill', 'bill', 'stack', 'gold'], 'drops'), e.x, e.y, { vx: MT.Rr(-80, 80, 'drops'), vy: MT.Rr(-80, 80, 'drops'), vz: 120 });
    if (MT.chance(.5)) this.addPickup('prize', e.x, e.y, { vx: MT.Rr(-40, 40, 'drops'), vy: MT.Rr(-40, 40, 'drops'), vz: 140 });
    this.solids = this.solids.filter(s => s !== e); this.event('crate', { x: e.x, y: e.y });
  }
  lockBroken(e) {
    if (!this.enemies.some(o => o !== e && !o.dead && o.kind === 'lock')) {
      if (this.arena.safe) this.arena.safe.open = true; this.event('vault', { x: 72, y: 24 });
      if (this.keysOn && !this.keyGiven) this.dropKey(72, 30, false);
      for (let i = 0; i < 10; i++) this.addPickup(MT.Rpick(['stack', 'gold', 'bill'], 'drops'), 72, 26, { vx: MT.Rr(-90, 90, 'drops'), vy: MT.Rr(20, 120, 'drops'), vz: 150 });
    }
  }
  dropKey(x, y, placed, rise) {
    if (this.keyGiven) return; this.keyGiven = true;
    const p = this.addPickup('key', x, y, { placed: true, z: rise ? 0 : 10, vz: rise ? 160 : 100 }); this.event('keyDrop', { x, y }); return p;
  }
  addPickup(kind, x, y, o = {}) { const p = new MT.Pickup(kind, x, y, o); this.pickups.push(p); return p; }
  placeItem(item, where, pedestal) {
    let x, y, drop = false;
    if (where === 'center') { x = AR.cx; y = AR.cy + 30; }
    else if (where === 'drop') { drop = true; x = MT.Rr(60, 308, 'spawn'); y = MT.Rr(50, 190, 'spawn'); }
    else { [x, y] = MT.cell(where[0], where[1]); }
    const kind = MT.CAPSULES.includes(item) ? 'cap' : item;
    const p = this.addPickup(kind, x, y, { w: kind === 'cap' ? item : null, z: drop ? 90 : 0, placed: !drop && kind === 'cap', vz: 0 });
    if (pedestal) p.z = 6;
    this.event('item', { x, y, w: item });
    return p;
  }
  // ------------------------------------------------ collection
  collect(c, p) {
    if (p.dead) return; p.dead = true;
    const X = this.ratings.X, mul = X * MT.T.cashMul * this.cashMul;
    const k = p.kind;
    if (MT.PICKUPS[k].cash) { const v = Math.round(MT.PICKUPS[k].value * mul); c.addCash(v, this); this.event('cash', { slot: c.slot, v, x: p.x, y: p.y }); return; }
    if (k === 'prize') {
      const pr = MT.nextPrize(this.ep), v = Math.round(pr.value * mul); c.addCash(v, this); c.prizes.push({ name: pr.name, value: v, base: pr.value, icon: pr.icon, line: pr.line, ep: this.ep });
      this.ratings.gain(2, this); this.event('prize', { slot: c.slot, name: pr.name, v, x: p.x, y: p.y }); return;
    }
    if (k === 'key') {
      if (this.mode === 'session') { c.addCash(10000, this); this.event('keySession', { slot: c.slot, x: p.x, y: p.y }); return; }
      MT.run.keys++; MT.run.keyRooms[this.room.id] = true; this.ratings.gain(5, this); this.event('key', { slot: c.slot, n: MT.run.keys, x: p.x, y: p.y }); return;
    }
    if (k === 'cap') { this.equip(c, p.w); return; }
    if (k === 'bomb') { if (c.bombs >= 3) { c.addCash(2000, this); } else c.bombs++; this.event('bombGet', { slot: c.slot, x: p.x, y: p.y }); return; }
    if (k === 'life') { c.lives++; this.event('extraLife', { slot: c.slot, x: p.x, y: p.y }); return; }
    if (k === 'statue') { const v = Math.round(100000 * mul); c.addCash(v, this); c.prizes.push({ name: 'THE NETWORK (YES, ALL OF IT)', value: v, base: 100000, icon: ['screen', '#ffcc33', '#c8202a'], line: 'YOU OWN THE SHOW NOW!', ep: 4 }); this.event('statue', { slot: c.slot, v }); this.greenDone = true; return; }
  }
  equip(c, w) {
    if (MT.WEAPONS[w]) { if (c.wpn === w) c.wpnT = MT.WEAPONS[w].dur * MT.T.puDuration; else { c.wpn = w; c.wpnT = MT.WEAPONS[w].dur * MT.T.puDuration; } }
    else if (MT.ADDONS[w]) c.addons[w] = MT.ADDONS[w].dur * MT.T.puDuration;
    if (MT.run) MT.run.usedW[w] = true;
    this.event('powerup', { slot: c.slot, w, x: c.x, y: c.y });
  }
  // ------------------------------------------------ the show's verbs
  showstopper(c, force) {
    if (!force) { if (c.bombs <= 0) return; if (!MT.CHEATS.infBombs && !(MT.run && MT.run.mode === 'attract')) c.bombs--; }
    this.event('bomb', { slot: c.slot, x: c.x, y: c.y });
    for (const e of this.enemies) if (!e.dead && !e.A.harmless && !e.leap && !e.entering) { this.damage(e, 25, c, true); e.stun = 1; }
    if (this.boss) this.boss.bomb(30, c);
    this.fShots.clear();
    this.ratings.gain(8, this); if (MT.run) MT.run.bombsUsed++;
  }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) { if (e.dead || !e.counted) continue; const d = MT.dist(c, e); if (d < 64) n++; if (d < 32) m++; }
    if (this.boss) { const d = MT.dist(c, this.boss); if (d < 70) n += 2; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m);
    this.ratings.gain(gain, this); c.boatGain += gain; if (MT.run) MT.run.boats++;
    this.event('showboat', { slot: c.slot, gain, x: c.x, y: c.y });
  }
  continueContestant(c) {
    if (this.mode === 'attract') return;
    c.lives = MT.startLives(); c.cash = Math.floor(c.cash / 2); c.hp = MT.maxHp(); c.respawn(this); if (MT.run) MT.run.continues++;
    this.event('continueOne', { slot: c.slot });
  }
  primeShower() {
    for (let i = 0; i < 3; i++) {
      const side = i % 2 ? 'E' : 'W', from = { x: side === 'W' ? -20 : 388, y: MT.Rr(40, 200, 'drops') }, tx = MT.Rr(60, 308, 'drops'), ty = MT.Rr(50, 190, 'drops');
      const p = this.addPickup('cap', from.x, from.y, { w: MT.Rpick(MT.CAPSULES, 'drops'), z: 30, vz: 220 }); p.vx = (tx - from.x) * 1.4; p.vy = (ty - from.y) * 1.4;
    }
    this.event('confettiCannon', {});
  }
  stunt() {
    const ep = MT.EPISODES[this.ep] || MT.EPISODES[1], d = MT.Rpick(['N', 'E', 'S', 'W'], 'spawn');
    const [kind, n] = ep.stunt; this.arena.queueSpawn(d, kind, n, .2); this.event('stunt', { kind, d });
  }
  // ------------------------------------------------ the authoritative step
  step(dt, intents) {
    this.t += dt; this.phaseT += dt; this.lastDt = dt; this.laserBeams.length = 0;
    for (let i = 0; i < this.timers.length; i++) { const tm = this.timers[i]; if (tm.at <= this.t) { tm.done = true; tm.fn(); } }
    E.prune(this.timers, t => t.done);
    // 1-2: contestants
    for (const c of this.contestants) c.update(dt, intents[c.slot] || MT.NOINTENT(), this);
    // 3: enemies
    this.hash.build(this.enemies.filter(e => !e.dead && !e.static));
    for (const e of this.enemies) if (!e.dead) this.stepEnemy(e, dt);
    // 4: boss
    if (this.boss) this.boss.update(dt, this);
    // 5: projectiles
    this.pShots.update(dt, this); this.fShots.update(dt, this);
    // 6: collisions
    this.collide(dt);
    // pickups
    for (const p of this.pickups) p.update(dt, this);
    E.prune(this.pickups, p => p.dead);
    E.prune(this.enemies, e => e.dead);
    // 7-8: ratings, doors, phases
    this.ratings.update(dt, this, this.phase === 'waves' && !this.room.bonus);
    this.arena.update(dt, this);
    this.phaseStep(dt);
  }
  stepEnemy(e, dt) {
    const A = e.A;
    e.flash = Math.max(0, e.flash - dt);
    if (e.leap) {
      const L = e.leap; L.t += dt; const u = Math.min(1, L.t / L.d); e.x = lerp(L.sx, L.tx, u); e.y = lerp(L.sy, L.ty, u); e.z = 20 + Math.sin(u * Math.PI) * 50 - u * 20; e.vx = (L.tx - L.sx) / L.d; e.vy = (L.ty - L.sy) / L.d; e.face = Math.atan2(e.vy, e.vx);
      if (u >= 1) { e.leap = null; e.z = 0; }
      A.pose && A.pose(e, dt); return;
    }
    if (e.dropT > 0) { e.dropT -= dt; e.z = e.dropT > .3 ? 90 : 90 * (e.dropT / .3); if (e.dropT <= 0) { e.z = 0; this.event('thud', { x: e.x, y: e.y }, false); } A.pose && A.pose(e, dt); return; }
    if (e.entering) {
      const sp = Math.max(40, A.speed || 40) * espd();
      e.x += e.entering.nx * sp * dt; e.y += e.entering.ny * sp * dt; e.vx = e.entering.nx * sp; e.vy = e.entering.ny * sp;
      if (MT.inInterior(e.x, e.y, e.r + 2)) e.entering = null;
      A.pose && A.pose(e, dt); return;
    }
    if (e.stun > 0 || MT.CHEATS.freeze) { e.stun = Math.max(0, e.stun - dt); e.vx = e.vy = 0; A.pose && A.pose(e, dt); return; }
    A.update(e, dt, this);
    if (!e.static && !e.dead) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      const push = this.arena.conveyorPush(e); e.x += push * dt;
      // a soft push apart, so crowds don't stack
      this.hash.near(e.x, e.y, 20, o => { if (o === e || o.dead || o.kind === 'seg' || e.kind === 'seg') return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = (e.r + o.r) * .8; if (d > 0 && d < m) { const k = (m - d) / d * .5; e.x += dx * k * .5; e.y += dy * k * .5; } });
      for (const s of this.solids) if (s !== e && !s.dead) { const d = MT.dist(e, s), m = e.r + s.r; if (d < m && d > 0) { e.x = s.x + (e.x - s.x) / d * m; e.y = s.y + (e.y - s.y) / d * m; } }
      if (e.kind !== 'seg') MT.clampInterior(e, e.r);
      const vent = this.arena.ventAt(e.x, e.y); if (vent) this.damage(e, 3 * dt, null, true);
    }
    A.pose && A.pose(e, dt);
  }
  collide(dt) {
    const H = this.hash; H.build(this.enemies.filter(e => !e.dead && !e.entering && !e.leap && !(e.dropT > .3) && !e.A.harmless));
    for (const b of this.pShots.list) {
      if (b.dead || b.grav) continue;
      const owner = this.contestants.find(c => c.slot === b.owner) || null;
      H.near(b.x, b.y, b.r + 14, e => {
        if (b.dead || e.dead) return; if (b.hitIds && b.hitIds.includes(e.id)) return;
        if (Math.hypot(e.x - b.x, e.y - b.y) > e.r + b.r) return;
        if (b.kind === 'rocket') { b.dead = true; this.damage(e, b.dmg, owner); this.explode(b); return; }
        this.damage(e, b.dmg, owner);
        if (b.pierce > 0) { b.pierce--; (b.hitIds = b.hitIds || []).push(e.id); } else b.dead = true;
      });
      if (!b.dead && this.boss) { const hit = this.boss.hitTest(b); if (hit) { if (b.kind === 'rocket') { this.boss.damagePart(hit, b.dmg, owner); this.explode(b); } else this.boss.damagePart(hit, b.dmg, owner); b.dead = true; } }
    }
    // foe bullets against contestants (and the gold records)
    for (const b of this.fShots.list) {
      if (b.dead || b.grav) continue;
      for (const c of this.contestants) {
        if (!c.canBeHit) continue;
        if (c.addons.records > 0 && MT.SMALL_FOE[b.kind]) { for (const o of MT.recordPos(c, this.t)) if (Math.hypot(o[0] - b.x, o[1] - b.y) < 6 + b.r) { b.dead = true; this.event('tink', { x: b.x, y: b.y }, false); break; } if (b.dead) break; }
        const d = Math.hypot(c.x - b.x, c.y - b.y);
        if (d < c.r * .8 + b.r) {
          if (c.iframes) { if (c.addons.shield > 0) { b.dead = true; } continue; }
          if (c.hurt(1, b, this)) { b.dead = true; if (b.kind === 'shell') this.explode(b); break; }
        } else if (d < c.r + b.r + 7 && !b.nearDone) { b.nearDone = true; this.ratings.near(this); }
      }
    }
    // contact, records and shields against enemies
    for (const c of this.contestants) {
      if (c.state !== 'play') continue;
      const rec = c.addons.records > 0 ? MT.recordPos(c, this.t) : null;
      H.near(c.x, c.y, 40, e => {
        if (e.dead) return; const d = Math.hypot(e.x - c.x, e.y - c.y);
        if (rec) for (const o of rec) if (Math.hypot(o[0] - e.x, o[1] - e.y) < e.r + 5) { e.recCd = e.recCd || 0; if (this.t >= e.recCd) { e.recCd = this.t + .15; this.damage(e, 2 * MT.T.dmgMul, c); } }
        if (c.addons.shield > 0 && d < e.r + 14) { e.shCd = e.shCd || 0; if (this.t >= e.shCd) { e.shCd = this.t + .2; this.damage(e, 1, c); } }
        if (e.dead || !e.A.contact || e.kind === 'goon' && !(e.atk && e.atk.phase === 'active') && d > e.r + c.r - 3) return;
        if (d < e.r + c.r - 2 && e.stun <= 0) c.hurt(e.A.contact * MT.T.contactDmg || 0, e, this);
      });
      if (this.boss) this.boss.contact(c, this);
      if (this.arena.ventAt(c.x, c.y)) c.hurt(1, { x: c.x, y: c.y - 1 }, this);
      if (c.state !== 'play') continue;
      for (const p of this.pickups) if (!p.dead && p.z < 14 && Math.hypot(p.x - c.x, p.y - c.y) < c.r + 7) this.collect(c, p);
    }
    // the magnet, once the room is clear
    if (this.cleared) for (const p of this.pickups) { if (!MT.PICKUPS[p.kind].cash) continue; let best = null, bd = 60; for (const c of this.contestants) { if (c.state !== 'play') continue; const d = MT.dist(c, p); if (d < bd) { bd = d; best = c; } } if (best) { const a = MT.ang(p, best); p.x += Math.cos(a) * 110 * dt; p.y += Math.sin(a) * 110 * dt; } }
  }
  // ------------------------------------------------ the room's phases
  phaseStep(dt) {
    const R = this.room;
    switch (this.phase) {
      case 'enter':
        if (this.phaseT >= 1.2) { if (R.boss) { this.setPhase('bossIntro'); this.boss = MT.BOSSES[R.boss].create(this); MT.run && (MT.run.bossesSeen[R.boss] = true); } else this.setPhase('intro'); }
        break;
      case 'intro':
        if (this.phaseT >= (this.intro ? 1.6 : .2)) { this.setPhase('waves'); this.script(MT.runRoom(this, R)); this.event('mash', {}); }
        break;
      case 'waves': {
        if (R.bonus) { if (this.greenDone || this.phaseT >= R.bonus.dur) { this.result = 'bonus'; this.setPhase('done'); } else MT.greenRoomStep(this, dt); break; }
        if (this.allSpawned && this.alive() === 0) this.clearRoom();
        break;
      }
      case 'bossIntro': if (this.boss.introDone) this.setPhase('boss'); break;
      case 'boss': if (this.boss.dead) { this.setPhase('bossDeath'); } break;
      case 'bossDeath': if (this.phaseT >= 3.2) { this.boss = null; this.clearRoom(true); } break;
      case 'clear':
        if (this.phaseT >= 1.6) {
          const exits = this.exitsFor();
          if (!exits.length) { this.result = this.room.boss ? 'boss' : 'end'; this.setPhase('done'); }
          else { for (const [d, dest] of exits) { const room = MT.ROOMS[dest]; this.arena.setExit(d, dest, this.mode === 'session' ? 'NEXT' : room ? room.name : 'NEXT', room ? MT.roomIcon(room) : 'star'); } this.setPhase('exit'); this.event('exits', {}); }
        }
        break;
      case 'exit': {
        this.hurryT += dt;
        if (this.phaseT > 25 && this.hurryT > 6) { this.hurryT = 0; const non = ['N', 'E', 'S', 'W'].filter(d => this.arena.doors[d].state !== 'exit'); this.event('hurry', {}); for (const d of non.slice(0, 2)) this.arena.queueSpawn(d, 'clapbot', 2, .3); }
        for (const c of this.contestants) { if (c.state !== 'play') continue; const d = this.arena.exitHit(c); if (d) { this.exitDir = d; this.exitDest = this.arena.doors[d].dest; this.setPhase('leaving'); this.event('exitChosen', { d, dest: this.exitDest, slot: c.slot }); break; } }
        break;
      }
      case 'leaving': if (this.phaseT >= .8) { this.result = 'exit'; this.setPhase('done'); } break;
      default: break;
    }
  }
  exitsFor() {
    const R = this.room; if (!R.exits) return [];
    return Object.entries(R.exits);
  }
  clearRoom(boss) {
    if (this.cleared) return; this.cleared = true; this.setPhase('clear');
    MT.keyRules.onRoomEnd(this);
    const X = this.ratings.X, fast = R => this.t < (R.par || 999) + 2.4;
    const bonus = Math.round(1000 * this.ep * X * (fast(this.room) ? 1.5 : 1) * MT.T.cashMul);
    for (const c of this.contestants) if (c.state === 'play' || c.state === 'drop') c.addCash(bonus, this);
    for (const b of this.fShots.list) b.life = Math.min(b.life, .25);
    this.event('clear', { bonus, fast: fast(this.room), boss: !!boss });
  }
  // ------------------------------------------------ drawing
  draw(r) {
    const set = this.arena.setId;
    MT.sets.outside(r, set, this);
    this.arena.draw(r, this);
    MT.sets.lights(r, set, this);
    for (const p of this.pickups) p.draw(r, this);
    for (const e of this.enemies) { if (e.dead) continue; if (e.dropT > .3) { r.decal(() => r.groundDisc(e.x, e.y, 8, '#000', .5)); continue; } e.A.draw(r, e); }
    if (this.boss) this.boss.draw(r, this);
    for (const c of this.contestants) { c.draw(r, this); if (c.addons.records > 0 && c.state === 'play') MT.drawRecords(r, c, this.t); }
    this.pShots.draw(r); this.fShots.draw(r);
    // lob telegraphs: a red ring where each tomato will land
    r.decal(() => { for (const b of this.fShots.list) if (b.grav && b.tx !== undefined) r.groundRing(b.tx, b.ty, 10, Math.floor(MT.game.time * 10) % 2 ? '#ff3344' : '#ffcc33', .8); });
    for (const L of this.laserBeams) {
      r.queue((L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2, 14, g => { const a = r.w(L.x0, L.y0, 14), b = r.w(L.x1, L.y1, 14); px.line(g, a[0], a[1], b[0], b[1], '#0a6a8a', 5); px.line(g, a[0], a[1], b[0], b[1], '#2ee6ff', 3); px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1); }, { emissive: true });
      for (let k = 0; k <= 4; k++) MT.game.lights.add(lerp(L.x0, L.x1, k / 4), lerp(L.y0, L.y1, k / 4), 14, 30, .5, { color: '#2ee6ff' });
    }
    for (const b of this.fShots.list) if (!b.grav && (b.id & 3) === 0) MT.game.lights.add(b.x, b.y, 10, 16, .35, { color: '#ff9a3c' });
  }
};
MT.recordPos = (c, t) => { const a = t * 4.2; return [[c.x + Math.cos(a) * 26, c.y + Math.sin(a) * 26], [c.x + Math.cos(a + Math.PI) * 26, c.y + Math.sin(a + Math.PI) * 26]]; };
MT.drawRecords = (r, c, t) => {
  for (const [x, y] of MT.recordPos(c, t)) r.queue(x, y, 12, g => { const p = r.w(x, y, 12), k = MT.pk(r); px.disc(g, p[0], p[1], 5 * k, '#5a3a00'); px.disc(g, p[0], p[1], 4.2 * k, '#ffcc33'); px.disc(g, p[0], p[1], 1.6 * k, '#1a1a1a'); px.dot(g, p[0] - 2 * k, p[1] - 2 * k, '#ffffff'); }, { emissive: true });
};
MT.roomIcon = room => room.boss ? 'skull' : room.type === 'cash' ? 'cash' : room.type === 'armory' ? 'gun' : room.type === 'hazard' ? 'flame' : room.type === 'key' ? 'key' : 'sword';
MT.greenRoomStep = (W, dt) => {
  W._grT = (W._grT || 0) - dt;
  if (W._grT <= 0) { W._grT = .25; const x = MT.Rr(40, 328, 'drops'), y = MT.Rr(40, 200, 'drops'); W.addPickup(MT.chance(.15) ? 'prize' : MT.Rpick(['bill', 'stack', 'gold', 'case'], 'drops'), x, y, { z: 90 }); }
  W._flashT = (W._flashT || 3) - dt;
  if (W._flashT <= 0) { W._flashT = 3; const p = W.enemies.filter(e => e.kind === 'paparazzi'); if (p.length) { MT.Rpick(p, 'fx').flashT = .3; W.event('papFlash', {}); } }
  if (!W.statueUp && W.phaseT >= 30) { W.statueUp = true; W.addPickup('statue', AR.cx, AR.cy, { placed: true, z: 0, vz: 120 }); W.event('statueRise', {}); }
};

// ===== 19-react.js
// ---------------------------------------------------------------- the broadcast layer: host lines, banners, pop-ups, and the event -> reaction table
MT.lines = {
  queue: [], current: null, lastQuip: -99, pools: {},
  allowed(prio) { const ch = MT.game && MT.game.settings.chatter || 'Normal'; if (MT.CHEATS.muteHost && prio < 3) return false; if (ch === 'Off') return prio >= 3; if (ch === 'Less') return prio >= 2; return true; },
  say(speaker, text, o = {}) {
    const prio = o.prio || 1; if (!this.allowed(prio)) { if (o.onDone) o.onDone(); return; }
    if (prio === 1) { const t = MT.game ? MT.game.real : 0; if (t - this.lastQuip < 6 || this.current || this.queue.length) return; this.lastQuip = t; }
    const L = { speaker, text: MT.fill(text, o.vars), prio, hint: o.hint || null, onDone: o.onDone || null, t: 0 };
    if (prio >= 2) { this.queue = this.queue.filter(q => q.prio >= prio); if (this.current && this.current.prio < prio) this.finish(); }
    this.queue.push(L); this.queue.sort((a, b) => b.prio - a.prio);
  },
  sayAll(list, o = {}) { list.forEach(([sp, tx], i) => this.say(sp, tx, Object.assign({}, o, { prio: o.prio || 2, onDone: i === list.length - 1 ? o.onDone : null }))); },
  pool(id, sp = 'LANCE', o = {}) {
    const P = MT.TEXT.pools[id]; if (!P) return;
    let bag = this.pools[id]; if (!bag || !bag.length) bag = this.pools[id] = MT.shuffle(P.map((_, i) => i), 'fx');
    this.say(sp, P[bag.shift()], o);
  },
  start(L) {
    this.current = L; L.t = 0;
    const voice = MT.TEXT.voices[L.speaker] || (/^P\d/.test(L.speaker) ? 'contestant' + L.speaker[1] : 'lance');
    const vd = MT.babble.say(L.text, voice);
    L.typeDur = Math.max(L.text.length / 45, vd); L.dur = L.typeDur + 1.1;
    if (MT.game && MT.game.audio && MT.game.audio.song) MT.game.audio.duck(true);
  },
  finish() { const L = this.current; this.current = null; if (MT.game && MT.game.audio) MT.game.audio.duck(false); if (L && L.onDone) L.onDone(); },
  skip() { if (this.current) { if (this.current.t < this.current.typeDur) this.current.t = this.current.typeDur; else this.finish(); } },
  skipAll() { const q = this.queue; this.queue = []; for (const L of q) if (L.onDone) L.onDone(); this.finish(); },
  clear() { this.queue = []; this.current = null; if (MT.game && MT.game.audio) MT.game.audio.duck(false); },
  get busy() { return !!(this.current || this.queue.length); },
  update(dt) {
    if (!this.current && this.queue.length) this.start(this.queue.shift());
    const L = this.current; if (!L) return;
    L.t += dt; if (L.t >= L.dur) this.finish();
  },
  shown() { const L = this.current; if (!L) return ''; return L.text.slice(0, Math.floor(L.text.length * Math.min(1, L.t / Math.max(.01, L.typeDur)))); }
};
MT.banner = {
  list: [],
  show(text, o = {}) { this.list = this.list.filter(b => b.text !== text); this.list.push({ text, sub: o.sub || '', color: o.color || '#ffcc33', t: 0, dur: o.dur || 2, big: o.big !== false }); if (this.list.length > 3) this.list.shift(); },
  update(dt) { for (const b of this.list) b.t += dt; this.list = this.list.filter(b => b.t < b.dur); },
  clear() { this.list = []; }
};
MT.tut = {
  shown: {}, cur: null,
  show(key, actions) { if (this.shown[key] || !MT.run || MT.run.mode === 'session' || MT.run.mode === 'attract') return; this.shown[key] = true; this.cur = { key, text: MT.TEXT.tutorial[key], actions, t: 0 }; },
  update(dt) { if (this.cur) { this.cur.t += dt; if (this.cur.t > 4) this.cur = null; } },
  reset() { this.shown = {}; this.cur = null; }
};
MT.popup = (x, y, z, text, color, scale = 1) => { const g = MT.game; if (g && g.particles && !g.headless) g.particles.text(x, y, z, text, color, { scale, bounce: false }); };
MT.shake = n => { const g = MT.game; if (g && !g.headless) g.shake(n * MT.T.shakeMul); };
MT.freeze = s => { if (MT.run && MT.run.mode !== 'session' && MT.game) MT.game.freeze(s); };
MT.flash = (c, s, k) => { const g = MT.game; if (g && !g.headless) g.flash(c, s, k); };
const P = () => MT.game && MT.game.particles && !MT.game.headless ? MT.game.particles : null;
const PAL = { goon: ['#2a3a6a', '#ffcc33', '#d8a078'], clapbot: ['#9aa4b8', '#2ee6ff', '#ffcc33'], popper: ['#ff2e88', '#ffcc33', '#2ee6ff'], mime: ['#ffffff', '#101014', '#ff3344'],
  disco: ['#c8d0e0', '#ffffff', '#ff2e88'], heckler: ['#2a8a4a', '#c8202a', '#ffcc33'], hecklerKing: ['#c8202a', '#ffcc33', '#ffffff'], tank: ['#e8c020', '#5a5a6a', '#ff6a20'],
  snake: ['#2a2a32', '#e8c020', '#c8d0e0'], seg: ['#e8c020', '#3a3a3a'], brute: ['#9a6a3a', '#ffcc33', '#c8202a'], crate: ['#c84a2a', '#ffcc33'], lock: ['#c8d0e0', '#5a6070'] };
MT.react = {
  on(name, d, W) { const f = this.T[name]; if (f) f(d, W); },
  T: {
    shot: d => MT.sfx({ blaster: 'pew', spread: 'triple', rockets: 'rocket', popcorn: 'thunk', laser: 'hum' }[d.w] || 'pew', { vol: .8 }),
    swish: () => MT.sfx('swish'), hop: () => MT.sfx('hop', { vol: .5 }), fuse: () => MT.sfx('hiss'), beep: () => MT.sfx('beep'), shimmer: () => MT.sfx('shimmer'), zap: () => MT.sfx('zap'),
    whine: () => MT.sfx('whine'), shellFire: d => { MT.sfx('shell'); P() && P().smoke(d.x, d.y, 12, 3); }, hiss: () => MT.sfx('hiss'), stomp: d => { MT.sfx('stomp'); MT.shake(1.5); P() && P().dust(d.x, d.y, 0, 6); },
    roar: d => { MT.sfx('roar'); MT.shake(2); }, crash: d => { MT.sfx('crash'); MT.shake(4); P() && P().dust(d.x, d.y, 0, 14); }, leap: () => MT.sfx('whoosh'), thud: d => { MT.sfx('land'); P() && P().dust(d.x, d.y, 0, 8); },
    throw: () => MT.sfx('swish'), splat: d => { MT.sfx('splat'); P() && P().bits(d.x, d.y, 2, 8, ['#c8202a', '#ff6a6a']); },
    pop: d => { MT.sfx('pop'); if (P()) P().bits(d.x, d.y, 8, d.big ? 24 : 10, ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a']); }, popcorn: d => { MT.sfx('kernel'); P() && P().bits(d.x, d.y, 4, 10, ['#fff4c0', '#ffcc33']); },
    boom: (d, W) => { MT.sfx(d.big ? 'bigboom' : 'boom', { vol: d.small ? .6 : 1 }); if (P()) P().explosion(d.x, d.y, 6, d.big ? 1.4 : d.small ? .6 : 1, { freeze: false, shake: 0 }); MT.shake(d.big ? 5 : d.small ? 1 : 2.5); },
    spark: d => P() && P().sparks(d.x, d.y, 10, 3, 0),
    hit: d => { if (P() && MT.fxr() < .6) P().sparks(d.x, d.y, 10, 2, MT.fxr() * 6.28); if (MT.fxr() < .4) MT.sfx('tink', { vol: .5 }); },
    tink: d => { MT.sfx('tink'); P() && P().sparks(d.x, d.y, 10, 2, 0); },
    die: (d, W) => {
      MT.sfx('confetti'); const conf = MT.game && MT.game.settings.confetti === 'Tasteful' ? .4 : 1;
      if (P()) P().bits(d.x, d.y, 8, Math.round((d.big ? 30 : 14) * conf), PAL[d.k] || ['#ff2e88', '#ffcc33']);
      if (W && W.arena) for (let i = 0; i < 4 * conf; i++) W.arena.confetti.push({ x: d.x + (MT.fxr() - .5) * 20, y: d.y + (MT.fxr() - .5) * 20, c: (PAL[d.k] || ['#ffcc33'])[i % 2], t: 8 });
      if (d.cash) MT.popup(d.x, d.y, 18, '+' + MT.money(d.cash), d.slot >= 0 ? MT.COLORS.p[d.slot] : '#ffcc33');
      if (d.big) { if (P()) P().explosion(d.x, d.y, 8, 1, { freeze: false, shake: 0 }); MT.shake(4); MT.freeze(.03); }
      if (W && W.arena && W.arena.confetti.length > 160) W.arena.confetti.splice(0, 40);
      if (MT.fxr() < .08) MT.babble.crowd('cheer', .3);
    },
    spawn: (d) => {
      const k = d.kind === 'discoBig' ? 'disco' : d.kind === 'hecklerKing' ? 'heckler' : d.kind;
      if (!MT.run || MT.run.mode === 'attract' || MT.run.mode === 'session' || MT.run.introduced[k] || !MT.TEXT.intros[k]) return;
      MT.run.introduced[k] = true; const [line, hint] = MT.TEXT.intros[k]; MT.lines.say('LANCE', line, { prio: 2, hint });
    },
    crate: d => { MT.sfx('crash', { vol: .6 }); P() && P().bits(d.x, d.y, 6, 14, ['#c84a2a', '#ffcc33', '#5a2a10']); },
    vault: d => { MT.sfx('bigboom'); MT.shake(4); MT.banner.show('THE VAULT IS OPEN!'); },
    keyDrop: d => { MT.sfx('chime'); P() && P().glints(d.x, d.y, 10, 8, '#ffe060'); },
    cash: d => { MT.sfx('kaching', { vol: .7 }); MT.popup(d.x, d.y, 14, '+' + MT.money(d.v), MT.COLORS.p[d.slot] || '#ffcc33'); },
    prize: d => { MT.music.sting('stPrize'); MT.banner.show(MT.fill(MT.TEXT.banners.won, { PRIZE: d.name }), { sub: '(' + MT.money(d.v) + ')', color: '#ff8ad8' }); MT.lines.pool('prizeP', 'PENNY', { vars: { PRIZE: d.name } }); MT.babble.crowd('cheer', .5); },
    key: d => { MT.music.sting('stKey'); MT.banner.show(MT.fill(MT.TEXT.banners.key, { N: d.n }), { color: '#ffe060' }); if (d.n <= 2) MT.lines.pool('key', 'LANCE', { prio: 2 }); MT.babble.crowd('cheer', .7); },
    keySession: d => { MT.music.sting('stKey'); MT.popup(d.x, d.y, 16, '+$10,000', '#ffe060', 2); },
    powerup: d => { MT.sfx('powerup'); const W2 = MT.WEAPONS[d.w] || MT.ADDONS[d.w]; MT.popup(d.x, d.y, 30, W2.name, W2.color); if (d.w === 'shield') MT.sfx('shieldUp'); if (d.w === 'speed') MT.sfx('squeak'); if (d.w === 'records') MT.sfx('whirr'); },
    item: () => MT.sfx('zip', { vol: .5 }),
    bombGet: d => { MT.sfx('flashbulb', { vol: .5 }); MT.popup(d.x, d.y, 20, 'SHOWSTOPPER +1', '#ffffff'); },
    extraLife: d => { MT.music.sting('stOneup'); MT.banner.show(MT.TEXT.banners.encore, { color: '#ffe060' }); MT.lines.pool('extraLife', 'LANCE', { prio: 2 }); },
    statue: d => { MT.music.sting('stBossDown'); MT.banner.show('THE NETWORK IS YOURS!', { sub: '+' + MT.money(d.v), dur: 3 }); MT.lines.say('PENNY', 'YOU OWN THE SHOW NOW!', { prio: 3 }); MT.babble.crowd('cheer', 1); },
    statueRise: () => { MT.sfx('powerup'); MT.banner.show('THE GOLDEN STATUETTE!', { color: '#ffe060' }); },
    papFlash: () => { MT.sfx('shutter'); MT.flash('#ffffff', .15, .5); },
    bomb: d => { MT.sfx('flashbulb'); MT.sfx('bigboom'); MT.flash('#ffffff', .12); MT.shake(6); MT.freeze(.08); if (P()) { P().ring(d.x, d.y, 10, 300, '#ffffff', .4); for (let i = 0; i < 20; i++) P().glints(MT.fxr() * 368, MT.fxr() * 240, 10, 2, '#ffffff'); } MT.babble.crowd('cheer', .8); },
    boatStart: () => MT.sfx('flourish'),
    showboat: d => { MT.popup(d.x, d.y, 34, 'STYLE +' + Math.round(d.gain), '#2ee6ff', 2); MT.babble.crowd('cheer', Math.min(1, d.gain / 24)); if (d.gain >= 10) MT.lines.pool('showboat'); },
    slide: d => { MT.sfx('whoosh'); P() && P().dust(d.x, d.y, 0, 6); },
    hurt: (d, W) => { MT.sfx('buzzer'); MT.babble.crowd('ooh', .5); MT.shake(3); MT.freeze(.03); if (W) W.ratings.lose(12); if (P()) P().impact(d.x, d.y, 14, 1, '#ffffff'); if (d.hp === 1 && MT.maxHp() > 1) MT.lines.pool('lowHp', 'LANCE', { prio: 2 }); else MT.lines.pool('hurt'); },
    death: (d, W) => { MT.sfx('wah'); MT.babble.crowd('laugh', .6); if (W) W.ratings.lose(25); MT.banner.show(MT.TEXT.banners.mashed, { color: '#ff3344' }); if (P()) P().bits(d.x, d.y, 10, 40, [MT.COLORS.p[d.slot], '#ffffff', '#ffcc33']); MT.lines.pool('death', 'LANCE', { prio: 2, vars: { NAME: d.name } }); MT.shake(5); },
    respawn: () => MT.sfx('zip'), landed: d => { MT.sfx('land'); P() && P().dust(d.x, d.y, 0, 10); },
    out: () => MT.sfx('wah'),
    continueOne: () => { MT.sfx('bell'); MT.banner.show('THE NETWORK TAKES ITS CUT!', { color: '#ff8ad8' }); },
    addonEnd: () => MT.sfx('expire'), wpnEnd: () => { MT.sfx('expire'); MT.banner.show(MT.TEXT.banners.basics, { dur: 1.2, big: false, color: '#c8d0e0' }); },
    confettiCannon: () => { MT.sfx('boom', { vol: .5 }); if (P()) for (const x of [-10, 378]) P().bits(x, 120, 30, 30, ['#ff2e88', '#ffcc33', '#2ee6ff', '#9aff6a']); },
    stunt: () => { MT.sfx('alarm'); MT.banner.show(MT.TEXT.banners.stunt, { color: '#ff3344' }); MT.lines.pool('stunt', 'LANCE', { prio: 2 }); MT.babble.crowd('boo', .6); },
    mash: () => { MT.music.sting('stMash'); },
    roomEnter: (d, W) => { if (!d.boss && W && W.mode !== 'attract') MT.later(1.4, () => MT.lines.pool('roomStart', 'LANCE', { prio: 1 })); },
    wave: (d, W) => { if (!W || !W.tutorial || !MT.run) return; if (d.i === 0) MT.tut.show('move', ['move', 'aim']); if (d.i === 2) MT.tut.show('boat', ['showboat']); if (d.i === 3) MT.tut.show('slide', ['slide']); },
    cageOpen: () => { MT.music.sting('stPrize'); MT.banner.show('THE CAGE IS OPEN!', { color: '#ffe060' }); },
    finaleBurst: () => { MT.banner.show('FINALE BURST!', { color: '#ff6a20' }); MT.sfx('alarm'); },
    clear: (d, W) => { MT.music.sting('stClear'); MT.banner.show(MT.TEXT.banners.clear, { sub: '+' + MT.money(d.bonus) + (d.fast ? ' SPEED BONUS!' : ''), dur: 2.4 }); MT.babble.crowd('applause', .8); if (!d.boss && W && W.mode !== 'attract') MT.lines.pool('roomClear', 'LANCE', { prio: 2 }); },
    exits: (d, W) => { MT.sfx('rollup'); if (W && W.tutorial) MT.tut.show('door', []); },
    hurry: () => { MT.banner.show(MT.TEXT.banners.hurry, { color: '#ff3344' }); MT.lines.pool('hurry', 'LANCE', { prio: 2 }); MT.sfx('alarm'); },
    exitChosen: () => MT.sfx('go'),
    prime: () => { MT.music.sting('stPrime'); MT.music.layer('prime', 1, .3); MT.banner.show(MT.TEXT.banners.prime, { sub: '5X CASH!', color: '#ff2e88', dur: 2.6 }); MT.lines.pool('prime', 'LANCE', { prio: 2 }); MT.babble.crowd('cheer', 1); },
    primeEnd: () => MT.music.layer('prime', 0, 1),
    multi: d => { MT.popup(MT.W ? MT.W.contestants[0].x : 184, MT.W ? MT.W.contestants[0].y : 120, 40, 'MULTI-MASH x' + d.n, '#ff2e88', 2); MT.lines.pool('multi'); },
    // bosses
    bossIntro: d => { MT.music.play('bossShowdown', { fade: .5 }); MT.lines.sayAll(MT.TEXT.boss[d.kind + 'Intro'], { prio: 3 }); MT.sfx('slam'); MT.shake(4); },
    cannon: () => MT.sfx('thunk'), ring: () => MT.sfx('zap'), rev: () => MT.sfx('roar'),
    mashyArms: () => MT.music.layer('phase2', 1, .5), mashyMad: () => { MT.lines.sayAll(MT.TEXT.boss.mashyMad, { prio: 3 }); MT.babble.crowd('ooh', .8); },
    armOff: d => { MT.sfx('bigboom'); P() && P().explosion(d.x, d.y, 18, 1.2, { freeze: false, shake: 0 }); MT.shake(5); MT.freeze(.05); },
    partDown: d => { MT.sfx('boom'); if (P()) P().explosion(d.x, d.y, 14, .9, { freeze: false, shake: 0 }); MT.shake(3); MT.freeze(.03); },
    bossDie: d => { MT.music.play(null, { fade: 1.5 }); MT.flash('#ffffff', .3); MT.shake(8); const k = { mashy: 'mashyDie', wheel: 'wheelDie', lance: 'networkDie' }[d.kind]; MT.lines.sayAll(MT.TEXT.boss[k], { prio: 3 }); MT.babble.crowd('cheer', 1); },
    bossBurst: d => { MT.music.sting('stBossDown'); MT.flash('#ffffff', .2); if (P()) P().bits(d.x, d.y, 20, 80, d.kind === 'mashy' ? ['#f0e0b0', '#fff7e8', '#d8b070'] : ['#ffcc33', '#ff2e88', '#ffffff']); MT.babble.crowd('applause', 1); },
    spin: () => MT.music.sting('stDrumroll'), wheelClick: () => MT.sfx('click'),
    wheelLand: d => { MT.banner.show(d.name + '!', { color: '#ffcc33', dur: 1.8 }); MT.lines.say('LANCE', d.name + '!', { prio: 2 }); MT.sfx('bell'); },
    bankrupt: () => { MT.music.sting('stBankrupt'); MT.banner.show(MT.TEXT.banners.bankrupt, { color: '#ff3344' }); MT.babble.crowd('laugh', .7); },
    jackpot: () => { MT.banner.show(MT.TEXT.banners.jackpot, { color: '#ffe060' }); MT.lines.pool('jackpot', 'LANCE', { prio: 2 }); MT.sfx('kaching'); },
    spinAgain: () => MT.banner.show(MT.TEXT.banners.spinAgain, { color: '#22c55e', dur: 1.2 }),
    puff: d => { MT.sfx('pfft', { vol: .5 }); P() && P().smoke(d.x, d.y, 4, 4, { color: '#ffffff' }); },
    wheelLoose: () => { MT.lines.sayAll(MT.TEXT.boss.wheelLoose, { prio: 3 }); MT.music.layer('phase2', 1, .5); MT.sfx('crash'); MT.shake(6); },
    segVoid: d => MT.popup(184, 60, 40, 'VOID', '#5a4a6a', 2),
    cyclone: () => MT.sfx('whirr'), micDrop: () => MT.sfx('whoosh'), slam: d => { MT.sfx('bigboom'); MT.shake(7); P() && P().dust(d.x, d.y, 0, 20); }, sweep: () => MT.sfx('shimmer'),
    commercial: () => { MT.banner.show(MT.TEXT.banners.back, { color: '#ffcc33', dur: 3 }); MT.lines.sayAll(MT.TEXT.boss.commercial, { prio: 3 }); MT.music.sting('stJingle'); },
    backFromBreak: () => MT.lines.say('LANCE', 'AND WE\'RE BACK!', { prio: 2 }),
    lanceDown: () => { MT.lines.sayAll(MT.TEXT.boss.lanceDown, { prio: 3 }); MT.music.play(null, { fade: .8 }); MT.sfx('static'); },
    robotReveal: () => { MT.banner.show(MT.TEXT.banners.robot, { color: '#ff3344', dur: 3 }); MT.lines.sayAll(MT.TEXT.boss.robot, { prio: 3 }); MT.babble.crowd('ooh', 1); },
    networkReveal: () => { MT.banner.show(MT.TEXT.banners.network, { color: '#ff3344', dur: 2.5 }); MT.lines.sayAll(MT.TEXT.boss.network, { prio: 3 }); MT.music.play('bossShowdown', { fade: .5, restart: true }); MT.later(.5, () => MT.music.layer('phase2', 1, 1)); MT.sfx('static'); MT.shake(5); },
    channel: () => MT.sfx('channel'), eyeFire: () => MT.sfx('zap'), tvDown: d => { MT.sfx('boom'); MT.sfx('static', { vol: .4 }); P() && P().sparks(d.x, d.y, 20, 10, -1.57); },
    signalLost: () => { MT.banner.show(MT.TEXT.banners.signal, { color: '#ffffff', dur: 3 }); MT.sfx('static'); MT.flash('#ffffff', .5); }
  }
};
MT.on('door', d => { if (d.state === 'opening') { MT.sfx('rollup', { vol: .5 }); if (MT.fxr() < .5) MT.sfx('klaxon', { vol: .5 }); } else MT.sfx('slam', { vol: .5 }); });
MT.on('conveyorWarn', () => MT.sfx('alarm'));
MT.on('pyro', () => MT.sfx('pyro', { vol: .6 }));
// a timer on real time that survives scene changes (lines after a beat)
MT._later = [];
MT.later = (s, fn) => { MT._later.push({ t: s, fn }); };
MT.laterTick = dt => { for (const l of MT._later) { l.t -= dt; if (l.t <= 0) { l.done = true; l.fn(); } } MT._later = MT._later.filter(l => !l.done); };

// ===== 20-content-episodes.js
// ---------------------------------------------------------------- content: episodes, maps and rooms as data (a new room is one entry)
// Wave notation: { left, at, spawn: [[door, kind, n, gap]], items: [[pickup, where]] }; door: N E S W all sides ends audience drop [cx, cy]
const W_ = (at, left, spawn, items, extra) => Object.assign({ at, left, spawn, items }, extra || {});
MT.ROOMS = {};
const room = (o) => { MT.ROOMS[o.id] = o; return o; };
// ---------------- EPISODE 1: THE PILOT
room({ id: '1-1', name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true,
  waves: [W_(2, undefined, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), W_(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]),
    W_(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), W_(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), W_(8, 5, [['all', 'goon', 5], ['N', 'popper', 2]])] });
room({ id: '1-2', name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' },
  place: [[3, 3], [7, 2], [13, 2], [17, 3], [5, 6], [15, 6], [3, 9], [7, 10], [13, 10], [17, 9]].map(([x, y]) => ['mime', x, y]),
  waves: [W_(2, undefined, [['S', 'goon', 8]]), W_(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), W_(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]),
    W_(8, 4, [['all', 'clapbot', 3]]), W_(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]])] });
room({ id: '1-3', name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
  waves: [W_(2, undefined, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), W_(8, 3, [['N', 'goon', 12]]), W_(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]),
    W_(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), W_(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] });
room({ id: '1-4', name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 50, key: { rule: 'survive' },
  survive: { dur: 35, cageAt: 20, streams: [[1.2, 'each', 'goon', 1], [4, 'random', 'clapbot', 2], [7, 'random', 'popper', 1]], final: [['all', 'goon', 4]] },
  items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']] });
room({ id: '1-5', name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80,
  items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]], pedestals: [[5, 6], [15, 6], [10, 3]],
  waves: [W_(3, undefined, [['all', 'goon', 8]]), W_(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), W_(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]),
    W_(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), W_(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] });
room({ id: '1-6', name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: { rule: 'crate' }, cashMul: 1.5, dropBoost: 2,
  place: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]].map(([x, y]) => ['crate', x, y]),
  waves: [W_(2, undefined, [['N', 'goon', 10]]), W_(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), W_(8, 4, [['all', 'clapbot', 4]]), W_(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]])] });
room({ id: '1-B', name: "MASHY'S BIG DEBUT", ep: 1, type: 'boss', cell: [1, 0], boss: 'mashy', par: 120 });
// ---------------- EPISODE 2: SWEEPS WEEK
room({ id: '2-1', name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70,
  waves: [W_(2, undefined, [['N', 'goon', 10], ['S', 'goon', 10]]), W_(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), W_(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]),
    W_(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), W_(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] });
room({ id: '2-2', name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt', at: [19, 5] },
  hazards: [{ kind: 'conveyor', rows: [2, 5, 9], dirs: [1, -1, 1] }],
  waves: [W_(2, undefined, [['E', 'goon', 12]]), W_(8, 4, [['W', 'clapbot', 10]]), W_(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), W_(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), W_(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] });
room({ id: '2-3', name: 'DISCO DEPOT', ep: 2, type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70,
  waves: [W_(2, undefined, [['N', 'discoBig', 2]]), W_(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), W_(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]), W_(8, 4, [['all', 'clapbot', 5]]), W_(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] });
room({ id: '2-4', name: 'TOMATO TERRITORY', ep: 2, type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier', kind: 'hecklerKing' },
  waves: [W_(2, undefined, [['audience', 'heckler', 4]]), W_(8, 2, [['N', 'goon', 12]]), W_(8, 4, [['audience', 'heckler', 6]]), W_(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]),
    W_(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] });
room({ id: '2-5', name: 'TANK YARD', ep: 2, type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80,
  items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]], pedestals: [[5, 6], [15, 6]],
  waves: [W_(2, undefined, [['N', 'tank', 1]]), W_(10, 1, [['all', 'goon', 8]]), W_(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]), W_(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), W_(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] });
room({ id: '2-6', name: 'BLOWOUT SALE', ep: 2, type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: { rule: 'crate' }, cashMul: 1.5, dropBoost: 2,
  place: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]].map(([x, y]) => ['crate', x, y]),
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4]]), W_(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]), W_(8, 3, [['all', 'clapbot', 5]]), W_(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] });
room({ id: '2-B', name: 'THE BIG SPIN', ep: 2, type: 'boss', cell: [1, 0], boss: 'wheel', par: 150 });
// ---------------- EPISODE 3: THE SEASON FINALE
room({ id: '3-1', name: 'RED CARPET RIOT', ep: 3, type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75,
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), W_(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]), W_(9, 3, [['N', 'brute', 1]]), W_(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] });
room({ id: '3-2', name: 'PYRO PIT', ep: 3, type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' },
  hazards: [{ kind: 'vents', cx: [4, 8, 12, 16], cy: [3, 6, 9], patterns: ['rows', 'cols', 'checker', 'allButLane'], every: 3.5 }],
  waves: [W_(2, undefined, [['N', 'goon', 12]]), W_(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), W_(8, 4, [['S', 'popper', 4]], [['records', 'drop']]), W_(8, 3, [['audience', 'heckler', 4]]),
    W_(8, 3, [['all', 'goon', 4]], [], { script: 'finaleBurst' })] });
room({ id: '3-3', name: 'CABLE TANGLE', ep: 3, type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75,
  waves: [W_(2, undefined, [['N', 'snake', 1]]), W_(8, undefined, [['all', 'goon', 6]]), W_(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]), W_(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), W_(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] });
room({ id: '3-4', name: 'PENTHOUSE VAULT', ep: 3, type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' },
  waves: [W_(2, undefined, [['all', 'goon', 8]]), W_(8, 4, [['audience', 'heckler', 4]]), W_(8, 3, [['E', 'tank', 1]]), W_(8, 3, [['all', 'clapbot', 5]]), W_(8, 3, [['N', 'brute', 1]])] });
room({ id: '3-5', name: 'THE AFTER-PARTY', ep: 3, type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85,
  items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]], pedestals: [[5, 6], [15, 6], [10, 10]],
  waves: [W_(2, undefined, [['N', 'snake', 1], ['S', 'goon', 10]]), W_(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), W_(8, 3, [['audience', 'heckler', 6]]), W_(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), W_(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] });
room({ id: '3-6', name: 'MASCOT MAYHEM', ep: 3, type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier', kind: 'brute', nth: 2, wave: 4 },
  waves: [W_(2, undefined, [['N', 'brute', 1]]), W_(10, 1, [['all', 'goon', 8]]), W_(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]), W_(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), W_(10, 2, [['N', 'brute', 2]])] });
room({ id: '3-B', name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', cell: [1, 0], boss: 'lance', par: 200 });
// ---------------- THE GREEN ROOM (bonus) and THE LIGHTNING ROUND (AI Hub sessions)
room({ id: 'GR', name: 'THE GREEN ROOM', ep: 4, type: 'bonus', set: 'greenroom', cell: [1, 0], bonus: { dur: 40 }, place: [[3, 3], [17, 3], [3, 9], [17, 9], [8, 6], [12, 6]].map(([x, y]) => ['paparazzi', x, y]) });
room(Object.assign({}, MT.ROOMS['1-1'], { id: 'L1', name: 'LIGHTNING: OPENING NUMBER', tutorial: false, exits: { N: 'L2' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['1-2'], { id: 'L2', name: 'LIGHTNING: MIME FIELD', exits: { N: 'L3' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['2-3'], { id: 'L3', name: 'LIGHTNING: DISCO DEPOT', ep: 1, set: 'studio', exits: { N: 'LB' }, lightning: true }));
room(Object.assign({}, MT.ROOMS['1-B'], { id: 'LB', name: 'LIGHTNING: MASHY', lightning: true }));

MT.EPISODES = {
  1: { n: 1, title: 'THE PILOT', setName: 'STUDIO 9', set: 'studio', song: 'studioBattle', stunt: ['clapbot', 12], start: '1-1', boss: '1-B',
    rooms: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B'] },
  2: { n: 2, title: 'SWEEPS WEEK', setName: 'THE MEGAMART PRIZE WAREHOUSE', set: 'warehouse', song: 'warehouseFunk', stunt: ['tank', 1], start: '2-1', boss: '2-B',
    rooms: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B'] },
  3: { n: 3, title: 'THE SEASON FINALE', setName: 'THE ROOFTOP GALA', set: 'rooftop', song: 'finaleOverture', stunt: ['brute', 1], start: '3-1', boss: '3-B',
    rooms: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B'] }
};
MT.LIGHTNING = ['L1', 'L2', 'L3', 'LB'];
MT.roomSet = (room) => room.set || (MT.EPISODES[room.ep] || MT.EPISODES[1]).set;
MT.roomKeyed = id => { const r = MT.ROOMS[id]; return !!(r && r.key); };

// ---------------- prizes, each with Penny's line; drawn from the episode's table, shuffled by the run's seed
MT.PRIZES = {
  1: [['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!', ['toaster', '#c8d0e0', '#ff2e88']], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!', ['blender', '#2ee6ff', '#c8d0e0']],
    ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!', ['box', '#ffcc33', '#c8202a']], ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!', ['gem', '#9a7aff', '#2ee6ff']],
    ['A DRY-LAND JET SKI', 8000, "IT DOESN'T FLOAT, BUT IT LOOKS GREAT!", ['vehicle', '#2ee6ff', '#ff2e88']], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!', ['robot', '#c8d0e0', '#5a5a6a']]],
  2: [['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!', ['box', '#e8e8f0', '#2ee6ff']], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!', ['robot', '#ff6a3a', '#ffcc33']],
    ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!', ['screen', '#3b82f6', '#3a3a48']], ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!', ['box', '#22c55e', '#ffffff']],
    ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!', ['blender', '#ffcc33', '#3a3a48']], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!', ['vehicle', '#c8202a', '#ffcc33']]],
  3: [['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!', ['moon', '#ffe060', '#c8d0e0']], ['A PERSONAL WEATHER MACHINE', 15000, "RAIN ON EVERYONE'S PARADE!", ['robot', '#2ee6ff', '#3b82f6']],
    ['A DIAMOND TOOTHBRUSH', 8000, "FOR A SMILE LIKE LANCE'S!", ['gem', '#e8f8ff', '#9ad0ff']], ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!', ['box', '#ff8ad8', '#22c55e']],
    ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!', ['blender', '#ffe060', '#ffffff']], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!', ['vehicle', '#ffffff', '#7a2a9a']]]
};
MT.PRIZES[4] = MT.PRIZES[3];
MT.nextPrize = (ep) => {
  const run = MT.run, k = Math.min(3, Math.max(1, ep || 1));
  run.prizeBags = run.prizeBags || {};
  if (!run.prizeBags[k] || !run.prizeBags[k].length) run.prizeBags[k] = MT.shuffle(MT.PRIZES[k].map((p, i) => i), 'prize');
  const p = MT.PRIZES[k][run.prizeBags[k].shift()];
  return { name: p[0], value: p[1], line: p[2], icon: p[3] };
};
// the attract mode's reels: a room or a scene, a setup, a duration and a caption
MT.REELS = [
  { kind: 'cold', dur: 7, cap: 'reel1' },
  { kind: 'room', room: '1-1', dur: 18, cap: 'reel2', weapon: 'spread', seed: 3 },
  { kind: 'room', room: '1-2', dur: 14, cap: 'reel3', weapon: 'rockets', forceKey: 10, seed: 4 },
  { kind: 'room', room: '1-B', dur: 16, cap: 'reel4', bossPhase: 'p2', seed: 5 },
  { kind: 'room', room: '2-2', dur: 16, cap: 'reel5', weapon: 'popcorn', weapon2: 'laser', prime: 3, seed: 6 },
  { kind: 'room', room: '2-B', dur: 16, cap: 'reel6', forceSegs: [6, 0], seed: 7 },
  { kind: 'room', room: '3-6', dur: 16, cap: 'reel7', addon: 'records', addon2: 'shield', boat: true, bomb: 6, seed: 8 },
  { kind: 'room', room: '3-B', dur: 16, cap: 'reel8', lanceMic: true, network: 8, seed: 9 },
  { kind: 'recap', dur: 8, cap: 'reel9' },
  { kind: 'scores', dur: 6, cap: null }
];

// ===== 21-content-script.js
// ---------------------------------------------------------------- every word of text, as data ({NAME}, {PRIZE}, {N} substitutions)
MT.TEXT = {
  speakers: { LANCE: 'LANCE LUSTRE', PENNY: 'PENNY PRIZE', ANNC: 'ANNOUNCER', MASHY: 'MASHY', NETWORK: 'THE NETWORK', SPONSOR: 'KRUNCH-O', P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4' },
  voices: { LANCE: 'lance', PENNY: 'penny', ANNC: 'annc', MASHY: 'mashy', NETWORK: 'network', SPONSOR: 'sponsor' },
  sponsors: [['KRUNCH-O', 'THE CEREAL THAT CRUNCHES BACK'], ['MEGAMART', 'WE SELL EVERYTHING. EVEN THIS SHOW.'], ['DOOM COLA', 'TASTE THE END'], ['LAFF TRAK', 'CANNED LAUGHTER FOR AWKWARD SILENCES']],
  pools: {
    roomStart: ['DOORS OPEN IN 3... 2... OH, THEY\'RE ALREADY OPEN!', 'THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!', 'MASH \'EM! CASH \'EM! KA-CHING! KA-BOOM!',
      'DON\'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!', 'LET\'S GET READY TO... MASH!', 'OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!', 'THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!', 'MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!'],
    roomClear: ['ROOM CLEAR! THE JANITORS HATE YOU!', 'MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!', 'NOW THAT\'S MUST-MASH TV!', 'PICK A DOOR, ANY DOOR! THEY\'RE ALL TERRIBLE!', 'STAY TUNED... AND STAY ALIVE!', 'WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!'],
    hurt: ['OOH! THAT\'S GONNA LEAVE A MARK!', 'WALK IT OFF! THE NETWORK DOESN\'T PAY FOR BANDAGES!', 'SO CLOSE! I MEAN... HOORAY!'],
    death: ['MASHED! LET\'S SEE THAT AGAIN IN SLOW MOTION!', 'DON\'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!', 'THEY\'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!', 'AND DOWN GOES {NAME}! THE CROWD GOES MILD!'],
    multi: ['MULTI-MASH!', 'A TRIPLE! THE SPONSORS LOVE A TRIPLE!', 'TOTAL MASH-ACRE!'],
    showboat: ['WORK THAT CAMERA!', 'SHOWMANSHIP! OR STUPIDITY! SAME THING!', 'THE CAMERAS LOVE YOU! THE GOONS DON\'T!'],
    prime: ['RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!', 'PRIME TIME, BABY! FIVE TIMES THE CASH!', 'THE SPONSORS ARE WEEPING WITH JOY!'],
    stunt: ['WE\'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!', 'BORING! RELEASE THE STUNT!', 'THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!'],
    key: ['A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!', 'ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!'],
    prizeL: ['YOU WON {PRIZE}! IT\'S WORTH MONEY! PROBABLY!'],
    prizeP: ['OOOH! {PRIZE}!'],
    extraLife: ['ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!'],
    hurry: ['PICK A DOOR! WE\'RE PAYING OVERTIME HERE!'],
    lowHp: ['ONE MORE HIT AND YOU\'RE A COMMERCIAL BREAK!'],
    bankrupt: ['BANKRUPT! THE NETWORK THANKS YOU FOR YOUR DONATION!'],
    jackpot: ['JACKPOT! GRAB IT BEFORE THE ACCOUNTANTS DO!']
  },
  intros: {
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
  cold: [
    ['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!'],
    ['LANCE', 'GOOD EVENING, PLANET EARTH! I\'M LANCE LUSTRE, AND THIS IS THE ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!'],
    ['LANCE', 'TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!'],
    ['CONTESTANTS'],
    ['PENNY', 'AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!'],
    ['LANCE', 'LET\'S PLAY... MASH TV! KA-CHING! KA-BOOM!']
  ],
  bios: ['A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!', 'A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!', 'THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!', 'WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!'],
  epCard: {
    1: [['LANCE', 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!']],
    2: [['LANCE', 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!'], ['PENNY', 'LIVE FROM THE MEGAMART PRIZE WAREHOUSE!']],
    3: [['LANCE', 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!']]
  },
  boss: {
    mashyIntro: [['PENNY', 'OOH, HERE HE COMES!'], ['LANCE', 'PLEASE WELCOME THE NETWORK\'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!'], ['MASHY', 'MASHY LOVE YOU! MASHY MASH YOU!']],
    mashyMad: [['LANCE', 'UH-OH! MASHY\'S GONE MASHY!']],
    mashyDie: [['LANCE', 'MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!']],
    wheelIntro: [['LANCE', 'IT\'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!']],
    wheelLoose: [['LANCE', 'THE WHEEL\'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!']],
    wheelDie: [['LANCE', 'THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!']],
    lanceIntro: [['LANCE', 'YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!']],
    commercial: [['LANCE', 'WE\'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!'], ['SPONSOR', 'KRUNCH-O! THE CEREAL THAT CRUNCHES BACK!']],
    lanceDown: [['LANCE', 'THIS... ISN\'T... OVER... PLEASE... STAND... BY...']],
    robot: [['ANNC', 'LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!']],
    network: [['NETWORK', 'THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED.']],
    networkDie: [['NETWORK', 'SIGNAL... LOST...']]
  },
  recap: { open: ['PENNY', 'LET\'S SEE WHAT OUR CONTESTANTS WON!'], open3: ['PENNY', 'WHAT A SEASON! LET\'S COUNT IT UP!'], close: { 1: ['LANCE', 'SEE YOU AFTER THE BREAK!'], 2: ['LANCE', 'DON\'T GO ANYWHERE! LEGALLY, YOU CAN\'T!'], 3: ['LANCE', 'WHAT A SEASON! GOOD NIGHT, PLANET EARTH!'] }, none: 'NOTHING! NOT EVEN A KEYCHAIN!', mvp: 'EPISODE MVP: {NAME}' },
  greenRoom: [['PENNY', 'YOU FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!']],
  greenOpen: [['PENNY', 'YOU FOUND THE GOLDEN KEYS! THE GREEN ROOM IS OPEN!']],
  endingA: [['PENNY', 'CONGRATULATIONS! YOU SURVIVED THE SEASON!'], ['LANCE', '...HELLO, PLANET EARTH! NEXT SEASON ON MASH TV...']],
  endingB: [['ANNC', 'BREAKING NEWS! TONIGHT\'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!'], ['ANNC', 'MASH TV HAS BEEN... CANCELLED!'], ['LANCE', 'TONIGHT ON CHANNEL 3,000: MASHED POTATOES!']],
  gameOver: [['LANCE', 'AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!'], ['LANCE', 'YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!']],
  cont: ['LANCE', 'WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!'],
  sessionEnd: { finished: ['LANCE', 'THAT\'S OUR SHOW! TUNE IN NEXT ROUND!'], trouble: ['ANNC', 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.'] },
  tutorial: { move: 'MOVE', aim: 'AIM + FIRE', walk: 'WALK OVER POWER-UPS', boat: 'SHOWBOAT NEAR ENEMIES FOR RATINGS', slide: 'SLIDE THROUGH DANGER', bomb: 'SHOWSTOPPER CLEARS THE SCREEN', door: 'PICK A DOOR!' },
  banners: { clear: 'ROOM CLEAR!', prime: 'PRIME TIME!', bankrupt: 'BANKRUPT!', stunt: 'WE\'RE LOSING VIEWERS!', mashed: 'MASHED!', encore: 'ENCORE!', hurry: 'HURRY UP!', jackpot: 'JACKPOT!', back: 'WE\'LL BE RIGHT BACK!', signal: 'SIGNAL LOST', robot: 'LANCE WAS A ROBOT!', basics: 'BACK TO BASICS', key: 'GOLDEN KEY {N}/9', won: 'YOU WON: {PRIZE}!', network: 'THE NETWORK', spinAgain: 'SPIN AGAIN!' },
  captions: { reel1: 'TONIGHT ON MASH TV!', reel2: 'MASH \'EM!', reel3: 'CASH \'EM!', reel4: 'BOSSES THE SIZE OF A STUDIO!', reel5: 'PRIME TIME = 5X CASH!', reel6: 'SPIN THE WHEEL OF MISFORTUNE!', reel7: 'PLAY TO THE CAMERAS!', reel8: 'NOBODY CANCELS LANCE LUSTRE!', reel9: 'BIG PRIZES!' },
  menu: ['START THE SHOW', 'EPISODES', 'HOW TO PLAY', 'TOP EARNERS', 'OPTIONS', 'ABOUT & CREDITS'],
  howto: [
    { title: 'CONTROLS', rows: [['move', 'MOVE'], ['aim', 'AIM AND FIRE'], ['fire', 'FIRE'], ['slide', 'SLIDE (DODGE)'], ['bomb', 'SHOWSTOPPER (SCREEN BOMB)'], ['showboat', 'SHOWBOAT (PLAY TO THE CAMERA)']] },
    { title: 'THE SHOW', lines: ['FIGHT THROUGH SEALED STUDIO ROOMS. FOES POUR IN THROUGH FOUR DOORS.', 'GRAB CASH AND PRIZES. KEEP THE RATINGS UP: THEY MULTIPLY YOUR CASH UP TO 5X.', 'SHOWBOAT NEAR FOES AND DODGE CLOSE CALLS FOR RATINGS. HIT 100 FOR PRIME TIME!', 'AFTER A CLEAR, WALK THROUGH A LIT DOOR TO PICK THE NEXT ROOM.', 'FIND GOLDEN KEYS. FIVE OR MORE OPEN THE SECRET GREEN ROOM.'] },
    { title: 'POWER-UPS', items: ['spread', 'rockets', 'popcorn'] },
    { title: 'MORE POWER-UPS', items: ['laser', 'records', 'shield', 'speed'] }
  ],
  credits: ['MASH TV', '', 'A GAME SHOW OF MASS DESTRUCTION', '', 'MADE WITH THE MY-3D2DGE ENGINE', 'ORIGINAL MUSIC, SOUND AND VOICES IN CODE', '', 'DESIGN, CODE, ART AND AUDIO', 'CLAUDE OPUS 5.5 (ANTHROPIC)', 'FROM A PLAN BY CLAUDE OPUS 5.5', '', 'INSPIRED BY SMASH TV (1990)', 'AI HUB SESSION PROTOCOL V1', '', 'THANKS FOR WATCHING!'],
  difficulty: { title: 'CHOOSE YOUR DIFFICULTY' },
  lobby: { title: "TONIGHT'S CONTESTANTS", join: 'TO JOIN', ready: 'READY!', lets: "LET'S PLAY!" },
  touch: { title: 'CONTROLLER OR KEYBOARD REQUIRED', body: 'MASH TV PLAYS WITH A GAMEPAD OR A KEYBOARD AND MOUSE.' }
};
MT.fill = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m);

// ===== 30-ui-kit.js
// ---------------------------------------------------------------- the UI kit: 10-foot canvas widgets, focus handled once (any player, mouse hover, clicks)
MT.ui = (() => {
  const F = E.font;
  const T = (g, s, x, y, c = '#fff7e8', o = {}) => F.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
  let wheel = 0, lastPtr = null, ptrMoved = false;
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('wheel', e => { wheel += Math.sign(e.deltaY); }, { passive: true });
  const api = {
    T,
    lastI() { return MT.lastInput || (MT.game && MT.game.input); },
    nav(a) { const g = MT.game; if (!g) return false; for (const p of g.players) { if (a === 'up' || a === 'down' || a === 'left' || a === 'right' ? p.repeat(a, .32, .1) : p.pressed(a)) { MT.lastInput = p; return true; } } return false; },
    held(a) { const g = MT.game; return !!g && g.players.some(p => p.down(a)); },
    takeWheel() { const w = wheel; wheel = 0; return w; },
    tick() {   // once a step: the pointer's motion (hover moves focus only when it moved)
      const g = MT.game, p = g && g.input.pointer ? g.input.pointer() : null;
      ptrMoved = !!p && (!lastPtr || Math.abs(p[0] - lastPtr[0]) + Math.abs(p[1] - lastPtr[1]) > .5); lastPtr = p ? p.slice() : null;
      for (const q of g.players) if (q.anyPressed()) MT.lastInput = q;
    },
    pointer() { return MT.game && MT.game.input.pointer ? MT.game.input.pointer() : null; },
    ptrMoved() { return ptrMoved; },
    clicked() { const g = MT.game; return g && g.input.clicked ? g.input.clicked() : null; },
    inRect(p, r) { return p && r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]; },
    panel(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .9 : o.alpha }); },
    // the marquee-bulb frame chasing round a rectangle
    bulbs(g, x, y, w, h, t, col = '#ffcc33', dim = '#5a4020', gap = 5) {
      const per = 2 * (w + h), n = Math.floor(per / gap), k = Math.floor(t * 12);
      for (let i = 0; i < n; i++) {
        let d = i * gap, px0, py0;
        if (d < w) { px0 = x + d; py0 = y; } else if ((d -= w) < h) { px0 = x + w; py0 = y + d; } else if ((d -= h) < w) { px0 = x + w - d; py0 = y + h; } else { d -= w; px0 = x; py0 = y + h - d; }
        px.rect(g, Math.round(px0) - 1, Math.round(py0) - 1, 2, 2, (i + k) % 3 === 0 ? col : dim);
      }
    },
    promptBar(g, r, items, I) {
      I = I || api.lastI(); const y = r.H - 16;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 20, '#0a0612'));
      MT.glyph.prompt(g, r.W / 2, y, items, I, { align: 'center' });
    },
    title(g, r, s, y = 14, col = '#ffcc33') { F.title(g, s, r.W / 2, y, { scale: 2, align: 'center', colors: [col, '#ff7a5a'], outline: '#1a0a24', depth: 1, depthColor: '#5a0a3a' }); },
    backdrop(r, tn) {   // the studio behind every front-end screen: dark velvet, sweeping spotlights
      r.sky(['#0c0618', '#1c0c30', '#2a1446']);
      r.overlay(g => {
        for (let i = 0; i < 4; i++) {
          const a = Math.sin(tn * .5 + i * 1.7) * .5, x = r.W * (i + .5) / 4;
          px.blend(g, .12, 'add', () => px.poly(g, [[x - 3, 0], [x + 3, 0], [x + Math.sin(a) * r.H + 40, r.H], [x + Math.sin(a) * r.H - 40, r.H]], ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a7aff'][i]));
        }
        for (let i = 0; i < r.W; i += 6) px.dot(g, i, r.H - 3, (i / 6 + Math.floor(tn * 8)) % 3 === 0 ? '#ffcc33' : '#4a3018');
      });
    }
  };
  // a vertical list of items, each { label, act, left, right, value: () => string, disabled, h }
  class FocusList {
    constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.rects = []; this.o = o; this.t = 0; this.onCancel = o.onCancel || null; }
    get cur() { return this.items[this.i]; }
    update(dt) {
      this.t += dt; const n = this.items.length; if (!n) return;
      const mv = d => { let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; MT.sfx('blip'); } };
      if (api.nav('up')) mv(-1); if (api.nav('down')) mv(1);
      const w = api.takeWheel(); if (w) { if (this.cur.left && this.cur.right) (w < 0 ? this.cur.right : this.cur.left)(); else mv(w > 0 ? 1 : -1); }
      const p = api.pointer();
      if (api.ptrMoved() && p) for (let k = 0; k < this.rects.length; k++) if (api.inRect(p, this.rects[k]) && !this.items[k].disabled && k !== this.i) { this.i = k; MT.sfx('blip'); }
      const it = this.cur;
      if (it.left && api.nav('left')) { it.left(); MT.sfx('slider'); }
      if (it.right && api.nav('right')) { it.right(); MT.sfx('slider'); }
      const c = api.clicked();
      if (c) for (let k = 0; k < this.rects.length; k++) if (api.inRect(c, this.rects[k]) && !this.items[k].disabled) { this.i = k; this.fire(); return; }
      if (api.nav('confirm')) { this.fire(); return; }
      if (api.nav('cancel') && this.onCancel) { MT.sfx('back'); this.onCancel(); }
    }
    fire() { const it = this.cur; if (it && !it.disabled && it.act) { MT.sfx('bell'); it.act(); } }
    draw(g, r, x, y, w, o = {}) {
      const rowH = o.rowH || 22, s = o.scale || 1; this.rects = [];
      this.items.forEach((it, k) => {
        const yy = y + k * rowH, on = k === this.i, h = rowH - 4, label = it.label + (it.value ? '  ' + it.value() : '');
        this.rects.push([x, yy, w, h]);
        api.panel(g, x, yy, w, h, { alpha: on ? .95 : .75, border: on ? '#ffcc33' : '#5a3a6a', bg: on ? ['#4a1a5c', '#2a0e3a'] : ['#24123a', '#140a24'] });
        if (on) api.bulbs(g, x - 2, yy - 2, w + 4, h + 4, this.t);
        const c = it.disabled ? '#6a5a7a' : on ? '#ffcc33' : '#fff7e8';
        T(g, label, o.align === 'left' ? x + 8 : x + w / 2, yy + h / 2 - 3.5 * s, c, { align: o.align === 'left' ? 'left' : 'center', scale: s });
        if (on && it.left) { T(g, '←', x + 4, yy + h / 2 - 3.5, '#ffcc33'); T(g, '→', x + w - 9, yy + h / 2 - 3.5, '#ffcc33'); }
      });
    }
  }
  api.FocusList = FocusList;
  // the lower third: name plate, the line typing, a live portrait
  api.lowerThird = (g, r) => {
    const L = MT.lines.current; if (!L || MT.game.settings.subtitles === false && L.prio < 3) return;
    const w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2), y = r.H - 50, h = 40;
    api.panel(g, x, y, w, h, { alpha: .9 });
    MT.cast.drawPortrait(g, L.speaker, x + 4, y + 4, 32);
    const name = MT.TEXT.speakers[L.speaker] || L.speaker;
    px.rect(g, x + 40, y - 6, F.width(name) + 8, 11, '#ff2e88'); T(g, name, x + 44, y - 4, '#ffffff');
    const lines = F.wrap(MT.lines.shown(), w - 48); lines.slice(0, 3).forEach((s, i) => T(g, s, x + 42, y + 6 + i * 9, '#fff7e8'));
    if (L.hint) { const hw = F.width(L.hint) + 10; api.panel(g, r.W / 2 - hw / 2, y - 22, hw, 13, { alpha: .9, border: '#2ee6ff' }); T(g, L.hint, r.W / 2, y - 19, '#2ee6ff', { align: 'center' }); }
  };
  api.banners = (g, r) => {
    MT.banner.list.forEach((b, i) => {
      const u = b.t, sl = Math.min(1, u / .25), out = Math.max(0, (u - b.dur + .3) / .3), y = Math.round(r.H * .3 + i * 30 - (1 - sl) * 20 - out * 10);
      const sc = b.big ? 2 : 1, w = F.width(b.text) * sc + 24, x = Math.round(r.W / 2 - w / 2);
      if (out >= 1) return;
      api.panel(g, x, y, w, 14 * sc + (b.sub ? 10 : 0) + 6, { alpha: .9, border: b.color });
      api.bulbs(g, x - 2, y - 2, w + 4, 14 * sc + (b.sub ? 10 : 0) + 10, MT.game.real, b.color);
      T(g, b.text, r.W / 2, y + 4, b.color, { align: 'center', scale: sc });
      if (b.sub) T(g, b.sub, r.W / 2, y + 6 + 7 * sc + 4, '#fff7e8', { align: 'center' });
    });
  };
  // the TV-static wipe between rooms
  api.static = (g, r, k) => {
    if (k <= 0) return;
    px.blend(g, Math.min(1, k), 'normal', () => { px.rect(g, 0, 0, r.W, r.H, '#202028'); for (let i = 0; i < r.W * r.H / 40; i++) px.dot(g, Math.random() * r.W, Math.random() * r.H, Math.random() < .5 ? '#ffffff' : '#606070'); });
    const roll = (MT.game.real * 200) % r.H; px.blend(g, .3 * k, 'add', () => px.rect(g, 0, roll, r.W, 10, '#ffffff'));
  };
  return api;
})();

// ===== 31-hud.js
// ---------------------------------------------------------------- the in-play HUD (screen pixels, anchored to r.W and r.H)
MT.hud = (() => {
  const F = E.font, T = MT.ui.T;
  const icons = {
    sword: g => { px.line(g, 1, 7, 7, 1, '#c8d0e0', 1); px.line(g, 1, 5, 3, 7, '#ffcc33', 1); },
    cash: g => { T(g, '$', 1, 0, '#7ad88a'); },
    gun: g => { px.rect(g, 0, 2, 7, 3, '#c8d0e0'); px.rect(g, 1, 5, 2, 3, '#5a5a6a'); },
    flame: g => { px.disc(g, 4, 5, 3, '#ff6a20'); px.disc(g, 4, 4, 1.5, '#ffcc33'); },
    star: g => { T(g, '★', 0, 0, '#ffcc33'); },
    skull: g => { px.disc(g, 4, 3.5, 3.5, '#fff7e8'); px.rect(g, 2, 6, 5, 2, '#fff7e8'); px.dot(g, 3, 3, '#000'); px.dot(g, 5, 3, '#000'); },
    key: g => { px.disc(g, 2, 4, 2, '#ffcc33'); px.rect(g, 3, 3.5, 5, 1.5, '#ffcc33'); px.dot(g, 7, 5, '#ffcc33'); }
  };
  const api = {
    roomIcon(g, x, y, id) { const f = icons[id] || icons.star; g.save && g.save(); g.translate && g.translate(Math.round(x), Math.round(y)); f(g); g.restore && g.restore(); },
    panel(g, r, c, corner, W) {
      const w = 112, h = 30, x = corner % 2 ? r.W - w - 4 : 4, y = corner >= 2 ? r.H - h - 4 : (corner === 0 ? 14 : 4);
      const cr = MT.game.cornerArea && MT.game.cornerArea(); let yy = y; if (corner === 1 && cr && cr.y1 > y) yy = Math.round(cr.y1 + 2);
      MT.ui.panel(g, x, yy, w, h, { alpha: .8, border: c.color, bg: ['#1c0e2c', '#0e0618'] });
      px.rect(g, x + 2, yy + 2, 3, h - 4, c.color);
      if (c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 7, yy + 3, 18, { zoom: 2.6, bg: '#2a1446', tint: c.state === 'out' || c.state === 'dead' ? '#808080' : undefined });
      T(g, 'P' + (c.slot + 1) + ' ' + c.name, x + 28, yy + 3, c.color, { font: 'tiny', shadow: false });
      if (c.state === 'out') { const I = c.input || MT.game.input; T(g, 'OUT', x + 28, yy + 11, '#ff3344'); MT.glyph.prompt(g, x + 50, yy + 10, [['start', 'CONTINUE']], I); return; }
      T(g, MT.money(c.cash), x + 28, yy + 10, '#ffffff');
      const mhp = MT.maxHp(); for (let i = 0; i < mhp; i++) { const on = i < c.hp; px.rect(g, x + 28 + i * 6, yy + 21, 5, 5, on ? '#ff3344' : '#3a1a24'); if (on) px.dot(g, x + 29 + i * 6, yy + 22, '#ffaaaa'); }
      const lx = x + 30 + mhp * 6; if (!(MT.run && MT.run.mode === 'session')) { T(g, 'x' + Math.max(0, c.lives), lx, yy + 19, '#fff7e8', { shadow: false }); }
      // weapon icon and its bar, add-ons, Showstoppers
      const Wd = MT.WEAPONS[c.wpn], wx = x + w - 30;
      MT.drawCapsule(g, wx + 6, yy + 9, c.wpn === 'blaster' ? 'spread' : c.wpn, 1, 0);
      if (c.wpn === 'blaster') { px.rect(g, wx + 1, yy + 6, 10, 6, '#c8d0e0'); T(g, 'B', wx + 4, yy + 6, '#14101c', { shadow: false }); }
      else { const f = c.wpnT / (Wd.dur * MT.T.puDuration); E.ui.bar(g, wx, yy + 16, 14, 2, f, f < .2 && Math.floor(MT.game.real * 6) % 2 ? '#ffffff' : Wd.color); }
      let ax = wx + 15; for (const k in c.addons) if (c.addons[k] > 0) { px.rect(g, ax, yy + 4, 6, 6, MT.ADDONS[k].color); T(g, MT.ADDONS[k].letter, ax + 1, yy + 4, '#14101c', { font: 'tiny', shadow: false }); ax += 7; if (ax > x + w - 4) break; }
      for (let i = 0; i < c.bombs; i++) { const bx = wx + i * 7, by = yy + 21; px.disc(g, bx + 2, by + 2, 2.5, '#ffffff'); px.rect(g, bx + 1, by + 4, 3, 2, '#6a6a7a'); }
    },
    ratings(g, r, W) {
      const R = W.ratings, cx = Math.round(r.W / 2), y = 4, rad = 17;
      MT.ui.panel(g, cx - 34, y, 68, 26, { alpha: .85, border: R.prime > 0 ? '#ff2e88' : '#ffcc33' });
      for (let a = 0; a <= 20; a++) { const an = Math.PI + a / 20 * Math.PI, c = a < 4 ? '#5a5a8a' : a < 8 ? '#2ee6ff' : a < 12 ? '#22c55e' : a < 16 ? '#ffcc33' : '#ff2e88'; px.dot(g, cx + Math.cos(an) * rad, y + 22 + Math.sin(an) * rad * .9, c); }
      const an = Math.PI + R.R / 100 * Math.PI; px.line(g, cx, y + 22, cx + Math.cos(an) * (rad - 3), y + 22 + Math.sin(an) * (rad - 3) * .9, '#ffffff', 1); px.disc(g, cx, y + 22, 2, '#ff3344');
      T(g, 'RATINGS', cx, y + 2, '#2ee6ff', { align: 'center', shadow: false });
      T(g, 'x' + R.X, cx + 22, y + 12, R.prime > 0 ? '#ff2e88' : '#ffcc33', { align: 'center', scale: 1 });
      const on = R.applause > 0 || R.prime > 0 && Math.floor(MT.game.real * 6) % 2;
      px.rect(g, cx - 32, y + 11, 13, 7, on ? '#ffcc33' : '#3a2a10'); T(g, 'AP', cx - 30, y + 12, on ? '#14101c' : '#7a5a20', { font: 'tiny', shadow: false });
      if (R.prime > 0) T(g, 'PRIME TIME ' + Math.ceil(R.prime), cx, y + 30, Math.floor(MT.game.real * 6) % 2 ? '#ff2e88' : '#ffffff', { align: 'center' });
    },
    draw(r, W) {
      const g0 = MT.game;
      r.overlay(g => {
        const tn = g0.real;
        // the LIVE bug and the channel bug
        px.disc(g, 8, 7, 3, Math.floor(tn * 2) % 2 ? '#ff3344' : '#5a0a14'); T(g, 'LIVE', 13, 4, '#ffffff', { font: 'tiny' }); T(g, 'MASH 9', 34, 4, '#ffcc33', { font: 'tiny' });
        if (MT.devActive() && W.mode !== 'attract') { px.rect(g, 60, 2, 22, 9, '#ff8a20'); T(g, 'DEV', 64, 3, '#14101c', { font: 'tiny', shadow: false }); }
        W.contestants.forEach((c, i) => { if (c.state !== 'gone' && i < 4) api.panel(g, r, c, i, W); });
        api.ratings(g, r, W);
        const cx = r.W / 2;
        // keys and the room's name
        if (W.mode !== 'session') T(g, '★ ' + (MT.run ? MT.run.keys : 0) + '/9', cx + 40, 6, '#ffe060');
        if (!W.room.boss) T(g, (W.room.id.length <= 3 ? W.room.id + ' ' : '') + W.room.name, cx, W.ratings.prime > 0 ? 44 : 34, '#c8d0e0', { align: 'center', font: 'tiny' });
        if (W.mode === 'session' && MT.net && MT.net.left !== null) T(g, MT.fmtTime(MT.net.left), cx + 40, 6, '#2ee6ff');
        // the boss bar
        const B = W.boss; if (B && B.introDone) {
          const bw = Math.min(220, r.W - 140), bx = Math.round(cx - bw / 2), by = MT.lines.current ? r.H - 70 : r.H - 18;
          MT.ui.panel(g, bx - 3, by - 3, bw + 6, 16, { alpha: .85, border: '#ff3344' });
          T(g, B.name, cx, by - 1, '#ff3344', { align: 'center', font: 'tiny' });
          E.ui.bar(g, bx, by + 6, bw, 4, B.hpPct, '#ff3344');
          const al = B.parts.filter(p => p.alive).length; for (let i = 0; i < B.parts.length; i++) px.rect(g, bx + i * (bw / B.parts.length), by + 11, Math.max(1, bw / B.parts.length - 1), 1, i < al ? '#ffcc33' : '#3a2a10');
        }
        // the bottom centre: the lower third, else wave dots and door prompts
        if (MT.lines.current) MT.ui.lowerThird(g, r);
        else if (W.phase === 'waves' && W.wavesTotal > 0) { const n = W.wavesTotal; for (let i = 0; i < n; i++) px.disc(g, cx - (n - 1) * 5 + i * 10, r.H - 10, 3, i <= W.waveIdx ? '#ffcc33' : '#3a2a40'); if (W.surviveT !== undefined && W.jumboClock !== null) T(g, 'SURVIVE ' + MT.fmtTime(W.surviveT), cx, r.H - 24, '#ff3344', { align: 'center', scale: 2 }); }
        else if (W.phase === 'exit') T(g, MT.TEXT.tutorial.door, cx, r.H - 14, Math.floor(tn * 3) % 2 ? '#22ff66' : '#ffffff', { align: 'center', scale: 2 });
        MT.ui.banners(g, r);
        // tutorial prompt
        const tu = MT.tut.cur; if (tu) { const I = MT.ui.lastI(), items = (tu.actions || []).map(a => [a, '']); const w = F.width(tu.text) + MT.glyph.measure(items, I) + 24, x = cx - w / 2, y = r.H - (MT.lines.current ? 96 : 40); MT.ui.panel(g, x, y, w, 18, { alpha: .9, border: '#2ee6ff' }); const ex = MT.glyph.prompt(g, x + 6, y + 4, items, I); T(g, tu.text, ex + 2, y + 6, '#2ee6ff'); }
        // the mouse reticle
        const I = g0.input, m = I.pointer && I.pointer();
        if (m && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard' && I.mouse && I.clock - (I.mouse.t || -9) < 2) && W.contestants[0] && W.contestants[0].ctl === 'local' && W.mode !== 'attract') {
          const [x, y] = [Math.round(m[0]), Math.round(m[1])]; px.rect(g, x - 6, y, 4, 1, '#ffcc33'); px.rect(g, x + 3, y, 4, 1, '#ffcc33'); px.rect(g, x, y - 6, 1, 4, '#ffcc33'); px.rect(g, x, y + 3, 1, 4, '#ffcc33'); px.dot(g, x, y, W.contestants[0].color);
          api.cursor(true);
        } else api.cursor(false);
      });
    },
    cursor(hide) { const cv = MT.game && MT.game.screen && MT.game.screen.canvas; if (cv && cv.style) { const v = hide ? 'none' : ''; if (cv.style.cursor !== v) cv.style.cursor = v; } }
  };
  return api;
})();

// ===== 32-screens.js
// ---------------------------------------------------------------- front-end and between-room screens (10-foot: big text, at most 6 items)
MT.scenes = MT.scenes || {};
const UI = MT.ui, TX = MT.ui.T;
const frontIdle = (scene) => { if (MT.idle.t >= 10 && !(MT.game.shell && MT.game.shell.screen)) { MT.idle.t = 0; MT.game.go('attract', { from: scene }); return true; } return false; };
const goBack = (to = 'title') => { MT.sfx('back'); MT.game.go(to, {}, { fade: .15 }); };
MT.unlocked = () => MT.store.get('mashtv:eps', [1]).slice();
MT.unlock = n => { const u = MT.unlocked(); if (!u.includes(n)) { u.push(n); MT.store.set('mashtv:eps', u); } };

// ---------------- TITLE (with the main menu); touch-only devices get the notice
MT.scenes.title = {
  input: MT.MENU, skippable: false,
  enter() {
    this.t = 0; MT.music.play('theme', { fade: .4 }); MT.detectTouch(); MT.idle.t = 0; MT.run = null; MT.lines.clear(); MT.banner.clear();
    const items = MT.TEXT.menu.map((label, i) => ({ label, act: () => this.pick(i) }));
    this.menu = new UI.FocusList(items, { i: this.menuI || 0 });
    this.touchBtn = null;
  },
  pick(i) {
    this.menuI = i; const g = MT.game;
    if (i === 0) g.go('difficulty', {}); else if (i === 1) g.go('episodes', {}); else if (i === 2) g.go('howto', {}); else if (i === 3) g.go('scores', {}); else if (i === 4) g.menu('settings'); else g.go('about', {});
  },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (frontIdle('title')) return;
    if (MT.touch.only) { const c = UI.clicked(); if (c && this.touchBtn && UI.inRect(c, this.touchBtn)) MT.game.menu('settings'); return; }
    if (!(MT.game.shell && MT.game.shell.screen)) this.menu.update(dt);
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2, u = Math.min(1, this.t / .9), drop = MT.ease.outBounce(u), s = r.H > 340 ? 3 : 2, ly = Math.round(12 + 6 * s + (r.H > r.W ? 40 : 0) + (1 - drop) * -90);
      MT.drawLogo(g, cx, ly, s);
      TX(g, 'LIVE FROM STUDIO 9', cx, ly + 11 * s, '#2ee6ff', { align: 'center' });
      if (MT.touch.only) {
        const w = Math.min(300, r.W - 20), x = cx - w / 2, y = ly + 26 * s + 6; UI.panel(g, x, y, w, 70, { border: '#ff3344' });
        TX(g, MT.TEXT.touch.title, cx, y + 8, '#ff3344', { align: 'center' }); TX(g, MT.TEXT.touch.body, cx, y + 22, '#fff7e8', { align: 'center', font: 'tiny' });
        this.touchBtn = [cx - 50, y + 36, 100, 24]; UI.panel(g, cx - 50, y + 36, 100, 24, { border: '#ffcc33' }); TX(g, 'SETTINGS', cx, y + 44, '#ffcc33', { align: 'center' });
      } else {
        const w = 170, x = Math.round(cx - w / 2), y = Math.max(ly, 12 + 6 * s) + 26 * s + 6;
        this.menu.draw(g, r, x, y, w, { rowH: Math.min(22, Math.floor((r.H - y - 26) / 6)) });
        UI.promptBar(g, r, [['confirm', 'SELECT'], ['up', ''], ['down', 'CHOOSE']]);
      }
      TX(g, E.versionLabel().replace(/·/g, '-') + ' - MASH TV ' + MT.VERSION, 4, r.H - 26, '#6a5a8a', { font: 'tiny' });
    });
  }
};
// ---------------- DIFFICULTY
MT.scenes.difficulty = {
  input: MT.MENU,
  enter(d = {}) { this.d = d; this.list = new UI.FocusList(['ROOKIE', 'CONTESTANT', 'CHAMPION'].map(k => ({ label: k, act: () => MT.game.go('lobby', { diff: k, mode: d.mode || 'arcade', ep: d.ep || 1 }) })), { i: 1, onCancel: () => goBack(d.back || 'title') }); },
  update(dt) { MT.frame(dt); if (frontIdle('difficulty')) return; this.list.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      UI.title(g, r, MT.TEXT.difficulty.title, 16);
      const cx = r.W / 2, w = 180; this.list.draw(g, r, cx - w / 2, 56, w, { rowH: 26 });
      const D = MT.DIFF[this.list.cur.label]; const y = 140;
      UI.panel(g, cx - 150, y, 300, 40, { border: '#2ee6ff' });
      TX(g, D.desc, cx, y + 8, '#fff7e8', { align: 'center' }); TX(g, 'HEALTH ' + D.hp + '   LIVES ' + D.lives, cx, y + 22, '#ffcc33', { align: 'center' });
      UI.promptBar(g, r, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- THE CONTESTANT LOBBY: join 1-4, pick a look, ready up
MT.scenes.lobby = {
  input: MT.MENU,
  enter(d = {}) {
    this.d = d; this.t = 0; this.count = -1;
    const g = MT.game; this.seats = [{ input: g.input, look: 0, ready: false }];
    for (const p of g.players.slice(1)) this.seats.push({ input: p, look: this.seats.length, ready: false });
    g.allowJoin({ max: 4, keys: false, onJoin: (inp) => { if (this.seats.length < 4) { this.seats.push({ input: inp, look: this.seats.length % 4, ready: false }); MT.sfx('bell'); } } });
    this.rigs = [0, 1, 2, 3].map(i => MT.cfg.skipRigs ? null : MT.looks.make(i, MT.COLORS.p[i], 1.2));
    MT.music.play('theme');
  },
  exit() { MT.game.allowJoin(false); },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (this.seats.length === 1 && !this.seats[0].ready && frontIdle('lobby')) return;
    const c = UI.clicked();
    this.seats.forEach((s, i) => {
      const I = s.input, rc = this.rects && this.rects[i];
      if (I.repeat('left', .3, .15) || c && rc && UI.inRect(c, rc.l)) { if (!s.ready) { s.look = (s.look + 3) % 4; MT.sfx('blip'); } }
      if (I.repeat('right', .3, .15) || c && rc && UI.inRect(c, rc.r)) { if (!s.ready) { s.look = (s.look + 1) % 4; MT.sfx('blip'); } }
      if (I.pressed('confirm') || c && rc && UI.inRect(c, rc.ok)) { if (!s.ready) { s.ready = true; MT.sfx('bell'); MT.babble.crowd('cheer', .4); } }
      if (I.pressed('cancel')) {
        if (s.ready) { s.ready = false; MT.sfx('back'); this.count = -1; }
        else if (i === 0) { goBack('difficulty'); return; }
        else { MT.game.removePlayer(I); this.seats.splice(i, 1); MT.sfx('back'); }
      }
    });
    const all = this.seats.every(s => s.ready);
    if (all && this.count < 0) { this.count = 2; MT.sfx('go'); }
    if (!all) this.count = -1;
    if (this.count >= 0) { this.count -= dt; if (this.count <= 0) this.start(); }
    for (let i = 0; i < 4; i++) if (this.rigs[i]) { const s = this.seats[i]; if (s && this.rigs[i]._look !== s.look) { this.rigs[i] = MT.looks.make(s.look, MT.COLORS.p[i], 1.2); this.rigs[i]._look = s.look; } this.rigs[i] && this.rigs[i].update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: s && s.ready ? 'cheer' : s ? 'hips' : 'kneel', expr: s && s.ready ? 'smile' : null }); }
  },
  start() {
    const d = this.d, players = this.seats.map((s, i) => ({ slot: i, look: s.look, input: s.input }));
    MT.newRun({ mode: d.mode || 'arcade', diff: d.diff || 'CONTESTANT', ep: d.ep || 1, players });
    if (d.mode === 'rehearsal') MT.game.go('play', { ep: d.ep });
    else MT.game.go('cut', { id: 'cold' });
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    this.rects = [];
    r.overlay(g => {
      UI.title(g, r, MT.TEXT.lobby.title, 10);
      if (this.d.mode === 'rehearsal') TX(g, 'REHEARSAL: EPISODE ' + this.d.ep + ' (NO HIGH SCORES)', r.W / 2, 34, '#2ee6ff', { align: 'center' });
      const n = 4, pw = Math.min(96, (r.W - 20) / 4 - 6), x0 = r.W / 2 - (pw + 6) * n / 2 + 3, y = 46, h = r.H - y - 30;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (pw + 6), s = this.seats[i], col = MT.COLORS.p[i];
        UI.panel(g, x, y, pw, h, { border: s ? col : '#3a2a4a', alpha: .85 });
        px.blend(g, .18, 'add', () => px.poly(g, [[x + pw / 2 - 6, y], [x + pw / 2 + 6, y], [x + pw - 4, y + h - 30], [x + 4, y + h - 30]], s ? col : '#3a3a4a'));
        TX(g, 'P' + (i + 1), x + 6, y + 5, col);
        if (!s) { TX(g, 'PRESS', x + pw / 2, y + h / 2 - 16, '#8a7a9a', { align: 'center' }); MT.glyph.draw(g, x + pw / 2 - 18, y + h / 2 - 4, 'start', { lastDevice: 'gamepad', glyphs: MT.game.input.glyphs, map: { start: ['Pad9'] } }); TX(g, MT.TEXT.lobby.join, x + pw / 2, y + h / 2 + 12, '#8a7a9a', { align: 'center' }); continue; }
        const L = MT.looks.LOOKS[s.look];
        const k = MT.pk ? 1 : 1; const ox = x + pw / 2, oy = y + h - 34;
        px.ell(g, ox, oy + 2, 18, 5, '#ffcc33'); px.ell(g, ox, oy + 1, 16, 4, '#5a3a20');
        if (this.rigs[i] && !MT.cfg.skipRigs) this.rigs[i].draw(g, ox, oy, MT.game.view);
        TX(g, L.name, ox, y + 18, '#ffffff', { align: 'center' });
        const lr = [x + 2, y + 40, 14, 40], rr = [x + pw - 16, y + 40, 14, 40], ok = [x + 8, y + h - 24, pw - 16, 16];
        this.rects[i] = { l: lr, r: rr, ok };
        if (!s.ready) { TX(g, '←', lr[0] + 3, lr[1] + 16, '#ffcc33'); TX(g, '→', rr[0] + 3, rr[1] + 16, '#ffcc33'); MT.glyph.prompt(g, ox, ok[1] + 3, [['confirm', 'READY']], s.input, { align: 'center' }); }
        else { UI.bulbs(g, x - 2, y - 2, pw + 4, h + 4, MT.game.real, col); TX(g, MT.TEXT.lobby.ready, ox, ok[1] + 4, '#22ff66', { align: 'center' }); }
      }
      if (this.count >= 0) { TX(g, MT.TEXT.lobby.lets, r.W / 2, r.H / 2 - 10, '#ffcc33', { align: 'center', scale: 3 }); }
      UI.promptBar(g, r, [['left', ''], ['right', 'LOOK'], ['confirm', 'READY'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- HOW TO PLAY (a scene, and the same panel over a paused game)
MT.howtoPanel = {
  page: 0, done: null, t: 0,
  open(done) { this.page = 0; this.done = done; this.t = 0; },
  update(dt) {
    this.t += dt; const n = MT.TEXT.howto.length;
    if (UI.nav('right') || UI.nav('tabR')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('left') || UI.nav('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('page'); }
    const c = UI.clicked(); if (c && this.next && UI.inRect(c, this.next)) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('cancel') || UI.nav('confirm') && this.page === n - 1) { MT.sfx('back'); this.done && this.done(); }
    else if (UI.nav('confirm')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
  },
  draw(r) {
    r.overlay(g => {
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const P = MT.TEXT.howto[this.page], cx = r.W / 2, I = UI.lastI();
      UI.title(g, r, P.title, 10); TX(g, (this.page + 1) + ' / ' + MT.TEXT.howto.length, cx, 34, '#8a7a9a', { align: 'center' });
      const w = Math.min(r.W - 20, 360), x = cx - w / 2, y = 46;
      UI.panel(g, x, y, w, r.H - y - 30, { alpha: .9 });
      if (P.rows) P.rows.forEach(([a, label], i) => { const yy = y + 10 + i * 22; MT.glyph.draw(g, x + 12, yy, a, I); if (a !== 'aim' && a !== 'move' && I.lastDevice === 'gamepad') { const alt = { slide: 'Pad6', bomb: 'Pad5', showboat: 'Pad4' }[a]; } TX(g, label, x + 80, yy + 2, '#fff7e8'); });
      if (P.lines) { let yy = y + 10; for (const L of P.lines) { for (const s of E.font.wrap(L, w - 24)) { TX(g, s, x + 12, yy, '#fff7e8'); yy += 10; } yy += 6; } }
      if (P.items) P.items.forEach((id, i) => { const W2 = MT.WEAPONS[id] || MT.ADDONS[id], yy = y + 12 + i * 34; MT.drawCapsule(g, x + 20, yy + 8, id, 1, MT.game.real); TX(g, W2.name, x + 36, yy, W2.color); for (const [k, s] of E.font.wrap(W2.desc, w - 50).entries()) TX(g, s, x + 36, yy + 10 + k * 9, '#fff7e8'); });
      this.next = [x + w - 40, r.H - 50, 36, 16]; TX(g, 'NEXT →', x + w - 38, r.H - 46, '#ffcc33');
      UI.promptBar(g, r, [['tabL', ''], ['tabR', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
MT.scenes.howto = {
  input: MT.MENU,
  enter() { MT.howtoPanel.open(() => goBack('title')); },
  update(dt) { MT.frame(dt); if (frontIdle('howto')) return; MT.howtoPanel.update(dt); },
  draw(r) { UI.backdrop(r, MT.game.real); MT.howtoPanel.draw(r); }
};
// ---------------- EPISODES (rehearsals)
MT.scenes.episodes = {
  input: MT.MENU,
  enter() { const u = MT.unlocked(); this.list = new UI.FocusList([1, 2, 3].map(n => ({ label: 'EPISODE ' + n + ': ' + MT.EPISODES[n].title, disabled: !u.includes(n), act: () => MT.game.go('lobby', { mode: 'rehearsal', ep: n, diff: 'CONTESTANT' }) })), { onCancel: () => goBack('title') }); },
  update(dt) { MT.frame(dt); if (frontIdle('episodes')) return; this.list.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      UI.title(g, r, 'EPISODES', 12); const cx = r.W / 2, w = Math.min(r.W - 30, 260);
      TX(g, 'REHEARSE ANY EPISODE YOU HAVE REACHED. NO HIGH SCORES.', cx, 38, '#2ee6ff', { align: 'center', font: 'tiny' });
      this.list.draw(g, r, cx - w / 2, 54, w, { rowH: 28 });
      this.list.items.forEach((it, i) => { if (it.disabled) TX(g, 'LOCKED', cx + w / 2 - 36, 54 + i * 28 + 8, '#6a5a7a', { font: 'tiny' }); });
      UI.promptBar(g, r, [['confirm', 'REHEARSE'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- TOP EARNERS
MT.scenes.scores = {
  input: MT.MENU,
  enter(d = {}) { this.d = d; this.t = 0; },
  update(dt) { MT.frame(dt); this.t += dt; if (frontIdle('scores')) return; if (UI.nav('cancel') || UI.nav('confirm') || UI.clicked()) goBack('title'); },
  draw(r) { UI.backdrop(r, MT.game.real); MT.drawScores(r, this.d.hi); r.overlay(g => UI.promptBar(g, r, [['confirm', 'OK'], ['cancel', 'BACK']])); }
};
MT.drawScores = (r, hi) => {
  const t = MT.cab ? MT.cab.table('show') : [];
  r.overlay(g => {
    const cx = r.W / 2; MT.drawLogo(g, cx, 26, 2, true); UI.title(g, r, 'TOP EARNERS', 44);
    const w = Math.min(r.W - 30, 240), x = cx - w / 2, y = 64; UI.panel(g, x, y, w, 10 * 14 + 10, { bg: ['#4a1020', '#2a0814'], border: '#ffcc33' });
    for (let i = 0; i < 10; i++) { const e = t[i], yy = y + 6 + i * 14, c = hi && e && e.name === hi.name && e.score === hi.score ? '#22ff66' : i === 0 ? '#ffcc33' : '#fff7e8'; TX(g, (i + 1) + '.', x + 24, yy, c, { align: 'right' }); TX(g, e ? e.name : '---', x + 32, yy, c); TX(g, e ? MT.money(e.score) : '$0', x + w - 10, yy, c, { align: 'right' }); }
  });
};
// ---------------- ABOUT & CREDITS: paged, big text; Source Information and the three feedback sections from about.json
MT.aboutPages = () => {
  const A = MT.ABOUT || {}, pages = [];
  const add = (title, lines) => { const per = 12, all = []; for (const L of lines) for (const s of E.font.wrap(L, 340)) all.push(s); for (let i = 0; i < Math.max(1, all.length); i += per) pages.push({ title: title + (all.length > per ? ' (' + (Math.floor(i / per) + 1) + '/' + Math.ceil(all.length / per) + ')' : ''), lines: all.slice(i, i + per) }); };
  add('WHAT IS MASH TV?', ['MASH TV IS A 1-4 PLAYER TWIN-STICK ARENA SHOOTER SET INSIDE THE DEADLIEST GAME SHOW ON TELEVISION.', 'FIGHT THROUGH SEALED STUDIO ROOMS, GRAB CASH AND RIDICULOUS PRIZES, PLAY TO THE CAMERAS TO KEEP THE RATINGS UP, AND SURVIVE THREE EPISODES TO THE SEASON FINALE.', 'COLLECT FIVE GOLDEN KEYS TO OPEN THE SECRET GREEN ROOM.']);
  add('CREDITS', MT.TEXT.credits.filter(Boolean));
  const si = A.sourceInformation || {};
  const SI_LABELS = [['date', 'DATE'], ['source', 'SOURCE'], ['plan', 'PLAN'], ['genre', 'GENRE'], ['perspective', 'PERSPECTIVE'], ['tech', 'TECH'], ['artDirection', 'ART DIRECTION'], ['animation', 'ANIMATION'], ['audio', 'AUDIO'], ['online', 'ONLINE'], ['testing', 'TESTING'], ['research', 'RESEARCH'], ['environment', 'ENVIRONMENT'], ['model', 'MODEL'], ['usage', 'USAGE']];
  add('SOURCE INFORMATION', SI_LABELS.map(([k, l]) => l + ': ' + String(si[k] || 'unknown').toUpperCase()));
  const Q = A.questions || {};
  const qa = (title, key) => add(title, (A[key] || []).map((a, i) => ((Q[key] || [])[i] ? String(Q[key][i]).toUpperCase() + ' ' : '') + String(a).toUpperCase()));
  qa('TESTING FEEDBACK', 'testingFeedback'); qa('ENGINE FEEDBACK', 'engineFeedback'); qa('PROMPT FEEDBACK', 'promptFeedback');
  return pages;
};
MT.scenes.about = {
  input: MT.MENU,
  enter() { this.pages = MT.aboutPages(); this.page = 0; },
  update(dt) {
    MT.frame(dt); if (frontIdle('about')) return; const n = this.pages.length;
    if (UI.nav('right') || UI.nav('tabR') || UI.nav('confirm')) { this.page = (this.page + 1) % n; MT.sfx('page'); }
    if (UI.nav('left') || UI.nav('tabL')) { this.page = (this.page + n - 1) % n; MT.sfx('page'); }
    const c = UI.clicked(); if (c) { this.page = (this.page + (c[0] > MT.game.W / 2 ? 1 : n - 1)) % n; MT.sfx('page'); }
    if (UI.nav('cancel')) goBack('title');
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const P = this.pages[this.page], cx = r.W / 2, w = Math.min(r.W - 16, 360), x = cx - w / 2;
      UI.title(g, r, P.title.length > 22 ? 'ABOUT & CREDITS' : P.title, 8);
      if (P.title.length > 22) TX(g, P.title, cx, 30, '#2ee6ff', { align: 'center' });
      TX(g, (this.page + 1) + ' / ' + this.pages.length, cx, 40, '#8a7a9a', { align: 'center', font: 'tiny' });
      UI.panel(g, x, 48, w, r.H - 78, { alpha: .9 });
      P.lines.forEach((s, i) => TX(g, s, x + 10, 56 + i * 11, '#fff7e8'));
      UI.promptBar(g, r, [['tabL', ''], ['tabR', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};
// ---------------- THE PRIZE RECAP (after each boss)
MT.scenes.recap = {
  input: MT.MENU, skippable: true,
  enter(d = {}) {
    this.ep = d.ep || 1; this.t = 0; this.i = 0; this.step = .9; this.shown = 0; this.done = false; this.fake = !!d.fake; this.left = false; this.mvp = null; this.doneT = 0;
    const run = MT.run; if (run) run.recaps++;
    MT.unlock(Math.min(3, this.ep + 1));
    this.cols = (d.fake ? MT.fakeRecap() : run.contestants).map(c => ({ c, list: c.prizes.filter(p => p.ep === this.ep || this.ep === 3 && p.ep === 4), total: 0, shownTotal: 0 }));
    this.queue = []; this.cols.forEach((col, k) => col.list.forEach(p => this.queue.push([k, p])));
    MT.music.play('recap', { fade: .5 }); MT.lines.say('PENNY', (this.ep === 3 ? MT.TEXT.recap.open3 : MT.TEXT.recap.open)[1], { prio: 3 });
    this.penny = MT.cfg.skipRigs ? null : MT.cast.penny;
  },
  update(dt) {
    MT.frame(dt); this.t += dt;
    const fast = UI.held('confirm') ? 4 : 1; if (UI.nav('confirm')) MT.lines.skip();
    for (const col of this.cols) col.shownTotal = Math.min(col.total, col.shownTotal + dt * Math.max(2000, col.total) * 1.5 * fast);
    if (this.t > 1.2 && !this.done) {
      this.step -= dt * fast;
      if (this.step <= 0) {
        if (this.shown < this.queue.length) { const [k, p] = this.queue[this.shown++]; this.cols[k].total += p.value; MT.sfx('bell'); MT.lines.say('PENNY', p.name + '! ' + p.line, { prio: 2 }); this.step = 1.6; }
        else { this.done = true; this.doneT = this.t; const mvp = this.cols.slice().sort((a, b) => b.c.cash - a.c.cash)[0]; if (mvp) this.mvp = mvp.c.name; const cl = MT.TEXT.recap.close[this.ep] || MT.TEXT.recap.close[1]; MT.lines.say(cl[0], cl[1], { prio: 3 }); MT.babble.crowd('applause', 1); }
      }
    }
    if (this.done && (this.t - this.doneT > 3.5 && !MT.lines.busy || UI.nav('confirm') && this.t - this.doneT > .5) && !this.left) { this.left = true; this.next(); }
  },
  next() {
    if (this.fake) return; const run = MT.run;
    if (this.ep < 3) { MT.game.go('play', { ep: this.ep + 1 }); return; }
    if (run.keys >= 5) { MT.game.go('cut', { id: 'green' }); return; }
    MT.game.go('ending', { kind: 'a' });
  },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2; UI.title(g, r, 'PRIZE RECAP', 8, '#ff8ad8'); TX(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[Math.min(3, this.ep)].title, cx, 30, '#2ee6ff', { align: 'center' });
      if (this.penny) { px.ell(g, 34, r.H - 36, 22, 6, '#ffcc33'); px.ell(g, 34, r.H - 37, 20, 5, '#5a1a6a'); this.penny.update(1 / 120, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: this.done ? 'cheer' : 'wave', expr: 'smile' }); this.penny.draw(g, 34, r.H - 38, MT.game.view); }
      const n = this.cols.length, cw = Math.min(110, (r.W - 80) / n), x0 = cx - cw * n / 2 + 20;
      this.cols.forEach((col, k) => {
        const x = x0 + k * cw, y = 42, c = col.c; UI.panel(g, x + 2, y, cw - 4, r.H - y - 52, { border: c.color, alpha: .85 });
        if (c.rig && !MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 6, y + 4, 20, { zoom: 2.6, bg: '#2a1446' });
        TX(g, c.name, x + 30, y + 6, c.color); TX(g, MT.money(col.shownTotal), x + 30, y + 15, '#ffcc33');
        let shownHere = 0; for (let q = 0; q < this.shown; q++) if (this.queue[q][0] === k) shownHere++;
        col.list.slice(0, shownHere).slice(-6).forEach((p, i) => { const yy = y + 30 + i * 16; px.sprite(g, MT.spr.icon(p.icon[0], p.icon[1], p.icon[2]), x + 6, yy); const nm = E.font.wrap(p.name, cw - 26, { font: 'tiny' }); TX(g, nm[0] + (nm.length > 1 ? '...' : ''), x + 20, yy, '#fff7e8', { font: 'tiny' }); TX(g, MT.money(p.value), x + 20, yy + 7, '#7ad88a', { font: 'tiny' }); });
        if (!col.list.length && this.done) TX(g, MT.TEXT.recap.none, x + cw / 2, y + 40, '#8a7a9a', { align: 'center', font: 'tiny' });
      });
      if (this.done && this.mvp) TX(g, MT.fill(MT.TEXT.recap.mvp, { NAME: this.mvp }), cx, r.H - 46, Math.floor(MT.game.real * 3) % 2 ? '#ffcc33' : '#ffffff', { align: 'center', scale: 2 });
      if (MT.lines.current) MT.ui.lowerThird(g, r); else UI.promptBar(g, r, [['confirm', 'SPEED UP']]);
    });
  }
};
MT.fakeRecap = () => [0, 1].map(i => { const c = new MT.Contestant(i, { look: i }); c.cash = 48000 + i * 13000; c.prizes = MT.PRIZES[1].slice(i * 2, i * 2 + 3).map(p => ({ name: p[0], value: p[1] * 3, icon: p[3], line: p[2], ep: 1 })); return c; });
// ---------------- GAME OVER, INITIALS, ENDINGS, CREDITS
MT.scenes.gameover = {
  input: MT.MENU, skippable: true,
  enter() { this.t = 0; MT.music.play(null); MT.music.sting('stGameOver'); MT.lines.sayAll(MT.TEXT.gameOver, { prio: 3 }); for (const c of (MT.run ? MT.run.contestants : [])) { c.state = 'play'; } },
  update(dt) { MT.frame(dt); this.t += dt; for (const c of MT.run ? MT.run.contestants : []) if (c.rig && !MT.cfg.skipRigs) c.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, down: 1, expr: 'wince' }); if (UI.nav('confirm') && this.t > .8) MT.lines.skip(); if (this.t > 2 && !MT.lines.busy || this.t > 14) MT.game.go('initials', {}); },
  draw(r) {
    r.sky(['#05020a', '#0a0414', '#140a24']);
    r.overlay(g => {
      const cx = r.W / 2; px.blend(g, .2, 'add', () => px.poly(g, [[cx - 4, 0], [cx + 4, 0], [cx + 70, r.H - 40], [cx - 70, r.H - 40]], '#fff4c0'));
      E.font.title(g, "AND THAT'S A WRAP!", cx, 24, { scale: 2, align: 'center', colors: ['#ff3344', '#ff8a5a'], outline: '#1a0a24' });
      (MT.run ? MT.run.contestants : []).forEach((c, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 40; if (c.rig && !MT.cfg.skipRigs) c.rig.draw(g, x, r.H - 60, MT.game.view); TX(g, MT.money(c.cash), x, r.H - 50, c.color, { align: 'center', font: 'tiny' }); });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.initials = {
  input: MT.MENU,
  enter(d = {}) {
    const run = MT.run; this.order = []; this.hi = null;
    const eligible = run && run.mode === 'arcade' && (MT.cfg.allowScores || !MT.devActive() && !run.devTouched);
    if (eligible) for (const c of run.contestants) if (MT.cab.qualifies(c.cash, 'show')) this.order.push(c);
    if (d.fake) this.order = [{ name: 'P1', cash: 123450, color: MT.COLORS.p[0], input: MT.game.input, slot: 0 }];
    this.k = -1; this.nextOne();
    MT.music.play('ending');
  },
  nextOne() {
    this.k++; const c = this.order[this.k];
    if (!c) { MT.game.go('scores', { hi: this.hi }); return; }
    MT.cab.enter(c.cash, 'show', name => { this.hi = { name, score: c.cash }; this.nextOne(); }, c.input || MT.game.input);
  },
  update(dt) { MT.frame(dt); MT.cab.update(dt); },
  draw(r) {
    UI.backdrop(r, MT.game.real); const c = this.order[this.k];
    if (c) { r.overlay(g => { TX(g, 'P' + (c.slot + 1) + ' ' + (c.name || ''), r.W / 2, 8, c.color, { align: 'center', scale: 2 }); }); MT.cab.draw(r); r.overlay(g => UI.promptBar(g, r, [['up', ''], ['down', 'LETTER'], ['confirm', 'NEXT']], c.input || MT.game.input)); }
  }
};
MT.scenes.ending = {
  input: MT.MENU, skippable: true,
  enter(d = {}) {
    this.kind = d.kind || 'a'; this.t = 0; this.step = 0; this.stinger = false; this.st2 = this.st3 = this.st4 = 0; MT.music.play('ending', { fade: .8 });
    this.lights = 8; const L = this.kind === 'b' ? MT.TEXT.endingB : MT.TEXT.endingA;
    MT.lines.say(L[0][0], L[0][1], { prio: 3, onDone: () => { this.step = 1; } });
    this.cs = MT.run ? MT.run.contestants : MT.fakeRecap();
  },
  update(dt) {
    MT.frame(dt); this.t += dt; const L = this.kind === 'b' ? MT.TEXT.endingB : MT.TEXT.endingA;
    for (const c of this.cs) if (c.rig && !MT.cfg.skipRigs) c.rig.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'cheer', expr: 'smile' });
    if (UI.nav('confirm')) MT.lines.skip();
    if (this.step === 1) { this.step = 2; this.st2 = this.t; MT.lines.say(L[1][0], L[1][1], { prio: 3, onDone: () => { this.step = 3; this.st3 = this.t; } }); if (this.kind === 'b') MT.babble.crowd('cheer', 1); }
    if (this.kind === 'b' && this.step >= 2) this.lights = Math.max(0, 8 - Math.floor((this.t - this.st2) * 1.5));
    if (this.step === 3 && this.kind === 'b' && this.t - this.st3 > 2.5 && !this.stinger) { this.stinger = true; MT.lines.say(L[2][0], L[2][1], { prio: 3, onDone: () => { this.step = 4; this.st4 = this.t; } }); }
    if (this.step === 3 && this.kind === 'a') { this.step = 4; this.st4 = this.t; }
    if (this.step === 4 && this.t - this.st4 > 3 || this.t > 40) MT.game.go('credits', {});
  },
  draw(r) {
    const b = this.kind === 'b';
    r.sky(b && this.lights === 0 ? ['#020104', '#050208', '#08040c'] : ['#0c0618', '#1c0c30', '#2a1446']);
    r.overlay(g => {
      const cx = r.W / 2;
      for (let i = 0; i < 8; i++) if (!b || i < this.lights) px.blend(g, .1, 'add', () => px.poly(g, [[r.W * (i + .5) / 8 - 3, 0], [r.W * (i + .5) / 8 + 3, 0], [r.W * (i + .5) / 8 + 30, r.H], [r.W * (i + .5) / 8 - 30, r.H]], '#fff4c0'));
      this.cs.forEach((c, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 44; if (c.rig && !MT.cfg.skipRigs) c.rig.draw(g, x, r.H - 64, MT.game.view); });
      if (b && this.step >= 2) { px.rect(g, cx + 80, r.H - 100, 30, 40, '#3a3a48'); px.disc(g, cx + 95, r.H - 84, 9, this.lights ? '#ff3344' : '#5a0a14'); TX(g, 'OFF', cx + 95, r.H - 70, '#fff7e8', { align: 'center', font: 'tiny' }); }
      if (!b && this.step >= 2 && MT.cast.robo && !MT.cfg.skipRigs) { MT.cast.robo.drawPortrait(g, r.W - 70, 40, 50, { zoom: 2.4, bg: '#140a24' }); TX(g, 'BEHIND THE CURTAIN...', r.W - 45, 94, '#8a7a9a', { align: 'center', font: 'tiny' }); }
      if (this.step >= 4) {
        const t1 = b ? 'MASH TV - CANCELLED.' : 'MASH TV WILL RETURN.', t2 = b ? 'THANKS FOR WATCHING.' : 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM';
        E.font.title(g, t1, cx, 30, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' }); TX(g, t2, cx, 56, '#2ee6ff', { align: 'center' });
        if (b) { UI.panel(g, cx - 90, 70, 180, 34, { border: '#2ee6ff' }); TX(g, 'CHANNEL 3,000', cx, 76, '#2ee6ff', { align: 'center' }); TX(g, 'TONIGHT: MASHED POTATOES!', cx, 88, '#fff7e8', { align: 'center' }); }
      }
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.credits = {
  input: MT.MENU, skippable: true,
  enter() { this.t = 0; MT.music.play('ending'); },
  update(dt) { MT.frame(dt); this.t += dt; if (this.t > 1 && (UI.nav('confirm') || UI.nav('cancel')) || this.t > 22) MT.game.go(MT.run && MT.run.mode === 'arcade' ? 'initials' : 'title', {}); },
  draw(r) {
    UI.backdrop(r, MT.game.real);
    r.overlay(g => {
      const cx = r.W / 2, y0 = r.H + 10 - this.t * 22;
      MT.TEXT.credits.forEach((s, i) => { const y = y0 + i * 16; if (y > -10 && y < r.H) { if (i === 0) MT.drawLogo(g, cx, y, 2, true); else TX(g, s, cx, y, i % 4 === 2 ? '#ffcc33' : '#fff7e8', { align: 'center', scale: s.length < 22 ? 2 : 1 }); } });
      UI.promptBar(g, r, [['confirm', 'SKIP']]);
    });
  }
};

// ===== 33-dev.js
// ---------------------------------------------------------------- dev mode: live sliders, cheats, actions, warps, spawns, debug overlays
MT.dev = (() => {
  const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
  const dbg = { hitboxes: false, ai: false, waves: false, stats: false, doors: false, camera: false };
  const pick = { give: 0, kind: 0, count: 0, where: 0, pickup: 0 };
  const GIVES = () => Object.keys(MT.WEAPONS).concat(Object.keys(MT.ADDONS));
  const COUNTS = [1, 5, 10], WHERES = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], PICKS = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'bomb', 'life'];
  const W = () => MT.Show.W, P1 = () => W() && W().contestants[0];
  const touched = () => { if (MT.run) MT.run.devTouched = true; };
  let confirmReset = 0, exportLine = '';
  const api = {
    freeze: true, tab: 0, i: 0, t: 0, dbg, scroll: 0, rects: [], tabRects: [],
    allowed() { return MT.run && MT.run.mode !== 'session' && MT.run.mode !== 'attract'; },
    open() { if (!api.allowed()) return false; MT.openOverlay('dev'); api.t = 0; return true; },
    close(silent) { if (MT.overlay.kind === 'dev') MT.closeOverlay(); if (!silent) MT.sfx('back'); },
    rows() {
      const tab = TABS[api.tab], R = [];
      if (tab === 'TUNING') {
        let grp = '';
        for (const d of MT.TDEF) { R.push({ label: (d[6] !== grp ? (grp = d[6]) + ': ' : '') + d[1], kind: 'slider', d, get: () => MT.T[d[0]], set: v => { MT.setTune(d[0], v); touched(); }, reset: () => MT.setTune(d[0], d[2]) }); }
        R.push({ label: confirmReset > 0 ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS', kind: 'action', act: () => { if (confirmReset > 0) { MT.resetTunes(); confirmReset = 0; MT.banner.show('TUNING RESET', { big: false }); } else confirmReset = 3; } });
        R.push({ label: 'EXPORT TUNING', kind: 'action', act: () => api.exportTuning() });
      } else if (tab === 'CHEATS') {
        const names = { god: 'GOD MODE (ALL CONTESTANTS)', infBombs: 'INFINITE SHOWSTOPPERS', oneHit: 'ONE-HIT KILLS', freeze: 'FREEZE ENEMIES', noclip: 'NO CLIP (P1)', autopilot: 'AUTOPILOT P1', botPartner: 'BOT PARTNER', muteHost: 'MUTE HOST CHATTER' };
        for (const k in MT.CHEATS) R.push({ label: names[k], kind: 'toggle', get: () => MT.CHEATS[k], set: v => api.cheat(k, v), reset: () => api.cheat(k, false) });
      } else if (tab === 'ACTIONS') {
        R.push({ label: 'FREEZE WHILE OPEN', kind: 'toggle', get: () => api.freeze, set: v => { api.freeze = v; } });
        R.push({ label: 'FRAME STEP (1/30 S)', kind: 'action', act: () => { MT.game.timeScale = MT.T.timeScale; for (let k = 0; k < 4; k++) MT.Show.update(1 / 120); } });
        R.push({ label: 'KILL ALL ENEMIES', kind: 'action', act: () => api.killAll() });
        R.push({ label: 'CLEAR THE ROOM', kind: 'action', act: () => api.clearRoom() });
        R.push({ label: 'NEXT ROOM (FIRST EXIT)', kind: 'action', act: () => api.nextRoom() });
        R.push({ label: 'RESTART THE ROOM', kind: 'action', act: () => api.warp(W().room.id) });
        R.push({ label: 'GIVE', kind: 'choice', get: () => GIVES()[pick.give], left: () => { pick.give = (pick.give + GIVES().length - 1) % GIVES().length; }, right: () => { pick.give = (pick.give + 1) % GIVES().length; }, act: () => api.give(GIVES()[pick.give]) });
        R.push({ label: '+1 LIFE', kind: 'action', act: () => { P1().lives++; touched(); } });
        R.push({ label: '+1 SHOWSTOPPER', kind: 'action', act: () => { P1().bombs = Math.min(3, P1().bombs + 1); touched(); } });
        R.push({ label: '+$100,000', kind: 'action', act: () => { P1().addCash(100000, W()); touched(); } });
        R.push({ label: '+1 GOLDEN KEY', kind: 'action', act: () => { MT.run.keys++; touched(); } });
        R.push({ label: 'MAX RATINGS', kind: 'action', act: () => { W().ratings.R = 99; touched(); } });
        R.push({ label: 'TRIGGER PRIME TIME', kind: 'action', act: () => { W().ratings.primeCd = 0; W().ratings.startPrime(W()); touched(); } });
        R.push({ label: 'TRIGGER A RATINGS STUNT', kind: 'action', act: () => { W().stunt(); touched(); } });
      } else if (tab === 'WARP') {
        for (const id of Object.keys(MT.ROOMS)) R.push({ label: id + ' ' + MT.ROOMS[id].name, kind: 'action', act: () => api.warp(id) });
        for (const s of ['cold', 'card1', 'card2', 'card3', 'recap1', 'recap2', 'recap3', 'continue', 'gameover', 'initials', 'endingA', 'endingB', 'credits', 'sessionCard']) R.push({ label: 'SCENE: ' + s.toUpperCase(), kind: 'action', act: () => api.warp(s) });
      } else if (tab === 'SPAWN') {
        const K = MT.KIND_LIST;
        R.push({ label: 'KIND', kind: 'choice', get: () => K[pick.kind], left: () => { pick.kind = (pick.kind + K.length - 1) % K.length; }, right: () => { pick.kind = (pick.kind + 1) % K.length; } });
        R.push({ label: 'COUNT', kind: 'choice', get: () => COUNTS[pick.count], left: () => { pick.count = (pick.count + 2) % 3; }, right: () => { pick.count = (pick.count + 1) % 3; } });
        R.push({ label: 'WHERE', kind: 'choice', get: () => WHERES[pick.where], left: () => { pick.where = (pick.where + WHERES.length - 1) % WHERES.length; }, right: () => { pick.where = (pick.where + 1) % WHERES.length; } });
        R.push({ label: 'SPAWN THEM', kind: 'action', act: () => api.spawn(K[pick.kind], COUNTS[pick.count], WHERES[pick.where]) });
        R.push({ label: 'PICKUP AT P1', kind: 'choice', get: () => PICKS[pick.pickup], left: () => { pick.pickup = (pick.pickup + PICKS.length - 1) % PICKS.length; }, right: () => { pick.pickup = (pick.pickup + 1) % PICKS.length; }, act: () => { const c = P1(); W().addPickup(PICKS[pick.pickup], c.x + 16, c.y); touched(); } });
      } else {
        const names = { hitboxes: 'HITBOXES', ai: 'AI TARGETS AND STATES', waves: 'WAVE TIMELINE', stats: 'STATS', doors: 'DOOR STATES', camera: 'CAMERA BOUNDS' };
        for (const k in dbg) R.push({ label: names[k], kind: 'toggle', get: () => dbg[k], set: v => { dbg[k] = v; } });
      }
      return R;
    },
    cheat(k, v) {
      MT.CHEATS[k] = !!v; touched();
      if (k === 'botPartner' && MT.run && W()) {
        const run = MT.run, has = run.contestants.find(c => c.devBot);
        if (v && !has && run.contestants.length < 4) { const c = new MT.Contestant(run.contestants.length, { look: run.contestants.length, ctl: 'bot' }); c.devBot = true; run.contestants.push(c); c.respawn(W()); }
        if (!v && has) { run.contestants.splice(run.contestants.indexOf(has), 1); }
      }
    },
    killAll() { const w = W(); if (!w) return; for (const e of w.enemies) if (!e.dead && !e.A.harmless) w.kill(e, P1(), {}); if (w.boss && !w.boss.dead) for (const p of w.boss.parts) { if (p.alive) { p.hp = 0; p.alive = false; } } if (w.boss) w.boss.die(w); touched(); },
    clearRoom() { const w = W(); if (!w) return; for (const s of w.scripts) s.cancel(); for (const d in w.arena.doors) w.arena.doors[d].queue.length = 0; w.allSpawned = true; api.killAll(); if (!w.room.boss) w.clearRoom(); touched(); },
    nextRoom() { const w = W(); if (!w) return; api.clearRoom(); const ex = Object.entries(w.room.exits || {}); if (ex.length) { w.exitDir = ex[0][0]; w.exitDest = ex[0][1]; w.result = 'exit'; w.setPhase('done'); } else if (w.room.boss) { w.result = 'boss'; w.setPhase('done'); } touched(); },
    give(id) { const c = P1(); if (c && W()) W().equip(c, id); touched(); },
    spawn(kind, n, where) {
      const w = W(); if (!w) return; touched();
      for (let i = 0; i < n; i++) {
        if (where === 'audience') w.spawnAudience(kind, i % 2 ? 'E' : 'W'); else if (where === 'drop') w.spawnDrop(kind);
        else if (where === 'reticle') { const m = MT.game.mouseGround(); const x = m ? clamp(m[0], 30, 338) : AR.cx, y = m ? clamp(m[1], 30, 210) : AR.cy; w.spawnAt(kind, x + i * 4, y); }
        else w.arena.queueSpawn(where, kind, 1, .2);
      }
    },
    warp(target, o = {}) {
      const g = MT.game; touched(); api.close(true);
      if (MT.ROOMS[target]) { if (!MT.run) MT.newRun({ mode: 'test' }); if (g.sceneName === 'play' && MT.Show.W) { MT.Show.begin(target, 'S', { noCard: true }); } else g.go('play', { room: target, noCard: true }); return; }
      const m = /^(card|recap)(\d)$/.exec(target);
      if (!MT.run) MT.newRun({ mode: 'test' });
      if (m && m[1] === 'card') { MT.run.epCardShown[+m[2]] = false; g.go('play', { room: MT.EPISODES[+m[2]].start }); return; }
      if (m && m[1] === 'recap') { g.go('recap', { ep: +m[2], fake: !MT.run.contestants.some(c => c.prizes.length) }); return; }
      if (target === 'cold') return g.go('cut', { id: 'cold' });
      if (target === 'continue') { if (g.sceneName !== 'play') { g.go('play', { room: '1-1', noCard: true }); MT.later(.5, () => { for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } }); } else for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } return; }
      if (target === 'gameover') return g.go('gameover', {});
      if (target === 'initials') return g.go('initials', { fake: true });
      if (target === 'endingA') return g.go('ending', { kind: 'a' });
      if (target === 'endingB') return g.go('ending', { kind: 'b' });
      if (target === 'credits') return g.go('credits', {});
      if (target === 'sessionCard') return g.go('sessionCard', { fake: true });
    },
    exportTuning() { const o = {}; for (const d of MT.tunesChanged()) o[d[0]] = MT.T[d[0]]; exportLine = JSON.stringify(o); console.log('MASH TV tuning: ' + exportLine); MT.banner.show('TUNING EXPORTED TO THE CONSOLE', { big: false }); },
    update(dt) {
      api.t += dt; confirmReset = Math.max(0, confirmReset - dt);
      const rows = api.rows(); api.i = clamp(api.i, 0, rows.length - 1);
      if (MT.ui.nav('tabR')) { api.tab = (api.tab + 1) % TABS.length; api.i = 0; MT.sfx('page'); }
      if (MT.ui.nav('tabL')) { api.tab = (api.tab + TABS.length - 1) % TABS.length; api.i = 0; MT.sfx('page'); }
      if (MT.ui.nav('down')) { api.i = (api.i + 1) % rows.length; MT.sfx('blip'); }
      if (MT.ui.nav('up')) { api.i = (api.i + rows.length - 1) % rows.length; MT.sfx('blip'); }
      const p = MT.ui.pointer(); if (MT.ui.ptrMoved() && p) api.rects.forEach((rc, k) => { if (rc && MT.ui.inRect(p, rc)) api.i = k; });
      const row = rows[api.i], adj = d => { if (row.kind === 'slider') { const D = row.d; row.set(row.get() + d * D[5]); MT.sfx('slider'); } else if (row.kind === 'choice') { (d > 0 ? row.right : row.left)(); MT.sfx('slider'); } else if (row.kind === 'toggle' && d) { row.set(!row.get()); MT.sfx('slider'); } };
      if (MT.ui.nav('left')) adj(-1); if (MT.ui.nav('right')) adj(1);
      const wh = MT.ui.takeWheel(); if (wh) adj(-wh);
      const c = MT.ui.clicked();
      if (c) {
        api.tabRects.forEach((rc, k) => { if (MT.ui.inRect(c, rc)) { api.tab = k; api.i = 0; MT.sfx('page'); } });
        api.rects.forEach((rc, k) => { if (rc && MT.ui.inRect(c, rc)) { api.i = k; const R = api.rows()[k]; if (R.kind === 'slider' && api.bar && api.bar[k]) { const b = api.bar[k], D = R.d; R.set(D[3] + (D[4] - D[3]) * clamp((c[0] - b[0]) / b[1], 0, 1)); } else if (R.kind === 'toggle') R.set(!R.get()); else if (R.act) R.act(); } });
      }
      if (MT.ui.nav('confirm')) { if (row.kind === 'toggle') row.set(!row.get()); else if (row.act) row.act(); MT.sfx('bell'); }
      if (MT.ui.nav('reset') && row.reset) { row.reset(); MT.sfx('back'); }
      if (MT.ui.nav('cancel')) api.close();
    },
    draw(r) {
      r.overlay(g => {
        const T = MT.ui.T, w = Math.max(200, Math.round(r.W * .45)), x = r.W - w, y = 0, h = r.H;
        px.blend(g, .9, 'normal', () => px.rect(g, x, y, w, h, '#0e0618')); px.rect(g, x, 0, 2, h, '#ff8a20');
        T(g, 'DEV MODE', x + 8, 4, '#ff8a20'); T(g, api.freeze ? 'FROZEN' : 'LIVE', x + 70, 4, api.freeze ? '#2ee6ff' : '#22ff66');
        api.tabRects = []; let tx = x + 6;
        TABS.forEach((t, k) => { const tw = E.font.width(t, { font: 'tiny' }) + 6; api.tabRects.push([tx, 14, tw, 10]); px.rect(g, tx, 14, tw, 10, k === api.tab ? '#ff8a20' : '#2a1446'); T(g, t, tx + 3, 16, k === api.tab ? '#14101c' : '#c8c0e0', { font: 'tiny', shadow: false }); tx += tw + 2; });
        const rows = api.rows(), vis = Math.max(6, Math.floor((h - 60) / 20)); api.scroll = clamp(api.scroll, api.i - vis + 1, api.i); api.scroll = clamp(api.scroll, 0, Math.max(0, rows.length - vis));
        api.rects = []; api.bar = {};
        for (let k = api.scroll; k < Math.min(rows.length, api.scroll + vis); k++) {
          const R = rows[k], yy = 30 + (k - api.scroll) * 20, on = k === api.i; api.rects[k] = [x + 4, yy, w - 8, 18];
          px.rect(g, x + 4, yy, w - 8, 18, on ? '#3a1a4c' : '#180c26'); if (on) MT.ui.bulbs(g, x + 3, yy - 1, w - 6, 20, api.t, '#ff8a20', '#4a2a10');
          T(g, R.label, x + 8, yy + 2, on ? '#ffcc33' : '#fff7e8', { font: R.label.length > 28 ? 'tiny' : undefined });
          if (R.kind === 'slider') { const D = R.d, v = R.get(), f = (v - D[3]) / (D[4] - D[3]), bx = x + 8, bw = w - 70; api.bar[k] = [bx, bw]; px.rect(g, bx, yy + 12, bw, 3, '#2a2040'); px.rect(g, bx, yy + 12, Math.round(bw * f), 3, v === D[2] ? '#2ee6ff' : '#ff8a20'); T(g, String(v), x + w - 10, yy + 9, v === D[2] ? '#c8c0e0' : '#ff8a20', { align: 'right' }); }
          else if (R.kind === 'toggle') T(g, R.get() ? 'ON' : 'OFF', x + w - 10, yy + 5, R.get() ? '#22ff66' : '#8a7a9a', { align: 'right' });
          else if (R.kind === 'choice') T(g, '← ' + String(R.get()).toUpperCase() + ' →', x + w - 10, yy + 5, '#2ee6ff', { align: 'right' });
        }
        if (exportLine && TABS[api.tab] === 'TUNING') T(g, exportLine.slice(0, 60) || '{}', x + 6, h - 34, '#22ff66', { font: 'tiny' });
        const I = MT.ui.lastI(); MT.glyph.prompt(g, x + 6, h - 22, [['tabR', 'TAB'], ['confirm', 'SET'], ['reset', 'RESET'], ['cancel', 'CLOSE']], I, { scale: 1 });
      });
    },
    drawDebug(r, Wd) {
      if (!Wd || !Object.values(dbg).some(Boolean)) return;
      r.overlay(g => {
        const T = MT.ui.T, P = (x, y, z = 0) => r.w(x, y, z).map((v, i) => v - (i ? r.iy : r.ix));
        if (dbg.hitboxes) { const ring = (x, y, rad, c) => { for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2, p = P(x + Math.cos(an) * rad, y + Math.sin(an) * rad); px.dot(g, p[0], p[1], c); } };
          for (const c of Wd.contestants) ring(c.x, c.y, c.r, '#22ff66'); for (const e of Wd.enemies) ring(e.x, e.y, e.r, '#ff3344'); for (const b of Wd.fShots.list) ring(b.x, b.y, b.r, '#ffcc33'); for (const b of Wd.pShots.list) ring(b.x, b.y, b.r, '#2ee6ff');
          if (Wd.boss) for (const p of Wd.boss.parts) if (p.alive) { const [x, y] = Wd.boss.partPos(p); ring(x, y, p.r, p.open ? '#ff8a20' : '#5a5a5a'); } }
        if (dbg.ai) for (const e of Wd.enemies) { const p = P(e.x, e.y, 30); T(g, e.kind + ':' + e.state, p[0], p[1], '#ffcc33', { font: 'tiny', align: 'center' }); const t = Wd.target(e); if (t) { const q = P(t.x, t.y); px.line(g, P(e.x, e.y)[0], P(e.x, e.y)[1], q[0], q[1], '#ff334466'); } }
        let y = 40; const L = s => { T(g, s, 6, y, '#22ff66', { font: 'tiny' }); y += 7; };
        if (dbg.waves) { L('PHASE ' + Wd.phase + ' ' + Wd.phaseT.toFixed(1)); L('WAVE ' + (Wd.waveIdx + 1) + '/' + Wd.wavesTotal + ' ALIVE ' + Wd.alive() + ' SPAWNED-ALL ' + Wd.allSpawned); }
        if (dbg.stats) { const s = MT.game.stats; L('FPS ' + MT.game.fps + ' STEPS ' + s.steps + ' ITEMS ' + s.items); L('ENEMIES ' + Wd.enemies.length + ' BULLETS ' + (Wd.pShots.list.length + Wd.fShots.list.length) + ' PICKUPS ' + Wd.pickups.length); }
        if (dbg.doors) for (const d in Wd.arena.doors) { const D = Wd.arena.doors[d]; L(d + ' ' + D.state + ' Q' + D.queue.length); }
        if (dbg.camera) { const b = P(AR.x0, AR.y0), b2 = P(AR.x1, AR.y1); px.rect(g, b[0], b[1], b2[0] - b[0], 1, '#2ee6ff'); px.rect(g, b[0], b2[1], b2[0] - b[0], 1, '#2ee6ff'); L('ZOOM ' + MT.game.zoom.toFixed(2)); }
      });
    }
  };
  return api;
})();

// ===== 34-cutscenes.js
// ---------------------------------------------------------------- cutscenes: the Cold Open and the Green Room's door (game.script sequences on the stage)
MT.cut = {
  stage(contestants) {   // a World used as a set: the studio, the crowd, the jumbotron
    const W = new MT.World({ room: { id: 'STAGE', name: 'LIVE FROM STUDIO 9', ep: 1, set: 'studio' }, contestants: contestants || [], entry: 'S', ratings: new MT.Ratings(), mode: 'cut', intro: false });
    W.ratings.R = 70;
    (contestants || []).forEach((c, k, a) => { c.x = AR.cx + (k - (a.length - 1) / 2) * 30; c.y = 170; c.state = 'play'; c.facing = -Math.PI / 2; c.z = 0; });
    return W;
  },
  lance: { x: AR.cx, y: -20, pose: 'wave' }
};
MT.scenes.cut = {
  input: MT.MENU, skippable: true, camera: { zoom: false },
  enter(d = {}) {
    this.id = d.id || 'cold'; this.t = 0; this.done = false; this.hold = 0;
    const g = MT.game; g.lights.enabled = true; g.lights.ambient = .3;
    this.W = MT.cut.stage(MT.run ? MT.run.contestants : []); MT.cast.build();
    this.L = { x: AR.cx, y: -20, vx: 0, vy: 0 }; this.lanceOn = this.id === 'cold';
    MT.music.play(this.id === 'cold' ? 'theme' : 'recap', { fade: .5 });
    const self = this;
    this.sc = g.script(function* () {
      if (self.id === 'cold') {
        yield 1; MT.babble.crowd('murmur', .4);
        for (const [sp, text] of MT.TEXT.cold) {
          if (sp === 'CONTESTANTS') { for (const c of self.W.contestants) { const bio = MT.TEXT.bios[c.look % 4]; let done = false; MT.lines.say('P' + (c.slot + 1), c.name + '! ' + bio, { prio: 3, onDone: () => { done = true; } }); c.cheer = true; yield () => done; c.cheer = false; } continue; }
          let done = false; MT.lines.say(sp, text, { prio: 3, vars: { N: self.W.contestants.length }, onDone: () => { done = true; } });
          if (sp === 'ANNC') { self.logo = true; MT.babble.crowd('cheer', 1); MT.game.particles && !MT.game.headless && MT.game.particles.bits(-10, 120, 30, 40, ['#ff2e88', '#ffcc33', '#2ee6ff']); }
          if (sp === 'LANCE' && !self.walked) { self.walked = true; MT.sfx('rollup'); }
          yield () => done;
        }
      } else {
        let done = false; MT.lines.sayAll(MT.TEXT.greenOpen, { prio: 3, onDone: () => { done = true; } }); yield () => done;
      }
      yield .4; self.finish();
    });
  },
  finish() {
    if (this.done) return; this.done = true; MT.lines.clear();
    if (this.id === 'cold') MT.game.go('play', { ep: 1 }); else MT.game.go('play', { room: 'GR', noCard: true });
  },
  exit() { if (this.W) this.W.dispose(); for (const c of (MT.run ? MT.run.contestants : [])) c.cheer = false; },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (UI.held('confirm') || UI.held('start')) { this.hold += dt; if (this.hold > .6) this.finish(); } else this.hold = 0;
    if (this.walked && this.L.y < 70) { this.L.vy = 40; this.L.y += 40 * dt; } else this.L.vy = 0;
    const lr = MT.cast.lance; if (lr && !MT.cfg.skipRigs && this.lanceOn) { lr.update(dt, { x: this.L.x, y: this.L.y, z: 0, vx: 0, vy: this.L.vy, facing: Math.PI / 2, pose: this.L.vy ? undefined : ['wave', 'hips', 'cheer'][Math.floor(this.t / 1.5) % 3], expr: MT.lines.current && MT.lines.current.speaker === 'LANCE' ? 'shout' : 'smile' }); }
    for (const c of this.W.contestants) c.pose(dt);
  },
  draw(r) {
    const W = this.W; W.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0);
    W.draw(r);
    const tn = MT.game.time;
    for (let i = 0; i < 3; i++) { const a = tn * .8 + i * 2.1; MT.game.lights.add(AR.cx + Math.cos(a) * 120, AR.cy + Math.sin(a * 1.2) * 70, 0, 70, .8, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][i] }); }
    if (this.lanceOn && this.walked && MT.cast.lance && !MT.cfg.skipRigs) { r.shadow(this.L.x, this.L.y, 7, .5); r.actor(this.L.x, this.L.y, 0, (g, ox, oy) => MT.cast.lance.draw(g, ox, oy, r.view)); MT.game.lights.add(this.L.x, this.L.y, 0, 50, 1, { color: '#fff4c0' }); }
    r.overlay(g => {
      if (this.logo) MT.drawLogo(g, r.W / 2, 16, 2, true);
      if (MT.lines.current) MT.ui.lowerThird(g, r);
      MT.ui.T(g, 'HOLD', r.W - 72, 4, '#8a7a9a', { font: 'tiny' }); MT.glyph.draw(g, r.W - 52, 2, 'confirm', MT.ui.lastI()); MT.ui.T(g, 'SKIP', r.W - 30, 4, '#8a7a9a', { font: 'tiny' });
    });
  }
};

// ===== 40-bot.js
// ---------------------------------------------------------------- the bot: a potential-field contestant (attract mode, tests, the dev bot partner)
MT.bot = {
  intent(c, W, o = {}) {
    const it = MT.NOINTENT(); if (!W) return it;
    if (c.state === 'out') { it.start = o.cont !== false; return it; }
    if (c.state !== 'play') return it;
    c._bot = c._bot || { t: 0, wander: MT.Rr(0, 6.28, 'ai'), boatT: 0 }; const B = c._bot; B.t += W.lastDt;
    let fx = 0, fy = 0;
    // repelled by foes, bullets and hazards
    let near60 = 0, near120 = 0, best = null, bd = 1e9;
    for (const e of W.enemies) {
      if (e.dead || e.A.harmless) continue;
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d < 60 && e.counted) near60++; if (d < 120 && e.counted) near120++;
      if (!e.entering && !e.leap && (e.counted || e.kind === 'crate' || e.kind === 'lock' || e.kind === 'seg' || e.kind === 'mime') && d < bd) { bd = d; best = e; }
      const rr = e.kind === 'mime' ? 60 : e.A.big ? 90 : 70;
      if (d < rr && e.A.contact !== 0 || e.kind === 'mime' && d < 50) { const k = (rr - d) / rr * (e.kind === 'brute' && e.state === 'charge' ? 4 : 1.6); fx += dx / d * k; fy += dy / d * k; }
    }
    let danger = false;
    for (const b of W.fShots.list) {
      if (b.dead) continue;
      const tx = b.grav ? b.tx : b.x + b.vx * .3, ty = b.grav ? b.ty : b.y + b.vy * .3; if (tx === undefined) continue;
      const dx = c.x - tx, dy = c.y - ty, d = Math.hypot(dx, dy) || 1;
      if (d < 36) { const k = (36 - d) / 36 * 2.2; fx += dx / d * k; fy += dy / d * k; }
      if (!b.grav) { const rx = b.x - c.x, ry = b.y - c.y, vv = b.vx * b.vx + b.vy * b.vy || 1, tt = -(rx * b.vx + ry * b.vy) / vv; if (tt > 0 && tt < .25) { const mx = rx + b.vx * tt, my = ry + b.vy * tt; if (mx * mx + my * my < 100) danger = true; } }
    }
    const vt = W.arena.hazards.vents; if (vt) for (const v of vt.list) if (v.fire > 0 || v.tele > 0) { const dx = c.x - v.x, dy = c.y - v.y, d = Math.hypot(dx, dy) || 1; if (d < 30) { fx += dx / d * 2.5; fy += dy / d * 2.5; } }
    for (const s of W.arena.splats) { const d = MT.dist(c, s); if (d < 18) { fx += (c.x - s.x) / (d || 1); fy += (c.y - s.y) / (d || 1); } }
    if (W.boss && !W.boss.dead) { const bx = W.boss.x, by = W.boss.y, d = Math.hypot(c.x - bx, c.y - by) || 1; if (d < 90) { fx += (c.x - bx) / d * 2; fy += (c.y - by) / d * 2; } if (W.boss.mic) { const m = W.boss.mic, dm = Math.hypot(c.x - m.x, c.y - m.y) || 1; if (dm < 50) { fx += (c.x - m.x) / dm * 3; fy += (c.y - m.y) / dm * 3; } } }
    // attracted to pickups, the room centre, the chosen exit
    let pk = null, pd = 1e9;
    for (const p of W.pickups) { if (p.dead || p.z > 20) continue; const d = MT.dist(c, p) / (p.kind === 'key' || p.kind === 'cap' || p.kind === 'statue' ? 3 : p.kind === 'prize' ? 2 : 1); if (d < pd) { pd = d; pk = p; } }
    if (pk && pd < 160) { const d = MT.dist(c, pk) || 1; fx += (pk.x - c.x) / d * 1.2; fy += (pk.y - c.y) / d * 1.2; }
    const cxp = AR.cx + Math.cos(B.wander + B.t * .4) * 40, cyp = AR.cy + 30 + Math.sin(B.wander + B.t * .5) * 30;
    { const d = Math.hypot(cxp - c.x, cyp - c.y) || 1; const k = Math.min(1, d / 120) * .7; fx += (cxp - c.x) / d * k; fy += (cyp - c.y) / d * k; }
    if (W.phase === 'exit' || W.phase === 'leaving') {
      const dir = this.pickExit(W, o);
      if (dir) { const P = AR.doors[dir]; const tx = P.x - P.nx * 30, ty = P.y - P.ny * 30; const d = Math.hypot(tx - c.x, ty - c.y) || 1; const pull = (pk && pd < 40) ? 1 : 3; fx = (tx - c.x) / d * pull + fx * .2; fy = (ty - c.y) / d * pull + fy * .2; }
    }
    const L = Math.hypot(fx, fy); if (L > .05) it.move = [fx / Math.max(1, L), fy / Math.max(1, L)];
    // aim: the nearest foe or a boss part, leading it
    let tgt = best && { x: best.x + (best.vx || 0) * .15, y: best.y + (best.vy || 0) * .15 };
    if (W.boss && W.boss.introDone && !W.boss.dead && !W.boss.away) {
      const ps = W.boss.parts.filter(p => W.boss.hittable(p)); let pbest = null, pdist = 1e9;
      const pri = p => (p.armor && (typeof p.armor === 'function' ? p.armor.call(W.boss) : p.armor) < .3 ? 400 : 0);
      for (const p of ps) { const [x, y] = W.boss.partPos(p), d = Math.hypot(x - c.x, y - c.y) + pri(p); if (d < pdist) { pdist = d; pbest = [x, y]; } }
      if (pbest && (!tgt || pdist < bd + 40)) tgt = { x: pbest[0], y: pbest[1] };
    }
    if (tgt) { it.aim = Math.atan2(tgt.y - c.y, tgt.x - c.x); it.fire = true; } else { it.aim = c.aim; it.fire = false; }
    if (danger && c.slideCd <= 0 && MT.R('ai') < .6) it.slide = true;
    const bombAt = o.bombAt || 25;
    if (c.bombs > 0 && near120 >= bombAt && !o.noBomb) it.bomb = true;
    if (o.boat !== false && near60 >= 3 && c.hp >= MT.maxHp() && !danger && c.boatCd <= 0 && near60 < 8) it.showboat = true;
    return it;
  },
  pickExit(W, o) {
    const doors = Object.keys(W.arena.doors).filter(d => W.arena.doors[d].state === 'exit'); if (!doors.length) return null;
    if (o.route) { const want = o.route.find(id => doors.some(d => W.arena.doors[d].dest === id)); if (want) return doors.find(d => W.arena.doors[d].dest === want); }
    if (o.exit && doors.includes(o.exit)) return o.exit;
    return doors.find(d => d === 'N') || doors[0];
  }
};

// ===== 41-attract.js
// ---------------------------------------------------------------- the attract mode: the real game played by cheating bots, reel by reel
MT.attract = {
  reel: -1, t: 0, played: [],
  next() {
    this.reel = (this.reel + 1) % MT.REELS.length; this.t = 0; this.done = {}; this.played.push(this.reel);
    const R = MT.REELS[this.reel]; MT.lines.clear(); MT.banner.clear();
    if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; }
    if (this.stage) { this.stage.dispose(); this.stage = null; }
    if (R.kind === 'room') {
      MT.newRun({ mode: 'attract', seed: R.seed, players: [{ slot: 0, look: 0, ctl: 'bot', botOpts: { boat: !!R.boat, noBomb: true } }, { slot: 1, look: 2, ctl: 'bot', botOpts: { boat: !!R.boat, noBomb: true } }] });
      MT.run.introduced = Object.fromEntries(Object.keys(MT.TEXT.intros).map(k => [k, true]));
      MT.Show.onRoomDone = () => true;   // the reel ends by time: a boss's death or an exit never leaves the attract mode
      const W = MT.Show.begin(R.room, 'S', { noCard: true });
      MT.music.play(R.room.endsWith('B') ? 'bossShowdown' : (MT.EPISODES[MT.ROOMS[R.room].ep] || MT.EPISODES[1]).song, { fade: .3 });
      for (const c of W.contestants) { if (R.weapon) W.equip(c, c.slot === 1 && R.weapon2 ? R.weapon2 : R.weapon); if (R.addon) W.equip(c, c.slot === 1 && R.addon2 ? R.addon2 : R.addon); c.bombs = 3; }
      W.phase = 'intro'; W.phaseT = 1.5;
      if (R.prime) MT.later(R.prime, () => { if (MT.Show.W === W) { W.ratings.primeCd = 0; W.ratings.startPrime(W); } });
    } else if (R.kind === 'cold') {
      MT.run = null; this.stage = MT.cut.stage([]); MT.music.play('theme', { fade: .3 });
      MT.lines.say('ANNC', MT.TEXT.cold[0][1], { prio: 3 });
    } else if (R.kind === 'recap') { this.recap = MT.fakeRecap(); MT.music.play('recap', { fade: .3 }); }
    else { MT.music.play('theme', { fade: .3 }); }
    if (R.cap) MT.lines.say('ANNC', MT.TEXT.captions[R.cap], { prio: 3 });
  },
  update(dt) {
    const R = MT.REELS[this.reel]; this.t += dt;
    if (R.kind === 'room') {
      const W = MT.Show.W; if (!W) return;
      if (W.phase === 'done') { W.phase = 'exit'; }
      MT.Show.update(dt);
      if (!MT.Show.W) return;
      const B = W.boss;
      if (R.bossPhase && B && B.introDone !== true) { B.skipIntro(); }
      if (R.bossPhase && B && !this.done.bp) { this.done.bp = true; for (const id of ['armL', 'armR']) { const p = B.part(id); if (p) { p.hp = 0; p.alive = false; } } B.part('body').hp *= .6; B.setPhase(R.bossPhase); }
      if (R.forceSegs && B && !this.done.fs) { this.done.fs = true; B.forced = R.forceSegs.slice(); if (!B.introDone) B.skipIntro(); }
      if (R.forceKey && this.t > R.forceKey && !this.done.key) { this.done.key = true; for (const e of W.enemies) if (e.kind === 'mime') W.kill(e, W.contestants[0]); }
      if (R.bomb && this.t > R.bomb && !this.done.bomb) { this.done.bomb = true; W.showstopper(W.contestants[1], true); }
      if (R.lanceMic && B && !this.done.mic) { this.done.mic = true; if (!B.introDone) B.skipIntro(); B.forcePat = 'mic'; }
      if (R.network && B && this.t > R.network && !this.done.net) { this.done.net = true; const p = B.part('podium'); if (p) p.hp = 0; }
      if (W.phase === 'exit' && W.phaseT > 3) { /* keep the bots fighting on: the reel ends by time */ }
    } else if (R.kind === 'cold') { MT.cast.lance && !MT.cfg.skipRigs && MT.cast.lance.update(dt, { x: AR.cx, y: 70, z: 0, facing: Math.PI / 2, pose: 'wave', expr: 'shout' }); }
    if (this.t >= R.dur) this.next();
  },
  draw(r) {
    const R = MT.REELS[this.reel];
    if (R.kind === 'room' && MT.Show.W) MT.Show.draw(r);
    else if (R.kind === 'cold' && this.stage) { this.stage.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0); this.stage.draw(r); if (MT.cast.lance && !MT.cfg.skipRigs) { r.shadow(AR.cx, 70, 7, .5); r.actor(AR.cx, 70, 0, (g, ox, oy) => MT.cast.lance.draw(g, ox, oy, r.view)); } r.overlay(g => MT.drawLogo(g, r.W / 2, 20, 2, true)); }
    else if (R.kind === 'recap') { MT.ui.backdrop(r, MT.game.real); r.overlay(g => { MT.ui.title(g, r, 'BIG PRIZES!', 14, '#ff8ad8'); this.recap.forEach((c, k) => c.prizes.forEach((p, i) => { const x = r.W / 2 - 120 + k * 130, y = 50 + i * 26; MT.ui.panel(g, x, y, 120, 22, { alpha: .85, border: c.color }); px.sprite(g, MT.spr.icon(p.icon[0], p.icon[1], p.icon[2]), x + 4, y + 5); MT.ui.T(g, p.name.slice(0, 18), x + 20, y + 4, '#fff7e8', { font: 'tiny' }); MT.ui.T(g, MT.money(p.value), x + 20, y + 12, '#7ad88a', { font: 'tiny' }); })); }); }
    else { MT.ui.backdrop(r, MT.game.real); MT.drawScores(r); }
    r.overlay(g => {
      const T = MT.ui.T; MT.drawLogo(g, 34, 6, 1, true);
      T(g, 'DEMO PLAY', r.W - 8, 6, '#ff2e88', { align: 'right' });
      if (Math.floor(MT.game.real * 2) % 2) { const I = MT.ui.lastI(); T(g, MT.touch.only ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 14, '#ffcc33', { align: 'center', scale: 1 }); }
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.attract = {
  input: MT.MENU, camera: { zoom: false },
  enter(d = {}) { this.from = d.from || 'title'; MT.attract.reel = -1; MT.attract.played = []; MT.attract.next(); this.t = 0; const g = MT.game; g.lights.enabled = true; if (g.audio) g.audio.duck(true); },
  exit() { MT.Show.onRoomDone = null; if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; } if (MT.attract.stage) { MT.attract.stage.dispose(); MT.attract.stage = null; } MT.run = null; MT.lines.clear(); MT.banner.clear(); if (MT.game.audio) MT.game.audio.duck(false); },
  update(dt) {
    MT.frame(dt); this.t += dt;
    if (this.t > .1 && MT.idle.fired) { MT.game.go(MT.touch.only ? 'title' : this.from === 'lobby' ? 'title' : this.from, {}, { fade: 0 }); return; }
    MT.attract.update(dt);
  },
  draw(r) { MT.attract.draw(r); }
};

// ===== 50-net.js
// ---------------------------------------------------------------- AI Hub sessions (Session Protocol v1, shared-world): the host runs the world, clients mirror it
// Code tables live here only.
const KCODE = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'seg', 'brute', 'crate', 'lock', 'paparazzi'];
const BCODE = ['orb', 'shard', 'beam', 'tomato', 'shell', 'butter', 'gravy', 'coin', 'card', 'static', 'tot', 'bolt', 'kernel', 'rocket', 'bag'];
const PCODE = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'cap', 'bomb', 'life', 'statue'];
const WCODE = ['blaster', 'spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
const SCODE = ['play', 'walkin', 'dead', 'drop', 'out', 'gone'];
const ECODE = ['die', 'boom', 'pop', 'splat', 'hurt', 'death', 'cash', 'prize', 'keySession', 'powerup', 'bomb', 'showboat', 'clear', 'exits', 'wave', 'prime', 'primeEnd', 'stunt', 'bossIntro', 'bossDie', 'bossBurst', 'partDown', 'armOff', 'mashyArms', 'mashyMad', 'crash', 'roar', 'respawn', 'keyDrop', 'exitChosen', 'hurry', 'multi', 'mash', 'crate', 'spawn'];
const STCODE = ['move', 'fuse', 'tele', 'flare', 'aim', 'rear', 'lunge', 'stun', 'charge', 'burst'];
const q = v => Math.round(v);
MT.net = {
  hub: null, active: false, info: null, role: null, me: null, ended: false, endReason: null, left: null, card: null, started: false,
  snaps: [], lastSnap: null, seenSeq: 0, sendT: 0, ceQ: [], ceT: 0, roomSeq: 0, over: null, finished: false, finishAt: null, remote: {}, standings: null,
  isHostSim(c) { return !this.active || this.role === 'host' && c.ctl === 'local' || this.role === 'client' && c.ctl === 'local'; },
  time() { return this.hub && this.hub.time ? this.hub.time() : 0; },
  async connect() {
    this.hub = this.hub || (typeof window !== 'undefined' ? window.AIHub : null);
    if (!this.hub || !this.hub.active) return null;
    let info = null; try { info = await this.hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) return null;
    this.active = true; this.info = info; this.me = info.me;
    this.role = info.server ? 'server' : info.isHost ? 'host' : 'client';
    const H = this.hub;
    H.on('card', c => { this.card = c; });
    H.on('start', s => { this.started = true; this.startIn = s && s.in; });
    H.on('message', (d, from) => this.onMessage(d, from));
    H.on('leave', e => this.onLeave(e));
    H.on('time-up', () => this.onTimeUp());
    H.on('end', e => this.onEnd(e));
    return info;
  },
  // ---------------- the round's world
  buildRun() {
    const info = this.info, me = info.me, g = MT.game;
    const players = info.players.map((p, i) => ({ slot: i, id: p.id, look: i % 4, name: MT.safeName(p.name), color: p.color || MT.COLORS.p[i % 4],
      input: p.id === me ? g.input : null, ctl: p.id === me ? 'local' : this.role === 'client' ? 'mirror' : 'remote' }));
    const run = MT.newRun({ mode: 'session', diff: 'CONTESTANT', seed: (info.seed >>> 0) || 7, players });
    run.contestants.forEach((c, i) => { c.id = players[i].id; c.named = true; });
    return run;
  },
  startPlay() {
    this.buildRun();
    if (this.role === 'client') { this.mirror('L1', 'S'); }
    else { MT.Show.onRoomDone = W => this.hostRoomDone(W); MT.Show.begin('L1', 'S', { noCard: true }); this.sendRoom(); }
  },
  hostRoomDone(W) {
    if (W.result === 'exit') { MT.Show.begin(W.exitDest, AR.opposite[W.exitDir], { static: true, noCard: true }); this.sendRoom(); return true; }
    if (W.result === 'boss' || W.result === 'end') { if (!this.finishAt) this.finishAt = MT.game.real + .1; MT.Show.state = 'idle'; return true; }
    return false;
  },
  sendRoom() { const W = MT.Show.W; this.roomSeq++; this.send({ t: 'room', rm: this.roomSeq, id: W.room.id, entry: W.entry }, true); },
  send(d, reliable) { if (this.ended || !this.hub) return false; try { return this.hub.send(d, { reliable: !!reliable }); } catch (e) { return false; } },
  // ---------------- host: snapshots, remote contestants, client events
  snapshot() {
    const W = MT.Show.W, R = W.ratings, run = MT.run;
    let dr = 0; ['N', 'E', 'S', 'W'].forEach((d, i) => { const s = W.arena.doors[d].state; dr |= (s === 'exit' ? 3 : s === 'open' || s === 'opening' ? 1 : s === 'closing' ? 2 : 0) << (i * 2); });
    const P = W.contestants.map(c => [c.id, q(c.x), q(c.y), q(c.aim * 100), (c.firing ? 1 : 0) | (c.slideT > 0 ? 2 : 0) | (c.boat > 0 ? 4 : 0) | (c.invuln > 0 ? 8 : 0), WCODE.indexOf(c.wpn), q(c.wpnT), c.hp, c.lives, q(c.cash), c.bombs, c.kills, SCODE.indexOf(c.state), q(c.z), c.addons.records > 0 ? 1 : 0, c.addons.shield > 0 ? 1 : 0]);
    const Ev = W.enemies.slice(0, 160).map(e => [e.id, KCODE.indexOf(e.kind), q(e.x), q(e.y), q((e.face || 0) * 10), Math.max(0, STCODE.indexOf(e.state)), q(e.hp / e.max * 99), q(e.z || 0), e.big ? 1 : 0, e.entering ? 1 : 0, q((e.t || 0) * 10), e.i || 0, e.flash > 0 ? 1 : 0]);
    const Bv = W.fShots.list.slice(0, 220).map(b => b.grav ? [b.id, BCODE.indexOf(b.kind), q(b.x), q(b.y), q(b.vx), q(b.vy), q(b.z), q(b.vz), q(b.tx), q(b.ty)] : [b.id, BCODE.indexOf(b.kind), q(b.x), q(b.y), q(b.vx), q(b.vy)]);
    const K = W.pickups.slice(0, 40).map(p => [p.id, PCODE.indexOf(p.kind), q(p.x), q(p.y), q(p.z), p.w ? WCODE.indexOf(p.w) : -1, p.ttl === Infinity ? 99 : q(p.ttl)]);
    const V = W.events.filter(e => ECODE.includes(e.name) && e.seq > (this.ringFloor || 0)).slice(-24).map(e => [e.seq, ECODE.indexOf(e.name), e.data]);
    return { t: 's', a: q(this.time()), n: ++this.snapN, rm: this.roomSeq, ph: W.phase, dr, R: q(R.R * 10), X: R.X, pm: q(R.prime * 10), wv: W.waveIdx, wt: W.wavesTotal, P, E: Ev, B: Bv, K, G: W.boss ? W.boss.toNet() : 0, V };
  },
  snapN: 0,
  hostStep(dt) {
    const W = MT.Show.W; if (!W || this.ended) return;
    this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 1 / 15; const s = this.snapshot(); const tCut = W.t - 1.2; this.ringFloor = (W.events.find(e => e.t >= tCut) || { seq: W.seq }).seq - 1; this.send(s, false); this.lastSize = JSON.stringify(s).length; }
    if (this.finishAt && MT.game.real >= this.finishAt + 3) this.finish(true);
    if (MT.Show.W && MT.Show.W.contestants.every(c => c.state === 'gone')) this.finish(false);
  },
  remoteStep(c, dt, W) {
    const n = c.net; if (!n) return;
    const k = 1 - Math.exp(-dt * 14); c.x += (n.x - c.x) * k; c.y += (n.y - c.y) * k; c.aim = n.aim; c.z = n.z || 0;
    c.vx = (n.x - c.x) * 4; c.vy = (n.y - c.y) * 4;
    if (n.state !== undefined && n.state !== c.state && c.state !== 'gone') { c.state = n.state; c.t = 0; }
    c.wpn = n.wpn || 'blaster'; c.slideT = n.flags & 2 ? .1 : 0; c.boat = n.flags & 4 ? .3 : 0; c.invuln = n.flags & 8 ? .2 : 0; c.hp = n.hp; c.addons.records = n.rec ? 1 : 0; c.addons.shield = n.sh ? 1 : 0;
    c.firing = !!(n.flags & 1) && c.state === 'play';
    if (c.firing) { c.facing = c.aim; MT.WEAPONS[c.wpn].fire(c, W, dt); }
    else if (Math.hypot(c.vx, c.vy) > 5) c.facing = Math.atan2(c.vy, c.vx);
    c.pose(dt);
  },
  onMessage(d, from) {
    if (this.ended || !d || typeof d !== 'object') return;
    if (this.role !== 'client') {
      const W = MT.Show.W, c = W && W.contestants.find(c => c.id === from); if (!c) return;
      if (d.t === 'c' && Array.isArray(d.s)) { const s = d.s; if (!c.netA || d.a >= c.netA) { c.netA = d.a; c.net = { x: s[0], y: s[1], aim: s[2] / 100, flags: s[3], wpn: WCODE[s[4]] || 'blaster', hp: s[5], state: SCODE[s[6]] || 'play', z: s[7], rec: s[8], sh: s[9] }; } }
      if (d.t === 'ce' && Array.isArray(d.ev)) for (const ev of d.ev) this.hostEvent(W, c, ev);
      return;
    }
    // client
    if (d.t === 's') { this.snaps.push(d); if (this.snaps.length > 8) this.snaps.shift(); this.lastSnap = d; }
    else if (d.t === 'room') { if (d.rm > (this.mirrorRm || 0)) { this.mirrorRm = d.rm; this.mirror(d.id, d.entry); } }
    else if (d.t === 'over') { this.over = d; }
  },
  hostEvent(W, c, ev) {
    const [k, a, b] = ev;
    if (k === 'claim') { const p = W.pickups.find(p => p.id === a && !p.dead); if (p && Math.hypot(p.x - c.x, p.y - c.y) < 40) W.collect(c, p); }
    else if (k === 'hurt') { W.event('hurt', { slot: c.slot, x: c.x, y: c.y, hp: c.hp, remote: true }); const bl = W.fShots.list.find(x => x.id === b); if (bl) bl.dead = true; }
    else if (k === 'died') { c.cash = Math.max(0, c.cash - 2500); c.deaths++; W.event('death', { slot: c.slot, x: c.x, y: c.y, name: c.name }); }
    else if (k === 'bomb') { const bx = c.x, by = c.y; c.x = a; c.y = b; W.showstopper(c, true); c.x = bx; c.y = by; }
    else if (k === 'boat') { const gn = clamp(+a || 0, 0, 30); W.ratings.gain(gn, W); c.boatGain += gn; W.event('showboat', { slot: c.slot, gain: gn, x: c.x, y: c.y }); }
  },
  onLeave(e) {
    if (this.role === 'client') { const W = MT.W; const c = W && W.contestants.find(c => c.id === e.id); if (c) c.state = 'gone'; return; }
    const W = MT.Show.W, c = W && W.contestants.find(c => c.id === e.id);
    if (c) { c.state = 'gone'; c.firing = false; MT.banner.show(c.name + ' LEFT THE STUDIO', { color: c.color, big: false }); if (MT.game.particles && !MT.game.headless) MT.game.particles.bits(c.x, c.y, 10, 30, [c.color, '#ffcc33']); }
    if (W && W.contestants.every(c => c.state === 'gone')) this.finish(false);
  },
  onTimeUp() { if (this.role !== 'client') this.finish(!!(MT.Show.W && MT.Show.W.room.boss && MT.Show.W.boss && MT.Show.W.boss.dead)); },
  results() {
    const W = MT.Show.W || MT.W, cs = (MT.run ? MT.run.contestants : []).filter(c => c.state !== 'gone');
    const sorted = cs.slice().sort((a, b) => b.cash - a.cash), standings = [];
    for (const c of sorted) { const last = standings[standings.length - 1]; if (last && cs.find(o => o.id === last[0]).cash === c.cash) last.push(c.id); else standings.push([c.id]); }
    const scores = {}, stats = {}; for (const c of cs) { scores[c.id] = Math.round(c.cash); stats[c.id] = { Kills: c.kills, Prizes: c.prizes.length, Deaths: c.deaths }; }
    const best = (f) => cs.slice().sort((a, b) => f(b) - f(a))[0];
    const awards = cs.length ? [{ id: best(c => c.cash).id, title: 'BIGGEST EARNER', detail: MT.money(best(c => c.cash).cash) }, { id: best(c => c.kills).id, title: 'MOST MASHES', detail: best(c => c.kills).kills + ' KILLS' }, { id: best(c => c.boatGain).id, title: 'CROWD FAVORITE', detail: Math.round(best(c => c.boatGain).boatGain) + ' STYLE' }] : [];
    return { standings, scores, stats, awards };
  },
  finish(won) {
    if (this.finished || this.role === 'client' || !this.hub) return; this.finished = true;
    const res = this.results(); res.won = !!won;
    this.send({ t: 'over', won: res.won, standings: res.standings, scores: res.scores }, true);
    this.over = { won: res.won, standings: res.standings, scores: res.scores };
    try { this.hub.finish(res); } catch (e) { MT.game.fail('finish', e); }
  },
  onEnd(e) {
    this.ended = true; this.endReason = e && e.reason; this.standings = e && e.standings;
    const g = MT.game; try { for (const p of g.players) p.clear(); g.audio.stopMusic(.3); g.audio.mute(true); } catch (er) { /* best-effort */ }
    g.go('sessionEnd', { reason: this.endReason }, { fade: 0 });
  },
  // ---------------- client: a mirror world fed by snapshots
  mirror(roomId, entry) {
    const run = MT.run, room = MT.ROOMS[roomId];
    if (MT.Show.W) MT.Show.W.dispose();
    const W = MT.Show.W = new MT.MirrorWorld({ room, contestants: run.contestants, entry, ratings: run.ratings, mode: 'session', intro: false });
    run.roomId = roomId; W.startMirror(); MT.Show.state = 'room'; MT.Show.staticK = 1;
    MT.music.play(room.boss ? 'bossShowdown' : 'studioBattle', { fade: .5 });
    this.emap = new Map(); this.kmap = new Map();
  },
  interp(list, idIdx, renderT) {   // the snapshots around renderT, by id
    const S = this.snaps; if (!S.length) return null;
    let a = S[0], b = S[S.length - 1];
    for (let i = 0; i < S.length - 1; i++) if (S[i].a <= renderT && S[i + 1].a >= renderT) { a = S[i]; b = S[i + 1]; break; }
    const u = b.a === a.a ? 1 : clamp((renderT - a.a) / (b.a - a.a), 0, 1.5);
    return { a, b, u };
  },
  clientStep(dt) {
    const W = MT.Show.W; if (!W || this.ended) return;
    const S = this.lastSnap, now = this.time(), rt = now - 120;
    // own contestant: fully local
    const me = W.contestants.find(c => c.ctl === 'local');
    if (S && S.rm === this.mirrorRm) {
      const I = this.interp(null, 0, rt), A = I ? I.a : S, B = I ? I.b : S, u = I ? Math.min(1, I.u) : 1;
      const prevA = new Map(A.E.map(e => [e[0], e]));
      // enemies
      const seen = new Set();
      for (const e of B.E) {
        seen.add(e[0]); let m = this.emap.get(e[0]);
        const kind = KCODE[e[1]]; if (!kind) continue;
        if (!m) { m = W.mirrorEnemy(e[0], kind); this.emap.set(e[0], m); m.x = e[2]; m.y = e[3]; }
        const pa = prevA.get(e[0]) || e, tx = lerp(pa[2], e[2], u), ty = lerp(pa[3], e[3], u);
        m.vx = (tx - m.x) / Math.max(dt, 1e-3); m.vy = (ty - m.y) / Math.max(dt, 1e-3); m.x = tx; m.y = ty; m.face = e[4] / 10; m.state = STCODE[e[5]] || 'move'; m.hp = e[6] / 99 * m.max; m.z = e[7]; m.big = !!e[8]; m.entering = e[9] ? { nx: 0, ny: 0 } : null; m.t = e[10] / 10; m.i = e[11]; m.flash = e[12] ? .05 : Math.max(0, m.flash - dt); m.r = m.big ? 10 : m.A.r; m.aim = m.face; m.clap = (m.clap || 0) + dt; m.box = (m.box || 0) + dt;
        m.A.pose && m.A.pose(m, dt); if (m.kind === 'clapbot' && m.rig && !MT.cfg.skipRigs) m.rig.update(dt, { look: [Math.cos(m.face), Math.sin(m.face)], walk: .5 });
      }
      for (const [id, m] of this.emap) if (!seen.has(id)) { m.dead = true; this.emap.delete(id); }
      W.enemies = [...this.emap.values()];
      // foe bullets: the newest snapshot, drawn at now
      const age = Math.max(0, Math.min(.3, (now - S.a) / 1000));
      W.fShots.list = S.B.map(b => { const o = { id: b[0], kind: BCODE[b[1]] || 'orb', x: b[2] + b[4] * age, y: b[3] + b[5] * age, vx: b[4], vy: b[5], z: 10, r: BCODE[b[1]] === 'shard' ? 2 : 3, team: 'f' }; if (b.length > 6) { o.grav = 400; o.vz = b[7] - 400 * age; o.z = Math.max(0, b[6] + b[7] * age - 200 * age * age); o.tx = b[8]; o.ty = b[9]; } return o; });
      // pickups
      const ks = new Set();
      W.pickups = S.K.filter(k => !this.kmap.has(k[0]) || !this.kmap.get(k[0]).claimed).map(k => { ks.add(k[0]); let p = this.kmap.get(k[0]); if (!p) { p = new MT.Pickup(PCODE[k[1]] || 'bill', k[2], k[3], { id: k[0], w: k[5] >= 0 ? WCODE[k[5]] : null }); this.kmap.set(k[0], p); } p.x = k[2]; p.y = k[3]; p.z = k[4]; p.ttl = k[6] === 99 ? Infinity : k[6]; p.t += dt; return p; });
      // the boss
      if (S.G && S.G[0]) { if (!W.boss || W.boss.kind !== S.G[0]) { W.boss = MT.BOSSES[S.G[0] === 'lance' ? 'lance' : S.G[0]].create(W); W.boss.co = null; } W.boss.fromNet(S.G); W.boss.t += dt; } else W.boss = null;
      // ratings, phase, doors, contestants
      W.ratings.R = S.R / 10; W.ratings.prime = S.pm / 10; W.phase = S.ph; W.waveIdx = S.wv; W.wavesTotal = S.wt;
      const P = new Map(S.P.map(p => [p[0], p]));
      for (const c of W.contestants) {
        const p = P.get(c.id); if (!p) continue;
        c.cash = p[9]; c.kills = p[11];
        if (c.ctl === 'mirror') {
          const pa = (A.P.find(x => x[0] === c.id)) || p, pb = (B.P.find(x => x[0] === c.id)) || p;
          const tx = lerp(pa[1], pb[1], u), ty = lerp(pa[2], pb[2], u); c.vx = (tx - c.x) / Math.max(dt, 1e-3); c.vy = (ty - c.y) / Math.max(dt, 1e-3); c.x = tx; c.y = ty;
          c.aim = p[3] / 100; c.firing = !!(p[4] & 1); c.slideT = p[4] & 2 ? .1 : 0; c.boat = p[4] & 4 ? .3 : 0; c.invuln = p[4] & 8 ? .3 : 0; c.wpn = WCODE[p[5]] || 'blaster'; c.hp = p[7]; c.lives = p[8]; c.bombs = p[10]; c.state = SCODE[p[12]] || 'play'; c.z = p[13]; c.addons.records = p[14]; c.addons.shield = p[15];
          if (c.firing) { c.facing = c.aim; c.fireCd -= dt; if (c.fireCd <= 0 && c.state === 'play') { c.fireCd = 1 / 8; W.fireBolt(c, c.aim, 0); } } else if (Math.hypot(c.vx, c.vy) > 5) c.facing = Math.atan2(c.vy, c.vx);
          c.pose(dt);
        }
      }
      // events: each new one once
      for (const [seq, code, data] of S.V) if (seq > this.seenSeq) { this.seenSeq = seq; const name = ECODE[code]; if (name === 'spawn') continue; if (name === 'hurt' && data.remote) continue; MT.react.on(name, data, W); this.localHazard(name, data, me, W); }
    }
    // own step
    if (me) { const it = this.overlayOpen ? MT.NOINTENT() : MT.intentFrom(me.input, me, W); me.update(dt, it, W); W.localHits(me, dt); }
    W.pShots.update(dt, W); W.cosmeticHits();
    W.arena.update(dt, W); this.mirrorDoors(W, S);
    for (const p of W.pickups) if (me && me.state === 'play' && !p.claimed && p.z < 14 && Math.hypot(p.x - me.x, p.y - me.y) < me.r + 7) this.claim(me, p, W);
    // send: 15 a second, events batched up to 4 a second
    this.sendT -= dt;
    if (this.sendT <= 0 && me) { this.sendT = 1 / 15; this.send({ t: 'c', a: q(now), s: [q(me.x), q(me.y), q(me.aim * 100), (me.firing ? 1 : 0) | (me.slideT > 0 ? 2 : 0) | (me.boat > 0 ? 4 : 0) | (me.invuln > 0 ? 8 : 0), WCODE.indexOf(me.wpn), me.hp, SCODE.indexOf(me.state), q(me.z), me.addons.records > 0 ? 1 : 0, me.addons.shield > 0 ? 1 : 0] }, false); }
    this.ceT -= dt; if (this.ceT <= 0 && this.ceQ.length) { this.ceT = .25; this.send({ t: 'ce', ev: this.ceQ.splice(0, 12) }, true); }
  },
  mirrorDoors(W, S) {
    if (!S) return; const ex = W.room.exits || {};
    ['N', 'E', 'S', 'W'].forEach((d, i) => { const D = W.arena.doors[d]; const v = (S.dr >> (i * 2)) & 3; if (v === 3 && D.state !== 'exit') { const dest = ex[d]; W.arena.setExit(d, dest, 'NEXT', 'star'); } });
    if (S.ph === 'exit' || S.ph === 'leaving') for (const d in ex) if (W.arena.doors[d].state !== 'exit') W.arena.setExit(d, ex[d], 'NEXT', 'star');
  },
  localHazard(name, d, me, W) {
    if (!me || !me.canBeHit) return;
    if (name === 'boom' && d && Math.hypot(me.x - d.x, me.y - d.y) < (d.small ? 36 : 18) + me.r - 2) me.hurt(1, d, W);
    if (name === 'splat' && d && Math.hypot(me.x - d.x, me.y - d.y) < 10 + me.r) me.hurt(1, d, W);
  },
  claim(me, p, W) {
    p.claimed = true; p.dead = true; this.ceQ.push(['claim', p.id]);
    if (p.kind === 'cap' && p.w) W.equip(me, p.w); else MT.react.on(MT.PICKUPS[p.kind].cash ? 'cash' : 'item', { slot: me.slot, v: MT.PICKUPS[p.kind].value || 0, x: p.x, y: p.y }, W);
  },
  // ---------------- the session overlay: VOLUME, MUSIC, BUTTON SYMBOLS, CLOSE (it never pauses)
  overlayOpen: false,
  overlayList() {
    const g = MT.game, s = g.settings, step = (k, d) => () => s.set(k, clamp(Math.round((s[k] + d) * 10) / 10, 0, 1));
    return new MT.ui.FocusList([
      { label: 'VOLUME', value: () => Math.round(s.volume * 100) + '%', left: step('volume', -.1), right: step('volume', .1), act: step('volume', .1) },
      { label: 'MUSIC', value: () => Math.round(s.music * 100) + '%', left: step('music', -.1), right: step('music', .1), act: step('music', .1) },
      { label: 'BUTTON SYMBOLS', value: () => s.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', left: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox'), right: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox'), act: () => s.set('glyphs', s.glyphs === 'xbox' ? 'playstation' : 'xbox') },
      { label: 'CLOSE', act: () => { this.overlayOpen = false; MT.overlay.open = false; } }
    ], { onCancel: () => { this.overlayOpen = false; MT.overlay.open = false; } });
  }
};
// the client's world: never authoritative; its own contestant's actions become messages
MT.MirrorWorld = class MirrorWorld extends MT.World {
  startMirror() {
    const n = this.contestants.length;
    this.contestants.forEach((c, k) => { if (c.state === 'gone') return; if (c.ctl === 'local') c.placeWalkIn(this.entry, k, n); });
    this.arena.slam(this.entry); this.phase = 'waves';
  }
  event(name, data = {}) { data.ev = name; MT.react.on(name, data, this); }
  mirrorEnemy(id, kind) {
    const A = MT.ENEMIES[kind], e = { id, kind, A, x: 0, y: 0, z: 0, vx: 0, vy: 0, r: A.r, hp: A.hp, max: A.hp, state: 'move', t: 0, face: 0, flash: 0, stun: 0, counted: A.counted, dead: false, segs: [], path: [] };
    e.rs = e; e.rig = MT.cfg.skipRigs ? null : (MT.enemyRig(kind) || null); if (kind === 'mime' && e.rig) MT.mimeBox(e.rig, e);
    if (kind === 'disco') { e.dx = 1; e.dy = 1; } if (kind === 'tank') { e.aim = 0; e.tread = 0; }
    return e;
  }
  showstopper(c) { if (c.bombs <= 0) return; c.bombs--; MT.net.ceQ.push(['bomb', Math.round(c.x), Math.round(c.y)]); MT.react.on('bomb', { slot: c.slot, x: c.x, y: c.y }, this); }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) { if (e.dead || !e.counted) continue; const d = MT.dist(c, e); if (d < 64) n++; if (d < 32) m++; }
    const gain = Math.min(30, 4 + 3 * n + 3 * m); MT.net.ceQ.push(['boat', gain]); MT.react.on('showboat', { slot: c.slot, gain, x: c.x, y: c.y }, this);
  }
  continueContestant() { }
  localHits(me, dt) {
    if (!me.canBeHit) return;
    for (const b of this.fShots.list) { if (b.grav) continue; if (Math.hypot(me.x - b.x, me.y - b.y) < me.r * .8 + b.r) { if (me.iframes) continue; if (me.hurt(1, b, this)) { MT.net.ceQ.push(['hurt', 1, b.kind, b.id]); b.dead = true; break; } } }
    if (me.canBeHit) for (const e of this.enemies) if (!e.dead && e.A.contact && !e.entering && Math.hypot(me.x - e.x, me.y - e.y) < e.r + me.r - 2) { if (me.hurt(e.A.contact, e, this)) { MT.net.ceQ.push(['hurt', 1, e.kind, 0]); break; } }
    if (me.canBeHit && this.boss && this.boss.contactR && !this.boss.dead && Math.hypot(me.x - this.boss.x, me.y - this.boss.y) < this.boss.contactR + me.r) { if (me.hurt(1, this.boss, this)) MT.net.ceQ.push(['hurt', 1, 'boss', 0]); }
    if (me.state === 'dead' && !me._sentDied) { me._sentDied = true; MT.net.ceQ.push(['died']); } if (me.state !== 'dead') me._sentDied = false;
  }
  cosmeticHits() { for (const b of this.pShots.list) { if (b.dead || b.grav) continue; for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) { b.dead = true; if (MT.fxr() < .3) MT.react.on('hit', { x: b.x, y: b.y }, this); break; } } }
  laser(c, dt) { const a = c.laserAng, x0 = c.x + Math.cos(a) * 10, y0 = c.y + Math.sin(a) * 10; this.laserBeams.push({ x0, y0, x1: x0 + Math.cos(a) * 300, y1: y0 + Math.sin(a) * 300, c: c.slot }); }
  explode(b) { MT.react.on('boom', { x: b.x, y: b.y, small: true }, this); }
  landLob(b) { if (b.team === 'p') MT.react.on('popcorn', { x: b.x, y: b.y }, this); }
};
MT.Contestant.prototype._update = MT.Contestant.prototype.update;
MT.Contestant.prototype.update = function (dt, it, W) {
  if (this.ctl === 'remote') { this.t += dt; this.fireCd -= dt; this.laserOn = false; this.laserAng = this.aim; return MT.net.remoteStep(this, dt, W); }
  if (this.ctl === 'mirror') return;
  return this._update(dt, it, W);
};

// ---------------------------------------------------------------- the session scenes: our own card, play, and the end card
MT.scenes.sessionCard = {
  input: MT.MENU, camera: { zoom: false },
  enter(d = {}) {
    this.fake = !!d.fake; this.t = 0; this.count = null; MT.music.play('theme', { fade: .3 });
    const self = this; this.btn = {};
    if (!this.fake && !this._wired && typeof window !== 'undefined' && window.addEventListener) { this._wired = true; window.addEventListener('keydown', e => { if (MT.game.sceneName === 'sessionCard' && (e.key === 'Enter' || e.code === 'Enter')) self.answer('ready'); }, true); }
    this.players = this.fake ? [{ id: 0, name: 'ALEX' }, { id: 1, name: 'SAM' }, { id: 2, name: 'JO' }] : MT.net.info.players;
    MT.lines.say('LANCE', 'WELCOME TO THE LIGHTNING ROUND! GRAB THE MOST CASH AND BEAT MASHY TOGETHER!', { prio: 3 });
  },
  answer(a) { if (this.fake) return; const H = MT.net.hub; if (!H) return; try { if (a === 'ready') { if (!this.sentReady) { this.sentReady = true; H.answer('ready'); MT.sfx('bell'); } } else { H.answer('more'); MT.sfx('blip'); } } catch (e) { /* the hub may be gone */ } },
  update(dt) {
    MT.frame(dt); this.t += dt;
    const c = MT.ui.clicked();
    if (MT.ui.nav('confirm') || c && MT.ui.inRect(c, this.btn.ready)) this.answer('ready');
    if (MT.game.players.some(p => p.pressed('more')) || c && MT.ui.inRect(c, this.btn.more)) this.answer('more');
    if (this.fake) { if (MT.ui.nav('cancel')) MT.game.go('title'); return; }
    const N = MT.net;
    if (N.started) { const t = N.time(); this.count = t; if (t >= 0 && isFinite(t)) { MT.game.go('session', {}, { fade: 0 }); } }
  },
  draw(r) {
    MT.ui.backdrop(r, MT.game.real);
    r.overlay(g => {
      const T = MT.ui.T, cx = r.W / 2, card = MT.net.card || {}, ready = card.ready || [];
      MT.drawLogo(g, cx, 22, 3, true); T(g, 'THE LIGHTNING ROUND', cx, 52, '#2ee6ff', { align: 'center', scale: 1 });
      T(g, "TONIGHT'S CONTESTANTS", cx, 66, '#ffcc33', { align: 'center' });
      this.players.forEach((p, i, a) => { const x = cx + (i - (a.length - 1) / 2) * 76, col = p.color || MT.COLORS.p[i % 4]; MT.ui.panel(g, x - 34, 78, 68, 26, { border: col, alpha: .85 }); T(g, MT.safeName(p.name), x, 83, col, { align: 'center' }); T(g, ready.includes(p.id) ? '✓ READY' : '...', x, 93, ready.includes(p.id) ? '#22ff66' : '#8a7a9a', { align: 'center', font: 'tiny' }); });
      T(g, 'HOW TO WIN: GRAB THE MOST CASH - BEAT MASHY TOGETHER', cx, 112, '#fff7e8', { align: 'center' });
      const I = MT.ui.lastI(); MT.glyph.prompt(g, cx, 126, [['move', 'MOVE'], ['aim', 'AIM+FIRE'], ['slide', 'SLIDE'], ['bomb', 'BOMB']], I, { align: 'center' });
      const st = this.count !== null && isFinite(this.count) ? (this.count < 0 ? String(Math.ceil(-this.count / 1000)) : 'MASH!') : card.starting ? 'STARTING' : card.paused ? 'PAUSED' : card.left !== null && card.left !== undefined ? 'STARTS IN ' + Math.ceil(card.left / 1000) : 'GET READY';
      T(g, st, cx, 146, '#ff2e88', { align: 'center', scale: 2 });
      const by = Math.min(r.H - 76, 166), rb = [cx - 100, by, 90, 20], mb = [cx + 10, by, 90, 20]; this.btn = { ready: rb, more: mb };
      MT.ui.panel(g, ...rb, { border: '#22ff66' }); MT.glyph.prompt(g, rb[0] + rb[2] / 2, rb[1] + 4, [['confirm', 'READY']], I, { align: 'center' });
      MT.ui.panel(g, ...mb, { border: '#ffcc33' }); T(g, card.asked ? 'TAKE BACK (M)' : 'MORE TIME (M)', mb[0] + mb[2] / 2, mb[1] + 6, '#ffcc33', { align: 'center' });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
MT.scenes.session = {
  input: MT.PLAY, playInput: true, camera: { zoom: false }, pausable: false,
  enter() { const g = MT.game; g.lights.enabled = true; MT.net.startPlay(); MT.music.sting('stMash'); },
  update(dt) {
    MT.frame(dt); const N = MT.net, g = MT.game;
    N.left = N.info && N.info.limitMs ? Math.max(0, (N.info.limitMs - N.time()) / 1000) : null;
    if (!N.ended) {
      const I = g.input, createHeld = I.held && I.held.has && I.held.has('Pad8');
      if ((I.pressed('pause') || (N.overlayOpen && I.pressed('cancel'))) && !createHeld) { N.overlayOpen = !N.overlayOpen; MT.overlay.open = N.overlayOpen; if (N.overlayOpen) N.olist = N.overlayList(); }
      if (N.overlayOpen && N.olist) N.olist.update(dt);
    }
    if (N.role === 'client') N.clientStep(dt);
    else { MT.Show.update(dt); N.hostStep(dt); }
    if (MT.Show.W) g.lights.ambient = MT.Show.W.arena.set.ambient;
  },
  draw(r) {
    const N = MT.net;
    MT.Show.draw(r);
    r.overlay(g => {
      if (N.role === 'server') { MT.ui.panel(g, r.W / 2 - 60, r.H - 30, 120, 16, { border: '#8a8a8a' }); MT.ui.T(g, 'STUDIO SERVER', r.W / 2, r.H - 26, '#c8c8c8', { align: 'center' }); }
      if (N.overlayOpen && N.olist) { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414')); MT.ui.title(g, r, 'MENU', 40); N.olist.draw(g, r, r.W / 2 - 90, 70, 180, { rowH: 24 }); MT.ui.T(g, 'THE SHOW GOES ON WHILE THIS IS OPEN', r.W / 2, 172, '#8a7a9a', { align: 'center', font: 'tiny' }); }
      if (N.over) { MT.ui.panel(g, r.W / 2 - 90, 60, 180, 30, { border: '#ffcc33' }); MT.ui.T(g, N.over.won ? 'MASHY IS MASHED!' : "THAT'S OUR SHOW!", r.W / 2, 70, '#ffcc33', { align: 'center' }); }
    });
  }
};
MT.scenes.sessionEnd = {
  input: MT.MENU,
  enter(d = {}) { this.reason = d.reason; this.t = 0; },
  update(dt) { this.t += dt; MT.lines.update(1 / 120); },
  draw(r) {
    MT.ui.backdrop(r, MT.game.real);
    r.overlay(g => {
      const T = MT.ui.T, cx = r.W / 2, why = this.reason;
      const head = why === 'finished' ? "THAT'S OUR SHOW!" : why === 'sat-out' ? 'YOU SAT THIS ONE OUT' : why === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES';
      MT.drawLogo(g, cx, 24, 2, true); E.font.title(g, head, cx, 50, { scale: head.length > 24 ? 1 : 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' });
      const st = (MT.net.over && MT.net.over.standings) || MT.net.standings || [], sc = (MT.net.over && MT.net.over.scores) || {};
      let k = 0; for (const tie of st) for (const id of tie) { const c = MT.run && MT.run.contestants.find(c => c.id === id); const y = 84 + k * 16; T(g, (k + 1) + '. ' + (c ? c.name : 'P' + (id + 1)), cx - 70, y, c ? c.color : '#fff7e8'); T(g, MT.money(sc[id] !== undefined ? sc[id] : c ? c.cash : 0), cx + 80, y, '#ffcc33', { align: 'right' }); k++; }
    });
  }
};

// ===== 60-play.js
// ---------------------------------------------------------------- the run and the show runner (room flow, cards, transitions, continue)
MT.newRun = (o = {}) => {
  MT.seed(o.seed || ((Date.now() & 0xffffff) | 1)); MT.resetIds(); MT.tut.reset(); MT.lines.clear(); MT.banner.clear();
  const run = MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed: MT.rng.seed, ep: o.ep || 1, roomId: null, path: [], keys: 0, keyRooms: {},
    contestants: [], introduced: {}, seen: {}, killedKinds: {}, usedW: {}, bossesSeen: {}, bombsUsed: 0, boats: 0, continues: 0, lanceRobot: false,
    ratings: new MT.Ratings(), prizeBags: {}, epCardShown: {}, scenes: [], devTouched: false, recaps: 0, greenRoom: false };
  for (const p of o.players || [{ slot: 0, look: 0, input: MT.game.input }]) {
    const c = new MT.Contestant(p.slot, { look: p.look, input: p.input, ctl: p.ctl || (p.input ? 'local' : 'bot'), name: p.name });
    if (p.name) c.named = true; if (p.color) { c.color = p.color; c.rig = MT.looks.make(c.look, c.color); }
    c.botOpts = p.botOpts || {}; run.contestants.push(c);
  }
  return run;
};
MT.Show = {
  W: null, state: 'idle', t: 0, card: null, map: null, staticK: 0, next: null, entry: 'S', cont: null, cab: null,
  begin(roomId, entry = 'S', o = {}) {
    const run = MT.run, room = MT.ROOMS[roomId]; if (!room) throw new Error('no room ' + roomId);
    if (this.W) this.W.dispose();
    run.roomId = roomId; run.ep = room.ep <= 3 ? room.ep : run.ep; run.path.push(roomId);
    const isStart = MT.EPISODES[room.ep] && MT.EPISODES[room.ep].start === roomId;
    if (isStart && !o.keepRatings) { run.ratings.R = 30; run.ratings.prime = 0; }
    const W = this.W = new MT.World({ room, contestants: run.contestants, entry, ratings: run.ratings, mode: run.mode, tutorial: !!room.tutorial && run.mode !== 'attract' && run.mode !== 'session' && !MT.tut.shown.move,
      keysOn: run.mode !== 'attract' || true, intro: run.mode !== 'attract' });
    for (const c of run.contestants) { c.bot = null; c.cheer = false; }
    W.start();
    MT.music.play(room.boss ? null : room.bonus ? 'recap' : (MT.EPISODES[room.ep] || MT.EPISODES[1]).song, { fade: .5 });
    if (room.bonus) MT.lines.sayAll(MT.TEXT.greenRoom, { prio: 3 });
    this.state = 'room'; this.t = 0; this.staticK = o.static ? 1 : 0;
    if (isStart && !run.epCardShown[room.ep] && run.mode !== 'attract' && run.mode !== 'session' && !o.noCard) { run.epCardShown[room.ep] = true; this.card = { ep: room.ep, t: 0 }; this.state = 'card'; MT.music.sting('stCard'); MT.lines.sayAll(MT.TEXT.epCard[room.ep], { prio: 3 }); }
    MT.emit('roomBegin', { id: roomId });
    return W;
  },
  intents(W) {
    const out = {};
    for (const c of W.contestants) {
      if (c.ctl === 'bot' || (c.slot === 0 && MT.CHEATS.autopilot && c.ctl === 'local')) out[c.slot] = MT.bot.intent(c, W, c.botOpts || {});
      else if (c.ctl === 'local') out[c.slot] = MT.intentFrom(c.input, c, W);
      else out[c.slot] = c.netIntent || MT.NOINTENT();
    }
    return out;
  },
  update(dt) {
    const W = this.W; if (!W) return;
    this.t += dt; this.staticK = Math.max(0, this.staticK - dt / .4);
    if (this.state === 'card') {
      this.card.t += dt;
      if (this.card.t > 1 && MT.ui.nav('confirm')) { this.card.t = 99; MT.lines.skipAll(); }
      if (this.card.t >= 3.6 && !MT.lines.busy || this.card.t > 30) { this.state = 'room'; this.card = null; this.staticK = 1; MT.lines.skipAll(); }
      return;
    }
    if (this.state === 'map') {
      this.map.t += dt;
      if (this.map.t > .6 && MT.ui.nav('confirm')) this.map.t = 99;
      if (this.map.t >= 2.6) { const n = this.map; this.map = null; this.begin(n.dest, n.entry, { static: true }); }
      return;
    }
    if (this.state === 'wipe') { this.wipeT += dt; this.staticK = Math.min(1, this.wipeT / .4); if (this.wipeT >= .4) { this.state = 'map'; this.map = Object.assign(this.pendingMap, { t: 0 }); MT.sfx('static', { vol: .5 }); } return; }
    if (this.state === 'continue') { this.contStep(dt); return; }
    // the room itself
    const it = this.intents(W);
    W.step(dt, it);
    if (W.phase === 'bossIntro' && MT.ui.held('confirm') && this.t > .5) { /* holding confirm skips the intro lines */ MT.lines.skipAll(); }
    if (MT.run.mode !== 'attract') MT.music.layer('intense', W.alive() >= 30 ? 1 : 0, 1);
    if (MT.run.mode !== 'attract' && MT.run.mode !== 'session' && W.contestants.length && W.contestants.every(c => c.state === 'out' || c.state === 'gone') && W.phase !== 'done') { this.startContinue(); return; }
    if (W.phase === 'done') this.roomDone(W);
  },
  roomDone(W) {
    const run = MT.run;
    if (this.onRoomDone && this.onRoomDone(W)) return;
    if (W.result === 'exit') { const dest = W.exitDest, entry = AR.opposite[W.exitDir]; this.pendingMap = { dest, entry, from: W.room.id }; this.state = 'wipe'; this.wipeT = 0; return; }
    if (W.result === 'boss') { MT.game.go('recap', { ep: W.room.ep }); this.state = 'idle'; return; }
    if (W.result === 'bonus') { run.greenRoom = true; MT.game.go('ending', { kind: 'b' }); this.state = 'idle'; return; }
    this.state = 'idle';
  },
  startContinue() {
    this.state = 'continue'; MT.music.play(null, { fade: .6 }); MT.lines.say(MT.TEXT.cont[0], MT.TEXT.cont[1], { prio: 3 });
    this.cont = { t: 10, tick: 10 }; this.cab.continue(10, ok => {
      if (ok) { for (const c of MT.run.contestants) if (c.state === 'out') { c.cash = Math.floor(c.cash / 2); c.lives = MT.startLives(); c.hp = MT.maxHp(); c.respawn(this.W); } MT.run.continues++; this.state = 'room'; this.W.event('continueOne', {}); MT.music.play((MT.EPISODES[this.W.room.ep] || MT.EPISODES[1]).song, { fade: .5 }); }
      else { this.state = 'idle'; MT.game.go('gameover', {}); }
    });
  },
  contStep(dt) {
    this.cab.update(dt); const c = this.cab._cont;
    if (c) { const n = Math.ceil(c.t); if (n !== this.cont.tick) { this.cont.tick = n; MT.sfx('countdown'); } this.cont.t = c.t; }
  },
  draw(r) {
    const W = this.W; if (!W) return;
    W.arena.fitCamera(MT.game); MT.game.focus(AR.cx, AR.cy - 4, 0);
    if (this.state === 'map' && this.map) { this.drawMap(r, this.map); return; }
    W.draw(r);
    if (MT.run.mode !== 'attract') MT.hud.draw(r, W); else r.overlay(g => { MT.ui.banners(g, r); if (MT.lines.current) MT.ui.lowerThird(g, r); });
    if (this.state === 'card' && this.card) this.drawCard(r, this.card);
    if (this.state === 'continue') this.drawContinue(r);
    if (this.staticK > 0) r.overlay(g => MT.ui.static(g, r, this.staticK));
  },
  drawCard(r, c) {
    const ep = MT.EPISODES[c.ep];
    r.overlay(g => {
      const u = Math.min(1, c.t / .4), cx = r.W / 2, cy = r.H / 2;
      px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const w = Math.min(300, r.W - 30), h = 110, x = cx - w / 2, y = cy - h / 2 - (1 - u) * 30;
      MT.ui.panel(g, x, y, w, h, { border: '#ff2e88' }); MT.ui.bulbs(g, x - 3, y - 3, w + 6, h + 6, MT.game.real);
      MT.ui.T(g, 'EPISODE ' + ep.n, cx, y + 12, '#2ee6ff', { align: 'center', scale: 2 });
      E.font.title(g, ep.title, cx, y + 36, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24', depth: 1 });
      MT.ui.T(g, 'LIVE FROM ' + ep.setName, cx, y + 80, '#fff7e8', { align: 'center' });
      if (MT.lines.current) MT.ui.lowerThird(g, r);
      if (c.t > 1) MT.ui.promptBar(g, r, [['confirm', 'SKIP']]);
      if (c.t < .4) MT.ui.static(g, r, 1 - c.t / .4);
    });
  },
  drawMap(r, m) {
    const ep = MT.EPISODES[MT.ROOMS[m.dest].ep] || MT.EPISODES[1], run = MT.run;
    r.sky(['#0a0414', '#1a0a2c', '#2a1446']);
    r.overlay(g => {
      const cx = r.W / 2, top = 20; MT.ui.title(g, r, 'NEXT ON MASH TV', 10, '#ff2e88');
      MT.ui.T(g, 'EPISODE ' + ep.n + ': ' + ep.title, cx, top + 22, '#2ee6ff', { align: 'center' });
      const cw = 96, ch = 46, ox = cx - cw * 1.5, oy = top + 40;
      const pos = id => { const R = MT.ROOMS[id]; return [ox + R.cell[0] * cw + cw / 2, oy + R.cell[1] * ch + ch / 2]; };
      for (const id of ep.rooms) { const R = MT.ROOMS[id]; for (const d in R.exits || {}) { const a = pos(id), b = pos(R.exits[d]); const lit = run.path.includes(id) && run.path.includes(R.exits[d]); px.line(g, a[0], a[1], b[0], b[1], lit ? '#ffcc33' : '#4a3a5a', lit ? 2 : 1); } }
      const u = Math.min(1, m.t / 1.2), a = pos(m.from || m.dest), b = pos(m.dest); px.line(g, a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u), '#22ff66', 3);
      for (const id of ep.rooms) {
        const R = MT.ROOMS[id], [x, y] = pos(id), cur = id === m.dest, seen = run.path.includes(id), w = 84, h = 34;
        MT.ui.panel(g, x - w / 2, y - h / 2, w, h, { alpha: .95, border: cur ? (Math.floor(m.t * 4) % 2 ? '#22ff66' : '#ffffff') : seen ? '#ffcc33' : '#5a3a6a', bg: seen ? ['#3a1a4c', '#20102e'] : ['#1a0e28', '#100818'] });
        MT.hud.roomIcon(g, x - w / 2 + 4, y - h / 2 + 4, MT.roomIcon(R));
        const lines = E.font.wrap(R.name, w - 8, { font: 'tiny' }); lines.slice(0, 3).forEach((s, i) => MT.ui.T(g, s, x, y - 6 + i * 7, cur ? '#ffffff' : '#c8c0e0', { align: 'center', font: 'tiny' }));
        if (R.key) { const got = run.keyRooms[id]; MT.ui.T(g, '★', x + w / 2 - 9, y - h / 2 + 3, got ? '#5a4a20' : '#ffe060'); }
      }
      MT.ui.T(g, '★ ' + run.keys + '/9 GOLDEN KEYS', cx, r.H - 34, '#ffe060', { align: 'center' });
      MT.ui.promptBar(g, r, [['confirm', 'SKIP']]);
      if (m.t < .3) MT.ui.static(g, r, 1 - m.t / .3);
    });
  },
  drawContinue(r) {
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0414'));
      const cx = r.W / 2, cy = r.H / 2, n = Math.max(0, Math.ceil(this.cont.t));
      E.font.title(g, 'CONTINUE?', cx, cy - 50, { scale: 2, align: 'center', colors: ['#ffcc33', '#ff7a5a'], outline: '#1a0a24' });
      MT.ui.T(g, String(n), cx, cy - 14, '#ff2e88', { align: 'center', scale: 4 });
      MT.ui.T(g, '-50% WINNINGS', cx, cy + 22, '#fff7e8', { align: 'center' });
      MT.ui.promptBar(g, r, [['confirm', 'CONTINUE']]);
      if (MT.lines.current) MT.ui.lowerThird(g, r);
    });
  }
};
// joining mid-run: a free pad presses Options and drops in on a cable
MT.joinPlayer = (input, n) => {
  const run = MT.run; if (!run || run.contestants.length >= 4) return;
  const slot = run.contestants.length, c = new MT.Contestant(slot, { look: slot, input, ctl: 'local' });
  run.contestants.push(c); input.use(MT.wantPreset());
  if (MT.Show.W && MT.Show.W.contestants !== run.contestants) MT.Show.W.contestants.push(c);
  if (MT.Show.W) { c.lives = MT.startLives(); c.respawn(MT.Show.W); }
  MT.banner.show('P' + (slot + 1) + ' JOINS THE SHOW!', { color: c.color });
};

// ---------------------------------------------------------------- the play scene
MT.scenes = MT.scenes || {};
MT.scenes.play = {
  pausable: true, input: MT.PLAY, playInput: true, camera: { zoom: false },
  enter(d = {}) {
    const g = MT.game; g.lights.enabled = true; g.lights.ambient = .55;
    g.allowJoin({ max: 4, keys: false, onJoin: (inp, n) => MT.joinPlayer(inp, n) });
    MT.Show.cab = MT.cab; MT.Show.onRoomDone = null;
    if (!MT.run || d.fresh) MT.newRun(d.run || {});
    const room = d.room || MT.EPISODES[d.ep || 1].start;
    MT.Show.begin(room, d.entry || 'S', { noCard: d.noCard });
    if (d.dev) MT.dev.open();
    this.pausable = true;
  },
  exit() { const g = MT.game; g.allowJoin(false); MT.hud.cursor(false); if (MT.Show.W) { MT.Show.W.dispose(); MT.Show.W = null; } MT.overlay.open = false; MT.overlay.kind = null; MT.dev.close(true); g.timeScale = 1; },
  update(dt) {
    MT.frame(dt);
    const g = MT.game; g.lights.ambient = MT.Show.W ? MT.Show.W.arena.set.ambient : .55;
    if (MT.overlay.open) { MT.overlayUpdate(dt); this.pausable = false; if (MT.overlay.frozen()) return; } else this.pausable = true;
    g.timeScale = MT.T.timeScale;
    MT.Show.update(dt);
  },
  draw(r) { MT.Show.draw(r); if (MT.overlay.open) MT.overlayDraw(r); }
};
// per-step bookkeeping shared by every scene
MT.frame = (dt) => {
  const g = MT.game, rdt = 1 / 120;
  MT.ui.tick(); MT.laterTick(rdt); MT.lines.update(rdt); MT.banner.update(rdt); MT.tut.update(rdt); MT.cast.tick(rdt);
  if (!g.headless && MT.W && MT.run && MT.run.mode !== 'session') MT.babble.ambience(rdt, MT.W.ratings.R / 100);
  if (MT.lines.current && MT.lines.current.prio >= 3 && g.scene && g.scene.skippable && MT.ui.nav('confirm')) MT.lines.skip();
};
// the pause menu's items open these overlays (they freeze the show themselves)
MT.overlay.frozen = () => MT.overlay.kind === 'dev' ? MT.dev.freeze : true;
MT.overlayUpdate = (dt) => {
  const k = MT.overlay.kind;
  if (k === 'dev') MT.dev.update(dt);
  else if (k === 'map') { if (MT.ui.nav('cancel') || MT.ui.nav('confirm') || MT.ui.clicked()) MT.closeOverlay(); }
  else if (k === 'howto') MT.howtoPanel.update(dt);
};
MT.overlayDraw = (r) => {
  const k = MT.overlay.kind;
  if (k === 'dev') MT.dev.draw(r);
  else if (k === 'map') { const W = MT.Show.W; MT.Show.drawMap(r, { dest: W.room.id, from: W.room.id, t: 2 }); r.overlay(g => MT.ui.promptBar(g, r, [['cancel', 'BACK']])); }
  else if (k === 'howto') MT.howtoPanel.draw(r);
};
MT.openOverlay = (kind) => { MT.game.resume(); MT.overlay.open = true; MT.overlay.kind = kind; MT.game.players.forEach(p => p.consumeAll()); if (kind === 'howto') MT.howtoPanel.open(() => MT.closeOverlay()); };
MT.closeOverlay = () => { MT.overlay.open = false; MT.overlay.kind = null; MT.game.players.forEach(p => { p.consumeAll(); }); };

// ===== 90-main.js
// ---------------------------------------------------------------- main: the game, settings, menu items, deep links, the debug handle, boot
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active;
const game = MT.game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MT.MENU, id: 'mashtv',
  menu: HUB ? false : {
    items: [['Dev mode', () => { if (!MT.dev.open()) MT.game.resume(); }], ['Episode map', () => MT.openOverlay('map')], ['How to play', () => MT.openOverlay('howto')]],
    settings: [
      { key: 'aimAssist', label: 'Aim assist (controller)', value: true, group: 'Game' },
      { key: 'autoFire', label: 'Auto-fire with the right stick', value: true, group: 'Game' },
      { key: 'camView', label: 'Camera', options: [['Studio', 'Studio'], ['Overhead', 'Overhead']], value: 'Studio', group: 'Game', apply: (g, v) => { try { g.setView(v === 'Overhead' ? 'topdown' : 'threequarter'); } catch (e) { /* before start */ } } },
      { key: 'subtitles', label: 'Subtitles', value: true, group: 'Game' },
      { key: 'chatter', label: 'Host chatter', options: [['Normal', 'Normal'], ['Less', 'Less'], ['Off', 'Off']], value: 'Normal', group: 'Game' },
      { key: 'confetti', label: 'Confetti amount', options: [['Party', 'Party'], ['Tasteful', 'Tasteful']], value: 'Party', group: 'Game' }],
    controls: MT.CONTROL_NAMES, quit: 'title'
  } }, HUB ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
if (HUB) { for (const [key, value, extra] of [['aimAssist', true], ['autoFire', true], ['subtitles', true], ['chatter', 'Normal', ['Normal', 'Less', 'Off']], ['confetti', 'Party', ['Party', 'Tasteful']], ['camView', 'Studio', ['Studio', 'Overhead']]]) try { game.settings.define(Object.assign({ key, value, group: 'Game' }, extra ? { type: 'select', options: extra } : {})); } catch (e) { /* defined */ } }
if (!game.headless && !HUB && E.Shell) new E.Shell(game, { theme: { ink: '#fff7e8', paper: 'rgba(20,8,34,.94)', accent: '#ffcc33', danger: '#ff4d6d', line: 'rgba(255,204,51,.35)', titleFont: 'Impact, "Arial Black", system-ui', font: 'system-ui, sans-serif' } });
game.input.touchEnabled = false;
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10, lives: 3 });
MT.loadTunes(); game.timeScale = 1;
try { game.settings.set('glyphs', game.settings.glyphs || 'playstation'); } catch (e) { /* ok */ }

// scenes waiting on the hub
MT.scenes.hubwait = {
  input: MT.MENU,
  enter() { this.t = 0; this.done = false; MT.net.connect().then(info => { this.done = true; if (!info) { game.go('title', {}); return; } try { MT.net.hub.ready(); } catch (e) { game.fail('ready', e); } game.go('sessionCard', {}, { fade: 0 }); }).catch(e => { game.fail('connect', e); game.go('title', {}); }); },
  update(dt) { this.t += dt; },
  draw(r) { MT.ui.backdrop(r, game.real); r.overlay(g => { MT.drawLogo(g, r.W / 2, 60, 3); MT.ui.T(g, 'CONNECTING TO THE STUDIO...', r.W / 2, 120, '#2ee6ff', { align: 'center' }); }); }
};

// deep links: #title #lobby #howto #scores #about #attract #room=2-3 #boss=1 #greenroom #lightning #recap=2 #continue #gameover #initials #ending=a #credits #dev #card; &seed=N &players=N &bot=1
MT.deepLink = (hash) => {
  const h = String(hash || '').replace(/^#/, ''); if (!h) return null;
  const parts = h.split('&'), [k, v] = parts[0].split('='), opt = {};
  for (const p of parts.slice(1)) { const [a, b] = p.split('='); opt[a] = b === undefined ? true : b; }
  const players = Math.max(1, Math.min(4, +opt.players || 1)), seed = +opt.seed || 7;
  const mk = () => MT.newRun({ mode: 'test', seed, players: Array.from({ length: players }, (_, i) => ({ slot: i, look: i, input: i === 0 && !opt.bot ? game.input : null, ctl: i === 0 && !opt.bot ? 'local' : 'bot' })) });
  const map = { title: ['title'], lobby: ['lobby', { diff: 'CONTESTANT' }], howto: ['howto'], scores: ['scores'], about: ['about'], attract: ['attract'], gameover: ['gameover'], initials: ['initials', { fake: true }], credits: ['credits'], card: ['sessionCard', { fake: true }], difficulty: ['difficulty'], episodes: ['episodes'] };
  if (map[k]) { if (k === 'gameover' || k === 'credits') mk(); return map[k]; }
  if (k === 'room' && MT.ROOMS[v]) { mk(); return ['play', { room: v, noCard: true }]; }
  if (k === 'boss') { mk(); return ['play', { room: v + '-B', noCard: true }]; }
  if (k === 'greenroom') { mk(); return ['play', { room: 'GR', noCard: true }]; }
  if (k === 'lightning') { mk(); return ['play', { room: 'L1', noCard: true }]; }
  if (k === 'recap') { mk(); return ['recap', { ep: +v || 1, fake: true }]; }
  if (k === 'ending') { mk(); return ['ending', { kind: v === 'b' ? 'b' : 'a' }]; }
  if (k === 'dev') { mk(); return ['play', { room: '1-1', noCard: true, dev: true }]; }
  if (k === 'continue') { mk(); MT.later(.6, () => { for (const c of MT.run.contestants) { c.lives = 0; c.state = 'out'; } }); return ['play', { room: '1-1', noCard: true }]; }
  if (k === 'cold') { mk(); return ['cut', { id: 'cold' }]; }
  return null;
};

// the debug handle: tests and tools read it
const snap = () => {
  const W = MT.Show.W, run = MT.run, byKind = {};
  if (W) for (const e of W.enemies) if (!e.dead) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: W && W.room.id, phase: W && W.phase, state: MT.Show.state, wave: W ? W.waveIdx : -1, alive: W ? W.alive() : 0, byKind,
    bullets: W ? W.fShots.list.length : 0, pshots: W ? W.pShots.list.length : 0, pickups: W ? W.pickups.length : 0, R: W ? Math.round(W.ratings.R * 10) / 10 : 0, X: W ? W.ratings.X : 1, prime: W ? W.ratings.prime : 0, keys: run ? run.keys : 0,
    players: W ? W.contestants.map(c => ({ slot: c.slot, x: Math.round(c.x * 10) / 10, y: Math.round(c.y * 10) / 10, hp: c.hp, lives: c.lives, cash: c.cash, wpn: c.wpn, state: c.state, bombs: c.bombs, addons: Object.assign({}, c.addons) })) : [],
    boss: W && W.boss ? { kind: W.boss.kind, phase: W.boss.phase, form: W.boss.form, dead: W.boss.dead, parts: W.boss.parts.map(p => [p.id, Math.round(p.hp), p.alive]) } : null,
    overlay: MT.overlay.kind, errors: game.errors.length, touchOnly: MT.touch.only, idle: Math.round(MT.idle.t * 10) / 10, reel: MT.attract.reel };
};
game.debug = {
  snapshot: snap,
  warp: (t) => MT.dev.warp(t),
  spawn: (kind, n = 1, where = 'drop') => MT.dev.spawn(kind, n, where),
  give: (kind, slot = 0) => { const W = MT.Show.W, c = W && W.contestants[slot]; if (c) W.equip(c, kind); },
  cheat: (name, on = true) => MT.dev.cheat(name, on),
  tune: (k, v) => MT.setTune(k, v, false), resetTunes: () => MT.resetTunes(),
  bot: (slot, opts = {}) => { const c = MT.Show.W && MT.Show.W.contestants[slot]; if (c) { c.ctl = 'bot'; c.botOpts = opts; } },
  addBot: (look) => { const run = MT.run; const c = new MT.Contestant(run.contestants.length, { look: look === undefined ? run.contestants.length : look, ctl: 'bot' }); run.contestants.push(c); if (MT.Show.W) c.respawn(MT.Show.W); return c; },
  killAll: () => MT.dev.killAll(), clearRoom: () => MT.dev.clearRoom(),
  chooseExit: (dir) => { const W = MT.Show.W; if (W && W.arena.doors[dir].state === 'exit') { W.exitDir = dir; W.exitDest = W.arena.doors[dir].dest; W.result = 'exit'; W.setPhase('done'); } },
  teleport: (slot, x, y) => { const c = MT.Show.W && MT.Show.W.contestants[slot]; if (c) { c.x = x; c.y = y; } },
  netFake: (hub) => { MT.net.hub = hub; },
  seed: (n) => MT.seed(n),
  world: () => MT.Show.W,
  stateHash: () => { const W = MT.Show.W; if (!W) return 0; let h = 0; const add = v => { h = (Math.imul(h ^ Math.round(v * 100), 16777619) + 1) >>> 0; }; for (const c of W.contestants) { add(c.x); add(c.y); add(c.cash); add(c.hp); } for (const e of W.enemies) { add(e.x); add(e.y); add(e.hp); } add(W.fShots.list.length); add(W.ratings.R); return h; }
};
game.stateHash = () => game.debug.stateHash();

// the play scene also draws the debug overlays
const playDraw = MT.scenes.play.draw;
MT.scenes.play.draw = function (r) { playDraw.call(this, r); if (MT.Show.W) MT.dev.drawDebug(r, MT.Show.W); };

let first = 'title';
if (HUB) first = 'hubwait';
else if (typeof location !== 'undefined' && location.hash) { const dl = MT.deepLink(location.hash); if (dl) { first = dl[0]; MT.firstData = dl[1]; } }
MT.scenes.boot = { input: MT.MENU, enter() { this.go = true; }, update() { if (this.go) { this.go = false; game.go(first, MT.firstData || {}, { fade: 0 }); } }, draw(r) { r.sky(['#05020a', '#0a0414']); } };
game.start({ scenes: MT.scenes, scene: 'boot', boot: game.headless ? false : { title: 'MASH TV', version: MT.VERSION, steps: [['Building the studio', () => MT.cast.build()], ['Rehearsing the host', () => MT.babble.duration('MASH TV')], ['Warming up the crowd', () => MT.sets.audience()]], messages: ['Polishing the confetti cannons', 'Counting the prize money', 'Teaching the clapbots to clap'] } });
})();
