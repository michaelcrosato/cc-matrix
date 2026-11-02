I've built **Zone Alone**, a spiritual successor to *Home Alone*. The single file is `ZoneAlone-HomeAlone-claude-opus-5-5-xhigh-20261101-1409.html` in the run folder (about 1.5 MB, no network dependencies). The dev files are in `ZoneAlone-HomeAlone-claude-opus-5-5-xhigh-20261101-1409/`, with a README on how to build and test. The title came from 50 riffs picked with Python's `secrets` module.

**What you play:** Kip, 8, gets left behind for the holidays.
- **Morning (story):** a short tutorial as he explores the empty house.
- **Battle plan, 4 to 9 PM:** find 7 kinds of trap kits around a two-storey house and set them. The pizza delivery at 6 PM is where you first try the gangster tape on the TV.
- **The night, 9 to 11:30 PM:** two burglars, Sal and Dewey, pick the locks and haul loot to their van. They have sight cones and get suspicious. You fight back with trap combos, a slingshot, hollering to lure them, the tape, and a zipline to the treehouse you can cut while a bandit is on it. If they take 4 of the 6 valuables, or catch you three times, you lose.
- **Ending:** Mr. Haddock from next door, the cops, and Mom getting home, then a results screen with ranks and medals.

The camera is three-quarter top-down, and you can switch to isometric or top-down at any time. The rest of the brief is covered:
- A demo that plays itself after 10 idle seconds; any input ends it.
- Controller-first menus, with invert toggles for the sticks in Settings.
- A "Controller or keyboard required" card with a Settings button on touch-only devices.
- Checkpoints and Continue.
- Up to 4 players: split screen on one machine, or AI Hub co-op where everyone defends one house.

**Testing:**
- The headless runs (whole story, demo, checkpoints, hot doorknob, zipline) pass.
- An emulated PS5 controller run passes, including the invert toggles.
- The AI Hub harness passes all six scenarios: 1, 2, 3 and 4 players with lag and packet loss, the host leaving, a server-hosted round, and no splash card.
- Nobody has played it with a real controller on a TV, or heard the sound; that is the one check I'd still do.

**One mistake:** while saving engine notes to your Claude memory, I overwrote a note other sessions were writing to at the same time. I rebuilt it exactly from their transcripts and added my findings, so nothing was lost.

