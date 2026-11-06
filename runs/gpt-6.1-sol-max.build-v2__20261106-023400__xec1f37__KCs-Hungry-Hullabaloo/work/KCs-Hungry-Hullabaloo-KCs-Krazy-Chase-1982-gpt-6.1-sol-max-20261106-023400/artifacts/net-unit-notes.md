# Shared-world unit verification

`tests/net-tests.mjs` exports async `runNetTests({filter=null}={})`, returning `{passed,failed,failures}`. Importing it prints nothing. Direct `node tests/net-tests.mjs` prints only failure lines plus one count. Its fake Hub exercises the actual `HubCoop.connect`, lifecycle handlers, host simulation, packing/unpacking, command application and send decisions; no browser is launched.

## Coverage

34 checks cover null-session fallback; shared-world seats and automatic readiness; start notification versus the negative clock; single-seat host; a nonplaying authority with one or two actual players; transport-bound commands with ignored claimed identity; unknown/stale/wrong-generation messages; expiring input; host and remote planting, duplicate actions, rejection and acknowledgements; pre-start card immutability; durable dedup beyond the rolling snapshot acknowledgement window; client discrete plant reliability and heartbeat rate; a refused reliable send; recovery through explicit acknowledgement or later snapshot; host-only client state; snapshot loss and reordering; stage changes; wrap reconciliation; once-only presentation events; departure cleanup; host-only tied finish with actual team score; time-up/end shutdown; packet size and objective roundtrip across all fifteen authored courses; and disposal of lifecycle handlers.

## Findings and fixes

Root fixed two source-inspection findings before the first full test run:

1. Host accepted remote planting before `start` or while `AIHub.time()<0`. Message handling now rejects and acknowledges these requests without mutating the world.
2. Plant dedup depended on the rolling 24-entry acknowledgement list. After eviction an old action could spend a new seed. Root now retains a separate durable `seenPlants` map. A focused test creates 30 later rejected actions, then repeats the first accepted action and verifies no second spend.

The first run against those fixes passed 27 / failed 1. Its remaining finding: if the client `AIHub.send()` returned false for a reliable plant, the adapter stored pending=true but never retried; after 1.2 seconds there was still only one attempted send. This can permanently lose a discrete action/acknowledgement. It was reported to root for repair using the same action ID and a modest retry timer.

Root added retained presentation events during the task. A new focused check found that `World.step` returns early during a clear hold and leaves its event list intact, while the network host delivered those same events every tick. After 0.1 seconds it presented the one clear event 13 times. The client correctly deduplicates retained event IDs. Root was asked to drain or deduplicate host delivery too.

The four new focused checks passed 3 / failed 1 (the repeated host event). Those findings were repaired by root. Additional checks cover old-generation pending cancellation and departure followed by retry. Final verification: **34 passed / 0 failed**.

## Limits

These deterministic fake-transport checks establish adapter authority and packet behavior. They do not claim real internet, physical multiplayer, browser permissions, subjective audio quality or official harness conformance. Browser and official harness checks are run separately by root.


## Final repair verification

The client now retains the exact packet per pending action, retries with the same ID every 0.5 seconds, and caps the plant queue at four sends per second alongside the eight-Hz heartbeat. Explicit or repeated snapshot acknowledgements clear pending work. A stage change cancels obsolete pending actions. The host drains captured events after presentation; one clear now causes exactly one callback during its hold. Departure also updates the checkpoint so retry cannot resurrect a removed player.

The aggregate command `node tests/net-tests.mjs` reported 34 passed / 0 failed after these source changes. Biome check and Node syntax check also passed. One acknowledgement fixture was updated to allow the newly intentional 0.25-second queue interval before expecting a second discrete send; that fixture timing change is not a production defect.

Four distinct network defects were identified and repaired during this task: pre-start planting mutation; dedup eviction permitting repeated spending; a refused reliable action never retried; and host clear events repeatedly presented during the hold. The stale-input, authoritative-identity, snapshot-reordering, final-result and end-shutdown checks required no source repairs.
