# Verification record

The one-command suite is `npm test`, orchestrated by `tools/test.mjs`. Quiet groups are simulation, assembled browser/input/audio, official Hub plus two-copy behavior, and packaging/schema. Failure details are printed; passing cases produce only the final count. Detailed reports are written under `evidence/`.

Simulation includes swept two-hit spray/newborn exclusion, travel-order obstacle consumption, atomic worker routes, express pass-through, real hive pockets and cancellation, deterministic free cells, bird call/cooldown/target invalidation/feeding/retreat/return, exact shot costs, swapping, bounded grace, last-shot clear priority, last-harvest stock recovery, multi-threshold awards, finite retry/rescue rewards, flower intervals/hops/enclosure batching, delayed-entry clear, data authoring, reproducibility and wire packing/validation. Native headless title/play/pause/resume is exercised with drawing enabled.

Full ordinary-input pilot uses `BCP.applyAction` at 10 Hz and bounded can movement with normal stock, ammo, fire cadence, feed timing and cooldown. It never deletes actors, teleports, changes phases or enables developer protection. It completes the six gardens in order, converts workers/express bees, preserves/banks a hive, harvests red and amber, clears obstructing wax, handles authored flower pressure and solves all four shield buds. Solo/co-op results are saved in `playthrough-1p.json` and `playthrough-2p.json`. A whole campaign also runs inside the assembled browser artifact and reaches its real win/results/restart flow.

Browser checks use actual final HTML via file://, Chromium and WebKit. Standard pads are stubbed; touch uses mobile device emulation and real CDP touch events, not physical hardware. Tests cover controller navigation/move/fire/call/pause, keyboard/mouse ownership, records/settings, live tuning/reset/import/step, ten-second attract and consumed wakes, exclusive local co-op devices, touch assist/context, orientation and error-free canvas draws. Screenshots are for composition only: title, busy wave plus flower warning, finale, pause/dev, results, About and touch.

Audio uses native code synthesis and an original procedural garden scherzo with generated gibberish voices. OfflineAudioContext renders the shared oscillator/envelope code, verifies finite non-silent output, no clipping, ten-percent gain ratio and exact mute silence. Teardown is inspected. No human listened; musical quality is unconfirmed.

Official pinned harness fixtures are unchanged and hashed. The wrapper runs two players, latency=150/jitter=50/loss=5, host-leave, server-host and one-player cases. The harness's completion flag and pass result are required. Additional real-copy checks exercise simultaneous spray/call, shared bee conversion/score, non-pausing online options, malformed input rejection, enclosure reset agreement, departure removal without stock loss, a single host finish, and no world advancement or sends after end. Production Hub/catalogue integration remains untested. Test servers bind 127.0.0.1 on an OS-assigned port and are shut down by the owning test.

Distinct implementation issues and critical classification are tracked in `docs/issues.json`; assertion/fixture mistakes are not inflated into product issue counts. The strongest findings came from actual gameplay-copy networking and visual inspection; boot success alone did not reveal missing actor crops. A phone debug script initially returned the entire native Game object to Playwright, causing expensive serialization; tests now return compact values. That was a test artifact, not a game defect.

Known limits: no physical controller, real touch device, iPhone/iPad, TV, human audio review or human balance playtest. The ordinary-input bots demonstrate reachability and accounting, not subjective first-run fairness. No FPS/performance target was introduced.

## Final release result

`npm test`: **155 passed, 0 failed** against the final assembled artifact. Solo: 622.825 seconds, 177,700 points, four reserves remaining. Co-op: 617.458 seconds, 212,200 points, four shared reserves remaining. Each completed six gardens and four shield buds with normal resources. Ten material implementation issues were fixed, two critical; all are marked verified.

Objective audio output: enabled peak 0.19018 and RMS 0.02107; 10% bus RMS 0.002107; muted peak exactly zero. Normal full-campaign snapshot payloads remain under 3.5 KB; the SDK fixtures report no traffic-limit or protocol problems.

Final captures were reviewed for composition: title, mixed wave/flower warning, complete pageant silhouette, pause/developer tools, results, paged About and touch layouts. Phone title rows retain touch-sized hit areas; rotation waits for the actual native resize then checks camera centering. The final Hub call assertion waits for both copies to observe authority instead of assuming zero transport delay.
