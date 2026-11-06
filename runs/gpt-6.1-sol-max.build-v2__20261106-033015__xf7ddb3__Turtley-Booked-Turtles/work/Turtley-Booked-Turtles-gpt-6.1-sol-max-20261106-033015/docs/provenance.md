# Dependency provenance

- Engine handoff: https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff — v0.89.1, MIT (full grant in vendor/engine/LICENSE and final HTML).
- Hub: https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub — protocol 1, unmodified client 1.4.0. No repository license file was present at the downloaded root; license is unknown. The supplied client is used as explicitly requested.
- Engine source changes: none. Game code extends native GridMover for immediate reversal, subclasses continuous Blob rigs for bespoke anatomy and uses native TileMap, Grid, Game, renderer/pixel primitives, lighting, props, particles, Shell, settings, input, Arcade attract timing and audio synthesis.
- No other runtime engine, CDN, bitmap assets, recorded audio or TTS. Source research images are retained only under docs, never bundled. All hotel/turtle/beetle game art, floors, writing, tune, voice synthesis and game rules are original code.
- Title selection: crypto.randomInt selected index 8 from a privately brainstormed list of 50 titles; identity.json records the result. No title from another run was used.
