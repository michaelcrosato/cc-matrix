# Solar Stowaways

Open `../Solar-Stowaways-Solaris-gpt-6.1-sol-max-20261105-202402.html` directly in a modern browser. The file includes the game, Three.js r180, Rapier 0.19.3 and its WASM, styles, procedural artwork, audio synthesis and AI Hub client. No CDN or asset download is needed.

Play all five sorties: Breakwater patrol, Cinder pilot recovery, Quiet Anchorage refueling, Red Channel gate run, Last Light carrier assault. Read the tactical chart between sorties. A completed sortie saves a local checkpoint; a finished run ends with a scored debrief. The title starts a looping autopilot tour after ten idle seconds. Any input returns to the title.

- Fly: WASD / left stick. Aim: mouse / right stick.
- Fire: left click, Space / R2. Tractor and dock: E, right click / L2 or Cross.
- Pulse: Q / L1. Boost: Shift / R1. Chart: Tab / Triangle.
- Pause: Escape / Options. Controller menus use D-pad, Cross and Circle; Xbox glyphs are available in settings.
- Touch: invisible left steering stick and right aiming stick, assisted fire and aligned recovery, contextual tractor button.

The developer deck is in the pause menu. It contains live balance sliders, reset defaults, repair, invulnerability, autopilot, checkpoint retry, mission completion and sector teleport. Session play exposes read-only developer information.

AI Hub supports 1–4 players in ghost score races. The supplied unmodified client is embedded first in the HTML. Standalone wing races use two-player WebRTC: the lead creates a code, the guest joins with it and returns a code, the lead accepts the return code, then launches. Each ship runs its own campaign and sees its wingmate in matching sectors. Restrictive NAT connectivity without a relay is unknown. A standard STUN endpoint is configured; the game has no lobby service.

## Development

`npm run build` bundles the modules and root `exit-interview.json` into the root HTML. `design.md` describes the slice. `title-selection.json` records the real random draw from fifty privately brainstormed titles.

Run all automated checks with:

```sh
npm -s test
```

It prints failures and one final count. It starts its own localhost server on an OS-selected port, verifies the correct game file, uses at most one browser with multiple pages, and closes its server and browser on exit. Artifacts are in `test-artifacts/`. Tests include real-physics playthrough of every sortie, checkpoint and retry behavior, controls, heat, pulse, boost, balance sliders, procedural audio samples, gamepad emulation, multitouch, attract looping, two-page direct WebRTC, WebGPU readback and device recovery, and the official AI Hub harness (2 seats, 4 seats with latency/jitter/loss, 4 seats with host departure).

Headless Chromium on this workstation needs `--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=swiftshader --enable-unsafe-swiftshader --disable-vulkan-surface` for stable WebGPU readback. Headless WebGPU canvas screenshots can be blank, so GPU pixels are read back separately. Visual reviews use the same renderer with its WebGL2 backend (`?renderer=webgl`). The game selects WebGPU by default and recovers device loss with WebGL2. No engine source files were changed.

The original Atari game was recalled from native model knowledge; no internet research was used. The required Hub implementation and npm dependency code were downloaded. License texts are included in the final HTML and in `THIRD-PARTY-LICENSES.txt`.
