# Dodge on Arrival

A five-circuit arcade maze racer inspired by Dodge ’Em (1980).

Open the single HTML file in the parent folder. Internet access downloads pinned Three.js and Rapier modules and the typefaces. WebGPU is preferred, with Three.js’s native WebGL2 fallback. Standalone internet rooms additionally load PeerJS; same-browser tabs can link without its signaling server. AI Hub embeds the unmodified session client.

Controls: A/D or left/right queues a lane; hold to cross two lanes at a gap. Space/W or R2/Cross accelerates, limiting a change to one lane. Shift or Square uses a charged ink slip. Esc/Options pauses. Mouse selects a lane with the pointer, left click holds gas, right click slips. Couch driver two: J/L, I, K. On touch, swipe left half, hold right half and use the contextual slip button.

Pause → Dev garage exposes live speed, rival speed, boost, ink refill and simulation-speed sliders, invulnerability, autopilot, physics overlay, refill, next circuit, step and reset. Garage runs are unranked. The title starts a looping exhibition after ten seconds of inactivity.

Build: `python3 build.py` from this folder. The source is concatenated into the one HTML file in its parent. Credits are read from the parent `exit-interview.json`.

Test: `./test.sh` from this folder, or `./Dodge-on-Arrival-Dodge-Em-1980-gpt-6.1-sol-max-20261105-191339/test.sh` from the deliverable folder. It starts its own temporary loopback server on an OS-selected port, uses at most two active browser instances, closes its own resources, and prints only failures plus a count.

Research and the original manual are in `research/`. The official AI Hub harness and its unmodified support files are in `tests/`.

Validation: 73/73 full regression checks passed. A final 22/22 UI/input recheck passed after menu-scrolling polish. The official AI Hub harness passed 2-player, 4-player impaired-network, and host-leave scenarios. Public PeerJS signaling and real cross-context WebRTC data were verified on this workstation; geographically remote network behavior is unknown. Physical controller and phone behavior is unknown. Desktop captures are 1920×1080.

Use `./test.sh --ui --visual` for the UI/input subset and visual captures. Full results are in `tests/report.json`, UI results in `tests/ui-report.json`, and issue tracking in `tests/issues.json`.
