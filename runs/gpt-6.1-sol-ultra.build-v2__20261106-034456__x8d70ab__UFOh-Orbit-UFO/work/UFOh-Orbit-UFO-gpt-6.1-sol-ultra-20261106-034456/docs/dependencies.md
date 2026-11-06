# Runtime and provenance

| Component | Pinned version / revision | Provenance | License / notices |
| --- | --- | --- | --- |
| my-3D2dge full native engine | v0.89.1; `8ecc2f62353761187bdfe226f327b7ea5d2eb691` | https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff | MIT, Copyright (c) 2026 Michael Crosato. Exact license in `vendor/engine/LICENSE`; engine banner preserved in delivery. |
| AI Hub Session Protocol v1 client | client v1.4.0; `35a1047f2067b2af3de3943f0fe452f39105d869` | https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub | License **unknown**: no root LICENSE at this revision and GitHub declares no repository license. Released client banner retained; exact `session.js` shipped unmodified as instructed by its published handoff. |
| Browser APIs | Canvas 2D, Web Audio, Gamepad, Pointer Events, localStorage | Host browser | No downloaded dependency. Browser version depends on player. |

The full engine already contains its native modules: no second arcade-module load. `vendor/engine/kits_arcade.js` is a development reference, not the shipped game. Its ROCKS arena structure informs native overhead scene setup; wrapping, momentum/turn steering, alternate turns, asteroid splitting and stock cabinet choices are not carried over.

Native pixel primitives, palette/shape facilities, font, scene/timing/input infrastructure, and chip synthesizer remain the foundation. Simulation, content, orbital cannon/shield contract, simultaneous co-op, protocol adapter, and source-specific assets are game-authored. Original runtime songs and native synth cues ship as JavaScript data, with custom Web Audio formant babble connected to the native voice bus. No music, sound, speech, art or font files are requested at runtime.

The build preserves upstream notices, inlines engine and game, and puts the exact released session client first immediately after charset. Root HTML is independently playable through `file://`; Hub network transport is provided by the embedding host. Research documents and reference images are not runtime assets.

## Development-only verification

Node 24.21.0; Python Playwright 1.63.0 with the already installed Chromium 153, Firefox 155 and WebKit 26.6 where exercised. No browser binaries are downloaded. Headless sound verification uses numerical Web Audio output; no listener, physical pad, touch device, TV or actual iOS device is available. Exact executed checks and limitations are recorded by the test coordinator.

Build-only tooling: esbuild 0.25.12 (MIT), pinned in package-lock.json. It bundles game ESM modules; the released Hub client is inserted verbatim afterward and receives no transformation. Runtime uses no CDN assets or third-party raster/audio resources. Native browser Canvas2D and Web Audio provide presentation and synthesis.
