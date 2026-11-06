# Simulation findings

| ID | Found by | Severity | Finding | Resolution and evidence |
|---|---|---|---|---|
| S-001 | Seeded normal legal-input playthrough | Moderate bot quality | PLUM bot lost with one target after tail-chasing. This was a valid game-over, not broken rules. | Replaced final-target pursuit with route forecasting/interception. All 58 normal generated runs and full solo/co-op pass. Panic-reversal experiment was rejected. |
| S-002 | Content authoring review | Minor expansion tooling | Campaign terminal stage used a literal six-stage boundary. | Uses content array length; content and full campaign checks pass. |
| S-003 | Content authoring review | Minor data integration | Authored reveal period was ignored in favor of eight seconds. | Reads board.revealPeriod; focused authored-interval test passes. |
| S-004 | Simulation review | Minor lifecycle | Terminal simulation calls could keep advancing elapsed/tick after game-over. | Terminal tick guard; snapshot remains identical and event-silent under further input. |
| S-005 | Simulation review | Minor visibility feedback | A blocked turn request could keep straight travel without a wall echo. | Blocked requested direction creates a local visibility echo at junctions. |

One unique finding was caught by an initially failing automated test (S-001). Four were caught in code/content review. Zero were game-breaking. Experimental tuning failures are repeat symptoms of S-001, not additional unique issues.
