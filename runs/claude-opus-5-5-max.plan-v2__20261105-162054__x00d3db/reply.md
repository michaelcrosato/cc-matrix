`PLAN.md` is written and covers everything in `TASK.md`, with a table at the end mapping each requirement to a section. `planner-exit-interview.json` is saved and parses as JSON. As `STAGE.md` asked, the plan leaves the title to each builder and uses no `TASK.md` file or folder names. Nothing is committed.

**The game:** a cozy village life sim in an isometric pixel-art view. You arrive by bus owing a goose 8,000 beans, in a town of odd neighbours, with a neon Big City one bus ride away. A year is 16 in-game days, with four festivals, and it runs on either a fast village clock or your real clock. All names, characters and music are original; the mechanics are the only thing borrowed from the source.

**Hub and solo multiplayer:** a 5-minute shared-world round in AI Hub, plus a Visit mode outside it using invite codes or a second window on the same computer.

**What I tested:** I built throwaway prototypes on the real engine (kit 0.46.0), then deleted them, so the plan's recipes come from actual runs. These findings would have tripped builders up:
- **Browser flags:** the WebGPU flags in `TASK.md` don't work with this engine here; the picture stays blank until `--use-angle=swiftshader` is added. You may want to fix this in the brief, since every builder gets it; the plan warns them either way.
- **Single file:** the engine can sit byte-for-byte inside one HTML file on `file://`, and that build passed the two Hub harness runs I repeated on it (4 players on a lossy network, dedicated server).
- **Hub rounds:** all four Hub scenarios, including host-leave, passed on a bundled build of the same minimal round.
- **Pause menus:** `engine.paused` stops the game's `update`, so a menu drawn there would freeze.
- **Music at 10%:** the engine defaults to 60%, and tracks at the volumes in its own examples would be close to inaudible at 10%.
- **Ground textures:** the library's grass and path textures are too noisy, and characters got lost against them. Quieter replacements, rendered across seasons, read much better.

**What is still untested:**
- **Balance:** prices, income and pacing are my estimates, not playtested. They're all in one tuning table with dev-mode sliders.
- **Hub test scope:** the harness only ran a minimal round, not the full design.
- **Visit mode:** invite codes were tested without a STUN server, between pages on this machine only, so play over the internet is untested.
- **Mirror and TV feed:** these only got a no-errors check plus one screenshot.

Files are in the current folder:
- `PLAN.md`
- `planner-exit-interview.json`