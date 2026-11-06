# Dead Sea Sigh — build progress

**Status: COMPLETE.** All milestones M0–M11 are finished. The final combined command passed **78/78 checks**, including the non-cheating opening, all contracts and three endings, WebKit mobile/tablet UI, controller navigation/paused About, rendered multiplayer pickup/banking/melee/fire, all five hub conformance scenarios, WebGPU, and matching WebGL/WebGPU replay hashes.

Deliverables: the root standalone HTML and `exit-interview.json`. All required feedback is also embedded in About/Credits. The development folder contains the build source, README, license notices, 78-check final report and inspected screenshots. The engine checkout and scratch diagnostics have been removed. No further work is pending.

The remainder is the chronological build record.

## Decisions and deliverables
- Read PLAN.md §§1–2 and Appendix A; read all system and milestone requirements.
- Title selected by Python `secrets.randbelow` from 50 brainstormed titles: **Dead Sea Sigh**.
- Dev folder: `Dead Sea Sigh-Far Cry 2-gpt-6.1-sol-max-20261105-053720/`.
- Final file: `Dead Sea Sigh-Far Cry 2-gpt-6.1-sol-max-20261105-053720.html` in this root.
- Required root handoff: `exit-interview.json`, this progress file.
- No subagents. Single offline HTML, pinned my-3D2dge v0.88.0 / World3D, three r182, Rapier 0.19.3.
- Source plan supplies detailed technical research. No additional source-game research planned.

## Current milestone
M0 — fetching engine, implementing single-file build and fast no-render test rig.

## Remaining
M1 land/time/weather; M2 player/weapons; M3 fire; M4 hands/rasp; M5 vehicles; M6 AI/papers/buddies; M7 story/save/endings; M8 screens/Dev/attract; M9 Salvage and hub; M10 audio/polish; M11 final testing, feedback, clean engine checkout.

## Testing and environment
- Node 24.22.1, Python 3.14.8, Playwright 1.63 and esbuild installed.
- User's `~/dev/TESTING-TOOLKIT.md` is absent here; viewport-matrix command exists. TASK.md contains equivalent testing details.
- Tests will live behind `python3 test/run.py`, with an issue ledger.
- Keep screenshots and all test output inside dev folder per TASK.md; launch at most two browsers; any local server binds 127.0.0.1 on an OS-assigned port and is stopped by its own PID.

## M0 complete
- Pinned engine downloaded; single 4.6 MB offline HTML built.
- New numbered modules retain native merged geometry, grass, IK soldier animation, ray/physics and view-model pen.
- Fast rig passes 3/3: boot/settings, deterministic replay, no page errors.
- M1 terrain/sites/structures and day/night/water implemented; renderer screenshots in progress.

## Current implementation checkpoint
- M1: bowl terrain, 14 named sites, roads and six posts, trawler fleet, lighthouse, dam, reeds/thorn/bottle trees, dynamic day/night, water and dust storms. Noon/dusk/night pictures inspected; no renderer errors.
- M2–M6 systems implemented: nine original gun models, ammo/wear/jam/break; stamina/crouch; syrettes and four surgery variants; smoke-sensitive lung/ampoules; 512² wind-driven fire with terrain/grass mask, flames and smoke; all four native-physics vehicle types, repairs/wrecks/convoys; papers, AI states/wounded/flanking, civilians and buddy rescue/permadeath.
- M7: all campaign contracts and three endings in data, survey stakes, cases, shop/crates, sleep, RLE burn-state saves. Contract bot implemented; needs full integration tests.
- M8: title/passports/HUD, held canvas map/log/catalogue/watch/locator, live Dev pages, About, eight-vignette attract loop.
- M9: shared-world host/client messages, banking, respawns, standalone AI rivals and hub lifecycle implemented; harness still to run.
- M10: code-generated music at 10%, per-gun layered sounds, four coughs, babble, loops and plucked strings.
- Still required: integration fixes, expanded test command, renderer/viewport/WebKit tests, all hub scenarios and WebGPU, final interview/credits, cleanup.

