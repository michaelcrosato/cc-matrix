# PLAN.md, section by section

What each section asks for, where it is, and how it was checked. All paths are from the dev folder; `fit/` means `engine/crates/pav_core/src/games/fit/`, and `tests/fit.rs` means `engine/crates/pav_core/tests/fit.rs`.

Marks: **test** means a test in `tests/run.sh all` checks it. **looked** means I looked at a 1080p capture. **read** means I read the code or data and it does what the plan says, but no test pins it.

Differences from the plan are listed at the end. So is what could not be checked on this computer.

## 0. How to read this plan
- Brief wins on names and hand-ins; the title is one constant (`fit/mod.rs` `TITLE`). read
- Gaps decided and written down: `notes/decisions.md`. read

## 1. The game in one page
- No Nintendo names in the game's text, no body, weight or diet talk: `script.toml` searched, none. The one mention of calories is the plan's own tone anchor. test (`the_script_is_long_enough_and_has_no_placeholders`)
- A New Stay shows every feature and ends in Free Play. test (`the_bot_plays_new_stay_to_credits`, `both_endings_roll_credits_and_open_free_play`)

## 2. Structure of play
- Title menu of four: `fit/screens.rs` `Flow::Title`. test (browser)
- 4 slots, 40 names, 6 skins, 8 outfits: `names` in `script.toml`, `SKINS`, `OUTFITS` in `fit/meta.rs`. read
- Skippable intro. test (`the_intro_can_be_skipped`)
- Day table and minute goals 3, 5, 7, 9: `[flow]` in `rules.toml`, `PAVILIONS` in `fit/island.rs`. test (bot plays all five days)
- Minutes: 1 + stars on the day's first clear, 1 on repeats: `fit/flow.rs` `bank`. read
- Endings, rowboat, credits, Free Play: test (`both_endings_roll_credits_and_open_free_play`)
- The bot plays the whole flow, menus included. test

## 3. Controls
- Keyboard table: `Bindings::fit` in `pav_app/src/input.rs`. test (browser: keys move focus, confirm, back, lean ramp)
- Pad layout, Options ignored while Create is held, stick shaping. test (browser with the stub pad), read for Create
- Mouse: focus by hover, click activates, cursor is the lean. test (browser)
- Engine's keys off except F11: `app.rs:833`. read
- Xbox glyphs. test (browser, `prompts_follow_the_device_and_the_glyph_setting`)

