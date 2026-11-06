# Hub integration evidence

- Protocol v1; pristine client v1.4.0; pinned repository revision `35a1047f2067b2af3de3943f0fe452f39105d869`.
- Read the complete protocol, client implementation, shared-world example and official runner; vendored required harness/runner dependencies without changing upstream bytes.
- No root license file at this upstream revision; license attribution is unknown, source/revision retained.
- `src/net.js`: single authority, including non-playing server; from-bound seat mapping, fixed-step simulation, 8Hz directional heartbeat, 8.33Hz snapshots, reliable stage states/plant requests/acknowledgements. History/checkpoints never transmitted. Unreliable snapshot positions rounded to 0.001 cells.
- Stale commands stop after 700ms; stale snapshots and wrong-garden commands rejected. Plant IDs are deduplicated and final results retained in snapshots plus reliable direct acknowledgements. Retry every650ms until acknowledgement.
- A local/settings overlay must never gate GardenNet.update, which continues authority through engine focus changes with autoPause:false. Main restricts standalone restart/dev controls in a session.
- `node tests/net-tests.cjs`: 21 passed,0 failed using the real simulation and a transport stand-in. These are network rule tests, not evidence of internet deployment.
- `tests/hub-check.py` ready for assembled artifact: pinned official checking runner (impaired2, impaired host departure, non-playing server), normal2 and single-seat shared-world harness, physical-route keyboard events, state-replication assertions and post-end quiescence. First assembled artifact:60 passed,0 failed. Pinned official impaired2 standard/host-leave/server all passed; normal1 and normal2 passed. Reports retained. Expanded impairment planting and post-interpolation final-artifact run pending final rebuild.
- Node Playwright1.63.0 installed in vendor/hub/node_modules to run official script; no browsers downloaded. Python suite uses existing installed Playwright1.63.0 environment.

## Review fixes and visual reconciliation

Four adapter issues found by code review and covered by added focused tests: report ticks could re-emit the same clear event; a reliable plant arriving during the report needed an immediate final rejection. Also retained final action results for the entire round and separated delayed same-actor action bursts across fixed ticks. All four fixed before final build. None caused a protocol-browser failure in the first acceptance run.

`GardenNet.visual(dt)` now supplies client-only actor/body interpolation; `GardenNet.state` stays exact. Deltas over1.5 cells, garden changes and outcome changes snap. Clear reports wait2.5 seconds and advance without finishing a non-final round; final campaign victory reports a tied shared win.

Explicit mouse target/adjacent plant transport fields now share authority validation with keyboard actions. Malformed targets reject without spending. Supplemental final browser suite includes impaired2 physical Space commands and deliberate duplicate reliable sends.

## Final assembled artifact acceptance

- Expanded final browser suite: **75 passed,0 failed**. Official pinned runner impaired2, host-leave and non-playing server all passed. Supplemental normal1/normal2/impaired2 passed, including physical Space through main and duplicate reliable plant sends; host executes/spends once and returns a final acknowledgement.
- Additional focused input suite: **8 passed,0 failed**. Actual pointer click reaches the correct host-owned actor, direction cancels pointer navigation, authority keeps ticking through blur/visibility/controller-loss stand-ins, local Settings does not pause authority, and Hub owns ending.
- Pointer test initially missed the game's letterboxed board by ignoring Screen.OX/OY. Corrected the test to use native coordinate conversion; no production change was required. Archived initial test mapping failure separately.
- Total final Hub browser checks:83. Network unit checks:21. See hub-report.json aggregate and referenced raw reports. All owned browser/server processes closed. Physical controller/background-tab scheduling/Internet transport were not established by these stand-ins.

## Latest Hub startup/end guard validation

Main source was updated to skip standalone title construction before Hub welcome and reject physical wake actions after end. Focused suite rerun against latest assembled artifact: **12 passed,0 failed**, including2 origin/package checks. It delays welcome800ms and asserts no standalone menu; after end it dispatches Space/Escape/pointer/touch and verifies unchanged tick/send counters, stopped+muted audio, songPlaying:false, and no reopened local menu. Existing pointer/focus/device-loss/Settings assertions continue passing.

Earlier83-check aggregate counted two shared packaging/origin checks twice across executions; the corresponding original one-command full count was81. New lifecycle assertions add4 unique checks; final full suite now contains85 checks. Root owns final combined execution. Exact tested source/artifact hashes recorded in hub-lifecycle-version.json.

## Final buffered-turn repair

A final combined test exposed a real short-input failure: a direction sampled before an8Hz heartbeat could be overwritten by neutral release before sending. A20ms press/release regression reproduced it (21passed,1failed before fix). The adapter retains a nonzero turn until successful heartbeat send; a newer pointer destination supersedes it; stage/end resets it. Turn-bearing packets use reliable delivery at the same8Hz limit, while neutral heartbeats remain unreliable. Added tests for short tap, newer-pointer precedence and refused-send retention. **Network suite24 passed,0failed.** Net corrected issue total5.

Browser cancellation now waits for the main input route to observe a direction, releases it, then waits for authoritative cancellation instead of assuming a250ms delay. Latest rebuilt artifact focused lifecycle/input run: **12 passed,0failed**; all owned browser/server processes closed. Updated exact hashes in hub-lifecycle-version.json. Root owns final combined verification and unique final count.
