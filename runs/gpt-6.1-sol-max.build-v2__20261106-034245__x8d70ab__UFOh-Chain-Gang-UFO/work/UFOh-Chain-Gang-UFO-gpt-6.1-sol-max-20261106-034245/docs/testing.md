# Verification and issue ledger

Run **`npm test`** in this development folder. The coordinator captures verbose diagnostics in `artifacts/`, prints failures plus one count, and exits nonzero on failure. `artifacts/test-results.json` is the final authoritative count; `build/manifest.json` identifies the exact tested HTML. Subsets are documented in README. Static checks cover authored code only; vendored runtime/client files stay untouched.

## Evidence

- `mission-playthrough.json`: seeded legal move/aim/fire through the native 1/120-second clock, all fifteen encounters, ordinary interactions, all three command phases, extraction and victory. No invulnerability, enemy deletion or win command. A first successful mission takes about 595 simulated seconds. Its milestones retain sector timing, hull and score.
- `exported-mission-playthrough.json`: the same legal pilot through the actual single-file browser application, drawing throughout, followed by results and replay. This verification run is deliberately unranked.
- Simulation regressions: acceleration, diagonal normalization, rails, clockwise seam/stop, actual-bead fire, repeated/cooldown fire, shield reset and half speed, grace/immunity, swept collisions, fusion cancellation, hostile fire cover, unique chain ownership/score, boss covers/phases, extraction, local rescue, both-down failure, survivor victory, content validation, storage denial/corruption, and score-attack loop/termination.
- `browser-results.json` / `browser-console.json`: Chromium keyboard/mouse, emulated standard pads, PlayStation/Xbox labels, native rebind/settings/pause/dev routes, independent keyboard+pad/two-pad ownership, controller loss, seed reset, six-letter keyboard/controller/touch entry, phone/tablet multitouch and cancellation, exact idle/attract loop/cancel categories, storage persistence, final-file errors and isolated copy. Firefox/WebKit standalone smoke is included.
- `hub-one-player.json`, `hub-two-players.json`, `hub-adverse-network.json`, `hub-host-leave.json`, `hub-server-host.json`: the **unmodified official harness**. Every report must have `pass:true`. The adverse case uses 150 ms latency, 50 ms jitter and 5% loss. The server host has no local pilot. The harness validates readiness/countdown, traffic, lifecycle, final results and prohibited operations.
- `hub-gameplay.json`: real host/nonhost shared gameplay over that adverse network. Different frame dimensions and a live resize preserve the fixed world and seat-two pointer projection. The test exercises an overlay and reserved chord, seat-two touch rescue cue, actual rescue contact, a one-tick remote cannon tap and cascade, fusion, all boss phases, final tied victory, bounded packets and silence/no traffic after end. Low emitter hull and immunity are explicit network-test fixture setup; phase hits still use real remote input/cannon/collisions. A separate leave/time-up case clears the departing pilot's held fire and reports a team loss.
- Thirty adapter/codec checks cover packet rates, 16 KB limits on actual dense worlds, sender/sequence validation, loss/reordering recovery, stale input, one-tick fire-edge retention, overlay/lifecycle cancellation, interpolation/prediction, server hosts and exactly-once finish.
- Thirty-five audio checks use native synth voices and OfflineAudioContext: finite samples, nonzero expected output, bounded peaks, distinct cues, five original songs, bus gain ratios, gibberish, unlock, mute/stop, end latch and event epochs. The first-run music setting is 0.10; a changed value survives reload.
- Purposeful visual captures: title/victory/boss/cascade at 1920×1080; phone/tablet. Screenshots judge typography, silhouettes, focus, ring/bead clarity, warning contrast and touch occlusion. They do not substitute for state assertions.

No FPS target or optimization benchmark is used. No listener, physical pad, real phone/tablet, iOS Safari device or TV was available. Device profiles and standard-pad stubs are the requested stand-ins. Numerical audio checks cannot establish subjective listening quality. Original UFO! audio waveforms remain unknown.

## Fixed implementation findings

Exactly **25 implementation findings** are counted; four blocked a supported flow or could break an encounter. The remainder were integration, correctness or readability defects. Test-coordinator/fixture authoring errors are excluded, including a final two-page fixture readiness race corrected by waiting for both navigated games. Each fix is retained in the source and covered by a relevant semantic test or visual review.

| # | Finding and correction | Impact |
| --- | --- | --- |
| 1 | Empty-record names changed on storage roundtrip; preserve the empty-score sentinel. | Minor |
| 2 | Floating modulo at packet cadence could send extra packets; subtract intervals with tolerance. | Minor |
| 3 | Nonhost movement prediction ran during launch; gate it on real running state. | Minor |
| 4 | Boss warning lines differed from actual volley directions; lock and render the same fan. | Gameplay |
| 5 | Late pad unlock could rearm sound after Hub end; latch terminal audio stop. | Lifecycle |
| 6 | Event timestamp rollback was an unsafe audio epoch; use explicit run epochs and stable deduplication. | Audio |
| 7 | Clearing input during pause also erased native controller menu actions; cancel touch without erasing menu input. | **Flow blocking** |
| 8 | Pairing Cross leaked into the next menu; consume the joining edge and select Launch explicitly. | **Flow blocking** |
| 9 | Mouse aiming waited for a click when keyboard was last used; meaningful pointer movement activates aim immediately. | Input |
| 10 | Seat two read the wrong local input/pointer gate; resolve the session local pilot and its single local device. | Input |
| 11 | Native menu input remained usable after session end; consume post-end raw/pad input and close overlays. | Lifecycle |
| 12 | All wrecked during extraction could still win; retain the both-down defeat rule. | Correctness |
| 13 | Tutorial and generic notice overlapped on phones; wrap/scale one teaching prompt below the arena. | Readability |
| 14 | Dense cascade sparks obscured the primary shield/bead; redraw that instrument above effects. | Readability |
| 15 | Touch burst acceptance depended on global clock phase; begin a burst at the contact's aim threshold. | Input |
| 16 | Dev seed reset discarded the paired controller inputs; retain device pairing. | Co-op |
| 17 | Seat-two touch Rescue cue inspected P1; resolve visibility by local Hub player ID. | Co-op |
| 18 | Inherited formation/enemy names and absent boss/score dependencies passed import; reject them before replacing working data. | **Encounter breaking** |
| 19 | Touch name entry lacked letter/finish controls; provide visible touch arrows plus always-usable Save/Edit/Skip. | **Flow blocking** |
| 20 | Old projectile iterator continued after boss/phase clear; stop the batch when its authority array is replaced. | Correctness |
| 21 | Remote taps shorter than a packet interval vanished; retain one fire edge until a successful send. | Input/network |
| 22 | A local press released before the next tick could vanish; accept pressed as well as held fire. | Input |
| 23 | Radio gibberish lacked a dedicated readable subtitle in some boss/intro states; add event-matched radio captions. | Accessibility |
| 24 | Team name wheel only read the primary input; allow the paired pad to edit and finish all six characters. | Co-op/input |
| 25 | Hunter-arming and recharge-progress cues were defined but unwired; emit each once at its actual simulation threshold. | Audio feedback |

Engine modifications: **none**. All fixes are in game/adaptation code. The native engine, MIT notice and released Hub client remain intact. No unresolved implementation finding is intentionally left in the delivered game.
