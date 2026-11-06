# Bespoke garden rigs

`src/view/rigs.js` exports `GardenRigs(game)` with the complete shared contract. Full pinned my-3D2dge remains unmodified.

- Native E.Blob squash springs, smoothed gaze and foot motion form the animation basis. Additional code draws leaf caps, scarves, jaw/teeth, antennae, segmented feet, moth wings, beetle shells, fruit and diamond targets.
- The overhead world uses an explicit native E.View at pitch 30 only within creature drawing. The engine deliberately leaves overhead Blob faces top-down; this local sprite view keeps faces readable while collision/camera stay overhead.
- Keeper is blue; partner coral. Head has a broad dark jaw and independent hooked antennae. Final tail is warm lobed fruit plus a hovering diamond and floor ring. Sentries use moth fans vs beetle legs; fright adds gasp, sweat and trembling, while caught sentries have closed eyes and orbiting stars.
- Trees, bait sprouts, wrap mouths/letters and reactive miniature spectators are all new pixel code. Three-tone shading, native contact shadows and small lights remain consistent with the engine.
- `drawActor` options support `index` (hero seat/body/sentry index), `key` (unique body state), `tail`, and `theme`. For crawler bodies use `key: crawler.id + ':' + body.index` to share the states created by `update`. Coordinate conversion is `(cell + .5) * 16` once in drawActor; all prop methods accept world units.
- Reduced motion lowers secondary motion and invulnerability shimmer. Head warning/teeth, tail diamond, frightened gasp, and spin remain readable.

Validation: native headless E.Game(draw:true) exercised all four kinds, tail, head warning/chew, fright, spin, respawn, tree, bait, wrap and spectator over two simulated seconds without errors. A Chromium in-memory rig sheet was visually inspected at 1024×576; increased moth fan width after inspection so it stays distinct from the beetle. No physical display/device coverage is claimed. The initial syntax check caught and fixed one stray ternary colon before these checks. Body `brush > 0` is accepted as an optional nonlethal squash cue.


## GardenView integration

`GardenView(game, rigs)` implements `fit(view,{title,workshop})`, `draw(r,view,{hud,debug,workshop})`, `cellAt(x,y)` and `effects(event)`. `bounds` includes x/y/w/h and x0/y0/x1/y1. Portrait title bounds center at .47H; landscape title uses the right 58%. Workshop reserves a right tool panel or bottom portrait panel. Debug grid, paired wrap graph, targets, body history and hitboxes use the real graph without drawing wrap edges across the maze.

Five jewel palettes get contiguous beveled hedges, textured lanes, low foliage, outside-only spectators and props: spore plants, amethyst crystals, orchard berries, blueberry mushrooms, and velvet gala flowers. Native particles present bites/catches/tree points, wraps, life loss and celebrations. The HUD adds a compact authored course counter when garden.courses > 1.

Verification: 30 native renderer/layout checks cover all five gardens in normal/title/workshop at 512×288 and portrait390×844, including screen-to-cell mapping. Two additional focused checks exercise soft body brushing and continuous victory animation after simulation stops. Chromium compositions inspected at1280×720 and390×844. The narrow DPR1 test found native Screen clipping with a512-pixel minimum; configuring `portrait:{res:[360,288]}` fixes it without editing the engine, and the corrected composition was inspected. Parent informed; final assembled integration remains parent-owned.
