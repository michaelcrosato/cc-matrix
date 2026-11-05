# Engine patches (my-3D2dge handoff v0.85.2)

`engine/my-3d2dge.js` is the handoff's full engine with the patches below. `node tools/patch-engine.mjs` applies them to a
fresh copy (each patch checks a `/*TC:name*/` marker, so it is idempotent). Every patch is covered by a test.

| Patch | Where | Why | Test |
|---|---|---|---|
| `weapons`, `tip`, `foregrip`, `drawhd`, `drawclassic`, `cutlass` | `Humanoid` constructor, `tip()`, the arm solver, both weapon draw blocks | A light-gun shooter's enemies carry rifles, SMGs, shotguns, launchers, sniper rifles, a minigun, a harpoon gun and a flare pistol, and the bosses swing a cutlass; the engine only had sword, gun and staff. Long guns are guns with a length (`o.gunKind`, `o.gunLen`), so every existing gun path (rest pose, `point`, `aim`, `tip()`) keeps working; the left hand goes to the fore-grip while aiming. | gameplay › enemies (muzzle points from `rig.tip()`), screenshots |
| `glyphs`, `glyphs2` | the STANDARD settings table, `Input` | TASK.md asks for PlayStation glyphs by default with a Settings option for Xbox's A B X Y. | ui › input (`R2` by default, `RT` with Xbox) |
| `wheel`, `wheellabel`, `wheelbind`, `wheeldev` | the canvas `wheel` listener, `CODE_LABELS`, `BINDABLE`, `press()` | The mouse wheel switches weapons: a notch presses `WheelUp` / `WheelDown` for one step (when the scene doesn't zoom), they read "Wheel up" / "Wheel down", can be rebound, and count as the mouse for prompts. | ui › input (`next` on the mouse is "Wheel down") |
| `bus` | `ChipAudio` | `audio.bus('sfx' \| 'music')` gives the engine's buses, so the gibberish voice synth and the panned SFX obey the volume settings. | core › audio (headless no-op path) |

The renderer (Rail3D), the Sim and everything else are the game's own modules (`src/`), not engine changes.
