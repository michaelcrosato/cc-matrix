# Testing and review record

Seven game / UX issues were corrected:

1. Foreground door panels and their opaque opening planes hid the explorer. Near-side cutaway doorways now keep clear openings, with low locked panels and full collision feedback.
2. A landing table overlapped the descending stair. Landing furniture now respects the stair footprint.
3. The attract tour could retain title-screen creatures in its first room. It now rebuilds that scene on entry and at each repeat of the tour.
4. Rebuilding menus when input type changed could consume the first mouse click after controller use. Prompt updates now preserve the menu and focus.
5. Standalone race results used simulation time and could exclude pause time. Races now use elapsed wall-clock time and rank finishers by that time.
6. The first touch HUD was too busy. Touch play now keeps the menu button and contextual actions, with temporary instructional messages.

7. Portrait framing could crop the explorer near side doors. The portrait camera now pans horizontally with the explorer while landscape keeps the full-room composition.

Seven test / environment issues were resolved or given a documented stand-in:

1. The provided headless-shell WebGPU flags lost the device at presentation. Full Chromium with explicit ANGLE / Vulkan setup keeps the WebGPU device active.
2. Full Chromium rejected the long temporary Unix socket path. Its TMPDIR is now relative to this project, keeping socket files both short and inside the game folder.
3. A long screenshot let the title idle into attract mode before a test click. Visual fixtures now hold the title idle timer deliberately.
4. An offscreen WebGPU readback stalled on the software adapter. It was removed from the suite; renderer validation / state is checked and WebGL 2 supplies visual review.
5. A map assertion compared innerText affected by CSS uppercase with mixed case. It now reads textContent.
6. Short fixed-duration input holds could miss frames under software rendering. Tests process gamepad edges explicitly and wait for state changes; drawing can be frozen for logic / protocol tests.
7. An interrupted test run could print a misleading success count. Interruptions now record a failed completion check.

No gameplay-breaking issue was found in the complete no-cheat escape. Physical-device and cross-network NAT behavior remain unknown.
