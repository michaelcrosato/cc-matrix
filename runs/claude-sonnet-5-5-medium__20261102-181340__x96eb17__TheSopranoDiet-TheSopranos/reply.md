**The Soprano Diet** is built and bundled as one 790 KB HTML file in this folder. `exit-interview.json` sits beside it and parses as valid JSON with every field filled.

The last build loads with no errors, and no TODOs, placeholders or stubs remain in the source. The attract-mode autopilot played the whole episode (yard, shakedowns, ambush, therapy, dream-woods boss, diner, cut to black, results) and looped back to the yard. The AI Hub harness passed for 2 players, for 4 players with latency and loss, and for the host-leave scenario. A 13-viewport WebKit run came back clean. I had no real DualSense or real iOS Safari, so the controller checks used a faked gamepad.

I did not re-run the autopilot tour after the final build, which only changed the About text, the title-screen version label and the results layout.

- **Files:** `TheSopranoDiet-TheSopranos-claude-sonnet-5-5-medium-20261102-181340.html` (the game), `exit-interview.json`, and the dev folder `TheSopranoDiet-TheSopranos-claude-sonnet-5-5-medium-20261102-181340/` with the modules and `build.mjs`.
- **Game:** you play a diet-restricted Jersey boss through one episode of ducks, shakedowns, therapy, a dream in the snow and a cut-to-black diner finale. The title was picked by a random draw from 50 riffs.

## Source Information
- **Date:** 2026-11-02 18:13
- **Source:** The Sopranos (1999-2007), HBO. An original spiritual successor with parody names and no copied text or art.
- **Genre and Perspective:** Action-adventure with beat-em-up brawling, shakedown dialogue choices and a stress-and-diet survival layer. Three-quarter view by default; the player can switch to top-down or isometric and zoom.
- **Tech:** my-3D2dge v0.85.1 (single-file JS engine, canvas 2D, no other libraries); hand-written JS modules bundled into one HTML file; AI Hub session client 1.3.0.
- **Art Direction:** Engine-native procedural pixel puppets (HD Humanoid rigs and Blobs) on lit TileMap levels at a 400x225 base resolution, with weather, lights and drawn controller glyphs.
- **Animation:** Engine-native skeleton rigs: E.Humanoid moves (jab, cross, hook, haymaker, sweep), poses, expressions, Combo/Attack timing, tweens and scripts.
- **Audio:** Code-written chip music (title, town, fight, therapy, woods, diner, boss), code-written sound effects, and Animalese-style gibberish blips for every voice.
- **Online:** AI Hub session protocol v1, ghost mode, 1-4 players. Each copy plays the same seeded Main Street round and sees the others as ghosts. No other networking.
- **Testing:** Efficient, lightweight testing: headless Chromium smoke runs, an attract-mode autopilot playing the whole episode, keyboard and fake-gamepad checks, the AI Hub harness (2 and 4 players, host-leave) and a 13-viewport WebKit matrix. No real iOS Safari or physical DualSense.
- **Research:** None online beyond the engine handoff and AI Hub docs; the Sopranos tone is from memory.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** Session time about 35 minutes (18:13 to about 18:48). Cost and token counts: unknown.

## Testing Feedback
- **How many issues did testing catch?** About 9 real issues: the attract autopilot's scene changes dropped the demo flag, it snagged on NPCs and lamp posts, it stopped short of exit zones, the woods objective pointed at an unreachable waypoint, a 'move' action warning, em dashes that the font cannot draw, and overlapping HUD, boss-bar and results text. A stale web server also gave a false hub-harness failure.
- **How many would be considered critical issues / game breaking?** Two were game-breaking for the flow (the woods and yard soft-locks of the attract tour). None crashed, and no JS errors appeared in any run.
- **What was the most helpful test you ran?** Running the attract-mode autopilot through the whole episode while polling game state and taking screenshots. It exercised dialogue, combat, scene changes, saves and the ending in one go.
- **What was the least helpful test you ran?** The viewport matrix overflow check. It reported all 13 viewports clean, but a full-screen canvas game cannot overflow, so only its screenshots helped. My first long run piped through `tail` also showed nothing until it finished.

## Engine Feedback
- **What did you like most about the engine?** The rigs and lighting give a lot of look for free. The standard features (pause, settings, controls rebinding, save slots), Dialog with live portraits, Combo/Attack and FlowField saved a great deal of work.
- **Did you get stuck or guess wrong?** Yes. `input.label` has no 'move' action. FlowField ignores prop colliders, so the autopilot walked into NPCs. `game.go` clears state, so every scene change had to carry the demo flag. I also guessed a 'ring' prop that does not exist.
- **What was the most important thing you had to build yourself?** The game layer: enemy AI, the stress/gut/respect systems, the shakedown and therapy scripts, the attract autopilot, AI Hub ghost sync, furniture boxes, and drawn PlayStation/Xbox glyphs (the engine font has no controller symbols).
- **What was the hardest part about using the engine?** Confirming exact method semantics without reading the engine source, such as what `combo.hits` expects, overlay coordinates, and how scene changes interact with game state.
- **If you had to remove or overhaul one thing from engine, what would that be?** How area changes work. Re-entering the whole scene through `game.go`, which clears timers and particles, is awkward for rooms within one game.
- **If you could change one thing about the engine, what would it be?** Add first-class solid props and NPC colliders shared by Body and FlowField, and controller glyph shapes in the font.

## Prompt Feedback
- **What did you like most about this prompt?** The clear definition of done and fixed deliverables, the 10-foot controller-first philosophy, the inverted-stick toggle as a realistic constraint, and the instruction to pick the title with a real random generator.
- **What was confusing?** Whether the single-file rule and "dependencies need not be included" conflict, how the bracketed file name should be formatted, what "root" means, and how a hub round with no title screen fits the standalone title and attract mode.
- **What was the hardest thing to do?** Scope: a complete vertical slice with attract mode, hub ghost play, controller glyphs, saves, a story in the source's tone and only code-written assets.
- **If there was one test you could of run, what would that test be?** A deterministic full-episode bot test asserting chapter progression, which I approximated with the attract autopilot, plus a run on a real DualSense.