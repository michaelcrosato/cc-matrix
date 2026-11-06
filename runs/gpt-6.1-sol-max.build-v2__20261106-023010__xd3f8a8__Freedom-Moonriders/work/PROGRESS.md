# Freedom Moonriders — completed handoff

## Deliverables
- Title: Freedom Moonriders. Selected once with node:crypto.randomInt from exactly 50 private candidates.
- Development directory: Freedom-Moonriders-Freedom-Fighters-1982-gpt-6.1-sol-max-20261106-023010/
- Root HTML: Freedom-Moonriders-Freedom-Fighters-1982-gpt-6.1-sol-max-20261106-023010.html
- Root metadata: exit-interview.json
- Canonical reporting data: Freedom-Moonriders-Freedom-Fighters-1982-gpt-6.1-sol-max-20261106-023010/src/report.json

## Completion
The complete game, canonical reports and final bundled HTML are ready. No implementation work remains.

Implemented: playable rescue opening; open reach; prison orbit, guards, moving mine formations and ion shroud; three-phase carrier; playable hyperspace extraction; honest rescue/loss outcomes, checkpoint retry/resume and rank; three-minute Evasion; solo, two-pad couch, keyboard/mouse + pad and AI Hub shared-ship co-op; keyboard/mouse/gamepad/assisted multitouch; ten-second isolated attract with two AI seats; native Shell hierarchy, rebindings, glyphs, help/settings/credits; live tools, exact balance reset, fresh scenarios and immediate paused step/spawn feedback; versioned storage; original native pixel art/clips/materials, music/effects and all three code-generated voice profiles.

## Final verification
`node tools/test.mjs --full`: **127 checks; 0 failures** (69 native rules/full-run cases, 48 browser/harness cases, 10 real co-op cases).
- Ordinary-action operation and 180-second Evasion pilots reach victory with no invulnerability, teleporting or direct objective completion.
- Real two-copy co-op reaches victory with identical authoritative ledgers, score and outcome. It covers all boss phases, local overlay isolation, online read-only tools and round-end input/audio/loop cleanup.
- All official Hub cases pass: standard, 150±50 ms / 5% loss, host-leave, server without local player and solo.
- Standard-pad stubs cover both disconnect paths, role swaps, navigator-owned menus, keyboard + a single pad and shared glyph preferences. Phone/tablet profiles in both orientations and WebKit/Firefox boot checks pass.
- Offline audio is finite, non-silent and bounded; music starts at 0.10; actual voice selection reaches pilot/navigator/survivor.
- Reviewed settled 1920×1080 title, opening/warp, minefield, carrier, pause/tools/credits and narrow touch screenshots.
- Final file:// browser check confirms the bundled report exactly equals root metadata and no engine errors occur.
- 25 unique repaired defects (2 critical) are documented in docs/issues.md; repeated failures and harness mistakes are excluded.

Evidence: artifacts/verification-summary.json, browser-results.json, cooperative-results.json, playthrough-operation.json, playthrough-evasion.json, delivery-manifest.json and PNGs. The co-op proof fingerprint matches the final game, engine, client and test sources.

## Foundation and contracts
Full my-3D2dge 0.89.1 at 8ecc2f62353761187bdfe226f327b7ea5d2eb691. AI Hub client 1.4.0/protocol 1 at 35a1047f2067b2af3de3943f0fe452f39105d869. No core engine edits. Session client is unchanged, once, first head script after charset. The final HTML has no adjacent runtime dependencies.

Simulation contracts, source research, requirements map and defect evidence are in docs/. Read docs/decisions.md before extending lifecycle/input/network behavior.

## Reproduce
From the development directory:
- `node tools/build.mjs`
- `node tools/test.mjs` (reuses the long co-op proof only if all covered source hashes are unchanged)
- `node tools/test.mjs --full` (forces the entire network playthrough)

All dependencies, source, research, logs, screenshots and runtime profiles stay under this development directory. Test servers use private loopback ports and shut down only their own server.

## Reported limits
Research inspected the original manual, two screenshots and 66 storyboard samples from the verified Odyssey² recording. Continuous playback/original audio was inaccessible; exact original sound is unknown. Physical controllers/touch hardware, real iOS, a TV and human listening were unavailable; stand-ins are explicitly identified. Human first-run duration is unknown; expert automated runs are faster than the 10–15 minute first-run pacing target.

The final reply must include Source Information and all Testing (4), Engine (6) and Prompt (4) feedback answers in order. The complete answers are in the root JSON and in-game About pages. Usage is exactly added on import.
