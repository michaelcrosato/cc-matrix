# Keystone Bumbling Beat

An original three-case arcade mall chase inspired by Keystone Kapers (1983).

Open the single HTML file in the parent directory. Internet access downloads pinned Three.js r180 and Rapier 0.19.3. The default renderer is WebGPU; Three's WebGL backend handles browsers without WebGPU. `?webgl=1` explicitly selects that backend for visual diagnostics.

- Move: A/D or left stick. Solo also accepts arrow keys.
- Jump: Space / Cross (Xbox A).
- Duck: S/Down / Circle (Xbox B).
- Ride lift or escalator: E/Up / Triangle (Xbox Y). Hold down while using the lift to descend.
- Whistle burst: Shift / Square (Xbox X).
- Pause: Escape / Options. Dev toolbox is in the pause menu.
- Couch partner: arrow keys, Enter jump, Down duck, Up use, / burst; or a second standard gamepad.
- Touch: invisible left-thumb movement, tap right to hop, contextual shortcut button, automatic hazard assist.

Complete three cases. Touch the striped crook before the timer or rooftop escape. Bags give 100 points and two seconds; bumps cost five seconds. An idle title starts an AI demonstration after ten seconds; any input returns to the title.

Partner Up offers couch co-op, direct WebRTC invitation/reply, and same-origin two-tab rooms. Direct WebRTC uses STUN with no TURN relay, so restrictive NATs may prevent a direct connection. AI Hub session mode uses the unmodified official client and an authoritative shared world, including dedicated hosts.

## Development

`python3 build.py` rebuilds the parent HTML from source modules and the parent exit interview. No JavaScript build dependency is needed. `npm install --ignore-scripts` installs pinned runtime modules for deterministic local test routes.

`./test.sh` runs real Rapier mechanics including a complete AI playthrough, browser keyboard/controller/touch and audio checks, actual two-browser networking, and the official four-scenario AI Hub harness. It prints only failures and a one-line check count. The runner owns and closes its OS-selected loopback server and browser. Details go to `test-results.json`.

All geometry and textures are generated in code. Native Three.js AnimationMixer clips drive the characters. TSL node materials provide three-band cel shading with ink shells. All music, effects and gibberish voices are Web Audio synthesis; music defaults to 10%.

Headless Chromium WebGPU on this workstation also needs `--use-angle=swiftshader --disable-vulkan-surface` in addition to `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader`. Without both extra flags, even a one-cube scene loses its software GPU device. The test runner supplies all five flags. WebGPU screenshots may still show a blank canvas; draw submissions and device health are checked directly, and WebGL screenshots are used for art review.
