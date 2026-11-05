/* ---- ABOUT & CREDITS: five pages (L1 / R1 turn them), the same text as the build's report and exit-interview.json ---- */
TT.ABOUT_INFO = {
  date: '2026-11-04 06:51:21',
  source: 'Rugby (over-the-top arcade style): rugby union sevens played for laughs. An original game; every team, person and place is made up.',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
  genre: 'Arcade sports (rugby sevens) with a short story campaign, a training mode and 1-4 player local and online multiplayer',
  perspective: 'A TV broadcast camera (a custom 40-degree view panning with the ball), with High (55) and Overhead (80) options and a low behind-the-kicker camera for conversions and penalty goals',
  tech: 'my-3D2dge engine v0.85.2 (the handoff package\'s full engine, with four small patches), plain JavaScript, Canvas 2D and Web Audio; the AI Hub session client 1.4.0 (unmodified); no other libraries; one self-contained HTML file',
  artDirection: 'The engine\'s native PS1-era pixel style at 320x240 (expanded to fill any screen): procedural HD Humanoid players dressed in team kits, a painted pitch with its markings and crests, stands with a bobbing crowd, sponsor boards, floodlights, venue skylines, canvas lighting, particles and string-sprite power-ups',
  animation: 'The engine\'s native procedural Humanoid rig, driven from each player\'s state; new rugby moves as attack specs in the E.MOVES format (passes, fend, tackle, big hit, kicks, throw-in, jackal) and solvePose wrappers (the ball carried in the arm, two hands ready, lineout lift, aeroplane arms, the referee\'s signals), plus dives, launches with flips, rucks, scrums and celebrations',
  audio: 'All in code with the engine\'s chip synth: seven songs with named layers (drums in the opponents\' 22, a hype layer), stings (try, monster hit, ON FIRE, sad trombone), 40 sound effects (whistles, the hooter, hits, DOINK, air horn, chicken), a crowd bed that follows the excitement, and Animalese-style babble voices for every speaker',
  online: 'AI Hub Session Protocol v1, shared-world mode, 2-4 players: the host runs the match, clients send intents and draw the host\'s snapshots, the game\'s own session card, time-up, leavers to CPU, server-hosted rounds. Also 1-4 players on one machine',
  testing: 'One command (node test/run.mjs) rebuilds and runs 71 headless checks in 7 suites that play the game through game.advance and game.debug (rules, contact, set pieces, arcade systems, a 12-match CPU soak with a phase watchdog, input and glyphs, replays, a determinism proof, all nine drills by their bots, the attract mode, dev mode, saves, 4-player local play, AI Hub sessions on an in-process hub with latency and loss, a scripted playthrough of the whole Mega Cup, and the campaign\'s other branches, every Exhibition weather and time, records and initials and the About pages through button presses); --browser adds 6 Chromium checks of the HTML file (a standard-mapping controller through navigator.getGamepads with PlayStation and, after the Settings option, Xbox prompts; keyboard and mouse hover, clicks and right-button kicks; the attract mode; a touch-only phone and its SETTINGS button; 1920x1080 and 1280x720 with DEV MODE from the pause menu); --hub runs the real AI Hub harness in all four configurations (two players; four at 150 ms with 5% loss; host leaving; server-hosted), every check passing. Screenshots only for the look. No real controller was available: the pad was simulated',
  research: 'The engine handoff package (README, API card, AI guide sections, the sports kit, the arcade and story module headers, engine source around fonts, input labels, half keyboards, dialogs, settings, views and the Humanoid) and the AI Hub protocol README, harness and arena example. No web research on rugby (general knowledge)',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Cost and tokens unknown (not visible to the model); session time about 1 hour 45 minutes (06:51 to about 08:35)'
};
TT.FEEDBACK = {
  testing: [
    'How many issues did testing catch? About 39: 26 by the headless suites (crashes, stalls, wrong rules, unreachable moves, drills that could not be finished, balance), 3 in a real browser (2 by the AI Hub harness, and the touch stick turning itself back on for touch-only phones), and about 10 layout and look problems by screenshots.',
    'How many were critical / game breaking? 7: the game did not boot (a scene table used before it existed; storage used before it was defined, which only crashed in a real browser), tapped and held kicks never fired for humans (the meter read 0 on its first frame), kicks and passes left from the wrong spot, the session card could swallow Ready, and three drills could not be completed.',
    'The most helpful test: the scripted drills and the whole-cup playthrough, driven through the same intents a player gives; they found the dead kick button and the unreachable spin, which a CPU-only soak never would. The AI Hub harness was a close second: it found a crash only a real browser shows.',
    'The least helpful test: the defensive-shape metric. Its thresholds were mine and moved with every balance change; a screenshot of the line told me more.'
  ],
  engine: [
    'What I liked most: the Humanoid rig. Plain numbers (down, flip, crouch, attack specs) give fourteen distinct dressed people who run, tackle, dive, flip and celebrate; and the fixed-step headless game.advance made a whole match testable in milliseconds.',
    'Did I get stuck or guess wrong? A few wrong guesses: a custom view\'s yaw sign for the behind-the-kicker camera, that E.store keeps nothing where localStorage is missing, and that the pixel font had no PlayStation symbols.',
    'The most important thing I built myself: the match simulation as a plain state machine (laws, set pieces, the CPU brain, the arcade layer) that reads only intents, so live play, replays, the attract demo, drills, tests and online clients all share it.',
    'The hardest part: making set pieces (scrum, lineout, ruck, set kicks) read clearly with procedural rigs and compact widgets at 320x240, across a room.',
    'What I changed in the engine: (1) the 5x7 font got ✕ ○ □ △ (they drew as ?), plus · and ◂; (2) Input.halfKeys takes a preset\'s own per-action half-keyboard layouts; (4) E.Dialog calls onLetter for each letter, for per-letter babble voices; (5) E.Dialog takes a box width and left edge, so the commentary fits between the HUD cards. The plan\'s E.Menu scale patch was not needed: the 10-foot menus are the game\'s own.',
    'One thing I would change: named pose layers on the Humanoid (a carry, arms up, a signal) blended over the solver, instead of wrapping solvePose by hand.'
  ],
  prompt: [
    'What I liked most: it asks for a complete, polished vertical slice with real infrastructure (dev mode, attract, local and online play, tests) instead of a toy, and the plan made the scope concrete.',
    'What was confusing: the plan\'s file names and date belong to another run; STAGE.md settles it (TASK.md wins), so the files use this run\'s names.',
    'The hardest thing: the breadth. Every law and set piece, the arcade layer, five modes, three input devices with their glyphs, and an online protocol, all in one coherent game.',
    'What I would change: say which plan details are optional when time is short, and give a target length for the story campaign and the online round.'
  ]
};
TT.ABOUT = [
  { title: 'THUGBY TURBO', rows: [
    ['', 'Over-the-top arcade rugby sevens. Big hits, bigger hair, seven a side.'],
    ['MADE WITH', 'The my-3D2dge engine v0.85.2 and the AI Hub session client 1.4.0, by Anthropic\'s claude-opus-5-5 (reasoning effort xhigh), from PLAN.md.'],
    ['THE TITLE', 'Fifty playful riffs on "rugby" were brainstormed; a real random number generator (Python\'s secrets.randbelow(50), OS entropy) drew entry 17: Thugby Turbo.'],
    ['', 'An original game inspired by rugby. Every team, person, place and sponsor is made up.'],
    ['HOW TO PLAY', 'Run at their line and pass it BACKWARDS (L1 / R1 or Q / E). Tackle with X (Space), hold it for a BIG HIT. Kick with O (C). Turbo on R2 (Shift). Fill the hype meter for a SUPER on TRIANGLE (R).']
  ] },
  { title: 'SOURCE INFORMATION', rows: Object.entries({ Date: 'date', Source: 'source', Plan: 'plan', Genre: 'genre', Perspective: 'perspective', Tech: 'tech', 'Art direction': 'artDirection', Animation: 'animation', Audio: 'audio', Online: 'online', Testing: 'testing', Research: 'research', Environment: 'environment', Model: 'model', Usage: 'usage' }).map(([h, k]) => [h.toUpperCase(), TT.ABOUT_INFO[k]]) },
  { title: 'TESTING FEEDBACK', rows: TT.FEEDBACK.testing.map(t => ['', t]) },
  { title: 'ENGINE FEEDBACK', rows: TT.FEEDBACK.engine.map(t => ['', t]) },
  { title: 'PROMPT FEEDBACK', rows: TT.FEEDBACK.prompt.map(t => ['', t]) }
];
TT.CREDITS = [
  ['THUGBY TURBO', 'A Channel Thud presentation'],
  ['DESIGN, CODE, ART, MUSIC AND VOICES', 'Claude (claude-opus-5-5), from a plan by Claude at max effort'],
  ['ENGINE', 'my-3D2dge v0.85.2 by Michael Crosato'],
  ['ONLINE', 'AI Hub Session Protocol v1, client 1.4.0'],
  ['STARRING', 'The Muddington Mudlarks: The Fridge, Gravy, Tiny, Pocket Rocket, Boots, The Bus and Wheels'],
  ['AND', 'Coach Gordon Gristle, Big Dave, Barry Bellows, Ros Rucker, referee Nigel Blewitt, Sir Rupert Goldbrick, BIG UNIT Brannigan, Nan Pemberton and Captain Clucky'],
  ['THE CLUB SONG', 'Oh Muddington, oh Muddington, your mud is in my soul. We lost our boots, we lost our teeth, we never lost the ball.'],
  ['', 'Rule Seven: thanks for playing.']
];
