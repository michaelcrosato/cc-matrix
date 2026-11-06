# PLAN.md against the finished build

Each section, what's there, and what shows it. `run_all` is `tests/run_all.py`.

| § | Item | State | Evidence |
|---|---|---|---|
| 1 | Pitch, pillars, nothing from the source's world | Done | `content/` holds only the plan's world; name riff only in title and Source Information |
| 2 | World, cast, 8-case story, 150-250 lines, voice | Done (200 lines) | `content_is_sound...` test counts and lints every line |
| 3.1 | Loop; death, retry under 2 s | Done | `ranks_follow_the_par_and_retry...`: retry is the next tick |
| 3.2 | Seats, controls, flick, aim assist, rail, needle creep | Done | `DualSense flow`, `tools by digit, wheel and tray`, native run; assist only in stick mode, in `stick_move` |
| 3.3 | Every instrument: gesture, rating, misuse, own model | Done | rule tests for scalpel, forceps, suture, laser, IV; coverage test for all rated tools |
| 3.4 | Every hazard | Done | coverage test: `hazard:*` and `done:*` |
| 3.5 | Heart, BPM, on beat, Code, ×1.4 clamp | Done | `falling_vitals...`, `the_code...`, `chains_multiply_and_on_beat_pays`; clamp in `beat_worth` |
| 3.6 | Ratings, chain, ranks from par | Done | `chains...`, `pav balance`; par set from the bot |
| 3.7 | Hush, Echo, Duet, tremor | Done | `the_hush...`, `the_echo...`, coverage `gift:*`; tremor off in Precision, Echo and by Setting |
| 3.8 | Difficulties | Done | `tune.rs`; Resident not measured by the balance tool |
| 4 | Cases and strains, target lengths | Done; length measured by bot | 0.7 bot: 160, 208, 253, 273, 260, 272, 268, 276 s against targets of 180-480 s |
| 5 | 10-foot layout, focus lists, prompts, flow, save | Done | shell tests, `Xbox prompts, and settings persist`, 1080p shots |
| 5.1 | HUD | Done | `full_op.png` |
| 5.2 | Dev mode: sliders, reset, tools | Done | `dev mode` test, shell test, `full_dev.png` |
| 5 | Attract; touch-only | Done | `attract at 10 s...`, `phone:` and `full picture: phone profile` |
| 6 | Field, instruments, paper theatre, effects, font | Done | captures; 8 sets, 6 rigs with 4+ expressions (lint) |
| 7 | Animation | Done | procedural in `pav_view::surgery`, `paper.rs`; clips in the OR shot |
| 8 | Three buses, 47 cues, tracks, voices, music 0.10 | Done | `every_cue...`, `every_track...`, `voices...`, `the_bass_lands...`, `audio runs` |
| 9 | Hub: card, shared world, server, rules; local co-op | Done | harness in all scenarios, `two copies`, `two pads` |
| 10 | Seams, data files, `case_check`, `balance`, designer guide | Done | tools in `pav`; `content/README.md` |
| 11 | Every listed test | Done | `run_all`; `audio_capture bot=true` covers the game's cues |
| 13 | Package, finish line, exit interview, delete target | Done | `check_handin.py` |

## What this computer can't do (TASK.md: "checked as far as it can be here")
A person playing, a physical controller, ears, a real iPhone or iPad, a TV. Stand-ins: the bot, a stubbed
DualSense, Web Audio and offline levels, Playwright phone and WebKit iPhone profiles, 1920x1080 screenshots.

## Found by this audit
Client hub seats lost tool taps between network sends, and clients had no music or callout voices: fixed.
