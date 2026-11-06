# The Incurable Wizard — COMPLETE

## Deliverables
- Game: `The-Incurable-Wizard-The-Incredible-Wizard-1982-gpt-6.1-sol-max-20261106-022835.html` in this workspace root. Opens directly from file://; no runtime downloads.
- Machine-readable handoff: `exit-interview.json` beside it; exact required schema validated.
- All development files: `The-Incurable-Wizard-The-Incredible-Wizard-1982-gpt-6.1-sol-max-20261106-022835/`.
- Root HTML and the tested development copy are byte-identical: 1,412,030 bytes.
- SHA-256: `965153541fe489fdeb4cfc217b03f8f9de45a82878847316ab5d2587c155e936`.

## Implemented
- Six original authored chambers, 136 finite hunters, three families, cardinal movement and independent aim, buffered turns, one owned bolt and swept first-impact collision.
- Shared corridor visibility and radar; shootable reveal/lure bells; paired gates; catch/escape familiar chases; separate current/earned multipliers and final exit bounty.
- Fixed Wizard intrusions and three one-hit finale manifestations, alternating lightning rhythms, telegraphs and safe destinations; complete victory, defeat, retry, results, credits and replay.
- Solo and simultaneous couch co-op; explicit keyboard/pad device assignment; AI Hub host-authoritative shared-world co-op, no-player host, leave/time-up/end handling and acknowledged terminal snapshots.
- Native TV shell, keyboard/mouse, PlayStation/Xbox standard-pad glyphs and rebinding, invisible multitouch controls and contextual bell/target taps, comfort settings, versioned settings/checkpoints/records with Practice exclusion.
- Original native art/weapon/shapes, procedural animation, all-code music/effects/gibberish, 10% initial music; private 10-second attract loop and comprehensive live developer pages/reset.

## Verification
- Canonical command from the development folder: `node tools/verify.mjs` (or `npm test --silent`). Prints failures only and one final count.
- Final exact-name packaged run: **71 checks, 0 failures** — 41 core/native-integration, 28 browser/input/audio/Hub, 2 build/package checks.
- Ordinary-command campaigns passed Normal solo (594.04 s), Gentle solo (587.30 s), Fierce couch co-op (585.36 s). Each covers all six chambers, bells, a gate traversal, six familiar catches and five Wizard banishments. No invulnerability, direct kills or phase skips in those success paths.
- A separate full native E.Game command pilot passed through results, credits and replay.
- Chromium, Firefox and WebKit phone-profile checks passed. Pad stubs, rebinding, couch ownership, touch/cancel/context taps, all-device attract wake, storage, retry, every developer control and reset covered.
- Hub standard/host-leave/no-player-server admission passed at 150 ms latency, 50 ms jitter, 5% loss. Separate two-peer combat passed shared kills/visibility/bonus/all three finale hits, identical 28,800 score and terminal traffic/audio shutdown. Largest packet in final combat: 4,876 bytes (limit 16,384).
- Actual engine synth rendered all 16 game effects offline: peak 0.175, finite/nonzero output, silent tail. Human listening unavailable.
- Inspected native title, bell/hidden-hunter fight, finale, developer, credits and both phone orientations. Evidence lives in `evidence/`.
- 13 distinct implementation issues fixed, including 2 critical; see `evidence/issues.md`. Test-harness mistakes excluded.

## Provenance and constraints
- Title selected from 50 riffs by Node crypto.randomInt(50), index 21: The Incurable Wizard.
- Full my-3D2dge 0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691; engine source unmodified. Original native assets and game adapters extend it.
- AI Hub protocol 1/client 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869; official client preserved byte-for-byte as first script after charset.
- Research: manual transcription + scan, December 1982 article, archived hardware frames. Manual wins discrepancies. Exact historical AI/synthesis and human first-run pace are unknown.
- No physical pad, real phone/iOS, TV viewing or human listening available; documented stand-ins used. Automated Normal duration is 9:54, not a measured human first run.
- Source Information and all required feedback appear in the embedded About/Credits and matching exit interview. Usage is exactly `added on import`.
- Every file stays in this task workspace; all browsers and test servers started here have been stopped. No other agent processes touched.

## Remaining
None required. Rebuild with `node tools/build.mjs`. Designer data/authoring notes, native API docs, reference arcade kit, test harness and tests are retained in the development folder.
