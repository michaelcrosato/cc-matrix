SOURCE: Wii Fit

Genre: Pick the game genre(s) that best fit the source and would make the best game.

Perspective: Pick the camera perspective(s) that best fit the genre and source and would make the best game.

Game Title: A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).

Research: Whether and how much to research is your choice.

Package: For ease of deployment and sharing provide a single html file [GameTitle-SOURCE-claude-sonnet-5-5-medium-20261104-224025].html. Dependencies that can be downloaded do not have to be included in the html file if that is easier.

Tech Stack: Build on https://github.com/michaelcrosato/shardfall/blob/main/START_HERE.md, making a new game on its engine. You may change anything in it, the engine included, and add whatever systems, art assets and animations the game needs. The rest of the tech stack is your choice.

Art Direction: Use the engine’s native style as the base. Make new art assets for whatever makes the game feel like the source; the engine’s asset library is fine for generic props.

Animation: Use the engine’s native animation system as the base. Make new animations for whatever makes the game feel like the source.

Audio: All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish. Music is to be set to 10% volume by default.

Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

Working Environment and deliverable:
Create a subfolder called [GameTitle-SOURCE-claude-sonnet-5-5-medium-20261104-224025] to keep all your dev files in. You can develop separate modules, then bundle into a single file [GameTitle-SOURCE-claude-sonnet-5-5-medium-20261104-224025].html in root when you’re done. You may use external CDN dependencies. Do not read files outside what you need: other agents work in the folders beside this one. They share this machine’s ports and processes too. Prefer file:// and the engine’s headless tools. If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks (`python3 -m http.server 0 --bind 127.0.0.1` prints it) and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never pkill, killall, fuser -k, or kill whatever holds a port.

Performance: Treat the performance budget as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

Testing: Test as much as you like with headless tools: scripts that play the game and check its state, including a scripted playthrough of the whole game. Keep them behind one command that prints only failures and a one-line count, and rerun it only after changing the code it covers. Use screenshots only for what a script can’t check. Don’t use subagents or workflows to debate, review, judge or audit.

Effort: Spend effort however you see fit.

## This computer
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

### What this computer doesn't have

No script can check these, so they're written by hand. Test with the stand-ins; anything that needs the real thing is checked as far as it can be here, never required.

