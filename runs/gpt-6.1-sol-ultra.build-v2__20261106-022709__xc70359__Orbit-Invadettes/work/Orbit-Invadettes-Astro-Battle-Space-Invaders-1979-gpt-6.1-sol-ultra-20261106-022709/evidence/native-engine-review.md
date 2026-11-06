# Native engine verification and contract review

The actual shipped game.bundle.js is evaluated as a classic script in a Node VM after the full pinned engine, without stripping or transforming exports. The app uses the engine's supported headless renderer (`draw:true`). Native Input, fixed updates, draw, settings and lifecycle are exercised. DOM menus use explicit focus-row stand-ins for input routing; browser verification is still responsible for real focus/hit targets/layout.

`tests/engine.test.mjs` exports asynchronous `runEngineTests()` and currently has18 passing checks. Includes one repair edge at2× simulation speed consuming exactly one charge, every encounter/phase rendering, local2-seat controls, pause/settings/dev/reset/replay, attract threshold/loop/wake isolation, record ownership, About feedback pages and no engine warnings/errors.

Distinct findings delivered to root:

1. **Critical / fixed** — Bun's default ESM output retained `export { App }` but final HTML loaded it through a classic `<script>`. Native boot failed with `SyntaxError: Unexpected token 'export'`, which also prevents browser startup. Build now explicitly requests IIFE output. Caught by executing the exact bundle in the native VM.
2. **Moderate / fixed** — March animations passed beat×0.125 to2fps assets, changing pose once per four march beats. Contract review corrected this to beat×0.5 for alternating poses on every beat.
3. **Moderate / fixed** — Results checked reason==='breach', while simulation returns a descriptive uppercase BREACH reason. Review corrected case-insensitive matching so breach defeat is identified correctly.
4. **Moderate / fixed** —2× simulation scaling reused repair:true across both substeps and could spend two charges for one edge. Root neutralizes repair after the first substep; the native engine regression test verifies exactly one charge and one repair.
5. **Moderate / fixed** —70px flagship hull was smaller than its148px collision width and placed emitter centers outside the pictured body. Root draws native shaded wings around the central sprite to match the148px authoritative hull and emitter positions.
6. **Moderate / fixed** — Phase-two SAFE box was44px wide while authoritative safeWidth is82px. Review aligned the telegraph box with boss.safeWidth.
7. **Moderate / fixed by root** — Native sprite palette flashes and respawn alpha blinking bypassed the reduced-flash setting. Root gated these local effects on settings.flashes; updated native suite passes without errors. Browser/visual verification of their appearance belongs to root.

8. **Critical / fixed** — Solo launch and return-to-title set Input.pad=null, which explicitly disables native gamepad polling. Root changed the selector to any and preserves claimed P2 exclusions. Native standard-mapping pad regressions verify combat, removal, reclaim, title confirmation, and distinct two-pad seats.

Count these unique findings once when assembling combined feedback. Items1 and8 are critical native-engine findings. Root may already have the pad finding in its combined browser issue log; count it only once. Static contract review findings are identified separately from assertion failures; avoid claiming every item was discovered by automated play.
