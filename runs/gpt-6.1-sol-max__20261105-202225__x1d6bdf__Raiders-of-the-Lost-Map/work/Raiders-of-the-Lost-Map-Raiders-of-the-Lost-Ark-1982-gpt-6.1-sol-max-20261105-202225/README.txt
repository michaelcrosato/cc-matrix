RAIDERS OF THE LOST MAP
One missing map. Far too many snakes.

DELIVERABLE
The HTML in the parent folder is the complete game. Open it directly in a
modern browser. It loads pinned Three.js r180 and Rapier 0.19.3 from a CDN,
so internet access is needed on first load. WebGPU is preferred; the same
WebGPURenderer can fall back to WebGL 2.

PLAY
WASD / left stick: move relative to the screen.
Mouse / right stick: aim.
Left mouse / Square: whip.
E / Triangle: interact, trade, rotate a mirror, dig, swing, or revive.
Space / Cross: evade. In freefall it also opens the parachute.
F / Circle: flute; in freefall, parachute.
Q / L1: notebook. Escape / Options: pause.
Xbox symbols can be selected in Options.

Touch: invisible left thumbstick; tap the right half to evade. The whip,
flute and parachute have touch assistance. Nearby actions appear as a
single contextual button. The only permanent touch control is pause.

EXPEDITION
1. Collect three coins, then trade with Nadia for the flute and shovel.
2. Recover the parachute. Wake the COIL, SUN, WING seals in order.
   Collect the staff and enter the Sun Atlas.
3. Place the staff. Set I NORTH, II EAST, III SOUTH.
   Note the glowing mesa and use the ankh.
4. Swing between the mesas, and dive into the marked one.
5. Open the parachute and steer to the gold landing circle.
6. Excavate the marked seal. Dodge Voss's slam, then whip during
   his opening. Recover the reliquary.
7. Weave around rubble, dodge the darts and board the plane.

DEV MODE
Pause > Developer field kit provides live balance sliders, reset defaults,
invulnerability, collision bypass, enemy freeze, physics wireframes, world
markers, chapter jumps, party healing, a tool grant and the attract reel.
Solo checkpoints and options are saved locally. Co-op shares tools and
progress; a partner can help a fallen explorer.

CO-OP
AI Hub Session Protocol v1: shared-world mode, 1–4 players.
Hub sessions start automatically and use only the Hub for networking.
The original unmodified session client 1.4.0 is embedded first in the head.

Standalone: Bring a partner > Host an expedition. Partners open this game
and join with the six-digit code. BroadcastChannel serves tabs of the same
origin; PeerJS 1.5.5 provides WebRTC signaling for other devices. The host
simulates the world. Public signaling availability and real cross-device
connections are external and not confirmed by the local tests.

REBUILD
python3 Raiders-of-the-Lost-Map-Raiders-of-the-Lost-Ark-1982-gpt-6.1-sol-max-20261105-202225/build.py

ONE-COMMAND TEST SUITE
/home/micha/.local/share/pipx/venvs/playwright/bin/python Raiders-of-the-Lost-Map-Raiders-of-the-Lost-Ark-1982-gpt-6.1-sol-max-20261105-202225/test.py

The suite rebuilds first, checks JavaScript syntax, starts a private HTTP
server on 127.0.0.1 with an OS-selected port, verifies the served game,
tests WebGPU state and the WebGL fallback, drives all seven chapters to
victory, checks audio and input stand-ins, tests two-page co-op, opens
the file directly and runs the official Hub harness in four scenarios.
It prints only failures and a one-line count. Its server and browser are
closed when it finishes. Reports and visual captures are in artifacts/.

RESEARCH
Original Atari instruction manual:
https://www.atariage.com/2600/manuals_old/raiders_of_the_lost_ark.html
Original game analysis:
https://github.com/halkuncode/Raiders2600
Hub protocol and harness:
https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
Three.js native toon materials:
https://github.com/mrdoob/three.js/blob/r180/src/materials/nodes/MeshToonNodeMaterial.js
Rapier character controller:
https://rapier.rs/javascript3d/classes/KinematicCharacterController.html

All models, textures, writing, music, effects and gibberish voices were
created in code. No original game art, music or sound recordings are used.
The final exit interview is in the parent folder beside the HTML and is
also embedded in the About screen.
