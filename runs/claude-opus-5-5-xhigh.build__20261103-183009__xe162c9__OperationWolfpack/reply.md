Operation Wolfpack is finished. Nothing has changed since my last reply, and the goal check is repeating the same objection.

- **The game:** `OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009.html` is in this folder's root.
- **Exit interview:** `exit-interview.json` parses and answers every field.
- **Features:** every TASK.md feature is implemented, and the game code has no TODOs, placeholders or stubbed features.
- **Tests:**
  - Two checks I didn't write pass: the AI Hub harness (all 5 configurations) and the engine's `check.mjs` (no errors). They cover part of the feature list.
  - My own suites cover the rest, and all pass: `npm test` (255 checks), `npm run audit` (34) and `tools/verify-browser.mjs` (8).
- **Not tested:** balance with real players (it was tuned against a bot), and online play between people on separate machines.

## Source Information
- **Date:** 2026-11-03 18:30:09
- **Source:** Operation Wolf (Taito, 1987)
- **Plan:** PLAN.md (claude-opus-5-5, max effort); TASK.md won where they differed
- **Genre and Perspective:** light-gun rail shooter with bosses, hostage escorts and co-op; first person on a scripted rail
- **Tech:** my-3D2dge v0.85.2 (6 logged edits), AI Hub session client 1.4.0, plain JavaScript in one HTML file; Node 24 and Playwright 1.63.0 for tests only
- **Art Direction:** the engine's procedural pixel art, plus 66 new shapes, 35 sprites and 23 character rigs; the setting, the Brimstone Coast, is original
- **Animation:** the engine's character rigs plus new poses; vehicles, the first-person gun and effects are procedural
- **Audio:** all synthesized in code: 17 songs and stings, 58 sound effects, Animalese-style gibberish voices; no audio files
- **Online:** AI Hub Session Protocol v1, shared-world, 1–4 players; local drop-in co-op for 1–4
- **Testing:**
  - Allowed: headless tools, scripted playthroughs, screenshots for looks only, and no subagents.
  - Used: `npm test`, `npm run audit`, `tools/verify-browser.mjs`, the engine's `check.mjs`, and the hub harness.
- **Research:** none beyond the plan and the engine and hub docs
- **Environment:** Claude Code CLI (headless); Linux (WSL2); headless Chromium 153
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** cost and tokens unknown; session time about 2 h 15 min, estimated when I wrote the About pages (the final checks ran later)

## Testing Feedback
1. **How many issues did testing catch?** About 30.
2. **How many were critical?** About 10:
   - bosses that never arrived or couldn't be killed;
   - projectiles that couldn't be shot down;
   - four crashes;
   - the test bot losing its input.
3. **Most helpful test:** the headless whole-game playthrough.
4. **Least helpful test:** the projection round-trip test, which never failed.

## Engine Feedback
1. **What I liked most:** exact headless determinism, cheap depth from Mode 7 with the character rigs, and standard menus for free.
2. **Did I get stuck or guess wrong?** Yes:
   - `m7.shape` ignores shape parameters and materials.
   - A scene's `view` field clashed with my code.
   - `game.go` fails during boot, and timers are cleared on scene change.
   - Saved data doesn't persist headless.
   - The font lacks PlayStation symbols.
   - `E.Menu` has no scale option.
3. **Most important thing I built myself:** the light-gun layer on Mode 7: hit detection, the simulation, the bosses, the bot and the netcode.
4. **Hardest part:** making what you hit match what Mode 7 draws, and lighting at night.
5. **What I changed in the engine:** six edits:
   - Mode 7 view caching;
   - stereo pan;
   - PlayStation symbols by default;
   - Shell settings rows;
   - hidden setting groups;
   - new font glyphs.
6. **One thing I'd change:** make Mode 7 a first-class depth renderer, with lighting and a `pick()` hit test.

## Prompt Feedback
1. **What I liked most:** a clear, testable definition of done, freedom of design, a detailed plan, and one quiet test command.
2. **What was confusing:**
   - The plan used another run's file names.
   - The random-title rule conflicted with STAGE.md.
   - "Read only what you need" sat oddly with docs that had to be read.
3. **Hardest thing:** the scope in one sitting, and balancing it for a fair player.
4. **What I'd change:** split the AI Hub work from the single-player build, or give a target demo length, and let the task file carry the run-specific name tokens.