[Play **Avow and Behold**](./Avow-and-Behold-Avowed-gpt-6.1-sol-max-20261029-1405.html) — single HTML, approximately 154 KB. Serve through localhost or HTTPS in a WebGPU-capable browser.

Includes elemental combat, sword and flintlock, a companion, crafting, talents, saves, three endings, controller menus, and looping attract mode.

**Source Information:** 2026-10-29 14:40, America/Vancouver. Inspired by *Avowed*. Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, native JavaScript/HTML/CSS. Cel-shaded procedural geometry and character animation. Original generative Web Audio music and synthesized effects; optional device narration, voice unknown. AI Hub Protocol v1/client 1.3.0 supports 1–4 parallel expeditions. Environment: Codex CLI (headless), Linux; browser unknown. Model: OpenAI gpt-6.1-sol, reasoning effort max. API cost and tokens: unknown; session approximately 35 minutes.

**Testing Feedback:** 40 scripted gameplay checks, 72 Hub checks, and six layout/settings scenarios passed. Testing and review caught six issues, including one quest-blocking save issue; all were fixed. Most helpful: quest progression and save restoration. Least helpful: syntax-only parsing. Checks were lightweight and included Chromium WebGPU, controller emulation, phone, tablet, desktop, ultrawide, and WebKit. Real iOS Safari was unavailable.

**Engine Feedback:** The scene graph, toon materials, and Rapier character controller worked well. I initially misread toon-material support and tied button sampling too closely to rendering. The main custom work was combat, narrative state, and unified controls. Coordinating asynchronous startup and responsive input was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU option.

**Prompt Feedback:** The controller-first direction and attract-mode requirement were strongest. The intended breadth and multiplayer mode were ambiguous; I chose the protocol’s parallel mode. Building a cohesive RPG chapter in one file was hardest. The next useful test would be a physical DualSense playthrough across browsers, including real Safari.

These details are also embedded in About/Credits and the HTML’s opening comment.