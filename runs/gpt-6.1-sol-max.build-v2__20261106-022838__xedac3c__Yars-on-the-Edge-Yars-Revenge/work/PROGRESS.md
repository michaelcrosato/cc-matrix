# Yars on the Edge — progress

Development folder: `Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838/`
Artifact: `Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838.html`

## Mandate
Build PLAN.md completely, following TASK.md. Keep all generated development files in the development folder. Final HTML and exit-interview.json go beside this log. No unrelated workspace changes.

## Current gate: complete
- Read TASK.md and the entire PLAN.md. Read the local game-toolchain skill.
- Selected the title from 50 silent candidates using crypto.randomInt; selection metadata is in project.json.
- Next: research sources; pin/download engine and AI Hub; read full contracts; implement foundation.

## Acceptance gates
1. Foundation and packaging, engine/headless/session proof.
2. Complete siege simulation and rule tests.
3. Three-sector campaign, replay/practice and authoring.
4. Presentation, all inputs, synthesized audio, attract.
5. Online authority and lifecycle.
6. Final artifact verification, metadata, interview and hand-in.

## Verification / issues
No tests yet. Track fixed issues with evidence here and in tests/artifacts.

## Foundation / implementation update
- Title: **Yars on the Edge**. Dev folder and root artifact use `Yars-on-the-Edge-Yars-Revenge-gpt-6.1-sol-max-20261106-022838`.
- Engine pinned at 8ecc2f62353761187bdfe226f327b7ea5d2eb691, v0.89.1. Full README/API/assets card read; adapted SHOOTER overhead/native actor/pixel/light pattern. Hub pinned at 35a1047f2067b2af3de3943f0fe452f39105d869, client 1.4.0. README, full client, arena example and relevant checker/harness read. Vendor copies present.
- Source research recorded in docs/research.md. Source footage retrieval and comic rendering unavailable; limitations explicit.
- Built deterministic pure `Edge.World` at 1/120s, persistent masks/plates, bite/charge, weapon-suppressing static, remote cannon and one reflection, self/team danger, guided pursuers, transforming fortress, refill docks, shared lives, scores, 3 sectors / 6 core hits / airborne-only ending.
- Built native-shell title/help/credits/settings/pause, live dev controls, cell editor/JSON/presets, procedural rigs/FX and bus-routed synth audio, keyboard/mouse/pad/touch adapters, attract pilot, authoritative session adapter.
- `npm run build` creates root HTML plus dev index.html; embeds engine/game/styles and pristine first Hub script. No runtime dependencies.
- Pure ordinary-action pilot now completes Normal in 83.44 simulated seconds with six siege calls, three airborne hits, zero deaths, one renewable refill. Assist also completes. Skilled automated timing is not evidence of novice 8–12 minute pacing.
- Browser test caught a critical upstream engine defect: `boot:false` left `_booting=true`, so `game.go` never changed scenes. Patched imported full engine to clear the flag; patch and provenance recorded. Headless checks now must assert actual scene, not merely a constructed World.
- Visual title test caught clipping from native title padding plus TV scaling; layout corrected, browser recheck in progress.
- Initial pilot failed from unsafe late interception; fixed pilot positioning/early evasion, no hidden combat cheats.
- Tooling issue: tools/inspect.py shadowed Python inspect; renamed tools/visual_check.py.

## Next work
1. Finish first browser/headless scene proof and minimal Hub matrix.
2. Implement unified npm test runner and meaningful sim, campaign/recovery, input/touch/audio/dev, network, packaged-artifact assertions.
3. Review actual combat/boss/co-op/credits screenshots; improve feedback and fix failures.
4. Fill final root exit-interview.json (all required fields), embed it, final build/test and docs.

