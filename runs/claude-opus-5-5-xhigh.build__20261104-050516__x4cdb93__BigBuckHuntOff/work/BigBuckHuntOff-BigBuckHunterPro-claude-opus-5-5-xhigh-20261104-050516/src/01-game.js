// 01-game: the engine's game with our input map, settings, pause items and HTML shell; the cast's gibberish voices.
const HUB_ON = typeof AIHub !== 'undefined' && !!AIHub.active;
const HUNT_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Pad7', 'KeyJ'],                 // left click, R2
  pump: ['KeyR', 'Space', 'Pad2', 'KeyK'],          // R, Space, Square
  scope: ['Mouse2', 'Pad6', 'KeyL'],                // right click, L2
  breath: ['ShiftLeft', 'Pad5'],                    // Shift, R1
  call: ['KeyQ', 'Pad3'],                           // Q, Triangle
  board: HUB_ON ? [] : ['Tab', 'Pad8'],             // hold: the standings (Create belongs to the hub in a session)
  more: HUB_ON ? ['KeyM'] : [],                     // the hub card's More time
  tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],   // menus: L1 / R1 turn pages
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
const GAME_SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: [['easy', 'Easy'], ['normal', 'Normal'], ['pro', 'Pro']], value: 'normal', help: 'Easy: strong aim assist, auto-pump, slower animals, an extra call. Pro: no assist, faster animals, more does' },
  { key: 'assist', label: 'Aim assist', options: [['off', 'Off'], ['light', 'Light'], ['strong', 'Strong']], value: 'light', help: 'Controller and keys only: the reticle slows over a legal target. Never the mouse' },
  { key: 'reticle', label: 'Reticle speed', type: 'slider', value: 1, min: .5, max: 1.6, step: .05, help: 'How fast a stick or the keys move your reticle' },
  { key: 'autoPump', label: 'Auto-pump', type: 'toggle', value: false, help: 'Rack the rifle by itself after every shot' },
  { key: 'scopeMode', label: 'Scope', options: [['hold', 'Hold'], ['toggle', 'Toggle']], value: 'hold' },
  { key: 'doeRule', label: 'Doe rule', options: [['classic', 'Classic: you sit out the site'], ['casual', 'Casual: a points penalty']], value: 'classic' },
  { key: 'trophyCam', label: 'Trophy Cam', options: [['on', 'On'], ['trophies', 'Trophies only'], ['off', 'Off']], value: 'on', help: 'The slow-motion bullet cam on big kills' },
  { key: 'glint', label: 'Antler glint', type: 'toggle', value: false, help: 'A glint on antler tips, so bucks read at range' },
  { key: 'bigCaptions', label: 'Large captions', type: 'toggle', value: false },
  { key: 'rivalTag', label: 'Rival score tag', type: 'toggle', value: true, help: 'The Hunt-Off campaign: the score to beat in the corner' }
];
const game = new E.Game({
  canvas: 'screen', res: [480, 270], expand: true, view: 'side', input: HUNT_KEYS, id: 'bigbuckhuntoff', bg: '#000',
  autoPause: !HUB_ON, corner: !HUB_ON, fullscreen: HUB_ON ? 'button' : 'tap',
  menu: {
    items: [['Restart site', () => G.hunt && G.hunt.restartSite()], ['Restart hunt', () => G.hunt && G.hunt.restartHunt()], ['Dev mode', () => G.dev && G.dev.open()]],
    settings: GAME_SETTINGS.concat(TUNE_SETTINGS),
    controls: { more: false, fire: 'Shoot', pump: 'Pump / reload', scope: 'Scope', breath: 'Hold breath', call: 'Call', board: 'Standings', tabL: 'Menu page left', tabR: 'Menu page right', up: 'Aim up', down: 'Aim down', left: 'Aim left', right: 'Aim right' },
    quit: HUB_ON ? false : 'title'
  }
});
G.game = game;
game.pauseOverlay = false;
const ui = new E.Shell(game, {
  theme: { ink: '#f4ead8', paper: 'rgba(28,18,10,.94)', accent: '#e8843a', muted: '#b8a488', danger: '#e8443a', line: 'rgba(232,180,110,.35)', font: '600 18px ui-rounded, "Trebuchet MS", system-ui, sans-serif', titleFont: '800 30px ui-rounded, "Trebuchet MS", system-ui, sans-serif' },
  screens: { help: {
    title: 'How to hunt',
    keys: () => [['Mouse / left stick', 'Aim'], ['Left click / R2', 'Shoot'], ['R or Space / Square', 'Pump the rifle (and reload)'], ['Right click / L2', 'Scope (hold)'], ['Shift / R1', 'Hold your breath (scoped)'], ['Q / Triangle', 'Call: animals stop and look'], ['Tab / Create', 'Standings'], ['Esc / Options', 'Pause']],
    sections: [['Bucks only', 'Bucks have antlers. Does, fawns and calves do not. Shoot one and you sit out the rest of the site.'],
      ['Shot placement', 'Heart, head and lungs drop him with one round and score the most. Gut and leg hits wound: finish him before he runs off.'],
      ['Points', 'Bigger racks, longer shots, running shots and quick draws all score more. Critters are bonus points, but some are protected.']]
  } }
});
G.ui = ui;
const I = game.input;
// the wheel pumps too (a notch down)
if (HAS_DOM && !HUB_ON) addEventListener('wheel', e => { if (G.scene === 'hunt' && !game.paused && !ui.screen && e.deltaY > 0) { I.press('Act:pump'); game.after(.02, () => I.release('Act:pump')); } }, { passive: true });

/* ---------- touch-only devices: no touch controls; "Controller or keyboard required" ---------- */
const mm = q => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
G.touchOnly = mm('(pointer: coarse)') && !mm('(any-pointer: fine)');
I.touchEnabled = false;
if (HAS_DOM) for (const ev of ['keydown', 'mousedown', 'mousemove']) addEventListener(ev, e => { if (ev === 'mousemove' && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; if (G.touchOnly) G.touchOnly = false; }, { capture: true, passive: true });

/* ---------- voices ---------- */
const bab = new E.Babble(game);
bab.define('emcee', { pitch: 140, wave: 'square', speed: 15, spread: 1.1, vol: .2, echo: .16, formant: 1.05 });
bab.define('dub', { pitch: 105, wave: 'sawtooth', speed: 10.5, spread: .8, grit: .35, vol: .2, formant: .9 });
bab.define('granny', { pitch: 260, wave: 'sine', speed: 12, spread: 1.3, warble: .035, vol: .24, formant: 1.2 });
bab.define('dwayne', { pitch: 185, wave: 'square', speed: 14, spread: 1.2, vol: .16, formant: 1.35 });
bab.define('loretta', { pitch: 225, wave: 'triangle', speed: 13.5, spread: 1.2, vol: .26, formant: 1.15 });
bab.define('earl', { pitch: 95, wave: 'square', speed: 9.5, spread: .7, vol: .18, formant: .85 });
G.bab = bab;
