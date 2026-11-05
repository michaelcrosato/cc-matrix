# TASK.md audit: every requirement, where it is implemented, and what proves it

| # | TASK.md requirement | Implemented in | Evidence |
|---|---|---|---|
| 1 | SOURCE: baseball, over-the-top arcade | src/10-20 (rules, pitch, bat, ball, play, match), 16-supers.js | tests: rules, ai (CPU sims in range), playthrough |
| 2 | Genre picked to fit | arcade baseball + brawler mini-game + story Tour | about.json genre; playthrough suite (Tour, Rhubarb) |
| 3 | Perspective picked | 21-draw.js: Mode 7 Plate Cam, Broadcast Cam, Moonshot Cam, replays (19-replay.js) | screenshots of all 6 parks; extras suite "a home run plays a replay" |
| 4 | Title: playful riff, chosen by a real RNG | PLAN.md: secrets.randbelow(50)+1 = 37 -> Batzooka Baseball | title screen; <title>Batzooka Baseball</title> |
| 5 | Research: own choice | engine docs, kits, AI Hub README | about.json research |
| 6 | Package: single html, named [GameTitle-SOURCE-model-date].html | tools/build.mjs -> ../BatzookaBaseball-Baseball-claude-opus-5-5-medium-20261104-060114.html | ls of work/ beside STAGE.md; no external requests (checked) |
| 7 | Tech: built on my-3d2dge handoff, may change engine | engine/my-3d2dge.js; ENGINE-CHANGES.md | 5 marked BATZOOKA changes |
| 8 | Art: engine style base, new assets for the source | 05-park.js (parks, fence, stands, fans, props), 04/21 drawing, 06-teams.js uniforms, mitt and bat in the engine | park screenshots; title; rhubarb; gallery |
| 9 | Animation: engine system base, new animations for the source | 21-draw.js SWING/BUNT/PITCH specs and animateRigs (stance, swing, bunt, windup, throw, crouch, dive, jump, climb, slide, trot, cheer); 16-supers.js punches/shoves/tosses/knockdowns; 21-draw.js mascot race and dances; 37-about.js gallery | Animation Gallery screenshot (11 motions); rhubarb screenshot |
| 10 | Audio in code; Animalese voices | 02-audio.js: 14 songs, 7 stings, 45 sfx, babble for 16 voices; no audio files | bundle has no audio files; AUD via scenes and talk tests |
| 11 | Online: ai-hub lib/hub | 40-hub.js (ghost Derby, own card, ready, progress, result, time-up, end, ghosts); hub meta tags; client first script | tests/hub.mjs real harness: 2p, 4p latency/jitter/loss, host-leave all pass=true; hub suite (12 checks) |
| 12 | Dev folder, bundle in root, CDN allowed, shared machine rules | dev folder BatzookaBaseball-Baseball-...; 127.0.0.1 port 0 server; only own PIDs stopped | tests/hub.mjs |
| 13 | Performance out of scope | 900 fans/park, lights, particles | - |
| 14 | Testing: headless, one command, failures + one-line count, scripted playthrough | tests/run.mjs (106 checks) | "106 passed, 0 failed" |
| 15 | Goal: original game inspired by the source | original teams, parks, story, lines | 06-teams.js, 33-tour.js, 23-talk.js |
| 16 | Feature-complete vertical slice, all mechanics shown | Tour (5 stops + boss, cutscenes, clubhouse, saves, ending, credits), Exhibition 1-4p, Derby, 8 lessons, pickoffs, steals, replays, supers, hazards | playthrough: stops 1-5, scripted Rhubarb, ending + unlock; 6-park run: all reach results, 0 errors; lessons 1-8 pass |
| 17 | Dev mode from pause menu, standard tools, live sliders, reset | 36-dev.js (TUNE, SITUATION, CHEATS, TRIGGERS, WARP, INFO, pins) | dev suite: pause item, slider, reset, cheat, situation, warp |
| 18 | Attract mode after 10 s idle, AI play, any input exits | 35-attract.js (10 segments, cheats) | attract suite: starts at 10 s, loops all 10, input exits, not in play |
| 19 | Multiplayer per ai-hub and on its own | 40-hub.js; 34-menus.js join 1-4, sides, captain/co-captain duties | harness; input + playthrough suites (4-player game) |
| 20 | Narrative tone like the source | 23-talk.js radio play-by-play pools (40 tags, 263 lines), 33-tour.js story | about suite: pools >= 6 lines, <= 100 chars |
| 21 | 10-foot controller-first UI; pad standard mapping | 30-ui.js BigMenu (big cards, focus, legend), 22-hud.js | screenshots of every screen |
| 22 | Keyboard and mouse native | 01-input.js preset (WASD, Space, number keys, Shift, Esc); mouse aims reticle/target, wheel picks pitch, click throws to a base, clicks/hover menus | input suite (keyboard + mouse prompts); 20-match.js, 14-play.js |
| 23 | Prompts follow last device; PlayStation glyphs, Settings option for Xbox | 01-input.js glyph renderer; engine glyphs setting defaults to PlayStation | input suite: PS default, Xbox shows A B X Y; pad screenshots |
| 24 | No dense web-style data screens | at most ~7 items per screen; dev panel is canvas, large | screenshots |
| 25 | Touch-only: no touch controls, "Controller or keyboard required" + settings button, attract runs | 01-input.js detectTouch, touchEnabled=false; 34-menus.js title card | touch suite |
| 26 | No TODOs, placeholders, stubs | - | grep of build/game.js: 0 matches |
| 27 | Source Information etc. in reply and in-game About/Credits | 37-about.js pages from about.json | about suite; About screenshot |
| 28 | exit-interview.json beside the html, exact shape, parses | written by tools/build.mjs from about.json | JSON.parse ok; 0 empty values |

## Issues testing caught (the Testing Feedback count)
Code bugs (12): engine comment syntax error (headless load); quote syntax error in a Tour line (load); boss speed null -> NaN pitch (sim froze); CPU super pitch without aim/q -> NaN (sim froze); sticky bunting flag (sim stats); crash on contact with no fielders (rules test); late swings called strikes before resolving (Derby bot test); absurd home-run distance formula (Derby run); deep link pairing COM vs COM (screenshot); rally-cap line over 100 chars (about test); headless cutscene auto-skipping (scenes test); mock hub name clash (hub test).
Balance (1): first build batted .600 with 0% walks (sims).
Layout (15): menu overflow on title; missing font glyphs as '?'; catcher filling the Plate Cam; radio box over HUD; team-select overlap; legend overlap; prompts over the player card; fence labels clipped; Moonshot floor past draw distance; stamps over radio; attract badge over scorebug; tour map menu overflow; results buttons overflow; hub card button labels; cutscene legend over dialog.
Critical (6): engine comment syntax error; Tour line quote syntax error; boss speed NaN freeze; CPU super pitch NaN freeze; no-fielders crash; late-swing bug.
