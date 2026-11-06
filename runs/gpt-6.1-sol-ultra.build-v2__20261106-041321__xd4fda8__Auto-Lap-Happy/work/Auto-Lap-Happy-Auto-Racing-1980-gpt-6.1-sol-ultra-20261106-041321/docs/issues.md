# Issue ledger

Twelve unique product issues were discovered by tests or visual inspection. All are fixed. Two were critical to completion/replay. Repeated occurrences and test-fixture adjustments are not counted.

| ID | Severity | Test exposing it | Fix | Confirmation |
|---|---|---|---|---|
| W01 | Medium | Native vehicle heading screenshot | Use native shape heading directly, remove quarter-turn offset | Driving filmstrip and all view screenshots |
| W02 | Critical | Legitimate Meadow Mile AI lap stalls at closing bend | Remove too-close final Catmull control point | All25course/car legal laps; classic/tour playthrough |
| W03 | Low | Landmark placement/visual inspection | Move boathouse outside road clearance | Landmark screenshot/schema inspection |
| W04 | Medium | Integrated gate target inspection | Read authoritative route.gate rather than nonexistent next | Native marker screenshot and route tests |
| S01 | High | Full-tour simulation ended duel0–0 | Give real AI separate passing lanes so faster car can pass rather than push a train | Tour10–0; complete scored duels |
| N01 | High | Actual two-page direct game clock advanced3.53s in36s wall time | Independent monotonic online pump with one120Hz cursor; sends/authority continue when hidden | Stopped-renderer/hidden-host, deadline, direct and official Hub tests |
| U01 | Low | First D-pad action retained Enter/Esc prompts | Refresh prompt nodes on meaningful device change | Chromium pad/touch prompt checks |
| U02 | Medium | D-pad graph could not reach Music/Crew sliders | Sequential vertical focus for settings, horizontal value edits | Complete settings focus graph |
| U03 | Medium | D-pad graph could not reach two dev actions | Sequential vertical focus for dev and visible scroll-to-focus | Complete dev focus graph |
| U04 | Medium | Portrait touch exiting attract also launched tour | Capture and consume the following pointer click | Portrait/landscape touch attract exit checks |
| U05 | Medium | Import text label lacked pad/keyboard focus | Real focusable Import button invokes hidden file chooser; omit hidden inputs from navigation | Actual pad-confirm filechooser on both direct screens |
| G01 | Critical | Actual complete-tour ending Retry selected stage6 | Completed tour retries call a fresh tour start | Full browser tour→ending→first-lesson replay |

## Preventive review fixes, counted separately

Before final acceptance: duplicate rematch start guard; prior-round snapshot rejection; initial remote-human braking; controller-disconnect braking; visible blur safety latch; current final snapshot before result; timestamp-based ghost lookup after penalties; dev target/reset propagation; free-drive gates disabled and local safe-road recovery; stable local seat bindings; wheel/unbound-key attract exits; data-driven course counts and detour recovery guidance; a single passport identity for the hidden straight and validation of saved stamps; finite AI recovery after an invalid detour; held-recovery input latching until release. These are review findings rather than additional failed-test issues.

## Fixture corrections, not product issues

Offline Float32 gain assertions use tolerance. Early direct contact timeout assumed rendered wall time equaled native simulation time; replaced with real clock/cursor assertions. Direct setup enters the connection screen before the legitimate10-second title attract timeout, and stops native rendering during connection setup so software-rendering delays cannot race menu actionability. Motion contact sheet now uses browser canvas instead of ImageMagick’s unavailable default font.
