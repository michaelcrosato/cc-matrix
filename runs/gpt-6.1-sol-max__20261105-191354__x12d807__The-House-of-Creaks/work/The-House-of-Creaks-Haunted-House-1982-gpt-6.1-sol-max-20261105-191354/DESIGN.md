# The House of Creaks

A complete, original haunted-house adventure inspired by Haunted House (1982), from native model knowledge. No source research. Title selected from 50 original candidates using Python's secrets.randbelow.

## Play
Explore six rooms on each of four floors in a fixed isometric cutaway. Strike short-lived matches to see objects. Recover a brass key, unlock the upper stair, carry three pieces of an ancestral urn back to the foyer, then leave. One carried object forces choices between a fragment and the protective scepter. Ghosts hunt light, bats extinguish matches, spiders shy from flame. Wind extinguishes exposed matches; holding Hush shelters one. Safe candles refill matches and restore one nerve per floor. Notes explain the house and reveal fragment locations. The paper map records exploration. Loss, victory, restart, save/continue, settings, input-aware prompts, touch assistance, kiosk replay, pause and live developer tools are complete flows.

## Presentation
Procedural geometry, flat cel lighting built with Three.js TSL, inverted-hull ink outlines, a floating architectural diorama, a moonlit teal/purple palette and amber matchlight. AnimationMixer clips animate eyes, bodies, wings, spider legs and haunted props. All sound is synthesized with Web Audio: chamber-like plucked music at 10% by default, spatial-feeling effects and formant gibberish voices.

## Architecture
- core.mjs: authoritative game state and Rapier 0.19.3 movement/collision; deterministic event system; serialization and room pathfinding.
- main.mjs: Three.js 0.180.0 WebGPURenderer, generated models, native animation, UI, audio, inputs and cooperative transports.
- template.html and style.css: a 10-foot menu and HUD, one layout for mouse/keyboard/controller, minimal touch HUD.
- build.py: embeds the unmodified AI Hub session 1.4.0 client and the game into the requested root HTML. Pinned CDN dependencies remain external.
- test.py: one quiet command for simulation, WebGPU browser input/audio/playthrough and AI Hub harness checks.

## Network
AI Hub shared-world protocol v1 for 1–4 players. The host owns simulation and broadcasts snapshots; guests send bounded input. Standalone offers same-browser rooms via BroadcastChannel and device-to-device WebRTC with manual invitation/answer codes. No broker is needed. A server-only Hub host has no character.

## Verification
Use Node assertions for physical movement, mechanics and a complete scripted run. Use the installed Python Playwright browser for real WebGPU, menus, virtual standard gamepad, touch, Web Audio levels, the entire game and two-device co-op. Run the supplied Hub harness under default, impaired network, host-leave and server-only-host scenarios. Use screenshots for the visual composition only. Tests print failures and one count. All servers use an OS-assigned loopback port and are stopped by PID.
