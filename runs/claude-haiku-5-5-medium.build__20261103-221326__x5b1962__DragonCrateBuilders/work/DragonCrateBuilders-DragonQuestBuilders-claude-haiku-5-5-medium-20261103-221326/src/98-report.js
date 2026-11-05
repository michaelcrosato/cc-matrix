// The About & Credits pages: the source information, the feedback sections, and what this demo leaves out. The same
// answers are in exit-interview.json beside the game's HTML file.
(() => {
const DQ = globalThis.DQ;
DQ.REPORT_PAGES = [
  { title: 'Source Information', lines: [
    'Date: 2026-11-03 22:13:26',
    'Source: Dragon Quest Builders',
    'Plan: PLAN.md (systems and structure). Title: my own 50 riffs, drawn with secrets.randbelow (index 18: Dragon Crate Builders).',
    'Genre: sandbox action RPG with block building, crafting, town building, a siege and a boss.',
    'Perspective: third-person isometric (the camera turns in quarter steps; a three-quarter view is one key away).',
    'Tech: my-3D2dge engine v0.85.2 (handoff), plain JavaScript, Canvas 2D. AI Hub client session.js 1.4.0, unmodified.',
    'Art direction: a patchwork quilt. Blocks are fabric patches with stitched seams and shaded colour, drawn at PS1 resolution. Furniture and banners are new procedural pieces: a bed, bench, chest, door, lantern and banner.',
    'Animation: the engine\'s rigs, sword moves and blob squash. New: a stitch needle that runs round each placed block, a flickering lantern flame, a fluttering banner flag, and a cast pose and roll for the Builder.',
    'Audio: music, effects and voices written in code. Voices are formant-synthesised Animalese: each vowel is a pitched buzz through its formant filters, consonants are hisses or clicks. No words.',
    'Online: AI Hub shared-world mode. One town, built together for three minutes by one to four players. The host runs it; the other copies send their inputs.',
    'Testing: 119 headless checks (including a whole-chapter playthrough and two copies joined over a fake hub bus), the engine\'s browser checker, and the AI Hub harness in shared-world mode (1, 2 and 4 players, a server host, and a host leaving).',
    'Research: none beyond the engine\'s API card and the AI Hub protocol.',
    'Environment: Claude Code CLI (headless); Linux (WSL2); Chromium headless via Playwright.',
    'Model: Anthropic, claude-haiku-5-5, reasoning effort medium.',
    'Usage: unknown.',
  ] },
  { title: 'Testing Feedback', lines: [
    'Issues found: about 12 in the game, plus several mistakes in my own tests.',
    'Critical: 2. Blocks were drawn over the Builder (a depth anchor in the wrong units). A hub session did not open into the round.',
    'Most helpful: a browser screenshot at two Builder positions. The headless checks could not show the depth bug.',
    'Least helpful: the engine checker\'s colour-count notes. They suit a bright scene, not a dim block world at night.',
  ] },
  { title: 'Engine Feedback', lines: [
    'Liked most: the rigs with E.MOVES and E.Attack, and the standard pause, settings, dialog and menus.',
    'Stuck or guessed wrong: r.queue takes world units, and I first passed cell numbers. I also guessed at E.font options.',
    'Built myself: the voxel world. Storage, step-up collision, block rays, room detection and per-block drawing.',
    'Hardest: stacking blocks inside the isometric depth-sorted draw. The TileMap is a heightmap with one wall per cell.',
    'Changes to the engine: one. Dialog gained an onLetter hook, marked // DQ:, so each letter can be voiced. Nothing else changed.',
    'One change I would make: put the units and anchor in the r.queue and r.box names, and add stacked voxel columns.',
  ] },
  { title: 'Prompt Feedback', lines: [
    'Liked most: the deliverable names, the no-subagent rule, the test-output rule and the hub link.',
    'Confusing: PLAN.md names another file and timestamp. TASK.md wins, but the plan is 1,674 lines and it is hard to know what to keep.',
    'Hardest: fitting the plan into one session. A voxel world drawn in isometric depth order takes most of the time.',
    'Change: name the file once, say which file wins, and give a smaller minimum demo to aim for.',
  ] },
  { title: 'Controls and scope', lines: [
    'Controller: left stick walks, Cross jumps, Square breaks and strikes, Circle dodges, Triangle uses and talks, R2 places, L1 and R1 turn the camera, C or Back crafts. Glyphs follow the device used last; Settings shows Xbox letters.',
    'Keyboard: WASD walk, Space jump, J or X break, E place, F use, C craft, I satchel, Q and R turn, B changes view, 1 to 8 pick a slot.',
    'Mouse: aims at the ground under the pointer, click breaks or strikes, right click places.',
    'Shared town: the bag, the chapter and the town are shared; each player has their own hotbar, slot and score. Dialogue shows on every copy.',
    'Patterns: four built-in layouts (cottage, lookout, shed, lodge), and blueprints you make yourself: use a Blueprint Scroll on what you built to copy it. Lay any pattern on clear ground; residents build it block by block.',
    'Bobbin Ballistas fire at the nearest monster, and tangle Gnarlgrim. Bobbin Portals come as a pair: step on one to come out of the other.',
    'Places: Meadow, Thread Pond, Stonefield, Brick Hills, Wool Forest and the Tangle Den.',
    'Shared-round aim: a remote player aims with the pointer the client sent, not the host\'s. Dialogue has no choices, so every copy reads the same lines.',
    'Left out: a separate town chest (the shared bag serves).',
  ] },
];
})();
