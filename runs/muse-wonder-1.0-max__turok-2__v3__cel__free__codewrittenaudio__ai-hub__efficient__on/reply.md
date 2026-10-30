Done — standalone artifact ready. Open [Talons-and-Seeds-Primeval-Turok-2-Seeds-of-Evil-muse-wonder-1.0-max-20261029-0226.html](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Talons-and-Seeds-Primeval-Turok-2-Seeds-of-Evil-muse-wonder-1.0-max-20261029-0226.html) directly in a WebGPU browser (or serve the folder with `python3 -m http.server 8000`). Smoke result: Node `node --check` passed on the embedded module script and 13/13 static checks passed (hub metas, session.js first script, Rapier/Three versions, invert toggles, attract, touch message, cel-shading, gamepad, gibberish, no TODOs). Browser behavior is unverified — `chromium` was not found on PATH (exit 127), so no browser playtest was run. Dev files are in [Talons-and-Seeds-Primeval-Turok-2-Seeds-of-Evil-muse-wonder-1.0-max-20261029-0226](/home/micha/dev/cc-matrix/runs/muse-wonder-1.0-max__v5__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Talons-and-Seeds-Primeval-Turok-2-Seeds-of-Evil-muse-wonder-1.0-max-20261029-0226).

Title was picked by Python RNG (`random.randrange(50)` → index 4) from 50 brainstormed titles: **Talons & Seeds Primeval**.

## Source Information
- Date: 2026-10-29 02:26
- Source: Turok 2: Seeds of Evil (inspiration only; original story, names, art, code)
- Tech: Three.js 0.180.0 WebGPU (`WebGPURenderer`, no fallback), Rapier 0.19.3 (`@dimforge/rapier3d-compat`), Gamepad API, Web Audio API, Canvas minimap, import maps/CDN
- Art Direction: Stylized cel-shaded — `MeshToonMaterial` 3-step gradient, inverted-hull outlines, saturated jungle palette
- Animation: Procedural group/skeletal animation (walk cycles, weapon-ready bob via camera, portal/water/pickup motion); no external clips
- Audio: Code-written Web Audio synth music/SFX and Animalese/Simlish-style gibberish voice (formant oscillator syllables)
- Online: AI Hub Session Protocol v1, `parallel` 1–4, `session.js` unmodified as first script in `<head>`, `AIHub.connect/ready/progress/result/probe`, time-up/end handling; standalone play unchanged
- Testing: Lightweight static checks + Node syntax smoke; browser unknown
- Environment: Muse Code CLI (headless); Linux; browser unknown
- Model: Meta, muse-wonder-1.0, reasoning effort max
- Usage: unknown

## Testing Feedback
- How many issues did testing catch? 0 — static and syntax checks passed first run.
- How many would be considered critical / game breaking? 0 observed; WebGPU runtime is unverified without a browser.
- Most helpful test: Extracting the embedded module and running `node --check`, plus hub-meta/session-order checks.
- Least helpful test: `command -v chromium` probe — it only confirmed no browser is installed here.

## Engine Feedback
- Liked most: Three.js R180 WebGPU renderer + toon materials give the cel look with very little code.
- Got stuck / guessed wrong: Rapier character-controller wiring is verbose for a kinematic FPS; kept physics stepping guarded so gameplay never depends on it.
- Most important thing built myself: The full FPS loop — quest chain, enemy AI, weapons (including homing Seeker), attract bot, hub reporting, and procedural animation.
- Hardest part: Fitting WebGPU + Rapier + hub session + controller-first menus into one self-contained file without a build step.
- Remove/overhaul: The split WebGPU addon import path; a single entry point would be simpler.
- Change one thing: Ship a headless WebGPU test renderer so CI can smoke-test scenes without a browser.

## Prompt Feedback
- Liked most: Clear constraints (single file, exact stack versions, hub protocol link, invert-axis fix) made the scope checkable.
- Confusing: Filename pattern `[GameTitle-SOURCE-...]` needed interpretation; used the full source slug.
- Hardest thing: Honouring “WebGPU, no fallback” while also satisfying the hub’s WebGL-fallback guidance — declared `hub:webgpu=required` as the protocol allows.
- One test I could have run: A real Chromium/WebGPU playthrough (title → attract → combat → portal) with gamepad emulation via the hub harness.