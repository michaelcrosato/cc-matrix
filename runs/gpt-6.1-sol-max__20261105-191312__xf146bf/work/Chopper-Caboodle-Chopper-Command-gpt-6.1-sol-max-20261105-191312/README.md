# Chopper Caboodle

A complete desert arcade patrol inspired by **Chopper Command (1982)**. Protect three trucks, fight through three sectors, winch up stranded crew, repair at field pads, and bring down the twin-rotor Dustmaker. A campaign takes roughly two to five minutes, depending on play. Flight School teaches every action in a safe playable sortie.

Open the HTML file beside this directory in a modern browser. It is completely self-contained: Three.js, Rapier and its WebAssembly, the Hub client, models, styles, music and effects are embedded. No connection or server is needed for standalone play. WebGPU is preferred, with Three.js's WebGL 2 compatibility backend and recovery after device loss. Fullscreen is in Options.

## Controls

| Action | Standard controller | Keyboard / mouse |
| --- | --- | --- |
| Fly | Left stick | WASD / arrows |
| Aim | Right stick | Mouse |
| Fire | R2 / RT or Cross / A | LMB / Space |
| Homing rocket | Square / X or R1 / RB | E / RMB |
| Flares | Circle / B or L1 / LB | Q |
| Boost | L3 / left stick click | Shift |
| Pause / back | Options / Menu; Circle / B to back | Escape / P |
| Rescue / resupply | Slow low hover over crew / H pad | Same |

Menus support the D-pad, left stick, face buttons, keyboard and mouse. Options switches PlayStation / Xbox prompts. Touch uses an invisible left thumb stick, automatic aiming and firing, automatic defensive flares, and a contextual rocket button. The menu button and a small hull display remain visible.

Two-pilot patrol is local shared-world co-op. Pilot 2 uses a second standard controller or IJKL, O to fire, U for rockets, H for flares, and N to boost. Pilots share score, reserves and convoy survival, with a shared camera boundary.

## Online

AI Hub Session Protocol v1, client 1.4.0, **ghost** mode, 1–4 players. Each pilot runs a seeded patrol and sees remote aircraft when they share a sector and area. Highest score wins. Hub sessions start and end on the Hub clock; Create + Options is reserved for the Hub. Standalone multiplayer is local co-op; standalone internet matchmaking is not provided.

The unmodified client is the first script after the HTML charset declaration. Integration files were retrieved from the exact repository requested in the prompt. No internet research about the source was performed.

## Development

Pause → Developer Mode exposes live flight speed, fire rate, weapon power, incoming damage, raider density and rocket cooldown, with reset to defaults. Tools include invulnerability, autopilot, repair / rearm, sector advance, boss spawning and clearing the current sky. They are unavailable in Hub rounds. Tune defaults in `src/game.js`; sector definitions are in the same module. Aircraft, scenery and TSL cel materials live in `src/graphics.js`. All audio synthesis is in `src/audio.js`.

After installing the pinned packages with `npm ci`, `npm run build` regenerates `index.html` and the root deliverable. The build embeds all dependencies and copies the unmodified Hub harness beside the development HTML.

Run every automated check with:

```sh
npm --silent test
```

The command prints only failures and one final count. It owns a temporary loopback HTTP server on an OS-assigned port and closes its browsers and server at the end. Results, campaign events and the few visual inspection screenshots are in `tests/artifacts/`. Tests use the installed Python Playwright environment; no browser download is needed. Checks cover the full flight school and campaign, Rapier hits, abilities, rescue, field pads, death / respawn / defeat / retry, standard gamepads, co-op, touch multitouch, synthesized audio, offline `file://`, native WebGPU, device-loss recovery and Hub sessions under 150 ms latency, 50 ms jitter and 5% packet loss, including host departure. The automated full campaign uses the explicit invulnerability test tool.

No real controller, touch screen, TV, other human player or listening test was available. Standard gamepads and touch are emulated. Web Audio output is measured with an analyser. Screenshots inspect visual layout on the compatibility backend; native WebGPU is checked through initialization and game state.

## Credits

Original source: Chopper Command (1982), Activision. This original tribute is unaffiliated. Code / design: OpenAI gpt-6.1-sol, reasoning effort max. Three.js r180 (MIT), Rapier 0.19.3 (Apache-2.0), Web Audio API, Gamepad API, and AI Hub's supplied session client. All visuals, music, effects and gibberish radio voices are made in code. The in-game About / Credits screen and root `exit-interview.json` carry the full source, testing, engine and prompt feedback. Usage: **added on import**.
