# TASK.md coverage

The `task` suite (`tests/suites/task.mjs`) reads TASK.md itself (its bracket file name, its exit-interview template, its
Source Information list and its feedback questions) and checks the build against each requirement; run it with
`node tests/run.mjs task --verbose` to see every check by name.

Each requirement of TASK.md, where it is built, and the check that proves it (`node tests/run.mjs`: 19 suites).

| TASK.md asks for | Built in | Proven by |
|---|---|---|
| A game inspired by Eye of the Beholder (1991), original world and characters | `src/14-16` (Hasp, the Bolt-Holder, all text original), `15-data-floors.js` | lint (every id and text exists), playthrough |
| Genre and perspective that fit | real-time first-person grid party crawler; automap; overlay screens | movement, features, browser screenshots |
| Title riffing on the source, picked with a real RNG | the plan's pick (Python `secrets.randbelow(50)`, index 5): **Eye of the Bolt-Holder**; STAGE.md says to use the plan's title | title screen, About page 1 |
| One HTML file with the given name, CDN dependencies allowed | `tools/build.mjs` writes `../EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html` | browser (boots from `file://`, only jsDelivr requested) |
| Built on dist/handoff; engine changes allowed | `engine/my-3d2dge.js` (handoff) + `engine/my-3d2dge-3d.js`, patched | PATCHES.md; every suite runs the patched engine |
| The engine's native style, new assets for the source's feel | pen-drawn wall features, doors, 50 item models, 5 pen creatures and the boss, 45 icon templates, brass UI | art suite (every monster type, person, item and wall mechanism has a look of its own, not a fallback, drawn from many parts; no two items alike); browser (the 3D view is drawn); screenshots in `shots/` |
| The engine's animation system, new animations | rig moves and wind-ups, tweened camera, pen creature and mechanism animation, weapon swings | art suite (each pen creature moves idle, winds up, strikes, walks and dies; the Bolt-Holder's phases, gaze, telegraphs and death; every rig's limbs move on a walk and settle; blobs squash and patter; levers, buttons, plates, locks, gates, seals, pits, clocks and gears change with their state); combat (wind-up and dodge); screenshots |
| All audio in code, no files; Animalese/Simlish voices | `src/50-audio.js`: songs, sfx, babble synth | babble suite; lint (no audio files in the page) |
| AI Hub multiplayer and the game on its own | `src/73-hub.js` (ghost race, own card), solo Rat Run with best ghost | hub suite (Node stand-in), harness suite (2 players; 4 with latency/jitter/loss; host leaves) |
| Dev folder named by the pattern; deliverable in the root | this folder; the root holds the HTML and `exit-interview.json` | lint reads both from the root |
| Headless tests, one command printing failures and a count, a scripted playthrough | `tests/run.mjs`, `tests/suites/*` (including `task`, which parses TASK.md itself and checks each requirement), the walkthrough bot (wins all 20 seeds tried) | 1,248 checks, 0 failed (17 Node suites 1,221, browser 20, harness 7); the playthrough wins on Normal with both of Veil's branches |
| A feature-complete demo showing every mechanic | four floors + the Rat Run; every system of PLAN §4 | lint, movement, features, items, combat, monsters, magic, camp, progress, save, playthrough |
| Dev mode from the pause menu, live sliders for key variables, reset to defaults | `src/70-dev.js`: 22 tuning sliders in 4 tabs, Reset to defaults, reset row and page, cheats, warps, party, spawn, debug | dev suite (sliders change their systems, reset restores, every cheat, every warp) |
| Attract mode after 10 s idle on the title; loops; any input exits | `src/71-attract.js`: 9 vignettes played by the bot with cheats | attract suite (9.9 s no, 10 s yes; every vignette; key, pad, mouse, tap exit; no storage written); browser suite |
| Narrative tone like the source's | `src/14-data-text.js`: terse second-person messages, capital inscriptions, formal NPCs | lint (texts exist), UI suite (dialogue) |
| 10-foot, controller-first UI for a DualSense (standard mapping) | `src/60-68`: big panels, one focus system, few widgets per screen | ui suite (focus by d-pad and mouse, every screen opens and closes, layouts fit 320x240 and 427x240); gamepad suite (a standard-mapping DualSense through `navigator.getGamepads` in the browser: ✕ ○ △ □ R1, d-pad, both sticks, ✕ held, Create, Options, Create+Options) |
| Keyboard keys PC players expect; the mouse clicks menus and world things; hover moves focus | WASD/QE/F/Space/I/C/M/J; view hotspots; card hand slots; drag and drop | ui suite (keys step and turn, hover focuses, carry and place); browser walk |
| Prompts follow the last input: PlayStation glyphs, Settings option for Xbox, keys and mouse buttons | `src/61-ui-kit.js` glyph painter; patched Button symbols setting | ui suite (keys, PS shapes, Xbox A, mouse badge, the setting's options) |
| No dense web-style data screens | short lists, big tiles, details of one item at a time | screenshots |
| Touch-only: no touch controls; "Controller or keyboard required" and the settings button; attract runs | `src/68-ui-shell.js` notice; `input.touchEnabled = false`; the engine's corner menu button | attract suite (touch flag); browser suite (phone: notice, no touch controls, the menu button opens Settings, attract runs) |
| No TODOs, placeholders or stubs | everything wired; nothing marked unfinished | lint scans `src/` and the whole bundled page for TODO, FIXME, placeholder, stub, "not implemented" |
| Source Information and the three feedback sets in the reply and an in-game About/Credits screen | `src/16-data-about.js` (B.ABOUT) drives the About pages and `exit-interview.json` | lint (exit interview answers every field) |
| exit-interview.json in the root, exact shape, parses | written by `tools/build.mjs` from B.ABOUT | lint parses it and checks every field |
