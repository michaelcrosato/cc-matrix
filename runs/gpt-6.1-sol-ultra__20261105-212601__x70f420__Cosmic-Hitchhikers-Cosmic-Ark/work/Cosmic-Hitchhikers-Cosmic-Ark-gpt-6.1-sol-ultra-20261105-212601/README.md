# Cosmic Hitchhikers

An original, complete rescue arcade game inspired by Cosmic Ark (Imagic, 1982).

The shareable deliverable is `../Cosmic-Hitchhikers-Cosmic-Ark-gpt-6.1-sol-ultra-20261105-212601.html`. Open it directly from disk in a current browser. All JavaScript, physics WebAssembly, art and sound are embedded; no downloads or server are needed for solo play. Native WebGPU is preferred, with the same Three.js renderer's WebGL 2 backend as a compatibility fallback.

## Play

Protect the Ark from incoming meteors, descend to each of three planets, tractor a pair of creatures aboard, and deliver them to the Ark. Gold armored rocks take two shots; pink rocks weave. Sentry targeting lines warn before firing. A shield pulse clears nearby dangers and protects briefly. Getting hit on the surface releases one passenger. A timed emergency recall leaves undelivered cargo behind, preserving already docked passengers. Rescue all six and defend the final escape to win. Energy and score persist throughout the campaign.

- Keyboard: WASD / arrows to aim and automatically fire in space; the same keys fly the shuttle on planets. Space beams. Shift pulses. Escape or P pauses.
- Mouse: hold to aim/fire in space; click a creature on a planet to approach and beam, then return to the Ark automatically. Keyboard movement cancels mouse approach.
- Standard gamepad: left stick / D-pad aim/fire or fly; right stick also aims; Cross / A or R2 beams; Circle / B or L1 pulses; Options pauses. Create + Options remains reserved for AI Hub. Menus use sticks / D-pad, Cross / A and Circle / B.
- Touch: invisible relative stick on the left; aim and tractor beam are assisted; touch the right side or the contextual pulse button for shielding; top-right menu button pauses.

The title starts a looping autopilot demonstration after ten seconds without input. Input returns to the title. Pause → Developer tools exposes eight live balance sliders, invulnerability, autopilot, physics outlines, energy refill, pair rescue and phase advance, plus reset defaults.

## Multiplayer

AI Hub Session Protocol v1 is embedded unmodified (client 1.4.0). Shared-world games support 1–4 players, use a host-authoritative simulation, synchronized start, remote input and world snapshots, dedicated server hosts, time-up scoring and end silence. Crew steering combines, and anyone can beam or pulse. AI Hub supplies cross-device transport; this file does not open a broker connection.

For standalone same-device play, Crew link uses BroadcastChannel to connect 1–4 tabs of the game in one browser using the same code. A host launches the mission. Tabs must share an origin; if file-origin channels are isolated in a browser, serve this directory locally. The interface labels this local link accurately. Multiple local controllers also share the helm.

## Development

`npm install` installs exact versions; `npm run build` regenerates the root HTML. `npm test` is the single verification command and prints failures plus one total. It includes the full scripted campaign, native Rapier collision tests, scene/animation integrity, real browser input tests with emulated gamepad and multitouch, offline synthesized audio checks, local-tab co-op and all four official AI Hub harness scenarios. Browser tests use the existing Python Playwright environment and create their own loopback server with an OS-selected port, then shut it down.

For visual screenshots only, `?webgl` chooses Three.js's WebGL backend because headless WebGPU capture on this machine can be blank. Default play uses WebGPU when available.

`simulation.js` owns all gameplay. `PLANETS` is the campaign/species data and `DEFAULTS` is the balance configuration. `visuals.js` owns all procedural models and native AnimationMixer clips. `audio.js` owns all synthesized audio. `network.js` owns transport. `main.js`, `style.css` and `index.template.html` own input, menus and presentation. `credits-data.json` is bundled into the About screen; the root `exit-interview.json` is the matching catalogue record.

## Research

- Original 1982 game manual: https://www.atariage.com/2600/manuals_old/cosmic_ark.html
- Original screenshots: https://atariage.com/screenshot_page.php?SoftwareLabelID=104
- Archived contemporary TV Gamer review: https://www.ataricompendium.com/archives/magazines/tv_gamer/tv_gamer_autumn83.pdf
- AI Hub reference: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- Three.js WebGPURenderer and Rapier official documentation.

The source alternates four-direction meteor defense and timed shuttle rescues of two creatures, with fuel, warning blasts and automated planetary defenses. Its star-filled, sharply colored silhouettes, alert blips and beam sounds informed this game's original cel/ink presentation and synthesized effects. No original game assets are included in the playable HTML. The title was selected with Python `secrets.randbelow(50)` from fifty brainstormed riffs (selection record in `selection.json`).
