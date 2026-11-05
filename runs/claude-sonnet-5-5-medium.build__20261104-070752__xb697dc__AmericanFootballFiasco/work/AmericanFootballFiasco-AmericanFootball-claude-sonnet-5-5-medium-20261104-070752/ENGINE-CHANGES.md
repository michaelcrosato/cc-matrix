# Engine changes (my-3D2dge v0.85.2 handoff copy, vendor/my-3d2dge.js)
Engine commit 4390a985..., AI Hub client session.js 1.4.0 (unmodified).
- E1 PIXEL FONT: added the glyphs ✕ ○ □ △ to G57. input.label() returns them for a PlayStation pad, and the 5x7 font drew `?`.
- E2 Input: `glyphs` setting defaults to 'playstation' and offers only PlayStation / Xbox (TASK.md: PlayStation glyphs with an Xbox option).
- E5 Dialog: `voice` may be a function `voice(ch, i, text, dialog)` called for each typed letter (Animalese voice: a pitch per letter).
