Operation Wolfpack is built: the single bundled file is in the work folder root, and the source and tests are in the dev subfolder. No TODOs, stubs or placeholders turned up in `src/`. Headless tests (301 checks) pass, and the AI Hub harness conformance passes for 2, 3 and 4 players and for the host leaving.

I never heard the audio, so sound effects, music and voices are verified only to run without errors.

- **Game:** a first-person rail shooter. You aim, spray, reload and throw grenades, and you shoot enemy knives, grenades, rockets and shells out of the air. Every enemy shot is warned by a closing ring. Four operations (Radio Hill, Mangrove Run, Palm Village, The Kennel) each end in a boss, with an interrogation scene after Mangrove Run and an ending that depends on how many of the five hostages get home.
- **Scope cut:** PLAN.md called for six operations; I built four, and TASK.md's file names won where they differed from the plan.
- **Required systems:** attract mode starts after 10 seconds idle on the title and any input exits it. Dev mode opens from the pause menu with live sliders and a reset to defaults. The touch-only screen shows "Controller or keyboard required" and a settings button. Prompts follow the last device, PlayStation by default with an Xbox option in Settings. Local co-op takes up to four seats, and AI Hub shared-world co-op is built in.
- **Browser runs:** I confirmed the real keyboard and mouse flow, a faked DualSense pad (menus, aim, fire, grenade, reload, a second pad joining) and touch emulation.
- **Engine edit:** the only engine change is the button-symbol setting, which now defaults to PlayStation and offers only PlayStation and Xbox. It is logged in `engine/CHANGES.md`.
- **Usage:** I wrote "unknown", since I have no token or cost figures.

Files are in the work folder:
- OperationWolfpack-OperationWolf-claude-sonnet-5-5-medium-20261103-184621.html
- exit-interview.json
- OperationWolfpack-OperationWolf-claude-sonnet-5-5-medium-20261103-184621/ (source, tests, tools)

`exit-interview.json` parses and every field is answered; `series` is empty on purpose since the game is not part of a franchise.

## Source Information
- Date: 2026-11-03 18:46:21
- Source: Operation Wolf (Taito, 1987)
- Plan: PLAN.md (written by claude-opus-5-5 at max effort). Followed for the title, systems and architecture; TASK.md won where they differed (file names). Scope cut to four operations.
- Genre and Perspective: Light-gun rail shooter (shooting gallery) with boss fights and co-op. First person on a scripted rail; free crosshair, the camera never follows it.
- Tech: my-3D2dge v0.85.2 handoff (full engine, one file, no dependencies), its Mode7 depth view, Humanoid rigs, Arcade, Menu and Backdrop. Plain JavaScript in one namespace. AI Hub session client 1.4.0. Playwright 1.63.0 and headless Chromium for browser checks; Node 24 for headless tests.
- Art Direction: the engine's native look: HD Humanoid rigs drawn as pixel art on a 480x270 Mode 7 world with a perspective floor, sky, fog and billboards. New procedural pixel art for jeeps, boats, helicopters, the tank, the gunboat, the radio truck, the General's stilt-frame, props, pickups, projectiles, telegraph rings, crosshairs and the first-person SMG.
- Animation: the engine rig system (walk, run, point, die and kneel poses, expressions, portraits) as the base. New animation: popup-from-cover rise, telegraph rings closing, SMG recoil and reload, rotor spin, boss phases and stagger, bobbing pickups, and explosions and smoke from a particle store.
- Audio: all in code. Layered chip sound effects through the engine synth, songs as note data (title, four operations, boss, victory, game over) with square, pulse, triangle, saw and drum tracks, and Animalese-style gibberish voices made of one blip per typed letter, pitched per speaker. No audio files.
- Online: AI Hub shared-world co-op for 1 to 4 players using lib/hub client 1.4.0. The host runs the simulation, clients send crosshair inputs at 20 Hz and receive snapshots at 14 Hz with events. Passed the hub harness conformance for 2, 3 and 4 players and the host-leaves case. Local co-op on one machine: a second to fourth controller joins with Options.
- Testing: headless Node tests of the simulation, data and whole game flow (about 301 checks behind one command, including a scripted bot playthrough of all four operations, the attract loop and the dev screen); browser runs with Playwright (real keyboard and mouse, a faked DualSense pad, touch emulation); the AI Hub harness conformance; and screenshots for what scripts cannot check. No subagents.
- Research: read TASK.md, PLAN.md (its research summary of the 1987 arcade original) and the engine API card; no further web research on the source.
- Environment: Claude Code CLI (headless); Linux; browser unknown (tested in headless Chromium through Playwright).
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium.
- Usage: unknown.