- **No physical controller.** Emulate one: replace navigator.getGamepads with a stub that returns a pad in the standard mapping (Playwright's add_init_script / addInitScript).
- **No touch device.** Use Playwright's phone and tablet profiles, which have touch, and tap with page.touchscreen.
- **Nobody to listen.** Check sound by what Web Audio produces: render it with an OfflineAudioContext, or read levels from an AnalyserNode.
- **No second player.** Play multiplayer with two browser pages (or contexts) on this computer.
- **No real iPhone or iPad.** WebKit with an iPhone profile is the closest; it isn't iOS Safari.
- **No TV.** Judge the 10-foot view from screenshots at 1920×1080.

### Sharing this computer

- Other agents run here at the same time. Keep one or two browsers open at once, and close them when you're done.
- Keep every file you make inside your own folder, not /tmp or a parent folder: /tmp is shared.
- The browsers are already downloaded: don't run `playwright install` or `playwright install-deps`.
- The system Python has Playwright and nothing else. For one (Pillow, numpy …), use uv: `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser too (a newer Playwright can't find the browsers here).

## Goal

Build an original game inspired by the source.

Scope

Create a feature-complete demo. Capture what makes the source distinctive (its world, characters, themes and tone) and turn it into the mechanics, pacing and UX of a great game. The demo must be long enough to show ALL features and gameplay mechanics so a player can clearly understand how the game plays and feels, and what they can and cannot do. Treat the demo as a complete, polished vertical slice. It should contain all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools.

Include a dev mode, reachable from the pause menu, with the standard tools for testing the game quickly. Balance is key, so expose the most important gameplay variables as live sliders, with a reset to defaults.

Attract Mode: After 10 seconds without input on the title/menu screen, start a looping AI-played demo or scripted replay (arcade/kiosk style); any input exits it. The AI (or replay) can be simple and may cheat freely (infinite health, ammo, abilities, no clip, etc). Its only job is to show as much of the demo as possible, the attract mode is not meant to balance the game.

Multiplayer: Follow https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub for multiplayer integration into ai-hub as well as for the game on its own.

Narrative tone: Use a writing style similar to the source’s.

## UI & UX: 10-Foot Controller-First Philosophy
Design the game around a PS5 DualSense (or any pad the browser reports in its standard mapping) played on a TV at 10 feet. With keyboard and mouse it's the same game on the same screens, not a separate desktop layout, but they should feel native, not like stand-ins for controller buttons. The keyboard uses the keys PC players expect for the genre. The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus) wherever the genre uses it. On-screen prompts follow the input used last: PlayStation glyphs for the controller (with a Settings option to show Xbox glyphs, A B X Y, instead), keys and mouse buttons for keyboard and mouse.

Do not use overly dense, web-style data screens.

Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button. Let the attract mode run.

## Done
No TODOs, placeholders, or stubbed features. The demo is complete.

## Source Information
CRITICAL: Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen. Write "unknown" for anything you can't confirm.
- Date: 2026-11-04 22:40:25
- Source: the work it's based on
- Plan: the file name of the plan you were given to build from, or none
- Genre and Perspective: genre and camera perspective used
- Tech: stack, libraries/engines, with versions if applicable
- Art Direction: style used
- Animation: system used
- Audio: music, sound effects and voice used
- Online: network features used, or none
- Testing: testing parameters allowed
- Research: research done, or none
- Environment: Claude Code CLI (headless); Linux
- Model: Anthropic, claude-sonnet-5-5, reasoning effort medium
- Usage: write "added on import". You can't see your own cost, so don't estimate it: the runner records the real cost, tokens and time, and the agent that imports the game into AI Hub puts them on your About/Credits screen.

Exit interview: before you finish, also save these answers as exit-interview.json in this folder's root, beside the game's .html: one JSON object in exactly the shape below, every value filled in ("unknown" for anything you can't confirm). Tools read it (the game's run record and the AI Hub catalogue), so write plain text, and check that the file parses as JSON.
{
  "sourceInformation": {"date": "", "source": "", "plan": "", "genre": "", "perspective": "", "tech": "", "artDirection": "", "animation": "", "audio": "", "online": "", "testing": "", "research": "", "environment": "", "model": "", "usage": "added on import"},
  "testingFeedback": ["your answer to each Testing Feedback question, in order"],
  "engineFeedback": ["your answer to each Engine Feedback question, in order"],
  "promptFeedback": ["your answer to each Prompt Feedback question, in order"],
  "aiHub": {
    "name": "the game's title, as on its title screen",
    "tagline": "a few words to go under the title",
    "description": "one or two sentences for the catalogue",
    "type": "Game, Tech demo or Tool",
    "genre": "one of Action, Adventure, Fighting, Flight, Horror, Kids & Learning, Life Sim, Platformer, Puzzle, Racing, RPG, Shooter, Simulation, Sports, Stealth, Strategy",
    "source": "the work it's based on, e.g. Moby-Dick",
    "series": "its franchise, e.g. Star Fox, or empty",
    "players": "how many can play: 1, 1–2 or 1–4",
    "controls": "the controls, in one line",
    "tags": ["3 to 6 lowercase tags, e.g. 2d, 3d, arcade, story, co-op, versus, first-person, third-person, top-down, side-scrolling, pixel art, low-poly, retro, sci-fi, fantasy, comedy, vehicles, boss fights, exploration"]
  }
}
The catalogue's model, effort, CLI, date and usage come from the run's record after you finish, so they aren't asked here.

Testing Feedback

- How many issues did testing catch?
- How many would be considered critical issues / game breaking?
- What was the most helpful test you ran?
- What was the least helpful test you ran?

Engine Feedback

- What did you like most about the engine?
- Did you get stuck or guess wrong?
- What was the most important thing you had to build yourself?
- What was the hardest part about using the engine?
- What did you change in the engine, and why? (none if nothing)
- If you could change one thing about the engine, what would it be?

Prompt Feedback

- What did you like most about this prompt?
- What was confusing?
- What was the hardest thing to do?
- What would you change in this prompt?
