# Yars of Ruin

A complete three-station arcade siege campaign inspired by Yars’ Revenge (1982). You are Rill, a winged survivor. Bite a breach through a fortress shell, steal its energy, call a rail-mounted siege cannon, and get out of its way. Venn can join the same arena locally or through AI Hub.

Open the root `Yars-of-Ruin-Yars-Revenge-gpt-6.1-sol-ultra-20261106-022904.html` directly in a browser, or this folder’s identical `index.html`. Everything is embedded; no server, assets, network connection or installation is needed for standalone play. The game uses the actual my-3D2dge 0.89.1 handoff and its native overhead renderer, Shell, input, settings, pixel art, particles and lighting. The engine and Hub client are pinned and vendored; see [provenance](docs/provenance.md).

From this development folder:

```
npm run build
npm test
```

`npm run build` regenerates the root artifact and identical development `index.html` using only Node built-ins. It embeds the pristine released AI Hub client as the first script, and safely embeds the native engine and authored source. `npm test` runs deterministic rules, drawn-headless rendering, online authority/lifecycle mocks, HTML/interview integrity, actual file-URL Chromium/WebKit input/audio/touch tests, and the official AI Hub browser harness. Only failures and a final count are printed. Evidence is retained in `tests/artifacts/`. No package installation is required. The browser runner uses the workstation’s existing Python Playwright 1.63.0 environment and downloaded browsers.

For targeted iteration after a covered change: `npm test -- --group=sim`, `online`, `presentation`, `artifact`, `browser`, or `hub`. Hub checks bind a local server to 127.0.0.1 on an OS-selected port and shut it down afterward. The full Hub group includes two ordinary-action campaign runs with a player host under150ms latency/50ms jitter/5% loss, and a hidden dedicated server with ordinary sampled remote controls under0added network impairment; allow a few minutes.

Normal and Assist retain the full mechanic set and keep separate solo/co-op records. The campaign has three stations requiring one, two and three hits; its last hit must intercept the airborne fortress. Victory and defeat offer replay, discovered-sector practice and credits. Practice and developer changes never update normal campaign records. After ten idle menu seconds, an isolated AI demonstration plays the actual campaign and loops; any real input returns to the title.

See [controls and play](docs/controls.md), [designer guide](docs/authoring.md), [source research](docs/research.md), [art and audio](docs/art-audio.md), and [test evidence](docs/testing.md). The root `exit-interview.json` is the machine-readable report embedded in About / Credits during the build.
