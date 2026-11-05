/* AMERICAN FOOTBALL FIASCO — core: namespace, tuning (the Dev sliders), the input map, small helpers.
 * Core loop: call a play from big cards, snap, then run, pass, juke and hit your way down the field in a 5–10 second
 * burst of chaos, cheer the replay, and do it again before the clock runs out. */
(() => {
'use strict';
const E = My3D2dge;
const FF = globalThis.FF = globalThis.FF || {};
FF.E = E;
FF.DOM = typeof document !== 'undefined';
FF.TITLE = 'AMERICAN FOOTBALL FIASCO';

/* ---- tuning: every number the Dev mode shows as a live slider; reset puts the defaults back ---- */
FF.TUNE = [
  ['runSpeed', 'Run speed', 56, 30, 90, 1],
  ['turboSpeed', 'Turbo speed', 82, 40, 130, 1],
  ['turboDrain', 'Turbo drain per second', 30, 0, 100, 1],
  ['turboRegen', 'Turbo refill per second', 14, 0, 60, 1],
  ['passSpeed', 'Pass speed', 210, 100, 400, 5],
  ['tackleReach', 'Tackle reach', 11, 6, 20, .5],
  ['tackleChance', 'Tackle strength', .78, .2, 1, .01],
  ['hitSpeed', 'Big Hit speed', 62, 30, 100, 1],
  ['fumbleChance', 'Fumble on a Big Hit', .2, 0, 1, .01],
  ['blockHold', 'Block hold (seconds)', 1.7, .3, 4, .1],
  ['catchChance', 'Catch skill', .84, .3, 1, .01],
  ['intChance', 'Interception chance', .3, 0, 1, .01],
  ['aiSkill', 'CPU skill', .6, .1, 1, .01],
  ['quarter', 'Quarter length (seconds)', 90, 20, 300, 5],
  ['meterGain', 'Fiasco Meter gain', 1, .2, 3, .1],
  ['streakNeed', 'Plays for a Hot Streak', 3, 1, 6, 1],
  ['gain', 'Yards for a first down', 20, 5, 30, 1],
  ['gameSpeed', 'Game speed', 1, .3, 1.5, .05]
];
FF.TOGGLES = [
  ['godTurbo', 'Infinite turbo', false],
  ['noClock', 'Stop the clock', false],
  ['showBoxes', 'Show hit circles', false],
  ['aiOnly', 'CPU plays both teams', false]
];
FF.T = {};
FF.resetTune = () => { for (const [k, , d] of FF.TUNE) FF.T[k] = d; for (const [k, , d] of FF.TOGGLES) FF.T[k] = d; };
FF.resetTune();

/* ---- the input map: one layout for keyboard, mouse and pad ---- */
const MENU = {
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'KeyJ', 'Space', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
E.Input.FOOTBALL = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  a: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], b: ['KeyK', 'Mouse2', 'Pad1'], x: ['KeyL', 'Pad2'], y: ['KeyI', 'KeyE', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], swap: ['Tab', 'KeyQ', 'Pad4'], ...MENU
};

/* ---- helpers ---- */
FF.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
FF.pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
FF.fmtClock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const mem = {};   // a mirror, so blocked or missing storage (a private window, the headless tests) still remembers within the visit
FF.store = {
  get: (k, d) => { if (k in mem) return mem[k]; try { return E.store.get('ff:' + k, d); } catch (e) { return d; } },
  set: (k, v) => { mem[k] = v; try { E.store.set('ff:' + k, v); } catch (e) { /* storage blocked */ } }
};
// global reference to what is on show: the hub round, the attract mode, and so on
FF.flags = { hub: false, touchOnly: false };
})();
