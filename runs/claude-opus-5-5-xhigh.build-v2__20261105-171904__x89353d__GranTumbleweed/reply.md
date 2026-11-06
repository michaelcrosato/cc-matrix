**Gran Tumbleweed is built, and everything `TASK.md` asks to hand in is in this folder.** What this computer can do from `PLAN.md` is done, apart from the differences and limits listed below. On the final build, `node tools/test.mjs` printed `tests: 2302 passed, 0 failed`, including the career played start to finish by a bot with no Dev tools.

I also read `TASK.md` and `PLAN.md` in full against the audit in this session. Many audit rows only proved the code existed, so I wrote suites that actually run those behaviours.

## What that pass found
It found 15 more bugs, all fixed, even though the 1,652 checks at the start of this session were all passing. That means more bugs may remain in areas no check covers.
- **Attract mode (serious):** it started 10 s into any screen opened over the title or Map, which threw a reader back to the Map and could cut into a prize ceremony.
- **Replay director:** most camera cuts came less than a second apart; the plan asks for one every 4–8 s.
- **Test card:** Ms. Arai's brief ran off the screen, tips were cut mid-word, and subtitles covered the buttons.
- **Smaller fixes:**
  - Other text overflowed at narrow widths.
  - Holding △ took 1.4 s to recover instead of 1 s.
  - Very short menu key taps were lost.
  - The hub countdown now shows three lamps on screen.

## Hand-in
| Item | Check |
| --- | --- |
| `GranTumbleweed-GranTurismo3ASpec-claude-opus-5-5-xhigh-20261105-171904.html` | built from the final code; runs from `file://` and contains the final answers |
| Dev folder of the same name | one test command, no scratch files left |
| `exit-interview.json` | parses as JSON, in the brief's shape |
| `pixel-engine.js` | same SHA-1 as a fresh download of the kit |
| Leftovers | no `TODO`/`FIXME`/stub markers, no audio files, none of my processes still running |

## Audit of the plan (`docs/plan-audit.md`)
It covers 488 lines of the plan, with 0 failing:
- **Behaviour test:** 253 lines name one.
- **Not requirements:** 55 lines are notes or headers.
- **Code present only:** 53 lines, mostly structure, stated facts or art judged by eye.
- **Data or file checks:** the remaining 127 lines.

This is still my own tool, not an independent review.

## What this computer could not settle
`TASK.md` says these are never required, but they are still unknown:
- **Handling:** no human has driven it, so handling feel and difficulty are untested, and balance was tuned against a bot.
- **Sound:** it was measured but never heard.
- **Hardware:** no real pad, TV, phone or tablet was used; stand-ins and profiles took their place.
- **Other browsers:** WebKit and Firefox have no WebGPU here, so they only confirmed the no-WebGPU message, not the game itself.

## Where the game differs from the plan
- AI pace is below the plan's ranges, which the plan invites; the Featherweight field is hand-set.
- The banking limit is passed as a speed cap rather than through `vMax`.
- In races under 10 laps, entering the pit lane takes a deliberate move, and AI cars only pit at 10 laps or more.
- The car body leans outward in corners.
- B-3, A-2 and A-3 have short run-ins before C7.
- The cone check is in `sim/licence.js`, and the voice function is `speak`, called through `mix.say`.
- The trackside gantry keeps five physical lamps in hub rounds, with three lit.

I made no commits, since you didn't ask for any.

---

