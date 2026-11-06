# Testing feedback count

Seven distinct issues were caught by execution or screenshot review and corrected:

1. Rapier's character controller has setSlideEnabled, not enableSlide. This prevented startup and was the one game-breaking game defect.
2. The title pilot retained a spawn-invulnerability blink without a gameplay timer to clear it. A title capture caught the missing pilot.
3. The physical campaign replay targeted the exact edge of a shelf, where the capsule could not fall. Its waypoint now clears the edge.
4. A later retreat waypoint intersected a hot-wall collider. It now passes safely beneath it.
5. A continuously firing test pilot could take power slightly below zero. Laser spending now clamps at zero and respects the test invulnerability power exemption.
6. The phone capture showed radio guidance overlapping the touch introduction. Touch now uses a minimal equipment pulse, invisible controls and contextual actions.
7. The initial headless Chromium launch omitted software Vulkan presentation flags and produced a blank canvas/device-loss message. Tests now include use-angle=vulkan, use-vulkan=swiftshader and disable-vulkan-surface. WebGPU captures subsequently rendered correctly.

Test-only corrections (not counted as game defects): selectors initially included a hidden title button, a prompt assertion forgot that clicking changes the last input to mouse, and an added multiplayer movement check raced the automatic harness round. The latter is now an independent manual-harness round that verifies actual remote movement and shared rescue state before ending the round. Other code-review improvements, such as resetting new-shift scores and separating local keyboard bindings, are not included in this execution/screenshot issue count.
