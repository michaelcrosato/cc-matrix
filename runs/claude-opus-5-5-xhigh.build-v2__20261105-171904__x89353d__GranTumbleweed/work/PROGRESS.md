# PROGRESS

Read this first after any context compaction. Then TASK.md (the brief) and the relevant PLAN.md sections.

## Fixed decisions
- Title: **Gran Tumbleweed** (picked by `secrets.randbelow(50)` from 50 candidates, index 27).
- Dev folder: `work/GranTumbleweed-GranTurismo3ASpec-claude-opus-5-5-xhigh-20261105-171904/`
- Final HTML: `work/GranTumbleweed-GranTurismo3ASpec-claude-opus-5-5-xhigh-20261105-171904.html`
- Exit interview: `work/exit-interview.json`
- Kit: Pixel Engine 0.46.0 unzipped into `src/`. Never edit `src/pixel-engine.js`.
- Hub files in `tools/hub/` (README, bridge.js, harness.html, retrofit.md, round.js, session.js).

## Build order status (PLAN section 17)
1. Pipeline: done (tools/build.mjs, tools/test.mjs)
2. Sim in Node: done (sim suite green: 147 checks). race.js, career.js, licence.js, tuning.js, replaydata.js written; medals frozen in data/medals.js
3. One car on one track: renders (scenes/race.js, app.js, racehud). Dressing+world+pitcrew+director written, first screenshot looks good. Feel tuning later.
4. A race: done in code (rolling start, results, replay, director)
5. All tracks, dressed: dressing.js written; not all looked at yet
6-7. Menu world and career screens: written (scenes/menu.js, scenes/replay.js, flows.js, ui/screens/*). Not yet run. Next: dev/devmode.js, attract/director.js, net/hub.js, main.js full boot, data suite, headless suite, play suite.
7. Career: not started
8. Pit stops, rally, H200: coded; play suite will exercise
9. Attract, Dev, Settings, touch gate, About: coded; browser suite tools/tests/browser.mjs written
10. Multiplayer: hub.js couch.js coded; tools/tests/hub.mjs written, not yet run
11. Whole-game playthrough: play suite finishes the career (27 days). Polish and screenshots still to do.
12. Finish: DONE. Plan audit (tools/audit.mjs, docs/plan-audit.md) clean; all suites green on the final build. Only the chat reply remains.

## Test log (issues caught, for the exit interview)
- hud.sprite undefined row: negative tumbleweed frame (found by playwright, page errors)
- aiDrive passed race entries, not car objects (first browser run)
- box helper axis: long buildings rotated 90 degrees (first screenshot)
- attract started right after a race because idle kept counting (play suite)
- pause opened and closed on one press (headless suite)
- career bot: accidental pit entry when running wide off the last corner; AI pitting in short races; Red Clay rivals and Featherweight field unbeatable; KiteCup too fast; bot brain sampled too coarsely
- hub card: seat colours as CSS strings crash hud.rect (hub suite)
- back on the pause menu did nothing (browser suite)
- mouse could not click a building on the Map because the camera glided (browser suite)
- Saltline: speed profile too hopeful on steep banking, tyres gone and walls (play suite)
- Re-audit against PLAN.md: Options in a hub round opened the normal pause menu, paused the race and offered quit (hub rule broken; harness did not catch it); hub menu had no working Back; no way to follow a ghost after finishing; garage lacked wear and setup
- Second read of PLAN.md: C-1 standing start had no lights; replay director never preferred a slide or battle; H200 unlit after dark; some spoken lines had no subtitle; slipstream had no icon; headlights wrong colour
- menu stack stayed over a race (headless suite)
- Last pass, suites behave, layout and hands: attract started on any screen opened over the title or Map; replay director cut nearly every frame; hold Triangle took 1.4 s to recover; keyboard steering used the return rate on its first frame; test card brief ran off the screen and its tip was cut mid-word; subtitles covered buttons (test card, licence lists, event card, parts); About overflowed at 360 wide; Map labels, the GP's locked reason, the 200's round card and narrow race messages overflowed; mix kept making engine synths after the hub's end; replay camera swung to the new car before the cut; a menu key tap shorter than a frame was lost

## Notes for the exit interview (keep honest counts as work goes)
- Issues caught by testing: (keep a running list below)
