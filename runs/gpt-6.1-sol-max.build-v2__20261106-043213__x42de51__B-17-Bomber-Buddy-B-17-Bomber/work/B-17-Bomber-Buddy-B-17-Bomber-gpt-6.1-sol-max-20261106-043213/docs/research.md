# Source and contracts

Read on 2026-11-06. Inspiration: B-17 Bomber, Mattel Electronics, Intellivision, 1982. This is an original, unaffiliated adaptation.

- https://history.blueskyrangers.com/instructions/b17bomber.html — the original manual establishes route selection, the fuel/payload tradeoff, piloting, four clock-face gun stations, the downward sight, and returning to England to service the aircraft. Damage can impair stations. These define this game's coupled sortie.
- https://history.blueskyrangers.com/mattelelectronics/games/b17bomber.html — developer history and credits describe the crew-role changes and practical radio warnings. New crew writing, synthesis, and character performances are original. Original recordings and musical timbres were not audited: unknown.
- https://www.intvfunhouse.com/games/b17b.php — preserved screen references support strong map contrast, readable instruments and distinct gun/sight views. No copied images or recordings are used.

Engine: my-3D2dge v0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Read handoff README, API card, relevant API index entries, ASSETS card, World3D header, flight and split-screen racing references. Native engine remains the fixed-step, scenes, input, menu/settings, rig, tween, audio-bus, shape and 3D-pen foundation. Three 0.182.0 and Rapier SIMD compat 0.19.3 are bundled for offline portability.

AI Hub: Session Protocol 1, client 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869. Read full lib/hub/README.md. session.js stays verbatim, first script immediately after charset. One host owns simulation; a playerless host has no implicit pilot. Guests submit validated commands and display snapshots. No external signaling, communication, or host migration.

No correction to the plan's source interpretation was necessary. Flight distances, difficulty, fighters, crew, mission, target names, visual art and all audio are new design choices.
