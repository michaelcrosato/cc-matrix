WIRETAP is finished. Both deliverables are in the folder root: `Wiretap-TheWire-claude-opus-5-5-xhigh-20261103-125815.html` (1.77 MB, sha256 `9077746e…d01f`) and `exit-interview.json`, which parses and answers every field. Every test below ran on that exact build.

## What the last review raised, and what changed

- **The whole story is now played, not just walked.** A new test, `tests/complete.mjs`, plays The Case from New Case to the credits in one run, with state carrying from mission to mission. It finishes each of the 48 beats through its own mechanics, then plays Path B to the credits from the same save. All 51 checks passed, with no engine errors.
- **The plan's numbers are back.**
  - **Chase:** Corey sprints 112 for 10 s, then runs 92. He gets his sprint back after 4 s out of sight and is lost after 8 s, and Lou blocks at 15 s.
  - **Night targets:** $1,500, $1,600, $2,000 and $1,700. The test's simple Tee counted $2,590, $1,570, $1,810 and $1,930. Two nights came in short, by $30 and $190; the count shows SHORT and the story carries on.
  - **Versus:** tuned the way the plan says (20 bots-only 5-minute rounds, adjusting the quota and evidence points until the result holds). On the final build: corner 11, detail 8, draw 1, inside the plan's 35-65% band with draws at or under 20%. The quota ended at $160 a minute; the plan started at $240 and said to tune it.
- **Real input now reaches the later episodes.** A second script, `tests/play2.py`, plays these with real keyboard and mouse events only:
  - the chase (WASD + Shift, E to tackle and cuff);
  - Corey's interview (keys 1-4);
  - both wires (T to minimize, Enter to log, a page decoded on the Q/E wheel);
  - the paperwork (the code card at the evidence cage, the affidavit at the desk);
  - the Board (pins with the arrow keys and Enter);
  - Tee's night (orders on the Q wheel, the pager on Tab);
  - a versus round.

  Sessions that need earlier evidence load saves written by the full-story test.
- **The tests themselves no longer cheat.** No suspicion edits, no film resets, no teleporting through timed runs.

### Game bugs this round found and fixed
1. **Critical:** after Tee's first night, Dana's camera never took another photo.
2. **Critical:** the truck's plate photo could never come into focus.
3. **Critical:** on a controller, the interview's closing "Continue" couldn't be pressed, so every interview was a dead end.
4. On Tee's nights, Tab opened Dana's notebook instead of Tee's pager.
5. Tying Tee to his phone on the Board took him off Lieutenant.
6. In the wire room, a controller player couldn't open a page to decode it.

Earlier in this round I also fixed:
- a count screen that never ended the night;
- a parked car firing its arrival every frame (about a thousand extra people spawned);
- a corner that stopped selling for good after its first shutdown;
- Dana walking instead of running in the chase;
- the affidavit hiding the strongest evidence;
- versus bots spamming shutdowns;
- a comment that broke the versus round's counters.

Three regression checks are now in the headless suite.

### One thing to know
Headless Chromium on this shared machine crashed browser pages now and then; it shows up in the kernel log, including about 23 hours before this session. Those runs were repeated. The wire room, where most crashes happened, passed in Firefox too, and the game's memory stays flat at 11-20 MB over long sessions.

## Evidence for each TASK.md feature

