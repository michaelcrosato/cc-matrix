The game has been renamed **Operation Big Bad Wolf**. The renamed build passes the full test command (644 passed, 0 failed), and the single file is in the root: `OperationBigBadWolf-OperationWolf-claude-opus-5-5-medium-20261103-184337.html`.

**How the title was picked:** I wrote 50 riffs on "Operation Wolf" into `tools/titles.txt` and ran `python3 -c "import secrets; print(secrets.randbelow(50) + 1)"`. It returned 10, which is "Operation Big Bad Wolf".

**What changed with the rename:**
- The dev folder and the .html file now use the new name.
- The title screen logo, the page title and the hub tags show the new name.
- The About pages, the radio line at the start of Op 1, the engine change log, the tests and the exit interview now use the new name too.
- The squad is still called "the Wolfpack" inside the story.
- I removed the old .html file.

**Tests:** the full run covered the headless suites, the whole-game playthrough, the browser checks and all five AI Hub harness setups. After that I changed only the session-time text, so I reran just the lint check (372 passed) and the bundle check (51 passed).

`exit-interview.json` parses and has every field answered. Nothing is left scheduled, and no servers I started are still running.

## Source Information
- **Date:** 2026-11-03 18:43:37
- **Source:** Operation Wolf (Taito, 1987 arcade)
- **Plan:** PLAN.md (I picked the title myself in this session, as described above)
- **Genre and Perspective:** Light-gun rail shooter; first person on a scripted rail camera (Mode 7 depth view) with a free crosshair
- **Tech:** my-3D2dge v0.85.2 full engine (Mode 7, Arcade, Shell; 5 small engine edits), AI Hub session client 1.4.0, plain JavaScript in one HTML file; Node 24 and Playwright 1.63.0 for tests and the bundle
- **Art Direction:** The engine's native PS1/SNES pixel style: shaded HD Humanoid characters, vehicles and props written as engine shape data, painted Mode 7 floors and skies, pixel-art HUD and screens
- **Animation:** The engine's character rig plus custom poses (hands up, bound hands, panic, the officer's whistle, rocket on the shoulder, parachute). Rotors, wheels, toppling masts and the collapsing tower are animated in code.
- **Audio:** All synthesized in code: about 50 sound effects panned by where they are on screen, 13 original songs whose layers follow the action, Animalese-style gibberish voices, the wolf howl, storm wind gusts
- **Online:** AI Hub Session Protocol v1, shared-world co-op for 1–4; local co-op for 1–4
- **Testing:** Headless scripted tests and bot play behind one command, a whole-game bot playthrough, Playwright checks of the final file, the real AI Hub harness; screenshots for look only
- **Research:** Planner: Wikipedia and arcade-history.com. Builder: none beyond the engine and hub docs.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-opus-5-5, reasoning effort medium
- **Usage:** Cost and tokens unknown; session time about 1 hour 17 minutes (18:43:37 to 20:00)

## Testing Feedback
- **How many issues did testing catch?** About 18.
- **How many were critical?** 6:
  - Knife throwers and mortar crews were silently replaced by projectile types with the same names.
  - Enemies never attacked, because a timer started undefined.
  - An endless reload loop with part-used magazines.
  - The final gunship flew above the screen.
  - A boss part was unhittable behind its own body.
  - Continues replayed the same lost fight forever.
- **Most helpful test:** The bot playthrough of each operation that reported damage taken by source.
- **Least helpful test:** Screenshots of static menus; they found nothing a script hadn't.

## Engine Feedback
- **Liked most:** Mode 7's `project` and `toFloor`: the same math draws the world and decides what a shot hits.
- **Stuck or guessed wrong:** Character heights in world units aren't documented, so I measured them in a browser. `E.store` silently forgot everything where browser storage is blocked.
- **Most important thing I built myself:** The light-gun loop: on-screen hit areas, the rail camera with holds, attack warnings and the bot.
- **Hardest part:** Mode 7 draws on top of everything else, so the engine's lights and particles don't apply. The effects and the night darkness had to be my own.
- **What I changed:**
  - Dialog can call a function per typed letter (for the voices).
  - Shell got a screen of setting rows, plus setting groups hidden from Settings (for the dev mode).
  - PlayStation button symbols are the default.
  - `E.store` keeps data for the visit when storage is blocked.
  - Sound effects take a stereo pan.
- **One change I'd make:** A first-person gallery mode for Mode 7 that keeps lighting, particles and hit picking.

## Prompt Feedback
- **Liked most:** A clear deliverable plus a detailed plan to build from.
- **Confusing:** The plan's file names (max effort, 17:47:46) differ from TASK.md's. Also, STAGE.md says to use the plan's title while TASK.md asks for a random pick; I settled it by picking in this session.
- **Hardest:** The amount of content (six operations, six bosses, cutscenes, co-op and netcode) in one session.
- **What I'd change:** Have the plan carry the exact deliverable names, and say whether the builder or the planner picks the title.