/* Karate Champon: the game (built from src/ by tools/build.mjs) */
(() => {
'use strict';
// ---- src/00-header.js ----
/* =====================================================================================================================
 * KARATE CHAMPON: an original point-sparring karate game inspired by Karate Champ (1984).
 * THE CORE LOOP: Read your opponent from your mark. Commit to one technique with two sticks. Land it clean before they land
 * theirs. The referee stops the fight, scores it and resets. First to 2 points takes the round, best of 3 takes the match.
 * Win to earn a belt and the next stage, with a bonus stage after every second win.
 * Built on my-3D2dge v0.85.2 (engine/CHANGES.md lists what was changed in it). One IIFE, built from src/ in name order.
 * The namespace is KC (window.KC for tests): data in KC.DATA, live tuning in KC.TUNE, systems as KC.<Name>.
 * ===================================================================================================================== */
const E = My3D2dge, { px, clamp, lerp, approach } = E, PI = Math.PI, TAU = PI * 2;
const KC = {};
if (typeof window !== 'undefined') window.KC = KC;
KC.VERSION = '1.0.0';
KC.ABOUT = {"hub":{"players":"2-4","mode":"shared-world","minutes":"5","goal":"Win bouts: first to 2 points. Winner stays on.","howto":"Move: left stick/WASD. Strike: right stick, face buttons or IJKL"},"sourceInformation":{"date":"2026-11-03 18:36:38","source":"Karate Champ (1984 arcade, Data East; known in Japan as Karate Do)","plan":"PLAN.md","genre":"1-on-1 point-sparring karate fighting with arcade bonus stages and a mimic-the-master drill","perspective":"2D side view on a single-screen arena (optional Tatami 2.5D camera)","tech":"my-3D2dge v0.85.2 (full engine, modified: EC1-EC5), AI Hub session client 1.4.0, Web Audio; tests on Node 24 with Playwright 1.63.0","artDirection":"the engine's HD rigs as PS1-era pixel art at 320x240, code-drawn Japanese stages, props from the engine's asset store","animation":"the engine's procedural Humanoid rig with game-side karate poses, spins, somersaults, blocks, referee signals and a code-drawn bull","audio":"code-generated chip music (pentatonic), code sound effects and an Animalese-style gibberish voice synth with subtitles","online":"AI Hub shared-world sessions (Kachinuki, winner stays on, 2-4 players) plus local versus and local Kachinuki","testing":"Allowed: headless tools (game.advance, game.debug) and a scripted full playthrough behind one command that prints only failures and a count; screenshots only for what a script cannot judge; no subagents or workflows. Used: node tests/run.mjs (18 suites, 601 checks: data, input, technique, bout, ai, bonus, story playthrough, versus, online with a fake hub, attract, dev, ui, smoke, the engine's check.mjs page check, and the real AI Hub harness in 4 scenarios, a browser suite that measures the sound and plays techniques with a DualSense fed through the browser's Gamepad API and real key events, and a browser audit of TASK.md line by line: the whole story played and drawn in Chromium, the real-time idle timer, real mouse hover and clicks, the real 2-key join, a touch device's emulation, the music's notes in the output's spectrum)","research":"the source facts in PLAN.md section 1.1 (Wikipedia, TASVideos, Shacknews, arcade-history); no extra research","environment":"Claude Code CLI (headless); Linux; browser unknown","model":"Anthropic, claude-opus-5-5, reasoning effort xhigh","usage":"Tokens and cost: unknown (no meter available in this session). Session time: 2 h 01 min of wall clock, from the task's start (18:36:38) to the system clock at the last build (20:37:26)"},"testingFeedback":["About 22 issues. The headless suites caught 13 (among them: jump kicks whose reach bands did not match their flight, the Pots Ahoy! autopilot facing the wrong pot, a drill made unpassable when lunges carried the hero into close range, scene objects keeping a 'finished' flag between visits, the attract director stopping a hair outside reach, player 2's shared-keyboard keys read from the wrong property, menu hover ignoring a fed pointer, and two test-runner bugs). Screenshots caught 8 (props placed outside the visible arena, a missing asset-set load, a menu overflowing at 10-foot size, the 2.5D crowd floating mid-floor, fighters tiny in the hub's tall frames, the bull off screen, overlaps on the market and stadium). A browser audit of the real output caught 1 more: the music went silent whenever the audio device's latency exceeded the engine's look-ahead (Bluetooth headphones, headless Chromium).","3 were game breaking: the story soft-locked at the second lesson (a scene flag never reset), Lesson II could not be passed once lunges carried the hero too close, and player 2 on a shared keyboard got the wrong keys.","The scripted playthrough of the whole Champon Road from the title (real menu inputs, lessons played with real keys, nine matches with an autopilot, the bonus stages, promotions, ending, credits, initials), plus an honest no-cheat run: it found the soft-lock that no single-scene test could. Close second: measuring the real audio output in the browser, which found music silently dropping out on laggy audio devices.","The engine's check.mjs view cycle: it switches through the engine's built-in views (iso, top-down), which this game never uses, and its look notes flagged a dark cutscene title card as low contrast."],"engineFeedback":["The procedural Humanoid rig: one rig with options gives a whole dressed cast, attack specs driven by phase and progress let frame data pose every karate technique, and everything runs deterministically headless with game.advance, so whole matches, the story and four networked copies could be tested in a Node vm.","Yes: the side view's scale is 1.5 pixels a unit, so I made my own views at 1.2; props placed by world numbers landed off screen; gamepad codes are released on every tick when no pad is connected, so the right stick had to be tested through a stubbed navigator.getGamepads; input.feed('move') does not update mouse.t, which the menus use for hover; settings.reset takes a group, not a key; the band hat looks spiky in portraits; and the music scheduler's 0.15 s look-ahead drops every note when the output latency is larger.","The point-sparring core: KC.Karateka (a state machine on the technique table's frame data, height rules, block, quality scored from timing and spacing, counters, aiuchi) and KC.Bout with the referee and judges (bow, begin, stop, half and full point calls, time-out, the judges' flags), since the engine's fight module is built around life bars. Then the gibberish voice synth and the host-authoritative netcode.","Making karate read: spins by animating the rig's facing angle, back kicks striking behind the rig, the bow, seiza, blocks and the referee's signals by wrapping rig.solvePose and moving joints with my own IK, while keeping hits independent of the animation so puppets, replays and tests agree.","EC1: right-stick codes PadRAxisUp/Down/Left/Right (a 4-way gate with hysteresis) so the technique stick can be bound and labelled. EC2: a game can override a standard setting's default (PlayStation glyphs by default). EC3: ✕ ○ □ △ in the 5x7 font. EC4: game.live keeps the world stepping while the menu is open, for shared-world sessions. EC5: the music look-ahead covers the output latency, so laggy devices (Bluetooth headphones) still hear the music. engine/CHANGES.md records them.","A first-class pose layer on the Humanoid: named poses and joint targets with blend weights, an exported IK helper and a back-thrust kick, instead of wrapping solvePose; and a standard way for update to keep running under the pause menu and hit-stop."],"promptFeedback":["It is concrete about the deliverable and the bar: a named single file, every feature with no stubs, a dev mode with live sliders, an attract mode, a 10-foot controller-first UI, and a testing rule (one command, failures only) that kept the work honest. The plan beside it made a big scope buildable.","PLAN.md names its own file names (max effort, 17:47:43) while TASK.md wants xhigh and 18:36:38; TASK.md wins, as STAGE.md says, but it is easy to miss. 'Usage' asks for cost and token estimates the session cannot see. 'Testing: parameters allowed' reads as both what was allowed and what was done.","The scope in one sitting: 9 matches, 11 locations, 3 bonus games, lessons, story, versus, local and online Kachinuki, attract, dev mode, voices, all tested; and making two-stick karate techniques read with a procedural rig.","Mark which numbers in a plan are tunable targets and which are rules; give a priority order for when time runs short; name the target screen (a TV at 1080p, 16:9) and the hub's frame shape; and drop the usage line or say where the numbers come from."],"aiHub":{"name":"Karate Champon","tagline":"Two sticks. One clean strike.","description":"A point-sparring karate tournament inspired by Karate Champ: land one clean technique and let the referee call it. Climb from white belt to Champ, break boards, smash flying pots and stop a charging bull.","type":"Game","genre":"Fighting","source":"Karate Champ (1984)","series":"","players":"1–4","controls":"Left stick/WASD: move, jump, crouch · Right stick, face buttons or IJKL: techniques · Options/Esc: pause","tags":["2d","arcade","versus","retro","pixel art","comedy"]}};   // data/about.json, inlined by tools/build.mjs (the About screen and exit-interview.json share it)
const HUB = typeof AIHub !== 'undefined' ? AIHub : null, SESSION = !!(HUB && HUB.active);
KC.SESSION = SESSION;
const STEP = 1 / 120;          // the engine's fixed step
const F2S = 2;                 // technique frames are at 60 fps: two steps each

/* ---- the balance variables, live: every system reads KC.TUNE each step (the dev panel's sliders change it) ---- */
KC.TUNE_DEFAULTS = {
  gameSpeed: 1, techSpeed: 1, walk: 72, jump: 360, gravity: 1100, hitstop: .10, fullAt: 600, counterMul: 2, reachScale: 1,
  blockWindow: 14, clock: 30, pointsToWin: 2, roundsToWin: 2, cpuLevel: 0, cpuReact: 1, cpuAggression: -1, refPace: 1,
  potSpeed: 1, bullSpeed: 1, kiSpeed: 1, sessionTarget: 5
};
KC.TUNE_SPEC = {   // [min, max, step, label]
  gameSpeed: [.25, 2, .05, 'GAME SPEED'], techSpeed: [.5, 1.5, .05, 'TECHNIQUE SPEED'], walk: [40, 120, 2, 'WALK SPEED'],
  jump: [250, 450, 5, 'JUMP POWER'], gravity: [700, 1400, 10, 'GRAVITY'], hitstop: [0, .3, .01, 'HIT-STOP (S)'],
  fullAt: [300, 1000, 100, 'FULL POINT AT'], counterMul: [1, 3, .1, 'COUNTER x'], reachScale: [.7, 1.4, .02, 'REACH x'],
  blockWindow: [6, 30, 1, 'BLOCK WINDOW (F)'], clock: [10, 99, 1, 'ROUND CLOCK (S)'], pointsToWin: [1, 5, .5, 'POINTS TO WIN'],
  roundsToWin: [1, 3, 1, 'ROUNDS TO WIN'], cpuLevel: [0, 10, 1, 'CPU LEVEL (0=AUTO)'], cpuReact: [.5, 2, .05, 'CPU REACTION x'],
  cpuAggression: [-1, 1, .05, 'CPU AGGRESSION'], refPace: [.5, 2, .05, 'REFEREE PACE x'], potSpeed: [.5, 2, .05, 'POT SPEED x'],
  bullSpeed: [.5, 2, .05, 'BULL SPEED x'], kiSpeed: [.5, 2, .05, 'KI GAUGE SPEED x'], sessionTarget: [1, 10, 1, 'ONLINE BOUT TARGET']
};
KC.TUNE = Object.assign({}, KC.TUNE_DEFAULTS);
KC.tuneChanged = () => Object.keys(KC.TUNE_DEFAULTS).some(k => Math.abs(KC.TUNE[k] - KC.TUNE_DEFAULTS[k]) > 1e-9);

// ---- src/01-util.js ----
/* ---- UTIL: hashing, seeded streams, formatting, a tiny event bus ---- */
KC.hash = s => { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
KC.rng = seed => E.rng((seed >>> 0) || 1);
KC.pad = (n, w = 7) => String(Math.max(0, Math.round(n))).padStart(w, '0');
KC.commas = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// a name from outside (the AI Hub) for the pixel font: upper case, the font's characters only, 10 at most, never HTML
KC.cleanName = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 .\-!?']/g, '?').slice(0, 10) || 'PLAYER';
KC.ease = { out: t => 1 - (1 - t) * (1 - t), inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
// a small event bus: on(name, fn) -> off(); emit(name, data)
KC.Bus = class {
  constructor() { this._h = {}; }
  on(k, fn) { (this._h[k] || (this._h[k] = [])).push(fn); return () => { this._h[k] = this._h[k].filter(f => f !== fn); }; }
  emit(k, d) { const L = this._h[k]; if (L) for (const f of L.slice()) f(d); const A = this._h['*']; if (A) for (const f of A.slice()) f(k, d); }
};
// directions: screen ('l', 'r', 'u', 'd', 'n') and relative to the foe ('f' toward, 'b' away, 'u', 'd', 'n')
KC.relDir = (d, face) => d === 'l' ? (face < 0 ? 'f' : 'b') : d === 'r' ? (face > 0 ? 'f' : 'b') : d;
KC.scrDir = (d, face) => d === 'f' ? (face > 0 ? 'r' : 'l') : d === 'b' ? (face > 0 ? 'l' : 'r') : d;
KC.DIRS = ['n', 'u', 'd', 'l', 'r'];
KC.store = {
  get: (k, d) => { try { const v = E.store.get('kc:' + k, d); return v === undefined ? d : v; } catch (e) { return d; } },
  set: (k, v) => { try { E.store.set('kc:' + k, v); } catch (e) { /* storage blocked: kept for the visit by E.store */ } }
};

// ---- src/02-data.js ----
/* =====================================================================================================================
 * DATA: techniques, roster, stages, the story ladder, lessons, bonus stages, ranks. Designers extend the game by editing
 * these tables; systems never hard-code content (KC.validateData checks every reference at boot and in the tests).
 * ===================================================================================================================== */
KC.DATA = {};

/* ---- TECHNIQUES. f: [startup, active, recovery] in frames at 60 fps. reach: the gap (push-box edge to edge) a hit
 * needs. pts: [lo, hi] (100 steps; 600 or more is a full point). input: [posture, technique] relative to the foe
 * (n neutral, f toward, b away, u up, d down). prof: the body's profile while it plays (stand, crouch, air, flip).
 * spin: turns of the body (.5 = a back kick's half turn, 1 = a full turn). move: the rig's attack spec ---- */
const TECH = (id, name, jp, input, height, f, reach, pts, o = {}) => Object.assign({ id, name, jp, input, height, f, reach, pts, travel: 0, air: null, spin: 0, prof: 'stand', unblockable: height === 'low', knockdown: false, kiai: 'light', limb: 'foot', bull: false, scoring: true }, o);
KC.DATA.techniques = [
  TECH('frontKick', 'FRONT KICK', 'MAE-GERI', ['n', 'f'], 'mid', [11, 5, 28], [6, 30], [100, 200], { close: { gap: 12, id: 'revPunch' }, bull: true, move: { rel: true, kick: true, a0: .1, a1: 0, z0: .5, z1: .95, reach: 7.2, lean: -.25, lunge: .5 } }),
  TECH('revPunch', 'REVERSE PUNCH', 'GYAKU-ZUKI', ['n', 'f'], 'mid', [6, 4, 18], [0, 14], [100, 200], { travel: 4, limb: 'hand', alt: true, move: { rel: true, a0: .25, a1: 0, z0: -1, z1: -.9, r0: 2.5, r1: 9, lunge: 2, lean: .35, twist: 1.8, blade: 0 } }),
  TECH('roundKick', 'ROUND KICK', 'MAWASHI-GERI', ['n', 'u'], 'high', [10, 5, 22], [6, 30], [300, 600], { kiai: 'heavy', move: { rel: true, kick: true, a0: 1.7, a1: -.3, z0: 1, z1: 1.6, reach: 7.4, twist: 1.3, lean: -.35 } }),
  TECH('lowKick', 'LOW KICK', 'GEDAN-GERI', ['n', 'd'], 'low', [10, 5, 28], [4, 28], [100, 200], { move: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .28, reach: 7.2, lean: -.12, lunge: .4 } }),
  TECH('backKick', 'BACK KICK', 'USHIRO-GERI', ['n', 'b'], 'mid', [13, 5, 23], [10, 34], [200, 400], { travel: 6, spin: .5, bull: true, kiai: 'heavy', move: { rel: true, kick: true, a0: PI, a1: PI, z0: .65, z1: .95, reach: 7.6, lean: .45 } }),
  TECH('upLunge', 'UPPER LUNGE PUNCH', 'JODAN OI-ZUKI', ['f', 'u'], 'high', [15, 5, 26], [18, 60], [500, 1000], { travel: 40, limb: 'hand', close: { gap: 18, id: 'roundKick' }, bull: true, kiai: 'heavy', move: { rel: true, a0: .15, a1: 0, z0: 0, z1: 1.7, r0: 2.5, r1: 9.6, lunge: 5, lean: .3, twist: 1.6, blade: 0 } }),
  TECH('midLunge', 'MIDDLE LUNGE PUNCH', 'CHUDAN OI-ZUKI', ['f', 'f'], 'mid', [14, 5, 26], [18, 60], [200, 400], { travel: 40, limb: 'hand', close: { gap: 18, id: 'frontKick' }, kiai: 'heavy', move: { rel: true, a0: .15, a1: 0, z0: -1, z1: -1.3, r0: 2.5, r1: 9.6, lunge: 5, lean: .4, twist: 1.6, blade: 0 } }),
  TECH('frontSweep', 'FRONT FOOT SWEEP', 'ASHI-BARAI', ['f', 'd'], 'low', [16, 8, 36], [4, 34], [200, 400], { travel: 10, knockdown: true, prof: 'crouch', move: { rel: true, kick: true, a0: 1.2, a1: -.6, z0: .06, z1: .06, reach: 8, crouch: .9, lean: .3 } }),
  TECH('turnBackKick', 'TURN BACK KICK', 'USHIRO-MAWASHI', ['f', 'b'], 'mid', [17, 5, 26], [12, 40], [500, 1000], { travel: 12, spin: 1, kiai: 'heavy', move: { rel: true, kick: true, a0: 0, a1: 0, z0: .7, z1: 1, reach: 7.6, lean: -.3 } }),
  TECH('backRound', 'BACK ROUND KICK', 'URA-MAWASHI', ['b', 'u'], 'high', [15, 5, 23], [8, 34], [500, 1000], { spin: 1, kiai: 'heavy', move: { rel: true, kick: true, a0: 1.6, a1: -.4, z0: 1.1, z1: 1.6, reach: 7.5, twist: 1.3, lean: -.35 } }),
  TECH('backSweep', 'BACK FOOT SWEEP', 'USHIRO-BARAI', ['b', 'd'], 'low', [16, 8, 36], [6, 34], [100, 200], { knockdown: true, spin: 1, prof: 'crouch', move: { rel: true, kick: true, a0: 1.9, a1: -1.7, z0: .08, z1: .08, reach: 8, crouch: .9, lean: .3 } }),
  TECH('jumpSide', 'JUMPING SIDE KICK', 'TOBI YOKO-GERI', ['u', 'f'], 'high', [16, 10, 26], [26, 62], [500, 1000], { air: { travel: 60 }, prof: 'air', kiai: 'heavy', move: { rel: true, kick: true, a0: .1, a1: 0, z0: .6, z1: .8, reach: 8.6, lean: -.5 } }),
  TECH('jumpBack', 'JUMPING BACK KICK', 'TOBI USHIRO-GERI', ['u', 'b'], 'high', [14, 8, 22], [8, 32], [500, 1000], { air: { travel: 20 }, spin: .5, prof: 'air', kiai: 'heavy', move: { rel: true, kick: true, a0: PI, a1: PI, z0: .6, z1: .85, reach: 8, lean: .4 } }),
  TECH('upperPunch', 'UPPER PUNCH', 'AGE-ZUKI', ['d', 'u'], 'rising', [8, 7, 30], [0, 18], [300, 600], { limb: 'hand', bull: true, move: { rel: true, plane: 'side', a0: -1.15, a1: 1.25, reach: 7.6, crouch: .7, hop: 2, lunge: 1.2, lean: .2, blade: 0 } }),
  TECH('squatPunch', 'SQUATTING REVERSE LUNGE PUNCH', 'GEDAN GYAKU-ZUKI', ['d', 'f'], 'midlow', [13, 5, 30], [10, 44], [400, 800], { travel: 20, limb: 'hand', prof: 'crouch', bull: true, kiai: 'heavy', move: { rel: true, a0: .2, a1: 0, z0: -2, z1: -3.2, r0: 2.5, r1: 9.6, crouch: .85, lunge: 3, lean: .5, twist: 1.5, blade: 0 } }),
  // the evasions and the block (no points)
  TECH('block', 'BLOCK', 'UKE', ['b', 'f'], 'none', [1, 14, 4], [0, 0], [0, 0], { scoring: false, unblockable: false, limb: 'hand', kiai: null }),
  TECH('frontFlip', 'FRONT SOMERSAULT', 'ZENPO KAITEN', ['u', 'u'], 'none', [6, 40, 12], [0, 0], [0, 0], { scoring: false, unblockable: false, flip: { vz: 370, travel: 95 }, prof: 'flip', kiai: null }),
  TECH('backFlip', 'BACK SOMERSAULT', 'KOHO KAITEN', ['b', 'b'], 'none', [6, 40, 12], [0, 0], [0, 0], { scoring: false, unblockable: false, flip: { vz: 370, travel: -85 }, prof: 'flip', kiai: null }),
  TECH('backRoll', 'BACK ROLL', 'KOHO UKEMI', ['d', 'b'], 'none', [4, 28, 8], [0, 0], [0, 0], { scoring: false, unblockable: false, travel: -90, prof: 'roll', kiai: null }),
  TECH('jump', 'JUMP', 'TOBI', ['u', 'd'], 'none', [4, 39, 5], [0, 0], [0, 0], { scoring: false, unblockable: false, jumpOnly: true, prof: 'air', kiai: null }),
  TECH('crouch', 'CROUCH', 'SHAGAMI', ['d', 'd'], 'none', [3, 0, 5], [0, 0], [0, 0], { scoring: false, unblockable: false, hold: true, prof: 'crouch', kiai: null })
];
KC.TECH = {}; for (const t of KC.DATA.techniques) KC.TECH[t.id] = t;
// the technique matrix: posture (left stick) x technique (right stick); alt cells by the gap are in each entry's close
KC.MATRIX = {
  n: { u: 'roundKick', f: 'frontKick', d: 'lowKick', b: 'backKick' },
  f: { u: 'upLunge', f: 'midLunge', d: 'frontSweep', b: 'turnBackKick' },
  b: { u: 'backRound', f: 'block', d: 'backSweep', b: 'backFlip' },
  u: { u: 'frontFlip', f: 'jumpSide', d: 'jump', b: 'jumpBack' },
  d: { u: 'upperPunch', f: 'squatPunch', d: 'crouch', b: 'backRoll' }
};
KC.SCORING = KC.DATA.techniques.filter(t => t.scoring).map(t => t.id);
// the techniques' cell in the matrix (posture, technique), for the AI, the drills and the prompts
KC.cellOf = id => { if (id === 'revPunch') return ['n', 'f']; for (const p in KC.MATRIX) for (const t in KC.MATRIX[p]) if (KC.MATRIX[p][t] === id) return [p, t]; return null; };

/* ---- RANKS and belts ---- */
KC.DATA.ranks = [
  { id: 'white', name: 'WHITE BELT', belt: '#f4f4ee' }, { id: 'yellow', name: 'YELLOW BELT', belt: '#f0c830' },
  { id: 'green', name: 'GREEN BELT', belt: '#3aa050' }, { id: 'blue', name: 'BLUE BELT', belt: '#2f5fd0' },
  { id: 'brown', name: 'BROWN BELT', belt: '#6a4024' }, { id: 'dan1', name: 'BLACK BELT 1ST DAN', belt: '#16161c' },
  { id: 'dan3', name: '3RD DAN', belt: '#16161c', stripes: 3 }, { id: 'dan5', name: '5TH DAN', belt: '#16161c', stripes: 5 },
  { id: 'dan8', name: '8TH DAN', belt: '#16161c', stripes: 8 }, { id: 'champ', name: 'CHAMP', belt: '#e8c040' }
];
KC.rankIndex = id => Math.max(0, KC.DATA.ranks.findIndex(r => r.id === id));

/* ---- ROSTER. stats: walk, reach, speed multipliers. ai: the CPU's personality (KC.KarateAI). voice: the gibberish
 * voice (f0 Hz, formant scale, syllables a second, wave). Gi colours follow the side, never the fighter ---- */
const SKIN = '#f0c49c';
KC.DATA.roster = [
  { id: 'taro', name: 'TARO MOYASHI', short: 'TARO', title: 'THE BEAN SPROUT', style: 'ALL-ROUND, CLEAN KICKS', rig: { build: 'heroic', size: 2.15, hair: 'spiky', hat: { style: 'band', color: '#f8f8f0' }, limbW: 1.8, colors: { skin: SKIN, hair: '#1a1418' } }, stats: { walk: 1, reach: 1, speed: 1 }, signature: 'roundKick', rank: 'white',
    ai: { level: 5, aggression: .55, patience: .35, jump: .15, block: .35, gap: 34, crouch: .1, weights: { roundKick: 3, frontKick: 2, lowKick: 2, backKick: 1, jumpSide: 1, upLunge: 1 } },
    voice: { f0: 190, formant: 1.05, rate: 15, wave: 'pulse' }, quotes: { intro: 'I WILL BE CHAMP!', win: 'OSU!', lose: 'AGAIN...' }, tip: 'TARO KICKS ROUND. CROUCH UNDER IT.', unlock: null },
  { id: 'kamaboko', name: 'KAMABOKO', short: 'KAMABOKO', title: 'DOJO CLASSMATE', style: 'CLUMSY, LOVES FRONT KICKS', rig: { build: 'chibi', size: 2.25, hair: 'short', hat: { style: 'band', color: '#ff7aa8' }, torsoW: 3.8, colors: { skin: '#f6d0b0', hair: '#5a3020' } }, stats: { walk: .95, reach: .92, speed: .95 }, signature: 'frontKick', rank: 'white',
    ai: { level: 1, aggression: .7, patience: .2, jump: .05, block: .1, gap: 30, crouch: .05, weights: { frontKick: 3, lowKick: 2, revPunch: 2, roundKick: 1 } },
    voice: { f0: 240, formant: 1.15, rate: 17, wave: 'pulse' }, quotes: { intro: 'I ATE THREE BOWLS. I AM READY!', win: 'MORE NOODLES!', lose: 'MY TUMMY...' }, tip: 'KAMABOKO KICKS FRONT. BLOCK IT, THEN COUNTER.', unlock: null },
  { id: 'negi', name: 'SENPAI NEGI', short: 'NEGI', title: 'DOJO SENIOR', style: 'TEXTBOOK', rig: { build: 'heroic', size: 2.35, hair: 'ponytail', hat: { style: 'band', color: '#3aa050' }, colors: { skin: '#eac09a', hair: '#20242a' } }, stats: { walk: 1, reach: 1.04, speed: 1 }, signature: 'backKick', rank: 'brown',
    ai: { level: 2, aggression: .5, patience: .4, jump: .1, block: .35, gap: 36, crouch: .1, weights: { roundKick: 2, frontKick: 2, backKick: 2, midLunge: 1 } },
    voice: { f0: 150, formant: 1.0, rate: 13, wave: 'saw' }, quotes: { intro: 'SHOW ME WHAT I TAUGHT YOU.', win: 'TRAIN HARDER.', lose: 'GOOD. VERY GOOD.' }, tip: 'NEGI BLOCKS HALF HIS FIGHTS. SWEEP HIM.', unlock: null },
  { id: 'ebi', name: 'EBI', short: 'EBI', title: 'HARBOR FISHERMAN', style: 'JUMPER', rig: { build: 'heroic', size: 2.15, hair: 'short', hat: { style: 'band', color: '#f08a2a' }, sleeves: 'none', colors: { skin: '#c98a5a', hair: '#2a1a10' } }, stats: { walk: 1.1, reach: .98, speed: 1.05 }, signature: 'jumpSide', rank: 'blue',
    ai: { level: 3, aggression: .6, patience: .2, jump: .35, block: .2, gap: 70, crouch: .05, weights: { jumpSide: 4, frontFlip: 2, lowKick: 1, roundKick: 1 } },
    voice: { f0: 210, formant: 1.08, rate: 19, wave: 'pulse' }, quotes: { intro: 'THE SEA MADE ME QUICK. CATCH ME!', win: 'TOO SLOW!', lose: 'BACK TO THE BOAT...' }, tip: 'EBI JUMPS A LOT. UPPER PUNCH CATCHES JUMPERS.', unlock: null },
  { id: 'kikurage', name: 'KIKURAGE', short: 'KIKURAGE', title: 'BAMBOO HERMIT', style: 'COUNTER-PUNCHER', rig: { build: 'heroic', size: 2.1, hunch: .3, hood: true, hair: 'long', colors: { skin: '#d8b08a', hair: '#6a4a2a' } }, beard: '#e8e4d8', stats: { walk: .9, reach: 1, speed: .95 }, signature: 'revPunch', rank: 'dan1',
    ai: { level: 4, aggression: .25, patience: .8, jump: .05, block: .65, gap: 40, crouch: .15, weights: { revPunch: 3, upperPunch: 3, squatPunch: 2, backSweep: 1 } },
    voice: { f0: 110, formant: .92, rate: 9, wave: 'saw', breath: .25 }, quotes: { intro: 'THE BAMBOO BENDS. IT DOES NOT BREAK.', win: 'STILL WATER.', lose: 'THE WIND WINS TODAY.' }, tip: 'KIKURAGE BLOCKS MIDS. GO LOW.', unlock: null },
  { id: 'ika', name: 'IKA', short: 'IKA', title: 'LOG-BRIDGE ACROBAT', style: 'CROSS-UPS AND SPINS', rig: { build: 'heroic', size: 2.15, hair: 'long', sleeves: 'long', colors: { skin: '#e8d8f0', hair: '#f4f0fa' } }, stats: { walk: 1.05, reach: 1.02, speed: 1.02 }, signature: 'backRound', rank: 'dan1',
    ai: { level: 5, aggression: .5, patience: .3, jump: .25, block: .3, gap: 44, crouch: .05, weights: { backRound: 3, turnBackKick: 3, backKick: 2, frontFlip: 2, backFlip: 2 } },
    voice: { f0: 200, formant: 1.1, rate: 14, wave: 'triangle', vib: 6 }, quotes: { intro: 'EIGHT ARMS. TWO LEGS. WATCH THEM ALL.', win: 'INK IN YOUR EYES!', lose: 'TANGLED...' }, tip: 'IKA FLIPS OVER YOU. TURN AND STRIKE.', unlock: null },
  { id: 'buta', name: 'CAPTAIN BUTA', short: 'BUTA', title: "SHIP'S CAPTAIN", style: 'LONG LUNGES', rig: { build: 'bulky', size: 2.45, hair: 'short', hat: { style: 'cap', color: '#1e2a52' }, stubble: '#3a2a20', colors: { skin: '#e0a080', hair: '#3a2a20' } }, stats: { walk: .83, reach: 1.1, speed: .92 }, signature: 'upLunge', rank: 'dan3',
    ai: { level: 6, aggression: .8, patience: .2, jump: .05, block: .2, gap: 60, crouch: .05, weights: { upLunge: 4, midLunge: 3, frontSweep: 2, roundKick: 1 } },
    voice: { f0: 85, formant: .85, rate: 11, wave: 'saw' }, quotes: { intro: 'WELCOME ABOARD. NOW WALK THE PLANK!', win: 'ALL HANDS, CHEER!', lose: 'ABANDON SHIP...' }, tip: 'BUTA LUNGES FROM FAR. BLOCK, THEN COUNTER.', unlock: null },
  { id: 'asari', name: 'ASARI', short: 'ASARI', title: 'NIGHT-MARKET STALL KEEPER', style: 'LOW AND SHUT TIGHT', rig: { build: 'heroic', size: 2.1, hair: 'ponytail', hat: { style: 'band', color: '#2ab0a0' }, colors: { skin: '#f2caa4', hair: '#2a1a28' } }, stats: { walk: 1, reach: .96, speed: 1.04 }, signature: 'squatPunch', rank: 'dan5',
    ai: { level: 7, aggression: .4, patience: .5, jump: .05, block: .5, gap: 34, crouch: .5, weights: { squatPunch: 3, backSweep: 3, frontSweep: 2, lowKick: 2, backRoll: 2 } },
    voice: { f0: 170, formant: 1.0, rate: 15, wave: 'square', clicks: true }, quotes: { intro: 'MY SHELL IS SHUT. GO HOME.', win: 'CLAM UP!', lose: 'YOU PRIED ME OPEN.' }, tip: 'ASARI CROUCHES. JUMPING KICKS HIT HER.', unlock: null },
  { id: 'kyabetsu', name: 'MASTER KYABETSU', short: 'KYABETSU', title: 'FUJI GARDEN MASTER', style: 'PATIENT PUNISHER', rig: { build: 'heroic', size: 2.15, hair: 'bald', hunch: .2, colors: { skin: '#e8c0a0', hair: '#d8d8d0' } }, beard: '#f4f4ee', stats: { walk: .95, reach: 1.02, speed: 1.03 }, signature: 'turnBackKick', rank: 'dan8',
    ai: { level: 8, aggression: .4, patience: .7, jump: .1, block: .6, gap: 42, crouch: .1, readBonus: .05, habit: true, weights: { roundKick: 2, revPunch: 2, upperPunch: 2, turnBackKick: 1 } },
    voice: { f0: 120, formant: .9, rate: 10, wave: 'saw', vib: 5 }, quotes: { intro: 'MANY LAYERS, YOUNG ONE. PEEL THEM.', win: 'ANOTHER LAYER.', lose: 'YOU HAVE PEELED ME.' }, tip: 'KYABETSU PUNISHES MISSES. BE PATIENT.', unlock: 'kyabetsu' },
  { id: 'mei', name: 'MEI', short: 'MEI', title: 'THE IRON LADLE', style: 'REIGNING CHAMP, HIGH AND LOW', rig: { build: 'heroic', size: 2.15, hair: 'ponytail', colors: { skin: '#f4cca8', hair: '#141016' } }, stats: { walk: 1.05, reach: 1, speed: 1.05 }, signature: 'frontSweep', rank: 'champ',
    ai: { level: 9, aggression: .65, patience: .4, jump: .2, block: .5, gap: 46, crouch: .1, habit: true, weights: { jumpSide: 3, roundKick: 3, frontSweep: 3, turnBackKick: 2, backRound: 2 } },
    voice: { f0: 290, formant: 1.18, rate: 16, wave: 'pulse12' }, quotes: { intro: 'THE GOLDEN BOWL STAYS IN MY SHOP.', win: 'EAT. THEN TRAIN.', lose: 'NEXT YEAR I TAKE IT BACK.' }, tip: 'MEI WATCHES YOUR HABITS. MIX HIGH AND LOW.', unlock: 'mei' }
];
KC.FIGHTER = {}; for (const f of KC.DATA.roster) KC.FIGHTER[f.id] = f;
KC.DATA.referee = { id: 'genkotsu', name: 'JUDGE GENKOTSU', voice: { f0: 105, formant: .9, rate: 11, wave: 'saw', rough: .18 } };
KC.DATA.narrator = { id: 'card', name: '', voice: { f0: 130, formant: 1, rate: 12, wave: 'triangle' } };
KC.GI = { white: { cloth: '#f2eee4', pants: '#ece6da', trim: '#d8d2c4' }, red: { cloth: '#c8302a', pants: '#b82a24', trim: '#e8584a' }, classicWhite: { cloth: '#fcfcfc', pants: '#fcfcfc', trim: '#bcbcbc' }, classicRed: { cloth: '#d82800', pants: '#d82800', trim: '#fc7460' } };

/* ---- STAGES: 8 fight stages and 3 bonus locations. Painters live in 35-stage.js (KC.PAINT[id]); the rest is data ---- */
KC.DATA.stages = [
  { id: 'dojo', name: 'HON-DOJO', place: "SENPAI NEGI'S DOJO", music: 'dojo', ambient: .62, floor: 'planks', crowd: 'seiza', weather: null, ambience: 'none', mei: false },
  { id: 'harbor', name: 'NAGASAKI PIER', place: 'THE HARBOR AT DAWN', music: 'harbor', ambient: .72, floor: 'deck', crowd: 'dock', weather: null, ambience: 'waves', mei: true },
  { id: 'bamboo', name: 'BAMBOO FOREST', place: 'THE BAMBOO FOREST', music: 'bamboo', ambient: .64, floor: 'dirt', crowd: null, weather: { kind: 'leaves', amount: .35, wind: .3 }, ambience: 'birds', mei: true },
  { id: 'log', name: 'LOG BRIDGE', place: 'A TRUNK OVER THE GORGE', music: 'gorge', ambient: .64, floor: 'log', crowd: null, weather: null, ambience: 'falls', mei: true },
  { id: 'ship', name: "SHIP'S STERN", place: 'THE STERN AT SUNSET', music: 'ship', ambient: .6, floor: 'deck', crowd: 'crew', weather: null, ambience: 'waves', mei: true },
  { id: 'market', name: 'CHAMPON STREET', place: 'THE NIGHT MARKET', music: 'market', ambient: .42, floor: 'stone', crowd: 'market', weather: null, ambience: 'market', mei: true },
  { id: 'fuji', name: 'FUJI GARDEN', place: 'THE GARDEN UNDER FUJI', music: 'fuji', ambient: .66, floor: 'gravel', crowd: 'garden', weather: { kind: 'leaves', amount: .45, wind: .15, color: '#ffb0c8' }, ambience: 'birds', mei: true },
  { id: 'stadium', name: 'NATIONAL STADIUM', place: 'THE CHAMPON CUP FINAL', music: 'stadium', ambient: .5, floor: 'mat', crowd: 'stadium', weather: null, ambience: 'crowd', mei: false },
  { id: 'courtyard', name: 'DOJO COURTYARD', place: 'BONUS: THE COURTYARD', music: 'bonus', ambient: .78, floor: 'earth', crowd: null, weather: null, ambience: 'birds', bonus: true },
  { id: 'fishmarket', name: 'FISH-MARKET ALLEY', place: 'BONUS: THE FISH MARKET', music: 'bonus', ambient: .74, floor: 'wetstone', crowd: null, weather: null, ambience: 'waves', bonus: true },
  { id: 'pasture', name: 'FUJI PASTURE', place: 'BONUS: THE PASTURE', music: 'bonus', ambient: .8, floor: 'grass', crowd: null, weather: null, ambience: 'birds', bonus: true }
];
KC.STAGE = {}; for (const s of KC.DATA.stages) KC.STAGE[s.id] = s;
KC.FIGHT_STAGES = KC.DATA.stages.filter(s => !s.bonus).map(s => s.id);
KC.ARENA = { x0: 0, x1: 400, marks: [150, 250] };

/* ---- LESSONS (Senpai's drill) and BONUS variants ---- */
KC.DATA.lessons = [
  { id: 'lessonI', title: 'LESSON I', stage: 'dojo', intro: 'WATCH. THEN DO.', drills: ['frontKick', 'roundKick', 'lowKick', 'backKick', 'block', 'jump', 'crouch'] },
  { id: 'lessonII', title: 'LESSON II', stage: 'harbor', intro: 'STEP IN. STRIKE THROUGH.', drills: ['midLunge', 'upLunge', 'revPunch', 'frontSweep', 'upperPunch', 'squatPunch'] },
  { id: 'lessonIII', title: 'LESSON III', stage: 'log', intro: 'TURN YOUR BACK. NEVER YOUR EYES.', drills: ['backRound', 'turnBackKick', 'backSweep', 'jumpSide', 'jumpBack', 'frontFlip', 'backFlip', 'backRoll'] },
  { id: 'lessonAll', title: 'ALL TECHNIQUES', stage: 'dojo', intro: 'EVERY TECHNIQUE. ONE BY ONE.', drills: ['frontKick', 'revPunch', 'roundKick', 'lowKick', 'backKick', 'upLunge', 'midLunge', 'frontSweep', 'turnBackKick', 'backRound', 'backSweep', 'jumpSide', 'jumpBack', 'upperPunch', 'squatPunch', 'block', 'frontFlip', 'backFlip', 'backRoll', 'jump', 'crouch'] }
];
KC.LESSON = {}; for (const l of KC.DATA.lessons) KC.LESSON[l.id] = l;
KC.DATA.bonus = [
  { id: 'boards', kind: 'boards', name: 'BREAK THE BOARDS', stage: 'courtyard', params: { n: 5, mat: 'pine' } },
  { id: 'pots', kind: 'pots', name: 'POTS AHOY!', stage: 'fishmarket', params: { count: 16 } },
  { id: 'bull', kind: 'bull', name: 'STOP THE BULL', stage: 'pasture', params: { charges: 3 } }
];
KC.BONUS = {}; for (const b of KC.DATA.bonus) KC.BONUS[b.id] = b;
KC.DATA.boardMats = { pine: { name: 'PINE', mul: 1, color: '#d8b070' }, tile: { name: 'ROOF TILE', mul: 1.5, color: '#8a4a3a' }, ice: { name: 'ICE', mul: 2, color: '#b8e8f8' } };

/* ---- THE CHAMPON ROAD: the story ladder ---- */
KC.DATA.ladder = [
  { kind: 'cutscene', id: 'prologue', stage: 'harbor', script: 'prologue' },
  { kind: 'practice', id: 'lessonI', lesson: 'lessonI', stage: 'dojo' },
  { kind: 'match', id: 'm1', opponent: 'kamaboko', stage: 'dojo', promote: 'yellow', hints: true },
  { kind: 'match', id: 'm2', opponent: 'negi', stage: 'dojo', promote: 'green', hints: true },
  { kind: 'bonus', id: 'b1', bonus: 'boards', stage: 'courtyard' },
  { kind: 'match', id: 'm3', opponent: 'ebi', stage: 'harbor', promote: 'blue', hints: true, script: 'harborMei', after: 'afterHarbor' },
  { kind: 'practice', id: 'lessonII', lesson: 'lessonII', stage: 'harbor' },
  { kind: 'match', id: 'm4', opponent: 'kikurage', stage: 'bamboo', promote: 'brown' },
  { kind: 'bonus', id: 'b2', bonus: 'pots', stage: 'fishmarket', script: 'potsIntro' },
  { kind: 'match', id: 'm5', opponent: 'ika', stage: 'log', promote: 'dan1' },
  { kind: 'practice', id: 'lessonIII', lesson: 'lessonIII', stage: 'log' },
  { kind: 'match', id: 'm6', opponent: 'buta', stage: 'ship', promote: 'dan3' },
  { kind: 'bonus', id: 'b3', bonus: 'bull', stage: 'pasture' },
  { kind: 'match', id: 'm7', opponent: 'asari', stage: 'market', promote: 'dan5', after: 'marketMei' },
  { kind: 'match', id: 'm8', opponent: 'kyabetsu', stage: 'fuji', promote: 'dan8', unlock: 'kyabetsu' },
  { kind: 'match', id: 'm9', opponent: 'mei', stage: 'stadium', promote: 'champ', script: 'finalEntrance', unlock: 'mei' },
  { kind: 'ending', id: 'ending', stage: 'stadium', script: 'ending' }
];

// ---- src/03-text.js ----
/* ---- TEXT: terse, ALL-CAPS arcade calls, as the source wrote them. Voices are gibberish; these are the subtitles ---- */
KC.CALLS = {
  begin: ['BEGIN!', 'HAJIME!'], stop: ['STOP!', 'YAME!'], white: ['WHITE!', 'SHIRO!'], red: ['RED!', 'AKA!'], half: ['HALF POINT!', 'WAZA-ARI!'],
  full: ['FULL POINT!', 'IPPON!'], nopoint: ['NO POINT!', 'TORIMASEN!'], aiuchi: ['AIUCHI!', 'AIUCHI!'], time: ['TIME!', 'SOREMADE!'],
  judges: ['JUDGES!', 'HANTEI!'], whiteWins: ['WHITE WINS!', 'SHIRO NO KACHI!'], redWins: ['RED WINS!', 'AKA NO KACHI!'], bow: ['BOW!', 'REI!'],
  decide: ['DECIDING ROUND!', 'SHOBU!'], forfeit: ['FORFEIT!', 'KIKEN!'], matchPoint: ['MATCH POINT!', 'MATCH POINT!'], perfect: ['PERFECT!', 'PERFECT!'],
  weak: ['WEAK!', 'WEAK!'], ready: ['READY!', 'YOI!']
};
// each call's rhythm: syllables and the stressed one (the referee's voice is fixed per call, so it is recognizable)
KC.CALL_RHYTHM = { begin: [3, 1], stop: [2, 0], white: [2, 0], red: [2, 0], half: [4, 2], full: [3, 0], nopoint: [3, 1], aiuchi: [3, 1], time: [2, 0], judges: [3, 1],
  whiteWins: [4, 0], redWins: [4, 0], bow: [1, 0], decide: [4, 2], forfeit: [3, 0], matchPoint: [4, 0], perfect: [3, 0], weak: [1, 0], ready: [2, 0] };
KC.call = id => { const c = KC.CALLS[id]; return c ? c[KC.settingsCalls() === 'jp' ? 1 : 0] : id; };
KC.settingsCalls = () => 'en';   // replaced once the game's settings exist (90-start.js)

/* cutscene scripts: [speaker, text] (speaker 'card' is a title card; a roster id or 'genkotsu' speaks with a portrait) */
KC.SCRIPTS = {
  prologue: [['card', 'NAGASAKI HARBOR. SPRING 1984.'], ['card', 'THE CHAMPON CUP RETURNS.'], ['card', 'THE PRIZE: THE GOLDEN BOWL.'],
    ['taro', 'I AM TARO MOYASHI. WHITE BELT.'], ['taro', 'I WILL BE CHAMP!'], ['negi', 'FIRST, YOU LEARN TO KICK.']],
  harborMei: [['mei', 'YOU ARE THE NEW ONE? YOU LOOK LIKE A BEAN SPROUT.'], ['taro', '...I AM A BEAN SPROUT.'], ['mei', 'EAT. THEN FIGHT.']],
  afterHarbor: [['mei', 'NOT BAD, MOYASHI.']],
  potsIntro: [['mei', "DON'T BREAK MY BOWLS! BLOCK TO CATCH!"]],
  marketMei: [['mei', "THE FINAL IS TOMORROW. DON'T BE LATE."]],
  finalEntrance: [['genkotsu', 'THE FINAL. THE CHAMPION ENTERS.'], ['mei', 'SURPRISE, MOYASHI. THE GOLDEN BOWL IS MINE.'], ['taro', '...YOU?'], ['mei', 'WHO DO YOU THINK MAKES THE BEST CHAMPON?']],
  ending: [['genkotsu', 'WHITE WINS! A NEW CHAMP!'], ['mei', 'A BEAN SPROUT BECAME A CHAMP.'], ['mei', 'NEXT YEAR I TAKE IT BACK.'], ['taro', 'OSU!'], ['card', 'YOU ARE THE KARATE CHAMPON.']],
  lessonEnd: [['negi', 'YOU ARE READY. FIGHT KAMABOKO.']],
  gameOver: [['genkotsu', 'TRAIN. RETURN.']]
};
KC.HINTS = ['THE REFEREE STOPS THE FIGHT AFTER EVERY CLEAN HIT.', 'FIRST TO 2 POINTS WINS THE ROUND.', 'CLEAN, FULL-REACH STRIKES SCORE FULL POINTS.',
  'HIT THEM DURING THEIR TECHNIQUE: DOUBLE POINTS!', "LOW KICKS AND SWEEPS CAN'T BE BLOCKED. JUMP THEM.", 'CROUCH UNDER HIGH KICKS.'];
KC.TEXT = {
  touchGate: 'CONTROLLER OR KEYBOARD REQUIRED', demo: 'DEMO - PRESS START', bonusBoards: 'BONUS STAGE! BREAK THE BOARDS!', bonusPots: 'BONUS STAGE! POTS AHOY!',
  bonusBull: 'BONUS STAGE! STOP THE BULL!', niceCatch: 'NICE CATCH!', mottainai: 'MOTTAINAI!', trampled: 'TRAMPLED!', tooMuch: 'TOO MUCH!',
  cont: 'CONTINUE?', getUp: 'GET UP, MOYASHI!', gameOver: 'GAME OVER', champon: 'YOU ARE THE KARATE CHAMPON.', kachinuki: 'KACHINUKI! WINNER STAYS ON.',
  kachiRule: 'FIRST TO 2 POINTS WINS A BOUT. MOST BOUTS WINS.', nextYou: 'NEXT: YOU', hostLeft: 'HOST LEFT', roundOver: 'ROUND OVER', watch: 'WATCH.', nowYou: 'NOW YOU.',
  good: 'GOOD!', sharp: 'SHARP!', watchAgain: 'NO. WATCH AGAIN.', lessonDone: 'LESSON COMPLETE.'
};

// ---- src/07-validate.js ----
/* ---- VALIDATE: every id a table names resolves, numbers sit in range, every matrix cell is a technique. Returns the
 * problems found (an empty list when the data is sound); boot logs them and the tests assert there are none ---- */
KC.validateData = () => {
  const bad = [], need = (ok, what) => { if (!ok) bad.push(what); };
  for (const t of KC.DATA.techniques) {
    need(t.f.length === 3 && t.f.every(n => n >= 0 && n < 120), 'technique ' + t.id + ': frames');
    need(t.reach[0] <= t.reach[1], 'technique ' + t.id + ': reach band');
    if (t.scoring) need(t.pts[0] >= 100 && t.pts[1] <= 1000 && t.pts[0] <= t.pts[1] && t.pts[0] % 100 === 0, 'technique ' + t.id + ': points');
    if (t.close) need(!!KC.TECH[t.close.id], 'technique ' + t.id + ': close alt ' + t.close.id);
    if (t.scoring) need(!!t.move, 'technique ' + t.id + ': rig move');
  }
  for (const p in KC.MATRIX) for (const d in KC.MATRIX[p]) need(!!KC.TECH[KC.MATRIX[p][d]], 'matrix ' + p + d);
  for (const id of KC.SCORING) need(!!KC.cellOf(id), 'technique ' + id + ' is not in the matrix');
  for (const f of KC.DATA.roster) {
    need(!!KC.TECH[f.signature], 'fighter ' + f.id + ': signature');
    for (const k in f.ai.weights) need(!!KC.TECH[k], 'fighter ' + f.id + ': ai weight ' + k);
    need(KC.rankIndex(f.rank) >= 0, 'fighter ' + f.id + ': rank');
  }
  for (const s of KC.DATA.stages) { need(!!KC.PAINT && !!KC.PAINT[s.id], 'stage ' + s.id + ': painter'); need(!!KC.SONGS && !!KC.SONGS[s.music], 'stage ' + s.id + ': music ' + s.music); }
  for (const n of KC.DATA.ladder) {
    if (n.stage) need(!!KC.STAGE[n.stage], 'ladder ' + n.id + ': stage ' + n.stage);
    if (n.opponent) need(!!KC.FIGHTER[n.opponent], 'ladder ' + n.id + ': opponent');
    if (n.lesson) need(!!KC.LESSON[n.lesson], 'ladder ' + n.id + ': lesson');
    if (n.bonus) need(!!KC.BONUS[n.bonus], 'ladder ' + n.id + ': bonus');
    if (n.promote) need(KC.DATA.ranks.some(r => r.id === n.promote), 'ladder ' + n.id + ': rank');
    for (const k of ['script', 'after']) if (n[k]) need(!!KC.SCRIPTS[n[k]], 'ladder ' + n.id + ': script ' + n[k]);
  }
  for (const l of KC.DATA.lessons) { need(!!KC.STAGE[l.stage], 'lesson ' + l.id + ': stage'); for (const d of l.drills) need(!!KC.TECH[d], 'lesson ' + l.id + ': drill ' + d); }
  for (const b of KC.DATA.bonus) need(!!KC.STAGE[b.stage] && ['boards', 'pots', 'bull'].includes(b.kind), 'bonus ' + b.id);
  for (const id in KC.SCRIPTS) for (const [who] of KC.SCRIPTS[id]) need(who === 'card' || who === 'genkotsu' || !!KC.FIGHTER[who], 'script ' + id + ': speaker ' + who);
  return bad;
};

// ---- src/10-input.js ----
/* =====================================================================================================================
 * INPUT: two sticks, no buttons. The left stick (WASD) sets the posture, the right stick (IJKL, or the face buttons) the
 * technique. KC.Reader turns one E.Input into the control intent a CPU also produces: { posture, press, held } in screen
 * directions ('n' 'u' 'd' 'l' 'r'). Prompts and glyph icons follow the device used last.
 * ===================================================================================================================== */
const MENU = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'] };
const KC_KEYS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'],
  tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1'],
  prev: ['KeyQ', 'Pad4'], next: ['KeyE', 'Pad5'], alt: ['KeyT', 'Pad3'], dev: ['F2', 'Backquote'], skip: ['Enter', 'NumpadEnter', 'Pad8'], click: ['Mouse0']
}, MENU);
// two on one keyboard: player 1 keeps WASD with T F G H as its technique keys, player 2 takes the arrows with I J K L
const KC_KEYS_P1 = Object.assign({}, KC_KEYS, { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'],
  tUp: ['KeyT', 'PadRAxisUp', 'Pad3'], tDown: ['KeyG', 'PadRAxisDown', 'Pad0'], tLeft: ['KeyF', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyH', 'PadRAxisRight', 'Pad1'],
  confirm: ['Space', 'Pad0'], cancel: ['Backspace', 'Pad1'], start: ['Enter', 'Pad9'] });
const KC_KEYS_P2 = Object.assign({}, KC_KEYS, { up: ['ArrowUp', 'Pad12'], down: ['ArrowDown', 'Pad13'], left: ['ArrowLeft', 'Pad14'], right: ['ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1'],
  confirm: ['NumpadEnter', 'Pad0'], cancel: ['Numpad0', 'Pad1'], start: ['NumpadEnter', 'Pad9'], pause: ['Pad9'] });
KC.KEYS = KC_KEYS; KC.KEYS_P1 = KC_KEYS_P1; KC.KEYS_P2 = KC_KEYS_P2;
const T_ACT = { u: 'tUp', d: 'tDown', l: 'tLeft', r: 'tRight' };
KC.T_ACT = T_ACT;

/** one player's twin-stick reader: the posture (4-way, hysteresis on the analog stick, vertical beats horizontal on keys)
 *  and the technique's press edge (the most recent press wins; truly simultaneous presses: up, down, then sideways) */
KC.Reader = class {
  constructor(input) { this.I = input; this.p = 'n'; this.blocked = false; }
  posture() {
    const I = this.I; if (!I) return 'n';
    const m = I.padMove || [0, 0], mag = Math.hypot(m[0], m[1]);
    if (mag > .35 && I.lastDevice === 'gamepad') {   // the analog stick: dominant axis, pressed past .5, held until it drops below .35
      const along = d => d === 'u' ? -m[1] : d === 'd' ? m[1] : d === 'l' ? -m[0] : d === 'r' ? m[0] : 0;
      if (this.p !== 'n' && along(this.p) >= .35) return this.p;
      if (mag > .5) return (this.p = Math.abs(m[0]) > Math.abs(m[1]) ? (m[0] < 0 ? 'l' : 'r') : (m[1] < 0 ? 'u' : 'd'));
      return (this.p = 'n');
    }
    const u = I.down('up'), d = I.down('down'), l = I.down('left'), r = I.down('right');
    return (this.p = u && !d ? 'u' : d && !u ? 'd' : l && !r ? 'l' : r && !l ? 'r' : 'n');
  }
  read() {
    const I = this.I; if (!I || this.blocked || KC.Overlay.active) return { posture: 'n', press: null, held: null };
    let press = null;
    for (const d of ['l', 'r', 'd', 'u']) if (I.pressed(T_ACT[d])) press = d;   // (the last checked wins a tie: up > down > sideways)
    let held = null; for (const d of ['l', 'r', 'd', 'u']) if (I.down(T_ACT[d])) held = d;
    return { posture: this.posture(), press, held };
  }
};

/* ---- GLYPHS: icons the 5x7 font cannot draw: PlayStation and Xbox face buttons, sticks, keycaps, mouse buttons ---- */
const PS_COL = ['#7aa7ff', '#ff6a6a', '#ff8ad8', '#5ad8a0'], XB_COL = ['#5ac85a', '#e85a4a', '#4a8aff', '#f0c030'], XB_LET = ['A', 'B', 'X', 'Y'], NIN_LET = ['B', 'A', 'Y', 'X'];
const ARROW = { u: '↑', d: '↓', l: '←', r: '→', f: '→', b: '←', n: '' };
KC.ARROW = ARROW;
/** the device prompts should use for input I: 'gamepad', 'keyboard' or 'mouse' (touch shows the keyboard's) */
KC.device = (I = KC.game && KC.game.input) => !I ? 'keyboard' : I.lastDevice === 'gamepad' ? 'gamepad' : I.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
KC.padFamily = (I = KC.game && KC.game.input) => { const s = I && I.padStyle ? I.padStyle() : 'playstation'; return s === 'xbox' ? 'xbox' : s === 'nintendo' ? 'nintendo' : s === 'generic' ? 'generic' : 'playstation'; };
/** an icon spec for one input code on its device */
KC.codeIcon = (code, I) => {
  if (!code) return null;
  let m = /^Pad(\d+)$/.exec(code);
  if (m) {
    const b = +m[1];
    if (b <= 3) { const fam = KC.padFamily(I); return { kind: fam === 'playstation' ? 'ps' : fam === 'xbox' ? 'xb' : 'pad', b, fam }; }
    if (b >= 12 && b <= 15) return { kind: 'stick', side: 'D', dir: ['u', 'd', 'l', 'r'][b - 12] };
    const fam = KC.padFamily(I), names = { playstation: ['L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'], xbox: ['LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] }[fam] || ['L', 'R', 'ZL', 'ZR', '-', '+', 'LS', 'RS'];
    return { kind: 'pill', label: names[b - 4] || ('B' + b) };
  }
  m = /^Pad(R?)Axis(Up|Down|Left|Right)$/.exec(code);
  if (m) return { kind: 'stick', side: m[1] ? 'R' : 'L', dir: { Up: 'u', Down: 'd', Left: 'l', Right: 'r' }[m[2]] };
  if (code === 'Mouse0' || code === 'Mouse2') return { kind: 'mouse', b: code === 'Mouse0' ? 0 : 2 };
  const lab = I && I.codeLabel ? I.codeLabel(code) : code;
  return { kind: 'key', label: String(lab).toUpperCase().replace('BACKSPACE', 'BKSP').replace('NUM ', 'N') };
};
/** the icon for an action on a device: its first code there (after the player's rebinding) */
KC.actionIcon = (action, I = KC.game && KC.game.input, device = KC.device(I)) => {
  if (!I || !I.map || !I.map[action]) return { kind: 'key', label: '?' };
  const codes = I.map[action].filter(c => !c.startsWith('Act:'));
  if (device === 'mouse') { if (action === 'confirm') return { kind: 'mouse', b: 0 }; if (action === 'cancel') return { kind: 'mouse', b: 2 }; }
  if (device === 'gamepad') {
    const pads = codes.filter(c => c.startsWith('Pad')), stick = pads.find(c => /Axis/.test(c));
    return KC.codeIcon((['up', 'down', 'left', 'right'].includes(action) ? 'PadAxis' + { up: 'Up', down: 'Down', left: 'Left', right: 'Right' }[action] : stick && action[0] === 't' ? stick : pads.find(c => !/Axis/.test(c)) || pads[0]) || codes[0], I);
  }
  return KC.codeIcon(codes.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || codes[0], I);
};
/** draw an icon at (x, y) (its top left), s = pixel scale; returns its width */
KC.icon = (g, x, y, ic, s = 1) => {
  if (!ic) return 0;
  const H = 11 * s, font = { outline: false, scale: s };
  if (ic.kind === 'text') { E.font.text(g, ic.t, x, y + 2 * s, ic.color || '#ffffff', { outline: false, shadow: '#000', scale: s }); return E.font.width(ic.t, { scale: s }); }
  if (ic.kind === 'key' || ic.kind === 'pill') {
    const w = Math.max(H, E.font.width(ic.label, font) + 6 * s);
    px.rect(g, x + s, y, w - 2 * s, H, ic.kind === 'pill' ? '#2a2a3a' : '#e8e4dc'); px.rect(g, x, y + s, w, H - 2 * s, ic.kind === 'pill' ? '#2a2a3a' : '#e8e4dc');
    px.rect(g, x + s, y + H - 2 * s, w - 2 * s, s, ic.kind === 'pill' ? '#14141e' : '#9a968e');
    E.font.text(g, ic.label, x + Math.round((w - E.font.width(ic.label, font)) / 2), y + 2 * s, ic.kind === 'pill' ? '#e8e4f8' : '#1a1820', font);
    return w;
  }
  const R = Math.round(5.5 * s), cx = x + R, cy = y + R;
  if (ic.kind === 'ps' || ic.kind === 'xb' || ic.kind === 'pad') {
    px.disc(g, cx, cy, R, '#14121c'); px.disc(g, cx, cy, R - s, '#2a2834');
    if (ic.kind === 'xb') { px.disc(g, cx, cy, R - s, XB_COL[ic.b]); E.font.text(g, XB_LET[ic.b], cx - Math.floor(E.font.width(XB_LET[ic.b], font) / 2), cy - 3 * s, '#101018', font); }
    else if (ic.kind === 'pad') { const L = (ic.fam === 'nintendo' ? NIN_LET : ['S', 'E', 'W', 'N'])[ic.b]; E.font.text(g, L, cx - Math.floor(E.font.width(L, font) / 2), cy - 3 * s, '#e8e4f8', font); }
    else {
      const c = PS_COL[ic.b], k = Math.max(1, s), r = R - 3 * s;
      if (ic.b === 0) { px.line(g, cx - r, cy - r, cx + r, cy + r, c, k); px.line(g, cx - r, cy + r, cx + r, cy - r, c, k); }
      else if (ic.b === 1) { px.disc(g, cx, cy, r + k / 2, c); px.disc(g, cx, cy, Math.max(1, r - k / 2), '#2a2834'); }
      else if (ic.b === 2) { px.rect(g, cx - r, cy - r, 2 * r + 1, 2 * r + 1, c); px.rect(g, cx - r + k, cy - r + k, 2 * r + 1 - 2 * k, 2 * r + 1 - 2 * k, '#2a2834'); }
      else { px.line(g, cx, cy - r, cx - r, cy + r - 1, c, k); px.line(g, cx, cy - r, cx + r, cy + r - 1, c, k); px.line(g, cx - r, cy + r - 1, cx + r, cy + r - 1, c, k); }
    }
    return 2 * R + 1;
  }
  if (ic.kind === 'stick') {   // a stick (L or R, or D for the d-pad) with its direction
    if (ic.side === 'D') { px.rect(g, cx - 2 * s, y + s, 4 * s, H - 2 * s, '#2a2834'); px.rect(g, x + s, cy - 2 * s, H - 2 * s, 4 * s, '#2a2834'); }
    else { px.disc(g, cx, cy, R, '#14121c'); px.disc(g, cx, cy, R - s, '#3a3848'); px.disc(g, cx, cy, R - 3 * s, '#55536a'); }
    if (ic.side !== 'D') E.font.text(g, ic.side, cx - Math.floor(E.font.width(ic.side, font) / 2) , cy - 3 * s, '#e8e4f8', font);
    let w = 2 * R + 1;
    if (ic.dir && ic.dir !== 'n') { E.font.text(g, ARROW[ic.dir], x + w + s, y + 2 * s, '#ffe08a', { outline: false, shadow: '#000', scale: s }); w += E.font.width(ARROW[ic.dir], font) + 2 * s; }
    return w;
  }
  if (ic.kind === 'mouse') {
    const w = 9 * s; px.rect(g, x + s, y, w - 2 * s, H, '#e8e4dc'); px.rect(g, x, y + 2 * s, w, H - 4 * s, '#e8e4dc');
    px.rect(g, x + (ic.b === 0 ? s : w / 2), y + s, Math.floor(w / 2 - s), 4 * s, '#e8782a'); px.rect(g, x + Math.floor(w / 2), y, s, 5 * s, '#9a968e');
    return w;
  }
  return 0;
};
/** a run of icons and words: [ic, ic, 'text', ...]; returns its width (draw false: only measure) */
KC.iconRow = (g, x, y, parts, s = 1, draw = true) => {
  let w = 0;
  for (const p of parts) {
    const ic = typeof p === 'string' ? { kind: 'text', t: p } : p;
    if (draw) w += KC.icon(g, x + w, y, ic, s) + 2 * s;
    else w += (ic.kind === 'text' ? E.font.width(ic.t, { scale: s }) : ic.kind === 'key' || ic.kind === 'pill' ? Math.max(11 * s, E.font.width(ic.label, { scale: s }) + 6 * s) : ic.kind === 'mouse' ? 9 * s : ic.kind === 'stick' ? 12 * s + (ic.dir && ic.dir !== 'n' ? E.font.width('→', { scale: s }) + 2 * s : 0) : 12 * s) + 2 * s;
  }
  return w;
};
/** the two icons that perform a technique (facing right: toward is →), on the device used last */
KC.promptFor = (techId, I = KC.game && KC.game.input, device = KC.device(I)) => {
  const cell = techId === 'crouch' ? ['d', null] : techId === 'jump' ? ['u', null] : KC.cellOf(techId); if (!cell) return [];
  const [p, t] = cell, pd = KC.scrDir(p, 1), td = t && KC.scrDir(t, 1);
  const pAct = { u: 'up', d: 'down', l: 'left', r: 'right' }[pd], tAct = td && T_ACT[td];
  const out = [];
  if (device === 'gamepad') {
    if (pAct) out.push({ kind: 'stick', side: 'L', dir: pd });
    if (tAct) { if (out.length) out.push('+'); out.push({ kind: 'stick', side: 'R', dir: td }); }
  } else {
    if (pAct) out.push(KC.actionIcon(pAct, I, 'keyboard'));
    if (tAct) { if (out.length) out.push('+'); out.push(KC.actionIcon(tAct, I, 'keyboard')); }
  }
  if (techId === 'revPunch') out.push('CLOSE');
  return out;
};

/* ---- the touch-only gate: no keyboard or pad seen, a coarse pointer and a touch screen ---- */
KC.touchOnly = () => {
  if (KC._touchLifted) return false;
  try { return typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { KC._touchLifted = true; }, true);
  addEventListener('gamepadconnected', () => { KC._touchLifted = true; });
}

// ---- src/11-poses.js ----
/* =====================================================================================================================
 * POSES: karate stances, blocks, the bow, seiza, the referee's signals and the judges' flags, made on top of the engine's
 * Humanoid by wrapping rig.solvePose (the rig's own frame: [forward, right, up], size-1 units). Each rig gets rig.kc, a
 * set of weights the game sets every step from serializable state (KC.pose); they blend in and out smoothly.
 * ===================================================================================================================== */
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]), lerp: (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
};
function ik2(a, b, L1, L2, hint) {
  let d = V3.sub(b, a), dist = V3.len(d); const max = L1 + L2 - .01;
  if (dist > max) { d = V3.mul(d, max / dist); b = V3.add(a, d); dist = max; }
  dist = Math.max(dist, .01); const n = V3.mul(d, 1 / dist);
  let h = V3.sub(hint, V3.mul(n, V3.dot(hint, n))); const hl = V3.len(h);
  h = hl < 1e-4 ? [n[1], -n[0], 0] : V3.mul(h, 1 / hl);
  const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), y = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  return [V3.add(V3.add(a, V3.mul(n, x)), V3.mul(h, y)), b];
}
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
// the weights a rig blends toward (all 0..1 but side: +1 / -1 for the referee's signals, a local right or left)
const KC_POSE0 = { bow: 0, blockHi: 0, blockMid: 0, yoi: 0, seiza: 0, kamae: 0, sig: null, sigW: 0, side: 1, flag: 0, flagSide: 0, cross: 0, point: 0, nod: 0, hikite: 0 };
KC.rigPost = rig => {
  if (rig._kcWrapped) return rig;
  rig._kcWrapped = true; rig.kc = Object.assign({}, KC_POSE0); rig.kcW = Object.assign({}, KC_POSE0);
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const J = this.J, o = this.o, W = this.kcW; if (!J.shC) return;
    const aU = o.armUpper, aL = o.armLower, arm = (s, target, hint, w) => {   // put a hand at target (blended by w)
      if (w <= 0) return; const sh = J[s > 0 ? 'shR' : 'shL'], [el, ha] = ik2(sh, target, aU, aL, hint);
      const ek = s > 0 ? 'elbowR' : 'elbowL', hk = s > 0 ? 'handR' : 'handL';
      J[ek] = V3.lerp(J[ek], el, w); J[hk] = V3.lerp(J[hk], ha, w);
    };
    // seiza: kneel sitting on the heels (the body drops; knees forward on the floor, shins back under the hips)
    if (W.seiza > .01) {
      const k = W.seiza, hz = o.hipZ, drop = (J.hipC[2] - hz * .43) * k;
      for (const key of UPPER.concat(['hipC', 'hipL', 'hipR'])) if (J[key]) J[key] = [J[key][0], J[key][1], J[key][2] - drop];
      for (const s of [-1, 1]) {
        const hip = J[s > 0 ? 'hipR' : 'hipL'], kn = [hip[0] + o.legUpper * .92, hip[1] + s * .4, .9], ft = [hip[0] - .6, hip[1] + s * .3, .5];
        J[s > 0 ? 'kneeR' : 'kneeL'] = V3.lerp(J[s > 0 ? 'kneeR' : 'kneeL'], kn, k); J[s > 0 ? 'footR' : 'footL'] = V3.lerp(J[s > 0 ? 'footR' : 'footL'], ft, k);
      }
      for (const s of [-1, 1]) arm(s, [J.hipC[0] + o.legUpper * .7, s * 1.6, J.hipC[2] + 1.2], [0, s, -.4], k);   // hands on the thighs
    }
    // the bow (rei): the torso and head bend forward about the hips
    const bw = Math.max(W.bow * .55, W.nod * .22);
    if (bw > .01) {
      const a = bw, c = Math.cos(a), sn = Math.sin(a), h = J.hipC;
      for (const key of UPPER) { const p = J[key]; if (!p) continue; const f = p[0] - h[0], z = p[2] - h[2]; J[key] = [h[0] + f * c + z * sn, p[1], h[2] - f * sn + z * c]; }
    }
    const sh = J.shC, hd = J.head;
    // yoi: fists down in front of the belt
    if (W.yoi > .01) for (const s of [-1, 1]) arm(s, [J.hipC[0] + 3, s * 1.8, J.hipC[2] + 1.8], [.3, s, 0], W.yoi);
    // blocks: high (age-uke: the lead forearm over the brow) and middle (soto-uke: across the chest); the other fist at the hip
    if (W.blockHi > .01) { arm(-1, [hd[0] + 2.4, -.4, hd[2] + 3.4], [.4, -1, .3], W.blockHi); arm(1, [J.hipC[0] - .6, 2.1, J.hipC[2] + 2.6], [-1, .5, 0], W.blockHi); }
    if (W.blockMid > .01) { arm(-1, [sh[0] + 5.2, .4, sh[2] + .6], [.2, -1, -.6], W.blockMid); arm(1, [J.hipC[0] - .6, 2.1, J.hipC[2] + 2.6], [-1, .5, 0], W.blockMid); }
    // arms crossed (a cutscene's waiting stance), pointing (a cutscene gesture)
    if (W.cross > .01) { arm(-1, [sh[0] + 2.2, 1.6, sh[2] - 2.4], [1, -.4, 0], W.cross); arm(1, [sh[0] + 2.6, -1.6, sh[2] - 2.0], [1, .4, 0], W.cross); }
    if (W.point > .01) arm(1, [sh[0] + aU + aL - .4, 1.4, sh[2] + 1.4], [0, 1, -.3], W.point);
    // the referee's signals (he faces the camera: his right hand is on the screen's left, toward WHITE)
    if (W.sigW > .01 && this.kc.sig) {
      const w = W.sigW, s = this.kc.side, sig = this.kc.sig, L = aU + aL;
      if (sig === 'hajime') { for (const k of [-1, 1]) arm(k, [sh[0] + 4.6, k * 3.4, sh[2] - 4.6], [0, k, -.2], w); }
      else if (sig === 'yame') { arm(1, [sh[0] + 5, 1.2, sh[2] + 4.2], [0, 1, -.4], w); arm(-1, [sh[0] + 1, -2.4, sh[2] - 6], [0, -1, 0], w * .6); }
      else if (sig === 'half') { arm(s, [sh[0] + 1.6, s * (L * .72), sh[2] - L * .55], [0, s, 0], w); }
      else if (sig === 'full') { arm(s, [sh[0] + 1.2, s * (L * .62), sh[2] + L * .72], [0, s, 0], w); }
      else if (sig === 'aiuchi') { for (const k of [-1, 1]) arm(k, [sh[0] + 5.6, k * .7, sh[2] - .4], [0, k, -.5], w); }
      else if (sig === 'whistle') { arm(1, [hd[0] + 2.4, .6, hd[2] - 1.6], [0, 1, -.6], w); }
      else if (sig === 'point') { arm(s, [sh[0] + 3, s * (L * .82), sh[2] + .4], [0, s, -.3], w); }
      else if (sig === 'winner') { arm(s, [sh[0] + 1, s * (L * .45), sh[2] + L * .86], [0, s, 0], w); }
      else if (sig === 'nopoint') { for (const k of [-1, 1]) arm(k, [sh[0] + 4.2, -k * 2.6, sh[2] - 3.6], [0, k, -.3], w); }
    }
    // a corner judge's flags: flagSide +1 raises the right hand's (WHITE), -1 the left hand's (RED); both rest down
    if (W.flag > .01) for (const k of [-1, 1]) { const up = this.kc.flagSide === k ? W.flag : 0; arm(k, up ? [sh[0] + 1, k * 4.4, sh[2] + (aU + aL) * .82] : [sh[0] + 2.6, k * 3, sh[2] - 6.4], [0, k, 0], 1); }
  };
  return rig;
};
/** blend a rig's karate weights toward the targets given (call it before rig.update, every step) */
KC.poseStep = (rig, dt, want) => {
  KC.rigPost(rig);
  const K = rig.kc, W = rig.kcW;
  for (const k in KC_POSE0) if (typeof KC_POSE0[k] === 'number' && k !== 'side' && k !== 'flagSide' && k !== 'sigW') W[k] = approach(W[k], want[k] || 0, dt * (k === 'bow' ? 4 : k === 'seiza' ? 5 : 14));
  K.side = want.side || 1; K.flagSide = want.flagSide || 0; if (want.sig) K.sig = want.sig;
  W.sigW = approach(W.sigW, want.sig ? 1 : 0, dt * 9); W.sig = want.sig || null;
};
/** a Humanoid dressed for a fighter: the roster entry's rig options, the side's gi, the rank's belt */
KC.makeRig = (fid, side, rank, o = {}) => {
  const F = KC.FIGHTER[fid] || KC.FIGHTER.taro, classic = o.classic, gi = side === 'red' ? (classic ? KC.GI.classicRed : KC.GI.red) : side === 'white' ? (classic ? KC.GI.classicWhite : KC.GI.white) : null;
  const R = KC.DATA.ranks[KC.rankIndex(rank || F.rank)] || KC.DATA.ranks[0], skin = F.rig.colors.skin;
  const colors = Object.assign({}, F.rig.colors, { cloth: gi ? gi.cloth : o.cloth || '#e8dcc8', pants: gi ? gi.pants : o.pants || '#5a4a3a', trim: gi ? gi.trim : '#c8a060', belt: R.belt, boot: skin, glove: skin, eye: '#1a1320' });
  if (o.colors) Object.assign(colors, o.colors);
  const rig = new E.Humanoid(Object.assign({ weapon: null, sleeves: 'short', outfit: 'shirt', cheat: .45 }, F.rig, { colors }, o.rig || {}));
  rig.kcFighter = fid; rig.kcBeard = F.beard || null; rig.kcRank = R;
  return KC.rigPost(rig);
};
/** the referee and judges: navy blazer, grey trousers, white shirt, a red bow tie */
KC.makeOfficial = (size = 2.1, o = {}) => KC.rigPost(new E.Humanoid(Object.assign({ build: 'heroic', size, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', stubble: '#e8e4dc', cheat: .2 }, o,
  { colors: Object.assign({ skin: '#e8b890', hair: '#c8c4bc', cloth: '#1e2a52', coat: '#1e2a52', pants: '#6a6a72', boot: '#1a1418', belt: '#1a1418', trim: '#d8302a', glove: '#e8b890', eye: '#1a1320' }, o.colors || {}) })));
/** draw a beard over a rig's chin (the engine has stubble; hermits and masters get a white beard) */
KC.drawBeard = (g, rig, r, color, ox, oy) => {
  if (!color || !rig.J.head) return;
  const w = rig.worldOffset([rig.J.head[0] + rig.o.headR * .55, 0, rig.J.head[2] - rig.o.headR * .75]), p = r.w(rig.x + w[0], rig.y + w[1], rig.z + w[2]), o = r.w(rig.x, rig.y, rig.z), s = rig.o.size * r.view.scale;
  const x = Math.round(p[0] - o[0] + (ox || 0)), y = Math.round(p[1] - o[1] + (oy || 0)), bw = Math.max(2, Math.round(s * 1.6)), bh = Math.max(3, Math.round(s * 2.6));
  px.ell(g, x, y, bw, bh, E.shade(color, -.2)); px.ell(g, x, y - 1, bw - 1, bh - 1, color); px.dot(g, x - 1, y - bh + 1, '#ffffff');
};

// ---- src/20-audio.js ----
/* =====================================================================================================================
 * AUDIO: all of it written in code. KC.Voice is an Animalese/Simlish-style gibberish voice on Web Audio (a pulse, saw or
 * triangle source at the speaker's pitch through two formant band-passes, a consonant burst per syllable, prosody over the
 * line); the referee's calls have fixed rhythms; kiai shouts; a crowd of tiny voices over a noise bed. Songs use the
 * engine's sequencer (Japanese pentatonic: the in and yo scales); effects are audio.define voices.
 * Headless, nothing sounds, but speak() still returns a line's length (it drives dialog mouths and timings).
 * ===================================================================================================================== */
const VOWELS = { a: [800, 1200], e: [400, 2000], i: [300, 2500], o: [450, 800], u: [325, 700] };
const CONS = c => 'pbtdkgcq'.includes(c) ? 'plosive' : 'fvszhjx'.includes(c) ? 'fricative' : 'mnlrwy'.includes(c) ? 'nasal' : null;
KC.Voice = {
  bus: null, vol: .8, muted: false,
  /** a line's syllables: [{ v: vowel, c: consonant class, stress, len }], the same every time for the same line */
  plan(text, rate = 14) {
    const words = String(text).toLowerCase().replace(/[^a-z!?.\s]/g, '').split(/\s+/).filter(Boolean), R = KC.rng(KC.hash(text)), out = [];
    for (const w of words) {
      const letters = w.replace(/[^a-z]/g, ''); if (!letters) continue;
      const n = Math.max(1, Math.min(5, Math.round(letters.length / 2)));
      for (let i = 0; i < n; i++) {
        const chunk = letters.slice(Math.floor(i * letters.length / n), Math.floor((i + 1) * letters.length / n)) || letters;
        const v = (chunk.match(/[aeiou]/) || [null])[0] || 'aeiou'[Math.floor(R() * 5)], c = CONS((chunk.match(/[^aeiou]/) || [''])[0]);
        out.push({ v, c, stress: i === 0 && n > 1 && R() < .7, len: 1 / rate * (.85 + R() * .3), jit: (R() * 2 - 1) * .03 });
      }
      if (out.length) out[out.length - 1].gap = /[!?.]$/.test(w) ? 2.2 / rate : .6 / rate;
    }
    return out;
  },
  /** speak text as speaker who (a roster id, 'genkotsu' or a voice object); returns its seconds */
  speak(text, who, o = {}) {
    const V = typeof who === 'object' && who ? who : who === 'genkotsu' ? KC.DATA.referee.voice : (KC.FIGHTER[who] && KC.FIGHTER[who].voice) || KC.DATA.narrator.voice;
    const P = this.plan(text, o.rate || V.rate), dur = P.reduce((s, p) => s + p.len + (p.gap || 0), 0);
    this._play(P, V, text, o);
    return dur;
  },
  /** a referee call: a fixed rhythm per call (syllables and the stressed one), slower and louder than speech */
  call(id, text) {
    const [n, st] = KC.CALL_RHYTHM[id] || [Math.max(1, Math.round(String(text).length / 3)), 0], V = KC.DATA.referee.voice, vs = (String(text).toLowerCase().match(/[aeiou]/g) || ['a']);
    const P = Array.from({ length: n }, (_, i) => ({ v: vs[i % vs.length], c: i === 0 ? 'plosive' : i % 2 ? 'nasal' : 'fricative', stress: i === st, len: (i === st ? .16 : .11) * (id === 'stop' || id === 'begin' ? 1.1 : 1), jit: 0 }));
    P[P.length - 1].len *= 1.6;
    this._play(P, Object.assign({}, V, { loud: 1.5, reverb: KC.scene && KC.scene.stage === 'stadium' }), text, { exclaim: /!/.test(text) });
    return P.reduce((s, p) => s + p.len, 0);
  },
  /** a kiai: one or two loud syllables with a pitch drop ('light' or 'heavy') */
  kiai(weight, who) {
    const V = (KC.FIGHTER[who] && KC.FIGHTER[who].voice) || KC.DATA.narrator.voice, heavy = weight === 'heavy';
    const P = heavy ? [{ v: 'i', c: 'plosive', stress: false, len: .05, jit: 0 }, { v: 'a', c: null, stress: true, len: .16, jit: 0, drop: true }] : [{ v: 'a', c: 'fricative', stress: true, len: .09, jit: 0, drop: true }];
    this._play(P, Object.assign({}, V, { loud: heavy ? 1.6 : 1.2, shout: true }), 'kiai', {});
  },
  ctx() { const A = KC.game && KC.game.audio; if (!A || !A._init || !A._init() || A.muted) return null; const c = A.ctx; if (!c || c.state !== 'running') return null; if (!this.bus) { this.bus = c.createGain(); this.bus.connect(A._master); } this.bus.gain.value = this.muted ? 0 : this.vol; return c; },
  _play(P, V, text, o) {
    const c = this.ctx(); if (!c) return;
    const A = KC.game.audio, f0 = V.f0 * (o.pitch || 1), fm = V.formant || 1, loud = (V.loud || 1) * .5, n = P.length;
    let t = c.currentTime + .01;
    const out = c.createGain(); out.gain.value = 1;
    if (V.reverb) { const d = c.createDelay(), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = .09; fb.gain.value = .35; wet.gain.value = .35; out.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(this.bus); setTimeout(() => { try { d.disconnect(); fb.disconnect(); wet.disconnect(); } catch (e) { /* gone */ } }, 3000); }
    out.connect(this.bus);
    P.forEach((p, i) => {
      // prosody: the line falls; an exclaim rises then falls hard, a question rises; the stressed syllable is louder and higher
      const k = n > 1 ? i / (n - 1) : 0, q = /\?\s*$/.test(text), ex = o.exclaim || /!\s*$/.test(text);
      let pitch = 1 - .12 * k + (p.stress ? .15 : 0) + p.jit; if (q && k > .7) pitch += .25 * (k - .7) / .3; if (ex) pitch += k < .7 ? .08 : -.18 * (k - .7) / .3;
      const f = f0 * pitch, len = p.len, vol = loud * (p.stress ? 1.25 : 1) * .9;
      const src = c.createOscillator();
      if (V.wave === 'pulse' || V.wave === 'pulse12') src.setPeriodicWave(A._pulse(V.wave === 'pulse' ? .25 : .125)); else src.type = V.wave === 'saw' ? 'sawtooth' : V.wave === 'square' ? 'square' : 'triangle';
      src.frequency.setValueAtTime(f, t); src.frequency.linearRampToValueAtTime(f * (p.drop ? .72 : .97), t + len);
      if (V.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = V.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + len + .05); }
      const [F1, F2] = VOWELS[p.v] || VOWELS.a, env = c.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + .005); env.gain.setValueAtTime(vol, t + Math.max(.006, len - .03)); env.gain.linearRampToValueAtTime(0, t + len);
      for (const [F, g2] of [[F1 * fm, 1], [F2 * fm, .6]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = F; b.Q.value = V.shout ? 3 : 5; const gg = c.createGain(); gg.gain.value = g2 * 2.2; src.connect(b); b.connect(gg); gg.connect(env); }
      if (V.shout) { const ws = c.createWaveShaper(), cv = new Float32Array(256); for (let j = 0; j < 256; j++) { const x = j / 128 - 1; cv[j] = Math.tanh(x * 2.5); } ws.curve = cv; env.connect(ws); ws.connect(out); } else env.connect(out);
      src.start(t); src.stop(t + len + .02);
      // the consonant: a burst of noise (plosive), a hiss (fricative), a hum (nasal); clicks for a clam
      if (p.c || V.rough || V.breath || V.clicks) {
        const nz = c.createBufferSource(); nz.buffer = A._noise; const nf = c.createBiquadFilter(), ng = c.createGain();
        const cd = p.c === 'plosive' ? .008 : p.c === 'fricative' ? .025 : p.c === 'nasal' ? .02 : len;
        nf.type = p.c === 'fricative' ? 'highpass' : 'bandpass'; nf.frequency.value = p.c === 'fricative' ? 3500 : p.c === 'nasal' ? 300 : 1800;
        const nv = p.c ? vol * (p.c === 'nasal' ? .25 : .5) : vol * ((V.rough || 0) + (V.breath || 0)) * .6;
        ng.gain.setValueAtTime(nv, t); ng.gain.linearRampToValueAtTime(0, t + cd); nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t, Math.random() * .5); nz.stop(t + cd + .01);
        if (V.clicks && i % 2 === 0) { const ck = c.createOscillator(), cg = c.createGain(); ck.type = 'square'; ck.frequency.value = 2400; cg.gain.setValueAtTime(vol * .3, t); cg.gain.linearRampToValueAtTime(0, t + .006); ck.connect(cg); cg.connect(out); ck.start(t); ck.stop(t + .01); }
      }
      t += len + (p.gap || 0);
    });
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, (t - c.currentTime + 1) * 1000);
  },
  /** the crowd: tiny voices at random pitches over a band-passed bed, n of them over dur seconds */
  crowd(level = .5, dur = 1.2) {
    const c = this.ctx(); if (!c) return;
    const A = KC.game.audio, R = Math.random, t0 = c.currentTime + .01, out = c.createGain(); out.gain.value = .5 * level; out.connect(A._sfxBus);
    const nz = c.createBufferSource(); nz.buffer = A._noise; nz.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7; const ng = c.createGain();
    ng.gain.setValueAtTime(0, t0); ng.gain.linearRampToValueAtTime(.35 * level, t0 + .15); ng.gain.linearRampToValueAtTime(0, t0 + dur); nz.connect(bp); bp.connect(ng); ng.connect(out); nz.start(t0); nz.stop(t0 + dur + .05);
    const n = Math.round(6 + 18 * level);
    for (let i = 0; i < n; i++) {
      const t = t0 + R() * dur * .8, f = 120 + R() * 180, o = c.createOscillator(), g = c.createGain(), b = c.createBiquadFilter();
      o.type = R() < .5 ? 'sawtooth' : 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (1.1 + R() * .3), t + .12);
      b.type = 'bandpass'; b.frequency.value = 600 + R() * 1400; b.Q.value = 2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .02); g.gain.linearRampToValueAtTime(0, t + .14 + R() * .1);
      o.connect(b); b.connect(g); g.connect(out); o.start(t); o.stop(t + .3);
    }
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, (dur + 1) * 1000);
  }
};

/* ---- SOUND EFFECTS ---- */
KC.SFX = {
  whooshL: [{ wave: 'noise', freq: 1800, to: 600, dur: .12, vol: .22, filter: 'bandpass', q: 1.4 }],
  whooshH: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .3, filter: 'bandpass', q: 1.2 }],
  thwackHalf: [{ wave: 'noise', freq: 2400, to: 500, dur: .09, vol: .45, filter: 'bandpass', q: .9 }, { wave: 'sine', freq: 180, to: 70, dur: .12, vol: .45 }],
  thwackFull: [{ wave: 'noise', freq: 3000, to: 300, dur: .16, vol: .6, filter: 'bandpass', q: .7 }, { wave: 'sine', freq: 150, to: 40, dur: .25, vol: .7 }, { wave: 'square', freq: 90, to: 40, dur: .08, vol: .2 }],
  clack: [{ wave: 'square', freq: 1400, to: 900, dur: .03, vol: .25 }, { wave: 'noise', freq: 2600, dur: .05, vol: .3, filter: 'bandpass', q: 6 }],
  thudFall: [{ wave: 'sine', freq: 110, to: 40, dur: .22, vol: .6 }, { wave: 'noise', freq: 400, to: 120, dur: .2, vol: .35, filter: 'lowpass' }],
  land: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .3 }, { wave: 'noise', freq: 700, dur: .05, vol: .15, filter: 'lowpass' }],
  stepWood: [{ wave: 'noise', freq: 900, dur: .03, vol: .08, filter: 'bandpass', q: 3 }],
  pivot: [{ wave: 'noise', freq: 3000, to: 1500, dur: .05, vol: .06, filter: 'highpass' }],
  flagSnap: [{ wave: 'noise', freq: 2000, to: 4000, dur: .06, vol: .25, filter: 'bandpass', q: 2 }],
  whistle: [{ wave: 'sine', freq: 2500, dur: .5, vol: .22, vib: [28, .02], hold: true }],
  gong: [{ wave: 'sine', freq: 110, dur: 1.4, vol: .5 }, { wave: 'sine', freq: 164, dur: 1.2, vol: .25 }, { wave: 'triangle', freq: 233, dur: .9, vol: .15 }, { wave: 'noise', freq: 600, dur: .2, vol: .15, filter: 'bandpass' }],
  taikoHit: [{ wave: 'sine', freq: 90, to: 50, dur: .35, vol: .7 }, { wave: 'noise', freq: 300, to: 100, dur: .12, vol: .35, filter: 'lowpass' }],
  boardCrack: [{ wave: 'noise', freq: 2600, to: 400, dur: .18, vol: .55, filter: 'bandpass', q: .8 }, { wave: 'square', freq: 220, to: 60, dur: .08, vol: .25 }],
  potShatter: [{ wave: 'noise', freq: 4000, to: 1200, dur: .22, vol: .45, filter: 'highpass' }, { wave: 'triangle', freq: 1600, to: 900, dur: .1, vol: .15 }],
  bowlDing: [{ wave: 'sine', freq: 'E6', dur: .5, vol: .25 }, { wave: 'sine', freq: 'B6', dur: .4, vol: .12 }],
  bowlSplash: [{ wave: 'noise', freq: 1200, to: 300, dur: .3, vol: .35, filter: 'lowpass' }],
  bullSnort: [{ wave: 'noise', freq: 700, to: 300, dur: .35, vol: .4, filter: 'bandpass', q: 1.5 }],
  bullStomp: [{ wave: 'sine', freq: 80, to: 40, dur: .15, vol: .5 }],
  bullBellow: [{ wave: 'saw', freq: 120, to: 80, dur: .7, vol: .3, vib: [6, .04] }, { wave: 'saw', freq: 180, to: 120, dur: .6, vol: .15 }],
  bullThud: [{ wave: 'sine', freq: 70, to: 30, dur: .4, vol: .8 }, { wave: 'noise', freq: 500, to: 100, dur: .3, vol: .4, filter: 'lowpass' }],
  dizzy: [{ wave: 'triangle', freq: 'C6', dur: .5, vol: .15, arp: [0, 4, 7, 12, 7, 4], step: .06, loop: true }],
  gull: [{ wave: 'triangle', freq: 1400, to: 1900, dur: .12, vol: .08 }, { wave: 'triangle', freq: 1900, to: 1300, dur: .18, vol: .07, delay: .12 }],
  waves: [{ wave: 'noise', freq: 500, to: 300, dur: 1.4, vol: .12, filter: 'lowpass', attack: .5 }],
  creak: [{ wave: 'saw', freq: 90, to: 70, dur: .4, vol: .06 }],
  steamHiss: [{ wave: 'noise', freq: 5000, dur: .5, vol: .06, filter: 'highpass', attack: .1 }],
  cameraFlash: [{ wave: 'noise', freq: 6000, dur: .03, vol: .1, filter: 'highpass' }, { wave: 'sine', freq: 3000, to: 5000, dur: .08, vol: .04, delay: .02 }],
  bird: [{ wave: 'sine', freq: 2600, to: 3400, dur: .07, vol: .05 }, { wave: 'sine', freq: 3200, to: 2800, dur: .07, vol: .04, delay: .09 }],
  beltTie: [{ wave: 'noise', freq: 1500, dur: .1, vol: .2, filter: 'bandpass' }, { wave: 'square', freq: 'C6', dur: .08, vol: .12, delay: .12, arp: [0, 7, 12], step: .05 }],
  scoreTick: [{ wave: 'square', freq: 'A6', dur: .02, vol: .08 }],
  menuMove: [{ wave: 'pulse', freq: 'E5', dur: .04, vol: .12 }],
  menuOk: [{ wave: 'pulse', freq: 'A5', dur: .06, vol: .15, arp: [0, 7], step: .04 }],
  menuBack: [{ wave: 'pulse', freq: 'A4', to: 'E4', dur: .08, vol: .12 }],
  countBeep: [{ wave: 'square', freq: 'D6', dur: .08, vol: .15 }],
  chopWhoosh: [{ wave: 'noise', freq: 800, to: 200, dur: .25, vol: .35, filter: 'bandpass', q: 1 }]
};

/* ---- MUSIC (the engine's sequencer: steps per beat, tokens per step; drums k s h o c t) ---- */
const SONG = (bpm, steps, tracks) => ({ bpm, steps, tracks: tracks.map(([wave, vol, notes, name]) => ({ wave, vol, notes, name })) });
KC.SONGS = {
  title: SONG(132, 2, [
    ['square', .13, 'D5 . E5 G5 A5 . G5 E5 | D5 . E5 G5 B5 - A5 . | G5 . A5 B5 D6 - B5 A5 | G5 E5 D5 E5 G5 - - . | D5 . E5 G5 A5 . G5 E5 | D5 . E5 G5 B5 - A5 . | D6 . B5 A5 G5 . E5 G5 | A5 - - - D5 - - .'],
    ['pulse12', .07, 'A4 . . A4 . . A4 . | B4 . . B4 . . A4 . | B4 . . D5 . . D5 . | B4 . . A4 . . B4 . | A4 . . A4 . . A4 . | B4 . . B4 . . D5 . | E5 . . D5 . . B4 . | E5 . . . A4 . . .'],
    ['triangle', .3, 'D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . A2 . | E3 . E3 B2 G2 . G2 . | A2 . A2 E3 A2 . A2 . | D3 . D3 A2 D3 . A2 . | G2 . G2 D3 G2 . A2 . | E3 . E3 B2 G2 . A2 . | A2 . A2 E3 D3 . . .'],
    ['drums', .12, 't . h k s . h . | k . h k s . h h | t . h k s . h . | k k h . s . o . | t . h k s . h . | k . h k s . h h | t . h k s . h k | c . h . s s t t']]),
  dojo: SONG(96, 2, [
    ['pulse12', .12, 'D5 . . G5 A5 . . . | B5 . A5 . G5 . . . | E5 . . G5 D5 . . . | E5 . D5 . B4 . . . | D5 . . G5 A5 . . . | D6 . B5 . A5 . . . | G5 . E5 . D5 . E5 . | D5 . . . . . . .'],
    ['triangle', .25, 'D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . B2 . . . | A2 . . . E3 . . . | D3 . . . A2 . . . | G2 . . . D3 . . . | E3 . . . A2 . . . | D3 . . . D3 . . .'],
    ['drums', .1, 't . . . . . k . | t . . . s . . . | t . . . . . k . | t . . t s . . .']]),
  harbor: SONG(120, 2, [
    ['square', .11, 'G5 . A5 B5 D6 . B5 A5 | G5 . E5 . D5 . . . | E5 . G5 A5 B5 . A5 G5 | A5 . . . . . . . | G5 . A5 B5 D6 . E6 D6 | B5 . A5 . G5 . E5 . | D5 . E5 G5 A5 . B5 A5 | G5 . . . . . . .'],
    ['triangle', .28, 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | E2 . B2 . E2 . B2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | G2 . D3 . G2 . . .'],
    ['drums', .1, 'k . h . s . h . | k . h k s . h . | k . h . s . h . | k k h . s . o .']]),
  bamboo: SONG(84, 2, [
    ['triangle', .2, 'A5 - - - G5 . E5 . | D5 - - - . . . . | E5 . G5 . A5 - - - | B5 . A5 . G5 - - - | A5 - - - D6 - B5 . | A5 - - - G5 . . . | E5 . D5 . E5 . G5 . | D5 - - - . . . .', 'flute'],
    ['sine', .2, 'D3 - - - - - - - | A2 - - - - - - - | E3 - - - - - - - | G2 - - - - - - -'],
    ['drums', .05, 'h . . h . . h . | h . h . . . h .']]),
  gorge: SONG(140, 2, [
    ['pulse', .12, 'D4 D4 Eb4 D4 G4 D4 Eb4 D4 | D4 D4 Eb4 D4 A4 G4 Eb4 D4 | Bb3 Bb3 D4 Bb3 Eb4 D4 Bb3 A3 | D4 D4 Eb4 D4 G4 A4 Bb4 A4'],
    ['square', .1, 'D5 - - - . . Eb5 D5 | G5 - - - A5 - G5 . | Bb5 - A5 - G5 - Eb5 . | D5 - - - . . . .'],
    ['drums', .12, 'k . t . s t t . | k . t k s . t t | k . t . s t t . | k k t . s . c .']]),
  ship: SONG(110, 3, [
    ['square', .11, 'D5 . E5 G5 . E5 | D5 . . B4 . . | G4 . A4 B4 . D5 | E5 . . D5 . . | D5 . E5 G5 . A5 | B5 . . A5 . . | G5 . E5 D5 . E5 | D5 . . . . .'],
    ['pulse', .07, 'B4 . . B4 . . | G4 . . G4 . . | D4 . . D4 . . | A4 . . A4 . . | B4 . . B4 . . | D5 . . D5 . . | B4 . . A4 . . | B4 . . . . .'],
    ['triangle', .28, 'G2 . . D3 . . | G2 . . D3 . . | E2 . . B2 . . | A2 . . E3 . . | G2 . . D3 . . | G2 . . D3 . . | C3 . . D3 . . | G2 . . . . .'],
    ['drums', .1, 'k . h s . h | k . h s . h | k . h s . h | k . h s s h']]),
  market: SONG(124, 2, [
    ['sine', .18, 'A5 B5 A5 G5 E5 . G5 . | A5 . D6 . B5 A5 G5 . | E5 G5 A5 B5 A5 . G5 E5 | D5 . E5 . G5 . . . | A5 B5 A5 G5 E5 . G5 . | A5 . D6 . E6 D6 B5 . | A5 G5 E5 G5 A5 . B5 A5 | G5 . . . . . . .', 'flute'],
    ['triangle', .25, 'D3 . A2 . D3 . A2 . | G2 . D3 . G2 . D3 . | E3 . B2 . E3 . B2 . | A2 . E3 . A2 . E3 .'],
    ['drums', .13, 't . h t s . h h | t . h t s . h . | t t h t s . h h | t . h t s s o .']]),
  fuji: SONG(100, 4, [
    ['square', .08, 'D5 G5 B5 G5 D5 G5 B5 G5 E5 A5 C6 A5 E5 A5 C6 A5 | B4 E5 G5 E5 B4 E5 G5 E5 A4 D5 F#5 D5 A4 D5 F#5 D5'],
    ['triangle', .22, 'G2 - - - - - - - A2 - - - - - - - | E2 - - - - - - - D2 - - - - - - -'],
    ['pulse12', .09, 'B5 - - - - - - - C6 - - - A5 - - - | G5 - - - - - - - F#5 - - - - - - -'],
    ['drums', .06, 't . . . h . . . s . . . h . . . | t . . . h . . . s . . . h . h .']]),
  stadium: SONG(150, 2, [
    ['square', .12, 'D5 D5 . D5 A5 . G5 . | F5 . E5 . D5 . C5 . | D5 D5 . D5 A5 . C6 . | A5 - - - G5 . A5 . | Bb5 . A5 . G5 . F5 . | E5 . F5 . G5 . A5 . | D6 . C6 . A5 . G5 . | A5 - - - - - . .'],
    ['pulse', .08, 'A4 A4 . A4 D5 . D5 . | D5 . C5 . A4 . G4 . | A4 A4 . A4 D5 . E5 . | E5 - - - D5 . E5 . | F5 . F5 . D5 . D5 . | C5 . C5 . D5 . E5 . | F5 . E5 . D5 . D5 . | E5 - - - - - . .'],
    ['triangle', .3, 'D3 D3 D3 D3 D3 D3 D3 D3 | Bb2 Bb2 Bb2 Bb2 C3 C3 C3 C3 | D3 D3 D3 D3 D3 D3 D3 D3 | A2 A2 A2 A2 A2 A2 A2 A2 | Bb2 Bb2 Bb2 Bb2 G2 G2 G2 G2 | C3 C3 C3 C3 A2 A2 A2 A2 | D3 D3 D3 D3 F3 F3 F3 F3 | A2 A2 A2 A2 A2 A2 A2 A2'],
    ['drums', .13, 'k h s h k k s h | k h s h k k s o | k h s h k k s h | k h s h s s t t']]),
  bonus: SONG(160, 2, [
    ['square', .1, 'G5 . G5 . A5 . G5 . | E5 . D5 . E5 . . . | G5 . G5 . A5 . B5 . | D6 . B5 . A5 . . . | G5 . G5 . A5 . G5 . | E5 . D5 . E5 . G5 . | A5 . B5 . A5 . G5 . | E5 . D5 . G5 . . .'],
    ['triangle', .25, 'G2 . D3 . G2 . D3 . | C3 . G2 . C3 . G2 . | G2 . D3 . G2 . D3 . | D3 . A2 . D3 . A2 .'],
    ['drums', .11, 'k h s h k h s h | k h s h k k s h']]),
  practice: SONG(90, 2, [
    ['pulse', .09, 'D5 . E5 . G5 . . . | A5 . G5 . E5 . . . | D5 . E5 . G5 . A5 . | B5 . . . A5 . . .'],
    ['triangle', .22, 'D3 . . . A2 . . . | G2 . . . A2 . . .'],
    ['drums', .05, 'k . h . . . h . | k . h . s . h .']]),
  select: SONG(128, 2, [
    ['square', .1, 'A4 . D5 . E5 . G5 . | A5 . G5 E5 D5 . . . | A4 . D5 . E5 . G5 . | B5 . A5 G5 A5 . . .'],
    ['triangle', .28, 'D3 . D3 . D3 . D3 . | G2 . G2 . G2 . G2 . | D3 . D3 . D3 . D3 . | A2 . A2 . A2 . A2 .'],
    ['drums', .1, 'k . h k s . h . | k . h k s . h h']]),
  session: SONG(110, 2, [
    ['pulse12', .1, 'D5 . G5 . A5 . . . | B5 . A5 . G5 . . . | E5 . G5 . A5 . . . | G5 . E5 . D5 . . .'],
    ['triangle', .24, 'D3 . . . G2 . . . | E3 . . . A2 . . .'],
    ['drums', .07, 't . . . s . . . | t . t . s . h .']]),
  continue: SONG(120, 2, [
    ['square', .1, 'D5 . . . D5 . . . | Eb5 . . . Eb5 . . . | D5 . . . D5 . . . | A4 . . . A4 . . .'],
    ['triangle', .26, 'D3 . D3 . D3 . D3 . | Eb3 . Eb3 . Eb3 . Eb3 . | D3 . D3 . D3 . D3 . | A2 . A2 . A2 . A2 .'],
    ['drums', .08, 'h . h . h . h . | h . h . h . h h']]),
  gameover: Object.assign(SONG(80, 2, [
    ['triangle', .22, 'A4 - G4 - Eb4 - - - | D4 - - - - - - - | Bb3 - A3 - G3 - - - | D3 - - - - - - -'],
    ['pulse12', .07, 'D4 - - - - - - - | Bb3 - - - - - - - | G3 - - - - - - - | D3 - - - - - - -']]), { loop: false }),
  ending: SONG(104, 2, [
    ['square', .1, 'D5 . E5 G5 A5 - G5 E5 | D5 . E5 G5 B5 - A5 - | G5 . A5 B5 D6 - B5 A5 | G5 - E5 - D5 - - - | D5 . E5 G5 A5 - G5 E5 | D5 . E5 G5 B5 - A5 - | D6 - B5 - A5 - G5 - | A5 - - - D6 - - -'],
    ['triangle', .25, 'D3 - - - A2 - - - | G2 - - - D3 - - - | E3 - - - B2 - - - | A2 - - - D3 - - -'],
    ['pulse12', .06, 'F#4 - - - A4 - - - | B4 - - - D5 - - - | G4 - - - B4 - - - | A4 - - - F#4 - - -'],
    ['drums', .07, 'k . h . s . h . | k . h . s . h h']])
};
KC.STINGS = {
  promotion: Object.assign(SONG(140, 4, [['square', .14, 'D5 . F#5 . A5 . D6 - - - - . A5 . D6 - - - - - - -'], ['triangle', .25, 'D3 - - - A3 - - - D3 - - - D4 - - - - - - - - - - -'], ['drums', .12, 'k . . . s . . . k . . . c . . . . . . . . . . .']]), { loop: false }),
  victory: Object.assign(SONG(150, 4, [['square', .13, 'G5 . A5 . B5 . D6 - - - B5 . D6 - - - - - - -'], ['triangle', .25, 'G2 - - - D3 - - - G3 - - - - - - - - - - -']]), { loop: false }),
  defeat: Object.assign(SONG(90, 2, [['triangle', .22, 'A4 - Eb4 - D4 - - -'], ['pulse12', .06, 'Eb4 - Bb3 - A3 - - -']]), { loop: false }),
  perfect: Object.assign(SONG(160, 4, [['square', .12, 'D6 . A5 . D6 . E6 . F#6 - - - - - - .'], ['pulse12', .08, 'A5 . F#5 . A5 . B5 . D6 - - - - - - .']]), { loop: false }),
  round: Object.assign(SONG(130, 4, [['triangle', .2, 'D4 - - - A4 - - - D5 - - -'], ['drums', .12, 't . . . t . . . c . . .']]), { loop: false })
};
KC.sfx = (name, o) => { const g = KC.game; if (g && g.audio) g.audio.sfx(name, o); };
KC.music = (id, o) => { const g = KC.game; if (!g || !g.audio) return; if (!id) { g.audio.music(null); return; } const s = KC.SONGS[id]; if (s) g.audio.music(s, o); };
KC.sting = id => { const g = KC.game, s = KC.STINGS[id]; if (g && g.audio && s) g.audio.sting(s); };
KC.defineSfx = game => { for (const k in KC.SFX) game.audio.define(k, KC.SFX[k]); };

// ---- src/30-karateka.js ----
/* =====================================================================================================================
 * KARATEKA: one fighter. A body on the mat (x, z feet; a push box w x h), a state machine stepped at 120 Hz, the technique
 * table's frame data, and the hit rules. Its rig is posed only from serializable state (KC.Karateka.pose), so a puppet fed
 * snapshots (online guests), a replay or the attract mode pose exactly as the host does.
 * States: idle walk crouch (free) | tech (any technique, evasion or block) | land | hurt | down | rise | script (the bout
 * drives it: walk to a mark, bow, yoi, win, lose, seiza).
 * ===================================================================================================================== */
const ST_CODES = ['idle', 'walk', 'crouch', 'tech', 'land', 'hurt', 'down', 'rise', 'script'];
const TECH_IDS = KC.DATA.techniques.map(t => t.id);
const POSES = [null, 'bow', 'yoi', 'kamae', 'win', 'lose', 'seiza', 'kneel', 'cheer', 'hips', 'cross', 'wave', 'point', 'chop', 'breathe', 'nod', 'trampled', 'dizzy'];
KC.Karateka = class {
  /** new KC.Karateka({ fid, side: 0 (white, left) | 1 (red, right), x, rank, classic, bus }) */
  constructor(o) {
    this.fid = o.fid; this.F = KC.FIGHTER[o.fid] || KC.FIGHTER.taro; this.side = o.side || 0; this.bus = o.bus || null;
    const size = this.F.rig.size || 2.15;
    this.size = size; this.w = Math.round(8 * size); this.h = Math.round(30 * size);
    this.x = o.x !== undefined ? o.x : KC.ARENA.marks[this.side]; this.z = 0; this.vx = 0; this.vz = 0;
    this.face = this.side === 0 ? 1 : -1; this.x0 = KC.ARENA.x0; this.x1 = KC.ARENA.x1;
    this.st = 'idle'; this.k = 0; this.tech = null; this.fr = [0, 0, 0]; this.extra = 0; this.resolved = false; this.blockedBy = false; this.hold = false;
    this.buf = null; this.bufAge = 0; this.lastP = 'n'; this.air = false; this.spose = null; this.walkTo = null; this.walkSpeed = 1; this.inv = 0;
    this.ctl = { posture: 'n', press: null, held: null }; this.ctlOn = false; this.react = null; this.reactT = 0; this.prevVz = 0;
    this.rank = o.rank || this.F.rank;
    this.rig = KC.makeRig(this.fid, this.side === 0 ? 'white' : 'red', this.rank, { classic: o.classic });
    this.faceAng = this.face > 0 ? 0 : PI; this.stats = { full: 0, half: 0, blocks: 0, attempts: 0, best: null, bestPts: 0, used: {} };
    this.lastInputs = [];   // the input display: the last few technique presses
  }
  get T() { return this.tech ? KC.TECH[this.tech] : null; }
  get free() { return this.st === 'idle' || this.st === 'walk' || this.st === 'crouch'; }
  get airborne() { return this.z > .01 || this.air; }
  /** the gap between the push boxes' edges */
  gapTo(foe) { return Math.abs(foe.x - this.x) - (this.w + foe.w) / 2; }
  /** where the technique is: 'wind' (startup), 'active', 'recover', or null */
  get phase() { if (this.st !== 'tech') return null; const [S, A] = this.fr; return this.k < S ? 'wind' : this.k < S + A ? 'active' : 'recover'; }
  /** the scaled steps of a technique for this fighter now: [startup, active, recovery] */
  frames(t) {
    const spd = (t.scoring ? this.F.stats.speed : 1) * KC.TUNE.techSpeed, s = n => Math.max(1, Math.round(n * F2S / spd));
    if (t.id === 'block') return [s(t.f[0]), Math.round(KC.TUNE.blockWindow * F2S), s(t.f[2])];
    if (t.id === 'jump') return [s(t.f[0]), 0, s(t.f[2])];
    return [s(t.f[0]), t.f[1] ? s(t.f[1]) : 0, s(t.f[2])];
  }
  /** the start-gap band in which technique t connects (its table reach, by the fighter's reach and the tuning) */
  band(t) { const s = this.F.stats.reach * KC.TUNE.reachScale; return [t.reach[0] * s, t.reach[1] * s]; }
  // how far a technique carries the body toward the foe (a lunge's step, a jump kick's flight)
  travel(t) { return t.air ? t.air.travel : t.flip ? t.flip.travel : t.travel || 0; }
  /** the gap band at the moment of contact (the start band less the distance the technique travels) */
  contactBand(t) {
    const s = this.F.stats.reach * KC.TUNE.reachScale;
    let tr = Math.max(0, this.travel(t));
    if (t.air) { const airSteps = 2 * KC.TUNE.jump / KC.TUNE.gravity / STEP, f = this.frames(t); tr *= Math.min(1, (f[0] + f[1]) / airSteps); }   // a jump kick's flight: what it has flown by the end of its strike
    return [Math.max(0, t.reach[0] * s - tr), Math.max(4, t.reach[1] * s - tr)];
  }
  /** the body's profile now, for the height rules: stand, crouch, roll, air, flip, or null (can't be hit) */
  profile() {
    if (this.st === 'down' || this.st === 'rise' || this.st === 'script' || this.inv > 0) return null;
    if (this.st === 'crouch') return 'crouch';
    if (this.st === 'tech') {
      const t = this.T;
      if (t.prof === 'flip') return this.airborne ? 'flip' : 'stand';
      if (t.prof === 'roll') return this.phase === 'active' ? 'roll' : 'crouch';
      if (t.prof === 'crouch' || t.id === 'crouch') return 'crouch';
      if (t.prof === 'air') return this.airborne ? 'air' : 'stand';
    }
    return this.airborne ? 'air' : 'stand';
  }
  /** can a technique of this height land on this body now */
  static heightOK(height, prof, def) {
    if (!prof) return false;
    if (height === 'air') return prof !== 'roll';
    if (height === 'high') return prof === 'stand' || prof === 'air' || prof === 'flip';
    if (height === 'mid') return prof === 'stand' || prof === 'air';
    if (height === 'midlow') return prof === 'stand' || prof === 'crouch' || prof === 'roll';
    if (height === 'low') return prof === 'stand' || prof === 'crouch' || prof === 'roll';
    if (height === 'rising') return prof === 'stand' || ((prof === 'air' || prof === 'flip') && def.vz > 0);
    return false;
  }
  // the effective height of a technique (jump kicks come down from above: they hit crouchers too)
  static heightOf(t) { return t.prof === 'air' && t.scoring ? 'air' : t.height; }
  /** is the fighter in a technique's frames (a hit on it now is a counter: x2) */
  get countering() { return this.st === 'tech' && this.T.scoring; }
  emit(k, d) { if (this.bus) this.bus.emit(k, Object.assign({ f: this }, d)); }

  /* ---- starting things ---- */
  /** start technique id now (close substitutions by the gap to foe); returns the id it started */
  startTech(id, foe, keepK) {
    let t = KC.TECH[id]; if (!t) return null;
    for (let n = 0; n < 3 && t.close && foe && this.gapTo(foe) < t.close.gap * KC.TUNE.reachScale; n++) t = KC.TECH[t.close.id];
    if (foe && foe.x !== this.x && !keepK) this.face = foe.x > this.x ? 1 : -1;
    this.st = 'tech'; this.tech = t.id; this.fr = this.frames(t); this.extra = 0; this.resolved = false; this.blockedBy = false; this.hold = false;
    if (!keepK) this.k = 0;
    this.vx = 0;
    if (t.air && !this.airborne) this._launch(KC.TUNE.jump, t.air.travel);   // a jump kick leaves the ground at once
    this.stats.used[t.id] = (this.stats.used[t.id] || 0) + 1;
    if (t.scoring && foe && this.gapTo(foe) <= this.band(t)[1] + 6) this.stats.attempts++;
    this.emit('start', { tech: t.id });
    return t.id;
  }
  _launch(vz, travel) {
    const g = KC.TUNE.gravity, airT = 2 * vz / g;
    this.vz = vz; this.vx = this.face * travel / airT; this.air = true; this.z = Math.max(this.z, .01);
  }
  /** the control intent for this step (a human's KC.Reader or a CPU's), in screen directions */
  control(c) { this.ctl = c || { posture: 'n', press: null, held: null }; }

  /* ---- one step ---- */
  update(dt, foe) {
    const T = KC.TUNE, c = this.ctlOn ? this.ctl : { posture: 'n', press: null, held: null };
    const P = KC.relDir(c.posture, this.face);
    if (this.inv > 0) this.inv -= dt;
    // a technique press while busy is kept for 0.15 s and fires on the first free step
    if (c.press) { this.buf = c.press; this.bufAge = 0; this.lastInputs.push([P, KC.relDir(c.press, this.face)]); if (this.lastInputs.length > 12) this.lastInputs.shift(); }
    else if (this.buf && ++this.bufAge > 18) this.buf = null;
    this.k++;
    if (this.st === 'script') this._script(dt, foe);
    else if (this.st === 'down' || this.st === 'rise' || this.st === 'hurt') this._react(dt);
    else if (this.free) {
      if (foe && foe.x !== this.x && !this.airborne) this.face = foe.x > this.x ? 1 : -1;   // (it faces the foe whenever free on the ground)
      const Pn = KC.relDir(c.posture, this.face);
      if (this.ctlOn && this.buf) { const td = KC.relDir(this.buf, this.face), id = KC.MATRIX[Pn][td]; this.buf = null; if (id === 'crouch') { this._setFree('crouch'); } else this.startTech(id, foe); }
      else if (this.ctlOn && Pn === 'u') this.startTech('jump', foe);
      else if (this.ctlOn && Pn === 'd') this._setFree('crouch');
      else if (this.ctlOn && (Pn === 'f' || Pn === 'b')) { this._setFree('walk'); this.vx = this.face * (Pn === 'f' ? 1 : -.78) * T.walk * this.F.stats.walk; }
      else { this._setFree('idle'); this.vx = 0; }
      if (this.st === 'crouch') this.vx = 0;
    } else if (this.st === 'tech') this._techStep(dt, foe, Pn => Pn, P);
    else if (this.st === 'land') { this.vx = 0; if (this.k >= (this.landK || 10)) this._setFree('idle'); }
    this._physics(dt);
  }
  // reactions: a stagger (hurt) or lying down, held while the referee stops the fight (stay), then up again
  _react(dt) {
    if (!this.airborne) this.vx = approach(this.vx, 0, (this.st === 'down' ? 300 : 500) * dt);
    if (this.st === 'hurt' && !this.stay && this.k >= 60) { this.st = this.scripted ? 'script' : 'idle'; this.k = 0; }
    else if (this.st === 'down' && !this.stay && this.k >= 70 && !this.airborne) { this.st = 'rise'; this.k = 0; }
    else if (this.st === 'rise' && this.k >= 40) { this.st = this.scripted ? 'script' : 'idle'; this.k = 0; this.inv = .2; }
  }
  _setFree(st) { if (this.st !== st) { this.st = st; this.k = 0; } if (st !== 'tech') { this.tech = null; } }
  _techStep(dt, foe, _f, P) {
    const t = this.T, [S, A, R] = this.fr, total = S + A + R + this.extra;
    // the late posture upgrade: a standing technique's posture changed within 8 steps: its variant takes over
    if (this.ctlOn && this.k <= 8 && t.input[0] === 'n' && P !== 'n' && t.scoring) {
      const td = t.input[1] === 'f' && t.id === 'revPunch' ? 'f' : t.input[1], alt = KC.MATRIX[P] && KC.MATRIX[P][td];
      if (alt && alt !== t.id && alt !== 'crouch') { const k = this.k; this.startTech(alt, foe, true); this.k = k; return this._techStep(dt, foe, _f, P); }
    }
    if (t.id === 'jump' && this.k < S && this.ctlOn && this.buf) {   // the pre-jump crouch: a technique now is its jumping variant
      const id = KC.MATRIX.u[KC.relDir(this.buf, this.face)]; this.buf = null;
      if (id && id !== 'jump') { this.startTech(id, foe); return; }
    }
    if (t.id === 'jump' && this.k === S) this._launch(KC.TUNE.jump, 0);
    if (t.flip && this.k === S) this._launch(t.flip.vz, t.flip.travel);
    if (this.k === S && A > 0) this.emit('active', { tech: t.id });
    // ground travel: lunges step in over the startup and the strike; the roll slides back over its active frames
    const tr = t.travel || 0;
    if (!this.airborne && tr && !this.blockedBy) {
      if (t.prof === 'roll') this.vx = this.k >= S && this.k < S + A ? this.face * tr / (A * STEP) : 0;
      else this.vx = this.k < S + A ? this.face * tr / ((S + A) * STEP) : 0;
    } else if (!this.airborne) this.vx = this.blockedBy ? this.vx : 0;
    if (this.hold && this.k >= S + A + Math.round(R * .35)) this.k = S + A + Math.round(R * .35);   // the kime: held while the referee stops the fight
    if (t.hold && this.k >= S) this.k = S;   // a held crouch
    if (this.blockedBy && !this.airborne) this.vx = approach(this.vx, 0, 900 * dt);
    if (this.k >= total && !this.airborne && !t.hold) { this._setFree('idle'); this.vx = 0; }
  }
  _physics(dt) {
    const g = KC.TUNE.gravity;
    this.prevVz = this.vz;
    if (this.airborne) {
      this.vz -= g * dt; this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0; this.air = false; this.vx = 0;
        const t = this.T;
        if (this.st === 'tech' && (t.id === 'jump' || t.flip)) { this.landK = t.flip ? 24 : 10; this.st = 'land'; this.k = 0; this.tech = null; this.emit('land', {}); }
        else if (this.st === 'tech' && t.air) { const [S, A, R] = this.fr; this.k = Math.max(this.k, S + A + Math.max(0, R - 12)); this.emit('land', {}); }
        else if (this.st === 'hurt' || this.st === 'down') this.emit('land', { heavy: true });
      }
    }
    this.x += this.vx * dt;
    const h = this.w / 2;
    if (this.x - h < this.x0) { this.x = this.x0 + h; if (this.vx < 0 && !this.airborne) this.vx = 0; }
    if (this.x + h > this.x1) { this.x = this.x1 - h; if (this.vx > 0 && !this.airborne) this.vx = 0; }
  }
  /* ---- scripted (the bout drives it: walk to a mark, poses) ---- */
  script(pose, walkTo, speed = 1) {
    this.scripted = true; this.stay = false; this.spose = pose || null; this.walkTo = walkTo === undefined ? null : walkTo; this.walkSpeed = speed; this.ctlOn = false; this.hold = false; this.buf = null;
    if (this.st === 'down') { this.st = 'rise'; this.k = 0; }
    else if (this.st !== 'rise' && this.st !== 'script') { this.st = 'script'; this.k = 0; this.tech = null; this.vx = 0; }
  }
  _script(dt, foe) {
    if (this.walkTo !== null) {
      const d = this.walkTo - this.x, sp = 72 * this.walkSpeed;
      if (Math.abs(d) < 1.5) { this.x = this.walkTo; this.walkTo = null; this.vx = 0; }
      else this.vx = Math.sign(d) * sp;
    } else this.vx = 0;
    if (this.walkTo === null && foe && foe.x !== this.x && this.spose !== 'win' && this.spose !== 'lose') this.face = foe.x > this.x ? 1 : -1;
    if (this.airborne) this.vx = 0;
  }
  /** release to play: free, standing, facing the foe */
  release(foe) { this.scripted = false; this.stay = false; this.st = 'idle'; this.k = 0; this.tech = null; this.spose = null; this.walkTo = null; this.vx = 0; this.vz = 0; this.z = 0; this.air = false; this.hold = false; this.buf = null; if (foe) this.face = foe.x > this.x ? 1 : -1; }
  /** a reaction to a scoring hit: 'hurt' (half) or 'down' (full, or any sweep), pushed away from the attacker */
  hit(kind, fromX) {
    const dir = this.x >= fromX ? 1 : -1;
    this.st = kind === 'down' ? 'down' : 'hurt'; this.k = 0; this.tech = null; this.hold = false; this.buf = null; this.stay = true;
    this.vx = dir * (kind === 'down' ? 120 : 80); if (this.airborne) { this.vz = Math.max(this.vz, 60); }
  }
  /* ---- the strike: during the active frames, does it connect with foe ---- */
  strike(foe) {
    if (this.st !== 'tech' || this.resolved || this.phase !== 'active') return null;
    const t = this.T; if (!t.scoring) return null;
    const dir = foe.x > this.x ? 1 : foe.x < this.x ? -1 : this.face;
    if (dir !== this.face) return null;   // (the foe flipped over it: the strike goes the wrong way)
    const prof = foe.profile(), H = KC.Karateka.heightOf(t);
    if (!KC.Karateka.heightOK(H, prof, foe)) return null;
    const gap = this.gapTo(foe), [lo, hi] = this.contactBand(t);
    if (gap > hi || gap < lo - 10) return null;
    const [S, A] = this.fr, u = (this.k - S) / Math.max(1, A);
    const timingQ = u <= .4 ? 1 : lerp(1, .3, (u - .4) / .6);
    const top = lo + (hi - lo) * .7, spacingQ = gap >= top ? 1 : clamp((gap - lo) / Math.max(1, top - lo), 0, 1);
    return { tech: t.id, gap, timingQ, spacingQ, prof, height: H };
  }
  /** blocks technique t now (its guard frames, facing the attacker, high or mid) */
  blocks(att) {
    if (this.st !== 'tech' || this.tech !== 'block' || this.phase !== 'active') return false;
    const t = att.T; if (!t || t.unblockable) return false;
    return (att.x > this.x ? 1 : -1) === this.face;
  }
  /** a strike was blocked: the attacker recoils (pushed back, 10 more frames of recovery: open to a counter) */
  recoil() { this.resolved = true; this.blockedBy = true; this.extra += 20; if (!this.airborne) this.vx = -this.face * 159; }
  /** the guard did its job: the block ends early (free 6 frames sooner) */
  guarded(att) { const [S, A, R] = this.fr; this.k = S + A; this.fr = [S, A, Math.max(0, R - 12)]; this.blockHi = KC.Karateka.heightOf(att.T) !== 'mid' && KC.Karateka.heightOf(att.T) !== 'midlow'; this.stats.blocks++; }

  /* ---- snapshots (online): the serializable state, compact ---- */
  snap() { return [Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, ST_CODES.indexOf(this.st), this.tech ? TECH_IDS.indexOf(this.tech) : -1, this.k, POSES.indexOf(this.spose), (this.air ? 1 : 0) | (this.hold ? 2 : 0) | (this.blockHi ? 4 : 0) | (this.ctlOn ? 8 : 0), this.fr[0], this.fr[1], this.fr[2] + this.extra, Math.round(this.vx), Math.round(this.vz)]; }
  applySnap(s) {
    this.x = s[0]; this.z = s[1]; this.face = s[2]; this.st = ST_CODES[s[3]] || 'idle'; this.tech = s[4] >= 0 ? TECH_IDS[s[4]] : null; this.k = s[5]; this.spose = POSES[s[6]] || null;
    this.air = !!(s[7] & 1); this.hold = !!(s[7] & 2); this.blockHi = !!(s[7] & 4); this.ctlOn = !!(s[7] & 8); this.fr = [s[8], s[9], s[10]]; this.extra = 0; this.vx = s[11] || 0; this.vz = s[12] || 0;
  }

  /* ---- posing the rig from the state above (and only from it) ---- */
  pose(dt) {
    const t = this.T, rig = this.rig, base = this.face > 0 ? 0 : PI;
    let spin = 0, attack = null, pose = null, flip = 0, air = false, expr = null, stance = null, hurt = false, down;
    const want = { kamae: 0, bow: 0, yoi: 0, seiza: 0, blockHi: 0, blockMid: 0, cross: 0, point: 0, nod: 0 };
    if (this.st === 'land') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'tech' && t) {
      const [S, A, R0] = this.fr, R = R0 + this.extra, k = this.k;
      const phase = k < S ? 'wind' : k < S + A ? 'active' : 'recover', u = phase === 'wind' ? k / Math.max(1, S) : phase === 'active' ? (k - S) / Math.max(1, A) : (k - S - A) / Math.max(1, R);
      if (t.move) attack = { spec: t.move, phase, u: clamp(u, 0, 1) };
      if (t.spin === .5) spin = phase === 'wind' ? PI * KC.ease.inOut(u) : phase === 'active' ? PI : PI + PI * KC.ease.inOut(clamp((u - .35) / .65, 0, 1));
      else if (t.spin === 1) spin = phase === 'wind' ? TAU * .78 * KC.ease.inOut(u) : phase === 'active' ? TAU * (.78 + .22 * u) : 0;
      if (t.id === 'block') { if (this.blockHi) want.blockHi = 1; else want.blockMid = 1; }
      if (t.prof === 'crouch' || t.id === 'crouch') pose = 'crouch';
      if (t.flip) { if (this.airborne) { const airSteps = 2 * t.flip.vz / KC.TUNE.gravity / STEP, ft = clamp((k - S) / airSteps, 0, 1); flip = t.flip.travel > 0 ? clamp(ft, .02, .98) : clamp(1 - ft, .02, .98); } else if (k < S) pose = 'crouch'; }
      if (t.prof === 'roll' && phase === 'active') flip = clamp(1 - u, .02, .98);
      if (t.prof === 'roll' && phase !== 'active') pose = 'crouch';
      if (t.id === 'jump' && k < S) pose = 'crouch';
      air = this.airborne && !t.flip;
      expr = phase === 'wind' ? 'angry' : 'shout';
      if (!t.scoring && t.id !== 'block') expr = null;
      stance = 'guard';
    } else if (this.st === 'hurt') { hurt = true; expr = 'wince'; }
    else if (this.st === 'down') { down = 1; expr = 'wince'; }
    else if (this.st === 'rise') { pose = this.k < 24 ? 'kneel' : 'crouch'; expr = 'wince'; }
    else if (this.st === 'crouch') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'land') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'script') {
      const p = this.spose;
      if (p === 'bow') want.bow = 1; else if (p === 'yoi') want.yoi = 1; else if (p === 'seiza') want.seiza = 1; else if (p === 'cross') want.cross = 1; else if (p === 'point') want.point = 1; else if (p === 'nod') want.nod = 1;
      else if (p === 'win') { pose = 'cheer'; expr = 'shout'; } else if (p === 'lose') { pose = 'kneel'; expr = 'wince'; } else if (p === 'kneel') pose = 'kneel';
      else if (p === 'cheer') { pose = 'cheer'; expr = 'smile'; } else if (p === 'hips') pose = 'hips'; else if (p === 'wave') pose = 'wave';
      else if (p === 'kamae' || p === null) stance = 'guard';
      else if (p === 'breathe') { want.yoi = 1; expr = 'angry'; }
      else if (p === 'trampled') { down = 1; expr = 'wince'; }
      else if (p === 'dizzy') { hurt = true; expr = 'wince'; }
      if (p === 'chop') attack = this.chop || null;
      if (this.walkTo !== null) stance = 'guard';
    } else { stance = 'guard'; }
    KC.poseStep(rig, dt, want);
    // the pivot: the facing turns over a few frames when it changes (a spin adds to it, toward the camera)
    const tgt = base;
    let dA = ((tgt - this.faceAng + PI * 3) % TAU) - PI; this.faceAng += clamp(dA, -dt * 26, dt * 26);
    if (Math.abs(dA) < 1e-3) this.faceAng = tgt;
    const facing = this.faceAng + spin * this.face;
    rig.update(dt, { x: this.x, y: 0, z: this.z, vx: this.st === 'walk' || (this.st === 'script' && this.walkTo !== null) ? this.vx : 0, vy: 0, facing, attack, pose, flip: flip || undefined, air, expr, stance, hurt, down });
  }
  /** draw it: the rig (with its beard), a flash on a fresh hit, an afterimage on somersaults */
  draw(r, o = {}) {
    const rig = this.rig, ghost = this.st === 'tech' && this.T && (this.T.flip || this.T.spin) && this.phase !== 'recover' ? { color: this.side ? '#ff8a7a' : '#e8f0ff', life: .16, alpha: .35, owner: this } : undefined;
    r.actor(this.x, o.y || 0, this.z, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (rig.kcBeard) KC.drawBeard(g, rig, r, rig.kcBeard, ox, oy); }, { flash: o.flash, flashMix: .7, ghost, key: this });
    if (!this.airborne) r.shadow(this.x, o.y || 0, this.w * .8, .35);
  }
};

// ---- src/31-bout.js ----
/* =====================================================================================================================
 * REFEREE and BOUT. Judge Genkotsu stands upstage between the fighters, calls every exchange (a gibberish voice with a
 * subtitle), signals with his arms; two corner judges hold a red and a white flag for the decision (hantei).
 * KC.Bout is the match: the phase machine below, scoring, the aiuchi window, its own hit-stop and the event bus that the
 * HUD, sound, crowd, story and netcode listen to. Deterministic: no Math.random (its judges draw from E.rng(seed)).
 * ===================================================================================================================== */
KC.Referee = class {
  constructor(o = {}) {
    this.rig = KC.makeOfficial(2.1); this.x = 200; this.tx = 200; this.y = -18; this.sig = null; this.sigT = 0; this.side = 1; this.bowT = 0;
    this.banners = []; this.off = !!o.off;
    this.judges = [-1, 1].map(s => ({ s, x: s < 0 ? 36 : 364, rig: KC.makeOfficial(1.75, { colors: { cloth: '#2a3a6a', coat: '#2a3a6a' } }), flag: 0, vote: 0, wave: 0 }));
  }
  /** say a call: its subtitle banner and the referee's voice; returns its seconds */
  call(id, o = {}) {
    const text = o.text || KC.call(id), dur = KC.Voice ? KC.Voice.call(id, text) : .6;
    this.banners.push({ text, t: 0, dur: Math.max(.9, o.dur || dur + .5), big: o.big !== false, color: o.color || null, sub: o.sub || null });
    if (this.banners.length > 2) this.banners.shift();
    return dur;
  }
  /** an arm signal ('hajime', 'yame', 'half', 'full', 'aiuchi', 'whistle', 'point', 'winner', 'nopoint') toward side (0 white, 1 red) */
  signal(sig, side = 0, dur = 1) { this.sig = sig; this.side = side === 0 ? 1 : -1; this.sigT = dur; }
  bow(t = .9) { this.bowT = t; }
  /** each judge's flag: vote 1 (white), -1 (red) or 0 (down) */
  flags(i, vote) { const j = this.judges[i]; if (j) { j.vote = vote; j.wave = 1; } }
  clearFlags() { for (const j of this.judges) j.vote = 0; }
  update(dt, fighters) {
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    if ((this.sigT -= dt) <= 0) this.sig = null;
    this.bowT -= dt;
    if (fighters && fighters.length === 2) this.tx = clamp((fighters[0].x + fighters[1].x) / 2, 60, 340);
    this.x = approach(this.x, this.tx, 60 * dt);
    KC.poseStep(this.rig, dt, { sig: this.sig, side: this.side, bow: this.bowT > 0 ? 1 : 0 });
    this.rig.update(dt, { x: this.x, y: this.y, z: 0, vx: Math.abs(this.tx - this.x) > 2 ? 40 : 0, vy: 0, facing: PI / 2 });
    for (const j of this.judges) {
      j.wave = Math.max(0, j.wave - dt * 1.5);
      KC.poseStep(j.rig, dt, { flag: 1, flagSide: j.vote === 1 ? 1 : j.vote === -1 ? -1 : 0, seiza: 0 });
      j.rig.update(dt, { x: j.x, y: -34, z: 0, vx: 0, vy: 0, facing: PI / 2 });
    }
  }
  draw(r) {
    if (this.off) return;
    r.actor(this.x, this.y, 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this });
    r.shadow(this.x, this.y, 12, .3);
    for (const j of this.judges) {
      r.actor(j.x, -34, 0, (g, ox, oy) => j.rig.draw(g, ox, oy, r.view), { key: j });
      // the flags: a short pole in each hand, red in the left, white in the right; the raised one waves
      for (const s of [-1, 1]) r.queue(j.x, -33, 40, g => {
        const h = j.rig.hand(s > 0 ? 'R' : 'L'), p = r.w(h[0], h[1], h[2]), up = j.vote === s, sc = r.view.scale;
        const x = Math.round(p[0]), y = Math.round(p[1]), L = Math.round((up ? 11 : 7) * sc), c = s > 0 ? '#f4f2ee' : '#d8302a';
        if (up) { px.rect(g, x, y - L, 1, L, '#5a3a2a'); const wv = Math.round(Math.sin(r.view && (KC.game ? KC.game.real : 0) * 12) * j.wave * 2); px.poly(g, [[x + 1, y - L], [x + 1 + Math.round(8 * sc), y - L + 1 + wv], [x + 1 + Math.round(8 * sc), y - L + Math.round(5 * sc) + wv], [x + 1, y - L + Math.round(6 * sc)]], c); }
        else { px.rect(g, x, y - 2, 1, L, '#5a3a2a'); px.rect(g, x + 1, y + 1, Math.round(3 * sc), Math.round(6 * sc), c); }
      }, { bias: 2 });
    }
  }
  /** the call banners, centre screen (in r.overlay) */
  drawBanner(g, W, H) {
    let y = Math.round(H * .3);
    for (const b of this.banners) {
      const a = b.t < .12 ? b.t / .12 : 1, sc = b.big ? 3 : 2, pop = b.t < .12 ? 1 + (1 - a) * .6 : 1;
      E.font.title(g, b.text, Math.round(W / 2), y - Math.round((pop - 1) * 10), { scale: Math.round(sc * pop) || sc, align: 'center', colors: b.color || ['#fff6d0', '#ffd060', '#e8782a'], depth: 2, outline: '#1a0c08' });
      if (b.sub) E.font.text(g, b.sub, Math.round(W / 2), y + 8 * sc + 6, '#fff6e8', { align: 'center', shadow: '#000', outline: false, scale: 1 });
      y += 9 * sc + (b.sub ? 18 : 8);
    }
  }
};

/* ---- THE BOUT ---- */
const PH = { intro: 1.2, rei: .9, card: .9, ready: .4, hajime: .6, yame: .9, award: 1.2, reset: 1.2, roundEnd: 2.0, time: .8, hantei: 2.4, matchEnd: 2.5 };
KC.Bout = class {
  /** new KC.Bout({ fighters: [white, red], referee, seed, rules: { pointsToWin, roundsToWin, clock, intro }, mode, onMatchEnd(winner, bout) }) */
  constructor(o) {
    this.o = o; this.f = o.fighters; this.ref = o.referee || new KC.Referee(); this.bus = o.bus || new KC.Bus(); this.mode = o.mode || 'versus';
    for (const f of this.f) f.bus = this.bus;
    this.seed = o.seed || 1; this.rules = Object.assign({}, o.rules || {});
    this.points = [0, 0]; this.roundWins = [0, 0]; this.round = 1; this.score = [0, 0]; this.conceded = [0, 0];
    this.phase = 'intro'; this.t = 0; this.clock = this.R('clock'); this.freeze = 0; this.pending = null; this.lastPoint = null; this.lastCall = null; this.winner = -1;
    this.roundStats = [this._rs(), this._rs()]; this.lastScorer = -1; this.fightT = 0; this.matchOver = false; this.hantei = null; this.skip = false; this.log = [];
    this.judgeRng = [KC.rng(this.seed * 31 + 1), KC.rng(this.seed * 31 + 2), KC.rng(this.seed * 31 + 3)];
    this.bus.on('*', (k, d) => { if (k === 'call') this.lastCall = d.id; });
    if (this.rules.intro === false) this._go('rei'); else this._enter('intro');
  }
  _rs() { return { pts: 0, attempts: 0, blocks: 0 }; }
  /** a rule: the bout's own, else the live tuning */
  R(k) { return this.rules[k] !== undefined ? this.rules[k] : KC.TUNE[k]; }
  dur(ph) { return PH[ph] * KC.TUNE.refPace; }
  call(id, o) { const d = this.ref.call(id, o); this.bus.emit('call', { id, text: KC.call(id) }); return d; }
  _go(ph) { this.phase = ph; this.t = 0; this._enter(ph); this.bus.emit('phase', { phase: ph }); }
  _enter(ph) {
    const [a, b] = this.f, M = KC.ARENA.marks;
    if (ph === 'intro') { a.x = 40; b.x = 360; a.script('kamae', M[0]); b.script('kamae', M[1]); this.ref.x = 200; }
    else if (ph === 'rei') { for (const f of this.f) f.script('bow', M[f.side]); this.ref.bow(); this.call('bow', { big: false }); }
    else if (ph === 'card') {
      const last = this.roundWins[0] === this.R('roundsToWin') - 1 && this.roundWins[1] === this.R('roundsToWin') - 1 && this.R('roundsToWin') > 1;
      this.cardText = last ? KC.call('decide') : 'ROUND ' + this.round; for (const f of this.f) f.script('yoi', M[f.side]); this.bus.emit('card', { round: this.round, last });
    } else if (ph === 'ready') { for (const f of this.f) f.script('kamae', null); this.ref.clearFlags(); }
    else if (ph === 'hajime') { this.call('begin'); this.ref.signal('hajime', 0, .6); this.released = false; }
    else if (ph === 'fight') { this.fightT = 0; }
    else if (ph === 'yame') { this.ref.signal('yame', 0, .9); this.call('stop'); }
    else if (ph === 'award') this._award();
    else if (ph === 'reset') { for (const f of this.f) { f.hold = false; f.script('kamae', M[f.side], 2); } this.ref.tx = 200; }
    else if (ph === 'resetRound') { for (const f of this.f) { f.hold = false; f.script('kamae', M[f.side], 1.6); } this.ref.tx = 200; this.att0 = this.f.map(f => f.stats.attempts); }
    else if (ph === 'time') { this.call('time'); for (const f of this.f) f.script('kamae', null); }
    else if (ph === 'hantei') this._hantei();
    else if (ph === 'roundEnd') this._roundEnd();
    else if (ph === 'matchEnd') { for (const f of this.f) f.script('bow', M[f.side]); this.ref.bow(1); this.mEndT = 0; }
  }
  /** one step: the fighters (unless the bout's hit-stop holds them), then the phase */
  update(dt) {
    this.t += dt;
    if (this.freeze > 0) { this.freeze -= dt; this.ref.update(dt, this.f); return; }
    const [a, b] = this.f;
    a.update(dt, b); b.update(dt, a);
    KC.Bout.push(a, b);
    for (const f of this.f) f.pose(dt);
    this.ref.update(dt, this.phase === 'fight' || this.phase === 'yame' ? this.f : null);
    const ph = this.phase, t = this.t, D = this.dur(ph);
    if (ph === 'intro' && t >= D) this._go('rei');
    else if (ph === 'rei' && t >= D) this._go('card');
    else if (ph === 'card' && t >= D) this._go('ready');
    else if (ph === 'ready' && t >= D) this._go('hajime');
    else if (ph === 'hajime') { if (!this.released && t >= .35 * KC.TUNE.refPace) { this.released = true; for (const f of this.f) { f.release(this.f[1 - f.side]); f.ctlOn = true; } } if (t >= D) this._go('fight'); }
    else if (ph === 'fight') this._fight(dt);
    else if (ph === 'yame' && t >= D) this._go('award');
    else if (ph === 'award' && (t >= D || (this.skip && t >= .6))) { this.skip = false; this._afterAward(); }
    else if (ph === 'reset') { const M = KC.ARENA.marks, there = this.f.every(f => f.st === 'script' && f.walkTo === null && Math.abs(f.x - M[f.side]) < 2); if (there || t >= D * 2) this._go('ready'); }
    else if (ph === 'time' && t >= D) { if (this.points[0] !== this.points[1]) this._go('roundEnd'); else this._go('hantei'); }
    else if (ph === 'hantei') this._hanteiStep(t);
    else if (ph === 'roundEnd' && t >= D) { const w = this.roundWinner; if (this.roundWins[w] >= this.R('roundsToWin')) this._go('matchEnd'); else { this.round++; this.points = [0, 0]; this.roundStats = [this._rs(), this._rs()]; this.clock = this.R('clock'); this._go('resetRound'); } }
    else if (ph === 'resetRound') { if ((this.f.every(f => f.st === 'script' && f.walkTo === null) && t > .3) || t > 2.5) this._go('card'); }
    else if (ph === 'matchEnd') {
      if (t >= D * .4 && !this._raised) { this._raised = true; this.ref.signal('winner', this.winner, 3); this.call(this.winner === 0 ? 'whiteWins' : 'redWins', { big: false }); }
      if (t >= D && !this.matchOver) { this.matchOver = true; this.phase = 'over'; this.bus.emit('matchEnd', { winner: this.winner, bout: this }); if (this.o.onMatchEnd) this.o.onMatchEnd(this.winner, this); }
    }
  }
  _fight(dt) {
    const [a, b] = this.f;
    this.fightT += dt;
    if (!(KC.DEV && KC.DEV.infiniteTime)) this.clock = Math.max(0, this.clock - dt);
    if (this.fightT > this.R('clock') + 5 && !(KC.DEV && KC.DEV.infiniteTime) && !this._softWarned) { this._softWarned = true; if (KC.game) KC.game.fail('bout soft-lock', new Error('the fight phase ran past its clock')); }
    // strikes: blocks first, then hits (a hit opens the aiuchi window: 6 steps in which the other may land too)
    for (const [p, q] of [[a, b], [b, a]]) {
      const s = p.strike(q); if (!s) continue;
      if (q.blocks(p)) { p.recoil(); q.guarded(p); this.roundStats[q.side].blocks++; this.freeze = .05; this.bus.emit('block', { side: q.side, by: p.side, tech: p.tech, x: (p.x + q.x) / 2, z: p.z + p.h * .6 }); continue; }
      if (KC.DEV && KC.DEV.invincible && q.side === 0 && this.mode !== 'online') { p.resolved = true; this.bus.emit('whiff', { side: p.side, tech: p.tech, invincible: true }); continue; }
      p.resolved = true;
      if (!this.pending) this.pending = { first: p.side, hits: [], t: 0 };
      this.pending.hits.push(this._score(p, q, s));
    }
    for (const f of this.f) if (f.st === 'tech' && !f.resolved && f.phase === 'recover' && f.T.scoring && !f._whiffed) { f._whiffed = true; this.bus.emit('whiff', { side: f.side, tech: f.tech }); }
    for (const f of this.f) if (f.st !== 'tech' || f.phase !== 'recover') f._whiffed = false;
    if (this.pending) {
      const P = this.pending;
      if (++P.t >= 6 || P.hits.length === 2) {
        this.pending = null;
        for (const f of this.f) f.ctlOn = false;
        if (P.hits.length === 2) { this.award = { aiuchi: true }; this.bus.emit('aiuchi', {}); for (const h of P.hits) this.f[1 - h.side].hit('hurt', this.f[h.side].x); }
        else {
          const h = P.hits[0], att = this.f[h.side], def = this.f[1 - h.side];
          this.award = h; att.hold = true; def.hit(h.full || KC.TECH[h.tech].knockdown ? 'down' : 'hurt', att.x);
          this.bus.emit('point', Object.assign({ x: (att.x + def.x) / 2 + att.face * 6, z: att.z + att.h * (KC.TECH[h.tech].height === 'low' ? .15 : KC.TECH[h.tech].height === 'mid' ? .5 : .78) }, h));
        }
        this.freeze = KC.TUNE.hitstop;
        this._go('yame');
      }
      return;
    }
    if (this.clock <= 0) { for (const f of this.f) f.ctlOn = false; this._go('time'); }
  }
  /** the points a clean (or sloppy) technique scores: quality from timing and spacing, x2 on a counter */
  _score(p, q, s) {
    const t = KC.TECH[s.tech], sig = p.F.signature === t.id ? .1 : 0, air = t.height === 'rising' && (s.prof === 'air' || s.prof === 'flip') ? .25 : 0;
    const qual = clamp(.5 * s.timingQ + .5 * s.spacingQ + sig + air, .15, 1);
    let pts = KC.Bout.points(t, qual);
    const counter = q.countering || (q.st === 'tech' && q.blockedBy);
    if (counter) pts = Math.min(1000, Math.round(pts * KC.TUNE.counterMul / 100) * 100);
    const full = pts >= KC.TUNE.fullAt;
    return { side: p.side, tech: t.id, pts, full, counter, q: qual, timingQ: s.timingQ, spacingQ: s.spacingQ, gap: Math.round(s.gap) };
  }
  static points(t, q) { const [lo, hi] = t.pts; return clamp(lo + Math.round((hi - lo) * q / 100) * 100, lo, hi); }
  _award() {
    const A = this.award;
    if (!A || A.aiuchi) { this.call('aiuchi', { big: true, sub: KC.call('nopoint') }); this.ref.signal('aiuchi', 0, 1.1); this.lastPoint = { aiuchi: true }; return; }
    const s = A.side, add = A.full ? 1 : .5;
    this.points[s] = Math.min(this.R('pointsToWin'), this.points[s] + add); this.conceded[1 - s] += add;
    this.score[s] += A.pts; this.roundStats[s].pts += A.pts; this.lastScorer = s; this.lastPoint = A;
    const f = this.f[s]; if (A.full) f.stats.full++; else f.stats.half++;
    if (A.pts > f.stats.bestPts) { f.stats.bestPts = A.pts; f.stats.best = A.tech; }
    this.call(s === 0 ? 'white' : 'red', { big: true, sub: KC.call(A.full ? 'full' : 'half') + (A.counter ? '  COUNTER!' : '') });
    this.ref.signal(A.full ? 'full' : 'half', s, 1.2);
    this.log.push({ round: this.round, side: s, tech: A.tech, pts: A.pts, full: A.full, counter: A.counter });
    this.bus.emit('award', A);
  }
  _afterAward() {
    for (const f of this.f) f.stay = false;
    const w = this.points[0] >= this.R('pointsToWin') ? 0 : this.points[1] >= this.R('pointsToWin') ? 1 : -1;
    if (w >= 0) { this.roundWinner = w; this._go('roundEnd'); return; }
    const mp = this.points.findIndex(p => p >= this.R('pointsToWin') - .5 && p > 0);
    if (mp >= 0 && this.lastPoint && !this.lastPoint.aiuchi && this.lastPoint.side === mp && this.R('pointsToWin') > .5) this.call('matchPoint', { big: false });
    this._go('reset');
  }
  _hantei() {
    this.call('judges', { big: true }); this.ref.signal('whistle', 0, .8); this.bus.emit('whistle', {});
    // each judge: technique points + 60 per attempt in range + 40 per block + its own noise (+-120); a tie: the side that scored last, then white
    const S = this.roundStats, a0 = this.att0 || [0, 0], att = this.f.map((f, i) => f.stats.attempts - a0[i]);
    const votes = this.judgeRng.map(R => { const n = () => (R() * 2 - 1) * 120, w = S[0].pts + 60 * att[0] + 40 * S[0].blocks + n(), r = S[1].pts + 60 * att[1] + 40 * S[1].blocks + n(); return w > r ? 0 : r > w ? 1 : this.lastScorer >= 0 ? this.lastScorer : 0; });
    const white = votes.filter(v => v === 0).length;
    this.hantei = { votes, winner: white >= 2 ? 0 : 1, shown: 0 };
  }
  _hanteiStep(t) {
    const H = this.hantei, P = KC.TUNE.refPace;
    for (let i = H.shown; i < 3 && t >= (.6 + i * .5) * P; i++) {
      H.shown = i + 1; const v = H.votes[i];
      if (i < 2) this.ref.flags(i, v === 0 ? 1 : -1); else this.ref.signal('point', v, 1.4);
      this.bus.emit('flag', { judge: i, vote: v });
    }
    if (t >= this.dur('hantei')) { this.roundWinner = H.winner; this._go('roundEnd'); }
  }
  _roundEnd() {
    const w = this.roundWinner === undefined ? (this.points[0] >= this.points[1] ? 0 : 1) : this.roundWinner;
    this.roundWinner = w; this.roundWins[w]++; this.winner = w;
    const bonus = Math.floor(Math.max(0, this.clock)) * 100; this.score[w] += bonus; this.timeBonus = bonus;
    this.call(w === 0 ? 'whiteWins' : 'redWins');
    this.f[w].script('win', null); this.f[1 - w].script('lose', null);
    if (this.roundWins[w] >= this.R('roundsToWin') && this.conceded[w] === 0 && this.mode === 'story') { this.score[w] += 5000; this.perfect = true; }
    this.bus.emit('roundEnd', { winner: w, bonus, perfect: !!this.perfect && this.roundWins[w] >= this.R('roundsToWin') });
    this.roundWinner = w;
  }
  /** end the bout at once (a forfeit online, a dev command): side w wins */
  forceWin(w, why = 'forfeit') {
    this.roundWins[w] = this.R('roundsToWin'); this.winner = w; this.roundWinner = w; this.call(why === 'forfeit' ? 'forfeit' : w === 0 ? 'whiteWins' : 'redWins');
    for (const f of this.f) f.ctlOn = false; this.f[w].script('win', null); this.f[1 - w].script('lose', null); this.pending = null; this.freeze = 0;
    this._go('matchEnd'); this.t = this.dur('matchEnd') * .4;
  }
  /** push boxes never overlap (a shared correction; the walls keep their own); a somersault flies over */
  static push(a, b) {
    const flying = f => f.st === 'tech' && f.T && f.T.flip && f.airborne;
    if (flying(a) || flying(b)) return;
    if (a.z > b.z + b.h * .8 || b.z > a.z + a.h * .8) return;
    const need = (a.w + b.w) / 2, dx = b.x - a.x;
    if (Math.abs(dx) >= need) return;
    const d = (need - Math.abs(dx)) * (dx > 0 ? 1 : dx < 0 ? -1 : (a.side === 0 ? 1 : -1)) / 2;
    a.x -= d; b.x += d;
    for (const [P, Q] of [[a, b], [b, a]]) { const h = P.w / 2; if (P.x - h < P.x0) { const k = P.x0 + h - P.x; P.x += k; Q.x += k; } if (P.x + h > P.x1) { const k = P.x + h - P.x1; P.x -= k; Q.x -= k; } }
  }
};

// ---- src/33-ai.js ----
/* =====================================================================================================================
 * CPU: KC.KarateAI produces the same control intent a player does ({ posture, press } in screen directions), so it obeys
 * every rule a player obeys. It sees the foe's technique only after its reaction delay, decides on its own think tick,
 * punishes recoveries, reads techniques (jump the lows, duck the highs, block the mids), walks to its favourite range and
 * throws its personality's techniques. Levels 1-10. Deterministic: all its randomness is its own E.rng(seed).
 * The same class is the Autopilot (tests, the attract mode's showcase).
 * ===================================================================================================================== */
KC.KarateAI = class {
  /** new KC.KarateAI({ fid, level: 1..10, difficulty: 'Normal', seed, showcase }) */
  constructor(o = {}) {
    this.fid = o.fid || 'taro'; this.P = Object.assign({ aggression: .5, patience: .3, jump: .1, block: .3, gap: 36, crouch: .1, weights: { frontKick: 1 } }, (KC.FIGHTER[this.fid] || KC.FIGHTER.taro).ai, o.personality || {});
    this.rng = KC.rng(o.seed || 7); this.showcase = !!o.showcase; this.obs = []; this.timer = .4; this.hold = null; this.queued = null; this.seen = -1; this.habit = {}; this.thought = 'WAIT';
    this.difficulty = o.difficulty || 'Normal'; this.baseLevel = o.level || this.P.level || 5; this.setLevel(this.baseLevel); this.showIdx = 0; this.techSeq = 0; this.lastFoeTech = null;
  }
  setLevel(L) {
    let lv = L, rk = 1;
    if (this.difficulty === 'Easy') { lv = Math.max(1, L - 2); rk = 1.25; } else if (this.difficulty === 'Hard') { lv = Math.min(10, L + 1); rk = .85; }
    this.level = lv; const u = (lv - 1) / 9;
    this.react = lerp(.42, .09, u) * rk; this.think = lerp(.62, .3, u); this.readP = Math.min(.98, lerp(.25, .92, u) + (this.P.readBonus || 0)); this.mistake = lerp(.3, .02, u);
    if (this.showcase) { this.react = .1; this.readP = 1; this.mistake = 0; this.think = .2; }
  }
  get aggression() { return KC.TUNE.cpuAggression >= 0 ? KC.TUNE.cpuAggression : this.P.aggression; }
  // the control intent that performs technique id now (its cell in the matrix, toward the foe)
  _intent(me, id) {
    if (id === 'jump') return { posture: 'u', press: null };
    if (id === 'crouch') return { posture: 'd', press: null };
    const c = KC.cellOf(id); if (!c) return { posture: 'n', press: null };
    return { posture: KC.scrDir(c[0], me.face), press: KC.scrDir(c[1], me.face) };
  }
  _inBand(me, foe, id, slack = 0) { const t = KC.TECH[id], g = me.gapTo(foe), b = me.band(t); return g >= b[0] - 4 - slack && g <= b[1] + slack; }
  _pickWeighted(list) { let tot = 0; for (const [, w] of list) tot += w; let r = this.rng() * tot; for (const [id, w] of list) { if ((r -= w) <= 0) return id; } return list.length ? list[list.length - 1][0] : null; }
  /** one step: watch the foe, then the intent for this step */
  intent(me, foe, dt) {
    const T = KC.TUNE, reactSteps = Math.round(this.react * T.cpuReact * 120);
    // perception: the foe as it was reactSteps ago
    if (foe.st === 'tech' && (foe.tech !== this.lastFoeTech || foe.k < this._lastK)) { this.techSeq++; if (KC.TECH[foe.tech].scoring && this.P.habit) this.habit[foe.tech] = (this.habit[foe.tech] || 0) + 1; }
    this.lastFoeTech = foe.st === 'tech' ? foe.tech : null; this._lastK = foe.k;
    this.obs.push({ tech: foe.st === 'tech' ? foe.tech : null, phase: foe.phase, k: foe.k, fr: foe.fr.slice(), air: foe.airborne, vz: foe.vz, prof: foe.profile(), st: foe.st, recoil: foe.blockedBy, seq: this.techSeq });
    if (this.obs.length > 160) this.obs.shift();
    const o = this.obs[Math.max(0, this.obs.length - 1 - reactSteps)];
    if (!me.ctlOn) { this.hold = null; this.queued = null; return { posture: 'n', press: null }; }
    if (KC.DEV && KC.DEV.freezeCpu && me.side === 1) return { posture: 'n', press: null };
    this.timer -= dt;
    // a queued action (a block timed to the foe's strike)
    if (this.queued && (this.queued.at -= dt) <= 0 && me.free) { const q = this.queued; this.queued = null; this.hold = q.hold || null; return this._out(me, q.intent); }
    const holdP = this.hold && (this.hold.t -= dt) > 0 ? this.hold.posture : (this.hold = null, 'n');
    if (!me.free) return { posture: holdP === 'd' && me.st === 'crouch' ? 'd' : 'n', press: null };
    const gap = me.gapTo(foe);
    // 1. punish: the foe is recovering (or recoiling from a block) and a technique reaches it in time
    if (o.st === 'tech' && o.tech && KC.TECH[o.tech].scoring && (o.phase === 'recover' || o.recoil) && foe.st === 'tech') {
      const left = (foe.fr[0] + foe.fr[1] + foe.fr[2] + foe.extra) - foe.k;
      const opts = KC.SCORING.filter(id => this._inBand(me, foe, id) && me.frames(KC.TECH[id])[0] < left + 4 && KC.Karateka.heightOK(KC.Karateka.heightOf(KC.TECH[id]), foe.profile(), foe));
      if (opts.length && this.rng() < .5 + this.readP * .5) { opts.sort((a, b) => KC.TECH[b].pts[1] - KC.TECH[a].pts[1]); const id = this.rng() < .7 ? opts[0] : opts[Math.floor(this.rng() * opts.length)]; this.thought = 'PUNISH ' + id; return this._out(me, this._intent(me, id)); }
    }
    // 2. react to a technique it has seen start (once each), with its read chance
    if (o.st === 'tech' && o.tech && KC.TECH[o.tech].scoring && o.phase === 'wind' && o.seq !== this.seen) {
      this.seen = o.seq;
      if (this.rng() < this.readP) {
        const t = KC.TECH[o.tech], H = KC.Karateka.heightOf(t), toActive = Math.max(0, (o.fr[0] - o.k) - reactSteps), willReach = gap <= foe.band(t)[1] + 6;
        if (willReach) {
          let id = null;
          if (H === 'low') id = this.rng() < this.aggression * .2 && this._inBand(me, foe, 'jumpSide') ? 'jumpSide' : this.rng() < .25 ? 'frontFlip' : 'jump';
          else if (H === 'high' || H === 'rising') id = this._inBand(me, foe, 'squatPunch') && this.rng() < .45 ? 'squatPunch' : 'crouch';
          else if (H === 'air') id = gap < 30 && this.rng() < .5 ? 'upperPunch' : 'block';
          else id = this.rng() < this.P.block + .25 ? 'block' : gap > 24 && this.rng() < .5 ? 'backFlip' : 'backRoll';
          this.thought = 'READ ' + o.tech + ': ' + id;
          if (id === 'block') { this.queued = { at: Math.max(0, (toActive - 18) / 120), intent: this._intent(me, 'block') }; return { posture: 'n', press: null }; }
          if (id === 'crouch') { this.hold = { posture: 'd', t: (o.fr[0] + o.fr[1] + 10 - o.k) / 120 }; return { posture: 'd', press: null }; }
          return this._out(me, this._intent(me, id));
        }
      }
    }
    // airborne foe coming in: an anti-air upper punch, or step back
    if (o.air && foe.airborne && foe.vz > 0 && Math.sign(foe.x - me.x) === me.face && this.rng() < this.readP * .15) {
      if (gap < 30) { this.thought = 'ANTI-AIR'; return this._out(me, this._intent(me, 'upperPunch')); }
    }
    if (this.timer > 0) return { posture: holdP, press: null };
    this.timer = this.think * (.7 + this.rng() * .6);
    return this._decide(me, foe, gap);
  }
  _out(me, it) { return { posture: it.posture, press: it.press }; }
  // 3. proactive: the showcase's list, mistakes, a habit's counter, then spacing and the personality's techniques
  _decide(me, foe, gap) {
    if (this.showcase) {
      const id = KC.SCORING[this.showIdx % KC.SCORING.length], b = me.band(KC.TECH[id]), want = b[1] - Math.max(4, (b[1] - b[0]) * .2);
      if (Math.abs(gap - want) < Math.max(6, (b[1] - b[0]) * .25)) { this.showIdx++; this.thought = 'SHOW ' + id; return this._out(me, this._intent(me, id)); }
      this.hold = { posture: KC.scrDir(gap > want ? 'f' : 'b', me.face), t: .12 }; this.thought = 'SPACE FOR ' + id; return { posture: this.hold.posture, press: null };
    }
    if (this.rng() < this.mistake) { const id = KC.SCORING[Math.floor(this.rng() * KC.SCORING.length)]; this.thought = 'MISTAKE ' + id; return this._out(me, this._intent(me, id)); }
    if (this.P.habit && this.level >= 8) {   // the foe's favourite technique this match: stand ready for it (a crouch under a round kick, a jump over a sweep)
      const top = Object.entries(this.habit).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 3 && this.rng() < .25) { const H = KC.Karateka.heightOf(KC.TECH[top[0]]); if (H === 'high') { this.hold = { posture: 'd', t: .35 }; this.thought = 'HABIT: DUCK ' + top[0]; return { posture: 'd', press: null }; } }
    }
    const W = this.P.weights, inRange = Object.keys(W).filter(id => this._inBand(me, foe, id) && KC.Karateka.heightOK(KC.Karateka.heightOf(KC.TECH[id]), foe.profile() || 'stand', foe)).map(id => [id, W[id]]);
    // the foe just whiffed or stands still in range: a better moment to commit
    const open = foe.st === 'tech' && foe.phase === 'recover' ? .35 : 0;
    if (inRange.length && this.rng() < this.aggression * .22 + open) { const id = this._pickWeighted(inRange); this.thought = 'ATTACK ' + id; return this._out(me, this._intent(me, id)); }
    if (this.rng() < this.P.jump * .15 && this._inBand(me, foe, 'jumpSide')) { this.thought = 'JUMP IN'; return this._out(me, this._intent(me, 'jumpSide')); }
    // the foe could reach it from here: step back out of range (the spacing game), or guard
    const threat = Object.keys(KC.FIGHTER[foe.fid].ai.weights).some(id => { const b = foe.band(KC.TECH[id]); return gap >= b[0] - 4 && gap <= b[1]; });
    if (threat && this.rng() < .25 + this.P.patience * .5) {
      const r = this.rng();
      if (r < this.P.block * .6) { this.thought = 'GUARD'; return this._out(me, this._intent(me, 'block')); }
      this.hold = { posture: KC.scrDir('b', me.face), t: .18 + this.rng() * .3 }; this.thought = 'OUT OF RANGE'; return { posture: this.hold.posture, press: null };
    }
    // hover at its favourite range, or just outside the foe's (in and out: the dance before the strike)
    const foeMax = Math.max(...Object.keys(KC.FIGHTER[foe.fid].ai.weights).map(id => foe.band(KC.TECH[id])[1]));
    const want = (this.rng() < this.P.patience ? Math.max(this.P.gap, foeMax + 6) : this.P.gap) + (this.rng() - .5) * 16;
    if (gap > want + 8) { this.hold = { posture: KC.scrDir('f', me.face), t: this.think * (.6 + this.rng()) }; this.thought = 'CLOSE IN'; }
    else if (gap < want - 10) { this.hold = { posture: KC.scrDir('b', me.face), t: this.think * (.5 + this.rng() * .6) }; this.thought = 'BACK OFF'; }
    else if (this.rng() < this.P.crouch) { this.hold = { posture: 'd', t: .3 + this.rng() * .4 }; this.thought = 'CROUCH'; }
    else if (this.rng() < this.P.patience) { this.hold = { posture: KC.scrDir(this.rng() < .5 ? 'f' : 'b', me.face), t: .12 + this.rng() * .15 }; this.thought = 'FEINT'; }
    else { this.hold = null; this.thought = 'WAIT'; }
    return { posture: this.hold ? this.hold.posture : 'n', press: null };
  }
};

// ---- src/34-hud.js ----
/* =====================================================================================================================
 * FIGHT HUD: the clock (top centre), each side's name, belt and point slots (a half point half-fills a circle, a full
 * point fills it), round pips, the scores, the referee's calls, hints, the input display and the DEV badge. Information is
 * never colour alone: the sides are labelled WHITE and RED, half and full differ in shape.
 * ===================================================================================================================== */
KC.HUD = {
  /** draw the fight HUD for bout b in r.overlay; o: { names, belts, tags, hint, hi, score, inputs: [f, ...], dev } */
  draw(r, b, o = {}) {
    r.overlay(g => {
      const W = r.W, H = r.H, ca = KC.game.cornerArea && KC.game.cornerArea(), cornerH = ca && ca.x0 < W - 4 ? Math.ceil(ca.y1) + 2 : 0;
      // the clock
      const c = Math.ceil(Math.max(0, b.clock)), cs = String(c).padStart(2, '0'), low = c <= 5 && b.phase === 'fight';
      E.ui.box(g, Math.round(W / 2) - 20, 4, 40, 26, { bg: ['#1a1430', '#0a0818'], border: low && Math.floor(KC.game.real * 4) % 2 ? '#ff5a4a' : '#e8d8b0' });
      E.font.title(g, KC.DEV && KC.DEV.infiniteTime ? '--' : cs, Math.round(W / 2), 8, { scale: 2, align: 'center', colors: low ? ['#ffd0c0', '#ff5a4a'] : ['#fff6d0', '#ffd060', '#e8782a'] });
      // each side: label, name, belt, point slots, round pips
      for (const s of [0, 1]) {
        const right = s === 1, f = b.f[s], x = right ? W - 8 : 8, y = right ? 4 + cornerH : 4, al = right ? 'right' : 'left';
        const sideCol = s === 0 ? '#fff6e8' : '#ff5a4a';
        E.font.text(g, s === 0 ? 'WHITE' : 'RED', x, y, sideCol, { align: al, outline: '#1a0c08' });
        const name = (o.names && o.names[s]) || f.F.short, nx = right ? x - E.font.width(s === 0 ? 'WHITE' : 'RED') - 6 : x + E.font.width('WHITE') + 6;
        E.font.text(g, name, nx, y, o.colors && o.colors[s] || '#ffe7a8', { align: al, outline: '#1a0c08' });
        // the belt icon
        const bx = right ? nx - E.font.width(name) - 22 : nx + E.font.width(name) + 6, belt = f.rig.kcRank;
        if (belt && !o.noBelt) { px.rect(g, bx, y + 2, 16, 4, belt.belt); px.rect(g, bx + 6, y + 6, 2, 4, belt.belt); px.rect(g, bx + 9, y + 6, 2, 3, belt.belt); px.rect(g, bx, y + 2, 16, 1, E.shade(belt.belt, .3)); if (belt.stripes) for (let k = 0; k < Math.min(4, Math.ceil(belt.stripes / 2)); k++) px.rect(g, bx + 13 - k * 2, y + 2, 1, 4, '#e8c040'); }
        // point slots
        const n = Math.ceil(b.R('pointsToWin')), pts = b.points[s];
        for (let i = 0; i < n; i++) {
          const cx = right ? x - 8 - i * 18 : x + 8 + i * 18, cy = y + 20, fill = clamp(pts - i, 0, 1);
          px.disc(g, cx, cy, 7, '#0a0818'); px.disc(g, cx, cy, 6, '#3a3048');
          if (fill >= 1) { px.disc(g, cx, cy, 6, s === 0 ? '#f4f0e6' : '#e83a2a'); px.disc(g, cx - 2, cy - 2, 2, '#ffffff'); }
          else if (fill > 0) { px.disc(g, cx, cy, 6, s === 0 ? '#f4f0e6' : '#e83a2a'); px.rect(g, right ? cx - 7 : cx, cy - 7, 8, 15, '#3a3048'); px.rect(g, cx, cy - 6, 1, 13, '#0a0818'); }
        }
        // round pips
        const rw = b.R('roundsToWin');
        if (rw > 1) for (let i = 0; i < rw; i++) { const px0 = right ? x - 4 - i * 9 : x + i * 9, on = b.roundWins[s] > i; px.rect(g, px0, y + 31, 7, 4, on ? '#ffd060' : '#2a2438'); px.rect(g, px0, y + 31, 7, 1, on ? '#fff6c0' : '#4a4058'); }
        if (o.tags && o.tags[s]) E.font.text(g, o.tags[s], right ? x : x, y + 38, '#c8c0e8', { align: al, outline: '#000', font: 'tiny' });
      }
      // the scores
      if (o.score !== undefined) { E.font.text(g, '1P ' + KC.pad(o.score), 8, H - 12, '#fff6e8', { outline: '#000' }); E.font.text(g, 'HI ' + KC.pad(o.hi || 0), W - 8, H - 12, '#ffd060', { align: 'right', outline: '#000' }); }
      // the round card
      if (b.phase === 'card') { const k = clamp(b.t / .2, 0, 1); E.font.title(g, b.cardText, Math.round(W / 2), Math.round(H * .36), { scale: 3, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 }); void k; }
      b.ref.drawBanner(g, W, H);
      // a hint (story's first matches)
      if (o.hint && (b.phase === 'fight' || b.phase === 'ready')) { const w = E.font.width(o.hint) + 14; E.ui.box(g, Math.round((W - w) / 2), H - 34, w, 14, { bg: '#0a0818', border: '#8a7ab0', alpha: .8 }); E.font.text(g, o.hint, Math.round(W / 2), H - 31, '#e8e0ff', { align: 'center', outline: false }); }
      // the input display: each fighter's last presses as posture + technique arrows
      if (o.inputs) o.inputs.forEach((f, i) => { if (!f) return; const L = f.lastInputs.slice(-8), x0 = i === 0 ? 8 : W - 8 - 8 * 22; L.forEach(([p, t], k) => { E.font.text(g, (KC.ARROW[p] || '·') + KC.ARROW[t], x0 + k * 22, H - 26, k === L.length - 1 ? '#ffe08a' : '#a8a0c8', { outline: '#000' }); }); });
      if (KC.tuneChanged() || (KC.DEV && KC.DEV.on && KC.DEV.anyToggle && KC.DEV.anyToggle())) { E.ui.box(g, Math.round(W / 2) - 14, 32, 28, 12, { bg: '#5a1010', border: '#ff8a6a' }); E.font.text(g, 'DEV', Math.round(W / 2), 34, '#ffd0c0', { align: 'center', outline: false }); }
    });
  },
  /** a points popup over the scorer: the technique's name and its points */
  popup(game, d) {
    const t = KC.TECH[d.tech], named = !KC.settings || KC.settings.techNames !== false;
    game.particles.text(d.x, 0, d.z + 26, (named ? t.name + ' ' : '') + d.pts, d.full ? '#ffe070' : '#ffffff', { scale: 1, bounce: false });
    if (d.counter) game.particles.text(d.x, 0, d.z + 38, 'COUNTER x' + KC.TUNE.counterMul, '#ff8a6a', { scale: 1, bounce: false });
  }
};

// ---- src/35-stage.js ----
/* =====================================================================================================================
 * STAGES: the painters. Each stage is a sky (E.Backdrop), custom scenery layers drawn in screen pixels with parallax, a
 * floor painted from the fight line down (side view) or over the floor plane (2.5D), props depth-sorted with the fighters
 * (r.prop, r.shape and our own drawings through r.queue), lights, a crowd and ambient life. The world is painted from
 * x -140 to 540 so a wide screen never shows emptiness. KC.Stage.draw(r, id, t) draws one; KC.Stage.enter(id) lights it.
 * ===================================================================================================================== */
const SPR = (rows, pal, s = 1) => E.sprite(rows, pal, s);
KC.SPRITES = {
  ku: SPR(['.....#......', '.##########.', '.#........#.', '.#..#..#..#.', '...#....#...', '..#......#..', '............', '..########..', '......#.....', '......#.....', '.##########.', '............'], { '#': '#1a1418' }),
  te: SPR(['.......##...', '..######....', '......#.....', '..########..', '......#.....', '.##########.', '......#.....', '......#.....', '......#.....', '......#.....', '...#..#.....', '....###.....'], { '#': '#1a1418' }),
  do: SPR(['.#...#.#....', '..#.#####...', '......#.....', '#..######...', '.#.#....#...', '...######...', '...#....#...', '.#.######...', '.#.#....#...', '.#.######...', '#.#.........', '...########.'], { '#': '#1a1418' }),
  gull: [SPR(['#.....#', '.#...#.', '..#.#..', '...#...'], { '#': '#f4f4f0' }), SPR(['.......', '##...##', '..#.#..', '...#...'], { '#': '#f4f4f0' })],
  petal: SPR(['.p.', 'pPp', '.p.'], { p: '#ffb0c8', P: '#ffe0ea' }),
  star: SPR(['..y..', '.yYy.', 'yYYYy', '.yYy.', '..y..'], { y: '#ffd040', Y: '#fff6c0' })
};
const camX = r => { const v = r.view, o = r.w(0, 0, 0)[0]; return (r.W / 2 - o) / v.scale; };
// the line the scenery stands on: the fight line in the side view, the floor's back edge in the 2.5D view
const floorY = r => r.view.isSide ? Math.round(r.w(0, 0, 0)[1]) : Math.round(r.w(camX(r), -70, 0)[1]);
// x on screen of a world x seen at parallax par (1 = the fight plane; less = farther)
const PX = (r, x, par) => { const cx = camX(r); return Math.round(r.W / 2 + (x - cx) * r.view.scale * par); };
const hash = (i, k = 0) => E.hash2 ? E.hash2(i, k) : ((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1 + 1) % 1;
KC.Stage = {
  bg: {}, t: 0, cheer: 0, flashes: [],
  backdrop(id) {
    if (this.bg[id]) return this.bg[id];
    const B = {
      dojo: { sky: ['#1a1026', '#3a2030', '#6a3a2a'], stars: 0, layers: [] },
      harbor: { sky: ['#3a5a9a', '#e8a8a0', '#ffd8a0'], sun: { x: .72, y: .55, r: 22, color: '#fff0c0' }, layers: [{ kind: 'hills', color: '#6a6a9a', y: .58, height: .16, parallax: .08 }, { kind: 'sea', color: '#4a7ab8', y: .66, height: .34, parallax: .2 }] },
      bamboo: { sky: ['#a8d8a0', '#d8f0c0', '#f0f8d8'], layers: [{ kind: 'forest', color: '#4a7a4a', y: .6, height: .3, parallax: .1 }] },
      log: { sky: ['#5a88c8', '#a8c8e8', '#e8f0f4'], layers: [{ kind: 'mountains', color: '#6a7a8a', y: .5, height: .34, parallax: .05, snow: '#f0f4f8' }, { kind: 'forest', color: '#3a5a4a', y: .62, height: .2, parallax: .14 }] },
      ship: { sky: ['#2a1a4a', '#c8506a', '#ffa860', '#ffd890'], sun: { x: .3, y: .62, r: 26, color: '#ffe0a0' }, layers: [{ kind: 'hills', color: '#5a2a4a', y: .62, height: .08, parallax: .05 }, { kind: 'sea', color: '#7a3a5a', y: .66, height: .34, parallax: .2 }] },
      market: { sky: ['#06061a', '#141a3a', '#2a2a4a'], moon: { x: .8, y: .2, r: 12, color: '#f0e8d0' }, stars: 60, starsY: .5, layers: [{ kind: 'hills', color: '#1a1a30', y: .52, height: .2, parallax: .04 }, { kind: 'city', color: '#20203a', y: .6, height: .3, parallax: .12, windows: '#ffc870' }] },
      fuji: { sky: ['#3a3a7a', '#c87aa0', '#ffc8a8'], sun: { x: .2, y: .6, r: 16, color: '#ffe0c0' }, layers: [{ kind: 'hills', color: '#7a5a8a', y: .66, height: .14, parallax: .1 }] },
      stadium: { sky: ['#06040e', '#100a1e', '#1a1230'], layers: [] },
      courtyard: { sky: ['#68a8e8', '#b8dcf8', '#e8f4fc'], sun: { x: .8, y: .2, r: 14, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .2, height: .1, parallax: .05 }, { kind: 'hills', color: '#7aa07a', y: .55, height: .14, parallax: .06 }] },
      fishmarket: { sky: ['#80b0e0', '#c8e0f0', '#f0f4f4'], layers: [{ kind: 'sea', color: '#5a8ab8', y: .52, height: .2, parallax: .08 }, { kind: 'city', color: '#6a5a5a', y: .6, height: .2, parallax: .14 }] },
      pasture: { sky: ['#5a98e0', '#a8d0f4', '#e0f0fc'], sun: { x: .15, y: .18, r: 13, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .22, height: .12, parallax: .04 }, { kind: 'hills', color: '#6a9a5a', y: .62, height: .14, parallax: .1 }] }
    }[id];
    return (this.bg[id] = new E.Backdrop(B || 'day'));
  },
  /** set up the scene's light and weather for stage id */
  enter(game, id) {
    const S = KC.STAGE[id]; this.id = id; this.t = 0; this.flashes = [];
    game.lights.enabled = true; game.lights.ambient = S.ambient; game.weather = S.weather ? Object.assign({}, S.weather) : null;
  },
  update(dt) { this.t += dt; this.cheer = Math.max(0, this.cheer - dt * .7); for (const f of this.flashes) f.t -= dt; this.flashes = this.flashes.filter(f => f.t > 0); },
  /** draw the whole stage behind and around the actors */
  draw(r, id, o = {}) {
    const g = r.ctx, P = KC.PAINT[id], t = this.t;
    this.backdrop(id).draw(r);
    if (P.far) P.far(g, r, t);
    KC.Stage.floor(g, r, P.floor || 'planks', id);
    if (P.near) P.near(g, r, t);
    if (P.props) P.props(r, t, o);
    if (P.lights) P.lights(r, t);
    if (P.crowd && !o.noCrowd) KC.Crowd.draw(r, P.crowd, t, this.cheer, o);
  },
  /** the floor: the fight line and the mat in front of it (side view), or the floor plane (2.5D) */
  floor(g, r, kind, id) {
    const v = r.view, side = v.isSide, W = r.W, H = r.H, cx = camX(r), fy = Math.round(r.w(cx, 0, 0)[1]);
    const y0 = side ? fy : Math.round(r.w(cx, -70, 0)[1]), y1 = side ? H : Math.max(fy + 20, Math.round(r.w(cx, 50, 0)[1]));
    const F = KC.FLOORS[kind] || KC.FLOORS.planks, rows = Math.max(1, y1 - y0);
    for (let y = y0; y < H; y++) {
      const d = clamp((y - y0) / rows, 0, 1.4);
      px.rect(g, 0, y, W, 1, F.row(d, y, y >= y1));
    }
    // seams and texture: lines that fan out from the fight line (side) or run straight (2.5D)
    if (F.lines) {
      const sp = F.lines, vx = W / 2, x0w = Math.floor((cx - 400) / sp) * sp;
      for (let wx = x0w; wx < cx + 400; wx += sp) {
        const xa = Math.round(r.w(wx, side ? 0 : -70, 0)[0]), xb = side ? Math.round(vx + (xa - vx) * 2.2) : Math.round(r.w(wx, 50, 0)[0]);
        px.line(g, xa, y0, xb, side ? H : y1, F.lineColor, 1);
      }
    }
    if (F.cross) for (let k = 1; k < 7; k++) { const y = Math.round(y0 + rows * Math.pow(k / 7, side ? 1.7 : 1)); px.rect(g, 0, y, W, 1, F.cross); }
    if (F.speck) for (let i = 0; i < 260; i++) { const wx = cx - 260 + hash(i, 3) * 520, dd = hash(i, 7), y = Math.round(y0 + dd * (Math.min(H, y1 + 20) - y0)); const x = Math.round(W / 2 + (wx - cx) * v.scale * (side ? 1 + dd * 1.2 : 1)); px.rect(g, x, y, 1 + (dd > .6 ? 1 : 0), 1, hash(i, 9) > .5 ? F.speck[0] : F.speck[1]); }
    if (F.extra) F.extra(g, r, y0, y1, cx);
    // the lit centre of the mat, the fight line's edge
    px.blend(g, .16, 'add', () => px.ell(g, Math.round(r.w(200, 0, 0)[0]), Math.round((y0 + Math.min(H, y1)) / 2), Math.round(W * .38), Math.round(Math.max(6, rows * .35)), F.glow || '#ffd8a0'));
    px.rect(g, 0, y0, W, 1, F.edge || E.shade(F.row(0, y0), .25));
  }
};
const ramp = (a, b) => (d, y, past) => past ? E.shade(b, -.25) : E.mix(a, b, Math.min(1, d));
KC.FLOORS = {
  planks: { row: (d, y) => E.shade(E.mix('#c89058', '#7a4a2a', Math.min(1, d)), (y % 7 === 0 ? -.08 : 0)), lines: 26, lineColor: '#6a3e22', glow: '#ffc880' },
  deck: { row: (d, y) => E.shade(E.mix('#a8805a', '#5a4030', Math.min(1, d)), y % 6 === 0 ? -.12 : 0), lines: 34, lineColor: '#4a3020', cross: null, glow: '#ffd8a0' },
  dirt: { row: ramp('#8a7050', '#4a3a28'), speck: ['#c8a060', '#3a2a1a'], glow: '#e8f0a0' },
  log: { row: (d, y, past) => past ? '#1a2a2a' : E.mix('#8a5a3a', '#3a2418', Math.min(1, d)), cross: '#5a3a24', speck: ['#a87a50', '#2a1a10'], glow: '#ffe0a0',
    extra: (g, r, y0, y1) => { const H = r.H, y = Math.min(H, y0 + 26); px.rect(g, 0, y, r.W, H - y, '#2a3a3a'); for (let x = 0; x < r.W; x += 3) px.rect(g, x, y + ((x * 7) % 5), 1, H - y, '#3a4a4a'); px.blend(g, .35, 'normal', () => px.rect(g, 0, y, r.W, H - y, '#c8d8e0')); px.rect(g, 0, y - 1, r.W, 2, '#1a1008'); } },
  stone: { row: (d, y) => E.mix('#6a6a78', '#2a2a36', Math.min(1, d)), lines: 30, lineColor: '#22222c', cross: '#30303c', glow: '#ff9a5a' },
  gravel: { row: (d, y) => E.shade(E.mix('#d8d0c0', '#8a8478', Math.min(1, d)), y % 3 === 0 ? -.05 : 0), speck: ['#f4f0e8', '#7a7468'], glow: '#ffd0c0',
    extra: (g, r, y0) => { for (let k = 1; k < 6; k++) { const y = y0 + k * 4; for (let x = 0; x < r.W; x += 2) px.dot(g, x, y + Math.round(Math.sin((x + k * 9) * .15)), '#b8b0a0'); } } },
  mat: { row: (d, y, past) => past ? '#14183a' : E.mix('#3a5ad8', '#1a2a7a', Math.min(1, d)), glow: '#c8d8ff', edge: '#8aa0ff',
    extra: (g, r, y0, y1) => { const side = r.view.isSide, yb = side ? r.H : y1; for (const [wx, c] of [[150, '#f4f4f4'], [250, '#e83a2a']]) { const xa = Math.round(r.w(wx, side ? 0 : -70, 0)[0]), xb = side ? Math.round(r.W / 2 + (xa - r.W / 2) * 2.2) : Math.round(r.w(wx, 50, 0)[0]); px.line(g, xa, y0 + 1, xb, yb, c, 2); } px.rect(g, 0, y0 + 2, r.W, 1, '#f0c040'); } },
  earth: { row: ramp('#b89870', '#6a5038'), speck: ['#d8b888', '#5a4028'], glow: '#fff0c0' },
  wetstone: { row: (d, y) => E.mix('#7a8a96', '#3a4650', Math.min(1, d)), lines: 24, lineColor: '#2a343c', cross: '#34404a', glow: '#e0f0ff', speck: ['#c8e0f0', '#2a3038'] },
  grass: { row: (d, y) => E.shade(E.mix('#7ab84a', '#3a6a2a', Math.min(1, d)), y % 4 === 0 ? -.06 : 0), speck: ['#a8e070', '#2a5020'], glow: '#f8ffc0' }
};

/* ---- shared scenery pieces (screen pixels) ---- */
const lanternAt = (g, x, y, c, t, k = 0, s = 1) => {   // a paper lantern hanging from a cord
  const gl = .55 + .25 * Math.sin(t * 3 + k);
  px.rect(g, x, y - 10 * s, 1, 10 * s, '#2a1a14');
  px.blend(g, .28 * gl, 'add', () => px.disc(g, x, y + 6 * s, 13 * s, '#ff9a4a'));
  px.ell(g, x, y + 6 * s, 5 * s, 7 * s, E.shade(c, -.25)); px.ell(g, x - s, y + 5 * s, 4 * s, 6 * s, c); px.rect(g, x - 3 * s, y, 7 * s, 1, '#2a1a14'); px.rect(g, x - 3 * s, y + 12 * s, 7 * s, 1, '#2a1a14');
  px.rect(g, x - 2 * s, y + 4 * s, 4 * s, 1, E.shade(c, .3));
};
const stoneLantern = (g, x, y, s, t) => {   // a toro: base, post, firebox, roof
  const T = E.tones('#9a968a');
  px.rect(g, x - 7 * s, y - 3 * s, 14 * s, 3 * s, T.sh); px.rect(g, x - 2 * s, y - 15 * s, 4 * s, 12 * s, T.base); px.rect(g, x - 2 * s, y - 15 * s, 1, 12 * s, T.lt);
  px.rect(g, x - 6 * s, y - 18 * s, 12 * s, 3 * s, T.base); px.rect(g, x - 5 * s, y - 25 * s, 10 * s, 7 * s, T.sh);
  const gl = .7 + .3 * Math.sin(t * 7); px.rect(g, x - 2 * s, y - 24 * s, 4 * s, 4 * s, gl > .8 ? '#ffe8a0' : '#ffb850');
  px.blend(g, .25, 'add', () => px.disc(g, x, y - 22 * s, 9 * s, '#ffb860'));
  px.poly(g, [[x - 9 * s, y - 25 * s], [x, y - 31 * s], [x + 9 * s, y - 25 * s]], T.base); px.rect(g, x - 9 * s, y - 26 * s, 18 * s, 1, T.lt); px.rect(g, x - 1, y - 34 * s, 2, 3 * s, T.base);
};
const torii = (g, x, y, h, s) => {
  const C = E.tones('#d8402a'), w = 46 * s;
  for (const k of [-1, 1]) { px.rect(g, x + k * w * .36 - 2 * s, y - h, 4 * s, h, C.base); px.rect(g, x + k * w * .36 - 2 * s, y - h, 1, h, C.lt); }
  px.rect(g, x - w / 2 - 4 * s, y - h - 5 * s, w + 8 * s, 4 * s, '#1a1418'); px.rect(g, x - w / 2, y - h - 1 * s, w, 3 * s, C.base); px.rect(g, x - w / 2 + 4 * s, y - h + 9 * s, w - 8 * s, 3 * s, C.sh);
  px.rect(g, x - s, y - h + 2 * s, 2 * s, 7 * s, C.sh);
};
const pagoda = (g, x, y, s, c) => { for (let k = 0; k < 4; k++) { const w = (26 - k * 5) * s, yy = y - k * 12 * s; px.rect(g, x - w / 2 + 3 * s, yy - 9 * s, w - 6 * s, 9 * s, E.shade(c, .08)); px.poly(g, [[x - w / 2 - 3 * s, yy - 9 * s], [x, yy - 14 * s], [x + w / 2 + 3 * s, yy - 9 * s]], c); } px.rect(g, x, y - 56 * s, 1, 10 * s, c); };
const scroll = (g, x, y, spr, s = 1) => { px.rect(g, x - 1, y - 2, 16 + 2, 2, '#5a3a1a'); px.rect(g, x, y, 16, 30, '#f0e8d0'); px.rect(g, x, y, 1, 30, '#d8ccb0'); px.sprite(g, spr, x + 2, y + 9); px.rect(g, x - 1, y + 30, 18, 2, '#5a3a1a'); px.rect(g, x + 7, y - 6, 2, 4, '#2a1a10'); void s; };
const bambooStalks = (g, r, par, n, color, t, top) => {
  const T = E.tones(color), W = r.W, cx = camX(r), fy = floorY(r);
  for (let i = 0; i < n; i++) {
    const wx = -300 + i * (900 / n) + hash(i, par * 10) * 30, x = PX(r, wx, par) + Math.round(Math.sin(t * .8 + i) * 2 * par);
    if (x < -10 || x > W + 10) continue;
    const w = Math.max(2, Math.round(5 * par)), y1 = fy - Math.round(12 * (1 - par));
    px.rect(g, x, top, w, y1 - top, T.base); px.rect(g, x, top, 1, y1 - top, T.lt); px.rect(g, x + w - 1, top, 1, y1 - top, T.sh);
    for (let y = top + (i * 13) % 22; y < y1; y += 22) { px.rect(g, x - 1, y, w + 2, 1, T.deep); px.rect(g, x, y + 1, w, 1, T.hi); }
    if (par > .5) for (let k = 0; k < 3; k++) { const ly = top + 18 + k * 34 + (i * 7) % 20; px.poly(g, [[x + w, ly], [x + w + 9, ly - 2], [x + w + 3, ly + 2]], E.shade('#5aa04a', -.1 * k)); }
    void cx;
  }
};
const crate = (r, x, y, s = 1) => r.shape('crate', x, y, 0, { scale: s });
KC.PAINT = {
  /* HON-DOJO: shoji walls glowing warm, beams, a kamidana shelf, calligraphy, a weapon rack, a taiko; classmates in seiza */
  dojo: {
    floor: 'planks',
    far(g, r, t) {
      const W = r.W, fy = floorY(r), top = fy - 150;
      px.rect(g, 0, top, W, fy - top, '#5a3420');
      for (let k = -6; k < 12; k++) {   // shoji panels in a timber frame, backlit
        const x = PX(r, k * 64 - 40, .9), w = Math.round(58 * r.view.scale * .9);
        px.rect(g, x, top + 18, w, fy - top - 40, '#f0d8a0'); px.blend(g, .3, 'add', () => px.rect(g, x + 2, top + 20, w - 4, fy - top - 44, '#ffcf80'));
        for (let gx = x; gx < x + w; gx += 10) px.rect(g, gx, top + 18, 1, fy - top - 40, '#8a5a32');
        for (let gy = top + 18; gy < fy - 22; gy += 13) px.rect(g, x, gy, w, 1, '#8a5a32');
        px.rect(g, x - 3, top + 12, 3, fy - top - 10, '#3a2214');
      }
      px.rect(g, 0, top + 8, W, 6, '#3a2214'); px.rect(g, 0, top + 8, W, 1, '#6a4428'); px.rect(g, 0, fy - 22, W, 22, '#4a2c18'); px.rect(g, 0, fy - 22, W, 1, '#7a5030');
      // the kamidana shelf and three scrolls
      const kx = PX(r, 200, .9); px.rect(g, kx - 30, top + 26, 60, 4, '#3a2214'); px.rect(g, kx - 12, top + 14, 24, 12, '#c8a060'); px.poly(g, [[kx - 15, top + 14], [kx, top + 6], [kx + 15, top + 14]], '#5a3a1a');
      [KC.SPRITES.ku, KC.SPRITES.te, KC.SPRITES.do].forEach((s, i) => scroll(g, PX(r, 120 + i * 80, .9) - 8, top + 36, s));
      // the weapon rack: three bo staffs
      const rx = PX(r, -40, .9); px.rect(g, rx, fy - 70, 34, 3, '#3a2214'); px.rect(g, rx, fy - 40, 34, 3, '#3a2214'); for (let i = 0; i < 4; i++) px.rect(g, rx + 4 + i * 8, fy - 84, 2, 62, '#a87a48');
      void t;
    },
    props(r, t) {
      r.queue(372, -60, 0, g => { const p = r.w(372, -60, 0), x = Math.round(p[0]), y = Math.round(p[1]), T = E.tones('#8a3a2a'); px.rect(g, x - 14, y - 28, 28, 24, T.base); px.ell(g, x, y - 28, 14, 4, '#e8d8b8'); px.rect(g, x - 14, y - 22, 28, 1, T.lt); for (let i = 0; i < 6; i++) px.dot(g, x - 12 + i * 5, y - 25, '#d8b040'); px.rect(g, x - 10, y - 4, 3, 6, '#3a2214'); px.rect(g, x + 7, y - 4, 3, 6, '#3a2214'); });
      for (const x of [40, 110, 290, 360]) r.prop('lantern', x, -40, 110, { anchor: 'top', size: 1.3, halo: false });
    },
    lights(r) { const L = KC.game.lights; L.add(200, -40, 90, 200, .55, { color: '#ffb870' }); L.add(60, -40, 100, 90, .6, { color: '#ffa860' }); L.add(340, -40, 100, 90, .6, { color: '#ffa860' }); void r; },
    crowd: { kind: 'seiza', n: 9, palette: ['#f2eee4', '#e8e4d8', '#f4f0e6'], belts: ['#f4f4ee', '#f0c830', '#3aa050', '#f4f4ee'] }
  },
  /* NAGASAKI PIER: dawn over the sea, a lighthouse, moored boats, gulls; crates, barrels, Mei's noodle cart */
  harbor: {
    floor: 'deck',
    far(g, r, t) {
      const fy = floorY(r), lx = PX(r, 620, .25);
      px.rect(g, lx - 5, fy - 110, 10, 70, '#e8e0d8'); px.rect(g, lx - 5, fy - 90, 10, 8, '#d83a2a'); px.rect(g, lx - 5, fy - 66, 10, 8, '#d83a2a'); px.rect(g, lx - 7, fy - 118, 14, 8, '#3a3a4a');
      px.blend(g, .4 + .3 * Math.sin(t * 2), 'add', () => px.disc(g, lx, fy - 114, 10, '#fff0a0'));
      for (let i = 0; i < 4; i++) { const bx = PX(r, -200 + i * 170, .35), by = fy - 50 + (i % 2) * 4 + Math.round(Math.sin(t + i) * 1.5); px.poly(g, [[bx - 22, by], [bx + 22, by], [bx + 16, by + 7], [bx - 16, by + 7]], '#3a3a5a'); px.rect(g, bx - 1, by - 30, 2, 30, '#3a3a5a'); px.poly(g, [[bx + 1, by - 28], [bx + 16, by - 6], [bx + 1, by - 6]], '#c8c0c8'); }
      for (let i = 0; i < 5; i++) { const gx = ((t * (14 + i * 3) + i * 120) % (r.W + 60)) - 30, gy = fy - 150 + i * 14 + Math.round(Math.sin(t * 2 + i) * 4); px.sprite(g, KC.SPRITES.gull[Math.floor(t * 4 + i) % 2], Math.round(gx), gy); }
      px.rect(g, 0, fy - 14, r.W, 14, '#5a4030'); for (let x = PX(r, -200, 1) % 40; x < r.W; x += 40) px.rect(g, x, fy - 30, 4, 30, '#4a3424');
      px.rect(g, 0, fy - 28, r.W, 2, '#c8a878');
    },
    props(r, t, o) {
      r.shape('kc:barrel-small-stack', 62, -34, 0, { scale: 1.3 }); crate(r, 352, -40, 1.3); crate(r, 372, -44, 1.1); r.shape('barrel', 392, -30, 0, { scale: 1.3 });
      r.shape('kc:boat-row-large', 430, -60, 0, { scale: 1.2, facing: PI / 2 });
      KC.Props.noodleCart(r, 18, -24, t, o.meiCart);
    },
    lights(r) { KC.game.lights.add(18, -24, 50, 70, .5, { color: '#ffc070' }); void r; },
    crowd: { kind: 'dock', n: 10, palette: ['#3a5a8a', '#8a5a3a', '#5a5a5a', '#2a4a6a', '#a8784a'] }
  },
  /* BAMBOO FOREST: three depths of stalks, light shafts; a stone lantern, a small shrine; leaves fall */
  bamboo: {
    floor: 'dirt',
    far(g, r, t) {
      const fy = floorY(r);
      bambooStalks(g, r, .35, 26, '#8ab87a', t, 0); bambooStalks(g, r, .6, 20, '#6aa05a', t, 0);
      px.blend(g, .12, 'add', () => { for (let i = 0; i < 4; i++) { const x = PX(r, i * 160 - 80, .5); px.poly(g, [[x, 0], [x + 30, 0], [x + 90, fy], [x + 40, fy]], '#fffbd0'); } });
    },
    near(g, r, t) { void g; void r; void t; },
    props(r, t) {
      r.queue(36, -30, 0, g => { const p = r.w(36, -30, 0); stoneLantern(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.queue(372, -50, 0, g => { const p = r.w(372, -50, 0), x = Math.round(p[0]), y = Math.round(p[1]); px.rect(g, x - 16, y - 26, 32, 26, '#8a5a3a'); px.rect(g, x - 12, y - 22, 24, 18, '#3a2214'); px.poly(g, [[x - 22, y - 26], [x, y - 40], [x + 22, y - 26]], '#5a3a2a'); px.rect(g, x - 4, y - 18, 8, 8, '#f0d890'); });
      r.queue(200, -80, 0, g => bambooStalks(g, r, .85, 9, '#4a8a3a', t, 0), { bias: -50 });
      r.prop('grass', 20, 6, 0, { size: 1.3 }); r.prop('grass', 380, 6, 0, { size: 1.3 }); r.prop('rock', 398, -10, 0, { size: 1.2 });
    },
    lights(r) { KC.game.lights.add(36, -30, 30, 60, .5, { color: '#ffc870' }); void r; }
  },
  /* LOG BRIDGE: a trunk over a gorge, cliffs, a waterfall, mist, pines; rope rails */
  log: {
    floor: 'log',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (const [wx, par, c] of [[-160, .4, '#5a6470'], [560, .4, '#5a6470'], [-120, .7, '#4a5260'], [520, .7, '#4a5260']]) { const x = PX(r, wx, par); px.poly(g, [[x - 70, fy + 40], [x - 50, fy - 110], [x - 10, fy - 140], [x + 30, fy - 120], [x + 70, fy + 40]], c); px.poly(g, [[x - 50, fy - 110], [x - 10, fy - 140], [x - 6, fy - 100]], E.shade(c, .12)); }
      const wx = PX(r, 260, .45); for (let y = fy - 130; y < fy + 40; y += 2) { const off = (Math.floor(y + t * 90) % 9); px.rect(g, wx - 12, y, 24, 2, off < 3 ? '#e8f4fc' : off < 6 ? '#c8e0f0' : '#a8c8e0'); }
      px.blend(g, .35, 'add', () => px.ell(g, wx, fy + 30, 30, 8, '#ffffff'));
      for (let i = 0; i < 6; i++) { const x = ((i * 90 + t * 6) % (W + 80)) - 40; px.blend(g, .14, 'normal', () => px.ell(g, Math.round(x), fy - 10 + (i % 3) * 8, 50, 8, '#e8f0f4')); }
    },
    props(r) {
      r.queue(0, -10, 30, g => { const a = r.w(-40, -10, 28), b = r.w(440, -10, 28); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#c8a868', 1); for (let x = -40; x <= 440; x += 40) { const p = r.w(x, -10, 0), q = r.w(x, -10, 30); px.rect(g, Math.round(p[0]), Math.round(q[1]), 2, Math.round(p[1] - q[1]), '#6a4a2a'); } }, { bias: -30 });
      r.shape('pine', -6, -40, 0, { params: { h: 60, tiers: 5 } }); r.shape('pine', 412, -40, 0, { params: { h: 70, tiers: 5 } });
      r.prop('vines', 372, -30, 120, { anchor: 'top', size: 1.4 });
    }
  },
  /* SHIP'S STERN: a sunset sea, the mast and rigging, the ship's wheel, lanterns, a cannon, barrels; a cheering crew */
  ship: {
    floor: 'deck',
    far(g, r, t) {
      const fy = floorY(r), W = r.W; for (let i = 0; i < 30; i++) { const x = Math.round(hash(i, 2) * W), y = fy - 40 + Math.round(hash(i, 5) * 30); if (Math.sin(t * 3 + i) > .6) px.rect(g, x, y, 3, 1, '#ffe8b0'); }
      const sway = KC.game && KC.game.reduceMotion ? 0 : Math.sin(t * .9) * 1.5, mx = PX(r, 200, .95);
      px.rect(g, mx - 3, 0, 6, fy, '#5a3a22'); px.rect(g, mx - 60, 30 + sway, 120, 4, '#4a3020'); px.rect(g, mx - 40, 90 + sway, 80, 3, '#4a3020');
      px.poly(g, [[mx - 56, 34 + sway], [mx + 56, 34 + sway], [mx + 46, 88 + sway], [mx - 46, 88 + sway]], '#e8dcc0'); px.poly(g, [[mx - 56, 34 + sway], [mx - 20, 34 + sway], [mx - 16, 88 + sway], [mx - 46, 88 + sway]], '#d0c4a8');
      for (const k of [-1, 1]) for (let i = 0; i < 5; i++) px.line(g, mx + k * (60 - i * 6), 32 + sway, mx + k * (150 + i * 30), fy - 20, '#3a2414', 1);
      px.rect(g, 0, fy - 30, W, 30, '#6a4a30'); px.rect(g, 0, fy - 30, W, 3, '#8a6a48'); for (let x = PX(r, -200, 1) % 24; x < W; x += 24) px.rect(g, x, fy - 27, 3, 27, '#4a3020');
    },
    props(r, t) {
      r.shape('kc:cannon', 52, -30, 0, { scale: 1.4, facing: PI / 2 }); r.shape('barrel', 352, -30, 0, { scale: 1.3 }); r.shape('kc:barrel-small-stack', 392, -40, 0, { scale: 1.3 });
      r.queue(14, -30, 0, g => KC.Props.wheel(g, r, 14, -30, t));
      for (const x of [20, 380]) r.prop('lantern', x, -35, 105, { anchor: 'top', size: 1.2, halo: false });
    },
    lights(r) { KC.game.lights.add(20, -35, 95, 80, .55, { color: '#ffb060' }); KC.game.lights.add(380, -35, 95, 80, .55, { color: '#ffb060' }); void r; },
    crowd: { kind: 'crew', n: 8, palette: ['#e8e8f0', '#2a3a6a', '#c8c8d0', '#3a4a7a'] }
  },
  /* CHAMPON STREET: the night market under rows of red lanterns, stalls, the Champon-tei shop front with its noren */
  market: {
    floor: 'stone',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (let k = -4; k < 10; k++) { const x = PX(r, k * 90 - 50, .8), w = Math.round(80 * r.view.scale * .8); const c = ['#3a2a3a', '#2a2a3a', '#3a2a2a'][(k + 9) % 3]; px.rect(g, x, fy - 120, w, 100, c); px.poly(g, [[x - 6, fy - 120], [x + w / 2, fy - 136], [x + w + 6, fy - 120]], '#1a1420'); for (let wy = fy - 108; wy < fy - 40; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 18) px.rect(g, wx, wy, 8, 10, (k + wx + wy) % 3 ? '#ffb860' : '#4a3a2a'); }
      for (let row = 0; row < 2; row++) { const y0 = 26 + row * 26; px.line(g, 0, y0, W, y0 + 6, '#1a1010', 1); for (let i = -2; i < 14; i++) lanternAt(g, PX(r, i * 46 - 60 + row * 23, .9), y0 + 6, row ? '#e8402a' : '#d8302a', t, i + row * 3); }
      // CHAMPON-TEI: a shop front, a noren curtain with a bowl, steam
      const sx = PX(r, 200, .8), w = 120; px.rect(g, sx - w / 2, fy - 110, w, 90, '#5a2a1a'); px.rect(g, sx - w / 2 - 6, fy - 118, w + 12, 10, '#2a1410');
      px.rect(g, sx - 36, fy - 128, 72, 12, '#f0e0b0'); E.font.text(g, 'CHAMPON-TEI', sx, fy - 126, '#8a1a10', { align: 'center', outline: false });
      for (let i = 0; i < 5; i++) { const nx = sx - 50 + i * 20 + Math.round(Math.sin(t * 1.5 + i) * 1); px.rect(g, nx, fy - 106, 18, 40, '#1e2a5a'); px.rect(g, nx, fy - 106, 18, 2, '#3a4a8a'); }
      px.ell(g, sx, fy - 86, 12, 6, '#f0e8d8'); px.rect(g, sx - 12, fy - 86, 24, 2, '#f0e8d8'); px.line(g, sx + 4, fy - 100, sx + 10, fy - 88, '#c8a060', 1); px.line(g, sx + 7, fy - 100, sx + 12, fy - 88, '#c8a060', 1);
      px.blend(g, .45, 'add', () => px.rect(g, sx - 40, fy - 62, 80, 40, '#ffc870'));
      for (let i = 0; i < 3; i++) { const y = fy - 120 - ((t * 20 + i * 14) % 40); px.blend(g, .2, 'normal', () => px.ell(g, sx + 30 + Math.round(Math.sin(t + i) * 4), Math.round(y), 6, 4, '#f0f0f0')); }
    },
    props(r) { r.shape('kc:stall-red', 22, -40, 0, { scale: 1.3 }); r.shape('kc:stall-red', 384, -40, 0, { scale: 1.3 }); r.shape('kc:bowl-soup', 22, -40, 22, { scale: 1.5 }); r.prop('streetlamp', 342, -20, 0, { size: 1.2, light: true }); },
    lights(r) { const L = KC.game.lights; for (let i = 0; i < 6; i++) L.add(i * 80, -40, 120, 70, .6, { color: '#ff7a4a' }); L.add(200, -60, 40, 120, .6, { color: '#ffc870' }); void r; },
    crowd: { kind: 'market', n: 12, palette: ['#5a3a6a', '#3a5a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#6a6a8a'] }
  },
  /* FUJI GARDEN: Mount Fuji at dusk, a pagoda, a torii, cherry trees; raked gravel, stone lanterns, a koi pond; petals */
  fuji: {
    floor: 'gravel',
    far(g, r, t) {
      const fy = floorY(r), fx = PX(r, 260, .08), top = fy - 175;
      px.poly(g, [[fx - 210, fy - 10], [fx - 34, top], [fx + 34, top], [fx + 210, fy - 10]], '#6a5a9a'); px.poly(g, [[fx - 34, top], [fx + 34, top], [fx + 70, top + 36], [fx + 40, top + 30], [fx + 18, top + 44], [fx - 6, top + 32], [fx - 30, top + 46], [fx - 70, top + 36]], '#f4f0fa');
      px.poly(g, [[fx + 34, top], [fx + 210, fy - 10], [fx + 120, fy - 10], [fx + 20, top + 40]], '#5a4a88');
      pagoda(g, PX(r, -120, .4), fy - 22, 1, '#3a2a4a');
      for (const [wx, par] of [[-60, .6], [470, .6], [150, .5]]) { const x = PX(r, wx, par); px.rect(g, x - 2, fy - 60, 4, 50, '#4a2a2a'); for (let i = 0; i < 9; i++) px.disc(g, x - 18 + hash(i, wx) * 36, fy - 66 - hash(i + 3, wx) * 26, 9, i % 2 ? '#ffb0c8' : '#f890b0'); }
      void t;
    },
    props(r, t) {
      r.queue(330, -70, 0, g => { const p = r.w(330, -70, 0); torii(g, Math.round(p[0]), Math.round(p[1]), Math.round(62 * r.view.scale), r.view.scale); });
      for (const x of [30, 372]) r.queue(x, -30, 0, g => { const p = r.w(x, -30, 0); stoneLantern(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.queue(40, 12, 0, g => { const p = r.w(40, 12, 0), x = Math.round(p[0]), y = Math.round(p[1]); px.ell(g, x, y + 4, 40, 7, '#2a5a7a'); px.ell(g, x, y + 3, 36, 5, '#3a7aa0'); const k = Math.round(Math.sin(t * 1.3) * 18); px.ell(g, x + k, y + 3, 4, 2, '#ff8a3a'); px.ell(g, x - k / 2, y + 4, 3, 1, '#f4f4f0'); });
    },
    lights(r) { const L = KC.game.lights; L.add(30, -30, 30, 60, .5, { color: '#ffc870' }); L.add(372, -30, 30, 60, .5, { color: '#ffc870' }); void r; },
    crowd: { kind: 'garden', n: 6, palette: ['#c86a8a', '#6a8ac8', '#e8d8c0', '#8a6aa8'] }
  },
  /* NATIONAL STADIUM: tiered crowd, banners, the scoreboard, spotlights, camera flashes, the Golden Bowl on its table */
  stadium: {
    floor: 'mat',
    far(g, r, t) {
      const fy = floorY(r), W = r.W;
      for (let row = 0; row < 7; row++) { const y = fy - 40 - row * 16, c = E.shade('#2a2040', -row * .04); px.rect(g, 0, y - 16, W, 16, c); px.rect(g, 0, y - 1, W, 1, '#3a3058'); }
      KC.Crowd.tiers(g, r, t, KC.Stage.cheer);
      const sx = PX(r, 200, .7), sy = Math.max(34, fy - 146); px.rect(g, sx - 60, sy, 120, 34, '#101018'); px.rect(g, sx - 58, sy + 2, 116, 30, '#1a1a28');
      E.font.text(g, "CHAMPON CUP '84", sx, sy + 4, '#ffd040', { align: 'center', outline: false }); const sc = KC.scene && KC.scene.bout ? KC.scene.bout.points : [0, 0];
      E.font.text(g, 'WHITE ' + sc[0] + '   RED ' + sc[1], sx, sy + 18, '#ff7a5a', { align: 'center', outline: false });
      px.blend(g, .25, 'add', () => px.rect(g, sx - 60, sy, 120, 34, '#ffb040'));
      for (const [wx, c] of [[-60, '#d83a2a'], [460, '#2a5ad8']]) { const x = PX(r, wx, .75); px.rect(g, x - 16, fy - 150, 32, 46, c); px.poly(g, [[x - 16, fy - 104], [x, fy - 96], [x + 16, fy - 104]], c); E.font.text(g, '84', x, fy - 136, '#fff6d0', { align: 'center', outline: false, scale: 2 }); }
      for (const f of KC.Stage.flashes) px.blend(g, f.t * 3, 'add', () => px.disc(g, f.x, f.y, 4, '#ffffff'));
      if (Math.floor(t * 30) % 17 === 0 && KC.Stage.flashes.length < 6) KC.Stage.flashes.push({ x: Math.round(hash(Math.floor(t * 30), 4) * W), y: fy - 50 - Math.round(hash(Math.floor(t * 30), 8) * 100), t: .25 });
    },
    near(g, r) { const fy = floorY(r); px.blend(g, .12, 'add', () => { for (const wx of [120, 280]) { const x = Math.round(r.w(wx, 0, 0)[0]); px.poly(g, [[x - 10, 0], [x + 10, 0], [x + 60, fy + 8], [x - 60, fy + 8]], '#fff4d8'); } }); },
    props(r, t) {
      r.queue(372, -46, 0, g => { const p = r.w(372, -46, 0); KC.Props.goldenBowl(g, Math.round(p[0]), Math.round(p[1]), r.view.scale, t); });
      r.shape('chair', 16, -44, 0, { scale: 1.3, facing: PI / 2 }); r.shape('chair', 384, -44, 0, { scale: 1.3, facing: PI / 2 });
    },
    lights(r) { const L = KC.game.lights; L.add(120, 0, 160, 150, .7, { color: '#fff4d8' }); L.add(280, 0, 160, 150, .7, { color: '#fff4d8' }); L.add(372, -46, 30, 60, .6, { color: '#ffd040' }); void r; },
    crowd: null
  },
  /* BONUS: the dojo courtyard, the fish-market alley, the Fuji pasture */
  courtyard: {
    floor: 'earth',
    far(g, r) { const fy = floorY(r); px.rect(g, 0, fy - 90, r.W, 90, '#e8dcc0'); px.rect(g, 0, fy - 96, r.W, 8, '#5a3a2a'); for (let x = PX(r, -200, 1) % 50; x < r.W; x += 50) px.rect(g, x, fy - 90, 3, 90, '#c8b898'); px.poly(g, [[0, fy - 96], [r.W, fy - 96], [r.W, fy - 106], [0, fy - 106]], '#3a2a2a'); },
    props(r) { r.shape('pine', 14, -40, 0, { params: { h: 64, tiers: 5 } }); r.shape('barrel', 380, -30, 0, { scale: 1.3 }); r.prop('bush', 352, -10, 0, { size: 1.3 }); r.prop('rock', 58, -10, 0, { size: 1.1 }); }
  },
  fishmarket: {
    floor: 'wetstone',
    far(g, r, t) { const fy = floorY(r); for (let k = -3; k < 8; k++) { const x = PX(r, k * 100 - 40, .8), w = 70; px.rect(g, x, fy - 80, w, 60, '#6a5a4a'); px.poly(g, [[x - 8, fy - 80], [x + w / 2, fy - 100], [x + w + 8, fy - 80]], '#3a3a4a'); px.rect(g, x + 10, fy - 60, w - 20, 22, '#2a2a30'); px.rect(g, x + 20, fy - 92, 30, 9, k % 2 ? '#d84a2a' : '#2a6ad8'); } for (let i = 0; i < 3; i++) px.sprite(g, KC.SPRITES.gull[Math.floor(t * 4 + i) % 2], Math.round((t * 20 + i * 140) % r.W), 30 + i * 18); },
    props(r) { crate(r, 20, -30, 1.3); crate(r, 46, -50, 1.2); r.shape('kc:barrel-small-stack', 378, -30, 0, { scale: 1.3 }); r.prop('sign', 352, -40, 0, { size: 1.2 }); }
  },
  pasture: {
    floor: 'grass',
    far(g, r) { const fy = floorY(r), fx = PX(r, 300, .08), top = fy - 140; px.poly(g, [[fx - 170, fy - 20], [fx - 28, top], [fx + 28, top], [fx + 170, fy - 20]], '#7a8ac0'); px.poly(g, [[fx - 28, top], [fx + 28, top], [fx + 56, top + 30], [fx + 30, top + 24], [fx, top + 36], [fx - 30, top + 26], [fx - 56, top + 30]], '#f4f8ff'); },
    props(r) { for (let x = -120; x < 540; x += 34) r.shape('fence', x, -40, 0, { params: { len: 34 } }); r.shape('kc:hay-bale-bundled', 26, -24, 0, { scale: 1.5 }); r.shape('kc:hay-bale-bundled', 384, -24, 0, { scale: 1.5 }); r.shape('tree', 404, -60, 0, { params: { h: 60, seed: 3 } }); }
  }
};

/* ---- custom props (drawn in screen pixels at their projected point) ---- */
KC.Props = {
  noodleCart(r, x, y, t, mei) {
    r.queue(x, y, 0, g => {
      const p = r.w(x, y, 0), X = Math.round(p[0]), Y = Math.round(p[1]), s = r.view.scale, W = Math.round(48 * s), T = E.tones('#8a5a3a');
      px.disc(g, X - W / 2 + 8, Y - 6, 6, '#3a2a1a'); px.disc(g, X + W / 2 - 8, Y - 6, 6, '#3a2a1a'); px.disc(g, X - W / 2 + 8, Y - 6, 3, '#8a6a4a'); px.disc(g, X + W / 2 - 8, Y - 6, 3, '#8a6a4a');
      px.rect(g, X - W / 2, Y - 30, W, 20, T.base); px.rect(g, X - W / 2, Y - 30, W, 2, T.lt); px.rect(g, X - W / 2, Y - 12, W, 2, T.sh);
      px.rect(g, X - W / 2 + 2, Y - 62, 3, 32, T.sh); px.rect(g, X + W / 2 - 5, Y - 62, 3, 32, T.sh);
      px.poly(g, [[X - W / 2 - 6, Y - 62], [X + W / 2 + 6, Y - 62], [X + W / 2, Y - 72], [X - W / 2, Y - 72]], '#c8302a'); for (let i = 0; i < 6; i++) px.rect(g, X - W / 2 - 4 + i * (W + 8) / 6, Y - 62, (W + 8) / 12, 4, '#f4ece0');
      px.rect(g, X - 10, Y - 40, 20, 10, '#5a5a62'); px.ell(g, X, Y - 40, 10, 2, '#8a8a92');
      for (let i = 0; i < 3; i++) { const yy = Y - 44 - ((t * 18 + i * 9) % 24); px.blend(g, .3, 'normal', () => px.ell(g, X + Math.round(Math.sin(t * 2 + i) * 3), Math.round(yy), 4, 3, '#ffffff')); }
      px.rect(g, X - 14, Y - 26, 28, 10, '#f0e0b0'); E.font.text(g, 'MEI', X, Y - 25, '#8a1a10', { align: 'center', outline: false }); void mei;
    });
  },
  wheel(g, r, x, y, t) {
    const p = r.w(x, y, 40), X = Math.round(p[0]), Y = Math.round(p[1]), R = Math.round(16 * r.view.scale), a0 = Math.sin(t * .6) * .3;
    for (let i = 0; i < 8; i++) { const a = a0 + i * PI / 4; px.line(g, X, Y, X + Math.round(Math.cos(a) * (R + 5)), Y + Math.round(Math.sin(a) * (R + 5)), '#6a4a2a', 2); }
    px.disc(g, X, Y, R, '#5a3a22'); px.disc(g, X, Y, R - 3, '#00000000'); px.disc(g, X, Y, 4, '#c8a060');
    const pb = r.w(x, y, 0); px.rect(g, X - 2, Y, 4, Math.round(pb[1] - Y), '#4a3020');
  },
  goldenBowl(g, x, y, s, t) {
    px.rect(g, x - 18, y - 22, 36, 22, '#3a1a2a'); px.rect(g, x - 18, y - 22, 36, 2, '#6a3a4a');
    const T = E.tones('#e8c040'); px.ell(g, x, y - 32, 13, 9, T.sh); px.ell(g, x, y - 34, 13, 8, T.base); px.ell(g, x, y - 40, 13, 3, T.lt); px.rect(g, x - 4, y - 26, 8, 4, T.sh);
    px.dot(g, x - 6, y - 36, '#ffffff'); if (Math.sin(t * 3) > .7) { px.dot(g, x + 8, y - 42, '#ffffff'); px.dot(g, x + 9, y - 43, '#fff6c0'); }
    px.blend(g, .3, 'add', () => px.disc(g, x, y - 34, 18, '#ffd040')); void s;
  },
  bonsai(g, x, y, s) { px.rect(g, x - 6 * s, y - 6 * s, 12 * s, 6 * s, '#3a5a8a'); px.rect(g, x - 7 * s, y - 7 * s, 14 * s, 2 * s, '#5a7aaa'); px.rect(g, x - 1, y - 12 * s, 2, 6 * s, '#5a3a22'); px.disc(g, x - 3 * s, y - 13 * s, 4 * s, '#3a7a3a'); px.disc(g, x + 3 * s, y - 14 * s, 4 * s, '#4a8a3a'); },
  clayPot(g, x, y, s) { const T = E.tones('#b8683a'); px.ell(g, x, y - 5 * s, 6 * s, 5 * s, T.base); px.ell(g, x - s, y - 6 * s, 4 * s, 3 * s, T.lt); px.rect(g, x - 3 * s, y - 11 * s, 6 * s, 2 * s, T.sh); },
  boulder(g, x, y, s) { const T = E.tones('#7a7468'); px.disc(g, x, y - 6 * s, 7 * s, T.sh); px.disc(g, x - s, y - 7 * s, 6 * s, T.base); px.disc(g, x - 3 * s, y - 9 * s, 2 * s, T.lt); },
  bowl(g, x, y, s) { px.ell(g, x, y - 4 * s, 7 * s, 4 * s, '#f4f0e8'); px.rect(g, x - 7 * s, y - 6 * s, 14 * s, 2 * s, '#e8a040'); px.ell(g, x, y - 6 * s, 6 * s, 1 * s, '#f0c060'); px.rect(g, x - 3 * s, y - 2 * s, 6 * s, 1, '#c8c4bc'); px.rect(g, x - 2 * s, y - 8 * s, 1, 2 * s, '#ffffff'); }
};

/* ---- crowds: silhouettes behind (parallax rows), a front row of small rigs that wave and cheer, Mei among them ---- */
KC.Crowd = {
  rigs: {},
  draw(r, spec, t, cheer, o = {}) {
    const g = r.ctx, fy = floorY(r), W = r.W;
    if (spec.kind === 'seiza') {   // the classmates kneel along the back wall
      for (let i = 0; i < spec.n; i++) {
        const key = 'seiza' + i, wx = -40 + i * 60;
        const rig = this.rigs[key] || (this.rigs[key] = KC.rigPost(new E.Humanoid({ size: 1.55, build: 'chibi', weapon: null, hair: i % 3 ? 'short' : 'spiky', colors: { skin: ['#f0c49c', '#e0b08a', '#f4d0b0'][i % 3], hair: '#1a1418', cloth: '#f2eee4', pants: '#ece6da', belt: spec.belts[i % spec.belts.length], boot: '#f0c49c', glove: '#f0c49c' } })));
        KC.poseStep(rig, 1 / 60, { seiza: cheer > .3 ? 0 : 1 }); rig.update(1 / 60, { x: wx, y: -50, z: 0, facing: wx < 200 ? .5 : PI - .5, pose: cheer > .3 ? 'cheer' : null, expr: cheer > .3 ? 'shout' : null });
        r.actor(wx, -50, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { every: 2, key: rig });
      }
      return;
    }
    // back rows: silhouettes (rectangle plus head disc), bobbing harder on a cheer
    const rows = spec.kind === 'garden' ? 1 : 2;
    for (let row = 0; row < rows; row++) for (let i = 0; i < 26; i++) {
      const par = [.82, .9][row], wx = -180 + i * 30 + hash(i, row) * 10, x = PX(r, wx, par);
      if (x < -10 || x > W + 10) continue;
      const bob = Math.abs(Math.sin(t * (3 + cheer * 7) + i * 1.7 + row)) * (1 + cheer * 4), h = 16 + hash(i, 5 + row) * 7, c = E.shade(spec.palette[(i + row) % spec.palette.length], -.25 + row * .1);
      const y = fy - 20 - (1 - row) * 9 - h + 16 - bob;
      px.rect(g, x - 5, Math.round(y + 6), 10, Math.round(h), c); px.disc(g, x, Math.round(y + 3), 4, E.shade('#e0b090', -.3 + row * .12));
      if (cheer > .35 && hash(i, 1) > .45) { px.rect(g, x - 7, Math.round(y - 3 - bob), 2, 8, c); px.rect(g, x + 5, Math.round(y - 3 - bob), 2, 8, c); }
    }
    // the front row: small rigs; Mei among them on story stages after the harbor
    const n = Math.min(6, spec.n);
    for (let i = 0; i < n; i++) {
      const key = spec.kind + i, wx = [-16, 28, 372, 416, 70, 330][i];
      const rig = this.rigs[key] || (this.rigs[key] = new E.Humanoid({ size: 1.6, style: 'hd', build: 'chibi', weapon: null, hair: ['short', 'ponytail', 'spiky', 'long'][i % 4], colors: { skin: ['#f0c49c', '#d8a07a', '#f4d0b0'][i % 3], hair: ['#2a1a10', '#4a2a1a', '#1a1418', '#6a4a2a'][i % 4], cloth: spec.palette[i % spec.palette.length], pants: '#3a3a4a', boot: '#2a2020' } }));
      const cheerP = cheer > .3 ? 'cheer' : (Math.sin(t * .7 + i * 2) > .6 ? 'wave' : null);
      rig.update(1 / 60, { x: wx, y: -46, z: 0, facing: PI / 2 + (i % 2 ? .3 : -.3), pose: cheerP, expr: cheer > .3 ? 'smile' : null });
      r.actor(wx, -46, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { every: 2, key: rig });
    }
    if (o.mei) {
      const rig = this.meiRig || (this.meiRig = KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a' } }));
      rig.update(1 / 60, { x: 48, y: -46, z: 0, facing: PI / 2 - .2, pose: cheer > .4 ? 'cheer' : 'hips', expr: cheer > .4 ? 'shout' : 'smile' });
      r.actor(48, -46, 0, (gg, ox, oy) => rig.draw(gg, ox, oy, r.view), { key: rig });
      if (cheer > .6 && Math.floor(t * 4) % 2 === 0) r.textAt(48, -46, 52, '♥', '#ff5a8a');
    }
  },
  /** the stadium's tiers: dense rows of heads with banners and flashes */
  tiers(g, r, t, cheer) {
    const fy = floorY(r), W = r.W;
    for (let row = 0; row < 6; row++) for (let x = (row * 5) % 8; x < W; x += 8) {
      const bob = Math.abs(Math.sin(t * (2.5 + cheer * 8) + x * .3 + row)) * (1 + cheer * 3), y = fy - 46 - row * 16 - Math.round(bob);
      const c = ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#c8c8d8'][(x * 7 + row) % 6];
      px.rect(g, x - 3, y + 3, 6, 8, E.shade(c, -.2 - row * .05)); px.disc(g, x, y + 1, 3, E.shade('#e0b090', -.25 - row * .06));
    }
  }
};

// ---- src/40-bonus.js ----
/* =====================================================================================================================
 * BONUS STAGES, in one scene with the hero's Karateka and the same twin-stick input:
 *  BREAK THE BOARDS (tameshiwari): hold R down (or the cross, or K) to breathe the KI gauge up, release to chop.
 *  POTS AHOY! (evade): pots, bonsai, boulders and steaming bowls thrown at three heights; break, dodge or catch (block).
 *  STOP THE BULL: a charging bull; one of five techniques at the right moment stops it.
 * data: { id, story, auto (the attract mode's perfect autopilot), variant: { n, mat, difficulty }, done(points) }.
 * ===================================================================================================================== */
const LANES = { high: 52, mid: 36, low: 10 };
KC.Bull = class {
  constructor() { this.x = 372; this.st = 'idle'; this.t = 0; this.v = 0; this.gal = 0; this.head = 0; this.eyes = 0; this.dir = -1; }
  // the head's front, in world x (the strike window is measured to it)
  get nose() { return this.x + this.dir * 36; }
  update(dt) {
    this.t += dt;
    if (this.st === 'charge') { this.x += this.dir * this.v * dt; this.gal += dt * this.v / 22; }
    else if (this.st === 'walkBack') { this.x += -this.dir * 70 * dt; this.gal += dt * 3; }
    else if (this.st === 'trample') { this.x += this.dir * this.v * .6 * dt; this.gal += dt * this.v / 22; }
    this.head = approach(this.head, this.st === 'charge' || this.st === 'paw' ? 1 : 0, dt * 4); this.eyes = approach(this.eyes, this.st === 'charge' ? 1 : 0, dt * 6);
  }
  draw(r) {
    const s = r.view.scale, P = (dx, z) => r.w(this.x + this.dir * dx, -2, z), T = E.tones('#4a2e22'), H = E.tones('#e8dcc0');
    r.queue(this.x, -2, 0, g => {
      const legs = [[22, 0], [16, .5], [-18, .25], [-24, .75]], walk = this.st === 'charge' || this.st === 'walkBack' || this.st === 'trample', paw = this.st === 'paw';
      for (const [lx, ph] of legs) {   // two-segment legs on a gallop
        const a = walk ? Math.sin(this.gal * TAU + ph * TAU) : paw && lx > 0 && lx < 20 ? Math.max(0, Math.sin(this.t * 9)) : 0;
        const hip = P(lx, 30), knee = P(lx + a * 6, 15 + Math.max(0, a) * 4), hoof = P(lx + a * 10, Math.max(0, a) * 6);
        px.line(g, Math.round(hip[0]), Math.round(hip[1]), Math.round(knee[0]), Math.round(knee[1]), T.sh, Math.round(5 * s)); px.line(g, Math.round(knee[0]), Math.round(knee[1]), Math.round(hoof[0]), Math.round(hoof[1]), T.sh, Math.round(4 * s));
        px.rect(g, Math.round(hoof[0]) - 3, Math.round(hoof[1]) - 2, 6, 3, '#1a1008');
      }
      const c = P(0, 32), bw = Math.round(40 * s), bh = Math.round(17 * s);
      px.ell(g, Math.round(c[0]), Math.round(c[1]), bw, bh, T.sh); px.ell(g, Math.round(c[0]) - this.dir, Math.round(c[1]) - 3, bw - 3, bh - 4, T.base); px.ell(g, Math.round(c[0]) - this.dir * 8, Math.round(c[1]) - 8, Math.round(bw * .5), 4, T.lt);
      const hump = P(14, 42); px.ell(g, Math.round(hump[0]), Math.round(hump[1]), Math.round(14 * s), Math.round(10 * s), T.base);
      const tail = P(-40, 34 + Math.sin(this.t * 5) * 4), tb = P(-38, 40); px.line(g, Math.round(tb[0]), Math.round(tb[1]), Math.round(tail[0]), Math.round(tail[1] + 8), T.sh, 2); px.disc(g, Math.round(tail[0]), Math.round(tail[1] + 9), 2, '#1a1008');
      const hd = P(34 + this.head * 2, 36 - this.head * 12), hx = Math.round(hd[0]), hy = Math.round(hd[1]);   // the head, lowered to charge
      px.ell(g, hx, hy, Math.round(10 * s), Math.round(9 * s), T.sh); px.ell(g, hx + this.dir * 6, hy + 4, Math.round(7 * s), Math.round(6 * s), '#c88a7a');
      px.disc(g, hx + this.dir * 9, hy + 6, 2, '#e8c040');   // the nose ring
      for (const k of [-1, 1]) { px.line(g, hx - this.dir * 2, hy - 7, hx - this.dir * 2 + k * 5 - this.dir * 6, hy - 16, H.base, 3); px.line(g, hx - this.dir * 2 + k * 5 - this.dir * 6, hy - 16, hx + k * 8 - this.dir * 2, hy - 22, H.lt, 2); }
      px.rect(g, hx + this.dir * 2 - 1, hy - 3, 3, 2, this.eyes > .5 ? '#ff2a1a' : '#1a1008');
      if (this.st === 'stopped') for (let i = 0; i < 4; i++) { const a = this.t * 5 + i * TAU / 4; px.sprite(g, KC.SPRITES.star, Math.round(hx + Math.cos(a) * 12) - 2, Math.round(hy - 26 + Math.sin(a) * 4)); }
    }, { bias: 1 });
    r.shadow(this.x, -2, 30, .35);
  }
};

KC.BonusScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.finished = false; this.struck = false; this.tumble = 0; this.autoCtl = null; this.B = KC.BONUS[d.id] || KC.BONUS.boards; this.kind = this.B.kind; this.t = 0; this.points = 0; this.state = 'intro'; this.stT = 0; this.msg = null; this.msgT = 0; this.perfect = false;
    g.setView('kcside'); KC.Stage.enter(g, this.B.stage); KC.music('bonus'); KC.scene = this; g.timeScale = 1;
    const hx = this.kind === 'boards' ? 170 : this.kind === 'bull' ? 130 : 200;
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: hx, rank: d.story ? KC.Story.rank : 'white' }); this.hero.x0 = 40; this.hero.x1 = 360;
    this.reader = d.auto ? null : new KC.Reader(g.input); this.bus = new KC.Bus(); this.hero.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero] }, g, this.fx);
    this.ref = KC.makeOfficial(1.9);
    const V = Object.assign({}, this.B.params, d.variant || {}), diff = V.difficulty || 'Normal'; this.V = V; this.speedK = diff === 'Easy' ? .8 : diff === 'Hard' ? 1.25 : 1;
    if (this.kind === 'boards') { this.n = V.n || 5; this.mat = KC.DATA.boardMats[V.mat || 'pine']; this.ki = 0; this.over = 0; this.held = false; this.broken = 0; this.chopT = -1; }
    if (this.kind === 'pots') this._potsInit(V);
    if (this.kind === 'bull') { this.bull = new KC.Bull(); this.charge = 0; this.thuds = 0; this.bullSt(); }
    this.ref.update(.05, { x: 300, y: -20, z: 0, facing: PI / 2 });
    this.banner = { boards: KC.TEXT.bonusBoards, pots: KC.TEXT.bonusPots, bull: KC.TEXT.bonusBull }[this.kind];
    KC.Voice.speak(this.banner, 'genkotsu');
  },
  exit() { KC.game.timeScale = 1; KC.scene = null; KC.game.weather = null; },
  say(text, color) { this.msg = text; this.msgT = 1.6; this.msgC = color; KC.Voice.call(text === 'PERFECT!' ? 'perfect' : text === 'WEAK!' ? 'weak' : 'stop', text); },
  update(dt) {
    const g = KC.game, h = this.hero; this.t += dt; this.stT += dt; this.msgT -= dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    if (this.state === 'intro') { h.script(this.kind === 'boards' ? 'yoi' : 'kamae', null); if (this.stT > 1.8) { this.state = 'play'; this.stT = 0; h.release(); h.ctlOn = true; if (this.kind === 'boards') h.script('yoi', null); } }
    else if (this.state === 'play') { if (this.kind === 'boards') this._boards(dt); else if (this.kind === 'pots') this._pots(dt); else this._bull(dt); }
    else if (this.state === 'end' && this.stT > 3 && !this.finished) this._finish();
    if (this.kind !== 'boards' || this.state !== 'play' || this.chopT < 0) { if (!(this.kind === 'boards')) { const c = this.reader ? this.reader.read() : this.autoCtl || { posture: 'n', press: null }; h.control(this.state === 'play' ? c : { posture: 'n', press: null }); h.update(dt, this._foe()); } else h.update(dt, null); }
    h.pose(dt);
    KC.poseStep(this.ref, dt, { cross: this.msgT > 0 ? 0 : 1, sig: this.msgT > 0 ? (this.msg === 'WEAK!' || this.msg === KC.TEXT.trampled ? 'nopoint' : 'full') : null, side: 1 }); this.ref.update(dt, { x: 300, y: -20, z: 0, facing: PI / 2 });
    if (this.kind === 'bull') this.bull.update(dt);
    KC.camera(g, this.kind === 'bull' ? [Math.min(h.x, this.bull.x), Math.max(h.x + 140, this.bull.x)] : [200]);
    if (this.d.limit && this.stT > this.d.limit && this.state === 'play' && this.d.auto) this._end(false);
  },
  // a stand-in foe so the hero faces the incoming side
  _foe() { const side = this.kind === 'pots' ? this.facing : 1; return { x: this.hero.x + side * 50, w: 10, airborne: false }; },
  _end(perfect) { if (this.state === 'end') return; this.state = 'end'; this.stT = 0; if (perfect) { this.perfect = true; KC.sting('perfect'); } KC.Voice.crowd(.6, 1); },
  _finish() {
    this.finished = true; const pts = Math.max(0, this.points), d = this.d, g = KC.game;
    if (d.done) { d.done(pts); return; }
    if (d.story) { KC.Story.score += pts; KC.Story.advance(); return; }
    if (KC.Save.qualifies(this.kind, pts)) g.go('initials', { mode: this.kind, score: pts, next: () => g.go('bonusMenu') }); else g.go('bonusMenu');
  },
  /* ---- BOARDS ---- */
  _boards(dt) {
    const h = this.hero, T = KC.TUNE, I = KC.game.input;
    if (this.chopT >= 0) { this.chopT += dt; this._chopStep(dt); return; }
    const down = this.d.auto ? (this.ki < 96 || this.stT < .6) : (I.down('tDown') || I.down('confirm') && false);
    if (down) { this.held = true; this.ki += 55 * T.kiSpeed * dt; h.spose = 'breathe'; if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) KC.sfx('steamHiss', { vol: .4 }); }
    const shown = this.gauge();
    if (this.ki > 100) { this.over += dt; if (this.over > .3) { this.ki = 60; this.over = 0; this.say(KC.TEXT.tooMuch, ['#ffd0c0', '#ff5a4a']); } } else this.over = 0;
    if (!down && this.held) { this.power = clamp(shown, 0, 110); this.held = false; this.chopT = 0; h.spose = 'chop'; KC.Voice.kiai('heavy', 'taro'); KC.sfx('chopWhoosh'); }
  },
  gauge() { return clamp(this.ki + 6 * Math.sin(this.t * TAU * 2.2), 0, 115); },
  _chopStep() {
    const h = this.hero, u = this.chopT / .45;
    h.chop = { spec: { rel: true, plane: 'side', a0: 2.4, a1: -1.3, reach: 7.4, lunge: 1.4, crouch: .6, lean: .55, blade: 0 }, phase: u < .45 ? 'wind' : u < .7 ? 'active' : 'recover', u: u < .45 ? u / .45 : u < .7 ? (u - .45) / .25 : Math.min(1, (u - .7) / .3) };
    if (!this.struck && u >= .6) {
      this.struck = true; const P = this.power, N = this.n, perfect = P >= 95, nb = perfect ? N : Math.min(N, Math.floor(P / 100 * (N + .99)));
      this.broken = nb; this.points += Math.round(nb * 200 * this.mat.mul) + (perfect ? 2000 : 0);
      const g = KC.game; if (!g.reduceMotion) { g.timeScale = .3; this.fx.slowT = .4; }
      g.shake(nb ? 4 : 1); KC.sfx(nb ? 'boardCrack' : 'thudFall'); g.particles.dust(205, 0, 20, 14);
      for (let i = 0; i < nb; i++) g.particles.bits(205, 0, 26 - i * 3, 10, [this.mat.color, E.shade(this.mat.color, -.25), '#f4e8c8']);
      this.say(perfect ? 'PERFECT!' : nb === 0 || nb < N / 2 ? 'WEAK!' : nb + ' BOARDS!', perfect ? null : nb < N / 2 ? ['#ffd0c0', '#ff5a4a'] : null);
      this._end(perfect);
    }
  },
  /* ---- POTS AHOY! ---- */
  _potsInit(V) {
    const R = KC.rng(KC.hash('pots' + (this.d.story ? KC.Story.node : 0) + (V.seed || 0) + (this.d.auto ? 3 : 0))), n = V.count || 16, kinds = ['pot', 'pot', 'bonsai', 'boulder', 'pot', 'bowl', 'pot', 'boulder', 'bonsai', 'pot', 'bowl', 'boulder', 'pot', 'bonsai', 'boulder', 'pot'];
    this.seq = Array.from({ length: n }, (_, i) => { const kind = kinds[i % kinds.length], lane = kind === 'bowl' ? 'mid' : ['high', 'mid', 'low'][Math.floor(R() * 3)]; return { kind, lane, from: R() < .5 ? -1 : 1, at: 0 }; });
    let t = 1; this.seq.forEach((o, i) => { o.at = t; t += lerp(1.4, .8, i / Math.max(1, n - 1)); o.speed = lerp(150, 230, i / Math.max(1, n - 1)); });
    this.objs = []; this.next = 0; this.handled = 0; this.facing = 1; this.potClock = 0;
  },
  _pots(dt) {
    const h = this.hero, T = KC.TUNE; this.potClock += dt;
    // launch on schedule: a telegraph 0.7 s ahead (an edge arrow, a height mark), then the throw
    while (this.next < this.seq.length && this.potClock >= this.seq[this.next].at - .7) {
      const s = this.seq[this.next++], sp = s.speed * T.potSpeed * this.speedK;
      this.objs.push({ kind: s.kind, lane: s.lane, from: s.from, x: s.from < 0 ? -30 : 430, z: LANES[s.lane], vx: -s.from * sp, tele: .7, rot: 0, done: false });
    }
    let firstLive = null;
    for (const o of this.objs) {
      if (o.done) continue;
      if (o.tele > 0) { o.tele -= dt; if (!firstLive) firstLive = o; continue; }
      if (!firstLive) firstLive = o;
      o.x += o.vx * dt; o.rot += dt * 8;
      const front = h.x + Math.sign(o.x - h.x) * h.w / 2, d = Math.abs(o.x - front), toward = Math.sign(o.vx) === -Math.sign(o.x - h.x);
      // a technique of the right height breaks it (bonsai: kicks only); a block catches a bowl
      if (h.st === 'tech' && h.phase === 'active' && toward && d < 34 && Math.sign(o.x - h.x) === h.face) {
        const t = h.T, H = KC.Karateka.heightOf(t), hits = { high: ['high', 'air', 'rising'], mid: ['mid', 'midlow'], low: ['low', 'midlow'] }[o.lane];
        if (o.kind === 'bowl' && t.id === 'block') { o.done = true; this.points += 1000; this.handled++; this.say(KC.TEXT.niceCatch); KC.sfx('bowlDing'); continue; }
        if (o.kind !== 'boulder' && t.scoring && hits.includes(H) && (o.kind !== 'bonsai' || t.limb === 'foot')) {
          o.done = true; this.handled++; const g = KC.game;
          if (o.kind === 'bowl') { this.points -= 500; this.say(KC.TEXT.mottainai, ['#ffd0c0', '#ff5a4a']); KC.sfx('bowlSplash'); g.particles.bits(o.x, 0, o.z, 10, ['#f4f0e8', '#e8a040', '#ffd060']); }
          else { this.points += 200; KC.sfx('potShatter'); g.particles.bits(o.x, 0, o.z, 12, o.kind === 'bonsai' ? ['#3a5a8a', '#3a7a3a', '#5a3a22'] : ['#b8683a', '#8a4a2a', '#e8a070']); g.particles.text(o.x, 0, o.z + 12, '200', '#ffe070', { bounce: false }); }
          continue;
        }
      }
      // it reaches the body: does the posture let it pass?
      if (Math.abs(o.x - h.x) < h.w / 2 + 4) {
        const prof = h.profile(), z0 = h.z + (prof === 'flip' ? 12 : 0), z1 = h.z + (prof === 'crouch' ? h.h * .5 : prof === 'roll' ? 24 : prof === 'flip' ? 40 : h.h * .95);
        if (o.z >= z0 - 6 && o.z <= z1 + 2) {
          if (o.kind === 'bowl') { o.done = true; this.handled++; this.say('SPLASH!'); KC.sfx('bowlSplash'); continue; }
          o.done = true; h.hit('down', o.x); KC.sfx('thwackFull'); KC.game.shake(3); KC.game.particles.impact(o.x, 0, o.z, 10, '#ffffff'); this.say('OUCH!', ['#ffd0c0', '#ff5a4a']); this._end(false); return;
        }
      }
      if ((o.vx > 0 && o.x > 440) || (o.vx < 0 && o.x < -40)) { o.done = true; this.handled++; if (o.kind === 'bowl') this.say('SPLASH!'); }
    }
    // face whatever arrives first (the nearest incoming object; else the next telegraphed one)
    const inc = this.objs.filter(o => !o.done && o.tele <= 0 && Math.sign(o.vx) === -Math.sign(o.x - h.x)).sort((a, b) => Math.abs(a.x - h.x) / Math.abs(a.vx) - Math.abs(b.x - h.x) / Math.abs(b.vx))[0];
    if (inc) this.facing = Math.sign(inc.x - h.x) || 1; else if (firstLive) this.facing = firstLive.from;
    if (this.d.auto) this.autoCtl = this._potsAuto();
    if (this.next >= this.seq.length && this.objs.every(o => o.done)) { const all = this.handled >= this.seq.length; if (all) { this.points += 3000; this.say('PERFECT!'); } this._end(all); }
  },
  // the attract mode's perfect reads: the right answer to the nearest incoming object, timed to its distance
  _potsAuto() {
    const h = this.hero, o = this.objs.filter(o => !o.done && o.tele <= 0).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    if (!o || !h.free) return { posture: 'n', press: null };
    const d = Math.abs(o.x - h.x) - h.w / 2, sp = Math.abs(o.vx), dir = o.x > h.x ? 'r' : 'l';
    if (o.kind === 'boulder') { const rel = o.lane === 'mid' ? Math.max(40, sp - 126) : sp, lead = o.lane === 'low' ? .2 : o.lane === 'high' ? .45 : .42; if (d / rel < lead) return o.lane === 'low' ? { posture: 'u', press: null } : o.lane === 'high' ? { posture: 'd', press: null } : { posture: dir === 'r' ? 'l' : 'r', press: dir === 'r' ? 'l' : 'r' }; return { posture: 'n', press: null }; }
    const id = o.kind === 'bowl' ? 'block' : o.lane === 'high' ? 'roundKick' : o.lane === 'mid' ? 'frontKick' : 'lowKick', t = KC.TECH[id], st = h.frames(t)[0] * STEP + (id === 'block' ? .02 : .03);
    if (d - sp * st < 26 && d > 4) { const c = KC.cellOf(id); return { posture: KC.scrDir(c[0], o.from > 0 ? 1 : -1), press: KC.scrDir(c[1], o.from > 0 ? 1 : -1) }; }
    return { posture: 'n', press: null };
  },
  /* ---- STOP THE BULL ---- */
  bullSt() { const b = this.bull; b.st = 'idle'; b.t = 0; b.x = 372; this.bullT = 0; },
  _bull(dt) {
    const h = this.hero, b = this.bull, sp = [150, 190, 240][Math.min(2, this.charge)] * KC.TUNE.bullSpeed * this.speedK; this.bullT += dt;
    if (b.st === 'idle' && this.bullT > .8) { b.st = 'paw'; this.bullT = 0; KC.sfx('bullSnort'); }
    else if (b.st === 'paw') { if (Math.floor(this.bullT * 2.5) !== Math.floor((this.bullT - dt) * 2.5)) KC.sfx('bullStomp'); KC.game.particles.smoke(b.x - 40, -2, 30, 1, { size: .6, color: '#e8e8e8' }); if (this.bullT > 1.2) { b.st = 'charge'; b.v = sp; this.bullT = 0; KC.sfx('bullBellow'); } }
    else if (b.st === 'charge') {
      const front = h.x + h.w / 2, d = b.nose - front;
      if (h.st === 'tech' && h.phase === 'active' && !h.resolved && h.face > 0 && h.T.scoring) {
        h.resolved = true;
        if (h.T.bull && d >= 8 && d <= 40) { b.st = 'stopped'; this.bullT = 0; this.thuds++; const perfect = Math.abs(d - 24) <= 6; this.points += 3000 + (perfect ? 1000 : 0); this.say(perfect ? 'PERFECT!' : 'THUD!'); KC.sfx('bullThud'); KC.sfx('dizzy'); KC.game.shake(5); KC.game.particles.impact(b.nose, -2, 30, 14, '#ffe070'); KC.Voice.crowd(.8, 1.2); }
        else if (!h.T.bull && d <= 40) { this._trample(); return; }
      }
      if (d < 6) { this._trample(); return; }
    }
    else if (b.st === 'stopped' && this.bullT > 1.5) { b.st = 'walkBack'; this.bullT = 0; }
    else if (b.st === 'walkBack' && b.x > 372) { this.charge++; if (this.charge >= (this.V.charges || 3)) { this.points += this.thuds === 3 ? 0 : 0; this._end(this.thuds >= 3); return; } this.bullSt(); }
    else if (b.st === 'trample' && this.bullT > 2) this._end(false);
    if (this.d.auto) { const front = h.x + h.w / 2, d = b.nose - front, st = h.frames(KC.TECH.frontKick)[0] * STEP; this.autoCtl = b.st === 'charge' && h.free && d - b.v * st < 26 && d - b.v * st > 18 ? { posture: 'n', press: 'r' } : { posture: 'n', press: null }; }
  },
  _trample() { const b = this.bull, h = this.hero; b.st = 'trample'; this.bullT = 0; h.script('trampled', null); h.st = 'script'; h.z = 0; KC.sfx('thwackFull'); KC.game.shake(5); KC.game.particles.dust(h.x, 0, 0, 16); this.say(KC.TEXT.trampled, ['#ffd0c0', '#ff5a4a']); this.tumble = 0; },
  draw(r) {
    const h = this.hero;
    KC.Stage.draw(r, this.B.stage, {});
    r.actor(300, -20, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    if (this.kind === 'bull' && this.bull.st === 'trample' && h.st === 'script') { this.tumble = (this.tumble || 0) + 1 / 60; const k = Math.min(1, this.tumble / 1.2); h.z = Math.sin(k * PI) * 40; h.x = 130 - k * 60; }
    h.draw(r);
    if (this.kind === 'boards') r.queue(205, 0, 0, g => this._drawBoards(g, r));
    if (this.kind === 'pots') for (const o of this.objs) if (!o.done && o.tele <= 0) r.queue(o.x, 0, o.z, g => { const p = r.w(o.x, 0, o.z - 6), x = Math.round(p[0]), y = Math.round(p[1]), s = 1; (o.kind === 'bonsai' ? KC.Props.bonsai : o.kind === 'boulder' ? KC.Props.boulder : o.kind === 'bowl' ? KC.Props.bowl : KC.Props.clayPot)(g, x, y, s); if (o.kind === 'bowl') px.blend(g, .3, 'normal', () => px.ell(g, x, y - 12 - Math.round(Math.sin(this.t * 6) * 2), 3, 2, '#ffffff')); });
    if (this.kind === 'bull') this.bull.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (this.state === 'intro') E.font.title(g, this.banner, mid, Math.round(H * .3), { scale: W > 380 ? 3 : 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      E.font.text(g, 'BONUS ' + KC.commas(Math.max(0, this.points)), 8, 6, '#fff6e8', { outline: '#000', scale: 2 });
      if (this.d.story) E.font.text(g, '1P ' + KC.pad(KC.Story.score), 8, H - 12, '#fff6e8', { outline: '#000' });
      if (this.msgT > 0) E.font.title(g, this.msg, mid, Math.round(H * .26), { scale: 3, align: 'center', colors: this.msgC || ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      if (this.kind === 'boards') this._drawKi(g, r);
      if (this.kind === 'pots') {
        E.font.text(g, 'LEFT ' + Math.max(0, this.seq.length - this.handled), W - 8, 6, '#fff6e8', { align: 'right', outline: '#000', scale: 2 });
        for (const o of this.objs) if (!o.done && o.tele > 0) { const x = o.from < 0 ? 10 : W - 22, y = Math.round(r.w(0, 0, o.z)[1]) - 4, blink = Math.floor(this.t * 8) % 2; E.font.text(g, o.from < 0 ? '→' : '←', x, y, blink ? '#ffd060' : '#ff8a3a', { outline: '#000', scale: 2 }); E.font.text(g, o.lane.toUpperCase(), x + (o.from < 0 ? 0 : -6), y + 16, '#fff6e8', { outline: '#000', font: 'tiny' }); }
      }
      if (this.kind === 'bull') E.font.text(g, 'CHARGE ' + Math.min(3, this.charge + 1) + '/3', W - 8, 6, '#fff6e8', { align: 'right', outline: '#000', scale: 2 });
      const tips = { boards: [['tDown', 'HOLD TO BREATHE, RELEASE TO CHOP']], pots: [['tUp', 'HIGH'], ['tRight', 'MID'], ['tDown', 'LOW'], ['up', 'JUMP'], ['down', 'DUCK']], bull: [['tRight', 'FRONT KICK'], [{ kind: 'text', t: 'UPPER/LUNGE/SQUAT PUNCH, BACK KICK' }, '']] }[this.kind];
      if (this.state !== 'end' && !this.d.auto) KC.promptBar(g, W, H, tips);
      if (this.state === 'end' && this.stT > .8) E.font.title(g, 'BONUS ' + KC.commas(Math.max(0, this.points)), mid, Math.round(H * .45), { scale: 2, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'] });
    });
  },
  _drawBoards(g, r) {
    const p = r.w(205, 0, 0), x = Math.round(p[0]), y = Math.round(p[1]), s = r.view.scale, T = E.tones('#8a8a8a');
    for (const k of [-1, 1]) { px.rect(g, x + k * 14 * s - 6 * s, y - 20 * s, 12 * s, 20 * s, T.base); px.rect(g, x + k * 14 * s - 6 * s, y - 20 * s, 12 * s, 2, T.lt); px.rect(g, x + k * 14 * s - 3 * s, y - 15 * s, 6 * s, 8 * s, T.sh); }
    const M = this.mat, bh = Math.max(2, Math.round(3 * s));
    for (let i = 0; i < this.n; i++) {
      const by = y - 20 * s - (i + 1) * bh, broken = this.struck && i >= this.n - this.broken, split = broken ? Math.round(Math.min(12, this.chopT * 60)) : 0;
      if (broken) { px.rect(g, x - 22 * s - split, by + split, 21 * s, bh - 1, M.color); px.rect(g, x + 1 + split, by + split, 21 * s, bh - 1, M.color); }
      else { px.rect(g, x - 22 * s, by, 44 * s, bh - 1, M.color); px.rect(g, x - 22 * s, by, 44 * s, 1, E.shade(M.color, .25)); }
    }
  },
  _drawKi(g, r) {
    const W = r.W, x = W - 40, y = 40, h = 110, v = this.gauge(), k = clamp(v / 110, 0, 1);
    E.ui.box(g, x - 4, y - 14, 28, h + 26, { bg: '#0a0818', border: '#e8d8b0' }); E.font.text(g, 'KI', x + 10, y - 10, '#ffd060', { align: 'center', outline: false });
    px.rect(g, x, y, 20, h, '#2a2438'); const fh = Math.round(h * k), c = v >= 95 && v <= 100 ? '#fff6c0' : v > 100 ? '#ff5a4a' : '#ffb040'; px.rect(g, x, y + h - fh, 20, fh, c);
    const ly = y + h - Math.round(h * 95 / 110); px.rect(g, x - 3, ly, 26, 1, '#ffffff'); E.font.text(g, '95', x - 6, ly - 3, '#ffffff', { align: 'right', outline: '#000', font: 'tiny' });
    E.font.text(g, this.n + ' ' + this.mat.name, x + 10, y + h + 6, '#e8e0ff', { align: 'center', outline: '#000', font: 'tiny' });
  },
  debugState() { return { kind: this.kind, state: this.state, points: this.points, objectsLeft: this.kind === 'pots' ? this.seq.length - this.handled : this.kind === 'bull' ? 3 - this.charge : this.n - (this.broken || 0), ki: this.ki, bull: this.bull && this.bull.st }; }
};

// ---- src/43-drill.js ----
/* =====================================================================================================================
 * PRACTICE: Senpai Negi's drill (KC.Drill). He shows a technique ("WATCH."), then the player copies it ("NOW YOU.") within
 * 4 seconds: the right one is GOOD! (+200), or SHARP! (+400) when it starts within 50 frames; a wrong one is "NO. WATCH
 * AGAIN."; after 3 misses a hint shows the two sticks and the drill waits for it. START skips a drill. data: { lesson,
 * story, demo (the attract mode's how-to: Senpai alone, the stick icons lighting up), done }.
 * ===================================================================================================================== */
KC.Drill = class {
  constructor(lesson) { this.L = KC.LESSON[lesson] || KC.LESSON.lessonI; this.i = 0; this.state = 'watch'; this.t = 0; this.misses = 0; this.points = 0; this.passed = 0; this.result = null; this.log = []; }
  get tech() { return this.L.drills[this.i]; }
  get done() { return this.i >= this.L.drills.length; }
  /** the player started technique id (or 'crouch' held): judge it */
  attempt(id, t) {
    if (this.state !== 'now' || this.done) return null;
    if (id === this.tech) { const sharp = t <= 50 / 60; this.points += sharp ? 400 : 200; this.passed++; this.result = sharp ? 'sharp' : 'good'; this.log.push([this.tech, this.result]); this.state = 'pass'; this.t = 0; return this.result; }
    this.misses++; this.result = 'miss'; this.state = 'miss'; this.t = 0; return 'miss';
  }
  skip() { if (this.done) return; this.log.push([this.tech, 'skip']); this.next(); }
  next() { this.i++; this.misses = 0; this.state = 'watch'; this.t = 0; this.result = null; }
};
KC.PracticeScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.drill = new KC.Drill(d.lesson); this.t = 0; this.finished = false; KC.scene = this; g.timeScale = 1; g.setView('kcside');
    KC.Stage.enter(g, this.drill.L.stage); KC.music('practice');
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: 150, rank: d.story ? KC.Story.rank : 'white' }); this.senpai = new KC.Karateka({ fid: 'negi', side: 1, x: 262 });
    this.bus = new KC.Bus(); this.hero.bus = this.bus; this.senpai.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero, this.senpai] }, g, this.fx);
    this.bus.on('start', e => { if (e.f === this.hero && this.drill.state === 'now') this._judge(e.tech); });
    this.reader = d.demo ? null : new KC.Reader(g.input); this.crouchT = 0; this.ended = false; this.endT = 0;
    this.talk = d.demo ? null : new KC.Talk([['negi', this.drill.L.intro]], { auto: true });
    this.hero.release(this.senpai); this.senpai.release(this.hero); this.hero.ctlOn = false;
  },
  exit() { KC.scene = null; KC.game.weather = null; },
  _judge(id) {
    const D = this.drill, r = D.attempt(id, D.t);
    if (r === 'good' || r === 'sharp') { KC.sfx('menuOk'); KC.Voice.speak(r === 'sharp' ? KC.TEXT.sharp : KC.TEXT.good, 'negi'); KC.game.particles.text(this.hero.x, 0, 80, (r === 'sharp' ? KC.TEXT.sharp + ' +400' : KC.TEXT.good + ' +200'), r === 'sharp' ? '#ffe070' : '#ffffff', { bounce: false }); }
    else if (r === 'miss') { KC.sfx('menuBack'); KC.Voice.speak(KC.TEXT.watchAgain, 'negi'); }
  },
  update(dt) {
    const g = KC.game, D = this.drill, h = this.hero, s = this.senpai; this.t += dt; D.t += dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    if (this.talk && !this.talk.done) this.talk.update(dt);
    // the senpai stands close for the close-range punch
    const sx = D.tech === 'revPunch' ? h.x + 26 : 262; if (s.free) s.x = approach(s.x, sx, dt * 120);
    if (!this.ended && D.done) { this.ended = true; this.endT = 0; s.script('nod', null); KC.Voice.speak(KC.TEXT.lessonDone, 'negi'); KC.sting('victory'); }
    if (this.ended) { this.endT += dt; if (this.endT > (this.d.demo ? 1 : 3.2) && (this.d.demo || KC.anyPressed('confirm') || KC.anyPressed('start') || this.endT > 6)) this._finish(); }
    else if (D.state === 'watch') {
      h.ctlOn = false;
      if (D.t > .6 && D.t - dt <= .6) { KC.Voice.speak(KC.TEXT.watch, 'negi'); this._demo(); }
      if (D.t > 2.4 && s.free) {
        D.state = this.d.demo ? 'demoNext' : 'now'; D.t = 0; if (!this.d.demo) KC.Voice.speak(KC.TEXT.nowYou, 'negi');
        // back to the marks for each try (a lunge carries the hero forward; too close, a lunge would be its close variant)
        if (h.free && !h.airborne) { h.x = 150; s.x = D.tech === 'revPunch' ? 150 + 26 : 262; h.face = 1; s.face = -1; }
      }
    } else if (D.state === 'demoNext') { if (D.t > .4) D.next(); }
    else if (D.state === 'now') {
      h.ctlOn = true;
      if (D.tech === 'crouch') { this.crouchT = h.st === 'crouch' ? this.crouchT + dt : 0; if (this.crouchT > .3) this._judge('crouch'); }
      if (D.t > 4 && D.misses < 3) { D.attempt('__none', D.t); KC.Voice.speak(KC.TEXT.watchAgain, 'negi'); }
      if (KC.anyPressed('skip') && !this.d.demo) { KC.consumeAll(); D.skip(); }
    } else if (D.state === 'pass') { if (D.t > 1.2 && h.free) D.next(); }
    else if (D.state === 'miss') { if (D.t > 1.1 && h.free) { D.state = D.misses >= 3 ? 'now' : 'watch'; D.t = D.misses >= 3 ? -99 : 0; if (D.state === 'now' && !h.airborne) { h.x = 150; s.x = D.tech === 'revPunch' ? 176 : 262; } } }
    h.control(this.reader ? this.reader.read() : { posture: 'n', press: null });
    h.update(dt, s); s.update(dt, h); KC.Bout.push(h, s);
    h.pose(dt); s.pose(dt);
    KC.camera(g, [h.x, s.x]);
  },
  // the senpai performs the drill's technique into the air
  _demo() { const s = this.senpai, id = this.drill.tech; s.face = -1; if (id === 'crouch') { s.ctlOn = true; s.control({ posture: 'd', press: null }); KC.game.after(1, () => { s.control({ posture: 'n', press: null }); s.ctlOn = false; }); return; } s.ctlOn = false; s.startTech(id, null); s.face = -1; },
  _finish() {
    if (this.finished) return; this.finished = true; const D = this.drill, d = this.d, g = KC.game;
    if (d.done) { d.done(D.points); return; }
    if (d.story) { KC.Story.score += D.points; if (D.L.id === 'lessonI') g.go('cutscene', { script: 'lessonEnd', stage: 'dojo', cast: ['taro', 'negi'], next: () => KC.Story.advance() }); else KC.Story.advance(); return; }
    g.go('dojo');
  },
  draw(r) {
    const D = this.drill;
    KC.Stage.draw(r, D.L.stage, {});
    this.hero.draw(r); this.senpai.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (!D.done) {
        const T = KC.TECH[D.tech], idx = D.i + 1, card = D.L.title + '-' + idx + ': ' + T.name;
        E.ui.box(g, 10, 6, W - 20, 44, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .92 });
        E.font.text(g, card, mid, 11, '#fff6d0', { align: 'center', outline: false, scale: W > 380 && card.length < 30 ? 2 : 1 });
        const blink = D.state === 'miss' || D.misses > 0 ? Math.floor(this.t * 4) % 2 === 0 : true, parts = KC.promptFor(D.tech, KC.game.input, this.d.demo ? (Math.floor(this.t / 6) % 2 ? 'keyboard' : 'gamepad') : undefined);
        if (blink) { const w = KC.iconRow(g, 0, 0, parts, 2, false); KC.iconRow(g, mid - Math.round(w / 2), 28, parts, 2); }
        const st = D.state === 'watch' ? KC.TEXT.watch : D.state === 'now' ? KC.TEXT.nowYou : D.state === 'pass' ? (D.result === 'sharp' ? KC.TEXT.sharp : KC.TEXT.good) : D.state === 'miss' ? KC.TEXT.watchAgain : '';
        if (st) E.font.title(g, st, mid, 62, { scale: 2, align: 'center', colors: D.state === 'miss' ? ['#ffd0c0', '#ff5a4a'] : ['#fff6d0', '#ffd060', '#e8782a'] });
        if (D.misses >= 3 && D.state === 'now') { const c = KC.cellOf(D.tech) || ['d', null], p = { u: 'UP', d: 'DOWN', f: '→ TOWARD', b: '← AWAY', n: 'NEUTRAL' }[c[0]], t = c[1] ? { u: 'UP', d: 'DOWN', f: '→', b: '←' }[c[1]] : null; const hint = 'HOLD L ' + p + (t ? ', THEN PUSH R ' + t : ''); E.ui.box(g, 20, 84, W - 40, 16, { bg: '#1a3a1a', border: '#8ae08a' }); E.font.text(g, hint, mid, 88, '#d8ffd0', { align: 'center', outline: false }); }
        E.font.text(g, 'POINTS ' + D.points + '   ' + idx + '/' + D.L.drills.length, 12, H - 30, '#fff6e8', { outline: '#000' });
      } else {
        E.font.title(g, KC.TEXT.lessonDone, mid, Math.round(H * .3), { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
        E.font.text(g, D.passed + '/' + D.L.drills.length + '   +' + D.points, mid, Math.round(H * .3) + 34, '#ffffff', { align: 'center', outline: '#000', scale: 2 });
      }
      if (this.talk && !this.talk.done) this.talk.draw(g, W, H);
      if (!this.d.demo) KC.promptBar(g, W, H, D.done ? [['confirm', 'CONTINUE']] : [['skip', 'SKIP DRILL'], ['pause', 'PAUSE']]);
    });
  },
  debugState() { const D = this.drill; return { lesson: D.L.id, index: D.i, state: D.state, result: D.result, points: D.points, misses: D.misses, done: D.done }; }
};

// ---- src/50-ui.js ----
/* =====================================================================================================================
 * UI for a TV at ten feet, controller first: big menus (scale 2, at most 7 items, a pulsing focus bar and a cursor, held
 * keys repeat; the mouse's hover moves the focus and a click picks), a prompt bar that follows the device used last, the
 * cutscene dialog (portraits, typed text, gibberish voices), the title logo, panels.
 * ===================================================================================================================== */
const SC = () => (KC.game && KC.game.W >= 300 ? 2 : 1);
KC.inputs = () => (KC.game && KC.game._players) || (KC.game ? [KC.game.input] : []);
KC.anyPressed = a => KC.inputs().some(I => I.pressed(a));
KC.anyRepeat = a => KC.inputs().some(I => I.repeat(a));
KC.consumeAll = () => KC.inputs().forEach(I => I.consumeAll());
/** the pointer when it moved since this widget last looked (a real mouse or a fed pointer), else null */
KC.moved = (I, w) => { const p = I.pointer(), sig = p ? Math.round(p[0]) + ',' + Math.round(p[1]) : ''; if (sig === w._psig) return null; const first = w._psig === undefined; w._psig = sig; return first ? null : p; };
KC.Menu = class {
  /** new KC.Menu({ items: [{ label, sub, disabled, act }], title, x, y, w, scale, onCancel, onMove }) */
  constructor(o) { Object.assign(this, { x: 'center', y: 'center', w: 0, scale: 0, title: null, onCancel: null, onMove: null, i: 0, active: true }, o); this.items = o.items || []; this._rows = []; this._mt = -1; this.t = 0; this._skip(1); }
  _skip(d) { for (let k = 0; k < this.items.length && this.items[this.i] && this.items[this.i].disabled; k++) this.i = (this.i + d + this.items.length) % this.items.length; }
  get selected() { return this.items[this.i]; }
  setItems(items) { const lab = this.selected && this.selected.label; this.items = items; const k = items.findIndex(it => it.label === lab); this.i = k >= 0 ? k : Math.min(this.i, items.length - 1); this._skip(1); }
  update(dt) {
    this.t += dt; if (!this.active || !this.items.length) return false;
    const I = KC.game.input, n = this.items.length, old = this.i;
    if (KC.anyRepeat('up')) { this.i = (this.i + n - 1) % n; this._skip(-1); }
    if (KC.anyRepeat('down')) { this.i = (this.i + 1) % n; this._skip(1); }
    const row = p => { if (!p) return -1; for (const R of this._rows) if (p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h && !this.items[R.i].disabled) return R.i; return -1; };
    const pt = KC.moved(I, this); if (pt) { const k = row(pt); if (k >= 0) this.i = k; }
    const tap = row(I.clicked());
    if (tap >= 0) this.i = tap;
    if (this.i !== old) { KC.sfx('menuMove'); if (this.onMove) this.onMove(this.i, this.items[this.i]); }
    const it = this.items[this.i];
    if ((KC.anyPressed('confirm') || tap >= 0) && it && !it.disabled) { KC.sfx('menuOk'); KC.consumeAll(); if (it.act) it.act(it, this); return true; }
    if (it && it.adjust && (KC.anyRepeat('left') || KC.anyRepeat('right'))) { it.adjust(KC.anyRepeat('left') ? -1 : 1, it); KC.sfx('menuMove'); }
    if (KC.anyPressed('cancel') && this.onCancel) { KC.sfx('menuBack'); KC.consumeAll(); this.onCancel(); return true; }
    return false;
  }
  draw(g, W, H) {
    const s = this.scale || SC(), lh = 9 * s + (this.items.length > 6 ? 2 : 5), labels = this.items.map(it => it.label + (it.value !== undefined ? '  ' + it.value : ''));
    const w = Math.max(this.w, E.font.width(this.title || '', { scale: s }) + 20, ...labels.map(l => E.font.width(l, { scale: s }) + 34 * s / 2 + 20));
    const h = labels.length * lh + (this.title ? lh + 4 : 0) + 10;
    const x = this.x === 'center' ? Math.round((W - w) / 2) : this.x, y = this.y === 'center' ? Math.round((H - h) / 2) : this.y;
    E.ui.box(g, x, y, w, h, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .92 });
    let yy = y + 6;
    if (this.title) { E.font.text(g, this.title, x + w / 2, yy, '#ffd060', { align: 'center', outline: false, shadow: '#000', scale: s }); yy += lh + 4; }
    this._rows = [];
    labels.forEach((l, k) => {
      const sel = k === this.i && this.active, it = this.items[k], ry = yy + k * lh;
      this._rows.push({ x: x + 3, y: ry - 3, w: w - 6, h: lh, i: k });
      if (sel) { const pulse = .5 + .5 * Math.sin(this.t * 6); px.rect(g, x + 3, ry - 3, w - 6, lh, E.mix('#3a2a5a', '#5a3a7a', pulse)); px.rect(g, x + 3, ry - 3, 2, lh, '#ffd060'); E.font.text(g, '▸', x + 8, ry, '#ffd060', { outline: false, scale: s }); }
      E.font.text(g, l, x + 12 + 8 * s, ry, it.disabled ? '#6a6488' : sel ? '#fff6d0' : '#d8d0e8', { outline: false, shadow: '#05040a', scale: s });
    });
    this.box = { x, y, w, h };
    const sub = this.selected && this.selected.sub;
    return sub;
  }
};
/** the prompt bar: [[action, label], ...] with the glyphs of the device used last, along the bottom */
KC.promptBar = (g, W, H, items, o = {}) => {
  const I = KC.game.input, dev = KC.device(I), s = o.scale || 1, parts = [];
  for (const [a, label] of items) { const ic = typeof a === 'string' ? KC.actionIcon(a, I, dev) : a; parts.push(ic, label + '   '); }
  const w = KC.iconRow(g, 0, 0, parts, s, false), x = o.x !== undefined ? o.x : Math.round((W - w) / 2), y = o.y !== undefined ? o.y : H - 14 * s - 4;
  px.blend(g, .6, 'normal', () => px.rect(g, 0, y - 3, W, 14 * s + 6, '#05040a'));
  KC.iconRow(g, x, y, parts, s);
};
/** a centred panel with a title (10-foot: big text, few lines) */
KC.panel = (g, x, y, w, h, title) => {
  E.ui.box(g, x, y, w, h, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .94 });
  if (title) E.font.title(g, title, x + Math.round(w / 2), y + 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
};
/** the title logo: KARATE over CHAMPON, the O a noodle bowl with chopsticks and steam */
KC.drawLogo = (g, W, y, t, s = 4) => {
  const cols = ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'];
  E.font.title(g, 'KARATE', Math.round(W / 2), y, { scale: Math.max(2, s - 2), align: 'center', colors: ['#ffffff', '#ffd0a0', '#e86a3a'], depth: 2 });
  const y2 = y + 9 * (s - 2) + 6, a = 'CHAMP', b = 'N', wa = E.font.width(a, { scale: s }), wb = E.font.width(b, { scale: s }), bw = 8 * s, tot = wa + bw + wb + 2 * s, x0 = Math.round((W - tot) / 2);
  E.font.title(g, a, x0, y2, { scale: s, colors: cols, depth: 3 });
  E.font.title(g, b, x0 + wa + bw + 2 * s, y2, { scale: s, colors: cols, depth: 3 });
  const bx = x0 + wa + s + Math.round(bw / 2), by = y2 + Math.round(4.2 * s);   // the bowl
  px.ell(g, bx, by + s, Math.round(bw / 2) + 1, Math.round(2.6 * s), '#7a2a10'); px.ell(g, bx, by, Math.round(bw / 2), Math.round(2.4 * s), '#f4ecd8'); px.rect(g, bx - Math.round(bw / 2), by - Math.round(.6 * s), bw, Math.round(1.2 * s), '#e0662a'); px.ell(g, bx, by - Math.round(.8 * s), Math.round(bw / 2) - 1, Math.round(.7 * s), '#ffd060');
  for (let i = 0; i < 3; i++) px.rect(g, bx - Math.round(bw / 3) + i * Math.round(bw / 3), by + Math.round(.8 * s), 2, 2, '#c84a2a');
  px.line(g, bx + 2, by - Math.round(4 * s), bx + Math.round(bw / 2) + 3, by - Math.round(.6 * s), '#c8a060', Math.max(1, Math.round(s / 3))); px.line(g, bx + 5, by - Math.round(4.4 * s), bx + Math.round(bw / 2) + 6, by - Math.round(1 * s), '#a88040', Math.max(1, Math.round(s / 3)));
  for (let i = 0; i < 3; i++) { const sy = by - Math.round(3 * s) - ((t * 10 + i * 6) % (4 * s)); px.blend(g, .5, 'normal', () => px.ell(g, bx - Math.round(bw / 4) + i * Math.round(bw / 4) + Math.round(Math.sin(t * 2 + i) * 2), Math.round(sy), 2, 2, '#ffffff')); }
  return y2 + 9 * s + 4;
};

/* ---- the cutscene dialog: [speaker, text] lines; 'card' lines are full-screen title cards ---- */
KC.Talk = class {
  constructor(lines, o = {}) { this.lines = lines; this.i = 0; this.t = 0; this.chars = 0; this.done = false; this.o = o; this.rigs = {}; this.spoke = -1; this.dur = 1; }
  rig(who) {
    if (this.rigs[who]) return this.rigs[who];
    const R = who === 'genkotsu' ? KC.makeOfficial(2) : who === 'mei' && !this.o.meiGi ? KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a', belt: '#c8302a' } }) : KC.makeRig(who, 'white', who === 'taro' ? (this.o.rank || 'white') : null);
    for (let i = 0; i < 4; i++) R.update(.05, { x: 0, y: 0, z: 0, facing: PI / 2, expr: 'smile' });
    return (this.rigs[who] = R);
  }
  get line() { return this.lines[this.i] || null; }
  update(dt) {
    if (this.done) return;
    const L = this.line; if (!L) { this.finish(); return; }
    if (this.spoke !== this.i) { this.spoke = this.i; this.chars = 0; this.t = 0; this.dur = KC.Voice.speak(L[1], L[0] === 'card' ? null : L[0]); }
    this.t += dt; this.chars = Math.min(L[1].length, Math.floor(this.t * 40));
    const r = this.rigs[L[0]]; if (r) r.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, expr: this.chars < L[1].length ? 'shout' : 'smile' });
    const I = KC.game.input, adv = KC.anyPressed('confirm') || KC.anyPressed('skip') || !!I.clicked();
    if (KC.DEV && KC.DEV.skipCutscenes) { this.finish(); return; }
    if (adv && this.t > .15) { KC.consumeAll(); if (this.chars < L[1].length) this.t = 99; else this.next(); }
    else if (this.o.auto && this.t > Math.max(1.6, this.dur + 1)) this.next();
  }
  next() { this.i++; if (this.i >= this.lines.length) this.finish(); }
  finish() { if (this.done) return; this.done = true; if (this.o.onDone) this.o.onDone(); }
  draw(g, W, H) {
    const L = this.line; if (!L || this.done) return;
    const s = SC(), text = L[1].slice(0, this.chars);
    if (L[0] === 'card') {
      px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      const lines = E.font.wrap(text, W - 40, { scale: s });
      lines.forEach((l, k) => E.font.title(g, l, Math.round(W / 2), Math.round(H / 2 - lines.length * 10 * s / 2) + k * 11 * s, { scale: s, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }));
    } else {
      const bh = 58, y = H - bh - 22, rig = this.rig(L[0]), name = L[0] === 'genkotsu' ? 'JUDGE GENKOTSU' : KC.FIGHTER[L[0]].name;
      E.ui.box(g, 8, y, W - 16, bh, { bg: ['#1c1630', '#0c0a18'], border: '#e8d8b0', alpha: .95 });
      rig.drawPortrait(g, 14, y + 6, 44, { frame: true, bg: '#2a2040' });
      E.font.text(g, name, 66, y + 6, L[0] === 'mei' ? '#ff8aa8' : L[0] === 'genkotsu' ? '#8ab0ff' : '#ffd060', { outline: false, shadow: '#000' });
      const lines = E.font.wrap(text, W - 90, { scale: s > 1 && W > 380 ? 2 : 1 });
      lines.slice(0, 3).forEach((l, k) => E.font.text(g, l, 66, y + 18 + k * (s > 1 && W > 380 ? 18 : 10), '#fff6e8', { outline: false, shadow: '#000', scale: s > 1 && W > 380 ? 2 : 1 }));
    }
    if (this.chars >= L[1].length && Math.floor(KC.game.real * 3) % 2 === 0) KC.iconRow(g, W - 40, H - 18, [KC.actionIcon('confirm')], 1);
  }
};

// ---- src/51-front.js ----
/* =====================================================================================================================
 * TITLE and ATTRACT. The title: the dojo at night, Taro and Mei in kamae bowing now and then, the logo, PRESS START, then
 * the main menu (a live vignette for the focused item). Ten seconds with no input on the title or any menu screen starts
 * the attract mode (any input ends it): an exhibition bout a director steers so it shows every call, a bonus reel, a
 * how-to-fight drill, the high scores and the title, looping. On a touch-only device the title says a controller or a
 * keyboard is required (the corner's settings button stays) and the attract mode still runs.
 * ===================================================================================================================== */
KC.IDLE_SECONDS = 10;
/** any input at all this step: a key or button, a stick past the dead zone, a mouse move or click, a tap */
KC.anyInput = () => KC.inputs().some(I => I.anyPressed() || (I.mouse && I.mouse.t !== I._kcMT && (I._kcMT = I.mouse.t, I._kcSeen ? true : (I._kcSeen = true, false))) || !!I.clicked() || Math.hypot(...(I.padMove || [0, 0])) > .3 || !!I.padAim);
/** the idle clock every menu screen runs: returns true once it reached ten seconds (the caller starts the attract mode) */
KC.idleStep = dt => { if (KC.anyInput()) KC.idle = 0; else KC.idle += dt; return KC.idle >= KC.IDLE_SECONDS; };
const MENU_ABOUT = {
  CONTINUE: 'PICK UP THE ROAD WHERE YOU LEFT IT', 'CHAMPON ROAD': 'FROM WHITE BELT TO CHAMP: 9 MATCHES, 3 BONUS STAGES', VERSUS: 'WHITE VS RED: A FRIEND OR THE CPU. 3-4 JOINED: KACHINUKI',
  DOJO: "SENPAI NEGI'S LESSONS, FREE SPAR, THE MOVE LIST", 'BONUS GAMES': 'BOARDS, POTS AHOY!, STOP THE BULL', RECORDS: 'THE TOP TEN TABLES', OPTIONS: 'DIFFICULTY, REFEREE CALLS, CAMERA, BUTTON SYMBOLS', ABOUT: 'SOURCE, TESTING, ENGINE AND PROMPT NOTES, CREDITS'
};
KC.TitleScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.t = 0; this.menuOn = !!d.menu; KC.idle = 0; KC.Story.active = false; g.timeScale = 1; g.setView('kcside');
    KC.Stage.enter(g, 'dojo'); g.lights.ambient = .4; KC.music('title'); g.audio.duck(false);
    this.a = new KC.Karateka({ fid: 'taro', side: 0, x: 168 }); this.b = new KC.Karateka({ fid: 'mei', side: 1, x: 232 }); for (const f of [this.a, this.b]) f.script('kamae', null);
    this.buildMenu();
  },
  buildMenu() {
    const g = KC.game, auto = g.saves.list ? g.saves.list().find(s => s.slot === 'auto' && !s.empty && !s.damaged) : null, items = [];
    if (auto) items.push({ label: 'CONTINUE', sub: (auto.level || '') + ' - ' + (auto.place || ''), act: () => { if (g.saves.load('auto')) KC.Story.run(); } });
    items.push({ label: 'CHAMPON ROAD', act: () => { KC.Story.newGame(); KC.Story.run(); } }, { label: 'VERSUS', act: () => g.go('versus') }, { label: 'DOJO', act: () => g.go('dojo') },
      { label: 'BONUS GAMES', act: () => g.go('bonusMenu') }, { label: 'RECORDS', act: () => g.go('records') }, { label: 'OPTIONS', act: () => g.menu('settings') }, { label: 'ABOUT', act: () => g.go('about') });
    this.menu = new KC.Menu({ items, y: 92, onCancel: () => { this.menuOn = false; } });
  },
  update(dt) {
    const g = KC.game; this.t += dt; KC.Stage.update(dt);
    if (KC.idleStep(dt) && !g.paused && !(g.shell && g.shell.screen)) { g.go('attract'); return; }
    const touchGate = KC.touchOnly();
    if (!touchGate && !this.menuOn && this.t > .3 && (KC.anyPressed('start') || KC.anyPressed('confirm') || g.input.clicked())) { KC.consumeAll(); KC.sfx('menuOk'); this.menuOn = true; this.buildMenu(); }
    else if (this.menuOn && !(g.shell && g.shell.screen)) this.menu.update(dt);
    // Taro and Mei face each other; a bow every few seconds
    const bow = (this.t % 6) > 4.6 && (this.t % 6) < 5.6;
    for (const f of [this.a, this.b]) { f.spose = bow ? 'bow' : 'kamae'; f.update(dt, f === this.a ? this.b : this.a); f.pose(dt); }
    KC.camera(g, [200]);
  },
  draw(r) {
    KC.Stage.draw(r, 'dojo', {});
    this.a.draw(r); this.b.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, ca = KC.game.cornerArea && KC.game.cornerArea(), top = ca && ca.x0 < W / 2 + 110 ? Math.ceil(ca.y1) : 0;
      px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, (this.menuOn ? 56 : 78) + top, '#05040a'));
      const yEnd = KC.drawLogo(g, W, (this.menuOn ? 4 : 8) + top, this.t, this.menuOn ? 3 : 4);
      if (KC.touchOnly()) {
        const w = Math.min(W - 30, 300); KC.panel(g, Math.round((W - w) / 2), Math.round(H / 2) - 6, w, 48, null);
        E.font.text(g, KC.TEXT.touchGate, Math.round(W / 2), Math.round(H / 2) + 6, '#ffe7a8', { align: 'center', outline: false, scale: W > 360 ? 2 : 1 });
        E.font.text(g, 'SETTINGS: THE BUTTON AT THE TOP RIGHT', Math.round(W / 2), Math.round(H / 2) + 28, '#c8c0e8', { align: 'center', outline: false });
        return;
      }
      if (!this.menuOn) {
        if (Math.floor(this.t * 2) % 2 === 0) { const dev = KC.device(), parts = dev === 'gamepad' ? ['PRESS ', KC.actionIcon('confirm', KC.game.input, 'gamepad')] : ['PRESS ', KC.actionIcon('start', KC.game.input, 'keyboard')]; const w = KC.iconRow(g, 0, 0, parts, 2, false); KC.iconRow(g, Math.round((W - w) / 2), H - 58, parts, 2); }
        E.font.text(g, (E.versionLabel ? E.versionLabel().replace(/·/g, '-') : 'v' + E.version) + ' - KARATE CHAMPON ' + KC.VERSION, Math.round(W / 2), H - 12, '#6a6488', { align: 'center', outline: false });
        E.font.text(g, 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', Math.round(W / 2), H - 23, '#8a80a8', { align: 'center', outline: false });
      } else {
        this.menu.y = yEnd + 2;
        this.menu.draw(g, W, H);
        const it = this.menu.selected, about = it && (it.sub || MENU_ABOUT[it.label]); if (about) E.font.text(g, about, Math.round(W / 2), H - 34, '#ffe7a8', { align: 'center', outline: '#000' });
        KC.promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]);
      }
      void yEnd;
    });
  }
};

/* ---- ATTRACT ---- */
// the exhibition's director: each exchange a little script, so the demo shows a half point, a full point, an aiuchi, a block
// and a counter sweep, a somersault cross-up, then a time-out decided by the judges
const EXCHANGES = ['half', 'full', 'aiuchi', 'block', 'flip', 'hantei'];
KC.Director = {
  start(sc) { sc.dir = { ex: 0, t: 0, phase: null, step: 0 }; },
  step(sc, dt) {
    const D = sc.dir, b = sc.bout, [W, R] = sc.fighters; if (!b) return;
    if (b.phase !== 'fight') { D.phase = b.phase; D.t = 0; D.step = 0; return; }
    if (D.phase !== 'fight') { D.phase = 'fight'; D.t = 0; D.step = 0; D.kind = EXCHANGES[Math.min(D.ex, EXCHANGES.length - 1)]; D.ex++; if (D.kind === 'hantei') { b.clock = Math.min(b.clock, 6); const m = Math.max(...b.points); b.points = [m, m]; } }
    D.t += dt; const gap = W.gapTo(R), idle = { posture: 'n', press: null }, toward = (f, k = 'f') => ({ posture: KC.scrDir(k, f.face), press: null }), reach = (f, id, k = .8) => f.band(KC.TECH[id])[1] * k;
    const want = (f, id) => { const c = KC.cellOf(id); return { posture: KC.scrDir(c[0], f.face), press: KC.scrDir(c[1], f.face) }; };
    let cw = idle, cr = idle;
    if (D.kind === 'half') { if (gap > reach(W, 'frontKick', .62)) cw = toward(W); else if (!D.step && W.free) { cw = want(W, 'frontKick'); D.step = 1; } }
    else if (D.kind === 'full') { if (gap > reach(R, 'roundKick', .9)) cr = toward(R); else if (!D.step && R.free) { cr = want(R, 'roundKick'); D.step = 1; } }
    else if (D.kind === 'aiuchi') { if (gap > Math.min(reach(W, 'frontKick', .7), reach(R, 'frontKick', .7))) { cw = toward(W); cr = toward(R); } else if (!D.step && W.free && R.free) { cw = want(W, 'frontKick'); cr = want(R, 'frontKick'); D.step = 1; } }
    else if (D.kind === 'block') {
      if (D.step === 0) { if (gap > reach(W, 'midLunge', .8)) cw = toward(W); else if (W.free) { cw = want(W, 'midLunge'); D.step = 1; } }
      else if (D.step === 1 && W.phase === 'wind' && W.k > W.fr[0] - 8 && R.free) { cr = want(R, 'block'); D.step = 2; }
      else if (D.step === 2 && R.free && W.blockedBy) { cr = want(R, gap < 30 ? 'backSweep' : 'frontSweep'); D.step = 3; }
    }
    else if (D.kind === 'flip') {
      if (D.step === 0) { if (gap > 40) cw = toward(W); else if (gap < 28) cw = toward(W, 'b'); else if (W.free) { cw = { posture: 'u', press: KC.scrDir('u', W.face) }; D.step = 1; } }
      else if (D.step === 1 && W.free && W.x > R.x === (W.face > 0)) { D.step = 2; }
      else if (D.step === 2 && W.free) { cw = want(W, 'roundKick'); D.step = 3; }
      else if (D.step === 1 && R.free && D.t > .2 && D.t < .5) cr = want(R, 'roundKick');
    }
    else if (D.kind === 'hantei') { const ph = Math.floor(D.t * 1.5) % 4; cw = ph === 0 ? toward(W) : ph === 2 ? toward(W, 'b') : idle; cr = ph === 1 ? toward(R) : ph === 3 ? toward(R, 'b') : idle; if (Math.floor(D.t * 2) % 5 === 2 && R.free && gap > 50) cr = want(R, 'block'); }
    W.control(cw); R.control(cr);
  }
};
KC.AttractScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter() { this.loop = (this.loop || 0); this.stepI = 0; this.t = 0; KC.game.audio.duck(true); this._begin(); KC.idle = 0; this._armed = false; },
  exit() { KC.game.audio.duck(false); this.sub = null; KC.scene = null; KC.game.timeScale = 1; },
  steps: ['bout', 'bonus', 'howto', 'scores', 'title'],
  _begin() {
    const g = KC.game, step = this.steps[this.stepI], R = KC.rng(this.loop * 97 + 13); this.t = 0; this.sub = null; this.step = step;
    if (step === 'bout') {
      const ids = KC.DATA.roster.map(f => f.id), a = ids[Math.floor(R() * ids.length)], b = ids.filter(x => x !== a)[Math.floor(R() * (ids.length - 1))], st = KC.FIGHT_STAGES[Math.floor(R() * KC.FIGHT_STAGES.length)];
      const sub = Object.create(KC.FightScene); this.sub = sub;
      sub.enter({ mode: 'attract', stage: st, seed: this.loop + 1, sides: [{ fid: a, showcase: true }, { fid: b, showcase: true }], rules: { pointsToWin: 3, roundsToWin: 1, clock: 30 }, director: true, onEnd: () => { this.subDone = true; } });
      KC.Director.start(sub); this.subDone = false; this.limit = 60;
    } else if (step === 'bonus') { const sub = Object.create(KC.BonusScene); this.sub = sub; this.reel = ['boards', 'pots', 'bull']; this.reelI = 0; sub.enter({ id: 'boards', auto: true, done: () => this._nextReel() }); this.limit = 45; }
    else if (step === 'howto') { const sub = Object.create(KC.PracticeScene); this.sub = sub; sub.enter({ lesson: 'lessonAll', demo: true, done: () => { this.subDone = true; } }); this.limit = 30; this.subDone = false; }
    else if (step === 'scores') { this.limit = 6; KC.Stage.enter(g, 'stadium'); }
    else { this.limit = 5; KC.Stage.enter(g, 'dojo'); }
  },
  _nextReel() { this.reelI++; if (this.reelI >= this.reel.length) { this.subDone = true; return; } const sub = Object.create(KC.BonusScene); this.sub = sub; sub.enter({ id: this.reel[this.reelI], auto: true, done: () => this._nextReel(), limit: this.reel[this.reelI] === 'pots' ? 15 : 0 }); },
  _advance() { this.stepI++; if (this.stepI >= this.steps.length) { this.stepI = 0; this.loop++; } this._begin(); },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    if (this._armed && KC.anyInput()) { KC.consumeAll(); KC.game.go('title'); return; }
    this._armed = true;
    if (this.sub) {
      if (this.step === 'bout') { const s = this.sub; s.controls(dt); KC.Director.step(s, dt); KC.fx.step(KC.game, s.fx, dt); s.bout.update(dt); KC.camera(KC.game, s.fighters.map(f => f.x)); }
      else this.sub.update(dt);
    } else KC.camera(KC.game, [200]);
    if (this.subDone && this.step === 'bout' && this.sub.endT === undefined) this.sub.endT = 0;
    if ((this.subDone && (this.step !== 'bout' || (this.sub.endT += dt) > 1.5)) || this.t > this.limit) this._advance();
  },
  draw(r) {
    if (this.sub) this.sub.draw(r);
    else if (this.step === 'scores') { KC.Stage.draw(r, 'stadium', {}); r.overlay(g => KC.drawTable(g, r.W, r.H, 'story', 'HIGH SCORES')); }
    else { KC.Stage.draw(r, 'dojo', {}); r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); KC.drawLogo(g, r.W, 40, this.t, 4); }); }
    r.overlay(g => {
      const W = r.W, H = r.H, blink = Math.floor(KC.game.real * 2) % 2 === 0;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, H - 20, W, 20, '#05040a'));
      if (blink) E.font.text(g, KC.TEXT.demo, Math.round(W / 2), H - 15, '#ffd060', { align: 'center', outline: false, scale: 1 });
      if (KC.touchOnly()) E.font.text(g, KC.TEXT.touchGate, Math.round(W / 2), H - 30, '#ffe7a8', { align: 'center', outline: '#000' });
    });
  },
  debugState() { return { step: this.step, stepI: this.stepI, loop: this.loop, t: this.t }; }
};
/** a top-ten table drawn big: ten rows of NAME SCORE (and the rank reached) */
KC.drawTable = (g, W, H, mode, title) => {
  const T = KC.Save.table(mode), w = Math.min(W - 20, 300), x = Math.round((W - w) / 2), y = 20, rh = Math.min(18, Math.floor((H - 70) / 10));
  KC.panel(g, x, y, w, rh * 10 + 34, title || mode.toUpperCase());
  T.slice(0, 10).forEach((e, i) => {
    const yy = y + 28 + i * rh, c = i === 0 ? '#ffd060' : i < 3 ? '#fff6d0' : '#d8d0e8';
    E.font.text(g, (i + 1) + '.', x + 16, yy, c, { outline: false }); E.font.text(g, e.name, x + 40, yy, c, { outline: false, scale: rh >= 16 ? 2 : 1 });
    E.font.text(g, KC.commas(e.score), x + w - 16 - (e.note ? 70 : 0), yy, c, { align: 'right', outline: false, scale: rh >= 16 ? 2 : 1 }); if (e.note) E.font.text(g, e.note, x + w - 12, yy + 2, '#a8a0c8', { align: 'right', outline: false, font: 'tiny' });
  });
};

// ---- src/52-story.js ----
/* =====================================================================================================================
 * THE CHAMPON ROAD: the story ladder and the screens around it: the road (a painted scroll of the stops), cutscenes,
 * VS cards, promotions, the continue, game over, initials, the ending and the credits parade. KC.Save keeps the unlocks
 * and the top-ten tables; the story autosaves after each node (game.saves, the title's CONTINUE).
 * ===================================================================================================================== */
const TABLE0 = {
  story: [['MEI', 250000, 'CHAMP'], ['KYA', 180000, '8TH DAN'], ['ASA', 140000, '5TH DAN'], ['BUT', 110000, '3RD DAN'], ['IKA', 90000, '1ST DAN'], ['KIK', 70000, 'BROWN'], ['EBI', 50000, 'BLUE'], ['NEG', 30000, 'GREEN'], ['KAM', 15000, 'YELLOW'], ['TAR', 5000, 'WHITE']],
  boards: [['NEG', 6000], ['MEI', 5000], ['KAM', 4000], ['TAR', 3000], ['EBI', 2400], ['IKA', 2000], ['BUT', 1600], ['ASA', 1200], ['KIK', 800], ['KYA', 400]],
  pots: [['MEI', 9000], ['EBI', 7000], ['IKA', 6000], ['TAR', 5000], ['ASA', 4000], ['NEG', 3000], ['KAM', 2400], ['BUT', 1800], ['KIK', 1200], ['KYA', 600]],
  bull: [['BUT', 13000], ['KYA', 10000], ['MEI', 9000], ['NEG', 6000], ['TAR', 3000], ['EBI', 3000], ['IKA', 3000], ['ASA', 3000], ['KIK', 3000], ['KAM', 3000]]
};
KC.Save = {
  data: null,
  load() { const d = KC.store.get('save', null); this.data = { unlocks: {}, tables: {} }; if (d && typeof d === 'object') { Object.assign(this.data.unlocks, d.unlocks || {}); Object.assign(this.data.tables, d.tables || {}); } for (const k in TABLE0) if (!Array.isArray(this.data.tables[k])) this.data.tables[k] = TABLE0[k].map(([name, score, note]) => ({ name, score, note: note || '' })); },
  persist() { KC.store.set('save', this.data); },
  unlock(id) { if (!this.data) this.load(); if (!this.data.unlocks[id]) { this.data.unlocks[id] = true; this.persist(); return true; } return false; },
  unlocked(id) { if (!this.data) this.load(); return !!this.data.unlocks[id] || !!(KC.DEV && KC.DEV.unlockAll); },
  table(mode) { if (!this.data) this.load(); return this.data.tables[mode] || []; },
  /** a score makes the table (never while the tuning is changed: DEV) */
  qualifies(mode, score) { if (KC.tuneChanged() || score <= 0) return false; const T = this.table(mode); return T.length < 10 || score > T[T.length - 1].score; },
  enter(mode, name, score, note) { const T = this.table(mode); T.push({ name, score, note: note || '' }); T.sort((a, b) => b.score - a.score); T.length = Math.min(T.length, 10); this.persist(); return T.findIndex(e => e.name === name && e.score === score); },
  hi(mode) { const T = this.table(mode); return T.length ? T[0].score : 0; },
  reset() { this.data = null; KC.store.set('save', null); this.load(); }
};
KC.Story = {
  node: 0, rank: 'white', score: 0, lost: {}, assist: false, active: false, stats: { matches: 0, perfect: 0 },
  newGame() { Object.assign(this, { node: 0, rank: 'white', score: 0, lost: {}, assist: false, active: true, stats: { matches: 0, perfect: 0 } }); },
  state() { return { node: this.node, rank: this.rank, score: this.score, lost: this.lost, stats: this.stats, difficulty: KC.settings.difficulty }; },
  restore(d) { Object.assign(this, { node: d.node || 0, rank: d.rank || 'white', score: d.score || 0, lost: d.lost || {}, stats: d.stats || { matches: 0, perfect: 0 }, active: true, assist: false }); },
  get current() { return KC.DATA.ladder[this.node]; },
  rankName() { return KC.DATA.ranks[KC.rankIndex(this.rank)].name; },
  save() { const n = this.current; try { KC.game.saves.autosave(); } catch (e) { /* storage blocked */ } void n; },
  /** the next node, saved */
  advance() { this.node++; this.assist = false; this.save(); this.run(); },
  /** go to whatever the current node needs */
  run() {
    const n = this.current, g = KC.game;
    if (!n) { g.go('title'); return; }
    if (n.kind === 'cutscene') g.go('cutscene', { script: n.script, stage: n.stage, cast: n.script === 'prologue' ? ['taro', 'negi'] : ['taro'], next: () => this.advance() });
    else if (n.kind === 'ending') g.go('cutscene', this.endingData());
    else g.go('road', {});
  },
  /** start the node shown on the road (after its pre-match scene) */
  play() {
    const n = this.current, g = KC.game;
    if (n.kind === 'practice') g.go('practice', { lesson: n.lesson, story: true });
    else if (n.kind === 'bonus') { const go = () => g.go('bonus', { id: n.bonus, story: true }); if (n.script) g.go('cutscene', { script: n.script, stage: n.stage, cast: ['mei', 'taro'], next: go }); else go(); }
    else if (n.kind === 'match') { const go = () => g.go('vscard', this.matchData()); if (n.script) g.go('cutscene', { script: n.script, stage: n.stage, cast: n.opponent === 'mei' ? ['taro', 'mei'] : ['mei', 'taro'], meiGi: n.opponent === 'mei', next: go }); else go(); }
  },
  matchData() {
    const n = this.current, self = this, retry = () => KC.game.go('vscard', self.matchData());
    return { mode: 'story', stage: n.stage, hints: !!n.hints, mei: KC.STAGE[n.stage].mei && n.opponent !== 'mei' && this.node > 5, assist: this.assist, seed: this.node * 13 + (this.lost[n.opponent] || 0) + 1,
      sides: [{ fid: 'taro', rank: this.rank, input: KC.game.input }, { fid: n.opponent }], score: this.score, hi: KC.Save.hi('story'), retry,
      tip: (this.lost[n.opponent] || 0) >= 2 ? KC.FIGHTER[n.opponent].tip : null,
      onEnd: (w, b) => { b.storyResult = w; },
      afterEnd: (sc, dt) => { if (sc.endT < 1.2) return; sc.d.afterEnd = null; self.matchOver(sc.winner, sc.bout); } };
  },
  matchOver(w, b) {
    const n = this.current, g = KC.game;
    this.stats.matches++;
    if (w === 0) {
      this.score += b.score[0]; if (b.perfect) this.stats.perfect++;
      const from = this.rank; this.rank = n.promote || this.rank; const ri = KC.rankIndex(this.rank); this.score += 1000 * ri;
      if (n.unlock) KC.Save.unlock(n.unlock);
      g.go('promotion', { from, to: this.rank, next: () => { if (n.after) g.go('cutscene', { script: n.after, stage: n.stage, cast: ['mei', 'taro'], next: () => this.advance() }); else this.advance(); } });
    } else {
      this.lost[n.opponent] = (this.lost[n.opponent] || 0) + b.roundWins[1];
      g.go('continue', { opponent: n.opponent });
    }
  },
  endingData() { return { script: 'ending', stage: 'stadium', cast: ['taro', 'mei'], meiGi: true, trophy: true, next: () => { KC.Save.unlock('mei'); KC.Save.unlock('classic'); KC.game.go('credits', { story: true }); } }; }
};

/* ---- the road: a painted scroll of the stops, the next one pulsing ---- */
const ROAD_ICON = { practice: 'SCROLL', boards: 'BOARDS', pots: 'POTS', bull: 'BULL' };
KC.RoadScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter() { this.t = 0; this.pan = null; this.gone = false; KC.music('select'); KC.game.lights.enabled = false; this.stops = KC.DATA.ladder.map((n, i) => ({ n, i })).filter(s => s.n.kind !== 'cutscene' && s.n.kind !== 'ending'); this.hover = -1; },
  _xy(k, W, H) { return [60 + k * 74, Math.round(H * .54 + Math.sin(k * 1.3) * 20)]; },
  _face(fid) { this.faces = this.faces || {}; if (!this.faces[fid]) { const r = KC.makeRig(fid, 'red', null); for (let i = 0; i < 4; i++) r.update(.05, { x: 0, y: 0, z: 0, facing: PI / 2 + .4, expr: 'angry' }); this.faces[fid] = r; } return this.faces[fid]; },
  update(dt) {
    this.t += dt; const I = KC.game.input, cur = KC.Story.node, ci = this.stops.findIndex(s => s.i === cur), W = KC.game.W, H = KC.game.H;
    const want = clamp(this._xy(ci, W, H)[0] - W / 2, 0, Math.max(0, this._xy(this.stops.length - 1, W, H)[0] + 60 - W));
    this.pan = this.pan === null ? want : approach(this.pan, want, dt * 300);
    const p = I.pointer(), c = I.clicked(); this.hover = -1;
    this.stops.forEach((s, k) => { const [x, y] = this._xy(k, W, H), sx = x - this.pan; if (p && Math.hypot(p[0] - sx, p[1] - y) < 14) this.hover = k; if (c && s.i === cur && Math.hypot(c[0] - sx, c[1] - y) < 14) this._go(); });
    if (this.t > .4 && (KC.anyPressed('confirm') || KC.anyPressed('start'))) this._go();
    if (KC.anyPressed('cancel')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  _go() { if (this.gone) return; this.gone = true; KC.consumeAll(); KC.sfx('menuOk'); KC.Story.play(); },
  exit() { this.gone = false; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, cur = KC.Story.node;
      px.rect(g, 0, 0, W, H, '#2a1a10');
      px.rect(g, 0, 26, W, H - 60, '#e8d8b0'); for (let y = 30; y < H - 36; y += 3) px.rect(g, 0, y, W, 1, (y % 9) ? '#e4d2a8' : '#dccaa0');
      px.rect(g, 0, 26, W, 3, '#8a5a2a'); px.rect(g, 0, H - 37, W, 3, '#8a5a2a');
      // a painted vignette over each stop: its place in ink and wash
      this.stops.forEach((s, k) => { const [x0, y] = this._xy(k, W, H), x = Math.round(x0 - this.pan), up = k % 2 === 0, vy = up ? y - 58 : y + 22; if (x < -60 || x > W + 60) return; KC.roadVignette(g, s.n.stage, x, vy, this.t); });
      // the road
      this.stops.forEach((s, k) => { if (k) { const [x0, y0] = this._xy(k - 1, W, H), [x1, y1] = this._xy(k, W, H); for (let u = 0; u < 1; u += .08) px.rect(g, Math.round(lerp(x0, x1, u) - this.pan), Math.round(lerp(y0, y1, u)), 2, 2, s.i <= cur ? '#8a3a1a' : '#a8946a'); } });
      this.stops.forEach((s, k) => {
        const [x0, y] = this._xy(k, W, H), x = x0 - this.pan, n = s.n, done = s.i < cur, next = s.i === cur;
        if (x < -30 || x > W + 30) return;
        const R = next ? 11 + Math.round(Math.sin(this.t * 6) * 2) : 9;
        px.disc(g, x, y, R + 2, '#3a2010'); px.disc(g, x, y, R, done ? '#c8a060' : next ? '#ffd060' : '#bca880');
        if (n.kind === 'match') { const rig = this._face(n.opponent); rig.drawPortrait(g, x - R + 2, y - R + 2, 2 * R - 3, { zoom: 2.4, bg: done ? '#c8a060' : next ? '#ffd060' : '#bca880', tint: done ? '#a08060' : undefined }); }
        else E.font.text(g, n.kind === 'practice' ? 'L' + ({ lessonI: 'I', lessonII: 'II', lessonIII: 'III' }[n.lesson] || '') : ROAD_ICON[n.bonus][0] + ROAD_ICON[n.bonus][1], x, y - 3, '#2a1408', { align: 'center', outline: false, font: 'tiny' });
        if (done && n.promote) { const b = KC.DATA.ranks[KC.rankIndex(n.promote)].belt; px.rect(g, x - 8, y + R + 3, 16, 3, b); }
        if (k === this.hover || next) { const label = n.kind === 'match' ? KC.STAGE[n.stage].name : n.kind === 'practice' ? KC.LESSON[n.lesson].title : KC.BONUS[n.bonus].name, below = k % 2 === 0; const lw = E.font.width(label) + 8, ly = below ? y + R + 6 : y - R - 16; E.ui.box(g, x - lw / 2, ly - 2, lw, 12, { bg: '#5a2a10', border: '#ffd060', gradient: false }); E.font.text(g, label, x, ly, '#fff6d0', { align: 'center', outline: false }); }
      });
      E.font.title(g, 'THE CHAMPON ROAD', Math.round(W / 2), 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      const n = KC.Story.current, what = !n ? '' : n.kind === 'match' ? 'NEXT: ' + KC.STAGE[n.stage].name + ' - ' + KC.FIGHTER[n.opponent].name : n.kind === 'practice' ? 'NEXT: ' + KC.LESSON[n.lesson].title + ' WITH SENPAI NEGI' : 'NEXT: BONUS STAGE! ' + KC.BONUS[n.bonus].name;
      E.font.text(g, what, Math.round(W / 2), H - 30, '#fff6e8', { align: 'center', outline: '#1a0c08', scale: W > 380 ? 1 : 1 });
      E.font.text(g, KC.Story.rankName() + '   SCORE ' + KC.commas(KC.Story.score), Math.round(W / 2), 30 - 0, '#5a2a10', { align: 'center', outline: false });
      KC.promptBar(g, W, H, [['confirm', 'GO'], ['cancel', 'MAIN MENU']]);
    });
  }
};

/** a stop's place on the road, in ink and a wash of colour (48 x 34) */
KC.roadVignette = (g, stage, x, y, t) => {
  const w = 48, h = 34, x0 = x - w / 2, ink = '#3a2414', wash = (c, f) => px.blend(g, .45, 'normal', f || (() => px.rect(g, x0, y, w, h, c)));
  E.ui.box(g, x0 - 2, y - 2, w + 4, h + 4, { bg: '#efe2c0', border: '#8a6a3a', gradient: false });
  if (stage === 'dojo') { wash('#e8c080'); px.poly(g, [[x0 + 4, y + 14], [x, y + 4], [x0 + w - 4, y + 14]], ink); px.rect(g, x0 + 9, y + 14, w - 18, 16, '#c8a060'); for (let i = 0; i < 4; i++) px.rect(g, x0 + 12 + i * 7, y + 17, 5, 10, '#f4ecd0'); }
  else if (stage === 'harbor') { wash('#8ab0e0'); for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) px.rect(g, x0 + 3 + k * 8 + (i % 2) * 4, y + 18 + i * 5, 5, 1, '#3a5a9a'); px.poly(g, [[x0 + 14, y + 16], [x0 + 32, y + 16], [x0 + 29, y + 20], [x0 + 17, y + 20]], ink); px.rect(g, x0 + 23, y + 4, 1, 12, ink); px.poly(g, [[x0 + 24, y + 5], [x0 + 32, y + 14], [x0 + 24, y + 14]], '#f4f4f0'); }
  else if (stage === 'bamboo') { wash('#a8d890'); for (let i = 0; i < 7; i++) { px.rect(g, x0 + 4 + i * 6, y + 2, 2, h - 4, '#3a7a3a'); for (let k = 0; k < 3; k++) px.rect(g, x0 + 3 + i * 6, y + 6 + k * 9 + (i % 3), 4, 1, ink); } }
  else if (stage === 'log') { wash('#a8c0d0'); px.poly(g, [[x0, y + h], [x0 + 8, y + 6], [x0 + 14, y + h]], '#5a6470'); px.poly(g, [[x0 + w, y + h], [x0 + w - 8, y + 8], [x0 + w - 14, y + h]], '#5a6470'); px.rect(g, x0 + 8, y + 16, w - 16, 4, '#6a4a2a'); px.rect(g, x0 + 21, y + 22, 6, h - 22, '#e8f4fc'); }
  else if (stage === 'ship') { wash('#f0a070'); px.disc(g, x, y + 20, 6, '#ffd890'); px.poly(g, [[x0 + 6, y + 22], [x0 + w - 6, y + 22], [x0 + w - 12, y + 30], [x0 + 12, y + 30]], ink); px.rect(g, x, y + 4, 1, 18, ink); px.poly(g, [[x + 1, y + 6], [x + 14, y + 18], [x + 1, y + 18]], '#f4ece0'); }
  else if (stage === 'market') { wash('#3a3050'); px.line(g, x0 + 2, y + 8, x0 + w - 2, y + 10, ink, 1); for (let i = 0; i < 5; i++) { const lx = x0 + 6 + i * 9; px.ell(g, lx, y + 13, 3, 4, '#e8402a'); } px.rect(g, x0 + 10, y + 20, w - 20, 12, '#5a2a1a'); px.rect(g, x0 + 14, y + 22, w - 28, 8, '#ffc870'); }
  else if (stage === 'fuji') { wash('#e8b0c0'); px.poly(g, [[x0 + 4, y + h - 4], [x - 6, y + 6], [x + 6, y + 6], [x0 + w - 4, y + h - 4]], '#6a5a9a'); px.poly(g, [[x - 6, y + 6], [x + 6, y + 6], [x + 10, y + 12], [x - 10, y + 12]], '#f4f0fa'); px.disc(g, x0 + 8, y + 24, 5, '#f890b0'); }
  else if (stage === 'stadium') { wash('#2a2a5a'); for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 9; i++) px.disc(g, x0 + 4 + i * 5 + (r2 % 2) * 2, y + 8 + r2 * 5, 2, '#c8a080'); px.rect(g, x0 + 6, y + 24, w - 12, 6, '#3a5ad8'); KC.Props.goldenBowl(g, x, y + 44, 1, t); }
  else if (stage === 'courtyard') { wash('#e8dcc0'); for (let i = 0; i < 5; i++) px.rect(g, x0 + 10, y + 10 + i * 3, w - 20, 2, '#d8b070'); px.rect(g, x0 + 12, y + 25, 6, 6, '#8a8a8a'); px.rect(g, x0 + w - 18, y + 25, 6, 6, '#8a8a8a'); }
  else if (stage === 'fishmarket') { wash('#c8e0f0'); KC.Props.clayPot(g, x - 10, y + 28, 1); KC.Props.bonsai(g, x + 4, y + 28, 1); KC.Props.bowl(g, x + 16, y + 26, 1); }
  else if (stage === 'pasture') { wash('#a8d890'); px.ell(g, x, y + 20, 12, 7, '#4a2e22'); px.ell(g, x + 12, y + 18, 5, 5, '#4a2e22'); px.line(g, x + 10, y + 13, x + 6, y + 8, '#e8dcc0', 2); px.line(g, x + 14, y + 13, x + 18, y + 8, '#e8dcc0', 2); for (const k of [-8, -3, 4, 8]) px.rect(g, x + k, y + 25, 2, 6, '#3a2418'); }
};
/* ---- a cutscene on a stage: the cast stands, the speaker gestures, the lines play ---- */
const GESTURE = ['point', 'hips', 'cross', 'nod', 'wave'];
KC.CutsceneScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    this.d = d; const lines = KC.SCRIPTS[d.script] || [['card', '...']]; this.t = 0;
    this.talk = new KC.Talk(lines, { meiGi: d.meiGi, rank: KC.Story.rank, onDone: () => { KC.consumeAll(); if (d.next) d.next(); } });
    KC.Stage.enter(KC.game, d.stage || 'dojo'); KC.music(d.script === 'ending' ? 'ending' : KC.STAGE[d.stage || 'dojo'].music);
    const cast = d.cast || ['taro']; this.cast = cast.map((fid, i) => { const x = cast.length === 1 ? 200 : 160 + i * 80, side = fid === 'mei' && !d.meiGi ? null : i === 0 ? 'white' : 'red'; const rig = fid === 'mei' && !d.meiGi ? KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a', belt: '#c8302a' } }) : KC.makeRig(fid, side, fid === 'taro' ? KC.Story.rank : null); return { fid, x, rig, face: i === 0 ? 0 : PI }; });
    if (d.script !== 'prologue' && d.script !== 'ending' && this.cast.length === 2 && d.script !== 'finalEntrance') this.cast.forEach(c => { c.face = c.x < 200 ? 0 : PI; });
    this.ref = d.script === 'ending' || d.script === 'finalEntrance' ? KC.makeOfficial(2.1) : null;
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); this.talk.update(dt);
    const L = this.talk.line, sp = L && L[0];
    this.cast.forEach((c, i) => { const speaking = sp === c.fid; KC.poseStep(c.rig, dt, { point: speaking && i % 2 === 0 ? 1 : 0, cross: !speaking && c.fid === 'negi' ? 1 : 0, nod: speaking ? .6 + .4 * Math.sin(this.t * 5) : 0 }); c.rig.update(dt, { x: c.x, y: 0, z: 0, facing: c.face, pose: speaking && i % 2 ? 'hips' : this.d.script === 'ending' && c.fid === 'taro' && this.t > 3 ? 'cheer' : null, expr: speaking ? 'shout' : 'smile', stance: c.fid === 'taro' && this.d.script !== 'ending' ? 'guard' : null }); });
    if (this.ref) { KC.poseStep(this.ref, dt, { sig: sp === 'genkotsu' ? (this.d.script === 'ending' ? 'winner' : 'point') : null, side: 1 }); this.ref.update(dt, { x: 200, y: -18, z: 0, facing: PI / 2 }); }
    KC.camera(KC.game, [180, 220]);
  },
  draw(r) {
    KC.Stage.draw(r, this.d.stage || 'dojo', { noCrowd: false, mei: false });
    if (this.ref) r.actor(200, -18, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    for (const c of this.cast) { r.actor(c.x, 0, 0, (g, ox, oy) => { c.rig.draw(g, ox, oy, r.view); if (c.rig.kcBeard) KC.drawBeard(g, c.rig, r, c.rig.kcBeard, ox, oy); }); r.shadow(c.x, 0, 14, .35); }
    if (this.d.trophy) r.queue(200, 10, 0, g => { const p = r.w(232, 0, 46); KC.Props.goldenBowl(g, Math.round(p[0]), Math.round(p[1]) + 40, 1, this.t); });
    r.overlay(g => { this.talk.draw(g, r.W, r.H); KC.promptBar(g, r.W, r.H, [['confirm', 'NEXT'], ['skip', 'SKIP LINE']]); });
  }
};

/* ---- the VS card: white left, red right, the stage, the opponent's taunt typed with its voice ---- */
KC.VsCardScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.gone = false; KC.music('select'); KC.game.lights.enabled = false;
    this.rigs = d.sides.map((s, i) => { const r = KC.makeRig(s.fid, i ? 'red' : 'white', s.rank); for (let k = 0; k < 5; k++) r.update(.05, { x: 0, y: 0, z: 0, facing: i ? PI - .5 : .5, expr: 'angry', stance: 'guard' }); return r; });
    const opp = KC.FIGHTER[d.sides[1].fid]; this.quote = opp.quotes.intro; this.spoke = false; KC.sfx('taikoHit');
  },
  update(dt) {
    this.t += dt; if (!this.spoke && this.t > .5) { this.spoke = true; KC.Voice.speak(this.quote, this.d.sides[1].fid); }
    this.rigs.forEach((r, i) => r.update(dt, { x: 0, y: 0, z: 0, facing: i ? PI - .5 : .5, expr: this.t > .5 ? 'angry' : null, stance: 'guard' }));
    const go = this.t > (this.d.tip ? 4.5 : 2.6) || (this.t > .6 && (KC.anyPressed('confirm') || KC.anyPressed('start') || KC.game.input.clicked()));
    if (go && !this.gone) { this.gone = true; KC.consumeAll(); KC.game.go('fight', this.d); }
  },
  exit() { this.gone = false; },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, k = clamp(this.t / .3, 0, 1), mid = Math.round(W / 2);
      px.rect(g, 0, 0, W, H, '#05040a');
      px.poly(g, [[0, 0], [Math.round(mid * k + 20), 0], [Math.round(mid * k - 20), H], [0, H]], '#d8d4ca'); px.poly(g, [[W, 0], [W - Math.round(mid * k - 20), 0], [W - Math.round(mid * k + 20), H], [W, H]], '#a8201a');
      this.rigs.forEach((rig, i) => rig.drawPortrait(g, i ? W - 18 - 110 : 18, 34, 110, { frame: true, bg: i ? '#5a1010' : '#8a8478', zoom: 2.4 }));
      E.font.title(g, 'VS', mid, Math.round(H * .4), { scale: 4, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 });
      this.d.sides.forEach((s, i) => { const F = KC.FIGHTER[s.fid], R = KC.DATA.ranks[KC.rankIndex(s.rank || F.rank)], x = i ? W - 18 : 18, al = i ? 'right' : 'left'; E.font.text(g, s.name || F.name, x, 152, '#fff6e8', { align: al, outline: '#000', scale: 2 }); E.font.text(g, (i ? 'RED' : 'WHITE') + ' - ' + R.name, x, 172, i ? '#ffc0b0' : '#2a2a30', { align: al, outline: false }); E.font.text(g, F.title, x, 184, i ? '#ffd8c8' : '#3a3a40', { align: al, outline: false }); });
      E.font.text(g, KC.STAGE[this.d.stage].name, mid, 12, '#ffd060', { align: 'center', outline: '#000', scale: 2 });
      const q = this.quote.slice(0, Math.max(0, Math.floor((this.t - .5) * 34))); if (q) E.font.text(g, '"' + q + (q.length === this.quote.length ? '"' : ''), mid, H - 46, '#ffffff', { align: 'center', outline: '#000' });
      if (this.d.tip) { E.ui.box(g, 20, H - 34, W - 40, 16, { bg: '#1a3a1a', border: '#8ae08a' }); E.font.text(g, 'TIP: ' + this.d.tip, mid, H - 30, '#d8ffd0', { align: 'center', outline: false }); }
    });
  }
};

/* ---- the promotion: Genkotsu presents the belt; it flies to the waist; the rank road lights the new one ---- */
KC.PromotionScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.d = d; this.t = 0; this.gone = false; KC.sting('promotion'); KC.music(null); this.taro = KC.makeRig('taro', 'white', d.from); this.ref = KC.makeOfficial(2.1); KC.Stage.enter(KC.game, 'dojo'); this.tied = false; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    if (!this.tied && this.t > 1.4) { this.tied = true; this.taro = KC.makeRig('taro', 'white', this.d.to); KC.sfx('beltTie'); KC.game.particles.glints(180, 0, 30, 14, '#ffe070'); KC.Voice.speak('PROMOTED!', 'genkotsu'); KC.Stage.cheer = 1; KC.Voice.crowd(.8, 1.4); }
    KC.poseStep(this.taro, dt, { bow: this.t > .4 && this.t < 1.1 ? 1 : 0 }); this.taro.update(dt, { x: 180, y: 0, z: 0, facing: 0, pose: this.t > 2 ? 'cheer' : null, expr: this.t > 1.4 ? 'smile' : null });
    KC.poseStep(this.ref, dt, { point: this.t < 1.4 ? 1 : 0, bow: this.t > .4 && this.t < 1.1 ? 1 : 0 }); this.ref.update(dt, { x: 225, y: 0, z: 0, facing: PI });
    KC.camera(KC.game, [180, 225]);
    if (this.t > 2.6 && (KC.anyPressed('confirm') || KC.anyPressed('start') || KC.game.input.clicked() || this.t > 6)) { if (!this.gone) { this.gone = true; KC.consumeAll(); this.d.next(); } }
  },
  exit() { this.gone = false; },
  draw(r) {
    KC.Stage.draw(r, 'dojo', {});
    r.actor(180, 0, 0, (g, ox, oy) => this.taro.draw(g, ox, oy, r.view)); r.actor(225, 0, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H, R = KC.DATA.ranks[KC.rankIndex(this.d.to)];
      if (this.t < 1.4) { const k = clamp((this.t - .6) / .8, 0, 1), p0 = r.w(222, 0, 40), p1 = r.w(181, 0, 30); const x = Math.round(lerp(p0[0], p1[0], k)), y = Math.round(lerp(p0[1], p1[1], k) - Math.sin(k * PI) * 30); px.rect(g, x - 10, y, 20, 4, R.belt); px.rect(g, x - 10, y, 20, 1, E.shade(R.belt, .4)); }
      E.font.title(g, 'PROMOTED!', Math.round(W / 2), 22, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 });
      if (this.t > 1.2) E.font.title(g, R.name, Math.round(W / 2), 52, { scale: 2, align: 'center', colors: ['#ffffff', E.shade(R.belt, .3), R.belt === '#16161c' ? '#8a8a9a' : R.belt] });
      // the rank road: ten belts, the new one lit
      const n = KC.DATA.ranks.length, ri = KC.rankIndex(this.d.to), w = 22, x0 = Math.round(W / 2 - n * w / 2);
      KC.DATA.ranks.forEach((rk, i) => { const x = x0 + i * w, on = i <= ri, cur = i === ri && this.t > 1.4; px.rect(g, x + 2, H - 46, w - 4, 6, on ? rk.belt : '#2a2438'); if (rk.id === 'champ' && on) px.rect(g, x + 2, H - 46, w - 4, 2, '#fff6c0'); if (cur) { px.rect(g, x, H - 49, w, 1, '#ffd060'); px.rect(g, x, H - 38, w, 1, '#ffd060'); } });
      E.font.text(g, '+' + KC.commas(1000 * ri) + '  RANK BONUS', Math.round(W / 2), H - 34, '#ffe08a', { align: 'center', outline: '#000' });
      if (this.t > 2.6) KC.promptBar(g, W, H, [['confirm', 'CONTINUE']]);
    });
  }
};

/* ---- CONTINUE? A 10-second countdown; continuing retries with the score reset and the rank kept ---- */
KC.ContinueScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.last = 10; KC.music('continue'); KC.game.lights.enabled = false; this.mei = KC.makeRig('mei', null, 'champ', { cloth: '#f4ece0', pants: '#3a3a52', colors: { trim: '#c8302a' } });
    this.menu = new KC.Menu({ items: [{ label: 'CONTINUE', act: () => this._yes(false) }, { label: 'CONTINUE (EASIER)', sub: 'LOWER DIFFICULTY FOR THIS MATCH?', act: () => this._yes(true) }, { label: 'GIVE UP', act: () => this._no() }], y: 120 });
    KC.Voice.speak(KC.TEXT.getUp, 'mei');
  },
  _yes(easy) { KC.Story.score = 0; KC.Story.assist = easy; KC.game.go('vscard', KC.Story.matchData()); },
  _no() { KC.game.go('gameover', {}); },
  update(dt) {
    this.t += dt; const left = Math.max(0, 10 - this.t), sec = Math.ceil(left);
    if (sec !== this.last) { this.last = sec; KC.sfx('countBeep'); }
    this.mei.update(dt, { x: 0, y: 0, z: 0, facing: PI / 2, pose: 'hips', expr: 'angry' });
    if (left <= 0) { this._no(); return; }
    this.menu.update(dt);
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.rect(g, 0, 0, W, H, '#0a0610');
      E.font.title(g, KC.TEXT.cont, Math.round(W / 2), 16, { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c0302a'], depth: 3 });
      E.font.title(g, String(Math.max(0, Math.ceil(10 - this.t) - 1)), Math.round(W / 2), 52, { scale: 5, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 });
      this.mei.drawPortrait(g, W - 80, 20, 60, { frame: true, bg: '#3a1a2a' }); E.font.text(g, '"' + KC.TEXT.getUp + '"', W - 50, 86, '#ff9ab8', { align: 'center', outline: false });
      const sub = this.menu.draw(g, W, H); if (sub) E.font.text(g, sub, Math.round(W / 2), H - 32, '#c8c0e8', { align: 'center', outline: false });
      KC.promptBar(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};

/* ---- GAME OVER: Taro kneels in the rain ---- */
KC.GameOverScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() { this.t = 0; this.gone = false; KC.music('gameover'); KC.Stage.enter(KC.game, 'dojo'); KC.game.weather = { kind: 'rain', amount: .7, wind: .2 }; KC.game.lights.ambient = .35; this.taro = KC.makeRig('taro', 'white', KC.Story.rank); this.ref = KC.makeOfficial(2.1); this.talk = new KC.Talk(KC.SCRIPTS.gameOver, { auto: true, onDone: () => {} }); KC.Story.active = false; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); this.talk.update(dt);
    this.taro.update(dt, { x: 185, y: 0, z: 0, facing: 0, pose: 'kneel', expr: 'wince' }); KC.poseStep(this.ref, dt, { cross: 1 }); this.ref.update(dt, { x: 225, y: 0, z: 0, facing: PI });
    KC.camera(KC.game, [185, 225]);
    if (this.t > 2.5 && (KC.anyPressed('confirm') || KC.anyPressed('start') || this.t > 7)) this._next();
  },
  _next() { if (this.gone) return; this.gone = true; KC.consumeAll(); const sc = KC.Story.score; if (KC.Save.qualifies('story', sc)) KC.game.go('initials', { mode: 'story', score: sc, note: KC.DATA.ranks[KC.rankIndex(KC.Story.rank)].name.replace('BLACK BELT ', ''), next: () => KC.game.go('title') }); else KC.game.go('title'); },
  exit() { this.gone = false; KC.game.weather = null; },
  draw(r) {
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    r.actor(185, 0, 0, (g, ox, oy) => this.taro.draw(g, ox, oy, r.view)); r.actor(225, 0, 0, (g, ox, oy) => this.ref.draw(g, ox, oy, r.view));
    r.overlay(g => { E.font.title(g, KC.TEXT.gameOver, Math.round(r.W / 2), 30, { scale: 4, align: 'center', colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depth: 3 }); this.talk.draw(g, r.W, r.H); });
  }
};

/* ---- INITIALS: three letters on a wheel (up and down turn it, left and right move, confirm takes a letter) ---- */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!- ';
KC.InitialsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [],
  enter(d) { this.d = d; this.name = [0, 0, 0]; this.i = 0; this.t = 0; KC.music('ending'); this.done = false; },
  update(dt) {
    this.t += dt; if (this.done) return;
    const n = LETTERS.length, I = KC.game.input, c = I.clicked();
    if (KC.anyRepeat('up')) { this.name[this.i] = (this.name[this.i] + 1) % n; KC.sfx('menuMove'); }
    if (KC.anyRepeat('down')) { this.name[this.i] = (this.name[this.i] + n - 1) % n; KC.sfx('menuMove'); }
    if (KC.anyRepeat('left')) this.i = Math.max(0, this.i - 1);
    if (KC.anyRepeat('right')) this.i = Math.min(2, this.i + 1);
    if (c && this.cells) for (const [k, x0, y0, w, h, dir] of this.cells) if (c[0] >= x0 && c[0] < x0 + w && c[1] >= y0 && c[1] < y0 + h) { if (dir === 'ok') this.i = 3; else { this.i = k; this.name[k] = (this.name[k] + dir + n) % n; } }
    if (KC.anyPressed('confirm') || this.i === 3) { KC.consumeAll(); KC.sfx('menuOk'); if (this.i < 2) this.i++; else this._finish(); }
    if (KC.anyPressed('cancel') && this.i > 0) { KC.consumeAll(); this.i--; }
  },
  _finish() { this.done = true; const nm = this.name.map(k => LETTERS[k]).join('').trim() || 'AAA'; this.rank = KC.Save.enter(this.d.mode, nm, this.d.score, this.d.note); KC.game.after(1.4, () => this.d.next ? this.d.next() : KC.game.go('records', { mode: this.d.mode })); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2); px.rect(g, 0, 0, W, H, '#0a0818');
      E.font.title(g, 'NEW HIGH SCORE!', mid, 16, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
      E.font.text(g, KC.commas(this.d.score) + '  ' + ({ story: 'CHAMPON ROAD', boards: 'BREAK THE BOARDS', pots: 'POTS AHOY!', bull: 'STOP THE BULL' }[this.d.mode] || ''), mid, 52, '#ffe7a8', { align: 'center', outline: false, scale: 2 });
      this.cells = [];
      for (let k = 0; k < 3; k++) {
        const x = mid - 66 + k * 44, y = 96, on = k === this.i && !this.done, L = LETTERS[this.name[k]];
        E.ui.box(g, x, y, 36, 44, { bg: on ? '#3a2a5a' : '#1a1430', border: on ? '#ffd060' : '#8a7ab0' });
        E.font.title(g, L === ' ' ? '_' : L, x + 18, y + 10, { scale: 3, align: 'center', colors: on ? ['#ffffff', '#ffd060'] : ['#c8c0e8', '#8a80a8'] });
        E.font.text(g, '↑', x + 18, y - 12, on ? '#ffd060' : '#5a5078', { align: 'center', outline: false, scale: 2 }); E.font.text(g, '↓', x + 18, y + 48, on ? '#ffd060' : '#5a5078', { align: 'center', outline: false, scale: 2 });
        this.cells.push([k, x, y - 16, 36, 16, 1], [k, x, y + 44, 36, 18, -1]);
      }
      const ok = this.i === 3; E.ui.box(g, mid + 70, 108, 34, 20, { bg: ok ? '#3a5a2a' : '#1a2a1a', border: '#8ae08a' }); E.font.text(g, 'OK', mid + 87, 113, '#d8ffd0', { align: 'center', outline: false }); this.cells.push([3, mid + 70, 108, 34, 20, 'ok']);
      if (this.done) E.font.text(g, 'RANK ' + (this.rank + 1) + '!', mid, 170, '#ffd060', { align: 'center', outline: '#000', scale: 2 });
      KC.promptBar(g, W, H, [['up', 'LETTER'], ['right', 'NEXT'], ['confirm', 'TAKE']]);
    });
  }
};

/* ---- the ending's credits parade: the cast walks in and bows, each with a name; then the credits ---- */
KC.CreditsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d || {}; this.t = 0; this.gone = false; KC.music('ending'); KC.Stage.enter(KC.game, 'stadium');
    this.cast = KC.DATA.roster.map((F, i) => ({ F, rig: KC.makeRig(F.id, F.id === 'mei' ? 'red' : 'white', F.rank), at: 1 + i * 2.2, x: -60 }));
    this.lines = ['KARATE CHAMPON', 'AN ORIGINAL GAME INSPIRED BY KARATE CHAMP (1984)', 'BUILT ON THE MY-3D2DGE ENGINE', 'ART, ANIMATION, MUSIC, VOICES: ALL WRITTEN IN CODE', 'PROPS: KENNEY AND KAYKIT (CC0)', 'CLAUDE OPUS 5.5 (ANTHROPIC)', 'THANK YOU FOR PLAYING!'];
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt);
    for (const c of this.cast) { const lt = this.t - c.at; const tx = 200; if (lt > 0) c.x = lt < 1.2 ? lerp(-40, tx, lt / 1.2) : lt < 2.2 ? tx : lerp(tx, 460, (lt - 2.2) / 1.2); KC.poseStep(c.rig, dt, { bow: lt > 1.2 && lt < 2 ? 1 : 0 }); c.rig.update(dt, { x: c.x, y: 0, z: 0, vx: lt > 0 && (lt < 1.2 || lt > 2.2) && lt < 3.4 ? 70 : 0, facing: lt > 1.2 && lt < 2.2 ? PI / 2 : 0, expr: 'smile' }); }
    KC.camera(KC.game, [200]);
    const end = this.cast[this.cast.length - 1].at + 4 + this.lines.length * 1.4;
    if (this.t > end || (this.t > 1 && KC.anyPressed('start'))) this._next();
  },
  _next() { if (this.gone) return; this.gone = true; KC.consumeAll(); const sc = KC.Story.score; if (this.d.story && KC.Save.qualifies('story', sc)) KC.game.go('initials', { mode: 'story', score: sc, note: 'CHAMP', next: () => KC.game.go('title') }); else KC.game.go('title'); },
  exit() { this.gone = false; },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    for (const c of this.cast) if (this.t > c.at && c.x < 470) r.actor(c.x, 0, 0, (g, ox, oy) => { c.rig.draw(g, ox, oy, r.view); if (c.rig.kcBeard) KC.drawBeard(g, c.rig, r, c.rig.kcBeard, ox, oy); });
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      const cur = this.cast.find(c => this.t - c.at > 1 && this.t - c.at < 2.6); if (cur) { E.font.title(g, cur.F.name, mid, 40, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); E.font.text(g, cur.F.title, mid, 62, '#e8e0ff', { align: 'center', outline: '#000' }); }
      const lt = this.t - (this.cast[this.cast.length - 1].at + 3.4);
      if (lt > 0) { E.font.title(g, KC.TEXT.champon, mid, 30, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); this.lines.forEach((l, k) => { if (lt > k * 1.2) E.font.text(g, l, mid, 60 + k * 16, k === 0 ? '#ffd060' : '#fff6e8', { align: 'center', outline: '#000' }); }); }
      KC.promptBar(g, W, H, [['start', 'SKIP']]);
    });
  }
};
// the autosave's contents (the title's CONTINUE loads it)
KC.hookSaves = game => { game.saves.write = () => ({ data: KC.Story.state(), place: KC.Story.current ? KC.STAGE[KC.Story.current.stage].name : 'THE ROAD', level: KC.Story.rankName() }); game.saves.read = s => { KC.Story.restore(s.data); }; };

// ---- src/53-scene-fight.js ----
/* =====================================================================================================================
 * THE FIGHT SCENE, for every mode: story, versus, kachinuki (winner stays on), attract (CPU showcase), freeSpar (a dummy,
 * no referee) and online (driven by KC.Net). data: { mode, stage, sides: [{ fid, rank, input | null, cpu: level,
 * name, color }, ...], rules, hints, onEnd(winner, bout) }.
 * ===================================================================================================================== */
KC.views = () => (KC.settings && KC.settings.camera === 'Tatami 2.5D' ? 'kctatami' : 'kcside');
KC.camera = (game, xs, extraZ = 0) => {
  const v = game.view, s = v.scale, mid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 200;
  const half = game.W / 2 / s, cx = clamp(mid, Math.min(200, KC.ARENA.x0 - 40 + half), Math.max(200, KC.ARENA.x1 + 40 - half));
  const floorAt = game.H <= 300 ? game.H - 62 : Math.round(game.H * .62), fz = (floorAt - game.H / 2) / s / Math.max(.5, Math.cos(v.pitch || 0));   // the mat 62 px above the bottom; lower-middle on a tall screen
  game.focus(cx, v.isSide ? 0 : 6, fz + extraZ);
};
KC.fx = {
  // the shared effects of a bout's events (sound, particles, the crowd, slow motion)
  attach(bout, game, o = {}) {
    const P = game.particles, B = bout.bus;
    B.on('active', d => { const t = KC.TECH[d.tech]; if (!t) return; if (t.kiai) KC.Voice.kiai(t.kiai, d.f.fid); KC.sfx(t.kiai === 'heavy' ? 'whooshH' : 'whooshL', { pitch: .9 + d.f.side * .1 }); });
    B.on('point', d => {
      const full = d.full, c = full ? '#ffe070' : '#ffffff';
      P.impact(d.x, 0, d.z, full ? 12 : 8, c); P.sparks(d.x, 0, d.z, full ? 16 : 9, null, { color: c }); P.dust(d.x, 0, 4, 6);
      game.shake(full ? 4 : 2); if (full) game.flash('#ffffff', .08, .6);
      for (const I of KC.inputs()) I.rumble && I.rumble(full ? .8 : .45, full ? .25 : .12);
      KC.sfx(full ? 'thwackFull' : 'thwackHalf'); KC.Voice.crowd(full ? 1 : .6, full ? 1.6 : 1.1); KC.Stage.cheer = Math.min(1, KC.Stage.cheer + (full ? 1 : .6));
      KC.HUD.popup(game, d);
      if (full && !game.reduceMotion && !o.noSlow) { game.timeScale = KC.TUNE.gameSpeed * .35; o.slowT = .35; }
    });
    B.on('aiuchi', () => { const [a, b] = bout.f, x = (a.x + b.x) / 2; P.impact(x, 0, 50, 10, '#ffffff'); P.sparks(x, 0, 50, 12, null, { color: '#ffd0a0' }); KC.sfx('thwackHalf'); KC.sfx('clack'); game.shake(2); KC.Voice.crowd(.5, .9); });
    B.on('block', d => { P.sparks(d.x, 0, d.z, 8, null, { color: '#8ac8ff' }); P.impact(d.x, 0, d.z, 6, '#a0d8ff'); KC.sfx('clack'); KC.Voice.crowd(.35, .7); });
    B.on('land', d => { if (d.heavy) { KC.sfx('thudFall'); P.dust(d.f.x, 0, 0, 10); game.shake(1.5); } else KC.sfx('land', { vol: .6 }); });
    B.on('card', d => { KC.sfx('gong'); if (d.last) KC.sfx('taikoHit'); });
    B.on('whistle', () => KC.sfx('whistle'));
    B.on('flag', () => KC.sfx('flagSnap'));
    B.on('roundEnd', d => { KC.Voice.crowd(1, 2); KC.Stage.cheer = 1; KC.sting(d.perfect ? 'perfect' : 'victory'); });
    B.on('start', d => { const t = KC.TECH[d.tech]; if (t && (t.flip || t.id === 'backRoll')) { KC.sfx('whooshL', { pitch: .7 }); } if (t && t.spin) KC.sfx('pivot'); });
  },
  step(game, o, dt) { if (o.slowT > 0) { o.slowT -= game.real - (o._real || game.real); if (o.slowT <= 0) game.timeScale = KC.TUNE.gameSpeed; } o._real = game.real; }
};

KC.FightScene = {
  view: 'kcside', views: ['kcside', 'kctatami'], input: KC_KEYS, res: 'ps1', pausable: !SESSION, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const game = KC.game; d = d || {}; this.d = d; this.mode = d.mode || 'versus'; this.stage = d.stage || 'dojo'; game.setView(KC.views());
    this.fx = { noSlow: this.mode === 'online' }; game.timeScale = KC.timeScale(); KC.scene = this; this.ended = false; this.endT = 0; this.over = false;
    const sides = d.sides || [{ fid: 'taro' }, { fid: 'kamaboko', cpu: 1 }], classic = KC.settings && KC.settings.palette === 'Classic';
    this.fighters = sides.map((s, i) => new KC.Karateka({ fid: s.fid, side: i, rank: s.rank, classic }));
    this.readers = sides.map(s => s.input ? new KC.Reader(s.input) : null);
    const diff = (KC.settings && KC.settings.difficulty) || 'Normal';
    this.ai = sides.map((s, i) => s.input ? null : new KC.KarateAI({ fid: s.fid, level: KC.TUNE.cpuLevel > 0 && this.mode !== 'attract' ? KC.TUNE.cpuLevel : s.cpu || KC.FIGHTER[s.fid].ai.level, difficulty: this.mode === 'story' ? (d.assist ? 'Easy' : diff) : 'Normal', seed: (d.seed || 1) * 7 + i, showcase: !!s.showcase }));
    this.sides = sides;
    if (this.mode === 'freeSpar') { this.spar = { dummy: d.dummy || 'stand', last: null, hits: [] }; this.bout = null; this.fighters[0].release(this.fighters[1]); this.fighters[1].release(this.fighters[0]); this.fighters[0].ctlOn = true; this.fighters[1].ctlOn = true; this.bus = new KC.Bus(); for (const f of this.fighters) f.bus = this.bus; KC.fx.attach({ bus: this.bus, f: this.fighters }, game, this.fx); this.ref = null; }
    else {
      this.ref = new KC.Referee(); this.bout = new KC.Bout({ fighters: this.fighters, referee: this.ref, seed: d.seed || 1, rules: d.rules || {}, mode: this.mode, onMatchEnd: (w, b) => this._end(w, b) });
      KC.fx.attach(this.bout, game, this.fx);
    }
    KC.Stage.enter(game, this.stage); KC.music(KC.STAGE[this.stage].music);
    this.hint = null; this.hintT = 0; this.hintI = (d.seed || 0) % KC.HINTS.length;
    KC.camera(game, this.fighters.map(f => f.x));
    game.cam.snap = true;
  },
  exit() { KC.game.timeScale = 1; KC.scene = null; KC.game.weather = null; },
  _end(w, b) { this.over = true; this.winner = w; if (this.d.onEnd) this.d.onEnd(w, b, this); },
  /** the control intents for this step: players read their sticks, CPUs think */
  controls(dt) {
    const F = this.fighters;
    F.forEach((f, i) => {
      if (this.d.net && this.d.net.control) { f.control(this.d.net.control(i, f)); return; }
      const R = this.readers[i];
      if (i === 1 && KC.DEV.p2 !== 'cpu' && (this.mode === 'story' || this.mode === 'versus')) { if (KC.DEV.p2 === 'pad2') { const P = KC.game.players[1]; f.control(P ? (this._p2r || (this._p2r = new KC.Reader(P))).read() : { posture: 'n', press: null }); } else { const was = this.spar; this.spar = { dummy: KC.DEV.p2 }; f.control(this._dummy(f, F[0], dt)); this.spar = was; } return; }
      if (R) { R.blocked = KC.game.paused; f.control(R.read()); }
      else if (this.mode === 'freeSpar' && i === 1) f.control(this._dummy(f, F[0], dt));
      else f.control(this.ai[i].intent(f, F[1 - i], dt));
    });
  },
  _dummy(f, foe, dt) {
    const m = this.spar.dummy;
    if (m === 'crouch') return { posture: 'd', press: null };
    if (m === 'jump') return { posture: f.free && Math.floor(KC.game.time * 1.2) % 2 === 0 ? 'u' : 'n', press: null };
    if (m === 'block') { const near = foe.st === 'tech' && foe.phase === 'wind'; return near && f.free ? { posture: KC.scrDir('b', f.face), press: KC.scrDir('f', f.face) } : { posture: 'n', press: null }; }
    if (m === 'attack') { if (!this.sparAI) this.sparAI = new KC.KarateAI({ fid: f.fid, level: 3, seed: 5 }); return this.sparAI.intent(f, foe, dt); }
    return { posture: 'n', press: null };
  },
  update(dt) {
    const game = KC.game, F = this.fighters;
    KC.fx.step(game, this.fx, dt); KC.Stage.update(dt);
    if (this.d.net && this.d.net.puppet) { this.d.net.puppet(this, dt); KC.camera(game, F.map(f => f.x)); return; }
    this.controls(dt);
    if (this.bout) {
      if (KC.anyPressed('skip') && this.bout.phase === 'award') this.bout.skip = true;
      this.bout.update(dt);
      if (this.d.net && this.d.net.after) this.d.net.after(this, dt);
    } else this._sparStep(dt);
    // hints (story's first matches): one line at a time
    if (this.d.hints && KC.settings && KC.settings.hints !== false && this.bout) { this.hintT -= dt; if (this.hintT <= 0) { this.hint = KC.HINTS[this.hintI++ % KC.HINTS.length]; this.hintT = 6; } }
    if (this.over && this.d.afterEnd) { this.endT += dt; this.d.afterEnd(this, dt); }
    KC.camera(game, F.map(f => f.x));
    if (this.mode === 'attract' && this.d.director) this.d.director(this, dt);
  },
  // free spar: no referee; a hit flashes, shows its points and the dummy reels; boxes and frame data in the dev overlay
  _sparStep(dt) {
    const [a, b] = this.fighters;
    a.update(dt, b); b.update(dt, a); KC.Bout.push(a, b);
    for (const [p, q] of [[a, b], [b, a]]) {
      const s = p.strike(q); if (!s) continue; p.resolved = true;
      if (q.blocks(p)) { p.recoil(); q.guarded(p); this.bus.emit('block', { side: q.side, x: (p.x + q.x) / 2, z: p.z + p.h * .6 }); continue; }
      const sc = KC.Bout.prototype._score.call({}, p, q, s); this.spar.last = sc; this.spar.hits.unshift(sc); if (this.spar.hits.length > 4) this.spar.hits.pop();
      q.hit(sc.full || KC.TECH[sc.tech].knockdown ? 'down' : 'hurt', p.x); q.stay = false;
      this.bus.emit('point', Object.assign({ x: (p.x + q.x) / 2 + p.face * 6, z: p.z + p.h * .6 }, sc));
    }
    for (const f of this.fighters) { f.pose(dt); if (f.st === 'idle' && !f.ctlOn) f.ctlOn = true; }
    if (b.x < 60 || b.x > 340 || a.x < 30 || a.x > 370) { if (a.free && b.free) { b.x = clamp(b.x, 60, 340); } }
  },
  draw(r) {
    const d = this.d, F = this.fighters;
    KC.Stage.draw(r, this.stage, { mei: d.mei, noCrowd: d.noCrowd });
    if (this.ref) this.ref.draw(r);
    for (const f of F) f.draw(r, { flash: (f.st === 'hurt' || f.st === 'down') && f.k < 8 ? '#ffffff' : undefined });
    if (d.bench) d.bench.forEach((b, i) => { const rig = b.rig || (b.rig = KC.makeRig(b.fid, 'white', null, { colors: { belt: b.color, trim: b.color } })); KC.poseStep(rig, 1 / 60, { seiza: 1 }); const x = i % 2 ? 374 : 26; rig.update(1 / 60, { x, y: 6, z: 0, facing: x < 200 ? 0 : PI }); r.actor(x, 6, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); });
    if (KC.DEV && (KC.DEV.boxes || this.mode === 'freeSpar')) KC.DevDraw.boxes(r, F);
    if (this.bout) KC.HUD.draw(r, this.bout, { names: this.sides.map(s => s.name), colors: this.sides.map(s => s.color), tags: this.sides.map(s => s.tag), hint: this.hint, score: d.score !== undefined ? d.score + this.bout.score[0] : undefined, hi: d.hi, inputs: (KC.settings && KC.settings.inputDisplay === 'on') || (KC.DEV && KC.DEV.inputDisplay) ? F : null, noBelt: d.noBelt });
    else KC.DevDraw.spar(r, this);
    if (d.overlay) r.overlay(g => d.overlay(g, r.W, r.H, this));
  }
};

// ---- src/54-versus.js ----
/* =====================================================================================================================
 * VERSUS: player 1 (WHITE) against player 2 (RED: a second pad or the keyboard's right half, or the CPU at level 1-10).
 * Setup -> character select (a 5 x 2 grid of portraits, locks, the mouse) -> stage select (the real stage behind) -> the
 * fight -> results. With 3 or 4 players joined, KACHINUKI: winner stays on, the loser goes to the back of the queue, the
 * first to 5 bout wins is champion (KC.Kachinuki, which the online session uses too).
 * ===================================================================================================================== */
KC.Kachinuki = class {
  /** new KC.Kachinuki({ ids: [player ids in queue order], target: bout wins to be champion }) */
  constructor(o) { this.queue = o.ids.slice(); this.target = o.target || KC.TUNE.sessionTarget; this.wins = {}; this.streak = {}; this.best = {}; this.pts = {}; this.conc = {}; this.full = {}; this.half = {}; this.blocks = {}; for (const id of o.ids) { this.wins[id] = 0; this.streak[id] = 0; this.best[id] = 0; this.pts[id] = 0; this.conc[id] = 0; this.full[id] = 0; this.half[id] = 0; this.blocks[id] = 0; } this.bouts = 0; this.champion = null; this.lastWinner = null; }
  /** who fights now: [white, red] */
  current() { return [this.queue[0], this.queue[1]]; }
  /** a bout ended: winner stays (white next time), the loser goes to the back */
  result(winner, stats) {
    const [w, r] = this.current(), loser = winner === w ? r : w; this.bouts++; this.lastWinner = winner;
    this.wins[winner]++; this.streak[winner]++; this.streak[loser] = 0; this.best[winner] = Math.max(this.best[winner], this.streak[winner]);
    if (stats) for (const id of [w, r]) { const s = stats[id]; if (!s) continue; this.pts[id] += s.pts || 0; this.conc[id] += s.conceded || 0; this.full[id] += s.full || 0; this.half[id] += s.half || 0; this.blocks[id] += s.blocks || 0; }
    this.queue = [winner].concat(this.queue.filter(id => id !== winner && id !== loser), [loser]);
    if (this.wins[winner] >= this.target) this.champion = winner;
    return winner;
  }
  /** a player left: out of the queue; a bout in progress is the other's by forfeit (the caller decides) */
  remove(id) { this.queue = this.queue.filter(q => q !== id); }
  /** the standings: by bout wins, then points scored, then fewest conceded; ties grouped */
  standings() {
    const ids = Object.keys(this.wins).map(Number).filter(id => this.queue.includes(id) || this.wins[id] > 0 || true), key = id => [this.wins[id], this.pts[id], -this.conc[id]];
    const sorted = ids.slice().sort((a, b) => { const A = key(a), B = key(b); for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return B[i] - A[i]; return 0; });
    const out = []; for (const id of sorted) { const last = out[out.length - 1]; if (last && key(last[0]).join() === key(id).join()) last.push(id); else out.push([id]); }
    return out;
  }
};
const PORTRAIT_ORDER = ['taro', 'kamaboko', 'negi', 'ebi', 'kikurage', 'ika', 'buta', 'asari', 'kyabetsu', 'mei'];
KC.locked = fid => { const F = KC.FIGHTER[fid]; return !!(F.unlock && !KC.Save.unlocked(F.unlock)); };
KC.Versus = {
  /** a quick bout (a deep link, the dev warp): taro vs an opponent on a stage */
  quickData(stage, opp) { return { mode: 'versus', stage: KC.STAGE[stage] ? stage : 'dojo', sides: [{ fid: 'taro', input: KC.game.input }, { fid: KC.FIGHTER[opp] ? opp : 'kamaboko' }], retry: () => KC.game.go('fight', KC.Versus.quickData(stage, opp)), onEnd: (w, b) => { b._w = w; }, afterEnd: (sc) => { if (sc.endT > 1.5) { sc.d.afterEnd = null; KC.game.go('results', { bout: sc.bout, data: sc.d }); } } }; },
  /** free spar against the dummy (the dojo menu) */
  sparData(dummy) { return { mode: 'freeSpar', stage: 'dojo', dummy: dummy || 'stand', sides: [{ fid: 'taro', input: KC.game.input }, { fid: 'negi' }], noCrowd: true }; }
};
KC.VersusScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const g = KC.game; d = d || {}; this.d = d; this.t = 0; this.mode = d.mode || 'setup'; KC.music('select'); g.lights.enabled = false; KC.idle = 0;
    if (!this.cfg) this.cfg = { cpu: true, level: 5, rounds: 2, points: 2, picks: ['taro', 'kamaboko'], stage: 0 };
    g.allowJoin({ max: 4, onJoin: (input, n) => { input.use(KC_KEYS); KC.sfx('menuOk'); g.note('PLAYER ' + n + ' JOINED'); this.cfg.cpu = false; if (input.half === 'right') this._splitKeys(); this._buildMenu(); } });
    this._splitKeys(); this._buildMenu();
    if (d.kachinuki && g.players.length < 3) { /* deep link: CPU fill-ins are not players; the menu shows how to join */ }
    if (this.mode === 'select') this._selectInit(); if (this.mode === 'stage') this._stageInit();
  },
  // two players on one keyboard: player 1 keeps WASD with T F G H, player 2 the arrows with I J K L
  _splitKeys() { const P = KC.game.players, kb = P.filter(I => I.half === 'right'); if (kb.length) { P[0].use(KC_KEYS_P1); kb.forEach(I => I.use(KC_KEYS_P2)); } else P[0].use(KC_KEYS); },
  _buildMenu() {
    const C = this.cfg, P = KC.game.players, n = P.length, items = [];
    items.push({ label: 'RED', value: n > 1 && !C.cpu ? 'PLAYER 2' : 'CPU', act: () => { if (n > 1) { C.cpu = !C.cpu; this._buildMenu(); } }, adjust: () => { if (n > 1) { C.cpu = !C.cpu; this._buildMenu(); } }, sub: n > 1 ? 'PLAYER 2 IS IN' : 'PLAYER 2: PRESS START ON A SECOND PAD, OR 2 ON THE KEYBOARD' });
    if (C.cpu || n < 2) items.push({ label: 'CPU LEVEL', value: C.level, adjust: k => { C.level = clamp(C.level + k, 1, 10); this._buildMenu(); }, act: () => { C.level = C.level % 10 + 1; this._buildMenu(); }, sub: 'LEFT AND RIGHT CHANGE IT' });
    items.push({ label: 'MATCH', value: C.rounds === 1 ? 'ONE ROUND' : 'BEST OF ' + (C.rounds * 2 - 1), adjust: k => { C.rounds = clamp(C.rounds + k, 1, 3); this._buildMenu(); }, act: () => { C.rounds = C.rounds % 3 + 1; this._buildMenu(); } });
    items.push({ label: 'POINTS TO WIN', value: C.points, adjust: k => { C.points = clamp(C.points + k * .5, 1, 3); this._buildMenu(); }, act: () => { C.points = C.points >= 3 ? 1 : C.points + .5; this._buildMenu(); } });
    items.push({ label: 'CHOOSE FIGHTERS', act: () => { this.mode = 'select'; this._selectInit(); } });
    if (n >= 3) items.push({ label: 'KACHINUKI (' + n + ' PLAYERS)', sub: KC.TEXT.kachinuki + ' FIRST TO ' + KC.TUNE.sessionTarget + ' BOUT WINS', act: () => this._kachinuki() });
    items.push({ label: 'BACK', act: () => KC.game.go('title', { menu: true }) });
    if (this.menu) this.menu.setItems(items); else this.menu = new KC.Menu({ items, y: 60, onCancel: () => KC.game.go('title', { menu: true }) });
  },
  _selectInit() {
    const C = this.cfg, P = KC.game.players; this.cur = [PORTRAIT_ORDER.indexOf(C.picks[0]), PORTRAIT_ORDER.indexOf(C.picks[1])]; this.done = [false, false];
    this.selInputs = [P[0], !C.cpu && P[1] ? P[1] : null]; this.selT = 0; this.rigs = {};
  },
  _rig(fid, side) { const k = fid + side; return this.rigs[k] || (this.rigs[k] = (() => { const r = KC.makeRig(fid, side ? 'red' : 'white', null); for (let i = 0; i < 5; i++) r.update(.05, { x: 0, y: 0, z: 0, facing: side ? PI - .5 : .5, expr: 'smile' }); return r; })()); },
  _stageInit() { this.stT = 0; KC.Stage.enter(KC.game, KC.FIGHT_STAGES[this.cfg.stage] || 'dojo'); },
  update(dt) {
    const g = KC.game; this.t += dt;
    if (this.mode === 'setup') { if (KC.idleStep(dt)) { g.go('attract'); return; } this.menu.update(dt); return; }
    if (this.mode === 'select') return this._selectStep(dt);
    if (this.mode === 'stage') return this._stageStep(dt);
  },
  _selectStep(dt) {
    const C = this.cfg; this.selT += dt; const N = PORTRAIT_ORDER.length, I0 = KC.game.input;
    // the cursor that moves now: player 1's, then player 2's (or player 1 picks the CPU's too)
    const who = !this.done[0] ? 0 : 1, I = this.selInputs[who] || this.selInputs[0];
    const mv = (dx, dy) => { let i = this.cur[who]; const c = i % 5, r = Math.floor(i / 5); i = ((r + dy + 2) % 2) * 5 + (c + dx + 5) % 5; this.cur[who] = i; KC.sfx('menuMove'); };
    if (I.repeat('left')) mv(-1, 0); if (I.repeat('right')) mv(1, 0); if (I.repeat('up')) mv(0, -1); if (I.repeat('down')) mv(0, 1);
    const p = KC.moved(I0, this), c = I0.clicked(); if (this.cells) for (const [i, x, y, w, h] of this.cells) { if (p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) { this.cur[who] = i; } if (c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.cur[who] = i; this._pick(who); } }
    if (I.pressed('confirm')) { I.consumeAll(); this._pick(who); }
    if (I.pressed('cancel')) { I.consumeAll(); if (who === 1 && this.done[0]) this.done[0] = false; else { this.mode = 'setup'; } }
    void N; void dt;
  },
  _pick(who) {
    const fid = PORTRAIT_ORDER[this.cur[who]];
    if (KC.locked(fid)) { KC.sfx('menuBack'); KC.game.note(fid === 'mei' ? 'FINISH THE CHAMPON ROAD TO UNLOCK' : 'REACH MATCH 8 OF THE ROAD TO UNLOCK'); return; }
    KC.sfx('menuOk'); KC.Voice.speak(KC.FIGHTER[fid].quotes.intro, fid); this.done[who] = true; this.cfg.picks[who] = fid;
    if (this.kachi) { this.kachi.picks.push(fid); if (this.kachi.picks.length >= this.kachi.n) { this._kachiStart(); return; } this.done = [false, false]; this.selInputs = [KC.game.players[this.kachi.picks.length], null]; return; }
    if (this.done[0] && this.done[1]) { this.mode = 'stage'; this._stageInit(); }
  },
  _stageStep(dt) {
    const C = this.cfg, n = KC.FIGHT_STAGES.length + 1, I = KC.game.input; this.stT += dt; KC.Stage.update(dt);
    const chg = k => { C.stage = (C.stage + k + n) % n; KC.sfx('menuMove'); if (C.stage < KC.FIGHT_STAGES.length) KC.Stage.enter(KC.game, KC.FIGHT_STAGES[C.stage]); };
    if (KC.anyRepeat('left')) chg(-1); if (KC.anyRepeat('right')) chg(1);
    const c = I.clicked(); if (c && this.arrows) { if (c[0] < this.arrows[0]) chg(-1); else if (c[0] > this.arrows[1]) chg(1); else this._fight(); }
    if (KC.anyPressed('confirm')) { KC.consumeAll(); this._fight(); }
    if (KC.anyPressed('cancel')) { KC.consumeAll(); this.mode = 'select'; this._selectInit(); }
    KC.camera(KC.game, [200]);
  },
  fightData() {
    const C = this.cfg, P = KC.game.players, R = KC.rng(KC.hash('st' + this.t)), st = C.stage >= KC.FIGHT_STAGES.length ? KC.FIGHT_STAGES[Math.floor(R() * KC.FIGHT_STAGES.length)] : KC.FIGHT_STAGES[C.stage];
    const data = { mode: 'versus', stage: st, seed: Math.floor(this.t * 1000) % 9973 + 1, rules: { roundsToWin: C.rounds, pointsToWin: C.points }, sides: [{ fid: C.picks[0], input: P[0] }, C.cpu || !P[1] ? { fid: C.picks[1], cpu: C.level } : { fid: C.picks[1], input: P[1] }],
      retry: () => KC.game.go('fight', data), onEnd: () => {}, afterEnd: sc => { if (sc.endT > 1.5) { sc.d.afterEnd = null; KC.game.go('results', { bout: sc.bout, data }); } } };
    return data;
  },
  _fight() { KC.game.go('fight', this.fightData()); },
  // KACHINUKI: every joined player picks a fighter in turn, then the bouts
  _kachinuki() { const n = KC.game.players.length; this.kachi = { n, picks: [] }; this.mode = 'select'; this._selectInit(); this.selInputs = [KC.game.players[0], null]; },
  _kachiStart() { const K = this.kachi; KC.LocalKachi.start(K.picks); this.kachi = null; },
  draw(r) {
    if (this.mode === 'stage') { const id = KC.FIGHT_STAGES[this.cfg.stage]; if (id) KC.Stage.draw(r, id, {}); }
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (this.mode !== 'stage') { px.rect(g, 0, 0, W, H, '#0e0a1c'); for (let y = 0; y < H; y += 4) px.rect(g, 0, y, W, 1, '#140e26'); }
      E.font.title(g, this.kachi ? 'KACHINUKI' : 'VERSUS', mid, 6, { scale: 3, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 2 });
      if (this.mode === 'setup') {
        const P = KC.game.players; P.forEach((I, i) => E.font.text(g, 'P' + (i + 1) + ' ' + (I.half === 'right' ? 'KEYS (RIGHT)' : I.padIndex !== null && I.padIndex !== undefined ? 'PAD ' + (I.padIndex + 1) : 'KEYS'), 12 + i * 100, 40, E.PLAYER_COLORS ? E.PLAYER_COLORS[i] : '#ffffff', { outline: false }));
        const sub = this.menu.draw(g, W, H); if (sub) E.font.text(g, sub, mid, H - 34, '#ffe7a8', { align: 'center', outline: '#000' });
        KC.promptBar(g, W, H, [['confirm', 'SELECT'], ['left', 'CHANGE'], ['cancel', 'BACK']]);
      } else if (this.mode === 'select') this._drawSelect(g, W, H);
      else {
        const C = this.cfg, n = KC.FIGHT_STAGES.length, id = KC.FIGHT_STAGES[C.stage], name = id ? KC.STAGE[id].name : 'RANDOM';
        if (!id) px.rect(g, 0, 40, W, H - 80, '#1a1430');
        E.ui.box(g, mid - 110, H - 64, 220, 30, { bg: '#0c0a18', border: '#e8d8b0', alpha: .9 });
        E.font.text(g, '← ' + name + ' →', mid, H - 58, '#fff6d0', { align: 'center', outline: false, scale: 2 }); E.font.text(g, (C.stage + 1) + '/' + (n + 1), mid, H - 42, '#a8a0c8', { align: 'center', outline: false, font: 'tiny' });
        this.arrows = [mid - 80, mid + 80];
        KC.promptBar(g, W, H, [['left', 'STAGE'], ['confirm', 'FIGHT!'], ['cancel', 'BACK']]);
      }
    });
  },
  _drawSelect(g, W, H) {
    const mid = Math.round(W / 2), cw = 34, ch = 34, x0 = mid - Math.round(cw * 2.5), y0 = 58; this.cells = [];
    PORTRAIT_ORDER.forEach((fid, i) => {
      const x = x0 + (i % 5) * cw, y = y0 + Math.floor(i / 5) * ch, lock = KC.locked(fid), rig = this._rig(fid, 0);
      if (lock) { px.rect(g, x + 1, y + 1, cw - 2, ch - 2, '#14101e'); rig.drawPortrait(g, x + 2, y + 2, cw - 4, { tint: '#000000', bg: '#14101e', zoom: 2.2 }); E.font.text(g, '?', x + cw / 2, y + 10, '#8a80a8', { align: 'center', outline: false, scale: 2 }); }
      else rig.drawPortrait(g, x + 2, y + 2, cw - 4, { bg: '#2a2040', zoom: 2.2 });
      this.cells.push([i, x, y, cw, ch]);
    });
    const cols = ['#ffffff', '#ff5a4a', '#4a8aff', '#4ad860'], label = this.kachi ? 'P' + (this.kachi.picks.length + 1) : null;
    this.cur.forEach((ci, s) => { if (s === 1 && !this.done[0]) return; if (this.kachi && s === 1) return; const x = x0 + (ci % 5) * cw, y = y0 + Math.floor(ci / 5) * ch, c = this.kachi ? cols[this.kachi.picks.length % 4] : cols[s], pulse = Math.floor(this.selT * 6) % 2; for (let k = 0; k < 2; k++) { px.rect(g, x + k, y + k, cw - 2 * k, 1, c); px.rect(g, x + k, y + ch - 1 - k, cw - 2 * k, 1, c); px.rect(g, x + k, y + k, 1, ch - 2 * k, c); px.rect(g, x + cw - 1 - k, y + k, 1, ch - 2 * k, c); } E.font.text(g, label || (s === 0 ? '1P' : this.selInputs[1] ? '2P' : 'CPU'), x + 2, y - 8 + pulse, c, { outline: '#000', font: 'tiny' }); });
    // the big portraits: name, style, three stat bars
    [0, 1].forEach(s => {
      if (this.kachi && s === 1) return;
      const fid = PORTRAIT_ORDER[this.cur[s]], F = KC.FIGHTER[fid], x = s ? W - 82 : 12, lock = KC.locked(fid);
      if (s === 1 && !this.done[0] && !this.kachi) return;
      this._rig(fid, s).drawPortrait(g, x, 56, 70, { frame: true, bg: s ? '#5a1010' : '#5a5448', tint: lock ? '#000000' : undefined, zoom: 2 });
      E.font.text(g, lock ? '???' : F.short, x + 35, 130, '#fff6d0', { align: 'center', outline: '#000', scale: 2 });
      E.font.text(g, lock ? 'LOCKED' : F.style, x + 35, 148, '#c8c0e8', { align: 'center', outline: false, font: 'tiny' });
      if (!lock) [['WALK', F.stats.walk], ['REACH', F.stats.reach], ['SPEED', F.stats.speed]].forEach(([n, v], k) => { E.font.text(g, n, x, 158 + k * 9, '#a8a0c8', { outline: false, font: 'tiny' }); E.ui.bar(g, x + 28, 158 + k * 9, 42, 5, clamp((v - .75) / .4, 0, 1), '#ffd060'); });
    });
    E.font.text(g, this.kachi ? 'PLAYER ' + (this.kachi.picks.length + 1) + ': PICK YOUR FIGHTER' : !this.done[0] ? 'WHITE: PICK YOUR FIGHTER' : this.selInputs[1] ? 'RED (PLAYER 2): PICK YOUR FIGHTER' : 'PICK THE CPU\'S FIGHTER', mid, 40, '#ffe7a8', { align: 'center', outline: '#000' });
    KC.promptBar(g, W, H, [['confirm', 'PICK'], ['cancel', 'BACK']]);
  },
  back() { if (this.mode !== 'setup') { this.mode = 'setup'; return true; } KC.game.go('title', { menu: true }); return true; }
};

/* ---- local kachinuki: bouts of one round, winner stays on, the others kneel in seiza by the mat ---- */
KC.LocalKachi = {
  start(picks) { const P = KC.game.players; this.picks = picks; this.K = new KC.Kachinuki({ ids: picks.map((_, i) => i), target: KC.TUNE.sessionTarget }); this.bout(); void P; },
  bout() {
    const K = this.K, P = KC.game.players, [w, r] = K.current(), cols = ['#ffffff', '#ff5a4a', '#4a8aff', '#4ad860'], stage = 'stadium';
    const data = { mode: 'kachinuki', stage, seed: K.bouts + 1, rules: { roundsToWin: 1, pointsToWin: 2, intro: K.bouts === 0 }, noBelt: true,
      sides: [{ fid: this.picks[w], input: P[w], name: 'P' + (w + 1), color: cols[w], tag: 'STREAK ' + K.streak[w] }, { fid: this.picks[r], input: P[r], name: 'P' + (r + 1), color: cols[r], tag: 'STREAK ' + K.streak[r] }],
      bench: K.queue.slice(2).map(id => ({ fid: this.picks[id], color: cols[id] })),
      onEnd: (win, b) => { const ids = [w, r], st = {}; ids.forEach((id, s) => { st[id] = { pts: b.score[s], conceded: b.conceded[s], full: b.f[s].stats.full, half: b.f[s].stats.half, blocks: b.f[s].stats.blocks }; }); K.result(ids[win], st); },
      afterEnd: sc => { if (sc.endT > 1.6) { sc.d.afterEnd = null; if (K.champion !== null) KC.game.go('results', { kachinuki: K, picks: this.picks }); else this.bout(); } },
      overlay: (g, W, H) => { E.font.text(g, KC.TEXT.kachinuki + '  FIRST TO ' + K.target, Math.round(W / 2), H - 26, '#ffe7a8', { align: 'center', outline: '#000' }); K.queue.slice(2).forEach((id, i) => E.font.text(g, 'NEXT: P' + (id + 1), 8 + i * 50, H - 40, cols[id], { outline: '#000' })); } };
    KC.game.go('fight', data);
  }
};

/* ---- RESULTS (versus and local kachinuki) ---- */
KC.ResultsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) {
    this.d = d; this.t = 0; KC.music('ending'); KC.Stage.enter(KC.game, 'stadium'); KC.idle = 0;
    if (d.kachinuki) { const K = d.kachinuki; this.win = KC.makeRig(d.picks[K.champion], 'white', null); this.menu = new KC.Menu({ items: [{ label: 'AGAIN', act: () => KC.LocalKachi.start(d.picks) }, { label: 'MAIN MENU', act: () => KC.game.go('title', { menu: true }) }], y: 130 }); }
    else { const b = d.bout, w = b.winner; this.win = KC.makeRig(b.f[w].fid, w ? 'red' : 'white', b.f[w].rank); const V = KC.VersusScene; this.menu = new KC.Menu({ items: [{ label: 'REMATCH', act: () => KC.game.go('fight', d.data) }, { label: 'CHARACTER SELECT', act: () => KC.game.go('versus', { mode: 'select' }) }, { label: 'STAGE SELECT', act: () => KC.game.go('versus', { mode: 'stage' }) }, { label: 'MAIN MENU', act: () => KC.game.go('title', { menu: true }) }], y: 124 }); void V; }
  },
  update(dt) { this.t += dt; KC.Stage.update(dt); this.win.update(dt, { x: 120, y: 0, z: 0, facing: .3, pose: 'cheer', expr: 'shout' }); KC.camera(KC.game, [200]); if (this.t > 1) this.menu.update(dt); if (KC.idleStep(dt)) KC.game.go('attract'); },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    r.actor(120, 0, 0, (g, ox, oy) => this.win.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2) + 40;
      px.blend(g, .55, 'normal', () => px.rect(g, mid - 120, 6, 240, H - 30, '#05040a'));
      if (this.d.kachinuki) {
        const K = this.d.kachinuki; E.font.title(g, 'P' + (K.champion + 1) + ' IS CHAMPION!', mid, 12, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        K.standings().flat().forEach((id, i) => E.font.text(g, (i + 1) + '. P' + (id + 1) + '  ' + K.wins[id] + ' WINS  BEST STREAK ' + K.best[id], mid, 40 + i * 16, '#fff6e8', { align: 'center', outline: false }));
      } else {
        const b = this.d.bout, w = b.winner, f = b.f;
        E.font.title(g, (w ? 'RED' : 'WHITE') + ' WINS ' + b.roundWins[w] + '-' + b.roundWins[1 - w], mid, 12, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const rows = [['FULL POINTS', f[0].stats.full, f[1].stats.full], ['HALF POINTS', f[0].stats.half, f[1].stats.half], ['BLOCKS', f[0].stats.blocks, f[1].stats.blocks], ['BEST', f[0].stats.best ? KC.TECH[f[0].stats.best].name : '-', f[1].stats.best ? KC.TECH[f[1].stats.best].name : '-']];
        E.font.text(g, 'WHITE', mid - 90, 40, '#fff6e8', { outline: false }); E.font.text(g, 'RED', mid + 90, 40, '#ff5a4a', { align: 'right', outline: false });
        rows.forEach(([n, a, c], i) => { const y = 54 + i * 16; E.font.text(g, n, mid, y, '#ffd060', { align: 'center', outline: false }); E.font.text(g, String(a), mid - 90, y, '#fff6e8', { outline: false, font: typeof a === 'string' ? 'tiny' : undefined }); E.font.text(g, String(c), mid + 90, y, '#ffd0c0', { align: 'right', outline: false, font: typeof c === 'string' ? 'tiny' : undefined }); });
      }
      this.menu.x = mid - 80; this.menu.w = 160; if (this.t > 1) this.menu.draw(g, W, H);
      KC.promptBar(g, W, H, [['confirm', 'SELECT']]);
    });
  }
};

// ---- src/55-misc.js ----
/* =====================================================================================================================
 * MENUS AND SCREENS: the dojo menu, the bonus games menu, records (one big table per page), the paged About screen, and the
 * Move List (one posture at a time: the left stick's posture, the right stick's four techniques around it, a live preview).
 * KC.Overlay holds a panel over any scene (the move list, the dev panel): it takes the input and holds the scene still,
 * except in an AI Hub session, where the world goes on and the local fighter's input is neutral.
 * ===================================================================================================================== */
KC.Overlay = {
  stack: [],
  get active() { return this.stack.length > 0; },
  push(o) { this.stack.push(o); KC.consumeAll(); },
  pop() { this.stack.pop(); KC.consumeAll(); },
  /** run the top panel; true when the scene should hold this step */
  step(dt) { const o = this.stack[this.stack.length - 1]; if (!o) return false; o.update(dt); return !SESSION; },
  draw(r) { for (const o of this.stack) r.overlay(g => o.draw(g, r.W, r.H, r)); }
};
const simpleMenuScene = (title, items, o = {}) => ({
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.t = 0; this.d = d || {}; KC.Stage.enter(KC.game, o.stage || 'dojo'); KC.game.lights.ambient = .45; KC.music(o.music || 'practice'); this.menu = new KC.Menu({ items: items(this), y: 54, onCancel: () => KC.game.go(o.back || 'title', { menu: true }) }); KC.idle = 0; },
  rebuild() { this.menu.setItems(items(this)); },
  update(dt) { this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; } this.menu.update(dt); },
  draw(r) {
    KC.Stage.draw(r, o.stage || 'dojo', { noCrowd: true });
    r.overlay(g => { px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05040a')); E.font.title(g, title, Math.round(r.W / 2), 10, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 }); const sub = this.menu.draw(g, r.W, r.H); if (sub) E.font.text(g, sub, Math.round(r.W / 2), r.H - 34, '#ffe7a8', { align: 'center', outline: '#000' }); KC.promptBar(g, r.W, r.H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); });
  }
});
KC.DUMMY_MODES = ['stand', 'crouch', 'jump', 'block', 'attack'];
KC.DojoScene = simpleMenuScene('DOJO', sc => {
  sc.dummy = sc.dummy || 0;
  return [
    { label: 'LESSON I', sub: 'FRONT, ROUND, LOW AND BACK KICKS; BLOCK, JUMP, CROUCH', act: () => KC.game.go('practice', { lesson: 'lessonI' }) },
    { label: 'LESSON II', sub: 'LUNGE PUNCHES, THE CLOSE PUNCH, SWEEPS, UPPER AND SQUAT PUNCHES', act: () => KC.game.go('practice', { lesson: 'lessonII' }) },
    { label: 'LESSON III', sub: 'SPINS, JUMPING KICKS, SOMERSAULTS, THE BACK ROLL', act: () => KC.game.go('practice', { lesson: 'lessonIII' }) },
    { label: 'ALL TECHNIQUES', sub: 'ALL 21 DRILLS IN ONE LESSON', act: () => KC.game.go('practice', { lesson: 'lessonAll' }) },
    { label: 'FREE SPAR', value: KC.DUMMY_MODES[sc.dummy].toUpperCase(), sub: 'AGAINST A DUMMY: LEFT AND RIGHT CHANGE WHAT IT DOES', adjust: k => { sc.dummy = (sc.dummy + k + 5) % 5; sc.rebuild(); }, act: () => KC.game.go('fight', KC.Versus.sparData(KC.DUMMY_MODES[sc.dummy])) },
    { label: 'MOVE LIST', sub: 'EVERY TECHNIQUE, POSTURE BY POSTURE', act: () => KC.MoveList.open() },
    { label: 'TECHNIQUE LAB', sub: 'FRAME DATA AND REACH, LIVE (DEV)', act: () => KC.game.go('lab', { tech: 'frontKick' }) }
  ];
}, { stage: 'dojo' });
KC.BonusMenuScene = simpleMenuScene('BONUS GAMES', sc => {
  sc.cfg = sc.cfg || { n: 1, mat: 0, pots: 1, bull: 1 }; const C = sc.cfg, NS = [3, 5, 7, 10], MATS = ['pine', 'tile', 'ice'], DIF = ['Easy', 'Normal', 'Hard'];
  const rebuild = () => sc.rebuild();
  return [
    { label: 'BREAK THE BOARDS', sub: 'BOARDS: LEFT AND RIGHT. HIGH SCORE ' + KC.commas(KC.Save.hi('boards')), value: NS[C.n] + ' ' + KC.DATA.boardMats[MATS[C.mat]].name, adjust: k => { C.n = (C.n + k + 4) % 4; rebuild(); }, act: () => KC.game.go('bonus', { id: 'boards', variant: { n: NS[C.n], mat: MATS[C.mat] } }) },
    { label: 'BOARD MATERIAL', value: KC.DATA.boardMats[MATS[C.mat]].name + ' x' + KC.DATA.boardMats[MATS[C.mat]].mul, adjust: k => { C.mat = (C.mat + k + 3) % 3; rebuild(); }, act: () => { C.mat = (C.mat + 1) % 3; rebuild(); } },
    { label: 'POTS AHOY!', sub: 'HIGH SCORE ' + KC.commas(KC.Save.hi('pots')), value: DIF[C.pots].toUpperCase(), adjust: k => { C.pots = (C.pots + k + 3) % 3; rebuild(); }, act: () => KC.game.go('bonus', { id: 'pots', variant: { difficulty: DIF[C.pots], seed: Math.floor(KC.game.real * 10) } }) },
    { label: 'STOP THE BULL', sub: 'HIGH SCORE ' + KC.commas(KC.Save.hi('bull')), value: DIF[C.bull].toUpperCase(), adjust: k => { C.bull = (C.bull + k + 3) % 3; rebuild(); }, act: () => KC.game.go('bonus', { id: 'bull', variant: { difficulty: DIF[C.bull] } }) }
  ];
}, { stage: 'courtyard', music: 'bonus' });
/* ---- RECORDS: one table per page (L1/R1, Q/E or click the tabs) ---- */
const REC_TABS = [['story', 'CHAMPON ROAD'], ['boards', 'BOARDS'], ['pots', 'POTS AHOY!'], ['bull', 'STOP THE BULL']];
KC.RecordsScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter(d) { this.i = Math.max(0, REC_TABS.findIndex(t => t[0] === (d && d.mode))); this.t = 0; KC.Stage.enter(KC.game, 'stadium'); KC.music('select'); KC.idle = 0; },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; }
    const n = REC_TABS.length; if (KC.anyPressed('next') || KC.anyRepeat('right')) { this.i = (this.i + 1) % n; KC.sfx('menuMove'); } if (KC.anyPressed('prev') || KC.anyRepeat('left')) { this.i = (this.i + n - 1) % n; KC.sfx('menuMove'); }
    const c = KC.game.input.clicked(); if (c && this.tabs) this.tabs.forEach(([x, w], k) => { if (c[0] >= x && c[0] < x + w && c[1] < 18) this.i = k; });
    if (KC.anyPressed('cancel') || KC.anyPressed('confirm')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    KC.Stage.draw(r, 'stadium', {});
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      let x = 6; this.tabs = []; REC_TABS.forEach(([, name], k) => { const w = E.font.width(name) + 12; px.rect(g, x, 2, w, 14, k === this.i ? '#5a3a7a' : '#1a1430'); E.font.text(g, name, x + 6, 5, k === this.i ? '#ffd060' : '#a8a0c8', { outline: false }); this.tabs.push([x, w]); x += w + 4; });
      KC.drawTable(g, W, H, REC_TABS[this.i][0], REC_TABS[this.i][1]);
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TABLE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- ABOUT: Source Information, the feedback answers and the credits, paged (8 lines a page at most) ---- */
KC.aboutPages = () => {
  const A = KC.ABOUT || {}, S = A.sourceInformation || {}, pages = [];
  const F = [['DATE', S.date], ['SOURCE', S.source], ['PLAN', S.plan], ['GENRE', S.genre], ['PERSPECTIVE', S.perspective], ['TECH', S.tech], ['ART DIRECTION', S.artDirection], ['ANIMATION', S.animation], ['AUDIO', S.audio], ['ONLINE', S.online], ['TESTING', S.testing], ['RESEARCH', S.research], ['ENVIRONMENT', S.environment], ['MODEL', S.model], ['USAGE', S.usage]];
  const add = (title, rows) => pages.push({ title, rows });
  add('SOURCE INFORMATION', F.map(([k, v]) => [k, v || 'unknown']));
  const Q = { testing: ['How many issues did testing catch?', 'How many were critical / game breaking?', 'The most helpful test', 'The least helpful test'], engine: ['What I liked most', 'Stuck or guessed wrong?', 'The most important thing I built', 'The hardest part', 'What I changed in the engine, and why', 'One thing I would change'], prompt: ['What I liked most', 'What was confusing', 'The hardest thing to do', 'What I would change'] };
  add('TESTING FEEDBACK', (A.testingFeedback || []).map((a, i) => [Q.testing[i] || '', a]));
  add('ENGINE FEEDBACK', (A.engineFeedback || []).map((a, i) => [Q.engine[i] || '', a]));
  add('PROMPT FEEDBACK', (A.promptFeedback || []).map((a, i) => [Q.prompt[i] || '', a]));
  add('CREDITS', [['GAME', 'Karate Champon: an original game inspired by Karate Champ (1984). No assets or code from the original.'], ['ENGINE', 'my-3D2dge v0.85.2 (github.com/michaelcrosato/my-3d2dge), modified'], ['PROPS', 'Kenney (kenney.nl) and KayKit (kaylousberg.com), CC0, from the engine\'s asset store'], ['ONLINE', 'AI Hub session protocol v1, client 1.4.0'], ['MADE BY', 'Claude Opus 5.5 (Anthropic) in Claude Code']]);
  return pages;
};
KC.AboutScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false },
  enter() { this.p = 0; this.pages = KC.aboutPages(); this.t = 0; KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); KC.idle = 0; this._lw = 0; },
  // pages of at most 12 wrapped lines (a long answer runs on over pages; a page never starts mid-way without its heading)
  linePages(W) {
    if (this._lw === W && this._lp) return this._lp; this._lw = W; const out = [], PER = 12;
    for (const P of this.pages) { let cur = { title: P.title, lines: [] }; const push = l => { if (cur.lines.length >= PER) { out.push(cur); cur = { title: P.title, lines: [] }; } cur.lines.push(l); };
      for (const [k, v] of P.rows) { if (cur.lines.length > PER - 3) { out.push(cur); cur = { title: P.title, lines: [] }; } push(['#ffd060', k]); for (const l of E.font.wrap(String(v), W - 30)) push(['#fff6e8', l]); }
      if (cur.lines.length) out.push(cur); }
    const merged = []; for (const pg of out) { const last = merged[merged.length - 1]; if (last && last.title === pg.title && last.lines.length + pg.lines.length <= PER) last.lines.push(...pg.lines); else merged.push(pg); }
    return (this._lp = merged);
  },
  update(dt) {
    this.t += dt; KC.Stage.update(dt); KC.camera(KC.game, [200]); if (KC.idleStep(dt)) { KC.game.go('attract'); return; }
    const n = this.linePages(KC.game.W).length; if (KC.anyRepeat('right') || KC.anyPressed('next') || KC.anyRepeat('down')) { this.p = Math.min(n - 1, this.p + 1); KC.sfx('menuMove'); } if (KC.anyRepeat('left') || KC.anyPressed('prev') || KC.anyRepeat('up')) { this.p = Math.max(0, this.p - 1); KC.sfx('menuMove'); }
    const c = KC.game.input.clicked(); if (c) { if (c[0] > KC.game.W / 2) this.p = Math.min(n - 1, this.p + 1); else this.p = Math.max(0, this.p - 1); }
    if (KC.anyPressed('cancel') || KC.anyPressed('confirm')) { KC.consumeAll(); KC.game.go('title', { menu: true }); }
  },
  draw(r) {
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    r.overlay(g => {
      const W = r.W, H = r.H, LP = this.linePages(W), P = LP[Math.min(this.p, LP.length - 1)]; px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
      E.font.title(g, P.title, Math.round(W / 2), 6, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      let y = 32; for (const [c, l] of P.lines) { E.font.text(g, l, 14, y, c, { outline: false, shadow: '#000' }); y += 13; }
      E.font.text(g, 'PAGE ' + (this.p + 1) + '/' + LP.length, 14, H - 32, '#a8a0c8', { outline: false });
      KC.promptBar(g, W, H, [['left', ''], ['right', 'PAGE'], ['cancel', 'BACK']]);
    });
  }
};

/* ---- the MOVE LIST: a panel over any scene (pause menu, dojo) ---- */
const POSTURES = [['n', 'STANDING (NO DIRECTION)'], ['f', 'STEP IN (TOWARD THE FOE)'], ['b', 'STEP BACK (AWAY)'], ['u', 'JUMP (UP)'], ['d', 'CROUCH (DOWN)']];
KC.MoveList = {
  open(standalone) {
    const M = { p: 0, sel: 'u', t: 0, preview: null, standalone,
      update(dt) {
        this.t += dt; const I = KC.game.input;
        if (KC.anyRepeat('up')) { this.p = (this.p + 4) % 5; KC.sfx('menuMove'); } if (KC.anyRepeat('down')) { this.p = (this.p + 1) % 5; KC.sfx('menuMove'); }
        for (const [a, d] of [['tUp', 'u'], ['tRight', 'f'], ['tDown', 'd'], ['tLeft', 'b']]) if (KC.anyPressed(a)) { this.sel = d; this._play(); }
        if (KC.anyRepeat('left') || KC.anyRepeat('right')) { const order = ['u', 'f', 'd', 'b'], k = order.indexOf(this.sel); this.sel = order[(k + (KC.anyRepeat('left') ? 3 : 1)) % 4]; this._play(); }
        const c = I.clicked(); if (c && this.hit) for (const [d, x, y, w, h] of this.hit) if (c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.sel = d; this._play(); }
        if (KC.anyPressed('cancel') || KC.anyPressed('pause')) { KC.consumeAll(); KC.Overlay.pop(); if (this.standalone) KC.game.go('dojo'); return; }
        const f = this.preview; if (f) { f.update(dt, null); f.pose(dt); if (f.free && !f.airborne && (this._again -= dt) < 0) this._play(); }
      },
      tech() { return KC.MATRIX[POSTURES[this.p][0]][this.sel]; },
      _play() { const id = this.tech(); if (!this.preview) { this.preview = new KC.Karateka({ fid: 'taro', side: 0, x: 0 }); this.preview.x0 = -999; this.preview.x1 = 999; } const f = this.preview; f.release(); f.x = 0; f.face = 1; if (id === 'crouch') { f.st = 'crouch'; } else f.startTech(id, null); this._again = .6; },
      draw(g, W, H, r) {
        px.blend(g, .88, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
        E.font.title(g, 'MOVE LIST', Math.round(W / 2), 4, { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
        const [p, pname] = POSTURES[this.p], dev = KC.device(), L = { kind: 'stick', side: 'L', dir: KC.scrDir(p, 1) };
        E.font.text(g, pname, 14, 28, '#ffe7a8', { outline: false }); KC.icon(g, 14, 42, L, 3);
        E.font.text(g, '↑ ↓ POSTURE', 14, 84, '#8a80a8', { outline: false });
        // the four techniques around the right stick
        const cx = 150, cy = 108; KC.icon(g, cx - 18, cy - 18, { kind: 'stick', side: 'R', dir: null }, 3); this.hit = [];
        const spots = { u: [cx, cy - 50], f: [cx + 64, cy], d: [cx, cy + 46], b: [cx - 64, cy] };
        for (const d of ['u', 'f', 'd', 'b']) {
          const id = KC.MATRIX[p][d], T = KC.TECH[id], [x, y] = spots[d], on = d === this.sel, name = id === 'crouch' ? 'CROUCH' : T.name, w = Math.max(54, E.font.width(name, { font: 'tiny' }) + 8);
          E.ui.box(g, x - w / 2, y - 9, w, 20, { bg: on ? '#3a2a5a' : '#1a1430', border: on ? '#ffd060' : '#5a5078' });
          E.font.text(g, name, x, y - 6, on ? '#fff6d0' : '#c8c0e8', { align: 'center', outline: false, font: 'tiny' }); E.font.text(g, KC.ARROW[d] + (T.scoring ? ' ' + T.pts[0] + '-' + T.pts[1] : ''), x, y + 1, '#a8a0c8', { align: 'center', outline: false });
          if (T.scoring && T.pts[1] >= 600) E.font.text(g, '★', x + w / 2 - 6, y - 8, '#ffd060', { outline: false });
          this.hit.push([d, x - w / 2, y - 9, w, 20]);
        }
        if (p === 'n') E.font.text(g, 'CLOSE: R → IS THE REVERSE PUNCH', cx, cy + 62, '#8ae08a', { align: 'center', outline: false, font: 'tiny' });
        // the preview: the technique played by a live rig in a box
        const bx = W - 130, by = 28, bw = 118, bh = 120, id = this.tech(), T = KC.TECH[id];
        E.ui.box(g, bx, by, bw, bh, { bg: ['#2a2040', '#14101e'], border: '#e8d8b0' }); px.rect(g, bx + 4, by + bh - 22, bw - 8, 1, '#8a7ab0');
        if (this.preview && r) { const f = this.preview, view = E.VIEWS.kcside, ox = bx + 40 + Math.round(f.x * view.scale), oy = by + bh - 22 - Math.round(f.z * view.scale); f.rig.draw(g, ox, oy, view); }
        E.font.text(g, id === 'crouch' ? 'CROUCH' : T.name, bx + bw / 2, by + bh + 4, '#fff6d0', { align: 'center', outline: false });
        E.font.text(g, T.jp, bx + bw / 2, by + bh + 14, '#a8a0c8', { align: 'center', outline: false, font: 'tiny' });
        if (T.scoring) E.font.text(g, T.pts[0] + '-' + T.pts[1] + (T.pts[1] >= 600 ? '  ★ FULL' : '  HALF') + (T.unblockable ? '  UNBLOCKABLE' : ''), bx + bw / 2, by + bh + 22, T.pts[1] >= 600 ? '#ffd060' : '#c8c0e8', { align: 'center', outline: false, font: 'tiny' });
        const parts = KC.promptFor(id, KC.game.input, dev); if (parts.length) KC.iconRow(g, bx + 4, by + 4, parts, 1);
        E.font.text(g, '→ MEANS TOWARD THE FOE', 14, H - 32, '#8a80a8', { outline: false });
        KC.promptBar(g, W, H, [['up', 'POSTURE'], [{ kind: 'stick', side: dev === 'gamepad' ? 'R' : 'D', dir: null }, 'PREVIEW'], ['cancel', 'CLOSE']]);
      } };
    M._play(); KC.Overlay.push(M); return M;
  }
};
KC.MoveListScene = Object.assign(simpleMenuScene('MOVE LIST', () => []), { enter() { KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); this.menu = new KC.Menu({ items: [] }); KC.MoveList.open(true); }, update(dt) { KC.Stage.update(dt); KC.camera(KC.game, [200]); } });

// ---- src/60-online.js ----
/* =====================================================================================================================
 * ONLINE: AI Hub sessions (protocol v1, shared-world, 2-4 seats). KACHINUKI: winner stays on; bouts of one round to 2
 * points; the most bout wins takes the round (first to KC.TUNE.sessionTarget ends it). The host's copy (AIHub.isHost; a
 * server copy has no player of its own) runs the bouts at 120 Hz and sends snapshots (12 a second, unreliable) and events
 * (batched, reliable); every other copy sends its player's posture and technique presses and renders puppets from the
 * snapshots 100 ms behind, with a cosmetic wind-up predicted for its own presses. The host's own fighter is delayed by its
 * opponent's one-way latency (fairness). The card is the game's own: the stadium, the players kneeling in their colours.
 * Messages: in (guest -> host), hb (heartbeats), s (snapshots), ev (events). Network cadence is real time, never game time.
 * ===================================================================================================================== */
const PCODE = ['n', 'u', 'd', 'l', 'r'];
const SIGS = [null, 'hajime', 'yame', 'half', 'full', 'aiuchi', 'whistle', 'point', 'winner', 'nopoint'];
const SESSION_FIDS = ['taro', 'mei', 'ebi', 'ika'];
const now = () => (HUB && HUB.time ? HUB.time() : 0), realMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// a stand-in bout for guests: what the HUD reads, from the snapshots
class PuppetBout {
  constructor(f, ref) { this.f = f; this.ref = ref; this.bus = new KC.Bus(); this.points = [0, 0]; this.roundWins = [0, 0]; this.clock = 30; this.phase = 'ready'; this.cardText = ''; this.rules = { pointsToWin: 2, roundsToWin: 1 }; this.score = [0, 0]; this.t = 0; }
  R(k) { return this.rules[k] !== undefined ? this.rules[k] : KC.TUNE[k]; }
  call(id) { this.ref.call(id); }
}
KC.Net = {
  stats: { sent: 0, recv: 0, sentBytes: 0, maxBytes: 0, perSec: [] },
  send(data, o) {
    if (this.ended || !HUB) return false;
    const s = JSON.stringify(data); this.stats.sent++; this.stats.sentBytes += s.length; this.stats.maxBytes = Math.max(this.stats.maxBytes, s.length);
    const t = realMs(); this.stats.perSec.push(t); while (this.stats.perSec.length && t - this.stats.perSec[0] > 1000) this.stats.perSec.shift();
    return HUB.send(data, o);
  }
};
KC.SessionScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: false, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter() {
    const g = KC.game; this.state = 'connect'; this.t = 0; this.card = null; this.msgs = []; this.evq = []; this.remote = {}; this.lat = {}; this.left = new Set(); this.snaps = []; this.fairQ = [];
    KC.Stage.enter(g, 'stadium'); KC.music('session'); g.setView('kcside'); KC.scene = this; this.ref = new KC.Referee(); this.reader = new KC.Reader(g.input); this.lastSend = -1e9; this.lastHb = -1e9; this.lastSnap = -1e9; this.dirty = false; this.edges = []; this.seq = 0; this.lastP = 'n';
    this._connect();
  },
  exit() { KC.scene = null; },
  async _connect() {
    let info = null;
    try { info = await HUB.connect({ mode: 'shared-world', seats: [2, 4], card: true }); } catch (e) { info = null; }
    if (!info) { KC.game.go('title'); return; }
    this.info = info; this.me = info.me; this.isHost = !!info.isHost; this.server = !!info.server; this.players = (info.players || []).map(p => ({ id: p.id, name: KC.cleanName(p.name), color: p.color || '#ffffff' }));
    this.byId = {}; this.players.forEach((p, i) => { p.fid = SESSION_FIDS[i % SESSION_FIDS.length]; p.rig = KC.makeRig(p.fid, 'white', 'dan1', { colors: { belt: p.color, trim: p.color } }); this.byId[p.id] = p; });
    HUB.on('card', c => { this.card = c; });
    HUB.on('start', () => { this.state = 'countdown'; this.beats = 3; });
    HUB.on('message', (data, from) => this._onMessage(data, from));
    HUB.on('leave', e => this._onLeave(e.id));
    HUB.on('time-up', () => { if (this.isHost) this._finish(true); });
    HUB.on('end', e => this._onEnd(e));
    this.state = 'card';
    HUB.ready();
  },
  name(id) { const p = this.byId && this.byId[id]; return p ? p.name : 'P' + (id + 1); },
  /* ---- messages ---- */
  _onMessage(m, from) {
    if (!m || this.ended) return; KC.Net.stats.recv++;
    if (m.t === 'in' && this.isHost) {
      const R = this.remote[from] || (this.remote[from] = { posture: 'n', presses: [], seq: -1 });
      if (m.s <= R.seq) return; R.seq = m.s; R.posture = PCODE[m.p] || 'n';
      for (const e of m.e || []) R.presses.push(PCODE[e[0]]);
      const lat = Math.max(0, now() - (m.a || 0)); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2;
    } else if (m.t === 'hb' && this.isHost) { const lat = Math.max(0, now() - (m.a || 0)); this.lat[from] = this.lat[from] === undefined ? lat : this.lat[from] * .8 + lat * .2; }
    else if (m.t === 's' && !this.isHost) { this.snaps.push(Object.assign({ at: realMs() }, m)); if (this.snaps.length > 30) this.snaps.shift(); if (this.state === 'countdown' && now() >= 0) this.state = 'play'; }
    else if (m.t === 'ev' && !this.isHost) for (const e of m.list || []) this._event(e);
  },
  // a host event replayed on a guest: sounds, popups, the referee's calls, the bout's changes
  _event(e) {
    const P = this.pb;
    if (e.k === 'bout') { this._puppets(e.ids, e.rules); this.queue = e.q; return; }
    if (e.k === 'over') { this.standings = e.standings; this.state = 'over'; return; }
    if (e.k === 'boutEnd') { this.lastWinner = e.w; this.wins = e.wins; return; }
    if (!P) return;
    if (e.k === 'call') P.ref.call(e.id, e.sub ? { sub: e.sub } : undefined);
    else if (e.k === 'sig') P.ref.signal(SIGS[e.s], e.side, 1);
    else { const f = e.side !== undefined ? P.f[e.side] : null; P.bus.emit(e.k, Object.assign({}, e, { f })); }
  },
  _onLeave(id) {
    this.left.add(id); if (!this.isHost || !this.K) return;
    const [w, r] = this.K.current(), inBout = id === w || id === r;
    this.K.remove(id);
    const alive = this.players.filter(p => !this.left.has(p.id));
    if (alive.length < 2) { this._finish(false); return; }
    if (inBout && this.sub && this.sub.bout && this.sub.bout.phase !== 'over') { const side = id === w ? 1 : 0; this.forfeit = true; this.sub.bout.forceWin(side, 'forfeit'); }
  },
  _onEnd(e) {
    this.ended = true; KC.Net.ended = true; this.state = 'over'; this.endReason = e.reason; if (e.standings) this.standings = e.standings;
    KC.game.audio.music(null); KC.Voice.muted = true; KC.game.audio.mute(true);
  },
  /* ---- the host: kachinuki and bouts ---- */
  _hostStart() {
    const ids = this.players.map(p => p.id).filter(id => !this.left.has(id));
    this.K = new KC.Kachinuki({ ids, target: KC.TUNE.sessionTarget }); this.boutN = 0; this._bout();
  },
  _bout() {
    const K = this.K, [w, r] = K.current(), self = this; if (w === undefined || r === undefined) { this._finish(false); return; }
    const pw = this.byId[w], pr = this.byId[r], rules = { roundsToWin: 1, pointsToWin: 2, clock: 30, intro: this.boutN === 0 };
    this.cur = [w, r]; this.boutN++; this.forfeit = false;
    const sub = Object.create(KC.FightScene); this.sub = sub;
    sub.enter({ mode: 'online', stage: 'stadium', seed: (this.info.seed || 1) + this.boutN, rules, noBelt: true,
      sides: [{ fid: pw.fid, name: pw.name, color: pw.color, tag: 'WINS ' + K.wins[w] }, { fid: pr.fid, name: pr.name, color: pr.color, tag: 'WINS ' + K.wins[r] }],
      net: { control: (i, f) => self._control(i, f), after: () => {} },
      onEnd: (win, b) => self._boutEnd(win, b) });
    sub.fx.noSlow = true;
    sub.bout.bus.on('*', (k, d) => self._collect(k, d));
    this._ev({ k: 'bout', ids: [w, r], q: K.queue.slice(), rules });
  },
  _collect(k, d) {
    const side = d && d.f ? d.f.side : d && d.side;
    if (k === 'call') this._ev({ k: 'call', id: d.id, sub: this.sub && this.sub.ref.banners.length ? this.sub.ref.banners[this.sub.ref.banners.length - 1].sub : null });
    else if (k === 'point') this._ev({ k: 'point', side: d.side, tech: d.tech, pts: d.pts, full: d.full, counter: d.counter, x: Math.round(d.x), z: Math.round(d.z) });
    else if (k === 'block') this._ev({ k: 'block', side: d.side, x: Math.round(d.x), z: Math.round(d.z) });
    else if (['active', 'land', 'start'].includes(k)) this._ev({ k, side, tech: d.tech, heavy: d.heavy });
    else if (['aiuchi', 'card', 'whistle', 'flag', 'roundEnd'].includes(k)) this._ev({ k, last: d && d.last, perfect: d && d.perfect });
  },
  _ev(e) { this.evq.push(e); },
  _boutEnd(win, b) {
    const K = this.K, ids = this.cur, st = {};
    ids.forEach((id, s) => { st[id] = { pts: b.score[s], conceded: b.conceded[s], full: b.f[s].stats.full, half: b.f[s].stats.half, blocks: b.f[s].stats.blocks }; });
    if (!this.left.has(ids[win]) || this.forfeit) K.result(ids[win], st); else K.result(ids[1 - win], st);
    this._ev({ k: 'boutEnd', w: ids[win], wins: Object.assign({}, K.wins) }); this.lastWinner = ids[win]; this.wins = Object.assign({}, K.wins);
    this.between = 1.8;
  },
  // a fighter's intent on the host: its own (fairness-delayed), or the remote player's latest posture and presses
  _control(i, f) {
    const id = this.cur[i];
    if (!this.server && id === this.me) {
      const c = KC.Overlay.active || KC.game.paused ? { posture: 'n', press: null } : this.reader.read(), other = this.cur[1 - i], delay = clamp(this.lat[other] || 0, 0, 150);
      this.fairQ.push({ at: realMs(), c }); let out = { posture: this.lastHostP || 'n', press: null };
      while (this.fairQ.length && realMs() - this.fairQ[0].at >= delay) { const q = this.fairQ.shift(); out = { posture: q.c.posture, press: q.c.press || out.press }; this.lastHostP = q.c.posture; }
      if (!out.press && this.pendingPress && f.free) { out.press = this.pendingPress; this.pendingPress = null; } else if (out.press && !f.free) { this.pendingPress = out.press; out.press = null; }
      return out;
    }
    const R = this.remote[id]; if (!R || this.left.has(id)) return { posture: 'n', press: null };
    return { posture: R.posture, press: R.presses.length ? R.presses.shift() : null };
  },
  _snapshot() {
    const sc = this.sub, b = sc && sc.bout; if (!b) return;
    const ref = sc.ref, sig = SIGS.indexOf(ref.sig);
    this.send({ t: 's', a: Math.round(now()), ph: b.phase, c: Math.round(b.clock * 10) / 10, sc: b.points, rw: b.roundWins, ids: this.cur, q: this.K.queue, f: b.f.map(f => f.snap()), ref: [Math.round(ref.x), sig < 0 ? 0 : sig, ref.side, ref.judges.map(j => j.vote)], card: b.phase === 'card' ? b.cardText : 0 }, { reliable: false });
  },
  _finish(timeUp) {
    if (this.finished || !this.isHost) return; this.finished = true;
    const K = this.K || new KC.Kachinuki({ ids: this.players.map(p => p.id) });
    const b = this.sub && this.sub.bout;
    if (timeUp && b && b.phase !== 'over' && b.points[0] !== b.points[1]) K.result(this.cur[b.points[0] > b.points[1] ? 0 : 1]);   // a bout in progress counts only when a side leads
    const live = id => !this.left.has(id), standings = K.standings().map(g => g.filter(live)).filter(g => g.length), scores = {}, stats = {};
    for (const p of this.players) { scores[p.id] = K.wins[p.id] || 0; stats[p.id] = { 'Bouts won': K.wins[p.id] || 0, 'Full points': K.full[p.id] || 0, 'Half points': K.half[p.id] || 0, 'Best streak': K.best[p.id] || 0 }; }
    const awards = [], top = (m, t, d, min = 1) => { let best = null; for (const p of this.players) if ((m[p.id] || 0) >= min && (!best || m[p.id] > m[best])) best = p.id; if (best !== null) awards.push({ id: best, title: t, detail: d(m[best]) }); };
    top(K.full, 'IPPON HUNTER', n => n + ' full points'); top(K.blocks, 'IRON WALL', n => n + ' blocks'); top(K.best, 'KACHINUKI', n => n + ' bouts in a row', 3);
    this.standings = standings; this.state = 'over';
    this._ev({ k: 'over', standings }); this._flush();
    try { HUB.finish({ standings, scores, stats, awards }); } catch (e) { KC.game.fail('finish', e); }
  },
  send(d, o) { return KC.Net.send(d, o); },
  _flush() { if (this.evq.length) { this.send({ t: 'ev', list: this.evq.splice(0, 40) }); } },
  /* ---- guests: puppets from snapshots ---- */
  _puppets(ids, rules) {
    if (this.pIds && this.pIds[0] === ids[0] && this.pIds[1] === ids[1] && this.pb) return;
    this.pIds = ids.slice(); const F = ids.map((id, s) => { const k = new KC.Karateka({ fid: this.byId[id] ? this.byId[id].fid : 'taro', side: s }); return k; });
    this.pref = new KC.Referee(); this.pb = new PuppetBout(F, this.pref); if (rules) this.pb.rules = rules;
    KC.fx.attach(this.pb, KC.game, { noSlow: true });
    for (const f of F) f.bus = this.pb.bus;
    this.snaps = this.snaps.filter(s => s.ids && s.ids[0] === ids[0] && s.ids[1] === ids[1]);
  },
  _applySnaps(dt) {
    if (!this.snaps.length) return; const S = this.snaps, last = S[S.length - 1];
    if (!this.pb || !last.ids || this.pIds[0] !== last.ids[0] || this.pIds[1] !== last.ids[1]) this._puppets(last.ids);
    const t = realMs() - 100; let a = S[0], b = S[0];
    for (let i = 0; i < S.length; i++) { if (S[i].at <= t) a = S[i]; if (S[i].at >= t) { b = S[i]; break; } b = S[i]; }
    const u = b.at > a.at ? clamp((t - a.at) / (b.at - a.at), 0, 1) : 1, P = this.pb;
    P.f.forEach((f, i) => {
      const sa = a.f && a.f[i], sb = b.f && b.f[i]; if (!sa || !sb) return;
      if (i === this.mySide && this.pred && realMs() - this.pred.at < 250 && !(KC.TECH[TECH_IDS[sb[4]]] && TECH_IDS[sb[4]] === this.pred.tech)) { f.k++; f._physics(dt); return; }   // keep the predicted wind-up until confirmed
      if (this.pred && i === this.mySide && (realMs() - this.pred.at >= 250 || TECH_IDS[sb[4]] === this.pred.tech)) this.pred = null;
      f.applySnap(sb); f.x = lerp(sa[0], sb[0], u); f.z = lerp(sa[1], sb[1], u);
    });
    P.phase = b.ph; P.clock = b.c; P.points = b.sc; P.roundWins = b.rw; P.cardText = b.card || P.cardText; this.queue = b.q;
    if (b.ref) { this.pref.tx = b.ref[0]; this.pref.x = approach(this.pref.x, b.ref[0], dt * 80); const sig = SIGS[b.ref[1]]; if (sig && this.pref.sig !== sig) this.pref.signal(sig, b.ref[2] === 1 ? 0 : 1, .3); else if (!sig) this.pref.sigT = Math.min(this.pref.sigT, .1); if (b.ref[3]) b.ref[3].forEach((v, j) => { this.pref.judges[j].vote = v; }); }
  },
  /* ---- every step ---- */
  update(dt) {
    const g = KC.game; this.t += dt; KC.Stage.update(dt);
    if (this.ended) { KC.camera(g, [200]); return; }
    if (this.state === 'card') {
      const I = g.input, c = I.clicked();
      if (!this.server) {
        if (KC.anyPressed('confirm') || KC.anyPressed('start') || (c && this.readyBtn && this._in(c, this.readyBtn))) { KC.consumeAll(); HUB.answer('ready'); KC.sfx('menuOk'); }
        if (KC.anyPressed('alt') || (c && this.moreBtn && this._in(c, this.moreBtn))) { KC.consumeAll(); HUB.answer('more'); KC.sfx('menuMove'); }
      }
      this._seiza(dt);
    } else if (this.state === 'countdown') {
      const T = now(), beat = Math.ceil(-T / 1000);
      if (T < 0 && beat !== this.beats && beat >= 1 && beat <= 3) { this.beats = beat; KC.sfx('taikoHit'); }
      if (T >= 0) { this.state = 'play'; if (this.isHost) this._hostStart(); }
      this._seiza(dt);
    } else if (this.state === 'play' || (this.state === 'over' && !this.ended)) {
      if (this.isHost) this._hostStep(dt); else this._guestStep(dt);
    }
    KC.camera(g, this.sub && this.isHost ? this.sub.fighters.map(f => f.x) : this.pb ? this.pb.f.map(f => f.x) : [200]);
  },
  _hostStep(dt) {
    if (this.sub && this.state === 'play') {
      KC.fx.step(KC.game, this.sub.fx, dt); this.sub.controls(dt); this.sub.bout.update(dt); KC.Stage.cheer = Math.max(KC.Stage.cheer, 0);
      if (this.between !== undefined && this.between !== null) { this.between -= dt; if (this.between <= 0) { this.between = null; if (this.K.champion !== null && this.K.champion !== undefined) this._finish(false); else this._bout(); } }
    }
    const t = realMs();
    if (t - this.lastSnap >= 100) { this.lastSnap = t; this._snapshot(); }
    if (this.evq.length && t - this.lastEv >= 250) { this.lastEv = t; this._flush(); }
    if (this.lastEv === undefined) this.lastEv = t;
  },
  _guestStep(dt) {
    const g = KC.game, t = realMs(), blocked = KC.Overlay.active || g.paused, c = blocked ? { posture: 'n', press: null } : this.reader.read();
    this.mySide = this.pIds ? this.pIds.indexOf(this.me) : -1;
    if (c.posture !== this.lastP) { this.lastP = c.posture; this.dirty = true; }
    if (c.press && this.mySide >= 0) { this.edges.push([PCODE.indexOf(c.press), Math.round(now())]); this.dirty = true; const f = this.pb && this.pb.f[this.mySide]; if (f && f.free && f.ctlOn) { const id = KC.MATRIX[KC.relDir(c.posture, f.face)][KC.relDir(c.press, f.face)]; if (id && id !== 'crouch') { f.startTech(id, this.pb.f[1 - this.mySide]); this.pred = { tech: f.tech, at: t }; } } }
    if (this.dirty && t - this.lastSend >= 67 && this.mySide >= 0) { this.lastSend = t; this.dirty = false; this.send({ t: 'in', s: ++this.seq, a: Math.round(now()), p: PCODE.indexOf(c.posture), h: 0, e: this.edges.splice(0) }); }
    if (t - this.lastHb >= 500) { this.lastHb = t; this.send({ t: 'hb', a: Math.round(now()) }, { reliable: false }); }
    if (this.pb) { this._applySnaps(dt); this.pref.update(dt, null); for (const f of this.pb.f) f.pose(dt); }
  },
  _seiza(dt) { (this.players || []).forEach((p, i) => { KC.poseStep(p.rig, dt, { seiza: 1 }); p.rig.update(dt, { x: 120 + i * 54, y: 0, z: 0, facing: PI / 2 }); }); },
  _in(c, b) { return c[0] >= b[0] && c[0] < b[0] + b[2] && c[1] >= b[1] && c[1] < b[1] + b[3]; },
  draw(r) {
    const S = this.state, host = this.isHost;
    KC.Stage.draw(r, 'stadium', {});
    if ((S === 'card' || S === 'countdown' || S === 'connect') && this.players) this.players.forEach((p, i) => r.actor(120 + i * 54, 0, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view)));
    else if (host && this.sub) { this.sub.ref.draw(r); for (const f of this.sub.fighters) f.draw(r); this._bench(r, this.cur); KC.HUD.draw(r, this.sub.bout, { names: this.sub.sides.map(s => s.name), colors: this.sub.sides.map(s => s.color), tags: this.sub.sides.map(s => s.tag), noBelt: true }); }
    else if (this.pb) { this.pref.draw(r); for (const f of this.pb.f) f.draw(r); this._bench(r, this.pIds); KC.HUD.draw(r, this.pb, { names: this.pIds.map(id => this.name(id)), colors: this.pIds.map(id => this.byId[id] ? this.byId[id].color : '#fff'), noBelt: true }); }
    r.overlay(g => {
      const W = r.W, H = r.H, mid = Math.round(W / 2);
      if (S === 'connect') { E.font.text(g, 'CONNECTING...', mid, H / 2, '#ffe7a8', { align: 'center', outline: '#000', scale: 2 }); return; }
      if (S === 'card' || S === 'countdown') this._drawCard(g, W, H);
      if (S === 'countdown') { const T = now(), n = Math.ceil(-T / 1000); E.font.title(g, T < 0 ? String(Math.max(1, n)) : KC.call('begin'), mid, Math.round(H * .3), { scale: 5, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 3 }); }
      if (S === 'play') {
        const q = this.queue || (this.K && this.K.queue) || [], wins = this.wins || (this.K && this.K.wins) || {};
        const next = q.slice(2).map(id => (id === this.me ? 'YOU' : this.name(id))).join(', '); if (next) E.font.text(g, 'NEXT: ' + next, mid, H - 26, q[2] === this.me ? '#ffd060' : '#c8c0e8', { align: 'center', outline: '#000' });
        E.font.text(g, (this.players || []).map(p => p.name + ' ' + (wins[p.id] || 0)).join('   '), mid, H - 12, '#a8a0c8', { align: 'center', outline: '#000', font: 'tiny' });
        if (this.between > 0 && this.lastWinner !== undefined) E.font.title(g, this.name(this.lastWinner) + ' STAYS ON!', mid, Math.round(H * .55), { scale: 2, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      }
      if (S === 'over') this._drawOver(g, W, H);
    });
  },
  // the queued players kneel in seiza at the mat's edge
  _bench(r, cur) { (this.players || []).filter(p => !cur || !cur.includes(p.id)).filter(p => !this.left.has(p.id)).forEach((p, i) => { KC.poseStep(p.rig, 1 / 60, { seiza: 1 }); const x = i % 2 ? 392 - Math.floor(i / 2) * 20 : 8 + Math.floor(i / 2) * 20; p.rig.update(1 / 60, { x, y: 6, z: 0, facing: x < 200 ? 0 : PI }); r.actor(x, 6, 0, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view)); }); },
  _drawCard(g, W, H) {
    const mid = Math.round(W / 2), C = this.card || {};
    px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, 100, '#05040a'));
    KC.drawLogo(g, W, 4, this.t, 3);
    E.font.text(g, KC.TEXT.kachinuki, mid, 46, '#ffe7a8', { align: 'center', outline: '#000', scale: 2 }); E.font.text(g, KC.TEXT.kachiRule, mid, 66, '#fff6e8', { align: 'center', outline: '#000' });
    (this.players || []).forEach((p, i) => { const x = Math.round(r0(i)); E.font.text(g, p.name + (p.id === this.me ? ' (YOU)' : ''), x, 80, p.color, { align: 'center', outline: '#000', font: 'tiny' }); if ((C.ready || []).includes(p.id)) E.font.text(g, 'READY', x, 88, '#8ae08a', { align: 'center', outline: '#000', font: 'tiny' }); });
    function r0(i) { const sc = E.VIEWS.kcside.scale, cx = KC.game.cam ? KC.game.cam.x : 200; void cx; return W / 2 + (120 + i * 54 - 200) * sc; }
    const dev = KC.device(), ctl = dev === 'gamepad' ? [{ kind: 'stick', side: 'L', dir: null }, 'MOVE  ', { kind: 'stick', side: 'R', dir: null }, 'STRIKE'] : [KC.actionIcon('up'), KC.actionIcon('left'), KC.actionIcon('down'), KC.actionIcon('right'), 'MOVE  ', KC.actionIcon('tUp'), KC.actionIcon('tLeft'), KC.actionIcon('tDown'), KC.actionIcon('tRight'), 'STRIKE'];
    const cw = KC.iconRow(g, 0, 0, ctl, 1, false); KC.iconRow(g, mid - Math.round(cw / 2), H - 58, ctl, 1);
    if (!this.server) {
      const rb = [mid - 92, H - 40, 84, 18], mb = [mid + 8, H - 40, 84, 18]; this.readyBtn = rb; this.moreBtn = mb; const asked = C.asked;
      E.ui.box(g, rb[0], rb[1], rb[2], rb[3], { bg: '#1a3a1a', border: '#8ae08a' }); KC.iconRow(g, rb[0] + 6, rb[1] + 3, [KC.actionIcon('confirm'), 'READY'], 1);
      E.ui.box(g, mb[0], mb[1], mb[2], mb[3], { bg: asked ? '#3a3a1a' : '#1a1a2a', border: '#e8d8b0' }); KC.iconRow(g, mb[0] + 6, mb[1] + 3, [KC.actionIcon('alt'), asked ? 'ASKED' : 'MORE TIME'], 1);
    }
    const left = C.left === null || C.left === undefined ? (C.paused ? 'PAUSED' : C.starting ? 'STARTING' : '') : Math.ceil(C.left / 1000) + 's';
    if (left) E.font.text(g, left, W - 10, H - 34, '#ffd060', { align: 'right', outline: '#000', scale: 2 });
  },
  _drawOver(g, W, H) {
    const mid = Math.round(W / 2); px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
    E.font.title(g, this.endReason === 'host-left' ? KC.TEXT.hostLeft : KC.TEXT.roundOver, mid, 30, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'], depth: 2 });
    (this.standings || []).forEach((grp, i) => E.font.text(g, (i + 1) + '. ' + grp.map(id => this.name(id)).join(' = '), mid, 76 + i * 18, i === 0 ? '#ffd060' : '#fff6e8', { align: 'center', outline: '#000', scale: 2 }));
  },
  debugState() { return { state: this.state, host: this.isHost, server: this.server, me: this.me, queue: this.K ? this.K.queue : this.queue, standings: this.standings, phase: this.isHost ? this.sub && this.sub.bout && this.sub.bout.phase : this.pb && this.pb.phase, wins: this.K ? this.K.wins : this.wins, ended: !!this.ended }; }
};

// ---- src/70-dev.js ----
/* =====================================================================================================================
 * DEV MODE (the pause menu's Dev mode; after the first use F2, ` or L3+R3 toggle it; ?dev=1 enables it). A canvas panel,
 * 10-foot readable, 8 rows a page, tabs (L1/R1, Q/E or a click): TUNING (every balance variable a live slider, RESET ALL
 * TO DEFAULTS at the top; triangle or T resets one), TOGGLES, WARP, INFO. Persisted under E.store('kc:dev'). While any
 * tuning value is changed the HUD shows DEV and no high score is recorded. The TECHNIQUE LAB measures every technique.
 * ===================================================================================================================== */
KC.DEV = {
  on: false, boxes: false, frameData: false, inputDisplay: false, aiThoughts: false, invincible: false, p2: 'cpu', infiniteTime: false, freezeCpu: false,
  slowmo: false, frozen: false, fps: false, muteVoices: false, skipCutscenes: false, unlockAll: false,
  anyToggle() { return this.boxes || this.invincible || this.infiniteTime || this.freezeCpu || this.slowmo || this.frozen || this.unlockAll || this.p2 !== 'cpu'; }
};
const DEV_TOGGLES = [['boxes', 'HIT, HURT AND PUSH BOXES'], ['frameData', 'FRAME DATA'], ['inputDisplay', 'INPUT DISPLAY'], ['aiThoughts', 'AI THOUGHTS'], ['invincible', 'P1 INVINCIBLE'], ['p2', 'P2 CONTROL'], ['infiniteTime', 'INFINITE TIME'], ['freezeCpu', 'FREEZE CPU'], ['slowmo', 'SLOW MOTION 0.25x'], ['frozen', 'FRAME STEP (NEXT: E / R1)'], ['fps', 'FPS AND STATS'], ['muteVoices', 'MUTE VOICES'], ['skipCutscenes', 'SKIP CUTSCENES'], ['unlockAll', 'UNLOCK ALL']];
const P2_MODES = ['cpu', 'pad2', 'stand', 'crouch', 'jump', 'block', 'attack'];
KC.timeScale = () => KC.TUNE.gameSpeed * (KC.DEV.slowmo ? .25 : 1);
KC.Dev = {
  load() { const d = KC.store.get('dev', null); if (d && typeof d === 'object') { if (d.tune) for (const k in KC.TUNE_DEFAULTS) if (typeof d.tune[k] === 'number') KC.TUNE[k] = clamp(d.tune[k], KC.TUNE_SPEC[k][0], KC.TUNE_SPEC[k][1]); for (const [k] of DEV_TOGGLES) if (k in (d.flags || {})) KC.DEV[k] = d.flags[k]; KC.DEV.on = !!d.on; } if (typeof location !== 'undefined' && /[?&]dev=1/.test(location.search || '')) KC.DEV.on = true; KC.Voice.muted = KC.DEV.muteVoices; },
  persist() { const flags = {}; for (const [k] of DEV_TOGGLES) flags[k] = KC.DEV[k]; KC.store.set('dev', { on: KC.DEV.on, tune: KC.TUNE, flags }); },
  set(k, v) { const S = KC.TUNE_SPEC[k]; if (!S) return; KC.TUNE[k] = clamp(Math.round(v / S[2]) * S[2], S[0], S[1]); KC.TUNE[k] = +KC.TUNE[k].toFixed(4); if (k === 'gameSpeed' && KC.game) KC.game.timeScale = KC.timeScale(); this.persist(); },
  resetAll() { Object.assign(KC.TUNE, KC.TUNE_DEFAULTS); if (KC.game) KC.game.timeScale = KC.timeScale(); this.persist(); },
  exportTuning() { return JSON.stringify(KC.TUNE); },
  copy(text) { try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) { /* no clipboard */ } KC.game.note('COPIED TO THE CLIPBOARD'); KC.lastCopied = text; },
  open() { if (SESSION) return; KC.DEV.on = true; this.persist(); if (KC.Overlay.stack.includes(this.panel)) return; this.panel = this.make(); KC.Overlay.push(this.panel); },
  close() { if (this.panel) { KC.Overlay.stack = KC.Overlay.stack.filter(o => o !== this.panel); this.panel = null; KC.consumeAll(); } },
  toggle() { if (this.panel && KC.Overlay.stack.includes(this.panel)) this.close(); else this.open(); },
  warps() {
    const g = KC.game, W = [];
    KC.DATA.ladder.forEach((n, i) => W.push(['ROAD ' + (i + 1) + ': ' + (n.kind === 'match' ? 'VS ' + KC.FIGHTER[n.opponent].short : n.kind === 'practice' ? KC.LESSON[n.lesson].title : n.kind === 'bonus' ? KC.BONUS[n.bonus].name : n.id.toUpperCase()), () => { if (!KC.Story.active) KC.Story.newGame(); KC.Story.node = i; KC.Story.run(); }]));
    W.push(['TECHNIQUE LAB', () => g.go('lab', { tech: 'frontKick' })]);
    for (const s of KC.FIGHT_STAGES) W.push(['QUICK BOUT: ' + KC.STAGE[s].name, () => g.go('fight', KC.Versus.quickData(s, 'kamaboko'))]);
    for (const b of KC.DATA.bonus) W.push(['BONUS: ' + b.name, () => g.go('bonus', { id: b.id })]);
    for (const l of KC.DATA.lessons) W.push(['PRACTICE: ' + l.title, () => g.go('practice', { lesson: l.id })]);
    W.push(['THE ENDING', () => { if (!KC.Story.active) KC.Story.newGame(); g.go('cutscene', KC.Story.endingData()); }], ['CREDITS', () => g.go('credits', {})], ['ATTRACT MODE', () => g.go('attract')]);
    W.push(['RANK UP (STORY)', () => { const i = KC.rankIndex(KC.Story.rank); KC.Story.rank = KC.DATA.ranks[Math.min(9, i + 1)].id; }], ['+10,000 SCORE', () => { KC.Story.score += 10000; }]);
    W.push(['WIN THE ROUND', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') { b.points[0] = b.R('pointsToWin'); b.roundWinner = 0; b._go('roundEnd'); } }], ['LOSE THE ROUND', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') { b.points[1] = b.R('pointsToWin'); b.roundWinner = 1; b._go('roundEnd'); } }]);
    W.push(['WIN THE MATCH', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') b.forceWin(0, 'win'); }], ['LOSE THE MATCH', () => { const b = KC.scene && KC.scene.bout; if (b && b.phase !== 'over') b.forceWin(1, 'win'); }]);
    for (const id of Object.keys(KC.CALLS)) W.push(['CALL: ' + KC.CALLS[id][0], () => { const b = KC.scene && KC.scene.bout; if (b) b.call(id); else KC.Voice.call(id, KC.call(id)); }]);
    W.push(['COPY TUNING JSON', () => this.copy(this.exportTuning())], ['RESET THE SAVE', () => { KC.Save.reset(); try { g.saves.erase('auto'); } catch (e) { /* none */ } g.note('SAVE RESET'); }]);
    return W;
  },
  info() {
    const g = KC.game, sc = KC.scene, b = sc && sc.bout, L = [['VERSION', KC.VERSION + ' / ' + (E.versionLabel ? E.versionLabel() : E.version)], ['SCENE', g.sceneName + (sc && sc.mode ? ' (' + sc.mode + ')' : '')], ['SEED', sc && sc.d ? String(sc.d.seed || 1) : '-'], ['BOUT', b ? b.phase + '  CLOCK ' + b.clock.toFixed(1) + '  ' + b.points.join('-') : '-'], ['FPS', String(Math.round(g.fps || 0))]];
    if (sc && sc.ai) sc.ai.forEach((a, i) => { if (a) L.push(['AI ' + (i ? 'RED' : 'WHITE'), 'L' + a.level + ' ' + a.thought]); });
    const h = (b && b.lastPoint) || (sc && sc.spar && sc.spar.last); if (h && !h.aiuchi) L.push(['LAST HIT', h.tech + ' ' + h.pts + (h.counter ? ' COUNTER' : '') + '  TIMING ' + h.timingQ.toFixed(2) + '  SPACING ' + h.spacingQ.toFixed(2) + '  GAP ' + h.gap]);
    L.push(['TUNED', KC.tuneChanged() ? 'YES (NO HIGH SCORES)' : 'NO']);
    return L;
  },
  make() {
    const tabs = ['TUNING', 'TOGGLES', 'WARP', 'INFO'], P = { tab: 0, i: 0, t: 0, hold: 0, drag: null };
    const rows = () => {
      if (P.tab === 0) return [{ label: 'RESET ALL TO DEFAULTS', act: () => KC.Dev.resetAll() }].concat(Object.keys(KC.TUNE_DEFAULTS).map(k => ({ k, label: KC.TUNE_SPEC[k][3], slider: true })));
      if (P.tab === 1) return DEV_TOGGLES.map(([k, label]) => ({ k, label, toggle: true }));
      if (P.tab === 2) return KC.Dev.warps().map(([label, act]) => ({ label, act: () => { KC.Dev.close(); act(); } }));
      return KC.Dev.info().map(([label, v]) => ({ label, v }));
    };
    P.update = function (dt) {
      this.t += dt; const R = rows(), I = KC.game.input, n = R.length;
      if (KC.anyPressed('next')) { this.tab = (this.tab + 1) % 4; this.i = 0; KC.sfx('menuMove'); } if (KC.anyPressed('prev')) { this.tab = (this.tab + 3) % 4; this.i = 0; KC.sfx('menuMove'); }
      if (KC.anyRepeat('up')) this.i = (this.i + n - 1) % n; if (KC.anyRepeat('down')) this.i = (this.i + 1) % n;
      const it = R[this.i];
      const lr = (KC.anyPressed('left') || KC.anyPressed('right')) ? 1 : (KC.inputs().some(J => J.down('left') || J.down('right')) ? (this.hold += dt) : (this.hold = 0, 0));
      if (it && it.slider && (KC.anyRepeat('left') || KC.anyRepeat('right') || (lr && this.hold > .5))) { const S = KC.TUNE_SPEC[it.k], dir = KC.inputs().some(J => J.down('left')) ? -1 : 1, mult = this.hold > 1.5 ? 5 : 1; KC.Dev.set(it.k, KC.TUNE[it.k] + dir * S[2] * mult); }
      if (it && it.toggle && (KC.anyPressed('left') || KC.anyPressed('right') || KC.anyPressed('confirm'))) this._toggle(it.k, KC.anyPressed('left') ? -1 : 1);
      if (it && it.act && KC.anyPressed('confirm')) { KC.consumeAll(); it.act(); return; }
      if (it && it.slider && KC.anyPressed('alt')) KC.Dev.set(it.k, KC.TUNE_DEFAULTS[it.k]);
      // the mouse: tabs, rows (a click picks or toggles), a drag on a slider sets it
      const c = I.clicked(), p = I.pointer(), down = I.down('click');
      if (c && this.tabsAt) this.tabsAt.forEach(([x, w], k) => { if (c[0] >= x && c[0] < x + w && c[1] >= this.tabsY && c[1] < this.tabsY + 14) { this.tab = k; this.i = 0; } });
      if (this.rowsAt) for (const [k, x, y, w, h, sx, sw] of this.rowsAt) {
        if (c && c[0] >= x && c[0] < x + w && c[1] >= y && c[1] < y + h) { this.i = k; const r2 = R[k]; if (r2 && r2.toggle) this._toggle(r2.k, 1); else if (r2 && r2.act) { r2.act(); return; } else if (r2 && r2.slider) this.drag = { k: r2.k, sx, sw }; }
      }
      if (this.drag && down && p) { const S = KC.TUNE_SPEC[this.drag.k], u = clamp((p[0] - this.drag.sx) / this.drag.sw, 0, 1); KC.Dev.set(this.drag.k, S[0] + (S[1] - S[0]) * u); } else if (!down) this.drag = null;
      if (KC.anyPressed('cancel') || KC.anyPressed('dev')) { KC.consumeAll(); KC.Dev.close(); }
    };
    P._toggle = function (k, dir) { if (k === 'p2') { const i = P2_MODES.indexOf(KC.DEV.p2); KC.DEV.p2 = P2_MODES[(i + dir + P2_MODES.length) % P2_MODES.length]; } else KC.DEV[k] = !KC.DEV[k]; if (k === 'muteVoices') KC.Voice.muted = KC.DEV.muteVoices; if (k === 'slowmo' || k === 'frozen') KC.game.timeScale = KC.timeScale(); if (k === 'fps') KC.game.settings.set('showFps', KC.DEV.fps); KC.sfx('menuMove'); KC.Dev.persist(); };
    P.draw = function (g, W, H) {
      const R = rows(), w = Math.min(W - 16, 380), x = Math.round((W - w) / 2), y = 14, rh = 20, per = 8, h = per * rh + 56;
      E.ui.box(g, x, y, w, h, { bg: ['#1a0c14', '#0c0610'], border: '#ff8a6a', alpha: .95 });
      E.font.text(g, 'DEV MODE', x + 8, y + 5, '#ff8a6a', { outline: false });
      this.tabsAt = []; this.tabsY = y + 4; let tx = x + 70; tabs.forEach((t, k) => { const tw = E.font.width(t) + 10; px.rect(g, tx, y + 3, tw, 12, k === this.tab ? '#5a2a3a' : '#2a141c'); E.font.text(g, t, tx + 5, y + 5, k === this.tab ? '#ffd060' : '#a88a98', { outline: false }); this.tabsAt.push([tx, tw]); tx += tw + 3; });
      const first = clamp(this.i - 3, 0, Math.max(0, R.length - per)); this.rowsAt = [];
      R.slice(first, first + per).forEach((it, j) => {
        const k = first + j, yy = y + 22 + j * rh, on = k === this.i;
        if (on) px.rect(g, x + 4, yy - 2, w - 8, rh - 2, '#3a1a2a');
        E.font.text(g, (on ? '▸ ' : '  ') + it.label, x + 8, yy + 2, on ? '#fff6d0' : '#d8c8d0', { outline: false, scale: it.slider || it.toggle ? 1 : 1 });
        let sx = 0, sw = 0;
        if (it.slider) { const S = KC.TUNE_SPEC[it.k], v = KC.TUNE[it.k], u = (v - S[0]) / (S[1] - S[0]), changed = Math.abs(v - KC.TUNE_DEFAULTS[it.k]) > 1e-9; sx = x + w - 150; sw = 100; px.rect(g, sx, yy + 4, sw, 4, '#2a1a24'); px.rect(g, sx, yy + 4, Math.round(sw * u), 4, changed ? '#ff8a6a' : '#8a7ab0'); px.rect(g, sx + Math.round(sw * u) - 1, yy + 1, 3, 10, '#fff6d0'); E.font.text(g, String(+v.toFixed(2)), x + w - 10, yy + 2, changed ? '#ff8a6a' : '#c8c0e8', { align: 'right', outline: false }); }
        if (it.toggle) { const v = KC.DEV[it.k]; E.font.text(g, typeof v === 'boolean' ? (v ? 'ON' : 'OFF') : String(v).toUpperCase(), x + w - 10, yy + 2, v === true || (typeof v === 'string' && v !== 'cpu') ? '#8ae08a' : '#8a7a88', { align: 'right', outline: false }); }
        if (it.v !== undefined) E.font.text(g, String(it.v), x + 120, yy + 2, '#c8e0ff', { outline: false, font: 'tiny' });
        this.rowsAt.push([k, x + 4, yy - 2, w - 8, rh - 2, sx, sw]);
      });
      E.font.text(g, (this.i + 1) + '/' + R.length, x + w - 8, y + 5, '#a88a98', { align: 'right', outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TAB'], ['left', 'ADJUST'], ['alt', 'RESET'], ['cancel', 'CLOSE']]);
    };
    return P;
  }
};

/* ---- overlays drawn in the world: boxes, frame data, AI thoughts; free spar's panel ---- */
KC.DevDraw = {
  boxes(r, F) {
    r.overlay(g => {
      const out = (x0, z0, x1, z1, c) => { const a = r.w(x0, 0, z1), b = r.w(x1, 0, z0), x = Math.round(a[0]), y = Math.round(a[1]), w = Math.round(b[0] - a[0]), h = Math.round(b[1] - a[1]); px.rect(g, x, y, w, 1, c); px.rect(g, x, y + h - 1, w, 1, c); px.rect(g, x, y, 1, h, c); px.rect(g, x + w - 1, y, 1, h, c); };
      for (const f of F) {
        const prof = f.profile(), top = f.z + (prof === 'crouch' ? f.h * .55 : prof === 'roll' ? 24 : prof === 'flip' ? 40 : f.h);
        out(f.x - f.w / 2, f.z, f.x + f.w / 2, f.z + f.h, '#4a8aff');
        out(f.x - f.w / 2 - 2, f.z + (prof === 'flip' ? 12 : 0), f.x + f.w / 2 + 2, top, prof ? '#4ad860' : '#ffffff');
        if (f.st === 'tech' && f.T.scoring) { const [lo, hi] = f.contactBand(f.T), x0 = f.x + f.face * (f.w / 2 + lo), x1 = f.x + f.face * (f.w / 2 + hi), H = KC.Karateka.heightOf(f.T), zc = f.z + (H === 'low' ? 8 : H === 'mid' || H === 'midlow' ? 34 : 52); out(Math.min(x0, x1), zc - 5, Math.max(x0, x1), zc + 5, f.phase === 'active' ? '#ff4a4a' : '#8a3a3a'); }
        if (KC.DEV.frameData || (KC.scene && KC.scene.mode === 'freeSpar')) { const p = r.w(f.x, 0, f.z + f.h + 14); const t = f.st === 'tech' ? f.T.id + ' ' + f.fr.join('/') + (f.extra ? '+' + f.extra : '') + ' K' + f.k : f.st; E.font.text(g, t, Math.round(p[0]), Math.round(p[1]), '#ffe08a', { align: 'center', outline: '#000', font: 'tiny' }); }
      }
      if (KC.DEV.aiThoughts && KC.scene && KC.scene.ai) KC.scene.ai.forEach((a, i) => { if (!a) return; const f = F[i], p = r.w(f.x, 0, f.z + f.h + 24); E.font.text(g, a.thought, Math.round(p[0]), Math.round(p[1]), '#c8e0ff', { align: 'center', outline: '#000', font: 'tiny' }); });
    });
  },
  spar(r, sc) {
    r.overlay(g => {
      const W = r.W, H = r.H; E.ui.box(g, 6, 6, 170, 58, { bg: '#0c0a18', border: '#8a7ab0', alpha: .85 });
      E.font.text(g, 'FREE SPAR - DUMMY: ' + sc.spar.dummy.toUpperCase(), 12, 10, '#ffd060', { outline: false, font: 'tiny' });
      sc.spar.hits.forEach((h, i) => E.font.text(g, KC.TECH[h.tech].name + ' ' + h.pts + (h.full ? ' FULL' : ' HALF') + (h.counter ? ' x2' : '') + ' Q' + h.q.toFixed(2), 12, 22 + i * 9, i ? '#a8a0c8' : '#fff6e8', { outline: false, font: 'tiny' }));
      E.font.text(g, 'CLICK THE DUMMY OR PRESS T / △ TO CHANGE IT', W / 2, H - 30, '#8a80a8', { align: 'center', outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['alt', 'DUMMY'], ['pause', 'MENU']]);
    });
    const I = KC.game.input, c = I.clicked(), d = sc.fighters[1], p = r.w(d.x, 0, d.z + d.h / 2);
    if ((c && Math.abs(c[0] - p[0]) < 20 && Math.abs(c[1] - p[1]) < 40) || KC.anyPressed('alt')) { const i = KC.DUMMY_MODES.indexOf(sc.spar.dummy); sc.spar.dummy = KC.DUMMY_MODES[(i + 1) % 5]; KC.game.note('DUMMY: ' + sc.spar.dummy.toUpperCase()); }
  }
};

/* ---- THE TECHNIQUE LAB (#lab/<techId>): the hero against a standing dummy; the technique's frame data and its measured
 * contact gap; live sliders for its frames and reach; COPY JSON. Also the filmstrip target ---- */
KC.LabScene = {
  view: 'kcside', input: KC_KEYS, res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    d = d || {}; this.ids = KC.DATA.techniques.map(t => t.id).filter(id => id !== 'crouch'); this.i = Math.max(0, this.ids.indexOf(d.tech)); this.t = 0; this.row = 0; this.slow = false; this.boxes = true; this.measured = null; this.play = 0;
    KC.Stage.enter(KC.game, 'dojo'); KC.music('practice'); KC.scene = this; this.mode = 'lab';
    this.hero = new KC.Karateka({ fid: 'taro', side: 0, x: 150 }); this.dummy = new KC.Karateka({ fid: 'negi', side: 1, x: 250 }); this.dummy.release(this.hero); this.hero.release(this.dummy);
    this.bus = new KC.Bus(); this.hero.bus = this.bus; this.fx = {}; KC.fx.attach({ bus: this.bus, f: [this.hero, this.dummy] }, KC.game, this.fx); this.dmode = 'stand';
    this.fighters = [this.hero, this.dummy]; this.ai = [null, null]; this._place(); this.autoplay = d.autoplay !== false;
  },
  exit() { KC.scene = null; KC.game.timeScale = 1; },
  get tech() { return KC.TECH[this.ids[this.i]]; },
  // stand the dummy at the gap the technique wants (the top of its band, less a little)
  _place() { const t = this.tech, b = this.hero.band(t), gap = t.scoring ? Math.max(0, b[1] - 3) : 60; this.hero.x = 150; this.dummy.x = this.hero.x + (this.hero.w + this.dummy.w) / 2 + gap; this.hero.release(this.dummy); this.dummy.release(this.hero); this.measured = null; this.startGap = gap; },
  update(dt) {
    const g = KC.game, h = this.hero, D = this.dummy, t = this.tech; this.t += dt; KC.Stage.update(dt); KC.fx.step(g, this.fx, dt);
    g.timeScale = this.slow ? .25 : KC.timeScale();
    if (KC.anyPressed('next')) { this.i = (this.i + 1) % this.ids.length; this._place(); KC.sfx('menuMove'); }
    if (KC.anyPressed('prev')) { this.i = (this.i + this.ids.length - 1) % this.ids.length; this._place(); KC.sfx('menuMove'); }
    if (KC.anyPressed('confirm') || (this.autoplay && h.free && D.free && (this.play -= dt) < 0)) { KC.consumeAll(); this._place(); h.startTech(t.id, D); this.play = 1.2; }
    if (KC.anyPressed('tLeft')) this.slow = !this.slow; if (KC.anyPressed('alt')) this.boxes = !this.boxes;
    if (KC.anyRepeat('up')) this.row = (this.row + 3) % 4; if (KC.anyRepeat('down')) this.row = (this.row + 1) % 4;
    if (KC.anyRepeat('left') || KC.anyRepeat('right')) { const k = KC.anyRepeat('left') ? -1 : 1; if (this.row < 3) t.f[this.row] = clamp(t.f[this.row] + k, this.row === 1 ? 0 : 1, 99); else { t.reach[1] = clamp(t.reach[1] + k, t.reach[0], 140); } this._place(); }
    if (KC.anyPressed('tUp')) KC.Dev.copy(JSON.stringify({ id: t.id, f: t.f, reach: t.reach, pts: t.pts }));
    const c = g.input.clicked(); if (c) { const p = this.dummyAt; if (p && Math.abs(c[0] - p[0]) < 20 && Math.abs(c[1] - p[1]) < 40) { const i = KC.DUMMY_MODES.indexOf(this.dmode); this.dmode = KC.DUMMY_MODES[(i + 1) % 4]; } }
    D.control(this.dmode === 'crouch' ? { posture: 'd', press: null } : this.dmode === 'jump' ? { posture: D.free && Math.floor(this.t) % 2 ? 'u' : 'n', press: null } : { posture: 'n', press: null }); D.ctlOn = this.dmode !== 'stand';
    h.update(dt, D); D.update(dt, h); KC.Bout.push(h, D);
    const s = h.strike(D); if (s) { h.resolved = true; const sc = KC.Bout.prototype._score.call({}, h, D, s); this.measured = { gap: s.gap, startGap: this.startGap, pts: sc.pts, full: sc.full, q: sc.q }; this.bus.emit('point', Object.assign({ x: (h.x + D.x) / 2, z: 50 }, sc)); }
    h.pose(dt); D.pose(dt);
    KC.camera(g, [h.x, D.x]);
  },
  draw(r) {
    const t = this.tech, h = this.hero;
    KC.Stage.draw(r, 'dojo', { noCrowd: true });
    h.draw(r); this.dummy.draw(r); const p = r.w(this.dummy.x, 0, 30); this.dummyAt = p;
    if (this.boxes) KC.DevDraw.boxes(r, [h, this.dummy]);
    r.overlay(g => {
      const W = r.W, H = r.H; E.ui.box(g, 6, 6, 196, 104, { bg: '#0c0a18', border: '#ff8a6a', alpha: .9 });
      E.font.text(g, 'TECHNIQUE LAB ' + (this.i + 1) + '/' + this.ids.length, 12, 10, '#ff8a6a', { outline: false, font: 'tiny' });
      E.font.text(g, t.name, 12, 20, '#fff6d0', { outline: false });
      const fr = h.frames(t), rows = [['STARTUP', t.f[0] + 'F (' + fr[0] + ' STEPS)'], ['ACTIVE', t.f[1] + 'F (' + fr[1] + ')'], ['RECOVERY', t.f[2] + 'F (' + fr[2] + ')'], ['REACH', t.reach[0] + '-' + t.reach[1] + ' (CONTACT ' + h.contactBand(t).map(v => Math.round(v)).join('-') + ')']];
      rows.forEach(([k, v], j) => E.font.text(g, (j === this.row ? '▸ ' : '  ') + k + ' ' + v, 12, 32 + j * 10, j === this.row ? '#ffd060' : '#c8c0e8', { outline: false, font: 'tiny' }));
      E.font.text(g, 'HEIGHT ' + KC.Karateka.heightOf(t).toUpperCase() + '  PTS ' + t.pts.join('-') + (t.unblockable ? '  UNBLOCKABLE' : ''), 12, 74, '#a8a0c8', { outline: false, font: 'tiny' });
      const M = this.measured; E.font.text(g, M ? 'MEASURED: START GAP ' + Math.round(M.startGap) + ', CONTACT GAP ' + M.gap + ', ' + M.pts + (M.full ? ' FULL' : ' HALF') : 'MEASURED: -', 12, 84, '#8ae08a', { outline: false, font: 'tiny' });
      E.font.text(g, 'DUMMY: ' + this.dmode.toUpperCase() + (this.slow ? '  SLOW 0.25x' : ''), 12, 94, '#c8c0e8', { outline: false, font: 'tiny' });
      KC.promptBar(g, W, H, [['prev', ''], ['next', 'TECHNIQUE'], ['confirm', 'PLAY'], ['tLeft', 'SLOW'], ['alt', 'BOXES'], ['tUp', 'COPY JSON']]);
    });
  },
  debugState() { return { tech: this.tech.id, measured: this.measured }; }
};

// ---- src/80-debug.js ----
/* =====================================================================================================================
 * game.debug: the game's handle for the tests and the engine's tools (check.mjs prints snapshot(); replay.mjs hashes
 * stateHash()). Helpers drive the game the way a designer would: warp, tuning, injected intents, an autopilot.
 * ===================================================================================================================== */
KC.debugHandle = game => {
  const D = {
    snapshot() {
      const sc = KC.scene, b = sc && sc.bout, scn = game.scene, st = scn && scn.debugState ? scn.debugState() : null;
      return {
        scene: game.sceneName, mode: sc && sc.mode || null, node: KC.Story.active ? KC.Story.node : null, rank: KC.Story.rank, score: KC.Story.score,
        settings: { difficulty: game.settings.difficulty, calls: game.settings.calls, glyphs: game.settings.glyphs },
        bout: b ? { phase: b.phase, clock: +b.clock.toFixed(2), points: b.points.slice(), roundWins: b.roundWins.slice(), round: b.round, lastCall: b.lastCall, lastPoint: b.lastPoint, winner: b.winner,
          fighters: b.f.map(f => ({ id: f.fid, x: +f.x.toFixed(1), z: +f.z.toFixed(1), state: f.st, tech: f.tech, phase: f.phase, facing: f.face })) } : null,
        bonus: game.sceneName === 'bonus' ? st : null, drill: game.sceneName === 'practice' ? st : null, attract: game.sceneName === 'attract' ? st : null,
        online: game.sceneName === 'session' ? st : null, lab: game.sceneName === 'lab' ? st : null,
        dev: { on: KC.DEV.on, tuneChanged: KC.tuneChanged(), panel: KC.Overlay.active }, idle: +KC.idle.toFixed(2), touchGate: KC.touchOnly(), errors: game.errors.length
      };
    },
    warp(to, data) { if (typeof to === 'number') { if (!KC.Story.active) KC.Story.newGame(); KC.Story.node = to; KC.Story.run(); } else game.go(to, data); },
    setTune(k, v) { KC.Dev.set(k, v); }, resetTune() { KC.Dev.resetAll(); }, exportTuning() { return KC.Dev.exportTuning(); },
    /** inject a control intent for a side this step (a test plays a technique: control(0, { posture: 'n', press: 'r' })) */
    control(side, ctl) { const sc = KC.scene, f = sc && sc.fighters && sc.fighters[side]; if (f) { f.control(ctl); } },
    /** put an autopilot (a CPU at level L) on a side, or take it off (false) */
    autopilot(side, L) { const sc = KC.scene; if (!sc || !sc.fighters) return; if (L === false) { sc.ai[side] = null; sc.readers[side] = new KC.Reader(game.input); return; } sc.readers[side] = null; sc.ai[side] = new KC.KarateAI({ fid: sc.fighters[side].fid, level: L, seed: 99 + side }); },
    forceCall(id) { const b = KC.scene && KC.scene.bout; if (b) b.call(id); },
    KC
  };
  game.stateHash = () => { const b = KC.scene && KC.scene.bout; return b ? JSON.stringify([b.f.map(f => [Math.round(f.x), Math.round(f.z), f.st, f.tech]), b.phase, Math.round(b.clock * 10), b.points]) : game.sceneName; };
  return D;
};

// ---- src/90-start.js ----
/* =====================================================================================================================
 * START: the game, its settings and pause menu, the scenes, the boot steps and the deep links (#title, #road/<node>,
 * #fight/<stage>/<opponent>, #versus, #kachinuki/<n>, #bonus/<id>, #practice/<lesson>, #lab/<techId>, #attract, #about,
 * #ending, #spar, #records, #credits). In an AI Hub session it boots straight into the session.
 * ===================================================================================================================== */
if (typeof window !== 'undefined' && window.ASSETS && window.ASSETS.kc) E.addAssets(window.ASSETS.kc);   // the cut set of store props (assets/kc-set.js)
E.VIEWS.kcside = new E.View('kcside', 'Arcade side', 0, 0, 1.2, 1);
E.VIEWS.kctatami = new E.View('kctatami', 'Tatami 2.5D', 0, 24, 1.2, 1);
const canRetry = () => !SESSION && KC.scene && KC.scene.bout && (KC.scene.mode === 'story' || KC.scene.mode === 'versus') && KC.scene.d && KC.scene.d.retry;
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'kcside', bg: '#07060d', id: 'karate-champon', defaults: { glyphs: 'playstation' }, autoPause: !SESSION,
  menu: {
    items: () => [['Move list', () => { game.resume(); KC.MoveList.open(); }], canRetry() && ['Retry match', () => { game.resume(); KC.scene.d.retry(); }], !SESSION && ['Dev mode', () => { game.resume(); KC.Dev.open(); }]],
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
      { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
      { key: 'hints', label: 'Tutorial hints', value: true },
      { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side', apply: (g, v) => { if (KC.scene && KC.scene.fighters) g.setView(v === 'Tatami 2.5D' ? 'kctatami' : 'kcside'); } },
      { key: 'techNames', label: 'Technique names', value: true },
      { key: 'inputDisplay', label: 'Input display', options: ['off', 'on'], value: 'off' },
      { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', help: 'Classic: a white and red NES-style palette (unlocked by finishing the Champon Road)' },
      { key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: .8, apply: (g, v) => { KC.Voice.vol = v; if (KC.Voice.bus) KC.Voice.bus.gain.value = v; } }
    ],
    controls: { tUp: 'Technique up (high)', tDown: 'Technique down (low)', tLeft: 'Technique left', tRight: 'Technique right', prev: 'Previous tab', next: 'Next tab', alt: 'More time / reset', skip: 'Skip', dev: false, click: false },
    quit: SESSION ? false : 'title'
  }
});
KC.game = game; KC.settings = game.settings; KC.hookSaves(game);
KC.settingsCalls = () => (game.settings.calls === 'Japanese' ? 'jp' : 'en');
if (SESSION) game.live = true;   // EC4: the world never pauses in a session
game.input.use(KC_KEYS);
// the palette option needs the story finished
const _set = game.settings.set.bind(game.settings);
game.settings.set = (k, v) => { if (k === 'palette' && v === 'Classic' && !KC.Save.unlocked('classic') && !(KC.DEV && KC.DEV.unlockAll)) { game.note('FINISH THE CHAMPON ROAD TO UNLOCK'); return _set(k, 'Modern'); } return _set(k, v); };
// any input lifts the touch-only gate and resets the idle timer
KC.idle = 0;
game.debugIdle = () => KC.idle;

const scenes = {
  title: KC.TitleScene, attract: KC.AttractScene, fight: KC.FightScene, road: KC.RoadScene, cutscene: KC.CutsceneScene, vscard: KC.VsCardScene,
  promotion: KC.PromotionScene, continue: KC.ContinueScene, gameover: KC.GameOverScene, initials: KC.InitialsScene, credits: KC.CreditsScene,
  practice: KC.PracticeScene, bonus: KC.BonusScene, versus: KC.VersusScene, results: KC.ResultsScene, dojo: KC.DojoScene, bonusMenu: KC.BonusMenuScene,
  records: KC.RecordsScene, about: KC.AboutScene, movelist: KC.MoveListScene, lab: KC.LabScene, session: KC.SessionScene
};
for (const k in scenes) if (!scenes[k]) throw new Error('scene ' + k + ' is missing');
// every scene: a panel over it (the move list, the dev panel) holds it; the dev hotkeys; the frame step; then the scene
for (const k in scenes) {
  const sc = scenes[k], up = sc.update, dr = sc.draw;
  sc.update = function (dt) {
    const I = game.input, pad = I.padPrev || [];
    if (KC.DEV.on && !SESSION && (I.pressed('dev') || (pad[10] && pad[11] && !this._l3r3))) KC.Dev.toggle();
    this._l3r3 = !!(pad[10] && pad[11]);
    if (KC.Overlay.step(dt)) return;
    if (KC.DEV.frozen && !SESSION && !(KC.anyPressed('next'))) return;
    up.call(this, dt);
  };
  sc.draw = function (r) { dr.call(this, r); KC.Overlay.draw(r); };
}
const boot = { title: 'KARATE CHAMPON', steps: [
  ['Sweeping the dojo floor', () => { const bad = KC.validateData(); if (bad.length) throw new Error('data: ' + bad.join('; ')); }],
  ['Folding the gi', () => { KC.Save.load(); KC.Dev.load(); }],
  ['Simmering the broth', () => { KC.defineSfx(game); }],
  ["Tuning the referee's whistle", () => { KC.Voice.vol = game.settings.voices; }],
  ['Raking the gravel', () => { for (const s of KC.DATA.stages) if (!KC.PAINT[s.id]) throw new Error('stage ' + s.id); }]
] };
// deep links
const [link, a1, a2] = (typeof location !== 'undefined' && location.hash ? location.hash.slice(1) : '').split('/');
let first = 'title', data;
if (SESSION) first = 'session';
else if (link === 'fight') { first = 'fight'; data = KC.Versus.quickData(a1 || 'dojo', a2 || 'kamaboko'); }
else if (link === 'road') { first = 'road'; KC.Story.newGame(); KC.Story.node = Math.max(0, Math.min(KC.DATA.ladder.length - 1, KC.DATA.ladder.findIndex(n => n.id === a1))); data = {}; }
else if (link === 'versus') first = 'versus';
else if (link === 'kachinuki') { first = 'versus'; data = { kachinuki: +a1 || 4 }; }
else if (link === 'bonus') { first = 'bonus'; data = { id: a1 || 'boards' }; }
else if (link === 'practice') { first = 'practice'; data = { lesson: a1 || 'lessonI' }; }
else if (link === 'lab') { first = 'lab'; data = { tech: a1 || 'frontKick' }; }
else if (link === 'spar') { first = 'fight'; data = KC.Versus.sparData(); }
else if (link === 'ending') { first = 'cutscene'; KC.Story.newGame(); data = KC.Story.endingData(); }
else if (['attract', 'about', 'records', 'credits', 'dojo', 'bonusMenu', 'movelist'].includes(link)) first = link;
game.start({ scenes, scene: first, data, boot });
game.debug = KC.debugHandle(game);
if (typeof window !== 'undefined') window.__game = { game, scenes, KC };

})();
