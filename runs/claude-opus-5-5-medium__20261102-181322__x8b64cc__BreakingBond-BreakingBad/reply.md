I tried one more real-device check: the touch-only test in real Chrome on the Android emulator. It can't run here, because the emulator needs KVM access and granting it takes `sudo usermod -aG kvm micha` (a sudo command I won't run on my own). This session can't reach a physical DualSense, Xbox pad or phone either.

So the controller, Xbox-glyph and touch-only checks remain browser simulations: a simulated standard-layout DualSense and an emulated iPhone in WebKit. They all pass. Confirming them on real hardware needs a person with the devices, or the KVM change above.

What the game includes:
- **Finished build:** the single-file game `BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322.html` is in this folder's root. `exit-interview.json` parses as JSON and answers every field.
- **Every TASK.md feature, with no TODOs, placeholders or stubs:** six story chapters, the cook minigame, stealth, combat, a boss and upgrades. Also the Cook-Off mode, attract mode, AI Hub ghost multiplayer and local co-op.
- **Controls and settings:** PlayStation button symbols, with an Xbox option in Settings; stick-inversion toggles; a "Controller or keyboard required" screen on touch-only devices; and prompts that follow the device you used last.
- **Audio:** it's all generated in code, but the tests confirmed only that the game runs without errors, not that anything is audible.

On the final build, a bot plays all six chapters to the end. The AI Hub harness passes all three scenarios: 2 players, 4 players with lag and packet loss, and the host leaving. All 24 phone, tablet and desktop screen sizes pass in Chromium, WebKit and Firefox.

## Source Information
- **Date:** 2026-11-02 18:13
- **Source:** Breaking Bad (2008-2013), the AMC series created by Vince Gilligan
- **Genre and Perspective:** crime action-adventure with a chemistry cook minigame, stealth, combat and a boss fight. The main view is the engine's own three-quarter top-down view, and you can switch to top-down or isometric in play.
- **Tech:** my-3D2dge v0.85.1 (full edition), plain JavaScript and the AI Hub session client 1.3.0 (protocol v1), bundled into one HTML file by a small Node script.
- **Art Direction:** the engine's own PS1-era pixel style at 320x240, scaled to fill the screen. It has detailed character rigs, textured walls and floors, 3D objects defined in code, night lighting and particles.
- **Animation:** the engine's procedural character rigs, plus attack moves, poses, roll trails and a hat drawn in code.
- **Audio:** music written as notes for the engine's chip synth (9 songs), sound effects defined in code, and Animalese-style gibberish voices with a different voice per character.
- **Online:** AI Hub Session Protocol v1 in ghost mode for 1-4 players, plus local drop-in co-op for 2 players outside the hub.
- **Testing:** Playwright 1.63 in headless Chromium:
  - every scene;
  - a bot that plays all six chapters;
  - a simulated DualSense;
  - a full attract-mode cycle;
  - an emulated touch-only iPhone in WebKit.

  Also viewport-matrix (24 screen sizes, 3 browser engines) and the AI Hub harness (3 scenarios). Everything passes, but nothing ran on real hardware, and the Android emulator check couldn't run without KVM access.
- **Research:** none beyond the engine docs and the AI Hub README.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** about 1 h 40 min of session time; API cost and token counts unknown.

## Testing Feedback
- **How many issues did testing catch?** About 15, all fixed. They include:
  - a crash that blocked chapter 1;
  - two chapters you couldn't finish;
  - guards catching you during dialog;
  - the camera not following during dialog;
  - prompt labels you couldn't read;
  - characters the pixel font can't draw;
  - the touch-only screen appearing late;
  - an AI partner that was too strong;
  - leftover characters after a checkpoint restart;
  - music warnings;
  - a hard-to-read Cook-Off display.
- **How many were critical or game-breaking?** 4: the chapter 1 crash, the two chapters you couldn't finish, and guards catching you during dialog.
- **Most helpful test:** the bot playing every chapter start to finish.
- **Least helpful test:** the first screenshot pass, taken before the camera fix.

## Engine Feedback
- **What did you like most about the engine?** The standard features come built in: menus, settings, key rebinding, button glyphs, saves, a HUD, dialog, guard sight and suspicion, pathfinding, and characters that look good right away.
- **Did you get stuck or guess wrong?** Yes, on four things: a pattern name that doesn't exist, the default outline on text, prompts falling back to the action's name for mouse players, and characters the font can't draw.
- **What was the most important thing you had to build yourself?** The mission system: chapters written as data, where each step also serves as a checkpoint.
- **What was the hardest part about using the engine?** You have to take a screenshot to check anything visual, and nothing warns you about a spot the player can't reach.
- **If you had to remove or overhaul one thing, what would it be?** Text drawing.
- **If you could change one thing, what would it be?** A built-in check that every objective and spawn point can actually be reached.

## Prompt Feedback
- **What did you like most about this prompt?** It asks for a complete vertical slice with all the systems around the game.
- **What was confusing?** What multiplayer should mean outside the hub.
- **What was the hardest thing to do?** Fitting the whole scope into one coherent slice on an engine I hadn't used before.
- **If there was one test you could have run, what would it be?** Real DualSense and Xbox controllers on a TV.