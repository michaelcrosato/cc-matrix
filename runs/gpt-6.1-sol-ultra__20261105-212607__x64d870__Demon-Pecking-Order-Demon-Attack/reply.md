[Play Demon Pecking Order](./Demon-Pecking-Order-Demon-Attack-gpt-6.1-sol-ultra-20261105-212607.html) · [Exit interview](./exit-interview.json)

Complete single-file demo with six waves, a boss, overtime, local/online co-op, attract mode, and developer tools. **36 tests passed, 0 failed.** Open the HTML directly.

**Source Information**

- **Date:** 2026-11-05 21:26:07
- **Source:** Demon Attack (1982), Imagic / Rob Fulop. **Plan:** none.
- **Genre / perspective:** Arcade fixed-screen shooter; front-facing orthographic 2.5D.
- **Tech:** Three.js r180 WebGPU with WebGL fallback, Rapier 0.19.3, Web Audio, Gamepad API, AI Hub client 1.4.0, PeerJS 1.5.5.
- **Art / animation:** Procedural cel/ink geometry; native AnimationMixer clips for wings, thrusters, and boss effects.
- **Audio:** Synthesized music, effects, and gibberish voices; music defaults to 10%.
- **Online:** Two-player AI Hub and standalone WebRTC co-op.
- **Testing:** Complete patrol, repeated attract loops, keyboard, emulated gamepad, touch, audio signal, multiplayer, physics, and six viewport layouts.
- **Research:** [Original manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=135), AtariAge audiovisual notes, port mechanics, and official engine/network documentation.
- **Environment / model:** Codex CLI, headless Linux; OpenAI gpt-6.1-sol, ultra reasoning.
- **Usage:** added on import.

**Testing Feedback:** Five gameplay issues fixed, including two critical issues. The full-patrol test was most helpful; blank software-WebGPU screenshots were least helpful. Networking review identified five additional integration issues.

**Engine Feedback:** Native animation clips worked well. Rapier’s collider-churn failure required persistent physics pools. Combat, input, procedural assets, and shared-world networking were built for this game. Physics lifetime handling was hardest. Engine source changes: none. Desired improvement: consistent cel materials across rendering backends.

**Prompt Feedback:** The source and controller-first direction were useful. Standalone networking expectations were unclear. Completing synchronized co-op in one HTML was hardest. I would clarify the required standalone transport and fallback-renderer policy.

These details are also included in About/Credits and the validated exit-interview JSON.