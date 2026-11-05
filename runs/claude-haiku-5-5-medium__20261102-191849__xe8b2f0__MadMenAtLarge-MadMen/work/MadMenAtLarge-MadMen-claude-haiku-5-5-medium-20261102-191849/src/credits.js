/* The About and Credits screen. Plain lines; a line with heading: true is drawn in gold. The text is the same as the
 * chat reply's Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, and as exit-interview.json. */
(function (root) {
  'use strict';
  var H = function (text) { return { text: text, heading: true }; };
  var L = function (text) { return { text: text, heading: false }; };
  root.MM_CREDITS = {
    lines: [
      H('MAD MEN AT LARGE'),
      L('An original spiritual successor to Mad Men (2007-2015). Built on my-3D2dge 0.85.1 and the AI Hub session protocol.'),
      L(''),
      H('Source Information'),
      L('Date: 2026-11-02 19:18'),
      L('Source: Mad Men (2007-2015)'),
      L('Genre and Perspective: Life Sim with a timing-based pitch minigame. Third-person 3/4 view.'),
      L('Tech: my-3D2dge 0.85.1 (inlined, MIT), JavaScript, Canvas 2D. Hub client session.js 1.3.0.'),
      L('Art Direction: pixel art in the engine\'s SNES-style 3/4 view, a 1963 office palette.'),
      L('Animation: my-3D2dge procedural rig animation (Humanoid).'),
      L('Audio: chip-synth music and sound effects from the engine. No voice work.'),
      L('Online: AI Hub parallel session, 1 to 4 players. Progress and result only.'),
      L('Testing: 21 rules tests, 65 engine checks (a three-day bot playthrough), the AI Hub harness, Chromium, WebKit and Firefox screenshots at 24 sizes.'),
      L('Research: none (author knowledge of the source).'),
      L('Environment: Claude Code CLI (headless); Linux (WSL2); Chromium for checks.'),
      L('Model: Anthropic, claude-haiku-5-5, reasoning effort medium.'),
      L('Usage: cost unknown; about 0.29M tokens by the session budget counter, breakdown unknown; about 14 minutes.'),
      L(''),
      H('Testing Feedback'),
      L('Issues caught: 7 in the game (the attract demo never reached the boardroom; the pitch prompt sat on the box border; the summary log ran into its prompt; the credits ran past the right edge; the middle dot showed as ?; the scroll hint showed raw letters; the touch-only message could never show). None were game-breaking.'),
      L('Most helpful test: the headless three-day bot playthrough, driven by the same inputs a player sends, through to an ending.'),
      L('Least helpful test: the first viewport-matrix run, which hit another agent\'s page on the same port and tested the wrong game. Port checks came first after that.'),
      L(''),
      H('Engine Feedback'),
      L('Liked most: E.Dialog with portraits and choices, E.Shell\'s HTML HUD, settings.define for game options, and TileMap rows with floorTex.'),
      L('Got stuck: the default font has no middle dot, so it drew as ?. The engine starts with lastDevice set to keyboard, so a touch-only phone never looks touch-only until it is touched.'),
      L('Built myself: the office floor plan, the day and encounter rules, the pitch minigame, the endings, the attract AI, and the hub session flow.'),
      L('Hardest: at expand the internal screen is about 225 pixels tall, so small text needs care.'),
      L('Would overhaul: the default font glyph set; add a glyph test to the engine.'),
      L('Would change: lastDevice starting as unknown rather than keyboard.'),
      L(''),
      H('Prompt Feedback'),
      L('Liked most: the concrete deliverable list, the hub and engine links, and the done rule.'),
      L('Confusing: "silently brainstorm" sits awkwardly with the RNG step, which had to show a visible list in a tool call; "Source" and "Source Information" overlap.'),
      L('Hardest: fitting attract mode, the hub round, glyphs, inversion, touch rules and tests into one session.'),
      L('One test I could not run: a real DualSense on a real iPhone, not an emulator.')
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
