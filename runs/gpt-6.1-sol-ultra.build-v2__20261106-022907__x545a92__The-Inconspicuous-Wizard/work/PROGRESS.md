# The Inconspicuous Wizard — build progress

Development folder: `The-Inconspicuous-Wizard-The-Incredible-Wizard-1982-gpt-6.1-sol-ultra-20261106-022907`
Final artifact: folder name + `.html` in workspace root, plus `exit-interview.json`.

## Implemented
- Title chosen with crypto.randomInt from 50 candidates.
- Source research: manual transcription, scan, contemporary Dec1982 article; archived footage frame downloaded. Audio not human-auditioned.
- Full readable my-3D2dge 0.89.1 pinned commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Official unmodified Hub client1.4.0 at35a1047f2067b2af3de3943f0fe452f39105d869.
- Six authored19×13 chambers, deterministic serializable simulation, one-bolt swept combat, LOS/radar, three hunter families, finite waves/replacements, bell lure/reveal, portals, familiar catch/escape, scripted Wizard/finale, multipliers/exit bounty, lives/retry/checkpoints/difficulties.
- Native pixel/volumetric original character/prop renderer, room lighting/materials; original coded music/SFX/gibberish voices.
- Native Shell title/setup/co-op/help/credits/pause/settings/rebinding/developer pages. Keyboard/mouse/pad/touch adapters; idle10s attract. Still integration-testing.
- Authoritative Hub adapter: host/server stepping independent of render/focus,9Hz snapshots/12Hz input, stale/malformed validation, finish/end lifecycle. Protocol13 checks pass; harness browser checks running.
- Standalone inline build tools/build.mjs produces dev/game.html and index.html; --release copies exact named root HTML and metadata.json interview.

## Current work / remaining
- Root integrating final UI/input/audio/browser verification, HUD layout, attract/wake, persistence, metadata, verifier.
- simulation agent owns content/rooms.js, src/sim.js, tests/sim.mjs; adding edge tests and honest campaign evidence. Honest Normal bot wins in267.2simulated seconds (perfect informed bot; human10–15min unconfirmed).
- native_render agent owns src/render.js, vendor engine, tests/render-smoke.mjs; reviewing native craft and real-state renderer.
- hub_network agent owns src/network.js, vendor/hub, tests/network.mjs, tests/hub_browser.py; checking official harness.
- Need metadata.json full interview, root exit-interview.json, README authoring/testing docs, final one-command suite, actual inspected screenshots. No final acceptance claimed yet.

## Commands / interfaces
- `node tools/build.mjs` (cwd dev folder); final `node tools/build.mjs --release`.
- Python browser: `/home/micha/.local/share/pipx/venvs/playwright/bin/python`.
- `WizardSim.Sim`, `.step(dt, commands)`, `.s`, `.snapshot()`, `.save()`, `.load()`, `.retry()`, `.dev(action,value)`; directions0right1down2left3up; integer-centered cells.
- `window.__wizard` app debug boundary; `.sim`, `.net`, `.game`, `.snapshot()`, `.test`.
- Only processes started by this build may be stopped. All work stays within dev folder except progress + required root deliverables.

## Integration verification update
- Simulation now37 passing checks; honest Normal campaign257.717seconds, Gentle279.475seconds (perfect automated player, no human timing claim).
-13 network protocol/shared-sim checks and50 initial packaged Hub browser checks passed; final suite expanded to54 with physical mouse-to-seat1 and nonhost departure cases.
- UI first pass exposed single-step missing Practice tag and touch wake synthetic click leakage. Fixed both. Added native portrait360×640 sizing and dedicated readable phone radar/status after screenshot review.
-14 audio checks pass: all6original compositions/nonzero output,17SFX/voice cues, finite nonclipping samples (peak0.1103), silent envelope tail,10%music bus and cleanup. No human listening.
-13 distinct issues logged so far,3critical. Full metadata source/feedback written in dev metadata.json; root hand-in not copied until final verification.
- One-command `npm test` implemented in tools/verify.mjs; captures all noise and prints failures + count. Native renderer and UI agent finishing changed checks/screenshots. Final integrated full command still to run.

## Final verification in progress
- Latest actual remote mouse test passed4 targeted checks (seat1 aims/shoots its own lane, nonhost leaves safely, host continues and finishes). All processes from that scenario closed.
- Mouse pre-click device ownership and both radar accessibility settings now affect actual presentation/audio;15total distinct issues fixed,3critical.
- Final bundled root HTML and interview written; exact dev/root HTML hashes match. Engine file hash matches pinned original unchanged.
- Full `npm test` currently rerunning all final-artifact suites after fixes; no final pass claimed yet.

## Complete
- Final command: `npm test` → **141 passed; 0 failed**. Includes37simulation checks,13network checks, native rendering,14audio checks,12UI/browser groups and54official/real-transport Hub checks, plus syntax/schema/package validation.
- Full successful campaign runs use ordinary movement/aim/fire commands, not invulnerability or direct enemy deletion. Normal automated timing257.717seconds; first-human10–15minute pacing remains unverified.
- Inspected final title, gameplay, Wizard, dev, results, credits and phone views. Chromium153, Firefox155 and WebKit26.6 supported in installed headless environments. No human listening or physical-device test occurred.
-15 distinct issues fixed,3critical. `evidence/issues.json` records them. Final verification and package hashes in `evidence/verification.json` and `evidence/release.json`.
- Root deliverables: `The-Inconspicuous-Wizard-The-Incredible-Wizard-1982-gpt-6.1-sol-ultra-20261106-022907.html` and `exit-interview.json`.
- Development copy and root HTML compared byte-for-byte; metadata and root interview compared structurally; validated final tested hash. Official Hub client and pinned full engine retained unchanged.
- All development material remains in the named dev folder. All test browsers and ephemeral servers were closed by their owners. No further implementation work remains.
