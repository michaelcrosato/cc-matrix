/* ICE HOC-KABOOM - skate, dangle and rip the puck past the goalie while you hammer rivals through the glass;
   fill your team's BOOM meter to go KABOOM; win the scrap when the gloves drop; outscore them before the final horn. */
'use strict';
const E = My3D2dge, { px, clamp, lerp } = E;
const HUB = !!(window.AIHub && window.AIHub.active);
const PI = Math.PI, TAU = PI * 2, VERSION = '1.0.0';
const HOCKEY_KEYS = Object.assign({}, E.Input.DEFAULT, {
  pass: ['KeyJ', 'Mouse2', 'Pad0'], shoot: ['KeyK', 'Mouse0', 'Pad2'], deke: ['KeyL', 'Space', 'Pad1'], lob: ['KeyI', 'Mouse1', 'Pad3'],
  turbo: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad5'], chirp: ['KeyC', 'Pad4'], switch: ['KeyQ', 'Pad6'], camera: ['KeyV', 'Pad11']
});
for (const k of ['attack', 'dash', 'skill', 'jump']) delete HOCKEY_KEYS[k];
const SETTINGS = [
  { key: 'glyphs', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
  { key: 'difficulty', label: 'Difficulty', options: ['Rookie', 'Pro', 'All-Star', 'Legend'], value: 'Pro' },
  { key: 'periodLen', label: 'Period length', options: ['1:00', '1:30', '2:00', '3:00'], value: '1:30' },
  { key: 'camMode', label: 'Camera', options: ['Broadcast', 'Overhead'], value: 'Broadcast' },
  { key: 'camDist', label: 'Camera distance', options: ['Near', 'Normal', 'Far'], value: 'Normal' },
  { key: 'commentary', label: 'Commentary', options: ['On', 'Off'], value: 'On' },
  { key: 'subtitles', label: 'Subtitles', options: ['On', 'Off'], value: 'On' },
  { key: 'voiceVol', label: 'Voices volume', options: ['Off', 'Low', 'Normal', 'Loud'], value: 'Normal' },
  { key: 'crowdVol', label: 'Crowd volume', options: ['Off', 'Low', 'Normal', 'Loud'], value: 'Normal' },
  { key: 'intros', label: 'Player intros', options: ['On', 'Off'], value: 'On' },
  { key: 'replays', label: 'Replays', options: ['Auto', 'Off'], value: 'Auto' },
  { key: 'flood', label: 'Flood Wagon', options: ['Ask', 'Always', 'Never'], value: 'Ask' },
  { key: 'puckTrail', label: 'Puck trail', options: ['Off', 'Streak', 'Glow'], value: 'Streak' },
  { key: 'tips', label: 'Tips', options: ['On', 'Off'], value: 'On' }
];
const CONTROL_NAMES = { pass: 'Pass / Switch', shoot: 'Shoot / Check', deke: 'Deke / Poke', lob: 'Saucer / Gloves', turbo: 'Turbo', chirp: 'Chirp', switch: 'Switch player', camera: 'Camera', attack: false, dash: false, skill: false, jump: false };
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', input: HOCKEY_KEYS, id: 'ice-hoc-kaboom',
  autoPause: !HUB,
  menu: HUB ? { items: [], settings: SETTINGS.filter(s => ['glyphs', 'camMode', 'voiceVol', 'crowdVol'].includes(s.key)), controls: CONTROL_NAMES, quit: false }
    : { items: [['Objectives & Info', () => Flow.showInfo()], ['Restart Game', () => Flow.restart()], ['Dev Mode', () => Dev.open()]], settings: SETTINGS, controls: CONTROL_NAMES, quit: 'title' } });
const A = game.audio;
const S = k => game.settings[k];
