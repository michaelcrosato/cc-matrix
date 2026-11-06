# Grit Bros

Open the HTML one directory above this folder. It contains the engine, physics WASM, game, procedural art and audio, and AI Hub client. No server, CDN or asset downloads are needed for solo and couch co-op.

Five shifts introduce beetles, armored crabs, a timed token scramble, slippery platforms with fast fireflies, and the Big Clog boss. Bump platforms from below, walk into flipped pests to kick them, and collect brass tokens. Screen edges wrap. Bump the BOP box or use an emergency thump to flip grounded pests throughout the room.

Keyboard: A/D or arrows move, Space/W/Up jump, E/X thump, Esc/P pause. Enter adds a second local player. P2: J/L, I, O. Standard controller: left stick/D-pad, Cross/A jump, Square/X thump, Options pause. A second pad can join. Touch: drag the left half to move, tap/hold the right half to hop; the contextual THUMP circle triggers the emergency action.

The pause menu includes live balance sliders, safety boots, replenishment, enemy spawn, phase skip and reset defaults. The title enters a looping AI demo after ten seconds; any input exits it.

Remote-device co-op uses AI Hub Session Protocol v1. Standalone couch co-op works immediately. Multiplayer → Host a tab room connects two same-origin tabs in the same browser; it does not claim to connect different devices.

From this directory:

```sh
npm run build
node test.mjs
```

`node test.mjs` (also available as `npm test --silent`) runs all suites sequentially, prints only failures and a final count, and closes its browsers and OS-selected loopback servers. It uses the workstation's existing Playwright Python environment. Tests cover native WebGPU, real Rapier physics, all five campaign shifts, synthesized audio, keyboard, emulated standard pads, multitouch, menus, same-origin co-op and the upstream AI Hub harness with latency/jitter/loss. Use `python capture.py` with the Playwright interpreter for optional visual captures; its WebGL2 backend is only a visual QA aid.

Build dependencies are pinned in package-lock.json. Runtime: Three.js R180 (MIT), Rapier 2D compat 0.19.3 (Apache-2.0), and the unmodified AI Hub session 1.4.0 client. No engine source was modified.
