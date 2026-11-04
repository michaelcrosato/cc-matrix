**Tide Crisis 3** is built and the final test run passed: `node tests/run.mjs --all` gave 402 passed, 0 failed. That run covers the headless suites, bot playthroughs of every stage, a browser check at four window sizes, and all four AI Hub harness scenarios.

- **The game:** `TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213.html`, a single file that runs from `file://` with no network.
- **Exit interview:** `exit-interview.json` parses and every field is filled.
- **Dev files:** in the `TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213/` folder, with a short README.

**What's in it**
- **Story:** three stages (HARBOR LIGHTS, STORM SIGNAL, THE TIDEWALL) with 15 areas, briefings, cutscenes and an ending with credits.
- **Bosses:** Stingray → Barracuda, Hammerhead, and Scylla → Admiral Krake with a FINAL SHOT. Mini-bosses: Bulldog, The Gull and Seawolf.
- **Combat:** hold cover to dodge and reload, four weapons, red "crisis" rings on every shot that will hit you, and a TIME limit on every area.
- **Enemies and targets:** ammo carriers, Red Tide elites, grenades, rockets and torpedoes you can shoot down, shields, rushers, snipers, drones, jet skis, a hostage, civilians, explosive barrels, life rings and intel bottles.
- **Arcade frame:** score chains, ranks, continues, high-score initials, and a Training range.
- **Modes:** split-screen co-op, plus AI Hub online co-op for 1–4 players with the game's own ready card.
- **Extras:** dev mode from the pause menu (live sliders, reset to defaults, actions, overlays, a free camera), and an attract demo after 10 s idle.
- **Controls:** PlayStation glyphs by default with an Xbox option, a mouse-aimed reticle, and a "Controller or keyboard required" notice on touch-only devices.

**What I checked by eye and what I didn't**
- **Seen in screenshots:** the title, menus, About, pause, dev panel, split screen and most areas.
- **Not looked at:** Krake's FINAL SHOT. The tests confirm that hitting it ends the fight and missing it raises the water.
- **Balance:** the test bot clears every stage on Normal without a continue. It's much faster than a person, so the time limits are only roughly tuned for human play.
- **Engine changes:** I made five small patches, logged in `engine/PATCHES.md`.

## Source Information
- **Date:** 2026-11-03 18:32:13
- **Source:** Time Crisis 3 (Namco and Nextech; arcade 2003 on Namco System 246, PlayStation 2 2003)
- **Plan:** PLAN.md
- **Genre and Perspective:** an on-rails light-gun shooter with a cover system, seen from a first-person rail camera (each player has a stand pose and a cover pose); cutscenes use third-person cameras
- **Tech:**
  - my-3D2dge handoff v0.85.2 full engine, patched (PlayStation glyphs, long guns, mouse-wheel codes, audio buses, font glyphs)
  - a custom JavaScript software 3D renderer ("Rail3D"): z-buffered, perspective-correct, banded light, dithered fog
  - AI Hub session client 1.4.0
  - no other libraries
- **Art Direction:** the engine's native PS1-era pixel style in perspective 3D. It uses the engine's materials as banded textures, new procedural materials (containers, lanterns, hazard stripes, lit windows, water), and the engine's Humanoid rigs as depth-tested billboards.
- **Animation:** the engine's procedural Humanoid rigs, driven from the simulation (poses, run, crouch, die, flip, climb, attack moves). Vehicles and mechs are meshes posed in code (gunboat, truck, helicopter, six-legged walker). Camera animation covers ducking, recoil, hit jolt, sway, slow motion and the rail moves.
- **Audio:** all in code:
  - 18 songs on the engine's tracker, including stage themes with layers
  - synthesized sound effects
  - Web Audio ambience
  - an Animalese-style formant gibberish voice for every speaker
