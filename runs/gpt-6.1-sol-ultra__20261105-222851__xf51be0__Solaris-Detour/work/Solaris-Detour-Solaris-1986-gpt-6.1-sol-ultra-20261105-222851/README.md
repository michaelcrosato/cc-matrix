# Solaris Detour

A complete arcade space-rescue patrol inspired by Solaris (Atari 2600, 1986).

Open the HTML in the parent folder. The first load needs internet for pinned Three.js r180 and Rapier 0.19.3 modules. WebGPU is preferred; the engine falls back to WebGL 2 when necessary. `?renderer=webgl` forces the screenshot/debug fallback.

WASD/arrows fly, mouse/right stick aims, click/Space/R2 fires, Shift/L2 boosts, E/Square releases a nova pulse, M/Triangle opens the scanner, Escape/Options opens the flight menu. Standard gamepads, PS/Xbox prompts, and touch flight are supported. The title plays an autopilot demonstration after ten idle seconds.

Clear Breakwater, rescue five cadets at Copper Moon, collect the Needle's key and pass its ion door, cross the wormhole, defeat the Sun Eater and rescue six pioneers. Lantern Bay provides fuel, repairs and one reserve fighter. The three mission signals unlock the route. The uplink deadline causes reversible Red Zone controls; clear Breakwater to restore them.

The pause menu includes live balance sliders, invulnerability, sector jumps, full repairs, objective completion, Red Zone switching, and default resets.

Online: Create Flight / Join Flight links 1–2 players through PeerJS 1.5.5 and WebRTC. Same-origin tabs also connect directly via BroadcastChannel. The captain selects sectors; each pilot flies and fires independently; hull, fuel, pulse, objectives and score are shared. AI Hub v1 uses the official unmodified session client and an authoritative shared world, including a host with no player.

Build: `node build.mjs`.

Test: `/home/micha/.local/share/pipx/venvs/playwright/bin/python test.py`.

The single test command starts and closes its own server/browser, prints failures and one final count, and writes `test-report.json`. Screenshots and graphics recovery reports are development artifacts. `title-choice.json` records the cryptographically random choice among 50 title candidates.

All 3D shapes, ink/cel shaders, AnimationMixer clips, music, effects and gibberish voices are procedural. No raster or audio asset downloads.
