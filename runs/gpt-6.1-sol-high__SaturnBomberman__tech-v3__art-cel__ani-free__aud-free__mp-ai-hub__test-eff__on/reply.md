[**Play / download Saturn Boom Rangers**](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-high__SaturnBomberman__tech-v3__art-cel__ani-free__aud-free__mp-ai-hub__test-eff__on/work/Saturn-Boom-Rangers-Saturn-Bomberman-gpt-6.1-sol-high-20261029-1552.html)

Completed single-file demo: three campaign chapters, boss fight, eight-ranger battles, rideable companions, bomb upgrades, controller menus, and looping attract mode. Requires WebGPU and internet access for CDN dependencies. Launch through AI Hub for online play.

The following notes also appear in About and the HTML’s top comment.

**Source Information**

- **Date:** 2026-10-29 15:52
- **Source:** Saturn Bomberman
- **Tech:** Three.js r180, WebGPU without fallback, Rapier 0.19.3, Gamepad API, Web Audio API, HTML/CSS/JavaScript.
- **Art:** Procedural cel-shaded 3D with ink silhouettes.
- **Animation:** Procedural rigs, walking, hopping, squash-and-stretch, and physics-driven debris.
- **Audio:** Original synthesized music and effects; no voice.
- **Online:** AI Hub Protocol v1, client 1.3.0; shared-world versus for up to four online players. Also supports four local players.
- **Testing:** Lightweight gameplay, controller, network, phone, tablet, desktop, ultrawide, and WebKit checks. Real iOS Safari and physical controllers were unavailable.
- **Environment:** Codex CLI (headless); Linux; browser unknown.
- **Model:** OpenAI, gpt-6.1-sol, reasoning effort high.
- **Usage:** API cost unknown; tokens unknown; session approximately 27 minutes.

**Testing Feedback**

114 assertions passed. Four interface issues were fixed: menu focus, compatibility-screen layering, mobile dialog clipping, and phone-title contrast. Zero game-breaking issues were found. Most helpful: the hub harness under latency, packet loss, server hosting, and host departure. Least helpful: early screenshots using incorrect software-Vulkan flags.

**Engine Feedback**

Liked most: procedural scene composition and Rapier physics. Got stuck on software-Vulkan capture configuration. Built the grid rules, bomb propagation, bots, progression, controller UI, animation, and networking. Hardest: reconciling smooth movement with shared-world state. Would overhaul the classic/node material split and add a complete WebGPU toon starter with clearer diagnostics.

**Prompt Feedback**

Liked most: controller-first UX and explicit attract mode. Confusing: the multiplayer link describes hub sessions rather than standalone rooms. Hardest: completing the campaign, battle systems, and networking together. Further test: four physical DualSense controllers across four computers in a real AI Hub session.