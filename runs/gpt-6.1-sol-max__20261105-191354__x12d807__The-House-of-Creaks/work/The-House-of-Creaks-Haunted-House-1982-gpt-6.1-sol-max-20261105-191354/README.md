# The House of Creaks

A complete, four-floor haunted-house adventure inspired by Haunted House (1982). The title was drawn with an operating-system random number generator from 50 original candidates; see `title-draw.json`.

Open the HTML beside this folder in a current Chrome or Edge browser. The single HTML contains the game, styles, UI, procedural art and audio, and unmodified AI Hub client. An internet connection loads pinned Three.js r180 and Rapier 0.19.3 modules from jsDelivr. The main renderer is WebGPU, with Three.js's WebGL2 compatibility backend available on other browsers.

Recover three urn fragments, return them separately to the foyer plinth, then leave through the front door. Find the brass key in the dining room to open the upper library stair. The scepter in the Blue Parlour repels ghosts and can pulse to stun creatures. You carry one object. Matches frighten spiders but attract ghosts; bats steal light. Hold Hush during wind. The candle in each central landing refills matches and restores one nerve once per floor. Notes and the paper map guide the route.

| Action | Keyboard & mouse | Standard controller |
| --- | --- | --- |
| Move | WASD / arrows | Left stick |
| Aim | Mouse | Right stick |
| Strike match | Space | R2 / RT |
| Take, use, stairs | E / click nearby object | Cross / A |
| Drop | Q | Circle / B |
| Hold Hush | Shift / right mouse | L1 / LB |
| Scepter pulse | F / left mouse with scepter | Square / X |
| House map | Tab | Triangle / Y |
| Pause | Escape | Options / Menu |

Portrait play follows your visitor through the house. Touch uses an invisible left thumb stick and right-side taps, with automatic flame, gust shelter and scepter assistance. A contextual use button appears only near an interaction. Prompts follow the last input; controller glyphs can be changed in Settings.

The pause menu has complete developer tools: six live balance sliders, invulnerability, map reveal, collision geometry, refill, floor teleport and item grants. Reset defaults restores the balance controls. The title enters a looping AI demonstration after ten seconds without input; any input returns to the title. Solo progress autosaves during the night and on Save & return to title. Victory clears the save and records the best night score.

## Cooperative play

AI Hub automatically joins a shared-world round for 1–4 players. The host simulates the house; guests send bounded input and receive state. Leave, time-up, host departure, server-only hosts and round end follow protocol v1. No external multiplayer connections are made in a Hub session.

On its own, Play together offers two transports:

- Same-browser rooms: open the identical game URL in another browser tab and join with the six-letter code. BroadcastChannel is confined to the same browser profile and origin.
- Across devices: the host creates an invitation, the guest pastes it and returns a reply, and the host pastes that reply. Up to three friends can connect with separate invitations. This uses direct WebRTC with a STUN server and no broker. Internet connections behind restrictive NATs may need a relay; the game does not host one.

A shared world keeps moving while one player's menu is open. Leaving a room ends that player's connection; a host departure ends the night for guests. Solo Save & return stores a solo night only.

## Development

All development files stay in this folder. `python3 build.py` recreates the root HTML and `exit-interview.json` from these modules. `npm install` restores the two exact dependency versions used by the simulation tests.

Run all validation with one command:

```sh
./test.sh
```

It prints only failures and a one-line count. It starts its own HTTP server bound to an OS-assigned port on `127.0.0.1`, checks the actual page title and WebGPU backend, and closes its own server and browsers. Tests cover Rapier collisions and a complete physical playthrough, input edges, inventory, gust shelter, enemies, loss, co-op survival, save restoration, keyboard, virtual standard gamepad, audio output, touch, file deployment, BroadcastChannel, direct WebRTC and four official AI Hub harness scenarios. Detailed results are in `tests/results.json`.

The suite uses the preinstalled Python Playwright environment. Its Chromium flags include `--use-angle=vulkan --disable-vulkan-surface` because the machine's documented SwiftShader WebGPU flags lose the device on this Chromium build. Headless WebGPU screenshot capture is corrupted on this setup; use the WebGL2 compatibility backend (`?renderer=webgl`) for visual inspection with `--use-angle=swiftshader --enable-unsafe-swiftshader`. The single-player, gamepad, touch and file tests use the actual WebGPU backend in fresh browser processes. Multi-page transport and Hub checks use the same renderer’s WebGL2 backend because repeated headless WebGPU contexts stall on this shared machine.

No internet source research, downloaded art, audio files, or generated raster art was used. `metadata.json` contains the source information and exit interview embedded in the About screen.
