# Jungle Jinks

An original four-act jungle arcade adventure inspired by the prompt's **Jungle Hunt — 1983**. The title was selected with `node:crypto.randomInt` from 50 candidates; the draw is recorded in `title-selection.json`.

Open the HTML in the parent folder directly. All code, Three.js r180, Rapier 3D 0.19.3, WebAssembly, geometry, textures, typography and audio synthesis are bundled into that single file. No asset downloads, build step, or web server are needed to play. WebGPU is the primary renderer; the same renderer supports WebGL 2 as a fallback. A graphics-device recovery path preserves the expedition.

## Play

- Move: left stick / D-pad, WASD or arrows.
- Jump, catch, release, swim surge: Cross / Space.
- Machete swish: Square / J / X / left click.
- Wind winches and rescue: hold Triangle / E / right click.
- Duck: Circle / Shift / Down.
- Pause: Options / Escape. Create + Options stays reserved for AI Hub.
- Touch: drag anywhere on the left half; tap the right half. Hold the contextual action circle at winches. Crocodile defense is assisted.

Act 1 is a vine traversal. Act 2 adds swimming, oxygen, air columns and crocodiles. Act 3 adds rolling physical boulders and ducking. Act 4 combines traversal, mechanical guardians, three winches and a final rescue. Gold relics and trail coins improve the final rank. Camp flags restore one heart and set recovery points. Losing all hearts offers immediate checkpoint recovery.

Ten seconds of menu inactivity starts an AI expedition through all four acts. Any input returns to the title. Pause → **Expedition workshop** provides live balance sliders, invincibility, AI piloting, free flight, act selection, camp warps, resource refill, boulder spawning and reset to defaults. Options persist locally; workshop values apply to the current expedition.

## Race

- Couch: two independent split-screen explorers. Player 2 uses a second standard pad, or G/L horizontally, Y/H vertically, B to jump, N to swish, M to interact. First rescue wins.
- Direct online: two devices exchange WebRTC invitation/reply codes through the in-game menu. Host starts a shared countdown. Google STUN assists direct connectivity; there is no TURN relay. Restrictive NATs may prevent a direct connection.
- AI Hub: 1–4 player ghost races use Session Protocol v1 and the unmodified 1.4.0 client in the HTML head. Ready, shared start, seeded initialization, ghost snapshots, progress, time-up, results, departure and end handling are implemented. No independent networking is created during Hub sessions.

## Develop and verify

From this folder:

```sh
npm ci
npm run build
npm --silent test
```

The test command builds the final artifact, starts its own server bound to `127.0.0.1` on an OS-selected port, verifies the game's identity, runs the checks, and shuts down its own browser and server. It prints failures and a single result count. It uses the workstation's installed Python Playwright environment. A different workstation can change the Python executable in `package.json` to a Python environment with Playwright and Chromium installed.

`npm --silent test -- --render-only` runs the rendering and portability subset. The native WebGPU readback checks actual rendered pixels. Some headless Chromium configurations capture a blank WebGPU canvas, so art review uses images from the WebGL 2 backend. Tests use explicit SwiftShader/ANGLE flags; no GPU watchdog or real-display timing claims are made.

The full suite covers a complete expedition through ordinary gameplay inputs, physical controls, all act mechanics, checkpoint/death recovery, pad navigation, touch, audio synthesis and levels, split-screen, a two-page WebRTC race, the official Hub automatic harness in three network scenarios, renderer recovery, file opening, feedback screens and the exit-interview schema. Evidence is in `artifacts/`.

`src/art.js` contains editable stage data, procedural geometry, toon materials and native animation clips. `src/runner.js` contains fixed-step Rapier gameplay and balance defaults. `src/input.js`, `audio.js` and `network.js` provide their respective systems. `src/game.js` coordinates presentation, menus, progression and developer tools. `src/metadata.js` supplies the in-game credits and `exit-interview.json`. `build.mjs` embeds the exact Hub client and bundles everything with esbuild 0.25.11.

Source information and the complete exit interview are in-game under About & credits and in `../exit-interview.json`. Usage is **added on import**; costs and token counts are not estimated.

Three.js is MIT licensed. Rapier is Apache-2.0 licensed. Dependency license notices are retained in the bundled HTML; package sources and licenses are also in `node_modules` after installation. All game artwork and audio are procedural and original to this demo.
