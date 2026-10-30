Built [Hare in the Air](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Hare in the Air-Jumping Flash! 2-gpt-6.1-terra-max-20261029-0859.html>). The demo includes triple-jump exploration, four rescues, a boss encounter, scripted attract mode, controller settings, and both [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) and standalone score sessions.

Open the HTML in a WebGPU-capable browser with an internet connection for its CDN dependencies. Standalone rooms use PeerJS; restrictive networks may require a TURN relay. [PeerJS FAQ](https://peerjs.com/client/faq)

**Source information**

- Date: 2026-10-29 08:59. Source: *Jumping Flash! 2*.
- Tech: Three.js R180 WebGPU, Rapier 0.19.3, Web Audio, Gamepad API, PeerJS 1.5.5, and AI Hub Session Protocol 1.3.0.
- Art and animation: original procedural cel-shaded 3D and procedural transform animation with physics.
- Audio: code-synthesized music, effects, and gibberish voices.
- Online: side-by-side score play for up to four players in AI Hub or standalone rooms.
- Testing environment: lightweight headless Chrome 154 checks; Codex CLI on Linux. Deployment browser: unknown.
- Model: OpenAI, gpt-6.1-terra, reasoning effort max. Estimated cost and token count: unknown. Session time: approximately 20 minutes.

**Testing feedback**

Seven user-facing issues were caught and fixed; none were considered game-breaking. The most helpful test was the live two-client room test, which verified scores and caught disconnect handling. The least helpful was the syntax-only check.

The AI Hub harness passed **24 of 24 checks**. The gameplay test used assisted positioning and reduced boss health; a full manual playthrough, physical controller, four-player session, and wider device and network coverage remain untested.

**Engine feedback**

Three.js’s scene graph made the toy-like world quick to build. The initial camera orientation retained roll from the title view and needed correction. The first-person controller and game systems were the most important custom work; WebGPU initialization was the hardest engine integration. I would overhaul the renderer’s automatic fallback and add an explicit WebGPU-only option with clearer diagnostics.

**Prompt feedback**

The joyful jumping and controller-first direction were the highlights. The breadth of “a complete engine” in one HTML file was the least defined part, and combining networking with lightweight testing was the hardest part. The most valuable additional test would be a complete four-player playthrough with physical controllers across different WebGPU devices and networks.

The editable level data and build instructions are in the [development folder README](</home/micha/dev/cc-matrix/runs/gpt-6.1-terra-max__v9__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Hare in the Air-Jumping Flash! 2-gpt-6.1-terra-max-20261029-0859/README.md>).