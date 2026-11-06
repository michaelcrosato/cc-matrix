# Super Breakbeat

An original space-arcade brick breaker inspired by Atari's Super Breakout (1981). Four fields form a complete campaign: classic, Double, Cavity and Progressive. No artwork or audio files are needed. Geometry, animation and sound are generated in code.

Open `../Super-Breakbeat-Super-Breakout-gpt-6.1-sol-ultra-20261106-011159.html` directly in a current browser. The HTML contains Three.js r180, Rapier 2D 0.19.3 (including WASM), the original AI Hub session client, and all game code. Optional Google Fonts have local system fallbacks. WebGPU is preferred; WebGL2 is selected automatically when WebGPU is unavailable at startup. Add `?renderer=webgl` to force WebGL2 for headless visual inspection.

## Play

- Left stick, A/D, arrows, mouse or finger: move the paddle.
- Cross / A, Space, Enter, left click or tap: serve.
- Square / X, Shift, right click, two fingers or the touch Beat button: spend a full beat meter to send falling balls upward and widen the paddle temporarily.
- Options, Escape, P, or Menu: pause/menu.
- Hit an edge to steer the ball. Reach the roof and your paddle shrinks for the rest of that serve. Losing the last active ball costs one of five serves.
- Couch co-op: pilot 1 uses A/D; pilot 2 uses arrows. Two standard-mapped controllers also work. The lower paddle belongs to pilot 1; upper to pilot 2. Score, beat charge and serves are shared.

The title starts a looping autoplayer after ten idle seconds. Any input exits. All four field types appear in the loop.

## Multiplayer

AI Hub automatically starts the embedded shared-world session; its host owns Rapier physics and sends snapshots. Both players share the outcome. The downloaded official `session.js` is embedded unmodified as the first script. See `network-integration.md` for protocol and lifecycle details.

Standalone **browser rooms** connect two tabs or windows on the same browser and origin using BroadcastChannel. Create a browser room, enter the code on the second page, and start from the host. For LAN/VPN devices, choose Direct Link: host copies an offer to the guest; guest returns an answer; host connects. This uses WebRTC local ICE without an external broker or TURN service. Internet rooms are provided by AI Hub.

## Live tools and authoring

Pause → Developer controls exposes ball speed, paddle width/response, acceleration, advancing-wall speed and aiming assistance as live sliders. Autopilot, infinite serves, field skip/clear, beat refill and defaults reset are included.

`core.js` contains `STAGES`, `DEFAULTS` and authoritative campaign/physics rules. `scene.js` handles toon geometry, ink edges, native Three.js AnimationMixers and procedural particles. `audio.js` synthesizes music (default 10%), effects and gibberish voice. `main.js` owns controller/keyboard/mouse/touch input, UI and session lifecycle. `network.js` owns transport. `exit-data.json` supplies the in-game credits and root exit interview.

## Build and verification

Dependencies are pinned in package-lock.json. If needed, run `npm ci`; this machine already has Node. Run `npm run build --silent` to regenerate the single root HTML and root `exit-interview.json`.

Run **`npm test --silent`** for all validation. The command prints only failures and one final check count. It runs:

- Rapier collision, paddle aiming, five-serve, multiball/cavity, beat, descent, tuning, co-op and natural full-campaign checks.
- Package integrity, exact original Hub client and exit-interview structure.
- Headless Chromium WebGPU startup, standard gamepad emulation, keyboard, settings, developer tools, pause, touch profile and offline audio analysis.
- A natural browser campaign through all four fields and real result transitions; attract loop; rendered-field evidence.
- Two-page standalone co-op, WebRTC direct links and the official AI Hub harness: standard, host departure, dedicated server, latency/jitter/loss.

Tests start only their own localhost servers on OS-selected ports and close their browsers and servers. Python Playwright uses the provided pipx environment. Screenshots use WebGL2 because software WebGPU captures can be blank; WebGPU is verified from live renderer state. Real controllers, real touch hardware, iOS Safari and Internet NAT traversal are unknown.
