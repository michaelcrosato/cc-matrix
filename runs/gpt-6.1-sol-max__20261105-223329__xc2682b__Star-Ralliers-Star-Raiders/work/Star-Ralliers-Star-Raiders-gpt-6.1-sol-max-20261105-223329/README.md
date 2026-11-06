# Star Ralliers

**The last light needs a wingman.** An original cockpit combat / light strategy game inspired by the 1982 releases of Atari Star Raiders, primarily the Atari 5200 version.

Open the single HTML file in the parent folder. Three.js r180 and Rapier 0.19.3 load from pinned HTTPS CDNs; an internet connection is needed on first load. WebGPU is preferred, with a WebGL2 fallback. Fonts, geometry, textures, writing and synthesized audio are in the HTML. Music defaults to 10%.

Launch a patrol, clear D3, B2 and E1, protect the two relay bases, then dock at a surviving base. Docking also repairs and refuels during the mission. Close to 190 meters to defeat the Crown flagship's shield. A five-by-four galactic chart, guided twin photons, ion boost, shock pulse, shields, engine damage, meteor fields, aft view, repair shuttle and mission ranking are all playable.

- Controller: left stick steer; right stick throttle / roll; R2 fire; L2 boost; triangle target; square pulse; circle shields; D-pad up chart; D-pad left aft view; cross jump / dock; Options pause. Settings can show Xbox glyphs. Right stick scrolls long menu panels.
- Keyboard / mouse: mouse steer; WASD yaw / throttle; arrows steer; left click or Space fire; Shift boost; F target; Q pulse; C shields; R aft view; Tab / M chart; E / Enter jump / dock; X stop; Esc / P pause. Clicking the viewport captures the mouse; Escape releases it.
- Touch: invisible left steering and right thrust controls, assisted fire and defensive pulse, context action and pause buttons.

The title starts an AI-played attract loop after ten idle seconds. Any input returns to command.

Pause → Developer tools offers invulnerability, autopilot, refill, fleet clear, enemy spawn, collision outlines, simulation freeze, sector jumps, restart and eight live balance sliders with reset.

## Multiplayer

AI Hub Session Protocol v1, ghost mode, 1–4 pilots. Independent invasion simulations, visible wing ghosts, live scores and a mission result. No setup is needed inside AI Hub. Its official unmodified session client 1.4.0 is the first script in the HTML.

Outside the Hub, Rally a wing creates or joins a six-character room. WebRTC uses PeerJS 1.5.5 and its public signaling service; same-origin tabs also link with BroadcastChannel. Internet availability and restrictive NAT/firewalls can affect remote connections. There is no shared damage or co-op world: pilots compete on mission score while seeing wingmates in the same sector.

## Build and verify

`python3 build.py` rebuilds the root deliverable and the development index.html. Both are complete single-file builds. Font license notices are embedded in each HTML.

`./test.sh` runs all checks and prints only failures and a one-line total. It uses the installed Playwright Python environment, starts an ephemeral HTTP server bound to 127.0.0.1, and closes its browsers and server when finished. Modes `core`, `hub`, `visual`, and `smoke` select narrower checks. Reports and visual captures are in test-artifacts/.

Tests cover file:// WebGPU startup, physics versions, UI and developer tuning, synthesized audio signals, full patrols with and without invulnerability, shield / engine damage and repair, pulse, base siege, flagship shield, win / loss, emulated controller, touch, attract mode, standalone BroadcastChannel and WebRTC, WebGL2 fallback, WebKit touch fallback, and the official AI Hub harness at two and four players with impaired networking and host departure.

Research and feedback are in the game's About / Credits screen and the parent exit-interview.json. Native hardware controls, real iOS devices and subjective audio listening are unknown in this headless environment.
