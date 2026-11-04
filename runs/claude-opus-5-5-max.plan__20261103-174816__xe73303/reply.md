I've written **PLAN.md** (about 1,470 lines) in the work folder. The game is called **Ice Hoc-Kaboom**: I brainstormed 50 riffs on "ice hockey" and a `secrets` roll picked #35.

**The game:** over-the-top arcade hockey, 3-on-3 plus goalies, on the engine's broadcast-style three-quarter camera with the rink running left to right. An overhead camera is an option, and a low ice-level camera takes over for fights, replays and intros.
- **Core play:** momentum skating with hockey stops, a puck that rides the curved boards, passes that lead the receiver, saucer passes and one-timers, wrist shots and charged slapshots, and goalies whose saves depend on reaction time and positioning, with rebounds.
- **The over-the-top layer:**
  - checks that crack and shatter individual glass panels;
  - fights with jabs, haymakers, ducks and jersey yanks, where the loser goes to the sin bin;
  - a team BOOM meter that triggers KABOOM mode and fireball slapshots;
  - fan-thrown power-ups, octopi, thin ice and a mascot hazard;
  - chirping, and a two-man commentary booth with gibberish voices.
- **Content:** a five-chapter story about a small-town team saving its rink, ending in a boss final. It has 6 teams, 5 arenas, cutscenes with one choice per chapter, 15 stars and unlocks. There's also exhibition for 1–4 local players, 7 practice drills, an ice-resurfacer minigame at intermission, records, and an About/Credits screen with all the required feedback pages.
- **Everything else TASK.md requires** is specified in detail: AI Hub online play for 1–4 seats with its own pre-round card, the attract mode, a dev mode with live sliders and reset, the touch-only screen, controller-first menus, and all audio made in code.

**Engine findings that shaped the plan:**
- The pixel font has no PlayStation symbols (✕ ○ □ △ show as "?"), even though the engine's own glyph table uses them, so the plan adds them to the font.
- The plan also patches the engine for hockey gear on the character rig (sticks, helmets, skates, goalie pads), organ and filter support in the synth, per-speaker dialogue voices, and the hub's Create + Options button rule.

**Build order** runs in 10 milestones, M0 to M9, with the game playable from M3. Each milestone has acceptance criteria, followed by a risk table.

**Testing** is one command, `node tests/run.mjs`, which prints only failures and a one-line count. It covers unit and system tests, a scripted bot playthrough of the whole story and all drills, attract and dev-mode tests, a simulated network test, the real hub harness in four configurations, and screenshots only for visual judgement.

One thing on your machine: `/tmp` is a nearly full in-memory disk (98% used), and my first clone there failed for lack of space. The plan tells the builders to keep temp files inside their dev folder. I deleted only the scratch clone I made in `~/.cache`; nothing else was touched.