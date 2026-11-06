# Pressure Buns

Good food. Great panic.

An original arcade cooking game inspired by Garry Kitchen's **Pressure Cooker** (Activision, 1983). Catch flying toppings, touch the right burger to stack them, catch its top bun, and serve the finished order at the matching numbered wrapper. Complete three shifts (12 orders), then open the after-hours kitchen.

## Play and share

Open the single `.html` file in the parent folder. The Three.js and Rapier runtime is bundled into it; no build server is needed. Google Fonts download when available, and Internet co-op loads PeerJS on demand. WebGPU is preferred; WebGL 2 is used when WebGPU is unavailable. For render diagnostics, append `?renderer=webgl`.

- **Controller:** left stick / D-pad to move; Cross / A to serve; Square / X to reject; Circle / B to dash; Options / Menu to pause. Settings changes PlayStation/Xbox glyphs. Menus use stick/D-pad and Cross / A, with Circle / B to go back. The room-code field has a pad-operated character wheel.
- **Keyboard:** WASD / arrows to move, E to serve, Q to reject, Space to dash, Escape to pause. Mouse click walks to the selected point and interacts on arrival; right click dashes toward it.
- **Touch:** drag on the left side to move. Catch and serve assistance activates automatically. A wrapper button appears when carrying a burger near a chute; a right-side tap also acts. Hold the right side to reject, or double-tap it while moving to dash.
- **Same-screen co-op:** press Cross / A on a second controller, or use I J K L + U to add a second cook (O rejects, P dashes).
- **Online co-op:** Cook together → Open a kitchen, then share the six-character code. A second browser joins it. Rooms use PeerJS/WebRTC over the Internet, with BroadcastChannel for tabs on the same device. Internet signaling and a real WebRTC data connection were tested here; arbitrary NAT/firewall traversal is unknown.
- **AI Hub:** Session Protocol v1, shared-world, 1–2 players; authority and timing belong to the host. The unmodified upstream client is the first head script. Dedicated playerless hosts, time-up, and departure are supported.

After ten idle seconds on the title, an AI demonstration starts and loops. Any input returns to the title.

## Developer kitchen

Pause → Developer kitchen. Live sliders control chef speed, belt speed, flying-food speed, launch interval and mistake cost. Buttons enable an AI cook, infinite spirit, spirit refill, next shift, and reset to defaults. The panel shows renderer, physics and animation diagnostics.

## Build and test

With Node 24 and the installed Python Playwright environment:

```sh
npm ci
npm run build
npm run --silent test
```

The test command prints failures, if any, and one total count. It combines gameplay and complete campaign simulation, browser/UI/input/audio/mobile tests, real two-page co-op, Internet WebRTC, WebKit fallback and the unmodified official AI Hub harness. Use `npm run --silent test -- --only core,coop,visual` to rerun only selected suites after a relevant change. Servers bind to OS-selected `127.0.0.1` ports and shut down afterward. Screenshots are optional: `npm run --silent test -- --screenshots`.

`exit-interview.json` is copied beside the deliverable and embedded into the in-game About screen. `research.md` records primary source research; `title-selection.json` records the real random selection from 50 brainstormed candidates. `THIRD-PARTY-NOTICES.txt` is also embedded in the HTML.

The headless software WebGPU canvas may be blank in screenshots despite correct game state. WebGL screenshots were used to inspect the art; Chromium WebGPU initialization and simulation were checked separately. Real hardware controller feel, real iOS, TV viewing, and subjective listening remain unknown.
