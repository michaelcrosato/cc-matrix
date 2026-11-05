/* ============================================================================
 * 60-about: the About / Credits pages (the same text as the run's chat reply and exit-interview.json)
 * ========================================================================== */
const ABOUT = [
  { title: 'WIRE ME UP', rows: [
    ['', 'An original surveillance-stealth spiritual successor to The Wire (HBO, 2002-2008). Every character, place and line is new; the show\'s spirit is the source: cops who build cases with cameras and wiretaps, the corner as an economy, the law as a set of rules that cut both ways, and institutions that eat the work.'],
    ['Chapters', '1 The Corner: photograph the crew from the car or on foot without being made. 2 The Wire: decode the pages, flag and minimize calls. 3 The Board: pin the organization. 4 The Meet: the container yard at night, in the rain.'],
    ['Controls', 'Move WASD / left stick. Raise camera: right mouse, Q / L2. Photo: left click, Space / R2. Crouch C / Circle. Interact E / Cross. Hurry Shift / L3. Notebook Tab / Triangle. View V / R3. Pause Esc / Options.'],
    ['Two players', 'In the street chapters a second player joins as Det. Brandt: Start on a second pad, or 2 on the keyboard.'],
    ['AI Hub', 'In an AI Hub session the corner is a ghost round for up to four: the most evidence wins, and the other detectives show as ghosts.']
  ] },
  { title: 'SOURCE INFORMATION', rows: [
    ['Date', '2026-11-02 18:13'],
    ['Source', 'The Wire (HBO, 2002-2008), created by David Simon. Original story and characters, inspired by its tone.'],
    ['Genre', 'Stealth / investigation (surveillance stealth, a code-breaking and wiretap puzzle, a case-board puzzle)'],
    ['Perspective', 'Three-quarter top-down (the engine\'s threequarter view); V or R3 switches to top-down and isometric in the street chapters. Side view for the title.'],
    ['Tech', 'my-3D2dge v0.85.1 (full engine, one file, no dependencies; HTML5 canvas, Web Audio), AI Hub session client 1.3.0 (protocol 1). Plain JavaScript, bundled by a small Python script into one HTML file.'],
    ['Art direction', 'The engine\'s native look: PS1-resolution pixel art (320x240, expanded to fill the screen), HD Humanoid rigs dressed for West Baltimore, textured TileMap rowhouses, canvas lighting from street lamps and fire drums, rain at night.'],
    ['Animation', 'The engine\'s procedural skeletal rigs (E.Humanoid) driven from velocity and poses (crouch, kneel, point, hips), live dialog portraits, tweens and E.Mover movement.'],
    ['Audio', 'Code-written chip music (six original songs, layered stealth music that brings in drums when you are watched), code-written sound effects (shutter, pager, phone, tape), and Animalese-style gibberish voices pitched per character and per vowel.'],
    ['Online', 'AI Hub Session Protocol v1, ghost mode: each player runs the corner, sends their detective\'s position through the hub, sees the others as ghosts, reports progress and a score. No other network use.'],
    ['Testing', 'Headless Chromium (Playwright) screenshots and scripted key presses of every scene, state checks through a debug handle, the AI Hub harness (ghost, 2 players, auto), a small viewport check. Real iOS Safari was not available.'],
    ['Research', 'None online. Built from knowledge of the show (wiretap minimization, the "jump the 5" pager code, corner roles, COMSTAT pressure) and the engine\'s own docs.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
    ['Usage', 'unknown']
  ] },
  { title: 'TESTING FEEDBACK', rows: [
    ['Issues caught', '14: the camera not following during the first briefing, center lines drawn as yellow squares, unreadable heat badges, a missing middle-dot glyph, the case board overflowing a 240-pixel screen, the minimize prompt naming Escape (which pauses), a crash pinning a photo, fiends stuck behind buildings, the player car missing its body at the pier, the heat panel under the touch menu button, the wall clock over the room title, a syntax error from a bad text edit, and a second crash when the pin button was pressed on a full board, and the attract demo skipping the last chapter (both found by the final end-to-end runs).'],
    ['Critical', '3 were game breaking: the crash when pinning a photo (chapter 3 could not be finished), fiends stuck on buildings (the corner could stall), and the syntax error (a blank page).'],
    ['Most helpful', 'A full scripted playthrough of all four chapters on the bundled file, pressing through dialogs like a player and reading the game state at each step: it found the board crashes and the stuck fiends.'],
    ['Least helpful', 'Waiting in real time for timed events in the browser; reading the state handle told me the same thing faster.']
  ] },
  { title: 'ENGINE FEEDBACK', rows: [
    ['Liked most', 'Sight, suspicion and sight cones (E.sees, E.Suspicion, r.sightCone) work together out of the box, and dialogs with live portraits made the cast feel real for free.'],
    ['Stuck / guessed', 'I guessed that a Mover takes world directions from an intent object (it does) and that the font had PlayStation symbols (it does not: I drew the glyphs myself).'],
    ['Built myself', 'The camera lens and photo-evidence system: a reticle on the ground, framing and line-of-sight checks for each moment worth a picture, and the polaroids made from portraits.'],
    ['Hardest part', 'Finding which options exist on wall types and props (windows, doors, halos) without reading the source: the index is long and options are spread across three documents.'],
    ['Remove / overhaul', 'The many overlapping documents (card, index, guide, kit headers): one searchable reference with examples per option would be enough.'],
    ['Change one thing', 'Button glyphs for PlayStation and Xbox in the pixel font, so label() can be printed directly in prompts.']
  ] },
  { title: 'PROMPT FEEDBACK', rows: [
    ['Liked most', 'The freedom to choose the genre: The Wire is not an action show, and a surveillance game fits it far better than a shooter would.'],
    ['Confusing', 'The single-file name pattern [GameTitle-SOURCE-...] leaves the word separators open, and "multiplayer for the game on its own" can mean local or online play.'],
    ['Hardest', 'Fitting every requirement (attract mode, hub, controller-first UI, glyph families, touch notice, four chapters) into one session while keeping the tone right.'],
    ['One test', 'A real DualSense on a TV at ten feet, to judge prompt size and readability where it matters.']
  ] },
  { title: 'CREDITS', rows: [
    ['Design, code, writing', 'claude-opus-5-5 (Anthropic), in Claude Code'],
    ['Engine', 'my-3D2dge by Michael Crosato'],
    ['Online', 'AI Hub Session Protocol by Michael Crosato'],
    ['Inspired by', 'The Wire, created by David Simon (HBO). This is a fan-made spiritual successor with original characters; it is not affiliated with HBO.'],
    ['Thanks', 'To everybody who ever sat in a car for eleven hours waiting for one picture.']
  ] }
];
