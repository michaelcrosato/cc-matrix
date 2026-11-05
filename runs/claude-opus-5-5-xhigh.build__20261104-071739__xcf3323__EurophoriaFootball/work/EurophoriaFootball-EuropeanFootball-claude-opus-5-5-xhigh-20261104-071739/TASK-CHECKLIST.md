# TASK.md, line by line

Each requirement of `../TASK.md`, where it is built, and the check in `node tools/test.mjs` that proves it (suite: check).
The `task` suite (tools/lib/taskcheck.mjs) checks each of these lines against the running game and the delivered page;
`node tools/test.mjs task --report` prints its result line by line, keyed by TASK.md line number.

| TASK.md | Built in | Evidence |
|---|---|---|
| SOURCE: European football, over-the-top arcade style | 5-a-side football with super strikes, Europhoria, dives, VAR, a parked bus, matchday events (src/10-20, 50-55) | euphoria: every super path reaches the goal; ai: the bus, the Golden Moment; sweep: every event, celebration, card, VAR drawn |
| Genre, Perspective: picked | Arcade sports with a story cup run; a 40-degree broadcast camera (src/00 `E.VIEWS.broadcast`), Classic and Aerial in Settings | sweep: views threequarter, topdown, broadcast |
| Game Title: a riff on the source, 50 brainstormed, picked with a real RNG | PLAN.md lines 5-8: 50 riffs, `secrets.randbelow(50)` (OS entropy) chose index 0, Europhoria Football; STAGE.md: "using the title it gives" | browser: title is Europhoria Football |
| Package: one html file `[GameTitle-SOURCE-claude-opus-5-5-xhigh-20261104-071739].html` | GameTitle = EurophoriaFootball (the title without its space), SOURCE = EuropeanFootball (European football): `../EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739.html`, everything inlined | browser: the deliverable exists; head order; no external URLs; check.mjs finds no files loaded from the internet |
| Tech stack: built on my-3d2dge dist/handoff, changes allowed | engine/my-3d2dge.js (v0.85.2) with five `// EF:` changes, engine/CHANGES-ENGINE.md | every suite runs on it |
| Art direction: engine's native style, new art for the source | HD Humanoid rigs with kit patterns and numbers, stadiums, crowds, crests, tabloids (src/04, 11, 25, 26, 31, 32); library props (banner, barrel, crate) | sweep; screenshots in shots/ |
| Animation: engine's native system, new animations | kick specs, poses, mocap clips, the new body tilt (src/05, 13, 14, 25; engine change 4) | content: the mocap set loads and has every clip the game names; task: the tilt and 31 clips load; sweep: the animation gallery, every move and view |
| Audio: all in code, Animalese/Simlish voices | src/03 (effects, 16 songs, crowd engine, chants, babble), no audio files | audio: every effect, song, crowd reaction, chant and voice reaches the output; the sliders silence their buses |
| Online: ai-hub lib/hub | src/42 (shared-world, the game's own card, host snapshots, client interpolation, server mode) | hub: the real harness passes in all four scenarios; hubsim: budgets, latency, presses, leave, time-up, finish, end |
| A dev subfolder `[GameTitle-SOURCE-claude-opus-5-5-xhigh-20261104-071739]`; the bundle in the root | this folder holds every dev file; the root holds only TASK.md, PLAN.md, STAGE.md (given), the html and exit-interview.json (both required there) | `ls ..` |
| A server only on 127.0.0.1 and an OS port, checked, stopped by PID | tools/lib/hubtest.mjs: `http.server 0 --bind 127.0.0.1`, the page's title checked, `process.kill(pid)` | hub suite |
| Testing: headless scripts, one command, failures only and a one-line count; screenshots only for looks; no subagents | tools/test.mjs (18 suites) | its output |
| Goal / Scope: a feature-complete, polished vertical slice showing every mechanic, with the infrastructure to build out | Cup Run, Kick-About, Penalties, Training (9 drills), Sticker Album (51), About; registries for teams, stadiums, beats, lines, drills, supers, events (src/00 `EF.def`) | playthrough: the whole cup, the ending, Kick-About with two players, Penalties, a drill, About, attract; training: all nine drills; content: validate() |
| Dev mode from the pause menu; live sliders for the key variables with reset to defaults | src/41 (TUNE, CHEATS, WARP, INFO); the pause menu's "Dev mode" item | audio: Escape pauses and clicking Dev mode opens the panel over the running match; dev: sliders change play, RESET ALL restores every default, every WARP entry runs |
| Attract mode after 10 s idle on the title/menus; any input exits; may cheat | src/40 (six segments, forced super, bicycle kick, VAR, Panenka) | attract: 9.9 s stays, 10.1 s starts, every segment in 95 s, a confirm, a key, a mouse move and a stick each return and pick nothing; touch-only: it runs and a tap returns |
| Multiplayer: AI Hub and the game on its own | src/42; local 1-4 players (src/31 side picker) | hub; ui: Kick-About setup with two players, one a side; playthrough |
| Narrative tone like the source | British broadcast commentary and tabloid back pages (src/52, 53) | content: 300+ lines, 12+ per major pool |
| 10-foot, controller-first; PS5 DualSense in standard mapping | big tiles, few choices, glyph footers (src/30, 31) | ui: every screen by pad actions |
| Keyboard keys PC players expect; the same screens | WASD/arrows, J K L I, Shift, E, Q, C, Space, Esc (src/00 `EF.KEYS`) | ui: keyboard arrows; unit: half keyboards, the chord |
| Mouse aims and clicks; hover moves the focus | menus (src/30), mouse aim and clicks in play (src/01) | ui: hover focuses, a click picks; audio: mouse aim turns on, a click passes toward the cursor, the right button shoots |
| Prompts follow the last input; PlayStation glyphs with an Xbox option; keys and mouse buttons | src/02 | ui: keycaps for keys, pad buttons for the pad, mouse buttons for the mouse, PlayStation by default, Xbox after the setting |
| No dense web-style data screens | canvas screens, one block per page | screenshots |
| Touch-only: no touch controls; "Controller or keyboard required" and the settings button; attract runs | src/31, src/90 (`touchEnabled = false`, scenes `touch: []`) | ui: the notice shows, play cannot start, About is reachable; attract: runs on touch-only; browser: check.mjs at 390x844@3 |
| Done: no TODOs, placeholders or stubs | | lint: every file has no TODO, placeholder or stub |
| Source Information and the feedback in the reply and an in-game About/Credits screen | src/31 About (from exit-interview.json at build time) | browser: the About pages carry the exit interview; sweep: about pages |
| exit-interview.json beside the html, exact shape, every value filled | `../exit-interview.json` | browser: parses, every field, 4/6/4 answers, aiHub fields, genre from the list, 3-6 lowercase tags |
