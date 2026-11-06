# Running log (Testing / Engine / Prompt feedback)

## Issues caught by tests (G = game breaking)
1. G  Scalpel incisions never marked done: phases with an incision never cleared (bot stalled at case 2, phase 1).
2. G  Magnet fought the guide-follow: the cursor was pulled back to the stroke's head while tracing, so strokes stalled at 58 of 60 u.
3.    A spec's `n` meant both copies and stitch count: five 5-stitch wounds spawned instead of one.
4. G  Wire order check excluded the wire being cut, so every cut counted wrong (Case 9 unwinnable).
5. G  Legato slur marks could not be pressed (phase filter), so the worm never surfaced.
6. G  Lobe stored a score in `pts`, which the scalpel's polyline code read as points: crash in Case 8 / Grand Rounds.
7. G  The spiral (Case 11 coda) was not a scalpel target by type: finale unwinnable.
8. G  The Last Note held its progress in `pulling`, which never runs once the piece is free: no 3 s hold, no ending.
9.    Voicebox bot gate used `!cd` on a negative float (bot only).
10. G Story scene kept `done = true` across visits: the second story of a chain froze the flow.
11.   Dev "autosurgeon off" reverted any bot, including the test bot.
12. G Tremolo reeds' bot timing waited for a flare it could never reach (test caught a real telegraph: the window is .3 s of a .55 s beat, so a plunger needs a full beat to charge).
13.   Fermata stage 2 recursion in the bot (stack overflow), slivers killed each other's slur marks.
14.   Bark box overflowed 40 characters; tutorial panel covered the field; log/fast prompts sat under the engine's corner buttons (found by screenshot).
Count: 14 issues, 9 game breaking.

Most helpful test: the bot playing every case through the real Cursor path at Resident with cheats off (found 1,2,4,5,6,7,8,12 and tuned the numbers). Least helpful: screenshot sweeps for sim bugs (they only found layout problems).

## Engine
- Liked: the pixel look and rigs work out of the box; headless `game.advance` with `draw: true` ran the whole game in Node; settings, pause, rebinding, TV shell for free.
- Stuck / guessed wrong: scene objects are one shared object per visit (stale state like `done`); `game.go` keeps the first transition; `E.Dialog` portrait callbacks; sizes of Menu text.
- Built myself: the tissue painter's per-site recipes and objects, the operation sim, cursor assist, the bot, the Hub shared-world mirror, the busts, stages, music, voices, choir.
- Hardest: making a 3-view game (overhead field, front portraits, threequarter ward) share one palette and input scheme.
- Changed: only the touch notice (Appendix E) so the attract reel shows above it and the Settings button still takes taps.
- One change: a documented fixed-size sim/draw split with a deterministic world-time clock (the engine's `timeScale` is global; Long Breath needs hands at full speed).

## Prompt
- Liked: an exact plan with verified facts, the originality rule, the done checklist.
- Confusing: plan says 'one idea per case' and a first clear of an hour, while the demo scope is enormous for one agent; TASK.md and plan both define the exit interview.
- Hardest: delivering eleven distinct operations, a story, a Hub protocol, attract, dev mode and tests in one session.
- Change: split content into a cut-list with explicit priorities earlier, and say which tests must run in a browser.
