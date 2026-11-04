I've written `PLAN.md` in the work folder (about 1,400 lines) for the game **Cricket Kerfuffle**. A secure random number picked that title from 50 brainstormed riffs on "cricket".

**The game:** over-the-top arcade cricket. It's played through a TV-style broadcast camera behind the bowler, with cuts to a wide camera that follows the ball and a side-on camera for third-umpire replays. The tone is gentle village cricket (tea, a cow at deep midwicket, the vicar umpiring) told in the voice of the commentary box. Then it's turned up to arcade bombast: flaming bats, a steam-powered bowling machine, sixes through the pub window.

**What the plan covers:**
- **Architecture:** built on the engine's handoff copy, with a pure, deterministic match simulation kept apart from the drawing and sound. All content is data, and every gameplay number lives in one tuning registry. A build script makes the single HTML file with the AI Hub session client first in the page. Seven engine changes are listed, including a cricket bat and pads for the character rigs, a volume control for voices, and PlayStation button symbols by default.
- **Systems:** each comes with numbers and its own tests.
  - Ball physics, plus a predictor the AI, fielders and replays all share.
  - Batting (timing windows, shot choice by direction and ball length, edges) and bowling (aiming marker, release meter, swing after release).
  - Running between wickets, fielding with timed catches and throws, and umpiring: LBW, run-outs, reviews with ball tracking.
  - The match rules, including Super Overs and a rain rule.
  - CPU players, specials, an ON FIRE mode, items, smashable stadium targets and chaos events.
  - Cameras and replays, commentary, all audio in code (including the gibberish voices), and the controller-first TV-distance interface.
  - The touch-only screen, attract mode, dev mode, saves, and the About/Credits screen.
- **Content:** 5 grounds, 6 teams with hand-made star players, 19 delivery types, 20 shots, 19 specials, items and chaos events, and a 5-chapter story with sample script, commentary lines and match-report templates. Local play for 1–4 players, plus an AI Hub mode where everyone faces the same seeded 6-ball Super Over.
- **Build order:** 8 milestones, each with exit tests. The batting feel is built and tested first, and the AI Hub integration is checked early.
- **Risks:** 12, each with a mitigation and a complete fallback. The biggest: reading a fast ball in a flat camera view, two-handed bat animation, and the floor re-drawing every time the camera zooms.
- **Testing:** one command that prints only failures and a count, covering unit and scenario tests, CPU-vs-CPU matches, a scripted playthrough of the whole story, attract-mode coverage, dev mode, a simulated AI Hub, the real hub test page, and a list of screenshots to review by eye.

I didn't build anything or write `exit-interview.json`, since this stage asks only for the plan. The plan tells the builder to write both.

`/tmp` on this machine is full (it's a 9.8 GB in-memory drive at 100%), so I worked in `~/.cache` instead. Those research files have been deleted, and none of my processes are still running.