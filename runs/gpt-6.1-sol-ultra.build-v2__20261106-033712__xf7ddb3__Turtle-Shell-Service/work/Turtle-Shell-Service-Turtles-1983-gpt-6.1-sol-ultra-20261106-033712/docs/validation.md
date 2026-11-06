# Validation evidence and issue ledger

Single command: `npm run verify --silent`. Optional suite selection uses the same command, e.g. `-- --suite browser,hub`. It emits failures and one final count line. Native engine stepping is preferred for rules; browser checks load the exact root deliverable through file://. Hub checks start their own loopback server on an OS-selected port and shut it down. No physical controller, phone/tablet, TV, remote human or human listening test is claimed.

## Behavioral evidence

- Ordinary solo campaign through the final file's native keyboard input: five floors, 26 rescues, score15400, two lives remaining, 338.41 playable seconds. No teleports, objective edits, dev flags, unlimited stock or invulnerability. It exercised22 bombs,28 stuns,11 refills, one damaging hit, recovery,32 detections,36 escalations and four decoys. A fast deterministic bot is a faster repeat run; new-player10–15 minutes remains a tuning target, not a measured human duration.
- Native headless solo and simultaneous co-op campaigns also finish through E.Game.advance with finite production lives. Content validation covers all authored floors; graph, collision and rendering derive from the same rows.
- Actual unmodified AI Hub1.4.0 client plus supplied bridge/round/local network: player-host full campaign won26 rescues/three lives/15450points/179.65s; dedicated-host full campaign won26/two lives/15400/176.47s. Every authoritative objective, score and outcome was synchronized and finish occurred once. Largest observed snapshot stayed below16KB.
- Dedicated150±50ms/5% loss stress run reached the roof and ended with a synchronized valid team loss at20 rescues. This is a network recovery/outcome test, not a claimed campaign win under loss. The full supplied browser harness passed normal, latency/loss, dedicated-server and host-leave scenarios (53 native conformance assertions), with actual completion markers and build identity checked. Additional assertions prove a native pause overlay does not stop the host world and neutralizes local intentions.
- Browser input checks cover keyboard focus, mouse routes/cancellation, standard-mapped pad stubs, separate two-pad/shared-keyboard seats, unplug recovery, native settings/sliders, retries, About pages, persistence and denied storage. Native input regressions cover sparse indices2/5, replacement7, menu device loans, no mirrored motion, and held-confirm bomb suppression.
- Real Chromium CDP touch pointers drive the invisible native stick, collect a hatchling, and place a bomb with a second action finger. A WebKit phone profile loads and starts the final export. These are emulations, not real iOS hardware.
- Attract starts after10 idle seconds, completes all five floors/26 rescues/ending, loops, exits on keyboard/mouse/pad/touch and consumes the waking input. Axis noise does not reset it. It never modifies ordinary records.
- OfflineAudioContext exercises actual synthesized voice/SFX/music: finite signal, RMS0.0138, peak0.1693; actual music bus0.10, SFX1, voice0.70 and immediate master mute. Browser gesture unlock and source cleanup are checked. Audio quality as heard by a human is unknown.
- Purposeful1920×1080 title, roof passenger, and results captures, plus390×844 phone and1024×768 tablet captures establish composition. Visual review corrected route obstruction, title tint, menu wrapping and small portrait HUD text. No FPS/performance target was tested.

## Unique issues found and fixed

Seventeen unique game/UI/integration issues. One is classified critical because a remote seat could lose control indefinitely; all are fixed. Test-harness implementation errors are excluded from the issue count.

| ID | Severity | Finding and fix | Covering evidence |
| --- | --- | --- | --- |
| S01 | Major | Old enemy direction requeued during an edge skipped junction planning; choose anew at centers. | Pursuit-junction regression and ordinary full runs |
| S02 | Moderate | Released straight movement traveled an extra cell; retain only perpendicular buffered turns. | Movement-stop and mouse-target checks |
| S03 | Minor | Out-of-range escalation input used an unclamped dependent value; enforce threshold ordering from clamped values. | Balance constraint regression |
| S04 | Moderate | Repeated dev-spawn IDs collided; allocate distinct IDs. | Dev-spawn regression |
| N01 | Major | Time-up could be undone by the next frame's playing calculation; persist a time-up latch. | Network time-up/end tests |
| N02 | Minor | Previous-floor event rings replayed old guidance/audio; filter by authoritative floor in network/art. | Stale-floor event regression |
| N03 | Critical | A long packet gap with action counter jumps could permanently reject a seat; accept bounded monotonic counters and coalesce one action. | Long-gap input recovery regression |
| P01 | Minor | Full-screen Shell tint dimmed title art; constrain tint to modal screens and title gradient. | Title capture review |
| P02 | Moderate | Bottom guidance covered the final corridor row; reserve camera/HUD space. | Full-maze roof and tablet captures |
| P03 | Minor | Countdown read AIHub.time as a value; call the documented millisecond function. | Real Hub countdown/harness |
| P04 | Moderate | Developer sliders appeared in ordinary Settings; native hidden flag keeps explicit dev rows accessible. | Settings catalogue and Hub read-only checks |
| P05 | Moderate | Sound.stop did not track SFX/babble sources; track/flush handles and mute immediately at Hub end. | Actual audio cleanup assertion |
| P06 | Minor | Exiting a demo ending left part of its loop timer; reset it on start/title. | Complete attract loop/exit checks |
| P07 | Major | Hard-coded pad indices failed for sparse/replacement devices; explicitly reassign connected unused pads and clear stale observed device state. | Eleven native seat/replacement/menu regressions |
| P08 | Minor | Results statistics wrapped into three columns, pushing actions below the initial view; use four columns and responsive portrait layout. | Results capture review |
| P09 | Moderate | Holding Cross/Space after intro/menu confirm planted a bomb, and re-detected held pad confirm could start a run after waking attract; require release before another gameplay/menu action. | Native intro/resume regressions and final browser attract/pad tests |
| P10 | Moderate | Closing native results could expose the terminal playfield; return to title when the result overlay is dismissed. | Final-file results close/retry regression |

Initial verification-tool mistakes (broad import/audio regexes, native aria-label casing, float32 exact comparison, and assuming Input.feed drives a touch stick) were corrected. They were not defects in the delivered game.

The final unified count and completion state are recorded in root PROGRESS.md after the last bundle verification. Build evidence JSON is in build/.
