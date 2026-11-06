# PLAN.md and TASK.md checklist (final build)

Every row below cites a run or screenshot taken on the final HTML (built 2026-11-05 23:53, no later source edits). Suites: `node tools/test.mjs --force` = 508 passed, 0 failed (suites sim, data, career, headless, play, browser, audio, hub). The HTML was built after that run.

| Item | Evidence |
| --- | --- |
| 1 Game, 2 Originality | Original title (RNG pick), fictional marques/tracks; About says "inspired by" the source |
| 3 Proven facts / 4 Architecture | Kit unedited in `src/`; folder map as built; three scenes (menu, race, replay); `window.__GAME__` |
| 5 Driving, assists, AI, pit, rally, cameras, replays | `sim` suite (spec sheet, laps, determinism, reverse, gears, crest, wear); pit stop and crew: `shots/fin3/p_pit.png`; replay: `shots/fin3/replay.png`; driving line, recovery, slipstream in code and HUD |
| 6 Content | 14 cars, 6 tracks, 12 tests with frozen medals, 8 events, parts, tyres, service, arcade, garage, museum; `data` and `career` suites |
| 7 Screens and controls | `browser` suite: pad stub, glyph swap, mouse hover, touch gate; every top-level screen opens; settings, handbook (with driving-line page) |
| 8 Art | 1080p review in `shots/fin3/`: all 14 cars, all 6 tracks (start and AI-driven corner), map day and night, harbour night, rally crest |
| 9 Animation | Ten new ClipDefs; marshals (6 in a real hub session, hub suite), pit crew (`p_pit.png`), podium (`z_podium.png`), all in `shots/fin3/` |
| 10 Audio | `audio` suite (offline engine render, voices); music 10% on a fresh profile and in a hub session (`headless` + `hub` suites) |
| 11 Writing | All text uppercase catalogue voice; `data` suite checks fit |
| 12 Attract | `browser` suite (starts at 10 s, any input exits, touch device runs it); unmodified run on the final build: director visit log [0..9, 0], no page errors |
| 13 Dev mode | `browser` suite: sliders change, reset restores; tools and overlays wired |
| 14 Multiplayer | `hub` suite: 2 players, 4 players with latency/jitter/loss, host-leave, standalone title; 6 marshals in a real session; couch duel with two engines created and disposed |
| 15 About and exit interview | `exit-interview.json` parses; About embeds it and the kit credits |
| 16 Testing / 1080p review | Viewed on the final build, shots in `shots/fin3/`: all 14 cars (`S_cars`), start and corner of all 6 tracks (`S_tracks`), map day/night, dealer, tuning, service, licence, events, settings, handbook (`S_ui`), results, replay, couch duel, Harbour night race, podium, ending (`S_flow`), pit stop (`p_pit.png`, TIME 32.07, crew, fuel bar); attract clips: director visit log [0..9, 0], clip 1 re-shot |
| 17 Build order / 18 Done checklist | Whole-game bot finishes the career with no dev tools (`play` suite); no TODO/FIXME/stub in `src/game`; single HTML runs from file:// with session.js first |
| TASK hand-in | HTML and `exit-interview.json` in `work/`; Source Information and feedback in the chat reply and on the About screen |
