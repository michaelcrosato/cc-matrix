# Chopper Palooza

An original, complete arcade convoy-defense game inspired by Chopper Command (1982).

Open `../Chopper-Palooza-Chopper-Command-gpt-6.1-sol-ultra-20261105-212546.html` in a modern browser. The single file includes Three.js r180, Rapier 0.19.3, the AI Hub client, all game code and all procedural art/audio. No server or downloaded assets are needed for solo play. WebGPU is the primary renderer; Three's WebGL 2 backend is available as a fallback (`?webgl=1` forces it for visual inspection).

Three sectors lead into a command-carrier fight. Protect six trucks, recover pilots to repair and replenish flares, choose field upgrades, and keep flying using two replacement helicopters. Score multipliers reward quick successive kills. The title screen begins a looping AI patrol after ten seconds without input. Any input returns to the title.

## Controls

| Action | Keyboard and mouse | Standard controller |
| --- | --- | --- |
| Fly | WASD / arrows | Left stick |
| Aim | Mouse | Right stick, or flight direction |
| Fire | Left click / Space / J | R2 / RT or Square / X |
| Boost | Shift | L2 / LT |
| Flare | Q | Circle / B |
| Rescue | E, or hover near pilot | Cross / A, or hover near pilot |
| Pause | Escape / P | Options / Menu |

PlayStation prompts are the default for pads; choose Xbox prompts in Settings. Mouse hover changes menu focus. Arrow keys, Enter, D-pad and Cross/A navigate the same menus. A second local controller joins with Cross/A. Touch uses an invisible left stick, right-side aim, automatic fire and rescue; double-tap the right side for a flare. A rescue button appears when a pilot is nearby.

## Multiplayer

“Fly with a wingmate” hosts or joins an online patrol using a six-character code. Standalone networking uses WebRTC and the public PeerJS service; the PeerJS library loads from a pinned CDN only when this feature is opened. Same-origin tabs also use BroadcastChannel. Hosts own the simulation and guests send inputs. Both pilots share convoy and score; each has separate hull, replacement helicopters and flares.

The bundled AI Hub session client implements shared-world protocol 1. Sessions automatically connect and ready, respect the countdown, support a server with no local player, and report a tied team score. No external signaling is used inside AI Hub. Its menu and round lifecycle own session entry/exit.

## Developer hangar

Pause → Developer Hangar. Live sliders expose speed, enemy traffic, damage, convoy armor, weapon power and simulation speed. Tools include invincibility, sector skip, carrier spawn, full repair, clear hostiles, victory inspection and reset to defaults. Run upgrades reset on a new sortie.

## Build and verification

`npm run build` rebuilds the single HTML from the source modules and editable template.

`npm test --silent` is the consolidated quiet verification command. It runs gameplay, controller/touch, offline audio, file boot, standalone networking and the unmodified AI Hub harness. It prints failures and one count. Browser executables are the installed Playwright 1.63 browsers. Every server binds OS-assigned `127.0.0.1` ports and shuts down after its test.

The saved visual captures in `tests/` were inspected for composition and legibility at 1920×1080 and portrait phone size. They use WebGL 2 because this machine's headless WebGPU compositor captures a blank canvas even when the game state and GPU renderer run. `tests/visual-check.py` is the capture implementation. Test reports and complete scripted playthrough states are also in `tests/`.

The title draw used Python `secrets.randbelow(50)`; `title-draw.json` records the result. `report.json`, the root `exit-interview.json` and the in-game About screen hold the requested source and feedback information. Usage is added on import.
