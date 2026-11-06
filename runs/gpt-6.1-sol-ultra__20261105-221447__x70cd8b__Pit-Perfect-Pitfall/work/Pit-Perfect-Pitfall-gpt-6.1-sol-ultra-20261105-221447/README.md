# Pit Perfect

Good feet. Bad footing. A complete ink-and-canopy adventure inspired by Pitfall! (1982).

Open `../Pit-Perfect-Pitfall-gpt-6.1-sol-ultra-20261105-221447.html` in a current Chrome or Edge browser. The one-file game loads pinned Three.js r180 and Rapier 0.19.3 from jsDelivr, so the first load needs internet access. WebGPU is the primary renderer; Three.js automatically supports its WebGL2 backend where necessary. `?webgl=1` explicitly selects that backend for visual inspection in headless environments.

Move with the left stick, D-pad, A/D or arrow keys. Cross / Space jumps, catches vines and releases them. Square / E or up/down uses ladders. Options / Escape pauses. Menus support the controller, keyboard, mouse and touch. On touch, drag the left half to move and tap the right half to jump; a contextual button appears near ladders and vines.

Collect all twelve treasures and reach the eastern gate. Logs cost points; other hazards cost courage. Trail markers restore a heart and establish a checkpoint. The field guide explains crocodile timing, quicksand, tunnels and treasure values. An eight-minute clock and complete victory/defeat screens frame the expedition. The title screen starts a looping scripted tour after ten seconds without input.

The pause menu's Expedition Workshop exposes live speed, jump, gravity, vine rhythm, hazard rhythm and daylight sliders, invincibility, refills, region skips, treasure collection, physics visualization and reset. These tools are limited to solo play.

## Multiplayer

- AI Hub: Session Protocol v1, ghost mode, one or two seats, automatic loading/readiness/start, ghost snapshots, progress and final scores. The original unmodified `hub/session.js` is embedded before game code.
- Same browser: choose Race a friend, create a local room, then join its code in another tab. Each player starts their own expedition.
- Direct online: create an invitation, send that code to a friend, have them create an answer, then paste and accept their answer. WebRTC transports game state directly. External NAT/firewall behavior is unknown; there is STUN but no TURN relay.

## Development and verification

All source files live here. `npm run build` bundles local modules and credits into the root HTML and writes the root `exit-interview.json`. Pinned external dependencies remain CDN imports. No image or audio assets are required.

Run `npm test --silent` for the complete quiet regression command. It prints failures and one final count. It starts its own server bound to 127.0.0.1 on an OS-selected port, uses the installed Playwright browser, and closes its browser and server afterward. It checks native WebGPU initialization, Rapier platforming, the complete physical playthrough, menus, controller and touch input, procedural sound levels, two-page BroadcastChannel/WebRTC, and three official AI Hub harness scenarios. `playthrough-result.json` records the full route's outcome.

The scripted route uses regular movement, jumps, vine catches/releases and ladders. It does not teleport, grant invincibility or call the collection API. Isolated regression cases use the Workshop's teleport tools to exercise individual mechanics quickly.

Research: the original Atari 2600 manual, period visual and sound descriptions, official Three.js r180/Rapier documentation and the AI Hub Session Protocol. The name was selected using Node's cryptographic randomInt from fifty original candidates.
