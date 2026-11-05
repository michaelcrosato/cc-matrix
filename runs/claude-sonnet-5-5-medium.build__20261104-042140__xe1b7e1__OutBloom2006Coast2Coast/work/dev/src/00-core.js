/* OutBloom 2006: Coast 2 Coast. The core loop: drive fast through a minute of beautiful road, read the bend and drift it,
 * thread the traffic, please your passenger, pick a fork, beat the clock to the next checkpoint, and do it five times to
 * reach the coast. This file: the game, live tuning, input map, the event bus, saves and small helpers. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp, lerp } = E;
OB.E = E;
OB.TITLE = 'OutBloom 2006: Coast 2 Coast';
OB.env = {
  hub: !!(window.AIHub && window.AIHub.active),
  touchOnly: (() => { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); } catch (e) { return false; } })(),
  headless: typeof document === 'undefined'
};
/* ---- the input map: pad = DualSense in standard mapping (0 cross, 1 circle, 2 square, 3 triangle, 4 L1, 5 R1, 6 L2, 7 R2) ---- */
OB.INPUT = Object.assign({}, E.Input.DEFAULT, {
  gas: ['ArrowUp', 'KeyW', 'Pad7', 'Pad0'], brake: ['ArrowDown', 'KeyS', 'Pad6', 'Pad2'],
  drift: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad1'], horn: ['KeyH', 'Mouse0', 'Pad3'], radio: ['KeyR', 'KeyE', 'Pad5'], camera: ['KeyC', 'Pad4']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete OB.INPUT[k];
/* ---- live tuning: Appendix A. The dev sliders edit OB.T; reset puts the defaults back ---- */
OB.TDEF = {
  topScale: 1, accel: 1, brake: 1, steer: 1, curvePush: 1, grip: 1, offroadDrag: .45,
  driftBoost: 1, driftScore: 1, draftPower: 1, boostPower: 1, trafficDensity: 1, trafficSpeed: 1,
  startTime: 75, checkpointTime: 45, requestRate: 1, crashPenalty: 1, nearMissScore: 1, passengerPatience: 1
};
OB.TMETA = {
  topScale: ['Top speed', .6, 1.5, .05, 'x'], accel: ['Acceleration', .4, 2.5, .05, 'x'], brake: ['Braking', .4, 2.5, .05, 'x'], steer: ['Steering', .5, 2, .05, 'x'],
  curvePush: ['Bend push', 0, 2.5, .05, 'x'], grip: ['Drift grip', .4, 2, .05, 'x'], offroadDrag: ['Shoulder speed', .1, 1, .05, 'x'],
  driftBoost: ['Drift boost', 0, 3, .1, 'x'], driftScore: ['Drift score', 0, 3, .1, 'x'], draftPower: ['Slipstream', 0, 3, .1, 'x'], boostPower: ['Boost power', 0, 2.5, .1, 'x'],
  trafficDensity: ['Traffic amount', 0, 2.5, .1, 'x'], trafficSpeed: ['Traffic speed', .5, 1.6, .05, 'x'],
  startTime: ['Start clock', 20, 200, 5, ' s'], checkpointTime: ['Checkpoint bonus', 10, 120, 5, ' s'], requestRate: ['Request rate', .3, 3, .1, 'x'],
  crashPenalty: ['Crash penalty', 0, 3, .1, 'x'], nearMissScore: ['Near miss score', 0, 4, .1, 'x'], passengerPatience: ['Passenger patience', .3, 3, .1, 'x']
};
OB.T = Object.assign({}, OB.TDEF);
OB.resetTuning = () => { Object.assign(OB.T, OB.TDEF); };
OB.dev = { open: false, god: false, infTime: false, showDebug: false, row: 0 };
/* ---- the event bus: the one channel from the sim to scoring, the passenger, audio and the HUD ---- */
const handlers = {};
OB.bus = {
  on(name, fn) { (handlers[name] || (handlers[name] = [])).push(fn); return () => { handlers[name] = (handlers[name] || []).filter(f => f !== fn); }; },
  emit(name, data) { for (const f of (handlers[name] || []).slice()) { try { f(data); } catch (e) { if (OB.game) OB.game.fail('event ' + name, e); } } },
  clear(name) { if (name) handlers[name] = []; else for (const k in handlers) handlers[k] = []; }
};
OB.rand = { stream: (label, seed) => { let h = (seed >>> 0) || 1; for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619); return E.rng((h >>> 0) || 1); } };
/* ---- saves ---- */
const SAVE_KEY = 'outbloom:save1';
const freshSave = () => ({ v: 1, seeds: 0, spent: 0, cars: ['orchidea'], colors: ['sunrise', 'seafoam', 'poppy'], songs: [0, 1, 2, 3, 4], planted: ['bed-orchidea', 'bed-c0', 'bed-c1', 'bed-c2'], best: {}, ghosts: {}, missions: {}, endings: {}, stats: { runs: 0, drifts: 0, km: 0, near: 0, petals: 0, bestScore: 0 }, pick: { car: 'orchidea', color: 0, pass: 0, station: 0 } });
OB.save = Object.assign(freshSave(), E.store.get(SAVE_KEY, null) || {});
OB.save.pick = Object.assign({ car: 'orchidea', color: 0, pass: 0, station: 0 }, OB.save.pick || {});
OB.save.stats = Object.assign(freshSave().stats, OB.save.stats || {});
OB.persist = () => { if (!OB.env.hub) E.store.set(SAVE_KEY, OB.save); };
OB.resetSave = () => { Object.assign(OB.save, freshSave()); OB.persist(); };
/* ---- small helpers ---- */
OB.ease = { out: u => 1 - (1 - u) * (1 - u), inOut: u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 };
OB.fmtTime = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
OB.pad = (n, w) => String(Math.round(n)).padStart(w, '0');
OB.units = () => (OB.game && OB.game.settings && OB.game.settings.units === 'MPH') ? ['MPH', .621371] : ['KM/H', 1];
OB.pickOf = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
/* ---- the game ---- */
const game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, view: 'side', bg: '#10081c', input: OB.INPUT, id: 'outbloom2006',
  menu: {
    items: () => (OB.pauseItems ? OB.pauseItems() : []), quit: OB.env.hub ? false : 'title',
    settings: [
      { key: 'chatter', label: 'Passenger chatter', options: ['Normal', 'Less', 'Off'], value: 'Normal', help: 'How often your passenger talks' },
      { key: 'transmission', label: 'Transmission', options: ['Automatic', 'Manual'], value: 'Automatic', help: 'Manual: next song button shifts up, camera button shifts down' },
      { key: 'units', label: 'Speed units', options: ['KM/H', 'MPH'], value: 'KM/H', help: 'Speedometer units' },
      { key: 'camera', label: 'Camera', options: ['Chase', 'High', 'Bumper'], value: 'Chase', help: 'The driving camera (also the camera button)' },
      { key: 'steerAssist', label: 'Steering assist', options: ['Off', 'Low', 'High'], value: 'Off', help: 'Holds the car gently against bends' }
    ],
    controls: { gas: 'Accelerate', brake: 'Brake / reverse', drift: 'Power slide', horn: 'Horn', radio: 'Next song / shift up', camera: 'Camera / shift down', up: 'Up', down: 'Down', left: 'Steer left', right: 'Steer right', attack: false, dash: false, skill: false, jump: false }
  }
});
OB.game = game;
// PlayStation glyphs by default; Settings, Controller, Button symbols switches to Xbox (A B X Y)
if (!E.store.get('outbloom:glyphInit', false)) { E.store.set('outbloom:glyphInit', true); try { game.settings.set('glyphs', 'playstation'); } catch (e) { /* settings not ready */ } }
OB.scenes = {};
OB.lastInput = 0;
OB.label = a => game.input.label(a);
// the glyph word for a prompt: '✕ Gas' on a pad, 'W Gas' on a keyboard
OB.prompt = (a, word) => game.input.label(a) + (word ? ' ' + word : '');
OB.anyInput = () => {
  const I = game.input; if (I.mouse && I.mouse.t > OB.lastMouseT) { OB.lastMouseT = I.mouse.t; return true; }
  for (const a of ['confirm', 'cancel', 'start', 'pause', 'up', 'down', 'left', 'right', 'gas', 'brake', 'drift', 'horn']) if (I.pressed(a) || I.down(a)) return true;
  return !!(I.clicked && I.clicked());
};
OB.lastMouseT = -99;
})();
