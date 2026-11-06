# Chopper Comman-Dough

**Hot cargo. Cold nerves.** An original, complete convoy-defense arcade demo inspired by *Chopper Command* (Activision, Atari 2600, 1982).

Open the HTML file beside this folder in a current browser. Everything is embedded, including Three.js r180, Rapier 0.19.3 and the fonts. No install, server or asset download is needed to play. WebGPU is the primary renderer; Three.js's WebGL 2 backend supports browsers without WebGPU.

Protect twelve flour trucks across four escalating dispatches. Shoot helicopters and jets, dodge splitting warheads, use rechargeable flares and boost, hover low and steadily to repair cargo, collect repair/overdrive supplies, earn convoy bonuses and extra reserves, and defeat the Crumb Collector's two-phase carrier attack. Losing all trucks or every pilot ends the flight. Ammo is unlimited; friendly fire is off.

## Controls

| Action | Keyboard and mouse | Standard gamepad |
| --- | --- | --- |
| Fly | WASD / arrows | Left stick / D-pad |
| Aim | Mouse while firing | Right stick |
| Fire | Left mouse / Space | R2 / Cross; right stick also fires |
| Boost | Left Shift | L2 |
| Flare | E / right mouse | Circle / R1 |
| Pause | Esc / P | Options; ignored while Create is held in Hub |
| Menus | Arrows, Enter, Esc, mouse hover/click | Stick / D-pad, Cross, Circle |
| Scroll credits | Wheel / focused content | Right stick |

Settings switch PlayStation/Xbox prompts, automatic cannon, camera shake, fullscreen, music and effects volumes. Music defaults to 10%. Sound starts after user interaction. All music, effects and radio gibberish are synthesized in code.

Touch uses an invisible left thumb stick, automatic aim/fire, right-side hold to boost, and a contextual POP flare button. Landscape and portrait are supported.

## Wingmen

- **On this screen:** two gamepads, or pilot 1 on normal controls and pilot 2 on IJKL, Enter to fire, right Shift to boost and U to flare. Stay near your wingman to share the camera.
- **Browser radio:** create a four-letter channel, then join it from other tabs in the same browser on the same origin. Up to four pilots. The flight leader launches everyone.
- **Two devices:** use Create Offer, exchange the offer, generate a reply, then Accept Reply. Copy/paste controls and a text field support manual pairing. WebRTC carries the shared world directly. STUN is used outside AI Hub; some restrictive networks cannot establish a direct connection. Cross-network NAT behavior is unknown on this machine.
- **AI Hub:** Session Protocol v1, unmodified 1.4.0 client; authoritative shared world for 1–4 seats, including a host with no player. The Hub owns start, time-up and results. No external signaling, broker, chat or custom names in sessions.

## Developer tools

Pause → Developer Flight Deck. Live sliders control flight speed, raider speed, incoming damage, cannon interval, flare recharge, truck armour, aim assistance and missile pressure. Also included: invulnerability, restore hull/cargo, next dispatch, supply drops, restart and reset balance. Network clients display the controls; the authority owns the simulation.

Leave the title untouched for ten seconds to watch the AI flight. It loops the campaign, demonstrates combat, boost, pickups, repairs and the carrier, and returns to the hangar on any input.

## Development and verification

`npm install --ignore-scripts` restores the two pinned libraries. `npm run build` bundles the game with the installed Bun CLI, embeds fonts and the unmodified Hub client, writes the root HTML and exit-interview.json, and copies the Hub harness beside the development build.

`npm test` builds and runs the headless checks. It prints failures and one final count. Reports, Hub check results and visual review screenshots are kept in `tests/artifacts/`. The suite starts its own HTTP server on an OS-assigned 127.0.0.1 port and shuts it down. It uses the preinstalled Python Playwright environment and browsers; no browser downloads are required.

`?test=1` exposes deterministic simulation controls on `window.__CCD` for the test suite. Normal play exposes only inspection, the credits record and audio instrumentation. `?renderer=webgl` selects the compatibility backend for visual inspection on headless machines whose WebGPU canvas is absent from screenshots.

Source Information and the full exit interview are in the in-game About / Credits screen and in the root exit-interview.json. Usage is added on import.
