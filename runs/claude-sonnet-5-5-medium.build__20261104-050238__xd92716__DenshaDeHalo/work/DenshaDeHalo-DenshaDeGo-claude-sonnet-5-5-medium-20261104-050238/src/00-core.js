/* DENSHA DE HALO!  (a riff on Densha de Go!)
 * CORE LOOP: read the line ahead, notch power and brake to keep the timetable, and stop each train exactly on the mark:
 * on time, smoothly and by the book. Then do it again at the next station.
 * Namespace rule: every src file is one IIFE that writes only into window.DH. */
(() => {
'use strict';
const E = My3D2dge, DH = (window.DH = window.DH || {});
DH.E = E;
DH.VERSION = '1.0';
DH.TITLE = 'Densha de Halo!';

/* ---------- input: one map for pad, keyboard and mouse (the mouse is read as clicks and the wheel) ---------- */
const KEYS = Object.assign({}, E.Input.DEFAULT);
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
Object.assign(KEYS, {
  power: ['Pad7'], brake: ['Pad6'], neutral: ['KeyN', 'Pad5'], eb: ['Backspace', 'Pad4'],
  call: ['KeyE', 'Pad0'], horn: ['Space', 'Pad2'], ats: ['KeyQ', 'Pad3'], view: ['KeyC', 'Pad1']
});
// Backspace is also "cancel": in the cab the emergency brake wins; menus use Escape or the pad's circle.
KEYS.cancel = ['Escape', 'KeyX', 'Pad1'];
DH.KEYS = KEYS;

/* ---------- tuning: every dev-mode slider reads and writes this ---------- */
DH.DEFAULTS = {
  accelScale: 1, brakeScale: 1, brakeLag: 1, gradeEffect: 1, limitTol: 5, haloStart: 100, penaltyScale: 1,
  timeScale: 1, stopWindow: 1, wetGrip: .82, dwell: 12, callWindow: 1,
  infiniteHalo: 0, noATS: 0, showDebug: 0
};
DH.TUNING = Object.assign({}, DH.DEFAULTS);
DH.SLIDERS = [
  { k: 'accelScale', label: 'Power', min: .4, max: 2.5, step: .05, fmt: v => 'x' + v.toFixed(2) },
  { k: 'brakeScale', label: 'Brake force', min: .4, max: 2.5, step: .05, fmt: v => 'x' + v.toFixed(2) },
  { k: 'brakeLag', label: 'Brake lag', min: .1, max: 3, step: .1, fmt: v => 'x' + v.toFixed(1) },
  { k: 'gradeEffect', label: 'Gradients', min: 0, max: 3, step: .1, fmt: v => 'x' + v.toFixed(1) },
  { k: 'wetGrip', label: 'Wet rail grip', min: .4, max: 1, step: .02, fmt: v => Math.round(v * 100) + '%' },
  { k: 'limitTol', label: 'ATS tolerance', min: 0, max: 15, step: 1, fmt: v => v + ' km/h' },
  { k: 'stopWindow', label: 'Stop window', min: .5, max: 3, step: .1, fmt: v => 'x' + v.toFixed(1) },
  { k: 'callWindow', label: 'Call window', min: .5, max: 3, step: .1, fmt: v => 'x' + v.toFixed(1) },
  { k: 'dwell', label: 'Dwell time', min: 6, max: 30, step: 1, fmt: v => v + ' s' },
  { k: 'haloStart', label: 'Halo Time', min: 20, max: 300, step: 5, fmt: v => v + '' },
  { k: 'penaltyScale', label: 'Penalties', min: 0, max: 3, step: .1, fmt: v => 'x' + v.toFixed(1) },
  { k: 'timeScale', label: 'Game speed', min: .25, max: 4, step: .25, fmt: v => 'x' + v.toFixed(2) }
];
DH.TOGGLES = [
  { k: 'infiniteHalo', label: 'Infinite Halo Time' },
  { k: 'noATS', label: 'ATS off' },
  { k: 'showDebug', label: 'Debug overlay' }
];
DH.resetTuning = () => { Object.assign(DH.TUNING, DH.DEFAULTS); };

/* ---------- the three trains: notches, power, brakes, lag ---------- */
// accelerations are in km/h per second, at the top notch / at B8
DH.TRAINS = {
  H5: { id: 'H5', name: 'Halo Series 5', kind: 'Commuter', cars: 6, len: 120, pn: 5, accel: 3.4, maxKmh: 100, brake: 4.0, eb: 5.2, lag: .9, mass: 1, body: '#e9ecef', stripe: '#27b3c6', stripe2: '#0e6f86', blurb: 'Even-tempered. Brakes a touch late. The one everyone learns on.' },
  X7: { id: 'X7', name: 'Comet X7', kind: 'Limited Express', cars: 8, len: 160, pn: 5, accel: 4.0, maxKmh: 120, brake: 3.5, eb: 4.8, lag: 1.5, mass: 1.5, body: '#f4f1e8', stripe: '#e0482e', stripe2: '#8a1f12', blurb: 'Fast and heavy. Starts braking early or not at all.' },
  L3: { id: 'L3', name: 'Pocket L3', kind: 'Local', cars: 4, len: 80, pn: 4, accel: 4.2, maxKmh: 80, brake: 4.6, eb: 5.6, lag: .45, mass: .7, body: '#ffe9a6', stripe: '#f08a1c', stripe2: '#a04c08', blurb: 'Light and snappy. Brakes bite at once. Easy to stop short.' }
};

/* ---------- settings the player sees in the standard Settings screen ---------- */
DH.SETTINGS = [
  { key: 'leverDir', label: 'Lever direction', options: ['Up = Power', 'Up = Brake'], value: 'Up = Power' },
  { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' },
  { key: 'autoCall', label: 'Auto point-and-call', value: false },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'cabSway', label: 'Cab sway', value: true }
];

DH.rngFor = label => {
  if (window.AIHub && AIHub.active && AIHub.rng) return AIHub.rng(label);
  let h = 2166136261; for (let i = 0; i < label.length; i++) h = Math.imul(h ^ label.charCodeAt(i), 16777619);
  return E.rng(h >>> 0);
};

DH.kmh = ms => ms * 3.6;
DH.fmtTime = secs => { secs = Math.floor(secs); const h = Math.floor(secs / 3600) % 24, m = Math.floor(secs / 60) % 60, s = secs % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
DH.fmtClock = secs => DH.fmtTime(secs).slice(0, 5);

/* ---------- save data ---------- */
let _mem = null;
DH.save = {
  get() { return Object.assign({ unlocked: 0, best: {}, stops: 0, perfect: 0, plays: 0, km: 0, cards: [] }, _mem || E.store.get('dh:save', {})); },
  set(d) { _mem = JSON.parse(JSON.stringify(d)); E.store.set('dh:save', d); },
  update(fn) { const d = this.get(); fn(d); this.set(d); return d; }
};
})();