## 4. The Balance Core
- The struct and formula, numbers from the plan: `fit/core.rs`, `[core]` in `rules.toml`. test (`balance_core_feel`: settle, tip after `tip_time`, held lean doesn't tip)
- Input shaping: deadzone 0.12, curve 1.5, key rates 1.6 and 1.2, mouse 0.38. test (browser; it lives in `pav_app`, which the `core` tests don't reach)
- Figure tilts about the feet, arm flail past 0.75, stumble on a tip: `lean_figure`, `events/mod.rs:292`, `:245`. read
- Puck at 340 px, top or bottom per event. looked

## 5. Events
All 11 and the Big Stand are in `fit/events/` and `fit/finale.rs`.
- Common frame: card, 3-2-1, play, result, stars at 400/650/850, title, minutes, best, Yesterday You: `fit/run.rs`, `fit/screens.rs`. test, looked
- Every event: rules section, bot at 2 stars or more, idle under 1 star, card. test (`every_event_has_a_card_rules_and_a_bot`, `each_event_bot_earns_two_stars_on_five_seeds`, `each_event_idle_earns_under_a_star`)
- Ghost lane: `EventKind::lane`. Attract segment: `ATTRACT` in `fit/attract.rs`. test
- Scenes `fit/event/<name>`. test
- Breath Bloom: 5 cycles, ring 0.35, lotus and rising pentatonic chime. read, looked
- Pose Parade: six named poses, Day 1 the first three, Posey beside you, shrinking drifting ring, streak x1 to x4, the gull at 12 s of pose 2. read, looked
- Tempo Squats: 10 reps, band, rep bell, wobble per rep, "Also eleven". read, looked
- Plank Standoff: score is seconds of 60, **stars at 25, 40, 55 s**, tremble at 30, Kettle's joke shakes the picture at 45. test (`plank_stars_come_at_25_40_and_55_seconds`; the bot holds 45 s on five seeds)
- Step Party: 96 BPM, windows 55 and 120 ms, doubles, Bounce on the beat, guests clap, rhythm clock. test (`step_partys_song_starts_on_the_first_tick_of_play`, browser clock check)
- Floatie Spin: band 6 to 9, Switch! every 15 s, catches within 0.25 s, 7 rings. read, looked
- Morning Lap: pace zone 1.6 to 2.4, stitch, pacer, 1.2 m dodge, crabs, sunbathers, towels, ribbons, flip-flops, per-tick yaw. read, looked
- Tide Table: 3, 5, 7 shells, moving pool, bumpers, rising tide, skipping, 2D physics, tilt 62. read, looked
- Paddle Slalom: gates, gusts as streaks, 2 s remount, +2 s per miss, the plan's score formula, wake, tilt 22 distance 10. read, looked
- Tray Trek: 5 glasses, waves, plank gaps, gulls, Marjorie. read, looked. Scoring differs; see below
- Cannonball Cup: 1.2 s bounce, 3 presses then the leap, tuck, cards "6.5", "7", "See me", side view, `BigSplash`. read, looked
- Big Stand: five phases, fake prompt at 15 s, Inner Peace, Pip's last line, age minus score/100. test (bot), read

## 5, Morning Wobble Check
- Four tests with the plan's numbers, nudge at 5 s, Eyes Closed tone and rumble, Step Test at 100 BPM: `fit/check.rs`, `[check]`. test (`better_input_gives_a_lower_age_and_bounds_hold`)
- Age formula, slot roll, sparkline of five dots, comment by change and by worst metric, posture slump. read, looked

## 6. Meta systems
- Clam, Calendar with real days in Free Play, 32 titles. test (`script` test for the count), read
- Wardrobe by minutes, without `cape`. test (`the_wardrobe_unlocks_with_minutes`)
- 5 flip-flops, Golden reward. test (`flip_flops_go_to_tom_for_a_golden_reward`)
- Yesterday You from Day 3. test (`yesterday_you_appears_from_day_three`)
- Absence comments, date passed in as data. test (`pip_counts_the_days_you_were_away`)
- Versioned save in `localStorage`. test (`saves_round_trip_with_a_version`, browser reload says Continue)

## 7. World, cast and writing
- Island: reception, ring path, four pavilions, cabanas, pier, tower, channel, palms, grass, circling gulls: `sets/hub.toml`. looked
- Pip, Posey, Kettle (`AttachKind::Handle`), Bounce, Marjorie, Tom (head towel and waist towel), Twins: looks in `tools/make_sets.py`. looked
- **Commodore Gull: body and two wings, rotated in code, on the island and all four lagoon sets.** test (`the_commodore_is_three_entities_and_his_wings_move`), looked
- Line counts: Pip 135 (asked 80), Posey 31, Kettle 33, Bounce 26, Gull 41 (asked 25), Marjorie 26, Tom 26, Twins 18 (asked about 8). test
- All the plan's tone anchors are in `script.toml`, checked one by one. 118 letters at most in a dialogue line. test for the length
- Voices type out; Action completes, then advances; Text Speed. read

## 8. Art direction
- Base `[view]` on every set, varied in sky, sun and warmth; fog distances also vary. test (`every_set_has_someone_in_it_and_the_plans_dressing` for the recipe)
- Every prop on the plan's list exists; each library prop is placed. test (`every_clip_and_prop_the_plan_names_exists`)
- Dressing: grass, swaying fronds, confetti, **bubbles in the studio and the tide**, point lights on the bay's rafts, **cast figures in every set, now including the tower**. test, looked

## 9. Animation
- Every clip on the plan's list exists; all 25 FIT clips are used. test, read
- Pushup and Balance_Walk are used through the clips built from them, as the plan asks: `FIT/Plank` and `FIT/TrayWalk` (`tools/make_clips.py:58,80`). read

## 10. Audio
- Buses, defaults 10/80/80. test (`music_at_ten_percent_is_a_tenth_of_full_scale`, browser level, `settings_default_music_to_ten_percent`)
- Six songs plus stingers. **Every song is non-silent.** test (`every_song_makes_noise`)
- 43 sounds, **each with a caller in the game**, and each non-silent. test (`every_sound_in_the_bank_is_played_somewhere`, `every_sound_in_the_bank_makes_noise`)
- Formant voices, speakers differ. test (`speakers_differ`)
- Rhythm clock, offset 0.10, `BufferSize::Fixed(1024)`, resume on pad activity. test for the clock, read for the rest

## 11. UI and UX
- Fonts embedded and credited; body at least 34 px, titles at least 64 px, enforced in the draw helper. test (`every_screen_keeps_the_text_size_rule`)
- One `prompt(action, device, xbox)` in `pav_ui/src/glyphs.rs`, painted glyphs, cursor hidden on the pad. test for prompts, read for the cursor
- All screens in the table exist. **The Schedule is a carousel of pavilions, then events, with stars.** test (`the_schedule_is_a_carousel_of_pavilions_then_events`), looked
- Settings list in full, reset with confirm. test, read
- About as pages: looked at all of them at 1080p from `file://`
- **The pointer's highlight ring within 1.2 m;** click walks by `NavGrid::path`, then interacts. test (`the_pointer_rings_the_thing_under_it`, `walking_clicking_talking_and_waving_on_the_island`)
- Touch-only card, attract behind it, Settings by tap, the fallback message that says both things. test (browser: Pixel 7, Galaxy Tab S4, WebKit iPhone)
- Dev Mode: Jump, Cheats, Time, Tuning, View, Save. Each toggle has a real effect. test (`dev_sliders_change_values_and_reset`, `dev_jump_lands_where_it_says`, `dev_holds_the_world_and_steps_a_tick`), read for the View tab

## 12. Attract mode
- 600 ticks idle, order per the plan plus two (below), demo, nothing saved, any input exits. test (`attract_starts_cycles_exits_and_saves_nothing`, browser)

## 13. Multiplayer
- Tags, head order, the client byte for byte. test (`tests/hub.py`)
- The plan's JS block, line for line, apart from the two differences below.
- Harness at 2 players, at 3 and 4 with latency 150, jitter 50, loss 5, and with the host leaving. test
- In a session: straight into the round, Pause is Resume and Settings only, no dev mode: `fit/screens.rs`. test (`hub_status_is_what_the_page_reads`), read
- **Ghosts match by area,** in Medley order on every copy. test (`ghosts_match_by_area`)
- Solo check. test. Play Together with ghosts and a podium. test

## 14. Architecture
- The plan's tree, including **`intent.rs`, `attract.rs` and `glyphs.rs`**. `flow.rs`, `screens.rs`, `run.rs`, `rules.rs`, `script.rs`, `island.rs`, `bot.rs`, `world.rs` and `menus.rs` are added beside it.
- The change table: every row was made; `notes/engine.diff` shows them against commit 49ef2ba.
- About text in `about-data` in the page's head, plain text. test

## 15. Verified facts and traps
Used as written. Measured here on a shared machine, the browser ran far slower than its table, so tests have a `?fast=1` switch and waits that follow ticks.

## 16. Testing
- `tests/run.sh [core|browser|hub|all]` prints failures and one count. Every item in the plan's three lists has a test above. The result is in `notes/last_test_run.txt`.
- One 1080p capture of each of the nine sets, looked at, with these sets and props.

## 17. Build order
Followed. Nothing was cut; all 11 events shipped.

## 18. Finishing
- Exit interview parses and has the plan's `aiHub` values. Build, tests on the final page, one look from `file://`, caches removed. See `notes/last_test_run.txt`.

---

## Where this differs from the plan
Each is in `notes/decisions.md`.

1. **The hub's ready line.** The plan's block waits only for `__gameStatus`. This page also says ready 12 s after connecting once the canvas exists. The plan's line intermittently failed the harness with 3 or 4 copies under machine load, because a copy could spend over 20 s compiling pipelines and be sat out. When the status comes first, it behaves exactly as the plan's line does.
2. **`__gameBoot` carries two more fields** (`touchOnly`, `fast`) than the plan's block, and the page defines `__rumble` for Eyes Closed.
3. **Tray Trek scores 180 per glass plus 100 for no spills,** not 200 plus a bonus, so that it tops out at 1000.
4. **Step Party has 125 notes,** not about 100.
5. **Attract adds Breath Bloom and Tempo Squats** to section 12's list, because section 5 gives every event a segment.
6. **Sets have no `[camera]`;** every camera comes from cues, since a room camera overrode a cue set in the same frame.
7. **The Wardrobe opens from the island only.** Pause lists it, and it says "On the island" elsewhere.
8. **The fake prompt reads as the glyph in use plus "Press to skip",** so it shows the right button on every device, rather than the word "Cross".
9. **Morning Lap and Paddle Slalom stop by themselves** at 130 s and 110 s, so an idle player isn't stuck.
10. **The tuning table is wider than the plan's.** Everything on its must-include list is there; "bounce gain" is `leap_power` in `[dive]`.

## What could not be checked here
TASK.md says of these: "anything that needs the real thing is checked as far as it can be here, never required."

- **Feel.** Nobody has held a pad and judged how a lean, a squat or a splash feels. Stand-ins: bots, a human-like player, balance tables, captures.
- **Sound.** Nobody has listened. Levels, non-silence, the 10% ratio and speaker differences are measured. Whether it is pleasant is not known.
- **Real hardware.** No physical pad (a stub in the browser, a scripted pad in the native window), no touch device (Playwright profiles), no iPhone (WebKit), no TV (1080p captures).
- **A second person.** Multiplayer was played by the harness's copies on one computer.
- **Frame rate on a real GPU.** Only software rendering was available.
