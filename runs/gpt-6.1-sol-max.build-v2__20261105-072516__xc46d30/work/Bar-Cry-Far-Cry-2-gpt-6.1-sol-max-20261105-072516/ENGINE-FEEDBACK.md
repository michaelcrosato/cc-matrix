# Engine feedback

Engine pinned at my-3dge ea717c7. No local engine patches.

- Reproducible CPU rules, captures and native actions are strong foundations for a systemic shooter and host-sequenced co-op.
- Scene setup queues spawns too: querying a just-spawned campaign inside setup returned no entity. Assemble the initial state locally, then spawn it, and begin rules after setup.
- Capture checks reject shared arrays and undefined object properties. Cloning each seat's buttons and omitting absent NPC aim fields fixed both issues. Hashes alone did not reveal this as clearly as captures did.
- `createPropMeshes` eagerly builds every registered prop. Twelve guns × three tiers × four poses × multiple parts produced over two thousand geometry objects during warm-up and exhausted software WebGPU memory. Keeping the authored shapes but merging each gun variant into one native prop batch allowed the packaged world to boot.
- The closed first-person hand rig has no game-authored medical or reload action entry. Visible gun pose variants handle reloads; custom eye-level body cameras show authored medical actions.
- `addWeapons`, melee and interactions apply only to the local player. The game supplies systems driven by each seat, preserving native weapons components and shot events for presentation.
- Desirable API changes: first-person action poses; selective asset warm-up; explicit all-seat input support; a small game save format independent of full captures.

- A title screenshot after attract exit showed `PHYSICS_BAD_ARGUMENT: raycast({ maxDistance }) got -104.488...`. Presentation's native audio occlusion walker computes `end - inside` for its second ray without guarding a nonpositive range. The game now supplies a read-only audio query adapter that returns no hit for an invalid range, and updates the listener/query view before playing events. Large demo teleports also use camera cuts. The engine remains unchanged; the browser tier checks handled engine errors as well as page errors.
