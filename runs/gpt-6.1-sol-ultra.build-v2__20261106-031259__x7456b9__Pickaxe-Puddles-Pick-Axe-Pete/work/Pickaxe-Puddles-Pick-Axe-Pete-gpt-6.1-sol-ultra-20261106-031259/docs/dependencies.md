# Dependency provenance

All dependencies were checked against their actual repository contents on 2026-11-06. Neither upstream baseline had changed from PLAN.md.

| Dependency | Actual version | Commit | Local source |
| --- | --- | --- | --- |
| my-3d2dge handoff, full native engine | 0.89.1 | `8ecc2f62353761187bdfe226f327b7ea5d2eb691` | `vendor/engine/`, copied from a sparse clone of [upstream](https://github.com/michaelcrosato/my-3d2dge/tree/8ecc2f62353761187bdfe226f327b7ea5d2eb691/dist/handoff) |
| AI Hub Session Protocol | 1; client 1.4.0 | `35a1047f2067b2af3de3943f0fe452f39105d869` | `vendor/hub/`, copied from [upstream](https://github.com/michaelcrosato/ai-hub/tree/35a1047f2067b2af3de3943f0fe452f39105d869/lib/hub) |
| Official Hub checker and support | same commit | `35a1047f2067b2af3de3943f0fe452f39105d869` | `vendor/hub/scripts/hub-check.mjs`, `scripts/lib/hub-client.mjs`, `scripts/lib/serve.mjs` |
| Playwright Python environment | 1.63.0 | unknown | Installed workstation environment; browsers already present. No browser install is needed. |
| Node.js | 24.21.0 | unknown | Installed workstation runtime, used for packaging and deterministic tests. |

`vendor/hub/session.js` is pristine. Full-file SHA-256 is `6ab6be43898e2db069bc21a94757d77d9c3f2a0cb76f01186490d3bd88d8717a`; the official checker hashes the banner-to-last-line portion, which matches release 1.4.0 (`529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a`). The final packager must embed it byte-for-byte as the first script immediately after charset; it must not pass through game-code transforms.

The official harness, bridge and round files are vendored unchanged under `vendor/hub/lib/hub/`; relative module imports resolve there. The quiet verification wrapper serves the game and harness from one owned 127.0.0.1 origin on an OS-selected port and never records catalogue overrides.

## Engine patches

One game-wide patch was made to `vendor/engine/my-3d2dge.js`, in `Screen.resize` around line 690: when the viewport is smaller than a fixed logical buffer (`fit < 1`), the screen uses the fractional fit scale rather than clamping to scale 1. Larger-screen integer scaling and the existing fill behavior remain unchanged. This prevents the 960×720 game from being cropped on phone viewports and in narrow Hub frames. The untouched sparse-clone copy in `vendor/engine-repo/dist/handoff/my-3d2dge.js` preserves the reviewable upstream baseline. No networking or simulation rules were changed inside the engine; the Hub client and official checker/harness remain unmodified.

## Integration decisions

Standalone co-op is two simultaneous local players. Internet shared-world co-op is available when AI Hub supplies a session; the library supplies no standalone lobby/matchmaking service. The transport uses only `AIHub.send` while active. No media files, external realtime services or CDN runtime dependencies are required by the game adapter.
