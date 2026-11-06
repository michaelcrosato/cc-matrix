# H.E.R.O. Blast Shift

Open the HTML in the parent directory to play. The release is a single self-contained file: Three.js r180, Rapier 0.19.3, the AI Hub client and the physics WASM are embedded. It makes no asset downloads. Direct WebRTC pairing optionally contacts a STUN server; AI Hub sessions use only the Hub transport.

## Build

`npm install --ignore-scripts`

`npm run build --silent`

Bun bundles the JavaScript. `build.mjs` embeds it and the unmodified Hub session client in `index.html`, writes the release HTML in the parent directory, and copies `metadata.json` to the adjacent `exit-interview.json`. All code-built art, sound, animation, UI and level data remain editable here.

## Test

`npm test --silent`

The command builds the release, starts its own loopback server on an OS-assigned port, and runs one Chromium browser. It prints only failures and one final count, writes `test-results.json`, and closes its browser and server. Python Playwright uses the workstation's existing pipx environment. Tests cover file:// WebGPU startup, native keyboard controls, standard gamepad input, controller menu focus and credits scrolling, pause and live dev tools, Rapier collisions, rotor power, lasers, timed charges, rescues, checkpoints, hazards, collectibles, an uncheated physical-input AI playthrough of all three sectors, game over, attract mode, native multitouch, Web Audio rendering, local-tab and direct WebRTC races, final results, rematches, disconnects, and all three official Hub ghost-race scenarios.

For visual inspection, append `?compat=1` to use the same WebGPURenderer through its WebGL2 backend. Headless software WebGPU can produce blank screenshots while the game and state continue normally. The primary backend is WebGPU. Native pipeline startup failures retire the failed device and scene, then rebuild through WebGL2; the game does not patch Three.js.

## Content and controls

`levels.js` holds all three authored sectors: solids, breakable bulkheads, hazards, miners, service pads, cave creatures, crystals, start and exit. Coordinates use X/Y as the playable plane and Z for visual depth. Rectangles use center coordinates. `art.js` builds the inked mine and native AnimationMixer clips; `audio.js` synthesizes all music, sounds and formant voices. `network.js` implements ghost races and standalone pairing.

Keyboard: A/D or arrows move, Space/W/up flies, mouse aims and fires (J also fires), E/right click drops a charge, Q scans, Esc/P opens the menu. Gamepad: left stick moves and flies, Cross/A flies, right stick aims, R2/RT or Square/X fires, R1/RB or Circle/B drops a charge, Triangle/Y scans, Options/Menu pauses. Right stick scrolls long menu panels. Touch: invisible left thumb flight stick; right thumb aims and fires; contextual charge button; automatic rescue and aiming assistance.

Dev mode is available from Pause. Flight speed, fuel drain, creature speed, blast radius, damage and gravity apply live. Refill, checkpoint return, sector rescue/skip, invulnerability, unlimited power and Rapier collision outlines are included. Gameplay changes mark a shift as training and exclude it from the personal best. Dev tools are disabled in Hub rounds.

The read-only `window.__game.state` and deterministic `tick()`/input hooks support headless checks. They are the same game systems used during normal play. The complete campaign test uses no teleportation, free fuel, invulnerability or direct rescue calls.

## Multiplayer

AI Hub supports 1–4 players through Session Protocol v1 in ghost mode. Each pilot has an independent cave and sees other pilots in the same sector. The Hub owns timing, transport, progress and results. Its original `session.js`, harness, bridge and round scripts are preserved here.

Outside the Hub, local tabs pair explicitly with BroadcastChannel. Direct two-device pairing uses real WebRTC offer/answer codes. STUN is provided, TURN is not; some restrictive networks require an AI Hub session. Physical gamepads, real touch hardware, real iOS, TV readability on an actual TV, and Internet NAT combinations are unknown; emulation and 1600×900 / 1280×720 screenshots are the available stand-ins.
