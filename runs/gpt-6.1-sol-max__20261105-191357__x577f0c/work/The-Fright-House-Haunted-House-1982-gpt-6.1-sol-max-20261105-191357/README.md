# The Fright House

A complete original matchlight adventure inspired by Haunted House (Atari, 1982).

Open the HTML file in the parent folder. It contains the engine, physics WASM, artwork, animation, music and sounds. Solo play works from file:// without an internet connection. Internet room-code races need a connection to the public PeerJS signaling service; same-browser races also work over BroadcastChannel. AI Hub networking uses only the supplied session client.

## Controls

- Standard controller: left stick move, Cross interact, Square match, Circle drop, Triangle map, R2 hurry, Options pause. Xbox glyphs are available in Settings.
- Keyboard: WASD / arrows, E interact, Space match, Q drop, Tab map, Shift hurry, Esc pause.
- Mouse: click the floor / objects to walk and interact; right-click to strike a match. Hover changes menu focus.
- Touch: drag anywhere on the left to move; tap the right for a match / available action. Matches and nearby interactions are assisted. The menu button opens the same pause and map screens.

Find the key in the Cloakroom. Unlock doors for good. Carry only one object: a master key, a protective scepter, or the urn. Join three urn pieces and return to the front door on Floor 1. The ghost follows after the urn is disturbed. The scepter repels all creatures except the Nightmare ghost. There are nine chances, four floors and 24 authored rooms.

Attract mode begins after ten seconds on an idle title menu. Any input returns to the title. Developer tools are in the pause menu, with live balance sliders, reset, invulnerability, no-clip, reveal, resident freeze, AI tour, item / nerve restoration and room jumps.

## Development

`npm install` followed by `bun run build` rebuilds the release HTML in the parent folder and the identical development copy game.html. It also exports exit-interview.json next to the release.

`./test` is the one-command verification entry point. It prints failures and one final count. Use `--visual` for TV / landscape / portrait visual review, `--gl` for the WebGL 2 visual stand-in, `--smoke` for startup, `--model` for deterministic mechanics and the whole escape, or `--internet` for the actual WebRTC test only. Tests bind a private 127.0.0.1 server on an OS-selected port and close it on exit. Their artifacts and JSON reports are under tests/artifacts.

The native WebGPU backend is tested for initialization, draw submission and validation errors. The software adapter's headless presentation can produce blank / corrupt screenshots. WebGL 2 is used to judge composition and legibility. Tests can freeze scene drawing while exercising input, physics and the network lifecycle; production drawing is enabled normally. Physical controllers, actual iOS Safari, a physical TV and distinct-network NAT behavior are unknown.

The official, unmodified AI Hub 1.4.0 client is the first script in the HTML head. Its harness passes normal two-player, four-player latency / jitter / packet loss, and host-departure scenarios. Standalone tests pair two pages using BroadcastChannel, then pair two pages through real public PeerJS signaling and WebRTC with BroadcastChannel disabled.

## Designer data and importing

Room names, themes, palettes, links, furniture placement, item locations, enemy rosters, flavor text and tutorial pages are in data.js. Model rules are in model.js; procedural assets and native clips are in view.js; Web Audio is in audio.js; menus / controls / networking have their own modules.

The editable `game-metadata` JSON block in the release HTML is the source for the About screen. An importer can update usage there without rebuilding. Its initial usage value is exactly `added on import`. credits.json is the development source, exported as exit-interview.json. Dependencies and their licenses are embedded in the release and listed in THIRD-PARTY-NOTICES.txt.

## Research

- [Atari's original-game description and variations](https://atari.com/pages/hauntedhouse)
- [Original Atari instruction manual](https://www.retrogames.cz/manualy/Atari2600/Atari2600HauntedHouse.pdf)
- [AI Hub Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub)
- [Three.js WebGPURenderer documentation](https://threejs.org/docs/pages/WebGPURenderer.html)
- [Rapier character controller documentation](https://rapier.rs/docs/user_guides/javascript/character_controller/)

The real random title draw is recorded in title-draw.json. Work planning is in PLAN.md; the prompt supplied no plan file. ISSUES.md records testing and review fixes.
