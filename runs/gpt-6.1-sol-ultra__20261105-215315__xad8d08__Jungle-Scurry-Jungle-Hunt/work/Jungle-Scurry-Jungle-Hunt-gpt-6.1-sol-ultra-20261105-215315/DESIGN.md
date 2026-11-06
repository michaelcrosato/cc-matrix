# Jungle Scurry

A four-chapter 2.5D arcade adventure inspired by Jungle Hunt (1983). A safari courier crosses the canopy, dives through a crocodile river, climbs a tumbling hillside and rings three Sunbells to release Professor Pip's snagged survey balloon. Original characters, procedural geometry and music.

## Play
- Move: WASD / arrows / left stick. Space / Cross: jump, release a vine. E / Square: knife in river, ring a nearby bell. S / Circle: duck on land, dive in water. Escape / Options: pause.
- Vines catch automatically when a courier reaches the end; pump with movement and release on the upswing. Water movement is free in two axes; oxygen refills at the surface and air pockets. Crocodiles can be stunned with the knife. Jump small boulders; duck beneath high ones. Ring three bells in the rescue clearing.
- Four chapters with checkpoints, hidden fruit, a scored results screen and a replay. Complete co-op route with shared stage progress and individual movement. Multiplayer via AI Hub, local room, or manual WebRTC pairing.
- Controller first focus, changeable PlayStation/Xbox glyphs, keyboard/mouse, touch movement with contextual action, settings, pause, tuning, credits.

## Deliverable
Bundled self-contained HTML, Three.js r180 WebGPURenderer with WebGL2 fallback, Rapier 0.19.3 WASM embedded, native AnimationMixer, generated Web Audio. No external art or audio files. The AI Hub session bootstrap is embedded unmodified before game code.

## Validation
One command builds and drives the game in headless Chromium. Tests exercise full route, mechanics, menu navigation, gamepad emulation, touch, Web Audio rendering, attract mode, physics and AI Hub/standalone multiplayer. Screenshots are for composition only.
