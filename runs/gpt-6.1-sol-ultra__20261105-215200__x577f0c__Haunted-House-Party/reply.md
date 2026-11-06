[Play Haunted House Party](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-215200__x577f0c/work/Haunted-House-Party-Haunted-House-1982-gpt-6.1-sol-ultra-20261105-215200.html) · [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-215200__x577f0c/work/exit-interview.json)

Complete single-file game with four floors, 24 rooms, controller/mouse/touch support, attract replay, developer tools, and local/online co-op. Internet access is needed for CDN dependencies.

**Source Information:** Date: 2026-11-05 21:52:00. Source: Atari’s *Haunted House* (1982), researched through [Atari](https://atari.com/pages/hauntedhouse) and the [original manual](https://static.atariage.com/manual_html_page.php?SoftwareLabelID=233). Plan: none. Genre: survival horror/puzzle adventure. Perspective: isometric third-person. Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub client 1.4.0. Art: procedural cel/ink mansion. Animation: native AnimationMixer clips. Audio: synthesized music, effects and gibberish voices; music defaults to 10%. Online: host-authoritative co-op for 1–4; local play for 1–2. Testing: headless scripts, emulated inputs, audio rendering, playthroughs and visual review. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, ultra. Usage: added on import.

**Testing Feedback:** 29 automated checks passed, plus TV visual review. Testing caught two issues, including one critical Hub startup issue; both were fixed. The complete physics playthrough was most helpful. Blank headless WebGPU screenshots were least helpful.

**Engine Feedback:** Scene graphs and native animation worked well. WebGPU capture and initialization timing needed correction. Custom inventory, navigation and authoritative co-op were the main systems built. Collision synchronization was hardest. Engine changes: none. Desired improvement: reliable headless WebGPU capture.

**Prompt Feedback:** The controller-first and packaging requirements were useful. The source platform was ambiguous between Atari and pinball. Integrating the complete game and multiplayer was hardest. I’d specify the source platform explicitly.

All feedback is also included in About/Credits and the validated JSON.