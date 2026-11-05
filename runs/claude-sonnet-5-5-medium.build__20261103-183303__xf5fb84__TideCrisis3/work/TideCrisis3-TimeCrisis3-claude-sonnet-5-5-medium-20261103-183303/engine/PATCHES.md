# Engine patches (my-3d2dge v0.85.2 handoff)
1. Button symbols default to PlayStation; the setting offers PlayStation and Xbox only (TASK.md: PS glyphs, Xbox as an option).
2. `input.wheelCodes = true` makes the canvas wheel press `WheelUp` / `WheelDown` for one step (bindable codes, labels "Wheel up/down"). The mouse wheel switches weapons.
3. `audio.bus('sfx'|'music')` returns the existing gain nodes so the gibberish voice synth honours the volume settings.
Not done (the plan listed them): long-gun Humanoid weapons (the rig keeps its `gun`), the optional Arcade letter-wheel hook.
4. Pixel-font glyphs for the PlayStation buttons (✕ ○ □ △) and a few punctuation marks (— − … ✓ ▼ ◂ · ⚙), so on-screen prompts follow the pad glyph family.
