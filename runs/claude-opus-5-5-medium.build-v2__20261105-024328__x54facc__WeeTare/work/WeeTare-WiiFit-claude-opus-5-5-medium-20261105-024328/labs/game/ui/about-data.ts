/**
 * @file The one place the reports live: Source Information, Testing Feedback, Engine Feedback, Prompt Feedback and credits.
 * The About screen shows this; tools/write-interview.mjs writes exit-interview.json from it, so they always agree.
 */
export const SOURCE_INFORMATION = {
  date: '2026-11-05 02:43:28',
  source: 'Wii Fit',
  plan: 'PLAN.md',
  genre:
    'A 3D sports and wellness anthology of balance activities around a small walkable island, with a daily-ritual meta game and a comedy story',
  perspective: 'Third person: a chase camera on the island and a purpose-built camera for each activity',
  tech: 'my-3dge at 2dbd829, three.js r182 on WebGPU, Rapier 0.21, Vite, TypeScript',
  artDirection:
    'The engine’s native toon puppets and generators with new retreat assets: high-key brochure daylight, clinical white, mint, sand, coral',
  animation:
    'The engine’s clip layer and humanoid with a new readable clip set scrubbed from the sim, so limbs follow your thumb',
  audio:
    'Tracker songs, defineSfx effects, gibberish syllable voices, all code with no audio files, music at 10% by default',
  online: 'AI Hub Session Protocol v1, ghost mode, 1 to 4 players; same-screen Group Class on its own',
  testing:
    'Headless scripts allowed: bots in Node, the built file in headless Chromium, the hub harness; one command that prints failures and a count; sparing screenshots; no review subagents',
  research: 'None beyond the plan, the engine’s documents and the AI Hub protocol README',
  environment: 'Claude Code CLI (headless); Linux',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'added on import',
};

export const SOURCE_LABELS: Readonly<Record<string, string>> = {
  date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction',
  animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage',
}; // prettier-ignore

export const TESTING_FEEDBACK: readonly string[] = [
  'About 35 real issues, not counting typos the compiler or a first boot caught: bots stepping every frame, the Line finishing in 7 seconds, group state leaking into the finale, a shared array only a capture would notice, props at height zero, the map being switched back, lost presses, Esc closing its own pause, a pad press that left attract and also picked Begin, a Programme button that did nothing, a crash when an actor was removed, a Dev Mode jump that left the game paused, a Group Class with no podium, and more.',
  'About 6: play ignoring all input after the first map switch; Esc never pausing; the session scene failing its boot deadline; the finale never ending in the whole-game run; a diver crashing the frame loop against the cliff; every prop standing at height zero.',
  'The browser script that plays through the built file with real keys and a stubbed pad. It found the worst bugs, all of which every Node test had passed. The whole-game bot run was next: it found the stall on Day 5.',
  'The first hub harness run at 8 seconds of play: it passed while the engine had not finished starting in either frame, so it proved the protocol and nothing about the game. It needed a longer run with the engine checked in each frame.',
];
export const TESTING_QUESTIONS = [
  'How many issues did testing catch?',
  'How many would be considered critical issues / game breaking?',
  'What was the most helpful test you ran?',
  'What was the least helpful test you ran?',
];

export const ENGINE_FEEDBACK: readonly string[] = [
  'Scrubbing poses as plain data. A readable clip set, with slots I can write each step, made a body that follows your thumb in a few lines, and the same code runs in Node with a stable hash. Headless play made a full bot playthrough cheap.',
  'Yes. I assumed input.use switches maps for good, but a string actionMap is re-applied at every sample. I assumed input.pressed read in onFrame sees every press, and it does not above one sim step per frame. I also guessed geometry parameters and the shape of vib wrongly, and those errors were clear.',
  'The Wobble Model and the bots that stand in for a human, then the 10-foot menu layer and the camera shot table.',
  'Startup and placement order: spawns and physics queries are not ready during setup, placeActor throws where a diver passes a cliff, and a look costs tens of seconds of warm-up on software rendering, holding the main thread past the hub deadline.',
  'None. The engine is unchanged.',
  'A per-frame input.pressed that never loses a press, and an action map that stays where a page puts it.',
];
export const ENGINE_QUESTIONS = [
  'What did you like most about the engine?',
  'Did you get stuck or guess wrong?',
  'What was the most important thing you had to build yourself?',
  'What was the hardest part about using the engine?',
  'What did you change in the engine, and why?',
  'If you could change one thing about the engine, what would it be?',
];

export const PROMPT_FEEDBACK: readonly string[] = [
  'The tested marks in the plan. Knowing which numbers had really been run (the sway rate above all) saved hours, and the writing samples set the tone at once.',
  'Pause lists eight items while the 10-foot rule allows six rows, and the client SHA-256 and engine commit in the plan differed from what I fetched. It says to compare, so that was survivable. Moving props on kinematic bodies was stated firmly though a bodiless prop is simpler.',
  'Judging feel with nobody to play: every balance number rests on a model of a thumb. Also proving things on a shared software renderer, where frames take seconds and memory runs out.',
  'I would ask for browser play tests early rather than late in the build order, say what real frame rate to assume on this machine, and let the look of a session be simple from the start.',
];
export const PROMPT_QUESTIONS = [
  'What did you like most about this prompt?',
  'What was confusing?',
  'What was the hardest thing to do?',
  'What would you change in this prompt?',
];

export const CREDITS: readonly string[] = [
  'Wee Tare: made by Claude (Anthropic, claude-opus-5-5) for Michael Crosato.',
  'Engine: my-3dge (MIT). three.js (MIT). Rapier (Apache-2.0). @stdlib (Apache-2.0).',
  'AI Hub session client 1.4.0, pasted unmodified.',
  'Animation clips: Mesh2Motion (CC0) and the Quaternius Universal Animation Library (CC0).',
  'CMU Graphics Lab Motion Capture Database: the wave, the yawn and the jumping jacks.',
  '100STYLE dataset, Mason, Starke and Komura, 2022, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/): Balance_Idle and Balance_Walk, converted to key poses.',
  'All music, effects and voices are written in code.',
];

export const AI_HUB = {
  name: 'Wee Tare',
  tagline: 'Stand still. It is harder than it looks.',
  description:
    'A deadpan wellness retreat on an island balanced on one rock, where a retired bathroom scale measures only how much you wobble. Eleven balance activities, one verb, and a storm.',
  type: 'Game',
  genre: 'Sports',
  source: 'Wii Fit',
  series: '',
  players: '1–4',
  controls: 'Lean: left stick, WASD or mouse · Feet: L2 R2, Q E or mouse buttons · Breathe: both',
  tags: ['3d', 'third-person', 'comedy', 'sports', 'story', 'arcade'],
};
