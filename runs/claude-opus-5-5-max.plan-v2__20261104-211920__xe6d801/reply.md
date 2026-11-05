`PLAN.md` is written and covers everything in `TASK.md`, and `planner-exit-interview.json` is saved and parses as valid JSON. The plan names no game title and none of `TASK.md`'s file or folder names, and its paths are relative to the dev folder. Nothing is committed.

## The game it specifies
- **Genre:** an arcade surgery game with a visual-novel story, seen from a surgeon's-eye 3D view of the operating field.
- **Hook:** the heartbeat is the clock. It drives the music, the tissue, the enemies and the rumble, and each parasite strain is a piece of musical notation that has come to life.
- **Content:** nine original tools, seven strains, seven operations plus a short epilogue operation, and a four-chapter soap opera with a new cast. A list of the source's names keeps builders away from them.
- **Multiplayer:** one to four surgeons share a patient, using the hub's `shared-world` mode. Outside the hub it's couch co-op.
- **Source's flaws:** the plan deliberately fixes four things reviewers criticized, including unreliable special-move activation and difficulty spikes.

## What I tested on this computer
I prototyped the exact stack and ran the plan's own code where I could:
- **Multiplayer:** a skeleton game passed the real hub harness at 2, 3 and 4 players, plus the host-leaving and server scenarios and the on-its-own check. The 4-player run also passed on an earlier skeleton without WebGPU.
- **Toolchain:** the install commands, build script, ink filter and test snippets were extracted from the plan and run from an empty folder.
- **Traps now in the plan:**
    - An esbuild alias that breaks Three.js imports.
    - A Python server whose port output never arrives when piped.
    - Character portraits that render upside down, which ran without errors and only showed up in a colored-marker test.

## Worth your attention
- **The WebGPU flags in `TASK.md` are wrong for this computer.** They lose the graphics device right after the first frame, which is why screenshots come out blank. Adding `--use-vulkan=swiftshader` and `--use-angle=swiftshader`, as the hub's own script does, fixes it. The plan tells builders this, but the brief itself should be corrected.
- **Tool feel is untested.** With no real controller or human player here, tracing a cut with a stick and the aim assist use reasoned numbers. Builders get live sliders and a bot-based balance check to tune them, but someone should play it.
- **I made some judgment calls where the brief was ambiguous:** what "on its own" means for multiplayer, how far the source's world and characters can carry over, and which screens trigger attract mode. The exit interview lists them.
- **Length:** the plan is about 16,000 words, sized without knowing which models or budgets the builders will have. It includes a build order and a cut order in case they run short.

Sources: [Trauma Center: Second Opinion (Wikipedia)](https://en.wikipedia.org/wiki/Trauma_Center:_Second_Opinion), [Trauma Center: Under the Knife (Wikipedia)](https://en.wikipedia.org/wiki/Trauma_Center:_Under_the_Knife), [VideoGamer review](https://www.videogamer.com/?p=168345), [AI Hub Session Protocol](https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/README.md)