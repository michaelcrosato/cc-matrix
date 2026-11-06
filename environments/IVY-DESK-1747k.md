# IVY-DESK-1747k: what this computer has

<!-- checked: written by node check-environment.mjs, replaced each time it runs -->
Checked 2026-11-05 19:08 (America/Vancouver) by node check-environment.mjs.

- **Computer:** IVY-DESK-1747k: Intel(R) Core(TM) i7-14700F, 20 cores, 16 GB RAM, 8 GB swap. Ubuntu 26.04.1 LTS on WSL2 (Linux 6.18.33.2-microsoft-standard-WSL2).
- **Space:** 757 GB free in the home folder. /tmp: 7.8 GB, in memory (tmpfs), 7.7 GB free when checked.
- **Display:** none for runs (they run with DISPLAY unset), so a headed browser needs xvfb-run.
- **Browsers:** Playwright 1.63.0 for Python (from playwright.sync_api import sync_playwright), with Chromium 153.0 (WebGL 2, software-rendered; WebGPU, software-rendered, when started with --enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader), Firefox 155.0 (no WebGL), WebKit 26.6 (WebGL 2) already downloaded. Phone and tablet device profiles are built in.
  Python's Playwright is in its own environment, not the system Python (python3 can't import it): run scripts that drive a browser with `/home/micha/.local/share/pipx/venvs/playwright/bin/python script.py`, or `uv run --with playwright==1.63.0 python script.py`.
  WebGPU only works on a secure page: file:// or http://127.0.0.1. A WebGPU canvas can come out blank in a headless screenshot, so check the game's state instead.
  For Node, `npm install playwright@1.63.0` in your folder uses the browsers already downloaded; another version downloads its own.
- **Tools:** node 24.21.0, npm 12.1.0, python3 3.14.4, pip3 25.1.1, git 2.53.0, gh 2.101.0, curl 8.18.0, wget 1.25.0, jq 1.8.1, ffmpeg 9.0.2, ffprobe 9.0.2, sqlite3 3.46.1, zip 3.0, unzip 6.00, rustc 1.98.1, cargo 1.98.1, go 1.27.1, java 21.0.12, xvfb-run, magick 7.1.2, sox 14.4.2, bun 1.3.14, deno 2.9.7, uv 0.12.18, tsc 5.9.3, wasm-bindgen 0.2.129.
- **Rust:** rustup's toolchains 1.98.1, stable; the wasm32-unknown-unknown target on 1.98.1, stable.
- **Not installed:** lighthouse, shot-scraper, esbuild.
- **Network:** internet works (github.com, registry.npmjs.org).
<!-- /checked -->

## What this computer doesn't have

No script can check these, so they're written by hand. Test with the stand-ins; anything that needs the real thing is checked as far as it can be here, never required.

- **No physical controller.** Emulate one: replace navigator.getGamepads with a stub that returns a pad in the standard mapping (Playwright's add_init_script / addInitScript).
- **No touch device.** Use Playwright's phone and tablet profiles, which have touch, and tap with page.touchscreen.
- **Nobody to listen.** Check sound by what Web Audio produces: render it with an OfflineAudioContext, or read levels from an AnalyserNode.
- **No second player.** Play multiplayer with two browser pages (or contexts) on this computer.
- **No real iPhone or iPad.** WebKit with an iPhone profile is the closest; it isn't iOS Safari.
- **No TV.** Judge the 10-foot view from screenshots at 1920×1080.

## Sharing this computer

- Other agents run here at the same time. Keep one or two browsers open at once, and close them when you're done.
- Keep every file you make inside your own folder, not /tmp or a parent folder: /tmp is shared.
- The browsers are already downloaded: don't run `playwright install` or `playwright install-deps`.
- The system Python has no packages. For one (Pillow, numpy …), use uv: `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser too (a newer Playwright can't find the browsers here).
