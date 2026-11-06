# Cosmic Creature Cruise

The deliverable is the HTML beside this directory. Open it directly in a modern browser. It contains the engine, physics WASM, networking client, all models and all procedural audio. Nothing downloads to play solo.

Three worlds, eighteen creatures, nine pairs. Defend the stationary ark from four directions, descend with its shuttle, collect two creatures at a time, and return them to the glowing dock. A solar surge forces departure if time runs out. Complete all three stops to reach home.

Keyboard: WASD / arrows aim or fly; Space fires / beams; E pulses; Shift boosts; R held at the dock departs early; Esc pauses. Mouse points and fires in orbit. Standard controllers use either stick to aim, left stick to fly, Cross / A for fire and beam, Circle / B for pulse, R2 / RT for boost, Triangle / Y for early departure, Options / Menu to pause. Touch drags anywhere to fly with automatic aim, fire, beam and full-stick boost; pulse and a dock-sensitive departure button stay available.

Pause → Developer mode exposes live balance sliders, invulnerability, autopilot, phase and planet skips, repair, pulse recharge, one-second stepping, and restart. Developer runs cannot change saved records. The title starts an AI demonstration after ten seconds with no input; any input returns to the title.

AI Hub uses the supplied unmodified session client in ghost mode for one to four captains. Standalone Fleet Play uses six-character PeerJS room codes; same-origin tabs also use BroadcastChannel. Remote WebRTC depends on the public PeerJS signaling service and each peer's network; remote NAT traversal is unknown in this environment. Same-browser rooms and actual AI Hub harness scenarios are tested.

## Development

```sh
npm ci
npm run build --silent
npm test --silent
# Rerun an affected check and consolidate its result:
npm test --silent -- --only phone
```

The test command prints only failures and one final count, writes `test-results.json`, starts an HTTP server bound to 127.0.0.1 on an OS-assigned port, and shuts down its own browser and server. It uses the installed Python Playwright environment. It covers the complete campaign without invincibility, deterministic scoring, real-time input and rescue, defeat, timeouts, audio samples, settings, developer tools, attract mode, standalone rooms and the official AI Hub harness, including four players with 150 ms latency, 50 ms jitter, 5% loss and host departure.

Native WebGPU is the default. Three.js's native WebGL 2 fallback also works. Add `?renderer=webgl` to select it for art inspection. WebGPU state is verified independently because its canvas is blank in this machine's headless screenshots. Retained `art-*.png` images inspect the fallback's rendering, TV layout and phone layout.

Source module responsibilities: `core.js` deterministic Rapier game rules; `visuals.js` Three.js procedural models and animation; `audio.js` Web Audio synthesis; `input.js` standard pad, keyboard, mouse and touch; `network.js` AI Hub and standalone transports; `app.js` menus and lifecycle; `shell.html` UI styles. `build.mjs` bundles these and the credits from `../exit-interview.json` into the single HTML.
