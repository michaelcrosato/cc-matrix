I wrote **PLAN.md** (about 1,250 lines). It covers the title, architecture and modules, every system TASK.md asks for, the content, the build order with milestones, the risks and how to test each part. Nothing has been built yet.

**Title:** **Karate Champon**, picked as TASK.md asks: a silent brainstorm of 50 riffs, then Python's `secrets.randbelow(50)`. Champon is Nagasaki's mixed noodle dish and Japanese slang for "a mix of everything". The game file is `KarateChampon-KarateChamp1984-claude-opus-5-5-max-20261103-174743.html`.

**The game:**
- **Genre and view:** a 1-on-1 point-sparring karate fighter in a 2D side view, with an optional 2.5D camera.
- **Rules, from the source:** no health bars. A referee stops the fight after every clean hit and calls a half or full point. First to 2 points wins the round, best of 3 wins the match, on a 30-second clock with a judges' decision at time-out.
- **Twin-stick controls:** the left stick sets posture, the right stick (or the face buttons, or IJKL) the technique. Together they give the source's 15 scoring techniques, plus block, jump, crouch, two somersaults and a roll. Clean, full-reach strikes earn full points, and a counter scores double.
- **Story ladder:** a white-belt hero climbs to Champ across 9 matches on 8 stages, with 10 fighters including the referee. Between matches there are 3 bonus stages (board breaking, flying pots, a charging bull) and 3 lessons where a senior student demonstrates techniques for you to copy. Mei, the noodle-shop daughter, is the twist final opponent.
- **Other modes:** local versus, "winner stays on" for 3–4 local players, and AI Hub online sessions in shared-world mode for 2–4 players. The plan defines the message protocol and how lag and players leaving are handled.
- **Required extras:** the 10-second attract mode, a dev mode from the pause menu with live sliders and reset, the "Controller or keyboard required" screen on touch-only devices, PlayStation glyphs by default with an Xbox option, gibberish referee and character voices, and the About screen plus `exit-interview.json`.

**Engine findings that shape the plan:**
- The engine's built-in fight module is built around life bars (Street Fighter rules). The plan reuses only its physics and stage pieces and writes its own karate rules.
- Seven small engine changes are listed. The main ones: make the right stick bindable, add the PlayStation symbols (the pixel font has none), and stop the pause menu from freezing an online session.

**Build order:** 13 milestones, M0 to M12. The riskiest work comes first: a Technique Lab for the karate animations and hit ranges, then the bout loop.

**Testing:** one command, `node tests/run.mjs`, prints only failures and a one-line count. It includes a scripted playthrough of the whole story, a simulated online hub with lag and dropped messages, and the real AI Hub test harness.

Research came from Wikipedia, a TASVideos record with the source's technique point values and timings, Shacknews and arcade-history. StrategyWiki, Giant Bomb and TV Tropes blocked automated fetches, so a few details are marked unknown.

I deleted my 5.5 GB research scratch folder; `/tmp` here is nearly full. The work folder holds only `PLAN.md` besides the task files.