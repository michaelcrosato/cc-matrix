[**Play Solaris Detour**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-222851__xf51be0/work/Solaris-Detour-Solaris-1986-gpt-6.1-sol-ultra-20261105-222851.html)

Complete six-sector demo with solo/co-op flight, rescues, keyed corridors, a boss, attract mode, and developer tools. **122/122 checks passed.** Internet is needed for CDN dependencies.

[Exit interview](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-222851__xf51be0/work/exit-interview.json) · [Test report](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-ultra__20261105-222851__xf51be0/work/Solaris-Detour-Solaris-1986-gpt-6.1-sol-ultra-20261105-222851/test-report.json)

**Source Information**

- **Date:** 2026-11-05 22:28:51.
- **Source:** Solaris, Atari 2600, 1986; Doug Neubauer / Atari. **Plan:** none.
- **Genre:** arcade space shooter with sector strategy and rescue missions. **Perspective:** third-person chase camera and tactical map.
- **Tech:** Three.js r180, WebGPU with WebGL 2 recovery, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, AI Hub Protocol v1.
- **Art:** procedural cel shading, ink outlines, angular spacecraft and alien landscapes.
- **Animation:** native Three.js AnimationMixer clips plus procedural flight motion.
- **Audio:** coded music, effects and gibberish voices; music defaults to 10%; no audio files.
- **Online:** 1–2 player shared-world co-op through AI Hub, standalone WebRTC rooms, and same-origin tabs.
- **Testing:** scripted full campaign, controller/touch emulation, audio levels, multiplayer, graphics recovery, file launch and visual captures. Physical controllers, real mobile devices and WAN verification: unknown.
- **Research:** [original manual](https://www.atariage.com/2600/manuals_old/solaris.html), [screenshots](https://atariage.com/screenshot_page.php?SoftwareLabelID=450), [MobyGames](https://www.mobygames.com/game/10506/solaris/), engine documentation and AI Hub protocol. Exact original audio patches: unknown.
- **Environment:** Codex CLI, headless Linux/WSL2.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort ultra.
- **Usage:** added on import.

**Testing Feedback**

1. Testing and review found 13 confirmed issues; all fixed.
2. Two were game breaking: blocked guest input after launch and stalled graphics initialization.
3. Forced graphics-device loss was most helpful; it exposed a recovery failure. The complete campaign also verified all eleven rescues and mission mechanics.
4. Static syntax checks were least helpful for finding gameplay problems.

**Engine Feedback**

1. TSL cel shading and native animation clips worked well.
2. Blocking shader warm-up caused startup trouble; initialization and recovery now have bounded handling.
3. The main custom systems were campaign logic, controls, co-op replication and graphics recovery.
4. Asynchronous graphics startup and headless verification were hardest.
5. Engine source changes: none.
6. I would add reliable deterministic WebGPU capture/readback.

**Prompt Feedback**

1. Source research and controller-first requirements gave the game a clear direction.
2. Standalone signalling was unspecified; I chose PeerJS.
3. Making combat, navigation, rescues, corridors and co-op feel coherent was hardest.
4. I would specify a target demo duration and standalone signalling expectations.

These details are also included in the in-game About/Credits screen.