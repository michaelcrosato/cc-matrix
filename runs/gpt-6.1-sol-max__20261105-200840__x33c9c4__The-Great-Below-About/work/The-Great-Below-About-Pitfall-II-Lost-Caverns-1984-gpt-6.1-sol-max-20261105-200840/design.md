# The Great Below-About

An original, non-combat expedition platformer inspired by Pitfall II: Lost Caverns (1984). Orthographic 2.5D side view; warm expedition comedy; hand-built cel-shaded meshes with ink silhouettes. The entire finished game, engine, physics WASM, network client, and procedural sound are bundled into one offline-capable HTML.

Core route: Fernfall Porch → Frogstep Galleries (Pip) → Inkfin River (Marmalade) → Balloon Belfry → Sunseed Loft (Sunseed Prism). Ladders connect a continuous world; optional gold and a rear-approach cave rat reward exploration. Creature contact rewinds to a lantern and costs score, preserving discoveries. All three main discoveries end the expedition. No lives or solo timer.

Input: A/D or arrows, W/S vertical, Space jump, E balloon action, M map, Escape pause. Standard gamepad: left stick/D-pad, Cross jump, Square balloon action, Triangle map, Options pause. Minimal touch stick on either half, contextual jump/drop action; ladder, buoyancy, and jump assistance. Controller and keyboard navigate every menu. Pause exposes the field map, settings, checkpoint rewind, and live developer tools.

Online: AI Hub Protocol v1 ghost races (1–4), plus standalone room races over WebRTC/PeerJS and same-browser BroadcastChannel. Other explorers are non-interacting ghosts. Scores reflect discoveries and stumbles. Session lifecycle remains controlled by AI Hub.

Research: Activision's 1984 Atari 2600 manual transcribed by AtariAge; AtariAge screenshots/profile; original advertising/manual excerpts for tone, balloon travel, dynamic music, healing checkpoints, enemy patterns, and rescue objective. Original narrative, world, models, and melodies.

Validation: one command `npm test`; gameplay, physics traversal, scripted full expedition, scoring/rewind, menus, audio signal, controller stub, touch, offline file launch, standalone peers, and official AI Hub harness including packet loss and host departure. Visual screenshots check composition only. Feedback and exact test results are written after testing.
