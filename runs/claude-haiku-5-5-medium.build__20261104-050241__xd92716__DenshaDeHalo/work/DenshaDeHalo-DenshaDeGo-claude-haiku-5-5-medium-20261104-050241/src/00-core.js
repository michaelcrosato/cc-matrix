/* Densha de Halo! · 00-core: the DH namespace, seeded randomness, colour mixing, the balance sliders and the train model.
 *
 * The core loop, in one sentence: read the line ahead, notch power and brake to keep the timetable, and stop each train
 * exactly on the mark: on time, smoothly and by the book. Then do it again at the next station.
 *
 * Units: metres along the route (s), metres across (x, + to the right in the direction of travel), metres up (y),
 * km/h in the UI and km/h/s for accelerations (1 km/h/s = 0.2778 m/s^2). The clock is seconds since midnight. */
(() => {
'use strict';
const DH = (window.DH = window.DH || {});

DH.VERSION = '1.0';
DH.SEG = 5;                  // metres per route segment
DH.DRAW_SEGS = 360;          // segments drawn ahead (1.8 km)
DH.FIXED = 1 / 120;          // the sim's fixed step (s)

/* ---- seeded randomness: every world and cosmetic choice comes from a named stream (never Math.random in game logic) ---- */
DH.hash = str => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
DH.rngFrom = seed => { let s = seed >>> 0 || 1; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
DH.rng = label => DH.rngFrom(DH.hash(String(label) + ':' + (DH.seedBase || 0)));
DH.pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

/* ---- numbers ---- */
DH.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
DH.lerp = (a, b, t) => a + (b - a) * t;
DH.sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
DH.clock = secs => { const t = Math.floor(secs + 0.0001), h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60; return [h, m, s].map(n => String(n).padStart(2, '0')).join(':'); };
DH.clockShort = secs => DH.clock(secs).slice(0, 5);
DH.parseClock = str => { const [h, m, s] = str.split(':').map(Number); return h * 3600 + m * 60 + (s || 0); };
DH.kmText = m => (m / 1000).toFixed(2) + ' km';
DH.mText = m => (Math.abs(m) >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m');

/* ---- colour: hex strings in, hex strings out. Fog and the time-of-day grade are applied by the renderer ---- */
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hexOf = c => '#' + c.map(v => Math.round(DH.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
DH.rgb = rgb; DH.hexOf = hexOf;
DH.mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hexOf(A.map((v, i) => v + (B[i] - v) * t)); };
DH.shade = (a, k) => hexOf(rgb(a).map(v => v * k));
DH.add = (a, k) => hexOf(rgb(a).map(v => v + k));

/* ---- balance: every number a slider changes lives here. Dev Mode writes these; every system reads them each step ---- */
DH.TUNING_DEFAULTS = {
  accelScale: 1.0, brakeScale: 1.0, brakeLag: 0.7, ebDecel: 5.0, adhesionRain: 2.6, gradeScale: 1.0, resistScale: 1.0,
  graceStart: 25, lateCost: 1.0, overrunCost: 2.0, stopWindow: 1.0, onTimeWindow: 2, dwell: 12, callGreat: 120,
  limitTol: 3, atsTime: 5, comfortSens: 1.0, sway: 1.0, fov: 75
};
DH.TUNING = Object.assign({}, DH.TUNING_DEFAULTS);
DH.TUNING_RANGES = {
  accelScale: [0.5, 2, 0.05, 'Power acceleration'], brakeScale: [0.5, 2, 0.05, 'Service brake strength'],
  brakeLag: [0, 2, 0.05, 'Brake response lag (s)'], ebDecel: [3, 7, 0.1, 'Emergency brake (km/h/s)'],
  adhesionRain: [1, 6, 0.1, 'Rain adhesion (km/h/s)'], gradeScale: [0, 2, 0.05, 'Gradient effect'],
  resistScale: [0, 2, 0.05, 'Running resistance'], graceStart: [5, 99, 1, 'Starting Halo Time (s)'],
  lateCost: [0, 3, 0.1, 'Halo Time lost per second late'], overrunCost: [0, 5, 0.1, 'Seconds lost per metre overrun'],
  stopWindow: [0.5, 3, 0.05, 'Stop window scale'], onTimeWindow: [0, 10, 0.5, 'On-time window (+/- s)'],
  dwell: [5, 60, 1, 'Minimum dwell (s)'], callGreat: [60, 200, 5, 'Call sweet spot far edge (m)'],
  limitTol: [0, 10, 0.5, 'Speed tolerance (km/h)'], atsTime: [2, 10, 0.5, 'ATS confirm time (s)'],
  comfortSens: [0, 3, 0.1, 'Comfort sensitivity'], sway: [0, 2, 0.1, 'Camera sway'], fov: [60, 90, 1, 'Cab field of view (deg)']
};
DH.resetTuning = () => { Object.assign(DH.TUNING, DH.TUNING_DEFAULTS); };

/* ---- the trains (API: section 5.2). a[] is the traction in km/h/s per notch, vk[] the speed where it tapers ---- */
DH.TRAINS = {
  h8000: { id: 'h8000', name: 'HALO 8000', notchesP: 5, notchesB: 8, a: [0.8, 1.4, 2.0, 2.6, 3.2], vk: [15, 25, 35, 40, 45],
    brakeUnit: 0.5, eb: 5.0, tauP: 0.3, tauApply: 0.7, tauRelease: 0.5, vmax: 110, r0: 0.03, r1: 0.0005, r2: 0.000012,
    cab: 'modern', sound: 'vvvf', livery: '#c9ced6', stripe: '#f2c230', band: '#3aa0e0', cars: 6, carLen: 20 },
  h3000: { id: 'h3000', name: 'HALO 3000', notchesP: 4, notchesB: 7, a: [0.7, 1.3, 1.9, 2.5], vk: [18, 28, 36, 42],
    brakeUnit: 0.55, eb: 4.6, tauP: 0.3, tauApply: 1.1, tauRelease: 0.8, vmax: 100, r0: 0.03, r1: 0.0005, r2: 0.000012,
    cab: 'classic', sound: 'resistor', livery: '#e8dcb8', stripe: '#e0702a', band: '#2c7a4a', cars: 6, carLen: 20 },
  skyliner: { id: 'skyliner', name: 'SKY LINER', notchesP: 5, notchesB: 8, a: [1.0, 1.7, 2.3, 2.9, 3.4], vk: [15, 25, 35, 40, 45],
    brakeUnit: 0.5, eb: 5.0, tauP: 0.3, tauApply: 0.7, tauRelease: 0.5, vmax: 120, r0: 0.03, r1: 0.0005, r2: 0.000012,
    cab: 'modern', sound: 'vvvf', livery: '#6a3aa0', stripe: '#d8d8e8', band: '#c0c4cc', cars: 6, carLen: 20 },
  freight: { id: 'freight', name: 'MINATO FREIGHT', notchesP: 4, notchesB: 7, a: [0.5, 0.9, 1.3, 1.7], vk: [15, 20, 25, 30],
    brakeUnit: 0.45, eb: 4.0, tauP: 0.4, tauApply: 1.4, tauRelease: 1.0, vmax: 75, r0: 0.04, r1: 0.0008, r2: 0.00002,
    cab: 'classic', sound: 'resistor', livery: '#2a5aa8', stripe: '#e0e0e0', band: '#2a5aa8', cars: 4, carLen: 20 }
};

/* ---- a small event bus so systems talk without knowing each other ---- */
DH.Bus = class { constructor() { this.h = new Map(); } on(k, fn) { (this.h.get(k) || this.h.set(k, []).get(k)).push(fn); return this; } emit(k, a) { for (const fn of this.h.get(k) || []) fn(a); } };
})();
