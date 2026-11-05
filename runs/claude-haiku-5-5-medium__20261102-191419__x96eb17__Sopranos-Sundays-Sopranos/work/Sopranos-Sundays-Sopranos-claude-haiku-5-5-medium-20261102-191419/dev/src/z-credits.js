/* ============================================================================
 * SOPRANOS SUNDAYS  (src/z-credits.js)  the About and Credits page: the source
 * information and the feedback, as the page reads them. Keep it in step with the
 * exit interview (exit-interview.json beside the game's page).
 * ========================================================================== */
const SS_CREDITS = [
  { title: 'SOPRANOS SUNDAYS', items: [
    'A spiritual successor to The Sopranos (1999-2007), made for the my-3D2dge engine. Not affiliated with the show.',
    'Press Confirm to go back. Up and Down scroll this page.'
  ] },
  { title: 'SOURCE INFORMATION', rows: [
    ['Date', '2026-11-02 19:14'],
    ['Source', 'The Sopranos (1999-2007)'],
    ['Genre and Perspective', 'Action: third-person crime action with dialogue chapters. Third-person by default; Camera (V, or the pause menu) turns it to top-down and isometric'],
    ['Tech', 'my-3D2dge 0.85.1 (single-file 2D engine, procedural pixels, Canvas 2D, Web Audio); AI Hub client aihub-session 1.3.0 (protocol 1); no other dependencies'],
    ['Art Direction', 'Engine-native pixel look (PS1 style, 320x240 drawn at full screen), dusk palette with neon signs and a North Jersey skyline'],
    ['Animation', 'The engine\'s procedural Humanoid rig, with its move set: jab, cross, haymaker, overhead, and the crew\'s swings'],
    ['Audio', 'All made in code: four music tracks, sound effects, and the Animalese (a blip a letter, each at its own pitch). No recorded voices, no sound files'],
    ['Online', 'AI Hub session, parallel mode, 1 to 4 players: a three-minute round scored on cash, respect, kills and calm'],
    ['Testing', 'Headless Chromium through Playwright (desktop and a phone profile); the AI Hub harness with two players and a 40-second round'],
    ['Research', 'Read the engine\'s agent guide and API header, and the AI Hub session protocol. No web searches'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-haiku-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ] },
  { title: 'TESTING FEEDBACK', items: [
    'Issues found: 11. Seven came from the test runs; four came from reading the map, the code and the screenshots.',
    'Critical or game-breaking: 2. The attract demo\'s own button taps counted as player input, so it left every talk half done. A spawn point sat in the pool water, a blocked cell, where the finale\'s boss would have stood.',
    'Most helpful test: the attract run with a state log every tenth of a second. It showed the stalls, the bot stuck on a wall, and the demo leaving after a win.',
    'Least helpful test: the random key fuzz. It found no exceptions, but it can\'t say whether the game is right.'
  ] },
  { title: 'ENGINE FEEDBACK', items: [
    'Most liked: the Story module (conversations as data, flags, quests, state for a save), and the standard pause, settings, glyphs and the corner menu.',
    'Stuck or guessed wrong: the settings\' "saved" flag is true before anything is stored, so a "set only if none saved" check never runs. The engine also has no stick invert pair, only the aim\'s, and music names must be registered before use.',
    'Most important thing I built: the town layout, the crew\'s sight and chase, the chapters and their objectives, and the Animalese hook per letter.',
    'Hardest part: a 1.2 MB single file of 14,706 lines; the API had to be read from the source comments and the agent header.',
    'To remove or overhaul: the settings flag. Name it for what it is, or default it to false.',
    'To change: an input preset that merges with a base, so a game adds one action without copying the whole table.'
  ] },
  { title: 'PROMPT FEEDBACK', items: [
    'Most liked: the controller-first rules, the hub protocol link, and the exit-interview shape, which made the done line checkable.',
    'Confusing: the bracketed file names and the template title; the Testing questions that could mean either the test plan or its results; and whether a hub round needs its own score.',
    'Hardest: fitting the attract mode, the hub round and the full engine\'s menus into one build without any of them breaking the others.',
    'One test to add: a scripted play-through that uses real inputs for every chapter, plus a pad emulation for the invert toggles and the glyphs.'
  ] }
];
