/* =============================================================================
 * 57-about: the About/Credits pages (About, Source Information, Testing Feedback,
 * Engine Feedback, Prompt Feedback, Credits) and the credits roll's lines. The
 * same text is in the build's final reply and in exit-interview.json.
 * ========================================================================== */
BZ.INFO = {
  source: [
    'Date: 2026-11-04 06:00:15',
    'Source: Baseball (the sport), in the over-the-top arcade style.',
    'Plan: PLAN.md',
    'Genre and Perspective: Arcade sports (baseball) with a slapstick brawler mini-game (the Rhubarb) and a story Tour with light upgrades. Plate Cam: a Mode 7 view from behind the catcher for every pitch and swing; Broadcast Cam: a three-quarter ground view (pitch 52) of the park for fielding and running; Moonshot Cam: a Mode 7 chase of home runs; Replay Cam: the isometric view at half speed.',
    'Tech: my-3D2dge v0.85.2 handoff engine (the full engine; its Mode 7 and arcade modules in use), with small changes (a bat weapon, mitts, four baseball hats, the PS face-button glyphs in the font, PlayStation symbols by default). Plain JavaScript, no libraries, bundled into one HTML file by a Node build script. AI Hub Session client 1.4.0. Tests: Node 24 (vm, headless engine) and Playwright 1.63.0 with Chromium.',
    'Art Direction: The engine\'s native look: HD Humanoid rigs drawn as pixel art at res ps1 with expand, textured TileMap ballparks with baked mowing patterns, lit night games, particles. 40 new shape assets (bases, foul poles, light towers, scoreboards, the silo, a lighthouse, lava vents, habitats, tombstones, drones, the MEGA-TRON) and code-drawn sprites (the ball, reticles, glyph icons, the Batzooka).',
    'Animation: The engine\'s procedural rig system: new attack specs and poses for the contact and power swings, bunt, windup and pitch, throws, tags, dives, slides, wall climbs, umpire calls, celebrations and Rhubarb combos; a two-handed bat grip by IK. No motion-capture clips (the procedural fallback was used for every motion).',
    'Audio: All in code with the engine\'s chip synth: 20 original songs and stings in the engine\'s notation (ballpark organ, surf rock, synthwave), about 60 sound effects, and Animalese-style babble voices for 15 characters (one syllable a letter, per-voice wave, pitch and rate). No audio files.',
    'Online: AI Hub Session Protocol v1, ghost mode, 1-4 players: an online Derby round on a shared pitch sequence with ghost batters and home-run comets; client 1.4.0 pasted unmodified.',
    'Testing: Allowed: headless tools and scripts that play the game and read its state (game.advance, game.debug), a scripted playthrough, screenshots only for the look, no subagents or workflows to review. Used: one command (node tests/run.mjs) with about 160 checks: headless suites, seeded CPU-vs-CPU balance sims, the whole-game playthrough, browser checks (the engine\'s check tool, drawn games in every park, the attract reel) and the AI Hub harness.',
    'Research: Read the engine handoff (README, API card, index lookups, asset card, mode7, arcade and Humanoid source) and the AI Hub protocol README and harness. No web research beyond those sources.',
    'Environment: Claude Code CLI (headless); Linux; browser unknown',
    'Model: Anthropic, claude-opus-5-5, reasoning effort xhigh',
    'Usage: session time about 2 hours (06:00 to about 08:00); API cost and token counts unknown'
  ],
  testing: [
    'How many issues did testing catch? About 30 during the build: headless sims, scenario tests, the playthrough, browser checks and screenshots each found some.',
    'How many would be considered critical issues / game breaking? 9: CPU batters swinging at the human\'s reticle (no offense), a SUDDEN BOOM tie loop that never ended, a crash on a strikeout before any play, throws that sailed past their receiver into stuck plays, two engine patches that broke the engine\'s parsing or flow, a syntax error in the Derby, a name clash that crashed the title, and a scene reading the renderer in update.',
    'What was the most helpful test you ran? The seeded CPU-vs-CPU nine-inning sims with an event tally (runs, AVG, K%, HR%, errors, timeouts): they found the reticle bug, the stuck plays and the missing doubles, and steered every balance change.',
    'What was the least helpful test you ran? The check tool cycling the engine\'s stock views (iso, top-down, side) on a game that uses its own Broadcast and Mode 7 cameras: those frames say little about this game.'
  ],
  engine: [
    'What did you like most about the engine? Exact fixed steps that run headless: whole nine-inning games simulate in Node in a second, with the same code that draws in the browser, and Mode 7 gave the Plate Cam almost for free.',
    'Did you get stuck or guess wrong? Yes: a TileMap floor re-bakes at every new zoom, so a smoothly zooming camera stalled until zoom went to four steps; Mode 7 draws no TileMap walls, so the fence and stands needed billboards; E.store does not persist in Node; pressed() is only true inside a step.',
    'What was the most important thing you had to build yourself? The baseball simulation: the parametric pitch flight, the timing-and-aim contact model, batted-ball physics with the fence, poles and fair or foul, and fielders and runners with forces, tags, tag-ups, cutoffs and the third-out rule.',
    'What was the hardest part about using the engine? Keeping one look across two cameras: the Mode 7 Plate Cam and the TileMap Broadcast Cam needed separate builds of the same fence, stands, crowd and props.',
    'What did you change in the engine, and why? A bat weapon, fielders\' and catchers\' mitts, four hats (batting helmet, catcher\'s mask, space visor, top hat), the PlayStation symbols and a few marks in the font, and PlayStation as the default button symbols with an Xbox option. All for baseball and the controller-first prompts.',
    'If you could change one thing about the engine, what would it be? Cache the baked floor independently of zoom (or re-scale one bake), and let Mode 7 draw a TileMap\'s walls, so one level serves both cameras.'
  ],
  prompt: [
    'What did you like most about this prompt? A complete, decided plan beside a short contract: the plan settled every design question, and TASK.md said exactly what done means.',
    'What was confusing? PLAN.md names its files and folder with another run\'s id (max-20261103-174819); TASK.md\'s names win, but every path in the plan had to be translated. Usage asks for cost and tokens that a session cannot see.',
    'What was the hardest thing to do? Breadth at quality: a full baseball simulation balanced by sims, plus a Tour, eight lessons, a Derby, the attract reel, dev mode, four local players and the AI Hub round, all in one build.',
    'What would you change in this prompt? Resolve the plan\'s names to this run before handing it over, and let the plan rank its features so a build can go deep on the core first and add the rest in order.'
  ]
};
BZ.ABOUT_PAGES = () => [
  { title: 'ABOUT', logo: true, lines: ['An original over-the-top arcade baseball game. Pitch fireballs, swing a rocket-powered bat, rob homers off the wall, empty the benches in slapstick dust clouds, and save Kernel Field on a barnstorming tour.', 'Version ' + BZ.version + '  ·  engine ' + (E.versionLabel ? E.versionLabel() : E.version), 'Controls: stick/WASD/mouse aim · ✕/Space/click swing · □/J/right-click power · △/I bunt · R1/E Batzooka · Options/Esc pause.', 'Modes: Tour, Exhibition (1-4 players), Batzooka Derby, Spring Training. Online: AI Hub Derby rounds.'] },
  { title: 'SOURCE INFORMATION', lines: BZ.INFO.source },
  { title: 'TESTING FEEDBACK', lines: BZ.INFO.testing },
  { title: 'ENGINE FEEDBACK', lines: BZ.INFO.engine },
  { title: 'PROMPT FEEDBACK', lines: BZ.INFO.prompt },
  { title: 'CREDITS', lines: ['Design, code, art, music and writing: Claude (Anthropic, claude-opus-5-5, reasoning effort xhigh), built from PLAN.md.', 'Engine: my-3D2dge v0.85.2 (MIT License), github.com/michaelcrosato/my-3d2dge.', 'Online: AI Hub Session client 1.4.0 (michaelcrosato/ai-hub).', 'Motion: procedural (the engine\'s rig system). Asset sets: none beyond the engine\'s core library.', 'All teams, players, parks and lines are original. No real players, teams or quotes.', 'Thanks for playing!'] }
];
BZ.CREDITS = () => ['BATZOOKA BASEBALL', '', 'THE KABOOM CUP IS HOME', '', 'DESIGN, CODE, ART, MUSIC, WRITING', 'Claude (Anthropic, claude-opus-5-5, xhigh)', '', 'ENGINE', 'my-3D2dge v0.85.2 (MIT)', '', 'ONLINE', 'AI Hub Session client 1.4.0', '', 'STARRING', 'Dot "Dynamite" Delgado', 'Grandpa Ike Kowalski', 'Pep and Pip Porter', 'Moose Magnusson', 'Sunny Sato', 'Rosa "Radar" Reyes', 'Lefty Luna', 'Hank "Hambone" Hollis', 'Kid Kernel', '', 'THE RIVALS', 'Captain Bettina Brine', 'Iggy "The Igniter" Blaze', 'Commander Cosmo Vega', 'Count Rattlebones', 'ENFORCER-9000', '', 'IN THE BOOTH', 'Hap Harrigan', 'Big Lou Bombeck', 'Gloria Vox', 'Umpire Barb Hammersmith', '', 'AND', 'Mortimer Megamax, as himself', 'Popcorn Pete, as the mascot', '', 'NO BASEBALLS WERE HARMED.', 'A FEW JUMBOTRONS WERE.', '', 'THANKS FOR PLAYING!'];
