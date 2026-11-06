RIVER RENEGADE
Low flight. High stakes.

PLAY
Open the HTML in this workspace's root in a current browser. Everything is
embedded: Three.js r180, Rapier 0.19.3/WASM, models, music and sound.
No web server, CDN, account or download is needed for standalone play.
WebGPU is preferred. Three.js also provides a WebGL 2 fallback and the game
recovers from a lost WebGPU device when WebGL 2 remains available.

A complete three-sector sortie takes about three minutes at cruise speed,
including the final Iron Heron fight. Destroy all three bridges, refuel on
green docks, find twin-gun and repair crates, and escape the blockade.
Bridges repair a hull pip and add 25 fuel. A failed sortie can be retried
from its last cleared bridge. Scoring chains, extra reserves, settings and
a local best score are implemented. The title starts an AI attract flight
after ten seconds; any input returns to the title.

CONTROLS
Pilot 1: WASD / left stick: steer and throttle; up accelerates, down brakes.
Space / Cross / right trigger: fire. Left Shift / Square: emergency pulse.
Esc / Options: pause. Mouse: move to steer, left-click fire, right-click pulse.
Pilot 2: arrows, Enter and Right Shift, or a second standard gamepad.
Touch: drag an invisible stick; guns fire automatically and protect fuel
docks ahead. Tap PULSE, or touch the right side, for emergency clearance.
Menu: arrows / left stick to choose, Enter / Cross to confirm, Esc / Circle
back. Hovering an item focuses it. Settings switch PlayStation/Xbox glyphs.

DEVELOPER TOOLS
Pause > Flight deck. Live balance sliders cover cruise speed, steering,
fuel burn and refill, damage, both fire rates, and pulse cost/recharge.
Tools include invulnerability, infinite fuel, autopilot, repair/refuel,
reserves, sector warps and reset defaults. In Hub, the host controls tuning.

MULTIPLAYER
Standalone: one or two pilots on one device.
AI Hub: one to four players in the same authoritative cooperative world.
The unmodified Hub client is the first script in the HTML. The host runs
Rapier, guests send input, and the host sends world snapshots. Session
start, countdown, time-up, end, leaving, host departure and a server with
no local player are supported. No broker or matchmaking is used.

BUILD AND TEST (from this development folder)
npm --silent run build
npm --silent test

The test command prints only failures and one count. It runs real Rapier
simulation checks, the full scripted campaign, browser input/audio checks,
metadata/package checks, and the official Hub harness under adverse network
conditions. The local harness server binds 127.0.0.1 on an OS-selected port
and is closed by the runner. test-results.json records inspectable results.

Browser tests use the installed Python Playwright environment at:
/home/micha/.local/share/pipx/venvs/playwright/bin/python
Chromium uses Vulkan, WebGPU SwiftShader, and ANGLE SwiftShader together.
Native WebGPU state/draws are checked. WebGL 2 screenshots are used for
visual inspection because software WebGPU captures can be blank.

SOURCE AND RECORDS
credits.json supplies both the in-game About/Credits pages and the root
exit-interview.json. The latter follows the requested exact schema.
title-draw.json records the 50-title crypto.randomInt selection.
THIRD-PARTY-NOTICES.txt is also embedded in the final HTML.

Original manual: https://atariage.com/manual_html_page.php?SoftwareLabelID=409
Official release: https://atari.com/products/river-raid-2600-standard-edition
AI Hub: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub
Three.js: https://threejs.org/manual/pages/webgpurenderer
Rapier: https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/
