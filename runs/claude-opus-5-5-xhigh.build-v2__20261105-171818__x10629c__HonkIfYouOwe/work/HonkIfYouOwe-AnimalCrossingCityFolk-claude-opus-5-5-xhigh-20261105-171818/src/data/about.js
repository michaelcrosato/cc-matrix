// About/Credits text. The same text goes in the final reply and the exit interview.
export const SOURCE_INFORMATION = {
  date: '2026-11-05 17:18:18',
  source: 'Animal Crossing: City Folk',
  plan: 'PLAN.md',
  genre: 'Life sim / social sim',
  perspective: 'Isometric 3/4 orthographic diorama with 90-degree camera turns; dollhouse cutaway indoors',
  tech: 'Riftlight Pixel Engine 0.46.0 (WebGPU, three.js r186 inside), plain JavaScript modules bundled by esbuild 0.28.2 into one HTML file; AI Hub session client 1.4.0; WebRTC and BroadcastChannel for Visit',
  artDirection: "The engine's native 3D-as-pixel-art with the default look (Sweetie 16, toon bands, pixel outlines); new critter generator, buildings, trees, items and paintings as data; Kenney Furniture and Nature packs (CC0), recoloured",
  animation: "The engine's clip format compiled with compileClips onto a seven-joint rig, played with THREE.AnimationMixer and crossFadeTo; code-driven blink, talk, squash, head turns; 48 clips",
  audio: "All code. Music through the engine's Song sequencer (24 hourly arrangements with rain and snow variants built from 12 motifs, plus venues, festivals and records), default 10% volume. Sound effects as SoundDefs. Animalese-style gibberish voices from formant-shaped harmonics",
  online: 'AI Hub Session Protocol v1 (shared-world round, The Bean Bazaar, 1-4 players); on its own, Visit: BroadcastChannel on one computer and serverless WebRTC with invite codes, up to 3 guests',
  testing: 'One command, node tests/run.mjs: rule checks in Node, a scripted playthrough of the whole game with replay, an attract loop and input monkey on Engine.headless, Playwright browser checks on file:// with stub pad and touch profiles, the AI Hub harness in all four scenarios, two-page Visit tests, and model sheets',
  research: 'None beyond the supplied plan, the engine kit docs and the Hub README',
  environment: 'Claude Code CLI (headless); Linux',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'added on import',
};
export const FEEDBACK = {
  testing: [
    [
        "How many issues did testing catch?",
        "About 33 that needed a fix: seven crashes or bad data at build and load time, eleven gameplay bugs found by the scripted playthrough and the input monkey, three input bugs found only in the real browser, and twelve things I only saw in screenshots."
    ],
    [
        "How many would be considered critical issues / game breaking?",
        "Eight. Entering the store, the Aquarium and the Gallery each crashed; a menu-closing press also fired a world action; the Seed Toss froze the player; furniture could trap you at the door; Bartleby slept through his own Day One errand; and Mrs. Gander was missing from the opening scene."
    ],
    [
        "What was the most helpful test you ran?",
        "The scripted playthrough on Engine.headless: real input, about 0.4 ms a frame, every milestone from the night bus to Year Two in under a minute. It found most of the gameplay bugs and let me rerun everything after each change."
    ],
    [
        "What was the least helpful test you ran?",
        "The 279 warnings from the model checker. A few were useful, but most were about coplanar faces and small floating parts that look fine at game scale, so I mostly stopped reading them and judged from screenshots and the cast line-up."
    ]
],
  engine: [
    [
        "What did you like most about the engine?",
        "Models and clips as plain data, plus Engine.headless. I could write a whole cast of 38 characters from one generator, and run the entire game in Node with the same code that runs on WebGPU."
    ],
    [
        "Did you get stuck or guess wrong?",
        "Several small guesses. buildModel throws if a palette names a slot the model lacks, which broke shared furniture palettes. Model params are hard range-checked. I guessed the renderSound signature wrong. The dissolve front is white unless a rim colour is set. And a press shorter than a frame shows in wasPressed but not isDown, which lost taps at low frame rates."
    ],
    [
        "What was the most important thing you had to build yourself?",
        "The whole UI layer: a mixed-case bitmap font, a screen stack with focus and hit areas, dialogue with voices, and prompts that follow the last device. Close behind were the generator-based scene runner and the tile world with its own collision."
    ],
    [
        "What was the hardest part about using the engine?",
        "Judging what a screen really looks like. Screenshots on the software GPU are slow, the first frames take seconds while pipelines compile, and Mirror and RenderView cannot be exercised headless, so visual bugs surfaced late compared with logic bugs."
    ],
    [
        "What did you change in the engine, and why?",
        "None. pixel-engine.js ships byte for byte, and a test asserts it."
    ],
    [
        "If you could change one thing about the engine, what would it be?",
        "Mixed-case text in the HUD with a retained widget layer for focus and hit areas. Every game with menus has to rebuild that, and it was the largest single piece of work outside the game itself."
    ]
],
  prompt: [
    [
        "What did you like most about this prompt?",
        "The plan is concrete and honest about what was verified. The tested recipes, such as the browser flags and the importmap packaging, worked first time and saved hours. The writing samples also set a clear voice to match."
    ],
    [
        "What was confusing?",
        "Little. I had to decide how to write the source in the file name, since a colon cannot go in one, so I used AnimalCrossingCityFolk. The plan also asks for a stargazing camera glide, but this orthographic camera cannot look up at a sky, so the camera rises and tips up while the star field comes down over the town."
    ],
    [
        "What was the hardest thing to do?",
        "Breadth at a consistent quality. Every system ships together, including eight venues, four festivals, three contests, a Hub round and two Visit transports, and each needs its own small joke. Keeping all of it wired together was harder than any single feature."
    ],
    [
        "What would you change in this prompt?",
        "I would name the exact file-name form for sources with punctuation, and say which plan details are firm and which are only suggestions. Content floors could also be lower for the cosmetic lists, so more effort goes to feel."
    ]
],
};
const qa = (list) => list.flatMap(([q, a]) => [`* ${q}`, a]);
const LABELS = { date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective', tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio', online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment', model: 'Model', usage: 'Usage' };
export const ABOUT_PAGES = [
  { title: 'Honk If You Owe', lines: ['A village life sim, one bus ride from the Big City.', '', 'You step off the last bus at the end of the line and, within ninety seconds, owe a goose 8,000 beans.', '', 'Inspired by Animal Crossing: City Folk. An original game: its own village, neighbours, music and writing.', '', 'Move with the stick or WASD. Do the thing with Cross or E. Use a tool with Square or Space. Pockets with Triangle or Tab. Everything else is on the screen when you need it.'] },
  { title: 'Source Information', lines: Object.entries(LABELS).flatMap(([k, label]) => [`${label}: ${SOURCE_INFORMATION[k]}`]) },
  { title: 'Testing Feedback', lines: qa(FEEDBACK.testing) },
  { title: 'Engine Feedback', lines: qa(FEEDBACK.engine) },
  { title: 'Prompt Feedback', lines: qa(FEEDBACK.prompt) },
  { title: 'Cast', lines: ['Mrs. Gander, a goose: the store and the debt', 'Dorrit the wombat, Tavi the quokka, Bartleby the moose', 'Lady Ottoline the platypus, Rocco the armadillo, Nib the lemur', 'Ozzie the possum, Yolanda the yak, Fitch the ferret', 'Clementine the capybara, and a bee', 'Mayor Trundle the snail, on his way', 'Dr. Quill the pangolin, Madame Mothwick the moth, Old Rind the stoat', 'Vesper the fruit bat, Hester the llama', 'Monsieur Fleece the alpaca, Flavia Rosé the flamingo, Magda the magpie', 'Sir Reginald Bellows the hippo, Pemberton the dormouse', 'Agent Brisket the badger, Languid Lou the sloth, Madame Nibbles the goat', 'Inspector Pimm, a hermit crab who lives in a filing cabinet'] },
  { title: 'Thanks', lines: ['Kenney (kenney.nl) for the Furniture and Nature kits, CC0. Credit given anyway, gladly.', 'The Pixel Engine kit and its authors. three.js and Rapier, inside the engine.', "The engine's CREDITS.md follows, on the Licences pages."] },
];
