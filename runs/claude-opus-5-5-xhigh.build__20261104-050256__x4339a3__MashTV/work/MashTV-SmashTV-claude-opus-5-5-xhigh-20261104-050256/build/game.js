
// ---- 00-core.js ----
// MASH TV — core: the namespace, arena geometry, seeded random streams, the tuning registry, the event bus, helpers.
// Every src/*.js file is a fragment of one IIFE: this file opens it and 90-main.js closes it.
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const GLOBAL = typeof globalThis !== 'undefined' ? globalThis : window;
const HAS_DOM = typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.createElement;
const MT = GLOBAL.MT = { E };
MT.ABOUT = {"what":["MASH TV IS A 1-4 PLAYER TWIN-STICK ARENA SHOOTER SET INSIDE THE DEADLIEST GAME SHOW ON TELEVISION.","FIGHT THROUGH SEALED STUDIO ROOMS AS GOONS, CLAPBOTS, PARTY POPPERS, LAND MIMES AND WORSE POUR IN THROUGH FOUR DOORS.","GRAB CASH AND RIDICULOUS PRIZES, PLAY TO THE CAMERAS TO KEEP THE RATINGS UP, PICK YOUR ROUTE ON THE STUDIO MAP, AND SURVIVE THREE EPISODES TO THE SEASON FINALE.","COLLECT FIVE OF THE NINE GOLDEN KEYS TO OPEN THE SECRET GREEN ROOM AND SEE THE TRUE ENDING.","YOUR HOST: THE IMMORTAL, OILY, SEQUINNED LANCE LUSTRE. KA-CHING! KA-BOOM!"],"questions":{"testing":["How many issues did testing catch?","How many would be considered critical issues / game breaking?","What was the most helpful test you ran?","What was the least helpful test you ran?"],"engine":["What did you like most about the engine?","Did you get stuck or guess wrong?","What was the most important thing you had to build yourself?","What was the hardest part about using the engine?","What did you change in the engine, and why?","If you could change one thing about the engine, what would it be?"],"prompt":["What did you like most about this prompt?","What was confusing?","What was the hardest thing to do?","What would you change in this prompt?"]},"exitInterview":{"sourceInformation":{"date":"2026-11-04 05:02:56","source":"Smash TV (Williams Electronics arcade game, 1990)","plan":"PLAN.md","genre":"Twin-stick arena shooter (arcade), 1-4 player co-op, with a route choice between rooms","perspective":"Fixed single-screen arena per room from a high three-quarter studio camera (pitch 55); a straight-down overhead camera is a Settings option","tech":"my-3D2dge handoff v0.85.2 (commit 4390a98, full edition with the arcade module) with 4 small engine patches; AI Hub session client aihub-session 1.4.0; plain JavaScript in one IIFE bundled into one HTML file by a Node 24.22.1 script; Playwright 1.63.0 (Chromium) and Node vm for tests","artDirection":"The engine's native PS1-era look (320x240 expanded, HD Humanoid rigs, textured TileMap floors and walls, canvas lighting) dressed as a retro-future TV studio: neon, chrome, marquee bulbs, sponsor logos, confetti, spotlights, a jumbotron; all art drawn in code","animation":"The engine's procedural Humanoid and Blob rigs (gaits, poses, E.MOVES attacks, portraits) plus new motion: the mime's trapped-in-a-box hands, dive-roll slides, cable drops, boss parts and patterns, the wheel's eased spin, tween-driven cards and static wipes","audio":"All synthesized in code: 8 original songs in the engine's step notation with layers, 12 stings, about 70 synth sound effects, and Babble formant-synthesis gibberish voices for the host, co-host, announcer, bosses and contestants, plus a synthesized studio crowd. Measured in Chromium: songs audible with peaks under 0.3 (no clipping); not judged by ear.","online":"AI Hub Session Protocol v1, shared-world, 1-4 players (the Lightning Round); local co-op 1-4 on one screen","testing":"One command (npm test) rebuilds and runs 25 suites, printing only failures and a one-line count: headless Node vm suites driving game.advance, input taps and game.debug (core, input, audio, contestant, weapons, economy, ratings, enemies, rooms, a sweep of all 21 wave rooms by bots, bosses, a full scripted playthrough plus a no-cheat game-over run, ui, dev, attract, touch, a determinism proof, a balance suite where a human-like bot must clear each Episode 1 room in 45-90 s with at most 2 deaths and beat Mashy, a feature audit of TASK.md's requirements, and a 3-copy net loopback on a fake hub with latency and loss), plus a walkthrough with real key presses, clicks and taps in Chromium (pause menu, Dev mode sliders and reset, How to play, Episode map, attract mode, the touch-only notice), a walkthrough with a stubbed standard-mapping DualSense in Chromium (menus, difficulty and lobby, both sticks in play, Options to pause and resume, PlayStation glyphs, the Xbox setting, prompts switching between pad and keys, attract start and exit), Playwright browser checks of the deliverable over file:// at 1280x720 and 1920x1080 (every deep link, keyboard, mouse, touch-only emulation), an audio measurement in Chromium (every song audible without clipping, every sound makes signal, voice pitches as designed: Network about 72 Hz, Announcer 99, Lance 157, Penny 356), and the AI Hub harness 4 times (2 players; 4 players with 150 ms latency, 50 ms jitter and 5% loss; host-leave; server). Screenshots were reviewed for what scripts cannot judge.","research":"Read the engine's API card whole, the AI_GUIDE sections on standard features, frame order, players, testing and the twin-stick recipe, the asset card, and the engine source for input, the Shell, the arcade module, audio and sprites; read the AI Hub protocol README, session.js, the harness and round.js. Smash TV from general knowledge only: no web research, and every name, line, level and tune is original.","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort xhigh","usage":"Cost unknown and total tokens unknown (no counter is visible inside the session). Estimate: about 160K output tokens of code and text written (about 555 KB of source, tests and tools at about 3.5 bytes a token), not counting reasoning or input. Session time about 2 h 30 min (05:03 to about 07:35 MST, 2026-11-04)."},"testingFeedback":["About 28 real issues: 20 found by the scripted suites (headless, net loopback, browser, AI Hub harness, balance, a real-input walkthrough) and 8 found by looking at screenshots. Examples: my coroutine runner made a bare yield wait two steps, so every boss loop and the survive-room clock ran at half speed; the Prize Recap never left after the second episode; remote players' guns fired once and never again on the host; the attract demo stuck on its first reel; Mashy could become unkillable when his body fell before his last arm; two rooms never dropped their Golden Key; pickups drew at 60% size; the camera drifted under overlays. Several more failures were mistakes in the tests themselves, not counted here. The balance suite then showed rooms clearing too fast and Mashy and the Key Gauntlet too hard for an average player; pacing, boss adds and the survive room were retuned until a human-like bot met the targets. Last, a walkthrough with real key presses in Chromium found that Dev mode, opened from the pause menu, ignored the keyboard: the engine's pause screen stayed open and held the input back (scripted taps in the headless suites had hidden it), and that Esc on How to play left it open under the pause menu.","4 were game breaking: the Prize Recap hang (a full run could not get past Episode 2), Mashy becoming unkillable if his body fell before his last arm (the run stalls in the boss room), remote players doing no damage in AI Hub sessions, and the attract mode stuck on its first reel. The missing keys for Pyro Pit and Mascot Mayhem were serious (fewer routes to the Green Room) but not run-ending.","The scripted playthrough: two god-mode bots play the whole game on the left path (15 rooms, 3 bosses, 3 recaps, the Green Room, Ending B, initials typed through input, Top Earners), asserting every enemy kind, weapon, hazard, Prime Time, Showstopper and showboat. It found the recap hang and the missing keys in one run. A close second was the net loopback suite (3 game copies on a fake hub with 150 +/- 50 ms latency and 5% loss), which found the dead remote guns before the real harness ever ran. For balance, the human-like bot (it re-aims a few times a second, aims with error and never leads its target) gave a repeatable stand-in for a player: Episode 1 rooms now clear in about 50-57 s with 0-2 deaths.","A filmstrip of the land mimes at a wide crop: the frames came out too small to judge the trapped-in-a-box motion, so it told me nothing a screenshot had not. The engine checker's view cycle (iso, brawler, side) was also of little use, since this game only uses the three-quarter and top-down views. The lesson from the last bug: headless taps are not real key presses, so the real-input walkthrough now runs with the rest, joined after a final line-by-line re-read of TASK.md by a controller walkthrough with a stubbed DualSense (it found no game bugs)."],"engineFeedback":["Exact, deterministic headless play: game.advance in fixed 1/120 s steps, input.tap and a debug handle let one command play the entire game, three networked copies and every scene in a few minutes. Close behind: the standard pause, settings and rebinding screens for free, and HD Humanoid rigs with live portraits, poses and moves that made every character, host and enemy cheap to dress.","Yes, a few times. World sprites are scaled by the camera zoom alone while geometry scales by the view scale times the zoom (the three-quarter view's base scale is 1.5), so at the zoom that fits the arena (about 0.6) my pickups drew tiny until I passed scale 1/zoom. input.use() clears held keys and taps, so a press on the step a preset changes is lost. A mouse move does not update lastDevice (only a click does), so hover needed my own handling. game.hitFx always freezes, which a shared-world host must avoid. input.names (the Controls screen labels) is only set when there is a DOM.","The AI Hub shared-world netcode: an authoritative host world, compact snapshots at 15 a second, client prediction for your own contestant, 120 ms interpolation by id, claims and hurt reports, room messages, standings and the session card. After that, the game-show layer: ratings, the reaction table, the line queue with priorities and the Babble formant voices.","Keeping sizes consistent between engine-drawn things (scaled by the view) and my own pixel painters and sprites across zoom levels, and the interplay between input presets and the Shell: arrows had to aim in play but move the focus in the pause menu, which needed an engine hook to switch presets at the right moment in the frame.","Four small patches (engine/PATCHES.md): P1 exposes E.HOOKS so the game can switch every player's input preset after input.tick and before the Shell reads navigation; P2 makes the glyph setting default to PlayStation with an Xbox option and apply to every player, including ones who join later; P3 lets E.Arcade enter initials with a given player's input and lets any player continue; P4 adds audio.bus so the Babble voices follow volume and mute.","Make r.sprite (and px sizes in custom painters) follow the view's full scale, or expose one 'pixels per world unit' number that every drawing path uses, so sprites and hand-drawn art stay in proportion with rigs and maps at any zoom."],"promptFeedback":["It defines a whole product, not a toy: controller-first 10-foot UI with native keyboard and mouse, an attract mode, a dev mode with live sliders, local co-op plus an AI Hub session, and a single-file deliverable with an exit interview. Paired with the very specific PLAN.md, there was almost nothing to guess about what done means.","Small things: TASK.md asks to brainstorm 50 titles and pick one with a random number generator, while the plan says the title was already drawn and not to re-pick it (I followed the plan, since TASK.md says to use the title it gives). The Usage field asks for cost and token counts that an agent inside the session cannot see. And 'Balance is key' has no target a script can check without a human player.","The scope together with the multiplayer bar: 18 wave rooms, 3 multi-phase bosses, 9 enemy kinds, every front-end screen and cutscene, and a shared-world netcode that had to pass the hub harness at 4 players with latency, loss, host-leave and a server copy. Balancing without a human playtester was the hardest judgement call.","Give a balance target in measurable terms (for example a bot profile or expected clear times), say how Usage should be estimated or drop it when it cannot be known, and drop or reconcile the title-picking step when a plan already fixes the title."],"aiHub":{"name":"MASH TV","tagline":"Mash 'em! Cash 'em! Survive the show.","description":"A 1-4 player twin-stick arena shooter inside the deadliest game show on TV: blast through studio rooms of goons and robots, grab cash and absurd prizes, keep the ratings up and survive to the Season Finale.","type":"Game","genre":"Shooter","source":"Smash TV","series":"","players":"1–4","controls":"WASD/left stick move · mouse/right stick aim & fire · Space/L2 slide · E/R1 Showstopper · Q/L1 Showboat","tags":["arcade","co-op","top-down","pixel art","comedy","boss fights"]}}};
MT.BUILD = "2026-11-04T14:28:08.528Z";
let game = null;                       // the E.Game (made in 90-main)
const TAU = Math.PI * 2;
MT.VERSION = '1.0.0';
MT.cfg = { skipRigs: false };          // tests set skipRigs to skip rig animation (fast headless runs)

// ---------------------------------------------------------------------------------------------------------------
// Arena geometry: a 23 x 15 TileMap (368 x 240 world units); walls on the border; door gaps of 3 cells on each side.
const AR = { W: 368, H: 240, CX: 184, CY: 120, X0: 16, Y0: 16, X1: 352, Y1: 224, COLS: 23, ROWS: 15, IC: 21, IR: 13 };
const DOORS = {
  N: { id: 'N', x: 184, y: 8, cells: [[10, 0], [11, 0], [12, 0]], nx: 0, ny: 1, opp: 'S', ang: Math.PI / 2 },
  S: { id: 'S', x: 184, y: 232, cells: [[10, 14], [11, 14], [12, 14]], nx: 0, ny: -1, opp: 'N', ang: -Math.PI / 2 },
  W: { id: 'W', x: 8, y: 120, cells: [[0, 6], [0, 7], [0, 8]], nx: 1, ny: 0, opp: 'E', ang: 0 },
  E: { id: 'E', x: 360, y: 120, cells: [[22, 6], [22, 7], [22, 8]], nx: -1, ny: 0, opp: 'W', ang: Math.PI },
};
const DOOR_IDS = ['N', 'E', 'S', 'W'];
/** interior cell [cx, cy] (0..20, 0..12) -> world point */
const cellW = (cx, cy) => [24 + cx * 16, 24 + cy * 16];
const inInterior = (x, y, m = 0) => x >= AR.X0 + m && x <= AR.X1 - m && y >= AR.Y0 + m && y <= AR.Y1 - m;
const clampInterior = (o, m = 6) => { o.x = clamp(o.x, AR.X0 + m, AR.X1 - m); o.y = clamp(o.y, AR.Y0 + m, AR.Y1 - m); return o; };
MT.AR = AR; MT.DOORS = DOORS; MT.cellW = cellW;

// ---------------------------------------------------------------------------------------------------------------
// Seeded random streams: gameplay draws only from these (Math.random only for cosmetics). fx is cosmetic.
const RNG = { spawn: E.rng(1), drops: E.rng(2), ai: E.rng(3), fx: E.rng(4), prize: E.rng(5) };
MT.rng = RNG;
MT.seedAll = seed => { seed = seed >>> 0; RNG.seed = seed; RNG.spawn = E.rng(seed * 31 + 1); RNG.drops = E.rng(seed * 37 + 2); RNG.ai = E.rng(seed * 41 + 3); RNG.fx = E.rng(seed * 43 + 4); RNG.prize = E.rng(seed * 47 + 5); };
const rr = (R, a, b) => a + R() * (b - a);
const ri = (R, a, b) => Math.floor(a + R() * (b - a + 1));
const rpick = (R, list) => list[Math.floor(R() * list.length) % list.length];
const rshuffle = (R, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------------------------------------------------------
// Tuning: every balance number logic reads lives here. MT.T.<key> is live; dev mode has a slider for each.
const TDEF = [
  // key, label, default, min, max, step, group
  ['playerSpeed', 'Player speed', 95, 50, 160, 5, 'PLAYER'],
  ['fireRate', 'Blaster shots per second', 9, 3, 20, 1, 'PLAYER'],
  ['bulletSpeed', 'Player bullet speed', 330, 150, 600, 10, 'PLAYER'],
  ['dmgMul', 'Player damage ×', 1, .25, 4, .25, 'PLAYER'],
  ['slideSpeed', 'Slide speed', 235, 120, 400, 5, 'PLAYER'],
  ['slideCooldown', 'Slide cooldown (s)', .85, .2, 3, .05, 'PLAYER'],
  ['invulnTime', 'Invulnerability after a hit (s)', 1.2, .2, 3, .1, 'PLAYER'],
  ['hpPerLife', 'HP per life (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['startLives', 'Starting lives (0 = difficulty)', 0, 0, 9, 1, 'PLAYER'],
  ['puDuration', 'Power-up duration ×', 1, .25, 3, .25, 'PLAYER'],
  ['enemySpeed', 'Enemy speed ×', 1, .25, 2.5, .05, 'ENEMIES'],
  ['enemyHp', 'Enemy HP ×', 1, .25, 4, .25, 'ENEMIES'],
  ['enemyBulletSpeed', 'Enemy bullet speed ×', 1, .25, 2.5, .05, 'ENEMIES'],
  ['contactDmg', 'Contact damage', 1, 0, 3, 1, 'ENEMIES'],
  ['waveSize', 'Wave size ×', 1.7, .25, 3, .05, 'ENEMIES'],
  ['spawnGap', 'Spawn gap ×', 2.2, .25, 3, .05, 'ENEMIES'],
  ['waveGap', 'Least seconds between waves', 6, 0, 10, .5, 'ENEMIES'],
  ['bossHp', 'Boss HP ×', 1, .1, 4, .1, 'ENEMIES'],
  ['dropMul', 'Drop chance ×', 1, 0, 5, .25, 'ECONOMY'],
  ['cashMul', 'Cash ×', 1, .25, 5, .25, 'ECONOMY'],
  ['ratingsGain', 'Ratings gain ×', .6, 0, 5, .05, 'SHOW'],
  ['ratingsDecay', 'Ratings decay per second', 3, 0, 10, .5, 'SHOW'],
  ['primeTime', 'Prime Time length (s)', 12, 3, 30, 1, 'SHOW'],
  ['camZoom', 'Camera zoom ×', 1, .6, 1.6, .05, 'CAMERA & TIME'],
  ['shakeMul', 'Screen shake ×', 1, 0, 2, .1, 'CAMERA & TIME'],
  ['timeScale', 'Game speed', 1, .1, 3, .05, 'CAMERA & TIME'],
].map(([key, label, def, min, max, step, group]) => ({ key, label, def, min, max, step, group }));
MT.TDEF = TDEF;
MT.T = {};
const TUNE_KEY = 'mashtv:tuning';
MT.tuneSpec = key => TDEF.find(d => d.key === key);
MT.setTune = (key, v, save = true) => {
  const d = MT.tuneSpec(key); if (!d) return undefined;
  v = Math.round(clamp(+v, d.min, d.max) / d.step) * d.step; v = +v.toFixed(4);
  MT.T[key] = v;
  if (key === 'timeScale' && game && !MT.sessionActive()) game.timeScale = v;
  if (save) MT.saveTunes();
  return v;
};
MT.resetTunes = (key) => { for (const d of TDEF) if (!key || d.key === key) MT.T[d.key] = d.def; if (game && (!key || key === 'timeScale')) game.timeScale = 1; MT.saveTunes(); };
MT.saveTunes = () => { if (MT.sessionActive && MT.sessionActive()) return; const out = {}; for (const d of TDEF) if (MT.T[d.key] !== d.def) out[d.key] = MT.T[d.key]; E.store.set(TUNE_KEY, out); };
MT.loadTunes = () => { for (const d of TDEF) MT.T[d.key] = d.def; const s = E.store.get(TUNE_KEY, null); if (s && typeof s === 'object') for (const k in s) if (MT.tuneSpec(k)) MT.setTune(k, s[k], false); };
MT.tunesChanged = () => TDEF.filter(d => MT.T[d.key] !== d.def);
MT.exportTuning = () => { const out = {}; for (const d of MT.tunesChanged()) out[d.key] = MT.T[d.key]; return JSON.stringify(out); };
for (const d of TDEF) MT.T[d.key] = d.def;

// Cheats (dev mode); they mark the run as dev-touched (no high score)
MT.cheats = { god: false, infBombs: false, oneHit: false, freeze: false, noclip: false, autopilot: false, botPartner: false, muteHost: false };
MT.devActive = () => MT.tunesChanged().length > 0 || Object.keys(MT.cheats).some(k => MT.cheats[k]);

// ---------------------------------------------------------------------------------------------------------------
// The event bus: gameplay emits, reactions (lines, crowd, stings, banners) listen.
const BUS = {};
MT.on = (ev, fn) => { (BUS[ev] = BUS[ev] || []).push(fn); return () => { const l = BUS[ev]; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }; };
MT.emit = (ev, data) => { const l = BUS[ev]; if (!l) return; for (const fn of l.slice()) { try { fn(data); } catch (e) { if (game) game.fail('event ' + ev, e); else throw e; } } };

// ---------------------------------------------------------------------------------------------------------------
// Helpers
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const fmtMoney = money;
MT.money = money;
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const dist = (a, b) => Math.sqrt(dist2(a, b));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const approachAng = (a, t, d) => { const k = angDiff(a, t); return Math.abs(k) <= d ? t : a + Math.sign(k) * d; };
const easeOut = t => 1 - (1 - t) * (1 - t);
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => vars && vars[k] !== undefined ? vars[k] : m);
/** the session flag, filled in by 50-net.js */
MT.sessionActive = () => !!(MT.net && MT.net.active);
MT.overlay = { open: false, who: null };
MT.log = [];   // a short trail of notable events (tests read it)
const note = (s) => { MT.log.push(s); if (MT.log.length > 400) MT.log.shift(); };

// ---- 01-input.js ----
// ---- input: presets, the preset-sync hook (engine patch P1), contestant intent, the idle detector, touch-only ----
// A preset lists every action it uses, the menu's own included. Arrows aim in play and move the focus in menus.
const MASH_MENU = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'],
  right: ['KeyD', 'ArrowRight', 'Pad15'], start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], more: ['KeyM', 'Pad3'] };
const MASH_PLAY = { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  aimUp: ['ArrowUp'], aimDown: ['ArrowDown'], aimLeft: ['ArrowLeft'], aimRight: ['ArrowRight'],
  fire: ['Mouse0', 'Pad7'], slide: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad6', 'Pad0'],
  bomb: ['KeyE', 'Mouse2', 'Pad5', 'Pad1'], showboat: ['KeyQ', 'Pad4', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
MT.MASH_MENU = MASH_MENU; MT.MASH_PLAY = MASH_PLAY;
const CONTROL_NAMES = { fire: 'Fire', slide: 'Slide', bomb: 'Showstopper', showboat: 'Showboat', aimUp: 'Fire up (keyboard)',
  aimDown: 'Fire down (keyboard)', aimLeft: 'Fire left (keyboard)', aimRight: 'Fire right (keyboard)', tabL: false, tabR: false, reset: false, more: false };

/** the preset every player should use now: the menu's while the pause menu or one of our overlays is open */
function wantedPreset(g) {
  if (g.paused || MT.overlay.open || (g.shell && g.shell.screen)) return MASH_MENU;
  const s = g.scene; return (s && s.input && typeof s.input === 'object') ? s.input : MASH_MENU;
}
function installPresetHook() {
  E.HOOKS.input.push(g => {
    if (g !== game) return;
    const want = wantedPreset(g);
    for (const p of g.players) if (p.preset !== want) p.use(want);
  });
}

/** a contestant's intent this step from an input: { move, aim, fire, slide, bomb, showboat } (move and aim on the ground) */
function intentFrom(I, c) {
  const out = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'none' };
  if (!I || !I.map.fire) return out;   // (a menu preset: no play actions)
  const m = I.move(), d = game.view.screenDirToGround(m[0], m[1]), l = Math.hypot(d[0], d[1]);
  if (l > 1) { d[0] /= l; d[1] /= l; }
  out.move = [d[0], d[1]];
  const s = game.settings;
  if (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .35) {
    const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]);
    out.aim = Math.atan2(a[1], a[0]); out.fire = s.autoFire !== false || I.down('fire'); out.aimSrc = 'pad';
  } else {
    const ax = (I.down('aimRight') ? 1 : 0) - (I.down('aimLeft') ? 1 : 0), ay = (I.down('aimDown') ? 1 : 0) - (I.down('aimUp') ? 1 : 0);
    if (ax || ay) { const a = game.view.screenDirToGround(ax, ay); out.aim = Math.atan2(a[1], a[0]); out.fire = true; out.aimSrc = 'keys'; }
    else if (I === game.input && I.mouse && I.mouse.active && (I.lastDevice === 'mouse' || I.clock - I.mouse.t < 2)) {
      const mg = game.mouseGround();
      if (mg) { out.aim = Math.atan2(mg[1] - c.y, mg[0] - c.x); out.fire = I.down('fire'); out.aimSrc = 'mouse'; }
    } else if (I.down('fire')) { out.aim = c.lastAim !== undefined ? c.lastAim : c.facing; out.fire = true; out.aimSrc = 'trigger'; }
  }
  out.slide = I.pressed('slide'); out.bomb = I.pressed('bomb'); out.showboat = I.pressed('showboat');
  return out;
}
MT.intentFrom = intentFrom;

// ---------------------------------------------------------------------------------------------------------------
// The idle detector: any key, mouse button, mouse move over 8 px, wheel, touch, gamepad button or stick past .5, on any
// device (our own clock: E.Arcade.attract reads player 1 only). Tests use input.tap / input.feed, seen through anyPressed.
const IDLE = MT.idle = { t: 0, last: 0, mx: null, my: null, padPrev: '', inputCount: 0 };
IDLE.reset = () => { IDLE.t = 0; IDLE.inputCount++; };
function installIdle() {
  if (!HAS_DOM) return;
  const kick = () => IDLE.reset();
  window.addEventListener('keydown', e => { kick(); MT.touch.keyed = true; }, true);
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('wheel', e => { kick(); MT.wheelAcc = (MT.wheelAcc || 0) + Math.sign(e.deltaY); }, { capture: true, passive: true });
  window.addEventListener('touchstart', kick, { capture: true, passive: true });
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (IDLE.mx === null) { IDLE.mx = e.clientX; IDLE.my = e.clientY; return; }
    if (Math.hypot(e.clientX - IDLE.mx, e.clientY - IDLE.my) > 8) { IDLE.mx = e.clientX; IDLE.my = e.clientY; kick(); if (game && game.input) game.input.lastDevice = 'mouse'; }
  }, true);
  window.addEventListener('gamepadconnected', () => { kick(); MT.touch.pad = true; });
}
/** each step: a gamepad pressed, or any player's action pressed (tests' taps), resets the clock; else it counts up */
function idleStep(dt) {
  let any = false;
  for (const p of game.players) if (p.anyPressed() || p.clicked()) any = true;
  if (HAS_DOM && navigator.getGamepads) {
    let pads = []; try { pads = Array.from(navigator.getGamepads() || []); } catch (e) { /* blocked */ }
    let sig = '';
    for (const p of pads) {
      if (!p || p.connected === false) continue;
      MT.touch.pad = true;
      const b = p.buttons.map(x => x.pressed ? 1 : 0).join(''), ax = p.axes.some(v => Math.abs(v) > .5) ? 'A' : '';
      sig += p.index + b + ax + ';';
      if (b.includes('1') || ax) any = any || sig !== IDLE.padPrev;
    }
    IDLE.padPrev = sig;
  }
  if (any) IDLE.reset(); else IDLE.t += dt;
}
MT.idleStep = idleStep;
/** the mouse wheel since the last read: -1, 0 or +1 */
MT.wheelTake = () => { const v = MT.wheelAcc || 0; MT.wheelAcc = 0; return Math.sign(v); };

// ---------------------------------------------------------------------------------------------------------------
// Touch-only devices: no touch controls; the title says "Controller or keyboard required" (lifted by a key or a pad)
MT.touch = { keyed: false, pad: false, forced: null };
MT.touchOnly = () => {
  if (MT.touch.forced !== null) return MT.touch.forced && !MT.touch.keyed && !MT.touch.pad;
  if (!HAS_DOM) return false;
  if (MT.touch.keyed || MT.touch.pad) return false;
  let fine = true; try { fine = window.matchMedia('(any-pointer: fine)').matches; } catch (e) { /* none */ }
  let pads = false; try { pads = Array.from(navigator.getGamepads ? navigator.getGamepads() || [] : []).some(p => p && p.connected !== false); } catch (e) { /* none */ }
  return (navigator.maxTouchPoints || 0) > 0 && !fine && !pads;
};

// ---- 02-glyphs.js ----
// ---- glyphs: button icons drawn in pixels (the 5x7 font has no ✕ ○ □ △), keycaps and mouse buttons ----
// MT.glyph.draw(g, x, y, action, input, { scale }) draws the icon of the action's binding on the input's last device and
// returns its width; MT.glyph.prompt(g, x, y, [[action, 'TEXT'], ...], input, o) draws a row of icons with labels.
const GLYPH = MT.glyph = {};
const PS_FACE = { 0: ['x', '#7aa8ff'], 1: ['o', '#ff6a6a'], 2: ['s', '#ff8ad8'], 3: ['t', '#5fe0a0'] };
const XB_FACE = { 0: ['A', '#5fd068'], 1: ['B', '#ff5a5a'], 2: ['X', '#4aa0ff'], 3: ['Y', '#ffd23a'] };
const PS_NAMES = { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3' };
const XB_NAMES = { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' };
const KEY_SHORT = { Escape: 'ESC', Enter: 'ENTER', NumpadEnter: 'ENTER', Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Backspace: 'BKSP',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB' };
GLYPH.family = I => (I && I.glyphs === 'xbox') ? 'xbox' : 'playstation';
GLYPH.device = I => !I ? 'keyboard' : I.lastDevice === 'gamepad' ? 'gamepad' : I.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
/** the code shown for an action: a pad button on a pad, else a key (or the mouse button on the mouse) */
GLYPH.codeFor = (action, I, dev = GLYPH.device(I)) => {
  if (action === 'move' || action === 'aim' || action === 'dpad' || action === 'arrows') return action;
  const m = I && I.map[action]; if (!m) return null;
  const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  const pads = real.filter(c => /^Pad\d+$/.test(c)), keys = real.filter(c => !/^Pad/.test(c));
  if (dev === 'gamepad') return pads[0] || keys[0] || null;
  if (dev === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
};
const tw = (s, sc) => E.font.width(s, { scale: sc });
const txt = (g, s, x, y, c, sc, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ scale: sc, outline: false }, o));
function capWidth(label, s) { return Math.max(11 * s, tw(label, s) + 6 * s); }
/** width of one icon */
GLYPH.width = (action, I, o = {}) => {
  const s = o.scale || 1, code = GLYPH.codeFor(action, I, o.device);
  if (!code) return 0;
  return iconFor(null, 0, 0, code, I, s, true);
};
function iconFor(g, x, y, code, I, s, measure) {
  const fam = GLYPH.family(I), dev = GLYPH.device(I);
  if (code === 'move') { if (dev === 'gamepad') return stick(g, x, y, 'L', s, measure); return keycap(g, x, y, 'WASD', s, measure); }
  if (code === 'aim') { if (dev === 'gamepad') return stick(g, x, y, 'R', s, measure); return mouse(g, x, y, 0, s, measure); }
  if (code === 'dpad' || code === 'arrows') { if (dev === 'gamepad') return dpad(g, x, y, s, measure); return keycap(g, x, y, '↑↓←→', s, measure); }
  if (/^Pad\d+$/.test(code)) {
    const n = +code.slice(3);
    if (n <= 3) return face(g, x, y, n, fam, s, measure);
    if (n >= 12 && n <= 15) return dpad(g, x, y, s, measure, n - 12);
    const name = (fam === 'xbox' ? XB_NAMES : PS_NAMES)[n] || ('B' + n);
    if (n >= 4 && n <= 7) return tab(g, x, y, name, s, measure, n >= 6);
    if (n === 10 || n === 11) return stick(g, x, y, n === 10 ? 'L' : 'R', s, measure);
    return pill(g, x, y, name, s, measure);
  }
  if (code.startsWith('Mouse')) return mouse(g, x, y, +code.slice(5), s, measure);
  const label = KEY_SHORT[code] || (I ? I.codeLabel(code) : code).toUpperCase();
  return keycap(g, x, y, label, s, measure);
}
function face(g, x, y, n, fam, s, measure) {
  const w = 11 * s; if (measure) return w;
  const cx = x + 5.5 * s, cy = y + 5.5 * s, R = 5.5 * s;
  if (fam === 'xbox') {
    const [L, col] = XB_FACE[n]; const t = E.tones(col);
    px.disc(g, cx, cy, R, t.deep); px.disc(g, cx, cy, R - s, col); px.disc(g, cx - s, cy - s, R - 2.5 * s, t.lt);
    txt(g, L, cx + .5, y + 2 * s, '#140a24', s, { align: 'center' });
    return w;
  }
  const [sym, col] = PS_FACE[n];
  px.disc(g, cx, cy, R, '#0c0618'); px.disc(g, cx, cy, R - s * .8, '#2a2140');
  const k = s, L = 2.6 * s;
  if (sym === 'x') { px.line(g, cx - L, cy - L, cx + L, cy + L, col, Math.max(1, k)); px.line(g, cx - L, cy + L, cx + L, cy - L, col, Math.max(1, k)); }
  else if (sym === 'o') { px.disc(g, cx, cy, 3 * s, col); px.disc(g, cx, cy, 3 * s - Math.max(1, k), '#2a2140'); }
  else if (sym === 's') { const a = Math.round(cx - L), b = Math.round(cy - L), z = Math.round(L * 2); px.rect(g, a, b, z, k, col); px.rect(g, a, b + z - k, z, k, col); px.rect(g, a, b, k, z, col); px.rect(g, a + z - k, b, k, z, col); }
  else { px.line(g, cx, cy - L - s * .3, cx - L - s * .2, cy + L * .8, col, k); px.line(g, cx, cy - L - s * .3, cx + L + s * .2, cy + L * .8, col, k); px.line(g, cx - L - s * .2, cy + L * .8, cx + L + s * .2, cy + L * .8, col, k); }
  return w;
}
function tab(g, x, y, name, s, measure, trigger) {
  const w = Math.max(15 * s, tw(name, s) + 6 * s); if (measure) return w;
  const h = 11 * s, c = trigger ? '#3a3156' : '#2f2848';
  px.rect(g, x + s, y, w - 2 * s, h, '#0c0618'); px.rect(g, x, y + s, w, h - 2 * s, '#0c0618');
  px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, c); px.rect(g, x + s, y + s, w - 2 * s, s, '#5a4f80');
  if (trigger) px.rect(g, x + 2 * s, y + h - 3 * s, w - 4 * s, s, '#1c1630');
  txt(g, name, x + w / 2, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function pill(g, x, y, name, s, measure) {
  const w = tw(name, s) + 8 * s; if (measure) return w;
  const h = 11 * s;
  px.rect(g, x + 2 * s, y, w - 4 * s, h, '#0c0618'); px.rect(g, x, y + 2 * s, w, h - 4 * s, '#0c0618'); px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, '#0c0618');
  px.rect(g, x + 2 * s, y + s, w - 4 * s, h - 2 * s, '#3a3156'); px.rect(g, x + s, y + 2 * s, w - 2 * s, h - 4 * s, '#3a3156');
  txt(g, name, x + w / 2, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function stick(g, x, y, L, s, measure) {
  const w = 11 * s; if (measure) return w;
  const cx = x + 5.5 * s, cy = y + 5.5 * s;
  px.disc(g, cx, cy, 5.5 * s, '#0c0618'); px.disc(g, cx, cy, 4.6 * s, '#5a4f80'); px.disc(g, cx, cy, 3.4 * s, '#2a2140');
  txt(g, L, cx + .5, y + 2 * s, '#f4eeff', s, { align: 'center' });
  return w;
}
function dpad(g, x, y, s, measure, lit = -1) {
  const w = 11 * s; if (measure) return w;
  const c = '#3a3156', on = '#ffcc33';
  px.rect(g, x + 3 * s, y, 5 * s, 11 * s, '#0c0618'); px.rect(g, x, y + 3 * s, 11 * s, 5 * s, '#0c0618');
  px.rect(g, x + 4 * s, y + s, 3 * s, 9 * s, c); px.rect(g, x + s, y + 4 * s, 9 * s, 3 * s, c);
  if (lit === 0) px.rect(g, x + 4 * s, y + s, 3 * s, 3 * s, on); if (lit === 1) px.rect(g, x + 4 * s, y + 7 * s, 3 * s, 3 * s, on);
  if (lit === 2) px.rect(g, x + s, y + 4 * s, 3 * s, 3 * s, on); if (lit === 3) px.rect(g, x + 7 * s, y + 4 * s, 3 * s, 3 * s, on);
  return w;
}
function keycap(g, x, y, label, s, measure) {
  const w = capWidth(label, s); if (measure) return w;
  const h = 11 * s;
  px.rect(g, x, y, w, h, '#0c0618'); px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, '#e8e0f4'); px.rect(g, x + s, y + h - 3 * s, w - 2 * s, 2 * s, '#a89cc4');
  txt(g, label, x + w / 2, y + 2 * s, '#140a24', s, { align: 'center' });
  return w;
}
function mouse(g, x, y, btn, s, measure) {
  const w = 9 * s; if (measure) return w;
  const h = 11 * s, lit = '#ffcc33', body = '#e8e0f4';
  px.rect(g, x + s, y, w - 2 * s, h, '#0c0618'); px.rect(g, x, y + s, w, h - 2 * s, '#0c0618');
  px.rect(g, x + s, y + s, w - 2 * s, h - 2 * s, body);
  if (btn === 0) px.rect(g, x + s, y + s, 3 * s, 4 * s, lit);
  if (btn === 2) px.rect(g, x + 5 * s, y + s, 3 * s, 4 * s, lit);
  if (btn === 1 || btn === -1) px.rect(g, x + 4 * s, y + s, s, 4 * s, btn === 1 ? lit : '#a89cc4');
  px.rect(g, x + 4 * s, y + s, s, 4 * s, '#a89cc4'); px.rect(g, x + s, y + 5 * s, w - 2 * s, s, '#a89cc4');
  if (btn === -1) { px.rect(g, x + 2 * s, y + 7 * s, 5 * s, s, '#6a5f90'); px.rect(g, x + 4 * s, y + 6 * s, s, 3 * s, '#6a5f90'); }
  return w;
}
/** draw the icon of one code ('Pad0', 'KeyE', 'Mouse2') on the input's glyph family */
GLYPH.drawCode = (g, x, y, code, I, o = {}) => iconFor(g, Math.round(x), Math.round(y), code, I, o.scale || 1, false);
GLYPH.draw = (g, x, y, action, I, o = {}) => {
  const s = o.scale || 1, code = GLYPH.codeFor(action, I, o.device);
  if (!code) return 0;
  return iconFor(g, Math.round(x), Math.round(y), code, I, s, false);
};
/** a row of [action, label] pairs; o: { scale, color, align: 'left' | 'center' | 'right', gap }. Returns its width */
GLYPH.measure = (items, I, o = {}) => {
  const s = o.scale || 1, gap = (o.gap === undefined ? 8 : o.gap) * s;
  let w = 0;
  items.forEach(([a, t], i) => { const iw = GLYPH.width(a, I, o); w += iw + (t ? 3 * s + tw(t, s) : 0) + (i < items.length - 1 ? gap : 0); });
  return w;
};
GLYPH.prompt = (g, x, y, items, I, o = {}) => {
  const s = o.scale || 1, gap = (o.gap === undefined ? 8 : o.gap) * s, w = GLYPH.measure(items, I, o);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  cx = Math.round(cx);
  for (const [a, t] of items) {
    cx += GLYPH.draw(g, cx, y, a, I, o);
    if (t) { cx += 3 * s; txt(g, t, cx, y + 2 * s, o.color || '#fff7e8', s, { shadow: '#000' }); cx += tw(t, s); }
    cx += gap;
  }
  return w;
};
/** a prompt as plain text, for tests and logs: [✕] SELECT, [Esc] BACK */
GLYPH.describe = (action, I) => {
  const code = GLYPH.codeFor(action, I); if (!code) return '';
  if (/^Pad\d+$/.test(code)) { const n = +code.slice(3), fam = GLYPH.family(I); if (n <= 3) return fam === 'xbox' ? XB_FACE[n][0] : ['✕', '○', '□', '△'][n]; return (fam === 'xbox' ? XB_NAMES : PS_NAMES)[n] || code; }
  if (code === 'move') return GLYPH.device(I) === 'gamepad' ? 'L-STICK' : 'WASD';
  if (code === 'aim') return GLYPH.device(I) === 'gamepad' ? 'R-STICK' : 'MOUSE';
  if (code.startsWith('Mouse')) return ['LEFT CLICK', 'MIDDLE CLICK', 'RIGHT CLICK'][+code.slice(5)] || code;
  return KEY_SHORT[code] || I.codeLabel(code).toUpperCase();
};

// ---- 03-audio-music.js ----
// ---- music: original songs in the engine's step notation (16 steps a bar), layers, stings, the music director ----
const bars = (...b) => b.join(' | ');
const SONGS = MT.SONGS = {
  theme: { bpm: 132, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .13, notes: bars(
      'G4 . C5 . E5 . G5 - - . E5 . G5 . A5 -', 'G5 - - - E5 - C5 - D5 - - - . . . .', 'A4 . D5 . F5 . A5 - - . F5 . A5 . B5 -', 'A5 - - - F5 - D5 - E5 - - - . . . .',
      'G4 . C5 . E5 . G5 - - . E5 . G5 . C6 -', 'B5 - A5 - G5 - E5 - F5 - - - A5 - - -', 'G5 - E5 - C5 - E5 - D5 - B4 - G4 - B4 -', 'C5 - - - - - G4 . C5 . . . . . . .') },
    { name: 'brass', wave: 'pulse12', vol: .07, notes: bars(
      '. . E4 . . . E4 . . . E4 . . . G4 .', '. . E4 . . . E4 . . . F4 . . . G4 .', '. . F4 . . . F4 . . . F4 . . . A4 .', '. . D4 . . . D4 . . . F4 . . . G4 .',
      '. . E4 . . . E4 . . . E4 . . . G4 .', '. . A4 . . . A4 . . . B4 . . . B4 .', '. . G4 . . . G4 . . . F4 . . . F4 .', '. . E4 . . . . . E4 . . . . . . .') },
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars(
      'C3 . C3 . G2 . G2 . C3 . C3 . E3 . G2 .', 'C3 . C3 . G2 . G2 . A2 . A2 . G2 . . .', 'D3 . D3 . A2 . A2 . D3 . D3 . F3 . A2 .', 'G2 . G2 . D3 . D3 . G2 . G2 . B2 . . .',
      'C3 . C3 . G2 . G2 . C3 . C3 . E3 . G2 .', 'F2 . F2 . C3 . C3 . F2 . F2 . G2 . G2 .', 'C3 . C3 . E3 . E3 . G2 . G2 . G2 . B2 .', 'C3 . . . G2 . . . C3 . . . . . . .') },
    { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h h k . h . s . h o' } ] },
  studioBattle: { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .12, notes: bars(
      'E5 . . E5 . . G5 . A5 . . G5 . . E5 .', 'D5 . E5 - - - . . B4 . D5 . E5 . . .', 'G5 . . G5 . . A5 . B5 . . A5 . . G5 .', 'F#5 . G5 - - - . . A5 . G5 . F#5 . D5 .',
      'E5 . . E5 . . G5 . A5 . . G5 . . E5 .', 'D5 . E5 - - - . . G5 . A5 . B5 . . .', 'C6 - B5 - A5 - G5 - A5 - G5 - E5 - D5 -', 'E5 - - - . . . . B4 . D5 . E5 . . .') },
    { name: 'chops', wave: 'pulse12', vol: .06, notes: bars('. . B4 . . . B4 . . . B4 . . B4 . .', '. . B4 . . . B4 . . . A4 . . G4 . .', '. . G4 . . . G4 . . . E4 . . G4 . .', '. . A4 . . . A4 . . . F#4 . . A4 . .') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('E2 . E3 . . E2 . E2 G2 . A2 . A3 . G2 .', 'E2 . E3 . . E2 . E2 D3 . B2 . A2 . G2 .', 'C2 . C3 . . C2 . C2 E2 . G2 . C3 . B2 .', 'D2 . D3 . . D2 . D2 F#2 . A2 . D3 . B2 .') },
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h k s . h . k . h k s . h o' },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: bars('E4 - . . . . . . . . . . E4 . G4 .', '. . . . . . . . . . . . . . . .', 'C5 - . . . . . . . . . . C5 . E5 .', 'D5 - . . . . . . D5 . . . F#5 - - -') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 't . t . . t . t t . t . s s s s' } ] },
  warehouseFunk: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .11, notes: bars(
      'A5 - . A5 . . C6 . . A5 . G5 - . E5 .', 'F5 - . F5 . . A5 . . G5 . E5 - . . .', 'D5 - . D5 . . F5 . . E5 . D5 - . C5 .', 'E5 - - - . . . . G5 . A5 . B5 . . .',
      'A5 - . A5 . . C6 . . D6 . C6 - . A5 .', 'F5 - . F5 . . A5 . . C6 . A5 - . . .', 'G5 - . F5 . . E5 . . D5 . E5 - . C5 .', 'A4 - - - . . . . E5 . A5 . . . . .') },
    { name: 'strings', wave: 'saw', vol: .045, notes: bars('A4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -', 'E4 - - - - - - - G#4 - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('A2 . A3 . A2 . A3 . A2 . A3 . G2 . G3 .', 'F2 . F3 . F2 . F3 . F2 . F3 . E2 . E3 .', 'D2 . D3 . D2 . D3 . D2 . D3 . E2 . E3 .', 'A2 . A3 . A2 . A3 . G2 . G3 . E2 . E3 .') },
    { name: 'kick', wave: 'drums', vol: .15, notes: 'k . . . k . . . k . . . k . . .' },
    { name: 'drums', wave: 'drums', vol: .12, notes: '. . o . s . o . . . o . s . o o' },
    { name: 'prime', wave: 'saw', vol: .08, on: false, notes: bars('. . . . A4 . C5 . . . . . E5 - - .', '. . . . F4 . A4 . . . . . C5 - - .', '. . . . D4 . F4 . . . . . A4 - - .', '. . . . E4 . G#4 . . . . . B4 - - .') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 'h h h h h h h h h h h h t t s s' } ] },
  finaleOverture: { bpm: 160, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .11, notes: bars(
      'D5 - - - A5 - - - F5 - E5 - D5 - C5 -', 'D5 - - - - - - - A4 - - - - - - -', 'D5 - - - A5 - - - C6 - Bb5 - A5 - G5 -', 'A5 - - - - - - - E5 - - - C#5 - - -',
      'F5 - - - D6 - - - C6 - Bb5 - A5 - G5 -', 'F5 - - - E5 - - - D5 - - - C#5 - - -', 'D5 - E5 - F5 - G5 - A5 - - - Bb5 - A5 -', 'A5 - - - - - - - . . . . . . . .') },
    { name: 'strings', wave: 'saw', vol: .055, notes: bars(
      'D4 F4 A4 F4 D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4', 'Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4',
      'D4 F4 A4 F4 D4 F4 A4 F4 F4 A4 C5 A4 F4 A4 C5 A4', 'G4 Bb4 D5 Bb4 G4 Bb4 D5 Bb4 A4 C#5 E5 C#5 A4 C#5 E5 G5') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('D2 . D2 . D2 . D2 . D2 . D2 . C2 . C2 .', 'Bb1 . Bb1 . Bb1 . Bb1 . A1 . A1 . A1 . A1 .', 'D2 . D2 . D2 . D2 . F2 . F2 . F2 . F2 .', 'G2 . G2 . G2 . G2 . A1 . A1 . C#2 . E2 .') },
    { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h . s . h . k k h . s . h h' },
    { name: 'prime', wave: 'pulse12', vol: .08, on: false, notes: bars('D6 . A5 . F5 . D5 . D6 . A5 . F5 . C6 .', 'Bb5 . F5 . D5 . Bb4 . A5 . E5 . C#5 . A4 .', 'D6 . A5 . F5 . D5 . F6 . C6 . A5 . F5 .', 'G5 . D6 . Bb5 . G5 . A5 . E6 . C#6 . A5 .') },
    { name: 'intense', wave: 'drums', vol: .1, on: false, notes: 'c . t . t . t t c . t . s s s s' } ] },
  bossShowdown: { bpm: 170, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .11, notes: bars('C5 - Eb5 - G5 - C6 - B5 - G5 - Ab5 - G5 -', 'F5 - Eb5 - D5 - Eb5 - F5 - G5 - - - . .', 'C5 - Eb5 - G5 - C6 - D6 - C6 - Bb5 - Ab5 -', 'G5 - - - F5 - - - Eb5 - D5 - B4 - D5 -') },
    { name: 'bass', wave: 'triangle', vol: .34, notes: bars('C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 Eb2 Eb2 Eb3 Eb2', 'Ab1 Ab1 Ab2 Ab1 Ab1 Ab1 Ab2 Ab1 Bb1 Bb1 Bb2 Bb1 B1 B1 B2 B1') },
    { name: 'drums', wave: 'drums', vol: .16, notes: 'k . h k s . h k k . h k s . s s' },
    { name: 'phase2', wave: 'pulse', vol: .07, on: false, notes: bars('C6 G5 Eb5 C5 C6 G5 Eb5 C5 C6 G5 Eb5 C5 Eb6 Bb5 G5 Eb5', 'Ab5 Eb5 C5 Ab4 Ab5 Eb5 C5 Ab4 Bb5 F5 D5 Bb4 B5 G5 D5 B4') } ] },
  commercial: { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: bars('C5 . F5 . A5 . F5 . C6 - - . A5 . . .', 'Bb5 . A5 . G5 . F5 . G5 - - - . . . .', 'C5 . E5 . G5 . E5 . Bb5 - - . G5 . . .', 'A5 . G5 . F5 . E5 . F5 - - - . . . .') },
    { name: 'glock', wave: 'sine', vol: .08, notes: bars('. . . . A6 . . . . . . . C7 . . .', '. . . . D7 . . . . . . . G6 . . .', '. . . . G6 . . . . . . . Bb6 . . .', '. . . . A6 . . . . . . . F6 . . .') },
    { name: 'bass', wave: 'triangle', vol: .3, notes: bars('F2 . . . C3 . . . F2 . . . C3 . . .', 'Bb2 . . . F2 . . . C3 . . . G2 . . .', 'C3 . . . G2 . . . C3 . . . E2 . . .', 'F2 . . . C3 . . . F2 . C3 . F2 . . .') },
    { name: 'drums', wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h .' } ] },
  recap: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'sine', vol: .14, notes: bars('F5 - - - D5 - Bb4 - C5 - D5 - - - . .', 'Eb5 - - - C5 - A4 - Bb4 - C5 - - - . .', 'D5 - F5 - Bb5 - - - A5 - G5 - F5 - . .', 'G5 - - - F5 - - - . . . . . . . .') },
    { name: 'rhodes', wave: 'triangle', vol: .08, notes: bars('D4 - - - - - F4 - - - - - A4 - - -', 'C4 - - - - - Eb4 - - - - - G4 - - -', 'D4 - - - - - F4 - - - - - Bb4 - - -', 'C4 - - - - - F4 - - - - - A4 - - -') },
    { name: 'bass', wave: 'triangle', vol: .28, notes: bars('Bb2 . . . . . F2 . Bb2 . . . D3 . . .', 'Eb2 . . . . . Bb2 . Eb2 . . . G2 . . .', 'Bb2 . . . . . F2 . G2 . . . D3 . . .', 'F2 . . . . . C3 . F2 . . . A2 . . .') },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . h . . h . k . . h . . h .' } ] },
  ending: { bpm: 96, steps: 4, tracks: [
    { name: 'lead', wave: 'triangle', vol: .17, notes: bars(
      'G4 - C5 - E5 - G5 - - - E5 - G5 - A5 -', 'G5 - - - - - - - E5 - - - C5 - - -', 'F5 - - - E5 - - - D5 - - - C5 - - -', 'D5 - - - - - - - G4 - - - - - - -',
      'G4 - C5 - E5 - G5 - - - E5 - G5 - C6 -', 'B5 - - - A5 - - - G5 - - - F5 - - -', 'E5 - - - D5 - - - G5 - - - B4 - - -', 'C5 - - - - - - - - - - - - - - -') },
    { name: 'pad', wave: 'sine', vol: .08, notes: bars('E4 - - - - - - - - - - - - - - -', 'G4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -',
      'E4 - - - - - - - - - - - - - - -', 'F4 - - - - - - - - - - - - - - -', 'D4 - - - - - - - - - - - - - - -', 'E4 - - - - - - - - - - - - - - -') },
    { name: 'bass', wave: 'triangle', vol: .26, notes: bars('C3 - - - - - - - G2 - - - - - - -', 'C3 - - - - - - - A2 - - - - - - -', 'F2 - - - - - - - C3 - - - - - - -', 'G2 - - - - - - - D3 - - - - - - -',
      'C3 - - - - - - - G2 - - - - - - -', 'F2 - - - - - - - A2 - - - - - - -', 'G2 - - - - - - - G2 - - - - - - -', 'C3 - - - - - - - - - - - - - - -') },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . . . h . . . s . . . h . . .' } ] },
};
const STINGS = MT.STINGS = {
  clear: { bpm: 180, steps: 4, tracks: [{ wave: 'square', vol: .16, notes: 'C5 E5 G5 C6 - - - . . . . . . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G2 . C3 - - - . . . . . .' }, { wave: 'drums', vol: .15, notes: 'k . . . . . c . . . . . . . . .' }] },
  prize: { bpm: 200, steps: 4, tracks: [{ wave: 'pulse', vol: .15, notes: 'G5 B5 D6 G6 - - F#6 - G6 - - - . . . .' }, { wave: 'triangle', vol: .28, notes: 'G3 . . . D3 . . . G3 - - - . . . .' }] },
  key: { bpm: 240, steps: 4, tracks: [{ wave: 'sine', vol: .2, notes: 'E6 G6 B6 E7 - - - - . . . . . . . .' }, { wave: 'triangle', vol: .12, notes: 'E5 . . . B5 . . . E6 - - - . . . .' }] },
  prime: { bpm: 170, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'C5 . C5 . C5 . G5 - - - E5 . G5 . C6 - - - - - . . . .' }, { wave: 'square', vol: .1, notes: 'E4 . E4 . E4 . B4 - - - G4 . B4 . E5 - - - - - . . . .' }, { wave: 'drums', vol: .16, notes: 'k . k . k . c . . . k . k . c . . . . . . . . .' }] },
  oneup: { bpm: 220, steps: 4, tracks: [{ wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 E6 G6 C7 - - - . . . . . .' }] },
  bankrupt: { bpm: 110, steps: 4, tracks: [{ wave: 'saw', vol: .14, notes: 'G4 - F#4 - F4 - E4 - - - - - - - . .' }, { wave: 'drums', vol: .12, notes: '. . . . . . . . c . . . . . . .' }] },
  gameover: { bpm: 80, steps: 4, tracks: [{ wave: 'saw', vol: .14, notes: 'G4 - - - F#4 - - - F4 - - - E4 - - - - - - - - - - - . . . .' }, { wave: 'triangle', vol: .24, notes: 'C3 - - - B2 - - - Bb2 - - - A2 - - - - - - - - - - - . . . .' }] },
  mash: { bpm: 180, steps: 4, tracks: [{ wave: 'saw', vol: .12, notes: 'C4 . C5 - - - . .' }, { wave: 'drums', vol: .2, notes: 'k . c . . . . .' }] },
  bossdown: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .15, notes: 'G4 . G4 . G4 . C5 - - - E5 - G5 - - - C6 - - - - - - - . . . .' }, { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . E3 - - - G3 - C3 - - - C3 - - - - - - - . . . .' }, { wave: 'drums', vol: .15, notes: 'k . k . k . c . . . k . s . . . c . . . . . . . . . . .' }] },
  tick: { bpm: 240, steps: 4, tracks: [{ wave: 'square', vol: .1, notes: 'A5 . . .' }] },
  wheel: { bpm: 240, steps: 4, tracks: [{ wave: 'drums', vol: .14, notes: 's s s s s s s s s s s s s s s s c . . .' }] },
  jingle: { bpm: 150, steps: 4, tracks: [{ wave: 'pulse', vol: .14, notes: 'C5 . E5 . G5 . A5 - G5 . E5 . C5 - - - . .' }, { wave: 'sine', vol: .08, notes: 'C6 . . . G6 . . . A6 . . . C7 - - - . .' }] },
};
/** the music director: one song at a time, crossfaded; layers by name */
const MUSIC = MT.music = { current: null, volMul: 1 };
MUSIC.play = (id, o = {}) => {
  if (!game) return;
  if (MUSIC.current === id && !o.restart) return;
  MUSIC.current = id;
  if (!id) { game.audio.stopMusic(o.fade === undefined ? .4 : o.fade); return; }
  const song = SONGS[id]; if (!song) return;
  game.audio.music(song, { fade: o.fade === undefined ? .6 : o.fade, restart: !!o.restart });
};
MUSIC.layer = (name, on, fade = .5) => { if (!game || !MUSIC.current) return; const s = SONGS[MUSIC.current]; if (!s || !s.tracks.some(t => t.name === name)) return; game.audio.layer(name, on ? 1 : 0, fade); };
MUSIC.sting = (id, o = {}) => { if (!game || !STINGS[id]) return; MT.lastSting = id; game.audio.sting(STINGS[id], { at: o.at || 'now', duck: o.duck === undefined ? .4 : o.duck }); };

// ---- 04-audio-sfx.js ----
// ---- sound effects: every sound defined as synth voices (no files); MT.sfx caps repeats per frame ----
const N = (freq, to, dur, vol, filter, o) => Object.assign({ wave: 'noise', freq, to, dur, vol, filter: filter || 'bandpass' }, o);
const V = (wave, freq, to, dur, vol, o) => Object.assign({ wave, freq, to, dur, vol }, o);
const SFX = MT.SFX = {
  // weapons: each with its own contour
  pew: [V('square', 1500, 600, .06, .09), V('triangle', 900, 300, .05, .06)],
  triple: [V('pulse', 1100, 500, .07, .08), V('pulse', 1500, 700, .06, .05, { delay: .012 })],
  rocket: [N(900, 2400, .25, .16, 'bandpass'), V('saw', 180, 420, .22, .06)],
  boom: [N(500, 80, .45, .4, 'lowpass'), V('sine', 120, 35, .4, .5)],
  bigboom: [N(400, 60, .8, .5, 'lowpass'), V('sine', 90, 28, .7, .6), N(2000, 300, .3, .2)],
  thunk: [V('sine', 220, 90, .09, .28), N(600, 300, .06, .15)],
  kernel: [N(3000, 1500, .03, .12, 'highpass')],
  laser: [V('saw', 140, 150, .14, .06, { vib: [30, .02] }), V('sine', 880, 890, .14, .04)],
  whirr: [V('triangle', 600, 900, .18, .06, { vib: [18, .1] })],
  shield: [V('sine', 300, 600, .3, .12, { vib: [9, .05] })],
  squeak: [V('square', 1800, 2600, .05, .06), V('square', 2200, 1600, .05, .05, { delay: .06 })],
  // contestants
  whoosh: [N(800, 3000, .2, .2, 'bandpass', { q: .8 })],
  flourish: [V('pulse', 'C5', null, .3, .1, { arp: [0, 4, 7, 12, 16], step: .05 })],
  flashbulb: [N(6000, 2000, .12, .3, 'highpass'), V('sine', 2400, 400, .1, .15), N(400, 70, .6, .4, 'lowpass', { delay: .05 }), V('sine', 110, 30, .5, .5, { delay: .05 })],
  buzzer: [V('square', 140, 120, .35, .14), V('saw', 147, 125, .35, .1)],
  wah: [V('saw', 400, 120, .7, .14, { vib: [6, .06] })],
  zip: [V('saw', 200, 1400, .35, .07)],
  land: [N(300, 100, .1, .25, 'lowpass'), V('sine', 160, 60, .1, .3)],
  kaching: [V('square', 'E6', null, .05, .08), V('square', 'B6', null, .18, .1, { delay: .05 }), N(5000, 7000, .15, .08, 'highpass', { delay: .05 })],
  chime: [V('sine', 'E6', null, .4, .14), V('sine', 'B6', null, .5, .1, { delay: .08 })],
  powerup: [V('square', 'C5', null, .32, .1, { arp: [0, 4, 7, 12, 16, 19, 24], step: .04 })],
  expire: [V('square', 900, 500, .05, .08), V('square', 500, 300, .07, .07, { delay: .07 })],
  oneup: [V('square', 'G5', null, .36, .11, { arp: [0, 4, 7, 12, 16, 19], step: .055 })],
  tick: [V('square', 1600, null, .02, .05)],
  // enemies
  grunt: [V('saw', 140, 90, .12, .07)],
  baton: [N(1200, 400, .12, .12, 'bandpass')],
  hop: [V('square', 300, 700, .06, .05)],
  clap: [N(1500, 1000, .04, .14, 'bandpass', { q: 1.5 }), N(1500, 1000, .04, .1, 'bandpass', { q: 1.5, delay: .05 })],
  hiss: [N(5000, 6000, .55, .1, 'highpass')],
  pop: [V('sine', 700, 120, .08, .25), N(2500, 800, .06, .18)],
  beep: [V('square', 1800, null, .05, .07)],
  pfft: [N(1200, 300, .2, .12, 'lowpass')],
  shimmer: [V('sine', 'C7', null, .3, .05, { arp: [0, 7, 12, 19], step: .05 })],
  zap: [V('saw', 1200, 200, .12, .07)],
  boo: [V('saw', 120, 95, .5, .07, { vib: [5, .05] })],
  splat: [N(700, 150, .22, .28, 'lowpass'), V('sine', 200, 60, .12, .2)],
  whine: [V('sine', 600, 2200, .4, .07)],
  shellboom: [N(450, 90, .4, .35, 'lowpass'), V('sine', 100, 40, .3, .4)],
  snakehiss: [N(4000, 5500, .4, .1, 'highpass', { q: 2 })],
  snap: [N(3000, 900, .05, .2, 'bandpass'), V('square', 900, 300, .04, .06)],
  roar: [V('saw', 110, 70, .7, .16, { vib: [12, .1] }), N(400, 200, .6, .18, 'lowpass')],
  stomp: [V('sine', 90, 40, .2, .45), N(250, 80, .2, .3, 'lowpass')],
  crash: [N(300, 60, .5, .4, 'lowpass'), N(3000, 600, .3, .2), V('sine', 80, 30, .4, .5)],
  confetti: [V('sine', 900, 200, .07, .16), N(5000, 2500, .1, .1, 'highpass')],
  tink: [V('square', 2400, 2300, .04, .06), V('sine', 3600, null, .08, .05)],
  // studio
  klaxon: [V('square', 520, 380, .22, .07), V('square', 520, 380, .22, .07, { delay: .25 })],
  rollup: [N(400, 1200, .35, .12, 'bandpass', { q: 3 })],
  slam: [N(260, 60, .25, .4, 'lowpass'), V('sine', 120, 50, .2, .4)],
  alarm: [V('square', 900, 700, .15, .06), V('square', 900, 700, .15, .06, { delay: .2 }), V('square', 900, 700, .15, .06, { delay: .4 })],
  pyro: [N(300, 1500, .6, .25, 'bandpass', { q: .7 })],
  drumroll: [N(1600, 1600, .9, .12, 'bandpass', { vib: [25, .5] })],
  wheelclick: [V('square', 2200, 1800, .015, .07)],
  static: [N(4000, 3000, .4, .14, 'highpass', { q: .4 })],
  channel: [N(2500, 6000, .08, .12, 'highpass'), V('square', 1200, 600, .04, .05)],
  shutter: [N(4000, 2000, .04, .18, 'highpass'), N(3000, 1500, .05, .14, 'highpass', { delay: .06 })],
  // ui
  blip: [V('square', 1100, null, .03, .07)],
  bell: [V('sine', 'A6', null, .3, .12), V('sine', 'E7', null, .25, .06, { delay: .02 })],
  back: [V('square', 700, 400, .07, .07)],
  page: [N(2500, 5000, .08, .1, 'bandpass')],
  slider: [V('square', 1600, null, .02, .05)],
  count: [V('square', 'A5', null, .09, .09)],
  countgo: [V('square', 'A6', null, .3, .1)],
};
function defineSfx() { for (const k in SFX) game.audio.define('mt_' + k, SFX[k]); }
const SFX_CAP = { frame: -1, counts: {} };
/** play a sound by name (capped at 3 of one sound per frame; nothing headless) */
MT.sfx = (name, o = {}) => {
  if (!game || game.headless) { MT.lastSfx = name; return; }
  if (!SFX[name]) return;
  const f = Math.floor(game.real * 120);
  if (SFX_CAP.frame !== f) { SFX_CAP.frame = f; SFX_CAP.counts = {}; }
  const n = SFX_CAP.counts[name] = (SFX_CAP.counts[name] || 0) + 1; if (n > 3) return;
  MT.lastSfx = name;
  game.audio.sfx('mt_' + name, o);
};

// ---- 05-babble.js ----
// ---- Babble: Animalese/Simlish voices by formant synthesis on the engine's audio context, and the studio crowd ----
// MT.babble.say(text, voiceId) schedules syllables and returns the line's duration (headless: the duration only).
// Voices go through the engine's effects bus (engine patch P4), so they follow volume and mute.
const VOICES = {
  lance: { f0: 135, speed: 13, wave: 'sawtooth', formant: 1, swoop: 1.35, vol: .5 },
  penny: { f0: 300, speed: 12, wave: 'pulse', formant: 1.18, swoop: 1.2, vol: .42, giggle: true },
  annc: { f0: 85, speed: 7, wave: 'sawtooth', formant: .85, swoop: 1.1, vol: .55, echo: true },
  network: { f0: 70, speed: 8, wave: 'square', formant: .8, swoop: 1, vol: .4, crush: true, mono: true },
  mashy: { f0: 110, speed: 9, wave: 'triangle', formant: .9, swoop: 1.5, vol: .6 },
  contestant1: { f0: 170, speed: 12, wave: 'pulse', formant: 1.05, swoop: 1.2, vol: .4 },
  contestant2: { f0: 200, speed: 12, wave: 'pulse', formant: 1.08, swoop: 1.2, vol: .4 },
  contestant3: { f0: 160, speed: 12, wave: 'pulse', formant: 1.02, swoop: 1.2, vol: .4 },
  contestant4: { f0: 240, speed: 12, wave: 'pulse', formant: 1.12, swoop: 1.2, vol: .4 },
  goon: { f0: 95, speed: 10, wave: 'sawtooth', formant: .9, swoop: 1.1, vol: .3 },
  sponsor: { f0: 220, speed: 10, wave: 'square', formant: 1.1, swoop: 1.3, vol: .38, sing: true },
};
const FORMANTS = { a: [800, 1200], e: [400, 2300], i: [300, 2800], o: [450, 800], u: [325, 700] };
const PLOSIVE = 'pbtdkgcq', FRICATIVE = 'fvszhxj', NASAL = 'mnlrwy';
const BAB = MT.babble = { voices: VOICES, active: 0 };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** split a line into syllables: { onset, vowel, word, emph, end ('?', '!', '.', ',', '...' or ''), first } */
function syllables(text) {
  const out = []; const words = String(text).split(/\s+/).filter(Boolean);
  for (const raw of words) {
    const end = /\.\.\.$/.test(raw) ? '...' : /[?]$/.test(raw) ? '?' : /[!]$/.test(raw) ? '!' : /[.]$/.test(raw) ? '.' : /[,;:—-]$/.test(raw) ? ',' : '';
    const w = raw.toLowerCase().replace(/[^a-z]/g, '');
    const emph = /[A-Z]{2,}/.test(raw) && raw === raw.toUpperCase();
    if (!w) { if (end && out.length) out[out.length - 1].end = end; continue; }
    const groups = []; const re = /([^aeiouy]*)([aeiouy]+)/g; let m;
    while ((m = re.exec(w)) && groups.length < 4) groups.push([m[1], m[2]]);
    if (!groups.length) groups.push([w, 'u']);
    const h = hashStr(w);
    groups.forEach(([cons, vow], k) => {
      const c = cons.slice(-1), cls = !c ? 'none' : PLOSIVE.includes(c) ? 'plosive' : FRICATIVE.includes(c) ? 'fric' : NASAL.includes(c) ? 'nasal' : 'none';
      const v = vow[0] === 'y' ? 'i' : vow[0];
      out.push({ onset: cls, vowel: v, h: (h >>> (k * 3)) & 1023, emph, end: k === groups.length - 1 ? end : '', first: k === 0 });
    });
  }
  return out;
}
BAB.syllables = syllables;
const PAUSE = { ',': .08, '.': .16, '!': .16, '?': .16, '...': .3, '': 0 };
/** how long a line takes in a voice (seconds) */
BAB.duration = (text, voiceId = 'lance', o = {}) => {
  const v = VOICES[voiceId] || VOICES.lance, sp = (o.speed || 1) * v.speed;
  let t = 0; for (const s of syllables(text)) t += 1 / sp + PAUSE[s.end];
  return Math.max(.3, t);
};
let BCTX = null;
function bctx() {
  const A = game && game.audio, c = A && A.ctx;
  if (!c || c.state !== 'running' || !A.bus || A.muted) return null;
  if (!BCTX || BCTX.ctx !== c) {
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const pulse = c.createPeriodicWave(...(() => { const n = 24, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * .25); return [re, im]; })());
    BCTX = { ctx: c, noise: nb, pulse, chains: {} };
  }
  return BCTX;
}
function chain(B, id) {
  if (B.chains[id]) return B.chains[id];
  const c = B.ctx, v = VOICES[id] || VOICES.lance, inp = c.createGain(); inp.gain.value = 1;
  let last = inp;
  if (v.crush) { const ws = c.createWaveShaper(), n = 256, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.round(x * 4) / 4; } ws.curve = cv; last.connect(ws); last = ws; }
  last.connect(game.audio.bus);
  if (v.echo) { const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain(); dl.delayTime.value = .19; fb.gain.value = .35; wet.gain.value = .45; last.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(game.audio.bus); }
  return (B.chains[id] = inp);
}
function syllableAt(B, out, v, t, dur, f0, vowel, onset, vol) {
  const c = B.ctx, F = FORMANTS[vowel] || FORMANTS.a;
  if (onset !== 'none') {
    const src = c.createBufferSource(); src.buffer = B.noise; const f = c.createBiquadFilter(), g = c.createGain();
    if (onset === 'plosive') { f.type = 'bandpass'; f.frequency.value = 2000 + Math.random() * 2000; f.Q.value = 1.2; g.gain.setValueAtTime(vol * .7, t); g.gain.exponentialRampToValueAtTime(.001, t + .015); src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * .5); src.stop(t + .03); }
    else if (onset === 'fric') { f.type = 'highpass'; f.frequency.value = 3500; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .35, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .05); src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * .5); src.stop(t + .07); }
    else { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f0 * .9; g.gain.setValueAtTime(vol * .5, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); o.connect(g); g.connect(out); o.start(t); o.stop(t + .05); }
    t += onset === 'plosive' ? .012 : .03;
  }
  const o = c.createOscillator();
  if (v.wave === 'pulse') o.setPeriodicWave(B.pulse); else o.type = v.wave;
  o.frequency.setValueAtTime(f0 * 1.03, t); o.frequency.linearRampToValueAtTime(f0 * (v.mono ? 1 : .97), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.setValueAtTime(vol, Math.max(t + .006, t + dur - .03)); g.gain.linearRampToValueAtTime(0, t + dur);
  for (const fq of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq * v.formant; bp.Q.value = 8; o.connect(bp); bp.connect(g); }
  const dry = c.createGain(); dry.gain.value = .12; o.connect(dry); dry.connect(g);
  g.connect(out); o.start(t); o.stop(t + dur + .02);
}
/** say a line: schedules it from now; returns its duration in seconds */
BAB.say = (text, voiceId = 'lance', o = {}) => {
  const dur = BAB.duration(text, voiceId, o);
  const B = bctx(); if (!B) return dur;
  const v = VOICES[voiceId] || VOICES.lance, sp = (o.speed || 1) * v.speed, out = chain(B, voiceId), syl = syllables(text);
  let t = B.ctx.currentTime + .02;
  const n = syl.length;
  syl.forEach((s, i) => {
    const step = 1 / sp, nuc = clamp(step * .82, .06, .12) * (v.sing ? 1.4 : 1);
    let k = 1;
    if (!v.mono) {
      const pos = i / Math.max(1, n - 1);
      k *= 1 + ((s.h % 9) - 4) * .01;                                   // ±4 % jitter
      k *= 1 + .02 * Math.sin(i * 1.7);                                  // vibrato-ish wobble
      if (s.emph) k *= 1.12;
      if (s.end === '!') k *= v.swoop; else if (s.end === '?') k *= 1.25; else if (s.end === '.' || s.end === '...') k *= .85;
      if (v.sing) k *= [1, 1.26, 1.5, 1.33, 1.12][i % 5];
      k *= 1 + .06 * (1 - pos);
    }
    syllableAt(B, out, v, t, nuc, v.f0 * k, s.vowel, s.onset, v.vol * (o.vol || 1) * .5);
    t += step + PAUSE[s.end];
  });
  if (v.giggle) for (let j = 0; j < 4; j++) syllableAt(B, out, v, t + j * .06, .05, v.f0 * (1.5 + j * .12), 'i', 'none', v.vol * .25);
  return dur;
};
/** the studio crowd: 'cheer' | 'ooh' | 'laugh' | 'applause' | 'boo' | 'murmur', intensity 0..1 */
BAB.crowd = (kind, intensity = .6) => {
  MT.lastCrowd = kind;
  const B = bctx(); if (!B) return;
  const c = B.ctx, out = chain(B, 'crowd'), t0 = c.currentTime + .01, I = clamp(intensity, .1, 1);
  const voice = (t, f, f2, d, vw, vol) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f2, t + d); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .05); g.gain.linearRampToValueAtTime(0, t + d); const F = FORMANTS[vw]; for (const fq of F) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 6; o.connect(bp); bp.connect(g); } g.connect(out); o.start(t); o.stop(t + d + .05); };
  const noise = (t, d, f, vol, type = 'bandpass') => { const s = c.createBufferSource(); s.buffer = B.noise; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = .7; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .08); g.gain.linearRampToValueAtTime(0, t + d); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + d + .05); };
  const n = Math.round(4 + 6 * I);
  if (kind === 'cheer') { for (let i = 0; i < n; i++) { const f = 180 + Math.random() * 260, d = .6 + Math.random() * .6; voice(t0 + Math.random() * .2, f, f * (1.2 + Math.random() * .3), d, Math.random() < .5 ? 'o' : 'e', .05 * I); } noise(t0, 1.2, 1800, .06 * I); }
  else if (kind === 'ooh') { for (let i = 0; i < n; i++) { const f = 160 + Math.random() * 200; voice(t0 + Math.random() * .1, f * 1.2, f * .8, .8, 'u', .05 * I); } }
  else if (kind === 'laugh') { for (let v = 0; v < 4; v++) { const f = 150 + Math.random() * 200; for (let k = 0; k < 6; k++) voice(t0 + v * .03 + k * .2, f, f * .9, .12, 'a', .05 * I); } }
  else if (kind === 'applause') { const m = Math.round(12 + 18 * I); for (let k = 0; k < m; k++) noise(t0 + Math.random() * 1.5, .04, 1200 + Math.random() * 1600, .12 * I); noise(t0, 1.6, 2500, .04 * I); }
  else if (kind === 'boo') { for (let i = 0; i < n; i++) { const f = 100 + Math.random() * 80; voice(t0 + Math.random() * .15, f, f * .9, .9, 'u', .05 * I); } }
  else { for (let i = 0; i < 6; i++) { const f = 120 + Math.random() * 120; voice(t0 + Math.random() * 1.5, f, f * .95, .15, 'aeiou'[i % 5], .015 * I); } }
};

// ---- 06-art-studio.js ----
// ---- the sets: floors, wall decorators, door painters, the dressing outside the arena, lights; studio props as shapes ----
const hn = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
const H2 = E.hex;
const rgb = h => { const v = H2(h); return [v[0], v[1], v[2]]; };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const shadeC = (c, k) => k >= 0 ? mixc(c, [255, 255, 255], k) : mixc(c, [0, 0, 0], -k);

// studio props, written as shapes (docs/ASSETS.md); a few store props come from assets/mash-props.js
function defineShapes() {
  const S = E.SHAPES;
  S['mt:spotstand'] = { about: 'studio spotlight on a tripod', tags: 'studio light', mats: { m: '#2c2838 metal', c: '#c8d0e0 metal', l: '#fff4c0', g: 'gold' },
    parts: [['ring', 3, 4, ['box', 'm', [0, 0, 0], [1.5, 1.5, 14], { rot: [0, 18, 0] }]], ['cyl', 'm', [0, 0, 12], 1, 12], ['box', 'c', [0, 0, 22], [8, 9, 7]], ['box', 'l', [0, 4.6, 23], [6, 1, 5]], ['box', 'g', [0, 0, 29], [9, 10, 1]]] };
  S['mt:camera'] = { about: 'studio TV camera on a tripod, red tally light', tags: 'studio', mats: { m: '#2c2838 metal', b: '#4a4458 metal', r: '#ff3344', g: '#9ab0c8 glaze' },
    parts: [['ring', 3, 5, ['box', 'm', [0, 0, 0], [1.5, 1.5, 16], { rot: [0, 16, 0] }]], ['cyl', 'm', [0, 0, 14], 1.2, 6], ['box', 'b', [0, -2, 20], [7, 14, 8]], ['cyl', 'g', [0, 6, 22], 3, 3, { rot: [90, 0, 0] }], ['box', 'r', [0, -2, 28], [2, 2, 2]]] };
  S['mt:crane'] = { about: 'camera crane on a dolly base', tags: 'studio', mats: { m: '#2c2838 metal', y: '#ffcc33 metal', b: '#4a4458 metal', r: '#ff3344' },
    parts: [['box', 'm', [0, 0, 0], [22, 16, 4]], ['cyl', 'y', [0, 0, 4], 2.5, 22], ['box', 'y', [0, -6, 26], [3, 34, 3], { rot: [-14, 0, 0] }], ['box', 'b', [0, -22, 28], [8, 10, 7]], ['box', 'm', [0, 12, 22], [6, 6, 6]], ['box', 'r', [0, -22, 35], [2, 2, 2]]] };
  S['mt:pedestal'] = { about: 'turning prize pedestal, gold top', tags: 'studio', mats: { s: '#3a2a5a glaze', g: 'gold' },
    parts: [['cyl', 's', [0, 0, 0], 8, 4, { r2: 7 }], ['cyl', 's', [0, 0, 4], 6, 6], ['cyl', 'g', [0, 0, 10], 8, 2]] };
  S['mt:champagne'] = { about: 'champagne tower of coupe glasses on a table', tags: 'party', mats: { t: '#f0e8f0 cloth', g: '#e8f4ff glaze', c: '#ffe8a0 glaze' },
    parts: [['cyl', 't', [0, 0, 0], 7, 9], ['cyl', 'g', [0, 0, 9], 6, 3, { r2: 5 }], ['cyl', 'c', [0, 0, 12], 4.5, 3, { r2: 3.6 }], ['cyl', 'g', [0, 0, 15], 3, 3, { r2: 2.2 }], ['cyl', 'c', [0, 0, 18], 1.8, 2.5, { r2: 1 }]] };
  S['mt:stanchion'] = { about: 'brass rope stanchion', tags: 'party', mats: { g: 'gold', r: '#b0203a cloth' },
    parts: [['cyl', 'g', [0, 0, 0], 3, 1.5], ['cyl', 'g', [0, 0, 1.5], .9, 13], ['ball', 'g', [0, 0, 15], 1.6]] };
  S['mt:searchlight'] = { about: 'searchlight drum on a base', tags: 'party light', mats: { m: '#3a3448 metal', s: '#c8d0e0 metal', l: '#fffbe0' },
    parts: [['box', 'm', [0, 0, 0], [14, 14, 6]], ['box', 's', [0, 0, 6], [10, 12, 10]], ['box', 'l', [0, 6.2, 8], [8, 1, 6]]] };
  S['mt:forklift'] = { about: 'yellow forklift', tags: 'warehouse', mats: { y: '#ffcc33 metal', k: '#2a2838 metal', s: '#9aa0b0 metal' },
    parts: [['box', 'y', [0, 0, 2], [14, 20, 9]], ['box', 'k', [0, 0, 11], [12, 10, 1]], ['box', 'k', [0, -6, 11], [12, 2, 14]], ['box', 'y', [0, 2, 25], [14, 14, 1.5]], ['box', 's', [0, 12, 0], [12, 2, 26]], ['mirror', 'x', ['box', 's', [3.5, 18, 1], [2, 12, 1]]], ['mirror', 'x', ['cyl', 'k', [6, -6, 2.5], 2.5, 2, { rot: [0, 90, 0] }]], ['mirror', 'x', ['cyl', 'k', [6, 6, 2.5], 2.5, 2, { rot: [0, 90, 0] }]]] };
  S['mt:rack'] = { about: 'warehouse shelving rack', tags: 'warehouse', mats: { o: '#e06030 metal', g: '#8a8f9a metal' },
    parts: [['mirror', 'xy', ['box', 'o', [14, 5, 0], [1.5, 1.5, 40]]], ['row', 3, [0, 0, 13], ['box', 'g', [0, 0, 13], [30, 12, 1.2]]]] };
  S['mt:safe'] = { about: 'vault safe front set in a wall', tags: 'vault', mats: { s: '#7a8090 metal', d: '#4a5060 metal', g: 'gold' },
    parts: [['box', 's', [0, 0, 0], [96, 4, 26]], ['box', 'd', [0, 2.5, 4], [72, 1, 18]], ['cyl', 'g', [0, 3, 13], 6, 1.5, { rot: [90, 0, 0] }]] };
  S['mt:cage'] = { about: 'gold prize cage, round bars', tags: 'studio', mats: { g: 'gold' },
    parts: [['ring', 12, 13, ['cyl', 'g', [0, 0, 0], .9, 26]], ['cyl', 'g', [0, 0, 0], 14, 2, { r2: 14 }], ['cyl', 'g', [0, 0, 26], 14, 2, { r2: 10 }]] };
  S['mt:lockbolt'] = { about: 'a big vault lock bolt', tags: 'vault', mats: { s: '#c8d0e0 metal', r: '#ff3344 glaze' },
    parts: [['box', 's', [0, 0, 0], [10, 6, 16]], ['cyl', 'r', [0, 3.5, 8], 3, 1, { rot: [90, 0, 0] }]] };
  S['mt:crate'] = { about: 'prize crate with a gold question mark', tags: 'prize', mats: { c: '#c87830 crate', g: 'gold' },
    parts: [['box', 'c', [0, 0, 0], [14, 14, 13]], ['box', 'g', [0, 7.2, 4], [4, 1, 6]]] };
  if (GLOBAL.ASSETS && GLOBAL.ASSETS.mash) E.addAssets(GLOBAL.ASSETS.mash);
}

// the MASH TV logo rasterized once (a browser canvas), sampled by the studio floor
let LOGO = null;
function logoMask() {
  if (LOGO !== null) return LOGO;
  LOGO = false;
  if (!HAS_DOM) return LOGO;
  try {
    const W = 168, Hh = 64, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
    E.px.ell(g, W / 2, Hh / 2, W / 2 - 1, Hh / 2 - 1, '#0d0620'); E.px.ell(g, W / 2, Hh / 2, W / 2 - 4, Hh / 2 - 4, '#2a1050');
    E.font.title(g, 'MASH TV', W / 2, 18, { scale: 3, colors: ['#ffcc33', '#ff2e88'], align: 'center', depth: 2, depthColor: '#5a1040' });
    E.font.text(g, 'STUDIO 9', W / 2, 46, '#2ee6ff', { align: 'center', outline: false });
    LOGO = { W, H: Hh, d: g.getImageData(0, 0, W, Hh).data };
  } catch (e) { LOGO = false; }
  return LOGO;
}
const hazardStripe = (x, y) => {   // yellow and black stripes at each door's threshold
  for (const d of DOOR_IDS) {
    const D = DOORS[d];
    if (d === 'N' || d === 'S') { if (x > 158 && x < 210 && Math.abs(y - (d === 'N' ? 20 : 220)) < 4) return ((x + y) >> 2) & 1 ? [255, 204, 51] : [26, 18, 30]; }
    else if (y > 94 && y < 146 && Math.abs(x - (d === 'W' ? 20 : 348)) < 4) return ((x + y) >> 2) & 1 ? [255, 204, 51] : [26, 18, 30];
  }
  return null;
};
const FLOORS = {
  studio(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    const L = logoMask();
    if (L) { const lx = Math.floor(x - (184 - L.W / 2)), ly = Math.floor((y - (120 - L.H / 2)) * 1); if (lx >= 0 && ly >= 0 && lx < L.W && ly < L.H) { const i = (ly * L.W + lx) * 4; if (L.d[i + 3] > 128) return [L.d[i] * .85, L.d[i + 1] * .85, L.d[i + 2] * .85]; } }
    const tx = Math.floor(x / 16), ty = Math.floor(y / 16), fx = x - tx * 16, fy = y - ty * 16;
    if (fx < 1 || fy < 1) return ((tx % 4 === 0 && fx < 1) || (ty % 4 === 0 && fy < 1)) ? [120, 26, 86] : [12, 6, 24];
    if (tx % 4 === 0 && ty % 4 === 0 && Math.abs(fx - 1) + Math.abs(fy - 1) < 3) return [255, 204, 51];
    let c = (tx + ty) & 1 ? [36, 20, 62] : [28, 15, 48];
    const gl = ((x + y * 1.4) % 96) / 96; if (gl < .08) c = shadeC(c, .12);
    return shadeC(c, (hn(tx, ty) - .5) * .08);
  },
  warehouse(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    let c = [92, 90, 96]; const n = hn(Math.floor(x / 2), Math.floor(y / 2)), m = hn(Math.floor(x / 9), Math.floor(y / 9));
    c = shadeC(c, (n - .5) * .1 + (m - .5) * .12);
    if (x % 64 < 1 || y % 64 < 1) c = shadeC(c, -.25);
    const inset = (Math.abs(x - 40) < 1.6 || Math.abs(x - 328) < 1.6) && y > 40 && y < 200 || (Math.abs(y - 40) < 1.6 || Math.abs(y - 200) < 1.6) && x > 40 && x < 328;
    if (inset) return [230, 190, 40];
    if (hn(Math.floor(x / 23), Math.floor(y / 17)) > .9 && hn(x, y) > .4) c = shadeC(c, -.18);
    return c;
  },
  rooftop(x, y) {
    const hz = hazardStripe(x, y); if (hz) return hz;
    const dx = x - 184, dy = y - 120, rr2 = Math.sqrt(dx * dx + dy * dy);
    if (rr2 > 52 && rr2 < 57) return [220, 170, 50];
    if (x > 168 && x < 200) { if (x < 170 || x > 198) return [230, 180, 60]; const k = (hn(Math.floor(x), Math.floor(y / 3)) - .5) * .08; return shadeC([150, 20, 40], k); }
    const tx = Math.floor(x / 24), ty = Math.floor(y / 24), fx = x - tx * 24, fy = y - ty * 24;
    if (fx < .8 || fy < .8) return [22, 24, 34];
    let c = [40 + hn(tx, ty) * 12, 44 + hn(tx, ty) * 12, 60 + hn(tx, ty) * 14];
    c = shadeC(c, (hn(Math.floor(x / 3), Math.floor(y / 3)) - .5) * .06 + (fx + fy < 6 ? .06 : 0));
    if (hn(x * .5, y * .5) > .992) c = [120, 130, 160];
    return c;
  },
  greenroom(x, y) {
    const u = (x + y) % 24, v = (x - y + 2400) % 24;
    if (u < 1 || v < 1) return [200, 160, 60];
    const c = [28, 100, 72];
    return shadeC(c, (hn(Math.floor(x / 2), Math.floor(y / 2)) - .5) * .1);
  },
};
// wall decorators: painted onto each wall face as it is baked
const DECOR = {
  studio(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 4) * 4; u < u1; u += 4) f.line(u, z0 + 1, u, z1 - 6, ((u / 4) & 1) ? f.tones.sh : f.tones.lt);
    f.quad(u0, z1 - 5, u1, z1 - 3, '#ffcc33'); f.quad(u0, z1 - 3, u1, z1 - 2.4, '#8a5a08');
    f.quad(u0, z0 + 7, u1, z0 + 8, '#ff2e88'); f.quad(u0, z0, u1, z0 + 2, '#140a24');
  },
  warehouse(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 3) * 3; u < u1; u += 3) f.line(u, z0, u, z1, ((u / 3) & 1) ? f.tones.lt : f.tones.sh);
    if (Math.floor(u0 / 48) % 2 === 0) { f.quad(u0, z1 - 12, u1, z1 - 5, '#d02a3a'); if (Math.floor(u0 / 16) % 3 === 0) f.quad(u0 + 3, z1 - 10, u0 + 12, z1 - 7, '#fff7e8'); }
    f.quad(u0, z0, u1, z0 + 2, '#ffcc33');
  },
  rooftop(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    f.quad(u0, z0, u1, z1, '#2a4a5e'); f.quad(u0 + 1, z0 + 3, u1 - 1, z1 - 4, '#4a7a90');
    f.line(u0 + 4, z0 + 4, u0 + 9, z1 - 5, '#9ad0e0'); f.line(u0 + 7, z0 + 4, u0 + 12, z1 - 5, '#6aa4b8');
    f.quad(u0, z0, u0 + 1.5, z1, '#ffcc33'); f.quad(u0, z1 - 3, u1, z1 - 1.5, '#ffcc33');
  },
  greenroom(f) {
    const { u0, u1, z0, z1 } = f; if (z1 - z0 < 8) return;
    for (let u = Math.ceil(u0 / 8) * 8; u < u1; u += 8) f.line(u, z0, u, z1, f.tones.sh);
    f.quad(u0, z1 - 3, u1, z1 - 1, '#c8a040');
    if (Math.floor(u0 / 16) % 2 === 0) { f.quad(u0 + 4, z0 + 9, u0 + 12, z0 + 19, '#c8a040'); f.quad(u0 + 5, z0 + 10, u0 + 11, z0 + 18, '#2a1446'); f.dot(u0 + 8, z0 + 15, '#e8c8a8'); f.quad(u0 + 6.5, z0 + 11, u0 + 9.5, z0 + 13, '#c8c8d0'); }
  },
};
const SETS = MT.sets = {
  studio: { id: 'studio', label: 'STUDIO 9', ambient: .55, wall: { h: 26, top: '#3a1e5a', side: '#5a2a80', face: 'none', roof: 'plain' }, door: { frame: '#ffcc33', shutter: '#3a2a5a', slat: '#2a1a40', style: 'shutter' },
    corner: [['mt:spotstand', 30, 30, Math.PI * .25], ['mt:spotstand', 338, 30, Math.PI * .75], ['mt:spotstand', 30, 210, -Math.PI * .25], ['mt:spotstand', 338, 210, -Math.PI * .75]],
    crowd: ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a6aff', '#ff9a3c', '#5fe0a0'], bleacher: ['#2a1446', '#3a1e5a'] },
  warehouse: { id: 'warehouse', label: 'MEGAMART PRIZE WAREHOUSE', ambient: .6, wall: { h: 26, top: '#5a6070', side: '#7a8090', face: 'none', roof: 'plain' }, door: { frame: '#ffcc33', shutter: '#8a909c', slat: '#5a606c', style: 'rollup' },
    corner: [['mash:crates-stacked', 30, 30, 0], ['mash:present-a-cube', 338, 28, .4], ['mash:present-b-round', 30, 212, 0], ['mash:barrel-large', 338, 212, 0]],
    crowd: ['#e8443a', '#3b82f6', '#ffcc33', '#22c55e', '#c8d0e0', '#ff9a3c'], bleacher: ['#3a3e4a', '#4a4e5a'] },
  rooftop: { id: 'rooftop', label: 'THE ROOFTOP GALA', ambient: .4, wall: { h: 26, top: '#c8a040', side: '#2a4a5e', face: 'none', roof: 'plain' }, door: { frame: '#d8a848', shutter: '#9aa4b4', slat: '#6a7484', style: 'elevator' },
    corner: [['mt:champagne', 30, 30, 0], ['mash:palm-detailed-straight', 338, 30, 0], ['mash:palm-detailed-straight', 30, 210, 0], ['mt:champagne', 338, 210, 0]],
    crowd: ['#f0e8f0', '#1a1a24', '#c8a040', '#b0203a', '#4a7a90', '#e8c8a8'], bleacher: ['#1a1e2a', '#2a2e3a'] },
  greenroom: { id: 'greenroom', label: 'THE GREEN ROOM', ambient: .62, wall: { h: 26, top: '#5a3a20', side: '#7a5030', face: 'none', roof: 'plain' }, door: { frame: '#c8a040', shutter: '#6a4020', slat: '#4a2a14', style: 'wood' },
    corner: [['mash:couch', 36, 34, Math.PI / 2], ['mash:kitchen-fridge', 338, 30, Math.PI / 2], ['mash:cake', 30, 210, 0], ['mash:television-modern', 338, 210, -Math.PI / 2]],
    crowd: [], bleacher: null },
};
for (const k in SETS) { SETS[k].floor = FLOORS[k]; SETS[k].wall.decorate = DECOR[k]; }

// ---------------------------------------------------------------------------------------------------------------
// the audience: bleachers east and west of the arena, rows of fans who bob with the ratings (cosmetic)
const STUDIO = MT.studio = { excite: .3, wave: false, cheerT: 0, laughT: 0, booT: 0, fireworks: [] };
function makeAudience(set) {
  const R = E.rng(91), out = [];
  if (!set.bleacher) return out;
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) for (let k = 0; k < 13; k++) {
    const x = side < 0 ? -18 - row * 16 : 386 + row * 16, y = 18 + k * 16 + (row & 1) * 6;
    out.push({ x, y, z: 4 + row * 7, side, row, c: set.crowd[Math.floor(R() * set.crowd.length)], skin: ['#f0c8a0', '#c89070', '#8a5a3a', '#e8b890', '#5a3a2a'][Math.floor(R() * 5)], hair: ['#2a1a10', '#8a5a20', '#ffcc33', '#c8c8d0', '#d03a20'][Math.floor(R() * 5)], ph: R() * TAU, sign: R() < .08 ? ['MASH!', 'KA-CHING!', 'HI MOM'][Math.floor(R() * 3)] : null });
  }
  return out;
}
function drawBleachers(r, set, t, crowd) {
  if (!set.bleacher) return;
  const [c0, c1] = set.bleacher;
  for (const side of [-1, 1]) for (let row = 0; row < 5; row++) {
    const x0 = side < 0 ? -26 - row * 16 : 378 + row * 16, x1 = x0 + 16, z1 = 2 + row * 7;
    r.queue((x0 + x1) / 2, 120, 0, g => { r.box(g, x0, -4, 0, x1, 244, z1, row & 1 ? c1 : c0, E.tones(row & 1 ? c1 : c0).sh); }, { bias: -2 });
  }
  const ex = STUDIO.excite, wave = STUDIO.wave;
  for (const side of [-1, 1]) {
    const list = crowd.filter(a => a.side === side);
    r.queue(side < 0 ? -60 : 430, 120, 30, g => {
      for (const a of list) {
        const cheer = STUDIO.cheerT > 0 || (wave && Math.sin(t * 6 - a.y * .05) > .6);
        const bob = Math.abs(Math.sin(t * (4 + ex * 6) + a.ph)) * (1 + ex * 3) * (cheer ? 1.6 : 1);
        const [sx, sy] = r.w(a.x, a.y, a.z + 6 + bob);
        px.rect(g, sx - 3, sy, 7, 6, a.c); px.rect(g, sx - 3, sy + 5, 7, 1, E.tones(a.c).sh);
        px.disc(g, sx + .5, sy - 2, 2.5, a.skin); px.rect(g, sx - 2, sy - 5, 5, 2, a.hair);
        if (cheer) { px.rect(g, sx - 5, sy - 6, 1, 6, a.skin); px.rect(g, sx + 5, sy - 6, 1, 6, a.skin); }
        if (a.sign) { const w = E.font.width(a.sign) + 4; px.rect(g, sx - w / 2, sy - 16 - bob * .5, w, 9, '#fff7e8'); px.rect(g, sx, sy - 7 - bob * .5, 1, 5, '#8a5a32'); E.font.text(g, a.sign, sx, sy - 15 - bob * .5, '#d02a3a', { align: 'center', outline: false }); }
      }
    }, { bias: 2 });
  }
}
// the jumbotron above the north wall: who is talking (a live portrait), else the logo, ratings and a sponsor
function drawJumbotron(r, t) {
  r.queue(184, -46, 40, g => {
    const p0 = r.w(124, -40, 82), p1 = r.w(244, -40, 18), x0 = Math.round(p0[0]), y0 = Math.round(p0[1]), w = Math.round(p1[0] - p0[0]), h = Math.round(p1[1] - p0[1]);
    if (w < 20 || h < 10) return;
    px.rect(g, x0 - 3, y0 - 3, w + 6, h + 6, '#0c0618'); px.rect(g, x0 - 2, y0 - 2, w + 4, h + 4, '#c8d0e0');
    for (let i = 0; i < w + 4; i += 4) { const on = (Math.floor(t * 8) + i / 4) % 3 === 0; px.dot(g, x0 - 2 + i, y0 - 3, on ? '#fff0a0' : '#8a5a08'); px.dot(g, x0 - 2 + i, y0 + h + 2, on ? '#fff0a0' : '#8a5a08'); }
    px.rect(g, x0, y0, w, h, '#0a0614');
    const L = MT.lines && MT.lines.current;
    if (L) { const s = Math.min(h - 12, 40); MT.drawSpeakerPortrait(g, L.who, x0 + w / 2 - s / 2, y0 + 2, s, t); E.font.text(g, L.name, x0 + w / 2, y0 + h - 9, '#ffcc33', { align: 'center', outline: false }); }
    else {
      const phase = Math.floor(t / 4) % 3;
      if (phase === 0) E.font.title(g, 'MASH TV', x0 + w / 2, y0 + h / 2 - 8, { scale: 2, colors: ['#ffcc33', '#ff2e88'], align: 'center' });
      else if (phase === 1) { E.font.text(g, 'RATINGS', x0 + w / 2, y0 + 6, '#2ee6ff', { align: 'center', outline: false }); E.font.text(g, Math.round(MT.studio.excite * 100) + '%', x0 + w / 2, y0 + 18, '#fff7e8', { align: 'center', scale: 2, outline: false }); }
      else { const ad = MT.TEXT ? MT.TEXT.sponsors[Math.floor(t / 12) % MT.TEXT.sponsors.length] : ['KRUNCH-O', '']; E.font.text(g, ad[0], x0 + w / 2, y0 + 6, '#ff9a3c', { align: 'center', scale: 2, outline: false }); E.font.text(g, ad[1], x0 + w / 2, y0 + 24, '#fff7e8', { align: 'center', outline: false, font: 'tiny' }); }
    }
    for (let yy = y0; yy < y0 + h; yy += 2) { g.globalAlpha = .18; g.fillStyle = '#000'; g.fillRect(x0, yy, w, 1); g.globalAlpha = 1; } g._c = null;
  }, { bias: -10 });
}
function drawOutside(r, set, t, crowd, world) {
  drawBleachers(r, set, t, crowd);
  if (set.id === 'greenroom') return;
  drawJumbotron(r, t);
  // the north truss with APPLAUSE and ON AIR signs
  r.queue(184, -14, 34, g => {
    const a = r.w(-20, -14, 40), b = r.w(388, -14, 40);
    px.line(g, a[0], a[1], b[0], b[1], '#5a5468', 2); px.line(g, a[0], a[1] + 4, b[0], b[1] + 4, '#3a3448', 1);
    for (let x = -20; x < 388; x += 12) { const p = r.w(x, -14, 40), q = r.w(x + 6, -14, 36); px.line(g, p[0], p[1], q[0], q[1] + 4, '#4a4458'); }
    const sign = (x, label, on, col) => { const p = r.w(x, -14, 38), w = E.font.width(label) + 8; px.rect(g, p[0] - w / 2 - 1, p[1] - 1, w + 2, 11, '#0c0618'); px.rect(g, p[0] - w / 2, p[1], w, 9, on ? col : '#3a2030'); E.font.text(g, label, p[0], p[1] + 1, on ? '#fff7e8' : '#7a5a6a', { align: 'center', outline: false }); };
    sign(60, 'APPLAUSE', STUDIO.cheerT > 0 ? Math.floor(t * 6) % 2 === 0 : false, '#d02a3a'); sign(308, 'ON AIR', true, '#ff3344');
  }, { bias: -8 });
  if (set.id === 'studio') { r.shape('mt:crane', 54, 268, 0, { facing: -Math.PI / 2 - .3 }); r.shape('mt:crane', 314, 268, 0, { facing: -Math.PI / 2 + .3 }); r.shape('mt:camera', 120, 262, 0, { facing: -Math.PI / 2 }); r.shape('mt:camera', 250, 262, 0, { facing: -Math.PI / 2 }); }
  if (set.id === 'warehouse') { for (const [x, y] of [[-110, 0], [-110, 120], [478, 0], [478, 120]]) { r.shape('mt:rack', x, y, 0); r.shape('mash:kitchen-fridge', x - 8, y, 13); r.shape('mash:television-vintage', x + 8, y, 26.5); } r.shape('mt:forklift', 60, 270, 0, { facing: 0 }); r.shape('mash:present-a-rectangle', 300, 268, 0); }
  if (set.id === 'rooftop') {
    r.shape('mt:searchlight', -40, -30, 0); r.shape('mt:searchlight', 408, -30, 0);
    for (const x of [40, 100, 268, 328]) r.shape('mt:stanchion', x, 262, 0);
    r.queue(184, -120, 0, g => {   // the skyline at the far edge, its windows lit teal and amber
      for (let i = 0; i < 26; i++) { const x = -120 + i * 24, hh = 40 + hn(i, 3) * 80, p = r.w(x, -110, hh), q = r.w(x + 20, -110, 0); px.rect(g, p[0], p[1], q[0] - p[0], q[1] - p[1], '#10142a'); for (let wy = p[1] + 4; wy < q[1] - 4; wy += 6) for (let wx = p[0] + 3; wx < q[0] - 3; wx += 5) if (hn(wx, wy) > .55) px.dot(g, wx, wy, hn(wy, wx) > .5 ? '#2ee6ff' : '#ffb84a'); }
    }, { bias: -20 });
  }
}
/** a set's lights: called every draw */
function drawSetLights(r, set, t, world) {
  const L = game.lights;
  if (world && world.ratings && world.ratings.prime > 0) { const calm = game.reduceMotion || (game.settings && game.settings.flashes < .3), on = calm || Math.floor(t * 8) % 2 === 0; for (let i = 0; i < 4; i++) if (on) L.add(60 + i * 83, 50 + (i % 2) * 140, 30, 110, calm ? .35 : .7, { color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#5fe0a0'][(i + Math.floor(t * 4)) % 4] }); }
  if (set.id === 'studio') {
    const cols = ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'];
    for (let i = 0; i < 4; i++) { const a = t * .35 + i * TAU / 4; L.add(184 + Math.cos(a) * 120, 120 + Math.sin(a * 1.3) * 70, 0, 85, .55, { color: cols[i] }); }
  } else if (set.id === 'warehouse') {
    for (const x of [70, 184, 298]) for (const y of [60, 180]) L.add(x, y, 40, 95, .45, { color: '#dff4ff' });
  } else if (set.id === 'rooftop') {
    for (let x = 24; x <= 344; x += 40) { L.add(x, 14, 24, 34, .5, { color: '#ffc870' }); L.add(x, 226, 10, 30, .4, { color: '#ffc870' }); }
    const a = Math.sin(t * .4); L.add(184 + a * 140, 120 + Math.cos(t * .3) * 60, 0, 60, .6, { color: '#fffbe0' });
    for (const f of STUDIO.fireworks) if (f.t < .4) L.add(f.x, f.y, 60, 160, (.4 - f.t) * 2, { color: f.c });
  } else {
    for (const [x, y] of [[40, 40], [328, 40], [40, 200], [328, 200], [184, 120]]) L.add(x, y, 24, 90, .5, { color: '#ffd8a0' });
  }
}
/** fireworks in the night sky over the rooftop (cosmetic) */
function stepFireworks(dt, set) {
  if (set.id !== 'rooftop') { STUDIO.fireworks.length = 0; return; }
  for (const f of STUDIO.fireworks) f.t += dt;
  E.prune(STUDIO.fireworks, f => f.t > 1.6);
  if (Math.random() < dt * .5) {
    const f = { x: 40 + Math.random() * 290, y: -60 - Math.random() * 40, c: ['#ff2e88', '#2ee6ff', '#ffcc33', '#5fe0a0'][Math.floor(Math.random() * 4)], t: 0 };
    STUDIO.fireworks.push(f);
    if (game.particles) { for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; game.particles.add({ kind: 'spark', x: f.x, y: f.y, z: 90, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, vz: Math.sin(a) * 40 + 20, max: 1.2, color: f.c, g: 40 }); } }
  }
}
/** the door painter: posts, the lintel, the shutter (rising as it opens), beacons and the exit sign */
function drawDoor(r, set, d, t) {
  const D = DOORS[d.id], st = set.door, u = d.u, cut = d.id === 'S';
  const top = cut ? 6 : 26, H = top * (1 - u);
  const along = d.id === 'N' || d.id === 'S';
  const [ax, ay, bx, by] = along ? [160, D.y - 8, 208, D.y + 8] : [D.x - 8, 96, D.x + 8, 144];
  const post = (x0, y0, x1, y1) => r.queue((x0 + x1) / 2, (y0 + y1) / 2, 0, g => r.box(g, x0, y0, 0, x1, y1, top + (cut ? 0 : 4), st.frame, E.tones(st.frame).sh), { occluder: true });
  if (along) { post(156, ay, 161, by); post(207, ay, 212, by); }
  else { post(ax, 92, bx, 97); post(ax, 143, bx, 148); }
  if (H > .5) {
    r.queue((ax + bx) / 2, (ay + by) / 2, 0, g => {
      if (st.style === 'elevator' && !cut) {   // two panels sliding apart
        const w = (along ? 48 : 48) / 2 * (1 - u);
        if (along) { r.box(g, 161, ay + 4, 0, 161 + w, by - 4, 26, st.shutter, st.slat); r.box(g, 207 - w, ay + 4, 0, 207, by - 4, 26, st.shutter, st.slat); }
        else { r.box(g, ax + 4, 97, 0, bx - 4, 97 + w, 26, st.shutter, st.slat); r.box(g, ax + 4, 143 - w, 0, bx - 4, 143, 26, st.shutter, st.slat); }
        return;
      }
      if (along) r.box(g, 161, ay + 4, 0, 207, by - 4, H, st.shutter, st.slat); else r.box(g, ax + 4, 97, 0, bx - 4, 143, H, st.shutter, st.slat);
      if (!cut && along) for (let z = 3; z < H; z += 4) { const p = r.w(161, by - 4, z), q = r.w(207, by - 4, z); px.line(g, p[0], p[1], q[0], q[1], st.slat); }
      if (!cut && !along) for (let yy = 100; yy < 143; yy += 5) { const p = r.w(ax + 4, yy, H), q = r.w(bx - 4, yy, H); px.line(g, p[0], p[1], q[0], q[1], st.slat); }
    }, { occluder: true, top: H });
  }
  // beacons: red while it opens and spawns, green when it is an exit
  const bc = d.state === 'exit' ? '#3aff6a' : (d.state === 'opening' || d.state === 'open') ? '#ff3344' : null;
  if (bc && (d.state !== 'open' || Math.floor(t * 4) % 2 === 0 || d.state === 'exit')) {
    const pts = along ? [[158, D.y], [210, D.y]] : [[D.x, 94], [D.x, 146]];
    for (const [x, y] of pts) { r.queue(x, y, top + 6, g => { const [sx, sy] = r.w(x, y, top + 6); px.disc(g, sx, sy, 2.5, bc); px.dot(g, sx - 1, sy - 1, '#ffffff'); }, { emissive: true }); game.lights.add(x, y, top + 6, 40, .7, { color: bc }); }
  }
  if (d.state === 'exit' && d.sign) {
    const [x, y] = along ? [184, D.y] : [D.x, 120];
    r.queue(x, y + (d.id === 'N' ? 1 : 0), top + 14, g => {
      const [sx, sy] = r.w(x, y, top + 16), txt = d.sign.name, w = Math.max(E.font.width(txt) + 18, 40), bob = Math.round(Math.sin(t * 3) * 1);
      px.rect(g, sx - w / 2 - 1, sy - 7 + bob, w + 2, 14, '#0c0618'); px.rect(g, sx - w / 2, sy - 6 + bob, w, 12, '#0d3a1a'); px.rect(g, sx - w / 2, sy - 6 + bob, w, 1, '#3aff6a');
      if (d.sign.icon && SPR.ico[d.sign.icon]) px.sprite(g, SPR.ico[d.sign.icon], sx - w / 2 + 2, sy - 5 + bob);
      E.font.text(g, txt, sx + 5, sy - 4 + bob, '#d8ffe0', { align: 'center', outline: false });
      if (d.sign.key) px.sprite(g, SPR.keyS, sx + w / 2 - 9, sy - 2 + bob);
    }, { emissive: true, bias: 4 });
  }
}
MT.art = { defineShapes, makeAudience, drawOutside, drawSetLights, drawDoor, stepFireworks, logoMask };

// ---- 07-art-chars.js ----
// ---- characters: contestant looks, the host and co-host, paparazzi, enemy rigs; small painters shared by them ----
const SLOT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
MT.SLOT_COLORS = SLOT_COLORS;
const LOOKS = MT.looks = [
  { id: 'rocket', name: 'ROCKET', o: { hair: 'short', hat: null }, hair: '#3a2214', skin: '#f0c8a0' },
  { id: 'volt', name: 'VOLT', o: { hair: 'ponytail', hat: { style: 'band', color: '#c8d0e0' } }, hair: '#1a1a2a', skin: '#c89070' },
  { id: 'moxie', name: 'MOXIE', o: { hair: 'spiky', hat: { style: 'cap', color: '#fff7e8' } }, hair: '#d03a20', skin: '#f4d0b0' },
  { id: 'goldie', name: 'GOLDIE', o: { hair: 'long', hat: { style: 'band', color: '#ff2e88' } }, hair: '#ffd860', skin: '#8a5a3a' },
];
/** a contestant's rig: the look picks hair and hat, the slot picks the jumpsuit's colour */
function makeContestantRig(slot, look) {
  const L = LOOKS[look % LOOKS.length], col = SLOT_COLORS[slot % 4], t = E.tones(col);
  return new E.Humanoid(Object.assign({ size: 1.1, build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'long',
    colors: { skin: L.skin, hair: L.hair, cloth: col, pants: t.sh, boot: '#1a1420', belt: '#fff7e8', trim: '#fff7e8', glove: slot === 1 ? '#c8d0e0' : '#1a1420', metal: '#c8d0e0', hilt: '#2a2a34' } }, L.o));
}
function makeLance(size = 1.3) {
  return new E.Humanoid({ size, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long',
    colors: { skin: '#f0c8a0', hair: '#e8e8f4', cloth: '#fff7e8', coat: '#7a2ad0', trim: '#ffcc33', pants: '#1a1420', boot: '#120c18', glove: '#ffffff', belt: '#ffcc33' } });
}
function makePenny() {
  return new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', sleeves: 'none',
    colors: { skin: '#f4d0b0', hair: '#ff8ad8', cloth: '#1ab0b0', trim: '#fff7e8', pants: '#1ab0b0', boot: '#fff7e8', glove: '#ffffff', belt: '#ffcc33' } });
}
function makePaparazzo(i) {
  return new E.Humanoid({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a3448' },
    colors: { skin: ['#f0c8a0', '#c89070', '#8a5a3a'][i % 3], hair: '#2a1a10', cloth: '#5a5468', coat: '#b89a6a', trim: '#8a6a3a', pants: '#3a3448', boot: '#1a1420' } });
}
const ENEMY_RIGS = {
  goon: () => new E.Humanoid({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#1a2440' }, sleeves: 'short',
    colors: { skin: '#e0b090', hair: '#2a1a10', cloth: '#3a4a6a', pants: '#1a2440', boot: '#0c0a14', belt: '#c8a040', metal: '#1a1a22', hilt: '#3a3a44', trim: '#ffcc33' } }),
  popper: () => new E.Humanoid({ size: 1.0, build: 'chibi', weapon: null, outfit: 'tunic', hair: 'short', hat: { style: 'pointed', color: '#ff2e88' },
    colors: { skin: '#ffd8b0', hair: '#5a2a10', cloth: '#ffcc33', pants: '#2ee6ff', boot: '#ff2e88', trim: '#ff2e88' } }),
  mime: () => new E.Humanoid({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#141018' }, sleeves: 'long',
    colors: { skin: '#f8f8fc', hair: '#141018', cloth: '#f0f0f4', pants: '#141018', boot: '#141018', glove: '#ffffff', trim: '#141018', belt: '#d02a3a' } }),
  heckler: () => new E.Humanoid({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#d02a3a' },
    colors: { skin: '#f0c090', hair: '#6a3a1a', cloth: '#d02a3a', pants: '#3a4a6a', boot: '#fff7e8', trim: '#fff7e8' } }),
  hecklerKing: () => new E.Humanoid({ size: 1.1, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'crown', color: '#ffcc33' },
    colors: { skin: '#f0c090', hair: '#6a3a1a', cloth: '#7a2ad0', pants: '#3a4a6a', boot: '#ffcc33', trim: '#ffcc33' } }),
  brute: () => new E.Humanoid({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'long',
    colors: { skin: '#9a6a3a', hair: '#7a4a24', cloth: '#ffcc33', pants: '#8a5a2a', boot: '#5a3a1a', glove: '#9a6a3a', trim: '#d02a3a', belt: '#d02a3a' } }),
  clapbot: () => new E.Blob({ R: 6, horns: true, feet: true, mouth: true, face: 'front', colors: { dk: '#4a5060', base: '#9aa4b8', lt: '#d8e0f0', spec: '#ffffff', eye: '#ff3344', pupil: '#2a0008' } }),
};
MT.makeContestantRig = makeContestantRig; MT.makeLance = makeLance; MT.makePenny = makePenny; MT.makePaparazzo = makePaparazzo; MT.ENEMY_RIGS = ENEMY_RIGS;
/** the host's gold microphone, drawn at his hand */
function drawMic(g, r, rig) {
  const h = rig.hand('R'), [sx, sy] = r.w(h.x, h.y, h.z);
  px.rect(g, sx - .5, sy - 1, 2, 5, '#c8a040'); px.disc(g, sx + .5, sy - 2, 2, '#ffcc33'); px.dot(g, sx, sy - 3, '#ffffff');
}
/** a contestant's player tag on the floor: a ring in the slot's colour with its number (information never in colour alone) */
function drawPlayerTag(r, c, t) {
  const col = SLOT_COLORS[c.slot];
  r.decal(() => { r.groundRing(c.x, c.y, 8, col, .7); });
  if (c.tagT > 0) r.queue(c.x, c.y, 40, g => { const [sx, sy] = r.w(c.x, c.y, 44 + Math.sin(t * 6) * 2); px.poly(g, [[sx - 4, sy - 2], [sx + 4, sy - 2], [sx, sy + 3]], col); E.font.text(g, 'P' + (c.slot + 1), sx, sy - 11, '#fff7e8', { align: 'center', shadow: '#000', outline: false }); }, { bias: 20 });
}
MT.paint = { drawMic, drawPlayerTag };

// ---- 08-sprites.js ----
// ---- sprites: string sprites for pickups, HUD icons, prize icons and room-type icons ----
const SP = (rows, pal, s = 1) => E.sprite(rows, pal, s);
const PAL = { k: '#140a24', w: '#fff7e8', W: '#ffffff', g: '#3fbf5f', G: '#9cf0a8', d: '#1f7a3a', y: '#ffcc33', Y: '#fff0a0', o: '#c88a10', O: '#8a5a08',
  r: '#e8443a', R: '#ff8a7a', b: '#3b82f6', B: '#9cc4ff', s: '#c8d0e0', S: '#7c86a0', p: '#ff2e88', P: '#ffa0cc', c: '#2ee6ff', C: '#a0f6ff', n: '#5a3a20', m: '#8a5a32', v: '#7a4ae0', V: '#c0a0ff', e: '#2a2140', t: '#ff9a3c', T: '#ffd0a0' };
const SPR = MT.spr = {};
/** world sprites keep their designed pixel size at any camera zoom (the engine scales them by the zoom alone) */
const unzoom = r => 1 / ((r && r.view && r.view.zoom) || 1);
SPR.bill = SP(['kkkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGdggyyggdGk', 'kGggykkyggGk', 'kGdggyyggdGk', 'kGGGGGGGGGGk', 'kkkkkkkkkkkk'], PAL);
SPR.stack = SP(['.kkkkkkkkkkk', 'kGGGGGGGGGGk', 'kGgggyygggGk', 'kkkkkyykkkkk', 'kGgggyygggGk', 'kGGGGyyGGGGk', 'kddddyydddk.', '.kkkkkkkkkk.'], PAL);
SPR.gold = SP(['...kkkkkkk..', '..kYYYYYYyk.', '.kYYyyyyyyok', 'kYyyyyyyyook', 'kyyyyyyyooOk', 'koooooooooOk', 'kkkkkkkkkkkk'], PAL);
SPR.case = SP(['....kkkk....', '....k..k....', 'kkkkkkkkkkkk', 'ksssssssssSk', 'ksSSsyysSSSk', 'kssssykssssk', 'ksSSsyysSSSk', 'ksssssssssSk', 'kSSSSSSSSSSk', 'kkkkkkkkkkkk'], PAL);
const box = c => SP(['...kk..kk...', '..kYYkkYYk..', '...kYYYYk...', 'kkkkkYYkkkkk', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'kkkkkYYkkkkk', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'k' + c + c + c + c + 'YY' + c + c + c + 'Ck', 'kkkkkkkkkkkk'], Object.assign({}, PAL, { C: '#00000055' }));
SPR.boxR = box('r'); SPR.boxB = box('b'); SPR.boxG = box('p');
SPR.key = SP(['.kkk........', 'kYyok.......', 'kyOykkkkkkkk', 'kyOyYYYYYYYk', 'kYyokkkyokyk', '.kkk...kk.k.'], PAL);
SPR.tv = SP(['..k......k..', '...k....k...', '....k..k....', 'kkkkkkkkkkkk', 'kssssssssssk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksCCCCCCCCsk', 'ksssssssrrsk', 'kkkkkkkkkkkk', '.kk......kk.'], Object.assign({}, PAL, { C: '#1a2a3a' }));
SPR.bulb = SP(['..kkkkk..', '.kWWWWWk.', 'kWWYYWWWk', 'kWYYYYWWk', 'kWWYYWWWk', '.kWWWWWk.', '..kSSSk..', '..kSsSk..', '..kSSSk..', '...kkk...'], PAL);
SPR.star = SP(['.....k.....', '....kYk....', '....kyk....', 'kkkkyyykkkk', 'kYyyyyyyyok', '.kyykkkyok.', '..kyywyyk..', '.kyyokoyyk.', '.kyok.koyk.', 'kook...kook', 'kkk.....kkk'], PAL);
SPR.statue = SP(['...kkkk...', '..kYYYYk..', '..kYyyok..', '...kyok...', '.kkYyyokk.', 'kYkYyyokYk', 'kyokYyokyk', '.k.kYyok.k', '...kYyok..', '...kyyok..', '...kyyok..', '..kYyyyok.', '..kyyyyok.', '...kyook..', '..kkkkkkk.', '.knnmmmnnk', '.knmmmmmnk', '.kkkkkkkkk'], PAL);
SPR.heart = SP(['.kk.kk.', 'kRrkrrk', 'krrrrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'], PAL);
SPR.heartOff = SP(['.kk.kk.', 'keekeek', 'keeeeek', 'keeeeek', '.keeek.', '..kek..', '...k...'], PAL);
SPR.bulbS = SP(['.kkk.', 'kWYWk', 'kYYYk', '.kSk.', '.kkk.'], PAL);
SPR.keyS = SP(['kkk.....', 'kYkkkkkk', 'kyyyyyyk', 'kkk.k.k.'], PAL);
SPR.kernel = SP(['.ww.', 'wYYw', 'wYYw', '.ww.'], PAL);
SPR.bag = SP(['.kkkkk.', 'kwYwYwk', 'krwrwrk', 'kwrwrwk', 'krwrwrk', 'kwrwrwk', '.kkkkk.'], PAL);
// room-type icons (map card, exit signs): 9 x 9
SPR.ico = {
  start: SP(['..kk.....', '..kGk....', '..kGGk...', '..kGGGk..', '..kGGGGk.', '..kGGGk..', '..kGGk...', '..kGk....', '..kk.....'], PAL),
  battle: SP(['.......kk', '......kWk', '.....kWk.', 'kk..kWk..', '.kkkWk...', '..kyk....', '.kyokk...', 'kok..kk..', 'kk.......'], PAL),
  cash: SP(['...kyk...', '..kyyyk..', '.kyokkk..', '..kyyyk..', '...kkyok.', '..kkkyk..', '...kyk...', '...kyk...', '.........'], PAL),
  armory: SP(['.........', 'kkkkkkkk.', 'ksssssssk', 'kSSSSSSkk', 'kkkksk...', '...kSk...', '...kk....', '.........', '.........'], PAL),
  hazard: SP(['....k....', '...kyk...', '..kyyk...', '..kytyk..', '.kyttyk..', '.kyttTyk.', 'kyttTTtyk', 'kyttTTtyk', '.kkkkkkk.'], PAL),
  key: SP(['....k....', '...kyk...', 'kkkyyykkk', 'kyyyyyyyk', '.kyywyyk.', '..kyyyk..', '.kyykyyk.', 'kyk...kyk', 'kk.....kk'], PAL),
  boss: SP(['.kkkkkkk.', 'kwwwwwwwk', 'kwkkwkkwk', 'kwkkwkkwk', 'kwwwkwwwk', '.kwwwwwk.', '.kwkwkwk.', '..kkkkk..', '.........'], PAL),
  bonus: SP(['....k....', '...kGk...', 'kkkGGGkkk', 'kGGGGGGGk', '.kGGwGGk.', '..kGGGk..', '.kGGkGGk.', 'kGk...kGk', 'kk.....kk'], PAL),
};
// 18 prizes + the grand prize: 12 x 12 icons
SPR.prize = {
  toaster: SP(['............', '...kk..kk...', '...kn..kn...', '.kkkkkkkkkk.', 'kssssssssssk', 'ksWsssssssSk', 'kssskkkssssk', 'ksssk.kssssk', 'kssssssssrSk', 'kSSSSSSSSSSk', '.kk......kk.', '............'], PAL),
  blender: SP(['...kkkkkk...', '...kCCCCk...', '...kCrrCk...', '...kCrrCk...', '...kCCCCk...', '....kCCk....', '...kssssk...', '..kssyysk...', '..kssssssk..', '..kSSSSSSk..', '.kkkkkkkkkk.', '..k......k..'], PAL),
  laughter: SP(['...kkkkkk...', '..kssssssk..', '..kkkkkkkk..', '..kyyyyyyk..', '..kykwkwyk..', '..kyyyyyyk..', '..kykwwkyk..', '..kyykkyyk..', '..kyyyyyyk..', '..kkkkkkkk..', '..kSSSSSSk..', '...kkkkkk...'], PAL),
  thermostat: SP(['...kkkkkk...', '..kppppppk..', '.kpkkkkkkpk.', 'kpkCCCCCCkpk', 'kpkCyyCCCkpk', 'kpkCyyCCCkpk', 'kpkCCCCCCkpk', 'kpkCCCCCCkpk', '.kpkkkkkkpk.', '..kppppppk..', '...kkkkkk...', '............'], PAL),
  jetski: SP(['............', '......kk....', '.....krk....', '....krrk....', '...kkkkkkk..', '..krrrrrrrk.', '.krrwwwrrrrk', 'krrrrrrrrrrk', 'kSSSSSSSSSk.', '.kkkkkkkkk..', '..t...t.....', '............'], PAL),
  butler: SP(['....kkkk....', '...kssssk...', '...kcskck...', '...kssssk...', '....kkkk....', '..kkkkkkkk..', '.kskwwwwksk.', '.kskwkkwksk.', '.k.kwwwwk.k.', '...kkkkkk...', '...kk..kk...', '...kk..kk...'], PAL),
  fridge: SP(['.kkkkkkkkkk.', '.kssssssssk.', '.kskkskkssk.', '.kssssssssk.', '.ksskkkkssk.', '.kkkkkkkkkk.', '.kssssssssk.', '.ksssssskSk.', '.ksssssskSk.', '.kssssssssk.', '.kkkkkkkkkk.', '..k......k..'], PAL),
  jetpack: SP(['............', '.kkk....kkk.', 'kssskkkksssk', 'ksrsk..ksrsk', 'kssskkkksssk', 'ksrsk..ksrsk', 'kssskkkksssk', '.kkk....kkk.', '.ktk....ktk.', '.tTt....tTt.', '..t......t..', '............'], PAL),
  megatv: SP(['kkkkkkkkkkkk', 'kSSSSSSSSSSk', 'kSbbbbbbbbSk', 'kSbBBbbbbbSk', 'kSbBbbbppbSk', 'kSbbbbbppbSk', 'kSbbbbbbbbSk', 'kSSSSSSSSSSk', 'kkkkkkkkkkkk', '....kSSk....', '..kkkkkkkk..', '............'], PAL),
  laundry: SP(['............', '..kkkkkkkk..', '.kVVVVVVVVk.', 'kVVVVVVVVvk.', 'kkkkkkkkkvk.', 'kVkwwwwkVvk.', 'kVkwPPwkVvk.', 'kVkwwwwkVvk.', 'kVVVVVVVVk..', 'kkkkkkkkkk..', '............', '............'], PAL),
  remote: SP(['....kkkk....', '...kYYYyk...', '...kyrryk...', '...kyyyyk...', '...kykykk...', '...kyyyyk...', '...kykykk...', '...kyyyyk...', '...kykykk...', '...kyyyok...', '...kyyook...', '....kkkk....'], PAL),
  inflatable: SP(['............', '....kkkkk...', '...kRRRRRk..', '..kRwwRwwRk.', '.kRRRRRRRRRk', 'kRRRRRRRRRRk', 'krrrrrrrrrrk', '.kkkkkkkkkk.', '.kek....kek.', '..k......k..', '............', '............'], PAL),
  moon: SP(['....kkkk....', '..kkwwwwkk..', '.kwwSwwwwwk.', '.kwSSwwwSwk.', 'kwwwwwwwSSwk', 'kwwwSwwwwwwk', 'kwwSSSwwwwwk', 'kwwwSwwwSwwk', '.kwwwwwSSwk.', '.kwwwwwwwwk.', '..kkwwwwkk..', '....kkkk....'], PAL),
  weather: SP(['...kkkkk....', '..kwwwwwk...', '.kwwwwwwwkk.', 'kwwwwwwwwwwk', 'kSSSSSSSSSSk', '.kkkkkkkkkk.', '..c..c..c...', '.c..c..c....', '...c..c..c..', '..kkkkkkkk..', '..kyrbgyrk..', '..kkkkkkkk..'], PAL),
  toothbrush: SP(['..........kk', '.........kCk', '........kCk.', '.......kCk..', '......kWk...', '.....kCk....', '....kCk.....', '...kCk......', '..kpk.......', '.kppk.......', 'kppk........', 'kkk.........'], PAL),
  clone: SP(['............', '..kkk..kkk..', '.kmmmkkmmmk.', '.kmkmkkmkmk.', '.kmmmkkmmmk.', '.kmkkmmkkmk.', '..kmmk.kmmk.', '..k..k.k..k.', '............', '..kkkkkkkk..', '..kCCwwCCk..', '..kkkkkkkk..'], PAL),
  champagne: SP(['..k.....k...', '...k.k.k....', '..kkkkkkk...', '..kYYYYYk...', '..kYyYyYk...', '...kYYYk....', '....kyk.....', '....kWk.....', '....kWk.....', '....kWk.....', '..kkkkkkk...', '..kWWWWWk...'], PAL),
  speedboat: SP(['............', '.......k....', '......kwk...', '.....kkwk...', '..kkkkkkkkk.', '.kwwwwbbwwwk', 'kwwwwwwwwwk.', 'kbbbbbbbbk..', '.kkkkkkkk...', 'cc.cc.cc.cc.', '.cc.cc.cc.cc', '............'], PAL),
  network: SP(['.....kk.....', '....kyyk....', '.....kk.....', '....kssk....', '...kskksk...', '...kskksk...', '..ksk..ksk..', '..kskkkksk..', '.ksk....ksk.', '.ksk....ksk.', 'kskkkkkkkksk', 'kkk......kkk'], PAL),
};

// ---- 10-arena.js ----
// ---- the arena: the room's TileMap, its four doors (states, spawn queues, exits), hazards, the camera fit ----
const ARENA_ROWS = (() => {
  const rows = [];
  for (let cy = 0; cy < 15; cy++) {
    let s = '';
    for (let cx = 0; cx < 23; cx++) {
      const edge = cy === 0 || cy === 14 || cx === 0 || cx === 22;
      const door = ((cy === 0 || cy === 14) && cx >= 10 && cx <= 12) || ((cx === 0 || cx === 22) && cy >= 6 && cy <= 8);
      s += !edge ? '.' : door ? 'D' : cy === 14 ? '=' : '#';
    }
    rows.push(s);
  }
  return rows;
})();
const DOOR_TIME = { opening: .35, closing: .3, hold: .6 };
class Arena {
  constructor(setId, o = {}) {
    this.set = SETS[setId] || SETS.studio; this.setId = this.set.id;
    const W = this.set.wall;
    this.map = new E.TileMap({ rows: ARENA_ROWS, legend: { '#': 1, '=': 3, 'D': 2 },
      types: { 1: Object.assign({}, W), 2: { h: 26, top: '#000000', side: '#000000', face: 'none' }, 3: Object.assign({}, W, { cut: true, cutH: 6 }) },
      floorTex: (x, y) => this.set.floor(x, y), ao: 4, outside: '#0c0618' });
    const map = this.map, doorIdx = [];
    for (const d of DOOR_IDS) for (const [cx, cy] of DOORS[d].cells) doorIdx.push(cy * 23 + cx);
    const base = map.queueWalls;
    map.queueWalls = function (r) { for (const i of doorIdx) this.cells[i] = 0; try { base.call(this, r); } finally { for (const i of doorIdx) this.cells[i] = 2; } };
    this.doors = {};
    for (const d of DOOR_IDS) this.doors[d] = { id: d, state: 'closed', u: 0, t: 0, queue: [], gapT: 0, hold: 0, sign: null, target: null, spawned: 0 };
    this.hazards = (o.hazards || []).map(h => Object.assign({ t: 0 }, JSON.parse(JSON.stringify(h))));
    for (const h of this.hazards) {
      if (h.kind === 'conveyor') { h.dirs = h.dirs.slice(); h.speed = 40; h.warn = 0; h.phase = 0; h.scroll = 0; }
      if (h.kind === 'pyro') { h.vents = []; for (const cy of h.cys) for (const cx of h.cxs) { const [x, y] = cellW(cx, cy); h.vents.push({ x, y, cx, cy, state: 'idle', t: 0, hit: new Set() }); } h.cycle = 0; h.next = 2.5; h.burst = null; }
    }
    this.solids = [];
    if (o.corner !== false) for (const [id, x, y, f] of this.set.corner) if (E.SHAPES[id]) { try { this.solids.push(map.solid(id, x, y, 0, { facing: f })); } catch (e) { /* shape without a footprint */ } }
    this.cage = null;
    this.crowd = MT.art.makeAudience(this.set);
  }
  /** queue n spawns of a kind at a door, gap seconds apart (the door opens, they pour through, it slams) */
  queueSpawn(id, kind, n, gap = .25, extra) { const d = this.doors[id]; for (let i = 0; i < n; i++) d.queue.push({ kind, gap, extra }); }
  pendingSpawns() { let n = 0; for (const d of DOOR_IDS) n += this.doors[d].queue.length; return n; }
  /** make a door an exit: it opens with a lit sign naming where it goes */
  setExit(id, sign) { const d = this.doors[id]; d.sign = sign; d.target = sign && sign.room; if (d.state === 'closed' || d.state === 'closing') { d.state = 'opening'; d.t = 0; MT.sfx('rollup'); } d.isExit = true; }
  /** a door for the walk-in: open, then slammed behind the contestants */
  entry(id) { const d = this.doors[id]; if (!d) return; d.state = 'open'; d.u = 1; d.hold = 1.3; d.entryHold = true; }
  /** each step: doors animate and pour out their queues (spawn(kind, x, y, door, extra) makes the enemy) */
  update(dt, spawn) {
    for (const id of DOOR_IDS) {
      const d = this.doors[id]; d.t += dt;
      if (d.state === 'closed') { if (d.queue.length) { d.state = 'opening'; d.t = 0; MT.emit('door', { id, kind: 'open' }); } }
      else if (d.state === 'opening') { d.u = clamp(d.t / DOOR_TIME.opening, 0, 1); if (d.u >= 1) { d.state = d.isExit ? 'exit' : 'open'; d.t = 0; d.gapT = 0; } }
      else if (d.state === 'open') {
        if (d.queue.length) {
          d.gapT -= dt; d.hold = DOOR_TIME.hold;
          while (d.queue.length && d.gapT <= 0) { const q = d.queue.shift(); const [x, y] = this.doorSpawnPoint(id, d.spawned++); spawn(q.kind, x, y, id, q.extra); d.gapT += q.gap * MT.T.spawnGap; }
        } else { d.hold -= dt; if (d.hold <= 0) { d.state = 'closing'; d.t = 0; d.entryHold = false; MT.emit('door', { id, kind: 'close' }); } }
      } else if (d.state === 'closing') { d.u = 1 - clamp(d.t / DOOR_TIME.closing, 0, 1); if (d.u <= 0) { d.state = 'closed'; d.u = 0; } }
      else if (d.state === 'exit') { d.u = 1; }
    }
    for (const h of this.hazards) this.stepHazard(h, dt);
  }
  /** where an enemy appears outside a door: 20 units out, spread across the gap */
  doorSpawnPoint(id, k) {
    const D = DOORS[id], off = [-14, 0, 14, -7, 7][k % 5];
    if (id === 'N') return [184 + off, -14]; if (id === 'S') return [184 + off, 254];
    if (id === 'W') return [-14, 120 + off]; return [382, 120 + off];
  }
  /** a door's exit trigger: a contestant pressing into the open gap */
  inExit(c) {
    for (const id of DOOR_IDS) {
      const d = this.doors[id]; if (d.state !== 'exit') continue;
      if (id === 'N' && c.y < AR.Y0 + 8 && Math.abs(c.x - 184) < 22) return id;
      if (id === 'S' && c.y > AR.Y1 - 8 && Math.abs(c.x - 184) < 22) return id;
      if (id === 'W' && c.x < AR.X0 + 8 && Math.abs(c.y - 120) < 22) return id;
      if (id === 'E' && c.x > AR.X1 - 8 && Math.abs(c.y - 120) < 22) return id;
    }
    return null;
  }
  // ---- hazards ----
  stepHazard(h, dt) {
    h.t += dt;
    if (h.kind === 'conveyor') {
      h.phase += dt; const per = 12;
      h.warn = h.phase > per - 1.5 ? 1 : 0;
      const slow = h.warn ? clamp((per - h.phase) / 1.5, 0, 1) : 1;
      h.speed = 40 * slow;
      if (h.phase >= per) { h.phase = 0; h.dirs = h.dirs.map(v => -v); MT.emit('belt', {}); }
      if (h.warn && Math.floor((h.phase - dt) * 2) !== Math.floor(h.phase * 2)) MT.sfx('alarm');
      h.scroll += h.speed * dt;
    } else if (h.kind === 'pyro') {
      for (const v of h.vents) {
        v.t += dt;
        if (v.state === 'tele' && v.t >= 1) { v.state = 'fire'; v.t = 0; v.hit.clear(); MT.sfx('pyro'); }
        else if (v.state === 'fire' && v.t >= 1.2) { v.state = 'idle'; v.t = 0; if (v.again) { v.again = false; v.state = 'tele'; } }
      }
      if (!h.burst) {
        h.next -= dt;
        if (h.next <= 0) {
          h.next = 3.5; const pats = ['rows', 'cols', 'checker', 'allButLane'], p = pats[h.cycle++ % pats.length], R = RNG.ai;
          const cyS = [...new Set(h.vents.map(v => v.cy))], cxS = [...new Set(h.vents.map(v => v.cx))];
          const row = rpick(R, cyS), col = rpick(R, cxS), lane = rpick(R, cxS), par = h.cycle & 1;
          for (const v of h.vents) {
            const on = p === 'rows' ? v.cy === row : p === 'cols' ? v.cx === col : p === 'checker' ? ((cxS.indexOf(v.cx) + cyS.indexOf(v.cy)) & 1) === par : v.cx !== lane;
            if (on && v.state === 'idle') { v.state = 'tele'; v.t = 0; }
          }
        }
      }
    }
  }
  /** the conveyor's push at a point (world units a second along x), 0 off the belts */
  beltAt(x, y) {
    for (const h of this.hazards) if (h.kind === 'conveyor') for (let i = 0; i < h.rows.length; i++) { const [a, b] = h.rows[i], y0 = 16 + a * 16 + 8, y1 = 16 + (b + 1) * 16 + 8; if (y >= y0 && y < y1 && x > AR.X0 && x < AR.X1) return h.dirs[i] * h.speed; }
    return 0;
  }
  pyro() { return this.hazards.find(h => h.kind === 'pyro'); }
  /** the camera: the walled arena fills the screen, a band left top and bottom for the HUD */
  fitCamera() {
    const v = game.baseView || game.view, W = game.screen.W || 427, H = game.screen.H || 240;
    const pts = [[0, 0, 30], [368, 0, 30], [0, 240, 0], [368, 240, 0], [0, 240, 8], [368, 240, 8]].map(p => v.p(p[0], p[1], p[2]));
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const bw = x1 - x0, bh = y1 - y0;
    let z = Math.min(W / bw, (H - 40) / bh); z = clamp(z, .6, 1.6) * MT.T.camZoom;
    if (Math.abs(game.zoom - z) > .004) game.setZoom(z);
    const fc = v.p(184, 120, 0), cy = (y0 + y1) / 2;
    game.cam.offset = [0, Math.round((fc[1] - cy) * z)];
    this.zoom = z;
  }
  draw(r, t, world) {
    const map = this.map;
    map.drawFloor(r);
    for (const h of this.hazards) this.drawHazard(r, h, t);
    MT.art.drawOutside(r, this.set, t, this.crowd, world);
    map.queueWalls(r);
    this.drawMarquee(r, t);
    for (const id of DOOR_IDS) MT.art.drawDoor(r, this.set, this.doors[id], t);
    for (const [id, x, y, f] of this.set.corner) if (E.SHAPES[id]) r.shape(id, x, y, 0, { facing: f, scale: id.includes('palm') ? .55 : 1 });
    if (this.cage && this.cage.h > .5) r.shape('mt:cage', this.cage.x, this.cage.y, this.cage.z || 0);
    MT.art.drawSetLights(r, this.set, t, world);
  }
  /** marquee bulbs chasing along the top of the north wall and the side walls (per frame) */
  drawMarquee(r, t) {
    if (this.setId === 'greenroom') return;
    r.queue(184, 8, 27, g => {
      const step = 8, k = Math.floor(t * 10);
      for (let x = 4; x < 364; x += step) { if (x > 152 && x < 216) continue; const [sx, sy] = r.w(x, 2, 26.5), on = ((x / step) + k) % 4 === 0; px.dot(g, sx, sy, on ? '#fff6b0' : '#8a6a20'); if (on) px.dot(g, sx, sy - 1, '#ffffff'); }
    }, { emissive: true, bias: 1 });
    for (const side of [0, 1]) r.queue(side ? 362 : 6, 120, 27, g => {
      const k = Math.floor(t * 10);
      for (let y = 6; y < 228; y += 8) { if (y > 88 && y < 152) continue; const [sx, sy] = r.w(side ? 362 : 6, y, 26.5), on = ((y / 8) + k) % 4 === 0; px.dot(g, sx, sy, on ? '#fff6b0' : '#8a6a20'); }
    }, { emissive: true });
  }
  drawHazard(r, h, t) {
    if (h.kind === 'conveyor') {
      for (let i = 0; i < h.rows.length; i++) {
        const [a, b] = h.rows[i], y0 = 16 + a * 16 + 8, y1 = 16 + (b + 1) * 16 + 8, dir = h.dirs[i];
        r.decal(g => {
          const p = [r.w(AR.X0, y0, 0), r.w(AR.X1, y0, 0), r.w(AR.X1, y1, 0), r.w(AR.X0, y1, 0)];
          px.poly(g, p, '#2a2830'); px.line(g, p[0][0], p[0][1], p[1][0], p[1][1], h.warn && Math.floor(t * 6) % 2 ? '#ff3344' : '#ffcc33'); px.line(g, p[3][0], p[3][1], p[2][0], p[2][1], h.warn && Math.floor(t * 6) % 2 ? '#ff3344' : '#ffcc33');
          const off = (h.scroll * dir) % 24;
          for (let x = AR.X0 + 12 + ((off + 24) % 24) - 12; x < AR.X1 - 6; x += 24) {
            const yc = (y0 + y1) / 2, q = [r.w(x - 5 * dir, yc - 8, 0), r.w(x + 3 * dir, yc, 0), r.w(x - 5 * dir, yc + 8, 0)];
            px.line(g, q[0][0], q[0][1], q[1][0], q[1][1], '#5a5868', 2); px.line(g, q[1][0], q[1][1], q[2][0], q[2][1], '#5a5868', 2);
          }
          for (let x = AR.X0 + 4; x < AR.X1; x += 8) { const s = r.w(x - ((h.scroll * dir) % 8), y0 + 1, 0); px.dot(g, s[0], s[1], '#4a4858'); }
        });
      }
    } else if (h.kind === 'pyro') {
      for (const v of h.vents) {
        r.decal(g => { const c = v.state === 'tele' ? (Math.floor(t * 12) % 2 ? '#ff6a20' : '#ffcc33') : v.state === 'fire' ? '#ff9a3c' : '#3a3440'; r.groundDisc(v.x, v.y, 9, '#141018', 1); r.groundRing(v.x, v.y, 9, c, 1); for (let k = -6; k <= 6; k += 4) { const a = r.w(v.x - 6, v.y + k, 0), b = r.w(v.x + 6, v.y + k, 0); px.line(g, a[0], a[1], b[0], b[1], c); } }, { emissive: v.state !== 'idle' ? 1 : 0 });
        if (v.state === 'tele' && Math.random() < .3 && game.particles) game.particles.sparks(v.x, v.y, 2, 1, -Math.PI / 2, { color: '#ffcc33' });
        if (v.state === 'fire') {
          const k = Math.min(1, v.t * 6), hh = 34 * k * (1 - Math.max(0, v.t - 1) * 5);
          r.queue(v.x, v.y, 0, g => {
            for (let i = 0; i < 9; i++) { const z = i / 8 * hh, w = 9 * (1 - i / 10) + Math.sin(t * 30 + i) * 1.5, [sx, sy] = r.w(v.x, v.y, z); px.ell(g, sx, sy, w, 3, i < 3 ? '#fff6b0' : i < 6 ? '#ffb030' : '#ff5a20'); }
          }, { emissive: true });
          game.lights.add(v.x, v.y, 14, 70, .9, { color: '#ff9a3c' });
          if (Math.random() < .5 && game.particles) game.particles.fire(v.x, v.y, hh * .8, 1, { size: 1 });
        }
      }
    }
  }
}
MT.Arena = Arena;

// ---- 11-contestant.js ----
// ---- the contestant: a player's body, rig and state; its controllers (local input, bot, remote report, mirror) ----
const DIFF = MT.DIFF = {
  ROOKIE: { hp: 5, lives: 5, enemySpeed: .85, enemyBullet: .8, wave: .8, label: 'ROOKIE', blurb: 'MORE HEALTH, MORE LIVES, SLOWER FOES.' },
  CONTESTANT: { hp: 3, lives: 3, enemySpeed: 1, enemyBullet: 1, wave: 1, label: 'CONTESTANT', blurb: 'THE SHOW AS IT AIRS.' },
  CHAMPION: { hp: 1, lives: 3, enemySpeed: 1.15, enemyBullet: 1, wave: 1.2, label: 'CHAMPION', blurb: 'ONE HIT AND YOU ARE MASHED. THE CLASSIC RULE.' },
};
const EXTRA_LIVES = [250000, 750000, 1500000, 3000000];
const diffOf = () => DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'] || DIFF.CONTESTANT;
const maxHpNow = () => MT.T.hpPerLife > 0 ? MT.T.hpPerLife : diffOf().hp;
const startLivesNow = () => MT.T.startLives > 0 ? MT.T.startLives : diffOf().lives;
MT.maxHpNow = maxHpNow; MT.startLivesNow = startLivesNow;
/** a run's record of a player (cash, lives, prizes...): kept across rooms */
function makePlayerRecord(slot, look, name) {
  return { slot, look: look === undefined ? slot : look, name: name || LOOKS[(look === undefined ? slot : look) % 4].name, color: SLOT_COLORS[slot], cash: 0, lives: startLivesNow(), prizes: [], kills: 0, deaths: 0, boatGain: 0, continues: 0, nextLife: 0, epCash: 0, bombs: 2, id: slot };
}
MT.makePlayerRecord = makePlayerRecord;
let CID = 1;
class Contestant {
  constructor(pr, o = {}) {
    this.cid = CID++; this.pr = pr; this.slot = pr.slot; this.netId = o.netId === undefined ? pr.slot : o.netId;
    this.body = new E.Body({ x: AR.CX, y: AR.CY, r: 6 }); this.r = 6;
    this.rig = makeContestantRig(pr.slot, pr.look);
    this.ctl = o.ctl || 'local'; this.input = o.input || null; this.botOpts = o.bot || null;
    this.state = 'play'; this.hp = maxHpNow(); this.invuln = 0; this.hurtT = 0; this.slideT = 0; this.slideCD = 0; this.slideDir = [1, 0];
    this.facing = -Math.PI / 2; this.aim = -Math.PI / 2; this.lastAim = -Math.PI / 2; this.firing = false; this.fireCD = 0;
    this.weapon = 'blaster'; this.wT = 0; this.wMax = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    this.boatCD = 0; this.boatT = 0; this.boatPose = 0; this.boatHit = false; this.deadT = 0; this.dropT = 0; this.walk = null; this.tagT = 3;
    this.slowT = 0; this.laserAng = null; this.recA = 0; this.recHit = new Map(); this.nearMissT = 0; this.nearMissN = 0; this.pose = null; this.expr = null;
    this.hurtCount = 0; this.lowHpSaid = false; this.cheer = 0; this.exitTo = null;
    this.rs = { x: 0, y: 0, z: 0, face: 0, aim: 0, vx: 0, vy: 0, state: 'play', hurt: false, slideU: 0, pose: null, flash: 0, alpha: 1, wpn: 'blaster', slot: this.slot };
  }
  get x() { return this.body.x; } set x(v) { this.body.x = v; }
  get y() { return this.body.y; } set y(v) { this.body.y = v; }
  get z() { return this.body.z; } set z(v) { this.body.z = v; }
  get alive() { return this.state === 'play' || this.state === 'walkin' || this.state === 'drop' || this.state === 'exit'; }
  get targetable() { return this.state === 'play' || this.state === 'exit'; }
  /** god mode, i-frames from the slide or a hit, the shield, a cutscene walk */
  get invulnerable() { return this.invuln > 0 || (this.slideT > 0 && this.slideT > .06) || this.addons.shield > 0 || this.state !== 'play' || (MT.cheats.god && this.ctl !== 'remote') || this.godMode; }
  place(x, y, facing) { this.body.x = x; this.body.y = y; this.body.z = 0; this.body.vx = this.body.vy = 0; if (facing !== undefined) { this.facing = facing; this.aim = facing; this.lastAim = facing; } }
  /** walk from the entry door to a formation point (invulnerable, no input) */
  walkIn(fromDoor, idx, n) {
    const D = DOORS[fromDoor], inward = [D.nx, D.ny], side = [-D.ny, D.nx];
    const spread = n > 1 ? (idx % 2 ? 1 : -1) * 12 * (1 + Math.floor(idx / 2) * .0) : 0, row = Math.floor(idx / 2);
    const sx = D.x + inward[0] * 4 + side[0] * spread, sy = D.y + inward[1] * 4 + side[1] * spread;
    const tx = D.x + inward[0] * (40 + row * 16) + side[0] * spread, ty = D.y + inward[1] * (40 + row * 16) + side[1] * spread;
    this.place(sx, sy, Math.atan2(inward[1], inward[0]));
    this.walk = { sx, sy, tx, ty, t: 0, dur: 1.2 }; this.state = 'walkin'; this.tagT = 3;
  }
  dropIn(x, y) { this.place(x, y, -Math.PI / 2); this.state = 'drop'; this.dropT = 0; this.body.z = 70; this.hp = maxHpNow(); this.invuln = 2.5; this.pr.bombs = Math.max(1, this.pr.bombs); this.tagT = 3; MT.sfx('zip'); }
  /** one step of the contestant's own simulation (authoritative for local and bot contestants) */
  step(dt, world, intent) {
    const T = MT.T;
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.slideCD = Math.max(0, this.slideCD - dt);
    this.boatCD = Math.max(0, this.boatCD - dt); this.tagT = Math.max(0, this.tagT - dt); this.slowT = Math.max(0, this.slowT - dt); this.nearMissT = Math.max(0, this.nearMissT - dt);
    for (const k in this.addons) if (this.addons[k] > 0) { this.addons[k] = Math.max(0, this.addons[k] - dt); if (this.addons[k] === 0) world.event('expire', { c: this, what: k }); }
    if (this.weapon !== 'blaster') { this.wT -= dt; if (this.wT <= 0) { this.weapon = 'blaster'; this.wT = 0; world.event('expire', { c: this, what: 'weapon' }); } }
    const B = this.body;
    if (this.state === 'walkin') {
      const w = this.walk; w.t += dt; const k = clamp(w.t / w.dur, 0, 1);
      const nx = lerp(w.sx, w.tx, k), ny = lerp(w.sy, w.ty, k); B.vx = (nx - B.x) / dt; B.vy = (ny - B.y) / dt; B.x = nx; B.y = ny;
      if (k >= 1) { this.state = 'play'; B.vx = B.vy = 0; }
      return;
    }
    if (this.state === 'exit') {
      const D = DOORS[this.exitTo]; const a = Math.atan2(D.y - B.y, D.x - B.x), sp = 80;
      B.vx = Math.cos(a) * sp; B.vy = Math.sin(a) * sp; B.x += B.vx * dt; B.y += B.vy * dt; this.facing = a;
      return;
    }
    if (this.state === 'dead') { this.deadT -= dt; B.vx = B.vy = 0; if (this.deadT <= 0) world.afterDeath(this); return; }
    if (this.state === 'drop') { this.dropT += dt; B.z = 70 * (1 - easeOut(clamp(this.dropT / .5, 0, 1))); if (this.dropT >= .5) { B.z = 0; this.state = 'play'; this.rig.land(.5); MT.sfx('land'); world.event('respawn', { c: this }); } return; }
    if (this.state === 'out') { B.vx = B.vy = 0; return; }
    // play
    intent = intent || { move: [0, 0], aim: null, fire: false };
    if (this.boatT > 0) {   // showboating: a pose for the cameras, no moving or firing
      this.boatT -= dt; B.vx = B.vy = 0; this.firing = false;
      if (this.boatT <= 0) world.showboatDone(this);
      return;
    }
    if (intent.showboat && this.boatCD <= 0 && this.slideT <= 0) { this.boatT = .6; this.boatCD = 3; this.boatPose = (this.boatPose + 1) % 3; this.boatHit = false; MT.sfx('flourish'); world.event('boatStart', { c: this }); return; }
    if (intent.bomb && (this.pr.bombs > 0 || MT.cheats.infBombs || this.infBombs)) world.showstopper(this);
    let mx = intent.move[0], my = intent.move[1];
    const ml = Math.hypot(mx, my);
    if (intent.slide && this.slideCD <= 0 && this.slideT <= 0) {
      const d = ml > .2 ? [mx / ml, my / ml] : [Math.cos(this.facing), Math.sin(this.facing)];
      this.slideDir = d; this.slideT = .28; this.slideCD = T.slideCooldown * (this.addons.speed > 0 ? .6 : 1);
      MT.sfx('whoosh'); if (game.particles) game.particles.dust(B.x, B.y, 0, 6);
      world.event('slide', { c: this });
    }
    let speed = T.playerSpeed * (this.addons.speed > 0 ? 1.45 : 1) * (this.slowT > 0 ? .6 : 1);
    if (this.slideT > 0) { this.slideT -= dt; B.vx = this.slideDir[0] * T.slideSpeed; B.vy = this.slideDir[1] * T.slideSpeed; }
    else { B.vx = mx * speed; B.vy = my * speed; }
    B.vx += world.arena.beltAt(B.x, B.y);
    if (MT.cheats.noclip && this.ctl === 'local') { B.x += B.vx * dt; B.y += B.vy * dt; }
    else { B.update(dt, world.arena.map); }
    clampInterior(B, 5);
    // aim and fire
    if (intent.aim !== null && intent.aim !== undefined) { this.aim = intent.aim; this.lastAim = intent.aim; }
    this.firing = !!intent.fire;
    if (this.firing) this.facing = this.aim; else if (ml > .2) this.facing = Math.atan2(my, mx);
    this.fireCD -= dt;
    MT.fireWeapon(world, this, dt);
  }
  /** the rig follows the state (skipped in fast headless runs) */
  animate(dt) {
    if (MT.cfg.skipRigs) return;
    const B = this.body, dead = this.state === 'dead', poses = ['cheer', 'hips', 'wave'];
    const pose = this.pose || (this.boatT > 0 ? poses[this.boatPose] : dead ? 'die' : this.cheer > 0 ? 'cheer' : null);
    this.rig.update(dt, { x: B.x, y: B.y, z: B.z, vx: B.vx, vy: B.vy, facing: this.facing, point: this.firing && !dead, hurt: this.hurtT > 0, flip: this.slideT > 0 ? 1 - this.slideT / .28 : 0, pose, expr: this.boatT > 0 || this.cheer > 0 ? 'smile' : this.hurtT > 0 ? 'wince' : this.expr, down: dead && this.deadT < 1.4 ? 1 : 0 });
  }
  syncRs() {
    const B = this.body, s = this.rs;
    s.x = B.x; s.y = B.y; s.z = B.z; s.face = this.facing; s.aim = this.aim; s.vx = B.vx; s.vy = B.vy; s.state = this.state; s.hurt = this.hurtT > 0; s.slideU = this.slideT > 0 ? 1 - this.slideT / .28 : 0;
    s.wpn = this.weapon; s.firing = this.firing; s.invuln = this.invuln; s.shield = this.addons.shield > 0; s.records = this.addons.records > 0; s.speed = this.addons.speed > 0; s.boat = this.boatT > 0;
  }
  draw(r, t, world) {
    const s = this.rs; if (this.state === 'out' || world.phase === 'HOLD') return;
    if (this.state !== 'dead') MT.paint.drawPlayerTag(r, this, t);
    if (this.state === 'drop') r.queue(s.x, s.y, s.z + 30, g => { const a = r.w(s.x, s.y, s.z + 36), b = r.w(s.x, s.y, 200); px.line(g, a[0], a[1], b[0], b[1], '#c8d0e0'); }, { bias: -1 });
    if (this.state === 'drop') game.lights.add(s.x, s.y, 0, 40, .8, { color: '#fff6d0' });
    const blink = s.invuln > 0 && this.state === 'play' && Math.floor(t * 12) % 2 === 0;
    r.shadow(s.x, s.y, 6, .5);
    r.actor(s.x, s.y, s.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { flash: this.hurtT > .9 ? '#ffffff' : false, alpha: blink ? .35 : 1, xray: true, ghost: s.speed ? { color: SLOT_COLORS[this.slot], life: .2, alpha: .5, owner: s } : undefined });
    if (s.shield) {
      r.queue(s.x, s.y, 12, g => { const [sx, sy] = r.w(s.x, s.y, 12); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, 15, '#2ee6ff')); px.blend(g, .6, 'normal', () => { px.ell(g, sx, sy, 15, 15, '#2ee6ff'); px.ell(g, sx, sy, 13, 13, '#141018'); }); if (Math.floor(t * 8) % 3) E.font.text(g, 'KRUNCH-O', sx, sy - 3, '#ffcc33', { align: 'center', outline: false, font: 'tiny' }); }, { emissive: true, bias: 2 });
      game.lights.add(s.x, s.y, 12, 36, .5, { color: '#2ee6ff' });
    }
    if (s.records) for (let i = 0; i < 2; i++) { const a = this.recA + i * Math.PI, x = s.x + Math.cos(a) * 26, y = s.y + Math.sin(a) * 26; r.queue(x, y, 10, g => { const [sx, sy] = r.w(x, y, 10); px.disc(g, sx, sy, 4.5, '#8a5a08'); px.disc(g, sx, sy, 3.6, '#ffcc33'); px.disc(g, sx, sy, 1.2, '#140a24'); px.dot(g, sx - 2, sy - 2, '#fff6b0'); }, { emissive: true }); }
    if (this.weapon === 'laser' && this.laserSeg) MT.drawLaser(r, this, t);
  }
}
MT.Contestant = Contestant;

// ---- 12-weapons.js ----
// ---- weapons: data, firing, rockets, popcorn bags, the laser, the gold records (a new weapon is one entry here) ----
const WEAPONS = MT.WEAPONS = {
  blaster: { name: 'STUDIO BLASTER', letter: '', kind: 'primary', dur: 0, rate: () => MT.T.fireRate, sfx: 'pew', blurb: 'YOUR TRUSTY STUDIO-ISSUE PEA SHOOTER. NEVER RUNS OUT.' },
  spread: { name: 'TRIPLE PLAY', letter: 'S', kind: 'primary', dur: 14, rate: () => 8, sfx: 'triple', color: '#ff2e88', blurb: 'THREE BOLTS AT ONCE. CROWDS HATE IT.' },
  rockets: { name: 'PRIME-TIME ROCKETS', letter: 'R', kind: 'primary', dur: 12, rate: () => 3.5, sfx: 'rocket', color: '#ff9a3c', blurb: 'ROCKETS THAT BLOW UP IN A CROWD. SPLASH DAMAGE!' },
  popcorn: { name: 'POPCORN POPPER', letter: 'P', kind: 'primary', dur: 12, rate: () => 2.5, sfx: 'thunk', color: '#fff0a0', blurb: 'LOBS BAGS OVER COVER THAT BURST INTO KERNELS.' },
  laser: { name: 'LIMELIGHT LASER', letter: 'L', kind: 'primary', dur: 10, rate: () => 0, sfx: 'laser', color: '#2ee6ff', blurb: 'A BEAM THAT PIERCES EVERY FOE IN A LINE.' },
  records: { name: 'GOLD RECORDS', letter: 'G', kind: 'addon', dur: 15, color: '#ffcc33', blurb: 'TWO DISCS ORBIT YOU, SLICING FOES AND SHOTS.' },
  shield: { name: 'SPONSOR SHIELD', letter: 'B', kind: 'addon', dur: 8, color: '#2ee6ff', blurb: 'A BUBBLE NOTHING GETS THROUGH. BROUGHT TO YOU BY KRUNCH-O.' },
  speed: { name: 'SPEED SNEAKERS', letter: 'F', kind: 'addon', dur: 10, color: '#5fe0a0', blurb: 'RUN FASTER, SLIDE MORE OFTEN.' },
  bomb: { name: 'SHOWSTOPPER', letter: '', kind: 'instant', blurb: 'ONE MORE SCREEN-CLEARING FLASHBULB BOMB.' },
  life: { name: 'ENCORE', letter: '', kind: 'instant', blurb: 'AN EXTRA LIFE. THE CROWD WANTS MORE!' },
};
const CAPSULES = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
MT.CAPSULES = CAPSULES;
/** give a contestant a weapon, add-on or instant item */
function giveItem(world, c, id) {
  const w = WEAPONS[id]; if (!w) return;
  if (w.kind === 'primary') { c.weapon = id; c.wT = c.wMax = w.dur * MT.T.puDuration; c.laserAng = null; }
  else if (w.kind === 'addon') c.addons[id] = w.dur * MT.T.puDuration;
  else if (id === 'bomb') { if (c.pr.bombs >= 3) world.credit(c, 2000, { quiet: false }); else c.pr.bombs++; }
  else if (id === 'life') c.pr.lives++;
}
MT.giveItem = giveItem;
const ownerOf = c => c.netId;
function muzzle(c) { return [c.x + Math.cos(c.aim) * 10, c.y + Math.sin(c.aim) * 10, 14]; }
/** each step for a contestant: fire the weapon in hand while firing */
MT.fireWeapon = (world, c, dt) => {
  c.recA += 4.2 * dt;
  const W = WEAPONS[c.weapon] || WEAPONS.blaster;
  if (c.weapon === 'laser') { stepLaser(world, c, dt); return; }
  c.laserSeg = null;
  if (!c.firing) { if (c.fireCD < 0) c.fireCD = 0; return; }
  const rate = W.rate();
  let guard = 0;
  while (c.fireCD <= 0 && guard++ < 4) { fireOnce(world, c, c.weapon); c.fireCD += 1 / rate; }
};
function fireOnce(world, c, w) {
  const T = MT.T, [mx, my, mz] = muzzle(c), sp = T.bulletSpeed, col = SLOT_COLORS[c.slot], cos = world.cosmetic;
  const base = { x: mx, y: my, z: mz, r: 2.5, life: .9, team: 'p', color: col, core: '#ffffff', data: { owner: ownerOf(c), w } };
  if (w === 'blaster') world.pShots.fire(Object.assign({}, base, { vx: Math.cos(c.aim) * sp, vy: Math.sin(c.aim) * sp, dmg: 1 * T.dmgMul }));
  else if (w === 'spread') for (const da of [-.227, 0, .227]) world.pShots.fire(Object.assign({}, base, { vx: Math.cos(c.aim + da) * sp, vy: Math.sin(c.aim + da) * sp, dmg: 1 * T.dmgMul, color: '#ff2e88' }));
  else if (w === 'rockets') world.proj.push({ kind: 'rocket', x: mx, y: my, z: mz, ang: c.aim, v: 180, t: 0, owner: ownerOf(c), cosmetic: cos });
  else if (w === 'popcorn') {
    let tx = c.x + Math.cos(c.aim) * 90, ty = c.y + Math.sin(c.aim) * 90;
    const mg = c.ctl === 'local' && c.input === game.input && game.input.lastDevice === 'mouse' ? game.mouseGround() : null;
    if (mg && Math.hypot(mg[0] - c.x, mg[1] - c.y) < 90) { tx = mg[0]; ty = mg[1]; }
    tx = clamp(tx, AR.X0 + 4, AR.X1 - 4); ty = clamp(ty, AR.Y0 + 4, AR.Y1 - 4);
    const a = E.arc({ x: mx, y: my, z: mz }, { x: tx, y: ty, z: 0 }, 500, { time: .55 });
    world.proj.push({ kind: 'bag', x: mx, y: my, z: mz, vx: a.vx, vy: a.vy, vz: a.vz, grav: 500, t: 0, owner: ownerOf(c), cosmetic: cos, spin: 0 });
  }
  if (!world.quietFx) MT.sfx((WEAPONS[w] || WEAPONS.blaster).sfx, { vol: c.ctl === 'local' ? 1 : .5 });
}
/** the laser: a beam from the muzzle to the first wall, turning at most 7 rad/s, 16 damage a second to all it crosses */
function stepLaser(world, c, dt) {
  if (!c.firing) { c.laserSeg = null; c.laserAng = null; return; }
  c.laserAng = c.laserAng === null ? c.aim : approachAng(c.laserAng, c.aim, 7 * dt);
  const a = c.laserAng, [mx, my] = muzzle(c), map = world.arena.map;
  let L = 0; while (L < 420) { L += 4; const x = mx + Math.cos(a) * L, y = my + Math.sin(a) * L; if (map.heightAt(x, y) > 12 || x < 0 || y < 0 || x > AR.W || y > AR.H) break; }
  c.laserSeg = [mx, my, mx + Math.cos(a) * L, my + Math.sin(a) * L];
  c.laserHum = (c.laserHum || 0) - dt; if (c.laserHum <= 0) { c.laserHum = .12; if (!world.quietFx) MT.sfx('laser', { vol: c.ctl === 'local' ? 1 : .4 }); }
  if (world.cosmetic) return;
  const dmg = 16 * dt * MT.T.dmgMul, [x0, y0, x1, y1] = c.laserSeg, dx = x1 - x0, dy = y1 - y0, LL = dx * dx + dy * dy;
  const test = (t, rad) => { const k = clamp(((t.x - x0) * dx + (t.y - y0) * dy) / LL, 0, 1), px2 = x0 + dx * k - t.x, py2 = y0 + dy * k - t.y; return px2 * px2 + py2 * py2 < (rad + 3) * (rad + 3); };
  for (const e of world.enemies) if (!e.dead && !e.entering && test(e, e.r)) world.damageEnemy(e, dmg, { owner: ownerOf(c), w: 'laser', x: e.x, y: e.y, beam: true });
  if (world.boss) for (const p of world.boss.parts) if (p.alive && world.boss.partHittable(p)) { const q = world.boss.partPos(p); if (test(q, p.r)) world.damageBossPart(p, dmg, { owner: ownerOf(c), w: 'laser', beam: true }); }
  for (const t of world.targets) if (!t.dead && test(t, t.r)) world.damageTarget(t, dmg, { owner: ownerOf(c), w: 'laser', beam: true });
}
MT.drawLaser = (r, c, t) => {
  const [x0, y0, x1, y1] = c.laserSeg;
  r.queue((x0 + x1) / 2, (y0 + y1) / 2, 12, g => {
    const a = r.w(x0, y0, 14), b = r.w(x1, y1, 12), w = 3 + Math.sin(t * 40);
    px.line(g, a[0], a[1], b[0], b[1], '#1a8aa0', Math.round(w + 2)); px.line(g, a[0], a[1], b[0], b[1], '#2ee6ff', Math.round(w)); px.line(g, a[0], a[1], b[0], b[1], '#ffffff', 1);
    px.disc(g, b[0], b[1], 3 + Math.sin(t * 50), '#c0fbff');
  }, { emissive: true, bias: 3 });
  for (let k = 0; k <= 1; k += .34) game.lights.add(lerp(x0, x1, k), lerp(y0, y1, k), 12, 40, .5, { color: '#2ee6ff' });
};
/** the custom projectiles: rockets and popcorn bags (cosmetic copies on a client deal no damage) */
MT.stepProjectiles = (world, dt) => {
  for (const p of world.proj) {
    p.t += dt;
    if (p.kind === 'rocket') {
      p.v = Math.min(300, p.v + 300 * dt); p.x += Math.cos(p.ang) * p.v * dt; p.y += Math.sin(p.ang) * p.v * dt;
      if (Math.random() < .7 && game.particles && !world.quietFx) game.particles.smoke(p.x, p.y, p.z, 1, { size: .5, color: '#c8c0d0' });
      let hit = p.t > .9 || world.arena.map.heightAt(p.x, p.y) > p.z;
      if (!hit && !p.cosmetic) { for (const e of world.enemies) if (!e.dead && !e.entering && dist2(e, p) < (e.r + 3) ** 2) { hit = true; world.damageEnemy(e, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; } }
      if (!hit && !p.cosmetic && world.boss) for (const q of world.boss.parts) if (q.alive && world.boss.partHittable(q)) { const pp = world.boss.partPos(q); if (dist2(pp, p) < (q.r + 3) ** 2) { hit = true; world.damageBossPart(q, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; } }
      if (!hit && !p.cosmetic) for (const tg of world.targets) if (!tg.dead && dist2(tg, p) < (tg.r + 3) ** 2) { hit = true; world.damageTarget(tg, 4 * MT.T.dmgMul, { owner: p.owner, w: 'rockets' }); break; }
      if (!hit && p.cosmetic) for (const e of world.enemies) if (dist2(e, p) < (e.r + 3) ** 2) hit = true;
      if (hit) { p.dead = true; world.explode(p.x, p.y, 24, p.cosmetic ? 0 : 3 * MT.T.dmgMul, p.owner, 'rockets'); }
    } else if (p.kind === 'bag') {
      p.vz -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.spin += dt * 12;
      if (p.z <= 0) {
        p.dead = true; world.explode(p.x, p.y, 18, p.cosmetic ? 0 : 2 * MT.T.dmgMul, p.owner, 'popcorn', true);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p.t; world.pShots.fire({ x: p.x, y: p.y, z: 6, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 2, life: .35, dmg: 1.5 * MT.T.dmgMul, team: 'p', pierce: true, color: '#fff0a0', core: '#ffffff', data: { owner: p.owner, w: 'popcorn', pierceLeft: 1 } }); }
        if (!world.quietFx) MT.sfx('kernel');
      }
    }
  }
  E.prune(world.proj, p => p.dead);
};
MT.drawProjectiles = (r, world, t) => {
  for (const p of world.proj) {
    if (p.kind === 'rocket') {
      r.queue(p.x, p.y, p.z, g => { const a = r.w(p.x, p.y, p.z), b = r.w(p.x - Math.cos(p.ang) * 8, p.y - Math.sin(p.ang) * 8, p.z); px.line(g, b[0], b[1], a[0], a[1], '#5a5468', 3); px.line(g, b[0], b[1], a[0], a[1], '#c8d0e0', 1); px.disc(g, a[0], a[1], 2, '#ff3344'); const f = r.w(p.x - Math.cos(p.ang) * 10, p.y - Math.sin(p.ang) * 10, p.z); px.disc(g, f[0], f[1], 2 + Math.random() * 1.5, '#ffcc33'); }, { emissive: true });
      game.lights.add(p.x, p.y, p.z, 28, .5, { color: '#ff9a3c' });
    } else if (p.kind === 'bag') {
      r.decal(() => r.groundDisc(p.x, p.y, 3, '#000000', .35));
      r.sprite(p.x, p.y, p.z, SPR.bag, { anchor: 'center', scale: unzoom(r) });
    }
  }
};

// ---- 13-enemies.js ----
// ---- enemies: one archetype record each (a new enemy is one entry); separation, drops; painters read e.rs only ----
// Archetype: { kind, name, hp, speed, r, contact, cash, rat, drops, counted, make(world, e, o), update(e, dt, world), draw(r, e, t, world) }
const ENEMIES = MT.ENEMIES = {};
const foeSpeed = () => MT.T.enemySpeed * diffOf().enemySpeed;
const bulletSpd = v => v * MT.T.enemyBulletSpeed * diffOf().enemyBullet;
const PALETTE = { goon: ['#3a4a6a', '#ffcc33', '#e0b090', '#ffffff'], clapbot: ['#9aa4b8', '#ff3344', '#d8e0f0', '#ffcc33'], popper: ['#ffcc33', '#ff2e88', '#2ee6ff', '#ffffff'],
  mime: ['#ffffff', '#141018', '#d02a3a'], disco: ['#c8d0e0', '#ff2e88', '#2ee6ff', '#ffcc33'], heckler: ['#d02a3a', '#fff7e8', '#ff9a3c'], hecklerKing: ['#7a2ad0', '#ffcc33', '#fff7e8'],
  tank: ['#4a4458', '#ffcc33', '#ff3344'], snake: ['#2a2838', '#ffcc33', '#ff2e88'], snakeSeg: ['#2a2838', '#ffcc33'], brute: ['#9a6a3a', '#ffcc33', '#d02a3a'], crate: ['#c87830', '#ffcc33'], lock: ['#c8d0e0', '#ff3344'], paparazzo: ['#b89a6a', '#ffffff'] };
MT.PALETTE = PALETTE;
function nearestContestant(world, e, maxD = 1e9) {
  let best = null, bd = maxD * maxD;
  for (const c of world.contestants) { if (!c.targetable) continue; const d = dist2(c, e); if (d < bd) { bd = d; best = c; } }
  return best;
}
MT.nearestContestant = nearestContestant;
function walkToward(e, tx, ty, sp, dt, wob = 0) {
  const a = Math.atan2(ty - e.y, tx - e.x) + wob;
  e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a;
}
const humanDraw = (o = {}) => (r, e, t) => {
  const s = e.rs; if (!e.rig) e.rig = ENEMY_RIGS[e.rigKind || e.kind]();
  r.shadow(s.x, s.y, e.r * .9, .45);
  r.actor(s.x, s.y, s.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: s.flash > 0 ? '#ffffff' : false, alpha: s.alpha, every: o.every && !s.flash ? 2 : undefined, key: e, outline: o.outline !== false });
};
// ------------------------------------------------------------------- goon
ENEMIES.goon = { kind: 'goon', name: 'STUDIO SECURITY', hp: 1, speed: 52, r: 6, contact: 1, cash: 100, rat: 1, drops: { bill: .08, capsule: .012, prize: .01 }, counted: true,
  make(world, e) { e.speed = (52 + (RNG.spawn() * 12 - 6)); e.wob = (RNG.spawn() - .5) * .9; e.atk = new E.Attack('bash', { wind: .3, active: .1, recover: .3 }); e.state = 'walk'; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); const ph = e.atk.update(dt);
    if (e.atk.busy) { e.vx = e.vy = 0; e.state = e.atk.phase === 'wind' ? 'wind' : 'swing';
      if (e.atk.phase === 'active' && c && !e.swingHit && dist(c, e) < 14 + c.r + e.r - 4) { e.swingHit = true; world.hurtContestant(c, MT.T.contactDmg, { kind: 'goon', id: e.id, x: e.x, y: e.y }); }
      if (ph === 'active' && !world.quietFx) MT.sfx('baton');
      return; }
    e.state = 'walk';
    if (!c) { e.vx = e.vy = 0; return; }
    const d = dist(c, e);
    if (d < 16 + c.r) { e.atk.start(); e.swingHit = false; e.face = angTo(e, c); return; }
    walkToward(e, c.x, c.y, e.speed * foeSpeed(), dt, d > 40 ? e.wob * Math.sin(e.t * 1.3 + e.id) : 0);
  },
  rigState(e) { return { attack: e.atk ? e.atk.state : null, stance: 'ready' }; },
  draw: humanDraw({ every: true }) };
// ------------------------------------------------------------------- clapbot
ENEMIES.clapbot = { kind: 'clapbot', name: 'APPLAUSE ROBOT', hp: 1, speed: 115, r: 5.5, contact: 1, cash: 150, rat: 1, drops: { bill: .1 }, counted: true,
  make(world, e) { e.hopT = RNG.spawn() * .4; e.state = 'rest'; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.hopT -= dt;
    if (e.state === 'hop') { if (e.hopT <= 0) { e.state = 'rest'; e.hopT = .4; e.vx *= .1; e.vy *= .1; } }
    else { e.vx = e.vy = 0; if (e.hopT <= 0 && c) { const a = angTo(e, c) + (RNG.ai() - .5) * 1.4; const sp = 115 * foeSpeed(); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.face = a; e.state = 'hop'; e.hopT = .25; if (!world.quietFx && RNG.fx() < .3) MT.sfx('hop'); } }
  },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) e.rig = ENEMY_RIGS.clapbot();
    const b = e.rig; if (!MT.cfg.skipRigs) { b.update(1 / 60, { squash: s.state === 'rest' ? -.3 : .25, look: [Math.cos(s.face), Math.sin(s.face)] }); }
    const hop = s.state === 'hop' ? 5 : 0;
    r.shadow(s.x, s.y, 5, .45);
    r.actor(s.x, s.y, s.z + hop, (g, ox, oy) => { b.draw(g, ox, oy, r.view); const k = Math.abs(Math.sin(t * 14 + e.id)); for (const sd of [-1, 1]) { const hx = ox + sd * (4 + k * 3), hy = oy - 8; px.rect(g, hx - 1.5, hy - 3, 3, 5, '#d8e0f0'); px.rect(g, hx - 1.5, hy - 3, 3, 1, '#ffffff'); } px.line(g, ox, oy - 14, ox, oy - 18, '#9aa4b8'); px.dot(g, ox, oy - 19, Math.floor(t * 4 + e.id) % 2 ? '#ff3344' : '#ffcc33'); }, { flash: s.flash > 0 ? '#ffffff' : false, every: s.flash ? undefined : 2, key: e });
  } };
// ------------------------------------------------------------------- popper
ENEMIES.popper = { kind: 'popper', name: 'PARTY POPPER', hp: 2, speed: 38, r: 6, contact: 0, cash: 250, rat: 2, drops: { stack: .1, capsule: .03 }, counted: true,
  make(world, e) { e.state = 'walk'; e.fuse = 0; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e);
    if (e.state === 'fuse') { e.vx = e.vy = 0; e.fuse += dt; if (e.fuse >= .6) { world.killEnemy(e, { owner: null, w: 'fuse', self: true }); } return; }
    if (!c) { e.vx = e.vy = 0; return; }
    if (dist(c, e) < 18 + c.r) { e.state = 'fuse'; e.fuse = 0; if (!world.quietFx) MT.sfx('hiss'); return; }
    walkToward(e, c.x, c.y, 38 * foeSpeed(), dt, Math.sin(e.t * 5) * .4);
  },
  onDeath(e, world) { for (let i = 0; i < 8; i++) world.fireFoe('shard', e.x, e.y, i / 8 * TAU + e.id, bulletSpd(90), { life: 1.2 }); if (!world.quietFx) MT.sfx('pop'); },
  rigState(e) { return { pose: e.state === 'fuse' ? 'cheer' : null, expr: e.state === 'fuse' ? 'shout' : null }; },
  draw(r, e, t) {
    humanDraw()(r, e, t); const s = e.rs;
    if (s.state === 'fuse') { const k = s.t2 || 0; r.queue(s.x, s.y, 24, g => { const [sx, sy] = r.w(s.x, s.y, 26 + k * 6); px.disc(g, sx, sy, 2 + Math.random() * 2, Math.floor(t * 20) % 2 ? '#ffcc33' : '#ff3344'); }, { emissive: true }); r.decal(() => r.groundRing(s.x, s.y, 18 + 6 * k, '#ff3344', .7)); }
  } };
// ------------------------------------------------------------------- mime (doesn't count for the clear)
ENEMIES.mime = { kind: 'mime', name: 'LAND MIME', hp: 1, speed: 0, r: 6, contact: 0, cash: 300, rat: 2, drops: { bill: .3 }, counted: false,
  make(world, e) { e.state = 'idle'; e.tele = 0; e.alpha = .45; e.face = Math.PI / 2; },
  update(e, dt, world) {
    e.vx = e.vy = 0;
    const c = nearestContestant(world, e, 34);
    if (e.state === 'idle') { if (c) { e.state = 'tele'; e.tele = 0; } }
    else { e.tele += dt; if (Math.floor(e.tele * 8) !== Math.floor((e.tele - dt) * 8) && !world.quietFx) MT.sfx('beep'); if (e.tele >= .7) { world.explodeFoe(e.x, e.y, 36, 1, 'mime', e.id); world.killEnemy(e, { owner: null, w: 'blast', self: true, noCash: true }); } }
  },
  rigState(e) { return { pose: null }; },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) { e.rig = ENEMY_RIGS.mime(); mimeBox(e.rig, e); }
    const shake = s.state === 'tele' ? (Math.random() - .5) * 2.5 : 0;
    r.shadow(s.x, s.y, 5, .35);
    r.actor(s.x + shake, s.y, s.z, (g, ox, oy) => e.rig.draw(g, ox, oy, r.view), { flash: s.flash > 0 || (s.state === 'tele' && Math.floor(t * 16) % 2) ? '#ffffff' : false, alpha: s.state === 'tele' ? 1 : .45 });
    if (s.state === 'tele') r.decal(() => r.groundRing(s.x, s.y, 36, '#ff3344', .8));
  } };
/** the mime's "trapped in a box": after the rig solves its pose, the hands go flat against invisible walls */
function mimeBox(rig, e) {
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J, k = this._mt = (this._mt || 0) + 1 / 60, s = this.o.size || 1, w = Math.sin(k * 1.4) * 2.2 * s, tele = e.rs && e.rs.state === 'tele';
    const shake = tele ? Math.sin(k * 60) * 1.2 : 0;
    J.handR = [5 * s, 3.5 * s + w * .3, (19 + w + shake) * s]; J.handL = [5 * s, -3.5 * s + w * .3, (13 - w * .6 + shake) * s];
    J.elbowR = [2.5 * s, 4.5 * s, 17 * s]; J.elbowL = [2.5 * s, -4.5 * s, 14 * s];
  };
}
// ------------------------------------------------------------------- disco balls (big ones split in two)
const discoDef = (big, small) => ({ kind: big ? 'discoBig' : 'disco', name: 'DISCO BALL', hp: big ? 10 : small ? 3 : 5, speed: 70, r: big ? 11 : small ? 6 : 8, contact: 1, cash: big ? 800 : 400, rat: 3, drops: { stack: .2, capsule: .05 }, counted: true,
  make(world, e, o) { const a = (o && o.ang !== undefined) ? o.ang : Math.PI / 4 + Math.floor(RNG.spawn() * 4) * Math.PI / 2; e.vx = Math.cos(a) * 70; e.vy = Math.sin(a) * 70; e.fireT = 1.5 + RNG.spawn(); e.cross = false; e.state = 'move'; e.spin = 0; if (small) { e.maxHp = e.hp = 3 * MT.T.enemyHp; e.r = 6; } },
  update(e, dt, world) {
    const sp = 70 * foeSpeed(), l = Math.hypot(e.vx, e.vy) || 1; e.vx = e.vx / l * sp; e.vy = e.vy / l * sp; e.spin += dt * 3;
    e.fireT -= dt; e.noCollide = true;
    if (e.x < AR.X0 + e.r && e.vx < 0 || e.x > AR.X1 - e.r && e.vx > 0) e.vx = -e.vx;
    if (e.y < AR.Y0 + e.r && e.vy < 0 || e.y > AR.Y1 - e.r && e.vy > 0) e.vy = -e.vy;
    e.state = e.fireT < .4 ? 'flare' : 'move';
    if (e.fireT <= 0) { e.fireT = 3; const off = e.cross ? Math.PI / 4 : 0; e.cross = !e.cross; for (let i = 0; i < 4; i++) world.fireFoe('beam', e.x, e.y, off + i * Math.PI / 2, bulletSpd(110)); if (!world.quietFx) MT.sfx('zap'); }
  },
  onDeath(e, world) { if (big) for (const s of [-1, 1]) world.spawnEnemy('discoSmall', e.x + s * 6, e.y, { ang: Math.atan2(e.vy, e.vx) + s * Math.PI / 2, inside: true }); },
  draw(r, e, t) {
    const s = e.rs, R = e.r * 1.1, z = 9 + Math.abs(Math.sin(t * 4 + e.id)) * 3;
    r.shadow(s.x, s.y, R, .45);
    r.actor(s.x, s.y, z, (g, ox, oy) => {
      const cy = oy - R, sp = (s.t || 0) * 3;
      px.disc(g, ox, cy, R + 1, '#141018'); px.disc(g, ox, cy, R, '#8a90a8');
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const fx = ox + i * R / 3.4, fy = cy + j * R / 3.4; if ((fx - ox) ** 2 + (fy - cy) ** 2 > (R - 1) ** 2) continue; const k = Math.sin(sp + i * 1.3 + j * .7); px.rect(g, Math.round(fx - 1), Math.round(fy - 1), 2, 2, k > .7 ? '#ffffff' : k > .2 ? '#d8e0f0' : k > -.4 ? '#a8b0c8' : '#6a7090'); }
      if (s.state === 'flare') for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (e.cross ? Math.PI / 4 : 0); px.line(g, ox, cy, ox + Math.cos(a) * (R + 5), cy + Math.sin(a) * (R + 5) * .8, '#ffcc33'); }
      px.line(g, ox, cy - R, ox, cy - R - 3, '#c8d0e0');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
    game.lights.add(s.x, s.y, 10, 30 + (s.state === 'flare' ? 20 : 0), .4, { color: ['#ff2e88', '#2ee6ff', '#ffcc33'][Math.floor(t * 3 + e.id) % 3] });
  } });
ENEMIES.disco = discoDef(false, false); ENEMIES.discoBig = discoDef(true, false); ENEMIES.discoSmall = Object.assign(discoDef(false, true), { kind: 'discoSmall', cash: 200 });
// ------------------------------------------------------------------- hecklers (and the Heckler King)
const hecklerDef = king => ({ kind: king ? 'hecklerKing' : 'heckler', name: king ? 'THE HECKLER KING' : 'STUDIO AUDIENCE', hp: king ? 12 : 3, speed: 45, r: king ? 7 : 6, contact: 0, cash: king ? 1500 : 350, rat: king ? 6 : 2, drops: king ? {} : { prize: .06, capsule: .04 }, counted: true,
  make(world, e, o) { e.throwT = 1 + RNG.spawn() * 1.2; e.strafe = RNG.spawn() < .5 ? 1 : -1; e.state = 'move'; e.throwPose = 0; if (king) e.carriesKey = true; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.throwT -= dt; e.throwPose = Math.max(0, e.throwPose - dt);
    if (!c) { e.vx = e.vy = 0; return; }
    const d = dist(c, e), a = angTo(e, c);
    let mv = d > 110 ? 1 : d < 70 ? -1 : 0, sp = 45 * foeSpeed();
    e.vx = Math.cos(a) * mv * sp + Math.cos(a + Math.PI / 2) * e.strafe * sp * .6; e.vy = Math.sin(a) * mv * sp + Math.sin(a + Math.PI / 2) * e.strafe * sp * .6; e.face = a;
    if (RNG.ai() < dt * .3) e.strafe = -e.strafe;
    e.state = e.throwPose > 0 ? 'throw' : 'move';
    if (e.throwT <= 0) {
      e.throwT = king ? 2.6 : 2.2; e.throwPose = .35;
      const lead = .6, tx = c.x + c.body.vx * lead, ty = c.y + c.body.vy * lead, n = king ? 3 : 1;
      for (let k = 0; k < n; k++) world.lob('tomato', e.x, e.y, 18, clamp(tx + (k - (n - 1) / 2) * 22, AR.X0 + 6, AR.X1 - 6), clamp(ty + (k ? 10 : 0), AR.Y0 + 6, AR.Y1 - 6), 1.0, { id: e.id });
      if (!world.quietFx) MT.sfx('boo');
    }
  },
  rigState(e) { return { attack: e.throwPose > 0 ? E.move('throw', 1 - e.throwPose / .35) : null }; },
  draw(r, e, t) {
    humanDraw()(r, e, t); const s = e.rs;
    if (!king && !MT.cfg.skipRigs && e.rig) { r.queue(s.x, s.y, 20, g => { const h = e.rig.hand('L'), [sx, sy] = r.w(h.x, h.y, h.z + 3); px.rect(g, sx - 1, sy - 6, 3, 7, '#ffcc33'); px.rect(g, sx - 1, sy - 8, 2, 3, '#ffcc33'); }, { bias: 1 }); }
  } });
ENEMIES.heckler = hecklerDef(false); ENEMIES.hecklerKing = hecklerDef(true);
// ------------------------------------------------------------------- dolly tank
ENEMIES.tank = { kind: 'tank', name: 'DOLLY TANK', hp: 14, speed: 26, r: 12, contact: 1, cash: 1000, rat: 6, drops: { case: .15, capsule: .15 }, counted: true, big: true,
  make(world, e) { e.turret = e.face = Math.PI / 2; e.fireT = 2 + RNG.spawn(); e.state = 'move'; e.tread = 0; e.recoil = 0; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.fireT -= dt; e.recoil = Math.max(0, e.recoil - dt * 4);
    if (!c) { e.vx = e.vy = 0; return; }
    const a = angTo(e, c); e.face = approachAng(e.face, a, .8 * dt); e.turret = approachAng(e.turret, a, 1.4 * dt);
    const sp = (dist(c, e) > 90 ? 26 : 8) * foeSpeed(); e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp; e.tread += sp * dt;
    e.state = e.fireT < .4 ? 'aim' : 'move';
    if (e.fireT <= 0) { e.fireT = 2.4; e.recoil = 1; world.fireFoe('shell', e.x + Math.cos(e.turret) * 14, e.y + Math.sin(e.turret) * 14, e.turret, bulletSpd(120), { r: 4, life: 3 }); if (!world.quietFx) MT.sfx('shellboom', { vol: .5 }); }
    if (e.state === 'aim' && Math.floor(e.fireT * 10) % 2 && !world.quietFx && e.fireT > .35) MT.sfx('whine', { vol: .4 });
  },
  onDeath(e, world) { world.explode(e.x, e.y, 30, 4, null, 'tank', false, true); },
  draw(r, e, t) {
    const s = e.rs, f = s.face, tu = s.turret === undefined ? f : s.turret;
    r.shadow(s.x, s.y, 13, .5);
    r.actor(s.x, s.y, 0, (g, ox, oy) => {
      const P = (fx, fy, z) => { const c = Math.cos(f), sn = Math.sin(f); return r.w(s.x + c * fx - sn * fy, s.y + sn * fx + c * fy, z); };
      const box = (x0, y0, x1, y1, z0, z1, top, side) => { const b = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]; const lo = [P(x0, y1, z0), P(x1, y1, z0)]; px.poly(g, [b[3], b[2], P(x1, y1, z0), P(x0, y1, z0)], side); px.poly(g, [b[0], b[3], P(x0, y1, z0), P(x0, y0, z0)], side); px.poly(g, [b[1], b[2], P(x1, y1, z0), P(x1, y0, z0)], E.tones(side).sh); px.poly(g, b, top); };
      box(-13, -11, 13, -6, 0, 6, '#2a2838', '#141018'); box(-13, 6, 13, 11, 0, 6, '#2a2838', '#141018');
      for (let k = -12; k < 13; k += 4) { const u = ((k + (s.tread || 0)) % 26 + 26) % 26 - 13; for (const yy of [-11, 6]) { const a = P(u, yy, 6.2), b = P(u, yy + 5, 6.2); px.line(g, a[0], a[1], b[0], b[1], '#5a5468'); } }
      box(-10, -7, 10, 7, 3, 10, '#5a5468', '#3a3448');
      const c = Math.cos(tu - f), sn = Math.sin(tu - f), rec = (s.recoil || 0) * 3;
      const T = (fx, fy, z) => P(c * fx - sn * fy, sn * fx + c * fy, z);
      px.poly(g, [T(-6, -5, 16), T(6 - rec, -5, 16), T(6 - rec, 5, 16), T(-6, 5, 16)], '#4a4458'); px.poly(g, [T(-6, 5, 16), T(6 - rec, 5, 16), T(6 - rec, 5, 10), T(-6, 5, 10)], '#2a2838');
      const L = T(11 - rec, 0, 13); px.line(g, T(5 - rec, 0, 13)[0], T(5 - rec, 0, 13)[1], L[0], L[1], '#1a1420', 4); px.disc(g, L[0], L[1], 2.5, s.state === 'aim' && Math.floor(t * 16) % 2 ? '#ffffff' : '#6ab0ff');
      const tl = T(-4, 0, 17); px.dot(g, tl[0], tl[1], '#ff3344');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
    if (s.state === 'aim') r.decal(g => { const a = r.w(s.x, s.y, 0), b = r.w(s.x + Math.cos(tu) * 160, s.y + Math.sin(tu) * 160, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ff9a3c'); });
  } };
// ------------------------------------------------------------------- cable snake: a head and segments along its path
ENEMIES.snake = { kind: 'snake', name: 'CABLE SNAKE', hp: 8, speed: 60, r: 7, contact: 1, cash: 1200, rat: 5, drops: { case: .3 }, counted: true,
  make(world, e) { e.path = []; e.segs = []; e.lungeT = 3 + RNG.spawn() * 2; e.state = 'move'; e.weave = RNG.spawn() * 6; for (let i = 0; i < 10; i++) { const s = world.spawnEnemy('snakeSeg', e.x, e.y, { head: e, idx: i, entering: e.entering, door: e.door }); e.segs.push(s); } for (let i = 0; i < 80; i++) e.path.push([e.x, e.y]); },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e); e.lungeT -= dt;
    if (!c) { e.vx = e.vy = 0; return; }
    let sp = 60 * foeSpeed();
    if (e.lungeT < .5 && e.lungeT > 0) { sp *= -.3; e.state = 'rear'; } else if (e.lungeT <= 0 && e.lungeT > -.6) { sp *= 1.5 * 1.6; e.state = 'lunge'; } else { e.state = 'move'; if (e.lungeT <= -.6) e.lungeT = 3 + RNG.ai() * 2; }
    const a = angTo(e, c) + (e.state === 'move' ? Math.sin(e.t * 2.4 + e.weave) * .8 : 0); e.face = approachAng(e.face, a, 3.2 * dt);
    e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
  },
  after(e, dt, world) {   // the segments follow the head's path history: one point every 6 units
    const last = e.path[0]; if (!last || Math.hypot(e.x - last[0], e.y - last[1]) >= 3) { e.path.unshift([e.x, e.y]); if (e.path.length > 90) e.path.pop(); }
    E.prune(e.segs, s => s.dead);
    e.segs.forEach((s, i) => { const p = e.path[Math.min(e.path.length - 1, (i + 1) * 2)]; if (p) { s.face = Math.atan2(p[1] - s.y, p[0] - s.x); s.x = p[0]; s.y = p[1]; } s.entering = e.entering; });
  },
  onDeath(e, world) { for (const s of e.segs) if (!s.dead) world.killEnemy(s, { owner: null, w: 'chain', self: true, noCash: true }); if (!world.quietFx) MT.sfx('snap'); },
  draw(r, e, t) {
    const s = e.rs;
    r.shadow(s.x, s.y, 7, .45);
    r.actor(s.x, s.y, 4, (g, ox, oy) => {
      const f = s.face, c = Math.cos(f), sn = Math.sin(f), P = (fx, fy, z) => r.w(s.x + c * fx - sn * fy, s.y + sn * fx + c * fy, z + (s.state === 'rear' ? 6 : 0));
      const b = [P(-6, -5, 10), P(6, -5, 10), P(6, 5, 10), P(-6, 5, 10)]; px.poly(g, [b[3], b[2], P(6, 5, 2), P(-6, 5, 2)], '#1a1420'); px.poly(g, b, '#3a3448');
      const pr = [P(7, -2.5, 7), P(12, -2.5, 7), P(7, 2.5, 7), P(12, 2.5, 7)]; px.line(g, pr[0][0], pr[0][1], pr[1][0], pr[1][1], '#ffcc33', 2); px.line(g, pr[2][0], pr[2][1], pr[3][0], pr[3][1], '#ffcc33', 2);
      const ey = P(3, 0, 11); px.dot(g, ey[0] - 1, ey[1], '#ff3344'); px.dot(g, ey[0] + 1, ey[1], '#ff3344');
      if (s.state === 'lunge' && Math.random() < .5) px.dot(g, pr[1][0], pr[1][1], '#2ee6ff');
    }, { flash: s.flash > 0 ? '#ffffff' : false });
  } };
ENEMIES.snakeSeg = { kind: 'snakeSeg', name: 'CABLE', hp: 2, speed: 0, r: 5, contact: 1, cash: 150, rat: 1, drops: {}, counted: false, child: true,
  make(world, e, o) { e.head = o.head; e.idx = o.idx; },
  update(e) { e.vx = e.vy = 0; },
  draw(r, e, t) {
    const s = e.rs;
    r.queue(s.x, s.y, 4, g => { const [sx, sy] = r.w(s.x, s.y, 5); px.ell(g, sx, sy, 5.5, 4.5, '#141018'); px.ell(g, sx, sy - .5, 4.5, 3.5, (e.idx || 0) % 3 === 0 ? '#ffcc33' : '#2a2838'); px.dot(g, sx - 1, sy - 2, '#5a5468'); if (s.flash > 0) px.ell(g, sx, sy - .5, 4.5, 3.5, '#ffffff'); }, { solid: true });
  } };
// ------------------------------------------------------------------- the brute: THE CEREAL KILLER, a mascot
ENEMIES.brute = { kind: 'brute', name: 'THE CEREAL KILLER', hp: 24, speed: 40, r: 11, contact: 2, cash: 2000, rat: 8, drops: { case: .4, capsule: .25 }, counted: true, big: true,
  make(world, e) { e.state = 'walk'; e.cycle = 2 + RNG.spawn() * 2; e.stun = 0; e.chargeT = 0; e.charge = null; },
  update(e, dt, world) {
    const c = e.target = nearestContestant(world, e);
    if (e.state === 'stun') { e.vx = e.vy = 0; e.stun -= dt; if (e.stun <= 0) { e.state = 'walk'; e.cycle = 4; } return; }
    if (e.state === 'tele') { e.vx = e.vy = 0; e.chargeT += dt; if (Math.floor(e.chargeT * 3.5) !== Math.floor((e.chargeT - dt) * 3.5) && !world.quietFx) MT.sfx('stomp'); if (e.chargeT >= .8) { e.state = 'charge'; e.chargeT = 0; } return; }
    if (e.state === 'charge') {
      e.chargeT += dt; const sp = 220 * foeSpeed(); e.vx = Math.cos(e.face) * sp; e.vy = Math.sin(e.face) * sp;
      const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
      if (nx < AR.X0 + e.r || nx > AR.X1 - e.r || ny < AR.Y0 + e.r || ny > AR.Y1 - e.r) { e.state = 'stun'; e.stun = 1.5; e.vx = e.vy = 0; world.event('bruteCrash', { e }); if (!world.quietFx) { MT.sfx('crash'); world.shake(5); } return; }
      if (e.chargeT > 1.4) { e.state = 'walk'; e.cycle = 4; }
      return;
    }
    e.cycle -= dt;
    if (!c) { e.vx = e.vy = 0; return; }
    if (e.cycle <= 0) { e.state = 'tele'; e.chargeT = 0; e.face = angTo(e, c); if (!world.quietFx) MT.sfx('roar'); return; }
    walkToward(e, c.x, c.y, 40 * foeSpeed(), dt);
  },
  dmgMul(e) { return e.state === 'stun' ? 2 : 1; },
  rigState(e) { return { pose: e.state === 'tele' ? 'crouch' : null, sprint: e.state === 'charge', expr: e.state === 'stun' ? 'wince' : 'angry', hurt: e.state === 'stun' }; },
  draw(r, e, t) {
    const s = e.rs; humanDraw()(r, e, t);
    if (!MT.cfg.skipRigs && e.rig) r.queue(s.x, s.y, 40, g => {   // the mascot's bear ears and the cereal-box emblem
      const h = e.rig.head(), [hx, hy] = r.w(h.x, h.y, h.z + 4); for (const sd of [-1, 1]) { px.disc(g, hx + sd * 6, hy - 6, 3.5, '#5a3a1a'); px.disc(g, hx + sd * 6, hy - 6, 2, '#c89060'); }
    }, { bias: 2 });
    if (s.state === 'tele') { r.decal(g => { const k = (s.t2 || 0) / .8; r.groundRing(s.x, s.y, 12 + k * 14, '#ff3344', .8); const a = r.w(s.x, s.y, 0), b = r.w(s.x + Math.cos(s.face) * 220, s.y + Math.sin(s.face) * 220, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 10) % 2 ? '#ff3344' : '#ff9a3c', 2); }); }
    if (s.state === 'stun') for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3, x = s.x + Math.cos(a) * 9, y = s.y + Math.sin(a) * 9; r.queue(x, y, 44, g => { const [sx, sy] = r.w(x, y, 46); px.sprite(g, SPR.star, sx - 5, sy - 5); }, { emissive: true }); }
  } };
// ------------------------------------------------------------------- the green room's paparazzi: harmless, they flash
ENEMIES.paparazzo = { kind: 'paparazzo', name: 'PAPARAZZI', hp: 999, speed: 30, r: 6, contact: 0, cash: 0, rat: 0, drops: {}, counted: false, harmless: true,
  make(world, e) { e.tx = e.x; e.ty = e.y; e.flashT = 0; e.pidx = world.enemies.length; },
  update(e, dt, world) { if (dist2(e, { x: e.tx, y: e.ty }) < 16 || RNG.ai() < dt * .2) { e.tx = 40 + RNG.ai() * 288; e.ty = 40 + RNG.ai() * 160; } walkToward(e, e.tx, e.ty, 30, dt); e.flashT = Math.max(0, e.flashT - dt); },
  draw(r, e, t) {
    const s = e.rs; if (!e.rig) e.rig = MT.makePaparazzo(e.id);
    r.shadow(s.x, s.y, 5, .45);
    r.actor(s.x, s.y, 0, (g, ox, oy) => { e.rig.draw(g, ox, oy, r.view); }, {});
    if (!MT.cfg.skipRigs) r.queue(s.x, s.y, 18, g => { const h = e.rig.hand('R'), [sx, sy] = r.w(h.x, h.y, h.z + 2); px.rect(g, sx - 3, sy - 2, 6, 4, '#2a2838'); px.dot(g, sx, sy, '#9ab0c8'); if (s.flashT > 0) { px.disc(g, sx, sy - 3, 5, '#ffffff'); } }, { bias: 2, emissive: s.flashT > 0 });
  } };
const RIG_STATE = { goon: 1, popper: 1, mime: 1, heckler: 1, hecklerKing: 1, brute: 1, paparazzo: 1 };
/** a rig enemy's animation each step (from its rs: the same on a client) */
MT.animateEnemy = (e, dt) => {
  if (MT.cfg.skipRigs || !RIG_STATE[e.kind]) return;
  if (!e.rig) e.rig = e.kind === 'paparazzo' ? MT.makePaparazzo(e.id) : ENEMY_RIGS[e.kind]();
  if (e.kind === 'mime' && !e.rig._boxed) { mimeBox(e.rig, e); e.rig._boxed = true; }
  const A = ENEMIES[e.kind], s = e.rs, extra = A.rigState ? A.rigState(e) : {};
  e.rig.update(dt, Object.assign({ x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, facing: s.face, hurt: s.flash > 0 }, extra));
};
// static targets: prize crates and vault locks (they take hits; they don't count for the clear)
const TARGETS = MT.TARGETS = {
  crate: { kind: 'crate', hp: 3, r: 8, cash: 0, rat: 1, shape: 'mt:crate' },
  lock: { kind: 'lock', hp: 15, r: 7, cash: 500, rat: 2, shape: 'mt:lockbolt' },
  cage: { kind: 'cage', hp: 1e9, r: 14, invulnerable: true, shape: null },
};

// ---- 14-pickups.js ----
// ---- pickups: cash, prizes, keys, capsules, bombs, encores, the statuette; collection, magnet, expiry, drop caps ----
const PICKUPS = MT.PICKUPS = {
  bill: { cash: 100, spr: 'bill', cashy: true }, stack: { cash: 500, spr: 'stack', cashy: true }, gold: { cash: 1000, spr: 'gold', cashy: true }, case: { cash: 5000, spr: 'case', cashy: true },
  prize: { spr: 'boxR' }, key: { spr: 'key', placed: true }, capsule: { spr: 'tv' }, bomb: { spr: 'bulb' }, life: { spr: 'star' }, statue: { spr: 'statue', placed: true },
};
let PID = 1;
/** a pickup on the floor (or flying in an arc to it: vz) */
function makePickup(kind, x, y, o = {}) {
  const p = Object.assign({ id: PID++, kind, x, y, z: o.z || 0, vx: 0, vy: 0, vz: 0, ttl: o.placed || PICKUPS[kind].placed ? Infinity : 9, t: 0, dead: false }, o);
  if (kind === 'capsule' && !p.wpn) p.wpn = rpick(RNG.drops, CAPSULES);
  if (kind === 'prize' && p.box === undefined) p.box = Math.floor(RNG.drops() * 3);
  return p;
}
MT.makePickup = makePickup;
MT.resetPickupIds = () => { PID = 1; };
/** each step: arcs land, belts carry, the magnet pulls cash after a clear, contestants collect, old ones expire */
MT.stepPickups = (world, dt) => {
  const magnet = world.phase === 'CLEAR' || world.phase === 'EXIT';
  for (const p of world.pickups) {
    if (p.dead) continue;
    p.t += dt;
    if (p.z > 0 || p.vz) { p.vz -= 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx = p.vy = 0; clampInterior(p, 8); } continue; }
    const belt = world.arena.beltAt(p.x, p.y);
    if (belt) { p.x += belt * dt; if (p.kind === 'key' && p.belt) { if (p.x < AR.X0 + 2) p.x = AR.X1 - 2; if (p.x > AR.X1 - 2) p.x = AR.X0 + 2; } else clampInterior(p, 4); }
    if (p.rise !== undefined && p.rise < 1) { p.rise = Math.min(1, p.rise + dt * 1.2); }
    if (magnet && PICKUPS[p.kind].cashy) { const c = MT.nearestContestant(world, p, 60); if (c) { const a = angTo(p, c); p.x += Math.cos(a) * 120 * dt; p.y += Math.sin(a) * 120 * dt; } }
    if (p.ttl !== Infinity) { p.ttl -= dt; if (p.ttl <= 0) { p.dead = true; continue; } }
    if (world.cosmetic) continue;
    if (p.locked && p.locked()) continue;
    for (const c of world.contestants) {
      if (!c.targetable || c.ctl === 'remote') continue;
      if (dist2(c, p) < (c.r + 7) ** 2) { world.collect(c, p); break; }
    }
  }
  E.prune(world.pickups, p => p.dead);
};
/** roll an enemy's drop table (dropMul), with floor caps: at most 3 capsules and 25 cash pickups */
MT.rollDrops = (world, e) => {
  const A = ENEMIES[e.kind] || TARGETS[e.kind]; if (!A) return;
  const D = A.drops || {}, mul = MT.T.dropMul * (world.room && world.room.cashRoom && D.bill ? 1 : 1);
  const caps = world.pickups.filter(p => p.kind === 'capsule').length, cash = world.pickups.filter(p => PICKUPS[p.kind].cashy).length;
  for (const k in D) {
    let ch = D[k] * mul; if (k === 'bill' && world.room && world.room.cashRoom) ch *= 2;
    if (RNG.drops() >= ch) continue;
    if (k === 'capsule' && caps >= 3) continue;
    if (PICKUPS[k] && PICKUPS[k].cashy && cash >= 25) continue;
    if (k === 'key') continue;
    world.addPickup(makePickup(k, e.x, e.y));
  }
};
/** draw: bobbing sprites with a glow; capsules show their letter; the last 2.5 s blink */
MT.drawPickups = (r, world, t) => {
  for (const p of world.pickups) {
    if (p.ttl < 2.5 && Math.floor(t * 10) % 2) continue;
    const bob = p.z > 0 ? 0 : 2 + Math.sin(t * 4 + p.id) * 2, z = p.z + bob + (p.rise !== undefined ? (p.rise - 1) * 20 : 0) + (p.pedestal ? 12 : 0);
    if (p.pedestal) { r.shape('mt:pedestal', p.x, p.y, 0, { facing: t * 1.5 }); game.lights.add(p.x, p.y, 20, 36, .7, { color: '#fff6d0' }); }
    if (p.rise !== undefined && p.rise <= 0) continue;
    r.shadow(p.x, p.y, 5, .35);
    if (p.kind === 'capsule') {
      const W = WEAPONS[p.wpn] || WEAPONS.spread;
      r.sprite(p.x, p.y, z, SPR.tv, { glow: .5, scale: unzoom(r) });
      r.queue(p.x, p.y, z + 6, g => { const [sx, sy] = r.w(p.x, p.y, z + 7); E.font.text(g, W.letter, sx + 1, sy - 3, Math.floor(t * 6) % 2 ? W.color : '#ffffff', { align: 'center', outline: false }); }, { emissive: true, bias: 1 });
      game.lights.add(p.x, p.y, 6, 24, .5, { color: W.color });
    } else if (p.kind === 'statue') {
      r.sprite(p.x, p.y, z, SPR.statue, { glow: 1, scale: unzoom(r) }); game.lights.add(p.x, p.y, 10, 60, .9, { color: '#ffe080' });
      if (Math.random() < .2 && game.particles) game.particles.glints(p.x, p.y, 16, 1, '#fff6c0', 12);
    } else {
      const spr = p.kind === 'prize' ? [SPR.boxR, SPR.boxB, SPR.boxG][p.box || 0] : SPR[PICKUPS[p.kind].spr];
      r.sprite(p.x, p.y, z, spr, { glow: p.kind === 'key' ? 1 : .4, scale: unzoom(r) });
      if (p.kind === 'key') { game.lights.add(p.x, p.y, 8, 40, .8, { color: '#ffd84a' }); if (Math.random() < .15 && game.particles) game.particles.glints(p.x, p.y, 10, 1, '#fff6c0', 8); }
      if (p.kind === 'gold' || p.kind === 'case') if (Math.random() < .05 && game.particles) game.particles.glints(p.x, p.y, 8, 1, '#fff6c0', 6);
    }
  }
};

// ---- 15-ratings.js ----
// ---- ratings: the show's heartbeat, shared by the team: a multiplier, Prime Time, and the producers' stunts ----
class Ratings {
  constructor(R = 15) { this.R = R; this.prime = 0; this.primeCD = 0; this.since = 99; this.lowT = 0; this.stuntDone = false; this.primeCount = 0; this.nearT = 0; this.nearN = 0; }
  get X() { if (this.prime > 0) return 5; const R = this.R; return R < 20 ? 1 : R < 40 ? 2 : R < 60 ? 3 : R < 80 ? 4 : 5; }
  /** a gain (× the ratingsGain slider): prime time starts at 100 */
  add(v, world) {
    if (!(v > 0)) return 0;
    const g = v * MT.T.ratingsGain; if (g <= 0) return 0;
    this.R = Math.min(100, this.R + g); this.since = 0;
    if (this.R >= 100 && this.prime <= 0 && this.primeCD <= 0 && world) world.startPrime();
    return g;
  }
  lose(v) { this.R = Math.max(0, this.R - v); }
  /** each step during play: decay after 2.5 s without a gain; prime time runs down; a stall brings on a stunt */
  step(dt, world, waves) {
    this.since += dt; this.primeCD = Math.max(0, this.primeCD - dt);
    if (this.prime > 0) { this.prime -= dt; this.R = 100; if (this.prime <= 0) { this.prime = 0; this.R = 60; this.primeCD = 20; world.event('primeEnd', {}); } return; }
    if (this.since > 2.5) this.R = Math.max(0, this.R - MT.T.ratingsDecay * dt);
    if (waves && this.R < 5) { this.lowT += dt; if (this.lowT >= 10 && !this.stuntDone) { this.stuntDone = true; this.lowT = 0; world.stunt(); } } else this.lowT = 0;
  }
  /** a near miss: +.5, at most 3 a second */
  near(world) { this.nearT += 0; const now = world.time; if (this._nw !== Math.floor(now)) { this._nw = Math.floor(now); this.nearN = 0; } if (this.nearN >= 3) return 0; this.nearN++; return this.add(.5, world); }
}
MT.Ratings = Ratings;

// ---- 16-waves.js ----
// ---- the room-script runner: a small coroutine runner on the world's own clock, wave triggers, spawn entries, key rules ----
// A coroutine yields: a number (seconds), a function (until it returns true), { any: [...] } (the first of them), or
// nothing (one step). The world steps its coroutines, so dev mode's FREEZE and tests control them exactly.
class Co {
  constructor(gen) { this.g = gen; this.wait = null; this.done = false; this.cancelled = false; this._adv(); }
  _mk(w) { if (typeof w === 'number') return { t: w }; if (typeof w === 'function') return { f: w }; if (w && w.any) return { any: w.any.map(x => this._mk(x)) }; if (w instanceof Co) return { co: w }; return { step: true }; }
  _ready(w, dt) {
    if (w.t !== undefined) { w.t -= dt; return w.t <= 0; }
    if (w.f) return !!w.f();
    if (w.co) return w.co.done;
    if (w.any) { let ok = false; for (const x of w.any) if (this._ready(x, dt)) ok = true; return ok; }
    if (w.step) return true;   // a bare yield: the next step
    return true;
  }
  _adv() { try { const r = this.g.next(); if (r.done) { this.done = true; this.wait = null; } else this.wait = this._mk(r.value); } catch (e) { this.done = true; if (game) game.fail('room script', e); else throw e; } }
  step(dt) { if (this.done) return; if (this.wait && !this._ready(this.wait, dt)) return; this._adv(); }
  cancel() { if (this.done) return; this.done = this.cancelled = true; try { this.g.return(); } catch (e) { /* finally threw */ } }
}
MT.Co = Co;
const any = list => ({ any: list.filter(x => x !== undefined && x !== null) });
/** n spawns scaled by players, difficulty and the wave-size slider */
function scaleN(world, n) { const P = Math.max(1, world.playerCount()); return Math.max(1, Math.round(n * (1 + .35 * (P - 1)) * MT.T.waveSize * diffOf().wave)); }
MT.scaleN = scaleN;
/** a boss's adds: scaled by players and difficulty, not by the rooms' wave size */
MT.scaleAdds = (world, n) => { const P = Math.max(1, world.playerCount()); return Math.max(1, Math.round(n * (1 + .35 * (P - 1)) * diffOf().wave)); };
/** run one spawn entry [door, kind, n, gap] */
function spawnEntry(world, ent) {
  const [where, kind, n0, gap = .25, opt] = ent, n = scaleN(world, n0);
  const doors = where === 'all' ? DOOR_IDS : where === 'sides' ? ['E', 'W'] : where === 'ends' ? ['N', 'S'] : DOORS[where] ? [where] : null;
  if (doors && opt && opt.keyOn !== undefined) { for (const d of doors) for (let i = 0; i < n; i++) world.arena.queueSpawn(d, kind, 1, gap, i === Math.min(opt.keyOn, n - 1) && d === doors[0] ? { key: true } : undefined); return; }
  if (doors) { for (const d of doors) world.arena.queueSpawn(d, kind, n, gap); return; }
  if (where === 'audience') { for (let i = 0; i < n; i++) world.delayed(i * .35, () => world.spawnAudience(kind)); return; }
  if (where === 'drop') { for (let i = 0; i < n; i++) world.delayed(i * .3, () => world.spawnDrop(kind)); return; }
  if (Array.isArray(where)) { const [x, y] = cellW(where[0], where[1]); for (let i = 0; i < n; i++) world.spawnEnemy(kind, x + i * 4, y, { inside: true }); }
}
MT.spawnEntry = spawnEntry;
/** an item: [pickup, where]: 'center' | 'drop' | [cx, cy] (weapons become capsules; on a pedestal in armories) */
function placeItem(world, id, where, o = {}) {
  let x = AR.CX, y = AR.CY;
  if (Array.isArray(where)) [x, y] = cellW(where[0], where[1]);
  else if (where === 'drop') { const p = world.freePoint(50); x = p[0]; y = p[1]; }
  const kind = WEAPONS[id] && WEAPONS[id].kind !== 'instant' ? 'capsule' : id === 'bomb' ? 'bomb' : id === 'life' ? 'life' : id;
  const p = MT.makePickup(kind, x, y, Object.assign({ wpn: kind === 'capsule' ? id : undefined, z: where === 'drop' ? 80 : 0, vz: where === 'drop' ? -10 : 0 }, o));
  if (where === 'drop') world.event('dropShadow', { x, y });
  world.addPickup(p);
  return p;
}
MT.placeItem = placeItem;
/** the room's waves as a coroutine */
function* roomScript(world, room) {
  const alive = () => world.countedAlive() + world.arena.pendingSpawns() + world.pendingDelayed();
  for (const [t, id, where] of room.items || []) world.delayed(t, () => placeItem(world, id, where, { placed: Array.isArray(where) && room.type === 'armory', pedestal: room.type === 'armory' && Array.isArray(where) }));
  if (room.survive) { yield* surviveScript(world, room); return; }
  const waves = room.waves || [];
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const since = world.time, early = () => world.time - since >= MT.T.waveGap;
    if (i === 0) yield (w.at || 0);
    else if (w.at !== undefined && w.left !== undefined) yield any([w.at, () => early() && alive() <= w.left]);
    else if (w.at !== undefined) yield w.at;
    else if (w.left !== undefined) yield () => early() && alive() <= w.left;
    world.wave = i + 1; world.event('wave', { n: i + 1 });
    for (const ent of w.spawn || []) spawnEntry(world, ent);
    for (const [id, where] of w.items || []) placeItem(world, id, where);
    if (w.script && MT.SCRIPTS[w.script]) yield* MT.SCRIPTS[w.script](world, w);
  }
  world.wavesSpawned = true;
}
MT.roomScript = roomScript;
/** survive rooms: streams from the doors until the clock runs out, then a last wave */
function* surviveScript(world, room) {
  const S = room.survive, t0 = world.phaseT;
  world.surviveLeft = S.time;
  let a = 0, b = 0, c = 0;
  world.wave = 1;
  while (world.surviveLeft > 0) {
    yield;
    const dt = world.lastDt; world.surviveLeft -= dt; a -= dt; b -= dt; c -= dt;
    if (a <= 0) { a += 1.2; const k = (world._sk = (world._sk || 0) + 1); for (const d of [DOOR_IDS[k % 4], DOOR_IDS[(k + 2) % 4]]) world.arena.queueSpawn(d, 'goon', MT.scaleAdds(world, 1), .2); }
    if (b <= 0) { b += 4; world.arena.queueSpawn(rpick(RNG.spawn, DOOR_IDS), 'clapbot', MT.scaleAdds(world, 2), .2); }
    if (c <= 0) { c += 7; world.arena.queueSpawn(rpick(RNG.spawn, DOOR_IDS), 'popper', 1, .2); }
    if (world.cage && !world.cage.opened && S.time - world.surviveLeft >= S.cage) world.openCage();
  }
  world.surviveLeft = 0; world.wave = 2;
  if (world.cage && !world.cage.opened) world.openCage();
  for (const ent of S.last || []) spawnEntry(world, ent);
  world.wavesSpawned = true;
}
/** named scripted events a wave can run */
MT.SCRIPTS = {
  *finaleBurst(world, w) {   // every pyro vent fires twice, each with its 1 s telegraph
    const h = world.arena.pyro(); if (!h) return;
    h.burst = true; world.event('banner', { text: 'FINALE BURST!', color: '#ff9a3c' });
    for (const v of h.vents) { v.state = 'tele'; v.t = 0; v.again = true; }
    yield 5;
    h.burst = null;
  },
};

// ---- 17-bosses.js ----
// ---- bosses: one framework (parts, armor, weak points, phases as coroutines, netplay state) and the three bosses ----
// A boss draws from this.rs only, so a client draws the host's boss from toNet()/fromNet().
const BOSSES = MT.BOSSES = {};
const bossScale = world => MT.T.bossHp * (1 + .5 * (world.playerCount() - 1));
class Boss {
  constructor(world, kind, name) {
    this.world = world; this.kind = kind; this.name = name; this.x = AR.CX; this.y = 60; this.z = 0; this.parts = []; this.phase = 'intro'; this.t = 0; this.phaseT = 0;
    this.script = null; this.dead = false; this.introDone = false; this.gone = false; this.rs = { x: this.x, y: this.y, z: 0, phase: 'intro', t: 0 }; this.flash = {};
  }
  part(id, o) { const k = bossScale(this.world); const p = Object.assign({ id, ox: 0, oy: 0, r: 8, hp: 10, armor: 1, weak: 1, alive: true, flash: 0 }, o); p.hp *= k; p.max = p.hp; this.parts.push(p); return p; }
  get(id) { return this.parts.find(p => p.id === id); }
  partPos(p) { return { x: this.rs.x + p.ox, y: this.rs.y + p.oy, r: p.r }; }
  partHittable(p) { return p.alive && !this.gone && !this.dead && this.phase !== 'intro' && (!p.when || p.when(this)); }
  hitList() { const out = []; for (const p of this.parts) if (this.partHittable(p)) { const q = this.partPos(p); out.push({ x: q.x, y: q.y, z: 10, r: p.r, part: p }); } return out; }
  armorOf(p) { return typeof p.armor === 'function' ? p.armor(this) : p.armor; }
  damage(world, p, dmg, src = {}) {
    if (!this.partHittable(p) || world.cosmetic) return;
    const target = p.route ? this.get(p.route) : p;
    if (!target || !target.alive) return;
    const ar = this.armorOf(target) * (p.weak || 1);
    if (MT.cheats.oneHit && !world.session) dmg = 1e6;
    if (ar < .2 && !src.beam) { const q = this.partPos(p); if (game.particles && !world.quietFx && RNG.fx() < .5) game.particles.sparks(q.x, q.y, 14, 2, null, { color: '#c8d0e0' }); if (!world.quietFx && RNG.fx() < .3) MT.sfx('tink'); }
    target.hp -= dmg * ar; target.flash = .08; p.flash = .08;
    if (target.hp <= 0) {
      target.hp = 0; target.alive = false;
      const q = this.partPos(target);
      if (game.particles && !world.quietFx) game.particles.explosion(q.x, q.y, 14, 1.2, { shake: 0, freeze: false });
      if (!world.session) game.freeze(.03); world.shake(4); MT.sfx('boom');
      world.ratings.add(10, world);
      const owner = src.owner !== undefined ? world.contestantById(src.owner) : null; if (owner) world.credit(owner, 5000, { at: q });
      world.event('partDown', { boss: this.kind, part: target.id });
      if (target.onDestroy) target.onDestroy(this, world);
    }
  }
  setPhase(name, gen) { if (this.dying && name !== 'death') { if (gen && gen.return) gen.return(); return; } if (this.script) this.script.cancel(); this.phase = name; this.phaseT = 0; this.script = gen ? new Co(gen) : null; this.world.event('bossPhase', { boss: this.kind, phase: name }); }
  hpPct() { let a = 0, b = 0; for (const p of this.parts) if (!p.noBar) { a += Math.max(0, p.hp); b += p.max; } return b ? a / b : 0; }
  step(world, dt) { this.t += dt; this.phaseT += dt; for (const p of this.parts) p.flash = Math.max(0, p.flash - dt); if (this.script) this.script.step(dt); this.update(world, dt); this.sync(); }
  update() {}
  animate() {}
  sync() { const s = this.rs; s.x = this.x; s.y = this.y; s.z = this.z; s.phase = this.phase; s.t = this.t; s.parts = this.parts.map(p => p.alive ? Math.max(1, Math.round(p.hp / p.max * 100)) : 0); s.pf = this.parts.map(p => p.flash > 0 ? 1 : 0); s.gone = this.gone; s.dead = this.dead; }
  /** netplay: a small array of its render state (numbers), and back */
  toNet() { if (!this.rs.parts) this.sync(); const s = this.rs, out = [this.kind, Math.round(s.x), Math.round(s.y), Math.round(s.z), s.phase, Math.round(s.t * 10), s.parts, (s.pf || []).reduce((a, f, i) => a | (f << i), 0), s.gone ? 1 : 0, s.dead ? 1 : 0]; for (const k of this.netKeys || []) out.push(typeof s[k] === 'number' ? Math.round(s[k] * 100) / 100 : s[k]); return out; }
  fromNet(a) { const s = this.rs; [, s.x, s.y, s.z, s.phase, s.t] = a; s.t /= 10; s.parts = a[6]; s.pf = s.parts.map((_, i) => (a[7] >> i) & 1); s.gone = !!a[8]; s.dead = !!a[9]; (this.netKeys || []).forEach((k, i) => { s[k] = a[10 + i]; }); this.parts.forEach((p, i) => { p.alive = (s.parts[i] || 0) > 0; p.hp = (s.parts[i] || 0) / 100 * p.max; }); this.x = s.x; this.y = s.y; this.dead = s.dead; this.gone = s.gone; }
  /** contact: the body hurts a contestant it touches */
  contact(world, x, y, r, dmg) { for (const c of world.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && dist2(c, { x, y }) < (r + c.r) ** 2) world.hurtContestant(c, dmg, { kind: this.kind, x, y }); }
  /** a solid body: contestants are pushed out of its circle */
  solid(world, x, y, r) { for (const c of world.contestants) { const dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || .01; if (d < r + c.r) { c.x = x + dx / d * (r + c.r); c.y = y + dy / d * (r + c.r); clampInterior(c.body, 5); } } }
  drawShadow(r, x, y, rad) { r.decal(() => r.groundDisc(x, y, rad, '#000000', .45)); }
  /** the death: chain explosions, then a shower of cash, prizes and a capsule */
  *deathShower(world, colors) {
    for (let i = 0; i < 10; i++) { const x = this.x + (RNG.fx() - .5) * 60, y = this.y + (RNG.fx() - .5) * 40; if (game.particles && !world.quietFx) { game.particles.explosion(x, y, 10, .9, { shake: 0, freeze: false }); game.particles.bits(x, y, 10, 14, colors); } if (!world.quietFx) MT.sfx('boom'); world.shake(3); yield .2; }
    if (!world.quietFx) game.flash('#ffffff', .2);
    for (let i = 0; i < 30; i++) { const a = RNG.drops() * TAU, sp = 40 + RNG.drops() * 90; world.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'stack', 'gold', 'stack', 'case']), this.x, this.y, { z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 30, vz: 100 + RNG.drops() * 60 })); }
    for (let i = 0; i < 2; i++) world.addPickup(MT.makePickup('prize', this.x + (i ? 20 : -20), this.y + 30, { z: 20, vz: 120 }));
    world.addPickup(MT.makePickup('capsule', this.x, this.y + 40, { z: 20, vz: 120 }));
  }
}
MT.Boss = Boss;
const nearestC = (world, o) => MT.nearestContestant(world, o) || { x: AR.CX, y: AR.CY + 60, body: { vx: 0, vy: 0 } };
// =========================================================================================== MASHY
class Mashy extends Boss {
  constructor(world) {
    super(world, 'mashy', 'MASHY'); this.y = -30; this.armAng = [Math.PI / 2, Math.PI / 2]; this.hatch = 0; this.dir = 1; this.charge = null; this.eyes = 0; this.tread = 0;
    const armsAlive = () => this.get('armL').alive || this.get('armR').alive;
    this.part('body', { r: 26, hp: 130, armor: () => armsAlive() ? .15 : .5 });
    this.part('armL', { ox: -30, oy: 6, r: 10, hp: 36, onDestroy: (b, w) => { w.event('line', { id: 'mashyArm' }); b.onArmDown(); } });
    this.part('armR', { ox: 30, oy: 6, r: 10, hp: 36, onDestroy: (b, w) => b.onArmDown() });
    this.part('hatch', { oy: 14, r: 9, hp: 1, weak: 2, route: 'body', noBar: true, when: b => b.hatch > .6 });
    this.netKeys = ['hatch', 'armL', 'armR', 'eyes', 'tread', 'tele', 'chg'];
  }
  static enter(world) { const b = world.boss = new Mashy(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'mashy' }); }
  *intro() {
    const w = this.world; w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2.5; MT.sfx('crash');
    for (let t = 0; t < 2; t += this.world.lastDt) { this.y = lerp(-30, 70, easeOut(t / 2)); this.tread += this.world.lastDt * 40; yield; }
    this.y = 70; w.event('line', { id: 'mashyIntro' }); yield 2.2;
    this.introDone = true; this.setPhase('p1', this.p1());
  }
  skipIntro() { this.y = 70; this.x = AR.CX; this.introDone = true; this.setPhase('p1', this.p1()); }
  onArmDown() { this.rate = 1.3; if (this.phase === 'p1' && !this.get('armL').alive && !this.get('armR').alive) this.setPhase('p2', this.p2()); }
  *p1() {
    let butter = 1.5, gravy = 2.5, stream = 0;
    while (true) {
      const dt = this.world.lastDt, w = this.world, c = nearestC(w, this), k = this.rate || 1;
      this.x += this.dir * 30 * dt; if (this.x > 260) this.dir = -1; if (this.x < 108) this.dir = 1; this.tread += 30 * dt;
      const L = this.get('armL'), R = this.get('armR');
      if (L.alive) { this.armAng[0] = approachAng(this.armAng[0], Math.atan2(c.y - (this.y + 6), c.x - (this.x - 30)), 3 * dt); butter -= dt * k; if (butter <= 0) { butter = 1.8; for (let i = 0; i < 5; i++) w.fireFoe('butter', this.x - 30, this.y + 12, this.armAng[0] + (i - 2) * .225, bulletSpd(95)); MT.sfx('thunk'); } }
      if (R.alive) { gravy -= dt * k; if (gravy <= 0 && stream <= 0) { stream = 1.2; gravy = 3.2; this.sweep0 = Math.atan2(c.y - this.y, c.x - (this.x + 30)) - .87; } if (stream > 0) { stream -= dt; const a = this.sweep0 + (1 - stream / 1.2) * 1.745; this.armAng[1] = a; this._g = (this._g || 0) - dt; if (this._g <= 0) { this._g = .14 / k; w.fireFoe('gravy', this.x + 30, this.y + 12, a, bulletSpd(120)); } } else this.armAng[1] = approachAng(this.armAng[1], Math.atan2(c.y - this.y, c.x - (this.x + 30)), 2 * dt); }
      if (this.get('body').hp < this.get('body').max * .35) { this.setPhase('p3', this.p3()); return; }
      yield;
    }
  }
  *p2() {
    this.world.event('line', { id: 'mashyP2' });
    let ring = 1, tots = 2.5, goons = 3, hatchT = 0, off = 0;
    while (true) {
      const dt = this.world.lastDt, w = this.world;
      this.x += this.dir * 24 * dt; if (this.x > 260) this.dir = -1; if (this.x < 108) this.dir = 1; this.tread += 24 * dt;
      hatchT = (hatchT + dt) % 4.5; this.hatch = approach(this.hatch, hatchT > 2.3 ? 1 : 0, dt * 4);
      ring -= dt; if (ring <= 0) { ring = 3; off = off ? 0 : Math.PI / 14; for (let i = 0; i < 14; i++) w.fireFoe('orb', this.x, this.y + 4, off + i / 14 * TAU, bulletSpd(80)); }
      tots -= dt; if (tots <= 0) { tots = 5; for (let i = 0; i < 3; i++) { const c = nearestC(w, this); w.lob('tot', this.x, this.y + 14, 30, clamp(c.x + (i - 1) * 40, AR.X0 + 10, AR.X1 - 10), clamp(c.y + 10, AR.Y0 + 10, AR.Y1 - 10), 1.1, { id: 1 }); } MT.sfx('thunk'); }
      goons -= dt; if (goons <= 0) { goons = 9; w.arena.queueSpawn('S', 'goon', MT.scaleAdds(w, 6), .3); }
      if (this.get('body').hp < this.get('body').max * .35) { this.setPhase('p3', this.p3()); return; }
      yield;
    }
  }
  *p3() {
    const w = this.world; w.event('line', { id: 'mashyP3' }); MT.music.layer('phase2', true);
    let adds = 2;
    while (true) {
      for (let k = 0; k < 3; k++) {
        this.tele = 1; this.hatch = 0; const c = nearestC(w, this); this.chg = Math.atan2(c.y - this.y, c.x - this.x); MT.sfx('roar');
        for (let t = 0; t < .9; t += w.lastDt) { this.eyes = 1; if (RNG.fx() < .4 && game.particles && !w.quietFx) game.particles.smoke(this.x + (RNG.fx() - .5) * 30, this.y + 20, 6, 1, { size: 3, color: '#5a5468' }); adds -= w.lastDt; yield; }
        this.tele = 0; let vx = Math.cos(this.chg) * 170, vy = Math.sin(this.chg) * 170, bounced = 0;
        for (let t = 0; t < 2.2 && bounced < 1; t += w.lastDt) { this.x += vx * w.lastDt; this.y += vy * w.lastDt; this.tread += 170 * w.lastDt; adds -= w.lastDt; if (this.x < AR.X0 + 30 || this.x > AR.X1 - 30) { vx = -vx; bounced++; this.x = clamp(this.x, AR.X0 + 30, AR.X1 - 30); } if (this.y < AR.Y0 + 26 || this.y > AR.Y1 - 26) { vy = -vy; bounced++; this.y = clamp(this.y, AR.Y0 + 26, AR.Y1 - 26); } if (bounced) { MT.sfx('crash'); w.shake(5); } this.contact(w, this.x, this.y, 28, 2); yield; }
        this.eyes = 0;
      }
      this.hatch = 1; for (let t = 0; t < 2.5; t += w.lastDt) { adds -= w.lastDt; yield; }
      this.hatch = 0;
      if (adds <= 0) { adds = 10; w.arena.queueSpawn('E', 'clapbot', MT.scaleAdds(w, 3), .25); w.arena.queueSpawn('W', 'clapbot', MT.scaleAdds(w, 3), .25); }
    }
  }
  update(world, dt) {
    if (this.dead || this.phase === 'intro') return;
    this.solid(world, this.x, this.y, 24);
    if (this.get('body').alive === false && !this.dying) { this.dying = true; this.setPhase('death', this.death()); }
  }
  *death() { this.world.event('line', { id: 'mashyDown' }); yield* this.deathShower(this.world, ['#f0d8a0', '#d8b880', '#fff0c0', '#ffffff']); this.dead = true; this.world.event('bossDead', { boss: 'mashy' }); }
  sync() { super.sync(); const s = this.rs; s.hatch = this.hatch; s.armL = this.armAng[0]; s.armR = this.armAng[1]; s.eyes = this.eyes; s.tread = this.tread; s.tele = this.tele || 0; s.chg = this.chg || 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead) return;
    const x = s.x, y = s.y, P = s.parts || [], body = P[0] > 0, armL = P[1] > 0, armR = P[2] > 0, fl = s.pf || [];
    this.drawShadow(r, x, y + 6, 30);
    if (s.tele) r.decal(g => { const a = r.w(x, y, 0), b = r.w(x + Math.cos(s.chg) * 300, y + Math.sin(s.chg) * 300, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ff9a3c', 3); });
    r.actor(x, y + 10, 0, (g, ox, oy) => {
      const W = (dx, dy, z) => { const p = r.w(x + dx, y + dy, z); return [p[0] - r.w(x, y + 10, 0)[0] + ox, p[1] - r.w(x, y + 10, 0)[1] + oy]; };
      for (const sd of [-1, 1]) { const a = W(sd * 22 - 6, 14, 0), b = W(sd * 22 + 6, -10, 8); px.rect(g, Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), '#1a1420'); for (let k = 0; k < 5; k++) { const yy = Math.min(a[1], b[1]) + ((k * 4 + (s.tread || 0)) % 20); px.rect(g, Math.min(a[0], b[0]), yy, Math.abs(b[0] - a[0]), 1, '#4a4458'); } }
      const c = W(0, 0, 26), wob = Math.sin(t * 3) * 1;
      px.ell(g, c[0], c[1] + 4, 33, 26, '#140a24'); px.ell(g, c[0], c[1] + 4, 32, 25, '#c8a060'); px.ell(g, c[0] - 6, c[1] - 4, 22, 15, '#e0c080'); px.ell(g, c[0] - 10, c[1] - 9, 8, 5, '#f4dca0');
      for (const [dx, dy] of [[14, -6], [-18, 6], [6, 10], [20, 8], [-6, -14]]) px.disc(g, c[0] + dx, c[1] + dy, 2, '#a07840');
      px.poly(g, [[c[0] - 26, c[1] + 12], [c[0] + 26, c[1] + 12], [c[0] + 18, c[1] + 28], [c[0] - 18, c[1] + 28]], '#1a1420');
      px.poly(g, [[c[0] - 6, c[1] + 12], [c[0] + 6, c[1] + 12], [c[0], c[1] + 24]], '#fff7e8');
      px.poly(g, [[c[0] - 7, c[1] + 10], [c[0], c[1] + 13], [c[0] - 7, c[1] + 16]], '#d02a3a'); px.poly(g, [[c[0] + 7, c[1] + 10], [c[0], c[1] + 13], [c[0] + 7, c[1] + 16]], '#d02a3a'); px.disc(g, c[0], c[1] + 13, 1.5, '#ff5a5a');
      const hz = s.hatch || 0, my = c[1] + 2;
      px.ell(g, c[0], my, 12, 2 + hz * 6, '#3a0a10'); if (hz > .3) { px.ell(g, c[0], my + 1, 9, hz * 4, '#ff3344'); for (let k = -8; k <= 8; k += 4) px.rect(g, c[0] + k - 1, my - 2 - hz * 3, 2, 2, '#fff7e8'); }
      for (const sd of [-1, 1]) { const ex = c[0] + sd * 10, ey = c[1] - 12, j = Math.sin(t * 9 + sd) * 1.5; px.disc(g, ex, ey, 6, '#140a24'); px.disc(g, ex, ey, 5.2, '#ffffff'); px.disc(g, ex + j, ey + 1 + Math.cos(t * 7) * 1.2, 2.5, s.eyes ? '#ff3344' : '#140a24'); }
      for (const [sd, alive, ang, col] of [[-1, armL, s.armL, '#ffe070'], [1, armR, s.armR, '#a0602a']]) {
        if (!alive) continue; const a = W(sd * 30, 6, 18), dx = Math.cos(ang || 0), dy = Math.sin(ang || 0) * .8;
        px.disc(g, a[0], a[1], 7, '#140a24'); px.disc(g, a[0], a[1], 6, '#5a5468'); px.line(g, a[0], a[1], a[0] + dx * 12, a[1] + dy * 12, '#140a24', 7); px.line(g, a[0], a[1], a[0] + dx * 12, a[1] + dy * 12, col, 5); px.disc(g, a[0] + dx * 12, a[1] + dy * 12, 2.5, '#140a24');
      }
    }, { flash: fl[0] || fl[1] || fl[2] || fl[3] ? '#ffffff' : false, outline: false });
    if (s.eyes) game.lights.add(x, y, 30, 50, .5, { color: '#ff3344' });
  }
}
BOSSES.mashy = Mashy;
// =========================================================================================== THE WHEEL OF MISFORTUNE
const SEGMENTS = ['TOMATO TIME', 'LASER LIGHTS', 'MIME TIME', 'BANKRUPT', 'DISCO FEVER', 'GOON SQUAD', 'JACKPOT', 'SPIN AGAIN'];
const SEG_COL = ['#d02a3a', '#2ee6ff', '#f0f0f4', '#141018', '#ff2e88', '#3a4a6a', '#ffcc33', '#5fe0a0'];
MT.SEGMENTS = SEGMENTS;
class Wheel extends Boss {
  constructor(world) {
    super(world, 'wheel', 'THE WHEEL OF MISFORTUNE'); this.x = AR.CX; this.y = 60; this.ang = 0; this.spin = 0; this.seg = -1; this.beams = []; this.loose = false; this.vx = 0; this.vy = 0; this.flat = 0; this.speedMul = 1; this.forced = [];
    this.part('core', { r: 14, hp: 220, armor: b => b.loose || b.jackpotT > 0 ? 1 : .15 });
    SEGMENTS.forEach((n, i) => this.part('seg' + i, { r: 9, hp: 18, seg: i, onDestroy: (b, w) => { w.event('segDown', { seg: i, name: n }); if (b.parts.filter(p => p.seg !== undefined && !p.alive).length >= 4 && !b.loose) b.breakLoose(); } }));
    this.netKeys = ['ang', 'seg', 'flat', 'beamA', 'beamT', 'jack'];
    this.jackpotT = 0;
  }
  static enter(world) { const b = world.boss = new Wheel(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'wheel' }); }
  partPos(p) { if (p.seg === undefined) return { x: this.rs.x, y: this.rs.y, r: p.r }; const a = (this.rs.ang || 0) + (p.seg + .5) * TAU / 8; return { x: this.rs.x + Math.cos(a) * 34, y: this.rs.y + Math.sin(a) * 34 * .9, r: p.r }; }
  liveSegs() { return this.parts.filter(p => p.seg !== undefined && p.alive).map(p => p.seg); }
  skipIntro() { this.introDone = true; this.setPhase('p1', this.cycle()); }
  *intro() { const w = this.world; this.flat = 0; for (let t = 0; t < 1.5; t += w.lastDt) { this.ang += w.lastDt * 4; yield; } w.event('line', { id: 'wheelIntro' }); yield 2.2; this.introDone = true; this.setPhase('p1', this.cycle()); }
  /** spin, slow to a stop on a living segment (pointer clicks, a drum roll), then that segment's attack */
  *cycle() {
    const w = this.world;
    while (true) {
      const live = this.liveSegs(); if (!live.length) { yield; continue; }
      const seg = this.forced.length ? this.forced.shift() : rpick(RNG.ai, live);
      const T = 2.5 / this.speedMul, a0 = this.ang, k = Math.ceil(2 + RNG.ai() * 2);
      const pointer = -Math.PI / 2, a1 = pointer - (seg + .5) * TAU / 8 + Math.ceil((a0 - (pointer - (seg + .5) * TAU / 8)) / TAU + k) * TAU;
      MT.sfx('drumroll'); this.seg = -1; let lastTick = Math.floor(a0 / (TAU / 8));
      for (let t = 0; t < T; t += w.lastDt) { const u = t / T, e = 1 - Math.pow(1 - u, 3); this.ang = a0 + (a1 - a0) * e; const tk = Math.floor(this.ang / (TAU / 8)); if (tk !== lastTick) { lastTick = tk; if (!w.quietFx) MT.sfx('wheelclick'); } if (this.loose) this.roll(w.lastDt); yield; }
      this.ang = a1; this.seg = seg; w.event('wheelStop', { seg, name: SEGMENTS[seg] });
      yield* this.attack(seg);
      this.seg = -1;
      if (seg !== 7) this.speedMul = 1;
    }
  }
  *attack(seg) {
    const w = this.world, bmul = this.speedMul > 1 ? 1.2 : 1, sp = v => bulletSpd(v) * bmul;
    const hold = (s, fn) => (function* (self) { for (let t = 0; t < s; t += w.lastDt) { if (fn) fn(t); if (self.loose) self.roll(w.lastDt); yield; } })(this);
    if (seg === 0) { for (let i = 0; i < 8; i++) { const c = nearestC(w, this), side = i % 2 ? -30 : 398; w.lob('tomato', side, 40 + RNG.ai() * 160, 20, clamp(c.x + (RNG.ai() - .5) * 60, AR.X0 + 8, AR.X1 - 8), clamp(c.y + (RNG.ai() - .5) * 40, AR.Y0 + 8, AR.Y1 - 8), 1.1, { id: 2 }); yield* hold(.3); } yield* hold(2); }
    else if (seg === 1) {
      const c = nearestC(w, this), base = Math.atan2(c.y - this.y, c.x - this.x);
      this.beamA = base - .6; this.beamT = .8; yield* hold(.8, t => { this.beamT = .8 - t; });
      this.beamT = 0; MT.sfx('laser');
      yield* hold(4, t => { this.beamA = base - .6 + (t / 4) * 1.2; this.beamOn = true; this.beamHit(w); });
      this.beamOn = false; this.beamA = null;
    }
    else if (seg === 2) { for (let i = 0; i < 6; i++) { const c = nearestC(w, this); let x, y, k = 0; do { x = AR.X0 + 20 + RNG.ai() * 300; y = AR.Y0 + 60 + RNG.ai() * 140; k++; } while (Math.hypot(x - c.x, y - c.y) < 40 && k < 30); const e = w.spawnEnemy('mime', x, y, { inside: true }); if (game.particles && !w.quietFx) game.particles.smoke(x, y, 6, 4, { size: 3, color: '#f0f0f4' }); } yield* hold(4); }
    else if (seg === 3) { w.ratings.lose(10); w.event('bankrupt', {}); for (const off of [0, Math.PI / 20]) { for (let i = 0; i < 20; i++) w.fireFoe('coin', this.x, this.y, off + i / 20 * TAU, sp(85)); yield* hold(.5); } yield* hold(3); }
    else if (seg === 4) { for (let i = 0; i < 2; i++) w.spawnEnemy('disco', this.x + (i ? 20 : -20), this.y + 40, { inside: true, ang: Math.PI / 2 + (i ? .7 : -.7) }); yield* hold(5); }
    else if (seg === 5) { for (const d of ['E', 'W', 'S']) w.arena.queueSpawn(d, 'goon', MT.scaleAdds(w, 4), .25); yield* hold(5); }
    else if (seg === 6) { w.event('jackpot', {}); this.jackpotT = 3; for (let i = 0; i < 20; i++) { const [x, y] = w.freePoint(0); w.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'stack', 'gold']), x, y, { z: 80, vz: -10 })); } { const [x, y] = w.freePoint(30); w.addPickup(MT.makePickup('capsule', x, y, { z: 80, vz: -10 })); } yield* hold(3, t => { this.jackpotT = 3 - t; }); this.jackpotT = 0; }
    else if (seg === 7) { this.speedMul = 1.5; w.event('spinAgain', {}); }
  }
  beamHit(w) {
    for (let k = 0; k < 4; k++) {
      const a = (this.beamA || 0) + k * Math.PI / 2;
      for (const c of w.contestants) { if (c.ctl === 'remote' || c.ctl === 'mirror') continue; const dx = c.x - this.x, dy = c.y - this.y, along = dx * Math.cos(a) + dy * Math.sin(a), off = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (along > 0 && off < c.r + 3) w.hurtContestant(c, 1, { kind: 'beam', x: this.x, y: this.y }); }
    }
  }
  breakLoose() { this.loose = true; const w = this.world; w.event('line', { id: 'wheelLoose' }); MT.music.layer('phase2', true); const a = Math.PI / 4 + RNG.ai() * .5; this.vx = Math.cos(a) * 85; this.vy = Math.sin(a) * 85; this.phase = 'p2'; }
  roll(dt) {
    const w = this.world; this.x += this.vx * dt; this.y += this.vy * dt; let b = false;
    if (this.x < AR.X0 + 40 || this.x > AR.X1 - 40) { this.vx = -this.vx; this.x = clamp(this.x, AR.X0 + 40, AR.X1 - 40); b = true; }
    if (this.y < AR.Y0 + 40 || this.y > AR.Y1 - 40) { this.vy = -this.vy; this.y = clamp(this.y, AR.Y0 + 40, AR.Y1 - 40); b = true; }
    if (b) { MT.sfx('crash'); w.shake(3); for (let i = 0; i < 8; i++) w.fireFoe('spark', this.x, this.y, i / 8 * TAU + this.ang, bulletSpd(90)); }
    this.ang += dt * 2;
  }
  update(world, dt) {
    if (this.dead || this.phase === 'intro') return;
    if (this.loose) this.contact(world, this.x, this.y, 40, 2); else this.solid(world, this.x, this.y, 44);
    if (!this.get('core').alive && !this.dying) { this.dying = true; this.setPhase('death', this.death()); }
  }
  *death() { const w = this.world; w.event('line', { id: 'wheelDown' }); for (let t = 0; t < 1.2; t += w.lastDt) { this.flat = t / 1.2; this.ang += w.lastDt * (8 - t * 6); yield; } yield* this.deathShower(w, ['#ffcc33', '#fff6b0', '#ff2e88', '#2ee6ff']); this.dead = true; w.event('bossDead', { boss: 'wheel' }); }
  sync() { super.sync(); const s = this.rs; s.ang = this.ang; s.seg = this.seg; s.flat = this.flat; s.beamA = this.beamA === undefined || this.beamA === null ? -99 : this.beamA; s.beamT = this.beamOn ? -1 : (this.beamT || 0); s.jack = this.jackpotT > 0 ? 1 : 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead) return;
    const x = s.x, y = s.y, R = 44, P = s.parts || [], z = 8 + (s.phase === 'p2' ? 4 + Math.sin(t * 6) * 2 : 0);
    if (s.phase !== 'p2' && s.phase !== 'death') r.queue(x, y - 40, 0, g => r.box(g, x - 10, y - 50, 0, x + 10, y - 36, 24, '#c8a040', '#8a6a20'), { occluder: true });
    this.drawShadow(r, x, y + 4, R);
    r.queue(x, y, z, g => {
      const W = (a, rad, zz = z) => r.w(x + Math.cos(a) * rad, y + Math.sin(a) * rad * .9, zz);
      const rim = []; for (let i = 0; i < 40; i++) rim.push(W(i / 40 * TAU, R + 3));
      const rimLow = []; for (let i = 0; i < 40; i++) rimLow.push(W(i / 40 * TAU, R + 3, z - 4));
      px.poly(g, rimLow, '#5a3a10'); px.poly(g, rim, '#c8a040');
      for (let i = 0; i < 8; i++) {
        const a0 = (s.ang || 0) + i * TAU / 8, a1 = a0 + TAU / 8, alive = (P[1 + i] || 0) > 0, pts = [W(0, 0)];
        for (let k = 0; k <= 6; k++) pts.push(W(a0 + (a1 - a0) * k / 6, R));
        const lit = s.seg === i && Math.floor(t * 8) % 2 === 0;
        px.poly(g, pts, alive ? (lit ? '#ffffff' : SEG_COL[i]) : '#0a0610');
        const mid = W(a0 + TAU / 16, R * .62);
        if (alive) E.font.text(g, SEGMENTS[i].split(' ')[0], mid[0], mid[1] - 3, i === 3 || i === 5 ? '#ffcc33' : '#140a24', { align: 'center', outline: false, font: 'tiny' });
        else E.font.text(g, 'VOID', mid[0], mid[1] - 3, '#5a4a6a', { align: 'center', outline: false, font: 'tiny' });
        const b = W(a0 + TAU / 16, 34);
        if (alive) for (let k = 0; k < 5; k++) { const bb = W(a0 + TAU / 16 + (k - 2) * .07, 34 + (k % 2) * 4); px.disc(g, bb[0], bb[1], 2, (Math.floor(t * 10) + k + i) % 3 ? '#fff6b0' : '#ffcc33'); }
        const edge = W(a0, R); const c0 = W(0, 0); px.line(g, c0[0], c0[1], edge[0], edge[1], '#8a6a20');
      }
      const c = W(0, 0); px.disc(g, c[0], c[1], 13, '#140a24'); px.disc(g, c[0], c[1], 12, s.jack ? '#ffffff' : '#ffcc33'); px.disc(g, c[0], c[1], 8, '#ff2e88'); E.font.text(g, '$', c[0] + 1, c[1] - 3, '#ffffff', { align: 'center', outline: false });
      if (s.phase !== 'p2') { const p = W(-Math.PI / 2, R + 6, z + 2); px.poly(g, [[p[0] - 5, p[1] - 6], [p[0] + 5, p[1] - 6], [p[0], p[1] + 4]], '#d02a3a'); px.dot(g, p[0], p[1] - 4, '#ffffff'); }
      if ((s.pf || []).some(f => f)) px.blend(g, .5, 'add', () => px.poly(g, rim, '#ffffff'));
    }, { emissive: false });
    game.lights.add(x, y, 20, 80, .6, { color: '#ffcc33' });
    if (s.beamA > -90) {
      const tele = s.beamT > 0;
      r.queue(x, y, 14, g => { for (let k = 0; k < 4; k++) { const a = s.beamA + k * Math.PI / 2, A = r.w(x, y, 14), B = r.w(x + Math.cos(a) * 400, y + Math.sin(a) * 400, 14); if (tele) px.line(g, A[0], A[1], B[0], B[1], Math.floor(t * 16) % 2 ? '#ff3344' : '#ff9a3c'); else { px.line(g, A[0], A[1], B[0], B[1], '#a0f6ff', 5); px.line(g, A[0], A[1], B[0], B[1], '#ffffff', 2); } } }, { emissive: true, bias: 4 });
    }
  }
}
BOSSES.wheel = Wheel;
// =========================================================================================== LANCE LUSTRE LIVE! -> THE NETWORK
const CHANNELS = ['STATIC', 'NEWS', 'CARTOON', 'SHOPPING', 'LANCE'];
class Finale extends Boss {
  constructor(world) {
    super(world, 'finale', 'LANCE IN THE STARMAKER 9000'); this.x = AR.CX; this.y = -40; this.z = 20; this.lance = makeLance(1.4); this.mic = null; this.cones = [null, null]; this.robot = 0; this.wallUp = 0; this.breaks = 0; this.eyeOpen = 0;
    this.part('podium', { r: 22, hp: 260 });
    this.part('turretL', { ox: -26, oy: 4, r: 8, hp: 30 });
    this.part('turretR', { ox: 26, oy: 4, r: 8, hp: 30 });
    const cols = [72, 128, 240, 296], rows = [36, 62, 88];
    this.tvs = []; for (const ty of rows) for (const tx of cols) { const p = this.part('tv' + this.tvs.length, { r: 10, hp: 22, tv: true, tx, ty, when: b => b.stage === 'network', noBar: true, onDestroy: (b, w) => { if (b.tvsDown() >= 8 && !b.eyeOpen) { b.eyeOpen = 1; w.event('line', { id: 'eyeOpen' }); } } }); p.ch = -1; p.chT = 1 + this.tvs.length * .4; this.tvs.push(p); }
    this.part('eye', { r: 18, hp: 300, armor: b => b.tvsDown() >= 8 ? 1 : .15, when: b => b.stage === 'network', noBar: true });
    this.stage = 'lance'; this.netKeys = ['stage', 'robot', 'wallUp', 'eyeOpen', 'micX', 'micY', 'micR', 'micT', 'cone0', 'cone1', 'tvch', 'newsX', 'shock', 'shockX', 'shockY', 'lz'];
  }
  static enter(world) { const b = world.boss = new Finale(world); b.setPhase('intro', b.intro()); world.event('bossIntro', { boss: 'finale' }); }
  tvsDown() { return this.tvs.filter(p => !p.alive).length; }
  partPos(p) { if (p.tv) return { x: p.tx, y: p.ty, r: p.r }; if (p.id === 'eye') return { x: AR.CX, y: 62, r: p.r }; return { x: this.rs.x + p.ox, y: this.rs.y + p.oy, r: p.r }; }
  partHittable(p) { if (p.tv || p.id === 'eye') return p.alive && this.stage === 'network' && this.wallUp >= 1 && !this.dead; return p.alive && this.stage === 'lance' && !this.gone && !this.dead && this.phase !== 'intro'; }
  hpPct() { if (this.stage === 'network') { const eye = this.get('eye'); let a = eye.hp, b = eye.max; for (const p of this.tvs) { a += p.hp; b += p.max; } return a / b; } const L = ['podium', 'turretL', 'turretR'].map(id => this.get(id)); return L.reduce((a, p) => a + p.hp, 0) / L.reduce((a, p) => a + p.max, 0); }
  skipIntro() { this.y = 80; this.z = 20; this.introDone = true; this.setPhase('lance', this.lancePhase()); }
  *intro() { const w = this.world; for (let t = 0; t < 2; t += w.lastDt) { this.y = lerp(-40, 80, easeOut(t / 2)); yield; } w.event('line', { id: 'finaleIntro' }); yield 3; this.introDone = true; this.setPhase('lance', this.lancePhase()); }
  *hover(s) { const w = this.world; for (let t = 0; t < s; t += w.lastDt) { const c = nearestC(w, this), d = dist(c, this), a = angTo(c, this), want = d < 100 ? 1 : d > 140 ? -1 : 0; this.x = clamp(this.x + Math.cos(a) * want * 40 * w.lastDt, AR.X0 + 40, AR.X1 - 40); this.y = clamp(this.y + Math.sin(a) * want * 40 * w.lastDt, AR.Y0 + 30, AR.Y1 - 60); this.z = 20 + Math.sin(this.t * 2) * 3; yield; } }
  *lancePhase() {
    const w = this.world, pod = this.get('podium');
    while (true) {
      for (const pat of ['cyclone', 'micdrop', 'sweep']) {
        if (this.breaks < 2 && pod.hp < pod.max * (this.breaks === 0 ? .66 : .33)) { yield* this.commercial(); }
        if (!pod.alive) { yield* this.robotReveal(); return; }
        if (pat === 'cyclone') { w.event('pattern', { name: 'CUE CARD CYCLONE' }); let a = 0, acc = 0; for (let t = 0; t < 3; t += w.lastDt) { a += 1.4 * w.lastDt; acc += 12 * w.lastDt; while (acc >= 1) { acc--; for (let k = 0; k < 3; k++) w.fireFoe('card', this.x, this.y + 6, a + k * TAU / 3, bulletSpd(95)); } this.z = 20 + Math.sin(this.t * 2) * 3; if (!pod.alive) break; yield; } yield* this.hover(1); }
        else if (pat === 'micdrop') {
          w.event('pattern', { name: 'MIC DROP' }); const c = nearestC(w, this); this.micX = c.x; this.micY = c.y; this.micR = 30; this.micT = 1;
          for (let t = 0; t < 1; t += w.lastDt) { this.micT = 1 - t; this.z = 20 + t * 40; this.x = lerp(this.x, this.micX, w.lastDt * 4); this.y = lerp(this.y, this.micY - 20, w.lastDt * 4); yield; }
          this.x = this.micX; this.y = this.micY - 10; this.z = 0; this.micT = 0; MT.sfx('bigboom'); w.shake(7);
          for (let i = 0; i < 24; i++) w.fireFoe('orb', this.micX, this.micY, i / 24 * TAU, bulletSpd(85));
          this.shock = .01; this.shockX = this.micX; this.shockY = this.micY; this.shockHit = new Set();
          for (let t = 0; t < .8; t += w.lastDt) { this.shock = t / .8 * 80; for (const c2 of w.contestants) { if (c2.ctl === 'remote' || c2.ctl === 'mirror' || this.shockHit.has(c2.cid)) continue; const d = Math.hypot(c2.x - this.shockX, c2.y - this.shockY); if (Math.abs(d - this.shock) < 6) { this.shockHit.add(c2.cid); w.hurtContestant(c2, 1, { kind: 'shock', x: this.shockX, y: this.shockY }); } } yield; }
          this.shock = 0; this.micT = 0; this.micX = this.micY = -999; for (let t = 0; t < .6; t += w.lastDt) { this.z = t / .6 * 20; yield; }
          yield* this.hover(1);
        }
        else if (pat === 'sweep') {
          w.event('pattern', { name: 'SPOTLIGHT SWEEP' }); const turrets = [this.get('turretL'), this.get('turretR')];
          const base = [Math.PI * .6, Math.PI * .4];
          for (let t = 0; t < 4.5; t += w.lastDt) {
            for (let i = 0; i < 2; i++) { if (!turrets[i].alive) { this.cones[i] = null; continue; } const tele = t < .8; const a = base[i] + Math.sin((t - .8) * 1.2 + i * 2) * .9; this.cones[i] = { a, tele }; if (!tele) this.coneHit(w, i, a); }
            this.z = 20 + Math.sin(this.t * 2) * 3; yield;
          }
          this.cones = [null, null]; yield* this.hover(1);
        }
      }
    }
  }
  coneHit(w, i, a) {
    const ox = this.x + (i ? 26 : -26), oy = this.y + 4;
    for (const c of w.contestants) { if (c.ctl === 'remote' || c.ctl === 'mirror') continue; const d = Math.hypot(c.x - ox, c.y - oy), da = Math.abs(angDiff(a, Math.atan2(c.y - oy, c.x - ox))); const inside = d < 200 && da < .22; c.coneT = inside ? (c.coneT || 0) + w.lastDt : 0; if (c.coneT >= .4) { c.coneT = 0; w.hurtContestant(c, 1, { kind: 'spotlight', x: ox, y: oy }); } }
  }
  *commercial() {
    const w = this.world; this.breaks++; w.event('commercial', {}); this.cones = [null, null];
    const y0 = this.y; for (let t = 0; t < 1; t += w.lastDt) { this.y = lerp(y0, -60, t); this.z = 20 + t * 40; yield; }
    this.gone = true;
    w.arena.queueSpawn('W', 'goon', MT.scaleAdds(w, 5), .3); w.arena.queueSpawn('E', 'goon', MT.scaleAdds(w, 5), .3); w.arena.queueSpawn('S', 'clapbot', MT.scaleAdds(w, 6), .25); w.arena.queueSpawn('N', 'brute', 1, .5);
    let t = 0; yield 1;
    while (t < 12 && (w.countedAlive() > 0 || w.arena.pendingSpawns() > 0)) { t += w.lastDt; yield; }
    this.gone = false; w.event('backFromBreak', {});
    for (let k = 0; k < 1; k += w.lastDt) { this.y = lerp(-60, 80, easeOut(k)); this.z = 60 - k * 40; yield; }
  }
  *robotReveal() {
    const w = this.world; this.cones = [null, null]; this.stage = 'crash'; w.event('lanceDown', {}); w.fShots.clear();
    for (let t = 0; t < 1; t += w.lastDt) { this.z = Math.max(0, 20 * (1 - t * 2)); yield; }
    MT.sfx('crash'); w.shake(8); if (game.particles && !w.quietFx) game.particles.explosion(this.x, this.y, 10, 1.6, { shake: 0, freeze: false });
    this.lz = 1; yield 2.5;
    this.robot = 1; w.event('robotReveal', {}); yield 3.5;
    this.stage = 'rise'; w.event('networkReveal', {});
    for (let t = 0; t < 2; t += w.lastDt) { this.wallUp = t / 2; yield; }
    this.wallUp = 1; this.stage = 'network'; this.name = 'THE NETWORK'; MT.music.layer('phase2', true);
    this.setPhase('network', this.networkPhase());
  }
  *networkPhase() {
    const w = this.world, eye = this.get('eye');
    let eyeT = 0, mode = 0;
    while (true) {
      const dt = w.lastDt;
      let active = this.tvs.filter(p => p.alive && p.ch >= 0).length;
      for (const tv of this.tvs) {
        if (!tv.alive) { tv.ch = -1; continue; }
        tv.chT -= dt;
        if (tv.ch === -2 && tv.chT <= 0) { tv.ch = tv.next; tv.chT = tv.ch === 1 ? 1.8 : 1.2; tv.fired = false; tv.newsT = 0; }
        else if (tv.ch >= 0) {
          if (!tv.fired && tv.ch !== 1) { tv.fired = true; this.channel(w, tv); }
          if (tv.ch === 1) { tv.newsT += dt; if (tv.newsT > .8) this.newsHit(w, tv); }
          if (tv.chT <= 0) { tv.ch = -1; tv.chT = 4 + RNG.ai() * 2; }
        } else if (tv.ch === -1 && tv.chT <= 0 && active < 4) { tv.ch = -2; tv.next = Math.floor(RNG.ai() * 5); tv.chT = .5; active++; MT.sfx('channel'); }
        else if (tv.ch === -1 && tv.chT <= 0) tv.chT = .5;
      }
      if (this.tvsDown() >= 8) { this.eyeOpen = Math.min(1, this.eyeOpen + dt); eyeT -= dt; if (eyeT <= 0) { eyeT = 3; mode = 1 - mode; this.eyeMode = mode; } if (mode === 0) { this._sp = (this._sp || 0) + dt; this._spA = (this._spA || 0) + dt * 1.6; while (this._sp > .1) { this._sp -= .1; for (let k = 0; k < 2; k++) w.fireFoe('static', AR.CX, 62, this._spA + k * Math.PI, bulletSpd(90)); } } else if (eyeT > 2.9) for (let i = 0; i < 18; i++) w.fireFoe('orb', AR.CX, 62, i / 18 * TAU + this.t, bulletSpd(80)); }
      if (!eye.alive) { this.setPhase('death', this.death()); return; }
      yield;
    }
  }
  channel(w, tv) {
    const c = nearestC(w, { x: tv.tx, y: tv.ty });
    if (tv.ch === 0) { for (let i = 0; i < 5; i++) w.fireFoe('static', tv.tx, tv.ty + 8, Math.atan2(c.y - tv.ty, c.x - tv.tx) + (i - 2) * .12, bulletSpd(100)); MT.sfx('static'); }
    else if (tv.ch === 2) { for (let i = 0; i < 2; i++) w.spawnEnemy('clapbot', tv.tx + (i ? 6 : -6), tv.ty + 16, { inside: true }); }
    else if (tv.ch === 3) w.addPickup(MT.makePickup('stack', tv.tx, tv.ty + 24, { z: 10, vz: 60 }));
    else if (tv.ch === 4) { for (let i = -1; i <= 1; i++) w.fireFoe('orb', tv.tx, tv.ty + 8, Math.atan2(c.y - tv.ty, c.x - tv.tx) + i * .25, bulletSpd(95)); }
  }
  newsHit(w, tv) { for (const c of w.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && Math.abs(c.x - tv.tx) < c.r + 5 && c.y > tv.ty) w.hurtContestant(c, 1, { kind: 'news', x: tv.tx, y: c.y }); }
  *death() { const w = this.world; w.event('line', { id: 'networkDown' }); for (const tv of this.tvs) { if (tv.alive) { tv.alive = false; if (game.particles && !w.quietFx) game.particles.explosion(tv.tx, tv.ty, 14, .7, { shake: 0, freeze: false }); MT.sfx('static'); yield .18; } } this.x = AR.CX; this.y = 80; yield* this.deathShower(w, ['#c8d0e0', '#2ee6ff', '#ffffff', '#ff2e88']); this.dead = true; w.event('bossDead', { boss: 'finale' }); }
  update(world, dt) {
    if (this.dead) return;
    if (this.stage === 'lance' && this.phase === 'lance' && !this.get('podium').alive) this.setPhase('reveal', this.robotReveal());
    if (this.stage === 'lance' && !this.gone && this.phase !== 'intro') this.solid(world, this.x, this.y, 18);
    if (this.stage === 'network') for (const tv of this.tvs) if (tv.alive) this.solid(world, tv.tx, tv.ty, 10);
  }
  animate(dt) {
    if (MT.cfg.skipRigs) return;
    const s = this.rs, down = s.lz && (s.stage === 'crash' || s.stage === 'rise' || s.stage === 'network');
    this.lance.update(dt, { x: s.x, y: s.y - 2, z: down ? 0 : s.z + 10, vx: 0, vy: 0, facing: Math.PI / 2, pose: down ? (s.robot ? 'kneel' : 'die') : s.micT > 0 ? 'cheer' : Math.floor(s.t) % 3 === 0 ? 'wave' : 'hips', expr: s.robot ? 'shout' : 'smile' });
  }
  sync() { super.sync(); const s = this.rs; s.stage = this.stage; s.robot = this.robot; s.wallUp = this.wallUp; s.eyeOpen = this.eyeOpen; s.micX = this.micX === undefined ? -999 : this.micX; s.micY = this.micY === undefined ? -999 : this.micY; s.micR = 30; s.micT = this.micT || 0; s.cone0 = this.cones[0] ? this.cones[0].a * (this.cones[0].tele ? -1 : 1) : 0; s.cone1 = this.cones[1] ? this.cones[1].a * (this.cones[1].tele ? -1 : 1) : 0; s.tvch = this.tvs.map(p => p.ch).join(','); s.shock = this.shock || 0; s.shockX = this.shockX || 0; s.shockY = this.shockY || 0; s.lz = this.lz || 0; }
  draw(r, t, world) {
    const s = this.rs; if (s.dead && s.stage === 'network') return;
    if (s.stage === 'rise' || s.stage === 'network') this.drawNetwork(r, t, s);
    if (s.micX > -900 && s.micT > 0) r.decal(() => { r.groundDisc(s.micX, s.micY, 30 * (1 - s.micT * .5), '#000000', .5); r.groundRing(s.micX, s.micY, 30, Math.floor(t * 10) % 2 ? '#ff3344' : '#ffcc33', 1); });
    if (s.shock > 0) r.decal(() => { r.groundRing(s.shockX, s.shockY, s.shock, '#ffffff', 1); r.groundRing(s.shockX, s.shockY, Math.max(1, s.shock - 3), '#ffcc33', .8); });
    for (const [i, a] of [[0, s.cone0], [1, s.cone1]]) { if (!a) continue; const tele = a < 0, ang = Math.abs(a), ox = s.x + (i ? 26 : -26), oy = s.y + 4; r.decal(g => { const pts = [r.w(ox, oy, 0)]; for (let k = -1; k <= 1; k += .25) pts.push(r.w(ox + Math.cos(ang + k * .22) * 200, oy + Math.sin(ang + k * .22) * 200, 0)); if (tele) { for (let k = 1; k < pts.length - 1; k++) px.line(g, pts[0][0], pts[0][1], pts[k][0], pts[k][1], '#ff3344'); } else px.blend(g, .45, 'add', () => px.poly(g, pts, '#fff6c0')); }, { emissive: tele ? 0 : 1 }); if (!tele) game.lights.add(ox + Math.cos(ang) * 90, oy + Math.sin(ang) * 90, 0, 70, .8, { color: '#fff6c0' }); }
    if (s.stage === 'network') return;
    if (s.gone && s.stage === 'lance') return;
    const x = s.x, y = s.y, z = s.stage === 'lance' ? s.z : 0, P = s.parts || [];
    this.drawShadow(r, x, y + 4, 24);
    if (s.stage === 'lance') {
      r.actor(x, y + 6, z, (g, ox, oy) => {
        const pf = (s.pf || []).slice(0, 3).some(f => f);
        px.poly(g, [[ox - 22, oy - 4], [ox + 22, oy - 4], [ox + 16, oy + 8], [ox - 16, oy + 8]], '#140a24'); px.poly(g, [[ox - 21, oy - 4], [ox + 21, oy - 4], [ox + 15, oy + 7], [ox - 15, oy + 7]], pf ? '#ffffff' : '#c8a040');
        px.rect(g, ox - 18, oy - 16, 36, 13, '#140a24'); px.rect(g, ox - 17, oy - 15, 34, 11, '#ffcc33'); px.rect(g, ox - 17, oy - 15, 34, 2, '#fff6b0');
        E.font.text(g, 'STARMAKER', ox, oy - 13, '#7a2ad0', { align: 'center', outline: false, font: 'tiny' }); E.font.text(g, '9000', ox, oy - 8, '#7a2ad0', { align: 'center', outline: false, font: 'tiny' });
        for (const k of [-10, 0, 10]) { px.disc(g, ox + k, oy + 10, 3, Math.floor(t * 20 + k) % 2 ? '#ff9a3c' : '#ffcc33'); }
        for (const [sd, alive] of [[-1, P[1] > 0], [1, P[2] > 0]]) { if (!alive) continue; const tx = ox + sd * 26, ty = oy - 8; px.disc(g, tx, ty, 7, '#140a24'); px.disc(g, tx, ty, 6, '#5a5468'); px.disc(g, tx, ty + 1, 4, '#fff6c0'); px.dot(g, tx - 1, ty - 1, '#ffffff'); }
      }, { outline: false });
      game.lights.add(x, y, z + 6, 50, .6, { color: '#ffcc33' });
    }
    r.actor(x, y - 2, s.stage === 'lance' ? z + 10 : 0, (g, ox, oy) => {
      this.lance.draw(g, ox, oy, r.view);
      if (s.robot) { const h = this.lance.head(), [hx, hy] = r.w(h.x, h.y, h.z); px.rect(g, hx - 4, hy - 3, 8, 6, '#5a5f70'); for (let k = -3; k <= 3; k += 2) px.line(g, hx + k, hy - 2, hx + k, hy + 2, '#1a1a24'); px.dot(g, hx - 2, hy - 4, Math.floor(t * 8) % 2 ? '#ff3344' : '#2a0008'); px.dot(g, hx + 2, hy - 4, Math.floor(t * 8) % 2 ? '#ff3344' : '#2a0008'); }
      else MT.paint.drawMic(g, r, this.lance);
    }, { xray: true });
  }
  drawNetwork(r, t, s) {
    const up = s.wallUp || 0, ch = String(s.tvch || '').split(',').map(Number);
    r.queue(AR.CX, 8, 0, g => { const a = r.w(40, 10, 0), b = r.w(328, 10, 60 * up); px.rect(g, a[0], b[1], b[0] - a[0], a[1] - b[1], '#0c0a18'); for (let x = a[0]; x < b[0]; x += 6) px.line(g, x, b[1], x, a[1], '#141024'); }, { bias: -5 });
    if (up < 1) return;
    this.tvs.forEach((tv, i) => {
      const alive = (s.parts || [])[this.parts.indexOf(tv)] > 0, c = ch[i];
      r.queue(tv.tx, tv.ty, 0, g => {
        r.box(g, tv.tx - 11, tv.ty - 5, 0, tv.tx + 11, tv.ty + 5, 20, '#2a2838', '#141018');
        const p0 = r.w(tv.tx - 9, tv.ty + 5, 18), p1 = r.w(tv.tx + 9, tv.ty + 5, 4), x0 = Math.round(p0[0]), y0 = Math.round(p0[1]), w = Math.round(p1[0] - p0[0]), h = Math.round(p1[1] - p0[1]);
        if (!alive) { px.rect(g, x0, y0, w, h, '#0a0a0a'); px.line(g, x0, y0, x0 + w, y0 + h, '#5a5468'); return; }
        const bg = c === -2 ? (Math.random() < .5 ? '#ffffff' : '#3a3a48') : c === 0 ? '#5a5a68' : c === 1 ? '#1a3a8a' : c === 2 ? '#ff9a3c' : c === 3 ? '#2a8a4a' : c === 4 ? '#7a2ad0' : '#141030';
        px.rect(g, x0, y0, w, h, bg);
        if (c === 0 || c === -2) for (let k = 0; k < 14; k++) px.dot(g, x0 + Math.random() * w, y0 + Math.random() * h, Math.random() < .5 ? '#ffffff' : '#000000');
        if (c === 1) { E.font.text(g, 'NEWS', x0 + w / 2, y0 + 1, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }
        if (c === 2) { px.disc(g, x0 + w / 2, y0 + h / 2, 3, '#ffffff'); px.dot(g, x0 + w / 2 - 1, y0 + h / 2 - 1, '#000'); }
        if (c === 3) E.font.text(g, '$', x0 + w / 2, y0 + 1, '#ffcc33', { align: 'center', outline: false });
        if (c === 4) { px.disc(g, x0 + w / 2, y0 + h / 2, 3, '#f0c8a0'); px.rect(g, x0 + w / 2 - 3, y0 + h / 2 - 4, 6, 2, '#e8e8f4'); }
        if (c === -1) { E.font.text(g, 'N', x0 + w / 2, y0 + 1, '#3a3a5a', { align: 'center', outline: false, font: 'tiny' }); }
      }, { occluder: true, top: 20 });
      if (alive && c === 1) r.decal(g => { const a = r.w(tv.tx, tv.ty + 8, 0), b = r.w(tv.tx, AR.Y1, 0); px.line(g, a[0], a[1], b[0], b[1], Math.floor(t * 12) % 2 ? '#ff3344' : '#ffffff', 3); }, { emissive: 1 });
    });
    const eyeA = (s.parts || [])[this.parts.indexOf(this.get('eye'))] > 0;
    if (eyeA) r.queue(AR.CX, 62, 0, g => {
      r.box(g, AR.CX - 20, 54, 0, AR.CX + 20, 70, 26, '#3a3448', '#1a1420');
      const [ex, ey] = r.w(AR.CX, 70, 14), open = s.eyeOpen || 0;
      px.ell(g, ex, ey, 16, 9, '#140a24'); px.ell(g, ex, ey, 15, 2 + 6 * open, '#fff7e8'); if (open > .2) { px.disc(g, ex, ey, 5 * open + 1, '#2ee6ff'); px.disc(g, ex, ey, 2.5 * open + .5, '#140a24'); px.dot(g, ex - 2, ey - 2, '#ffffff'); }
    }, { occluder: true, top: 26 });
    game.lights.add(AR.CX, 62, 20, 90, .7, { color: '#2ee6ff' });
  }
}
BOSSES.finale = Finale;

// ---- 18-world.js ----
// ---- the World: everything in one room; the authoritative step, the damage pipeline, kill credit, the room's phases ----
const FOE = {
  orb: { r: 3, color: '#ff9a3c', core: '#fff0a0' }, shard: { r: 2, color: '#ffb030', core: '#fff6c0' }, beam: { r: 2, color: '#ffcc33', core: '#ffffff', long: true },
  coin: { r: 3, color: '#ffcc33', core: '#8a5a08' }, card: { r: 3, color: '#fff7e8', core: '#d02a3a', card: true }, static: { r: 2.5, color: '#c8d0e0', core: '#ffffff', jitter: true },
  gravy: { r: 3, color: '#a0602a', core: '#e0a060' }, butter: { r: 3, color: '#ffe070', core: '#fffbe0' }, shell: { r: 4, color: '#3a3448', core: '#ff3344', shell: true },
  spark: { r: 2.5, color: '#ff9a3c', core: '#ffffff' },
};
MT.FOE = FOE;
let EID = 1, BID = 1;
MT.resetIds = () => { EID = 1; BID = 1; MT.resetPickupIds(); };
class World {
  constructor(o = {}) {
    this.room = o.room; this.mode = o.mode || 'auth'; this.session = !!o.session; this.attract = !!o.attract; this.cosmetic = this.mode === 'mirror';
    this.run = o.run || MT.run;
    this.arena = new Arena(o.set || (o.room && o.room.set) || 'studio', { hazards: (o.room && o.room.hazards) || [] });
    this.contestants = []; this.enemies = []; this.targets = []; this.pickups = []; this.proj = []; this.lobs = []; this.decals = []; this.boss = null;
    this.pShots = new E.Bullets(game, { plane: 'ground', max: 600 }); this.fShots = new E.Bullets(game, { plane: 'ground', max: 700, sparks: true });
    this.hash = new E.SpatialHash(32);
    this.ratings = (this.run && this.run.ratings) || new Ratings();
    this.phase = 'ENTER'; this.phaseT = 0; this.wave = 0; this.wavesSpawned = false; this.script = null; this.cos = []; this.timers = []; this.time = 0; this.lastDt = 1 / 120;
    this.events = []; this.ring = []; this.evSeq = 0; this.outcome = null; this.exitPick = null; this.hurry = 0; this.mk = {}; this.quietFx = false; this.entry = o.entry || 'S';
    this.clearT = 0; this.mimesPlaced = 0; this.mimesKilled = 0; this.keyDropped = false; this.surviveLeft = 0; this.cage = null; this.started = false; this.stats = { kinds: {}, killed: {}, weapons: {}, hazards: {} };
    this.freeze = false;
  }
  // ---------------------------------------------------------------- helpers
  playerCount() { return Math.max(1, this.contestants.length); }
  countedAlive() { let n = 0; for (const e of this.enemies) if (!e.dead && ENEMIES[e.kind].counted && !e.harmless) n++; return n; }
  pendingDelayed() { let n = 0; for (const t of this.timers) if (t.spawn) n++; return n; }
  delayed(t, fn, spawn = false) { this.timers.push({ t, fn, spawn }); }
  event(name, data = {}) { const ev = { name, data, seq: ++this.evSeq, at: this.time }; this.events.push(ev); return ev; }
  shake(n) { if (!this.session) game.shake(n * MT.T.shakeMul); }
  freePoint(minD = 50) {
    for (let k = 0; k < 40; k++) { const x = AR.X0 + 20 + RNG.spawn() * (AR.X1 - AR.X0 - 40), y = AR.Y0 + 20 + RNG.spawn() * (AR.Y1 - AR.Y0 - 40); if (this.contestants.every(c => !c.alive || Math.hypot(c.x - x, c.y - y) >= minD) && !this.arena.map.heightAt(x, y)) return [x, y]; }
    return [AR.CX, AR.CY];
  }
  contestantById(id) { return this.contestants.find(c => c.netId === id); }
  // ---------------------------------------------------------------- spawning
  spawnEnemy(kind, x, y, o = {}) {
    const A = ENEMIES[kind]; if (!A) { if (game) game.fail('spawn', new Error('no enemy kind ' + kind)); return null; }
    const e = { id: EID++, kind, x, y, z: 0, vx: 0, vy: 0, face: Math.PI / 2, hp: A.hp * MT.T.enemyHp, r: A.r, state: 'walk', t: 0, flash: 0, dead: false, stunT: 0, entering: !o.inside && !o.leap && !o.drop && !!o.door, door: o.door || null, alpha: 1 };
    e.maxHp = e.hp;
    if (o.door) { const D = DOORS[o.door]; e.face = Math.atan2(D.ny, D.nx); }
    A.make(this, e, o);
    if (o.key) e.carriesKey = true;
    e.rs = { kind, x, y, z: 0, face: e.face, vx: 0, vy: 0, state: e.state, t: 0, t2: 0, hpPct: 1, flash: 0, alpha: e.alpha };
    this.enemies.push(e);
    this.stats.kinds[kind] = (this.stats.kinds[kind] || 0) + 1;
    if (!o.quiet) this.event('spawn', { kind, id: e.id });
    return e;
  }
  /** a heckler leaping over the wall from the bleachers */
  spawnAudience(kind) {
    const side = RNG.spawn() < .5 ? -1 : 1, sx = side < 0 ? -30 : 398, sy = 40 + RNG.spawn() * 160, tx = side < 0 ? 40 + RNG.spawn() * 60 : 328 - RNG.spawn() * 60, ty = 30 + RNG.spawn() * 180;
    const e = this.spawnEnemy(kind, sx, sy, { leap: true }); if (!e) return;
    e.leap = { sx, sy, tx, ty, t: 0, T: .7 }; e.z = 20;
    this.event('leap', { id: e.id });
  }
  /** from the ceiling: a shadow telegraphs for .6 s, then it falls */
  spawnDrop(kind) {
    const [x, y] = this.freePoint(50); const e = this.spawnEnemy(kind, x, y, { drop: true }); if (!e) return;
    e.dropT = 0; e.z = 90;
  }
  addPickup(p) { this.pickups.push(p); return p; }
  addTarget(kind, x, y, o = {}) { const A = TARGETS[kind]; const t = Object.assign({ id: EID++, kind, x, y, z: 0, hp: A.hp, maxHp: A.hp, r: A.r, dead: false, flash: 0 }, o); this.targets.push(t); if (kind !== 'cage') try { t.solid = this.arena.map.solid(A.shape, x, y, 0, { facing: Math.PI / 2 }); } catch (e) { /* none */ } return t; }
  // ---------------------------------------------------------------- foe projectiles
  fireFoe(kind, x, y, ang, speed, o = {}) {
    const F = FOE[kind] || FOE.orb;
    const b = this.fShots.fire({ x, y, z: o.z || 10, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: o.r || F.r, life: o.life || 4.5, dmg: o.dmg || 1, team: 'f', color: F.color, core: F.core, data: { id: BID++, kind, src: o.src } });
    if (b && F.shell) b.onWall = q => this.explodeFoe(q.x, q.y, 16, 1, 'shell', q.data.id);
    return b;
  }
  /** a lob (tomato, tot) that lands at (tx, ty) after T seconds, its landing ringed in red the whole way */
  lob(kind, x, y, z, tx, ty, T, o = {}) {
    const a = E.arc({ x, y, z }, { x: tx, y: ty, z: 0 }, 360, { time: T });
    this.lobs.push({ id: BID++, kind, x, y, z, vx: a.vx, vy: a.vy, vz: a.vz, g: 360, tx, ty, t: 0, T, src: o.id });
  }
  // ---------------------------------------------------------------- the damage pipeline
  damageEnemy(e, dmg, src = {}) {
    if (e.dead || e.entering || e.leap || (e.dropT !== undefined && e.dropT < .9) || ENEMIES[e.kind].harmless) return false;
    if (MT.cheats.oneHit && !this.session) dmg = 1e6;
    const A = ENEMIES[e.kind]; if (A.dmgMul) dmg *= A.dmgMul(e);
    if (src.owner !== undefined && src.owner !== null) { const ow = this.contestantById(src.owner); if (ow && ow.dmgMul) dmg *= ow.dmgMul; }
    e.hp -= dmg; e.flash = .08;
    if (!src.beam) { const a = src.x !== undefined ? Math.atan2(e.y - src.y, e.x - src.x) : 0; if (!A.big && !A.child && A.speed) { e.x += Math.cos(a) * 1.5; e.y += Math.sin(a) * 1.5; } if (game.particles && !this.quietFx) game.particles.sparks(e.x, e.y, 10, 2, a, { color: '#fff0a0' }); }
    if (e.hp <= 0) this.killEnemy(e, src);
    return true;
  }
  killEnemy(e, src = {}) {
    if (e.dead) return; e.dead = true;
    const A = ENEMIES[e.kind], owner = src.owner !== undefined && src.owner !== null ? this.contestantById(src.owner) : null;
    this.stats.killed[e.kind] = (this.stats.killed[e.kind] || 0) + 1;
    if (!src.self || src.w === 'fuse') {
      if (owner && !src.noCash) { this.credit(owner, A.cash, { at: e, quiet: A.cash < 1000 }); owner.pr.kills++; }
      let gain = A.rat;
      if (owner) { const m = this.mk[owner.netId] || (this.mk[owner.netId] = { n: 0, t: -1 }); if (this.time - m.t < .4) m.n++; else m.n = 1; m.t = this.time; if (m.n > 2) { gain += 2; if (m.n === 5) this.event('multikill', { c: owner, n: m.n }); } }
      if (!src.noCash) this.ratings.add(gain, this);
    }
    this.event('kill', { kind: e.kind, x: e.x, y: e.y, id: e.id, big: !!A.big, owner: owner && owner.netId, w: src.w });
    if (!src.noCash && !src.self) MT.rollDrops(this, e);
    if (e.carriesKey) this.dropKey(e.x, e.y);
    if (e.kind === 'mime' && e.placed) { this.mimesKilled++; if (this.room && this.room.key && this.room.key.rule === 'mimes' && this.mimesKilled >= this.mimesPlaced) this.dropKey(e.x, e.y); }
    if (A.onDeath) A.onDeath(e, this);
  }
  damageTarget(t, dmg, src = {}) {
    if (t.dead || TARGETS[t.kind].invulnerable) return;
    t.hp -= dmg; t.flash = .08;
    if (t.hp <= 0) {
      t.dead = true; const owner = src.owner !== undefined ? this.contestantById(src.owner) : null;
      if (t.solid) { const i = this.arena.map.solids.indexOf(t.solid); if (i >= 0) this.arena.map.solids.splice(i, 1); }
      this.event('targetBroken', { kind: t.kind, x: t.x, y: t.y });
      if (owner) this.ratings.add(TARGETS[t.kind].rat, this);
      if (t.kind === 'crate') {
        const n = 3 + Math.floor(RNG.drops() * 3);
        for (let i = 0; i < n; i++) { const a = RNG.drops() * TAU, sp = 40 + RNG.drops() * 40; this.addPickup(MT.makePickup(rpick(RNG.drops, ['bill', 'bill', 'stack', 'gold']), t.x, t.y, { z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 90 })); }
        if (RNG.drops() < .5) this.addPickup(MT.makePickup('prize', t.x, t.y, { z: 4, vz: 110 }));
        if (t.key) this.dropKey(t.x, t.y);
      }
      if (t.kind === 'lock') { if (owner) this.credit(owner, TARGETS.lock.cash, { at: t }); if (this.targets.filter(q => q.kind === 'lock' && !q.dead).length === 0) this.openVault(); }
    }
  }
  damageBossPart(p, dmg, src = {}) { if (this.boss) this.boss.damage(this, p, dmg, src); }
  /** a player explosion: rockets, popcorn, a dolly tank's death (hurtsAll: the tank's blast hurts enemies too) */
  explode(x, y, r, dmg, owner, w, small, tankBlast) {
    if (!this.quietFx) { if (small) { if (game.particles) { game.particles.bits(x, y, 4, 8, ['#fff0a0', '#ffffff', '#ffcc33']); game.particles.ring(x, y, 2, r, '#fff0a0', .25); } MT.sfx('pop'); } else { if (game.particles) game.particles.explosion(x, y, 6, r / 24, { shake: 0, freeze: false }); MT.sfx('boom'); this.shake(2); if (this.decals.length < 220) this.decals.push({ kind: 'scorch', x, y, r: r * .6, t: 0, life: 8 }); } }
    if (this.cosmetic || !(dmg > 0)) return;
    for (const e of this.enemies) if (!e.dead && dist2(e, { x, y }) < (r + e.r) ** 2) this.damageEnemy(e, dmg, { owner, w, x, y });
    if (this.boss) for (const p of this.boss.parts) if (p.alive && this.boss.partHittable(p)) { const q = this.boss.partPos(p); if (dist2(q, { x, y }) < (r + p.r) ** 2) this.damageBossPart(p, dmg, { owner, w }); }
    for (const t of this.targets) if (!t.dead && dist2(t, { x, y }) < (r + t.r) ** 2) this.damageTarget(t, dmg, { owner, w });
    if (tankBlast) for (const c of this.contestants) if (dist2(c, { x, y }) < (r + c.r) ** 2) this.hurtContestant(c, 1, { kind: 'tank', x, y });
  }
  /** a foe's blast (a mime, a shell, a tater tot): hurts contestants in range */
  explodeFoe(x, y, r, dmg, kind, id) {
    if (!this.quietFx && game.particles) { game.particles.explosion(x, y, 4, r / 30, { shake: 0, freeze: false, debris: false }); game.particles.bits(x, y, 6, 10, PALETTE[kind] || PALETTE.mime); }
    if (!this.quietFx) { MT.sfx(kind === 'mime' ? 'pfft' : 'shellboom'); this.shake(2); }
    this.event('blast', { x, y, r, kind });
    for (const c of this.contestants) if (c.ctl !== 'remote' && dist2(c, { x, y }) < (r + c.r) ** 2) this.hurtContestant(c, dmg, { kind, id, x, y });
  }
  hurtContestant(c, dmg, src = {}) {
    if (!c.targetable || c.invulnerable || c.ctl === 'remote' || c.ctl === 'mirror') return false;
    if (c.boatT > 0) c.boatHit = true;
    c.hp -= dmg; c.invuln = MT.T.invulnTime; c.hurtT = 1.0; c.hurtCount++;
    if (src.x !== undefined) { const a = Math.atan2(c.y - src.y, c.x - src.x); c.body.push(Math.cos(a) * 120, Math.sin(a) * 120, 0); }
    this.ratings.lose(12);
    if (!this.session) game.freeze(.03);
    if (c.input && c.input.rumble) c.input.rumble(.5, .15);
    if (!this.quietFx) { if (this.session) { game.particles.impact(c.x, c.y, 14, 7, '#ffe070'); game.particles.sparks(c.x, c.y, 14, 8, null, { color: '#ffb85c' }); } else game.hitFx(c.x, c.y, 14, { power: .6, damage: dmg, sound: false, rumble: false }); }
    this.event('hurt', { c, dmg, kind: src.kind, id: src.id });
    if (c.hp <= 0) this.killContestant(c);
    return true;
  }
  killContestant(c) {
    c.state = 'dead'; c.deadT = 2; c.hp = 0; c.pr.deaths++; c.boatT = 0;
    c.weapon = 'blaster'; c.wT = 0; for (const k in c.addons) c.addons[k] = 0;
    if (this.session) { c.pr.cash = Math.max(0, c.pr.cash - 2500); } else c.pr.lives = Math.max(0, c.pr.lives - 1);
    this.ratings.lose(25);
    if (game.particles && !this.quietFx) { game.particles.bits(c.x, c.y, 10, 30, [SLOT_COLORS[c.slot], '#ffffff', '#ffcc33']); game.particles.ring(c.x, c.y, 4, 30, SLOT_COLORS[c.slot], .4); }
    this.event('died', { c });
  }
  /** two seconds after a death: drop back in on a cable, or out of lives */
  afterDeath(c) {
    if (this.session || c.pr.lives > 0) { const D = DOORS[this.entry] || DOORS.S, [x, y] = [D.x + D.nx * 50 + (c.slot - 1.5) * 14, D.y + D.ny * 50]; c.dropIn(clamp(x, AR.X0 + 10, AR.X1 - 10), clamp(y, AR.Y0 + 10, AR.Y1 - 10)); }
    else { c.state = 'out'; this.event('out', { c }); }
  }
  /** a contestant out of lives continues on their own: full lives, half their winnings */
  continueContestant(c) { c.pr.lives = startLivesNow(); c.pr.cash = Math.floor(c.pr.cash / 2); c.pr.continues++; c.state = 'dead'; c.deadT = .1; this.event('continued', { c }); }
  allOut() { return this.contestants.length > 0 && this.contestants.every(c => c.state === 'out'); }
  // ---------------------------------------------------------------- money, the show
  credit(c, amount, o = {}) {
    if (!c || !(amount > 0)) return 0;
    const v = Math.round(amount * this.ratings.X * MT.T.cashMul * (this.room && this.room.cashRoom ? 1.5 : 1));
    c.pr.cash += v; c.pr.epCash = (c.pr.epCash || 0) + v;
    if (!this.attract && !this.session) { while (c.pr.nextLife < EXTRA_LIVES.length && c.pr.cash >= EXTRA_LIVES[c.pr.nextLife]) { c.pr.nextLife++; c.pr.lives++; this.event('extraLife', { c }); } }
    if (o.at && !o.quiet && game.particles && !this.quietFx) game.particles.text(o.at.x, o.at.y, 16, '+' + money(v), SLOT_COLORS[c.slot], { scale: 1 });
    return v;
  }
  collect(c, p) {
    p.dead = true; const K = PICKUPS[p.kind];
    if (K.cashy) { this.credit(c, K.cash, { at: p }); this.event('cash', { c, v: K.cash, kind: p.kind }); return; }
    if (p.kind === 'capsule') { MT.giveItem(this, c, p.wpn); this.stats.weapons[p.wpn] = (this.stats.weapons[p.wpn] || 0) + 1; this.event('powerup', { c, w: p.wpn }); return; }
    if (p.kind === 'bomb') { MT.giveItem(this, c, 'bomb'); this.event('powerup', { c, w: 'bomb' }); return; }
    if (p.kind === 'life') { MT.giveItem(this, c, 'life'); this.event('extraLife', { c }); return; }
    if (p.kind === 'prize') {
      const pz = MT.nextPrize(this);
      const v = this.credit(c, pz.value, { at: p }); c.pr.prizes.push({ name: pz.name, value: v, icon: pz.icon, line: pz.line });
      this.ratings.add(2, this); this.event('prize', { c, prize: pz, v }); return;
    }
    if (p.kind === 'key') {
      if (this.session) { this.credit(c, 10000, { at: p }); this.event('key', { c, n: 0, session: true }); return; }
      this.run.keys = (this.run.keys || 0) + 1; this.run.keyRooms = this.run.keyRooms || []; if (this.room) this.run.keyRooms.push(this.room.id);
      this.ratings.add(5, this); this.event('key', { c, n: this.run.keys }); return;
    }
    if (p.kind === 'statue') { const v = this.credit(c, 100000, { at: p }); c.pr.prizes.push({ name: MT.TEXT.grandPrize.name, value: v, icon: 'network', line: MT.TEXT.grandPrize.line }); this.event('statue', { c, v }); this.bonusDone = true; }
  }
  dropKey(x, y) {
    if (this.keyDropped) return; this.keyDropped = true;
    const p = this.addPickup(MT.makePickup('key', clamp(x, AR.X0 + 10, AR.X1 - 10), clamp(y, AR.Y0 + 10, AR.Y1 - 10), { z: 6, vz: 120, placed: true }));
    this.event('keyDrop', { x: p.x, y: p.y });
    return p;
  }
  openCage() { if (!this.cage || this.cage.opened) return; this.cage.opened = true; this.event('cage', {}); const t = this.targets.find(q => q.kind === 'cage'); if (t) t.dead = true; }
  openVault() { this.event('vault', {}); this.dropKey(120, 40); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (RNG.drops() - .5) * 2, sp = 50 + RNG.drops() * 60; this.addPickup(MT.makePickup(rpick(RNG.drops, ['stack', 'gold', 'gold', 'case']), 80 + RNG.drops() * 60, 34, { z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 80 })); } this.vaultOpen = true; }
  startPrime() {
    const Rt = this.ratings; Rt.prime = MT.T.primeTime; Rt.primeCount++;
    this.event('prime', {});
    if (this.cosmetic) return;
    for (let i = 0; i < 3; i++) { const side = i % 2 ? 1 : -1, sx = side < 0 ? -40 : 408, sy = 60 + RNG.drops() * 120, [tx, ty] = this.freePoint(20), a = E.arc({ x: sx, y: sy, z: 30 }, { x: tx, y: ty, z: 0 }, 400, { time: 1.1 }); this.addPickup(MT.makePickup('capsule', sx, sy, { z: 30, vx: a.vx, vy: a.vy, vz: a.vz })); }
  }
  /** the producers' stunt when the ratings flatline: the episode's stunt kind from a random door */
  stunt() {
    const ep = MT.EPISODES[this.room && this.room.ep] || MT.EPISODES[1], d = rpick(RNG.spawn, DOOR_IDS);
    for (const [kind, n] of ep.stunt) this.arena.queueSpawn(d, kind, n, .2);
    this.ratings.add(15, this); this.event('stunt', {});
  }
  showstopper(c) {
    if (!MT.cheats.infBombs && !c.infBombs) c.pr.bombs = Math.max(0, c.pr.bombs - 1);
    if (!this.quietFx) { game.flash('#ffffff', .12); MT.sfx('flashbulb'); this.shake(6); }
    if (game.particles && !this.quietFx) { game.particles.ring(c.x, c.y, 4, 260, '#ffffff', .5); for (let i = 0; i < 24; i++) game.particles.glints(AR.X0 + RNG.fx() * 336, AR.Y0 + RNG.fx() * 208, 8, 1, '#fff6c0', 6); }
    this.event('bomb', { c });
    if (this.cosmetic) return;
    for (const e of this.enemies) if (!e.dead && !e.entering && !ENEMIES[e.kind].harmless) { e.stunT = 1; this.damageEnemy(e, 25, { owner: c.netId, w: 'bomb', x: c.x, y: c.y }); }
    if (this.boss) for (const p of this.boss.parts) if (p.alive && this.boss.partHittable(p)) this.damageBossPart(p, 30, { owner: c.netId, w: 'bomb' });
    this.fShots.clear(); this.lobs.length = 0;
    this.ratings.add(8, this);
    if (!this.session) game.freeze(.08);
  }
  showboatDone(c) {
    let n = 0, m = 0; for (const e of this.enemies) if (!e.dead && ENEMIES[e.kind].counted) { const d = dist(e, c); if (d < 64) n++; if (d < 32) m++; }
    if (c.boatHit) { this.event('boatFail', { c }); return; }
    const g = Math.min(30, 4 + 3 * n + 3 * m), got = this.ratings.add(g, this); c.pr.boatGain += got;
    this.event('showboat', { c, gain: Math.round(got) });
  }
  // ---------------------------------------------------------------- the authoritative step
  step(dt) {
    this.lastDt = dt; this.time += dt; this.phaseT += dt;
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0) { t.dead = true; t.fn(); } }
    E.prune(this.timers, t => t.dead);
    // 1-2: contestants
    for (const c of this.contestants) {
      let intent = null;
      if (c.state === 'play') {
        if (c.ctl === 'bot' || (c.ctl === 'local' && MT.cheats.autopilot && c.slot === 0 && !this.session)) intent = MT.bot.intent(this, c, dt);
        else if (c.ctl === 'local' && !MT.overlay.open && !(MT.net && MT.net.overlayOpen)) intent = MT.intentFrom(c.input, c);
        if (intent && this.aimAssist(c, intent)) { /* nudged */ }
      }
      if (c.ctl === 'remote' || c.ctl === 'mirror') { if (MT.net) MT.net.stepRemote(this, c, dt); }
      else c.step(dt, this, intent);
    }
    // 3: enemies
    const fr = MT.cheats.freeze && !this.session;
    this.hash.build(this.enemies.filter(e => !e.dead && !e.entering && !ENEMIES[e.kind].child));
    for (const e of this.enemies) { if (e.dead) continue; e.t += dt; e.flash = Math.max(0, e.flash - dt); this.stepEnemy(e, dt, fr); }
    // 4: the boss
    if (this.boss && !fr) this.boss.step(this, dt);
    // 5: projectiles
    this.pShots.update(dt, this.arena.map);
    this.fShots.update(dt, this.arena.map);
    MT.stepProjectiles(this, dt);
    this.stepLobs(dt);
    // 6: collisions
    this.collide(dt);
    MT.stepPickups(this, dt);
    this.stepHazards(dt);
    // 7: the dead go; ratings
    E.prune(this.enemies, e => e.dead);
    E.prune(this.targets, t => t.dead && t.kind !== 'cage');
    for (const d of this.decals) d.t += dt; E.prune(this.decals, d => d.t > d.life);
    const playing = this.phase === 'WAVES' || this.phase === 'BOSS';
    if (playing || this.phase === 'CLEAR' || this.phase === 'EXIT') this.ratings.step(dt, this, this.phase === 'WAVES');
    // 8: the room's script, doors, phases
    if (this.script && !fr) this.script.step(dt);
    for (const co of this.cos) co.step(dt); E.prune(this.cos, co => co.done);
    this.arena.update(dt, (kind, x, y, door, extra) => this.spawnEnemy(kind, x, y, Object.assign({ door }, extra || {})));
    this.stepPhase(dt);
    // 11: rigs
    if (!MT.cfg.skipRigs) { for (const c of this.contestants) c.animate(dt); for (const e of this.enemies) MT.animateEnemy(e, dt); if (this.boss) this.boss.animate(dt); }
    for (const c of this.contestants) c.syncRs();
  }
  aimAssist(c, it) {
    if (!it.aim && it.aim !== 0) return false;
    if (it.aimSrc !== 'pad' || game.settings.aimAssist === false) return false;
    let best = null, bd = 170;
    for (const e of this.enemies) { if (e.dead || e.entering || !ENEMIES[e.kind].counted) continue; const d = dist(e, c); if (d > bd) continue; const da = Math.abs(angDiff(it.aim, angTo(c, e))); if (da < .175) { bd = d; best = e; } }
    if (best) { it.aim = it.aim + angDiff(it.aim, angTo(c, best)) * .5; return true; }
    return false;
  }
  stepEnemy(e, dt, frozen) {
    const A = ENEMIES[e.kind];
    if (e.leap) { const L = e.leap; L.t += dt; const k = clamp(L.t / L.T, 0, 1); e.x = lerp(L.sx, L.tx, k); e.y = lerp(L.sy, L.ty, k); e.z = 20 + Math.sin(k * Math.PI) * 40 - k * 20; if (k >= 1) { e.leap = null; e.z = 0; } this.syncEnemy(e); return; }
    if (e.dropT !== undefined && e.dropT < .9) { e.dropT += dt; e.z = e.dropT < .6 ? 90 : 90 * (1 - (e.dropT - .6) / .3); if (e.dropT >= .9) { e.z = 0; if (!this.quietFx && game.particles) game.particles.dust(e.x, e.y, 0, 8); MT.sfx('land', { vol: .5 }); } this.syncEnemy(e); return; }
    if (e.entering) {
      const D = DOORS[e.door], sp = Math.max(40, (A.speed || 40)) * MT.T.enemySpeed;
      e.x += D.nx * sp * dt; e.y += D.ny * sp * dt; e.face = Math.atan2(D.ny, D.nx); e.vx = D.nx * sp; e.vy = D.ny * sp;
      if (inInterior(e.x, e.y, e.r + 2)) e.entering = false;
      if (A.after) A.after(e, dt, this);
      this.syncEnemy(e); return;
    }
    if (e.stunT > 0) { e.stunT -= dt; e.vx = e.vy = 0; this.syncEnemy(e); return; }
    if (frozen) { e.vx = e.vy = 0; this.syncEnemy(e); return; }
    A.update(e, dt, this);
    if (!A.child) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (A.speed && !A.big) this.hash.near(e.x, e.y, 12, o => { if (o === e || o.dead) return; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || .01, ov = (e.r + o.r) * .8 - d; if (ov > 0) { e.x += dx / d * ov * .3; e.y += dy / d * ov * .3; } });
      if (!e.noCollide) this.arena.map.collide(e);
      clampInterior(e, e.r * .6);
    }
    if (A.after) A.after(e, dt, this);
    this.syncEnemy(e);
  }
  syncEnemy(e) {
    const s = e.rs; s.x = e.x; s.y = e.y; s.z = e.z; s.face = e.face; s.vx = e.vx; s.vy = e.vy; s.state = e.state; s.t = e.t; s.flash = e.flash; s.alpha = e.alpha;
    s.hpPct = clamp(e.hp / e.maxHp, 0, 1); s.t2 = e.fuse || e.chargeT || e.tele || 0; s.turret = e.turret; s.recoil = e.recoil; s.tread = e.tread; s.flashT = e.flashT;
  }
  stepLobs(dt) {
    for (const L of this.lobs) {
      L.t += dt; L.vz -= L.g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.z += L.vz * dt;
      if (L.z <= 0) {
        L.dead = true;
        if (L.kind === 'tomato') {
          this.decals.push({ kind: 'splat', x: L.x, y: L.y, r: 14, t: 0, life: 6, seed: L.id });
          if (!this.quietFx) { MT.sfx('splat'); if (game.particles) game.particles.bits(L.x, L.y, 2, 10, ['#d02a3a', '#ff5a3a', '#8a1020']); }
          for (const c of this.contestants) if (c.ctl !== 'remote' && dist2(c, L) < (10 + c.r) ** 2) this.hurtContestant(c, 1, { kind: 'tomato', id: L.id, x: L.x, y: L.y });
        } else if (L.kind === 'tot') { for (let i = 0; i < 6; i++) this.fireFoe('shard', L.x, L.y, i / 6 * TAU + L.id, bulletSpd(90), { life: 1.4 }); if (!this.quietFx) MT.sfx('pop'); }
      }
    }
    E.prune(this.lobs, L => L.dead);
  }
  collide(dt) {
    const W = this;
    // player shots hit enemies, boss parts, targets
    if (!this.cosmetic) {
      this.pShots.hit(this.enemies.filter(e => !e.dead && !e.entering && !e.leap && !(e.dropT !== undefined && e.dropT < .9) && !ENEMIES[e.kind].harmless), (b, e) => { W.damageEnemy(e, b.dmg, { owner: b.data.owner, w: b.data.w, x: b.x - b.vx * .01, y: b.y - b.vy * .01 }); if (b.data.pierceLeft !== undefined && --b.data.pierceLeft < 0) b.dead = true; }, 'p');
      if (this.boss) { const parts = this.boss.hitList(); this.pShots.hit(parts, (b, q) => { W.damageBossPart(q.part, b.dmg, { owner: b.data.owner, w: b.data.w }); }, 'p'); }
      if (this.targets.length) this.pShots.hit(this.targets.filter(t => !t.dead), (b, t) => { if (TARGETS[t.kind].invulnerable) { if (!this.quietFx) MT.sfx('tink'); return; } W.damageTarget(t, b.dmg, { owner: b.data.owner, w: b.data.w }); }, 'p');
    } else {   // a client's cosmetic shots die on what they touch (a spark)
      this.pShots.hit(this.enemies.filter(e => !e.dead), (b) => { if (game.particles) game.particles.sparks(b.x, b.y, 10, 2, null, { color: '#fff0a0' }); }, 'p');
      if (this.boss) this.pShots.hit(this.boss.hitList(), () => {}, 'p');
    }
    // foe shots and contact hit the contestants this copy simulates
    const mine = this.contestants.filter(c => c.targetable && c.ctl !== 'remote' && c.ctl !== 'mirror');
    if (mine.length) {
      this.fShots.hit(mine, (b, c) => {
        if (c.invulnerable) { if (c.addons.shield > 0 && game.particles) game.particles.sparks(b.x, b.y, 10, 3, null, { color: '#2ee6ff' }); return; }
        if (b.data.kind === 'shell') this.explodeFoe(b.x, b.y, 16, 1, 'shell', b.data.id); else W.hurtContestant(c, b.dmg, { kind: b.data.kind, id: b.data.id, x: b.x, y: b.y });
      }, 'f');
      for (const b of this.fShots.list) {   // near misses: a foe shot that passes close without hitting
        if (b.dead) continue;
        for (const c of mine) { const d2 = dist2(b, c), R = c.r + 7 + b.r; if (d2 < R * R && !(b.near && b.near.has(c.cid))) { (b.near || (b.near = new Set())).add(c.cid); if (!c.invulnerable) { const g = this.ratings.near(this); if (g) this.event('nearMiss', { c }); } } }
      }
      for (const e of this.enemies) {
        const A = ENEMIES[e.kind]; if (e.dead || e.entering || e.leap || !A.contact || e.stunT > 0 || (e.dropT !== undefined && e.dropT < .9)) continue;
        for (const c of mine) if (dist2(e, c) < (e.r + c.r - 2) ** 2) {
          if (c.addons.shield > 0) { e.shieldT = (e.shieldT || 0) - dt; if (e.shieldT <= 0) { e.shieldT = .2; this.damageEnemy(e, 1, { owner: c.netId, w: 'shield', x: c.x, y: c.y }); } continue; }
          const dmg = A.contact * MT.T.contactDmg; if (dmg > 0) this.hurtContestant(c, dmg, { kind: e.kind, id: e.id, x: e.x, y: e.y });
        }
      }
    }
    // shells explode on walls; the dolly tank's shots at a wall
    for (const b of this.fShots.list) if (b.data.kind === 'shell' && b.t >= b.life - .02) this.explodeFoe(b.x, b.y, 16, 1, 'shell', b.data.id);
    // gold records: orbiting discs that cut enemies and eat small foe shots
    for (const c of this.contestants) {
      if (!(c.addons.records > 0) || !c.targetable) continue;
      for (let i = 0; i < 2; i++) {
        const a = c.recA + i * Math.PI, x = c.x + Math.cos(a) * 26, y = c.y + Math.sin(a) * 26;
        if (!this.cosmetic) for (const e of this.enemies) { if (e.dead || e.entering) continue; if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.r + 5) ** 2) { const k = e.id * 2 + i, last = c.recHit.get(k) || -9; if (this.time - last >= .15) { c.recHit.set(k, this.time); this.damageEnemy(e, 2 * MT.T.dmgMul, { owner: c.netId, w: 'records', x, y }); } } }
        for (const b of this.fShots.list) if (!b.dead && b.data.kind !== 'shell' && (b.x - x) ** 2 + (b.y - y) ** 2 < 36) { b.dead = true; if (game.particles) game.particles.sparks(b.x, b.y, 10, 2, null, { color: '#ffcc33' }); }
      }
    }
  }
  stepHazards(dt) {
    const h = this.arena.pyro();
    if (h) for (const v of h.vents) if (v.state === 'fire') {
      if (this.phase === 'WAVES') this.stats.hazards.pyro = 1;
      for (const c of this.contestants) if (c.ctl !== 'remote' && c.ctl !== 'mirror' && !v.hit.has(c.cid) && dist2(c, v) < (12 + c.r) ** 2) { v.hit.add(c.cid); this.hurtContestant(c, 1, { kind: 'pyro', x: v.x, y: v.y }); this.stats.hazards.pyro = 1; }
      if (!this.cosmetic) for (const e of this.enemies) if (!e.dead && !e.entering && dist2(e, v) < (12 + e.r) ** 2) this.damageEnemy(e, 3 * dt, { owner: null, w: 'pyro', beam: true });
    }
    if (this.arena.hazards.some(q => q.kind === 'conveyor')) for (const c of this.contestants) if (this.arena.beltAt(c.x, c.y)) this.stats.hazards.conveyor = 1;
    for (const d of this.decals) if (d.kind === 'splat') for (const c of this.contestants) if (dist2(c, d) < d.r * d.r) c.slowT = .1;
  }
  // ---------------------------------------------------------------- the room's phases
  setPhase(p) { this.phase = p; this.phaseT = 0; this.event('phase', { p }); }
  /** begin the room: contestants walk in from the entry door */
  begin() {
    this.started = true;
    const room = this.cosmetic ? {} : (this.room || {});
    for (const [kind, cx, cy] of room.place || []) { const [x, y] = cellW(cx, cy); const e = this.spawnEnemy(kind, x, y, { inside: true, quiet: true }); if (e && kind === 'mime') { e.placed = true; this.mimesPlaced++; } }
    if (room.crates) { const keyIdx = room.key && room.key.rule === 'crate' ? Math.floor(RNG.spawn() * room.crates.length) : -1; room.crates.forEach(([cx, cy], i) => { const [x, y] = cellW(cx, cy); this.addTarget('crate', x, y, { key: i === keyIdx }); }); }
    if (room.locks) for (const [cx, cy] of room.locks) { const [x] = cellW(cx, cy); this.addTarget('lock', x, 26); }
    if (room.key && room.key.rule === 'survive') { this.cage = { x: AR.CX, y: AR.CY, opened: false }; this.arena.cage = { x: AR.CX, y: AR.CY, h: 1 }; this.addTarget('cage', AR.CX, AR.CY); this.addPickup(MT.makePickup('key', AR.CX, AR.CY, { placed: true, locked: () => this.cage && !this.cage.opened })); this.keyDropped = true; }
    if (room.key && room.key.rule === 'belt') { const [x, y] = cellW(room.key.at[0], room.key.at[1]); this.addPickup(MT.makePickup('key', x, y, { placed: true, belt: true })); this.keyDropped = true; }
    if (room.key && room.key.rule === 'place') { const [x, y] = cellW(room.key.at[0], room.key.at[1]); this.addPickup(MT.makePickup('key', x, y, { placed: true })); this.keyDropped = true; }
    if (this.session && room.key && !['mimes', 'carrier', 'crate'].includes(room.key.rule)) { /* keys still appear in the lightning round */ }
    this.arena.entry(this.entry);
    const n = this.contestants.length;
    this.contestants.forEach((c, i) => { if (c.state === 'out') return; c.walkIn(this.entry, i, n); });
    this.setPhase('ENTER');
  }
  stepPhase(dt) {
    const room = this.room || {};
    switch (this.phase) {
      case 'ENTER': if (this.phaseT >= 1.2) { this.setPhase(room.type === 'boss' ? 'BOSS_INTRO' : room.type === 'bonus' ? 'BONUS' : 'INTRO'); if (room.type === 'boss') MT.BOSSES[room.boss].enter(this); if (room.type === 'bonus') this.beginBonus(); } break;
      case 'INTRO': if (this.phaseT >= (this.attract ? .2 : 1.6)) { this.setPhase('WAVES'); this.script = new Co(MT.roomScript(this, room)); } break;
      case 'WAVES':
        if (this.wavesSpawned && this.countedAlive() === 0 && this.arena.pendingSpawns() === 0 && this.pendingDelayed() === 0) this.roomClear();
        break;
      case 'BOSS_INTRO': if (this.boss && this.boss.introDone) this.setPhase('BOSS'); break;
      case 'BOSS': if (this.boss && this.boss.dead) { this.setPhase('BOSS_DEATH'); } break;
      case 'BOSS_DEATH': if (this.phaseT >= 3) this.roomClear(); break;
      case 'BONUS': this.stepBonus(dt); break;
      case 'CLEAR': if (this.phaseT >= 1.6) { if (room.type === 'boss' || room.type === 'bonus' || room.final) { this.outcome = { done: true }; this.setPhase('DONE'); } else this.openExits(); } break;
      case 'EXIT': this.stepExit(dt); break;
    }
  }
  roomClear() {
    const room = this.room || {};
    this.clearT = this.time;
    const fast = room.par && this.time < room.par + 4;
    for (const c of this.contestants) if (c.alive) this.credit(c, 1000 * (room.ep || 1) * (fast ? 1.5 : 1), {});
    for (const b of this.fShots.list) b.life = Math.min(b.life, b.t + .3);
    this.lobs.length = 0;
    if (room.key && room.key.rule === 'final' && !this.session) { this.dropKey(AR.CX, AR.CY); this.event('keyRise', {}); }
    this.event('clear', { fast, room: room.id });
    this.setPhase('CLEAR');
  }
  openExits() {
    const room = this.room || {};
    this.setPhase('EXIT'); this.hurry = 0;
    const exits = room.exits || {};
    for (const d in exits) { const to = MT.ROOMS[exits[d]]; if (!to) continue; this.arena.setExit(d, { name: room.lightning ? 'NEXT' : to.name, icon: MT.roomIcon(to), key: !!(to.key && !room.lightning && !(this.run.keyRooms || []).includes(to.id)), room: exits[d] }); }
    this.event('exits', {});
  }
  stepExit(dt) {
    this.hurry += dt;
    if (this.hurry > 25 && Math.floor((this.hurry - dt - 25) / 6) !== Math.floor((this.hurry - 25) / 6)) { this.event('hurry', {}); const ds = DOOR_IDS.filter(d => !this.arena.doors[d].isExit); for (let i = 0; i < 4; i++) this.arena.queueSpawn(ds[i % ds.length], 'clapbot', 1, .2); }
    if (!this.exitPick) {
      for (const c of this.contestants) { if (!c.targetable) continue; const d = this.arena.inExit(c); if (d) { this.chooseExit(d, c); break; } }
    } else {
      this.exitPick.t += dt;
      if (this.exitPick.t >= .8 && !this.outcome) { this.outcome = { exit: this.exitPick.door, to: this.arena.doors[this.exitPick.door].target }; this.setPhase('DONE'); }
    }
  }
  chooseExit(d, c) {
    if (this.exitPick || !this.arena.doors[d] || this.arena.doors[d].state !== 'exit') return false;
    this.exitPick = { door: d, t: 0, by: c && c.netId };
    for (const q of this.contestants) if (q.alive) { q.state = 'exit'; q.exitTo = d; }
    this.event('exitPicked', { door: d, to: this.arena.doors[d].target });
    return true;
  }
  // ---------------------------------------------------------------- the green room
  beginBonus() { this.bonusT = 0; this.statueUp = false; for (let i = 0; i < 6; i++) { const [x, y] = this.freePoint(30); this.spawnEnemy('paparazzo', x, y, { inside: true, quiet: true }); } this.event('bonusStart', {}); }
  stepBonus(dt) {
    this.bonusT += dt;
    this._rain = (this._rain || 0) - dt;
    if (this.bonusT < 40 && !this.bonusDone) {
      while (this._rain <= 0) { this._rain += .25; const [x, y] = this.freePoint(0); this.addPickup(MT.makePickup(RNG.drops() < .15 ? 'prize' : rpick(RNG.drops, ['bill', 'stack', 'gold', 'case', 'bill', 'stack']), x, y, { z: 80, vz: -20 })); }
      this._snap = (this._snap || 3) - dt; if (this._snap <= 0) { this._snap = 3; const p = this.enemies.filter(e => e.kind === 'paparazzo'); if (p.length) { const e = p[Math.floor(RNG.fx() * p.length)]; e.flashT = .2; this.event('snap', { x: e.x, y: e.y }); } }
    }
    if (this.bonusT >= 30 && !this.statueUp) { this.statueUp = true; this.addPickup(MT.makePickup('statue', AR.CX, AR.CY, { placed: true, rise: 0 })); this.event('statueUp', {}); }
    if (this.bonusDone || this.bonusT >= 40) { if (!this.bonusEnd) { this.bonusEnd = true; this.event('bonusEnd', {}); this.delayed(2, () => { this.outcome = { done: true }; this.setPhase('DONE'); }); } }
  }
  // ---------------------------------------------------------------- drawing (reads render state only)
  draw(r, t) {
    this.arena.draw(r, t, this);
    for (const d of this.decals) { const a = clamp(1 - d.t / d.life, 0, 1); if (d.kind === 'confetti') r.decal(g => { const [sx, sy] = r.w(d.x, d.y, 0); if (a > .5 || Math.floor(d.t * 8) % 2) px.rect(g, Math.round(sx), Math.round(sy), 2, 1, d.c); }); else if (d.kind === 'scorch') r.decal(() => r.groundDisc(d.x, d.y, d.r, '#140a14', .6 * a)); }
    for (const d of this.decals) if (d.kind === 'splat') { const a = clamp(1 - d.t / d.life, 0, 1); r.decal(() => { r.groundDisc(d.x, d.y, d.r, '#8a1020', .75 * a); r.groundDisc(d.x + 3, d.y - 2, d.r * .55, '#d02a3a', .8 * a); r.groundDisc(d.x - 5, d.y + 3, 3, '#ff5a3a', .8 * a); }); }
    for (const tg of this.targets) if (!tg.dead && TARGETS[tg.kind].shape) { r.shape(TARGETS[tg.kind].shape, tg.x, tg.y, 0, { facing: Math.PI / 2 }); if (tg.flash > 0) { tg.flash -= 1 / 60; } }
    MT.drawPickups(r, this, t);
    for (const c of this.contestants) c.draw(r, t, this);
    for (const e of this.enemies) { if (e.dead) continue; if (e.dropT !== undefined && e.dropT < .6) { r.decal(() => r.groundDisc(e.rs.x, e.rs.y, 6 + e.dropT * 6, '#000000', .5)); continue; } ENEMIES[e.kind].draw(r, e, t, this); }
    if (this.boss) this.boss.draw(r, t, this);
    MT.drawProjectiles(r, this, t);
    this.pShots.draw(r);
    this.drawFoeShots(r, t);
    for (const L of this.lobs) {
      r.decal(() => { r.groundRing(L.tx, L.ty, L.kind === 'tomato' ? 10 : 8, '#ff3344', .9); r.groundDisc(L.x, L.y, 3, '#000000', .4); });
      r.queue(L.x, L.y, L.z, g => { const [sx, sy] = r.w(L.x, L.y, L.z); if (L.kind === 'tomato') { px.disc(g, sx, sy, 3.5, '#5a0810'); px.disc(g, sx, sy, 2.8, '#e8302a'); px.dot(g, sx - 1, sy - 1, '#ffb0a0'); px.dot(g, sx, sy - 3, '#3a9a3a'); } else { px.rect(g, sx - 3, sy - 2, 6, 4, '#5a3a10'); px.rect(g, sx - 2, sy - 2, 4, 3, '#d8a040'); } }, { bias: 1 });
    }
  }
  drawFoeShots(r, t) {
    for (const b of this.fShots.list) {
      if (!r.visible(b.x, b.y, b.z, 12, 12, 12)) continue;
      const F = FOE[b.data.kind] || FOE.orb;
      r.queue(b.x, b.y, b.z, g => {
        let [x, y] = r.w(b.x, b.y, b.z); if (F.jitter) { x += (Math.random() - .5) * 2; y += (Math.random() - .5) * 2; }
        const rad = Math.max(1.5, b.r * r.view.scale);
        if (F.long) { const [tx, ty] = r.w(b.x - b.vx * .06, b.y - b.vy * .06, b.z); px.line(g, tx, ty, x, y, '#5a2a08', Math.round(rad * 2 + 1)); px.line(g, tx, ty, x, y, F.color, Math.round(rad * 2 - 1)); px.line(g, tx, ty, x, y, F.core, 1); return; }
        if (F.card) { const s = Math.sin(t * 16 + b.data.id); px.rect(g, x - 3 * Math.abs(s) - 1, y - 4, 6 * Math.abs(s) + 2, 8, '#140a24'); px.rect(g, x - 3 * Math.abs(s), y - 3, 6 * Math.abs(s), 6, F.color); px.dot(g, x, y, F.core); return; }
        px.disc(g, x, y, rad + 1, '#140a24'); px.disc(g, x, y, rad, F.color); px.disc(g, x - .5, y - .5, Math.max(.8, rad * .45), F.core);
      }, { bias: .3, emissive: true });
    }
  }
}
MT.World = World;

// ---- 19-react.js ----
// ---- reactions: gameplay emits events; this table turns them into host lines, crowd noise, stings and banners ----
// The line queue (priorities, the quip rate limit, the chatter setting) and the lower third live here too.
const PORTRAIT = {};
function portraitRig(id) {
  if (PORTRAIT[id]) return PORTRAIT[id];
  if (id === 'LANCE') PORTRAIT[id] = makeLance(1.3); else if (id === 'PENNY') PORTRAIT[id] = makePenny();
  else if (/^C\d$/.test(id)) { const s = +id[1] - 1, pr = MT.run && MT.run.players && MT.run.players[s]; PORTRAIT[id] = makeContestantRig(s, pr ? pr.look : s); }
  return PORTRAIT[id] || null;
}
MT.portraitRig = portraitRig;
function drawSpeakerPortrait(g, id, x, y, size, t) {
  const rig = portraitRig(id);
  px.rect(g, x - 1, y - 1, size + 2, size + 2, '#0c0618'); px.rect(g, x, y, size, size, '#2a1446');
  if (rig) { rig.drawPortrait(g, x, y, size, { zoom: size / 14, turn: .4, bg: '#2a1446', frame: false }); return; }
  const cx = x + size / 2, cy = y + size / 2;
  if (id === 'ANNC') { px.disc(g, cx, cy - 2, size * .22, '#c8d0e0'); px.rect(g, cx - 1, cy + 2, 2, size * .28, '#8a90a0'); for (let k = 0; k < 3; k++) px.line(g, cx - size * .16, cy - 6 + k * 3, cx + size * .16, cy - 6 + k * 3, '#5a5f70'); }
  else if (id === 'MASHY') { px.ell(g, cx, cy + 2, size * .4, size * .34, '#c8a060'); for (const sd of [-1, 1]) { px.disc(g, cx + sd * size * .14, cy - 2, size * .1, '#ffffff'); px.disc(g, cx + sd * size * .14 + Math.sin(t * 8) , cy - 1, size * .05, '#140a24'); } px.ell(g, cx, cy + size * .16, size * .16, 2 + Math.abs(Math.sin(t * 12)) * 3, '#3a0a10'); }
  else if (id === 'NETWORK') { px.ell(g, cx, cy, size * .4, size * .24, '#fff7e8'); px.disc(g, cx, cy, size * .14, '#2ee6ff'); px.disc(g, cx, cy, size * .07, '#140a24'); for (let k = 0; k < 6; k++) px.dot(g, x + Math.random() * size, y + Math.random() * size, '#ffffff'); }
  else if (id === 'SPONSOR') { px.rect(g, cx - size * .25, cy - size * .3, size * .5, size * .6, '#ff9a3c'); px.rect(g, cx - size * .2, cy - size * .2, size * .4, size * .18, '#fff7e8'); E.font.text(g, 'K', cx, cy - size * .2, '#d02a3a', { align: 'center', outline: false }); }
}
MT.drawSpeakerPortrait = drawSpeakerPortrait;
// ------------------------------------------------------------------------------------------------ the line queue
const LINES = MT.lines = { queue: [], current: null, lastQuip: -99, said: [], subtitles: true };
/** say a line: { who, text, pri (3 story, 2 important, 1 quip), hint } */
LINES.say = (who, text, pri = 1, o = {}) => {
  const chat = game && game.settings ? game.settings.chatter : 'Normal';
  if (MT.cheats.muteHost && pri < 3) return;
  if (chat === 'Off' && pri < 3) return; if (chat === 'Less' && pri < 2) return;
  const now = game ? game.real : 0;
  if (pri === 1) { if (now - LINES.lastQuip < 6 || LINES.current || LINES.queue.length) return; LINES.lastQuip = now; }
  const S = MT.TEXT.speakers[who] || MT.TEXT.speakers.LANCE;
  const L = { who, name: S.name, voice: S.voice, color: S.color, text, pri, hint: o.hint || null, t: 0, typed: 0, dur: 0, done: false, onDone: o.onDone };
  if (pri >= 3) { LINES.queue.push(L); } else { const i = LINES.queue.findIndex(q => q.pri < pri); if (i < 0) LINES.queue.push(L); else LINES.queue.splice(i, 0, L); }
  if (LINES.current && LINES.current.pri < pri && pri >= 2) LINES.current.t = Math.max(LINES.current.t, LINES.current.dur + 9);
  LINES.said.push(text); if (LINES.said.length > 200) LINES.said.shift();
  return L;
};
LINES.seq = (id, vars = {}, pri = 3) => { const seq = MT.TEXT.seq[id]; if (!seq) return null; let last = null; for (const [who, text] of seq) last = LINES.say(who, fill(text, vars), pri); return last; };
LINES.busy = () => !!LINES.current || LINES.queue.length > 0;
LINES.clear = () => { LINES.queue.length = 0; LINES.current = null; };
LINES.skip = () => { const c = LINES.current; if (!c) return; if (c.typed < c.text.length) c.typed = c.text.length, c.t = c.dur; else c.t = c.dur + 99; };
LINES.portrait = (g, x, y, s) => { if (LINES.current) drawSpeakerPortrait(g, LINES.current.who, x, y, s, game.real); };
/** each step (real time: lines run through hit-stop) */
LINES.step = dt => {
  let c = LINES.current;
  if (!c && LINES.queue.length) {
    c = LINES.current = LINES.queue.shift();
    c.dur = MT.babble.say(c.text, c.voice); c.hold = 1.1 + Math.min(1.5, c.text.length / 80);
    if (MT.music && game) game.audio.duck(true);
  }
  if (!c) { if (game && !game.paused) game.audio.duck(false); return; }
  c.t += dt; c.typed = Math.min(c.text.length, Math.floor(c.text.length * c.t / Math.max(.3, c.dur)));
  const rig = portraitRig(c.who); if (rig && !MT.cfg.skipRigs) rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: c.typed < c.text.length ? (Math.floor(c.t * 10) % 2 ? 'shout' : 'smile') : 'smile' });
  if (c.t >= c.dur + c.hold) { LINES.current = null; if (c.onDone) c.onDone(); }
};
Object.defineProperty(LINES, 'currentLine', { get: () => LINES.current });
// ------------------------------------------------------------------------------------------------ banners
const BANNERS = MT.banners = { list: [] };
BANNERS.show = (text, o = {}) => { BANNERS.list.push({ text, sub: o.sub || '', color: o.color || '#ffcc33', t: 0, dur: o.dur || 2, icon: o.icon || null, big: o.big !== false }); if (BANNERS.list.length > 3) BANNERS.list.shift(); MT.lastBanner = text; };
BANNERS.step = dt => { for (const b of BANNERS.list) b.t += dt; E.prune(BANNERS.list, b => b.t >= b.dur); };
// tutorial prompts (once per run, in each player's glyphs)
const TUT = MT.tut = { cur: null, queue: [] };
TUT.show = (key, actions) => { const run = MT.run; if (!run || run.mode === 'attract' || run.mode === 'session') return; run.tut = run.tut || {}; if (run.tut[key]) return; run.tut[key] = true; TUT.queue.push({ key, text: MT.TEXT.tutorial[key], actions, t: 0 }); };
TUT.step = dt => { if (!TUT.cur && TUT.queue.length) TUT.cur = TUT.queue.shift(); if (TUT.cur) { TUT.cur.t += dt; if (TUT.cur.t > 4) TUT.cur = null; } };
// ------------------------------------------------------------------------------------------------ the reaction table
const pool = id => { const P = MT.TEXT.pools[id]; LINES._bag = LINES._bag || {}; let b = LINES._bag[id]; if (!b || !b.length) b = LINES._bag[id] = rshuffle(RNG.fx, P.map((_, i) => i)); return P[b.shift()]; };
MT.pool = pool;
const crowd = (k, i) => { MT.babble.crowd(k, i); if (k === 'cheer' || k === 'applause') STUDIO.cheerT = 1.2; };
const REACT = MT.react = {
  kill(w, d) { if (w.decals.length < 220) { const cols = (MT.PALETTE[d.kind] || ['#ffcc33']).concat(['#ff2e88', '#2ee6ff']); for (let i = 0; i < (d.big ? 10 : 4); i++) w.decals.push({ kind: 'confetti', x: d.x + (Math.random() - .5) * 26, y: d.y + (Math.random() - .5) * 20, c: cols[i % cols.length], t: 0, life: 8 }); if (d.big) w.decals.push({ kind: 'scorch', x: d.x, y: d.y, r: 14, t: 0, life: 10 }); }
    if (!w.quietFx) { MT.sfx('confetti'); if (game.particles) game.particles.bits(d.x, d.y, 8, d.big ? 30 : 12, (MT.PALETTE[d.kind] || ['#ffcc33', '#ff2e88']).concat(['#ff2e88', '#2ee6ff'])); if (d.big) { if (game.particles) game.particles.explosion(d.x, d.y, 8, 1, { shake: 0, freeze: false }); w.shake(4); if (!w.session) game.freeze(.03); } } if (d.big) crowd('cheer', .7); },
  multikill(w, d) { LINES.say('LANCE', pool('multi'), 1); crowd('cheer', 1); },
  hurt(w, d) { MT.sfx('buzzer'); crowd('ooh', .5); if (d.c.hp === 1 && maxHpNow() > 1) LINES.say('LANCE', pool('lowHp'), 1); else LINES.say('LANCE', pool('hurt'), 1); },
  died(w, d) { MT.sfx('wah'); crowd('laugh', .6); BANNERS.show(MT.TEXT.ui.mashed, { color: SLOT_COLORS[d.c.slot], sub: d.c.pr.name }); LINES.say('LANCE', fill(pool('death'), { NAME: d.c.pr.name }), 2); },
  showboat(w, d) { crowd('cheer', clamp(d.gain / 30, .3, 1)); if (game.particles) game.particles.text(d.c.x, d.c.y, 30, fill(MT.TEXT.ui.style, { N: d.gain }), '#ff2e88', { scale: 1, bounce: true }); LINES.say('LANCE', pool('showboat'), 1); },
  boatFail(w, d) { crowd('laugh', .4); },
  prime(w) { BANNERS.show(MT.TEXT.ui.primeTime, { color: '#ff2e88', sub: '×5 CASH', dur: 2.5 }); MT.music.sting('prime'); MT.music.layer('prime', true); crowd('cheer', 1); crowd('applause', 1); STUDIO.wave = true; LINES.say('LANCE', pool('prime'), 2); if (game.particles) for (const x of [-30, 398]) for (let i = 0; i < 20; i++) game.particles.add({ kind: 'bit', x, y: 120 + (Math.random() - .5) * 80, z: 20, vx: (x < 0 ? 1 : -1) * (60 + Math.random() * 80), vy: (Math.random() - .5) * 60, vz: 120 + Math.random() * 60, g: 300, max: 1.5, color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'][i % 4], size: 2 }); },
  primeEnd(w) { MT.music.layer('prime', false); STUDIO.wave = false; },
  stunt(w) { BANNERS.show(MT.TEXT.ui.losingViewers, { color: '#ff3344' }); LINES.say('LANCE', pool('stunt'), 2); MT.sfx('alarm'); },
  cash(w, d) { MT.sfx('kaching', { vol: .6 }); },
  powerup(w, d) { MT.sfx('powerup'); const W = WEAPONS[d.w]; if (W && game.particles) game.particles.text(d.c.x, d.c.y, 30, W.name, W.color || '#ffffff', { scale: 1 }); },
  expire(w, d) { MT.sfx('expire'); if (d.what === 'weapon' && game.particles) game.particles.text(d.c.x, d.c.y, 30, MT.TEXT.ui.backToBasics, '#c8d0e0', {}); },
  prize(w, d) { MT.music.sting('prize'); BANNERS.show(fill(MT.TEXT.ui.youWon, { PRIZE: d.prize.name }), { sub: money(d.v), icon: d.prize.icon, color: '#ff8ad8', dur: 2.5 }); LINES.say('PENNY', fill(pool('prizeP'), { PRIZE: d.prize.name }), 2); crowd('cheer', .6); },
  key(w, d) { MT.music.sting('key'); MT.sfx('chime'); if (d.session) { BANNERS.show('GOLDEN KEY! +$10,000', { color: '#ffcc33' }); return; } BANNERS.show(fill(MT.TEXT.ui.goldenKey, { N: d.n }), { color: '#ffcc33', icon: 'key' }); if (!w.run.keyLine) { w.run.keyLine = true; LINES.say('LANCE', MT.TEXT.pools.key[0], 2); } else LINES.say('LANCE', MT.TEXT.pools.key[1], 1); crowd('applause', .7); },
  keyDrop(w) { MT.sfx('chime'); },
  extraLife(w, d) { MT.music.sting('oneup'); BANNERS.show(MT.TEXT.ui.encore, { color: '#5fe0a0', sub: d.c.pr.name }); LINES.say('LANCE', pool('extraLife'), 2); },
  clear(w, d) { MT.music.sting('clear'); BANNERS.show(MT.TEXT.ui.roomClear, { color: '#ffcc33', sub: d.fast ? 'SPEED BONUS!' : '' }); crowd('applause', .9); crowd('cheer', .8); LINES.say('LANCE', pool('clear'), 2); },
  exits(w) { TUT.show('exit', [['move', '']]); },
  hurry(w) { BANNERS.show(MT.TEXT.ui.hurry, { color: '#ff3344' }); LINES.say('LANCE', pool('hurry'), 2); },
  exitPicked(w) { MT.sfx('bell'); },
  door(w, d) { if (w.quietFx) return; if (d.kind === 'open') { MT.sfx('klaxon', { vol: .5 }); MT.sfx('rollup', { vol: .5 }); } else { MT.sfx('slam', { vol: .6 }); if (game.particles) { const D = DOORS[d.id]; game.particles.dust(D.x + D.nx * 10, D.y + D.ny * 10, 0, 6); } } },
  bomb(w) { crowd('cheer', 1); },
  blast(w, d) { if (game.particles) game.particles.ring(d.x, d.y, 2, d.r, '#ff9a3c', .3); },
  slide(w, d) { },
  respawn(w, d) { crowd('applause', .4); },
  out(w, d) { BANNERS.show(d.c.pr.name + ' IS OUT', { color: '#ff3344' }); },
  partDown(w, d) { crowd('cheer', 1); },
  bossIntro(w, d) { MT.music.play('bossShowdown', { fade: .4 }); MT.music.layer('phase2', false); },
  bossDead(w, d) { if (d.boss === 'finale') PLAY.staticT = 2.2; MT.music.sting('bossdown'); crowd('cheer', 1); crowd('applause', 1); BANNERS.show(d.boss === 'finale' ? MT.TEXT.ui.signalLost : 'SHOW STOPPED!', { color: '#ffcc33', dur: 3 }); },
  line(w, d) { LINES.seq(d.id, {}, 3); },
  wheelStop(w, d) { BANNERS.show(d.name + '!', { color: SEG_COL[d.seg] === '#141018' ? '#ff3344' : SEG_COL[d.seg], dur: 1.6 }); LINES.say('LANCE', d.name + '!', 2); },
  bankrupt(w) { MT.music.sting('bankrupt'); BANNERS.show(MT.TEXT.ui.bankrupt, { color: '#ff3344' }); crowd('boo', .8); },
  jackpot(w) { crowd('cheer', 1); LINES.say('LANCE', pool('jackpot'), 2); },
  spinAgain(w) { LINES.say('LANCE', pool('spinAgain'), 2); },
  segDown(w, d) { crowd('cheer', .7); },
  pattern(w, d) { BANNERS.show(d.name + '!', { color: '#c08aff', dur: 1.4, big: false }); },
  commercial(w) { LINES.seq('commercial'); BANNERS.show(MT.TEXT.ui.commercial, { color: '#ff9a3c', dur: 2.5 }); MT.music.play('commercial', { fade: .3 }); },
  backFromBreak(w) { LINES.seq('backFromBreak'); MT.music.play('bossShowdown', { fade: .3 }); },
  lanceDown(w) { LINES.seq('lanceDown'); crowd('ooh', 1); },
  robotReveal(w) { LINES.seq('robotReveal'); BANNERS.show(MT.TEXT.ui.robot, { color: '#2ee6ff', dur: 3 }); crowd('ooh', 1); },
  networkReveal(w) { LINES.seq('networkReveal'); MT.sfx('static'); },
  bonusStart(w) { LINES.seq('greenRoom'); MT.music.play('recap'); },
  statueUp(w) { LINES.seq('statueUp'); MT.music.sting('prime'); },
  statue(w, d) { BANNERS.show('YOU WON: ' + MT.TEXT.grandPrize.name + '!', { sub: money(d.v), color: '#ffcc33', dur: 3, icon: 'network' }); crowd('cheer', 1); crowd('applause', 1); },
  snap(w) { MT.sfx('shutter'); if (!w.quietFx) game.flash('#ffffff', .1, .6); },
  bruteCrash(w) { crowd('ooh', .5); },
  cage(w) { MT.music.sting('prize'); BANNERS.show('THE CAGE IS OPEN!', { color: '#ffcc33' }); },
  vault(w) { MT.music.sting('prize'); BANNERS.show('THE VAULT IS OPEN!', { color: '#ffcc33' }); crowd('cheer', .9); },
  targetBroken(w, d) { MT.sfx('crash', { vol: .6 }); if (game.particles) game.particles.bits(d.x, d.y, 6, 14, d.kind === 'crate' ? ['#c87830', '#ffcc33', '#8a5a20'] : ['#c8d0e0', '#ff3344']); },
  spawn(w, d) {
    const k = d.kind === 'discoBig' || d.kind === 'discoSmall' ? 'disco' : d.kind === 'hecklerKing' ? 'heckler' : d.kind, I = MT.TEXT.intros[k];
    const run = w.run; if (!I || !run || run.mode === 'attract' || w.session) return; run.seen = run.seen || {}; if (run.seen[k]) return; run.seen[k] = true;
    LINES.say('LANCE', I[0], 2, { hint: I[1] });
  },
  wave(w, d) {
    const room = w.room || {}; if (!room.tutorial) return;
    if (d.n === 1) { TUT.show('move', [['move', '']]); TUT.show('aim', [['aim', '']]); }
    if (d.n === 3) TUT.show('showboat', [['showboat', '']]);
    if (d.n === 4) TUT.show('slide', [['slide', '']]);
  },
  phase(w, d) { if (d.p === 'INTRO') { MT.music.sting('mash'); LINES.say('LANCE', pool('roomStart'), 2); } },
};
/** run every event the world raised this step through the table (and count it for tests) */
MT.react.drain = world => {
  const evs = world.events; world.events = [];
  for (const ev of evs) {
    world.ring.push([ev.seq, ev.name, ev.data]); if (world.ring.length > 60) world.ring.shift();
    MT.emit('ev:' + ev.name, ev.data); MT.log.push(ev.name);
    if (MT.log.length > 2000) MT.log.splice(0, 1000);
    const fn = REACT[ev.name]; if (fn) try { fn(world, ev.data); } catch (e) { if (game) game.fail('reaction ' + ev.name, e); }
    if (ev.name === 'powerup' && world.room && world.room.tutorial) TUT.show('capsule', [['move', '']]);
  }
  if (world.enemies.length >= 20 && world.room && world.room.tutorial) TUT.show('bomb', [['bomb', '']]);
};
/** cosmetic studio state each step: crowd excitement follows the ratings */
MT.studioStep = (dt, world) => {
  const R = world ? world.ratings.R / 100 : .3; STUDIO.excite += (R - STUDIO.excite) * Math.min(1, dt * 2);
  STUDIO.cheerT = Math.max(0, STUDIO.cheerT - dt);
  MT.art.stepFireworks(dt, world ? world.arena.set : SETS.studio);
};

// ---- 20-content-episodes.js ----
// ---- content: episodes, their 3x3 maps, every room (waves as data), the Lightning Round ----
// A new room is one entry in MT.ROOMS; a new episode is one entry in MT.EPISODES. Wave format (16-waves.js):
// { at, left, spawn: [[door, kind, n, gap]], items: [[pickup, where]], script }; doors N E S W all sides ends audience drop [cx, cy]
const w = (at, left, spawn, items, extra) => Object.assign({ at, left, spawn }, items ? { items } : {}, extra || {});
const ROOMS = MT.ROOMS = {
  // ------------------------------------------------------------------ EPISODE 1: THE PILOT (Studio 9)
  '1-1': { name: 'OPENING NUMBER', ep: 1, type: 'start', cell: [1, 2], exits: { W: '1-2', N: '1-5', E: '1-3' }, par: 70, tutorial: true, intros: ['goon', 'clapbot', 'popper'],
    waves: [w(2, undefined, [['N', 'goon', 6, .35], ['S', 'goon', 6, .35]]), w(10, 2, [['E', 'goon', 8], ['W', 'goon', 8]]), w(8, 4, [['all', 'goon', 3]], [['spread', 'center']]), w(8, 4, [['N', 'clapbot', 6], ['S', 'clapbot', 6]]), w(9, 3, [['all', 'goon', 5], ['N', 'popper', 2]])] },
  '1-2': { name: 'MIME FIELD', ep: 1, type: 'battle', cell: [0, 2], exits: { N: '1-4' }, par: 60, key: { rule: 'mimes' },
    place: [[3, 3], [7, 2], [13, 2], [17, 3], [5, 6], [15, 6], [3, 9], [7, 10], [13, 10], [17, 9]].map(([x, y]) => ['mime', x, y]),
    waves: [w(2, undefined, [['S', 'goon', 8]]), w(8, 3, [['N', 'popper', 2], ['E', 'goon', 8]]), w(10, 3, [['W', 'goon', 10]], [['rockets', 'drop']]), w(8, 4, [['all', 'clapbot', 3]]), w(8, 3, [['N', 'popper', 3], ['S', 'popper', 3], ['E', 'goon', 6]]), w(9, 3, [['E', 'goon', 8], ['W', 'clapbot', 6]])] },
  '1-3': { name: 'CLAP TRAP', ep: 1, type: 'battle', cell: [2, 2], exits: { N: '1-6' }, par: 65,
    waves: [w(2, undefined, [['E', 'clapbot', 8], ['W', 'clapbot', 8]]), w(8, 3, [['N', 'goon', 12]]), w(8, 4, [['all', 'clapbot', 5]], [['records', 'drop']]), w(8, 4, [['S', 'popper', 4], ['E', 'goon', 8]]), w(8, 3, [['all', 'clapbot', 6], ['N', 'goon', 6]])] },
  '1-4': { name: 'KEY GAUNTLET', ep: 1, type: 'key', cell: [0, 1], exits: { E: '1-5' }, par: 50, key: { rule: 'survive' },
    survive: { time: 40, cage: 20, last: [['all', 'goon', 4]] }, items: [[6, 'shield', 'drop'], [18, 'bomb', 'drop'], [28, 'life', 'drop']] },
  '1-5': { name: 'WEAPONS LOCKER', ep: 1, type: 'armory', cell: [1, 1], exits: { N: '1-B' }, par: 80, items: [[1.5, 'spread', [5, 6]], [1.5, 'rockets', [15, 6]], [1.5, 'records', [10, 3]]],
    waves: [w(3, undefined, [['all', 'goon', 8]]), w(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), w(8, 5, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), w(8, 5, [['all', 'goon', 8]], [['speed', 'drop']]), w(10, 4, [['N', 'goon', 12], ['S', 'goon', 12], ['sides', 'popper', 2]])] },
  '1-6': { name: 'CASH COW CORRAL', ep: 1, type: 'cash', cell: [2, 1], exits: { W: '1-5' }, par: 60, key: { rule: 'crate' }, cashRoom: true, crates: [[4, 3], [10, 2], [16, 3], [4, 9], [10, 10], [16, 9]],
    waves: [w(2, undefined, [['N', 'goon', 10]]), w(8, 3, [['E', 'goon', 10], ['W', 'goon', 10]]), w(8, 4, [['all', 'clapbot', 4]]), w(8, 4, [['S', 'popper', 3], ['N', 'popper', 3], ['all', 'goon', 3]]), w(9, 2, [['all', 'goon', 5], ['ends', 'popper', 2]])] },
  '1-B': { name: "MASHY'S BIG DEBUT", ep: 1, type: 'boss', cell: [1, 0], exits: {}, boss: 'mashy' },
  // ------------------------------------------------------------------ EPISODE 2: SWEEPS WEEK (the MegaMart Prize Warehouse)
  '2-1': { name: 'AISLE 9 RUMBLE', ep: 2, type: 'start', cell: [1, 2], exits: { W: '2-2', N: '2-5', E: '2-3' }, par: 70, intros: ['disco'],
    waves: [w(2, undefined, [['N', 'goon', 10], ['S', 'goon', 10]]), w(8, 4, [['E', 'disco', 1], ['W', 'disco', 1]]), w(10, 3, [['all', 'goon', 6]], [['popcorn', 'center']]), w(8, 4, [['N', 'popper', 3], ['S', 'clapbot', 10]]), w(8, 4, [['E', 'disco', 2], ['W', 'goon', 12]])] },
  '2-2': { name: 'CONVEYOR CHAOS', ep: 2, type: 'hazard', cell: [0, 2], exits: { N: '2-4' }, par: 65, key: { rule: 'belt', at: [19, 5] }, hazards: [{ kind: 'conveyor', rows: [[2, 3], [5, 6], [9, 10]], dirs: [1, -1, 1] }],
    waves: [w(2, undefined, [['E', 'goon', 12]]), w(8, 4, [['W', 'clapbot', 10]]), w(8, 4, [['N', 'popper', 4], ['S', 'popper', 4]]), w(8, 4, [['all', 'goon', 8]], [['laser', 'drop']]), w(8, 3, [['E', 'disco', 2], ['W', 'disco', 1]])] },
  '2-3': { name: 'DISCO DEPOT', ep: 2, type: 'battle', cell: [2, 2], exits: { N: '2-6' }, par: 70,
    waves: [w(2, undefined, [['N', 'discoBig', 2]]), w(10, 2, [['E', 'goon', 10], ['W', 'goon', 10]]), w(8, 4, [['S', 'disco', 2]], [['laser', 'drop']]), w(8, 4, [['all', 'clapbot', 5]]), w(9, 3, [['N', 'discoBig', 2], ['S', 'goon', 8]])] },
  '2-4': { name: 'TOMATO TERRITORY', ep: 2, type: 'battle', cell: [0, 1], exits: { E: '2-5' }, par: 70, key: { rule: 'carrier' }, intros: ['heckler'],
    waves: [w(2, undefined, [['audience', 'heckler', 4]]), w(8, 2, [['N', 'goon', 12]]), w(8, 4, [['audience', 'heckler', 6]]), w(8, 4, [['S', 'popper', 4], ['E', 'clapbot', 8]]), w(8, 3, [['audience', 'hecklerKing', 1], ['audience', 'heckler', 3]], [['life', 'drop']])] },
  '2-5': { name: 'TANK YARD', ep: 2, type: 'armory', cell: [1, 1], exits: { N: '2-B' }, par: 80, intros: ['tank'], items: [[1.5, 'popcorn', [5, 6]], [1.5, 'rockets', [15, 6]]],
    waves: [w(2, undefined, [['N', 'tank', 1]]), w(10, 1, [['all', 'goon', 8]]), w(8, 4, [['E', 'tank', 1], ['W', 'tank', 1]]), w(10, 2, [['S', 'popper', 4], ['N', 'clapbot', 10]], [['shield', 'drop']]), w(9, 3, [['N', 'tank', 2], ['all', 'goon', 6]])] },
  '2-6': { name: 'BLOWOUT SALE', ep: 2, type: 'cash', cell: [2, 1], exits: { W: '2-5' }, par: 65, key: { rule: 'crate' }, cashRoom: true, crates: [[3, 2], [9, 2], [11, 2], [17, 2], [3, 10], [9, 10], [11, 10], [17, 10]],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4]]), w(8, 3, [['E', 'disco', 1], ['W', 'disco', 1]]), w(8, 3, [['all', 'clapbot', 5]]), w(8, 3, [['N', 'tank', 1], ['S', 'goon', 10]])] },
  '2-B': { name: 'THE BIG SPIN', ep: 2, type: 'boss', cell: [1, 0], exits: {}, boss: 'wheel' },
  // ------------------------------------------------------------------ EPISODE 3: THE SEASON FINALE (the Rooftop Gala)
  '3-1': { name: 'RED CARPET RIOT', ep: 3, type: 'start', cell: [1, 2], exits: { W: '3-2', N: '3-5', E: '3-3' }, par: 75, intros: ['brute'],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4], ['N', 'disco', 1]]), w(8, 3, [['E', 'tank', 1], ['W', 'popper', 4]]), w(9, 3, [['N', 'brute', 1]]), w(10, 2, [['all', 'clapbot', 6], ['S', 'goon', 8]])] },
  '3-2': { name: 'PYRO PIT', ep: 3, type: 'hazard', cell: [0, 2], exits: { N: '3-4' }, par: 70, key: { rule: 'final' }, hazards: [{ kind: 'pyro', cxs: [4, 8, 12, 16], cys: [3, 6, 9] }],
    waves: [w(2, undefined, [['N', 'goon', 12]]), w(8, 4, [['E', 'clapbot', 10], ['W', 'clapbot', 10]]), w(8, 4, [['S', 'popper', 4]], [['records', 'drop']]), w(8, 3, [['audience', 'heckler', 4]]), w(8, 3, [['all', 'goon', 4]], null, { script: 'finaleBurst' })] },
  '3-3': { name: 'CABLE TANGLE', ep: 3, type: 'battle', cell: [2, 2], exits: { N: '3-6' }, par: 75, intros: ['snake'],
    waves: [w(2, undefined, [['N', 'snake', 1]]), w(8, undefined, [['all', 'goon', 6]]), w(10, 4, [['E', 'snake', 1], ['W', 'snake', 1]]), w(10, 3, [['S', 'popper', 4]], [['laser', 'drop']]), w(10, 2, [['N', 'snake', 2], ['all', 'clapbot', 3]])] },
  '3-4': { name: 'PENTHOUSE VAULT', ep: 3, type: 'key', cell: [0, 1], exits: { E: '3-5' }, par: 80, key: { rule: 'vault' }, locks: [[1, 0], [3, 0], [5, 0], [7, 0]], props: [['mt:safe', 72, 10]],
    waves: [w(2, undefined, [['all', 'goon', 8]]), w(8, 4, [['audience', 'heckler', 4]]), w(8, 3, [['E', 'tank', 1]]), w(8, 3, [['all', 'clapbot', 5]]), w(8, 3, [['N', 'brute', 1]])] },
  '3-5': { name: 'THE AFTER-PARTY', ep: 3, type: 'armory', cell: [1, 1], exits: { N: '3-B' }, par: 85, items: [[1.5, 'laser', [5, 6]], [1.5, 'popcorn', [15, 6]], [1.5, 'shield', [10, 10]]],
    waves: [w(2, undefined, [['N', 'snake', 1], ['S', 'goon', 10]]), w(8, 3, [['E', 'discoBig', 1], ['W', 'tank', 1]]), w(8, 3, [['audience', 'heckler', 6]]), w(9, 3, [['N', 'brute', 1], ['all', 'clapbot', 4]]), w(9, 3, [['all', 'goon', 10], ['N', 'popper', 4]])] },
  '3-6': { name: 'MASCOT MAYHEM', ep: 3, type: 'battle', cell: [2, 1], exits: { W: '3-5' }, par: 80, key: { rule: 'carrier' },
    waves: [w(2, undefined, [['N', 'brute', 1]]), w(10, 1, [['all', 'goon', 8]]), w(8, 3, [['E', 'brute', 1], ['W', 'popper', 4]]), w(8, 3, [['S', 'snake', 1]], [['rockets', 'drop']]), w(10, 2, [['N', 'brute', 2, .8, { keyOn: 1 }]])] },
  '3-B': { name: 'LANCE LUSTRE LIVE!', ep: 3, type: 'boss', cell: [1, 0], exits: {}, boss: 'finale' },
  // ------------------------------------------------------------------ the bonus
  'GR': { name: 'THE GREEN ROOM', ep: 3, type: 'bonus', set: 'greenroom', cell: [1, 0], exits: {} },
};
// the Lightning Round (AI Hub sessions): three rooms and Mashy, one exit each, signed NEXT
const LR = [['L1', '1-1', 'L2'], ['L2', '1-2', 'L3'], ['L3', '2-3', 'LB']];
for (const [id, from, next] of LR) ROOMS[id] = Object.assign({}, ROOMS[from], { id, exits: { N: next }, lightning: true, tutorial: false, intros: [], ep: ROOMS[from].ep, set: ROOMS[from].ep === 2 ? 'warehouse' : 'studio' });
ROOMS.LB = Object.assign({}, ROOMS['1-B'], { id: 'LB', lightning: true, set: 'studio' });
for (const id in ROOMS) { ROOMS[id].id = id; if (!ROOMS[id].set) ROOMS[id].set = ROOMS[id].ep === 1 ? 'studio' : ROOMS[id].ep === 2 ? 'warehouse' : 'rooftop'; }
const EPISODES = MT.EPISODES = {
  1: { id: 1, title: 'THE PILOT', place: 'STUDIO 9, NEO-BURBANK', set: 'studio', song: 'studioBattle', stunt: [['clapbot', 12]], start: '1-1', boss: '1-B', rooms: ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B'] },
  2: { id: 2, title: 'SWEEPS WEEK', place: 'THE MEGAMART PRIZE WAREHOUSE', set: 'warehouse', song: 'warehouseFunk', stunt: [['tank', 1]], start: '2-1', boss: '2-B', rooms: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B'] },
  3: { id: 3, title: 'THE SEASON FINALE', place: 'THE ROOFTOP GALA', set: 'rooftop', song: 'finaleOverture', stunt: [['brute', 1]], start: '3-1', boss: '3-B', rooms: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B'] },
};
MT.roomIcon = room => ({ start: 'start', battle: 'battle', cash: 'cash', armory: 'armory', hazard: 'hazard', key: 'key', boss: 'boss', bonus: 'bonus' })[room.type] || 'battle';
/** the door a room is entered from, given the door the last room was left by */
MT.entryFor = (exitDoor) => exitDoor ? DOORS[exitDoor].opp : 'S';
/** the next prize from the episode's table: shuffled with the run's seed, no repeats until it runs out */
MT.nextPrize = world => {
  const run = world.run, ep = (world.room && world.room.ep) || 1, T = MT.TEXT.prizes[ep] || MT.TEXT.prizes[1];
  run.prizeBag = run.prizeBag || {};
  if (!run.prizeBag[ep] || !run.prizeBag[ep].length) run.prizeBag[ep] = rshuffle(RNG.prize, T.map((_, i) => i));
  return T[run.prizeBag[ep].shift()];
};

// ---- 21-content-script.js ----
// ---- every word of text: the script, line pools, enemy introductions, prizes, sponsors, How to Play, the tutorial ----
// Substitutions: {NAME} {PRIZE} {N} {VALUE}. No text is hard-coded in logic.
MT.TEXT = {
  speakers: {
    LANCE: { name: 'LANCE LUSTRE', voice: 'lance', color: '#c08aff' }, PENNY: { name: 'PENNY PRIZE', voice: 'penny', color: '#ff8ad8' },
    ANNC: { name: 'ANNOUNCER', voice: 'annc', color: '#ffcc33' }, MASHY: { name: 'MASHY', voice: 'mashy', color: '#f0d8a0' },
    NETWORK: { name: 'THE NETWORK', voice: 'network', color: '#2ee6ff' }, SPONSOR: { name: 'A WORD FROM KRUNCH-O', voice: 'sponsor', color: '#ff9a3c' },
    C1: { name: 'ROCKET', voice: 'contestant1', color: '#e8443a' }, C2: { name: 'VOLT', voice: 'contestant2', color: '#3b82f6' }, C3: { name: 'MOXIE', voice: 'contestant3', color: '#22c55e' }, C4: { name: 'GOLDIE', voice: 'contestant4', color: '#f5b700' },
  },
  seq: {
    coldOpen: [['ANNC', 'LIVE FROM STUDIO 9 IN BEAUTIFUL NEO-BURBANK... IT\'S... MASH TV!'], ['LANCE', 'GOOD EVENING, PLANET EARTH! I\'M LANCE LUSTRE, AND THIS IS THE ONLY SHOW WHERE THE PRIZES ARE BIG AND THE LIFE EXPECTANCY IS SMALL!'], ['LANCE', 'TONIGHT, {N} BRAVE CONTESTANTS FIGHT FOR CASH, PRIZES AND THE RIGHT TO KEEP BREATHING!']],
    coldOpen2: [['PENNY', 'AND REMEMBER, BY ORDER OF THE FCC, ALL GORE HAS BEEN REPLACED WITH CONFETTI!'], ['LANCE', 'LET\'S PLAY... MASH TV! KA-CHING! KA-BOOM!']],
    ep1: [['LANCE', 'OUR VERY FIRST EPISODE! TRY NOT TO MAKE IT YOUR LAST!']],
    ep2: [['LANCE', 'IT\'S SWEEPS WEEK! THE NETWORK SAYS: MORE EXPLOSIONS, FEWER SURVIVORS!'], ['PENNY', 'LIVE FROM THE MEGAMART PRIZE WAREHOUSE!']],
    ep3: [['LANCE', 'THE SEASON FINALE, LIVE FROM THE ROOFTOP GALA! FIREWORKS! CHAMPAGNE! FUNERALS!']],
    mashyIntro: [['PENNY', 'OOH, HERE HE COMES!'], ['LANCE', 'PLEASE WELCOME THE NETWORK\'S BELOVED MASCOT... MASHY! WE GAVE HIM A FEW... UPGRADES!'], ['MASHY', 'MASHY LOVE YOU! MASHY MASH YOU!']],
    mashyArm: [['LANCE', 'HE\'S DISARMED! LITERALLY!']],
    mashyP2: [['MASHY', 'MASHY NOT MAD! MASHY HUNGRY!']],
    mashyP3: [['LANCE', 'UH-OH! MASHY\'S GONE MASHY!']],
    mashyDown: [['LANCE', 'MASHY HAS BEEN... MASHED! SOMEBODY GET A SPATULA!']],
    wheelIntro: [['LANCE', 'IT\'S TIME TO SPIN... THE WHEEL OF MISFORTUNE! SPIN TO WIN! OR, STATISTICALLY, SPIN TO LOSE!']],
    wheelLoose: [['LANCE', 'THE WHEEL\'S OFF ITS HINGES! JUST LIKE OUR LEGAL DEPARTMENT!']],
    wheelDown: [['LANCE', 'THE WHEEL HAS STOPPED... FOREVER! BANKRUPT!']],
    finaleIntro: [['LANCE', 'YOU WERE SUPPOSED TO LOSE! THE SPONSORS HAVE CONTRACTS! NOBODY CANCELS LANCE LUSTRE!']],
    commercial: [['LANCE', 'WE\'LL BE RIGHT BACK AFTER A WORD FROM OUR SPONSORS!'], ['SPONSOR', 'KRUNCH-O! THE CEREAL THAT CRUNCHES BACK!']],
    backFromBreak: [['LANCE', 'AND WE\'RE BACK! DID YOU MISS ME? YOU DID! YOU ALWAYS DO!']],
    lanceDown: [['LANCE', 'THIS... ISN\'T... OVER... PLEASE... STAND... BY...']],
    robotReveal: [['ANNC', 'LADIES AND GENTLEMEN... LANCE WAS A ROBOT ALL ALONG!']],
    networkReveal: [['NETWORK', 'THE SHOW MUST GO ON. THE SHOW WILL ALWAYS GO ON. PLEASE. STAY. TUNED.']],
    eyeOpen: [['NETWORK', 'YOU ARE NOT AUTHORIZED TO CHANGE THE CHANNEL.']],
    networkDown: [['NETWORK', 'SIGNAL... LOST...']],
    recap: [['PENNY', 'LET\'S SEE WHAT OUR CONTESTANTS WON!']],
    recap1End: [['LANCE', 'SEE YOU AFTER THE BREAK!']], recap2End: [['LANCE', 'DON\'T GO ANYWHERE! LEGALLY, YOU CAN\'T!']], recap3: [['PENNY', 'WHAT A SEASON! LET\'S COUNT IT UP!']],
    greenRoomOpen: [['PENNY', 'YOU FOUND THE GOLDEN KEYS! THE GREEN ROOM IS OPEN!']], greenRoom: [['PENNY', 'YOU FOUND THE GOLDEN KEYS! WELCOME TO THE GREEN ROOM!']],
    statueUp: [['PENNY', 'THE GOLDEN LANCIE! GRAB IT AND WIN THE GRAND PRIZE!']],
    endingA: [['PENNY', 'CONGRATULATIONS! YOU SURVIVED THE SEASON!'], ['LANCE', '...HELLO, PLANET EARTH! NEXT SEASON ON MASH TV...']],
    endingB: [['ANNC', 'BREAKING NEWS! TONIGHT\'S CONTESTANTS HAVE POOLED THEIR WINNINGS... AND BOUGHT THE NETWORK!'], ['ANNC', 'MASH TV HAS BEEN... CANCELLED!']],
    endingB2: [['LANCE', 'WELCOME TO CHANNEL 3,000! TONIGHT: MASHED POTATOES!']],
    gameOver: [['LANCE', 'AND THAT\'S A WRAP! FOR YOU, PERMANENTLY!'], ['LANCE', 'YOUR CONSOLATION PRIZE: THE HOME VERSION OF THIS GAME!']],
    continue: [['LANCE', 'WANT ANOTHER SHOT? THE NETWORK ONLY TAKES HALF!']],
    sessionEnd: [['LANCE', 'THAT\'S OUR SHOW! TUNE IN NEXT ROUND!']], sessionVoid: [['ANNC', 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES.']],
    sessionCard: [['LANCE', 'IT\'S THE LIGHTNING ROUND! THREE ROOMS, ONE MASCOT, ALL THE CASH YOU CAN CARRY!']],
  },
  contestantLines: ['A RETIRED STUNT DOUBLE, JUST HERE FOR THE TOASTER!', 'A LICENSED ELECTRICIAN WITH UNLICENSED REFLEXES!', 'THREE-TIME CHAMPION OF COMPETITIVE COUPON CLIPPING!', 'WANTS THE MOON TIMESHARE. HAS NO PLAN FOR GETTING HOME!'],
  pools: {
    roomStart: ['DOORS OPEN IN 3... 2... OH, THEY\'RE ALREADY OPEN!', 'THIS ROOM BROUGHT TO YOU BY KRUNCH-O: THE CEREAL THAT CRUNCHES BACK!', 'MASH \'EM! CASH \'EM! KA-CHING! KA-BOOM!', 'DON\'T TRY THIS AT HOME, KIDS! TRY IT HERE, FOR MONEY!', 'LET\'S GET READY TO... MASH!', 'OUR LAWYERS SAY THESE DOORS ARE PERFECTLY SAFE!', 'THE AUDIENCE AT HOME IS ON THE EDGE OF THEIR COUCHES!', 'MEGAMART: WE SELL EVERYTHING. EVEN THIS SHOW!'],
    clear: ['ROOM CLEAR! THE JANITORS HATE YOU!', 'MAGNIFICENT! THE CONFETTI BUDGET IS BLOWN!', 'NOW THAT\'S MUST-MASH TV!', 'PICK A DOOR, ANY DOOR! THEY\'RE ALL TERRIBLE!', 'STAY TUNED... AND STAY ALIVE!', 'WHAT A PERFORMANCE! SOMEONE GIVE THEM AN AWARD! NOT A REAL ONE!'],
    hurt: ['OOH! THAT\'S GONNA LEAVE A MARK!', 'WALK IT OFF! THE NETWORK DOESN\'T PAY FOR BANDAGES!', 'SO CLOSE! I MEAN... HOORAY!'],
    death: ['MASHED! LET\'S SEE THAT AGAIN IN SLOW MOTION!', 'DON\'T WORRY, FOLKS! OUR CONTESTANTS ARE FULLY INSURED... BY US!', 'THEY\'LL BE FINE! PROBABLY! RIGHT AFTER THESE MESSAGES!', 'AND DOWN GOES {NAME}! THE CROWD GOES MILD!'],
    multi: ['MULTI-MASH!', 'A TRIPLE! THE SPONSORS LOVE A TRIPLE!', 'TOTAL MASH-ACRE!'],
    showboat: ['WORK THAT CAMERA!', 'SHOWMANSHIP! OR STUPIDITY! SAME THING!', 'THE CAMERAS LOVE YOU! THE GOONS DON\'T!'],
    prime: ['RATINGS ARE THROUGH THE ROOF! SOMEBODY FIX THE ROOF!', 'PRIME TIME, BABY! FIVE TIMES THE CASH!', 'THE SPONSORS ARE WEEPING WITH JOY!'],
    stunt: ['WE\'RE LOSING VIEWERS! PRODUCERS, DO SOMETHING!', 'BORING! RELEASE THE STUNT!', 'THE AUDIENCE IS CHANGING THE CHANNEL! SPICE IT UP!'],
    key: ['A GOLDEN KEY! COLLECT FIVE AND THE GREEN ROOM COULD BE YOURS!', 'ANOTHER KEY! WHAT DOES IT OPEN? OUR LAWYERS SAY: NOTHING!'],
    prizeL: ['YOU WON {PRIZE}! IT\'S WORTH MONEY! PROBABLY!'], prizeP: ['OOOH! {PRIZE}!'],
    extraLife: ['ENCORE! THE CROWD WANTS MORE OF YOU! FOR NOW!'],
    hurry: ['PICK A DOOR! WE\'RE PAYING OVERTIME HERE!'],
    lowHp: ['ONE MORE HIT AND YOU\'RE A COMMERCIAL BREAK!'],
    bankrupt: ['BANKRUPT! THE MOST BEAUTIFUL WORD IN TELEVISION!'], jackpot: ['JACKPOT! I CAN\'T BELIEVE WE BUILT THAT ONE IN!'], spinAgain: ['SPIN AGAIN! FASTER! MEANER!'],
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
    brute: ['BRAND MASCOT ALERT! IT\'S... THE CEREAL KILLER!', 'SIDESTEP THE CHARGE. STUNNED, IT TAKES DOUBLE DAMAGE.'],
  },
  prizes: {
    1: [['A SELF-AWARE TOASTER', 2500, 'IT ALREADY RESENTS YOU!', 'toaster'], ['A HOVER BLENDER', 3000, 'SMOOTHIES AT ANY ALTITUDE!', 'blender'], ['A LIFETIME SUPPLY OF CANNED LAUGHTER', 4000, 'NEVER LAUGH ALONE AGAIN!', 'laughter'], ['A MOOD-RING THERMOSTAT', 1500, 'YOUR HOUSE KNOWS HOW YOU FEEL!', 'thermostat'], ['A DRY-LAND JET SKI', 8000, 'IT DOESN\'T FLOAT, BUT IT LOOKS GREAT!', 'jetski'], ['A SLIGHTLY HAUNTED ROBO-BUTLER', 6000, 'THE GHOST DOES THE DISHES!', 'butler']],
    2: [['A FRIDGE THAT JUDGES YOU', 5000, 'IT KNOWS ABOUT THE MIDNIGHT CAKE!', 'fridge'], ['MATCHING JETPACKS', 12000, 'SEATBELTS NOT INCLUDED!', 'jetpack'], ['A 199-INCH MEGA-RAY TV', 9000, 'WATCH MASH TV LIFE-SIZED!', 'megatv'], ['A SELF-FOLDING LAUNDRY CUBE', 3500, 'IT FOLDS YOU, TOO!', 'laundry'], ['A GOLD-PLATED REMOTE', 4500, 'CHANGE ANY CHANNEL BUT THIS ONE!', 'remote'], ['AN INFLATABLE SPORTS CAR', 7000, 'ZERO TO SIXTY IN ONE PUMP!', 'inflatable']],
    3: [['A TIMESHARE ON THE MOON', 25000, 'GETTING HOME IS EXTRA!', 'moon'], ['A PERSONAL WEATHER MACHINE', 15000, 'RAIN ON EVERYONE\'S PARADE!', 'weather'], ['A DIAMOND TOOTHBRUSH', 8000, 'FOR A SMILE LIKE LANCE\'S!', 'toothbrush'], ['A PET CLONING KIT', 10000, 'NOW YOU HAVE TWO PROBLEMS!', 'clone'], ['A BOTTOMLESS CHAMPAGNE FLUTE', 6000, 'CHEERS, FOREVER!', 'champagne'], ['A SPEEDBOAT NAMED LANCE', 20000, 'IT ALSO TALKS ABOUT ITSELF!', 'speedboat']],
  },
  grandPrize: { name: 'THE NETWORK (YES, ALL OF IT)', value: 100000, line: 'YOU OWN THE SHOW NOW!', icon: 'network' },
  sponsors: [['KRUNCH-O', 'THE CEREAL THAT CRUNCHES BACK'], ['MEGAMART', 'WE SELL EVERYTHING. EVEN THIS SHOW.'], ['DOOM COLA', 'TASTE THE END'], ['LAFF TRAK', 'CANNED LAUGHTER FOR AWKWARD SILENCES']],
  tutorial: { move: 'MOVE', aim: 'AIM + FIRE', capsule: 'WALK OVER POWER-UPS', showboat: 'SHOWBOAT NEAR ENEMIES FOR RATINGS', slide: 'SLIDE THROUGH DANGER', bomb: 'SHOWSTOPPER CLEARS THE SCREEN', exit: 'PICK A DOOR!' },
  howto: [
    { title: 'CONTROLS', rows: [['move', 'MOVE'], ['aim', 'AIM AND FIRE'], ['slide', 'SLIDE: A DODGE THAT PASSES THROUGH SHOTS'], ['bomb', 'SHOWSTOPPER: CLEARS THE SCREEN'], ['showboat', 'SHOWBOAT: POSE FOR THE CAMERAS'], ['pause', 'PAUSE AND MENU']] },
    { title: 'THE SHOW', text: ['ENEMIES POUR IN THROUGH FOUR DOORS. CLEAR EVERY WAVE, THEN WALK THROUGH A LIT EXIT TO PICK YOUR ROUTE.', 'CASH AND PRIZES ADD TO YOUR WINNINGS. THE RATINGS GAUGE MULTIPLIES THEM, UP TO FIVE TIMES.', 'KILLS, CLOSE CALLS AND SHOWBOATING RAISE THE RATINGS. HITS AND DAWDLING LOWER THEM. FILL THE GAUGE FOR PRIME TIME!', 'GOLDEN KEYS HIDE ON THE LONGER ROUTES. FIND FIVE BEFORE THE FINALE TO OPEN THE GREEN ROOM.'] },
    { title: 'POWER-UPS', items: ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield'] },
    { title: 'POWER-UPS', items: ['speed', 'bomb', 'life'], extra: ['POWER-UPS COME IN LITTLE TVS. THE LETTER SAYS WHICH. WEAPONS RUN OUT; THE BAR SHOWS HOW LONG IS LEFT.'] },
  ],
  ui: {
    title: 'MASH TV', sub: 'LIVE FROM STUDIO 9', press: 'PRESS', toStart: 'TO START', menu: ['START THE SHOW', 'EPISODES', 'HOW TO PLAY', 'TOP EARNERS', 'OPTIONS', 'ABOUT & CREDITS'],
    touchNotice: 'CONTROLLER OR KEYBOARD REQUIRED', touchSub: 'CONNECT A CONTROLLER OR PRESS ANY KEY', settings: 'SETTINGS', demo: 'DEMO PLAY', pressAny: 'PRESS ANY BUTTON',
    lobby: "TONIGHT'S CONTESTANTS", join: 'TO JOIN', ready: 'READY!', letsPlay: "LET'S PLAY!", look: 'LOOK', leave: 'LEAVE', back: 'BACK', select: 'SELECT',
    difficulty: 'CHOOSE YOUR CONTRACT', rehearsal: 'REHEARSAL', locked: 'NOT YET AIRED', scores: 'TOP EARNERS', mvp: 'EPISODE MVP: {NAME}', network: 'THE NETWORK TAKES ITS CUT!',
    nextOn: 'NEXT ON MASH TV', roomClear: 'ROOM CLEAR!', pickDoor: 'PICK A DOOR!', primeTime: 'PRIME TIME!', losingViewers: "WE'RE LOSING VIEWERS!", mashed: 'MASHED!', encore: 'ENCORE!', bankrupt: 'BANKRUPT!',
    out: 'OUT', pressToContinue: 'TO CONTINUE', youWon: 'YOU WON: {PRIZE}!', goldenKey: 'GOLDEN KEY {N}/9', continueQ: 'CONTINUE?', halfWinnings: '-50% WINNINGS', wrap: "AND THAT'S A WRAP!", hurry: 'HURRY UP!',
    endA: 'MASH TV WILL RETURN.', endAHint: 'FIND 5 GOLDEN KEYS TO OPEN THE GREEN ROOM', endB: 'MASH TV: CANCELLED. THANKS FOR WATCHING.', channel: 'CHANNEL 3,000', style: 'STYLE +{N}', live: 'LIVE', bug: 'MASH 9',
    commercial: "WE'LL BE RIGHT BACK!", robot: 'LANCE WAS A ROBOT ALL ALONG!', signalLost: 'SIGNAL LOST', backToBasics: 'BACK TO BASICS',
  },
  credits: ['MASH TV', 'A GAME SHOW TWIN-STICK SHOOTER', '', 'MADE WITH THE MY-3D2DGE ENGINE', 'ALL MUSIC, SOUND AND VOICES WRITTEN IN CODE', 'STORE PROPS: KENNEY AND KAYKIT (CC0)', '', 'DESIGNED AND BUILT BY CLAUDE OPUS 5.5 (ANTHROPIC)', 'FROM A PLAN BY CLAUDE OPUS 5.5', '', 'INSPIRED BY SMASH TV (1990)', 'AN ORIGINAL GAME: EVERY NAME, LINE AND TUNE IS NEW', '', 'AI HUB SESSIONS: THE LIGHTNING ROUND', '', 'THANKS FOR WATCHING!'],
};
// prize rows as objects
for (const ep in MT.TEXT.prizes) MT.TEXT.prizes[ep] = MT.TEXT.prizes[ep].map(([name, value, line, icon]) => ({ name, value, line, icon }));

// ---- 30-ui-kit.js ----
// ---- the UI kit: 10-foot canvas widgets drawn in r.overlay; focus handling written once (any player, keys, mouse) ----
const UI = MT.ui = {};
const FONT = E.font;
UI.text = (g, s, x, y, c = '#fff7e8', o = {}) => FONT.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
UI.width = (s, scale = 1) => FONT.width(String(s), { scale });
/** the input that acted last (prompts show its glyphs) */
UI.lastInput = () => { let best = game.input; for (const p of game.players) if ((p._lastAct || 0) > (best._lastAct || 0)) best = p; return best; };
/** every player's menu presses this step, merged; mouse hover and clicks separately */
UI.nav = () => {
  const n = { up: false, down: false, left: false, right: false, confirm: false, cancel: false, tabL: false, tabR: false, reset: false, start: false, more: false, any: false, holdConfirm: false };
  for (const p of game.players) {
    if (!p.map.confirm) continue;
    const rep = a => p.map[a] && p.repeat(a, .32, .09);
    const pr = a => p.map[a] && p.pressed(a);
    if (rep('up')) n.up = true; if (rep('down')) n.down = true; if (rep('left')) n.left = true; if (rep('right')) n.right = true;
    if (pr('confirm')) n.confirm = true; if (pr('cancel')) n.cancel = true; if (pr('tabL')) n.tabL = true; if (pr('tabR')) n.tabR = true; if (pr('reset')) n.reset = true; if (pr('start')) n.start = true; if (pr('more')) n.more = true;
    if (p.map.confirm && (p.down('confirm') || p.down('start'))) n.holdConfirm = true;
    if (p.anyPressed()) { n.any = true; p._lastAct = game.real; }
  }
  return n;
};
/** a focus list: state { i }; items: [{ label, sub, disabled }]; layout: [{ x, y, w, h }] rects in screen pixels.
 *  Returns { picked, moved, side } (picked: index confirmed or clicked; side: -1 / +1 for left / right on the focused row) */
UI.listStep = (st, items, rects, nav, o = {}) => {
  const out = { picked: -1, moved: false, side: 0 };
  const n = items.length; if (!n) return out;
  const move = d => { let k = st.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!items[k].disabled || o.focusDisabled) break; } if (k !== st.i) { st.i = k; out.moved = true; MT.sfx('blip'); } };
  if (nav.up) move(-1); if (nav.down) move(1);
  const wh = MT.wheelTake ? MT.wheelTake() : 0; if (wh) move(wh);
  if (nav.left) out.side = -1; if (nav.right) out.side = 1;
  const I = game.input, p = I.pointer && I.pointer();
  const movedP = st._p !== undefined && p && (!st._p || st._p[0] !== p[0] || st._p[1] !== p[1]);
  if (movedP || (p && I.lastDevice === 'mouse' && st._p === undefined)) { for (let k = 0; k < rects.length; k++) { const R = rects[k]; if (R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h && !items[k].disabled && st.i !== k) { st.i = k; out.moved = true; MT.sfx('blip'); } } }
  st._p = p ? p.slice() : null;
  const c = I.clicked && I.clicked();
  if (c) for (let k = 0; k < rects.length; k++) { const R = rects[k]; if (R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h && !items[k].disabled) { st.i = k; out.picked = k; out.click = c; } }
  if (nav.confirm && !items[st.i].disabled) out.picked = st.i;
  if (out.picked >= 0) MT.sfx('bell');
  return out;
};
/** a clicked rect test for one-off buttons */
UI.clickIn = R => { const c = game.input.clicked && game.input.clicked(); return !!(c && R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h); };
UI.hoverIn = R => { const p = game.input.pointer && game.input.pointer(); return !!(p && game.input.lastDevice === 'mouse' && R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h); };
/** a panel: dark, gold-lined, 85% opaque (never text over busy art without one) */
UI.panel = (g, x, y, w, h, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .9 : o.alpha });
};
/** marquee bulbs chasing round a rectangle (the focus frame, menu frames, the jumbotron border) */
UI.bulbs = (g, x, y, w, h, t, o = {}) => {
  const step = o.step || 6, on = o.on || '#fff6b0', off = o.off || '#8a5a08', speed = o.speed || 10;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const per = 2 * (w + h); let k = 0;
  for (let d = 0; d < per; d += step, k++) {
    let px2, py2; if (d < w) { px2 = x + d; py2 = y; } else if (d < w + h) { px2 = x + w; py2 = y + d - w; } else if (d < 2 * w + h) { px2 = x + w - (d - w - h); py2 = y + h; } else { px2 = x; py2 = y + h - (d - 2 * w - h); }
    const lit = (k + Math.floor(t * speed)) % 3 === 0;
    px.rect(g, px2 - 1, py2 - 1, 2, 2, lit ? on : off);
  }
};
/** a menu row: label (scale 2), focused rows in a gold bulb frame with a scale bump */
UI.row = (g, R, label, focused, t, o = {}) => {
  const sc = o.scale || 2, disabled = o.disabled;
  if (focused) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
  const ty = R.y + Math.round((R.h - 7 * sc) / 2), tx = o.align === 'left' ? R.x + 8 : R.x + R.w / 2;
  UI.text(g, label, tx, ty - (focused ? 1 : 0), disabled ? '#6a5a7a' : focused ? '#ffcc33' : '#fff7e8', { scale: sc, align: o.align === 'left' ? 'left' : 'center' });
  if (o.value !== undefined) UI.text(g, o.value, R.x + R.w - 8, ty, focused ? '#fff7e8' : '#c9b6e4', { scale: sc, align: 'right' });
};
/** the bottom prompt bar: [[action, 'TEXT'], ...] in the glyphs of the last device used */
UI.promptBar = (g, r, items, o = {}) => {
  const I = o.input || UI.lastInput(), sc = r.W >= 480 ? 1 : 1;
  const w = MT.glyph.measure(items, I, { scale: sc }) + 16, h = 17, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H - h - 4 - (o.lift || 0));
  px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c0618'));
  px.rect(g, x, y, w, 1, '#ffcc33');
  MT.glyph.prompt(g, r.W / 2, y + 3, items, I, { scale: sc, align: 'center' });
};
/** a title in the logo's style */
UI.title = (g, s, x, y, sc = 3, o = {}) => FONT.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: sc, colors: o.colors || ['#ffcc33', '#ff2e88'], align: o.align || 'center', depth: o.depth === undefined ? 2 : o.depth, depthColor: '#5a1040' }, o));
/** the MASH TV logo: a CRT outline with rabbit-ear antennas around the title, a sparkle */
UI.logo = (g, cx, y, sc, t) => {
  const w = Math.round(UI.width('MASH TV', sc) * 1.25 + 24), h = Math.round(sc * 7 + 30), x = Math.round(cx - w / 2);
  px.line(g, cx - 8, y + 2, cx - 30, y - 18, '#c8d0e0', 2); px.line(g, cx + 8, y + 2, cx + 30, y - 18, '#c8d0e0', 2); px.disc(g, cx - 30, y - 18, 3, '#ff2e88'); px.disc(g, cx + 30, y - 18, 3, '#2ee6ff');
  px.rect(g, x - 3, y - 1, w + 6, h + 6, '#0c0618'); px.rect(g, x - 2, y, w + 4, h + 4, '#c8d0e0'); px.rect(g, x, y + 2, w, h, '#2a1050'); px.rect(g, x + 2, y + 4, w - 4, h - 4, '#1a0838');
  UI.bulbs(g, x - 2, y, w + 4, h + 4, t, { step: 7 });
  UI.title(g, 'MASH TV', cx, y + 12, sc);
  const sp = Math.floor(t * 2) % 4; if (sp < 2) { const sx = x + w - 14, sy = y + 10; px.line(g, sx - 4, sy, sx + 4, sy, '#ffffff'); px.line(g, sx, sy - 4, sx, sy + 4, '#ffffff'); px.dot(g, sx, sy, '#fff6b0'); }
  return h + 6;
};
/** TV static over the whole screen (transitions): k 0..1 */
UI.static = (g, r, k, t) => {
  if (k <= 0) return;
  const W = r.bw, H = r.bh, n = Math.round(W * H * .06 * k);
  px.blend(g, Math.min(1, k * 1.2), 'normal', () => px.rect(g, 0, 0, W, H, '#1a1828'));
  for (let i = 0; i < n; i++) { const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0, c = Math.random() < .5 ? '#ffffff' : '#7a788a'; px.rect(g, x, y, 1 + (Math.random() * 2 | 0), 1, c); }
  const roll = ((t * 160) % (H + 30)) - 15; px.blend(g, .3 * k, 'add', () => px.rect(g, 0, roll, W, 6, '#ffffff'));
};
/** a slider row (dev mode, settings) */
UI.slider = (g, R, label, v, min, max, focused, t, valText) => {
  if (focused) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
  UI.text(g, label, R.x + 6, R.y + 3, focused ? '#ffcc33' : '#fff7e8');
  const bx = R.x + 6, by = R.y + R.h - 7, bw = R.w - 70, k = clamp((v - min) / (max - min), 0, 1);
  px.rect(g, bx, by, bw, 3, '#0c0618'); px.rect(g, bx, by, Math.round(bw * k), 3, focused ? '#ffcc33' : '#c08aff'); px.rect(g, bx + Math.round(bw * k) - 1, by - 2, 3, 7, '#fff7e8');
  UI.text(g, valText, R.x + R.w - 6, R.y + R.h - 11, '#fff7e8', { align: 'right' });
  return { bx, by, bw };
};

// ---- 31-hud.js ----
// ---- the in-play HUD (r.overlay, anchored to r.W and r.H): player panels, the ratings gauge, boss bar, lower third ----
const HUD = MT.hud = {};
const PANEL_W = 104, PANEL_H = 30;
function weaponIcon(g, x, y, id, t) {
  const W = WEAPONS[id] || WEAPONS.blaster;
  px.rect(g, x, y, 11, 9, '#0c0618'); px.rect(g, x + 1, y + 1, 9, 7, W.color || '#c8d0e0');
  UI.text(g, W.letter || 'B', x + 6, y + 1, '#140a24', { align: 'center', shadow: false });
}
function panel(g, r, c, corner, t) {
  const pr = c.pr, col = SLOT_COLORS[c.slot], right = corner === 1 || corner === 3, bottom = corner >= 2;
  const x = right ? r.W - PANEL_W - 4 : 4, y = bottom ? r.H - PANEL_H - 4 : (corner === 0 ? 14 : 4);
  px.blend(g, .85, 'normal', () => px.rect(g, x, y, PANEL_W, PANEL_H, '#140a24'));
  px.rect(g, x, y, PANEL_W, 1, col); px.rect(g, x, y + PANEL_H - 1, PANEL_W, 1, E.tones(col).sh); px.rect(g, x, y, 2, PANEL_H, col);
  if (!MT.cfg.skipRigs && c.rig) { c.rig.drawPortrait(g, x + 3, y + 3, 16, { zoom: 1.4, turn: .4, bg: E.tones(col).deep, frame: false, tint: c.state === 'out' ? '#808080' : undefined }); }
  UI.text(g, 'P' + (c.slot + 1) + ' ' + pr.name, x + 22, y + 2, col);
  UI.text(g, money(pr.cash), x + 22, y + 11, '#ffcc33', { gradient: ['#fff6b0', '#ffcc33'] });
  if (c.state === 'out') { const I = c.input || game.input; UI.text(g, MT.TEXT.ui.out, x + 4, y + 21, '#ff3344'); MT.glyph.draw(g, x + 22, y + 19, 'start', I); UI.text(g, MT.TEXT.ui.pressToContinue, x + 22 + MT.glyph.width('start', I) + 3, y + 21, '#fff7e8', { font: 'tiny' }); return; }
  const mh = maxHpNow();
  for (let i = 0; i < Math.min(mh, 6); i++) px.sprite(g, i < c.hp ? SPR.heart : SPR.heartOff, x + 4 + i * 8, y + 21);
  const lx = x + 4 + Math.min(mh, 6) * 8 + 2;
  UI.text(g, '×' + pr.lives, lx, y + 20, '#fff7e8');
  if (c.weapon !== 'blaster') { const k = c.wMax ? c.wT / c.wMax : 0; if (!(c.wT < 2 && Math.floor(t * 8) % 2)) weaponIcon(g, x + PANEL_W - 30, y + 2, c.weapon, t); px.rect(g, x + PANEL_W - 30, y + 12, 11, 2, '#0c0618'); px.rect(g, x + PANEL_W - 30, y + 12, Math.round(11 * k), 2, (WEAPONS[c.weapon] || {}).color || '#fff'); }
  let ax = x + PANEL_W - 17; for (const a of ['records', 'shield', 'speed']) if (c.addons[a] > 0) { if (!(c.addons[a] < 2 && Math.floor(t * 8) % 2)) { px.rect(g, ax, y + 3, 7, 7, '#0c0618'); px.rect(g, ax + 1, y + 4, 5, 5, WEAPONS[a].color); UI.text(g, WEAPONS[a].letter, ax + 4, y + 3, '#140a24', { align: 'center', shadow: false, font: 'tiny' }); } ax -= 8; if (ax < x + PANEL_W - 30) break; }
  for (let i = 0; i < Math.min(3, pr.bombs); i++) px.sprite(g, SPR.bulbS, x + PANEL_W - 8 - i * 6, y + 21);
  if (MT.cheats.infBombs || c.infBombs) UI.text(g, 'INF', x + PANEL_W - 30, y + 20, '#fff6b0', { font: 'tiny' });
}
function gauge(g, r, world, t) {
  const R = world.ratings, cx = Math.round(r.W / 2), y = 3, w = 108, x0 = cx - w / 2;
  px.blend(g, .85, 'normal', () => px.rect(g, x0, y, w, 35, '#140a24'));
  px.rect(g, x0, y, w, 1, '#ffcc33'); px.rect(g, x0, y + 34, w, 1, '#5a1040');
  UI.text(g, 'RATINGS', cx, y + 2, '#c9b6e4', { align: 'center', font: 'tiny' });
  const ox = cx, oy = y + 25, rad = 14;
  for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI, c = i < 4 ? '#5a4a6a' : i < 7 ? '#2ee6ff' : i < 10 ? '#5fe0a0' : i < 13 ? '#ffcc33' : '#ff2e88'; px.rect(g, Math.round(ox + Math.cos(a) * rad) - 1, Math.round(oy + Math.sin(a) * rad) - 1, 2, 2, c); }
  const a = Math.PI + clamp(R.R / 100, 0, 1) * Math.PI + (R.prime > 0 ? Math.sin(t * 30) * .05 : 0);
  px.line(g, ox, oy, ox + Math.cos(a) * (rad - 3), oy + Math.sin(a) * (rad - 3), '#ffffff'); px.disc(g, ox, oy, 2, '#ff3344');
  UI.text(g, '×' + R.X, x0 + w - 6, y + 13, R.prime > 0 ? '#ff2e88' : '#ffcc33', { align: 'right', scale: 2 });
  if (!world.session) { px.sprite(g, SPR.key, x0 + 4, y + 15); UI.text(g, (world.run && world.run.keys || 0) + '/9', x0 + 18, y + 14, '#ffcc33'); }
  const ap = STUDIO.cheerT > 0 && Math.floor(t * 6) % 2 === 0; px.rect(g, cx - 16, y + 27, 32, 6, ap ? '#d02a3a' : '#3a2030'); UI.text(g, 'APPLAUSE', cx, y + 28, ap ? '#fff7e8' : '#7a5a6a', { align: 'center', font: 'tiny', shadow: false });
  if (R.prime > 0) { if (Math.floor(t * 4) % 2 === 0) UI.text(g, MT.TEXT.ui.primeTime, cx, y + 38, '#ff2e88', { align: 'center' }); }
  else if (world.room && !(world.boss && !world.boss.dead && world.boss.phase !== 'intro')) UI.text(g, (world.room.lightning ? 'LIGHTNING ROUND' : world.room.id) + '  ' + world.room.name, cx, y + 38, '#fff7e8', { align: 'center' });
}
function bossBar(g, r, boss, t) {
  if (!boss || boss.dead || boss.phase === 'intro' || boss.gone && boss.stage !== 'network') return;
  const w = Math.min(220, r.W - 240), x = Math.round(r.W / 2 - w / 2), y = 41, k = boss.hpPct();
  px.blend(g, .85, 'normal', () => px.rect(g, x - 2, y - 1, w + 4, 15, '#140a24'));
  UI.text(g, boss.name, r.W / 2, y, '#ff9a3c', { align: 'center', font: 'tiny' });
  px.rect(g, x, y + 7, w, 5, '#3a1020'); px.rect(g, x, y + 7, Math.round(w * k), 5, '#ff3344'); px.rect(g, x, y + 7, Math.round(w * k), 1, '#ff9a9a');
  const segs = boss.parts.filter(p => !p.noBar && !p.tv); if (segs.length > 1) { let sx = x; const tot = segs.reduce((a, p) => a + p.max, 0); for (const p of segs) { sx += Math.round(w * p.max / tot); if (sx < x + w - 1) px.rect(g, sx, y + 7, 1, 5, '#140a24'); } }
}
function lowerThird(g, r, t) {
  const L = MT.lines.current; if (!L) return false;
  if (game.settings.subtitles === false && L.pri < 3) return false;
  const w = Math.min(r.W - 24, 340), h = L.hint ? 42 : 34, x = Math.round(r.W / 2 - w / 2), y = r.H - h - 6;
  px.blend(g, .9, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
  px.rect(g, x, y, w, 1, L.color); px.rect(g, x, y + h - 1, w, 1, '#5a1040');
  MT.drawSpeakerPortrait(g, L.who, x + 3, y + 3, 24, t);
  px.rect(g, x + 30, y - 6, UI.width(L.name) + 8, 9, L.color); UI.text(g, L.name, x + 34, y - 5, '#140a24', { shadow: false });
  if (game.settings.subtitles !== false || L.pri >= 3) {
    const lines = FONT.wrap(L.text.slice(0, L.typed), w - 40);
    lines.slice(0, 3).forEach((ln, i) => UI.text(g, ln, x + 32, y + 5 + i * 9, '#fff7e8'));
  }
  if (L.hint) UI.text(g, L.hint, x + 32, y + h - 10, '#2ee6ff', { font: 'tiny' });
  return true;
}
function banners(g, r, t) {
  let y = Math.round(r.H * .56);
  for (const b of MT.banners.list) {
    const k = clamp(b.t / .18, 0, 1), out = clamp((b.dur - b.t) / .2, 0, 1), sc = b.big ? 2 : 1;
    const w = UI.width(b.text, sc) + 24 + (b.icon ? 16 : 0), h = 7 * sc + (b.sub ? 14 : 8), x = Math.round(r.W / 2 - w / 2 + (1 - E.ease.outBack(k)) * -r.W * .5);
    if (out <= 0) continue;
    px.blend(g, .9 * out, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
    UI.bulbs(g, x, y, w, h, t, { on: b.color });
    let tx = r.W / 2 + (b.icon ? 8 : 0); if (b.icon) { const s = SPR.prize[b.icon] || SPR.ico[b.icon] || SPR.key; px.sprite(g, s, x + 6, y + 4); }
    UI.text(g, b.text, tx + x - Math.round(r.W / 2 - w / 2), y + 4, b.color, { align: 'center', scale: sc });
    if (b.sub) UI.text(g, b.sub, tx + x - Math.round(r.W / 2 - w / 2), y + 5 + 7 * sc, '#fff7e8', { align: 'center' });
    y += h + 4;
  }
}
function reticle(g, r, world, t) {
  const I = game.input; if (I.lastDevice !== 'mouse' || !I.mouse || !I.mouse.active) return;
  const c = world.contestants.find(q => q.input === I && q.ctl === 'local'); if (!c) return;
  const p = I.pointer(); if (!p) return;
  const [x, y] = p, col = SLOT_COLORS[c.slot], s = 5 + (c.firing ? Math.sin(t * 30) : 0);
  px.line(g, x - s - 3, y, x - 2, y, '#ffcc33'); px.line(g, x + 2, y, x + s + 3, y, '#ffcc33'); px.line(g, x, y - s - 3, x, y - 2, '#ffcc33'); px.line(g, x, y + 2, x, y + s + 3, '#ffcc33');
  px.rect(g, x - 1, y - 1, 2, 2, col);
}
HUD.draw = (r, world, t, o = {}) => {
  r.overlay(g => {
    if (o.onlyLines) { banners(g, r, t); lowerThird(g, r, t); return; }
    if (!o.noBugs) { const blink = Math.floor(t * 2) % 2 === 0; px.disc(g, 8, 6, 2.5, blink ? '#ff3344' : '#6a1018'); UI.text(g, MT.TEXT.ui.live, 13, 3, '#fff7e8', { font: 'tiny' }); UI.text(g, MT.TEXT.ui.bug, 32, 3, '#c9b6e4', { font: 'tiny' }); if (MT.devActive() && !world.session && !world.attract) { px.rect(g, 58, 2, 18, 8, '#ff9a3c'); UI.text(g, 'DEV', 67, 3, '#140a24', { align: 'center', font: 'tiny', shadow: false }); } }
    world.contestants.forEach((c, i) => panel(g, r, c, c.slot % 4, t));
    gauge(g, r, world, t);
    bossBar(g, r, world.boss, t);
    banners(g, r, t);
    const talking = lowerThird(g, r, t);
    const tut = MT.tut.cur;
    if (tut && !o.noTut) { const I = (world.contestants[0] && world.contestants[0].input) || game.input, items = tut.actions.map(([a]) => [a, '']).concat([['', '']]).slice(0, 1); const tw2 = MT.glyph.measure(tut.actions, I) + UI.width(tut.text) + 20, x = Math.round(r.W / 2 - tw2 / 2), y = r.H - (talking ? 92 : 50); px.blend(g, .88, 'normal', () => px.rect(g, x, y, tw2, 17, '#140a24')); px.rect(g, x, y, tw2, 1, '#2ee6ff'); let cx = x + 6; for (const [a] of tut.actions) cx += MT.glyph.draw(g, cx, y + 3, a, I) + 4; UI.text(g, tut.text, cx + 2, y + 5, '#fff7e8'); }
    if (!talking && !o.noWaves) {
      if (world.phase === 'EXIT' && !world.exitPick) { if (Math.floor(t * 3) % 3) UI.text(g, MT.TEXT.ui.pickDoor, r.W / 2, r.H - 16, '#3aff6a', { align: 'center', scale: 2 }); }
      else if (world.room && world.room.waves && world.phase === 'WAVES') { const n = world.room.waves.length, k = world.wave; const w2 = n * 8; for (let i = 0; i < n; i++) px.disc(g, r.W / 2 - w2 / 2 + i * 8 + 4, r.H - 9, 2.5, i < k ? '#ffcc33' : '#3a2a50'); }
      else if (world.room && world.room.survive && world.surviveLeft > 0) UI.text(g, 'SURVIVE: ' + Math.ceil(world.surviveLeft), r.W / 2, r.H - 14, '#ffcc33', { align: 'center', scale: 2 });
      else if (world.phase === 'BONUS') UI.text(g, 'BONUS: ' + Math.max(0, Math.ceil(40 - (world.bonusT || 0))), r.W / 2, r.H - 14, '#5fe0a0', { align: 'center', scale: 2 });
    }
    if (!o.noReticle) reticle(g, r, world, t);
  });
};
/** "NEXT ON MASH TV": the episode's 3x3 map as broadcast graphics (k: 0..1 of the route animation) */
HUD.mapCard = (g, r, epId, run, cur, next, t, k = 1) => {
  const ep = MT.EPISODES[epId]; if (!ep) return;
  px.blend(g, .94, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#140a24'));
  for (let y = 0; y < r.H; y += 3) px.blend(g, .15, 'normal', () => px.rect(g, 0, y, r.W, 1, '#000000'));
  UI.title(g, MT.TEXT.ui.nextOn, r.W / 2, 10, 2);
  UI.text(g, 'EPISODE ' + ep.id + ': ' + ep.title, r.W / 2, 30, '#2ee6ff', { align: 'center' });
  const cw = Math.min(110, (r.W - 40) / 3), ch = Math.min(52, (r.H - 90) / 3), ox = Math.round(r.W / 2 - cw * 1.5), oy = 44;
  const pos = id => { const R = MT.ROOMS[id]; return [ox + R.cell[0] * cw + cw / 2, oy + R.cell[1] * ch + ch / 2]; };
  const path = (run && run.path) || [];
  for (const id of ep.rooms) { const R = MT.ROOMS[id]; for (const d in R.exits) { const [x0, y0] = pos(id), [x1, y1] = pos(R.exits[d]); const walked = path.includes(id) && path.includes(R.exits[d]); px.line(g, x0, y0, x1, y1, walked ? '#ffcc33' : '#3a2a50', walked ? 2 : 1); } }
  if (cur && next && MT.ROOMS[next]) { const [x0, y0] = pos(cur), [x1, y1] = pos(next); const e = E.ease.outCubic(clamp(k, 0, 1)); px.line(g, x0, y0, lerp(x0, x1, e), lerp(y0, y1, e), '#3aff6a', 3); }
  for (const id of ep.rooms) {
    const R = MT.ROOMS[id], [x, y] = pos(id), w = cw - 14, h = ch - 14, here = id === cur, nx = id === next, seen = path.includes(id);
    const bx = Math.round(x - w / 2), by = Math.round(y - h / 2);
    px.rect(g, bx, by, w, h, here ? '#3a1e5a' : seen ? '#2a1446' : '#1a0c30'); px.rect(g, bx, by, w, 1, nx ? '#3aff6a' : here ? '#ffcc33' : '#5a4a6a');
    if (here || nx) UI.bulbs(g, bx, by, w, h, t, { on: nx ? '#3aff6a' : '#ffcc33' });
    px.sprite(g, SPR.ico[MT.roomIcon(R)], bx + 3, by + 3);
    UI.text(g, id, bx + 14, by + 3, here ? '#ffcc33' : '#c9b6e4', { font: 'tiny' });
    FONT.wrap(R.name, w - 6, { font: 'tiny' }).slice(0, 2).forEach((ln, i) => UI.text(g, ln, x, by + 14 + i * 7, seen || nx ? '#fff7e8' : '#9a8aaa', { align: 'center', font: 'tiny' }));
    if (R.key && !(run && run.keyRooms || []).includes(id)) px.sprite(g, SPR.keyS, bx + w - 10, by + 3);
  }
  UI.text(g, 'KEYS ' + ((run && run.keys) || 0) + '/9', r.W / 2, r.H - 30, '#ffcc33', { align: 'center' });
};
/** an episode's title card */
HUD.episodeCard = (g, r, epId, t) => {
  const ep = MT.EPISODES[epId]; if (!ep) return;
  px.rect(g, 0, 0, r.bw, r.bh, '#140a24');
  for (let i = 0; i < 12; i++) { const a = t * .3 + i * TAU / 12; px.blend(g, .12, 'add', () => px.poly(g, [[r.W / 2, r.H / 2], [r.W / 2 + Math.cos(a) * 600, r.H / 2 + Math.sin(a) * 600], [r.W / 2 + Math.cos(a + .13) * 600, r.H / 2 + Math.sin(a + .13) * 600]], i % 2 ? '#ff2e88' : '#2ee6ff')); }
  const k = E.ease.outBounce(clamp(t / .8, 0, 1));
  UI.text(g, 'EPISODE ' + ep.id, r.W / 2, r.H * .3 - (1 - k) * 60, '#2ee6ff', { align: 'center', scale: 2 });
  UI.title(g, ep.title, r.W / 2, r.H * .3 + 22, 3);
  UI.text(g, ep.place, r.W / 2, r.H * .3 + 54, '#ffcc33', { align: 'center' });
  UI.bulbs(g, 16, 16, r.W - 32, r.H - 32, t, { step: 8 });
};

// ---- 32-screens.js ----
// ---- front-end and between-room scenes: title, menu, difficulty, lobby, how to play, episodes, scores, about,
//      the prize recap, game over and initials. Every one: big text, at most six focusable items, a prompt bar ----
const BACKDROP = { arena: null };
function backdrop(r, t, dim = .55) {
  if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio', { corner: true });
  const A = BACKDROP.arena;
  A.draw(r, t, null);
  r.overlay(g => px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')));
}
function frontStep(dt, name) {
  if (MT.idle.scene !== name || MT.idle.sceneT !== game.sceneName) { MT.idle.scene = name; MT.idle.sceneT = game.sceneName; MT.idle.reset(); }
  MT.idleStep(dt); LINES.step(1 / 120); MT.banners.step(dt); MT.studioStep(dt, null);
  if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
  game.lights.enabled = true; game.lights.ambient = .5;
  if (MT.IDLE_SCENES.includes(name) && MT.idle.t >= 10 && !(game.shell && game.shell.screen)) { MT.idle.reset(); game.go('attract', {}, { fade: 'white', seconds: .3 }); return true; }
  return false;
}
function frontCam() { if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); } game.lights.enabled = true; game.lights.ambient = .5; }
MT.frontCam = frontCam;
MT.IDLE_SCENES = ['title', 'howto', 'episodes', 'scores', 'about', 'lobby', 'difficulty'];
const FRONT = { view: 'threequarter', input: MASH_MENU, expand: true, touch: [], camera: { zoom: false } };
const scene = (o) => Object.assign({}, FRONT, o);
const versionLine = () => ((typeof E.versionLabel === 'function' ? E.versionLabel() : 'my-3D2dge ' + E.version) + '  -  MASH TV ' + MT.VERSION).replace(/·/g, '-');
const rowsLayout = (r, n, y0, w = 220, h = 20, gap = 4) => Array.from({ length: n }, (_, i) => ({ x: Math.round(r.W / 2 - w / 2), y: y0 + i * (h + gap), w, h }));
const screenWH = () => ({ W: game.screen.W || 427, H: game.screen.H || 240 });
// ------------------------------------------------------------------------------------------------ title
MT.scenes = MT.scenes || {};
MT.scenes.title = scene({
  enter(d = {}) { this.t = 0; this.phase = d.menu ? 'menu' : 'press'; this.st = { i: 0 }; MT.music.play('theme'); MT.idle.reset(); game.allowJoin(false); MT.run = MT.run && MT.run.mode === 'session' ? MT.run : null; for (const p of game.players) p.touchEnabled = false; this.touchBtn = null; },
  update(dt) {
    this.t += dt; if (frontStep(dt, 'title')) return;
    const nav = UI.nav(), touch = MT.touchOnly();
    if (touch) { const c = game.input.clicked(); if (c && this.touchBtn && UI.clickIn(this.touchBtn)) game.menu('settings'); return; }
    if (this.phase === 'press') { if (nav.confirm || nav.start || game.input.clicked()) { this.phase = 'menu'; MT.sfx('bell'); } return; }
    const items = MT.TEXT.ui.menu.map(label => ({ label })), { W, H } = screenWH();
    const res = UI.listStep(this.st, items, rowsLayout({ W, H }, items.length, Math.round(H * .44), 220, 19, 3), nav);
    if (nav.cancel) { this.phase = 'press'; MT.sfx('back'); }
    if (res.picked >= 0) {
      const k = res.picked;
      if (k === 0) game.go('difficulty', {}); else if (k === 1) game.go('episodes', {}); else if (k === 2) game.go('howto', {}); else if (k === 3) game.go('scores', { after: 'title' }); else if (k === 4) game.menu('settings'); else game.go('about', {});
    }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .45);
    r.overlay(g => {
      const k = E.ease.outBounce(clamp(this.t / 1, 0, 1)), ly = Math.round(-80 + k * (r.H * .1 + 80));
      const lh = UI.logo(g, r.W / 2, ly, r.W >= 400 ? 4 : 3, t);
      UI.text(g, MT.TEXT.ui.sub, r.W / 2, ly + lh + 4, '#2ee6ff', { align: 'center' });
      if (MT.touchOnly()) {
        const w = Math.min(r.W - 30, 300), x = r.W / 2 - w / 2, y = r.H * .52;
        UI.panel(g, x, y, w, 70); UI.bulbs(g, x, y, w, 70, t, { on: '#ff3344' });
        UI.text(g, MT.TEXT.ui.touchNotice, r.W / 2, y + 10, '#ffcc33', { align: 'center', scale: w > 280 ? 1 : 1 });
        UI.text(g, MT.TEXT.ui.touchSub, r.W / 2, y + 22, '#c9b6e4', { align: 'center', font: 'tiny' });
        const bw = 120, bh = 22, bx = Math.round(r.W / 2 - bw / 2), by = Math.round(y + 38); this.touchBtn = { x: bx, y: by, w: bw, h: bh };
        px.rect(g, bx, by, bw, bh, '#ffcc33'); UI.text(g, MT.TEXT.ui.settings, r.W / 2, by + 4, '#140a24', { align: 'center', scale: 2, shadow: false });
      } else if (this.phase === 'press') {
        if (Math.floor(t * 2) % 2 === 0) { const I = UI.lastInput(); const items = [['confirm', MT.TEXT.ui.toStart]]; const w = MT.glyph.measure(items, I, { scale: 2 }) + UI.width(MT.TEXT.ui.press, 2) + 6; const x = r.W / 2 - w / 2; UI.text(g, MT.TEXT.ui.press, x, r.H * .62, '#fff7e8', { scale: 2 }); MT.glyph.prompt(g, x + UI.width(MT.TEXT.ui.press, 2) + 6, r.H * .62 - 2, items, I, { scale: 2 }); }
      } else {
        const items = MT.TEXT.ui.menu, R = rowsLayout(r, items.length, Math.round(r.H * .44), 220, 19, 3);
        UI.panel(g, R[0].x - 8, R[0].y - 6, R[0].w + 16, R.length * 22 + 10, { alpha: .8 });
        items.forEach((label, i) => UI.row(g, R[i], label, this.st.i === i, t));
        UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
      }
      UI.text(g, versionLine(), 4, r.H - 8, '#7a6a8a', { font: 'tiny' });
    });
  },
});
// ------------------------------------------------------------------------------------------------ difficulty
MT.scenes.difficulty = scene({
  enter(d = {}) { this.st = { i: 1 }; this.d = d; },
  update(dt) {
    if (frontStep(dt, 'difficulty')) return;
    const nav = UI.nav(), keys = Object.keys(DIFF), { W, H } = screenWH();
    const res = UI.listStep(this.st, keys.map(k => ({ label: k })), rowsLayout({ W, H }, 3, 70, 300, 40, 6), nav);
    if (nav.cancel) { MT.sfx('back'); game.go(this.d.rehearsal ? 'episodes' : 'title', { menu: true }); }
    if (res.picked >= 0) game.go('lobby', Object.assign({}, this.d, { diff: keys[res.picked] }));
  },
  draw(r) {
    const t = game.real; backdrop(r, t);
    r.overlay(g => {
      UI.title(g, MT.TEXT.ui.difficulty, r.W / 2, 22, 2);
      const keys = Object.keys(DIFF), R = rowsLayout(r, 3, 70, 300, 40, 6);
      keys.forEach((k, i) => { const D = DIFF[k], f = this.st.i === i; UI.panel(g, R[i].x, R[i].y, R[i].w, R[i].h, { alpha: .85, border: f ? '#ffcc33' : '#5a4a6a' }); if (f) UI.bulbs(g, R[i].x, R[i].y, R[i].w, R[i].h, t); UI.text(g, D.label, R[i].x + 10, R[i].y + 6, f ? '#ffcc33' : '#fff7e8', { scale: 2 }); UI.text(g, D.blurb, R[i].x + 10, R[i].y + 24, '#c9b6e4'); UI.text(g, D.hp + ' HP, ' + D.lives + ' LIVES', R[i].x + R[i].w - 10, R[i].y + 8, '#5fe0a0', { align: 'right' }); });
      UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ the contestant lobby
MT.scenes.lobby = scene({
  enter(d = {}) {
    this.d = d; this.t = 0; this.count = -1; this.slots = [{ input: game.input, look: 0, ready: false }, null, null, null];
    for (const p of game.players.slice(1)) this.addSlot(p);
    game.allowJoin({ max: 4, keys: false, onJoin: q => this.addSlot(q) });
    this.rigs = [0, 1, 2, 3].map(i => makeContestantRig(i, i)); MT.music.play('theme');
  },
  exit() { game.allowJoin(false); },
  addSlot(q) { const i = this.slots.findIndex(s => !s); if (i < 0) return; this.slots[i] = { input: q, look: i, ready: false }; this.rigs[i] = makeContestantRig(i, i); MT.sfx('bell'); },
  update(dt) {
    this.t += dt;
    const anyJoined = this.slots.filter(Boolean).length > 1 || this.slots[0].ready;
    if (!anyJoined && frontStep(dt, 'lobby')) return; else if (anyJoined) { MT.idleStep(dt); LINES.step(1 / 120); if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); } }
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i]; if (!s) continue; const I = s.input;
      if (!MT.cfg.skipRigs) this.rigs[i].update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: s.ready ? 'cheer' : null, expr: s.ready ? 'smile' : null });
      if (I.pressed('left') && !s.ready) { s.look = (s.look + 3) % 4; this.rigs[i] = makeContestantRig(i, s.look); MT.sfx('blip'); }
      if (I.pressed('right') && !s.ready) { s.look = (s.look + 1) % 4; this.rigs[i] = makeContestantRig(i, s.look); MT.sfx('blip'); }
      if (I.pressed('confirm') || (I.pressed('start') && i > 0)) { if (!s.ready) { s.ready = true; MT.sfx('bell'); MT.babble.say('YES!', 'contestant' + (i + 1)); } }
      if (I.pressed('cancel')) { if (s.ready) { s.ready = false; MT.sfx('back'); this.count = -1; } else if (i === 0) { MT.sfx('back'); game.go(this.d.rehearsal ? 'episodes' : 'difficulty', this.d); return; } else { game.removePlayer(I); this.slots[i] = null; MT.sfx('back'); } }
    }
    const c = game.input.clicked(); if (c && this.rects) this.rects.forEach((R, i) => { if (!R || !this.slots[i] || this.slots[i].input !== game.input) return; if (UI.clickIn(R.l)) { const s = this.slots[i]; s.look = (s.look + 3) % 4; this.rigs[i] = makeContestantRig(i, s.look); } if (UI.clickIn(R.r)) { const s = this.slots[i]; s.look = (s.look + 1) % 4; this.rigs[i] = makeContestantRig(i, s.look); } if (UI.clickIn(R.ok)) this.slots[i].ready = true; });
    const joined = this.slots.filter(Boolean), allReady = joined.length && joined.every(s => s.ready);
    if (allReady && this.count < 0) { this.count = 2; MT.sfx('countgo'); }
    if (!allReady) this.count = -1;
    if (this.count >= 0) { this.count -= dt; if (this.count <= 0) this.start(); }
  },
  start() {
    const d = this.d, run = MT.newRun({ mode: d.rehearsal ? 'rehearsal' : 'arcade', diff: d.diff || 'CONTESTANT', ep: d.rehearsal || 1 });
    this.slots.forEach((s, i) => { if (!s) return; s.input.use(MASH_PLAY); MT.addRunPlayer({ slot: i, look: s.look, ctl: 'local', input: s.input }); });
    if (d.rehearsal && d.rehearsal > 1) game.go('play', { room: MT.EPISODES[d.rehearsal].start, intro: 'episode' });
    else game.go('play', { room: '1-1', intro: d.rehearsal ? 'episode' : 'coldOpen' });
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .5);
    r.overlay(g => {
      UI.title(g, MT.TEXT.ui.lobby, r.W / 2, 8, 2);
      if (this.d.rehearsal) UI.text(g, MT.TEXT.ui.rehearsal + ': EPISODE ' + this.d.rehearsal, r.W / 2, 28, '#2ee6ff', { align: 'center' });
      const pw = Math.min(96, (r.W - 30) / 4), ph = 150, y = 44; this.rects = [];
      for (let i = 0; i < 4; i++) {
        const x = Math.round(r.W / 2 - pw * 2 - 9 + i * (pw + 6)), s = this.slots[i], col = SLOT_COLORS[i];
        game.lights.add(0, 0, 0, 0, 0);
        UI.panel(g, x, y, pw, ph, { alpha: .82, border: s ? col : '#3a2a50' });
        px.blend(g, .25, 'add', () => px.poly(g, [[x + pw / 2 - 6, y], [x + pw / 2 + 6, y], [x + pw - 4, y + ph - 30], [x + 4, y + ph - 30]], s ? '#fff6d0' : '#3a2a50'));
        px.rect(g, x + 8, y + ph - 34, pw - 16, 8, '#c8a040'); px.rect(g, x + 8, y + ph - 34, pw - 16, 2, '#fff6b0');
        UI.text(g, 'P' + (i + 1), x + 6, y + 4, col);
        if (!s) {
          if (Math.floor(t * 2) % 2 === 0) { UI.text(g, MT.TEXT.ui.press, x + pw / 2, y + 50, '#c9b6e4', { align: 'center' }); const I = game.input; const fake = { lastDevice: 'gamepad', glyphs: I.glyphs, map: MASH_MENU, codeLabel: c2 => c2 }; MT.glyph.draw(g, x + pw / 2 - 12, y + 62, 'start', fake); UI.text(g, MT.TEXT.ui.join, x + pw / 2, y + 78, '#c9b6e4', { align: 'center' }); }
          this.rects.push(null); continue;
        }
        const L = LOOKS[s.look];
        this.rigs[i].drawPortrait(g, x + pw / 2 - 28, y + 18, 56, { zoom: 2.6, turn: .3, bg: E.tones(col).deep, frame: true });
        UI.text(g, L.name, x + pw / 2, y + 80, col, { align: 'center', scale: 2 });
        UI.text(g, MT.TEXT.contestantLines[s.look].split('!')[0].slice(0, 22), x + pw / 2, y + 98, '#c9b6e4', { align: 'center', font: 'tiny' });
        const R = { l: { x: x + 4, y: y + 40, w: 14, h: 18 }, r: { x: x + pw - 18, y: y + 40, w: 14, h: 18 }, ok: { x: x + 8, y: y + ph - 24, w: pw - 16, h: 18 } };
        this.rects.push(R);
        if (!s.ready) { UI.text(g, '<', R.l.x + 4, R.l.y + 4, '#ffcc33', { scale: 2 }); UI.text(g, '>', R.r.x + 2, R.r.y + 4, '#ffcc33', { scale: 2 }); }
        if (s.ready) { px.rect(g, R.ok.x, R.ok.y, R.ok.w, R.ok.h, '#3aff6a'); UI.text(g, MT.TEXT.ui.ready, x + pw / 2, R.ok.y + 5, '#140a24', { align: 'center', shadow: false }); }
        else { MT.glyph.prompt(g, x + pw / 2, R.ok.y + 3, [['confirm', 'READY']], s.input, { align: 'center' }); }
      }
      if (this.count >= 0) UI.title(g, MT.TEXT.ui.letsPlay + ' ' + Math.ceil(this.count), r.W / 2, y + ph + 4, 2, { colors: ['#3aff6a', '#2ee6ff'] });
      else UI.promptBar(g, r, [['left', ''], ['right', MT.TEXT.ui.look], ['confirm', MT.TEXT.ui.ready], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ how to play
MT.scenes.howto = scene({
  enter(d = {}) { this.page = 0; this.from = d.from || 'title'; },
  update(dt) {
    if (frontStep(dt, 'howto')) return;
    const nav = UI.nav(), n = MT.TEXT.howto.length;
    if (nav.right || nav.tabR || nav.confirm) { if (this.page < n - 1) { this.page++; MT.sfx('page'); } else if (nav.confirm) { game.go('title', { menu: true }); } }
    if (nav.left || nav.tabL) { if (this.page > 0) { this.page--; MT.sfx('page'); } }
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
    if (this.arrows) { if (UI.clickIn(this.arrows.r) && this.page < n - 1) this.page++; if (UI.clickIn(this.arrows.l) && this.page > 0) this.page--; }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .6);
    r.overlay(g => MT.drawHowto(g, r, this.page, t, this));
  },
});
MT.drawHowto = (g, r, page, t, self) => {
  const P = MT.TEXT.howto[page], n = MT.TEXT.howto.length, I = UI.lastInput(), w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2), y = 10, h = r.H - 44;
  UI.panel(g, x, y, w, h, { alpha: .9 });
  UI.title(g, 'HOW TO PLAY: ' + P.title, r.W / 2, y + 6, 2);
  UI.text(g, (page + 1) + ' / ' + n, x + w - 8, y + 8, '#c9b6e4', { align: 'right' });
  let yy = y + 30;
  if (P.rows) for (const [a, label] of P.rows) { const iw = MT.glyph.draw(g, x + 14, yy, a, I, { scale: 1 }); if (a === 'move' || a === 'aim') { } UI.text(g, label, x + 20 + Math.max(iw, 30), yy + 2, '#fff7e8'); yy += 18; }
  if (P.rows) { if (I.lastDevice === 'gamepad') { UI.text(g, 'FACE BUTTONS WORK TOO:', x + 14, yy + 4, '#2ee6ff'); let gx = x + 20 + UI.width('FACE BUTTONS WORK TOO:'); for (const [code, lab] of [['Pad0', 'SLIDE'], ['Pad1', 'SHOWSTOPPER'], ['Pad3', 'SHOWBOAT']]) { gx += MT.glyph.drawCode(g, gx, yy + 2, code, I) + 2; UI.text(g, lab, gx, yy + 4, '#fff7e8'); gx += UI.width(lab) + 8; } } else UI.text(g, 'ARROW KEYS FIRE IN 8 WAYS - HOLD LEFT CLICK TO FIRE AT THE MOUSE', r.W / 2, yy + 4, '#2ee6ff', { align: 'center', font: 'tiny' }); }
  if (P.text) for (const para of P.text) { for (const ln of FONT.wrap(para, w - 28)) { UI.text(g, ln, x + 14, yy, '#fff7e8'); yy += 10; } yy += 6; }
  if (P.items) for (const id of P.items) { const W2 = WEAPONS[id]; if (id === 'bomb') px.sprite(g, SPR.bulb, x + 14, yy); else if (id === 'life') px.sprite(g, SPR.star, x + 13, yy); else { px.sprite(g, SPR.tv, x + 12, yy - 1); UI.text(g, W2.letter, x + 18, yy + 4, W2.color, { align: 'center', shadow: false }); } UI.text(g, W2.name, x + 32, yy, W2.color || '#ffcc33'); UI.text(g, W2.blurb, x + 32, yy + 9, '#c9b6e4', { font: 'tiny' }); yy += 26; }
  if (P.extra) for (const para of P.extra) for (const ln of FONT.wrap(para, w - 28)) { UI.text(g, ln, x + 14, yy, '#2ee6ff'); yy += 10; }
  if (self) self.arrows = { l: { x: x, y: y + h / 2 - 10, w: 16, h: 20 }, r: { x: x + w - 16, y: y + h / 2 - 10, w: 16, h: 20 } };
  if (page > 0) UI.text(g, '<', x + 4, y + h / 2 - 6, '#ffcc33', { scale: 2 }); if (page < n - 1) UI.text(g, '>', x + w - 12, y + h / 2 - 6, '#ffcc33', { scale: 2 });
  UI.promptBar(g, r, [['left', ''], ['right', 'PAGE'], ['cancel', MT.TEXT.ui.back]]);
};
// ------------------------------------------------------------------------------------------------ episodes (rehearsals)
MT.scenes.episodes = scene({
  enter() { this.st = { i: 0 }; this.best = E.store.get('mashtv:eps', 1); },
  update(dt) {
    if (frontStep(dt, 'episodes')) return;
    const nav = UI.nav(), items = [1, 2, 3].map(k => ({ label: MT.EPISODES[k].title, disabled: k > this.best })), { W, H } = screenWH();
    const res = UI.listStep(this.st, items, rowsLayout({ W, H }, 3, 64, 300, 40, 8), nav);
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
    if (res.picked >= 0) game.go('difficulty', { rehearsal: res.picked + 1 });
  },
  draw(r) {
    const t = game.real; backdrop(r, t);
    r.overlay(g => {
      UI.title(g, 'EPISODES', r.W / 2, 14, 2); UI.text(g, 'REHEARSALS: SAME RULES, NO TOP EARNERS ENTRY', r.W / 2, 36, '#2ee6ff', { align: 'center', font: 'tiny' });
      const R = rowsLayout(r, 3, 64, 300, 40, 8);
      [1, 2, 3].forEach((k, i) => { const ep = MT.EPISODES[k], lock = k > this.best, f = this.st.i === i; UI.panel(g, R[i].x, R[i].y, R[i].w, R[i].h, { alpha: .85, border: f ? '#ffcc33' : '#5a4a6a' }); if (f) UI.bulbs(g, R[i].x, R[i].y, R[i].w, R[i].h, t); UI.text(g, 'EPISODE ' + k, R[i].x + 10, R[i].y + 5, lock ? '#6a5a7a' : '#2ee6ff'); UI.text(g, lock ? MT.TEXT.ui.locked : ep.title, R[i].x + 10, R[i].y + 17, lock ? '#6a5a7a' : f ? '#ffcc33' : '#fff7e8', { scale: 2 }); if (!lock) UI.text(g, ep.place, R[i].x + R[i].w - 10, R[i].y + 6, '#c9b6e4', { align: 'right', font: 'tiny' }); });
      UI.promptBar(g, r, [['confirm', MT.TEXT.ui.select], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ top earners
MT.scenes.scores = scene({
  enter(d = {}) { this.after = d.after || 'title'; this.t = 0; this.attract = !!d.attract; },
  update(dt) {
    this.t += dt; if (!this.attract && frontStep(dt, 'scores')) return;
    if (this.attract) { MT.idleStep(dt); return; }
    const nav = UI.nav(); if ((nav.cancel || nav.confirm || game.input.clicked()) && this.t > .12) { MT.sfx('back'); game.go(this.after, { menu: true }); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .6);
    r.overlay(g => { const w = Math.min(r.W - 40, 260), x = r.W / 2 - w / 2; UI.panel(g, x, 8, w, r.H - 40, { bg: ['#5a3a10', '#2a1446'] }); UI.bulbs(g, x, 8, w, r.H - 40, t); });
    MT.cab.drawTable(r, 'show', 16, MT.TEXT.ui.scores);
    if (!this.attract) r.overlay(g => UI.promptBar(g, r, [['confirm', 'OK'], ['cancel', MT.TEXT.ui.back]]));
  },
});
// ------------------------------------------------------------------------------------------------ about & credits (paged)
MT.aboutPages = () => {
  const A = MT.ABOUT, pages = [];
  pages.push({ title: 'WHAT IS MASH TV?', lines: A.what });
  pages.push({ title: 'CREDITS', lines: MT.TEXT.credits.filter(Boolean) });
  const si = A.exitInterview.sourceInformation, labels = { date: 'DATE', source: 'SOURCE', plan: 'PLAN', genre: 'GENRE', perspective: 'PERSPECTIVE', tech: 'TECH', artDirection: 'ART DIRECTION', animation: 'ANIMATION', audio: 'AUDIO', online: 'ONLINE', testing: 'TESTING', research: 'RESEARCH', environment: 'ENVIRONMENT', model: 'MODEL', usage: 'USAGE' };
  pages.push({ title: 'SOURCE INFORMATION', pairs: Object.keys(labels).map(k => [labels[k], si[k]]) });
  const qa = (title, qs, ans) => pages.push({ title, pairs: qs.map((q, i) => [q, ans[i]]) });
  qa('TESTING FEEDBACK', A.questions.testing, A.exitInterview.testingFeedback);
  qa('ENGINE FEEDBACK', A.questions.engine, A.exitInterview.engineFeedback);
  qa('PROMPT FEEDBACK', A.questions.prompt, A.exitInterview.promptFeedback);
  return pages;
};
/** split pages into screens that fit (no dense web-style walls of text) */
MT.aboutScreens = (W, H) => {
  const out = [], maxW = Math.min(W - 40, 380), lines = Math.floor((H - 70) / 9);
  for (const p of MT.aboutPages()) {
    const rows = [];
    if (p.lines) for (const l of p.lines) for (const ln of FONT.wrap(l, maxW)) rows.push([ln, '#fff7e8']);
    if (p.pairs) for (const [k, v] of p.pairs) { for (const ln of FONT.wrap(k, maxW)) rows.push([ln, '#ffcc33']); for (const ln of FONT.wrap(String(v), maxW - 8)) rows.push(['  ' + ln, '#fff7e8']); rows.push(['', '']); }
    for (let i = 0, k = 0; i < rows.length; i += lines, k++) out.push({ title: p.title + (rows.length > lines ? ' (' + (k + 1) + '/' + Math.ceil(rows.length / lines) + ')' : ''), rows: rows.slice(i, i + lines), section: p.title });
  }
  return out;
};
MT.scenes.about = scene({
  enter() { this.page = 0; },
  update(dt) {
    if (frontStep(dt, 'about')) return;
    const { W, H } = screenWH(), n = MT.aboutScreens(W, H).length, nav = UI.nav();
    if (nav.right || nav.tabR || nav.confirm) { if (this.page < n - 1) { this.page++; MT.sfx('page'); } }
    if (nav.left || nav.tabL) { if (this.page > 0) { this.page--; MT.sfx('page'); } }
    if (nav.down && this.page < n - 1) this.page++; if (nav.up && this.page > 0) this.page--;
    if (nav.cancel) { MT.sfx('back'); game.go('title', { menu: true }); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .7);
    r.overlay(g => {
      const S = MT.aboutScreens(r.W, r.H), p = S[Math.min(this.page, S.length - 1)], w = Math.min(r.W - 20, 400), x = Math.round(r.W / 2 - w / 2);
      UI.panel(g, x, 6, w, r.H - 34, { alpha: .92 });
      UI.text(g, p.title, r.W / 2, 12, '#ff2e88', { align: 'center', scale: 1 });
      UI.text(g, (this.page + 1) + '/' + S.length, x + w - 8, 12, '#7a6a8a', { align: 'right', font: 'tiny' });
      p.rows.forEach(([ln, c], i) => UI.text(g, ln, x + 10, 28 + i * 9, c));
      UI.promptBar(g, r, [['left', ''], ['right', 'PAGE'], ['cancel', MT.TEXT.ui.back]]);
    });
  },
});
// ------------------------------------------------------------------------------------------------ the prize recap
MT.scenes.recap = scene({
  enter(d = {}) {
    this.ep = d.ep || (MT.run && MT.run.ep) || 1; this.t = 0; this.k = 0; this.step = 0; this.done = false; this.finished = false; this.fake = !!d.fake;
    if (!MT.run) { MT.newRun({ mode: 'test' }); MT.addRunPlayer({ slot: 0, input: game.input }); }
    const run = MT.run; run.recaps = (run.recaps || 0) + 1;
    this.cols = run.contestants.map(c => ({ c, prizes: c.pr.prizes.slice(c.pr.recapFrom || 0), shown: 0, total: 0, shownCash: 0 }));
    if (this.fake) this.cols.forEach(col => { col.prizes = MT.TEXT.prizes[this.ep].slice(0, 3).map(p => ({ name: p.name, value: p.value, icon: p.icon, line: p.line })); });
    for (const col of this.cols) col.c.pr.recapFrom = col.c.pr.prizes.length;
    this.penny = makePenny(); MT.music.play('recap');
    LINES.clear(); LINES.seq(this.ep === 3 ? 'recap3' : 'recap');
    this.queue = []; for (const col of this.cols) col.prizes.forEach((p, i) => this.queue.push({ col, i }));
    this.mvp = this.cols.slice().sort((a, b) => (b.c.pr.epCash || 0) - (a.c.pr.epCash || 0))[0];
    this.next = 2.2;
  },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); frontCam();
    if (!MT.cfg.skipRigs) this.penny.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: Math.floor(this.t) % 2 ? 'wave' : 'hips', expr: 'smile' });
    const nav = UI.nav(), fast = nav.holdConfirm;
    if (nav.confirm) { LINES.skip(); this.next = Math.min(this.next, .05); }
    for (const col of this.cols) { const target = col.prizes.slice(0, col.shown).reduce((a, p) => a + p.value, 0); col.shownCash = approach(col.shownCash, target, Math.max(500, target) * dt * (fast ? 8 : 2)); }
    this.next -= dt * (fast ? 6 : 1);
    if (this.next <= 0) {
      if (this.step < this.queue.length) { const q = this.queue[this.step++]; q.col.shown++; MT.sfx('bell'); const p = q.col.prizes[q.i]; if (!fast) LINES.say('PENNY', p.line, 3); this.next = fast ? .25 : 1.6; }
      else if (!this.done) { this.done = true; this.mvpT = 0; MT.music.sting('clear'); MT.babble.crowd('applause', 1); LINES.seq(this.ep === 1 ? 'recap1End' : this.ep === 2 ? 'recap2End' : 'recap3'); this.next = fast ? .5 : 3; }
      else this.finish();
    }
  },
  finish() {
    if (this.finished) return; this.finished = true;
    const run = MT.run; for (const c of run.contestants) c.pr.epCash = 0;
    if (this.fake || run.mode === 'test' && !run.contestants.length) { game.go('title', {}); return; }
    if (this.ep < 3) { run.ep = this.ep + 1; game.go('play', { room: MT.EPISODES[this.ep + 1].start, intro: 'episode' }); }
    else if ((run.keys || 0) >= 5) game.go('play', { room: 'GR', intro: 'greenroom' });
    else game.go('ending', { kind: 'a' });
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .55);
    r.overlay(g => {
      UI.title(g, 'PRIZE RECAP', r.W / 2, 6, 2); UI.text(g, 'EPISODE ' + this.ep + ': ' + MT.EPISODES[this.ep].title, r.W / 2, 26, '#2ee6ff', { align: 'center' });
      if (!MT.cfg.skipRigs) { px.ell(g, 34, r.H - 42, 26, 6, '#c8a040'); px.ell(g, 34, r.H - 44, 22, 4, '#5a3a10'); this.penny.drawPortrait(g, 8, r.H - 106, 52, { zoom: 2.4, turn: .3, bg: '#1ab0b0', frame: true }); UI.text(g, 'PENNY PRIZE', 34, r.H - 52, '#ff8ad8', { align: 'center', font: 'tiny' }); }
      const n = this.cols.length, cw = Math.min(110, (r.W - 90) / Math.max(1, n));
      this.cols.forEach((col, i) => {
        const x = Math.round(70 + i * (cw + 4)), y = 38, h = r.H - 80, c = col.c, color = SLOT_COLORS[c.slot];
        UI.panel(g, x, y, cw, h, { alpha: .85, border: color });
        if (!MT.cfg.skipRigs) c.rig.drawPortrait(g, x + 4, y + 4, 20, { zoom: 1.6, turn: .4, bg: E.tones(color).deep });
        UI.text(g, c.pr.name, x + 28, y + 6, color); UI.text(g, money(col.shownCash), x + 28, y + 16, '#ffcc33', { font: 'tiny' });
        col.prizes.slice(0, col.shown).slice(-Math.floor((h - 40) / 22)).forEach((p, k) => { const yy = y + 30 + k * 22; if (SPR.prize[p.icon]) px.sprite(g, SPR.prize[p.icon], x + 4, yy); FONT.wrap(p.name, cw - 22, { font: 'tiny' }).slice(0, 2).forEach((ln, j) => UI.text(g, ln, x + 18, yy + j * 6, '#fff7e8', { font: 'tiny' })); UI.text(g, money(p.value), x + cw - 4, yy + 13, '#5fe0a0', { align: 'right', font: 'tiny' }); });
        if (!col.prizes.length) UI.text(g, 'NO PRIZES... YET!', x + cw / 2, y + 40, '#7a6a8a', { align: 'center', font: 'tiny' });
      });
      if (this.done && this.mvp) { const k = E.ease.outBack(clamp((this.next < 3 ? 3 - this.next : 0) / .5, 0, 1)); UI.title(g, fill(MT.TEXT.ui.mvp, { NAME: this.mvp.c.pr.name }), r.W / 2, r.H - 40 - (1 - k) * 10, 2, { colors: ['#ffcc33', '#ff9a3c'] }); }
      UI.promptBar(g, r, [['confirm', 'FASTER (HOLD: SKIP)']]);
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
});
// ------------------------------------------------------------------------------------------------ game over
MT.scenes.gameover = scene({
  enter() { this.t = 0; MT.music.play(null); MT.music.sting('gameover'); LINES.clear(); LINES.seq('gameOver'); this.rigs = (MT.run ? MT.run.contestants : []).map(c => makeContestantRig(c.slot, c.pr.look)); },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); frontCam();
    if (!MT.cfg.skipRigs) this.rigs.forEach((rg, i) => rg.update(dt, { x: AR.CX + (i - (this.rigs.length - 1) / 2) * 30, y: 132, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'down', down: 1, expr: 'wince' }));
    const nav = UI.nav(); if (nav.confirm) LINES.skip();
    if (this.t > 2 && (!LINES.busy() || nav.holdConfirm) || this.t > 14) MT.finishRun();
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .45);
    this.rigs.forEach((rg, i) => { const x = AR.CX + (i - (this.rigs.length - 1) / 2) * 30; r.shadow(x, 132, 9, .5); r.actor(x, 132, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view), {}); });
    game.lights.add(AR.CX, 130, 0, 90, 1, { color: '#fff6d0' });
    r.overlay(g => {
      px.blend(g, .3, 'add', () => px.poly(g, [[r.W / 2 - 10, 0], [r.W / 2 + 10, 0], [r.W / 2 + 80, r.H * .7], [r.W / 2 - 80, r.H * .7]], '#fff6d0'));
      UI.title(g, MT.TEXT.ui.wrap, r.W / 2, r.H * .14, 3, { colors: ['#ff3344', '#7a1020'] });
      const run = MT.run; if (run) run.contestants.forEach((c, i) => { const x = r.W / 2 + (i - (run.contestants.length - 1) / 2) * 70; UI.text(g, c.pr.name, x, r.H * .62, SLOT_COLORS[c.slot], { align: 'center' }); UI.text(g, 'WOULD HAVE WON ' + money(c.pr.cash + c.pr.prizes.reduce((a, p) => a + p.value, 0) * 2), x, r.H * .62 + 10, '#ffcc33', { align: 'center', font: 'tiny' }); });
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
});
// ------------------------------------------------------------------------------------------------ initials (each qualifying contestant, with their own input)
MT.scenes.initials = scene({
  enter(d = {}) { this.queue = (d.queue || []).slice(); this.cur = null; this.t = 0; MT.music.play('ending'); this.nextEntry(); },
  nextEntry() {
    this.cur = this.queue.shift() || null;
    if (!this.cur) { game.go('scores', { after: 'title' }); return; }
    const I = this.cur.input || game.input; I.use(MASH_MENU);
    MT.cab.enter(this.cur.cash, 'show', name => { this.cur.done = name; this.t = 0; this.nextEntry(); }, I);
  },
  update(dt) { this.t += dt; MT.cab.update(dt); frontCam(); },
  draw(r) {
    const t = game.real; backdrop(r, t, .7);
    const e = MT.cab.entry, cur = this.cur;
    r.overlay(g => {
      if (!e || !cur) return;
      const col = SLOT_COLORS[cur.slot], w = 240, x = r.W / 2 - w / 2, y = r.H * .12;
      UI.panel(g, x, y, w, 150, { border: col }); UI.bulbs(g, x, y, w, 150, t, { on: col });
      UI.title(g, 'TOP EARNER!', r.W / 2, y + 8, 2); UI.text(g, 'P' + (cur.slot + 1) + ' ' + cur.name + '  ' + money(cur.cash), r.W / 2, y + 30, col, { align: 'center' });
      const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! '.split('');
      for (let i = 0; i < 3; i++) { const cx = r.W / 2 + (i - 1) * 34, on = e.i === i, ch = L[e.name[i]] || '?'; px.rect(g, cx - 13, y + 50, 26, 34, on ? '#3a1e5a' : '#1a0c30'); if (on) UI.bulbs(g, cx - 13, y + 50, 26, 34, t); UI.text(g, ch, cx + 1, y + 57, on ? '#ffcc33' : '#fff7e8', { align: 'center', scale: 3 }); if (on) { UI.text(g, '↑', cx, y + 40, '#ffcc33', { align: 'center' }); UI.text(g, '↓', cx, y + 88, '#ffcc33', { align: 'center' }); } }
      MT.glyph.prompt(g, r.W / 2, y + 112, [['dpad', 'LETTER'], ['confirm', 'NEXT']], cur.input || game.input, { align: 'center' });
    });
  },
});

// ---- 33-dev.js ----
// ---- dev mode (pause menu → Dev mode; standalone only): live tuning sliders, cheats, actions, warps, spawns, debug ----
const DEV = MT.dev = { open_: false, tab: 0, sel: [0, 0, 0, 0, 0, 0], scroll: [0, 0, 0, 0, 0, 0], freeze: true, step: 0, msg: '', msgT: 0, dbg: { hitboxes: false, targets: false, timeline: false, stats: false, doors: false, camera: false }, giveW: 0, giveA: 0, spawnK: 0, spawnN: 0, spawnW: 0, pickK: 0, confirmReset: false };
const TABS = ['TUNING', 'CHEATS', 'ACTIONS', 'WARP', 'SPAWN', 'DEBUG'];
const CHEAT_LABELS = { god: 'GOD MODE (ALL CONTESTANTS)', infBombs: 'INFINITE SHOWSTOPPERS', oneHit: 'ONE-HIT KILLS', freeze: 'FREEZE ENEMIES', noclip: 'NO CLIP', autopilot: 'AUTOPILOT P1 (THE BOT DRIVES)', botPartner: 'BOT PARTNER', muteHost: 'MUTE HOST CHATTER' };
const SPAWN_WHERE = ['N', 'E', 'S', 'W', 'drop', 'audience', 'reticle'], SPAWN_N = [1, 5, 10];
const PICK_KINDS = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life'];
const WARPS = () => ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', 'GR', 'L1', 'L2', 'L3', 'LB',
  'COLD OPEN', 'EPISODE CARD 1', 'EPISODE CARD 2', 'EPISODE CARD 3', 'PRIZE RECAP 1', 'PRIZE RECAP 2', 'PRIZE RECAP 3', 'CONTINUE', 'GAME OVER', 'INITIALS', 'ENDING A', 'ENDING B', 'CREDITS', 'SESSION CARD PREVIEW'];
DEV.isOpen = () => DEV.open_;
DEV.frozen = () => DEV.open_ && DEV.freeze && !DEV.stepping;
DEV.open = () => { if (MT.sessionActive() || !MT.run || MT.run.mode === 'attract') return false; DEV.open_ = true; MT.overlay.open = true; MT.overlay.who = 'dev'; const s = game.scene; if (s) { DEV._pausable = s.pausable; s.pausable = false; } MT.sfx('bell'); return true; };
DEV.close = (quiet) => { if (!DEV.open_) return; DEV.open_ = false; if (MT.overlay.who === 'dev') MT.overlay.open = false; const s = game.scene; if (s && DEV._pausable !== undefined) s.pausable = DEV._pausable; DEV._pausable = undefined; if (!quiet) MT.sfx('back'); };
const say = m => { DEV.msg = m; DEV.msgT = 3; };
const markDev = () => { if (MT.run) MT.run.devTouched = true; };
function rowsFor(tab) {
  const w = PLAY.world;
  if (tab === 0) return [{ kind: 'toggle', label: 'FREEZE THE GAME', get: () => DEV.freeze, set: v => { DEV.freeze = v; } }].concat(TDEF.map(d => ({ kind: 'slider', d, label: d.label, group: d.group }))).concat([{ kind: 'action', label: DEV.confirmReset ? 'PRESS AGAIN TO RESET ALL' : 'RESET ALL TO DEFAULTS', fn: () => { if (!DEV.confirmReset) { DEV.confirmReset = true; return; } DEV.confirmReset = false; MT.resetTunes(); say('EVERY TUNING IS BACK TO ITS DEFAULT'); } }]);
  if (tab === 1) return Object.keys(CHEAT_LABELS).map(k => ({ kind: 'toggle', label: CHEAT_LABELS[k], get: () => MT.cheats[k], set: v => { MT.cheats[k] = v; markDev(); if (k === 'botPartner') botPartner(v); } }));
  if (tab === 2) return [
    { kind: 'action', label: 'KILL ALL ENEMIES', fn: () => { game.debug.killAll(); markDev(); } },
    { kind: 'action', label: 'CLEAR THE ROOM (TO THE EXITS)', fn: () => { game.debug.clearRoom(); markDev(); } },
    { kind: 'action', label: 'NEXT ROOM (FIRST EXIT)', fn: () => { nextRoom(); markDev(); } },
    { kind: 'action', label: 'RESTART THE ROOM', fn: () => { if (MT.run && MT.run.roomId) { PLAY.load(MT.run.roomId, w ? w.entry : 'S'); say('ROOM RESTARTED'); } } },
    { kind: 'choice', label: 'GIVE WEAPON', opts: () => ['spread', 'rockets', 'popcorn', 'laser'], idx: () => DEV.giveW, setIdx: i => { DEV.giveW = i; }, fn: () => { game.debug.give(['spread', 'rockets', 'popcorn', 'laser'][DEV.giveW]); markDev(); } },
    { kind: 'choice', label: 'GIVE ADD-ON', opts: () => ['records', 'shield', 'speed'], idx: () => DEV.giveA, setIdx: i => { DEV.giveA = i; }, fn: () => { game.debug.give(['records', 'shield', 'speed'][DEV.giveA]); markDev(); } },
    { kind: 'action', label: '+1 LIFE', fn: () => { game.debug.give('life'); markDev(); } },
    { kind: 'action', label: '+1 SHOWSTOPPER', fn: () => { const c = MT.run.contestants[0]; if (c) c.pr.bombs = Math.min(3, c.pr.bombs + 1); markDev(); } },
    { kind: 'action', label: '+$100,000', fn: () => { const c = MT.run.contestants[0]; if (c) c.pr.cash += 100000; markDev(); } },
    { kind: 'action', label: '+1 GOLDEN KEY', fn: () => { MT.run.keys = (MT.run.keys || 0) + 1; markDev(); } },
    { kind: 'action', label: 'MAX RATINGS', fn: () => { if (w) w.ratings.R = 99; markDev(); } },
    { kind: 'action', label: 'TRIGGER PRIME TIME', fn: () => { if (w) { w.ratings.primeCD = 0; w.startPrime(); } markDev(); } },
    { kind: 'action', label: 'TRIGGER A RATINGS STUNT', fn: () => { if (w) w.stunt(); markDev(); } },
    { kind: 'action', label: 'FRAME STEP (1/30 S)', fn: () => { DEV.step = 1 / 30; } },
    { kind: 'action', label: 'EXPORT TUNING', fn: () => { const j = MT.exportTuning(); say(j); if (typeof console !== 'undefined') console.log('MASH TV tuning:', j); DEV.exported = j; } },
  ];
  if (tab === 3) return WARPS().map(t => ({ kind: 'action', label: MT.ROOMS[t] ? t + '  ' + MT.ROOMS[t].name : t, fn: () => DEV.warp(t) }));
  if (tab === 4) return [
    { kind: 'choice', label: 'ENEMY', opts: () => Object.keys(ENEMIES).filter(k => !ENEMIES[k].child), idx: () => DEV.spawnK, setIdx: i => { DEV.spawnK = i; } },
    { kind: 'choice', label: 'HOW MANY', opts: () => SPAWN_N.map(String), idx: () => DEV.spawnN, setIdx: i => { DEV.spawnN = i; } },
    { kind: 'choice', label: 'WHERE', opts: () => SPAWN_WHERE, idx: () => DEV.spawnW, setIdx: i => { DEV.spawnW = i; } },
    { kind: 'action', label: 'SPAWN!', fn: () => devSpawn() },
    { kind: 'choice', label: 'PICKUP', opts: () => PICK_KINDS, idx: () => DEV.pickK, setIdx: i => { DEV.pickK = i; } },
    { kind: 'action', label: 'DROP PICKUP AT P1', fn: () => { const c = MT.run.contestants[0]; if (w && c) w.addPickup(MT.makePickup(PICK_KINDS[DEV.pickK], c.x + 20, c.y)); markDev(); } },
  ];
  return Object.keys(DEV.dbg).map(k => ({ kind: 'toggle', label: { hitboxes: 'HITBOXES', targets: 'AI TARGETS AND STATES', timeline: 'WAVE TIMELINE', stats: 'STATS (FPS, ENTITIES)', doors: 'DOOR STATES', camera: 'CAMERA BOUNDS' }[k], get: () => DEV.dbg[k], set: v => { DEV.dbg[k] = v; } }));
}
function botPartner(on) {
  const run = MT.run, w = PLAY.world; if (!run) return;
  if (on) { if (run.contestants.some(c => c.devBot)) return; const c = game.debug.addBot(); if (c) { c.devBot = true; } }
  else { const c = run.contestants.find(q => q.devBot); if (c) { E.prune(run.contestants, q => q === c); E.prune(run.players, p => p === c.pr); if (w) E.prune(w.contestants, q => q === c); } }
}
function nextRoom() { const w = PLAY.world; if (!w) return; if (w.phase !== 'EXIT') { game.debug.clearRoom(); w.roomClear(); w.openExits(); } const d = DOOR_IDS.find(k => w.arena.doors[k].state === 'exit' || w.arena.doors[k].isExit); if (d) { w.arena.doors[d].state = 'exit'; w.chooseExit(d, w.contestants[0]); } else if (w.room && (w.room.type === 'boss' || w.room.type === 'bonus')) { w.outcome = { done: true }; } }
function devSpawn() {
  const w = PLAY.world; if (!w) return; const kind = Object.keys(ENEMIES).filter(k => !ENEMIES[k].child)[DEV.spawnK], n = SPAWN_N[DEV.spawnN], where = SPAWN_WHERE[DEV.spawnW];
  if (where === 'reticle') { const m = game.mouseGround() || [AR.CX, AR.CY]; for (let i = 0; i < n; i++) w.spawnEnemy(kind, clamp(m[0] + i * 6, AR.X0 + 8, AR.X1 - 8), clamp(m[1], AR.Y0 + 8, AR.Y1 - 8), { inside: true }); }
  else MT.spawnEntry(w, [where, kind, n, .15]);
  markDev(); say('SPAWNED ' + n + ' ' + kind.toUpperCase());
}
/** warp anywhere: rooms, the Green Room, the Lightning Round, and the scenes */
DEV.warp = (t, o = {}) => {
  DEV.close(true);
  if (!MT.run || MT.run.mode === 'attract') MT.warpRun(Object.assign({ mode: 'rehearsal' }, o));
  MT.run.devTouched = true;
  if (MT.ROOMS[t]) { if (t === 'GR') { MT.run.keys = Math.max(5, MT.run.keys || 0); game.go('play', { room: 'GR', intro: 'greenroom' }); } else game.go('play', { room: t }); return true; }
  const m = /^EPISODE CARD (\d)$/.exec(t), rc = /^PRIZE RECAP (\d)$/.exec(t);
  if (t === 'COLD OPEN') game.go('play', { room: '1-1', intro: 'coldOpen' });
  else if (m) game.go('play', { room: MT.EPISODES[+m[1]].start, intro: 'episode' });
  else if (rc) game.go('recap', { ep: +rc[1], fake: true });
  else if (t === 'CONTINUE') game.go('play', { room: '1-1', after: w => { for (const c of w.contestants) { c.pr.lives = 0; c.state = 'out'; } } });
  else if (t === 'GAME OVER') game.go('gameover', {});
  else if (t === 'INITIALS') game.go('initials', { queue: [{ slot: 0, cash: 123450, input: game.input, name: 'ROCKET' }] });
  else if (t === 'ENDING A') game.go('ending', { kind: 'a' });
  else if (t === 'ENDING B') game.go('ending', { kind: 'b' });
  else if (t === 'CREDITS') game.go('ending', { kind: 'a', credits: true });
  else if (t === 'SESSION CARD PREVIEW') game.go('sessionCard', { preview: true });
  else return false;
  return true;
};
const VISIBLE = 7;
DEV.update = dt => {
  DEV.msgT = Math.max(0, DEV.msgT - dt); DEV.stepping = false;
  if (DEV.step > 0) { DEV.stepping = true; DEV.step = Math.max(0, DEV.step - dt); }
  const nav = UI.nav();
  if (nav.cancel) { DEV.close(); return; }
  if (nav.tabL) { DEV.tab = (DEV.tab + TABS.length - 1) % TABS.length; MT.sfx('page'); DEV.confirmReset = false; }
  if (nav.tabR) { DEV.tab = (DEV.tab + 1) % TABS.length; MT.sfx('page'); DEV.confirmReset = false; }
  const rows = rowsFor(DEV.tab), t = DEV.tab;
  let i = DEV.sel[t] = clamp(DEV.sel[t], 0, rows.length - 1);
  if (nav.up) { i = (i + rows.length - 1) % rows.length; MT.sfx('blip'); }
  if (nav.down) { i = (i + 1) % rows.length; MT.sfx('blip'); }
  // mouse: hover selects, a click on a tab switches, on a slider's bar sets it
  const L = DEV.layout, I = game.input, p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
  if (L) {
    const moved = p && DEV._p && (DEV._p[0] !== p[0] || DEV._p[1] !== p[1]); DEV._p = p ? p.slice() : null;
    if (moved) L.rows.forEach((R, k) => { if (R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h) i = R.idx; });
    if (c) { L.tabs.forEach((R, k) => { if (c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) { DEV.tab = k; } }); }
  }
  DEV.sel[t] = i;
  if (DEV.sel[t] < DEV.scroll[t]) DEV.scroll[t] = DEV.sel[t]; if (DEV.sel[t] >= DEV.scroll[t] + VISIBLE) DEV.scroll[t] = DEV.sel[t] - VISIBLE + 1;
  const row = rows[i]; if (!row) return;
  const wheel = MT.wheelTake ? MT.wheelTake() : 0;
  if (row.kind === 'slider') {
    const d = row.d; let v = MT.T[d.key];
    if (nav.left || wheel < 0) v -= d.step; if (nav.right || wheel > 0) v += d.step;
    if (nav.reset) v = d.def;
    if (L && c) { const R = L.rows.find(q => q && q.idx === i); if (R && R.bar && c[0] >= R.bar.bx - 2 && c[0] <= R.bar.bx + R.bar.bw + 2 && c[1] >= R.y && c[1] < R.y + R.h) v = d.min + (d.max - d.min) * clamp((c[0] - R.bar.bx) / R.bar.bw, 0, 1); }
    if (v !== MT.T[d.key]) { MT.setTune(d.key, v); markDev(); MT.sfx('slider'); }
  } else if (row.kind === 'toggle') { if (nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) { row.set(!row.get()); MT.sfx('bell'); } if (nav.reset) row.set(false); }
  else if (row.kind === 'choice') { const n = row.opts().length; if (nav.left || wheel < 0) row.setIdx((row.idx() + n - 1) % n); if (nav.right || wheel > 0) row.setIdx((row.idx() + 1) % n); if ((nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) && row.fn) { row.fn(); MT.sfx('bell'); } }
  else if (row.kind === 'action') { if (nav.confirm || (L && c && L.rows.some(q => q && q.idx === i && c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h))) { MT.sfx('bell'); row.fn(); } }
};
DEV.draw = r => {
  r.overlay(g => {
    const t = game.real, x = Math.round(r.W * .55) - 4, w = r.W - x - 4, y = 4, h = r.H - 8;
    px.blend(g, .93, 'normal', () => px.rect(g, x, y, w, h, '#140a24'));
    px.rect(g, x, y, w, 1, '#ff9a3c'); px.rect(g, x, y, 1, h, '#ff9a3c');
    UI.text(g, 'DEV MODE', x + 6, y + 3, '#ff9a3c'); UI.text(g, DEV.freeze ? 'FROZEN' : 'LIVE', x + 12 + UI.width('DEV MODE'), y + 3, DEV.freeze ? '#2ee6ff' : '#3aff6a');
    const L = DEV.layout = { tabs: [], rows: [] };
    let tx = x + 4; TABS.forEach((T2, k) => { const tw2 = UI.width(T2) * 0 + Math.floor((w - 8) / TABS.length); const R = { x: tx, y: y + 13, w: tw2 - 1, h: 11 }; L.tabs.push(R); px.rect(g, R.x, R.y, R.w, R.h, k === DEV.tab ? '#ff9a3c' : '#2a1446'); UI.text(g, T2.slice(0, Math.max(4, Math.floor(tw2 / 4))), R.x + R.w / 2, R.y + 2, k === DEV.tab ? '#140a24' : '#c9b6e4', { align: 'center', shadow: false, font: 'tiny' }); tx += tw2; });
    const rows = rowsFor(DEV.tab), s0 = DEV.scroll[DEV.tab], rh = Math.floor((h - 64) / VISIBLE);
    let lastGroup = null;
    for (let k = s0; k < Math.min(rows.length, s0 + VISIBLE); k++) {
      const row = rows[k], R = { x: x + 4, y: y + 28 + (k - s0) * rh, w: w - 8, h: rh - 2, idx: k }, f = DEV.sel[DEV.tab] === k;
      if (row.kind === 'slider') {
        const d = row.d, v = MT.T[d.key], changed = v !== d.def;
        R.bar = UI.slider(g, R, (row.group !== lastGroup ? row.group + ': ' : '') + d.label, v, d.min, d.max, f, t, (changed ? '*' : '') + (+v.toFixed(2)));
        lastGroup = row.group;
      } else {
        if (f) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
        UI.text(g, row.label, R.x + 6, R.y + Math.round(R.h / 2 - 3), f ? '#ffcc33' : '#fff7e8');
        if (row.kind === 'toggle') { const on = row.get(); px.rect(g, R.x + R.w - 26, R.y + R.h / 2 - 4, 20, 8, on ? '#3aff6a' : '#3a2a50'); px.rect(g, R.x + R.w - (on ? 13 : 25), R.y + R.h / 2 - 3, 6, 6, '#fff7e8'); }
        if (row.kind === 'choice') UI.text(g, '< ' + String(row.opts()[row.idx()]).toUpperCase() + ' >', R.x + R.w - 6, R.y + Math.round(R.h / 2 - 3), '#2ee6ff', { align: 'right' });
      }
      L.rows.push(R);
    }
    if (rows.length > VISIBLE) { const sh = h - 64, kk = s0 / Math.max(1, rows.length - VISIBLE); px.rect(g, x + w - 3, y + 28, 2, sh, '#2a1446'); px.rect(g, x + w - 3, y + 28 + Math.round(kk * (sh - 12)), 2, 12, '#ff9a3c'); }
    if (DEV.msgT > 0) FONT.wrap(DEV.msg, w - 12, { font: 'tiny' }).slice(0, 3).forEach((ln, k) => UI.text(g, ln, x + 6, y + h - 34 + k * 7, '#3aff6a', { font: 'tiny' }));
    const I = UI.lastInput();
    MT.glyph.prompt(g, x + w / 2, y + h - 13, [['tabL', ''], ['tabR', 'TAB'], ['confirm', 'DO'], ['reset', 'RESET'], ['cancel', 'CLOSE']], I, { align: 'center', gap: 4 });
  });
};
/** debug overlays drawn over the world (hitboxes, AI targets, the wave timeline, stats, doors, camera bounds) */
DEV.drawWorld = (r, w) => {
  if (!w) return;
  const D = DEV.dbg;
  if (D.hitboxes) { r.decal(() => { for (const c of w.contestants) r.groundRing(c.x, c.y, c.r, '#3aff6a', 1); for (const e of w.enemies) r.groundRing(e.x, e.y, e.r, '#ff3344', 1); for (const t of w.targets) r.groundRing(t.x, t.y, t.r, '#ffcc33', 1); if (w.boss) for (const q of w.boss.hitList()) r.groundRing(q.x, q.y, q.r, '#ff9a3c', 1); for (const b of w.fShots.list) r.groundRing(b.x, b.y, b.r, '#ffffff', 1); }); }
  r.overlay(g => {
    let y = 60;
    const line = (s, c = '#3aff6a') => { UI.text(g, s, 4, y, c, { font: 'tiny' }); y += 7; };
    if (D.targets) for (const e of w.enemies) { const [sx, sy] = r.w(e.x, e.y, 30); UI.text(g, e.kind + ':' + e.state, sx, sy, '#ff9a3c', { align: 'center', font: 'tiny' }); if (e.target) { const [tx2, ty2] = r.w(e.target.x, e.target.y, 0), [ex, ey] = r.w(e.x, e.y, 0); px.line(g, ex, ey, tx2, ty2, '#ff3344'); } }
    if (D.timeline) { line('PHASE ' + w.phase + ' ' + w.phaseT.toFixed(1)); line('WAVE ' + w.wave + '/' + ((w.room && w.room.waves) ? w.room.waves.length : 0) + ' ALIVE ' + w.countedAlive() + ' PENDING ' + w.arena.pendingSpawns()); line('SPAWNED ' + w.wavesSpawned + ' R ' + w.ratings.R.toFixed(1)); }
    if (D.stats) { line('FPS ' + game.fps + ' STEPS ' + (game.stats.steps || 0) + ' ITEMS ' + (game.stats.items || 0)); line('ENEMIES ' + w.enemies.length + ' FOE SHOTS ' + w.fShots.list.length + ' MY SHOTS ' + w.pShots.list.length); line('PARTICLES ' + game.particles.list.length + ' PICKUPS ' + w.pickups.length); }
    if (D.doors) for (const id of DOOR_IDS) { const d = w.arena.doors[id], D2 = DOORS[id], [sx, sy] = r.w(D2.x, D2.y, 30); UI.text(g, id + ' ' + d.state + ' q' + d.queue.length, sx, sy, '#2ee6ff', { align: 'center', font: 'tiny' }); }
    if (D.camera) { const a = r.w(0, 0, 0), b = r.w(368, 240, 0); px.line(g, a[0], a[1], b[0], a[1], '#ff2e88'); px.line(g, a[0], b[1], b[0], b[1], '#ff2e88'); px.line(g, a[0], a[1], a[0], b[1], '#ff2e88'); px.line(g, b[0], a[1], b[0], b[1], '#ff2e88'); line('ZOOM ' + game.zoom.toFixed(2) + ' OFFSET ' + game.cam.offset, '#ff2e88'); }
  });
};

// ---- 34-cutscenes.js ----
// ---- cutscenes: the cold open, the endings, the credits (coroutines driving actors and lines; all skippable) ----
const CUT = MT.cut = {};
/** a cosmetic actor (Lance, Penny, a contestant in a cutscene): walks to points, poses */
function actor(rig, x, y, o = {}) {
  const a = { rig, x, y, z: o.z || 0, facing: o.facing === undefined ? Math.PI / 2 : o.facing, vx: 0, vy: 0, pose: null, expr: null, to: null, speed: o.speed || 60, mic: !!o.mic, down: 0, light: o.light, glow: o.glow };
  a.walkTo = (x2, y2) => { a.to = [x2, y2]; };
  a.arrived = () => !a.to;
  a.step = dt => {
    if (a.to) { const dx = a.to[0] - a.x, dy = a.to[1] - a.y, d = Math.hypot(dx, dy); if (d < 2) { a.to = null; a.vx = a.vy = 0; } else { a.vx = dx / d * a.speed; a.vy = dy / d * a.speed; a.x += a.vx * dt; a.y += a.vy * dt; a.facing = Math.atan2(dy, dx); } }
    if (!MT.cfg.skipRigs) a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.to ? a.facing : (a.face !== undefined ? a.face : a.facing), pose: a.pose, expr: a.expr, down: a.down });
  };
  a.draw = (r, t) => {
    r.shadow(a.x, a.y, 7, .5);
    r.actor(a.x, a.y, a.z, (g, ox, oy) => { a.rig.draw(g, ox, oy, r.view); if (a.mic) MT.paint.drawMic(g, r, a.rig); if (a.robot) { const h = a.rig.head(), [hx, hy] = r.w(h.x, h.y, h.z); px.dot(g, hx - 2, hy - 1, '#ff3344'); px.dot(g, hx + 2, hy - 1, '#ff3344'); } }, { xray: true });
    if (a.light) game.lights.add(a.x, a.y, 0, 50, .9, { color: a.light });
  };
  return a;
}
CUT.actor = actor;
/** run a cutscene as an overlay: confirm skips a line, holding confirm (or Start) skips the scene */
CUT.overlay = (gen, done, o = {}) => {
  const co = new Co(gen);
  return { hold: 0, full: !!o.full, update(dt) {
    const nav = UI.nav();
    if (nav.confirm) LINES.skip();
    this.hold = nav.holdConfirm ? this.hold + dt : 0;
    if (this.hold > .7) { co.cancel(); LINES.clear(); }
    co.step(dt);
    return !co.done;
  }, draw(r) { if (this.hold > .1) r.overlay(g => { const w = 60, x = r.W - w - 8, y = r.H - 14; px.rect(g, x, y, w, 4, '#0c0618'); px.rect(g, x, y, Math.round(w * Math.min(1, this.hold / .7)), 4, '#ffcc33'); UI.text(g, 'SKIP', x - 4, y - 2, '#fff7e8', { align: 'right', font: 'tiny' }); }); }, done };
};
const untilQuiet = () => () => !LINES.busy();
/** the cold open: a dark studio, the announcer, Lance walks out, the contestants are introduced */
CUT.coldOpen = function* (w) {
  const P = PLAY, run = MT.run;
  game.lights.ambient = .12; MT.music.play(null); MT.babble.crowd('murmur', .5);
  LINES.say('ANNC', MT.TEXT.seq.coldOpen[0][1], 3);
  yield untilQuiet();
  MT.music.play('theme', { fade: .1 }); MT.banners.show('MASH TV', { color: '#ff2e88', sub: MT.TEXT.ui.sub, dur: 2.2 }); MT.babble.crowd('cheer', 1); MT.babble.crowd('applause', 1); STUDIO.cheerT = 2;
  if (game.particles) for (const x of [40, 328]) for (let i = 0; i < 30; i++) game.particles.add({ kind: 'bit', x, y: 220, z: 4, vx: (x < 184 ? 1 : -1) * Math.random() * 90, vy: -60 - Math.random() * 60, vz: 140 + Math.random() * 90, g: 300, max: 1.8, color: ['#ff2e88', '#2ee6ff', '#ffcc33', '#ffffff'][i % 4], size: 2 });
  for (let t = 0; t < .8; t += w.lastDt || 1 / 120) { game.lights.ambient = lerp(.12, w.arena.set.ambient, t / .8); yield; }
  const lance = actor(makeLance(1.3), 184, 4, { mic: true, speed: 55, light: '#fff6d0' }); P.extras.push(lance);
  w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2;
  lance.walkTo(184, 96); yield () => lance.arrived();
  lance.pose = 'wave'; lance.expr = 'smile';
  LINES.say('LANCE', MT.TEXT.seq.coldOpen[1][1], 3); yield untilQuiet();
  lance.pose = 'hips';
  LINES.say('LANCE', fill(MT.TEXT.seq.coldOpen[2][1], { N: run.contestants.length }), 3); yield untilQuiet();
  for (const c of run.contestants) { LINES.say('C' + (c.slot + 1), c.pr.name + ': ' + MT.TEXT.contestantLines[c.pr.look % 4], 3); yield untilQuiet(); }
  LINES.say('PENNY', MT.TEXT.seq.coldOpen2[0][1], 3); yield untilQuiet();
  lance.pose = 'cheer';
  LINES.say('LANCE', MT.TEXT.seq.coldOpen2[1][1], 3); MT.babble.crowd('cheer', 1); yield untilQuiet();
  lance.pose = null; lance.walkTo(184, -10); w.arena.doors.N.state = 'open'; w.arena.doors.N.u = 1; w.arena.doors.N.hold = 2;
  for (let t = 0; t < 1.5 && !lance.arrived(); t += w.lastDt || 1 / 120) yield;
  E.prune(P.extras, x => x === lance); game.lights.ambient = w.arena.set.ambient;
};
// ------------------------------------------------------------------------------------------------ the ending scene
MT.scenes = MT.scenes || {};
MT.scenes.ending = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter(data = {}) {
    this.kind = data.kind || 'a'; this.t = 0; this.card = null; this.credits = -1; this.extras = []; this.dark = 0; this.cook = 0;
    this.world = new World({ room: { id: 'END', name: 'THE FINALE', ep: 3, type: 'cut', exits: {} }, set: this.kind === 'b' ? 'studio' : 'rooftop', run: MT.run });
    game.lights.enabled = true; game.lights.ambient = this.world.arena.set.ambient;
    LINES.clear(); MT.music.play('ending', { fade: .5 });
    if (MT.run) MT.run.ending = this.kind;
    this.co = new Co(data.credits ? this.rollCredits() : this.kind === 'b' ? this.endingB() : this.endingA());
    if (!game.headless) this.world.arena.fitCamera();
  },
  lineup() { const run = MT.run, n = run ? run.contestants.length : 1; const out = []; (run ? run.contestants : []).forEach((c, i) => { const a = actor(makeContestantRig(c.slot, c.pr.look), 184 + (i - (n - 1) / 2) * 30, 230, { speed: 60 }); a.walkTo(a.x, 140); out.push(a); this.extras.push(a); }); return out; },
  *endingA() {
    const cs = this.lineup(); yield 1.6;
    LINES.say('PENNY', MT.TEXT.seq.endingA[0][1], 3); for (const a of cs) { a.pose = 'cheer'; a.expr = 'smile'; a.light = '#fff6d0'; } MT.babble.crowd('cheer', 1); yield untilQuiet();
    const L = actor(makeLance(1.3), 184, 20, { light: '#ff3344' }); L.robot = true; L.pose = 'kneel'; this.extras.push(L); MT.sfx('static'); yield 1;
    L.pose = null; L.mic = true; LINES.say('LANCE', MT.TEXT.seq.endingA[1][1], 3); yield untilQuiet();
    this.card = { text: MT.TEXT.ui.endA, sub: MT.TEXT.ui.endAHint, t: 0 }; yield 4;
    yield* this.rollCredits();
  },
  *endingB() {
    const cs = this.lineup(); yield 1.6;
    LINES.say('ANNC', MT.TEXT.seq.endingB[0][1], 3); yield untilQuiet();
    this.switchOn = true; for (const a of cs) a.walkTo(184 + (a.x - 184) * .4, 108); yield 1.5;
    for (const a of cs) a.pose = 'cast'; yield .6; this.switchFlip = true; MT.sfx('slam'); MT.sfx('bigboom'); for (const a of cs) a.pose = 'cheer';
    LINES.say('ANNC', MT.TEXT.seq.endingB[1][1], 3); MT.babble.crowd('cheer', 1); MT.babble.crowd('applause', 1); STUDIO.cheerT = 4;
    for (let i = 0; i < 6; i++) { this.dark = (i + 1) / 6; MT.sfx('slam', { vol: .4 }); yield .5; }
    yield untilQuiet();
    this.card = { text: MT.TEXT.ui.endB, sub: '', t: 0 }; yield 3.5; this.card = null;
    this.cook = 1; MT.sfx('channel'); LINES.say('LANCE', MT.TEXT.seq.endingB2[0][1], 3); yield untilQuiet(); yield 1; this.cook = 0;
    yield* this.rollCredits();
  },
  *rollCredits() { this.card = null; this.credits = 0; const total = MT.TEXT.credits.length * 14 + 260; while (this.credits < total) { this.credits += 22 * (1 / 120) * (UI.nav().holdConfirm ? 4 : 1); yield; } },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); MT.banners.step(dt);
    for (const a of this.extras) a.step(dt);
    const nav = UI.nav(); if (nav.confirm) LINES.skip();
    if (nav.cancel && this.credits >= 0) this.credits = 1e9;
    this.co.step(dt);
    if (this.card) this.card.t += dt;
    MT.studioStep(dt, this.world);
    game.lights.ambient = lerp(this.world.arena.set.ambient, .08, this.dark);
    if (this.co.done) MT.finishRun();
    if (!game.headless) { this.world.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
  },
  draw(r) {
    const t = game.real;
    this.world.draw(r, t);
    if (this.switchOn) r.queue(184, 92, 0, g => { r.box(g, 172, 86, 0, 196, 98, 14, '#3a3448', '#1a1420'); const [sx, sy] = r.w(184, 92, 18); px.rect(g, sx - 6, sy - 10, 12, 12, '#0c0618'); px.rect(g, sx - 5, sy - 9, 10, 10, this.switchFlip ? '#5a1018' : '#ff3344'); E.font.text(g, this.switchFlip ? 'OFF' : 'ON', sx, sy - 7, '#fff7e8', { align: 'center', outline: false, font: 'tiny' }); }, { occluder: true });
    for (const a of this.extras) a.draw(r, t);
    r.overlay(g => {
      if (this.card) { const k = clamp(this.card.t / .5, 0, 1); px.blend(g, .85 * k, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); UI.title(g, this.card.text, r.W / 2, r.H * .38, r.W > 380 ? 2 : 1); if (this.card.sub) UI.text(g, this.card.sub, r.W / 2, r.H * .38 + 30, '#2ee6ff', { align: 'center' }); }
      if (this.cook) { const w = 150, h = 100, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2; px.rect(g, x - 4, y - 4, w + 8, h + 8, '#5a5468'); px.rect(g, x, y, w, h, '#2a1a10'); UI.text(g, MT.TEXT.ui.channel, x + 4, y + 3, '#ffcc33', { font: 'tiny' }); const lr = MT.portraitRig('LANCE'); if (lr) lr.drawPortrait(g, x + 10, y + 20, 48, { zoom: 3, turn: .4, bg: '#2a1a10' }); px.ell(g, x + 110, y + 70, 26, 10, '#8a8f9a'); px.ell(g, x + 110, y + 66, 22, 7, '#f4e8c8'); UI.text(g, 'MASHED POTATOES', x + w / 2, y + h - 12, '#fff7e8', { align: 'center', font: 'tiny' }); }
      if (this.credits >= 0) { px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); MT.TEXT.credits.forEach((ln, i) => { const y = r.H + 20 + i * 14 - this.credits; if (y > -10 && y < r.H + 10) { if (i === 0) UI.title(g, ln, r.W / 2, y - 6, 2); else UI.text(g, ln, r.W / 2, y, i % 5 === 1 ? '#ffcc33' : '#fff7e8', { align: 'center' }); } }); UI.promptBar(g, r, [['confirm', 'FAST'], ['cancel', 'SKIP']]); }
    });
    HUD.draw(r, this.world, t, { noBugs: true, noWaves: true, noTut: true, noReticle: true, onlyLines: true });
  },
};
/** after a run: each qualifying contestant enters initials, then the table, then the title */
MT.finishRun = () => {
  const run = MT.run; if (!run || run.finished) return; run.finished = true;
  const eligible = run.mode === 'arcade' && !run.devTouched && !MT.devActive();
  const queue = eligible ? run.contestants.filter(c => c.input && !c.devBot && MT.cab.qualifies(c.pr.cash, 'show')).sort((a, b) => b.pr.cash - a.pr.cash) : [];
  if (queue.length) game.go('initials', { queue: queue.map(c => ({ slot: c.slot, cash: c.pr.cash, input: c.input, name: c.pr.name })) });
  else game.go('scores', { after: 'title' });
};

// ---- 40-bot.js ----
// ---- the bot: a potential-field contestant (attract mode, tests, the dev bot partner, autopilot) ----
// It returns the same intent a player's input gives; it may cheat (god mode etc.) through its contestant's flags.
const BOT = MT.bot = {};
BOT.intent = (world, c, dt) => {
  const o = c.botOpts || {}, it = { move: [0, 0], aim: null, fire: false, slide: false, bomb: false, showboat: false, aimSrc: 'bot' };
  let fx = 0, fy = 0;
  const add = (x, y, k) => { const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || .01; fx += dx / d * k; fy += dy / d * k; };
  // enemies push it away (harder up close), bullets ahead of time, landing tomatoes, hazards
  let near = null, nd = 1e9, crowd60 = 0, crowd120 = 0;
  for (const e of world.enemies) {
    if (e.dead || ENEMIES[e.kind].harmless) continue;
    const d = dist(e, c); if (d < 60) crowd60++; if (d < 120) crowd120++;
    if (!e.entering && !e.leap && d < nd && (ENEMIES[e.kind].counted || e.kind === 'mime' || e.kind === 'snakeSeg')) { nd = d; near = e; }
    const R = 70 + e.r * 2; if (d < R) add(e.x, e.y, -2.4 * (R - d) / R * (ENEMIES[e.kind].big ? 1.6 : 1));
  }
  for (const t of world.targets) if (!t.dead && t.kind !== 'cage') { const d = dist(t, c); if (d < nd && !near) { near = t; } }
  if (!near && world.targets.length) { let best = 1e9; for (const t of world.targets) if (!t.dead && t.kind !== 'cage') { const d = dist(t, c); if (d < best) { best = d; near = t; } } }
  let danger = false;
  for (const b of world.fShots.list) {
    const px2 = b.x + b.vx * .3, py2 = b.y + b.vy * .3, d = Math.hypot(px2 - c.x, py2 - c.y);
    if (d < 34) add(px2, py2, -2.2 * (34 - d) / 34);
    for (const tt of [.08, .16, .25]) if (Math.hypot(b.x + b.vx * tt - c.x, b.y + b.vy * tt - c.y) < c.r + b.r + 2) danger = true;
  }
  for (const L of world.lobs) { const d = Math.hypot(L.tx - c.x, L.ty - c.y); if (d < 26) add(L.tx, L.ty, -3 * (26 - d) / 26); }
  const py = world.arena.pyro(); if (py) for (const v of py.vents) if (v.state !== 'idle') { const d = dist(v, c); if (d < 30) add(v.x, v.y, -3 * (30 - d) / 30); }
  for (const d of world.decals) if (d.kind === 'splat') { const k = dist(d, c); if (k < d.r + 8) add(d.x, d.y, -1); }
  const boss = world.boss;
  if (boss && !boss.dead) {
    const hl = boss.hitList(); let bp = null, bd = 1e9;
    for (const q of hl) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < bd) { bd = d; bp = q; } }
    const bx = boss.rs.x, by = boss.rs.y, d = Math.hypot(bx - c.x, by - c.y);
    if (d < 100) add(bx, by, -2.5 * (100 - d) / 100); else if (d > 150) add(bx, by, .6);
    if (bp && (!near || bd < nd + 40)) { near = { x: bp.x, y: bp.y, vx: 0, vy: 0 }; nd = bd; }
    if (boss.cones) for (const cn of boss.cones) if (cn) add(c.x + Math.cos(cn.a + 1.6) * 10, c.y + Math.sin(cn.a + 1.6) * 10, 1.2);
    if (boss.micX > -900 && boss.micT > 0) { const k = Math.hypot(boss.micX - c.x, boss.micY - c.y); if (k < 50) add(boss.micX, boss.micY, -3); }
  }
  // pickups pull it in (by value); the room's centre a little; the exit once the room is clear
  for (const p of world.pickups) {
    if (p.locked && p.locked()) continue;
    const K = PICKUPS[p.kind], d = dist(p, c), v = K.cashy ? K.cash / 1000 + .3 : p.kind === 'key' || p.kind === 'statue' ? 4 : 1.2;
    if (d < 160) add(p.x, p.y, Math.min(2.4, v) * (160 - d) / 160 * (world.phase === 'EXIT' || world.phase === 'BONUS' ? 2 : 1));
  }
  add(AR.CX, AR.CY, .25);
  for (const q of world.contestants) if (q !== c && q.alive) { const d = dist(q, c); if (d < 34) add(q.x + (q.slot - c.slot) * .01, q.y, -1.2 * (34 - d) / 34); }
  const wall = 26; if (c.x < AR.X0 + wall) fx += 1; if (c.x > AR.X1 - wall) fx -= 1; if (c.y < AR.Y0 + wall) fy += 1; if (c.y > AR.Y1 - wall) fy -= 1;
  if (world.phase === 'EXIT' && !world.exitPick) {
    const doors = DOOR_IDS.filter(d => world.arena.doors[d].state === 'exit');
    let want = doors[0];
    if (o.route) { const r = typeof o.route === 'function' ? o.route(world, doors) : o.route; if (Array.isArray(r)) want = r.find(d => doors.includes(d)) || want; else if (doors.includes(r)) want = r; }
    const pick = world.pickups.filter(p => dist(p, c) < 120 && (p.kind === 'key' || PICKUPS[p.kind].cashy)).length;
    if (want && (world.phaseT > 3 || !pick || o.rush)) { const D = DOORS[want]; fx = 0; fy = 0; add(D.x, D.y, 3); }
  }
  if (o.hold) { fx = 0; fy = 0; add(o.hold[0], o.hold[1], dist({ x: o.hold[0], y: o.hold[1] }, c) > 12 ? 2 : 0); }
  const l = Math.hypot(fx, fy); if (l > .05) it.move = [fx / l, fy / l]; else it.move = [0, 0];
  // aim at the nearest enemy, leading it; always fire
  if (o.human) {   // a stand-in for a person: it re-picks its target a few times a second, aims with error, never leads
    c._hT = (c._hT || 0) - (dt || 1 / 120);
    if (c._hT <= 0 || !c._hAim) { c._hT = .35 + RNG.ai() * .3; c._hAim = near ? { x: near.x, y: near.y } : null; c._hErr = (RNG.ai() - .5) * .7; c._hFire = !!near && nd < 190 && RNG.ai() < .85; }
    if (c._hAim) { it.aim = Math.atan2(c._hAim.y - c.y, c._hAim.x - c.x) + c._hErr; it.fire = c._hFire; }
    if (danger && RNG.ai() < .5) danger = false;
    it.move = [it.move[0] * .85, it.move[1] * .85];
  } else if (near) { const tl = Math.min(.5, nd / MT.T.bulletSpeed); const tx = near.x + (near.vx || 0) * tl, ty = near.y + (near.vy || 0) * tl; it.aim = Math.atan2(ty - c.y, tx - c.x); it.fire = true; }
  else if (world.phase === 'WAVES' || world.phase === 'BOSS') { it.aim = c.aim; it.fire = false; }
  if (o.noFire) { it.fire = false; it.bomb = false; }
  if (danger && c.slideCD <= 0) it.slide = true;
  if ((crowd120 >= 25 || (o.bombAt && world.time > o.bombAt && !c._bombed)) && (c.pr.bombs > 0 || c.infBombs || MT.cheats.infBombs)) { it.bomb = true; c._bombed = true; }
  if (crowd60 >= 3 && c.hp >= maxHpNow() && c.boatCD <= 0 && !danger && (o.boats !== false)) it.showboat = true;
  if (o.boatAt && world.time > o.boatAt && !c._boated) { it.showboat = true; c._boated = true; }
  if (o.noFire) it.bomb = false;
  return it;
};

// ---- 41-attract.js ----
// ---- the attract mode: after 10 s idle on a front-end screen, a looping demo of reels played by cheating bots ----
const ATT = MT.attract = { reel: 0, t: 0, reels: null, count0: 0, played: [] };
const REELS = ATT.REELS = [
  { id: 'cold', dur: 7, caption: 'TONIGHT ON MASH TV!', room: '1-1', hold: true, setup(w) { LINES.say('ANNC', MT.TEXT.seq.coldOpen[0][1], 3); const L = MT.cut.actor(makeLance(1.3), 184, 40, { mic: true, light: '#fff6d0' }); L.walkTo(184, 100); PLAY.extras.push(L); ATT.lance = L; }, step(w, t) { if (ATT.lance && ATT.lance.arrived()) ATT.lance.pose = 'wave'; } },
  { id: '1-1', dur: 18, caption: "MASH 'EM!", room: '1-1', setup(w) { w.delayed(4, () => MT.placeItem(w, 'spread', [10, 7])); } },
  { id: '1-2', dur: 14, caption: "CASH 'EM!", room: '1-2', weapon: 'rockets', setup(w) { w.delayed(10, () => { if (!w.keyDropped) w.dropKey(AR.CX, AR.CY + 20); }); } },
  { id: 'mashy', dur: 16, caption: 'BOSSES THE SIZE OF A STUDIO!', room: '1-B', setup(w) { }, step(w, t) { const b = w.boss; if (b && b.introDone && !ATT.cut) { ATT.cut = true; for (const id of ['armL', 'armR']) { const p = b.get(id); p.hp = 0; p.alive = false; } const body = b.get('body'); body.hp = body.max * .6; b.setPhase('p2', b.p2()); } if (b && !b.introDone && t > 1.4) { b.introDone = true; b.y = 70; b.setPhase('p1', b.p1()); } } },
  { id: '2-2', dur: 16, caption: 'PRIME TIME = 5× CASH!', room: '2-2', weapon: 'popcorn', weapon2: 'laser', setup(w) { w.delayed(5, () => { w.ratings.primeCD = 0; w.startPrime(); }); } },
  { id: 'spin', dur: 16, caption: 'SPIN THE WHEEL OF MISFORTUNE!', room: '2-B', setup(w) { }, step(w, t) { const b = w.boss; if (b && !b.forcedSet) { b.forcedSet = true; b.forced = [6, 0]; } if (b && !b.introDone && t > 1.4) { b.introDone = true; b.setPhase('p1', b.cycle()); } } },
  { id: '3-6', dur: 16, caption: 'PLAY TO THE CAMERAS!', room: '3-6', addon: 'records', addon2: 'shield', bot0: { boatAt: 6, boats: true }, bot1: { bombAt: 9 } },
  { id: 'lance', dur: 16, caption: 'NOBODY CANCELS LANCE LUSTRE!', room: '3-B', step(w, t) { const b = w.boss; if (b && !b.introDone && t > 1.2) { b.introDone = true; b.y = 80; b.setPhase('lance', b.lancePhase()); } if (b && t > 9 && !ATT.cut) { ATT.cut = true; const pod = b.get('podium'); pod.hp = 0; pod.alive = false; b.setPhase('reveal', b.robotReveal()); } } },
  { id: 'recap', dur: 8, caption: 'BIG PRIZES!', recap: true },
  { id: 'scores', dur: 6, caption: '', scores: true },
];
function attractRun() {
  MT.newRun({ mode: 'attract', diff: 'CONTESTANT', seed: 1000 + ATT.reel });
  for (let i = 0; i < 2; i++) { const c = MT.addRunPlayer({ slot: i, look: (i + ATT.reel) % 4, ctl: 'bot', bot: {}, god: true, infBombs: true }); c.dmgMul = 3; }
  MT.run.keys = 3;
}
ATT.start = (i) => {
  ATT.leaving = false; ATT.reel = i % REELS.length; ATT.t = 0; ATT.cut = false; ATT.lance = null; ATT.played.push(REELS[ATT.reel].id);
  const R = REELS[ATT.reel];
  LINES.clear(); MT.banners.list.length = 0;
  if (R.room) {
    attractRun();
    const run = MT.run; run.contestants.forEach((c, k) => { c.botOpts = Object.assign({ rush: false }, R['bot' + k] || {}); });
    const w = PLAY.load(R.room, 'S', !!R.hold);
    w.quietFx = false;
    const [c0, c1] = run.contestants;
    if (R.weapon) MT.giveItem(w, c0, R.weapon); if (R.weapon2) MT.giveItem(w, c1, R.weapon2);
    if (R.addon) MT.giveItem(w, c0, R.addon); if (R.addon2) MT.giveItem(w, c1, R.addon2);
    for (const c of run.contestants) { c.wT = c.wMax = 99; for (const k in c.addons) if (c.addons[k] > 0) c.addons[k] = 99; }
    if (R.setup) R.setup(w);
    if (R.room.endsWith('B')) MT.music.play('bossShowdown'); else MT.music.play((MT.EPISODES[MT.ROOMS[R.room].ep] || MT.EPISODES[1]).song);
  } else { PLAY.world = null; MT.music.play(R.recap ? 'recap' : 'theme'); ATT.fakePrizes = MT.TEXT.prizes[1 + ATT.reel % 3].slice(0, 4); }
  if (!game.headless) game.audio.duck(true);
};
ATT.next = () => ATT.start(ATT.reel + 1);
ATT.step = (dt, w) => {
  const R = REELS[ATT.reel]; ATT.t += dt;
  if (w && R.step) R.step(w, ATT.t);
  if (ATT.t >= R.dur && !ATT.leaving) { ATT.leaving = true; PLAY.wipe(() => { ATT.leaving = false; ATT.next(); }); }
};
ATT.drawOverlay = r => {
  r.overlay(g => {
    const t = game.real, R = REELS[ATT.reel];
    px.blend(g, .8, 'normal', () => px.rect(g, 0, r.H - 30, r.W, 30, '#0c0618'));
    UI.title(g, 'MASH TV', 40, r.H - 26, 1, { align: 'center' });
    UI.text(g, MT.TEXT.ui.demo, r.W - 6, r.H - 26, '#ff9a3c', { align: 'right' });
    if (R.caption) UI.text(g, R.caption, r.W / 2, r.H - 26, '#ffcc33', { align: 'center', scale: r.W > 380 ? 2 : 1 });
    if (Math.floor(t * 2) % 2 === 0) { const I = UI.lastInput(); UI.text(g, MT.touchOnly() ? 'TAP TO RETURN' : MT.TEXT.ui.pressAny, r.W / 2, r.H - 10, '#fff7e8', { align: 'center', font: 'tiny' }); }
  });
};
ATT.scene = {
  pausable: false, input: MASH_MENU, view: 'threequarter', expand: true, touch: [], camera: { zoom: false },
  enter() { MT.idle.reset(); ATT.count0 = MT.idle.inputCount; ATT.played = []; PLAY.overlay = null; PLAY.trans = null; game.allowJoin(false); ATT.start(0); this.armed = 0; },
  exit() { if (!game.headless) game.audio.duck(false); MT.run = null; PLAY.world = null; LINES.clear(); MT.banners.list.length = 0; },
  update(dt) {
    this.armed += dt;
    MT.idleStep(dt);
    if (this.armed > .15 && MT.idle.inputCount !== ATT.count0) { game.go('title', {}, { fade: 0 }); return; }
    ATT.count0 = MT.idle.inputCount;
    const R = REELS[ATT.reel];
    if (!R.room) { LINES.step(1 / 120); ATT.step(dt, null); if (PLAY.trans) { const T = PLAY.trans; T.t += 1 / 120; if (!T.fired && T.t >= .4) { T.fired = true; T.fn(); } if (T.t >= .8) PLAY.trans = null; } return; }
    MT.scenes.play.update.call(this, dt);
    if (PLAY.world && PLAY.world.phase === 'HOLD') { ATT.step(dt, PLAY.world); }
  },
  draw(r) {
    const R = REELS[ATT.reel], t = game.real;
    if (R.room && PLAY.world) { MT.scenes.play.draw.call(this, r); return; }
    backdrop(r, t, .5);
    if (R.scores) MT.cab.drawTable(r, 'show', 16, MT.TEXT.ui.scores);
    else r.overlay(g => { UI.title(g, 'PRIZE RECAP', r.W / 2, 14, 2); (ATT.fakePrizes || []).forEach((p, i) => { const y = 50 + i * 30; if (ATT.t > .6 + i * 1.2) { px.sprite(g, SPR.prize[p.icon], r.W / 2 - 110, y); UI.text(g, p.name, r.W / 2 - 92, y, '#fff7e8'); UI.text(g, money(p.value), r.W / 2 + 110, y, '#5fe0a0', { align: 'right' }); UI.text(g, p.line, r.W / 2 - 92, y + 10, '#ff8ad8', { font: 'tiny' }); } }); });
    ATT.drawOverlay(r);
    if (PLAY.trans) { const k = PLAY.trans.t < .4 ? PLAY.trans.t / .4 : 1 - (PLAY.trans.t - .4) / .4; r.overlay(g => UI.static(g, r, k, t)); }
  },
};

// ---- 50-net.js ----
// ---- AI Hub sessions (Session Protocol v1, shared-world): the card, the Lightning Round, host and client netcode ----
// The host's copy runs the world; clients run their own contestant and mirror the rest from snapshots (render delay
// 120 ms, interpolated by id). Every message is JSON through AIHub only: at most 20 a second, none over 16 KB.
const NET = MT.net = { active: false, isHost: false, isServer: false, me: null, info: null, hub: null, overlayOpen: false, ov: { i: 0 }, sentT: 0, snapN: 0, roomSeq: 0, tokens: 40, tokT: 0, stats: { sent: 0, recv: 0, maxBytes: 0, bySec: {} }, snaps: [], reports: {}, claims: new Set(), outbox: [], ended: false, finished: false, left: new Set(), card: null, endReason: null, over: null, lastV: 0, landed: new Set(), startAt: null };
// code tables (kinds, states, events, weapons, phases) live here only
const KIND_CODES = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'discoBig', 'discoSmall', 'heckler', 'hecklerKing', 'tank', 'snake', 'snakeSeg', 'brute', 'paparazzo'];
const STATE_CODES = ['walk', 'wind', 'swing', 'rest', 'hop', 'fuse', 'idle', 'tele', 'move', 'flare', 'throw', 'aim', 'rear', 'lunge', 'charge', 'stun'];
const BULLET_CODES = ['orb', 'shard', 'beam', 'coin', 'card', 'static', 'gravy', 'butter', 'shell', 'spark', 'tomato', 'tot'];
const PICK_CODES = ['bill', 'stack', 'gold', 'case', 'prize', 'key', 'capsule', 'bomb', 'life', 'statue'];
const WPN_CODES = ['blaster', 'spread', 'rockets', 'popcorn', 'laser'];
const PHASE_CODES = ['ENTER', 'INTRO', 'WAVES', 'CLEAR', 'EXIT', 'BOSS_INTRO', 'BOSS', 'BOSS_DEATH', 'DONE', 'HOLD', 'BONUS'];
const DOOR_CODE = { closed: 0, opening: 1, closing: 1, open: 2, exit: 3 };
const EVENT_CODES = ['kill', 'hurt', 'died', 'showboat', 'prime', 'primeEnd', 'stunt', 'clear', 'exits', 'door', 'bomb', 'blast', 'partDown', 'bossIntro', 'bossDead', 'line', 'phase', 'keyDrop', 'exitPicked', 'cash', 'prize', 'key', 'powerup', 'respawn', 'multikill', 'wave', 'hurry', 'left'];
NET.codes = { KIND_CODES, STATE_CODES, BULLET_CODES, PICK_CODES, WPN_CODES, PHASE_CODES, EVENT_CODES };
const q10 = v => Math.round(v * 10), now = () => NET.hub && NET.hub.time ? NET.hub.time() : 0;
NET.inject = hub => { NET.hub = hub; };
NET.hubObj = () => NET.hub || GLOBAL.AIHub;
/** send through the hub, never over 20 a second (bursts of 40) or 16 KB */
NET.send = (data, reliable = true, to) => {
  const H = NET.hubObj(); if (!H || NET.ended) return false;
  const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000, tt = NET.clock !== undefined ? NET.clock : t;
  NET.tokens = Math.min(38, NET.tokens + (tt - NET.tokT) * 19); NET.tokT = tt;
  if (NET.tokens < 1) return false;
  const text = JSON.stringify(data); if (text.length > 16000) return false;
  NET.tokens -= 1;
  const ok = H.send(data, to === undefined ? { reliable } : { reliable, to });
  if (ok !== false) { NET.stats.sent++; NET.stats.maxBytes = Math.max(NET.stats.maxBytes, text.length); if (data.t === 's') NET.stats.lastSnapBytes = text.length; }
  return ok !== false;
};
// ------------------------------------------------------------------------------------------------ connect, the card
NET.begin = () => { /* the session card scene connects */ };
NET.connect = async () => {
  const H = NET.hubObj(); if (!H) return null;
  const info = await H.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  if (!info) return null;
  NET.info = info; NET.active = true; NET.isHost = !!info.isHost; NET.isServer = !!info.server; NET.me = info.me;
  H.on('card', c => { NET.card = c; });
  H.on('start', s => { NET.startAt = s; });
  H.on('message', (d, from) => NET.onMessage(d, from));
  H.on('leave', e => NET.onLeave(e));
  H.on('time-up', () => { if (NET.isHost) NET.finish(false); });
  H.on('end', e => NET.onEnd(e));
  // the run: contestants seated by the hub's players (names drawn on the canvas only, clipped, unsupported letters as ?)
  MT.newRun({ mode: 'session', diff: 'CONTESTANT', seed: info.seed >>> 0 });
  MT.seedAll(info.seed >>> 0);
  info.players.forEach((p, i) => {
    const name = String(p.name || 'PLAYER').toUpperCase().replace(/[^A-Z0-9 .!?-]/g, '?').slice(0, 12);
    const ctl = p.id === NET.me ? 'local' : NET.isHost ? 'remote' : 'mirror';
    const c = MT.addRunPlayer({ slot: i % 4, look: i % 4, ctl, input: ctl === 'local' ? game.input : null, name, netId: p.id });
    c.pr.lives = 99;
  });
  if (H.ready) H.ready();
  return info;
};
const PRE_PLAYERS = [{ id: 0, name: 'ROCKET' }, { id: 1, name: 'VOLT' }, { id: 2, name: 'MOXIE' }];
NET.cardScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [], camera: { zoom: false },
  enter(d = {}) {
    this.preview = !!d.preview; this.t = 0; this.state = 'connecting'; this.rigs = []; this.btns = null; this.saidReady = false;
    MT.music.play('theme'); game.allowJoin(false);
    if (this.preview) { this.state = 'card'; this.players = PRE_PLAYERS.map((p, i) => ({ id: p.id, name: p.name, slot: i })); this.rigs = this.players.map(p => makeContestantRig(p.slot, p.slot)); return; }
    if (HAS_DOM && !this._key) { this._key = e => { if ((e.key === 'Enter' || e.code === 'Enter') && game.sceneName === 'sessionCard' && NET.active && !NET.answeredReady) { NET.answer('ready'); } }; window.addEventListener('keydown', this._key, true); }
    NET.connect().then(info => {
      if (!info) { game.go('title', {}); return; }
      this.players = info.players.map((p, i) => ({ id: p.id, name: MT.run.contestants[i].pr.name, slot: i % 4 }));
      this.rigs = this.players.map(p => makeContestantRig(p.slot, p.slot));
      this.state = NET.isServer ? 'server' : 'card';
      LINES.seq('sessionCard', {}, 2);
    }).catch(e => { game.fail('session connect', e); game.go('title', {}); });
  },
  exit() { if (this._key && HAS_DOM) { window.removeEventListener('keydown', this._key, true); this._key = null; } },
  update(dt) {
    this.t += dt; LINES.step(1 / 120); MT.studioStep(dt, null);
    if (!game.headless) { if (!BACKDROP.arena) BACKDROP.arena = new Arena('studio'); BACKDROP.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
    if (this.preview) { const nav = UI.nav(); if (nav.cancel || nav.confirm) game.go('title', {}); return; }
    if (!NET.active) return;
    for (const rg of this.rigs) if (!MT.cfg.skipRigs) rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'hips', expr: 'smile' });
    const nav = UI.nav();
    if (!NET.isServer) {
      if (nav.confirm || (this.btns && UI.clickIn(this.btns.ready))) NET.answer('ready');
      if (nav.more || (this.btns && UI.clickIn(this.btns.more))) NET.answer('more');
    }
    const H = NET.hubObj(), tm = H.time ? H.time() : -Infinity;
    if (NET.startAt && tm >= -3200) this.state = 'countdown';
    if (NET.startAt && tm >= 0) { NET.startPlay(); }
  },
  draw(r) {
    const t = game.real; backdrop(r, t, .55);
    r.overlay(g => {
      const lh = UI.logo(g, r.W / 2, 8, 2, t);
      UI.text(g, 'THE LIGHTNING ROUND', r.W / 2, 8 + lh + 2, '#2ee6ff', { align: 'center' });
      if (this.state === 'connecting') { UI.text(g, 'CONNECTING TO THE STUDIO...', r.W / 2, r.H / 2, '#fff7e8', { align: 'center' }); return; }
      const P = this.players || [], card = NET.card || { left: null, ready: [] }, y0 = 8 + lh + 16, pw = Math.min(90, (r.W - 20) / Math.max(1, P.length));
      UI.text(g, "TONIGHT'S CONTESTANTS", r.W / 2, y0, '#ffcc33', { align: 'center' });
      P.forEach((p, i) => {
        const x = Math.round(r.W / 2 - P.length * pw / 2 + i * pw), col = SLOT_COLORS[p.slot], ready = (card.ready || []).includes(p.id);
        UI.panel(g, x + 2, y0 + 10, pw - 4, 64, { alpha: .85, border: col });
        if (this.rigs[i] && !MT.cfg.skipRigs) this.rigs[i].drawPortrait(g, x + pw / 2 - 16, y0 + 14, 32, { zoom: 1.6, turn: .3, bg: E.tones(col).deep });
        UI.text(g, p.name, x + pw / 2, y0 + 50, col, { align: 'center' });
        if (ready) UI.text(g, 'READY!', x + pw / 2, y0 + 60, '#3aff6a', { align: 'center', font: 'tiny' });
        if (p.id === NET.me) UI.text(g, 'YOU', x + pw / 2, y0 + 13, '#fff7e8', { align: 'center', font: 'tiny' });
      });
      const y1 = y0 + 80;
      UI.text(g, 'HOW TO WIN: GRAB THE MOST CASH, BEAT MASHY TOGETHER', r.W / 2, y1, '#fff7e8', { align: 'center' });
      const I = game.input;
      MT.glyph.prompt(g, r.W / 2, y1 + 12, [['move', 'MOVE'], ['aim', 'AIM+FIRE']], I, { align: 'center' });
      const pi = { lastDevice: I.lastDevice, glyphs: I.glyphs, map: MASH_PLAY, codeLabel: c => I.codeLabel(c) };
      MT.glyph.prompt(g, r.W / 2, y1 + 26, [['slide', 'SLIDE'], ['bomb', 'BOMB'], ['showboat', 'SHOWBOAT']], pi, { align: 'center' });
      const left = this.state === 'countdown' ? null : card.left, tm = NET.hubObj() && NET.hubObj().time ? NET.hubObj().time() : -Infinity;
      if (this.state === 'countdown' && isFinite(tm)) { const k = Math.ceil(-tm / 1000); UI.title(g, k > 0 ? String(k) : 'MASH!', r.W / 2, r.H - 60, 4); }
      else UI.text(g, card.paused ? 'PAUSED' : card.starting ? 'STARTING...' : left !== null && left !== undefined ? 'STARTS IN ' + Math.ceil(left / 1000) : '', r.W / 2, r.H - 52, '#ffcc33', { align: 'center', scale: 2 });
      if (!NET.isServer && this.state !== 'countdown') {
        const bw = 100, bh = 18, y = r.H - 30, rd = { x: Math.round(r.W / 2 - bw - 6), y, w: bw, h: bh }, mo = { x: Math.round(r.W / 2 + 6), y, w: bw, h: bh }; this.btns = { ready: rd, more: mo };
        px.rect(g, rd.x, rd.y, rd.w, rd.h, NET.answeredReady ? '#3aff6a' : '#ffcc33'); UI.text(g, 'READY', rd.x + rd.w / 2, rd.y + 5, '#140a24', { align: 'center', shadow: false });
        px.rect(g, mo.x, mo.y, mo.w, mo.h, '#3a1e5a'); UI.text(g, card.asked ? 'TAKE BACK' : 'MORE TIME', mo.x + mo.w / 2, mo.y + 5, '#fff7e8', { align: 'center' });
        MT.glyph.draw(g, rd.x - 14, rd.y + 3, 'confirm', I); MT.glyph.draw(g, mo.x + mo.w + 3, mo.y + 3, 'more', I);
      }
      if (this.preview) UI.text(g, 'SESSION CARD PREVIEW (NO HUB)', r.W / 2, r.H - 8, '#7a6a8a', { align: 'center', font: 'tiny' });
    });
    HUD.draw(r, { contestants: [], ratings: new Ratings(), room: null, run: MT.run, phase: '' }, t, { onlyLines: true });
  },
};
NET.answer = what => { const H = NET.hubObj(); if (!H || !H.answer) return; H.answer(what); if (what === 'ready') { NET.answeredReady = true; MT.sfx('bell'); } else MT.sfx('blip'); NET.lastAnswer = what; };
NET.startPlay = () => {
  if (NET.playing) return; NET.playing = true;
  if (NET.isServer) { game.go('sessionServer', {}, { fade: 0 }); return; }
  game.go('play', { room: 'L1' }, { fade: 0 });
};
// ------------------------------------------------------------------------------------------------ the world in a session
NET.attachWorld = w => { w.session = true; NET.world = w; NET.roomSeq++; NET.snaps.length = 0; NET.claims.clear(); NET.landed.clear(); NET.lastV = 0; if (!NET.isHost) { w.cosmetic = true; w.mode = 'mirror'; } };
NET.roomChanged = w => { NET.send({ t: 'room', rm: NET.roomSeq, id: w.room.id, entry: w.entry }, true); };
/** each play step: send what this copy owes */
NET.step = dt => {
  NET.clock = (NET.clock || 0) + dt;
  const w = PLAY.world; if (!w || NET.ended) return;
  NET.sentT += dt;
  if (NET.isHost) {
    if (NET.sentT >= 1 / 15) { NET.sentT = 0; NET.send(NET.snapshot(w), false); }
    if (NET.finishAt !== undefined && NET.clock >= NET.finishAt) NET.finish(true);
  } else {
    if (NET.sentT >= 1 / 15) { NET.sentT = 0; const c = NET.local(); if (c) NET.send({ t: 'c', a: now() | 0, s: [q10(c.x), q10(c.y), Math.round(c.aim * 1000), NET.flags(c), WPN_CODES.indexOf(c.weapon), q10(c.wT), c.hp, c.pr.lives, c.state === 'dead' ? 1 : 0] }, false); }
    NET.ceT = (NET.ceT || 0) + dt;
    if (NET.outbox.length && NET.ceT >= .26) { NET.ceT = 0; NET.send({ t: 'ce', ev: NET.outbox.splice(0, 12) }, true); }
  }
};
NET.local = () => MT.run && MT.run.contestants.find(c => c.netId === NET.me && c.ctl !== 'remote' && c.ctl !== 'mirror');
NET.flags = c => (c.firing ? 1 : 0) | (c.slideT > 0 ? 2 : 0) | (c.boatT > 0 ? 4 : 0) | (c.state === 'dead' ? 8 : 0) | (c.addons.shield > 0 ? 16 : 0) | (c.addons.records > 0 ? 32 : 0) | (c.addons.speed > 0 ? 64 : 0) | (c.invuln > 0 ? 128 : 0) | (c.state === 'walkin' ? 256 : 0) | (c.state === 'drop' ? 512 : 0) | (c.state === 'exit' ? 1024 : 0);
/** the host's snapshot of its world */
NET.snapshot = w => {
  const dr = DOOR_IDS.reduce((a, id, i) => a | (DOOR_CODE[w.arena.doors[id].state] << (i * 2)), 0);
  const P = w.contestants.map(c => [c.netId, q10(c.x), q10(c.y), Math.round(c.aim * 1000), NET.flags(c), WPN_CODES.indexOf(c.weapon), q10(c.wT), c.hp, c.pr.lives, c.pr.cash, c.pr.bombs, c.pr.kills]);
  const Ex = w.enemies.slice(0, 160).map(e => [e.id, KIND_CODES.indexOf(e.kind), q10(e.x), q10(e.y), Math.round(e.face * 100), STATE_CODES.indexOf(e.state), Math.round(e.rs.hpPct * 100), e.kind === 'tank' ? Math.round((e.turret || 0) * 100) : e.leap || (e.dropT !== undefined && e.dropT < .9) ? Math.round(e.z) : 0, e.entering ? 1 : 0]);
  const B = w.fShots.list.slice(0, 200).map(b => [b.data.id, BULLET_CODES.indexOf(b.data.kind), q10(b.x), q10(b.y), Math.round(b.vx), Math.round(b.vy)]).concat(w.lobs.slice(0, 20).map(L => [L.id, BULLET_CODES.indexOf(L.kind), q10(L.x), q10(L.y), Math.round(L.vx), Math.round(L.vy), Math.round(L.z), Math.round(L.vz), Math.round(L.tx), Math.round(L.ty)]));
  const K = w.pickups.slice(0, 40).map(p => [p.id, PICK_CODES.indexOf(p.kind) + (p.kind === 'capsule' ? 16 * (CAPSULES.indexOf(p.wpn) + 1) : 0), q10(p.x), q10(p.y), Math.round(p.z), p.ttl === Infinity ? -1 : q10(p.ttl)]);
  const V = w.ring.filter(v => v[0] > (NET.ringFloor || 0)).slice(-40).map(([seq, name, d]) => NET.encodeEv(seq, name, d)).filter(Boolean);
  return { t: 's', a: now() | 0, n: ++NET.snapN, rm: NET.roomSeq, id: w.room.id, ph: PHASE_CODES.indexOf(w.phase), pt: q10(w.phaseT), dr, R: q10(w.ratings.R), X: w.ratings.X, pm: q10(w.ratings.prime), wv: w.wave, P, E: Ex, B, K, G: w.boss ? w.boss.toNet() : 0, V };
};
NET.encodeEv = (seq, name, d) => {
  const code = EVENT_CODES.indexOf(name); if (code < 0) return null;
  const o = {}; for (const k in d) { const v = d[k]; if (v && typeof v === 'object' && v.netId !== undefined) o[k] = { c: v.netId }; else if (v && typeof v === 'object' && v.name && v.value) o[k] = { name: v.name, value: v.value, icon: v.icon, line: v.line }; else if (typeof v !== 'object' || v === null) o[k] = typeof v === 'number' ? Math.round(v * 10) / 10 : v; }
  return [seq, code, o];
};
// ------------------------------------------------------------------------------------------------ messages
NET.onMessage = (d, from) => {
  NET.stats.recv++; if (!d || NET.ended) return;
  if (NET.isHost) {
    if (d.t === 'c') { const r = NET.reports[from]; if (!r || d.a >= r.a) NET.reports[from] = d; }
    else if (d.t === 'ce') for (const ev of d.ev || []) NET.hostEvent(from, ev);
  } else {
    if (d.t === 's') { if (d.rm !== NET.roomSeq && PLAY.world && d.id !== PLAY.world.room.id) return; NET.snaps.push(d); NET.snaps.sort((a, b) => a.a - b.a); if (NET.snaps.length > 8) NET.snaps.shift(); }
    else if (d.t === 'room') { NET.pendingRoom = d; }
    else if (d.t === 'over') { NET.over = d; }
  }
};
NET.hostEvent = (from, ev) => {
  const w = PLAY.world; if (!w) return; const c = w.contestantById(from); if (!c) return;
  const [k, a1, a2, a3] = ev;
  if (k === 'claim') {
    const p = w.pickups.find(q => q.id === a1); if (!p || p.dead) return;
    if (Math.hypot(p.x - c.x, p.y - c.y) > 40) return;
    if (p.kind === 'capsule' || p.kind === 'bomb' || p.kind === 'life') { p.dead = true; w.event('powerup', { c, w: p.wpn || p.kind }); if (p.kind === 'bomb') c.pr.bombs = Math.min(3, c.pr.bombs + 1); return; }
    w.collect(c, p);
  } else if (k === 'hurt') { w.ratings.lose(12); c.hurtT = 1; w.event('hurt', { c, dmg: a1 || 1, kind: a2 }); if (a3) { const b = w.fShots.list.find(q => q.data.id === a3); if (b) b.dead = true; } }
  else if (k === 'died') { c.pr.cash = Math.max(0, c.pr.cash - 2500); c.pr.deaths++; w.ratings.lose(25); w.event('died', { c }); }
  else if (k === 'bomb') { c.place(a1 / 10, a2 / 10); w.showstopper(c); }
  else if (k === 'boat') { const g = w.ratings.add(a1, w); c.pr.boatGain += g; w.event('showboat', { c, gain: Math.round(g) }); }
  else if (k === 'respawn') w.event('respawn', { c });
};
/** the host moves a remote contestant from its newest report; a client draws the others from snapshots */
NET.stepRemote = (w, c, dt) => {
  if (c.ctl === 'remote') {
    const r = NET.reports[c.netId];
    if (r) { const s = r.s; const tx = s[0] / 10, ty = s[1] / 10; c.body.vx = (tx - c.x) * 10; c.body.vy = (ty - c.y) * 10; c.x = lerp(c.x, tx, Math.min(1, dt * 14)); c.y = lerp(c.y, ty, Math.min(1, dt * 14)); c.aim = s[2] / 1000; c.firing = !!(s[3] & 1); c.slideT = s[3] & 2 ? .2 : 0; c.boatT = s[3] & 4 ? .3 : 0; c.weapon = WPN_CODES[s[4]] || 'blaster'; c.wT = s[5] / 10; c.hp = s[6]; c.addons.shield = s[3] & 16 ? 1 : 0; c.addons.records = s[3] & 32 ? 1 : 0; c.addons.speed = s[3] & 64 ? 1 : 0; c.state = s[3] & 8 ? 'dead' : s[3] & 512 ? 'drop' : s[3] & 256 ? 'walkin' : s[3] & 1024 ? 'exit' : 'play'; c.facing = c.firing ? c.aim : Math.hypot(c.body.vx, c.body.vy) > 5 ? Math.atan2(c.body.vy, c.body.vx) : c.facing; }
    c.fireCD -= dt;
    if (c.state === 'play') MT.fireWeapon(w, c, dt); else c.laserSeg = null;
    return;
  }
  // mirror: interpolated in NET.applySnapshots; cosmetic shots from its flags
  c.recA += 4.2 * dt;
  if (c.state === 'play') { c.fireCD -= dt; MT.fireWeapon(w, c, dt); }
};
// ------------------------------------------------------------------------------------------------ the client's step
NET.clientStep = (w, dt) => {
  if (NET.pendingRoom) { const d = NET.pendingRoom; NET.pendingRoom = null; NET.roomSeq = d.rm - 1; PLAY.load(d.id, d.entry); w = PLAY.world; NET.roomSeq = d.rm; }
  w.lastDt = dt; w.time += dt; w.phaseT += dt;
  const me = NET.local();
  if (me && !NET.ended) { const it = me.state === 'play' && !NET.overlayOpen ? (me.ctl === 'bot' ? MT.bot.intent(w, me, dt) : MT.intentFrom(me.input, me)) : null; me.step(dt, w, it); }
  NET.applySnapshots(w, dt);
  for (const c of w.contestants) if (c.ctl === 'mirror') NET.stepRemote(w, c, dt);
  w.pShots.update(dt, w.arena.map); w.fShots.update(dt, w.arena.map); MT.stepProjectiles(w, dt);
  for (const L of w.lobs) { L.t += dt; L.vz -= L.g * dt; L.x += L.vx * dt; L.y += L.vy * dt; L.z += L.vz * dt; if (L.z <= 0) { L.dead = true; NET.landed.add(L.id); if (L.kind === 'tomato') { w.decals.push({ kind: 'splat', x: L.x, y: L.y, r: 14, t: 0, life: 6 }); MT.sfx('splat'); if (me && me.targetable && dist2(me, L) < (10 + me.r) ** 2) w.hurtContestant(me, 1, { kind: 'tomato', id: L.id, x: L.x, y: L.y }); } } }
  E.prune(w.lobs, L => L.dead);
  for (const e of w.enemies) e.t += dt;
  w.collide(dt);
  for (const d of w.decals) d.t += dt; E.prune(w.decals, d => d.t > d.life);
  for (const d of w.decals) if (d.kind === 'splat' && me && dist2(me, d) < d.r * d.r) me.slowT = .1;
  if (w.boss && me && me.targetable) { const b = w.boss.rs, d = Math.hypot(me.x - b.x, me.y - b.y); if (d < 24 + me.r && !b.gone) { const a = Math.atan2(me.y - b.y, me.x - b.x); me.x = b.x + Math.cos(a) * (24 + me.r); me.y = b.y + Math.sin(a) * (24 + me.r); clampInterior(me.body, 5); const spd = Math.hypot(b.x - (NET._bx || b.x), b.y - (NET._by || b.y)) / dt; if (spd > 100) w.hurtContestant(me, 2, { kind: 'mashy', x: b.x, y: b.y }); } NET._bx = b.x; NET._by = b.y; }
  // claims: touch a pickup, hide it, apply weapons at once, tell the host
  if (me && me.targetable) for (const p of w.pickups) { if (p.dead || NET.claims.has(p.id) || (p.locked && p.locked())) continue; if (dist2(me, p) < (me.r + 7) ** 2) { NET.claims.add(p.id); p.dead = true; if (p.kind === 'capsule') { MT.giveItem(w, me, p.wpn); w.event('powerup', { c: me, w: p.wpn }); } else if (p.kind === 'bomb') MT.sfx('powerup'); else MT.sfx('kaching'); NET.outbox.push(['claim', p.id]); } }
  E.prune(w.pickups, p => p.dead);
  // what my contestant did goes to the host
  for (const ev of w.events) if (ev.data && ev.data.c === me) { if (ev.name === 'hurt') NET.outbox.push(['hurt', ev.data.dmg, ev.data.kind, ev.data.id]); else if (ev.name === 'died') NET.outbox.push(['died']); else if (ev.name === 'bomb') NET.outbox.push(['bomb', q10(me.x), q10(me.y)]); else if (ev.name === 'showboat') NET.outbox.push(['boat', ev.data.gain]); else if (ev.name === 'respawn') NET.outbox.push(['respawn']); }
  w.arena.update(dt, () => {});
  if (!MT.cfg.skipRigs) { for (const c of w.contestants) c.animate(dt); for (const e of w.enemies) MT.animateEnemy(e, dt); if (w.boss) w.boss.animate(dt); }
  for (const c of w.contestants) c.syncRs();
  if (me && me.state === 'exit') { /* the host's room message moves us */ }
};
/** snapshots: the world's state at render time (120 ms behind), interpolated by id; foe shots at now */
NET.applySnapshots = (w, dt) => {
  const S = NET.snaps; if (!S.length) return;
  const tnow = now(), tr = tnow - 120;
  let a = S[0], b = S[S.length - 1];
  for (let i = 0; i < S.length - 1; i++) if (S[i].a <= tr && S[i + 1].a >= tr) { a = S[i]; b = S[i + 1]; break; }
  const k = b.a > a.a ? clamp((tr - a.a) / (b.a - a.a), 0, 1.0 + 100 / Math.max(1, b.a - a.a)) : 1, newest = S[S.length - 1];
  if (newest.id !== w.room.id) return;
  // the show's numbers
  w.ratings.R = newest.R / 10; w.ratings.prime = newest.pm / 10; w.wave = newest.wv;
  const ph = PHASE_CODES[newest.ph]; if (ph && ph !== w.phase) { w.phase = ph; w.phaseT = newest.pt / 10; }
  DOOR_IDS.forEach((id, i) => { const code = (newest.dr >> (i * 2)) & 3, d = w.arena.doors[id]; const want = ['closed', 'opening', 'open', 'exit'][code]; if (want === 'exit' && d.state !== 'exit') { const to = MT.ROOMS[w.room.exits[id]]; d.isExit = true; d.sign = to ? { name: w.room.lightning ? 'NEXT' : to.name, icon: MT.roomIcon(to), room: to.id } : null; } if (want === 'opening' && d.state === 'closed') { d.state = 'opening'; d.t = 0; } else if (want === 'opening' && d.state === 'open') { d.state = 'closing'; d.t = 0; } else if (want !== 'opening') { d.state = want; d.u = want === 'closed' ? 0 : 1; } });
  // contestants: my own is mine; the others interpolated; everyone's money from the host
  const PA = new Map(a.P.map(p => [p[0], p])), PB = new Map(b.P.map(p => [p[0], p]));
  for (const c of w.contestants) {
    const pb = PB.get(c.netId), pa = PA.get(c.netId) || pb; const pn = newest.P.find(p => p[0] === c.netId);
    if (pn) { c.pr.cash = pn[9]; c.pr.kills = pn[11]; if (c.netId !== NET.me) { c.pr.bombs = pn[10]; } }
    if (c.netId === NET.me || !pb) continue;
    const nx = lerp(pa[1], pb[1], k) / 10, ny = lerp(pa[2], pb[2], k) / 10; c.body.vx = (nx - c.x) / Math.max(dt, 1e-3); c.body.vy = (ny - c.y) / Math.max(dt, 1e-3); c.x = nx; c.y = ny;
    c.aim = pb[3] / 1000; const f = pb[4]; c.firing = !!(f & 1); c.slideT = f & 2 ? .2 : 0; c.boatT = f & 4 ? .3 : 0; c.addons.shield = f & 16 ? 1 : 0; c.addons.records = f & 32 ? 1 : 0; c.addons.speed = f & 64 ? 1 : 0; c.invuln = f & 128 ? .2 : 0;
    c.state = f & 8 ? 'dead' : f & 512 ? 'drop' : f & 256 ? 'walkin' : f & 1024 ? 'exit' : 'play'; if (c.state === 'dead') c.deadT = 1;
    c.weapon = WPN_CODES[pb[5]] || 'blaster'; c.wT = pb[6] / 10; c.hp = pb[7]; c.pr.lives = pb[8];
    c.facing = c.firing ? c.aim : Math.hypot(c.body.vx, c.body.vy) > 5 ? Math.atan2(c.body.vy, c.body.vx) : c.facing;
  }
  // enemies by id
  const EA = new Map(a.E.map(e => [e[0], e])), seen = new Set();
  for (const eb of b.E) {
    const ea = EA.get(eb[0]) || eb; seen.add(eb[0]);
    let e = w.enemies.find(q => q.id === eb[0]);
    const kind = KIND_CODES[eb[1]]; if (!kind) continue;
    if (!e) { const A = ENEMIES[kind]; e = { id: eb[0], kind, x: eb[2] / 10, y: eb[3] / 10, z: 0, vx: 0, vy: 0, face: eb[4] / 100, r: A.r, hp: 1, maxHp: 1, state: 'walk', t: 0, flash: 0, dead: false, alpha: kind === 'mime' ? .45 : 1, mirror: true }; e.rs = { kind, x: e.x, y: e.y, z: 0, face: e.face, vx: 0, vy: 0, state: 'walk', t: 0, t2: 0, hpPct: 1, flash: 0, alpha: e.alpha }; w.enemies.push(e); }
    const nx = lerp(ea[2], eb[2], k) / 10, ny = lerp(ea[3], eb[3], k) / 10; e.vx = (nx - e.x) / Math.max(dt, 1e-3); e.vy = (ny - e.y) / Math.max(dt, 1e-3); e.x = nx; e.y = ny; e.face = eb[4] / 100; e.state = STATE_CODES[eb[5]] || 'walk';
    const hp = eb[6] / 100; if (hp < (e.rs.hpPct || 1) - .001) e.flash = .08; e.flash = Math.max(0, e.flash - dt);
    e.entering = !!eb[8]; e.z = (kind !== 'tank' && eb[7]) ? eb[7] : 0; if (kind === 'tank') e.turret = eb[7] / 100;
    const s = e.rs; s.x = e.x; s.y = e.y; s.z = e.z; s.face = e.face; s.vx = e.vx; s.vy = e.vy; s.state = e.state; s.t = e.t; s.hpPct = hp; s.flash = e.flash; s.alpha = e.alpha; s.turret = e.turret; s.tread = (s.tread || 0) + Math.hypot(e.vx, e.vy) * dt;
  }
  for (const e of w.enemies) if (!seen.has(e.id) && !e.dead) { e.dead = true; }
  E.prune(w.enemies, e => e.dead);
  // foe shots from the newest snapshot, moved to now; lobs separately
  const age = Math.max(0, (tnow - newest.a) / 1000), byId = new Map(w.fShots.list.map(q => [q.data.id, q])), keep = new Set();
  for (const bb of newest.B) {
    const kind = BULLET_CODES[bb[1]]; keep.add(bb[0]);
    if (kind === 'tomato' || kind === 'tot') { if (NET.landed.has(bb[0]) || w.lobs.some(L => L.id === bb[0])) continue; const L = { id: bb[0], kind, x: bb[2] / 10 + bb[4] * age, y: bb[3] / 10 + bb[5] * age, z: bb[6] + bb[7] * age, vx: bb[4], vy: bb[5], vz: bb[7] - 360 * age, g: 360, tx: bb[8], ty: bb[9], t: 0 }; if (L.z > 0) w.lobs.push(L); continue; }
    let q = byId.get(bb[0]);
    const x = bb[2] / 10 + bb[4] * age, y = bb[3] / 10 + bb[5] * age;
    if (!q) { const F = FOE[kind] || FOE.orb; q = w.fShots.fire({ x, y, z: 10, vx: bb[4], vy: bb[5], r: F.r, life: 6, team: 'f', color: F.color, core: F.core, data: { id: bb[0], kind } }); }
    else if (Math.hypot(q.x - x, q.y - y) > 6) { q.x = x; q.y = y; q.vx = bb[4]; q.vy = bb[5]; }
  }
  for (const q of w.fShots.list) if (!keep.has(q.data.id) && q.t > .25) q.dead = true;
  E.prune(w.fShots.list, q => q.dead);
  // pickups by id
  const kseen = new Set();
  for (const kk of newest.K) {
    kseen.add(kk[0]); if (NET.claims.has(kk[0])) continue;
    let p = w.pickups.find(q => q.id === kk[0]);
    const kind = PICK_CODES[kk[1] % 16], wpn = kk[1] >= 16 ? CAPSULES[Math.floor(kk[1] / 16) - 1] : undefined;
    if (!p) { p = MT.makePickup(kind, kk[2] / 10, kk[3] / 10, { wpn }); p.id = kk[0]; p.z = kk[4]; w.pickups.push(p); }
    p.x = kk[2] / 10; p.y = kk[3] / 10; p.z = kk[4]; p.ttl = kk[5] < 0 ? Infinity : kk[5] / 10; p.vz = 0;
  }
  for (const p of w.pickups) if (!kseen.has(p.id)) p.dead = true;
  E.prune(w.pickups, p => p.dead);
  // the boss from its own netplay state
  if (newest.G) { const kind = newest.G[0]; if (!w.boss || w.boss.kind !== kind) { const B = MT.BOSSES[kind]; w.boss = new B(w); w.boss.introDone = true; } w.boss.fromNet(newest.G); } else if (w.boss) w.boss = null;
  // the host's events, each once
  for (const v of newest.V) { const [seq, code, o] = v; if (seq <= NET.lastV) continue; NET.lastV = seq; NET.playEvent(w, EVENT_CODES[code], o); }
};
NET.playEvent = (w, name, o) => {
  const me = NET.local(), d = {};
  for (const k in o) d[k] = o[k] && typeof o[k] === 'object' && o[k].c !== undefined ? w.contestantById(o[k].c) : o[k];
  if (d.c && d.c === me && ['hurt', 'died', 'showboat', 'bomb', 'powerup', 'respawn'].includes(name)) return;
  if (name === 'blast' && me && me.targetable && dist2(me, d) < (d.r + me.r) ** 2) w.hurtContestant(me, 1, { kind: d.kind, x: d.x, y: d.y });
  if (name === 'bomb' && d.c && d.c !== me) { w.fShots.clear(); }
  if ((name === 'cash' || name === 'prize' || name === 'key') && d.c !== me) return;
  w.events.push({ name, data: d, seq: 0, at: w.time });
};
// ------------------------------------------------------------------------------------------------ leaving, the round's end
NET.onLeave = e => {
  NET.left.add(e.id);
  const w = PLAY.world; if (!w) return;
  const c = w.contestantById(e.id); if (c) { if (game.particles) game.particles.bits(c.x, c.y, 8, 20, ['#ffcc33', '#ff2e88', '#2ee6ff']); MT.banners.show(c.pr.name + ' LEFT THE STUDIO', { color: SLOT_COLORS[c.slot] }); E.prune(w.contestants, q => q === c); E.prune(MT.run.contestants, q => q === c); }
  if (NET.isHost && !MT.run.contestants.length) NET.finish(false);
};
/** the host ends the round once: the 'over' message first, then AIHub.finish with standings by cash */
NET.finish = (won) => {
  if (!NET.isHost || NET.finished) return; NET.finished = true;
  const H = NET.hubObj(), list = MT.run.contestants.filter(c => !NET.left.has(c.netId));
  const sorted = list.slice().sort((a, b) => b.pr.cash - a.pr.cash), standings = [];
  for (const c of sorted) { const last = standings[standings.length - 1]; if (last && sorted.find(q => q.netId === last[0]).pr.cash === c.pr.cash) last.push(c.netId); else standings.push([c.netId]); }
  const scores = {}, stats = {}; for (const c of list) { scores[c.netId] = c.pr.cash; stats[c.netId] = { Kills: c.pr.kills, Prizes: c.pr.prizes.length, Deaths: c.pr.deaths }; }
  const best = (f) => list.length ? list.reduce((a, b) => f(b) > f(a) ? b : a) : null;
  const awards = []; const e1 = best(c => c.pr.cash), e2 = best(c => c.pr.kills), e3 = best(c => c.pr.boatGain);
  if (e1) awards.push({ id: e1.netId, title: 'BIGGEST EARNER', detail: money(e1.pr.cash) }); if (e2) awards.push({ id: e2.netId, title: 'MOST MASHES', detail: e2.pr.kills + ' KILLS' }); if (e3 && e3.pr.boatGain > 0) awards.push({ id: e3.netId, title: 'CROWD FAVORITE', detail: Math.round(e3.pr.boatGain) + ' RATINGS FROM SHOWBOATING' });
  NET.over = { t: 'over', won: !!won, standings, scores, stats };
  NET.send(NET.over, true);
  if (H.finish) H.finish({ standings, scores, won: !!won, stats, awards });
};
NET.roundWon = () => { if (NET.isHost && NET.finishAt === undefined) NET.finishAt = (NET.clock || 0) + .1; };
MT.on('ev:bossDead', () => { if (NET.active && NET.isHost && NET.finishAt === undefined) NET.finishAt = (NET.clock || 0) + 3; });
NET.onEnd = e => {
  if (NET.ended) return; NET.ended = true; NET.endReason = e.reason;
  for (const p of game.players) p.clear();
  if (game.audio) { game.audio.stopMusic(.3); game.audio.mute(true); }
  game.go('sessionEnd', { reason: e.reason }, { fade: 0 });
};
NET.endScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter(d = {}) { this.reason = d.reason || 'finished'; this.t = 0; },
  update(dt) { this.t += dt; for (const p of game.players) p.clear(); MT.frontCam(); },
  draw(r) {
    const t = game.real; backdrop(r, t, .65);
    r.overlay(g => {
      const R = this.reason, title = R === 'finished' ? "THAT'S OUR SHOW!" : R === 'sat-out' ? 'YOU SAT THIS ONE OUT' : R === 'session-ended' ? 'THANKS FOR WATCHING' : 'WE ARE EXPERIENCING TECHNICAL DIFFICULTIES';
      UI.title(g, title, r.W / 2, 30, R === 'finished' ? 3 : 1);
      const O = NET.over; if (O && O.scores && MT.run) { let y = 80; for (const grp of O.standings) for (const id of grp) { const c = MT.run.contestants.find(q => q.netId === id) || null; const name = c ? c.pr.name : 'PLAYER ' + (id + 1); UI.text(g, name, r.W / 2 - 80, y, c ? SLOT_COLORS[c.slot] : '#fff7e8', { scale: 2 }); UI.text(g, money(O.scores[id] || 0), r.W / 2 + 80, y, '#ffcc33', { align: 'right', scale: 2 }); y += 20; } if (O.won) UI.text(g, 'MASHY WAS MASHED! A WIN FOR THE TEAM!', r.W / 2, y + 6, '#3aff6a', { align: 'center' }); }
    });
  },
};
NET.serverScene = {
  input: MASH_MENU, view: 'threequarter', expand: true, touch: [],
  enter() { PLAY.overlay = null; MT.run.mode = 'session'; PLAY.load('L1', 'S'); this.t = 0; },
  update(dt) {
    this.t += dt; const w = PLAY.world; if (!w || NET.ended) return;
    NET.step(dt); w.step(dt); NET.serverDrain(w);
    if (w.outcome && !w.outcomeTaken) { w.outcomeTaken = true; if (w.outcome.exit) { PLAY.load(w.outcome.to, MT.entryFor(w.outcome.exit)); NET.roomChanged(PLAY.world); } else NET.roundWon(); }
  },
  draw(r) { r.sky(['#0c0618', '#140a24', '#0c0618']); r.overlay(g => { UI.title(g, 'STUDIO SERVER', r.W / 2, r.H / 2 - 20, 2); const w = PLAY.world; UI.text(g, w ? w.room.name + ' - ' + w.phase + ' - ' + w.enemies.length + ' ENEMIES' : '', r.W / 2, r.H / 2 + 14, '#c9b6e4', { align: 'center' }); }); },
};
// the server keeps a ring of events for snapshots even though it plays no reactions
NET.serverDrain = w => { for (const ev of w.events) { w.ring.push([ev.seq, ev.name, ev.data]); if (w.ring.length > 60) w.ring.shift(); } w.events.length = 0; };
// ------------------------------------------------------------------------------------------------ the session overlay (never pauses)
NET.toggleOverlay = () => { NET.overlayOpen = !NET.overlayOpen; MT.overlay.open = NET.overlayOpen; MT.overlay.who = NET.overlayOpen ? 'session' : null; MT.sfx(NET.overlayOpen ? 'bell' : 'back'); };
NET.overlayStep = () => {
  if (!NET.active || NET.ended || game.sceneName !== 'play') return;
  const I = game.input, createHeld = I.held && I.held.has('Pad8');
  if (I.pressed('pause') && !createHeld) NET.toggleOverlay();
  if (!NET.overlayOpen) return;
  const nav = UI.nav(), items = ['VOLUME', 'MUSIC', 'BUTTON SYMBOLS', 'CLOSE'];
  if (nav.up) NET.ov.i = (NET.ov.i + 3) % 4; if (nav.down) NET.ov.i = (NET.ov.i + 1) % 4;
  const S = game.settings, adj = d => { if (NET.ov.i === 0) S.set('volume', clamp(S.volume + d * .1, 0, 1)); if (NET.ov.i === 1) S.set('music', clamp(S.music + d * .1, 0, 1)); if (NET.ov.i === 2) S.set('glyphs', S.glyphs === 'xbox' ? 'playstation' : 'xbox'); };
  if (nav.left) adj(-1); if (nav.right) adj(1);
  if (nav.confirm) { if (NET.ov.i === 3) NET.toggleOverlay(); else adj(1); }
  if (nav.cancel && !I.pressed('pause')) NET.toggleOverlay();
};
NET.drawOverlay = r => {
  if (!NET.overlayOpen) return;
  r.overlay(g => {
    const w = 200, h = 110, x = r.W / 2 - w / 2, y = r.H / 2 - h / 2, S = game.settings, t = game.real;
    UI.panel(g, x, y, w, h); UI.text(g, 'SESSION MENU (THE SHOW GOES ON)', r.W / 2, y + 6, '#ffcc33', { align: 'center', font: 'tiny' });
    const vals = [Math.round(S.volume * 100) + '%', Math.round(S.music * 100) + '%', S.glyphs === 'xbox' ? 'XBOX' : 'PLAYSTATION', ''];
    ['VOLUME', 'MUSIC', 'BUTTON SYMBOLS', 'CLOSE'].forEach((lab, i) => UI.row(g, { x: x + 8, y: y + 18 + i * 21, w: w - 16, h: 19 }, lab, NET.ov.i === i, t, { scale: 1, align: 'left', value: vals[i] }));
  });
};
MT.on('ev:phase', () => {});
// the play scene in a session: no pause; Esc / Options opens the session overlay instead
const _sessionHook = () => { if (NET.active) NET.overlayStep(); };
E.HOOKS && E.HOOKS.step.push(g => { if (g === game) _sessionHook(); });

// ---- 60-play.js ----
// ---- the play scene: the run, the room state machine around the World, overlays, transitions, joining, continues ----
/** a new run: { mode: 'arcade' | 'rehearsal' | 'session' | 'attract' | 'test', diff, seed, ep } */
MT.newRun = (o = {}) => {
  const seed = o.seed === undefined ? (Math.floor(Math.random() * 1e9) >>> 0) : o.seed >>> 0;
  MT.seedAll(seed); MT.resetIds();
  MT.run = { mode: o.mode || 'arcade', diff: o.diff || 'CONTESTANT', seed, ep: o.ep || 1, roomId: null, path: [], keys: 0, keyRooms: [], players: [], contestants: [], ratings: new Ratings(15), tut: {}, seen: {}, prizeBag: {}, devTouched: false, startedAt: game ? game.real : 0, recaps: 0 };
  LINES.clear(); MT.banners.list.length = 0; MT.tut.cur = null; MT.tut.queue.length = 0;
  return MT.run;
};
/** a contestant joins the run: { slot, look, ctl: 'local' | 'bot' | 'remote' | 'mirror', input, bot, name, netId } */
MT.addRunPlayer = (o) => {
  const run = MT.run, slot = o.slot === undefined ? run.players.length : o.slot;
  const pr = MT.makePlayerRecord(slot, o.look === undefined ? slot : o.look, o.name); if (o.netId !== undefined) pr.id = o.netId;
  run.players.push(pr);
  const c = new Contestant(pr, { ctl: o.ctl || 'local', input: o.input || null, bot: o.bot || null, netId: o.netId === undefined ? slot : o.netId });
  if (o.god) c.godMode = true; if (o.infBombs) c.infBombs = true;
  run.contestants.push(c);
  return c;
};
const PLAY = MT.play = { world: null, overlay: null, trans: null, extras: [], t: 0 };
/** load a room into a fresh World (the contestants carry over) */
PLAY.load = (roomId, entry, hold) => {
  const run = MT.run, room = MT.ROOMS[roomId];
  if (!room) { game.fail('load room', new Error('no room ' + roomId)); return null; }
  const w = new World({ room, entry: entry || 'S', run, session: run.mode === 'session', attract: run.mode === 'attract', mode: (MT.net && MT.net.active && !MT.net.isHost) ? 'mirror' : 'auth' });
  if (MT.net && MT.net.active) MT.net.attachWorld(w);
  for (const c of run.contestants) { if (c.state !== 'out') { c.state = 'play'; c.hp = Math.max(c.hp, 1); c.invuln = 0; c.boatT = 0; c.slideT = 0; } w.contestants.push(c); }
  run.roomId = roomId; run.ep = room.ep || run.ep; if (!run.path.includes(roomId)) run.path.push(roomId);
  if (room.props) w.props = room.props;
  PLAY.world = w; PLAY.extras.length = 0;
  if (hold) w.phase = 'HOLD'; else w.begin();
  const ep = MT.EPISODES[room.ep] || MT.EPISODES[1];
  if (room.type === 'boss') { /* the boss intro starts its music */ } else if (room.type === 'bonus') MT.music.play('recap'); else MT.music.play(ep.song);
  if (run.mode === 'arcade' && room.ep) { const best = E.store.get('mashtv:eps', 1); if (room.ep > best) E.store.set('mashtv:eps', room.ep); }
  game.lights.enabled = true; game.lights.ambient = w.arena.set.ambient;
  if (!game.headless) w.arena.fitCamera();
  return w;
};
/** the static wipe between rooms: out (.4 s), fn at its middle, in (.4 s) */
PLAY.wipe = (fn) => { PLAY.trans = { t: 0, fn, fired: false }; MT.sfx('static'); };
/** an overlay that holds the world still: { update(dt) -> true while it runs, draw(r) } */
PLAY.show = ov => { PLAY.overlay = ov; };
PLAY.mapCard = (cur, next, then) => {
  const ep = (MT.ROOMS[next] && MT.ROOMS[next].ep) || MT.run.ep;
  return { t: 0, update(dt) { this.t += dt; const nav = UI.nav(); if (this.t > .4 && (nav.confirm || nav.start)) this.t = 99; return this.t < 2.5; }, draw(r) { r.overlay(g => HUD.mapCard(g, r, ep, MT.run, cur, next, game.real, this.t / 1.2)); }, done: then };
};
PLAY.episodeCard = (epId, then) => {
  LINES.seq('ep' + epId); MT.music.play('theme', { fade: .3 });
  return { t: 0, update(dt) { this.t += dt; const nav = UI.nav(); if (this.t > .6 && (nav.confirm || nav.start)) { LINES.clear(); this.t = 99; } return this.t < 4.2 || (LINES.busy() && this.t < 12); }, draw(r) { r.overlay(g => HUD.episodeCard(g, r, epId, this.t)); }, done: then };
};
/** the next room through an exit */
PLAY.advance = (out) => {
  const from = MT.run.roomId, to = out.to, entry = MT.entryFor(out.exit);
  if (MT.net && MT.net.active && !MT.net.isHost) return;   // a client waits for the host's room message
  PLAY.wipe(() => {
    if (MT.run.mode === 'attract') { MT.attract.next(); return; }
    if (MT.run.mode === 'session') { PLAY.load(to, entry); if (MT.net) MT.net.roomChanged(PLAY.world); return; }
    PLAY.show(PLAY.mapCard(from, to, () => PLAY.wipe(() => PLAY.load(to, entry))));
  });
};
/** a pad's Start mid-run: a new contestant drops in on a cable */
PLAY.join = (input) => {
  const run = MT.run; if (!run || run.mode !== 'arcade' && run.mode !== 'rehearsal') return;
  const used = run.contestants.map(c => c.slot); let slot = 0; while (used.includes(slot)) slot++; if (slot > 3) return;
  input.use(MASH_PLAY);
  const c = MT.addRunPlayer({ slot, look: slot, ctl: 'local', input });
  const w = PLAY.world; if (w) { w.contestants.push(c); const [x, y] = w.freePoint(30); c.dropIn(x, y); }
  MT.banners.show('P' + (slot + 1) + ' ' + c.pr.name + ' JOINS!', { color: SLOT_COLORS[slot] });
};
PLAY.continueOverlay = () => {
  const cab = MT.cab; LINES.seq('continue'); MT.music.play(null);
  cab.continue(10, ok => {
    if (ok) { for (const c of MT.run.contestants) { c.pr.lives = startLivesNow(); c.pr.cash = Math.floor(c.pr.cash / 2); c.pr.continues++; c.state = 'dead'; c.deadT = .3; } MT.banners.show(MT.TEXT.ui.network, { color: '#ff3344' }); MT.music.play((MT.EPISODES[MT.run.ep] || MT.EPISODES[1]).song); PLAY.overlay = null; }
    else game.go('gameover', {});
  });
  let tick = 10;
  return { cont: true, update(dt) { cab.update(dt); const left = cab._cont ? Math.ceil(cab._cont.t) : 0; if (left !== tick) { tick = left; MT.music.sting('tick'); } return cab.continuing; },
    draw(r) { r.overlay(g => { const left = cab._cont ? Math.max(0, Math.ceil(cab._cont.t)) : 0; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); UI.title(g, MT.TEXT.ui.continueQ, r.W / 2, r.H * .28, 3); UI.title(g, String(left), r.W / 2, r.H * .28 + 34, 5, { colors: ['#ffffff', '#ff3344'] }); UI.text(g, MT.TEXT.ui.halfWinnings, r.W / 2, r.H * .28 + 84, '#ff3344', { align: 'center', scale: 2 }); UI.promptBar(g, r, [['confirm', 'CONTINUE']]); }); } };
};
MT.scenes = MT.scenes || {};
MT.scenes.play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], input: MASH_PLAY, touch: [], camera: { zoom: false }, expand: true,
  enter(data = {}) {
    PLAY.overlay = null; PLAY.trans = null; PLAY.t = 0; MT.overlay.open = false;
    if (!MT.run) { MT.newRun({ mode: 'arcade' }); MT.addRunPlayer({ slot: 0, input: game.input }); }
    const run = MT.run;
    game.setView(game.settings.camView === 'Overhead' ? 'topdown' : 'threequarter');
    this.pausable = run.mode !== 'session' && run.mode !== 'attract';
    if (run.mode === 'arcade' || run.mode === 'rehearsal') game.allowJoin({ max: 4, keys: false, onJoin: (input) => PLAY.join(input) }); else game.allowJoin(false);
    for (const p of game.players) p.touchEnabled = false;
    const room = data.room || run.roomId || '1-1';
    PLAY.load(room, data.entry || 'S', !!data.intro);
    const w = PLAY.world;
    if (data.intro === 'coldOpen') { PLAY.show(MT.cut.overlay(MT.cut.coldOpen(w), () => PLAY.show(PLAY.episodeCard(1, () => { w.begin(); MT.music.play(MT.EPISODES[1].song); })))); }
    else if (data.intro === 'episode') { PLAY.show(PLAY.episodeCard(MT.ROOMS[room].ep, () => { w.begin(); MT.music.play(MT.EPISODES[MT.ROOMS[room].ep].song); })); }
    else if (data.intro === 'greenroom') { LINES.seq('greenRoomOpen'); PLAY.show({ t: 0, update(dt) { this.t += dt; return this.t < 3; }, draw(r) {}, done: () => w.begin() }); }
    if (data.after) data.after(w);
  },
  exit() { MT.overlay.open = false; if (MT.dev) MT.dev.close(true); if (!game.headless) game.screen.canvas && (game.screen.canvas.style.cursor = ''); },
  update(dt) {
    const w = PLAY.world, real = game.paused ? 0 : 1 / 120;
    PLAY.t += dt;
    if (w && !game.headless) { w.arena.fitCamera(); game.focus(AR.CX, AR.CY, 0); }
    if (w && MT.run.mode !== 'session') { const want = w.enemies.length >= 30; if (want !== PLAY.intense) { PLAY.intense = want; MT.music.layer('intense', want, 1); } }
    PLAY.murmur = (PLAY.murmur || 0) - dt; if (PLAY.murmur <= 0) { PLAY.murmur = 2.6; MT.babble.crowd('murmur', .25 + STUDIO.excite * .4); }
    if (PLAY.staticT > 0) PLAY.staticT -= dt;
    LINES.step(real || 0); MT.banners.step(dt); MT.tut.step(dt);
    if (MT.net && MT.net.active) MT.net.step(dt);
    if (PLAY.trans) { const T = PLAY.trans; T.t += 1 / 120; if (!T.fired && T.t >= .4) { T.fired = true; T.fn(); } if (T.t >= .8) PLAY.trans = null; }
    if (PLAY.overlay) { const ov = PLAY.overlay; if (!ov.update(dt)) { if (PLAY.overlay === ov) PLAY.overlay = null; if (ov.done) ov.done(); } if (!ov.cont) { MT.studioStep(dt, w); for (const x of PLAY.extras) x.step && x.step(dt); return; } }
    if (MT.dev && MT.dev.isOpen()) { MT.dev.update(dt); if (MT.dev.frozen()) return; }
    if (!w) return;
    if (w.phase === 'HOLD') { MT.studioStep(dt, w); return; }
    if (w.phase === 'BOSS_INTRO' && w.boss && !w.boss.introDone && w.boss.skipIntro && MT.run.mode !== 'session' && MT.run.mode !== 'attract' && game.players.some(p => p.map.confirm && p.pressed('confirm'))) { LINES.clear(); w.boss.skipIntro(); }
    if (MT.net && MT.net.active && !MT.net.isHost) MT.net.clientStep(w, dt);
    else w.step(dt);
    MT.react.drain(w); MT.studioStep(dt, w);
    for (const x of PLAY.extras) x.step && x.step(dt);
    if (MT.run.mode === 'attract') { MT.attract.step(dt, w); return; }
    // a contestant out of lives continues on their own with Start; everyone out: the continue countdown
    if (MT.run.mode !== 'session') {
      for (const c of w.contestants) if (c.state === 'out' && c.ctl === 'local' && c.input && c.input.pressed('start') && !w.allOut()) w.continueContestant(c);
      if (w.allOut() && !PLAY.overlay && !PLAY.trans) PLAY.show(PLAY.continueOverlay());
    }
    if (w.outcome && !PLAY.trans && !PLAY.overlay && !w.outcomeTaken) {
      w.outcomeTaken = true;
      if (w.outcome.exit) PLAY.advance(w.outcome);
      else if (w.outcome.done) PLAY.roomDone(w);
    }
  },
  draw(r) {
    const w = PLAY.world, t = game.real;
    if (!w) { r.sky(['#140a24', '#2a1446', '#140a24']); return; }
    w.draw(r, t);
    for (const x of PLAY.extras) x.draw && x.draw(r, t);
    if (MT.dev) MT.dev.drawWorld(r, w);
    if (w.props) for (const [id, x, y, f] of w.props) if (E.SHAPES[id]) r.shape(id, x, y, 0, { facing: f === undefined ? Math.PI / 2 : f });
    const hideHud = PLAY.overlay && PLAY.overlay.full;
    if (!hideHud) HUD.draw(r, w, t, { noTut: !!PLAY.overlay, noReticle: !!PLAY.overlay || (MT.dev && MT.dev.isOpen()) });
    if (PLAY.overlay) PLAY.overlay.draw(r);
    if (MT.run.mode === 'attract') MT.attract.drawOverlay(r);
    if (MT.dev && MT.dev.isOpen()) MT.dev.draw(r);
    if (MT.net && MT.net.active) MT.net.drawOverlay(r);
    if (PLAY.trans) { const k = PLAY.trans.t < .4 ? PLAY.trans.t / .4 : 1 - (PLAY.trans.t - .4) / .4; r.overlay(g => UI.static(g, r, k, t)); }
    if (PLAY.staticT > 0) r.overlay(g => { px.blend(g, Math.min(1, PLAY.staticT) * .8, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#ffffff')); UI.static(g, r, Math.min(1, PLAY.staticT), t); UI.title(g, MT.TEXT.ui.signalLost, r.W / 2, r.H * .4, 3, { colors: ['#140a24', '#5a5468'] }); });
    if (!game.headless && game.screen.canvas) { const aim = game.input.lastDevice === 'mouse' && !game.paused && !PLAY.overlay && !(MT.dev && MT.dev.isOpen()); game.screen.canvas.style.cursor = aim ? 'none' : ''; }
  },
};
/** a boss room or the bonus is over: the recap, the next episode, the Green Room or an ending */
PLAY.roomDone = (w) => {
  const run = MT.run, room = w.room;
  if (run.mode === 'attract') { MT.attract.next(); return; }
  if (run.mode === 'session') { if (MT.net) MT.net.roundWon(); return; }
  if (room.type === 'bonus') { game.go('ending', { kind: 'b' }); return; }
  game.go('recap', { ep: room.ep });
};

// ---- 90-main.js ----
// ---- main: the game (session-aware), our settings, pause items, boot steps, scenes, deep links, the debug handle ----
const HUB_ACTIVE = !!(GLOBAL.AIHub && GLOBAL.AIHub.active);
const SETTINGS = [
  { key: 'aimAssist', label: 'Aim assist (controller)', value: true, help: 'Nudges your aim toward a nearby enemy when you aim with a stick' },
  { key: 'autoFire', label: 'Auto-fire with the right stick', value: true, help: 'Pushing the right stick fires; off: hold R2 to fire' },
  { key: 'camView', label: 'Camera', options: ['Studio', 'Overhead'], value: 'Studio', help: 'Studio: the three-quarter studio camera. Overhead: straight down', apply: (g, v) => { if (g.sceneName === 'play') g.setView(v === 'Overhead' ? 'topdown' : 'threequarter'); } },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'chatter', label: 'Host chatter', options: ['Normal', 'Less', 'Off'], value: 'Normal', help: 'How often Lance and Penny talk during play (story scenes always play)' },
  { key: 'confetti', label: 'Confetti amount', options: ['Party', 'Tasteful'], value: 'Party', apply: (g, v) => { if (g.particles) g.particles.max = v === 'Party' ? 900 : 350; } },
];
/** a pause item closes the engine's pause screen first (it would hold the game's input back), then opens our overlay */
function leavePause() { if (game.shell && game.shell.screen) game.shell.hide(); game.resume(); if (HAS_DOM && document.activeElement && document.activeElement.blur) document.activeElement.blur(); for (const p of game.players) p.consumeAll(); }
const PAUSE_ITEMS = () => (MT.sessionActive() || (MT.run && MT.run.mode === 'attract') || game.sceneName !== 'play') ? [] : [
  ['Dev mode', () => { leavePause(); MT.dev.open(); }],
  ['Episode map', () => { leavePause(); MT.openMapOverlay(); }],
  ['How to play', () => { leavePause(); MT.openHowtoOverlay(); }],
];
/** our pause-menu overlays: while one is open the scene cannot pause; Esc or Options goes back to the pause menu,
 *  cancel (Backspace, ○) back to play */
function pauseOverlay(who, ov) {
  const sc = game.scene; const was = sc.pausable; sc.pausable = false;
  MT.overlay.open = true; MT.overlay.who = who; ov.t = 0;
  const step = ov.step;
  ov.update = function (dt) {
    this.t += dt;
    const toMenu = this.t > .15 && game.players.some(q => q.map.pause && q.pressed('pause')), toPlay = this.t > .15 && !toMenu && game.players.some(q => q.map.cancel && q.pressed('cancel'));
    if (toMenu || toPlay) { MT.sfx('back'); this.toMenu = toMenu; return false; }
    if (step) step.call(this, dt);
    return true;
  };
  ov.done = () => { MT.overlay.open = false; MT.overlay.who = null; sc.pausable = was; for (const q of game.players) q.consumeAll(); if (ov.toMenu) game.pause('player'); };
  PLAY.show(ov);
}
MT.openMapOverlay = () => {
  const run = MT.run, room = run && MT.ROOMS[run.roomId]; if (!room || !room.ep) return;
  pauseOverlay('map', { draw(r) { r.overlay(g => { HUD.mapCard(g, r, room.ep, run, run.roomId, null, game.real, 1); UI.promptBar(g, r, [['cancel', 'CLOSE'], ['pause', 'MENU']]); }); }, step() { if (game.input.clicked()) this.t = this.t; } });
};
MT.openHowtoOverlay = () => {
  pauseOverlay('howto', { page: 0, step() { const nav = UI.nav(), n = MT.TEXT.howto.length; if (nav.right || nav.tabR) this.page = Math.min(n - 1, this.page + 1); if (nav.left || nav.tabL) this.page = Math.max(0, this.page - 1); }, draw(r) { r.overlay(g => { px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.bw, r.bh, '#0c0618')); MT.drawHowto(g, r, this.page, game.real, null); }); } });
};
game = new E.Game(Object.assign({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: MASH_MENU, id: 'mashtv', fadeTime: .2,
  menu: { items: PAUSE_ITEMS, settings: SETTINGS, controls: CONTROL_NAMES, quit: HUB_ACTIVE ? false : 'title' } },
  HUB_ACTIVE ? { corner: false, autoPause: false, backGesture: false, fullscreen: 'button' } : {}));
MT.game = game;
game.input.names = CONTROL_NAMES;
E.style.propSize = 1.2;
MT.cab = new E.Arcade(game, { id: 'mashtv', hud: false, idle: 10 });
MT.loadTunes();
// scenes
const SCENES = Object.assign({}, MT.scenes);
SCENES.attract = MT.attract.scene;
if (MT.net) { SCENES.sessionCard = MT.net.cardScene; SCENES.sessionEnd = MT.net.endScene; SCENES.sessionServer = MT.net.serverScene; }
/** deep links for checks and screenshots: #room=2-3, #boss=2, #recap=1, #ending=b, #dev, #card ... (&seed=N&players=N&bot=1) */
function deepLink() {
  if (!HAS_DOM || HUB_ACTIVE) return null;
  const h = (location.hash || '').replace(/^#/, ''); if (!h) return null;
  const q = {}; for (const part of h.split('&')) { const [k, v] = part.split('='); q[k] = v === undefined ? true : decodeURIComponent(v); }
  return q;
}
MT.warpRun = (o = {}) => {
  const n = clamp(+o.players || 1, 1, 4);
  MT.newRun({ mode: o.mode || 'rehearsal', diff: o.diff || 'CONTESTANT', seed: o.seed !== undefined ? +o.seed : 7 });
  for (let i = 0; i < n; i++) MT.addRunPlayer({ slot: i, look: i, ctl: i === 0 && !o.bot ? 'local' : 'bot', input: i === 0 ? game.input : null, bot: {}, god: !!o.god });
  if (o.keys) MT.run.keys = +o.keys;
  return MT.run;
};
function startFromLink(q) {
  if (!q) return null;
  if (q.title) return ['title', {}];
  for (const s of ['lobby', 'howto', 'scores', 'about', 'attract', 'episodes', 'difficulty']) if (q[s]) return [s, {}];
  if (q.room) { MT.warpRun(q); return ['play', { room: q.room }]; }
  if (q.boss) { MT.warpRun(q); return ['play', { room: q.boss + '-B' }]; }
  if (q.greenroom) { MT.warpRun(Object.assign({ keys: 5 }, q)); return ['play', { room: 'GR', intro: 'greenroom' }]; }
  if (q.lightning) { MT.warpRun(Object.assign({}, q)); return ['play', { room: 'L1' }]; }
  if (q.recap) { MT.warpRun(q); return ['recap', { ep: +q.recap || 1, fake: true }]; }
  if (q.continue) { MT.warpRun(q); return ['play', { room: '1-1', after: w => { for (const c of w.contestants) { c.pr.lives = 0; c.state = 'out'; } } }]; }
  if (q.gameover) { MT.warpRun(q); return ['gameover', {}]; }
  if (q.initials) { MT.warpRun(Object.assign({ mode: 'arcade' }, q)); return ['initials', { queue: [{ slot: 0, cash: 123450, input: game.input, name: 'ROCKET' }] }]; }
  if (q.ending) { MT.warpRun(q); return ['ending', { kind: q.ending === 'b' ? 'b' : 'a' }]; }
  if (q.credits) { MT.warpRun(q); return ['ending', { kind: 'a', credits: true }]; }
  if (q.dev) { MT.warpRun(q); return ['play', { room: '1-1', after: () => MT.dev.open() }]; }
  if (q.card && MT.net) return ['sessionCard', { preview: true }];
  if (q.coldopen) { MT.warpRun(q); return ['play', { room: '1-1', intro: 'coldOpen' }]; }
  if (q.episode) { MT.warpRun(q); return ['play', { room: MT.EPISODES[+q.episode || 1].start, intro: 'episode' }]; }
  return null;
}
game.debug = {
  snapshot() {
    const w = PLAY.world, run = MT.run;
    const byKind = {}; if (w) for (const e of w.enemies) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    return { scene: game.sceneName, mode: run && run.mode, ep: run && run.ep, room: run && run.roomId, phase: w && w.phase, wave: w && w.wave, alive: w ? w.countedAlive() : 0, enemies: w ? w.enemies.length : 0, byKind,
      bullets: w ? w.fShots.list.length : 0, pickups: w ? w.pickups.length : 0, R: w ? Math.round(w.ratings.R) : 0, X: w ? w.ratings.X : 1, keys: run ? run.keys : 0,
      players: run ? run.contestants.map(c => ({ slot: c.slot, x: Math.round(c.x), y: Math.round(c.y), hp: c.hp, lives: c.pr.lives, cash: c.pr.cash, wpn: c.weapon, state: c.state })) : [],
      boss: w && w.boss ? { kind: w.boss.kind, phase: w.boss.phase, stage: w.boss.stage, parts: w.boss.parts.map(p => [p.id, Math.round(p.hp)]) } : null, errors: game.errors.length, overlay: !!PLAY.overlay, dev: !!(MT.dev && MT.dev.isOpen()) };
  },
  warp(target, o = {}) { return MT.dev.warp(target, o); },
  spawn(kind, n = 1, where = 'N') { const w = PLAY.world; if (!w) return; MT.spawnEntry(w, [where, kind, n, .1]); },
  give(kind, slot = 0) { const w = PLAY.world, c = MT.run && MT.run.contestants[slot]; if (w && c) MT.giveItem(w, c, kind); },
  cheat(name, on = true) { MT.cheats[name] = !!on; },
  tune(key, v) { return MT.setTune(key, v); }, resetTunes() { MT.resetTunes(); },
  bot(slot, opts = {}) { const c = MT.run && MT.run.contestants[slot]; if (c) { c.ctl = 'bot'; c.botOpts = opts; } },
  addBot(look) { const w = PLAY.world, c = MT.addRunPlayer({ slot: MT.run.contestants.length, look: look === undefined ? MT.run.contestants.length : look, ctl: 'bot', bot: {} }); if (w) { w.contestants.push(c); const [x, y] = w.freePoint(20); c.dropIn(x, y); } return c; },
  killAll() { const w = PLAY.world; if (!w) return; for (const e of w.enemies.slice()) if (!ENEMIES[e.kind].harmless) w.killEnemy(e, { owner: 0, w: 'dev' }); },
  clearRoom() { const w = PLAY.world; if (!w) return; if (w.script) w.script.cancel(); for (const d of DOOR_IDS) w.arena.doors[d].queue.length = 0; w.timers = w.timers.filter(t => !t.spawn); for (const e of w.enemies.slice()) if (!ENEMIES[e.kind].harmless) w.killEnemy(e, { owner: null, self: true, noCash: true }); w.wavesSpawned = true; if (w.boss) { for (const p of w.boss.parts) { p.hp = 0; p.alive = false; } w.boss.introDone = true; if (w.phase === 'BOSS_INTRO') w.setPhase('BOSS'); } if (w.phase === 'WAVES' || w.phase === 'INTRO' || w.phase === 'ENTER') { w.setPhase('WAVES'); } },
  chooseExit(dir) { const w = PLAY.world; return w ? w.chooseExit(dir, w.contestants[0]) : false; },
  teleport(slot, x, y) { const c = MT.run && MT.run.contestants[slot]; if (c) c.place(x, y); },
  seed(n) { MT.seedAll(n); },
  stateHash() { const w = PLAY.world; if (!w) return 0; let h = 2166136261; const mix = v => { h ^= Math.round(v * 10) | 0; h = Math.imul(h, 16777619) >>> 0; }; for (const c of w.contestants) { mix(c.x); mix(c.y); mix(c.hp); mix(c.pr.cash); } for (const e of w.enemies) { mix(e.x); mix(e.y); mix(e.hp); } mix(w.ratings.R); mix(w.enemies.length); mix(w.fShots.list.length); return h >>> 0; },
  netFake(hub) { if (MT.net) MT.net.inject(hub); },
};
game.stateHash = () => game.debug.stateHash();
const link = startFromLink(deepLink());
const firstScene = HUB_ACTIVE ? 'sessionCard' : link ? link[0] : 'title', firstData = link ? link[1] : {};
SCENES.boot = { input: MASH_MENU, update() { if (!this.went) { this.went = true; game.go(firstScene, firstData, { fade: 0 }); } }, draw(r) { r.sky(['#140a24', '#2a1446', '#140a24']); } };
game.start({ scenes: SCENES, scene: 'boot',
  boot: { title: 'MASH TV', version: MT.VERSION, steps: [
    ['Hanging the studio lights', () => { defineShapes(); MT.art.logoMask(); }],
    ['Tuning the house band', () => defineSfx()],
    ['Briefing the security goons', () => { installPresetHook(); installIdle(); for (const p of game.players) p.touchEnabled = false; }],
  ], messages: ['Inflating the party poppers', 'Rehearsing the mimes (silently)', 'Counting the prize money', 'Calibrating the applause sign'] } });
if (HUB_ACTIVE && MT.net) MT.net.begin();
})();
