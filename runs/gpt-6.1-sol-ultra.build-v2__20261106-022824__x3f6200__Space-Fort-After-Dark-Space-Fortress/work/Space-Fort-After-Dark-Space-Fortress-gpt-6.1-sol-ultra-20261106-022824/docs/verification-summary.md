# Final verification

Command: `npm run verify` from the development folder.

Result: **151 passed, 0 failed (8 suites)** against the actual root single-file artifact.

| Suite | Passing checks |
| --- | ---: |
| Deterministic simulation / complete campaigns | 33 |
| Native headless rendering and state isolation | 9 |
| Hub transport / prediction unit checks | 23 |
| Final artifact / released client / interview schema | 7 |
| Packaged Chromium, WebKit, Firefox / controller / touch UI | 36 |
| Web Audio instruments, arrangements and lifecycle | 22 |
| Official Hub multi-page scenarios | 6 |
| Real Hub gameplay, synchronization and cleanup | 15 |

The full gameplay runs use normal tool intents without invulnerability, including 1–4 pilots and every upgrade branch. A representative successful siege took 635 seconds. Attract is separate and may cheat.

The official Hub matrix covers 1/2/3/4 copies with 150ms latency, 50ms jitter and 5% loss, host departure, and dedicated hosting. Deeper checks exercise actual remote input, local overlays, countdown, catch-up, objective/score/death convergence, upgrades and post-end gestures.

Visual inspection covers the title, every act, every boss phase, victory, live dev controls, readable credits, phone and tablet framing. Screenshot evidence is in evidence/. Signal evidence is not human listening; WebKit's iPhone profile is not actual iOS; pads and touch are browser stand-ins, not hardware.

Two test-fixture assumptions were corrected during final verification: the authored-wave fixture needed its explicit act and guaranteed cleanup; orientation assertions needed to wait for the browser's resize event. They are excluded from the 30 unique game/integration defects recorded in issues.md. Three game defects were critical; all 30 are fixed.

Artifact SHA-256: `b36e310e66d0017e9884ec82228d7de611e7ad8b59b3e158097e883faa4d45a5`.
