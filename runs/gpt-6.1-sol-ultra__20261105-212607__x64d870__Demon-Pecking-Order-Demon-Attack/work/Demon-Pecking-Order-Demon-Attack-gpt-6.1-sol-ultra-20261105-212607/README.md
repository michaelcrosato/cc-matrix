# Demon Pecking Order

Little cannon. Very big birds. A complete six-wave lunar arcade patrol inspired by Imagic's Demon Attack (1982), followed by optional overtime.

Open `../Demon-Pecking-Order-Demon-Attack-gpt-6.1-sol-ultra-20261105-212607.html` directly in a current browser. The HTML embeds Three.js r180, Rapier 0.19.3 and all game code, geometry and synthesized sound. Google Fonts are optional; standalone internet co-op downloads PeerJS 1.5.5 only when creating or joining a room. WebGPU is primary, with the same Three WebGPURenderer scene supporting its WebGL compatibility backend.

## Controls

Move with the left stick, A/D or arrow keys. Hold Cross/A, RT, Space or the mouse button to fire. Circle/B or Shift dashes. Square/X, L1 or Q uses a charged Scatter Pulse. Options or Escape pauses. Keyboard player two uses arrows, Enter, Right Shift and /. Mouse movement positions the cannon. Touch dragging moves, auto-fire is enabled, double-tapping dashes, and a Pulse button appears when charged.

The title enters an AI-played demonstration after ten seconds without input. Any input returns to the title. Developer tools are in the pause menu: live balance sliders, defaults reset, invulnerability, autopilot, half-speed, next wave, bunker refill, projectile clear and restart. Developer patrols do not set personal records.

## Multiplayer

Two pilots can share one screen, connect with standalone online room codes, or play in AI Hub sessions. Standalone room signaling uses PeerJS; WebRTC carries game state. Public signaling and NAT traversal depend on network availability. AI Hub supplies its own network, synchronized clock and results. Physics runs only on the host; clients send inputs and interpolate snapshots. A host without a local player is supported. Final state is acknowledged before reporting results, and the host can replay standalone patrols with its wingmate.

## Build and test

From this folder:

```sh
npm ci
npm run build
npm test
```

`npm test` uses the installed Playwright Python environment and prints only failures and a final count. Tests include a complete six-wave AI playthrough, repeated complete attract loops, keyboard, mouse, standard gamepad emulation, touch, live balance settings, procedural audio signal levels, local and internet co-op, and the official AI Hub harness. Any test servers bind loopback with OS-assigned ports and close their own processes.

The test and network reports are JSON files in this folder. `?renderer=webgl` enables the compatibility renderer for visual inspection when software WebGPU screenshots are blank. The normal launch uses WebGPU when available. `window.gameTest` is a read-only state interface plus explicit simulation tools used by the test suite.

## Design and research

The source's defining features are three independently hovering demons, a horizontally moving cannon, steerable tracer shots, split enemies with diving survivors, escalating enemy fire, and a bonus bunker for a perfect wave. This interpretation adds simultaneous co-op, dash protection, a charged bullet-clearing pulse, phantom enemies, a vulnerable-core boss, a score combo, and an ending before optional overtime.

- Original manual: https://atariage.com/manual_html_page.php?SoftwareLabelID=135
- Appearance and rising-pitch sound notes: https://www.atariage.com/software_page.php?SoftwareLabelID=135
- Mechanics and port context: https://www.mobygames.com/game/9448/demon-attack/
- AI Hub specification: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
- Rapier collider-churn issue investigated during testing: https://github.com/dimforge/rapier.js/issues/363

The title was chosen with Python `secrets.randbelow(50)` from fifty candidates. `selection.json` records the selected index. Source Information and all requested feedback are in About / credits and the root `exit-interview.json`. Usage is deliberately `added on import`.

## Physics implementation note

The required Rapier 0.19.3 version reproduced a broadphase crash during rapid collider insertion/removal. The game keeps stable pooled bodies and colliders for each patrol, retiring objects by filtering and parking them, and reusing their handles. Collision events are collected before applying combat changes. No engine source was modified.

## Source files

`main.js` owns combat, waves, menus and input. `visuals.js` builds procedural ink art and native animation clips. `audio.js` composes and synthesizes sound. `hub.js` adapts AI Hub and standalone WebRTC. `shell.html` is the responsive controller-first UI. `build.mjs` bundles everything and pastes the unmodified official `session.js` first in the document head.
