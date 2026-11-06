# Jungle Zip

A four-act arcade platform adventure inspired by Jungle Hunt (1983).

Open `../Jungle-Zip-Jungle-Hunt-1983-gpt-6.1-sol-max-20261105-191409.html` directly in a current browser. Three.js r180, Rapier 0.19.3 and its WASM are bundled into the HTML. Only the optional Google Fonts use the network. The game prefers WebGPU and supports WebGL 2 through the same renderer.

## Play

- WASD / arrows or left stick: move and swim.
- Space / Cross / A: jump or release a vine; nearby gold rings catch automatically.
- F / E / left mouse / Square / X: swat; hold at the brass wheel to rescue Pip.
- S / Down / Circle / B: duck beneath high boulders.
- Escape / P / Options: pause. The pause menu includes the developer workshop.
- Touch: an invisible left thumb stick moves; tap the right half to jump or release. Swats and low-air swimming have assistance. The contextual button supports holding the rescue action.

Each act has a checkpoint. Vine catches advance the canopy checkpoint. Clearing an act restores one life. Fireflies, new vines, stuns and safe boulder passes score points. The final rescue earns a time and survival bonus. A harder expedition is available after victory. Ten idle seconds on the main menu start a looping AI expedition; any input returns to camp.

## Multiplayer

AI Hub Session Protocol v1 supports 1–4 independent ghost racers, synchronized start, progress, results, departures, time-up and end-of-round silence. The unmodified 1.4.0 session client is embedded first in the HTML head. The official harness files are in this directory.

Outside AI Hub, Ghost Expedition connects two browsers with native WebRTC: the host creates an invitation, the guest returns an answer, and the host starts both copies. The game uses STUN and no relay. Some restrictive networks cannot make a direct connection. Peers are visual ghosts and do not change local physics.

## Build and verify

```sh
npm run --silent build
npm run --silent test
```

The test runner starts its own HTTP server on an OS-assigned loopback port, confirms the game's identity, and closes its browser and server afterward. It prints only failures and a one-line count. Results, the normal-lives route, and AI Hub conformance reports are saved here. `--quick` runs the native GPU, rendering, core playthrough and metadata checks. `--screenshots` adds visual captures at 1920×1080 and an emulated phone size.

The runner uses the installed Python Playwright environment. Its software WebGPU flags include `--enable-unsafe-webgpu --enable-features=Vulkan --disable-vulkan-surface --use-angle=swiftshader --use-webgpu-adapter=swiftshader`. `--gpu-only` isolates the small native WebGPU control; `--gpu-flags` permits explicit browser configuration tests. Browsers are not downloaded.

The workshop exposes speed, jump strength, gravity, launch boost, hazard speed and air consumption as live sliders, with defaults, infinite supplies, autopilot, stage selection and checkpoint tools. `window.__jungleZip` exposes the same state plus deterministic `advance()` and `snapshot()` methods for the automated runner.

`credits.json` is the source for both the in-game About screen and the root `exit-interview.json`. Cost and token usage are recorded as “added on import.” No engine sources have been modified.

## Research

- Atari Jungle Hunt instruction manual: https://atarionline.org/wp-content/uploads/2021/11/jungle-hunt-1982-atari-2600-instructions-manual.pdf
- Reference screenshots: https://atariage.com/screenshot_page.php?SoftwareLabelID=256
- Sound and port comparison: https://frgcb.blogspot.com/2020/04/jungle-hunt-taito-1982.html
- AI Hub protocol: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

The title was selected from 50 original candidates using Node's cryptographic random integer generator (index 37, zero-based). All models, animation clips, music, effects and gibberish voices are original procedural work; no source-game assets are included.
