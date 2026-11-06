# Issue ledger

Nine unique game issues were found and fixed. None prevented the complete game from booting or made the main game unplayable; critical/game-breaking count: zero.

| ID | Severity | Caught by | Finding | Fix / verification |
|---|---|---|---|---|
| ID | Severity | Caught by | Finding | Fix / verification |
| I01 | Major balance | First legal-input campaign trace | Snacks followed random goals too passively; the full solo campaign cleared in 120 seconds and many boards ended before feature exploration. | Strengthened committed fleeing at junctions, retained no-reversal policy and small turn tells; legal traces now take longer and use route cuts. Normal solo/co-op campaigns and twenty generated-seed catches passed. |
| I02 | Moderate input | Expiring-input simulation test | Releasing a held direction could start one more edge inside its 150 ms buffer. | Neutral release clears same-direction desire; an already committed edge finishes exactly at its next centre. Passed. |
| I03 | Major mechanics | Shortest-route / gate timing test | The original 6-cell outer ring took 1 second, making a timed 1.5-second pen ride pointless. | Added connected outer approach lanes to turning-pen boards; measured detour is 18 cells / 3 seconds versus a planned 1.5-second ride. All orientations and playthroughs passed. |
| I04 | Moderate layout | TV screenshot and safe-area bounds check | The title footer extended below the display. | Reduced native title button minimum height while retaining TV text size. Safe-area check passed. |
| I05 | Minor layout | TV screenshot | An inactive native toast remained partly visible after its top offset was changed. | Hide inactive toasts explicitly; keep the single Menu control and unused touch-start UI hidden when appropriate. |
| I06 | Moderate lifecycle | Real ten-second idle browser check | The title input hook rearmed its transition fade every tick once idle elapsed; simulation-time idle could also lag the real deadline. | Attract entry and input-triggered exit use a single cut on the next fixed step, and native Arcade idle has a monotonic wall-clock deadline. Real-time entry, consumed exit and repeated-loop isolation passed. |
| I07 | Moderate touch | Phone/tablet multitouch browser checks | A non-primary finger did not reliably create a click on the contextual chirp button. | Gameplay HUD actions now trigger on touch pointer-down while preserving the existing steering contact; duplicate compatibility clicks are consumed. |
| I08 | Moderate editor | Touch tool-palette scenario | Opening a palette on pointer-down could click through to its first new item on release. | Consume the initiating compatibility click at the window capture boundary; a new contact still selects normally. |
| I09 | Moderate editor | Touch palette / return-to-editor scenario | Closing a custom workshop overlay could leave the native game paused without a visible overlay. | Workshop close explicitly restores simulation/editor input; native pause/developer back navigation remains native. |

Test-fixture corrections are not game issues: a disconnected-cell fixture, input-tick waits, duplicate Back selectors, and CDP release IDs for individual fingers were corrected. The first impaired-network driver planned too late at cell centres; planning one junction ahead then completed three stages using legal native inputs. Source review improved numeric seed roundtrips, seam representation, strict imported metadata and local movement presentation; these are regression-covered design corrections, not extra claimed testing findings.
