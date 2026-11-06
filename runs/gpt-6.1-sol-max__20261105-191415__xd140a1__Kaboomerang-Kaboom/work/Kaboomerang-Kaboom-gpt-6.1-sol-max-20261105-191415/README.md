# Kaboomerang

A little splash. A lot of nerve.

Open `../Kaboomerang-Kaboom-gpt-6.1-sol-max-20261105-191415.html` directly in a modern browser. The engine, physics WASM, network client, art and audio are included in that single file. Solo and local play work offline. Standalone cross-device rooms need internet access to PeerJS signaling and a network that permits WebRTC; AI Hub sessions use only the Hub transport.

The eight-round shift introduces sweeping patterns, returning orange bombs, splashback, wind and gold refills. Finishing unlocks endless Overtime. A ten-second title idle starts a looping autoplay demonstration. The pause menu includes instructions, settings, credits and live developer controls.

Controls:

- Move: left stick, D-pad, A/D, arrows, mouse or touch drag.
- Splashback: Cross / A, Space, mouse click, touch tap or the touch splash button.
- Pause: Options / Escape. Create + Options remains reserved for AI Hub.
- Local second player: J/L and I, or a second standard controller.
- Menus: D-pad / left stick, arrows, Enter / Cross / A; Circle / B / Escape returns. Hover moves focus.

Local co-op has two players. Standalone room-code co-op and AI Hub shared-world sessions support up to four. Lives and score are shared, with a separate splash meter for each player. The host simulates Rapier physics and sends snapshots; guests send inputs. Room codes are six characters. The public signaling service is used only for standalone rooms. A custom PeerServer can be selected with `?peer-server=http://127.0.0.1:PORT/kaboom`.

Three.js r180's WebGPURenderer prefers WebGPU. Its WebGL 2 backend supports browsers without WebGPU, explicit `?webgl=1` visual inspection, and software-rendered AI Hub frames where multi-device WebGPU is unreliable. Hardware Hub adapters continue to use WebGPU. The renderer also falls back if initial GPU preparation fails or stalls.

From this folder, run the entire check with one command:

```sh
node test.mjs
```

The command rebuilds the single HTML, starts only its own loopback servers on OS-assigned ports, and runs deterministic simulation tests, a complete campaign, keyboard/mouse/controller/touch checks, offline audio rendering, local co-op, BroadcastChannel rooms, genuine WebRTC between isolated contexts, direct-file deployment and the official AI Hub harness. It prints failures and a one-line count. Browser windows are headless and all owned servers and browsers are closed. Reports and visual-inspection screenshots are saved in `test-artifacts/`.

The Hub protocol scenarios use `?headless=1`, retaining the native Three.js scene, animation and Rapier world while bypassing GPU submission. This separates protocol deadlines from software-rasterization timing; rendering performance is outside scope. Dedicated server copies automatically use this path. The scenarios include two players, four players with 150 ms latency / 50 ms jitter / 5% packet loss, host departure, and a dedicated host with no player. The renderer's submitted geometry is checked under WebGPU; screenshots use WebGL because this machine's software WebGPU screenshots can be blank.

Rebuild without testing:

```sh
node build.mjs
```

The original source manual and research references, source information and exit interview are in the in-game About & Credits screen and `../exit-interview.json`. The title was selected from fifty candidates with Node's cryptographic random-number generator; the draw is recorded in `title-draw.json`.
