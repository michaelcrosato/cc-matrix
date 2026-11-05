# Engine changes (base: my-3d2dge v0.85.2, commit 4390a98)

| # | File | Change | Why |
| --- | --- | --- | --- |
| E1 | my-3d2dge-3d.js, `Pen` | `frame(x, y, z, f, r, u, k)`: sets the pen's frame from forward, right and up vectors | draw the car in any orientation with no Euler singularity |
| E2 | my-3d2dge-3d.js, `Camera3D.place()` | a fixed pose may carry `up` (engine axes); `roll` is skipped when `up` is given | a chase camera that keeps its up vector |
| E4 | my-3d2dge.js, `Input` | `padValues` kept each step; `analog(action)` returns 0..1 (triggers) | analog R2 throttle and L2 brake |
| E5 | my-3d2dge.js, `Input` and settings | PlayStation symbols by default; the Button symbols setting offers PlayStation and Xbox | the brief's glyph rule |
| E6 | my-3d2dge-3d.js, statics | `World3D.TOON_BANDS` exported | game materials match the pen's parts |

Not changed: the 2D and 3D engines' tracks and vehicles (they cannot drive a loop; the game has its own road mesh and car model).
