# Short Order Fever

An original controller-first arcade cooking game inspired by Pressure Cooker (1983).

The distributable is the single HTML in the parent directory. Open it directly in a modern browser with network access for the pinned CDN dependencies. WebGPU is preferred; the native Three.js WebGL 2 backend is also supported. Add `?webgl` for a visual capture using that backend.

Serve fifteen exact burgers through three escalating shifts. Read the highlighted ticket, catch its layers from the conveyor in order, then deliver the completed burger to its matching color hatch. Correct deliveries reduce pressure. Errors, expired tickets and waste increase it. Later shifts add layers, faster belts and a steam vent.

- Move: left stick, WASD or arrow keys. Mouse: click the floor to move, ingredients to catch, or hatches to deliver.
- Catch / serve: Cross / A / Space.
- Change ticket: L1/R1 / LB/RB / Tab / 1–3, or click the ticket.
- Dash: Square / X / Shift. Toss tray: Circle / B / Q.
- Time-out bell: Triangle / Y / E. Pause: Options / Menu / Escape.
- Touch: drag on the left; correct catches and deliveries are assisted. Right-side catch and bell buttons are optional.

Settings include music/SFX volume, PlayStation or Xbox prompts and kitchen assistance. The pause menu opens Developer Kitchen, with live balance sliders, default reset, invincibility, autochef, tray fill, kitchen cooldown and shift advance.

The title starts an AI attract demo after ten seconds idle. Input returns to the title.

## Co-op

AI Hub sessions connect automatically for 1–4 chefs using shared-world authority and team results.

Standalone: open Co-op Kitchen. For same-origin tabs, one player opens a local kitchen and the others join. For remote play, host makes an invite; guest answers it; host connects the answer. Send the codes through your own messaging service. This is direct WebRTC with STUN, without a TURN relay or hosted signaling service. Availability across different networks depends on direct peer connectivity. The head chef starts service after the roster is ready.

## Build and test

Run `python3 build.py` from this directory to bundle the modules and About/Credits data into the HTML.

Run `./test.sh` for the complete suite. It starts its own loopback server on an OS-assigned port, runs gameplay, actual software WebGPU, emulated gamepad, touch, file URL, offline audio, two-page local/WebRTC, and four AI Hub fault scenarios, then closes its browser and server. It prints failures and one final check count only. It uses the preinstalled Playwright Python environment documented for this workstation.

`test-report.json`, `remote-report.json` and `hub-report.json` retain details. `exit-interview.json` in the parent directory provides source and feedback data also embedded in About/Credits.

All artwork, shaders, animation, music, sound and voices are generated in code. External dependencies are Three.js 0.180.0, Rapier 0.19.3 and web fonts. No source research or internet searches were performed.
