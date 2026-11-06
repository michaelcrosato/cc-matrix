import fs from "node:fs/promises";

const results = JSON.parse(
	await fs.readFile("tests/artifacts/results.json", "utf8"),
);
if (results.length < 35 || results.some((r) => !r.pass))
	throw new Error("The full suite must pass before finalizing feedback.");
const reports = await Promise.all(
	["hub-2-standard", "hub-4-standard", "hub-4-host-leave"].map(async (name) =>
		JSON.parse(await fs.readFile(`tests/artifacts/${name}.json`, "utf8")),
	),
);
if (reports.some((r) => !r.pass))
	throw new Error("All AI Hub scenarios must pass.");
const info = JSON.parse(await fs.readFile("metadata.json", "utf8"));
const protocolChecks = reports.reduce((n, r) => n + r.checks.length, 0);
info.sourceInformation.testing = `${results.length}/${results.length} automated checks passed, including a full six-shift Rapier playthrough, emulated standard gamepad, touch, Web Audio signal, actual two-page WebRTC pairing/results, WebKit and renderer recovery. AI Hub passed ${protocolChecks} protocol assertions across 2-player, 4-player with 150 ms latency / 50 ms jitter / 5% loss, and host-departure scenarios. Screenshots inspected at 1920×1080 and portrait mobile. Physical-controller feel, real mobile hardware and subjective audio quality: unknown.`;
info.testingFeedback = [
	"8 distinct game issues were found through scripted tests, visual inspection and test-driven review: accumulating wind, low-contrast HUD text, hidden-overlay CSS precedence, invalid font declarations, renderer resource lifecycle, controller scrolling in credits, overlapping portrait HUD controls and online difficulty changing through settings. All were corrected. Timing/readback problems in the headless test setup were tracked separately.",
	"3 were potentially game breaking: wind made later shifts impossible, the hidden loading overlay blocked clicks, and renderer lifecycle errors could stop drawing after a restart or backend change. All were corrected.",
	"The complete six-shift Rapier playthrough. It exposed persistent wind-force accumulation at shift three; the corrected run caught all 184 deliveries and completed every shift.",
	"Headless WebGPU pixel readback. Software-driver and readback failures made it unreliable visual evidence. Renderer submission state and compatibility-backend screenshots were more useful.",
];
info.engineFeedback = [
	"Native AnimationMixer tracks, procedural geometry and toon node materials let character motion, water tubs and the illustrated rooftop share one scene. Rapier sensor events made catches precise.",
	"I first treated persistent Rapier forces as per-step forces, which accumulated wind. I also encountered renderer cache/lifecycle problems while reusing or disposing compiled resources, and unreliable software WebGPU readback. Fresh scene resources and guarded startup/recovery resolved the application issues.",
	"The catch/combo/douse/wave state machine, controller-first shared UI, touch assistance, procedural sound and both multiplayer lifecycles.",
	"Coordinating asynchronous GPU initialization and recovery with physics, native animation, input and network round start/end, while keeping the single-file game usable offline.",
	"None to engine source. Used stock Three.js 0.180.0 and Rapier 0.19.3; recovery and compatibility handling live in the application.",
	"A documented device-loss recovery API that replaces a renderer without invalidating node materials or leaving pending compilation work.",
];
info.promptFeedback = [
	"The concrete source, controller-first brief, code-only audio and single-file delivery made the creative target clear.",
	"The ban on research alongside a required online integration reference needed interpretation. I fetched that contract and dependency code directly as implementation material, without web research.",
	"Making polished gameplay, all input types, the attract loop, live developer controls, self-contained packaging and two online lifecycles work as one coherent game.",
	"Clarify the expected standalone online pairing flow and whether TURN relay or matchmaking infrastructure is provided, or manual serverless WebRTC pairing is sufficient.",
];
await fs.writeFile("metadata.json", JSON.stringify(info, null, 2) + "\n");
await fs.writeFile(
	"tests/artifacts/final-verification.json",
	JSON.stringify(
		{
			gameChecks: results.length,
			protocolAssertions: protocolChecks,
			gameIssues: 8,
			criticalIssues: 3,
			allPassed: true,
		},
		null,
		2,
	) + "\n",
);
console.log(
	`Feedback finalized from ${results.length} passing checks and ${protocolChecks} passing Hub assertions.`,
);
