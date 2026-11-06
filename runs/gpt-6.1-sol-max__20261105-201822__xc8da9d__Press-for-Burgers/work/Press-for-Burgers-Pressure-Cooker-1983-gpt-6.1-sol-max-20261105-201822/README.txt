PRESS FOR BURGERS — Good food. Fast hands.

Open the HTML beside this development folder in a modern browser. Solo and local
co-op work offline, including all engine, physics, artwork and audio code.
WebGPU is preferred; Three.js’s WebGL2 backend provides compatibility and recovery.

A service has three shifts and 15 burgers. Catch the requested toppings, carry
completed burgers to their numbered/color-coded windows, and keep rating above zero.

CONTROLS
Move: left stick / WASD / arrows. Handle: Cross / E / Space. Return: Circle / R.
Dash: Square / Shift. Belt brake: R1 / Q. Pause: Options / Escape.
Mouse: click the floor to move, a belt burger to handle it, or a window to deliver.
Local chef 2: arrows, Enter, Backspace, Right Shift; or a second standard gamepad.
Touch: drag anywhere; placement, pickup and delivery are assisted. Tap a destination.
Xbox glyphs, helping hands, synthesized voices and audio levels are in Settings.

MULTIPLAYER
The Friends menu supports two local players and up to four in standalone rooms.
Host shares a six-letter code. Internet uses PeerJS WebRTC with its public signaling
service; same-device tabs use BroadcastChannel. Internet requires connectivity and
may depend on NAT/firewall behavior. AI Hub sessions use only the Hub protocol and
host-authoritative snapshots, including a dedicated host without a local player.

DEVELOPMENT
npm run build — bundle all dependencies and game modules into the root HTML.
./verify — run all checks; prints failures only and one summary count.
See test-results.json for detailed checks. Test screenshots inspect visual layout.
The browser flags add --use-angle=swiftshader to the provided WebGPU software flags.
Physics runs at 60 fixed steps per simulated second. Tests use a timer-backed browser
animation callback while rendering is suspended, so a software GPU cannot prevent
input, menu, network and simulation checks from advancing. GPU submission and device
recovery are checked separately with real WebGPU and WebGL2 frames.

DEV MODE
Pause > Chef’s toolbox. Seven balance sliders, invincibility, auto chef, heal, skip
shift and reset defaults. Dev modifiers are deliberately unavailable in Hub sessions.
The title starts an AI-played, looping attract service after ten idle seconds.
Any input returns to the title. Rankings and settings persist in local storage.

All required source information, feedback and third-party credits are in About.
The root exit-interview.json contains the same record and catalogue metadata.
