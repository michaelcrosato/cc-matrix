# PLAN.md audit (written from the code, section by section)

Status key: DONE = built and covered by a test or a screenshot; PARTIAL = built in a smaller form; NOT = not built.

| Plan section | Status | Notes |
|---|---|---|
| 1 Game, pillars, originality | DONE | Original species/names/tunes; source named only in About. |
| 2 Engine/packaging, rules | DONE | Single HTML, engine byte-identical (tested), hub meta tags, one scene, own tile collision. |
| 3 Time, calendar, weather | DONE / PARTIAL | Both clocks, calendar, bed options, season card, absence, weather table, rain/snow/fog/storm flash, rainbow, hourly bell. Puddles and drifting cloud shadows built (seen only in tests, not by eye). |
| 4 Village | PARTIAL | 80x64 map (island, river, pond, sea, bridges), worn paths, waterfall, smoke, 78 trees. Two raised areas: the Lookout hill and the upper terrace carrying the Museum (+2 m, cliff faces, ramps; walked in tests, seen in screenshots). |
| 5 Avatar, movement, tools | DONE | Four speeds, six tools, bare-hand verbs, targeting chevron + prompt, mouse hover/click. |
| 6 Things to do | DONE / PARTIAL | Fish 17+boot, bugs 18, fossils 10, art 8, digging, trees, wasps, flowers/hybrids, balloons, shells, stargazing, snowmen. Dug fossils arrive as Mystery Lumps and Dr. Quill identifies them (tested). |
| 7 Money | DONE | Debt tiers, store (3 exterior tiers), cheese market, Bean Jar, selling gifts, catalogue. |
| 8 Home | DONE / PARTIAL | Placement, wallpaper/floor, lamp/stereo/TV (live feed)/mirror (real Mirror)/tank/cage/clock/toilet, Bureau rating. Fish tank and bug cage show up to three of your caught fish or bugs swimming or fluttering (not visually checked); the mirror reflection was verified in a screenshot. |
| 9 Neighbours | DONE | 9 neighbours, routines, friendship, memory, letters, favours (12 templates), move-out/in, bubbles. |
| 10 Town services | DONE | Store, Hall and Post (jar, Lost & Found, chime, rating), Mayor, Museum with four wings, Mothwick's with patterns. |
| 11 The City | DONE | Bus ballad, boulevard, neon, bloom, crowd, pigeons, 7 venues + fortune tent. |
| 12 The year | DONE / PARTIAL | 16 days, four festivals, three contests, Vesper, cheese, Rocco story, ending. Each festival has bunting on its day; the Long Night has the sun setting at 16:00, light strings on every door, and Rocco rolling in; the Lantern Float sends 160 lanterns. Every awake neighbour joins in (dancing, waving, eating, swaying with sparkles) for the length of each festival and returns to routine after. |
| 13 Day One | DONE | Bus conversation, mirror, seven errands, evening beat. |
| 14 Writing bible | DONE | Dialogue banks reach the 700-line floor (hand-written plus composed greeting lines per neighbour type). |
| 15 UI and UX | DONE / PARTIAL | Glyph prompts per device, Xbox option, touch-only notice. The tool ring pops around the avatar while cycling (screenshot checked). |
| 16 Art direction | DONE / PARTIAL | Critters (27 species), trees, houses, props, fish, boot, nine bug shapes, six tools and two fossil skeletons are ModelDefs (30 sheeted, 0 problems); paintings are pixel TextureDefs with a forgery mark. Lanterns, balloons, the snowman and single fossils are ModelDefs too (34 sheeted, 0 problems). |
| 17 Animation | DONE | 44 clips, mixer, squash, blink/talk. Tails are a pivot joint driven by a damped spring (turning and idle sway), not the engine's SpringChain class. |
| 18 Audio | DONE | 10% music, hourly tunes with rain/snow variants, venue/festival songs, 40+ SFX, 8 ambience loops, formant voices. |
| 19 Multiplayer | DONE / PARTIAL | Hub round passes the harness; Visit over BroadcastChannel and WebRTC invite codes tested between browser sessions and processes (no second computer here). |
| 20 Shell | DONE | Title, attract (10 s), pause, settings, dev mode with 23 sliders, About, saves, Pimm. |
| 21-22 Architecture, testing | DONE | Data-driven; sim, play, browser, hub, visit, sheets suites behind `node tests/run.mjs`. |

## Checked by script instead of by eye or ear
Gold Bell colour, lemur tail swing, tank critter count, puddles in rain, cloud shadows on sunny days, river loudness near the bank vs far away, surf on the beach (all in tests/play/playthrough.mjs). Mirror reflection, TV feed, rainbow, fog, waterfall, hill and species silhouettes were checked in screenshots.

## Still not built
Nothing further from the festival list (ours are shorter); Visit tested only on this computer (no second machine).

