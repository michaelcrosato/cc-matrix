# Testing feedback ledger

16 distinct game/UI issues found and fixed. Two prevented startup. Harness-only false positives are excluded.

1. Invalid prop category prevented scene loading. Critical; fixed.
2. Excessive rounded-box corner radii prevented scene loading. Critical; fixed.
3. Squats awarded idle rest periods too highly. Fixed.
4. Tray Trek could be cleared idle. Fixed with counterbalance drift.
5. Browser standard gamepad compatibility needed direct API input as well as gilrs. Fixed.
6. Completed online medley reported its last event instead of the sum. Fixed; regression test.
7. Online Pause/Settings could not be operated while the round kept stepping. Fixed; regression test.
8. Paddle gate transition penalised the newly selected gate too early. Fixed.
9. Escape opened Pause from pre-game menus instead of going back. Fixed; regression test.
10. Click-to-walk could reach furniture collision before its exact interaction centre. Fixed; regression test.
11. Rhythm lanes obscured the player. Fixed after capture inspection.
12. Jog route used the exercise deck's water backdrop. Fixed to the actual island.
13. Smoothies obscured the carrier's head. Fixed after capture inspection.
14. Rounded font lacked arrow glyphs. Added engine font fallback.

15. The touch card clipped at landscape phone heights. Added a compact landscape layout after browser screenshot inspection.

16. Four-player startup could miss ready by two seconds while software-rendering the covered pre-round scene. Loaded sim state now reaches the Hub before background drawing; drawing starts with the round.

Test harness corrections: fixed-duration short pad holds could fall inside software-rendering stalls; state acknowledgement now determines release. Exact f32-vs-f64 JSON equality caused a false music-default failure; tolerance now matches the native 10% gain test. Compiler diagnostics were development errors and are not counted as game issues.

Verification results and physical-device limits are recorded in the final PROGRESS.md and exit-interview.json.
