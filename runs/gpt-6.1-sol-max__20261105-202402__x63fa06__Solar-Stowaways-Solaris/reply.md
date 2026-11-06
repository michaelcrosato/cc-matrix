[**Play Solar Stowaways**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202402__x63fa06/work/Solar-Stowaways-Solaris-gpt-6.1-sol-max-20261105-202402.html) · [Exit interview JSON](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__20261105-202402__x63fa06/work/exit-interview.json)

Complete five-mission demo, bundled into one **3.18 MB HTML**. Includes developer tools, attract mode, checkpoints, controller/keyboard/touch controls, and multiplayer. **71/71 checks passed**, including the full campaign and official AI Hub scenarios.

**Source Information**

- **Date:** 2026-11-05 20:24:02. **Source:** Solaris (1986), Atari 2600. **Plan:** none.
- **Genre:** arcade space shooter with rescue and navigation. **Perspective:** first-person cockpit and top-down tactical chart.
- **Tech:** Three.js r180, WebGPU with WebGL2 recovery, Rapier 0.19.3, Gamepad API, Web Audio, WebRTC, AI Hub protocol v1/client 1.4.0.
- **Art:** procedural cel shading and ink outlines. **Animation:** native AnimationMixer clips plus procedural flight and effects.
- **Audio:** synthesized music, effects, and gibberish voices; no audio files; music defaults to 10%.
- **Online:** AI Hub ghost races for 1–4; standalone direct WebRTC for two.
- **Testing:** headless gameplay, GPU readback/recovery, emulated controllers and multitouch, audio analysis, multiplayer, TV/phone layouts, and Hub latency/loss/host-departure scenarios. Physical hardware, subjective listening, and restrictive-NAT connectivity: unknown.
- **Research:** native source knowledge only; required Hub implementation files and dependencies downloaded.
- **Environment:** Codex CLI, headless Linux. **Model:** OpenAI gpt-6.1-sol, reasoning effort max. **Usage:** added on import.

**Testing Feedback**

1. Six issues found through automated or visual testing were corrected, plus one protocol-review fix and five lint findings.
2. One issue blocked software WebGPU rendering; fixed. No unresolved critical issue was found.
3. GPU pixel readback was most helpful: state checks missed the rendering failure.
4. Headless WebGPU screenshots were least helpful because the canvas could appear blank.

**Engine Feedback**

1. TSL, procedural geometry, and AnimationMixer worked well together.
2. Yes—software WebGPU configuration and device recovery required investigation.
3. Built the flight, mission, UI, audio, and networking systems.
4. Coordinating startup, readback, and recovery across renderer backends was hardest.
5. Engine changes: none.
6. A complete, documented device-loss recovery example would help.

**Prompt Feedback**

1. The creative constraints and single-file delivery target were clear.
2. The standalone multiplayer joining method was unspecified.
3. Combining five missions, three input methods, and two networking paths was hardest.
4. Specify a target demo duration and preferred standalone joining method.

These details are also included in the game’s About/Credits screen and the validated JSON.