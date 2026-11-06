# Research before implementation

- Original *Chopper Command* instructions, Activision (1982): https://atarionline.org/wp-content/uploads/2021/11/chopper-command-1982-activision-atari-2600-manual.pdf
  - Bidirectional helicopter flight, desert convoy defense, unlimited cannon, long-range scanner, twelve attackers and twelve trucks per wave, ten increasing speeds, splitting missiles, reserve craft and convoy bonuses.
  - Screen diagram establishes the orange desert / sky, ground-level trucks, horizontal profile aircraft and scanner strip.
- Frank Tetro Jr., “Defending the Convoy!”, *Electronic Games*, November 1982, page 86: https://vtda.org/pubs/Electronic_Games%28Reese%29/Electronic_Games_Issue_09_Vol_01_09_1982_Nov.pdf
  - Vertical three-aircraft formations, strafing, the scanner's tactical importance and split-warhead danger.
- Contemporary/source gameplay and sound descriptions found through source research. No original audio file is used. Exact Atari sound synthesis and an original soundtrack could not be independently confirmed: unknown.
- Three.js pinned 0.180.0 package source, particularly MeshToonNodeMaterial, WebGPURenderer, native AnimationMixer and render-target readback.
  - https://threejs.org/docs/
- Rapier pinned 0.19.3 package API declarations and official collision documentation:
  - https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection_js/
  - Sensor collision groups, collision events, CCD, locked plane motion and physical debris.
- AI Hub Session Protocol v1:
  - https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
  - README.md, session.js, bridge.js, round.js and harness.html copied unmodified into this research folder for implementation and local conformance tests.

The title was selected from fifty candidates using node:crypto.randomInt(50); the selected index and title are recorded in title-selection.json. The game uses original procedural artwork, synthesis and code. No source sprites, ROM or sounds are used.
