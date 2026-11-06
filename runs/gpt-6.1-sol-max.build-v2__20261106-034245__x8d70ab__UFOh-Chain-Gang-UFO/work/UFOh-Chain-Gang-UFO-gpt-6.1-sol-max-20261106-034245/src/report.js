export const REPORT = {
	sourceInformation: {
		date: "2026-11-06 03:42:45",
		source:
			"UFO! (Magnavox Odyssey², 1981), Ed Averett; Europe: Satellite Attack / Videopac 34",
		plan: "PLAN.md",
		genre: "Multidirectional arcade shooter",
		perspective: "Fixed overhead arena",
		tech: "JavaScript, Canvas 2D, my-3D2dge v0.89.1 (8ecc2f6), AI Hub Session Protocol v1 client 1.4.0 (35a1047)",
		artDirection:
			"Original code-drawn volumetric pixel machinery, shaded saucers, orbital shield, layered space backdrops",
		animation:
			"Native fixed-step scenes, game.tween, E.ease, E.Path and procedural animated parts",
		audio:
			"Original code-generated native synth effects, five music scores (10% default), procedural gibberish radio voice",
		online:
			"Solo; simultaneous local co-op; AI Hub authoritative shared-world co-op for 1–2 players, including server host",
		testing:
			"Deterministic headless simulation, scripted full mission, native draw validation, emulated controller/touch, offline audio, browser and official Hub harness checks; no FPS target",
		research:
			"Original manual, Odyssey² archive and review, Videopac Games analysis; original sound waveforms unknown (recording fetch unavailable)",
		environment: "Codex CLI (headless); Linux",
		model: "OpenAI, gpt-6.1-sol, reasoning effort max",
		usage: "added on import",
	},
	testingFeedback: [
		"25 implementation issues found by automated checks and integration/visual review; all fixed. Test-fixture mistakes are excluded. See docs/testing.md for the ledger.",
		"4 blocked a supported flow or could break an encounter: controller pause input, two-pad joining, invalid content import, and touch-only name entry. All fixed.",
		"The legal-input full mission through the native clock and exact exported HTML: it exposed boss timing/telegraph problems and proved every phase, extraction, results and replay.",
		"Static syntax checks were least informative; they could not expose timing, device ownership or multiplayer lifecycle faults.",
	],
	engineFeedback: [
		"The native pixel primitives, shaded asset system, fixed clock and headless advance work together well.",
		"Yes. I initially cleared native menu input during pause and let a join press reach the next menu. Integration tests caught both mistakes.",
		"The shield combat simulation, authored encounter data and authoritative co-op world.",
		"Keeping a fixed world arena fitted to every viewport while using native camera, menus and input.",
		"none; upstream engine and released Hub client are unmodified.",
		"Add a fixed-arena fit helper and simultaneous shared-world snapshot example to the arcade starter.",
	],
	promptFeedback: [
		"The shield tradeoff and explicit completion gates supplied a clear creative and technical direction.",
		"The source is called UFO in the task but UFO! in the historical manual; the plan resolves the identity.",
		"Verifying the complete mission, input methods, procedural sound and network lifecycle as one coherent game.",
		"Supply the pinned engine and protocol files with the task and distinguish required features from tuning suggestions.",
	],
	aiHub: {
		name: "UFOh Chain Gang",
		tagline: "A little saucer. An enormous attitude.",
		description:
			"Shoot to spend your shield, then ram when it returns. Pilot a cocky little saucer through linked satellites, crossing gunships and a three-phase command craft in a complete arcade mission or seeded score attack.",
		type: "Game",
		genre: "Shooter",
		source: "UFO! (Odyssey², 1981)",
		series: "",
		players: "1–2",
		controls:
			"Move: left stick / WASD / arrows; aim: right stick / mouse; fire: R2 or Cross / Space or click; menu: Options / Esc; touch: invisible twin sticks with burst assistance.",
		tags: ["arcade", "co-op", "top-down", "pixel art", "sci-fi", "boss fights"],
	},
};
