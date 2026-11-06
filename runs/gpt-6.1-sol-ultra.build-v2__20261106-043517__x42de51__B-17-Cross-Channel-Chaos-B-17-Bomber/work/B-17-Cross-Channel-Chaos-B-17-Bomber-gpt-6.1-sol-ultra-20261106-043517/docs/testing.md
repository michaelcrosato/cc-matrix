# Testing evidence

This record distinguishes automated simulation evidence from browser, audio and physical-device checks. No physical controller, touch device, second human player or human listener is present. Headless stand-ins establish software behavior only.

## Release evidence summary

The complete final **`npm run verify` passed: 579 checks, zero failures, exit code 0**, with all fourteen recorded suite entries passing. The root HTML and development HTML have the same SHA-256: `fdb98be625f8249b3667ba6ceaad98f1a4bda925a54aa0ddc9647cbbf55f3728`. The authoritative release record is `verification-summary.json`; detailed aggregate evidence is `verify/last-run.json`. The artifact is self-contained, starts offline without network requests, and its embedded credits match the root exit-interview JSON.

| Suite | Final recorded result | Evidence |
| --- | --- | --- |
| Deterministic simulation, including nine whole sorties | 141 checks, zero failures | `simulation-results.json` |
| Procedural audio and lifecycle | 37 checks, zero failures | `audio-results.json`, `verify/audio.log` |
| Browser UI, inputs, renderer and portability | 223 assertions, nine scenarios, zero failures | `../tests/browser-result.json`, `verify/browser.log` |
| Repeated native split-screen foreground retention | 102 assertions, Chromium and WebKit, zero failures | `../tests/split-result.json` |
| Final top-level menu guard and Review briefing | 32 dedicated assertions passed, then covered again by the complete 223-assertion final browser run | Menus/preferences/credits scenario, `../tests/browser-result.json` |
| Public keyboard/mouse whole operation | 8 checks, zero failures | `public-playthrough.json`, `verify/public-input.log` |
| Hub adapter units and simulation integration | 17 unit checks and 11 integration checks, zero failures | `verify/hub-unit.log`, `verify/hub-sim.log` |
| Build, Biome, Ruff, static checks and package | All pass in the final complete verifier; metadata and root/development artifact match | `verify/last-run.json`, `verification-summary.json` |
| AI Hub admission and strengthened cleanup | Five scenarios passed, 66 admission checks, no client warnings; nine terminal copies remain stopped after native Escape | `hub-results.json`, `hub-final-summary.json` |

The 579 figure is the verifier's reported aggregate; underlying per-suite assertion/scenario counts are shown separately rather than summed using a different counting scheme. The complete browser cases are menus/preferences/credits; pause/dev/editor/free camera; attract/input consumption; mixed couch co-op; two pads/glyphs; touch/multitouch; copied artifact portability; WebKit native renderer; and Firefox's unsupported-renderer explanation. The strengthened Hub run passes all five scenarios and 66 admission checks without warnings. All nine terminal copies remain stopped, muted, without active sound sources or further sends after actual native Escape input; each authoritative host reports once. `hub-final-summary.json` records the same final artifact hash.

The closed construction ledger records **40 corrected implementation issues, four critical**, in `issues.md`; test-driver mistakes and environment limits are excluded. The intermittent split foreground issue is closed: independent native camera-space overlays and per-viewport drawing pass 102 focused retention assertions in Chromium/WebKit and the complete final browser suite. The retained standalone title/results menu guard and Review briefing transition pass their dedicated 32-assertion regression and the final complete run. There is no known unresolved feature or implementation issue, and every final release verification gate passes.

## Audio

`tests/audio-test.js` exports `runAudioTests()` for the combined browser verification command. It renders the same procedural functions used by the game through `OfflineAudioContext` at 48 kHz. Initial run: **30 checks, zero failures**, with eleven distinct effects/voices producing finite nonzero samples, peak amplitudes 0.030–0.315 and zero samples after each bounded ending. A native-compatible lifecycle fixture confirms ten-percent first-run music, setting preservation, stopped sources on pause/end/dispose, and silent offline output after cleanup. The adapter routes machinery/effects, music and radio voices through the engine's native buses.

After the initial run, the door mechanism and simulation event mappings were added. That affected suite passed 32 checks, covering twelve distinct synthesized sounds. A later network audit found that compact Hub snapshots intentionally omit high-rate gun events, leaving guest gunfire silent. Audio now observes authoritative mount-shot counters when no new local event already sounded that station. The affected suite was rerun: **37 checks, zero failures**, including host event/counter deduplication, unchanged-snapshot silence, guest counter-driven gun sound and terminal source/output cleanup. Original audio recordings were not audited, so no reproduction or listener-quality claim is made.

