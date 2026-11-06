# Pressure Griller

A complete, original arcade cooking demo inspired by **Pressure Cooker (1983)**. Catch moving toppings, match the regulars’ tickets, and deliver their burgers to three colored counters. Three escalating rushes introduce taller orders, the dinner bell and warning-marked steam lanes.

## Play and share

Open the `.html` beside this folder in a modern browser. The file contains the game, Three.js, Rapier and its WebAssembly runtime. No server, downloads, images, fonts or audio files are needed. WebGPU is preferred; WebGL 2 handles unsupported or lost GPU devices.

- **Solo:** Open the kitchen. Serve 3, 4 and 5 orders across three rushes.
- **Couch co-op:** Cook with a friend. Two chefs share tips and pressure, with separate burgers.
- **Practice:** Unlimited time and protected pressure. The dev kitchen can switch rushes.
- **AI Hub:** 1–4 player synchronized, seeded score attack using Session Protocol v1. The hub owns the round, names, network and results. Outside AI Hub, multiplayer is local couch co-op.
- **Attract mode:** Leave the title screen idle for 10 seconds. An AI chef plays through the game and loops; any input returns to the title.

## Controls

| Action | PlayStation / standard pad | Keyboard and mouse |
| --- | --- | --- |
| Move | Left stick / D-pad | WASD; arrow keys in solo; click a destination |
| Catch / serve | Cross | Space; click a topping or counter |
| Dash | Circle | Shift / right mouse button |
| Dinner bell | Triangle | Q |
| Switch ticket | R1 / L1 | Tab; click or hover a ticket |
| Clear burger | Square | R |
| Pause / back | Options / Circle | Escape |
| Player two | Second controller | Arrows, Enter; `/` dash, Backspace clear, `.` ticket |

On touch devices, drag anywhere to move with an invisible stick. Catching and serving are assisted. A second finger dashes; tap the bell to slow the kitchen. Contextual catch/serve buttons appear near a topping or counter. Settings include Xbox glyphs, optional assist and camera shake. Music defaults to **10%**.

## Dev kitchen

Pause, then select **Dev kitchen**. Tune chef speed, belt speed, ticket patience, pressure gain, catch reach and simulation speed live. Tools include AI play, pressure protection, a bell charge, physics visualization, rush advance, completion and restart. Reset defaults restores both tuning and existing ticket patience. Dev-assisted scores do not replace the personal best. Session rounds disable cheat tools.

## Develop

Requires Node and the Python Playwright environment listed in the workstation instructions.

```sh
npm ci
npm run build --silent
npm test --silent
```

The build writes the single HTML and `exit-interview.json` to the parent deliverable directory. The test command prints only failures and a final count, and writes detailed JSON results and layout screenshots here. It launches one Chromium browser, uses an OS-selected port bound to `127.0.0.1`, runs the supplied AI Hub harness, and shuts its server and browser down. It never uses an existing shared port.

Chromium software WebGPU testing uses `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader --use-angle=swiftshader`. On this workstation the last flag prevents the compositor from destroying an otherwise healthy WebGPU device. WebGPU screenshots can still be blank, so renderer health and gameplay are checked from state and layouts are captured using WebGL 2.

| File | Purpose |
| --- | --- |
| `core.js` | Fixed-step cooking rules, recipes, shift progression and AI |
| `scene.js` | Procedural diorama, toon/ink materials, Three.js animation, Rapier physics and graphics recovery |
| `audio.js` | Synthesized music, effects and gibberish voices |
| `ui.js`, `shell.html` | Controller-first menus, HUD, touch layout, settings and credits |
| `main.js` | Inputs, application lifecycle, persistence and AI Hub integration |
| `metadata.json` | Shared catalogue, source information and exit interview data |
| `core-tests.mjs`, `tests.py` | Whole-campaign, input, audio, recovery and session regression checks |
| `hub/` | Unmodified supplied session client and conformance harness |

Content is editable through `TOPPINGS`, `BAYS`, `SHIFTS` and recipe tables in `core.js`. Runtime library notices are included in `THIRD-PARTY-LICENSES.txt` and embedded in the HTML. The AI Hub client is pasted unmodified as the first script after the character-set declaration.

Real controller hardware, real mobile hardware, actual listening and rendering on other machines remain unknown. See the game’s About screen and `exit-interview.json` for the complete source information and feedback.