## Line-by-line check of the plan's smaller promises (done this round)
Coffee buff now ends at noon (tested). Fortune luck now raises rare-fish odds, buried-treasure finds and friendship gains. Knocking on a sleeping neighbour's door gets a sleepy complaint (tested). Settings Picture (quality, pixel size) now drives the engine's own settings (quality, fine/chunky).
Store hours (8 to 22) enforced, wing plaques with a misspelled name, running tramples flowers, squash on stopping, a turntable spin in the salon preview, and host cameos (Old Rind at his stall on Market mornings, Vesper hanging from the plaza lamp on Show nights; Vesper seen in a screenshot).
Constellations can be renamed in the Almanac Stars tab (tested).

## Sentence-by-sentence pass over sections 3 to 15 (this round)
Read against the code and fixed what did not match: rain now waters flowers; felled trees leave stumps the shovel removes; Real Clock contests start on the plan's date rule; Clementine asks for the Chime on Day 3; furniture count 47 (floor 40); Bureau result arrives by mail after Show Days; Dr. Quill mails thanks; the Mayor visibly advances each day; right stick turns the camera and zooms; the tool box is clickable; the camera eases to zoom 2 in dialogue.
Then also matched (tested): frosted windows in winter (cottages now have side windows), moving boxes at Rocco's door before he leaves, mushrooms at the woods' edge from Day 10, snow footprints.
Sections 16 to 20 read sentence by sentence: added a bird flock, a street musician, Mayor Trundle sliding, pick-up squash, HONK sound for Mrs. Gander, double-speed Pemberton and slow Lou speech, and Vesper singing.
Sections 21 to 24 read sentence by sentence: added `ui.model()` to the test handle (screen, focus, prompts), a determinism test (same inputs reach the same fingerprint), fish rings on the water, a dotted highlight on the target tile, and the Mayor sliding to the ribbon on the spring Festival Day. File names in section 21 differ from mine (one module per area rather than the plan's folder list); the architecture (one world JSON, systems over it, data tables, screen stack) matches.
Still not matched: nothing from the plan's sentences that I could identify, beyond the hardware limit (Visit on two real computers) and the art being code-built rather than every asset a ModelDef.

Sections 1 and 2 read sentence by sentence this round: typed characters and the real-clock reading now go through input.send (so recordings replay them); everything else in them already matched (packaging layout, engine start options, one scene, own collision, pause rule, input map, text, rigs, occluders, session quality).

## Seen in screenshots this round (not just scripted)
The net in the avatar's hand; the dotted target-tile outline on the grass; moving boxes at Rocco's door; festival bunting; the plaza crowd on Great Soup day (neighbours dancing, waving, eating, a chat bubble, falling leaves, the "Join the Great Soup" prompt); snow and the Roll a snowball prompt in winter. Not seen: fish rings (off-screen in my shot), footprints (too faint to judge), the City musician (hidden behind the tent), the birds, tail motion, cloud shadows, and anything that needs ears (ambience, voices).

Room shells (floor, back walls, window, mat; resized and recoloured for the home by wallpaper, floor and tier) and City shopfronts are ModelDefs now (36 sheeted, 0 problems; seen in screenshots). Not ModelDefs: the neon signs (built from the bitmap font by design), the City crowd and venue hosts (critter generator, which is a ModelDef builder), and the venues' small props.

## Checked by eye and by ear in the last round
Screenshots: fish ring on the water (faint), winter footprints (light-blue prints on snow), a cloud shadow over grass, the clothesline, bird specks overhead. By ear (Web Audio analyser in Chromium): ambience is louder at the river than far from water (tests/browser.mjs audio).
Not checked: tail motion in movement, the City musician in view, voices by ear beyond the analyser level checks.

Seen in a City screenshot: the street musician (moved out from behind the fortune tent) with his ringed tail swung out, and the crowd. Remaining unseen: nothing from the effects list except motion over time (a screenshot is one frame).

## Final status
Shop shelves, counters, the theatre stage, auction seats and museum floor pads are ModelDefs now (sheets check OK, 41 drawn). A spoken line was measured through an analyser (audible peak). Full suite: 482 checks, 0 failures. Every PLAN.md section 1-24 has had its sentence-by-sentence pass (recorded above). What stays unverifiable on this computer: Visit on two physical machines, listening to voices by ear, and judging motion over time by eye. Neon signs use the bitmap font on purpose; a few one-off decor boxes (mailbox, lost-and-found cabinet, trophy/table set pieces) are still primitives.

Update: mailbox, lost-and-found cabinet, tables and trophies are ModelDefs too (45 drawn, 0 problems; suite 482/0). Only neon signs (bitmap font by design) and chairs/scope/board/rug set pieces remain primitives.

Update 2: chairs, scope, board and rug set pieces are ModelDefs (50 drawn, 0 problems; suite 482/0). Remaining primitives: neon sign lettering (text-dependent, bitmap font), street furniture boxes in the City and generic crates.

Motion over time is now a test (tests/play/motion.mjs): leg and arm swing ranges while walking, travel, and settling when still.
