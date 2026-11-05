/* AMERICAN FOOTBALL FIASCO: boot. Loaded first. Makes the engine's game, the controls, the shared namespace FF that the other
 * files add to, and the touch-only check. Summary of the loop (one sentence, as the plan asks):
 * Call a play from the cards, snap, then run, pass, juke and hit your way down the field in a 5-10 second burst of chaos, cheer
 * the replay, and do it again before the clock runs out. */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const FF = window.FF = { E, px, clamp, lerp, approach, scenes: {}, cfg: null, sim: null, view: null, data: null, tune: null };

// the controls: the stick moves; J (Cross) throws or hands off; K (Circle) juke / dive; L (Triangle) hits; Shift (L1) turbo; Q (Square) switches
const KEYS = Object.assign({}, E.Input.DEFAULT, { pass: ['KeyJ', 'Pad0', 'Mouse0'], juke: ['KeyK', 'Pad1'], hit: ['KeyL', 'Pad3'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad4'], switch: ['KeyQ', 'Pad2'] });
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
FF.KEYS = KEYS;

// a touch-only device (no keyboard, no mouse, no pad): the game asks for a controller or keyboard, and runs the attract mode
FF.touchOnly = (() => { try { return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; } })();

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown'], bg: '#07060d', input: KEYS,
  menu: { items: [['DEV MODE', () => FF.devFromPause()]], quit: 'title' }
});
game.input.glyphs = 'playstation';            // PlayStation symbols by default; Settings > Controller can pick Xbox
FF.game = game; FF.A = game.audio; FF.P = game.particles; FF.L = game.lights;

// the prompt for an action in the player's own device: 'J Pass' on a keyboard, '✕ Pass' on a pad, the button's name on a touch screen
FF.prompt = (action, word) => (game.input.label(action) || action.toUpperCase()) + ' ' + word;
FF.label = action => game.input.label(action) || action.toUpperCase();
FF.onPad = () => game.input.lastDevice === 'gamepad';

// the live tuning: the Dev mode's sliders write here; the sim reads it each step. FF.tuneDefaults is the reset point.
FF.tuneDefaults = {
  runSpeed: 84, turboSpeed: 118, turboMax: 100, turboDrain: 32, turboRegen: 16, cpuSpeed: 80, tackleChance: .7, breakTackle: .25,
  bigHit: .55, megaSpeed: 110, fumbleChance: .22, intercept: .3, catchBase: .9, catchCovered: .5, hotGain: 1, hotTime: 12,
  quarterSecs: 120, playClock: 3.2, difficulty: 1, slowMo: 1, infiniteTurbo: false, showNames: false
};
FF.tune = Object.assign({}, FF.tuneDefaults);
FF.resetTune = () => { Object.assign(FF.tune, FF.tuneDefaults); };

// the Settings screen: the engine's own rows, plus ours where a game needs them (the engine's glyph setting is above)
FF.menuSettings = [];
})();
