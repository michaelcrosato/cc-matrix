/* 08-data-about: the About/Credits pages (one topic a page) and the SECRETS page unlocked by finishing the Tour. The same
 * Source Information, Testing, Engine and Prompt Feedback are in the build's final report and exit-interview.json. */
const ABOUT_PAGES = [
  ['CREDITS', [
    'BASHKETBALL: an original over-the-top arcade basketball game. No fouls. No mercy. All BLAM.',
    'GAME, CODE, ART, ANIMATION, MUSIC, SOUND AND VOICES: built by Claude (Anthropic, model claude-opus-5-5, reasoning effort xhigh) in Claude Code, from the build plan PLAN.md (written by claude-opus-5-5 at max effort).',
    'ENGINE: my-3D2dge v0.85.2 by Michael Crosato (MIT License), github.com/michaelcrosato/my-3d2dge, with the changes listed on the ENGINE CHANGES page.',
    'ONLINE: AI Hub Session Protocol v1, session client 1.4.0, github.com/michaelcrosato/ai-hub.',
    'EVERY SOUND, SONG AND VOICE IS MADE IN CODE: chip-synth songs and stings, synthesized effects, and Animalese-style gibberish voices from formant filters. No audio files.',
    'EVERY PICTURE IS DRAWN BY CODE: procedural rigs, painted court floors, string sprites and prop shapes. No image files.',
    'Thanks for playing. Remember: the backboard is 40% less shattery now.'
  ]],
  ['SOURCE INFORMATION', [
    'DATE: 2026-11-04 06:09:01',
    'SOURCE: Basketball, in the over-the-top arcade style (genre inspiration; an original game with its own teams, courts and story).',
    'PLAN: PLAN.md',
    'TITLE: BASHKETBALL. As TASK.md asks, fifty playful riffs on "basketball" were brainstormed in the build session and one was picked with a real random number generator: Python secrets.randbelow(50) returned 3, BASHKETBALL (tools/title-pick.py; TITLE-PICK.txt). The plan had picked BASKETBLAM at its own stage; where the plan and TASK.md disagree TASK.md wins, so the game took the new name, and BLAM lives on as the league\'s brand (the Blam Tour, Blam Camp, the Blam Dome, the Hall of Blam).',
    'GENRE AND PERSPECTIVE: Arcade sports, 2-on-2 basketball with a short story ladder. A side-on broadcast camera (custom orthographic view, pitch 30), with a dunk cam; an optional High camera (the engine\'s three-quarter view).',
    'TECH: my-3D2dge v0.85.2 (full engine, modified), AI Hub session client 1.4.0, plain JavaScript, Canvas 2D, Web Audio. Built and tested with Node 24, Playwright 1.63 (Chromium) and Python http.server.',
    'ART DIRECTION: The engine\'s native HD pixel style pushed to a 90s arcade broadcast: textured court floors, three-tier crowds, angled glass backboards, neon and lighting, comic banners.',
    'ANIMATION: The engine\'s procedural Humanoid rigs, with a basketball pose layer (two-bone IK hands) for dribbling, shooting, 12 dunks, hanging on the rim, steals, shoves, blocks, celebrations and taunts.',
    'AUDIO: 12 code-written songs with dynamic layers, 8 stings, about 60 synthesized effects, a crowd ambience bed, and formant-synthesized gibberish voices for 23 speakers.',
    'ONLINE: AI Hub shared-world sessions for 1-4 players (host-authoritative, snapshots and input messages), plus 1-4 players on one machine.',
    'TESTING: One command (node tests/run.mjs) over 17 suites and about 2,400 checks: headless Node runs driving game.advance and game.debug (content, physics, rules, mechanics, AI soaks on every court, flow, a scripted playthrough of the whole Tour, all ten Blam Camp lessons, three attract loops, dev mode, UI, audio, a fake-hub network), the bundle, Playwright Chromium (every deep link, an audio smoke test, a screenshot set) and the AI Hub harness\'s four scenarios on a 127.0.0.1 port-0 server. Then browser scripts on the shipped page with real keys and clicks: Dev Mode from the pause menu (a slider changes run speed live, RESET ALL), 10 s idle into attract and a key out, Camera High and Xbox symbols through Settings, the output measured and recorded; and the harness driven by hand (Ready, Start now, a client moving its player, Remove player, Time up). No subagents.',
    'RESEARCH: None beyond the engine handoff documentation and the AI Hub protocol README.',
    'ENVIRONMENT: Claude Code CLI (headless); Linux; browser unknown.',
    'MODEL: Anthropic, claude-opus-5-5, reasoning effort xhigh.',
    'USAGE: unknown cost and token count (not visible inside the session); session time about 2 hours 50 minutes (06:09 to about 09:00).'
  ]],
  ['TESTING FEEDBACK', [
    'HOW MANY ISSUES DID TESTING CATCH? About 35: 17 found by the headless suites (physics, rules, mechanics, the Tour playthrough, Blam Camp, the attract mode, audio, content), 4 by the CPU soaks and their stats, 2 by the browser console, 11 by reviewing screenshots, and 1 by driving the AI Hub harness by hand.',
    'HOW MANY WERE CRITICAL OR GAME-BREAKING? 8: online, the other players\x27 seats were played by the CPU instead of their owners (the hand-off ran on a timer that the scene change cleared; the fake-hub suite now checks that a client\x27s keys move its player on the host); a human inbounder could hang the game forever; the event bus overwrote the events\' own id field (every power-up event threw); the settings\' apply functions crashed at boot; Blam Camp could not chain lessons; a lesson step completed twice and crashed; two lessons could never be finished; and Dev Mode never opened from its deep link.',
    'MOST HELPFUL TEST: the scripted playthrough of the whole Tour (a bot playing the human seat through the real inputs, from the prologue through a lost stop, the rematch, the final, the ending, credits, unlocks and the Hall of Blam, then CONTINUE TOUR after a reload). It found the inbound hang nothing else would have.',
    'LEAST HELPFUL TEST: the determinism proof. The engine\'s exact fixed step made it pass the first time and it never failed again; the AI soaks that measured scoring and dunk rates taught far more.'
  ]],
  ['ENGINE FEEDBACK', [
    'WHAT I LIKED MOST: headless play with exact fixed steps. game.advance ran whole matches, the whole Tour and every camp lesson in Node at about fifty times real speed, so balance and flow could be measured, not guessed. Close behind: rigs that pose themselves, and floors painted by a function.',
    'DID I GET STUCK OR GUESS WRONG? A few times: game.after timers are cleared by a scene change (Dev Mode did not open); the rig\'s joint frame had to be read from solvePose before hand IK lined up; the pixel font has no middle dot, left triangle or check mark (they drew as ?); the pause and settings screens are sized in CSS pixels, tiny on a TV; and a 30-degree side view at 240 pixels tall left no room for four tiers of stands and a sky.',
    'THE MOST IMPORTANT THING I BUILT: the basketball itself: a decide-then-fly shot model over real rim, backboard, net and floor physics (substepped so nothing tunnels), and a pose layer over the rig (two-bone IK hands) that dribbles the actual ball, shoots, dunks twelve ways and hangs on the rim.',
    'THE HARDEST PART: making the procedural Humanoid hold, dribble and slam a ball convincingly in every build, and sorting the hoop in depth (the rim and net in back and front halves, the glass cheated 30 degrees toward the camera) in an orthographic side view.',
    'WHAT I CHANGED IN THE ENGINE: shorts and socks on the Humanoid; afro, flattop and mohawk hair; Dialog voice as a per-letter function; public sfx and music buses; a build label for this copy (details on the ENGINE CHANGES page). No engine bugs needed fixing.',
    'ONE THING I WOULD CHANGE: a ten-foot mode for the HTML Shell (pause, settings, controls) that scales with the screen. Here it is scaled with CSS zoom from the game.'
  ]],
  ['PROMPT FEEDBACK', [
    'WHAT I LIKED MOST: a definition of done that can be checked line by line, and a plan with a starting number for everything (geometry, tuning, difficulty tables, line samples), which turned design debates into slider tuning.',
    'WHAT WAS CONFUSING: the plan carries another run\'s names and dates (it says to use TASK.md\'s, which worked); the title is to be picked by a random number generator, but the plan had already picked one and said not to re-pick (TASK.md wins, so I re-picked in the build session and renamed the game late); and Usage asks for a cost and token count that the agent cannot see from inside the session.',
    'THE HARDEST THING: the breadth in one session: five courts with twists, eighteen players, twelve dunks, a story, ten lessons, an attract mode, dev mode and online play, each with tests, while balancing the CPU so scores land at 30-60 a team with about a third of baskets dunks.',
    'WHAT I WOULD CHANGE: mark the plan\'s must-haves apart from its nice-to-haves, say that HTML menus must scale for a TV too, and have the harness fill in Usage.'
  ]],
  ['ENGINE CHANGES', [
    'SHORTS ON HUMANOID: a shorts option ({ len, sock, sockLen }) draws the thigh in the shorts color down to a hem in the trim color, bare legs below and socks at the ankle, in the HD and classic styles. Basketball players do not wear trousers.',
    'HAIR STYLES: afro, flattop and mohawk, beside spiky, in the HD head (and so in portraits). The cast needed them.',
    'DIALOG VOICE AS A FUNCTION: E.Dialog\'s voice may be a function (letter, index, pageText) called for each letter typed, so the gibberish voice speaks a line as it types.',
    'PUBLIC AUDIO BUSES: audio.sfxBus and audio.musicBus getters, so the voices and the crowd ambience made outside sfx() follow the volume settings.',
    'BUILD LABEL: E.build names this copy (bashketball 2026-11-04) in place of the engine repo\'s unstamped value.'
  ]]
];
const SECRETS_TEXT = [
  'CHEAT CODES: enter them on the TONIGHT\'S MATCHUP card. Each lasts one game; any code but TOURNAMENT MODE marks the game with a star (no Hall of Blam).',
  'BIG HEADS: UP, UP, TURBO, PASS',
  'POWER-UPS ON: SHOOT, SHOOT, PASS, TURBO',
  'INFINITE TURBO: TURBO, TURBO, TURBO, UP, UP',
  'NO TWISTS: DOWN, DOWN, SHOVE',
  'SKY DUNKS: OOP, OOP, UP, SHOOT',
  'MOON GRAVITY: UP, OOP, UP, OOP',
  'TOURNAMENT MODE: DOWN, LEFT, RIGHT, DOWN (no power-ups, twists or comeback assist)',
  'UNLOCKED: THE BLAMBOTS and the CHANNEL BLAM ALL-STARS in Exhibition, and the Big heads setting in Options.'
];
