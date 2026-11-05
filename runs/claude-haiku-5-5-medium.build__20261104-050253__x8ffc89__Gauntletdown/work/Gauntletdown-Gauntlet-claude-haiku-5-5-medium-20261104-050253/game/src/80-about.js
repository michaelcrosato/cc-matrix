// About and credits: the pages on the About screen. The Source Information and the feedback sections are the same text
// as the chat reply and exit-interview.json. Each paragraph is wrapped to the screen when the game loads.
const ABOUT_TEXT = [
  ['CREDITS', [
    'GAUNTLETDOWN, VERSION 0.1. Built by Claude Haiku 5.5, medium effort, from PLAN.md and TASK.md.',
    'Engine: my-3D2dge v0.85.2 by Michael Crosato (MIT), handoff folder, unmodified.',
    'Generic props from the engine asset store: Kenney and KayKit, CC0. AI Hub client 1.4.0, unmodified.',
    'Inspired by Gauntlet, Atari Games, 1985. An original homage: no names, art, music or lines from that game are used here.',
    'Music, sound and voices are written in code: original songs, and Babble voices. No audio files.',
    'THE GAUNT IS NOT DEAD. IT IS ONLY DIGESTING.'
  ]],
  ['SOURCE INFORMATION', [
    'Date: 2026-11-04 05:02:53. Source: Gauntlet, Atari Games, 1985 arcade. Plan: PLAN.md.',
    'Genre: arcade co-op dungeon crawler, top-down hack-and-shoot. Perspective: three-quarter overhead, with top-down and isometric in Settings.',
    'Tech: my-3D2dge v0.85.2 on Canvas 2D and Web Audio; tests on Node 24 and Playwright 1.63.0.',
    'Art: the engine look, procedural rigs, textured floors and walls, canvas lighting, pixel sprites, three realms and a banquet hall.',
    'Animation: engine rigs and E.MOVES attacks (overhead swing, throw); bobbing ghosts, lobbed crocks, the King. No new move sets.',
    'Audio: six original songs and layers, sound effects and the Babble voices, all in code.',
    'Online: AI Hub shared-world sessions, 1 to 4 players, one world on the host copy. Testing: 62 headless checks, a scripted playthrough run twice, the hub harness, the engine browser checker. Research: engine docs and source; no web research.',
    'Environment: Claude Code CLI (headless); Linux; Chromium for the checks. Model: Anthropic claude-haiku-5-5, reasoning effort medium. Usage: unknown.'
  ]],
  ['TESTING FEEDBACK', [
    'About 22 issues. Eight were game-breaking: Escape could not open the pause menu, the pause overlay crashed on Resume, the last stairs crashed into a missing floor, a second run would never show its game over, specials, amulets and skip stairs never spawned, a session skipped its own card so nobody could answer Ready, a touch-only device could start a game, and the shared world had no client path until the hub harness exposed it.',
    'The other fourteen were smaller: autopilot stalls on floors after the first and at the King\'s gauntlet, a controller symbol default not applied at boot, overlapping quips on the class select, an over-long Dev Tools page, characters the pixel font cannot draw, a join hint over the fullscreen button, aim assist and the camera view not applied at start-up, and headless saves that silently did nothing.',
    'Most helpful test: the scripted playthrough from title to ending, through every stage, run twice.',
    'Least helpful test: the screenshot look notes, which flagged the flat colours of a dungeon.'
  ]],
  ['ENGINE FEEDBACK', [
    'Liked most: the TileMap, Humanoid rigs, FlowField and Bullets do the hard parts, and headless advance and input make a whole playthrough run in seconds.',
    'Stuck or guessed wrong: yes. Humanoid weapons are sword, gun and staff only, so the axe, bow and shield were drawn as overlays instead. The pixel font has no middle dot. game.go fades, so tests need settle time. Escape is bound to both pause and cancel. A FlowField keeps its old map after a stage change. The engine\'s store is empty headless, so the tests supply a memory store. The hub\'s harness needed unbuffered output from the server.',
    'Built myself: the stage generator with its flood-fill check, the monster, hazard and boss rules, the hero rules, the menu widget, the Babble voices, the songs, and the ghost-mode session.',
    'Hardest: finding supported options, such as Humanoid gear and sound preset names, in the API index and the source, and keeping a moving world\'s state consistent across scenes.',
    'Engine changes: none. The plan\'s changes E1 to E8 were not made; each was worked around. See ENGINE-CHANGES.md.',
    'Would change: one list of valid options for each constructor, and the list of characters the pixel font draws.'
  ]],
  ['PROMPT FEEDBACK', [
    'Liked most: the run-folder rules, the one-command test rule with failures only, and the done checklist.',
    'Confusing: PLAN.md and TASK.md name the title differently (TASK asks for a pick by RNG), and the done condition asks for every feature while the plan is far larger than one session.',
    'Hardest: keeping to what can be finished and tested rather than the full plan: the full move sets, the King\'s complete choreography, and a voice synth that sounds right by ear.',
    'Would change: name a must-have slice and say which features the done condition needs, so the rest can be cut openly.'
  ]]
];
const ABOUT_PAGES = ABOUT_TEXT.map(([title, paras]) => {
  const lines = [];
  for (const p of paras) { for (const l of wrapWords(p, 62)) lines.push(l); lines.push(''); }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return { title, lines };
});
