# AI Hub integration

## Provenance

- Upstream: https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub
- Protocol: AI Hub Session Protocol v1.
- Client: `aihub-session 1.4.0`, pinned commit `35a1047f2067b2af3de3943f0fe452f39105d869`.
- Vendored without modifications: `vendor/hub/session.js`, `README.md`, `harness.html`, `bridge.js`, `round.js`.
- Read the entire pinned README and session client before implementing the adapter. The pinned API matches the plan; no reconciliation changes were necessary.
- `session.js` must remain the first script, immediately after charset, in the emitted HTML. Harness assets are development-only.

## Adapter contract

Load `src/net/hub.js` after `session.js` and call `await RingNet.setup(callbacks)` once. It calls `AIHub.connect({mode:'shared-world',seats:[1,2]})`. A `null` return selects standalone mode. A session return has the fields/methods below.

Callbacks:

- `prepare(info)`: prepare a valid default expedition without title/input/audio gates. May return a promise. Receives the upstream `info` plus `localSeat` (`0`, `1`, or `-1` for a server), `authority`, `server`, and cached `rng(label)` generators. `info.players` are in seat order, with names to render as text only. The adapter registers all lifecycle handlers before preparation and calls `AIHub.ready()` once after it completes.
- `getEpoch()`: current non-negative integer room/transition epoch.
- `readSnapshot()`: authoritative JSON snapshot. Keep under 1,100 bytes where practical. The adapter adds version/type/epoch/sequence/edge acknowledgements and sends ten snapshots per second. Transitions and packets over 1,200 bytes are reliable; others are unreliable. Packets over 16,384 UTF-8 bytes are rejected and recorded in `inspect()`.
- `applySnapshot(data,meta)`: apply an increasing authoritative snapshot on a nonhost copy. `meta` has `epoch`, `sequence`, and `reliableTransition`. Old-room/stale/nonhost snapshots are rejected first. The renderer may interpolate `previousSnapshot` and `lastSnapshot`; simulation state must use the authoritative values.
- `onStart()`: once, when the start event has arrived **and** `AIHub.time() >= 0`.
- `onIntent(seat,intent)`: validated route/hero/retry/board/courtyardContinue intention on the authority. The simulation still validates that the intention is legal for its current scene. Seats are always `0`/`1`, not upstream ids. Nonhost clients cannot submit arbitrary debug or tuning mutations.
- `onLeave(id,seat,reason)`: convert that seat to companion AI. Ownership/device/AI fields remain the simulation's responsibility. The adapter rejects subsequent departed-player input and reassigns `routeChooser` to the lowest remaining seat.
- `getOutcome()`: `{won:boolean,score:number}`. `won:true` triggers host-only cooperative finish once. Time-up finishes immediately within the Hub grace period using the same callback, including actual partial score.
- `onFinish(result)`: optional callback after host reports a result.
- `onEnd(detail)`: stop sound and gameplay. Do not reopen title or standalone attract mode.

Frame integration:

```js
net.update(dt, localCommand);
if (net.authority && net.playing) simulation.step(dt, net.commands);
```

`net.commands` is a two-element, **zero-indexed** array. Each command has `mx,my,ax,ay` in `[-1,1]`; `primary,interact` are held booleans; `power,dodge,ping` are one-frame edges. Primary and interact also retain acknowledged rising edges so a quick tap between input bundles is delivered once; their held bits still drive continuous attack and revive. Local inputs apply directly on a player-host and are never also sent as input packets. A server has no local seat/input but still simulates all human and companion commands.

Call `net.intent({type:'route',value:'dungeon'})`, `net.intent({type:'hero',value:'wizard'})`, or `net.intent({type:'retry'})`. Allowed routes are `dungeon`, `crystal`, `inferno`, `shifting`, `cacheCrystal`, `cacheShift`, `final`. Hero changes can only affect the sender's seat. Other intents require the current lowest remaining human seat. Local menus pass a neutral command while the shared world continues. The input layer must suppress Options while Create is held in a session.

`net.finish(outcome)` is authority-only and idempotent. Normally the adapter detects victory through `getOutcome`. Standings are one group containing every remaining human id; a server id is never included. Only a completed expedition may report `won:true`.

`net.inspect()` exposes phase, ownership, epoch, packet counts/size, sequence acknowledgements, and departed ids for tests/dev inspection. `net.forceSnapshot()` requests the next ten-hertz slot, never a burst. `net.dispose()` removes handlers and neutralizes commands; the game should not use it to leave an active Hub round.

## Input and transport safeguards

Inputs are ten-hertz unreliable packets to the host, with current axes/held state plus retained sequenced power/dodge/ping/primary/interact rising edges. Snapshots acknowledge edges; clients retransmit unacknowledged ones. The authority deduplicates packets/edges, validates the actual sender's seat, bounds vectors, rejects diagonal speed boosts, and ignores malformed input, old epochs, or pre-play input. An unrefreshed remote input becomes neutral after 0.8 seconds. Room changes discard pending old-room edges. Reliable menu intentions have separate monotonically increasing sequences and a 150ms local rate guard. Host snapshot cadence has a hard ten-hertz guard, including forced/transition requests.

