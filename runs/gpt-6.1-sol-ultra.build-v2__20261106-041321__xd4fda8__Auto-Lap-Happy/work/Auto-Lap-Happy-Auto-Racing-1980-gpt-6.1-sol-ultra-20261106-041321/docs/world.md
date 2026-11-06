# Countryside authoring

The original world is defined in `src/world.js`. `new HappyWorld()` creates five closed `E.Path` circuits, seven open connecting lanes, the airfield straight, scenery, collision circles and a separate navigation graph. Distances are world units; 16 units is the engine's nominal metre. North is negative y. Coordinates remain bounded in one connected region; there is no wrapping seam.

## Add or change a course

Edit `COURSE_DATA`. Each entry needs a unique `id`, player-facing `name`, one-sentence `subtitle`, hex `color`, **half-width** in units, `landmark` name and an ordered array of `[x,y]` control points. Controls follow the legal forward direction. The path closes automatically; do not repeat its first point at the end. Avoid a very short final segment adjacent to a long first segment: Catmull-Rom overshoot can create an unintended kink. Use evenly spaced points around bends, then drive every profile.

Construction derives these fields:

- `path`: native engine `E.Path`, closed and Catmull-Rom smoothed.
- `length`: exact native path length.
- `samples`: points at most 14 units apart, each `{x,y,angle,d}`; includes one closing point at `d=length`.
- `gates`: twelve directed checkpoint objects, each `{x,y,angle,d,index}`, in forward order. Gate zero is the start/finish. `restartAnchors` use the same positions.
- `version`: increase when changing route geometry so stored record compatibility can be invalidated.
- `medals`: illustrative time targets derived from route distance; simulation rules own actual completion.

After editing, call `world.validate()`. It returns an array of errors and checks finite data, route size, road surface at gates, and safe gate clearance. Also run the final game test command, which exercises legitimate car motion and lap gates. Nearest-road lookup is a **surface** query; it must never decide competitive route progress. Use the simulation's local segment projection and ordered directed crossings for that.

## Connectors and free-drive navigation

Edit `CONNECTOR_DATA` with open control-point lists, half-width and a readable name. Connect ends to actual roads. The Kingfisher Causeway is an intentional narrow optional crossing through water. It is a free-drive connection, never a legal shortcut in a circuit event.

`world.routeBetween(from,to)` accepts either `{x,y}` objects or `[x,y]` arrays. It returns `{path,points,samples,length,destination}`, or `null` when no connection exists. The lazy navigation graph samples road nodes about every 62 units and joins near road intersections. Edges are bidirectional for permissive exploration. It has no authority over checkpoint legality. For the guided tour, the orchard paddock to the lake paddock route is approximately 3,248 units and stays on road throughout.

`HappyRenderer.draw(r,sim,{navigation})` accepts that route. Alternatively assign it to `sim.navigation`. In free drive it paints a dotted cream guide and destination marker.

## Surfaces and scenery

`world.surface(x,y)` returns `road`, `gravel`, `grass`, or `water`. Road surfaces take priority over water, giving authored causeways a consistent footprint. Each road has a thirteen-unit gravel shoulder. Additional gravel patches sit around the woodland hairpin and old airfield. Water ellipses are explicit data.

`world.nearestRoad(x,y)` returns `{distance,road,d,x,y,angle}` using a local segment grid. `distance` is from the road centreline; choose the road by closest **edge** so a wide nearby road wins correctly.

`world.addProp(kind,x,y,options)` refuses water and the road plus its shoulder clearance. Props have native engine shapes, per-prop seeds, optional scale and facing. Solid props also create `{kind,x,y,r}` collision circles. Keep rendered footprints and circles comparable; fences and route signs deliberately sit outside driving lanes and are decorative.

Scenery randomness uses a seeded stream distinct from competitive simulation. The renderer creates five original car bodies/liveries; native wheels, driver helmets, route signs, barns, club hut, boathouse, lookout, windmill and hangar; native library trees, bushes, rocks and fences supply generic scenery. No source-game artwork or traced course geometry is used.

## Rendering and motion

`new HappyRenderer(game,world)` provides `update(dt,sim)` and `draw(r,sim,options)`. It uses only native engine pixel primitives, depth queues, materials and `r.shape`. Cars expose ordinary `E.Car` fields plus `profile` in 0–4, `crashed`, `immunity`, and optionally `steer`. If steer is absent, wheel steering derives visually from heading changes. Renderer state never changes the car's authoritative simulation.

Roads have textured asphalt, directional arrows, dashed centre marks, red/cream kerbs, gravel shoulders and checked start lines. Animation uses continuous values for steering wheels, wheel rotation cues, suspension bob, body slip/lean, moving flags, windmill blades, dust, gravel spray, skids, impact stars and water splash. The engine's `reduceMotion` suppresses body bob, immunity blinking and crash flash. Smoke and particles remain informative at low amplitude.

`draw` options include `menu`, `dev`, `ghost` and `navigation`. Dev shows checkpoint lines and visible collision circles. Ghost draws a translucent native car and has no collision or gate effect.

## Verification from this build

Native headless `E.Game({headless:true,draw:true})` rendering completed with no errors. File-URL Chromium screenshots cover meadow start/bend, orchard, lake, woodland and grand sectors. A visual inspection found the engine's shape-facing normalization needed the car heading directly; the incorrect quarter-turn offset was removed. A legitimate AI lap exposed an overly short meadow closure control, which was removed; the red reference car then completed the course legally in 38.275 seconds. The schema validator reports zero unsafe gates. Profile/course run evidence is saved under `evidence/world-profile-results.json`.
