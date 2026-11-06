# Ka-Splat!

Open `../Ka-Splat-Kaboom-gpt-6.1-sol-ultra-20261105-215656.html` in a current browser. The release bundles Three.js r180, Rapier 0.19.3 and all game code. It needs no asset server or downloaded art/audio. WebGPU is preferred; Three.js's WebGL 2 backend is available when necessary, including recovery from a lost WebGPU device.

Play the eight-wave show solo, choose Bucket brigade for two-player couch play, or exchange direct WebRTC invitation and reply codes with a friend. AI Hub uses its own session transport and automatically starts synchronized shared-world rounds. Direct WebRTC uses public STUN and no relay; restrictive NATs can require AI Hub. No account or broker is needed for standalone invitations.

Controls: left stick / D-pad, A/D, arrows or horizontal mouse movement. Cross / Xbox A, Space, W or mouse click unleashes the splash curtain. Options / Menu, Escape or P pauses. A second local player uses a second controller or J/L and I. Touch: drag, tap, or use a second finger; near misses receive splash assistance. Menus accept controller, keyboard, mouse and touch. Settings include PlayStation/Xbox prompts, sound and music (10 percent default), screen shake, and an endless remix.

Pause → Developer tools exposes fall speed, bomb frequency, bucket width, movement speed, splash recharge, simulation speed, invincibility, autoplay, physics display, one-physics-tick stepping, bomb spawning, wave jumping, bucket refill, forced misses and reset to defaults.

After ten seconds on the title screen, an invincible AI demonstrates all eight waves. Any input returns to the title. The show loops after its finale.

## Development

`npm run build` invokes Bun to bundle modules and dependencies into the root HTML. `npm test` (or `./test.sh`) runs every suite behind one command and prints failures plus one total count. Successful suites are cached by the hash of their covered source and are repeated only when that source changes. Tests use the installed Playwright Python environment and start only their own temporary localhost servers on OS-assigned ports.

The suites cover rules and Rapier trajectories, procedural audio levels, standard gamepad emulation, touch interactions, menu focus, development controls, graphics recovery, a complete eight-wave playthrough, actual standalone WebRTC play and the official AI Hub harness. Harness scenarios include normal traffic, 150ms latency/50ms jitter/5% packet loss, a dedicated server, host departure and one player.

For working software WebGPU on this workstation, use Chromium flags:
`--enable-unsafe-webgpu --enable-features=Vulkan --use-angle=swiftshader --disable-vulkan-surface`.
The supplied alternative `--use-webgpu-adapter=swiftshader` destroys even a minimal one-cube WebGPU device here. GPU readback confirms the full game scene is rendered; `capture-webgpu.py` captures it truthfully when the headless screenshot compositor omits the canvas. `?renderer=webgl` explicitly selects the fallback for inspection.

Research links, complete source information, test feedback and credits are in the in-game About screen and the root `exit-interview.json`. `title-draw.json` records the actual cryptographic random choice from fifty candidate titles. No original Kaboom! assets are included.
