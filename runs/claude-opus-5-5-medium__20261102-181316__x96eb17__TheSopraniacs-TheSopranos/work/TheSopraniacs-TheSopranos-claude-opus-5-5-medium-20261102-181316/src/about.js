window.SOP_ABOUT = [
 {
  "title": "SOURCE INFO",
  "lines": [
   "# Date",
   "2026-11-02 18:13",
   "# Source",
   "The Sopranos (HBO, 1999-2007), created by David Chase",
   "# Genre",
   "Action-adventure crime brawler in a small open town: story chapters, melee combos, a pistol, driving, dialogue choices, a stress/panic meter and FBI heat (light stealth)",
   "# Perspective",
   "Three-quarter top-down (the engine's native threequarter view); the player can switch to isometric or top-down at any time (V / R3)",
   "# Tech",
   "my-3D2dge v0.85.1 (full engine, handoff package, single file); AI Hub session client 1.3.0 (Session Protocol v1); vanilla JavaScript, HTML5 canvas 2D, Web Audio; modules bundled into one HTML file with Node 24; tested with Playwright 1.63",
   "# Art direction",
   "Engine-native code-drawn pixel art at PS1 resolution (320x240, expanded to fill any screen): HD Humanoid rigs dressed per character, textured TileMap walls and floors, library props and shapes, canvas lighting, rain, neon signs; plus custom turned-box cars and furniture drawn in every view",
   "# Animation",
   "Engine-native skeletal Humanoid rigs posed from velocity every step, E.MOVES attacks (jab, cross, hook, uppercut, haymaker, plunge stomp, roundhouse, bash, elbow), knock-downs and get-ups, Blob ducks and a pig, scripted cutscenes (game.script), tweens and particles",
   "# Audio",
   "Code-written chip music (11 original tracker songs, including 3 jukebox songs the player picks), synthesized sound effects (punches, gunshots, horn, quacks, diner bell, cash), and Animalese-style gibberish voices with a pitch and timbre per character",
   "# Online",
   "AI Hub Session Protocol v1, ghost mode, 1-4 players: a timed Collection Run on every copy with the other players shown as translucent ghosts, progress and result reporting. On its own: local 2-player drop-in co-op (player 2 is Chrissy), no network",
   "# Testing",
   "Headless Node test of the whole story and the Collection Run (fixed-step game.advance, scripted input; all checks pass); Playwright screenshots in Chromium 1280x720 and WebKit iPhone 15 (touch-only screen, attract mode); viewport-matrix on 23 phone, tablet and desktop viewports in Chromium, WebKit and Firefox (all clean); a feature check with an emulated DualSense (stick movement, both invert toggles, PlayStation and Xbox prompts drawn on screen, prompts switching to keys and mouse buttons, the stomp); mouse hover focusing a door over the nearer SUV prompt, and a click entering it; touch-only notice and attract mode on Chromium (Pixel 7) and WebKit (iPhone 15) profiles, with a tap returning to the title; ghosts visible on screen on every copy in a live hub round (all pass); AI Hub harness with 2 players, 4 players at 150 ms latency, 50 ms jitter and 5% loss, and host-leave (all PASS). No real gamepad, TV or iOS Safari",
   "# Research",
   "None on the web. I read the engine's handoff docs (README, API card, parts of the index, the template and the brawler kit) and the AI Hub protocol README; the show's details come from memory",
   "# Environment",
   "Claude Code CLI (headless); Linux; browser unknown",
   "# Model",
   "Anthropic, claude-opus-5-5, reasoning effort medium",
   "# Usage",
   "Cost and token totals are unknown: this session has no usage meter. Session time was about 50 minutes (18:13 to about 19:07)"
  ]
 },
 {
  "title": "TESTING",
  "lines": [
   "# How many issues did testing catch?",
   "16 issues. The title screen crashed when the town updated without a hero. Fight waves never advanced because their timer was never counted down. The diner's booth step was never set. A pending fight was dropped on a scene change. Attract mode left the camera in the isometric view. The finale's state leaked into the Collection Run and cut it to black. Tony could not get out of the SUV while it reversed. The touch-only screen never showed, because the engine starts with the keyboard as the last device. The notice box overflowed on narrow phones. Talk prompts showed during fights. The job log text overlapped its Close prompt. The attract mode's title covered the HUD. The SUV prompt radius was too small. A gamepad's right-stick aim was used as a world direction without converting it from screen space. Hovering the mouse never counted as using the mouse, because the engine only switches to the mouse on a click, so hover focus and mouse-button prompts didn't work until a click. The mouse could only pick things within 40 units, too short to click things in the world, so it now reaches 64.",
   "# How many were critical / game breaking?",
   "4 were critical or game-breaking. The title crash broke attract mode. The fight waves never advancing blocked chapter 4. The missing booth step blocked the finale. The finale leaking into the Collection Run ended runs early.",
   "# Most helpful test",
   "The headless Node test (test.mjs). It plays the whole story through game.debug: the paper, ducks, the car, therapy, breathing, the pork store, three collections, the alley fight, Ma, the yard waves, Ralphie, the diner, the cut to black, then the Collection Run. It caught every blocking bug in seconds.",
   "# Least helpful test",
   "Setting the stress straight to 100 for a panic screenshot. That skips addStress(), so no panic attack ever started and the picture only showed the RAGE bar."
  ]
 },
 {
  "title": "ENGINE",
  "lines": [
   "# What I liked most",
   "The standard features came for free: pause, settings, rebinding, controller symbols, save slots, full screen and the boot screen. On top of that, the Humanoid rigs with E.MOVES and the exact fixed-step headless mode made the story testable in Node.",
   "# Did I get stuck or guess wrong?",
   "Yes. I assumed the 5x7 font had check marks, middle dots and a down triangle; it doesn't. I assumed input.lastDevice would tell me a touch-only device; it starts as 'keyboard' and only switches to the mouse on a click. I assumed a script could wait on a promise; it can't (I switched to E.until). I didn't expect braking in E.Car to turn into reversing, or game.after timers to be cleared by a scene change.",
   "# Most important thing I built myself",
   "A turned-box renderer (obox) that draws cars, the FBI van, the garbage truck, booths, counters and the jukebox correctly in every view. Close behind: the controller prompt badges (PlayStation shapes, Xbox letters, key caps, mouse buttons), because the pixel font has no button symbols.",
   "# Hardest part of using the engine",
   "The amount of documentation: one card to read whole and a 190 KB index. It was hard to know which props and library shapes exist, and what each option accepts, without grepping the engine's source.",
   "# One thing to remove or overhaul",
   "Dialog voices. One sound-effect name per box can't do per-speaker gibberish, so I turned the engine's voice off and wrote my own syllable blips with a pitch and timbre per speaker.",
   "# One thing to change",
   "Built-in canvas prompt glyphs: input.glyph(action) drawing PlayStation, Xbox, keyboard and mouse badges, plus a real 'has keyboard, mouse or pad' capability flag, so a touch-only check is one line."
  ]
 },
 {
  "title": "PROMPT",
  "lines": [
   "# What I liked most",
   "It names the systems it wants as a checklist (attract mode, 10-foot UI, glyph switching, inverted-axis toggles, touch-only screen, hub multiplayer) and leaves the creative design open. The exit interview makes the result easy to audit.",
   "# What was confusing",
   "'Follow the hub for multiplayer integration into ai-hub as well as for the game on its own' was unclear: on its own, should the game be online, or is local co-op enough? I chose local co-op. The file name pattern doesn't say how to write a title with spaces or punctuation (I used TheSopraniacs-TheSopranos).",
   "# The hardest thing to do",
   "Scope. A feature-complete vertical slice with five story chapters, combat, driving, a heat and stealth system, a stress and panic system, saves, an attract mode and a hub ghost mode in one session. Also, writing dialogue that sounds like the show without copying it.",
   "# The one test I would have run",
   "A real DualSense on a TV at 10 feet, including a controller that reports its axes inverted. It would check the glyphs, the readability and the invert toggles on hardware rather than in emulation. Real iOS Safari would come second."
  ]
 },
 {
  "title": "CREDITS",
  "lines": [
   "# The Sopraniacs",
   "An original spiritual successor to The Sopranos (1999-2007). A parody and homage; not affiliated with HBO or the show.",
   "# Made by",
   "Claude (Anthropic, claude-opus-5-5) in Claude Code, on the my-3D2dge engine by Michael Crosato.",
   "# Controls (controller / keyboard and mouse)",
   "Move: left stick / WASD. Punch: Square / J / left click. Haymaker or stomp: Triangle / K. Roll: Circle / Space. Pistol: R2 / L / right click (aim: right stick / mouse). Use, talk, car: Cross / E. Breathe: hold L2 / Q. Sprint: L1 / Shift. Car: R2 / W gas, L2 / S brake, R1 / H horn. Camera view: R3 / V. Job log: Create / Tab. Pause: Options / Esc.",
   "# Player 2",
   "Press Start on a second controller (or 2 on the keyboard) to drop in as Chrissy.",
   "# Settings",
   "Settings > Controller: button symbols (PlayStation or Xbox), invert controller horizontal, invert controller vertical. Game: difficulty, hints, text speed, gibberish voices.",
   "# Music",
   "Original code-written songs: Jersey Shuffle (title), Doo-Wop Neighborhood, Yard Fight, The Fifty-Minute Hour, Bada Boom, Kearny Streetlights, Turnpike Exit 16W, Onion Ring Serenade."
  ]
 }
];
