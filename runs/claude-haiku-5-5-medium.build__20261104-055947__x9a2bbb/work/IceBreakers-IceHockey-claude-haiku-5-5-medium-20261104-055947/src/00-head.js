// ICE BREAKERS: the game's shell. The core loop, in one sentence: skate, dangle and rip the puck past the goalie while
// you hammer rivals through the glass; fill your team's BOOM meter to go KABOOM; win the scrap when the gloves drop;
// outscore them before the final horn.
(() => {
'use strict';
const E = My3D2dge, { clamp, lerp, approach, px } = E, PI = Math.PI, TAU = Math.PI * 2;
const HUB = !!(window.AIHub && AIHub.active);

// the controls: the default preset's moves and menu keys, with the hockey buttons of its own (keyboard, mouse, pad)
const KEYS = Object.assign({}, E.Input.DEFAULT, {
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'],
  lob: ['KeyI', 'Mouse1', 'Pad3'], turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'],
  switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];

const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: KEYS, bg: '#07060d', id: 'ice-breakers',
  menu: HUB ? { items: [], quit: false } : { items: [['Objectives & Info', () => game.go('about', { from: 'match' })], ['Dev Mode', () => game.go('dev', { from: game.sceneName })]],
    settings: [{ key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' }, { key: 'intros', label: 'Player intros', options: ['On', 'Off'], value: 'On' }, { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' }],
    controls: { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera' },
    quit: 'title' }, autoPause: !HUB });
const A = game.audio, P = game.particles, scenes = {};
game.input.glyphs = 'playstation';   // (the PlayStation symbols; the Controls screen's Button symbols can show Xbox's A B X Y instead)
const store = { get: (k, d) => E.store.get('ice:' + k, d), set: (k, v) => E.store.set('ice:' + k, v) };
// a prompt in the player's own controls, drawn for the device used last (keyboard keys, mouse buttons, pad symbols)
const prompt = (a, word) => game.input.label(a) + ' ' + word;
const DEV_OK = () => game.input.lastDevice !== 'touch';
const mmss = s => Math.floor(Math.max(0, s) / 60) + ':' + String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0');
// the seeded random for the simulation: one stream per match (a seed given by the story, the exhibition's own seed)
let simRng = E.rng(1);
const srand = () => simRng();
const pick = (arr, v) => arr[Math.max(0, Math.min(arr.length - 1, v))];