- **Online:** AI Hub Session Protocol v1, shared-world co-op for 1–4 players (the host runs the world; inputs go up, snapshots and events come down). Local split-screen co-op for two.
- **Testing:**
  - headless Node suites behind one command, using `game.advance` and `game.debug`
  - bot playthroughs of every stage, of ARCADE to the credits, and of Training
  - Playwright checks of the HTML file at four window sizes
  - the AI Hub harness, all four scenarios
- **Research:** the handoff's engine docs and parts of the engine source, the AI Hub README and harness, and the plan's notes on Time Crisis 3 (from Wikipedia at planning time). No new web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown (I had no token or cost counter). The session ran about 1 h 25 min.

## Testing Feedback
1. **How many issues did testing catch?** About 25. The bot playthroughs and the content validators found most of them: areas that could never be cleared, targets nobody could see or shoot, and crashes. Screenshots found the rest: cover crates blocking the view, glyphs missing from the font, and HUD overlaps in split screen.
2. **How many were critical or game breaking?** Eight:
   - grenade and rocket warnings never counted down, so you couldn't duck in time
   - the Bulldog truck parked behind a container, so area 1-3 couldn't be won
   - enemies left behind by the boat on the canal (two separate cases), so 1-4 never cleared
   - a sluice lock hidden behind a catwalk barrier, so 3-2 never cleared
   - a Training drill stuck on a civilian cut-out
   - a crash when drones entered
   - a load-order crash in the cutscene data
3. **What was the most helpful test you ran?** A full ARCADE run by the bot, logging time, lives and the cause of every hit for each area. It showed which area stalled, and why, within seconds.
4. **What was the least helpful test you ran?** The first smoke test, which only checked for errors after 200 s of play. It passed while the game sat frozen on a continue screen.

## Engine Feedback
1. **What did you like most about the engine?** Humanoid rigs draw from any view, so they dropped into my own renderer as billboards on the first try. `E.materialTile` and `E.shapeMesh` suit a 3D renderer, and the headless `game.advance` makes whole-game bot runs take seconds.
2. **Did you get stuck or guess wrong?** Yes, a few times:
   - timers set with `game.after` before `game.start` are cleared by the first scene change
   - a scene change takes longer than 0.2 s because of its fade
   - a crouching Humanoid's head is taller than crouch-height cover
   - `input.label` returns ✕ for a PlayStation pad, but the font couldn't draw it
3. **What was the most important thing you had to build yourself?** The Rail3D software renderer:
   - perspective-correct textured triangles with near clipping and a z-buffer
   - the engine's banded light, plus fog and a procedural sky
   - depth-tested particles and lines
   - the rig billboards
4. **What was the hardest part about using the engine?** Building first-person perspective on a 2D engine, since the handoff has no 3D. Rigs are drawn with one depth for the whole figure, so hiding enemies behind cover took care.
5. **What did you change in the engine, and why?** Five patches:
   - PlayStation button symbols by default, with Xbox as the option, as TASK.md asks
   - long guns for Humanoids, so soldiers carry rifles
   - `WheelUp`/`WheelDown` as bindable codes, so the mouse wheel switches weapons
   - `game.audio.bus()`, so the voice synth and ambience follow the volume settings
   - new font glyphs: ✕ ○ □ △, an em dash, an ellipsis, a middle dot, a gear, ∞ and ◂
6. **If you could change one thing about the engine, what would it be?** A perspective view for rigs and shapes, so first-person and rail games can use the engine's own drawing queue, lighting and depth sorting.

## Prompt Feedback
1. **What did you like most about this prompt?** The clear contract: exact file names, the feedback sections in three places, one test command, "TASK.md wins" over the plan, and a detailed plan to start from.
2. **What was confusing?** The plan's file names (…max-20261103-174731) and its "inline everything" rule conflict with TASK.md; "TASK.md wins" settled both. The "testing parameters allowed" line in Source Information was ambiguous.
3. **What was the hardest thing to do?** The scope: three stages, six bosses, a 3D renderer, netcode, split screen, attract mode, dev mode and Training in one session, with every area winnable and readable.
4. **What would you change in this prompt?** State the expected session length and which plan items may be cut, and give the required features as a numbered checklist.