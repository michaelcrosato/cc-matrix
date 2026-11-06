export const sourceInformation = {
	date: "2026-11-05 21:26:13",
	source: "Dodge ’Em (Atari, 1980)",
	plan: "none",
	genre: "Arcade racing / driving maze",
	perspective: "Fixed overhead orthographic 3D",
	tech: "Three.js r180 (0.180.0), WebGPURenderer (WebGPU; WebGL2 fallback), Rapier 0.19.3, Gamepad API, Web Audio, WebRTC; esbuild 0.28.2",
	artDirection:
		"Cel-shaded, ink-outlined miniature rooftop garden; procedural geometry and textures",
	animation:
		"Three.js AnimationMixer with original chassis keyframe clips; procedural wheels, petals and particle motion",
	audio:
		"Original oscillator music (10% default), synthesized engine and effects, formant-synthesized gibberish voices; no audio files",
	online:
		"AI Hub shared-world co-op; standalone WebRTC invitation/reply; same-device tab link; 1–2 local players",
	testing:
		"Headless scripted core, browser, synthesized-audio and two-peer networking checks; screenshots for visual composition",
	research:
		"Official Atari description and screenshot; original Atari instruction manual via AtariAge; official Three.js and Rapier documentation; AI Hub session documentation",
	environment: "Codex CLI (headless); Linux",
	model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
	usage: "added on import",
};
export const testingFeedback = [
	"12 issues were caught and fixed: visual layering and title composition and branding overlap, buffered steering, checkbox activation, results navigation, shared-life exhaustion, guest tuning authority, Hub waiting/end input, attract click handling, and wall-clock idle timing under delayed rendering.",
	"3 were game breaking: hidden road, settings confirmation restarting a run, and closing results leaving no way to restart.",
	"A deterministic four-circuit playthrough verifies every stage and all 320 flowers.",
	"Syntax checks alone could not establish playability or visual quality.",
];
export const engineFeedback = [
	"Three.js makes an orthographic miniature and native keyframe animation straightforward.",
	"Headless WebGPU screenshots needed separate visual verification; software-adapter behavior varies.",
	"The lane-and-gate driving model, complete arcade flow and shared-world networking.",
	"Keeping a clean single-file WebGPU release with embedded Rapier WASM and multiplayer client.",
	"none",
	"A built-in deterministic capture and headless WebGPU verification path.",
];
export const promptFeedback = [
	"The source-first brief and controller-first UX gave the game a clear direction.",
	"The source names an endless arcade game while the requested demo needs a complete ending; four circuits resolve that.",
	"Combining source-faithful gate timing, accessible controls and online co-op in one file.",
	"Specify whether direct-peer networking must include a hosted TURN relay; direct WebRTC depends on the network.",
];
