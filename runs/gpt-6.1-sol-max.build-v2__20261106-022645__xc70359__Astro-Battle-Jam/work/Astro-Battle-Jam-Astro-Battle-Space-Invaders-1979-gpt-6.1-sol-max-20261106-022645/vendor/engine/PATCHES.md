# Engine patch record

The full `my-3d2dge.js` is unchanged from the v0.89.1 handoff at commit `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. No separate included module or agent-edition copy is loaded with it.

Game-level adapters:
- Adapt the arcade kit's native Game lifecycle, fixed overhead camera, sprite/animation, palette, audio and settings facilities.
- Use one serializable, seeded shared battle simulation for simultaneous co-op; do not use the arcade helper's alternating-turn multiplayer.
- Resolve swept first hits against the actual bunker cell, ship, enemy or flagship part; do not invoke endpoint damage helpers afterward.
- Supply concise native-pixel controller-first screens, safe gesture audio unlock, contextual touch controls and local Hub overlays using documented opt-outs (`menu:false`, `autoPause:false`, `pausable:false`). Native settings/set/reset, full-screen and input ownership remain in use.
- Derive authoritative online ticks from AI Hub time, with a complete reliable snapshot strategy. Engine timeScale remains one; standalone developer time is a run-owned simulation accumulator.

The build escapes literal closing-script sequences only when embedding engine source in HTML. This does not alter the vendored engine file or executing JavaScript semantics.
