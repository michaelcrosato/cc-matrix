((T) => {
	const E = My3D2dge;
	const PRESET = {
		up: ["KeyW", "ArrowUp", "Pad12", "PadAxisUp"],
		down: ["KeyS", "ArrowDown", "Pad13", "PadAxisDown"],
		left: ["KeyA", "ArrowLeft", "Pad14", "PadAxisLeft"],
		right: ["KeyD", "ArrowRight", "Pad15", "PadAxisRight"],
		bomb: ["Space", "Mouse2", "Pad0"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Backspace", "Pad1"],
		pause: ["Escape", "KeyP", "Pad9"],
		start: ["Enter", "Pad9"],
		halves: {
			left: {
				bomb: ["Space"],
				confirm: ["Enter", "Space"],
				cancel: ["Escape"],
				pause: ["Escape", "KeyP"],
			},
			right: {
				bomb: ["ShiftRight"],
				confirm: ["Enter"],
				cancel: ["Backspace"],
				pause: ["Backspace"],
			},
		},
	};
	const online = typeof AIHub !== "undefined" && AIHub.active;
	const game = new E.Game({
		id: "turtley-booked-v1",
		canvas: "screen",
		res: [400, 280],
		expand: true,
		view: "overhead",
		views: ["overhead"],
		input: PRESET,
		live: online,
		autoPause: !online,
		fullscreen: "button",
		camera: { zoom: false, start: 1, tall: 1 },
		menu: {
			quit: false,
			controls: { bomb: "Bug bomb" },
			settings: [
				{ key: "glyphs", value: "playstation" },
				{ key: "music", value: 0.1 },
				{
					key: "voice",
					group: "Sound",
					label: "Turtle voices",
					type: "slider",
					value: 0.7,
					min: 0,
					max: 1,
					step: 0.05,
					apply: (g, v) => {
						g.audio.voiceVolume = v;
						g.audio.applyVolume();
					},
				},
				{
					key: "assist",
					label: "Touch auto-defence",
					group: "Game",
					value: true,
					help: "An imminent beetle triggers a bomb if the team has one. Separate assisted records.",
				},
			],
		},
	});
	const app = {
		game,
		run: null,
		net: null,
		art: new T.Art(game),
		sound: new T.Sound(game),
		bot: new T.Bot(),
		mode: "solo",
		layout: "shared",
		latest: [],
		bombSeq: 0,
		dev: { graph: false, los: false, collision: false, reveal: false },
		stepOnce: false,
		timeScale: 1,
		lastDevice: "",
		resultShown: false,
		ending: false,
		attract: false,
		activity: 0,
	};
	T.app = app;
	const cab = new E.Arcade(game, {
		id: "turtley-booked",
		idle: 10,
		demo: 1e9,
		scores: 6,
		hud: false,
	});
	app.cab = cab;
	const S = game.settings;
	game.lights.enabled = true;
	game.lights.ambient = 0.86;
	function resetInputs(resetBombs = true) {
		for (const i of game.players) i.clear();
		app.latest = [];
		if (resetBombs) app.bombSeq = 0;
	}
	function seats(layout = "shared") {
		while (game.players.length > 1) game.removePlayer(game.players[1]);
		const I = game.input;
		I.clear();
		I.padIndex = null;
		I.padId = "";
		I.padPrev = [];
		I.padMove = [0, 0];
		I.padLost = false;
		I.half = null;
		I._full = null;
		I.pad = "any";
		I.use(PRESET);
		if (layout === "solo") return;
		const pads =
			typeof navigator !== "undefined"
				? Array.from(navigator.getGamepads?.() || []).filter(
						(p) => p && p.connected !== false,
					)
				: [];
		if (layout === "shared") {
			game.addPlayer({ keys: "right" });
			I.pad = null;
			game.players[1].pad = null;
		} else if (layout === "mixed") {
			I.pad = null;
			game.addPlayer({ pad: pads[0]?.index ?? 0 });
		} else {
			I.pad = pads[0]?.index ?? 0;
			game.addPlayer({ pad: pads[1]?.index ?? 1 });
		}
	}
	app.start = (mode = "solo", layout = "shared", opts = {}) => {
		app.mode = mode;
		app.layout = layout;
		app.attract = !!opts.demo;
		app.resultShown = false;
		app.ending = false;
		app.timeScale = 1;
		app.stepOnce = false;
		seats(mode === "solo" ? "solo" : layout);
		ui.hide();
		game.resume();
		resetInputs();
		app.sound.stop();
		app.state = null;
		app.art.floor = -1;
		app.art.effects = [];
		app.art.rigs.clear();
		app.run = new T.Run({
			mode: opts.demo ? "demo" : mode,
			seats: mode === "solo" ? [0] : [0, 1],
			seed: opts.seed ?? 2701,
			demo: opts.demo,
			assisted: game.input.lastDevice === "touch" && S.assist,
		});
		app.art.lastEvent = 0;
		app.sound.last = 0;
		app.state = app.run.snapshot();
		app.art.update(0, app.state);
		app.bot = new T.Bot();
		for (const sp of T.SLIDERS) S[sp[0]] = T.DEFAULTS[sp[0]];
		S.invulnerable = false;
		S.devFloor = 0;
		S.devScale = 1;
		app.dev = { graph: false, los: false, collision: false, reveal: false };
		game.go("play", null, { fade: 0 });
		app.sound.music(true);
	};
	app.title = () => {
		app.sound.stop();
		app.attract = false;
		app.run = null;
		app.state = null;
		app.net = null;
		ui.hide();
		game.resume();
		seats("solo");
		resetInputs();
		cab.wake();
		app.activity = game.real;
		game.go("title", null, { fade: 0 });
	};
	function about() {
		ui.show("about", {
			kicker: "THE SHELLTON • CREDITS",
			title: "Made with little shells",
			text: "An original hotel-rescue arcade game inspired by Turtles (1983 US Odyssey²). Game design, code, pixel bodies, animation and synthesized score created for this build. Engine by Michael Crosato (MIT).",
			actions: [
				["Source information", () => infoPage("source")],
				["Testing feedback", () => infoPage("testing")],
				["Engine feedback", () => infoPage("engine")],
				["Prompt feedback", () => infoPage("prompt")],
				[
					"Licenses & research",
					() =>
						ui.show("provenance", {
							title: "Standing on friendly shells",
							sections: [
								[
									"Engine",
									"my-3D2dge v0.89.1 • MIT • Michael Crosato. Source commit 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Full license is embedded in this HTML.",
								],
								[
									"Hub",
									"AI Hub Session Protocol 1, client 1.4.0, unmodified. Commit 35a1047f2067b2af3de3943f0fe452f39105d869.",
								],
								[
									"Historical evidence",
									"US manual: odyssey2.info/library/manuals/us_turtles/Turtles%20(USA).pdf. Release and screenshot: odyssey2.info/db/game/turtles-47. Review: odyssey2.info/reviews/turtles-117. Manual pictures and a documented screenshot were inspected. No original footage or audio was watched/heard.",
								],
								[
									"Original work",
									"All game art, layouts, animation, music and gibberish are procedural code; no source screenshots or audio recordings are used.",
								],
							],
							actions: [["Back", () => ui.back()]],
						}),
				],
				["Back", () => ui.back()],
			],
		});
	}
	app.about = about;
	function infoPage(which) {
		const meta = T.INTERVIEW || {},
			questions = {
				testing: [
					"Issues found",
					"Critical / game breaking",
					"Most helpful check",
					"Least helpful check",
				],
				engine: [
					"Favorite engine feature",
					"Where I guessed wrong",
					"Most important custom system",
					"Hardest engine integration",
					"Engine changes",
					"One improvement",
				],
				prompt: [
					"Best part",
					"Confusing part",
					"Hardest part",
					"Suggested change",
				],
			};
		const data =
			which === "source"
				? Object.entries(
						meta.sourceInformation || {
							date: "2026-11-06 03:30:15",
							source: "Turtles (1983 US Odyssey²)",
							plan: "PLAN.md",
							usage: "added on import",
						},
					)
				: (meta[which + "Feedback"] || ["unknown"]).map((v, i) => [
						questions[which][i],
						v,
					]);
		// Paginate dense metadata into controller-sized, readable screens.
		let page = 0;
		const show = () =>
			ui.show("info-" + which, {
				kicker:
					which.toUpperCase() +
					" • " +
					(page + 1) +
					" / " +
					Math.ceil(data.length / 3),
				title:
					which === "source"
						? "Source information"
						: which[0].toUpperCase() + which.slice(1) + " feedback",
				sections: data.slice(page * 3, page * 3 + 3),
				actions: [
					page > 0 && [
						"Previous",
						() => {
							page--;
							show();
						},
					],
					(page + 1) * 3 < data.length && [
						"Next",
						() => {
							page++;
							show();
						},
					],
					["Back", () => ui.back()],
				],
			});
		show();
	}
	function help() {
		ui.show("help", {
			kicker: "A CARETAKER’S FIELD GUIDE",
			title: "Every guest deserves a lift.",
			sections: [
				[
					"01 • Knock, carry, reunite",
					"Enter a ? room to find a hatchling or a beetle. Carry one hatchling at a time. Its symbol matches a lit home on the outer edge. Walk into that home to deliver.",
				],
				[
					"02 • Make a little space",
					"Plant a bug bomb in a beetle’s path. One active bomb for the entire team; three in stock to start, five maximum. A triggered bomb stuns nearby beetles and makes them blue again.",
				],
				[
					"03 • Stay one step ahead",
					"Blue wanders. Yellow follows a clear corridor. Red routes around corners. The central + station gives two bombs, then takes six seconds to recharge. Leave and re-enter to collect.",
				],
				[
					"04 • A team of tiny heroes",
					"Three shared lives; the third hit ends the run. A dropped passenger waits in its revealed room. Rescues stay safe. Five floors and 26 hatchlings lead to the roof.",
				],
			],
			keys: [
				["WASD / Arrows", "Move (solo)"],
				["Space / ✕", "Plant bug bomb"],
				["Mouse click", "Route to a tile"],
				["Right click", "Plant bug bomb"],
				["Escape / Options", "Pause"],
				["Touch drag", "Move; contextual POP and optional auto-defence"],
			],
			actions: [["Back", () => ui.back()]],
		});
	}
	function coop() {
		const touch = game.input.lastDevice === "touch";
		ui.show("coop", {
			kicker: "TWO SHELLS, ONE BIG HEART",
			title: "Local co-op",
			text: touch
				? "Single-device touch play supports one rescuer. Use a keyboard and/or two controllers for local co-op. Remote co-op is available when launched through AI Hub."
				: "Both rescuers act together, carry independently, and share bombs, lives and score. Remote co-op is available when launched through AI Hub.",
			actions: [
				!touch && ["Shared keyboard", () => app.start("coop", "shared")],
				!touch && ["Keyboard + controller", () => app.start("coop", "mixed")],
				!touch && ["Two controllers", () => app.start("coop", "pads")],
				[
					"Controls & seat mapping",
					() =>
						ui.show("mapping", {
							title: "A place for every pair of feet",
							sections: [
								[
									"Shared keyboard",
									"Player 1: WASD + Space. Player 2: arrows + Right Shift.",
								],
								[
									"Keyboard + controller",
									"Player 1: WASD or arrows + Space. Player 2: first standard controller + Cross.",
								],
								[
									"Two controllers",
									"First controller: Player 1. Second controller: Player 2. Both use left stick / D-pad and Cross.",
								],
								[
									"Device recovery",
									"Pause and choose Change local controls to replace devices or switch to shared keyboard without losing the floor.",
								],
							],
							actions: [["Back", () => ui.back()]],
						}),
				],
				["Back", () => ui.back()],
			],
		});
	}
	function changeControls() {
		ui.show("seat-map", {
			title: "Change local controls",
			text: "Your current team and passengers stay on this floor.",
			actions: ["shared", "mixed", "pads"]
				.map((l) => [
					{
						shared: "Shared keyboard",
						mixed: "Keyboard + controller",
						pads: "Two controllers",
					}[l],
					() => {
						seats(l);
						app.layout = l;
						resetInputs(false);
						ui.hide();
						game.resume();
					},
				])
				.concat([["Back", () => ui.back()]]),
		});
	}
	const ui = new E.Shell(game, {
		theme: {
			scale: (w) =>
				w.innerWidth < 800 ? 1 : Math.min(2.3, w.innerWidth / 850),
			ink: "#fff0cf",
			paper: "rgba(14,32,42,.96)",
			accent: "#e6c38c",
			muted: "#b3c8c5",
			danger: "#efaaa1",
			line: "rgba(211,202,160,.28)",
			font: "Trebuchet MS, system-ui, sans-serif",
			titleFont: "Georgia, serif",
		},
		screens: {
			pause: {
				kicker: () =>
					app.net ? "ONLINE • WORLD CONTINUES" : "TAKE A LITTLE SHELL BREAK",
				title: () =>
					app.net ? "Your turtle is resting" : "Room service, on pause",
				actions: () => [
					!app.net && [
						"Restart campaign",
						() => app.start(app.mode, app.layout),
					],
					!app.net &&
						app.mode === "coop" && ["Change local controls", changeControls],
					["Developer tools", () => devMenu()],
					["About / Credits", about],
					!app.net && ["Return to title", () => app.title()],
				],
			},
			help: {
				title: "How to play",
				text: "Carry little guests home. Make room with bug bombs.",
				actions: [
					["Full guide", help],
					["Back", () => ui.back()],
				],
			},
		},
	});
	app.ui = ui;
	for (const [key, label, min, max, step] of T.SLIDERS)
		S.define({
			key,
			label,
			group: "Controls",
			type: "slider",
			value: T.DEFAULTS[key],
			min,
			max,
			step,
			apply: (g, v) => {
				if (app.run) {
					app.run.setBalance(key, v);
					g.settings.yellowAt = app.run.balance.yellowAt;
					g.settings.redAt = app.run.balance.redAt;
				}
			},
		});
	S.define({
		key: "devFloor",
		label: "Practice floor",
		group: "Controls",
		options: T.FLOORS.map((f, i) => [i, f.name]),
		value: 0,
	});
	S.define({
		key: "invulnerable",
		label: "Invulnerability",
		group: "Controls",
		value: false,
		apply: (g, v) => {
			if (app.run) {
				app.run.god = v;
				if (v) app.run.practice = true;
			}
		},
	});
	S.define({
		key: "devScale",
		label: "Time scale",
		group: "Controls",
		value: 1,
		min: 0,
		max: 2,
		step: 0.25,
		apply: (g, v) => {
			app.timeScale = v;
			if (app.net?.run) app.net.timeScale = v;
			if (app.run && v !== 1) app.run.practice = true;
		},
	});
	for (const key of ["graph", "los", "collision", "reveal"])
		S.define({
			key: "dev-" + key,
			label: {
				graph: "Navigation graph",
				los: "Sight lines",
				collision: "Contact boxes",
				reveal: "Room contents",
			}[key],
			group: "Controls",
			value: false,
			apply: (g, v) => {
				app.dev[key] = v;
				if (key === "reveal" && v && app.run) app.run.practice = true;
			},
		});
	function devMenu() {
		if (
			app.net &&
			!(
				app.net.info.isHost &&
				typeof location !== "undefined" &&
				new URLSearchParams(location.search).get("dev") === "1"
			)
		) {
			ui.show("dev-inspector", {
				title: "Live world inspector",
				text: "Online production session: read-only. The host owns all game rules.",
				sections: [
					[
						"World",
						"Floor " +
							(app.net.state.floor + 1) +
							" • " +
							app.net.state.phase +
							" • tick " +
							app.net.state.tick,
					],
					[
						"Team",
						app.net.state.lives +
							" lives • " +
							app.net.state.stock +
							" bombs • " +
							app.net.state.rescued +
							" rescued",
					],
					[
						"Entities",
						app.net.state.players.length +
							" rescuers • " +
							app.net.state.enemies.length +
							" beetles",
					],
				],
				actions: [
					[
						"Refresh snapshot",
						() => {
							ui.back();
							devMenu();
						},
					],
					["Back", () => ui.back()],
				],
			});
			return;
		}
		const r = app.run;
		ui.show("dev", {
			kicker: "PRACTICE TOOLS",
			title: "The caretaker’s cupboard",
			text: "Cheats and balance changes mark this run unranked.",
			rows: ["devFloor", "invulnerable", "devScale"],
			actions: [
				[
					"Load practice floor",
					() => {
						r.practice = true;
						r.startFloor(S.devFloor);
						ui.hide();
						game.resume();
					},
				],
				[
					"Refill bomb stock",
					() => {
						r.stock = 5;
						r.practice = true;
						ui.toast("Bombs refilled", "Practice run");
					},
				],
				[
					"Spawn beetle at supply",
					() => {
						r.enemies.push(r.makeEnemy(r.content.supply));
						r.practice = true;
						ui.toast("Beetle checked in");
					},
				],
				[
					"Clear beetles",
					() => {
						r.enemies = [];
						r.practice = true;
						ui.toast("A beetle-free practice floor");
					},
				],
				[
					"Balance sliders",
					() =>
						ui.show("balance", {
							title: "Live balance",
							text: "Changes affect the running simulation immediately.",
							rows: T.SLIDERS.map((s) => s[0]),
							actions: [
								[
									"Reset balance defaults",
									() => {
										r.resetBalance();
										for (const sp of T.SLIDERS) S[sp[0]] = T.DEFAULTS[sp[0]];
										ui.show("balance");
									},
								],
								["Back", () => ui.back()],
							],
						}),
				],
				[
					"Overlays & room data",
					() =>
						ui.show("overlays", {
							title: "See how the hotel works",
							rows: ["dev-graph", "dev-los", "dev-collision", "dev-reveal"],
							actions: [["Back", () => ui.back()]],
						}),
				],
				[
					"Advance one simulation tick",
					() => {
						r.practice = true;
						r.step(1 / 120, {});
						app.art.update(0, r.snapshot());
						ui.toast("One tick", "Tick " + r.tick + " • " + r.phase);
					},
				],
				[
					"Inspect entities",
					() =>
						ui.show("inspect", {
							title: "Floor " + (r.floor + 1) + " • " + r.phase,
							sections: [
								[
									"Team",
									"Tick " +
										r.tick +
										" / " +
										r.lives +
										" lives / " +
										r.stock +
										" bombs / " +
										r.delivered +
										" delivered",
								],
								[
									"Passengers",
									r.players
										.map(
											(p) =>
												"P" +
												(p.seat + 1) +
												": " +
												(p.carried || "empty") +
												" → home " +
												(p.home ?? "none"),
										)
										.join("; "),
								],
								[
									"Beetles",
									r.enemies
										.map(
											(b) => b.id + ": " + b.state + " age " + b.age.toFixed(1),
										)
										.join("; "),
								],
							],
							actions: [["Back", () => ui.back()]],
						}),
				],
				["Back", () => ui.back()],
			],
		});
	}
	app.devMenu = devMenu;
	function titleMenu() {
		ui.show("title", {
			kicker: "WELCOME TO THE SHELLTON",
			name: T.IDENTITY.title,
			subtitle: T.IDENTITY.tagline,
			text: "The guests are tiny. The hotel is tall.\nGive every hatchling a lift home.",
			actions: [
				["Check in • Solo", () => app.start("solo")],
				["Local co-op", coop],
				["How to play", help],
				["Settings", () => game.menu("settings")],
				["About / Credits", about],
			],
			meta: ["5 FLOORS", "26 TINY GUESTS", "1–2 RESCUERS"],
			footer:
				"A rescue-maze arcade adventure. Demo begins after 10 idle seconds.",
		});
	}
	function result() {
		if (app.resultShown) return;
		app.resultShown = true;
		const r = app.run,
			won = r.phase === "won",
			recordType =
				(r.mode === "coop" ? "coop" : "solo") +
				(r.practice ? "-practice" : r.assisted ? "-assisted" : ""),
			key = "tb-best-" + recordType,
			best = E.store.get(key, 0);
		if (!r.demo && !app.net && r.score > best) E.store.set(key, r.score);
		ui.show("results", {
			kicker: won ? "EVERY GUEST, HOME" : "THAT WAS A VALIANT LITTLE SHELL",
			title: won
				? "Fully booked. Fully rescued."
				: "Time for a fresh check-in.",
			emblem: won ? "♥" : "↻",
			text: won
				? "From lobby to lanterns, you carried the whole family home. The Shellton is yours tonight."
				: "The reunited guests are safe. A new campaign begins with three lives and a full welcome.",
			stats: [
				[String(r.score), "TEAM SCORE"],
				[r.rescued + " / 26", "RESCUED"],
				[
					Math.floor(r.elapsed / 60) +
						":" +
						String(Math.floor(r.elapsed % 60)).padStart(2, "0"),
					"TIME",
				],
				[String(Math.max(best, r.score)), "BEST • " + recordType],
			],
			actions: [
				["Play again", () => app.start(app.mode, app.layout)],
				["Return to title", () => app.title()],
				["About / Credits", about],
			],
		});
	}
	function intention(I, seat) {
		if (app.testInputs?.[seat]) return app.testInputs[seat];
		if (app.driver) {
			const r = app.net ? app.net.planner() : app.run;
			if (r) return app.driver(r, seat) || {};
		}
		const actions = ["up", "left", "down", "right"],
			dirs = [
				[0, -1],
				[-1, 0],
				[0, 1],
				[1, 0],
			],
			fresh = actions
				.map((a, i) => (I.pressed(a) ? i : -1))
				.filter((i) => i >= 0);
		if (fresh.length) app.latest[seat] = fresh.at(-1);
		let idx = app.latest[seat];
		if (idx == null || !I.down(actions[idx]))
			idx = actions.findIndex((a) => I.down(a));
		let dir = idx >= 0 ? dirs[idx] : null;
		if (!dir) {
			const mv = I.move();
			if (Math.hypot(...mv) > 0.3)
				dir =
					Math.abs(mv[0]) > Math.abs(mv[1])
						? [Math.sign(mv[0]), 0]
						: [0, Math.sign(mv[1])];
		}
		const bomb = I.pressed("bomb"),
			out = {
				dir,
				bomb,
				bombSeq: bomb ? ++app.bombSeq : app.bombSeq,
				confirm: I.pressed("confirm"),
			};
		if (I.lastDevice === "mouse" && I.clicked()) {
			const ground = game.mouseGround();
			const cell = ground && [
				Math.floor(ground[0] / 16),
				Math.floor(ground[1] / 16),
			];
			if (cell) out.route = cell;
		}
		return out;
	}
	function playUpdate(dt) {
		let st;
		if (app.net) {
			let intent = app.net.info.server
				? {}
				: ui.screen
					? { stop: true }
					: intention(game.input, app.net.info.me);
			const netState = app.net.state,
				p = netState?.players.find((p) => p.seat === app.net.info.me);
			if (p && game.input.lastDevice === "touch") {
				const near = netState.enemies.some(
					(b) =>
						b.stun <= 0 &&
						b.emerge <= 0 &&
						Math.hypot(p.x - b.x, p.y - b.y) < 2.5,
				);
				game.input.touchSet(
					"bomb",
					"POP",
					near && netState.stock > 0 && !netState.bomb,
				);
				if (
					!ui.screen &&
					S.assist &&
					near &&
					!netState.bomb &&
					netState.stock > 0 &&
					netState.enemies.some(
						(b) =>
							b.stun <= 0 &&
							b.emerge <= 0 &&
							Math.hypot(p.x - b.x, p.y - b.y) < 1.15,
					)
				)
					intent = { ...intent, bomb: true, bombSeq: ++app.bombSeq };
			} else game.input.touchSet("bomb", "POP", false);
			app.net.update(dt, intent);
			st = app.net.presentation(dt);
		} else if (app.run) {
			const r = app.run;
			if (app.attract) {
				const inputs = app.bot.inputs(r);
				r.step(dt * 1.3, inputs);
				if (["won", "lost"].includes(r.phase)) {
					app.demoWait = (app.demoWait || 0) + dt;
					if (app.demoWait > 4) {
						app.demoWait = 0;
						app.start("coop", "shared", { demo: true });
						return;
					}
				}
			} else {
				const inputs = {};
				for (let i = 0; i < r.players.length; i++)
					inputs[r.players[i].seat] = intention(
						game.players[i] || game.input,
						i,
					);
				const p = r.players[0],
					touch = game.input.lastDevice === "touch";
				if (touch) {
					r.assisted = r.assisted || !!S.assist;
					const near = r.enemies.some(
						(b) =>
							b.stun <= 0 &&
							b.emerge <= 0 &&
							Math.hypot(p.m.x - b.m.x, p.m.y - b.m.y) < 2.5,
					);
					game.input.touchSet("bomb", "POP", near && r.stock > 0 && !r.bomb);
					if (
						S.assist &&
						near &&
						!r.bomb &&
						r.stock > 0 &&
						r.enemies.some(
							(b) =>
								b.stun <= 0 &&
								b.emerge <= 0 &&
								Math.hypot(p.m.x - b.m.x, p.m.y - b.m.y) < 1.15,
						)
					)
						inputs[0] = { ...inputs[0], bomb: true, bombSeq: ++app.bombSeq };
				} else game.input.touchSet("bomb", "POP", false);
				if (app.timeScale > 0) r.step(dt * app.timeScale, inputs);
			}
			st = r.snapshot();
			if (["won", "lost"].includes(r.phase) && !app.attract) result();
		}
		if (st) {
			app.state = st;
			app.art.update(dt, st);
			app.sound.update(st);
		}
	}
	game.input.steer = "drag";
	game.input.touchButtons(["bomb"]);
	game.input.touchSet("bomb", "POP", false);
	game.input.touchFilter = (e) =>
		!e.target?.closest?.(".esh, .e-corner, [data-act]");
	app.lastMeaningful = () => {
		app.activity = game.real;
		cab.wake();
	};
	const exitDemo = () => {
		if (!app.attract) return false;
		app.title();
		resetInputs();
		app.consumeUntil = game.real + 0.16;
		return true;
	};
	if (typeof addEventListener !== "undefined") {
		for (const ev of ["keydown", "pointerdown", "touchstart"])
			addEventListener(
				ev,
				(e) => {
					if (e.repeat) return;
					app.lastMeaningful();
					if (exitDemo()) {
						e.preventDefault();
						e.stopImmediatePropagation();
					}
				},
				{ capture: true, passive: false },
			);
		let last = [0, 0];
		addEventListener(
			"pointermove",
			(e) => {
				if (
					e.pointerType === "mouse" &&
					Math.hypot(e.clientX - last[0], e.clientY - last[1]) > 4
				) {
					last = [e.clientX, e.clientY];
					app.lastMeaningful();
					if (app.attract) exitDemo();
				}
			},
			{ passive: true },
		);
	}
	game.hook("input", () => {
		const pads = game.players.map(
			(i) =>
				i.padPrev
					.map((v, k) => (v ? k : -1))
					.filter((k) => k >= 0)
					.join(",") +
				":" +
				i.padMove
					.map((v) => (Math.abs(v) > 0.35 ? Math.round(v * 3) : 0))
					.join(","),
		);
		const padChange = pads.some(
			(v, i) =>
				(v !== app.lastPads?.[i] && !v.endsWith(":0,0")) ||
				(v !== app.lastPads?.[i] && v.split(":")[0]),
		);
		app.lastPads = pads;
		if (game.input.anyPressed() || padChange) {
			app.lastMeaningful();
			if (app.attract) {
				exitDemo();
				game.input.consumeAll();
			}
		}
		if (app.net?.ended || app.consumeUntil > game.real)
			for (const i of game.players) i.consumeAll();
		if (ui.root) {
			const dev = game.input.lastDevice;
			if (dev !== app.lastDevice) {
				app.lastDevice = dev;
				ui.root.dataset.device = dev;
			}
		}
		// A neutral online overlay must send neutral intentions while the native live world keeps stepping.
	});
	const scenes = {
		title: {
			camera: { zoom: false },
			enter() {
				app.attract = false;
				app.activity = game.real;
				titleMenu();
				app.sound.music(true);
			},
			update(dt) {
				if (app.net) return;
				const eligible = ui.screen === "title";
				if (eligible) {
					cab._idle = game.real - app.activity;
					const phase = cab.attract(dt);
					if (phase === "demo") app.start("solo", "shared", { demo: true });
				} else {
					app.activity = game.real;
					cab.wake();
				}
			},
			draw(r) {
				app.art.title(r, game.time);
			},
		},
		play: {
			pausable: true,
			camera: { zoom: false, start: 1, tall: 1 },
			update: playUpdate,
			draw(r) {
				if (app.state?.phase === "celebration" || app.state?.phase === "won")
					app.art.ending(
						r,
						game.time,
						app.state.phase === "won" ? 0 : app.state.phaseTime,
					);
				else app.art.draw(r, app.dev);
				if (app.attract)
					r.text("DEMO • Any input to check in", r.W / 2, r.H - 12, "#f2d7a0", {
						align: "center",
					});
				if (app.net && !app.net.ended) {
					const t = app.net.api.time();
					if (!app.net.started || !Number.isFinite(t) || t < 0)
						r.overlay((g) => {
							E.ui.box(g, r.W / 2 - 90, r.H / 2 - 24, 180, 48, {
								bg: "#142d3b",
								border: "#ecd3a2",
							});
							E.font.text(
								g,
								!Number.isFinite(t)
									? "Checking in…"
									: String(Math.max(1, Math.ceil(-t / 1000))),
								r.W / 2,
								r.H / 2 - 10,
								"#fff1c8",
								{ align: "center", scale: 2, outline: false },
							);
						});
				}
			},
		},
	};
	game.debug = {
		snapshot: () => ({
			identity: T.IDENTITY.title,
			scene: game.sceneName,
			screen: ui.screen,
			paused: game.paused,
			net: app.net
				? {
						host: app.net.info.isHost,
						server: app.net.info.server,
						ended: app.net.ended,
						finished: app.net.finished,
						started: app.net.started,
					}
				: null,
			...app.state,
		}),
		intent: (seat, i) => {
			app.testInputs = app.testInputs || {};
			app.testInputs[seat] = i;
		},
		get run() {
			return app.run || app.net?.run;
		},
	};
	// Test traces still enter through device-independent intentions, never objective writes.
	const originalIntention = intention;
	game.start({ scenes, scene: online ? "play" : "title" });
	if (online) {
		ui.hide();
		Promise.resolve(AIHub.connect({ mode: "shared-world", seats: [1, 2] }))
			.then((info) => {
				if (!info) {
					game.o.live = false;
					game.live = false;
					game.o.autoPause = true;
					app.title();
					return;
				}
				app.net = new T.Network(info, AIHub);
				app.run = app.net.run;
				game.o.live = true;
				game.o.autoPause = false;
				game.localSeat = info.server ? null : info.me;
				app.net.onLeave = () =>
					ui.toast(
						"Partner checked out",
						"Every floor can still be finished by one rescuer.",
					);
				app.net.onEnd = (reason) => {
					app.sound.stop();
					game.audio.mute(true);
					resetInputs();
					ui.hide();
					game.input.touchSet("bomb", "POP", false);
					ui.show("hub-end", {
						title:
							reason === "finished"
								? "The team has checked out."
								: "The round has ended.",
						text:
							reason === "host-left"
								? "The host left; AI Hub voided this round."
								: "AI Hub will show your team’s result and next round.",
						actions: [],
					});
				};
				app.sound.music(true);
			})
			.catch((e) => {
				AIHub.fail("Unable to initialize hotel: " + e.message);
				game.fail("Hub initialization", e);
			});
	}
	T.intention = originalIntention;
	if (typeof window !== "undefined")
		window.__game = { game, app, snapshot: () => game.debug.snapshot() };
})(globalThis.TB);
