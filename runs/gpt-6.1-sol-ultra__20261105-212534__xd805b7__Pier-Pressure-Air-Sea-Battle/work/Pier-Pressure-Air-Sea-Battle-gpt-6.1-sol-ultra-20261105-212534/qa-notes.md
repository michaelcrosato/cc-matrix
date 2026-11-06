# Pier Pressure verification plan

The automated suite should be a single command, print only failures and its final count, and close all browsers/servers it starts. All deterministic game checks should inspect live game state, not screenshot pixels. Screenshots are reserved for layout/art review.

Coverage:

- Required renderer/physics load, reported versions, scene objects and steps.
- Title idle for 10 seconds enters a looping attract demo; first keyboard/controller/touch input returns to menu.
- Keyboard aiming/fire and specials create actual shots, Rapier steps and hit/score changes.
- Scripted playthrough follows every stage through a final result using real simulation.
- Defeat and retry, pause/resume without simulation drift.
- Controller standard mapping, menu focus, last-input prompts and PS/Xbox settings.
- Touch page with gesture input, assist and a reachable pause button.
- Dev controls change live balance values and reset to defaults.
- Music defaults to 10%; procedural sound produces samples, with mute/volume handling.
- Two-page multiplayer state propagation, guest input, host authority and disconnect.
- Credits contain required source/feedback/usage fields; root exit-interview JSON parses.

Runtime notes: the browser uses Chromium 153 with unsafe WebGPU/Vulkan/SwiftShader flags at file:// or a server bound to 127.0.0.1 on an OS-selected port. At most two pages and one browser are necessary. WebGPU screenshots may be blank even with a functioning live renderer, so state checks remain authoritative for execution.

## Final result

168 checks, 0 failures against the final root CDN HTML. Both file:// WebGPU and forced WebGL fallback load and play. Three upstream AI Hub scenarios pass (standard two-player, host departure, and dedicated server with player seat 0). The suite verifies native guest broadside routing, guest pause neutral input, persistent pause submenus, reconnect/retry roles, controller direction and menu navigation, right-stick scrolling, native portrait multitouch, input-dependent UI, three frame cadences, offline audio samples, and exit-interview schema.

At 0.01, 0.02 and 0.033-second frame cadences, one second produces exactly 60 physics steps and the same projectile height. A complete scripted circuit reaches victory through actual Rapier hits.

Final tested HTML SHA-256: `187ab744c9d5e6b72c39f03149571c4a3d6357ecb8da7694f5df5ab2dc15b025`. The suite asserts the artifact remains unchanged during the run. Full evidence is in qa-results.json; final visual review captures are in screenshots/final-{desktop,phone}-{title,game}.png. Screenshots use the renderer’s forced WebGL backend because the supplied headless environment can capture blank WebGPU canvases.
