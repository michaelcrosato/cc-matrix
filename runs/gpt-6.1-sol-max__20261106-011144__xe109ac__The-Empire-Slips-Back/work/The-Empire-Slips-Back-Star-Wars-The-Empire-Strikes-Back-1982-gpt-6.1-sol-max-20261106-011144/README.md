# The Empire Slips Back

Open the `.html` file in the parent folder in a modern browser. The initial load downloads pinned Three.js r180 and Rapier 0.19.3 modules, plus two Google Fonts. WebGPU is preferred; Three's WebGL2 backend provides a fallback. No server or build is required to play. Music starts at 10% after the first interaction.

A complete three-wave arcade sortie: stop advancing walkers, aim at flashing reactors, manage heat, deploy a close-range tow cable, recover three stranded pilots, repair at the base, activate instinct, and cover the last transport. Three speeders; checkpoint retries; persistent personal best. An expert scripted run lasts roughly two minutes; deliberate play takes longer.

- **Pad:** left stick fly, right stick aim, R2 or Cross fire, L2 boost, Square cable, Triangle instinct, Options pause. PlayStation glyphs by default; Xbox glyphs in Options. Holding Create suppresses Options for the Hub shortcut.
- **Keyboard/mouse:** WASD or arrows fly; mouse aim; left click or Space fire; Shift boost; E cable; Q instinct; Escape pause. Menus accept mouse hover/click, arrows, Enter and Escape.
- **Touch:** invisible left drag for flight and boost, right drag to aim/fire, assisted fire without right-thumb contact, contextual cable/instinct action, menu button. Hovering near downed pilots rescues automatically.
- **Dev tools:** pause → Developer Tools. Live flight speed, damage, armor, march speed, cooling, heat, aim assist and time scale; reset defaults; god mode; physics overlay; step; refill; wave jumps; teleports; clear wave; autopilot.
- **Attract:** title or menu idles for 10 seconds, then plays a looping AI sortie. Any input returns to the hangar.
- **Multiplayer:** AI Hub Protocol v1 ghost mode, 1–4 players. Standalone Wing Race offers direct WebRTC invitation/response codes for two devices and BroadcastChannel for two tabs. Each pilot has an independent seeded mission; ghost ships and scores are shared. External NAT connectivity is unknown; direct linking was verified on two local browser pages.

## Build

`python3 build.py`

Run from this directory, or give the script's path. It embeds the unmodified Hub client, CSS, game module and parent `exit-interview.json` into the parent HTML. External libraries stay pinned CDN imports. `DESIGN.md` contains the mission and research notes; `title-draw.json` records the 50-candidate OS-random title draw.

## All checks

`/home/micha/.local/share/pipx/venvs/playwright/bin/python test_game.py`

One command rebuilds the deliverable, starts an HTTP server bound to 127.0.0.1 on an OS-selected port, confirms this game's title and renderer, runs the functional suite and real Hub harness, and closes only its own browser and server. It prints failures and one final count. Artifacts and history stay under `test-artifacts/`. WebGPU screenshots use GPU readback to avoid headless canvas-compositor blanks. The software backend uses `--use-angle=swiftshader` as well as the supplied Vulkan/WebGPU flags.

Physical controllers, real mobile hardware, a real TV and internet NAT traversal are unavailable here. Their results are unknown. See the in-game About screen and parent `exit-interview.json` for source information and the required feedback.
