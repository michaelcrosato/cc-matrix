**Densha de Halo!** is done. The single file `DenshaDeHalo-DenshaDeGo-claude-opus-5-5-xhigh-20261104-050232.html` (1.7 MB) and `exit-interview.json` are in the root, and the dev files are in the subfolder of the same name. The last full run, `node test/run.mjs --browser --hub --bundle`, was on the final bundle and gave **377 passed, 0 failed**. That is 281 headless checks, 72 browser checks, 3 runs in the real AI Hub test harness and 21 checks of the deliverables against TASK.md.

**TASK.md item by item, and what checks it**

| TASK.md item | What checks it |
|---|---|
| Single .html in the root, dev subfolder of the same name | Deliverable checks (file name and folder) |
| Built on my-3d2dge handoff; engine edits allowed | Engine v0.85.2, 8 edits listed in ENGINE-CHANGES.md, plus a new rail renderer |
| All audio in code, gibberish voices | "No audio files" check; sound and voice suites; the Dev Mode sound board pressed in the browser |
| AI Hub multiplayer, and the game on its own | 3 runs in the real hub harness; a mock-hub suite; hub client first and unmodified, hub tags checked |
| Dev Mode from the pause menu, live sliders with reset | Two headless suites, plus every tool pressed through its own button in the browser, including the six event triggers fired at a station while paused; 19 sliders and Reset |
| Attract mode after 10 s, any input exits | Browser (10.5 s idle, then a key press) and the headless attract suite |
| Controller-first UI, PlayStation glyphs with an Xbox option, native keyboard and mouse, hover moves focus | Browser checks for glyphs, keyboard and mouse; headless input suite |
| Touch-only devices | Browser phone check: "Controller or keyboard required" with Settings, and attract still runs |
| Feature-complete demo | Scripted playthrough: tutorial passed, S1–S5 ranked S, the ending, all 8 postcards, every event |
| No TODOs, placeholders or stubs | Checked in the game's code and in the whole bundle |
| About/Credits screen and exit-interview.json | Same text on both, 15 labels, 4/6/4 answers, aiHub block |

## Source Information
- **Date:** 2026-11-04 05:02:32
- **Source:** Densha de Go! (Taito, 1996 arcade and its home versions): the Japanese train-driving game of stopping on the mark and keeping the timetable to the second.
- **Plan:** PLAN.md
- **Genre and Perspective:** Train driving simulation with arcade scoring.
  - Main view: first-person cab view (pseudo-3D rail renderer).
  - Other cameras: chase, high chase, platform and trackside.
  - Also: a side-view Stop Cam and a top-down ring map for stage select.
- **Tech:**
  - my-3D2dge v0.85.2 (full engine, handoff package), with a new rail.js pseudo-3D railway renderer forked from its ROAD module.
  - AI Hub session client 1.4.0 (Session Protocol 1).
  - Vanilla JavaScript, no other libraries or CDN.
  - Node 24 and Playwright 1.63.0 (Chromium) for tests and tools.
- **Art Direction:** The engine's PS1-era pixel style: 320x240 minimum expanded to the screen, E.tones hue-shifted shading, stepped alpha.
  - New code-drawn trains: Halo 8000, Halo 3000, Sky Liner, freight.
  - New code-drawn line and town: cab dashboards, 4-lamp signals, line-side boards, stations, a parametric Japanese townscape and hand-drawn landmarks.
  - Time-of-day colour grades, rain, fog and glare.
  - Engine Humanoid and Blob rigs for the cast and crowds.
- **Animation:** The engine's Humanoid and Blob rigs (idle, gait, wave, cheer) plus new bow, point and flag poses.
  - Code-tweened cab controls: the master controller, needles, lamps, wipers, sun visor.
  - The white-gloved point-and-call hand, doors and crossing gates.
  - The Ferris wheel and lighthouse beam.
  - Haro-kun's squash and spinning halo.
  - The rank stamp slam and the postcard flip.
- **Audio:** All procedural Web Audio in code.
  - A continuous train synth: VVVF inverter singing, resistor growl, rolling, wind, tunnel echo, bridge roar, rain, brake squeal, compressor and horn.
  - Effects: rail-joint clicks, door chimes, the conductor's buzzer, the ATS bell, crossing bells with Doppler.
  - Music: 12 original station departure melodies and 10 chip-music songs on the engine sequencer.
  - Voices: Animalese/Simlish-style gibberish for every character (Babble syllable synthesis with formants).
- **Online:**
  - AI Hub Session Protocol 1 in ghost mode for 2–4 players: the Parallel Run, with each player on their own track, the others shown as ghost trains, live standings and the game's own card.
  - Local 2-player split-screen Duel.
  - No other network use.
- **Testing:** Allowed and used: headless scripts through the engine (game.advance, input taps and holds, game.debug), a scripted playthrough of the whole game, Playwright browser checks, the AI Hub harness, and screenshots for look review.
  - One command, `node test/run.mjs`, runs 28 headless suites (281 checks) in parallel and prints only failures and a count.
  - `--browser --hub --bundle` adds, on the final file:
    - 72 Playwright checks, including every Dev Mode tool through its own button and the six event triggers fired at a station from the paused menu with Halo Time frozen;
    - the 3 AI Hub harness runs;
    - 21 checks of the deliverables against TASK.md.
