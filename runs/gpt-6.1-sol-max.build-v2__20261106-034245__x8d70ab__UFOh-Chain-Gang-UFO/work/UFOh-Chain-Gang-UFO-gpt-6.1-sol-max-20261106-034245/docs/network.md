# Shared-world networking

The final page embeds the released AI Hub Session Protocol v1 client 1.4.0 unchanged, immediately after charset. `src/net/hub-adapter.js` is game-specific code layered on that client. It never opens a socket or uses a parallel multiplayer service.

`createHubAdapter({hub,createWorld,onWorld,onEnd,onEvent})` implements the contract in `contracts.md`. Call `connect()` once at boot. A null result selects standalone. Otherwise `onWorld` receives the session world, the adapter calls `ready()` without a gesture, and the application skips title/name/attract screens. Set the native game to live updates with automatic local pausing disabled. Call `tick(dt,intent,{overlay})` on every native fixed step; a local overlay neutralizes its pilot without stopping the clock. Draw `getPresentation()`. Stop audio/input in `onEnd`.

## Authority and lifecycle

- The host alone steps `World`. Host-local intent is sanitized through the same representation as remote intent. A dedicated server has `localId === null`, creates only the member pilots, and still readies, simulates, broadcasts and finishes.
- A cached `AIHub.rng('ufoh-world')` stream supplies the world seed. Shared-world mode does not assume seeded `Math.random`.
- No world step or gameplay packet occurs before the start event and `AIHub.time() >= 0`. The launch animation's separate transition also suppresses presentation prediction.
- Remote intent is sent at 10 Hz, including a neutral idle heartbeat. A fire press shorter than one packet interval is latched until one successful input send, followed by the ordinary release heartbeat. Holding fire does not invent additional press edges. Overlays, countdown, leave and end discard queued presses. The host accepts current members only, takes the transport's sender ID, rejects old/duplicate sequence numbers, and expires held input after 0.5 simulated seconds without a new packet. A peer cannot claim kills, damage, position or points.
- Full world snapshots are sent reliably at 8 Hz, with input acknowledgments. Clients accept state only from the current host and reject older world sequences. All damage/scoring stays authoritative. Local steering/bead prediction reconciles from acknowledged inputs; remote actors interpolate between full snapshots. Rescues/teleports over 180 units snap instead of sweeping through hazards.
- A final leave clears the member's input, invokes `World.removePlayer`, and excludes that ID from the finish. No host migration is attempted; Hub ends a departing-host round.
- Victory/defeat and time-up send the final reliable world first, then call `finish` exactly once. All remaining IDs tie, each reports the team score, and only an actual victory sets `won:true`. Time-up on an unfinished mission records a loss with earned points. `end` stops all adapter stepping/traffic and invokes the application's cleanup once.

## Bounded packets

The snapshot codec stores repeated object keys once per actor table and rounds presentation numbers to 0.001. The host retains full numeric precision. Every actor, projectile, chain victim list, boss component and gameplay field remains in the packet. Only the effect-event history is limited to its latest 24 entries; event IDs prevent replayed audio. Snapshot methods must continue excluding full content definitions and replay history.

The adapter measures UTF-8 bytes before sending, reserves headroom under the 20 messages/second rate, and refuses a packet above 16,384 bytes with a visible protocol failure. It never solves an oversized packet by dropping gameplay actors. The actual-world dense fixture contains 40 threats, 60 shots, four chains and a three-component boss and fits the limit.

## Verification evidence

`tests/hub-unit.mjs` exports `runHubUnitTests()` for the single test coordinator. Its 30 checks pass against fake protocol peers and the actual `World`: automatic ready, standalone, countdown, host/remote device isolation, idle traffic, rate/payload bounds, codec fidelity, invalid intent, sender/sequence rejection, stale input, overlay neutrality, leave, dedicated server, one-player sessions, final ordering, tied wins, prediction isolation, event deduplication, end cleanup, actual dense state, launch presentation gating, a real shared shield collision/score/ack, one-tick fire taps, successful-send retention, held/released fire and lifecycle cancellation of queued shots.

Testing found a packet-timer defect: floating-point modulo could schedule an extra packet near a cadence boundary. Subtracting the interval with an epsilon-safe threshold fixed it. Integration review also corrected presentation prediction during the native launch transition, matched the real balance keys and hit radius, and kept stationary beads slewing toward the previous request. No engine or released client source was modified. The root build owns the official browser harness and two-page gameplay checks; this unit evidence does not claim those have passed.

Final integration review found that short fire taps, including touch auto-fire pulses, could disappear between 10 Hz packets. The transmitted press latch fixes that without increasing the packet cadence. Six focused regressions cover real cannon acceptance, release, refused sends, overlay/lifecycle cancellation and stale held input.