## Deterministic simulation

`tests/sim-test.mjs` exports `runSimTests()` for the combined verification command. It runs actual accepted `command` calls and fixed 1/120-second `step` calls. Whole-sortie bots read observable state, aim and choose stations, evade flak, release based on the shared sight prediction, and order return; they do not modify mission state or resources. Isolated edge-case fixtures explicitly set up subsystem, ammunition and approach conditions before using real commands and simulation.

Coverage includes all nine loadout/difficulty combinations; takeoff, stall recovery, course handover and input override; throttle/weight/fuel tradeoffs; swept shots and all four spatial mounts; finite ammunition and duplicate scoring; bomb prediction/impact, salvo debit, duplicate release, last bomb, hit/miss; real flak/evasion and battery suppression; each damage fallback and emergency action; aborted recovery, hull destruction, fire progression, empty fuel, ground collision, deadline, replay reset; co-op ownership/departure; practices, dev tools and mission-data round trip.

Final simulation result: **141 checks, zero failures**, reproduced in the complete `npm run verify`. The edge suite contributes 87 checks and the nine whole-sortie combinations contribute 54. Every combination completed all mission beats, saw all four bearings, fired guns, encountered flak, deliberately released bombs, observed impact, destroyed the primary and safely recovered without invulnerability or infinite resources. Regressions verify that an occupied-seat exchange immediately grants command to the new pilot, repeated same-station requests preserve aim without radio/event flooding, and the dogleg really reduces coastal barrage cadence. After the authored recovery correction, all nine full sorties additionally assert the physical runway endpoint at east −1800 / south 0 / altitude 80 units, stopped airspeed, fully deployed gear and airborne=false before debrief. Structured evidence is in `docs/simulation-results.json`.

| Loadout | Difficulty | Active seconds | Fuel left | Hull left | Fighter kills |
| --- | --- | ---: | ---: | ---: | ---: |
| Standard | Cadet | 590 | 46% | 44.1% | 5 |
| Standard | Crew | 590 | 39% | 20.1% | 5 |
| Standard | Veteran | 646 | 24% | 7.7% | 4 |
| Long Legs | Cadet | 635 | 49% | 44.8% | 4 |
| Long Legs | Crew | 635 | 43% | 21.1% | 4 |
| Long Legs | Veteran | 613 | 43% | 4.3% | 4 |
| Heavy Hand | Cadet | 624 | 39% | 45.6% | 5 |
| Heavy Hand | Crew | 624 | 32% | 22.2% | 5 |
| Heavy Hand | Veteran | 602 | 31% | 4.6% | 5 |

Each used two bombs; one direct hit destroyed the ship and the subsequent bomb was scored as wasted ordnance. Durations establish roughly 10–11 active minutes for this scripted first-run route. Browser, portability and multiplayer evidence is recorded in the release summary and sections below.

## Browser, input and portable package

The final complete browser suite passes **223 assertions across nine scenarios**, saved in `../tests/browser-result.json` and `verify/browser.log`. The historical 210-assertion native-overlay run is retained in `browser-final-full.json`. Standard-mapped pad stubs exercise two-pad and keyboard-plus-pad input, glyph changes, station/command handover, simultaneous panes, menu ownership and disconnect handling. Pointer hover, aiming and menu back routes are tested, including retained title/results screens and Review briefing after scene transition. Touch emulation exercises multitouch, contextual held gunfire, deliberate bomb release, and both cancellation and completion of the irreversible jettison hold. Practice-to-normal replay resets correctly. The developer editor's Back route rebuilds its toolbar; free camera, live tuning/reset and Player2 navigation retain useful control. A separate focused split test passes **102 assertions** in Chromium and WebKit, proving repeated first-person frame/barrel retention after both viewports render. The engine files remain unchanged.

The delivered self-contained artifact starts from a copied, isolated offline location. Native WebGL 2 rendering passes in Chromium and WebKit. The Firefox installation has no usable WebGL 2; it displays the verified explanatory unsupported-renderer screen. Credits, full notices, Hub metadata, verbatim first-head session client, exact root/development artifact equality and the exit-interview JSON shape/content are checked by static/package verification. The final credits answers are filled from evidence, and the JSON matches their structured source.

Screenshots assess the settled title/briefing, cockpit/gauges, directional station identities, bombsight/targets, developer volumes, split views and mobile layout. Taking a screenshot during a native menu-opening animation initially showed an empty transitional panel; the settled image was required to assess the actual screen. No screenshot substitutes for state, objective, authority or network assertions.

