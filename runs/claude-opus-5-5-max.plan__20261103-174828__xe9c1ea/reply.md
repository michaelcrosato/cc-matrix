`PLAN.md` is written to this folder and nothing has been built yet, as `STAGE.md` asks.

**Title: THUGBY TURBO.** I brainstormed 50 riffs on "rugby" and Python's `secrets.randbelow(50)` picked #17. Files are named `ThugbyTurbo-Rugby-claude-opus-5-5-max-20261103-174828.html`, with a dev subfolder of the same name.

**The game:** an over-the-top arcade game of rugby sevens (seven a side), filmed like a TV broadcast from the stand. The rugby parts are all in: passing only backwards on L1/R1, tackles that lead to rucks, tries and conversions, scrums, lineouts, penalties, drop goals, advantage and the sin bin. On top of that it adds:
- a turbo button and charged hits that send players flying;
- a team hype meter that unlocks super moves, and "on fire" after two tries in a row;
- power-ups the crowd throws onto the pitch, and a hazard at each stadium (mud, a chicken mascot, flame jets, lightning);
- a referee who only calls fouls he can see, and can be knocked over;
- a boss who takes two tacklers to bring down.

There's a story cup with a pub team (training plus four matches), exhibition matches, nine training drills, records, and About/Credits.

**Architecture:** the match simulation only reads player inputs and only writes a plain match state. That one rule lets the same code drive live play, instant replays, the attract demo, the online clients and the headless tests.

**What else the plan covers:**
- **Engine:** built on the my-3D2dge handoff package v0.85.2, with four small engine patches. One matters most: the engine's pixel font has no ✕ ○ □ △, so PlayStation button prompts would show as "?".
- **Controls:** controller first, with PlayStation symbols by default and Xbox in Settings. Keyboard and mouse are native: click a teammate to pass to him, aim kicks with the cursor. Touch-only devices get the "Controller or keyboard required" screen.
- **Attract mode:** a scripted CPU match that cheats to show every feature, after 10 seconds idle.
- **Dev mode:** from the pause menu, with 36 live balance sliders and reset to defaults, plus cheats, forced events and debug overlays.
- **Multiplayer:** up to 4 local players, and AI Hub shared-world sessions for 2–4 with the message formats and size budgets. If shared-world can't pass the hub's test harness by milestone 8, the plan switches to the simpler parallel mode.
- **Content:** five teams of seven named players, four stadiums, story scenes and commentary written in the source's voice, drills, music, sound effects and gibberish voices.
- **Build order:** ten milestones, riskiest first, each with exit criteria.
- **Risks:** a table of the main ones and how to reduce each.
- **Testing:** one test command that prints only failures and a count, 20 test suites, a scripted playthrough of the whole cup, and runs of the AI Hub harness.

I didn't write `exit-interview.json` or the About-screen text. Both describe the finished build, so the plan leaves them to the build stage (section 20). I also deleted the two repo copies I downloaded to research the engine and hub (about 5.4 GB).