| Feature | Evidence (final build) |
|---|---|
| The Wire successor, WIRETAP, file names | Original cast and places; the bundle and dev folder use the TASK.md names |
| my-3D2dge engine | v0.85.1: iso view, Humanoid rigs, the engine's menus, settings and save slots |
| Full story, every mechanic, no stubs | Full-story test 51/51 (Path A and Path B to the credits); no TODOs or placeholders in `src/` |
| AI Hub multiplayer | Harness: 2 players; 4 players at 150 ms latency, 50 ms jitter, 5% loss; host leave; server host. All PASS |
| Attract mode after 10 s idle, any input exits, works on touch | Headless suite; `play.py`; `browser.py` (iPhone profile) |
| PlayStation glyphs with an Xbox setting, prompts follow the last device, stick inversion | `browser.py` with a simulated DualSense: 13/13 |
| Mouse hover focuses, click selects | `browser.py`; `play.py` (title and Settings by mouse) |
| Controller-first, 10-foot screens | `play2.py`: every screen above driven by keys alone (Board, box, wire, affidavit, cipher wheel, Tee's pager) |
| Touch-only notice with a Settings button, no touch controls | `browser.py` on the iPhone profile; viewport screenshot on the Pixel 10 |
| About & Credits with the 4 sections | `play.py` pages through it with Q/E |
| exit-interview.json | Parses; every field answered (aiHub.series is blank because the game isn't part of a series) |
| Works across viewports | viewport-matrix: 24 shots in Chromium, WebKit and Firefox, all clean (2 Chromium shots crashed and were clean on the rerun) |

Pass counts on the final build: headless suite 30/30, `play.py` 19/19, `browser.py` 13/13, `play2.py` all sessions (one Chromium crash retried).

## Source Information
- **Date:** 2026-11-03 12:58
- **Source:** The Wire (2002-2008)
- **Genre:** Stealth investigation / crime drama, with a corner-management sim (you play the lieutenant) and an asymmetric hidden-identity versus mode (cops vs corner).
- **Perspective:** Isometric 2.5D. Brawler-view interiors for the interview room, the wire room and chambers; HTML case-file screens over the game.
- **Tech:** my-3D2dge v0.85.1 full engine; AI Hub client 1.4.0 (shared-world); vanilla ES2020 in one closure; Web Audio; bundled to one HTML file by a Node 24 script; no runtime network use.
- **Art direction:** Engine-native retro pixel art pushed toward grit: rowhouses, boarded vacants, sodium streetlights, rain, sneakers on the phone wires.
- **Animation:** Engine Humanoid rigs plus the game's own poses built with E.ik3.
- **Audio:** Code-written chip music with layers that rise with suspicion, synthesized effects and ambience, and a gibberish voice per character, with a telephone filter on the wire.
- **Online:** AI Hub Protocol v1, 1-4 players, host-authoritative versus. Local play against bots or in split screen.
- **Testing:** The full-story test; the real-input browser runs; the headless suite; Chromium and WebKit browser checks; the 4 harness runs; the plan's 20-round balance test; viewport-matrix; about 25 screenshots checked by eye.
- **Research:** The engine's handoff docs and the AI Hub protocol README and harness; the show from memory; no other web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown.
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh.
- **Usage:** About 6 hours by the system clock (12:58 to about 19:00); API cost and token counts unknown.

## Testing Feedback
1. **Issues caught:** about 40 real game issues, plus 14 mistakes in my own tests. They came from the data check, the build's syntax check, the AI Hub harness, the browser checks, the longer headless runs, the full-story test, the real-input runs and screenshots.
2. **Critical:** thirteen.
   - AIHub.ready() was never called, which would have voided every online round.
   - Tee's nights couldn't reach their count, and later the count never ended the night.
   - The camera died after the first night.
   - The truck plate photo could never focus.
   - A parked car fired its arrival every frame.
   - The corner stalled after its first shutdown.
   - A comment broke the versus round's counters.
   - The interview was a dead end on a controller.
   - Mouse players couldn't take photos.
   - The boot-time data report froze the boot screen.
   - The touch-only notice didn't appear on the iPhone profile.
   - In versus, the runner could never reach one stash spot.
3. **Most helpful:** playing the whole story through its mechanics, with the real-input runs close behind. The harness was the single most valuable run because it found the ready() bug.
4. **Least helpful:** the structural walkers ("all 48 beats enter", "the story walks to the credits"). They passed while the nights deadlocked and the camera was dead.

## Engine Feedback
1. **Liked most:** how much comes free and works on every device: pause, settings, rebinding, save slots, the HUD, PlayStation/Xbox glyphs, and an exact fixed-step headless mode. Procedural rigs and shapes-as-data meant no art files.
2. **Stuck or guessed wrong:**
   - game.after timers are cleared on a scene change;
   - calling game.fail during boot halts the boot screen;
   - the sign of cam.offset;
   - rotateView turns relative to the current view;
   - the cutaway is too shallow for deep rowhouse blocks;
   - the font has no middle dot, ellipsis or em dash;
   - E.Suspicion rises in a straight line with exposure, so you have to subtract a baseline.
3. **Most important thing I built:** a controller-first DOM screen kit. Then the formant voice, and the CornerSim shared by the story, Tee's nights, versus and attract.
4. **Hardest part:** framing a dense iso city (I replaced the cutaway with a cone around the player), and sharing Escape between the engine's pause and my own screens.
5. **Remove or overhaul:** the cutaway. It should lower every wall between the camera and the player.
6. **Change:** a keep option on game.after and game.every, and a documented per-step hook.

## Prompt Feedback
1. **Liked most:** precise, testable rules: the file name, the exit-interview shape, and the concrete 10-foot UX requirements.
2. **Confusing:** the plan's file name differs from TASK.md's; "keep testing lightweight" sits beside a long test list in the plan; and the usage field asks for cost and tokens, which a run can't see.
3. **Hardest:** the scope, and proving it: showing the whole story finishes through play on the plan's numbers, and that every screen works from a controller, not only a mouse.
4. **The one test I'd want:** a real person playing the whole story with a DualSense on a TV, and once on a real iPhone in Safari.