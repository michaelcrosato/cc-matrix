# PROGRESS
Title (RNG-picked): **Honk If You Owe**. Currency Beans. Town name is player-chosen.
Dev folder: HonkIfYouOwe-AnimalCrossingCityFolk-claude-opus-5-5-xhigh-20261105-171818 (cwd for all commands)
Deliverable: ../HonkIfYouOwe-AnimalCrossingCityFolk-claude-opus-5-5-xhigh-20261105-171818.html + ../exit-interview.json (built by `node tools/build.mjs`)
PLAN.md + TASK.md are in ../ ; re-read the relevant section of PLAN.md when starting a system.

## Architecture decisions
- src/game.js: one Game object `HonkGame`; `g` passed everywhere. world = plain JSON save (core/save.js).
- Places: town/city/rooms have local coords, actors parented to place.group. Generators drive cutscenes (systems/script.js).
- UI: ui/ui.js screen stack, Menu class; ui/dialogue.js; ui/input.js GameInput (g.inp); ui/draw.js panel etc; art/icons.js drawIcon.
- Art: art/critter.js (critterDef, CRITTERS, avatarDef), art/models.js (MODELS catalog, OWN_MODELS), art/textures.js; actors/rig.js Actor; actors/clips.js 48 clips.
- Data: data/{fish,bugs,fossils,art,furniture,clothes,items,town,townMap}.js. tools/genmap.mjs made townMap.js.
- tools/modelcheck.mjs, tools/clipcheck.mjs = quick validators.

## Status (build order per PLAN §23)
- [x] Kit + hub downloaded (kit/, vendor/session.js, tests/hub/)
- [x] All first-pass modules written. tests/play: bot.mjs, playthrough.mjs (1-2), part2.mjs (3-6), part3.mjs (7-13) via try1.mjs: all passing. NEXT: net/ (hub round, Visit: visitUi.js and hubStart.js are placeholders to replace), tests/run.mjs + sim/browser/hub/visit suites, polish+visual review, About feedback, exit-interview.json
- [x] net/arena.js (Bean Bazaar), net/hubStart.js, tests/hub/run_hub.py (players=2 passes). In progress: Visit (net/visit.js, visitUi.js placeholder).
- [x] net/visit.js + visitUi.js written (BroadcastChannel + RTC). Need visit test suite.
- tests/run.mjs + sim + play (with replay) + hub + visit pass. NEXT: browser suite, sheets; visual review pass (shots/); About feedback text; exit-interview.json; cleanup (grep TODO, await_bus hack in attract.js).
- browser suite passes (112). POLISH BATCH in progress: wall offset, dim rooms, occluder rim, hourly specials/bugs, natural-day season page, umbrella+puddles, frosted windows, town footsteps, timeFrozen, starter bed, jar interest, mail flag, cheese smell, store door chime, pattern kit (tile/sign), Nib tail SpringChain, dust stomp, attract long-run test. THEN: About feedback + exit-interview.json, final run.
- polish batch done; About feedback + exit interview written (tools/exit_interview.mjs from src/data/about.js). NEXT: final full `node tests/run.mjs` (takes ~15 min, run in background), cleanup, final reply with Source Info + feedback.
- Full run started in background writing shots/full_run.log. After it: rebuild (src changed: flick once, HUD idle, licences all pages, fish rings, new-arrival footer, dissolve 0.72), rerun browser+play quickly, cleanup shots/, exit interview regenerate, final reply.
- An earlier full run passed, then a last read of the plan found two gaps. Added: stargazing camera glide (fixed preset + Timeline, systems/stargaze.js), constellation naming in the Almanac (save v3, almanac.starNames). The real-browser check of that also found and fixed: typing E on a keyboard also pressed the focused on-screen key, keyboard buttons hidden by the prompt bar, wrong keyboard prompts, wide key caps overlapping labels, Almanac name/description overlap, pale sky band.
- Full `node tests/run.mjs` on this build finished with exit 0. Only the final reply with Source Info + feedback remains.
