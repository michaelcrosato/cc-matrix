Built **Waku Riot 7**: three fighters, three stages, a seven-bout circuit, dojo, local/online versus, and looping attract mode.

[Single-file game](./Waku-Riot-7-Waku-Waku-7-gpt-6.1-sol-xhigh-20261029-0825.html) · [Development files and testing report](./Waku-Riot-7-Waku-Waku-7-gpt-6.1-sol-xhigh-20261029-0825/RELEASE-REPORT.md)

Requires WebGPU and internet access for CDN dependencies.

**Source information**

- **Date:** 2026-10-29 09:11, America/Vancouver.
- **Source:** Waku Waku 7. Title randomly selected from 50 candidates.
- **Tech:** Three.js R180/0.180.0, WebGPU only, TSL, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, AI Hub client 1.3.0.
- **Art:** Original procedural cel shading, ink outlines, toybox festival setting.
- **Animation:** Hierarchical rigs, blended poses, squash/stretch, physics particles.
- **Audio:** Code-written music, synthesized effects, gibberish voices.
- **Online:** Standalone WebRTC duels and 1–4-player AI Hub arenas.
- **Testing:** Lightweight headless checks; separate rendered WebGPU captures. Circuit progression used an accelerated fixture.
- **Environment:** Codex CLI, headless Linux/WSL2. User browser unknown; automated tests used Chrome 154.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort xhigh.
- **Usage:** API cost and token totals unknown; approximately 46 minutes.

**Testing feedback**

Testing and review found **11 issues, including 2 game-breaking defects**, all fixed. Five hub scenarios, combat checks, attract mode, standalone synchronization, and seven campaign transitions passed.

Most helpful: the four-player disconnect/time-up test. Least helpful: an early timed input sequence that attacked outside range. Physical DualSense, subjective listening, and real WAN testing remain unknown.

**Engine feedback**

TSL’s controllable cel shading and Rapier’s knockback worked well. Automatic WebGL fallback required explicit disabling, and headless Vulkan settings needed checking. The most important custom work was combat states, buffered cancels, and network prediction; reconciling immediate movement with authoritative hits was hardest. I’d overhaul fallback configuration and add visual inspection tools for fighter states.

**Prompt feedback**

The source, art, audio, and controller constraints gave the game a clear identity. “Feature complete” left roster and campaign boundaries open. Complete multiplayer inside one portable document was hardest. The next test would pair two remote players using physical DualSense controllers over a real WAN.

All required information and feedback also appear in the in-game credits and the HTML’s opening comment.