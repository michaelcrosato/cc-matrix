export const CREDITS = `Source Information
- Date: 2026-10-28 22:31
- Rocket League
- Tech: Three.js R180 (0.180.0) WebGPURenderer and MeshToonNodeMaterial, Rapier 0.19.3 (@dimforge/rapier3d-compat), Web Audio API, Gamepad API (standard mapping), WebRTC data channels. No WebGL path.
- Art Direction: stylized cel-shaded look. Quantized toon gradient lighting, ink outlines, flat team colors.
- Animation: procedural. Wheel spin from speed, dodge tilt, boost cone, supersonic streak, goal and demo sparks, kickoff countdown. No skeletal clips.
- Audio: procedural Web Audio music (bass, kick, hat loop) and synthesized effects for boost, jump, dodge, hit, demo, pad, kickoff, and goal. Voice: none. Calls are on screen plus tonal stingers.
- Online: WebRTC peer connections, manual SDP signaling, STUN, host-authoritative snapshots, up to 4 players. Local split screen for 2 to 4. Empty seats are AI. A 5th player is refused.
- Testing: lightweight node:test on the shipped match, vehicle, ball, input, attract, layout, and session modules, plus a Rapier arena step. Headless browser launch when an adapter exists.
- Environment: Grok CLI (headless); Linux; browser Chromium via Playwright 1.63
- Model: xAI, grok-4.7, reasoning effort xhigh
- Usage: unknown

Testing Feedback
- How many issues did testing catch? 5
- How many would be considered critical issues / game breaking? 4
- What was the most helpful test you ran? The headless launch showed the animation callback had been scheduled only once, so the match never advanced, and the first readback was only a sliver of the pitch. Stepping the match with the same Rapier surface samples the frame loop uses then showed a jump peak near y=0.67 snapped back onto the floor, so the second jump never dodged, and a boost ride on the +X wall drove the car out of the arena. Repeating that step at the match frame sizes 0.025s and 0.05s showed one floor sample was reused for every substep, so the jump stuck again and the next press stacked upward speed instead of dodging.
- What was the least helpful test you ran? Checking that the gamepad and keyboard action objects merely share the same keys, which passes even if a binding feels wrong in a match.

Engine Feedback
- What did you like most about the engine? MeshToonNodeMaterial on the WebGPU renderer, with a 4-step gradient, gives a readable cel look without a second shading pipeline. Rapier's ray casts against the arena colliders are a small API.
- Did you get stuck or guess wrong? Yes. WebGPURenderer installs a WebGL2 backend unless that switch is cleared, and a headless Linux box often has no WebGPU adapter. Rapier does not model boost, a second-jump dodge, or demolitions.
- What was the most important thing you had to build yourself? The Soccar rules: kickoff, clock, sudden-death overtime, boost pads, jump into a directional dodge, wall drive, and supersonic demos, shared by the tests and the match.
- What was the hardest part about using the engine? One spatial frame. Car forward is Three.js local -Z with Euler order YXZ, and the same basis has to drive the chase camera. The other hard part is failing in the open when WebGPU is missing.
- If you had to remove or overhaul one thing from engine, what woudl that be? The automatic WebGL2 backend inside WebGPURenderer. A no-fallback game should not grow a second renderer by default.
- If you could change one thing about the engine, what would it be? A vehicle helper in Rapier that takes a surface normal, so wall drive and boost are forces in the solver instead of a step beside it.

Prompt Feedback
- What did you like most about this prompt? It names the fantasy precisely: cars, a ball, goals, boost, a flip, split screen, and a 4 player cap, with a 10-foot controller layout.
- What was confusing? The deliverable name must keep the two words "Rocket League" and a space. The line about modes that do not exist "if it is easy" sits next to a demand for a finished demo with no unfinished features.
- What was the hardest thing to do? A real online join for four peers without a hosted relay, and a WebGPU-only page that still shows a picture or an honest failure on a headless machine.
- If there was one test you could of run, what would that test be? Two browsers on one LAN, trading SDP by hand, then scoring a goal on the host and seeing that goal on the guest.
`;
