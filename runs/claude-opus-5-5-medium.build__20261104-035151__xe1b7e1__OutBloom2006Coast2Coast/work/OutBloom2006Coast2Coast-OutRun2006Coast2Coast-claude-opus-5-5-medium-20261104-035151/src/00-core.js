/* OutBloom 2006: Coast 2 Coast — core.
 * The core loop: drive fast through a minute of beautiful road, read the bend and drift it, thread the traffic, please
 * your passenger, pick a fork, beat the clock to the next checkpoint, and do it five times to reach the coast.
 * This file: the namespace, constants, the event bus, seeded random streams, live tuning (the Dev Mode sliders), the
 * input preset and environment flags. Every other file adds to window.OB. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
OB.E = E;
OB.VERSION = '1.0.0';
OB.TITLE = 'OutBloom 2006: Coast 2 Coast';

/* ---- units (PLAN §5.4) ---- */
OB.SEG = 200;            // a segment's length, world units
OB.ROADW = 1500;         // half the road at width factor 1
OB.CAM_H = 1000;         // the chase camera over the road
OB.DRAW = 200;           // segments drawn ahead
OB.KMH = 12;             // world units a second per km/h
OB.JUNC = 100;           // junction (fork) segments at the end of rows 1-4
OB.SPREAD = 3;           // how far apart the branch centres end, half roads each side
OB.FLAT = 120;           // every stage starts straight and level for this many segments
OB.RUNIN = 90;           // a goal's run-in after the last stage (goal arch at RUNIN - 50 from its start)

/* ---- environment ---- */
const W = typeof window !== 'undefined' ? window : {};
OB.env = {
  headless: typeof document === 'undefined' || !document.createElement,
  hub: !!(W.AIHub && W.AIHub.active),
  touchOnly: false
};

/* ---- the event bus: the only channel from the sim to scoring, the passenger, audio, the HUD and the rules ---- */
const handlers = {}, log = [];
OB.bus = {
  on(name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); return () => OB.bus.off(name, fn); },
  off(name, fn) { const h = handlers[name]; if (h) { const i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); } },
  emit(name, data) {
    log.push({ name, data, t: OB.game ? +OB.game.time.toFixed(2) : 0 }); if (log.length > 200) log.shift();
    for (const k of [name, '*']) { const h = handlers[k]; if (h) for (const fn of h.slice()) { try { fn(data, name); } catch (e) { if (OB.game) OB.game.fail('bus:' + name, e); else throw e; } } }
  },
  log: n => log.slice(-(n || 20)),
  clear() { log.length = 0; }
};

