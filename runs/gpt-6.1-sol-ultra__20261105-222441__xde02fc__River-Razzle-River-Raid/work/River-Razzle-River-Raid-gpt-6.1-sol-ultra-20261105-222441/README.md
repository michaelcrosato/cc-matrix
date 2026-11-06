# River Razzle

**Low altitude. High mischief.** An original two-minute river sortie inspired by Carol Shaw’s River Raid (1982).

Open the single HTML file in the parent directory. All game code, Three.js r180, Rapier 0.19.3, physics WASM, procedural art, music and sound are included. It also works offline from `file://`. WebGPURenderer uses WebGPU when available and falls back to WebGL 2.

## Fly

- **Controller:** left stick / D-pad steer and throttle; Cross / A / R2 / RT fire; Square / X pulse; Options pause. Menus use stick, Cross / A, Circle / B; right stick scrolls long panels.
- **Keyboard:** WASD / arrows steer and throttle; Space fire; E / left Shift pulse; Esc pause.
- **Mouse:** move over the river to steer, left button fire, right button pulse; hover and click menus.
- **Touch:** drag an invisible stick anywhere on the playfield. Firing and fuel approach are assisted. Tap the contextual PULSE button or use a second contact.
- **Two on one screen:** P1 WASD / Space / E; P2 arrows / Enter / right Shift; or two standard controllers.

Fly over mint fuel pontoons, slow down and release fire to refuel. Intact bridges block the river. Destroy bridges to save checkpoints and gain a reserve. The last sector ends in a blockade battle. Pause → Dev Hangar exposes live balance, invincibility, AI pilot, live preview, sector skip, refill, clearing and reset tools. Title and ground menus enter an AI demo after ten idle seconds.

## Co-op

The main co-op option plays two pilots on one screen. Optional tab rooms connect two pages in the same browser and origin. Cross-device online play uses AI Hub shared-world sessions and the bundled unmodified session client; see NETWORK.md. The official normal, nonplayer server and host-leave conformance scenarios are tested.

## Develop and verify

`npm run build --silent` bundles the source into the single parent HTML file and copies credits.json to the parent exit-interview.json.

`npm test --silent` is the one verification command. It prints only failures and one count. It runs simulation and protocol regressions, a full scripted campaign, real keyboard / emulated gamepad / native emulated touch controls, offline PCM audio, offline file loading, and the official AI Hub browser harness. It creates its own loopback server on an OS-chosen port and closes its browsers and server. The workstation’s installed Python Playwright environment is used.

The final required source information and exit interview are in the in-game About & Credits and the parent exit-interview.json. Usage is **added on import**. Physical controllers, real mobile devices and human listening are unknown; their provided automated stand-ins were used.

Art and audio are generated in code. Third-party license notices are included in the HTML and this directory. Research sources: original Activision manual at https://www.atariage.com/2600/manuals_old/river_raid.html and the AI Hub integration at https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub.
