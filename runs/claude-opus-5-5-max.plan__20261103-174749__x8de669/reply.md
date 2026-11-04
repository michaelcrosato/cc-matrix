PLAN.md is written in this folder, about 2,200 lines, for builders working from TASK.md and the plan alone.

**Title:** *Ahead or Alive: Xtreme Beach Volleyball*. I brainstormed 50 riffs and drew one with Python's `secrets`, which picked number 27. The game file will be `AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-max-20261103-174749.html`.

**The game:** six original fighter-women get a fake tournament invitation from jackpot billionaire Sonny Fortuna and his deadpan concierge Pepper. The "tournament" turns out to be a five-day island vacation.
- **Matches:** 2-on-2 beach volleyball. One timed button does the bump, set, spike and serve, with a shrinking ring on the sand showing when to press. There are also dives, blocks, shots and "Mine/Yours" calls.
- **Partner:** how well your AI partner plays depends on how close you are.
- **Days:** each has a morning, afternoon and night. You fill them with matches, gifts and friendships, three shops (21 swimsuits, 10 accessories, 25 gifts), a pool-hopping rhythm game, a casino (slots, blackjack, roulette) and a photo mode.
- **Ending:** a final against Sonny & Pepper with special rules, then two comic endings.
- **Tone:** campy, like the source, but kept PG.

**Camera:** matches use a side-on TV view, with a behind-your-team view as an option. The resort areas use a three-quarter view and the island map is isometric.

**What else the plan covers:**
- **Architecture:** 33 game modules and 8 small changes to the engine, including PlayStation button symbols in its pixel font, swimsuit drawing on its characters, and a per-letter hook for the gibberish voices.
- **Volleyball systems:** an exact formula for the ball's flight, the rules, the timing judge, the AI and its difficulty curve.
- **The rest of the TASK.md list:**
  - 1–4 local players;
  - online play through AI Hub, with its own pre-match screen;
  - the attract mode;
  - dev mode with 37 tuning sliders and a reset;
  - the 10-foot controller UI, with PlayStation symbols by default and Xbox in Settings;
  - the touch-only screen;
  - all audio made in code;
  - the About/Credits page.
- **Content:** the cast, every item, a gift-tastes table, schedules, story beats, the tutorial script, and a writing guide with sample lines.
- **Build order:** 11 milestones, volleyball first, each ending playable.
- **Risks:** 13 of them, each with a way to de-risk it.
- **Testing:** one `npm test` command running 19 suites, including a full scripted playthrough and the AI Hub's own test harness; screenshots and animation strips only for the art.

**Research:** I read the engine's docs and sports kit, the AI Hub protocol and its test harness, and the engine's motion-capture catalog, so the plan uses their real calls. I did no web research on the source game itself; it's described from general knowledge.

**For the builder:** `/tmp` on this machine was 98% full during planning, so the plan tells the builder to point npm and Playwright at a temp folder inside the dev folder if they hit "no space" errors. I deleted my own scratch clones afterwards.