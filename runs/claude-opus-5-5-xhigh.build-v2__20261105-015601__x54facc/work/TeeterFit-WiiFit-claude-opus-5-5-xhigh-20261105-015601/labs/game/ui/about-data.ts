/**
 * @file Source Information, Testing Feedback, Engine Feedback and Prompt Feedback: one data file, so the About screen, the
 * chat reply and the exit interview agree (PLAN.md section 19).
 *
 * Game code, a page's data.
 *
 * @example
 * ABOUT.source.source; // 'Wii Fit'
 */

/** Source Information. */
export const SOURCE_INFO = {
  date: '2026-11-05 01:56:01',
  source: 'Wii Fit',
  plan: 'PLAN.md',
  genre:
    'A 3D sports and wellness anthology of balance activities round a small walkable island, with a daily-ritual meta game and a comedy story',
  perspective: 'Third person: a chase camera on the island and a purpose-built camera for each activity',
  tech: 'my-3dge at 2dbd829 (full workspace, engine read-only), three.js r182 on WebGPU, Rapier 0.21, Vite 7, TypeScript 5.9; HTML/CSS UI',
  artDirection:
    "The engine's native toon puppets and generators with new retreat assets: a clean, high-key brochure island",
  animation:
    "The engine's clip layer and humanoid with a new readable clip set scrubbed from the sim, so your thumb is the exercise",
  audio:
    'Tracker songs, defineSfx effects, Animalese-style gibberish syllable voices, all code, no audio files, music at 10% by default',
  online: 'AI Hub Session Protocol v1, ghost mode, up to 4; same-screen Group Class on its own, up to 4 pads',
  testing:
    'Headless scripts allowed: bots on 10 seeds per activity, a scripted playthrough of the whole game, browser checks in Playwright, sparing screenshots; no review subagents',
  research: 'The AI Hub protocol README and the my-3dge guide; nothing else was needed beyond the plan',
  environment: 'Claude Code CLI (headless); Linux',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'added on import',
} as const;

/** The labels of Source Information, in the order TASK.md gives. */
export const SOURCE_LABELS: readonly (readonly [keyof typeof SOURCE_INFO, string])[] = [
  ['date', 'Date'],
  ['source', 'Source'],
  ['plan', 'Plan'],
  ['genre', 'Genre'],
  ['perspective', 'Perspective'],
  ['tech', 'Tech'],
  ['artDirection', 'Art Direction'],
  ['animation', 'Animation'],
  ['audio', 'Audio'],
  ['online', 'Online'],
  ['testing', 'Testing'],
  ['research', 'Research'],
  ['environment', 'Environment'],
  ['model', 'Model'],
  ['usage', 'Usage'],
];

/** Testing feedback: the questions in TASK.md's order, with the answers. */
export const TESTING_FEEDBACK: readonly (readonly [string, string])[] = [
  ['How many issues did testing catch?', 'About 57 across the run, from wrong ids and lint to play-breaking bugs.'],
  [
    'How many would be considered critical issues / game breaking?',
    'Ten: every same-screen player but the first having no balance disc, every class pose silently not playing (seats held no actor), a crash at the session scene start, a boot far past the hub deadline, the Programme restarting the first activity for ever, Gerald walking off the map after Island Jog, a press opening and closing the same screen, a frame crash in Pose Class, a crash removing the diving judges in mid-step, and the Carry on press dropping you straight back into the activity.',
  ],
  [
    'What was the most helpful test you ran?',
    'The scripted playthrough of the whole game with the human-like bot, which proved no softlock on three seeds and found the mid-step crash, and the page drive to the credits with one kind of input, which found the Programme loop and the Carry on bug that the sim could not see. Late on, a search for things written and never used found what every passing test had missed.',
  ],
  [
    'What was the least helpful test you ran?',
    'The look metrics from the shot tool: it told me the pale sky was blown out, and never that a dark band sat on the horizon. A screenshot found that in a second.',
  ],
];

/** Engine feedback. */
export const ENGINE_FEEDBACK: readonly (readonly [string, string])[] = [
  [
    'What did you like most about the engine?',
    'Play is reproducible and needs no screen. Every activity could be played by bots on ten seeds at step speed, and replays matched in Node and Chromium first time. A pose as one line of numbers, scrubbed from the sim, was a joy.',
  ],
  [
    'Did you get stuck or guess wrong?',
    'Yes. Spawns inside setup are queued, so looking people up there silently gave every seat no body. I guessed wrong on the prop placement shape, on what describe returns, and on three library ids. The horizon took an hour.',
  ],
  [
    'What was the most important thing you had to build yourself?',
    'The Wobble Model and the activity framework that makes eleven activities and a finale one shape, with bots; then the whole 10-foot front end: panels, Balance Disc, glyphs, Dev Mode, attract and the hub card.',
  ],
  [
    'What was the hardest part about using the engine?',
    "Warm-up: the engine builds every registered prop's pipelines when the first prop arrives, which on a software GPU is past the hub's deadline, so a session scene has to draw its pavilion with no props at all.",
  ],
  ['What did you change in the engine, and why? (none if nothing)', 'none'],
  ['If you could change one thing about the engine, what would it be?', 'Warm only the props a scene can spawn.'],
];

/** Prompt feedback. */
export const PROMPT_FEEDBACK: readonly (readonly [string, string])[] = [
  [
    'What did you like most about this prompt?',
    'The plan marks what was tested and gives real numbers, such as the sway rate that makes a thumb better than doing nothing. Its bots for judging feel were the right answer to nobody being able to play.',
  ],
  [
    'What was confusing?',
    'The plan was tested on an older engine commit and client hash than I got, so some of its details had moved. Its rule of two short sentences a line sits beside seed lines of five.',
  ],
  [
    'What was the hardest thing to do?',
    'Judging feel and looks with no person and no real GPU: every sound by numbers, every picture on a software renderer at a few frames a second, and a 45-minute game to hold in one head.',
  ],
  [
    'What would you change in this prompt?',
    'Pin the engine commit and client version the plan was tested on, and give a boot-time budget for the island as well as the session, since warm-up cost drives how props should be made from the start.',
  ],
];

/** The credits. */
export const CREDITS: readonly string[] = [
  'Teeter Fit. An original game.',
  'Little Fulcrum, its staff, its frog and its rock are fictional. The rock would prefer it that way.',
  'Built on my-3dge (MIT) with three.js (MIT), Rapier (Apache-2.0) and @stdlib (Apache-2.0).',
  'Multiplayer through the AI Hub session client 1.4.0.',
  'Animation clips: Mesh2Motion human animations and the Quaternius Universal Animation Library (both CC0, credited anyway), with the poses written by hand.',
  'All music, sound and voices are written in code. No recordings were harmed.',
];
