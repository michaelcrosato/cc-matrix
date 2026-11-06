# Running feedback log
## Issues caught by tests (critical?)
## Engine surprises
- Clone is v0.89.1, plan was checked against v0.89.0.
## Prompt confusions
## Issue log (test catches; * = would be game breaking)
1 pool churn from drained pools respawning each frame; 2* Case 4 softlock: bot/gesture on hook with barbs; 3 bot ignored slur guides; 4* Tremolo softlock: half doses never reached the crack; 5 blackout pools hid unmarked bleeders; 6* scene field `view` clashes with the engine's scene option, crash on re-entry; 7* custom hat signature draw error; 8 load order of G.SCENES; 9* retractor hold crashed the sim in Grand Rounds; 10 two bots racing one stitch crash
11 visual: objective overlapped vitals, tip overlapped monitor, bark text overflowed into the gauge (screenshots); 12 Code Blue marker misaligned with the peak (read in a screenshot); 13 menu overflow on 720p; 14 white specular blotches on flat muscle; 15 lightbox marker was never drawn; 16 Grand Rounds results lacked standings
17 bot overshoot on stitches: cursor momentum at release (bot only, found by the human-like balance run)
18 Case 7's Second Look prompt was set but never drawn; 19 Dev Info "last events" never filled; 20 Staccato bites killed a slow player in seconds (found by the first-timer pace run); 21 cases too short at a first-timer's pace (found by tools/slow.mjs), content raised; 22 a test's own infinite loop (test bug, not counted against the game)
23 starting a case part-way (dev Jump, deep link) skipped strains whose nests or worms an earlier phase spawned: found by a filmstrip; carried now. 24 look notes: stages and About too flat, few colors: added a light pass
25 filmstrips: rig masks across the eyes, weak defib arch, walking through standing people; screenshot: phase tips covered the field for the whole phase
26 first-timer retry runs: Da Capo took five tries and 19 minutes, Tremolo misses cost too little, shorter cases: tuned, measured by tools/slow.mjs
27 the autosurgeon test was too weak (passed trivially), rewritten against a no-autosurgeon baseline; chart paper and credits flat per look notes
28 a wall-clock wait in the phone attract test flaked under machine load (game time was right, measured): test now waits on state
29 line-by-line plan audit (not a test, but found): no clot in any story case, one slur mark instead of three, Skills Lab ignored unlocks, Intern offer ignored restarts, no per-case barks, no Percy smirk on the lightbox, no paddles on Code Blue, pool creep missing: all fixed and now tested where a script can
30 second audit pass: stick icon missing, Dev Info showed one event, tutorial prompt not beside the target
31 finale's batons rested too briefly for a slow player: 8 minutes stuck (found by per-phase timing); bot never used the plan's Second Look answer
32 ward hover only worked near a person's feet (found by the new real-mouse test): now screen-space around the body
33 ward hover depended on the engine's mouse-device switch, which needs a larger move: follows mouse movement now. 34 retrying from a phase with little clock left could never be won (found when a random seed lost Case 11 106 times in a row): retry now guarantees time and pulse
35 my own retry edit put a line comment inside a one-line function and broke the whole build; the checks caught it on the next run; build.mjs now refuses a source that doesn't compile
