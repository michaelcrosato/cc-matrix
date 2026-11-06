# Progress

Title (picked by secrets.randbelow out of 50): **Diorama Center: Second Opinion**

## Second pass (after the first "done")
Checked PLAN.md and TASK.md line by line against the code and tests. Fixed what that found:
- Pad test now covers all eight cases (it skipped 4 and 7). Passes.
- Slow play out-ranked good play: pumping the IV paid like surgery. Doses, repeat heat passes and unplanned wounds now pay a quarter and build no chain.
- Slow bots swapped tools without finishing anything: the bot now finishes what's in hand, reacts fast to what's slipping away, and sweeps after the wounds.
- Case 4's bursts spiralled past what the IV heals: less caustic drain, a slower swell. Later cases' drain raised so Attending still loses a slow player.
- Case 6's merge twist was skipped if every ember was frozen first. It now takes any two.
- New tests: pumping_the_iv_never_pays, better_hands_outscore_slower_ones, a_slow_player_finishes_every_case_on_resident, the_bot_wins_the_whole_campaign_on_ten_seeds; 10 seeds per case as the plan asks.

## Done
Full suite on the final page: 73 passed, 0 failed, in one pass (Rust, browser, hub harness, two-copy session). Handed-in page sha256 starts 0db6d067, the same as the tested page. Looked at title, op, story, wide shot, pause, dev, results and About at 1920x1080. engine/target, tests/out and tests/hub/game.html are deleted.

## Hand-in
- DioramaCenterSecondOpinion-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-063049.html
- exit-interview.json

Dev folder: DioramaCenterSecondOpinion-TraumaCenterSecondOpinion-claude-opus-5-5-xhigh-20261105-063049/
- engine/: the changed engine, source only once engine/target is deleted
- tests/: run_all.py, build_page.sh, about.py, browser/, hub/
- Designer guide: engine/crates/pav_core/src/games/surgery/content/README.md

To work on it again: `tests/build_page.sh` rebuilds the page into tests/out/game.html; `python3 tests/run_all.py` runs everything; `python3 tests/about.py` regenerates the About block from exit-interview.json.

Balance tools: `pav balance seeds=20 skills=1.0,0.7,0.4`; `cargo test -p pav_core --test surgery difficulty_table -- --ignored --nocapture` for wins and times per difficulty; `score_sources` for where the points come from.
