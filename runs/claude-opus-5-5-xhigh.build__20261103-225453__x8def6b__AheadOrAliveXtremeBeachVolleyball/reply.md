The game is finished and the last full run of `node test/run.mjs` passed: **809 checks, 0 failed, across 22 suites**. The single HTML file (2,034 KB, no network loads), `exit-interview.json` (parses, every field filled) and `TESTING-LOG.md` are in place. A full run just before that had two Chromium page crashes, in the browser and hub suites. They didn't happen again in three reruns, and I don't know the cause.

Two limits on what was tested:
- **Controllers were emulated, not real.** In Chromium, a script stood in for two PlayStation pads and pressed their buttons. No physical controller was used.
- **"Clean" is the photo mode's no-filter setting.** All five photo filters (Clean, Sunny, Sepia, Retro, Night Glow) are now checked by measuring the screen's colours.

**What this round added:**
- **Four-player Beach Match:** two players share the keyboard and two use the emulated pads. Each player joins, readies up and moves their own fighter in the match. Pads show PlayStation buttons and the keyboard players see their keys. Switching to Xbox changes the pads to Xbox buttons.
- **Serve Cam in a live rally:** checked by script and screenshot. It cut off the near player, so it now keeps all four in frame.
- **The attract mode:** every beat was screenshotted and checked in order. One bug: going from the photo scene to the Final match made the engine's error panel pop up on every loop. That's fixed, along with its "Press" prompt being drawn over other prompts and the DEMO badge covering the scores and other on-screen info.
- **An engine fix:** on the shared keyboard, the engine put two lobby actions on one key each (Outfit and Ready on F, Options and Back on G). Each action now gets its own key, and a check covers it.
- **Earlier this round:** two new suites, saves and revisit, found that Continue and Load crashed. That's fixed.
- **Every figure is now measured:** the About pages, exit interview and this reply use counts from the code, the test run and the system clock, with no estimates.

## Source Information
| Field | Answer |
| --- | --- |
| Date | 2026-11-03 22:54:53 |
| Source | Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003) |
| Plan | PLAN.md |
| Genre | Sports: arcade 2-on-2 beach volleyball, with a light life-sim vacation (calendar, friendships, gifts, collecting) and minigames (rhythm Pool Hop, casino) |
| Perspective | A side-on TV Broadcast camera (12-degree yaw, pitch 30) and a behind-the-team Serve Cam for matches; top-down three-quarter places; an isometric island map; full-screen pixel UI for shops and tables |
| Tech | my-3D2dge v0.85.2 (patched), plain JavaScript, Canvas 2D (WebGPU lighting where available), the engine's Mocap player with 31 clips, AI Hub session client 1.4.0. Built and tested with Node 24, Playwright 1.63.0 (Chromium) and Python 3's http.server. One self-contained HTML file. |
| Art Direction | The engine's PS1-era pixel art: Humanoid rigs in an athletic build, swimsuits drawn in code (7 cuts, 14 patterns) and accessories; resort props as data shapes; time-of-day skies and lighting; a gold-and-teal 10-foot UI with hand-drawn button glyphs |
| Animation | The procedural Humanoid with 14 held poses and a timed arm and body overlay driven by the volleyball simulation, plus 31 motion-capture clips |
| Audio | All Web Audio in code: 9 songs, 10 jingles, 50 sound effects, ambience loops, and Animalese-style gibberish voices letter by letter |
| Online | AI Hub shared world for 1–4 players: the game's own card, a host-authoritative match on the hub's clock, touches judged on each player's machine and confirmed by the host, CPUs fill empty seats, finish() with standings |
| Testing | One command printing only failures and a count: 22 suites, 809 checks, all passing on the final run. Headless Node suites: unit tests, AI match statistics, the vacation, shops, story, minigames, UI, attract, dev mode, saves, revisiting 27 scene setups, netcode at 150 ms latency with jitter and 5% loss, and a full playthrough as all six fighters to both endings. Chromium suites: a tour, the attract, an emulated touch-only phone, and the four-player match with emulated pads (glyphs, Serve Cam, attract beats, photo filters). No physical controller was tested. Also the engine's check tool and the AI Hub harness (4 scenarios). |
| Research | No web research; read the engine handoff docs and source, the AI Hub protocol and client, and the mocap catalogs |
| Environment | Claude Code CLI (headless); Linux; browser unknown |
| Model | Anthropic, claude-opus-5-5, reasoning effort xhigh |
| Usage | Cost and tokens unknown (no meter was available). By the system clock: 2026-11-03 22:54:53 to 2026-11-04 01:22:38 when the text was last updated, 2 h 27 min |

