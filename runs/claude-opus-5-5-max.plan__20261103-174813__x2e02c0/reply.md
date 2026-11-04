I've updated `PLAN.md`; it now shows explicitly that it covers everything TASK.md asks for. The game HTML and `exit-interview.json` still don't exist on purpose: STAGE.md says "Don't build it yet: plan it", so both are build-stage outputs that the plan specifies.

**What changed:**
- **Coverage map (new section 0.1):** every TASK.md requirement, including the HTML file, `exit-interview.json` and the 10-second attract mode, now points to the plan section that covers it.
- **Stronger research (section 1.1):** I read three pages directly, which confirmed:
  - the five hunted species and the critter list;
  - the 15 bonus rounds;
  - the rule that shooting a doe ends the scene;
  - the post-scene screen showing where shots landed;
  - simultaneous two-gun play.

  Four sites (Giant Bomb, TV Tropes, MobyGames, the Sinden wiki) refused the fetch, so facts that only appear in their search summaries are marked "reported". Anything not found is "unknown".
- **Source Information (Appendix E):** every field is filled, either confirmed or "unknown", with a note on what the builders must update.
- **Exit interview template:** a copy of `exit-interview.json` in TASK.md's exact shape, prefilled with what's known now. It parses, and has every key and the right number of feedback answers.

**Source Information (planning stage):**

| Field | Value |
|---|---|
| Date | 2026-11-03 17:48:13 |
| Source | Big Buck Hunter Pro (arcade, 2006; designed by Play Mechanix, made by Raw Thrills) |
| Plan | none for this stage; the build will use PLAN.md |
| Genre and perspective | arcade hunting shooter; first person on rails, with a bullet cam |
| Tech | the engine's v0.85.2 handoff package plus three new modules, and AI Hub client 1.4.0 |
| Art direction | the engine's pixel style |
| Animation | the engine's procedural rigs, plus a new four-legged rig |
| Audio | all synthesized in code, with gibberish voices |
| Online | AI Hub ghost mode, 1 to 4 players |
| Testing | none run (nothing is built yet) |
| Research | the pages above, plus the engine and hub docs |
| Environment | Claude Code CLI (headless); Linux; browser unknown |
| Model | Anthropic, claude-opus-5-5, reasoning effort max |
| Usage | unknown |

**Feedback (planning stage):**
- **Testing:** no game tests exist yet. The only scripts run were the title picker and checks of the plan's tables and JSON.
- **Engine:** the docs and headless test design are excellent. The handoff package has no perspective camera, so the plan adds a custom landscape renderer as an engine module.
- **Prompt:** it's unclear which TASK.md items apply to a plan stage, and how to turn the title into file names.

Sources: [Wikipedia](https://en.wikipedia.org/wiki/Big_Buck_Hunter), [Highway Games](https://www.highwaygames.com/arcade-machines/big-buck-hunter-pro-arcade-machine-9210/), [Macworld](https://www.macworld.com/article/1144021/bigbuckhunterreview.html), [Giant Bomb](https://www.giantbomb.com/games/3030-22443/), [MobyGames](https://www.mobygames.com/game/wii/big-buck-hunter-pro), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/BigBuckHunter), [Sinden wiki](https://www.sindenwiki.org/wiki/Big_Buck_Hunter_Pro), [MPA Amusement](https://mpamusement.com/collections/video-games/products/big-buck-hunter-pro-arcade-shooting-game), [Reloaded change log](https://docs.google.com/document/d/1fqWR3bvlkIrAa-nVDMO4MPC2EuG-U5Sm9P8Pve_QNMk/mobilebasic)