### Source Information
- Date: 2026-11-01 14:09
- Source: Home Alone (1990 film, written by John Hughes, directed by Chris Columbus). Zone Alone is an original spiritual successor with its own characters (Kip Fennimore, the Slush Bandits Sal and Dewey, old Mr. Haddock), house and script.
- Genre and Perspective: trap-laying stealth / home-defense action (plan by day, defend by night). Main camera: three-quarter top-down (pitch 55). The player can switch to isometric and top-down at any time (R3 / V).
- Tech: my-3D2dge v0.85.1, the full 2D engine from the handoff package (canvas 2D, no dependencies), with CC0 furniture and holiday shapes from its asset store (Kenney, KayKit), cut down to the pieces used. AI Hub Session Protocol v1, client 1.3.0 (session.js, unmodified). One HTML file with no network dependencies.
- Art Direction: the engine's native retro-modern pixel style. PS1 resolution (320x240, expanded to fill the screen), shapes drawn by code, HD Humanoid puppets, canvas lighting from lamps, firelight and Christmas lights, dithered snow.
- Animation: the engine's native procedural rig system. E.Humanoid puppets are posed every step from motion (gait, sprint lean, sneaking, hanging, falling flat, getting up, cheering, built-in E.MOVES strikes). E.Mover handles traversal; tweens and coroutine scripts drive the cutscenes.
- Audio: chiptune music written as code on the engine's synth: three original themes (title waltz, battle-plan caper, family stampede) and arrangements of public-domain carols (Deck the Halls, We Wish You a Merry Christmas, Carol of the Bells). Synthesized slapstick sound effects. Animalese-style gibberish voices synthesized letter by letter through formant filters, no samples.
- Online: AI Hub co-op for 1-4 players defending one house. The host (or the hub's server) runs the bandits, traps, loot and clock; each copy moves its own kid; snapshots go out 12 times a second with reliable event batches. Also local co-op on one machine: drop in with Start on a second controller or 2 on the keyboard, in split screen.
- Testing: headless Node runs of the real engine and game (fixed steps, scripted input, teleports; story, attract, checkpoint, knob and zipline runs). Playwright/Chromium screenshots of every scene and view. An emulated DualSense run (menus, movement, the invert toggles, every button). The AI Hub harness at 1, 2, 3 and 4 players with 150 ms latency, 50 ms jitter and 5% loss, a host leaving, a server-hosted round, and no splash.
- Research: none beyond the engine's handoff docs (API card, guide, kits, asset card) and the AI Hub protocol README. The film's beats are from general knowledge.
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-opus-5-5, reasoning effort xhigh
- Usage: about 1 h 5 min of session time (14:09 to about 15:15). API cost and token counts unknown: no usage meter is visible to the model.

### Testing Feedback
- How many issues did testing catch? 25 issues in the game: 15 from screenshots (layout, readability, look), 8 from headless runs (AI, pathing, rules, balance) and 2 from the AI Hub harness. The emulated-controller run found none.
- How many would be critical / game breaking? 4 broke the game: bandits snagged on furniture (flow fields ignore furniture), a cutscene tween left the van off the map so the story's night could not be lost, the co-op settings menu closed itself, and a ready key pressed before the hub's welcome was lost. 2 more silently disabled a feature: a hot knob on the back door could never fire, and bandits never followed Kip onto the zipline.
- Most helpful test: the scripted end-to-end story run in headless Node (intro to morning to plan to pizza to night to ending), with the AI Hub harness a close second for the protocol details.
- Least helpful test: the asset-sheet lints (low contrast against a generic floor) for furniture that sits on custom carpets; the screenshots told me more.

### Engine Feedback
- What I liked most: one game's worth of systems composes in a few lines. E.Mover, E.sees, E.Suspicion and FlowField gave me a full stealth AI. E.Shell gave a modern HTML HUD plus the standard pause, settings and rebinding. The shape store furnished a whole house. Deterministic headless stepping (game.advance) made testing fast and exact.
- Where I got stuck or guessed wrong: game.resume() after game.menu('settings') closes the menu (in sessions I open ui.show('settings') instead). FlowField ignores map.solid furniture. Wall `cut` is a type property, so the facade needed a second, uncut TileMap. The 5x7 font has no middle dot. E.Menu skips disabled items (my test assumed it didn't). Joined players keep their half of the keyboard until removed.
- The most important thing I built myself: a two-storey house. Two TileMaps share coordinates, stairs and a zipline move bodies between them, each bandit has a flow field per floor, and effects are filtered by the floor in view. Also the trap system, the co-op netcode and the gibberish voice synth.
- The hardest part: multiple levels. A cell is one column (nothing passes under things), and particles, weather and lights are global, not per map, so a second floor means separate maps and careful filtering.
- If I had to remove or overhaul one thing: the baked wall-cut rule. Make cutting a per-draw camera option (cut on or off, or a cut plane) instead of a property of each wall type.
- If I could change one thing: let FlowField respect map.solid footprints, or take a walkable(cx, cy) predicate and a cost layer, so AI paths round furniture without blocking cells for the player too.

### Prompt Feedback
- What I liked most: an open creative brief (pick the movie, pick the genre) with concrete, checkable requirements: attract mode at 10 idle seconds, invert toggles, a touch-only message, the hub protocol, and the three report sections. It is clear when the work is done.
- What was confusing: the SOURCE placeholder leaks into sentences ('an original spiritual successor to pick a famous movie'). 'Testing: testing parameters allowed' is ambiguous. 'Multiplayer ... as well as for the game on its own' could mean either 'still works alone' or 'has its own multiplayer' (I did both, with local co-op). The file-name template doesn't say how to write a title with spaces. 'Usage' asks for cost and tokens, which the model cannot see.
- The hardest thing to do: fitting a story, a plan phase, a night phase, an attract AI and hub co-op netcode into one coherent, feature-complete demo, while keeping the chat reply, the in-game About screen and the HTML comment identical.
- If there was one test I could have run: a real playtest with a physical DualSense on a TV, judging feel, readability at ten feet and the mix of music, effects and voices. Or the AI Hub repository's hub-check.mjs, with an emulated DualSense in every frame.