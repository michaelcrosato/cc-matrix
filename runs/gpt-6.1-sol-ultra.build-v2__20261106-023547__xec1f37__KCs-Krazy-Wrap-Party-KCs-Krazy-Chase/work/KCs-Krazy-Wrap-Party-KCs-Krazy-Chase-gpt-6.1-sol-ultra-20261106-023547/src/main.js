(function (root) {
	"use strict";
	const E = root.My3D2dge,
		S = root.GardenSim,
		T = root.GardenTools;
	const TITLE = "K.C.’s Krazy Wrap Party";
	function create(options = {}) {
		let world,
			displayWorld = null,
			mode = "title",
			menu,
			workshop = null,
			editorWorld = null,
			reassign = false;
		let customRun = false,
			outcomeShown = false,
			lastGarden = -1,
			reportTimer = 0;
		let idle = 0,
			physical = false,
			wakeConsumed = false,
			attractTime = 0,
			attractBeat = -1;
		let pointerTarget = null,
			pendingPaint = [],
			toast = "",
			toastTime = 0;
		let devFrozen = false,
			devStep = false,
			teleport = false,
			network = !!root.AIHub?.active,
			lastPause = false;
		let lastPadSignature = "",
			menuAge = 0,
			lastTouch = false,
			lastScene = "";
		let tourCatch = false;
		const tourMetrics = {
			bites: 0,
			catches: 0,
			wraps: 0,
			plants: 0,
			twoCrawlers: false,
			coop: false,
		};
		const axes = new Map(),
			botInput = new Map();
		const debugFlags = {
			hitboxes: false,
			grid: false,
			targets: false,
			history: false,
			graph: false,
		};
		const inputPreset = {
			...E.Input.DEFAULT,
			plant: ["Space", "KeyE", "Pad0"],
			attack: ["Mouse0"],
			dash: [],
			skill: [],
			jump: [],
		};
		const game = new E.Game({
			canvas: "screen",
			headless: options.headless,
			draw: options.headless,
			loop: !options.headless,
			id: "kcs-krazy-wrap-party",
			res: [512, 288],
			portrait: { res: [288, 440] },
			view: "overhead",
			views: ["overhead"],
			bg: "#101c30",
			input: inputPreset,
			live: true,
			fullscreen: "button",
			autoPause: true,
			camera: { zoom: false, rotate: false, wheel: false },
			menu: {
				quit: "title",
				controls: {
					plant: "Plant bait",
					attack: false,
					dash: false,
					skill: false,
					jump: false,
				},
				settings: [
					{ key: "music", value: 0.1 },
					{ key: "effects", value: 0.55 },
					{ key: "glyphs", value: "playstation" },
					{
						key: "voices",
						group: "Sound",
						label: "Garden gibberish",
						type: "slider",
						value: 0.4,
					},
				],
				items: () =>
					network
						? [["Local settings", () => game.shell.show("settings")]]
						: [
								["Developer Tools", showDev],
								["Retry garden", retryGarden],
								["Reassign controllers", () => showJoin(true)],
								...(world?.players.length > 1
									? [["Continue solo", leavePartner]]
									: []),
								...(customRun ? [["Return to workshop", returnWorkshop]] : []),
								["About / Credits", showAbout],
							],
			},
		});
		const view = root.GardenView.create(game);
		const audio = root.GardenAudio.create(game, {
			music: game.settings.music,
			sfx: game.settings.effects,
			voice: game.settings.voices,
		});
		const arcade = new E.Arcade(game, {
			id: "krazy-wrap-party",
			idle: 10,
			demo: 70,
			hud: false,
		});
		const settings = game.settings;
		const nativeMenu = game.menu.bind(game);
		game.menu = (name, opts) => {
			if (network && root.GardenNet?.ended) return false;
			if (!name && mode === "workshop") {
				workshopTools();
				return true;
			}
			if (network) {
				game.shell.show(name || "settings");
				return true;
			}
			return nativeMenu(name, opts);
		};
		game.input.names = { plant: "Plant bait" };
		game.input.touchButtons(["plant"]);
		// A floating stick is shown only while a finger is steering; no permanent control deck.
		game.input.touchSet("plant", "PLANT", false);
		const notify = (text, seconds = 3) => {
			toast = text;
			toastTime = seconds;
		};
		const blocked = () => network;
		const change = (fn) => {
			if (blocked()) {
				notify("Shared gardens are controlled by the host.");
				return false;
			}
			if (world) world.modified = true;
			fn();
			return true;
		};
		const devSpecs = [
			["playerSpeed", "Keeper speed", 2, 9, 0.1, " cells/s"],
			["crawlerSpeed", "Crawler speed", 1, 6, 0.1, " cells/s"],
			["sentrySpeed", "Sentry speed", 1, 7, 0.1, " cells/s"],
			["aggression", "Sentry aggression", 0.35, 1.5, 0.05, " ×"],
			["frightDuration", "Fright window", 1, 12, 0.25, " s"],
			["recoveryDuration", "Sentry recovery", 0.5, 7, 0.25, " s"],
			["chewDuration", "Bait chew", 0.2, 3, 0.1, " s"],
			["biteCooldown", "Bite cooldown", 0.1, 1.5, 0.05, " s"],
			["lives", "Team life cap", 1, 9, 1, " lives"],
		];
		for (const [key, label, min, max, step, unit] of devSpecs)
			settings.define({
				key: "dev_" + key,
				group: "Controls",
				label,
				type: "slider",
				min,
				max,
				step,
				unit,
				value: S.defaults[key],
				apply(g, value) {
					if (
						world &&
						!network &&
						mode !== "title" &&
						mode !== "attract" &&
						world.tuning[key] !== value
					) {
						world.tuning[key] = value;
						world.modified = true;
						if (key === "lives") world.lives = value;
					}
				},
			});
		settings.onChange = (key) => {
			if (["music", "effects", "voices", "sound", "volume"].includes(key))
				audio.apply({
					music: settings.music,
					sfx: settings.effects,
					voice: settings.voices,
					muted: !settings.sound,
				});
		};
		function useMenu(items, onPick, opts = {}) {
			menu = new E.Menu(game, items, {
				x: "center",
				y: "center",
				scale: 2,
				rows: 7,
				bg: "#142a3a",
				border: "#55857e",
				pick: "#ffe2a0",
				onPick,
				onCancel: () => title(),
				...opts,
			});
			menuAge = 0;
		}
		function cleanDevices() {
			game.allowJoin(false);
			while (game.players.length > 1) game.removePlayer(2);
			game.input.pad = "any";
			game.input.use(inputPreset);
		}
		function title() {
			if (network) return;
			if (game.shell) game.shell.hide();
			game.resume();
			game.scene.pausable = false;
			game.sceneName = "title";
			mode = "title";
			customRun = false;
			outcomeShown = false;
			idle = 0;
			attractTime = 0;
			cleanDevices();
			axes.clear();
			botInput.clear();
			arcade.wake();
			arcade.demo = false;
			for (const key of Object.keys(tourMetrics))
				tourMetrics[key] = typeof tourMetrics[key] === "boolean" ? false : 0;
			world = S.create({ seed: 1982 });
			world.demo = true;
			pointerTarget = null;
			const items = [
				...(T.loadCheckpoint(S) ? ["Continue"] : []),
				"Play",
				"Local Co-op",
				"Maze Workshop",
				"Settings",
				"About / Credits",
			];
			useMenu(items, (i, item) => {
				if (item === "Continue") startRun(1, T.loadCheckpoint(S));
				else if (item === "Play") startRun();
				else if (item === "Local Co-op") showJoin();
				else if (item === "Maze Workshop") openWorkshop();
				else if (item === "Settings") game.menu("settings");
				else showAbout();
			});
			audio.scene("title", 0);
			lastScene = "title";
		}
		function startRun(players = 1, saved = null, custom = null) {
			if (network) return;
			game.shell?.hide();
			game.resume();
			world = saved || S.create({ players, seed: 1982, custom });
			devFrozen = false;
			devStep = false;
			teleport = false;
			if (saved?.status === "clear") S.next(world);
			customRun = !!custom || !!world.custom;
			mode = "play";
			menu = null;
			outcomeShown = false;
			reportTimer = 0;
			game.scene.pausable = true;
			game.sceneName = "garden";
			pointerTarget = null;
			lastGarden = world.garden;
			if (!customRun && players === 1) T.checkpoint(S, world);
			audio.scene("garden", world.garden);
			notify(world.level.quip, 5);
			game.input.consumeAll();
		}
		function pads() {
			if (typeof navigator === "undefined") return [];
			try {
				return Array.from(navigator.getGamepads?.() || []).filter(
					(p) => p && p.connected !== false && p.mapping === "standard",
				);
			} catch (_) {
				return [];
			}
		}
		function showJoin(keep = false) {
			if (network) return;
			reassign = keep;
			mode = "join";
			game.scene.pausable = false;
			game.shell?.hide();
			game.resume();
			refreshJoin();
		}
		function refreshJoin() {
			const p = pads();
			lastPadSignature = p.map((p) => p.index).join(",");
			useMenu(
				[
					{ label: "Keyboard + pad", disabled: p.length < 1 },
					{ label: "Two controllers", disabled: p.length < 2 },
					"Refresh devices",
					...(reassign ? ["Continue solo"] : []),
					"Back",
				],
				(i, item) => {
					const label = typeof item === "string" ? item : item.label;
					if (label === "Refresh devices") {
						refreshJoin();
						return;
					}
					if (label === "Back") {
						if (reassign) {
							mode = "play";
							menu = null;
							game.scene.pausable = true;
						} else title();
						return;
					}
					if (label === "Continue solo") {
						leavePartner();
						return;
					}
					const available = pads();
					cleanDevices();
					if (label === "Keyboard + pad" && available.length) {
						game.input.pad = null;
						game.addPlayer({ pad: available[0].index });
					} else if (label === "Two controllers" && available.length > 1) {
						game.input.pad = available[0].index;
						game.addPlayer({ pad: available[1].index });
					} else {
						refreshJoin();
						return;
					}
					if (reassign && world) {
						mode = "play";
						menu = null;
						game.scene.pausable = true;
						game.input.consumeAll();
					} else startRun(2);
				},
				{
					title: "SHARE THE SNACKS",
					rows: 6,
					onCancel: () => {
						if (reassign) {
							mode = "play";
							menu = null;
							game.scene.pausable = true;
						} else title();
					},
				},
			);
		}
		function leavePartner() {
			if (network) return;
			if (world?.players.length > 1) {
				const departing = world.players[world.players.length - 1].id;
				S.removePlayer(world, departing);
				world.modified = true;
			}
			cleanDevices();
			game.shell?.hide();
			game.resume();
			mode = "play";
			menu = null;
			game.scene.pausable = true;
			notify("One keeper. Still plenty of teeth.");
		}
		function retryGarden() {
			if (network || !world) return;
			S.retry(world);
			reportTimer = 0;
			devFrozen = false;
			devStep = false;
			teleport = false;
			outcomeShown = false;
			game.shell?.hide();
			game.resume();
			mode = "play";
			menu = null;
			game.scene.pausable = true;
			pointerTarget = null;
			audio.scene("garden", world.garden);
			notify("Back to the garden gate. Score and seeds restored.");
		}
		function showDev() {
			if (network) {
				notify("Developer changes are disabled in Hub.");
				return;
			}
			for (const [key] of devSpecs)
				settings.set("dev_" + key, world.tuning[key]);
			game.shell.show("dev", {
				kicker: "Modified run • records protected",
				title: "Garden laboratory",
				text: () =>
					"Seed " +
					world.seed +
					" • tick " +
					world.tick +
					"\n" +
					(devFrozen
						? "Simulation frozen. Step advances 1/60 second."
						: "Live tuning takes effect immediately."),
				actions: [
					[
						(world.invulnerable ? "Disable" : "Enable") + " invulnerability",
						() =>
							change(() => {
								world.invulnerable = !world.invulnerable;
								showDev();
							}),
					],
					[
						devFrozen ? "Unfreeze simulation" : "Freeze simulation",
						() =>
							change(() => {
								devFrozen = !devFrozen;
								showDev();
							}),
					],
					[
						"Step one tick",
						() =>
							change(() => {
								devFrozen = true;
								devStep = true;
								game.shell.hide();
								game.resume();
							}),
					],
					[
						"Live tuning sliders",
						() =>
							game.shell.show("tuning", {
								title: "Tune the chase",
								rows: devSpecs.map((s) => "dev_" + s[0]),
								actions: [
									["Reset Defaults", resetTuning],
									["Back", () => game.shell.back()],
								],
							}),
					],
					[
						"Choose garden",
						() =>
							game.shell.show("gardens", {
								title: "Garden select",
								actions: S.levels.map((l, i) => [
									l.name,
									() =>
										change(() => {
											const tuning = world.tuning;
											world = S.create({
												garden: i,
												players: world.players.length,
												tuning,
												seed: world.seed,
											});
											world.modified = true;
											outcomeShown = false;
											reportTimer = 0;
											pointerTarget = null;
											game.shell.hide();
											mode = "play";
											game.resume();
											audio.scene("garden", i);
										}),
								]),
							}),
					],
					[
						"Reset actors",
						() =>
							change(() => {
								const old = world;
								world = S.create({
									garden: old.garden,
									players: old.players.length,
									tuning: old.tuning,
									seed: old.seed,
									custom: old.custom ? old.level : null,
								});
								world.score = old.score;
								world.modified = true;
								outcomeShown = false;
								reportTimer = 0;
								pointerTarget = null;
								game.shell.hide();
								game.resume();
							}),
					],
					[
						"Refill lives + seeds",
						() =>
							change(() => {
								world.lives = world.tuning.lives;
								world.seeds = 3;
								showDev();
							}),
					],
					[
						"Reseed garden",
						() =>
							change(() => {
								world.seed = (world.seed + 7919) >>> 0;
								world.rng = world.seed;
								showDev();
							}),
					],
					[
						"Teleport keeper",
						() =>
							change(() => {
								teleport = true;
								game.shell.hide();
								game.resume();
								notify(
									"Click a passage to teleport. Controller: move cursor, confirm.",
								);
							}),
					],
					["Debug overlays", showOverlays],
					["Inspect snapshot", showSnapshot],
					["Restart garden", retryGarden],
					["Back", () => game.shell.back()],
				],
			});
		}
		function resetTuning() {
			if (network) return;
			for (const [key] of devSpecs) settings.set("dev_" + key, S.defaults[key]);
			world.tuning = { ...S.defaults };
			world.lives = Math.min(world.lives, S.defaults.lives);
			world.modified = true;
			game.shell.show("tuning", {
				title: "Tune the chase",
				rows: devSpecs.map((s) => "dev_" + s[0]),
				actions: [
					["Reset Defaults", resetTuning],
					["Back", () => game.shell.back()],
				],
			});
		}
		function showOverlays() {
			game.shell.show("overlays", {
				title: "Read the garden",
				actions: [
					...Object.keys(debugFlags).map((key) => [
						(debugFlags[key] ? "Hide " : "Show ") + key,
						() => {
							debugFlags[key] = !debugFlags[key];
							showOverlays();
						},
					]),
					["Back", () => game.shell.back()],
				],
			});
		}
		function showSnapshot() {
			game.shell.show("snapshot", {
				title: "Authoritative snapshot",
				text: JSON.stringify(
					{
						garden: world.garden,
						seed: world.seed,
						rng: world.rng,
						tick: world.tick,
						score: world.score,
						lives: world.lives,
						seeds: world.seeds,
						tails: world.crawlers.map((c) => c.segments),
						players: world.players.map((p) => [
							p.id,
							+p.x.toFixed(2),
							+p.y.toFixed(2),
						]),
						status: world.status,
						net: network ? root.GardenNet.inspect() : "standalone",
					},
					null,
					2,
				),
				actions: [["Back", () => game.shell.back()]],
			});
		}
		function showAbout() {
			const report = root.GARDEN_REPORT;
			const info = report?.sourceInformation || {
				source: "K.C.'s Krazy Chase! (1982)",
				plan: "PLAN.md",
				tech: "my-3D2dge v0.89.1",
				usage: "added on import",
			};
			const sections = [
				[
					"The party rules",
					"Catch the glowing LAST segment from any direction. The horned head always hurts. A bite scares both sentries: catch a pale one to spin it. Trees are optional; they refill seeds. Plant nearby bait to stall a head.\nTrees 1 • bites 3 • sentries 10 • garden 20. Bite/catch chains add ×2 after 3 plays and ×3 after 6, expiring after 6 seconds.",
				],
				[
					"Controls",
					"Move: WASD / arrows or left stick / D-pad. Early turns are buffered; diagonal ties favor horizontal, with stick hysteresis. Plant: Space / ✕ (Xbox A). Click reachable floor to walk; directions cancel the route. Touch: drag a floating stick and tap PLANT with a second finger. Escape / Options pauses.",
				],
				[
					"Our interpretation",
					"Five original Venus gardens; tail-only targets, bait and simultaneous co-op are additions. Online shared-world play runs through AI Hub; standalone co-op shares this screen. No standalone online lobby.",
				],
				[
					"Source Information",
					Object.entries(info)
						.map(([k, v]) => k + ": " + v)
						.join("\n"),
				],
				[
					"Testing Feedback",
					(report?.testingFeedback || ["Testing in progress"])
						.map((v, i) => i + 1 + ". " + v)
						.join("\n"),
				],
				[
					"Engine Feedback",
					(
						report?.engineFeedback || [
							"Native pixel rendering, rigs, menus and synthesis.",
						]
					)
						.map((v, i) => i + 1 + ". " + v)
						.join("\n"),
				],
				[
					"Prompt Feedback",
					(
						report?.promptFeedback || [
							"Five gardens with integrated tools and a finite ending.",
						]
					)
						.map((v, i) => i + 1 + ". " + v)
						.join("\n"),
				],
				[
					"Credits & licenses",
					"Original design, code, pixel puppets and synthesized composition: OpenAI gpt-6.1-sol. Inspired by Ed Averett’s K.C.’s Krazy Chase!\nmy-3D2dge v0.89.1 by Michael Crosato, MIT. Engine snapshot 8ecc2f62353761187bdfe226f327b7ea5d2eb691.\nAI Hub protocol v1 / client v1.4.0, snapshot 35a1047f2067b2af3de3943f0fe452f39105d869.\n" +
						(root.GARDEN_LICENSE || ""),
				],
			];
			const showSection = (index, page = 0) => {
				const [heading, body] = sections[index],
					limit = game.screen.H > game.screen.W ? 470 : 900;
				const chunks = [];
				let current = "";
				for (const word of body.split(/\s+/)) {
					if (current.length + word.length > limit) {
						chunks.push(current);
						current = "";
					}
					current += (current ? " " : "") + word;
				}
				if (current) chunks.push(current);
				game.shell.show("aboutpage", {
					kicker: "About / Credits • " + (page + 1) + " / " + chunks.length,
					title: heading,
					text: chunks[page],
					actions: [
						...(page + 1 < chunks.length
							? [["Next page", () => showSection(index, page + 1)]]
							: []),
						...(page > 0
							? [["Previous page", () => showSection(index, page - 1)]]
							: []),
						["Back to credits", () => game.shell.back()],
					],
				});
			};
			game.shell.show("about", {
				kicker: "A very hungry homage",
				title: TITLE,
				text: "Original gardens. Original mischief.\nUsage: added on import",
				actions: [
					...sections.map(([heading], index) => [
						heading,
						() => showSection(index),
					]),
					["Back", () => game.shell.back()],
				],
			});
		}
		function openWorkshop() {
			if (network) return;
			game.shell?.hide();
			game.resume();
			mode = "workshop";
			game.scene.pausable = false;
			workshop ||= new T.Workshop(S, S.levels[0]);
			customRun = false;
			menu = null;
			refreshEditor();
			audio.scene("garden", 2);
			notify("Confirm paints. Escape opens Tools.", 5);
		}
		function refreshEditor() {
			// Editing can temporarily be invalid; the view only needs this data, not a running world.
			editorWorld = {
				level: workshop.level,
				garden: 0,
				time: game.real,
				players: [
					{
						id: 1,
						x: workshop.level.nursery[0],
						y: workshop.level.nursery[1],
						invuln: 0,
						dir: [1, 0],
					},
				],
				crawlers: workshop.level.crawlers.map((c, i) => ({
					id: i + 1,
					x: c.spawn[0],
					y: c.spawn[1],
					dir: [1, 0],
					segments: c.segments,
					body: [],
					mode: "forage",
				})),
				sentries: workshop.level.sentries.map((p, i) => ({
					id: i + 1,
					x: p[0],
					y: p[1],
					mode: "pursue",
					fright: 0,
					spin: 0,
				})),
				trees: (workshop.level.trees || []).map((p) => ({ x: p[0], y: p[1] })),
				bait: [],
				score: 0,
				lives: 3,
				seeds: 3,
				stats: {},
				combo: { mult: 1, timer: 0 },
			};
		}
		function workshopTools() {
			if (!workshop || network) return;
			game.shell.show("workshop", {
				kicker: workshop.level.name,
				title: "Maze Workshop",
				text: workshop.message,
				actions: [
					[
						"Brush: " + workshop.brushes[workshop.brush],
						() =>
							game.shell.show("brushes", {
								title: "Choose your mischief",
								actions: workshop.brushes.map((b, i) => [
									b,
									() => {
										workshop.brush = i;
										game.shell.hide();
										notify(b + " brush selected.");
									},
								]),
							}),
					],
					["Paint the garden", () => game.shell.hide()],
					[
						"Undo",
						() => {
							workshop.undo();
							refreshEditor();
							workshopTools();
						},
					],
					[
						"Redo",
						() => {
							workshop.redo();
							refreshEditor();
							workshopTools();
						},
					],
					[
						"Validate",
						() => {
							workshop.validate();
							workshopTools();
						},
					],
					[
						"Playtest",
						() => {
							if (!workshop.validate().length)
								startRun(1, null, T.copy(workshop.level));
							else workshopTools();
						},
					],
					[
						"Theme",
						() => {
							workshop.remember();
							const n = ((workshop.level.theme || 0) + 1) % S.levels.length;
							workshop.level.theme = n;
							workshop.level.palette = T.copy(S.levels[n].palette);
							refreshEditor();
							workshop.message = "Palette: " + S.levels[n].name;
							workshopTools();
						},
					],
					[
						"Crawler length: " + workshop.level.crawlers[0].segments,
						() => {
							workshop.remember();
							workshop.level.crawlers[0].segments =
								(workshop.level.crawlers[0].segments % 10) + 1;
							refreshEditor();
							workshopTools();
						},
					],
					...(workshop.level.crawlers.length > 1
						? [
								[
									"Remove second crawler",
									() => {
										workshop.remember();
										workshop.level.crawlers.pop();
										refreshEditor();
										workshopTools();
									},
								],
							]
						: []),
					["Save / Load", showWorkshopSlots],
					["Export JSON", exportWorkshop],
					["Import JSON", importWorkshop],
					[
						"Start from garden",
						() =>
							game.shell.show("templates", {
								title: "Garden templates",
								actions: S.levels.slice(0, unlocked()).map((l, i) => [
									l.name,
									() => {
										workshop.reset(S.levels[i]);
										refreshEditor();
										game.shell.hide();
									},
								]),
							}),
					],
					[
						"Reset template",
						() => {
							workshop.reset();
							refreshEditor();
							workshopTools();
						},
					],
					["Return to title", title],
				],
			});
		}
		function showWorkshopSlots() {
			game.shell.show("slots", {
				title: "Local creations",
				text: "Three named garden slots. Export keeps a portable copy.",
				actions: [
					...[0, 1, 2].flatMap((i) => {
						const saved = T.storage.get("garden:" + i);
						return [
							[
								"Save garden " + (i + 1),
								() => {
									workshop.level.name = "Wrap Garden " + (i + 1);
									workshop.save(i);
									refreshEditor();
									showWorkshopSlots();
								},
							],
							{
								label: "Load " + (saved?.name || "empty slot " + (i + 1)),
								disabled: !saved,
								fn: () => {
									workshop.load(i);
									refreshEditor();
									game.shell.hide();
								},
							},
						];
					}),
					["Back", () => game.shell.back()],
				],
			});
		}
		function exportWorkshop() {
			if (network || !workshop) return;
			if (workshop.validate().length) {
				workshopTools();
				return;
			}
			if (typeof document !== "undefined") {
				const a = document.createElement("a"),
					url = URL.createObjectURL(
						new Blob([workshop.export()], { type: "application/json" }),
					);
				a.href = url;
				a.download = "wrap-party-garden.json";
				a.click();
				setTimeout(() => URL.revokeObjectURL(url), 1000);
			}
			workshop.message = "Garden JSON exported.";
			workshopTools();
		}
		function importWorkshop() {
			if (network || typeof document === "undefined") return;
			const input = document.createElement("input");
			input.type = "file";
			input.accept = ".json,application/json";
			input.onchange = async () => {
				if (!input.files[0]) return;
				workshop.import(await input.files[0].text());
				refreshEditor();
				workshopTools();
			};
			input.click();
		}
		function returnWorkshop() {
			if (network) return;
			customRun = false;
			openWorkshop();
		}
		function unlocked() {
			const n = T.storage.get("unlocked", 1);
			return Number.isInteger(n) ? Math.max(1, Math.min(5, n)) : 1;
		}
		function report() {
			outcomeShown = true;
			mode = "report";
			game.scene.pausable = false;
			const final = world.garden >= 4 || customRun;
			const items = [
				final ? "Finish the party" : "Next garden",
				...(customRun ? ["Return to workshop"] : []),
				"Retry garden",
				"Title",
			];
			useMenu(
				items,
				(i, item) => {
					if (item === "Next garden" || item === "Finish the party") {
						S.next(world);
						outcomeShown = false;
						if (world.status === "victory") victory();
						else {
							mode = "play";
							menu = null;
							game.scene.pausable = true;
							audio.scene("garden", world.garden);
							notify(world.level.quip, 5);
							if (world.players.length === 1) T.checkpoint(S, world);
						}
					} else if (item === "Return to workshop") returnWorkshop();
					else if (item === "Retry garden") retryGarden();
					else title();
				},
				{ y: game.screen.H / 2 + 10, title: "GARDEN GOBBLED!", rows: 4 },
			);
			if (!world.modified && !customRun) {
				T.storage.set(
					"unlocked",
					Math.max(unlocked(), Math.min(5, world.garden + 2)),
				);
				if (world.players.length === 1) T.checkpoint(S, world);
			}
		}
		function defeat() {
			mode = "defeat";
			outcomeShown = true;
			game.scene.pausable = false;
			useMenu(
				[
					"Retry garden",
					"New Run",
					...(customRun ? ["Return to workshop"] : []),
					"Title",
				],
				(i, item) => {
					if (item === "Retry garden") retryGarden();
					else if (item === "New Run") startRun(world.players.length);
					else if (item === "Return to workshop") returnWorkshop();
					else title();
				},
				{ title: "THE GARDEN BITES BACK", y: game.screen.H / 2 + 8 },
			);
		}
		function victory() {
			mode = "victory";
			outcomeShown = true;
			game.scene.pausable = false;
			audio.scene("victory", world.garden);
			if (!world.modified && !customRun) {
				T.storage.remove("checkpoint");
				T.storage.set("unlocked", 5);
				const category = world.players.length > 1 ? "coop" : "solo";
				if (arcade.qualifies(world.score, category)) {
					arcade.demo = false;
					arcade.enter(world.score, category, () => victoryMenu());
					return;
				}
			}
			victoryMenu();
		}
		function victoryMenu() {
			useMenu(
				[
					...(customRun ? ["Return to workshop"] : ["Replay a garden"]),
					"New Run",
					"Maze Workshop",
					"Title",
				],
				(i, item) => {
					if (item === "Replay a garden")
						game.shell.show("replay", {
							title: "Encore gardens",
							actions: S.levels.slice(0, unlocked()).map((l, i) => [
								l.name,
								() => {
									const s = S.create({
										garden: i,
										players: world.players.length,
										seed: 1982,
									});
									s.modified = true;
									startRun(world.players.length, s);
								},
							]),
						});
					else if (item === "Return to workshop") returnWorkshop();
					else if (item === "New Run") startRun(world.players.length);
					else if (item === "Maze Workshop") openWorkshop();
					else title();
				},
				{ y: game.screen.H / 2 + 22, rows: 4 },
			);
		}
		function inputCommand(I, id) {
			const m = I.move();
			let dir = null;
			if (Math.hypot(m[0], m[1]) > 0.24) {
				let axis =
					I.lastDevice === "gamepad" || I.lastDevice === "touch"
						? axes.get(id) || 0
						: Math.abs(m[0]) >= Math.abs(m[1])
							? 0
							: 1;
				if (Math.abs(m[0]) > Math.abs(m[1]) + 0.13) axis = 0;
				else if (Math.abs(m[1]) > Math.abs(m[0]) + 0.13) axis = 1;
				axes.set(id, axis);
				dir = axis === 0 ? [Math.sign(m[0]), 0] : [0, Math.sign(m[1])];
				if (!dir[0] && !dir[1]) dir = null;
			}
			return { dir, plant: I.pressed("plant") };
		}
		function attract(dt) {
			attractTime += dt;
			const beat = Math.floor(attractTime / 12) % 6;
			if (beat !== attractBeat) {
				attractBeat = beat;
				const gardens = [0, 1, 2, 3, 4, 4];
				world = S.create({
					garden: gardens[beat],
					players: beat >= 4 ? 2 : 1,
					seed: 1982 + beat,
				});
				world.demo = true;
				world.invulnerable = true;
				world.seeds = 3;
				audio.scene("garden", world.garden);
				tourCatch = false;
				tourMetrics.twoCrawlers ||= world.crawlers.length === 2;
				tourMetrics.coop ||= world.players.length === 2;
				if (beat === 0)
					placeTourActor(world.players[0], world.crawlers[0].tail);
				if (beat === 1)
					placeTourActor(world.players[0], {
						x: world.level.wraps[0].a[0],
						y: world.level.wraps[0].a[1],
					});
			}
			const commands = {};
			for (const p of world.players) commands[p.id] = S.bot(world, p.id);
			const local = attractTime % 12;
			if (attractBeat === 0 && local < 0.08) commands[1] = {};
			if (attractBeat === 0 && local > 1.2 && !tourCatch) {
				const sentry = world.sentries.find((a) => a.mode === "frightened");
				if (sentry) {
					placeTourActor(world.players[0], sentry);
					commands[1] = {};
					tourCatch = true;
				}
			}
			if (attractBeat === 1 && local < 0.45) commands[1] = { dir: [-1, 0] };
			if (attractBeat === 2 && local < 0.3) commands[1] = { plant: true };
			S.step(world, commands, dt);
			present(world.events);
			if (world.status === "clear") {
				world.status = "playing";
				for (const c of world.crawlers) c.segments = c.totalSegments;
			}
		}
		function placeTourActor(actor, point) {
			if (!point) return;
			actor.x = point.x;
			actor.y = point.y;
			actor.dir = [0, 0];
			actor.m = {
				cell: [Math.round(point.x), Math.round(point.y)],
				edge: null,
				u: 0,
				queued: null,
			};
		}
		function pointerCommand(cmd, player) {
			if (!player || !world) return cmd;
			const click = game.input.clicked();
			if (click) {
				const cell = view.pointerToCell(world, ...click);
				if (cell && S.graph(world.level).floor(...cell)) {
					const preview = S.plantCell(world, player);
					if (preview && cell[0] === preview[0] && cell[1] === preview[1]) {
						cmd.plant = true;
						cmd.plantTarget = cell;
					} else pointerTarget = cell;
				}
			}
			if (cmd.dir) pointerTarget = null;
			if (pointerTarget) cmd.target = pointerTarget;
			return cmd;
		}
		function contextTouch(player) {
			const I = game.input;
			I.touchSet(
				"plant",
				"PLANT",
				mode === "play" &&
					!game.shell?.screen &&
					!!player &&
					world.seeds > 0 &&
					!!S.plantCell(world, player) &&
					!world.bait.some((b) => b.owner === player.id),
			);
			if (I._stickEl) {
				I._stickEl.style.opacity = "0";
				I._knobEl.style.opacity = "0";
			}
		}
		function present(events) {
			view.event(events || [], world);
			audio.events(events || [], world);
			for (const e of events || []) {
				if (mode === "attract") {
					const key = {
						bite: "bites",
						catch: "catches",
						wrap: "wraps",
						plant: "plants",
					}[e.type];
					if (key) tourMetrics[key]++;
				}
				if (e.type === "bite")
					notify("CHOMP! Pale sentries are catchable.", 2.5);
				else if (e.type === "warning")
					notify("HEAD HUNT! Horns up. Find the fruit.", 2.4);
				else if (e.type === "hit")
					notify("Ouch! Nursery nap. Watch for the halo.", 2);
				else if (e.type === "invalid")
					notify("No seed spent. One sprout per keeper.", 1.6);
			}
		}
		function update(dt) {
			menuAge += dt;
			toastTime = Math.max(0, toastTime - dt);
			const I = game.input;
			if (network) {
				const net = root.GardenNet;
				if (net.ended) {
					I.touchSet("plant", "PLANT", false);
					return;
				}
				if (I.pressed("pause") && !game.shell?.screen) {
					game.menu("settings");
					I.consumeAll();
				}
				const localPlayer = world?.players.find((p) => p.id === net.localId);
				const cmd =
					net.localId !== null && !game.shell?.screen
						? pointerCommand(inputCommand(I, net.localId), localPlayer)
						: { dir: null, plant: false };
				net.update(dt, cmd);
				if (net.state) world = net.state;
				displayWorld = net.visual?.(dt) || world;
				if (displayWorld) {
					view.update(dt, displayWorld);
					view.prepare(displayWorld);
				}
				contextTouch(localPlayer);
				return;
			}
			if (physical) {
				physical = false;
				idle = 0;
				arcade.wake();
				if (mode === "attract") {
					title();
					I.clear();
					wakeConsumed = true;
					return;
				}
			}
			if (wakeConsumed) {
				wakeConsumed = false;
				I.consumeAll();
				return;
			}
			if (game.paused !== lastPause) {
				audio.pause(game.paused);
				lastPause = game.paused;
			}
			if (game.shell?.screen) return;
			if (I.anyPressed() || I.clicked()) {
				idle = 0;
				arcade.wake();
				if (mode === "attract") {
					title();
					I.clear();
					wakeConsumed = true;
					return;
				}
			}
			if (mode === "title") {
				const phase = arcade.attract(dt);
				idle = arcade._idle;
				if (phase === "demo") {
					mode = "attract";
					arcade.demo = true;
					attractTime = 0;
					attractBeat = -1;
					menu = null;
				}
			}
			if (mode === "attract") attract(dt);
			else if (mode === "title" || mode === "join") {
				if (
					mode === "join" &&
					pads()
						.map((p) => p.index)
						.join(",") !== lastPadSignature
				)
					refreshJoin();
				menuLayout();
				menu?.update(dt);
			} else if (mode === "workshop") updateWorkshop(dt);
			else if (mode === "play" && !game.paused) {
				if (teleport) updateTeleport();
				else if (!devFrozen || devStep) {
					const commands = {};
					for (let i = 0; i < world.players.length; i++) {
						const p = world.players[i],
							inp = game.players[i] || I;
						commands[p.id] = botInput.has(p.id)
							? S.bot(world, p.id, botInput.get(p.id))
							: inputCommand(inp, p.id);
					}
					const cmd = commands[world.players[0]?.id];
					const hero = world.players[0];
					if (cmd) pointerCommand(cmd, hero);
					S.step(world, commands, devStep ? 1 / 60 : dt);
					devStep = false;
					present(world.events);
					if (world.status === "clear" && !outcomeShown) {
						reportTimer = 0.7;
						outcomeShown = true;
					}
					if (world.status === "defeat" && !outcomeShown) defeat();
				}
				if (reportTimer > 0 && (reportTimer -= dt) <= 0) report();
			} else if (mode === "report" || mode === "defeat" || mode === "victory") {
				if (arcade.entry) arcade.update(dt);
				else {
					menuLayout();
					menu?.update(dt);
				}
			}
			const shown = mode === "workshop" ? editorWorld : world;
			if (shown) {
				if (mode === "workshop") shown.time = game.real;
				view.update(dt, shown);
				view.prepare(shown);
			}
			const player = world?.players[0];
			contextTouch(player);
			lastTouch = I.lastDevice === "touch";
		}
		function updateTeleport() {
			const I = game.input;
			const cursor = (game.debug._cursor ||= [
				Math.round(world.players[0].x),
				Math.round(world.players[0].y),
			]);
			for (const [name, d] of [
				["up", [0, -1]],
				["down", [0, 1]],
				["left", [-1, 0]],
				["right", [1, 0]],
			])
				if (I.repeat(name)) {
					cursor[0] = Math.max(
						0,
						Math.min(world.level.w - 1, cursor[0] + d[0]),
					);
					cursor[1] = Math.max(
						0,
						Math.min(world.level.h - 1, cursor[1] + d[1]),
					);
				}
			const click = I.clicked(),
				cell = click
					? view.pointerToCell(world, ...click)
					: I.pressed("confirm")
						? cursor
						: null;
			if (cell && S.graph(world.level).floor(...cell)) {
				const p = world.players[0];
				p.x = cell[0];
				p.y = cell[1];
				p.m = { cell: cell.slice(), edge: null, u: 0, queued: null };
				p.invuln = 2;
				teleport = false;
			}
			if (I.pressed("cancel")) teleport = false;
		}
		function updateWorkshop() {
			const I = game.input;
			for (const [name, d] of [
				["up", [0, -1]],
				["down", [0, 1]],
				["left", [-1, 0]],
				["right", [1, 0]],
			])
				if (I.repeat(name, 0.25, 0.1)) workshop.move(...d);
			const click = I.clicked(),
				cell = click && view.pointerToCell(editorWorld, ...click);
			if (cell) pendingPaint.push(cell);
			if (I.pressed("confirm")) pendingPaint.push(workshop.cursor.slice());
			for (const at of pendingPaint.splice(0)) workshop.paint(at);
			refreshEditor();
			if (I.pressed("cancel") || I.pressed("pause")) {
				I.consumeAll();
				workshopTools();
			}
		}
		function menuLayout() {
			if (!menu) return;
			const portrait = game.screen.H > game.screen.W;
			if (mode === "title") {
				menu.scale = 2;
				menu.x = portrait ? "center" : 304;
				menu.y = portrait ? 226 : 108;
				menu.rows = 6;
				menu.box = false;
			} else if (mode === "join") {
				menu.x = "center";
				menu.y = portrait ? 170 : 108;
			} else {
				menu.x = "center";
				menu.y = game.screen.H / 2 + 20;
			}
			if (mode !== "title") {
				const box = menu._layout();
				menu.y = Math.max(72, Math.min(menu.y, game.screen.H - box.h - 10));
			}
		}
		function text(r, str, x, y, color = "#fff0c5", opts = {}) {
			r.text(str, x, y, color, { outline: false, shadow: "#0a1524", ...opts });
		}
		function draw(r) {
			const shown = network
				? displayWorld || world
				: mode === "workshop"
					? editorWorld
					: world;
			if (!shown) {
				r.sky(["#122c3b", "#142537"]);
				text(
					r,
					network ? "GROWING A SHARED GARDEN..." : "GROWING THE GARDEN...",
					r.W / 2,
					r.H / 2,
					"#ffe1a3",
					{ align: "center" },
				);
				return;
			}
			view.draw(r, shown, {
				hud: !["title", "join", "workshop"].includes(mode),
				attract: mode === "attract",
				debug: debugFlags,
				preview:
					mode === "play" && shown.players[0]
						? S.plantCell(shown, shown.players[0])
						: null,
			});
			if (mode === "title" || mode === "join") drawTitle(r);
			else if (mode === "workshop") drawWorkshop(r);
			else if (mode === "attract") {
				const captions = [
					"CHOMP THE GLOWING TAIL",
					"MATCH THE WRAP MARKS",
					"PLANT LUNCH. STEAL TAIL.",
					"TWO HEADS. DOUBLE TROUBLE.",
					"SHARE SEEDS. SHARE THE CHASE.",
					"FIVE GARDENS. ONE BIG PARTY.",
				];
				r.overlay((g) => E.px.rect(g, 0, r.H - 43, r.W, 43, "#122536"));
				text(
					r,
					captions[attractBeat] || "KRAZY WRAP PARTY",
					r.W / 2,
					r.H - 37,
					"#ffe3a0",
					{ align: "center", scale: r.W > 400 ? 2 : 1 },
				);
				text(
					r,
					"ATTRACT TOUR • Any input returns to title",
					r.W / 2,
					r.H - 14,
					"#a3c8c8",
					{ align: "center" },
				);
			} else if (mode === "report" || mode === "defeat" || mode === "victory")
				drawOutcome(r);
			if (mode === "play") {
				if (world.modified)
					text(r, "MODIFIED • RECORDS OFF", 8, r.H - 12, "#e6b789", {
						font: "tiny",
					});
				if (devFrozen)
					text(r, "FROZEN • PAUSE > DEV TOOLS", r.W / 2, r.H - 23, "#ffce8a", {
						align: "center",
					});
				if (teleport) cursorOverlay(r, game.debug._cursor || [1, 1], "#ff9ac0");
			}
			if (
				toastTime > 0 &&
				!["title", "join", "workshop", "report", "victory", "defeat"].includes(
					mode,
				)
			) {
				r.overlay((g) => {
					E.px.rect(g, 4, r.H - 32, r.W - 8, 16, "#112c3b");
				});
				const short = E.font.wrap(toast, r.W - 20)[0];
				text(r, short, r.W / 2, r.H - 28, "#ffe5ac", { align: "center" });
			}
			if (network && root.GardenNet.ended)
				text(
					r,
					"PARTY ENDED • RESULTS IN AI HUB",
					r.W / 2,
					r.H / 2,
					"#ffe5ac",
					{ align: "center", scale: r.W > 400 ? 2 : 1 },
				);
		}
		function drawTitle(r) {
			const portrait = r.H > r.W;
			r.overlay((g) => {
				E.px.blend(g, 0.84, "normal", () =>
					E.px.rect(g, 0, 0, r.W, r.H, "#102333"),
				);
				for (let i = 0; i < 44; i++) {
					const x = (i * 127 + 13) % r.W,
						y = (i * 73 + 21) % r.H;
					E.px.dot(
						g,
						x,
						y + Math.sin(game.real + i) * 2,
						i % 3 ? "#39636c" : "#a9a77c",
					);
				}
				const x = portrait ? r.W / 2 : 30,
					align = portrait ? "center" : "left";
				if (mode === "join") {
					E.font.title(g, "SHARE THE SNACKS", r.W / 2, portrait ? 63 : 29, {
						align: "center",
						scale: 2,
						colors: ["#fff0bc", "#ffd275", "#db8c58"],
						depth: 2,
					});
					return;
				}
				E.font.text(g, "K.C.'s KRAZY", x, portrait ? 33 : 27, "#87cebc", {
					align,
					scale: 2,
					outline: false,
				});
				E.font.title(g, "WRAP", x, portrait ? 59 : 51, {
					align,
					scale: 4,
					colors: ["#fff0bc", "#ffd275", "#db8c58"],
					depth: 3,
					depthColor: "#6b3c4a",
				});
				E.font.title(g, "PARTY", x, portrait ? 94 : 88, {
					align,
					scale: 4,
					colors: ["#fff0bc", "#ffd275", "#db8c58"],
					depth: 3,
					depthColor: "#6b3c4a",
				});
			});
			if (mode === "join") {
				text(
					r,
					"Each controller belongs to one keeper.",
					r.W / 2,
					portrait ? 110 : 65,
					"#a7c9c6",
					{ align: "center" },
				);
			} else {
				text(
					r,
					"A VERY HUNGRY GARDEN CAPER",
					portrait ? r.W / 2 : 30,
					portrait ? 138 : 135,
					"#b2c8bf",
					{ align: portrait ? "center" : "left" },
				);
				view.drawMascot?.(
					r,
					portrait ? 93 : 87,
					portrait ? 190 : 215,
					portrait ? 2.5 : 4,
					"hero",
					game.real,
				);
				view.drawMascot?.(
					r,
					portrait ? 195 : 216,
					portrait ? 190 : 218,
					portrait ? 2.5 : 3,
					"head",
					game.real,
				);
				text(
					r,
					"Nibble the tail. Mind the teeth.",
					portrait ? r.W / 2 : 30,
					portrait ? 211 : 251,
					"#ffdc94",
					{ align: portrait ? "center" : "left" },
				);
			}
			menuLayout();
			menu?.draw(r);
			if (mode === "title") {
				const solo = arcade.table("solo")[0],
					coop = arcade.table("coop")[0];
				const label = (name, item) =>
					name + " " + (item ? item.score + " " + item.name : "—");
				if (portrait)
					text(
						r,
						label("SOLO", solo) + " • " + label("CO-OP", coop),
						r.W / 2,
						r.H - 31,
						"#9bbeb4",
						{ align: "center", font: "tiny" },
					);
				else {
					text(r, label("BEST SOLO", solo), 315, 78, "#a7c9b8");
					text(r, label("BEST CO-OP", coop), 315, 91, "#9cb7b8");
				}
			}
			text(
				r,
				"5 gardens  •  1–2 keepers  •  Venus, probably",
				r.W / 2,
				r.H - 13,
				"#6d9a9f",
				{ align: "center", font: "tiny" },
			);
		}
		function cursorOverlay(r, cursor, color) {
			const layout = view.layout(mode === "workshop" ? editorWorld : world),
				c = layout.cell;
			const x = layout.x + cursor[0] * c,
				y = layout.y + cursor[1] * c;
			r.overlay((g) => {
				E.px.line(g, x, y, x + c - 1, y, color, 2);
				E.px.line(g, x, y, x, y + c - 1, color, 2);
				E.px.line(g, x + c - 1, y, x + c - 1, y + c - 1, color, 2);
				E.px.line(g, x, y + c - 1, x + c - 1, y + c - 1, color, 2);
			});
		}
		function drawWorkshop(r) {
			r.overlay((g) => E.px.rect(g, 0, 0, r.W, 36, "#102633"));
			text(r, "MAZE WORKSHOP", 10, 7, "#ffdda2", { scale: 2 });
			text(
				r,
				workshop.brushes[workshop.brush] + " • " + workshop.cursor.join(", "),
				10,
				26,
				"#afd3ca",
			);
			cursorOverlay(
				r,
				workshop.cursor,
				workshop.errors.length ? "#ff9b9b" : "#fff0a8",
			);
			text(
				r,
				"Confirm: paint   Esc / Options: Tools",
				r.W / 2,
				r.H - 22,
				"#f2dba4",
				{ align: "center" },
			);
			text(
				r,
				E.font.wrap(workshop.message, r.W - 16)[0],
				r.W / 2,
				r.H - 11,
				"#9cbbb4",
				{ align: "center", font: "tiny" },
			);
		}
		function drawOutcome(r) {
			const portrait = r.H > r.W;
			r.overlay((g) =>
				E.px.blend(g, 0.9, "normal", () =>
					E.px.rect(g, 0, 0, r.W, r.H, "#122636"),
				),
			);
			const headline =
				mode === "victory"
					? customRun
						? "CUSTOM GARDEN CLEARED!"
						: "VENUS IS SERVED!"
					: mode === "defeat"
						? "OH, CRUMBS."
						: world.level.name;
			text(r, headline, r.W / 2, portrait ? 48 : 30, "#ffe1a0", {
				align: "center",
				scale: portrait ? 1 : 2,
			});
			const y = portrait ? 78 : 59;
			text(r, "SCORE " + world.score, r.W / 2, y, "#faf1cd", {
				align: "center",
				scale: 2,
			});
			text(
				r,
				`${world.stats.bites} bites  •  ${world.stats.catches} catches  •  ${Math.floor(world.time / 60)}m ${Math.floor(world.time % 60)}s`,
				r.W / 2,
				y + 24,
				"#b6d5cb",
				{ align: "center" },
			);
			if (mode === "victory") {
				text(
					r,
					customRun
						? "Your mischief passed the taste test."
						: "Five gardens saved. Table manners still missing.",
					r.W / 2,
					y + 40,
					"#c4cda9",
					{ align: "center", font: portrait ? "tiny" : undefined },
				);
				for (let i = 0; i < 45; i++) {
					const x = (i * 61 + game.real * (10 + (i % 7))) % r.W,
						yy = (i * 31 + game.real * 19) % r.H;
					r.overlay((g) =>
						E.px.rect(g, x, yy, 2, 2, ["#ffc674", "#89d3bc", "#db98bc"][i % 3]),
					);
				}
			}
			if (arcade.entry) arcade.draw(r);
			else {
				menuLayout();
				menu?.draw(r);
			}
			if (world.modified)
				text(
					r,
					"Modified garden • normal records protected",
					r.W / 2,
					r.H - 14,
					"#b4a9a7",
					{ align: "center" },
				);
		}
		const scene = {
			pausable: false,
			camera: { zoom: false, rotate: false, wheel: false },
			update,
			draw,
		};
		game.start({
			scene: "garden",
			scenes: {
				garden: scene,
				title: { enter: title, update, draw, pausable: false },
			},
		});
		game.debug = {
			snapshot: () => ({
				title: TITLE,
				mode,
				scene: game.sceneName,
				paused: game.paused,
				garden: world?.garden,
				status: world?.status,
				score: world?.score,
				lives: world?.lives,
				seeds: world?.seeds,
				tails: world?.crawlers?.map((c) => c.segments),
				players: world?.players?.map((p) => ({
					id: p.id,
					x: p.x,
					y: p.y,
					invuln: p.invuln,
				})),
				tick: world?.tick,
				time: world?.time,
				tuning: world?.tuning,
				modified: world?.modified,
				custom: customRun,
				attract: { ...tourMetrics },
				workshop: workshop
					? {
							cursor: workshop.cursor,
							brush: workshop.brush,
							message: workshop.message,
							undo: workshop.undoStack.length,
						}
					: null,
				menu: menu
					? {
							items: menu.items.map((i) =>
								typeof i === "string" ? i : i.label,
							),
							i: menu.i,
							rows: menu.items.map((_, i) => menu.rowAt(i)),
						}
					: null,
				shell: game.shell?.screen,
				net: network ? root.GardenNet.inspect() : null,
				audio: audio.debug(),
				errors: game.errors,
			}),
			start: (players = 1) => {
				if (!network) startRun(players);
			},
			bot: (enabled = true, id = 1, opts = {}) => {
				if (!network) {
					if (enabled) botInput.set(id, opts);
					else botInput.delete(id);
				}
			},
			state: () => S.snapshot(world),
			restore: (data) => {
				if (!network) {
					world = S.restore(data);
					reportTimer = 0;
					world.modified = true;
					mode = "play";
					outcomeShown = false;
					menu = null;
				}
			},
			workshop: () => {
				if (!network) openWorkshop();
			},
			tools: () => {
				if (!network) workshopTools();
			},
			about: showAbout,
			dev: () => {
				if (!network) {
					game.pause();
					showDev();
				}
			},
			title,
			view: () => view.layout(mode === "workshop" ? editorWorld : world),
			workshopData: () => (workshop ? workshop.export() : null),
			workshopCommand: (name, ...args) => {
				if (
					!network &&
					workshop &&
					[
						"paint",
						"undo",
						"redo",
						"save",
						"load",
						"validate",
						"import",
					].includes(name)
				) {
					const result = workshop[name](...args);
					refreshEditor();
					return result;
				}
			},
			physical: () => {
				physical = true;
			},
		};
		const app = {
			game,
			audio,
			view,
			arcade,
			get world() {
				return world;
			},
			get mode() {
				return mode;
			},
			title,
			startRun,
			showAbout,
			debug: game.debug,
		};
		title();
		if (typeof window !== "undefined" && !options.headless) {
			const wake = (e) => {
				if (network && root.GardenNet?.ended) return;
				if (e.type === "pointermove" && e.movementX === 0 && e.movementY === 0)
					return;
				physical = true;
				if (mode === "attract") {
					e.preventDefault();
					e.stopImmediatePropagation();
					title();
					game.input.clear();
					wakeConsumed = true;
				}
				if (e.type !== "pointermove") audio.unlock();
			};
			for (const name of [
				"keydown",
				"pointerdown",
				"pointermove",
				"touchstart",
			])
				window.addEventListener(name, wake, { capture: true, passive: false });
			window.addEventListener("keydown", (e) => {
				if (arcade.entry && !network && /^[a-z0-9]$/i.test(e.key)) {
					const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! ";
					arcade.entry.name[arcade.entry.i] = alphabet.indexOf(
						e.key.toUpperCase(),
					);
					arcade.entry.i = Math.min(2, arcade.entry.i + 1);
					e.preventDefault();
				}
			});
			game.screen.listeners.push(() => menuLayout());
			game.screen.canvas.addEventListener("pointermove", (e) => {
				if (
					mode !== "workshop" ||
					e.pointerType !== "mouse" ||
					!(e.buttons & 1) ||
					game.shell?.screen
				)
					return;
				const rc = game.screen.canvas.getBoundingClientRect(),
					scr = game.screen;
				const x = ((e.clientX - rc.left) * scr.dpr - scr.OX) / scr.S,
					y = ((e.clientY - rc.top) * scr.dpr - scr.OY) / scr.S;
				const cell = view.pointerToCell(editorWorld, x, y);
				if (
					cell &&
					!pendingPaint.some((p) => p[0] === cell[0] && p[1] === cell[1])
				)
					pendingPaint.push(cell);
			});
			let padWake = "";
			const poll = () => {
				if (network && root.GardenNet?.ended) return;
				const list = pads(),
					signature = list
						.map(
							(p) =>
								p.buttons.map((b) => (b.pressed ? 1 : 0)).join("") +
								p.axes
									.map((a) => (Math.abs(a) > 0.3 ? Math.sign(a) : 0))
									.join(","),
						)
						.join("|");
				if (
					signature !== padWake &&
					list.some(
						(p) =>
							p.buttons.some((b) => b.pressed) ||
							p.axes.some((a) => Math.abs(a) > 0.3),
					)
				) {
					physical = true;
					if (mode === "attract") {
						title();
						game.input.clear();
						wakeConsumed = true;
					}
					audio.unlock();
				}
				padWake = signature;
			};
			// Poll through the owned game clock, so game.dispose removes the timer with it.
			game.every(0.05, poll, { keep: true });
			if (root.GardenNet)
				root.GardenNet.init({
					onSession() {
						network = true;
						mode = "play";
						menu = null;
						customRun = false;
						game.shell?.hide();
						game.o.autoPause = false;
						game.o.live = true;
						game.live = true;
						game.scene.pausable = false;
						game.o.menu.quit = false;
						game.o.fullscreen = false;
						game.allowJoin(false);
						world = root.GardenNet.state;
						audio.stop();
					},
					onState(s) {
						world = s;
						if (world.garden !== lastGarden) {
							lastGarden = world.garden;
							pointerTarget = null;
							audio.scene("garden", world.garden);
						}
						present(world.events);
					},
					onStart() {
						mode = "play";
						audio.scene("garden", world?.garden || 0);
					},
					onEnd() {
						audio.stop();
						game.input.clear();
						game.shell?.hide();
						mode = "play";
					},
				}).catch((err) => {
					game.fail("Hub connection", err);
				});
			root.__garden = app;
		}
		return app;
	}
	root.GardenMain = { create };
	if (typeof document !== "undefined") create();
	if (typeof module !== "undefined") module.exports = { create };
})(globalThis);
