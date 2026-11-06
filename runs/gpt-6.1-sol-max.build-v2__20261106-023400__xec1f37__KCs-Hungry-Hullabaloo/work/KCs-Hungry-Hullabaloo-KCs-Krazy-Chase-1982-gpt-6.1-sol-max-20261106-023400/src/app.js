import { GardenAudio, renderAudioProof } from "./audio/music.js";
import { GARDENS, THEMES, TITLE, TUNING } from "./content/gardens.js";
import { GAME_INPUT, NativeControls } from "./input/controls.js";
import { HubCoop } from "./net/hub.js";
import { cell, key, validateLevel } from "./sim/maze.js";
import { STEP, World } from "./sim/world.js";
import { GardenStore } from "./tools/storage.js";
import { BRUSHES, Workshop } from "./tools/workshop.js";
import { GardenView } from "./view/garden-view.js";
import {
	ascii,
	COLORS,
	dim,
	NamePicker,
	nativeMenu,
	panel,
	text,
} from "./view/menus.js";
import { GardenRigs } from "./view/rigs.js";

const E = globalThis.My3D2dge,
	{ px } = E,
	hub = globalThis.AIHub;
const interview = globalThis.HULLABALOO_INTERVIEW;
const state = {
	world: null,
	attract: false,
	demoTime: 0,
	demoScene: -1,
	menu: null,
	editor: null,
	editorMenu: false,
	namePicker: null,
	about: null,
	aboutPage: 0,
	returnTo: "title",
	devPage: "main",
	frozen: false,
	step: false,
	teleport: false,
	cursor: [2, 7],
	debug: {},
	recordsMode: "solo",
	endingRecorded: false,
	reportAt: 0,
	assignment: ["keyboard", 0],
	pads: [],
	joinReassign: false,
	pauseAudio: false,
	ready: false,
	ended: false,
	touchTutorial: false,
};
const store = new GardenStore();
const game = new E.Game({
	id: "hullabaloo-v1",
	canvas: "screen",
	view: "overhead",
	views: ["overhead"],
	res: [512, 288],
	portrait: { res: [360, 288] },
	expand: true,
	input: GAME_INPUT,
	autoPause: !hub.active,
	live: hub.active,
	fullscreen: "button",
	bg: "#102534",
	menu: {
		quit: hub.active ? false : "title",
		items: () => pauseItems(),
		settings: [
			{ key: "music", value: 0.1 },
			{ key: "glyphs", value: "playstation" },
			{ key: "deadzone", value: 0.26 },
			{
				key: "voices",
				label: "Gibberish voices",
				group: "Sound",
				type: "slider",
				value: 0.65,
				min: 0,
				max: 1,
				step: 0.05,
				apply: (g, v) => {
					g.audio.voiceVolume = v;
					g.audio.applyVolume();
				},
			},
			{ key: "hints", label: "Garden hints", value: true, group: "Game" },
		],
		controls: {
			plant: "Plant a snack",
			paint: "Paint workshop cell",
			tools: "Workshop tools",
			previous: "Previous brush",
			next: "Next brush",
			undo: "Undo",
			redo: "Redo",
		},
	},
});
// Keep the engine's standard pause, settings, controls and rebinding screens,
// scaled through its native TV option for room-distance reading.
new E.Shell(game, {
	tv: true,
	standard: true,
	theme: {
		ink: "#ffefd0",
		paper: "rgba(12,30,46,.96)",
		accent: "#ffd184",
		muted: "#a7c6cd",
		line: "rgba(133,215,236,.3)",
		font: "system-ui, sans-serif",
		titleFont: "system-ui, sans-serif",
	},
});
const audio = new GardenAudio(game),
	rigs = new GardenRigs(game),
	view = new GardenView(game, rigs),
	arcade = new E.Arcade(game, {
		id: "hungry-hullabaloo",
		idle: 10,
		demo: 100000,
		hud: false,
	});
