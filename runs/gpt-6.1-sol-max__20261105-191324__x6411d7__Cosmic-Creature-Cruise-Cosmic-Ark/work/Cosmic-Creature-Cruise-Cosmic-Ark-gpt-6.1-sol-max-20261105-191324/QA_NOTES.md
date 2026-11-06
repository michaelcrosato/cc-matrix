# Testing findings

Initial automated run: 21 passed, 8 failed. Several failures were cascades from earlier state. After fixes: 29 passed, 0 failed. Final validation: 32 passed, 0 failed, including targeted mouse, charge and recall checks. A focused phone rerun followed the final full run; the consolidated report retains the 31 unchanged passing checks.

Seven game/UI issues were found by scripted tests and screenshot inspection:

1. Brief keyboard pulse taps could fall between simulation frames. Input now queues one-shot actions.
2. The HUD menu was included before Resume in controller focus order. Only the overlay participates in menu focus now.
3. The portrait phone briefing could put Launch beyond the viewport. Panels now scroll. This blocked touch-only launch and is the one critical issue.
4. The title's aside crossed a bright planet. A dark caption backing restores contrast.
5. HUD text lost contrast over the sun and terrain. Top and bottom gradients restore readability.
6. A previous flight's toast could remain above new-game or results screens. Both lifecycle transitions clear it.
7. A slow initial load consumed the title idle timer and could enter attract mode immediately. The idle timer now starts after loading, and initial shaders compile behind the loading screen.

Five test-script defects were also corrected: fast-forwarding discarded the final victory event; the credits assertion expected sixteen fields where the required object has fifteen; a new charge test initially checked a collider after intentionally letting it hit and be removed, so its launch assertion now uses an isolated target; an empty toast has no class attribute, so the assertion now treats that as an empty string; an art capture taking more than ten seconds on a busy software renderer correctly entered attract mode, so title-layout tests now suspend the idle clock while the separate attract test checks its normal behavior.

Code review also corrected cached entity visuals across restarts, projectile orientation after changing aim, tractor cone orientation, recall outside the dock, and the sentinel's launch telegraph. These were additional implementation checks, not counted as issues caught by the initial scripted run.

Engine: no engine changes. Native MeshToonNodeMaterial, WebGPURenderer and AnimationMixer are used. An explicit WebGL query switch permits visual inspection on this headless workstation, where WebGPU screenshots are blank. Rapier handles actual projectile contacts, sensors and the recoverable-cargo damage flow.

Unknown: physical controller haptics, human listening impressions, real iOS Safari, remote NAT traversal and public PeerJS availability across arbitrary networks.
