PLAN.md is written; the title, picked by RNG from 50 riffs, is **Tide Crisis 3**. Nothing is built yet.

**The game.** An original first-person light-gun shooter on rails, drawn in the engine's pixel style. Two agents retake an island city's tidal barrier from a rogue admiral before the dawn high tide floods it. The source's distinctive mechanics are kept, with original names and numbers:
- hold-to-hide cover, and you reload only in cover;
- four switchable weapons, with special ammo from orange-vested supply soldiers;
- a warning ring on every enemy shot that can actually hit you;
- a time limit on every area.

**Content.** Three stages (a festival harbor at night, a stormy lighthouse village, the barrier at dawn) and a training range. That makes 12 fight areas, 3 bosses and 3 mini-bosses, with every story beat written in a hammy action-movie style. The demo runs about 20 minutes.

**Architecture.** The handoff doesn't include the engine's 3D add-on, so the plan adds a custom 3D renderer on top of the 2D engine. It draws the engine's own materials, asset-library shapes, and characters, which appear as flat cut-outs sized by distance. Game logic is kept separate from drawing and is deterministic, so the same code runs the headless tests, the attract-mode bot and online co-op. The plan also names four small engine patches, including new weapon types for characters and PlayStation button icons by default.

**Multiplayer.**
- **On one machine:** split-screen co-op, each player with their own view and cover.
- **Online (AI Hub):** 1–4 players. The host's copy runs the world, other players send their actions, and the game shows its own briefing card before each round.

**Also specified:** a dev panel with live sliders and a reset, the attract mode, controller-first menus readable from 10 feet, the touch-only notice, and the About screen and exit-interview content.

**Build order.** The renderer comes first because it's the biggest risk. Then the core loop, the enemy roster and an early networking prototype, then one stage at a time, then menus, dev mode, co-op and the hub. If time runs short, the plan says which whole areas to cut; no mechanic gets cut.

**Testing.** One command prints only failures and a count. It covers about 25 test suites, bot playthroughs of every stage and the whole game, browser checks at four screen sizes, and the four AI Hub harness scenarios.

**For the next stage:** `/tmp` on this machine is full, which made my first `git clone` fail. The plan tells builders to point `TMPDIR` at their own folder before running Chromium or Playwright. I deleted my research clones.

Sources:
- [Time Crisis 3 – Wikipedia](https://en.wikipedia.org/wiki/Time_Crisis_3)