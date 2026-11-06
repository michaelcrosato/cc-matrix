# Ka-Whoosh!

An original arcade reflex game inspired by Kaboom! (1981). Fixed orthographic side view of an ink-outlined, cel-shaded rooftop diorama. Keep three stacked water tubs underneath a masked rooftop mischief-maker. Six waves teach bomb catching, centered catches, combo multipliers, gold bonuses, crosswind, paired drops, rush bombs and an emergency douse. Losing a bomb removes one tub; clearing stages restores one. A complete shift ends with results, statistics and a replay option.

## Systems
- Three.js r180 WebGPURenderer with WebGL2 compatibility backend; MeshToonNodeMaterial and inverted ink hulls. Procedural geometry, native AnimationMixer clips.
- Rapier 0.19.3 dynamic bomb rigid bodies, kinematic bucket sensors, collision events, gravity, wind forces and debris.
- Native Web Audio synthesis for jaunty music (default 10%), water, impacts and formant gibberish voices.
- Controller-first shared menus, mouse tracking, keyboard, touch with assist, standard Gamepad API, PlayStation/Xbox prompts.
- Solo, shared local two-player brigade, independent online score race. AI Hub ghost protocol v1; standalone WebRTC manual pairing. No game server.
- Attract replay after 10 seconds on title/menu, interrupted by input. Pause, accessible settings, saved records, credits and live developer controls.
- Build all source and dependencies into one self-contained HTML in the workspace root.
- One-command scripted suite: engine initialization, deterministic full-shift playthrough, scoring and losses, douse and gold, pause/dev/settings, controls including emulated gamepad/touch, synthesized audio, standalone two-page network, AI Hub harness scenarios. Screenshots for visual inspection only.