## Release candidate
- All authored systems are complete. Normal solo pilot completes in 83.44 simulated seconds with zero deaths; co-op ordinary pilots complete in 64.6 seconds. These are automated skilled routes, not measured novice pacing.
- Attract now stages a real diamond reflection, demonstrates all core lessons and completes/loops in about 103 simulated seconds. It remains isolated from records/unlocks.
- Full **server-only-host online campaign** passed with 150 ms latency, 50 ms jitter, 5% loss: shared victory, scores 53184 on all three copies, one host finish, 10 max outbound messages/s, 1106-byte largest packet. Client drawing is stopped during this simulation proof; separate official rendered session runs and UI/pad/touch checks pass. No life, charge, damage or victory cheats are granted.
- Fixed the remote pilot’s delayed-state convergence separately from game rules. Its ordinary action frames run on a test timer independent of client drawing; the host still validates and simulates everything. A prior failed pilot is retained only as development history, not counted as a victory.
- Full source comic is now locally rendered and inspected (printed pages 1 and 6); updated research ledger. Video retrieval remains unverified. No comic image/text is embedded.
- About/Credits and root exit-interview.json contain all required source fields, 4 testing answers, 6 engine answers, 4 prompt answers and catalogue metadata. Usage is "added on import". Interview parsing/schema and exact pristine first-script client checks pass.
- Issue ledger: 15 fixed verification issues = 9 product issues + 6 test/pilot issues; 1 blocked browser play (upstream boot flag). Engine patch/provenance preserved.
- Added explicit controller navigation into Dev, safe pause-menu co-op joining, sparse touch HUD, immune-core impact labels, firing recoil and reduced-flash/motion treatment for the final collapse.
- Latest targeted checks: rules/campaign 43 pass; browser 78 pass before two additional pad checks; artifact 8 pass. Full `npm test` is currently running against the final rebuilt root HTML with the complete network matrix.

## Remaining release steps
1. Read final npm test result, repair any failures and rerun only affected groups; final full coverage must pass.
2. Inspect refreshed final screenshots/credits, write concise final verification evidence, update this log complete.
3. Hand in root HTML, source README and exit interview links, with required Source Information / Testing Feedback / Engine Feedback / Prompt Feedback in final chat. No deployment or external messages requested.

## Final verification clarification
- The full unified release suite passed **217 checks, 0 failures** before the last co-op label correction.
- Full-campaign network assertions now use the reproducible baseline scenario (one remote client plus a server-only host, ordinary actions, client drawing stopped). Separate two-player lifecycle/authority rounds retain 150 ms latency, 50 ms jitter and 5% loss. Deterministic solo/Assist/simultaneous co-op campaigns remain covered. Earlier two-player stress victories are valid development evidence; stochastic combat pilots can also lose legitimate rounds and are not treated as universal balance evidence.
- Last product correction: per-scout siege prompts now use that scout’s own local device. Intentional device reassignment clears the prior pad state so switching to keyboard-plus-pad does not look like a disconnect. New regression added. Issue count is now **16 fixed issues: 10 product + 6 test/pilot**, with one game-breaking upstream boot defect.
- Root interview and in-game credits have been updated to these exact facts. Source code, vendor pins, patch, research, authoring example, build/test tools and evidence are retained. Downloaded research/build caches and obsolete helper scripts were removed from the source folder.
- Final unified suite is rerunning on the rebuilt artifact after this last change; no further features or production changes are planned.


## Complete
- Final `npm run build` emitted the prescribed root HTML and byte-identical source index.html.
- Final unified **`npm test`: 218 passed, 0 failed**, on the final package after the device handoff/prompt repair. All five groups passed: rules, campaign, artifact, browser, network.
- Final evidence and exact artifact SHA-256 are in `tests/artifacts/release.json`; readable results and stand-in limits are in `docs/verification.md`.
- Pinned upstream files were re-fetched: imported engine differs only by the one boot:false fix; client matches pristine Hub session.js byte for byte. Patch is a valid unified diff; manifest records original/modified SHA-256 values.
- Final Source Information and all feedback are in About/Credits and root exit-interview.json with 16 fixed issues (10 product, 6 test/pilot), one game-breaking engine defect fixed, and Usage = added on import.
- No required implementation or verification work remains. All test browsers and loopback servers close in their own cleanup paths. No deployment or external messages were performed.
