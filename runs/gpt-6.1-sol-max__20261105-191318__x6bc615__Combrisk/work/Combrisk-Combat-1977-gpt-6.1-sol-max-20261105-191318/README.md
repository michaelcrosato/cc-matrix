# Combrisk

An original paper-and-ink arena shooter inspired by **Combat (1977)**. The distributable is the single HTML file beside this folder. Open it directly in a current browser. All code, art, textures, physics WASM and engine code are embedded; playing offline needs no downloads.

## Play

- **Circuit:** four 75-second heats, each first to five points. Open tank duels, double-value bank shots, ghost tanks, then wrapping biplanes. A complete circuit takes about five minutes.
- **Couch duel:** two players share a screen. Select any arena on the Versus screen.
- **Link duel:** host creates an invitation; guest pastes it and sends back a reply; host pastes the reply. Connections use native WebRTC and public STUN, with no account or signalling server. No TURN relay is supplied, so some NAT/firewall combinations cannot connect.
- **AI Hub:** launch the file from a Hub session. Protocol v1 shared world, 1–4 seats, authoritative host, playerless server support, automatic ready, timed results, departure handling and no networking outside the Hub transport during sessions.

Left stick moves, right stick aims, R2/RT fires, L1/LB or Cross/A boosts. Keyboard: WASD + mouse, click/Space fires, Shift boosts, Escape pauses. Couch P2 uses arrows, IJKL, `/` and `.`. One pad controls P2 in couch mode; two pads control both. Touch uses contact-only invisible sticks, assisted aim/fire for one-thumb play, and a contextual boost button. Ghost couch duels hide both tanks equally between shots.

The title enters an AI-played attract loop after ten idle seconds; any input returns to the title. Settings save locally. Music defaults to 10%. Pause → Developer tools provides six live balance sliders, invincibility, AI freeze, slow motion, physics wireframes, healing, pickup spawning and heat skip/restart.

## Build and test

Exact dependencies are in `package-lock.json`. From this folder:

```sh
npm ci
npm run build
npm test --silent
```

`npm test --silent` uses the installed Playwright Python environment, opens its own loopback server on an OS-selected port, confirms the served title, and closes that server and its browsers. Output contains only failed checks and one count. JSON results are in `artifacts/test-results.json`. `npm test --silent -- --capture` also captures title, tank, air and phone compositions for visual review. Screenshots do not stand in for gameplay assertions.

The suite covers file-URL WebGPU startup, the WebGL fallback, Rapier collisions and swept ricochets, cover destruction, armour, respawn, all pickups, ghost visibility, aircraft/shot wrapping, a four-heat playthrough, dev controls, controller emulation, touch, Web Audio signal levels, two-page WebRTC and the supplied Hub conformance scenarios. Protocol stress checks can run without graphics using `?headless=1`; normal rendered Hub scenarios run separately with fresh GPU processes. `?renderer=webgl` forces Three's fallback for visual checking on software GPUs.

## Content and architecture

Edit `content/arenas.json` to author heat copy, vehicle rules, bounce limits and cover layouts. Every obstacle has `x`, `z`, `w`, `d` and `crate`; the same definition builds the visual mesh, physics collider and AI navigation obstacle. Courts are 36 × 24 world units, centred on the origin. Fixed perimeter walls and safe respawn points are supplied by the simulation. Rebuild to embed changes into the shareable HTML.

`src/game.js` owns simulation and scoring; `view.js` creates the procedural diorama and native Three AnimationMixers; `input.js` normalises pad, keyboard, mouse and touch; `audio.js` synthesises every sound; `network.js` contains host authority and transports; `ui.js` owns menus and HUD; `main.js` coordinates lifecycle. `build.mjs` bundles everything with esbuild, embeds the unmodified AI Hub client first in the head, and embeds the exit interview into About/Credits.

Three.js r180: MIT. Rapier 0.19.3: Apache-2.0. The supplied Hub integration files are preserved in `reference/`. No source game assets, external images, recorded audio or internet research were used. `title-selection.json` records the real cryptographic random draw among fifty brainstormed titles.
