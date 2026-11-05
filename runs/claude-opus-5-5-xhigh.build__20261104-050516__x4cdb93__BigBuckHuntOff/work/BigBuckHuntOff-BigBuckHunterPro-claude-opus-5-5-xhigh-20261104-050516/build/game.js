(() => {
'use strict'; const __REPORT__ = {   "sourceInformation": {     "date": "2026-11-04 05:05:16",     "source": "Big Buck Hunter Pro (arcade, 2006; designed by Play Mechanix, made and distributed by Raw Thrills)",     "plan": "PLAN.md",     "genre": "Arcade light-gun hunting shooter (a shooting gallery in a living landscape) with party versus and bonus mini-games",     "perspective": "First person on rails: a fixed vantage per site with scripted camera pans over a pseudo-3D heightfield landscape; a slow-motion Trophy Cam on big kills; side-on x-ray Shot Charts; a side-view Lodge; 2D menus",     "tech": "my-3D2dge v0.85.2 handoff package (full engine, commit 4390a98) with new engine modules vista.js, quadruped.js and babble.js; vanilla JavaScript, Canvas 2D, Web Audio; AI Hub session client 1.4.0 (ai-hub f8835e4); Node 24 headless tests; Playwright 1.63.0 with Chromium 1243",     "artDirection": "The engine's native retro-modern pixel style, at least 480x270 pixels and growing with the window (E.tones shading, 1-pixel outlines, the 5x7 font, E.font.title logos), with new procedural animals, antlers, trees, corn, reeds and farm buildings painted in code, and core-library furniture",     "animation": "The engine's native procedural rigs posed by math every step: E.Humanoid for the cast, E.Blob for the hound, and new procedural E.Quadruped (deer, elk, moose, canids, the cow, small critters) and E.Bird rigs with planted-hoof gaits, poses and a death roll; engine tweens and scripts for cameras and UI",     "audio": "All synthesized in code: bluegrass chiptune songs on the engine synth (banjo-roll pulse, square fiddle, triangle bass, noise washboard) with layers and stings, layered rifle shots with valley echoes, calls, animal voices, ambience beds, and Animalese-style gibberish voices (E.Babble)",     "online": "AI Hub Session Protocol v1 in ghost mode for 1-4 players: the game's own ready card, a timed 3-minute Hub Hunt-Off keyed to the hub clock (late joiners catch up), ghost reticles and shots of the other hunters, progress each second and one result; it passes the AI Hub harness's automatic checks (2 players; 4 players on a bad network; the host leaving). Standalone without the hub",     "testing": "Allowed: headless scripts that play the game and check its state (the engine's game.advance and game.debug), including a scripted playthrough of the whole game, kept behind one command that prints only failures and a one-line count, rerun only after changing the code it covers; screenshots only for what a script can't check; no subagents or workflows to debate, review, judge or audit; file:// preferred, and a server only on 127.0.0.1 at an OS-picked port (for the AI Hub harness), stopping only my own processes by PID. Ran: node tests/run.mjs, 209 headless checks in 8 suites (unit, every site of every hunt cleared by a bot, the full campaign from title to lodge, every mode, the hub client against a simulated hub, attract, dev mode, saves, determinism); --browser, 22 Playwright/Chromium checks (14 deep links load clean, the pick-agreement check that what is drawn is what is hit, a touch-only phone, controller glyphs); --hub, the AI Hub harness's own ?auto=1 run at 2 players, at 4 players with 150 ms latency, 50 ms jitter and 5% loss, and with the host leaving: all pass",     "research": "Planning stage (2026-11-03): Wikipedia 'Big Buck Hunter', the Highway Games listing and Macworld's iPhone review read directly; Giant Bomb, TV Tropes, MobyGames and the Sinden wiki only as search summaries; the my-3D2dge handoff docs and the AI Hub protocol docs. Build stage: no web research; the engine's and the hub's own docs and source",     "environment": "Claude Code CLI (headless); Linux; browser unknown",     "model": "Anthropic, claude-opus-5-5, reasoning effort xhigh",     "usage": "unknown"   },   "testingFeedback": [     "About 35 real game bugs that I logged and fixed, not counting a handful of bugs in the tests themselves and the lint's false alarms. Examples: the first-person lens was only set up when drawing, so headless visibility was wrong; the attract bot never hit running bucks; time-up bucks were not counted as escaped; the trophy Duke never heard calls while hidden; dialog boxes were never drawn during hunts; the camera sat at the map corner before the opening dialog; hub copies' spawns drifted apart; and five separate mismatches between what was drawn and what a shot hit (wading legs, hooves in grass, the renderer's rounded view angles, the rig's root height, overlapping body regions).",     "6: a load-time crash (a constant used before it was defined), a crash on the trophy kill (a class used before it was defined), the Range, Bonus-only and Quick modes never ending (their segment queues had no final step), the Range's pump station could not be finished, the online copies' animals drifting apart (so players hunted different deer), and the story and tutorial dialog never being drawn.",     "The pick-agreement browser check: it renders each animal through the real renderer, fires rays through the pixels it drew and 3 pixels outside them, and requires at least 95% hits inside and at most 5% outside. It found that what you saw was not what you could shoot in five different ways that no amount of playing at normal speed would have shown clearly. Close second: the scripted full playthrough, title to lodge, with a bot that has to clear every site.",     "The build's banned-word lint (it scans the source for leftover to-do markers and stand-in text). It found no real stubs and three false alarms (a method named Glyph.prompt, a comment that mentioned Math.random, and a HUD state whose name read as a to-do marker), which I renamed to keep it quiet."   ],   "engineFeedback": [     "The fixed 1/120 s step and the fact that everything can be stepped: game.advance, game.debug, scripts with _step and seeded random streams. That made a headless whole-game playthrough, bots clearing every site, the hub's catch-up for late joiners and determinism checks easy. The Shell menus and settings, the procedural Humanoid rigs, the synth and the font also gave the game a consistent look and sound fast.",     "Yes, a few times: game.saves is memory-only headless (I first assumed my save tests were broken); input presets must keep start, pause, confirm and cancel; the Shell's settings screen had no way to group or hide rows; I ran site scripts on the game clock, so hub copies drifted (fixed with a site clock); closing the pause menu also swept away my dev screen; and I assumed E.View was exact, but views are cached at rounded yaw, pitch and scale, so drawn animals were up to 7 px from their hit zones near the screen edges.",     "Vista, a first-person pseudo-3D landscape renderer: a column-marched heightfield with occlusion, water, fog, mist, a canopy, crops, billboards hidden by hills, a magnified scope lens and an exact perspective projection that shots share. The engine is built around orthographic and side views and has nothing for a first-person landscape. Second: the procedural Quadruped rig (gaits with planted hooves, poses, a death roll, and hit zones from the same joints).",     "Fitting a perspective first-person game into an engine whose views are orthographic. The animals are drawn with engine views, but shots go through a perspective lens, and keeping the two the same pixel for pixel took most of the debugging. The engine being one file of nearly 15,000 lines made it slow to find things.",     "The glyph setting now defaults to 'playstation', because the task asks for PlayStation glyphs by default. The Shell's settings screens skip hidden settings and accept a rows list with section headings, so settings could be grouped and internal ones hidden. ChipAudio.bus() defaults to the 'sfx' bus. I also added three modules: vista.js (the landscape renderer, including waterline clipping for wading animals and an exact projection for each billboard), quadruped.js (four-legged rigs and their hit zones, with a lookup that decides shoulder, gut or ham by where a round enters) and babble.js (gibberish voices).",     "A first-class perspective camera (project, ray, billboards drawn with the same projection), so first-person and rail-shooter games get matching drawing and hit tests for free instead of building their own."   ],   "promptFeedback": [     "It is concrete and checkable: the 10-foot UI rules, the glyph behaviour, attract mode after 10 s, the touch-only message, the dev-mode sliders and the exact exit-interview shape all turn straight into tests. The rules about shared ports and processes were clear too.",     "Two field definitions. 'Testing: testing parameters allowed' could mean the rules I was given or what I actually ran, so I wrote both. 'Environment' comes pre-filled while the task also says to write unknown for anything unconfirmed. Also, PLAN.md was written for a different reasoning level, and its file names had to be swapped for TASK.md's, which STAGE.md did settle.",     "Making a convincing arcade light-gun hunt in a 2D pixel engine: a first-person landscape you can see a quarter mile across, deer and elk that walk, graze, spook, run and fall believably, and shots that hit exactly what is drawn, all deterministic enough for online play and headless tests.",     "Add a prioritised must-have list or a rough time budget for the 'feature-complete vertical slice', since the scope is open-ended. Also say whether the feedback in the chat reply has to match the About screen word for word (I made them identical)."   ],   "aiHub": {     "name": "Big Buck Hunt-Off",     "tagline": "Bucks only. Bragging rights forever.",     "description": "An arcade light-gun hunting shooter in living pixel landscapes: bag the bucks, spare the does, and win the Hunt-Off alone, on the couch or online.",     "type": "Game",     "genre": "Shooter",     "source": "Big Buck Hunter Pro",     "series": "Big Buck Hunter",     "players": "1–4",     "controls": "Aim: mouse or left stick · Shoot: left click or R2 · Pump: R or Square · Scope: right click or L2 · Call: Q or Triangle",     "tags": [       "first-person",       "arcade",       "pixel art",       "versus",       "comedy",       "retro"     ]   } } ;
/* ===== src/00-core.js ===== */
// BIG BUCK HUNT-OFF
// The core loop: spot the bucks, shoot clean, pump, never shoot a doe; bag them before they're gone, then read your
// shots in x-ray and climb the standings.
//
// The game's files share this one scope (build/build.mjs joins them inside one function). 00-core holds what every
// other file reads: units, the content registries, the event bus, the random streams, the dev tuning and the records.
const E = My3D2dge, { px, clamp, lerp } = E;
const M = 16, DEG = Math.PI / 180, TAU = Math.PI * 2;
const HAS_DOM = typeof document !== 'undefined';
const VERSION = '1.0.0';
const TITLE = 'BIG BUCK HUNT-OFF';
const G = {};   // the running game's shared state (scenes, the hunt in progress, the players)
const SEG = {};  // a hunt's segment factories by kind: (H, o) -> { kind, enter, update(dt) -> done, draw(g, W, H), exit }

/* ---------- registries: content is data, referred to by id ---------- */
const REG = {};
/** def(kind, id, spec): register content (species, critter, hunt, site, trophy, bonus, pattern, prop, bark, voice, song, beat) */
function def(kind, id, spec) { (REG[kind] = REG[kind] || {})[id] = Object.assign({ id }, spec); return REG[kind][id]; }
function reg(kind, id) { const r = REG[kind] && REG[kind][id]; if (!r) throw new Error('no ' + kind + ' "' + id + '"'); return r; }
function regAll(kind) { return Object.values(REG[kind] || {}); }
function has(kind, id) { return !!(REG[kind] && REG[kind][id]); }

/* ---------- the event bus: gameplay emits, the HUD, barks, audio, stats, the bot and the hub link listen ---------- */
const bus = {
  _h: {},
  on(n, f) { (this._h[n] = this._h[n] || []).push(f); return () => this.off(n, f); },
  off(n, f) { const l = this._h[n]; if (l) { const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); } },
  emit(n, d) { const l = this._h[n]; if (!l) return; for (const f of l.slice()) { try { f(d); } catch (e) { if (G.game) G.game.fail('bus:' + n, e); else throw e; } } }
};

/* ---------- random streams: never Math.random in gameplay ---------- */
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const RNG = {
  run: 1,
  /** the run's seed (a hub session takes it from AIHub.rng('hunt')) */
  seed(n) { this.run = (n >>> 0) || 1; this._s = {}; return this.run; },
  _s: {},
  /** a named stream for the run: world, spawn, ai, bot, fx (fx is cosmetic: draw from it freely) */
  stream(name) { return this._s[name] || (this._s[name] = E.rng(strHash(name) ^ Math.imul(this.run, 2654435761))); },
  /** a fresh stream for a name (a site's spawns start the same each time it is played with the same seed) */
  fresh(name) { return (this._s[name] = E.rng(strHash(name) ^ Math.imul(this.run, 2654435761))); },
  wrap(r) { return { r, f: () => r(), int: (a, b) => a + Math.floor(r() * (b - a + 1)), range: (a, b) => a + r() * (b - a), pick: l => l[Math.floor(r() * l.length)], chance: p => r() < p }; }
};
const FX = () => RNG.stream('fx');
const fxr = (a = 1, b) => { const r = FX()(); return b === undefined ? r * a : a + r * (b - a); };

/* ---------- dev tuning: Appendix A's sliders, kept as hidden settings in the Dev group ---------- */
const TUNE_DEFS = [
  ['animalSpeed', 'Animal speed', 1, .25, 2, .05], ['spook', 'Spook from shots', 1, 0, 2, .05], ['doeShare', 'Does and fawns share', 1, 0, 2, .05],
  ['spawnRate', 'Spawn pace', 1, .5, 2, .05], ['siteTime', 'Site time limits', 1, .3, 3, .05], ['reticleSpeed', 'Pad reticle speed (px/s)', 400, 150, 900, 10],
  ['assist', 'Aim-assist friction (1 = none)', .65, 0, 1, .01], ['rounds', 'Rounds in a full tube', 5, 1, 10, 1], ['rackTime', 'Pump time (s)', .22, 0, .6, .01],
  ['reloadTime', 'Empty-tube reload (s)', 1.25, .2, 3, .05], ['scopeMag', 'Scope magnification', 3.5, 1.5, 6, .1], ['sway', 'Scope sway (px)', 2.6, 0, 6, .1],
  ['breath', 'Hold-breath seconds', 3, 1, 6, .1], ['calls', 'Calls per site', 2, 0, 5, 1], ['callFreeze', 'Call freeze (s)', 1.4, 0, 4, .05],
  ['distanceSlope', 'Metres per +1 distance bonus', 75, 25, 200, 5], ['heartMult', 'Heart multiplier', 2, .5, 4, .05], ['headMult', 'Head multiplier', 1.8, .5, 4, .05],
  ['lungMult', 'Lung multiplier', 1.6, .5, 4, .05], ['runningMult', 'Running-shot multiplier', 1.25, 1, 2, .05], ['antlerBoost', 'Antler drawing scale', 1.15, 1, 2, .05],
  ['animalScale', 'Animal size boost', 1.1, .8, 1.5, .05], ['fog', 'Fog density', 1, 0, 2, .05], ['timeOfDay', 'Time of day shift', 0, -1, 1, .05], ['timeScale', 'Game speed', 1, .1, 2, .05]
];
const TUNE_DEFAULT = Object.fromEntries(TUNE_DEFS.map(d => [d[0], d[2]]));
/** a tuning value (the dev sliders) */
function T(k) { const s = G.game && G.game.settings, v = s && s['dev.' + k]; return v === undefined ? TUNE_DEFAULT[k] : v; }
const TUNE_SETTINGS = TUNE_DEFS.map(([k, label, value, min, max, step]) => ({ key: 'dev.' + k, label, type: 'slider', value, min, max, step, group: 'Dev', hidden: true,
  apply: (g, v) => { if (k === 'timeScale' && G.dev) G.dev.applyTime(); if (k === 'fog' || k === 'timeOfDay') bus.emit('look', k); } }));

/* ---------- records: best scores, stars, trophies, stats, the Range badge (E.store) ---------- */
const REC_KEY = 'bbho:records:1';
const Records = {
  d: null,
  load() { const d = E.store.get(REC_KEY, null); this.d = Object.assign({ best: {}, stars: {}, trophies: {}, bestBuck: {}, stats: { hunts: 0, shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0, sites: 0, playTime: 0 }, badge: false, champion: false, seen: {} }, d || {}); this.d.stats = Object.assign({ hunts: 0, shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0, sites: 0, playTime: 0 }, this.d.stats); return this; },
  save() { if (this.d) E.store.set(REC_KEY, this.d); },
  get best() { return this.d.best; },
  setBest(key, score) { if (!this.d.best[key] || score > this.d.best[key]) { this.d.best[key] = score; this.save(); return true; } return false; },
  setStars(site, n) { if ((this.d.stars[site] || 0) < n) { this.d.stars[site] = n; this.save(); } },
  trophy(id, info) { const t = this.d.trophies[id] = Object.assign(this.d.trophies[id] || { seen: 0, bagged: false, best: 0 }, info); this.save(); return t; },
  stat(k, v, max) { const s = this.d.stats; s[k] = max ? Math.max(s[k] || 0, v) : (s[k] || 0) + v; },
  reset() { E.store.remove(REC_KEY); this.d = null; this.load(); }
};

/* ---------- small helpers ---------- */
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const fmt = n => { const s = String(Math.round(Math.abs(n))), r = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (n < 0 ? '-' : '') + r; };
const metres = u => u / M;
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const pickNoRepeat = (list, last, r) => { if (list.length <= 2) return list[Math.floor(r() * list.length)]; let x; for (let i = 0; i < 8; i++) { x = list[Math.floor(r() * list.length)]; if (!last.includes(x)) break; } return x; };
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const SEAT_NAMES = ['P1', 'P2', 'P3', 'P4'];
const SHAPES = ['circle', 'diamond', 'brackets', 'triangle'];

/* ===== src/01-game.js ===== */
// 01-game: the engine's game with our input map, settings, pause items and HTML shell; the cast's gibberish voices.
const HUB_ON = typeof AIHub !== 'undefined' && !!AIHub.active;
const HUNT_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Pad7', 'KeyJ'],                 // left click, R2
  pump: ['KeyR', 'Space', 'Pad2', 'KeyK'],          // R, Space, Square
  scope: ['Mouse2', 'Pad6', 'KeyL'],                // right click, L2
  breath: ['ShiftLeft', 'Pad5'],                    // Shift, R1
  call: ['KeyQ', 'Pad3'],                           // Q, Triangle
  board: HUB_ON ? [] : ['Tab', 'Pad8'],             // hold: the standings (Create belongs to the hub in a session)
  more: HUB_ON ? ['KeyM'] : [],                     // the hub card's More time
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],   // menus: L1 / R1 turn pages
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['pro', 'Pro']], value: 'normal', help: 'Easy: strong aim assist, auto-pump, slower animals, an extra call. Pro: no assist, faster animals, more does' },
  { key: 'assist', label: 'Aim assist', options: [['off', 'Off'], ['light', 'Light'], ['strong', 'Strong']], value: 'light', help: 'Controller and keys only: the reticle slows over a legal target. Never the mouse' },
  { key: 'reticle', label: 'Reticle speed', type: 'slider', value: 1, min: .5, max: 1.6, step: .05, help: 'How fast a stick or the keys move your reticle' },
  { key: 'autoPump', label: 'Auto-pump', type: 'toggle', value: false, help: 'Rack the rifle by itself after every shot' },
  { key: 'scopeMode', label: 'Scope', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'doeRule', label: 'Doe rule', options: [['classic', 'Classic: you sit out the site'], ['casual', 'Casual: a points penalty']], value: 'classic' },
  { key: 'trophyCam', label: 'Trophy Cam', options: [['on', 'On'], ['trophies', 'Trophies only'], ['off', 'Off']], value: 'on', help: 'The slow-motion bullet cam on big kills' },
  { key: 'glint', label: 'Antler glint', type: 'toggle', value: false, help: 'A glint on antler tips, so bucks read at range' },
  { key: 'bigCaptions', label: 'Large captions', type: 'toggle', value: false },
  { key: 'rivalTag', label: 'Rival score tag', type: 'toggle', value: true, help: 'The Hunt-Off campaign: the score to beat in the corner' }
];
const game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, view: 'side', input: HUNT_KEYS, id: 'bigbuckhuntoff', bg: '#000',
  autoPause: !HUB_ON, corner: !HUB_ON, fullscreen: HUB_ON ? 'button' : 'tap',
  menu: {
    items: [['Restart site', () => G.hunt && G.hunt.restartSite()], ['Restart hunt', () => G.hunt && G.hunt.restartHunt()], ['Dev mode', () => G.dev && G.dev.open()]],
    settings: GAME_SETTINGS.concat(TUNE_SETTINGS),
    controls: { more: false, fire: 'Shoot', pump: 'Pump / reload', scope: 'Scope', breath: 'Hold breath', call: 'Call', board: 'Standings', tabL: 'Menu page left', tabR: 'Menu page right', up: 'Aim up', down: 'Aim down', left: 'Aim left', right: 'Aim right' },
    quit: HUB_ON ? false : 'title'
  }
});
G.game = game;
game.pauseOverlay = false;
const ui = new E.Shell(game, {
  theme: { ink: '#f4ead8', paper: 'rgba(28,18,10,.94)', accent: '#e8843a', muted: '#b8a488', danger: '#e8443a', line: 'rgba(232,180,110,.35)', font: '600 18px ui-rounded, "Trebuchet MS", system-ui, sans-serif', titleFont: '800 30px ui-rounded, "Trebuchet MS", system-ui, sans-serif' },
  screens: { help: {
    title: 'How to hunt',
    keys: () => [['Mouse / left stick', 'Aim'], ['Left click / R2', 'Shoot'], ['R or Space / Square', 'Pump the rifle (and reload)'], ['Right click / L2', 'Scope (hold)'], ['Shift / R1', 'Hold your breath (scoped)'], ['Q / Triangle', 'Call: animals stop and look'], ['Tab / Create', 'Standings'], ['Esc / Options', 'Pause']],
    sections: [['Bucks only', 'Bucks have antlers. Does, fawns and calves do not. Shoot one and you sit out the rest of the site.'],
      ['Shot placement', 'Heart, head and lungs drop him with one round and score the most. Gut and leg hits wound: finish him before he runs off.'],
      ['Points', 'Bigger racks, longer shots, running shots and quick draws all score more. Critters are bonus points, but some are protected.']]
  } }
});
G.ui = ui;
const I = game.input;
// the wheel pumps too (a notch down)
if (HAS_DOM && !HUB_ON) addEventListener('wheel', e => { if (G.scene === 'hunt' && !game.paused && !ui.screen && e.deltaY > 0) { I.press('Act:pump'); game.after(.02, () => I.release('Act:pump')); } }, { passive: true });

/* ---------- touch-only devices: no touch controls; "Controller or keyboard required" ---------- */
const mm = q => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
G.touchOnly = mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
I.touchEnabled = false;
if (HAS_DOM) for (const ev of ['keydown', 'mousedown', 'mousemove']) addEventListener(ev, e => { if (ev === 'mousemove' && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; if (G.touchOnly) G.touchOnly = false; }, { capture: true, passive: true });

/* ---------- voices ---------- */
const bab = new E.Babble(game);
bab.define('emcee', { pitch: 140, wave: 'square', speed: 15, spread: 1.1, vol: .2, echo: .16, formant: 1.05 });
bab.define('dub', { pitch: 105, wave: 'sawtooth', speed: 10.5, spread: .8, grit: .35, vol: .2, formant: .9 });
bab.define('granny', { pitch: 260, wave: 'sine', speed: 12, spread: 1.3, warble: .035, vol: .24, formant: 1.2 });
bab.define('dwayne', { pitch: 185, wave: 'square', speed: 14, spread: 1.2, vol: .16, formant: 1.35 });
bab.define('loretta', { pitch: 225, wave: 'triangle', speed: 13.5, spread: 1.2, vol: .26, formant: 1.15 });
bab.define('earl', { pitch: 95, wave: 'square', speed: 9.5, spread: .7, vol: .18, formant: .85 });
G.bab = bab;

/* ===== src/10-world.js ===== */
// 10-world: a hunt's landscape: the heightfield from its data, the baked light, scattered props in a grid (drawn as
// impostors and blocking shots with their trunks and stones), the sky, fog and weather, its vantages and trails.
const GT = { grass: 0, dry: 1, leaves: 2, dirt: 3, rock: 4, talus: 5, mud: 6, reeds: 7, snow: 8, ice: 9, soil: 10, burn: 11, shore: 12, needles: 13, pasture: 14, yard: 15 };
const IMP = new E.Impostors();   // every prop's sprites, shared by the hunts
const CELL = 32 * M;             // the prop grid's cell

/** micro textures per ground type: 64 x 64 signed brightness, an eighth of a metre a texel (cosmetic) */
function makeMicro(seed) {
  const out = {}, R = E.rng(seed);
  const kinds = { 0: 'blades', 1: 'blades', 2: 'leaves', 3: 'speck', 4: 'stone', 5: 'stone', 6: 'speck', 7: 'blades', 8: 'snow', 9: 'snow', 10: 'rows', 11: 'speck', 12: 'pebble', 13: 'needles', 14: 'blades', 15: 'speck' };
  for (let t = 0; t <= 15; t++) {
    const a = new Int8Array(64 * 64), n = E.makeNoise(seed + t * 17), k = kinds[t];
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const q = n(x / 6, y / 6) * 14, h = E.hash2(x * 7 + t, y * 13 + t * 3); let v = q;
      if (k === 'blades') { const b = E.hash2(x, Math.floor(y / 3) + t * 40); v += b > .72 ? 22 : b < .2 ? -26 : 0; if (h > .985) v = 50; }
      else if (k === 'leaves') { v += h > .9 ? 34 : h < .12 ? -30 : 0; if (E.hash2(Math.floor(x / 2), Math.floor(y / 2) + 99) > .93) v = 40; }
      else if (k === 'stone') { v = n(x / 3, y / 3) * 30; if (h > .96) v = -40; }
      else if (k === 'snow') { v = q * .4 + (h > .97 ? 18 : 0); }
      else if (k === 'rows') { v = (x % 8 < 2 ? -28 : 6) + q * .6; if (h > .93) v = 26; }
      else if (k === 'pebble') { v = h > .8 ? 24 : h < .2 ? -24 : q; }
      else if (k === 'needles') { v = (E.hash2(x, y >> 1) > .6 ? 16 : -14) + q * .4; }
      else v = q + (h > .93 ? 20 : h < .07 ? -24 : 0);
      a[y * 64 + x] = clamp(Math.round(v), -110, 110);
    }
    out[t] = a;
  }
  return out;
}

class World {
  constructor(huntId) {
    const H = this.hunt = reg('hunt', huntId), t0 = Date.now();
    this.id = huntId;
    const spec = H.terrain, feats = (spec.features || []).slice();
    // every site's fan is kept clear of hills that would block it (after the authored features)
    this.vant = {};
    for (const vid in H.vantages) this.vant[vid] = Object.assign({ id: vid }, H.vantages[vid]);
    const fans = [];
    for (const sid of [...(H.sites || []), H.trophy, H.bonus, ...(H.extraFans || [])].filter(Boolean)) {
      const S = has('site', sid) ? reg('site', sid) : has('trophy', sid) ? reg('trophy', sid) : has('bonus', sid) ? reg('bonus', sid) : null; if (!S) continue;
      const v = this.vant[S.vantage]; if (!v) continue;
      const b = S.frame ? S.frame.bearings : [-35, 35], far = (S.fan || S.distances || [10, 80])[1] + 15;
      fans.push({ v, b: [b[0] - 8, b[1] + 8], far, trees: S.fanTrees || 0, keep: S.keepHills });
      if (!S.keepHills) feats.push({ kind: 'clearView', at: v.at, yaw: v.yaw, bearings: [b[0] - 4, b[1] + 4], dist: [3, far], eye: v.eye || 1.7, margin: .6 });
    }
    this.fans = fans;
    const hf = this.hf = new E.Heightfield({ N: 1024 });
    hf.generate({ seed: H.seed, base: spec.base, features: feats, types: H.types, forest: ctx => { let f = H.forest ? H.forest(ctx) : 0; if (f > 0) for (const F of fans) { const d = Math.hypot(ctx.x - F.v.at[0], ctx.y - F.v.at[1]); if (d < F.far + 20) { const a = wrapA(Math.atan2(ctx.y - F.v.at[1], ctx.x - F.v.at[0]) - F.v.yaw * DEG) / DEG; if (a > F.b[0] - 10 && a < F.b[1] + 10) f = Math.min(f, F.trees * .5); } } return f; },
      farForest: H.farForest, canopy: H.canopy, far: spec.far });
    for (const vid in this.vant) { const v = this.vant[vid]; v.gz = hf.height(v.at[0] * M, v.at[1] * M); }
    this.genMs = Date.now() - t0;
    if (HAS_DOM) { hf.bake(Object.assign({ sun: this.sunFor(0) }, H.palette)); }
    this.micro = makeMicro(H.seed);
    this.props = []; this.grid = new Map();
    this.scatter();
    for (const p of H.props || []) this.place(p[0], p[1][0] * M, p[1][1] * M, Object.assign({ authored: true }, p[2] || {}));
    this.sky = new E.Backdrop(H.sky);
    this.vista = new E.Vista({ hf, sky: this.sky, fog: this.fogFor(), mist: H.mist ? Object.assign({}, H.mist, { top: (H.mist.top || 0) }) : null, sun: Object.assign({ disc: H.sun.disc }, this.sunFor(0), { color: H.sun.color, glow: H.sun.glow }), micro: this.micro, water: H.water, grade: H.grade, canopyFrom: 150, billboardFar: 230 });
    this.ms = Date.now() - t0;
  }
  sunFor(shift) { const S = this.hunt.sun; return { yaw: S.yaw + (shift || 0) * 25, elev: clamp(S.elev + (shift || 0) * 8, -2, 70), color: S.color, ambient: S.ambient, r: S.r || 5, disc: S.disc, glow: S.glow }; }
  fogFor() { const F = this.hunt.fog, k = T('fog'); return { color: F.color, near: F.near * M / Math.max(.25, k), far: F.far * M / Math.max(.25, k), max: F.max === undefined ? 1 : F.max }; }
  refreshLook() { this.vista.setLook({ fog: this.fogFor(), sun: Object.assign({}, this.vista.sun, this.sunFor(T('timeOfDay'))) }); }
  height(x, y) { return this.hf.height(x, y); }
  get ground() { return this._g || (this._g = (x, y) => this.hf.height(x, y)); }
  /** a vantage's eye: { x, y, z, yaw } (z: eye height over the ground there) */
  eye(vid) { const v = this.vant[vid]; if (!v) throw new Error('no vantage ' + vid); const x = v.at[0] * M, y = v.at[1] * M, w = v.kind === 'canoe' ? this.hf.waterAt(x, y) : null; return { x, y, z: (w !== null && w > v.gz ? w : v.gz) + (v.eye || 1.7) * M, yaw: v.yaw * DEG, v }; }
  /** a point [bearing (deg from the vantage's yaw), distance (m)] -> world { x, y, z } */
  at(vid, b, d) { const v = this.vant[vid], a = (v.yaw + b) * DEG, x = v.at[0] * M + Math.cos(a) * d * M, y = v.at[1] * M + Math.sin(a) * d * M; return { x, y, z: this.hf.height(x, y) }; }
  /** where a world point is from a vantage: [bearing (deg), distance (m)] */
  bearingOf(vid, x, y) { const v = this.vant[vid], dx = x - v.at[0] * M, dy = y - v.at[1] * M; return [wrapA(Math.atan2(dy, dx) - v.yaw * DEG) / DEG, Math.hypot(dx, dy) / M]; }
  inFan(x, y, margin = 0) { for (const F of this.fans) { const dx = x / M - F.v.at[0], dy = y / M - F.v.at[1], d = Math.hypot(dx, dy); if (d > F.far + margin) continue; const a = wrapA(Math.atan2(dy, dx) - F.v.yaw * DEG) / DEG; if (a > F.b[0] - margin && a < F.b[1] + margin) return F; } return null; }
  /* ---- props ---- */
  place(id, x, y, o = {}) {
    const P = reg('prop', id), z = (o.z !== undefined ? o.z : this.hf.height(x, y)) - (P.sink || 0) * M;
    const p = { id, imp: P.imp || id, x, y, z, variant: o.variant || 0, facing: o.facing || 0, scale: o.scale || 1, authored: !!o.authored, occ: null, wind: P.wind ? fxr() * TAU : 0, site: o.site || null, hide: false };
    if (P.occ) p.occ = P.occ(p);
    this.props.push(p);
    const key = Math.floor(x / CELL) + ',' + Math.floor(y / CELL); let c = this.grid.get(key); if (!c) this.grid.set(key, c = []); c.push(p);
    if (P.shadow && this.hf.col) { const s = this.sunFor(0), a = s.yaw * DEG + Math.PI, L = P.shadow * p.scale * M; this.hf.stampShadow(x + Math.cos(a) * L * .9, y + Math.sin(a) * L * .9, L * 1.1, L * .7, .32, a); }
    return p;
  }
  remove(p) { const i = this.props.indexOf(p); if (i >= 0) this.props.splice(i, 1); const key = Math.floor(p.x / CELL) + ',' + Math.floor(p.y / CELL), c = this.grid.get(key); if (c) { const j = c.indexOf(p); if (j >= 0) c.splice(j, 1); } }
  /** the hunt's scatter rules: forests, groves and single trees, bushes, rocks, logs, reeds, grass, corn, drifts */
  scatter() {
    const H = this.hunt, R = E.rng(H.seed * 3 + 11), hf = this.hf, N = hf.N;
    for (const rule of H.scatter || []) {
      const sp = rule.spacing || 8, jit = sp * .45;
      for (let gy = sp / 2; gy < N - 2; gy += sp) for (let gx = sp / 2; gx < N - 2; gx += sp) {
        const x = (gx + (R() - .5) * 2 * jit), y = (gy + (R() - .5) * 2 * jit), r1 = R(), r2 = R(), r3 = R(), r4 = R();
        if (x < 2 || y < 2 || x > N - 3 || y > N - 3) continue;
        const i = Math.round(y) * N + Math.round(x), ctx = { x, y, h: hf.h[i] / M, type: hf.type[i], forest: hf.forest[i] / 255, mask: hf.mask[i], water: hf.water[i] > hf.h[i], wdist: hf.wdist ? hf.wdist[i] : 99, n: hf.noise[0](x / 31, y / 31), r: r1 };
        const p = rule.where(ctx); if (!(p > 0) || r1 > p) continue;
        let nearV = false; for (const vid in this.vant) { const v = this.vant[vid]; if (v.kind !== 'air' && Math.hypot(x - v.at[0], y - v.at[1]) < (rule.clearR === undefined ? 13 : rule.clearR)) { nearV = true; break; } } if (nearV) continue;
        const F = this.inFan(x * M, y * M, rule.fanMargin === undefined ? 4 : rule.fanMargin); if (F) { const pf = rule.fanP !== undefined ? rule.fanP : rule.inFan ? (F.trees || 0) * rule.inFan : 0; if (r2 >= pf) continue; }
        let id = rule.prop; if (rule.mix) { let acc = 0; for (const [m, w] of rule.mix) { acc += w; if (r3 * rule.mix.reduce((s, q) => s + q[1], 0) <= acc) { id = m; break; } } }
        const P = reg('prop', id);
        this.place(id, x * M, y * M, { variant: Math.floor(r4 * (P.variants || 1)), facing: r2 * TAU, scale: (rule.scale ? rule.scale[0] + (rule.scale[1] - rule.scale[0]) * r3 : 1) });
      }
    }
  }
  /** the props near a point (grid cells within r) */
  near(x, y, r, fn) { const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((y - r) / CELL), d1 = Math.floor((y + r) / CELL); for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) { const c = this.grid.get(cx + ',' + cy); if (c) for (const p of c) fn(p); } }
  /** billboard items for the props the lens can see (within far) */
  gather(L, items, far = 230 * M) {
    const fx = L.Fx, fy = L.Fy, cx = L.x, cy = L.y, half = Math.atan2(L.W / 2 + 40, L.f) + .1, cosH = Math.cos(half), tt = G.game.time;
    const c0 = Math.floor((cx - far) / CELL), c1 = Math.floor((cx + far) / CELL), d0 = Math.floor((cy - far) / CELL), d1 = Math.floor((cy + far) / CELL);
    for (let gy = d0; gy <= d1; gy++) for (let gx = c0; gx <= c1; gx++) {
      const ccx = (gx + .5) * CELL - cx, ccy = (gy + .5) * CELL - cy, cd = Math.hypot(ccx, ccy);
      if (cd > far + CELL) continue;
      if (cd > CELL * 1.5 && (ccx * fx + ccy * fy) / cd < cosH - CELL * .75 / cd) continue;
      const c = this.grid.get(gx + ',' + gy); if (!c) continue;
      for (const p of c) {
        if (p.hide) continue;
        const dx = p.x - cx, dy = p.y - cy, D = dx * fx + dy * fy; if (D < 6 || D > far) continue;
        const P = reg('prop', p.id);
        const it = p.item || (p.item = { x: p.x, y: p.y, z: p.z, imp: IMP, id: p.imp, variant: p.variant, facing: Math.floor((p.facing / TAU) * (P.facings || 1)) % (P.facings || 1), scale: p.scale, box: [P.size[0], P.size[1]], bias: P.bias === undefined ? 12 : P.bias, sway: 0 });
        it.z = p.z; it.sway = P.wind && D < 60 * M ? Math.sin(tt * 1.3 + p.wind) * P.wind * (L.f / Math.max(D, 1)) * .4 : 0;
        items.push(it);
      }
    }
    return items;
  }
  /** the props whose volumes a ray could cross up to maxT, walking its ground track through the grid */
  propsAlong(o, d, maxT, fn) {
    const len = Math.hypot(d.dx, d.dy) * maxT, steps = Math.ceil(len / (CELL * .5)) + 1, seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = maxT * i / steps, x = o.x + d.dx * t, y = o.y + d.dy * t;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const key = (Math.floor(x / CELL) + ox) + ',' + (Math.floor(y / CELL) + oy); if (seen.has(key)) continue; seen.add(key); const c = this.grid.get(key); if (c) for (const p of c) if (p.occ && !p.hide) fn(p); }
    }
  }
}
const WORLDS = new Map();
bus.on('look', () => { for (const w of WORLDS.values()) w.refreshLook(); });
/** a hunt's world, built once and kept (up to two at a time) */
function worldFor(huntId) {
  let w = WORLDS.get(huntId);
  if (!w) { if (WORLDS.size >= 2) { const k = [...WORLDS.keys()].find(k => !G.world || k !== G.world.id); if (k) WORLDS.delete(k); } w = new World(huntId); WORLDS.set(huntId, w); }
  return w;
}

/* ===== src/11-props.js ===== */
// 11-props: the props as data: their impostor painters (pixel art at any scale, lit from the upper left with E.tones),
// their size, what blocks a shot (a trunk, a stone, a log; leaves, grass and corn only hide), and the shadow they cast.
const TT = c => E.tones(c);
const occTrunk = (rM, hM) => p => [{ k: 'cyl', x: p.x, y: p.y, z0: p.z, z1: p.z + hM * M * p.scale, r: rM * M * p.scale }];
const occBall = (rM, zM) => p => [{ k: 'sph', x: p.x, y: p.y, z: p.z + zM * M * p.scale, r: rM * M * p.scale }];
const occBox = (hx, hy, hz) => p => [{ k: 'box', x: p.x, y: p.y, z0: p.z, z1: p.z + hz * M * p.scale, hx: hx * M * p.scale, hy: hy * M * p.scale, a: p.facing }];

/** a broadleaf tree: a tapered trunk, branches, a crown of lit leaf clumps (o: h, crown [rx, ry] m, trunk r m, colours) */
function broadleaf(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 977 + (o.seed || 1)), u = M * k, h = o.h * (.85 + R() * .3), pal = o.pal[v % o.pal.length], bark = TT(o.bark || '#5a4434');
    const crx = o.crown[0] * (.85 + R() * .3) * u, cry = o.crown[1] * (.85 + R() * .25) * u, ccy = oy - (h - o.crown[1] * .55) * u, tw = Math.max(1, o.trunk * 2 * u);
    const lean = (R() - .5) * .12 * h * u;
    if (h * u < 7) { px.line(g, ox, oy, ox + lean, ccy, bark.sh, 1); px.ell(g, ox + lean, ccy, Math.max(1, crx), Math.max(1, cry), TT(pal[0]).sh); px.ell(g, ox + lean - crx * .25, ccy - cry * .25, Math.max(.6, crx * .6), Math.max(.6, cry * .55), TT(pal[0]).base); return; }
    // trunk and branches
    const top = [ox + lean, ccy + cry * .2];
    px.poly(g, [[ox - tw * .7, oy], [ox + tw * .7, oy], [top[0] + tw * .3, top[1]], [top[0] - tw * .3, top[1]]], bark.sh);
    if (tw > 1.5) px.poly(g, [[ox - tw * .55, oy], [ox, oy], [top[0], top[1]], [top[0] - tw * .25, top[1]]], o.birch ? TT(o.bark).lt : bark.base);
    if (o.birch && tw > 1.5) for (let i = 0; i < 8; i++) { const yy = oy - (i + .5) / 8 * (oy - top[1]), xx = lerp(ox, top[0], (oy - yy) / (oy - top[1])); px.rect(g, xx - tw * .4 + R() * tw * .4, yy, Math.max(1, tw * .4), 1, '#2a2420'); }
    if (tw > 2) px.rect(g, ox - tw * .9, oy - 1, tw * 1.8, 1, bark.deep);
    const nb = Math.round(3 + R() * 3);
    for (let i = 0; i < nb; i++) { const t = .35 + R() * .5, bx = lerp(ox, top[0], t), by = lerp(oy, top[1], t) - cry * .3, ex = bx + (R() < .5 ? -1 : 1) * crx * (.4 + R() * .5), ey = by - cry * (.2 + R() * .6); px.line(g, bx, by, ex, ey, bark.sh, Math.max(1, Math.round(tw * .35))); }
    // the crown: clumps in an ellipsoid, drawn dark, base, lit, then specks
    const fine = 1 + Math.min(2.2, u * .9), n = clamp(Math.round((o.clumps || 26) * fine), 8, 110), cl = [];
    for (let i = 0; i < n; i++) { const a = R() * TAU, rr = Math.sqrt(R()), cx = ox + lean + Math.cos(a) * rr * crx * .86, cy = ccy + Math.sin(a) * rr * cry * .8, s = (o.clump || 1.3) * u * (.65 + R() * .6) / Math.sqrt(fine); cl.push([cx, cy, s, R()]); }
    cl.sort((a, b) => a[1] - b[1]);
    const C = pal.map(TT);
    for (const [cx, cy, s, r] of cl) px.disc(g, cx + s * .15, cy + s * .2, s, C[0].deep);
    for (const [cx, cy, s, r] of cl) px.disc(g, cx, cy, s * .92, (cy > ccy + cry * .25 ? C[0].deep : (r < .5 ? C[0] : C[Math.min(C.length - 1, 1)]).sh));
    for (const [cx, cy, s, r] of cl) { const c = C[Math.floor(r * C.length)]; px.disc(g, cx - s * .18, cy - s * .2, s * .68, c.base); }
    for (const [cx, cy, s, r] of cl) if (cy < ccy + cry * .2 && (cx < ox + crx * .3)) { const c = C[Math.floor(r * C.length)]; px.disc(g, cx - s * .35, cy - s * .4, Math.max(.5, s * .34), c.lt); }
    if (u > .9) for (let i = 0; i < n * (u > 2 ? 6 : 2); i++) { const a = R() * TAU, rr = Math.sqrt(R()) * .92, x = ox + lean + Math.cos(a) * rr * crx, y = ccy + Math.sin(a) * rr * cry, q = R(); px.dot(g, x, y, q < .35 ? C[0].hi : q < .7 ? C[C.length - 1].lt : C[0].sh); if (u > 2.2 && q > .8) px.dot(g, x + 1, y + 1, C[0].deep); }
    if (o.holes && u > .6) for (let i = 0; i < 3; i++) { const a = R() * TAU; g.clearRect(Math.round(ox + Math.cos(a) * crx * .5), Math.round(ccy + Math.sin(a) * cry * .4), Math.max(1, Math.round(u * .5)), Math.max(1, Math.round(u * .4))); }
  };
}
/** a conifer: tiers of drooping boughs, narrowing to the top (snow on them when o.snow) */
function conifer(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 613 + (o.seed || 3)), u = M * k, h = o.h * (.85 + R() * .35), w = o.w * (.85 + R() * .3) * u, C = TT(o.pal[v % o.pal.length]), bark = TT(o.bark || '#3e2e24');
    const H = h * u, base = oy - o.skirt * h * u;
    if (H < 7) { px.poly(g, [[ox, oy - H], [ox + Math.max(1, w * .6), oy - H * .1], [ox - Math.max(1, w * .6), oy - H * .1]], C.sh); return; }
    px.rect(g, ox - Math.max(1, u * .2), base - u * .5, Math.max(1, u * .4), oy - base + u * .5, bark.sh);
    const tiers = clamp(Math.round(o.tiers || 7), 3, 12);
    for (let i = 0; i < tiers; i++) {
      const t0 = i / tiers, t1 = (i + 1.25) / tiers, y0 = base - t0 * (base - (oy - H)), y1 = base - Math.min(1, t1) * (base - (oy - H)), hw = w * (1 - t0) * (o.sparse ? .8 : 1) * (.9 + R() * .2);
      const sag = (y0 - y1) * .25, jag = [];
      jag.push([ox, y1]);
      const steps = Math.max(2, Math.round(hw / Math.max(1.5, u * .6)));
      for (let s = 0; s <= steps; s++) { const tx = s / steps; jag.push([ox + hw * tx, y1 + (y0 - y1) * (.25 + tx * .75) + (s % 2 ? sag * .4 : 0)]); }
      for (let s = steps; s >= 0; s--) { const tx = s / steps; jag.push([ox - hw * tx, y1 + (y0 - y1) * (.25 + tx * .75) + (s % 2 ? sag * .4 : 0)]); }
      px.poly(g, jag, C.sh);
      if (hw > 2) px.poly(g, jag.map(p => [p[0] - (p[0] < ox ? 0 : (p[0] - ox) * .55), p[1] - .6]), o.sparse ? C.sh : C.base);
      if (hw > 3) px.line(g, ox - hw * .9, y0 - .5, ox - hw * .2, y1 + (y0 - y1) * .5, C.lt);
      if (o.snow && hw > 1.5) { px.line(g, ox - hw * .85, y0 - 1, ox + hw * .3, y0 - (y0 - y1) * .5, '#f2f6fa', Math.max(1, Math.round(u * .25))); if (hw > 4) px.line(g, ox - hw * .5, y1 + (y0 - y1) * .55, ox, y1 + (y0 - y1) * .3, '#dfe8f0'); }
      if (o.sparse && hw > 2.5) for (let s = 0; s < 4; s++) px.dot(g, ox + (R() - .5) * hw * 1.4, lerp(y1, y0, R()), C.lt);
    }
    if (u > 1 && !o.sparse) for (let i = 0; i < 10; i++) px.dot(g, ox - w * .4 + R() * w * .3, oy - H * (.2 + R() * .7), C.hi);
  };
}
function snag(o) {   // a charred dead tree: a broken trunk, a few bare limbs
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 31 + 7), u = M * k, h = o.h * (.6 + R() * .6), tw = Math.max(1, .32 * u), C = TT(o.c || '#2a2422'), top = [ox + (R() - .5) * u * 1.2, oy - h * u];
    px.poly(g, [[ox - tw, oy], [ox + tw, oy], [top[0] + tw * .3, top[1]], [top[0] - tw * .4, top[1] + u * .5]], C.sh);
    if (tw > 1.4) px.line(g, ox - tw * .5, oy, top[0] - tw * .3, top[1] + u, C.lt);
    for (let i = 0; i < 4; i++) { const t = .4 + R() * .5, bx = lerp(ox, top[0], t), by = lerp(oy, top[1], t), s = R() < .5 ? -1 : 1; px.line(g, bx, by, bx + s * (1 + R() * 2) * u, by - (1 + R() * 2) * u, C.sh, Math.max(1, Math.round(tw * .4))); }
    if (o.snow) px.line(g, top[0] - tw, top[1] + 1, top[0] + tw, top[1] + 1, '#eef2f6');
  };
}
function clumpPaint(o) {   // a bush or a tuft: low clumps (leaves) or blades (grass, reeds)
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 211 + (o.seed || 5)), u = M * k, C = o.pal.map(TT);
    if (o.blades) {
      const n = clamp(Math.round(o.blades * Math.min(1, u * .5 + .3)), 3, 40), w = o.w * u, h = o.h * u;
      for (let i = 0; i < n; i++) { const x = ox + (R() - .5) * w * 2, hh = h * (.5 + R() * .6), lean = (R() - .5) * hh * .5, c = C[Math.floor(R() * C.length)]; px.line(g, x, oy, x + lean, oy - hh, R() < .4 ? c.sh : c.base, Math.max(1, Math.round(u * (o.thick || .06)))); if (o.heads && u > .5 && R() < .3) px.line(g, x + lean, oy - hh, x + lean * 1.15, oy - hh - u * .22, TT(o.heads).base, Math.max(1, Math.round(u * .08))); }
      return;
    }
    const n = clamp(Math.round(o.clumps || 9), 4, 24), rx = o.w * u, ry = o.h * u * .5;
    const cl = []; for (let i = 0; i < n; i++) { const a = R() * TAU, rr = Math.sqrt(R()); cl.push([ox + Math.cos(a) * rr * rx * .8, oy - ry - Math.sin(a) * rr * ry * .8 * (Math.sin(a) < 0 ? .5 : 1), (o.clump || .6) * u * (.7 + R() * .6), R()]); }
    cl.sort((a, b) => a[1] - b[1]);
    for (const [x, y, s] of cl) px.disc(g, x + s * .2, Math.min(oy - s * .3, y + s * .2), s, C[0].deep);
    for (const [x, y, s, r] of cl) px.disc(g, x, Math.min(oy - s * .3, y), s * .9, C[Math.floor(r * C.length)].sh);
    for (const [x, y, s, r] of cl) px.disc(g, x - s * .2, Math.min(oy - s * .5, y - s * .2), s * .6, C[Math.floor(r * C.length)].base);
    if (u > .8) for (const [x, y, s, r] of cl) if (r > .5) px.dot(g, x - s * .4, y - s * .5, C[Math.floor(r * C.length)].lt);
    if (o.berries && u > .8) for (let i = 0; i < 5; i++) px.dot(g, ox + (R() - .5) * rx * 1.4, oy - ry * (.5 + R()), o.berries);
  };
}
function cornPaint(g, k, v, f, ox, oy) {   // a few dry corn stalks with drooping leaves and ears
  const R = E.rng(v * 47 + 2), u = M * k, C = TT('#c8a860'), D = TT('#a8884a');
  const n = u < .5 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const x = ox + (i - (n - 1) / 2) * .45 * u + (R() - .5) * .2 * u, h = (2.1 + R() * .5) * u, top = oy - h;
    px.line(g, x, oy, x + (R() - .5) * u * .2, top, D.sh, Math.max(1, Math.round(u * .07)));
    if (u > .25) for (let j = 0; j < 4; j++) { const y = oy - h * (.3 + j * .17), s = j % 2 ? 1 : -1, L = (.5 + R() * .4) * u; px.line(g, x, y, x + s * L, y + L * .35, (j % 2 ? C : D).base, 1); px.line(g, x + s * L, y + L * .35, x + s * L * 1.2, y + L * .8, D.sh, 1); }
    if (u > .4) { px.rect(g, x - Math.max(1, u * .06), top - u * .2, Math.max(1, u * .12), u * .3, C.lt); if (R() < .6) { px.ell(g, x + u * .1, oy - h * .55, Math.max(1, u * .08), Math.max(1, u * .2), '#d8b048'); } }
  }
}
function rockPaint(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 89 + 4), u = M * k, r = o.r * (.7 + R() * .6) * u, h = r * (o.flat || .75), C = TT(o.c || '#8a8278'), pts = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI, rr = r * (.75 + R() * .35); pts.push([ox + Math.cos(a) * rr * 1.1, oy + Math.sin(a) * h * (.8 + R() * .3)]); }
    pts.push([ox + r * 1.1, oy]); pts.unshift([ox - r * 1.1, oy]);
    px.poly(g, pts, C.sh); if (r > 2) { px.poly(g, pts.map(p => [lerp(p[0], ox - r * .25, .25), lerp(p[1], oy - h * .5, .25) - .5]), C.base); px.poly(g, pts.slice(1, 5).map(p => [lerp(p[0], ox - r * .4, .45), lerp(p[1], oy - h * .7, .45)]), C.lt); }
    if (o.moss && r > 3) for (let i = 0; i < 6; i++) px.dot(g, ox - r * .6 + R() * r * .9, oy - h * (.6 + R() * .3), R() < .5 ? '#6a7a3a' : '#5a6a32');
    if (o.snow && r > 1.5) { px.poly(g, pts.slice(2, 8).map(p => [p[0], p[1] - .3]).concat([[ox + r * .5, oy - h * .55], [ox - r * .5, oy - h * .55]]), '#e8eef4'); }
    if (r > 2) px.line(g, ox - r * 1.1, oy - 1, ox + r * 1.1, oy - 1, C.deep);
  };
}
function logPaint(o) {
  return (g, k, v, f, ox, oy) => {
    const R = E.rng(v * 61 + 9), u = M * k, L = o.len * (.8 + R() * .4) * u, r = Math.max(1, o.r * u), C = TT(o.c || '#6a5040'), ang = (f % 2 ? .25 : -.18), cx = Math.cos(ang) * L / 2, cy = Math.sin(ang) * L / 2 * .3;
    const a = [ox - cx, oy - r - cy], b = [ox + cx, oy - r + cy];
    px.line(g, a[0], a[1], b[0], b[1], C.sh, r * 2); px.line(g, a[0], a[1] - r * .4, b[0], b[1] - r * .4, C.base, Math.max(1, r * 1.1)); if (r > 1.5) px.line(g, a[0], a[1] - r * .75, b[0], b[1] - r * .75, C.lt, 1);
    px.disc(g, b[0], b[1], r, TT('#a8885a').base); if (r > 2) px.disc(g, b[0], b[1], r * .5, TT('#a8885a').sh);
    if (o.snow) px.line(g, a[0], a[1] - r, b[0], b[1] - r, '#eef2f6', Math.max(1, r * .6));
    if (o.moss && r > 2) for (let i = 0; i < 5; i++) px.dot(g, lerp(a[0], b[0], R()), lerp(a[1], b[1], R()) - r * .7, '#6a7a3a');
  };
}
/** a building block: a box with a pitched roof, planks, a door and a window (the barn, the farmhouse, the trap house) */
function housePaint(o) {
  return (g, k, v, f, ox, oy) => {
    const u = M * k, W = o.w * u, H = o.h * u, RH = o.roof * u, D = o.d * u * .35, C = TT(o.wall), Rf = TT(o.roofC), tr = TT(o.trim || '#e8e0d0');
    const x0 = ox - W / 2, y0 = oy - H;
    px.poly(g, [[x0 + W, oy], [x0 + W + D, oy - D * .5], [x0 + W + D, y0 - D * .5], [x0 + W, y0]], C.sh);   // the side wall
    px.rect(g, x0, y0, W, H, C.base);
    if (u > .3) for (let x = x0 + Math.max(2, u * .6); x < x0 + W; x += Math.max(2, u * .6)) px.line(g, x, y0 + 1, x, oy - 1, C.sh, 1);
    px.poly(g, [[x0 - u * .3, y0], [ox, y0 - RH], [x0 + W + u * .3, y0]], Rf.sh); px.poly(g, [[x0 + u * .2, y0 - 1], [ox, y0 - RH + 1], [ox, y0 - 1]], Rf.base);
    px.poly(g, [[ox, y0 - RH], [ox + D, y0 - RH - D * .5], [x0 + W + D + u * .3, y0 - D * .5], [x0 + W + u * .3, y0]], Rf.lt);
    if (o.barn && u > .25) { const dw = W * .36, dh = H * .62; px.rect(g, ox - dw / 2, oy - dh, dw, dh, C.deep); px.line(g, ox - dw / 2, oy - dh, ox + dw / 2, oy, tr.base, Math.max(1, u * .15)); px.line(g, ox + dw / 2, oy - dh, ox - dw / 2, oy, tr.base, Math.max(1, u * .15)); px.rect(g, ox - dw / 2, oy - dh, dw, Math.max(1, u * .15), tr.base); px.rect(g, ox - u * .6, y0 - RH * .45, u * 1.2, u * .9, C.deep); }
    if (o.door && u > .25) { px.rect(g, ox - W * .3, oy - H * .7, W * .16, H * .7, C.deep); px.rect(g, ox + W * .1, y0 + H * .25, W * .22, H * .28, '#3a4a5a'); px.rect(g, ox + W * .1, y0 + H * .25, W * .22, Math.max(1, u * .1), tr.base); if (o.lit) px.rect(g, ox + W * .12, y0 + H * .28, W * .18, H * .22, '#f0c060'); }
    if (o.porch && u > .25) { px.rect(g, x0 - u * .4, oy - u * .25, W + u * .8, Math.max(1, u * .25), TT('#8a6a4a').base); for (const px0 of [x0, x0 + W]) px.rect(g, px0 - u * .1, oy - H * .62, Math.max(1, u * .2), H * .62, TT('#8a6a4a').sh); px.rect(g, x0 - u * .4, oy - H * .66, W + u * .8, Math.max(1, u * .3), Rf.base); }
    if (o.trapSlot && u > .25) px.rect(g, x0 + W * .1, y0 + H * .2, W * .8, H * .16, '#1a1410');
  };
}
function fencePaint(g, k, v, f, ox, oy) {   // a split-rail section (8 m) seen near side-on
  const u = M * k, C = TT('#7a6450'), L = 4 * u;
  for (const sx of [-1, 1]) px.rect(g, ox + sx * L - Math.max(1, u * .08), oy - 1.3 * u, Math.max(1, u * .16), 1.3 * u, C.sh);
  for (const hz of [.55, 1.05]) { px.line(g, ox - L, oy - hz * u, ox + L, oy - hz * u + (v % 2 ? u * .1 : -u * .05), C.base, Math.max(1, Math.round(u * .12))); if (u > 1) px.line(g, ox - L, oy - hz * u - 1, ox + L, oy - hz * u - 1, C.lt, 1); }
}
function haybalePaint(g, k, v, f, ox, oy) { const u = M * k, r = .7 * u, C = TT('#d8b45a'); px.ell(g, ox, oy - r, r * 1.3, r, C.sh); px.ell(g, ox - r * .2, oy - r * 1.05, r * 1.05, r * .8, C.base); if (u > .5) { px.ell(g, ox + r * .55, oy - r, r * .45, r * .75, C.lt); px.line(g, ox - r * 1.2, oy - r * 1.2, ox + r * 1.2, oy - r * 1.2, C.sh, 1); } }
function lodgePaint(g, k, v, f, ox, oy) {   // a beaver lodge: a mound of sticks and mud
  const R = E.rng(v + 50), u = M * k, w = 3.2 * u, h = 1.8 * u, C = TT('#5a4632');
  px.ell(g, ox, oy - h * .2, w, h, C.sh); px.ell(g, ox - w * .15, oy - h * .35, w * .8, h * .75, C.base);
  if (u > .3) for (let i = 0; i < 40; i++) { const a = R() * Math.PI, rr = R() * .95, x = ox + Math.cos(a) * w * rr, y = oy - h * .2 - Math.sin(a) * h * rr, L = (.3 + R() * .5) * u, an = R() * Math.PI; px.line(g, x, y, x + Math.cos(an) * L, y + Math.sin(an) * L * .4, R() < .5 ? C.deep : C.lt, 1); }
  px.ell(g, ox - w * .3, oy - h * .9, w * .4, h * .2, '#eef2f6');
}
function driftPaint(g, k, v, f, ox, oy) { const R = E.rng(v + 70), u = M * k, w = (2 + R() * 2) * u, h = (.5 + R() * .4) * u; px.ell(g, ox, oy, w, h, '#c8d4e0'); px.ell(g, ox - w * .2, oy - h * .2, w * .8, h * .75, '#e8eef4'); if (u > .5) px.ell(g, ox - w * .35, oy - h * .45, w * .35, h * .3, '#ffffff'); }
function trapPaint(g, k, v, f, ox, oy) { housePaint({ w: 2.4, h: 1.4, roof: .5, d: 2, wall: '#6a6a5a', roofC: '#4a4a3e', trapSlot: true })(g, k, v, f, ox, oy); }
function standPaint(g, k, v, f, ox, oy) {   // a ladder tree stand seen from afar (other vantages)
  const u = M * k, C = TT('#4a4a42');
  px.line(g, ox - .3 * u, oy, ox - .3 * u, oy - 4.5 * u, C.sh, Math.max(1, Math.round(u * .1))); px.line(g, ox + .3 * u, oy, ox + .3 * u, oy - 4.5 * u, C.sh, Math.max(1, Math.round(u * .1)));
  for (let i = 1; i < 9; i++) px.line(g, ox - .3 * u, oy - i * .5 * u, ox + .3 * u, oy - i * .5 * u, C.base, 1);
  px.rect(g, ox - .6 * u, oy - 4.6 * u, 1.2 * u, Math.max(1, .15 * u), C.base); px.rect(g, ox - .6 * u, oy - 5.4 * u, Math.max(1, .1 * u), .8 * u, C.sh);
}
function signPaint(g, k, v, f, ox, oy) { const u = M * k, C = TT('#8a6a44'); px.rect(g, ox - Math.max(1, u * .06), oy - 1.4 * u, Math.max(1, u * .12), 1.4 * u, C.sh); px.rect(g, ox - .7 * u, oy - 1.6 * u, 1.4 * u, .6 * u, C.base); if (u > 1) px.rect(g, ox - .5 * u, oy - 1.4 * u, u, 1, C.lt); }
function bermPaint(g, k, v, f, ox, oy) { const u = M * k, w = 6 * u, h = 2.2 * u, C = TT('#7a6a48'); px.poly(g, [[ox - w, oy], [ox - w * .6, oy - h], [ox + w * .6, oy - h], [ox + w, oy]], C.sh); px.poly(g, [[ox - w * .9, oy], [ox - w * .55, oy - h + 1], [ox + w * .5, oy - h + 1], [ox + w * .2, oy]], C.base); if (u > .5) for (let i = 0; i < 12; i++) px.dot(g, ox - w * .7 + i * w * .12, oy - h * .7 + (i % 3), '#6a7a3a'); }

/* ---------- the props ---------- */
const AUTUMN = [['#a8421c', '#c8682a', '#e0a03a'], ['#b8301e', '#d84a28', '#e87a3a'], ['#c87a1a', '#e0a02a', '#f0c84a'], ['#8a5a1e', '#b07a2a', '#c8a03a']];
const propDef = (id, o) => { def('prop', id, o); IMP.define(id, { size: o.size, variants: o.variants || 1, facings: o.facings || 1, paint: o.paint, shape: o.shape, params: o.params, scale: o.shapeScale, pitch: o.pitch }); };
propDef('oak', { size: [6 * M, 17 * M], variants: 4, wind: .8, shadow: 4.5, occ: occTrunk(.32, 9), paint: broadleaf({ h: 15, crown: [5.2, 7.5], trunk: .32, pal: [AUTUMN[0], AUTUMN[3], AUTUMN[0].concat(['#7a6a2a']), AUTUMN[2]], clumps: 30, seed: 1 }) });
propDef('maple', { size: [5 * M, 16 * M], variants: 3, wind: .9, shadow: 4, occ: occTrunk(.26, 8), paint: broadleaf({ h: 14, crown: [4.4, 7], trunk: .26, pal: [AUTUMN[1], ['#c02a1e', '#e0482a', '#f08a3a'], AUTUMN[2]], clumps: 28, seed: 2 }) });
propDef('birch', { size: [3.5 * M, 15 * M], variants: 3, wind: 1.2, shadow: 2.5, occ: occTrunk(.16, 9), paint: broadleaf({ h: 13, crown: [3, 5.5], trunk: .16, bark: '#e8e4dc', birch: true, pal: [['#c8a21e', '#e8c83a', '#f8e87a'], ['#b8962a', '#d8b83a', '#f0d860']], clumps: 20, clump: .95, holes: true, seed: 3 }) });
propDef('aspen', { size: [3 * M, 14 * M], variants: 4, wind: 1.4, shadow: 2.2, occ: occTrunk(.15, 8), paint: broadleaf({ h: 12.5, crown: [2.6, 6.2], trunk: .15, bark: '#d8d8cc', birch: true, pal: [['#c8901a', '#e8b82a', '#f8e060'], ['#d0a02a', '#ecc43a', '#fae880'], ['#a89a2a', '#c8c03a', '#e0e070']], clumps: 22, clump: .85, holes: true, seed: 4 }) });
propDef('spruce', { size: [3.4 * M, 19 * M], variants: 3, wind: .3, shadow: 3, occ: occTrunk(.25, 14), paint: conifer({ h: 17, w: 3.2, tiers: 9, skirt: .04, pal: ['#2a4a3a', '#24443a', '#30503e'] }) });
propDef('fir', { size: [2.8 * M, 16 * M], variants: 3, wind: .3, shadow: 2.6, occ: occTrunk(.22, 12), paint: conifer({ h: 14, w: 2.6, tiers: 8, skirt: .05, pal: ['#2e5240', '#365a44', '#2a4a3c'] }) });
propDef('snowspruce', { size: [3.2 * M, 17 * M], variants: 3, wind: .2, shadow: 3, occ: occTrunk(.24, 12), paint: conifer({ h: 15, w: 3, tiers: 9, skirt: .03, snow: true, pal: ['#22382e', '#2a4034', '#1e3428'] }) });
propDef('blackspruce', { size: [1.6 * M, 13 * M], variants: 4, wind: .2, shadow: 1.6, occ: occTrunk(.14, 9), paint: conifer({ h: 11, w: 1.4, tiers: 10, skirt: .1, snow: true, pal: ['#1e2e28', '#24342c', '#1a2a24'] }) });
propDef('tamarack', { size: [2.6 * M, 15 * M], variants: 3, wind: .5, shadow: 2, occ: occTrunk(.16, 10), paint: conifer({ h: 13, w: 2.4, tiers: 9, skirt: .1, sparse: true, pal: ['#c8841e', '#d89a2a', '#b8781a'] }) });
propDef('snag', { size: [2.2 * M, 10 * M], variants: 4, shadow: .8, occ: occTrunk(.2, 7), paint: snag({ h: 8, snow: true, c: '#4a4442' }) });
propDef('bush', { size: [1.8 * M, 1.8 * M], variants: 4, wind: .5, paint: clumpPaint({ w: 1.6, h: 1.6, clumps: 11, pal: ['#6a5a2a', '#8a6a2a', '#a87a2a'], seed: 6 }) });
propDef('sumac', { size: [1.6 * M, 1.8 * M], variants: 3, wind: .6, paint: clumpPaint({ w: 1.4, h: 1.7, clumps: 10, pal: ['#a8281e', '#c83a22', '#e05a2a'], seed: 7 }) });
propDef('juniper', { size: [1.6 * M, 1.4 * M], variants: 3, paint: clumpPaint({ w: 1.5, h: 1.2, clumps: 10, pal: ['#2e4a3a', '#3a5a44', '#4a6a4a'], berries: '#6a7ab0', seed: 8 }) });
propDef('willow', { size: [1.6 * M, 2 * M], variants: 3, wind: .6, paint: clumpPaint({ blades: 22, w: 1.2, h: 2, thick: .07, pal: ['#8a3a2a', '#a84a30', '#6a3024'], seed: 9 }) });
propDef('tallgrass', { size: [1 * M, 1 * M], variants: 4, wind: 1.6, bias: 4, paint: clumpPaint({ blades: 22, w: .6, h: .85, pal: ['#8a8a3e', '#a89a4a', '#6e7a34'], heads: '#c8b878', seed: 10 }) });
propDef('goldgrass', { size: [1 * M, .9 * M], variants: 4, wind: 1.6, bias: 4, paint: clumpPaint({ blades: 14, w: .7, h: .8, pal: ['#c8a040', '#e0c060', '#a88a3a'], heads: '#f0d890', seed: 11 }) });
propDef('reeds', { size: [1 * M, 2 * M], variants: 4, wind: 1.2, bias: 4, paint: clumpPaint({ blades: 16, w: .8, h: 1.9, thick: .05, pal: ['#a88a5a', '#8a7448', '#c8a86a'], heads: '#5a3a22', seed: 12 }) });
propDef('fern', { size: [1 * M, .8 * M], variants: 3, wind: .8, bias: 4, paint: clumpPaint({ w: .9, h: .7, clumps: 8, clump: .35, pal: ['#a87a2a', '#c89a3a', '#8a6a2a'], seed: 13 }) });
propDef('corn', { size: [1.4 * M, 2.8 * M], variants: 6, wind: 1, bias: 6, paint: cornPaint });
propDef('rock', { size: [2 * M, 1.8 * M], variants: 5, shadow: 1.2, occ: occBall(.95, .45), paint: rockPaint({ r: 1.1, moss: true }) });
propDef('boulder', { size: [3.4 * M, 3 * M], variants: 4, shadow: 2, occ: occBall(1.7, .9), paint: rockPaint({ r: 2, c: '#8a8680' }) });
propDef('talus', { size: [1.6 * M, 1.2 * M], variants: 5, occ: occBall(.7, .3), paint: rockPaint({ r: .8, flat: .6, c: '#9a948c' }) });
propDef('snowrock', { size: [2 * M, 1.6 * M], variants: 4, shadow: 1, occ: occBall(.9, .4), paint: rockPaint({ r: 1.1, c: '#7a7a80', snow: true }) });
propDef('libraryrock', { size: [2 * M, 1.6 * M], variants: 3, occ: occBall(.9, .45), shape: 'rock', params: v => ({ r: 7.5, seed: v + 1 }), shapeScale: 1.9, pitch: 6 });
propDef('log', { size: [3.5 * M, 1 * M], variants: 3, facings: 2, occ: p => [{ k: 'cap', a: [p.x - 1.6 * M, p.y, p.z + .35 * M], b: [p.x + 1.6 * M, p.y, p.z + .35 * M], r: .35 * M }], paint: logPaint({ len: 4, r: .32, moss: true }) });
propDef('snowlog', { size: [3.5 * M, 1 * M], variants: 3, facings: 2, occ: p => [{ k: 'cap', a: [p.x - 1.6 * M, p.y, p.z + .35 * M], b: [p.x + 1.6 * M, p.y, p.z + .35 * M], r: .35 * M }], paint: logPaint({ len: 4, r: .32, snow: true, c: '#5a4a40' }) });
propDef('stump', { size: [1 * M, 1 * M], variants: 2, occ: occTrunk(.4, .7), paint: (g, k, v, f, ox, oy) => { const u = M * k, C = TT('#6a5040'); px.rect(g, ox - .4 * u, oy - .7 * u, .8 * u, .7 * u, C.sh); px.rect(g, ox - .4 * u, oy - .7 * u, .45 * u, .7 * u, C.base); px.ell(g, ox, oy - .7 * u, .4 * u, .15 * u, '#b8945a'); } });
propDef('fence', { size: [4.5 * M, 1.5 * M], variants: 2, facings: 1, bias: 6, paint: fencePaint });
propDef('haybale', { size: [1.2 * M, 1.5 * M], variants: 1, shadow: .8, occ: occBall(.75, .7), paint: haybalePaint });
propDef('barn', { size: [9 * M, 12 * M], shadow: 7, occ: occBox(6, 5, 9), paint: housePaint({ w: 12, h: 6.5, roof: 4, d: 10, wall: '#a8321e', roofC: '#4a4a52', trim: '#f0e8dc', barn: true }) });
propDef('farmhouse', { size: [7 * M, 9 * M], shadow: 5, occ: occBox(5, 4, 7), paint: housePaint({ w: 9, h: 4.5, roof: 3.2, d: 8, wall: '#e8dcc0', roofC: '#5a4a44', door: true, porch: true, lit: true }) });
propDef('shed', { size: [3 * M, 4 * M], shadow: 2, occ: occBox(1.8, 1.6, 3), paint: housePaint({ w: 3.6, h: 2.4, roof: 1.2, d: 3, wall: '#7a6450', roofC: '#4a3e36', door: true }) });
propDef('traphouse', { size: [2 * M, 2.2 * M], occ: occBox(1.2, 1, 1.4), paint: trapPaint });
propDef('lodge', { size: [3.6 * M, 2.4 * M], shadow: 2, occ: occBall(2.4, .6), paint: lodgePaint });
propDef('drift', { size: [3.5 * M, 1 * M], variants: 4, bias: 4, paint: driftPaint });
propDef('stand', { size: [1 * M, 5.6 * M], paint: standPaint });
propDef('sign', { size: [1 * M, 1.8 * M], paint: signPaint });
propDef('berm', { size: [6.5 * M, 2.4 * M], occ: occBox(6, 1.5, 2.2), paint: bermPaint });
propDef('lowberm', { size: [6.5 * M, 1.2 * M], occ: occBox(6, 1.2, .95), paint: (g, k, v, f, ox, oy) => { const u = M * k, w = 6 * u, h = .95 * u, C = TT('#7a6a48'); px.poly(g, [[ox - w, oy], [ox - w * .7, oy - h], [ox + w * .7, oy - h], [ox + w, oy]], C.sh); px.poly(g, [[ox - w * .9, oy], [ox - w * .65, oy - h + 1], [ox + w * .6, oy - h + 1], [ox + w * .3, oy]], C.base); } });

/** occluder volumes a ray might hit: the nearest t (forward-distance parameter) or null */
function rayVolume(o, d, v) {
  if (v.k === 'sph') return raySphere(o, d, [v.x, v.y, v.z], v.r);
  if (v.k === 'cyl') {   // a vertical cylinder from z0 to z1
    const ox = o.x - v.x, oy = o.y - v.y, a = d.dx * d.dx + d.dy * d.dy, b = 2 * (ox * d.dx + oy * d.dy), c = ox * ox + oy * oy - v.r * v.r, D = b * b - 4 * a * c; if (D < 0 || a < 1e-9) return null;
    const t = (-b - Math.sqrt(D)) / (2 * a); if (t < 0) return null; const z = o.z + d.dz * t; return z >= v.z0 && z <= v.z1 ? t : null;
  }
  if (v.k === 'cap') return rayCapsule(o, d, v.a, v.b, v.r);
  if (v.k === 'box') {   // a box turned by a about z
    const ca = Math.cos(-v.a || 0), sa = Math.sin(-v.a || 0), lx = (o.x - v.x) * ca - (o.y - v.y) * sa, ly = (o.x - v.x) * sa + (o.y - v.y) * ca, dx = d.dx * ca - d.dy * sa, dy = d.dx * sa + d.dy * ca;
    let t0 = 0, t1 = Infinity; for (const [p, q, lo, hi] of [[lx, dx, -v.hx, v.hx], [ly, dy, -v.hy, v.hy], [o.z, d.dz, v.z0, v.z1]]) { if (Math.abs(q) < 1e-9) { if (p < lo || p > hi) return null; continue; } let a = (lo - p) / q, b = (hi - p) / q; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
    return t0 > 0 ? t0 : null;
  }
  return null;
}
/** a ray against an ellipsoid with axes ax (three unit vectors) and radii rad: the entry t, or null */
function rayEllipsoid(o, d, c, ax, rad) {
  const w = [o.x - c[0], o.y - c[1], o.z - c[2]], dv = [d.dx, d.dy, d.dz], O = [], D = [];
  for (let i = 0; i < 3; i++) { const a = ax[i]; O.push((w[0] * a[0] + w[1] * a[1] + w[2] * a[2]) / rad[i]); D.push((dv[0] * a[0] + dv[1] * a[1] + dv[2] * a[2]) / rad[i]); }
  const A = D[0] * D[0] + D[1] * D[1] + D[2] * D[2], B = 2 * (O[0] * D[0] + O[1] * D[1] + O[2] * D[2]), C = O[0] * O[0] + O[1] * O[1] + O[2] * O[2] - 1, disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return null; const sq = Math.sqrt(disc), t = (-B - sq) / (2 * A); return t >= 0 ? t : ((-B + sq) / (2 * A) >= 0 ? 0 : null);
}
function raySphere(o, d, c, r) { const ox = o.x - c[0], oy = o.y - c[1], oz = o.z - c[2], a = d.dx * d.dx + d.dy * d.dy + d.dz * d.dz, b = 2 * (ox * d.dx + oy * d.dy + oz * d.dz), cc = ox * ox + oy * oy + oz * oz - r * r, D = b * b - 4 * a * cc; if (D < 0) return null; const s = Math.sqrt(D), t = (-b - s) / (2 * a); return t >= 0 ? t : ((-b + s) / (2 * a) >= 0 ? 0 : null); }
function rayCapsule(o, d, A, B, r) {
  // the nearest t where the ray comes within r of the segment AB (sampled, then refined)
  const best = { t: null, m: Infinity }, dl = Math.hypot(d.dx, d.dy, d.dz);
  const segD = t => { const p = [o.x + d.dx * t, o.y + d.dy * t, o.z + d.dz * t], vx = B[0] - A[0], vy = B[1] - A[1], vz = B[2] - A[2], L = vx * vx + vy * vy + vz * vz; let u = L ? ((p[0] - A[0]) * vx + (p[1] - A[1]) * vy + (p[2] - A[2]) * vz) / L : 0; u = clamp(u, 0, 1); return Math.hypot(A[0] + vx * u - p[0], A[1] + vy * u - p[1], A[2] + vz * u - p[2]); };
  // the closest approach of the ray to the segment's line
  const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], wx = o.x - A[0], wy = o.y - A[1], wz = o.z - A[2];
  const a = d.dx * d.dx + d.dy * d.dy + d.dz * d.dz, b = d.dx * ux + d.dy * uy + d.dz * uz, c = ux * ux + uy * uy + uz * uz, dd = d.dx * wx + d.dy * wy + d.dz * wz, e = ux * wx + uy * wy + uz * wz, den = a * c - b * b;
  let tc = den > 1e-9 ? (b * e - c * dd) / den : -dd / a; if (tc < 0) tc = 0;
  let lo = Math.max(0, tc - (r + Math.sqrt(c)) * 2 / dl), hi = tc + (r + Math.sqrt(c)) * 2 / dl;
  if (segD(tc) > r) { // maybe the segment's ends are nearer than the line's closest point
    let m = Infinity, tm = tc; for (let i = 0; i <= 24; i++) { const t = lo + (hi - lo) * i / 24, q = segD(t); if (q < m) { m = q; tm = t; } }
    if (m > r) return null; tc = tm;
  }
  // walk back from the inside to the surface
  let tin = tc, tout = lo; if (segD(tout) <= r) return tout;
  for (let i = 0; i < 20; i++) { const mid = (tin + tout) / 2; if (segD(mid) <= r) tin = mid; else tout = mid; }
  return tin;
}

/* ===== src/12-fx.js ===== */
// 12-fx: world particles (fur puffs, dirt, bark chips, sparks, splashes, feathers, clay and snow, breath in the cold),
// drawn through the landscape's renderer so hills hide them; screen weather in three layers; the stink; snowball splats.
// Cosmetic only: every random number here comes from the fx stream.
const FXK = { fur: ['#b89a78', '#8a6a4a', '#e8dcc8'], dirt: ['#6a5034', '#8a6a44', '#4a3a28'], bark: ['#6a5040', '#a8885a', '#4a3a2e'], rock: ['#fff4b0', '#ffd060', '#d8d0c0'], water: ['#e8f4f8', '#b8d8e8', '#ffffff'], feather: ['#1e1c24', '#3a3840', '#2a2830'], clay: ['#e8743a', '#ffa860', '#c85a28'], snow: ['#ffffff', '#e8eef4', '#d8e0ea'], gold: ['#ffe060', '#ffd040', '#fff4b0'], leaf: ['#c8601a', '#e0a02a', '#a8401a'], breath: ['#f0f4f8'], stink: ['#7ac83a'] };
const FXW = {
  parts: [], screen: [], max: 1600,
  reset() { this.parts.length = 0; this.screen.length = 0; },
  burst(x, y, z, n, kind, o = {}) {
    const cols = FXK[kind] || FXK.dirt, sp = (o.speed || 2.5) * M, up = (o.up === undefined ? 2.5 : o.up) * M;
    for (let i = 0; i < n && this.parts.length < this.max; i++) {
      const a = fxr(TAU), s = fxr(.3, 1) * sp;
      this.parts.push({ x, y, z, vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0), vz: fxr(.2, 1) * up, life: 0, max: fxr(.5, 1) * (o.life || .9), c: cols[Math.floor(fxr(cols.length))], size: (o.size || .08) * fxr(.6, 1.4), g: o.g === undefined ? 9.8 * M : o.g, drag: o.drag || 1.5, kind, fade: o.fade });
    }
  },
  /** a round lands: what it threw up by what it hit */
  impact(R) {
    const [x, y, z] = R.point;
    if (R.kind === 'ground') { const t = G.hunt && G.hunt.world.hf.typeAt(x, y); this.burst(x, y, z, 14, t === GT.snow || t === GT.ice ? 'snow' : 'dirt', { speed: 1.6, up: 3 }); }
    else if (R.kind === 'water') { this.burst(x, y, z, 22, 'water', { speed: .8, up: 5.5, life: 1.1 }); }
    else if (R.kind === 'prop') { const P = R.prop ? reg('prop', R.prop.id) : null, stone = P && R.prop.occ && R.prop.occ[0].k === 'sph'; this.burst(x, y, z, stone ? 9 : 12, stone ? 'rock' : 'bark', { speed: stone ? 4 : 2, up: 2, size: stone ? .04 : .07 }); }
  },
  update(dt, H) {
    const w = H.world;
    for (const p of this.parts) {
      p.life += dt; p.vz -= p.g * dt; const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; p.vz *= p.g ? 1 : d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.g) { const gz = w.height(p.x, p.y); if (p.z < gz) { p.z = gz; p.vz = 0; p.vx *= .3; p.vy *= .3; } }
    }
    this.parts = this.parts.filter(p => p.life < p.max);
    // breath in the cold: the hunters' own (in front of the camera, a faint puff) and the animals' noses
    if (H.hunt.cold && H.seg && H.seg.kind !== 'tally') {
      this.breathT = (this.breathT || 0) - dt;
      if (this.breathT <= 0) { this.breathT = 3.2; for (const a of H.actors) if (a.cat === 'animal' && a.alive && a.rig.J.muzzle && fxr() < .6) { const m = a.rig.J.muzzle, s = T('animalScale'); this.burst(a.x + m[0] * s, a.y + m[1] * s, a.z + m[2] * s, 4, 'breath', { speed: .3, up: .3, g: 0, life: 1.4, size: .14, drag: 2 }); } }
    }
    // screen weather: leaves, snow, drizzle in three parallax layers
    const wx = H.hunt.weather; if (wx && H.seg && H.seg.kind !== 'tally') {
      const rate = wx.amount * (wx.kind === 'snow' ? 70 : 14) * dt;
      for (let i = 0; i < rate || fxr() < rate - Math.floor(rate); i++) { if (i > 40) break; const L = Math.floor(fxr(3)); this.screen.push({ x: fxr(-20, H.W + 20), y: -6, L, vx: (wx.wind || .2) * 20 * (L + 1) + fxr(-6, 6), vy: (wx.kind === 'snow' ? 14 : 22) * (L * .6 + .7), t: fxr(TAU), c: wx.kind === 'snow' ? '#ffffff' : FXK.leaf[Math.floor(fxr(3))], kind: wx.kind }); if (rate < 1) break; }
      for (const s of this.screen) { s.t += dt; s.x += (s.vx + Math.sin(s.t * 2.4) * (s.kind === 'leaves' ? 18 : 6)) * dt; s.y += s.vy * dt; }
      this.screen = this.screen.filter(s => s.y < H.H + 8 && s.x > -30 && s.x < H.W + 30);
      if (this.screen.length > 400) this.screen.splice(0, this.screen.length - 400);
    }
  },
  items(items, H) { for (const p of this.parts) items.push({ x: p.x, y: p.y, z: p.z, dot: p.c, size: p.size * M, bias: 2, fog: true }); },
  drawScreen(g, H, W, Ht, pass) {
    for (const s of this.screen) {
      if ((pass === 'front') !== (s.L === 2)) continue;
      const sz = s.L + 1;
      if (s.kind === 'snow') px.rect(g, s.x, s.y, sz > 2 ? 2 : 1, sz > 2 ? 2 : 1, s.L === 0 ? '#c8d4e0' : s.c);
      else if (s.kind === 'leaves') { const f = Math.sin(s.t * 5) > 0, w = s.L === 2 ? 3 : 1; px.rect(g, s.x, s.y, f ? w + 1 : 1, s.L === 2 ? 2 : 1, s.c); if (s.L === 2) px.dot(g, s.x + 1, s.y, '#5a2a10'); }
      else px.line(g, s.x, s.y, s.x - 1, s.y + 3 * sz, '#a8b8c8');
    }
  }
};
G.fx = FXW;
function drawStink(g, H, W, Ht) {
  const a = Math.min(1, H.stink / 3) * .62, t = H.time;
  for (let i = 0; i < 9; i++) { const cx = W * (.2 + (i % 3) * .3) + Math.sin(t * .8 + i) * 20, cy = Ht * (.25 + Math.floor(i / 3) * .25) + Math.cos(t * .6 + i * 2) * 14; px.ddisc(g, cx, cy, 70 + (i % 2) * 20, i % 2 ? '#6ab82a' : '#8ad04a', a); }
  if (a > .3) E.font.text(g, 'P-U!', W / 2 + Math.sin(t * 9) * 3, Ht * .3, '#d8ff8a', { align: 'center', scale: 3, outline: '#2a4a10' });
}
function drawSplat(g, s) {
  const a = clamp(1 - (s.t - s.dur + .6) / .6, 0, 1), R = s.r * (1 + s.t * .05), drip = s.t * 9;
  if (a <= 0) return;
  px.blend(g, a, 'normal', () => { px.disc(g, s.x, s.y, R, '#e8eef4'); for (let i = 0; i < 7; i++) { const an = i / 7 * TAU + s.seed; px.disc(g, s.x + Math.cos(an) * R * .9, s.y + Math.sin(an) * R * .8, R * .35, '#f4f8fc'); } px.rect(g, s.x - R * .3, s.y, R * .2, R * .6 + drip, '#dfe8f0'); px.disc(g, s.x - R * .2, s.y - R * .3, R * .4, '#ffffff'); });
}
// world reactions to what happens
bus.on('impact', e => FXW.impact(e.R));
bus.on('hit', e => { const [x, y, z] = e.R.point; FXW.burst(x, y, z, e.R.zone === 'antler' ? 5 : 10, e.R.zone === 'antler' ? 'rock' : 'fur', { speed: 1.2, up: 1.2, size: .07 }); });
bus.on('critter', e => { const a = e.a; FXW.burst(a.x, a.y, a.z + .3 * M, 12, a.bird ? 'feather' : 'fur', { speed: 1.5, up: 1.5, g: a.bird ? 2 * M : 9.8 * M, life: a.bird ? 1.6 : .8 }); });
bus.on('splash', a => FXW.burst(a.x, a.y, a.z + .2 * M, a.running ? 6 : 3, 'water', { speed: .6, up: 2.2, life: .6, size: .06 }));

/* ===== src/20-species.js ===== */
// 20-species: the three huntable species: speeds, toughness, temper, their call, and what a rack is worth.
def('species', 'whitetail', { label: 'Whitetail', rig: 'whitetail', speeds: [1.3, 3.4, 8.5], hp: 1, temper: .35, call: 'grunt', callName: 'grunt tube',
  names: { m: 'BUCK', f: 'DOE', y: 'FAWN' }, rack: p => p + ' POINTS', base: p => 100 + 15 * p, antlers: p => ({ points: p }), jumpy: true });
def('species', 'elk', { label: 'Elk', rig: 'elk', speeds: [1.4, 4.0, 9.0], hp: 1.5, temper: .45, herd: true, call: 'bugle', callName: 'bugle',
  names: { m: 'BULL', f: 'COW', y: 'CALF' }, rack: p => Math.ceil(p / 2) + 'x' + Math.floor(p / 2), base: p => 150 + 20 * p, antlers: p => ({ points: p }) });
def('species', 'moose', { label: 'Moose', rig: 'moose', speeds: [1.5, 4.5, 8.0], hp: 2, temper: .7, stubborn: true, call: 'moosecall', callName: 'moose call',
  names: { m: 'BULL', f: 'COW', y: 'CALF' }, rack: p => p + '-INCH SPREAD', base: p => 200 + 6 * p, antlers: p => ({ points: Math.round(p / 4), spread: p }) });
/** the kind words a site script uses -> sex and age */
const KIND = { buck: ['m', false], bull: ['m', false], doe: ['f', false], cow: ['f', false], fawn: ['f', true], calf: ['f', true] };
const isTargetKind = k => k === 'buck' || k === 'bull';

/* ===== src/21-critters.js ===== */
// 21-critters: the twelve critter designs: their rig, how they move, what they're worth, and who's protected.
// behavior: hop (rabbits, hares), scurry (squirrels), strut (turkeys), peek (a raccoon in a log), waddle (the skunk),
// graze (Bessie), flock (crows, ravens), flush (grouse, ducks), popup (marmots), trot (coyotes), pack (wolves),
// soar (the eagle), swim (loons, the beaver).
const Q = (species, o) => () => new E.Quadruped(Object.assign({ species }, o));
const BIRD = (kind, o) => () => new E.Bird(Object.assign({ kind }, o));
def('critter', 'squirrel', { label: 'Squirrel', rig: Q('squirrel'), points: 50, behavior: 'scurry', speed: 3.2, bark: 'squirrel', size: [.6, .55], voice: 'chatter' });
def('critter', 'rabbit', { label: 'Cottontail', rig: Q('rabbit'), points: 75, behavior: 'hop', speed: 4.5, bark: 'critter', size: [.6, .6] });
def('critter', 'hare', { label: 'Snowshoe hare', rig: Q('hare'), points: 125, behavior: 'hop', speed: 6, bark: 'critter', size: [.7, .7] });
def('critter', 'turkey', { label: 'Wild turkey', rig: BIRD('turkey'), points: 150, behavior: 'strut', speed: 1.2, bark: 'turkey', size: [.9, 1.1], bird: true, voice: 'gobble' });
def('critter', 'raccoon', { label: 'Raccoon', rig: Q('raccoon'), points: 100, behavior: 'peek', speed: 2, bark: 'critter', size: [.7, .6] });
def('critter', 'skunk', { label: 'Skunk', rig: Q('skunk'), points: -100, protected: true, effect: 'stink', behavior: 'waddle', speed: 1.1, bark: 'stink', size: [.7, .6] });
def('critter', 'bessie', { label: 'Bessie the cow', rig: Q('cow'), points: -500, protected: true, behavior: 'graze', speed: .6, bark: 'bessie', size: [1.6, 1.6], voice: 'moo' });
def('critter', 'crow', { label: 'Crow', rig: BIRD('crow'), points: 100, behavior: 'flock', speed: 9, bark: 'critter', size: [.35, .35], bird: true, voice: 'caw' });
def('critter', 'raven', { label: 'Raven', rig: BIRD('raven'), points: 100, behavior: 'flock', speed: 8, bark: 'critter', size: [.45, .45], bird: true, voice: 'caw' });
def('critter', 'grouse', { label: 'Ruffed grouse', rig: BIRD('grouse'), points: 150, behavior: 'flush', speed: 11, bark: 'critter', size: [.45, .45], bird: true, voice: 'whirr' });
def('critter', 'marmot', { label: 'Marmot', rig: Q('marmot'), points: 75, behavior: 'popup', speed: 2, bark: 'critter', size: [.7, .6], voice: 'whistle' });
def('critter', 'coyote', { label: 'Coyote', rig: Q('coyote'), points: 250, behavior: 'trot', speed: 4, bark: 'critter', size: [1.1, 1], voice: 'howl' });
def('critter', 'wolf', { label: 'Gray wolf', rig: Q('wolf'), points: 300, behavior: 'pack', speed: 9, bark: 'critter', size: [1.3, 1.2], voice: 'howl' });
def('critter', 'eagle', { label: 'Bald eagle', rig: BIRD('eagle'), points: -400, protected: true, behavior: 'soar', speed: 10, bark: 'eagle', size: [1, .8], bird: true });
def('critter', 'duck', { label: 'Mallard', rig: BIRD('duck'), points: 150, behavior: 'flush', speed: 12, bark: 'critter', size: [.45, .45], bird: true, water: true, voice: 'quack' });
def('critter', 'loon', { label: 'Common loon', rig: BIRD('loon'), points: -400, protected: true, behavior: 'swim', speed: .8, bark: 'loon', size: [.7, .6], bird: true, water: true, voice: 'loon' });
def('critter', 'beaver', { label: 'Beaver', rig: Q('beaver'), points: 100, behavior: 'swim', speed: 1, bark: 'critter', size: [.9, .5], water: true, voice: 'slap' });

/* ===== src/22-cast.js ===== */
// 22-cast: the people of the Hunt-Off as engine Humanoids (portraits in dialog, the Lodge, the bonus hosts) and their names.
const CAST = {
  emcee: { name: 'THE EMCEE', color: '#ffd04a', voice: 'emcee', rig: { size: 1.3, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#e8443a' }, colors: { skin: '#e8b48a', hair: '#3a2418', cloth: '#f0e8d8', coat: '#2a3a6a', pants: '#2a2a3a', boot: '#1a1414', trim: '#e8443a', belt: '#1a1414' } } },
  dub: { name: 'UNCLE DUB', color: '#f0a040', voice: 'dub', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#ff6a1a' }, colors: { skin: '#d8a078', hair: '#c8c4bc', cloth: '#7a5a3a', coat: '#8a6a3a', pants: '#4a4a3a', boot: '#3a2a1a', belt: '#2a1e14', trim: '#5a4228' } } },
  granny: { name: 'GRANNY MAE', color: '#f080b0', voice: 'granny', rig: { size: 1.3, build: 'chibi', weapon: null, outfit: 'robe', hair: 'long', colors: { skin: '#f0c8a8', hair: '#d8d4d0', cloth: '#6a7ab8', pants: '#4a4a6a', boot: '#3a2a2a', trim: '#e8d8c8', belt: '#8a4a6a' } } },
  dwayne: { name: 'COUSIN DWAYNE', color: '#7ad04a', voice: 'dwayne', rig: { size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'spiky', colors: { skin: '#e0a880', hair: '#e8c060', cloth: '#5a6a3a', pants: '#4a5a32', boot: '#2a2418', belt: '#1a1a14', trim: '#3a4a28' } } },
  loretta: { name: 'LORETTA PRUITT', color: '#e85a4a', voice: 'loretta', rig: { size: 1.3, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'ponytail', colors: { skin: '#c88a64', hair: '#5a2a1a', cloth: '#c83a2a', pants: '#2a3a5a', boot: '#3a2418', belt: '#2a1a12', trim: '#1e1a1a' } } },
  earl: { name: 'BIG EARL', color: '#8ac8f0', voice: 'earl', rig: { size: 1.3, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', colors: { skin: '#e8b08a', hair: '#6a4a2a', cloth: '#4a6a9a', pants: '#3a5a8a', boot: '#2a1e18', belt: '#3a5a8a', trim: '#e8e0d0' } } }
};
const castRigs = {};
/** a cast member's rig (made once; posed by whoever shows it) */
function castRig(id) { return castRigs[id] || (castRigs[id] = new E.Humanoid(CAST[id].rig)); }
const RIVALS = ['earl', 'loretta', 'dwayne'];

/* ===== src/30-actors.js ===== */
// 30-actors: the animals and critters in a site: orders along paths on the ground, herds, hearing shots and spooking,
// stopping for a call, wounds and death, escape, and whether a hunter can see them.
let ACTOR_N = 0;
class APath {
  constructor(pts, smooth = true) { this.pts = pts; this.P = new E.Path(pts.map(p => [p.x, p.y, 0]), { smooth: smooth && pts.length > 2 ? 'catmull' : null }); this.len = this.P.length; }
  at(d) { return this.P.at(clamp(d, 0, this.len)); }
}
const GAIT_I = { walk: 0, trot: 1, run: 2, bound: 2, gallop: 2 };
class Actor {
  constructor(H, o) {
    this.H = H; this.id = o.id || ('a' + (++ACTOR_N)); this.n = ACTOR_N; this.o = o;
    this.cat = o.critter ? 'critter' : 'animal';
    this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.speed = 0; this.want = 0; this.heading = o.facing || 0;
    this.state = 'hidden'; this.delay = o.delay || 0; this.orders = (o.orders || []).slice(); this.order = null; this.oT = 0; this.t = 0;
    this.fear = 0; this.panic = false; this.alertT = 0; this.frozenT = 0; this.calls = 0; this.lookAt = null; this.hurtT = 0; this.jumpT = 0; this.jumpLen = .6;
    this.hits = []; this.wounds = 0; this.bagger = null; this.resolved = false; this.escaped = false; this.lost = false; this.entered = false; this.visible = false; this.seenAt = null; this.visT = 0;
    this.side = o.side || 0; this.follow = o.follow || null; this.back = o.back || 0; this.react = o.react || .2;
    this.r = RNG.wrap(E.rng(strHash(this.id + ':' + (H.site ? H.site.id : '')) ^ RNG.run));
    this.path = o.path ? new APath(o.path) : null; this.d = o.d || 0; this.jumps = o.jumps || [];
    this.splash = 0; this.flag = 0; this.deadT = 0; this.deadSide = 1; this.trophy = o.trophy || null;
    if (this.cat === 'animal') {
      const sp = this.sp = reg('species', o.species), [sex, young] = KIND[o.kind] || ['f', false];
      this.kind = o.kind; this.sex = sex; this.young = young; this.target = sex === 'm' && !young; this.protected = !this.target;
      this.points = this.target ? (o.points || 8) : 0;
      this.maxHp = this.hp = sp.hp * (o.trophy ? 1.5 : 1) * (o.hpMul || 1);
      const ant = this.target ? Object.assign(sp.antlers(this.points), { seed: o.seed || this.n * 7 + 3, kicker: o.kicker, drop: o.drop }) : null;
      this.rig = new E.Quadruped({ species: sp.rig, sex, young, antlers: ant, size: o.size || 1, colors: o.colors });
      this.speeds = sp.speeds.map(v => v * M);
      this.temper = sp.temper;
    } else {
      const C = this.def = reg('critter', o.critter); this.kind = o.critter; this.target = !C.protected; this.protected = !!C.protected;
      this.rig = C.rig(); this.maxHp = this.hp = .1; this.speeds = [C.speed * .4, C.speed * .7, C.speed].map(v => v * M); this.temper = .2; this.bird = !!C.bird;
      this.beh = o.behavior || C.behavior; this.bz = o.z || 0;
    }
    this.label = this.cat === 'animal' ? this.sp.names[this.young ? 'y' : this.sex] : this.def.label.toUpperCase();
    if (o.at && !o.path) { this.x = o.at.x; this.y = o.at.y; } else if (this.path) { const p = this.path.at(this.d); this.x = p.x; this.y = p.y; this.heading = p.angle; }
    this.z = H.world.height(this.x, this.y);
    this.snapRig();
    if (o.hidden === false || (!this.delay && !o.hidden)) this.appear();
  }
  /** the rig's feet put down where the actor now stands (after it is placed or moved at once) */
  snapRig() { const R = this.rig; if (R.legs) for (const L of R.legs) { L.planted = null; L.swing = false; } if (R instanceof E.Quadruped) { R.facing = this.heading; R.x = this.x; R.y = this.y; R.update(0, { x: this.x, y: this.y, z: this.z, vx: 0, vy: 0, facing: this.heading, ground: this.H.world.ground }); } }
  get alive() { return this.state !== 'dead' && this.state !== 'dying' && this.state !== 'gone' && this.state !== 'hidden'; }
  get live() { return this.state !== 'dead' && this.state !== 'gone'; }
  get running() { return this.speed > this.speeds[1] * 1.02; }
  gaitSpeed(g) { const k = T('animalSpeed') * (this.H.diff ? this.H.diff.speed : 1) * (this.o.speedMul || 1); return (this.speeds[GAIT_I[g] === undefined ? 0 : GAIT_I[g]] || this.speeds[0]) * k; }
  appear() {
    if (this.state !== 'hidden') return; this.state = 'move'; this.t = 0;
    if (!this.orders.length && this.cat === 'animal') this.orders.push(['walk', { to: 1 }], ['exit']);
    this.nextOrder(); bus.emit('appear', this);
  }
  nextOrder() { this.order = this.orders.shift() || null; this.oT = 0; if (this.order && this.order[0] === 'jump') { this.jumpT = this.jumpLen; this.order = this.orders.shift() || null; } }
  /** a shot or an impact heard: loud 0..1 at (x, y) */
  hear(x, y, loud, near) {
    if (!this.alive || this.cat === 'critter' && this.beh === 'graze') return;
    const d = Math.hypot(x - this.x, y - this.y) / M, heard = loud * clamp(1 - d / 400, 0, 1) * T('spook');
    if (heard <= 0) return;
    if (this.state === 'flee' || this.state === 'wounded') { this.fear += heard * .5; this.fleeBoost = Math.min(1.25, (this.fleeBoost || 1) * 1.1); return; }
    this.fear += heard;
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.hear) { this.H.trophyRules.hear(this, heard, near); return; }
    const thr = this.temper * (this.o.calm || 1);
    if (near) { this.startle(0, true); return; }
    if (this.fear > thr) { if (this.sp && this.sp.stubborn && this.r.chance(.45) && !this.stared) { this.stared = true; this.frozenT = 1.6 + this.r.f(); this.lookAt = { x: this.H.cam.x, y: this.H.cam.y, z: 0 }; return; } this.startle(.15 + this.r.f() * .3, false); }
  }
  startle(delay, jump) {
    if (!this.alive || this.state === 'flee') return;
    this.alertT = delay; this.state = 'alert'; this.panic = jump || this.fear > this.temper * 2.2; this.frozenT = 0;
    if (jump) this.jumpT = this.jumpLen;
    bus.emit('spook', this);
  }
  /** flee along the rest of the path (or the escape route) */
  flee() {
    this.state = 'flee'; this.want = this.gaitSpeed('run') * (this.fleeBoost || 1);
    if (this.o.escape) { this.path = new APath([{ x: this.x, y: this.y }].concat(this.o.escape)); this.d = 0; }
    this.orders = [['run', { to: 1 }], ['exit']]; this.nextOrder();
  }
  /** a call heard (a hunter's grunt, bugle or moose call): stop and look toward it for a moment */
  hearCall(c) {
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.call && !this.resolved && this.state !== 'dead' && this.state !== 'dying') return this.H.trophyRules.call(this, c);
    if (!this.alive || this.cat === 'critter') return false;
    const d = Math.hypot(c.x - this.x, c.y - this.y) / M; if (d > 200) return false;
    if (this.panic || this.calls >= 2 || this.state === 'wounded') return false;
    this.calls++; this.frozenT = Math.max(.2, T('callFreeze') + (this.r.f() - .5) * .4) * (this.o.callMul || 1); this.lookAt = { x: c.x, y: c.y, z: this.H.world.height(c.x, c.y) };
    if (this.sp && this.sp.id === 'elk' && this.target && this.r.chance(.5)) this.H.later(.4 + this.r.f() * .4, () => this.live && G.sfx && G.sfx.call('bugle', this, .5));
    if (this.sp && this.sp.id === 'moose' && this.r.chance(.4)) this.stepIn = .8;
    return true;
  }
  /** a hit: zone, damage, by player n; returns 'kill' | 'wound' | 'ping' */
  hit(zone, dmg, pn, at) {
    if (!this.alive && this.state !== 'hidden') return null;
    this.hurtT = .25; this.deadSide = at && this.rig.F ? (((at[0] - this.x) * this.rig.F.r[0] + (at[1] - this.y) * this.rig.F.r[1]) > 0 ? -1 : 1) : 1;
    if (zone === 'antler') { this.startle(0, true); return 'ping'; }
    this.hp -= dmg;
    if (this.hp <= 1e-6) { this.die(pn); return 'kill'; }
    this.wounds++;
    if (this.trophy && this.H.trophyRules && this.H.trophyRules.wounded) { this.H.trophyRules.wounded(this, zone); return 'wound'; }
    this.state = 'wounded'; this.limp = zone === 'leg' ? (this.r.int(0, 3)) : -1; this.panic = true;
    this.want = this.gaitSpeed('run') * .6; this.orders = [['run', { to: 1 }], ['exit']]; this.nextOrder();
    return 'wound';
  }
  die(pn) { this.state = 'dying'; this.deadT = 0; this.want = 0; this.bagger = pn; this.resolved = true; this.vx = this.vy = 0; }
  update(dt) {
    this.t += dt;
    const H = this.H, w = H.world;
    if (this.state === 'hidden') { if (this.delay > 0) { this.delay -= dt; if (this.delay <= 0) this.appear(); } this.rigUpdate(dt, 0, 0); return; }
    if (this.state === 'gone') return;
    if (this.state === 'dying' || this.state === 'dead') {
      this.deadT += dt; if (this.state === 'dying' && this.deadT > 1.1) { this.state = 'dead'; bus.emit('dead', this); }
      this.speed = Math.max(0, this.speed - dt * 30 * M); const a = this.heading; this.x += Math.cos(a) * this.speed * dt * .3; this.y += Math.sin(a) * this.speed * dt * .3; this.z = w.height(this.x, this.y);
      this.rigUpdate(dt, 0, 0); return;
    }
    if (this.hurtT > 0) this.hurtT -= dt;
    this.fear = Math.max(0, this.fear - dt * .12);
    if (this.cat === 'critter') { this.critterThink(dt); this.rigUpdate(dt, this.vx, this.vy); return; }
    // alert -> flee
    if (this.state === 'alert') { this.want = 0; this.alertT -= dt; if (this.alertT <= 0) this.flee(); }
    // following a leader: the leader's path, a little behind and to the side
    if (this.follow && this.state !== 'flee' && this.state !== 'wounded' && this.state !== 'alert') {
      const L = this.follow; if (!L.live) this.follow = null;
      else { if (!this.path) this.path = L.path; if (L.state === 'flee' || L.state === 'alert' || L.state === 'dying' || L.state === 'wounded') { this.react -= dt; if (this.react <= 0) this.startle(0, false); }
        this.want = clamp((L.d - this.back * M - this.d) * 2 + L.speed, 0, this.gaitSpeed('run')); this.order = ['follow']; }
    }
    if (this.frozenT > 0) { this.frozenT -= dt; this.want = 0; if (this.stepIn > 0) { this.stepIn -= dt; this.want = this.gaitSpeed('walk') * .5; } }
    else if (this.order) this.runOrder(dt);
    // move along the path
    const acc = (this.want > this.speed ? (this.want > this.speeds[1] ? 14 : 4) : 10) * M;
    this.speed = E.approach(this.speed, this.want, acc * dt);
    if (this.path && this.speed > 0) {
      this.d += this.speed * dt;
      const p = this.path.at(this.d), nx = p.x + Math.cos(p.angle + Math.PI / 2) * this.side * M, ny = p.y + Math.sin(p.angle + Math.PI / 2) * this.side * M;
      this.vx = (nx - this.x) / dt; this.vy = (ny - this.y) / dt; this.x = nx; this.y = ny; this.heading = p.angle;
      for (const j of this.jumps) if (!j.done && this.d >= j.d * this.path.len) { j.done = true; this.jumpT = this.jumpLen; bus.emit('jump', this); }
      if (this.d >= this.path.len - .5 && this.order && (this.order[0] === 'exit' || this.order[0] === 'run' || this.order[0] === 'walk' || this.order[0] === 'trot')) { if (this.order[0] === 'exit' || this.orders.some(o => o[0] === 'exit') || this.state === 'flee' || this.state === 'wounded') this.goneOut(); else this.nextOrder(); }
    } else { this.vx = this.vy = 0; }
    // the ground (and the jump's arc over a log, a fence or the creek)
    let gz = w.height(this.x, this.y); this.z = gz;
    if (this.jumpT > 0) { this.jumpT -= dt; this.z = gz + Math.sin((1 - this.jumpT / this.jumpLen) * Math.PI) * 1.1 * M * (this.rig.sz || 1); }
    const wl = w.hf.waterAt(this.x, this.y); this.inWater = wl !== null && wl > gz + 2;
    if (this.inWater && this.speed > 20 && (this.splashT = (this.splashT || 0) - dt) <= 0) { this.splashT = this.running ? .12 : .35; bus.emit('splash', this); }
    // in the fan, then out of it: gone
    const [b] = w.bearingOf(H.vantageId, this.x, this.y), F = H.fanB;
    if (b > F[0] - 2 && b < F[1] + 2) this.entered = true;
    else if (this.entered && (b < F[0] - 12 || b > F[1] + 12)) this.goneOut();
    this.rigUpdate(dt, this.vx, this.vy);
  }
  runOrder(dt) {
    const o = this.order, a = o[1] || {}; this.oT += dt;
    this.graze = 0; this.alertW = 0; this.callW = 0;
    switch (o[0]) {
      case 'walk': case 'trot': case 'run': case 'bound': {
        this.want = this.gaitSpeed(o[0]) * (this.state === 'flee' ? (this.fleeBoost || 1) : 1) * (this.state === 'wounded' ? .6 : 1);
        const to = (a.to === undefined ? 1 : a.to) * (this.path ? this.path.len : 0); if (this.path && this.d >= to - .5 && a.to !== undefined && a.to < 1) this.nextOrder(); break;
      }
      case 'graze': this.want = 0; this.graze = (this.oT % 3.4 < 2.6) ? 1 : 0; this.alertW = this.graze ? 0 : .6; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'look': case 'stand': this.want = 0; this.alertW = o[0] === 'look' ? 1 : .3; this.lookAt = o[0] === 'look' ? { x: this.H.cam.x, y: this.H.cam.y, z: 0 } : null; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'call': this.want = 0; this.callW = 1; if (this.oT < .05 && G.sfx) G.sfx.call(this.sp.call === 'bugle' ? 'bugle' : 'moose', this, 1); if (this.oT > (a.secs || a || 2)) this.nextOrder(); break;
      case 'wait': this.want = 0; if (this.oT > (a.secs || a)) this.nextOrder(); break;
      case 'face': this.want = 0; this.heading = E.approachAng(this.heading, a.yaw, dt * 3); if (this.oT > (a.secs || 1)) this.nextOrder(); break;
      case 'fight': { const B = a.with; this.want = 0; this.alertW = .4; if (B && B.live) { this.lookAt = { x: B.x, y: B.y, z: B.z }; const dd = Math.hypot(B.x - this.x, B.y - this.y); this.shove = Math.sin(this.oT * 6) * .5; if (dd > 4.2 * M * this.rig.sz) this.want = this.gaitSpeed('walk') * .6; } if (this.oT > (a.secs || 4)) this.nextOrder(); break; }
      case 'exit': this.want = this.gaitSpeed(this.state === 'flee' ? 'run' : 'trot'); break;
      case 'hold': this.want = 0; break;
      case 'follow': break;
      default: this.nextOrder();
    }
  }
  goneOut() {
    if (this.state === 'gone') return;
    const was = this.state; this.state = 'gone'; this.resolved = true;
    if (this.cat === 'animal' && this.target) { if (was === 'wounded' || this.wounds > 0) { this.lost = true; bus.emit('lost', this); } else { this.escaped = true; bus.emit('escape', this); } }
    else bus.emit('leave', this);
  }
  rigUpdate(dt, vx, vy) {
    const R = this.rig, w = this.H.world;
    if (this.cat === 'critter' && this.bird) { R.update(dt, { x: this.x, y: this.y, z: this.z, vx, vy, vz: this.vz, flap: this.flap === undefined ? 1 : this.flap, swim: this.swim, walk: this.walkW || 0, strut: this.strut, dead: this.state === 'dying' || this.state === 'dead', facing: this.heading }); return; }
    // antlers read at range: an arcade boost that grows with distance from the hunt's camera
    if (this.target && R.antlers) { const D = Math.hypot(this.x - this.H.cam.x, this.y - this.H.cam.y) / M; R.antlerScale = T('antlerBoost') * Math.min(1.6, 1 + Math.max(0, (D - 80) / 150)) * (this.o.antlerMul || 1); }
    const dead = this.state === 'dying' ? clamp(this.deadT / 1.05, 0, 1) : this.state === 'dead' ? 1 : 0;
    const ground = this.inWater ? ((x, y) => w.height(x, y)) : w.ground;
    R.update(dt, { x: this.x, y: this.y, z: this.z, vx, vy, facing: this.faceTo !== undefined ? this.faceTo : this.heading, faceLock: this.faceTo !== undefined, ground, alert: this.state === 'alert' || this.frozenT > 0 ? 1 : (this.alertW || 0), graze: this.graze || 0, look: this.lookAt || (this.frozenT > 0 ? { x: this.H.cam.x, y: this.H.cam.y } : null),
      hurt: this.hurtT > 0 ? 1 : 0, limp: this.state === 'wounded' ? this.limp : -1, jump: this.jumpT > 0 ? 1 : 0, dead, deadSide: this.deadSide, call: this.callW || 0, swim: this.swimW || 0, crouch: this.crouchW || 0, rear: this.rearW || 0 });
  }
  /* ---------- critters ---------- */
  critterThink(dt) {
    const C = this.def, H = this.H, w = H.world, b = this.beh, a = this.o;
    this.flap = 1; this.swim = false; this.walkW = 0; this.strut = false;
    if (this.state === 'alert') { this.alertT -= dt; if (this.alertT <= 0) this.state = 'flee'; }
    const moveAlong = (sp) => { if (!this.path) return; this.d += sp * dt; const p = this.path.at(this.d); this.vx = (p.x - this.x) / dt; this.vy = (p.y - this.y) / dt; this.x = p.x; this.y = p.y; this.heading = p.angle; if (this.d >= this.path.len - .5) this.goneOut(); };
    if (b === 'hop' || b === 'waddle' || b === 'scurry' || b === 'trot') {
      const fleeing = this.state === 'flee'; let sp = fleeing ? this.speeds[2] : b === 'hop' ? (Math.sin(this.t * 7) > -.2 ? this.speeds[1] : 0) : this.speeds[0];
      if (b === 'hop' && !fleeing && (this.t % 5) > 3.6) sp = 0;   // freezes now and then
      if (b === 'scurry' && !fleeing && (this.t % 3) > 2) { sp = 0; this.rearW = 1; } else this.rearW = 0;
      moveAlong(sp); this.z = w.height(this.x, this.y); if (b === 'hop' && sp > 0) this.z += Math.abs(Math.sin(this.t * 7 * Math.PI / 2)) * .35 * M;
      if (b === 'trot' && this.t % 7 < .02 && G.sfx) G.sfx.critter('howl', this);
    } else if (b === 'strut') {   // a turkey: walks the field, gobbles, runs off at a shot
      const fleeing = this.state === 'flee'; this.walkW = 1; this.strut = !fleeing && (this.t % 6) < 2.5;
      moveAlong(fleeing ? this.speeds[2] * 1.6 : this.strut ? 0 : this.speeds[0]); this.z = w.height(this.x, this.y);
      if (this.strut && (this.t % 6) < .02 && G.sfx) G.sfx.critter('gobble', this);
    } else if (b === 'peek') {   // a raccoon in a hollow log: up, look round, duck, up again
      const ph = this.t % 4.5; this.z = w.height(this.x, this.y) + (ph < 2.6 ? 0 : -1.2 * M); this.peekUp = ph < 2.6; this.heading = Math.atan2(H.cam.y - this.y, H.cam.x - this.x);
      if (this.state === 'flee' || this.t > (a.life || 14)) this.goneOut();
    } else if (b === 'graze') { this.vx = this.vy = 0; this.graze = (this.t % 6) < 4.5 ? 1 : 0; this.z = w.height(this.x, this.y); if (this.t % 9 < .02 && G.sfx) G.sfx.critter('moo', this); if (this.path) moveAlong(this.speeds[0] * (this.graze ? 0 : 1)); }
    else if (b === 'popup') { const ph = this.t % 5; this.rearW = ph < 3 ? 1 : 0; this.z = w.height(this.x, this.y) + (ph < 3.2 ? 0 : -1.4 * M); if (ph < .02 && G.sfx) G.sfx.critter('whistle', this); if (this.state === 'flee' || this.t > (a.life || 18)) this.goneOut(); }
    else if (b === 'pack') { moveAlong(this.speeds[2] * (a.speedMul || 1)); this.z = w.height(this.x, this.y); }
    else if (b === 'flock' || b === 'flush' || b === 'soar') {   // fliers: a path in the air (z above the ground)
      if (b === 'flush' && !this.flushed) { this.z = w.height(this.x, this.y) + (C.water ? 0 : .2 * M); this.swim = !!C.water; this.flap = 0; if (this.t > (a.wait || 3) || this.state === 'flee') { this.flushed = true; if (G.sfx) G.sfx.critter(C.water ? 'quack' : 'whirr', this); } return; }
      const sp = this.speeds[2] * (b === 'soar' ? .6 : 1); this.d += sp * dt; const p = this.path.at(this.d), alt = (a.alt || (b === 'soar' ? 60 : 12)) * M * (b === 'flush' ? Math.min(1, this.d / (30 * M)) : 1);
      const nz = w.height(p.x, p.y) + alt + (b === 'flock' ? Math.sin(this.t * 2 + this.n) * 1.5 * M : 0);
      this.vx = (p.x - this.x) / dt; this.vy = (p.y - this.y) / dt; this.vz = (nz - this.z) / dt; this.x = p.x; this.y = p.y; this.z = nz; this.heading = p.angle;
      this.flap = b === 'soar' ? (Math.sin(this.t * .7) > .7 ? .6 : .05) : 1;
      if (b === 'flock' && this.t % 4 < .02 && G.sfx && this.n % 3 === 0) G.sfx.critter('caw', this);
      if (this.d >= this.path.len - .5) this.goneOut();
    } else if (b === 'swim') {   // on the water: a loon floats and wails, a beaver swims with a wake and slaps
      const wl = w.hf.waterAt(this.x, this.y); this.swim = true; this.flap = 0;
      if (this.path) moveAlong(this.speeds[0] * (this.state === 'flee' ? 3 : 1)); this.z = (wl !== null ? wl : w.height(this.x, this.y)) - (this.bird ? 0 : .25 * M);
      if (this.t % 8 < .02 && G.sfx) G.sfx.critter(C.voice || 'loon', this);
      this.swimW = this.bird ? 0 : 1;
      if (this.state === 'flee' && !this.bird && this.t - (this.fleeAt || 0) > .3) { this.goneOut(); if (G.sfx) G.sfx.critter('slap', this); }
    }
  }
  /** for the hunt's renderer: a billboard item */
  item(scale) {
    if (this.state === 'hidden' || this.state === 'gone') return null;
    const R = this.rig, s = (this.cat === 'animal' ? T('animalScale') : 1.15) * (scale || 1), H = this.H, glint = G.game.settings.glint;
    if (this.cat === 'critter' && this.beh === 'peek' && !this.peekUp) return null;
    const it = this._it || (this._it = { draw: null, outline: H.hunt ? H.hunt.outline : '#1a1010', bias: 10 });
    const q = R instanceof E.Quadruped; it.x = q ? R.x : this.x; it.y = q ? R.y : this.y; it.z = q ? R.z : this.z; it.scale = s;   // (a rig's joints hang off its own root, which rides the ground under its legs)
    it.box = [Math.max(R.length || 10, R.height || 10) * .7, (R.height || 10) + 6];
    it.draw = (g, ox, oy, k, view) => { R.draw(g, ox, oy, view, { glint: glint && this.target, xray: this.xrayT > 0 }); };
    const w = this.cat === 'animal' ? H.world.hf.waterAt(this.x, this.y) : null; it.wade = w !== null && w > this.z + .3 ? w : null;   // wading: the water hides the legs (and takes the shots there)
    return it;
  }
  /** hit volumes in world space (with the arcade size boost the drawing uses) */
  zones() { const s = this.cat === 'animal' ? T('animalScale') : 1.15; return this.rig.zones(s); }
}

/* ===== src/31-patterns.js ===== */
// 31-patterns: the spawn patterns site scripts call: how animals come into a site and go out of it.
// Points are [bearing, distance] from the site's vantage (degrees from its heading, metres).
const orderFor = (o, gait) => {
  const g = gait || o.gait || 'walk', list = [];
  if (o.stop) list.push([g === 'run' || g === 'bound' ? 'trot' : g, { to: o.stop[0] }], [o.look === false ? 'stand' : 'look', { secs: o.stop[1] }], [g, { to: 1 }]);
  else list.push([g, { to: 1 }]);
  list.push(['exit']); return list;
};
def('pattern', 'cross', { make(S, o) {
  if (o.follow) return [S.spawn(o.kind, Object.assign({}, o, { follow: o.follow, path: null, at: o.follow, back: o.back || 2.5, side: o.side || 0, orders: [['hold']], species: o.species || o.follow.o.species }))];
  return [S.spawn(o.kind, Object.assign({}, o, { orders: o.orders || orderFor(o) }))];
} });
def('pattern', 'emerge', { make(S, o) {   // waits hidden behind cover, steps out alert, then goes on
  const g = o.gait || 'run', list = [['look', { secs: o.alertSecs || .7 }]].concat(orderFor(o, g));
  return [S.spawn(o.kind, Object.assign({}, o, { orders: list, delay: (o.delay || 0) + .01, jumps: o.jump ? [{ d: o.jump }] : [] }))];
} });
def('pattern', 'graze', { make(S, o) {   // walks in, grazes with glances up, wanders off
  const path = [o.from, o.at, o.exit || [o.at[0] - 30, o.at[1] + 10]], f = 1 / 2;
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['walk', { to: f * .98 }], ['graze', { secs: o.secs || 4 }], ['look', { secs: 1.2 }], [o.leave || 'trot', { to: 1 }], ['exit']] }))];
} });
def('pattern', 'herdPass', { make(S, o) {   // a leader and followers on one path
  const kinds = o.kinds, out = [];
  const lead = S.spawn(kinds[0], Object.assign({}, o, { points: (o.points || [])[0], orders: orderFor(o), jumps: o.jump ? [{ d: o.jump }] : [] }));
  out.push(lead);
  for (let i = 1; i < kinds.length; i++) out.push(S.spawn(kinds[i], { species: o.species, follow: lead, at: lead, back: (o.spacing || 4) * i, side: (i % 2 ? 1 : -1) * (o.spread || 1.4), points: (o.points || [])[i], delay: o.delay, react: .1 + S.rng.f() * .3, orders: [['hold']] }));
  return out;
} });
def('pattern', 'ridgeRun', { make(S, o) { return [S.spawn(o.kind, Object.assign({}, o, { orders: orderFor(o, 'run') }))]; } });
def('pattern', 'wade', { make(S, o) { return [S.spawn(o.kind, Object.assign({}, o, { orders: orderFor(o, 'walk'), speedMul: .7 }))]; } });
def('pattern', 'bolt', { make(S, o) {   // bedded down unseen; jumps up and runs at the first shot or after a time
  const a = S.spawn(o.kind, Object.assign({}, o, { path: o.path, delay: o.after || 12, orders: [['run', { to: 1 }], ['exit']], jumps: [{ d: .02 }] }));
  if (!S.site.timeBoxed) { const off = bus.on('shot', () => { if (a.state === 'hidden') { a.delay = .25 + S.rng.f() * .3; } off(); }); S.cleanup.push(off); }
  return [a];
} });
def('pattern', 'decoyDoe', { make(S, o) { return [S.spawn(o.kind || (S.species === 'whitetail' ? 'doe' : 'cow'), Object.assign({}, o, { orders: orderFor(o, o.gait || 'walk'), decoy: true }))]; } });
def('pattern', 'stand', { make(S, o) {
  const path = [o.from, o.at, o.exit || [o.at[0] + 30, o.at[1] + 10]];
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['walk', { to: .49 }], ['stand', { secs: o.secs || 3 }], ['trot', { to: 1 }], ['exit']] }))];
} });
def('pattern', 'charge', { make(S, o) {   // runs straight at the vantage, then veers off
  const path = o.path || [o.from, [o.from[0] * .3, 18], [o.veer || 40, 12], [(o.veer || 40) * 1.5, 30]];
  return [S.spawn(o.kind, Object.assign({}, o, { path, orders: [['run', { to: 1 }], ['exit']], charge: true }))];
} });
def('pattern', 'fight', { make(S, o) {   // two bulls lock antlers, then split
  const A = S.spawn(o.kind || 'bull', Object.assign({}, o, { path: [o.fromA, o.at, o.exitA], points: o.pointsA, orders: [['walk', { to: .48 }], ['fight', { secs: o.secs || 5 }], ['run', { to: 1 }], ['exit']] }));
  const B = S.spawn(o.kind || 'bull', Object.assign({}, o, { path: [o.fromB, [o.at[0] + 3, o.at[1] + 3], o.exitB], points: o.pointsB, orders: [['walk', { to: .48 }], ['fight', { secs: o.secs || 5 }], ['run', { to: 1 }], ['exit']] }));
  for (const X of [A, B]) for (const q of [X.order].concat(X.orders)) if (q && q[0] === 'fight') q[1] = Object.assign({}, q[1], { with: X === A ? B : A });
  return [A, B];
} });

/* ===== src/32-site.js ===== */
// 32-site: a site in play: its script (a coroutine of spawns), the critters on their schedule, the director's camera,
// the end rules (every buck bagged, escaped or lost; time; everyone benched) and each player's results.
class SiteResult {
  constructor(p) { this.p = p; this.n = p.n; this.shots = 0; this.hits = 0; this.pings = 0; this.kills = []; this.critters = []; this.penalties = []; this.bonuses = []; this.score = 0; this.wounds = 0; this.longest = 0; this.stars = 0; this.benched = false; }
  add(points) { this.score = Math.max(0, this.score + points); }
}
class Site {
  constructor(H, def, o = {}) {
    this.H = H; this.def = def; this.id = def.id; this.o = o;
    this.timeBoxed = !!o.timeBoxed; this.limit = (o.time || def.time || 60) * (o.time ? 1 : T('siteTime'));
    this.t = 0; this.actors = []; this.spawned = 0; this.bucksSpawned = []; this.phase = 'play'; this.endT = 0; this.endReason = null; this.done = false;
    this.results = H.players.map(p => new SiteResult(p));
    this.rng = RNG.wrap(RNG.fresh('spawn:' + def.id + ':' + (o.loop || 0)));
    this.cleanup = []; this.placed = []; this.crit = (def.critters || []).map(c => ({ id: c[0], o: c[1], done: false })); this.lastA = null;
    this.camB = def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0; this.camVel = 0; this.dirI = 0; this.dirFrom = this.camB; this.dirT = 0; this.mode = 'keys';
    this.pitch = def.frame.pitch; this.fov = def.frame.fov;
    H.vantageId = def.vantage; H.fanB = def.frame.bearings; H.site = this;
    for (const p of def.props || []) { const w = H.world.at(def.vantage, p[1][0], p[1][1]); this.placed.push(H.world.place(p[0], w.x, w.y, Object.assign({ authored: true, site: def.id }, p[2] || {}))); }
    const S = this.S = this.api();
    // the script runs on the site's own clock (stepped in update), so every copy of a hub round spawns on the same beat
    if (def.script) this.script = new E.Script(G.game, function* () { yield* def.script(S); });
    bus.emit('siteStart', this);
  }
  api() {
    const site = this, H = this.H;
    return {
      get time() { return site.t; }, rng: site.rng, species: H.species, cleanup: site.cleanup, site,
      get bucksLeft() { return site.timeBoxed ? (site.def.bucks || 0) : Math.max(0, (site.def.bucks || 0) - site.bucksSpawned.filter(a => a.resolved).length); },
      get resolved() { return site.timeBoxed ? 0 : site.bucksSpawned.filter(a => a.resolved).length; },
      get allResolved() { return site.timeBoxed ? site.t - (site.lastSpawnT || 0) > 11 : site.bucksSpawned.length > 0 && site.bucksSpawned.every(a => a.resolved); },
      get actors() { return site.actors; }, get players() { return H.players; }, get last() { return site.lastA; },
      pattern: (name, o) => { const out = reg('pattern', name).make(this.S, o || {}); site.lastA = out[0]; return out.length === 1 ? out[0] : out; },
      spawn: (kind, o) => site.spawn(kind, o || {}),
      bark: (cat, o) => G.barks && G.barks.say(cat, o),
      say: (who, line) => G.barks && G.barks.caption(who, line),
      on: (ev, fn) => { const off = bus.on(ev, fn); site.cleanup.push(off); return off; },
      at: (b, d) => H.world.at(site.def.vantage, b, d)
    };
  }
  /** a point list [[bearing, dist], ...] (or world points) -> world points */
  pts(list) { return list.map(p => Array.isArray(p) ? this.H.world.at(this.def.vantage, p[0], p[1]) : (p.x !== undefined ? p : null)).filter(Boolean); }
  spawn(kind, o) {
    const H = this.H, critter = has('critter', kind), sp = o.species || H.species;
    const path = o.path ? this.pts(o.path) : null, at = o.at && o.at.x !== undefined ? o.at : o.at ? this.pts([o.at])[0] : null;
    const a = new Actor(H, Object.assign({}, o, { critter: critter ? kind : null, kind: critter ? null : kind, species: sp, path, at: at || (path ? null : this.pts([[0, 50]])[0]),
      points: o.points || (isTargetKind(kind) ? this.defaultPoints(sp, o.big) : 0), seed: this.rng.int(1, 9999), escape: o.escape ? this.pts(o.escape) : null,
      calm: o.calm, jumps: (o.jumps || []).map(j => Object.assign({}, j)) }));
    if (o.follow) { a.path = o.follow.path; a.d = Math.max(0, o.follow.d - (o.back || 2.5) * M); const p = a.path.at(a.d); a.x = p.x; a.y = p.y; a.z = H.world.height(a.x, a.y); a.heading = p.angle; a.snapRig(); }
    if (o.decoy) a.decoy = true;
    if (o.charge) a.charging = true;
    this.actors.push(a); H.actors.push(a); this.lastA = a; this.lastSpawnT = this.t; (this.log = this.log || []).push(Math.round(this.t * 10) / 10 + ':' + kind);
    if (a.cat === 'animal' && a.target) { this.bucksSpawned.push(a); a.slot = this.bucksSpawned.length - 1; }
    a.siteId = this.id;
    return a;
  }
  defaultPoints(sp, big) {
    if (sp === 'elk') return big ? 12 : this.rng.int(10, 12);
    if (sp === 'moose') return big ? 58 : this.rng.int(40, 55);
    return big ? 10 : this.rng.int(4, 9);
  }
  spawnCritter(c) {
    const o = c.o, n = o.flock || 1, out = [];
    for (let i = 0; i < n; i++) {
      let path = o.path ? o.path.map(p => [p[0] + i * 3, p[1] + i * 2.5]) : null, at = o.pos || o.log || null;
      if (o.tree) path = [[o.tree[0], o.tree[1]], [o.tree[0] + 6, o.tree[1] - 4], [o.tree[0] + 14, o.tree[1] + 2]];
      if (o.log) { at = o.log; path = null; }
      out.push(this.spawn(c.id, Object.assign({}, o, { path, at, delay: i * .5, behavior: o.behavior })));
    }
    return out;
  }
  update(dt) {
    const H = this.H, def = this.def;
    this.t += dt;
    if (this.script && !this.script.done && this.phase === 'play') this.script._step(dt);
    // critters on their schedule
    for (const c of this.crit) if (!c.done && this.t >= (c.o.at || 0)) { c.done = true; this.spawnCritter(c); }
    // the end rules
    if (this.phase === 'play') {
      const benched = H.players.every(p => p.benched), scriptDone = !this.script || this.script.done;
      if (this.timeBoxed) {
        if (scriptDone && this.t < this.limit - 6 && !this.reloopAt) this.reloopAt = this.t + 2;
        if (this.reloopAt && this.t >= this.reloopAt) { this.reloopAt = 0; this.loops = (this.loops || 0) + 1; this.rng = RNG.wrap(RNG.fresh('spawn:' + def.id + ':' + this.loops)); this.S.rng = this.rng; const S = this.S; this.script = new E.Script(G.game, function* () { yield* def.script(S); }); }
        if (this.t >= this.limit) this.finish('time');
      } else {
        if (benched && H.players.length) this.finish('benched');
        else if (scriptDone && this.bucksSpawned.length && this.bucksSpawned.every(a => a.resolved) && !this.actors.some(a => a.state === 'dying')) this.finish('clear');
        else if (this.t >= this.limit) this.finish('time');
      }
    } else if (this.phase === 'end') { this.endT += dt; if (this.endT > 1.6) this.done = true; }
    this.direct(dt);
  }
  finish(reason) {
    if (this.phase !== 'play') return;
    this.phase = 'end'; this.endReason = reason; this.endT = 0;
    if (this.script) this.script.cancel();
    if (reason === 'time') for (const a of this.actors) if (!a.resolved && a.state !== 'dead' && a.state !== 'dying' && a.state !== 'gone') { if (a.state === 'hidden') a.goneOut(); else { a.startle(this.rng.f() * .3, false); if (a.target && a.cat === 'animal') { a.resolved = true; if (a.wounds) a.lost = true; else a.escaped = true; } } }
    for (const a of this.actors) if (a.state === 'hidden') a.goneOut();
    bus.emit('siteEnd', this);
  }
  /** the director: keyframes keyed to site time (never to input, so every player sees the same frame), then in single
   *  player a follow mode that eases toward the bucks in view */
  direct(dt) {
    const K = this.def.director || [], H = this.H;
    while (this.dirI < K.length && this.t >= K[this.dirI][0]) {
      const k = K[this.dirI][1]; if (k.mode) this.mode = k.mode === 'follow' && (H.players.length > 1 || H.hubMode || H.noFollow) ? 'keys' : k.mode;
      if (k.bearing !== undefined) { this.dirFrom = this.camB; this.dirTo = k.bearing; this.dirDur = k.dur || .01; this.dirT = 0; this.dirEase = E.ease[k.ease || 'inOutSine'] || E.ease.inOutQuad; }
      if (k.pitch !== undefined) this.pitchTo = k.pitch; if (k.fov !== undefined) this.fovTo = k.fov;
      this.dirI++;
    }
    if (this.dirTo !== undefined && this.dirT < this.dirDur) { this.dirT += dt; this.camB = lerp(this.dirFrom, this.dirTo, this.dirEase(clamp(this.dirT / this.dirDur, 0, 1))); }
    else if (this.mode === 'follow') {
      const live = this.actors.filter(a => a.cat === 'animal' && a.target && a.alive && (a.visible || a.entered || a.state === 'flee'));
      if (live.length) {
        let s = 0; for (const a of live) s += H.world.bearingOf(this.def.vantage, a.x, a.y)[0]; s /= live.length;
        const half = H.halfFovH || 28, B = this.def.frame.bearings, tgt = clamp(s, B[0] + half * .7, B[1] - half * .7);
        [this.camB, this.camVel] = E.smoothDamp(this.camB, tgt, this.camVel, .8, dt);
      }
    }
    if (this.pitchTo !== undefined) this.pitch = E.approach(this.pitch, this.pitchTo, dt * 2);
    if (this.fovTo !== undefined) this.fov = E.approach(this.fov, this.fovTo, dt * 6);
  }
  dispose() {
    for (const f of this.cleanup) f(); this.cleanup.length = 0;
    if (this.script) this.script.cancel();
    for (const p of this.placed) this.H.world.remove(p); this.placed.length = 0;
    for (const a of this.actors) { const i = this.H.actors.indexOf(a); if (i >= 0) this.H.actors.splice(i, 1); }
  }
}

/* ===== src/40-weapon.js ===== */
// 40-weapon: the pump rifle (a five-round tube: fire, rack, reload), the scope (a lens with sway and a held breath),
// and the call (a few a site: animals stop and look).
class Rifle {
  constructor(p, o = {}) { this.p = p; this.setup(o); }
  setup(o = {}) {
    this.cap = o.tube || Math.round(T('rounds')); this.rounds = this.cap; this.chambered = true; this.rackT = 0; this.reloadT = 0; this.last = -9; this.autoT = -1;
    this.rackTime = o.rack !== undefined ? o.rack : T('rackTime'); this.reloadTime = T('reloadTime'); this.dryT = 0; this.dryCount = 0; this.shells = 0; this.bonus = !!o.tube;
  }
  get busy() { return this.rackT > 0 || this.reloadT > 0; }
  /** fire: true when a round went; false is a dry click (an empty chamber) */
  fire(t) {
    if (this.busy || t - this.last < .1) return null;
    if (!this.chambered) { this.dryT = .3; this.dryCount++; bus.emit('dry', this.p); return false; }
    this.chambered = false; if (!this.infinite) this.rounds = Math.max(0, this.rounds - 1); this.last = t;
    if (this.auto || this.p.autoPump) this.autoT = .12;
    return true;
  }
  /** pump: rack the next round (two clicks), or with the tube empty reload it (five shells) */
  pump() {
    if (this.busy) return false;
    if (this.chambered && this.rounds >= this.cap) return false;
    if (this.rounds > 0 && !this.chambered) { this.rackT = this.rackTime; bus.emit('pump', this.p); return true; }
    if (this.rounds <= 0 || (this.chambered === false && this.rounds === 0)) { this.reloadT = this.reloadTime; this.shells = 0; bus.emit('reload', this.p); return true; }
    return false;
  }
  update(dt) {
    if (this.dryT > 0) this.dryT -= dt;
    if (this.autoT >= 0) { this.autoT -= dt; if (this.autoT < 0) this.pump(); }
    if (this.rackT > 0) { this.rackT -= dt; if (this.rackT <= 0) { this.rackT = 0; this.chambered = true; } }
    if (this.reloadT > 0) {
      const before = this.reloadT; this.reloadT -= dt;
      const step = this.reloadTime / (this.cap + .5), n0 = Math.floor((this.reloadTime - before) / step), n1 = Math.floor((this.reloadTime - Math.max(0, this.reloadT)) / step);
      if (n1 > n0) { this.shells = Math.min(this.cap, n1); bus.emit('shell', this.p); }
      if (this.reloadT <= 0) { this.reloadT = 0; this.rounds = this.cap; this.chambered = true; }
    }
  }
}
class Scope {
  constructor(p) { this.p = p; this.on = false; this.raise = 0; this.breath = T('breath'); this.holding = false; this.shaky = 0; this.t = 0; this.toggle = false; }
  get up() { return this.raise > .6; }
  /** the sway in screen pixels now: a slow figure, much smaller while the breath is held, doubled while it shakes */
  sway() {
    const A = T('sway') * (G.hunt && G.hunt.diff ? G.hunt.diff.sway : 1) * (this.holding ? .15 : 1) * (this.shaky > 0 ? 2 : 1) * this.raise, t = this.t;
    return [A * (.6 * Math.sin(1.3 * t) + .4 * Math.sin(2.9 * t + 1)), A * (.5 * Math.sin(1.7 * t + 2) + .3 * Math.sin(3.3 * t))];
  }
  update(dt, wantOn, wantBreath) {
    this.t += dt;
    const was = this.on; this.on = wantOn;
    if (this.on && !was) bus.emit('scope', this.p);
    this.raise = E.approach(this.raise, this.on ? 1 : 0, dt / .15);
    const max = T('breath');
    if (this.shaky > 0) { this.shaky -= dt; this.holding = false; }
    else if (this.on && wantBreath && this.breath > 0) { if (!this.holding) bus.emit('breathIn', this.p); this.holding = true; this.breath -= dt; if (this.breath <= 0) { this.breath = 0; this.holding = false; this.shaky = 1.5; bus.emit('breathOut', this.p); } }
    else { if (this.holding) bus.emit('breathOut', this.p); this.holding = false; this.breath = Math.min(max, this.breath + dt * 1.2); }
  }
}
class Call {
  constructor(p) { this.p = p; this.reset(); }
  reset() { this.charges = Math.round(T('calls')) + (G.hunt && G.hunt.diff && G.hunt.diff.calls || 0); this.cd = 0; }
  update(dt) { if (this.cd > 0) this.cd -= dt; }
  use() { if (this.charges <= 0 || this.cd > 0) return false; this.charges--; this.cd = 3; return true; }
}

/* ===== src/41-aim.js ===== */
// 41-aim: each player's reticle: the mouse moves it absolutely; a stick or the keys give it a velocity on a response
// curve with a short ramp, the right stick adds fine aim, the scope slows it, and aim assist (pads and keys only, never
// the mouse; never toward a doe or a protected critter) adds friction over a legal target.
const ASSIST = { off: 1, light: .65, strong: .45 };
function aimUpdate(p, dt, H) {
  if (p.bot) return;
  const I = p.input, W = H.W || 480, Ht = H.H || 270, dev = I.lastDevice, scoped = p.scope.up;
  if (p.n === 1 && dev === 'mouse' && !G.touchOnly) {
    const m = I.pointer(); if (m) { p.rx = clamp(m[0], 0, W - 1); p.ry = clamp(m[1], 0, Ht - 1); }
    p.vx = p.vy = 0; p.ramp = 0; p.device = 'mouse'; return;
  }
  p.device = dev === 'gamepad' ? 'gamepad' : 'keyboard';
  const mv = I.move(), mag = Math.min(1, Math.hypot(mv[0], mv[1]));
  p.ramp = mag > .05 ? Math.min(1, (p.ramp || 0) + dt / .15) : 0;
  const assistSet = G.hunt && G.hunt.diff && G.hunt.diff.assist ? G.hunt.diff.assist : (G.game.settings.assist || 'light');
  let speed = T('reticleSpeed') * (G.game.settings.reticle || 1) * Math.pow(mag, 1.7) * (.35 + .65 * p.ramp) * (scoped ? .45 : 1);
  // aim assist: friction near a legal target; strong pulls toward its vitals while the stick moves toward them
  let pull = null;
  if (assistSet !== 'off' && H.lens) {
    const fr = assistSet === 'strong' ? .45 : Math.min(ASSIST.light, T('assist') < 1 ? T('assist') : 1), q = [0, 0, 0, 0];
    for (const a of H.actors) {
      if (!a.alive || !a.target || a.protected || !a.visible) continue;
      const z = a.zones(), h = z.find(v => v.id === 'heart') || z[0]; if (!h || !H.lens.project(h.a[0], h.a[1], h.a[2], q)) continue;
      const R = Math.max(4, (a.rig.length || 10) * q[2] * .55), d = Math.hypot(q[0] - p.rx, q[1] - p.ry);
      if (d < R + 8) { speed *= fr; pull = q.slice(0, 2); break; }
    }
  }
  if (mag > .05) {
    p.vx = mv[0] / mag * speed; p.vy = mv[1] / mag * speed;
    if (pull && assistSet === 'strong') { const dx = pull[0] - p.rx, dy = pull[1] - p.ry, L = Math.hypot(dx, dy); if (L > .5 && (dx * mv[0] + dy * mv[1]) > 0) { p.rx += dx * Math.min(1, .25 * dt * 4); p.ry += dy * Math.min(1, .25 * dt * 4); } }
  } else { p.vx = p.vy = 0; }
  const fine = I.padAim; if (fine && p.device === 'gamepad') { p.vx += fine[0] * T('reticleSpeed') * .3 * (scoped ? .45 : 1); p.vy += fine[1] * T('reticleSpeed') * .3 * (scoped ? .45 : 1); }
  p.rx = clamp(p.rx + p.vx * dt, 0, W - 1); p.ry = clamp(p.ry + p.vy * dt, 0, Ht - 1);
}

/* ===== src/42-shot.js ===== */
// 42-shot: a shot is a ray through the player's (swayed) aim point: the nearest of the animals (their zones), critters,
// trunks and stones, the ground and the water takes it. On an animal the zone that scores is the best one the round
// crossed; a doe in front of a buck takes the shot. Every shot is heard.
const ZONES = {
  heart: { dmg: 9, lethal: true, mult: () => T('heartMult'), call: 'HEART SHOT!', pri: 9, label: 'HEART' },
  head: { dmg: 9, lethal: true, mult: () => T('headMult'), call: 'HEADSHOT!', pri: 8, label: 'HEAD' },
  lung: { dmg: 9, lethal: true, mult: () => T('lungMult'), call: 'LUNG SHOT!', pri: 7, label: 'LUNG' },
  neck: { dmg: 9, lethal: true, mult: () => 1.4, call: 'NECK SHOT!', pri: 6, label: 'NECK' },
  shoulder: { dmg: 9, lethal: true, mult: () => 1.2, call: 'SHOULDER!', pri: 5, label: 'SHOULDER' },
  gut: { dmg: .6, lethal: false, mult: () => .7, call: 'GUT SHOT', pri: 4, label: 'GUT' },
  ham: { dmg: .5, lethal: false, mult: () => .6, call: 'HAM HIT', pri: 3, label: 'HAM' },
  leg: { dmg: .4, lethal: false, mult: () => .5, call: 'LEG HIT', pri: 2, label: 'LEG' },
  antler: { dmg: 0, lethal: false, mult: () => 0, call: 'ANTLER PING!', pri: 1, label: 'ANTLER' },
  body: { dmg: 9, lethal: true, mult: () => 1, pri: 5, label: 'BODY' }
};
/** the volumes of a zone list a ray crosses on one target: [{ id, t }] */
function rayZones(o, d, zones, pad = 0) {
  const out = [];
  // (legs are drawn at least a pixel or so wide however far off, so their zones never get thinner than that either)
  for (const z of zones) { const t = z.kind === 'sphere' ? raySphere(o, d, z.a, z.r + pad) : z.kind === 'ell' ? rayEllipsoid(o, d, z.c, z.ax, pad ? z.rad.map(r => r + pad) : z.rad) : rayCapsule(o, d, z.a, z.b, z.id === 'leg' ? Math.max(z.r + pad, pad * 1.9) : z.r + pad); if (t !== null) out.push({ id: z.id, t }); }
  return out;
}
const REGION_IDS = new Set(['shoulder', 'gut', 'ham']);
/** resolve a ray: { kind: 'animal' | 'critter' | 'prop' | 'ground' | 'water' | 'sky', actor, zone, t, point } */
function resolveRay(H, ray, o = {}) {
  const maxT = o.maxT || 2600 * M, R = { kind: 'sky', t: maxT };
  for (const a of H.actors) {
    if (!a.alive || a === o.skip) continue;
    const dx = a.x - ray.x, dy = a.y - ray.y, D = dx * H.lens.Fx + dy * H.lens.Fy; if (D < 0 || D > R.t + 64) continue;
    // a bounding sphere first
    const sz = (a.cat === 'animal' ? T('animalScale') : 1.15), rad = Math.max(a.rig.length || 8, a.rig.height || 8) * .75 * sz + 8, cz = a.z + (a.rig.height || 8) * .5 * sz;
    if (raySphere(ray, ray, [a.x, a.y, cz], rad) === null) continue;
    const hits = rayZones(ray, ray, a.zones(), .7 * Math.max(1, D) / H.lens.f); if (!hits.length) continue;   // (about a pixel of forgiveness round every part, at its distance)
    let tMin = Infinity, best = null; for (const h of hits) { tMin = Math.min(tMin, h.t); if (!best || (ZONES[h.id] || ZONES.body).pri > (ZONES[best.id] || ZONES.body).pri) best = h; }
    const zs = a.zones(); if (zs.region && REGION_IDS.has(best.id)) { let t0 = Infinity; for (const h of hits) if (REGION_IDS.has(h.id)) t0 = Math.min(t0, h.t); best = { id: zs.region([ray.x + ray.dx * t0, ray.y + ray.dy * t0, ray.z + ray.dz * t0]), t: t0 }; }   // the body by where the round went in
    if (tMin < R.t) Object.assign(R, { kind: a.cat, actor: a, zone: best.id, t: tMin, all: hits });
  }
  // trunks, stones, logs, buildings
  H.world.propsAlong(ray, ray, Math.min(R.t, 600 * M), p => { for (const v of p.occ) { const t = rayVolume(ray, ray, v); if (t !== null && t < R.t) { R.kind = 'prop'; R.t = t; R.prop = p; R.actor = null; R.zone = null; } } });
  for (const v of H.extraOcc || []) { const t = rayVolume(ray, ray, v); if (t !== null && t < R.t) { R.kind = 'prop'; R.t = t; R.prop = v.prop || null; R.actor = null; R.zone = null; } }
  // the ground, then the water's surface
  // (the renderer draws an animal over any ground beyond its root's distance less the item's bias, so hooves in the grass
  // and the far legs show; a shot through that same ground still takes the animal it shows)
  const A = R.actor && R.actor.cat === 'animal' ? R.actor : null, it = A && A._it, wades = !!(it && it.wade != null);
  const lim = A ? Math.min(R.t, (A.x - ray.x) * H.lens.Fx + (A.y - ray.y) * H.lens.Fy - (it && it.bias !== undefined ? it.bias : 10)) : R.t;
  const tg = H.world.hf.rayHit(ray, ray, R.t, false); if (tg !== null && tg < lim) { R.kind = 'ground'; R.t = tg; R.actor = null; R.zone = null; }
  const tw = H.world.hf.rayHit(ray, ray, R.t, true); if (tw !== null && tw < (R.actor && !wades ? lim : R.t - .5)) { R.kind = 'water'; R.t = tw; R.actor = null; R.zone = null; }
  R.point = [ray.x + ray.dx * R.t, ray.y + ray.dy * R.t, ray.z + ray.dz * R.t];
  R.dist = Math.hypot(R.point[0] - ray.x, R.point[1] - ray.y, R.point[2] - ray.z) / M;
  return R;
}
/** the shots fired this step, resolved together (two players on one animal in one step: the better zone takes it;
 *  equal zones share the kill) */
function resolveShots(H, shots) {
  const res = shots.map(s => Object.assign(resolveRay(H, s.ray), { shot: s }));
  const byActor = new Map();
  for (const r of res) if (r.actor) { const l = byActor.get(r.actor) || []; l.push(r); byActor.set(r.actor, l); }
  for (const [a, l] of byActor) if (l.length > 1) {
    l.sort((x, y) => (ZONES[y.zone] || ZONES.body).pri - (ZONES[x.zone] || ZONES.body).pri);
    const top = (ZONES[l[0].zone] || ZONES.body).pri, sharers = l.filter(r => (ZONES[r.zone] || ZONES.body).pri === top);
    if (sharers.length > 1) for (const r of sharers) r.shared = sharers.length;
    for (const r of l) if ((ZONES[r.zone] || ZONES.body).pri < top) r.overtaken = true;
  }
  for (const r of res) applyShot(H, r);
  return res;
}
function applyShot(H, R) {
  const s = R.shot, p = s.p, site = H.site, res = site && site.results[p.i];
  if (res) res.shots++;
  p.stats.shots++; Records.stat('shots', 1);
  bus.emit('shot', { p, R, ray: s.ray });
  // everyone hears it: loud at the shooter, a smaller noise where it lands; a near miss bolts an animal at once
  for (const a of H.actors) if (a.alive || a.state === 'hidden') {
    if (a === R.actor) continue;
    a.hear(s.ray.x, s.ray.y, 1, false);
    if (R.kind !== 'sky') { const dI = Math.hypot(R.point[0] - a.x, R.point[1] - a.y) / M; if (dI < 4) a.hear(R.point[0], R.point[1], 1, true); else if (dI < 40) a.hear(R.point[0], R.point[1], .6, false); }
  }
  if (R.overtaken) { bus.emit('miss', { p, R }); return; }
  const a = R.actor;
  if (!a) { bus.emit('impact', { p, R }); bus.emit('miss', { p, R }); H.lastMiss = R; return; }
  const Z = ZONES[R.zone] || ZONES.body;
  if (a.cat === 'critter') return critterHit(H, a, R, p, res);
  // an animal
  const wasRunning = a.running, wasVisibleAt = a.seenAt;
  const local = a.rig.toLocal ? a.rig.toLocal(R.point) : [0, 0, 0];
  a.hits.push({ local, zone: R.zone, pn: p.n, lethal: Z.lethal, t: site ? site.t : 0, w: [R.point[0] - a.x, R.point[1] - a.y, R.point[2] - a.z] });
  if (R.zone !== 'antler') { if (res) res.hits++; p.stats.hits++; Records.stat('hits', 1); } else if (res) res.pings++;
  const sharedDone = R.shared && a.state === 'dying' && a.killStep === H.time;   // the other half of a shared kill
  const out = sharedDone ? 'kill' : a.hit(R.zone, Z.dmg, p.n, R.point);
  if (out === 'kill' && !sharedDone) a.killStep = H.time;
  bus.emit('hit', { p, a, R, out });
  if (a.protected) {   // a doe, a fawn, a calf: benched (Classic) or a points penalty (Casual)
    if (out === 'ping') return;
    if (!a.penalized) { a.penalized = true; protectedPenalty(H, p, a, res); }
    return;
  }
  if (out === 'kill') {
    const kill = scoreKill(H, p, a, R, { running: wasRunning, quick: wasVisibleAt !== null && H.time - wasVisibleAt <= 1, shared: R.shared });
    if (res) { res.kills.push(kill); res.add(kill.points); res.longest = Math.max(res.longest, kill.dist); }
    p.addScore(kill.points);
    p.stats.bucks++; p.stats.longest = Math.max(p.stats.longest, kill.dist); Records.stat('bucks', 1); Records.stat('longest', kill.dist, true);
    bus.emit('kill', { p, a, R, kill });
  } else if (out === 'wound') bus.emit('wound', { p, a, R });
  else if (out === 'ping') bus.emit('ping', { p, a, R });
}
function protectedPenalty(H, p, a, res) {
  const casual = G.game.settings.doeRule === 'casual' || H.casualDoe;
  p.stats.does++; Records.stat('does', 1);
  if (H.godMode) { bus.emit('doe', { p, a, benched: false, points: 0 }); return; }
  if (casual) { if (res) { res.penalties.push({ label: a.label + ' SHOT', points: -300 }); res.add(-300); } p.addScore(-300); bus.emit('doe', { p, a, benched: false, points: -300 }); }
  else { p.benched = true; p.benchedAt = H.time; if (res) { res.benched = true; res.penalties.push({ label: a.label + ' SHOT: BENCHED', points: 0 }); } bus.emit('doe', { p, a, benched: true, points: 0 }); }
}
function critterHit(H, a, R, p, res) {
  const C = a.def;
  if (res) res.hits++; p.stats.hits++;
  if (C.protected) {
    if (a.penalized) return; a.penalized = true;
    const pts = H.godMode ? 0 : C.points; if (res) { res.penalties.push({ label: C.label.toUpperCase(), points: pts }); res.add(pts); } p.addScore(pts);
    if (C.effect === 'stink' && !H.godMode) { H.stink = Math.max(H.stink || 0, 3); }
    a.startle(0, true); if (a.def.behavior === 'graze') { a.beh = 'hop'; a.state = 'flee'; a.path = new APath([{ x: a.x, y: a.y }, { x: a.x + 40 * M, y: a.y - 20 * M }]); a.d = 0; }
    else if (a.bird) { a.state = 'flee'; a.flushed = true; a.beh = a.beh === 'swim' ? 'flush' : a.beh; if (!a.path) a.path = new APath([{ x: a.x, y: a.y }, { x: a.x + 60 * M, y: a.y - 80 * M }]); }
    else { a.die(p.n); }
    bus.emit('critter', { p, a, points: pts, protected: true });
    return;
  }
  a.die(p.n); a.vz = 0;
  const pts = Math.round(C.points * (R.dist > 60 ? 1.5 : 1));
  if (res) { res.critters.push({ id: a.kind, label: C.label, points: pts }); res.add(pts); } p.addScore(pts); Records.stat('critters', 1);
  bus.emit('critter', { p, a, points: pts, protected: false });
}

/* ===== src/43-score.js ===== */
// 43-score: what a kill is worth (the rack, the distance, the zone, running, the trophy, a quick draw, multi-kills),
// the site's bonuses (accuracy, a clean sweep, no penalties), stars, and the rank a hunt earns against its par.
function scoreKill(H, p, a, R, o = {}) {
  const Z = ZONES[R.zone] || ZONES.body, base = a.sp.base(a.points), dist = R.dist;
  const distMult = clamp(1 + (dist - 25) / T('distanceSlope'), 1, 3.5), zoneMult = Z.mult(), run = o.running ? T('runningMult') : 1, trophy = a.trophy ? 3 : 1;
  let pts = Math.round(base * distMult * zoneMult * run * trophy);
  const quick = o.quick ? 50 : 0;
  let multi = 0, multiN = 1;
  if (H.time - (p.lastKillT === undefined ? -9 : p.lastKillT) <= 1.5) { p.multiN = (p.multiN || 1) + 1; multiN = p.multiN; multi = multiN === 2 ? 250 : multiN >= 3 ? 750 : 0; } else p.multiN = 1;
  p.lastKillT = H.time;
  pts += quick + multi;
  if (o.shared) pts = Math.round(pts / o.shared);
  return { a, id: a.id, zone: R.zone, dist, base, distMult, zoneMult, running: !!o.running, trophy: !!a.trophy, quick, multi, multiN, shared: o.shared || 0, points: pts, label: a.label, rack: a.sp.rack(a.points), species: a.sp.id, shots: a.hits.filter(h => h.pn === p.n).length, lethal: Z.lethal };
}
/** the end of a site: each player's bonuses and stars */
function siteBonuses(site) {
  const bucks = site.bucksSpawned, all = bucks.length, escaped = bucks.filter(a => a.escaped || a.lost).length, out = [];
  for (const res of site.results) {
    const p = res.p, B = res.bonuses;
    // a wounded animal that got away costs its hunter
    for (const a of bucks) if (a.lost && a.hits.length && a.hits[0].pn === p.n) { res.penalties.push({ label: 'WOUNDED AND LOST', points: -100 }); res.add(-100); p.addScore(-100); }
    const acc = res.shots ? res.hits / res.shots : 0;
    if (res.shots >= 2 && acc >= .5) { const v = Math.round(acc * 1000); B.push({ label: 'ACCURACY ' + Math.round(acc * 100) + '%', points: v }); }
    const myKills = res.kills, clean = all > 0 && escaped === 0 && myKills.length > 0 && myKills.every(k => k.shots === 1 && k.lethal) && !res.penalties.length && (site.H.players.length > 1 || myKills.length === all);
    if (clean) B.push({ label: 'CLEAN SWEEP', points: 1000 });
    if (!res.penalties.length && res.shots > 0) B.push({ label: 'NO PENALTIES', points: 200 });
    for (const b of B) { res.add(b.points); p.addScore(b.points); }
    res.clean = clean;
    res.stars = !myKills.length ? 0 : (escaped === 0 && (site.H.players.length > 1 || myKills.length === all)) ? (clean && !res.penalties.length ? 3 : 2) : 1;
    out.push(res);
  }
  return out;
}
const RANKS = [[.4, 'GREENHORN'], [.6, 'TENDERFOOT'], [.8, 'WOODSMAN'], [1, 'SHARPSHOOTER'], [1.25, 'BIG GAME PRO'], [Infinity, 'LEGEND OF THE LODGE']];
function rankFor(score, par) { const f = score / Math.max(1, par); for (const [lim, name] of RANKS) if (f < lim) return name; return RANKS[RANKS.length - 1][1]; }

/* ===== src/50-players.js ===== */
// 50-players: up to four hunters on one screen: each a device, a seat colour and a reticle shape, a rifle, a scope and
// a call, a score; P1 is the keyboard and mouse (or a pad); the others join on their own pads.
class Player {
  constructor(n, input, o = {}) {
    this.n = n; this.i = n - 1; this.input = input; this.color = SEAT_COLORS[this.i]; this.shape = SHAPES[this.i]; this.name = o.name || SEAT_NAMES[this.i];
    this.rifle = new Rifle(this); this.scope = new Scope(this); this.call = new Call(this);
    this.score = 0; this.benched = false; this.rx = 240; this.ry = 140; this.vx = 0; this.vy = 0; this.ramp = 0; this.bot = null; this.device = 'keyboard';
    this.stats = { shots: 0, hits: 0, bucks: 0, does: 0, longest: 0, critters: 0 }; this.siteScores = []; this.kick = 0; this.bloom = 0; this.ghost = !!o.ghost;
  }
  get autoPump() { return this.forceAuto || G.game.settings.autoPump || (G.hunt && G.hunt.diff && G.hunt.diff.autoPump); }
  addScore(v) { this.score = Math.max(0, this.score + v); }
  resetSite(o = {}) { this.rifle.setup(o); this.call.reset(); this.benched = false; this.scope.on = false; this.scope.raise = 0; this.scope.breath = T('breath'); this.scope.shaky = 0; this.multiN = 1; this.lastKillT = -9; }
  /** this step's input: fire (a shot request), pump, scope, breath, call */
  update(dt, H) {
    const I = this.input;
    this.rifle.update(dt); this.call.update(dt); if (this.kick > 0) this.kick = Math.max(0, this.kick - dt * 4); if (this.bloom > 0) this.bloom = Math.max(0, this.bloom - dt * 5);
    if (this.bot) { this.bot.update(dt, this, H); return; }
    if (G.ui.screen || H.inputBlocked) { this.scope.update(dt, false, false); return; }
    aimUpdate(this, dt, H);
    const tog = G.game.settings.scopeMode === 'toggle';
    if (tog) { if (I.pressed('scope')) this.scope.toggle = !this.scope.toggle; } else this.scope.toggle = I.down('scope');
    this.scope.update(dt, this.scope.toggle && !this.benched && H.canScope !== false, I.down('breath'));
    if (I.pressed('pump')) this.rifle.pump();
    if (I.pressed('call') && H.canCall !== false) H.useCall(this);
    if (I.pressed('fire')) H.trigger(this);
  }
  /** where the round goes: the reticle, plus the scope's sway */
  aimPoint() { const s = this.scope.raise > .05 ? this.scope.sway() : [0, 0]; return [this.rx + s[0], this.ry + s[1]]; }
}

/* ===== src/51-hud.js ===== */
// 51-hud: big, sparse and readable at ten feet: the site and its clock, the bucks to come, each hunter's panel (score,
// shells, the chamber light, calls), banners, score pops over the animals, captions, prompts in the last device's
// glyphs, the rival to beat, the standings, and the reticles.
const HUD = {
  banners: [], pops: [], cap: null, tips: [], shown: {},
  reset() { this.banners.length = 0; this.pops.length = 0; this.cap = null; this.tips.length = 0; },
  banner(text, o = {}) { if (this.banners.length && this.banners[this.banners.length - 1].text === text) return; this.banners.push({ text, t: 0, dur: o.dur || .95, color: o.color, scale: o.scale || 3, sub: o.sub, colors: o.colors }); if (this.banners.length > 3) this.banners.shift(); if (G.sfx) G.sfx.play('whoosh'); },
  pop(x, y, z, text, color, o = {}) { this.pops.push({ x, y, z, text, color: color || '#fff', t: 0, dur: o.dur || 1.6, sub: o.sub }); if (this.pops.length > 12) this.pops.shift(); },
  caption(name, text, color, dur) { this.cap = { name, text, color: color || '#ffd04a', t: 0, dur: dur || Math.max(2, text.length * .07) }; },
  /** a contextual prompt, shown a limited number of times a hunt */
  tip(key, action, text, o = {}) { const n = this.shown[key] || 0; if (n >= (o.times || 3)) return false; if (this.tips.some(t => t.key === key)) return false; this.shown[key] = n + 1; this.tips.push({ key, action, text, t: 0, dur: o.dur || 2.6, p: o.p }); return true; },
  update(dt) {
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < p.dur);
    if (this.cap) { this.cap.t += dt; if (this.cap.t > this.cap.dur) this.cap = null; }
    for (const t of this.tips) t.t += dt; this.tips = this.tips.filter(t => t.t < t.dur);
  },
  draw(g, H, W, Ht) {
    const site = H.site, big = G.game.settings.bigCaptions, P = H.players;
    // top centre: the site, the clock, the bucks
    if (site && H.seg && (H.seg.kind === 'site' || H.seg.kind === 'trophy') && !H.cinema) {
      const left = Math.max(0, site.limit - site.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60), clock = mm + ':' + String(ss).padStart(2, '0');
      E.font.text(g, site.def.name.toUpperCase(), W / 2, 6, '#f4ead8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, clock, W / 2, 15, left < 10 && Math.floor(G.game.real * 4) % 2 ? '#ff6a4a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      const n = Math.max(site.def.bucks || 0, site.bucksSpawned.length), x0 = W / 2 - n * 8;
      for (let i = 0; i < n; i++) { const a = site.bucksSpawned[i]; drawRackIcon(g, x0 + i * 16 + 8, 40, a ? (a.state === 'dead' || a.state === 'dying' ? 'bagged' : a.escaped || a.lost ? 'gone' : a.state === 'hidden' ? 'ahead' : 'live') : 'ahead', a && a.bagger ? SEAT_COLORS[a.bagger - 1] : null, a && a.trophy); }
    }
    // the players' panels
    const corners = [[8, Ht - 8, 'bl'], [W - 8, Ht - 8, 'br'], [8, 8, 'tl'], [W - 8, 8, 'tr']];
    P.forEach((p, i) => { if (!H.cinema && !p.ghost) drawPanel(g, p, ...corners[i], H, P.length); });
    // the rival to beat (the Hunt-Off campaign)
    if (H.rival && G.game.settings.rivalTag && !H.cinema && P.length === 1) { const rv = H.rival; E.ui.box(g, 8, 8, 92, 22, { bg: ['#2a1a10', '#1a100a'], border: '#a8742a', alpha: .85 }); E.font.text(g, rv.name, 14, 11, CAST[rv.id].color, { outline: false, shadow: '#000' }); E.font.text(g, fmt(rv.score), 14, 19, '#ffffff', { outline: false, shadow: '#000' }); E.font.text(g, 'TO BEAT', 94, 19, '#b8a488', { align: 'right', outline: false }); }
    // score pops over the animals
    const q = [0, 0, 0, 0];
    for (const p of this.pops) { if (!H.lens.project(p.x, p.y, p.z, q)) continue; const k = p.t / p.dur, y = q[1] - 18 - k * 16, a = k < .8 ? 1 : (1 - k) / .2; if (a > .2) { E.font.text(g, p.text, q[0], y, p.color, { align: 'center', shadow: '#000', outline: '#140c08' }); if (p.sub) E.font.text(g, p.sub, q[0], y + 9, '#f4ead8', { align: 'center', outline: '#140c08' }); } }
    // banners
    let by = Ht * .32;
    for (const b of this.banners) {
      const k = b.t / b.dur, s = b.scale + (k < .12 ? (1 - k / .12) * 1.5 : 0), x = W / 2 + (k > .85 ? (k - .85) * 900 : 0);
      E.font.title(g, b.text, x, by, { scale: Math.round(s), colors: b.colors || ['#fff6d8', b.color || '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      if (b.sub) E.font.text(g, b.sub, x, by + s * 9 + 4, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
      by += s * 9 + (b.sub ? 18 : 10);
    }
    // captions: lower centre, the speaker's name and colour
    if (this.cap) {
      const c = this.cap, sc = big ? 2 : 1, lines = E.font.wrap(c.text, Math.min(W - 40, 360), { scale: sc }), h = lines.length * 9 * sc + 14, y = Ht - 46 - h;
      E.ui.box(g, W / 2 - Math.min(W - 40, 380) / 2, y, Math.min(W - 40, 380), h, { bg: ['#1a120a', '#0e0a06'], border: '#5a4430', alpha: .82 });
      E.font.text(g, c.name, W / 2, y + 3, c.color, { align: 'center', outline: false, shadow: '#000' });
      lines.forEach((l, i) => E.font.text(g, l, W / 2, y + 12 + i * 9 * sc, '#f4ead8', { align: 'center', scale: sc, outline: false }));
    }
    // prompts
    let ty = Ht - 34 - (this.cap ? 50 : 0);
    for (const t of this.tips) { const I = (t.p || P[0] || { input: G.game.input }).input, a = t.t < .2 ? t.t / .2 : 1; if (a > .3) Glyph.cue(g, t.action, t.text, W / 2, ty, I, { scale: 1 }); ty -= 16; }
    // standings (held)
    if (H.showBoard) drawStandings(g, H, W, Ht);
  }
};
function drawRackIcon(g, x, y, state, color, trophy) {
  const c = state === 'bagged' ? (color || '#ffd04a') : state === 'gone' ? '#5a4a40' : trophy ? '#ffd04a' : '#e8dcc0';
  const line = (a, b, cc) => px.line(g, x + a[0], y + a[1], x + b[0], y + b[1], cc);
  const draw = cc => { line([0, 4], [0, 1], cc); line([0, 1], [-5, -4], cc); line([0, 1], [5, -4], cc); line([-3, -1], [-3, -5], cc); line([3, -1], [3, -5], cc); line([-5, -4], [-6, -7], cc); line([5, -4], [6, -7], cc); };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.save(); g.translate(dx, dy); draw('#140c08'); g.restore(); }
  draw(c);
  if (state === 'ahead') { px.dot(g, x, y + 2, '#140c08'); }
  if (state === 'gone') { px.line(g, x - 6, y - 6, x + 6, y + 5, '#e8443a'); px.line(g, x + 6, y - 6, x - 6, y + 5, '#e8443a'); }
  if (state === 'live' && Math.floor(G.game.real * 3) % 2) px.dot(g, x, y + 6, '#ffffff');
}
function drawShell(g, x, y, full, ch) { px.rect(g, x, y, 4, 9, '#140c08'); if (full) { px.rect(g, x + 1, y + 1, 2, 5, ch ? '#e84a2a' : '#c83a22'); px.rect(g, x + 1, y + 6, 2, 2, '#e8c050'); px.dot(g, x + 1, y + 1, '#ff8a6a'); } else px.rect(g, x + 1, y + 1, 2, 7, '#3a2a22'); }
function drawPanel(g, p, ax, ay, corner, H, nP) {
  const W = 118, Hh = 34, x = corner.endsWith('l') ? ax : ax - W, y = corner.startsWith('b') ? ay - Hh : ay + (H.rival && corner === 'tl' ? 26 : 0);
  if (G.game.cornerArea && corner === 'tr') { const ca = G.game.cornerArea(); if (ca) return; }
  E.ui.box(g, x, y, W, Hh, { bg: ['#2a1c10', '#160e08'], border: p.benched ? '#6a6a6a' : p.color, alpha: .82 });
  drawReticleShape(g, x + 9, y + 9, p.shape, p.benched ? '#8a8a8a' : p.color, 4);
  E.font.text(g, fmt(p.score), x + 18, y + 4, '#ffffff', { scale: 2, shadow: '#000', outline: false });
  // the tube: a shell for each round, the chamber light
  const R = p.rifle;
  for (let i = 0; i < R.cap; i++) drawShell(g, x + 6 + i * 6, y + 21, R.reloadT > 0 ? i < R.shells : i < R.rounds, i === 0 && R.chambered);
  const lc = R.reloadT > 0 ? '#ffb030' : R.rackT > 0 ? '#ffe060' : R.chambered ? '#4ae060' : '#e8443a';
  px.disc(g, x + 10 + R.cap * 6, y + 25, 2.5, '#140c08'); px.disc(g, x + 10 + R.cap * 6, y + 25, 1.5, lc);
  // the calls: a horn each
  for (let i = 0; i < p.call.charges; i++) { const cx = x + W - 10 - i * 9, cy = y + 25; px.line(g, cx - 3, cy + 1, cx + 3, cy - 2, '#140c08', 3); px.line(g, cx - 3, cy + 1, cx + 3, cy - 2, p.call.cd > 0 ? '#7a6a50' : '#e8c890', 1); px.dot(g, cx + 3, cy - 3, '#e8c890'); }
  if (p.benched) { E.font.text(g, 'BENCHED', x + W / 2, y - 9, '#c8c8c8', { align: 'center', shadow: '#000' }); }
  if (p.scope.raise > .3) { const b = p.scope.breath / T('breath'); E.ui.bar(g, x + 52, y + 22, 40, 3, b, p.scope.shaky > 0 ? '#e8443a' : p.scope.holding ? '#7ad0ff' : '#c8e8f0'); }
  if (nP > 1 || p.name !== 'P1') E.font.text(g, p.name, x + W - 4, y + 4, p.color, { align: 'right', outline: false, shadow: '#000' });
}
function drawReticleShape(g, x, y, shape, c, r = 7, o = {}) {
  const dk = '#140c08', w = o.w || 1;
  const strokes = cc => {
    if (shape === 'circle') { for (let a = 0; a < 24; a++) { const t = a / 24 * TAU; if (Math.abs(Math.sin(t * 2)) < .3) continue; px.dot(g, x + Math.cos(t) * r, y + Math.sin(t) * r, cc); } px.line(g, x - r - 3, y, x - r + 2, y, cc, w); px.line(g, x + r - 2, y, x + r + 3, y, cc, w); px.line(g, x, y - r - 3, x, y - r + 2, cc, w); px.line(g, x, y + r - 2, x, y + r + 3, cc, w); }
    else if (shape === 'diamond') { px.line(g, x, y - r, x + r, y, cc, w); px.line(g, x + r, y, x, y + r, cc, w); px.line(g, x, y + r, x - r, y, cc, w); px.line(g, x - r, y, x, y - r, cc, w); }
    else if (shape === 'brackets') { const k = Math.max(2, r * .45); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, x + sx * r, y + sy * r, x + sx * (r - k), y + sy * r, cc, w); px.line(g, x + sx * r, y + sy * r, x + sx * r, y + sy * (r - k), cc, w); } }
    else { px.line(g, x, y - r, x + r, y + r * .7, cc, w); px.line(g, x + r, y + r * .7, x - r, y + r * .7, cc, w); px.line(g, x - r, y + r * .7, x, y - r, cc, w); }
  };
  if (!o.noOutline) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.save(); g.translate(dx, dy); strokes(dk); g.restore(); }
  strokes(c); px.dot(g, x, y, c);
}
function drawStandings(g, H, W, Ht) {
  const list = H.players.map(p => ({ name: p.name, score: p.score, color: p.color })).concat((H.ghostList || []).map(gh => ({ name: gh.name, score: gh.score, color: gh.color })));
  if (H.rivalBoard) for (const r of H.rivalBoard) list.push(r);
  list.sort((a, b) => b.score - a.score);
  const w = 200, h = 26 + list.length * 14, x = W / 2 - w / 2, y = Ht / 2 - h / 2;
  E.ui.box(g, x, y, w, h, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .92 });
  E.font.text(g, 'STANDINGS', W / 2, y + 6, '#ffd04a', { align: 'center', shadow: '#000' });
  list.forEach((r, i) => { E.font.text(g, (i + 1) + '. ' + r.name, x + 12, y + 20 + i * 14, r.color, { outline: false, shadow: '#000' }); E.font.text(g, fmt(r.score), x + w - 12, y + 20 + i * 14, '#ffffff', { align: 'right', outline: false }); });
}

/* ===== src/52-glyphs.js ===== */
// 52-glyphs: on-screen prompts follow the device a player used last: PlayStation shapes for a controller (Xbox letters
// with the setting), keycaps for the keyboard, a mouse with its button lit once the mouse has been used.
const PAD_PS = { Pad0: ['cross', '#6aa8ff'], Pad1: ['circle', '#ff5a6a'], Pad2: ['square', '#ff8ad8'], Pad3: ['triangle', '#4ae0a8'], Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad8: ['CREATE'], Pad9: ['OPTIONS'], Pad10: ['L3'], Pad11: ['R3'], Pad12: ['up'], Pad13: ['down'], Pad14: ['left'], Pad15: ['right'] };
const PAD_XB = { Pad0: ['A', '#5ac04a'], Pad1: ['B', '#e84a3a'], Pad2: ['X', '#3a8ae8'], Pad3: ['Y', '#e8c03a'], Pad4: ['LB'], Pad5: ['RB'], Pad6: ['LT'], Pad7: ['RT'], Pad8: ['VIEW'], Pad9: ['MENU'], Pad10: ['LS'], Pad11: ['RS'], Pad12: ['up'], Pad13: ['down'], Pad14: ['left'], Pad15: ['right'] };
const KEYNAME = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', NumpadEnter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ControlLeft: 'CTRL' };
const Glyph = {
  mouseUsed: false,
  /** the family a player's prompts use now: 'ps' | 'xbox' | 'keys' */
  family(I) { I = I || G.game.input; if (I.lastDevice === 'gamepad') { const s = G.game.settings.glyphs; return s === 'xbox' || (s === 'auto' && I.padStyle && I.padStyle() === 'xbox') ? 'xbox' : 'ps'; } return 'keys'; },
  /** the code an action shows on that family (after rebinding) */
  code(action, I) {
    I = I || G.game.input; const fam = this.family(I), codes = (I.map[action] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (fam !== 'keys') return codes.find(c => /^Pad\d+$/.test(c)) || null;
    if (this.mouseUsed || I.lastDevice === 'mouse') { const m = codes.find(c => /^Mouse/.test(c)); if (m) return m; }
    return codes.find(c => !/^Pad|^Mouse/.test(c)) || codes.find(c => /^Mouse/.test(c)) || null;
  },
  /** plain words for a code (captions, the hub's howto) */
  word(action, I) { const c = this.code(action, I), fam = this.family(I); if (!c) return '?'; if (/^Pad/.test(c)) { const t = (fam === 'xbox' ? PAD_XB : PAD_PS)[c]; return t ? t[0].toUpperCase() : c; } if (c === 'Mouse0') return 'LEFT CLICK'; if (c === 'Mouse2') return 'RIGHT CLICK'; if (c === 'Mouse1') return 'WHEEL'; return KEYNAME[c] || c.replace(/^Key|^Digit/, ''); },
  /** draw an action's glyph with its left edge at x, centred on y; returns its width */
  draw(g, action, x, y, I, o = {}) { const c = this.code(action, I); return this.drawCode(g, c, x, y, this.family(I), o); },
  drawCode(g, c, x, y, fam, o = {}) {
    const s = o.scale || 1, r = Math.round(6 * s);
    if (!c) { E.font.text(g, '?', x, y - 4 * s, '#fff', { scale: s }); return 6 * s; }
    if (/^Pad\d+$/.test(c)) {
      const T2 = (fam === 'xbox' ? PAD_XB : PAD_PS)[c] || [c];
      const name = T2[0], col = T2[1];
      if (['cross', 'circle', 'square', 'triangle'].includes(name)) {
        px.disc(g, x + r, y, r, '#14101c'); px.disc(g, x + r, y, r - 1, '#2a2438');
        const k = r * .5;
        if (name === 'cross') { px.line(g, x + r - k, y - k, x + r + k, y + k, col, Math.max(1, s)); px.line(g, x + r + k, y - k, x + r - k, y + k, col, Math.max(1, s)); }
        else if (name === 'circle') { px.disc(g, x + r, y, k + .5, col); px.disc(g, x + r, y, Math.max(0, k - 1), '#2a2438'); }
        else if (name === 'square') { px.rect(g, x + r - k, y - k, k * 2, 1, col); px.rect(g, x + r - k, y + k, k * 2, 1, col); px.rect(g, x + r - k, y - k, 1, k * 2, col); px.rect(g, x + r + k - 1, y - k, 1, k * 2 + 1, col); }
        else { px.line(g, x + r, y - k, x + r + k, y + k * .8, col); px.line(g, x + r + k, y + k * .8, x + r - k, y + k * .8, col); px.line(g, x + r - k, y + k * .8, x + r, y - k, col); }
        return r * 2 + 1;
      }
      if (fam === 'xbox' && col) { px.disc(g, x + r, y, r, '#14101c'); px.disc(g, x + r, y, r - 1, col); E.font.text(g, name, x + r, y - 3 * s, '#ffffff', { align: 'center', scale: s, outline: false, shadow: '#0008' }); return r * 2 + 1; }
      if (['up', 'down', 'left', 'right'].includes(name)) { const w = r * 2; px.rect(g, x, y - r, w, w, '#14101c'); px.rect(g, x + w / 2 - 2 * s, y - r + 1, 4 * s, w - 2, '#4a4458'); px.rect(g, x + 1, y - 2 * s, w - 2, 4 * s, '#4a4458'); const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[name]; px.rect(g, x + w / 2 - 1 + d[0] * r * .55, y - 1 + d[1] * r * .55, 3, 3, '#ffffff'); return w + 1; }
      // triggers, bumpers, sticks, the small buttons: a tab with its name
      const w = E.font.width(name, { scale: s }) + 6 * s, tall = /2|T$/.test(name);
      px.rect(g, x, y - r + (tall ? 0 : 1), w, r * 2 - (tall ? 0 : 2), '#14101c'); px.rect(g, x + 1, y - r + 1 + (tall ? 0 : 1), w - 2, r * 2 - 2 - (tall ? 0 : 2), '#3a3448');
      if (tall) px.rect(g, x + 1, y - r + 1, w - 2, 2, '#5a5468');
      E.font.text(g, name, x + 3 * s, y - 3 * s, '#ffffff', { scale: s, outline: false }); return w + 1;
    }
    if (/^Mouse/.test(c)) {   // a mouse: its body, the button pressed lit
      const w = 9 * s, h = 13 * s, x0 = x, y0 = y - h / 2;
      px.rect(g, x0 + 1, y0, w - 2, h, '#14101c'); px.rect(g, x0, y0 + 1, w, h - 2, '#14101c'); px.rect(g, x0 + 1, y0 + 1, w - 2, h - 2, '#e8e4ec');
      px.rect(g, x0 + w / 2, y0 + 1, 1, h * .42, '#14101c'); px.rect(g, x0 + 1, y0 + h * .42, w - 2, 1, '#14101c');
      const lit = c === 'Mouse0' ? [x0 + 1, y0 + 1] : c === 'Mouse2' ? [x0 + w / 2 + 1, y0 + 1] : null;
      if (lit) px.rect(g, lit[0], lit[1], w / 2 - 1, h * .42 - 1, '#ff8a3a'); else px.rect(g, x0 + w / 2 - 1, y0 + 2, 3, h * .3, '#ff8a3a');
      return w + 2;
    }
    const label = KEYNAME[c] || c.replace(/^Key|^Digit/, ''), w = Math.max(12 * s, E.font.width(label, { scale: s }) + 7 * s);
    px.rect(g, x, y - r, w, r * 2, '#14101c'); px.rect(g, x + 1, y - r + 1, w - 2, r * 2 - 3, '#e8e2d4'); px.rect(g, x + 1, y + r - 2, w - 2, 1, '#9a9488');
    E.font.text(g, label, x + w / 2, y - 3 * s - 1, '#2a2430', { align: 'center', scale: s, outline: false });
    return w + 1;
  },
  /** a prompt: glyph + text, centred at x (returns its width) */
  cue(g, action, text, x, y, I, o = {}) {
    const s = o.scale || 1, tw = E.font.width(text, { scale: s }), gw = this.measure(action, I, s), w = gw + 4 + tw, x0 = Math.round(x - (o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2));
    this.draw(g, action, x0, y, I, { scale: s });
    E.font.text(g, text, x0 + gw + 4, y - 3 * s, o.color || '#ffffff', { scale: s, shadow: '#000', outline: false });
    return w;
  },
  measure(action, I, s = 1) { if (!HAS_DOM) return 12; const c = this.code(action, I), fam = this.family(I); if (!c) return 6 * s; if (/^Pad\d+$/.test(c)) { const T2 = (fam === 'xbox' ? PAD_XB : PAD_PS)[c] || [c]; if (['cross', 'circle', 'square', 'triangle', 'up', 'down', 'left', 'right'].includes(T2[0]) || (fam === 'xbox' && T2[1])) return 13 * s; return E.font.width(T2[0], { scale: s }) + 7 * s; } if (/^Mouse/.test(c)) return 11 * s; const label = KEYNAME[c] || c.replace(/^Key|^Digit/, ''); return Math.max(12 * s, E.font.width(label, { scale: s }) + 7 * s) + 1; }
};
// moving the mouse is using it: prompts (and P1's aim) follow it, as the engine's buttons do
if (HAS_DOM) addEventListener('mousemove', e => { if ((e.movementX || e.movementY) && !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) { Glyph.mouseUsed = true; if (G.game.input.lastDevice !== 'mouse') G.game.input.lastDevice = 'mouse'; } }, { passive: true });

/* ===== src/53-ui.js ===== */
// 53-ui: the 10-foot interface: big cards in a list or a grid; the d-pad, a stick, the arrows or WASD move the focus, the
// mouse moves it by hovering, a click or confirm picks, cancel goes back; a prompt bar names confirm and back in the
// glyphs of the device used last. Every player's pad can drive it.
const UISND = { focus: () => G.sfx && G.sfx.play('focus'), pick: () => G.sfx && G.sfx.play('confirm'), back: () => G.sfx && G.sfx.play('back') };
function uiInputs() { return (G.game.players && G.game.players.length ? G.game.players : [G.game.input]); }
function uiPressed(a) { return uiInputs().some(I => I.pressed(a)); }
function uiRepeat(a) { return uiInputs().some(I => I.repeat(a, .32, .1)); }
class UIList {
  constructor(o) { Object.assign(this, { items: [], i: 0, x: 'center', y: 60, w: 260, h: 30, gap: 6, cols: 1, title: '', sub: '', t: 0, rects: [], onPick: null, onBack: null, onFocus: null }, o); this.i = Math.min(this.i, Math.max(0, this.items.length - 1)); this._mouse = null; }
  get focused() { return this.items[this.i]; }
  update(dt) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    const I = G.game.input, move = d => { let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled) break; } if (j !== this.i) { this.i = j; UISND.focus(); if (this.onFocus) this.onFocus(this.focused); } };
    if (uiRepeat('up')) move(-this.cols); if (uiRepeat('down')) move(this.cols);
    if (this.cols > 1) { if (uiRepeat('left')) move(-1); if (uiRepeat('right')) move(1); }
    else if (this.focused && this.focused.choices) { if (uiRepeat('left')) this.turn(-1); if (uiRepeat('right')) this.turn(1); }
    // the mouse: hovering moves the focus, a click picks
    const m = I.pointer && I.pointer();
    if (m && (!this._mouse || Math.abs(m[0] - this._mouse[0]) + Math.abs(m[1] - this._mouse[1]) > 1)) { this._mouse = m.slice(); const j = this.rects.findIndex(r => r && m[0] >= r[0] && m[0] < r[0] + r[2] && m[1] >= r[1] && m[1] < r[1] + r[3]); if (j >= 0 && j !== this.i && !this.items[j].disabled) { this.i = j; UISND.focus(); if (this.onFocus) this.onFocus(this.focused); } }
    const c = I.clicked && I.clicked();
    if (c && this.t > .25) { const j = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (j >= 0 && !this.items[j].disabled) { this.i = j; return this.pick(c); } if (this.backRect && c[0] >= this.backRect[0] && c[0] < this.backRect[0] + this.backRect[2] && c[1] >= this.backRect[1] && c[1] < this.backRect[1] + this.backRect[3]) return this.back(); }
    if (this.t > .2 && uiPressed('confirm')) return this.pick();
    if (this.t > .2 && uiPressed('cancel')) return this.back();
    return null;
  }
  turn(d) { const it = this.focused, ch = it.choices; if (!ch) return; it.ci = ((it.ci || 0) + d + ch.length) % ch.length; UISND.focus(); if (it.onTurn) it.onTurn(ch[it.ci], it.ci); }
  pick(at) { const it = this.focused; if (!it || it.disabled) return null; if (it.choices && at && this.rects[this.i]) { const r = this.rects[this.i]; this.turn(at[0] < r[0] + r[2] / 2 ? -1 : 1); return null; } if (it.choices && !it.act) { this.turn(1); return null; } UISND.pick(); if (it.act) it.act(it); if (this.onPick) this.onPick(it, this.i); return it; }
  back() { UISND.back(); if (this.onBack) this.onBack(); return 'back'; }
  draw(g, W, Ht) {
    const n = this.items.length, cols = this.cols, rows = Math.ceil(n / cols), cw = this.w, ch = this.h, gap = this.gap;
    const tw = cols * cw + (cols - 1) * gap, x0 = this.x === 'center' ? Math.round(W / 2 - tw / 2) : this.x, y0 = this.y === 'center' ? Math.round(Ht / 2 - (rows * (ch + gap)) / 2) : this.y;
    if (this.title) E.font.title(g, this.title, W / 2, y0 - 34, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10', align: 'center' });
    if (this.sub) E.font.text(g, this.sub, W / 2, y0 - 12, '#d8c8a8', { align: 'center', outline: false, shadow: '#000' });
    this.rects.length = 0;
    this.items.forEach((it, j) => {
      const cx = x0 + (j % cols) * (cw + gap), cy = y0 + Math.floor(j / cols) * (ch + gap), on = j === this.i, pulse = on ? Math.sin(this.t * 6) * .5 + .5 : 0;
      this.rects.push([cx, cy, cw, ch]);
      drawCard(g, cx + (on ? -2 : 0), cy, cw + (on ? 4 : 0), ch, on, pulse, it.disabled);
      let tx = cx + 12; if (it.icon) { it.icon(g, cx + 8, cy + ch / 2, ch - 8, on); tx = cx + ch + 6; }
      const lbl = it.choices ? it.label + ':' : it.label, room = cx + cw - 8 - tx - (it.right ? E.font.width(it.right) + 8 : 0), sc = ch >= 28 && E.font.width(lbl, { scale: 2 }) <= room ? 2 : 1;   // (a label too long for its card drops a size rather than run off it)
      E.font.text(g, lbl, tx, cy + (it.sub ? (sc === 2 ? 3 : 5) : ch / 2 - 3.5 * sc), it.disabled ? '#7a6a58' : on ? '#ffffff' : '#f0e0c8', { scale: sc, shadow: '#1a0c08', outline: false });
      if (it.choices) { const v = it.choices[it.ci || 0], vx = cx + cw - 14; E.font.text(g, '‹ ' + v + ' ›', vx, cy + ch / 2 - 3.5 * sc, on ? '#ffd040' : '#d8c8a8', { align: 'right', scale: sc, outline: false, shadow: '#1a0c08' }); }
      if (it.sub) E.font.text(g, it.sub, tx, cy + ch - 10, on ? '#ffe0b0' : '#b8a488', { outline: false });
      if (it.right) E.font.text(g, it.right, cx + cw - 10, cy + 6, '#ffd040', { align: 'right', outline: false });
      if (on) { const ax = cx - 10 - Math.round(pulse * 2); px.poly(g, [[ax, cy + ch / 2 - 5], [ax + 6, cy + ch / 2], [ax, cy + ch / 2 + 5]], '#ff8a3a'); }
    });
  }
}
function drawCard(g, x, y, w, h, on, pulse, dis) {
  const wood = E.tones(dis ? '#3a2e24' : on ? '#7a4a24' : '#4a3020');
  px.rect(g, x + 2, y + 3, w, h, '#0a0604');
  px.rect(g, x, y, w, h, on ? '#ffa040' : '#a8742a'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#1a0e06');
  px.rect(g, x + 2, y + 2, w - 4, h - 4, wood.base); px.rect(g, x + 2, y + 2, w - 4, 2, wood.lt); px.rect(g, x + 2, y + h - 4, w - 4, 2, wood.sh);
  for (let yy = y + 7; yy < y + h - 5; yy += 6) px.rect(g, x + 4, yy, w - 8, 1, wood.sh);
  for (const [bx, by] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) { px.rect(g, bx, by, 2, 2, '#e8c070'); px.dot(g, bx, by, '#fff0c0'); }
  if (on) { px.rect(g, x - 1, y - 1, w + 2, 1, pulse > .5 ? '#ffe0a0' : '#ff8a3a'); px.rect(g, x - 1, y + h, w + 2, 1, '#ff8a3a'); px.rect(g, x - 1, y, 1, h, '#ff8a3a'); px.rect(g, x + w, y, 1, h, '#ff8a3a'); }
}
/** the prompt bar: confirm and back, in the glyphs of the device used last */
function promptBar(g, W, Ht, pairs) {
  let x = W / 2 - pairs.reduce((s, [a, t]) => s + Glyph.measure(a, G.game.input) + 8 + E.font.width(t) + 18, 0) / 2;
  const y = Ht - 14;
  px.blend(g, .5, 'normal', () => px.rect(g, 0, Ht - 26, W, 26, '#0a0604'));
  for (const [a, t] of pairs) x += Glyph.cue(g, a, t, x, y, G.game.input, { align: 'left' }) + 18;
}

/* ===== src/60-tally.js ===== */
// 60-tally: after each site, one beat at a time over the dimmed frozen view: SITE CLEAR or TIME!; a card for each animal
// bagged, its x-ray Shot Chart (where every round went, labelled), distance, rack and its points counted up; then the
// critters, penalties and bonuses, the stars, and the standings (party columns, or the rivals in the campaign).
function dim(g, W, Ht, a = .55) { px.blend(g, a, 'multiply', () => px.rect(g, 0, 0, W, Ht, '#3a2a1e')); }
function drawStars(g, x, y, n, of = 3, t = 99) {
  for (let i = 0; i < of; i++) { const on = i < n && t > i * .25, cx = x + i * 22, s = on ? 1 + Math.max(0, .4 - (t - i * .25)) : 1; drawRackIcon(g, cx, y, on ? 'bagged' : 'gone', on ? '#ffd040' : '#5a4a3a'); if (on && s > 1.05) px.ddisc(g, cx, y, 12, '#ffe080', .4); }
}
SEG.tally = (H, o) => {
  const site = o.trophy ? H.trophySite : H.lastSite, pages = [], auto = H.mode === 'attract' || H.hubMode || o.auto;
  if (site) {
    pages.push({ kind: 'head' });
    const kills = []; for (const res of site.results) for (const k of res.kills) kills.push({ k, p: res.p });
    kills.sort((a, b) => b.k.points - a.k.points);
    for (const kk of kills.slice(0, H.mode === 'attract' ? 2 : 6)) pages.push({ kind: 'kill', k: kk.k, p: kk.p });
    pages.push({ kind: 'sum' });
    if (H.mode === 'campaign' && H.players.length === 1 && !o.trophy) pages.push({ kind: 'rivals' });
  }
  let i = 0, t = 0, count = 0, ticked = 0;
  return { block: true, canShoot: false, showReticles: false, actorsLive: false, cinema: true, noForeground: false,
    enter() { if (G.sfx) G.sfx.music('results', { fade: .8 }); if (!pages.length) i = 99; },
    update(dt) {
      if (i >= pages.length) return true;
      t += dt; const pg = pages[i];
      if (pg.kind === 'kill') { const tgt = pg.k.points; const prev = count; count = Math.min(tgt, count + Math.max(1, tgt * dt * 1.4)); if (Math.floor(count / 50) > ticked) { ticked = Math.floor(count / 50); if (G.sfx) G.sfx.play('tick'); } if (prev < tgt && count >= tgt && G.sfx) G.sfx.play('confirm'); }
      const ready = t > .6, adv = ready && (anyConfirm(H) || (auto && t > (pg.kind === 'kill' ? 2.6 : 2)) || t > 12);
      if (adv) { if (pg.kind === 'kill' && count < pg.k.points) { count = pg.k.points; t = .3; } else { i++; t = 0; count = 0; ticked = 0; if (i < pages.length && pages[i].kind === 'sum' && G.sfx) G.sfx.play('whoosh'); } }
      return i >= pages.length;
    },
    skip() { i = pages.length; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .6);
      const pg = pages[i]; if (!pg || !site) return;
      const bw = Math.min(W - 40, 340), bh = 196, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2 - 6;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#160e08'], border: '#c8843a' });
      const name = (site.def.name || '').toUpperCase(), reason = site.endReason === 'clear' ? 'SITE CLEAR' : site.endReason === 'benched' ? 'BENCHED' : 'TIME!';
      if (pg.kind === 'head') {
        E.font.title(g, o.trophy ? (H.trophyInfo && H.trophyInfo.bagged ? 'TROPHY BAGGED!' : 'THE ONE THAT GOT AWAY') : reason, W / 2, y + 40, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
        E.font.text(g, name, W / 2, y + 80, '#f4ead8', { align: 'center', scale: 2, outline: false });
        const bagged = site.bucksSpawned.filter(a => a.bagger).length, esc = site.bucksSpawned.filter(a => a.escaped).length, lost = site.bucksSpawned.filter(a => a.lost).length;
        E.font.text(g, bagged + ' BAGGED   ' + esc + ' GOT AWAY' + (lost ? '   ' + lost + ' LOST' : ''), W / 2, y + 106, '#d8c8a8', { align: 'center', outline: false });
      } else if (pg.kind === 'kill') {
        const k = pg.k, a = k.a, sc = a.sp.id === 'moose' ? 1.6 : a.sp.id === 'elk' ? 2.1 : 2.9;
        E.font.text(g, (k.trophy ? 'TROPHY  ' : '') + a.label + '  ·  ' + k.rack, x + 12, y + 8, k.trophy ? '#ffd040' : '#ffe0b0', { outline: false, shadow: '#000' });
        if (H.players.length > 1) E.font.text(g, pg.p.name, x + bw - 12, y + 8, pg.p.color, { align: 'right', outline: false });
        // the chart: the animal side-on, see-through, a mark where each round went
        const cx = x + bw / 2 - 6, cyy = y + 118;
        px.rect(g, x + 10, y + 22, bw - 20, 112, '#0e1820'); for (let gx = x + 10; gx < x + bw - 10; gx += 12) px.rect(g, gx, y + 22, 1, 112, '#16242e'); for (let gy = y + 22; gy < y + 134; gy += 12) px.rect(g, x + 10, gy, bw - 20, 1, '#16242e');
        const offX = -((a.rig.S.head[0] + a.rig.S.tail[0]) / 2) * sc;
        const marks = a.rig.drawXray(g, cx + offX, cyy, sc, a.hits.map(h => ({ local: h.local, lethal: (ZONES[h.zone] || {}).lethal, zone: h.zone, pn: h.pn })));
        marks.forEach(([mx, my, h], j) => { const lx = mx + (j % 2 ? 26 : -26), ly = y + 30 + j * 10; px.line(g, mx, my, lx, ly + 3, '#ffe080'); E.font.text(g, (ZONES[h.zone] || ZONES.body).label, lx, ly, h.lethal ? '#ff8a7a' : '#ffd040', { align: j % 2 ? 'left' : 'right', outline: '#0e1820' }); });
        // the points line
        const line = fmt(k.base) + ' x' + k.distMult.toFixed(1) + ' DIST x' + k.zoneMult.toFixed(1) + ' ' + (ZONES[k.zone] || ZONES.body).label + (k.running ? ' x' + T('runningMult').toFixed(2) + ' RUN' : '') + (k.trophy ? ' x3 TROPHY' : '');
        E.font.text(g, Math.round(k.dist) + ' M', x + 14, y + 140, '#f4ead8', { scale: 2, outline: false });
        E.font.text(g, line, x + 14, y + 158, '#c8b898', { outline: false });
        const extra = (k.quick ? ' +50 QUICK DRAW' : '') + (k.multi ? ' +' + k.multi + (k.multiN >= 3 ? ' TRIPLE' : ' DOUBLE') : '') + (k.shared ? '  SHARED' : '');
        if (extra) E.font.text(g, extra.trim(), x + 14, y + 170, '#7ad0ff', { outline: false });
        E.font.text(g, '+' + fmt(count), x + bw - 14, y + 144, '#ffffff', { align: 'right', scale: 3, outline: '#1a0c08' });
      } else if (pg.kind === 'sum') {
        E.font.text(g, name + '  ·  TOTALS', W / 2, y + 8, '#ffe0b0', { align: 'center', outline: false });
        const R = site.results, cw = (bw - 20) / R.length;
        R.forEach((res, j) => {
          const cx0 = x + 10 + j * cw, lines = [];
          for (const k of res.kills) lines.push([k.label + ' ' + Math.round(k.dist) + 'M', k.points]);
          for (const c of res.critters) lines.push([c.label.toUpperCase(), c.points]);
          for (const b of res.bonuses) lines.push([b.label, b.points]);
          for (const pz of res.penalties) lines.push([pz.label, pz.points]);
          if (R.length > 1) E.font.text(g, res.p.name, cx0 + cw / 2, y + 22, res.p.color, { align: 'center', outline: false });
          lines.slice(0, 9).forEach(([l, v], q) => { const yy = y + 36 + q * 11, show = t > q * .18; if (!show) return; E.font.text(g, l, cx0 + 6, yy, v < 0 ? '#ff8a7a' : '#e8dcc8', { outline: false }); E.font.text(g, (v > 0 ? '+' : '') + fmt(v), cx0 + cw - 6, yy, v < 0 ? '#ff8a7a' : '#ffffff', { align: 'right', outline: false }); });
          E.font.text(g, fmt(res.score), cx0 + cw / 2, y + 140, '#ffffff', { align: 'center', scale: R.length > 2 ? 2 : 3, outline: '#1a0c08' });
          drawStars(g, cx0 + cw / 2 - 22, y + 176, res.stars, 3, t - .4);
        });
        if (R.length > 1) { const lead = R.slice().sort((a, b) => b.score - a.score)[0]; E.font.text(g, lead.p.name + ' TAKES THE SITE', W / 2, y + 186, lead.p.color, { align: 'center', outline: false }); }
      } else if (pg.kind === 'rivals') {
        E.font.text(g, 'THE HUNT-OFF STANDINGS', W / 2, y + 10, '#ffe0b0', { align: 'center', outline: false, scale: 2 });
        const list = (H.rivalBoard || []).concat([{ name: 'YOU', score: H.players[0].score, color: H.players[0].color }]).sort((a, b) => b.score - a.score);
        list.forEach((r, q) => { const yy = y + 44 + q * 26; E.font.text(g, (q + 1) + '. ' + r.name, x + 30, yy, r.color, { scale: 2, outline: false }); E.font.text(g, fmt(r.score), x + bw - 30, yy, '#ffffff', { align: 'right', scale: 2, outline: false }); });
      }
      if (t > .6) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 14, H.players[0].input);
    }
  };
};

/* ===== src/61-trophy.js ===== */
// 61-trophy: a trophy is a site with a legend, one named animal and rules of its own (each hunt's file has its rules).
// Shared: tension music when he shows, a TROPHY tag the first time he's seen, 1.5x toughness, a miss ends his window,
// x3 points, his mount in the Lodge. And the Trophy Cam: the sim slows to a crawl while the camera flies down the shot's
// line to the animal, he flashes to x-ray at the impact, falls at normal speed, and the view fades back.
SEG.trophy = (H, o) => {
  const def = reg('trophy', o.id); let site, phase = 'card', t = 0;
  return { canCall: true, kind: 'trophy',
    enter() {
      H.camAt(def.vantage, def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0, def.frame.pitch, def.frame.fov);
      for (const p of H.players) { p.resetSite(); if (def.calls) p.call.charges = def.calls; } for (const p of H.players) { p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .55; }
      H.trophyRules = def.rules || null; H.trophyActor = null;
      site = H.site = H.trophySite = new Site(H, def, { timeBoxed: o.timeBoxed, time: o.time });
      H.trophyInfo = { id: def.id, name: def.name, seen: false, bagged: false, dist: 0 };
      HUD.banner(def.name.toUpperCase(), { scale: 2, dur: 1.8, sub: 'THE TROPHY', colors: ['#fff6d8', '#ffd040', '#c87a10'] });
      if (G.sfx) { G.sfx.music('stalk', { fade: .8 }); G.sfx.ambience(H.hunt.ambience); }
      this.scoreAt = H.players.map(p => p.score);
    },
    update(dt) {
      t += dt; if (phase === 'card' && t > 1.2) { phase = 'play'; bus.emit('playStart', site); }
      site.update(dt);
      if (def.rules && def.rules.update) def.rules.update(H, site, dt);
      H.camAt(def.vantage, site.camB, site.pitch, site.fov);
      const A = H.trophyActor; if (A && A.seenAt !== null) H.trophyInfo.seen = true;
      if (phase === 'play' && site.phase === 'end') phase = 'end';
      if (site.done) {
        if (this.closed) return true; this.closed = true;
        siteBonuses(site); H.lastSite = site;
        const bagged = !!(A && A.bagger); Object.assign(H.trophyInfo, { bagged, by: A && A.bagger, dist: bagged ? (site.results.flatMap(r => r.kills).find(k => k.trophy) || {}).dist || 0 : 0 });
        const rec = Records.d.trophies[def.id] || {}; Records.trophy(def.id, { seen: (rec.seen || 0) + (H.trophyInfo.seen ? 1 : 0), bagged: rec.bagged || bagged, best: Math.max(rec.best || 0, H.trophyInfo.dist || 0), date: bagged ? new Date(2026, 10, 4).toDateString() : rec.date });
        H.trophyRules = null; return true;
      }
      return false;
    },
    exit() { H.world.refreshLook(); H.trophyRules = null; },
    get canShoot() { return phase === 'play' || phase === 'card'; }
  };
};
/** a trophy coming out of cover onto a path, and back into it */
function trophyShow(a, path, orders) { a.path = new APath(path); a.d = 0; const p = a.path.at(0); a.x = p.x; a.y = p.y; a.z = a.H.world.height(a.x, a.y); a.heading = p.angle; a.orders = orders.slice(); a.state = 'hidden'; a.delay = 0; a.appear(); a.entered = false; a.speed = 0; a.snapRig(); }
function trophyHide(a) { a.state = 'hidden'; a.delay = 1e9; a.speed = 0; a.visible = false; }
SEG.trophyEnd = (H, o) => {
  let t = 0; const info = H.trophyInfo || {};
  return { block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: true,
    enter() { if (G.sfx) { G.sfx.layer('tension', false); if (info.bagged) G.sfx.sting('fanfare'); else G.sfx.sting('escaped'); } if (!info.bagged) Barks.caption('emcee', 'THE ONE THAT GOT AWAY...'); else Barks.caption('emcee', 'TROPHY BAGGED!'); },
    update(dt) { t += dt; return t > 3.2 || (t > .6 && anyConfirm(H)) || (H.mode === 'attract' && t > 2); },
    draw(g, W, Ht) {
      const a = clamp(t / .4, 0, 1); dim(g, W, Ht, .35 * a);
      E.font.title(g, info.bagged ? 'TROPHY BAGGED!' : 'THE ONE THAT GOT AWAY', W / 2, Ht * .3, { scale: info.bagged ? 4 : 3, colors: info.bagged ? ['#fff6d8', '#ffd040', '#c87a10'] : ['#e8e0d8', '#a8a098', '#6a625a'], outline: '#1a0c08', depth: 3, depthColor: '#3a2410', align: 'center' });
      E.font.text(g, (info.name || '').toUpperCase(), W / 2, Ht * .3 + 44, '#f4ead8', { align: 'center', scale: 2, shadow: '#000' });
      if (info.bagged) E.font.text(g, 'HIS MOUNT GOES UP IN THE LODGE', W / 2, Ht * .3 + 66, '#ffd040', { align: 'center', shadow: '#000' });
      else E.font.text(g, 'NO PENALTY. HE\'LL BE BACK NEXT YEAR.', W / 2, Ht * .3 + 66, '#d8c8a8', { align: 'center', shadow: '#000' });
    }
  };
};
/* ---------- the Trophy Cam ---------- */
function trophyCamWanted(H, e) {
  const set = G.game.settings.trophyCam; if (set === 'off' || H.players.length > 1 || H.hubMode) return false;
  if (e.a.trophy) return true;
  return set === 'on' && e.kill.zone === 'heart' && H.site && H.site.bucksSpawned.every(a => a === e.a || a.resolved) && H.site.S.bucksLeft === 0;
}
bus.on('kill', e => { const H = G.hunt; if (!H || H.camFX || !trophyCamWanted(H, e)) return; H.camFX = new TrophyCam(H, e); });
class TrophyCam {
  constructor(H, e) {
    this.H = H; this.a = e.a; this.R = e.R; this.t = 0; this.phase = G.game.reduceMotion ? 'still' : 'fly';
    const c = H.cam; this.from = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: c.fov };
    const [px2, py, pz] = e.R.point, dx = px2 - c.x, dy = py - c.y, dz = pz - c.z, L = Math.hypot(dx, dy, dz) || 1;
    this.end = { x: px2 - dx / L * 3.2 * M, y: py - dy / L * 3.2 * M, z: pz - dz / L * 3.2 * M + .4 * M, yaw: Math.atan2(dy, dx), pitch: clamp(-Math.atan2(dz, Math.hypot(dx, dy)) / DEG, -10, 20), fov: 24 };
    this.dir = [dx / L, dy / L, dz / L]; this.dist = L;
    this.saved = { deadT: this.a.deadT, state: this.a.state };
    this.a.deadT = 0; G.game.timeScale = .15 * (G.devTimeScale || 1);
    if (G.sfx) G.sfx.play('slowmo');
    H.cinema = true;
  }
  get done() { return this.phase === 'done'; }
  /** real seconds (the sim runs slowed) */
  update(rdt) {
    this.t += rdt; const H = this.H;
    if (this.t > .3 && anyConfirm(H)) this.phase = 'back';
    if (this.phase === 'still') { this.a.xrayT = 1; if (this.t > 1.4) this.phase = 'back'; }
    else if (this.phase === 'fly') { if (this.t >= 1.4) { this.phase = 'xray'; this.t = 0; this.a.xrayT = .35; G.game.flash('#ffffff', .1, .5); } }
    else if (this.phase === 'xray') { this.a.xrayT = Math.max(0, .35 - this.t); if (this.t >= .35) { this.phase = 'fall'; this.t = 0; } }
    else if (this.phase === 'fall') { G.game.timeScale = Math.min(1, .3 + this.t) * (G.devTimeScale || 1); if (this.t >= 1.2) { this.phase = 'back'; this.t = 0; } }
    if (this.phase === 'back') { this.backT = (this.backT || 0) + rdt; this.a.xrayT = 0; if (this.backT > .45) { this.phase = 'done'; G.game.timeScale = G.devTimeScale || 1; H.cinema = !!(H.seg && H.seg.cinema); } }
  }
  /** the camera now */
  cam() {
    const f = this.from, e = this.end;
    if (this.phase === 'fly') { const u = E.ease.inOutCubic(clamp(this.t / 1.4, 0, 1)); return { x: lerp(f.x, e.x, u), y: lerp(f.y, e.y, u), z: lerp(f.z, e.z, u), yaw: E.lerpAng(f.yaw, e.yaw, Math.min(1, u * 2)), pitch: lerp(f.pitch, e.pitch, u), fov: lerp(f.fov, e.fov, u) }; }
    if (this.phase === 'xray' || this.phase === 'fall' || this.phase === 'still') return e;
    return f;
  }
  draw(g, W, Ht) {
    if (this.phase === 'fly') {   // the bullet streak ahead of the camera
      const u = clamp(this.t / 1.4, 0, 1), cx = W / 2, cy = Ht / 2, len = 30 + u * 40;
      px.line(g, cx - len * .5, cy + 4, cx + 2, cy, '#fff4c0', 2); px.disc(g, cx + 3, cy, 3, '#ffe060'); px.dot(g, cx + 3, cy, '#ffffff');
      for (let i = 0; i < 6; i++) { const r = (this.t * 300 + i * 40) % 160; px.dot(g, cx + Math.cos(i) * r, cy + Math.sin(i * 1.7) * r * .6, '#e8e0d0'); }
      E.font.text(g, 'TROPHY CAM', 10, 10, '#ffd040', { scale: 2, shadow: '#000' }); E.font.text(g, Math.round(this.dist / M) + ' M', 10, 28, '#ffffff', { shadow: '#000' });
    }
    if (this.phase === 'xray' || this.phase === 'still') { px.blend(g, .25, 'add', () => px.rect(g, 0, 0, W, Ht, '#2a6a8a')); E.font.text(g, (ZONES[this.R.zone] || ZONES.body).call || 'HIT!', W / 2, Ht * .18, '#ffffff', { align: 'center', scale: 3, outline: '#0a2a3a' }); }
    if (this.phase === 'back') { const a = clamp(1 - Math.abs(this.backT / .45 - .5) * 2, 0, 1); px.blend(g, a, 'normal', () => px.rect(g, 0, 0, W, Ht, '#000')); }
    if (this.phase !== 'back' && this.t > .3) Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, this.H.players[0].input, { align: 'right' });
  }
}
// the hunt hands its camera and its step to the Trophy Cam while it runs (92-hunt calls these)
function trophyCamStep(H, dt) {
  const C = H.camFX, ts = Math.max(.01, G.game.timeScale), rdt = dt / ts; C.update(rdt);
  const fl = C.phase === 'fly' || C.phase === 'still' || C.phase === 'xray';
  if (C.done) H.camFX = null;
  if (fl) { H.time += dt; C.a.deadT = 0; C.a.rigUpdate(dt, 0, 0); HUD.update(dt); return true; }
  return false;
}
function trophyCamView(H) { const C = H.camFX; return C && C.phase !== 'back' && C.phase !== 'done' ? C.cam() : null; }

/* ===== src/62-bonus.js ===== */
// 62-bonus: thirty-second shooting galleries on the hunt's own landscape: a timeline of targets on arcs or paths, the
// rifle with a bigger tube and a faster rack, points per target, protected targets that cost, PERFECT (every target hit,
// no misses: the total doubles), and a tally. Crow Patrol, Saucer Season and Snowball Standoff.
class BonusRun {
  constructor(H, def) {
    this.H = H; this.def = def; this.t = 0; this.targets = []; this.score = 0; this.shots = 0; this.hits = 0; this.misses = 0; this.scoreable = 0; this.taken = 0; this.penalty = 0; this.lines = [];
    this.r = RNG.wrap(RNG.fresh('bonus:' + def.id)); this.done = false; this.scores = H.players.map(() => 0);
    const self = this; this.script = G.game.script(function* () { yield* def.timeline(self); });
  }
  /** add a target: { kind, x, y, z, vx, vy, vz, g, r (radius, units), points, golden, protected, draw, life, path, ... } */
  add(o) { const T2 = Object.assign({ alive: true, t: 0, g: 9.8 * M, life: 8, points: 0, r: .4 * M, counts: true }, o); this.targets.push(T2); if (T2.counts && T2.points > 0) this.scoreable++; return T2; }
  at(b, d, up = 0) { const w = this.H.world.at(this.def.vantage, b, d); return { x: w.x, y: w.y, z: w.z + up * M }; }
  update(dt) {
    this.t += dt; const H = this.H;
    for (const T2 of this.targets) {
      if (!T2.alive) { T2.deadT = (T2.deadT || 0) + dt; continue; }
      T2.t += dt;
      if (T2.update) T2.update(T2, dt, this);
      else if (T2.path) { T2.d = (T2.d || 0) + T2.speed * dt; const p = T2.path.at(T2.d), z = lerp(T2.z0, T2.z1, clamp(T2.d / T2.path.len, 0, 1)) + (T2.hump ? Math.sin(clamp(T2.d / T2.path.len, 0, 1) * Math.PI) * T2.hump : 0); T2.vx = (p.x - T2.x) / dt; T2.vy = (p.y - T2.y) / dt; T2.x = p.x; T2.y = p.y; T2.z = H.world.height(p.x, p.y) + z; T2.heading = p.angle; if (T2.d >= T2.path.len) T2.gone = true; }
      else { T2.vz -= T2.g * dt; T2.x += T2.vx * dt; T2.y += T2.vy * dt; T2.z += T2.vz * dt; if (T2.z < H.world.height(T2.x, T2.y) - .2 * M) T2.gone = true; }
      if (T2.rig) T2.rig.update(dt, { x: T2.x, y: T2.y, z: T2.z, vx: T2.vx, vy: T2.vy, vz: T2.vz, flap: T2.flap === undefined ? 1 : T2.flap, walk: 0, facing: T2.heading });
      if (T2.t > T2.life) T2.gone = true;
      if (T2.gone) { T2.alive = false; T2.missed = true; if (T2.onGone) T2.onGone(T2, this); }
    }
    this.targets = this.targets.filter(T2 => T2.alive || (T2.deadT || 0) < 1.5);
    if (this.t >= (this.def.time || 30) && !this.done) this.finish();
  }
  finish() {
    if (this.done) return; this.done = true; if (this.script) this.script.cancel();
    this.perfect = this.scoreable > 0 && this.taken >= this.scoreable && this.misses === 0 && this.penalty === 0;
    if (this.perfect) { for (const p of this.H.players) { p.addScore(this.scores[p.i]); } this.scores = this.scores.map(s => s * 2); this.score *= 2; }
    bus.emit('bonusEnd', this);
  }
  /** this step's shots against the targets (then the world, for the dust) */
  resolve(shots) {
    for (const s of shots) {
      const p = s.p, ray = s.ray; this.shots++; p.stats.shots++;
      let best = null, bt = Infinity;
      for (const T2 of this.targets) { if (!T2.alive) continue; const zs = T2.zones ? T2.zones(T2) : [{ a: [T2.x, T2.y, T2.z + (T2.zc || 0)], r: T2.r * (T2.big || 1.25) }]; for (const z of zs) { const t = z.b ? rayCapsule(ray, ray, z.a, z.b, z.r) : raySphere(ray, ray, z.a, z.r); if (t !== null && t < bt) { bt = t; best = T2; best._z = z; } } }
      const R = resolveRay(this.H, ray, { maxT: best ? bt : undefined });
      if (best && (R.kind === 'sky' || R.t >= bt - 1)) this.hit(best, p, ray, bt);
      else { this.misses++; bus.emit('impact', { p, R }); if (R.kind === 'sky' || R.kind === 'ground' || R.kind === 'prop') bus.emit('bonusMiss', { p, R }); }
      bus.emit('shot', { p, R, ray });
      for (const a of this.H.actors) a.hear && a.hear(ray.x, ray.y, 1, false);
    }
  }
  hit(T2, p, ray, t) {
    const pts = T2.points, pt = [ray.x + ray.dx * t, ray.y + ray.dy * t, ray.z + ray.dz * t];
    if (T2.protected) { this.penalty++; this.score += pts; this.scores[p.i] += pts; p.addScore(pts); this.lines.push([T2.label || 'PENALTY', pts]); if (T2.onHit) T2.onHit(T2, this, p); HUD.pop(pt[0], pt[1], pt[2] + M, fmt(pts) + ' ' + (T2.label || ''), '#ff6a4a'); bus.emit('bonusHit', { T: T2, p, pts, pt }); return; }
    this.hits++; p.stats.hits++; this.taken += T2.counts ? 1 : 0; this.score += pts; this.scores[p.i] += pts; p.addScore(pts);
    if (T2.onHit) T2.onHit(T2, this, p, pt); else T2.alive = false;
    HUD.pop(pt[0], pt[1], pt[2] + .5 * M, '+' + fmt(pts) + (T2.golden ? ' GOLDEN!' : ''), T2.golden ? '#ffd040' : p.color);
    bus.emit('bonusHit', { T: T2, p, pts, pt });
  }
  items(items) { for (const T2 of this.targets) { if (!T2.alive && !(T2.deadT < 1.5 && T2.drawDead)) continue; const it = T2._it || (T2._it = { box: T2.box || [24, 24], outline: '#140c08', bias: T2.bias === undefined ? 6 : T2.bias, scale: 1 }); it.x = T2.x; it.y = T2.y; it.z = T2.z; it.draw = (g, ox, oy, k, view) => (T2.alive ? T2.draw : T2.drawDead)(g, ox, oy, k, view, T2); items.push(it); } }
  dispose() { if (this.script) this.script.cancel(); }
}
SEG.bonus = (H, o) => {
  const def = reg('bonus', o.id); let B, t = 0, phase = 'card';
  return { kind: 'bonus', canShoot: true, canCall: false,
    enter() {
      H.camAt(def.vantage, def.bearing || 0, def.pitch || 4, def.fov || 34); if (H.site) { H.site.dispose(); H.site = null; } H.actors.length = 0; H.vantageId = def.vantage; H.fanB = [-60, 60];
      for (const p of H.players) { p.resetSite({ tube: def.tube, rack: .15 }); p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .5; }
      this.scoreAt = H.players.map(p => p.score);
      HUD.banner(def.name.toUpperCase(), { scale: 3, dur: 1.6, sub: def.rules, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'] });
      if (G.sfx) G.sfx.music('jamboree', { fade: .5 });
      if (def.setup) def.setup(H);
    },
    update(dt) {
      t += dt;
      if (phase === 'card') { if (t > 1.6) { phase = 'play'; B = H.bonus = new BonusRun(H, o.time ? Object.assign({}, def, { time: o.time }) : def); } return false; }
      B.update(dt); H.camAt(def.vantage, def.bearing || 0, def.pitch || 4, def.fov || 34);
      if (B.done && this.closed) return true;
      if (B.done) { this.closed = true; H.bonusResult = { id: def.id, name: def.name, score: B.score, scores: B.scores.slice(), hits: B.hits, shots: B.shots, perfect: B.perfect, lines: B.lines }; Records.setBest(def.id, Math.max(...B.scores)); return true; }
      return false;
    },
    get canShoot() { return phase === 'play'; },
    resolve(shots) { if (B) B.resolve(shots); },
    items(items) { if (B) B.items(items); if (def.decor) def.decor(H, items, B); },
    draw(g, W, Ht) { if (!B) return; const left = Math.max(0, (def.time || 30) - B.t); E.font.text(g, def.name.toUpperCase(), W / 2, 6, '#f4ead8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, left.toFixed(1), W / 2, 15, left < 5 ? '#ff6a4a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, 'HITS ' + B.hits + '  MISSES ' + B.misses, W / 2, 33, B.misses ? '#d8c8a8' : '#7ad0ff', { align: 'center', shadow: '#000', outline: false }); },
    exit() { if (B) B.dispose(); H.bonus = null; if (def.teardown) def.teardown(H); }
  };
};
SEG.bonusTally = (H, o) => {
  let t = 0; const R = H.bonusResult || { score: 0, hits: 0, shots: 0, name: '' };
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { if (G.sfx) { G.sfx.music('results'); if (R.perfect) G.sfx.sting('fanfare'); } },
    update(dt) { t += dt; return t > .8 && (anyConfirm(H) || (H.mode === 'attract' || H.hubMode) && t > 3) || t > 14; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .55); const bw = 300, bh = 150, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
      E.ui.box(g, x, y, bw, bh, { bg: ['#1e2a3a', '#0e141e'], border: '#7ad0ff' });
      E.font.title(g, R.name.toUpperCase(), W / 2, y + 10, { scale: 2, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'], outline: '#0a1420', depth: 2, depthColor: '#1a3050', align: 'center' });
      E.font.text(g, 'HITS ' + R.hits + ' OF ' + R.shots + ' SHOTS', W / 2, y + 40, '#e8f0f8', { align: 'center', outline: false });
      for (const [l, v] of (R.lines || []).slice(0, 3)) E.font.text(g, l + ' ' + fmt(v), W / 2, y + 54 + (R.lines.indexOf(l) * 10), '#ff8a7a', { align: 'center', outline: false });
      if (R.perfect && t > .4) E.font.title(g, 'PERFECT! x2', W / 2, y + 76, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' });
      E.font.text(g, '+' + fmt(R.score), W / 2, y + 100, '#ffffff', { align: 'center', scale: 3, outline: '#0a1420' });
      if (H.players.length > 1) H.players.forEach((p, i) => E.font.text(g, p.name + ' ' + fmt(R.scores[i]), x + 30 + i * 66, y + 132, p.color, { outline: false }));
      if (t > .8) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 12, H.players[0].input);
    }
  };
};
/* ---------- target art ---------- */
function drawClay(g, ox, oy, k, view, T2) { const r = Math.max(1.5, .55 * M * k * .5), tilt = .45; px.ell(g, ox, oy, r + 1, r * tilt + 1, '#1a0c08'); px.ell(g, ox, oy, r, r * tilt, T2.golden ? '#ffd040' : '#e8743a'); px.ell(g, ox - r * .2, oy - r * .15, r * .5, r * tilt * .4, T2.golden ? '#fff4b0' : '#ffb070'); }
function drawShards(g, ox, oy, k, view, T2) { const s = T2.deadT || 0; for (let i = 0; i < 7; i++) { const a = i * 1.1 + T2.t, r = s * 30 * k * (1 + i % 3) * .4; px.rect(g, ox + Math.cos(a) * r, oy + Math.sin(a) * r * .6 + s * s * 40 * k, Math.max(1, k * 2), Math.max(1, k * 1.5), T2.golden ? '#ffd040' : i % 2 ? '#e8743a' : '#c85a28'); } }
function drawHank(g, ox, oy, k, view, T2) {
  const u = M * k, wob = Math.sin((T2.wobT || 0) * 20) * (T2.wobT || 0) * .3, C = E.tones('#6a8ac8'), straw = E.tones('#d8b45a');
  const top = [ox + wob * u, oy - 2.1 * u];
  px.line(g, ox, oy, top[0], top[1], E.tones('#6a5040').sh, Math.max(1, u * .12));
  px.line(g, top[0] - .9 * u, top[1] + .45 * u, top[0] + .9 * u, top[1] + .45 * u, E.tones('#6a5040').sh, Math.max(1, u * .1));
  px.poly(g, [[top[0] - .45 * u, top[1] + .3 * u], [top[0] + .45 * u, top[1] + .3 * u], [top[0] + .38 * u, top[1] + 1.25 * u], [top[0] - .38 * u, top[1] + 1.25 * u]], C.base);
  if (u > 4) for (let i = 0; i < 4; i++) px.line(g, top[0] - .4 * u, top[1] + (.4 + i * .22) * u, top[0] + .4 * u, top[1] + (.4 + i * .22) * u, C.sh);
  for (const sd of [-1, 1]) { px.line(g, top[0] + sd * .45 * u, top[1] + .45 * u, top[0] + sd * .95 * u, top[1] + .5 * u, C.sh, Math.max(1, u * .14)); for (let i = 0; i < 3; i++) px.line(g, top[0] + sd * .95 * u, top[1] + .5 * u, top[0] + sd * (1.05 + i * .05) * u, top[1] + (.45 + i * .1) * u, straw.base); }
  px.disc(g, top[0], top[1], .3 * u, E.tones('#c8a878').base);
  if (u > 4) { px.dot(g, top[0] - .1 * u, top[1] - .05 * u, '#1a0c08'); px.dot(g, top[0] + .1 * u, top[1] - .05 * u, '#1a0c08'); px.line(g, top[0] - .12 * u, top[1] + .12 * u, top[0] + .12 * u, top[1] + .12 * u, '#1a0c08'); }
  px.ell(g, top[0], top[1] - .25 * u, .55 * u, .12 * u, straw.sh); px.rect(g, top[0] - .25 * u, top[1] - .55 * u, .5 * u, .3 * u, straw.base);
}
function drawSnowman(g, ox, oy, k, view, T2) {
  const u = M * k, rise = clamp(T2.rise || 0, 0, 1), y0 = oy + (1 - rise) * 1.8 * u, sn = E.tones('#eef2f6'), arm = (T2.throwT || 0) > 0 ? -1.2 + (T2.throwT) * 2.6 : .2;
  px.disc(g, ox, y0 - .5 * u, .55 * u, sn.sh); px.disc(g, ox - .1 * u, y0 - .58 * u, .45 * u, sn.base);
  px.disc(g, ox, y0 - 1.3 * u, .4 * u, sn.sh); px.disc(g, ox - .08 * u, y0 - 1.36 * u, .32 * u, sn.base);
  px.disc(g, ox, y0 - 1.9 * u, .3 * u, sn.sh); px.disc(g, ox - .06 * u, y0 - 1.95 * u, .24 * u, sn.base);
  if (u > 3) { px.dot(g, ox - .1 * u, y0 - 1.95 * u, '#1a1418'); px.dot(g, ox + .1 * u, y0 - 1.95 * u, '#1a1418'); px.line(g, ox, y0 - 1.88 * u, ox + .25 * u, y0 - 1.84 * u, '#e8742a', Math.max(1, u * .06)); px.line(g, ox - .12 * u, y0 - 1.78 * u, ox + .12 * u, y0 - 1.74 * u, '#1a1418'); }
  px.line(g, ox + .35 * u, y0 - 1.35 * u, ox + .9 * u, y0 - (1.6 + arm * .5) * u, '#5a4030', Math.max(1, u * .06)); px.line(g, ox - .35 * u, y0 - 1.35 * u, ox - .85 * u, y0 - 1.1 * u, '#5a4030', Math.max(1, u * .06));
  if (T2.hat && !T2.hatOff) { px.rect(g, ox - .32 * u, y0 - 2.22 * u, .64 * u, .08 * u, '#1a1418'); px.rect(g, ox - .2 * u, y0 - 2.6 * u, .4 * u, .4 * u, '#1a1418'); px.rect(g, ox - .2 * u, y0 - 2.3 * u, .4 * u, .06 * u, '#c83a2a'); }
}
function drawSnowball(g, ox, oy, k, view, T2) { const r = Math.max(1.5, .2 * M * k); px.disc(g, ox, oy, r + .5, '#8a98a8'); px.disc(g, ox - r * .15, oy - r * .15, r, '#f4f8fc'); }
function drawTopHat(g, ox, oy, k, view, T2) { const u = M * k * (T2.hs || 1); px.rect(g, ox - .5 * u, oy - .1 * u, u, .14 * u, '#1a1418'); px.rect(g, ox - .32 * u, oy - .75 * u, .64 * u, .68 * u, '#1a1418'); px.rect(g, ox - .32 * u, oy - .25 * u, .64 * u, .1 * u, '#c83a2a'); px.rect(g, ox - .26 * u, oy - .7 * u, .12 * u, .4 * u, '#3a343a'); }
function drawSnowmoose(g, ox, oy, k, view, T2) { const rig = T2.rig; if (!rig) return; const save = rig.C; rig.C = Object.assign({}, rig.C, { coat: '#e8eef4', back: '#d8e2ea', belly: '#f4f8fc', leg: '#dfe8f0', muzzle: '#c8d4e0', nose: '#2a3a4a', hoof: '#8a98a8', throat: '#eef2f6', antler: '#b8c8d8', bell: '#e0e8f0' }); rig.draw(g, ox, oy, view); rig.C = save; }

/* ---------- the three games ---------- */
def('bonus', 'crow-patrol', {
  hunt: 'hollow', name: 'Crow Patrol', host: 'granny', blurb: 'Shoot the crows off the corn. Not Hank.', rules: 'CROWS 100 · GOLDEN CROW 500 · NOT HANK!', vantage: 'porch', time: 30, tube: 10, bearing: 0, pitch: 4, fov: 34,
  setup(H) { H.hank = { x: 0, y: 0, z: 0, wobT: 0 }; const w = H.world.at('porch', -4, 26); Object.assign(H.hank, w); },
  decor(H, items, B) { if (!H.hank) return; const h = H.hank; h.wobT = Math.max(0, (h.wobT || 0) - (H.dt || 0)); items.push({ x: h.x, y: h.y, z: h.z, box: [24, 40], outline: '#140c08', draw: (g, ox, oy, k, v) => drawHank(g, ox, oy, k, v, h) }); },
  teardown(H) { H.hank = null; },
  timeline: function* (B) {
    const H = B.H, h = H.hank;
    // Hank himself is a target nobody should shoot
    B.add({ kind: 'hank', protected: true, points: -250, label: "HANK'S GOT FEELIN'S!", life: 99, x: h.x, y: h.y, z: h.z, update: (T2) => { T2.x = h.x; T2.y = h.y; T2.z = h.z; }, zones: T2 => [{ a: [h.x, h.y, h.z + .3 * M], b: [h.x, h.y, h.z + 2.2 * M], r: .4 * M }, { a: [h.x - .9 * M, h.y, h.z + 1.6 * M], b: [h.x + .9 * M, h.y, h.z + 1.6 * M], r: .2 * M }], draw: () => {}, counts: false, onHit: (T2) => { h.wobT = 1; if (G.sfx) G.sfx.play('bonk'); Barks.caption('granny', "Hank's got feelin's!"); } });
    const crow = (b, d, golden, land) => {
      const start = B.at(b, d), mid = B.at(b * .5 - 4, (d + 26) / 2), end = land ? B.at(-4 + (B.r.f() - .5) * 2, 26) : B.at(b < 0 ? 50 : -50, 70);
      const path = new APath([start, mid, end]), rig = new E.Bird({ kind: golden ? 'golden' : 'crow', seed: B.r.int(1, 99) });
      return B.add({ kind: 'crow', golden, points: golden ? 500 : 100, path, d: 0, speed: (golden ? 13 : 9) * M, z0: 0, z1: land ? 1.7 : 6, hump: (6 + B.r.f() * 5) * M, x: start.x, y: start.y, z: start.z, rig, r: .55 * M, life: 9, box: [10, 10],
        update: (T2, dt) => {
          if (T2.sitting) { T2.sitT -= dt; T2.flap = 0; if (T2.sitT <= 0) { T2.sitting = false; T2.flap = 1; T2.path = new APath([{ x: T2.x, y: T2.y }, B.at(b < 0 ? 55 : -55, 80)]); T2.d = 0; T2.z0 = 1.7; T2.z1 = 14; T2.hump = 0; } return; }
          T2.d += T2.speed * dt; const p = T2.path.at(T2.d), u = clamp(T2.d / T2.path.len, 0, 1); T2.vx = (p.x - T2.x) / dt; T2.vy = (p.y - T2.y) / dt; T2.x = p.x; T2.y = p.y; T2.z = H.world.height(p.x, p.y) + lerp(T2.z0, T2.z1, u) * M + Math.sin(u * Math.PI) * T2.hump; T2.heading = p.angle;
          if (u >= 1) { if (land && !T2.landed) { T2.landed = true; T2.sitting = true; T2.sitT = 1.5; if (G.sfx) G.sfx.critter('caw', T2); } else T2.gone = true; }
        },
        draw: (g, ox, oy, k, view) => rig.draw(g, ox, oy, view), drawDead: (g, ox, oy, k, view, T2) => { if (T2.deadT < .2) FXW.burst(T2.x, T2.y, T2.z, 10, 'feather', { g: 2 * M, life: 1.4 }); },
        onHit: (T2) => { T2.alive = false; FXW.burst(T2.x, T2.y, T2.z, 12, T2.golden ? 'gold' : 'feather', { g: 2 * M, life: 1.5 }); if (G.sfx) G.sfx.play('flap'); } });
    };
    yield .4; if (G.sfx) G.sfx.critter('caw', B.at(0, 60));
    const waves = [[2, -20], [3, 10], [2, 26], [4, -8], [3, 18], [5, 0]];
    for (let w = 0; w < waves.length && B.t < 27; w++) {
      const [n, b0] = waves[w];
      for (let i = 0; i < n; i++) { crow(b0 + (i - n / 2) * 7 + B.r.range(-3, 3), 52 + B.r.f() * 60, false, i === 0 && w % 2 === 0); yield .25; }
      if (w === 3) crow(-30, 90, true, false);
      yield 3.2 + B.r.f();
    }
    yield E.until(() => B.t >= 30);
  }
});
def('bonus', 'saucer-season', {
  hunt: 'bugle', name: 'Saucer Season', host: 'loretta', blurb: 'Clays from the trap house. Pull!', rules: 'CLAYS 75 · GOLDEN CLAY 500', vantage: 'traphouse', time: 30, tube: 12, bearing: 0, pitch: 1, fov: 36,
  timeline: function* (B) {
    const H = B.H, L = (from, b, speed, up, golden) => {   // a clay thrown from a house at `from` toward bearing b
      const o = B.at(from[0], from[1], from[2] || .8), a = (H.world.vant[B.def.vantage].yaw + b) * DEG, sp = speed * M;
      if (G.sfx) G.sfx.play('throw');
      return B.add({ kind: 'clay', golden, points: golden ? 500 : 75, x: o.x, y: o.y, z: o.z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: up * M, g: 9.8 * M * .55, r: .32 * M, big: 1.5, life: 5, box: [8, 6], draw: drawClay, drawDead: drawShards, onHit: (T2) => { T2.alive = false; if (G.sfx) G.sfx.play('clay'); FXW.burst(T2.x, T2.y, T2.z, 10, T2.golden ? 'gold' : 'clay', { g: 6 * M, life: .9, size: .06 }); } });
    };
    const house = [0, 16, .3], left = [-28, 22, 3], right = [28, 22, 3], tower = [34, 30, 12];
    yield .6; Barks.caption('loretta', 'Pull!');
    const seq = [['single', 2], ['single', 2.2], ['double', 2.6], ['cross', 2.8], ['single', 2], ['tower', 2.8], ['double', 2.6], ['cross', 2.6], ['golden', 2.6], ['double', 2.4], ['tower', 2.4]];
    for (const [kind, gap] of seq) {
      if (B.t > 27) break;
      if (kind === 'single') L(house, B.r.range(-25, 25), 22, 9);
      else if (kind === 'double') { L(house, B.r.range(-30, -8), 21, 8.5); L(house, B.r.range(8, 30), 21, 9.5); }
      else if (kind === 'cross') { L(left, 55, 20, 7); yield .25; L(right, -55, 20, 7); }
      else if (kind === 'tower') L(tower, -70, 14, 2);
      else if (kind === 'golden') { L(house, B.r.range(-10, 10), 26, 10, true); }
      yield gap;
    }
    yield E.until(() => B.t >= 30);
  },
  decor(H, items) {}
});
def('bonus', 'snowball-standoff', {
  hunt: 'muskeg', name: 'Snowball Standoff', host: 'earl', blurb: 'The snowmen want revenge. Shoot first.', rules: 'SNOWBALLS 75 · HATS 150 · THE SNOWMOOSE 1000', vantage: 'earlFire', time: 30, tube: 12, bearing: 0, pitch: 3, fov: 34,
  timeline: function* (B) {
    const H = B.H, spots = [[-26, 28], [-10, 34], [8, 30], [24, 36], [-18, 44], [16, 46]];
    const snowman = (spot) => {
      const w = B.at(spot[0], spot[1]);
      const S2 = B.add({ kind: 'snowman', points: 0, counts: false, x: w.x, y: w.y, z: w.z, rise: 0, life: 7, hat: true, box: [20, 46], r: .5 * M,
        zones: T2 => T2.rise > .6 && !T2.hatOff ? [{ a: [T2.x, T2.y, T2.z + 2.35 * M], r: .38 * M }] : [],
        update: (T2, dt) => { T2.rise = T2.t < .5 ? T2.t / .5 : T2.t > 5.5 ? Math.max(0, 1 - (T2.t - 5.5) / .5) : 1; if (T2.t > 1.2 && !T2.thrown) { T2.throwT = Math.min(1, (T2.throwT || 0) + dt / .6); if (T2.throwT >= 1) { T2.thrown = true; T2.throwT = 0; ball(T2); } } if (T2.t > 3.6 && !T2.thrown2 && T2.rise >= 1) { T2.thrown2 = true; ball(T2); } },
        draw: drawSnowman, onHit: (T2, B2, p, pt) => { if (T2.hatOff) return; T2.hatOff = true; T2.points = 0; B.taken++; hatFly(T2); if (G.sfx) G.sfx.play('bonk'); }, points: 150 });
      B.scoreable++; S2.counts = false;
      return S2;
    };
    const hatFly = (T2) => B.add({ kind: 'hat', counts: false, points: 0, x: T2.x, y: T2.y, z: T2.z + 2.3 * M, vx: 0, vy: 0, vz: 6 * M, g: 9.8 * M, life: 1.4, draw: drawTopHat, zones: () => [] });
    const ball = (from) => {   // a snowball lobbed at the camera: shoot it in the air or wear it
      const c = H.cam, o = { x: from.x, y: from.y, z: from.z + 1.8 * M }, tgt = { x: c.x + (B.r.f() - .5) * 2 * M, y: c.y + (B.r.f() - .5) * 2 * M, z: c.z - .2 * M }, v = E.arc(o, tgt, 9.8 * M, { time: 1.7 });
      if (G.sfx) G.sfx.play('throw');
      return B.add({ kind: 'snowball', points: 75, x: o.x, y: o.y, z: o.z, vx: v.vx, vy: v.vy, vz: v.vz, g: 9.8 * M, r: .22 * M, big: 1.6, life: 1.9, draw: drawSnowball, box: [6, 6],
        onHit: (T2) => { T2.alive = false; FXW.burst(T2.x, T2.y, T2.z, 12, 'snow', { g: 6 * M, life: .8 }); if (G.sfx) G.sfx.play('splat', { vol: .6 }); },
        onGone: (T2) => { if (T2.t > 1.5) { H.splats.push({ x: H.W * (.25 + B.r.f() * .5), y: H.H * (.25 + B.r.f() * .45), r: 40 + B.r.f() * 30, t: 0, dur: 2, seed: B.r.f() * 6 }); if (G.sfx) G.sfx.play('splat'); B.misses += 0; } } });
    };
    yield .6;
    const order = [0, 3, 1, 4, 2, 5, 0, 2, 4, 1, 3, 5];
    for (let i = 0; i < order.length && B.t < 26; i++) {
      snowman(spots[order[i]]); if (i % 3 === 2) { yield .4; snowman(spots[(order[i] + 2) % spots.length]); }
      yield 1.5 + B.r.f() * .6;
      if (B.t >= 20 && !B.moose) {   // the Snowmoose rises from the big drift
        B.moose = true; const w = B.at(0, 52), rig = new E.Quadruped({ species: 'moose', sex: 'm', antlers: { points: 12, spread: 60, seed: 5 }, size: 1.6 });
        const SM = B.add({ kind: 'snowmoose', counts: false, points: 0, x: w.x, y: w.y, z: w.z - 3 * M, rig: null, life: 12, box: [80, 90], rise: 0, update: (T2, dt) => { T2.z = Math.min(w.z, T2.z + dt * 2.5 * M); rig.update(dt, { x: T2.x, y: T2.y, z: T2.z, vx: 0, vy: 0, facing: (H.world.vant.earlFire.yaw + 180) * DEG, ground: () => T2.z, alert: 1, call: Math.sin(T2.t * 1.4) > .6 ? 1 : 0 }); }, draw: drawSnowmoose, zones: () => [] });
        SM.rig = rig; rig.update(0, { x: w.x, y: w.y, z: w.z - 3 * M, ground: () => w.z - 3 * M, facing: (H.world.vant.earlFire.yaw + 180) * DEG });
        if (G.sfx) G.sfx.call('moose', null, 1.2); Barks.caption('earl', 'THE SNOWMOOSE! AIM FOR THE HAT!');
        B.add({ kind: 'tophat', points: 1000, x: w.x, y: w.y, z: w.z, life: 10, hs: 2.2, r: .7 * M, big: 1.3, update: (T2) => { const J = rig.J.skull; if (J) { const s = 1; T2.x = SM.x + J[0] * s; T2.y = SM.y + J[1] * s; T2.z = SM.z + J[2] * s + 1.4 * M; } }, draw: drawTopHat, box: [20, 20], onHit: (T2) => { T2.alive = false; hatFly(T2); if (G.sfx) G.sfx.sting('fanfare'); HUD.banner('HAT TRICK!', { scale: 3 }); } });
      }
    }
    yield E.until(() => B.t >= 30);
  }
});

/* ===== src/63-range.js ===== */
// 63-range: Uncle Dub's Practice Range: seven stations, each a line from Dub, an objective with the glyphs for this
// player's device, and a check; then the Range badge in the Lodge.
function rangePaper(B, b, d, o = {}) {   // a paper target on a stand: a deer (or a doe) side-on with the vital ring
  const w = B.at(b, d), H = B.H, doe = !!o.doe;
  const T2 = B.add(Object.assign({ kind: doe ? 'paperdoe' : 'paper', points: doe ? 0 : o.points || 100, protected: doe, label: doe ? 'THAT\'S A DOE' : '', x: w.x, y: w.y, z: w.z, life: o.life || 1e9, box: [30, 34], counts: !doe, holes: [], down: 0,
    zones: T => { if (T.down > .3) return []; const R = H.lens, rx = R.Rx, ry = R.Ry, P = (lat, up) => [T.x + rx * lat * M, T.y + ry * lat * M, T.z + up * M];
      return [{ id: 'heart', a: P(.34, .86), r: .13 * M }, { id: 'body', a: P(-.55, 1.0), b: P(.45, 1.0), r: .36 * M }, { id: 'head', a: P(.78, 1.42), r: .2 * M }]; },
    update: (T, dt) => { if (T.move) { T.d0 = (T.d0 || 0) + dt * T.move; const p = B.at(T.b0 + Math.sin(T.d0) * T.amp, d); T.x = p.x; T.y = p.y; T.vx = (T.lx === undefined ? 0 : (p.x - T.lx) / dt); T.lx = p.x; } if (T.hitT) { T.down = Math.min(1, T.down + dt * 3); } },
    draw: (g, ox, oy, k, view, T) => drawPaper(g, ox, oy, k, T, doe),
    onHit: (T, B2, p, pt) => { const zs = T.zones(T), R = H.lens.ray(p.aimPoint()[0], p.aimPoint()[1]); let zone = 'body'; for (const z of zs) { const t = z.b ? rayCapsule(R, R, z.a, z.b, z.r) : raySphere(R, R, z.a, z.r); if (t !== null) { zone = z.id; break; } } T.lastZone = zone; T.hitT = H.time; if (G.sfx) G.sfx.play('wood'); if (zone === 'heart') HUD.banner('HEART SHOT!', { scale: 3 }); bus.emit('rangeHit', { T, zone, p }); if (!T.keep) T.alive = false; else T.hitT = 0; }
  }, o));
  return T2;
}
function drawPaper(g, ox, oy, k, T, doe) {
  const u = M * k, drop = T.down || 0, top = oy - 1.7 * u * (1 - drop * .9);
  px.rect(g, ox - .05 * u, top + .2 * u, Math.max(1, .1 * u), oy - top, '#6a5040');
  const C = doe ? '#c8a878' : '#e8dcc0', S = (lat, up) => [ox + lat * u, oy - up * u * (1 - drop * .9)];
  const body = [S(-.75, 1.25), S(.5, 1.32), S(.62, 1.15), S(.62, .7), S(-.75, .72)];
  px.poly(g, body, '#2a2018'); px.poly(g, body.map(p => [p[0] + .5, p[1] + .5]), C);
  px.disc(g, ...S(.8, 1.45), Math.max(1, .2 * u), C); px.line(g, ...S(.55, 1.25), ...S(.75, 1.4), C, Math.max(1, .14 * u));
  for (const x of [-.6, -.35, .3, .5]) px.line(g, ...S(x, .72), ...S(x, .2), C, Math.max(1, .07 * u));
  if (!doe) { const a = S(.8, 1.62); px.line(g, a[0], a[1], a[0] - .25 * u, a[1] - .35 * u, '#5a4030', Math.max(1, .05 * u)); px.line(g, a[0], a[1], a[0] + .2 * u, a[1] - .4 * u, '#5a4030', Math.max(1, .05 * u)); px.line(g, a[0] - .12 * u, a[1] - .18 * u, a[0] - .3 * u, a[1] - .2 * u, '#5a4030', 1); }
  const h = S(.34, .86); px.disc(g, h[0], h[1], Math.max(1, .2 * u), '#c83a2a'); px.disc(g, h[0], h[1], Math.max(.5, .13 * u), '#f4ecd8'); px.disc(g, h[0], h[1], Math.max(.5, .06 * u), '#c83a2a');
  if (doe && u > 3) E.font.text(g, 'DOE', ox, oy - 1.9 * u, '#c83a2a', { align: 'center', outline: '#1a0c08' });
}
function rangeTin(B, b, d, skunk) {
  const w = B.at(b, d), H = B.H;
  return B.add({ kind: skunk ? 'tinskunk' : 'tin', points: skunk ? 0 : 50, protected: skunk, label: skunk ? 'DON\'T SHOOT THE SKUNK' : '', x: w.x, y: w.y, z: w.z, life: 4.5, rise: 0, r: .18 * M, zc: .3 * M, box: [12, 14],
    update: T => { T.rise = T.t < .3 ? T.t / .3 : T.t > 3.8 ? Math.max(0, 1 - (T.t - 3.8) / .5) : 1; T.zc = (.3 * T.rise) * M; },
    draw: (g, ox, oy, k, view, T) => { const u = M * k, y = oy - (.35 * T.rise) * u; px.rect(g, ox - .02 * u, y, Math.max(1, .04 * u), oy - y, '#5a5a5a'); px.ell(g, ox, y - .12 * u, .16 * u, .14 * u, skunk ? '#1a1a1e' : '#8a8a90'); px.disc(g, ox + .14 * u, y - .24 * u, .08 * u, skunk ? '#1a1a1e' : '#9a9aa0'); px.line(g, ox - .14 * u, y - .1 * u, ox - .26 * u, y - .4 * u, skunk ? '#f4f4f0' : '#7a7a80', Math.max(1, .08 * u)); if (skunk) { px.line(g, ox - .1 * u, y - .24 * u, ox + .1 * u, y - .2 * u, '#f4f4f0'); if (u > 3) E.font.text(g, "DON'T", ox, y - .7 * u, '#e8443a', { align: 'center', outline: '#1a0c08' }); } },
    onHit: (T, B2, p) => { T.alive = false; if (G.sfx) G.sfx.play(skunk ? 'stink' : 'ping'); if (skunk) { H.stink = 1.5; Barks.caption('dub', 'Skunk. Even a tin one. Leave it be.'); } } });
}
const RANGE_STATIONS = [
  { name: 'AIM AND FIRE', dub: 'Three paper bucks. Put a round in each.', keys: [['fire', 'SHOOT']], setup(B) { this.ts = [rangePaper(B, -8, 22), rangePaper(B, 0, 22), rangePaper(B, 8, 22)]; }, done() { return this.ts.every(t => !t.alive); } },
  { name: 'PUMP', dub: 'Shoot, pump, shoot. Then empty the tube and let it reload.', keys: [['fire', 'SHOOT'], ['pump', 'PUMP']], setup(B) { this.t = rangePaper(B, 0, 22, { keep: true }); this.pumped = false; this.reloaded = false; this.offs = [bus.on('pump', () => { this.pumped = true; }), bus.on('reload', () => { this.reloaded = true; })]; }, done(B) { const r = B.H.players[0].rifle; return this.pumped && this.reloaded && r.reloadT <= 0 && r.chambered; }, end() { for (const f of this.offs) f(); } },
  { name: 'SHOT PLACEMENT', dub: 'See the ring behind the shoulder? That\'s his heart. Hit it.', keys: [['fire', 'SHOOT']], setup(B) { this.t = rangePaper(B, 0, 20, { keep: true }); this.ok = false; this.off = bus.on('rangeHit', e => { if (e.zone === 'heart') this.ok = true; else Barks.caption('dub', e.zone === 'head' ? 'Head works too. Show me the heart.' : 'Lower and forward. The ring.'); }); }, done() { return this.ok; }, end() { this.off(); } },
  { name: 'BUCKS ONLY', dub: 'Bucks and does on the track. Bucks only. Antlers, son.', keys: [['fire', 'SHOOT']], setup(B) { this.n = 0; this.spawnT = 0; this.off = bus.on('rangeHit', e => { if (e.T.kind === 'paper') this.n++; }); this.offD = bus.on('bonusHit', e => { if (e.T.kind === 'paperdoe') Barks.caption('dub', "That's a doe. No antlers. In a hunt, that benches you."); }); }, update(B, dt) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 2.2; this.k = (this.k || 0) + 1; const doe = this.k % 3 === 2; const T2 = rangePaper(B, -26, 30, { doe, life: 6 }); T2.move = .55; T2.b0 = 0; T2.amp = 26; T2.d0 = -Math.PI / 2; } }, done() { return this.n >= 3; }, end() { this.off(); this.offD(); } },
  { name: 'SCOPE AND BREATH', dub: 'Way out there. Scope up, hold your breath, squeeze.', keys: [['scope', 'SCOPE'], ['breath', 'HOLD BREATH'], ['fire', 'SHOOT']], setup(B) { this.t = rangePaper(B, 0, 152, { keep: true, points: 300 }); this.ok = false; this.off = bus.on('rangeHit', e => { const p = e.p; if (p.scope.up && (p.scope.holding || p.bot)) this.ok = true; else Barks.caption('dub', p.scope.up ? 'Hold your breath first.' : 'Use the scope out that far.'); }); }, done() { return this.ok; }, end() { this.off(); } },
  { name: 'THE CALL', dub: 'Mechanical deer. Call him, he stops. Then shoot.', keys: [['call', 'CALL'], ['fire', 'SHOOT']], setup(B) { const H = B.H; this.ok = false; this.T = rangePaper(B, -30, 40, { keep: true, points: 200 }); this.T.move = .9; this.T.b0 = 0; this.T.amp = 30; this.T.d0 = 0; this.T.moving = true; const T2 = this.T; this.offC = bus.on('call', () => { T2.stopT = 2; }); this.offH = bus.on('rangeHit', e => { if (e.T === T2) { if (T2.stopT > 0) this.ok = true; else Barks.caption('dub', 'Call him first. A stopped deer is a sure shot.'); } }); const up = T2.update; T2.update = (T, dt) => { if (T.stopT > 0) { T.stopT -= dt; T.vx = 0; } else up(T, dt); T.running = !(T.stopT > 0); }; B.H.players.forEach(p => { p.call.charges = 5; }); }, done() { return this.ok; }, end() { this.offC(); this.offH(); } },
  { name: 'CRITTERS', dub: 'Tin squirrels for bonus points. That one\'s a skunk. Don\'t.', keys: [['fire', 'SHOOT']], setup(B) { this.n = 0; this.k = 0; this.spawnT = 0; this.off = bus.on('bonusHit', e => { if (e.T.kind === 'tin') this.n++; }); }, update(B, dt) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 1.6; this.k++; rangeTin(B, -20 + (this.k * 13) % 40, 26 + (this.k % 3) * 3, this.k % 4 === 3); } }, done() { return this.n >= 3; }, end() { this.off(); } }
];
SEG.range = (H, o) => {
  let B, i = -1, t = 0, phase = 'intro', st = null;
  const next = () => { if (st && st.end) st.end(B); i++; t = 0; if (i >= RANGE_STATIONS.length) { phase = 'done'; Records.d.badge = true; Records.save(); Barks.caption('dub', "You'll do. Go win that Hunt-Off."); if (G.sfx) G.sfx.sting('fanfare'); return; } st = Object.create(RANGE_STATIONS[i]); for (const T2 of B.targets) T2.alive = false; st.setup(B); phase = 'line'; Barks.caption('dub', st.dub); for (const p of H.players) { p.rifle.setup({}); p.call.charges = Math.max(p.call.charges, 2); } };
  return { kind: 'range', canShoot: true, canCall: true,
    enter() { H.camAt('bench', 0, 2, 34); H.vantageId = 'bench'; H.fanB = [-60, 60]; H.vkind = 'range'; for (const p of H.players) { p.resetSite(); p.rx = H.W / 2; p.ry = H.H * .55; }
      B = H.bonus = new BonusRun(H, { id: 'range', vantage: 'bench', time: 1e9, timeline: function* () { yield E.until(() => false); } });
      if (G.sfx) { G.sfx.music('lodgefire', { fade: .6 }); G.sfx.ambience('range'); } Barks.caption('dub', reg('beat', 'range-intro').lines[0][1]); },
    update(dt) {
      t += dt; H.camAt('bench', 0, i === 4 ? 0 : 2, 34);
      B.update(dt);
      if (phase === 'intro' && (t > 2.5 || anyConfirm(H))) next();
      else if (phase === 'line' || phase === 'play') { if (phase === 'line' && t > 1) phase = 'play'; if (st.update) st.update(B, dt); if (st.done(B)) { phase = 'good'; t = 0; Barks.caption('dub', ['Good.', 'There you go.', 'Now you\'re talkin\'.', 'Not bad.'][i % 4]); if (G.sfx) G.sfx.play('confirm'); } }
      else if (phase === 'good' && t > 1.4) next();
      else if (phase === 'done' && (t > 3.5 || anyConfirm(H) && t > .8)) { H.bonusResult = { id: 'range', name: "Uncle Dub's Range", score: B.score, scores: B.scores, hits: B.hits, shots: B.shots, perfect: false }; Records.setBest('range', B.score); return true; }
      return false;
    },
    resolve(shots) { B.resolve(shots); },
    items(items) { B.items(items); },
    bot(p, bot, dt) {   // the bot does each lesson the way it asks: calls the running deer, empties the tube
      if (st && st.name === 'THE CALL' && !(st.T.stopT > 0) && (bot.callT = (bot.callT || 0) - dt) <= 0) { bot.callT = 2.5; H.useCall(p); }
      const keep = H.seg; H.seg = { canShoot: true, kind: 'rangeBot' }; bot.update(dt, p, H); H.seg = keep;
      if (st && st.name === 'PUMP' && p.rifle.rounds > 0 && !p.rifle.busy && p.rifle.chambered && H.time - p.rifle.last > .5) H.trigger(p);
    },
    draw(g, W, Ht) {
      if (!st) return;
      E.ui.box(g, W / 2 - 150, 8, 300, 36, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .9 });
      E.font.text(g, 'STATION ' + (i + 1) + ' OF 7: ' + st.name, W / 2, 13, '#ffd040', { align: 'center', outline: false });
      let x = W / 2 - st.keys.reduce((s, [a, txt]) => s + Glyph.measure(a, H.players[0].input) + 6 + E.font.width(txt) + 14, 0) / 2;
      for (const [a, txt] of st.keys) x += Glyph.cue(g, a, txt, x, 32, H.players[0].input, { align: 'left' }) + 14;
      if (phase === 'done') E.font.title(g, 'RANGE BADGE EARNED!', W / 2, Ht * .4, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' });
    },
    exit() { if (st && st.end) st.end(B); H.bonus = null; }
  };
};

/* ===== src/70-audio.js ===== */
// 70-audio: every sound is made here, in code: bluegrass chiptune songs (banjo rolls on a pulse wave, a square fiddle,
// triangle bass, a washboard of noise), layers that come in when bucks or a trophy show, stings; the rifle's crack and
// its echo down the valley; pumps, shells, calls, animal voices, impacts; the woods' own sounds.
const bar = s => s.trim().split(/\s+/).join(' ');
const SONGS = {
  hoedown: { bpm: 140, steps: 4, tracks: [
    { name: 'banjo', wave: 'pulse', vol: .055, notes: bar('G4 B4 D5 G5 B4 D5 G4 D5 G4 B4 D5 G5 B4 D5 G4 D5 | C5 E5 G5 C5 E5 G5 C5 G5 C5 E5 G5 C5 E5 G5 C5 G5 | D5 F#5 A5 D5 F#5 A5 D5 A5 D5 F#5 A5 D5 F#5 A5 D5 A5 | G4 B4 D5 G5 B4 D5 G4 D5 G4 B4 D5 G5 B4 D5 G4 D5') },
    { name: 'fiddle', wave: 'square', vol: .06, notes: bar('G5 - - A5 B5 - D6 - B5 - A5 - G5 - E5 - | E5 - G5 - C6 - - B5 A5 - G5 - E5 - G5 - | F#5 - A5 - D6 - - C6 B5 - A5 - F#5 - D5 - | G5 - B5 - D6 - B5 - G5 - - - . . D5 E5') },
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('G2 . . . D3 . . . G2 . . . D3 . . . | C3 . . . G2 . . . C3 . . . G2 . . . | D3 . . . A2 . . . D3 . . . A2 . . . | G2 . . . D3 . . . G2 . . . B2 . C3 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: bar('k . h . s . h . k . h k s . h . | k . h . s . h . k . h k s . h h') }] },
  lodgefire: { bpm: 84, steps: 4, tracks: [
    { name: 'harmonica', wave: 'square', vol: .045, notes: bar('D5 - - - E5 - G5 - - - E5 - D5 - - - | B4 - - - D5 - E5 - D5 - B4 - A4 - - - | G4 - - - A4 - B4 - D5 - - - B4 - A4 - | G4 - - - - - - - . . . . . . . .') },
    { name: 'chords', wave: 'triangle', vol: .1, notes: bar('G3 - - - - - - - D3 - - - - - - - | E3 - - - - - - - C3 - - - - - - - | C3 - - - - - - - D3 - - - - - - - | G3 - - - - - - - G3 - - - - - - -') },
    { name: 'brush', wave: 'drums', vol: .1, notes: bar('h . . . s . . . h . . h s . . .') }] },
  stalk: { bpm: 96, steps: 4, tracks: [
    { name: 'pad', wave: 'triangle', vol: .08, notes: bar('E3 - - - - - - - - - - - - - - - | C3 - - - - - - - - - - - - - - - | D3 - - - - - - - - - - - - - - - | B2 - - - - - - - - - - - - - - -') },
    { name: 'ostinato', wave: 'pulse12', vol: .026, notes: bar('E4 . B4 . G4 . B4 . E4 . B4 . G4 . B4 . | C4 . G4 . E4 . G4 . C4 . G4 . E4 . G4 . | D4 . A4 . F#4 . A4 . D4 . A4 . F#4 . A4 . | B3 . F#4 . D#4 . F#4 . B3 . F#4 . D#4 . F#4 .') },
    { name: 'drums', wave: 'drums', vol: .16, on: false, notes: bar('k . . . h . . . k . k . h . . . | k . . . h . . h k . k . h . h .') },
    { name: 'tension', wave: 'drums', vol: .2, on: false, notes: bar('k . k . . . . . k . k . . . . .') },
    { name: 'trem', wave: 'square', vol: .02, on: false, notes: bar('E5 E5 E5 E5 E5 E5 E5 E5 F5 F5 F5 F5 E5 E5 E5 E5 | C5 C5 C5 C5 C5 C5 C5 C5 D5 D5 D5 D5 C5 C5 C5 C5') }] },
  jamboree: { bpm: 160, steps: 4, tracks: [
    { name: 'fiddle', wave: 'square', vol: .06, notes: bar('D5 E5 F#5 G5 A5 - F#5 D5 E5 - C#5 A4 B4 C#5 D5 E5 | F#5 G5 A5 F#5 D5 - A4 - B4 D5 G5 - F#5 E5 D5 - | D5 E5 F#5 G5 A5 - F#5 D5 E5 - C#5 A4 B4 C#5 D5 E5 | F#5 E5 D5 C#5 D5 - A4 - D5 - - - . . A4 C#5') },
    { name: 'banjo', wave: 'pulse', vol: .045, notes: bar('D4 F#4 A4 D5 F#4 A4 D4 A4 | A3 C#4 E4 A4 C#4 E4 A3 E4 | G3 B3 D4 G4 B3 D4 G3 D4 | A3 C#4 E4 A4 C#4 E4 A3 E4') },
    { name: 'bass', wave: 'triangle', vol: .17, notes: bar('D3 . A2 . D3 . A2 . | A2 . E3 . A2 . E3 . | G2 . D3 . G2 . D3 . | A2 . E3 . A2 . C#3 .') },
    { name: 'drums', wave: 'drums', vol: .22, notes: bar('k h s h k h s h | k h s h k k s h') }] },
  results: { bpm: 110, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .055, notes: bar('C5 - E5 G5 - E5 C5 - D5 - F5 A5 - F5 D5 - | E5 - G5 C6 - G5 E5 - D5 - B4 G4 - - - - | C5 - E5 G5 - E5 C5 - F5 - A5 C6 - A5 F5 - | G5 - - E5 D5 - B4 - C5 - - - . . . .') },
    { name: 'bass', wave: 'triangle', vol: .16, notes: bar('C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . B2 .') },
    { name: 'drums', wave: 'drums', vol: .18, notes: bar('k . s . k k s . | k . s . k . s h') }] },
  fanfare: { bpm: 150, steps: 4, tracks: [{ wave: 'square', vol: .08, notes: 'G4 B4 D5 G5 - - D5 G5 - - - - - - - -' }, { wave: 'pulse', vol: .05, notes: 'D4 G4 B4 D5 - - B4 D5 - - - - - - - -' }, { wave: 'triangle', vol: .18, notes: 'G2 - - - - - D3 G2 - - - - - - - -' }] },
  siteclear: { bpm: 160, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 - - - - . . . .' }, { wave: 'triangle', vol: .16, notes: 'C3 - G3 C4 - - - - . . . .' }] },
  doe: { bpm: 70, steps: 4, tracks: [{ wave: 'saw', vol: .07, notes: 'D4 - - C#4 - - C4 - - B3 - - - - - - - -' }, { wave: 'triangle', vol: .12, notes: 'D3 - - C#3 - - C3 - - B2 - - - - - - - -' }] },
  escaped: { bpm: 120, steps: 4, tracks: [{ wave: 'square', vol: .06, notes: 'E5 - - C5 - - - - . . .' }] },
  newrecord: { bpm: 170, steps: 4, tracks: [{ wave: 'square', vol: .07, notes: 'C5 E5 G5 C6 E6 G6 - - E6 G6 C7 - - - - -' }, { wave: 'triangle', vol: .16, notes: 'C3 - G3 - C4 - - - G3 - C4 - - - - -' }] }
};
const NZ = (f, dur, vol, o = {}) => Object.assign({ wave: 'noise', freq: f, dur, vol }, o);
const SFX_DEFS = {
  dry: [NZ(5000, .02, .22, { filter: 'highpass' }), { wave: 'square', freq: 1500, dur: .012, vol: .08 }],
  pump: [NZ(1900, .035, .28, { q: 3 }), NZ(900, .07, .12, { to: 1500, delay: .04 }), NZ(2300, .035, .3, { q: 3, delay: .1 })],
  shell: [NZ(2700, .025, .2, { q: 4 }), { wave: 'square', freq: 950, dur: .015, vol: .05, delay: .01 }],
  scope: [NZ(1300, .12, .07, { to: 600 })], breathIn: [NZ(650, .5, .045, { to: 950, attack: .2 })], breathOut: [NZ(950, .7, .05, { to: 380, attack: .05 })],
  grunt: [{ wave: 'saw', freq: 92, to: 80, dur: .32, vol: .22, vib: [13, .09] }, { wave: 'saw', freq: 95, to: 78, dur: .28, vol: .2, vib: [13, .09], delay: .42 }],
  bugle: [{ wave: 'sine', freq: 520, to: 1850, dur: .9, vol: .16, vib: [6, .02] }, NZ(2400, .55, .07, { q: 6, delay: .55 }), { wave: 'sine', freq: 1850, to: 700, dur: .55, vol: .12, delay: 1.1 }, { wave: 'saw', freq: 220, to: 180, dur: .3, vol: .05, delay: 1.5, vib: [20, .1] }],
  moose: [{ wave: 'saw', freq: 68, to: 112, dur: .8, vol: .22, vib: [5, .06] }, { wave: 'saw', freq: 70, to: 52, dur: .4, vol: .16, delay: .85 }],
  fur: [{ wave: 'sine', freq: 120, to: 55, dur: .12, vol: .3 }, NZ(420, .08, .2, { filter: 'lowpass' })],
  wood: [{ wave: 'square', freq: 320, to: 260, dur: .04, vol: .14 }, NZ(900, .06, .2)],
  ricochet: [NZ(3500, .03, .18, { filter: 'highpass' }), { wave: 'sine', freq: 3200, to: 1100, dur: .42, vol: .09 }],
  thud: [NZ(320, .13, .26, { filter: 'lowpass' }), { wave: 'sine', freq: 70, to: 45, dur: .1, vol: .2 }],
  splash: [NZ(1300, .38, .2, { to: 380 }), NZ(3000, .15, .08, { filter: 'highpass', delay: .05 })],
  ping: [{ wave: 'sine', freq: 2800, to: 2400, dur: .3, vol: .12 }, { wave: 'square', freq: 1400, dur: .03, vol: .06 }],
  hoof: [NZ(220, .03, .07, { filter: 'lowpass' })],
  snort: [NZ(520, .22, .14, { to: 380 })], chirp: [{ wave: 'sine', freq: 1200, to: 1650, dur: .15, vol: .07 }],
  gobble: [{ wave: 'square', freq: 420, dur: .45, vol: .07, arp: [0, 5, 0, 7, 0, 5, 0, 3], step: .04 }],
  quack: [{ wave: 'saw', freq: 310, to: 220, dur: .14, vol: .1 }, { wave: 'saw', freq: 300, to: 210, dur: .14, vol: .09, delay: .2 }],
  caw: [{ wave: 'saw', freq: 720, to: 480, dur: .22, vol: .07 }, NZ(900, .2, .05)],
  chatter: [{ wave: 'square', freq: 1800, dur: .32, vol: .05, arp: [0, 3, 0, 3, 0, 5], step: .03 }],
  whistle: [{ wave: 'sine', freq: 2200, to: 2350, dur: .42, vol: .09 }],
  howl: [{ wave: 'sine', freq: 380, to: 720, dur: .8, vol: .08, vib: [5, .02] }, { wave: 'sine', freq: 720, to: 480, dur: .9, vol: .07, delay: .8, vib: [5, .02] }],
  loon: [{ wave: 'sine', freq: 600, to: 920, dur: .7, vol: .08, vib: [5, .02] }, { wave: 'sine', freq: 920, to: 700, dur: 1, vol: .07, delay: .7, vib: [6, .03] }],
  slap: [NZ(520, .16, .34, { filter: 'lowpass' }), NZ(1800, .3, .1, { to: 500, delay: .05 })],
  moo: [{ wave: 'saw', freq: 125, to: 98, dur: .95, vol: .12, vib: [4, .03] }],
  whirr: [NZ(180, .6, .2, { q: 2, to: 260 })], flap: [NZ(300, .08, .1, { filter: 'lowpass' })],
  clay: [NZ(3200, .12, .22, { filter: 'highpass' }), { wave: 'square', freq: 820, to: 300, dur: .06, vol: .08 }],
  bonk: [{ wave: 'square', freq: 210, to: 120, dur: .12, vol: .14 }, NZ(600, .05, .1)],
  splat: [NZ(820, .22, .28, { to: 300, filter: 'lowpass' })], throw: [NZ(700, .18, .08, { to: 1500 })],
  focus: [{ wave: 'square', freq: 1400, dur: .02, vol: .05 }], confirm: [{ wave: 'square', freq: 880, to: 1320, dur: .08, vol: .08 }], back: [{ wave: 'square', freq: 660, to: 440, dur: .08, vol: .07 }],
  tick: [{ wave: 'square', freq: 1800, dur: .014, vol: .045 }], whoosh: [NZ(420, .25, .08, { to: 2400 })],
  stink: [NZ(200, .3, .2, { filter: 'lowpass' }), { wave: 'saw', freq: 110, dur: .6, vol: .06, arp: [0, 1, 6], step: .2 }],
  slowmo: [NZ(2200, 1.2, .1, { to: 180 }), { wave: 'sine', freq: 90, to: 40, dur: 1.2, vol: .14 }],
  crash: [NZ(300, .9, .4, { filter: 'lowpass' }), NZ(1200, .5, .2, { delay: .05 }), { wave: 'square', freq: 90, to: 30, dur: .6, vol: .14 }],
  rockfall: [NZ(500, .9, .18, { filter: 'lowpass' }), NZ(1400, .2, .1, { delay: .2 }), NZ(1100, .2, .1, { delay: .45 }), NZ(900, .25, .1, { delay: .7 })],
  wind: [NZ(380, 4.2, .035, { attack: 1.6, filter: 'lowpass', to: 520 })], creek: [NZ(2400, 1.4, .016, { attack: .5, q: .5 })],
  bird: [{ wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .03 }, { wave: 'sine', freq: 3000, to: 2400, dur: .08, vol: .025, delay: .12 }],
  bird2: [{ wave: 'pulse12', freq: 2200, dur: .2, vol: .015, arp: [0, 4, 7, 4], step: .05 }], ice: [{ wave: 'sine', freq: 180, to: 900, dur: .5, vol: .03 }, NZ(3000, .08, .02, { delay: .3 })],
  bell: [{ wave: 'sine', freq: 1480, dur: .5, vol: .04 }, { wave: 'sine', freq: 2220, dur: .3, vol: .02 }]
};
const AMB = {
  hollow: [['wind', 3.6], ['creek', 1.2, .6], ['bird', 2.2], ['bird2', 5], ['caw', 11, .35]],
  bugle: [['wind', 3], ['chirp', 6, .5], ['bugle', 24, .12], ['bird', 7]],
  muskeg: [['wind', 3.2], ['loon', 14, .3], ['ice', 9], ['caw', 16, .25]],
  range: [['wind', 4], ['bird', 3]], lodge: []
};
const SFX = G.sfx = {
  amb: null, ambT: {}, layers: {},
  play(name, o = {}) { const v = SFX_DEFS[name]; if (v) G.game.audio.sfx(v, Object.assign({ vary: .04 }, o)); else G.game.audio.sfx(name, o); },
  /** the rifle: a crack, a thump, a tail, and the echo off the far side of the valley */
  shot(H) { const e = (H && H.hunt && H.hunt.echo) || [.35, .8], A = G.game.audio;
    A.sfx([NZ(2600, .05, .55, { filter: 'highpass' }), { wave: 'sine', freq: 62, to: 38, dur: .16, vol: .55 }, NZ(900, .6, .26, { filter: 'lowpass', to: 220 }), NZ(700, .32, .12, { filter: 'lowpass', delay: e[0], to: 260 }), NZ(480, .4, .06, { filter: 'lowpass', delay: e[1], to: 200 })], { vary: .05 }); },
  call(kind, actor, vol = 1) { const v = SFX_DEFS[kind === 'grunt' ? 'grunt' : kind === 'bugle' ? 'bugle' : 'moose']; if (actor) this.panned(v, actor, vol); else G.game.audio.sfx(v, { vol, vary: .02 }); },
  critter(voice, a) { const v = SFX_DEFS[voice]; if (v) this.panned(v, a, .8); },
  /** a sound placed left or right by where it is from the camera (a trophy's bugle from the timber) */
  panned(voices, a, vol = 1) {
    const A = G.game.audio, ctx = A.ctx, bus = A.bus && A.bus('sfx'); if (!ctx || !bus || A.muted || ctx.state !== 'running' || !G.hunt) { if (voices) A.sfx(voices, { vol }); return; }
    const L = G.hunt.lens, dx = a.x - L.x, dy = a.y - L.y, d = Math.hypot(dx, dy) || 1, pan = clamp((dx * L.Rx + dy * L.Ry) / d, -1, 1), dist = clamp(1 - d / (420 * M), .15, 1);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null, t0 = ctx.currentTime + .01;
    if (p) { p.pan.value = pan * .9; p.connect(bus); }
    for (const v of voices) {
      const g = ctx.createGain(), dur = v.dur || .2, t = t0 + (v.delay || 0), f0 = E.note(v.freq || 440);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((v.vol || .2) * vol * dist, t + (v.attack || .01)); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
      let src;
      if (v.wave === 'noise') { src = ctx.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = ctx.createBiquadFilter(); f.type = v.filter || 'bandpass'; f.frequency.value = f0; f.Q.value = v.q || 1.1; src.connect(f); f.connect(g); }
      else { src = ctx.createOscillator(); src.type = v.wave === 'saw' ? 'sawtooth' : ['square', 'triangle', 'sine'].includes(v.wave) ? v.wave : 'square'; src.frequency.setValueAtTime(f0, t); if (v.to) src.frequency.exponentialRampToValueAtTime(E.note(v.to), t + dur); if (v.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = v.vib[0]; lg.gain.value = f0 * v.vib[1]; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + dur + .05); } src.connect(g); }
      g.connect(p || bus); src.start(t); src.stop(t + dur + .05);
    }
  },
  music(name, o = {}) { const s = SONGS[name]; if (!s) return; if (G.game.audio.song === s && !o.restart) return; G.game.audio.music(s, { fade: o.fade === undefined ? .6 : o.fade, sync: false }); this.layers = {}; },
  stopMusic(f = .5) { G.game.audio.stopMusic(f); },
  layer(name, on) { if (this.layers[name] === on) return; this.layers[name] = on; if (G.game.audio.song === SONGS.stalk) G.game.audio.layer(name, on ? 1 : 0, on ? .6 : 1.2); },
  sting(name) { const s = SONGS[name]; if (s) G.game.audio.sting(Object.assign({}, s, { loop: false }), { at: 'now', duck: .35 }); },
  ambience(id) { this.amb = id; this.ambT = {}; },
  update(dt) {
    const bed = this.amb && AMB[this.amb]; if (!bed || G.game.paused) return;
    for (const [name, every, vol] of bed) { const k = name; this.ambT[k] = (this.ambT[k] === undefined ? fxr(every) : this.ambT[k]) - dt; if (this.ambT[k] <= 0) { this.ambT[k] = every * fxr(.6, 1.5); G.game.audio.sfx(SFX_DEFS[name], { vol: vol || .9, pitch: fxr(.85, 1.2), vary: .1 }); } }
  }
};
// what the game does, heard
bus.on('pump', () => SFX.play('pump')); bus.on('reload', () => {}); bus.on('shell', () => SFX.play('shell'));
bus.on('scope', () => SFX.play('scope')); bus.on('breathIn', () => SFX.play('breathIn')); bus.on('breathOut', () => SFX.play('breathOut'));
bus.on('impact', e => { const R = e.R; SFX.play(R.kind === 'water' ? 'splash' : R.kind === 'prop' ? (R.prop && R.prop.occ && R.prop.occ[0].k === 'sph' ? 'ricochet' : 'wood') : R.kind === 'ground' ? 'thud' : 'tick', { vol: clamp(1.2 - R.dist / 200, .3, 1) }); });
bus.on('hit', e => SFX.play(e.R.zone === 'antler' ? 'ping' : 'fur'));
bus.on('critter', e => { if (e.a.def.effect === 'stink') SFX.play('stink'); else if (e.a.def.voice) SFX.critter(e.a.def.voice, e.a); });
bus.on('jump', a => SFX.panned && a.cat === 'animal' && SFX.panned(SFX_DEFS.snort, a, .5));

/* ===== src/71-barks.js ===== */
// 71-barks: the emcee's short, loud calls and Uncle Dub's quieter tips: a caption, a gibberish voice, never the same
// line twice running; and what the HUD does when things happen (banners, score pops, flashes, stings).
const BARKS = {
  start: { p: 1, lines: ['BUCKS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!', '{n} BUCKS ON THE MOVE!'] },
  startBull: { p: 1, lines: ['BULLS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!', 'BIG BULLS ON THE MOVE!'] },
  kill: { p: 1, lines: ['NICE SHOT!', "BAGGED 'EM!", 'WHAT A SHOT!', 'DOWN HE GOES!', 'THAT ONE COUNTS!'] },
  wound: { p: 2, lines: ['GUT SHOT... FINISH HIM!', "HE'S HIT! FINISH IT!", 'STILL RUNNING! PUT HIM DOWN!'] },
  long: { p: 2, lines: ['LONG SHOT! CALL THE PAPER!', 'FROM THE NEXT COUNTY!', 'LONG SHOT!'] },
  running: { p: 2, lines: ['RUNNING SHOT!', 'ON THE RUN!', 'LED HIM PERFECT!'] },
  quick: { p: 2, lines: ['QUICK DRAW!', 'FASTEST GUN IN THE HOLLER!'] },
  double: { p: 3, lines: ['DOUBLE!', 'TWO FOR TWO!'] },
  triple: { p: 3, lines: ['TRIPLE! THE CROWD GOES MILD!', 'TRIPLE!!'] },
  miss: { p: 0, lines: ['MISSED HIM CLEAN!', "THAT'S A LOT OF DIRT YOU KILLED!", "MISSED! HE'S LAUGHING AT YOU!"] },
  bark: { p: 0, lines: ["BARK'S DEAD, BUCK AIN'T!", 'YOU GOT THE TREE!', 'TIMBER!'] },
  pump: { p: 2, lines: ['PUMP IT!', 'RACK IT, HOSS!'] },
  reload: { p: 1, lines: ['RELOAD, HOSS!', 'FEED THAT TUBE!'] },
  doe: { p: 4, lines: ["DOE! YOU'RE OUT!", "THAT'S A DOE! HOLSTER UP!", 'AW, NOT MAMA!'] },
  fawn: { p: 4, lines: ['A FAWN?! GO SIT IN THE TRUCK!', "THAT'S A BABY! YOU'RE DONE!"] },
  cow: { p: 4, lines: ["THAT'S A COW! YOU'RE OUT!", 'NO HORNS, NO SHOOTIN\'!'] },
  stink: { p: 4, lines: ['OH, THE STINK!', 'P-U! SKUNKED!'] }, bessie: { p: 4, lines: ["THAT'S BESSIE!!", 'NOT THE COW!'] },
  eagle: { p: 4, lines: ["THAT'S THE NATIONAL BIRD, BUDDY!", 'NOT THE EAGLE!'] }, loon: { p: 4, lines: ['NOT THE LOON!', 'LEAVE THE LOONS BE!'] },
  escape: { p: 2, lines: ["HE'S GETTIN' AWAY!", 'GONE LIKE A RUMOR!', 'THERE HE GOES...'] },
  lost: { p: 2, lines: ['WOUNDED AND LOST...', 'HE GOT AWAY HURT. SHAME.'] },
  trophy: { p: 4, lines: ['TROPHY SPOTTED!'] },
  clear: { p: 3, lines: ['SITE CLEAR!', 'CLEANED HOUSE!'] }, time: { p: 3, lines: ['TIME!', "THAT'S TIME!"] }, sweep: { p: 4, lines: ['CLEAN SWEEP!'] },
  critter: { p: 1, lines: ['CRITTER BONUS!', 'BONUS CRITTER!'] }, squirrel: { p: 1, lines: ['SQUIRREL!', 'GOT THE SQUIRREL!'] }, turkey: { p: 2, lines: ['TURKEY DINNER!', 'GOBBLE GOBBLE!'] },
  tipTree: { p: 0, who: 'dub', lines: ['Wait for him to clear that tree.', 'Trees soak up a lot of lead.'] },
  tipBreath: { p: 0, who: 'dub', lines: ['Hold your breath. Steady as a church pew.', "Breathe out, then squeeze. Don't yank."] },
  tipCall: { p: 0, who: 'dub', lines: ['Give him a call. He\'ll stop to listen.', 'Call him. Make him curious.'] },
  tipLead: { p: 0, who: 'dub', lines: ['Lead the runners a hair.', 'Aim where he\'s going, not where he was.'] }
};
const Barks = G.barks = {
  last: {}, at: -9, cur: 0, recent: [],
  say(cat, o = {}) {
    const B = BARKS[cat]; if (!B) return false;
    const now = G.game.real; if (now - this.at < 1.2 && B.p <= this.cur) return false;
    const r = FX(), last = this.last[cat] || [];
    let line = pickNoRepeat(B.lines, last, r); this.last[cat] = [line].concat(last).slice(0, 2);
    if (o.n !== undefined) line = line.replace('{n}', ['NO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][o.n] || String(o.n)); else line = line.replace('{n} ', '');
    const who = B.who || o.who || 'emcee';
    this.caption(who, line); this.at = now; this.cur = B.p;
    this.recent.push(cat); if (this.recent.length > 30) this.recent.shift();
    return line;
  },
  caption(who, line, o = {}) { const C = CAST[who] || CAST.emcee; HUD.caption(C.name, line, C.color, o.dur); G.bab.say(line, C.voice, { vol: who === 'emcee' ? 1 : .8 }); bus.emit('bark', { who, line }); }
};
// the HUD and the sound, reacting
bus.on('playStart', site => { if (!G.hunt || G.hunt.mode === 'attract' && false) return; Barks.say(G.hunt.species === 'whitetail' ? 'start' : 'startBull', { n: site.def.bucks }); });
bus.on('kill', e => {
  const k = e.kill, p = e.p, Z = ZONES[k.zone] || ZONES.body, H = G.hunt;
  if (Z.lethal && Z.call) HUD.banner(Z.call, { scale: 3 });
  HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20) * T('animalScale'), '+' + fmt(k.points) + (k.shared ? ' SHARED!' : ''), p.color, { sub: Z.label + ' ' + Math.round(k.dist) + ' M' });
  if (!H || !H.hubMode) G.game.freeze(.04); if (p.input.rumble) p.input.rumble(.6, .15);
  if (k.multiN >= 3) Barks.say('triple'); else if (k.multiN === 2) Barks.say('double');
  else if (k.dist >= 150) Barks.say('long'); else if (k.running) Barks.say('running'); else if (k.quick) Barks.say('quick'); else Barks.say('kill');
  if (k.multiN >= 2) HUD.banner(k.multiN >= 3 ? 'TRIPLE!' : 'DOUBLE!', { scale: 3, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'] });
  if (H && H.site && H.site.bucksSpawned.length && H.site.bucksSpawned.every(a => a.resolved && !a.escaped && !a.lost) && H.site.def.bucks <= H.site.bucksSpawned.length) G.sfx && G.sfx.sting('siteclear');
});
bus.on('wound', e => { HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20), (ZONES[e.R.zone] || ZONES.body).call || 'HIT', '#ffd04a'); Barks.say('wound'); });
bus.on('ping', e => { HUD.pop(e.a.x, e.a.y, e.a.z + (e.a.rig.height || 20) * 1.1, 'ANTLER PING!', '#e8dcc0'); });
bus.on('miss', e => { const R = e.R; if (R.kind === 'prop' && FX()() < .5) Barks.say(FX()() < .5 ? 'bark' : 'tipTree'); else if (FX()() < .22) Barks.say('miss'); });
bus.on('dry', p => { if (p.rifle.dryCount <= 2) Barks.say('pump'); });
bus.on('reload', p => { if (FX()() < .25) Barks.say('reload'); });
bus.on('doe', e => {
  const a = e.a; G.game.flash('#ff2a1a', .25, .7); if (G.sfx) G.sfx.sting('doe');
  HUD.banner(e.benched ? (a.young ? (a.sp.id === 'whitetail' ? 'A FAWN?!' : 'A CALF?!') : a.sp.id === 'whitetail' ? "DOE! YOU'RE OUT!" : "COW! YOU'RE OUT!") : '-300 ' + a.label + '!', { scale: 3, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] });
  Barks.say(a.young ? 'fawn' : a.sp.id === 'whitetail' ? 'doe' : 'cow');
  if (e.p.input.rumble) e.p.input.rumble(.9, .4);
});
bus.on('critter', e => { const a = e.a, C = a.def; if (e.protected) { HUD.banner(fmt(e.points) + ' ' + C.label.toUpperCase() + '!', { scale: 2, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] }); Barks.say(C.bark); if (G.sfx) G.sfx.sting('escaped'); } else { HUD.pop(a.x, a.y, a.z + 1.2 * M, '+' + fmt(e.points) + ' ' + C.label.toUpperCase(), e.p.color); Barks.say(C.bark === 'squirrel' || C.bark === 'turkey' ? C.bark : 'critter'); } });
bus.on('escape', a => { Barks.say('escape'); if (G.sfx) G.sfx.sting('escaped'); });
bus.on('lost', a => { Barks.say('lost'); });
bus.on('siteEnd', site => { Barks.say(site.endReason === 'clear' ? 'clear' : 'time'); });
bus.on('trophySpotted', a => { const tr = has('trophy', a.trophy) ? reg('trophy', a.trophy) : null; HUD.banner('TROPHY!', { scale: 3, sub: tr ? tr.name.toUpperCase() : '', colors: ['#fff6d8', '#ffd040', '#c87a10'] }); Barks.caption('emcee', tr && tr.spotted || 'TROPHY SPOTTED!'); if (G.sfx) G.sfx.layer('tension', true); });
bus.on('appear', a => { if (G.sfx && a.cat === 'animal' && a.target) G.sfx.layer('drums', true); });
bus.on('scope', p => { if (G.hunt && G.hunt.site && G.hunt.actors.some(a => a.target && a.alive && Math.hypot(a.x - G.hunt.cam.x, a.y - G.hunt.cam.y) > 90 * M)) { if (!HUD.tip('breath', 'breath', 'HOLD TO STEADY', { times: 3, p })) {} } });
bus.on('spook', a => { if (a.target && G.hunt && G.hunt.players.some(p => p.call.charges > 0) && G.hunt.site) HUD.tip('call', 'call', 'CALL TO STOP HIM', { times: 3 }); });

/* ===== src/80-hollow.js ===== */
// 80-hollow: HOLLOW CREEK, an autumn morning in the hardwoods: whitetails, Granny Mae's farm, the creek, Fog Glade.
const HOLLOW_CREEK = [[505, -20], [492, 110], [526, 250], [512, 360], [528, 425], [556, 520], [598, 640], [584, 780], [622, 900], [640, 1040]];
const HOLLOW_CORN = [[700, 560], [862, 556], [866, 682], [702, 688]];
const HOLLOW_PASTURE = [[598, 556], [698, 558], [700, 690], [600, 694]];
const HOLLOW_YARD = [[760, 700], [920, 700], [924, 800], [764, 806]];
const hollowN = E.makeNoise(1101 * 5 + 1);
def('hunt', 'hollow', {
  name: 'Hollow Creek', species: 'whitetail', seed: 1101, order: 1, when: 'Autumn morning', blurb: 'Whitetails in the hardwoods, mist on the creek.',
  sun: { yaw: -20, elev: 13, color: '#ffe2b8', ambient: '#7a84a4', r: 6, glow: '#ffe0b0', disc: '#fff4dc' },
  fog: { color: '#d4d8dc', near: 140, far: 1500 }, mist: { top: 46, color: '#e6e4e0', density: .55, range: 90 },
  sky: { sky: ['#6a98d8', '#a8c4e4', '#e8d8c8', '#f4d0a8'], layers: [
    { kind: 'clouds', color: '#fbf0e4', y: .16, height: .1, parallax: .02, drift: 2 },
    { kind: 'hills', color: '#9aa6bc', y: .47, height: .1, parallax: .03 },
    { kind: 'hills', color: '#8a90a0', y: .5, height: .08, parallax: .05, seed: 9 }] },
  water: { deep: '#2a4446', shallow: '#4a6a62', sky: '#b8c8d0', foam: '#e8ecec' },
  grade: { mul: '#fff4ea', add: '#060402', gamma: .96 },
  outline: '#2a1a10', weather: { kind: 'leaves', amount: .1 }, ambience: 'hollow', host: 'granny', call: 'grunt',
  terrain: { base: { amp: 13, scale: 230, octaves: 5, warp: 40, offset: 40 }, features: [
    { kind: 'valley', path: HOLLOW_CREEK, width: 60, depth: 7 },
    { kind: 'ridge', path: [[230, 110], [255, 330], [248, 520], [228, 700], [252, 900]], height: 15, width: 52 },
    { kind: 'ridge', path: [[760, 260], [900, 330], [1000, 300]], height: 9, width: 70 },
    { kind: 'flatten', poly: HOLLOW_CORN, z: 'avg', falloff: 26 },
    { kind: 'flatten', poly: HOLLOW_PASTURE, z: 'avg', falloff: 18, mark: 64 },
    { kind: 'flatten', poly: HOLLOW_YARD, z: 'avg', falloff: 22, mark: 128 },
    { kind: 'field', poly: HOLLOW_CORN },
    { kind: 'flatten', poly: [[255, 160], [345, 150], [360, 235], [270, 262]], z: 'avg', falloff: 30, mark: 32 },
    { kind: 'river', path: HOLLOW_CREEK, width: 7, depth: 1.1, banks: 6, drop: .6, fall: .004, ford: [[528, 425, 8]] },
    { kind: 'trail', path: [[420, 430], [500, 428], [528, 425], [560, 426], [640, 440]], width: 2 },
    { kind: 'trail', path: [[560, 470], [600, 560], [650, 640], [676, 668]], width: 1.6 },
    { kind: 'trail', path: [[700, 700], [760, 740], [820, 740]], width: 2.4 },
    { kind: 'plateau', at: [676, 668], r: 3, falloff: 10 },
    { kind: 'plateau', at: [252, 470], r: 4, dz: .4, falloff: 8 }] },
  types: c => c.water ? GT.mud : c.mask & 16 ? (c.n2 > .3 ? GT.shore : GT.mud) : c.mask & 1 ? GT.soil : c.mask & 128 ? GT.yard : c.mask & 2 ? GT.dirt : c.mask & 64 ? GT.pasture : c.slope > .75 ? GT.rock : c.wdist < 14 ? (c.n > .1 ? GT.dry : GT.grass) : c.forest > .45 ? GT.leaves : c.n > .3 ? GT.dry : GT.grass,
  forest: c => hollowForest(c), farForest: (x, y) => .25 + .6 * (.5 + .5 * hollowN(x / 160, y / 160)),
  crop: c => c.mask & 1 && !(c.mask & 2) ? 2.2 + c.n2 * .3 : 0,
  canopy: { min: 11, max: 18 },
  palette: {
    types: { 0: { a: '#6e8236', b: '#93964a', c: '#c0ac52', speck: .07, scale: 5 }, 1: { a: '#a89a50', b: '#b4a45a', c: '#c8b46a', speck: .05, scale: 6 }, 2: { a: '#8a5a2a', b: '#a06a2e', c: '#c8481e', speck: .12, scale: 4 },
      3: { a: '#8a6a44', b: '#7a5e3c', scale: 3 }, 4: { a: '#86827a', b: '#9a958a', scale: 3 }, 6: { a: '#5e4c34', b: '#6a5638', scale: 3 }, 10: { a: '#7a5a3a', b: '#8a6a44', scale: 2 }, 12: { a: '#8a7a62', b: '#9a8a70', c: '#b0a088', speck: .2, scale: 2 },
      14: { a: '#668636', b: '#86984a', c: '#e8e4a0', speck: .03, scale: 5 }, 15: { a: '#8a7458', b: '#9a8264', scale: 4 }, 5: { a: '#8a867e', b: '#9a968e' }, 13: { a: '#6a5a3a', b: '#7a6a44' } },
    canopy: ['#a8421c', '#c86a2a', '#8a7a2a'], crop: { 10: { c: ['#a88a4a', '#c8a85a', '#d8bc6a'], rows: true, rowsDeg: 90 } },
    farTypes: (h, s, n) => s > .6 ? GT.rock : n > .2 ? GT.dry : GT.grass
  },
  scatter: [
    { where: c => c.forest * .95, spacing: 6.5, mix: [['oak', .42], ['maple', .32], ['birch', .26]], scale: [.8, 1.2], inFan: .5 },
    { where: c => (c.mask & 233) || c.water ? 0 : c.forest < .2 ? .02 : 0, spacing: 22, mix: [['oak', .6], ['maple', .4]], scale: [.9, 1.25] },
    { where: c => (c.mask & 233) || c.water || hollowNearField(c) ? 0 : (c.forest > .15 && c.forest < .7 ? .5 : c.forest < .15 ? .06 : .12), spacing: 7, mix: [['bush', .55], ['sumac', .3], ['fern', .15]], fanMargin: 0 },
    { where: c => (c.mask & 1) || c.water || hollowNearField(c) ? 0 : c.wdist < 12 ? .55 : (c.mask & 64) ? .08 : c.forest < .3 ? .16 : 0, spacing: 3.2, prop: 'tallgrass', fanMargin: -6, fanP: .55, clearR: 6 },
    { where: c => (c.mask & 1) && c.r < .99 ? hollowCornEdge(c) : 0, spacing: 1.7, prop: 'corn', fanMargin: -100, fanP: 1 },
    { where: c => (c.mask & 233) || c.water || hollowNearField(c) ? 0 : c.forest > .3 ? .05 : .01, spacing: 16, mix: [['log', .5], ['rock', .3], ['stump', .2]], fanMargin: 2 },
    { where: c => c.type === GT.rock ? .3 : 0, spacing: 7, prop: 'rock' }
  ],
  vantages: {
    creekStand: { at: [542, 455], eye: 4.6, yaw: -100, kind: 'treestand', name: 'the creek stand' },
    fieldBlind: { at: [676, 668], eye: 1.35, yaw: -95, kind: 'blind', name: 'the cornfield blind' },
    ridgeRock: { at: [252, 470], eye: 2.3, yaw: 10, kind: 'rock', name: 'the ridge outcrop' },
    gladeEdge: { at: [306, 300], eye: 1.7, yaw: -92, kind: 'ground', name: 'the edge of Fog Glade' },
    porch: { at: [820, 728], eye: 2.2, yaw: -90, kind: 'porch', name: "Granny Mae's porch" },
    overlook: { at: [560, 1000], eye: 70, yaw: -95, kind: 'air' }
  },
  props: [
    ['farmhouse', [820, 744], { facing: 0 }], ['barn', [886, 772], { facing: 0 }], ['shed', [770, 776], { facing: 0 }], ['haybale', [860, 748]], ['haybale', [866, 752]], ['haybale', [902, 742]],
    ['stand', [544, 458]], ['sign', [690, 700]], ['boulder', [254, 474]], ['boulder', [247, 466]],
    ...Array.from({ length: 15 }, (_, i) => ['fence', [699, 686 - i * 8.6], { facing: Math.PI / 2 }]),
    ...Array.from({ length: 11 }, (_, i) => ['fence', [604 + i * 8.6, 692], { facing: 0 }])
  ],
  sites: ['hollow-1', 'hollow-2', 'hollow-3'], trophy: 'iron-rack', bonus: 'crow-patrol', par: 6200,
  rivals: { earl: 3400, loretta: 5300, dwayne: 6300 },
  intro: 'hollow-intro', outro: 'hollow-outro', legendBeat: 'iron-rack-legend', bonusBeat: 'crow-patrol-brief',
  establish: { from: [560, 1000, 70, -95], to: [560, 760, 45, -100], secs: 7 }
});
function hollowForest(c) {
  const base = .5 + .5 * hollowN(c.x / 140, c.y / 140), d = c.mask & 233 ? 0 : 1, glade = Math.hypot(c.x - 305, c.y - 205) < 70 ? 0 : 1;
  const ridge = Math.abs(c.x - 245) < 120 ? .35 : 0, creek = c.wdist < 10 ? 0 : 1;
  return clamp((base - .35) * 2.2 + ridge, 0, 1) * d * glade * creek;
}
function hollowNearField(c) { return c.x > 680 && c.x < 885 && c.y > 535 && c.y < 708 && E.polyDist(c.x, c.y, HOLLOW_CORN) < 6; }
function hollowCornEdge(c) { const d = E.polyDist(c.x, c.y, HOLLOW_CORN); return d < 3.5 ? .9 : 0; }

/* ---------- the sites ---------- */
def('site', 'hollow-1', {
  hunt: 'hollow', name: 'Creek Crossing', vantage: 'creekStand', frame: { bearings: [-38, 38], fov: 27, pitch: 4.5 }, distances: [16, 58], time: 60, bucks: 3,
  director: [[0, { bearing: -16 }], [4, { bearing: 4, dur: 6, ease: 'inOutSine' }], [10, { mode: 'follow' }]],
  props: [['log', [-24, 27]], ['bush', [16, 30]], ['tallgrass', [-6, 20]], ['tallgrass', [9, 22]], ['oak', [-36, 48], { variant: 1 }], ['maple', [34, 52]], ['birch', [26, 40]], ['rock', [-12, 38]]],
  critters: [['squirrel', { tree: [34, 44], at: 9 }], ['rabbit', { path: [[22, 17], [8, 15], [-4, 19]], at: 21 }]],
  script: function* (S) {
    yield 1.2; S.bark('start');
    const doe = S.pattern('cross', { kind: 'doe', path: [[-46, 42], [-16, 33], [14, 35], [44, 48]], gait: 'walk', stop: [.45, 2.2] });
    S.pattern('cross', { kind: 'fawn', follow: doe, back: 2.4 });
    yield 5;
    S.pattern('graze', { kind: 'buck', points: S.rng.int(5, 7), from: [42, 52], at: [14, 30], secs: 4.5, exit: [-44, 46] });
    yield E.any([E.until(() => S.bucksLeft <= 2), 15]);
    S.pattern('herdPass', { kinds: ['buck', 'doe', 'buck'], path: [[44, 30], [10, 34], [-16, 33], [-46, 40]], gait: 'bound', spacing: 5, points: [S.rng.int(6, 8), 0, S.rng.int(7, 9)], splash: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'hollow-2', {
  hunt: 'hollow', name: 'Cornfield Edge', vantage: 'fieldBlind', frame: { bearings: [-34, 40], fov: 24, pitch: 2.5 }, distances: [30, 95], time: 70, bucks: 4,
  director: [[0, { bearing: 26 }], [4, { bearing: 6, dur: 6 }], [12, { mode: 'follow' }]],
  props: [['haybale', [-10, 40]], ['bush', [-28, 52]], ['oak', [-38, 92]], ['tallgrass', [6, 31]], ['tallgrass', [-18, 34]]],
  critters: [['turkey', { path: [[-30, 60], [-8, 56], [10, 62]], at: 6, flock: 3 }], ['skunk', { path: [[18, 38], [0, 34], [-20, 40]], at: 30 }], ['bessie', { pos: [-14, 70], at: 0 }]],
  script: function* (S) {
    yield 1; S.bark('start');
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(5, 7), cover: [30, 62], path: [[30, 62], [8, 58], [-20, 64], [-40, 84]], gait: 'run' });
    S.pattern('emerge', { kind: 'doe', cover: [32, 70], path: [[32, 70], [6, 66], [-24, 70], [-42, 90]], gait: 'run', delay: .6 });
    yield E.any([E.until(() => S.resolved >= 1), 12]);
    yield 2.5;
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(6, 8), cover: [22, 48], path: [[22, 48], [0, 46], [-26, 56], [-40, 72]], gait: 'run', jump: .55 });
    S.pattern('emerge', { kind: 'buck', points: S.rng.int(4, 6), cover: [26, 54], path: [[26, 54], [4, 50], [-22, 60], [-42, 78]], gait: 'run', delay: .9 });
    yield E.any([E.until(() => S.resolved >= 3), 16]);
    yield 2;
    S.pattern('decoyDoe', { path: [[38, 80], [10, 74], [-20, 80], [-44, 96]] });
    yield 2.2;
    S.pattern('emerge', { kind: 'buck', points: 10, cover: [36, 78], path: [[36, 78], [12, 72], [-16, 78], [-42, 94]], gait: 'trot', stop: [.4, 1.8], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'hollow-3', {
  hunt: 'hollow', name: 'Hardwood Ridge', vantage: 'ridgeRock', frame: { bearings: [-32, 32], fov: 26, pitch: 9 }, distances: [22, 75], time: 75, bucks: 4, fanTrees: .22,
  director: [[0, { bearing: -10 }], [6, { bearing: 8, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['oak', [-14, 34]], ['maple', [8, 44]], ['oak', [22, 30]], ['birch', [-26, 56]], ['birch', [16, 62]], ['log', [-4, 40]], ['bush', [28, 50]], ['oak', [-30, 26]], ['maple', [-6, 66]]],
  critters: [['raccoon', { log: [-4, 40], at: 12 }], ['squirrel', { tree: [-14, 34], at: 5 }], ['squirrel', { tree: [22, 30], at: 34 }]],
  script: function* (S) {
    yield 1; S.bark('start');
    S.pattern('cross', { kind: 'buck', points: S.rng.int(6, 8), path: [[-40, 50], [-18, 46], [-2, 52], [16, 46], [38, 56]], gait: 'walk', stop: [.35, 2] });
    S.pattern('cross', { kind: 'doe', path: [[-40, 60], [-14, 58], [10, 60], [40, 66]], gait: 'walk', delay: 2.5 });
    S.pattern('bolt', { kind: 'buck', points: S.rng.int(7, 9), bed: [-4, 43], path: [[-4, 43], [10, 50], [36, 66]], after: 14 });
    yield E.any([E.until(() => S.resolved >= 2), 16]);
    yield 2;
    S.pattern('decoyDoe', { path: [[38, 40], [12, 36], [-14, 40], [-40, 48]], gait: 'trot' });
    yield 1.6;
    S.pattern('cross', { kind: 'buck', points: S.rng.int(5, 8), path: [[38, 44], [12, 40], [-14, 44], [-40, 54]], gait: 'trot' });
    yield E.any([E.until(() => S.resolved >= 3), 14]);
    S.pattern('cross', { kind: 'buck', points: S.rng.int(8, 10), path: [[40, 70], [14, 64], [-10, 68], [-40, 72]], gait: 'walk', stop: [.5, 2.5], big: true });
    yield E.until(() => S.allResolved);
  }
});

/* ---------- the trophy: Old Iron Rack, in Fog Glade ---------- */
def('trophy', 'iron-rack', {
  hunt: 'hollow', name: 'Old Iron Rack', spotted: "THAT'S OLD IRON RACK!", species: 'whitetail', vantage: 'gladeEdge', frame: { bearings: [-30, 30], fov: 24, pitch: 2.5 }, distances: [55, 110], fan: [10, 110], time: 45, bucks: 1,
  director: [[0, { bearing: -10 }], [3, { bearing: -12, dur: 2 }], [12, { bearing: 6, dur: 4 }], [24, { bearing: -4, dur: 4 }]],
  props: [['oak', [-30, 70]], ['maple', [24, 64]], ['oak', [-12, 104]], ['birch', [10, 108]], ['bush', [-20, 80]], ['bush', [14, 78]], ['oak', [32, 96]]],
  windows: [[4, [[-30, 94], [-12, 88], [-2, 90]]], [15, [[18, 76], [4, 70], [-10, 72]]], [27, [[-22, 100], [-6, 96], [10, 98]]]],
  mount: { x: 0, label: 'OLD IRON RACK', story: 'Fourteen points, a kicker and a drop tine. Walked the fog in Fog Glade.' },
  script: function* (S) {
    const D = reg('trophy', 'iron-rack'), H = S.site.H;
    const A = S.spawn('buck', { points: 14, kicker: true, drop: true, trophy: 'iron-rack', antlerMul: 1.2, size: 1.12, hidden: true, delay: 1e9, path: D.windows[0][1], orders: [['hold']], calm: 9 });
    H.trophyActor = A; S.site.windowIdx = -1;
    for (let w = 0; w < 3; w++) {
      yield E.until(() => S.time >= D.windows[w][0] || !A.alive && A.state !== 'hidden');
      if (A.resolved) break;
      S.site.windowIdx = w; A.bolted = false;
      trophyShow(A, S.site.pts(D.windows[w][1]), [['walk', { to: .55 }], ['look', { secs: .9 }], ['walk', { to: 1 }], ['hold']]);
      if (w === 2) S.pattern('cross', { kind: 'doe', path: [[16, 80], [0, 76], [-18, 80], [-34, 88]], gait: 'walk', calm: 9 });
      yield E.any([3.5, E.until(() => A.bolted || A.resolved)]);
      if (A.resolved) break;
      if (A.bolted) { A.orders = [['run', { to: 1 }], ['hold']]; A.nextOrder(); yield .8; }
      S.site.windowIdx = -1; if (w < 2) trophyHide(A); else A.goneOut();
    }
    yield E.until(() => S.allResolved);
  },
  rules: {
    hear(a, heard, near) { a.bolted = true; a.fear = 0; },
    call(a, c) { const s = G.hunt.site; if (s.windowIdx === 2 && !a.calledOnce && a.state !== 'hidden') { a.calledOnce = true; a.frozenT = 1.0; a.lookAt = { x: c.x, y: c.y, z: 0 }; return true; } return false; },
    update(H, site, dt) { const open = site.windowIdx >= 0, k = site.fogK = E.approach(site.fogK === undefined ? 0 : site.fogK, open ? 0 : 1, dt * (open ? 1.6 : .5)); const F = H.world.fogFor(); H.world.vista.setLook({ fog: { color: '#e6e6e2', near: lerp(F.near, 18 * M, k), far: lerp(F.far, 135 * M, k), max: lerp(F.max, .97, k), fill: k > .35 } }); }
  }
});

/* ===== src/81-bugle.js ===== */
// 81-bugle: BUGLE RIDGE, elk country at dusk: a high meadow ringed by aspens, a valley with a talus slope across it, a
// timberline saddle against the sunset, a lake below catching it. The Duke answers calls from the dark timber.
const bugleN = E.makeNoise(2202 * 5 + 1);
const BUGLE_MEADOW = [[400, 380], [600, 370], [640, 520], [420, 540]];
def('hunt', 'bugle', {
  name: 'Bugle Ridge', species: 'elk', seed: 2202, order: 2, when: 'Alpine dusk', blurb: 'Bull elk bugling down the high meadows.',
  sun: { yaw: 178, elev: 9, color: '#ffc088', ambient: '#9088b8', r: 8, glow: '#ff9a5a', disc: '#ffe0b0' },
  fog: { color: '#d8a0a0', near: 240, far: 2000 }, mist: { top: 118, color: '#c8a0b8', density: .25, range: 300 },
  sky: { sky: ['#1e2a5a', '#5a4a8a', '#c86a7a', '#f0a070', '#f8c888'], stars: 30, starsY: .25, layers: [
    { kind: 'clouds', color: '#f0a090', y: .2, height: .1, parallax: .02, drift: 2 },
    { kind: 'mountains', color: '#6a5a8a', y: .4, height: .2, parallax: .02, snow: '#f8d8e0' },
    { kind: 'mountains', color: '#4a3a6a', y: .47, height: .12, parallax: .04, seed: 11, snow: '#e8c0c8' }] },
  water: { deep: '#3a3058', shallow: '#6a5070', sky: '#e8a088', foam: '#f0d8d0' },
  grade: { mul: '#fff0e8', add: '#0a0408', gamma: 1.02 },
  outline: '#ff8a40', weather: null, ambience: 'bugle', host: 'loretta', call: 'bugle', echo: [.55, 1.15],
  terrain: { base: { amp: 34, scale: 330, octaves: 5, warp: 60, offset: 130, ridged: .35 }, features: [
    { kind: 'valley', path: [[120, 690], [400, 665], [700, 655], [960, 625]], width: 60, depth: 14 },
    { kind: 'ridge', path: [[120, 800], [450, 790], [800, 780], [1000, 760]], height: 16, width: 55 },
    { kind: 'ridge', path: [[170, 60], [185, 260], [178, 330]], height: 34, width: 45 }, { kind: 'ridge', path: [[178, 530], [170, 760], [160, 980]], height: 34, width: 45 },
    { kind: 'ridge', path: [[178, 330], [178, 530]], height: 14, width: 40 },
    { kind: 'flatten', poly: BUGLE_MEADOW, z: 'avg', falloff: 50, mark: 64 },
    { kind: 'plateau', at: [505, 588], r: 7, z: [520, 455, 7], falloff: 34 },
    { kind: 'lake', center: [660, 900], radii: [160, 80], depth: 6, shore: 30 },
    { kind: 'plateau', at: [565, 604], r: 6, z: [565, 560, 6], falloff: 24 }, { kind: 'mark', poly: [[420, 705], [720, 700], [730, 785], [410, 790]], bit: 32 },
    { kind: 'plateau', at: [600, 822], r: 7, falloff: 18 },
    { kind: 'trail', path: [[300, 430], [400, 470], [505, 588], [565, 604], [600, 822]], width: 1.6 }] },
  types: c => c.water ? GT.mud : c.mask & 16 ? GT.shore : c.mask & 32 ? (c.n2 > .1 ? GT.talus : GT.rock) : c.mask & 2 ? GT.dirt : c.slope > .9 ? GT.talus : c.slope > .62 ? GT.rock : c.h > 200 ? GT.snow : c.mask & 64 ? GT.dry : c.forest > .5 ? GT.needles : c.n > .2 ? GT.dry : GT.grass,
  forest: c => { const n = .5 + .5 * bugleN(c.x / 160, c.y / 160); if (c.mask & 88 || c.water || c.slope > .8 || c.h > 190) return 0; const ring = Math.hypot(c.x - 510, c.y - 450); return clamp((n - .38) * 2.4 + (ring > 150 && ring < 230 ? .5 : 0) + (c.x > 760 && c.x < 980 && c.y > 330 && c.y < 560 ? .7 : 0) - (c.x > 690 && c.x < 790 && c.y > 380 && c.y < 480 ? 1 : 0), 0, 1); },
  farForest: (x, y, h) => h > 180 ? 0 : .3 + .5 * (.5 + .5 * bugleN(x / 200, y / 200)),
  canopy: { min: 12, max: 22 },
  palette: {
    types: { 0: { a: '#909a44', b: '#a8a44c', c: '#d0b850', speck: .06, scale: 6 }, 1: { a: '#c0a84e', b: '#d4bc62', c: '#ead080', speck: .07, scale: 5 }, 3: { a: '#8a6a4a', b: '#7a5a40' }, 4: { a: '#8a8290', b: '#9a92a0', scale: 3 }, 5: { a: '#9a96a0', b: '#7a7680', c: '#b8b4bc', speck: .3, scale: 2 },
      6: { a: '#5a4a3a', b: '#6a5a44' }, 8: { a: '#e8e0ec', b: '#d8d0e0' }, 12: { a: '#8a7a6a', b: '#9a8a7a' }, 13: { a: '#5a5034', b: '#6a5e3c', scale: 4 } },
    canopy: ['#1e3a30', '#2a4a38', '#3a5a40'],
    farTypes: (h, s, n) => h > 190 ? GT.snow : s > .7 ? GT.rock : n > .2 ? GT.dry : GT.grass
  },
  scatter: [
    { where: c => c.forest * .9, spacing: 6.5, mix: [['spruce', .55], ['fir', .45]], scale: [.8, 1.25], inFan: .5 },
    { where: c => { const r = Math.hypot(c.x - 510, c.y - 455); return (c.mask & 88) || c.water ? 0 : r > 110 && r < 200 ? .75 : c.forest > .1 && c.forest < .5 ? .25 : 0; }, spacing: 5.5, prop: 'aspen', scale: [.8, 1.2], inFan: .4 },
    { where: c => (c.mask & 64) ? .22 : c.forest < .2 && !c.water ? .08 : 0, spacing: 4.2, prop: 'goldgrass', fanMargin: -8, fanP: .5, clearR: 5 },
    { where: c => c.type === GT.talus ? .55 : c.type === GT.rock ? .25 : 0, spacing: 5, mix: [['talus', .7], ['boulder', .3]], fanMargin: -200, fanP: .8 },
    { where: c => (c.mask & 88) || c.water ? 0 : c.forest < .4 ? .08 : .03, spacing: 12, mix: [['juniper', .6], ['rock', .25], ['log', .15]] }
  ],
  vantages: {
    knoll: { at: [505, 588], eye: 1.7, yaw: -92, kind: 'rock', name: 'the knoll' },
    rim: { at: [565, 604], eye: 1.7, yaw: 90, kind: 'rock', name: 'the valley rim' },
    saddle: { at: [300, 430], eye: 1.7, yaw: 180, kind: 'ground', name: 'the saddle meadow' },
    timber: { at: [700, 430], eye: 1.7, yaw: 0, kind: 'ground', name: 'the timber edge' },
    traphouse: { at: [600, 822], eye: 1.7, yaw: 62, kind: 'ground', name: "Loretta's trap house" },
    overlook: { at: [500, 980], eye: 90, yaw: -90, kind: 'air' }
  },
  props: [['traphouse', [607, 836]], ['sign', [592, 826]], ['shed', [580, 812]], ['haybale', [612, 818]]],
  sites: ['bugle-1', 'bugle-2', 'bugle-3'], trophy: 'duke', bonus: 'saucer-season', par: 7400,
  rivals: { earl: 4000, loretta: 6300, dwayne: 7500 },
  intro: 'bugle-intro', outro: 'bugle-outro', legendBeat: 'duke-legend', bonusBeat: 'saucer-brief',
  establish: { from: [480, 1000, 90, -95], to: [500, 720, 40, -92], secs: 7 }
});
def('site', 'bugle-1', {
  hunt: 'bugle', name: 'Aspen Park', vantage: 'knoll', frame: { bearings: [-36, 36], fov: 22, pitch: 6 }, distances: [38, 90], time: 75, bucks: 3,
  director: [[0, { bearing: -14 }], [5, { bearing: 6, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['aspen', [-30, 70]], ['aspen', [28, 78]], ['aspen', [-34, 96]], ['aspen', [36, 98]], ['juniper', [-10, 44]], ['boulder', [14, 50]]],
  critters: [['marmot', { pos: [14, 50], at: 4 }], ['grouse', { pos: [-12, 42], path: [[-12, 42], [-40, 30], [-70, 40]], at: 30, wait: 2 }], ['eagle', { path: [[-60, 200], [0, 150], [60, 200], [0, 260], [-60, 200]], at: 1, alt: 55 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    const herd = S.pattern('herdPass', { kinds: ['cow', 'cow', 'bull', 'cow', 'calf', 'cow', 'bull', 'cow'], path: [[-44, 70], [-18, 62], [6, 66], [30, 74], [48, 88]], gait: 'walk', spacing: 4.5, spread: 3, points: [0, 0, S.rng.int(10, 11), 0, 0, 0, S.rng.int(10, 12), 0], stop: [.4, 5] });
    yield 8;
    const sat = S.spawn('bull', { points: 12, path: [[34, 96], [26, 80], [10, 70], [-20, 74], [-46, 88]], orders: [['call', { secs: 2.4 }], ['wait', { secs: 3 }], ['call', { secs: 2.4 }], ['walk', { to: .3 }], ['look', { secs: 2 }], ['trot', { to: 1 }], ['exit']], calm: 1.5 });
    S.on('call', () => { if (sat.alive && sat.order && (sat.order[0] === 'wait' || sat.order[0] === 'call')) { sat.orders = [['walk', { to: .35 }], ['look', { secs: 2.5 }], ['trot', { to: 1 }], ['exit']]; sat.nextOrder(); } });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'bugle-2', {
  hunt: 'bugle', name: 'Talus Slope', vantage: 'rim', frame: { bearings: [-30, 30], fov: 18, pitch: 2.5 }, distances: [100, 190], fan: [10, 200], time: 75, bucks: 3, keepHills: true,
  director: [[0, { bearing: -12 }], [5, { bearing: 8, dur: 10 }], [12, { mode: 'follow' }]],
  props: [['boulder', [-20, 140]], ['boulder', [16, 160]], ['spruce', [-36, 170]], ['spruce', [34, 150]]],
  critters: [['coyote', { path: [[-40, 210], [-10, 200], [20, 205], [44, 215]], at: 18 }]],
  script: function* (S) {
    yield 1.2; S.bark('startBull');
    S.pattern('cross', { kind: 'cow', path: [[-38, 150], [-12, 142], [14, 146], [40, 160]], gait: 'walk' });
    S.pattern('cross', { kind: 'bull', points: S.rng.int(10, 12), path: [[-40, 160], [-14, 152], [12, 156], [40, 168]], gait: 'walk', delay: 3, stop: [.45, 3] });
    yield E.any([E.until(() => S.resolved >= 1), 22]);
    S.bark('tipBreath');
    S.pattern('herdPass', { kinds: ['cow', 'bull', 'cow'], path: [[40, 130], [14, 124], [-12, 130], [-40, 140]], gait: 'trot', spacing: 6, points: [0, S.rng.int(11, 12), 0] });
    yield 6;
    if (G.sfx) G.sfx.play('rockfall');   // a rockfall up the slope startles them
    for (const a of S.actors) if (a.alive && a.cat === 'animal') a.hear(a.x, a.y - 30 * M, .8, false);
    yield E.any([E.until(() => S.resolved >= 2), 14]);
    S.pattern('cross', { kind: 'bull', points: 12, path: [[-40, 180], [-10, 172], [16, 176], [40, 186]], gait: 'walk', stop: [.5, 3.5], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'bugle-3', {
  hunt: 'bugle', name: 'Timberline Saddle', vantage: 'saddle', frame: { bearings: [-32, 32], fov: 21, pitch: -1.5 }, distances: [50, 125], time: 70, bucks: 4,
  director: [[0, { bearing: 10 }], [5, { bearing: -6, dur: 8 }], [12, { mode: 'follow' }]],
  props: [['spruce', [-34, 80]], ['spruce', [32, 86]], ['fir', [-24, 110]], ['juniper', [8, 52]]],
  critters: [['grouse', { pos: [8, 52], path: [[8, 52], [30, 40], [60, 50]], at: 12, wait: 3 }], ['marmot', { pos: [-18, 70], at: 26 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('herdPass', { kinds: ['bull', 'cow', 'cow'], path: [[-40, 118], [-14, 114], [12, 116], [40, 122]], gait: 'walk', spacing: 5, points: [S.rng.int(10, 11), 0, 0] });
    yield E.any([E.until(() => S.resolved >= 1), 14]);
    S.pattern('herdPass', { kinds: ['cow', 'bull', 'calf'], path: [[40, 110], [10, 106], [-14, 108], [-40, 116]], gait: 'trot', spacing: 5, points: [0, S.rng.int(10, 12), 0] });
    yield E.any([E.until(() => S.resolved >= 2), 14]);
    S.pattern('charge', { kind: 'bull', points: 12, path: [[-4, 120], [-2, 80], [2, 46], [30, 40], [48, 60]], gait: 'run', speedMul: .9 });
    yield 5;
    S.pattern('cross', { kind: 'bull', points: S.rng.int(10, 12), path: [[-40, 100], [-12, 96], [14, 98], [40, 104]], gait: 'walk', stop: [.5, 2.5] });
    yield E.until(() => S.allResolved);
  }
});
/* ---------- the trophy: The Duke of Bugle Ridge ---------- */
def('trophy', 'duke', {
  hunt: 'bugle', name: 'The Duke of Bugle Ridge', spotted: 'THE DUKE!', species: 'elk', vantage: 'timber', calls: 5, frame: { bearings: [-30, 30], fov: 21, pitch: 1 }, distances: [70, 125], fan: [10, 110], time: 50, bucks: 1,
  director: [[0, { bearing: -4 }]],
  openings: [[-22, 96], [-7, 104], [8, 100], [23, 92]],
  props: [['spruce', [-30, 100]], ['spruce', [-15, 108]], ['spruce', [0, 112]], ['spruce', [15, 104]], ['spruce', [30, 98]], ['fir', [-26, 118]], ['fir', [-4, 122]], ['fir', [20, 116]]],
  mount: { label: 'THE DUKE', story: 'Seven by seven. Answered every bugle in the timber, until yours.' },
  script: function* (S) {
    const D = reg('trophy', 'duke'), H = S.site.H;
    const A = S.spawn('bull', { points: 14, trophy: 'duke', antlerMul: 1.15, size: 1.1, hidden: true, delay: 1e9, path: [D.openings[0], D.openings[0]], orders: [['hold']], calm: 9 });
    H.trophyActor = A; S.site.duke = { calls: 0, at: -1, open: false, A };
    const behind = i => { const o = D.openings[Math.min(3, Math.max(0, i))]; return S.site.pts([[o[0], o[1] + 14]])[0]; };
    let bt = 0;
    while (S.time < D.time - 1 && !A.resolved) {
      yield .1; bt += .1;
      if (!S.site.duke.open && bt > 6.5) { bt = 0; const p = behind(S.site.duke.at + 1); G.sfx && G.sfx.call('bugle', { x: p.x, y: p.y }, .9); Barks.caption('dub', S.site.duke.calls ? 'Hear him? Answer him.' : 'That\'s the Duke. Call him in.'); }
    }
    if (!A.resolved) A.goneOut();
    yield E.until(() => S.allResolved);
  },
  rules: {
    call(a, c) {
      const s = G.hunt.site, d = s.duke; if (!d || a.resolved) return false;
      d.calls++;
      if (d.calls > 4) { Barks.caption('dub', 'Too much. He knows it\'s us.'); trophyShow(a, s.pts([reg('trophy', 'duke').openings[3], [40, 130]]), [['run', { to: 1 }], ['exit']]); return true; }
      if (d.open) return true;
      d.at = Math.min(3, d.at + 1); d.open = true; const o = reg('trophy', 'duke').openings[d.at];
      G.game.after(1.4, () => {
        if (a.resolved) return;
        if (d.at === 1) s.S.pattern('cross', { kind: 'cow', path: [[o[0] - 6, o[1] + 4], [o[0], o[1]], [o[0] + 8, o[1] + 6]], gait: 'walk', calm: 9 });
        G.game.after(d.at === 1 ? 2 : 0, () => {
          if (a.resolved) return;
          trophyShow(a, s.pts([[o[0] - 3, o[1] + 3], [o[0], o[1]], [o[0] + 3, o[1] + 4]]), [['walk', { to: .5 }], ['call', { secs: 1.6 }], ['look', { secs: 2.6 }], ['walk', { to: 1 }], ['hold']]);
          G.game.after(4.4, () => { if (!a.resolved && a.state !== 'hidden') { trophyHide(a); } d.open = false; });
        });
      });
      return true;
    },
    update(H, site, dt) { const d = site.duke; if (!d) return; const o = reg('trophy', 'duke').openings[Math.max(0, d.at)], tgt = clamp(o[0] * .8, -14, 14); site.camB = E.approach(site.camB, d.at >= 0 ? tgt : -4, dt * 14); },
    hear(a, heard, near) { const d = G.hunt.site.duke; if (a.state !== 'hidden' && !a.resolved) { a.orders = [['run', { to: 1 }], ['hold']]; a.nextOrder(); G.game.after(.7, () => { if (!a.resolved) trophyHide(a); if (d) d.open = false; }); } }
  }
});

/* ===== src/82-muskeg.js ===== */
// 82-muskeg: MUSKEG LAKE under the first snow: a lake with reed shallows and a beaver lodge, a spruce bog in fog to the
// north, a burned clearing of charred snags to the east, a snowy shore. Big Mo charges the shore stand.
const muskegN = E.makeNoise(3303 * 5 + 1);
const MUSKEG_BURN = [[800, 380], [960, 400], [970, 660], [810, 650]];
const MUSKEG_BAY = [[640, 420], [720, 410], [740, 500], [660, 520]];
def('hunt', 'muskeg', {
  name: 'Muskeg Lake', species: 'moose', seed: 3303, order: 3, when: 'First snow, overcast', blurb: 'Bull moose in the bog and the burn.',
  sun: { yaw: 200, elev: 18, color: '#d8dce8', ambient: '#8a90a8', disc: false },
  fog: { color: '#c8ced8', near: 90, far: 900, max: .98 }, mist: { top: 62, color: '#d8dee6', density: .35, range: 120 },
  sky: { sky: ['#6a7488', '#8a94a6', '#aab2c0', '#c2c8d2'], layers: [
    { kind: 'clouds', color: '#d8dce4', y: .14, height: .16, parallax: .02, drift: 1 },
    { kind: 'hills', color: '#8a90a0', y: .48, height: .07, parallax: .03 },
    { kind: 'forest', color: '#5a6270', y: .5, height: .06, parallax: .05, seed: 4 }] },
  water: { deep: '#2a343e', shallow: '#4a5862', sky: '#9aa4b0', foam: '#e8eef2', ice: '#c8d8e4' },
  grade: { mul: '#f0f4fa', add: '#04060a', gamma: 1.04 },
  outline: '#141a22', weather: { kind: 'snow', amount: .55, wind: .2 }, ambience: 'muskeg', host: 'earl', call: 'moosecall', echo: [.3, .7], cold: true,
  terrain: { base: { amp: 9, scale: 260, octaves: 5, warp: 50, offset: 60 }, features: [
    { kind: 'lake', center: [520, 520], radii: [230, 170], depth: 5, shore: 30 },
    { kind: 'shallow', poly: MUSKEG_BAY, depth: .7, falloff: 26 },
    { kind: 'shallow', poly: [[290, 470], [380, 470], [390, 640], [300, 650]], depth: .6, falloff: 30 },
    { kind: 'bump', at: [790, 520], r: 18, h: 4 }, { kind: 'burn', poly: MUSKEG_BURN },
    { kind: 'valley', path: [[300, 120], [500, 200], [760, 150]], width: 60, depth: 3 },
    { kind: 'plateau', at: [520, 740], r: 8, falloff: 16 }, { kind: 'plateau', at: [505, 330], r: 5, falloff: 10 }] },
  types: c => c.water ? (c.wl - c.h < .3 ? GT.ice : GT.mud) : c.mask & 4 ? (c.n2 > .55 ? GT.snow : GT.burn) : c.mask & 16 ? (c.n2 > .2 ? GT.shore : GT.snow) : c.slope > .7 ? GT.rock : c.forest > .55 && c.n > .3 ? GT.needles : GT.snow,
  forest: c => { if (c.mask & 28 || c.water) return 0; const n = .5 + .5 * muskegN(c.x / 150, c.y / 150); return clamp((n - .4) * 2.2 + (c.y < 300 ? .55 : 0), 0, 1); },
  crop: c => c.water && c.wl - c.h < 1.2 && (c.x < 400 || (c.x > 630 && c.x < 745 && c.y > 400 && c.y < 525)) && c.n2 > -.4 ? 1.9 + c.n2 * .3 : 0,
  farForest: (x, y) => .35 + .5 * (.5 + .5 * muskegN(x / 200, y / 200)),
  canopy: { min: 9, max: 15 },
  palette: {
    types: { 8: { a: '#e8ecf2', b: '#dce2ea', c: '#f8fbff', speck: .05, scale: 8 }, 9: { a: '#c8d8e4', b: '#b8c8d8' }, 6: { a: '#4a4a44', b: '#5a5a50' }, 11: { a: '#3a3432', b: '#4a4240', c: '#8a8a8a', speck: .15, scale: 3 },
      12: { a: '#8a8a84', b: '#9a9a92', c: '#e8ecf0', speck: .3, scale: 2 }, 13: { a: '#cfd6de', b: '#bcc4cc', c: '#5a5a48', speck: .12, scale: 4 }, 4: { a: '#7a7a80', b: '#8a8a90', c: '#e8eef4', speck: .3 }, 0: { a: '#c8ced6', b: '#d8dee6' } },
    canopy: ['#1a2a24', '#22322a', '#2a3a30'], crop: { 9: { c: ['#8a7a58', '#a88a5a', '#6a5a40'] }, 6: { c: ['#8a7a58', '#a88a5a', '#6a5a40'] } },
    farTypes: (h, s) => s > .6 ? GT.rock : GT.snow
  },
  scatter: [
    { where: c => c.forest * .95, spacing: 5.5, mix: [['blackspruce', .5], ['snowspruce', .3], ['tamarack', .2]], scale: [.8, 1.25], inFan: .5 },
    { where: c => (c.mask & 4) && !c.water ? .5 : 0, spacing: 11, prop: 'snag', scale: [.6, 1], fanP: .12, fanMargin: -20 },
    { where: c => !c.water && !(c.mask & 4) && c.forest < .3 ? .07 : 0, spacing: 9, mix: [['willow', .5], ['drift', .3], ['snowrock', .2]] },
    { where: c => c.wdist < 6 && !c.water ? .45 : 0, spacing: 3, prop: 'reeds', fanMargin: -10, fanP: .6, clearR: 5 },
    { where: c => (c.mask & 4) && !c.water ? .06 : c.forest > .3 ? .04 : 0, spacing: 14, mix: [['snowlog', .6], ['snowrock', .4]] }
  ],
  vantages: {
    canoe: { at: [420, 560], eye: 1.0, yaw: 180, kind: 'canoe', name: 'the canoe' },
    bogEdge: { at: [505, 330], eye: 1.7, yaw: -90, kind: 'ground', name: 'the bog edge' },
    burnRise: { at: [790, 520], eye: 1.7, yaw: 2, kind: 'ground', name: 'the rise over the burn' },
    shoreStand: { at: [768, 462], eye: 4.2, yaw: 186, kind: 'treestand', name: 'the shore stand' },
    earlFire: { at: [520, 740], eye: 1.7, yaw: 90, kind: 'ground', name: "Earl's fire" },
    overlook: { at: [520, 1000], eye: 60, yaw: -90, kind: 'air' }
  },
  props: [['lodge', [356, 600]], ['stand', [770, 464]], ['shed', [500, 752]], ['snowlog', [534, 744]], ['drift', [500, 770]], ['drift', [548, 772]]],
  sites: ['muskeg-1', 'muskeg-2', 'muskeg-3'], trophy: 'bigmo', bonus: 'snowball-standoff', par: 7800,
  rivals: { earl: 4200, loretta: 6700, dwayne: 7900 },
  intro: 'muskeg-intro', outro: 'muskeg-outro', legendBeat: 'bigmo-legend', bonusBeat: 'snowball-brief',
  establish: { from: [520, 1000, 60, -90], to: [520, 800, 30, -90], secs: 7 }
});
def('site', 'muskeg-1', {
  hunt: 'muskeg', name: 'Reed Shallows', vantage: 'canoe', frame: { bearings: [-34, 34], fov: 24, pitch: 1.5 }, distances: [34, 90], time: 70, bucks: 2,
  director: [[0, { bearing: -12 }], [5, { bearing: 6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['reeds', [-10, 30]], ['reeds', [14, 34]]],
  critters: [['duck', { pos: [10, 40], path: [[10, 40], [30, 70], [60, 120]], at: 3, wait: 7, flock: 3 }], ['beaver', { path: [[-30, 50], [-10, 42], [10, 46], [24, 52]], at: 14 }], ['loon', { path: [[20, 60], [0, 56], [-20, 62]], at: 2 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('wade', { kind: 'cow', path: [[-40, 70], [-14, 66], [10, 70], [40, 78]] });
    S.pattern('wade', { kind: 'bull', points: S.rng.int(42, 52), path: [[-40, 84], [-12, 78], [12, 82], [40, 90]], delay: 3, stop: [.45, 4] });
    yield E.any([E.until(() => S.resolved >= 1), 22]);
    S.pattern('cross', { kind: 'cow', path: [[36, 42], [10, 38], [-16, 40], [-40, 48]], gait: 'walk' });
    S.pattern('cross', { kind: 'calf', follow: S.last, back: 3 });
    yield 4;
    S.pattern('wade', { kind: 'cow', path: [[40, 62], [14, 58], [-12, 60], [-40, 66]], delay: .5 });
    S.pattern('wade', { kind: 'bull', points: 55, path: [[40, 72], [16, 68], [-10, 70], [-40, 78]], delay: 2.5, stop: [.5, 3], big: true });
    yield E.until(() => S.allResolved);
  }
});
def('site', 'muskeg-2', {
  hunt: 'muskeg', name: 'Spruce Bog', vantage: 'bogEdge', frame: { bearings: [-38, 38], fov: 29, pitch: 2.5 }, distances: [18, 55], time: 70, bucks: 3, fanTrees: .35,
  director: [[0, { bearing: 8 }], [5, { bearing: -6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['blackspruce', [-26, 24]], ['blackspruce', [20, 30]], ['tamarack', [-8, 44]], ['snowspruce', [30, 46]], ['willow', [6, 22]], ['snowlog', [-16, 32]]],
  critters: [['hare', { path: [[24, 18], [8, 16], [-10, 20], [-30, 26]], at: 8 }], ['raven', { path: [[-60, 80], [0, 60], [60, 80]], at: 20, alt: 18, flock: 2 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('cross', { kind: 'bull', points: S.rng.int(40, 50), path: [[-44, 46], [-16, 38], [10, 40], [44, 48]], gait: 'walk' });
    yield E.any([E.until(() => S.resolved >= 1), 16]);
    S.pattern('stand', { kind: 'bull', points: S.rng.int(44, 54), from: [36, 40], at: [6, 26], secs: 5, exit: [-44, 34], calm: 2.5 });
    yield 4;
    S.pattern('cross', { kind: 'cow', path: [[-44, 30], [-14, 26], [16, 30], [44, 38]], gait: 'walk' });
    yield E.any([E.until(() => S.resolved >= 2), 16]);
    S.pattern('cross', { kind: 'bull', points: S.rng.int(46, 55), path: [[44, 34], [16, 28], [-12, 30], [-44, 40]], gait: 'trot', stop: [.45, 2] });
    yield E.until(() => S.allResolved);
  },
  update: null
});
def('site', 'muskeg-3', {
  hunt: 'muskeg', name: 'Burn Clearing', vantage: 'burnRise', frame: { bearings: [-30, 30], fov: 21, pitch: 3 }, distances: [50, 115], time: 75, bucks: 3, fanTrees: .3,
  director: [[0, { bearing: -10 }], [5, { bearing: 6, dur: 9 }], [12, { mode: 'follow' }]],
  props: [['snag', [-20, 70]], ['snag', [14, 84]], ['snag', [-4, 100]], ['snowlog', [6, 62]]],
  critters: [['raven', { path: [[-50, 120], [0, 90], [50, 120]], at: 6, alt: 22 }]],
  script: function* (S) {
    yield 1; S.bark('startBull');
    S.pattern('cross', { kind: 'bull', points: S.rng.int(42, 52), path: [[-40, 90], [-14, 84], [12, 88], [40, 96]], gait: 'trot' });
    yield E.any([E.until(() => S.resolved >= 1), 16]);
    S.pattern('fight', { fromA: [-36, 80], fromB: [36, 84], at: [-2, 80], exitA: [-42, 110], exitB: [42, 112], secs: 6, pointsA: S.rng.int(44, 54), pointsB: S.rng.int(44, 54) });
    yield E.any([E.until(() => S.resolved >= 3), 22]);
    // a wolf pack chases a cow through (don't hit her)
    S.pattern('cross', { kind: 'cow', path: [[40, 66], [10, 60], [-16, 64], [-44, 72]], gait: 'run' });
    const cow = S.last; for (let i = 0; i < 3; i++) S.spawn('wolf', { path: [[44 + i * 3, 70 + i * 2], [12, 64 + i], [-14, 68 - i], [-46, 76]], delay: 1.2 + i * .45, behavior: 'pack', speedMul: .85 });
    yield E.until(() => S.allResolved);
  }
});
/* ---------- the trophy: Big Mo ---------- */
def('trophy', 'bigmo', {
  hunt: 'muskeg', name: 'Big Mo', spotted: 'HERE COMES BIG MO!', species: 'moose', vantage: 'shoreStand', frame: { bearings: [-26, 26], fov: 26, pitch: 6 }, distances: [15, 115], fan: [10, 120], time: 45, bucks: 1,
  director: [[0, { bearing: 0 }]],
  props: [['reeds', [-14, 104]], ['reeds', [12, 108]], ['reeds', [-2, 112]]],
  mount: { label: 'BIG MO', story: 'A 72-inch spread and opinions to match. Charged the shore stand three times.' },
  script: function* (S) {
    const H = S.site.H, mo = { charges: 0 };
    const A = S.spawn('bull', { points: 72, trophy: 'bigmo', size: 1.15, antlerMul: 1.1, hidden: true, delay: 1e9, path: [[-6, 112], [0, 60], [0, 12]], orders: [['hold']], calm: 99, hpMul: 1 });
    H.trophyActor = A; S.site.mo = mo;
    while (mo.charges < 3 && !A.resolved) {
      yield mo.charges ? 2.5 : 3;
      mo.charges++; mo.slowed = false; mo.missed = false;
      const b = (mo.charges - 2) * 9; trophyShow(A, S.site.pts([[b - 4, 114], [b * .5, 70], [0, 30], [0, 13]]), [['run', { to: 1 }], ['hold']]);
      A.o.speedMul = 1.1; A.charging = true; if (G.sfx) G.sfx.call('moose', A, 1.2);
      Barks.caption('emcee', mo.charges === 1 ? 'HERE COMES BIG MO!' : 'HE\'S COMING AGAIN!');
      yield E.until(() => A.resolved || mo.missed || A.d >= A.path.len - 14);
      if (A.resolved) break;
      if (mo.missed) {   // a miss: he pulls up, turns, and goes back to the reeds to try again
        A.orders = [['hold']]; A.nextOrder(); A.want = 0; yield .8;
        trophyShow(A, [{ x: A.x, y: A.y }].concat(S.site.pts([[(mo.charges % 2 ? 20 : -20), 90], [b, 116]])), [['trot', { to: 1 }], ['hold']]); yield E.until(() => A.resolved || A.d >= A.path.len - 1); if (!A.resolved) trophyHide(A);
        continue;
      }
      // he reached the stand: BIG MO SAYS NO!
      H.moCrash = 1; G.game.shake(10); if (G.sfx) G.sfx.play('crash'); HUD.banner('BIG MO SAYS NO!', { scale: 3, colors: ['#ffe0d8', '#ff6a4a', '#a81a10'] }); G.game.flash('#ffffff', .2, .8);
      yield 1.6; trophyShow(A, [{ x: A.x, y: A.y }].concat(S.site.pts([[40, 30], [60, 90]])), [['run', { to: 1 }], ['exit']]); mo.charges = 9; break;
    }
    if (!A.resolved) { yield 3; if (!A.resolved) A.goneOut(); }
    yield E.until(() => S.allResolved);
  },
  rules: {
    hear(a, heard, near) { const mo = G.hunt.site.mo; if (mo && !a.resolved && a.state !== 'hidden') mo.missed = true; },
    call(a) { return false; },
    wounded(a, zone) { a.limp = zone === 'leg' ? 2 : -1; a.hurtT = .4; a.o.speedMul = .55; },
    update(H, site, dt) { if (H.moCrash > 0) H.moCrash = Math.max(0, H.moCrash - dt * .6); const A = H.trophyActor; if (A && A.wounds && !site.mo.slowed) { site.mo.slowed = true; A.o.speedMul = .55; } }
  }
});

/* ===== src/83-range-map.js ===== */
// 83-range-map: UNCLE DUB'S RANGE: a mown field with earth berms behind the targets, woods round it, a bench to shoot from.
const rangeN = E.makeNoise(4404 * 5 + 1);
def('hunt', 'range', {
  name: "Uncle Dub's Range", species: 'whitetail', seed: 4404, order: 0, when: 'A clear afternoon', blurb: 'Paper don\'t run. No excuses.',
  sun: { yaw: -40, elev: 30, color: '#fff0d0', ambient: '#8a94b0', r: 6, glow: '#fff0c0', disc: '#fffbe8' },
  fog: { color: '#c8d4e0', near: 250, far: 1800 }, mist: null,
  sky: { sky: ['#4a88d8', '#8ab8e8', '#d0e4f0'], layers: [{ kind: 'clouds', color: '#ffffff', y: .16, height: .12, parallax: .02, drift: 3 }, { kind: 'hills', color: '#8aa0b8', y: .48, height: .08, parallax: .03 }] },
  water: { deep: '#2a4a5a', sky: '#a8c8e0' }, grade: { mul: '#fffaf0', gamma: 1 },
  outline: '#1a140c', weather: null, ambience: 'range', host: 'dub', call: 'grunt',
  terrain: { base: { amp: 6, scale: 300, octaves: 4, warp: 30, offset: 20 }, features: [
    { kind: 'flatten', poly: [[470, 400], [560, 400], [570, 640], [460, 640]], z: 'avg', falloff: 40, mark: 64 },
    { kind: 'flatten', poly: [[440, 300], [590, 300], [600, 410], [430, 410]], z: 'avg', falloff: 40, mark: 64 },
    { kind: 'trail', path: [[515, 640], [512, 700]], width: 2 }] },
  types: c => c.mask & 2 ? GT.dirt : c.mask & 64 ? GT.pasture : c.forest > .4 ? GT.leaves : c.n > .3 ? GT.dry : GT.grass,
  forest: c => { if (c.mask & 64) return 0; const n = .5 + .5 * rangeN(c.x / 120, c.y / 120); return clamp((n - .3) * 2.5, 0, 1) * (Math.abs(c.x - 512) > 90 || c.y < 290 ? 1 : 0); },
  farForest: () => .7, canopy: { min: 11, max: 16 },
  palette: { types: { 0: { a: '#6a8a3a', b: '#7a9444', speck: .03, scale: 8 }, 14: { a: '#7a9a44', b: '#86a44c', c: '#a8b85a', speck: .03, scale: 6 }, 1: { a: '#a89a50', b: '#b4a45a' }, 2: { a: '#7a5a2a', b: '#8a6a32' }, 3: { a: '#8a6a44', b: '#7a5e3c' } }, canopy: ['#2a4a2a', '#3a5a30', '#4a6a34'], farTypes: () => GT.grass },
  scatter: [{ where: c => c.forest * .9, spacing: 6.5, mix: [['oak', .5], ['maple', .3], ['birch', .2]], scale: [.8, 1.2] }, { where: c => c.mask & 64 ? 0 : c.forest < .3 ? .12 : 0, spacing: 4, prop: 'tallgrass' }],
  vantages: { bench: { at: [512, 620], eye: 1.5, yaw: -90, kind: 'range', name: 'the bench' }, overlook: { at: [512, 760], eye: 20, yaw: -90, kind: 'air' } },
  props: [['lowberm', [512, 594]], ['berm', [500, 574]], ['berm', [530, 574]], ['berm', [512, 462]], ['sign', [500, 616]], ['haybale', [490, 612]], ['haybale', [536, 612]], ['shed', [470, 630]]],
  sites: [], extraFans: [], trophy: null, bonus: null, par: 3000, rivals: null
});

/* ===== src/85-story.js ===== */
// 85-story: the Hunt-Off's people talking: each beat a few short lines with live portraits and gibberish voices; the
// rivals' scores; a hunt's results (the total, the rank, bragging rights, initials on the board); the ceremony.
const BEATS = {
  welcome: [['emcee', 'Welcome to the 41st Annual Big Buck Hunt-Off!'], ['emcee', 'Three hunts. One trophy wall. Zero does!'], ['dub', "Name's Dub. Forty years guidin'. Lost twice. On purpose."]],
  rivals: [['dwayne', "Hope you packed a lunch, cuz. You'll be here a while."], ['loretta', "Ignore him. He shot a mailbox in '09."], ['earl', "I'm mostly here for the chili."]],
  'hollow-intro': [['dub', 'Whitetails thick as ticks out here.'], ['dub', "Bucks got antlers. Does don't. Can't tell? Don't pull."], ['dub', "Pump after every shot. This rifle's older'n me."], ['dub', "Got you a grunt tube, too. Blow it, they'll stop and look."]],
  'iron-rack-legend': [['dub', 'Old Iron Rack. Fourteen points.'], ['dub', "Walks in the fog so nobody can count 'em."], ['dub', 'Been dodgin\' hunters since your daddy wore diapers.'], ['dub', "He'll show three times. Third time, he's got company."]],
  'crow-patrol-brief': [['granny', 'Crows ate my sweet corn. Every last ear!'], ['granny', 'Shoot the crows, sugar. Not Hank.'], ['granny', "Hank's the scarecrow. He's got feelin's."]],
  'hollow-outro-behind': [['dwayne', "Scope's crooked. That's all that is."], ['dub', "Sure, Dwayne. Sure it is."]],
  'hollow-outro-ahead': [['dwayne', 'Told ya. Bring a lunch.'], ['loretta', "One hunt don't make a season, Dwayne."]],
  'bugle-intro': [['dub', 'Bugle Ridge. Elk country. Air\'s thin, so are excuses.'], ['dub', "Elk hear a bugle, they come lookin' for a fight."], ['dub', "Give 'em a call and they'll stop to see who's talkin'."], ['dub', 'Bulls only. Cows run the herd. Leave the bosses be.']],
  'duke-legend': [['dub', "The Duke don't come out for just anybody."], ['dub', 'Answer him back. Make him curious.'], ['dub', 'Every call brings him to the next gap in the timber.'], ['dub', "Call too much and he'll know it's you."]],
  'saucer-brief': [['loretta', "Pull!... That's what you say. Then you shoot it."], ['loretta', "Golden clay's worth a fortune. Don't miss it."]],
  'bugle-outro-behind': [['dwayne', "Elk are just big deer with an attitude. Like me."], ['earl', "Chili's gettin' cold."]],
  'bugle-outro-ahead': [['dwayne', "Thin air. My brain's starvin'. That's all."], ['loretta', 'Now that was shootin\'.']],
  'muskeg-intro': [['dub', 'Muskeg Lake. First snow. Watch your footing.'], ['dub', 'Moose ain\'t skittish. Moose is a truck with opinions.'], ['earl', "Chili's on the fire if you live."], ['dub', 'Big racks, big targets. Still bulls only.']],
  'bigmo-legend': [['dub', "Big Mo don't run from you."], ['dub', 'He runs AT you. Hold steady.'], ['dub', 'Heart or lungs. Anything less just makes him mad.']],
  'snowball-brief': [['earl', 'The snowmen are back. They want revenge.'], ['earl', 'Shoot the snowballs. Knock their hats off.'], ['earl', "And if the big one comes... aim for the hat."]],
  'muskeg-outro-behind': [['dwayne', "Moose cheated. Moose had antlers."], ['dub', 'They all do, Dwayne. That\'s the point.']],
  'muskeg-outro-ahead': [['dwayne', 'I want a recount.'], ['earl', "Recount the chili. I had three bowls."]],
  'party-intro': [['emcee', 'PARTY HUNT! Every hunter for themselves!'], ['dub', 'Same rules. Bucks only. First hit takes it.']],
  'quick-intro': [['emcee', 'QUICK DRAW! One site per hunt, then the clays!'], ['emcee', 'Most points wins. GO!']],
  'range-intro': [['dub', "This here's my range. Paper don't run, so you got no excuse."], ['dub', "I'll show you the ropes. Do what I say, when I say."]],
  'ceremony-win': [['emcee', 'OUR NEW HUNT-OFF CHAMPION!'], ['dub', 'Hang it on the wall, kid.'], ['dwayne', '...Next year, cuz. Next year.']],
  'ceremony-lose': [['emcee', "THERE'S ALWAYS NEXT YEAR!"], ['dub', 'Hang what you got on the wall, kid. You earned it.'], ['loretta', 'You shot clean. That counts for somethin\'.']]
};
for (const id in BEATS) def('beat', id, { lines: BEATS[id] });
const talk = new E.Dialog(game, { voice: null, speed: 48, lines: 3 });
G.talk = talk;
SEG.dialog = (H, o) => {
  let id = o.beat;
  if (o.outro) { const me = H.players[0].score, dw = H.hunt.rivals ? H.hunt.rivals.dwayne : 0; id = H.hunt.outro + (me >= dw ? '-ahead' : '-behind'); if (H.mode !== 'campaign' && H.mode !== 'single') id = null; }
  const lines = id && has('beat', id) ? reg('beat', id).lines.slice() : [];
  let i = -1, done = !lines.length || H.mode === 'attract' || H.hubMode, speaker = null;
  const nextLine = () => {
    i++; if (i >= lines.length) { done = true; return; }
    const [who, text, opt] = lines[i], C = CAST[who]; speaker = who;
    talk.say(text, { name: C.name, portrait: castRig(who), portraitSize: 44, onDone: () => nextLine() });
    talk.nameColor = C.color; G.bab.say(text, C.voice);
  };
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { if (!done) nextLine(); },
    update(dt) {
      if (done) return true;
      if (speaker) castRig(speaker).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: /!/.test(lines[i] && lines[i][1]) ? 'shout' : 'smile' });
      if (H.players.some(p => p.input.pressed('cancel') || p.input.pressed('start'))) { talk.close(); done = true; G.bab.stop(); return true; }
      talk.update(dt);
      return done;
    },
    skip() { talk.close(); done = true; },
    exit() { if (talk.open) talk.close(); },
    draw(g, W, Ht) { if (!done) Glyph.cue(g, 'cancel', 'SKIP', W - 10, 14, H.players[0].input, { align: 'right' }); },
    drawR: true
  };
};
/* ---------- rivals: their posted scores ---------- */
function rivalBoard(H) {
  if (H.mode !== 'campaign') return null;
  const c = G.campaign || {}, order = ['hollow', 'bugle', 'muskeg'], idx = order.indexOf(H.huntId), frac = H.rivalFrac || 0;
  return RIVALS.map(id => { let s = 0; for (let j = 0; j < idx; j++) s += reg('hunt', order[j]).rivals[id]; s += Math.round(reg('hunt', H.huntId).rivals[id] * frac); return { id, name: CAST[id].name, score: s, color: CAST[id].color }; });
}
bus.on('huntStart', H => { if (H.mode === 'campaign') { H.rivalFrac = 0; H.rivalBoard = rivalBoard(H); H.rival = { id: 'dwayne', name: 'DWAYNE', score: H.hunt.rivals.dwayne }; const c = G.campaign || {}; if (c.scores) { let s = 0; for (const k in c.scores) if (k !== H.huntId) s += c.scores[k]; H.campaignBefore = s; } } });
bus.on('segment', seg => { const H = G.hunt; if (H && H.mode === 'campaign') { const total = H.hunt.sites.length + 2, done = H.siteResults.length + (H.trophyInfo ? 1 : 0) + (H.bonusResult ? 1 : 0); H.rivalFrac = Math.min(1, done / total); H.rivalBoard = rivalBoard(H); } });
const cab = new E.Arcade(game, { id: 'bbho', hud: false, lives: 1, colors: ['#e8843a', '#ffffff', '#ffd040'] });
G.cab = cab;
function seedTables() {
  const names = ['DUB', 'MAE', 'DWN', 'LOR', 'ERL'];
  for (const [mode, base] of [['hollow', 5200], ['bugle', 6000], ['muskeg', 5600], ['campaign', 15000], ['party', 6000], ['crow-patrol', 1800], ['saucer-season', 1700], ['snowball-standoff', 2000], ['range', 3000]]) {
    const k = 'arcade:bbho:' + mode; if (Array.isArray(E.store.get(k, null))) continue;
    E.store.set(k, names.map((n, i) => ({ name: n, score: Math.round(base * (1 - i * .14) / 10) * 10 })));
  }
}
SEG.results = (H, o) => {
  let t = 0, phase = 'show', entering = false, bragging = false;
  const mode = o.bonusOnly ? (H.bonusResult ? H.bonusResult.id : 'bonus') : H.mode === 'party' ? 'party' : H.mode === 'quick' ? 'party' : H.huntId;
  const par = o.bonusOnly ? 1500 : H.hunt.par;
  return { block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: false,
    enter() {
      if (H.mode === 'campaign') { const dw = H.hunt.rivals.dwayne; if (H.players[0].score > dw) { bragging = true; H.players[0].addScore(1000); } H.rivalFrac = 1; H.rivalBoard = rivalBoard(H); }
      for (const p of H.players) { const key = mode; p.newBest = Records.setBest(key, p.score); }
      Records.stat('hunts', 1); Records.save();
      if (G.sfx) { G.sfx.music('results'); if (H.players.some(p => p.newBest)) G.sfx.sting('newrecord'); }
      this.rank = rankFor(H.players[0].score, par);
    },
    update(dt) {
      t += dt;
      if (phase === 'show' && t > 1 && (anyConfirm(H) || (H.mode === 'attract' || H.hubMode) && t > 4 || t > 30)) {
        const best = H.players.slice().sort((a, b) => b.score - a.score)[0];
        if (!H.players[0].bot && H.mode !== 'attract' && cab.qualifies(best.score, mode)) { phase = 'initials'; entering = true; cab.enter(best.score, mode, () => { entering = false; phase = 'done'; t = 0; if (G.sfx) G.sfx.play('confirm'); }); }
        else { phase = 'done'; t = 0; }
      }
      if (phase === 'initials') cab.update(dt);
      if (phase === 'done' && (t > .4 || H.mode === 'attract')) return true;
      return false;
    },
    skip() { phase = 'done'; t = 1; cab.entry = null; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .65);
      const bw = Math.min(W - 30, 360), bh = 204, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#140c06'], border: '#e8843a' });
      E.font.title(g, o.bonusOnly ? 'BONUS COMPLETE' : 'HUNT COMPLETE', W / 2, y + 10, { scale: 2, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      E.font.text(g, o.bonusOnly ? (H.bonusResult ? H.bonusResult.name.toUpperCase() : '') : H.hunt.name.toUpperCase(), W / 2, y + 34, '#f4ead8', { align: 'center', outline: false });
      if (H.players.length === 1) {
        const p = H.players[0];
        E.font.text(g, fmt(p.score), W / 2, y + 50, '#ffffff', { align: 'center', scale: 4, outline: '#1a0c08' });
        E.font.text(g, this.rank, W / 2, y + 88, '#ffd040', { align: 'center', scale: 2, outline: false });
        if (bragging) E.font.text(g, '+1,000 BRAGGING RIGHTS (BEAT DWAYNE)', W / 2, y + 108, '#7ad04a', { align: 'center', outline: false });
        if (p.newBest) E.font.text(g, 'NEW BEST!', W / 2, y + 120, '#7ad0ff', { align: 'center', outline: false });
        const st = p.stats, acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
        E.font.text(g, 'BUCKS ' + st.bucks + '   ACCURACY ' + acc + '%   LONGEST ' + Math.round(st.longest) + ' M', W / 2, y + 134, '#d8c8a8', { align: 'center', outline: false });
        if (H.trophyInfo) E.font.text(g, (H.trophyInfo.bagged ? 'TROPHY BAGGED: ' : 'GOT AWAY: ') + H.trophyInfo.name.toUpperCase(), W / 2, y + 146, H.trophyInfo.bagged ? '#ffd040' : '#b8a488', { align: 'center', outline: false });
        if (H.rivalBoard) { const list = H.rivalBoard.concat([{ name: 'YOU', score: (H.campaignBefore || 0) + p.score, color: p.color }]).sort((a, b) => b.score - a.score); list.forEach((r, q) => { E.font.text(g, (q + 1) + '. ' + r.name, x + 40 + (q % 2) * 160, y + 160 + Math.floor(q / 2) * 11, r.color, { outline: false }); E.font.text(g, fmt(r.score), x + 150 + (q % 2) * 160, y + 160 + Math.floor(q / 2) * 11, '#ffffff', { align: 'right', outline: false }); }); }
      } else {   // a podium
        const order = H.players.slice().sort((a, b) => b.score - a.score), hs = [70, 52, 40, 30], pos = [1, 0, 2, 3];
        order.forEach((p, q) => { const slot = pos.indexOf(q) >= 0 ? pos.indexOf(q) : q, cx = x + bw / 2 + (slot - (order.length - 1) / 2) * 76, h = hs[q]; px.rect(g, cx - 30, y + 178 - h, 60, h, E.tones(p.color).sh); px.rect(g, cx - 28, y + 180 - h, 56, h - 4, E.tones(p.color).base); E.font.text(g, String(q + 1), cx, y + 182 - h, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, p.name, cx, y + 150 - h, p.color, { align: 'center', outline: false }); E.font.text(g, fmt(p.score), cx, y + 162 - h, '#ffffff', { align: 'center', outline: false }); drawReticleShape(g, cx, y + 140 - h, p.shape, p.color, 5); });
        E.font.text(g, order[0].name + ' WINS!', W / 2, y + 40, order[0].color, { align: 'center', scale: 2, outline: false });
      }
      if (phase === 'initials') { E.font.text(g, 'A HIGH SCORE! YOUR INITIALS:', W / 2, y + bh - 50, '#ffd040', { align: 'center', outline: false }); cab.draw({ overlay: f => f(g), W, H: Ht, bw: W + 2, bh: Ht + 2, game: G.game }); }
      else if (t > 1) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 12, H.players[0].input);
    }
  };
};

/* ===== src/90-title.js ===== */
// 90-title: the logo over a live Hollow Creek morning (deer grazing by the creek, a slow pan), PRESS START in the glyph
// of the device used last, the corner's settings button; ten seconds without input starts the attract mode. On a
// touch-only device: "Controller or keyboard required", and the attract mode still runs.
SEG.showcase = (H, o) => {
  const vid = o.vantage || 'creekStand', site = { id: 'showcase' }; let t = 0, spawnT = 0;
  const spawnSet = () => {
    H.actors.length = 0;
    const W = H.world, pts = (l) => l.map(p => W.at(vid, p[0], p[1]));
    const mk = (kind, path, orders, o2 = {}) => { const a = new Actor(H, Object.assign({ kind, species: 'whitetail', path: pts(path), orders, points: o2.points || 8, seed: 40 + H.actors.length * 7 }, o2)); a.calm = true; H.actors.push(a); return a; };
    mk('buck', [[-30, 40], [-8, 36], [16, 40], [40, 52]], [['walk', { to: .45 }], ['graze', { secs: 9 }], ['look', { secs: 2 }], ['walk', { to: 1 }], ['exit']], { points: 10 });
    mk('doe', [[-20, 30], [0, 28], [26, 34]], [['walk', { to: .3 }], ['graze', { secs: 14 }], ['walk', { to: 1 }], ['exit']]);
    mk('fawn', [[-18, 27], [2, 26], [28, 31]], [['walk', { to: .32 }], ['graze', { secs: 12 }], ['walk', { to: 1 }], ['exit']]);
    mk('buck', [[30, 60], [10, 56], [-16, 60], [-40, 70]], [['walk', { to: .5 }], ['graze', { secs: 7 }], ['trot', { to: 1 }], ['exit']], { points: 6, delay: 6 });
  };
  return { block: true, canShoot: false, showReticles: false, cinema: true, noForeground: true,
    enter() { H.camAt(vid, -6, 5, 33); H.vantageId = vid; H.fanB = [-60, 60]; H.vkind = 'air'; spawnSet(); },
    update(dt) { t += dt; spawnT += dt; H.camAt(vid, Math.sin(t * .05) * 14, 5, 33); H.vkind = 'air'; if (H.actors.every(a => !a.live) || spawnT > 70) { spawnT = 0; spawnSet(); } return false; }
  };
};
function showcase() { if (!G.showcase) G.showcase = new Hunt({ mode: 'title', hunt: 'hollow', queue: [{ kind: 'showcase' }], players: [], showcase: true, seed: 7 }); return G.showcase; }
const Idle = {
  t: 0, last: null,
  /** seconds since the last input (keys, mouse buttons and movement, the wheel, pad buttons and sticks, touch) */
  update(dt) {
    const I = G.game.input, m = I.pointer && I.pointer(); let any = I.anyPressed() || (I.clicked && I.clicked()) || Math.hypot(...I.move()) > .25 || (I.padAim && Math.hypot(I.padAim[0], I.padAim[1]) > .3);
    for (const P of G.game.players || []) if (P !== I && P.anyPressed()) any = true;
    if (m) { if (this.last && Math.abs(m[0] - this.last[0]) + Math.abs(m[1] - this.last[1]) > 3) any = true; this.last = m.slice(); }
    if (this.wheel) { any = true; this.wheel = false; }
    if (G.touchOnly && I.anyPressed() && I.lastDevice !== 'touch') G.touchOnly = false;
    this.t = any ? 0 : this.t + dt; return any;
  },
  reset() { this.t = 0; }
};
if (HAS_DOM) addEventListener('wheel', () => { Idle.wheel = true; }, { passive: true });
function drawLogo(g, W, y, s = 1) {
  E.font.text(g, 'THE 41ST ANNUAL', W / 2, y - 16 * s, '#f4e0b0', { align: 'center', scale: Math.max(1, Math.round(s)), shadow: '#1a0c08', outline: false });
  E.font.title(g, 'BIG BUCK', W / 2, y, { scale: Math.round(5 * s), colors: ['#fff4c8', '#f0c060', '#c8842a', '#8a5420'], outline: '#e8581a', depth: 4, depthColor: '#4a2410', align: 'center' });
  E.font.title(g, 'HUNT-OFF', W / 2, y + 40 * s, { scale: Math.round(4 * s), colors: ['#fff4c8', '#f0c060', '#c8842a', '#8a5420'], outline: '#e8581a', depth: 3, depthColor: '#4a2410', align: 'center' });
  // a rack over the logo
  const cx = W / 2, cyy = y - 26 * s, c = '#e8d8b0', d = '#3a2410', L = (a, b, w) => { px.line(g, cx + a[0] * s, cyy + a[1] * s, cx + b[0] * s, cyy + b[1] * s, d, w + 2); };
  const R = (a, b, w) => px.line(g, cx + a[0] * s, cyy + a[1] * s, cx + b[0] * s, cyy + b[1] * s, c, w);
  const rack = [[[-8, 6], [-26, -4]], [[-26, -4], [-40, -18]], [[-16, 2], [-18, -12]], [[-28, -6], [-30, -20]], [[8, 6], [26, -4]], [[26, -4], [40, -18]], [[16, 2], [18, -12]], [[28, -6], [30, -20]]];
  for (const [a, b] of rack) L(a, b, 2); for (const [a, b] of rack) R(a, b, 2);
}
const titleScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'title'; Idle.reset(); showcase(); if (G.sfx) { G.sfx.music('hoedown', { fade: .8 }); G.sfx.ambience('hollow'); } },
  update(dt) {
    const S = showcase(); S.update(dt); if (G.sfx) G.sfx.update(dt);
    const moved = Idle.update(dt);
    if (Idle.t > 10 && !G.ui.screen) { G.game.go('attract', {}, { fade: .5 }); return; }
    if (G.ui.screen) return;
    if (G.touchOnly) return;   // a tap does not start a game here
    const I = G.game.input;
    if (I.pressed('start') || I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked() && !G.touchOnly)) { G.sfx && G.sfx.play('confirm'); G.game.go('menu', { page: 'main' }, { fade: .3 }); return; }
    for (const P of G.game.players.slice(1)) if (P.pressed('start')) { G.game.go('menu', { page: 'main' }); return; }
    void moved;
  },
  draw(r) {
    const S = showcase(); S.draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H; px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, Ht * .5, '#5a4a6a'));
      drawLogo(g, W, Ht * .2 + 8, Ht < 260 ? .8 : 1);
      if (G.touchOnly) {
        E.ui.box(g, W / 2 - 130, Ht * .62, 260, 50, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .92 });
        E.font.text(g, 'CONTROLLER OR KEYBOARD', W / 2, Ht * .62 + 10, '#ffffff', { align: 'center', scale: 2, outline: false });
        E.font.text(g, 'REQUIRED', W / 2, Ht * .62 + 30, '#ffd040', { align: 'center', scale: 2, outline: false });
        E.font.text(g, 'Settings: the button at the top right', W / 2, Ht * .62 + 58, '#d8c8a8', { align: 'center', shadow: '#000', outline: false });
      } else if (Math.floor(G.game.real * 1.6) % 2 === 0) Glyph.cue(g, 'start', 'PRESS START', W / 2, Ht * .74, G.game.input, { scale: 2 });
      E.font.text(g, 'v' + VERSION + '  ·  my-3D2dge ' + E.version, W - 6, Ht - 10, '#c8b898', { align: 'right', outline: false, shadow: '#000' });
      E.font.text(g, '© 2026 ALL SOUNDS AND PIXELS MADE IN CODE', 6, Ht - 10, '#c8b898', { outline: false, shadow: '#000' });
    });
  }
};

/* ===== src/91-menu.js ===== */
// 91-menu: the main menu and its pages, one scene with a page stack: the Hunt-Off (and Continue), a single hunt, the
// party hunt's join page, the bonus games, the Practice Range, the Lodge, Settings, About & Credits.
const HUNT_ORDER = ['hollow', 'bugle', 'muskeg'];
const DIFFS = [['easy', 'EASY'], ['normal', 'NORMAL'], ['pro', 'PRO']];
function huntIcon(id) { return (g, x, y, s, on) => { const h = reg('hunt', id), sk = h.sky.sky; for (let i = 0; i < 4; i++) px.rect(g, x, y - s / 2 + i * s / 8, s, s / 8 + 1, sk[Math.min(sk.length - 1, i)]); px.rect(g, x, y, s, s / 2, h.palette.types[0].a); px.poly(g, [[x, y + 2], [x + s * .3, y - s * .2], [x + s * .6, y + 1], [x + s, y - s * .25], [x + s, y + 2]], h.sky.layers[1].color); drawRackIcon(g, x + s / 2, y + s * .15, 'bagged', '#e8dcc0'); px.rect(g, x - 1, y - s / 2 - 1, s + 2, 1, '#1a0c08'); px.rect(g, x - 1, y + s / 2, s + 2, 1, '#1a0c08'); }; }
const glyphIcon = kind => (g, x, y, s, on) => {
  const c = on ? '#ffd040' : '#e8c890';
  if (kind === 'rifle') { px.line(g, x, y + 4, x + s, y - 3, '#1a0c08', 4); px.line(g, x, y + 4, x + s, y - 3, '#8a5a30', 2); px.line(g, x + s * .5, y, x + s, y - 3, '#9aa0a8', 2); }
  else if (kind === 'party') { for (let i = 0; i < 4; i++) drawReticleShape(g, x + 4 + i * (s / 4), y, SHAPES[i], SEAT_COLORS[i], 3); }
  else if (kind === 'bonus') { px.disc(g, x + s / 2, y, s * .32, '#1a0c08'); px.disc(g, x + s / 2, y, s * .28, '#e8743a'); px.disc(g, x + s / 2 - 2, y - 2, s * .1, '#ffb070'); }
  else if (kind === 'range') { for (let i = 3; i > 0; i--) px.disc(g, x + s / 2, y, i * s * .12, i % 2 ? '#f4ecd8' : '#c83a2a'); }
  else if (kind === 'lodge') { px.poly(g, [[x + 2, y], [x + s / 2, y - s * .4], [x + s - 2, y]], '#7a3a22'); px.rect(g, x + 4, y, s - 8, s * .35, '#8a5a34'); px.rect(g, x + s / 2 - 2, y + 2, 4, s * .3, '#2a1a10'); }
  else if (kind === 'gear') { px.disc(g, x + s / 2, y, s * .3, c); px.disc(g, x + s / 2, y, s * .12, '#1a0c08'); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; px.rect(g, x + s / 2 + Math.cos(a) * s * .32 - 1, y + Math.sin(a) * s * .32 - 1, 3, 3, c); } }
  else if (kind === 'about') { px.rect(g, x + 4, y - s * .35, s - 8, s * .7, '#e8dcc0'); for (let i = 0; i < 4; i++) px.rect(g, x + 7, y - s * .25 + i * 4, s - 14, 1, '#5a4a3a'); }
  else if (kind === 'trophy') { drawRackIcon(g, x + s / 2, y, 'bagged', '#ffd040'); }
};
const menuScene = {
  camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'menu'; Idle.reset(); showcase(); this.stack = []; this.open(o.page || 'main'); if (G.sfx) G.sfx.music('hoedown', { fade: .6 }); game.allowJoin(false); },
  exit() { game.allowJoin(false); },
  open(page, keep) { const L = this.page(page); if (!L) return; L.id = page; if (!keep) this.stack.push(L); else this.stack[this.stack.length - 1] = L; },
  back() { if (this.stack.length > 1) { const top = this.stack.pop(); if (top.id === 'party') game.allowJoin(false); } else G.game.go('title', {}, { fade: .3 }); },
  get top() { return this.stack[this.stack.length - 1]; },
  page(id) {
    const S = G.game.settings, best = k => Records.d.best[k] ? 'BEST ' + fmt(Records.d.best[k]) : '';
    const di = Math.max(0, DIFFS.findIndex(d => d[0] === S.difficulty));
    const diffItem = () => ({ label: 'DIFFICULTY', choices: DIFFS.map(d => d[1]), ci: di, onTurn: (v, i) => S.set('difficulty', DIFFS[i][0]) });
    if (id === 'main') {
      const save = G.game.saves.get('auto'), cont = save && !save.damaged && !save.newer && save.data;
      const items = [
        cont ? { label: 'CONTINUE HUNT-OFF', sub: 'Next: ' + save.place, icon: glyphIcon('trophy'), act: () => { G.campaign = save.data; startHunt({ mode: 'campaign', hunt: HUNT_ORDER[save.data.next] || 'hollow' }); } } : { label: 'HUNT-OFF', sub: 'Three hunts. The trophy wall.', icon: glyphIcon('trophy'), act: () => { G.campaign = { next: 0, scores: {} }; startHunt({ mode: 'campaign', hunt: 'hollow', first: true }); } },
        { label: 'SINGLE HUNT', sub: 'One hunt, start to trophy', icon: glyphIcon('rifle'), act: () => this.open('single') },
        { label: 'PARTY HUNT', sub: '2 to 4 on one screen', icon: glyphIcon('party'), act: () => this.open('party') },
        { label: 'BONUS GAMES', sub: 'Crows, clays, snowmen', icon: glyphIcon('bonus'), act: () => this.open('bonus') },
        { label: 'PRACTICE RANGE', sub: "Uncle Dub's lessons", icon: glyphIcon('range'), act: () => startHunt({ mode: 'range', hunt: 'range' }) },
        { label: 'THE LODGE', sub: 'Trophies and records', icon: glyphIcon('lodge'), act: () => G.game.go('lodge', {}) },
        { label: 'SETTINGS', sub: 'Sound, controls, assists', icon: glyphIcon('gear'), act: () => G.game.menu('settings') },
        { label: 'ABOUT & CREDITS', sub: 'Who made this, and how', icon: glyphIcon('about'), act: () => G.game.go('about', {}) }
      ];
      if (cont) items.splice(1, 0, { label: 'NEW HUNT-OFF', sub: 'Start over at Hollow Creek', icon: glyphIcon('trophy'), act: () => { G.game.saves.erase('auto'); G.campaign = { next: 0, scores: {} }; startHunt({ mode: 'campaign', hunt: 'hollow', first: true }); } });
      return new UIList({ items, cols: 2, w: 236, h: 30, gap: 6, y: 'center', title: '', top: true });
    }
    if (id === 'single') return new UIList({ title: 'SINGLE HUNT', sub: 'Pick your ground', w: 330, h: 34, y: 76, items: HUNT_ORDER.map(h => { const H = reg('hunt', h); return { label: H.name.toUpperCase(), sub: H.when + ' · ' + reg('species', H.species).label + ' · Trophy: ' + reg('trophy', H.trophy).name, right: best(h), icon: huntIcon(h), act: () => startHunt({ mode: 'single', hunt: h }) }; }).concat([diffItem()]) });
    if (id === 'bonus') return new UIList({ title: 'BONUS GAMES', sub: '30 seconds. A bigger tube. Go for PERFECT.', w: 330, h: 34, y: 80, items: HUNT_ORDER.map(h => { const B = reg('bonus', reg('hunt', h).bonus); return { label: B.name.toUpperCase(), sub: B.blurb, right: best(B.id), icon: glyphIcon('bonus'), act: () => startHunt({ mode: 'bonusOnly', hunt: h }) }; }) });
    if (id === 'party') { game.allowJoin({ max: 4, onJoin: (input, n) => { G.sfx && G.sfx.play('confirm'); } }); return new UIList({ title: 'PARTY HUNT', sub: 'Press OPTIONS or START on a controller to join', w: 300, h: 26, y: 150, party: true, items: HUNT_ORDER.map(h => ({ label: reg('hunt', h).name.toUpperCase(), sub: '', icon: huntIcon(h), act: () => startParty({ mode: 'party', hunt: h }) })).concat([{ label: 'QUICK DRAW', sub: 'Site 1 of each hunt, then Saucer Season', icon: glyphIcon('bonus'), act: () => startParty({ mode: 'quick', hunt: 'hollow' }) }]) }); }
    return null;
  },
  update(dt) {
    showcase().update(dt); if (G.sfx) G.sfx.update(dt);
    Idle.update(dt);
    if (Idle.t > 10 && this.stack.length === 1 && !G.ui.screen) { G.game.go('attract', {}, { fade: .5 }); return; }
    if (G.ui.screen) return;
    const L = this.top; if (!L) return;
    const r = L.update(dt);
    if (r === 'back') this.back();
  },
  draw(r) {
    showcase().draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H, L = this.top; dim(g, W, Ht, .5);
      if (!L) return;
      if (L.id === 'main') drawLogo(g, W, 28, .55);
      if (L.party) drawJoin(g, W, Ht);
      L.draw(g, W, Ht);
      promptBar(g, W, Ht, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
    });
  }
};
function drawJoin(g, W, Ht) {
  const P = G.game.players, y = 64;
  for (let i = 0; i < 4; i++) {
    const x = W / 2 - 190 + i * 96, on = !!P[i];
    E.ui.box(g, x, y, 88, 70, { bg: on ? [E.tones(SEAT_COLORS[i]).sh, '#1a0e06'] : ['#2a2018', '#140c08'], border: on ? SEAT_COLORS[i] : '#5a4a3a', alpha: .9 });
    drawReticleShape(g, x + 44, y + 22, SHAPES[i], on ? SEAT_COLORS[i] : '#5a4a3a', 8);
    E.font.text(g, 'P' + (i + 1), x + 44, y + 38, on ? '#ffffff' : '#8a7a68', { align: 'center', scale: 2, outline: false });
    E.font.text(g, on ? (i === 0 ? (P[0].lastDevice === 'gamepad' ? 'CONTROLLER' : 'MOUSE + KEYS') : 'CONTROLLER') : 'PRESS START', x + 44, y + 56, on ? '#e8dcc8' : '#8a7a68', { align: 'center', outline: false });
  }
}
function startParty(o) {
  const ins = G.game.players.slice(0, 4), players = ins.map((I, i) => new Player(i + 1, I));
  game.allowJoin(false);
  startHunt(Object.assign({ players }, o));
}

/* ===== src/92-hunt.js ===== */
// 92-hunt: the scene where all hunting happens. A hunt is a queue of segments on one landscape (so the world, timers and
// particles survive between them): the establishing shot and briefing, a walk-in and a site three times over (each with
// its tally), the trophy, the bonus game, the results. The same runtime plays a single hunt, the campaign, a party, a
// Quick Draw, a bonus game alone, the Practice Range, the attract mode's clips and an AI Hub round.
const DIFF = {
  easy: { assist: 'strong', autoPump: true, speed: .85, calls: 1, sway: .8, doeShare: .8 },
  normal: { assist: null, autoPump: false, speed: 1, calls: 0, sway: 1, doeShare: 1 },
  pro: { assist: 'off', autoPump: false, speed: 1.15, calls: 0, sway: 1.3, doeShare: 1.3 }
};

class Hunt {
  constructor(o) {
    this.o = o; this.mode = o.mode || 'single'; this.huntId = o.hunt || 'hollow'; this.time = 0; this.actors = []; this.shots = []; this.seg = null; this.queue = []; this.site = null;
    this.hunt = reg('hunt', this.huntId); this.species = this.hunt.species; this.world = G.world = worldFor(this.huntId);
    this.diff = Object.assign({}, DIFF[o.difficulty || G.game.settings.difficulty || 'normal']); if (!this.diff.assist) delete this.diff.assist;
    this.players = o.players || [new Player(1, G.game.input)];
    for (const p of this.players) { p.score = o.keepScore ? p.score : 0; p.resetSite(); p.stats = p.stats || {}; }
    this.cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 4, fov: 34, roll: 0 }; this.lens = new E.Lens(); this.W = 480; this.H = 270;
    { const es = this.hunt.establish, w = this.world; if (es) { const [x, y, z, yaw] = es.to; Object.assign(this.cam, { x: x * M, y: y * M, z: w.height(x * M, y * M) + z * M, yaw: yaw * DEG, pitch: 5, fov: 36 }); } else { const v0 = Object.keys(w.vant)[0], e = w.eye(v0); Object.assign(this.cam, { x: e.x, y: e.y, z: e.z, yaw: e.yaw }); } this.vkind = 'air'; }
    this.results = []; this.siteResults = []; this.trophyInfo = null; this.bonusResult = null; this.vantageId = null; this.fanB = [-35, 35];
    this.hubMode = this.mode === 'hub'; this.godMode = !!o.godMode; this.noFollow = this.mode === 'attract' && false;
    this.rival = null; this.kickT = 0; this.stink = 0; this.splats = [];
    if (!o.showcase) { HUD.reset(); HUD.shown = {}; RNG.seed(o.seed || (this.hubMode ? 0 : 1 + Math.floor(G.game.real * 1000) % 100000)); }
    this.buildQueue();
    if (!o.showcase) { G.hunt = this; bus.emit('huntStart', this); }
  }
  /** the segment queue for this mode */
  buildQueue() {
    const H = this.hunt, q = this.queue, m = this.mode, o = this.o;
    if (o.queue) { for (const s of o.queue) q.push(s); return; }
    if (m === 'range') { q.push({ kind: 'range' }, { kind: 'next' }); return; }
    if (m === 'bonusOnly') { q.push({ kind: 'dialog', beat: H.bonusBeat }, { kind: 'walk', to: reg('bonus', H.bonus).vantage }, { kind: 'bonus', id: H.bonus }, { kind: 'bonusTally' }, { kind: 'results', bonusOnly: true }, { kind: 'next' }); return; }
    if (m === 'quick') { q.push({ kind: 'walk', to: reg('site', H.sites[0]).vantage, quick: true }, { kind: 'site', id: H.sites[0], timeBoxed: true, time: 50 }, { kind: 'tally' }, { kind: 'next' }); return; }
    q.push({ kind: 'establish' });
    if (m === 'campaign' && this.o.first) q.push({ kind: 'dialog', beat: 'welcome' }, { kind: 'dialog', beat: 'rivals' });
    if (H.intro) q.push({ kind: 'dialog', beat: H.intro });
    for (const sid of H.sites) q.push({ kind: 'walk', to: reg('site', sid).vantage }, { kind: 'site', id: sid }, { kind: 'tally' });
    if (H.trophy) q.push({ kind: 'dialog', beat: H.legendBeat }, { kind: 'walk', to: reg('trophy', H.trophy).vantage }, { kind: 'trophy', id: H.trophy }, { kind: 'trophyEnd' }, { kind: 'tally', trophy: true });
    if (H.bonus) q.push({ kind: 'dialog', beat: H.bonusBeat }, { kind: 'walk', to: reg('bonus', H.bonus).vantage }, { kind: 'bonus', id: H.bonus }, { kind: 'bonusTally' });
    q.push({ kind: 'results' });
    if (m === 'campaign' || m === 'single') q.push({ kind: 'dialog', beat: H.outro, outro: true });
    q.push({ kind: 'next' });
  }
  get segIndex() { return this._si || 0; }
  nextSeg() {
    if (this.seg && this.seg.exit) this.seg.exit();
    const s = this.queue.shift(); this._si = (this._si || 0) + 1;
    if (!s) { this.seg = null; this.finished = true; return; }
    const f = SEG[s.kind]; if (!f) throw new Error('no segment ' + s.kind);
    this.seg = f(this, s); this.seg.kind = this.seg.kind || s.kind; this.seg.spec = s;
    this.inputBlocked = !!this.seg.block; this.cinema = !!this.seg.cinema; this.canScope = this.seg.canScope !== false; this.canCall = !!this.seg.canCall;
    if (this.seg.enter) this.seg.enter();
    bus.emit('segment', this.seg);
  }
  /** jump to the first segment of a kind (dev mode, deep links) */
  skipTo(kind, id) {
    let guard = 0;
    while (this.queue.length && guard++ < 60) { const s = this.queue[0]; if (s.kind === kind && (!id || s.id === id)) break; this.queue.shift(); }
    if (this.seg && this.seg.exit) this.seg.exit();
    if (this.site && (!this.seg || this.seg.kind !== 'site')) { this.site.dispose(); this.site = null; }
    this.seg = null; this.nextSeg();
  }
  skip() { if (this.seg && this.seg.skip) this.seg.skip(); else this.nextSeg(); }
  later(s, fn) { return G.game.after(s, fn); }
  /** fire: a round goes through the aim point, resolved with every other shot this step */
  trigger(p) {
    if (p.benched || !this.seg || !this.seg.canShoot) return;
    const r = p.rifle.fire(this.time);
    if (r === null) return;
    if (r === false) { if (G.sfx) G.sfx.play('dry'); p.kick = .4; if (p.rifle.dryCount <= 2 || p.rifle.dryCount % 4 === 0) HUD.tip('pump' + p.n + '_' + p.rifle.dryCount, 'pump', 'PUMP!', { times: 99, p, dur: 1.4 }); return; }
    const [sx, sy] = p.aimPoint(), ray = this.lens.ray(sx, sy);
    this.shots.push({ p, ray, sx, sy, t: this.time });
    p.bloom = 1; p.kick = 1;
    if (this.players.length === 1 && !this.hubMode) this.kickT = .25;
    G.game.shake(1.2); if (p.input.rumble) p.input.rumble(.35, .08);
    if (G.sfx) G.sfx.shot(this);
  }
  useCall(p) {
    if (!p.call.use()) { if (G.sfx) G.sfx.play('back'); return; }
    const c = { x: this.cam.x, y: this.cam.y, p, species: this.species };
    if (G.sfx) G.sfx.call(reg('species', this.species).call, null, 1);
    let n = 0; for (const a of this.actors) if (a.hearCall(c)) n++;
    bus.emit('call', Object.assign(c, { n }));
  }
  update(dt) {
    if (this.camFX && trophyCamStep(this, dt)) return;
    if (DEV.free) DEV.updateFree(G.game.timeScale > 0 ? dt / G.game.timeScale : 1 / 120);
    this.time += dt; this.dt = dt;
    if (!this.seg && !this.finished) this.nextSeg();
    if (!this.seg) return;
    // players: aim, pump, scope, call, fire (shots resolve together after)
    this.setupLens();
    for (const p of this.players) p.update(dt, this);
    if (this.shots.length) { const S = this.shots.splice(0); if (this.seg.resolve) this.seg.resolve(S); else resolveShots(this, S); }
    if (this.kickT > 0) this.kickT = Math.max(0, this.kickT - dt);
    if (this.stink > 0) this.stink = Math.max(0, this.stink - dt);
    for (const s of this.splats) s.t += dt; this.splats = this.splats.filter(s => s.t < s.dur);
    // the segment (its camera), then the actors
    const done = this.seg.update(dt);
    this.setupLens();
    if (this.seg && this.seg.actorsLive !== false) {
      for (const a of this.actors) a.update(dt);
      this._visT = (this._visT || 0) - dt; if (this._visT <= 0) { this._visT = .15; this.visibility(); }
    }
    if (G.fx) G.fx.update(dt, this);
    HUD.update(dt);
    this.showBoard = !this.hubMode && this.players.some(p => p.input.down('board'));
    if (done && !this.hubMode) this.nextSeg();
    else if (done) this.segDone = true;
  }
  /** who can be seen: on screen, and nothing between the eye and the chest */
  visibility() {
    const L = this.lens, q = [0, 0, 0, 0];
    for (const a of this.actors) {
      if (!a.alive) { a.visible = false; continue; }
      const cz = a.z + (a.rig.height || 10) * .45 * T('animalScale');
      let vis = !!L.project(a.x, a.y, cz, q) && q[0] > 0 && q[0] < this.W && q[1] > 0 && q[1] < this.H;
      if (vis) { const ray = { x: L.x, y: L.y, z: L.z, dx: (a.x - L.x) / q[3], dy: (a.y - L.y) / q[3], dz: (cz - L.z) / q[3] }, R = resolveRay(this, ray, { maxT: q[3] * 1.02 }); vis = R.actor === a || (R.kind === 'sky' || R.t >= q[3] * .97); }
      if (vis && !a.visible && a.seenAt === null) { a.seenAt = this.time; if (a.trophy) bus.emit('trophySpotted', a); }
      a.visible = vis;
    }
  }
  /** the camera at a vantage, looking along a bearing */
  camAt(vid, bearing = 0, pitch = 4, fov = 34) { const e = this.world.eye(vid); Object.assign(this.cam, { x: e.x, y: e.y, z: e.z, yaw: e.yaw + bearing * DEG, pitch, fov, roll: 0 }); this.vkind = e.v.kind; return this.cam; }
  /** the camera this instant (with the canoe's bob, the breathing drift and recoil in single player, the Trophy Cam
   *  or the free camera) into this.lens: update and draw both use it, so a shot goes where the picture shows */
  setupLens() {
    const W = this.W, Ht = this.H, fxc = (this.camFX && trophyCamView(this)) || DEV.free, c = fxc || this.cam, t = this.time;
    let yaw = c.yaw, pitch = c.pitch, z = c.z;
    if (!fxc) {
      if (this.players.length === 1 && !this.hubMode && this.seg && this.seg.kind === 'site') { yaw += Math.sin(t * .7) * .15 * DEG; pitch += Math.sin(t * .53 + 1) * .12 + this.kickT * 1.6; }
      if (this.vkind === 'canoe') { z += Math.sin(t * TAU / 3.1) * .06 * M; pitch += Math.sin(t * TAU / 3.1 + 1.2) * .25; }
      if (this.moCrash > 0) { pitch -= 22 * this.moCrash; z -= 2.6 * M * (1 - this.moCrash); yaw += Math.sin(t * 30) * this.moCrash * .04; }
    }
    this.halfFovH = Math.atan(Math.tan(c.fov * DEG / 2) * W / Ht) / DEG;
    this.lens.setup({ x: c.x, y: c.y, z, yaw, pitch, fov: c.fov }, W, Ht);
    return fxc;
  }
  draw(r) {
    this.W = r.W; this.H = r.H; const W = this.W, Ht = this.H;
    const fxc = this.setupLens(); this.world.vista.time = this.time;
    const items = this.gatherItems(this.lens);
    this.world.vista.draw(r, this.lens, items, { key: 'main' });
    if (fxc) { r.overlay(g => { if (DEV.free) drawForeground(g, this, W, Ht); HUD.draw(g, this, W, Ht); this.camFX && this.camFX.draw(g, W, Ht); DEV.draw(g, this, W, Ht); }); return; }
    r.overlay(g => this.overlay(g, W, Ht, items));
    if (G.talk && G.talk.open && !this.o.showcase) G.talk.draw(r);
  }
  gatherItems(L) {
    const items = this.world.gather(L, []);
    for (const a of this.actors) { const it = a.item(); if (it) items.push(it); }
    if (G.fx) G.fx.items(items, this);
    if (this.seg && this.seg.items) this.seg.items(items, L);
    return items;
  }
  overlay(g, W, Ht, items) {
    const seg = this.seg;
    if (G.fx) G.fx.drawScreen(g, this, W, Ht, 'back');
    drawForeground(g, this, W, Ht);
    if (G.fx) G.fx.drawScreen(g, this, W, Ht, 'front');
    if (seg && seg.drawWorld) seg.drawWorld(g, W, Ht);
    if (seg && seg.showReticles !== false && !this.cinema) { for (const p of this.players) if (p.scope.raise > .05) this.drawScope(g, p, items, W, Ht); this.drawGhosts && this.drawGhosts(g, W, Ht); for (const p of this.players) this.drawReticle(g, p); }
    if (this.stink > 0) drawStink(g, this, W, Ht);
    for (const s of this.splats) drawSplat(g, s);
    if (!this.o.showcase) HUD.draw(g, this, W, Ht);
    if (seg && seg.draw) seg.draw(g, W, Ht);
    if (this.camFX) this.camFX.draw(g, W, Ht);
    if (!this.o.showcase) DEV.draw(g, this, W, Ht);
  }
  drawReticle(g, p) {
    if (p.scope.raise > .6) return;
    const b = p.bloom * 3 + (p.rifle.dryT > 0 ? 2 : 0), jx = p.rifle.dryT > 0 ? Math.round(Math.sin(G.game.real * 70) * 2) : 0;
    drawReticleShape(g, Math.round(p.rx + jx), Math.round(p.ry), p.shape, p.benched ? '#8a8a8a' : p.color, 7 + b);
    if (p.benched) E.font.text(g, 'BENCHED', p.rx, p.ry + 12, '#c8c8c8', { align: 'center', shadow: '#000' });
    if (this.players.length > 1) E.font.text(g, p.name, p.rx + 10, p.ry - 14, p.color, { outline: '#140c08' });
  }
  /** a scope: the world drawn again magnified about the swayed aim point, masked to a circle at the reticle */
  drawScope(g, p, items, W, Ht) {
    const R = Math.round(54 * (W / 480 > 1.3 ? 1.15 : 1)), mag = T('scopeMag'), [s0x, s0y] = p.aimPoint(), k = sm(p.scope.raise);
    const cx = Math.round(p.rx), cy = Math.round(p.ry), rr = Math.max(4, Math.round(R * (.35 + .65 * k)));
    const V = this.world.vista, size = rr * 2, T2 = V.target(size, size, 'scope' + p.n);
    const L2 = this.lens.magnified(s0x, s0y, 1 + (mag - 1) * k, rr, rr, size, size);
    V.render(T2, L2, items, { far: V.fog.far * 1.02 });
    const lc = this._lensCv && this._lensCv.width === size ? this._lensCv : (this._lensCv = E.mkCanvas(size, size)), lg = E.ctx2d(lc);
    lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, size, size);
    const m = 1 + (mag - 1) * k; if (V._skyCv) lg.drawImage(V._skyCv, s0x - rr / m, s0y - rr / m, size / m, size / m, 0, 0, size, size);
    if (T2.img) { V.present(lg, T2, 0, 0); }
    lg.globalCompositeOperation = 'destination-in'; E.px.reset(lg); px.disc(lg, rr, rr, rr - .5, '#000'); lg.globalCompositeOperation = 'source-over';
    g.drawImage(lc, cx - rr, cy - rr); E.px.reset(g);
    // the ring, the crosshair, the breath arc
    for (let a = 0; a < 96; a++) { const t = a / 96 * TAU; px.dot(g, cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, '#0a0806'); px.dot(g, cx + Math.cos(t) * (rr + 1), cy + Math.sin(t) * (rr + 1), '#2a241e'); px.dot(g, cx + Math.cos(t) * (rr + 2), cy + Math.sin(t) * (rr + 2), '#0a0806'); }
    const xc = p.benched ? '#8a8a8a' : '#140c08';
    px.line(g, cx - rr + 2, cy, cx - 4, cy, xc); px.line(g, cx + 4, cy, cx + rr - 2, cy, xc); px.line(g, cx, cy - rr + 2, cx, cy - 4, xc); px.line(g, cx, cy + 4, cx, cy + rr - 2, xc);
    px.line(g, cx - rr + 2, cy - 1, cx - rr * .45, cy - 1, xc); px.line(g, cx + rr * .45, cy - 1, cx + rr - 2, cy - 1, xc);
    px.dot(g, cx, cy, p.color);
    const b = p.scope.breath / T('breath'), n = Math.round(40 * b);
    for (let i = 0; i < n; i++) { const t = -Math.PI * .75 + i / 40 * Math.PI * .5; px.dot(g, cx + Math.cos(t) * (rr + 5), cy + Math.sin(t) * (rr + 5), p.scope.shaky > 0 ? '#e8443a' : p.scope.holding ? '#7ad0ff' : '#e8e0d0'); }
    if (this.players.length > 1) drawReticleShape(g, cx + rr - 6, cy - rr + 6, p.shape, p.color, 4);
  }
  restartSite() {
    const s = this.seg && (this.seg.kind === 'site' || this.seg.kind === 'trophy' || this.seg.kind === 'bonus') ? this.seg.spec : null; if (!s) { G.game.resume(); return; }
    G.game.resume(); if (this.seg.exit) this.seg.exit(); if (this.site) { this.site.dispose(); this.site = null; }
    for (const p of this.players) { p.score = Math.max(0, p.score - (this.seg.scoreAt !== undefined ? p.score - (this.seg.scoreAt[p.i] || 0) : 0)); }
    this.queue.unshift(Object.assign({}, s)); this.seg = null; this.nextSeg();
  }
  restartHunt() { G.game.resume(); startHunt(Object.assign({}, this.o, { players: this.players })); }
  dispose() { if (this.seg && this.seg.exit) this.seg.exit(); if (this.site) this.site.dispose(); this.site = null; this.actors.length = 0; }
}

/* ---------- segments: the establishing shot, the walk-in, a site ---------- */
SEG.establish = (H, o) => {
  const E2 = H.hunt.establish, t0 = H.time, card = { t: 0 };
  return { block: true, cinema: true, canShoot: false, showReticles: false,
    enter() { const [x, y, z, yaw] = E2.from; Object.assign(H.cam, { x: x * M, y: y * M, z: H.world.height(x * M, y * M) + z * M, yaw: yaw * DEG, pitch: 8, fov: 38 }); H.vkind = 'air'; if (G.sfx) G.sfx.music(H.hunt.ambience === 'muskeg' ? 'stalk' : 'stalk', { fade: 1 }); },
    update(dt) {
      card.t += dt; const u = sm(card.t / E2.secs), [x0, y0, z0, w0] = E2.from, [x1, y1, z1, w1] = E2.to;
      const x = lerp(x0, x1, u) * M, y = lerp(y0, y1, u) * M; Object.assign(H.cam, { x, y, z: H.world.height(x, y) + lerp(z0, z1, u) * M, yaw: lerp(w0, w1, u) * DEG, pitch: lerp(9, 5, u) });
      if (card.t > .4 && anyConfirm(H)) return true;
      return card.t >= E2.secs;
    },
    draw(g, W, Ht) {
      const a = clamp(card.t / .6, 0, 1) * clamp((E2.secs - card.t) / .6, 0, 1); if (a < .1) return;
      const h = H.hunt, y = Ht * .62;
      E.ui.box(g, W / 2 - 150, y - 8, 300, 62, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .86 });
      E.font.title(g, h.name.toUpperCase(), W / 2, y, { scale: 2, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      E.font.text(g, h.when.toUpperCase() + '  ·  ' + reg('species', h.species).label.toUpperCase(), W / 2, y + 26, '#f4ead8', { align: 'center', outline: false });
      E.font.text(g, h.blurb, W / 2, y + 38, '#b8a488', { align: 'center', outline: false });
      Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, H.players[0].input, { align: 'right' });
    }
  };
};
function anyConfirm(H) { return H.players.some(p => (p.input.pressed('confirm') || p.input.pressed('fire') || p.input.clicked && p.input.clicked())); }
SEG.walk = (H, o) => {
  // the last stretch of the trail into the next vantage: the camera walks (head bob), climbs into a stand
  const e = H.world.eye(o.to), v = e.v, back = o.quick ? 18 : 34, a = e.yaw + (v.approach || 0) * DEG, sx = e.x - Math.cos(a) * back * M, sy = e.y - Math.sin(a) * back * M;
  const dur = o.quick ? 2.2 : 4.6; let t = 0;
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { H.vkind = 'ground'; if (H.site) { H.site.dispose(); H.site = null; } H.actors.length = 0; G.fx.reset(); },
    update(dt) {
      t += dt; const u = clamp(t / dur, 0, 1), w = sm(Math.min(1, u * 1.15)), x = lerp(sx, e.x, w), y = lerp(sy, e.y, w), gz = H.world.height(x, y);
      const climb = v.kind === 'treestand' || v.kind === 'porch' || v.kind === 'rock' ? sm((u - .7) / .3) : 1, eyeZ = lerp(gz + 1.7 * M, e.z, climb);
      Object.assign(H.cam, { x, y, z: eyeZ + Math.sin(t * 9) * .05 * M * (1 - u), yaw: a + Math.sin(t * 1.3) * .02, pitch: 5, fov: 36, roll: 0 });
      if (t > .3 && anyConfirm(H)) return true;
      return t >= dur;
    },
    exit() { H.vkind = v.kind; },
    draw(g, W, Ht) { if (t > .2) Glyph.cue(g, 'confirm', 'SKIP', W - 40, Ht - 14, H.players[0].input, { align: 'right' }); E.font.text(g, 'TO ' + (v.name || 'the stand').toUpperCase(), W / 2, Ht - 30, '#f4ead8', { align: 'center', shadow: '#000' }); }
  };
};
SEG.site = (H, o) => {
  const def = reg('site', o.id); let site, phase = 'card', t = 0;
  return { canCall: true, kind: 'site',
    enter() {
      H.camAt(def.vantage, def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0, def.frame.pitch, def.frame.fov);
      for (const p of H.players) p.resetSite(); for (const p of H.players) { p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .55; }
      this.scoreAt = H.players.map(p => p.score);
      site = H.site = new Site(H, def, { timeBoxed: o.timeBoxed, time: o.time });
      HUD.banner(def.name.toUpperCase(), { scale: 2, dur: 1.6, sub: H.hunt.name.toUpperCase() });
      if (G.sfx) { G.sfx.music('stalk', { fade: .8 }); G.sfx.ambience(H.hunt.ambience); }
      if (H.diff.autoPump) for (const p of H.players) p.forceAuto = true;
    },
    update(dt) {
      t += dt;
      if (phase === 'card') { if (t > 1.2) { phase = 'play'; HUD.banner(isTargetKind(H.species === 'whitetail' ? 'buck' : 'bull') ? (H.species === 'whitetail' ? 'BUCKS ONLY!' : 'BULLS ONLY!') : 'BUCKS ONLY!'); bus.emit('playStart', site); } }
      site.update(dt);
      const c = H.camAt(def.vantage, site.camB, site.pitch, site.fov);
      if (phase === 'play' && site.phase === 'end') { phase = 'end'; HUD.banner(site.endReason === 'clear' ? 'SITE CLEAR!' : site.endReason === 'benched' ? 'BENCHED!' : 'TIME!', { scale: 3 }); if (G.sfx) G.sfx.sting(site.endReason === 'clear' ? 'siteclear' : 'escaped'); }
      if (site.done) { if (this.closed) return true; this.closed = true; siteBonuses(site); H.lastSite = site; H.siteResults.push(site); for (const res of site.results) { Records.setStars(site.id, res.stars); } Records.stat('sites', 1); return true; }
      return false;
    },
    get canShoot() { return phase === 'play' || phase === 'card'; },
    exit() { for (const p of H.players) p.forceAuto = false; }
  };
};
SEG.next = (H, o) => ({ block: true, cinema: true, enter() {}, update() { huntFinished(H); return false; } });
/** the hunt is over: the campaign's next hunt, or back to the menu */
function huntFinished(H) {
  if (H._left) return; H._left = true;
  if (H.mode === 'campaign') {
    const order = ['hollow', 'bugle', 'muskeg'], i = order.indexOf(H.huntId);
    const save = Object.assign({}, G.campaign || {}, { next: i + 1, scores: Object.assign({}, (G.campaign || {}).scores, { [H.huntId]: H.players[0].score }) });
    G.campaign = save;
    if (i + 1 < order.length) { G.game.saves.save('auto', { data: save, place: reg('hunt', order[i + 1]).name, level: i + 2 }); startHunt({ mode: 'campaign', hunt: order[i + 1], players: H.players }); }
    else { G.game.saves.erase('auto'); G.game.go('lodge', { ceremony: true, campaign: save }); }
    return;
  }
  if (H.mode === 'attract' && G.attract) { G.attract.clipDone(); return; }
  if (H.mode === 'quick') { const order = ['hollow', 'bugle', 'muskeg'], i = order.indexOf(H.huntId); if (i + 1 < order.length) startHunt(Object.assign({}, H.o, { hunt: order[i + 1], players: H.players, keepScore: true })); else startHunt(Object.assign({}, H.o, { mode: 'bonusOnly', hunt: 'bugle', players: H.players, keepScore: true, quickFinal: true })); return; }
  G.game.go('menu', { page: H.mode === 'range' ? 'main' : 'main' });
}
/** start (or restart) a hunt in the hunt scene */
function startHunt(o) { G.pendingHunt = o; if (G.game.sceneName === 'hunt') { if (G.hunt) G.hunt.dispose(); G.hunt = new Hunt(o); } else G.game.go('hunt', o); }

/* ---------- the foreground: what's around you at each kind of vantage ---------- */
function drawForeground(g, H, W, Ht) {
  const k = H.vkind, yawOff = Math.round((H.cam.yaw - (H.world.eye(H.vantageId || Object.keys(H.world.vant)[0]).yaw)) * 60) || 0;
  if (H.seg && H.seg.noForeground) return;
  if (k === 'treestand') {   // the shooting rail and the platform's edge
    const y = Ht - 22, wood = E.tones('#5a5a52'), x0 = -40 - yawOff % 80;
    px.rect(g, 0, y, W, 6, wood.sh); px.rect(g, 0, y, W, 2, wood.lt); px.rect(g, 0, y + 6, W, 1, '#140c08');
    for (let x = x0; x < W + 40; x += 160) { px.rect(g, x, y + 6, 6, Ht - y, wood.base); px.rect(g, x, y + 6, 2, Ht - y, wood.lt); }
    px.rect(g, 0, Ht - 6, W, 6, E.tones('#3a3a34').sh);
    for (let i = 0; i < 4; i++) px.rect(g, W * .2 + i * 50, y - 1, 10, 1, '#7a7a70');
  } else if (k === 'blind') {   // the blind's fabric round its window
    const C = E.tones('#4a5034'), mesh = (x0, y0, w, h) => { px.rect(g, x0, y0, w, h, C.sh); for (let y = y0; y < y0 + h; y += 3) for (let x = x0 + ((y / 3) % 2 ? 1 : 0); x < x0 + w; x += 3) px.dot(g, x, y, C.deep); for (let i = 0; i < w * h / 90; i++) { const xx = x0 + ((i * 37) % w), yy = y0 + ((i * 53) % h); px.rect(g, xx, yy, 2, 2, i % 3 ? C.base : '#6a5a34'); } };
    mesh(0, 0, W, 16); mesh(0, Ht - 28, W, 28); mesh(0, 16, 14, Ht - 44); mesh(W - 14, 16, 14, Ht - 44);
    px.rect(g, 14, 16, W - 28, 1, '#140c08'); px.rect(g, 14, Ht - 29, W - 28, 1, '#140c08');
  } else if (k === 'rock') {
    const R = E.tones('#8a8478'); const pts = [[0, Ht], [0, Ht - 16], [W * .2, Ht - 22], [W * .45, Ht - 14], [W * .7, Ht - 20], [W, Ht - 12], [W, Ht]];
    px.poly(g, pts, R.sh); px.poly(g, pts.map(p => [p[0], p[1] + 3]), R.base); for (let i = 0; i < 14; i++) px.dot(g, (i * 71) % W, Ht - 8 + (i % 4), i % 2 ? '#6a7a3a' : '#a8b07a');
  } else if (k === 'canoe') {   // the canoe's bow, bobbing
    const b = Math.sin(H.time * TAU / 3.1) * 2, C = E.tones('#2a5a8a'), cx = W / 2;
    px.poly(g, [[cx - 70, Ht], [cx - 10, Ht - 38 + b], [cx + 10, Ht - 38 + b], [cx + 70, Ht]], C.sh); px.poly(g, [[cx - 60, Ht], [cx - 6, Ht - 34 + b], [cx + 6, Ht - 34 + b], [cx + 60, Ht]], C.base);
    px.line(g, cx - 6, Ht - 34 + b, cx - 58, Ht, C.lt); px.poly(g, [[cx - 40, Ht], [cx, Ht - 22 + b], [cx + 40, Ht]], E.tones('#6a4a2a').base);
  } else if (k === 'porch') {
    const C = E.tones('#8a6a4a'); px.rect(g, 0, Ht - 26, W, 5, C.base); px.rect(g, 0, Ht - 26, W, 1, C.lt); for (let x = 6; x < W; x += 22) { px.rect(g, x, Ht - 21, 3, 21, C.sh); }
    px.rect(g, 0, Ht - 5, W, 5, C.deep);
  } else if (k === 'ground' || k === 'range') {
    for (const sx of [0, W]) for (let i = 0; i < 9; i++) { const x = sx === 0 ? i * 7 : W - i * 7, h = 18 + (i * 13) % 16; px.line(g, x, Ht, x + (sx ? -4 : 4), Ht - h, i % 2 ? '#5a6a2a' : '#8a8a3a', 2); }
  }
}
/* ---------- the scene ---------- */
const huntScene = {
  pausable: true, camera: { zoom: false }, touch: [],
  enter(o) { G.scene = 'hunt'; game.input.touchEnabled = false; if (G.hunt && G.hunt !== G.pendingHunt) G.hunt.dispose(); G.hunt = new Hunt(o || G.pendingHunt || {}); },
  exit() { if (G.hunt) G.hunt.dispose(); G.hunt = null; if (G.sfx) G.sfx.ambience(null); },
  update(dt) { if (G.hunt) G.hunt.update(dt); },
  draw(r) { if (G.hunt) G.hunt.draw(r); }
};

/* ===== src/93-lodge.js ===== */
// 93-lodge: Whisker Lake Lodge's trophy room, in the engine's own side view: a wood floor and a plank wall, the
// fireplace, lamps and furniture, Uncle Dub by the fire, the hound asleep; the trophy wall (each trophy dark until it's
// bagged, each hunt's best buck), the records chalkboard, the Range badge, the stats. The campaign's ceremony ends here.
bus.on('kill', e => {   // the best buck of each hunt, for its plaque
  const H = G.hunt; if (!H || H.mode === 'attract' || !Records.d) return; const a = e.a, b = Records.d.bestBuck[H.huntId];
  if (!b || e.kill.points > b.score) { Records.d.bestBuck[H.huntId] = { species: a.sp.id, points: a.points, seed: a.o.seed || 1, dist: Math.round(e.kill.dist), score: e.kill.points, rack: a.sp.rack(a.points) }; Records.save(); }
});
const LODGE_ROWS = [
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '========================================================',
  '########################################################',
  '########################################################'];
class Lodge {
  constructor() {
    this.level = new E.PlatformMap({ rows: LODGE_ROWS, legend: { '#': 1, '=': 2 }, types: { 1: { style: 'wood', side: '#6a4426', top: '#8a5a32' }, 2: { kind: 'back', style: 'plank', side: '#5a3a22' } } });
    this.floorZ = 32; this.t = 0; this.i = 0; this.camX = 120; this.dub = castRig('dub'); this.hound = new E.Blob({ R: 7, ears: 'rabbit', tail: true, feet: true, colors: { dk: '#5a3a1e', base: '#a8743a', lt: '#d8a868', spec: '#fff0d8', eye: '#1a0e08', pupil: '#1a0e08' } });
    this.reset();
  }
  reset(attract) {
    const R = Records.d, tro = ['iron-rack', 'duke', 'bigmo'];
    this.items = [];
    let x = 92;
    for (const id of tro) { const T2 = reg('trophy', id), rec = R.trophies[id] || {}; this.items.push({ kind: 'trophy', id, x, z: 96, name: T2.name, bagged: !!rec.bagged, rec, rig: this.mountRig(T2, id) }); x += 72; }
    for (const h of HUNT_ORDER) { const b = R.bestBuck[h]; this.items.push({ kind: 'best', id: h, x, z: 84, name: 'BEST ' + reg('species', reg('hunt', h).species).label.toUpperCase(), b, rig: b ? new E.Quadruped({ species: b.species, sex: 'm', antlers: Object.assign(reg('species', b.species).antlers(b.points), { seed: b.seed }) }) : null }); x += 56; }
    this.items.push({ kind: 'board', x: x + 20, z: 92, name: 'THE RECORDS BOARD' }); x += 96;
    this.items.push({ kind: 'badge', x, z: 92, name: 'RANGE BADGE', got: !!R.badge }); x += 52;
    this.items.push({ kind: 'champ', x, z: 92, name: 'HUNT-OFF CHAMPION', got: !!R.champion }); x += 52;
    this.items.push({ kind: 'stats', x, z: 70, name: 'YOUR STATS' });
    this.i = Math.min(this.i, this.items.length - 1); this.camX = this.items[this.i].x; this.attract = attract;
  }
  mountRig(T2, id) { const sp = T2.species, pts = id === 'iron-rack' ? 14 : id === 'duke' ? 14 : 72; return new E.Quadruped({ species: sp, sex: 'm', antlers: Object.assign(reg('species', sp).antlers(pts), { seed: 7, kicker: id === 'iron-rack', drop: id === 'iron-rack' }) }); }
  update(dt, attract) {
    this.t += dt;
    if (attract) { this.camX = 100 + (this.t / 6) * (this.items[this.items.length - 1].x - 60); }
    else { const it = this.items[this.i]; this.camX = lerp(this.camX, it.x, Math.min(1, dt * 5)); }
    this.dub.update(dt, { x: 40, y: 0, z: this.floorZ, vx: 0, vy: 0, facing: 0, pose: this.items[this.i] && !attract && this.t < 3 ? 'wave' : null, expr: 'smile' });
    this.hound.update(dt, { squash: Math.sin(this.t * 1.4) * .08 - .15, squint: true });
  }
  draw(r, attract) {
    const L = this.level, g0 = G.game;
    const hw = r.W / 2 / (r.view && r.view.scale || 1), roomW = LODGE_ROWS[0].length * 16;   // the camera stays inside the room
    g0.focus(clamp(this.camX, hw, Math.max(hw, roomW - hw)), 0, 86);
    r.sky(['#1a0e08', '#2a1a0e']);
    L.draw(r);
    // the fireplace: a stone chimney, the fire's light flickering
    const fx = 18, fl = .85 + Math.sin(this.t * 9) * .08 + Math.sin(this.t * 23) * .05;
    r.queue(fx, 2, this.floorZ, g => { const [sx, sy] = r.w(fx, 2, this.floorZ); const S = E.tones('#7a7068'); px.rect(g, sx - 22, sy - 90, 44, 90, S.sh); for (let yy = 0; yy < 90; yy += 6) for (let xx = (yy / 6) % 2 ? -22 : -19; xx < 22; xx += 7) px.rect(g, sx + xx, sy - 90 + yy, 6, 5, (xx + yy) % 3 ? S.base : S.lt); px.rect(g, sx - 14, sy - 28, 28, 28, '#140a06'); px.rect(g, sx - 26, sy - 32, 52, 4, '#5a4a40'); }, { bias: -5 });
    r.prop('brazier', fx, 0, this.floorZ, { light: true, size: 1.2 });
    g0.lights.add(fx, 0, this.floorZ + 20, 80 * fl, .75 * fl, { color: '#ff9a4a' });
    // furniture and lamps
    r.shape('bench', 70, 6, this.floorZ, { facing: Math.PI / 2 }); r.shape('table', 210, 4, this.floorZ, { facing: Math.PI / 2 }); r.shape('chair', 190, 6, this.floorZ, { facing: 0 }); r.shape('chair', 232, 6, this.floorZ, { facing: Math.PI });
    r.shape('bookcase', 300, 10, this.floorZ, { facing: Math.PI / 2 }); r.shape('barrel', 340, 6, this.floorZ, {}); r.shape('barrel', 520, 6, this.floorZ, {}); r.shape('table', 460, 4, this.floorZ, { facing: Math.PI / 2 });
    for (const lx of [140, 380, 600]) { r.prop('lamp', lx, 4, this.floorZ, { light: true }); g0.lights.add(lx, 0, this.floorZ + 40, 56, .55, { color: '#ffd090' }); }
    // Dub and the hound
    r.actor(40, 0, this.floorZ, (g, ox, oy) => this.dub.draw(g, ox, oy, r.view));
    r.actor(70, -8, this.floorZ, (g, ox, oy) => this.hound.draw(g, ox, oy, r.view));
    if (Math.floor(this.t * 1.2) % 3 === 0) r.textAt(78, -8, this.floorZ + 18, 'z', '#e8e0d0');
    // the trophy wall
    this.items.forEach((it, j) => {
      const on = !attract && j === this.i;
      r.queue(it.x, 8, it.z, g => {
        const [sx, sy] = r.w(it.x, 8, it.z);
        if (it.kind === 'trophy' || it.kind === 'best') {
          const size = it.kind === 'trophy' ? 54 : 40;
          if (it.rig && (it.bagged || it.kind === 'best' && it.b)) it.rig.drawMount(g, sx, sy - size * .2, size);
          else { E.tones('#5a3a22'); px.ell(g, sx, sy + size * .1, size * .42, size * .28, '#3a2414'); px.disc(g, sx, sy - size * .05, size * .18, '#120a06'); E.font.text(g, '?', sx, sy - size * .12, '#5a4a3a', { align: 'center', scale: 2, outline: false }); }
          px.rect(g, sx - 20, sy + size * .42, 40, 7, '#c8a050'); E.font.text(g, it.kind === 'trophy' ? (it.bagged ? it.name.split(' ').pop().toUpperCase() : '???') : it.id.toUpperCase(), sx, sy + size * .42 + 1, '#3a2410', { align: 'center', font: 'tiny', outline: false });
        } else if (it.kind === 'board') {
          px.rect(g, sx - 44, sy - 34, 88, 64, '#5a3a20'); px.rect(g, sx - 41, sy - 31, 82, 58, '#1e2a24');
          E.font.text(g, 'RECORDS', sx, sy - 28, '#f0ece0', { align: 'center', outline: false });
          const tb = G.cab.table('campaign').slice(0, 5); tb.forEach((e, q) => E.font.text(g, e.name + ' ' + fmt(e.score), sx, sy - 16 + q * 8, '#d8d8d0', { align: 'center', font: 'tiny', outline: false }));
        } else if (it.kind === 'badge' || it.kind === 'champ') {
          const got = it.got; px.disc(g, sx, sy, 15, got ? '#c8a050' : '#2a1e14'); px.disc(g, sx, sy, 12, got ? (it.kind === 'badge' ? '#c83a2a' : '#3a5a9a') : '#1a120c');
          if (got) { if (it.kind === 'badge') { for (let k = 3; k > 0; k--) px.disc(g, sx, sy, k * 3, k % 2 ? '#f4ecd8' : '#c83a2a'); } else drawRackIcon(g, sx, sy, 'bagged', '#ffd040'); } else E.font.text(g, '?', sx, sy - 5, '#5a4a3a', { align: 'center', scale: 2, outline: false });
        } else if (it.kind === 'stats') { px.rect(g, sx - 26, sy - 30, 52, 40, '#e8dcc0'); for (let q = 0; q < 5; q++) px.rect(g, sx - 20, sy - 24 + q * 7, 40, 1, '#8a7a60'); px.rect(g, sx - 3, sy - 34, 6, 6, '#c83a2a'); }
        if (on) { const k = Math.sin(this.t * 6) * .5 + .5; px.rect(g, sx - 34, sy + 34, 68, 1, k > .5 ? '#ffe0a0' : '#ff8a3a'); px.poly(g, [[sx - 4, sy + 40], [sx + 4, sy + 40], [sx, sy + 36]], '#ff8a3a'); }
      }, { bias: -10 });
    });
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      E.font.title(g, 'THE LODGE', 12, 10, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10' });
      if (attract) return;
      const it = this.items[this.i]; if (!it) return;
      const bw = Math.min(W - 40, 320), x = W / 2 - bw / 2, y = Ht - 84;
      E.ui.box(g, x, y, bw, 56, { bg: ['#2e2014', '#160e08'], border: '#c8843a', alpha: .94 });
      E.font.text(g, it.kind === 'trophy' && !it.bagged ? 'A TROPHY NOT YET TAKEN' : it.name.toUpperCase(), x + 10, y + 6, '#ffd040', { outline: false });
      const lines = this.info(it); lines.forEach((l, q) => E.font.text(g, l, x + 10, y + 18 + q * 10, '#e8dcc8', { outline: false }));
      promptBar(g, W, Ht, [['left', 'BROWSE'], ['cancel', 'BACK']]);
    });
  }
  info(it) {
    const R = Records.d, st = R.stats;
    if (it.kind === 'trophy') { const T2 = reg('trophy', it.id); return it.bagged ? [T2.mount.story, 'Bagged at ' + Math.round(it.rec.best || 0) + ' m' + (it.rec.date ? ' on ' + it.rec.date : '') + '.'] : ['Seen ' + (it.rec.seen || 0) + ' times. Hunt ' + reg('hunt', T2.hunt).name + ' to take him.']; }
    if (it.kind === 'best') return it.b ? [it.b.rack + ', ' + it.b.dist + ' m, worth ' + fmt(it.b.score) + ' points.', 'From ' + reg('hunt', it.id).name + '.'] : ['Nothing on this plaque yet. Bag a buck at ' + reg('hunt', it.id).name + '.'];
    if (it.kind === 'board') { const t = G.cab.table('campaign')[0]; return ['Best Hunt-Off: ' + (t ? t.name + ' ' + fmt(t.score) : '---'), 'Best hunts: ' + HUNT_ORDER.map(h => (R.best[h] ? fmt(R.best[h]) : '-')).join(' / ')]; }
    if (it.kind === 'badge') return [it.got ? 'Earned on Uncle Dub\'s range. He says you\'ll do.' : 'Finish all seven stations of the Practice Range.'];
    if (it.kind === 'champ') return [it.got ? 'First place in the 41st Annual Hunt-Off!' : 'Win the Hunt-Off campaign to hang this plaque.'];
    const acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
    return ['Hunts ' + st.hunts + '  Shots ' + st.shots + '  Accuracy ' + acc + '%  Bucks ' + st.bucks, 'Does shot ' + st.does + '  Longest ' + Math.round(st.longest) + ' m  Favourite sound: the pump.'];
  }
}
const lodgeScene = {
  view: 'side', camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'lodge'; G.game.lights.enabled = true; G.game.lights.ambient = .42; G.game.setView('side'); G.lodge = G.lodge || new Lodge(); G.lodge.reset(); G.game.cam.snap = true; this.o = o; this.cer = null; this.t = 0; if (G.sfx) { G.sfx.music('lodgefire', { fade: .6 }); G.sfx.ambience('lodge'); }
    if (o.ceremony) { const total = Object.values((o.campaign || {}).scores || {}).reduce((a, b) => a + b, 0), rivals = RIVALS.map(id => HUNT_ORDER.reduce((s, h) => s + reg('hunt', h).rivals[id], 0)), win = total > Math.max(...rivals); if (win) { Records.d.champion = true; Records.save(); G.lodge.reset(); } this.cer = { lines: reg('beat', win ? 'ceremony-win' : 'ceremony-lose').lines.slice(), i: -1, total, win }; if (G.cab.qualifies(total, 'campaign')) this.cer.entry = true; this.nextLine(); } },
  exit() { G.game.lights.enabled = false; },
  nextLine() { const c = this.cer; c.i++; if (c.i >= c.lines.length) { c.done = true; if (c.entry) G.cab.enter(c.total, 'campaign', () => { c.entry = false; G.sfx && G.sfx.play('confirm'); }); return; } const [who, line] = c.lines[c.i]; G.talk.say(line, { name: CAST[who].name, portrait: castRig(who), portraitSize: 44, onDone: () => this.nextLine() }); G.talk.nameColor = CAST[who].color; G.bab.say(line, CAST[who].voice); },
  update(dt) {
    this.t += dt; const L = G.lodge; L.update(dt, false); if (G.sfx) G.sfx.update(dt);
    if (this.cer) { if (!this.cer.done) { castRig(this.cer.lines[Math.max(0, this.cer.i)][0]).update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, expr: 'smile' }); G.talk.update(dt); return; } if (G.cab.entry) { G.cab.update(dt); return; } if (uiPressed('confirm') || uiPressed('cancel')) G.game.go('about', { credits: true }); return; }
    if (G.ui.screen) return;
    if (uiRepeat('left')) { L.i = Math.max(0, L.i - 1); UISND.focus(); }
    if (uiRepeat('right')) { L.i = Math.min(L.items.length - 1, L.i + 1); UISND.focus(); }
    const I = G.game.input, m = I.pointer && I.pointer(); if (m && this.lastM && Math.abs(m[0] - this.lastM[0]) > 2) { const r = G.game.r; if (r) { let bj = -1, bd = 30; L.items.forEach((it, j) => { const p = r.w(it.x, 8, it.z); const d = Math.abs(p[0] - m[0]) + Math.abs(p[1] - m[1]) * .5; if (d < bd) { bd = d; bj = j; } }); if (bj >= 0 && bj !== L.i) { L.i = bj; UISND.focus(); } } } this.lastM = m && m.slice();
    if (uiPressed('cancel') && this.t > .3) { UISND.back(); G.game.go('menu', { page: 'main' }); }
  },
  draw(r) { G.lodge.draw(r, false); if (this.cer) { G.talk.draw(r); if (G.cab.entry) r.overlay(g => G.cab.draw({ overlay: f => f(g), W: r.W, H: r.H, bw: r.W + 2, bh: r.H + 2 })); else if (this.cer.done) r.overlay(g => { E.font.title(g, this.cer.win ? 'HUNT-OFF CHAMPION!' : 'THE 41ST HUNT-OFF', r.W / 2, 36, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' }); E.font.text(g, 'TOTAL ' + fmt(this.cer.total), r.W / 2, 60, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); Glyph.cue(g, 'confirm', 'THE CREDITS', r.W / 2, r.H - 14, G.game.input); }); } }
};

/* ===== src/94-about.js ===== */
// 94-about: About & Credits: Source Information, the Testing, Engine and Prompt Feedback (the same words as the chat
// reply and exit-interview.json: the build puts report.json in as __REPORT__), and the credits. One idea a page, big text;
// left and right (or L1 and R1, Q and E, a click on the arrows) turn the pages; back leaves.
const QUESTIONS = {
  testingFeedback: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  engineFeedback: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'],
  promptFeedback: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
};
const SI_LABELS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
/** the pages for a screen of W x Ht: fields packed by their wrapped lines, as many as fit, a long one carried over */
function aboutPages(W = 640, Ht = 360) {
  const R = __REPORT__ || {}, SI = R.sourceInformation || {}, pages = [];
  const tw = Math.min(W - 40, 420) - 28, avail = Ht - 62 - 34 - 18;
  const pack = (title, fields) => {
    let cur = { title, items: [] }, used = 0;
    for (const [label, text] of fields) {
      let lines = E.font.wrap(String(text), tw), first = true;
      while (lines.length) {
        const lab = first ? label : label + ' (continued)', labH = E.font.height(E.font.wrap(lab.toUpperCase(), tw).length) + 3, room = Math.floor((avail - used - labH - 6) / 10);
        if (room < Math.min(3, lines.length) && cur.items.length) { pages.push(cur); cur = { title, items: [] }; used = 0; continue; }
        const take = lines.slice(0, Math.max(1, room)); lines = lines.slice(take.length);
        cur.items.push([lab, take]); used += labH + take.length * 10 + 6; first = false;
        if (lines.length) { pages.push(cur); cur = { title, items: [] }; used = 0; }
      }
    }
    if (cur.items.length) pages.push(cur);
  };
  // Source Information: as many fields a page as fit, so every word stays big
  pack('SOURCE INFORMATION', SI_LABELS.map(([k, l]) => [l, SI[k] || 'unknown']));
  for (const [key, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) {
    const A = R[key] || []; QUESTIONS[key].forEach((q, i) => pack(title, [[q, A[i] || 'unknown']]));
  }
  const credits = [];
  credits.push({ title: 'CREDITS', items: [['Game', 'BIG BUCK HUNT-OFF. Design, code, pixels and sound made in code by Claude (Anthropic claude-opus-5-5), from a plan by claude-opus-5-5.'], ['Engine', 'my-3D2dge v0.85.2 by Michael Crosato (MIT). New modules: vista (the landscape), quadruped (animals and antlers), babble (voices).'], ['Online', 'AI Hub Session Protocol v1, session client 1.4.0.']] });
  credits.push({ title: 'CREDITS', items: [['Sound', 'Every song, sound and voice is synthesized in code: no audio files.'], ['Assets', 'Furniture shapes from the engine\'s core library. Trees, rocks, corn, reeds and buildings painted in code for this game.'], ['The cast', 'Uncle Dub, Granny Mae, Cousin Dwayne, Loretta Pruitt, Big Earl, the Emcee, Hank the scarecrow, Bessie the cow.']] });
  credits.push({ title: 'CREDITS', items: [['Inspired by', 'Big Buck Hunter Pro (Play Mechanix / Raw Thrills, 2006). An original game: its own title, people, places, bonus games, writing, art and sound.'], ['Thanks', 'To every hunter who ever pumped a plastic shotgun at a bar. Bucks only!']] });
  for (const c of credits) pack(c.title, c.items);
  return pages;
}
const aboutScene = {
  camera: { zoom: false }, touch: [],
  enter(o = {}) { G.scene = 'about'; this.pages = aboutPages(G.game.W, G.game.H); this._size = G.game.W + 'x' + G.game.H; this.i = o.credits ? this.pages.findIndex(p => p.title === 'CREDITS') : 0; this.t = 0; if (G.sfx) G.sfx.music('lodgefire', { fade: .6 }); },
  update(dt) {
    this.t += dt; showcase().update(dt); if (G.sfx) G.sfx.update(dt); if (G.ui.screen) return;
    const turn = d => { const j = clamp(this.i + d, 0, this.pages.length - 1); if (j !== this.i) { this.i = j; UISND.focus(); } };
    if (uiRepeat('right') || uiPressed('tabR')) turn(1); if (uiRepeat('left') || uiPressed('tabL')) turn(-1);
    const c = G.game.input.clicked && G.game.input.clicked(); if (c && this.arrows) { if (c[0] < this.arrows[0]) turn(-1); else if (c[0] > this.arrows[1]) turn(1); }
    if ((uiPressed('confirm') && this.i === this.pages.length - 1) || (uiPressed('cancel') && this.t > .3)) { UISND.back(); G.game.go('menu', { page: 'main' }); }
    else if (uiPressed('confirm')) turn(1);
  },
  draw(r) {
    showcase().draw(r);
    r.overlay(g => {
      const W = r.W, Ht = r.H; if (this._size !== W + 'x' + Ht) { const t0 = this.pages[this.i] && this.pages[this.i].title; this.pages = aboutPages(W, Ht); this._size = W + 'x' + Ht; this.i = Math.max(0, Math.min(this.pages.findIndex(p => p.title === t0) , this.pages.length - 1)); }   // (a new window size re-wraps the pages)
      const P = this.pages[this.i]; dim(g, W, Ht, .7);
      const bw = Math.min(W - 40, 420), x = W / 2 - bw / 2, y = 22, bh = Ht - 62;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#140c06'], border: '#c8843a', alpha: .95 });
      E.font.title(g, P.title, W / 2, y + 8, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10', align: 'center' });
      let yy = y + 34;
      for (const [label, text] of P.items) {
        E.font.text(g, label.toUpperCase(), x + 14, yy, '#ffd040', { outline: false, wrap: bw - 28 }); yy += E.font.height(E.font.wrap(label.toUpperCase(), bw - 28).length) + 3;
        const lines = Array.isArray(text) ? text : E.font.wrap(String(text), bw - 28); for (const l of lines) { E.font.text(g, l, x + 14, yy, '#f0e6d4', { outline: false }); yy += 10; }
        yy += 6;
      }
      E.font.text(g, (this.i + 1) + ' / ' + this.pages.length, W / 2, y + bh - 12, '#b8a488', { align: 'center', outline: false });
      const ax0 = x - 14, ax1 = x + bw + 14; this.arrows = [x, x + bw];
      if (this.i > 0) px.poly(g, [[ax0 + 8, Ht / 2 - 8], [ax0, Ht / 2], [ax0 + 8, Ht / 2 + 8]], '#ff8a3a');
      if (this.i < this.pages.length - 1) px.poly(g, [[ax1 - 8, Ht / 2 - 8], [ax1, Ht / 2], [ax1 - 8, Ht / 2 + 8]], '#ff8a3a');
      promptBar(g, W, Ht, [['left', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};

/* ===== src/95-attract.js ===== */
// 95-attract: the HunterBot (the attract mode's player, the tests' driver, the balance tool) and the attract mode: after
// ten seconds of no input on the title or a top menu page, a looping demo of fixed-seed clips; any input goes back.
const BOT_SKILL = { novice: { react: .85, noise: 7, smooth: .34, tol: 3.2, scopeAt: 120 }, average: { react: .45, noise: 2.6, smooth: .22, tol: 2.2, scopeAt: 95 }, expert: { react: .2, noise: .7, smooth: .13, tol: 1.6, scopeAt: 85 } };
class HunterBot {
  constructor(o = {}) { this.svx = 0; this.svy = 0; this.o = o; this.S = Object.assign({}, BOT_SKILL[o.skill || 'average']); this.cheat = !!o.cheat; if (this.cheat) Object.assign(this.S, { react: .15, noise: 0, smooth: .09, tol: 1.4 }); this.target = null; this.lock = 0; this.vx = 0; this.vy = 0; this.r = RNG.stream('bot'); this.nz = [0, 0]; this.nzT = 0; this.callT = 0; this.breathT = 0; }
  update(dt, p, H) {
    const S = this.S; p.device = 'bot';
    if (this.cheat) { p.rifle.infinite = H.mode !== 'range'; p.forceAuto = true; }
    p.rifle.update(0);
    const seg = H.seg;
    if (!seg || !seg.canShoot || H.camFX) { this.target = null; p.scope.update(dt, false, false); this.spring(p, dt, H.W / 2, H.H * .52); return; }
    if (seg.kind === 'range' && seg.bot) { seg.bot(p, this, dt); return; }
    // the target: in a bonus game the nearest live target; on a site the best legal animal in view
    let tp = null, tgt = this.target;
    if (H.bonus) {
      if (!tgt || !tgt.alive || tgt.protected) { tgt = null; let best = Infinity; for (const T2 of H.bonus.targets) { if (!T2.alive || T2.protected || T2.kind === 'snowman' && T2.hatOff) continue; const zs = T2.zones ? T2.zones(T2) : [{ a: [T2.x, T2.y, T2.z + (T2.zc || 0)] }]; if (!zs.length) continue; const q = H.lens.project(zs[0].a[0], zs[0].a[1], zs[0].a[2]); if (!q || q[0] < 4 || q[0] > H.W - 4 || q[1] < 4 || q[1] > H.H - 4) continue; const sc = q[3] - (T2.golden ? 1e5 : 0) - (T2.kind === 'snowball' ? 5e4 : 0); if (sc < best) { best = sc; tgt = T2; } } this.target = tgt; this.lock = 0; }
      if (tgt) { const zs = tgt.zones ? tgt.zones(tgt) : [{ a: [tgt.x, tgt.y, tgt.z + (tgt.zc || 0)], r: tgt.r * (tgt.big || 1.25) }]; if (zs.length) { const z = zs[0]; tp = this.project(H, z.a, tgt, this.cheat ? 0 : S.smooth); if (tp) this.zonePx = (z.r || tgt.r || 8) * tp[2]; } }
    } else {
      if (!tgt || !tgt.alive || !tgt.visible || tgt.protected || this.r() < dt * .05) { tgt = this.pick(H); if (tgt !== this.target) this.lock = 0; this.target = tgt; }
      if (tgt) { const z = tgt.zones(), aimZone = this.cheat || this.o.skill === 'expert' ? 'heart' : 'lung', v = z.find(q => q.id === aimZone) || z.find(q => q.id === 'heart') || z.find(q => q.id === 'body') || z[0]; if (v) { tp = this.project(H, v.kind === 'sphere' ? v.a : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2], tgt, this.cheat ? 0 : S.smooth); if (tp) this.zonePx = v.r * tp[2]; } }
      // the trophies: the Duke comes to a call
      if (!tgt && H.site && H.site.duke && p.call.charges > 0 && !H.site.duke.open && H.site.duke.calls < 4 && (this.callT -= dt) <= 0) { this.callT = 3.5; H.useCall(p); }
    }
    if (!tp) { p.scope.update(dt, false, false); this.spring(p, dt, H.W / 2, H.H * .52); if (!p.rifle.chambered) p.rifle.pump(); return; }
    // scope past its range, hold breath once scoped; call a runner to a stop
    const far = tgt && tgt.x !== undefined ? Math.hypot(tgt.x - H.cam.x, tgt.y - H.cam.y) / M : 0, wantScope = far > S.scopeAt && (!H.bonus || H.bonus.def.id === 'range');
    p.scope.update(dt, wantScope, wantScope && p.scope.up);
    if (tgt && tgt.running && !H.bonus && p.call.charges > 0 && (this.callT -= dt) <= 0 && !tgt.trophy) { this.callT = 4; H.useCall(p); }
    // aim noise drifts slowly; the reticle chases the target on a spring
    this.nzT -= dt; if (this.nzT <= 0) { this.nzT = .35; this.nz = [(this.r() - .5) * 2 * S.noise, (this.r() - .5) * 2 * S.noise]; }
    const sway = p.scope.raise > .05 ? p.scope.sway() : [0, 0], ax = tp[0] - sway[0] + this.nz[0], ay = tp[1] - sway[1] + this.nz[1];
    if (this.cheat && this.lock > S.react * .6) { p.rx = ax; p.ry = ay; this.vx = this.vy = 0; } else this.spring(p, dt, ax, ay);
    this.lock += dt;
    const err = Math.hypot(p.rx + sway[0] - (tp[0] - this.svx * S.smooth * (this.cheat ? 0 : 1)), p.ry + sway[1] - (tp[1] - this.svy * S.smooth * (this.cheat ? 0 : 1)));
    if (!p.rifle.chambered && !p.rifle.busy) { p.rifle.pump(); return; }
    const tol = Math.max(S.tol, (this.zonePx || 0) * .7); this.dbg = [err, tol, this.lock];
    if (this.lock > S.react && err < tol && p.rifle.chambered && !p.rifle.busy && H.time - p.rifle.last > .35) {
      // never fire when the first thing on the ray is protected
      const [sx, sy] = p.aimPoint(), R = resolveRay(H, H.lens.ray(sx, sy));
      if (H.bonus || (R.actor && !R.actor.protected) || (!R.actor && R.kind === 'sky')) { if (!(R.actor && R.actor.protected)) { H.trigger(p); this.lock = S.react * .5; } }
    }
  }
  /** the target's point on the screen, led by its own measured screen velocity times lag (the spring's own lag) */
  project(H, pt, a, lag) {
    const q = H.lens.project(pt[0], pt[1], pt[2]); if (!q || q[0] < -20 || q[0] > H.W + 20 || q[1] < -20 || q[1] > H.H + 20) { this.prevQ = null; return null; }
    const dt = H.dt || 1 / 120;
    if (this.prevQ && this.prevA === a) { this.svx = lerp(this.svx, (q[0] - this.prevQ[0]) / dt, .25); this.svy = lerp(this.svy, (q[1] - this.prevQ[1]) / dt, .25); } else { this.svx = 0; this.svy = 0; }
    this.prevQ = [q[0], q[1]]; this.prevA = a;
    return [q[0] + this.svx * lag, q[1] + this.svy * lag, q[2], q[3]];
  }
  spring(p, dt, x, y) { const st = this.S.smooth; [p.rx, this.vx] = E.smoothDamp(p.rx, x, this.vx, st, dt); [p.ry, this.vy] = E.smoothDamp(p.ry, y, this.vy, st, dt); p.rx = clamp(p.rx, 0, (G.hunt ? G.hunt.W : 480) - 1); p.ry = clamp(p.ry, 0, (G.hunt ? G.hunt.H : 270) - 1); }
  /** the best legal animal in view: bucks first (value over distance, the ones about to escape first), critters when none */
  pick(H) {
    let best = null, bs = -Infinity;
    for (const a of H.actors) {
      if (!a.alive || !a.visible || a.protected || !a.target) continue;
      const d = Math.hypot(a.x - H.cam.x, a.y - H.cam.y) / M, [b] = H.world.bearingOf(H.vantageId, a.x, a.y), edge = Math.min(Math.abs(b - H.fanB[0]), Math.abs(b - H.fanB[1]));
      let s = a.cat === 'animal' ? 1000 + (a.points || 0) * 10 - d * 2 + (edge < 8 ? 300 : 0) + (a.trophy ? 2000 : 0) + (a.wounds ? 400 : 0) : 100 - d;
      if (s > bs) { bs = s; best = a; }
    }
    return best;
  }
}
/* ---------- the attract mode ---------- */
const ATTRACT = [
  { kind: 'hunt', hunt: 'hollow', secs: 43, seed: 11, queue: [{ kind: 'site', id: 'hollow-1' }, { kind: 'tally', auto: true }], label: 'HOLLOW CREEK' },
  { kind: 'hunt', hunt: 'bugle', secs: 25, seed: 12, queue: [{ kind: 'site', id: 'bugle-2' }], label: 'BUGLE RIDGE', skill: 'expert' },
  { kind: 'hunt', hunt: 'bugle', secs: 15, seed: 13, queue: [{ kind: 'bonus', id: 'saucer-season' }], label: 'SAUCER SEASON' },
  { kind: 'hunt', hunt: 'muskeg', secs: 20, seed: 14, queue: [{ kind: 'trophy', id: 'bigmo' }, { kind: 'trophyEnd' }], label: 'BIG MO' },
  { kind: 'tables', secs: 8 }, { kind: 'lodge', secs: 6 }, { kind: 'title', secs: 5 }
];
const attractScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'attract'; this.i = -1; this.t = 0; this.H = null; G.attract = this; this.next(); Idle.reset(); },
  exit() { if (this.H) this.H.dispose(); this.H = null; G.hunt = null; G.attract = null; game.timeScale = 1; },
  get clip() { const c = ATTRACT[this.i]; return c ? (c.label || c.kind) : null; },
  next() {
    if (this.H) { this.H.dispose(); this.H = null; G.hunt = null; }
    this.i = (this.i + 1) % ATTRACT.length; this.t = 0; const c = ATTRACT[this.i]; game.timeScale = 1;
    if (c.kind === 'hunt') { const p = new Player(1, G.game.input); p.bot = new HunterBot({ skill: c.skill || 'expert', cheat: true }); this.H = new Hunt({ mode: 'attract', hunt: c.hunt, seed: c.seed, queue: c.queue, players: [p] }); if (G.sfx) G.sfx.music(c.queue[0].kind === 'bonus' ? 'jamboree' : 'stalk', { fade: .5 }); }
    else if (c.kind === 'lodge') { G.lodge = G.lodge || new Lodge(); G.lodge.reset(true); if (G.sfx) G.sfx.music('lodgefire', { fade: .5 }); }
    else if (c.kind === 'title') { if (G.sfx) G.sfx.music('hoedown', { fade: .5 }); }
  },
  clipDone() { this.t = 1e9; },
  update(dt) {
    const any = Idle.update(dt);
    if (any && this.t > .1) { G.game.input.consumeAll(); G.game.go('title', {}, { fade: .3 }); return; }
    this.t += dt; const c = ATTRACT[this.i];
    if (c.kind === 'hunt' && this.H) { const save = G.hunt; G.hunt = this.H; this.H.update(dt); G.hunt = this.H; if (this.H.finished) this.t = 1e9; }
    else if (c.kind === 'title') showcase().update(dt);
    else if (c.kind === 'lodge' && G.lodge) G.lodge.update(dt, true);
    if (G.sfx) G.sfx.update(dt);
    if (this.t >= c.secs) this.next();
  },
  draw(r) {
    const c = ATTRACT[this.i];
    if (c.kind === 'hunt' && this.H) this.H.draw(r);
    else if (c.kind === 'tables') { r.sky(['#1a120a', '#2a1c10', '#3a2614']); const modes = ['campaign', 'hollow', 'bugle', 'muskeg'], m = modes[Math.floor(this.t / 2) % modes.length]; G.cab.drawTable(r, m, 30, 'BEST ' + (m === 'campaign' ? 'HUNT-OFF' : reg('hunt', m).name.toUpperCase())); }
    else if (c.kind === 'lodge' && G.lodge) G.lodge.draw(r, true);
    else { showcase().draw(r); r.overlay(g => drawLogo(g, r.W, r.H * .3, 1)); }
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      E.font.title(g, 'DEMO', 12, 10, { scale: 2, colors: ['#ffffff', '#ffd040', '#e0602a'], outline: '#1a0c08' });
      if (Math.floor(G.game.real * 1.5) % 2 === 0) E.font.text(g, G.touchOnly ? 'TAP FOR THE TITLE' : 'PRESS ANY BUTTON', W / 2, Ht - 22, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      if (c.label && this.t < 3) E.font.text(g, c.label, W - 12, 12, '#f4ead8', { align: 'right', scale: 2, shadow: '#000' });
    });
  }
};

/* ===== src/96-dev.js ===== */
// 96-dev: dev mode, from the pause menu (or #dev): the game runs on under a screen of live sliders (every tuning value,
// saved, with Reset to defaults and a reset for each one changed), tools (freeze, slow motion, skip, bag all, spawn at the
// reticle, kill all, infinite ammo, god mode, jumps, the bot, the free camera, the labs, unlocks, a save reset, a
// snapshot), overlays (hit volumes and the last ray, occluders, actor states and fear, paths, the fan, occlusion lines,
// the frame rate). The Animal Lab shows every rig, gait and pose; the Sound Lab plays every sound.
const DEV = G.dev = {
  ov: { zones: false, occ: false, states: false, paths: false, fan: false, occlusion: false },
  freeze: false, slow: false, free: null, lastRay: null, picks: { hunt: 0, seg: 0, spawn: 0, bot: 1 },
  open() {
    G.ui.hide(); if (game.paused) game.resume();
    if (G.scene !== 'hunt') return;
    game.after(0, () => this.show()); this.show();
  },
  show() {
    const H = G.hunt, S = game.settings, changed = TUNE_DEFS.filter(([k]) => S['dev.' + k] !== TUNE_DEFAULT[k]);
    const segs = H ? ['site', 'trophy', 'bonus', 'results'] : [], spawnKinds = H ? (H.species === 'whitetail' ? ['buck', 'doe', 'fawn'] : ['bull', 'cow', 'calf']).concat(['trophy', 'squirrel', 'turkey', 'skunk']) : [];
    const tog = (k, label) => [label + ': ' + (this.ov[k] ? 'ON' : 'OFF'), () => { this.ov[k] = !this.ov[k]; this.show(); }];
    G.ui.show('dev', { kicker: 'Dev mode', title: 'Tuning and tools', text: 'The game keeps running underneath. Changes are live and saved.',
      rows: ['#Tuning'].concat(TUNE_DEFS.map(d => 'dev.' + d[0])),
      actions: () => [
        ['Reset all tuning to defaults', () => { game.settings.reset('Dev'); this.show(); }],
        ...changed.map(([k, label]) => ['Reset: ' + label, () => { game.settings.set('dev.' + k, TUNE_DEFAULT[k]); this.show(); }]),
        [this.freeze ? 'Unfreeze' : 'Freeze', () => { this.freeze = !this.freeze; this.applyTime(); this.show(); }],
        [this.slow ? 'Normal speed' : 'Slow motion (0.25x)', () => { this.slow = !this.slow; this.applyTime(); this.show(); }],
        ['Skip segment', () => { if (G.hunt) G.hunt.skip(); }],
        ['Bag all bucks', () => { game.debug.bagAll(1); }],
        ['Spawn at reticle: ' + (spawnKinds[this.picks.spawn % spawnKinds.length] || '-'), () => this.spawnAtReticle(spawnKinds[this.picks.spawn % spawnKinds.length])],
        ['Next spawn kind', () => { this.picks.spawn++; this.show(); }],
        ['Kill all', () => { if (G.hunt) for (const a of G.hunt.actors) if (a.alive) a.die(1); }],
        ['Refill + infinite ammo', () => { if (G.hunt) for (const p of G.hunt.players) { p.rifle.setup({}); p.rifle.infinite = !p.rifle.infinite; } }],
        ['God mode: ' + (H && H.godMode ? 'ON' : 'OFF'), () => { if (H) H.godMode = !H.godMode; this.show(); }],
        ['Jump to hunt: ' + HUNT_ORDER[this.picks.hunt % 3], () => { G.ui.hide(); startHunt({ mode: 'single', hunt: HUNT_ORDER[this.picks.hunt % 3] }); }],
        ['Next hunt', () => { this.picks.hunt++; this.show(); }],
        ['Jump to: ' + (segs[this.picks.seg % segs.length] || '-'), () => { if (G.hunt) G.hunt.skipTo(segs[this.picks.seg % segs.length]); }],
        ['Next jump', () => { this.picks.seg++; this.show(); }],
        ['Bot plays: ' + ['off', 'novice', 'average', 'expert'][this.picks.bot % 4], () => { this.picks.bot++; const sk = ['off', 'novice', 'average', 'expert'][this.picks.bot % 4]; game.debug.bot(sk !== 'off', { skill: sk }); this.show(); }],
        ['Free camera', () => { G.ui.hide(); this.startFree(); }],
        ['Animal Lab', () => { G.ui.hide(); game.go('animallab'); }],
        ['Sound Lab', () => { G.ui.hide(); game.go('soundlab'); }],
        ['Unlock all trophies', () => { for (const id of ['iron-rack', 'duke', 'bigmo']) Records.trophy(id, { bagged: true, seen: 1, best: 100, date: 'Dev mode' }); Records.d.badge = true; Records.save(); }],
        ['Reset save data', () => G.ui.show('devConfirm', { kicker: 'Dev mode', title: 'Erase every record?', text: 'Best scores, stars, trophies, stats and the Hunt-Off save.', actions: [['Keep them', () => G.ui.back()], ['Erase', () => { Records.reset(); game.saves.erase('auto'); for (const k of ['campaign', 'hollow', 'bugle', 'muskeg', 'party', 'crow-patrol', 'saucer-season', 'snowball-standoff', 'range']) E.store.remove('arcade:bbho:' + k); seedTables(); G.ui.back(); }]] })],
        ['Copy snapshot (to the console)', () => { console.log(JSON.stringify(game.debug.snapshot(), null, 1)); G.ui.toast('Snapshot', 'Logged to the console'); }],
        tog('zones', 'Hit volumes + last ray'), tog('occ', 'Occluder volumes'), tog('states', 'Actor states + fear'), tog('paths', 'Paths + bearings'), tog('fan', 'The play fan'), tog('occlusion', 'Occlusion lines'),
        ['Frame rate: ' + (game.settings.showFps ? 'ON' : 'OFF'), () => { game.settings.set('showFps', !game.settings.showFps); this.show(); }],
        ['Close', () => G.ui.hide()]
      ], back: () => G.ui.hide() });
  },
  applyTime() { G.devTimeScale = this.freeze ? 0 : (this.slow ? .25 : 1) * T('timeScale'); game.timeScale = G.devTimeScale; },
  spawnAtReticle(kind) {
    const H = G.hunt; if (!H || !H.site || !kind) return; const p = H.players[0], ray = H.lens.ray(p.rx, p.ry), t = H.world.hf.rayHit(ray, ray, 600 * M); if (t === null) return;
    const at = { x: ray.x + ray.dx * t, y: ray.y + ray.dy * t };
    if (kind === 'trophy') { const a = H.site.spawn(H.species === 'whitetail' ? 'buck' : 'bull', { at, orders: [['graze', { secs: 9 }], ['walk', { to: 1 }], ['exit']], path: null, trophy: H.hunt.trophy, points: H.species === 'moose' ? 72 : 14, hidden: false }); a.appear(); }
    else { const a = H.site.spawn(kind, { at, orders: [['graze', { secs: 9 }], ['walk', { to: 1 }], ['exit']], path: [[0, 0], [20, 0]].map(() => at).concat([{ x: at.x + 30 * M, y: at.y }]), hidden: false }); a.appear(); }
  },
  startFree() { const H = G.hunt; if (!H) return; this.free = { x: H.cam.x, y: H.cam.y, z: H.cam.z, yaw: H.cam.yaw, pitch: H.cam.pitch, fov: H.cam.fov }; this.freeze = true; this.applyTime(); },
  /** each step in the hunt while the free camera flies */
  updateFree(dt) {
    const F = this.free, I = game.input, mv = I.move(), sp = 30 * M * dt * (I.down('breath') ? 3 : 1), fx = Math.cos(F.yaw), fy = Math.sin(F.yaw);
    F.x += (fx * -mv[1] - fy * mv[0]) * sp; F.y += (fy * -mv[1] + fx * mv[0]) * sp;
    if (I.down('tabL')) F.z -= sp; if (I.down('tabR')) F.z += sp;
    const a = I.padAim; if (a) { F.yaw += a[0] * dt * 1.6; F.pitch = clamp(F.pitch + a[1] * dt * 40, -40, 60); }
    const pan = I.pan && I.pan(); if (pan) { F.yaw += pan[0] * .006; F.pitch = clamp(F.pitch + pan[1] * .25, -40, 60); }
    F.z = Math.max(F.z, G.hunt.world.height(F.x, F.y) + .5 * M);
    if (I.pressed('cancel')) { this.free = null; this.freeze = false; this.applyTime(); }
  },
  /** the overlays, over the hunt's frame */
  draw(g, H, W, Ht) {
    const L = H.lens, q = [0, 0, 0, 0], P = (p) => L.project(p[0], p[1], p[2], q) ? [q[0], q[1]] : null;
    if (this.ov.zones) {
      for (const a of H.actors) { if (!a.alive) continue; for (const z of a.zones()) { const c = P(z.a); if (!c) continue; const rr = Math.max(1, z.r * q[2]), col = z.id === 'heart' ? '#ff3a3a' : z.id === 'lung' ? '#ff8ab0' : z.id === 'antler' ? '#e8dcc0' : '#7ad0ff'; if (z.b) { const d = P(z.b); if (d) { px.line(g, c[0], c[1], d[0], d[1], col); } } for (let k = 0; k < 16; k++) px.dot(g, c[0] + Math.cos(k / 16 * TAU) * rr, c[1] + Math.sin(k / 16 * TAU) * rr, col); } }
      if (H.lastShotRay) { const R = H.lastShotRay, a = P([R.x + R.dx * 40, R.y + R.dy * 40, R.z + R.dz * 40]), b = P(R.point); if (a && b) px.line(g, a[0], a[1], b[0], b[1], '#ffe040'); }
    }
    if (this.ov.occ) H.world.near(H.cam.x, H.cam.y, 120 * M, p => { if (!p.occ) return; for (const v of p.occ) { const c = P([v.x || v.a[0], v.y || v.a[1], (v.z0 !== undefined ? (v.z0 + v.z1) / 2 : v.z || v.a[2])]); if (c) px.rect(g, c[0] - 1, c[1] - 1, 3, 3, '#ff40ff'); } });
    if (this.ov.states) for (const a of H.actors) { if (a.state === 'gone') continue; const c = P([a.x, a.y, a.z + (a.rig.height || 10) * 1.3]); if (!c) continue; E.font.text(g, a.kind + ' ' + a.state + (a.frozenT > 0 ? ' FROZEN' : ''), c[0], c[1] - 8, a.protected ? '#ff8a7a' : '#7ad0ff', { align: 'center', font: 'tiny', outline: '#000' }); E.ui.bar(g, c[0] - 10, c[1], 20, 2, clamp(a.fear / Math.max(.1, a.temper * 2), 0, 1), '#ff6a4a'); }
    if (this.ov.paths) for (const a of H.actors) { if (!a.path || !a.live) continue; let prev = null; for (let d = 0; d <= a.path.len; d += 2 * M) { const p = a.path.at(d), c = P([p.x, p.y, H.world.height(p.x, p.y)]); if (c && prev) px.line(g, prev[0], prev[1], c[0], c[1], '#ffe060'); prev = c; } if (prev) { const [b, dd] = H.world.bearingOf(H.vantageId, a.x, a.y); const c = P([a.x, a.y, a.z]); if (c) E.font.text(g, Math.round(b) + 'deg ' + Math.round(dd) + 'm', c[0], c[1] + 4, '#ffe060', { align: 'center', font: 'tiny', outline: '#000' }); } }
    if (this.ov.fan && H.vantageId) { for (const b of H.fanB) for (let d = 5; d < 200; d += 5) { const w = H.world.at(H.vantageId, b, d), c = P([w.x, w.y, w.z]); if (c) px.dot(g, c[0], c[1], '#40ff80'); } }
    if (this.ov.occlusion) { const T2 = H.world.vista.targets.get('main'); if (T2) for (let x = 0; x < T2.W; x += 2) for (const D of [30, 60, 120]) px.dot(g, x, T2.occ(x, D * M), D === 30 ? '#ff4040' : D === 60 ? '#40ff40' : '#4080ff'); }
    if (this.free) { const F = this.free, [b, d] = H.vantageId ? H.world.bearingOf(H.vantageId, F.x, F.y) : [0, 0]; E.ui.box(g, 8, Ht - 40, 300, 32, { bg: '#000000', alpha: .7 }); E.font.text(g, 'FREE CAMERA  x ' + Math.round(F.x / M) + ' m  y ' + Math.round(F.y / M) + ' m  z ' + Math.round(F.z / M) + ' m  heading ' + Math.round(F.yaw / DEG), 12, Ht - 36, '#ffffff', { outline: false }); E.font.text(g, 'from ' + (H.vantageId || '-') + ': bearing ' + Math.round(b) + ' deg, ' + Math.round(d) + ' m   (move, Q/E or L1/R1 height, Esc leaves)', 12, Ht - 24, '#d8c8a8', { outline: false }); }
    if (this.freeze) E.font.text(g, 'FROZEN', W - 10, 40, '#7ad0ff', { align: 'right', scale: 2, shadow: '#000' });
  }
};
bus.on('shot', e => { if (G.hunt) G.hunt.lastShotRay = Object.assign({}, e.ray, { point: e.R ? e.R.point : [e.ray.x, e.ray.y, e.ray.z] }); });
/* ---------- the Animal Lab: every rig, gait and pose ---------- */
const LAB_RIGS = [
  ['WHITETAIL BUCK', () => new E.Quadruped({ species: 'whitetail', sex: 'm', antlers: { points: 10, seed: 3 } })], ['WHITETAIL DOE', () => new E.Quadruped({ species: 'whitetail', sex: 'f' })], ['FAWN', () => new E.Quadruped({ species: 'whitetail', young: true })],
  ['OLD IRON RACK', () => new E.Quadruped({ species: 'whitetail', sex: 'm', size: 1.12, antlers: { points: 14, seed: 7, kicker: true, drop: true } })],
  ['BULL ELK', () => new E.Quadruped({ species: 'elk', sex: 'm', antlers: { points: 12, seed: 4 } })], ['COW ELK', () => new E.Quadruped({ species: 'elk', sex: 'f' })], ['THE DUKE', () => new E.Quadruped({ species: 'elk', sex: 'm', size: 1.1, antlers: { points: 14, seed: 7 } })],
  ['BULL MOOSE', () => new E.Quadruped({ species: 'moose', sex: 'm', antlers: { points: 12, spread: 50, seed: 5 } })], ['COW MOOSE', () => new E.Quadruped({ species: 'moose', sex: 'f' })], ['BIG MO', () => new E.Quadruped({ species: 'moose', sex: 'm', size: 1.15, antlers: { points: 18, spread: 72, seed: 7 } })],
  ['FOX', () => new E.Quadruped({ species: 'fox' })], ['COYOTE', () => new E.Quadruped({ species: 'coyote' })], ['WOLF', () => new E.Quadruped({ species: 'wolf' })], ['BESSIE', () => new E.Quadruped({ species: 'cow' })],
  ['SQUIRREL', () => new E.Quadruped({ species: 'squirrel' })], ['RABBIT', () => new E.Quadruped({ species: 'rabbit' })], ['HARE', () => new E.Quadruped({ species: 'hare' })], ['RACCOON', () => new E.Quadruped({ species: 'raccoon' })], ['SKUNK', () => new E.Quadruped({ species: 'skunk' })], ['MARMOT', () => new E.Quadruped({ species: 'marmot' })], ['BEAVER', () => new E.Quadruped({ species: 'beaver' })],
  ...Object.keys(E.BIRDS).map(k => [k.toUpperCase(), () => new E.Bird({ kind: k })]),
  ...Object.keys(CAST).map(k => [CAST[k].name, () => castRig(k)])
];
const LAB_POSES = ['stand', 'walk', 'trot', 'run', 'graze', 'alert', 'call', 'hurt', 'jump', 'dead'];
const animalLabScene = {
  view: 'side', camera: { zoom: false }, touch: [],
  enter() { G.scene = 'animallab'; this.i = 0; this.p = 1; this.turn = -.6; this.k = 3; this.xray = false; this.mount = false; this.t = 0; this.make(); },
  make() { this.rig = LAB_RIGS[this.i][1](); this.x = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (uiRepeat('up')) { this.i = (this.i + LAB_RIGS.length - 1) % LAB_RIGS.length; this.make(); } if (uiRepeat('down')) { this.i = (this.i + 1) % LAB_RIGS.length; this.make(); }
    if (uiPressed('tabL') || I.pressed('scope')) this.p = (this.p + LAB_POSES.length - 1) % LAB_POSES.length; if (uiPressed('tabR') || I.pressed('fire')) this.p = (this.p + 1) % LAB_POSES.length;
    if (I.down('left')) this.turn -= dt * 1.5; if (I.down('right')) this.turn += dt * 1.5;
    if (I.pressed('call')) this.xray = !this.xray; if (I.pressed('pump')) this.mount = !this.mount;
    if (I.pressed('breath')) this.k = this.k >= 6 ? 1 : this.k + 1;
    if (uiPressed('cancel')) { game.go('menu', { page: 'main' }); return; }
    const R = this.rig, pose = LAB_POSES[this.p], sp = R.S && R.S.speeds ? R.S.speeds : [1.3, 3.4, 8.5], v = (pose === 'walk' ? sp[0] : pose === 'trot' ? sp[1] : pose === 'run' ? sp[2] : 0) * M;
    if (R instanceof E.Quadruped) R.update(dt, { x: 0, y: 0, vx: v, vy: 0, facing: 0, ground: () => 0, graze: pose === 'graze' ? 1 : 0, alert: pose === 'alert' ? 1 : 0, call: pose === 'call' ? 1 : 0, hurt: pose === 'hurt' && this.t % 1 < .3 ? 1 : 0, jump: pose === 'jump' && this.t % 1.2 < .6 ? 1 : 0, dead: pose === 'dead' ? Math.min(1, (this.t % 4) / 1.1) : 0 });
    else if (R instanceof E.Bird) R.update(dt, { x: 0, y: 0, z: 0, vx: v ? 60 : 0, vy: 0, flap: pose === 'stand' || pose === 'graze' ? 0 : 1, walk: pose === 'walk' ? 1 : 0, strut: pose === 'alert', dead: pose === 'dead', facing: 0 });
    else R.update(dt, { x: 0, y: 0, z: 0, vx: v, vy: 0, facing: 0, pose: pose === 'alert' ? 'cheer' : pose === 'call' ? 'wave' : pose === 'graze' ? 'kneel' : pose === 'hurt' ? 'guard' : pose === 'dead' ? 'die' : null, expr: 'smile', run: pose === 'run' ? 1 : pose === 'trot' ? .5 : pose === 'walk' ? .25 : 0 });
  },
  draw(r) {
    r.sky(['#2a3a4a', '#4a5a6a', '#6a7a80']);
    r.overlay(g => {
      const W = r.W, Ht = r.H, R = this.rig, k = this.k, cx = W / 2, cy = Ht * .7;
      for (let x = 0; x < W; x += 16) px.rect(g, x, cy, 8, 1, '#5a6a6a');
      const view = E.vistaView(k, this.turn / DEG - 90, 10);
      if (this.mount && R.drawMount) R.drawMount(g, cx, cy - 60, 90);
      else if (this.xray && R.drawXray) R.drawXray(g, cx - 10 * k, cy, k * .9, []);
      else R.draw(g, cx, cy, view, { glint: true });
      E.font.title(g, 'ANIMAL LAB', 12, 10, { scale: 2, colors: ['#fff6d8', '#7ad0ff', '#3a8ae8'], outline: '#0a1420' });
      E.font.text(g, LAB_RIGS[this.i][0] + '   ' + LAB_POSES[this.p].toUpperCase() + '   ' + k + ' px/unit' + (this.xray ? '   X-RAY' : '') + (this.mount ? '   MOUNT' : ''), 12, 34, '#ffffff', { outline: false, shadow: '#000' });
      E.font.text(g, 'Up/Down: rig   L1/R1 or clicks: pose   Left/Right: turn   Q: x-ray   R: mount   Shift: size   Esc: back', 12, Ht - 12, '#c8d8e0', { outline: false, shadow: '#000' });
    });
  }
};
/* ---------- the Sound Lab ---------- */
const soundLabScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'soundlab'; const items = []; for (const k in SONGS) items.push({ label: 'SONG ' + k.toUpperCase(), act: () => (['fanfare', 'siteclear', 'doe', 'escaped', 'newrecord'].includes(k) ? SFX.sting(k) : SFX.music(k, { restart: true })) });
    items.push({ label: 'STALK: DRUMS LAYER', act: () => { SFX.music('stalk'); SFX.layer('drums', !SFX.layers.drums); } }, { label: 'STALK: TENSION LAYER', act: () => { SFX.music('stalk'); SFX.layer('tension', !SFX.layers.tension); SFX.layer('trem', !SFX.layers.trem); } }, { label: 'RIFLE SHOT', act: () => SFX.shot(null) });
    for (const k in SFX_DEFS) items.push({ label: 'SFX ' + k.toUpperCase(), act: () => SFX.play(k) });
    for (const k in CAST) items.push({ label: 'VOICE ' + CAST[k].name, act: () => G.bab.say(k === 'emcee' ? 'BUCKS ONLY! HERE THEY COME!' : 'Well now, that there is a fine buck, I reckon.', CAST[k].voice) });
    this.list = new UIList({ items, cols: 3, w: 150, h: 16, gap: 3, y: 40, title: '', onBack: () => game.go('menu', { page: 'main' }) }); this.scroll = 0; },
  update(dt) { const r = this.list.update(dt); if (r === 'back') return; this.scroll = lerp(this.scroll, Math.max(0, Math.floor(this.list.i / 3) * 19 - 120), Math.min(1, dt * 8)); },
  draw(r) { r.sky(['#1a1a2a', '#2a2a3a']); r.overlay(g => { this.list.y = 40 - Math.round(this.scroll); this.list.draw(g, r.W, r.H); px.rect(g, 0, 0, r.W, 30, '#1a1a2a'); E.font.title(g, 'SOUND LAB', 12, 8, { scale: 2, colors: ['#fff6d8', '#7ad0ff', '#3a8ae8'], outline: '#0a1420' }); promptBar(g, r.W, r.H, [['confirm', 'PLAY'], ['cancel', 'BACK']]); }); }
};

/* ===== src/97-hub.js ===== */
// 97-hub: AI Hub sessions in ghost mode: every copy runs the same seeded hunt on its own device, on one timeline keyed
// to the hub's clock (so every copy is in the same segment and sees the same camera), and shows the other hunters'
// reticles and shots as ghosts, like players at one cabinet. Our own card; progress once a second; one result; the end.
const HUB_TIMELINE = [   // the Hub Hunt-Off: 3:00 in all
  { kind: 'establish', at: 0, dur: 6 }, { kind: 'site', slot: 0, at: 6, dur: 54 }, { kind: 'walk', slot: 1, at: 60, dur: 5 }, { kind: 'site', slot: 1, at: 65, dur: 50 },
  { kind: 'walk', slot: 'bonus', at: 115, dur: 5 }, { kind: 'bonus', at: 120, dur: 30 }, { kind: 'trophy', at: 150, dur: 25 }, { kind: 'final', at: 175, dur: 5 }
];
const HUB_SITES = { hollow: ['hollow-1', 'hollow-2'], bugle: ['bugle-1', 'bugle-3'], muskeg: ['muskeg-1', 'muskeg-3'] };
const HUB_END = 180;
const HubLink = G.hubLink = {
  phase: 'off', info: null, card: null, ghosts: new Map(), progressAt: -9, sendAt: -9, resultSent: false, progressSent: 0, sent: 0, H: null, segI: -1, localT: 0, standings: null, endReason: null,
  snapshot() { return { active: HUB_ON, phase: this.phase, progressSent: this.progressSent, resultSent: this.resultSent, ghosts: [...this.ghosts.values()].map(g => ({ id: g.id, name: g.name, seg: g.s, score: g.p })), seg: this.segI, localT: Math.round(this.localT * 10) / 10, sent: this.sent, hunt: this.huntId }; },
  async connect() {
    this.phase = 'connecting';
    let info = null; try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }); } catch (e) { info = null; }
    if (!info) { this.phase = 'off'; game.go('title', {}, { fade: 0 }); return; }
    this.info = info; this.huntId = HUNT_ORDER[(((info.round || 1) - 1) % 3 + 3) % 3];
    const R = AIHub.rng('hunt'); RNG.seed(Math.floor(R() * 4294967295) || 1);
    this.build();
    for (const p of info.players) if (p.id !== info.me) this.ghosts.set(p.id, { id: p.id, name: String(p.name || 'P' + (p.id + 1)).slice(0, 12), color: p.color || SEAT_COLORS[p.id % 4], seat: info.players.indexOf(p), a: null, s: -1, p: 0, sc: false, puffs: [] });
    AIHub.on('card', c => { this.card = c; });
    AIHub.on('start', () => { this.phase = 'countdown'; });
    AIHub.on('message', (d, from) => this.message(d, from));
    AIHub.on('leave', ({ id }) => this.ghosts.delete(id));
    AIHub.on('time-up', () => this.sendResult());
    AIHub.on('end', ({ reason, standings }) => this.end(reason, standings));
    this.phase = 'card';
    AIHub.ready();
  },
  build() {
    const me = this.info.players.find(p => p.id === this.info.me), seat = me ? this.info.players.indexOf(me) : 0;
    const P1 = new Player(1, game.input, { name: me ? String(me.name).slice(0, 12) : 'YOU' }); P1.color = (me && me.color) || SEAT_COLORS[seat % 4]; P1.shape = SHAPES[seat % 4];
    const sites = HUB_SITES[this.huntId], hunt = reg('hunt', this.huntId);
    const queue = HUB_TIMELINE.map(s => s.kind === 'establish' ? { kind: 'establish', hub: true } : s.kind === 'site' ? { kind: 'site', id: sites[s.slot], timeBoxed: true, time: s.dur - 2 } : s.kind === 'walk' ? { kind: 'walk', to: s.slot === 'bonus' ? reg('bonus', hunt.bonus).vantage : reg('site', sites[s.slot]).vantage, quick: true } : s.kind === 'bonus' ? { kind: 'bonus', id: hunt.bonus, hub: true, time: s.dur - 3 } : s.kind === 'trophy' ? { kind: 'trophy', id: hunt.trophy, timeBoxed: true, time: s.dur - 2 } : { kind: 'hubFinal' });
    this.H = new Hunt({ mode: 'hub', hunt: this.huntId, seed: RNG.run, queue, players: [P1] });
    this.H.drawGhosts = (g, W, Ht) => this.drawGhosts(g, W, Ht);
    this.H.casualDoe = false;
  },
  /** where the hub's clock says the round is: [segment index, seconds into it] */
  segAt(t) { let i = 0; for (let k = 0; k < HUB_TIMELINE.length; k++) if (t >= HUB_TIMELINE[k].at) i = k; return [i, t - HUB_TIMELINE[i].at]; },
  update(dt) {
    if (this.phase === 'card' || this.phase === 'connecting') { if (this.H && this.phase === 'card') this.cardInput(); return; }
    if (this.phase === 'over' || !this.H) return;
    const now = AIHub.time() / 1000;
    if (this.phase === 'countdown') { if (now >= 0) { this.phase = 'play'; this.localT = 0; this.goSeg(0); } else return; }
    // keep the local round on the hub's clock: catch up, hold, or jump to the segment it is in
    const H = this.H, target = Math.min(now, HUB_END);
    let steps = 1; const drift = target - this.localT;
    if (drift > 2) { const [i, into] = this.segAt(target); if (i !== this.segI) this.goSeg(i); this.localT = HUB_TIMELINE[i].at + into; steps = 0; }
    else if (drift > .25) steps = Math.min(12, 1 + Math.ceil((drift - .25) / dt));
    else if (drift < -.25) steps = 0;
    for (let k = 0; k < steps; k++) {
      this.localT += dt; const [i] = this.segAt(this.localT);
      if (i !== this.segI) this.goSeg(i);
      for (const p of H.players) if (p.benched && this.benchSeg !== this.segI) p.benched = false;
      H.update(dt);
    }
    if (this.localT >= HUB_END - .01) this.sendResult();
    // reporting, ghosts
    if (G.game.real - this.progressAt >= 1) { this.progressAt = G.game.real; const p = H.players[0], seg = HUB_TIMELINE[this.segI] || {}; AIHub.progress({ score: p.score, label: (seg.kind === 'site' ? 'Site ' + (seg.slot + 1) : seg.kind === 'bonus' ? 'Bonus' : seg.kind === 'trophy' ? 'Trophy' : 'Hunt-Off') + ' · ' + p.stats.bucks + ' bucks' }); this.progressSent++; }
    if (G.game.real - this.sendAt >= .1) { this.sendAt = G.game.real; const p = H.players[0], a = H.lens.angles(p.rx, p.ry); AIHub.send({ t: 'g', s: this.segI, a: [Math.round(a[0] * 1000), Math.round(a[1] * 1000)], sc: p.scope.up ? 1 : 0, p: p.score }, { reliable: false }); this.sent++; }
    for (const gh of this.ghosts.values()) { gh.puffs = gh.puffs.filter(f => (f.t += dt) < 1.2); }
  },
  goSeg(i) {
    const H = this.H; this.segI = i;
    while (H.segIndex < i + 1 && !H.finished) { if (H.seg && H.seg.exit) H.seg.exit(); H.seg = null; H.nextSeg(); }
    HUD.reset();
  },
  cardInput() {
    const I = game.input, c = I.clicked && I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || I.pressed('fire') || c && this.readyBtn && inRect(c, this.readyBtn)) { AIHub.answer('ready'); this.answered = 'ready'; if (G.sfx) G.sfx.play('confirm'); }
    if (I.pressed('call') || I.pressed('more') || c && this.moreBtn && inRect(c, this.moreBtn)) { AIHub.answer('more'); this.answered = this.answered === 'more' ? null : 'more'; if (G.sfx) G.sfx.play('focus'); }
  },
  /** a shot of ours: tell the others (reliable), so they see the puff */
  shot(p, R) {
    if (this.phase !== 'play') return; const a = this.H.lens.angles(p.aimPoint()[0], p.aimPoint()[1]);
    const res = R.actor ? (R.actor.cat === 'critter' ? 'critter' : R.actor.protected ? 'doe' : 'buck') : 'miss';
    AIHub.send({ t: 'shot', s: this.segI, a: [Math.round(a[0] * 1000), Math.round(a[1] * 1000)], res, pts: p.score - (this.lastScore || 0), zone: R.zone || null }); this.sent++; this.lastScore = p.score;
  },
  message(d, from) {
    const gh = this.ghosts.get(from); if (!gh || !d) return;
    if (d.t === 'g') { gh.a = d.a; gh.s = d.s; gh.sc = !!d.sc; gh.p = d.p | 0; }
    else if (d.t === 'shot') { gh.puffs.push({ a: d.a, res: d.res, pts: d.pts | 0, t: 0, s: d.s }); }
  },
  drawGhosts(g, W, Ht) {
    const L = this.H.lens;
    for (const gh of this.ghosts.values()) {
      if (gh.s === this.segI && gh.a) { const q = L.fromAngles(gh.a[0] / 1000, gh.a[1] / 1000); if (q) px.blend(g, .6, 'normal', () => { drawReticleShape(g, Math.round(q[0]), Math.round(q[1]), SHAPES[gh.seat % 4], gh.color, gh.sc ? 10 : 7); E.font.text(g, gh.name, q[0], q[1] + 11, gh.color, { align: 'center', outline: '#140c08' }); }); }
      for (const f of gh.puffs) { if (f.s !== this.segI) continue; const q = L.fromAngles(f.a[0] / 1000, f.a[1] / 1000); if (!q) continue; const k = f.t / 1.2; px.ddisc(g, q[0], q[1], 4 + k * 6, '#e8e0d0', .6 * (1 - k)); if (f.pts > 0) E.font.text(g, '+' + fmt(f.pts), q[0], q[1] - 12 - k * 10, gh.color, { align: 'center', outline: '#140c08' }); }
    }
    // the standings strip
    const list = [{ name: this.H.players[0].name, score: this.H.players[0].score, color: this.H.players[0].color }].concat([...this.ghosts.values()].map(gh => ({ name: gh.name, score: gh.p, color: gh.color }))).sort((a, b) => b.score - a.score);
    let x = W / 2 - list.length * 46; for (const r of list) { E.font.text(g, r.name + ' ' + fmt(r.score), x + 46, Ht - 46, r.color, { align: 'center', outline: '#140c08' }); x += 92; }
  },
  sendResult() {
    if (this.resultSent || !this.H) return; this.resultSent = true;
    const p = this.H.players[0], st = p.stats, acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
    AIHub.result({ score: p.score, stats: { 'Bucks bagged': st.bucks, Accuracy: acc + '%', 'Longest shot': Math.round(st.longest) + ' m' } });
  },
  end(reason, standings) {
    this.phase = 'over'; this.endReason = reason; this.standings = standings || null;
    if (!this.resultSent && this.H && reason !== 'void') this.sendResult();
    game.input.clear(); if (G.sfx) { G.sfx.stopMusic(.2); G.sfx.ambience(null); } G.bab.stop(); game.audio.mute(true);
  }
};
function inRect(c, r) { return c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]; }
bus.on('shot', e => { if (HUB_ON && HubLink.phase === 'play' && e.p && e.p.n === 1 && G.hunt === HubLink.H) G.game.after(0, () => HubLink.shot(e.p, e.R)); });
bus.on('doe', e => { if (HUB_ON) HubLink.benchSeg = HubLink.segI; });
SEG.hubFinal = (H, o) => ({ block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: false, enter() { if (G.sfx) G.sfx.music('results'); HubLink.sendResult(); }, update() { return false; },
  draw(g, W, Ht) { dim(g, W, Ht, .6); const p = H.players[0]; E.font.title(g, 'FINAL TALLY', W / 2, Ht * .28, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' }); E.font.text(g, fmt(p.score), W / 2, Ht * .45, '#ffffff', { align: 'center', scale: 4, outline: '#1a0c08' }); E.font.text(g, p.stats.bucks + ' BUCKS · ' + Math.round(p.stats.longest) + ' M LONGEST', W / 2, Ht * .62, '#d8c8a8', { align: 'center', outline: false }); } });
const hubScene = {
  camera: { zoom: false }, touch: [],
  enter() { G.scene = 'hub'; HubLink.connect(); },
  update(dt) { HubLink.update(dt); if (G.sfx && HubLink.phase !== 'over') G.sfx.update(dt); },
  draw(r) {
    const L = HubLink, H = L.H;
    if (H) { G.hunt = H; if (L.phase === 'card' || L.phase === 'countdown') { if (!H.seg) { H.nextSeg(); } } H.draw(r); }
    else r.sky(['#1a120a', '#2a1c10']);
    r.overlay(g => {
      const W = r.W, Ht = r.H;
      if (L.phase === 'connecting') { E.font.text(g, 'CALLING THE HUB...', W / 2, Ht / 2, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); return; }
      if (L.phase === 'card') return drawHubCard(g, W, Ht);
      if (L.phase === 'countdown') { const t = AIHub.time() / 1000, n = Math.ceil(-t); dim(g, W, Ht, .4); E.font.title(g, n > 0 ? String(n) : 'GO!', W / 2, Ht * .38, { scale: 6, colors: ['#ffffff', '#ffd040', '#e0602a'], outline: '#1a0c08', depth: 3, depthColor: '#5a2a10', align: 'center' }); E.font.text(g, reg('hunt', L.huntId).name.toUpperCase() + ' · BUCKS ONLY!', W / 2, Ht * .62, '#f4ead8', { align: 'center', scale: 2, shadow: '#000' }); return; }
      if (L.phase === 'play') { const left = Math.max(0, HUB_END - L.localT); E.font.text(g, Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'), W - 10, 6, '#ffffff', { align: 'right', scale: 2, shadow: '#000' }); }
      if (L.phase === 'over') {
        dim(g, W, Ht, .7); E.font.title(g, 'ROUND OVER', W / 2, Ht * .2, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
        const order = (L.standings || []).flat(), all = L.info ? L.info.players : [];
        order.forEach((id, q) => { const p = all.find(x => x.id === id); if (!p) return; E.font.text(g, (q + 1) + '. ' + String(p.name).slice(0, 12), W / 2 - 60, Ht * .4 + q * 18, p.color || SEAT_COLORS[q % 4], { scale: 2, outline: false }); });
        if (!order.length) E.font.text(g, L.endReason === 'void' ? 'THIS ROUND DID NOT COUNT' : 'THANKS FOR HUNTING', W / 2, Ht * .45, '#d8c8a8', { align: 'center', scale: 2, outline: false });
      }
    });
  }
};
function drawHubCard(g, W, Ht) {
  const L = HubLink, c = L.card || {}, hunt = reg('hunt', L.huntId), bw = Math.min(W - 30, 400), bh = 224, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
  dim(g, W, Ht, .45);
  px.rect(g, x - 4, y - 4, bw + 8, bh + 8, '#5a3a1e'); px.rect(g, x, y, bw, bh, '#1e2a24'); for (let i = 0; i < 30; i++) px.dot(g, x + (i * 97) % bw, y + (i * 61) % bh, '#2a3a32');
  E.font.title(g, 'BIG BUCK HUNT-OFF', W / 2, y + 8, { scale: 2, colors: ['#fff4c8', '#f0c060', '#c8842a'], outline: '#e8581a', depth: 2, depthColor: '#4a2410', align: 'center' });
  E.font.text(g, hunt.name.toUpperCase() + ' · ' + hunt.when.toUpperCase(), W / 2, y + 32, '#f0ece0', { align: 'center', outline: false });
  E.font.text(g, 'Most points in 3 minutes. Bucks only, never does!', W / 2, y + 46, '#ffd040', { align: 'center', outline: false });
  const all = L.info ? L.info.players : [];
  all.forEach((p, i) => { const px0 = x + 20 + (i % 2) * (bw / 2 - 10), py = y + 64 + Math.floor(i / 2) * 18, ready = (c.ready || []).includes(p.id); drawReticleShape(g, px0 + 6, py + 4, SHAPES[i % 4], p.color || SEAT_COLORS[i % 4], 4); E.font.text(g, String(p.name).slice(0, 12) + (p.id === L.info.me ? ' (YOU)' : ''), px0 + 16, py, p.color || SEAT_COLORS[i % 4], { outline: false }); E.font.text(g, ready ? 'READY ✓' : '...', px0 + bw / 2 - 40, py, ready ? '#7ad04a' : '#8a9a90', { align: 'right', outline: false }); });
  const I = game.input; let ky = y + 112;
  for (const [a, t] of [['fire', 'SHOOT'], ['pump', 'PUMP'], ['scope', 'SCOPE'], ['breath', 'HOLD BREATH'], ['call', 'CALL']]) { Glyph.cue(g, a, t, x + 24 + ((ky - y - 112) / 14 % 2 ? bw / 2 : 0), ky, I, { align: 'left' }); ky += 7; }
  const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
  E.font.text(g, c.starting ? 'STARTING...' : c.paused ? 'WAITING FOR MORE TIME' : left !== null ? 'STARTS IN ' + left : '', W / 2, y + 160, '#ffffff', { align: 'center', scale: 2, outline: false });
  const rb = L.readyBtn = [W / 2 - 150, y + bh - 34, 140, 24], mb = L.moreBtn = [W / 2 + 10, y + bh - 34, 140, 24];
  drawCard(g, rb[0], rb[1], rb[2], rb[3], L.answered === 'ready', 0, false); Glyph.cue(g, 'confirm', 'READY', rb[0] + rb[2] / 2, rb[1] + 12, I);
  drawCard(g, mb[0], mb[1], mb[2], mb[3], L.answered === 'more' || c.asked, 0, false); Glyph.cue(g, 'call', 'MORE TIME', mb[0] + mb[2] / 2, mb[1] + 12, I);
}

/* ===== src/99-start.js ===== */
// 99-start: the test handle (game.debug), the state hash, deep links, the boot steps and the start.
const r1 = v => Math.round(v * 10) / 10;
game.debug = {
  snapshot() {
    const H = G.hunt, seg = H && H.seg;
    return { scene: game.sceneName, segment: seg ? seg.kind : null, mode: H ? H.mode : null, hunt: H ? H.huntId : null, site: H && H.site ? H.site.id : null, siteTime: H && H.site ? r1(H.site.t) : 0,
      sitePhase: H && H.site ? H.site.phase : null, attract: G.attract ? G.attract.clip : null, devOpen: G.ui.screen === 'dev', paused: game.paused, ui: G.ui.screen,
      players: H ? H.players.map(p => ({ n: p.n, device: p.device, score: p.score, rounds: p.rifle.rounds, chambered: p.rifle.chambered, benched: p.benched, scoped: p.scope.up, breath: r1(p.scope.breath), calls: p.call.charges, reticle: [Math.round(p.rx), Math.round(p.ry)], bot: !!p.bot })) : [],
      actors: H ? H.actors.map(a => ({ id: a.id, kind: a.kind, sex: a.sex, cat: a.cat, state: a.state, x: Math.round(a.x / M), y: Math.round(a.y / M), z: r1(a.z / M), hp: r1(a.hp), wounded: a.wounds > 0, bagger: a.bagger, visible: a.visible, trophy: a.trophy || null, target: a.target })) : [],
      bucksLeft: H && H.site ? H.site.S.bucksLeft : 0, results: H && H.site ? H.site.results.map(r => ({ n: r.n, score: r.score, shots: r.shots, hits: r.hits, kills: r.kills.length, stars: r.stars })) : [],
      siteResults: H ? H.siteResults.map(s => ({ id: s.id, reason: s.endReason, scores: s.results.map(r => r.score), stars: s.results.map(r => r.stars) })) : [],
      trophy: H && H.trophyInfo ? { id: H.trophyInfo.id, seen: H.trophyInfo.seen, bagged: H.trophyInfo.bagged } : null, bonus: H && H.bonusResult ? { id: H.bonusResult.id, score: H.bonusResult.score, perfect: H.bonusResult.perfect } : null,
      cam: H ? { yaw: r1(H.cam.yaw / DEG), pitch: r1(H.cam.pitch), fov: r1(H.cam.fov) } : null, timeScale: game.timeScale,
      hub: G.hubLink ? G.hubLink.snapshot() : { active: HUB_ON },
      records: Records.d ? { trophies: Object.keys(Records.d.trophies).filter(k => Records.d.trophies[k].bagged), best: Object.assign({}, Records.d.best), badge: Records.d.badge, champion: Records.d.champion } : null,
      queue: H ? H.queue.map(q => q.kind) : [], errors: game.errors.length, touchOnly: G.touchOnly };
  },
  hunt: () => G.hunt,
  actor(id) { const H = G.hunt; return H && H.actors.find(a => a.id === id); },
  /** put a player's reticle on an actor's zone (the swayed point, so a scoped shot lands there) */
  aimAt(pn, actorId, zone = 'heart') {
    const H = G.hunt, p = H.players[pn - 1], a = typeof actorId === 'string' ? this.actor(actorId) : actorId; if (!p || !a) return false;
    const z = a.zones(), v = z.find(q => q.id === zone) || z.find(q => q.id === 'body') || z[0]; if (!v) return false;
    const c = v.kind === 'sphere' ? v.a : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2];
    H.lens.setup({ x: H.cam.x, y: H.cam.y, z: H.cam.z, yaw: H.cam.yaw, pitch: H.cam.pitch, fov: H.cam.fov }, H.W, H.H);
    const q = H.lens.project(c[0], c[1], c[2]); if (!q) return false;
    const s = p.scope.raise > .05 ? p.scope.sway() : [0, 0]; p.rx = q[0] - s[0]; p.ry = q[1] - s[1]; return true;
  },
  fire(pn = 1) { const p = G.hunt.players[pn - 1]; G.hunt.trigger(p); },
  pump(pn = 1) { G.hunt.players[pn - 1].rifle.pump(); },
  scope(pn = 1, on = true) { const p = G.hunt.players[pn - 1]; p.scope.toggle = on; p.scope.update(0, on, false); p.scope.raise = on ? 1 : 0; },
  breath(pn = 1, on = true) { G.hunt.players[pn - 1].input.hold('breath', on); },
  call(pn = 1) { G.hunt.useCall(G.hunt.players[pn - 1]); },
  goto(huntId, kind, id) { if (!G.hunt || G.hunt.huntId !== huntId) { startHunt({ mode: 'single', hunt: huntId }); game.advance(.6); } G.hunt.skipTo(kind, id); },
  spawn(kind, o = {}) { const H = G.hunt; if (!H || !H.site) return null; return H.site.spawn(kind, Object.assign({ at: o.at || [0, 40], path: o.path, orders: o.orders || [['hold']], hidden: false }, o)); },
  skip() { if (G.hunt) G.hunt.skip(); },
  bagAll(pn = 1) { const H = G.hunt; if (!H) return 0; let n = 0; for (const a of H.actors.slice()) if (a.alive && a.target && a.cat === 'animal') { a.state = a.state === 'hidden' ? 'move' : a.state; const R = { kind: 'animal', actor: a, zone: 'heart', t: 100, point: [a.x, a.y, a.z + 16], dist: Math.hypot(a.x - H.cam.x, a.y - H.cam.y) / M, shot: { p: H.players[pn - 1], ray: H.lens.ray(H.W / 2, H.H / 2) } }; applyShot(H, R); n++; } return n; },
  bot(on = true, o = {}) { const H = G.hunt; if (!H) return; for (const p of H.players) p.bot = on ? new HunterBot(Object.assign({ skill: 'expert' }, o)) : null; },
  seed(n) { RNG.seed(n); },
  tuning(k, v) { if (v === undefined) return T(k); return game.settings.set('dev.' + k, v); }
};
game.stateHash = () => { const H = G.hunt; if (!H) return [game.sceneName]; return [H.time.toFixed(2)].concat(H.actors.map(a => Math.round(a.x) + ',' + Math.round(a.y) + ',' + a.state + ',' + a.hp.toFixed(2)), H.players.map(p => p.score + ':' + p.rifle.rounds)); };
/* ---------- deep links: #title, #menu, #hunt/hollow/1, #trophy/muskeg, #bonus/crow, #range, #lodge, #about, #attract, #party/2, #animallab, #soundlab, #dev ---------- */
function deepLink() {
  const h = (typeof location !== 'undefined' && location.hash || '').slice(1); if (!h) return null;
  const [k, a, b] = h.split('/');
  if (k === 'hunt' && has('hunt', a)) return () => { startHunt({ mode: 'single', hunt: a }); G.deepSite = { hunt: a, n: +(b || 1) }; };
  if (k === 'trophy' && has('hunt', a)) return () => { startHunt({ mode: 'single', hunt: a }); G.deepSkip = 'trophy'; };
  if (k === 'bonus') { const map = { crow: 'hollow', saucer: 'bugle', snowball: 'muskeg' }; const hid = map[a] || a; if (has('hunt', hid)) return () => startHunt({ mode: 'bonusOnly', hunt: hid }); }
  if (k === 'party') return () => { const n = clamp(+(a || 2), 2, 4); const players = [new Player(1, game.input)]; for (let i = 2; i <= n; i++) { const I = game.addPlayer({ pad: i - 1 }); players.push(new Player(i, I)); } for (const p of players) p.bot = new HunterBot({ skill: 'average' }); startHunt({ mode: 'party', hunt: 'hollow', players }); };
  if (k === 'range') return () => startHunt({ mode: 'range', hunt: 'range' });
  if (k === 'dev') return () => { startHunt({ mode: 'single', hunt: 'hollow' }); G.deepDev = true; };
  if (['title', 'menu', 'lodge', 'about', 'attract', 'animallab', 'soundlab'].includes(k)) return () => game.go(k, {}, { fade: 0 });
  return null;
}
bus.on('segment', seg => {
  const H = G.hunt; if (!H) return;
  if (G.deepSite && seg.kind === 'establish') { const n = G.deepSite.n; G.deepSite = null; H.skipTo('site', H.hunt.sites[n - 1]); }
  else if (G.deepSkip && seg.kind === 'establish') { const k = G.deepSkip; G.deepSkip = null; H.skipTo(k); }
  if (G.deepDev && seg.kind === 'site') { G.deepDev = false; G.dev && G.dev.open(); }
});
/* ---------- the scenes and the boot ---------- */
const SCENES = { title: titleScene, menu: menuScene, hunt: huntScene };
if (typeof attractScene !== 'undefined') SCENES.attract = attractScene;
if (typeof lodgeScene !== 'undefined') SCENES.lodge = lodgeScene;
if (typeof aboutScene !== 'undefined') SCENES.about = aboutScene;
if (typeof hubScene !== 'undefined') SCENES.hub = hubScene;
if (typeof animalLabScene !== 'undefined') SCENES.animallab = animalLabScene;
if (typeof soundLabScene !== 'undefined') SCENES.soundlab = soundLabScene;
Records.load();
const BOOT_STEPS = [
  ['Reading the trophy wall', () => { Records.load(); seedTables(); }],
  ['Raising Hollow Creek', () => { worldFor('hollow'); }],
  ['Teaching deer to walk', () => { for (const id of ['oak', 'maple', 'birch', 'tallgrass', 'bush', 'sumac', 'corn']) IMP.warm(id, .02, .6, 2); }],
  ['Tuning the banjo', () => {}]
];
const link = HUB_ON ? null : deepLink();
game.start({ scenes: SCENES, scene: HUB_ON && SCENES.hub ? 'hub' : 'title', boot: { title: TITLE, version: VERSION, steps: BOOT_STEPS, messages: ['Oiling the pump action', 'Counting antler points', 'Shooing the skunk', 'Warming up the chili', 'Straightening the scope', 'Hiding the does'], accent: '#e8843a' } });
if (link) { if (game.headless || !game.booted || !game.booted.then) link(); else game.booted.then(() => link()); }
/** the game's own parts, for the headless tests (tests/*.test.mjs) */
game.debug.internals = { G, REG, reg, has, regAll, RNG, T, TUNE_DEFAULT, Records, bus, HUD, Glyph, ZONES, resolveRay, resolveShots, applyShot, scoreKill, siteBonuses, rankFor, Rifle, Scope, Call, Player, Actor, APath, Site, Hunt, HunterBot, World, worldFor, startHunt, aimUpdate, BARKS, BEATS, CAST, SONGS, SFX_DEFS, HUB_TIMELINE, HubLink, Idle, M, DEG, raySphere, rayCapsule, rayVolume, rayEllipsoid, rayZones, IMP, DEV, ATTRACT, RANGE_STATIONS, SEG };

})();
