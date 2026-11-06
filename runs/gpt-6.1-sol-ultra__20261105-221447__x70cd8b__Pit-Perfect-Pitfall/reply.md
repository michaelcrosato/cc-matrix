Built **Pit Perfect**: eight jungle regions, twelve treasures, vines, tunnels, hazards, attract mode, and two-player ghost races.

[Play Pit Perfect](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-221447__x70cd8b/work/Pit-Perfect-Pitfall-gpt-6.1-sol-ultra-20261105-221447.html) · [Development guide](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-221447__x70cd8b/work/Pit-Perfect-Pitfall-gpt-6.1-sol-ultra-20261105-221447/README.md) · [Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-221447__x70cd8b/work/exit-interview.json)

Open the HTML in Chrome or Edge. Initial loading requires internet for CDN dependencies. Dev tools are under **Pause → Expedition Workshop**.

**Source Information**

Date: 2026-11-05 22:14:47. Source: *Pitfall!* (1982), researched through its [original manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=360), visual descriptions, and sound references. Plan: none. Genre: adventure platformer. Perspective: orthographic 2.5D side-scrolling.

Tech: Three.js r180, WebGPU with WebGL2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, BroadcastChannel, WebRTC, and AI Hub Session Protocol v1. Art: procedural cel shading and ink outlines. Animation: native AnimationMixer with original clips. Audio: synthesized music at 10%, effects, ambience, and gibberish voices. Online: 1–2 player ghost races; remote Internet NAT compatibility is unknown.

Testing: headless Chromium, scripted gameplay, emulated controller/touch, audio analysis, and multiplayer harnesses. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, ultra reasoning. Usage: added on import.

**Testing Feedback**

- **111/111 checks passed.** Testing and review found 12 issues, all fixed; two additional test-setup errors were corrected.
- Three issues blocked entry or navigation.
- Most helpful: the complete unassisted playthrough—every treasure, vine, and tunnel, with zero damage.
- Least helpful: an initially case-sensitive credits check that produced a false failure.

**Engine Feedback**

Native animation clips and toon materials worked well. SwiftShader screenshot capture required using the WebGL2 backend for reliable visual review. The main custom work was traversal and controller-first menus; synchronizing physics, vines, and input was hardest. Engine changes: none. Desired improvement: a complete WebGPU game starter with deterministic testing tools.

**Prompt Feedback**

The source research and controller-first requirements gave clear direction. Multiplayer topology was unspecified, so I chose ghost racing. Combining the complete expedition, procedural assets, input methods, and networking in one HTML was hardest. I would specify the desired multiplayer mode and direct-invitation requirements.