# Native art and code audio

Implementation uses the unchanged my-3D2dge 0.89.1 full handoff at `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.

`src/render/world.js` extends the engine’s `Humanoid.weapon`, `Humanoid.pose`, `Humanoid.hat` and `SHAPES` registries. The ranger’s bow hand is fixed at local `[7.5,.4,18]` with size 1.22. This makes its actual native rig hand match the production projectile origin `[9.15,.488,21.96]` after facing rotation, verified in eight directions. Bowstring endpoints use the real hand and limb attachments. Quiet walking, running, quickstep, listening, hurt, down, pickup, revival, climbing, bow re-nocking, paddle travel and celebration consume simulation state and native poses. Creatures use the same local forward/right/up convention and shaded pixel primitives, with distinct limbs, coils, wings, tails and anticipation.

Caves preserve native textured floors, queued walls, shaded rigs, normal canvas lights and native fog. Unseen enemies never enter the actor, shadow, wound-marker or telegraph queues. Presentation fog reveals facing wall edges adjacent to observed floor without changing gameplay visibility or explored memory. The root gong gate appears as woven roots, then as a plank bridge. Guardian deaths use bronze embers and blue shards respectively. The shared camera follows the party with aim lead; the lantern tether warns before the simulation’s separation bound.

The title is a native forest-camp diorama. The wilderness graph uses authored landmark coordinates, native props, readable labels, blocked-route marks and permanent opened-forest/boat changes. `renderer.nodeScreen(id)` is the UI’s authoritative click-target conversion.

`src/audio/score.js` composes original restrained lute/air scores, cave variations, guardian intensity, victory and defeat. Instruments, 26 cues and rhythmic gibberish voices are synthesized analytically through Web Audio. Noise buffers are generated deterministically at runtime. No audio files, encoded recordings or media fetches are used. Music goes through the native music bus once, with the root shell’s 10% default; focus ducks that bus to 3.5%. Creature cue distance and coarse direction use the simulation’s passage path where available. Voice text events are deduplicated by event ID, and stop cancels every tracked source.

## Verification

- `node tests/render.test.mjs`: eleven checks passed, including native bow attachment, actual visible creature/prop painters, hidden-enemy omission, draw-state immutability, title/map, native animation adaptation, deduplicated quiver-count sequences and finite unique cue data. Four diagnostic checks separately verify collision wall/bank edges and actor feet, actual navigation routes, corridor hearing strength/species thresholds, and exact visible-cell boundaries with live-radius wall-clipped LOS rays.
- `tests/audio-browser.py`: renders all 26 cues in `OfflineAudioContext`; checks nonzero finite output, bounded peaks and silent tails. Also checks real-gesture unlock, live music/duck buses and clean stop. Actual signal report is `reports/audio-signals.json`. Initial integration exposed root startup stopping audio permanently; root corrected lifecycle and final orchestrator reruns this test.
- `tests/render-browser.py`: purposeful 1920×1080 captures of actual delivered HTML: title, map, cave and both guardian palettes; checks page errors, engine errors and initialized cave renderer. The test’s warps are explicitly visual-fixture actions, never progression evidence.
- Defect discovered by draw tests: a parameter-cleanup refactor accidentally renamed three call arguments, producing ReferenceErrors. Fixed before artifact rebuild. Source ownership avoids engine modifications.

No human listening, real TV, physical-controller or real mobile-device check occurred; those results are unknown. The browser captures and signal tests are the permitted workstation stand-ins.
