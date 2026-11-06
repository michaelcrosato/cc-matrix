# Complete — Trauma Refrain: Third Opinion

## Deliverables
- Single-file game: `Trauma-Refrain-Third-Opinion-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-015057.html` (5,989,069 bytes, 5.71 MiB).
- Full source, build scripts, authoring data and tests: `Trauma-Refrain-Third-Opinion-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-015057/`. Start with its `README.md`.
- Required metadata: `exit-interview.json`, parsed and verified identical to the HTML About block.
- SHA-256: `351976efd3669c8261f5dd037c54ab948d54a777a277a0aa3ddf48e6d93ddb69`.

## Implementation
- Title selected with Python `secrets.randbelow` from 50 original riffs; runtime title comes from one Rust constant.
- Pavilion engine at 49ef2ba. Deterministic surgical Game, recorded four-seat input, native view emitter and dedicated wasm host. HTML/CSS shell and procedural Web Audio.
- Eight campaign cases; all instruments, hazards, four strains, Hush/Echo/Duet, shocks, checkpoints, scoring and ranks. Original 164-line story with extruded animated paper actors.
- Full menus, case files, versioned saves, settings, dynamic PS/Xbox/keyboard prompts, mouse and keyboard-only operation, four local pads, eight-page live dev panel, looping attract mode and controller-required touch screen. Shift+E is the keyboard defibrillator chord.
- AI Hub shared-world Code Blue: custom card, authoritative host, predicted local cursor, compact snapshots, host/server/leave/time-up/end handling. Server copy has no renderer, interface or sound.
- Cases and story are editable JSON. Designer guide: `engine/crates/pav_core/src/games/surgery/content/README.md`. Font and unmodified hub client embedded. All required source/feedback sections appear in About.

## Verified
- `python3 tests/run_all.py`: **55 passed, 0 failed** (16 Rust/engine compatibility, 29 browser, 10 hub).
- Complete campaign, all tools/strains/gifts/Code, idle loss, expert ranks, Code Blue survival, snapshots/replays and AI-partner limits. Native CLI campaign also won 10/10 seeds.
- Actual mouse painting, extraction, suturing and timed laser; DualSense flick/analog input; local join/disconnect; mouse gift timing; keyboard-only resuscitation; settings persistence/audio output; attract and pause-submenu protection; every chart/dev panel and all small-phone settings pages.
- All hub harness scenarios pass (impaired four-player network, host leave, server host, solo), plus real two-copy input/vitals/keyboard synchronization and silent server validation. Random harness arrows are isolated during measured input tests.
- Viewport matrix: **24 clean, 0 issues, 0 failures**, phones/foldable/tablets/desktops/ultrawide in Chromium, Firefox and WebKit. Inspected full contact sheet and individual phone/tablet/wide PNGs.
- Real WebGPU captures inspected at 1920×1080: title, operative field, paper theatre, chart, results, dev and About. Final small-phone Sound/Controls screenshots inspected in WebKit.
- Rust formatting and wasm Clippy passed with warnings denied. Final packaging checked metadata shape, exact About JSON, unmodified first-script session client, font licence and resolved build markers.
- Evidence: `tests/out/verification.json`, `final-checks.txt`, browser/hub reports, screenshots, and `tests/viewports/report.json`.

## Findings and limits
- Runtime/visual tests caught controller input arbitration, touch-attract exit, chart contrast and panel overflow; all fixed. Additional regressions cover idle AI assistance, touch/keyboard transitions, pause settings and keyboard-only shocks. Test assumptions about completed phases and random harness input were corrected.
- The 3D game requires WebGPU (Chrome/Edge). WebKit/Firefox checks cover the clear requirement message and responsive shell; WebKit is not real iOS Safari. No physical controller, second human, real iOS device or listening review was available.
- Engine licence: unknown; none supplied in the checkout. Barlow Condensed uses SIL OFL 1.1; full licence embedded. Usage remains “added on import”.

## Rebuild / resume
- No required work remains. `tools/build.sh` rebuilds the wasm and exact root HTML. `tools/bundle.py` can repack shell/story/metadata changes using cached `build/` glue after compiler-cache cleanup.
- The 2.3 GiB `engine/target` compiler cache has been removed as requested. Sources, cached distribution wasm/glue and all validation evidence remain.
