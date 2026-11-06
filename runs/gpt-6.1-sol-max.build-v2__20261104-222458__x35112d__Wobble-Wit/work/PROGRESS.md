# Wobble Wit — complete

Built the game from PLAN.md using TASK.md's package and delivery names.

## Deliverables
- Game: `Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html` in this workspace root (11,735,180 bytes, self-contained HTML).
- `exit-interview.json`: all source information, four testing answers, six engine answers, four prompt answers and AI Hub catalogue fields; valid JSON.
- Development source: `Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458/`.
- The HTML contains matching editable `about-data`, the unmodified AI Hub 1.4.0 client, font and asset/motion license notices, and compressed WASM. Package checksum: `432929aae2266a828b50ee2f1d8e568addc35a8aa10cbde6c1dc924f149e59ce`.

## Implemented
- Original title selected with a real random draw from fifty candidates; record in dev/title.json.
- Pavilion engine base `49ef2ba`, Rust 1.98.1, WASM/WebGPU; native egui presentation and procedural puppets.
- Shared deterministic Balance Core, native stick/keyboard/mouse input, controller glyph switching, ten-foot menus and touch-only requirement/Settings card.
- Five-day stay, daily four-part check and Balance Age, island walking/interactions/flip-flops, minute banking, calendar, wardrobe, saves, ghosts, all eleven activities, Big Stand/Long Stillness, both endings, credits and Free Play.
- Thirty original primitive props, nine room sets, twenty-three FIT clips, procedural music/SFX/formant gibberish voices with 10% music default.
- Attract loop, Settings, How to Play, full About/feedback pages and pause-accessible dev jumps/cheats/time/tuning/view controls.
- Local 2–4 guest medley; AI Hub 1–4 player ghost medley. Covered pre-round drawing is deferred until start so four software-rendered copies are ready promptly.

## Verification
- `tests/run.sh all`: **58 passed, 0 failed**. Logs in dev/notes/test-*.log and dev/notes/final-tests.log.
- Core: 13 tests (whole stay on 3 seeds; each event bot/idle/careless on 5 seeds; physics/input, snapshots/replay, saves, pause, tuning, attract, 4-guest medley, finale, menu and mouse interaction regressions). Audio/UI: 8 tests. Browser: 31 checks. Hub: 6 checks.
- Hub: 2 players; 3 and 4 with 150 ms latency, 50 ms jitter and 5% loss; host leave; solo isolation; exact client bytes. Four-seat ready times after the startup fix: 2.04–3.92 seconds.
- Native gallery: fourteen 1920×1080 captures, inspected in dev/out. Rhythm-lane, carrier and island-run camera corrections were rechecked visually.
- Chromium/WebGPU file opened and inspected at 1920×1080 and 2560×1080, plus small phone, landscape phone, tablet and laptop compositions. About source and feedback pages also captured and inspected.
- WebKit: fourteen viewport-matrix cases clean, zero overflow/JS failures. Report: `/tmp/viewport-matrix/wobble-wit-webkit-20261104/`; log copied in dev/notes/viewport-webkit.log.
- Sixteen game/UI issues found and fixed, two startup-blocking; ledger dev/notes/feedback.md. Harness-only timing and float-equality false positives are excluded.
- `cargo fmt --all --check` clean; own content lint clean; embedded WASM decompression/magic, About/interview equality, Hub client and license block validated in dev/notes/package-check.json.
- No physical controller, TV or real iOS device was available. Controller/audio/touch stand-ins used. WebKit tested the WebGPU-required fallback, not real iOS Safari gameplay.

## Rebuild and extend
- `cd Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458 && tools/build.sh` rebuilds the exact root HTML and imports exit-interview.json.
- `tests/run.sh [core|browser|hub|all]` prints failures and one count.
- Fit game: engine/crates/pav_core/src/games/fit; UI: pav_ui/src/fit_ui.rs; browser bridge: pav_app/src/weblink.rs; synth arrangements/voices: pav_audio/src/music.rs and voice.rs.
- Rules, dialogue, charts and sets are editable TOML; props and clips are readable JSON. See dev/README.md.
- Build/download/staging caches removed after verification: engine/target, fonts-download, hub-test and Python bytecode. Source, test harness, notes, licenses and capture evidence remain.

No required work remains. No sub-agents were used. No public tunnel was created.
