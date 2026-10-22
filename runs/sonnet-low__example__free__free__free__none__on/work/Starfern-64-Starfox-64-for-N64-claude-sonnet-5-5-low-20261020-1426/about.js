'use strict';
/* '#' prefix = heading line. Mirrored in the HTML header comment and the chat reply. */
const ABOUT = [
  '#Source Information',
  'Date: 2026-10-20 14:26',
  'Source: Starfox 64 for N64 — this game is an original spiritual successor, "Starfern 64" (title picked by a random number generator from 50 brainstormed riffs).',
  'Tech: Vanilla JavaScript (ES2020), HTML5 Canvas 2D with a custom software 3D mesh renderer (painter\'s algorithm, flat shading, fog), Web Audio API (synthesized SFX and procedural music), Gamepad API. No external libraries or CDN dependencies; single self-contained file.',
  'Art Direction: Low-poly flat-shaded "N64-style" vector 3D with neon additive glow, an overgrown fern-jungle canyon and a purple spore nebula.',
  'Animation: Code-driven procedural animation: per-frame simulation with delta-time, sine/path-driven enemy formations, interpolated banking and barrel roll, particle bursts and additive glows. No skeletal or keyframe assets.',
  'Testing: The prompt said to write no tests and do no tests; testing is done separately. None were written or run by me.',
  'Environment: Claude Code CLI (headless); Linux; browser unknown',
  'Model: Anthropic, claude-sonnet-5-5, reasoning effort low',
  'Usage: cost unknown; roughly 0.15M tokens of context consumed by the session counter at completion; session time unknown.',
  '#Engine Feedback',
  'Liked most: Zero build step — one canvas, a few hundred lines of projection math gives a convincing rail-shooter look, and data-driven stage scripts (STAGES in data.js) make adding sectors cheap.',
  'Stuck or guessed wrong: Painter\'s-algorithm sorting with large objects (bosses, walls) is approximate; I guessed sizes and had to compensate with generous hit boxes instead of true collision.',
  'Most important thing built myself: The mesh renderer, the event-script spawner with checkpoints, the lock-on/homing weapon system, and the menu/input layer with gamepad-first navigation.',
  'Hardest part: Making a canvas 2D renderer feel like 3D (depth sorting, fog, glows) without a depth buffer, and keeping gamepad, keyboard and mouse input mapped to one interaction model.',
  'Remove or overhaul: The software renderer — a WebGL/three.js layer would give real depth testing, lights and shadows for the same content.',
  'Change one thing: A built-in input-action mapping layer (with prompt glyphs and axis inversion) so every project does not rebuild it.',
  '#Prompt Feedback',
  'Liked most: The clear 10-foot controller-first rules, the attract-mode requirement, and the explicit axis-inversion fix gave concrete, checkable UX targets.',
  'Confusing: The filename template mixes GameTitle and SOURCE placeholders, and "Source Information" is requested in three places with slightly different content expectations.',
  'Hardest: Scoping a "feature-complete vertical slice" with no testing allowed — everything has to be right by construction.',
  'One test I would have run: An automated headless playthrough with a gamepad emulator that clears both sectors and the bosses, checking for console errors and softlocks.',
  '#Credits',
  'Design, code and sound: Claude (Anthropic). Cast of Comet Wing — Ember, Pogo, Sable, Moss, Gen. Harlow — and the Blight are original characters. Inspired by the gameplay of Starfox 64 (Nintendo); no Nintendo assets are used.'
];
