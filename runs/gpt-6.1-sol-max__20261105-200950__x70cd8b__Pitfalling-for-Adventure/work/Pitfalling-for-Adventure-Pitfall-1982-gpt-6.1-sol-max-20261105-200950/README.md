# Pitfalling for Adventure

Open the single HTML in the parent folder. Internet access loads pinned Three.js r180, Rapier 0.19.3 and the two Google Fonts. No server is needed for standalone play.

Recover all eight treasures and reach the Sun Gate. Jump to grab a vine, then press jump again to release. Closed crocodile mouths are platforms. Climb the ladders at 73/109 and 165/179 to explore both caves. Gold flags mark checkpoints. Your pack, lives, clock and latest camp are saved automatically.

Keyboard: A/D or arrows to move, Space to jump, W/S or up/down to climb, M for the map, Esc to pause. Local co-op uses A/D + Space for the first explorer and arrows + Right Shift for the second. Two standard gamepads also work. Touch uses a left-side invisible stick and right-side taps, with assisted hazard jumping and vine releases.

PlayStation is the default controller glyph family; Options can select Xbox symbols. Music defaults to 10%. Pause → Developer field lab exposes live speed, jump, gravity, hazard tempo, time budget and simulation speed, plus invulnerability, flight, physics wireframes, treasure bearings, camp warps, single stepping, treasure recovery and defaults reset. Cheats disable saving. The title starts a looping expedition replay after ten seconds without input.

AI Hub Session Protocol v1 uses ghost races for 1–4 players. The embedded client is unmodified. The standalone multiplayer mode is shared-screen cooperative play for two explorers. No standalone internet broker is required.

Rebuild and run all checks from this directory:

```bash
./check.sh
```

The command starts a temporary server bound to 127.0.0.1 on an OS-selected port, closes its browser and server, prints failures only, then one count. It covers both render backends, file:// loading, a full expedition using normal physics controls without cheats or teleports, saves, failure and victory, menu navigation, standard gamepads, touch in both orientations, attract mode, live/offline audio and all three applicable AI Hub harness scenarios. `--case core|route|input|sharing|visual|hub` selects a group. JSON results and diagnostic screenshots stay here.

The software WebGPU adapter produced blank screenshots; it was verified through game state and the normal physics playthrough. The same scene was visually inspected through Three.js's WebGL 2 backend. Physical controller hardware, actual touch hardware, audio listening and hardware GPU rendering are unknown.

`build.py` assembles `template.html`, the unmodified `session.js`, four source modules, and the root `exit-interview.json`. Edit the data near the top of `scene.js` to extend rooms, camps, treasure locations, gaps and caves. `PLAN.md` records the research and design. `qa-log.json` records the resolved product issues.
