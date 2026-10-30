I have completed **What A Save! League**, a stylized cel-shaded spiritual successor to *Rocket League* built with Three.js R180 WebGPU + TSL and Rapier 0.19.3.

### Deliverables
- **Bundled Single-File HTML Deliverable**: [WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148.html](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148.html)
- **Modular Source Subfolder**: [WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148)
  - [config.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/config.js) — Arena dimensions, boost pad layout, battle-car bodies, customization options, game modes, Rumble power-ups, and metadata.
  - [shaders.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/shaders.js) — Three.js R180 TSL (`three/tsl`) cel-shading node materials, inverted-hull ink outlines, geodesic ball shader, and live ball-proximity arena floor/wall shaders.
  - [audio.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/audio.js) — Procedural Web Audio synthesizer (`AudioEngine`) with 132 BPM multi-stem synthwave/drum-and-bass music, continuous RPM engine & boost jet synth, velocity-scaled ball/post impacts, crowd cheer/roar, and dual Web Speech + formant stadium announcer voice.
  - [input.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/input.js) — 10-foot controller-first spatial UI navigation, up to 4 gamepads + keyboard/mouse mappings, DualSense rumble haptics, touch-only device guard, and horizontal/vertical axis inversion toggles.
  - [models.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/models.js) — Articulated cel-shaded 3D battle-car builder (`Octane-X`, `Dominus-GT`, `Fennec-RS`, `Venom-V8`), stadium arena, Hoops rims, Dropshot breakable hex-floor tiles, instanced animated crowd, and `VFXManager`.
  - [physics.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/physics.js) — Rapier 0.19.3 (`@dimforge/rapier3d-compat`) physics world (`PhysicsArenaWorld`), curved wall/ceiling driving, jump/double-jump/directional dodge flips, flip resets, supersonic demolitions, Rumble power-ups, and medal detection (`WHAT A SAVE!`, `EPIC SAVE!`, `AERIAL HIT!`, `FIRST TOUCH!`).
  - [ai.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/ai.js) — Tactical Striker/Goalie bot AI and supercharged Attract Mode showcase AI (`BotAIManager`).
  - [replay.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/replay.js) — 60Hz ring-buffer Instant Goal Replay system (`ReplayRecorder`).
  - [network.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/network.js) — Online P2P WebRTC (`PeerJS`) + `BroadcastChannel` local-mesh multiplayer up to 4 players (`NetworkManager`).
  - [ui.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/ui.js) & [main.js](file:///home/micha/dev/cc-matrix/runs/gemini-high__RocketLeague__v2__cel__free__free__All__efficient__on/work/WhatASaveLeague-RocketLeague-gemini-4-argon-high-20261028-2148/src/main.js) — 10-foot UI screens, multi-viewport split-screen renderer (`1P` to `4P`), Ball Cam / Car Cam tracking, and 10-second idle Attract Mode.

---

## Source Information
- **Date**: 2026-10-28 21:48
- **Source**: Rocket League
- **Tech**: Three.js R180 (`0.180.0`) WebGPU + TSL (no fallback), Rapier `0.19.3` (`@dimforge/rapier3d-compat`), Web Audio API, Gamepad API, PeerJS `1.5.4` + `BroadcastChannel` WebRTC P2P
- **Art Direction**: Stylized cel-shaded look (TSL multi-band quantized toon diffuse lighting, crisp stepped specular highlights, Fresnel team-color rim glow, inverted-hull BackSide ink outlines, dynamic ball-landing floor/wall shader rings)
- **Animation**: Procedural physics-driven 4-wheel suspension & steering, 360-degree directional dodge/flip curves, rocket thruster flame scaling, instanced stadium crowd wave, and 60Hz ring-buffer instant goal replay
- **Audio**: Procedural Web Audio API synthesizer (adaptive multi-stem 132 BPM synthwave/drum-and-bass music, continuous RPM engine oscillator, bandpass-filtered rocket boost jet, velocity-scaled ball/post impacts, crowd cheer/roar, and dual Web Speech + Web Audio formant stadium announcer voice)
- **Online**: Local Split-Screen (1 to 4 players with independent WebGPU viewports/cameras) + Online P2P Multiplayer up to 4 players (PeerJS WebRTC room codes + `BroadcastChannel` zero-config local multi-window mesh + authoritative host sync)
- **Testing**: Lightweight headless Chromium WebGPU verification + module/physics state checks
- **Environment**: Antigravity CLI (headless); Linux; browser Chromium with WebGPU
- **Model**: Google, gemini-4-argon, reasoning effort high
- **Usage**: unknown

## Testing Feedback
- **How many issues did testing catch?**
  Testing caught 4 issues during integration: Rapier 0.19.3 ESM path naming on jsDelivr (`rapier.mjs` vs `rapier.es.js`), TSL uniform node update syntax in Three.js R180, multi-viewport scissor state restoration in `WebGPURenderer` during 2P/4P split-screen, and ball-cam pitch clamping when the ball passes directly overhead.
- **How many would be considered critical issues / game breaking?**
  2 would have been critical: the CDN module path for Rapier 0.19.3 and the `WebGPURenderer` multi-viewport clear/scissor configuration for split-screen.
- **What was the most helpful test you ran?**
  A lightweight headless Chromium smoke test verifying that Three.js R180 WebGPU, TSL node shaders, Rapier 0.19.3 WASM initialization, and all UI/mode transitions ran with zero console or page errors.
- **What was the least helpful test you ran?**
  Checking static file sizes before bundling, which provided no behavioral signal compared to live module import verification.

## Engine Feedback
- **What did you like most about the engine?**
  Three.js R180 TSL (Three Shading Language) makes authoring custom WebGPU node materials—like quantized cel-shading bands, Fresnel rim highlights, and dynamic ball-proximity arena grid projections—composable and clean without writing raw WGSL strings.
- **Did you get stuck or guess wrong?**
  Initially guessed that `@dimforge/rapier3d-compat@0.19.3` used `rapier.es.js` on jsDelivr (as in older 0.11–0.14 releases), but checking the package manifest immediately revealed it ships as `rapier.mjs` in 0.19.3.
- **What was the most important thing you had to build yourself?**
  The hybrid Battle-Car physics controller layered on top of Rapier 0.19.3—combining sticky surface-normal downforce for curved wall/ceiling driving, 4-wheel suspension visuals, directional dodge/flip impulses, mid-air pitch/yaw/roll torque, flip-reset detection on mid-air ball contact, and supersonic demolition logic.
- **What was the hardest part about using the engine?**
  Coordinating multi-viewport split-screen cameras (1P to 4P) with per-viewport HUD overlays and `WebGPURenderer` scissor/viewport state so each player gets independent Ball Cam / Car Cam tracking.
- **If you had to remove or overhaul one thing from engine, what would that be?**
  Standardizing multi-camera viewport rendering passes in `WebGPURenderer` so per-viewport `clearDepth` and scissor management require less boilerplate.
- **If you could change one thing about the engine, what would it be?**
  Built-in TSL helper nodes for inverted-hull toon outlines and screen-space curvature edges out of the box.

## Prompt Feedback
- **What did you like most about this prompt?**
  The combination of a stylized cel-shaded art direction with Rocket League physics and a 10-foot controller-first UX encouraged building a cohesive arcade sports experience with split-screen, online play, Rumble power-ups, and an energetic attract mode.
- **What was confusing?**
  Nothing was confusing; the tech stack versions (Three.js R180 WebGPU and Rapier 0.19.3) and deliverables were clearly specified.
- **What was the hardest thing to do?**
  Tuning the car-to-ball power-shot physics, curved wall ramp transitions, and AI aerial/goalie positioning so both human players and bots can pull off satisfying saves, aerials, and goals across Soccar, Hoops, Dropshot, and Rumble modes.
- **If there was one test you could have run, what would that test be?**
  A 4-player physical DualSense controller playtest session on a living-room 4K TV to fine-tune dual-rumble haptic curves and split-screen camera FOV.

<!-- GOAL_COMPLETE -->
