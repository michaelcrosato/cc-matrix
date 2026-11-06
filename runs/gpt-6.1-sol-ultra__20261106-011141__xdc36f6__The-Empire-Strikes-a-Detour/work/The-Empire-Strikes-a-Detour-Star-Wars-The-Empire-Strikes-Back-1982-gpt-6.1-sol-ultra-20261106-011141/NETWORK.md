# Cooperative transport

`network.js` implements one authoritative host and one guest. Seat IDs are stable: standalone host is 0, guest is 1; AI Hub IDs are assigned by the session. A Hub server copy can be the authority without occupying any player seat.

The official AI Hub client in `hub/session.js` is unmodified, version 1.4.0. The final HTML must paste it as its first script, immediately after the charset tag. Its metadata declares shared-world mode, seats 1–2, round length, goal and controls. The game calls `initHub()`, builds the world, calls `ready()` without a gesture and waits for `start`. That event is delayed until `AIHub.time() >= 0`. Sound and input stop at `end`. `timeup` requires the host to call `finish` with the current score. No standalone network implementation is opened during a Hub session.

Standalone hosts open a six-character flight code. Two same-origin pages use BroadcastChannel; remote browsers lazily load PeerJS 1.5.5 from jsDelivr and use its public signaling service to negotiate WebRTC. No chat, microphone or player-entered names are transmitted. The guest sends controls and the host sends state at 10 Hz. A lost link can be rejoined with the same flight code. Internet traversal depends on the public signaling service and browser/network WebRTC support; it is not guaranteed on restrictive networks.

## Public interface

- `on(event, fn)` subscribes and returns an unsubscribe function.
- Events: `status` ({text,room,mode,error?,warning?}), `players` (roster), `start` (info), `input` ({id,input}), `snapshot` (host state), `leave` ({id,reason}), `disconnect`, `result` (team result), `timeup`, `end`.
- `await initHub()` returns Hub info or null; `ready()` announces loading complete.
- `await host(code?)` starts the host and returns its room; `await join(code)` finds its host.
- `sendInput(input)` and `sendSnapshot(state)` update cached replication payloads; send them every frame.
- `finish(won, score, stats)` reports once; `resetRound()` permits another standalone round.
- `close()` returns to solo; it does nothing in an active Hub round, where the Hub owns leaving.
- Properties: `mode`, `me`, `hostId`, `isHost`, `server`, `players`, `active`, `ended`, `started`, `canPlay`, `room`, `status`, `stats`.
- A snapshot must serialize to less than 15.5 KB. Out-of-order input/state packets are rejected by sequence number. The Hub uses unreliable packets so obsolete state does not block newer state.

## Checks

`node network-check.mjs` exercises two standalone links through the real BroadcastChannel API and an injected Hub transport, including no-seat server hosting, start gates, bidirectional traffic, results, departures, finite input validation and end shutdown. It prints failures plus one result line. The root test command can import `checkNetwork()` instead to aggregate its 18 checks.

The complete game's integration can be checked with the official harness, served over the same loopback origin:

`hub/harness.html?game=../../GAME.html&players=2&auto=1`

Run the same URL with `&latency=150&jitter=50&loss=5`, `&scenario=host-leave`, and `&scenario=server`. The game path above is relative to `hub/` when the finished HTML is in the workspace root. Wait for `document.body.dataset.complete === 'true'`, then inspect `window.__hubCheck.pass` and failed entries of `window.__hubCheck.checks`.
