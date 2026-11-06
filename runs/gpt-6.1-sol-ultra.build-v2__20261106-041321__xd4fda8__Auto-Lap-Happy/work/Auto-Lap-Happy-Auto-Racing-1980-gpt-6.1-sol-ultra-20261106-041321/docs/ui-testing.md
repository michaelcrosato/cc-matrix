# UI and input acceptance

The worker `tools/ui-test.py`, exported through `tools/ui-test.mjs::runUITests()`, opens the actual root single-file deliverable by file URL. It uses Chromium, a 1920×1080 TV viewport, a standard-mapping gamepad stub, and 844×390 / 390×844 touch contexts; three additional final-file checks run in WebKit. The engine RAF is stopped after startup so calls to `game.advance` give exact inactivity and pause assertions. Native browser input events drive menu choices and steering/braking. The worker never teleports a car or manufactures a finish.

Checks cover file boot, title focus, all enabled controls' directional focus graph, controller confirmation, keyboard brake/release, pause clock freeze, PS/Xbox setting, dev slider behavior and unranked flag, tuning reset, credits categories, ten-second attract boundary, no-save behavior, per-device consumed attract exits, pad loss/reconnect, real multi-touch steer plus brake, touch cancellation, portrait menu scrolling, and touch pause. Screenshots inspect composition rather than scoring rules.

## Observed presentation

The large italic cream/gold title and dark green club panels are coherent at 1920×1080. Focus is strong, setup uses recognizable route silhouettes and distinct car colours, and the north-up road remains clear around the car. Race plates, speed and minimap are legible in the TV stand-in. Mobile portrait preserves the road; setup deliberately scrolls because all five courses and five cars remain available. On-screen hints originally displayed keyboard controls after a touch start; the device-tagging fix corrects this. Physical TV distance, a real controller, real iOS hardware, and listening remain unknown.

Representative screenshots are `evidence/ui-title-tv.png`, `ui-setup-tv.png`, `ui-race-tv.png`, `ui-touch-landscape-*.png`, `ui-touch-portrait-*.png`, and `ui-source-tv.png` / `ui-feedback-*-tv.png`.

## Unique issues found

| ID | Severity | Test / observation | Fix / confirmation |
|---|---|---|---|
| UI-01 | Minor | First pad movement changed focus but left title footer Enter/Esc. Touch start displayed keyboard driving hints. | Root added dynamic prompt attributes and preserved touch pointer identity. Latest rerun passed both menu and touch prompt assertions. |
| UI-02 | Major usability | D-pad graph could not reach settings Music and Crew voices controls. | Root changed settings Up/Down to sequential focus; confirming rerun passed. |
| UI-03 | Major usability | D-pad graph could not reach dev Restart at gate and Next course buttons. | Root changed dev Up/Down to sequential focus and scroll-into-view; confirming rerun passed. |
| UI-04 | Major usability | A portrait tap exiting attract activated underlying Tour, entering driving instead of returning to title. | Root added a capturing consumed-pointer click guard; confirming portrait and landscape reruns passed. |
| UI-05 | Minor accessibility | Direct host/guest Import text file is a nonfocusable label around a hidden file input; the hidden input itself enters focusables. | Root added a real import action/button and filtered hidden/file inputs; the pad action opened the actual file chooser and both direct-screen graphs passed. |

No critical/game-breaking issue was exposed by this UI worker. Test-only corrections (duplicate `data-action=back` locator ambiguity, graph controls needing unique DOM indices, and a scrollable menu not fitting above the fold) are not counted as product issues.

Final completed pass: **54 / 54 checks**, against the latest root final HTML. All five unique issues are fixed and their reproductions pass. This includes real file-chooser activation from the controller import action, full menu directional graph checks, and WebKit file boot/live driving/touch pause. `evidence/ui-results.json` contains detailed current results; the final rerun will replace this count.
