# Final verification

Artifact: `Astro-Battle-Jam-Astro-Battle-Space-Invaders-1979-gpt-6.1-sol-max-20261106-022645.html`
SHA-256: `09da632f4b583b1fc62cc5c42a82fe261d8d248a1da28ff293b6e51659523098`
Bytes: 1403922

Command: `node tools/test.mjs` — 133 checks, 0 failures.

- simulation: 23 checks, 0 failures
- engine: 14 checks, 0 failures
- session: 10 checks, 0 failures
- browser: 59 checks, 0 failures
- hub: 27 checks, 0 failures

## Ordinary-rules completion evidence

These pilots observe state and submit ordinary movement, fire and repair. They do not modify health, resources, tuning, encounters or invulnerability. All runs use standard difficulty.
- Fixed-step 1-seat seed 2037: victory, 310.62 simulation seconds, 6780 points, 1 deaths, 42 repairs, all six formations and both flagship phases.
- Fixed-step 2-seat seed 2037: victory, 219.83 simulation seconds, 7480 points, 1 deaths, 47 repairs, all six formations and both flagship phases.
- Native exported solo campaign: victory in 259.32 simulation seconds, 6880 points; all eight encounter/phase identities observed.
- Native local co-op campaign: victory in 182.76 simulation seconds, 6980 points; contributions [4130, 2850]; 0 deaths. This bot run did not need repairs; explicit pad, touch and remote repair tests cover that action separately.

These are skilled automatic replays. A novice human first-success duration is unknown; the intended 8–12 minute pacing has not been measured with a human.

## Export, input and sessions

- Actual root artifact copied into an isolated evidence directory and opened by file URL. Boot, menus, ordinary play, replay, credits and assets work without development files.
- Native headless draw and update paths have no errors. Chromium full tests and Firefox/WebKit startup/input smoke pass.
- Standard-mapping gamepad stubs cover simultaneous play, repair, held confirmation, unplug/reclaim and glyph choice. Phone/tablet profiles cover taps, relative steering, second-contact fire, contextual repair, cancellation, attract wake and credits rotation.
- Official pinned Hub harness passes supported one-seat and two-seat rounds, host-leave and server-only hosting with latency150ms, jitter50ms and loss5%. All complete flags and pass results are checked.
- Additional Hub semantics check remote erosion/repair masks and costs, death/reserve/respawn agreement, local overlays, disabled mutations, and a shared terminal TIME EXPIRED outcome before end.
- Packet strategy: complete reliable snapshots at10Hz, bounded unreliable action heartbeats at10Hz. Repair edges and input sequences are acknowledged. Remote positional interpolation changes no authoritative state.

## Audio and limitations

- Production native synth signal metrics: {"audible": {"rms": 0.01882437531146609, "peak": 0.13616575300693512, "finite": true}, "muted": {"rms": 0, "peak": 0, "finite": true}, "ready": true, "music": 0.1, "gains": [0.699999988079071, 1, 0.10000000149011612, 0.6499999761581421]}
- Music initializes and resets to0.10. Audio unlock requires a real browser gesture. Muted bus renders zero signal; generated samples are finite and bounded; owned gibberish voices terminate.
- Physical controller feel, human listening, real TV distance and physical iOS behavior remain unknown. Emulation and signal checks are not claims about those experiences.

## Review and provenance

- Fifteen distinct issues were found and fixed; one classified critical. See issues.json for root causes and checks.
- Visually inspected title/combat hierarchy, native silhouettes, emitter/core distinction and telegraph, TV focus/sliders, portrait controls/occlusion and credits pagination. Final layout regressions also verify the actual page reached.
- Source research and limits are in research.md. Native engine and pristine Hub client are unchanged and their embedding/integrity is checked.
- Root exit-interview.json parses, matches src/report.json exactly, and supplies every required source and feedback field. Its same data is embedded in About/Credits. Usage is exactly added on import.
