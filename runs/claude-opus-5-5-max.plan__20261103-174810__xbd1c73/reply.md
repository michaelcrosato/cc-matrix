PLAN.md is written: about 1,460 lines in this folder. It opens with the title, **CRACKMANIA**, which an OS-entropy RNG picked from 50 riffs on "TrackMania".

**The game.** An arcade time-attack stunt racer, played through a third-person chase camera. The editor uses an orbiting camera over a 3D grid.
- **Content:** three environments, each with its own car: Dustbowl (desert), Hedgerow (countryside) and Frostpeak (alpine). There are 15 race tracks and 6 puzzles, all written as block programs, plus three 5-round Survival gauntlets.
- **TrackMania traits it keeps:** instant respawn and restart, a ghost of your best run, checkpoint splits, and Bronze/Silver/Gold/Author medals. Medals earn coppers, which buy track blocks in the editor.
- **Modes:** Race, Puzzle, Survival against three ghost rivals, Build (the editor), Hot Seat, Split Screen, Replays and a paint-shop Garage. Online play uses the AI Hub's `ghost` mode: a 3-minute time attack where other players show up as ghost cars.
- **Also covered:** Dev Mode with live sliders and reset, the 10-second attract mode, the touch-only screen, PlayStation/Xbox button prompts, three host/rival characters with gibberish voices, music, and About/Credits.

**Architecture.** It builds on the handoff's 2D engine plus the engine's own 3D layer (three.js r182 and Rapier), which lives in the repository but not in the handoff folder. The plan lists six small engine changes, such as drawing and following a car that's upside down in a loop. The car doesn't use the engine's vehicle (it can't drive loops) or a Rapier physics body. Instead it follows the road surface using four wheel rays. esbuild bundles everything into the single HTML file.

**Build order.** Twelve milestones, M0 to M11, each with exit tests. The riskiest parts come first: the toolchain, then driving, then stunts. Next comes the autopilot, which tests, medal times, rivals and the attract mode all depend on. The plan also lists the main risks and how to handle each one.

**Testing.** One command, `node tools/test.mjs`, prints only failures and a one-line count. It covers 15 test groups, including a scripted playthrough of the whole game, browser checks of the built file, and the AI Hub's own test page in three setups.

**Checked while planning:**
- **Headless engine:** the 3D engine runs headless in Node using the loader code in the plan.
- **Single file:** a 4.5 MB test build opened from `file://` in headless Chromium with zero errors (it fell back to WebGL 2) and drew the scene.
- **Track layouts:** all track and puzzle programs fit the grid with no overlaps.
- **Car code:** the printed car code holds a 12 m loop on full throttle from about 47 km/h, or from about 107 km/h when coasting. It clears a two-cell jump from about 160 km/h and lands upright. A first version let cars climb the loop at any speed; the plan's version fixes that by limiting thrust to what the tyres can grip.

**Your machine.** `/tmp` (a 9.8 GB tmpfs) was full when I started. I deleted only my own partial clone there and did the research on the main disk instead. I also deleted my 5.5 GB research folder in `~/.cache` at the end.