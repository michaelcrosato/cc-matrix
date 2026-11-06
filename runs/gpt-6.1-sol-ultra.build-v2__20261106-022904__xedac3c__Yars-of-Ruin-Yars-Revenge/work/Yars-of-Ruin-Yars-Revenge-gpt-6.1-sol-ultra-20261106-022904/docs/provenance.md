# Pinned dependencies and provenance

- **my-3D2dge 0.89.1**: https://github.com/michaelcrosato/my-3d2dge ; imported commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. `vendor/engine/` is the imported `dist/handoff/`, copied locally for reproducible offline builds. Source starting point: the overhead SHOOTER kit. Game-specific simulation and authored bodies are separate code. Upstream engine edits: the small-screen fit patch documented below; the imported commit remains pinned and a pristine checkout is retained.
- **AI Hub Session Protocol 1, client 1.4.0**: https://github.com/michaelcrosato/ai-hub ; imported commit `35a1047f2067b2af3de3943f0fe452f39105d869`. `vendor/hub/` is the released `lib/hub/`, including pristine `session.js`, protocol README, bridge, round coordinator, harness, and example. `vendor/hub-upstream/scripts/hub-check.mjs` and `scripts/lib/hub-client.mjs` are the official orchestration/integrity references. The packager embeds `session.js` unmodified as the first script after charset.
- Browser testing: existing **Playwright 1.63.0** Python installation and downloaded browser executables, with no browser or system-library installation.
- There are no runtime npm, CDN, image, font, recorded audio, or server dependencies in the delivered standalone HTML. Online round transport is supplied only by AI Hub when embedded.

The full imported engine and its included documentation/license notices are retained in the development directory. Original game ownership and source research are acknowledged in `research.md`; reference-only publisher images/PDF are excluded from runtime packaging.

## Online implementation

The session adapter owns a fixed-step host timer independently of rendering. A dedicated host has no local avatar. Input vectors are quantized and validated; clients can submit only controls. Cannon edges carry monotonically increasing identifiers, repeat until acknowledged in host snapshots, and are deduplicated by the host. Stale movement expires after 600 ms. Host-local input traverses the same validation function. Cell topology and occupancy recover in periodic reliable keyframes; ordinary snapshots use compact arrays, a shield bitmask and plate offsets. Snapshot byte lengths and traffic are observable through the adapter diagnostics.

The hub owns pre-start cards, synchronized countdown, names/colors, fullscreen, results, host loss and hidden-host cancellation. A single guarded finish path handles victory, elimination and time-up. End stops the adapter timer, actions and sends and calls the presentation cleanup callback. Standalone has solo and local co-op; it does not invent matchmaking or an invite endpoint.

Completion snapshots include an outcome token. Every active client acknowledges that token in its existing input stream before the host submits results; a bounded two-second fallback stays inside the hub’s five-second time-up grace. This prevents the direct finish message overtaking the final network snapshot under latency. Simulation halts at the completed tick during this handoff. No host migration or game-owned hidden-tab cancellation is implemented: those remain hub decisions.

## Local engine patch

`vendor/engine/my-3d2dge.js` changes one sizing assignment in `Screen.resize`: fixed-resolution content may scale below1x when its buffer is larger than the physical canvas. Upstream clamps every scale to at least1, which produced negative letterbox offsets and cropped the fortress on a390px phone. The patched branch uses the actual fractional fit only below1x; normal desktop integer/fill scaling is unchanged. The exact diff is retained in `vendor/engine/small-screen-fit.patch`; the pinned `engine-upstream` checkout remains pristine. The phone browser test now asserts nonnegative offsets and that the entire buffer fits the canvas. No other engine changes.
