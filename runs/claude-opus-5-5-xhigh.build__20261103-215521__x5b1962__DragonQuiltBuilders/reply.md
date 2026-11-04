Every TASK.md requirement is now checked against the shipped file and a running copy of the game, and the check found three more unfinished pieces, now fixed. `node tests/run.mjs --browser` passes all 356 checks on the final release build. `exit-interview.json` beside the HTML parses and has every field filled.

**How "no stubs" is now proven.** A new suite, `tests/unit/requirements.test.mjs`, has two parts:
- **TASK.md checks (27):** perspective, title, single-file package with no external loads, engine version, art, animation, no audio files and a voice for every speaker, `session.js` first in `<head>` with the hub tags, dev folder layout, Dev Tools in the pause menu with a live slider per tuning value and a reset, attract mode, PlayStation glyphs by default with an Xbox option, PC key bindings plus a pad button for every action, the touch-only notice, no TODO-style text, the About pages, and the exit interview's exact shape.
- **Content audit (17 checks):** everything the game defines must be reachable and used. That covers songs, jingles, sound effects, cutscenes, items, recipes, monsters, objects, blocks, sliders, settings, quests, residents, room types and Dev rows. To show the audit isn't vacuous, `AUDIT_PROBE=1` plants an unused song, jingle, cutscene, recipe, monster, object and slider, and it flags every one.

**What the audit found, now fixed:**
- **Golden Thimble:** a side-quest reward that did nothing. It now gives +2 attack while carried (4 → 6).
- **"Undone" jingle:** never played. It now plays when the Builder is knocked out in the story.
- **Rock decoration:** defined but never placed. 44 rocks now appear, mostly on the Coast and Crags, on their own random stream so the plant layout is unchanged.

Adding rocks exposed three fragile spots in the playthrough script, not in the game, and I fixed them in the script. It now skips a bush it already failed to reach, gathers its own Lint before the M3 torch, and searches for a ballista spot with a clear line to the boss instead of trying one fixed cell.

**Feature by feature:** `REQUIREMENTS.md` in the dev folder maps each TASK.md line to what implements it and the named checks that verify it. Narrative tone, performance and the "no dense web-style screens" rule can't be scripted; those were judged from screenshots.

**On the Testing Feedback counts:** `DEVLOG.md` now lists all 43 issues, each with how it was caught and which 7 were critical, so the answers below can be checked line by line. The list was written from my session log after the fact, not by an independent tracker.

## Source Information
- **Date:** 2026-11-03 21:55:21
- **Source:** Dragon Quest Builders
- **Plan:** PLAN.md
- **Genre:** Sandbox action RPG with block building, crafting and town building (real-time combat, a story chapter, a base siege and bosses)
- **Perspective:** Third-person isometric 2.5D over a true voxel world. The camera turns in 90-degree steps and zooms in steps; an optional three-quarter view is in Settings.
- **Tech:** my-3D2dge v0.85.2 handoff (one engine file changed). Plain JavaScript modules bundled into one HTML file by a Node build script, with my own voxel world, renderer, physics and A* navigation. Web Audio. AI Hub session.js 1.4.0, unmodified. Tests on Node 24 and Playwright 1.63.0 Chromium.
- **Art Direction:** The engine's native pixel style: patchwork-quilt voxel blocks with stitched seams, furniture built as engine shapes, HD Humanoid and Blob rigs, warm storybook colours, and day/night lighting with torches and lanterns.
- **Animation:** The engine's procedural rigs and move library, plus new moves (place, eat, stir, crank, hammer), the rig's landing and jump stretch, cutscene poses and tweens, and particles.
- **Audio:** All code: 14 original chip songs on one leitmotif, 13 jingles, 39 synthesized sound effects, and Animalese-style voices for 10 speakers. A music director follows place, time of day and danger, and Voices has its own volume.
- **Online:** AI Hub Session Protocol v1, a shared-world Quilting Bee for 1–4 players: the host runs the world and sends snapshots; own card, ready without a key press, standings and finish, leave, time-up, end and server mode. Playable solo with bots from the title. The story game is single-player and unchanged outside a session.
- **Testing:** Allowed: headless scripts using `game.advance` / `game.debug`, including a full scripted playthrough, behind one command that prints only failures and a count; screenshots only for what scripts can't check; no subagents to review. Used: unit and systems tests, a full Chapter One playthrough by an AI pilot, a fake-hub network suite (2 and 4 copies, latency and packet loss, server mode), the AI Hub harness's 4 scenarios plus standalone, a browser keyboard and mouse test, the TASK.md requirements suite and the content audit. 356 checks pass.
- **Research:** None on the web. I read the engine handoff and the AI Hub lib/hub README, session.js and harness.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** Cost unknown; tokens unknown; session time about 3 hours 20 minutes (wall clock)

