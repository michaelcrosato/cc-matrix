# Demon Encore

**Bad company. Good aim.** An original fixed-screen arcade shooter inspired by Demon Attack (1982).

Open the finished Demon-Encore-Demon-Attack-gpt-6.1-sol-max-20261105-191330.html in the parent directory. Everything is embedded, including Three.js, Rapier's WASM, the AI Hub client, models and audio synthesis. No server or downloads are needed for solo or couch play. A browser with WebGPU or WebGL 2 is required.

Seven encounters introduce swooping moths, splitting fiends, aimed artillery, diving enemies, two temporary weapons, repair pickups, grazing, score multipliers and a three-phase final boss. Three difficulties change hull, crossfire speed and score.

## Controls

| Action | PlayStation / standard pad | Keyboard / mouse | Touch |
| --- | --- | --- | --- |
| Move | Left stick / D-pad | A/D, arrows, or mouse position | Drag anywhere |
| Fire | R2 or Cross | Hold Space or left click | Automatic |
| Phase dash | R1 or Circle | Shift or right click | Two fingers |
| Encore | L1 or Square | E or X | Double tap / charged pop-up |
| Pause | Options | Escape or P | Menu button |
| Select / back | Cross / Circle | Enter / Escape | Tap |

Settings can switch to Xbox glyphs. Prompts follow the most recently used input. In couch co-op, Pilot 2 uses the second controller or J/L to move, I to fire, U to dash and O for Encore. Pilots share the score; a downed pilot returns at the next encounter while a teammate survives.

## Co-op

- **AI Hub:** 1–4 players in one host-authoritative shared world. The embedded, unmodified Session Protocol v1 client handles readiness, synchronized start, input/state transport, departures, time-up, standings and end. A host without a seat runs the simulation without a renderer or local input.
- **Couch:** two pilots on one screen, with two controllers or the keyboard mappings above.
- **Direct link:** two devices use a real WebRTC data channel. The host chooses Create Invitation and sends its capsule to the guest. The guest pastes it and sends a reply capsule back. The host pastes the reply; play begins when connected. Clipboard actions have a selectable-text fallback. STUN is used; reachability depends on the two networks. No signaling account or server is required.

The shared battlefield adapts to the narrowest connected display. Online menus leave the shared simulation running. AI Hub reserves Create+Options.

## Attract and developer tools

After ten idle seconds in the hangar menus, an invulnerable AI demonstrates every encounter and loops. Any input returns to the title. Active peer pairing and paused sorties retain their current screen.

Pause a standalone sortie and choose **Flight Lab**. Live sliders adjust demon speed, hostile bolt speed, fire rate, ship speed, shot damage and simulation time. Toggles enable invulnerability, AI piloting and collision outlines. Buttons advance encounters, charge Encore, deploy pickups and restore defaults. Lab-assisted runs do not set personal bests.

## Develop and test

Dependencies are pinned by package-lock.json. With Node 24 and the installed Python Playwright environment:

    npm ci
    npm run build
    npm test

The test command builds the deliverable, runs deterministic physics and a complete AI playthrough, then checks offline WebGPU startup, menus and controls, touch, gamepads, audio, WebRTC and the supplied Hub harness. It prints failures and one count line. Its server binds only to 127.0.0.1 on an OS-selected port and shuts down afterward. Browsers are closed after use.

The primary game and two-copy Hub tests use WebGPU. Visual captures and multi-copy stress checks use Three.js's WebGL 2 backend because software WebGPU here can produce blank screenshots and lose its GPU instance across multiple iframe lifetimes. WebKit checks automatic fallback. Physical controllers, actual mobile/TV hardware, human listening and WAN NAT traversal are unknown.

Inspectable results are in artifacts/test-results.json; artifacts/test-progress.json updates during a run. Composition captures include title.png, game.png, boss.png, phone-title.png and phone-game.png.

## Files and credits

- src/game.js: fixed-step Rapier simulation, encounters, abilities, scoring and snapshots.
- src/view.js: Three.js TSL cel shading, procedural geometry, native animation and effects.
- src/audio.js: synthesized music, effects and gibberish.
- src/input.js, src/ui.js, src/network.js, src/main.js: input, menus, networking and lifecycle.
- feedback.json: source information, exit interview and AI Hub catalogue card; embedded in About/Credits and copied to the parent exit-interview.json.
- vendor/hub/: supplied AI Hub integration and automatic conformance harness.
- selection.json: title and cryptographic random-selection method.

Three.js r180: MIT. Rapier 0.19.3: Apache-2.0. AI Hub: supplied Session Protocol v1 client 1.4.0. Original game assets were not copied. Source research used native model knowledge; the supplied integration protocol and pinned package source were read for implementation.
