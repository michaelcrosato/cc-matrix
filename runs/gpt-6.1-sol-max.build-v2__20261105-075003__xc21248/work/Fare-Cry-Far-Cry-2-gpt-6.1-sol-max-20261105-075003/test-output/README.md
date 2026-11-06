# Verification artifacts

`last-results.json` records the complete final run: 42 passed, 0 failed. `final-verification.json` records the deliverable hash, original client check, 66-feature coverage and 24 viewport/browser combinations.

- `viewport-matrix/index.html` is the final serialized native-engine gallery.
- `real-coop.json` records joining-player keyboard case delivery, a revive, scores 65/50 and packet counters.
- `hub-*.json` are the unmodified official harness reports, including server/host-leave and four-copy default WebGL2.
- `campaign-trace.json`, `feature-coverage.json` and `attract-coverage.json` record the scripted gameplay and reel.
- `art/driving-verified.png` is the warmed final driving-view check; the earlier art images are retained as development references.

Dependencies were removed after verification. Run `npm ci` before rebuilding or rerunning tests. The delivered HTML is self-contained.
