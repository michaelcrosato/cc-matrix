# Changes to my-3D2dge v0.85.2 made for CRACKMANIA

Each change is marked `CRACKMANIA (En)` in the source.

| # | File | Change | Why |
| --- | --- | --- | --- |
| E1 | `my-3d2dge-3d.js`, `class Pen` | `pen.frame(x, y, z, f, r, u, k)`: the pen's frame from orthonormal axes | draw a car in any orientation (upside down in a loop) without Euler angles |
| E2 | `my-3d2dge-3d.js`, `Camera3D.place()` | a pose may carry `up: [x, y, z]` (engine axes) and `look: [x, y, z]` (a point); roll is skipped when `up` is given | a chase camera that follows the car round a loop; poses set as a look-at |
| E3 | `my-3d2dge-3d.js`, `makeBatches()`, `Pen` | a second set of tube / ball / box / cone batches in a translucent toon material (no outline shell); `pen.ghost = true` routes parts into them | translucent ghost cars; made with the world, so no shader is built mid-game |
| E4 | `my-3d2dge.js`, `Input.tick`, `Input.analog()` | the pad's button values are kept (`padValues`); `input.analog(action)` is the strongest of the action's codes (an analog trigger's value, 1 for keys) | analog R2 / L2 throttle and brake |
| E5 | `my-3d2dge.js`, input + settings | PlayStation glyphs by default; the Button symbols setting offers PlayStation and Xbox and applies to every player | TASK.md: PlayStation glyphs, Xbox as the option |
| E6 | `my-3d2dge-3d.js`, statics | `World3D.TOON_BANDS` exported | track and prop materials in the pen's own toon bands |
| E7 | `my-3d2dge-3d.js`, `World3D.draw()` | `world.particleGround` overrides the particles' ground query | the terrain sits 60 m under the track's plate: dust and sparks land on the plate |
| E8 | `my-3d2dge.js`, the 5x7 font | glyphs `· ✓ ◀ ▶ ▲ ▼ ¢ — … ★ ↻` | the UI's ticks, choice arrows, the copper sign |
| E9 | `my-3d2dge-3d.js`, `World3D.draw()` | a split screen's viewport and scissor y from the top left (`vp.y`), not from the bottom | three.js's WebGPURenderer takes them from the top left and its WebGL backend flips them itself: stacked viewports were swapped and the top one drew the wrong picture |
