I built **Densha de Halo!**, the playful riff on *Densha de Go!* that PLAN.md picked by random number. It's a train-driving sim on the Halo Line, a 20.6 km loop railway with 12 stations. Over one day of service you stop on the mark, keep the timetable to the second, and point and call every signal. Chief Instructor Hoshino rides along on his last day.

The full test command (`node test/run.mjs --browser --hub`) passes: **170 passed, 0 failed**. That covers the headless suites, the scripted full playthrough, the Playwright browser checks and the real AI Hub harness. After that run I fixed overlapping text on the station name boards, then rebundled and reran two suites, which passed. I didn't rerun the full suite after that last change.

**Delivered** (in this folder):
- `DenshaDeHalo-DenshaDeGo-claude-opus-5-5-medium-20261104-050235.html`: one file (about 1.6 MB) that runs offline from `file://`. The AI Hub `session.js` is pasted in unmodified as the first script.
- `exit-interview.json`: parses as JSON and answers every field.
- The dev folder of the same name: the patched engine, the new `rail.js` renderer, `src/`, `test/`, `tools/`, `ENGINE-CHANGES.md` and screenshots.

**What's in the game:**
- **Career:**
  - a depot tutorial in 9 steps, then 5 service stages;
  - covers dawn, rain with the older two-handle train, a festival and hills, a 10-car sunset rush beside a faster rival, and the last train at night in fog;
  - then a finale and credits.
- **Driving and rules:**
  - a notched lever (EB, B8…B1, N, P1…P5) on physics that matches the plan's check values exactly (0→80 km/h in 30.4 s, braking from 80 on B4 in 439 m);
  - block signals, the ATS bell and SPAD, speed limits;
  - station judgments (PERFECT HALO down to OVER THE MARK), ON TIME/LATE/EARLY, SMOOTH stops;
  - the dwell sequence: departure melody, doors, buzzer, pilot lamp;
  - point and call, horn boards, Halo Time as your life, comfort, ranks S–D, checkpoints.
- **Other modes:**
  - Free Run;
  - a local split-screen Duel for 2 players;
  - an AI Hub ghost-mode session for 2–4 players, with its own card;
  - Driver's Log with 8 postcards;
  - How to Drive, and About & Credits.
- **Attract mode:** after 10 s idle on the title or a menu screen, an autopilot demo loops through 6 scenes and today's best drivers. Any input exits. On touch-only devices it shows "Controller or keyboard required", keeps the Settings button, and attract still runs.
- **Dev Mode:** in the pause menu. It has the testing tools, 19 live balance sliders with Reset to defaults, a debug overlay and a sound board.
- **10-foot, controller-first UI:**
  - prompts follow the last device used: PlayStation symbols by default, Xbox as a setting, keycaps for keyboard;
  - the mouse wheel moves the lever, and you can click the cab's buttons;
  - a tutorial-depot screenshot shows the call prompt and its target bracket overlapping in the middle of the view (not fixed).
- **Sound:** all of it is made in code. That includes the inverter whine, 12 departure melodies, 9 songs and gibberish voices for 11 characters plus the station announcer.

## Source Information
- **Date:** 2026-11-04 05:02:35
- **Source:** Densha de Go! (Taito, 1996 arcade and its sequels)
- **Plan:** PLAN.md
- **Genre and Perspective:** train driving simulation with arcade scoring. The main view is a first-person cab in pseudo-3D, with chase, platform and trackside cameras, a side-view Stop Cam and a top-down ring map.
- **Tech:** my-3D2dge v0.85.2 (full engine, handoff package, 7 small patches) plus a new `rail.js` pseudo-3D railway renderer; AI Hub session client 1.4.0 (unmodified); vanilla JavaScript in one HTML file; Node 24 and Playwright 1.63.0 headless Chromium for tests.
- **Art Direction:** the engine's PS1-era pixel style. New code-drawn trains, cab and dashboard, signals and boards, stations, Japanese townscape and landmarks. The engine's Humanoid and Blob rigs are used for people and the mascot Haro-kun.
- **Animation:** the engine's Humanoid and Blob rigs with new bow, point and flag poses. Code-tweened lever, gloved hand, needles, wipers, doors, crossing gates, Ferris wheel and rank-stamp slam.
- **Audio:** all procedural Web Audio:
  - train sounds: an inverter synth and a resistor-motor synth, rolling, wind, tunnel echo, rain, brake squeal, horn, crossing bells, ATS bell and rail joints;
  - 12 departure melodies and 9 chip-music songs;
  - gibberish voices in the Animalese/Simlish style.
