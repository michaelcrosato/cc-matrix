# TASK.md feature audit (each requirement, where it lives, what checks it)

| TASK.md requirement | Implementation | Evidence (tests/…) |
|---|---|---|
| Genre and perspective that fit the source | isometric third-person ninja stealth-action (`73-mission-scene.js`), rotatable/zoomable camera, high-angle option | mechanics, missions, browser/bundle |
| Title riffed from the source, picked by an RNG | "Bentou 2: Birth of the Lunchbox Assassins" (PLAN.md §1, drawn with `secrets.randbelow(50)`) | title screen |
| Single HTML file named GameTitle-SOURCE-model-timestamp | `../Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-medium-20261103-183420.html` | browser/bundle (file://) |
| Built on the my-3d2dge handoff; engine changes allowed | `engine/` + `engine/PATCHES.md` (9 patches) | all suites |
| Art: engine native style + new assets | Japanese shapes, wall decorators, rigs with masks/hats/weapons, hound, icons, kanji (`20-art.js`, `21-rigs.js`) | screenshots in `shots/` |
| Animation: engine system + new animations | Silent Cuts 5 kinds × 2 characters, grapple, riposte, ninja run, wall hug, swim, eat (`41-actions.js`, `40-hero.js`) | mechanics, missions |
| Audio in code; gibberish voices | layered Japanese-scale songs, SFX, formant voice synth (`10-audio.js`) | browser/bundle (no errors) |
| Online per AI Hub lib/hub | ghost mode 1–4, own card, progress, result, time-up, end (`82-hub.js`) | hub (mock), browser/hub (real harness ×3) |
| Feature-complete demo showing all mechanics | Trial + 3 missions, 4 bosses, escort, timer, 10 tools, 7 enemy kinds, alarm/reinforcements, ranks/unlocks/saves, Shadow Trial, Workshop | missions, systems |
| Dev mode from the pause menu; live sliders with reset | `74-dev.js` (cheats, mission, teleport, debug views, 4 balance pages × 8 sliders) | systems (dev), browser/audit (pause → Dev Mode → slider → reset) |
| Attract mode after 10 s idle; any input exits | `80-autopilot.js` (7 vignettes, autopilot) | systems (3 loops, all vignettes), browser/bundle |
| Narrative tone like the source | `62-story.js` | systems (story flow, ending) |
| Controller-first, 10-foot UI; PS glyphs, Xbox option; KB/mouse native; prompts follow last device | `02-input.js`, patches 1/2/5/6 | systems (input), browser/audit (simulated DualSense, Xbox setting, hover focus, wheel, mouse in Workshop) |
| Touch-only: notice + Settings button; attract still runs | title notice (`71-scenes.js`) | browser/bundle (touch emulation) |
| No TODOs, placeholders, stubs | `tools/build.mjs` fails on TODO/FIXME/placeholder in `src` | build |
| About/Credits with the four sections; exit-interview.json | `90-main.js` About pages; `../exit-interview.json` | systems (About opens), JSON parse |
