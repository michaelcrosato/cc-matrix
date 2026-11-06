(() => {
	const E = My3D2dge,
		TT = globalThis.TallTale;
	const ID = window.__TT_ID,
		META = window.__TT_META;
	const hubMode = !!window.AIHub?.active;
	const saveKey = "beauty-tall-tale:save:v1";
	const state = {
		mode: hubMode ? "hub" : "title",
		sim: null,
		attract: null,
		network: null,
		idle: 0,
		ignoreUntil: 0,
		debug: false,
		bot: false,
		slow: false,
		coOp: false,
		results: false,
		checkpointSection: -1,
		recordsSaved: false,
		pointers: new Set(),
		rawPads: new Map(),
		lastPointer: null,
		inputTarget: null,
		climbHeld: false,
		touchJumpUntil: 0,
		ended: false,
		ready: false,
	};
	let ui, visual, sound, game;
	const saved = E.store.get(saveKey, {});
	const saves =
		saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
	const settings = [
		{ key: "music", value: 0.1 },
		{ key: "glyphs", value: "playstation" },
		{
			key: "hazardContrast",
			label: "High-contrast hazard outlines",
			type: "toggle",
			value: false,
			group: "Comfort",
		},
		{
			key: "touchAssist",
			label: "Touch: assist short hazard jumps",
			type: "toggle",
			value: true,
			group: "Game",
		},
		{
			key: "voice",
			label: "Character voices",
			type: "slider",
			min: 0,
			max: 1,
			step: 0.1,
			value: 0.55,
			group: "Sound",
		},
	];
	const configSpecs = [
		["run", "Run speed", 55, 150, 5],
		["jump", "Jump impulse", 150, 260, 5],
		["climbTime", "Climb time", 0.4, 1.4, 0.05],
		["windowOpen", "Window open time", 2, 10, 0.2],
		["windowWarning", "Shutter warning time", 0.6, 2.4, 0.1],
		["hazardCadence", "Hazard cadence", 0.5, 2, 0.1],
		["hazardSpeed", "Hazard speed", 0.5, 1.8, 0.1],
		["heartDuration", "Heart rush duration", 3, 12, 0.5],
	];
	game = new E.Game({
		id: "beauty-and-the-tall-tale-v1",
		canvas: "screen",
		res: [640, 480],
		expand: true,
		view: "side",
		input: "PLATFORMER",
		bg: "#15363e",
		autoPause: !hubMode,
		live: hubMode,
		fullscreen: "button",
		menu: {
			settings,
			controls: { jump: "Jump", attack: false, dash: false, skill: false },
			quit: hubMode ? false : "title",
			items: hubMode ? [] : [["Developer tools", () => openDev()]],
		},
	});
	if (hubMode) game.live = true;
	if (!hubMode)
		configSpecs.forEach(([key, label, min, max, step]) =>
			game.settings.define({
				key: "dev_" + key,
				label,
				type: "slider",
				min,
				max,
				step,
				value: TT.DEFAULTS[key],
				group: "Developer",
				apply: (_g, value) => {
					if (state.mode === "play" && state.sim && !hubMode)
						state.sim.setConfig(key, value);
				},
			}),
		);
	if (!hubMode)
		game.settings.define({
			key: "dev_invulnerable",
			label: "Invulnerability",
			type: "toggle",
			value: false,
			group: "Developer",
			apply: (_g, v) => {
				if (state.sim && !hubMode && state.mode === "play") {
					state.sim.invulnerable = v;
					if (v) state.sim.unranked = true;
				}
			},
		});
	ui = new E.Shell(game, {
		theme: {
			ink: "#fff2cf",
			paper: "rgba(16,38,46,.97)",
			accent: "#f6cf78",
			muted: "#b7c7bd",
			font: "Arial,Helvetica,sans-serif",
			titleFont: "Georgia,serif",
		},
		screens: {
			pause: {
				kicker: hubMode
					? "LOCAL SETTINGS · WORLD CONTINUES"
					: "TAKE A BREATHER",
				title: hubMode ? "Still climbing together" : "Hold that ledge",
				text: hubMode
					? "The round continues while these settings are open."
					: "Hank can wait. Those shutters, too.",
			},
			help: {
				kicker: "A LITTLE COURAGE GOES A LONG WAY",
				title: "The way up",
				sections: [
					[
						"Read the shutters",
						"Move to a glowing open window. Hold up to climb. Let go to hang; down reverses. Ticking shutters are about to close!",
					],
					[
						"Mind your footing",
						"Jump rolling stones and rats. Birds pass overhead; bats swoop. Bumpers reverse or drop stones, and cracked stones split. Do not walk off the ledge.",
					],
					[
						"Catch a little courage",
						"Mabel’s pink heart gives the whole team six seconds to smash hazards. Windows still need to be open.",
					],
					[
						"Keep climbing",
						"Reach Hank at the top of each section. Three spare chances are shared; a miss returns you to this section’s start. Reach the roof, rescue Mabel and catch your plane.",
					],
					[
						"Touch controls",
						"Left thumb: an invisible move/climb stick. Right-side tap: jump. A climb button appears beside an eligible window. Short hazard jumps can be assisted in Settings.",
					],
				],
			},
		},
	});
	visual = new TT.Presentation(E, game);
	sound = new TT.Audio(E, game, { silent: hubMode && !!AIHub.server });
	ui.root?.addEventListener(
		"pointerover",
		(event) => {
			if (event.pointerType !== "mouse") return;
			const target = event.target.closest(
				".esh-sh button:not(:disabled), .esh-sh input",
			);
			if (target) target.focus({ preventScroll: true });
		},
		{ signal: game._abort?.signal },
	);

	const hud = document.createElement("div");
	hud.id = "game-hud";
	hud.hidden = true;
	hud.innerHTML =
		'<div class="hud-left"><div class="hud-eyebrow">MUTTON BUILDING · LAMBVILLE FALLS</div><div class="hud-section"></div><div class="hud-floor"></div></div><div class="hud-right"><div class="hud-eyebrow">TEAM SCORE</div><div class="hud-score">000000</div><div class="hud-chances"></div><div class="hud-rush" hidden><i></i></div></div>';
	const prompt = document.createElement("div");
	prompt.id = "game-prompt";
	prompt.hidden = true;
	const attractLabel = document.createElement("div");
	attractLabel.id = "attract-label";
	attractLabel.hidden = true;
	attractLabel.innerHTML =
		"A LITTLE COURAGE, A LOT OF FLOORS<small>Attract demo · Press any button to play</small>";
	const devBadge = document.createElement("div");
	devBadge.id = "dev-badge";
	devBadge.hidden = true;
	const touchClimb = document.createElement("button");
	touchClimb.id = "touch-climb";
	touchClimb.hidden = true;
	touchClimb.textContent = "↑ Climb";
	touchClimb.setAttribute("aria-label", "Hold to climb this window");
	document.body.append(hud, prompt, attractLabel, devBadge, touchClimb);
	const signal = game._abort?.signal;
	const clearInput = () => {
		game.players.forEach((p) => p.clear());
		state.pointers.clear();
		state.touchJumpUntil = 0;
		state.inputTarget = null;
		state.climbHeld = false;
		state.ignoreUntil = game.real + 0.15;
	};
	const newSim = (players = 1, options = {}) =>
		new TT.Simulation(E, {
			players: Array.from({ length: players }, (_, i) => ({
				id: i + 1,
				seat: i + 1,
				name: i ? "Pip" : "Buford",
			})),
			seed: 1982,
			...options,
		});
	const activeSim = () =>
		state.mode === "attract" ? state.attract : state.sim;
	function stopDemo() {
		if (state.mode !== "attract") return false;
		state.attract = null;
		state.mode = "title";
		state.idle = game.real;
		attractLabel.hidden = true;
		clearInput();
		showTitle();
		return true;
	}
	function rawActivity(e) {
		if (hubMode) return;
		if (e?.type === "pointermove") {
			const old = state.lastPointer;
			state.lastPointer = [e.clientX, e.clientY];
			if (old && Math.hypot(old[0] - e.clientX, old[1] - e.clientY) < 3) return;
		}
		state.idle = game.real;
		if (stopDemo() && e) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}
	["keydown", "pointerdown", "pointermove", "touchstart", "wheel"].forEach(
		(type) =>
			addEventListener(type, rawActivity, {
				capture: true,
				passive: false,
				signal,
			}),
	);
	touchClimb.addEventListener(
		"pointerdown",
		(e) => {
			e.preventDefault();
			state.climbHeld = true;
			touchClimb.setPointerCapture(e.pointerId);
		},
		{ signal },
	);
	["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
		touchClimb.addEventListener(
			type,
			() => {
				state.climbHeld = false;
			},
			{ signal },
		),
	);
	game.screen.canvas.addEventListener(
		"pointerdown",
		(e) => {
			if (state.mode !== "play" && state.mode !== "hub") return;
			if (ui.screen || state.ended) return;
			if (e.pointerType === "touch" && e.clientX > innerWidth * 0.53) {
				state.pointers.add(e.pointerId);
				state.touchJumpUntil = game.real + 0.22;
				game.input.tap("jump");
			}
		},
		{ signal },
	);
	for (const type of ["pointerup", "pointercancel"])
		addEventListener(
			type,
			(event) => {
				state.pointers.delete(event.pointerId);
			},
			{ signal },
		);

	function showTitle() {
		if (hubMode) return;
		state.mode = "title";
		state.results = false;
		state.idle = game.real;
		game.timeScale = 1;
		sound.stop();
		game.allowJoin(false);
		ui.hide();
		clearInput();
		ui.show("title", {
			kicker: "TWID PRESENTS · A LAMBVILLE FALLS ADVENTURE",
			name: ID.title,
			subtitle: "Small hero. Big bully. Very tall building.",
			text: "Open shutters. Rolling trouble. A little heart from above.\nSome love stories take the stairs. This one doesn’t.",
			meta: ["1–2 PLAYERS", "WINDOW-CLIMBING ARCADE", "1982, REIMAGINED"],
			footer: "Inspired by Beauty and the Beast · An original arcade tall tale",
			back: () => {},
			actions: [
				["Climb solo  →", () => howTo(1)],
				["Climb together", () => showCoop()],
				saves.checkpoint && {
					label: "Continue from checkpoint",
					fn: () => startRun(1, { checkpoint: saves.checkpoint }),
				},
				saves.unlocked && {
					label: "The taller tale · Hard replay",
					fn: () => howTo(1, { hard: true }),
				},
				["Settings", () => game.menu("settings")],
				["About & credits", () => showAbout()],
			].filter(Boolean),
		});
		const h = ui.root?.querySelector("h1");
		if (h)
			h.innerHTML =
				'<span class="beauty">Beauty</span><span class="and">and the</span><span class="tale">Tall Tale</span>';
		document.body.dataset.mode = "title";
	}
	function howTo(players, options = {}) {
		ui.show("howto", {
			kicker: "ONE VERY TALL PROBLEM",
			title:
				players === 2
					? "Two climbers. One rescue."
					: "Hank picked the wrong window.",
			text: "Horrible Hank is all the way up there with Mabel. She’s got a plan. You’ve got a cap. Let’s call that even.",
			keys: [
				[
					game.input.label("left") + " / " + game.input.label("right"),
					"Move along the ledge",
				],
				[
					game.input.label("up") + " / " + game.input.label("down"),
					"Hold to climb open windows",
				],
				[game.input.label("jump"), "Jump stones and critters"],
				["♥", "Six seconds of courage for everyone"],
			],
			sections: [
				[
					"A fair warning",
					"Ticking shutters are closing. Let go to hang; down reverses. Hearts help with hazards, but cannot open a shut window.",
				],
			],
			actions: [
				["Let’s climb  →", () => startRun(players, options)],
				["Back", () => ui.back()],
			],
		});
	}
	function pads() {
		try {
			return Array.from(navigator.getGamepads()).filter(
				(p) => p && p.connected !== false,
			);
		} catch {
			return [];
		}
	}
	function assignCoop(kind) {
		const all = pads();
		while (game.players.length > 1) game.removePlayer(2);
		if (kind === "pads" && all.length >= 2) {
			game.input.pad = all[0].index;
			game.addPlayer({ pad: all[1].index });
			return true;
		}
		if (kind === "keys" && all.length) {
			game.input.pad = null;
			game.addPlayer({ pad: all[0].index });
			return true;
		}
		return false;
	}
	function showCoop() {
		const all = pads();
		ui.show("coop", {
			kicker: "COUCH CO-OP · SAME LEDGES, SAME LUCK",
			title: "Bring a fellow small person.",
			text: "Buford has his cap. Pip has a scarf. Both can climb, both can catch hearts, and every heart protects the whole team. Three spare chances are shared.",
			sections: [
				[
					"Choose your seats",
					all.length
						? `${all.length} controller${all.length === 1 ? "" : "s"} connected. Keyboard is player 1 when paired with a controller.`
						: "Connect a controller and press one of its buttons, then check again. Solo is ready with keyboard or touch.",
				],
			],
			actions: [
				{
					label: "Keyboard + controller",
					disabled: all.length < 1,
					fn: () => {
						if (assignCoop("keys")) howTo(2, { assigned: true });
					},
				},
				{
					label: "Two controllers",
					disabled: all.length < 2,
					fn: () => {
						if (assignCoop("pads")) howTo(2, { assigned: true });
					},
				},
				[
					"Check controllers again",
					() => {
						ui.back();
						showCoop();
					},
				],
				["Back", () => ui.back()],
			],
		});
	}
	function startRun(players = 1, options = {}) {
		if (hubMode) return;
		ui.hide();
		game.resume();
		sound.resume();
		sound.activate();
		state.mode = "play";
		state.attract = null;
		state.coOp = players === 2;
		state.bot = false;
		state.slow = false;
		state.debug = false;
		state.results = false;
		state.recordsSaved = false;
		state.checkpointSection = -1;
		if (!options.assigned) {
			while (game.players.length > 1) game.removePlayer(2);
			game.input.pad = "any";
		}
		state.sim = newSim(players, { hard: !!options.hard });
		for (const [key] of configSpecs)
			game.settings.set(`dev_${key}`, TT.DEFAULTS[key]);
		game.settings.set("dev_invulnerable", false);
		if (options.checkpoint) state.sim.loadCheckpoint(options.checkpoint);
		clearInput();
		game.go("play", null, { fade: 0 });
		document.body.dataset.mode = "play";
		ui.toast("Mabel has a plan.", "Start small. Find the open window.", 3);
	}
	function openDev() {
		if (hubMode) {
			ui.show("dev", {
				kicker: "SESSION INSPECTION",
				title: "Shared rules are locked",
				text: "Only the authoritative host advances the round. Local sound and comfort settings remain available.",
				actions: [["Back", () => ui.back()]],
			});
			return;
		}
		const sim = state.sim;
		if (!sim) return;
		ui.show("dev", {
			kicker: "DEVELOPER TOOLS · CHANGED RUNS ARE UNRANKED",
			title: "Tinker with the tall tale",
			text: `Seed ${sim.seed} · tick ${sim.tick} · section ${sim.section + 1}. Sliders apply immediately; window phase clocks use the new durations on the next tick.`,
			rows: [
				"#Balance",
				...configSpecs.map((s) => "dev_" + s[0]),
				"dev_invulnerable",
			],
			actions: [
				[
					"Reset balance defaults",
					() => {
						sim.resetConfig();
						for (const [key] of configSpecs)
							game.settings.set("dev_" + key, TT.DEFAULTS[key]);
						game.settings.set("dev_invulnerable", false);
						openDev();
					},
				],
				[
					"Step one tick",
					() => {
						sim.unranked = true;
						sim.step(1 / 120, {});
						visual.update(1 / 120, sim);
						openDev();
					},
				],
				[
					state.slow ? "Normal speed" : "Slow motion · 0.35×",
					() => {
						state.slow = !state.slow;
						game.timeScale = state.slow ? 0.35 : 1;
						sim.unranked = true;
						openDev();
					},
				],
				[
					state.debug
						? "Hide collision & route overlay"
						: "Show collision & route overlay",
					() => {
						state.debug = !state.debug;
						openDev();
					},
				],
				[
					state.bot ? "Stop bot play" : "Bot play",
					() => {
						state.bot = !state.bot;
						sim.unranked = true;
						openDev();
					},
				],
				...[0, 1, 2, 3].map((n) => [
					"Warp · " +
						["Lower floors", "Middle floors", "Upper floors", "Rooftop"][n],
					() => {
						sim.warpSection(n);
						openDev();
					},
				]),
				[
					"Spawn rolling boulder",
					() => {
						sim.spawnHazard("boulder");
						openDev();
					},
				],
				[
					"Spawn bumper/drop boulder",
					() => {
						sim.spawnHazard("bumper");
						openDev();
					},
				],
				[
					"Spawn split boulder",
					() => {
						sim.spawnHazard("split");
						openDev();
					},
				],
				[
					"Spawn rat",
					() => {
						sim.spawnHazard("rat");
						openDev();
					},
				],
				[
					"Spawn bird",
					() => {
						sim.spawnHazard("bird");
						openDev();
					},
				],
				[
					"Spawn bat",
					() => {
						sim.spawnHazard("bat");
						openDev();
					},
				],
				[
					"Clear hazards",
					() => {
						sim.hazards.length = 0;
						sim.unranked = true;
						openDev();
					},
				],
				[
					"Restart this section",
					() => {
						sim.retryCheckpoint();
						state.results = false;
						ui.hide();
						game.resume();
					},
				],
				[
					"Restart run",
					() =>
						startRun(state.coOp ? 2 : 1, {
							assigned: state.coOp,
							hard: sim.hard,
						}),
				],
				["Back to pause", () => ui.back()],
			],
		});
	}
	const testingQs = [
		"How many issues did testing catch?",
		"How many would be considered critical issues / game breaking?",
		"What was the most helpful test you ran?",
		"What was the least helpful test you ran?",
	];
	const engineQs = [
		"What did you like most about the engine?",
		"Did you get stuck or guess wrong?",
		"What was the most important thing you had to build yourself?",
		"What was the hardest part about using the engine?",
		"What did you change in the engine, and why?",
		"If you could change one thing about the engine, what would it be?",
	];
	const promptQs = [
		"What did you like most about this prompt?",
		"What was confusing?",
		"What was the hardest thing to do?",
		"What would you change in this prompt?",
	];
	function showAbout(page = 0) {
		const groups = [
			[
				"Source Information",
				Object.entries(META.sourceInformation).map(([k, v]) => [
					k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
					v,
				]),
			],
			[
				"Testing Feedback",
				META.testingFeedback.map((v, i) => [testingQs[i], v]),
			],
			["Engine Feedback", META.engineFeedback.map((v, i) => [engineQs[i], v])],
			["Prompt Feedback", META.promptFeedback.map((v, i) => [promptQs[i], v])],
		];
		const [title, sections] = groups[page];
		ui.show("about", {
			kicker: "BEAUTY AND THE TALL TALE · CREDITS " + (page + 1) + "/4",
			title,
			sections,
			text:
				"Right stick / Page Up–Down: scroll.\n" +
				(page === 0
					? "An affectionate, independent reinterpretation of Imagic’s 1982 Intellivision game. Cast names and source inspiration belong to their respective owners. Original procedural art, animation, music and game code for this build."
					: ""),
			actions: [
				[
					"Next · " + groups[(page + 1) % 4][0],
					() => showAbout((page + 1) % 4),
				],
				[
					"Research & dependency credits",
					() =>
						ui.show("references", {
							title: "Standing on sturdy ledges",
							sections: [
								[
									"Source",
									"Beauty and the Beast, Imagic, 1982. Original game design: Wendell Brown. Manual: gamesdatabase.org / Manuals+. Illustrated archive: INTV Funhouse. Original audio audition: unknown.",
								],
								[
									"Engine",
									"my-3D2dge v0.89.1 by Michael Crosato. Revision 8ecc2f62353761187bdfe226f327b7ea5d2eb691. Full handoff engine, native geometry, rigs, menus, controller routing, chip synth and collision helpers. No recorded assets.",
								],
								[
									"AI Hub",
									"Protocol 1, released session client 1.4.0, unmodified. Revision 35a1047f2067b2af3de3943f0fe452f39105d869. Session shared-world transport; no independent matchmaking.",
								],
								[
									"This build",
									"PLAN.md · OpenAI gpt-6.1-sol, ultra · 2026-11-06 04:40:24 · Usage: added on import. Emulated device tests; human listening and physical-device checks: unknown.",
								],
							],
							actions: [["Back", () => ui.back()]],
						}),
				],
				["Back", () => ui.back()],
			],
		});
		const panel = ui.root?.querySelector(".esh-mod");
		if (panel) panel.scrollTop = 0;
	}
	function results(sim) {
		if (state.results || hubMode) return;
		state.results = true;
		sound.stop();
		clearInput();
		if (sim.phase === "failed") {
			ui.show("failure", {
				kicker: "EVEN BRAVE CAPS GET DENTED",
				title: "A short fall. A tall story.",
				text: "Mabel is still waving. The checkpoint is still here. Give that bully another reason to worry.",
				stats: [
					[String(sim.score), "TEAM SCORE"],
					[String(sim.section + 1), "CHECKPOINT"],
				],
				actions: [
					[
						"Retry this checkpoint",
						() => {
							sim.retryCheckpoint();
							state.results = false;
							ui.hide();
							sound.resume();
							sound.activate();
							clearInput();
						},
					],
					[
						"A fresh climb",
						() => startRun(state.coOp ? 2 : 1, { assigned: state.coOp }),
					],
					["Back to title", () => game.go("title", null, { fade: 0 })],
				],
			});
		} else {
			if (!sim.unranked && !state.recordsSaved) {
				saves.unlocked = true;
				const key = sim.continued ? "bestContinued" : "bestClean";
				saves[key] = Math.max(Number(saves[key]) || 0, sim.score);
				E.store.set(saveKey, saves);
				state.recordsSaved = true;
			}
			ui.show("results", {
				kicker: "LAMBVILLE FALLS WILL BE TALKING",
				title: "Love takes the scenic route.",
				emblem: "✦",
				text: "Mabel is safe. Hank’s ego is under repair. And your ride home has two wings.",
				stats: [
					[String(sim.score), "TEAM SCORE"],
					[
						Math.floor(sim.time / 60) +
							":" +
							String(Math.floor(sim.time % 60)).padStart(2, "0"),
						"ASCENT TIME",
					],
					[
						sim.unranked ? "UNRANKED" : sim.continued ? "CONTINUED" : "CLEAN",
						"RUN RECORD",
					],
				],
				sections: [
					[
						"What earned it",
						"First heart or powered clear of each encounter: 50 · Pursuit: 100 · Rescue: 500 · Clean ascent and teamwork bonuses. Every reward is awarded once.",
					],
					[
						"Your best tales",
						"Clean: " +
							(saves.bestClean || 0) +
							" · Continued: " +
							(saves.bestContinued || 0),
					],
				],
				actions: [
					[
						"The taller tale · Hard replay",
						() =>
							startRun(state.coOp ? 2 : 1, {
								assigned: state.coOp,
								hard: true,
							}),
					],
					[
						"Climb again",
						() => startRun(state.coOp ? 2 : 1, { assigned: state.coOp }),
					],
					["About & credits", () => showAbout()],
					["Back to title", () => game.go("title", null, { fade: 0 })],
				],
			});
		}
	}
	function intent(input, actor) {
		const none = {
			x: 0,
			up: false,
			down: false,
			jump: false,
			jumpPressed: false,
		};
		if (!input || ui.screen || game.real < state.ignoreUntil || state.ended)
			return none;
		const primary = input === game.input;
		const m = input.move();
		const out = {
			x: m[0],
			up: input.down("up") || m[1] < -0.5 || (primary && state.climbHeld),
			down: input.down("down") || m[1] > 0.5,
			jump:
				input.down("jump") ||
				(primary &&
					(state.pointers.size > 0 || game.real < state.touchJumpUntil)),
			jumpPressed: input.pressed("jump"),
			assist: input.lastDevice === "touch",
		};
		if (primary && state.inputTarget && actor) {
			if (out.down || Math.abs(m[0]) > 0.15) state.inputTarget = null;
		}
		if (primary && state.inputTarget && actor) {
			const d = state.inputTarget.x - actor.body.x;
			if (Math.abs(d) > 8 && !actor.traversal) out.x = Math.sign(d) * 0.55;
			else {
				out.x = 0;
				out.up = true;
			}
			if (
				state.inputTarget.until < game.real ||
				(!actor.traversal && actor.body.z >= state.inputTarget.toZ - 1)
			)
				state.inputTarget = null;
		}
		if (
			input.lastDevice === "touch" &&
			game.settings.touchAssist &&
			actor?.body.onGround
		) {
			const sim = activeSim(),
				b = actor.body;
			const near = sim.hazards?.some(
				(h) =>
					Math.abs(h.x - b.x) < 31 &&
					h.z - b.z < 13 &&
					h.z - b.z > -8 &&
					["boulder", "rat", "split", "drop", "fragment", "roller"].includes(
						h.type,
					),
			);
			if (near) {
				out.jumpPressed = true;
				out.jump = true;
			}
		}
		return out;
	}
	function updateHud(sim) {
		const showing =
			(state.mode === "play" || state.mode === "hub") &&
			!ui.screen &&
			!state.ended;
		hud.hidden = !showing;
		prompt.hidden = !showing;
		devBadge.hidden = !showing || !sim.unranked;
		devBadge.textContent =
			(state.bot ? "BOT · " : "") +
			(state.slow ? "0.35× · " : "") +
			"UNRANKED RUN";
		if (!showing) {
			touchClimb.hidden = true;
			return;
		}
		const actor =
			sim.actors.find(
				(a) => String(a.id) === String(state.network?.info?.me ?? 1),
			) || sim.actors[0];
		const names = [
			"The warm-up",
			"A stone’s throw",
			"Above the rooftops",
			"Hank’s last stand",
		];
		hud.querySelector(".hud-section").textContent =
			names[sim.section] || "The rooftop";
		hud.querySelector(".hud-floor").textContent =
			sim.regroup > 0
				? `TEAM EXIT · REGROUP IN ${Math.ceil(sim.regroup)}s`
				: sim.phase === "transition"
					? "SECTION CLEAR · NEXT CHECKPOINT"
					: sim.phase === "departure"
						? "MABEL RESCUED · PLANE INBOUND"
						: `SECTION ${Math.min(sim.section + 1, 4)} / 4   ·   FLOOR ${Math.min(4, Math.max(1, Math.floor(((actor?.body.z || 16) - 16) / 48) + 1))}`;
		hud.querySelector(".hud-score").textContent = String(sim.score).padStart(
			6,
			"0",
		);
		const chances = Math.max(0, sim.chances);
		hud.querySelector(".hud-chances").innerHTML =
			"<small>SPARES</small>" +
			Array.from(
				{ length: Math.max(3, chances) },
				(_, i) => '<span class="' + (i < chances ? "" : "off") + '">♟</span>',
			).join("");
		const power = Math.max(0, ...sim.actors.map((a) => Number(a.power) || 0));
		const rush = hud.querySelector(".hud-rush");
		rush.hidden = power <= 0;
		rush.firstElementChild.style.width =
			Math.min(1, power / (sim.config?.heartDuration || 6)) * 100 + "%";
		const climb = game.input.label("up"),
			jump = game.input.label("jump");
		prompt.textContent =
			sim.regroup > 0
				? `Meet at the top for the team bonus · ${Math.ceil(sim.regroup)}s to regroup`
				: power > 0
					? `♥ HEART RUSH · ${Math.ceil(power)}s · Smash hazards. Open windows still matter.`
					: sim.phase === "transition"
						? "A floor closer. A bully less sure of himself."
						: sim.phase === "departure"
							? "One rescue. One bruised ego. One excellent getaway."
							: game.input.lastDevice === "touch"
								? "Left thumb move / climb · Right-side tap jump"
								: `${game.input.label("left")} / ${game.input.label("right")}  Move     ${climb}  Climb open shutters     ${jump}  Jump`;
		const near =
			actor &&
			sim.windows.find(
				(w) =>
					Math.abs(w.x - actor.body.x) < 22 &&
					Math.abs((w.from ?? w.z ?? 16) - actor.body.z) < 4 &&
					(w.phase === "open" || w.phase === "warning"),
			);
		touchClimb.hidden =
			game.input.lastDevice !== "touch" || !near || !!ui.screen;
		if (!touchClimb.hidden) {
			const p = game.r?.w(near.x, 0, actor.body.z + 20);
			if (p) {
				touchClimb.style.left =
					Math.min(
						innerWidth - 105,
						Math.max(10, (p[0] / game.W) * innerWidth + 20),
					) + "px";
				touchClimb.style.top =
					Math.min(
						innerHeight - 100,
						Math.max(110, (p[1] / game.H) * innerHeight),
					) + "px";
			}
		}
	}
	function frameCamera(title = false) {
		const phone = innerWidth < 700;
		const wanted = phone ? [400, 480] : [640, 480];
		if (game._ttPhone !== phone || game.screen._fixedRes()?.[0] !== wanted[0]) {
			game._ttPhone = phone;
			game.screen.setOptions({ res: wanted });
		}
		game.setZoom(phone ? (title ? 0.68 : 0.75) : title ? 0.8 : 1);
		game.cam.bounds = null;
		game.cam.smooth = 0;
		game.cam.offset = title
			? phone
				? [0, game.H * 0.23]
				: [game.W * 0.21, 0]
			: [0, phone ? 0 : 18];
		game.focus(160, 0, 132);
	}
	function titleUpdate(dt) {
		frameCamera(state.mode !== "attract");
		if (state.mode === "attract") {
			const s = state.attract;
			if (s.phase === "results" || s.phase === "failed")
				state.attract = newSim(1, { attract: true });
			else {
				s.invulnerable = true;
				s.step(dt, { 1: s.botIntent(1) });
			}
			visual.update(dt, state.attract);
			sound.stop();
			updateHud(state.attract);
			return;
		}
		if (!state.sim) state.sim = newSim();
		visual.update(dt, state.sim, { silent: true });
		if (ui.screen === "title" && game.real - state.idle >= 10) {
			state.mode = "attract";
			state.attract = newSim(1, { attract: true });
			state.attract.invulnerable = true;
			ui.hide();
			attractLabel.hidden = false;
			clearInput();
			document.body.dataset.mode = "attract";
		}
	}
	function playUpdate(dt) {
		if (!hubMode && state.results && !ui.screen) {
			game.go("title", null, { fade: 0 });
			return;
		}
		if (hubMode) {
			state.network?.update(dt);
			if (state.network?.sim) state.sim = state.network.sim;
		} else if (state.sim && !state.results) {
			const commands = {};
			for (const a of state.sim.actors)
				commands[a.id] = state.bot
					? state.sim.botIntent(a.id)
					: intent(game.players[a.seat - 1], a);
			state.sim.step(dt, commands);
		}
		const s = state.sim;
		if (!s) return;
		frameCamera(false);
		visual.networkPlayers = state.network?.renderPlayers || null;
		visual.playerInfo = state.network?.info?.players || null;
		visual.update(dt, s);
		if (!state.ended && !window.AIHub?.server) sound.update(dt, s);
		if (!hubMode && !s.unranked && s.section !== state.checkpointSection) {
			state.checkpointSection = s.section;
			if (s.checkpoint) {
				saves.checkpoint = s.checkpoint;
				E.store.set(saveKey, saves);
			}
		}
		updateHud(s);
		if (!hubMode && (s.phase === "failed" || s.phase === "results")) results(s);
		if (
			!hubMode &&
			state.coOp &&
			game.players.slice(1).some((p) => p.padLost)
		) {
			game.pause("controller");
			ui.toast(
				"Pip’s controller disconnected",
				"Reconnect to continue, or remove player 2 in the pause menu.",
			);
		}
	}
	const scenes = {
		title: {
			view: "side",
			input: "PLATFORMER",
			res: [640, 480],
			expand: true,
			pausable: false,
			enter() {
				showTitle();
			},
			update: titleUpdate,
			draw(r) {
				const s = state.mode === "attract" ? state.attract : state.sim;
				if (s)
					visual.draw(r, s, {
						title: state.mode !== "attract",
						attract: state.mode === "attract",
						debug: false,
					});
			},
		},
		play: {
			view: "side",
			input: "PLATFORMER",
			res: [640, 480],
			expand: true,
			pausable: true,
			touch: [],
			camera: { zoom: false },
			enter() {
				game.lights.enabled = true;
				game.lights.ambient = 0.8;
			},
			update: playUpdate,
			draw(r) {
				if (state.sim)
					visual.draw(r, state.sim, {
						debug: state.debug,
						highContrast: game.settings.hazardContrast,
					});
			},
		},
	};
	if (!hubMode)
		ui._o.screens.pause.actions = () =>
			[
				["About & credits", () => showAbout()],
				state.coOp && [
					"Remove player 2",
					() => {
						if (state.coOp) {
							state.sim.removePlayer(state.sim.actors[1]?.id ?? 2);
							game.removePlayer(2);
							state.coOp = false;
							ui.toast(
								"Pip is cheering you on.",
								"Buford can finish the rescue.",
							);
						}
					},
				],
			].filter(Boolean);
	else
		ui._o.screens.pause.actions = [
			["About & credits", () => showAbout()],
			["Developer inspection", () => openDev()],
		];
	addEventListener(
		"keydown",
		(event) => {
			if (
				!["about", "references"].includes(ui.screen) ||
				!["PageUp", "PageDown", "Home", "End"].includes(event.code)
			)
				return;
			const panel = ui.root?.querySelector(".esh-mod");
			if (!panel) return;
			event.preventDefault();
			if (event.code === "Home") panel.scrollTop = 0;
			else if (event.code === "End") panel.scrollTop = panel.scrollHeight;
			else
				panel.scrollTop +=
					(event.code === "PageDown" ? 1 : -1) * panel.clientHeight * 0.8;
		},
		{ capture: true, signal },
	);
	game.hook("input", (dt) => {
		if (["about", "references"].includes(ui.screen)) {
			const scroll = game.input.padAim?.[1] || 0;
			const panel = ui.root?.querySelector(".esh-mod");
			if (panel && Math.abs(scroll) > 0.2) panel.scrollTop += scroll * dt * 600;
		}
		if (hubMode || state.mode === "play") return;
		let deliberate = false;
		for (const p of pads()) {
			const signature =
				p.buttons.map((b) => (b.pressed ? 1 : 0)).join("") +
				"|" +
				p.axes.map((a) => (Math.abs(a) > 0.5 ? Math.sign(a) : 0)).join(",");
			const prev = state.rawPads.get(p.index);
			state.rawPads.set(p.index, signature);
			if (
				signature !== prev &&
				(p.buttons.some((b) => b.pressed) ||
					p.axes.some((a) => Math.abs(a) > 0.5))
			)
				deliberate = true;
		}
		if (deliberate) {
			state.idle = game.real;
			stopDemo();
		}
		if (state.mode === "title" && ui.screen !== "title") state.idle = game.real;
		if (state.mode === "title" && !ui.screen) showTitle();
	});
	game.hook("step", () => {
		if (state.mode !== "play" && state.mode !== "hub") return;
		const s = state.sim;
		if (!s || ui.screen) return;
		const hover = game.input.pointer();
		if (hover && game.input.lastDevice !== "touch") {
			const overWindow = s.windows.some((w) => {
				const p = game.r?.w(w.x, 0, w.z + 22);
				return (
					p && Math.abs(p[0] - hover[0]) < 23 && Math.abs(p[1] - hover[1]) < 30
				);
			});
			game.screen.canvas.style.cursor = overWindow ? "pointer" : "default";
		}
		const click = game.input.clicked();
		if (!click || game.input.lastDevice === "touch") return;
		const actor = hubMode
			? s.actors.find((a) => a.id === state.network?.info?.me)
			: s.actors[0];
		if (!actor) return;
		for (const w of s.windows) {
			const p = game.r?.w(w.x, 0, (w.from ?? w.z ?? 16) + 22);
			if (
				p &&
				Math.abs(p[0] - click[0]) < 23 &&
				Math.abs(p[1] - click[1]) < 30
			) {
				if (
					Math.abs(w.x - actor.body.x) <= 38 &&
					(w.phase === "open" || w.phase === "warning") &&
					Math.abs((w.from ?? w.z ?? 16) - actor.body.z) < 5
				)
					state.inputTarget = { x: w.x, toZ: w.toZ, until: game.real + 3 };
				else
					ui.toast(
						"That shutter won’t help just yet.",
						"Get close to an open window on your ledge.",
						1.6,
					);
				break;
			}
		}
	});
	game.debug = {
		snapshot: () => ({
			mode: state.mode,
			build: ID.basename,
			screen: ui.screen,
			paused: game.paused,
			sim: activeSim()?.snapshot(),
			network: state.network?.diagnostics(),
			audio: sound.stats(),
			errors: game.errors,
		}),
		advance: (seconds) => game.advance(seconds, { draw: true }),
	};
	window.__game = game;
	window.TallTaleApp = {
		game,
		state,
		ui,
		visual,
		sound,
		startRun,
		showTitle,
		showAbout,
		openDev,
		showCoop,
		advance: (seconds) => game.advance(seconds, { draw: true }),
		snapshot: () => game.debug.snapshot(),
		test: hubMode
			? undefined
			: {
					newRun: (players = 1, opts = {}) => startRun(players, opts),
					intent: (commands) => {
						state.sim.step(1 / 120, commands);
						visual.update(1 / 120, state.sim);
					},
					botStep: (n = 1) => {
						for (let i = 0; i < n; i++) {
							const s = state.sim;
							const c = {};
							s.actors.forEach((a) => (c[a.id] = s.botIntent(a.id)));
							s.step(1 / 120, c);
						}
						visual.update(1 / 120, state.sim);
					},
					setIdle: (seconds) => {
						state.idle = game.real - seconds;
					},
					results: () => results(state.sim),
				},
	};
	addEventListener(
		"pagehide",
		() => {
			state.ended = true;
			sound.dispose();
			game.players.forEach((p) => p.clear());
		},
		{ once: true, signal },
	);
	if (hubMode) {
		state.network = new TT.Network({
			hub: AIHub,
			create: (info, rng) =>
				new TT.Simulation(E, {
					players: info.players.map((p, i) => ({ ...p, seat: i + 1 })),
					seed: info.seed,
					rng,
				}),
			getIntent: () => {
				const seat = state.network.info?.me;
				return intent(
					game.input,
					state.sim?.actors.find((a) => a.id === seat),
				);
			},
			onState: (sim, info) => {
				state.sim = sim;
				sound.silent = !!info?.server;
				if (sound.silent) sound.stop();
			},
			onEnd: () => {
				state.ended = true;
				sound.stop();
				game.players.forEach((p) => p.clear());
				hud.hidden = true;
				prompt.hidden = true;
				touchClimb.hidden = true;
				ui.hide();
			},
			onCountdown: () => {},
		});
		state.network
			.connect()
			.then((info) => {
				if (!info) {
					state.mode = "title";
					game.live = false;
					game.o.autoPause = true;
					game.go("title", null, { fade: 0 });
				} else {
					state.sim = state.network.sim;
					state.ready = true;
				}
			})
			.catch((e) => AIHub.fail("Could not raise the tower: " + e.message));
		game.start({ scene: "play", scenes });
	} else {
		state.sim = newSim();
		game.start({ scene: "title", scenes });
	}
	state.ready = true;
})();
