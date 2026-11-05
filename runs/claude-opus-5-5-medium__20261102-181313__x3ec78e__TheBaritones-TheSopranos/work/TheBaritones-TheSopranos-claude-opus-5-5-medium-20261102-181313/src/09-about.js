/* ---- ABOUT & CREDITS: the pages of the About screen (and the same answers as the chat reply and exit-interview.json) ---- */
const ABOUT = [
  ['HOW TO PLAY', [
    'Sal Baritone runs the North Jersey rackets, and lately his nerves run him. Make the rounds, keep the Falsettis off your street, keep your family at the table and your stress under 100.',
    '• Move: WASD or arrows, the left stick. Sprint: Shift, R1 or L3.',
    '• Punch (three in a row): J or left click, □ / X. Kick: K, △ / Y.',
    '• Block: L or C, L1 or L2. Roll: Space, ○ / B.',
    '• Shoot: Q or right click, R2. Aim: the mouse or the right stick.',
    '• Talk, use, get in or out of the car: E or F, ✕ / A. Click a person or a thing to walk to it and use it.',
    '• In the car: gas with W or R2, brake with S or L1/L2, handbrake with Space or ○.',
    '• Camera view (three-quarter, top-down, isometric): V or R3. Zoom: the mouse wheel, - and =.',
    '• Pause, settings, saves, controls: Esc or Options / Start. Player 2 joins with Start on a second controller, or 2 on the keyboard.',
    'Stress rises when Sal gets hit, shoots or makes hard choices. Quiet time, ducks, cannoli and gabagool bring it down. At 100 he has a panic attack: breathe with the ring, or he goes down.'
  ]],
  ['SOURCE INFORMATION', [
    '• Date: 2026-11-02 18:13',
    '• Source: The Sopranos (HBO, 1999-2007), as an original spiritual successor: no characters, lines or music from it.',
    '• Genre and Perspective: an action-adventure crime brawler with a story told in chapters and therapy sessions; three-quarter overhead camera (the engine\'s threequarter view), switchable to top-down and isometric.',
    '• Tech: my-3D2dge v0.85.1 (the full engine, one file, inlined) with its drive module (cars), E.Shell (HTML HUD and menus), E.Dialog, E.Bullets, Humanoid rigs; the AI Hub session client 1.3.0 (protocol v1). Plain JavaScript, no other libraries.',
    '• Art Direction: the engine\'s native retro-modern pixel art: PS1-resolution (320x240, expanded to fill the screen), HD-shaded 3D-skeleton characters, materials on walls and floors, props, canvas lighting at night, rain and snow.',
    '• Animation: the engine\'s procedural rigs: E.MOVES punches and kicks (jab, cross, hook, roundhouse, overhead, haymaker, uppercut), poses (guard, block, kneel, die), rolls, hit-stop, smears and particles.',
    '• Audio: code-written chip music (title, town, night, fight, boss, Pine Barrens, office and three jukebox takes) and sound effects from the engine synth; gibberish "Simlish" voices pitched per speaker, one syllable every other letter.',
    '• Online: AI Hub sessions in ghost mode (1-4 players): a three-minute Collection round, the others shown as see-through ghosts, cash reported as the score. No other network use.',
    '• Testing: headless engine tests in Node (every system and a full story playthrough by script on three choice paths), browser checks with Playwright in Chromium, Firefox and WebKit, the viewport matrix (phones to ultrawide), the AI Hub harness.',
    '• Research: the engine handoff package (API card, index, kits) and the AI Hub protocol README. Nothing else.',
    '• Environment: Claude Code CLI (headless); Linux; browser unknown',
    '• Model: Anthropic, claude-opus-5-5, reasoning effort medium',
    '• Usage: unknown (no token or cost meter in this session; about 55 minutes)'
  ]],
  ['TESTING FEEDBACK', [
    "• How many issues did testing catch? Thirteen game issues, plus six mistakes in my own tests. The game issues: foes and allies walked in straight lines, so a goon and Sal could get stuck on opposite sides of a building; the scripted panic attack never fired (stress drained to 99.9 before the check), Carmine's surrender never set the flag that ends the boss fight, the AI Hub ready() call sat on a game timer that the scene change cleared, you couldn't get out of a reversing car, moving the mouse didn't switch the prompts to the mouse, touch-only phones weren't detected in WebKit and Firefox, the pixel font had no middle dot, the therapy clock sat under the corner buttons, the moon sat under the phone menu button, banners covered fights, the SUV looked like a fridge, and Donna couldn't be clicked.",
    "• How many would be considered critical issues / game breaking? Four would have broken the game: the panic attack that never fired (it soft-locks chapter one), Carmine's surrender (it soft-locks the finale), the straight-line enemies who could get stuck behind a building (they stall a wave), and the missing ready() (AI Hub rounds never start).",
    "• What was the most helpful test you ran? The headless full-story playthrough: a bot plays New Story through the credits with real input taps, on three different choice paths. It found both soft-locks and the pathfinding bug.",
    "• What was the least helpful test you ran? The viewport matrix: 24 clean screenshots of the title with no overflow and no errors. It's reassuring, but the game draws on one canvas, so it couldn't find much."
  ]],
  ['ENGINE FEEDBACK', [
    "• What did you like most about the engine? Characters with no art files: HD Humanoid rigs, E.MOVES punches and kicks with real wind-ups, and hitFx gave the brawling a good feel almost for free. The standard pause, settings, rebinding and save screens meant I spent no time on menus.",
    "• Did you get stuck or guess wrong? Yes, a few times. game.after timers are cleared on a scene change, and that ate the AI Hub ready() call. A mouse move doesn't set input.lastDevice to 'mouse' (only a button does). The pixel font has no middle dot. And I guessed facing and pose values for seated characters ('crouch' stands in for sitting).",
    "• What was the most important thing you had to build yourself? The story layer: chapters as steps with check functions, a conversation queue with choices that branch, gibberish voices per speaker, and the two minigames. Also cars drawn from their heading and the gamepad axis inversion.",
    "• What was the hardest part about using the engine? Its size: the API card, the index and the kits are a lot to take in, and the answer is often one line in a 190 KB index. Some behaviour, like timers dying with the scene and the device switching, only shows when you test.",
    "• If you had to remove or overhaul one thing from the engine, what would that be? I'd overhaul input.lastDevice: it should count mouse movement and stick movement, so prompts follow the device without a game wrapping input.tick.",
    "• If you could change one thing about the engine, what would it be? Built-in axis inversion for both sticks (not just invert aim Y), plus a sit pose and a car or vehicle draw helper for ground views."
  ]],
  ['PROMPT FEEDBACK', [
    "• What did you like most about this prompt? Clear, testable requirements (attract after 10 s, glyph families, the invert toggles, touch-only behaviour) and the freedom to pick a genre and a voice for the source.",
    "• What was confusing? How Multiplayer should work 'for the game on its own': I read it as local drop-in co-op plus the same Collection round the hub runs. 'Every feature in TASK.md' overlaps with the source's 'all mechanics', which leaves the scope open.",
    "• What was the hardest thing to do? Fitting a whole vertical slice into one session: the story with branching choices, a boss, a car, two minigames, local and online multiplayer, and the attract mode, all tested.",
    "• If there was one test you could have run, what would that test be? A long real-hardware session with a DualSense on a TV, to judge the 10-foot readability and how the controller feels. Automation can only fake the pad."
  ]],
  ['CREDITS', [
    'THE BARITONES: design, code, art direction, music, sound and writing by Claude Opus 5.5 (Anthropic) in Claude Code.',
    'Engine: my-3D2dge v0.85.1 by Michael Crosato (MIT License). Online: the AI Hub session protocol and client by Michael Crosato.',
    'Inspired by The Sopranos, created by David Chase for HBO. This is a tribute, not an adaptation: every name, line and note here is new.',
    'Thanks to the ducks.'
  ]]
];