## Validation checkpoint
- Core simulation suite: **19/19 passing** (boot, replay, guns, fire, health/rasp, vehicles, papers, buddy rescue, persistence).
- Bot has completed P0, P1, C1–C7 and reached The Contract ending through real input actions; arithmetic/sounding validation remains.
- Hub conformance **all five passed** with 150 ms latency, 50 ms jitter, 5% loss: 1/2/4 standard, 4 host-leave, 2 dedicated-server. Ready before shader warmup, bidirectional traffic and finish/leave handling confirmed.
- Issue ledger currently records 11 issues, including 5 critical (combat/progression, network consistency/PvP, and pad usability); see `test/ISSUES.md` for the authoritative tally at finish.
- Added streamed thorn/bottle trees, charred variants, matched soldier head colliders, fixed shot/recoil ordering, connected the dam stairs, fixed D-pad menus/stick aim, made ending choices mouse-hoverable and explicit mercy selection.
- Run browsers sequentially: shared-machine memory pressure has terminated concurrent test browsers. Mute generated audio during accelerated simulation tests.

## Final validation and handoff work
- All three complete campaign playthroughs passed, including the six-minute defence and wheel-hold endings.
- Rendered browser/UI suite passed 32 checks before the Firefox headless-render environment limitation; WebKit phone and tablet rendering, Settings, controller notice, actual idle attract, all 8 vignettes, key/mouse/stick exits, glyph switching, Dev, About and held-map mesh passed.
- Firefox's missing WebGPU flag constants during Three import are now handled with a compatibility prelude. Firefox has no headless WebGL context here; Xvfb cannot create its listeners in this shared environment. Test Firefox simulation/replay, and wide rendering in Chromium. Do not claim rendered Firefox coverage.
- Core suite expanded to 23 passing checks, including real road/mud speed differences and crash damage.
- Latest issue ledger: **20 issues, 8 critical**, all fixed; these numbers are filled into root `exit-interview.json` and will be embedded in About by build.
- Root `exit-interview.json` created and parsed, required feedback sections filled; README and engine-change log written.
- Still pending: rendered multiplayer case/bank replication (fixture was incorrectly waiting on the harness main frame; fixed), WebGPU smoke (wait for sceneName, because built readiness deliberately precedes shader warmup), final all-suite run, final visual check of basin-facing ending, remove engine-repo and scratch diagnostics.

## Final-run checkpoint
- Last combined run: 71/72 passed. The sole failure was a touch-notice timing check that sampled before shader warmup and title entry; the browser test now waits for scene entry, like the WebGPU check.
- WebGPU renderer smoke passed; its replay hash matched its repeat. Final suite additionally compares against the rendered WebGL hash.
- Rendered two-player pickup/bank replication passed with both copies reporting 2 banked stones and zero engine errors.
- Added explicit host melee → client damage and client bottle → host ignition checks after fixing their authority paths.
- Latest source/feedback ledger: **24 corrected issues, 10 critical**. JSON and About were rebuilt with these numbers.
- Final dam view uses the full 46 m height, connected stairs/ladders, a basin-facing wheel stance and NPC height checks. Map hands/watch and vehicle dash locator are visible.
- A standalone render-hub subset process was terminated by the shared environment (exit 143); do not count that as a game defect. Clean any orphaned loopback server only by its proven PID/cwd.
- Current command: `python3 test/run.py` on final HTML, sequential browsers, session 8823. Still finish final reports, inspect the latest flood/phone PNGs, remove engine-repo and scratch diagnostics, validate root JSON and artifacts, stop owned servers.

## Release verification
- Opening without god mode, the complete campaign, all endings, network banking/combat/fire, WebGL/WebGPU, browser UI and replay checks have passed.
- The controller About scroll fix passed the updated rendered/UI suite: **37/37**.
- Final issue ledger and embedded interview: **27 corrected implementation issues, 11 considered critical**. Shared-machine process terminations and test timing/fixture mistakes are excluded.
- Native engine checkout and scratch scripts have been removed. Vendor licenses are embedded in the standalone file and retained with development sources. HTML session client remains byte-for-byte unchanged.
- No more game changes planned. Final full command is running as session 5851; expected 78 checks. Preserve successful `test/final-report.json`, validate final package hash and JSON, and mark this progress file complete.

## Complete
- Final command: `python3 test/run.py` — **78/78 checks passed; 0 failures**. Detailed results: dev-folder `test/final-report.json`.
- Corrected issues: 27, including 11 classed critical; environmental terminations and test-fixture timing errors excluded.
- Final root HTML is self-contained, includes required feedback and third-party licenses, and preserves the session client unmodified. JSON validates.
- Actual iOS Safari/physical pad/TV/human listening were unavailable; WebKit and device/pad/audio stand-ins were used. Firefox simulation/replay passed; rendered Firefox was unavailable in this headless environment.
- Final package size: 4901933 bytes. SHA-256: `e3851b4ca65dad6a89c46025b9a575f39a5c0913dfe870adae1fe01570838038`.
