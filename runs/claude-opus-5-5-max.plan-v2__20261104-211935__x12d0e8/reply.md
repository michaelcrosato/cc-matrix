`PLAN.md` now covers everything in TASK.md, and §16 has a table mapping each TASK.md item to its section. `planner-exit-interview.json` is saved and parses. I checked the plan's riskiest tech with small test builds, but no game has been built from it yet.

**The game:** a first-person open-world mercenary game inspired by Far Cry 2, set in its own world.
- **Setting:** Concession Fourteen, a dying company-state where everyone goes by a job title (the Comptroller, the Foreman, the Widow, the Notary).
- **Mechanics kept in its own form:**
  - wind-driven grass fire
  - guns that rust and jam
  - recurring fever
  - field surgery
  - buddy rescues and mercy
  - a map held in your hand
- **Fixes to the source's weak spots:** cleared guard posts stay cleared, refilled only by a real truck, and faction papers let you bluff through checkpoints.
- **Content:** a full contract campaign with three endings, a co-op round called "The Job" for 1–4 players, and a style of ink outlines and cross-hatching.
- **For the builder:** title and TASK.md file names are left to each builder. The plan also has a build order and a table of what may shrink and what must never be cut.

**What the test builds found, all recorded in the plan:**
- **TASK.md's WebGPU flags don't draw here:** the graphics device is lost on the first canvas frame, with no JS error. The hub's own flags give real pixels and working screenshots, so the plan tells builders to use those.
- **Hub check at four players:** even a small test page failed in the hub's default browser, because all copies share one main thread. Changing the boot order fixed it: all six hub cases pass with the flags, and the three I reran with no flags pass too. That order is now a rule in the plan.
- **Code recipes:** I pulled the rendering and physics code out of `PLAN.md` as written and ran it. The rendering gives the same inked wildfire picture on WebGPU and on the WebGL2 fallback, and the physics code runs in Node.

**Not tested:**
- **Full game on the hub:** the hub results come from a small test page, so builders must re-measure load time with the full world (the plan says so).
- **The "on its own" clause:** TASK.md's "as well as for the game on its own" is ambiguous, so I planned for both readings: co-op through the hub, plus a same-computer link when there is no hub. I raised this in the exit interview.

I deleted my scratch work and left no processes running.

Files are in `work/`:
- `PLAN.md`
- `planner-exit-interview.json`