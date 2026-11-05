// About & Credits: the Source Information and the Testing, Engine and Prompt feedback, the same text as the chat reply
// and exit-interview.json (tools/interview.mjs writes that file from this one), and the credits.
(() => {
'use strict';
const O = OLY;
O.ABOUT = /*ABOUT-JSON*/{}/*END-ABOUT-JSON*/;
O.ABOUT.credits = [
  ['GAME', 'Olympiyikes! v' + O.VERSION + ' (' + O.BUILD_STAMP + ')'],
  ['PLAN', 'PLAN.md, written by claude-opus-5-5 at max effort'],
  ['BUILT BY', 'claude-opus-5-5 at xhigh effort, in Claude Code (headless)'],
  ['ENGINE', 'my-3D2dge v0.85.2 (full engine: core + road, rhythm, songs, arcade modules), modified'],
  ['ENGINE CHANGES', '1 E.HOOKS exported (hub Create+Options guard, idle detection). 2 cosmetic randomness (rig blinks, particles, hit numbers) on its own stream, never Math.random. 3 font glyphs for the PlayStation symbols and the punctuation the game uses. 4 PlayStation button symbols by default. 5 a pose hook (rig.post) and whole-body pitch/roll for flips, dives, swims, tumbles and V-style flight. 6 a voice bus with its own volume for the gibberish voices, and music ducking under speech'],
  ['ONLINE', 'AI Hub Session Protocol 1, client 1.4.0 (session.js, unmodified)'],
  ['ART, MUSIC, VOICES', 'All drawn and synthesized in code: no image, sound or font files'],
  ['ASSETS', 'None from the asset store: every flag, pictogram, venue and prop is drawn by the game'],
  ['FICTION', 'All nations, athletes, venues and the mascot are invented. No official emblems, anthems or broadcast music']
];
})();
