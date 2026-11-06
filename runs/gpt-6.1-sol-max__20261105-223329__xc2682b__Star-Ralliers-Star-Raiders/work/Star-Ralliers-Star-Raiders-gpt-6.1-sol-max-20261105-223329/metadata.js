const CREDITS = {
	sourceInformation: {
		date: "2026-11-05 22:33:29",
		source:
			"Star Raiders (Atari, 1982); primarily the Atari 5200 version. Original design by Doug Neubauer.",
		plan: "none",
		genre: "Space combat simulation, arcade shooter, light strategy",
		perspective: "First person cockpit with aft view; top-down galactic chart",
		tech: "Three.js 0.180.0 (r180), WebGPURenderer / WebGPU with WebGL2 fallback; Rapier 3D 0.19.3; Gamepad API; Web Audio API; AI Hub session client 1.4.0; PeerJS 1.5.5 / WebRTC; BroadcastChannel",
		artDirection:
			"Procedural low-poly, hard-band cel shading, thick ink silhouettes, turquoise and tangerine space-comic palette.",
		animation:
			"Three.js AnimationMixer, AnimationClip and keyframe tracks for articulated wings, ship idle, relay rotation, repair shuttle and warp effects.",
		audio:
			"Code-only Web Audio music (10% default), synthesized photon, engine, shield, pulse and explosion effects, and Animalese-style gibberish radio voices. No audio files.",
		online:
			"1–4 pilot ghost competition: AI Hub Session Protocol v1. Standalone room codes use BroadcastChannel locally and PeerJS / WebRTC remotely. Other pilots appear in the same sector; each pilot runs an independent invasion.",
		testing:
			"Allowed: headless browser and scripted state tests, complete mission playthroughs, emulated standard gamepad, phone / tablet profiles, Web Audio signal checks and multiple browser pages. Verified: Chromium software WebGPU, WebGL2 fallback, WebKit portrait touch, normal and invulnerable patrols, controller / mouse switching, touch controls, live tuning, loss / siege / flagship shields, attract mode, standalone BroadcastChannel and real WebRTC, and the official AI Hub 2-player and 4-player harness at 150 ms latency, 50 ms jitter, 5% loss and host departure. 18/18 automated checks passed. Physical controller, real mobile hardware and subjective listening: unknown.",
		research:
			"Atari Star Raiders 5200 manual (AtariAge archive), Atari 2600 manual, Three.js r180 official toon example, Rapier documentation, PeerJS documentation and AI Hub protocol / official harness.",
		environment: "Codex CLI (headless); Linux / Ubuntu 26.04 on WSL2",
		model: "OpenAI, gpt-6.1-sol, reasoning effort max",
		usage: "added on import",
	},
	testingFeedback: [
		"5 game/build issues were found and fixed: the font download path, short landscape layout, overlapping touch messages, idle-controller interference with mouse fire, and restart state. Verification tooling was also corrected. Final gameplay/platform/network run: 18/18 checks passed.",
		"1 packaging blocker: an invalid font download URL. No remaining critical or game-breaking issues were observed.",
		"The scripted complete patrol under normal damage and energy rules, using real physics collisions, sector jumps, flagship combat, docking and mission evaluation.",
		"The software WebGPU screenshot showed a blank 3D canvas. State checks and WebGL2 captures supplied useful evidence instead.",
	],
	engineFeedback: [
		"Three.js procedural geometry, toon node materials and native AnimationMixer clips make a coherent visual style straightforward. The same scene also runs through the WebGL2 fallback.",
		"Software WebGPU screenshot capture was blank despite a running scene. I used simulation state checks and the WebGL2 backend for visual review. No engine API blocker remained.",
		"The flight and aiming model, sector strategy, energy / shield economy, controller-first interface, procedural audio and ghost networking.",
		"Keeping flight input, Rapier collision events, target projection, camera orientation and native animation coordinated across both rendering backends.",
		"none",
		"More reliable software WebGPU screenshot/readback support and clearer diagnostics across rendering backends.",
	],
	promptFeedback: [
		"The source research, complete vertical slice, controller-first philosophy, attract mode and live balance tools make the intended experience concrete.",
		"Star Raiders in 1982 can refer to Atari 2600 or Atari 5200 releases. The richer Atari 5200 systems were the main reference, with the 2600 manual also researched.",
		"Delivering the cockpit, strategic chart, physics, animation, audio, touch, controller and multiplayer systems as one polished, shareable HTML file.",
		"Specify the intended source platform and preferred multiplayer relationship when multiple interpretations are possible.",
	],
};
const FEEDBACK_QUESTIONS = {
	testingFeedback: [
		"How many issues did testing catch?",
		"How many were critical / game breaking?",
		"Most helpful test?",
		"Least helpful test?",
	],
	engineFeedback: [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"Most important thing built yourself?",
		"Hardest part of using the engine?",
		"Engine changes and why?",
		"One thing you would change?",
	],
	promptFeedback: [
		"What did you like most about the prompt?",
		"What was confusing?",
		"Hardest thing to do?",
		"What would you change?",
	],
};
