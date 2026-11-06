# Hands of Harbor: Second Opinion

Title picked with `secrets.randbelow` from 50 riffs: index 9, **Hands of Harbor: Second Opinion**.

Dev folder and HTML basename:

`Hands of Harbor: Second Opinion-Trauma Center: Second Opinion-grok-4.7-xhigh-20261104-224015`

Engine: shardfall `49ef2ba` (ancestor check passed).

## Done

- Cloned the engine, read START_HERE and MAKE_A_GAME, confirmed the commit.
- Deterministic surgery sim: eight ring tools plus Cryoprobe, Dressing, and Defibrillator. Laser or Scanner on an ember that wants the probe, and any ring tool on a closure, resolve to Cryoprobe and Dressing. A shipped mapping test clears a fresh case 5 ember and a fresh case 2 dressing through octant, cycle, tray, and that swap.
- 10-foot shell: title, campaign, case files, pause, settings, about, attract, touch-only gate, Dev Mode sliders and Reset All. Music bus default 0.10. Synthesized music, effects, and gibberish voices.
- Hub copies draw a coarse plate, instruments, hazards, and cursors. Quiet frames skip the demo world. Countdown frames skip the present. A 32 ms timer steps the sim only while a hub session is active, after the first operation present stops the display callback. Solo play does not use that timer. Hands and snapshots start when the countdown starts.
- Hub harness on this HTML: four queries passed. players=4 `↑57 ↓145 / ↑55 ↓151 / ↑55 ↓150`. host-leave `p1 ↑52 ↓144 p2 ↑52 ↓147 p3 ↑53 ↓145` and the host-left void. server `p0 ↑76 ↓152 p1 ↑77 ↓150 server ↑75 ↓152`. players=1 `p0 ↑78 ↓0`. Two pages: client aim moved host cursor 0 to 4.082500457763672; both pages vitals 67.4000015258789 and timer 239.5.
- Packed one HTML at the work root (11,611,221 bytes). `session.js` (AI Hub session 1.4.0) is the first script. `exit-interview.json`, `about.json`, and the page `#about-data` are the same object. Usage is `added on import`.
- Suite re-run after the last `product.rs` change: `16 passed, 0 failed`, exit 0. Skill 1.0 wins every case and Code Blue. Skill 0 loses every case.
- Two file:// launches of this HTML: title Hands of Harbor: Second Opinion, music 0.10, canvas 1920×1080, empty console, DualSense Cross opens the menu the same way both times.
- This pack’s 1920×1080 shots: title, about, story. The operation grab then died with Playwright `Target crashed` while swap was full. That log is in the scratch `launch-env.txt`. The green suite is the bar for that pass. Older operation, results, and dev shots in scratch are from an earlier pack.

## Notes

- Cargo builds use `CARGO_TARGET_DIR` at `work/.harbor-target` because the dev folder name contains a colon. That directory is removed after the suite. `engine/target` is not present.
- Case and story tables live in `content.rs` and `story.rs`. See `content/README.md` and `PLAN.md` Deviations.
- Dev Mode “Bot plays” sets `bot_drive`. During an operation the skill-1.0 hand then fills slot 0. Attract still uses the same hand on its own.
