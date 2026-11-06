# Validation evidence

The delivered game is complete. The full core/integration run passed 171 checks with zero failures. Final packaging passed 8 checks, final visual capture passed 2 checks, and all four official Hub scenarios passed again after the final Hub status-control adjustment.

## Behaviour exercised

- All 25 course/car combinations finish valid, clean AI laps using the real car model and ordered directed gates.
- Input-driven title → all eleven tour stops → ending → replay, including a real splash/recovery, the inter-course connection, both pursuit scoring rules, a complete Duel, and the grand lap.
- Two-lap and classic five-lap trials, split timing, recovery penalties, versioned best/ghost data, retries, pause, dev tuning/reset, record separation, storage failure and malformed ghost fallback.
- Forward gates and rejection of reversed/skipped/teleported/oscillating line attempts, nearby-road continuity, safe restart slots, simultaneous crashes, crash-over-lead priority, wins, draws and same-tick final state delivery. Contact-pushed gate crossings have a regression check.
- Shared-keyboard independent seats, pad+keyboard and two-pad seat assignment, complete scored couch duels, analog triggers, controller disconnect safety, native focus and glyph settings.
- Chromium phone and WebKit tablet touch stand-ins: simultaneous steering/braking, interruption cleanup, pause/resume and native rendering.
- Ten-second attract boundary, immediate consumed exit, and no passport/record writes.
- The hidden airfield straight starts and finishes a real timed driving run. A native headless drawing pass completes without errors.
- Offline synthesized motor/SFX/voice signal is nonzero and bounded; live procedural music is measured across note/rest windows; initial music gain is .10 and master mute reaches zero.
- Real WebRTC channels in separate browser contexts, from file URLs and a loopback URL: gathered invitation/reply candidates, malformed input, readiness, matched cars, authoritative lead/crash points, live menu, read-only diagnostics, finish, rematch and vanished-host cleanup. Application-level 150 ms delay and 5% state loss are applied around the actual channels.
- Official Hub harness: one player, two players with 150 ms latency / 50 ms jitter / 5% loss, host departure, and actorless server authority. Every report has pass=true, not just completion=true. Forbidden side-transport constructors are guarded in these tests.
- The final HTML has no external scripts or audio/image-file dependencies. Its first script is byte-for-byte the pinned official Hub client. Engine notices and full MIT license are included. Root and development HTML match; exit-interview.json has the required schema and matches the in-game report.

## Inspectable artifacts

- tests-all.json, tests-core.json, tests-package.json, tests-visual.json and tests-hub.json: quiet-run results.
- ai-laps.json and tour-playthrough.json: actual simulation outcomes.
- direct-file.json and direct-loopback.json: real two-context final match states and ICE-candidate counts.
- hub-standard-1.json, hub-standard-2.json, hub-host-leave-2.json, hub-server-2.json: official checker reports.
- title-final.png, setup-final.png, driving.png, results.png, about.png, dev.png, phone.png, tablet-webkit.png, tour-ending.png: composition/input evidence.
- filmstrip.png and motion.json: real steering, skid and brake poses with moving camera/scenery. Reviewed visually.
- deliverable.json: final byte count and SHA-256 digests.

All evidence files are in docs/evidence. docs/issues.md tracks 13 unique issues, including 5 critical issues, their fixes and confirming checks. Earlier failure logs remain as history; the named final result files take precedence.

## Practical limits

Physical controllers, real touch hardware, a TV, real iOS Safari, human listening, external remote-device play, cross-NAT internet and TURN coverage are unknown. Testing used the explicitly permitted stand-ins. Chromium and WebKit were exercised; Firefox was not part of this validation run. No FPS target, profiling or optimization gate was imposed. Tests close their own browsers and loopback servers; none remain running for this build.
