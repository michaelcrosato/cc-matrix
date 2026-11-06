# Research and provenance

Research completed before implementation on 2026-11-06.

- Original Mattel instructions: https://history.blueskyrangers.com/instructions/autoracinginst.html . Confirmed automatic acceleration, brake release to accelerate, five laps solo, two points for an opponent crash, one for a lead of about twelve lengths, fifty-point original duel, checkpoint restarts, car speed ratios 55:65:75:90:90, tan/blue equality, scenery/grass/water, and screen-direction steering in the original release. No course tracing or original code/assets used.
- Blue Sky Rangers historical account: https://history.blueskyrangers.com/mattelelectronics/games/autoracing.html . The correction above the old account reverses its incorrect steering chronology. Confirmed connected wrapping geography and hidden straight. Original release October 1980, programmer Larry Zwick, developed by APh for Mattel.
- Examined archival gameplay still AutoScreen.gif from that history page: small pale open-wheel car, light grey unmarked road with angular bends, dark green countryside, tan buildings with roof shading; north-up overhead composition. Box illustration is a separate reference and is not used as game art.
- Scanned original manual: https://evercade.info/wp-content/uploads/2022/02/Auto_Racing_-_1979_-_Mattel_Electronics.pdf . Inspected controller and instructions illustrations. Exact course measurements and music remain unknown. Archival video https://www.youtube.com/watch?v=HhExGepv2j0 was located but could not be played by the research tool; no claims are based on hearing or watching it.
- Original additions: AI, guided tour, bounded new county, direct WebRTC, modern touch/controller UI, passport, saved ghosts, recovery penalties, two-lap and ten-point presets. All track geometry and game artwork are original.

## Imported contracts

- my-3D2dge 0.89.1, commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Full handoff under vendor/engine (symlink to sparse pinned repository). Read README, API, ASSETS, DRIVE, KART and its test approach. Engine MIT copyright 2026 Michael Crosato; full license retained at vendor/engine-repo/LICENSE and in generated HTML. No replacement renderer or other engine.
- AI Hub Session Protocol 1, client 1.4.0, commit 35a1047f2067b2af3de3943f0fe452f39105d869. Full lib/hub reference and harness under vendor/hub. session.js inlined unchanged. Its copyright/notices retained. A separate repository license was not found in the sparse root; additional licensing terms unknown.
- WebRTC official guidance https://webrtc.org/getting-started/peer-connections and MDN RTCPeerConnection/createDataChannel documentation consulted. Non-trickle gathering and bounded unreliable channels follow those contracts. Clipboard is optional. No audio/video permissions.

## Local engine adaptations

The upstream engine is unchanged. Game code uses E.Car with reverse:0 and explicitly freezes countdown bodies, passes analog intents, owns directed gate/race rules, and separates coincident bodies before native contact resolution. It extends E.Shell and uses native shapes, pixels, particles, tweens and audio buses.

Source references are research, not redistributed game assets. Reference GIFs in docs are inspection evidence only; the game contains no raster or audio files.
