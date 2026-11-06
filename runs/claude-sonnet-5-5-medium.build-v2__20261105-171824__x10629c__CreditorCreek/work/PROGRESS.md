# PROGRESS (read this after a context compaction)

Title: **Creditor Creek** (RNG pick, index 31 of 50).
Dev folder: `CreditorCreek-AnimalCrossingCityFolk-claude-sonnet-5-5-medium-20261105-171824/` (call it G). Deliverable HTML goes in this root: `CreditorCreek-AnimalCrossingCityFolk-claude-sonnet-5-5-medium-20261105-171824.html`. Also `exit-interview.json` in this root.
G layout: kit/ (engine kit, untouched), hubref/ (hub docs/harness copies), vendor/session.js, src/ (modules; src/pixel-engine.js is a byte copy of kit), tools/build.mjs, tests/.
Browser flags (needed): --enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-angle=swiftshader --use-webgpu-adapter=swiftshader. playwright@1.63.0 npm installed in G.

## Scope decision
Plan is huge; build a coherent vertical slice, cut content to floors, never cut the "never cut" list. Anything unfinished must not be visible in-game.

## Done
- [x] kit + hub files fetched, G scaffolded

## Next
- scaffold build + boot test

## Done so far (files in G/src)
core/rng, storage, calendar(+weather, realClockInfo); data/tuning, collect(fish,bugs,fossils,art), items, neighbours(+HOSTS), dialogue;
ui/font, controls, draw, ui (UI class, Dialogue); audio/voice, sfx, composer (all songs parse); art/critter (27 species), clips (44 clips validate).
tools/build.mjs works (esbuild local), tests/boot.mjs boots built HTML on file:// with flags OK.
## Layout decisions
Town map 60x46 tiles, programmatic (world/townMap.js). Houses 3x3 from NEIGHBOURS[].home (x0,z0); door = (x0+1, z0+3). Player plot [45,30,4,4]. Store [36,16,5,4], Mothwick [43,16,5,4], Hall [7,17,5,4], Museum [12,6,6,5], Bus [2,20], Plaza x16-26 z18-26, River x29-31, pond z26-32, bridges z=14 & z=24, sea z>=40.
Interiors at x=1000+; City group at x=500.
## Next
world/townMap -> terrain -> game.js skeleton -> player -> npcs -> verbs...

## Status log (update!)
DONE & GREEN: sim suite (273 checks), play suite (scripted playthrough, 80 checks incl. intro/errands/tools/city/festivals/ending), browser suite (boot/input/attract/audio/touch/webkit pass), hub harness 4 scenarios pass. Run all: `cd G && node tests/run.mjs` (or --only sim|play|browser|hub). Also: tests/browser.mjs <boot|input|attract|audio|touch|webkit>, tests/hub-run.mjs.
Features present: title, settings, about screen (data/about.js - feedback arrays still EMPTY), pause, dev mode (9 pages incl Balance sliders), attract mode (systems/attract.js), village, tools, shop, mail, museum, hall, home placement, City (7 venues + fortune), bus ballad, festivals x4, contests x3, cheese, Vesper, Rocco, Pimm, ending, Hub round (net/arena.js), pattern studio screen (no opener yet).
Fixed gotchas: manual e.step() loops need `await` between steps (microtasks) -> tests use step() helper. Player.lock must clamp to 0. UI closedThisFrame guard avoids reopen loops. g.grace after startGame.
Visit mode: REMOVED from title (BroadcastChannel not built). Sheets suite n/a (art = code primitives, no ModelDefs).
TODO next: polish pass w/ screenshots (dialogue, pockets, interiors dark bg, season looks, night), pattern opener at Mothwick, snowman verb for contest, forceWeather in g.weather, hover tooltips, fill data/about.js feedback, exit-interview.json, final build -> root HTML, rerun tests/run.mjs fully, final chat reply with Source Info + feedback.

## Final-stage notes
exit-interview.json written (tools/exit-interview.mjs regenerates from src/data/about.js + feedback.js). Root HTML is built by tools/build.mjs. Full run output: G/shots/full-run.txt.
Added since last log: occluders (dissolve), mouse hover tooltip + click-to-act, snowball/snowman verb (winter), pattern studio opener at Mothwick's, indoor lighting, recolourable home walls/floor.
Cut / not built (be honest in final reply): Visit mode (removed from title), WebRTC invite codes, dust bunnies, NPC chat bubbles, catalogue reorder, pattern textures on shirts/umbrellas, home tiers beyond size change, kenney-nature pack, sheets suite (no ModelDefs), Lost & Found logic, 2-storey home. Village is 60x46 (plan 80x64).