## Source Information
- **Date:** 2026-11-05 17:19:04
- **Source:** Gran Turismo 3: A-Spec
- **Plan:** PLAN.md
- **Genre:** Racing simulation with a career, licences, tuning and car collecting
- **Perspective:** Third-person chase camera (near and far), a bonnet view, television cameras in replays; a three-quarter diorama camera in menus
- **Tech:** Pixel Engine 0.46.0 (riftlight kit), three.js r186 and Rapier 0.20 bundled in it, plain JavaScript modules, esbuild 0.28.2, AI Hub session client 1.4.0; Playwright 1.63.0 for tests only
- **Art Direction:** The engine's native 480x270 pixel art: low-poly toon shapes in the 16-colour Sweetie 16 palette with pixel outlines; 14 cars, 6 circuits, buildings and sets built from data and code
- **Animation:** The engine's rig and clips (HERO_RIG, ClipDef, compileClips) with 10 new clips: PitJack, PitWheelGun, PitFuel, MarshalFlag, ExaminerClipboard, DealerPresent, MechanicWipe, PodiumCheer, PodiumBow, CrowdCheer; procedural body roll, pit stops, dyno, car wash, Timeline ceremonies
- **Audio:** All in code, no audio files. A per-car engine synth on Web Audio, tyres, wind, rain, kerbs; 8 original songs and a fanfare as Song data, music at 10% by default; Animalese-style gibberish voices for 4 speakers with subtitles
- **Online:** AI Hub session protocol 1 in ghost mode (1 to 4 players, seat-coloured ghost cars through the hub only), and Couch Duel: two players, split screen, on one TV with no network
- **Testing:** Headless and scripted tests allowed; one command printing failures and a count. Ran node tools/test.mjs: sim, data, career, audit (evidence for every line of the plan), headless, behave (the plan's behaviours done and measured), layout (every screen at 360, 480 and 640 wide), play (whole career by bot), browser (Chromium; WebKit and Firefox only to confirm the no-WebGPU message), hands (real mouse, wheel, pad and a hub round watched from inside), audio and hub (harness 2 players, 4 players with latency, host leaving, plus the session menu). Screenshots at 1920x1080 for what scripts cannot judge. No subagents
- **Research:** No web research. Read the plan, the kit's GUIDE, ASSETS and parts of API, and the hub README
- **Environment:** Claude Code CLI (headless); Linux
- **Model:** Anthropic, claude-opus-5-5, reasoning effort xhigh
- **Usage:** added on import

## Testing Feedback
- **How many issues did testing catch?** 61 by my count: 13 from the scripted suites and the career bot, 3 from page errors in the browser, 13 from looking at screenshots, 17 from three line-by-line reads of the plan that the tests had missed, and 15 from a last pass of behaviour and layout suites, written because much of my audit only proved that code existed. No human has driven it, so handling feel is untested beyond scripted drivers: that is a real gap, not a pass.
- **How many would be considered critical issues / game breaking?** 9: AI crash at the first race, menus left over the race, pause closing on the press that opened it, a crash on the hub card, boot broken by one of my own patches, the Red Clay and Featherweight fields that blocked the career, tyres destroyed on the Saltline banking in the Grand Prix, Options in a hub round opening the pausing menu, which the harness did not catch, and attract mode starting 10 s into any screen opened over the title or Map, which threw a reader back to the Map and could cut into a prize ceremony.
- **What was the most helpful test you ran?** The whole-career bot. It played real screens through to the ending, and its log exposed accidental pit entries, unbeatable fields and the banking problem, none of which a unit test would have shown. Close behind it: the last behaviour suite, which ran what the audit had only seen in code. With 1652 checks already passing, it found the attract bug and a replay director cutting nearly every frame.
- **What was the least helpful test you ran?** The audio centroid check was the least helpful: its one failure was a mistake in the test's own frequency analysis, and the engine synth was right from the start.

## Engine Feedback
- **What did you like most about the engine?** Engine.headless: the same game code, in Node, without a GPU. It let a bot play the whole career in about three minutes, and the HUD, particles and tweens all just worked there.
- **Did you get stuck or guess wrong?** Yes. I assumed a box's width runs along its heading, so long buildings came out sideways until I saw a screenshot. I passed the wrong arguments to analyzeClip by guessing its signature. Screen transitions never resolve while the engine is in manual step mode, which hung one of my scripts. Engine.headless runs its own camera rig unless it is given the game's preset, so my first camera checks read the wrong camera.
- **What was the most important thing you had to build yourself?** The driving: the car model came with the plan, and on it I built the race rules, career, replay director, track mesh and dressing, and the engine synth. For the engine's own part, the menu system with focus, prompts and glyphs was the largest thing I had to build.
- **What was the hardest part about using the engine?** Getting a large world built from one GeoBatch to look right with shadows: acne on walls at grazing angles, and the choice of which surfaces may receive them. Also the HUD's colour argument: a CSS string fails only at paint time, outside the game's hooks, so engine.errors stays empty.
- **What did you change in the engine, and why?** none
- **If you could change one thing about the engine, what would it be?** Have hud.rect and hud.sprite reject bad input (an unknown colour name, an undefined sprite row) at the call, with a message, instead of throwing later in the paint step where the stack says nothing about the game.

## Prompt Feedback
- **What did you like most about this prompt?** The plan's section on engine facts and its tested Appendix A. Knowing what was already proven let the risk go where it belonged, and the sim matched every regression number on the first run.
- **What was confusing?** The brief's title rule against the plan's rule on the source's name took a moment to reconcile. Also 'Online' as a bare URL, though the plan explains it. And the plan's roll sign in recipe C3 reads as if the body leans into a corner; I used the outward lean, which is what the sim's load transfer implies.
- **What was the hardest thing to do?** Judging feel with no human and no real pad. Balance can be measured with a bot; whether the car is nice to steer cannot. The next hardest was making a full career finishable with sensible money without cheating.
- **What would you change in this prompt?** I would ask for a short human play-test note to be handed on, since the brief makes it impossible here, and I would state outright that a bot's skill 1.0 is stronger than most people, because the plan's AI pace ranges were too high for it even so.