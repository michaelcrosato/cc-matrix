I wrote `PLAN.md` (about 1,950 lines) in this folder. It's meant to be enough for another model to build the whole demo from TASK.md and the plan alone.

- **Title: *Densha de Halo!*** It was #27 from 50 brainstormed riffs, drawn with Python's `secrets`. *Harō* means "hello" in Japanese, and the halo is the Halo Line, a fictional 20.6 km loop railway around Akari City. File names use `DenshaDeHalo-DenshaDeGo-…`.
- **Genre and view:** a train-driving sim with arcade scoring, seen mainly from a first-person cab. Chase, platform and trackside cameras, a side-view "Stop Cam" and a ring-shaped stage-select map support it.
- **Tech:** the engine's 2D handoff build plus a new `rail.js` renderer, forked from the engine's OutRun-style road module. It adds multiple tracks, raised platforms, trains and buildings beside the line, rear-facing cameras, and fixes road.js stretching the world on widescreen. The plan lists seven small engine changes, each with its reason.
- **Systems:** each comes with numbers and its own tests:
  - notched lever and train physics
  - signals, blocks and the ATS warning
  - stopping on the mark, with timetable and dwell
  - pointing and calling, and horn boards
  - "Halo Time" as the life gauge
  - passengers and comfort
  - autopilot, attract mode, and a dev mode with live balance sliders
  - controller glyphs, and the touch-only screen
  - code-generated sound and gibberish voices
  - AI Hub ghost mode, plus a local split-screen duel
- **Content:** 12 stations and 13 scenery zones. There are six career stages (a depot tutorial, then five shifts from dawn to the last train) and a four-track Parallel Run for multiplayer. It also covers the characters, a style guide with sample script, and lists of new art, animation and audio.
- **Build order:** ten milestones, renderer first. The first playable target is stage 1 driven by a human, so the stopping feel gets tuned before any content work. There's a risk table, and a cut order that removes whole features, never stubs them.
- **Testing:** one command that prints only failures and a one-line count. It covers per-system suites and a full scripted playthrough by the autopilot. Optional flags add browser checks and the real AI Hub harness.

I checked the physics with a quick simulation; every result landed inside the plan's test ranges. Timetables are starting values that the builder calibrates with a script.

`/tmp` on this machine is full, so the plan tells builders to point `TMPDIR` into their dev folder. I deleted my scratch clones of the engine and hub repos, so the folder now holds only STAGE.md, TASK.md and PLAN.md.