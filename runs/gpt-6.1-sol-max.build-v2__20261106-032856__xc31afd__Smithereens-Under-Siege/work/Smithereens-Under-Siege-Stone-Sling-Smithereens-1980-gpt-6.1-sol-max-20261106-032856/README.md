# Smithereens Under Siege

Open the root single-file HTML directly in a browser. It is self-contained and works offline. To host online versus, import it into AI Hub; the standalone game has no matchmaking service.

- Hold/release Cross, Space or the left mouse button to sling. L1/R1 or Q/E select stone. Circle/C/right mouse cancels. Options/Escape pauses.
- Two keyboard seats: Teal uses Space and Q/E; Coral uses Right Shift and U/O (I cancels). Local setup also offers two pads or keyboard plus pad.
- Touch: hold/release on the field. Portrait keeps the full lane and magnifies the opposing castle.
- Pause → Developer tools opens scenarios, stepping, live tuning and the versioned court editor. These changes mark local runs. Hub exposes read-only diagnostics.

From this development folder:

```
npm run build
npm run verify
```

Verification prints failures and a single count. It covers deterministic combat and a complete ten-bout tour, real file loading/input/audio, and the unmodified official Hub harness (normal, impairment, host leave, server host). Browser tests use the already-installed Python Playwright environment. No npm runtime dependencies are required.

Pinned engine: my-3D2dge 0.89.1, 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Hub: protocol 1/client 1.4.0, 35a1047f2067b2af3de3943f0fe452f39105d869. Both upstream revisions matched at acquisition. Original source research and attribution appear in About/Credits. All audio is generated in code; physical hardware and acoustic quality are unconfirmed.
