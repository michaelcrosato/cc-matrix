# Progress (Wii Stork)

Status: the plan is built and the full test command passes. Game file: ../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html (built by `node build.mjs` in the dev folder). Exit interview: ./exit-interview.json beside the game file (source copy in the dev folder, which build.mjs injects as G.ABOUT).

Dev folder: WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655/
- engine/ (handoff v0.89.0, one patch: Dialog shadow), vendor/, game/ (core, balance, rigs, ui, audio, data/, activities/, scenes/), build.mjs, tests/
- Tests: `node tests/run.mjs rules|play|browser|hub|all` prints failures and one count line. Last full run: 689 passed, 0 failed.
- Built: 12 activities (Stork Stand, Sun Flow, Quiet Candle, Squat Rail, Push-Up, Side Lunge, Step Class, Hoop Hips, Coastal Jog, Mount Posture Slalom, Tray Service, Laundry Line), tier 2s, five-day story, Body Check, island, Gentle Games and the Grand Stillness duel, ending, credits, free play, Class (2 to 4), AI Hub ghost round, attract, Dev Mode with Pose Viewer, About.
- Known deviations from the plan: rope Lean set eased (s 14, A 3.0, shorter spans with posts every 6 m) so that average play can finish; Stork tier 2 star thresholds .25/.5/.85.

## Section 18 checklist (checked against the build)
- [x] Title by the brief's RNG method ("Wii Stork"), shown on the title screen; single HTML with the brief's name in the work folder; dev files in the named subfolder
- [x] Original game: own cast, island, activities, songs, jokes; "Wii Fit" appears only in Source Information
- [x] Sports genre; per-activity views as section 1; built on the handoff engine (one change: Dialog shadow)
- [x] Engine-native art and mocap animation, plus drawn Tare, Gerald, Plate, props and hand-posed bodies
- [x] All audio in code, Animalese voices, music 10% by default (checked with analysers and OfflineAudioContext; nobody listened)
- [x] Hub harness passes at all five settings; game runs alone; local Class (second keyboard half tested in tests/half.mjs)
- [x] Demo shows every feature; designer data in game/data with a README
- [x] Dev Mode from the pause menu: tools, live sliders, reset, Pose Viewer (panel checked in a screenshot)
- [x] Attract at 10 s idle on title, free play and About; loops the whole playlist; any input exits; runs touch-only
- [x] Writing in the source's tone, 150+ lines
- [x] 10-foot, controller-first; hover moves focus; prompts follow the last device; Xbox glyph setting (stubbed pad)
- [x] Touch-only notice and Settings button, no touch controls
- [x] One test command (rules, play, half, browser, hub, all), failures and a count only; full scripted playthrough
- [x] No TODOs or placeholders (data lint)
- [x] Source Information, feedback in the chat reply and About; Usage "added on import"
- [x] exit-interview.json beside the HTML, parses
Deviations: the plan's Lean sets and star thresholds are now unchanged. The rope keeps the plan set (y axis calmed in the activity), with shorter spans and posts every 3 m; Stork tier 2 uses a smaller ring jump (.05) so the expert bot earns 2 stars.
