I've written `PLAN.md` in this folder (about 1,600 lines). Nothing has been built yet, as STAGE.md asked. To write it I read the my-3D2dge engine handoff (v0.85.2, including its sports kit) and the AI Hub protocol, client and test harness.

**Title: BASKETBLAM.** I brainstormed 50 riffs on "basketball" and Python's `secrets.randbelow(50)` picked index 18. The deliverable is `Basketblam-Basketball-claude-opus-5-5-max-20261103-174822.html`. I chose `Basketball` as the SOURCE part of the file name.

**The game:**
- **Genre and camera:** original over-the-top 2-on-2 arcade basketball, seen from a side-on "broadcast" camera with a dunk cam that zooms in.
- **Rules:** no fouls, so shoving is legal. There's turbo, spin moves, steals, blocks, goaltending, alley-oops and putbacks. Shots are timed on release, and there are 12 dunks. A player who scores three straight goes **SUPERNOVA** (the game's "on fire" mode), and backboards can shatter, which cuts to a fake sponsor break.
- **Content:** 5 courts, each with its own twist: a jackpot scoring spot, wind, oil slicks, a volcano with lava bombs and steam-vent launches, and a robot boss arena. There are 6 teams and 18 players.
- **Story:** a 4-game "Blam Tour". A smug sponsor's robot team, the BLAMBOTS, is the final boss. Two hype announcers yell in gibberish voices with captions, and the plan includes the full story script and sample commentary lines.

**What the plan covers:**
- **Architecture:** the module list and the engine changes needed: basketball shorts, new hair styles, a hook so dialog boxes can speak in gibberish, and public audio channels. Every player reads its moves from one interchangeable source (local controller, CPU, network or attract script), so local play, AI teammates, the attract mode and online play share the same code.
- **Animation:** done in code on the engine's own character skeletons, with the dribble synced to the ball.
- **Systems:** CPU AI with four difficulty levels and catch-up help for the trailing team, plus every system and number TASK.md asks for.
- **Menus and controls:** TV-readable menus that work with controller, keyboard or mouse. Prompts show PlayStation buttons by default, with an Xbox option. Touch-only devices get the "Controller or keyboard required" notice and the attract mode keeps running.
- **Audio:** all music, effects and voices made in code.
- **Attract mode:** a 5-segment showcase that starts after 10 seconds idle.
- **Dev mode:** reached from the pause menu, with about 50 live sliders and reset to defaults.
- **Online:** an AI Hub shared-world match for up to four players, with its own card, a non-pausing menu, and handling for players leaving, a dedicated host and time-up.
- **Build order:** 12 milestones (M0–M11).
- **Risks:** a table of the main risks and how to reduce each. The biggest are shot and rim physics, and backboards that the side camera would see edge-on, so the plan draws them turned toward the camera.
- **Tests:** one command, `node tests/run.mjs`, prints only failures and a one-line count. It includes a scripted playthrough of the whole Tour and all four AI Hub harness scenarios, plus a list of screenshots to review by eye.

I checked the engine and hub details I relied on in their source and docs, but two are flagged for the builder to confirm: whether pause-menu items can change depending on context, and how the dialog voice hook works.

/tmp on this machine is 99% full, and the plan tells builders to work around that. The temporary copies of the engine and hub repos I downloaded for research have been deleted.