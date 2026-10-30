[Play / download Rocket Rally](./Rocket-Rally-RocketLeague-gpt-6.1-sol-xhigh-20261028-2352.html)

Six modes, six training drills, aerials, wall riding, demolitions, replays, attract mode, four-player split screen, and private online rooms. Serve the HTML over localhost or HTTPS in a WebGPU-capable browser. CDN dependencies require internet.

**Source Information:** 2026-10-29 00:34, America/Vancouver. Inspired by Rocket League; title randomly selected from 50 candidates. [Three.js R180](https://threejs.org/docs/pages/WebGPURenderer.html), strict WebGPU, Rapier 0.19.3, PeerJS 1.5.5, Web Audio, and Gamepad API. Procedural cel-shaded art, rigid-body and procedural animation, synthesized music/effects, optional browser speech; voice unknown. Online uses host-authoritative WebRTC. Environment: Codex CLI, headless Linux; user browser unknown. Tested Chrome 154. Model: OpenAI gpt-6.1-sol, xhigh. Cost/tokens unknown; session approximately 42 minutes.

**Testing Feedback:** 38/38 lightweight acceptance checks passed, including four browser peers. Six issues corrected; three critical involved initial headless GPU setup, demolition speed, and split-screen mapping. Most helpful: screenshot inspection and input-driven physics checks. Least helpful: syntax-only checks. Physical controllers and cross-network NAT behavior remain unverified.

**Engine Feedback:** TSL shading and Rapier contacts worked well. Renderer initialization and boost handling needed correction. The vehicle controller was the largest custom system; coordinating physics, cameras, and networking was hardest. I would overhaul implicit renderer fallback and add a public strict-WebGPU initialization option.

**Prompt Feedback:** The controller-first direction and concrete scope were strongest. Online infrastructure requirements were unclear. Delivering all systems coherently in one HTML was hardest. The next test would use four physical PS5 controllers across real-world networks.

Full feedback is also included in About/Credits and the opening HTML comment.