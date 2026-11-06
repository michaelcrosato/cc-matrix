# Beauty and the Falling Fool — complete

The requested game and handoff are finished. No implementation work remains.

## Delivery

- Root HTML: `Beauty-and-the-Falling-Fool-Beauty-and-the-Beast-1982-gpt-6.1-sol-max-20261106-043922.html` — 1,417,127 bytes, self-contained and playable by direct file URL without external networking.
- Root `exit-interview.json`: exact TASK schema, all fields and ordered answers populated; valid JSON; Usage is exactly `added on import`.
- Development folder: `Beauty-and-the-Falling-Fool-Beauty-and-the-Beast-1982-gpt-6.1-sol-max-20261106-043922/`.
- SHA-256: `5cfc0c6fca6cd3a2e2a9e57fc307a1d24911707ae0bf8abe4fdb2f523d1f8deb` (also in `artifacts/delivery.json`).
- Title process: privately generated 50 candidates, cryptographic draw selected #32, **Beauty and the Falling Fool**. Candidate list was not disclosed.

## Verification

From the development folder, run `npm run --silent verify`.

**Final result: 68/68 checks passed; 0 failures.** The command prints only failures and one aggregate line.

- 41 rule scenarios: native movement forgiveness/jump height, shutter boundaries/hold/reverse/descent/closure, every hazard's dodge and powered clear, swept collision, bumper reverse/drop, split trajectories, shared hearts/chances, score idempotence, checkpoints/failure/continuation, normal solo/co-op/harder routes, normal-input failure/retry route, draw independence/determinism, lane bounds, snapshot isolation.
- 4 transport scenarios: complete two-client plus non-playing-server rescue; 150 ms latency/50 ms jitter/5% loss with helper departure and rescue; sender/range/duplicate/stale validation; time-up/end cleanup.
- 21 packaged browser cases: offline file boot, UI/focus/help, keyboard/mouse window traversal, pause, live balance/reset, all credits, complete rescue/departure, audio analyser/offline voice/mute, attract threshold/raw wakes/drift/save isolation, emulated pads/glyphs/disconnect, two-pad and keyboard+pad routing, real CDP multitouch in both hand settings, touch wake, blocked storage, WebKit touch/landscape, Firefox Canvas, pristine Hub standard/server/host-leave conformance, actual three-copy Hub rescue and end cleanup, null-handshake fallback.
- 2 package/interview checks: inline parse/pristine first client and exact interview schema.

Final normal-input solo proof: 98.17 simulation seconds, 19 climbs, 7 hearts, 3 powered clears, 2 recoverable hits. Every hazard family and reverse/drop/split behavior was exercised. The real normal-network Hub harness completed a tied team rescue with equal authoritative results. Human first-player seven-to-nine-minute pacing is unknown; the semantic pilot is deliberately fast.

Authoritative reports: `artifacts/verification.json`, `rules.json`, `network.json`, `browser.json`, `hub-rescue.json`, and the pristine harness scenario reports. Visual evidence includes title, gameplay/pause, co-op, touch, rooftop/results and window/throw motion strips. Motion strips were inspected for grip, throw and recovery. Old manual-run transcripts are under `artifacts/history/`.

## Implementation and dependencies

- `content/tower.js`: three authored four-floor sections, three-beat rooftop, replay variations and validator.
- `src/simulation.js`: one authoritative rules implementation; native Platformer plus exclusive native E.Action window ownership, checkpoints, award ledger and debug snapshots.
- `src/presentation.js`: custom native shapes/materials/rigs, animated shutters/creatures/plane, layered masonry/skyline, Canvas lighting and comfort settings.
- `src/audio.js`: original chip phrases, procedural effects and synthesized gibberish; music defaults to .1.
- `src/network.js`: 12 Hz host-authoritative snapshots/intentions, acknowledged edges, bounded prediction/reconciliation, server-host lifecycle and guarded finish.
- `src/app.js`: native Shell, controller/keyboard/mouse/touch adapters, local co-op, attract, dev mode, settings and About.
- `tools/build.mjs`, `verify.mjs`, `browser-check.py`, `motion-check.py`, `load.mjs`; obsolete prototype drivers removed.
- `content/AUTHORING.md`: schema, rule ownership, controls, reproducible commands and provenance.

Full my-3D2dge **0.89.1**, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`; Hub protocol 1 / unchanged session client **1.4.0**, commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Both vendored core files have no git diff. Client banner is preserved and it is the first script immediately after charset. No engine core edits; game registries/hooks extend it. No runtime image, audio, JSON or adjacent-script dependencies.

## Research and honest limits

Read PLAN.md, TASK.md, engine API/asset/platformer/guide contracts and full Hub README/shared-world example. Consulted the original manual transcription, INTV Funhouse and MobyGames. Downloaded and visually inspected the Games Database 30.2-second emulator capture at five-second intervals; reference video/strip stay in development artifacts and are not embedded.

Physical controllers/touch devices, real iOS hardware, human listening, original melody and first-player pacing are **unknown**. Device tests are emulation; audio is measured, not auditioned. TASK date/model metadata is preserved. Usage/cost/tokens/time are not estimated.

## Tracked findings

**23 findings, 4 critical, all fixed.** Fixture corrections (float precision, cross-VM array identity, Back selectors, unsuitable pilot jump timing, test loop termination and controller-pilot translation) are excluded.

1. Negative tumble timer stalled the semantic/attract pilot; clamp recovery to zero.
2. CRITICAL: canvas stayed at its default 300×150 CSS size; fill the viewport.
3. CRITICAL: title layout placed controls outside the viewport; fix scaled Shell layout.
4. One shared boulder contact spent two team chances; add an incident ledger.
5. Boulder collision core made normal late jump clearance unfair; use a smaller core.
6. Bird crossing needed readable safe pockets; author a higher edge arc.
7. Missed final heart could strand the showcase pilot; reoffer on the reached ledge.
8. Null pad binding disabled solo controller input; use native any-pad routing.
9. Shell entries did not focus on mouse hover; add one delegated focus handler.
10. Replica hazards froze between snapshots; extrapolate through shared hazard logic.
11. Changing seat devices could trigger a false disconnect pause; reset native binding state.
12. Phone framing shrank climbers or clipped Hank; set native portrait/taller framing.
13. Action rig-facing angle leaked into signed body facing; keep orientation in presentation.
14. CRITICAL: authored-timing refactor briefly referenced an undefined opening variable; headless draw/update caught it.
15. Decorative ledges and half-tile collision ends disagreed; use a native 8-unit map grid.
16. Hank could stay in one release pose; drive the entire throw/recovery from its event clock.
17. Hub seat colors/names were missing from presentation; use assigned accents and text labels.
18. Bumper links/behaviors were not fully consumed; use authored fixtures on every affected lane.
19. Bird edge arc could hit the ledge above; bound it to its lane and add a regression.
20. Buffered Hub climb request advanced after release; consume it when traversal takes ownership.
21. Debug snapshots aliased checkpoint/regroup objects; copy them and test mutation isolation.
22. CRITICAL: null Hub handshake retained the initial session flag; restore the complete standalone runtime.
23. Left-handed touch moved the stick without its jump zone; mirror both and test both hand settings.
