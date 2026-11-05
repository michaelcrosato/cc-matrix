# TASK.md, line by line: what implements it, and the checks that verify it

All checks run with `node tests/run.mjs --browser` (prints only failures and one count line; 356 pass). Suite names:
requirements (tests/unit/requirements.test.mjs), core, playthrough, systems, net, hub (AI Hub harness), input (real
keyboard and mouse in Chromium). "Manual" marks what only a person can judge; screenshots were used there.

| TASK.md | Implementation | Verified by |
|---|---|---|
| SOURCE: Dragon Quest Builders | Block building, crafting from Notions, rooms typed by furniture, residents and Cheer, Banner and town levels, tools as weapons, a siege, bosses beaten with built ballistas, portals, co-op building | playthrough: every quest M1-M14 and S1-S3, "Chapter clear", "free play continues after the credits" |
| Genre | Sandbox action RPG (block building, crafting, town building) | requirements: TASK perspective; playthrough |
| Perspective | Isometric 2.5D voxel world, 90-degree turns, zoom steps, optional three-quarter view | requirements: TASK perspective; input: "Q / E turn the camera", "= zooms a step at a time", "the three-quarter view draws" |
| Game Title (riff, picked by RNG) | Dragon Quilt Builders (picked by RNG in PLAN.md section 1) | requirements: TASK title |
| Research | None on the web; the engine handoff and AI Hub docs | exit interview: research |
| Package: one html file with the exact name | tools/build.mjs bundles 41 modules + engine + session.js into ../DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-xhigh-20261103-215521.html | requirements: TASK package (3 checks: exists, no external loads, every module bundled) |
| Tech stack: my-3d2dge handoff (may change) | Engine 0.85.2 in engine/, one change marked `// DQB:` (Humanoid sewing-tool weapons) | requirements: TASK tech; core: "no engine errors" |
| Art direction: engine native style + new art | ps1 pixel renderer, quilt block textures, dq* shapes, pixel item icons | requirements: TASK art; screenshots (manual) |
| Animation: engine native system + new animations | Humanoid/Blob rigs, E.MOVES + place/eat/stir/crank/hammer, landing via rig.land, cutscene tweens | requirements: TASK animation |
| Audio: all code, no files; Animalese voices | 14 songs, 13 jingles, 39 sfx, per-speaker gibberish voices, Voices volume | requirements: TASK audio (3 checks), audit: every song / jingle / sound effect used |
| Online: ai-hub lib/hub | Shared-world Quilting Bee, own card, ready, finish, leave, time-up, end, server mode; standalone unchanged | requirements: TASK online (3); net: 69 checks over 2 and 4 copies with latency, loss, server; hub: the harness's 4 scenarios |
| Working environment | Dev files in the subfolder, bundle in the root; servers only on 127.0.0.1:0, own PIDs | requirements: TASK environment; hub: "the served page is this game" |
| Performance (unlimited) | Lights, particles, weather, many monsters | manual |
| Testing: headless, one command, failures + count | tests/run.mjs; scripted full playthrough via game.advance / game.debug | this table |
| Goal / Scope: feature-complete vertical slice | Chapter One (17 quests), 6 regions, 8 room types, 8 monster kinds incl. 2 bosses, siege, free play, Bee | playthrough (88 checks); audit: every item obtainable and used, every recipe learnable and craftable, every monster appears, every object can appear, every block generated or placeable, every quest reachable, every resident complete, every room type buildable |
| Dev mode from the pause menu, live sliders, reset to defaults | Pause menu "Dev Tools": Cheats, Warp, Spawn, Story, Tuning (23 sliders with tracks, reset one, reset all), Debug, World (stamp export/import) | requirements: TASK dev mode (2), audit: every Dev row has an action, every slider read by the game; systems: 16 dev checks |
| Attract mode after 10 s idle, any input exits, may cheat | AI-played vignettes (9) looping on the title/menus | systems: "no attract before 10 s idle", "attract starts after 10 s idle", "plays every vignette", "any input returns to the title", "no save from the attract mode" |
| Multiplayer + standalone | As Online | net: "outside a session the game starts at the title"; hub: "outside a session the game reaches its title" |
| Narrative tone like the source | Punny, warm, earnest residents, silent hero, Granny's golden boxes | manual |
| 10-foot controller-first UI, PS glyphs default, Xbox option | Large panels, one focus per screen, PlayStation glyphs by default, Settings > Button glyphs > Xbox | requirements: TASK ui (3); systems: "gamepad prompts: PlayStation by default", "the Xbox glyph setting" |
| Keyboard and mouse native; mouse aims and clicks, hover moves focus; prompts follow last input | WASD, Space, Shift, J/K or mouse buttons, wheel hotbar, Q/E camera, F talk, Tab bag; mouse cursor targeting; hover focus | input: 15 real-browser checks; systems: "keyboard prompts are keycaps", "mouse prompts show the mouse button", "the mouse wheel cycles the hotbar" |
| No dense web-style data screens | Satchel, Craft, Chest, Map, Journal, About with large type and paging | screenshots (manual) |
| Touch-only: no touch controls, notice + settings button, attract runs | "Controller or keyboard required" panel on the title, engine corner settings button | requirements: TASK touch; systems: "touch-only: the title shows the notice", "no touch controls on any scene", "the attract mode still runs" |
| Done: no TODOs, placeholders or stubs | Word scan, empty-body scan, and the content audit (each audit plants a probe with AUDIT_PROBE=1 and must catch it) | requirements: TASK done + 17 audit checks |
| Source Information + feedback in chat and About/Credits | About screen pages from exit-interview.json embedded at build time | requirements: TASK source information (3); systems: "About has every page", "About shows every Source Information field", "About shows the exit interview's answers" |
| Exit interview JSON, exact shape | ../exit-interview.json | requirements: "the exit interview has the exact shape, every value filled" |
