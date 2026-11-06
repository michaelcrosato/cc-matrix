# Wii Fit Together

This is a playable prototype of the Tippy Cay stay and its local and AI Hub medleys. The visible island, activities, interface, audio, save data and multiplayer coordination are implemented in `web/game.js` and `web/game.css`. Shardfall also contains a registered `fit` scene and balance spring, but it does not drive the visible game. The planned freely explorable native 3D island, full event-specific mechanics, expanded narrative and other features in `PLAN.md` remain incomplete.

## Run and build

Open the HTML file in the parent directory directly in a browser. A controller or keyboard is required; touch-only screens show the controller notice. Local progress is stored in browser local storage.

From the parent directory, run `bash 'Wii Fit Together-Wii Fit-gpt-6.1-terra-max-20261104-222701/scripts/build.sh'` to rebuild the engine's single-file web output and bundle the game. This requires Rust, the `wasm32-unknown-unknown` target and the `wasm-bindgen` CLI version matching `engine/Cargo.lock`. The build cache is intentionally removed from the hand-in, so the first rebuild recompiles the engine. For changes confined to `web/` or `exit-interview.json`, run `python3 'Wii Fit Together-Wii Fit-gpt-6.1-terra-max-20261104-222701/scripts/bundle.py'` against the included `game.raw.html` instead.

Run `bash 'Wii Fit Together-Wii Fit-gpt-6.1-terra-max-20261104-222701/tests/run.sh' all` for the scripted browser and AI Hub checks. The tests use Playwright's installed browser binaries and an ephemeral loopback server for the Hub harness.

## Extending the prototype

- **Event:** Add an entry to `events` in `web/game.js`, then implement its behavior in `tickRound`, scoring in `finishRound`, and any specialized presentation in `render` or `drawWorld`. Update the medley, unlocks and tests where applicable. Existing events share simplified mechanics rather than the full designs in the plan.
- **Set:** The current island is drawn procedurally by `drawWorld`; there is no data-driven set system. A new scene requires extending that drawing code and the screen flow, or implementing a native Shardfall scene if pursuing the planned 3D architecture.
- **Song:** `music` in `web/game.js` synthesizes a small looping note sequence with Web Audio. Change the notes and timing there, or introduce a separate sequencer and song selection before adding distinct tracks. `sound` and `voice` synthesize effects and chimes.

In a separate headless Chromium/SwiftShader probe, Shardfall reached its first frame but its WebGPU device was then lost. The visible Canvas 2D game continued running; hardware WebGPU and real iOS Safari were not verified.