const controls = new NativeControls(
	game,
	() => arcade.wake(),
	() => {
		if (state.attract) {
			endAttract();
			return true;
		}
		return false;
	},
);
const net = new HubCoop(hub, {
	ready: () => {
		state.ready = true;
		state.world = net.world;
		game.o.autoPause = false;
		game.live = true;
		game.go("play", null, { fade: 0 });
		audio.scene("play", 0);
	},
	event: (e) => present(e),
	stage: (n) => {
		audio.scene("play", n);
	},
	end: () => {
		state.ended = true;
		state.endedAt = game.real;
		audio.stop();
		game.players.forEach((I) => {
			I.clear();
		});
		state.menu = null;
	},
	finish: () => audio.stop(),
});
function pauseItems() {
	if (hub.active) return [["Diagnostics", () => openDev(true)]];
	const out = [
		[
			"Restart garden",
			() => {
				closeShell();
				state.world?.retry();
				goPlay();
			},
		],
		["Developer Tools", () => openDev(false)],
	];
	if (state.world?.custom)
		out.unshift([
			"Return to workshop",
			() => {
				closeShell();
				game.go("workshop");
			},
		]);
	if (state.world?.players.length > 1)
		out.push(
			[
				"Reassign controllers",
				() => {
					closeShell();
					state.joinReassign = true;
					game.go("join");
				},
			],
			[
				"Continue solo",
				() => {
					closeShell();
					state.world.removePlayer(state.world.players.at(-1).id);
					controls.solo();
					goPlay();
				},
			],
		);
	return out;
}
function closeShell() {
	game.shell?.hide();
	game.resume();
	controls.consume();
}
function present(e) {
	if (state.attract) {
		state.demoEvidence = state.demoEvidence || {};
		state.demoEvidence[e.type] = (state.demoEvidence[e.type] || 0) + 1;
	}
	audio.event(e);
	view.effects(e);
}
function fit(dt, v, opts = {}) {
	view.fit(v, opts);
	rigs.update(dt, v);
	audio.update(dt, v);
}
function newRun(players = 1, level = 0, custom = null) {
	if (hub.active) return;
	state.world = new World({
		players,
		level,
		seed: Math.floor(Math.random() * 0xffffffff),
		custom,
	});
	state.endingRecorded = false;
	state.frozen = false;
	state.debug = {};
	if (players === 1) controls.solo();
	else controls.setSeats(state.assignment);
	if (!custom) store.checkpoint(state.world);
	goPlay();
}
function goPlay() {
	closeShell();
	game.go("play", null, { fade: 0 });
	audio.scene("play", state.world?.s.level || 0);
}
function titleItems() {
	const a = [];
	if (store.loadCheckpoint()) a.push("Continue");
	a.push("Play", "Local co-op", "Maze workshop", "Settings", "About / credits");
	return a;
}
function makeTitleMenu() {
	const items = titleItems();
	state.menu = nativeMenu(
		game,
		items,
		(_i, item) => {
			if (item === "Continue") {
				try {
					const saved = store.loadCheckpoint();
					state.world = new World();
					state.world.restore(saved.snapshot);
					state.endingRecorded = false;
					if (saved.mode === "coop") {
						state.joinReassign = true;
						game.go("join");
					} else {
						controls.solo();
						goPlay();
					}
				} catch {
					store.clearCheckpoint();
					makeTitleMenu();
					game.note("Checkpoint was damaged. Start a fresh feast.", 3);
				}
			}
			if (item === "Play") newRun();
			if (item === "Local co-op") {
				state.joinReassign = false;
				game.go("join");
			}
			if (item === "Maze workshop") {
				state.returnTo = "title";
				game.go("workshop");
			}
			if (item === "Settings") game.menu("settings");
			if (item === "About / credits") {
				state.returnTo = "title";
				state.about = null;
				game.go("about");
			}
		},
		{ x: 22, y: 114, rows: 6, scale: 2 },
	);
}
function positionTitle() {
	if (!state.menu) return;
	const tall = game.H > game.W * 1.1;
	state.menu.x = tall ? "center" : 20;
	state.menu.y = tall ? Math.min(game.H - 170, view.bounds.y1 + 28) : 116;
}
function titleBackdrop() {
	const w = new World({ demo: true });
	w.s.t = 1.6;
	state.titleWorld = w;
}
function endAttract() {
	state.attract = false;
	state.demoScene = -1;
	arcade.wake();
	arcade.demo = false;
	controls.consume();
	game.shell?.hide();
	game.go("title", null, { fade: 0 });
	audio.scene("title");
}
const DEMO_BEATS = [
	"A tail worth the trouble",
	"Pale pals. Perfect points.",
	"Matching mouths make shortcuts",
	"Plant a suspicious snack",
	"Double the drat. Double the delight.",
	"A friend makes a finer feast",
];
function demoStep(dt) {
	state.demoTime += dt;
	const scene = Math.floor(state.demoTime / 7) % DEMO_BEATS.length;
	if (scene !== state.demoScene) {
		state.demoScene = scene;
		state.world = new World({
			level: scene === 4 ? 3 : scene === 3 ? 2 : scene === 2 ? 1 : 0,
			players: scene === 5 ? 2 : 1,
			demo: true,
			seed: 600 + scene,
		});
		state.world.say(DEMO_BEATS[scene], 7);
		if (scene === 2) {
			const p = state.world.players[0];
			p.m.place(0, 4);
			p.m.dir = [-1, 0];
		}
		if (scene === 3) {
			const p = state.world.players[0];
			p.m.place(11, 9);
			p.m.dir = [1, 0];
			state.world.plant(p);
			for (const e of state.world.events) present(e);
			state.world.events = [];
			state.world.crawlers[0].target = [12, 9];
		}
		audio.scene("attract", state.world.s.level);
	}
	const w = state.world,
		cmd = {};
	for (const p of w.players) {
		if (scene === 2 && w.s.t < 1.2) {
			cmd[p.id] = { dir: [-1, 0] };
			continue;
		}
		let goals =
			w.s.fright > 0
				? w.sentries.filter((s) => s.spin <= 0).map((s) => cell(s.m))
				: [];
		if (!goals.length)
			goals = w.crawlers
				.map((c) => w.positions(c).at(-1))
				.filter(Boolean)
				.map((t) => w.graph.nearest([t.x, t.y]));
		goals.sort(
			(a, b) => w.graph.distance(cell(p.m), a) - w.graph.distance(cell(p.m), b),
		);
		const from = p.m.moving ? p.m._to : cell(p.m),
			path = w.graph.path(
				from,
				goals[p.id % Math.max(1, goals.length)] || from,
			);
		cmd[p.id] = {
			dir: path.length > 1 ? w.graph.direction(from, path[1]) : null,
			plant: scene === 3 && !w.bait.length && w.s.seeds > 0,
		};
	}
	if (w.s.phase === "play") w.step(dt, cmd);
	else if (w.s.phase === "clear" && w.s.t > 1) w.nextGarden();
	for (const e of w.events) present(e);
	w.events = [];
	fit(dt, w.view());
}
function joinMenu() {
	const pads = state.pads.map((p) => p.index);
	const options = ["keyboard", ...pads];
	if (!options.includes(state.assignment[0])) state.assignment[0] = options[0];
	if (
		!pads.includes(state.assignment[1]) ||
		state.assignment[1] === state.assignment[0]
	)
		state.assignment[1] = pads.find((n) => n !== state.assignment[0]) ?? -1;
	const ready =
		state.assignment[1] >= 0 && state.assignment[1] !== state.assignment[0];
	const names = [
		`Blue: ${state.assignment[0] === "keyboard" ? "keyboard" : `controller ${state.assignment[0] + 1}`}`,
		`Coral: ${state.assignment[1] < 0 ? "connect a controller" : `controller ${state.assignment[1] + 1}`}`,
		{
			label: state.joinReassign ? "Resume together" : "Start the feast",
			disabled: !ready,
		},
		"Back",
	];
	state.menu = nativeMenu(
		game,
		names,
		(i) => {
			if (i === 0) {
				const at = options.indexOf(state.assignment[0]);
				state.assignment[0] = options[(at + 1) % options.length];
				joinMenu();
			}
			if (i === 1) {
				const avail = pads.filter((n) => n !== state.assignment[0]);
				state.assignment[1] = avail.length
					? avail[(avail.indexOf(state.assignment[1]) + 1) % avail.length]
					: -1;
				joinMenu();
			}
			if (i === 2 && ready) {
				controls.setSeats(state.assignment);
				if (state.joinReassign) goPlay();
				else newRun(2);
			}
			if (i === 3) game.go(state.joinReassign ? "play" : "title");
		},
		{
			y: game.H / 2 - 30,
			scale: 2,
			onCancel: () => game.go(state.joinReassign ? "play" : "title"),
		},
	);
}
function reportMenu() {
	const w = state.world,
		more = (w.s.wave || 0) + 1 < (w.custom ? 1 : w.garden.courses || 1);
	state.menu = nativeMenu(
		game,
		[
			more
				? "Next course"
				: w.s.level === 4 && !w.custom
					? "Grand finale"
					: "Next garden",
			"Retry this garden",
			w.custom ? "Back to workshop" : "Save & title",
		],
		(i) => {
			if (i === 0) {
				w.nextGarden();
				if (w.s.phase === "victory") {
					game.go("ending");
					return;
				}
				if (!w.custom && !w.s.modified) {
					store.unlock(w.s.level + 1);
					store.checkpoint(w);
				}
				goPlay();
			}
			if (i === 1) {
				w.retry();
				goPlay();
			}
			if (i === 2) game.go(w.custom ? "workshop" : "title");
		},
		{
			y: game.H / 2 + 35,
			scale: 2,
			onCancel: () => game.go(w.custom ? "workshop" : "title"),
		},
	);
}
function endingMenu() {
	const w = state.world;
	const items =
		w.s.phase === "defeat"
			? ["Retry garden", "New run", "Records", "Title"]
			: w.custom
				? ["Back to workshop", "Play again", "Title"]
				: ["Replay gardens", "Records", "New run", "Title"];
	state.menu = nativeMenu(
		game,
		items,
		(_i, item) => {
			if (item === "Retry garden") {
				w.retry();
				goPlay();
			}
			if (item === "New run") newRun(w.players.length);
			if (item === "Records") {
				state.recordsMode = w.s.mode;
				game.go("records");
			}
			if (item === "Replay gardens") game.go("replay");
			if (item === "Back to workshop") game.go("workshop");
			if (item === "Play again") newRun(1, 0, state.editor.level);
			if (item === "Title") game.go("title");
		},
		{ y: game.H / 2 + 22, rows: 4, scale: 2, onCancel: () => game.go("title") },
	);
}
function recordEnding() {
	const w = state.world;
	if (
		state.endingRecorded ||
		hub.active ||
		w.s.demo ||
		w.s.modified ||
		w.custom
	)
		return;
	state.endingRecorded = true;
	arcade.demo = false;
	const mode = w.s.mode;
	if (arcade.qualifies(w.s.score, mode))
		arcade.enter(w.s.score, mode, () => endingMenu());
}
function aboutMenu() {
	state.menu = nativeMenu(
		game,
		[
			"Source information",
			"Testing feedback",
			"Engine feedback",
			"Prompt feedback",
			"Credits & rules",
			"Records & replay",
			"Back",
		],
		(i) => {
			if (i === 6) {
				game.go(state.returnTo);
				return;
			}
			if (i === 5) {
				game.go("replay");
				return;
			}
			state.about = i;
			state.aboutPage = 0;
			state.menu = null;
		},
		{ y: 70, scale: 2, rows: 7, onCancel: () => game.go(state.returnTo) },
	);
}
const testQs = [
	"Issues caught",
	"Critical / game breaking",
	"Most helpful test",
	"Least helpful test",
];
const engineQs = [
	"Best engine feature",
	"Stuck or guessed wrong",
	"Built for this game",
	"Hardest engine task",
	"Engine changes",
	"One suggested improvement",
];
const promptQs = [
	"Best prompt feature",
	"Confusing instruction",
	"Hardest task",
	"Suggested change",
];
function aboutCards() {
	if (state.about === 0)
		return Object.entries(interview.sourceInformation).map(
			([label, value]) => ({
				title: label.replace(/([A-Z])/g, " $1"),
				body: value,
			}),
		);
	if (state.about === 1)
		return interview.testingFeedback.map((body, i) => ({
			title: testQs[i],
			body,
		}));
	if (state.about === 2)
		return interview.engineFeedback.map((body, i) => ({
			title: engineQs[i],
			body,
		}));
	if (state.about === 3)
		return interview.promptFeedback.map((body, i) => ({
			title: promptQs[i],
			body,
		}));
	return [
		{
			title: "A Venusian thank-you",
			body: "Original game inspiration: K.C.'s Krazy Chase! (1982), designed by Ed Averett, published by North American Philips. This is an original fan interpretation, with new art, music, gardens and rules.",
		},
		{
			title: "The garden tools",
			body: "my-3D2dge v0.89.1 (MIT), Michael Crosato. The MIT engine license and original Hub client notice are preserved in the single file and vendor folders. Hub protocol v1, pristine client v1.4.0. No image or audio downloads.",
		},
		{
			title: "A proper feast",
			body: "Five gardens. Three finite courses in each. Bite only the glowing fruit; the head always hurts. Trees are optional, worth 1, and refill shared bait. Bites score 3; catches 10; each course clear 20. A bite scares both sentries.",
		},
		{
			title: "A chain of good taste",
			body: "Bites and catches within six seconds build a chain. Every three plays lifts the multiplier, up to x3. Hits break the chain. Three shared lives; a garden clear restores one. Retry rolls the entire garden back to its entry score and seeds.",
		},
		{
			title: "A modern mouthful",
			body: "Tail-only targeting, bait, simultaneous co-op, multiple crawlers, a finite campaign and accessible workshop are decisions for this adaptation. Historical tail-tip-only eligibility is unknown. The original offered five mazes, competition over turns or time, and a maze editor.",
		},
		{
			title: "Friendly fingers",
			body: "WASD/arrows, D-pad or left stick move. Keyboard diagonals favor the most recently pressed direction; exact simultaneous ties favor horizontal. The next legal turn buffers. Reverse immediately. Mouse chooses reachable floor; movement keys cancel its route.",
		},
		{
			title: "Touch and togetherness",
			body: "Drag from anywhere for an invisible floating stick. A second finger can tap the contextual PLANT button. Local co-op assigns each controller to one seat; keyboard plus one pad or two pads. Online cooperation requires AI Hub; there is no standalone internet lobby.",
		},
		{
			title: "Research notes",
			body: "Manual: odyssey2.info/library/manuals/us_kcskrazychase/kcs-krazy-chase.txt. Illustrated pages show persistent head danger and pale Drats. Inspected gameplay frames at youtube.com/watch?v=whykVbhZD8c (20–40 seconds). Heard source sound: unknown.",
		},
	];
}
function updateAbout() {
	const I = game.input;
	if (state.about === null) {
		state.menu?.update();
		return;
	}
	const cards = aboutCards();
	if (I.pressed("left") || I.pressed("previous"))
		state.aboutPage = (state.aboutPage + cards.length - 1) % cards.length;
	if (I.pressed("right") || I.pressed("next") || I.pressed("confirm"))
		state.aboutPage = (state.aboutPage + 1) % cards.length;
	if (I.pressed("cancel")) {
		state.about = null;
		aboutMenu();
		I.consumeAll();
	}
	const c = I.clicked();
	if (c && c[1] > game.H - 55) {
		if (c[0] < game.W * 0.32)
			state.aboutPage = (state.aboutPage + cards.length - 1) % cards.length;
		else if (c[0] > game.W * 0.68)
			state.aboutPage = (state.aboutPage + 1) % cards.length;
		else {
			state.about = null;
			aboutMenu();
		}
	}
}
function openDev(readOnly = false) {
	closeShell();
	state.devReadOnly = readOnly || hub.active;
	state.devPage = "main";
	state.lastDevPage = null;
	game.go("dev", null, { fade: 0 });
	makeDevMenu();
}
function makeDevMenu() {
	const w = state.world;
	let labels = [],
		pick;
	if (state.devReadOnly && state.devPage !== "inspect") {
		labels = [
			"Hitboxes",
			"Grid & wrap graph",
			"AI targets",
			"Chain history",
			"State inspection",
			"Back",
		];
		pick = (i) => {
			if (i === 0) state.debug.hitboxes = !state.debug.hitboxes;
			if (i === 1) {
				state.debug.grid = !state.debug.grid;
				state.debug.graph = state.debug.grid;
			}
			if (i === 2) state.debug.targets = !state.debug.targets;
			if (i === 3) state.debug.history = !state.debug.history;
			if (i === 4) {
				state.devPage = "inspect";
				makeDevMenu();
			}
			if (i === 5) goPlay();
		};
	} else if (state.devPage === "sliders") {
		labels = [
			...TUNING.map(
				([k, label, unit]) =>
					`${label}: ${Number(w.tuning[k]).toFixed(k === "lives" ? 0 : 2)} ${unit}`,
			),
			"Reset defaults",
			"Back",
		];
		pick = (i) => {
			if (i < TUNING.length) adjustSlider(i, 1);
			else if (i === TUNING.length) {
				w.resetTuning();
				makeDevMenu();
			} else {
				state.devPage = "main";
				makeDevMenu();
			}
		};
	} else if (state.devPage === "overlays") {
		labels = [
			`Hitboxes: ${!!state.debug.hitboxes}`,
			`Grid: ${!!state.debug.grid}`,
			`Wrap graph: ${!!state.debug.graph}`,
			`AI targets: ${!!state.debug.targets}`,
			`Chain history: ${!!state.debug.history}`,
			"Teleport cursor",
			"Back",
		];
		pick = (i) => {
			if (i < 5) {
				const k = ["hitboxes", "grid", "graph", "targets", "history"][i];
				state.debug[k] = !state.debug[k];
				makeDevMenu();
			} else if (i === 5) {
				state.teleport = true;
				state.cursor = cell(w.players[0].m);
				state.menu = null;
			} else {
				state.devPage = "main";
				makeDevMenu();
			}
		};
	} else if (state.devPage === "inspect") {
		labels = ["Back"];
		pick = () => {
			state.devPage = "main";
			makeDevMenu();
		};
	} else if (state.devPage === "tools") {
		labels = [
			"Restart garden",
			"Respawn all actors",
			"Refill lives & bait",
			`Reseed: ${w.s.seed.toString(16)}`,
			`Garden: ${w.s.level + 1} (next)`,
			`Course: ${w.s.wave + 1} (next)`,
			"Back",
		];
		pick = (i) => {
			if (i === 0) {
				w.retry();
				w.s.modified = true;
			}
			if (i === 1) w.dev("actors");
			if (i === 2) w.dev("refill");
			if (i === 3) w.dev("reseed", Math.floor(Math.random() * 0xffffffff));
			if (i === 4) w.dev("garden", (w.s.level + 1) % 5);
			if (i === 5) {
				w.s.wave = (w.s.wave + 1) % (w.custom ? 1 : 3);
				w.s.modified = true;
				w.enter(true);
			}
			if (i === 6) state.devPage = "main";
			makeDevMenu();
		};
	} else {
		labels = [
			"Live balance sliders",
			`Invulnerability: ${w.invulnerable ? "ON" : "off"}`,
			`Freeze: ${state.frozen ? "ON" : "off"}`,
			"Step one tick",
			"Actor & garden tools",
			"Overlays & teleport",
			"State inspection",
			"Back to chase",
		];
		pick = (i) => {
			if (i === 0) state.devPage = "sliders";
			if (i === 1) w.dev("invulnerable");
			if (i === 2) {
				state.frozen = !state.frozen;
				w.s.modified = true;
			}
			if (i === 3) {
				state.frozen = true;
				state.step = true;
				w.s.modified = true;
			}
			if (i === 4) state.devPage = "tools";
			if (i === 5) state.devPage = "overlays";
			if (i === 6) state.devPage = "inspect";
			if (i === 7) {
				goPlay();
				return;
			}
			makeDevMenu();
		};
	}
	const old = state.lastDevPage === state.devPage ? state.menu?.i || 0 : 0;
	state.lastDevPage = state.devPage;
	state.menu = nativeMenu(game, labels, pick, {
		x: "center",
		y: 92,
		scale: state.devPage === "sliders" ? 1 : 2,
		rows: state.devPage === "sliders" ? 10 : 6,
		onCancel: () => {
			if (state.devPage === "main" || state.devReadOnly) goPlay();
			else {
				state.devPage = "main";
				makeDevMenu();
			}
		},
	});
	state.menu.i = Math.min(old, labels.length - 1);
	if (state.devPage === "sliders") {
		const m = state.menu,
			base = m._layout.bind(m);
		m._layout = () => {
			const l = base();
			l.w = Math.min(460, game.W - 48);
			l.x = (game.W - l.w) / 2;
			m._box.x = l.x + 3 * l.k;
			m._box.w = l.w - 6 * l.k;
			return l;
		};
	}
}
function adjustSlider(i, d) {
	if (hub.active) return;
	const [k, , , min, max, step] = TUNING[i];
	const n = Math.max(min, Math.min(max, state.world.tuning[k] + d * step));
	state.world.tune(k, Math.round(n * 1000) / 1000);
	makeDevMenu();
	state.menu.i = i;
}
function exportMaze() {
	if (hub.active) return;
	const blob = new Blob([state.editor.export()], { type: "application/json" }),
		a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = `${state.editor.name.replace(/[^a-z0-9]/gi, "-")}.garden.json`;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	state.editor.message = "Garden exported. A portable predicament!";
}
function importMaze() {
	if (hub.active) return;
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json,application/json";
	input.addEventListener("change", async () => {
		try {
			const file = input.files?.[0];
			if (file) state.editor.import(await file.text());
		} catch {
			state.editor.message = "That garden could not be read.";
		}
		input.remove();
		controls.consume();
	});
	input.click();
}
function workshopActions(page = "main") {
	state.editorMenu = true;
	const ed = state.editor;
	let items = [],
		pick;
	if (page === "brush") {
		items = [...BRUSHES, "Back"];
		pick = (i) => {
			if (i < BRUSHES.length) {
				ed.brush = i;
				ed.route = [];
				state.editorMenu = false;
				state.menu = null;
			} else workshopActions();
		};
	} else if (page === "load") {
		const list = store.creations();
		items = [...list.map((v) => v.name), "Back"];
		pick = (i) => {
			if (i === list.length) {
				workshopActions();
				return;
			}
			state.editor = new Workshop(list[i].level);
			state.editor.name = list[i].name;
			state.editorMenu = false;
			state.menu = null;
		};
	} else if (page === "template") {
		const maps = GARDENS.slice(0, store.unlocked());
		items = [...maps.map((g) => g.name), "Back"];
		pick = (i) => {
			if (i === maps.length) {
				workshopActions();
				return;
			}
			state.editor = new Workshop(maps[i]);
			state.editorMenu = false;
			state.menu = null;
		};
	} else {
		items = [
			`Brush: ${BRUSHES[ed.brush]}`,
			"Validate",
			"Playtest",
			"Undo",
			"Redo",
			"Save garden",
			"More tools",
			"Back to paint",
		];
		pick = (i) => {
			if (i === 0) workshopActions("brush");
			if (i === 1) {
				ed.validate();
				state.editorMenu = false;
			}
			if (i === 2) {
				if (ed.validate().ok) {
					ed.level.courses = 1;
					newRun(1, 0, ed.level);
				} else state.editorMenu = false;
			}
			if (i === 3) {
				ed.undo();
				state.editorMenu = false;
			}
			if (i === 4) {
				ed.redo();
				state.editorMenu = false;
			}
			if (i === 5) {
				if (!ed.validate().ok) {
					state.editorMenu = false;
					return;
				}
				store.saveMaze(ed.name, ed.level);
				ed.message = store.available
					? `Garden saved: ${ed.name}`
					: "Storage unavailable. Garden kept for this visit.";
				state.editorMenu = false;
			}
			if (i === 6) workshopMore();
			if (i === 7) {
				state.editorMenu = false;
				state.menu = null;
			}
		};
	}
	state.menu = nativeMenu(game, items, pick, {
		y: game.H / 2 - Math.min(90, items.length * 11),
		rows: 7,
		scale: 2,
		onCancel: () => {
			state.editorMenu = false;
			state.menu = null;
		},
	});
}
function workshopMore() {
	const ed = state.editor;
	state.menu = nativeMenu(
		game,
		[
			`Name: ${ed.name}`,
			`Theme: ${THEMES[ed.level.theme].name}`,
			`Crawler count: ${ed.level.crawlers.length}`,
			`Edit crawler: ${ed.routeIndex + 1}`,
			"Load garden",
			"Start from garden",
			"Import JSON",
			"Export JSON",
			"Reset template",
			"Back",
		],
		(i) => {
			if (i === 0) {
				state.namePicker = new NamePicker(
					ed.name,
					(n) => {
						ed.name = n;
						state.namePicker = null;
						workshopMore();
					},
					() => {
						state.namePicker = null;
						workshopMore();
					},
				);
			}
			if (i === 1) {
				ed.setTheme(ed.level.theme + 1);
				workshopMore();
			}
			if (i === 2) {
				ed.setCrawlerCount(ed.level.crawlers.length === 1 ? 2 : 1);
				workshopMore();
			}
			if (i === 3) {
				ed.routeIndex = (ed.routeIndex + 1) % ed.level.crawlers.length;
				ed.route = [];
				ed.brush = 4;
				state.editorMenu = false;
			}
			if (i === 4) workshopActions("load");
			if (i === 5) workshopActions("template");
			if (i === 6) {
				importMaze();
				state.editorMenu = false;
			}
			if (i === 7) {
				exportMaze();
				state.editorMenu = false;
			}
			if (i === 8) {
				ed.reset();
				state.editorMenu = false;
			}
			if (i === 9) workshopActions();
		},
		{ y: 45, rows: 8, scale: 2, onCancel: () => workshopActions() },
	);
}
function workshopView() {
	const ed = state.editor,
		l = ed.level;
	const fake = new World({ custom: l, demo: true });
	const v = fake.view();
	v.t = game.real;
	v.garden = l;
	v.notice = ed.message;
	v.noticeLeft = 99;
	return v;
}
function updateWorkshop(dt) {
	const ed = state.editor,
		I = game.input;
	if (state.namePicker) {
		state.namePicker.update(I, game.W, game.H);
		return;
	}
	state.editorView = workshopView();
	fit(dt, state.editorView, { workshop: true });
	if (state.editorMenu) {
		state.menu?.update();
		return;
	}
	for (const [a, d] of [
		["up", [0, -1]],
		["down", [0, 1]],
		["left", [-1, 0]],
		["right", [1, 0]],
	])
		if (I.repeat(a, 0.2, 0.09))
			ed.cursor = [
				Math.max(0, Math.min(ed.level.w - 1, ed.cursor[0] + d[0])),
				Math.max(0, Math.min(ed.level.h - 1, ed.cursor[1] + d[1])),
			];
	if (I.pressed("previous")) {
		ed.brush = (ed.brush + BRUSHES.length - 1) % BRUSHES.length;
		ed.route = [];
	}
	if (I.pressed("next")) {
		ed.brush = (ed.brush + 1) % BRUSHES.length;
		ed.route = [];
	}
	if (I.pressed("undo")) ed.undo();
	if (I.pressed("redo")) ed.redo();
	if (I.pressed("paint")) ed.edit();
	if (I.pressed("tools")) {
		workshopActions();
		I.consumeAll();
	}
	if (I.pressed("cancel")) game.go("title");
	const held = I.held.has("Mouse0"),
		pointer = I.pointer(),
		c = I.clicked();
	if (held && pointer && ed.brush < 3) {
		const at = view.cellAt(...pointer);
		if (at) {
			if (!state.stroke) {
				ed.remember();
				state.stroke = true;
				state.strokeVisited = new Set();
			}
			const k = key(at);
			if (!state.strokeVisited.has(k)) {
				state.strokeVisited.add(k);
				ed.cursor = at;
				ed.edit(at, false);
			}
		}
	} else if (c) {
		const at = view.cellAt(...c);
		if (at) {
			if (!state.stroke) {
				ed.cursor = at;
				ed.edit(at);
			}
		} else {
			workshopActions();
			I.consumeAll();
		}
		state.stroke = false;
	} else if (!held) state.stroke = false;
}
function drawWorkshop(r) {
	const ed = state.editor,
		v = state.editorView || workshopView();
	view.draw(r, v, {
		hud: false,
		workshop: {
			...ed,
			errors: ed.validation.errors,
			wrapPending: ed.pendingWrap?.a,
		},
		debug: { grid: true },
	});
	const tall = r.H > r.W * 1.1,
		x = tall ? 20 : r.W - 156,
		y = tall ? view.bounds.y1 + 24 : 55,
		w = tall ? r.W - 40 : 140;
	r.overlay((g) => {
		E.ui.box(g, x, y, w, tall ? 143 : 188, {
			bg: COLORS.panel,
			border: COLORS.edge,
		});
		E.font.text(g, "MAZE WORKSHOP", x + 10, y + 10, COLORS.gold, {
			outline: false,
		});
		E.font.text(
			g,
			BRUSHES[ed.brush].toUpperCase(),
			x + 10,
			y + 29,
			COLORS.cream,
			{ scale: tall ? 2 : 1, outline: false },
		);
		const I = game.input,
			hint =
				I.lastDevice === "touch"
					? "Tap a cell to paint.\nTap here for tools."
					: `${I.label("previous")} / ${I.label("next")}: brush\n${I.label("paint")}: paint\n${I.label("tools")}: tools\n${I.label("undo")}: undo  ${I.label("redo")}: redo\nClick here for tools`;
		E.font.text(g, ascii(hint), x + 10, y + 52, COLORS.muted, {
			outline: false,
			wrap: w - 20,
		});
	});
	text(r, "MAZE WORKSHOP", r.W / 2, 16, COLORS.gold, {
		align: "center",
		scale: 2,
	});
	text(
		r,
		ed.message,
		r.W / 2,
		r.H - 22,
		ed.validation.ok ? COLORS.gold : "#ffb2a3",
		{ align: "center", scale: 1 },
	);
	if (state.editorMenu) {
		dim(r, 0.85);
		panel(r, "Garden tools", "", { y: 20, h: r.H - 40, scale: 2 });
		state.menu?.draw(r);
	}
	if (state.namePicker) state.namePicker.draw(r);
}
const scenes = {
	title: {
		pausable: false,
		view: "overhead",
		touch: [],
		enter() {
			state.attract = false;
			state.world = null;
			controls.solo();
			arcade.wake();
			state.demoTime = 0;
			state.demoScene = -1;
			titleBackdrop();
			makeTitleMenu();
			audio.scene("title");
		},
		update(dt) {
			const v = state.titleWorld.view();
			v.t = game.real;
			fit(dt, v, { title: true });
			positionTitle();
			if (controls.consumed <= 0 && !game.shell?.screen) state.menu?.update();
		},
		draw(r) {
			const v = state.titleWorld.view();
			v.t = game.real;
			view.draw(r, v, { hud: false });
			const tall = r.H > r.W * 1.1,
				x = tall ? r.W / 2 : 27,
				align = tall ? "center" : "left";
			r.overlay((g) => {
				if (!tall)
					px.blend(g, 0.88, "normal", () =>
						px.rect(g, 0, 0, 229, r.H, "#0b1d2d"),
					);
				E.font.text(g, "K.C.'s", x, 17, COLORS.blue, {
					align,
					scale: 2,
					outline: false,
				});
				E.font.title(g, "HUNGRY", x, 35, {
					align,
					scale: 4,
					colors: ["#fff0cb", "#ffd187", "#ee976b"],
					depth: 2,
				});
				E.font.title(g, "HULLABALOO", x, 69, {
					align,
					scale: 3,
					colors: ["#fff0cb", "#ffd187", "#ee976b"],
					depth: 2,
				});
				E.font.text(g, "SMALL KEEPER. BIG APPETITE.", x, 99, COLORS.muted, {
					align,
					outline: false,
				});
			});
			state.menu?.draw(r);
			text(
				r,
				"CHASE THE TAIL. MIND THE TEETH.",
				tall ? r.W / 2 : r.W * 0.715,
				tall ? view.bounds.y0 - 24 : r.H - 31,
				COLORS.gold,
				{ align: "center" },
			);
			text(
				r,
				`${game.input.label("confirm")} SELECT   ${game.input.label("cancel")} BACK`,
				tall ? r.W / 2 : r.W * 0.715,
				tall ? r.H - 27 : r.H - 17,
				COLORS.muted,
				{ align: "center" },
			);
		},
	},
	attract: {
		pausable: false,
		touch: [],
		enter() {
			state.attract = true;
			game.input.clear();
		},
		update: demoStep,
		draw(r) {
			view.draw(r, state.world.view());
			r.overlay((g) => {
				px.rect(g, 0, 0, r.W, 29, "#0a2030");
				E.font.text(g, "GARDEN THEATRE", r.W / 2, 8, COLORS.gold, {
					scale: 2,
					align: "center",
					outline: false,
				});
			});
			text(r, "DEMO  /  ANY INPUT RETURNS", r.W / 2, r.H - 15, COLORS.gold, {
				align: "center",
			});
		},
	},
	play: {
		pausable: true,
		view: "overhead",
		touch: ["plant"],
		enter() {
			controls.goals.clear();
			audio.scene("play", state.world?.s.level || 0);
			game.input.steer = "drag";
			if (hub.active) {
				game.o.autoPause = false;
				game.live = true;
			}
		},
		update(dt) {
			if (hub.active) {
				if (!net.info) return;
				if (!state.ended) {
					let command = { stop: !!game.shell?.screen };
					const p = net.world?.players.find((p) => p.id === net.info.me);
					if (p && !game.shell?.screen)
						command = controls.command(game.input, p, net.world, view, false);
					net.tick(dt, command);
				}
				const v = net.current();
				if (v) {
					fit(dt, v);
					game.input.touchSet(
						"plant",
						"PLANT",
						!state.ended &&
							v.seeds > 0 &&
							v.players.some((p) => p.id === net.info.me),
					);
				}
				return;
			}
			const w = state.world;
			if (!w) return;
			const commands = {};
			for (let i = 0; i < w.players.length; i++)
				commands[w.players[i].id] = controls.command(
					game.players[i] || game.input,
					w.players[i],
					w,
					view,
					i === 0,
				);
			w.step(dt, commands);
			for (const e of w.events) present(e);
			w.events = [];
			fit(dt, w.view());
			const me = w.players[0];
			game.input.touchSet(
				"plant",
				"PLANT",
				w.s.seeds > 0 &&
					!!w.placement(me) &&
					!w.bait.some((b) => b.owner === me.id),
			);
			if (w.s.phase === "clear") {
				state.reportAt = game.real;
				game.go("report", null, { fade: 0 });
			}
			if (w.s.phase === "defeat") game.go("ending", null, { fade: 0 });
		},
		draw(r) {
			const v = hub.active ? net.current() : state.world?.view();
			if (v) {
				view.draw(r, v, { debug: state.debug });
				if (hub.active && (!net.started || hub.time() < 0)) {
					dim(r, 0.55);
					text(
						r,
						Number.isFinite(hub.time())
							? String(Math.ceil(-hub.time() / 1000))
							: "GARDEN READY",
						r.W / 2,
						r.H / 2 - 12,
						COLORS.gold,
						{ align: "center", scale: 3 },
					);
				}
				if (state.ended) {
					dim(r, 0.65);
					text(r, "FEAST FINISHED", r.W / 2, r.H / 2, COLORS.gold, {
						align: "center",
						scale: 2,
					});
				}
			}
		},
	},
	join: {
		pausable: false,
		touch: [],
		enter() {
			joinMenu();
			audio.scene("title");
		},
		update() {
			const count = state.pads.map((p) => p.index).join();
			if (count !== state.joinPads) {
				state.joinPads = count;
				joinMenu();
			}
			state.menu?.update();
		},
		draw(r) {
			view.draw(
				r,
				state.titleWorld?.view() || new World({ demo: true }).view(),
				{ hud: false },
			);
			dim(r);
			panel(
				r,
				"A feast for two",
				"One device per keeper. Press a controller button to wake it.",
				{ y: 28, h: r.H - 56, scale: 2, kicker: "LOCAL CO-OP" },
			);
			state.menu?.draw(r);
			text(
				r,
				"Blue and coral share lives, seeds and score.",
				r.W / 2,
				r.H - 36,
				COLORS.muted,
				{ align: "center" },
			);
		},
	},
	report: {
		pausable: false,
		touch: [],
		enter() {
			audio.scene("clear", state.world.s.level);
			reportMenu();
		},
		update(dt) {
			rigs.update(dt, state.world.view());
			if (game.real - state.reportAt > 0.35) state.menu?.update();
		},
		draw(r) {
			view.draw(r, state.world.view());
			dim(r, 0.8);
			const w = state.world;
			panel(
				r,
				w.s.wave + 1 < (w.custom ? 1 : w.garden.courses)
					? "COURSE CORNERED!"
					: "GARDEN GOBBLED!",
				`Score ${w.s.score}   Bites ${w.s.gardenStats.bites}   Catches ${w.s.gardenStats.catches}\n+20 for clearing the tails.`,
				{
					y: r.H / 2 - 108,
					h: 220,
					scale: 2,
					align: "center",
					kicker: w.garden.name,
				},
			);
			state.menu?.draw(r);
		},
	},
	ending: {
		pausable: false,
		touch: [],
		enter() {
			audio.scene(
				state.world.s.phase === "defeat" ? "defeat" : "victory",
				state.world.s.level,
			);
			if (
				state.world.s.phase === "victory" &&
				!state.world.s.modified &&
				!state.world.custom
			) {
				store.unlock(5);
				store.clearCheckpoint();
			}
			endingMenu();
			recordEnding();
			state.endingAt = game.real;
		},
		update(dt) {
			if (arcade.entry) {
				arcade.update(dt);
				return;
			}
			state.menu?.update();
			rigs.update(dt, { ...state.world.view(), t: game.real });
			if (
				state.world.s.phase === "victory" &&
				game.real - state.endingAt < 7 &&
				Math.floor(game.real * 4) !== state.confetti
			) {
				state.confetti = Math.floor(game.real * 4);
				game.particles.bits(
					Math.random() * state.world.garden.w * 16,
					Math.random() * state.world.garden.h * 16,
					20,
					5,
					["#ffe0a0", "#82d6da", "#ffb4b8"],
				);
			}
		},
		draw(r) {
			view.draw(r, { ...state.world.view(), t: game.real });
			dim(r, 0.77);
			const w = state.world,
				won = w.s.phase === "victory";
			panel(
				r,
				won ? "VENUS, VERY TASTY!" : "A NOBLE NIBBLE",
				`Team score ${w.s.score}  /  ${w.s.stats.bites} bites\n${won ? "A grand garden gobble. Take a bow!" : "The nursery believes in second helpings."}${w.s.modified ? "\nModified run - separate from campaign records." : ""}`,
				{
					y: r.H / 2 - 114,
					h: 232,
					kicker: won ? "THE END" : "OUT OF LIVES",
					scale: 2,
					align: "center",
				},
			);
			state.menu?.draw(r);
			if (arcade.entry) arcade.draw(r);
		},
	},
	about: {
		pausable: false,
		touch: [],
		enter() {
			state.about = null;
			aboutMenu();
			audio.scene("title");
		},
		update: updateAbout,
		draw(r) {
			view.draw(
				r,
				state.titleWorld?.view() || new World({ demo: true }).view(),
				{ hud: false },
			);
			dim(r, 0.9);
			if (state.about === null) {
				panel(r, "ABOUT THE APPETITE", "", { y: 18, h: r.H - 36, scale: 2 });
				state.menu?.draw(r);
			} else {
				const cards = aboutCards(),
					c = cards[state.aboutPage];
				panel(r, c.title, c.body, {
					y: 24,
					h: r.H - 72,
					scale: 2,
					kicker: [
						"SOURCE INFORMATION",
						"TESTING FEEDBACK",
						"ENGINE FEEDBACK",
						"PROMPT FEEDBACK",
						"CREDITS & RULES",
					][state.about],
				});
				text(r, "< PREVIOUS", 40, r.H - 30, COLORS.gold);
				text(r, "BACK", r.W / 2, r.H - 30, COLORS.muted, { align: "center" });
				text(r, "NEXT >", r.W - 40, r.H - 30, COLORS.gold, { align: "right" });
				text(
					r,
					`${state.aboutPage + 1} / ${cards.length}`,
					r.W - 38,
					12,
					COLORS.muted,
					{ align: "right" },
				);
			}
		},
	},
	dev: {
		pausable: false,
		touch: [],
		enter() {
			makeDevMenu();
		},
		update(dt) {
			const w = state.world;
			if (hub.active) {
				net.tick(dt, { stop: true });
				fit(dt, net.current());
			} else {
				if (!state.frozen || state.step) {
					w.step(STEP, {});
					state.step = false;
					for (const e of w.events) present(e);
					w.events = [];
				}
				fit(dt, w.view());
			}
			if (state.teleport) {
				const I = game.input;
				for (const [a, d] of [
					["up", [0, -1]],
					["down", [0, 1]],
					["left", [-1, 0]],
					["right", [1, 0]],
				])
					if (I.repeat(a, 0.2, 0.09))
						state.cursor = [
							Math.max(0, Math.min(w.garden.w - 1, state.cursor[0] + d[0])),
							Math.max(0, Math.min(w.garden.h - 1, state.cursor[1] + d[1])),
						];
				const click = I.clicked(),
					c = click && view.cellAt(...click);
				if (c) state.cursor = c;
				if (I.pressed("confirm") || c) w.dev("teleport", state.cursor);
				if (I.pressed("cancel")) {
					state.teleport = false;
					makeDevMenu();
				}
				return;
			}
			if (state.devPage === "sliders" && !state.devReadOnly) {
				const i = state.menu.i;
				if (i < TUNING.length) {
					if (game.input.repeat("left", 0.25, 0.09)) adjustSlider(i, -1);
					if (game.input.repeat("right", 0.25, 0.09)) adjustSlider(i, 1);
					const click =
						game.input.clicked() ||
						(game.input.held.has("Mouse0") ? game.input.pointer() : null);
					if (click) {
						const l = state.menu._layout(),
							bx = l.x + l.w * 0.66,
							bw = l.w * 0.27;
						for (let j = 0; j < TUNING.length; j++) {
							const row = state.menu.rowAt(j);
							if (
								row &&
								click[1] >= row[1] &&
								click[1] < row[1] + row[3] &&
								click[0] >= row[0] &&
								click[0] <= row[0] + row[2]
							) {
								if (click[0] >= bx - 4) {
									const [k, , , min, max, step] = TUNING[j];
									const fraction = Math.max(
										0,
										Math.min(1, (click[0] - bx) / bw),
									);
									state.world.tune(
										k,
										Math.round((min + (max - min) * fraction) / step) * step,
									);
									makeDevMenu();
									state.menu.i = j;
								} else if (game.input.clicked()) adjustSlider(j, 1);
								game.input.consumeAll();
								return;
							}
						}
					}
				}
			}
			state.menu?.update();
		},
		draw(r) {
			view.draw(r, hub.active ? net.current() : state.world.view(), {
				debug: state.debug,
			});
			if (state.teleport) {
				const [x, y] = game.r.w(
					(state.cursor[0] + 0.5) * 16,
					(state.cursor[1] + 0.5) * 16,
				);
				text(r, "+", x, y - 4, COLORS.gold, { scale: 2, align: "center" });
				text(
					r,
					"ARROWS + CONFIRM: TELEPORT    BACK: TOOLS",
					r.W / 2,
					r.H - 20,
					COLORS.gold,
					{ align: "center" },
				);
				return;
			}
			dim(r, 0.86);
			panel(
				r,
				state.devReadOnly ? "LOCAL DIAGNOSTICS" : "DEVELOPER TOOLS",
				state.devReadOnly
					? "Shared gameplay is read-only."
					: "Changes mark this run as modified.",
				{ y: 18, h: r.H - 36, scale: 2 },
			);
			if (state.devPage === "inspect") {
				const v = hub.active ? net.current() : state.world.view();
				text(
					r,
					`Seed ${state.world.s.seed}  Tick ${Math.round(v.totalTime * 120)}\nGarden ${v.level + 1} / Course ${v.wave + 1}\nScore ${v.score}  Lives ${v.lives}  Seeds ${v.seeds}\nPlayers ${v.players.length}  Tails ${v.remaining}\nFright ${v.fright.toFixed(2)}  Modified ${v.modified}\nSnapshot schema 1 / ${JSON.stringify(state.world.snapshot()).length} bytes`,
					42,
					91,
					COLORS.cream,
					{ scale: 2 },
				);
				state.menu.y = r.H - 57;
			}
			state.menu?.draw(r);
			if (state.devPage === "sliders") {
				r.overlay((g) => {
					const l = state.menu._layout(),
						x = l.x + l.w * 0.66,
						w = l.w * 0.27;
					for (let i = 0; i < TUNING.length; i++) {
						const row = state.menu.rowAt(i);
						if (!row) continue;
						const [k, , , min, max] = TUNING[i],
							u = (state.world.tuning[k] - min) / (max - min),
							y = row[1] + 4;
						px.rect(g, x, y, w, 4, "#071825");
						px.rect(
							g,
							x,
							y,
							w * u,
							4,
							state.menu.i === i ? COLORS.gold : COLORS.blue,
						);
						px.rect(g, x + w * u - 1, y - 2, 3, 8, COLORS.cream);
					}
				});
				text(
					r,
					"LEFT / RIGHT OR DRAG A SLIDER  /  CONFIRM INCREASES",
					r.W / 2,
					r.H - 31,
					COLORS.blue,
					{ align: "center" },
				);
			}
		},
	},
	workshop: {
		pausable: false,
		touch: [],
		enter() {
			if (!state.editor) state.editor = new Workshop();
			state.editorMenu = false;
			state.menu = null;
			controls.solo();
			audio.scene("workshop", state.editor.level.theme);
		},
		update: updateWorkshop,
		draw: drawWorkshop,
	},
	replay: {
		pausable: false,
		touch: [],
		enter() {
			const count = store.unlocked();
			const maps = GARDENS.map((g, i) => ({
				label: `${i + 1}. ${g.name}`,
				disabled: i >= count,
			}));
			state.menu = nativeMenu(
				game,
				[...maps, "Solo records", "Co-op records", "Back"],
				(i) => {
					if (i < 5) newRun(1, i);
					else if (i < 7) {
						state.recordsMode = i === 5 ? "solo" : "coop";
						game.go("records");
					} else game.go("title");
				},
				{ y: 61, rows: 7, scale: 2, onCancel: () => game.go("title") },
			);
		},
		update() {
			state.menu?.update();
		},
		draw(r) {
			view.draw(
				r,
				state.titleWorld?.view() || new World({ demo: true }).view(),
				{ hud: false },
			);
			dim(r, 0.9);
			panel(r, "GARDEN PASSPORT", "", {
				y: 18,
				h: r.H - 36,
				kicker: "REPLAY UNLOCKED GARDENS",
			});
			state.menu?.draw(r);
		},
	},
	records: {
		pausable: false,
		touch: [],
		enter() {
			state.menu = nativeMenu(game, ["Back"], () => game.go("replay"), {
				y: game.H - 46,
				scale: 2,
				onCancel: () => game.go("replay"),
			});
		},
		update() {
			state.menu?.update();
		},
		draw(r) {
			r.sky(["#0c1d2c", "#163347"]);
			arcade.drawTable(
				r,
				state.recordsMode,
				32,
				state.recordsMode === "coop"
					? "CO-OP CRUNCH CHAMPIONS"
					: "SOLO SNACK CHAMPIONS",
			);
			state.menu?.draw(r);
		},
	},
};
// Physical wake and audio lifecycle run even while a native pause/settings panel owns input.
game.hook("input", (dt) => {
	state.pads = controls.poll(dt);
	if (
		!hub.active &&
		!state.attract &&
		["title", "join", "about", "replay", "records"].includes(game.sceneName)
	) {
		const held =
			["up", "down", "left", "right", "confirm", "cancel", "pause"].some((a) =>
				game.input.down(a),
			) ||
			state.pads.some(
				(p) =>
					Math.hypot(p.axes[0] || 0, p.axes[1] || 0) > 0.4 ||
					p.buttons.some((b) => b.pressed),
			);
		if (held) arcade.wake();
		if (arcade.attract(dt) === "demo") {
			state.attract = true;
			state.demoTime = 0;
			state.demoScene = -1;
			game.shell?.hide();
			game.resume();
			game.go("attract", null, { fade: 0 });
		}
	}
	if (state.ended) {
		game.input.consumeAll();
		audio.stop();
		return;
	}
	const paused = game.paused || !!game.shell?.screen;
	if (paused && !state.pauseAudio) {
		state.pauseAudio = true;
		audio.stop();
	} else if (!paused && state.pauseAudio) {
		state.pauseAudio = false;
		audio.resume();
	}
	if (hub.active) {
		game.o.menu.quit = false;
		game.o.autoPause = false;
		game.live = true;
	}
	if (controls.consumed > 0)
		game.players.forEach((I) => {
			I.consumeAll();
		});
});
if (!game.headless) {
	window.addEventListener("keydown", (e) => {
		if (state.namePicker && !e.ctrlKey && !e.metaKey) {
			if (e.key.length === 1 || e.key === "Backspace") {
				state.namePicker.type(e.key);
				game.input.clear();
				e.preventDefault();
			}
		} else if (arcade.entry && !hub.active && /^[a-z0-9]$/i.test(e.key)) {
			const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! ";
			arcade.entry.name[arcade.entry.i] = letters.indexOf(e.key.toUpperCase());
			arcade.entry.i = Math.min(2, arcade.entry.i + 1);
			game.input.clear();
			e.preventDefault();
		}
	});
	window.addEventListener("blur", () => {
		audio.stop();
		if (!hub.active) game.pause("focus");
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) audio.stop();
	});
}
function publicSnapshot() {
	const v = hub.active ? net.current() : state.world?.view();
	return {
		title: TITLE,
		scene: game.sceneName,
		paused: game.paused,
		attract: state.attract,
		attractBeat: state.demoScene,
		demoEvidence: state.demoEvidence || {},
		world: v
			? {
					...v,
					crawlers: v.crawlers.map((c) => ({ ...c, history: undefined })),
				}
			: null,
		menu: state.menu
			? {
					items: state.menu.items.map((i) =>
						typeof i === "string" ? i : i.label,
					),
					focus: state.menu.i,
					rows: state.menu.items.map((_, i) => state.menu.rowAt(i)),
				}
			: null,
		editor: state.editor
			? {
					name: state.editor.name,
					brush: state.editor.brush,
					cursor: state.editor.cursor,
					validation: state.editor.validation,
					menu: state.editorMenu,
				}
			: null,
		audio: audio.diagnostics(),
		network: net.diagnostics(),
		storage: store.available,
		defaultMusic: game.settings.music,
		input: {
			device: game.input.lastDevice,
			plant: game.input.label("plant"),
			seats: game.players.map((I) => ({
				pad: I.pad,
				index: I.padIndex,
				device: I.lastDevice,
			})),
		},
		bounds: view.bounds,
		errors: game.errors,
	};
}
game.debug = { snapshot: publicSnapshot };
// The debug command route only injects normal local input. Mutating tools are rejected in Hub.
const localOnly =
	(fn) =>
	(...args) => {
		if (hub.active)
			throw new Error(
				"Shared-world authority rejects local developer mutations",
			);
		return fn(...args);
	};
