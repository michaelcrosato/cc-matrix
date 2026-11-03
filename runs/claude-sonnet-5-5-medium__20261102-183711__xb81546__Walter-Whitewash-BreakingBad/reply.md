The bot playthrough now passes on all 16 seeds on the final build, so the missing re-run is done. It passes 11 of 11 checks each time, and `exit-interview.json` still parses.

The browser suite, the AI Hub harness, the WebKit load and the other headless suites were all green on this same build in the last round. The sold-bricks check stays at 3 instead of 6. Real iOS Safari and a real DualSense could not be tested.

## Source Information
- **Date:** 2026-11-02 19:40
- **Source:** Breaking Bad (2008-2013)
- **Genre and Perspective:** Crime action-adventure with a cooking minigame, selling, money laundering, light stealth against cops, melee and pistol combat, and a boss fight. Three-quarter top-down camera, switchable to top-down and isometric.
- **Tech:** my-3D2dge v0.85.1 (the full engine from the handoff package, unedited), plain JavaScript in one HTML file, AI Hub session client 1.3.0 (ghost mode), Node and Python Playwright for tests.
- **Art Direction:** The engine's own PS1/SNES hybrid look. HD pixel-rigged Humanoid characters, textured tile maps, canvas lighting with a day and night cycle, HTML HUD in a dark green theme.
- **Animation:** The engine's Humanoid skeleton rigs, E.Combo and E.MOVES for melee, poses, hit-stop and shake, particles and tweens.
- **Audio:** All written in code. Original songs (title, explore, cook, chase, boss, victory, report), synthesised sound effects, and gibberish "animalese" voices with a pitch and timbre per speaker. No audio files.
- **Online:** AI Hub session protocol v1, ghost mode, 1–4 players. Each copy sends its Walt's position and shows the others. Score is cash earned. Also plays alone. No other network use.
- **Testing:** Headless Node tests of the rules (46 checks), every game system (77), a bot playthrough with real inputs (11 checks, passing on all 16 seeds) and the attract mode (16). Chromium browser checks (attract mode, gamepad glyphs, inverted sticks, touch-only mode, About screen, hub tags), a WebKit load, a 13-viewport screenshot matrix, and the AI Hub harness at 1, 2 and 4 players with latency, jitter and loss plus a host-leave scenario. Real iOS Safari and a real DualSense were not available.
- **Research:** Light. The show's premise, tone and character types from memory (names are parodies). I read the engine's API card and the AI Hub protocol and harness. No web research on the show.
- **Environment:** Claude Code CLI (headless); Linux; browser unknown
- **Model:** Anthropic, claude-sonnet-5-5, reasoning effort medium
- **Usage:** unknown. I can't see token counts or cost. The session ran about two hours.

## Testing Feedback
- **How many issues did testing catch?** About 15. The main ones:
  - A wrong camera call (`game.cam.snap` is a boolean, not a method).
  - Uneven lab map rows.
  - The attract mode froze on its first dialogue, on the car wash menu, on a delivery step that kept issuing new contracts, and on the day-end report.
  - Props jammed the store walkway, sealed the corridor to the RV and clogged the car wash bays, so the pathfinder got stuck.
  - The player started with no money (a soft lock).
  - The $18,000 goal was impossible under the original launder cap.
  - The day clock kept running inside the boss room.
  - A harsh boss retry (spent pills and ammo carried over), a run-on shop line, a leftover `setTimeout` call, and boss tuning that took several rounds.
- **How many were critical or game breaking?** 5:
  - The no-money soft lock.
  - Props blocking the way to the cook station.
  - The unreachable goal.
  - The clock able to end the run mid-boss-fight.
  - The attract mode stalling.
- **Most helpful test:** The scripted playthrough bot. It uses only real inputs and the engine's own flow field, from the title to the ending. It found the stuck-on-props bugs, the soft lock, the clock bug and the balance problems.
- **Least helpful test:** The rules unit tests. All 46 passed the first time and found nothing, though they are a useful regression guard.

## Engine Feedback
- **Liked most:** Everything that comes free: Humanoid rigs with live portraits, E.Combo and E.MOVES, E.Shell for the HUD and settings, `input.label()` with PlayStation and Xbox glyphs, saves and boot steps. Above all, the exact-step headless mode (`game.advance`), which let a bot play the whole game in about three seconds.
- **Got stuck or guessed wrong:** Yes. I treated `game.cam.snap` as a method. I assumed FlowField knows about `map.solid` props and it does not, so bodies stop at props while paths run straight through them. I also had to find out that Dialog pages are arrays of lines.
- **Most important thing built myself:** The game layer. That means the economy and rules, the cooking minigame, an interaction system with mouse hover, the AI for customers, cops, rivals and the boss, the attract-mode bot, pad axis inversion, and the AI Hub ghost session.
- **Hardest part:** Keeping what the pathfinder sees and what bodies collide with in agreement. Making a 3/4 view read well under lighting with a busy HUD was also hard.
- **Overhaul or remove one thing:** Make FlowField read `map.solid` props, so there is one idea of what is walkable. I worked around it by blocking the map cells under solid props.
- **Change one thing:** Add a first-class interactables system (nearest station, prompt, mouse hover) and per-axis stick inversion in Input. I had to build both.

## Prompt Feedback
- **Liked most:** The concrete, testable checklists: attract mode after 10 seconds, the 10-foot controller-first rules, the inverted-axis toggles, touch-only behaviour and the Done list. Picking the title with a random number generator was a nice touch.
- **Confusing:** The scope. A feature-complete, polished vertical slice, plus multiplayer, attract mode and a full test pass, is a lot. It was also unclear whether a hub round should replace the title and story, so I kept both. The feedback questions contain typos such as "woudl".
- **Hardest thing to do:** Balancing an economy and a boss fight without a human playtest. The bugs were in how the systems fit together, not in the systems themselves.
- **One test I would have run:** A person playing on a TV with a real DualSense from 10 feet. A bot can show the game is finishable but not that text sizes, prompts, stick feel and dodge timing feel right.