# PROGRESS
Title: Grandpa Turismo (picked by crypto.randomInt from 50). Dev folder: GrandpaTurismo-GranTurismo3ASpec-claude-opus-5-5-medium-20261105-171907
Output HTML: GrandpaTurismo-GranTurismo3ASpec-claude-opus-5-5-medium-20261105-171907.html at root; exit-interview.json at root.
## Steps done
- kit unzipped to dev/src, hub files in dev/tools/hub
- Sim extracted from plan and passes lap regression (tools/tests/reg0.mjs -> move into sim suite). data/* and sim/career, tuning written.
- race.js RaceSim done (rolling/standing/stagger, pits, licence runs w/ testBrain). tools/medals.mjs writes data/medals.gen.js (run after sim changes).
- models/cars.js, render/{carview,trackmesh,sky,skid,particles}.js written. Next: input, ui, app, scenes/race, main, tools/build.
- input/{pad,actions}, ui/{glyphs,ui} written. Next: audio/mix+enginesynth, app.js, scenes/race.js, main.js, tools/build.mjs; then menus.
- audio/{enginesynth,voice,mix}, data/songs written. Next: app.js, scenes/race.js, dressing, main.js, tools/build.mjs; then menus.
- models/props.js, render/{dressing,camera,people}.js, animation/clips.js, ui/racehud.js written. Next: scenes/race.js, ui/screens/race.js, app.js, main.js, tools/build.mjs (then browser-test a race), then menus.
- sim/setups.js and scenes/race.js written. Next: data/text.js, ui/screens/*, scenes/menu.js, scenes/replay.js, app.js, main.js, tools/build.mjs. Then browser test.
- data/text.js + ui/screens/{common,title,licence,events,dealer}.js. Remaining screens: tuning, service, garage, museum, theatre, arcade, settings, handbook, about, race(pause/results/licence result), podium/prize/ending, dev. Then menu scene, replay scene, app, main, build.
- screens tuning, garage, arcade, settings, race written. Remaining: ui/screens/podium.js, dev/devmode.js, scenes/menu.js, scenes/replay.js, attract/director.js, net/hub.js, net/couch.js, app.js, main.js, tools/build.mjs, tools/test.mjs + suites, docs/adding-content.md, exit-interview.json.
- scenes/menu.js, scenes/replay.js, screens/podium.js written. Remaining: dev/devmode.js, attract/director.js, net/hub.js, net/couch.js, app.js, main.js, index.html, tools/build.mjs, tests, docs, exit interview.
- All first-draft modules written (dev, attract, hub, couch, app, main, build). Next: build + browser test + fix; then tests suites, medals rerun, balance, screenshots, docs, exit interview.
- tools/test.mjs + sim/data/career suites pass (npm-free: `node tools/test.mjs sim data career`). tools/b.py = browser helper. Next: headless + play suites (tools/tests/headless.mjs, play.mjs), browser/audio/hub python suites, docs/adding-content.md, exit-interview, visual polish.
- headless suite green (56). play suite written; run `VERBOSE=1 node tools/tests/play.mjs`. Map left/right = ring nav.
- Balance pass 1: lower AI pace, raised prizes; wear clamp + AI respects wear; endurance wearMult 1. play suite running to tools/play.log. Next: browser/audio/hub python suites; visual check per track; docs; exit interview.
- play suite PASSES (bot skill .97, day 26). hub suite passes. browser suite being fixed (tools/tests/browser.py).
- browser (69), audio (15), hub (5), play (38), headless (56) all pass at last run. Fixed gantry rotation, AI paints, clouds. Doing visual review: tools/tour.py (tracks) next: car sheet, screens, pit stop, podium, attract. Then exit interview + final build + full test.
- Visual review done for tracks, menus, pit, podium, reveal, 4:3. Remaining: exit-interview.json (final answers), final build, full `node tools/test.mjs --force`, TODO grep, clean scratch files (tools/q*.mjs h*.mjs dbg.py tour*.py keep?), chat reply.
- exit-interview.json written; scratch files removed. Final: build + `node tools/test.mjs --force` (play ~8 min, browser ~2 min, hub ~3 min).

## Issues caught by testing (the list behind the exit interview's count; test-script bugs excluded)
By suites, bot or runtime errors (18): 1 model id clash stopped boot; 2 `setup` field clash stopped race scene; 3 song track lengths threw; 4 rolling start never went green; 5 pit refuel ran 10x fast (pit trace); 6 test hook read track from the wrong field; 7 Map buildings unreachable by stick; 8 pause opened and closed in one frame; 9 idle timer counted frames; 10 attract could not exit during a load; 11 tyre wear spiral on Saltline; 12 endurance needed the wrong number of stops; 13 prizes and AI pace made events unwinnable or unaffordable; 14 attract pit stop came too late for its clip; 15 two prop models below the floor; 16 all AI cars the same paint (found on screen, confirmed by script); 17 chase camera fell behind after a load (screen, confirmed by measuring); 18 narrow screens: text overflow (screen and hud size check).
Seen only in screenshots (11): 19 speed and gear ran together; 20 brochure overlapped the car card; 21 low-contrast Map nudge; 22 gantry post across the road; 23 cloud streaks; 24 red trail stick behind the focus car; 25 replay camera inside the pit building; 26 wheels read as thin posts; 27 PRESS ANY BUTTON over the speedo; 28 low-contrast Tuning help; 29 replay view blocked by a grandstand.
Found by measuring while checking a screenshot (1): 30 Red Clay crests barely left the ground, so landings never fired; crests sharpened, test tightened.
Seen only in the final screenshot review (1): 31 ground, pit building and stands ignored the bank on Saltline, leaving a ridge that hid the car; fixed.
Found by a new browser test (1): 32 clicking or tapping any Back prompt did nothing (touch-only players stuck in Settings); fixed.
Found by chasing a screenshot to a measurement (1): 33 bank sign came from rounding noise on straights: Saltline's road flipped +16/-16 degrees between samples, 118 times a lap, in the visuals and the physics (bug in the plan's sim code); fixed, with a test.
Critical (5): items 1, 2, 4, 10, 11.

## Missing details found by re-reading the plan against the code (not caught by tests; all built)
Cedar hikers; Dell's replay commentary; replay director preferring slides and battles; gantry TV shot; diorama sparks and brushes; a darker Map at night with lamps; speaker-off icon; camera following a ghost after a hub finish; Esc to skip tyres no longer also pausing; CrowdCheer clip played on the podium; dev "win the current event"; loading tips at the race start; limiter shake. (Thirteen lines, counted as 12 because the gantry shot and the director are one item.)
## Before-you-stop checklist (PLAN.md section 18), final build: see the hash in the last line
- node tools/test.mjs all green, hub all three runs: yes, 867 passed, 0 failed, every suite forced on this build.
- Playthrough finishes the career with no Dev tools: yes, play suite, bot skill 0.97 (not the plan's 1.0), logged on this build: day 29, 432,800 CR, ended true.
- HTML runs from file://, session.js unmodified and first, engine unedited: browser suite (file://, client first); client text is in the HTML byte for byte; engine compared to the release earlier and not edited since.
- Music at 10% on a fresh profile and in a session: headless and browser suites; hub suite in all three runs.
- Grep for TODO, FIXME, placeholder, stub, coming soon: 0 hits in src/game, src/main.js, src/index.html, docs, hub tags.
- Every menu item does something; everything reachable: data, headless, browser and play suites.
- Looked at the 1080p screenshots: whole list shot by tools/review.py and viewed on this build, with no errors: 14 cars, 6 tracks at start and corner, hikers, crest air and landing, 3 Maps, all menus, HUD, results, replay, Couch Duel, 10 attract clips, pit stop, podium, prize, ending.
- About shows real answers, exit interview parses, chat matches: browser suite checks About's fields; every feedback answer is in the build.
- No stray servers or browsers of mine: checked at the end.
Departures from the plan's numbers: AI pace lower, prizes higher, Red Clay crests shorter, Saltline lap references re-baselined after the bank-sign fix to the plan's sim code, slide wear capped.
Not possible on this computer (plan: never required): real pad, TV, listener, human driver, iOS Safari; WebKit has no WebGPU here.

## Status: finished
The last rebuild changed only two sentences of About text; the 1080p review was on the build before it (d198c8f305d6).
final build sha1: 340671411728

## Balance check with a less perfect driver (final build, SKILL=0.92, not part of the test suite)
All three licences passed. Career finished on day 36 with 317,200 CR, all 11 obtainable-by-script cars, ending seen. Dawn, Fellowship, Clay, Touring, H200 and GP won at the first attempt; Featherweight on the third. Rear-Drive Society was lost three times with a lightly tuned Ginga: it is optional (not needed for the Grand Prix) and the strategy never added power or bought the Brandt. Left as it is. This is a bot's pace, not a human's: feel still needs a person.
