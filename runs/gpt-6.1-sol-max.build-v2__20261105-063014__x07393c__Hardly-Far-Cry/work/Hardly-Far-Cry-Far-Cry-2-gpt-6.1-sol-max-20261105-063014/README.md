# Hardly Far Cry

An original first-person survival shooter set in the Sorrel. The title was selected with Python's cryptographic random-number generator from fifty candidates (draw 11).

Open the HTML file beside this folder in a browser with WebGPU. It is self-contained and works from `file://`; there are no runtime downloads. Chrome or Edge with WebGPU enabled are the tested route. The Linux WebKit build on this machine displays a compatibility notice; real iOS Safari was not available.

Take contracts at the Mile Forty notice board or from the named givers. Raise the physical map to see the current objective and waypoint. The first journey teaches fever tablets, driving, the fifth-shot jam, repair and healing. Sleep at cleared safehouses to choose the hour and save. The campaign has ten contracts, the final pass, both endings and free roam after Continue. Wildlife was omitted from the optional scope; the survival, story and multiplayer systems remain playable.

## Controls

WASD move; mouse look; LMB fire; RMB aim; E use or hold to interact; R reload or repeatedly clear a jam; Shift sprint; C crouch; Space jump; Q syrette or surgery; H tablet; M/Tab map; E or LMB marks its cursor; T tracker; V monocular; J ledger; 1-4 weapon slots; wheel cycles weapons; F knife or the buddy's finish-it choice; G bottle; aim+G plants a charge and G detonates it; B selects bottle/charge. In a vehicle: WASD drive, Space handbrake, E exit, F mounted gun, C chase view. Esc pauses.

Standard gamepads are supported, with PlayStation glyphs by default and an Xbox option in Settings. The menus use the left stick/d-pad, Cross/A to select and Circle/B to return. The right stick looks or moves the map cursor. Shoulder buttons turn menu pages. Dev Mode uses L1/R1 or Q/E for tabs and bracket keys for pages. The pause menu contains Dev Mode and its live balance sliders.

Touch-only devices receive a controller/keyboard notice and a working Settings button. There are no touch gameplay controls. Attract mode begins after ten idle seconds and exits on any input.

Cash Run is a six-minute, host-authoritative extraction round. Solo includes three hired-gun bots. Host/Join on This Computer connects two windows in the same browser profile. Online play runs through AI Hub Protocol v1, including a dedicated server, packet loss, host departure, countdown and standings.

## Development and verification

`npm install` installs only the local Playwright dependency. The machine already has its browser binaries. `npm run build` produces the single root HTML with the unmodified AI Hub client first and a bundled engine/game module. `pixel-engine.js` is unchanged from `vendor/pixel-engine.zip`.

Run **`node tests/run.mjs --all`** for all seven suites: static, systems, playthrough, replay, browser, hub and link. The runner prints failures and a one-line count. Without `--all` it skips unchanged coverage. `--only systems` (or another suite name) runs one suite.

The campaign bot teleports between objectives and uses god mode, ammunition and later fever protection to shorten verification. Objectives use real movement/driving, firing, ignition, reload, held use and choices. Both final paths are completed; the buddy survives an independent systems test and dies in the campaign test. This verifies reachability, not a human playtime measurement.

`node tests/capture.mjs` captures the TV-view title, first-person scene, night fire, map at the wheel, shop, dialogue, surgery, live sliders and ending in Chromium WebGPU. Generated test reports and screenshots are not required at runtime. See `tests/ISSUES.md` for the defects caught and fixed. `DESIGNERS.md` describes the content tables.

For constrained automated runners, `?headless=1` boots the same simulation in a browser page without a GPU view. The link suite uses two such pages; the desktop browser and all hub scenarios use the WebGPU view. Hub scenarios use fresh browser processes and retry only a browser crash from machine memory pressure, never a failed protocol check.

Automated Chromium browser and hub runs request `?quality=low` for software WebGPU on the shared machine. The default medium-quality world is checked separately in the visual capture script. `?quality=low`, `medium` and `high` are also useful authoring/review overrides; the Picture menu exposes the same choices.

The test command isolates suites in child processes, waits briefly for memory before browser work, and retries only infrastructure crashes. `tests/results.json` records the final results. Capture can use `node tests/capture.mjs --low` on a crowded software-rendering host; the shipping default remains medium.
