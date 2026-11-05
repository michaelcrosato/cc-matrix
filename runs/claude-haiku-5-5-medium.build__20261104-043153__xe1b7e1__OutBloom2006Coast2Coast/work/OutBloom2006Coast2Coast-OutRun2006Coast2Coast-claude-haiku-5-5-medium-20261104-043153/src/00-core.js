// OutBloom 2006: Coast 2 Coast. Core: the namespace, live tuning, the event bus, seeded random streams, the input map
// and the game object itself. Every other file hangs off OB.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});

/* ---- live tuning (Appendix A of the plan; the Dev Mode sliders read and write these) ---- */
OB.TUNING = [
  // group, key, default, min, max, label
  ['Car', 'topSpeedScale', 1, .6, 1.4, 'Top speed'],
  ['Car', 'accelScale', 1, .5, 2, 'Acceleration'],
  ['Car', 'brakeDecel', 240, 120, 400, 'Brake force'],
  ['Car', 'steerRate', 2.2, 1, 4, 'Steer rate'],
  ['Car', 'steerResponse', 9, 3, 20, 'Steer response'],
  ['Car', 'curvePush', .62, .2, 1.2, 'Curve push'],
  ['Car', 'offroadTop', .5, .2, 1, 'Off-road top speed'],
  ['Car', 'offroadDrag', 120, 0, 300, 'Off-road drag'],
  ['Drift', 'driftMinSpeed', 120, 60, 200, 'Min drift speed'],
  ['Drift', 'driftTapWindow', .35, .1, .8, 'Brake tap window'],
  ['Drift', 'driftGrip', .85, 0, 1, 'Drift grip'],
  ['Drift', 'driftAngleMax', .75, .3, 1.2, 'Max drift angle'],
  ['Drift', 'driftSpeedLoss', 16, 0, 60, 'Drift speed loss'],
  ['Drift', 'driftSteerBoost', 1.3, 1, 2, 'Drift steer boost'],
  ['Slipstream', 'slipRange', 1800, 600, 3000, 'Slipstream range'],
  ['Slipstream', 'slipWidth', .22, .1, .5, 'Slipstream width'],
  ['Slipstream', 'slipTopBonus', .06, 0, .2, 'Slipstream top bonus'],
  ['Slipstream', 'slingshotBoost', 14, 0, 40, 'Slingshot boost'],
  ['Traffic', 'trafficDensity', 1, 0, 3, 'Traffic density'],
  ['Traffic', 'trafficSpeedScale', 1, .5, 1.5, 'Traffic speed'],
  ['Traffic', 'spinThreshold', 70, 20, 150, 'Spin-out closing speed'],
  ['Traffic', 'bumpSpeedLoss', .08, 0, .5, 'Bump speed loss'],
  ['Clock', 'startTime', 100, 30, 150, 'Start time (s)'],
  ['Clock', 'checkpointBonus', 71, 20, 120, 'Checkpoint bonus (s)'],
  ['Rivals', 'rivalSkill', 1, .5, 1.5, 'Rival skill'],
  ['Rivals', 'rivalRubber', .5, 0, 1, 'Rubber band'],
  ['Love in Bloom', 'petalScale', 1, .5, 2, 'Petal scale'],
  ['Love in Bloom', 'requestDifficulty', 1, .5, 1.5, 'Request difficulty'],
  ['Love in Bloom', 'bloomDecay', 4, 1, 10, 'Bloom chain decay (s)'],
  ['Camera', 'cameraHeight', 1000, 600, 1600, 'Camera height'],
  ['Camera', 'cameraFov', 100, 70, 130, 'Camera field of view'],
  ['World', 'gameSpeed', 1, .25, 2, 'Game speed'],
];
OB.TUNING_DEFAULTS = {};
for (const [, k, v] of OB.TUNING) OB.TUNING_DEFAULTS[k] = v;
OB.tuning = Object.assign({}, OB.TUNING_DEFAULTS);
/** the live value of a tuning key (Dev Mode changes it; resetTuning restores the defaults) */
OB.tune = key => OB.tuning[key];
OB.resetTuning = () => { for (const k of Object.keys(OB.TUNING_DEFAULTS)) OB.tuning[k] = OB.TUNING_DEFAULTS[k]; };

/* ---- the event bus: the only channel from the sim to scoring, the passenger, audio and the HUD ---- */
const listeners = new Map(), recent = [];
OB.bus = {
  on(name, fn) { (listeners.get(name) || listeners.set(name, []).get(name)).push(fn); return fn; },
  off(name, fn) { const l = listeners.get(name); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(name, data = {}) {
    recent.push({ name, data }); if (recent.length > 200) recent.shift();
    for (const fn of listeners.get(name) || []) fn(data);
    for (const fn of listeners.get('*') || []) fn(data, name);
  },
  /** the last n events (for tests and the debug overlay) */
  recent: (n = 20) => recent.slice(-n),
  clearRecent: () => { recent.length = 0; },
};

/* ---- seeded random: gameplay never uses Math.random; a stream per label and seed ---- */
OB.rand = {
  stream(label, seed = 0) {
    let h = 2166136261 >>> 0; const s = label + ':' + seed;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return E.rng(h);
  },
};
/** an integer in [a, b] from a stream */
OB.randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

/* ---- constants and units ---- */
OB.SEG = 200;                 // a segment's length, world units
OB.KMH_UNITS = 12;            // km/h to world units per second (290 km/h ~ 3,480 units a second)
OB.HALF = 2000;               // the road's half-width in world units (x = 1 is the asphalt's edge)
OB.CAM_H = 1000;              // the chase camera's height over the road
OB.VERSION = 'v0.85.2 • OutBloom 1.0 demo';

/* ---- input: the engine's presets plus our driving actions ---- */
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  gas: ['ArrowUp', 'KeyW', 'KeyZ', 'Pad0', 'Pad7'],
  brake: ['ArrowDown', 'KeyS', 'KeyX', 'Pad2', 'Pad6'],
  drift: ['Space', 'Pad1'],
  shiftUp: ['KeyE', 'Pad5'],
  shiftDown: ['KeyQ', 'ShiftLeft', 'Pad4'],
  horn: ['KeyH', 'Pad3'],
  camera: ['KeyC', 'Pad13'],
  radio: ['KeyR', 'Pad12'],
  nextTab: ['KeyE', 'Pad5'],
  prevTab: ['KeyQ', 'Pad4'],
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
OB.KEYS = KEYS;

/** analog pedals (plan E3, read in game code): the pad's R2 / L2 values, else 1 for a held key, 0 otherwise */
OB.analog = (I, action) => I.analog ? I.analog(action) : (I.down(action) ? 1 : 0);   // (the engine's analog value, E3)

/* ---- environment flags (set by 70-hub.js and 71-touch.js before the game starts) ---- */
OB.env = { hub: false, touchOnly: false };
})();
