# Research and shipped contracts

## Source actually inspected

- Scanned Mattel manual: https://mocagh.org/intvaction/addtot-manual.pdf (17-page PDF downloaded as source-manual.pdf; searchable text read through the research tool).
- Official manual transcript: https://history.blueskyrangers.com/instructions/addtarmininst.html. Cross-checked the two survival strengths, corresponding defenses, rotating six-item pack/two hands, food recovery, ammunition, hidden doors, one-way ladders, strength-changing gates, eye murals, and the need to collect treasure after defeating the Minotaur.
- Publisher history: https://history.blueskyrangers.com/mattelelectronics/games/addtarmin.html. The publisher’s gameplay screenshot was downloaded and visually inspected as source-gameplay.gif: strongly framed first-person corridors, a distant creature, martial/spiritual status, and visible held items. The credited source release is the 1983 Intellivision game.
- Representative screenshot gallery at https://www.intvfunhouse.com/games/dndt.php read for spatial context. Its prose was not used as authority for numeric source rules.
- The supplied YouTube lead https://www.youtube.com/watch?v=ZqhCM5Ntllo failed to load through the research browser. Full moving gameplay playback, original music and exact timbres remain unknown. The new music is an original code-generated composition, not a claimed reconstruction.

The three authored floors, original enemy names and silhouettes, deterministic damage, basic fallback attacks, fair container disarming, cooperative rounds, checkpoints and ending are adaptations. They do not claim numerical fidelity to the original cartridge.

## Engine

Unmodified my-3D2dge handoff 0.89.1 and World3D at revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Read handoff README/API card, native asset contract, World3D header/implementation and crawler kit `src/starter3d/70-crawler.js` before implementation. Reused its grid-to-render separation, fixed first-person camera, 32-unit cells and native shape/puppet/overlay pipeline; authored a new campaign and rules without the starter party or animation-timed combat.

Three.js 0.182.0 and Rapier SIMD compat 0.19.3 are the exact compatible vendored graph. Rapier’s WASM is embedded in the compat JS. Bun bundles this graph, full core, addon and game into one IIFE; the build escapes embedded closing script sequences. No runtime CDN, asset, JSON, WASM or neighboring-source request is necessary.

## Hub and WebRTC

Read pinned Hub README, session.js, bridge.js, round.js and shared-world arena example at revision `35a1047f2067b2af3de3943f0fe452f39105d869`. Session client 1.4.0 is inlined unmodified immediately after charset. The bridge exists only in the outer official harness.

The standalone workflow follows the platform RTCPeerConnection contract: create ordered data channel before offer, set description, await full ICE gathering and export current localDescription; guest returns an equivalently gathered answer. A versioned handshake and authoritative snapshot precede play. The game asks for no media permissions and deploys no signaling service. No TURN relay is supplied; arbitrary internet NAT reachability is unknown.

## Actual build proof

The early `src/proof.js` package opened under file:// in Chromium and initialized the native World3D WebGL 2 renderer with zero page exceptions. Its screenshot remains evidence/packaging-proof.png. Final browser evidence uses the exact root delivery HTML, separate from source modules. See evidence/browser-report.json and tools/network-evidence/hub-report.json for actual checks, artifact digests and limitations.

Compatibility: the shipping wrapper supplies missing numeric GPUShaderStage constants before importing Three.js on browsers without WebGPU; this avoids an r182 module-evaluation failure and allows the actual WebGL2/unsupported-renderer path to run. Engine and dependency files themselves remain unmodified.
