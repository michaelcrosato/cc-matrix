/* CRICKET KERFUFFLE - an over-the-top arcade cricket game, built on my-3D2dge v0.85.2.
 * This file is the head of one IIFE. The build (tools/build.mjs) concatenates src/*.js in name order.
 * Layout: simulation (pure, deterministic, fixed steps) in 1x-2x files; presentation in 3x; scenes in 4x; AI Hub in 5x;
 * dev panel 6x; test handle 7x; start 9x. */
'use strict';
const E = My3D2dge;
const { px, clamp, lerp, approach, TAU } = E;
const PI = Math.PI;
const G = {};                        // the game's own namespace: everything the scenes share
G.VERSION = '1.0.0';

const HUB_SESSION = !!(globalThis.AIHub && globalThis.AIHub.active);   // an AI Hub session: no pause items, no quit, no auto-pause
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', autoPause: !HUB_SESSION,
  menu: {
    items: [],                       // (99-start adds Restart and Dev Mode, unless this is a hub session)
    settings: [
      { key: 'difficulty', label: 'Difficulty', options: ['County', 'Village', 'Test', 'Kerfuffle!'], value: 'County', help: 'How well the CPU bats and bowls' },
      { key: 'overs', label: 'Default overs', options: ['1', '2', '3', '5'], value: '2' },
      { key: 'wickets', label: 'Default wickets', options: ['5', '3', '10', '2'], value: '5' },
      { key: 'kerfRules', label: 'Kerfuffle rules', options: ['On', 'Off'], value: 'On', help: 'Items, specials, Hype and chaos. Off is purist arcade' },
      { key: 'marker', label: 'Pitch marker', options: ['On', 'Off'], value: 'On', help: 'Shows where the ball is aimed' },
      { key: 'timingWords', label: 'Timing feedback', options: ['On', 'Off'], value: 'On', help: 'PERFECT, GOOD, EARLY and LATE over the batter' },
      { key: 'fielding', label: 'Fielding', options: ['Assisted', 'Manual', 'Auto'], value: 'Assisted', help: 'Assisted catches easy chances for you' },
      { key: 'running', label: 'Running', options: ['Manual', 'Auto'], value: 'Manual', help: 'Auto calls the runs for you once the ball is on the ground' },
      { key: 'replays', label: 'Replays', options: ['Big moments', 'Always', 'Never'], value: 'Big moments', help: 'Instant replays of the big plays' },
      { key: 'captions', label: 'Commentary captions', options: ['On', 'Off'], value: 'On' },
      { key: 'voices', label: 'Gibberish voices', options: ['On', 'Off'], value: 'On', help: 'The commentary and the players talk in Animalese' },
      { key: 'buttons', label: 'Button symbols', options: ['PlayStation', 'Xbox (A B X Y)'], value: 'PlayStation', help: 'The symbols on the prompts for a controller' }
    ],
    controls: { shot: 'Ground shot / Bowl / Catch / Throw to striker end', loft: 'Lofted shot / Alt delivery / Throw to bowler end', block: 'Defend / Alt delivery / Lob to keeper', special: 'Special / Review', run: 'Run / Field preset / Dive', charge: 'Charge down the pitch' },
    quit: HUB_SESSION ? false : 'title'
  },
  input: Object.assign(Object.fromEntries(Object.entries(E.Input.DEFAULT).filter(([k]) => !['attack', 'dash', 'skill', 'jump'].includes(k))), {
    shot: ['KeyJ', 'Pad0', 'Mouse0'], loft: ['KeyK', 'Pad2', 'Mouse2'], block: ['KeyL', 'KeyQ', 'Pad1'],
    special: ['KeyI', 'KeyF', 'Pad3'], run: ['Space', 'Pad5'], charge: ['KeyE', 'Pad7']
  })
});
G.game = game;
G.input = game.input;
G.audio = game.audio;
G.setting = k => game.settings[k];   // read a setting ('On' | 'Off' | option text) at any time
G.rng = { play: E.rng(1), cosmetic: E.rng(2) };   // gameplay (seeded per match) and cosmetic (crowd, particles, lines)
G.errors = [];

// the view: the broadcast camera, a telephoto TV look from behind the bowler (see camPitch and camScale in TUNING)
G.view = null;
G.makeViews = () => {
  G.view = new E.View('broadcast', 'Broadcast', 0, G.T('camPitch'), G.T('camScale'), 1);
  G.wideView = new E.View('wide', 'Wide', 0, 55, G.T('wideScale'), 1);
};

// the Kerfuffle's own letters: a font glyph map for the 5x7 font (it lacks the PlayStation symbols; see glyphs)
