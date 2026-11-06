# Solar Stowaways

An original first-person arcade space shooter inspired by the 1986 Atari game Solaris. Native model knowledge only; no source research. The supplied AI Hub protocol and client were downloaded as implementation requirements.

## Complete flight

1. Breakwater: destroy eight Corsair interceptors. Learn steering, aim, heat and pulse.
2. Cinder: recover three pilots with a held tractor beam while fighting escorts.
3. Quiet Anchorage: enter the service ring and hold tractor to dock, repair and refuel.
4. Red Channel: thread five moving navigation gates through a minefield.
5. Last Light: destroy three carrier shield relays, then its exposed reactor.

The tactical chart connects sorties. Fuel, shield, hull, heat, combo and pulse charges carry between them. Checkpoints allow retry; completed sorties save locally. A complete run ends in a scored debrief. A ten-second title timeout launches a looping autopilot tour.

## Systems

Three.js 0.180.0 WebGPURenderer, WebGPU first with the renderer's WebGL2 fallback. TSL quantized lighting and expanded ink shells. AnimationMixer clips for machinery, beacons and ship animation. Rapier 0.19.3 colliders, swept projectile queries and dynamic explosion debris. Web Audio synthesis for all sound, sequenced music at 10%, formant-like gibberish radio voices. Gamepad API, mouse/keyboard, assisted multitouch. Focusable controller menus and live developer balance controls.

AI Hub Session Protocol v1, unmodified session client, ghost mode 1–4, score reporting, same-sector wing silhouettes and synchronized lifecycle. Standalone WebRTC code exchange for two-player ghost races. No user messaging.

## Delivery and checks

One fully bundled HTML in the workspace root, including JavaScript, CSS, physics WASM and the unmodified session client. Development and test artifacts stay in this subfolder. One command (`npm test`) checks the bundled file, gameplay from launch through victory, retries, settings, developer tools, gamepad and touch controls, audio output, direct peer data and the official AI Hub harness. Visual screenshots complement state assertions.
