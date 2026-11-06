# Ice Hockey Puck Wild

Open the HTML file beside this folder. It is the distributable game. Internet access loads pinned Three.js r180 and Rapier 0.19.3 modules, plus optional display fonts; no server is necessary for solo, couch or direct-link play.

## Play

Three 45-second periods of two-skater arcade hockey, with automatic goalies and sudden death on a tie. Skills Club teaches all five core actions. Three passes charge the team's Wild Shot. The title starts an AI exhibition after ten idle seconds; any input returns to the menu.

- Controller: left stick skate, right stick aim, Cross pass, hold Square or R2 then release to shoot, Circle check, L1 switch, R1 boost, Options pause. Xbox prompts are available in settings.
- Keyboard: WASD skate, mouse aim, E / right mouse pass, hold Space / left mouse then release to shoot, F check, Q switch, Shift boost, Esc pause.
- Couch player 2: arrows skate, J shoot, K pass, L check, U switch, O boost. Two standard gamepads also work.
- Touch: invisible left stick; drag on the right to aim and release to shoot or check. Tap right to pass. Full movement boosts. Only the menu button and contact-sensitive hints appear.

Pause → Developer rink provides live skating, shooting, AI, drag, period, check-range and simulation-speed sliders, reset defaults, puck delivery, stamina / Wild Shot refill, score adjustments, period advance, face-off reset and match finish.

## Multiplayer

AI Hub: protocol-v1 shared-world host authority, two seats. The exact Hub client is embedded first in the document head. Host updates the physics and sends snapshots; guests send inputs. A playerless server is supported. No title or extra start confirmation appears in a Hub round.

Standalone two-device play: Friend menu → Direct link. Host creates and shares the invite, guest accepts it and shares the answer, host accepts the answer. Codes carry WebRTC connection descriptions. A STUN server assists address discovery. No TURN relay is included, so restrictive NAT/firewall combinations may prevent the connection.

Same-browser play: Friend menu → Local browser room. Open the same game twice on the same origin, host in one tab and join the six-character room in the other. BroadcastChannel is local to that browser/origin. A localhost server can make same-origin behavior more consistent than file URLs.

## Development

Source modules are deliberately small and editable: `physics.js` owns fixed-step Rapier simulation, `visuals.js` owns the procedural Three.js scene and native animation clips, `audio.js` owns synthesis, `network.js` owns transports, and `game.js` owns input, UI and lifecycle. No generated art or sound files are needed by the game.

Rebuild: `python3 build.py` (writes the distributable HTML in the parent folder). `write-metadata.py` writes About/feedback data and the root `exit-interview.json`; run it before rebuilding after metadata changes.

Verify everything with one command from this folder: `./test`. It prints only failures and one total. Tests use the already installed Playwright Python, ephemeral loopback servers and their own browser processes; no shared ports/processes are changed. The suite covers core physics and full shortened match/skills playthroughs, audio samples, mocked-standard gamepad and touch input, settings/menus/attract mode, real two-page WebRTC/BroadcastChannel traffic, the official AI Hub conformance harness, and file-URL packaging. Visual inspection screenshots use the explicit `?webgl=1` compatibility renderer because headless WebGPU screenshots can be blank on this workstation.

Real controller hardware, real touch hardware, iOS Safari and cross-NAT internet behavior remain unconfirmed. Runtime defaults use WebGPU; the renderer can fall back to WebGL compatibility on unsupported browsers.
