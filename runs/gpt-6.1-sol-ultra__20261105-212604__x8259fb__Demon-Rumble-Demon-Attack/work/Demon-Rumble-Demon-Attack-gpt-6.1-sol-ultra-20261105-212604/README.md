# Demon Rumble

Open the single HTML file one directory above this folder in a current browser. It contains the engine, physics WASM, geometry, animation, audio and AI Hub client; no CDN download is needed. WebGPU is preferred, with a WebGL 2 fallback. Sound starts after the first input.

An original front-facing arcade shooter inspired by Demon Attack (1982). Six encounters introduce splitting demons, diving offspring, elite crossfire, forkfire and repair pickups, then a three-phase boss. Hull repairs between nights, chaining kills increases score, and co-op wingmates revive while a partner survives. Leaving the title idle for ten seconds starts a looping AI demonstration.

- Controller: stick/D-pad move, Cross/A fire, Circle/B dash, Square/X pulse, Options/Menu pause.
- Keyboard: A/D or arrows move, Space fire, Shift dash, E pulse, Esc pause.
- Mouse: move to steer, left click fire, right click pulse.
- Local player two: second pad, or J/L move, I fire, O dash, U pulse.
- Touch: drag to steer with automatic fire, second finger dash, contact Pulse button when ready.

Pause → Developer tools exposes live enemy tempo, projectile speed, player fire rate and damage sliders, plus invincibility, autopilot, clear wave, jump to boss, refill and reset. Settings include music (10% by default), effects/voices, PlayStation/Xbox glyphs and reduced motion.

AI Hub sessions support shared-world co-op for one to four players, including a dedicated server seat. The bundled, unmodified session client is version 1.4.0. Direct two-player WebRTC is available through Online Co-op: host shares an invitation, guest shares an answer, host pastes that answer. No accounts or broker are needed. Restrictive NAT compatibility is unknown because no TURN relay is configured.

## Development

Runtime: Three.js 0.180.0, Rapier 0.19.3, native Web Audio/Gamepad/WebRTC APIs. All models and audio are procedural. Wingbeats and engine flames use AnimationMixer clips; gameplay uses a fixed 60 Hz Rapier sensor world. Host snapshots are sent 12 times per second. No engine changes were made.

From this directory, `npm ci --ignore-scripts` installs the pinned build dependencies; `npm run build` writes the root HTML. `main.js` contains scene/combat/UI, `audio.js` the synthesizer, `network.js` the session adapter, `shell.html` the screens and `style.css` the visual styling. `exit-interview.json` is beside the delivered HTML and is embedded into About/Credits by the build.

Run all automated verification with one command:

```
node verify.mjs
```

It prints failures and one aggregate check count. It runs the real campaign, emulated controller/touch, local co-op, audio render, network protocol checks, two-page WebRTC and the AI Hub harness. Browsers and ephemeral loopback servers are closed after use. The test runner uses the machine's installed Playwright Python environment. `*-results.json` preserve structured evidence. Screenshots were used only for visual layout; the headless software WebGPU canvas can be blank, so WebGL 2 was used for visual inspection.

Source information and all testing, engine and prompt feedback are available in the in-game Credits and the root exit interview. Usage is added on import.
