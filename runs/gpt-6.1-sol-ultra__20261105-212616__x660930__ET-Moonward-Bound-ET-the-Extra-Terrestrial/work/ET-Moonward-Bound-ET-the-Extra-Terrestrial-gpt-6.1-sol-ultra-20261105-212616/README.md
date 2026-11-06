# E.T. Moonward Bound

A complete, three-act, 1–2 player neighborhood adventure inspired by E.T. the Extra-Terrestrial (1982).

Open the single HTML file beside this folder in a modern browser. It uses Three.js r180 WebGPURenderer and Rapier 0.19.3 from pinned CDNs. The first launch needs a network connection. WebGPU is preferred; the same renderer supplies WebGL 2 compatibility when WebGPU is unavailable.

Ride through the neighborhood to borrow three signal-machine parts. Avoid sweeping searchlights with slow movement or a friendship glow. Revive flowers and follow candy to recover friendship. At the forest clearing, echo the four-note light pattern. Then steer the bicycle through starlight rings, rise over search vans, and reach the visitor's ship.

- Move: left stick / WASD or arrows; click ground to ride.
- Interact: Cross / E.
- Glow, or hold to lift during flight: Square / Space.
- Sneak, or boost during flight: L2 / Shift.
- Camera: right stick / drag the world.
- Pause: Options / Escape. Developer playground is in Pause.
- Signal: Square, Cross, Circle / 1, 2, 3; mouse and touch can choose lights directly.
- Touch: invisible left thumbstick, right thumb camera, contextual action, assisted flight.

Bring a friend from the menu. Same-device rooms use a short neighborhood code. Direct online play exchanges an invitation and a reply using WebRTC; some networks may prevent direct connections. AI Hub connects its sessions automatically. Both players share progress, can retrieve parts, and can glow to protect their friend.

The title starts an AI-played attract adventure after ten seconds without input. Any input returns to the menu. A checkpoint is saved locally after finding parts and starting flight.

## Development

All authored modules and validation artifacts are here. `npm run build` makes a development `index.html` with local dependencies and the distributable HTML in the parent folder. `npm test --silent` runs the unified headless checks; it prints only failures and one count. The test runner owns and closes its OS-selected localhost server and browser.

`?webgl=1` forces the renderer's WebGL compatibility backend for visual inspection on headless machines whose WebGPU screenshots are blank. Normal play selects WebGPU automatically. `window.__game` exposes state and deterministic gameplay controls for scripted QA.

Credits and the machine-readable `exit-interview.json` beside the final HTML contain the requested source and testing reports.
