`PLAN.md` and `planner-exit-interview.json` are both done and in this folder. The plan covers everything `TASK.md` asks for, with a section-by-section map in §16, and the JSON parses with all four answers. No game was built at this stage.

**The plan:** an original gothic isometric action RPG for 1–4 players, with its own world, names, music and UI look. A clapperless bell starts ringing and the dead rise; you silence it, then learn it was what held the underworld down, and you have to ring it again. The title and `TASK.md`'s file names are left to each builder.

**Tested with a throwaway prototype, since deleted:**
- **Packaging:** the plan's one-file build script, run as written, produces a 6.7 MB page that opens from `file://`.
- **Startup:** drawing walls as instanced props instead of level tiles cut software-rendered startup from 113 s to about 12 s. That's why the plan builds the world that way.
- **Multiplayer:** all hub scenarios pass (1–4 players on a bad network, host leaving, dedicated server), and they only passed with a specific startup order, which is in §3.8. Copies send inputs rather than world state; two copies matched at every checkpoint through 3,022 ticks.

**Not tested:**
- Balance numbers and most content are starting values to tune.
- There was no real GPU, controller, TV or listening test here.
- Couch co-op and the four-copy Node sync test are designed but were never run.
- Browser hash comparison only worked with two copies, because 3–4 copies render too slowly here.

**Fix these in your prompt or setup, because every builder will hit them:**
- **WebGPU flag:** `--use-webgpu-adapter=swiftshader` in `TASK.md` stalls the engine's startup (not ready after 120 s). The engine's own flags are ready in about 12 s.
- **Long `TMPDIR`:** it crashes full Chrome ("Socket path too long") and `npx tsx`.
- **`scripts/setup.sh`:** it downloads a Node and a Chrome outside the run's folder, and isn't needed here.
- **Git:** the starter's `AGENTS.md` says to commit, but the folder sits inside your repository. The plan tells builders to leave git alone.

The plan works around all of these, and the exit interview lists them too.

**Two calls you may want to check:**
- I read "the game on its own" as also needing local multiplayer, so the plan adds couch co-op, which is real extra work for builders. The narrower reading is that the game just has to run outside the hub; to take that, delete §12.1's couch co-op.
- `STAGE.md` didn't say whether a planner may run code; I prototyped anyway so builders wouldn't inherit guesses.

**Leftovers:** some test commands used `/tmp` for short socket paths. That left cache files in `/tmp/tsx-1000`, which other agents appear to share, so I left that folder alone.