**HAMERICAN FOOTBALL** is finished: `HamericanFootball-AmericanFootball-claude-opus-5-5-medium-20261104-070556.html` in this folder's root. The one command `npm test -- --browser` now runs every check, including the real-browser ones, and passes all 985. `exit-interview.json` parses with every field answered.

What changed this round:

- **Online prediction, measured:** the netcode test now measures, at 150 ms latency and 5% loss, how often the host keeps the predicted player within 2 yards of where the client was within the network delay (the last 300 ms).
  - The first measurement was 72% (the plan asks for 95%), from three real bugs:
    - the client kept correcting itself toward a round-trip-old snapshot;
    - the host rejected too many of the client's position reports;
    - dives weren't treated as locked.
  - After the fixes it holds 98% over about 1,500 samples per run, in three separate runs. It's logged as issue 43 in `ISSUES.md`.
- **Voices in a real browser:** a check now plays a cutscene in Chromium and counts the Web Audio nodes the voice synth creates. While one line typed, it added 94 oscillators and 71 formant filters on the voices bus. That proves synthesis runs; it can't judge how the voices sound.
- **AI Hub harness:** now runs inside the same command; 4 of 4 configurations pass.
- **Balance:** the plan's Play Lab bands still pass at n = 30, all 17 plays inside. That run is from before this round's online changes, which don't touch the match rules or AI.
- **Frame rate:** not optimized. TASK.md says "Out of scope (handled later): FPS targets, optimization". On an idle machine it measured 45–60 fps at 720p and 45–50 fps at 1080p, and the 1080p screenshots read clearly.
- **Issue counts:** they come from `ISSUES.md`, my itemized session log of 43 issues, not from test-runner output.

## Source Information
- **Date:** 2026-11-04 07:05:56
- **Source:** American football (over the top arcade style)
- **Plan:** PLAN.md (the title was redrawn with a real RNG, per TASK.md: Hamerican Football)
- **Genre and Perspective:** arcade sports (7-on-7 American football) with beat-'em-up hits and a story campaign. The camera is a sideline broadcast view (custom 50°), with Sky Cam and Blimp options, a Kick Cam behind the kicker, and field-level, isometric and reverse replay angles.
- **Tech:** my-3D2dge v0.85.2 handoff (modified), AI Hub session client 1.4.0, the mocap runtime with an 18-clip set, Canvas 2D and Web Audio. Tests use Node 24.22.1 and Playwright 1.63.0.
- **Art Direction:** the engine's native HD pixel-art rigs at PS1 resolution, code-painted fields, stands and crowds, and five lit stadiums with weather. New helmets, pads, numbers, logos, card art, four cutscene sets and a marching band.
- **Animation:** the engine's procedural rigs and E.MOVES, joint post-processing (tilt, roll, lift), and 18 motion-capture clips (Quaternius, Mesh2Motion, CMU).
- **Audio:** all in code: 11 original songs with layers and stings, 50 sound effects, a crowd bed with chants, and an Animalese/Simlish babble voice synth.
- **Online:** AI Hub Session Protocol v1, shared world, 1–4 players.
  - The host runs the world and sends snapshots at 14 Hz.
  - Each client predicts its own player; the host accepts its reported position unless the player is locked. Measured: within 2 yards of the host 98% of the time at 150 ms latency and 5% loss.
  - Each client runs its own play-call screen and kick meter.
  - Local 1–4 players also work on one machine.
- **Testing:**
  - *Allowed:* headless tests with `game.advance` and `game.debug`, a scripted whole-game playthrough, one command that prints only failures and a count, and screenshots only for what a script can't check.
  - *Used:* `npm test -- --browser` (16 suites, 985 checks): rules, AI, the story playthrough from the prologue to the credits, the attract loop, netcode with measured prediction error, the TASK.md requirements, real-browser voice synthesis, and the AI Hub harness in all 4 configurations.
  - *Also used:* the plan's bands at n = 30 (all 17 plays inside), Playwright screenshots including the 1080p look check, and the engine's check tool.
