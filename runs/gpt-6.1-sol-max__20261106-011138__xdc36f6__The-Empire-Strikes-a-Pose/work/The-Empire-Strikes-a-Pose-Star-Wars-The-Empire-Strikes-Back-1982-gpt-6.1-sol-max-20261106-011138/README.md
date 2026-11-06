# The Empire Strikes a Pose

An original, unofficial snow-battle flight comic inspired by the 1982 game. Three.js r180, WebGPU, Rapier 0.19.3. All art, animation, music, effects and gibberish voices are procedural. The root HTML embeds every runtime dependency and can be opened directly with `file://`.

The deliverable is `../The-Empire-Strikes-a-Pose-Star-Wars-The-Empire-Strikes-Back-1982-gpt-6.1-sol-max-20261106-011138.html`. The exit interview is beside it and is also embedded into About & credits.

## Play

Clear three scouts, use tow lines to topple two walkers, then escort Ark and defeat Blackfin. Keep within 145 metres of the transport. A full AI sortie takes about two minutes; a first human sortie is expected to take longer (human timing unknown).

- Keyboard/mouse: WASD steer and throttle, mouse aims, left click fires, Shift boosts, S brakes, Space launches/releases a cable, Q changes target, C changes camera, Escape pauses. J also fires.
- Standard gamepad: left stick steers and throttles; right stick aims; R2/RT fires; L2/LT boosts; R1/RB brakes; Cross/A tows; Square/X changes target; Triangle/Y changes camera; Options/Menu pauses. D-pad or stick navigates menus, Cross/A selects and Circle/B returns. Xbox labels are available in Settings.
- Touch: invisible left drag steers/throttles; right drag aims/fires. Cannons assist automatically. A context-sensitive tow button appears beside walkers. Multitouch is supported.

Continuous fire overheats the cannons. Cyan repair buoys restore hull and cool the weapons. While tethered, steer to change orbit radius; boost adds speed and tension. Two wraps topple a walker. The camera widens during cable flight.

Pause → Developer tools exposes live speed, turn rate, weapon damage, incoming damage, enemy pressure, wraps and simulation rate; plus reset, invulnerability, AI pilot, collision shapes, repair, frame step, spawn and chapter tools.

Title idle for ten seconds starts a looping, invulnerable AI demo. Any input returns to the title without launching a run.

## Multiplayer

AI Hub Session Protocol v1, ghost mode, 1–4 seats. Each player has their own world and competes by sortie score. Wing craft are visible in the same mission chapter but cannot collide. The unmodified session client is embedded first in the head. Session startup, seeding, progress, ghost state, time-up result, leave and end behavior follow the supplied contract.

Standalone has same-origin BroadcastChannel rooms for up to four pilots, and a two-player serverless WebRTC invite/answer exchange. The direct link uses host ICE candidates without a public signaling or relay service; use a same-network or directly reachable connection. Internet NAT traversal is unknown. AI Hub manages internet sessions. The Wing link screen includes complete pairing instructions and error messages.

## Build and test

From this directory:

```sh
npm install --ignore-scripts
npm run build
npm run --silent test
```

The test command prints only failures and one count. It uses the installed Python Playwright environment and Chromium, starts its own loopback HTTP server on an OS-assigned port, verifies the served game identity, closes its own pages/browser and stops its own server. It saves JSON reports and visual-only captures in `test-artifacts/`.

The suite covers direct-file startup, embedded script parsing, versions, full combat/tow/escort/ace victory, heat, repair, failures, pause and live balance tools, gamepad stubs, touch contacts, attract looping, live/offline audio, both standalone transports, and the official Hub harness in normal, loss/jitter and host-departure cases. WebGPU canvas capture is blank in this headless setup; visual captures use the engine's WebGL backend. Actual hardware/controller/touch/TV and audible listening review remain unknown.

`?test=1` exposes deterministic simulation hooks on `window.__POSE__`; the normal page exposes only state and audio diagnostics. `?renderer=webgl` explicitly selects the built-in fallback. `?manual=1` disables the animation clock for test driving.

## Extend the slice

`src/mission.js` contains chapter titles, briefing lines, spawn positions, repair placements and default balance. `src/art.js` builds the world and animated machines. `src/game.js` owns simulation, physics and progression; `src/ui.js`, `src/audio.js` and `src/network.js` handle their respective systems. `build.mjs` embeds all code, metadata and third-party license texts into the root HTML. The original Hub client and harness are retained beside the sources.

Source research: none. The explicitly requested AI Hub contract/client/harness and pinned package dependencies were downloaded without web searching. The random title draw used Python `secrets.randbelow(50)`; its result is recorded in `title-selection.json`.
