# Changes CRACKMANIA made to my-3D2dge v0.85.2

| # | File | Change | Why |
| --- | --- | --- | --- |
| E1 | `my-3d2dge-3d.js`, `Pen` | `pen.frame(x, y, z, f, r, u, k)`: the pen's frame from forward/right/up vectors | draw a car in any orientation (upside down in a loop) without Euler angles |
| E2 | `my-3d2dge-3d.js`, `Camera3D.place()` | a pose may carry `up: [x, y, z]` (engine axes); roll is skipped then | a chase camera that rolls with the car round a loop |
| E3 | `my-3d2dge-3d.js`, `makeBatches()` + `Pen` | four translucent toon batches (`gbox`, `gball`, `gtube`, `gcone`); `pen.ghost = true` routes parts into them | TrackMania's see-through ghost cars, with materials made once with the world |
| E4 | `my-3d2dge.js`, `Input.tick` / `analog()` | keeps each pad button's value; `input.analog(action)` returns 0..1 (a trigger's travel, 1 for a held key) | analog R2 throttle and L2 brake |
| E5 | `my-3d2dge.js`, input + settings | button symbols default to PlayStation; the setting offers PlayStation / Xbox | TASK.md: PlayStation glyphs, Xbox by setting |
| E6 | `my-3d2dge-3d.js`, statics | `World3D.TOON_BANDS` and `World3D.lambert(map)` exported | track and prop materials in the engine's own toon bands |

`tools/engine-patch.py` applies E1-E6 to fresh copies of the two engine files.
