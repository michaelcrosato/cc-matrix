# Star Reclaimers

Open the HTML file in the parent directory. It contains the complete game, Three.js r180, Rapier 0.19.3 and its WebAssembly, synthesized audio, procedural assets and the unmodified AI Hub client. No CDN or build server is needed to play. Chrome or Edge uses WebGPU; the engine’s WebGL2 backend supports other capable browsers and recovers from a lost WebGPU device.

## The operation

Defend Kestrel (01), clear Ember Belt (02) and Picket (03), then chart a jump to Broken Crown (05). Destroy the two cyan shield relays before firing on the command core. Return to Kestrel and dock to complete the operation. Haven (04) offers a second repair dock; Quiet Drift (06) has energy caches and old mines.

Cannons, shields, boosts and hyperspace consume energy. Destroyed raiders leave salvage. Clear hostiles, approach a station’s cyan ring, slow below 90 m/s, and dock to restore hull, shields, energy and three nova charges. A reserve reactor restores enough energy to escape. Damaged hulls slow the cannons until repaired.

## Controls

| Action | Keyboard / mouse | Standard gamepad |
| --- | --- | --- |
| Steer | Mouse; arrow keys | Right stick |
| Throttle / strafe | W S / A D | Left stick |
| Fire | Click / Space | R2 / RT |
| Boost | Shift | L2 / LT |
| Shields | C | Cross / A |
| Nova | X | Circle / B |
| Dock / tractor | F | Square / X |
| Cycle target | T / Tab | Triangle / Y |
| Chart | M | L1 / LB |
| Jump | J | R1 / RB |
| Cockpit / chase | V | R3 / RS |
| Roll | Q / E | — |
| Pause | Escape | Options / Menu |

Touch uses invisible left and right sticks, assisted targeting, shields and fire, and contact-sensitive docking/salvage. Prompts follow the most recent input; Settings selects PlayStation or Xbox glyphs. Music defaults to 10%.

Pause → Flight lab opens developer mode: live cannon damage, incoming damage, aggression, cruise speed, fire interval, energy consumption and jump duration; reset defaults, repair/rearm, invulnerability, sector clear, command reveal, enemy spawn, return home, AI pilot, restart and complete-operation tools. Developer tools are unavailable in AI Hub sessions.

Ten seconds without title/menu input starts a looping AI exhibition of all six sectors. Any input returns to the title.

## Multiplayer

AI Hub automatically runs ghost patrol races for 1–4 pilots, with seeded operations and wingmate holograms in matching sectors. The host can leave without stopping the remaining pilots. The hub handles invites, progress, scores, timing and results.

Standalone supports two pilots through a WebRTC data channel. In Wingmate link, pilot one creates and shares an offer code. Pilot two pastes it, creates a reply, and sends that code back. Pilot one pastes the reply and connects. Launch linked patrol starts both operations. A same-browser BroadcastChannel link is also provided. Ghosts never collide and do not damage enemies in another pilot’s operation. Direct WebRTC uses a public STUN service; restrictive NAT/firewall configurations without a usable direct path require AI Hub instead.

## Development and verification

All original code is split into `game.js` (simulation/campaign/input), `visuals.js` (procedural scene/animations), `ui.js`, `audio.js`, `network.js` and `shell.html`. `metadata.json` supplies the About screen and the root exit-interview record. `design.md` records the design, and `title-draw.json` records the real random draw from 50 candidate titles.

Build with `npm run build`. Dependencies are pinned in `package-lock.json`; a fresh development checkout can use `npm ci --ignore-scripts`.

Run the complete verification command:

```
npm --silent test
```

It prints only failures and a one-line count. The tests use the installed Python Playwright environment, bind their own HTTP server to 127.0.0.1 on an OS-assigned port, and close all their own browsers and server. They cover pinned-engine startup and framebuffer readback, actual Rapier cannon hits, controls and menus, campaign and boss gating, salvage, repair and reserves, death, a full operation, emulated standard gamepad, touch multitouch, WebKit iPhone fallback, synthesized audio, all-sector attract replay, actual two-page WebRTC and local tab links, graphics-device recovery, and three official AI Hub conformance scenarios. Results and parameters are saved to `test-results.json`. TV and touch screenshots supplement state checks for visual composition; WebGPU’s headless compositor can return a blank/white screenshot, so offscreen framebuffer readback verifies that backend.

The playthrough uses invulnerability to isolate progression and ordinary weapons/collision rules. No physical controller, phone, TV, listening test or cross-network NAT traversal was available. Their behavior beyond the documented stand-ins is unknown.

`?test=1` exposes deterministic test/setup tools on `window.__STAR_RECLAIMERS__`; ordinary launches expose read-only state, audio and render diagnostics. `?renderer=webgl` explicitly selects the compatibility backend. There are no remote game assets, audio files or external gameplay services. The only network contacts outside AI Hub are the explicitly opened peer-to-peer link and its STUN negotiation.
