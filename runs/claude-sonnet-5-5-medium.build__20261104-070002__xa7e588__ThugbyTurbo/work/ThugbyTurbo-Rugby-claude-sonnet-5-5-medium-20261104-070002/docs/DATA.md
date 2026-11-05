# Thugby Turbo data guide (for designers)
All content lives in `src/10-data.js`: `TEAMS` (kit colours, names, style, `mod` strength, `boss`), `VENUES` (weather, ambient, hazard
`mud|wind|flames|lightning`), `CUP` (opponent, venue, story lines), `DRILLS` (text, goal, `cond(match)`), `POWERUPS`, `LINES`
(commentary). Balance numbers are the `TUNE` registry in `src/00-core.js` (`TUNE.add(key,label,group,value,min,max,step,unit)`) and
show up as live sliders in Dev Mode (pause menu, DEV MODE). Rules are in `src/20-24`, drawing in `30-33`, scenes in `40-43`.
Build: `node build.mjs`. Tests: `node test/all.mjs` (sim suite, browser checks, scripted playthrough, AI Hub harness).
