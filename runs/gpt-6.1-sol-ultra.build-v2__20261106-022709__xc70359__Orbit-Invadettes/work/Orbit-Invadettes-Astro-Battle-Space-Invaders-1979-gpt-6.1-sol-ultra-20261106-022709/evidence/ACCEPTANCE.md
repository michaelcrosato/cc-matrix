# Final acceptance

One command, from the development folder:

```sh
node tools/test.mjs
```

Final result: **261 passed; 0 failed**. This ran against the exact exported HTML and generated `test-summary.json`.

- Six authored formations and both flagship phases cleared by ordinary-input STANDARD solo/co-op bots with normal damage/resources. Solo548.57s; co-op333.57s. Neither run assisted.
- Native full-engine draw and input/lifecycle checks use the actual IIFE bundle, not a rewritten simulation stand-in.
- Browser suite:115 passing checks; Chromium153.0.8010.12, Firefox155.0, WebKit26.6. Emulated standard pads, phone/tablet profiles and CDP multitouch; no physical-device claim.
- Live pinned Hub suite:63 passing checks across one seat, lossy two seats, host departure, dedicated server and semantic repair/death/respawn/result agreement. Reliable full snapshots stay below16KB; largest measured7,283 bytes in the final semantic-world fixture.
- Native assets/audio and exact combat-event routing verified. Offline generated audio is finite and nonzero; muted output is silent. No human listening claim.
- Final artifact isolated from development files and tested through file://; same packaged game served to pinned Hub harness on an owned ephemeral localhost origin. Pristine Hub client is first after charset; full engine retained with escaped closing-script sequences; source/schema/catalogue JSON validated.
- Credits, feedback, controls, settings, records, results, attract and pause/dev flows are complete and controllable.
- Screenshot inspection: hierarchy, four row identities, eroded cover, fixed portrait field, absence of permanent touch controller, flagship phase difference, focus and paged About. These establish visual observations, not real TV distance.

Unique fixed defects:25, including2 critical, with discovery method/severity in `ISSUES.md`.

Unverified: physical controller feel; human listening/taste; physical TV viewing distance; real iOS hardware behavior.

Browsers and the owned HTTP server were closed after tests. The exported game needs no runtime source/module/audio fetches.
