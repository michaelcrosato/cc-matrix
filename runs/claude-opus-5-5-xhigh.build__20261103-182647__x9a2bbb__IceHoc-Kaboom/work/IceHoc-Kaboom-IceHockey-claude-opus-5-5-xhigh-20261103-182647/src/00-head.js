/* =====================================================================================================================
 * ICE HOC-KABOOM  (an original over-the-top arcade hockey game on my-3D2dge v0.85.2)
 * THE CORE LOOP: skate, dangle and rip the puck past the goalie while you hammer rivals through the glass; fill your
 * team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn.
 *
 * 3-on-3 with goalies on a broadcast camera (threequarter, pitch 55; Overhead = topdown; ice-level brawler for fights,
 * replays, intros and celebrations). Modes: the Cup Run (5 chapters), Exhibition (1-4 local players), Practice (7 drills),
 * Online (AI Hub shared-world sessions, 1-4 seats), Records, Settings, About. Attract mode after 10 s idle on menus;
 * Dev Mode from the pause menu. Every system is data driven: teams, arenas, chapters, cutscenes, objectives, commentary,
 * power-ups and tuning (T) live in tables a designer can extend.
 * Source modules are concatenated in name order into this one IIFE by tools/build.mjs.
 * ===================================================================================================================== */
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach } = E;
const TAU = Math.PI * 2, PI = Math.PI;
const VERSION = '1.0.0';
const GAME_TITLE = 'Ice Hoc-Kaboom';
/** HUB: true when AI Hub opened the page for a session (then there is no title, menu, pause or dev mode) */
const HUB = !!(typeof window !== 'undefined' && window.AIHub && window.AIHub.active);
const NODE = typeof document === 'undefined' || !document.createElement;

/* ---- CONTROLS: one game on every device. DualSense / standard mapping, keyboard (WASD + J K L I, Shift turbo, Space
 * deke) and mouse (left shoots, right passes, middle saucers, the pointer aims). E.Input.DEFAULT's menu keys stay ---- */
const MK = E.Input.DEFAULT;
const HOCKEY_KEYS = {
  up: MK.up, down: MK.down, left: MK.left, right: MK.right,
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11'],
  start: MK.start, pause: MK.pause, confirm: MK.confirm, cancel: MK.cancel
};
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera', attack: false, dash: false, skill: false, jump: false };

/* ---- SETTINGS (the engine's Display, Sound, Comfort and Controls stay; these join them under Game). Every one is read
 * live from game.settings ---- */
const SETTINGS = [
  { key: 'buttons', label: 'Button symbols', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], value: 'playstation', help: 'Which symbols the prompts show for a controller',
    apply: (g, v) => { for (const I of g.players || [g.input]) I.glyphs = v; if (g.settings && g.settings.glyphs !== v && g.settings.spec('glyphs')) g.settings.set('glyphs', v); } },
  { key: 'difficulty', label: 'Difficulty', options: [['rookie', 'Rookie'], ['pro', 'Pro'], ['allstar', 'All-Star'], ['legend', 'Legend']], value: 'pro', help: 'How smart and quick the CPU skaters and goalies are' },
  { key: 'periodLen', label: 'Period length', options: [['60', '1:00'], ['90', '1:30'], ['120', '2:00'], ['180', '3:00'], ['240', '4:00']], value: '120', help: 'Exhibition default' },
  { key: 'camera', label: 'Camera', options: [['broadcast', 'Broadcast'], ['overhead', 'Overhead']], value: 'broadcast', help: 'Also R3 / V in play' },
  { key: 'camDist', label: 'Camera distance', options: [['near', 'Near'], ['normal', 'Normal'], ['far', 'Far']], value: 'normal' },
  { key: 'commentary', label: 'Commentary', value: true, help: 'Chuck and Moose in the booth' },
  { key: 'subtitles', label: 'Subtitles', value: true },
  { key: 'voices', label: 'Voices volume', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } },
  { key: 'crowdVol', label: 'Crowd volume', value: .8 },
  { key: 'intros', label: 'Player intros', value: true },
  { key: 'replays', label: 'Replays', options: [['auto', 'Auto'], ['off', 'Off']], value: 'auto' },
  { key: 'flood', label: 'Flood Wagon', options: [['ask', 'Ask'], ['always', 'Always'], ['never', 'Never']], value: 'ask', help: 'The intermission minigame' },
  { key: 'trail', label: 'Puck trail', options: [['off', 'Off'], ['streak', 'Streak'], ['glow', 'Glow']], value: 'streak' },
  { key: 'tips', label: 'Coach Marge tips', value: true },
  { key: 'resetTips', label: 'Reset tips', options: [['no', 'Keep'], ['yes', 'Reset now']], value: 'no', help: 'Show every tip again',
    apply: (g, v) => { if (v === 'yes') { E.store.set('ihk:tips', {}); Promise.resolve().then(() => g.settings.set('resetTips', 'no')); } } }
];

/* ---- THE GAME ---- */
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: HOCKEY_KEYS, bg: '#05070d', id: 'ice-hoc-kaboom', autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS, controls: CONTROL_NAMES, quit: false }
    : { items: [['Objectives & Info', () => Match.showInfo()], ['Restart Game', () => Match.restart()], ['Dev Mode', () => Dev.open()]], settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;
if (!NODE) try { new E.Shell(game, { theme: { ink: '#eef4ff', paper: 'rgba(8,14,28,.92)', accent: '#ffd36a', muted: '#9fb2cc', danger: '#ff6b6b', line: 'rgba(255,211,106,.28)', font: 'system-ui, "Segoe UI", sans-serif', titleFont: 'Impact, "Arial Black", sans-serif' } }); } catch (e) { game.fail('shell', e); }
/** S(key): a setting, read live */
const S = k => game.settings[k];
const scenes = {};