/* ---- seeded random streams: gameplay never uses Math.random ---- */
OB.rand = {
  stream(label, seed = 1) { let h = 2166136261 ^ seed; for (const c of String(label)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return E.rng(h >>> 0); },
  hash(...xs) { let h = 2166136261; for (const c of xs.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
};

/* ---- live tuning (Appendix A): every Dev Mode slider ---- */
OB.TUNING_SPEC = [
  ['Car', 'topSpeedScale', 1, .6, 1.4, .01, '× car top speed'],
  ['Car', 'accelScale', 1, .5, 2, .01, '× car acceleration'],
  ['Car', 'brakeDecel', 240, 120, 400, 5, 'km/h a second at full brake'],
  ['Car', 'steerRate', 2.2, 1, 4, .05, 'half roads a second at full lock'],
  ['Car', 'steerResponse', 9, 3, 20, .5, 'how fast steering follows the stick'],
  ['Car', 'curvePush', .5, .2, 1.2, .01, 'the throw outward per curve unit'],
  ['Car', 'offroadTop', .5, .2, 1, .01, 'share of top speed off the asphalt'],
  ['Car', 'offroadDrag', 120, 0, 300, 5, 'km/h a second above the off-road top'],
  ['Drift', 'driftMinSpeed', 120, 60, 200, 5, 'km/h before a drift can start'],
  ['Drift', 'driftTapWindow', .35, .1, .8, .01, 's, the longest brake tap that counts'],
  ['Drift', 'driftGrip', .85, 0, 1, .01, 'how much a drift cancels the curve push'],
  ['Drift', 'driftAngleMax', .75, .3, 1.2, .01, 'rad'],
  ['Drift', 'driftSpeedLoss', 16, 0, 60, 1, 'km/h a second at full angle'],
  ['Drift', 'driftSteerBoost', 1.3, 1, 2, .05, '× steering while drifting'],
  ['Slipstream', 'slipRange', 1800, 600, 3000, 50, 'units behind a vehicle'],
  ['Slipstream', 'slipWidth', .22, .1, .5, .01, 'half roads'],
  ['Slipstream', 'slipTopBonus', .06, 0, .2, .005, '× top speed at full slip'],
  ['Slipstream', 'slingshotBoost', 14, 0, 40, 1, 'km/h'],
  ['Traffic', 'trafficDensity', 1, 0, 3, .05, '× stage density'],
  ['Traffic', 'trafficSpeedScale', 1, .5, 1.5, .05, '× vehicle speeds'],
  ['Traffic', 'spinThreshold', 70, 20, 150, 5, 'km/h of closing speed that spins you'],
  ['Traffic', 'bumpSpeedLoss', .08, 0, .5, .01, 'share of speed lost in a bump'],
  ['Clock', 'startTime', 72, 30, 150, 1, 's on the clock at the start'],
  ['Clock', 'checkpointBonus', 54, 20, 120, 1, 's each checkpoint gives'],
  ['Rivals', 'rivalSkill', 1, .5, 1.5, .01, '× rival top speed and cornering'],
  ['Rivals', 'rivalRubber', .5, 0, 1, .05, 'rubber-band strength'],
  ['Love in Bloom', 'petalScale', 1, .5, 2, .05, '× petals per rating'],
  ['Love in Bloom', 'requestDifficulty', 1, .5, 1.5, .05, '× request thresholds and counts'],
  ['Love in Bloom', 'bloomDecay', 4, 1, 10, .25, 's before the Bloom chain drains'],
  ['Camera', 'cameraHeight', 1000, 600, 1600, 25, 'units (chase)'],
  ['Camera', 'cameraFov', 100, 70, 130, 1, 'degrees at rest'],
  ['World', 'gameSpeed', 1, .25, 2, .05, '× game speed while racing']
];
OB.TUNING_DEFAULTS = {};
for (const [, k, v] of OB.TUNING_SPEC) OB.TUNING_DEFAULTS[k] = v;
OB.tuning = Object.assign({}, OB.TUNING_DEFAULTS);
OB.tune = k => OB.tuning[k];
OB.resetTuning = key => { if (key) OB.tuning[key] = OB.TUNING_DEFAULTS[key]; else Object.assign(OB.tuning, OB.TUNING_DEFAULTS); OB.bus.emit('tuning', { key }); };

/* ---- cheats (Dev Mode and the attract mode) ---- */
OB.CHEAT_LIST = [
  ['infiniteTime', 'Infinite time'], ['noCollide', 'No collisions'], ['perfectRequests', 'Perfect requests'], ['autoDrive', 'Auto drive (the bot drives)'],
  ['autoDrift', 'Auto drift'], ['freezeTraffic', 'Freeze traffic'], ['noTraffic', 'No traffic'], ['invincibleMood', 'Invincible mood'],
  ['showHitboxes', 'Show hitboxes'], ['debugOverlay', 'Debug overlay'], ['hideHud', 'Hide the HUD'], ['slowMo', 'Slow motion ×0.25'], ['fastMo', 'Fast ×2']
];
OB.cheats = {};
for (const [k] of OB.CHEAT_LIST) OB.cheats[k] = false;

/* ---- input (Appendix B). Gas and brake read input.analog (engine change E3) ---- */
const base = Object.assign({}, E.Input.DEFAULT);
for (const k of ['attack', 'dash', 'skill', 'jump']) delete base[k];
OB.INPUT = Object.assign(base, {
  gas: ['KeyW', 'ArrowUp', 'Pad7', 'Pad0'],
  brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad2'],
  drift: ['Space', 'Pad1'],
  shiftUp: ['KeyE', 'ShiftLeft', 'Pad5'],
  shiftDown: ['KeyQ', 'ControlLeft', 'Pad4'],
  horn: ['KeyH', 'Pad3'],
  camera: ['KeyC', 'Pad13'],
  radio: ['KeyR', 'Pad12'],
  more: ['KeyT', 'Pad3']
});
OB.ACTION_NAMES = { gas: 'Gas', brake: 'Brake / reverse', drift: 'Drift', shiftUp: 'Shift up / next tab', shiftDown: 'Shift down / previous tab', horn: 'Horn', camera: 'Camera', radio: 'Radio: next station', more: 'More time (hub card)' };

/* ---- small helpers ---- */
OB.clamp = E.clamp; OB.lerp = E.lerp;
OB.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + "'" + (r < 10 ? '0' : '') + r.toFixed(2).replace('.', '"'); };
OB.speedText = v => OB.game && OB.game.settings.units === 'mph' ? Math.round(v * .6214) : Math.round(v);
OB.speedUnit = () => OB.game && OB.game.settings.units === 'mph' ? 'MPH' : 'KM/H';
OB.easeInOut = u => u <= 0 ? 0 : u >= 1 ? 1 : -Math.cos(u * Math.PI) / 2 + .5;
})();
