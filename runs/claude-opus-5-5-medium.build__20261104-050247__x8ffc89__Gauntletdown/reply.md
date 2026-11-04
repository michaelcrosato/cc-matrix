I've built **Gauntletdown**, the title the plan gave, as a single file that opens straight from disk. All 172 checks in the test suite pass, and that includes the AI Hub harness in all four of its scenarios.

**Files** (in this folder's root)
- `Gauntletdown-Gauntlet-claude-opus-5-5-medium-20261104-050247.html`: the game (about 1.5 MB). It makes no network requests.
- `exit-interview.json`: parses as JSON, every field answered. A script writes it from the same text as the in-game About pages, so the two match word for word.
- `Gauntletdown-Gauntlet-claude-opus-5-5-medium-20261104-050247/`: all dev files. `node tests/run.mjs` runs the tests and `node build.mjs --bundle` rebuilds the single file.

**What's in the demo**
- **Content:** 9 floors in three realms, 2 treasure rooms with a countdown, and a three-phase King Famish boss, followed by the ending, credits and a harder Descent II.
- **Heroes and monsters:** four classes with different stats. There are 7 monster types with ranks that shrink when wounded, 7 kinds of generator, food and keys, Blast Flasks, 7 special potions and 5 amulets.
- **Floor features:** doors, cracked and fake walls, trap plates, transporters, stun runes, force fields, spikes and lava. If you linger, the dungeon opens its doors itself, then turns every wall into a stair.
- **The narrator:** "the Gaunt" gives short, booming callouts in captions and spoken gibberish.
- **Players:** 1–4 on one screen, with drop-in joining, rising again, a continue and initials on high scores. Online, 1–4 players share one world in AI Hub sessions.
- **Around the game:** an attract mode after 10 seconds idle on any menu, Dev Tools in the pause menu (cheats, warp, give/spawn, 16 live tuning sliders with reset), and the "Controller or keyboard required" notice on touch-only devices.

**Left out or simplified**
- **Cut entirely:** WebGPU lighting, which the plan's cut list allows. The game uses the engine's canvas lighting.
- **Simplified:** generic props come from the engine's core library rather than the larger asset store. Chests vanish in a burst of coins instead of opening their lids.
- **Only partly checked:** I couldn't hear the audio. It's only verified to run without errors.
- **Not balanced by hand:** balance is checked only by the bots. One bot clears floors 1–3 on Easy, and finishes floor 1 on Normal with over 300 health.

## Source Information
- **Date:** 2026-11-04 05:02:47
- **Source:** Gauntlet (Atari Games, 1985 arcade)
- **Plan:** PLAN.md
- **Genre and Perspective:** Arcade co-op dungeon crawler (top-down hack-and-shoot with maze exploration). Three-quarter overhead; top-down and isometric selectable in Settings or with V.
- **Tech:** my-3D2dge v0.85.2 (handoff edition, patched: new Humanoid gear), HTML5 Canvas 2D, Web Audio, AI Hub session client 1.4.0; tests on Node 24 and Playwright 1.63.0 (Chromium).
- **Art Direction:** The engine's PS1-era 2D look: procedural HD rigs, textured TileMap materials, canvas lighting with torches and glows; four realms (the Larder, the Ossuary, the Furnace Gut, the Banquet); new gear for the rigs, a cloth-sheet Shade for the ghosts, painted generators with damage states, string sprites for food, treasure, potions, amulets and shots; generic props from the engine's core library.
- **Animation:** The engine's procedural Humanoid and Blob rigs and E.MOVES, with per-class throws (a bow draw for the Ranger, a cast for the Hexer), per-class melee combos, monster wind-up telegraphs, the Shade's fluttering hem and gaping mouth, a starving hunch, rank shrinking, generator breathing, eating squash, death and rising, the King's states.
- **Audio:** Twelve original chip songs in the engine's step format with dynamic layers (drums when a horde is near, a layer per boss phase), about fifty synthesized sound effects, a heartbeat when starving, and Babble: a formant gibberish voice synth for the narrator (the Gaunt), the four heroes, the monsters and King Famish. No audio files.
- **Online:** AI Hub Session Protocol v1, shared-world mode, 1-4 players: the host runs the world, clients move their own hero at once and draw the rest from snapshots; a server-host with no player works too. Outside a session: solo or couch co-op for 1-4 on one screen.
- **Testing:** One command, `node tests/run.mjs`, prints only failures and a count: 172 checks in six suites:
  - floors: every floor validated and solvable
  - sim: each system headless
  - play: two full scripted descents by bots from floor 1 to the ending and Descent II with the same state hash, a no-cheat balance run, the attract loop, four local players
  - net: a fake hub with latency, jitter and loss
  - ui: the single file in Chromium from file://, real keys and mouse, a touch-only phone
  - hub: the AI Hub harness in its four scenarios

  Screenshots were used for looks only.
- **Research:** None on the web. Read the engine handoff docs (README, API card, guide sections, the adventure kit) and the AI Hub protocol, harness and arena example; Gauntlet facts from the model's own knowledge and PLAN.md.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown

## Testing Feedback
1. **How many issues did testing catch?** Eight real bugs (test-harness mistakes not counted): a declaration-order crash at boot; the boss floor failing the floor validator; the co-op leash snapping a teleported hero back (a bot stuck forever on floor 4); the Iron Gauntlet dropping where nobody could reach it; the game's own AI Hub card losing the Enter press during a fade; the attract mode ignoring unbound keys; mouse aiming turning the camera into NaN and the screen black; and text glyphs the pixel font lacks.
2. **How many would be considered critical issues / game breaking?** Five were critical or game breaking: the boot crash, the black screen on the first mouse click, the unreachable gauntlet (no ending), the floor 4 co-op soft-lock, and the card bug (the hub would have kept the game out of sessions).
3. **What was the most helpful test you ran?** The scripted full descent: two bots playing every floor, both treasure rooms and the boss to the ending and Descent II, twice with the same state hash. It found the soft-locks no single-system check could. A close second: the AI Hub harness, which caught the card bug at once.
4. **What was the least helpful test you ran?** The engine's look checker (tools/check.mjs): it pressed start and sampled only the menus and the floor card, so its notes were about those screens, not play. The fake-hub net suite also passed first time, after the real harness had already proven the same things.

## Engine Feedback
1. **What did you like most about the engine?** Everything runs headless and deterministic with game.advance, so a bot could play the whole game in a second of real time per minute of play; and the standard pause menu, settings, rebinding, prompts with PlayStation and Xbox glyphs, and the boot screen came for free.
2. **Did you get stuck or guess wrong?** Yes, three times: game.mouseGround() returns an [x, y] array, not { x, y } (it made the camera NaN and the screen black); the three-quarter view draws at scale 1.5, so a Gauntlet maze needed the camera zoomed out to about 0.72; and a setting's apply runs at define time, before later code has run.
3. **What was the most important thing you had to build yourself?** The simulation: one damage pipeline, multi-source flow fields toward the nearest hero, the monster AI kinds, generators and level features, the autopilot bot, and the shared-world netcode (snapshots, events, interpolation, a rate limiter) on top of it.
4. **What was the hardest part about using the engine?** Keeping a 10-foot, controller-first front end consistent across the engine's HTML menus (14 px, scaled up with CSS zoom) and my canvas screens, and fitting crowds of monsters into the hub's message budget.
5. **What did you change in the engine, and why?** One change: Humanoid gear. New weapons (axe, bow, club, frying pan, scythe, carving fork), an off-hand shield and two hats (a horned helmet and a cook's toque), drawn in the HD rig's depth-sorted list, because the heroes and monsters needed their own silhouettes. Applied by tools-gd/patch-engine.py and listed in ENGINE-CHANGES.md.
6. **If you could change one thing about the engine, what would it be?** A FlowField with several targets (the nearest of many heroes) and a TV scale for the standard menus, both of which every couch co-op game on the engine will want.

## Prompt Feedback
1. **What did you like most about this prompt?** It is concrete about what done means: one file, the exact sections, the exit interview's shape, a single test command that prints only failures. And the controller-first, 10-foot rules gave clear design targets.
2. **What was confusing?** The plan was written for another run (its folder names carry a different model and timestamp) and already picked the title, while TASK.md asks for a title picked by a random number generator; STAGE.md settles it (use the plan's title, and TASK.md wins on names). Usage figures are asked for, but the session has no way to read them.
3. **What was the hardest thing to do?** The scope: nine floors, two treasure rooms, a three-phase boss, four classes, local co-op, shared-world netcode, a gibberish voice synth, an attract mode and dev tools, all complete with no stubs, in one session, without being able to play it by hand.
4. **What would you change in this prompt?** Say which features matter most if time runs short (the plan has a cut list; the prompt does not), and say whether usage numbers will be available to the model or should always be "unknown".