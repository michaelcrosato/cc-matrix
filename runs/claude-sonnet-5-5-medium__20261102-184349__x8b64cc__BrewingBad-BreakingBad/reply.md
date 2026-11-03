The final build of **Brewing Bad** is bundled and re-checked. The AI Hub harness passes on it in three runs: 4 players with latency and packet loss, the same with the host leaving, and 2 players. I also searched the game's source files for TODO, FIXME, placeholder and stub and found nothing. `exit-interview.json` parses and every field is filled. After the last edit I re-ran the scripted playthrough from the ambush to the results screen with no console errors, and the touch-only check.

The bundle is `BrewingBad-BreakingBad-claude-sonnet-5-5-medium-20261102-184349.html` in the work folder root. It is also the build the same text appears in on the in-game About screen. I did not test with a real controller or real iOS Safari.

## Source Information
- **Date:** 2026-11-02 18:43
- **Source:** Breaking Bad (2008-2013)
- **Genre and Perspective:** Action-stealth with crafting minigames (the cook, the laundry), gang shootouts and a boss fight. Three-quarter top-down (the engine's threequarter view); switchable to top-down or isometric.
- **Tech:** my-3D2dge v0.85.1 (handoff package, full engine, unmodified, inlined into one HTML file); AI Hub session client 1.3.0 inlined; plain JavaScript, no other libraries.
- **Art Direction:** The engine's native HD-pixel look: expanding 320x240-minimum screen, textured TileMap walls and floors, code-drawn props, Humanoid rigs with outfits, canvas lighting that darkens toward dusk.
- **Animation:** The engine's native system: procedural Humanoid rigs, E.Attack wrench swings, poses and expressions, particles and hit effects.
- **Audio:** All in code: chip-synth music per scene and sound effects; Animalese-style gibberish voices, one pitch per speaker; no recorded audio.
- **Online:** AI Hub Session Protocol v1, ghost mode, 1 to 4 players. Each copy sends its player's position about 8 times a second and shows the others' characters; nothing else is sent.
- **Testing:** Headless Chromium and WebKit through Playwright: smoke runs, a scripted full playthrough, the attract-mode loop on desktop and on a touch-only phone profile, the AI Hub harness (2 and 4 players, latency and loss, host-leave, re-run on the final build), a fake DualSense for symbol and axis-flip checks, and screenshots at phone, tablet, desktop and ultrawide sizes. No real controller and no real iOS Safari.
- **Research:** None beyond the engine docs and the AI Hub protocol. The tone comes from general knowledge of the show, and the story is an original riff.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown.
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium.
- **Usage:** unknown (token and cost estimates are not exposed to the session).

## Testing Feedback
- **How many issues did testing catch?** Seven: every enemy deleted each frame (`E.prune` used backwards), a missing middle-dot glyph shown as "?", a title menu overlapping the characters, the cook's demo AI missing its heat band, hit notes drawn past the line, the Controller toggles landing on the Controls screen instead of Settings, and a shared test port that served another run's game to the hub harness. Review also flagged leftover no-op code, which I removed.
- **How many were critical or game breaking?** One: the `E.prune` mistake, which left the world with no cops, goons or boss.
- **Most helpful test:** The attract-mode soak plus a scripted full playthrough with debug snapshots. It drove the cook, the laundry, the fight and the boss through the real scenes. The AI Hub harness came a close second.
- **Least helpful test:** Static screenshots of the title at several viewport sizes. They found no layout problems because the engine's expand mode already handled every shape.

## Engine Feedback
- **What did you like most about the engine?** The look comes almost free: cutaway TileMap walls, shaded Humanoid rigs, materials, canvas lighting and particles. The pause menu, settings, controls rebinding, dialog with portraits and the HTML HUD also come built in, so the time went into design. The fixed step made headless tests repeatable.
- **Did you get stuck or guess wrong?** Yes. `E.prune` removes the items the callback returns true for, which I read as "keep". Settings in the "Controller" group show on the Controls screen, not Settings, and the font has no middle dot. I also guessed the dialog voice could be per speaker; it takes one effect name, so I read the text as it types and play my own blips.
- **Most important thing you had to build yourself?** The game's brain: story scripts over dialog, the cop's sight and suspicion, the goons and the boss's telegraphed charge, the cook and laundry minigames, the attract-mode AI, the gibberish voices, the stick-flip patch, the touch-only notice and the AI Hub ghost sync.
- **Hardest part about using the engine?** Working out what a call means from one index line: `prune`'s direction, the dialog's internals for typed-text sounds, and which direction a screen vector becomes on the ground in each view when an AI steers.
- **Remove or overhaul one thing?** The `prune` helper. Rename it `removeIf` or make the predicate a keep test.
- **Change one thing?** Give every game a debug handle on `window` by default (scene, state snapshot, `go()` and teleport), because every browser test had to add one by hand.

## Prompt Feedback
- **What did you like most about this prompt?** A single clear goal with concrete done checks (attract mode after 10 seconds, the 10-foot controller philosophy, the hub protocol, the exit-interview file) and freedom to pick the genre. The random title step was a small, fun commitment.
- **What was confusing?** "Engine native perspectives" for a 2D engine's views, and what the source's subject (a drug trade) should mean in a game; I kept the cook abstract and chemistry-free. The file name pattern with the source's name in it, and which folder the files go in, took a second read.
- **What was the hardest thing to do?** Fitting a whole vertical slice (title, attract, story, three minigames, combat, boss, settings, About, hub) into one pass, and checking the controller experience without a pad in hand.
- **If there was one test you could have run?** A real DualSense played on a TV across a room for fifteen minutes, to judge aiming, prompts and the stick-flip toggles by feel.