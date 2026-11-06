# Progress — Trauma Coast: Second Sight

## Objective and constraints
Build PLAN.md's original surgical action game; TASK.md governs deliverables. All development is in `Trauma-Coast-Second-Sight-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-040244/`; final single HTML and exit-interview.json go beside this log. Engine files remain read-only. No subagents.

## Decisions
- Title selected using Python secrets.randbelow from 50 candidates (index 46).
- Full my-3dge workspace, deterministic seat-input simulation, eight story cases, extra session case, controller-first native mouse play.
- Native procedural 3D art and animations; all audio synthesized, music 10%.

## Completed
- Full pinned engine workspace at 6a1501f; engine files unchanged. Native 3D puppets, actions, PBR tissue, props, tools and synthesized music/voices.
- Eight complete case data sets, extra Gala Shift, sixteen 12-beat story scenes, persistent board/ranks/postcards, phase retries, settings, all eight tools, five strains, Codes, beat Gifts, Consult, Swap and multi-site physiology.
- All front-end screens, developer tabs (play/balance/view/path author/data), controller seats, mouse and rebindable input, touch requirement/fallback, looping attract.
- AI Hub unmodified client first in HTML, own card, host-sequenced native sim stepping, press counters and input timestamps, state hash checks, leavers/server host/standings code.
- Native-engine golden replay per case; headless tests including full Director flow, capture/restore, bot sweeps and four-copy noisy sequencing. Audio DSP tests and visual registration check.
- Real WebGPU browser displayed the title and field without engine errors. Screenshots: out/visual. The field was further refined since those screenshots (smoother indexed sheet, normals, exposure, texture).
- Important fixes recorded as 17 issues in labs/game/TESTING-LOG.md. Read that log for final honest feedback counts.

## Current state / next actions
1. Poll exec session 82830: refreshed goldens and npm tests after the latest rule work. Earlier 2/4-surgeon Mercy failed on final Gel: closed-loop endpoint projected to its start. Fixed bot aim and wrapped coverage; confirm now passes. All other prior tests passed.
2. Poll exec session 78499 or 72381 only if still live; these were finite type checks. A later check is needed after the newest changes. Current sources use Hand = nine numbers plus numeric rest for network timing.
3. Generate calibrated ranks from fresh Resident bot totals; expose one canonical data file and regression check. scoreTotal is now exported from state.ts.
4. Format/check all game code. Keep TS files under 400 lines; main and input/hands may need splitting. Remove obsolete starter gem scene/best files and temporary diagnostics once covered by tests.
5. Bundle with `TMPDIR=/tmp/g.5ozaaka0 NODE_OPTIONS=--max-old-space-size=1536 npm run bundle` (do not run beside a heavy browser). The current root HTML is STALE and had an old texture-registration error. Source view/assets.ts is restored and now registers its texture before the material. one-file.mts synchronizes embedded About from root exit-interview.json using Prettier.
6. Run real browser acceptance: `TMPDIR=/tmp/g.5ozaaka0 node labs/game/tools/e2e.mjs`. It uses stub pads and the actual bundle through all story/cases/debriefs, then dev sliders, couch, glyphs, attract, touch. It has not yet completed successfully; previous boot failure was the now-fixed texture registration order. A quick Node probe confirmed that cause. Adjust tests for new explicit Scrub In seat claims if needed.
7. Run official hub harness via `node labs/game/tools/hub.mjs`. Harness/bridge/round downloaded under out/hub. Script starts and closes its own 127.0.0.1 port-0 Node HTTP server. Four scenarios, limit 8 seconds, zero mismatches required. Not yet run. Session reduces the displayed grid only on SwiftShader; sim remains identical.
8. Add/run Python Firefox + WebKit fallback and responsive viewport checks, include them in verify. Inspect final TV/field/story/phone/tablet/wide screenshots yourself. System Python Playwright available; toolkit document absent. No installs needed.
9. Final BOT_SEEDS=10 sweep, native browser goldens, verify/check/test green. Update README and ENGINE-FEEDBACK (no local patches), finalize exit-interview answers and About, current bundle in root, parse exit JSON.
10. Stop every owned process; remove private /tmp/g.5ozaaka0. No persistent server currently started. A hung browser tree with root PID 778797 was explicitly stopped and verified as this workspace's; do not touch other agents' processes.

## Architecture and paths
- App: labs/game/main.ts; Director/Attractor/settings in app. Pure operation scene: scenes/main.ts, op/*, strains/index.ts; bot.ts.
- Data: cases/*, story/episode-1..8.ts, balance/tools/strains/types/about. Cast/build.ts registers dramatic adult proportions in both Node and browser.
- Live geometry workaround: view/field/liveMesh.ts retains geometry attribute arrays (the attribute subclass copies supplied arrays). Initial triangles are degenerate with bounds preserved to avoid overdraw. Indexed sheet 320×192, software hub 96×58.
- UI: ui/* and styles.css. Audio: audio/*; all generated in code, music .10. Net: net/sequencer.ts and session.ts.
- Deliverables: root HTML basename from identity.json; root exit-interview.json already has exact shape and initial feedback. About source is generated from it during bundle.
- Test runner verify.mjs prints only failures and a count. It currently invokes check, unit tests, build, engine browser replays, e2e and hub; add Python fallback/viewport tool.

## Recent details to preserve
- Gift judging now requires distinct peaks, and takes sampled input ticks for latency compensation. Ensure gift.ts uses sampledTick in BOTH distance and peak calculations; last change replaced the formatted expression.
- Scripted Codes now set vitals to zero. Crosstalk interrupts after first site clears, skips the later redundant Code phase, and grants the first Gift in discovery. Cases 2/3 start with gift=0. These new changes require fresh bot and replay checks.
- Resident extra seats have gift=0. Final Mercy Code waits for every active surgeon. Gel must also finish scars created during the closing phase.
- Hub settings cannot change sim settings; Gameplay tab disabled during sessions, local cursor preferences remain local. Card keyboard handling only in Hands, avoiding duplicate More-time toggles.
- Attract consumes its wake input and runs only on front-end screens, not paused operation settings/Handbook.
- Developer extra bots use the same Hand path. Shapes, assist rings, authored paths and cursor coordinates now actually render.
- One-file module is wrapped by a classic no-WebGPU guard so unsupported engines show a plain message before importing engine code.

## Environment
- Repo root: /home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max.build-v2__20261105-040244__x59c1d3/work
- Development folder: Trauma-Coast-Second-Sight-Trauma-Center-Second-Opinion-gpt-6.1-sol-max-20261105-040244
- The referenced ~/dev/TESTING-TOOLKIT.md does not exist; use supplied toolkit instructions and available Playwright.
- Use short private /tmp/g.* only for socket TMPDIR per PLAN §17.1; all artifacts under dev folder.
- Private socket TMPDIR: /tmp/g.5ozaaka0 (remove at completion).
- No persistent server started. Tool exec session ids above are finite checks; stop only processes started by this task.
