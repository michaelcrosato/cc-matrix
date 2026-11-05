// Every string the player reads outside the HUD. The About pages carry the source information, the feedback and the credits.
export const COCO = [
  'Coco says: the clock is the enemy.',
  'Coco says: a clean line beats a fast one.',
  'Coco says: respawn is not a failure, it is a tool.',
];

export const ABOUT = [
  { title: 'CRACKMANIA', lines: [
    'Crack the clock.', '',
    'A desert time-attack racer in the spirit of TrackMania (2003): short roads of bends, hills and kicker jumps, a clock, a ghost of your best run and medals.', '',
    'Race the five roads of the Dustbowl. Respawn returns you to the last checkpoint; restart returns you to the line. Pause, then Dev Mode, tunes the car live.',
  ] },
  { title: 'SOURCE INFORMATION', lines: [
    'Date: 2026-11-04 05:03:17',
    'Source: TrackMania 2003 (Nadeo)',
    'Plan: PLAN.md',
    'Genre: arcade time-attack racing',
    'Perspective: third-person chase camera; orbiting camera on the title, attract and editor',
    'Tech: my-3D2dge 2D engine and 3D engine v0.85.2; three.js r182; Rapier 0.19.3; esbuild; AI Hub client session.js',
    'Art direction: the engine\'s toon style, all drawn by code',
    'Animation: code-driven car, gate and camera motion',
    'Audio: engine songs and effects; car engine and babble voices synthesised in code',
    'Online: AI Hub Session Protocol v1, ghost mode (client 1.4.0)',
    'Testing: 24 headless checks (one command): roads, car, bot on all 15 roads, run rules, scenes, a scripted playthrough, online, editor; Playwright checks',
    'Research: none',
    'Environment: Claude Code CLI (headless); Linux; browser unknown',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium',
    'Usage: unknown',
  ] },
  { title: 'TESTING FEEDBACK', lines: [
    'Issues caught: about eight real bugs; three were critical (steering sign, countdown push, loop road).',
    'Critical: the steering sign (no bot finished), the countdown braking the car off the line, and loops drawn face-down (drove through the road).',
    'Most helpful: a bot run of every road that counts respawns, which exposed the three critical bugs at once.',
    'Least helpful: the no-error page check; a silent canvas stub hid the look until screenshots.',
  ] },
  { title: 'ENGINE FEEDBACK', lines: [
    'Liked most: the pen for code-drawn parts, the fixed camera and the engine\'s menus, pause and settings.',
    'Stuck: its track and vehicle can\'t drive a loop, so the road mesh and car model are my own; boot runs async, so tests must await it.',
    'Built myself: the road mesh and colliders, the car model, the bot, the run rules and the modes.',
    'Hardest: the 3D side is large, and the headless canvas needed a stub.',
    'Changed: E1 pen frame, E2 camera up, E4 analog triggers, E5 PlayStation glyphs, E6 toon bands.',
    'Would change: one call to make a racing track with a loop, or a documented road-mesh helper.',
  ] },
  { title: 'PROMPT FEEDBACK', lines: [
    'Liked most: the plan\'s detail on the car model, the controls and the validated physics appendix.',
    'Confusing: the plan is sized for a far bigger build than one session; the title rule (TASK.md wins) is clear.',
    'Hardest: scope; the loop and the editor alone are each bigger than this session.',
    'Would change: a smaller first milestone, and a note on what to cut when time runs short.',
  ] },
];
