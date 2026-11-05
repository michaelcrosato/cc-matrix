`PLAN.md` and `planner-exit-interview.json` are both written and sit in this folder. `PLAN.md` ends with a table mapping every line of `TASK.md` to its plan section and how it gets proved. Nothing is committed, and I deleted my 5+ GB of temporary clones and test projects.

**The game:** it's an original over-the-shoulder action-horror game. Desmond Quill, a 51-year-old insurance adjuster, goes to a foggy North Atlantic island where all 412 residents drowned on paper and keep trying to gut him.
- **Carried over from the source, as mechanics only:** planted-feet aiming, body-part hits that open a crowd-scattering kick, a briefcase grid inventory and merchant economy, an escort partner, and hammy villains.
- **Original:** the cast, story, levels and music. The signature set piece is a siege on a beached trawler that ends when a foghorn sends the crowd walking into the sea.
- **Multiplayer:** a 1–4 player co-op round for AI Hub.
- **Title:** left to each builder, as you asked; the plan names no title and none of `TASK.md`'s file or folder names.

**Traps found by testing on this machine (engine commit `e7a1243`); the plan gives builders the workaround for each:**
- The hub's `?aihub=1` URL stops the engine from starting unless that parameter is removed first.
- `await import()` runs too early in the one-file build, so code that works in dev breaks in the bundle.
- The hub's test harness allows only 20 s for every copy to report ready; my test scene took 12.5–17 s at 4 players, and only with reduced graphics.
- `x shot` crashes with the full Chromium under the run's long temp path, but works with the headless shell.
- A running page can't switch scenes, so the campaign is one connected island; a 320 m test site with 41 buildings loaded fine.
- Some engine behaviour needs working around: the last-used-device reading goes wrong when the game feeds in its own input, and changing a character's body mid-game doesn't show.

**Not run, so builders are testing these for the first time:**
- **Game content:** no game exists yet, so nothing in the plan has been played, and all balance numbers are starting guesses.
- **Co-op:** only the plumbing passed all four harness scenarios, using simple test messages, not real shared gameplay or the game's own pre-round card screen.
- **Other parts:** the gibberish voices, the laser drawing and aim assist are designs only. The Esc and pointer-lock trap comes from reading engine comments, and the plan marks it that way.

**Decisions you may want to check:**
- **"The game on its own":** I read this as solo play, because the hub protocol has no network outside a session. The plan adds optional AI teammates. If you meant a second network path, the plan needs changing.
- **Who decides:** the plan settles genre, perspective and stack for every builder, even though `TASK.md` says "pick". The title is the only exception.
- **Scope:** I don't know which models or budgets the builders will have, so the plan uses a build order that's shippable at each milestone plus a fixed order for cutting content. It's also long, at about 81 KB.