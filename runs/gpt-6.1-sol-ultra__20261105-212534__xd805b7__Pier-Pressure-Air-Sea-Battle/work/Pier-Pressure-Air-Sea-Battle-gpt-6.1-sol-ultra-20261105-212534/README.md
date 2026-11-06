# Pier Pressure

A complete coastal artillery arcade demo inspired by Air-Sea Battle (1977).

Open the single HTML file in the parent directory. Three.js r180 and Rapier 0.19.3 load from pinned CDN URLs, so an internet connection is needed for those libraries. The game supports WebGPU with a WebGL 2 fallback. Append `?webgl=1` to request compatibility rendering.

## Play

- Controller: left stick aims, R2/RT or Cross/A fires, Square/X fires a charged broadside, Options/Menu pauses. D-pad/left stick navigates menus; Cross/A confirms, Circle/B returns. Right stick scrolls long menus.
- Keyboard/mouse: mouse aims, hold left click or Space fires, E or right click fires a broadside, Esc pauses. A/D also aims. Arrow keys and Enter navigate menus.
- Local second gunner: second controller, or J/L aims, Enter fires, U fires a broadside.
- Touch: hold anywhere in the world to fire with assisted aim. The contextual Salvo button fires the broadside without releasing the aiming contact.

Clear eight aircraft, stop ten convoy targets, then sink the Admiral. Red bombs damage the shared seven-point hull. Shoot green supply crates for repairs and broadside energy. Quick successive kills build a score multiplier. Between operations, the battery receives two repairs.

The title starts a looping AI demonstration after ten idle seconds. Any input returns to the title. Pause → Developer Tools offers eight live balance sliders, a defaults reset, repair/recharge, operation advance and autopilot.

## Co-op

AI Hub uses its shared-world session protocol and connects both gunners automatically. The host owns the simulation and shares snapshots; guests send gun inputs. The supplied upstream harness is under `hub-contract/`.

For standalone play, Radio Room supports two windows on the same HTTP origin using a short room code. For different devices, the host creates an invitation; the guest pastes it and sends the generated reply back; the host pastes that reply and presses Connect. This uses WebRTC with manual signaling and STUN. Connectivity on physical devices and networks requiring TURN is unknown.

## Build and verify

Run from the parent directory:

```sh
python3 Pier-Pressure-Air-Sea-Battle-gpt-6.1-sol-ultra-20261105-212534/build.py
/home/micha/.local/share/pipx/venvs/playwright/bin/python Pier-Pressure-Air-Sea-Battle-gpt-6.1-sol-ultra-20261105-212534/test.py
```

The one test command prints failures and a one-line count. It starts its own quiet server on an OS-selected 127.0.0.1 port and closes its own browser and server. `--dev` selects local library copies. `--screenshots` also records desktop and phone images using the compatibility renderer. Screenshots are for visual review; WebGPU gameplay is checked by state and actual Rapier collisions.

The report in the parent directory is embedded into About/Credits at build time. `qa-results.json` records the last suite results and playthrough evidence. The random draw is recorded in `selection.json`.

All game geometry, animation, particles, music, effects and gibberish voices are procedural. The embedded Pier Display font is a subset derived from Liberation Sans Narrow, licensed under SIL OFL 1.1; the license and copyright are preserved in the HTML source. Three.js, Rapier and AI Hub retain their upstream notices.
