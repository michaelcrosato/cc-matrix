# Smithereens Under Siege — complete

## Delivered
- Root game: `Smithereens-Under-Siege-Stone-Sling-Smithereens-1980-gpt-6.1-sol-max-20261106-032856.html` (1,433,028 bytes; self-contained offline HTML).
- Root report: `exit-interview.json` (all 15 source fields, 4 testing answers, 6 engine answers, 4 prompt answers and complete catalogue data).
- All development files: `Smithereens-Under-Siege-Stone-Sling-Smithereens-1980-gpt-6.1-sol-max-20261106-032856/`.
- Build: `npm run build`; verification: `npm run verify`, from the development folder. Build regenerates both deliverables from one metadata source.
- No remaining implementation work or active test/server processes. Do not restart development or rerun unchanged suites.

## Implemented
- Simultaneous 120 Hz charge/release artillery with three tension settings, buffered reload, safe cancellation, swept collision, prediction and separate remembered impacts per stone.
- Roundstone, masonry stone and deterministic apex-splitting stone; actual castle block health/removal, foundation/support graphs and structural collapse.
- Crew/launcher interruptions, protected return, no repeated split disable/score farming, same-tick mutual destruction and transparent timeout/scoring.
- Five distinct authored courts; ten original rival profiles; complete ten-bout tour with teaching, weighted totals, between-bout saves/resume and championship/replay. Quick duel and simultaneous local one-bout/ten-bout modes.
- Native shaded pixel world, original catapults, native Humanoid rigs/custom poses and repair tools, flags, water, spectators, rubble and non-freezing effects.
- Code-only music/effects/formant speech with native separate buses; 10% default music and working volume/voice/mute settings.
- Native TV shell/settings/rebinding, keyboard/mouse/pad/touch adapters, explicit local seats, current-device glyphs, focus/disconnect handling and portrait target inset.
- Exact ten-second attract threshold, consumed exit input, real simulation showcasing every stone, interruption/recovery, collapse and three courts without save pollution.
- Pause-accessible developer scenarios, tuning/reset, stepping/speed, invulnerability, collision/support/prediction diagnostics and versioned court authoring/import/export.
- Real two-player authoritative AI Hub shared world, automatic readiness/start, no-local-player server host, authenticated sequenced commands, bounded hold reconciliation, retry queues with reserved cancel/final slots, compact repairing snapshots including last-impact markers, passive ACKs, deadlines/leave/end/finish handling and post-end silence.

## Verification evidence
- Final combined `npm run verify`: **209 checks, 0 failures**, in `artifacts/verify-final.log`.
- Subsequent narrowly affected checks after final code review: **7 network/artifact checks**, **36 standalone-browser checks**, and **81 Hub-browser checks**, all with **0 failures**. Logs: `verify-menu-final.log`, `verify-hub-final.log`. Added regressions are included in the default verification command.
- Full tour: fixed seed **71**, all **10 bouts**, all **5 courts**, all **3 stones**, teaching, crew/launcher hits, structural collapse, results and replay; **805.07 simulation seconds** (~13.4 minutes before menus/ceremonies). Actual coverage/results in `artifacts/tour.json`.
- Six unmodified official Hub harness runs pass: normal, 150 ms latency / 50 ms jitter / 5% loss, host leave, server host, plus actual firing/rejected-send tests for ordinary/server hosts. Every case required `__hubCheck.pass` and `body.dataset.complete`.
- Chromium opens the actual root artifact via file://; WebKit phone/tablet profiles, standard pad stubs, OfflineAudioContext, held-input/pause/rebind/authoring/attract tests pass.
- Native live/predict agreement, every isolated last block reachable, sweeps, mutual destruction, recovery, scoring, validated/corrupt/denied persistence, packet budgets and baseline repair covered.
- Visual review: title/focus, charged shot, collapse, repair/protection, remnant, results, credits and refreshed portrait screen. Phone score plates clear the menu corner; magnified target uses the fresh native frame.
- Artifact scripts parse; all ten source modules inlined; released first Hub client unchanged; engine MIT notice retained; no external runtime dependencies/requests; HTML and JSON metadata agree.
- `artifacts/release.json` records final SHA-256, sizes, pinned revisions and verification evidence. `artifacts/requirements.md` and `decision-log.md` map requirements and choices.

## Testing-found game issues (all fixed)
1. Authored lakeside row exceeded stage bounds — court validator caught it.
2. Empty combat HUD/inset leaked onto title — visual review caught it.
3. TV title menu extended below frame — visual review caught it; bounds regression passes.
4. Charge cleanup consumed Escape before native pause — **critical/game-breaking**; browser regression caught it. Correct hook ordering preserves cancellation and pause.
5. Portrait menu corner covered opponent score — phone visual review caught it; overlap regression passes.
- Testing feedback consistently reports **5 issues, 1 critical**.
- Additional code-review fixes: stale-baseline ACK, exact editor import, multiline-import bundling, reserved critical queue slots, title Options guard, correct mouse coordinate conversion and replicated impact markers. These are distinguished from testing-found issues.
- Test-infrastructure corrections are not game defects: renamed Python script that shadowed stdlib `inspect`; passed a string to Node chdir; explicitly drew stopped native games for visual captures; synthetic WebKit pointer IDs require a capture stand-in.

## Provenance / reporting
- Private 50-title brainstorm; `node:crypto.randomInt` selected **Smithereens Under Siege**. Draw receipt in development `build-info.json`.
- Source label exactly **Stone Sling Smithereens - 1980**. European archive says 1981; US manual copyright says 1982. Preserve supplied label and disclose discrepancy.
- Engine **my-3D2dge 0.89.1**, actual acquired HEAD `8ecc2f62353761187bdfe226f327b7ea5d2eb691`; Hub **protocol 1/client 1.4.0**, HEAD `35a1047f2067b2af3de3943f0fe452f39105d869`. No vendor engine/client edits; native extension APIs used.
- Source/API research, official manual and archive/review distinguished from test observations. Game-toolchain skill read and used. No subagents or adjacent runs consulted.
- Exact report date **2026-11-06 03:28:56**, plan **PLAN.md**, model **OpenAI, gpt-6.1-sol, reasoning effort max**, environment **Codex CLI (headless); Linux**, usage **added on import**.
- No physical controller/touchscreen, real iOS device, TV, listener or remote second player. Documented stubs/profiles/independent frames used; acoustic quality unknown.
- Final reply must include Source Information, Testing Feedback, Engine Feedback and Prompt Feedback, plus game/interview links. Everything is complete; no permission request needed.
