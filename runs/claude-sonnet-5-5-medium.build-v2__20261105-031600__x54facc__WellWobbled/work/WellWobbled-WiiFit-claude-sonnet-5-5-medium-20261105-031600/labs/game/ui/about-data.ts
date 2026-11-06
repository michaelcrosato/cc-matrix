/**
 * @file The one data file behind the About / Credits screen, the chat reply and exit-interview.json: Source Information, Testing
 * Feedback, Engine Feedback, Prompt Feedback, the hub catalogue entry and the credits. The screen, the reply and the interview
 * agree because they all read this. Page-side data only.
 * @example
 * ABOUT.source.model; // 'Anthropic, claude-sonnet-5-5, reasoning effort medium'
 */
export const TITLE = 'Well Wobbled';
export const TAGLINE = 'Stand still. It is harder than it looks.';
export const ABOUT = {
  source: {
    date: '2026-11-05 03:16:00',
    source: 'Wii Fit',
    plan: 'PLAN.md',
    genre:
      'Sports: a 3D anthology of balance activities around a small walkable island, with a daily-ritual meta game and a comedy story',
    perspective:
      'Third person throughout: a chase camera on the island and a purpose-built stage camera for each activity',
    tech: 'my-3dge (pinned at the commit in engine-lock.json), TypeScript, three.js r182 on WebGPU, Rapier 0.21, Vite, Vitest, Playwright',
    artDirection:
      "The engine's native toon puppets and generators, with new retreat assets: high-key brochure daylight, mint, sand and coral on clinical white",
    animation:
      "The engine's clip layer and humanoid, with a new readable clip set (RETREAT) written by hand and scrubbed from the sim by the guest's thumb",
    audio:
      'All code: tracker-notation songs (music at 10% by default), defineSfx effects, ambience loops and Animalese-style gibberish voices; no audio files',
    online:
      'AI Hub Session Protocol v1, mode ghost (a seeded three-class Round, up to four players); same-screen Group Class on its own',
    testing:
      'Headless scripts only: Vitest in Node (the four stand-in players on every activity, a whole-game playthrough), Playwright with software-rendered Chromium for boot, controller, keyboard, attract, touch and hub-harness checks; screenshots only at the end',
    research: 'None beyond the plan; the engine guide and the AI Hub session README were read once',
    environment: 'Claude Code CLI (headless); Linux',
    model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
    usage: 'added on import',
  },
  testingFeedback: [
    'Sixteen: a terrain rebuilt on every call (650 ms a step), a register past its array (a data error that surfaced at capture), a custom input action silently overridden each frame, a missed button edge, the hub card not answering Enter before the view existed, ready() called too late under load, an idle Still Pond scoring 748 instead of 500, a too-easy Line, a mis-measured Hoop spin, a Cliff spin that was too slow, a Garden bot that lagged worse than the sloppy one, a Tilt bot that never led anyone east, Escape both closing a menu and opening pause, and the lint and file-length caps.',
    'Seven: the terrain rebuild, the register overflow, the overridden input map, the missed button edge, the hub card and the late ready() (two), and a Tilt bot that could not finish the finale.',
    'The four stand-in players (perfect, human-like, sloppy, idle) on every activity, and the scripted whole-game playthrough: they found unwinnable and trivial activities and a data error the first time they ran.',
    'The screenshots: the software-rendered GPU takes seconds a frame, so a shot before the first frame is solid black, and they told me little a script could not.',
  ],
  engineFeedback: [
    'Everything being data: props, clips, songs and the sim as plain hashed numbers made scripted play and bots cheap.',
    'Yes: getTerrain builds a whole new heightfield on every call, which made a first draft take minutes per step until I cached it.',
    'The activity framework: one module shape that runs per seat, so the same code plays the island, Group Class and a hub Round.',
    'Knowing the page cannot add a mesh: every drawn thing has to be a sim entity, prop, actor or HTML.',
    'none',
    'Let a running page switch scene, so a hub session could share the island scene.',
  ],
  promptFeedback: [
    'The plan marks what was tested and what was only read in source, which saved a great deal of guessing.',
    'The sheer size: a full game, a hub protocol, a shell and a report in one run.',
    'Keeping every file under 400 lines while the number of systems grew.',
    'A smaller first target, with the cut line stated as a milestone rather than a budget escape.',
  ],
  hub: {
    name: TITLE,
    tagline: 'Stand still. It is harder than it looks.',
    description:
      'A comedy anthology of balance activities on a spotless island run by a retired bathroom scale that measures only how much you wobble. Play solo, on one screen, or as a ghost round in AI Hub.',
    type: 'Game',
    genre: 'Sports',
    source: 'Wii Fit',
    series: '',
    players: '1–4',
    controls: 'Lean: left stick, WASD or mouse · Feet: L2 R2, Q E or mouse buttons · Breathe: both',
    tags: ['3d', 'third-person', 'comedy', 'sports', 'story', 'arcade'],
  },
  credits: [
    'Well Wobbled: a balance-and-wellness game, made with my-3dge.',
    'my-3dge (MIT) · three.js (MIT) · Rapier (Apache-2.0) · @stdlib (Apache-2.0)',
    'AI Hub session client (Protocol v1, ghost mode)',
    'Animation: Mesh2Motion and Quaternius Universal Animation Library (CC0, credited anyway); the RETREAT clip set is original',
    'Music, effects and voices are generated by code in your browser.',
  ],
};
export const SOURCE_LABELS: [keyof typeof ABOUT.source, string][] = [
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
export const TESTING_Q = [
  'How many issues did testing catch?',
  'How many would be considered critical issues / game breaking?',
  'What was the most helpful test you ran?',
  'What was the least helpful test you ran?',
];
export const ENGINE_Q = [
  'What did you like most about the engine?',
  'Did you get stuck or guess wrong?',
  'What was the most important thing you had to build yourself?',
  'What was the hardest part about using the engine?',
  'What did you change in the engine, and why? (none if nothing)',
  'If you could change one thing about the engine, what would it be?',
];
export const PROMPT_Q = [
  'What did you like most about this prompt?',
  'What was confusing?',
  'What was the hardest thing to do?',
  'What would you change in this prompt?',
];
