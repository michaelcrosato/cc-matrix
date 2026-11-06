# AI Hub integration

Inspected and vendored the supplied current contract at commit `35a1047f2067b2af3de3943f0fe452f39105d869`: protocol **1**, `session.js` **1.4.0**. Read README, the full client, arena example, round coordinator, harness, and checker. This module does not change the client. The root HTML builder must paste `session.js` once, byte-for-byte, as the first head script immediately after the charset tag.

## Public interface

`new FWR.Net({ hub: AIHub, createWorld(seed, options), onWorld(world), onReady(info), onStart(), onEnd(reason, event), onClearInput(), onError(error), onSnapshot(world), onRoster(ids, departure) })`.

All callbacks are optional. `createWorld` defaults to `new FWR.World(seed, options)`. `await net.connect()` returns the Hub information or null for standalone; only a live session creates the world and readies. `net.update(dt, localIntent)` must run on every engine update during a session, including local menu overlays. Pass neutral commands when an overlay suppresses this copy's input. End processing stops stepping, capture, sends, and queued messages; the root's `onEnd` callback stops sound and closes local overlays. `net.renderWorld()` supplies interpolation for client-only presentation; `net.world` retains the most recent exact authoritative snapshot. `net.diagnostics()` is read-only diagnostic data suitable for the online developer page.

World contract: `step(perSeatIntent, 1/120)`, `snapshot()`, `loadSnapshot(state)`, `setSeats(ids)`, and optional `resolveTimeUp()` or `finish(false,'time-up')`. Snapshot must contain integer `tick`, `ship.x/y`, an `entities` array, deterministic run state, ledgers, and events. Outcome is null or `{won,reason,...}`. Scores are `world.score`; rescued/lost are ID arrays. The adapter forces session identity to `fwr:<round>:<seed>` and creates the world with `{mode:'operation',online:true,runId}`. Standalone settings and checkpoints never enter this session creation path.

## Ownership and lifecycle

- Connect declares `{mode:'shared-world',seats:[1,2]}`; there is no game-owned online lobby.
- Readiness occurs exactly once, after creation, without requiring a key, audio, or camera.
- A received start event arms the adapter; stepping starts only when `AIHub.time() >= 0`.
- Only `info.isHost` steps the simulation. A server-only host does the same, with no local input.
- Remaining roster order owns pilot, then navigator. Leaving removes the seat and clears stale input on every copy; the remaining seat owns solo controls. The world resolves action authority from those ordered seat IDs.
- Host local input enters the same command queue directly. Other copies send only their own semantic intentions. The authenticated `from` supplied by the client is the only sender identity; claimed roles/senders in JSON are ignored.
- World completion latches one finish. The final reliable state is sent before a short 350 ms finish delay. Time-up resolves the world and caps the delay to 40% of the supplied grace. Terminal races preserve an already latched victory/failure and never call finish twice.
- Finish assigns tied cooperative standings `[remainingIds]`, scores for exactly those IDs, numeric per-ID rescue/loss/team statistics, and a boolean `won`. The server is never included in player standings.
- Host departure relies on the Hub's void/end lifecycle. No speculative migration or private restart occurs.

## Wire contract

All game messages use `{g:'fwr',v:1,r:runId,q:sequence,k:tick,...}`. Invalid run/version/tick/sequence data is rejected. Client input is `t:'i',a:[mx,my,ax,ay,fireBit,burstCounter]`; axes are finite and bounded and vectors are normalized. Sequence/tick bounds reject stale or implausible commands. Burst counters survive dropped unreliable input updates without allowing a held trigger to repeatedly burst. Old commands expire after 500 ms. Input sends are approximately 12 Hz, unreliable, to the host and remain below 1,200 bytes.

Host state is `t:'s',p:part,n:total,d:encodedChunk`. Complete snapshot JSON is losslessly LZW-compressed and base64 encoded. Single messages remain below 16,000 UTF-8 bytes, including headers. Unusually large snapshots split into reliable parts; they are not truncated. The host emits at most 10 state pieces per second, reducing the full-world update rate automatically for a world that takes multiple pieces. Important ledgers and latched event IDs repeat with state; no high-frequency separate event stream exists. An additional local 18-send sliding-window budget guards the protocol's 20/sec ceiling, and a false send return retains queued state for retry. Snapshot ticks/sequences and authenticated host identity prevent client or old-world packet application. Newly synchronized copies reconstruct the full current world.

Client rendering interpolates ship, camera, and stable-ID entity positions between authoritative snapshots. This presentation never changes rescue credit or rules. Local prediction is not used; this avoids creating a second authority for the shared ship.

## Native adapter checks

`node tests/net.mjs` performs 16 deterministic checks and prints only failures and a one-line count. It covers lossless Unicode/large-world codec roundtrips; intent sanitization; gesture-free ready/countdown; one authority; ledgers and burst events; forged sender/stale/run/vector rejection; delayed/lost unreliable traffic; duplicate state; role departure; victory/time-up race and exact tied finish; server-only authority; one-player authority; end cleanup; and large reliable snapshot reconstruction under byte/send budgets.

A role-handoff regression retains consumed burst/sequence history across control clearing; clearing held state cannot replay a prior drive press. Two checks also use the actual engine-backed World, including a normal-action co-op rescue and server-only terminal precedence.

These tests verify the adapter against a controlled protocol stand-in. They do not establish conformance of the final HTML; the final artifact must also run the actual downloaded Hub harness and a real two-page mission script. The root integration runner owns that evidence.


## Browser evidence

The exported root HTML passed all five supplied harness scenarios: two teammates, impaired network (150 ± 50 ms latency, 5% unreliable loss), host departure, server-only authority, and one teammate. The checker waited for `body.dataset.complete`, required `__hubCheck.pass`, checked the game build identity in every remaining frame, and rejected all AIHub warnings and page errors. Full evidence is in `artifacts/hub-*.json`. `tools/hub-browser.py` owns and closes its private ephemeral-port loopback server and browser. Its default output includes failures only plus a count; `--json` returns structured checks for the combined runner.

The native 16th check completes the actual operation using two protocol copies: the pilot observes authority and the navigator observes the latest client snapshot, and both supply only ordinary intentions. The bot uses a burst opportunity window, since exact tick-modulus equality cannot reliably be observed through network snapshots. The world remains unmodified, all carrier phases occur, and both ledgers/outcomes match.

The separate **real two-frame operation** also passed on the exported HTML. Each actual iframe produced only its own `local-1` semantic intentions; the host steered and the remote navigator aimed/fired/committed the drive. The test advanced the ordinary engine clock in small increments, while real Hub message timing remained within its normal rate. No objective, position, hull, energy, invulnerability, or completion mutations occurred. The operation ended through the evacuation beacon after 245.575 simulated seconds, with 12 secured survivors, one lost crystal, and score 798. Both final ledgers, scores, and outcome objects matched exactly. All sectors and carrier phases were observed. The host called finish once. Largest host snapshot message: 11,559 bytes; largest client input: 157 bytes. Peak rates: 10/s host and 12/s client. There were no dropped sends, Hub warnings, or page errors. The run took approximately 143 wall seconds with software rendering. Evidence: `artifacts/hub-real-coop.json`.

`tools/hub-browser.py` now runs six browser checks by default. The combined verifier should allow at least four minutes for the browser subprocess. `--only-harness` and `--only-coop` support rerunning only affected coverage after a relevant change.