- **Online:** AI Hub Session Protocol v1, ghost mode, 2–4 players. Also a local 2-player split-screen Duel.
- **Testing:** headless Node tests (using `game.advance` and `game.debug`) behind one command that prints only failures and a one-line count. This includes a full scripted playthrough. Also Playwright checks of the bundle, the AI Hub harness, and screenshots for the look.
- **Research:** read the engine handoff docs and the AI Hub protocol and ghost example. No web research.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** unknown. Cost and token figures aren't visible inside the session; wall time was about 1 h 45 min.

## Testing Feedback
1. **How many issues did testing catch?** About 14 real issues, plus 5 bugs in the tests themselves.
2. **How many were critical or game-breaking?** 6:
   - every run started one stop ahead, so the autopilot never left the first station;
   - a field name hid a method, which crashed every step;
   - a setting was applied before the settings existed, which crashed at boot;
   - deep links raced the async boot, which crashed in the browser;
   - the tutorial never ended;
   - the stage 2 freight train blocked the line ahead, so the autopilot ran a red signal.
3. **Most helpful test:** the skill-1 autopilot playthrough, which checks PERFECT stops, that every event fires, and rank S on every stage. It found most of the logic bugs, and it is how the timetables were fitted.
4. **Least helpful test:** drawing the 13 gallery shots into a stub canvas. It only proves nothing throws; screenshots of the same shots did the real work.

## Engine Feedback
1. **Liked most:** headless determinism. Exact fixed steps let a whole career, and the timetable calibration, run in Node. The standard Shell gave pause, settings, key rebinding and full screen for free.
2. **Stuck or guessed wrong:** with boot steps, `game.start` starts the first scene asynchronously, so deep links failed in the browser. Separately, in a custom view a Humanoid facing +π/2 looks at the camera, which I first guessed backwards.
3. **Most important thing built:** `rail.js`, the railway renderer. It is a fork of road.js with diverging tracks, extruded strips for platforms, trains, buildings and tunnels, a rear-facing camera and square pixels.
4. **Hardest part:** fitting a full dashboard into 320–427 pixels of width while keeping the 5×7 font as the minimum.
5. **Changed in the engine:** 7 patches, all logged in `ENGINE-CHANGES.md`:
   - the new `rail.js` module;
   - a per-letter Dialog voice hook;
   - a group filter on the Settings screen (for the Dev sliders);
   - PlayStation as the default symbols, and the ✕ ○ □ △ glyphs in the font;
   - `audio.bus()` and `noiseBuffer()`;
   - bow, point and flag poses;
   - Options ignored while Create is held in a hub session.
6. **One change:** generalise road.js into a pseudo-3D extrusion renderer with several tracks, side objects and a reverse camera.

## Prompt Feedback
1. **Liked most:** the concrete deliverables and checks, and the AI Hub harness's hard pass or fail.
2. **Confusing:** Usage, which an agent inside the session can't see. Also, the plan was written for another run's timestamp and model tag, so file names had to be translated.
3. **Hardest:** the scope (six stages, the duel, the hub, attract, Dev Mode and all-procedural audio in one session), and calibrating timetables so the AI driver arrives on the second.
4. **Would change:** state priorities in case time runs short, and either give the agent its usage numbers or drop that field.