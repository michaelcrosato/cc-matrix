`PLAN.md` is written and covers everything in `TASK.md`; I searched it for the brief's key requirements and they're all there. `planner-exit-interview.json` is saved too and parses as valid JSON. Neither file is committed, and I deleted my 7.4 GB scratch folder, so the work folder now holds only those two files plus `STAGE.md` and `TASK.md`.

**The game in the plan**
- **Genre and camera:** an original first-person open-world survival shooter, with a chase camera available while driving.
- **Setting:** an invented war-torn country with its own factions, cast and story, and three endings. The plan lists the source's names as off limits.
- **Left to builders:** the title and `TASK.md`'s file names, as `STAGE.md` asked. Paths are relative to the dev folder.
- **What builders get:**
  - specs for every system, with starting numbers
  - a map and contract list
  - controls and screens
  - a build order with exit checks for each stage
  - a test list and a final "done" checklist

**What I tested by building the engine here**
- **Build:** the headless tool and the web page each build in about 2 minutes, and the page comes to 11.4 MB.
- **Hub harness:** an engine page with the session client pasted in passes all four harness scenarios, and also passes the game's own pre-round card on the three I reran with it. This used the starter game and a small test script, not real multiplayer.
- **Test setups:** a stubbed controller, pointer lock, and two-window networking (`BroadcastChannel` and WebRTC) all work in headless Chromium, with quirks the plan records.

**Worth changing in your prompt template**
- **Broken WebGPU flags:** with the flags in `TASK.md`, this engine's page loses its GPU device and stays blank, while still reporting 60 fps. The engine's own flags work, and the plan tells builders to use them, but the template itself still needs fixing.
- **Unclear multiplayer wording:** "as well as for the game on its own" can be read two ways. The plan covers both: a clean solo game and the same co-op round playable outside the hub. If you only meant the solo fallback, that part can be dropped.

**Not tested**
- **First-person camera:** it's designed from reading the engine's code but not prototyped, so it's the first thing builders must prove. The plan makes this their first gameplay milestone, with a look test.
- **Balance and netcode:** the balance numbers and multiplayer design are untested starting points.
- **Software rendering:** the page ran at only about 2 fps, so the plan runs gameplay tests headless in the native tool and keeps browser tests to UI, input and hub checks.