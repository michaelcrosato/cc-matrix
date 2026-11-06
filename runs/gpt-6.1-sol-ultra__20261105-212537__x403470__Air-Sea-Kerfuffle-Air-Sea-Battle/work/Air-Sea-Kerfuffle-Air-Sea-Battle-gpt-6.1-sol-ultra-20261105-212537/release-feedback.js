const releaseFeedback = {
  "sourceInformation": {
    "date": "2026-11-05 21:25:37",
    "source": "Air-Sea Battle (Atari, 1977)",
    "plan": "none",
    "genre": "Arcade artillery shooter",
    "perspective": "Fixed side view of a 3D coastal diorama",
    "tech": "Three.js 0.180.0 (r180), WebGPURenderer and TSL with automatic WebGL2 fallback; Rapier 0.19.3; Gamepad API; Web Audio API; AI Hub Session Protocol v1, client 1.4.0; PeerJS 1.5.5; HTML, CSS and JavaScript.",
    "artDirection": "Procedural cel-shaded coastal miniatures, navy ink outlines, peach sky, teal sea and paper grain. All geometry is original and generated in code.",
    "animation": "Three.js AnimationMixer and keyframe clips for propellers, rotors, cannon recoil, flags, buoys and birds, with procedural flight, waves and combat effects.",
    "audio": "Code-written surf march at 10% music volume by default, synthesized cannon/explosion/sea effects and Animalese-style gibberish radio. No audio files. Exact original source waveforms: unknown.",
    "online": "1–2 player host-authoritative co-op through AI Hub or standalone six-character PeerJS rooms. Local co-op with shared coast integrity and individual scores. Public signalling availability and restrictive NAT behaviour elsewhere: unknown.",
    "testing": "Headless automated full patrol, keyboard/mouse, two emulated standard gamepads, local co-op, Pixel 7 touch/multitouch, native WebGPU and WebGL2 fallback, four official Hub harness scenarios, real two-page standalone multiplayer and offline rendered audio. Screenshots used for visual review. No physical controller, real phone, listener or second human.",
    "research": "Original Atari Air-Sea Battle manual at https://www.atariage.com/2600/manuals_old/air_sea_battle.html; Atari catalogue/scans and source research documented in source-research.md; AI Hub protocol, client, shared-world example and official harness at https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub. Confirmed 27 variations, six mode families, 136-second timer, target values, guided shots and blocking blimps/mines.",
    "environment": "Codex CLI (headless); Linux (Ubuntu on WSL2)",
    "model": "OpenAI, gpt-6.1-sol, reasoning effort ultra",
    "usage": "added on import"
  },
  "testingFeedback": [
    "Testing caught three product issues: a Rapier lifecycle crash, a portrait ocean gap and targets drawn too small in portrait. Code review also corrected online action latching, aim origin, lobby inactivity and end-state handling. All were fixed.",
    "One was game breaking: the Rapier 0.19.3 world trapped during rapid collider creation/removal in a full patrol. Reusing pooled bodies resolved it.",
    "The complete default 136-second patrol simulation was most helpful. It exposed the physics crash and then verified all four phases, both weapons, broadsides, real Rapier hits and a flagship victory.",
    "Headless WebGPU screenshots were least helpful because the canvas was blank on this workstation. Native WebGPU state checks and WebGL2 fallback visual captures provided the required evidence."
  ],
  "engineFeedback": [
    "Three.js TSL cel materials and native AnimationMixer clips worked across WebGPU and the WebGL2 fallback.",
    "Rapier 0.19.3 trapped during rapid collider lifecycle changes. The full patrol reproduced the issue; a reusable physics-body pool fixed it without changing the pinned version.",
    "I built the wave director, artillery/torpedo combat, controller-first menus, touch assistance, procedural coastal art/audio and authoritative multiplayer state replication.",
    "Keeping fixed-step physics, remote input edges, shared snapshots and synchronized terminal results consistent was the hardest integration task.",
    "none. The engine and physics library are unmodified. Body pooling and the networking adapter belong to the game.",
    "I would improve Rapier WASM error diagnostics so lifecycle failures identify the failing operation and object."
  ],
  "promptFeedback": [
    "The source research requirement, controller-first UX, procedural audio, attract mode and single-file package gave the demo clear creative and delivery goals.",
    "The source has 27 rule variations rather than a level campaign, so the number of variations expected in one complete vertical slice required interpretation.",
    "Combining a polished single-file WebGPU game with reliable host-authoritative co-op, standalone rooms and Hub conformance was the hardest requirement.",
    "Specify a preferred demo length and whether every original rule variation should appear, or whether a representative progression is enough."
  ],
  "aiHub": {
    "name": "Air-Sea Kerfuffle",
    "tagline": "Good aim. Bad company. One very busy coastline.",
    "description": "Man an island cannon in a cel-shaded coastal score chase inspired by Air-Sea Battle. Lead aircraft, guide torpedoes, charge broadsides and defeat the flagship across a complete 136-second patrol, solo or with a friend.",
    "type": "Game",
    "genre": "Shooter",
    "source": "Air-Sea Battle (1977)",
    "series": "",
    "players": "1–2",
    "controls": "Mouse or sticks aim; click/Space/R2 fires; Q/L1 swaps; E/Triangle unleashes broadside; Escape/Options pauses. P2 J/L, K, U, I. Touch drag auto-fires; second finger broadside.",
    "tags": [
      "3d",
      "arcade",
      "co-op",
      "retro",
      "vehicles",
      "boss fights"
    ]
  }
};
