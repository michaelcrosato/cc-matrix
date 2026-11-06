# Engine change ledger

Base: full handoff 0.89.1, `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.

One local change in `vendor/my-3d2dge.js`, `E.Shell.show`: when refreshing the currently open screen, capture the active native shell focus index before rebuilding its buttons. The previous code reused `top.focus`, which the renderer had already cleared. A controller increasing a code digit therefore jumped back to the primary transmission button after each increment.

The change preserves the focused widget on same-screen refresh, while keeping existing stacked-screen back behavior. The controller acceptance test repeats digit increments and completes a whole practice disposal with the standard gamepad stub. No renderer, physics, audio, or engine clock changes.

All artwork, tools, materials, animation, simulation and networking are game-side extensions of documented native APIs.
