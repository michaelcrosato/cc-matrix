`PLAN.md` is finished and covers everything in `TASK.md`; a table at the end maps each requirement to its section. `planner-exit-interview.json` is saved beside it with all four answers and parses as valid JSON. I haven't committed anything, and the temporary engine clone and test scripts are deleted.

**The game:** an original over-the-shoulder action-horror set on a fog-bound fishing island in 1979. A deadpan insurance adjuster fights polite, parasite-ridden islanders while the Harbormaster fines her over the tannoy, and the final boss is called the Underwriter. It keeps the source's genre and mechanics, such as planted aiming, body-part reactions leading to melee follow-ups, grid inventory, a trader and escort. All names, characters, places, creatures and jokes are new, and the plan lists what must not be copied.

**What the plan gives builders:**
- A five-chapter campaign with stats and starter dialogue.
- 1–4 player co-op through AI Hub, with a simpler fallback mode.
- Audio, UI, attract mode and dev mode specs, plus the engine changes needed.
- A test setup behind one command, and a build order with a list of what to cut first if a builder runs short.

**What I tested on this machine:** the engine's starter game in the browser and the hub harness, plus a throwaway look-test room. The plan marks these results `[V]`; the gameplay itself hasn't been built or run.
- **Hub harness:** it passes at 2, 3 and 4 players on a bad network, with the host leaving, and with a server host. That was the starter game with a JS stand-in for game logic.
- **Art route:** two small engine patches, block materials and props worn on character bones, plus a custom asset pack, render correctly in the real browser build.
- **Details builders need:** every animation clip named in the plan exists, and build times are measured.

**Problems in `TASK.md`:**
- **Chromium flags:** the flags in the computer notes crash the GPU process once 3 or more WebGPU copies share a browser. That fails the hub check and looks like a game bug. Adding `--use-vulkan=swiftshader --use-angle=swiftshader` fixed it in every scenario.
- **Port example:** `python3 -m http.server 0` hangs any script reading the port from a pipe; `python3 -u` fixes it.

The plan warns builders about both, and the exit interview suggests correcting them in the brief. Also, the hub's "draws its screen" check looks after about 7 seconds, but software WebGPU can stay blank for over 14, so the plan has builders show a loading screen first.