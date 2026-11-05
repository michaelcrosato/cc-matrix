/* 01-tuning: DH.TUNING, the balance every system reads each step. Each key is a live Dev Mode slider (settings group
 * 'Dev', hidden from the standard Settings screen), with Reset to defaults. Difficulty multiplies some of them. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game;
const SLIDERS = [
  ['accelScale', 'Power acceleration', 1, .5, 2, .05, '×'],
  ['brakeScale', 'Service brake strength', 1, .5, 2, .05, '×'],
  ['brakeLag', 'Brake response lag (s)', .7, 0, 2, .05, ' s'],
  ['ebDecel', 'Emergency brake (km/h/s)', 5, 3, 7, .1, ''],
  ['adhesionRain', 'Rain adhesion (km/h/s)', 2.6, 1, 6, .1, ''],
  ['gradeScale', 'Gradient effect', 1, 0, 2, .05, '×'],
  ['resistScale', 'Running resistance', 1, 0, 2, .05, '×'],
  ['graceStart', 'Starting Halo Time (s)', 25, 5, 99, 1, ' s'],
  ['lateCost', 'Halo Time lost per second late', 1, 0, 3, .05, ' s'],
  ['overrunCost', 'Seconds lost per metre overrun', 2, 0, 5, .1, ' s'],
  ['stopWindow', 'Stop window scale', 1, .5, 3, .05, '×'],
  ['onTimeWindow', 'On-time window (± s)', 2, 0, 10, .5, ' s'],
  ['dwell', 'Minimum dwell (s)', 12, 5, 60, 1, ' s'],
  ['callGreat', 'Call sweet spot far edge (m)', 120, 60, 200, 5, ' m'],
  ['limitTol', 'Speed tolerance (km/h)', 3, 0, 10, .5, ''],
  ['atsTime', 'ATS confirm time (s)', 5, 2, 10, .5, ' s'],
  ['comfortSens', 'Comfort sensitivity', 1, 0, 3, .05, '×'],
  ['sway', 'Camera sway', 1, 0, 2, .05, '×'],
  ['fov', 'Cab field of view (°)', 75, 60, 90, 1, '°']
];
DH.TUNING_SLIDERS = SLIDERS;
const DEF = {}; for (const [k, , v] of SLIDERS) DEF[k] = v;
DH.TUNING_DEFAULTS = DEF;
DH.TUNING = Object.assign({}, DEF);
// the Dev group: live sliders over DH.TUNING (game.settings.reset('Dev') puts them back)
for (const [k, label, v, min, max, step, unit] of SLIDERS)
  game.settings.define({ key: 'dev_' + k, group: 'Dev', label, type: 'slider', value: v, min, max, step, unit, apply: (g, val) => { DH.TUNING[k] = val; } });
DH.resetTuning = () => { game.settings.reset('Dev'); Object.assign(DH.TUNING, DEF); };
// Dev values are for testing only: a fresh visit starts from the defaults (a player can't strand themselves on odd balance)
DH.resetTuning();

/** difficulty: starting Halo Time, the stop windows and the penalties */
DH.DIFF = {
  easy: { grace: 40, window: 1.5, pen: .5, hornMiss: 0, label: 'EASY' },
  normal: { grace: 25, window: 1, pen: 1, hornMiss: 1, label: 'NORMAL' },
  expert: { grace: 15, window: .7, pen: 1.5, hornMiss: 1, label: 'EXPERT' }
};
DH.diff = () => DH.DIFF[DH.diffOverride || game.settings.difficulty] || DH.DIFF.normal;
DH.graceStart = () => { const d = DH.diff(); return Math.round(d.grace * DH.TUNING.graceStart / DEF.graceStart); };
DH.guideOn = () => { const g = game.settings.guide; return g === 'on' || (g === 'auto' && (DH.diffOverride || game.settings.difficulty) === 'easy'); };
})();
