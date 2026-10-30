[Play Goof Anchor](<./Goof Anchor-Goof Troop-gpt-6.1-terra-ultra-20261029-0914.html>) · [Development files](<./Goof Anchor-Goof Troop-gpt-6.1-terra-ultra-20261029-0914>)

The demo includes three island rooms, pot throwing, crate puzzles, hook stuns, pirates, keys and treasure. It supports two-controller local co-op, side-by-side online rooms and AI Hub parallel sessions. A scripted attract voyage starts after ten seconds on the title screen. The HTML uses CDN dependencies and requires WebGPU.

**Source information**

- Date: 2026-10-29 09:14
- Source: Goof Troop
- Tech: [Three.js R180 WebGPU](https://threejs.org/manual/pages/webgpurenderer), Rapier 0.19.3, Web Audio, Gamepad API, [AI Hub Session Protocol 1](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) and PeerJS 1.5.5
- Art: original cel-shaded procedural geometry. Animation: procedural transforms and rigid-body physics.
- Audio: code-generated music, effects and gibberish voices.
- Online: AI Hub parallel sessions and standalone PeerJS side-by-side rooms; internet is required.
- Testing: lightweight simulation, syntax and headless browser smoke tests; no performance targets.
- Environment: Codex CLI, headless Linux, Google Chrome headless.
- Model: OpenAI gpt-6.1-terra, reasoning effort ultra. Usage and cost: unknown.

**Testing feedback:** Testing caught one non-critical issue: the start button also triggered a gameplay action. It was fixed and retested. No game-breaking issues were found. The most helpful test was the WebGPU browser smoke test; the least helpful was syntax checking alone. A simulation completed all three rooms using gameplay inputs. Hardware WebGPU and a real two-device online session remain unverified.

**Engine feedback:** Three.js made the scene graph straightforward, while Rapier supplied the thrown-object physics. Integrating rendering, physics, input and networking was the hardest part; the game rules and room progression had to be built separately. The initial headless WebGPU configuration lost its device, but Vulkan SwiftShader rendered successfully. An explicit WebGPU-only initialization path would make the renderer easier to use for this requirement.

**Prompt feedback:** The controller-first vertical-slice focus was helpful. The exact demo length and multiplayer mode left room for interpretation. The hardest part was combining a playable slice and online integration in one file. The most useful additional test would be a full two-device controller playthrough on hardware with WebGPU.