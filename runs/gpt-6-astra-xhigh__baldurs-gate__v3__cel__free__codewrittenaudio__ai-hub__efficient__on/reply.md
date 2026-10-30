Created **Baldur’s Gloom**: three chapters, four companions, tactical combat, branching quests, three endings, and co-op.

[Download the single-file game](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Baldurs-Gloom-Baldurs-Gate-gpt-6-astra-xhigh-20261029-1056.html) · [Instructions and development files](/home/micha/dev/cc-matrix/runs/gpt-6-astra-xhigh__v1__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Baldurs-Gloom-Baldurs-Gate-gpt-6-astra-xhigh-20261029-1056/README.md)

Serve over HTTPS or localhost. WebGPU is required; dependencies load from CDNs.

**Source Information.**

- **Date:** 2026-10-29 10:56, Vancouver.
- **Inspiration:** Baldur’s Gate; original setting and content.
- **Tech:** Three.js R180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5.
- **Art/animation:** Cel-shaded procedural 3D, SVG portraits, hierarchical character rigs and animated effects.
- **Audio:** Code-written music, sound effects, and synthesized gibberish voices.
- **Online:** 1–4 player [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op and standalone WebRTC rooms.
- **Environment/model:** Codex CLI, headless Linux; player browser unknown. OpenAI gpt-6-astra, xhigh.
- **Usage:** Cost and tokens unknown; approximately 61 minutes.

**Testing Feedback.** All **84 recorded checks passed**. Testing caught five game issues, including one startup-blocking issue; all were fixed. The AI Hub harness was most helpful. Module-only syntax checks were least helpful because they missed a bundling error. Testing used lightweight automation and genuine WebGPU captures through Xvfb; no performance targets were imposed. Physical-controller and cross-browser playthroughs remain unverified.

**Engine Feedback.** Three.js’s scene graph and toon materials worked well. I initially guessed incorrectly about headless WebGPU screenshot support; Xvfb resolved that. The largest custom system was the RPG simulation and network ownership. Keeping rendering, physics, UI, and shared state independent was hardest. I would overhaul automatic backend fallback and add a public WebGPU-required constructor option.

**Prompt Feedback.** The concrete controller, audio, packaging, and networking constraints were useful. “Feature-complete” and “normal designer tools” left scope ambiguous. Combining narrative systems with two co-op transports was hardest. My additional test would be a four-person physical DualSense playthrough across browsers and networks.

These notes are also embedded in the HTML comment and in-game About screen.