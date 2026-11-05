# Worki9: what this computer has

<!-- checked: written by node check-environment.mjs, replaced each time it runs -->
Checked 2026-11-04 20:05 (America/Vancouver) by node check-environment.mjs.

- **Computer:** Worki9: 13th Gen Intel(R) Core(TM) i9-13900K, 32 cores, 20 GB RAM, 8 GB swap. Ubuntu 26.04.1 LTS on WSL2 (Linux 6.18.33.1-microsoft-standard-WSL2).
- **Space:** 850 GB free in the home folder. /tmp: 9.8 GB, in memory (tmpfs), 8.2 GB free when checked.
- **Display:** none for runs (they run with DISPLAY unset), so a headed browser needs xvfb-run.
- **Browsers:** Playwright 1.63.0 for Python (from playwright.sync_api import sync_playwright), with Chromium 153.0 (WebGL 2, software-rendered; WebGPU, software-rendered, when started with --enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader), Firefox 155.0 (WebGL 2, software-rendered), WebKit 26.6 (WebGL 2) already downloaded. Phone and tablet device profiles are built in.
  WebGPU only works on a secure page: file:// or http://127.0.0.1. A WebGPU canvas can come out blank in a headless screenshot, so check the game's state instead.
  For Node, `npm install playwright@1.63.0` in your folder uses the browsers already downloaded; another version downloads its own.
  Playwright runs here with PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 (already set for runs): this OS isn't one it supports by name.
- **Tools:** node 24.22.1, npm 11.19.1, python3 3.14.8, pip3 26.2.1, git 2.56.0, gh 2.46.0, curl 8.22.0, wget 1.25.0, jq 1.8.1, ffmpeg 9.0.2, ffprobe 9.0.2, sqlite3 3.53.4, zip 3.0, unzip 6.00, rustc 1.99.0, cargo 1.99.0, go 1.27.1, java 27, lighthouse 13.5.0, shot-scraper 1.12, xvfb-run, magick 7.1.2, esbuild 0.28.2, uv 0.12.23, tsc 7.0.2, wasm-bindgen 0.2.129.
- **Rust:** rustup's toolchains 1.96.0, 1.98.1, stable; the wasm32-unknown-unknown target on 1.98.1.
- **Not installed:** sox, bun, deno.
- **Network:** internet works (github.com, registry.npmjs.org).
- **Memory:** earlyoom is on: when memory runs out it ends the biggest browser, so "Target closed", "page crashed" or "browser has been closed" means memory ran out, not a bug in your game. Run fewer browsers at once rather than retrying.
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
- The system Python has Playwright and nothing else. For one (Pillow, numpy …), use uv: `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser too (a newer Playwright can't find the browsers here).
