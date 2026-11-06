# Verification record

All development and artifacts are confined to this run. The unified command is `npm test` from this directory; it binds its own OS-selected 127.0.0.1 server, uses one browser with sequential contexts, and closes owned resources.

## Confirmed findings addressed

- Co-op integration review: a server-only AI Hub host must route both remote players independently; a guest in seat zero must control and follow kid one. Fixed with sender-indexed inputs and explicit local player index.
- Co-op integration review: the signal puzzle needs networked notes and synchronized state when the host has no local player. Both guests can now answer; retries are also routed to authority.
- Network test: under latency, jitter and packet loss, the first fragmented world snapshot could arrive too late in a short host-leave scenario. World preparation now completes before readiness; the first snapshot and periodic checkpoints are reliable.
- Visual checks: corrected the arrival beam, parked-bike cape/blanket visibility, destination world/ship placement, scenery occluding the ending, and doorway clipping. The goodbye now includes native point/wave clips, dismounting, boarding and a rising ship.
- Input/save review: Continue after the solved signal now restores the ship; flight input no longer inherits the ground-camera rotation.
- Menu checks: native Enter activation was suppressed so the controller-style menu handler owns one activation. The failing keyboard test was ultimately traced to a parked mouse correctly changing hover focus; keyboard-only assertions now park the pointer outside the menu.

Menu review also found that controller users needed right-stick scrolling to read all credits. This is implemented with Page Up / Page Down / Home / End equivalents, and covered by two targeted regressions.

Additional implementation review improved adaptive touch UI, mouse exit from attract, shortest-angle character turns, guest candy/pulse effects, and AI Hub lifecycle/reserved-control handling.

## Coverage

Scripted complete story, all 3 parts and 3 gardens, signal demonstration/wrong-answer/correct-answer paths, all 12 flight stars, farewell and ending, capture/retry/checkpoints/Continue, walking/sneaking/candy/vision/occlusion/shared heart, pause, notebook, developer tuning/reset/colliders/photo, emulated standard gamepads, PlayStation/Xbox prompts, native keyboard menus, phone/tablet touch, full attract replay loop/save preservation, file:// startup, OfflineAudioContext finite/audible/unclipped synthesis, Rapier collision/slide/grounding/ballistics, two-page WebRTC and BroadcastChannel, actual shared-world gameplay and official Hub standard/server/host-leave harness checks at 150 ms latency / 50 ms jitter / 5% loss.

Headless WebGPU is verified through state and backend assertions. Its blank screenshots were not useful evidence. Visual checks used headed Chromium under Xvfb with the WebGL 2 compatibility backend. Physical controller/touch hardware, iOS devices, human listening and a real second person were unavailable.

The final one-line result is retained in `test-results.txt`.
