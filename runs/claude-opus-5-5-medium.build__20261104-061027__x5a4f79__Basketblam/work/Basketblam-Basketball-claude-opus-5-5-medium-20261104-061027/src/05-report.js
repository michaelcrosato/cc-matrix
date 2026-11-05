/* REPORT: the About screen's pages (TASK.md asks for them in game and in the chat reply): Source Information, Testing
 * Feedback, Engine Feedback, Prompt Feedback, and the engine changes. tools/build.mjs writes exit-interview.json from the
 * same text (REPORT_JSON), so the two always agree. */
const REPORT_INFO = {
  date: '2026-11-04 06:10:27',
  source: 'Basketball, in the over-the-top arcade style (genre inspiration; an original game with original teams, courts and characters)',
  plan: 'PLAN.md',
  genre: 'Arcade sports: 2-on-2 basketball with a short story ladder (the Blam Tour)',
  perspective: 'Side-on broadcast camera: orthographic, pitch 30 degrees, panning with the ball, with a dunk cam; optional High (three-quarter) camera',
  tech: 'my-3D2dge v0.85.2 (modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio; tests on Node 24 (node:vm headless) and Playwright 1.63 with Chromium; Python http.server for the hub harness',
  artDirection: "The engine's native HD pixel style (PS1-era 2D at 320x240, expanded to fill the screen) pushed to a 90s arcade broadcast: HD Humanoid rigs in team jerseys, shorts and socks, hand-painted court floors, a cheated backboard, a spring net, crowds, backdrops, canvas lighting, comic banners",
  animation: "The engine's procedural Humanoid rigs, with a new pose layer over solvePose: IK hands for the dribble (synced to the ball), jump shots, 12 dunk choreographies, blocks, steals, shoves, spin moves, hanging on the rim, celebrations and taunts",
  audio: '12 songs and 7 stings in the engine format with dynamic layers, about 50 sound effects defined in code, an Animalese/Simlish-style gibberish voice synth (formant-filtered syllables, 20+ voice profiles) for announcers, players and story characters, and a pink-noise crowd bed; no audio files',
  online: 'AI Hub Session Protocol v1, shared world, 1-4 players: our own card, host-authoritative simulation, client inputs at 15/s, snapshots at 15/s with interpolation and own-player prediction, leaving players become CPU, time-up, server mode',
  testing: 'Headless scripts with game.advance and game.debug (tests/run.mjs: one command, prints only failures and a one-line count), including a scripted playthrough of the whole Tour; Playwright screenshots; the AI Hub harness scenarios',
  research: 'None beyond reading the engine handoff docs, the sports kit and the AI Hub protocol README',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'unknown (no usage figures are available inside the session)'
};
const TESTING_FEEDBACK = [
  'About 18 issues in the game itself (plus about 10 mistakes in the tests, fixed along the way). Examples: a shooter at the arena wall released the ball outside the wall, which halved its speed; a pass receiver wandered off instead of meeting the ball; rebounds after a rim touch were not counted; scene changes would stall while dev time was frozen; Camp handed the ball to the interns after a basket; the attract demo could miss the BLAM BOMB; dunks were 77% of baskets until rebalanced; HUD, font-glyph and layout overlaps on several screens.',
  '3 critical: the canvas never filled the window (a 300x150 game), the custom broadcast camera was not registered so the game fell back to another view, and a frozen dev time scale would have stalled every scene change.',
  'The headless scripted playthrough of the whole Blam Tour (tests/run.mjs tour): it drives the real menus, plays every stop with a bot holding the human seat through the real input actions, loses a stop on purpose and rematches, and reaches the ending, credits, unlocks and the Hall of Blam; along with the first CPU-vs-CPU smoke match it exposed the most bugs.',
  'Re-taking screenshots after small layout tweaks: useful for looks, but each one cost far more time than a script and found nothing a quick check of one image would not.'
];
const ENGINE_FEEDBACK = [
  'What I liked most: headless determinism (game.advance plus game.debug) and HD Humanoid rigs that look good with no art files.',
  'Guessed wrong: a custom E.View must be registered in E.VIEWS for setView to find it, and the page needs the canvas sized by CSS.',
  'The most important thing I built myself: the basketball pose layer (IK hands, a dribble synced to the ball, dunk keys) on top of solvePose.',
  'The hardest part was depth sorting a hoop (glass, rim halves, net halves, ball) in an orthographic side view.',
  'Engine changes: basketball shorts and socks on the Humanoid, afro, flattop and mohawk hair, a Dialog voice callback per letter, public audio buses.',
  'One change I would make: a first-class pose and IK clip layer for rig hands, so games do not have to wrap solvePose.'
];
const PROMPT_FEEDBACK = [
  'The complete, testable definition of done (dev mode, attract mode, hub, 10-foot UI, the report) and the freedom over genre, camera and stack; the plan made every decision concrete.',
  'The plan was written for another model and timestamp, so its file names had to be remapped to this TASK.md; and the plan is far larger than one medium-effort session, so it was unclear how much of it was expected.',
  'Fitting the full feature set (a story ladder, ten tutorial lessons, a five-segment attract director, a dev panel, shared-world netcode) into one session while keeping it tested.',
  'Say how much of a large plan is in scope at a given effort level, and give the plan names that follow the TASK.md it is used with.'
];
const ENGINE_CHANGES = [
  'Humanoid shorts option: baggy shorts with a trim hem, bare legs and socks, in the HD and classic drawing paths (basketball uniforms).',
  'Humanoid hair styles afro, flattop and mohawk in the HD head (the crews needed their looks).',
  'E.Dialog voice may be a function (letter, index, page text), so each typed letter speaks in the gibberish voice.',
  'audio.sfxBus and audio.musicBus getters, so the voice synth and crowd bed follow the volume settings.'
];
const REPORT = [
  ['SOURCE INFORMATION', Object.entries({ Date: REPORT_INFO.date, Source: REPORT_INFO.source, Plan: REPORT_INFO.plan, 'Genre and Perspective': REPORT_INFO.genre + '. ' + REPORT_INFO.perspective, Tech: REPORT_INFO.tech, 'Art Direction': REPORT_INFO.artDirection, Animation: REPORT_INFO.animation, Audio: REPORT_INFO.audio, Online: REPORT_INFO.online, Testing: REPORT_INFO.testing, Research: REPORT_INFO.research, Environment: REPORT_INFO.environment, Model: REPORT_INFO.model, Usage: REPORT_INFO.usage }).map(([k, v]) => k.toUpperCase() + ': ' + v)],
  ['TESTING FEEDBACK', ['How many issues did testing catch?', 'A: ' + TESTING_FEEDBACK[0], 'How many were critical / game breaking?', 'A: ' + TESTING_FEEDBACK[1], 'The most helpful test?', 'A: ' + TESTING_FEEDBACK[2], 'The least helpful test?', 'A: ' + TESTING_FEEDBACK[3]]],
  ['ENGINE FEEDBACK', ['Liked most?', 'A: ' + ENGINE_FEEDBACK[0], 'Stuck or guessed wrong?', 'A: ' + ENGINE_FEEDBACK[1], 'Built myself?', 'A: ' + ENGINE_FEEDBACK[2], 'Hardest part?', 'A: ' + ENGINE_FEEDBACK[3], 'Changed in the engine?', 'A: ' + ENGINE_FEEDBACK[4], 'One thing to change?', 'A: ' + ENGINE_FEEDBACK[5]]],
  ['PROMPT FEEDBACK', ['Liked most?', 'A: ' + PROMPT_FEEDBACK[0], 'Confusing?', 'A: ' + PROMPT_FEEDBACK[1], 'Hardest?', 'A: ' + PROMPT_FEEDBACK[2], 'Would change?', 'A: ' + PROMPT_FEEDBACK[3]]],
  ['ENGINE CHANGES', ENGINE_CHANGES]
];
