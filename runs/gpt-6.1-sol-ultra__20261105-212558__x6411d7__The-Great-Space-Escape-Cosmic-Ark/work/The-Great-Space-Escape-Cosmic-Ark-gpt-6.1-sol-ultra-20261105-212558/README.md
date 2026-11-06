# The Great Space Escape

An original arcade rescue game inspired by Cosmic Ark (1982). Three worlds, twelve strange passengers, and one final meteor storm. Fixed front orthographic 2.5D, cel shading and ink silhouettes, all procedural geometry and audio.

Open the HTML file in the parent folder directly in a current WebGPU-capable browser. All game dependencies, including Rapier's WASM, are bundled: no CDN or server is needed for standalone play. Music defaults to 10%. Audio unlocks on the first input.

- WASD / left stick: aim in four directions during defense; fly during rescue.
- Space / left mouse / R2: fire or hold the tractor beam. Mouse aims in defense; click and drag a destination in rescue.
- Shift / Cross (Xbox A): shield pulse in defense; boost in rescue.
- Escape / Options: pause. Developer tools are available from pause, with live balance sliders, defaults, repair and phase advance.
- A second local pilot uses a second standard gamepad or arrows + Enter + Right Ctrl.
- Touch: invisible left stick, assisted shooting and tractor beam, right-side aiming, double-tap right to boost.

Fly below the dashed range line and hold a beam steady over a creature. Carry two, then return to the dock beneath the ark. Four creatures per world; six shared hull points. Finish all three worlds and survive the final storm. The title runs an AI demonstration after ten idle seconds; any input returns to the title.

Standalone supports one or two local pilots. AI Hub sessions support one to four pilots with a shared authoritative world. The unmodified AI Hub session client is the first script in the document. Four required harness scenarios pass: two players, four with latency/jitter/loss, host departure, and a host with no player.

## Rebuild

`npm ci --ignore-scripts` then `npm run build` (requires Bun). Versions: Three.js 0.180.0, Rapier 0.19.3. The build writes the deliverable into the parent folder and an identical `game.html` for the harness.

## Test

Run `python3 test.py` from this folder. It runs all 124 automated checks sequentially and prints only failures plus one final count. It uses this workstation's existing Python Playwright environment; browsers are not downloaded. Tests open file:// directly except the AI Hub suite, which creates a temporary HTTP server bound to 127.0.0.1 on an OS-selected port, validates the served game, and terminates its own server by PID.

Coverage: build integrity and credits, Rapier collision and complete campaign simulation, disconnected pilots, network protocol unit tests, actual keyboard and virtual standard controller, touch portrait/landscape, generated and live audio levels, ten-second attract behavior, and all required AI Hub scenarios. `qa-log.json` records the 16 issues fixed during development.

Visual references: `ui-tv-title.png`, `ui-tv-rescue.png`, and phone images in this folder. Headless WebGPU screenshots may be blank, so visuals were reviewed through a headed compatibility renderer. Standalone WebGPU initialization is checked directly. Software WebGPU across multiple harness iframes sometimes loses a device and falls back to WebGL2; protocol/game state checks passed. Physical controller, actual iPhone and subjective audio listening remain unknown.

Source information, testing feedback, engine feedback and prompt feedback are in the game's About / Credits screen and in the parent folder's `exit-interview.json`. Usage is added on import.
