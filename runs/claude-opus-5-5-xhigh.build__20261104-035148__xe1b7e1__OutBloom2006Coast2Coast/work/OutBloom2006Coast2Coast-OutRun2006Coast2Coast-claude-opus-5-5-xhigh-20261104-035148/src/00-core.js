/* OutBloom 2006: Coast 2 Coast — core.
 * THE CORE LOOP: drive fast through a minute of beautiful road, read the bend and drift it, thread the traffic, please
 * your passenger, pick a fork, beat the clock to the next checkpoint, and do it five times to reach the coast.
 * This file: the namespace (OB), the event bus, seeded random streams, the live tuning values (the Dev Mode sliders),
 * the input preset, environment flags and the one E.Game. Every other file is an IIFE that adds to OB. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
OB.E = E;
OB.VERSION = '1.0.0';
OB.TITLE = 'OutBloom 2006: Coast 2 Coast';
OB.SEG = 200; OB.ROADW = 2000; OB.AHEAD = 1000; OB.GROUND_Y = .93; OB.FOCAL = .5; OB.UNITS_PER_KMH = 12;

/* ---- environment ---- */
const hasDOM = typeof document !== 'undefined' && !!document.createElement && typeof navigator !== 'undefined' && !!navigator.userAgent;
OB.env = { hub: !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active), headless: !hasDOM, touchOnly: false, keySeen: false, padSeen: false };

