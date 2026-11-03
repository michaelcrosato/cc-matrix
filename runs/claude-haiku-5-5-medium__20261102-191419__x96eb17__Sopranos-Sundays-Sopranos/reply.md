The game is built and bundled, and the exit interview is written. The bundle passes the AI Hub harness (16 of 16 checks) and the headless runs with no page errors.

**Files** (in the work folder root)
- `Sopranos-Sundays-Sopranos-claude-haiku-5-5-medium-20261102-191419.html`: single file, 1.3 MB, with the full my-3D2dge engine and the AI Hub client inlined.
- `exit-interview.json`: parses; every field is filled, and `series` is empty by design.
- `Sopranos-Sundays-Sopranos-claude-haiku-5-5-medium-20261102-191419/dev/`: sources, `build.mjs`, and the engine and hub copies.

**Choices I made**
- **Title:** "Sopranos Sundays". I brainstormed 50 candidates and picked one with `crypto.randomInt`.
- **Genre and perspective:** Action, third-person by default. V (or pad R3) cycles to top-down and isometric.
- **Game:** three chapters. Collect envelopes from three shopkeepers (pay, talk, or shake them down); clear Frankie's crew at the garage; a session with Dr. Marchetti; Sunday dinner with Mama Ricca; then the pool fight with Frankie. Systems include melee combo, pistol with aim assist, dodge, guard, sneak, jump, meatball healing, cash and ammo pickups, a journal, three save slots, and dialogue choices.
- **Controls:** keyboard, mouse and pad, with PlayStation glyphs by default and Xbox in Settings. Settings adds stick invert left-right and up-down. Mouse facing follows the pointer when the mouse is the last device used.
- **Attract mode:** after 10 seconds on the title, a bot plays with no damage, and any real press returns to the title.
- **Touch-only devices:** the title shows "Controller or keyboard required", touch buttons are switched off, and the attract run still plays.
- **Multiplayer:** AI Hub parallel mode, 1–4 players, three-minute round, scored on cash, respect, kills and calm. Progress is reported every second and the result is sent at time-up, at the end of the story, or on a win.

**Testing**
- Headless Chromium through Playwright: title, play, attract demo, a timed fuzz of every control, the full chapter chain via injected flags, the end screen, save and restore, a phone profile, and the settings menu.
- The AI Hub harness with two players (conformance PASS).
- Not verified: a real DualSense or any other real gamepad (so the glyph and invert toggles are untested on hardware), real iOS Safari, mouse aim in a real session, and the audio by ear. I checked the music and Animalese only for errors.

**Unknowns:** cost and token usage are unknown; I have no estimates. The claim that the pool spawn would have blocked the finale is from reading the map, not a reproduced failure.

---

## Source Information

- Date: 2026-11-02 19:14
- Source: The Sopranos (1999-2007)
- Genre and Perspective: Action, third-person crime action with dialogue chapters. Third-person by default; V (or pad R3) or the pause menu cycles to top-down and isometric.
- Tech: my-3D2dge 0.85.1 (single-file 2D engine, procedural pixels, Canvas 2D, Web Audio); AI Hub client aihub-session 1.3.0 (protocol 1); no other dependencies
- Art Direction: engine-native pixel look (PS1 style, 320x240 internal), dusk palette with neon signs and a North Jersey skyline
- Animation: the engine's procedural Humanoid rig, with its move set (jab, cross, haymaker, overhead)
- Audio: all made in code. Four music tracks, sound effects, and Animalese (one blip per letter at its own pitch). No recorded voices or sound files.
- Online: AI Hub session, parallel mode, 1–4 players, three-minute round
- Testing: headless Chromium via Playwright (desktop and phone profiles); AI Hub harness with two players and a 40-second round
- Research: read the engine's agent guide and API header and the AI Hub session protocol; no web searches
- Environment: Claude Code CLI (headless); Linux; browser unknown
- Model: Anthropic, claude-haiku-5-5, reasoning effort medium
- Usage: unknown

## Testing Feedback

- **How many issues did testing catch?** 11. Seven came from the test runs; four came from reading the map, the code and the screenshots.
- **How many were critical or game-breaking?** 2. The attract demo's own button taps counted as player input, so it left every conversation half done. A spawn point sat in the pool water, a blocked cell, where the finale's boss would have stood (from reading the map, not reproduced).
- **Most helpful test:** the attract run with a state log every tenth of a second. It showed the stalls, the bot stuck on a wall, and the demo leaving after a win.
- **Least helpful test:** the random key fuzz. It found no exceptions, but it can't say whether the game is right.

## Engine Feedback

- **Liked most:** the Story module (conversations as data, flags, quests, state for a save), and the standard pause, settings, glyphs and corner menu.
- **Stuck or guessed wrong:** the settings' `saved` flag is true before anything is stored, so a "set only if none saved" check never runs. The engine has no stick invert pair, only the aim's. Music names must be registered before use.
- **Most important thing I built myself:** the town layout, the crew's sight and chase, the chapters and objectives, and the per-letter Animalese hook.
- **Hardest part:** a 1.2 MB single file of 14,706 lines. The API had to be read from source comments and the agent header.
- **Remove or overhaul:** the settings' `saved` flag. Name it for what it is, or default it to false.
- **Change one thing:** an input preset that merges with a base, so a game adds one action without copying the whole table.

## Prompt Feedback

- **Liked most:** the controller-first rules, the hub protocol link, and the exit-interview shape, which made "done" checkable.
- **Confusing:** the bracketed file names and template title; the Testing questions, which could mean either the test plan or its results; and whether a hub round needs its own score.
- **Hardest:** fitting the attract mode, the hub round and the full engine's menus into one build without any of them breaking the others.
- **One test I'd add:** a scripted play-through using real inputs for every chapter, plus a pad emulation for the invert toggles and glyphs.