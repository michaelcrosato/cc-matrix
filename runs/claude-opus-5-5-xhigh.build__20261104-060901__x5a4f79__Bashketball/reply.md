I did the title pick in this session: I brainstormed 50 riffs on "basketball" and drew one with Python's `secrets.randbelow(50)`. It returned 3, **Bashketball**, so the game is now BASHKETBALL instead of the plan's BASKETBLAM. TASK.md wins where it and the plan disagree. The full test suite passes on the renamed build: 2,362 passed, 0 failed.

**Rename**
- The game file is now `Bashketball-Basketball-claude-opus-5-5-xhigh-20261104-060901.html` and the dev folder has the same name.
- I deleted my old `Basketblam-…html` bundle.
- The title is updated in the logo, page title, loading screen, credits, About, the few announcer and tutorial lines that said it, exit-interview.json, the tests and the engine change markers.
- The logo is now "BASH" bursting out of the comic star, followed by "KETBALL".
- The Blam Tour, Blam Camp, Blam Dome, Hall of Blam and the "All BLAM" tagline stay as the league's brand.
- The draw is recorded in `tools/title-pick.py` (the list) and `TITLE-PICK.txt` (the result).

**Checks after the rename**
- The title screen, menu and AI Hub card show the new logo cleanly in Chromium, with no page errors.
- The shipped HTML has no TODO, FIXME, placeholder or stub text.
- exit-interview.json parses and matches TASK.md's shape. The only empty value is `series`, which the template allows to be empty.
- `AUDIT.md` in the dev folder maps each TASK.md requirement to its code and how it was checked.

**Fixed since last time**
- Online, other players' seats were controlled by the CPU instead of their owners. I found this by driving the AI Hub harness by hand. It's fixed, and a test now checks that a client's keys move its player on the host.
- Also checked by hand in the browser: dev mode, attract mode, Camera › High and Xbox button symbols all worked.

**Audio:** I can't listen to audio, so I measured the output instead. A recording is saved at `check-output/audio-sample.webm` so a person can listen.

Nothing was committed, and no servers or other processes I started are still running.

## Source Information
- **Date:** 2026-11-04 06:09:01
- **Source:** Basketball, in the over-the-top arcade style. It's an original game with its own teams, courts and story.
- **Plan:** PLAN.md
- **Title:** BASHKETBALL, picked in this session as described above. The plan's earlier pick, BASKETBLAM, is kept as the league's brand.
- **Genre:** Arcade sports:
  - 2-on-2 basketball with a short story ladder (the Blam Tour);
  - Exhibition for 1–4 players;
  - Blam Camp tutorial (10 lessons).
- **Perspective:** A side-on TV-style camera (orthographic, angled 30° down) with a slow-motion dunk cam. An optional High camera uses the engine's three-quarter view.
- **Tech:**
  - my-3D2dge v0.85.2 (full engine, modified) and AI Hub session client 1.4.0.
  - Plain JavaScript, Canvas 2D and Web Audio.
  - Built and tested with Node 24, Playwright 1.63 (Chromium) and Python http.server.
- **Art direction:** The engine's own pixel style, pushed to a 90s arcade TV broadcast:
  - five court floors painted in code;
  - three-tier crowds that react;
  - angled glass backboards and spring nets;
  - neon lighting, 14 new prop shapes, and comic-book banners.
- **Animation:** The engine's procedural Humanoid rigs, plus a basketball pose layer (two-bone IK hands) for:
  - a dribble synced to the ball, and shooting form;
  - 12 dunks and hanging on the rim;
  - steals, shoves, blocks and spins;
  - 22 celebrations and taunts.
- **Audio:** All made in code:
  - 12 songs with dynamic layers and 8 stings;
  - 58 sound effects;
  - a crowd ambience bed;
  - gibberish voices for 23 speakers, with captions.
- **Online:** AI Hub Session Protocol v1, shared-world sessions for 1–4 players:
  - the host is authoritative, sending snapshots and receiving inputs;
  - players who leave turn CPU;
  - it supports a server copy and finishes when time is up;
  - 1–4 players can also share one machine.
- **Testing:**
  - One command, `node tests/run.mjs`: 17 suites, 2,362 checks. They run headless in Node and also cover the bundle, Chromium and the AI Hub harness's four scenarios.
  - Browser scripts on the shipped page with real input.
  - The harness driven by hand.
  - No subagents.
- **Research:** None beyond the engine's handoff docs and the AI Hub protocol README.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown.
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh.
- **Usage:** Cost and token counts are unknown (not visible inside the session). Session time was about 2 h 50 min.

## Testing Feedback
- **How many issues did testing catch?** About 35:
  - 17 from the headless suites;
  - 4 from the CPU soak runs;
  - 2 from the browser console;
  - 11 from reviewing screenshots;
  - 1 from driving the AI Hub harness by hand.
- **How many were critical?** 8:
  - Online, other players' seats were played by the CPU.
  - A human inbounder could hang the game forever.
  - The event bus overwrote each event's own `id` field.
  - The settings crashed at startup.
  - Blam Camp could not chain lessons.
  - A lesson step completed twice and crashed.
  - Two lessons could never be finished.
  - Dev Mode never opened from its direct link.
- **Most helpful test:** The scripted playthrough of the whole Tour, with a bot playing the human seat through the real inputs. It found the inbound hang.
- **Least helpful test:** The determinism proof. It passed the first time and never failed. The AI soak runs taught far more.

## Engine Feedback
- **Liked most:** Headless play with exact fixed steps. Whole matches, the whole Tour and every lesson ran at about fifty times real speed, so balance could be measured instead of guessed.
- **Stuck or guessed wrong?**
  - `game.after` timers are cleared on a scene change. This broke Dev Mode and caused the hub bug.
  - Hand IK only lined up once I read the joint frame from `solvePose`.
  - The pixel font lacks `·`, `◂` and `✓`.
  - The HTML Shell is tiny on a TV.
  - A 30° side view at 240 px tall forced an arena redesign.
- **Most important thing I built:**
  - a shot model that decides the outcome first, then flies the ball over real rim, backboard, net and floor physics;
  - a pose layer that dribbles the actual ball, shoots, dunks twelve ways and hangs on the rim.
- **Hardest part:** Getting the Humanoid to hold, dribble and slam a ball convincingly in every body build. Also, drawing the hoop in the right depth order in a side view.
- **What I changed in the engine:** Each change is marked with a `BASHKETBALL:` comment.
  - Shorts and socks on the Humanoid.
  - Afro, flattop and mohawk hair.
  - Dialog voice can be a per-letter function.
  - Public sfx and music buses.
  - A build label for this copy.
  - No engine bugs needed fixing.
- **One thing I'd change:** A ten-foot mode for the HTML Shell that scales with the screen.

## Prompt Feedback
- **Liked most:** A definition of done that can be checked line by line, and a plan with a starting number for everything.
- **Confusing:**
  - The plan carries another run's names.
  - The plan had already picked a title and said not to re-pick, while TASK.md asks for a random pick. I re-picked in the session and renamed the game late.
  - Usage asks for cost and tokens that can't be seen from inside the session.
- **Hardest:** The breadth in one session, all tested:
  - five courts, eighteen players, twelve dunks;
  - a story, ten lessons, attract mode, dev mode and online play;
  - balancing the CPU so scores land at 30–60 a team.
- **What I'd change:**
  - Separate the plan's must-haves from its nice-to-haves.
  - Say whether a plan's title should be kept or re-picked.
  - Require HTML menus to scale for a TV.
  - Have the harness fill in Usage.