# Testing log

Every issue the testing found, one per line, with how it was found. The About pages' Testing Feedback and
exit-interview.json count these lists. `node test/run.mjs` runs every suite.

## Game issues found by scripted tests (20)

| # | Issue | Found by | Critical |
| --- | --- | --- | --- |
| 1 | The scene files ran before `G.scenes` existed, so the game crashed while loading | core | |
| 2 | The slot machine paid back 153% (now 92.0%, with blank stops on the reels) | casino | |
| 3 | Rallies never ended because the AI dug almost every ball | match (AI-vs-AI statistics) | |
| 4 | Blocks stopped too many spikes | match | |
| 5 | The AI faulted too many serves | match | |
| 6 | A failed dig didn't credit the attacker with a kill | match | |
| 7 | A perfect player still lost: the CPU partner spiked into the net when a set was too low to clear it | match | |
| 8 | Playing as Ingrid, the Welcome Match never started because no fighter liked her enough to be her partner | playthrough | yes |
| 9 | The game froze after the Welcome Match: the arrival cutscene's `finished` flag stayed set | playthrough | yes |
| 10 | Pool Hop couldn't be won when entered from the pool: its beat clock counted from page load | playthrough | yes |
| 11 | The Final was never called on a second vacation: the map's `finalAsked` stayed set | playthrough | yes |
| 12 | The credits never ended on a second run: their `done` flag stayed set | playthrough | yes |
| 13 | The title crashed while drawing its prompt in the browser: `G.dev` was both a function and the dev panel | browser | yes |
| 14 | The attract missed input during scene fades | attract | |
| 15 | `touch: 'never'` only took effect after the first browser frame, so touch controls could appear first | ui | |
| 16 | Continue and Load crashed: `G.resumeVacation` was never defined | saves, revisit | yes |
| 17 | A location's highlighted action carried over to the next visit | revisit | |
| 18 | Pool Hop's score, bonus, judge and demo-bot state carried over to the next visit | revisit | |
| 19 | A cutscene's skip, fast-forward and firework fields carried over to the next one | revisit | |
| 20 | Leaving the attract's photo beat for its Final cleared the demo save before the fade, so the location's HUD threw in draw and the engine's error panel showed on every loop | pads | |

## Game issues found by looking at screenshots and rig sheets (27)

| # | Issue |
| --- | --- |
| 1 | The title camera framed the scene badly |
| 2 | At yaw 0 the Broadcast camera saw the net edge-on (now yaw 12, pitch 30) |
| 3 | The crowd stood in the wrong place |
| 4 | Serve Cam faced the wrong way (now yaw -90) |
| 5 | The pixel font couldn't draw the PlayStation symbols, arrows or accented letters |
| 6 | A gap in the night lighting |
| 7 | Toasts covered the HUD |
| 8 | The talk panel overlapped other panels |
| 9 | The pool's texture |
| 10 | Places were zoomed wrong |
| 11 | Shop text overflowed |
| 12 | Casino text overflowed |
| 13 | The dev panel's full-width rows ran off the screen |
| 14 | Overlays kept the scene's actions instead of menu actions |
| 15 | Overlays stayed up into the next scene |
| 16 | The match intro's title overlapped other text |
| 17 | The server's held ball was hidden (now shown in the nearer hand) |
| 18 | Text in the engine's HTML menus was tiny: the Shell theme's font is a font family, not CSS shorthand |
| 19 | Motion-capture clips didn't play: `Mocap` and `MOCAP` are top-level names, not window properties |
| 20 | Beach Match: the keyboard-half key hints ran out of their columns and into each other |
| 21 | Keyboard halves: Outfit and Ready were on the same key, and so were Options and Back. The engine's `Input.halfKeys` gave a menu preset's alt and extra the keys confirm and cancel already had (engine patch 9; a scripted check now covers it) |
| 22 | Beach Match: the join toasts covered the lobby's columns |
| 23 | Serve Cam cut off the near-side player at a baseline |
| 24 | Attract: its "Press" was drawn on top of each scene's prompt bar |
| 25 | Attract: the DEMO badge covered the HUD panels |
| 26 | Photo mode: the "PHOTO MODE" label overlapped the location's HUD (the HUD is now hidden in photo mode) |
| 27 | Photo mode: the prompt bar covered the postcard frame's caption |

## Bugs in the tests themselves (10)

1. The ball test compared against a too-coarse Euler integrator (now RK4).
2. `startCfg` didn't wait for the scene to switch (a fade delays `game.go`).
3. Match configs were shared between runs (now cloned).
4. Playwright key taps were too short for a fixed-step game (keys are now held).
5. The browser test checked for the first point too early (it now polls).
6. The netcode test counted a player who had left.
7. The revisit test flagged fields that are random on purpose (greetings, firework timing).
8. The saves test compared whole states instead of the fields that matter.
9. The first "stuck" check flagged long but legal rallies. It now means 15 seconds with no touch and no phase change.
10. The pads test's photo-filter step never passed the filter number, so every shot showed the Clean filter.

## The final runs

The last full run of `node test/run.mjs` (all 22 suites): 809 passed, 0 failed. One full run before it had two
Chromium renderer crashes, "Page crashed" in browser and "Target crashed" in hub, with no JavaScript error logged.
They didn't reproduce in three reruns: browser alone, hub alone, and the full run above. They are unexplained, not
fixed.

## Controllers

The Beach Match, glyph and Xbox checks in `test/suites/pads.test.mjs` use emulated controllers. Chromium's
`navigator.getGamepads` is replaced with standard-mapping pads named as DualSense controllers, and buttons and
sticks are pressed by script. No physical controller was tested.
