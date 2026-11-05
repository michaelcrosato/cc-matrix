# Engine changes (my-3D2dge v0.85.2 handoff, commit 4390a9852fe0)

`tools/patch-engine.mjs` applies them to `vendor/my-3d2dge.js` from the untouched copy in `.cache/`. AI Hub client:
session.js 1.4.0 (ai-hub commit f8835e4824fb), unmodified.

| # | What | Where | Why |
|---|---|---|---|
| E1 | The PlayStation glyphs ✕ ○ □ △ in the 5×7 and 3×5 pixel fonts | `G57`, `GLYPHS` | `input.label()` returns them for a PlayStation pad, but the fonts drew `?` |
| E2 | `glyphs` defaults to PlayStation, options PlayStation / Xbox, and shows on the Settings screen under "Controller" | the standard settings table, `Shell._settingsRows` | TASK.md: PlayStation glyphs with a Settings option for Xbox |
| E3 | A gear hook on the HD Humanoid: `o.gear(api)` before the draw ops are depth sorted | `_drawHD` | Shoulder pads, jersey numbers, the carried ball, pom-poms, mascot heads, ref stripes, depth-sorted inside the rig |
| E4 | A `'football'` hat style: a shell, a center stripe, an ear dot and a facemask | `Humanoid._hat` | A helmet that reads as football in every view |
| E5 | `E.Dialog`'s `voice` may be a function called for each newly typed letter | `Dialog.update` | The Animalese voice synth |
| E6 | `audio.bus(name, vol)`: a named gain bus under the master | the AUDIO section | Voices and the crowd bed have their own volumes and long-lived nodes |
| E7 | Settings groups named `Dev…` stay off the Settings screen; any Shell screen may list settings rows (`spec.rows`) | `Shell._settingsRows`, `Shell._render` | The Dev mode's live tuning sliders reuse the engine's slider rows |
| E8 | `game.menu(name, { pause: false })` opens a Shell screen without pausing | `Game.menu` | In an AI Hub session the world must not freeze when one player opens Settings |
| E10 | The floor-bake cache keeps 16 bakes (was 6) | `TileMap._floor` | Camera zoom levels, the Kick Cam and replay angles each need a bake; with 6 they evicted each other and the field rebaked every frame |

E9 (a 10-foot scale for the Shell's HTML screens) was done in game code instead: a stylesheet in `src/90-main.js`
with selectors stronger than `.esh`.
