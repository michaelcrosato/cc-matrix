# Dodge on Arrival — design and research

Title: Dodge on Arrival. Chosen by node:crypto.randomInt from 50 candidates; draw 18.
Source: Dodge 'Em (Atari, 1980), Carla Meninsky.
Genre: arcade maze racing / score attack. Camera: elevated orthographic, single-screen.

Primary sources:
- https://atari.com/pages/dodgeem — original instruction text: automatic counterclockwise player; four lanes; clockwise crash car; dots; acceleration; lane changes only through gaps; three turns; second opponent after two clears; multiplayer role swapping.
- https://www.ataricompendium.com/archives/manuals/vcs/dodge_em.pdf — original manual and playfield reference, downloaded locally. Engine roar and collisions described by original manual.
- https://atariage.com/manual_html_page.php?SoftwareID=984 — original manual transcription, sound confirmation.
Secondary context:
- https://www.atariarchive.org/blog/dodge-em-dodger-cars-september-1980/ — level escalation and screenshot context. Original square, bright track, dots and contrasting cars.
- https://gamefaqs.gamespot.com/atari2600/584686-dodge-em/reviews/175323 — sound description: engine buzz, dot ticks, collision crunch; no music. Exact source audio waveform not confirmed.

Interpretation: toy-scale cel-shaded ink fairground, warm cream/gold against midnight teal. Preserve four rings, four gaps, head-on opponents, collection and acceleration tradeoff. Five complete designed circuits introduce a second opponent and timed closed gaps. Earn a brief ink-slip shield by dots and near misses. Three lives, one recovered per clear. 90-second local role-swap duel. Ghost racing, with no collisions between remote racers.

Dependencies: Three.js 0.180.0 WebGPURenderer / MeshToonNodeMaterial with automatic WebGL2 fallback, Rapier 0.19.3, Web Audio / Gamepad / Pointer APIs, PeerJS 1.5.5 for standalone WebRTC. AI Hub Session Protocol 1, unmodified client 1.4.0 embedded first in head.

Test policy: one command, failures and one-line count. State-driven scripted campaign, sensors, crash/respawn, menus, input/gamepad/touch, audio analyser and multiplayer. Visual screenshots only for composition. HTTP binds 127.0.0.1 with OS-selected port. Processes closed by owning PID.
