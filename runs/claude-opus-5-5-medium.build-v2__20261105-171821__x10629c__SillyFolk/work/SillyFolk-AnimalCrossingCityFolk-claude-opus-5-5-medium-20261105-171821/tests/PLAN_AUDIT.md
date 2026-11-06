# PLAN.md audit: each section, and what shows it is done
Suites are run by `node tests/run.mjs`: sim, play (playthrough), replay, input, browser, hub, visit, sheets. "Eye" means reviewed in a screenshot during the build.

| § | Item | Evidence |
|---|---|---|
| 0, 1 | Title by real RNG; originality rules | RNG run recorded in session; sim "no series names" |
| 2 | Single HTML, engine byte-identical, packs inline, one Game, own collision, pause rule, input map | browser "engine unchanged", "no external scripts"; tools/build.mjs |
| 3 | Two clocks, 16-day calendar, bed options, season card, weather table, day/night, absence | sim calendar/real-clock/weather; play milestone 11; Eye: all seasons, night |
| 4 | 80×64 map, flood fill, hidden edges, terrain chunks, water, worn paths, wind, population | sim flood fill, 80×64, 55 trees, 6 rocks; Eye |
| 5 | Avatar, speeds, targeting, tile highlight, six tools, gag, reveal | play tools; "tile highlight"; browser slider changes speed |
| 6 | Fishing, bugs, digging, trees, flowers, weeds, balloons, shells, stars, snow; 18+18 tables | sim tables; play milestones 2-4, snowman |
| 7 | Debt tiers, store, cheese, Bean Jar, Lost & Found, catalogue, selling gifts | sim debt/cheese; play milestones 6, 8 |
| 8 | Interior, placement, working furniture, 60 items in sets, Bureau by mail | play milestone 6 incl. "Bureau grade arrives by mail"; Eye: Mirror reflects, TV live |
| 9 | Nine neighbours, routines, friendship, memory, favours, letters, Rocco/Fitch | play "a neighbour walks", "nobody in the water", memory line, favours, Rocco checks |
| 10 | Services, museum wings, Chime, patterns on shirt/umbrella/sign/tile, rating | play milestones 5, 9; "pattern as a ground tile"; Eye: fossil hall |
| 11 | Bus and ballad, boulevard, crowd, neon, eight venues | play milestone 7; "bus drives in"; Eye: City day and night |
| 12 | Year table, Vesper, four festivals, three contests | play milestone 10; "neighbours gather for Vesper"; Eye: each festival in flow |
| 13 | Day One script and errands | play milestones 1-2; browser pad-driven intro |
| 14 | Writing volumes and tags | sim 700+ lines (849), per-bank floors, tags resolve |
| 15 | Controls table, glyphs, Xbox option, HUD, screens, touch-only | browser glyphs, mouse icons, keys, pad, touch profiles |
| 16 | Art direction, sheets looked at | sheets suite; Eye: all 97 model sheets (fixed Town Hall flagpole in the chimney, and every two-wedge roof, which formed a V instead of a ridge; all re-checked on sheets and in the village), in game |
| 17 | 45 clips, validateClip, contact sheets | sim clips; Eye: renderSheet sheets (found and fixed HoldUp, Wave, Love arms hidden in the head) |
| 18 | Music at 10%, songs, effects, ambience, voices, singing | browser 10% and Reset, analyser; sim parse/finite/peak |
| 19 | Hub round; Visit over BroadcastChannel and WebRTC; netcode | hub all four scenarios; visit suite; stun_stress.py |
| 20 | Title, attract, pause, settings, dev mode, About, saves, Pimm | browser attract/dev/About; play Pimm, save migration; Eye: all 17 attract beats, credits |
| 21 | Data-driven architecture, test handle, fingerprint | replay suite; `window.__GAME__` |
| 22 | One test command and all suites | tests/final_run.log |
| 24 | Finish checklist | final_run.log; ../exit-interview.json parses; no TODO markers |

## Done differently from the plan's letter
- Module layout is flatter than the §21 tree, and icons are 12×12 drawn ×2 rather than 16×16. Both are decisions §0 lets a builder change ("Numbers are defaults", "Changing a decision: you may"); players can't see the first and the second keeps the plan's big-cell Pockets.
- Composite skeletons are stylised bone shapes in the game's chunky model style, joined piece by piece as the plan asks.
- SpringChain covers tails, ribbons and hanging things (Nib, Bartleby, Yolanda, Ottoline, Flavia, the Mayor's sash), not ears.

## Cannot be done on this computer
Real controllers, TVs, iOS; hearing the audio; WebRTC between two separate networks.
