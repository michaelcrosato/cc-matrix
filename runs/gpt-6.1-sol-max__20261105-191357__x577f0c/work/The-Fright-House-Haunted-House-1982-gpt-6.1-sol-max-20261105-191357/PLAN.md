# The Fright House

Original, complete vertical slice inspired by Atari's Haunted House (1982).

## Play

- Isometric 3D exploration / light survival horror, playful instruction-manual voice.
- Four floors, six authored rooms per floor. A persistent map, locked wings and stairways, three urn fragments, a master key and a protective scepter.
- One carried object. Fragments join into one urn; swapping drops the previous object. Matches reveal objects and attract trouble. Nine chances to escape.
- Distinct spider, bat and ghost behaviors; bat theft, extinguishing gusts, telegraphed pursuit, scepter protection and a final ghost chase.
- Keyboard, mouse, standard-mapped gamepad with PS / Xbox prompts, and assisted touch.
- Title, tutorial, settings, pause, developer tools with live tuning, map, win/loss, complete credits. AI attract tour after ten seconds.
- AI Hub Protocol v1 ghost races for 1–4; standalone room-code races using BroadcastChannel locally and PeerJS / WebRTC across devices.

## Build

Three.js 0.180.0 WebGPURenderer, toon materials / ink silhouettes, native AnimationMixer clips, Rapier 0.19.3 character controller. Procedural meshes, texture canvases, Web Audio synthesis only. Bundle code and dependencies into one offline-capable HTML file; internet race signaling needs a connection.

## Research

- https://atari.com/pages/hauntedhouse — primary publisher description and original variations.
- https://www.retrogames.cz/manualy/Atari2600/Atari2600HauntedHouse.pdf — original Atari instruction manual, floor plan, silhouettes and sound cues.
- https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub — protocol, unmodified client 1.4.0 and conformance harness.
- https://threejs.org/docs/pages/WebGPURenderer.html
- https://rapier.rs/docs/user_guides/javascript/character_controller/

The title is a real CSPRNG draw from fifty candidates, recorded in title-draw.json. No external art or recorded audio.

## Verification

One command, npm test, prints failures and a single count. Check real WebGPU startup, navigation and collisions, all inventory and enemy mechanics, a scripted full escape, controller and touch input, audio signal, settings / developer tools, attraction and interruption, standalone two-page races, AI Hub normal / adverse network / host departure cases. Use screenshots for composition and legibility.