## FINAL (all done that was planned for this session)
Full `node tests/run.mjs`: 400 checks, 0 failures (build, sim, play, browser, hub). Deliverables in work root: CreditorCreek-AnimalCrossingCityFolk-claude-sonnet-5-5-medium-20261105-171824.html, exit-interview.json, dev folder, PROGRESS.md. Only the final chat reply remains (Source Information + Testing/Engine/Prompt feedback from src/data/feedback.js + about.js).
- Added after hook: dust bunnies, chat bubbles, catalogue, shirt patterns, annex+upstairs, Visit (BroadcastChannel), sheets suite, 80x46 map. Full run 416 checks 0 failures.
- Second hook round: village 80x64 (south island via dock), umbrella pattern, Lost & Found logic, furnishable annex/upstairs. 422 checks 0 failures.
- Third hook round: visually checked annex + Lost&Found; feedback answers updated.
- Fourth hook round: WebRTC invite codes (net/rtc.js), 5 ModelDefs used in-game, full suite 426/0.
- Fifth hook round: items3d (fish/bug/tool/skeleton/paintings), per-tier home+store exteriors, museum with real models. Full suite green.
- Sixth hook round: house ModelDef drives all building bodies, Magda shows painting models + forgery mark, visual checks of tools/held catch. Suite green.
- Seventh hook round: critters, trees and houses are all ModelDefs via buildModel; suite 426/0.
- Species silhouettes all checked by screenshot; wombat/quokka differentiated by scale; forgery mark verified.
- Audit round: favours (12 templates, markers), ambience loops + seasonal particles, worn paths, gold Bell, puffy eyes, Rocco choice, canopy sway. Play suite 99.
- Audit round 2: fog, rainbow, chimney smoke, waterfall, clothesline, beachcombing shells, target chevron, live TV (RenderView) + Mirror. TV verified by screenshot.
- Audit round 3: AUDIT.md written; visual checks of fog/rainbow/waterfall/puffy eyes; dialogue floor 700 met via composed banks; tool ring, puddles, cloud shadows, Quill lump appraisal.
- Audit round 4: Lookout hill with ramp+cliffs (groundHeight), spring tails, live critters in tank/cage, mirror reflection verified by screenshot.
- Audit round 5: scripted checks for gold bell, tail, tank critters, puddles, clouds, ambience levels. Play suite 108.
- Audit round 6: upper terrace with Museum; cloud shadows made translucent; hub startup lean.
- Audit round 7: festival decorations, Long Night sunset 16:00 + Rocco rolls in, 160 lanterns.
- Audit round 8: whole-village festival participation (festivalCrowd).
- Audit round 9: coffee until noon, fortune luck effects, knock at sleeping door, picture settings wired to engine.settings.
- Audit round 10: store hours, museum plaques, trampling, squash, salon turntable, Rind/Vesper cameos.
- Audit round 11: constellation naming in Almanac.
- Audit round 12: sentence pass over plan sections 3-15 with fixes (stumps, rain watering, real-clock contests, extra furniture, mails, camera by stick).
- Audit round 13: sections 16-20 pass; frosted windows, boxes, mushrooms, snow prints, birds, musician, Mayor slide, honk, fast/slow speech, Vesper sings.
- Audit round 14: sections 21-24 pass; ui.model, determinism test, fish rings, tile highlight, Mayor slides to ribbon.
- Audit round 15: fish/bug/tool/skeleton ModelDefs (sheets 30 OK); hub quality medium.
- Audit round 16: remaining props to ModelDefs (34 sheeted); input.send for typed keys and real clock; sections 1-2 pass.
- Audit round 17: screenshots of net in hand, tile highlight, boxes, bunting, festival crowd.
- Audit round 18: room shell + shopfront ModelDefs (36 sheeted).
- Audit round 19: screenshots of rings, footprints, cloud shadows, birds; analyser test for ambience.
- Audit round 20: street musician moved into open view and seen with tail swing.