## Testing Feedback
- How many issues did testing catch? About 10: the simulation checks and the bot playthrough caught 5, the AI Hub harness caught 1, and screenshots caught 4 visual ones (a boss hidden behind a hut, the General floating above the screen, the radio box covering a boss, a label over the hints).
- How many were critical or game breaking? 4. A thrown projectile overwrote its own type with its target, so any rocket or shell broke its logic. The boss weak point sat above the boss hit box, so bosses could not be killed. Reinforcement gunmen spawned off screen and stalled the boss from ever arriving. Online clients sent no inputs.
- Most helpful test? The scripted bot playthrough of every operation to the boss and the clear screen. It found three of the four game-breaking bugs, which only show when a whole run is played.
- Least helpful test? The data lint (every spawn type, radio key, rig and shape exists) and the tuning slider checks never failed. The screenshots of static menus only found cosmetic problems.

## Engine Feedback
- What did you like most about the engine? The Mode 7 module with billboards: real depth and parallax for a light-gun view, rigs scaled by distance, and `project` and `toFloor` for hit tests. Also the headless Game with exact fixed steps, E.Arcade tables and initials, E.Menu with mouse hover, and the standard pause, settings and controls with glyphs that follow the last device.
- Did you get stuck or guess wrong? A little. I was unsure what coordinates a Mode 7 floor function receives with wrap on, so the painters unwrap defensively. A hat given as a plain string showed red hair under it until I gave `{ style, color }`. A rig tinted red on hurt looked like a bug for a while. `padMove` is rewritten every frame, so tests cannot inject a stick and I had to fake a whole gamepad in the browser.
- What was the most important thing you had to build yourself? The rail shooter itself: screen-space hit testing through the Mode 7 projection with cover and priorities, telegraph rings, the enemy attack machine, bosses with weak points and phases, the bot, the dev screen, and the host and client networking.
- What was the hardest part about using the engine? Making a first-person gun view out of a 2D engine without a 3D camera: sizing rigs and billboards to the view, keeping hit shapes in step with what is drawn, and keeping the online snapshot under the hub size limit.
- What did you change in the engine, and why? One line: the standard glyph setting now defaults to PlayStation and offers only PlayStation and Xbox. Logged in `engine/CHANGES.md`. Everything else was used as it came.
- If you could change one thing about the engine, what would it be? A light-gun kit in the handoff (crosshair, shots through the Mode 7 projection, telegraphs, shoot-down targets) and a way to inject gamepad sticks and buttons in headless tests.

## Prompt Feedback
- What did you like most about this prompt? The 10-foot controller-first rules and the exact exit-interview shape. The plan gave exact numbers and an architecture to build on, and the attract mode, dev mode and touch-only rules were clear and testable.
- What was confusing? The plan names a dev folder and html file for another model, date and effort while TASK.md names mine; I followed TASK.md. It was also unclear whether the plan's six operations were required or advisory, and what to write for usage when no figure is exposed.
- What was the hardest thing to do? Covering every required system (attract, co-op, hub, dev sliders, glyphs, touch notice, About, exit interview) and balancing four operations and four bosses with no human playtester, and judging audio without hearing it.
- What would you change in this prompt? Turn the required systems into a short acceptance checklist, say plainly which parts of a plan are binding, and provide a way to check sound headless.