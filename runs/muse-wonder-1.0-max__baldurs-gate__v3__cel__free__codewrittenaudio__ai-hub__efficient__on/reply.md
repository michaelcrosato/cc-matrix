Done. **The Ironwood Conspiracy** is ready — open [TheIronwoodConspiracy-BaldursGate-muse-wonder-1.0-max-20261029-0201.html](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/TheIronwoodConspiracy-BaldursGate-muse-wonder-1.0-max-20261029-0201.html) in a WebGPU browser (Chrome/Edge). Double-click the file; no server needed (CDN deps load online). Dev parts are kept in [the dev subfolder](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/TheIronwoodConspiracy-BaldursGate-muse-wonder-1.0-max-20261029-0201).

Title picked by running a real RNG over 50 brainstormed titles: index 26 → *The Ironwood Conspiracy*.

What you get: an original Baldur's Gate-style vertical slice — character creation (4 classes, rolled stats), a 4-hero party, real-time-with-pause combat with visible d20 rolls, 14 abilities, branching dialogue with skill checks and gibberish voice, 3 zones (Thornwall, the Ironwood, the Elder Gate ruins), main + side quests, shop, inventory/equipment, levels, 3-slot save/load, a Hollow Lich boss and ending. Controller-first 10-foot UI (DualSense mapping, focus navigation, invert X/Y settings fix, Esc/Options settings), keyboard/mouse fully mapped, touch-only warning screen, and attract mode after 10 s idle on the title. Verified headless: WebGPU frames draw, no page errors, and scripted play confirmed title → creation → gameplay, inventory, journal, and Elder dialogue. The checker's one remaining note (title menu over canvas) is the intended menu-over-live-world design.

## Source Information
- Date: 2026-10-29 02:02
- Baldur's Gate
- Tech: Three.js 0.180.0 (WebGPURenderer, WebGPU only, no fallback), Rapier 0.19.3 (@dimforge/rapier3d-compat), Gamepad API, Web Audio API, AI Hub Session Protocol v1 client 1.3.0 (co-op), BroadcastChannel (standalone multiplayer), vanilla JS/CSS, import maps via jsDelivr CDN
- Art Direction: Stylized cel-shaded (MeshToonMaterial, 4-step gradient map, inverted-hull outlines)
- Animation: Procedural code animation (limb swing, bob, particles, camera)
- Audio: Code-written procedural music and SFX (Web Audio) + Animalese/Simlish gibberish voice synthesis
- Online: AI Hub co-op sessions (host-authoritative, 1–4 players, `AIHub.probe` registered, progress/result/finish reporting); standalone room-code multiplayer via BroadcastChannel; single-player offline
- Testing: Lightweight — JS syntax check, headless Chromium (SwiftShader WebGPU) page checks, scripted Playwright playthroughs; no FPS targets
- Environment: Muse Code CLI (headless); Linux; browser unknown
- Model: Meta, muse-wonder-1.0, reasoning effort max
- Usage: unknown

## Testing Feedback
- How many issues did testing catch? 2 — missing `RAPIER.init()` (blank canvas), plus dim lighting/title Esc handling found by looking at screenshots.
- How many would be considered critical / game breaking? 1 — the Rapier init failure prevented any frame from drawing.
- What was the most helpful test you ran? The headless `check_page.py` run: it surfaced the boot error, proved WebGPU frames draw (136 frames), and its screenshots let me verify title, HUD, inventory, and dialogue visually.
- What was the least helpful test you ran? The first coordinate-grid NPC click sweep — it missed the Elder by pixels and only proved clicking works; a precise click from the screenshot was decisive.

## Engine Feedback
- What did you like most about the engine? Three.js R180's WebGPURenderer with toon materials: cel shading, shadows, and many lights worked with very little code once the renderer was initialized.
- Did you get stuck or guess wrong? Yes — I assumed Rapier's compat build was ready on import; it needs `await RAPIER.init()` first, which cost one full check cycle.
- What was the most important thing you had to build yourself? The whole CRPG layer: RTwP combat with dice, dialogue trees with checks, quests, hub co-op sync, and the controller-first focus UI — none of it exists in the engine.
- What was the hardest part about using the engine? WebGPU-only delivery: no fallback means boot correctness (renderer init, Rapier WASM init, gradient map setup) must be perfect before anything is visible.
- If you had to remove or overhaul one thing from engine, what would that be? The split WebGPU import surface (`three` vs `three/webgpu` vs `three/tsl` version drift) invites mismatched builds; one pinned entry would help.
- If you could change one thing about the engine, what would it be? Make Rapier-style WASM init impossible to forget — auto-init on first `World` construction, or a loud error naming the missing call.

## Prompt Feedback
- What did you like most about this prompt? The constraints were concrete where it matters (exact versions, hub protocol link, attract-mode and inversion-toggle requirements) and free where taste matters.
- What was confusing? The package filename pattern `[GameTitle-SOURCE-...]` leaves sanitization of "Baldur's Gate" (apostrophe/space) to guesswork; I used `BaldursGate`.
- What was the hardest thing to do? Fitting a feature-complete CRPG (creation, party, pause-combat, dialogue, quests, shop, saves, multiplayer, attract) into one self-contained file with no stubs.
- If there was one test you could of run, what would that test be? A real AI Hub harness round (`harness.html?players=4&auto=1`) with two live copies trading co-op snapshots — the hub path is implemented to spec but only single-copy verified here.