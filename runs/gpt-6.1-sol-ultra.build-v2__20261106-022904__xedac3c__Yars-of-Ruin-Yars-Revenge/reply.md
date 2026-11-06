Built **[Yars of Ruin](./Yars-of-Ruin-Yars-Revenge-gpt-6.1-sol-ultra-20261106-022904.html)**. Open the HTML directly to play.

Includes three sectors, solo/local/online co-op, Assist, practice, attract mode, and developer tools. **`npm test`: 177 passed, 0 failed.**

[Source and build instructions](./Yars-of-Ruin-Yars-Revenge-gpt-6.1-sol-ultra-20261106-022904/README.md) · [Exit interview](./exit-interview.json) · [Progress](./PROGRESS.md)

**Source Information:** Date: 2026-11-06 02:29:04. Source: [Yars’ Revenge (1982)](https://atari.com/pages/yarsrevenge). Plan: `PLAN.md`. Genre/perspective: arcade siege shooter, fixed overhead. Tech: JavaScript, my-3D2dge 0.89.1 with a small-screen fit patch, AI Hub client 1.4.0, Canvas2D and Web Audio. Art: original dimensional pixel art. Animation: articulated procedural bodies and native effects. Audio: synthesized music, effects and gibberish voices; music defaults to 10%. Online: AI Hub shared-world co-op and dedicated hosting; standalone solo/local co-op. Testing: unrestricted headless verification. Research: instructions, comic, creator interview and publisher gameplay excerpt; full-longplay verification unknown. Environment: Codex CLI, headless Linux/WSL2. Model: OpenAI gpt-6.1-sol, reasoning effort ultra. Usage: **added on import**.

**Testing Feedback:** Found and fixed 15 defects, including 3 considered critical. Most helpful: ordinary-action campaign and final-phase recovery tests. Least helpful: syntax-only checks. Physical devices and human listening were unavailable; browser profiles, controller stubs and offline audio were used.

**Engine Feedback:** Best features were native pixels, fixed stepping and Shell. Initial mistakes involved TV scaling and mode flags. The main custom system was the authoritative siege simulation. Coordinating menu, simulation and networking clocks was hardest. The engine patch permits small-screen fitting below 1x. A shared-world dedicated-server reference would help future builders.

**Prompt Feedback:** The playable acceptance gates were useful. Delivery paths versus suggested internal paths needed reconciliation. Supporting every mode in one portable artifact was hardest. Separating core release checks from exploratory breadth would improve the prompt.