## Testing Feedback
- **How many issues did testing catch?** 47 game issues, each listed in TESTING-LOG.md. Scripted tests caught 20, such as:
  - rallies that never ended;
  - a CPU partner spiking into the net;
  - a starting partner never assigned;
  - scene state carried from one visit to the next;
  - Continue and Load crashing.

  Screenshots and rig sheets caught 27, such as:
  - the net seen edge-on;
  - overlapping text;
  - tiny menu text;
  - two menu actions on one key;
  - Serve Cam cutting off a player.

  Separately, there were 10 bugs in the tests themselves.
- **How many were critical?** Seven:
  1. The Welcome Match never started for Ingrid.
  2. The game froze after the Welcome Match.
  3. Pool Hop couldn't be won when entered from the pool.
  4. The Final was never called on a second vacation.
  5. The credits never ended on a second run.
  6. The title crashed in the browser.
  7. Continue and Load crashed.
- **Most helpful test:** the scripted playthrough, six full vacations to both endings. It found 5 of the 7 critical bugs, and the revisit test found another.
- **Least helpful test:** the first "no match phase stuck over 15 seconds" check. It flagged long but legal rallies until I redefined it as 15 seconds with no touch and no phase change.

## Engine Feedback
- **Liked most:** the whole game runs headless in exact fixed steps, and the Humanoid is drawn from math, so outfits and poses are code.
- **Stuck or guessed wrong:**
  - the Shell's font setting takes a font family, not CSS shorthand;
  - Mocap is a top-level const;
  - a fade delays `game.go`;
  - scene objects persist between visits;
  - at yaw 0 the camera saw the net edge-on;
  - `Input.halfKeys` gave two menu actions one key, which I only noticed in a screenshot.
- **Most important thing I built:** the volleyball simulation (ball flight, contact planning, timing judge, AI error model), with the same launches driving local and online play.
- **Hardest part:** swimsuits, which needed a per-pixel torso fill inside the engine's draw code.
- **What I changed:** nine patches, all marked `// AOA:` and listed in ENGINE-CHANGES.md:
  1. font glyphs;
  2. a button-symbol setting;
  3. a per-letter voice hook;
  4. audio buses and instruments;
  5. Humanoid swimsuits, hair, poses and arm overlay;
  6. `reserveCombo`;
  7. `touch: 'never'`;
  8. `E.onStep`;
  9. the `halfKeys` fix.
- **One thing I'd change:** make scenes fresh on every visit, or warn loudly that they persist.

## Prompt Feedback
- **Liked most:** the definition of done, the one-command testing rule and the exact exit-interview shape.
- **Confusing:** PLAN.md's file names and date came from a different run than TASK.md's; TASK.md winning settled it. Usage asks for cost and tokens the model can't see.
- **Hardest:** the breadth with no stubs allowed, and balancing the volleyball AI.
- **Would change:** have the plan take its paths and dates from TASK.md, say how to report Usage when there's no meter, and give a time budget or allow the core to ship first.

Files are in the work folder:
- AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-xhigh-20261103-225453.html
- exit-interview.json
- AheadOrAliveXtremeBeachVolleyball-DeadOrAliveXtremeBeachVolleyball-claude-opus-5-5-xhigh-20261103-225453/TESTING-LOG.md

Nothing was committed.