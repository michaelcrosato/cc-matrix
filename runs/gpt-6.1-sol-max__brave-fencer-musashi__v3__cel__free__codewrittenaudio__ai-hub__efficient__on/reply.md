[Open Brave Fencer Mushimaru](/home/micha/dev/cc-matrix/runs/gpt-6.1-sol-max__v19__v3__cel__free__codewrittenaudio__ai-hub__efficient__on/work/Brave-Fencer-Mushimaru-Brave-Fencer-Musashi-gpt-6.1-sol-max-20261029-0651.html)

Complete single-file adventure with four areas, three borrowed powers, village services, rescues, physics puzzles, a three-phase boss, saves, attract mode, and co-op. Requires WebGPU and internet access for dependencies.

**Source Information**

- Date: 2026-10-29 07:51, America/Vancouver.
- Source: Brave Fencer Musashi. Original title selected randomly from 50 candidates.
- Tech: Three.js r180, WebGPU only, Rapier 0.19.3, Gamepad API, Web Audio API, PeerJS 1.5.5, AI Hub client 1.3.0; HTML/CSS/JavaScript.
- Art: Procedural cel shading, ink outlines, faceted scenery and shadows.
- Animation: Procedural hierarchical rigs and effects.
- Audio: Original synthesized music, effects and gibberish voices.
- Online: AI Hub and standalone room-code co-op for up to four; two-controller couch co-op.
- Environment: Codex CLI, headless Linux; tested Chrome 154. Player browser: unknown.
- Model: OpenAI gpt-6.1-sol, reasoning effort max.
- Usage: API cost and tokens unknown; approximately 60 minutes.

**Testing Feedback**

All 167 checks passed: 35 gameplay checks, 6 controller/couch checks, 5 real WebRTC checks and 121 official hub checks. Hub tests used 150 ± 50 ms latency and 5% packet loss, including departures and a dedicated host. Rendering was checked separately; no FPS testing.

Seven defect categories were corrected, three considered game-breaking. The complete quest test was most helpful; the initial driver-corrupted Vulkan screenshot was least helpful. Physical DualSense hardware and four-device WAN completion remain untested.

**Engine Feedback**

Most liked: procedural art freedom and Rapier’s character controller. Incorrect assumptions involved toon material options and a collider query callback. The largest custom system was the adventure framework. Separating responsive local movement from shared authority was hardest. I would overhaul automatic renderer fallback and add an official example combining toon rendering, physics, controller menus and networking.

**Prompt Feedback**

The source inspiration, visual direction and controller requirement gave clear creative constraints. “Feature-complete demo” left duration and feature inventory open. Combining the adventure, multiplayer and polish into one HTML was hardest. The additional test I would choose is a complete four-person WAN run using physical DualSense controllers.

These details are also included in About/Credits and the HTML’s opening comment.