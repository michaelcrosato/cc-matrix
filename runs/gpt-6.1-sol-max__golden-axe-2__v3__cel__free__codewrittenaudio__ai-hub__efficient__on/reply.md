Built **Golden Fang II — The Hollow Crown**.

[Open the single HTML game](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Golden-Fang-II-Golden-Axe-II-gpt-6.1-sol-max-20261029-0607.html) · [Controls and build instructions](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v16__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Golden-Fang-II-Golden-Axe-II-gpt-6.1-sol-max-20261029-0607/README.md)

Includes three heroes, six encounters, mounted combat, elemental magic, a three-phase boss, local/online co-op, and looping AI attract mode.

**Source Information:** Date: 2026-10-29 06:07, America/Vancouver. Inspiration: **Golden Axe II**. Stack: Three.js r180, strict WebGPU, Rapier 0.19.3, Gamepad API, Web Audio, PeerJS 1.5.5, and AI Hub protocol v1/client 1.3.0. Art uses procedural cel shading; animation uses hierarchical procedural rigs. Music, effects, and gibberish voices are code-written. Online supports standalone rooms and AI Hub co-op.

Environment: Codex CLI, headless Linux/WSL2, Chrome 154. Model: OpenAI gpt-6.1-sol, reasoning effort max. API cost and token usage: unknown. Session time: approximately 60 minutes.

**Testing Feedback:** Passed 73 hub checks, eight campaign/combat checks, controller/attract/inversion checks, touch messaging, and real standalone-room synchronization/departure checks. Testing caught four issues; two were game-breaking and are fixed. The campaign simulation was most helpful. Repeated canvas screenshots were least helpful: headless Vulkan presentation was corrupted even in a plain WebGPU test. Offscreen GPU rendering passed; native GPU display and physical controllers remain unknown.

**Engine Feedback:** The scene graph and toon materials worked well. I initially guessed Rapier’s angular velocity signature incorrectly. Combat, encounter direction, and co-op required custom systems; synchronizing their timing was hardest. I’d overhaul silent graphics fallback and add a supported capture API independent of browser composition.

**Prompt Feedback:** The arcade reference and explicit controller, audio, and attract requirements gave clear direction. Duration and standalone signaling were open choices. Combining combat breadth, original art, and networking in one file was hardest. The additional test I’d run is a four-device physical DualSense playthrough across separate networks.

All requested information and feedback are also embedded in **About/Credits** and the HTML’s top comment.