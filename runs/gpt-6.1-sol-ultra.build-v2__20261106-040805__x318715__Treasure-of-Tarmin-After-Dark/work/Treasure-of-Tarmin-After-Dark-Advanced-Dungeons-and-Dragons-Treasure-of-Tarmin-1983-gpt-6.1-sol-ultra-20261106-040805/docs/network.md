# Multiplayer contracts and connectivity

The game supports a shared expedition for one or two adventurers. Each browser has its own first-person camera, personal strengths, hands and pack. The host simulation owns movement, encounters, deadlines, item consumption, shared keys, doors, descent and treasure. A server-only Hub host uses the same model with only the supplied players; it has no avatar and requires no renderer or audio device.

## Versions

- AI Hub Session Protocol 1, unmodified session client 1.4.0.
- Pinned Hub revision: `35a1047f2067b2af3de3943f0fe452f39105d869`.
- `vendor/hub/session.js`, `bridge.js`, `round.js`, `harness.html`, README and arena example are copied verbatim from that revision. The bridge is used by the outer test harness only.
- The game's transport schema is version 1, with a distinct expedition ID for each connection or Hub round. Invite prefix: `TARMIN1.`.

## Standalone connection

1. Open the game in two supported browsers. Choose co-op and Host in one, Join in the other.
2. The host creates an offer and sends its entire selectable connection code to the guest.
3. The guest pastes the offer and creates an answer. Send the entire answer back to the host.
4. The host imports the answer. Both copies wait for the reliable ordered WebRTC DataChannel, a compatible version handshake, and the initial host state.

No camera, microphone, account, lobby service or deployed signaling server is involved. Clipboard permission is optional: ordinary text selection/copy/paste always works. Candidates are gathered to completion before exporting the current `localDescription`. Codes are bounded, validated for version/type/role, and malformed codes can be corrected. Cancel closes the peer and every owned timer. The setup times out after 90 seconds; create fresh codes to retry.

The default uses direct/local-network ICE candidates (`iceServers: []`). Cross-network reachability is not guaranteed; restrictive NAT/firewall combinations can require a TURN relay, which this delivery does not provide. The transport accepts an optional `iceServers` configuration for deployments that supply their own STUN/TURN service. Same-machine test success establishes DataChannel behavior, not universal internet connectivity.

A departing guest leaves a recoverable inventory bag through the simulation's `removePlayer` transaction, and the host can continue alone. Losing the host ends the guest's expedition. There is no host migration.

## Authority and clock

Transport identity supplies the command sender. Commands carry version, expedition, sender sequence, current encounter identity and round. Duplicate sequences, wrong expeditions and stale encounter movement are rejected before reaching the production command handler. The handler revalidates costs, range and combat phase. Scored network actions cannot invoke developer tools.

Host simulation runs on a 25 ms interval with monotonic host or synchronized Hub time. Rendering and menu frames do not own deadlines. Authoritative state is sent as reliable versioned snapshots and top-level deltas at no more than 8 updates/second. Larger state envelopes split into bounded reliable ASCII chunks. The outgoing queue sends at most two packets every 125 ms (16/second), below Hub's 20/second limit. Each game packet is at most 15,500 UTF-8 bytes, below the 16 KB cap. Clients batch at most 16 commands and send up to eight batches/second, with state acknowledgements sharing the same bounded queue. Idle client heartbeats allow liveness and traffic diagnostics without applying any action. Gaps in a delta stream request a full resynchronization. Final results wait for acknowledgement of the final authoritative state, bounded to two seconds so an unresponsive peer cannot exceed the Hub's five-second result grace period.

Guest confirmation and pack comparisons use the production command handler on a throwaway copy to supply an immediate preview. This copy never permanently changes resources, loot or turns; the host revalidates the real action and returns feedback. Guest planning displays extrapolate the most recent host timestamp, rather than comparing unrelated page performance clocks. Solo uses a persisted logical clock that advances effects during idle and excludes paused time.

## Hub lifecycle

Required metadata declares shared-world, 1–2 seats and a 10-minute typical expedition. The session client is the first script following charset. `connectHub` connects and builds state, registers all lifecycle handlers, then readies automatically. It neither waits for a click nor touches standalone invites, saved progression, WebRTC, or public networking. Actions remain blocked until `start` and synchronized time reaches zero. The game exposes the real remaining Hub limit.

Only authority calls `finish`, once, with tied current participant IDs and honest success/depth/treasure statistics. `time-up` reports an incomplete expedition as unsuccessful within the grace period. `end` cancels authority scheduling, command queues and outgoing messages and notifies presentation to stop audio. Native quit controls cannot end a scored Hub round. Visibility and controller loss are handled by the Hub's own policy; local settings must remain non-pausing.

## Verification

`tools/test-net.mjs` passed 35 checks: invite validation, solo authority and logical clock, rendering-free Hub authority, no simulation before start, stale and duplicate rejection, departure, exactly-once time-up, current-team standings, packet bounds, boss/downed end freezing, unanswered-invite timeout and pending ICE-gather cancellation cleanup. Cleanup unit cases use a fake peer; real transport evidence follows separately.

`tools/hub-browser.py --game build/index.html --scenario all` passed 86 checks across the unmodified official harness's two-player standard, two-player latency 150 ms/jitter 50 ms/loss 5%, host departure, two players with a server-only host, and one-player scenarios. The extra game assertions check agreeing final floor/doors/enemy pools/phase/treasure, stopped controllers and measured packet/rate bounds. Reports are under `tools/network-evidence/` and include the artifact digest.

`--scenario ui-peer` passed 21 checks using the actual single-HTML release UI in two isolated browser contexts. Real UI-generated offers and answers establish the native WebRTC channel. Stock opening combat, guest rest preview/confirmation, handoff and contested key claims use ordinary production commands. Depleted pools/no-food, ladder positions and final boss preparation are explicitly seeded through the test-only interface; subsequent revivals, readiness, combat through all three boss phases, separate boss defeat and treasure collection, guest departure and inventory recovery use production handlers. Render loops are stopped after successful initialization for this network/UI test; native input and visual presentation are verified separately. A smaller transport fixture passed 10 real-peer checks earlier in development.

Real phones, physical controllers, cross-network NAT reachability and human audio listening remain unconfirmed.
