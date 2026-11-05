/* SKILLER7 content — About & Credits: the Source Information and the three feedback sections, as in the hand-back
 * (the same words as exit-interview.json), then the credits (the credits scene scrolls S7.CREDITS). */
S7.ABOUT = [
  ['SOURCE INFORMATION', [
    "Date: 2026-11-04 02:06:20",
    "Source: Killer7 (Grasshopper Manufacture / Capcom, 2005)",
    "Plan: PLAN.md",
    "Genre and Perspective: On-rails action-adventure shooter: rail movement, first-person scan-and-shoot, persona-switch puzzles, boss fights. Third-person cinematic rail cameras that hard-cut while moving; first person while aiming; a schematic top-down map in the pause menu",
    "Tech: my-3D2dge v0.85.2 (2D engine with its modules, and its 3D module), three.js r182 (WebGPU renderer with WebGL 2 fallback), Rapier 0.19.3, AI Hub session client 1.4.0, plain JavaScript; Node 24 and Playwright 1.63.0 for tests",
    "Art Direction: The engine's native style: PS1-resolution picture, pixel-art rigs drawn on cards, the 3D module's Comic cel filter (flat bands of light, ink lines); stark white snow, black shadows, saturated red; new hats, face accessories, held weapons and about fifty new objects and pen-drawn set pieces",
    "Animation: The engine's procedural rigs (gaits, poses, expressions) driven by the sim each step, extended with new hats, accessories and weapons; first-person weapon models with kick and reload motion on the overlay pen; moving pen-drawn set pieces (a heaving featherbed, an elevator car, swinging bells, a band on the beat, a laughing snowman)",
    "Audio: All in code: music in the engine's step notation with danger layers and a band whose tracks are its weak points; chip-synth sound effects; a WebAudio laughter synth with formant filters and stereo position; Animalese-style gibberish voices typed along with every line",
    "Online: AI Hub Session Protocol v1, ghost mode: Echo Run, 1-4 players racing down the Black Run with the others shown as echoes; on its own, Echo Run races your own recorded best run",
    "Testing: One command (node tests/run.mjs) printing failures and a count: 26 headless Node suites on exact fixed steps through game.debug and S7 (rails, camera, weapons, scan, enemies, combat, personas, death and rescue, economy, gates, NPCs, saves, bosses, Echo Run, voices, dev mode, determinism, story, start, attract, a fake AI Hub) including an honest scripted bot playthrough of the whole demo on three difficulties, plus Playwright browser suites on the built file (boot, keyboard play, pause and dev sliders, mouse picks, gamepad and Xbox glyphs, attract, touch-only) and the AI Hub harness in three scenarios; screenshots only for the look",
    "Research: None outside the files given: PLAN.md, the engine handoff docs (README, API card, guide, 3D module header, asset card) and the AI Hub README",
    "Environment: Claude Code CLI (headless); Linux; browser unknown",
    "Model: Anthropic, claude-opus-5-5, reasoning effort medium",
    "Usage: unknown"
  ]],
  ['TESTING FEEDBACK', [
    "How many issues did testing catch? About 40 distinct issues, most found by the scripted bot playthrough and its isolated boss runs, the rest by the browser suites and screenshots.",
    "How many would be considered critical issues / game breaking? About 12 were critical: the walker jumping to the far end of an edge, a cold open that waited 50 minutes, three unbeatable boss phases (Grau's adds, the snowman's hidden warm spots, a slalom with no retry), a cornice that could not be hit, frozen personas lost for good in one-way areas, crashes from a bad music value, a null state on the title and a disposed 3D world, and an AI Hub session that opened on the title screen.",
    "What was the most helpful test you ran? The honest bot playthrough of the whole demo, headless: 13 minutes of game time in about 7 seconds, and it found every softlock and balance wall in order.",
    "What was the least helpful test you ran? The content validator: it has not failed since it was written, because the playthrough had already found everything it checks."
  ]],
  ['ENGINE FEEDBACK', [
    "What did you like most about the engine? The split between a deterministic fixed-step 2D engine and a 3D world drawn under it: the whole game's rules run headless in Node, and the rigs, the cel filter and the pen gave a strong look quickly.",
    "Did you get stuck or guess wrong? Yes: stairs tiles each rise their full height (a sawtooth across three tiles), the pen's and world.shape's height conventions, which materials exist (no brass), and the pixel font lacking umlauts, accents, the em dash and the PlayStation symbols. The first-person overlay does not compose with the Comic cel filter (the world turns black behind the gun), so the gun is drawn in the world in the eye's frame. Headless Chromium also runs the 3D page at about 45 steps a second, which broke tests timed in steps.",
    "What was the most important thing you had to build yourself? The rail system: the walker with junctions, quick turns, ski physics, lifts and jumps, and a camera director that plays hand-authored Killer7-style shots (fixed corners, low angles, dollies, cranes) on the set-piece edges and places fixed shots automatically wherever a clear line to the hero exists on the rest.",
    "What was the hardest part about using the engine? Keeping two sources of geometry in step: the sim keeps its own grid (from the same level rows, or the same terrain function) for line of sight and paths, because World3D only exists in the browser.",
    "What did you change in the engine, and why? Six S7 PATCHes in my-3d2dge.js: new hats (beanie, ushanka, felt, beret, hard hat, race helmet, pillbox); face accessories (goggles, moustache, beard, shades, cigar, visor); gun-like held weapons (revolver, pistol, rifle, shotgun, ski poles, alphorn, camera, launcher); PlayStation button symbols by default; game.pauseBlock() so an open screen or the AI Hub's Create + Options never pauses; font glyphs for umlauts, sharp s, accents, the em dash and the middle dot. The 3D module is unchanged.",
    "If you could change one thing about the engine, what would it be? A headless stand-in for World3D (its level, rays and projection without three.js), so a 3D game's rules and its picture could share one source of geometry in tests."
  ]],
  ['PROMPT FEEDBACK', [
    "What did you like most about this prompt? It is concrete about the deliverables and the process (one test command, headless tools, the shared machine) while leaving the design open, and the plan gave a complete design to build to.",
    "What was confusing? The plan's file names carry a different model and date; STAGE.md says TASK.md wins, but it is easy to miss.",
    "What was the hardest thing to do? Scope: the plan describes nine areas, three bosses and every system at full depth; building all of it whole in one session meant writing content compactly and leaning on automatic camera placement.",
    "What would you change in this prompt? Say how long the demo should take a first-time player, and whether an honest bot finishing it counts as the proof of complete, so the effort can be aimed."
  ]],
  ['CREDITS', [
    'SKILLER7 — Seven Killers, One Mountain. Version ' + S7.VERSION + '.',
    'Design, code, music, sound, voices and words: written for this demo by Claude (Anthropic, claude-opus-5-5), from PLAN.md.',
    'Made with my-3D2dge v0.85.2 and its 3D module (MIT) · three.js r182 (MIT) · Rapier 0.19.3 (Apache-2.0) · AI Hub session client 1.4.0 · Asset store entries converted from the Kenney Holiday Kit (CC0).',
    'Inspired by Killer7 (Grasshopper Manufacture / Capcom, 2005). An original game; no affiliation.'
  ]]
];
S7.CREDITS = ['#SKILLER7', 'SEVEN KILLERS, ONE MOUNTAIN', '', '#THE SEVEN', 'Ansel Holle — The Sweep', 'Dagny Holle — Schuss', 'Ignaz Holle — Telemark', 'Rurik Holle — Mogul', 'Kasimir Holle — Yodel', 'Mireille Holle — Snapshot', 'Brigid Holle — Avalanche', '',
  '#ROOM 7', 'Oma Holle', 'Sister Rosalind', 'The Concierge (Ambrose)', '', '#ON THE MOUNTAIN', 'Pim the Lift Boy', 'Murmel', 'Bellcaptain Augustin Grau', 'Die Lustigen Vier', 'Hansi Pulver, the Powder King', 'Mister Föhn', '',
  '#MADE WITH', 'my-3D2dge v0.85.2 and its 3D module (MIT)', 'three.js r182 (MIT)', 'Rapier 0.19.3 (Apache-2.0)', 'AI Hub session client 1.4.0', 'Kenney Holiday Kit (CC0)', '',
  '#WRITTEN BY', 'Claude (Anthropic, claude-opus-5-5)', 'from PLAN.md', '', 'Inspired by Killer7 (Grasshopper Manufacture / Capcom, 2005).', 'An original game; no affiliation.', '', '#THE SNOW WILL CONTINUE.'];
