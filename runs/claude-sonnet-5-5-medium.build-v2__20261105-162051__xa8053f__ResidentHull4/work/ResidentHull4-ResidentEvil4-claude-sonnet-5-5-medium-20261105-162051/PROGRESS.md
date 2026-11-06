# PROGRESS (read this first after a context compaction)
Dev folder: this one. Deliverable: ../ResidentHull4-ResidentEvil4-claude-sonnet-5-5-medium-20261105-162051.html (built by `node tools/build.mjs`).
Title: RESIDENT HULL 4 (picked by crypto.randomInt from 50 -> index 35). Slug: resident-hull-4.
Plan file: PLAN.md (in parent folder). Task: TASK.md (parent).
Engine kit 0.46.0 downloaded in ../kit/pixel-engine (docs: GUIDE.md, ASSETS.md, API.md). Hub files in vendor/hub.
Test: `node tools/test.mjs` (prints failures + one line).

## Status log
- [x] folder, engine copied, npm playwright
- [x] data: tuning weapons items enemies clips; caseModel; store/settings/device/ui; audio sfx/songs/voice/mix; models humans+props (validated); mapPaint (all maps reachable), levelBuild; world moods; actor (Humanoid)
- Scratch tests in tools/scratch/*.mjs (t1..t9). shots/ holds screenshots. tools/capture.py url out.png "js" steps w h.
- DESIGN: Area (Game) per level; systems take `area`. Intent layer (Human/Bot/Net). Level scripts = generator functions (yield {t}/until). Menus = overlays on ui.js, timeScale 0.
- NEXT: player.js, enemy.js, combat.js, area.js, hud.js, screens, level data (quay first), title, bot, test.mjs, then ch2/ch3, night shift, attract, dev, about.
- [x] core: app.js, run.js, intent.js, ui.js; game: area.js, player.js, enemy.js, combat.js, interact.js, companion.js, scriptkit.js, hud.js, fx.js, loot.js, geom.js, mapPaint, levelBuild, world. Headless Area runs (tools/scratch/t10-11). Visual capture OK (shots/q2.png). Build+capture works.
- boot.js currently boots Area(quay) directly (temporary). TODO order: screens (case shop pause settings about form denied dev telegraph map) -> title scene -> quay chapter scripts -> test.mjs -> ch2/ch3 -> night shift -> attract -> bot -> about content.
- [x] screens: case, shop, menus(settings pause telegraph claimform denied), dev, title, about; flow.js; boot.js (title or ?g_area=quay); quay.js level with scripts (arrival, tannoy hint, cottage, fathom intro, siege, foghorn, leave->road [road not yet defined]). tests: tools/test.mjs + tests/node/01_data, 02_case_loot_run (188 pass).
- NEXT: bot.js (BotIntent) -> tests for combat/AI/quay run; road/cannery/yard/causeway/abbey/nave/launch levels; bosses; night shift+net; attract; hub test; about content; exit interview; docs/CONTENT.md.
- [x] bot.js; tests 03_combat_ai (zones, kick, tokens, door bash, foghorn) all pass. quay works headless. enemy.js was once corrupted by a python replace('') - be careful: never str.replace with empty old.
- NEXT: bosses.js (Bosun, Bathysphere/Mother), levels road/cannery/yard/causeway/abbey/nave/launch, then night shift/net, attract, hub, polish.
- [x] bosses.js (Bosun, Crane, Bathysphere+Mother, untested), levels road/cannery/yard written (untested beyond load). NEXT: causeway/abbey(lens puzzle, crypt dame solo)/nave/launch + ending, then tests 04_levels, night shift, attract, hub, polish, about.
- [x] levels causeway/abbey/nave/launch + launch.js written; tests 04_levels pass (all levels load, launch runs). index.js has launchDef; flow.js makeGame(def,o).
- NEXT: night shift (src/game/shift.js + src/net/local.js + lobby/card/results screens), attract.js, hub boot (session.js flow), bot-playthrough test, browser tests (hub harness, gamepad stub, phone), about content + exit-interview, docs/CONTENT.md, polish (loft/ladders if budget), final build.
- [x] shift.js (ShiftArea host/client/solo, ghosts, snapshots), net/local.js (LocalSession, BroadcastBus, RtcBus, fakeParty), screens/lobby.js (lobby, HubCard, Results, Board), attract.js (director+montages), boot.js (hub session flow + standalone). tests/node 01-05 pass (272).
- NEXT: browser tests (tests/browser/*.py: boot, hub harness, gamepad, phone, audio), whole-game bot playthrough test, about/exit-interview content, docs/CONTENT.md, visual polish pass (moods, HUD, case/shop at 4:3), loft+ladders if time, final build.
- [x] browser tests: tests/browser/boot.py (15 pass incl. phone/attract/pad), hub.py (2p, 4p lossy, host-leave, server all pass). NOTE: after e.step() engine is manual; set e.manual=false before awaiting transitions.
- NEXT: whole-game bot playthrough node test (botPlan for levels), visual polish check (screens at 1080p & 4:3, moods), local-party browser test, about/exit content, final build + test.mjs wiring of browser tests (--fast skips).
- [x] whole-game bot playthrough test passes (tests/node/06). Fixed big bugs: ease names in clips (NaN poses), recoil before ray, scripts not resuming after ClaimForm, lamps colliding. 
- NEXT: visual checks (shots/), wire browser tests into tools/test.mjs, about/exit-interview content, cleanup scratch, final build+report.
