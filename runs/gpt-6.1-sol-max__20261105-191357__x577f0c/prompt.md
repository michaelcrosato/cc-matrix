SOURCE: Haunted House - 1982

Genre: Pick the game genre(s) that best fit the source and would make the best game.

Perspective: Pick the camera perspective(s) that best fit the genre and source and would make the best game.

Game Title: A playful riff on SOURCE's name. Silently brainstorm 50 titles, then pick one with a real random number generator (e.g., run code).

Research: Research the source before you start: its mechanics, levels, enemies, look and sound.

Package: For ease of deployment and sharing provide a single html file [GameTitle-SOURCE-gpt-6.1-sol-max-20261105-191357].html. Dependencies that can be downloaded do not have to be included in the html file if that is easier.

Tech Stack: Use Three.js R180, WEBGPU, rapier 0.19.3 for physics, Gamepad API; The rest of the tech stack is yours to choose.

Art Direction: Use a stylized cel-shaded / ink look for the game.

Animation: Use the engine’s native animation system as the base. Make new animations for whatever makes the game feel like the source.

Audio: All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish. Music is to be set to 10% volume by default.

Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub

Working Environment and deliverable:
Create a subfolder called [GameTitle-SOURCE-gpt-6.1-sol-max-20261105-191357] to keep all your dev files in. You can develop separate modules, then bundle into a single file [GameTitle-SOURCE-gpt-6.1-sol-max-20261105-191357].html in root when you’re done. You may use external CDN dependencies. Do not read files outside what you need: other agents work in the folders beside this one. They share this machine’s ports and processes too. Prefer file:// and the engine’s headless tools. If you need a server (the AI Hub harness does), bind 127.0.0.1 on a port the OS picks (`python3 -m http.server 0 --bind 127.0.0.1` prints it) and confirm the page is your game before trusting a result. Stop only processes you started, by their PID: never pkill, killall, fuser -k, or kill whatever holds a port.

Performance: Treat the performance budget as unlimited. Add as much detail, enemies, effects, lights, and shadows as the scene needs. Out of scope (handled later): FPS targets, optimization.

Testing: Test as much as you like with headless tools: scripts that play the game and check its state, including a scripted playthrough of the whole game. Keep them behind one command that prints only failures and a one-line count, and rerun it only after changing the code it covers. Use screenshots only for what a script can’t check.

Effort: Spend effort however you see fit.

## This computer
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
- The system Python has no packages. For one (Pillow, numpy …), use uv: `uv run --with pillow python script.py`, adding `--with playwright==1.63.0` when the script drives a browser too (a newer Playwright can't find the browsers here).

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

Touch-only devices: to keep the screen clear bare minimum or no UI (other than a menu button), invisible thumb sticks, multitouch, automate/assist with everything you need to accommodate the challenges of mobile/touch controls, use contact sensitive pop action and button on screen while possible

## Done
No TODOs, placeholders, or stubbed features. The demo is complete.

## Source Information
CRITICAL: Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen. Write "unknown" for anything you can't confirm.
- Date: 2026-11-05 19:13:57
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
- Environment: Codex CLI (headless); Linux
- Model: OpenAI, gpt-6.1-sol, reasoning effort max
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
