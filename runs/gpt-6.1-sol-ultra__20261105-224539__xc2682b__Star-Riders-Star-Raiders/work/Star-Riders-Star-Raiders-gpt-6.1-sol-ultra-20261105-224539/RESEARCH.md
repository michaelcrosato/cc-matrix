# Research and adaptation

Research was completed before implementation.

- [Atari 2600 Star Raiders manual, CX2660 (1982)](https://www.atariage.com/2600/manuals_old/star_raiders.html): forward cockpit, galactic map and energy-consuming hyperwarp; fighters, cruisers and close-range shielded basestars; twin torpedoes on lock; shield and subsystem damage; base recharging; an asteroid belt near the end; mission ratings. The presentation is sparse starfields, tiny enemy silhouettes, colored instruments and short electronic warnings.
- [Atari 5200 Star Raiders manual (1982)](https://atariage.com/manual_html_page.php?SoftwareID=2106): training and command-briefing tone, forward and aft views, attack computer, sector scan, station docking and threat, four mission skill levels, and passive cruisers that defend themselves. This is a port of the earlier computer game; the 1982 source label is ambiguous between these ports.
- [Three.js WebGPURenderer official manual](https://threejs.org/manual/pages/webgpurenderer): asynchronous initialization, supported node/material path and WebGL 2 fallback. Pinned package: `three@0.180.0`.
- [Rapier JavaScript getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js/): compatibility package, WASM initialization and physics world. Pinned package: `@dimforge/rapier3d-compat@0.19.3`; ray queries use that version's published TypeScript declarations.
- [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub): unmodified client, readiness, clock, ghost transport, progress, result and end lifecycle. Unmodified harness fixtures are under `vendor/`.

Star Riders is an original adaptation. It uses six curated patrol sectors rather than copying a historical map, new original spacecraft and stations, cel-shaded ink art, proximity-weighted station pressure, a two-station repair network, a command-ship finale, and ghost competition. It retains the source's strategic energy choices, direct cockpit combat, forward/aft awareness and terse command tone. Its music is a new code-synthesized score rather than a recreation of source audio. No source game assets or recordings are included.

The title was selected by Python `secrets.randbelow(50)` after a list of fifty candidates. `selection.json` records the selected title and random index.
