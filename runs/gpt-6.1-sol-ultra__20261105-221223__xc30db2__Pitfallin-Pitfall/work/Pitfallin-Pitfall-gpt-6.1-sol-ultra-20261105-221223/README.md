# Pitfallin’

A little danger. A lot of jungle.

Open the root deliverable `Pitfallin-Pitfall-gpt-6.1-sol-ultra-20261105-221223.html` directly in a modern browser. The release embeds the engine, physics WASM, game, artwork, music and Hub client; it requires no asset downloads or installation. WebGPU is primary, with automatic WebGL2 compatibility if unavailable, lost or stalled.

Find six sun relics before the eight-minute sunset, then reach the far camp. Three vine crossings, two crocodile pools, rolling logs, snakes, two underground routes, scorpions, bonus gold and checkpoint rescues form a complete expedition. A clean input-only test route finishes in about 90 simulated seconds; exploration and retries extend the play time.

- Move: A/D or arrows / left stick.
- Jump or release a vine: Space / Cross (A).
- Catch a nearby vine: E or right mouse button / Square (X).
- Climb ladders: W/S or arrows / stick up/down.
- Field map: M / Triangle (Y).
- Pause: Esc / Options. Developer camp is in the pause menu.
- Touch: drag the left half to move/climb, tap the right half to jump, use the context button near vines or ladders. Vine catches are assisted.

Idle on the title or its menus for ten seconds to watch an automated expedition; any input returns to the title. Settings persist locally; music starts at 10%. PlayStation and Xbox prompts follow the last input used. Developer camp provides live movement, jump, gravity, vine and hazard sliders, default reset, invincibility, flight, clock freeze, refill and camp warps.

Ghost expedition supports up to four players. Standalone nearby tabs share a room word through BroadcastChannel. For remote friends, make an invitation, have a friend accept it, then use their reply; repeat for up to three guests. Direct WebRTC uses a public STUN service and requires a network that permits a peer connection; no hosted signaling or TURN relay is supplied. AI Hub sessions use only the supplied, unmodified Session Protocol v1 client and the Hub transport.

## Development

`npm ci --ignore-scripts` installs pinned Three.js 0.180.0, Rapier compat 0.19.3 and esbuild 0.25.12. `npm run build` creates the self-contained HTML in this directory and the parent deliverable. `game.js` owns level data and simulation, `art.js` owns procedural geometry and native animation, `audio.js` owns synthesis, `online.js` owns network lifecycle, and `app.js` owns input and presentation. This separation supports adding level regions and encounter data without changing the renderer.

Run all checks with one quiet command:

```
npm run --silent test
```

The suite uses the workstation's installed Python Playwright and xvfb-run, prints only failures and one total, and closes its own browsers and ephemeral loopback servers. It covers physics, the entire input-only expedition, developer settings, gamepad menus, touch, audio signal metrics, attract mode, credits, native WebGPU initialization and device-loss recovery, nearby-tab networking, actual paired WebRTC and the AI Hub harness (two players and four players with latency/jitter/loss and host departure). Multi-page network checks use the compatibility renderer to isolate the software Vulkan driver. Hardware controllers, real mobile devices, remote NAT traversal and subjective listening are unknown.

Native WebGPU works in virtual X with Chromium flags `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader`. The supplied alternative `--use-webgpu-adapter=swiftshader` reproduced device loss even in a two-box diagnostic, so the game includes recovery rather than relying on that driver behavior.

Source information and the exit interview are embedded in About/Credits and in the root `exit-interview.json`. Usage is **added on import**.