## Testing Feedback
1. **Issues caught:** 43, listed in `DEVLOG.md`:
   - 21 by the scripted tests;
   - 14 by screenshot review;
   - 1 by reading code after a screenshot (Enter both turning and skipping the prologue);
   - 4 by stub scans (the Bee's scoring hook that did nothing, the landing squash, cutscene skips, empty Dev row actions);
   - 3 by the content audit (the Thimble, the jingle, the rocks).
2. **Critical:** 7.
   - The game failed to boot because of a module load-order error.
   - The residents' path walker recursed until the stack overflowed, freezing the game.
   - The quest system was never connected, so the story couldn't advance.
   - A Cheer bubble could be collected forever.
   - The host's own edits never reached other players.
   - The Builder was hidden behind walls in the first region.
   - A late change broke the boot; the next test run caught it.
3. **Most helpful:** The scripted playthrough, where an AI pilot plays Chapter One from the first quest to the credits using the same input a player does. It found the unconnected quests, the walker freeze, gaps in room detection, dialogs blocking play, and story jumps that left furniture blocked by plants. Second was the content audit, which proves nothing defined is unused and shows with probes that it would catch something.
4. **Least helpful:** Early unit checks of screen picking and stair heights. Their failures were mostly wrong expectations in the tests, and the playthrough covered the same code better.

## Engine Feedback
1. **Liked most:** Headless `game.advance` / `game.debug`: the whole game, networked copies included, runs in Node, so a full scripted playthrough was practical. The rigs, move library, built-in pause menu, settings, saves, controller glyphs and chip audio saved a lot of time.
2. **Stuck or guessed wrong:** Yes. The x-ray silhouette guesses a fixed-size box per item, which hid the Builder until I passed exact screen boxes. I read the lighting tint as a colour, but it's a number. The engine's map is a height field, so a multi-level voxel world needed its own renderer. I also used `Mouse2` as an action name when it isn't one.
3. **Most important thing I built:** The voxel world: storage, a face-sprite atlas per view, a renderer that merges block runs into depth-sorted occluders with cutaway, voxel physics and A* navigation. After that, room detection and the AI pilot behind attract mode, the tests and the Bee bots.
4. **Hardest part:** Depth-sorting voxel runs against the engine's sprites in its painter-sorted queue, with x-ray, at two view angles and four camera turns.
5. **What I changed:** One file, `my-3d2dge.js`: the Humanoid rig now accepts four sewing-tool weapons (needle, club, bodkin, seam ripper). The source's weapons double as building tools, and the rig's weapon list is closed. Nothing else changed.
6. **One thing to change:** First-class multi-level or voxel map support, or at least an occluder API that takes exact screen boxes.

## Prompt Feedback
1. **Liked most:** It's concrete about what "done" means: file names, one test command, the exit-interview shape, the reply sections, and the rule that TASK.md wins over the plan. The freedom to change the engine and the AI Hub harness made multiplayer something I could actually verify.
2. **Confusing:** PLAN.md names a different deliverable file (a max-effort name from another run) than TASK.md. Source Information's "Testing" can mean the rules or the tests run. Usage asks for cost and token numbers the agent can't see.
3. **Hardest:** The scope: a feature-complete slice of a voxel building RPG, with building, rooms, residents, combat, a siege, bosses, a story, multiplayer, attract mode and dev tools, on a 2D engine with no voxel support, while checking the visuals only through screenshots.
4. **What I'd change:** Make the plan's file name match TASK.md, give the agent a way to read its token and cost usage (or drop that field), and say whether "Testing" should list the rules or the tests run.