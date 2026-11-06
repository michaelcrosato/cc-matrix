# PLAN.md, item by item

Each row: what the plan asks, and the evidence. `verify` is `node labs/game/tools/verify.mjs`; its stages are named after it.
"Can't be done here" is kept to what TASK.md itself lists as missing from this computer.

| Plan section | Asked | Evidence |
|---|---|---|
| 1 Game | Pitch, genre, perspective, never-take list, no body talk | `scenes/game.test.ts` scans every line for weight, calorie, BMI and the source's name |
| 2 World | 13 stations, cast, five-day story | `scenes/data/stations.ts`, `places.ts`, `bodies/`, `ui/lines/`; the whole-game test and both route tests play all five days |
| 3 Verb | Wobble Model, breath, feet, topple, ranks, no softlocks | `scenes/wobble.ts`; model test; idle finishes every activity in `balance` |
| 3 Targets | Perfect at least 750, human-like 550, sloppy 300, idle at most 500 and below human-like, 10 seeds, mashing never throws | `verify` balance stages, per activity, and `random input` |
| 4 Controls | Maps, pad, keys, mouse, prompts by device, Xbox option, rumble | `browser.py`, `route.py` (the stick leans through the engine's pad device), pointer-lock lean. Rumble is called with a try/catch: a stubbed pad cannot confirm a real motor |
| 5 Structure | Day table, Go for every item, Wobble Age, cairn, unlocks, plaques, saves, data tables | `route.py` picks every Programme row by device; age bounds test; save and Erase in `browser.py` |
| 6 Activities | All eleven, in their forms and short forms | `balance`, one golden replay each |
| 7 Finale | Storm, Everyone East, Counterweights, Centre Stone, Dawn, time boxes | whole-game test on 3 seeds, `tilt` replay, screenshot |
| 8 Screens | 10-foot rules, flow, pause, settings, controls, About, dev, attract, touch-only, no WebGPU | `browser.py`, with every screen under test at 28 px and six rows, tablet and phone, WebKit for the no-WebGPU page |
| 9 Multiplayer | Group Class; hub ghost, own card, labels, leave, time-up, session pause | `browser.py` (seats, pad's own seat, podium, sash), `round.test.ts`, `hub.py` at 2, 3, 4 and host-leave, and by hand |
| 10 Art | Look, skies, terrain, sea, props, characters, effects | Screenshots by eye at the end. Departure: ink on people only, see README |
| 11 Animation | Own clip set, scrubbing, additive leans, library clips | `cast/clips.ts`, `cast/body.ts`; screenshots. Departure: Plumb's closed eyes are small dots, not arcs |
| 12 Audio | Songs, voices, effects, music at 10%, no files | `audio/audio.test.ts`, `x qa audio`, `audio/probe.ts` in `browser.py`, a scan for audio files |
| 13 Writing | 200 lines, voice | Over 200 in `ui/lines/`; every id the sim says is checked |
| 14 Tech | Stack, one-scene rule, pilot, split, single HTML | `npm run check`; file under 400 lines each; `fetches nothing` in `browser.py` |
| 15 Traps | Each handled | Query keys stripped, engine asserted in each frame, `touch=off`, client kept as text |
| 16 Testing | One command, Node and browser stages, goldens in Node and Chromium, harness by hand | `verify`, `replays`, `replays in Chromium` |
| 17 Cut line | Cut only if out of budget | Nothing cut |
| 18 Done | No stubs; credits by pad alone and by keys and mouse alone; verify, check and test pass; file opens from `file://`; README and feedback honest | `route.py` both ways; `verify` and `npm test` |
| 19 Reports | One data file for screen, reply and interview | `ui/about-data.ts`, `tools/write-interview.mjs`; About is read in `browser.py` |
| 20 Map | Every brief item has a home | The rows above, and TASK.md's title, research and package items: RNG pick of 50 in PROGRESS.md, research reported in About, single HTML in this folder |

## Judged, not measured

- **Feel.** Nobody can play here. The plan names the delayed-thumb bot as how to judge it, and the targets above are met. The Line was
  measured and retuned so that falling is part of it: on 10 seeds the human-like thumb falls about once, the sloppy thumb about twice.
  Whether any of this is fun needs a person.
- **Sound.** Nobody can listen here. Levels and spectra are measured; whether the music is pleasant is not.
- **Route tests.** Menus are by each device alone. The activities in them are played by the dev bot at speed, since nobody can play by hand.