- **Research:** Read the engine handoff docs (README, API card, road module and kit, tests) and the AI Hub protocol README and examples. No web research; Densha de Go! mechanics are from general knowledge.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** API cost: unknown; tokens: unknown; session time: about 4 hours (05:02 to about 09:00 by the machine clock)

## Testing Feedback
- **How many issues did testing catch?** About 42, all fixed before shipping, plus 4 mistakes in the tests themselves.
  - **23 from the headless suites and autopilot runs**, for example:
    - a scripted freight that never stopped;
    - a standing start that couldn't move the train on P1;
    - an arrival estimator that was always late, then always early;
    - signal lookups in route order;
    - grade easing that lost height;
    - beacons not reset by a jump;
    - a missing holding brake;
    - comfort drained by the autopilot;
    - a starting Halo Time that ignored difficulty;
    - an obstruction that never cleared;
    - the HUD spilling off small screens;
    - storage with no memory fallback.
  - **15 from screenshot review**: ground over the ballast, a viaduct with no deck, a tunnel portal that painted the whole sky, people and lamp glows never drawn, overlapping layouts.
  - **3 from the browser checks**: a menu click that only picked the focused row, Dev Mode's skip jumping past the next stop, and test events firing at their scripted places instead of ahead of the train.
- **How many would be considered critical or game breaking?** 8:
  - the S2 freight deadlock (S2 couldn't be finished);
  - the P1 standing start (the tutorial's first step was impossible);
  - the plan's timetables (good drivers ran out of Halo Time);
  - the obstruction that never cleared for a train stopped far back (S3 stuck);
  - a name clash that crashed attract mode;
  - a missing route helper that crashed every call;
  - the signal lookup that skipped the terminal's restricted speed;
  - people and lamp glows never drawn.
- **What was the most helpful test you ran?** Driving every stage headless with the autopilot and printing each event with the clock. It found the freight deadlock, the signal ordering, and the timetable and scoring problems in seconds. It grew into the scripted playthrough of the whole game.
- **What was the least helpful test you ran?** Three early HUD and screens checks that only asserted true (made real later). Also the first serial run of the suite, which took over 15 minutes until it was split across worker processes.

## Engine Feedback
- **What did you like most about the engine?** Its headless determinism. game.advance with exact fixed steps, input taps and game.debug made a 30-minute career testable in seconds. The Humanoid rigs, the Shell's menus and settings, and the chip synth meant the cast, every menu screen and all the sound needed no assets.
- **Did you get stuck or guess wrong?**
  - The ROAD module projects heights with half the screen height, which squashes the world on wide screens. It also has no multiple tracks, raised strips or rear cameras, so I forked it into a new renderer.
  - I guessed the yaw for rigs drawn in my own view.
  - I assumed the Menu could scale its text; it can't, so I wrote a larger one.
  - I didn't expect E.store to have no memory fallback when localStorage is missing.
- **What was the most important thing you had to build yourself?** The rail renderer: square-pixel pseudo-3D with several tracks, strips with faces and patterns, point things, crest clipping, rear views, and fog and time-of-day tinting. On top of it I built the train dynamics and the model-predictive autopilot that drives attract mode, the tests and the timetable calibration.
- **What was the hardest part about using the engine?** Finding the internals the API card doesn't cover (the Shell's settings rows, the audio buses, the pose solver, the Dialog's typing) in a 14,700-line file. The API index helped, but several features needed reading and patching the source.
- **What did you change in the engine, and why?** Each change is listed in ENGINE-CHANGES.md, plus the new rail.js module:
  - a Dialog voice hook, for per-character gibberish voices;
  - a settings group filter with Reset, so Dev Mode's live sliders stay out of the standard Settings;
  - PlayStation glyphs by default, plus face-button and menu glyphs in the font;
  - audio bus accessors, so the train synth follows volume and ducking;
  - bow, point and flag poses, for staff, track workers and the finale;
  - the hub's Create+Options rule in the pad reader;
  - a build stamp naming this copy.
- **If you could change one thing about the engine, what would it be?** Ship a general pseudo-3D strip renderer, or make ROAD square-pixel with lateral objects and rear views. Vehicle games beyond OutRun need platforms, trains and buildings beside the line.

## Prompt Feedback
- **What did you like most about this prompt?** It is specific about what matters for a real product: the 10-foot controller-first UI, glyph switching, attract mode, a dev mode with live sliders, the hub and one test command. It leaves the creative design open.
- **What was confusing?** Whether Source Information should describe the plan's intentions or what was actually built. Also how the title rules interact: STAGE.md says to use the plan's title, TASK.md says to pick one by RNG, and the plan had already done that.
- **What was the hardest thing to do?** Making a long, faithful career (six stages of real timetables) play well end to end and stay deterministic for tests. That had to sit alongside attract mode, local and online multiplayer, and all the front-end screens.
- **What would you change in this prompt?** Say how long the demo should take to play. Say whether a scripted full playthrough must pass on the bundle or on the dev page. Allow a shorter required career when a plan is very large.