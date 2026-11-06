# Stellar Raiders

Open the named HTML in the parent folder in a current Chromium browser. Internet access loads the pinned Three.js r180 and Rapier 0.19.3 dependencies. The game prefers WebGPU and uses Three.js's WebGL compatibility backend when WebGPU is unavailable. Music begins at 10% after your first input.

A complete patrol contains 13 enemies in four sectors, two functioning resupply starbases, a flagship encounter, hyperspace alignment bonuses, shields/energy/heat management, homing torpedoes, a scored debrief, a looping attract pilot and a pause-menu development deck.

Mouse steers (click flight view to capture); W/S throttle; A/D strafe; LMB/Space fire; R/RMB torpedo; E shields; T target; M chart; H docking context; Esc pause. Standard controllers use left stick steering, right stick throttle/strafe, R2 fire, L2 boost, R1 torpedo, L1 shields, Square lock, Triangle chart, Circle context, Options pause. Touch uses invisible left steering and right throttle sticks with assisted weapons and contextual actions.

AI Hub sessions support 1–4 ghost pilots competing for command points. Standalone local practice wings connect tabs in the same browser and origin using the Wing link screen. Real cross-device sessions run through AI Hub.

## Development

`npm run build` creates the single-file game in this folder and the named release file in its parent. `metadata.json` supplies the in-game source information and exit feedback. The release has no local asset dependencies.

`npm test --silent` runs the real Rapier campaign checks, browser/controller/touch/audio/local-wing tests, and official AI Hub harness scenarios. It starts its own loopback server on an OS-assigned port, closes its browser, and stops only its own server. Output contains failures and one count. The browser test uses the preinstalled Playwright Python environment. Native WebGPU covers the flight/input/audio checks; multi-view networking, touch and file-launch checks also exercise the WebGL compatibility backend. On this workstation, software WebGPU also needs `--use-angle=swiftshader --enable-unsafe-swiftshader` in addition to the supplied Vulkan/SwiftShader flags.

Core encounter data and tuning live in `core.js`; geometry and native animation clips in `visuals.js`; controls/screens in `main.js`; procedural audio in `audio.js`; ghost transport in `network.js`. `hub-session.js` is the unmodified AI Hub client.

Visual QA captures are diagnostic development files. Native WebGPU screenshots may omit the canvas in headless Chromium; a separate WebGL diagnostic verified the scene's appearance. No physical controller, real mobile hardware, TV or human listening was available.
