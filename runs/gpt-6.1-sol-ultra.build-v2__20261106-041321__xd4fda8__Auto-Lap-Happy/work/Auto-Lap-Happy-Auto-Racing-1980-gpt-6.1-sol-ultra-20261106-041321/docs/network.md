# Networking

## Provenance

The shipped official AI Hub Session Protocol v1 client is unmodified client 1.4.0 from ai-hub commit `35a1047f2067b2af3de3943f0fe452f39105d869`. The local `vendor/hub` harness, bridge, and round coordinator come from that same revision. The new transport adapter is game code, not an engine or session-client patch.

WebRTC implementation was checked against the [official peer-connection guide](https://webrtc.org/getting-started/peer-connections), [MDN data-channel sample](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Simple_RTCDataChannel_sample), and [ICE-gathering event reference](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/icegatheringstatechange_event). Both offer and answer wait for complete local ICE gathering; candidates are included in the exported descriptions. Signalling is explicit invitation/reply text, with no broker or account.

## Shared authority

`HappyNetwork` supplies the same sequenced input and snapshot transport for direct and Hub games. The root game advances both cars only when `network.authoritative` and `network.clock() >= 0`. Local seat and authority are independent: Hub server copies have `localSeat === null` while owning the full world. The adapter sends only inputs from guests and only snapshots from authority. Guests cannot finish rounds or submit scoring events. Inputs are bounded, sequence checked, sender checked, round checked, and replaced with full braking after 600 milliseconds without another intent. Snapshots reject stale or non-host messages.

The Hub round uses `AIHub.time()`; direct play uses the host's monotonic start time with a reliable ready/configuration handshake. No WebRTC constructor runs inside Hub sessions, and all Hub game traffic uses `AIHub.send`. Continuous traffic runs at eight messages per second per sender. Simulation snapshots are packed into numeric arrays and restored before the game sees them. Unreliable envelopes are capped at 1,200 JSON characters; reliable ones at 16,000. The finish includes every remaining human once in best-first tie groups. Time-up is host-only and idempotent; host loss leaves Hub's void decision intact.

## Direct play

The reliable ordered `happy-rules` channel handles configuration, ready, countdown, final result, and closure. The unordered zero-retransmission `happy-state` channel handles continuous state. A bounded reliable fallback is used if an unreliable channel is unavailable. `bufferedAmount` limits prevent obsolete state from forming a queue. Descriptions include an exact game build, protocol version, description type, and random invitation token. A duplicate reply is rejected; each rematch increments the round so delayed old packets cannot alter the new match.

ICE gathering has a twelve-second deadline. Waiting for a peer has a ninety-second deadline. A disconnected established peer has ten seconds to return; a failed/closed peer ends the direct match. Cancel/destroy closes only this adapter's channels and connection and removes its own listeners/timers. Clipboard denial leaves the selectable text and file export fallback available.

`network.stun` accepts an optional `stun:` or `stuns:` URL. The default empty ICE-server configuration has no external dependency. Direct connections across the public internet, cross-NAT success, and TURN coverage are **unknown**. Tests use real local browser peer connections, not a public connectivity service.

## API

- `new HappyNetwork(callbacks)` exposes callbacks `onStart(config)`, `onInput(seat,input)`, `onSnapshot(snapshot)`, `onFinish(scores)`, `onEnd(reason)`, `onStatus(text)`, `onConnected()`, `onLeave(seat,reason)`, and `onTimeUp()`.
- `connectHub()` returns Hub info or `null`; active sessions ready without a gesture. `onStart` prepares the deterministic world immediately; physics waits for the Hub clock.
- `createOffer()`, `acceptOffer(text)`, `acceptAnswer(text)` implement the actual invitation/reply exchange.
- `startDirect(config)` starts or rematches after both channels have exchanged identities.
- `update(dt,snapshot,localInput)` sends rate-limited state/intents; local input uses `steer`, `brake`, `throttle`, `recover`.
- `finish(scores)` sends an idempotent authoritative finish. Set `latest` to the final simulation snapshot before calling it.
- `copy(text)`, `exportText(text)`, `importText(file)` provide accessible signalling fallbacks.
- `destroy()` ends this connection and cleans up.

## Test integration

The root `node tools/test.mjs` command is the acceptance entry point. Supporting tools return JSON for that command to aggregate without extra success chatter:

- `tools/network-unit.mjs` exports `runNetworkUnitTests()`: sixteen deterministic adapter checks, including actorless authority, deadline standings, sender validation, stale input, ordering, departure, and forbidden direct transport in Hub.
- `tools/network-test.py [loopback|file]`: real Chromium offer/reply, complete ICE candidates, reliable and unreliable channels, driving controls, authoritative snapshots, 150ms application delay and 5% loss, finish, rematch, old-round rejection, malformed/truncated/wrong-type/incompatible descriptions, duplicate reply, and peer closure.
- `tools/hub-test.py index.html [one two loss host-leave server]`: official harness on an OS-chosen loopback port, checking both completion and `__hubCheck.pass`. Reports are stored under `evidence/hub-*.json`.

The fixtures and stand-ins are engineering tests. They do not prove public internet reachability or human play quality.

## Observed results

The actual bundled development game passed all five official Chromium harness configurations: one human, two humans, two humans with 150 ms latency / 50 ms jitter / 5% loss, host departure, and actorless server. Each recorded both the completion flag and `window.__hubCheck.pass === true`; there were no page errors. See `evidence/hub-one.json`, `hub-two.json`, `hub-loss.json`, `hub-host-leave.json`, and `hub-server.json`.

The isolated direct adapter passed sixteen deterministic checks and twenty-one real RTC checks each through a file URL and loopback. The latter include 150 ms application delay and 5% loss around the real data channels. This evidence is separate from actual-game network UI/playthrough evidence.

The actual game also passed fifteen file-URL integration checks through its visible Host/Join invitation/reply screens: connection and countdown, physical car contact, a legal driving lead, recovery/crash points, a complete first-to-ten match on both peers, results/rematch, online pause, host closure, and zero page errors. The winning path uses real keyboard/pad intents: the host drives legally; the guest brakes and requests recovery. It does not set positions, award points, or call finish. See `evidence/direct-game-file.json`.

An additional rematch test stops the engine's renderer and marks the host document hidden. The independent authority timer continues fixed 1/120 steps from the common clock without double stepping. A controlled clock advance then verifies the direct four-minute deadline and tied result; this timing check is separate from the preceding input-driven match. The authority pump runs at about 30Hz and also from ordinary engine updates, sharing one cursor and reentrancy guard. Render pacing cannot slow the competitive clock or exchange restarts.

### Issues and limits

Actual-game testing exposed one gameplay issue: online physics/exchange/deadline time followed the renderer's clipped simulation time and could lag far behind the common match clock. The fix advances a shared fixed-step authority cursor from the Hub/direct monotonic timeline, including from an independent timer. The hidden-renderer and tick-cursor assertions confirm the repair. Protocol conformance had already passed before this gameplay timing fix; it was not a broken Hub protocol.

Review additionally identified stale final-state snapshots, uninitialized remote intent, missing-controller automatic acceleration, and visible-window blur safety. These were repaired in the integration/input layer before final verification. Initial contact/crash waits that expired under slow rendering were test-pacing findings, not additional unique game issues. A separate initial file-URL fixture timed out after an idle menu entered its specified attract mode; entering the connection screen immediately removed that test setup issue.

The final loopback actual-game run passed eighteen integration checks, additionally forcing clipboard permission denial, importing the invitation through the real text-file control, and running the scored match with 150 ms application delay and 5% unreliable packet loss around its real data channels. Both peers converged to identical final scores. The final common-clock pump also passed all five official Hub scenarios again. No browser processes or loopback servers from these runs remain open.
