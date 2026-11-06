# PROGRESS (keep up to date; read this first after a context compaction)

Title: **Regrettable Evil 4** (RNG roll 36 of 50). Slug `regrettable-evil-4`.
Dev folder: `RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045/`
Deliverable: `RegrettableEvil4-ResidentEvil4-claude-opus-5-5-xhigh-20261105-162045.html` in the `work/` root, plus `exit-interview.json` in `work/` root.
Engine kit 0.46.0 (same as PLAN). Kit download in `work/.kit-download` (delete at the end). Engine sha256 80408b4c72ef08be…

## Plan milestones (PLAN.md §16)
- [x] 1 Skeleton
- [x] 2 Feel
- [x] 3 Crowd
- [x] 4 Case and shop
- [x] 5 Chapter 1
- [x] 6 Dev mode, attract
- [x] 7 Chapter 2
- [x] 8 Chapter 3
- [x] 9 Night Shift
- [x] 10 Polish
- [x] 11 Done list (§17)

## Notes
- (M1 in progress) Written so far: tools/{build,test,run-suite,apidoc}.mjs, src/config.js, src/core/{device,intent,save,glyphs,ui,app}.js, src/data/{tuning,about}.js, src/audio/{mix,voice,sfx}.js, src/models/{humans,weapons,props,icons,index}.js. `node check.mjs --sheets src/models/index.js --out .scratch/sheets` draws models. tools/apidoc.mjs prints API.md sections by name.
- Clips (src/data/clips.js), actor (src/game/actor.js), data (weapons, items, shop), caseModel, run, loot, maps + mapPaint written and tested (tests/node/case.mjs, maps.mjs). Next: world.js, levelBuild.js, enemy/player/combat/director/interact/hud/area.
- combat.js, enemy.js, player.js written (not yet run). Next: director, interact, fx (particles, projectiles), hud, qte, cutscene, beats, companion, area, levels data, then first browser look.
- Screens written: pause, settings, about, denied, form, telegraph, case, shop. Data: dialogue, notes, songs(10), portraits. companion.js done. Next: dev.js, title.js, attract.js, main.js, level data (quay first, then stubs), then first browser capture; tools/capture.py.
- First browser capture OK (quay arrival looks good). main.js, title, quay + siege data, dev.js, capture tool exist. STUBS still to replace: road/cannery/yard/causeway/abbey/nave levels, launch.js, ending.js, attract.js, lobby.js (+ card, net/local.js, net/shift.js). Writing bot.js next.
- Bot works on quay (siege survivable). Dev URL flags: ?g_area=x&g_nosave=1&g_bot=1&g_cheat=1&g_start=c,r&g_skip=beat,beat&g_flags=a,b&g_dame=1. Capture: python3 tools/capture.py out.png "?flags" --frames 240,600. Debug scripts in .scratch/ (playquay.mjs, dbg.mjs).
- Written: road, cannery (+setpieces/belt.js), yard (+bosses/bosun.js), bot plans for them. Not yet run. Next: causeway, abbey(+crypt), nave(+bathysphere), launch, ending, attract, night shift.
- road, cannery run through bot to the end; yard: bot sometimes loses to Bosun (tune later). .scratch/playall.mjs <area> <minutes> --only --quiet [--dame] [--cheat] runs bot on an area. Now writing causeway, abbey (+crypt), nave (+bathysphere), launch+ending, then attract, night shift, tests, polish.
- Written (first pass, needs debugging with .scratch/playall.mjs): causeway, abbey + setpieces/crypt.js, nave + bosses/bathysphere.js (Mother too), launch + ending entry, screens/credits.js. Then still to do: attract.js, lobby.js + card + net/local.js + net/shift.js, real tests (tests/node, tests/browser), balance, polish, about.js answers, docs/CONTENT.md, cleanup (.kit-download, .scratch).
- Bot full-run status: quay ok, road ok-ish (10 deaths), cannery ok, yard bot loses to Bosun: tuning. Fixed: run snapshot deep copy, beat resume at checkpoints (beatPos), Dame no body, ragdoll freeze, parcel safety net.
- Bosun tuned (crane dwells over zones). Now writing Night Shift: src/net/local.js, src/net/shift.js, src/screens/lobby.js, src/screens/card.js, src/data/levels/shift.js. Then attract.js. Then tests.
- Night Shift written: net/local.js, net/shift.js, screens/card.js, screens/lobby.js, levels/shift.js. Hub harness 2 players PASS (tests/browser/hub.py). Bot reached abbey crypt in full run. Writing attract.js next; then browser tests, node tests, balance, polish.
- attract.js done + test passes. Writing test suites now: tests/node/{data,systems,ai,setpieces,replay,coop,playthrough,levels}.mjs, tests/browser/{boot,input,touch,audio,dev,about,party,nowebgpu}.py. hub.py exists.
- Node suites done & green: case, maps, data, systems, ai, setpieces, attract. Hub harness all 4 scenarios PASS. Full campaign bot running (.scratch/full2.log). Next: visual review of screens; tests: replay, coop, playthrough, levels (node), boot,input,touch,audio,dev,about,party,nowebgpu (browser); polish: skip prompt clip, moods check, HUD; about.js answers; docs/CONTENT.md; cleanup.
- Node suites green also: levels, coop, replay. To do: tests/node/playthrough.mjs; browser suites boot,input,touch,audio,dev,about,party,nowebgpu; balance; polish; about answers; CONTENT.md; cleanup.
- Fixed real bug: Esc/Tab press opened and closed a screen in the same frame (app.updateTop + justOpened). Browser suites dev (29), input (36) pass. Running boot, touch, audio, party, nowebgpu next.
- ALL browser suites pass: boot 16, input 36, touch 9, audio 10, dev 29, party 16, nowebgpu 2, hub 8. docs/CONTENT.md written. Full campaign running in background -> .scratch/full3.log. To do: tests/node/playthrough.mjs; moods visual check (rain, abbey, dawn), animation sanity via captures; balance; about.js answers; cleanup (.kit-download, .scratch, dist, node_modules?, check/).
- Plan-gap fixes in progress: head pop instant kill, bolt pickup, netwife in campaign, DAME TAKEN gauge, Bosun cover break, boat fire, dev tuning load on open, ShieldBlock clip, plastic bark, Mother spit lunge, landing squash, CLICK TO AIM position, 4:3 check. Then playthrough test, about answers, cleanup.
- Plan-gap fixes applied (head pop, bolts, netwife, DAME TAKEN, cover break, boat fire, dev tuning, etc). Continue tops up HP to 60%. Bot playthrough reaches abbey (tests/node/playthrough.mjs, --verbose prints balance). Debugging crypt for bot. Remaining: bot through nave+launch; about.js answers; final test run; cleanup (.kit-download, .scratch, dist, check, kit-docs? keep vendor); final reply.
- PLAYTHROUGH PASSES (tests/node/playthrough.mjs): bot Arrival to credits, Standard, no cheats: 10 deaths (quay 1, road 5, yard 1, nave 3), sim ~2200 s+. Balance changes: retry parcels on Continue (from 2nd retry +12..36 rounds, 3rd +samphire, cover +10% per retry), steam jet once per blast, stomp cooldown 4 s after landing, charge overrun, boss shuffles off anyone under him, valves and hatch drop supplies, Mother's limpets hunt only (cap 4, 2 per brood), checkpoint after crypt. Remaining: delete src/game/{launch,ending}.js stubs; about.js answers; moods check (dawn, moon, cold, crypt, yard); full test; cleanup; final reply.
- about.js answers written; dawn sky, hull, hair polish done; stubs deleted. Running full tests next; then cleanup + final reply.
- Playthrough now at plan limits: deaths by chapter {1:2, 2:1, 3:2}, stuck limit 60 s. Bot sidesteps thrown things, spends leftover money. Card key listener; hub ready stays after first frame (20 s harness window can be tight under heavy machine load). Remaining: full test run; cleanup (.kit-download, .scratch, check, dist); final reply.
- DONE. Full test 2004 passed, 0 failed; playthrough deaths by chapter {1:2, 2:1, 3:2}. Cleaned .scratch, check, dist, .kit-download; node_modules kept (boot suite needs it for check.mjs). Deliverable html + exit-interview.json in work root.
- Final-checklist pass on the final build: captures of every mood, title, Case, map, Shop, pause, settings, dev, About and Denied at 1920x1080 and 4:3 reviewed. Fixed from them: CLICK TO AIM collided with the hint bar, radio panel hid the vitals, dimmed menus hard to read (solid column in ui.dim). Full test 2004 passed, 0 failed.
- Last pass (About and touch evidence): new suites tests/browser/about.py (all 5 pages at 1920x1080 and 4:3 against exit-interview.json) and fit.py (no HUD text off screen, all areas at 4:3). Fixed: portrait phone/tablet title, required panel, Settings (stacked rows, tab arrows, tappable BACK, tap sets slider), attract overlay and HUD on narrow screens, subtitle/hint/radio/cutscene overflow or truncation at 4:3.
- FINAL: full test 2124 passed, 0 failed on the delivered build. Playthrough deaths by chapter {1:2, 2:1, 3:2}. Hub 4/4 scenarios passed with no retries at load 41-47. Temp files removed; node_modules kept (boot suite needs it).
- Definitive checklist pass found: Cold Room never used its cold mood (wired, tested), hint bar covered the tide timer (hints now sit below bars), held aim slowly tumbled Max because the lean added up each frame (fixed, failing test first in systems.mjs). Rerun full suite and recapture on the rebuilt file.
- FINAL (html c085743e664dae75f84fec35): full test 2138 passed, 0 failed. Playthrough deaths by chapter {1:2, 2:1, 3:2}. Hub 4/4 with no retries at load 32-34. All 9 moods plus yard and nave, Case, Shop, menu, all About pages captured at 1920x1080 and 4:3 on this file with moods read back. Temp files removed.
- All "before finishing" captures viewed from the delivered file, html c085743e664dae75f84fec35, unchanged before and after: 9 moods, Case, Shop, menu, all About pages, at 1920x1080 and 4:3. No new problems. DONE.
- Hub suite: retries removed. Each scenario runs once after a bounded wait for load under 50; a failure reports its load. Game file unchanged.
- Final full run of the finished test command on the delivered file: see final reply. Temp files removed.
- Section-by-section audit of PLAN.md against the code. Script, Tannoy lines, barks, clips (MotherSpit is procedural: her model isn't on the hero rig), songs, sounds, voices, models, 24 sliders, all 8 maps, weapon and enemy tables, hub metas and session.js all match. Fixed from it: left click advances dialogue, radio dims the world with both portraits, Dame's bar under Max's, Bosun's chain springs, long gun on the launch, flares kill the whole brood (hook was never called), Congregation in the Hymn.
- FINAL (html a3c0f68f121c7abb0dcdf753): full test 2149 passed, 0 failed, no retries in any suite. Deaths by chapter {1:2, 2:1, 3:2}. All 9 moods, Case, Shop, menu, all About pages at 1920x1080 and 4:3, radio and Bosun captured and viewed from this file. PLAN.md audited section by section. Temp files removed.
- FINAL (html f54da7a0c18aba92d7ebd398): full test passed in final form, no retries. Coverage-driven plan suite added (tests/node/plan.mjs), second campaign seed (playthrough2), every screen tab (fit.py). Fixed from audit and coverage: flare hook, left click on dialogue, radio dim and portraits, Dame's bar, Bosun chain and plan numbers, long gun on launch, Dame sits out the final boss, leftover monks cleared at the hatch, statues close nav, slow motion reset per area, lobby text at 4:3, MotherSpit as a data clip. Temp files removed.
- Coverage pass: tools/coverage.mjs lists functions no test runs, across Node and browser. New: tests/browser/paths.py (Continue, Case place/drop, every dev tool, Settings rows, pointer-lock pause, credits, solo pause, invite codes through the real overlay, guest and host leaving), more in plan.mjs and coop.mjs, more seeds. Real bugs fixed: limpets raised their own host instantly; shattered Nave columns left an invisible wall; invite button off screen at small windows; attract's crypt clip stood still. Bot stalls fixed: flee with no route, weapon-swap loop, unreachable drops.
- FINAL (html 8d65e6c399b9362c376b4fd7): full test 2467 passed, 0 failed, no retries. Coverage: at most 50 of 1,414 named functions run nowhere (stubs and over-reported names). Six seeds reach the credits; deaths 3, 1, 10, 2, 7, 4; seeds 23 and 3 over the limit in chapter 2. All screens viewed on this file. Temp files removed.

## Final freeze: file 3def32a276046b1b24c68c86
Last round, all found by reading the bot's outliers:
- Real game bugs: the Loot Director ignored ammo already on the floor (8 piles, 96 rounds in one fight); now counted at half, low line 2 mags. The hatch could wait for ever with every gun empty and nobody left to drop anything; now a parcel after 8 s (`Area.stepEmptyNet`, tested in plan.mjs).
- Bot bugs: reloading into a pillar (pinned 20 s); stopping one column short of the crypt trigger; standing still on a cell the grid calls blocked; spending every coin on .38; firing at the Bosun off target.
Results on this file: `node tools/test.mjs` 2480 passed, 0 failed. Hub 5 of 5, no retries, load 11 to 21. Coverage: at most 53 of 1418 named functions run nowhere.
18 seeds: all reach the credits, longest stand-still 33.5 s, deaths 0 to 8 (median 2). 14 inside 3 a chapter, including main seed 7 (0 deaths) and seeds 23, 19, 3 (enforced by playthrough2). Over: 31 (ch1 6), 6 (ch2 5), 11 (ch2 4), 29 (ch2 4). The over-limit deaths read as ordinary fights, no pin or stall; small code changes reshuffle which seeds go over.
Every screen captured from this file and viewed, 1920x1080 and 1024x768, phones and tablet. No human playtest.

## After review: bot outliers read again, balance measured
Objection: 4 of 18 seeds over the limit, balance aim only judged. Reading the seeds again found more real faults, so "ordinary fights" was premature.
Game: the Siege zone overlapped the cottage door approach (now east edge col 36); the Yard's north gate stayed open all through the Bosun fight, so she could walk out of the map (`closeGate`, shut behind him, opened at his death); the Quay's placed .38 boxes halved.
Bot: the Yard's crew now get full crowd craft; anchor dodge first; herbs and a box before guns; no harpoon; stock capped at 2.5 mags; chests get 30 s and a second look after the Siege; no fleeing a sagging boss; finds a clear firing spot at the hatch by results.
Tests: `BalanceBook` in tests/helpers.mjs, enforced in playthrough and playthrough2; `outOfMap`; gate test in plan.mjs.
48 seeds: all reach the credits, longest stand-still 32.5 s, deaths 0 to 6, median 2. 47 inside 3 a chapter (seed 43 has 4, winch defence). Balance 140 of 144 chapter ends pass; 4 slightly rich, all chapter 1 (seeds 3, 22, 30, 48).

## Final file: f2f6229e6bd3dcf0db145db8
`node tools/test.mjs` 2527 passed, 0 failed. Hub 5 of 5, no retries, load 11 to 22. Coverage: at most 50 of 1,422 named functions run nowhere. Every screen captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet. Six seeds replayed on this code match the 48-seed table exactly. Main seed: 2 deaths; rounds left/fired 58/74, 73/207, 51/257; money earned/shop asks 2936/3400, 6866/11700, 2675/16050. No human playtest.

## Second review: the after-the-fact allowance removed
Objection: 1 seed over, 4 of 144 rich, an allowance set after seeing results. Found: `app.shopStock` was never defined, so the bot had been buying goods not on the shelf (shells in chapter 1). Now `shopStock(run)`, shared with the shop screen, tested in plan.mjs. Crane release moved ahead of the crew fight; a shop box counted as two pickups in the stock cap.
Allowance removed: playthrough2 holds seeds 23, 19, 3 to every balance rule, as playthrough does seed 7.
60 seeds on this code: all reach the credits, none over 3 deaths in a chapter, deaths 0 to 7 (median 2), longest stand-still 38.5 s, never out of the map. Balance 179 of 180 chapter ends pass; seed 22 ends chapter 1 with 66 rounds after firing 44 (40 kills, mostly kicks). The rules are my reading of "some but not plenty", which the plan doesn't define. No human playtest.

## Final file: 8a8da0941ceae80dac9736f1
`node tools/test.mjs` 2543 passed, 0 failed. Hub 5 of 5, no retries, load 14 to 21. Coverage: at most 52 of 1,423 named functions run nowhere. Every screen captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet. Temp files removed.

## Third review: PLAN.md read again, line by line, against the code
STAGE.md, TASK.md and PLAN.md reread. Scripted comparison (temp, removed after): script lines 57/57, Tannoy/bark/radio/card lines 51/51, weapon table, enemy table, items and prices, 61 clips, songs and tempos, 36 sfx, 8 voices, 24 sliders, 70 files of the layout, 74 models, 6 Fathoms, 15 Tannoys, 6 notes, every item, treasure and enemy obtainable, hub metas, exit-interview values, guardrail names absent. 114 of 116 behaviour probes found at once; the other two read by hand.
Gaps found and fixed: Harpooner had no red glint; thrown arcs had no landing marker; all Islander bands were bright; no telegraph in the Cannery's north corridor; launch logic and per-type enemy code weren't where the plan's layout puts them (moved: main seed numbers identical before and after).
Real bug found through low-pay seeds: the West Gate's exit zone covered floor in front of the shut gate, so walking up to it ended chapter 1 at any time, before the Siege. Now needs the Foghorn; tested. The other exits were already guarded.
Bot: leads the Bosun under the pallet; sweeps supplies before the winch; one stock rule per chapter, empties the purse at the Armoury.
72 seeds on the final code: all reach the credits, longest stand-still 46 s, never out of the map, deaths 0 to 7, median 2. 68 inside 3 a chapter; seeds 9, 14, 15, 71 have 4 in one chapter. Balance 215 of 216 chapter ends; seed 26 ends chapter 1 with 53 rounds after firing 51. Rules are my reading of "some but not plenty". No human playtest.

## Final file: 4173ead3c11a26533f5effbe
`node tools/test.mjs` 2553 passed, 0 failed. Hub 5 of 5, no retries, load 11 to 20. Coverage: at most 53 of 1,429 named functions run nowhere. Every screen captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet, plus close-ups of the glint, the landing ring, the corridor telegraph and the two bands. Temp files removed.

## Fourth review: the limit met on every seed measured
Objection: 4 of 72 seeds over, one balance miss. Reading them found more real faults:
Game: the plan's rank never moved the wave interval (now run.waveInterval: x1.4 at rank 1, x0.8 at rank 4+; winch, Bosun crew, spawn gaps). Two 18-cell pens in the Quay's drying yard were sealed by racks; the bare-map reachability test couldn't see it (racks moved, levels.mjs now checks every open cell with props in place). The saw dodge could carry Max through a rack (dodgeSpot checks clearance with rays across her body). Continue help counts deaths this chapter, not only this checkpoint's retries; after three deaths in a chapter, full cover and Assisted's damage and saw until the chapter ends (run.mercy, my addition). Floor ammo counts at 0.75.
Bot: skips pre-Siege errands once the Siege is on; steps off blocked cells only where it physically fits.
126 seeds on the final game code (102 used for tuning, 24 never played before the last check): all reach the credits, none over 3 deaths in a chapter, deaths 0 to 7, median 2, longest stand-still 40 s, never out of the map. Balance: all 378 chapter ends pass. Rules are my reading of "some but not plenty". No human playtest.

## Final file: 1418496a974d3f46ecf09110
`node tools/test.mjs` 2571 passed, 0 failed. Hub 5 of 5, no retries, load 13 to 20. Coverage: at most 52 of 1,437 named functions run nowhere. Every screen captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet, plus close-ups of the glint, landing ring, corridor telegraph, two bands and the drying yard. Temp files removed.

## Plan check made permanent
tests/node/plancheck.mjs reads PLAN.md's text and compares it with the code (66 checks): script, tables, every map command, moods, clips, songs, sliders, layout, engine hash, hub tags, exit interview. docs/PLAN-CHECK.md maps every section to where it lives and which suite checks it, and lists the judgment calls. Game file unchanged: 1418496a974d3f46ecf09110.

## Fifth review: every section read clause by clause
Objection: the easing rule wasn't in the plan, and the match with the plan hadn't been shown. Removed the rule (no help tied to a death count). Continue help stays per checkpoint. Standard's DAMAGE TAKEN slider ships at 0.8: the plan gives it no first value and says to balance numbers with the bot.
Found and fixed in this pass, reading prose the table checks can't see:
- Game crash: an enemy winding up as Max stepped into a dry room hit a stand-in target (`T.hurt is not a function`), found on seed 17. Ledge throwers also bombed their own feet then.
- Limpets froze for ever on a body lying on the wagon or a ledge, and the bot waited on them (seed 16, 81 s). They now ignore bodies off the floor.
- Net-Wife hits for 0 cancelled reloads and held a token: a 73-minute stalemate on seed 43. She now circles and throws.
- Bosun: sacs glow only when exposed, burst sacs become torn flaps, the anchor lies where it lands and its chain drags it back over 2 s, a harpoon through the chain (not the body) adds 3 s.
- Bathysphere: valves glow red, burst valves leave stubs, broken locks vanish, Steam Jet reaches 6 m, the hatch prompt is a Kick.
Compared with the code and matching: 1, 3, 4.1-4.13, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17. One reading to note: `combat` is "layered in when alerted", but the engine plays one song at a time and §10 describes fading between them, so it fades in over 0.5 s.

Later in the same review, by reading traces of every run that went wrong rather than tuning:
- Touching any enemy froze Max in every direction (engine CharacterController with a kinematic capsule against it). Found by testing it directly after the bot looked pinned. Fixed with a query filter and Player.blockByBodies; tested from four sides at four distances. This was the largest single cause of deaths: with it fixed the damage cut shrank from 0.65-0.75 to 0.85.
- Bathysphere could sag facing a wall with the locks out of reach: he now turns to Max. Causeway had no edge: body-only wall round every map, permanent test (first try also stopped bullets and broke the launch; the seeds caught it at once). Wagon fixed; Brine Barrel moved; Player.stepUnjam for crevices.
- Bot faults found the same way, several after my own fixes: never fired with the laser on a target near a wall; no step back at point blank; swapped guns against its own picker (26 seeds stuck until fixed); paced between two pickups for ever; walked to the hatch through a beating; backed into walls without limit. Added an idle measure to the seed runner so this class of fault shows.

Final measurement, on the final game code, Standard, no cheats, seeds 1 to 240, DAMAGE TAKEN 0.85: all reach the credits; longest stand-still 45 s; never out of the map; deaths 0 to 6, median 1; 238 within 3 a chapter, seeds 143 (chapter 2) and 224 (chapter 1) at 4. Balance 719 of 720 chapter ends; seed 108 leaves 65 rounds against 63 fired in chapter 1. Comparison: 1.0 had 5 of 240 over, 0.8 had 1. Tuning stopped there.

## Final file: 13c7d4fc72719c1c0502f17c
Source rebuilds to the identical file. `node tools/test.mjs` 2703 passed, 0 failed. Hub 5 of 5, no retries, load 6 to 11. Coverage: at most 53 of 1,448 named functions run nowhere. Every screen captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet, plus close-ups of the sacs, valves, locks, anchor chain and wagon. Temp files removed.

## Sixth review: damage back to 1, more real faults
Objection: 2 of 240 over the limit, a balance miss, damage still trimmed. Traced the over-limit seeds again rather than tuning. Found and fixed:
- The Mother was stepped twice a frame: a glob every 1.43 s against the written 2.4 to 3.4. Measured in a test now.
- Hits chained: 0.55 s of grace let two runners take her from 72 to 0 in 3.4 s. Now 1 s (MOVE.hitGrace).
- A hit cancelled any reload (my addition; the plan never says so), so a 2.4 s pump could never finish against a flail. Removed.
- Enemies could walk into her body (only her side was blocked); solid both ways now. Bot's step back went through whoever was on her; fires when the laser is on anyone.
- The Mother has her own checkpoint and 48 rounds in the locker. Quay's .38 boxes hold 4.
With those, trimming stopped helping (240 seeds: 1.0 had 2 over, 0.9 had 3, 0.85 had 3), so DAMAGE TAKEN ships at 1.
Final measure on this code, Standard, no cheats, seeds 1 to 400: all reach the credits; longest stand-still 45 s; never out of the map; deaths 0 to 6, median 1; 396 within 3 a chapter; seeds 36 (5), 105, 283, 365 (4) over. Balance 1199 of 1200 chapter ends; seed 357 chapter 1 paid 736 against 900. Worst standing under attack: seed 320, 39.5 s, cornered by the Bosun in the door alcove (under the 60 s limit, left as it is).

## Final file: 3b61c36c9c676e55e476c5ed
Source rebuilds to the identical file. `node tools/test.mjs` 2710 passed, 0 failed. Hub 5 of 5, no retries, load 8 to 12. Coverage: at most 53 of 1,449 named functions run nowhere. Screens captured from this file and viewed at 1920x1080 and 1024x768, phone and tablet, with close-ups of the sacs, anchor chain and valves. Temp files removed.

## How this build ended. Final file: 01ba494c49f75ad659e49a7a
The owner ended the build. Tuning stopped, and the plan's death limit and my balance rules stopped being requirements: balance is for human players to judge with the dev sliders.
Since 3b61c36c:
- Kept: the West Gate exit is now the gate's own cells, so walking past along the wall no longer ends chapter 1 (real bug, tested). Bot: mixes herbs, leaves the anchor's ring directly and doesn't flip direction during a throw.
- Undone: the First-Aid Tin on repeat tries at a checkpoint, made only to lower deaths. DAMAGE TAKEN is 1. Later experiments (0.8, half aim noise, a West Gate pickup guard) are gone too; the last 0.8 seed run was stopped and its results are not used.
- `node tools/test.mjs` ran once on this file: 2711 passed, 0 failed. No check had to change: the limits in the playthrough suites still run on their four seeds, and they passed.
- Numbers already in hand, none of them from this exact file: 400 seeds at damage 1.0 on code that still had the Tin: all reached the credits, longest stand-still 45 s, never out of the map, deaths 0 to 6, median 2, 394 within 3 a chapter, 6 reached 4, 1200 of 1200 chapter ends met my balance rules. The same 400 seeds on 3b61c36c, with no Tin, before the bot changes and the gate fix: all reached the credits, longest stand-still 45 s, deaths 0 to 6, median 1, 396 within 3 a chapter, 4 went over, 1199 of 1200 chapter ends.
- Not done on this file: the hub repeats (the test command runs the hub once), the coverage run and the screen captures. Screens were last viewed on 3b61c36c; since then only About's text, the bot, the gate's exit and the Tin changed.
