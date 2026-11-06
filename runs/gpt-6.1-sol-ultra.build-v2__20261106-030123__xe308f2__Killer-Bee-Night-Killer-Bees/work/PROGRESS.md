# Killer Bee Night — complete

## Deliverables
- Final single playable HTML: `Killer-Bee-Night-Killer-Bees-gpt-6.1-sol-ultra-20261106-030123.html` in this work root. Open directly; no build/server required.
- All development files: `Killer-Bee-Night-Killer-Bees-gpt-6.1-sol-ultra-20261106-030123/`. Its `index.html` has identical bytes.
- Required machine-readable interview: `exit-interview.json` in work root. Exact schema parsed; its source and feedback fields match in-game About/Credits.

## Final state
- Title chosen once with secrets.randbelow(50), selection metadata in development `selection.json`; title list never exposed to players.
- Engine v0.89.1 at8ecc2f6 and Hub SDK1.4.0 at35a1047 vendored. Original engine source unchanged; MIT license retained and inlined. Pristine SDK is first script, byte-identical.
- Six authored encounters across three gardens; normal-command campaign, Bellkeeper opening/push routine, ending/replay/checkpoints and clean/assisted bests complete.
- Solo, simultaneous couch, actual manual WebRTC direct co-op, Hub shared-world, and dedicated no-seat authority implemented. Final Hub state ACK prevents guest ending divergence.
- Native Menu/Shell/input/settings, procedural Blob-based insect/gardener rigs, code-only reactive music/effects/gibberish with10% default music.
- Attract, rebinding/glyphs, touch multi-pointer lifecycle, portrait fit, comfort settings and live developer tools implemented.
- Final visual correction moved victory reunion below result panel. Ray and earned-ending screenshots inspected; art/palette sheet retained.

## Verification — final bytes
`npm test`: **338/338 checks passed**.
- Simulation/content97; native engine5; network units11; package14; audio12; browser157; real network42.
- Solo seed42 clean ordinary-command proof578.28s; co-op seed7 clean proof549.73s (result screens excluded). Zero sampled geometry overlaps, disappearing husks or duplicate event IDs.
- Native 120Hz headless drawing campaign; Chromium/WebKit/Firefox file launch/input/storage; pad stubs; phone multi-touch and5aspectratios; offline objective audio.
- Official Hub harness with150ms±50ms /5% loss, departures, time-up, dedicated server; real earned cooperative victory and matching final worlds; actual2-context WebRTC and reliable worst-content snapshot.
-8 distinct executed-check/visual issues fixed,3 blocking. Extra review improvements and fixture corrections tracked separately in `evidence/issues.json`.
- Artifact checksum and byte count recorded in `evidence/test-results.json`.

## Files to consult
Development `README.md`, `ACCEPTANCE.md`, `research.md`, `content/README.md`, `docs/NETWORK.md`, `evidence/VISUAL-NOTES.md`, and `evidence/test-results.json`.
Build: `npm run build`. Quiet complete verification: `npm test`, from the development directory.

## Remaining work
None for this build. Physical controllers, real iOS/TV hardware, subjective listening and arbitrary internet/NAT reachability remain unverified; prescribed stand-ins and objective checks were used. No performance target or subjective audio claim is made. All test-owned browsers and loopback servers closed.
