# Authoring another county road

All coordinates are world units, x east, y south. The view remains north-up. A vehicle heading is radians, zero east. Roads use native E.Path and a 16-unit sample interval; road.width is the full paved width.

1. Add a circuit object in src/data.js with unique id, name/sub/landmark/region/color, width at least 40, at least six [x,y] control points, at least four directed gates, a version number, and three per-lap medal times. The loop closes automatically. Avoid a corner radius much smaller than 90 units unless deliberately slow.
2. Add a connector with points and width to M.CONNECTORS so the entrance joins the region. Connector endpoints should be actual road control points. Free drive navigation builds its graph from these lanes; the graph-connectivity test must pass.
3. Authored shared routes can use pieces: a road ID plus from/to control-point coordinates, or a via array for a new link. The grand circuit demonstrates exact base-road reuse, including a distinct start coordinate. This avoids drawing separate approximate splines on the same road.
4. Put landmarks in M.BUILDINGS and define their native shape in art.js. Keep a visible collision footprint clear of road and restart slots. Lakes belong in M.WATER; paved roads bridge them, grass shoulders do not.
5. Gate count distributes finite forward-facing gates by route distance. Each gets an anchor 18 units beyond it. For difficult or overlapping sectors, increase gate count and inspect the gate overlay. Every anchor and both side-by-side slots are validated against scenery/water. Never use global nearest-road progress in race rules.
6. Run node tools/test.mjs sim. Every course is driven by every car through the real physics and gate rules. Inspect docs/evidence/ai-laps.json for times, crashes and first illegal transitions. Use pause → Dev mode for gate/collision overlays, AI driving, free camera, live balance and restart-at-gate tools.
7. Increment circuit version when geometry, gates or legal edges change. Increment MM.PHYSICS when handling/rules change so existing records/ghosts cannot silently compare incompatible runs. Author a tour stop in M.TOUR if it teaches a useful new road mechanic.

Cars are objects with id/name/color/stripe/profile/physics, three comparison bars and a short sentence. top, accel, brake, turn and grip are physical values. The tan/blue pair intentionally references one frozen physics object. Change that shared object to keep both matched. Live tuning multiplies the profiles rather than editing them.

The demo currently authors five circuits. Selectors and simulation are data-driven; selectors and invitation bounds derive from the data; update catalogue, tour/attract copy and acceptance expectations as appropriate when adding roads. The build rejects invalid source schemas before emitting HTML.

No editor or asset downloads are needed. Native E.SHAPES, materials and procedural animation remain ordinary inspectable code. Native engine and Hub references are pinned; record any revision change in research.md and recheck its contract before replacing the imports.
