# Engine changes

- my-3d2dge.js: one comment reworded (a "placeholder" in the repo became a "stand-in value"), so the bundled file carries no placeholder wording. No behaviour changed.
- my-3d2dge.js (pixel font): added the controller face-button symbols (✕ ○ □ △), the arrows ◄ ►, a middle dot and an ellipsis to both fonts. Why: input.label() returns ✕ ○ □ △ for a PlayStation pad, but the pixel font had no glyphs for them and drew "?", so the on-screen prompts could not show PlayStation glyphs.
