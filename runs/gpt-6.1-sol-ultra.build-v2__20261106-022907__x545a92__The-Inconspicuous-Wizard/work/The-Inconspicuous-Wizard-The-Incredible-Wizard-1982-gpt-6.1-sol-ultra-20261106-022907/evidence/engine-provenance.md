# Engine provenance

- Engine: my-3D2dge v0.89.1, full readable distribution.
- Repository: https://github.com/michaelcrosato/my-3d2dge
- Pinned commit: 8ecc2f62353761187bdfe226f327b7ea5d2eb691
- Vendored file: vendor/my-3d2dge.js; unchanged engine code at initial vendoring.
- Reference read: full handoff README and API card, full docs/ASSETS.md; relevant AI_GUIDE sections on visual craft, animation, scenes, camera, frame order, rigs, native shell, testing, authored content architecture; ARCADE kit used as shell/maze pattern reference. Source-specific actors/assets are new code in src/render.js.
- Native tools used: E.Game/TileMap, E.Humanoid custom weapon extension, E.Blob continuous locomotion/squash/wing animation, E.SHAPES/E.MATERIALS, native render queue/decal/light/particle primitives.
- Generic assets: core engine procedural lantern prop only. All wardens, lantern rifle, hunter family extensions, familiar mask, Wizard styling, bell, portal architecture, floor ornaments and signature effects are original code-native art.
- Native map tile centers are (cell+0.5)*16. The simulation uses integer cell centers; renderer owns the explicit conversion.
- Camera: topdown only, fixed framing fitted to the full 19×13-cell chamber, player zoom disabled by scene. Low cutaway walls preserve lethal lanes.
