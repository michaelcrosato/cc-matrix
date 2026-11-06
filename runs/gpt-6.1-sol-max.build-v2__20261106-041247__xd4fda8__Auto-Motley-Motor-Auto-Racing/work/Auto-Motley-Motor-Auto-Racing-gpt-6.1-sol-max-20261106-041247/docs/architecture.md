# Auto Motley Motor architecture

The root HTML is the deliverable. Development sources live here; no runtime files or services are required for solo/couch play. Build with npm run build; validate with npm test. Filters are core, sim, grand, browser, tour, input, touch, audio, direct, hub, net. The test command prints failures and a single count. Evidence and issue history are under docs/evidence and docs/issues.md.

## Ownership

- data.js: cars, road/circuit definitions, landmarks, tour, defaults and schema checks.
- world.js: native E.Path road geometry, exact shared-edge grand circuit, spatial road/solid queries, surfaces, seeded trees, connected navigation graph.
- sim.js: the only authoritative car-update owner. E.Car updates once at 1/120 s. E.Race.update is intentionally not called. It handles countdown locks, progress, lap timing, incident classification, recovery, contact, pursuit arbitration, discovery, straight runs, AI, snapshots.
- storage.js: versioned local passport, ordinary and dev records, best-run pose samples and safe storage fallback.
- art.js: native materials/shapes, depth sorting, native wheel groups and body motion, road/field/water pixel drawing, particles, camera and minimap.
- audio.js: native synth/music buses, continuous motor/slip oscillators, event cues and code-generated crew babble. Music begins at .10; saved volumes override it.
- ui.js: extends E.Shell. Its standard controller/keyboard focus, sliders, settings, pause and back stack remain in charge. Custom screens add previews, signalling textareas and a sparse race HUD.
- main.js: application state, local seats, touch zones, tour flow, settings, attract director and adapters.
- net.js: one host-authoritative protocol for Hub and real standalone WebRTC. Native simulation is reused without an alternate rules implementation.

## Rule invariants

Cars are frozen during grid/exchange; brake-from-rest uses reverse:0. Race progress projects only near its retained segment, never globally onto any nearby road. Required finite directed gates are crossed in order by actual short forward motion. A car-width allowance handles projection changes at authored corners. Recovery places after the last valid gate and cannot manufacture a line crossing.

Both incidents are collected before adjudication. Opponent crash is +2; both crash is zero; a crash wins over a simultaneous lead. Clean separation is unwrapped legal distance, not Euclidean or camera distance. A .28-second confirmation window precedes the +1 lead point. Restart slots are side-by-side at the leader’s last gate. Winning score is checked before staging another exchange. Time trial recovery adds 5 visible seconds; free drive has no competitive penalty.

Rule randomness uses named retained generators from a seed. Trees/cosmetics use separate streams. Drawing never changes rule state. Authoritative snapshots include route progress, both poses/velocities, rule event IDs, exchange/state, score and clock. Same-tick final rule changes are ordered by event ID; stale or duplicate packets are rejected.

## Clock and networking

Local rounds advance on native engine fixed ticks and pause together. Network authority has a dedicated Worker-backed monotonic scheduler so a hidden/actorless authority does not depend on rendering or local input. Hub physics waits until AIHub.time() reaches zero. The host alone awards points and calls finish; every remaining human appears once in standings. Transport sends stay below 20/s and continuous snapshots are compact. Stale remote input brakes safely. Online overlays send braking and leave the match running. On Hub end, traffic and sound stop; the Hub owns navigation.

Standalone WebRTC is only constructed after standalone has been established. Ordered reliable rules and an unordered maxRetransmits:0 state channel share the protocol; reliable-only is a bounded fallback. Invitations/replies contain gathered SDP candidates and build/config versions. Both peers ready before the host countdown. Direct disconnects have a finite timeout, and host migration is not attempted. No camera/microphone permission is used. Cross-NAT internet and TURN behavior are unconfirmed.

## Diagnostics and storage

window.__motor.snapshot() is read-only structured state. The deliberate input/tick bridge exists only with ?test=1, controls real driving intents, and refuses to advance online authority. Online balance tools are read-only. A dev-altered run cannot overwrite ordinary records. Full input-driven tour evidence is distinct from the cheating attract showcase.
