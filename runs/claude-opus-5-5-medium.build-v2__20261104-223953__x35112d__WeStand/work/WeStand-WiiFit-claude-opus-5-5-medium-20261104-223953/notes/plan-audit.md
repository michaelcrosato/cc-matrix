# PLAN.md and TASK.md, section by section
Status: done, or done differently (with why). Evidence: the named test, or the file.

## PLAN.md
- 0 Reading rules, title in one constant: done (`TITLE` in games/fit/mod.rs; decisions in notes/decisions.md).
- 1 Genre, perspective, pillars, originality: done. script lint rejects Nintendo names and body talk (`content_is_complete`).
- 2 Boot menu, New Stay (4 slots, 40 names, 6 skins, 8 outfits), skippable intro (Back skips), day table, goals, minutes, both endings, Free Play: done (`the_bot_plays_new_stay_to_credits`).
- 3 Controls on pad, keys, mouse; Xbox swap; Options-with-Create ignored; engine keys off, F11 kept: done (input.rs, fit_link.rs; browser checks).
- 4 Balance Core, shaping, Puck at 340 px: done (`balance_core_feels_like_a_body`). The arm flail takes over from any held clip beyond 0.75, except in a dive, where leaning is the control.
- 5 All 11 events, common frame, Big Stand's 5 phases, Morning Check: done (`each_event_rewards...`, `the_big_stand...`, `better_input...`).
- 6 Clam, calendar, 32 titles, wardrobe, flip-flops, Yesterday You, absence comments, saves: done (`ghosts_draw...`, `saves_round_trip...`).
- 7 World and cast; Pip 80+, coaches 25+, guests about 8: done (`content_is_complete`). Marjorie has 8 lines per day; Tom and the Twins 8 each (the plan: per day where it matters).
- 8 Palette, view recipe, props, library generics (rowboat, bench, lamp, signpost, stall, fence, round table, chair), sway, particles, sunset lights, iris: done (`every_prop_the_game_names_loads`).
- 9 Clips made and used: done. All listed library clips are used. Tray Trek's FIT/CarryTray is Balance_Walk's legs with tray-holding arms, baked into one clip because the engine has one clip slot (tools/gen_clips.py).
- 10 Buses, events, sequencer with LFO pads, rhythm clock, buffer 1024, gamepad resume, 6 songs + stingers, 38 SFX, voices: done (pav_audio tests).
- 11 Route, fonts, rules, glyphs, screens, turntable, mouse ring, touch-only card, Dev Mode tabs and sliders: done. The Schedule is a carousel of pavilions, then events.
- 12 Attract: done (`attract_starts...`, browser).
- 13 Hub ghost mode, tags, order, JS block, ghosts, Play Together: done (tests/hub.py, `medley...`).
- 14 Architecture: all state in the sim. Files as the plan lists them, including intent.rs, medley.rs, attract.rs, weblink.rs and glyphs.rs; rules.rs added for the numbers, run.rs for the common frame, island.rs and menus.rs for the flow.
- 15 Traps: followed. Water grid and stage box added (decisions.md, feedback.md).
- Timings: `events_run_about_as_long_as_the_plan_says`. Idle wander and feel targets: `balance_core_feels_like_a_body`. Ghost area: `ghosts_match_by_area`.
- 16 Tests: core, browser, hub behind one command; a 1080p sheet per set in notes/sheets, clips in notes/clips-sheet.png. Prompts are tested through the Headless reading, `prompt()` and `__gamePrompts`.
- 17 Build order: followed. Nothing cut.
- 18 Finishing: exit interview, tools/build.sh, full run, 1080p look, chat report, caches deleted.

## TASK.md
- Title by a real RNG from 50: done (`secrets.randbelow`, 48 of 50).
- Single html named by the brief, in root: done.
- Dev subfolder with the same name: done.
- Engine base, art, animation, code-only audio, gibberish, music 10%: done.
- AI Hub and on its own: done. Dev mode from pause with sliders and reset: done. Attract: done.
- Controller-first, prompts by last device, Xbox option, not dense: done. Touch-only card, settings, attract: done.
- About/Credits with Source Information and all three feedback blocks: done (about-data in the page). Usage reads "added on import" as the brief says.
- exit-interview.json beside the html, parses, every field filled: done.
- PROGRESS.md: done.

## Cannot be done on this computer
A person playing it (feel, difficulty), a real pad, phone, TV, ears, a real GPU's speed.
