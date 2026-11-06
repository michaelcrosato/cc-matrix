# Keystone Catch-Up

The mall closes. The chase doesn’t.

An original arcade pursuit inspired by Keystone Kapers (1983). Cuff three crooks across a three-story, cel-shaded miniature mall before closing time. Jump rolling balls and shopping carts, duck toy planes, use escalators and the express lift, recover loot and grab restorative coffee.

Open the HTML file beside this folder directly in a modern browser. It contains the engine, physics WASM, procedural artwork, synthesized audio, UI and session client. No CDN connection, installation or server is needed for standalone play. WebGPU is the primary renderer; Three.js’s WebGL 2 backend supports devices without it and recovery after device loss.

## Controls

| Action | Standard controller | Keyboard | Local partner |
| --- | --- | --- | --- |
| Move | Left stick / D-pad | A D / ← → | J L |
| Jump | Cross / A | Space | I |
| Duck | Circle / B | S / ↓ | K |
| Cuff / ride | Square / X | E / W / ↑ | U |
| Dash | R2 / RT | Shift | O |
| Pause / back | Options / Menu / Circle | Esc | Esc |

Hold duck and action together to take the central lift down. Escalators travel in either direction from their yellow markers. Mouse clicks on contextual actions work as well. Settings can switch between PlayStation and Xbox prompts; the last-used input controls the prompts.

Touch uses an invisible left thumb stick, a right-side tap to jump, a downward swipe to duck and a contextual ride/cuff button. Auto-cuffing and assisted ducking are enabled by default and can be switched off in settings.

Solo and local two-player co-op share the same screens. Two controllers or the two keyboard layouts work locally. AI Hub sessions support one to four officers in one shared world; the host simulates Rapier physics, accepts player inputs and distributes snapshots. The Hub session client is embedded unmodified. There is no standalone matchmaking server.

The title screen starts an AI-played attract loop after ten seconds without input. Any input exits the demonstration.

## Developer tools

Pause → Developer tools. Live sliders control officer speed, crook speed, jump power, hazard frequency, shift length and the time penalty for a hit. Tools toggle invulnerability, freeze the crook, disable hazards, add time, warp floors, move the crook nearby, spawn each hazard and refill badge pips. Reset restores the starting balance. Shift length applies to the next shift; other balance changes apply immediately.

## Development

Dependencies are pinned to Three.js 0.180.0 and @dimforge/rapier3d-compat 0.19.3. Native Three.js AnimationMixer/AnimationClip tracks animate running, idle and cuffing. Custom TSL materials provide the cel palette, with inverted-hull ink contours. Canvas-generated signs and Web Audio instruments keep the deliverable self-contained.

```sh
npm install
npm run build
./test.sh
```

Build requires Bun and Python 3. Tests use the workstation’s installed Python Playwright environment and browsers. The test command binds a temporary HTTP server to an OS-selected port on 127.0.0.1, closes its browsers and server, prints failures only and one final count, and saves detailed results under `test-artifacts/`.

Tests cover a complete AI-driven three-case playthrough using ordinary movement and interaction, Rapier contacts and avoidance, both floor transport systems, damage immunity, collectibles, win/loss/restart, controller emulation, local co-op, actual touch taps and repeated jumps while movement is held, live sound-effects gain, live tools, animation, offline-rendered synthesized audio samples and attract mode. Four AI Hub harness scenarios cover two players, four players with 150 ms latency / 50 ms jitter / 5% loss, host departure and a separate server host. The two-player scenario also checks two short guest jump taps through the real Hub transport. TV-size and phone screenshots are saved for visual inspection. The graphics recovery path keeps simulation and inputs alive while a replacement context is created.

The in-game credits and the root `exit-interview.json` contain the required source information and feedback. Usage is added on import by the runner. Physical controller feel, real mobile devices, audio listening quality and hardware GPU behavior are unknown in this headless environment.

The random title selection is recorded in `title-selection.json`: a real `node:crypto.randomInt` draw from fifty internally brainstormed candidates.

## Files

- `src/`: game, mall/character geometry, audio, UI and credits metadata.
- `build.py`: embeds the bundle, unmodified Hub client and license notices into the final HTML.
- `vendor/`: the specified AI Hub protocol/client/harness files and third-party license texts.
- `test_game.py`, `test.sh`: the single-command regression suite.
- `test-artifacts/`: detailed reports and inspection screenshots.

Three.js is MIT licensed. Rapier is Apache-2.0 licensed. Their notices are embedded in the final HTML. This is an original fan-inspired demo; Keystone Kapers is its inspirational source.
