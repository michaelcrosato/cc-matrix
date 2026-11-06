# Native asset vocabulary

All game pixels use E.px, E.font, native shapes and the native actor/decal queue. No raster art or recorded audio is loaded.

Ivory / gold `#fff5cb #f5d47a #73502b`: player 1, square centroid.
Mint / pearl `#effff0 #b9decf #3a6460`: player 2, diamond centroid.
Copper `#bd8057 #f4c086`: round two-antenna Leftenant; left arrow and opposite gait.
Jade `#548d80 #a9d2b5`: angular leaf-antenna Righto; right arrow.
Scout sage `#95b57f`: loose five-insect cluster.
Guard periwinkle `#9bb3d4`: seven-insect orbit.
Hunter coral `#e89280`: pointed nine-insect pursuit wedge.
Shell wax `#c7bf8a #9c9d7b #535b51`: settled solid footprints, cracked highlights.

Three low-contrast floors and perimeter palettes are in content/stages.js. Bright values belong to actors, readable warnings and charges. Wings and feet decorate; only the authoritative formation/body footprints deal contact. Scenery outside the arena may sway; collision geometry is never animated by drawing.

`rigs.js` extends E.Blob's state-driven springs and wing clock with segmented abdomens, striped bodies, antennae, paired wings, little feet and distinct anatomical silhouettes. Recovery, recoil, focus, collapse, maturation, pulse, exposure and replenishment derive from simulation flags/events. Fixed beds, clockwork dial and dew entrance jewels are E.SHAPES entries with native materials.
