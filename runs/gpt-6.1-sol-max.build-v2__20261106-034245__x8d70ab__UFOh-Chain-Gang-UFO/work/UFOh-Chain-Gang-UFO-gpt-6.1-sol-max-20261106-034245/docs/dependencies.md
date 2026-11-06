# Pinned upstream handoffs

| Dependency | Release / exact revision | Included files | License |
| --- | --- | --- | --- |
| my-3D2dge | v0.89.1 / `8ecc2f62353761187bdfe226f327b7ea5d2eb691` | Full runtime, agent edition for reference, README, API card, asset card, arcade starter | MIT, Copyright (c) 2026 Michael Crosato. Exact LICENSE retained under vendor/engine and in the final HTML. |
| AI Hub Session Protocol | v1, client v1.4.0 / `35a1047f2067b2af3de3943f0fe452f39105d869` | Exact session.js, README, arena example, official harness/bridge/round | Repository license **unknown**: no LICENSE at that revision's root. Upstream README explicitly instructs games to paste the released client unmodified. Banner and source preserved. |

Engine handoff: https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff

Protocol handoff: https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub

Both runtime files are **unmodified**. The full engine already includes its modules; no arcade module is loaded twice. The arcade ROCKS starter supplied the fixed-scene/input/cabinet structure, but wrapping, thrust/turn, hyperspace, alternating lives and asteroid splitting were replaced by the authored simulation. The only package is this game's own build/test coordinator; there are no npm runtime dependencies, CDN requests, image files, font files, sampled sounds, remote rooms or extra network transports.

The custom ES-module bundler inlines source, styles and runtime. Script closers in engine/game code are escaped for HTML; the Hub client is inserted byte-for-byte as the first script immediately after charset. `build/manifest.json` records the delivered bytes, hashes, modules and pinned revisions. Harness staging is testing only and is not a runtime dependency.

Verification tools supplied by the workstation: Node 24, Python Playwright 1.63 with installed Chromium 153, Firefox 155 and WebKit 26.6. No browser or runtime installations were made.
