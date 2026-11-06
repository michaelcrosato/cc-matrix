# Engine provenance and extension

Upstream handoff: my-3D2dge v0.89.1, commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`.

One local extension in `vendor/engine/my-3d2dge.js`: native Shell `_settingsRows` omits settings definitions carrying `hidden: true` from the ordinary settings catalogue. Explicit screen `rows` can still render these native sliders. This keeps live developer controls on the dedicated developer screens and prevents production Hub users from seeing mutation controls. All slider validation, focus, input, storage and apply behavior remain native.

No changes to the Hub client. No additional renderer or game engine.
