# Test Dodge Riot

Run the complete regression suite from the delivery root:

```sh
/home/micha/.local/share/pipx/venvs/playwright/bin/python Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/test_game.py
```

The final integrated run reported **61 passed, 0 failed**. The command prints failures and one final count. It runs 21 actual-Rapier simulation checks, 17 networking-module checks, exit-interview/embedded-credit validation, and 22 browser/scenario checks. Browser coverage includes all three rounds, automatic driving, collection, damage/restart, keyboard and standard-mapping gamepad, procedural audio output, local co-op, manual-code WebRTC co-op with terminal result synchronization, the official AI Hub standard/server/host-leave scenarios, touch pause/dev/resume, landscape and portrait layouts, file sharing, ten-second attract mode, and device-loss recovery.

The runner starts and closes its own server on an OS-selected localhost port. It uses one browser at a time and stores browser temporary files and diagnostic artifacts in this folder. The normal browser launch selects ANGLE Vulkan explicitly, alongside the requested software WebGPU adapter. Functional test worlds gate repeated rendering after boot so this software adapter cannot accumulate an unbounded GPU queue. Simulation, input polling, physics, and native animation mixers continue; production rendering is unchanged. Rendering is verified through live draw submissions and actual offscreen game-scene RGBA readback.

`test-artifacts/results.json` stores the final61-check outcome. `game-webgpu-readback.png` proves actual WebGPU scene output; its raw linear colors appear darker than display output. `qa-desktop.png`, `qa-landscape.png`, and `qa-phone.png` are the clear native-WebGL visual reviews. The headless compositor can show rainbow static in WebGPU screenshot PNGs despite correct offscreen GPU pixels; those captures remain diagnostics and should not be used as catalogue images. `recovery-1280.png` records device-loss recovery, and `progress.json` records the last active check.

The same command supports focused diagnostics:

```sh
# Only delivery metadata and About/Credits consistency.
/home/micha/.local/share/pipx/venvs/playwright/bin/python Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/test_game.py --package

# Minimal raw WebGPU and Three.js basic/toon pixel readback.
/home/micha/.local/share/pipx/venvs/playwright/bin/python Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/test_game.py --canary

# Compare four working ANGLE/Vulkan configurations.
/home/micha/.local/share/pipx/venvs/playwright/bin/python Dodge-Riot-Dodge-Em-1980-gpt-6.1-sol-ultra-20261105-212610/test_game.py --canary --matrix
```

`--canary --baseline` reproduces this workstation's failing configuration with no explicit ANGLE selection. It is a diagnostic reproduction, not the normal test configuration. Physical controller feel, real touch hardware, listening quality, and remote internet peers remain unknown; automated tests use browser stand-ins and two local peer pages.
