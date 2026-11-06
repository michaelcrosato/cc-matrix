# Distinct simulation issues caught by verification

1. **Moderate / fixed** — Repair at an exact cell-column boundary could preserve the center column while rebuilding an adjacent cell touched by the missile radius, immediately obstructing the repaired firing lane. Caught by `repair leaves missile clearance at a cannon between two cell columns`. Fixed aperture selection and touch clear-shot queries to consider projectile width. The new test passes.

No critical/game-breaking simulation issues were observed in this suite. A normal bot's incidental saucer hit count changed after the aperture fix; the observation-only bot was improved to deliberately select clear saucer lanes. This was a test-pilot capability change rather than an extra game defect.

34 simulation checks pass, including normal-input solo and co-op full campaign completion. Test fixtures deliberately alter isolated state to verify individual mechanics; the separately labeled campaign tests create fresh standard worlds and use only movement/fire/repair commands.
