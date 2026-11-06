[**Play Star Riders**](./Star-Riders-Star-Raiders-gpt-6.1-sol-ultra-20261105-224539.html) · [Exit interview](./exit-interview.json)

Complete single-file demo. Internet access loads the pinned dependencies. **73 checks passed, zero failures**, including the full campaign, standalone multiplayer, and AI Hub sessions.

**Source Information**

- Date: 2026-11-05 22:45:39. Source: Star Raiders (1982). Plan: none.
- Genre: space combat, arcade shooter, light strategy. Perspective: first-person cockpit, aft view, overhead sector chart.
- Tech: Three.js r180, WebGPU with WebGL 2 fallback, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub protocol v1.
- Art: procedural cel shading and ink edges. Animation: native Three.js AnimationMixer clips plus procedural motion.
- Audio: code-generated music, effects, and gibberish voices; music defaults to 10%.
- Online: 1–4-player ghost competition through standalone rooms and AI Hub.
- Testing: headless browsers, simulated controllers/touch, offline audio rendering, real WebRTC, full mission scripts. Physical hardware and human listening: unknown.
- Research: [2600 manual](https://www.atariage.com/2600/manuals_old/star_raiders.html), [5200 manual](https://atariage.com/manual_html_page.php?SoftwareID=2106), official engine documentation, and Hub protocol.
- Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, ultra reasoning. Usage: added on import.

**Testing Feedback**

Four runtime/input defects were caught and fixed; two timer defects were game breaking. The most helpful test completed the campaign through actual photon collisions. The least helpful was the initial WebGPU screenshot, whose GPU canvas appeared blank.

**Engine Feedback**

Procedural geometry and native animation worked well. Collision defaults and headless capture caused wrong turns. Flight, campaign, UI, audio, and networking required custom systems; coordinating their lifecycles was hardest. Engine modifications: none. Most useful improvement: reliable headless WebGPU capture.

**Prompt Feedback**

The research and controller-first requirements gave clear direction. The intended 1982 port and multiplayer format were ambiguous. Combining every system into one polished HTML was hardest. Specifying the source platform and desired multiplayer mode would improve the prompt.

All required information and feedback also appear in About/Credits and the validated JSON.