- **Research:** none beyond the engine and AI Hub documentation.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown. No token or cost figures are visible to me. The session ran about 2 h 15 min (07:06 to about 09:20).

## Testing Feedback
1. **How many issues did testing catch?** 43, each fixed and listed with its fix in `ISSUES.md`:
   - **Headless suites (15):** for example, a new match replaying the previous match's play calls, a crash on a kick play, and the touch-only gate unlocking itself.
   - **Browser runs and screenshots (17):** for example, three crashes and a syntax error, a black field, 12 fps from field rebakes, and characters the pixel font lacks drawn as "?".
   - **Play Lab and the plan's bands (9):** for example, runs averaging 13 yards, a 0.8 s pass rush, and blocks that never broke off.
   - **Behavioural tests added at the end (2):** the Hall of Fiasco skipped games whose local side was CPU-driven, and online prediction held only 72% within 2 yards (now 98%).
2. **How many were critical or game-breaking?** 9:
   - the boot crash, the input crash and the update crash;
   - the syntax error that stopped the page loading;
   - the black field;
   - the stale play calls;
   - the kick-play crash;
   - 12 fps rendering;
   - the 0.8 s pass rush.
3. **Most helpful test:** the rules suite's back-to-back scenario runs, which exposed the stale play calls. The prediction measurement was close behind: it turned "prediction exists" into three real fixes.
4. **Least helpful test:** my first spin test, which could never fail until I rewrote it, and the check tool's stock camera views.

## Engine Feedback
1. **What I liked most:** the HD Humanoid with mocap, and exact headless `game.advance`. The whole suite, including a full playthrough, runs in about two minutes.
2. **Did I get stuck or guess wrong?** Yes:
   - `E.hex` returns `[r, g, b]`, not an integer.
   - `input._used` is an engine internal, and using it broke input.
   - Every zoom level is a full floor rebake.
   - Calling `game.go` before the browser boot finished caused warnings.
   - The pixel font silently draws "?" for characters it lacks.
3. **The most important thing I built myself:** the football simulation and its AI for 14 athletes and the coach, then the shared-world netcode with prediction and reconciliation.
4. **The hardest part:** hidden caches (floor bakes per view and zoom) and a very large API.
5. **What I changed in the engine, and why:**

   | # | Change | Why |
   |---|---|---|
   | E1 | Glyphs added to both pixel fonts | PlayStation symbols drew as "?" |
   | E2 | PlayStation/Xbox button symbols on Settings | TASK.md asks for PS glyphs with an Xbox option |
   | E3 | A gear hook in the HD Humanoid's draw | Pads, numbers and the carried ball inside the rig |
   | E4 | A football helmet hat style | A helmet that reads as football |
   | E5 | A per-letter dialog voice | The Animalese voices |
   | E6 | Named audio buses | Separate voice and crowd volumes |
   | E7 | Dev settings rows on any Shell screen | Dev mode's live tuning sliders |
   | E8 | Settings without pausing | AI Hub sessions must not freeze |
   | E10 | A floor-bake cache of 16 instead of 6 | The field was rebaking every frame |

   The details are in `ENGINE-CHANGES.md`.
6. **One thing I'd change:** zoom-independent floor bakes, public access to the font's glyph bitmaps, and a warning when the font has no glyph for a character.

## Prompt Feedback
1. **What I liked most:** concrete deliverables and checks, and specific 10-foot, controller-first UX rules.
2. **What was confusing:** TASK.md wants an RNG-picked title, while STAGE.md says to use the plan's. The plan's scope also far exceeds one medium-effort session, which conflicts with "no stubs".
3. **The hardest thing to do:** believable, balanced 7-on-7 AI, and multiplayer that holds up under latency and passes the harness. A full shared `/tmp` crashed Chromium until I moved its temp folder.
4. **What I'd change:** state a time or token budget, mark the plan's features must/should/could, say which file decides the title, and note shared-machine limits.