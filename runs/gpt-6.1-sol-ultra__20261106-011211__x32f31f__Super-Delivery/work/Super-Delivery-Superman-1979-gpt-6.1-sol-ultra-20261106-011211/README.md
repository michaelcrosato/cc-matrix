# Super Delivery

A complete, original city rescue adventure inspired by **Superman (Atari 2600, 1979)**. Recover three bridge sections, fly six gang members to jail, rescue two citizens, avoid the power-draining satellites, change back into a reporter, use the subway and file the story.

Open the sibling `Super-Delivery-Superman-1979-gpt-6.1-sol-ultra-20261106-011211.html` in a current WebGPU-capable browser. The game is bundled into this single file; no server or build step is required. Optional web fonts can download when connected. Three.js WebGPURenderer can fall back to WebGL2 on browsers without WebGPU. On HTTP, use localhost or HTTPS for WebGPU.

- **Keyboard:** WASD move, Space fly/climb, Ctrl descend/land, Shift boost, E lift/use/set down, Q X-ray pulse, Esc pause. Right-drag orbits; wheel zooms; click nearby objects to use them.
- **Gamepad:** left stick move, right stick orbit/zoom, Cross/A climb, Circle/B descend, Square/X lift/use, Triangle/Y scan, R2/RT boost, Options/Menu pause. Menu focus works with the D-pad or left stick; Cross/A selects; Circle/B returns. Switch PlayStation/Xbox glyphs in Settings.
- **Touch:** invisible left movement stick, right vertical drag for flight, context action and flight buttons. Pickups and deliveries are assisted.
- **Developer mode:** Pause → Developer Tools. Live balance sliders, unlimited power, hazard freeze, collision bypass, marker toggle, target warp, recharge, objective completion, one-second step, defaults and mission reset.
- **Attract mode:** starts after ten idle seconds on the cover. Any input returns to the cover.
- **Co-op:** two players share objectives. AI Hub Session Protocol v1 integration is included. Standalone direct WebRTC uses invitation/reply codes and public STUN; availability across networks that require TURN is unknown. No remote service is deployed.

## Development

`npm install --ignore-scripts` installs the exact Three.js r180 and Rapier 0.19.3 dependencies. `npm run build` produces the sibling single-file HTML. `npm test --silent` runs the unified suite, printing only failures and a final count. The runner starts/stops its own ephemeral localhost server and browser instances.

`main.js` owns mission, input, physics, screens and host-authoritative replication. `world.js` owns the procedural city, cel materials, models and native animation clips. `audio.js` owns code-generated music, effects and voices. `network.js` adapts direct WebRTC and the official unmodified `hub-session.js`. `credits.json` supplies the in-game About screen and the root exit interview.

## Research

- [Original Atari manual](https://www.atariage.com/2600/manuals_old/superman.html): bridge repair, six crooks, carry-and-deliver interactions, power-draining satellites, Lois recovery, booth transformation, subway shortcuts, X-ray vision, reporter finish and timed completion.
- [AtariAge original screenshots](https://www.atariage.com/screenshot_page.php?SoftwareLabelID=533): simple skyline silhouettes, saturated blocks and readable landmark staging. The original sound descriptions informed short synthesized feedback and flight wind; exact original waveforms are unknown. The new score and gibberish voices are original.
- [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub): Session Protocol v1, shared-world metadata, ready/countdown, host state replication, result reporting and official harness.
- [Three.js r180 source](https://github.com/mrdoob/three.js/tree/r180) and [Rapier documentation](https://rapier.rs/docs/user_guides/javascript/rigid_body_creation_and_insertion/): WebGPU/node materials, animation, kinematic bodies and character movement.

Research notes for multiplayer are in `network-research.md`. The random title draw is recorded in `title-selection.json`; the selection used `secrets.randbelow(50)`.

The test browser uses additional ANGLE/SwiftShader flags to keep WebGPU stable on this WSL host. GPU canvas pixels are absent in screenshots on this machine, so real WebGPU rendering is verified through draw counters and driver diagnostics; visual screenshots use Three.js’s WebGL2 fallback. The shipped game requests WebGPU first and automatically recovers to WebGL2 if a device is lost.
