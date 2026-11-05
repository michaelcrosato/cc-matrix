/* ---- ABOUT & CREDITS: Source Information and the three feedback lists (the same text as exit-interview.json) ---- */
G.ABOUT = {
  sourceInformation: {
    date: '2026-11-04 05:02:23',
    source: 'Brigandine: The Legend of Forsena (Hearty Robin / Atlus, PlayStation, 1998)',
    plan: 'PLAN.md',
    genre: 'Turn-based grand strategy with a tactical RPG battle layer (monster-binding knights, castle conquest, hex battles)',
    perspective: 'Campaign: three-quarter overhead world map; battles: tilted overhead hex board (custom 50-degree view, rotatable, isometric alternate); story: side-on stage scenes',
    tech: 'my-3D2dge engine v0.85.2 (2D canvas engine, full build with every module), plain JavaScript in one IIFE, AI Hub Session Protocol v1 client 1.4.0, Node 24 for build and headless tests; no other libraries',
    artDirection: "The engine's native PS1-style pixel look: HD Humanoid rigs, E.Blob monsters and a new procedural E.Beast rig for quadrupeds, drakes, birds and serpents; baked hex terrain textured per season; custom castle, keep, rampart, gear and clock-tower shapes; season palettes",
    animation: "The engine's skeletal Humanoid moves and poses (E.MOVES, E.Attack), E.Blob squash and stretch, and new procedural beast animation (gaits, bites, breath, tail sweeps, dives, roars), plus particles, lights and weather",
    audio: 'All code: step-sequencer songs around a Wheel motif (title, four season themes, attack and defence battle themes with a tension layer, the Hour theme, the boss, story and ending themes), stings, custom synthesized sound effects, and Animalese-style babble voices (formant-filtered tone bursts per vowel, noise per consonant) per character',
    online: 'AI Hub Session Protocol v1, shared-world mode for 2-4 players: "Banners of the Wheel", a host-authoritative free-for-all hex battle with snapshots, ordered events, troop deadlines and host-run AI for timed-out players; plus local hot-seat campaign and skirmish for 1-4 players',
    testing: 'Thirteen headless Node suites driven by game.advance and game.debug (data, rules, campaign and AI, story, UI flow, front end, settings behaviour, screen density, per-requirement TASK checks, battles commanded through input taps, hub protocol against a fake hub, autoplay playthroughs per realm, about), seven browser checks, behind one command (node tests/run.mjs); a few headless-Chromium screenshots and the hub harness for what scripts cannot check',
    research: 'None during the build beyond the plan; the plan (PLAN.md) records its own research: the Wikipedia article on Brigandine and the RPGFan review, plus the my-3D2dge handoff docs and the AI Hub README',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
    usage: 'Session time from the system clock: 1 h 45 min (2026-11-04 05:02:23 to 06:48:01 at final verification); API cost and token counts unknown (not visible to the model)'
  },
  testingFeedback: [
    '25 issues, each fixed: the campaign AI never marched, the Dominion snowballed, autoplay never pushed for Meridian, the Sanctum was unwinnable at realistic levels, EXP was far too slow, beaten brigand captains lingered, a duplicate top-level name broke the bundle, a story event crashed without its flag, the tutorial battle was queued after the Muster, dev tools read the scene definition instead of the live scene, Owain joined at once for realms that start with a drake, dev mode could not open during a battle dialog, the hub client sent no traffic, deep links were dropped, unsupported font glyphs showed as ?, the Sanctum deep link fielded the wrong sides, the Summon prompt mangled its cost, the Gray Knight looked like a red-haired man, the battle and map cameras chased the mouse, and two test-script mistakes of my own.',
    '8 were critical or game breaking: the duplicate name (the game would not load), the AI that never marched (a static, unwinnable war), the unwinnable Sanctum, the war being unwinnable without a stat boost, the Dominion fighting its own Gray Knight (which could end the game with a false loss), the tutorial queued after the Muster, the silent hub client (the hub check failed) and the camera chasing the mouse (mouse play unusable).',
    'The scripted autoplay campaign (every realm on autoplay through the real scenes to an ending): it exposed the AI, balance and flow problems that no unit test would have found, and it is now the playthrough suite.',
    "An isolated E.Dialog test run outside the game loop: it could not see presses and only showed my harness was wrong; the in-game event run answered the question at once."
  ],
  engineFeedback: [
    'Headless determinism: game.advance with exact fixed steps plus game.debug made whole playthroughs, the attract reel and the hub protocol testable in Node in seconds, and the HD Humanoid rigs, standard pause menu, settings and save slots came for free.',
    "Yes: scenes are wrapped, so the object in game.scenes is not the live scene (my dev tools read stale state); game.after timers set before the first scene are cleared, so deep links built that way vanished; the 5x7 font lacks common glyphs such as the middle dot, diamond and triangles, which render as question marks; and following the cursor with the camera while the mouse hovers makes the board slide under the pointer.",
    'The hex battlefield (a TileMap whose floorTex bakes hexes per terrain and season, hex picking through mouseGround, cursor steps by screen direction, hex decals) and the new E.Beast rig for quadrupeds, drakes, birds and serpents.',
    'Fitting a hex tactics game onto a square-tile renderer: picking, screen-direction stepping, decals in hex shapes and baked hex edges all had to be built on top, and getting the camera, picking and hover to agree took several tries.',
    "One change: E.Dialog accepts a per-letter voice function, so Animalese babble can follow the typed text (logged in ENGINE-CHANGES.md); the new engine-ext/beasts.js module adds E.Beast and E.Wings without touching the core.",
    'First-class hex maps: a hex TileMap floor with built-in picking, hex decals and screen-direction stepping (and a documented glyph list for the font, with a visible fallback instead of a question mark).'
  ],
  promptFeedback: [
    'The precise deliverables (file names, the exit-interview shape, the four feedback sections) and the freedom to change the engine, together with clear testing rules: one command, failures only, headless first.',
    'The plan was written for another run (max effort, a different date and folder names) and its scope assumed far more time; it was not clear how much of its content counts toward "every feature in TASK.md". "Follow ai-hub for multiplayer integration into ai-hub as well as for the game on its own" was also ambiguous about what the standalone multiplayer should be.',
    'Scope and balance: a grand-strategy campaign with a tactical hex battle layer, 30 species, about 50 story events, attract mode, dev mode, hot-seat and an online mode in one session, then tuning the campaign AI so the war actually moves and stays winnable.',
    'Say which plan items are required and which are stretch, give a time or scope budget, and make the plan template take the run-specific names as variables (effort, date, folder) so they never disagree with TASK.md.'
  ]
};
G.ABOUT_PAGES = () => {
  const S = G.ABOUT.sourceInformation, L = (t, list) => ({ title: t, rows: list.map((v, i) => [String(i + 1) + '.', v]) });
  return [
    { title: 'BRIGANTIME', rows: [['', 'The Legend of Forseasons'], ['', 'Four seasons. Four crowns. One stopped clock.'], ['Version', G.VERSION + ' • build ' + G.BUILD + (E.versionLabel ? ' • engine ' + E.versionLabel() : '')], ['', 'Inspired by Brigandine: The Legend of Forsena. The world, characters, music and art are original.']] },
    { title: 'SOURCE INFORMATION', rows: [['Date', S.date], ['Source', S.source], ['Plan', S.plan], ['Genre and Perspective', S.genre + '. ' + S.perspective], ['Tech', S.tech], ['Art Direction', S.artDirection], ['Animation', S.animation], ['Audio', S.audio], ['Online', S.online], ['Testing', S.testing], ['Research', S.research], ['Environment', S.environment], ['Model', S.model], ['Usage', S.usage]] },
    L('TESTING FEEDBACK', G.ABOUT.testingFeedback), L('ENGINE FEEDBACK', G.ABOUT.engineFeedback), L('PROMPT FEEDBACK', G.ABOUT.promptFeedback),
    { title: 'CREDITS', rows: [['Engine', 'my-3D2dge (MIT) by Michael Crosato'], ['Online', 'AI Hub Session Protocol v1, client 1.4.0'], ['Assets', 'Everything is drawn and synthesized in code; the engine core library supplies generic props (CC0 lineage as catalogued)'], ['Game', 'Designed from PLAN.md and built by Claude (claude-opus-5-5)'], ['Thanks', 'To the chroniclers of the Brigantime']] }];
};
G.CREDITS = () => ['BRIGANTIME', 'The Legend of Forseasons', '', 'A game built by Claude', 'from a plan written by Claude', '', 'ENGINE', 'my-3D2dge by Michael Crosato', '', 'ONLINE', 'AI Hub Session Protocol v1', '', 'MUSIC, SOUND AND VOICES', 'Synthesized in code', '', 'INSPIRED BY', 'Brigandine: The Legend of Forsena', 'The world, characters, music and art are original.', '', 'The Wheel turns.', '', 'Thank you for playing.'];
