# Dragon Quilt Builders: dev log and module API notes

Build: `node tools/build.mjs` -> ../DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-xhigh-20261103-215521.html (+ dev/index.html).
Tests: `node tests/run.mjs [--only a,b] [--browser]`. Screenshots: `node tests/browser/shot.mjs dev/index.html#... out.png [wait] [w] [h] [stepsJSON]`.

## Engine changes (`// DQB:` in engine/my-3d2dge.js)
1. Humanoid weapon kinds 'needle', 'club', 'bodkin', 'ripper' (sewing tools), drawn on the blade joints.
(Custom views are game code: E.VIEWS.iso / threequarter replaced with pixel-exact zBoosts in src/11.)

## Decisions
- Views: iso block = 32x16 top, 20 px tall at zoom 1; zoom steps iso [.75,1,1.25,1.5,2], 3/4 [2/3,1,4/3,5/3,2].
- Atlas per (view yaw, pitch, scale); world-space top textures; side faces left .8 / right .62 brightness.
- Runs queued as occluders at (cx*16+8, cy*16+8, z0*16); world._liftOrder lifts/sinks actors per column runs.
- Knot Wall is block 'knotWall' (unbreakable); only the Gate (x99-100, y112-114, L9-13) is 'knot' (Seam Ripper).

## Module APIs (keep in sync)
- 00 core: DQ.hash, hashStr, h01, rng(label, seed), Events (on/emit), DQ.safe(text), DQ.store, DQ.tuning.get/set/reset, DQ.tune(k), DQ.newCtx(game, mode, o), DQ.devFlags()
- 01 blocks: DQ.BLOCKS[id] {key,name,hp,tier,drop,placeable,solid,opaque,liquid,light,shape,top:[pat,color,acc],side}, DQ.blockId(key), SOLID/OPAQUE/LIQUID/STAIR tables, AIR=0 WATER=13 BACKING=1
- 02 items: DQ.ITEMS[id] {kind: block|mat|food|weapon|body|shield|use|key|obj, cat, block, obj, food{belly,hp}, weapon{atk,blockDmg,tier,speed,rig,color,knot}, def, icon{rows,pal}}, DQ.RECIPES [{id, station, in, out, n, notion{on,key,level}, alt}], DQ.STATIONS
- 03 objects: DQ.OBJECTS[id] {shape, solidH, cells, door, hp, light{r,i,color,z,flicker}, tags[], station, bed, seat, chest, trap, ballista, banner, portal, cage, plant[[item,min,max,chance]], collect, bundle, crate, deco, removable, item, h, draw}
- 04 rooms: DQ.ROOMS (priority order) {id,name,need{tag:n},pattern,min,max,cheer,maxAwards}, DQ.LEVELS[1..5] {cheer, r, unlocks, arrives}
- 05 world: DQ.WORLD {W,D,H,seed, regions, poi, portals, buttons, town, stamps, patterns{hall,barn1..3}, demoRooms}
- 10 VoxelWorld(W,D,H,{events}): get/set(x,y,z,id,{by,silent,rot,town}), rot, solidAt, topZ, canStand(x,y,L), groundAt(px,py,r,z,step), ceilingAt, collide(body), blocksBody, escape(body), raycast(o,d,maxT,hit), sight(a,b), pickScreen(view,px,py,cut), bounds(view), diff/applyDiff, hash, damage(x,y,z,amt,now)->{broke,frac}, healDamage(now), objIdx Map idx->obj, flagTown Set
- 11 VoxelRenderer(world): col(cx,cy) {runs,lift,stairs,water,light}, isCut, queue(r), cut={L,x,y,rad}, ghosts Map idx->{block|obj,done}, cubeEdges(r,x,y,z); DQ.atlasFor(view); DQ.blockIcon(id) (canvas 18x20); DQ.ZOOMS
- 12 worldgen: DQ.generateWorld(w, def) -> {objects:[{id,x,y,z,facing,portal}], poi{...,L}}, DQ.WG.column/tree/stamp/recalc, DQ.stampTownRooms(w, objs, stage)
- 13 VoxelBody {x,y,z,vx,vy,vz,r,h,step,gravity,onGround,fly,blockDoors,inWater,fell,lastSafe}: update(dt,w), jump(v), push, toSafe(), cx/cy/L
- 14 input: DQ.Controls.PLAY/MENU/NAMES, install(game), intent(game,ctx,dt), blank(), wheelSteps(), mouseActive(game); DQ.Glyphs.draw(g,game,action|'@Code',x,y), width, text(g,game,'{btn:swing} Break',x,y,color), measure, plain, family
- 16 inventory: DQ.Store(n) count/add(->left)/remove/free/ids/serialize/load; DQ.Bag (40, keys, hotbar[8], infinite, has(req), autoHot, setHot, materials()), DQ.storeAll(bag, store)

