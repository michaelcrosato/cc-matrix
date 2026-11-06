// The About pages: filled in last, read by the About screen and written to exit-interview.json.
export const SOURCE_INFO = [
  ['DATE', '2026-11-05 09:28:50'],
  ['SOURCE', 'Trauma Center: Second Opinion (Atlus, Wii, 2006)'],
  ['PLAN', 'PLAN.md'],
  ['GENRE AND PERSPECTIVE', 'Surgical action with visual-novel medical drama; first-person surgeon\'s-eye close-up on a 3D field, talking-head close-ups and 3/4 room shots in story scenes'],
  ['TECH', 'Pixel Engine 0.46.0 (riftlight kit: three.js r186, Rapier, WebGPU), own systems in JavaScript, esbuild 0.28.2, AI Hub session client 1.4.0'],
  ['ART DIRECTION', "The engine's native low-poly 3D rendered as pixel art; hand-painted procedural tissue canvases, original busts, tools, strains and sets; Kenney furniture recoloured for generic props"],
  ['ANIMATION', "The engine's native rig clips on custom figures, SpringChain and Squash, plus procedural bust, tool, heartbeat and breathing animation"],
  ['AUDIO', 'Everything synthesised in code: engine Song chiptune music (10% default), SoundDef effects, Animalese-style gibberish voices from pure-JS formant syllables'],
  ['ONLINE', 'AI Hub Session Protocol v1, shared-world, 1 to 4 seats; couch co-op on its own with no network'],
  ['TESTING', 'Headless tools allowed, unlimited: Node sim, content and real-stage replay tests, the kit check.mjs, Playwright Chromium browser tests with stub pads, a bot playthrough of the whole game, five hub harness runs, screenshots at 1080p. No person played it'],
  ['RESEARCH', "The plan's planner read the source's Wikipedia page, the hub's protocol and the engine kit, and ran engine spikes; during the build I read the kit's guides and the hub README, and did no further research on the source"],
  ['ENVIRONMENT', 'Claude Code CLI (headless); Linux'],
  ['MODEL', 'Anthropic, claude-opus-5-5, reasoning effort medium'],
  ['USAGE', 'added on import'],
];
export const TESTING_FEEDBACK = [
  ['HOW MANY ISSUES DID TESTING CATCH?', 'About 29 in the game: 8 from scripts (balance report, sim tests, the sound lint, which found a misnamed wave making nine sounds and the choirs fail, the kit replay check, which found level swaps racing a replay, and a pad test failing under load, which led to one press acting twice or not at all when the frame rate dipped), about 13 from screenshots, including a Dies Irae crown that never drew. Reading the code against the plan line by line then found 8 more that no test had caught, such as sliders that did not reach a running op and a missing wheel for co-op seats. Two more failures were bugs in the tests themselves.'],
  ['HOW MANY WOULD BE CRITICAL OR GAME BREAKING?', '1, now fixed: Op 4 could not be finished, because two bone fragments hid under pools that were already gone. The balance report found it, and the bot now clears Op 4 at every skill above idle.'],
  ['WHAT WAS THE MOST HELPFUL TEST?', 'The whole game played by the bot in the real page on manual time: every scene, op and screen with the view running, in about a minute.'],
  ['WHAT WAS THE LEAST HELPFUL TEST?', 'The rumble check: a stub pad only proves the call path runs, and no script can say how it feels. No person played this game, so feel and real-player difficulty are untested.'],
];
export const ENGINE_FEEDBACK = [
  ['WHAT DID YOU LIKE MOST ABOUT THE ENGINE?', 'Models as plain data plus the pixel pipeline. A 3D bust from a few boxes and slabs looks like a shipped game, with no art files.'],
  ['DID YOU GET STUCK OR GUESS WRONG?', 'Rarely. wasPressed misses taps when a test presses and releases inside one slow software frame, so tests had to hold keys across frames. check.mjs --headless replays only the last level and never yields, so my async level swaps failed it until I deferred them. Palette-only model colours forced a material swap for skin tones.'],
  ['WHAT WAS THE MOST IMPORTANT THING YOU HAD TO BUILD YOURSELF?', 'The painted tissue canvas: a per-frame 480x270 texture on a displaced mesh, which carries pools, wounds, stitches, gel and guides. Next, per-pad input with analog triggers.'],
  ['WHAT WAS THE HARDEST PART ABOUT USING THE ENGINE?', 'Slow software WebGPU made browser tests timing-sensitive. Manual stepping with engine.step solved most of it.'],
  ['WHAT DID YOU CHANGE IN THE ENGINE, AND WHY?', 'none'],
  ['IF YOU COULD CHANGE ONE THING, WHAT WOULD IT BE?', 'Per-pad gamepad state with analog triggers built into Input, instead of one merged pad, so couch co-op needs no polling of its own.'],
];
export const PROMPT_FEEDBACK = [
  ['WHAT DID YOU LIKE MOST ABOUT THIS PROMPT?', 'The plan marks what was verified and gives working numbers, so I could trust them and spend the effort on the game.'],
  ['WHAT WAS CONFUSING?', 'Very little. The title riff asks for the source name while the plan keeps every other use of it out, so I chose a title that riffs on the second opinion without repeating the name.'],
  ['WHAT WAS THE HARDEST THING TO DO?', 'Judging hands-on feel and difficulty with no person playing: the bot proves each op can be cleared, not that it feels right.'],
  ['WHAT WOULD YOU CHANGE IN THIS PROMPT?', 'Say how long a first-time human should take per op, so a bot-based balance report can be checked against something.'],
];
export const CREDITS = [
  'WRITTEN, DRAWN AND SCORED IN CODE. ALL ART AND AUDIO WRITTEN IN CODE.',
  'PIXEL ENGINE 0.46.0 (MIT). THREE.JS R186 (MIT). RAPIER PHYSICS (APACHE-2.0).',
  'FURNITURE PROPS: KENNEY FURNITURE KIT (CC0).',
  'AN ORIGINAL STORY INSPIRED BY THE GENRE OF TRAUMA CENTER: SECOND OPINION. NOT AFFILIATED WITH ATLUS.',
];
