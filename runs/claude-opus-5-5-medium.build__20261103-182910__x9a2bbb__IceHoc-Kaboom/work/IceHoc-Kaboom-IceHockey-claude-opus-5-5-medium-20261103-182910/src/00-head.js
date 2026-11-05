'use strict';
/* ICE HOC-KABOOM. Core loop: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill
 * your team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn.
 * Built on my-3D2dge v0.85.2 (patched: see ENGINE-CHANGES.md). Modules are concatenated in file-name order into one IIFE. */
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;
const VERSION = '1.0.0';
const HUB = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const PI = Math.PI;
const HEADLESS = typeof document === 'undefined' || !document.getElementById || !document.getElementById('screen');

/* the controls: the engine's menu keys, plus hockey's own actions (PLAN 6.1) */
const HOCKEY_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'Pad1'],
  tabL: ['KeyQ', 'Pad4', 'PageUp'], tabR: ['KeyE', 'Pad5', 'PageDown'], reset: ['KeyR', 'Pad3']
};
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp',
  switch: 'Switch player', camera: 'Camera', tabL: false, tabR: false, reset: false };

const SETTINGS = [
  { key: 'symbols', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation', help: 'Prompts for a controller' },
  { key: 'difficulty', label: 'Difficulty', options: ['Rookie', 'Pro', 'All-Star', 'Legend'], value: 'Pro' },
  { key: 'periodLen', label: 'Period length', options: ['1:00', '1:30', '2:00', '3:00', '4:00'], value: '2:00' },
  { key: 'camera', label: 'Camera', options: ['Broadcast', 'Overhead'], value: 'Broadcast' },
  { key: 'camDist', label: 'Camera distance', options: ['Near', 'Normal', 'Far'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', value: true },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'voices', label: 'Voices volume', type: 'slider', min: 0, max: 1, step: .1, value: .8 },
  { key: 'crowd', label: 'Crowd volume', type: 'slider', min: 0, max: 1, step: .1, value: .7 },
  { key: 'intros', label: 'Player intros', value: true },
  { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' },
  { key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' },
  { key: 'trail', label: 'Puck trail', options: ['Off', 'Streak', 'Glow'], value: 'Streak' },
  { key: 'tips', label: 'Tips', value: true }
].map(s => Object.assign({ group: 'Game' }, s));

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#05070c', input: HOCKEY_KEYS, id: 'ice-hoc-kaboom',
  autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS, controls: CONTROL_NAMES, quit: false } : {
    items: [['Objectives & Info', () => Match.showInfo()], ['Restart Game', () => Match.restart()], ['Dev Mode', () => Dev.openFromMenu()]],
    settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const A = game.audio, P = game.particles, L = game.lights;
const S = () => game.settings;
const R = () => game.r;
const scenes = {};
