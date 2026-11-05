# Issues found by testing (this build session)

Each row is a game issue that a test, a browser run or the Play Lab exposed, and the fix that closed it. Problems in
the tests themselves (a spin test that could not fail, a too-short wait, a test bug) and in the machine (a full /tmp
that crashed headless Chromium) are listed separately and are not counted.

## Found by the headless suites (`npm test`) — 15
| # | Issue | Fix | Critical |
|---|---|---|---|
| 1 | A new match kept the previous match's play calls, so every set situation, REMATCH and story retry replayed the old play | `S.newMatch` clears calls, play, mascot, scorer and halftime state | yes |
| 2 | A kick play with no kicker on the field (filtered drill units) crashed `FF.kick.cpu` | guard for a missing kicker | yes |
| 3 | The touch-only gate unlocked itself (the default device is "keyboard") | unlock only on a real key or gamepad | |
| 4 | The Big Heads cheat was reverted by the setting's own lock | the cheat is a sim cheat, not the setting | |
| 5 | Deep links (#drill, #story) ran before the boot finished | run them on `game.booted` (at once headless) | |
| 6 | Records and unlocks were lost where storage is absent (headless) | an in-memory fallback in `FF.store` | |
| 7-9 | Three commentary lines over 48 characters | shortened | |
| 10-12 | Attract segments missed their key moment: the fumble, the mascot sack, the Seismic Sack | director hooks per segment | |
| 13 | The Seismic Sack's slam was lost when the play ended first | the over-the-top systems also update during dead balls | |
| 14-15 | After AI tuning, the attract pick six and Seismic Sack missed again | the pick six's throw and a defender under it are directed; the Mountain is released from blocks | |

## Found by browser runs and screenshots — 17
| # | Issue | Fix | Critical |
|---|---|---|---|
| 16 | Boot crash: `FF.FIELD` used by the field module before the sim defined it | constants moved to boot | yes |
| 17 | Crash: the game's own flag overwrote the engine-internal `input._used` | renamed `FF.inputUsed` | yes |
| 18 | Update crash: a missing default argument in `FF.Rigs.driveRig` | default `{}` | yes |
| 19 | The page stopped loading: a duplicated `const want` in the camera | renamed | yes |
| 20 | The field drew black: `E.hex` returns `[r, g, b]`, treated as an integer | fixed in four files | yes |
| 21 | 12 fps: every camera zoom value rebaked the whole field | zoom snaps to 5 levels; engine floor cache 6 → 16 (E10) | yes |
| 22 | Unknown input actions: the input map was only applied on scene entry | `input: FF.KEYS` on the game | |
| 23 | Audio warnings: music layers set on songs that lack them | layers only on songs that have them | |
| 24 | `game.go` warnings from deep links before the start | see 5 | |
| 25 | Glyphs drawn as '?' (▲ ▼ ◂ · ✓) | added to both fonts (E1) | |
| 26 | The main menu overflowed the screen | tighter layout | |
| 27 | Setup showed "PAD" for the keyboard player | label from the input's device | |
| 28 | The ball lay at a stale spot before the snap | spotted at the line in PRESNAP | |
| 29 | Linemen caught deflected passes | linemen are ineligible | |
| 30 | The night stadium was too dark to read the black Owls | brighter ambient, two mid-field towers, bigger light radius | |
| 31 | PRESS START chips overlapped each other | drawn one by one | |
| 32 | (1080p look check) empty Hall of Fiasco records drew '?': the em dash is not in the pixel font | '--' instead (and a '-12°' crowd sign, whose ° is not in the font either, became 'COLD') | |

## Found by the Play Lab and the plan's bands (`test/lab.mjs`, `test/bands.mjs`) — 9
| # | Issue | Fix | Critical |
|---|---|---|---|
| 33 | Runs averaged 13 yd: engaged defenders could never tackle a runner going by | arm tackles from blocks; sheds speed up near the runner | |
| 34 | Passes were sacked in 0.8 s: block push of 18 units/s per strength point | push 6, strength difference clamped | yes |
| 35 | Too many interceptions (8 of 10 Hail Marys) | lower INT chances | |
| 36 | 77 late hits a game: the AI rolled every step | one roll per dead ball | |
| 37 | Blocks never broke off once the runner was gone | released past 5 yd | |
| 38 | Defenders dove at where the runner was and missed | dives lead the runner; dive only when closing | |
| 39 | Receivers blocked as well as linemen | WR and RB blocks shed 2x faster | |
| 40 | The QB sneak's path was never read by the AI | `keep` wired | |
| 41 | The pitch plays averaged 11-14 yd (band 1.5-9) | pitched later, aimed off tackle | |

**Totals:** 41 issues; 9 critical (#1, 2, 16, 17, 18, 19, 20, 21, 34).

**Final balance (n = 30, every offensive play against 8 defenses, Pro, Fiascos vs Mudhogs):** all 17 plays inside the plan's bands; the log is `shots/bands-n30.txt`.

**Frame rate (not a target: TASK.md leaves FPS and optimization for later):** headless Chromium, software rendering, every effect on: 45-60 fps at 1280x720 and 45-50 fps at 1920x1080 on an idle machine; 22-30 fps at 1080p while the shared machine's load average was about 10.

## Not counted
- Test bugs: the first spin test could not fail; a UI click test waited less than the scene fade; an over-the-top test used an athlete not on the field; the story test pressed Start before the title accepts it; the netcode test was synchronous while the hub connection is async; a client-mirror check compared a fast-changing phase.
- The machine: /tmp (a shared tmpfs) was full and crashed headless Chromium; tests and screenshots use a TMPDIR inside this folder.

## Found after the log above was closed — 1
| # | Issue | Fix | Critical |
|---|---|---|---|
| 42 | The Hall of Fiasco skipped games whose local player's side was CPU-driven (Dev CPU vs CPU), leaving records at 0 — found by a behavioural records test | records follow the local players' sides | |

**Updated total:** 42 issues; 9 critical.
| 43 | Online prediction: the client corrected itself toward a round-trip-old snapshot and the host often rejected its reports, so only 72% of samples kept the predicted player within 2 yd of the host (plan: 95%) — found by a netcode measurement at 150 ms latency and 5% loss | the host accepts unlocked reports within 6 yd; the client snaps back only when the host matches none of its last 0.5 s; a soft collision push on the client; reports moved on by their age; dives and jumps lock prediction. Now 98% over ~1,500 samples | |

**Updated total:** 43 issues; 9 critical.
