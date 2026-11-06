export const INTERVIEW = {
	sourceInformation: {
		date: "2026-11-05 21:52:27",
		source: "Ice Hockey (1981), Alan Miller / Activision, Atari 2600",
		plan: "none",
		genre: "Sports; arcade ice hockey",
		perspective: "Fixed elevated orthographic 3D rink view",
		tech: "Three.js r180 (0.180.0), WebGPURenderer with WebGL 2 fallback; Rapier 3D 0.19.3; Gamepad API; Web Audio; WebRTC; AI Hub Session client 1.4.0",
		artDirection:
			"Procedural cel-shaded 3D diorama with ink outlines, cream ice, navy, teal and coral",
		animation:
			"Three.js AnimationMixer and authored keyframe clips: skating, shooting, passing, checking and celebrations",
		audio:
			"Code-generated organ/chiptune music at 10% default, synthesized rink effects and Animalese-style gibberish announcer; no audio files",
		online:
			"AI Hub host-authoritative versus; standalone direct WebRTC invitation/answer; BroadcastChannel quick rooms for same-origin tabs; local versus",
		testing:
			"Headless Chromium WebGPU and WebGL 2, scripted physics/playthrough/UI/controller/touch/audio/network checks; no physical pad, listening, real mobile device or external NAT verification",
		research:
			"Original Activision manual via AtariAge; Atari rink screenshots via Atarimania; contemporary sound description in Video Games June 1983; official Three.js/Rapier docs; AI Hub lib/hub README, session, bridge and harness",
		environment: "Codex CLI (headless); Linux",
		model: "OpenAI, gpt-6.1-sol, reasoning effort ultra",
		usage: "added on import",
	},
	testingFeedback: [
		"Eleven issues were caught and fixed across automated tests, visual checks and source review; the final suite passes 49 checks.",
		"One game-breaking issue: unsafe HTML bundle substitution prevented the first packaged build from starting.",
		"The complete keyboard-driven practice and three-rink cup playthrough, paired with the official two-player AI Hub harness, exercised the actual packaged game.",
		"Wall-clock movement assertions under software rendering produced timing false positives; assertions based on simulated game state were more useful.",
	],
	engineFeedback: [
		"Three.js native animation and TSL make the cel-shaded rink and procedural characters straightforward to combine.",
		"WebGPU headless screenshots can be blank; renderer state and a WebGL fallback screenshot provide complementary checks.",
		"The complete hockey rules, possession, teammate AI, input UX, practice and host-authoritative multiplayer.",
		"Coordinating fixed physics updates, possession and network snapshots with animation and menus.",
		"none",
		"Make headless WebGPU capture and renderer diagnostics more consistent.",
	],
	promptFeedback: [
		"The source research, controller-first design and complete-demo requirements give the game a clear direction.",
		"Ice Hockey has several namesakes; the 1981 date identifies Activision’s Atari 2600 game. The listed online integration is a protocol rather than a matchmaking service.",
		"Finishing a polished single-file game while covering controller, touch, audio and multiplayer lifecycle.",
		"Specify whether standalone internet play should include a hosted signaling service or a manual direct connection.",
	],
	aiHub: {
		name: "Hockey Ruckus",
		tagline: "Two on two. All out.",
		description:
			"Bank it, bash it, put it on ice. A cel-shaded two-on-two arcade hockey game with a three-rink cup, guided practice, turbo ice and local or online versus.",
		type: "Game",
		genre: "Sports",
		source: "Ice Hockey (1981)",
		series: "",
		players: "1–2",
		controls:
			"WASD / left stick skate; Space / Cross hold-release shoot; E / Square pass; Shift / Circle check; Q / Triangle switch; Esc / Options pause; mouse aim; touch drag + contextual action.",
		tags: ["3d", "arcade", "hockey", "versus", "retro", "sports"],
	},
};