globalThis.__game = {
	game,
	state,
	world: () => state.world,
	net,
	view,
	rigs,
	audio,
	arcade,
	controls,
	store,
	interview,
	snapshot: publicSnapshot,
	advance: (s) => game.advance(s),
	command: (id, cmd) => {
		if (hub.active) {
			if (id !== net.info?.me) return;
			state.testCommand = cmd;
		} else state.testCommands = { ...(state.testCommands || {}), [id]: cmd };
	},
	dev: localOnly((action, arg) => state.world?.dev(action, arg)),
	openDev: localOnly(() => openDev()),
	start: localOnly((n = 1, l = 0) => newRun(n, l)),
	audioProof: renderAudioProof,
	workshop: localOnly(() => game.go("workshop")),
	World,
	validateLevel,
};
// Tests can send the same normalized commands as a physical input adapter, through authority in sessions.
const realCommand = controls.command.bind(controls);
controls.command = (I, p, w, v, mouse) => {
	if (hub.active && state.testCommand) {
		const c = state.testCommand;
		state.testCommand = { ...c, plant: false };
		return c;
	}
	if (!hub.active && state.testCommands?.[p.id]) {
		const c = state.testCommands[p.id];
		state.testCommands[p.id] = { ...c, plant: false };
		return c;
	}
	return realCommand(I, p, w, v, mouse);
};
game.start({ scenes, scene: hub.active ? "play" : "title" });
net.connect().catch((e) => {
	game.fail("AI Hub connection", e);
	if (hub.active) hub.fail("Garden could not connect.");
});
