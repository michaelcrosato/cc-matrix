# Scene implementation

`scene.js` exports `HockeyScene(renderer)` with `scene`, `camera`, `resize(width,height)`, `update(snapshot,dt)`, `burst(x,z,type,team)` and `setTheme(index)`. The module imports Three.js through the `three/webgpu` and `three/tsl` import-map aliases.

The scene uses native Three.js TSL MeshBasicNodeMaterial shaders with three discrete normal/light bands, inverted dark ink hulls, a fixed elevated orthographic rink view, and original procedural geometry/textures. No downloaded or generated bitmap art is required. CanvasTextures contain the skate-scratched ice, original center crest, rink advertisements and jersey numerals.

Skaters use Three.js AnimationMixer, AnimationClip and NumberKeyframeTrack clips for skating, shooting/passing, checking and celebrating. Player angles are radians: zero faces positive x, pi/2 faces positive z. The final snapshot `players` order is team 0's two skaters followed by team 1's two skaters. Actions `shot`, `shoot`, `pass`, `check` and `celebrate` are supported; monotonically changing `actionId` restarts actions. Goal phase triggers three native celebration loops for the scoring team.

The ice interior is x ±18 / z ±10, with six-unit-wide net openings at x ±18. Rounded corner boards are decorative. Scene themes change the arena background tint; the parent game changes AI, tempo and opponents independently.

## Verification

Isolated Chromium check ran with Three.js 0.180.0 and actual WebGPUBackend enabled. No page errors occurred. Headless WebGPU screenshot was solid background, consistent with the supplied environment limitation. The same scene was rendered through WebGPURenderer's WebGL backend and visually inspected at 1600×1000: rink, markings, players, puck, selection rings, net weave and spectators rendered correctly. Native animation clips updated without binding warnings. The scene-dev check is a development-only visual probe; the parent game test runner owns final validation.

## Primary implementation references

- Three.js r180 MeshBasicNodeMaterial source: https://raw.githubusercontent.com/mrdoob/three.js/r180/src/materials/nodes/MeshBasicNodeMaterial.js
- Three.js r180 TSL exports: https://raw.githubusercontent.com/mrdoob/three.js/r180/src/nodes/TSL.js

No engine modifications.

Final assembled HTML was visually checked through file:// with `?webgl=1` at 1920×1080. The title, quick match/face-off, and goal celebration screenshots showed correct scene composition and UI clearances. No page errors occurred. A renderer sample reported 130 render calls, 134 geometries and 20 textures; this is a sample, not a prolonged memory-leak assessment. Saved images: `scene-dev/final-title.png`, `scene-dev/final-play.png`, `scene-dev/final-goal.png`. The visual QA browser was closed after capture.
