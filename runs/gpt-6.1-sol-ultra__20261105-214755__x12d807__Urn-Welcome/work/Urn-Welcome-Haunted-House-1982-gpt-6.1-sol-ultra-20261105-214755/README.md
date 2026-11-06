# Urn Welcome

Make yourself unwelcome. An original horror exploration game inspired by Haunted House (1982).

Open the HTML in this workspace’s root in a current browser. Everything needed for solo play is embedded, including Three.js and the Rapier WebAssembly physics module. No server or asset downloads are needed. WebGPU is the primary backend; the engine provides a WebGL2 fallback.

Recover an urn fragment on each of three floors, then return to the entrance. Find the brass key in the ground-floor parlor. You can carry one tool; swapping to the ward drops the key. Matches run out and wind extinguishes them. Relight freely, use a flash to repel enemies, and light sanctuary candles to recover courage. Bats steal tools, spiders slow you, and ghosts take your nerve.

WASD/arrows or left stick moves; E/Cross interacts; Space/Square relights or flashes; Q/Triangle drops a tool; M/Touchpad opens house notes; Esc/Options pauses. Mouse clicks move and interact. Touch uses a drag stick, assisted matches/pickups and a contextual action. PlayStation and Xbox prompts are selectable in Settings.

The pause menu includes live balance sliders and developer tools. The title starts a looping autonomous demonstration after ten seconds of inactivity. Any input returns to the title.

Co-op supports AI Hub sessions, same-browser tab rooms, and direct remote WebRTC invitations. Remote players exchange an invitation and answer in Play together. Direct connections use STUN and require peer connectivity; there is no TURN relay. AI Hub manages its own session network.

Development: `npm run build` creates the root HTML and local index.html. `npm test` runs gameplay, emulated controller/touch, audio, real co-op/WebRTC, and all four AI Hub conformance scenarios sequentially. It prints only failures and a final count. After a change limited to one subsystem, `npm test -- --suite co-op` (or `game`, `network`, `hub`) refreshes the affected result and combines it with the saved results from the other suites. Servers bind only to 127.0.0.1 with OS-assigned ports and close on completion. Tests use the installed Playwright Python environment.

Source modules, tests, screenshots and dependency notices are in this directory. The exit interview is beside the root HTML and is also embedded in About the house.