## Progress log
- All modules written (00..99). Deep link: dev/index.html#play[:beat] | #bee | #attract | #about.
- tests/unit/core.test.mjs (58 checks) and tests/play/playthrough.test.mjs (88 checks) pass. PT_UNTIL=M4|S1 stops the playthrough early.
- Bugs found by tests so far: Walker.steer infinite recursion (A* every frame; 80x slowdown + stack overflow), quests.wire() never called,
  drops out of pickup range for the AI, cutaway invalidating explicit targets, x-ray mask missing tall runs (engine guesses a 120 px box:
  runs now pass an exact `box`), stair ramp needs the leading edge, AI stood on wall tops, AI blocked by an open modal dialog.
- Cutaway = roof radius (6.5) + a see-through slot toward the camera for tall terrain in front (the Hollow rim, crags).
- Autopilot: autoTalk (reads dialogs; Play.update calls ai.readTalk), collect() walks over drops, fails fast out of reach.

## Issues found (the exit interview's counts come from this list; * = critical / game-breaking)
Caught by the scripted tests (headless suites, network suite, browser checks): 21
1. * Module load order: DQ.CUTSCENES / DQ.SCENES used before they were defined (the game did not boot)
2. 'Mouse2' read as an action name (it is a held code)
3. The wake cutscene's dark overlay drawn over its own dialog
4. Story-beat setup firing cutscenes and popups (now ctx.quiet)
5. * The Builder hidden behind tall voxel runs (engine x-ray guessed a 120 px box; runs now pass an exact box) and the Hollow rim (cutaway slot)
6. Lighting set with a colour where the engine takes a number (tint) and arrays (dark)
7. Stair ramps evaluated at the clamp point instead of the leading edge
8. * Walker.steer recursing (A* every frame): stack overflow and an 80x slowdown
9. * quests.wire() never called: the story could not advance
10. Drops landing out of the AI's pickup range
11. Cutaway invalidating explicit break targets
12. The AI blocked by an open modal dialog
13. The AI standing on wall tops
14. * A Cheer bubble collectable forever (fly = 0 read as false)
15. Door state read from the tween instead of isOpen
16. touchOnly reading navigator in Node
17. The Bee reading an undefined poi.tunnelMark
18. * The host's own edits never broadcast (multiplayer desync)
19. A player who left re-created by a late packet
20. Demo rooms' furniture blocked by wild plants after a story-beat jump
21. * Optional cutscene apply: a quiet quest completion still called apply directly (boot error), caught by the next run
Caught by screenshot review: 14
22. Cheer badge shown before it means anything   23. Non-modal dialog over the HUD   24. Bee HUD offset   25. Town badge in the Bee
26. Pattern panel width   27. Satchel tab glyph position   28. Bag action row not following the selection
29. Quest tracker covering the health bar   30. Siege banner bar label cramped   31. Used-up Heartpatch left on the hotbar
32. Dev Tools title under the corner buttons   33. Prologue prompt row clipped   34. About tabs past the right edge
35. Tuning rows without slider tracks
Found by reading code after a screenshot: 1
36. Enter (OK and Start on a keyboard) both turned and skipped the prologue pages (now a browser check)
Found by the stub scans (TODO words, empty bodies, unused values): 4
37. The Bee's crafted() hook did nothing and clients never sent their crafts (now a network check)
38. The Builder's landing squash was set but never drawn (now the rig's land() and a jump stretch)
39. Skipped cutscenes left the training dummy, a scripted resident, or no arrival / skill note (now a systems check)
40. Dev rows whose OK action was empty (OK now steps the value)
Found by the content audit (tests/unit/requirements.test.mjs: everything defined must be reachable and used): 3
41. The Golden Thimble (a side-quest reward) did nothing though it promised courage: now +2 attack while carried
42. The 'undone' jingle was never played: now plays when the Builder comes undone in the story
43. The rock decoration was defined but never placed: now scattered on the Crags and the Coast (own RNG stream)
Total 43; critical 7 (1, 5, 8, 9, 14, 18, 21).
Test-script fixes (not game bugs), made when the rocks changed the world: gatherPlant skips a target it already tried;
M3 gathers its own Lint before the torch; the boss fight's fallback ballista searches for a free cell with a clear line.
REQUIREMENTS.md maps every TASK.md line to the checks that verify it.
