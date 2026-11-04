**Eye of the Bolt-Holder** is built and every test passes. The final run, on the final build, was **1,753 passed, 0 failed across 22 suites**, including a scripted playthrough of the whole campaign.

**Deliverables (in the folder root):**
- The game: `EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html` (one file, about 2 MB).
- `exit-interview.json`: it parses and every field is answered.
- The dev files are in the subfolder of the same name. `node tests/run.mjs` runs every test and prints only failures and a count.

**What this last stretch changed:**
- **New art test suite.** Every monster, person, item and wall mechanism is drawn headless and checked to have its own look and to move. It found real gaps, now fixed:
  - the leech, rat knot and gazer looked the same walking as standing, and the spider stood dead still when idle;
  - two scrolls looked exactly alike;
  - an empty, unused drawing function was left in the code.
- **Empty-function check.** A new lint check fails on any empty function body, the shape a stub takes. It led me to remove a few more empty methods.
- **Evidence file.** `TASK-EVIDENCE.md` quotes each TASK.md requirement by line and lists the passing checks behind it. `node tools/evidence.mjs` regenerates it from a verbose test run.

**What I could not check:**
- No physical controller was used. A simulated DualSense in standard mapping went through the browser's gamepad API.
- There was no GPU. The 3D look was judged from screenshots under software rendering in headless Chromium, at about 3 fps. TASK.md puts performance out of scope.

## Source Information
- **Date:** 2026-11-03 18:50:46
- **Source:** Eye of the Beholder (Westwood Associates / SSI, 1991; MS-DOS and Amiga)
- **Plan:** PLAN.md
- **Genre and Perspective:**
  - Genre: a real-time, first-person, grid-based party RPG dungeon crawler (a blobber) with lock-and-key puzzles.
  - Perspective: first person at the party's eyes on a 4-way grid, with tweened steps and quarter turns, plus a top-down parchment automap and full-screen overlay screens over the dimmed 3D view.
- **Tech:**
  - Engines: my-3D2dge v0.85.2 (the 2D engine from `dist/handoff`, patched) and my-3D2dge 3D v0.85.2 (patched).
  - Libraries: three.js r182 (WebGPU, falling back to WebGL 2) and Rapier 0.19.3 from jsDelivr; AI Hub session client 1.4.0.
  - Plain JavaScript bundled into one HTML file.
  - Tests: Node 24 and Playwright 1.63.0 (Chromium 1243).
- **Art Direction:** the engine's native retro-modern look:
  - code-drawn low-resolution 3D: pixel picture, toon light, outlines, fog, torch shadows;
  - rigs drawn as pixel-art cards;
  - procedural textures, and creatures, mechanisms and items drawn with the engine's 3D pen;
  - a brass "lockwork" 10-foot UI with pixel-art item icons.
- **Animation:**
  - the engine's procedural rigs and moves (E.Humanoid, E.Blob, E.MOVES and E.Attack wind-ups);
  - a tweened first-person camera: steps, turns, bumps, falls, head bob;
  - pen-animated creatures and mechanisms;
  - first-person weapon swings, and card and HUD animation.
- **Audio:** all code:
  - the engine's chip synth plays original step-sequencer songs with fight layers and stings;
  - about 90 synthesized sound effects, panned by bearing;
  - a custom WebAudio babble synth gives Animalese/Simlish-style voices, one profile per speaker.
- **Online:**
  - AI Hub Session Protocol v1 in ghost mode for 1 to 4 players: the Rat Run race, with the game's own card, other players shown as cloaked ghosts, progress reports and a timed result.
  - On its own, a solo Rat Run time trial against the golden ghost of your best run.
- **Testing:** any headless testing was allowed.
  - 22 suites run behind one command, covering content lint and reachability, every game system, art, UI flows, Dev Mode, attract mode and a stand-in for the AI Hub.
  - A scripted full playthrough by a bot, also run over 20 seeds.
  - Playwright browser checks from `file://`, including a simulated DualSense.
  - A suite that reads TASK.md and checks the build against it.
  - The AI Hub harness for 2 and 4 players, with latency, jitter, loss and the host leaving.
  - Screenshots for the look.
