# The Great Below-About

A little lost. A long way down.

Open the delivered HTML in a modern browser. The file includes the engine, physics WASM, graphics, audio synthesis, animation, menus, and AI Hub client. Solo play works from `file://` with networking disabled. WebGPU is preferred; the same Three.js renderer can recover to WebGL 2 when graphics initialization fails.

Find Pip in the Frogstep Galleries, Marmalade across the Inkfin River, and the Sunseed Prism above the Balloon Belfry. Collect gold, light checkpoint lanterns, and approach the cave rat from behind. Creature contact costs score and rewinds to the last lantern; discoveries persist. Finding all three main discoveries completes the expedition. Solo play has no clock or limited lives.

Controls: WASD/arrows or left stick/D-pad to move, climb, swim, and steer; Space/Cross to jump; E/Square to release a balloon; M/Triangle for the map; Escape/Options to pause. Mouse clicks jump or release. Menus support pointer focus, keyboard, and controller navigation. PlayStation glyphs are default, with Xbox glyphs in Settings. Touch uses an invisible left thumbstick and right-side taps/context action, with assisted ledge jumps. Settings and music volume (10% default) persist locally.

After ten seconds of title inactivity, a looping scripted expedition shows the complete route. Any input returns to the title.

Pause → Developer camp exposes eight balance sliders, invincibility, collision-free flight, lantern warps, next discovery, reset, camera zoom, and exact simulation stepping. These tools mark local play as practice and are locked in scored Hub sessions.

Trail race supports 1–4 explorers. Host a six-letter room and share the code. Standalone Internet play uses PeerJS public signaling and WebRTC; local tabs also communicate through BroadcastChannel. Each explorer has separate treasure and hazards. Ghost positions, discoveries, scores, completion, and room membership are synchronized, with live standings at the finish. AI Hub sessions use Protocol v1 ghost mode exclusively, including synchronized start, score progress, time-up results, departure, and shutdown.

## Development

All project sources and artifacts are here. Gameplay/level data lives in `src/game.js`; original models, animation clips, and environment art in `src/art.js`; synthesized music/voices in `src/audio.js`; menus in `src/ui.js`; network transports in `src/network.js`.

`npm ci --ignore-scripts` installs the pinned dependencies. `npm run build` uses the installed Bun CLI to write the single HTML into this folder as `index.html` and into its parent using the requested delivery name. It also writes `exit-interview.json` from `feedback.json`. No build outputs are put in `/tmp`.

`./test.sh` is the one quiet verification command (`npm test` invokes it too). It prints failures only and one final count. Tests launch a single headless Chromium instance, an OS-assigned loopback HTTP port, and, for WebRTC verification, an isolated loopback PeerJS signaling server on an OS-assigned port. They close their own pages, contexts, server and process. The suite covers real physics traversal of the entire expedition, scoring and all creatures, native animation, offline launch, audio signal, menus and developer tools, emulated controller, real synthetic multitouch, WebRTC on isolated browser contexts, local rooms, fallback rendering, and the unmodified official Hub harness under packet loss and host departure. Results and visual composition captures are in `artifacts/`.

## Engine recovery patch

`vendor/patch-three.mjs` applies a small, checked change to Three.js r180's `WebGPUPipelineUtils`: the rejection of `createRenderPipelineAsync` is forwarded to the promise awaited by `compileAsync`. Upstream r180 otherwise leaves that promise unresolved and creates an unhandled rejection on GPU pipeline failure. The app catches the propagated failure and initializes WebGL 2 on a replacement canvas. The patch is applied on build, is limited to this project's dependency copy, and is included in the bundled engine. The application also bounds shader preparation time. The engine version remains r180.

## Research and credits

Research began with [Activision’s original 1984 Atari 2600 manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=359), the [AtariAge screenshots](https://atariage.com/screenshot_page.php?SoftwareLabelID=359), and [game profile](https://atariage.com/software_page.php?SoftwareLabelID=359). The original’s continuous cave, rescue objective, swimming, balloons, rat behavior, forgiving checkpoints, score penalties, and changing music inform this original game. Names, writing, level layout, models and melodies are new.

Networking follows the [AI Hub Session Protocol v1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub). Its client is embedded unmodified as the first head script. Three.js and PeerJS use MIT licenses; Rapier uses Apache-2.0. License text is embedded in the HTML. Feedback and source details are also available from About this expedition.
