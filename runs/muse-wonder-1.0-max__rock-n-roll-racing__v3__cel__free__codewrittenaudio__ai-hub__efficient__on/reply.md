Done — **Turbo Tread Tempo** is complete (title picked by Node `Math.random()` from 50 brainstormed candidates, index 27).

**Play it:** open [TurboTreadTempo-RockNRollRacing-muse-wonder-1.0-max-20261029-0243.html](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/TurboTreadTempo-RockNRollRacing-muse-wonder-1.0-max-20261029-0243.html) directly in a WebGPU browser (Chrome/Edge). No server needed; libraries load from pinned CDNs. Dev notes live in the matching subfolder.

What's in it: cel-shaded isometric combat racing on Three.js R180 WebGPU (no fallback) with Rapier 0.19.3 physics — 4 cars, 3 tracks, 3-lap races, missiles/mines/oil, pickups, damage/respawn, rubber-banded AI, a 3-race championship with cash and a persistent upgrade garage, local 2P split-screen, AI Hub `race` sessions (unmodified `session.js` first in `<head>`, ghost rivals, progress/result, probe), 10-second attract mode, full PS5 gamepad + keyboard play with invert-axis toggles, procedural rock music, synthesized SFX, and an Animalese gibberish announcer.

Verified: final `check_page.py` desktop run passes with WebGPU frames drawn and zero problems; scripted Playwright playtest confirmed driving input (`x:1, y:-1` at [AIHub.inspect() probe](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v7__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/TurboTreadTempo-RockNRollRacing-muse-wonder-1.0-max-20261029-0243.html:1)), pause/settings, and attract-mode entry/exit. The phone-size checker flagged a menu card over the canvas after its own centre tap — menus overlay the live world by design, so that one is expected, not a defect.

## Source Information
- Date: 2026-10-29 02:44
- Source game: Rock n' Roll Racing
- Tech: Three.js 0.180.0 (WebGPU, no fallback), Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Gamepad API, Web Audio API, AI Hub Session Protocol v1 (`race` mode)
- Art Direction: stylized cel-shaded — `MeshToonMaterial` with a 4-step gradient map plus black ink-outline shells
- Animation: procedural — wheel spin, suspension bob, boost-flame flicker, particle bursts; no skeletal/keyframe assets
- Audio: fully code-written — 132 BPM procedural rock loop (bass/riff/power chords/noise drums), synthesized SFX, Animalese-style pitched-blip announcer voice
- Online: AI Hub race sessions (1–4 players, ghost rivals over the hub relay, `AIHub.progress`/`AIHub.result`/`AIHub.probe`) + local 2P split-screen; solo vs AI otherwise
- Testing: lightweight — headless Chromium load smoke + scripted keyboard playtest (see Testing Feedback)
- Environment: Muse Code CLI (headless); Linux; browser unknown
- Model: Meta, muse-wonder-1.0, reasoning effort max
- Usage: unknown

## Testing Feedback
- How many issues did testing catch? 3 (invisible road ribbon from single-sided winding, title logo clipped at short viewports, one stale test selector)
- How many would be considered critical / game breaking? 1 — the missing road surface; the rest were cosmetic or test-side
- Most helpful test: the screenshot review after the first playtest — the road, gantry, and HUD problems were all visible at a glance in `/tmp/play-race.png`
- Least helpful test: the phone-size automated "covered canvas" check, which flagged an intentional menu overlay as a defect

## Engine Feedback
- What did you like most about the engine? Three.js WebGPU + TSL import maps just worked from CDN, and `MeshToonMaterial` gave the cel look almost for free
- Did you get stuck or guess wrong? Yes — the road ribbon's triangle winding made it invisible from above; fixed with `DoubleSide` after the screenshot proved it. Rapier's init also emits a deprecation warning I left alone
- What was the most important thing you had to build yourself? The whole race layer on top of Rapier: spline progress/lap tracking, arcade velocity steering, weapons, and respawn — Rapier supplies collisions, not a racing game
- What was the hardest part about using the engine? Keeping WebGPU, Rapier WASM, and the hub client all loading in order inside one file with no build step
- If you had to remove or overhaul one thing from the engine, what would that be? The split between `WebGLRenderer` addons and `three/webgpu`/`three/tsl` — the post-processing split (EffectComposer vs RenderPipeline) is easy to get wrong
- If you could change one thing about the engine, what would it be? Ship the hub `session.js` handshake as a tiny npm module too, so single-file games don't have to inline 16 KB verbatim

## Prompt Feedback
- What did you like most about this prompt? The hard constraints (exact versions, single file, hub protocol link) removed guesswork and made "done" checkable
- What was confusing? The filename template `[GameTitle-SOURCE-...]` — I slugified the source name to `RockNRollRacing` since spaces/apostrophes break filenames; a sanitized example would have helped
- What was the hardest thing to do? Fitting a championship, garage, versus, hub multiplayer, attract mode, and a full audio engine into one file with zero stubs
- If there was one test you could have run, what would that test be? A real two-browser AI Hub session with the actual harness — ghost sync is only verified by code inspection here, never against a live hub