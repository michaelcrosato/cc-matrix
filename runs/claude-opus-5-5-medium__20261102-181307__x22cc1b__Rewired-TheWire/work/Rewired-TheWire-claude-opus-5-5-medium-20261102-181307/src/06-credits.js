// ============================================================================================================
// REWIRED • 06 credits: the About / Credits pages (Source Information and the three feedback sections).
// The same text is in the chat reply and in exit-interview.json.
// ============================================================================================================
const CREDITS = [
  { title: 'ABOUT REWIRED', rows: [
    ['', 'REWIRED is an original spiritual successor to The Wire (HBO, 2002-2008). Every character, street address, line of dialog, song and code in it is new. The corner, the paper, the wire and the brass are the show\'s territory; the people are our own.'],
    ['How it plays', 'Surveillance and stealth on a West Baltimore block, in five tapes: a cold open, the corner (blend in, photograph hand-to-hands, tail a runner), the case board (pin evidence to names until a judge signs), the wire room (minimize, spot-check, tag pertinent lines, decode mirrored pages), the re-up (stakeout, raid, foot chase, a search in the dark) and the stat (the brass decide what the case was for).'],
    ['Also', 'A Surveillance Shift for one or two players on one screen, an AI Hub ghost round for up to four, an attract mode after ten seconds on the title, three views (three-quarter, isometric, top-down), controller-first menus with PlayStation or Xbox symbols, and stick inversion toggles in Settings.'] ] },
  { title: 'SOURCE INFORMATION', rows: [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'The Wire (HBO, 2002-2008), created by David Simon. Kept as gritty and real as the show.'],
    ['Genre and Perspective', 'Surveillance / stealth investigation with a case-board puzzle, a wiretap listening game and a foot chase. Main perspective: the engine\'s three-quarter view (pitch 55); the player can switch to isometric or top-down at any time.'],
    ['Tech', 'my-3D2dge v0.85.1 (full engine edition, one file, no dependencies) for rendering, input, audio, scenes, lighting, weather and the standard menus; AI Hub Session Protocol v1 client 1.3.0 (session.js) for online rounds; plain JavaScript, bundled into one HTML file by a small Node script.'],
    ['Art Direction', 'The engine\'s native look: 320x240 base pixels expanded to any screen, HD Humanoid rigs, TileMap rowhouses with per-pixel painted faces (brick, formstone, boarded vacants with graffiti, a corner store marquee), objects as data (cars, dumpster, couch, payphone, desks, reel decks), canvas lighting with street lamps, rain at night.'],
    ['Animation', 'The engine\'s procedural Humanoid rigs driven by velocity and poses (walk, sprint, crouch, kneel, cast, hips, wave, down), the Mover for the player (sprint, sneak, vault), tweened transitions; no frame lists.'],
    ['Audio', 'Code-written music on the engine\'s chip synth (a slow blues title, a boom-bap corner loop, a night loop, a tense wire-room loop, a chase, an office theme and an ending). Code-written sound effects (shutter, whistle, pager, ram, siren, cuffs). Gibberish Simlish-style voices: every speaker has a pitch and timbre, blipped syllable by syllable as their text types, on the street and on the wire.'],
    ['Online', 'AI Hub Session Protocol v1 in ghost mode: each player runs their own seeded surveillance shift; the other detectives\' positions are sent about eight times a second and drawn as ghosts with their names and scores; progress and a score result go to the hub. No other network use. Local 1-2 player drop-in on one machine outside the hub.'],
    ['Testing', 'Headless Node tests of every system through the engine\'s fixed-step clock and game.debug; Playwright runs in Chromium, Firefox and WebKit; viewport-matrix screenshots on phones, tablets and desktops; the AI Hub harness (players=2 and players=4 with latency, jitter, loss and host-leave); a scripted full playthrough of all five tapes.'],
    ['Research', 'None beyond the engine and hub documentation; the show\'s details come from memory.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown'] ] },
  { title: 'TESTING FEEDBACK', rows: [
    ['How many issues did testing catch?', '28 issues, found by the headless playthrough and system tests, the browser screenshots in Chromium, Firefox and WebKit, and the viewport matrix. The AI Hub harness passed on its first run.'],
    ['How many were critical / game breaking?', '5: a boot step that crashed the start, a runner whose stash spot was inside a wall (the corner stalled forever), a dialog carried into the next scene that froze it, the shift mode triggering story events, and a sale timer from the tail that left later sessions with no sales at all.'],
    ['Most helpful test', 'The scripted headless playthrough of all five tapes: it drives the real scenes through game.advance and game.debug and found every soft-lock in the story chain.'],
    ['Least helpful test', 'The viewport matrix: 24 of 24 clean on its first run, since the engine\'s expand mode already fits every screen; it only caught a toast overlapping the objective on narrow screens.'] ] },
  { title: 'ENGINE FEEDBACK', rows: [
    ['What I liked most', 'Everything a game needs but nobody wants to write is already there: the pause menu, rebinding, glyphs per device, settings that save, fixed-step determinism, and a headless mode where the same game runs in Node.'],
    ['Did I get stuck or guess wrong?', 'A few guesses: whether an intent object to Mover.update is in ground or screen directions (ground), what a face painter returns for the base colour (null), that objects as data are written facing south (my cars came out sideways first), and that TileMap.bounds needs a view object, not a name.'],
    ['Most important thing I built myself', 'The surveillance layer: a camera viewfinder in world space that works with mouse, stick and keys, the sale cycle the photos read, and the lookouts\' suspicion with blending.'],
    ['Hardest part', 'Reading a 1.2 MB engine through its index without being able to see its pixels quickly; the per-pixel wall painter has a large signature to learn.'],
    ['Remove or overhaul one thing', 'The single-letter-heavy option bags on draw calls: a typed options object per call would catch typos the engine now ignores.'],
    ['Change one thing', 'Ship PlayStation / Xbox button glyphs as font glyphs so prompts drawn with E.font show ✕ ○ □ △ without custom drawing.'] ] },
  { title: 'PROMPT FEEDBACK', rows: [
    ['What I liked most', 'It is specific about the player\'s experience (10-foot UI, glyphs following the last device, attract mode, the touch-only notice) and leaves genre and design open.'],
    ['What was confusing', '"Follow the hub for multiplayer integration as well as for the game on its own" can be read as hub-only or as hub plus local multiplayer; I did both.'],
    ['Hardest thing', 'Fitting the show\'s slow, procedural texture (paper, waiting, minimization) into mechanics that are still fun to play in a short demo.'],
    ['One test I wish I could run', 'A real DualSense on a real TV at ten feet, to judge text size and glyph readability with human eyes.'] ] },
  { title: 'CREDITS', rows: [
    ['Design, code, writing, music', 'Claude (Anthropic, claude-opus-5-5) in Claude Code'],
    ['Engine', 'my-3D2dge by Michael Crosato, v0.85.1'],
    ['Online', 'AI Hub Session Protocol v1 by Michael Crosato'],
    ['Inspired by', 'The Wire, created by David Simon for HBO. This is an homage; no characters, dialog or music from the show are used.'],
    ['Thanks', 'To every corner, every desk and every basement that ever kept a board.'] ] }
];
