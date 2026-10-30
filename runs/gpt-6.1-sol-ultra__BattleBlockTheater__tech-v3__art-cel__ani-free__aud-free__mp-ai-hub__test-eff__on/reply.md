Built [**Pratfall Playhouse**](./Pratfall-Playhouse-BattleBlockTheater-gpt-6.1-sol-ultra-20261029-1529.html): three acts, boss finale, couch and online co-op, controller menus, procedural audio, and a ten-second attract reel.

Serve through localhost or HTTPS in a WebGPU-capable browser. [Build instructions and editable stages](./Pratfall-Playhouse-BattleBlockTheater-gpt-6.1-sol-ultra-20261029-1529/README.md).

**Source Information**

- Date: 2026-10-29 15:29.
- Inspiration: BattleBlock Theater. Title randomly selected from 50 candidates.
- Tech: Three.js r180, WebGPU exclusively, Rapier 0.19.3, Gamepad API, Web Audio.
- Art: original cel-shaded puppet theater with ink outlines and layered scenery.
- Animation: articulated procedural poses, squash and stretch, particles.
- Audio: original synthesized music and effects; optional browser speech narration.
- Online: [AI Hub](https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub) co-op for 1–4 players; two-player couch co-op.
- Testing: lightweight mechanics, campaign, multiplayer, responsive UI, WebKit capability checks, and GPU visual readback.
- Environment: Codex CLI (headless); Linux; browser unknown.
- Model: OpenAI, gpt-6.1-sol, reasoning effort ultra.
- Usage: API cost and token count unknown; approximately 15 minutes elapsed.

**Testing Feedback**

Eight issues caught and fixed, including two critical checkpoint/renderer issues. Final results: **15/15 gameplay checks**, **25/25 multiplayer checks**, and **26/26 dedicated-host checks** passed.

Most helpful: the Rapier respawn test. Least helpful: ordinary WebGPU screenshots on this machine’s faulty software compositor; GPU readback provided accurate visuals. Physical PS5 controllers and real Safari remain untested.

**Engine Feedback**

- Best: scene graphs and toon materials.
- Wrong assumptions: screenshot reliability and texture-disposal timing.
- Main custom work: movement, campaign systems, controller UI, co-op synchronization.
- Hardest: WebGPU diagnostics and coordinating physics with network state.
- Overhaul: implicit WebGL fallback.
- Change: clearer device diagnostics and reliable capture helpers.

**Prompt Feedback**

- Best: the complete vertical-slice focus.
- Confusing: the boundary of “all features.”
- Hardest: making every system feel like one finished show.
- Additional test: a full online playthrough on separate machines with actual PS5 controllers.

These reports are also embedded in About/Credits and the HTML’s opening comment.