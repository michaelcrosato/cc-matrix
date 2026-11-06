# PLAN.md audit, section by section

Up to date with the final build. `node tests/lib/checklist.mjs` prints section 27 line by line from the hand-in.

How each section was verified. "Suite" names are from `node tests/run.mjs`. "Shot" means a screenshot in `tests/shots/` that was looked at.

| § | Plan section | State | Verified by |
| --- | --- | --- | --- |
| top | Title by random pick, `GAME_TITLE` | Done | Picked with `secrets.randbelow` from 50; browser suite checks `<title>`; shot `title` |
| 1 | Game, pillars, content limits, originality | Done | Playthrough; all names and writing are original; civilians can't be shot (code, systems) |
| 2 | Setting, cast, twist, two endings | Done | Playthrough: both endings; shot `ending` |
| 3 | Engine traps | Done | Handled in `core/look.js`, `game.js`. One plan line was wrong: `groundFog` with a negative `top` tints everything, so `top` is 0.01 |
| 4 | Architecture | Done | Every file the section 4 tree names exists (static suite checks each one); one class kept across files uses `core/mixin.js`. An addition: `ui/scenes.js`, `world/geom.js`. Data over code, actions, TUNING, `state()`, sim and view apart, `ISSUES.md`, `DESIGNERS.md`: all present |
| 5 | World | Done | Static (sites), systems, playthrough; shots `day`, `town`, `storm`, `card` |
| 6 | Fire, wind, time, weather | Done, one addition | Systems: head 2-5 m/s, flanks, roads, embers, burnt can't re-burn, regrowth, save. Addition: fires tire after about 200 m, because otherwise one match ate the whole map and the plot's arc |
| 7 | Player | Done | Systems, playthrough |
| 8 | Weapons and wear | Done | Systems: wear, jam formula, unjam 2-4 presses, falls apart, rust and tape parts, hit zones; shots `day`, `fight` |
| 9 | The body | Done | Systems: syrette, four surgery scenes, interrupt, finger snap, regen, burns, fever, collapse, rescue; shots `surgery`, `knife`, `finger-before`, `finger-after`, `lighter` |
| 10 | Soldiers and AI | Done | Systems: perception, pass, panic, rocket role, patrol chase and dismount; barks counted by static |
| 11 | Vehicles | Done | Systems: drive, map at the wheel, damage, explode, repair; shot `driving`, `map` |
| 12 | Buddies | Done | Playthrough: alive and dead-friend runs, syrette and finish; systems: rescue |
| 13 | Stones, safehouses, side content | Done | Systems: cases, tracker, trig, post re-man, halts, rack, locker, crate, sleep, save, load; playthrough: Mercy Runs |
| 14 | Missions M0-End | Done | Playthrough runs every mission; systems takes every alternate plan by the radio prompt (M3, M4, M5, M7); M6's choice is in the playthrough; static resolves every reference |
| 15 | Writing | Done | Static: font characters, line length, at least 8 lines per mission, 12 epigraphs, 6 notes, 15 barks per faction |
| 16 | UI and UX | Done | Systems and browser: keyboard, real mouse hover and click, pad stand-in, glyph switching, Xbox option, settings persistence, music 10%, touch gate on a phone profile; systems walks 17 screens in pad PlayStation, pad Xbox and keyboard modes; shots `glyphs-ps`, `glyphs-xb`, `rack`, `talk` |
| 17 | Dev mode, 20 sliders | Done | Systems: tabs, slider steps, reset one, reset all; shot `dev` |
| 18 | Attract mode | Done | Systems: starts at about frame 601, all 13 beats, loop clean, key, stick and click exit, saves untouched; runs behind the touch gate |
| 19 | Multiplayer | Done | Hub suite: all four scenarios in the real harness. Link suite: two windows, shared fire, shared case, same standings, gunfire triggered on the other copy. Systems: solo round rules, snapshot under 1,100 bytes; shot `card-harness` inside the harness |
| 20 | Art | Done | Static: `checkModel` on every model; shots |
| 21 | Animation | Done | Static validates clips. The M0 ride, rescue drag, M9 table scene and both endings run on the engine's `Timeline` through `ui/scenes.js`, with `cam.override`, lines, `bars()` and skip; choice prompts stay in `ui/dialogue.js`. The M0 ride has no camera shots, because the plan's M0 row has you look around; lines suite §21 |
| 22 | Audio | Done | Static: every required sound renders non-silent, distant gun variants, songs parse, voices; browser: real Web Audio levels, a live analyser, and the game's explosion and voice measured at the speaker output; systems: near and far guns, wood and ground steps |
| 23 | Packaging | Done | Browser: one file on `file://`, nothing external; head order in `tools/build.mjs` |
| 24 | Testing | Done | `node tests/run.mjs --all`; only one command; prints failures and a count |
| 25 | Build order | Done | All steps |
| 26 | Cut order | Nothing cut | |
| 27 | Done, reports | Done | `tests/lib/checklist.mjs` prints every line; systems checks every About page draws text and fits; shots `about1`, `about2`, `about3`; exit interview parses; engine byte-identical |

## What cannot be done on this computer

- A person playing at full speed: software rendering is about a frame a second or less here, and PLAN.md section 3 says not to judge the game by real time. Game feel and balance are for a person with a GPU; dev mode's sliders are there for that.
- A physical controller and a person listening: TASK.md lists both under what this computer doesn't have, with stand-ins, which were used.

## Reading the test runner

`--all` prints `N passed, 0 failed, 0 suites unchanged`: every suite ran (none was skipped). Without `--all` it skips suites whose code hasn't changed since they last passed, so `0 passed, 0 failed, 7 suites unchanged` means all seven are already green on this exact code.

Line by line: `tests/suites/lines.mjs` writes one PASS or FAIL per requirement to `tests/PLAN-LINES.txt` (337 PASS, 0 FAIL on the final build).

Final build 0c4e83a3132f: all suites, the plan lines (337 PASS, 0 FAIL, including measured balance bands and the Timeline scenes), the checklist and the screenshots above were rerun from this build.

The section 21 base list is all in use: `gaitClip` (the refugees' Trudge; other walks are the reused hero clips the plan names), `SpringChain` (truck radio whip), `Squash` (truck body on a knock), `twoBoneIK` (arms to the wheel). Tracers use a sprite, which section 8 allows.

A script also checks every code name in the plan (544 spans) against the source, and every optional call against a definition; what that found is in `tests/ISSUES.md`.

A full read of the plan's prose against this build followed (sections 1 to 27). The map plane is drawn at 0.6 m, not 0.5 m, because that is what fills the plan's stated 70% of the width at about one texel per art pixel on this view. `groundFog` keeps a small positive `top`, because the plan's negative one tinted everything.
