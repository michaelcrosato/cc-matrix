# Cooperative dispatch

Bomb Union uses one deterministic repair model through two transports.

## AI Hub

The unmodified protocol-1 client 1.4.0 in `vendor/hub/session.js` is the first script in the exported head. The adapter connects shared-world seats 1–4, readies automatically, waits for the Hub timeline to reach zero, and starts a four-minute relay dispatch. Authority and local seat are separate: a server without a player advances the same simulation and publishes it. Guests send semantic intents with board revision, case ID and an idempotency ID; transport identity supplies the seat. Host-only snapshots and reliable board patches carry accepted operations, truthful evidence, proposals, hazards, timer and outcome.

Snapshots split into bounded 2,600-character chunks. Board patches coalesce at eight per second and full snapshots at one per second; ordinary current content stays below 20 outgoing messages per second and 16KB per packet. Guests send one heartbeat per second even while no target is being used. One tied team finish lists connected seats only. Hub end disables input, sends and simulation. Gameplay cheats are rejected by the transport in Hub.

## Standalone

Host/join instantiates vendored PeerJS 1.5.5 only after the standalone online flow is entered. Six-character codes use `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` and map to namespaced peer IDs. Secure PeerJS Cloud signaling finds peers; reliable WebRTC data connections carry the same commands and state. A protocol/content handshake rejects mismatches. Four seats are admitted, with twenty-second reconnect tokens reserving disconnected seats. A disconnect releases held tools and board claims without repairing damage. Rejoin restores the authoritative snapshot; the previous connection is stale. A dispatch ID distinguishes fresh retries even when case and seed are unchanged. Host departure ends the guest round.

Standalone networking uses public Google STUN and ships no TURN credentials. The demonstrated boundary is two Chromium pages on this WSL2 machine using the shipped cloud-signaled path. Cross-network NAT traversal is unknown; restrictive symmetric-NAT networks may need TURN. All connection failure paths offer retry/return text.

## Verification

- `tests/network.mjs`: authority/identity/idempotency, elapsed clock, guest non-authority, packet bounds, same-seed retries, end silence and coalesced rate checks.
- `tests/net-browser.py`: real cloud host/join; distinct-seat repairs; exclusive claims; shared evidence and result; disconnect/rejoin; full/version/unavailable rooms.
- `tests/net-bundle.py`: exported UI host/join, mouse/tool repairs by both seats, inferred code proposal, guest vote and shared win screens.
- `tests/net-hub.py`: official automatic harness normal, four-seat latency150/jitter50/loss5, host-leave and server scenarios. Accepts the root artifact path as its argument for exported-game verification.

Testing caught an absent dispatch identity for same-case/same-seed replays during integration review. Added a unique dispatch identifier and a regression that observes two guest starts. No engine change was required.

Final-artifact state comparison also caught a Hub lifecycle reset between terminal simulation and delayed finish. A distinct play-started latch now keeps the original terminal bomb authoritative until end; the regression reproduces time expiry then calls the native tick again. Final snapshots receive a brief delivery interval before finish, inside the official grace. The root UI separately derives observation from current board ownership so acknowledged guest claims enable the contextual tool action.
