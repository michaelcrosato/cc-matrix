# Validation notes

The main command is `npm test --silent`. It exercises deterministic Rapier simulation; a complete regular run and attract run; keyboard, mouse, emulated standard gamepad, native browser touch input and pause menus; live settings and balance reset; offline audio synthesis; real two-page WebRTC co-op; and the AI Hub conformance matrix (2 players, 4 players with latency/jitter/loss, host departure, and a dedicated host).

Eight defects were found during testing and corrected:

1. OfflineAudioContext needed separate unlock handling.
2. Opaque circular scene details needed depth writes.
3. Pennants needed front-facing triangle winding.
4. Mouse unprojection returned an object; movement needed its x component. Critical.
5. Online roster entries needed numeric seat IDs before gameplay mapping. Critical.
6. The document lacked required Hub session metadata. Critical for Hub import.
7. Repeated Rapier body removal with overlapping bucket sensors could trap in WASM. Bucket sensors were unnecessary because catching uses a swept crossing test. Bombs continue to use Rapier gravity, velocities and bodies. Critical.
8. Greedy AI targeted one of two simultaneous split bombs; grouping their landing positions fixed it.

Code review also improved repeated audio unlocks, touch gesture handling, explosion-shake settings, final multiplayer result snapshots, and About scrolling. Test fixtures required visible selectors and range input events; those were test corrections, not game defects.

True WebGPU was checked through runtime state and absence of errors. This machine can capture WebGPU canvases as blank, so visual composition was reviewed using the renderer's WebGL backend at 1920×1080 and in a phone portrait profile. Physical controllers, real phones, listening by a person, and cross-network NAT traversal remain unknown.
