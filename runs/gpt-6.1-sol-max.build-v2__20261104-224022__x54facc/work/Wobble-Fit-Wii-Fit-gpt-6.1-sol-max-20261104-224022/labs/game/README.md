# Wobble Fit

A complete five-day residency at Little Fulcrum, a wellness island balanced on one rock. Lean is your centre of balance; the same input becomes a held pose, a slackline correction, a paddle stroke, a sand tray, and eventually the island itself. The game has thirteen activities, a walkable island, daily Wobble Ages, pebbles, growing cairn, 212 short remarks, a storm finale, free practice and a four-seat group round.

## Play and share

Open the root deliverable `Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html` directly in a WebGPU-capable Chrome or Edge. Everything, including the unmodified AI Hub client, is inlined; no download is needed. WebKit and Firefox receive the explicit WebGPU requirement screen. WebKit iPhone emulation is the available Safari stand-in, not real iOS.

Use a standard-mapped controller: left stick to lean/walk, triggers or shoulders for the two feet, both for breathing, Cross to select, Options to pause, Triangle for the Programme. PlayStation glyphs are the default; Settings can use Xbox glyphs. Keyboard: WASD/arrows, Q/E feet, Space both, Enter/E use, Tab programme, Escape pause. A captured mouse leans and its buttons act as feet; the garden uses its visible position. Hover moves menu focus. Touch-only screens show the required-controller notice and Settings; attract still runs.

The Programme provides instant travel, so exploration is optional. Completing an activity at any rank counts. Finish today's programme and sleep. After the storm, the last check leads to credits and all activities stay available. Group Class fills empty mats with CPU guests (optional). In AI Hub every copy owns its round and draws neighbouring ghost guests; host departure does not interrupt the class.

## Build and verification

From this development workspace:

- `node labs/game/tools/onefile.mjs` builds the required root HTML.
- `node labs/game/tools/verify.mjs` runs the complete verification, printing failures and one count line; `--quick` selects the Node stages.
- `npm run check` checks types, lint, format, assets and all 2,135 read-only engine files.
- `npm test -- --maxWorkers=1` runs activity, complete-story, restoration and numerical audio tests.
- `node x replay labs/game/replays --browser sim --runs 2` checks the original-content goldens in Node and Chromium. Set CHROMIUM_PATH to this machine's installed headless shell as PLAN.md specifies.

Tests and screenshots live under this workspace's `out/` directory, as TASK.md requires all generated files to remain inside our own folder. The viewport tool's usual temporary output directory was overridden for that reason. The checks use ephemeral loopback servers only, close their own browsers and servers, and never touch another worker's processes. The test harness is upstream data kept in `.cache/hub/`; it is not shipped or modified.

## Implementation calls

- Full read-only my-3dge workspace pinned to the plan-tested e7a124394afe087a40c36e2662a5c4ca2b39a663. No engine or configuration patches, no new dependency, no binary game asset, no external publication.
- The random title draw selected candidate 3 (zero-based) from 50 via Python `secrets.randbelow`. The workspace `title-selection.json` records the actual draw.
- One deterministic island scene owns all activities; a smaller separate pavilion scene meets the Hub boot deadline. Every playable character has `player:false` and one pilot writes its intents.
- Activities share one 60 Hz balance and breathing model but retain independent rules, integrators, rhythm windows, course counters and scoring. The sandbox, bot and live sliders use recorded scene actions/settings.
- The single HTML is built with Vite and injects the untouched session client from text. The SHA-256 of its banner through last non-whitespace character matches the protocol's 1.4.0 client hash.
- New poses are hand-authored key strips on the native humanoid clip layer. Mesh2Motion supplies only the reference rest skeleton. No licensed STYLE100 or CMU clips were copied.
- The sand tray has a large readable SVG instrument over its 3D table. Marble motion, ridges, cups and captures remain deterministic sim state.
- Full resolution and high quality are explicit, because performance is outside this brief and the engine's automatic resolution otherwise chooses 330 lines. The game keeps its own typography inside the engine overlay.
- The roughly 45-minute residency uses bounded activities and optional travel. Every activity finishes with idle input. The test bot accelerates sim progression; it never creates a separate set of gameplay rules.
- Data tables in `scenes/data/` hold days, poses, charts, trays and lures. Original lines are `ui/lines/cast.ts`. Final source information and interview answers have one canonical home in `ui/about-data.ts`.
- Physical controllers, real iOS Safari, a TV and human audio listening are unavailable. Tests substitute standard-mapped pad data, WebKit device profiles, 1920×1080 screenshots and numerical PCM levels.

The running implementation and test defect tally are recorded in the root `PROGRESS.md`. The exit interview and in-game About pages disclose the exact final test results and limitations.

## Session and save details

The session pavilion renders its own player before preparing neighbouring avatars. Logical ghost seats exist throughout, and the neighbours are real animated actors as soon as that first frame is ready. This keeps four copies within the Hub boot deadline. The session uses a light toon look and fewer shadow passes; standalone play keeps full resolution and high quality.

A reactive action-map selector is supplied to createEngine; it is the same selector used by the UI. Independent menu polling keeps controller input working while simulation or rendering is paused. Local keyboard/mouse and pad seats are assigned separately, with no cross-control between mats. A binding capture is an active dialog and is not interrupted by attract.

Sandbox protects the residency and restores its original snapshot when switched off. Accessibility and audio preferences remain shared. Erasing a residency resets the scene as well as its stored progress, restoring the hidden pebbles. Retaking a Morning Check updates the current day's record; the first dawn ending is shown once. Later in-game days keep their daily ritual and free practice.

Prop definitions are registered by `registerRetreat(small)` during scene setup. The renderer prewarms every registered prop; keeping the island-only definitions out of the session registry avoids compiling unplaced island geometry. A running island (or headless `createHeadless({scene:island})`) registers the complete library for inspection. The text factories remain normal native prop definitions.

## Final validation

The final full verifier reported **101 passed, 0 failed**: 26 simulation/audio tests, 14 Node/Chromium golden replays, 19 browser checks, all four Hub scenarios (2/3/4 players and host departure), the WebKit matrix and native viewport/TV views, plus static/package/metadata gates. After the final typography and command-exit adjustment, 49 quick checks and a fresh four-player Hub case passed with exit code 0. The complete report is `out/verify/full-report.json`; `out/game/final-quick.log` records the targeted rerun.

All original game assets are text/code. The 6.6 MiB HTML is self-contained, and the interview JSON parses and matches the in-game canonical report.
