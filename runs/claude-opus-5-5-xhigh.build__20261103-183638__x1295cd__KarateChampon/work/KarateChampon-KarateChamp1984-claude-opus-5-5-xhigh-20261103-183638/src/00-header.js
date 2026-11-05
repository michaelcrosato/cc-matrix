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
KC.ABOUT = /*@ABOUT@*/null;   // data/about.json, inlined by tools/build.mjs (the About screen and exit-interview.json share it)
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
