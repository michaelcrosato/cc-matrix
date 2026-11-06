# Progress — Fit Getaway

- Title picked by RNG from 50 candidates: **Fit Getaway** (index 48). Dev folder: `Fit Getaway-Wii Fit-muse-wonder-1.0-max-20261104-221652/`. Deliverable HTML + `exit-interview.json` in work root.
- Engine kit 0.46.0 flattened into dev folder; `pixel-engine.js` untouched (sha256 in `vendor/pixel-engine.sha256`). Hub client 1.4.0 in `vendor/hub/`.
- Done: Dot physics + bots, tunables, voice synth, songs/SFX, Title/menus, Settings, About, Island hub with stations, Weigh-In + Wobble Age, all activities (still/reps/hoop/step/header/slack/tray/jog/pier/longstand), Evening Report, Jar/Locker/Hall, Family Medley + Hub ghost Card, Ending/confession, Dev Tools, attract mode, pause.
- Tests: `node tools/test.mjs` final run **230/230 passed**. `node check.mjs game.html` OK on WebGPU. Hub harness: all 4 cases pass (1, 2, 4 players with latency/jitter/loss, host-leave). Browser smoke: file:// boot, title, music 0.10, pad stub, phone profile all pass. Screenshots checked: title + Apologetic Tree activity at 1920x1080.
- Done. Standalone deliverable needs no server: open the HTML file in a browser.
