# Rink or Swim

An original arcade hockey demo inspired by Activision's **Ice Hockey (Atari 2600, 1981)**.

Open the root `Rink-or-Swim-Ice-Hockey-1981-gpt-6.1-sol-max-20261105-191403.html` directly in a current browser. Internet access loads pinned Three.js R180 and Rapier 0.19.3 modules and optional Google Fonts. The game has no image or audio file dependencies. Three.js uses WebGPU on hardware adapters and supports WebGL2 as a compatibility backend. Known software adapters select that backend before a WebGPU device is created, because the supplied SwiftShader WebGPU device was lost during validation.

## Play

- Skate: left stick / WASD or arrows. Aim: right stick / mouse.
- Shoot: hold then release Cross (Xbox A), R2, Space or left mouse.
- Pass: Square (Xbox X), R1, E or right mouse.
- Check: Circle (Xbox B) / Q. Switch: Triangle (Xbox Y), L1, R or Tab.
- Pause: Options / Escape. Controller glyph preference is in Clubhouse → Settings.
- Shared-keyboard coral player: arrows, Enter or 0 to shoot, `/` to pass, `.` to check.
- Touch: invisible left thumb stick, right drag to aim and release to shoot, context-sensitive action buttons. Checks and aim receive assistance.

Teal attacks the right goal; coral attacks the left. Each side has a forward and a goalkeeper. Control follows the puck, with an optional manual switch. Goalkeepers stay in their own half. Skate School teaches all six actions. The Breakwater Cup has three 90-second rounds, increasing opposition and ice speed, and sudden-death overtime. Exhibition supports one-, three- and five-minute periods and two ice speeds. Ten seconds without input at the title starts a looping AI exhibition.

Pause → Dev Mode exposes live skating speed, shot power, grip, AI skill, check force, shot assist and clock, with default reset, puck possession, face-off, scoring and period tools.

## Multiplayer

Standalone Versus offers local two-player play and private online 1v1 room codes. Online rooms use PeerJS 1.5.5's public signaling service and browser WebRTC with STUN; remote connectivity depends on the relay and network NAT/firewall. Two windows on the same origin use BroadcastChannel. The host runs physics and sends snapshots; the other device sends input. AI covers a disconnected rival.

AI Hub uses the unmodified session client 1.4.0 and protocol v1, `shared-world`, 1–4 seats. Seats alternate teal/coral; with four people each controls one skater. A host with no local player can run the simulation. Sessions open straight into the round, wait for the hub clock, respect the hub's Create+Options chord, finish on time-up, and stop on end. No standalone signaling runs in hub sessions.

## Develop and verify

All development and test assets stay in this directory. Run `npm run build` to create the root single-file deliverable and the identical `game.html` test copy. Run `npm test` for the consolidated browser suite; it prints failures and one result count and saves detailed JSON reports. It starts its own HTTP server on 127.0.0.1 with an OS-selected port and closes it and the browsers afterward. Playwright uses the existing local browser install.

`?renderer=webgl` requests the compatibility renderer for visual inspection when software WebGPU captures a blank canvas. The default remains WebGPU. Screenshots cover visual composition; state assertions cover rules and flows. State tests suppress subsequent draw calls after verifying a real rendered scene, so shared-machine GPU load does not determine gameplay test timing.

`title-draw.json` records 50 brainstormed names and the actual crypto RNG selection. `hub-README.md` preserves the integration contract researched. `exit-data.json` is bundled into the in-game Source Information and feedback screens; its final contents are also delivered as root `exit-interview.json`.

## Research

- Original instructions: https://atariage.com/manual_html_page.php?SoftwareLabelID=241
- Archived visual reference: https://videogamecritic.com/images/2600/ice_hockey.png
- Three.js WebGPU: https://threejs.org/docs/pages/WebGPURenderer.html
- Rapier: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- AI Hub: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

The original's two-on-two layout, three-minute clock, 32 forward shot angles, automatic nearest-player control, body checks, restricted goalie/forward zones, regular/high-speed variants and board banks informed the new rules. Its manual confirms a pickup click. Original soundtrack details are unknown. All demo geometry, textures, animations and synthesized sounds are newly created.