- **Research:**
  - The plan's research: Giant Bomb, MobyGames and oldgames.sk on the source, the engine's handoff docs and the AI Hub protocol.
  - During the build: the engine's docs and source and the hub README; no web research.
- **Environment:** Claude Code CLI (headless); Linux (WSL2); browser unknown (tested in headless Chromium 1243).
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh.
- **Usage:** API cost unknown; token counts unknown; session time about 2 h 45 min (18:50 to about 21:35).

## Testing Feedback
1. **How many issues did testing catch?** About 23 real issues; each is listed in `TESTING-ISSUES.md`:
   - 2 content errors from the lint;
   - 3 bot and balance problems from the playthrough, including the party wiping at the Bolt-Holder in 8 of 20 seeds (now all 20 win);
   - 1 rest rule;
   - 4 from the browser suite and screenshots;
   - 6 look and text problems;
   - 2 from the AI Hub harness;
   - 1 engine warning;
   - 1 from checking TASK.md line by line;
   - 3 from the art suite.
2. **How many would be considered critical?** 4:
   - dropped quick key taps;
   - the lost Ready on the hub's card;
   - the party wiping at the boss;
   - a crash entering play.
3. **Most helpful test:** the scripted full playthrough. It plays all four floors and the boss by the real rules in under 2 seconds. That proves every puzzle and key reachable after each change, and running it over 20 seeds exposed the boss balance.
4. **Least helpful test:** the engine's own `tools/check.mjs`. Its camera and look notes are written for 2D views and found nothing a first-person 3D game could act on.

## Engine Feedback
1. **What did you like most?** Everything is drawn by code and deterministic. The pen built a whole bestiary, every mechanism and 50 item models without one asset file. The rigs gave every character a live, animated look and portrait. The fixed step made the whole game testable headless.
2. **Did you get stuck or guess wrong?** A few times:
   - wall colours come from the legend entry, not the level's colour;
   - `input.hold` takes an action, not a key code;
   - a scene's data can be null;
   - a tap released before the next step reads as pressed but not down;
   - the 3D runs at about 3 fps under software rendering.
3. **Most important thing I built myself:** the crawler as a pure, deterministic simulation, plus the walkthrough bot. The simulation covers grid movement, formation and per-hand combat, telegraphed monsters, memorized spells, camp, and data-driven wiring for doors, plates, levers, alcoves, teleporters and pits.
4. **Hardest part:** mixing the engine's HTML menus with my canvas-drawn 10-foot screens, and checking the 3D look on slow software rendering.
5. **What I changed:**
   - in the 2D engine: beards and shut eyes, PlayStation/Xbox button symbols, a voice volume bus, panned sound, Options ignored while Create is held (the AI Hub rule), and a way to hide Load during a session;
   - in the 3D engine: `world.wallBlock`, so secret and illusory walls match the walls around them;
   - each patch is listed in `PATCHES.md`.
6. **One thing I'd change:** let a 3D level's cells change at run time, so secret walls, trapdoors and bridges wouldn't need blocks laid over baked geometry.

## Prompt Feedback
1. **What I liked most:** it is complete and testable: exact deliverables, a detailed plan, clear rules for tests and processes, and a fixed exit-interview shape the About screen can share.
2. **What was confusing:** the title rule (brainstorm and pick at random) next to a plan that had already fixed the title. Also, whether "Online" meant multiplayer for a genre that is single-player at heart; the plan answered with a ghost race.
3. **Hardest thing to do:** fitting every system the plan lists into one build and still verifying the 3D look under software rendering. That covered four floors, 16 monster types, 18 spells, camp, NPCs, three input styles, attract mode, Dev Mode and the hub race.
4. **What I'd change:** say how long a first play should be and what may be cut if time runs short, and allow GPU rendering for screenshot checks, or say it's unavailable.