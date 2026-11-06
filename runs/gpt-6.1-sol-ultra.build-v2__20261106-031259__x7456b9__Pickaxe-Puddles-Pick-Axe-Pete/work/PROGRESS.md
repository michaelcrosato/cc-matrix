# Pickaxe Puddles — build progress

## Delivery
- Title selected by crypto.randomInt(0,50): index8, **Pickaxe Puddles**.
- Development folder: `Pickaxe-Puddles-Pick-Axe-Pete-gpt-6.1-sol-ultra-20261106-031259/`.
- Final single-file artifact: `Pickaxe-Puddles-Pick-Axe-Pete-gpt-6.1-sol-ultra-20261106-031259.html` (currently about1.4MiB, file:// standalone).
- Root `exit-interview.json` contains the exact TASK schema and is embedded into About/Credits by the packager.

## Implemented
- Full native my-3d2dge0.89.1 engine (pinned8ecc2f62353761187bdfe226f327b7ea5d2eb691), pristine AI Hub1.4.0 client (35a1047f2067b2af3de3943f0fe452f39105d869).
- Native Platformer/PlatformMap, deterministic120Hz simulation, seeded supplies/reward deck, stable entities/events, snapshot/restore with native movement internals.
- Five/six/seven-tier chambers, three symbol/color doors, permanent and temporary ladders, rolling/bouncing/heavy ore, timed chop and high/low redirects, six-contact picks, rising keys/falling picks, guaranteed unarmed/key recovery, three-mark health, rescues, checkpoint retries, three-bell extraction, results/replay/practice.
- Solo, simultaneous local co-op, genuine Hub shared-world with authenticated actions, prediction, bounded snapshots, countdown/end/time-up, hidden nonplayer authority, loss/jitter/latency proofs.
- Original registered shapes/materials, native Humanoid helmet/tool hooks/custom poses, layered cave/machinery, particles/lights, phone portrait tracking/edge warnings, reduced motion/flashes.
- Controller/keyboard/mouse/touch menus and controls, native rebinding/glyphs, multitouch assistance, independent coded music/SFX/gibberish (music default10%), paginated About/Settings/Developer, ten-second attract using real canonical input.
- One documented native engine patch allows fractional fixed-resolution downscale on narrow screens.

## Verification completed so far
-30native simulation checks including all normal-input solo routes/co-op, snapshot continuation and bounded recovery.
-80deterministic Hub checks including full expeditions on all routes and hidden authority under150±50ms/5%loss.
-64official Hub harness checks passed a stable previous artifact; final aggregate must rerun after latest changes.
-34isolated real browser audio/input/pad/multitouch checks;111integrated Chromium checks previously passed; new pointer-motion wake makes112in the final suite;16WebKit checks pass.
-Integrated browser suite under final development: most checks pass, including actual touch door unlock/rescue, menus, saved rebinding, Developer reset, attract wake/reset. Input agent is resolving co-op scenario oracle and adding Circle duck.
-Visual proof at1920x1080, phone portrait/landscape, dense climax, unarmed, pause/Developer/About and reducedflash: no native/page errors.

## Current work / team ownership
- Root: final audit, quiet `tools/verify.mjs`, packaging/feedback/docs and completion.
- View agent: improved route-aware normal pilot and native simulation tests/docs after root added real mirror/stagger route geometry and weighted ore personalities. Root restored SUN to original patterns. Keep tests meaningful; no invulnerability/grants in real expedition proof.
- Network agent: rerun actual normal-input network expedition tests/docs after new route/pilot balance, coordinate with view agent. No Net API changes expected.
- Input/audio agent: final integrated `tests/browser.py`, co-op/short touch/Circle checks. Native short context taps were fixed and verified.

## Final next steps
1. Finish route/pilot verification and update actual measured route times/docs.
2. Rebuild after final source changes (`node tools/build.mjs` from dev directory).
3. Run **one aggregate** `node tools/verify.mjs`; resolve failures, rerun only covered changed code. It prints failures and one passing-count line, writes evidence/verification.json.
4. Finalize defects in docs/testing.md and feedback JSON if new actual defects arise (current ledger26unique,5critical; oracle corrections excluded). Engine feedback must mention Screen.resize patch, not say none.
5. Ensure About uses final JSON, artifact hash matches official harness report, JSON parses, source/provenance present.
6. Mark progress complete and hand in root HTML + feedback link. Final reply MUST include Source Information, Testing Feedback(4), Engine Feedback(6), Prompt Feedback(4); report unknown hardware/listening quality and unmeasured10–12minute first-success pacing honestly.

## Useful commands / constraints
- `node Pickaxe-Puddles-Pick-Axe-Pete-gpt-6.1-sol-ultra-20261106-031259/tools/build.mjs` (or within dev directory).
- `node Pickaxe-Puddles-Pick-Axe-Pete-gpt-6.1-sol-ultra-20261106-031259/tools/verify.mjs` full quiet proof.
- Installed Python Playwright: `/home/micha/.local/share/pipx/venvs/playwright/bin/python`.
- No user approvals needed; no publishing/sends. Do not touch sibling runs or shared processes/ports. Official wrapper owns random-port127.0.0.1 server and closes it. No background processes are intentionally left by root.
- Preview: dev/src/view/preview.html; screenshots/evidence and docs inside development folder.
- Native source research audio unknown. Measured skilled repeat runs roughly2minutes; no timer gates inserted to force10minutes.

## Latest release state
- All agents finished. Input/audio and network/view ownership is handed back to root.
- First aggregate:331checks passed across simulation,76networking,34audio/input,111UI,16WebKit and64officialHub, but strict attract coverage found missing tool-break demonstration after the pilot became more competent.
- Corrected kiosk-only last-contact staging; package/demo coverage now passes. Final suite extends this proof to all three looped routes, uses a fixed verified demo seed, and includes pointer-motion wake.
- Added data-driven room count/finale conditions/palette ramps and a fourth-authored-room regression.
- D25: fixed hidden visible-host RAF suspension via a background authority owner; root wires onClockHandoff to reset the foreground RAF clock.80deterministicnetwork checks pass including visibility cases.
- RootHTML About feedback now contains26unique defects,5critical; docs/testing.md lists D01–D26.
- Final full quiet command is running as owned exec session9330. Poll with write_stdin; do not modify source or rebuild until it finishes. Expected total384checks (30sim,80network,47packaging,34audio/input,112Chromium,16WebKit,64officialHub,1build).
- On success, read evidence/verification.json and hub-report hash; update docs/progress only (no HTML changes), ensure JSON parses. Final reply must include the artifact link, full required feedback categories and unknown hardware/listening/first-player pacing limits.

## COMPLETE — verified release
- Final owned verification session9330 exited0: **384 checks passed**.
- Counts:1build +30native simulation/content +80deterministicnetwork +47packaging/demo +34audio/input +112integratedChromium +16WebKit +64officialHub.
- evidence/verification.json passed=true. evidence/hub-report.json pass=true and HTML SHA matches the actual shipped root HTML; evidence/release.json records bytes/hash/counts.
- Root exit-interview.json parses with exact15source fields,4/6/4feedback entries,10catalogue fields, usage=added on import. It is embedded in tested About/Credits.26unique defects fixed,5critical; ledger lists all.
- Native app supports additional authored room/finale/palette data; final normal-input runs complete all routes.
- All agents finished; all owned test browsers/servers closed by their runners; no background process intentionally left. No publishing/deployment was requested or performed.
- Only final hand-in reply remains. No more source edits or rebuilds are necessary.
