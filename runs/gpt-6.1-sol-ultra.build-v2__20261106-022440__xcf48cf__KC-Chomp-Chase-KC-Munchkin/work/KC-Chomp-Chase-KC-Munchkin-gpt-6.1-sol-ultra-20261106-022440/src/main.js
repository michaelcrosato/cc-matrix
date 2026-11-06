/* GAME START — Original K.C. Chomp Chase, built on the native arcade maze foundation. */
(() => {
	const E = My3D2dge,
		release = ChompRelease;
	const MAP = {
		up: ["KeyW", "ArrowUp", "Pad12"],
		right: ["KeyD", "ArrowRight", "Pad15"],
		down: ["KeyS", "ArrowDown", "Pad13"],
		left: ["KeyA", "ArrowLeft", "Pad14"],
		chirp: ["Space", "Pad0"],
		confirm: ["Enter", "Space", "Pad0"],
		cancel: ["Escape", "Pad1"],
		pause: ["Escape", "KeyP", "Pad9"],
		start: ["Enter", "Pad9"],
		toolNext: ["KeyE", "Pad5"],
		toolPrev: ["KeyQ", "Pad4"],
	};
	const settings = [
		{ key: "music", value: 0.1 },
		{ key: "glyphs", value: "playstation" },
		{
			key: "voice",
			label: "Gibberish voices",
			type: "slider",
			value: 0.7,
			group: "Sound",
			apply: (g, v) => {
				g.audio.voiceVolume = v;
				g.audio.applyVolume();
			},
		},
		{
			key: "autoChirp",
			label: "Touch auto-reveal",
			type: "toggle",
			value: true,
			group: "Game",
		},
		{
			key: "touchSense",
			label: "Touch sensitivity",
			type: "slider",
			min: 0.5,
			max: 2,
			step: 0.1,
			value: 1,
			group: "Game",
			apply: (g, v) => {
				g.input.stickRadius = 44 / v;
			},
		},
	];
	const game = new E.Game({
		id: "kc-chomp-chase-v1",
		canvas: "screen",
		res: [576, 450],
		expand: true,
		view: "overhead",
		input: MAP,
		bg: "#080914",
		autoPause: true,
		live: false,
		fullscreen: false,
		corner: false,
		menu: { quit: false, settings },
	});
	const ui = new E.Shell(game, {
		tv: true,
		theme: {
			accent: "#ffd578",
			ink: "#fff0d2",
			muted: "#b1abc9",
			paper: "#17172dee",
			line: "#726080",
			titleFont: "Trebuchet MS, sans-serif",
		},
		screens: {
			pause: {
				kicker: "TAKE A BREATHER",
				title: "Chew on that.",
				text: () =>
					app.net
						? "The shared maze keeps moving. Your controls are neutral while this menu is open."
						: "The snacks can wait a moment.",
				actions: () => [
					["Sound & comfort", () => app.options()],
					["How to chomp", () => app.help()],
					["About & credits", () => app.about()],
					...(app.net
						? []
						: [
								...(app.returnEditor
									? [["Return to workshop", () => app.workshop.show()]]
									: []),
								["Developer tools", () => app.developer()],
								["Restart this run", () => app.confirmRetry()],
								["Return to title", () => app.confirmTitle()],
							]),
				],
			},
		},
	});
	// Keep native focus, input, sliders and rebinding; compose a smaller TV pause menu.
	ui._pauseActs = () => {};
	ui.root.addEventListener("pointerover", (e) => {
		const button = e.target.closest("button");
		if (
			e.pointerType !== "touch" &&
			button &&
			button.tabIndex >= 0 &&
			!button.disabled
		)
			button.focus({ preventScroll: true });
	});
	const saved = { v: 1, best: 0, unlocked: 1, boards: [] };
	try {
		const v = JSON.parse(localStorage.getItem("chomp-save-v1"));
		if (v && v.v === 1) {
			saved.best = Number.isFinite(v.best) ? Math.max(0, v.best) : 0;
			saved.unlocked = Number.isFinite(v.unlocked)
				? Math.max(1, Math.min(6, v.unlocked))
				: 1;
			saved.boards = Array.isArray(v.boards)
				? v.boards
						.slice(0, 3)
						.map((b) => (ChompContent.validate(b).ok ? b : null))
				: [];
		}
	} catch {
		/* Corrupt/unavailable storage uses a fresh versioned save. */
	}
	const app = {
		game,
		ui,
		save: saved,
		net: null,
		sim: null,
		state: null,
		mode: "loading",
		attract: false,
		assisted: false,
		devEnabled: false,
		returnEditor: false,
		lastActivity: 0,
		lastRevision: -1,
		lastPhase: null,
		eventSeen: new Set(),
		intents: {},
		lastAxes: {},
		testMode: new URLSearchParams(location.search).get("test") === "1",
		introTimer: 0,
		ended: false,
		overlayAccumulator: 0,
		attractIndex: 0,
	};
	globalThis.ChompApp = app;
	globalThis.ChompSave = saved;
	globalThis.game = game;
	app.view = new ChompView(game);
	app.audio = new ChompAudio(game);
	app.persist = () => {
		if (app.attract || app.net || app.assisted) return;
		try {
			localStorage.setItem("chomp-save-v1", JSON.stringify(saved));
		} catch {
			ui.toast(
				"Saving unavailable",
				"Your game still works. Records last for this visit.",
			);
		}
	};
	app.clearInput = () => {
		for (const I of game.players) I.clear();
		app.intents = {};
		app.lastAxes = {};
		if (game.input.stickOn)
			game.input._stickEnd({ pointerId: game.input.stickId });
	};
	app.cardinal = (v, key = 0) => {
		const x = v?.[0] || 0,
			y = v?.[1] || 0;
		if (Math.hypot(x, y) < 0.28) {
			app.lastAxes[key] = null;
			return null;
		}
		const prev = app.lastAxes[key];
		let horizontal = Math.abs(x) > Math.abs(y);
		if (
			prev !== null &&
			prev !== undefined &&
			Math.abs(Math.abs(x) - Math.abs(y)) < 0.18
		)
			horizontal = prev % 2 === 1;
		const dir = horizontal ? (x > 0 ? 1 : 3) : y > 0 ? 2 : 0;
		app.lastAxes[key] = dir;
		return dir;
	};
	app.setupSeats = (n) => {
		while (game.players.length > 1) game.removePlayer(2);
		// Device handoff is deliberate, so it must not masquerade as an unplugged pad.
		Object.assign(game.input, {
			pad: "any",
			padIndex: null,
			padId: "",
			padPrev: [],
			padLost: false,
			padMove: [0, 0],
			padAim: null,
			lastDevice: "keyboard",
		});
		if (n === 2) {
			let pads = [];
			try {
				pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
			} catch {}
			if (pads.length > 1) {
				game.input.pad = pads[0].index;
				game.addPlayer({ pad: pads[1].index });
			} else if (pads.length === 1) {
				game.input.pad = null;
				game.input._claimed = new Set([pads[0].index]);
				game.addPlayer({ pad: pads[0].index });
			} else game.addPlayer({ keys: "right" });
		}
		app.clearInput();
	};
	app.start = (
		mode = "campaign",
		n = 1,
		board = null,
		returnEditor = false,
		seed = "CHOMP-1981",
	) => {
		if (app.net) return;
		app.workshop?.hide();
		app.attract = false;
		app.assisted = false;
		app.devEnabled = false;
		app.returnEditor = returnEditor;
		app.mode = "play";
		app.setupSeats(n);
		app.sim = new ChompSim({
			mode,
			board: board ? ChompContent.clone(board) : undefined,
			seats: n === 2 ? ["1", "2"] : ["1"],
			seed,
		});
		app.state = app.sim.snapshot();
		app.lastRevision = -1;
		app.lastPhase = null;
		app.eventSeen.clear();
		app.audio.seen.clear();
		app.view.rigs.clear();
		app.view.reveal = false;
		app.view.overlays = false;
		ui.hide();
		game.resume();
		game.scene.pausable = true;
		app.audio.lastTarget = false;
		app.audio.start();
		app.introTimer = 3;
		ui.toast(
			"THE SNACKS HAVE LEGS.",
			"Catch them. Bright bites turn the tables.",
			4,
		);
		app.lastActivity = game.real;
	};
	app.title = () => {
		if (app.net) return;
		app.workshop?.hide();
		app.mode = "title";
		app.attract = false;
		app.assisted = false;
		app.returnEditor = false;
		app.devEnabled = false;
		app.view.overlays = false;
		app.view.reveal = false;
		app.lastActivity = game.real;
		app.lastRevision = -1;
		ui._els.toast.classList.remove("on");
		ui._toastEnd = 0;
		app.audio.seen.clear();
		app.clearInput();
		app.sim = new ChompSim({
			seats: ["1"],
			config: { invulnerable: true },
			seed: "TITLE",
		});
		app.state = app.sim.snapshot();
		game.resume();
		if (game.scene) game.scene.pausable = false;
		ui.hide();
		ui.show("title", {
			kicker: "K.C. / A POCKET ARCADE",
			name: "CHOMP\nCHASE",
			subtitle:
				"The snacks have legs.\nCatch supper before supper catches you.",
			meta: ["1–2 PLAYERS", "SIX MAZES", "1981 → NOW"],
			actions: [
				["Chomp!  /  Solo campaign", () => app.start("campaign", 1)],
				["Couch co-op", () => app.coopMenu()],
				["Seeded remix", () => app.remixMenu()],
				[
					"Maze workshop",
					() => {
						if (!app.workshop) app.workshop = new ChompWorkshop(app);
						app.workshop.show();
					},
				],
				["Sound & comfort", () => app.options()],
				["How to chomp", () => app.help()],
				["About & credits", () => app.about()],
			],
			footer: `BEST ${saved.best}  /  ${saved.unlocked} OF 6 MAZES DISCOVERED`,
		});
		app.audio.start();
	};
	app.coopMenu = () =>
		ui.show("coop", {
			kicker: "TWO CHOMPERS. ONE SUPPER.",
			title: "Bring a bite buddy.",
			text: "Share every snack, all five lives, and one score.\n\nTwo pads: one each.\nOne pad + keyboard: keyboard is Player 1.\nKeyboard only: P1 WASD + F, P2 arrows + period.\n\nAcross devices, launch through AI Hub. No account or name needed.",
			actions: [
				["Start together", () => app.start("campaign", 2)],
				["Back", () => ui.back()],
			],
		});
	app.remixMenu = () => {
		let input;
		ui.show("remix", {
			kicker: "A FRESH LITTLE FEAST",
			title: "Shuffle the supper.",
			text: "A seed always makes the same maze. Side doors, rotating pen, and bright bites included.",
			rows: ["remixHidden"],
			actions: [
				[
					"Play this seed",
					() => {
						const seed = input.value.trim() || "MIDNIGHT";
						app.start(
							"remix",
							1,
							ChompContent.generate(seed, {
								invisible: game.settings.remixHidden,
							}),
							false,
							seed,
						);
					},
				],
				[
					"Two-player remix",
					() => {
						const seed = input.value.trim() || "MIDNIGHT";
						app.start(
							"remix",
							2,
							ChompContent.generate(seed, {
								invisible: game.settings.remixHidden,
							}),
							false,
							seed,
						);
					},
				],
				[
					"Shuffle seed",
					() => {
						const a = new Uint32Array(1);
						crypto.getRandomValues(a);
						input.value = `SNACK-${a[0].toString(36).toUpperCase()}`;
					},
				],
				["Back", () => ui.back()],
			],
		});
		input = document.createElement("input");
		input.className = "workshop-name";
		input.value = "MIDNIGHT-81";
		input.maxLength = 48;
		input.setAttribute("aria-label", "Remix seed");
		ui._els.scr.querySelector(".esh-mod").append(input);
	};
	game.settings.define({
		key: "remixHidden",
		label: "Disappearing walls",
		type: "toggle",
		value: false,
		group: "Game",
	});
	app.options = () =>
		ui.show("options", {
			title: "Sound & comfort",
			text: "Your choices stay on this device.",
			actions: [
				[
					"Sound",
					() =>
						ui.show("sound", {
							title: "Little electronic noises",
							rows: ["sound", "volume", "music", "effects", "voice"],
							actions: [["Back", () => ui.back()]],
						}),
				],
				[
					"Comfort & display",
					() =>
						ui.show("comfort", {
							title: "Make yourself comfy.",
							rows: ["motion", "flashes", "filter", "autoChirp", "touchSense"],
							actions: [["Back", () => ui.back()]],
						}),
				],
				["Controls & button symbols", () => ui.show("controls")],
				[
					"Reset sound & comfort",
					() => {
						game.settings.reset("Sound");
						game.settings.reset("Comfort");
						game.settings.reset("Game");
						ui.toast(
							"Fresh defaults",
							"Music 10%. All the little noises are ready.",
						);
					},
				],
				["Back", () => ui.back()],
			],
		});
	const helpPages = [
		{
			title: "Chase the lunch.",
			text: "All twelve snacks move. The fewer remain, the faster they run. Chase from behind and they may outrun you. Take a cross-link, wrap through a side door, or meet them at the next corner.",
			keys: [
				["STICK / D-PAD", "Steer and buffer turns"],
				["WASD / ARROWS", "Keyboard steering"],
				["SPACE / SOUTH", "Reveal walls"],
				["ESC / OPTIONS", "Pause / settings"],
			],
		},
		{
			title: "Turn the tables.",
			text: "Four bright snacks make all three predators edible for six seconds. Catch them for 5, 10, then 20 points. A fresh bright bite refreshes the power and resets the chain. A !! warning means their teeth are almost back.\n\nRed horns follow. Violet ears intercept. Orange tails keep the shortcuts. Returning eyes are harmless.",
		},
		{
			title: "A maze with manners.",
			text: "Side doors wrap left to right. The gold central pen has one opening and turns every few seconds: enter, wait, leave on a new side. Nothing gets crushed.\n\nVanishing walls reveal periodically. Tap Space / south / ♪ for a reveal on a four-second cooldown. Touch can reveal automatically.\n\nFive shared lives. Clear a board to restore one. No timer in standalone.",
		},
		{
			title: "Make a munchable maze.",
			text: "Workshop: D-pad moves the cell, south applies, shoulders cycle tools, Options opens save and play. Mouse and touch paint cells. Ctrl+Z / Ctrl+Y undo and redo.\n\nSnack tools move one of the twelve existing snacks each time. The frame and permanent pen stay intact. Validate finds the first fix. Save in three slots or share JSON text.",
		},
	];
	app.help = (i = 0) => {
		const h = helpPages[i];
		ui.show(`help${i}`, {
			kicker: `HOW TO CHOMP / ${i + 1} OF ${helpPages.length}`,
			title: h.title,
			text: h.text,
			keys: h.keys,
			actions: [
				...(i < helpPages.length - 1 ? [["Next", () => app.help(i + 1)]] : []),
				["Back", () => ui.back()],
			],
		});
	};
	const feedbackLabels = {
		testingFeedback: [
			"Issues caught",
			"Critical / game breaking",
			"Most helpful test",
			"Least helpful test",
		],
		engineFeedback: [
			"Liked most",
			"Got stuck / guessed wrong",
			"Built for this game",
			"Hardest engine work",
			"Engine changes",
			"One engine improvement",
		],
		promptFeedback: [
			"Liked most",
			"Confusing",
			"Hardest task",
			"Suggested change",
		],
	};
	app.about = (page = "menu", i = 0) => {
		if (page === "menu") {
			ui.show("about", {
				kicker: release.aiHub.name,
				title: "About this little arcade",
				text: "An original game inspired by K.C. Munchkin (1981). Creature designs, layouts, score and code are new. Source rules are a foundation; co-op, reveal chirp and predator personalities are adaptations.",
				actions: [
					["Source Information", () => app.about("source", 0)],
					["Testing Feedback", () => app.about("testingFeedback")],
					["Engine Feedback", () => app.about("engineFeedback")],
					["Prompt Feedback", () => app.about("promptFeedback")],
					[
						"Credits & research",
						() =>
							ui.show("credits", {
								title: "A handful of happy teeth.",
								text: "Built by OpenAI gpt-6.1-sol in Codex CLI.\nEngine: my-3D2dge by Michael Crosato, v0.89.1.\nSession client: AI Hub, v1.4.0.\nSource: K.C. Munchkin, Philips / Magnavox, 1981.\n\nResearch: original Odyssey² rules booklet; contemporary audiovisual observations; Odyssey² archived commercial frames. Exact original audio pitches and human listening quality: unknown.\n\nEverything visible and audible is drawn or synthesized in code. No external assets or runtime downloads.",
								actions: [["Back", () => ui.back()]],
							}),
					],
					["Back", () => ui.back()],
				],
			});
			return;
		}
		const sections =
			page === "source"
				? Object.entries(release.sourceInformation).map(([a, b]) => [
						a.replace(/([A-Z])/g, " $1"),
						b,
					])
				: feedbackLabels[page].map((label, k) => [label, release[page][k]]);
		const chunks = [];
		for (let j = 0; j < sections.length; j += page === "source" ? 4 : 2)
			chunks.push(sections.slice(j, j + (page === "source" ? 4 : 2)));
		ui.show("aboutDetails", {
			kicker:
				page === "source"
					? "Source Information"
					: page.replace(/([A-Z])/g, " $1"),
			title: `${i + 1} / ${chunks.length}`,
			sections: chunks[i],
			actions: [
				...(i < chunks.length - 1
					? [["Next page", () => app.about(page, i + 1)]]
					: []),
				[
					"Back",
					() => {
						ui.back();
					},
				],
			],
		});
	};
	app.confirmRetry = () =>
		ui.show("retryConfirm", {
			title: "Fresh teeth?",
			text: "Restart the current run with five lives and a clean score.",
			actions: [
				["Keep playing", () => ui.back()],
				[
					"Restart",
					() =>
						app.start(
							app.sim.mode,
							app.sim.seats.length,
							app.sim.customBoard,
							app.returnEditor,
							app.sim.seed,
						),
				],
			],
		});
	app.confirmTitle = () =>
		ui.show("titleConfirm", {
			title: "Put supper away?",
			text: "Your best score and workshop saves stay safe.",
			actions: [
				["Keep playing", () => ui.back()],
				["Return to title", () => app.title()],
			],
		});
	app.results = () => {
		const s = app.state,
			won = s.phase === "won";
		app.mode = "results";
		game.scene.pausable = false;
		app.clearInput();
		if (!app.assisted && !app.returnEditor) {
			saved.best = Math.max(saved.best, s.score);
			app.persist();
		}
		ui.show("results", {
			kicker: app.assisted
				? "ASSISTED RUN"
				: won
					? "A COMPLETE LITTLE FEAST"
					: "THE SNACKS GET THE LAST LAUGH",
			title: won ? "Well chomped!" : "Chomp another day.",
			text: won
				? `The midnight munch is over. ${s.stats?.food || 12} happy bites. Every last snack, well and truly chomped.`
				: "A new route, a sharper turn, one more bright bite. You know the maze a little better now.",
			emblem: won ? "✦" : "♡",
			stats: [
				[s.score, "Team score"],
				[s.stats?.food || 0, "Snacks caught"],
				[s.stats?.enemies || 0, "Predators eaten"],
				[`${Math.round(s.elapsed)}s`, "Time"],
			],
			actions: [
				...(app.returnEditor
					? [["Return to workshop", () => app.workshop.show()]]
					: [
							[
								"Chomp again",
								() =>
									app.start(
										app.sim.mode,
										app.sim.seats.length,
										app.sim.customBoard,
										false,
										app.sim.seed,
									),
							],
							["Try a remix", () => app.remixMenu()],
						]),
				["Return to title", () => app.title()],
			],
		});
	};
	const sliders = [
		["playerSpeed", "Player cells / second", 3, 10, 0.25],
		["foodBase", "First snack speed ratio", 0.3, 0.9, 0.02],
		["foodFinal", "Last snack speed ratio", 0.7, 1.2, 0.02],
		["enemySpeed", "Predator cells / second", 1, 6, 0.1],
		["reaction", "Predator reaction seconds", 0.05, 1.2, 0.05],
		["powerDuration", "Bright bite seconds", 2, 12, 0.25],
		["gatePeriod", "Gate turn seconds", 1, 6, 0.1],
		["revealCooldown", "Reveal cooldown seconds", 1, 8, 0.25],
		["damageGrace", "Team damage grace seconds", 0.2, 3, 0.1],
	];
	for (const [key, label, min, max, step] of sliders)
		game.settings.define({
			key: `dev_${key}`,
			label,
			type: "slider",
			min,
			max,
			step,
			value: ChompSim.DEFAULTS[key],
			group: "Developer",
			apply: (_g, v) => {
				if (app.devEnabled && !app.net) app.sim?.configure({ [key]: v });
			},
		});
	game.settings.define({
		key: "dev_invulnerable",
		label: "Invulnerable",
		type: "toggle",
		value: false,
		group: "Developer",
		apply: (_g, v) => {
			if (app.devEnabled && !app.net) app.sim?.configure({ invulnerable: v });
		},
	});
	game.settings.define({
		key: "dev_walls",
		label: "Always show walls",
		type: "toggle",
		value: false,
		group: "Developer",
		apply: (_g, v) => {
			if (app.devEnabled) app.view.reveal = v;
		},
	});
	game.settings.define({
		key: "dev_overlays",
		label: "Actor paths / hitboxes",
		type: "toggle",
		value: false,
		group: "Developer",
		apply: (_g, v) => {
			if (app.devEnabled) app.view.overlays = v;
		},
	});
	game.settings.define({
		key: "dev_stage",
		label: "Stage on jump",
		type: "select",
		options: ChompContent.stages.map((s, i) => [i, s.name]),
		value: 0,
		group: "Developer",
	});
	app.developer = (page = 0) => {
		if (app.net) return;
		if (!app.devEnabled) {
			for (const [key] of sliders)
				game.settings.set(`dev_${key}`, app.sim.config[key]);
			game.settings.set("dev_invulnerable", app.sim.config.invulnerable);
		}
		app.devEnabled = true;
		app.assisted = true;
		game.pause("menu");
		ui.show("dev", {
			kicker: "ASSISTED RUN / RECORDS DISABLED",
			title: page ? "Maze laboratory" : "Live balance",
			text: "Sliders apply on the next simulation step. Lives remain shared. Resume to feel the changes.",
			rows: page
				? [
						"dev_gatePeriod",
						"dev_revealCooldown",
						"dev_damageGrace",
						"dev_invulnerable",
						"dev_walls",
						"dev_overlays",
						"dev_stage",
					]
				: sliders.slice(0, 6).map((x) => `dev_${x[0]}`),
			actions: [
				[
					"Resume",
					() => {
						ui.hide();
						app.clearInput();
					},
				],
				["Other tools", () => app.developer(page ? 0 : 1)],
				["Load a remix seed", () => app.developerSeed()],
				[
					"Single simulation step",
					() => {
						app.sim.step(1 / 120, {});
						app.state = app.sim.snapshot();
					},
				],
				[
					"Jump to selected stage",
					() => {
						app.sim.stageIndex = game.settings.dev_stage;
						app.sim.customBoard = null;
						app.sim.mode = "campaign";
						app.sim.loadBoard(ChompContent.stages[game.settings.dev_stage]);
						app.state = app.sim.snapshot();
						ui.toast("Stage loaded", app.state.board.name);
					},
				],
				[
					"Restart stage",
					() => {
						app.sim.loadBoard(app.sim.board);
						app.state = app.sim.snapshot();
					},
				],
				[
					"Advance stage",
					() => {
						app.sim.nextStage();
						app.state = app.sim.snapshot();
					},
				],
				[
					"Inspect state / events",
					() => {
						ui.show("inspector", {
							title: "Read-only state",
							text: JSON.stringify(
								{
									tick: app.state.tick,
									revision: app.state.revision,
									phase: app.state.phase,
									lives: app.state.lives,
									score: app.state.score,
									gate: app.state.gate,
									events: app.state.events.slice(-6),
								},
								null,
								2,
							),
							actions: [["Back", () => ui.back()]],
						});
					},
				],
				[
					"Reset defaults",
					() => {
						app.sim.configure(ChompSim.DEFAULTS);
						game.settings.reset("Developer");
						app.view.overlays = false;
						app.view.reveal = false;
						app.developer(page);
					},
				],
				["Back", () => ui.back()],
			],
		});
	};
	app.developerSeed = () => {
		let input;
		ui.show("devSeed", {
			title: "Seed laboratory",
			text: "Load a validated remix under the current balance settings. This stays an assisted run.",
			actions: [
				[
					"Load seed",
					() => {
						const seed = input.value.trim() || "MIDNIGHT";
						app.sim = new ChompSim({
							mode: "remix",
							seed,
							seats: app.sim.seats,
							config: app.sim.config,
						});
						app.state = app.sim.snapshot();
						app.lastRevision = -1;
						app.audio.seen.clear();
						app.developer(1);
					},
				],
				["Back", () => ui.back()],
			],
		});
		input = document.createElement("input");
		input.className = "workshop-name";
		input.value = app.sim.seed;
		input.maxLength = 48;
		input.setAttribute("aria-label", "Developer remix seed");
		ui._els.scr.querySelector(".esh-mod").append(input);
	};
	app.beginAttract = () => {
		app.attract = true;
		app.mode = "attract";
		ui.hide();
		app.clearInput();
		app.attractIndex = 0;
		app.audio.seen.clear();
		app.sim = new ChompSim({
			mode: "custom",
			board: ChompContent.stages[0],
			seats: ["1", "2"],
			seed: "SHOWCASE",
			config: { invulnerable: true },
		});
		app.state = app.sim.snapshot();
		app.attractClock = 0;
		game.resume();
		game.scene.pausable = false;
	};
	function activity(e) {
		if (app.ended) return;
		if (
			e?.type === "pointermove" &&
			!(Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 4) &&
			!e.buttons
		)
			return;
		app.audio.unlock();
		app.lastActivity = game.real;
		if (app.attract) {
			e?.preventDefault?.();
			e?.stopImmediatePropagation?.();
			app.title();
			app.clearInput();
			return false;
		}
		return true;
	}
	for (const type of ["keydown", "pointerdown", "pointermove"])
		addEventListener(type, activity, { capture: true, passive: false });
	addEventListener("keydown", (e) => {
		if (app.mode === "editor" && (e.ctrlKey || e.metaKey)) {
			if (e.code === "KeyZ") {
				e.preventDefault();
				e.shiftKey ? app.workshop.redo() : app.workshop.undo();
			}
			if (e.code === "KeyY") {
				e.preventDefault();
				app.workshop.redo();
			}
		}
	});
	const canvas = document.getElementById("screen");
	let paintPointer = null;
	canvas.addEventListener("pointerdown", (e) => {
		if (app.mode === "editor" && !ui.screen) {
			paintPointer = e.pointerId;
			canvas.setPointerCapture(e.pointerId);
			app.workshop.pointer(e);
		}
	});
	canvas.addEventListener("pointermove", (e) => {
		if (paintPointer === e.pointerId && app.mode === "editor" && !ui.screen)
			app.workshop.pointer(e);
	});
	for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
		canvas.addEventListener(type, (e) => {
			if (e.pointerId === paintPointer) paintPointer = null;
		});
	const corner = document.getElementById("corner"),
		chirp = document.getElementById("chirp");
	corner.onclick = () => {
		if (app.ended) return;
		if (app.attract) {
			app.title();
			return;
		}
		if (app.mode === "editor") {
			app.workshop.menu();
			return;
		}
		if (app.net || app.mode === "play") game.pause("menu");
		else app.options();
	};
	game.input.bindButtons(document.body);
	chirp.dataset.act = "chirp";
	game.input.bindButtons(document.body);
	game.input._cornerMenu = true;
	game.input.touchButtons([]);
	game.input._stickDraw = () => {}; // Invisible native multitouch steering; context-only reveal button is below.
	game.hook("input", () => {
		if (app.ended) {
			game.input.consumeAll();
			return;
		}
		let pads = [];
		try {
			pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
		} catch {}
		if (pads.some((p) => p.buttons?.[8]?.pressed)) {
			game.input.suppress("pause");
			game.input.suppress("start");
		}
		if (
			pads.some(
				(p) =>
					p.buttons.some((b) => b.pressed) ||
					p.axes.some((v) => Math.abs(v) > 0.3),
			)
		) {
			app.lastActivity = game.real;
			if (app.attract) {
				app.title();
				game.input.consumeAll();
			}
		}
	});
	app.process = (dt) => {
		if (app.ended) return;
		app.overlayAccumulator += dt;
		const s = app.state;
		if (!s) return;
		if (s.revision !== app.lastRevision) {
			app.lastRevision = s.revision;
			app.eventSeen.clear();
			app.view.pops = [];
			app.audio.lastTarget = false;
			app.audio.start();
			if (app.mode === "play" && !app.net) {
				saved.unlocked = Math.max(saved.unlocked, s.stageIndex + 1);
				app.persist();
				ui.toast(`${s.stageIndex + 1} / 6  ${s.board.name}`, s.board.hint, 5);
			}
		}
		for (const ev of s.events || []) {
			if (app.eventSeen.has(ev.id)) continue;
			app.eventSeen.add(ev.id);
			app.audio.event(ev);
			app.view.event(ev);
		}
		if (app.eventSeen.size > 300)
			app.eventSeen = new Set([...app.eventSeen].slice(-100));
		app.audio.update(s);
		app.view.update(s, dt);
		if (["won", "lost"].includes(s.phase) && app.mode === "play") {
			if (app.net) {
				if (app.net.isHost)
					app.net.finish({
						score: s.score,
						won: s.phase === "won",
						stats: {
							"Stages completed": s.stats?.stages || 0,
							"Snacks caught": s.stats?.food || 0,
							"Team lives": s.lives,
						},
					});
			} else app.results();
		}
		app.lastPhase = s.phase;
	};
	const update = (dt) => {
		if (app.ended) return;
		app.view.fit(app.mode === "title");
		const I = game.input;
		corner.hidden = !!ui.screen || app.net?.isServer || app.ended;
		chirp.hidden =
			!!ui.screen ||
			app.mode !== "play" ||
			!app.state?.board.invisible ||
			I.lastDevice !== "touch";
		if (app.mode === "title") {
			if (
				game.real - app.lastActivity >= 10 &&
				!ui.screen?.startsWith("workshop")
			) {
				app.beginAttract();
			} else {
				app.view.update(app.state, dt);
				return;
			}
		}
		if (app.mode === "editor") {
			if (!ui.screen) app.workshop.update(dt);
			app.view.update(app.state, dt);
			return;
		}
		if (app.attract) {
			app.attractClock += dt;
			if (app.attractClock > 17 || ["won", "lost"].includes(app.sim.phase)) {
				app.attractIndex = (app.attractIndex + 1) % 6;
				app.attractClock = 0;
				app.audio.seen.clear();
				app.sim = new ChompSim({
					mode: "custom",
					board: ChompContent.stages[app.attractIndex],
					seats: ["1", "2"],
					seed: `SHOWCASE${app.attractIndex}`,
					config: { invulnerable: true },
				});
			}
			const intents = {};
			for (const seat of app.sim.seats) intents[seat] = app.sim.botIntent(seat);
			app.sim.step(dt, intents);
			app.state = app.sim.snapshot();
			app.process(dt);
			return;
		}
		if (app.net) {
			app.net.tick(dt);
			const intent =
				!ui.screen && app.net.live
					? { dir: app.cardinal(I.move()), action: I.pressed("chirp") }
					: { dir: null, action: false };
			app.net.input(intent);
			if (app.net.isHost && app.net.live) {
				app.sim.step(dt, app.intents);
				const old = app.state?.revision;
				app.state = app.sim.snapshot();
				if (old !== app.state.revision) app.net.transition();
			}
			app.process(dt);
			return;
		}
		if (app.mode === "play") {
			if (ui.screen) return;
			const intents = {};
			game.players.forEach((inp, i) => {
				intents[String(i + 1)] = {
					dir: app.cardinal(inp.move(), i),
					action:
						inp.pressed("chirp") ||
						(inp.lastDevice === "touch" &&
							game.settings.autoChirp &&
							app.sim.board.invisible &&
							app.sim.chirpCooldown <= 0),
				};
			});
			app.sim.step(dt, intents);
			app.state = app.sim.snapshot();
			app.process(dt);
		}
	};
	const draw = (r) => {
		if (app.net?.isServer || app.ended) {
			r.sky(["#080914", "#080914"]);
			return;
		}
		app.view.draw(r, app.state, {
			title: app.mode === "title",
			attract: app.attract,
			editor: app.mode === "editor" ? app.workshop : null,
			dev: app.assisted,
		});
		if (app.net && !app.net.live && !app.net.ended) {
			r.text(
				app.net.time < 0 && Number.isFinite(app.net.time)
					? String(Math.ceil(-app.net.time))
					: "GET READY TO CHOMP",
				r.W / 2,
				r.H / 2,
				"#ffe7a5",
				{ scale: 3, align: "center", outline: false, shadow: "#0a0811" },
			);
		}
	};
	game.debug = {
		snapshot: () => ({
			...app.state,
			screen: ui.screen,
			mode: app.mode,
			assisted: app.assisted,
			attract: app.attract,
			paused: game.paused,
			device: game.input.lastDevice,
			network: app.net?.diagnostics?.() || null,
			audio: {
				ready: game.audio.ready,
				music: game.audio.musicVolume,
				voice: game.audio.voiceVolume,
				events: app.audio.events.slice(-12),
			},
		}),
		command: (name, data = {}) => {
			if (name === "inspect") return game.debug.snapshot();
			if (!app.testMode && !app.devEnabled)
				throw Error("Developer mode is required");
			if (app.net) throw Error("Shared sessions are read-only");
			if (name === "start")
				app.start(
					data.mode || "campaign",
					data.players || 1,
					data.board || null,
					false,
					data.seed || "CHOMP-1981",
				);
			else if (name === "step") {
				const seconds = Math.min(30, Math.max(0, data.seconds || 1 / 120));
				for (let i = 0; i < seconds * 120; i++) {
					const intents = data.bot
						? Object.fromEntries(
								app.sim.seats.map((s) => [s, app.sim.botIntent(s)]),
							)
						: data.intents || {};
					app.sim.step(1 / 120, intents);
				}
				app.state = app.sim.snapshot();
				app.process(0);
			} else if (name === "attract") app.beginAttract();
			else if (name === "title") app.title();
			else if (name === "workshop") {
				if (!app.workshop) app.workshop = new ChompWorkshop(app);
				app.workshop.show();
			} else if (name === "config") app.sim.configure(data);
			else throw Error("Unknown developer command");
			return game.debug.snapshot();
		},
	};
	game.start({
		scenes: {
			main: {
				view: "overhead",
				pausable: false,
				camera: { zoom: false },
				update,
				draw,
			},
		},
		scene: "main",
	});
	(async () => {
		try {
			app.net = await ChompNet.create({
				onPrepare: (players, seed, role) => {
					game.o.autoPause = false;
					game.live = true;
					app.mode = "session";
					app.intents = {};
					if (role.isHost) {
						app.sim = new ChompSim({
							mode: "campaign",
							seed,
							seats: players.map((p) => String(p.id)),
						});
						app.state = app.sim.snapshot();
					} else {
						app.state = new ChompSim({
							seats: players.map((p) => String(p.id)),
							seed,
						}).snapshot();
					}
					ui.hide();
					game.resume();
					game.scene.pausable = true;
				},
				onStart: () => {
					app.mode = "play";
					app.clearInput();
				},
				getState: () => app.sim?.snapshot(),
				onState: (s) => {
					app.state = s;
				},
				onIntent: (seat, intent) => {
					app.intents[seat] = intent;
				},
				onLeave: (seat) => {
					delete app.intents[seat];
					app.sim?.removeSeat(seat);
				},
				onTimeUp: () => ({
					score: app.state?.score || 0,
					won: app.state?.phase === "won",
					stats: {
						"Stages completed": app.state?.stats?.stages || 0,
						"Snacks remaining":
							app.state?.foods?.filter((f) => f.alive).length || 0,
					},
				}),
				onEnd: () => {
					app.ended = true;
					app.clearInput();
					app.audio.stop();
					ui.hide();
					ui.root.style.pointerEvents = "none";
					ui.root.hidden = true;
					corner.hidden = true;
					chirp.hidden = true;
					game.stop();
				},
				onError: (e) => {
					document.getElementById("boot").textContent =
						`Could not start: ${e.message}`;
				},
			});
			if (!app.net) app.title();
			document.getElementById("boot").hidden = true;
		} catch (e) {
			if (AIHub.active) AIHub.fail(e.message);
			document.getElementById("boot").textContent =
				`Could not wake the snacks: ${e.message}`;
			console.error(e);
		}
	})();
})();
/* GAME END */