## AI Hub

The original complete downloaded harness run passed normal two-player play; 150 ms latency, 50 ms jitter and 5% loss; guest departure; host departure; and a playerless authoritative server. Across these five scenarios, all **66 admission checks** passed and no `[AIHub]` warning was recorded. Game assertions additionally establish that both players affect their stations, guest release consumes once, state converges, departure returns duties to AI, the host reports once, and terminal cleanup stops sources and sends. The playerless server advances independently of visible rendering.

The completed strengthening run adds native pause input after end and rechecks the engine, mute, audio-source and send counters. All five scenarios pass; all nine terminal copies remain stopped, muted and silent without further sends after native Escape. Its per-scenario records include `afterTerminalPauseInput` in `hub-results.json`; `hub-final-summary.json` records the exact tested artifact hash, five passes, 66 checks, zero warnings and nine verified terminal copies.

## Issue ledger

Two simulation implementation issues were discovered during review and communicated before the first edge run: the initial flak danger radius exceeded controllable displacement within its reaction window; replay's one-shot warning cache survived reset. The main builder fixed both, and explicit regression checks now pass for evasion and repeated warning delivery. Neither prevented the whole game's startup. A stale queued nonurgent audio caption surviving an urgent interruption was also corrected during audio review.

The first whole-sortie bot attempt missed its release window because the test bot recommitted route while retaining its own held bank command; normal direct-input behavior canceled course hold. The bot now neutralizes its controls before ordering course hold. This was a test-driver error, not a game defect, and is excluded from game issue totals.

The first native-input browser bot destroyed the primary and four fighters but did not evade return flak or use its extinguisher, so it lost the aircraft on return. The integrating builder extended that input script with the same defensive decisions as the successful simulation bot. The corrected run passed **8/8 browser-playthrough assertions** at **619 active seconds**, with **32% fuel**, **86% hull**, **four fighters**, **two bombs**, and **sixteen actual keyboard evasion moves**, without cheats. The failed initial script was an incomplete fixture and is excluded from game issue totals. The resulting recovery review discovered that debrief could precede physical runway touchdown; authored recovery interpolation now corrects this, and the subsequent nine-sortie physical aircraft-state regressions all pass.

Most helpful simulation test: the complete nine-combination operation, because it ties flight, ownership, aiming, damage, finite ordnance, target consequences and return reserves together. Isolated formula checks are useful for exact impact math but cannot establish playability by themselves.

## Integration audit follow-up

The read-only requirement audit found pilot-look plumbing, fine/coarse sight presentation, persistent independent voice volume, free-camera input wiring, missing touch firing/jettison paths, local Player2 map command identity, indirect pilot command transfer during seat exchange, repeated station-request radio flooding, and the dogleg's initially cosmetic risk description. These were corrected and covered by the simulation, audio and final browser suites. Emergency jettison now captures/cancels the held pointer correctly: releasing outside the original button cancels the irreversible hold. The browser suite verifies both cancellation and deliberate completion.

Guest gunfire sound was an additional confirmed integration issue: mount shots rendered and consumed ammo, but the transport's intentionally trimmed event stream omitted their audio. The monotonic-counter presentation fallback and regression checks described above correct that without changing authority or packet rate.

Developer visualization now draws actual target/fighter collision volumes, swept shot segments, attack paths and authored encounter-trigger planes through the native pen. Mission authoring, deterministic numeric seed input, state/definition export and live parameters are complete. The canonical count/severity record is `issues.md`; this narrative does not introduce a second issue total.

Issue 38 is closed by the native camera-space overlay proof above. Issue 39 retains the standalone title/results screen when native Back/Options would otherwise hide its sole menu; Hub, attract and pending scene transitions are excluded. Issue 40 carries the Review briefing intent through the queued native title-scene entry, preventing that briefing from being replaced by the title menu. Both final navigation corrections pass the dedicated 32-assertion menu regression. The engine files remain unchanged.

## Confirmed limits

The installed software WebGPU route was attempted and produced device-loss/buffer errors. It is not a passing renderer claim; the release uses the tested native WebGL 2 backend by default. Hardware WebGPU behavior is unknown. No physical controller, touch device, second human, real iPhone/iPad, television or listener was available. Device profiles, pad stubs, multiple browser clients and Web Audio measurements are the prescribed stand-ins. Exact original audio timbres were not audited; the shipped score, effects and invented voices are original. Standalone remote room hosting is not implemented or advertised: remote cooperation uses AI Hub, while standalone supports solo and local two-person play.
