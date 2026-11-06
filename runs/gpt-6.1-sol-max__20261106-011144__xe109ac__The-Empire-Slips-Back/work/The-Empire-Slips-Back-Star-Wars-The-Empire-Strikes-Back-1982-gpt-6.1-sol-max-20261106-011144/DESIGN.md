# The Empire Slips Back

An original 2.5D arcade flight / defense shooter inspired by the 1982 Parker Brothers Atari 2600 game, not the 1985 arcade game. Side-on orthographic camera with a gently elevated view reveals the depth of the inked diorama.

## Complete mission
1. First contact: defend the generator against two armored walkers. Learn directional flight, aiming, heat, and flashing reactor ports.
2. Cold hands: defeat the next wave and retrieve three stranded pilots by hovering low. Return to the generator pad for repairs. Probe drones fire homing missiles.
3. Last transport: a siege walker and its escorts arrive. Cable its legs, exploit its exposed reactor, and clear the defense perimeter. Hold until the evacuation timer finishes.

Every walker can be killed with blasters; every stranded pilot is optional for victory but scores heavily. Tow cable is a powerful close-range alternative, available throughout. Instinct is earned by surviving, attacking, and rescues, then grants temporary invulnerability and accelerated cooling. Failure: generator destroyed or three speeders lost. Checkpoints between acts; continue restarts the current act. Victory has mission statistics and replay.

## Presentation and input
Native Three AnimationMixers run walker gaits, ship engines, rescue beacons and collapse clips. Procedural geometry, three-band TSL cel shading, ink edge lines, hatching on armor, painted snow strata, wind trails, radar and on-world indicators. Entirely synthesized Web Audio: original adaptive score at 10%, engines, blasters, footsteps, ice impacts and gibberish radio.

Pad: left stick flight, right stick aim, R2/Cross fire, L2 boost, Square cable, Triangle instinct, Options pause. Keyboard: WASD/arrows, mouse aim/LMB or Space fire, Shift boost, E cable, Q instinct, Esc pause. Touch: invisible left drag flight, right drag aim/autofire, contextual cable/instinct action.

## Networking
AI Hub Protocol v1 ghost, 1–4: separate seeded missions, ships and score exchanged at 10 Hz, progress/results, complete lifecycle. Standalone direct WebRTC invitation/response, no game server; same seed and ghost packets. A same-browser BroadcastChannel option supports a second tab. No chat or custom identity entry.

## Research
- Parker Brothers' original 1982 manual, AtariAge: https://atariage.com/manual_html_page.php?SoftwareLabelID=501
- Original full manual scans, Atarimania: https://www.atarimania.com/game-atari-2600-vcs-star-wars-the-empire-strikes-back_16249.html
- Original packaging and screenshots: https://www.atariage.com/box_page.php?BoxStyleID=26&SoftwareLabelID=501
- AI Hub protocol/client/harness: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- Three r180 source and Rapier official JS guide; exact CDN packages inspected.

The original features scrolling flight, radar, advancing walkers with damage colors and flashing weak spots, ground repairs, homing smart bombs, temporary Force invulnerability and increasing endless difficulty. This finite mission expands that loop with rescues, heat and tow cables. Audio uses original compositions and synthesized effects; it does not reproduce a film recording.
