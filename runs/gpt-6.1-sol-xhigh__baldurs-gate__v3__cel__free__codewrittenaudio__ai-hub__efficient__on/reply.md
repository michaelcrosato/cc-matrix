[**Download Baldur’s Grape — The Last Vintage**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-xhigh__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Baldurs-Grape-Baldurs-Gate-gpt-6.1-sol-xhigh-20261029-0820.html)

Single-file RPG demo with four companions, tactical combat, branching quests, four endings, saves, attract mode, and 1–4 player co-op. Requires WebGPU and internet access for dependencies.

**Source Information**

- **Date/source:** 2026-10-29 08:20, America/Vancouver; Baldur’s Gate.
- **Tech:** Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art/animation:** Procedural cel-shaded diorama; articulated movement, attacks, falls, environmental animation and particles.
- **Audio:** Original code-written adaptive music, synthesized effects and gibberish voices.
- **Online:** AI Hub Protocol v1/client 1.3.0 and standalone WebRTC co-op.
- **Environment/model:** Codex CLI, headless Linux; Chrome 154 tested, player browser unknown. OpenAI gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** Cost and token count unknown; approximately 50 minutes.

**Testing Feedback**

105 checks passed. Five game issues were fixed; two were critical: missed controller presses and damage continuing during tactical pause.

The most helpful test was the ai-hub harness, including server-only hosting. Ordinary headless screenshots were least helpful because the compositor omitted WebGPU; GPU readback enabled visual verification.

Tests used an emulated controller, 60 ms latency, 20 ms jitter and 5% packet loss. Physical controllers and cross-network NAT coverage remain unverified.

**Engine Feedback**

- **Best:** Node materials for cel shading and Rapier collision queries.
- **Wrong assumption:** Rendering-frame polling would capture brief controller presses.
- **Main custom system:** Shared RPG simulation, navigation, quests, saves and networking.
- **Hardest:** Combining solo tactical pause with continuously running co-op.
- **Overhaul:** Make automatic renderer fallback an explicit policy.
- **One improvement:** Built-in WebGPU capability/device-loss diagnostics.

**Prompt Feedback**

- **Best:** Controller-first design and coherent creative constraints.
- **Confusing:** “All mechanics” is open-ended for a large RPG.
- **Hardest:** Integrating every system into one shareable file.
- **Extra test:** Four physical DualSense controllers across separate networks.

These notes are also embedded in About/Credits and the HTML’s opening comment.