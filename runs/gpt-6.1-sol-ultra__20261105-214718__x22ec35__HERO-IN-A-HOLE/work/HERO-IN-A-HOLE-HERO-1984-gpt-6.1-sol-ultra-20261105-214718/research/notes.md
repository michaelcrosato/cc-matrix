# H.E.R.O. research — 2026-11-05

Sources read before implementation:
- Original Activision manual, page “Some Essentials”, archived scan: https://www.atarimania.com/2600/boxes/hi_res/hero_i_3.jpg (local manual.jpg).
- Atari 2600 screenshot: https://www.atarimania.com/2600/screens/hero_3.gif (local source.gif).
- Original manual transcription: https://www.lemon64.com/doc/hero/275 (search-index excerpt).
- Game overview and archive: https://www.gamesdatabase.org/game/atari-2600/h-e-r-o-
- Credits and level progression: https://www.atarimania.com/games/atari-2600-games-h-e-r-o-11608/print?print=1
- AI Hub official source and protocol: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- Three.js official WebGPU manual and local pinned r180 source.

Design findings: A propeller backpack enables controlled shaft navigation. Rescue is the objective, under an energy deadline. A laser and limited timed demolition charges serve different tactical purposes. Broken illumination changes navigation. Increasingly connected caves contain winged and crawling threats, molten obstacles, and a floating platform. The original uses extremely simple side-view silhouettes and high-contrast colored rock. The original effects emphasize mechanical rotor pulses, electronic shots and bursts; exact original sound waveform and soundtrack not confirmed. This game's audio is an original procedural interpretation, never sampled.

Adaptation: five new authored assignments, three stranded workers each; compulsory demolition bulkheads; broad but hazardous rooms; charge proximity damage; breakable lights; moving heat raft; invulnerable tentacles; rescue power rewards and visible evacuation. Side-on orthographic 3D cutaway, ink edges and cel materials. The cooperative second operator, free aim, campaign endings, modern accessibility and developer controls are new.

Title: 50 candidates generated privately; Node crypto.randomInt selected index 11 (zero-based), H.E.R.O. IN A HOLE. selection.json records the draw.
