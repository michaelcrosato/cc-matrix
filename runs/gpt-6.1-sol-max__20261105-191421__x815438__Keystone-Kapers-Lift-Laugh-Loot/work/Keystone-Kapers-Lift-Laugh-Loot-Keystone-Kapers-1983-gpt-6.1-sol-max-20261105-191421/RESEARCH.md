# Source and design notes

Primary reference: Activision's 1983 instruction manual, archived at
https://www.atariage.com/2600/manuals_old/keystone_kapers.html

The original is a timed department-store pursuit. Running, jumping, ducking,
escalators, a central lift, a roof exit, recoverable loot and a security overview
give it its identity. Ground hazards penalize time; planes cost lives. Later rounds
increase hazard speed, frequency and bounce height. Our three authored cases
introduce those rhythms and end in a complete victory sequence.

Look references: AtariAge's original screenshots:
https://atariage.com/screenshot_page.php?SoftwareLabelID=261
The layered shop floors, warm sky, bold uniform, contrasting crook and legible
obstacles informed the cutaway mall. Every model and texture in this demo is
procedural and original; no source sprites or game assets are included.

Sound research: archival reviews describe short running, jump, impact, collection
and arrest signals, with no continuous Atari 2600 gameplay music:
https://obsoletegamer.com/keystone-kapers/
https://www.mobygames.com/game/9475/keystone-kapers/
The new ragtime-inspired score and gibberish voices are original additions.
No reference audio was copied or imported. Sound was checked by offline rendering;
subjective listening quality is unknown.

The crook is Bertie Baggs, pursued by Officers Pip, Moxie, Dots and Brass in the
fictional HalFwick's. A rechargeable whistle, live co-op, touch assistance, native
animation blending and a workshop extend the source into a modern vertical slice.

Technical references:

- Three.js R180 WebGPU materials and native animation source:
  https://github.com/mrdoob/three.js/tree/r180
- WebGPURenderer documentation:
  https://threejs.org/docs/pages/WebGPURenderer.html
- Rapier native colliders, rigid bodies and scene queries:
  https://rapier.rs/docs/user_guides/javascript/
- PeerJS data connections:
  https://peerjs.com/client/getting-started
- AI Hub Session Protocol v1:
  https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md

The source plan supplied to the build was none. This document records choices made
during implementation.
