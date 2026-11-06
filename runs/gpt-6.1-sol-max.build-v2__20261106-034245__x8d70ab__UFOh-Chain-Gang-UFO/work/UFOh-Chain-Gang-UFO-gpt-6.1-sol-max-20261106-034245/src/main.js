import { World, pilotIntent } from "./simulation.js";
import { createRecords, cleanName } from "./storage.js";
import { createPresentation, fitArena } from "./presentation.js";
import { createAudio, verifyAudio } from "./audio.js";
import { createControls } from "./controls.js";
import { createDevTools } from "./dev-tools.js";
import { createHubAdapter } from "./net/hub-adapter.js";
import { REPORT } from "./report.js";

const E = globalThis.My3D2dge,
	P = E.px,
	TITLE = "UFOh Chain Gang",
	TAU = Math.PI * 2;
export function createGame(options = {}) {
	let app,
		world = null,
		idle = 0,
		lastEvent = 0,
		attract = false,
		attractTime = 0,
		demoPart = -1,
		pendingMode = "mission",
		runPlayers = 1,
		lastIntentHash = "",
		blockFire = true,
		stepAcc = 0,
		resultDelay = 0,
		entryCursor = 0,
		entryChars = "PILOT ".split(""),
		paired = false,
		joinStyle = "keyboard",
		_joinedPad = -1,
		padPrev = [],
		lastPadActive = false;
	const settings = [
		{ key: "music", value: 0.1 },
		{
			key: "glyphs",
			value: "playstation",
			options: [
				["playstation", "PlayStation"],
				["xbox", "Xbox"],
			],
		},
		{
			key: "touchAssist",
			label: "Touch aim & burst assistance",
			type: "toggle",
			value: true,
			group: "Game",
		},
		{ key: "hints", label: "Flight hints", value: true, group: "Game" },
	];
	const input = {
		...E.Input.SHMUP,
		fire: ["Space", "KeyZ", "KeyJ", "Mouse0", "Pad7", "Pad0"],
	};
	const game = new E.Game({
		canvas: "screen",
		headless: options.headless,
		draw: options.draw,
		loop: options.loop,
		view: "overhead",
		views: ["overhead"],
		res: [640, 360],
		portrait: { res: [400, 360] },
		expand: true,
		bg: "#07111d",
		input,
		id: "ufoh-chain-gang-v1",
		fullscreen: "button",
		camera: { zoom: false },
		menu: { settings, quit: false, items: () => pauseItems() },
	});
	game.fadeTime = 0.2;
	game.cam.smooth = 0;
	game.lights.enabled = true;
	game.lights.ambient = 0.92;
	let store;
	try {
		store = options.storage ?? globalThis.localStorage;
	} catch {
		store = null;
	}
	const records = createRecords(store);
	const presentation = createPresentation(game),
		audio = createAudio(game);
	const titlePath = new E.Path(
		[
			[-6, 0, 0],
			[0, -3, 0],
			[6, 0, 0],
			[0, 3, 0],
		],
		{ closed: true, smooth: "catmull" },
	);
	app = {
		game,
		records,
		presentation,
		audio,
		hub: null,
		ui: null,
		controls: null,
		dev: null,
		seed: options.seed ?? 1981,
		projection: null,
		entryActive: false,
		get world() {
			return world;
		},
		get attract() {
			return attract;
		},
		get idle() {
			return idle;
		},
		get paired() {
			return paired;
		},
		activity(_event) {
			if (app.hub?.ended) return false;
			idle = 0;
			if (attract) {
				toTitle();
				return true;
			}
			if (!game.headless && !app.hub?.ended) audio.unlock();
			return false;
		},
		flushEvents() {
			if (!world) return;
			for (const e of world.events)
				if (e.id > lastEvent) {
					lastEvent = e.id;
					presentation.event(e);
					audio.event(e);
					if (e.type === "sector")
						audio.setScene(world.state.sector === 3 ? "boss" : "mission");
					if (e.type === "bossPhase") audio.setScene("boss");
				}
		},
		stepWorld(dt, force = false) {
			if (!world || app.hub?.active) return;
			if (game.paused && !force) return;
			const intents = {};
			for (let i = 0; i < world.state.players.length; i++)
				intents[world.state.players[i].id] =
					attract || app.debug.bot
						? pilotIntent(world, i, { showcase: attract })
						: controls.intent(i);
			if (blockFire) {
				const firing = Object.values(intents).some((i) => i.fire);
				for (const i of Object.values(intents)) i.fire = false;
				if (!firing) blockFire = false;
			}
			world.step(dt, intents);
			if (!attract && world.replay.length < 130000) {
				const hash = JSON.stringify(
					Object.fromEntries(
						Object.entries(intents).map(([id, i]) => [
							id,
							{ mx: i.mx, my: i.my, aim: i.aim, fire: i.fire },
						]),
					),
				);
				if (hash !== lastIntentHash) {
					world.replay.push({
						tick: world.state.tick,
						intents: structuredClone(intents),
					});
					lastIntentHash = hash;
				}
			}
			app.flushEvents();
		},
		resetSeed(seed) {
			const mode = world?.state.mode || "mission";
			begin(mode, runPlayers, { seed, debug: true, keepPair: true });
		},
		typeName(c) {
			if (!app.entryActive) return;
			entryChars[entryCursor] = cleanName(c)[0];
			entryCursor = Math.min(6, entryCursor + 1);
			if (entryCursor === 6) app.entryActive = false;
		},
	};
	const controls = createControls(app);
	app.controls = controls;
	const dev = createDevTools(app);
	app.dev = dev;
	const shell = new E.Shell(game, {
		tv: true,
		theme: {
			bg: "#0a1825",
			panel: "#0c1c2b",
			accent: "#82edce",
			text: "#ebeadb",
			dim: "#9bb2bb",
			font: "ui-monospace, SFMono-Regular, Consolas, monospace",
		},
		screens: {
			pause: {
				kicker: "FLIGHT CONTROL",
				title: "Take a breather",
				text: () =>
					app.hub?.active
						? "Your ring can wait. The shared world keeps moving."
						: "Firing spends your shield. A full ring is a safe ram.",
			},
			help: {
				title: "The confident pilots handbook",
				sections: [
					[
						"SHIELD ECONOMY",
						"Fire or impact spends the ring. Release fire: recharge takes 1.6 seconds at half speed. The full ring protects once.",
					],
					[
						"ORBIT CANNON",
						"The white bead rotates CLOCKWISE toward your requested aim. Shots follow the real bead, not the small target cross.",
					],
					[
						"CO-OP",
						"Both pilots share points. Touch a wreck with a READY shield to revive it. Rescue spends the rescuers ring. Both wrecked: mission over.",
					],
					[
						"DEV & SHARED SESSIONS",
						"Flight lab is in Pause. Lab runs never enter records. AI Hub uses an inspection-only lab; its world keeps moving under menus.",
					],
				],
			},
		},
	});
	app.ui = shell;
	const menus = {};
	function menu(items, onPick, o = {}) {
		return new E.Menu(game, items, {
			box: false,
			pick: "#a0f6d6",
			color: "#e2e9df",
			sound: false,
			onPick: (i) => {
				audio.event({ type: "confirm" });
				onPick(i);
			},
			onMove: () => {
				idle = 0;
				audio.event({ type: "focus" });
			},
			...o,
		});
	}
	const go = (name, data) => {
		controls.clear();
		game.input.consumeAll();
		game.go(name, data);
	};
	function removeInputs() {
		while (game.players.length > 1) game.removePlayer(2);
		game.allowJoin(false);
		game.input.pad = "any";
		paired = false;
		_joinedPad = -1;
	}
	function begin(
		mode = "mission",
		players = 1,
		{ seed = app.seed, debug = false, keepPair = false } = {},
	) {
		if (app.hub?.active) return;
		if (!keepPair) removeInputs();
		runPlayers = players;
		pendingMode = mode;
		attract = false;
		entryCursor = 0;
		app.entryActive = false;
		idle = 0;
		lastEvent = 0;
		stepAcc = 0;
		resultDelay = 0;
		lastIntentHash = "";
		blockFire = true;
		world = new World({
			seed,
			mode,
			players: Array.from({ length: players }, (_, id) => ({
				id,
				name: id ? "WINGMATE" : "PILOT",
			})),
		});
		world.state.debug = debug;
		presentation.reset();
		dev.reset();
		audio.setScene("mission");
		go("play");
	}
	function toTitle() {
		if (app.hub?.active) return;
		attract = false;
		attractTime = 0;
		world = null;
		lastEvent = 0;
		idle = 0;
		resultDelay = 0;
		app.entryActive = false;
		presentation.reset();
		dev.reset();
		audio.stop();
		game.resume();
		shell.hide();
		removeInputs();
		controls.clear();
		audio.setScene("title");
		go("title");
	}
	function startAttract() {
		if (app.hub?.active) return;
		removeInputs();
		world = new World({ seed: 1981, mode: "mission", attract: true });
		attract = true;
		attractTime = 0;
		demoPart = -1;
		lastEvent = 0;
		presentation.reset();
		world.invulnerable = true;
		world.state.transition = 0;
		go("play");
		audio.setScene("mission");
	}
	function updateDemo(dt) {
		attractTime += dt;
		const part =
			attractTime < 14
				? 0
				: attractTime < 28
					? 1
					: attractTime < 43
						? 2
						: attractTime < 58
							? 3
							: 4;
		if (part !== demoPart) {
			demoPart = part;
			world.state.enemies = [];
			world.state.shots = [];
			world.state.blasts = [];
			world.state.chains = [];
			world.state.gates = [];
			world.state.boss = null;
			world.state.transition = 0;
			world.state.status = "running";
			world.state.waveTime = 0;
			world.state.waveSpawned = [];
			if (part === 0) {
				world.state.wave = 0;
				world.state.sector = 0;
			}
			if (part === 1) {
				world.state.wave = 3;
				world.state.sector = 1;
				world.formation({
					formation: "pair",
					x: 480,
					y: 185,
					kind: "drifter",
					instant: true,
					speed: 0,
					forcedMerge: true,
				});
			}
			if (part === 2) {
				world.state.wave = 7;
				world.state.sector = 1;
				world.formation({
					formation: "diamonds",
					x: 480,
					y: 230,
					kind: "drifter",
					instant: true,
					merge: false,
					speed: 0,
				});
			}
			if (part === 3) {
				world.state.wave = 8;
				world.state.sector = 2;
				world.spawn("gunship", 50, 55, { lane: 0 });
				world.formation({
					formation: "cover",
					x: 480,
					y: 290,
					kind: "drifter",
					instant: true,
					merge: false,
				});
			}
			if (part === 4) {
				world.state.wave = 14;
				world.state.sector = 3;
				world.createBoss();
				audio.setScene("boss");
			}
			world.notice(
				[
					"SHOOT? YOUR SHIELD GOES WITH IT.",
					"TWO DRIFTERS. ONE UNFRIENDLY INTRODUCTION.",
					"ONE GOOD SHOT. EVERYBODY GETS THE MESSAGE.",
					"MIND THE CROSSING SIGNALS.",
					"MANAGEMENT HAS ARRIVED. REMAIN CONFIDENT.",
				][part],
				12,
			);
		}
		if (attractTime >= 82) {
			startAttract();
			return;
		}
		if (world.state.status === "defeat" || world.state.status === "victory") {
			world.state.status = "running";
			for (const p of world.state.players) {
				p.down = false;
				p.hull = 3;
				p.shield = 0;
			}
		}
	}
	function pauseItems() {
		if (app.hub?.active)
			return [
				["Dev Mode / diagnostics", () => dev.show()],
				["About / Credits", showAbout],
			];
		const items = [
			[
				"Restart",
				() => {
					shell.hide();
					begin(pendingMode, runPlayers, { keepPair: true });
				},
			],
			["Dev Mode", () => dev.show()],
			["About / Credits", showAbout],
		];
		if (runPlayers === 2)
			items.push([
				"Continue solo",
				() => {
					world?.removePlayer(1);
					while (game.players.length > 1) game.removePlayer(2);
					runPlayers = 1;
					shell.hide();
				},
			]);
		items.push(["Return to title", toTitle]);
		return items;
	}
	function showAbout() {
		game.menu("about");
		shell.show("about", {
			kicker: "UFOh CHAIN GANG / FLIGHT ARCHIVE",
			title: "Small craft. Long credits.",
			text: "An original arcade game inspired by UFO! (Odyssey², 1981). Built on my-3D2dge. All game art, music and sounds are code.",
			actions: [
				["How to play", () => shell.show("help")],
				["Source Information", () => sourcePage(0)],
				[
					"Testing Feedback",
					() => feedback("testingFeedback", "Testing Feedback", 0),
				],
				[
					"Engine Feedback",
					() => feedback("engineFeedback", "Engine Feedback", 0),
				],
				[
					"Prompt Feedback",
					() => feedback("promptFeedback", "Prompt Feedback", 0),
				],
				[
					"Licenses & research",
					() =>
						shell.show("licenses", {
							title: "Thanks for the machinery",
							text: "my-3D2dge v0.89.1 / MIT / Copyright 2026 Michael Crosato. The MIT permission and warranty notice are preserved in this HTML. AI Hub Session Protocol v1 client 1.4.0 is included unmodified under its upstream integration instructions; a repository license is unknown.\n\nHistorical evidence: Magnavox UFO! manual; odyssey2.info game record and review; Videopac Games Satellite Attack analysis. The authored mission, hull, independent aim, rescue, co-op and boss are new additions. Original sound waveforms and exact original timings: unknown.",
							actions: [["Back", () => shell.back()]],
						}),
				],
				["Back", () => shell.back()],
			],
		});
	}
	function sourcePage(n) {
		const rows = Object.entries(REPORT.sourceInformation),
			pages = Math.ceil(rows.length / 2),
			part = rows.slice(n * 2, (n + 1) * 2);
		shell.show("sourceInfo", {
			kicker: `SOURCE INFORMATION / ${n + 1} OF ${pages}`,
			title: "The flight record",
			text: part.map(([k, v]) => `${k.toUpperCase()}\n${v}`).join("\n\n"),
			actions: [
				["Next page", () => sourcePage((n + 1) % pages)],
				["Back", () => shell.back()],
			],
		});
	}
	const questions = {
		testingFeedback: [
			"How many issues did testing catch?",
			"How many were critical / game breaking?",
			"Most helpful test?",
			"Least helpful test?",
		],
		engineFeedback: [
			"What did you like most?",
			"Did you get stuck or guess wrong?",
			"Most important thing built yourself?",
			"Hardest part using the engine?",
			"What changed in the engine, and why?",
			"One change you would make?",
		],
		promptFeedback: [
			"What did you like most?",
			"What was confusing?",
			"What was hardest?",
			"What would you change?",
		],
	};
	function feedback(key, title, n) {
		shell.show(key, {
			kicker: `${title.toUpperCase()} / ${n + 1} OF ${REPORT[key].length}`,
			title: questions[key][n],
			text: REPORT[key][n],
			actions: [
				[
					"Next answer",
					() => feedback(key, title, (n + 1) % REPORT[key].length),
				],
				["Back", () => shell.back()],
			],
		});
	}
	function layoutMenu(m, kind = "title") {
		const tall = game.H > game.W;
		m.scale = tall ? 3 : 2;
		if (kind === "title") {
			m.x = tall ? "center" : Math.round(game.W * 0.56);
			m.y = tall ? Math.round(game.H * 0.52) : Math.round(game.H * 0.39);
		} else {
			m.x = "center";
			m.y = tall
				? Math.round(game.H * 0.59)
				: kind === "name"
					? 250
					: kind === "join"
						? 235
						: Math.round(game.H * 0.6);
		}
	}
	function titleDraw(r) {
		const tall = r.H > r.W,
			W = r.W,
			H = r.H,
			t = game.settings.motion ? 0 : game.real;
		presentation.drawBackdrop(r, 0, t, { title: true });
		r.overlay((g) => {
			const x = tall ? W / 2 : 42,
				y = tall ? 55 : 44,
				align = tall ? "center" : "left";
			E.font.text(g, "EARTH DEFENCE / 1981 -> TOMORROW", x, y, "#a9c9c5", {
				outline: false,
				align,
				scale: 1,
			});
			E.font.title(g, "UFOh", x, y + 20, {
				scale: tall ? 6 : 7,
				align,
				colors: ["#f4f0cd", "#c0e5d6", "#65bbaa"],
				depth: 3,
				depthColor: "#204952",
			});
			E.font.title(g, "CHAIN GANG", x, y + (tall ? 78 : 90), {
				scale: tall ? 3 : 3,
				align,
				colors: ["#a4f7da", "#72cbbe", "#388d94"],
				depth: 2,
				depthColor: "#102b3c",
			});
			E.font.text(
				g,
				"A little saucer. An enormous attitude.",
				x,
				y + (tall ? 114 : 126),
				"#efc689",
				{ align, outline: false, scale: 1 },
			);
			const path = titlePath.at((t * 5) % titlePath.length),
				sx = (tall ? W / 2 : game.W * 0.26) + path.x,
				sy = (tall ? H * 0.35 : game.H * 0.68) + path.y,
				k = tall ? 2.7 : 3.6,
				ship = {
					id: 0,
					index: 0,
					vx: Math.sin(t * 0.8) * 50,
					vy: 0,
					hull: 3,
					shield: 0,
					invuln: 0,
					recoil: 0,
				};
			presentation.drawSaucer(g, sx, sy, ship, k, t, game.settings);
			const R = 30 * k;
			for (let i = 0; i < 24; i++) {
				const a = (i * TAU) / 24;
				P.disc(
					g,
					sx + Math.cos(a) * R,
					sy + Math.sin(a) * R,
					k * 0.9,
					"#5bbcae",
				);
			}
			const a = t * 0.7;
			P.disc(g, sx + Math.cos(a) * R, sy + Math.sin(a) * R, 3.5, "#f4fff0");
			const foot = tall ? H - 96 : H - 43;
			E.font.text(
				g,
				"FIRE SPENDS YOUR SHIELD.",
				tall ? W / 2 : W * 0.58,
				foot,
				"#eee5c5",
				{ align: tall ? "center" : "left", outline: false, scale: 1 },
			);
			E.font.text(
				g,
				"FULL RING? RAM WITH CONFIDENCE.",
				tall ? W / 2 : W * 0.58,
				foot + 12,
				"#87b2bd",
				{ align: tall ? "center" : "left", outline: false, scale: 1 },
			);
			E.font.text(g, prompts(), W / 2, H - 16, "#8daeb7", {
				align: "center",
				outline: false,
			});
			if (!tall) {
				const best = records.get();
				E.font.text(
					g,
					"BEST / " +
						String(best.mission.score).padStart(6, "0") +
						" " +
						best.mission.name,
					42,
					H - 44,
					"#728e9d",
					{ outline: false },
				);
			}
		});
		layoutMenu(menus.title);
		menus.title.draw(r);
	}
	function prompts() {
		const I = game.input;
		return I.lastDevice === "touch"
			? "TAP TO CHOOSE / TOUCH FLIGHT ASSISTED"
			: I.lastDevice === "gamepad"
				? `${I.label("confirm")} SELECT    ${I.label("cancel")} BACK    R2 FIRE`
				: "ENTER / CLICK SELECT    ESC BACK    WASD + MOUSE";
	}
	function joinStart(style) {
		removeInputs();
		joinStyle = style;
		game.input.pad = style === "keyboard" ? null : "any";
		paired = false;
		_joinedPad = -1;
		padPrev = [];
		go("join");
	}
	function updateJoin() {
		let claimed = false;
		if (!game.headless) {
			const pads = Array.from(navigator.getGamepads?.() || []).filter(
				(p) => p && p.connected !== false,
			);
			for (const pad of pads) {
				const pressed = !!(pad.buttons[0]?.pressed || pad.buttons[9]?.pressed);
				if (pressed && !padPrev[pad.index]) {
					audio.unlock();
					idle = 0;
					if (joinStyle === "keyboard" && !paired) {
						game.addPlayer({ pad: pad.index });
						_joinedPad = pad.index;
						paired = true;
						claimed = true;
					} else if (joinStyle === "pads") {
						if (game.input.pad === "any" || game.input.pad === null) {
							game.input.pad = pad.index;
							game.input.padIndex = pad.index;
							claimed = true;
						} else if (pad.index !== game.input.pad && !paired) {
							game.addPlayer({ pad: pad.index });
							_joinedPad = pad.index;
							paired = true;
							claimed = true;
						}
					}
				}
				padPrev[pad.index] = pressed;
			}
		}
		if (claimed) {
			for (const input of game.players) input.consumeAll();
			if (paired) menus.join.i = 0;
		}
		menus.join.items[0] = {
			label: paired ? "Launch together" : "Waiting for second pilot",
			disabled: !paired,
		};
		menus.join.items[1] = `Mode: ${pendingMode === "score" ? "Score attack" : "Mission"}`;
		layoutMenu(menus.join, "join");
		menus.join.update();
	}
	function joinDraw(r) {
		presentation.drawBackdrop(r, 0, game.real);
		r.overlay((g) => {
			const tall = r.H > r.W;
			E.font.title(g, "TWO LITTLE SAUCERS", r.W / 2, 45, {
				align: "center",
				scale: tall ? 2 : 3,
				colors: ["#eff7df", "#75d6c4"],
			});
			E.font.text(
				g,
				joinStyle === "keyboard"
					? "P1 / KEYBOARD + MOUSE    P2 / CONTROLLER"
					: "P1 / FIRST CONTROLLER    P2 / SECOND CONTROLLER",
				r.W / 2,
				85,
				"#c0d7d8",
				{ align: "center", outline: false },
			);
			E.font.text(
				g,
				"Press Cross on the joining controller.",
				r.W / 2,
				105,
				"#f0ca8a",
				{ align: "center", outline: false },
			);
			for (let i = 0; i < 2; i++) {
				const x = r.W / 2 + (i ? 75 : -75),
					y = tall ? r.H * 0.36 : 165;
				presentation.drawSaucer(
					g,
					x,
					y,
					{ id: i, index: i, hull: 3, shield: 0, vx: 0, vy: 0 },
					1.8,
					game.real,
					game.settings,
				);
				E.font.text(
					g,
					i ? (paired ? "P2 / PAIRED" : "P2 / WAITING") : "P1 / READY",
					x,
					y + 52,
					i ? "#ffcf7b" : "#67f1c4",
					{ align: "center", outline: false },
				);
			}
			E.font.text(
				g,
				"Ready ring + wreck = rescue. Both down = defeat.",
				r.W / 2,
				r.H - 38,
				"#98b8be",
				{ align: "center", outline: false },
			);
		});
		layoutMenu(menus.join, "join");
		menus.join.draw(r);
	}
	function resultDraw(r) {
		presentation.drawBackdrop(r, world?.state.sector || 0, game.real);
		const s = world.state,
			tall = r.H > r.W;
		r.overlay((g) => {
			E.font.text(
				g,
				s.debug
					? "FLIGHT LAB / NO RECORDS"
					: s.mode === "score"
						? "SCORE ATTACK / FLIGHT RECORD"
						: "MISSION / FLIGHT RECORD",
				r.W / 2,
				28,
				"#9db8be",
				{ align: "center", outline: false },
			);
			E.font.title(
				g,
				s.status === "victory" ? "EARTH SAYS THANKS." : "SAUCER DOWN.",
				r.W / 2,
				52,
				{
					scale: tall ? 2 : 3,
					align: "center",
					colors:
						s.status === "victory"
							? ["#eff3d0", "#83dfc0"]
							: ["#ffdeae", "#e59383"],
					depth: 2,
				},
			);
			E.font.text(
				g,
				s.status === "victory"
					? "WE KNEW YOU HAD IT. MOSTLY."
					: "CONFIDENCE IS RENEWABLE. TRY AGAIN.",
				r.W / 2,
				88,
				"#cebda5",
				{ align: "center", outline: false },
			);
			E.font.text(
				g,
				String(s.score).padStart(6, "0"),
				r.W / 2,
				115,
				"#fff1c5",
				{ scale: 4, align: "center", outline: false },
			);
			E.font.text(
				g,
				`TEAM SCORE / BEST CHAIN ${s.bestChain}`,
				r.W / 2,
				151,
				"#8eb9c0",
				{ align: "center", outline: false },
			);
			s.players
				.filter((p) => p.active)
				.forEach((p, i) => {
					E.font.text(
						g,
						`P${p.index + 1} CONTRIBUTION / ${p.score}`,
						r.W / 2 + (s.players.length === 1 ? 0 : i ? 90 : -90),
						174,
						i ? "#ffcf7b" : "#7ee6c3",
						{ align: "center", outline: false },
					);
				});
			if (s.debug)
				E.font.text(g, "DEBUG RUN / UNRANKED", r.W / 2, 194, "#efbd8b", {
					align: "center",
					outline: false,
				});
		});
		layoutMenu(menus.results, "results");
		menus.results.draw(r);
	}
	function setupResults() {
		const s = world.state,
			eligible = !s.debug && !s.attract && records.qualifies(s.mode, s.score);
		menus.results = menu(
			[
				...(eligible ? ["Save six-letter high score"] : []),
				"Replay flight",
				"Mode selection",
				"About / Credits",
			],
			(i) => {
				if (eligible) {
					if (i === 0) {
						entryChars = records.get().name.split("");
						entryCursor = 0;
						app.entryActive = true;
						go("name");
						return;
					}
					i--;
				}
				if (i === 0) begin(s.mode, runPlayers, { keepPair: true });
				else if (i === 1) toTitle();
				else showAbout();
			},
			{ onCancel: toTitle },
		);
		audio.setScene(s.status === "victory" ? "victory" : "defeat");
	}
	function nameUpdate() {
		const I =
				game.players.find(
					(q) =>
						q.clicked() ||
						q.anyPressed() ||
						["up", "down", "left", "right"].some((a) => q.down(a)),
				) || game.input,
			chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ",
			change = (dir) => {
				entryChars[entryCursor] =
					chars[
						(chars.indexOf(entryChars[entryCursor]) + chars.length + dir) %
							chars.length
					];
			};
		layoutMenu(menus.name, "name");
		const click = I.clicked();
		if (click) {
			const x0 = game.W / 2 - 126;
			let tile = false;
			for (let i = 0; i < 6; i++)
				if (
					click[0] >= x0 + i * 42 &&
					click[0] < x0 + (i + 1) * 42 &&
					click[1] >= 120 &&
					click[1] <= 200
				) {
					entryCursor = i;
					app.entryActive = true;
					tile = true;
					if (click[1] < 145) change(1);
					else if (click[1] > 175) change(-1);
				}
			if (!tile) {
				menus.name.active = true;
				menus.name.update();
				return;
			}
		}
		if (app.entryActive) {
			if (I.repeat("left")) entryCursor = (entryCursor + 5) % 6;
			if (I.repeat("right")) entryCursor = (entryCursor + 1) % 6;
			if (I.repeat("up")) change(1);
			if (I.repeat("down")) change(-1);
			if (I.pressed("confirm")) {
				entryCursor++;
				if (entryCursor >= 6) {
					entryCursor = 6;
					app.entryActive = false;
				}
				I.consumeAll();
			}
			if (I.pressed("cancel")) {
				app.entryActive = false;
				entryCursor = 6;
				I.consumeAll();
			}
		} else {
			menus.name.active = true;
			menus.name.update();
		}
	}
	function nameDraw(r) {
		presentation.drawBackdrop(r, 0, game.real);
		r.overlay((g) => {
			E.font.title(g, "SIGN YOUR FLIGHT", r.W / 2, 45, {
				align: "center",
				scale: r.W < 500 ? 2 : 3,
				colors: ["#f0edc9", "#71d6bc"],
			});
			E.font.text(
				g,
				"SIX LETTERS. OUTSIZED REPUTATION.",
				r.W / 2,
				85,
				"#a7c5ca",
				{ align: "center", outline: false },
			);
			const x0 = r.W / 2 - 126;
			for (let i = 0; i < 6; i++) {
				const x = x0 + i * 42,
					selected = i === entryCursor && app.entryActive;
				E.ui.box(g, x, 120, 38, 80, {
					bg: selected ? "#254540" : "#102536",
					border: selected ? "#a3f8d6" : "#3a5b69",
				});
				E.font.text(g, "↑", x + 19, 128, selected ? "#a0efcf" : "#638a93", {
					scale: 2,
					align: "center",
					outline: false,
				});
				E.font.text(g, entryChars[i] || " ", x + 19, 153, "#ecedd5", {
					scale: 2,
					align: "center",
					outline: false,
				});
				E.font.text(g, "↓", x + 19, 179, selected ? "#a0efcf" : "#638a93", {
					scale: 2,
					align: "center",
					outline: false,
				});
			}
			E.font.text(
				g,
				"TYPE / ↑↓ LETTER  ←→ SLOT  CONFIRM NEXT",
				r.W / 2,
				215,
				"#a9c5c4",
				{ align: "center", outline: false },
			);
		});
		layoutMenu(menus.name, "name");
		menus.name.active = !app.entryActive;
		menus.name.draw(r);
	}
	menus.title = menu(
		[
			"Start mission",
			"Score attack",
			"Local co-op",
			"Settings",
			"About / Credits",
		],
		(i) => {
			idle = 0;
			if (i === 0) begin("mission");
			else if (i === 1) begin("score");
			else if (i === 2) go("pairing");
			else if (i === 3) game.menu("settings");
			else showAbout();
		},
	);
	menus.pairing = menu(
		["Keyboard + controller", "Two controllers", "Back"],
		(i) => (i === 2 ? toTitle() : joinStart(i === 0 ? "keyboard" : "pads")),
		{ onCancel: toTitle },
	);
	menus.join = menu(
		[
			{ label: "Waiting for second pilot", disabled: true },
			"Mode: Mission",
			"Change devices",
			"Back",
		],
		(i) => {
			if (i === 0 && paired) begin(pendingMode, 2, { keepPair: true });
			else if (i === 1) {
				pendingMode = pendingMode === "mission" ? "score" : "mission";
			} else if (i === 2) go("pairing");
			else toTitle();
		},
		{ onCancel: toTitle },
	);
	menus.name = menu(
		["Save name", "Edit letters", "Skip"],
		(i) => {
			if (i === 0) {
				records.commit(
					world.state.mode,
					world.state.score,
					entryChars.join(""),
					{ debug: world.state.debug, attract, session: !!app.hub?.active },
				);
				app.entryActive = false;
				go("results");
			} else if (i === 1) {
				entryCursor = 0;
				app.entryActive = true;
			} else {
				app.entryActive = false;
				go("results");
			}
		},
		{ onCancel: () => go("results") },
	);
	const scenes = {
		boot: {
			draw(r) {
				r.sky(["#07111d", "#0c2430"]);
				r.text("CONTACTING FLIGHT CONTROL", r.W / 2, r.H / 2, "#b0e4d8", {
					align: "center",
					scale: 2,
				});
			},
		},
		title: {
			enter() {
				idle = 0;
				world = null;
				audio.setScene("title");
				controls.clear();
			},
			update(dt) {
				idle += dt;
				layoutMenu(menus.title);
				menus.title.update();
				if (idle >= 10 && !shell.screen) startAttract();
			},
			draw: titleDraw,
		},
		pairing: {
			update() {
				layoutMenu(menus.pairing, "pairing");
				menus.pairing.update();
			},
			draw(r) {
				presentation.drawBackdrop(r, 0, game.real);
				r.text("PAIR YOUR PILOTS", r.W / 2, 70, "#d8f4df", {
					scale: 2,
					align: "center",
				});
				r.text(
					"One keyboard + pad, or two independent pads.",
					r.W / 2,
					105,
					"#adc7cc",
					{ align: "center" },
				);
				layoutMenu(menus.pairing, "pairing");
				menus.pairing.draw(r);
			},
		},
		join: { update: updateJoin, draw: joinDraw },
		play: {
			pausable: true,
			camera: { zoom: false },
			enter() {
				app.projection = fitArena(game);
				controls.clear();
			},
			update(dt) {
				if (app.hub?.active) {
					const local =
							world?.state.players.findIndex((p) => p.id === app.hub.localId) ??
							-1,
						localIntent = local >= 0 ? controls.intent(local) : {};
					app.hub.tick(dt, localIntent, {
						overlay: game.paused || !!shell.screen,
					});
					app.flushEvents();
				} else if (world) {
					if (attract) updateDemo(dt);
					stepAcc += dt * dev.speed;
					while (stepAcc >= 1 / 120 - 1e-10) {
						app.stepWorld(1 / 120);
						stepAcc -= 1 / 120;
					}
					if (!attract && ["victory", "defeat"].includes(world.state.status)) {
						resultDelay += dt;
						if (resultDelay > 0.7) go("results");
					}
				}
				presentation.update(dt);
				audio.update(dt);
				controls.update();
			},
			draw(r) {
				const snapshot = app.hub?.active
					? app.hub.getPresentation(game.alpha)
					: world?.snapshot();
				if (snapshot) {
					presentation.drawWorld(r, snapshot, {
						demo: attract,
						overlay: !!app.hub?.active && !!shell.screen,
						collisions: dev.overlay,
						aimOverlay: dev.aim,
					});
					if (attract)
						r.text(
							"DEMO / ANY INPUT TO TAKE COMMAND",
							r.W / 2,
							r.H - 30,
							"#e9d08f",
							{ align: "center" },
						);
					if (app.hub?.active && !app.hub.running && !app.hub.ended) {
						const time = globalThis.AIHub.time();
						r.text(
							Number.isFinite(time)
								? `LAUNCH IN ${Math.max(0, Math.ceil(-time / 1000))}`
								: "AI HUB / FLIGHT CREW READY",
							r.W / 2,
							r.H / 2,
							"#e8f6d4",
							{ align: "center", scale: 2 },
						);
					}
					if (app.hub?.ended)
						r.text(
							"FLIGHT COMPLETE / AI HUB HAS THE CONN",
							r.W / 2,
							r.H / 2,
							"#e8f6d4",
							{ align: "center" },
						);
				}
			},
		},
		results: {
			enter: setupResults,
			update() {
				layoutMenu(menus.results, "results");
				menus.results.update();
			},
			draw: resultDraw,
		},
		name: { update: nameUpdate, draw: nameDraw },
	};
	game.start({ scene: "boot", scenes });
	game.screen.listeners.push(() => {
		if (game.sceneName === "play") app.projection = fitArena(game);
	});
	game.hook("input", () => {
		if (app.hub?.ended) {
			for (const I of game.players) {
				I.consumeAll();
				I.clear();
			}
			return;
		}
		const pads = game.players;
		const moved = pads.some(
			(I) =>
				(I.padMove && Math.hypot(...I.padMove) > 0.25) ||
				(I.padAim && Math.hypot(...I.padAim) > 0.25) ||
				I.padValues?.some((v) => v > 0.5),
		);
		if (moved) {
			if (attract) {
				app.activity();
				for (const I of pads) {
					I.consumeAll();
					I.clear();
				}
				return;
			}
			idle = 0;
			if (!lastPadActive && !game.headless) audio.unlock();
		}
		lastPadActive = moved;
		audio.setPaused(game.paused && !app.hub?.active);
		if (game.paused) controls.cancelTouch();
	});
	app.debug = {
		bot: false,
		menus,
		report: REPORT,
		verifyAudio,
		begin,
		toTitle,
		startAttract,
		showAbout,
		snapshot() {
			return {
				title: TITLE,
				scene: game.sceneName,
				paused: game.paused,
				shell: shell.screen,
				idle,
				attract,
				attractTime,
				projection: app.projection,
				players: world?.state.players.map((p) => ({
					id: p.id,
					x: p.x,
					y: p.y,
					hull: p.hull,
					shield: p.shield,
					bearing: p.bearing,
					requested: p.requested,
					down: p.down,
					active: p.active,
				})),
				world: world
					? {
							seed: world.state.seed,
							mode: world.state.mode,
							t: world.state.t,
							tick: world.state.tick,
							status: world.state.status,
							wave: world.state.wave,
							sector: world.state.sector,
							score: world.state.score,
							bestChain: world.state.bestChain,
							enemies: world.state.enemies.length,
							shots: world.state.shots.length,
							metrics: world.state.metrics,
							debug: world.state.debug,
							boss: world.state.boss
								? { phase: world.state.boss.phase, hp: world.state.boss.hp }
								: null,
						}
					: null,
				controls: {
					touches: controls.touches,
					touch: controls.touchUsed,
					mouseAim: controls.mouseAim,
					lastDevice: game.input.lastDevice,
					label: game.input.label("confirm"),
				},
				audio: audio.debug(),
				hub: app.hub?.diagnostics() || null,
				errors: game.errors,
				records: records.get(),
			};
		},
		command(name, data) {
			if (app.hub?.active)
				throw new Error("World-changing dev commands are unavailable in Hub.");
			if (name === "start") {
				begin(data?.mode || "mission", data?.players || 1, {
					debug: !!data?.debug,
				});
				return true;
			}
			if (name === "attract") {
				startAttract();
				return true;
			}
			if (name === "title") {
				toTitle();
				return true;
			}
			if (name === "step") {
				app.stepWorld(data?.dt || 1 / 120, true);
				return true;
			}
			const result = world?.command(name, data);
			app.flushEvents();
			return result;
		},
	};
	game.debug = app.debug;
	app.ready = (async () => {
		if (!game.headless && globalThis.AIHub) {
			app.hub = createHubAdapter({
				hub: globalThis.AIHub,
				createWorld: (o) => new World(o),
				onWorld: (w) => {
					world = w;
					lastEvent = 0;
					presentation.reset();
				},
				onEnd: () => {
					controls.clear();
					audio.stop();
					shell.hide();
				},
				onEvent: (e) => {
					presentation.event(e);
					audio.event(e);
				},
			});
			const info = await app.hub.connect();
			if (info) {
				game.o.autoPause = false;
				game.live = true;
				game.o.live = true;
				game.o.menu.quit = false;
				world = app.hub.getWorld();
				world.state.session = true;
				attract = false;
				runPlayers = world.state.players.length;
				audio.setScene("mission");
				game.go("play", null, { fade: 0 });
				return app;
			}
		}
		game.go("title", null, { fade: 0 });
		return app;
	})();
	return app;
}
if (typeof document !== "undefined") {
	globalThis.__game = createGame();
	globalThis.__game.ready.catch((e) => globalThis.__game.game.fail("boot", e));
}
