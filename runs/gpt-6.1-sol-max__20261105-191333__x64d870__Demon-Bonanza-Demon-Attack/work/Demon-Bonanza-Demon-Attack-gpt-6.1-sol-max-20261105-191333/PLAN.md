# Demon Bonanza

Original fixed-screen 2.5D arcade shooter inspired by Demon Attack (Imagic, 1982).
Generated title chosen with crypto.randomInt from 50 candidates (selection.json).

## Experience
A comic-book expedition to an ice moon at the edge of a very unfriendly eclipse.
Sideways hover-cannon movement, unlimited tracer fire, split demons, divers, aimed
bombs and clean-wave bunker awards preserve the source's central pleasures.
An original reflective pulse, dash, collectible overdrive, two upgrade choices,
and a three-phase demon boss make a complete six-wave expedition. Victory opens
an endless encore. Single player, two-player couch co-op, two-player manual
WebRTC co-op, and one-to-four-player AI Hub shared-world co-op.

## Implementation
- Three.js 0.180.0 WebGPURenderer; native WebGL fallback on unsupported browsers.
- Procedural extruded and faceted meshes with toon ramps and ink contours.
- Three AnimationMixer clips for wings, cannon recoil, orb breathing, crown.
- Rapier 2D 0.19.3 WASM: sensor collisions, rigid bodies, projectiles, pickups.
- Pure gameplay state separated from rendering; authoritative network host.
- Synthesized Web Audio melody, bass, percussion, SFX and formant gibberish.
- One HTML bundle; pinned CDN engine dependencies; no downloaded art/audio.
- Controller-first DOM overlays, native mouse, touch movement + assisted fire.
- Ten-second title inactivity -> invulnerable bot campaign, loops; input exits.
- Pause menu -> live tuning sliders and diagnostics; settings persist locally.

## Verification
One command: npm test. Deterministic full campaign bot playthrough; physics,
progression, pause/restart, touch, emulated controller, audio signal, file URL,
peer co-op and official Hub harness (normal, impaired, host leaving, server).
Screenshots are used to evaluate composition and legibility only.
