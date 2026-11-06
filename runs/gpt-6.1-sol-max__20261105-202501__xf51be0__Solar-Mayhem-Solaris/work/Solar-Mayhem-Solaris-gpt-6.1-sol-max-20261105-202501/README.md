# Solar Mayhem

A complete, original space-shooter vertical slice inspired by **Solaris (1986)**. Open the root `Solar-Mayhem-Solaris-gpt-6.1-sol-max-20261105-202501.html` directly in a modern browser. The engine, physics WASM, fonts, geometry, animation and audio are embedded. Solo play works offline.

Fly with **WASD**, the **mouse**, or the **left stick**. Hold **Space / click / R2** to fire. **Shift / Cross** boosts, **E / Square** pulses, **Q / Circle** rolls, **Tab / Triangle** opens the scanner and **Esc / Options** pauses. Standard mapped pads are supported; Settings switches PlayStation and Xbox prompts. Touch devices use an invisible stick, automatic fire and rescue assistance.

The route covers fleet defense, four cadet rescues, docking, a keyed ion corridor, a wormhole with six focus rings, and a three-phase flagship. After the first fleet, rescue and refueling can be tackled in either order; both are required to reach the corridor. Missed cadets and keys return. An emergency tug prevents a low-fuel navigation lock. The campaign has reserve craft, defeat, victory, checkpoint saves, high scores and restart.

Pause → Developer Tools exposes live damage, fire rate, fuel consumption, steering, lock radius and boss health sliders, plus reset, invincibility, supplies, spawning, encounter jumps, completion and autopilot. The title starts a looping AI campaign after ten idle seconds; any input returns control to the title.

AI Hub uses the unmodified Protocol v1 client in ghost mode for 1–4 pilots. Outside Hub, Wing Race offers same-origin BroadcastChannel rooms for up to four tabs on one browser, or two-device WebRTC with a manual invitation/answer exchange. WebRTC was checked with two browser pages; arbitrary internet NAT compatibility is unknown. Both modes exchange noninteracting pilot ghosts and scores. Hub supplies round timing and results.

Build with `npm run build`. Run all checks with `./test.sh`; it binds a temporary server to an OS-selected loopback port, closes its own browsers and server, and prints only failures and a one-line count. It includes a full simulated campaign, combat, game-over/restart, live tuning, saves, analog gamepad, touch, audio levels, attract mode, standalone networking, refuel-first routing, offline file launch, metadata and the AI Hub harness at two and four players, including packet loss and host departure. Reports are in `artifacts/`.

Use `./test.sh --visual-only` for visual-review screenshots on the renderer's WebGL2 fallback. The normal checks use real software WebGPU. The environment's headless WebGPU screenshot can be blank, so screenshots are not evidence of WebGPU state. `--smoke`, `--campaign-only` and `--hub-only` select smaller suites.

Research sources: [Atari's original manual](https://www.atariage.com/2600/manuals_old/solaris.html), [Doug Neubauer's history](https://dougneubauer1.wordpress.com/atari/), [AtariAge screenshots](https://atariage.com/screenshot_page.php?SoftwareLabelID=450), [gameplay captures](https://thekingofgrabs.com/2023/05/18/solaris-atari-2600/), official [Three.js documentation](https://threejs.org/docs/) and [Rapier documentation](https://rapier.rs/docs/user_guides/javascript/), and the [AI Hub session contract](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub). The manual's warning and combat sound cues informed the audio; exact original timbres are unknown.

The fifty-title draw used `node:crypto.randomInt(50)`; the recorded outcome is in `selection.json`. No source-game artwork or audio is included. Third-party engine/font licenses are embedded in the HTML and retained under `reference/`.

The requested Source Information and feedback are included in all four tabs of About / Credits and the root `exit-interview.json`. Usage is deliberately recorded as **added on import**.
