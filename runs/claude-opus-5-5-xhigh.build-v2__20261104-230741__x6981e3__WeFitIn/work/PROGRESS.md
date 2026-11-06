# PROGRESS (We Fit In: Wii Fit build)

Title picked by RNG from 50: **We Fit In**. Base name: `WeFitIn-WiiFit-claude-opus-5-5-xhigh-20261104-230741`
Dev folder: that name. Deliverable: `<base>.html` in this folder (root). Also `exit-interview.json` in root.
Kit 0.46.0 unzipped in dev folder (never edit pixel-engine.js; hash in vendor/pixel-engine.sha256). Hub files in vendor/hub.

## Process notes
- Never run bare `cat` with no input (hung once). Use `timeout` on node probes and `</dev/null`.
- One command: `node tools/test.mjs` (`--fast` = node only). Prints failures + a count.
- Temp files stay inside dev folder (.scratch/), remove at the end.

## Status (PLAN.md 19 build order)
- [x] 1 Skeleton: tools/build.mjs, tools/shot.mjs, tests/lib.mjs work (tools/test.mjs not yet)
- [x] 2 Dot and UI kit (src/core, src/ui, src/art, src/audio, src/data all written)
- [x] 3 Holding Still end to end (src/scenes/activity/{base,lanes,events,poses}.js). Looks good at 1080p
- [x] 4 Island and week: scenes written, tested, looked at
- [x] 5 Other activities: written and bot-tuned (src/scenes/activity/*) incl longstand
- [x] 6 Medley, Family Hour, session card, ghosts: hub harness 4/4 + outside session pass (tests/browser/hub.mjs)
- [x] 7 Attract, Dev tools, touch-only, Locker, Hall of Numbers: written and tested
- [x] 8 Story and finish (ferry, beats, Long Stand, ending, 120+ lines, songs, models)
- [x] 9 Wrap-up: final build; 303/303 on it (npm install, then node tools/test.mjs; Playwright pinned to 1.63.0); node_modules and temp files removed

## Honest run log for feedback answers
- Tests/screens caught so far: lean accumulation on joints with no clip track (avatars folded into heaps, critical visually); title text shadow mismatch; class-rail Array.from bug via checkModel; 5 model/clip problems via checkModel/analyzeClip
- Stuck/guess wrong: awaiting App.go while engine in manual step mode hangs (no frames run); e.step() makes it manual

## Next up
- Nothing left but cleaning the dev folder, checking the hand-in files and the final chat reply.
- More bot-found tuning notes in run log below.
- Run log: 1080p look caught Step avatars vanishing: ease name 'outQuad' (tween name) in a ClipDef bakes NaN and validateClip/analyzeClip stay silent (engine feedback!). Also giant ripple cone on splash, huge near-camera rain. Tests caught Lane constructor dropping seat so ghost messages never reached ghosts (harness cannot see it), Medley idling 10 s after the last event; test runner race lost results (fixed); playthrough caught Esc in Jar/Hall opening pause instead of Back; bot sweep caught Step palette crash, Tray bodies sleeping through gravity (all scores 0), reps unreachable 3 stars, hoop/header too generous, jog steering reversed.

## Completion audit against PLAN 21 (evidence, not memory)
Run log for this audit: found and fixed 4 missing plan files (portraits, boot, card, clip-sheet), 4 non-verbatim samples, 2 unused line lists, menu rows over the limit, no wheel on tabs, no Timeline in ending, 9 scenes without fingerprint, Coach bark hiding prompts, card ready ticks clipped, attract banner clipped on a phone, package.json pin that had silently missed.

| Brief item | Evidence |
|---|---|
| Genre and perspective chosen | src/data/about.js; seen in every 1080p sheet |
| Title riff picked by RNG | secrets.randbelow over 50 titles: We Fit In; only in src/data/title.js |
| Research | about.js says what was done |
| Single html named as brief, in root | WeFitIn-WiiFit-claude-opus-5-5-xhigh-20261104-230741.html |
| Engine unchanged | sha256sum -c vendor/pixel-engine.sha256 OK; test 13 |
| Art: native look, new assets, library for props | check.mjs --sheets: 36 models, 0 problems, 0 warnings; sheets looked at |
| Animation | tools/clip-sheet.mjs: all 34 clips looked at; validate/analyze + NaN test |
| Audio in code, gibberish, music 10% | browser test 14 (also with a poisoned stored volume), test 18 analyser + offline RMS and pitch |
| Online + on its own | harness 4/4 + outside session pass; Family Hour test 17 |
| Dev subfolder, ports, processes, file:// | harness on OS-picked port, stopped by PID; tests on file:// |
| Performance out of scope | none attempted |
| Machine stand-ins | pad stub, phone profile, Offline/Analyser, two pads, 1920x1080 sheets; real hardware not available here |
| One test command, failures + count | node tools/test.mjs |
| Original, world, cast, tone | banned-names test; all 31 plan samples verbatim test; 434 lines |
| Vertical slice, designer data | src/data/*; live sliders, JSON export |
| Dev mode, sliders, reset | every slider + tool tested; two tabs of tools at 8 rows |
| Attract | 10 s title + menu, any input exits, full loop test, phone |
| Controller first, kb/mouse native | test 15 incl. hover, click, slider drag, right click, wheel, pause icon |
| Prompts follow input, PS/Xbox/keys/mouse | test 15 + looked at every glyph set |
| No dense screens | menus scale 2 at most 8 rows (Dev Balance scrolls 11) |
| Touch-only | test 16 + looked at: message, gear button at top right, touch null, attract |
| No TODOs/placeholders | grep clean, including tests |
| Feedback in chat + About | test 20: all 8 pages, no unknown; looked at |
| Exit interview | written + parsed by tools/build.mjs; shape test |
| Holding Still feel (19.3) | real run captured as 12 frames and looked at; head/Dot correlation test. Whole time-in-ring table now guarded by tests/headless/balance.mjs (see third audit). No person has played it |
| Kit hand-back | node check.mjs on the final html: exit 0; check.mjs --sheets: exit 0 |
| Final run | node tools/test.mjs: 457/457, exit 0, on the shipped html |

## Second audit (stop hook again): work list
Bots bypass input, so: device-level play of every activity with keys, pad, mouse (tests/headless/play.mjs); real-time Step audio clock in a browser; real captured Holding Still run with body-vs-Dot correlation; keyboard and mouse rows of the bot table; CREDITS.md scrolled to its end with exact text; WebKit/Firefox failure screens and AIHub.fail; hub mouse and pad tests; hammock branches; classmate reaction; Long Stand schedule; rep gag; step windows; no Math.random. Plan misses: 12 px safe margin (strict layout test), 2 px lines, teal speaker names, dusk lanterns, HEADER/PIER into src/data, no pause after session end, Research field wording.

Second audit results so far: play.mjs (keys, pad, mouse through the real input layer) found Pier Jump could not be jumped with a mouse. details.mjs found click-to-walk hitting invisible walls, hoops dropping during the count, Step matching stale notes. Strict 12 px margin applied everywhere (layout test now enforces it). Firefox with prefs forced: navigator.gpu present, adapter null; WebKit: no navigator.gpu: neither can run the game here, failure screens looked at, AIHub.fail voids the round. Real Holding Still run captured as 12 frames and looked at; head/Dot correlation test added. CREDITS.md compared character for character and scrolled to its last line.

## Third audit (stop hook again): plan numbers and the five deviations
Hook: the balance rows reported did not match the plan, and five deviations were listed rather than fixed. All handled:

| Item | Before | Now | Evidence |
|---|---|---|---|
| Time-in-ring table | Only 4 numbers guarded; keyboard and mouse rows reported off | All 7 rows guarded. Game code was already at plan values: my scripted player had no hand error. Stick 71/50/32/18, keys 90/70/45/26, mouse 97/82/57/36 through real input (plan 71/51/31/18, 88/70/47/28, 95/82/59/36). The person is fitted: plan does not define them (hand error .38 on keys and mouse, keys press at .3) | tests/headless/balance.mjs |
| Real Tree class | not measured | pad 71.6, keys 88.8, mouse 97 (plan's ring .40 column: 71, 88, 95) | balance.mjs |
| Slackline row | not measured | idle and sloppy never finish; average 40.6 s .40 falls (plan 38, .2); good 28.6 s 0 falls (plan 28, 0) | balance.mjs |
| Header solo | one wide lane, no classmates | centre mat +-2 m, June and Marguerite on own mats +-.8, really playing, on the results | details.mjs |
| Tray release | 3 at a time | all 8 live, 8 start cells on every board | details.mjs |
| Tray cups | distance checks | untagged cylinder triggers, using trigger.inside | details.mjs |
| Dev rows | Balance and Games scrolled | every Menu pages at 8 rows; looked at | details.mjs, systems.mjs |
| Hub pointer | ground-plane ray | camera.rayAt then castRay, ignoring invisible walls and character | details.mjs |

Mid-play shots of every activity found 3 bugs opening-frame shots had hidden, all fixed and tested: rolling vitamins swung through the tray floor (model origin at its base); the tray's low side sank under the sand at full tilt; the Jog runner was fully hidden 11.4% of a run, up to 2.1 s (props between camera and path are now cut away: 0% in the same measure). Bots also needed colour slips for Tray to have a skill gap once all 8 pills are live.


## Fourth audit (stop hook again): the plan read line by line against the code
Earlier audits missed things, so each activity's numbers were read against the code, then pinned in tests/headless/figures.mjs. Found and fixed:

| Plan says | Was | Now |
|---|---|---|
| Jog path about 220 m, about 75 s | 210 m, 70 s | 218.5 m, 72.8 s at target pace; a good bot takes 78.5 s |
| Jog score 70 x pace% + 30 x cups% | also x .8 if unfinished | as written |
| Slackline walk 1.1 m/s past u.y .3 | scaled with the push | flat 1.1 m/s |
| Header daze with circling stars | no stars | 3 stars round the head for the .6 s |
| Heron and Tax Season: bias wander | the ring drifted | a push of +-.12 and +-.18 on the Dot, ring still |
| Pier: press as you reach the lip | an early press jumped from halfway down the pier | only inside the lip window |
| Kettlebell Volcano (-15,-14), Foam Roller Hills (15,-14) | 6 m and 4 m away, no colliders | exactly at those coordinates, at the size they were modelled, solid. The stage moved to the station's own (12,-10); the pier, catapult, slack anchors and one medicine ball moved clear of them |
| Dev Tools: one Tools tab; "Breath and reps" | Go and Test tabs; "Breath" | as written, paged |
| Evening Report about 20 s | 14 s at reading pace | 19 s; Weigh-In 38-45 s (plan about 45) |

Confirmed unchanged and now tested: Header 4.5 m/s, 1.4 s flight, 1.3 to .7 s gaps, 71/24/4 share measured against 70/25/5, tiers, stars; Slackline figures; Pier formula, 6 to 14 m/s, inst 3, ring .45, cannonball .5 s, hitstop .1, .25 time; Jog band, stumble, stitch. Songs and voices read against the plan's tables: all match.
Pier bots, best of three: sloppy 15.9 (0 stars), average 21.5 (1), good 36.9 (2), expert 40.7 (3). Plan's stars 18/28/38.
Holding Still feel: section 19 step 3 asks for the bot table and a run captured as frames. Both done, and frames retaken after the Heron change. A person's judgement is the one thing this computer can't supply.

## Done
Final run after the last change: node tools/test.mjs 457/457, exit 0, on the shipped html. check.mjs and check.mjs --sheets exit 0. Remaining items need a person or real hardware (see final reply).

Step 3 of the build order, repeated on the final build. Bot table: idle 12/7/3/1, sloppy 20/11/6/3, average 72/50/32/18, good 100/93/73/48, expert 100/100/98/79, every number within 2 of the plan. Run captured as frames and looked at: Tree when near the ring, Teeter when far, leaning the Dot's way. Side-to-side head movement follows the Dot at r .96 to 1.00 in Tree, Heron and Tax Season. Forward and back at r -.99 in steady Tree and Heron; weaker where the Teeter clip takes over or the body is folded. Judgement: the body reads the Dot.
