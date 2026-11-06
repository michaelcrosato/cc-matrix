# PROGRESS

Title (picked by crypto RNG out of 50): **Wee Teeter**
File stem: `WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037`
Dev folder: `WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037/`
Build: `node build.mjs` (writes ../<stem>.html and tests/hub/game.html). Tests: `node tests/run.mjs [rules|browser|hub|all]`.
Tools: tests/tools/{acts,one,shot.py,smoke2}.mjs.  Screenshots: shots/ (delete at the end, with node_modules).

## Status: done
Final `node tests/run.mjs all`, on the handed-in build (sha256 242baf78796c7b53...) with no edits after it: 2609 passed, 0 failed (rules, browser, one-device days, hub, tests/plan.mjs checks of PLAN.md's numbers and prose rules, and the speech audit that records what the game actually says in play). The hand-in check holds on the same file. To rerun browser tests: `npm install` in the dev folder.

## PLAN.md section 18, line by line: what backs each line
| Line | Evidence |
|---|---|
| Title, file, dev folder | crypto RNG pick in the transcript; `tests/tools/handin.py` checks file name, place, title on screen |
| Original game | test: no source names in game text, no engine songbook; 14 songs written here; cast and lines from the plan. Judgment: I wrote nothing from the source |
| Genre, perspective, engine | `tests/tools/handin.py`, engine 0.89.0; diff against upstream shows only 4 Dialog lines changed, plus upstream's own version strings |
| Art and animation | engine check.mjs: no errors and no look notes left; signs tested for roofs, lamps, trees and Regulars and seen in 1080p shots; tests: hand-drawn pieces in code, poses and clips exist; screenshots of every screen and activity at 1080p |
| Audio, voices, 10% | browser: music .1 on fresh storage, music/voice/sfx buses sound, OfflineAudioContext babble, no audio files or network |
| Hub and Class | harness at 5 settings; a full real-time 2-player round; Class to a four-score podium |
| Wardrobe, Comfort, Candle at 20 s, motto on every sign, the instructor mirroring you | tests/plan.mjs: the instructor's lean follows yours in mirror on Sun Flow; the rail changes what is worn and it reaches the rig; shake and flash at 0 stay off; nothing goes round them; the line comes just after 20 s, not at 19.5 s; every sign carries the motto |
| Every feature, designer data | scripted playthroughs to the ending (good bot and passive); data-only test adds an activity, tiers, pose, chart, tray, day, unlock and line with no code |
| Dev Mode | tests: every slider changes, reset restores, every tool on the panel does its job, every jump loads; browser: from the pause menu |
| Attract | fires at 10 s, not at 9.9; visits all 17 items; any input exits; no save changes; runs behind the phone notice |
| Tone | test: every section 7 line word for word; banned-word list; every string read by hand against the rules; all the voice in lines.js, by a scan of the code; Cards are one sentence; every box two lines (one long verbatim plan line pages itself). Judgment: the rest of the lines are mine |
| 10-foot, controller-first | test: at most 6 choices, no label spills, Card and Results text fits, About fits; a whole first day on pad only, keys only and mouse only; hover focus; prompts follow device; glyphs. Judgment: 1080p screenshots |
| Touch-only | browser: phone profile shows the notice and Settings, no touch controls, taps leave attract running |
| One test command | `node tests/run.mjs [rules|audit|browser|hub|all]`, failures and a count only |
| No TODOs or stubs | test scan of game/ |
| About and chat | test: every field and answer on the About pages in full, none cut; handin.py: page data equals the exit interview |
| Exit interview | handin.py: exact shape, parses, no pending answers |
| Tare and the instructors' speech | `node tests/run.mjs speech`: records every line spoken while driving body checks, Tare's Day, sessions, island, evening, the Games, duels, endings, Class and attract with both instructors; fails if a group of lines stays silent or a named moment passes without its line |

## What this computer cannot settle
Whether it feels good on a real thumb. A modelled person (reaction delay, device limits) earns stars on every activity through the keyboard, mouse and stick paths, but that is a model. TASK.md lists no controller, no touch device, nobody to listen, no second player, no iPhone and no TV; each was tested through its stand-in.
