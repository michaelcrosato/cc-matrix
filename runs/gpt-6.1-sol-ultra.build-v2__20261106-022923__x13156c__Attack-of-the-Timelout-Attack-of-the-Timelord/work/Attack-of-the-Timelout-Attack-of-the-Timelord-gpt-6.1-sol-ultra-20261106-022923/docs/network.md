# Network implementation and verification

The game uses one host-authoritative simulation in both environments. Rendering is never needed to step a server host. AI Hub seat ids remain numbers in the transport; simulation actors normalize them to strings. No player-provided id is accepted in an action packet.

## Dependencies inspected

- AI Hub [protocol README](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/README.md), [session client](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/session.js), [arena example](https://github.com/michaelcrosato/ai-hub/blob/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub/examples/arena.html), and official harness/bridge/round inspected and vendored at commit `35a1047f2067b2af3de3943f0fe452f39105d869`. Protocol 1; client 1.4.0. `vendor/session.js` is unmodified; SHA256 `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a`. AI Hub repository license: unknown; GitHub license API returned 404. The provided integration instructions authorize vendoring this client.
- PeerJS 1.5.5 confirmed from npm metadata. Loaded from the pinned jsDelivr URL only after an explicit standalone Create/Join action. MIT license retained in `vendor/hub/PEERJS-LICENSE`.
- Official PeerJS [getting started](https://peerjs.com/client/getting-started), [cloud service](https://peerjs.com/server/cloud), and [FAQ](https://peerjs.com/client/faq) inspected. Default public PeerServer supplies signaling. No account or server credentials are required. The FAQ confirms that symmetric NATs can need TURN; universal internet reachability is unverified.

## Adapter contract

`new NetworkSession({onWorld,onStart,onRoster,onEnd,onLeave,onError})` supplies shared lifecycle and validation. `connectHub()` returns Hub info or null; prepare the world, then call `ready()` once. Hub `started` becomes true only when the synchronized time is nonnegative. A server has `me === null` and receives no local action.

`update(dt, localAction)` runs on the local engine update, including lobby/results screens. Only the host calls `stepWorld(world, net.actions())`, `publish(world)`, and `finish(world)`. Standalone `createRoom`, `joinRoom`, `setReady`, `startRoom`, `invite`, and `leave` supply the room flow. `onEnd({room:true,reason:'finished'})` retains the room for replay. Hub end and host departure stop input and transmission.

Create generates an eight-character code using cryptographic random bytes, omitting confusing glyphs. A data-channel open is followed by challenge, hello, welcome, and acknowledgment. The roster is connected only after that application handshake. New seats are refused during an active run. The host allocates up to three guests and remains the sole world authority. Timeout/error paths return actionable messages, and `leave` closes only owned links/timers.

## Wire behavior

- Guest actions are sampled at up to 12 Hz. A packet carries generation seed, monotonic sequence, movement in [-1,1], optional horizontal target in [-450,450], fire held, and monotonic brake-edge counter. Sender identity owns its seat; unknown fields, stale sequence, stale generation, nonfinite/range errors, phase/score spoofing, and unknown senders are rejected.
- Movement/fire expire after 350 ms of monotonic real time without a valid packet, independently of drawing or native animation-frame pacing. Brake counters are consumed once; simultaneous requests can produce only the canonical simulation's one accepted activation.
- Display snapshots contain compact tuples for real players, ships, threats, shots, boss, stats, subtitle, and recent event ids. No particles or cosmetic RNG cross the wire. Hit/recoil values and grounded eligibility remain explicit.
- Unreliable world chunks have a measured encoded-byte ceiling of 1,150 bytes, under the protocol's approximately 1,200-byte target. A complete revision is required before application; old/incomplete revisions cannot overwrite newer state. Chunk sending is paced at 10 packets/second. Whole reliable corrections occur once per second and on phase changes, below 16 KB. A bounded event ring retains feedback for 1.25 seconds so host presentation clearing between packet slots cannot erase remote hit/voice/interception effects.
- A rolling real-time 18-message/second send ceiling leaves room for terminal Hub messages. Debug counters expose accepted/rejected inputs, stale expiry, encoded sizes, rates, and oversize drops. The Hub's own 20/s, burst40, 16KB enforcement remains active.
- A run generation prevents old input or old world chunks leaking into replay; replay resets pending snapshots, brake edges, and applied ticks. Host finish sends a final correction, includes each current participant once in a tied standing, and reports the shared score and win state once. Departed seats are removed.

## Recorded checks

`tests/hub/network.test.mjs` exercises validation, identity ownership, stale inputs, brake-edge consumption, compact state, Unicode byte budgets, dropped/reordered chunks, reliable correction, rate ceilings, replay isolation, event retention, standalone fallback, server-host identity, exactly-once finish/end silence, readable codes, and unmodified client equality.

`tests/hub/run-peer.py` opens separate Chromium contexts and uses the actual public PeerServer and WebRTC data links, never BroadcastChannel. The latest evidence is `test-artifacts/peer-results.json`. It verifies create, data-link handshake, ready, start, authoritative remote movement, real owned shots, result/score convergence, replay advancing with a fresh seed, guest departure, active roster lock, host departure, failed join, and returning offline. It is transport coverage; the forced result is a terminal-path test, not evidence of a legitimate campaign clear. Same-machine success cannot prove all NAT combinations.

`tests/hub/run-harness.py PATH_TO_FINAL_HTML` serves the delivered artifact and unmodified official support on 127.0.0.1 with an OS-selected port, then runs the four required official scenarios sequentially in one Chromium process. Evidence is written to `test-artifacts/hub-results.json`; both dataset completion and `window.__hubCheck.pass` are required.

## Independent authoritative clock

`src/network/clock.js` supplies a monotonic interval clock with canonical 1/120-second catchup. A hidden or undrawn page can catch up its full elapsed interval without coupling hostile time to rendering; local menus do not suspend the shared world. The main game samples device actions separately, neutralizes hidden/local-menu input, and only the host steps canonical state. Lobby/results transport pumping uses the same clock. Terminal teardown prevents further simulation or traffic. The server path supplies no local action or camera.

The clock has owned start/stop/reset/dispose lifecycle, discards inactive time rather than banking a future burst, stops automatic catchup when the session becomes inactive, and exposes a deliberate manual `advance` seam for automation. Eighteen network unit checks include delayed-pulse catchup, exact fixed steps, backwards-time handling, inactive/terminal behavior, interval disposal, real-time stale-input expiry without rendering, and explicit test driving.

The final-artifact integration runner is `tests/hub/gameplay.py FINAL_HTML`. It uses real public signaling and WebRTC from two separate browser contexts. Native `game.advance` pumps local device/UI sampling while drawing is off; the production network interval independently steps and publishes the host world. Marked collision fixtures create threats and refill the brake for deterministic integration assertions. The test verifies owned remote fire, real interception/score/charge, one-hit integrity, one shared brake, all-disabled canonical defeat, complete results, terminal convergence, replay, host departure, solo fallback, packet ceilings, and absence of exceptions. It never awards victory or substitutes for the ordinary-action campaign playthrough. Latest evidence: `test-artifacts/network-gameplay.json`.

During investigation, background Chromium pages advanced their native animation-frame simulation by less than a second over tens of real seconds; this exposed the rendering-dependent multiplayer clock. The production independent timer, rather than an environment-only workaround, resolves that architecture issue. Public signaling also timed out in some attempts; the UI's explicit timeout and solo recovery were exercised. Successful public links remain evidence for this machine and these network paths only.

Latest measured production-timer run: packaged multiplayer 15/15 checks passed. Host maximum 17 messages/second, guest 13; host largest JSON packet 1,374 bytes, largest unreliable chunk 886 bytes; zero oversize drops and zero rejected legitimate inputs. Official Hub conformance was rerun after the independent-clock/monotonic-TTL integration and passed all four required scenarios. Eighteen network unit checks pass. These are functional/protocol measurements, not performance gates.