Snapshots are accepted only from the known host and only with increasing sequence/current-or-newer epoch. Shared-world RNG uses explicitly labeled cached `AIHub.rng` streams, independently of cosmetic randomness. The adapter opens no sockets and uses no external transport. Every `end` immediately disables input and sends, discards queued actions, and calls teardown.

## Evidence

`src/net/hub.test.mjs` exports `runNetworkTests()` for the central `node tools/test.mjs` wrapper. Current adapter unit result: **23 passed, 0 failed**, including quick primary/interact taps entirely between ten-hertz bundles. These mocks cover standalone/ready/countdown, ten-hertz traffic, ownership, invalid vectors, pre-start rejection, sequence/epoch rejection, edge acknowledgement/deduplication, stale input, chooser/hero validation, departure, server authority, time-up/finish/end, packet sizing/reliability, labeled RNG, snapshot source/order, cadence pressure, and movement normalization. They are adapter unit evidence, **not** Hub harness conformance or a gameplay pass. Real-game harness and gameplay evidence must be recorded by the integrated test suite.

The integrated runners are `src/net/harness_test.py` (six actual vendored-Hub conformance scenarios) and `src/net/gameplay_test.py` (server plus two remote player copies, ordinary-input damage/pickup/pass/down/drop/revive/extraction assertions). Both are called through the central wrapper, use the installed Python Playwright environment, host only on an OS-selected loopback port, and write detailed JSON evidence under `evidence/`. The gameplay runner records its action history and final state and rejects an assisted run. Its deliberate enemy damage uses an actual enemy's authored attack, not a health setter. Evidence files report their emitted HTML SHA so stale results can be identified after a rebuild.

### Integrated evidence obtained

- Actual vendored Hub harness: **79 checks passed, 0 failed**, across two-player, 150ms latency/50ms jitter/5% loss, host departure, two-player with server-only host, one-player, and nonhost departure. Each case reached `document.body.dataset.complete === 'true'` and `window.__hubCheck.pass === true`.
- Actual shared-world gameplay on a server-only host plus two browser-controlled remote humans: **10 checks passed, 0 failed**. Ordinary inputs picked up and passed the practice ring, accepted five authored enemy hits, dropped the ring on incapacitation, protected and revived the carrier through normal sword/revive actions, and extracted into Dungeon room two. The authority and both remote views converged for each asserted interaction. Final state: 1 pass, 1 revive, 1 completed room, 5 hits, `assisted:false`.
- The original external Python steering loop had too much control latency across three rendering frames and oscillated around waypoints. This was one deduplicated **test-driver issue**, repaired by a same-origin parent-page timer. It reads only world/path state and calls the corresponding remote client's `__ring.testCommand`; those ordinary inputs still travel to the server through `AIHub.send`. No simulation state setter, debug mutation, direct advancement, or reward grant is used.
- Source and emitted artifact hashes are in the JSON evidence. During active integration the HTML changes, so final acceptance must check those hashes or rerun the affected suites after the bundle freezes. Conformance is separate evidence from the gameplay assertions and does not prove a whole expedition.

### Quick-tap preservation

A ten-hertz held-state bundle can miss a primary or context tap that begins and ends between send slots. The adapter now includes those rising edges in the same acknowledged, retransmitted, deduplicated queue as powers/dodges/pings, while preserving their existing held-state bits. Two regression checks release the input before the next bundle and require exactly one authoritative application and a drained acknowledgement queue. This changes only game input packing, not the vendored Hub client.

### Terminal snapshot ordering

A regression first failed when victory was set between ten-hertz slots: the host finished before sending the winning authoritative state. `finish()` now sends one reliable terminal snapshot before reporting to the Hub, including at time-up, then stops regular traffic. The extra terminal packet keeps the copy below the protocol rate limit. The regression requires that a client receives the state that was scored even when no regular snapshot slot is due. The adapter suite now has 23 passing checks.

### Server-only whole campaign

`src/net/campaign_test.py` completed an actual session from the first board choice through all eight mandatory rooms, four secured campaign rings, all four dragon-binding stations and the shared final escape. It used two remote browser copies under a server-only authority, default tuning/resources, ordinary client command transport and route intentions. The native companion policy chose human inputs; only observational `aiState`/navigation caches were touched by that choice, while both authoritative hero `ai` flags remained false (no companion relocation).

Initial complete result: **11 checks passed, 0 failed**, 245.94 seconds wall time / 200.36 simulation seconds, 4,356 recorded commands, two actual hits and zero retries. All four ring-secured and all four seal-bound operations occurred exactly once. The only result was sent by server id 2: `won:true`, `standings:[[0,1]]`, scores 480 for each remote player. Both heroes reached the final escape. This is an automated expert run, not an estimate of first-player campaign duration. The JSON evidence records artifact SHA, samples, all observed events, route intentions, ordinary commands and actual finish messages. A subsequent terminal-world convergence assertion checks that both remote copies receive the winning state before the Hub removes the round.
