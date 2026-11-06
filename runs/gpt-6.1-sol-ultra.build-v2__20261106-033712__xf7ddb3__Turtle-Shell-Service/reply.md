Built [**Turtle Shell Service**](./Turtle-Shell-Service-Turtles-1983-gpt-6.1-sol-ultra-20261106-033712.html): five floors, 26 rescues, solo, local co-op, and AI Hub co-op. **151/151 checks pass.**

[Metadata](./exit-interview.json) · [Progress](./PROGRESS.md)

**Source Information:** Date: 2026-11-06 03:37:12. Source: [Turtles, 1983 US Odyssey² release](https://odyssey2.info/library/manuals/us_turtles/Turtles%20%28USA%29.pdf). Plan: PLAN.md. Genre: arcade maze rescue. Perspective: fixed overhead 2D. Tech: JavaScript, HTML, Web Audio, my-3D2dge 0.89.1, Hub client 1.4.0. Art Direction: original shaded pixel hotel. Animation: continuous native creature rigs. Audio: synthesized music, effects, and gibberish voices; music defaults to 10%. Online: authoritative Hub co-op. Testing: headless campaigns, browser automation, emulated controllers/touch, audio analysis, and Hub harness. Research: manual pictures, documented screenshots, release entry, and review; no footage or audio inspected. Environment: Codex CLI, headless Linux. Model: OpenAI gpt-6.1-sol, ultra. Usage: added on import.

**Testing Feedback**

1. Found and fixed 17 issues.
2. One critical remote-input lock, fixed.
3. Most helpful: completing the exported game through native keyboard actions.
4. Least helpful: an initially overbroad export regex, subsequently corrected.

**Engine Feedback**

1. Best: native pixel rendering and exact headless stepping.
2. Wrong assumptions: GridMover turn queuing and touch-feed behavior.
3. Built: deterministic rescue rules and network authority.
4. Hardest: coordinating movement, device seats, and reconciliation.
5. Changed: added a hidden-setting filter for developer sliders.
6. Suggested: native simultaneous arcade seats and a custom-creature rig API.

**Prompt Feedback**

1. Best: explicit mechanics and completion evidence.
2. Confusing: the source year’s port ambiguity.
3. Hardest: consistent behavior across every input and multiplayer mode.
4. Suggested: a small shared-world example alongside the acceptance checklist.