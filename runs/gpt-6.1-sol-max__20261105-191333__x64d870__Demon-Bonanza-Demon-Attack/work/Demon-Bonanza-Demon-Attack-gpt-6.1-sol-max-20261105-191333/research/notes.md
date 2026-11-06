# Research, 2026-11-05

Primary source: Imagic's original Atari 2600 instruction manual, transcribed at
https://atariage.com/manual_html_page.php?SoftwareLabelID=135
Read mechanics, control variants, reserve bunkers, tracer shots, shared cannon
co-op, and point table. Unlimited fire; horizontal cannon; earn one reserve for
an unhit wave, cap six; later split and diving demons. Original has different
waves rather than authored spatial levels. Borrowed the terse survival tone,
not manual prose or named source characters.

Original screenshots and preserved footage:
https://www.atarimania.com/games/atari-2600-games-demon-attack-7282
https://www.atarimania.com/2600/screens/demon_attack.gif
https://www.atarimania.com/videos/how_to_beat_home_video_games_2600_demon_attack.mp4
Examined source sprite silhouettes, narrow horizontal staging, black background,
colored horizontal bands and glowing ice-line, and electronic sound vocabulary.
Footage audio cannot be judged by a human in this headless environment.
Original sound-code reference:
https://forums.atariage.com/topic/176402-demon-attack-source-code/
Research identifies separate shot and demon-explosion effects. The new game's
chiptune score, filtered noises, laser sweeps and syllabic voices are original.

Hub primary protocol, client 1.4.0 and official harness downloaded unmodified:
https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
Shared-world authority, 16KB packets, <=20 messages/s, ready/start/time-up/end,
server host without player, leave handling, no standalone signaling in sessions.

Pinned Three source inspected for toon support in WebGPURenderer:
https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgpu/nodes/StandardNodeLibrary.js
Rapier sensor collision docs:
https://rapier.rs/docs/user_guides/javascript/colliders/