/* ---- the event bus: the only channel from the sim to scoring, the passenger, audio, effects, HUD and rules ---- */
OB.bus = {
  _h: new Map(), log: [], n: 0,
  on(name, fn) { if (!this._h.has(name)) this._h.set(name, []); this._h.get(name).push(fn); return () => this.off(name, fn); },
  off(name, fn) { const l = this._h.get(name); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(name, data = {}) {
    this.n++; this.log.push({ n: this.n, name, data, t: OB.game ? +OB.game.time.toFixed(2) : 0 }); if (this.log.length > 400) this.log.splice(0, 100);
    for (const key of [name, '*']) { const l = this._h.get(key); if (l) for (const fn of l.slice()) { try { fn(data, name); } catch (e) { if (OB.game) OB.game.fail('bus ' + name, e); else throw e; } } }
  },
  since(n) { return this.log.filter(e => e.n > n); },
  last(k = 20) { return this.log.slice(-k); }
};

/* ---- random: gameplay never uses Math.random; each system has its own seeded stream ---- */
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
OB.hashStr = hashStr;
OB.rand = {
  stream(label, seed = 1) { if (OB.env.hub && window.AIHub && label.startsWith('traffic') && window.AIHub.rng) { try { return window.AIHub.rng(label); } catch (e) { /* fall through */ } } return E.rng((hashStr(label) ^ (seed * 2654435761)) >>> 0 || 1); },
  cosmetic: E.rng(0xB10055)
};
OB.pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
OB.range = (rnd, a, b) => a + (b - a) * rnd();

/* ---- tuning: every important gameplay number, live (Dev Mode sliders), with defaults ---- */
OB.TUNING_SPEC = [
  ['Car', 'topSpeedScale', 1, .6, 1.4, .01, 'Top speed ×'], ['Car', 'accelScale', 1, .5, 2, .01, 'Acceleration ×'], ['Car', 'brakeDecel', 240, 120, 400, 5, 'Brakes (km/h/s)'],
  ['Car', 'steerRate', 2.4, 1, 4, .05, 'Steering rate'], ['Car', 'steerResponse', 9, 3, 20, .5, 'Steering response'], ['Car', 'curvePush', .56, .2, 1.2, .01, 'Curve push'],
  ['Car', 'offroadTop', .5, .2, 1, .01, 'Off-road top ×'], ['Car', 'offroadDrag', 120, 0, 300, 5, 'Off-road drag'],
  ['Drift', 'driftMinSpeed', 120, 60, 200, 5, 'Drift min speed'], ['Drift', 'driftTapWindow', .35, .1, .8, .01, 'Brake-tap window'], ['Drift', 'driftGrip', .85, 0, 1, .01, 'Drift grip'],
  ['Drift', 'driftAngleMax', .75, .3, 1.2, .01, 'Drift max angle'], ['Drift', 'driftSpeedLoss', 16, 0, 60, 1, 'Drift speed loss'], ['Drift', 'driftSteerBoost', 1.3, 1, 2, .05, 'Drift steering ×'],
  ['Slipstream', 'slipRange', 1800, 600, 3000, 50, 'Slip range'], ['Slipstream', 'slipWidth', .22, .1, .5, .01, 'Slip width'], ['Slipstream', 'slipTopBonus', .06, 0, .2, .005, 'Slip top bonus'], ['Slipstream', 'slingshotBoost', 14, 0, 40, 1, 'Slingshot (km/h)'],
  ['Traffic', 'trafficDensity', 1, 0, 3, .05, 'Traffic density ×'], ['Traffic', 'trafficSpeedScale', 1, .5, 1.5, .05, 'Traffic speed ×'], ['Traffic', 'spinThreshold', 70, 20, 150, 5, 'Spin threshold'], ['Traffic', 'bumpSpeedLoss', .08, 0, .5, .01, 'Bump speed loss'],
  ['Clock', 'startTime', 84, 30, 150, 1, 'Start time (s)'], ['Clock', 'checkpointBonus2', 66, 20, 120, 1, 'Checkpoint row 2'], ['Clock', 'checkpointBonus3', 65, 20, 120, 1, 'Checkpoint row 3'],
  ['Clock', 'checkpointBonus4', 65, 20, 120, 1, 'Checkpoint row 4'], ['Clock', 'checkpointBonus5', 64, 20, 120, 1, 'Checkpoint row 5'],
  ['Rivals', 'rivalSkill', 1, .5, 1.5, .01, 'Rival skill ×'], ['Rivals', 'rivalRubber', .5, 0, 1, .01, 'Rubber band'],
  ['Love in Bloom', 'petalScale', 1, .5, 2, .05, 'Petals ×'], ['Love in Bloom', 'requestDifficulty', 1, .5, 1.5, .05, 'Request difficulty ×'], ['Love in Bloom', 'bloomDecay', 4, 1, 10, .5, 'Bloom decay (s)'],
  ['Camera', 'cameraHeight', 1000, 600, 1600, 10, 'Camera height'], ['Camera', 'cameraFov', 100, 70, 130, 1, 'Field of view'],
  ['World', 'gameSpeed', 1, .25, 2, .05, 'Game speed']
].map(([group, key, value, min, max, step, label]) => ({ group, key, value, min, max, step, label }));
OB.TUNING_DEFAULTS = Object.freeze(Object.fromEntries(OB.TUNING_SPEC.map(t => [t.key, t.value])));
OB.tuning = Object.assign({}, OB.TUNING_DEFAULTS);
OB.tune = k => OB.tuning[k];
OB.setTune = (k, v) => { const sp = OB.TUNING_SPEC.find(t => t.key === k); if (!sp) return; OB.tuning[k] = E.clamp(+v, sp.min, sp.max); OB.bus.emit('tune', { key: k, value: OB.tuning[k] }); };
OB.resetTuning = k => { if (k) OB.tuning[k] = OB.TUNING_DEFAULTS[k]; else Object.assign(OB.tuning, OB.TUNING_DEFAULTS); OB.bus.emit('tune', { key: k || '*' }); };

/* ---- cheats (attract mode, dev mode, tests) ---- */
OB.cheats = { infiniteTime: false, noCollide: false, perfectRequests: false, autoDrive: false, autoDrift: false, freezeTraffic: false, noTraffic: false, invincibleMood: false, hitboxes: false, overlay: false, hideHud: false, slow: false, fast: false };

/* ---- the input preset: the engine's menu actions plus driving ---- */
const D = E.Input.DEFAULT;
OB.INPUT = {
  up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
  gas: ['KeyW', 'ArrowUp', 'Pad7', 'Pad0'], brake: ['KeyS', 'ArrowDown', 'Pad6', 'Pad2'], drift: ['Space', 'Pad1'],
  shiftUp: ['KeyE', 'ShiftLeft', 'Pad5'], shiftDown: ['KeyQ', 'ControlLeft', 'Pad4'], horn: ['KeyH', 'Pad3'],
  camera: ['KeyC', 'Pad13'], radio: ['KeyR', 'Pad12'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], alt: ['KeyT', 'Pad3'], dev: ['F9']
};
OB.ACTION_NAMES = { gas: 'Gas', brake: 'Brake / reverse', drift: 'Drift', shiftUp: 'Shift up', shiftDown: 'Shift down', horn: 'Horn', camera: 'Camera', radio: 'Radio station', tabL: false, tabR: false, alt: false, dev: false };

/* ---- the game ---- */
const hub = OB.env.hub;
OB.game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, input: OB.INPUT, id: 'outbloom2006', bg: '#0b0716',
  fullscreen: hub ? false : 'tap',
  menu: {
    items: hub ? [] : [
      ['Restart', () => OB.Race && OB.Race.restartCurrent && OB.Race.restartCurrent()],
      ['Retire', () => OB.Race && OB.Race.retireCurrent && OB.Race.retireCurrent()],
      ['Dev Mode', () => OB.Dev && OB.Dev.open()]
    ],
    settings: [],   // (90-main.js defines the game's settings)
    controls: OB.ACTION_NAMES,
    quit: hub ? false : 'title'
  }
});
OB.game.debug = OB.game.debug || {};
/* the game's own settings (defined in 90-main.js): read with their defaults before they exist */
OB.SETTING_DEFAULTS = { transmission: 'auto', driftInput: 'all', assist: 'low', difficulty: 'Normal', units: 'kmh', camera: 'chase', chatter: 'full', hudSize: 'large', hints: true, voices: 1 };
OB.setting = k => { const s = OB.game.settings; return s && s[k] !== undefined ? s[k] : OB.SETTING_DEFAULTS[k]; };
OB.now = () => OB.game.time;
// one shared stepping counter (the race's fixed steps)
OB.frame = 0;
})();
