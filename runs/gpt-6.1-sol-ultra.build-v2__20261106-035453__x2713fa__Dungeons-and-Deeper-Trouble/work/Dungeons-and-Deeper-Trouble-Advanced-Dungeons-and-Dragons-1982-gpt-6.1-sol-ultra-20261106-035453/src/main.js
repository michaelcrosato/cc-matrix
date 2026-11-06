(() => {
	const E = My3D2dge;
	const app = {
		mode: "solo",
		sim: null,
		net: null,
		peer: null,
		hub: !!globalThis.AIHub?.active,
		online: false,
		frontend: true,
		attract: false,
		pairing: false,
		localId: 1,
		ready: false,
		actionSequence: 0,
		lastActivity: 0,
		lastSave: 0,
		lastSaveRevision: -1,
		overlays: {
			collision: false,
			navigation: false,
			hearing: false,
			los: false,
		},
	};
	const game = new E.Game({
		canvas: "screen",
		id: "dungeons-and-deeper-trouble",
		res: "ps1",
		expand: true,
		view: "threequarter",
		input: DTInput.preset,
		bg: "#071317",
		autoPause: !app.hub,
		fullscreen: "button",
		menu: {
			quit: app.hub ? false : "title",
			settings: [
				{ key: "music", value: 0.1 },
				{ key: "glyphs", value: "playstation" },
			],
			controls: {
				fire: "Loose one arrow",
				focus: "Focus / listen",
				interact: "Interact / hold to revive",
				dash: "Quickstep",
				sprint: "Sprint",
				map: "Field map",
				quiver: "Count arrows",
			},
		},
	});
	app.game = game;
	game.live = app.hub;
	let storage = null;
	try {
		storage = localStorage;
	} catch {}
	app.store = new DTSave.CampaignStore(storage);
	app.sim = new DTSim.Simulation({ players: [1], seed: 7, mode: "preview" });
	app.renderer = new DTRender(game, app.sim);
	app.audio = globalThis.DTAudio ? new DTAudio(game) : null;
	app.bindSim = () => {
		app.renderer.sim = app.sim;
		if (app.audio) {
			app.audio.sim = app.sim;
			app.audio.resume();
			app.audio.seen.clear();
			app.audio.lastNotice = "";
		}
	};
	app.ui = new DTUI(app);
	const attractBanner = document.createElement("div");
	attractBanner.className = "dt-attract";
	attractBanner.hidden = true;
	attractBanner.innerHTML =
		"<small>TALES FROM THE DEEP · DEMONSTRATION</small><span>Press any input to take the trail</span>";
	document.body.append(attractBanner);
	app.inputs = new DTInput.ExpeditionInput(
		game,
		() => app.sim,
		() =>
			app.frontend ||
			app.pairing ||
			!!app.ui.shell.screen ||
			game.paused ||
			app.attract,
		() => activity(),
	);
	app.save = (force = false) => {
		if (
			!app.ready ||
			app.frontend ||
			app.attract ||
			app.hub ||
			app.mode === "dev" ||
			(app.net && !app.net.authority)
		)
			return;
		if (
			force ||
			app.sim.resumeRevision !== app.lastSaveRevision ||
			game.real - app.lastSave > 10
		) {
			app.store.write(app.sim);
			if (!app.store.available && !app.storageNoticeShown) {
				app.storageNoticeShown = true;
				app.ui.shell.tutorial(
					"Progress lasts for this visit",
					"Browser storage is unavailable. Keep this page open to retain your expedition.",
					15,
				);
			}
			app.lastSave = game.real;
			app.lastSaveRevision = app.sim.resumeRevision;
		}
	};
	app.configurePlayers = (couch) => {
		game.allowJoin(false);
		while (game.players.length > 1) game.removePlayer(game.players.length);
		game.input.pad = "any";
		if (couch) {
			game.allowJoin({
				max: 2,
				keys: false,
				onJoin: (input, n) => {
					if (app.sim.state.players.length < 2) app.sim.join(n);
					input.use(DTInput.preset);
					app.ui.shell.toast(
						"A second ranger joins",
						"Arrows, tools and the road home are shared.",
					);
				},
			});
			const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
			if (pads.length) {
				const p1Pad =
					game.input.lastDevice === "gamepad" ? game.input.padIndex : null;
				const next = pads.find((p) => p.index !== p1Pad);
				if (next) {
					game.input.pad = p1Pad;
					game.addPlayer({ pad: next.index });
				}
			}
			app.ui.shell.toast(
				"Couch expedition",
				"A free controller joins with Options. Keyboard / mouse remains Ranger 1.",
			);
		}
	};
	app.start = (mode = "solo", resume = false, seed = 7) => {
		if (app.hub) return;
		app.peer?.cancel();
		app.peer = null;
		app.net?.close?.();
		app.net = null;
		app.online = false;
		app.mode = mode;
		app.localId = 1;
		app.frontend = false;
		app.attract = false;
		app.pairing = false;
		app.ready = true;
		app.ended = false;
		game.live = false;
		game.o.autoPause = true;
		game.timeScale = 1;
		app.sim = new DTSim.Simulation({ players: [1], seed, mode });
		if (resume) {
			const stored = app.store.read();
			if (stored)
				try {
					app.sim.load(stored.save);
					app.sim.state.mode = mode;
					const p = app.sim.state.players[0];
					if (p) {
						p.id = 1;
						app.sim.state.players = [p];
					}
					app.sim.commands.clear();
					const cp = app.sim.checkpoint;
					if (cp?.players?.length) {
						cp.players[0].id = 1;
						cp.players = [cp.players[0]];
					}
				} catch {
					app.ui.shell.toast(
						"The trail could not be read",
						"A new expedition begins safely.",
					);
				}
		}
		app.configurePlayers(mode === "couch");
		app.bindSim();
		app.actionSequence = Math.max(
			0,
			...app.sim.state.players.map((p) => p.lastAction || 0),
		);
		app.ui.lastPhase = "";
		app.ui.lastRoute = "";
		app.ui.lastNotice = "";
		app.inputs.clear();
		app.ui.shell.hide();
		game.resume();
		game.go("play", null, { fade: 0 });
		app.lastSaveRevision = -1;
		attractBanner.hidden = true;
		app.save(true);
	};
	app.toTitle = () => {
		if (app.hub) return;
		app.save(true);
		app.peer?.cancel();
		app.peer = null;
		app.net?.close?.();
		app.net = null;
		app.online = false;
		app.mode = "solo";
		app.frontend = true;
		app.attract = false;
		app.pairing = false;
		app.localId = 1;
		game.live = false;
		game.o.autoPause = true;
		game.timeScale = 1;
		app.configurePlayers(false);
		app.inputs.clear();
		app.sim = new DTSim.Simulation({ players: [1], seed: 7, mode: "preview" });
		app.bindSim();
		app.lastActivity = game.real;
		app.ui.shell.hide();
		game.resume();
		game.go("title", null, { fade: 0 });
		attractBanner.hidden = true;
		app.ui.title();
	};
	app.command = (id, cmd) => {
		const p = app.sim.state.players.find((p) => String(p.id) === String(id));
		if (!p) return;
		app.actionSequence = Math.max(app.actionSequence, p.lastAction || 0);
		const actions = (cmd.actions || []).map((a) => ({
			...a,
			id: ++app.actionSequence,
		}));
		app.sim.submit(id, { ...cmd, actions });
	};
	app.send = (cmd) => {
		if (app.net) {
			const { actions, ...held } = cmd;
			app.net.input(held, actions || []);
		} else app.command(app.localId, cmd);
	};
	app.travel = (target) => {
		app.send({ mx: 0, my: 0, actions: [{ type: "travel", target }] });
		app.ui.shell.hide();
		app.inputs.clear();
		game.resume();
	};
	app.networkHooks = () => {
		const held = new Map();
		const resume =
			!app.frontend && !app.attract && !app.hub ? app.sim.save() : null;
		return {
			init(info) {
				app.hub = info.mode === "hub";
				app.mode = info.mode;
				app.online = true;
				app.frontend = false;
				app.pairing = false;
				app.attract = false;
				app.localId = info.localId;
				app.ready = true;
				app.actionSequence = 0;
				app.ended = false;
				app.configurePlayers(false);
				game.live = true;
				game.o.autoPause = false;
				game.o.menu.quit = app.hub ? false : "title";
				game.timeScale = 1;
				app.sim = new DTSim.Simulation({
					players: info.playerIds,
					seed: info.seed,
					mode: info.mode,
				});
				if (info.mode === "peer" && info.authority && resume) {
					for (const state of [resume.state, resume.checkpoint]) {
						const old = state.players[0]?.id;
						state.mode = "peer";
						state.players = state.players.slice(0, 1);
						if (state.players[0]) state.players[0].id = 0;
						for (const arrow of state.arrows)
							if (arrow.owner === old) arrow.owner = 0;
					}
					app.sim.load(resume);
					app.sim.join(1);
				}
				app.sim.readOnly = app.hub;
				app.bindSim();
				app.inputs.clear();
				app.ui.shell.hide();
				app.ui.lastPhase = "";
				app.ui.lastRoute = "";
				game.resume();
				game.go("play", null, { fade: 0 });
				attractBanner.hidden = true;
				if (!app.hub) app.net = app.peer;
			},
			applyInput(id, h, events) {
				if (h) held.set(String(id), h);
				const last = held.get(String(id)) || { mx: 0, my: 0 };
				app.command(id, {
					...last,
					sprint: last.run ?? last.sprint,
					heldInteract: last.revive ?? last.heldInteract,
					actions: events || [],
				});
			},
			snapshot() {
				return app.sim.snapshot();
			},
			restore(state) {
				app.sim.restore(state);
				app.renderer.sim = app.sim;
			},
			addPlayer(id) {
				app.sim.join(id);
			},
			removePlayer(id) {
				app.sim.leave(id);
				held.delete(String(id));
				app.save(true);
			},
			status(text) {
				if (app.pairing) {
					app.ui.pairStatus = text;
					app.ui.renderPair();
				} else if (app.ready) app.ui.shell.toast("The shared trail", text);
			},
			stop(reason) {
				app.inputs.clear();
				app.sim.clearInput();
				app.audio?.stop();
				app.ended = true;
				if (!app.hub)
					app.ui.open("connection-ended", {
						kicker: "The shared trail",
						title: "The connection has ended.",
						text: String(
							reason || "The host has left. Pair again for a fresh connection.",
						),
						actions: [["Return to title", () => app.toTitle()]],
					});
			},
			timeUp() {
				app.sim.clearInput();
			},
			result() {
				return { stats: app.sim.state.stats };
			},
		};
	};
	function activity() {
		app.lastActivity = game.real;
		if (app.attract) {
			app.toTitle();
			return true;
		}
		return false;
	}
	const signal = game._abort?.signal;
	addEventListener(
		"keydown",
		(e) => {
			if (e.repeat) return;
			if (activity()) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		{ capture: true, signal },
	);
	addEventListener(
		"pointerdown",
		(e) => {
			if (activity()) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		{ capture: true, signal },
	);
	let lastPointer = [0, 0];
	addEventListener(
		"pointermove",
		(e) => {
			if (
				Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1]) > 3
			) {
				lastPointer = [e.clientX, e.clientY];
				if (activity()) {
					e.preventDefault();
					e.stopImmediatePropagation();
				}
			}
		},
		{ capture: true, signal },
	);
	addEventListener(
		"wheel",
		(e) => {
			if (activity()) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		{ capture: true, passive: false, signal },
	);
	app.beginAttract = () => {
		if (app.hub || app.pairing || !app.frontend) return;
		app.attract = true;
		app.frontend = false;
		app.attractTime = 0;
		app.attractBeat = -1;
		app.savedPreview = app.sim;
		app.sim = new DTSim.Simulation({
			mode: "attract",
			players: [1],
			seed: 2718,
		});
		app.bindSim();
		app.ui.shell.hide();
		game.resume();
		game.go("attract", null, { fade: 0 });
		app.inputs.clear();
		attractBanner.hidden = false;
	};
	function attractStep(dt) {
		app.attractTime += dt;
		const beat = Math.floor(app.attractTime / 9) % 7;
		const stages = [
			["chalk", 22, 27, "Every shaft makes a little light."],
			["chalk", 39, 27, "Listen before you hurry."],
			["map", 0, 0, "An axe opens a forest. A folded ferry opens a river."],
			["root", 24, 24, "The pale notch turns the shot."],
			["tide", 24, 29, "Put the noise somewhere else."],
			["ember", 43, 22, "A seam in the guardian’s armor."],
			["rime", 45, 23, "Wait for the pale breath to pass."],
		];
		if (beat !== app.attractBeat) {
			app.attractBeat = beat;
			const [id, x, y, label] = stages[beat];
			if (id === "map") {
				app.sim = new DTSim.Simulation({
					mode: "attract",
					players: [1],
					seed: 2718,
				});
				app.bindSim();
				app.sim.state.tools = { axe: true, boat: true, key: true };
				app.sim.state.node = "chalk";
				app.sim.travel(1, "forest");
			} else {
				app.sim.dev("warp", id);
				app.sim.cheats.infiniteHealth = true;
				app.sim.cheats.infiniteAmmo = true;
				app.sim.state.tools = { axe: true, boat: true, key: true };
				const p = app.sim.state.players[0];
				p.x = (x + 0.5) * 16;
				p.y = (y + 0.5) * 16;
				app.sim.updateVisibility();
			}
			app.ui.shell.toast("A tale from the deep", label, 6);
		}
		if (stages[beat][0] === "map") {
			if (
				app.attractTime % 9 > 4 &&
				!app.sim.state.transition &&
				app.sim.state.node !== "river"
			) {
				app.sim.state.node = "root";
				app.sim.travel(1, "river");
			}
			app.sim.step(dt);
			return;
		}
		const p = app.sim.state.players[0],
			t = app.attractTime % 9;
		let ax = Math.cos(t * 0.6),
			ay = Math.sin(t * 0.6);
		const visible = app.sim.state.enemies.find(
			(e) => e.hp > 0 && app.sim.isVisible(e.x, e.y),
		);
		if (visible) {
			const n = Math.hypot(visible.x - p.x, visible.y - p.y) || 1;
			ax = (visible.x - p.x) / n;
			ay = (visible.y - p.y) / n;
		}
		if (beat === 3) {
			ax = 3 / Math.sqrt(34);
			ay = 5 / Math.sqrt(34);
		}
		app.command(1, {
			mx: beat === 3 ? 0 : t < 2 ? 0.35 : Math.sin(t) * 0.18,
			my: beat === 3 ? 0 : Math.cos(t) * 0.12,
			ax,
			ay,
			focus: t > 4,
			actions:
				Math.floor(app.attractTime * 2) !== app.attractShot
					? [{ type: "fire" }]
					: [],
		});
		app.attractShot = Math.floor(app.attractTime * 2);
		app.sim.step(dt);
	}
	game.hook("input", () => {
		if (!app.ready) return;
		const I = game.input,
			padUsed =
				I.lastDevice === "gamepad" &&
				(I.anyPressed() || Math.hypot(...I.padMove) > 0.25 || I.padAim);
		if (padUsed && activity()) {
			I.clear();
			I.consumeAll();
			return;
		}
		if (
			app.frontend &&
			!app.pairing &&
			!app.hub &&
			game.real - app.lastActivity >= 10
		)
			app.beginAttract();
		app.ui.syncScreen();
		const blocked = !!app.ui.shell.screen || game.paused;
		if (blocked && !app.wasBlocked) {
			app.inputs.clear();
			if (app.localId !== null) app.sim.clearInput(app.localId);
		}
		app.wasBlocked = blocked;
		if (!app.frontend && !app.attract && !app.online && game.paused) app.save();
	});
	const update = (dt) => {
		if (!app.ready) return;
		if (app.frontend) {
			app.renderer.update(dt, app.sim.state, { title: true });
			app.audio?.update(app.sim.state, dt, false, { title: app.frontend });
			return;
		}
		if (app.attract) {
			attractStep(dt);
			app.renderer.update(dt, app.sim.state, { title: false, attract: true });
			app.audio?.update(app.sim.state, dt, false, { title: app.frontend });
			return;
		}
		if (app.ended && app.net?.ended) return;
		if (!app.net || app.net.localId !== null) {
			const I = game.input;
			if (I.pressed("map") && !app.ui.shell.screen) app.ui.fieldMap();
			const cmd = app.inputs.sample(I, app.localId);
			if (cmd) app.send(cmd);
		}
		if (app.mode === "couch")
			for (let i = 1; i < game.players.length; i++) {
				const cmd = app.inputs.sample(game.players[i], i + 1);
				if (cmd) app.command(i + 1, cmd);
			}
		app.net?.update(dt);
		if (!app.net || (app.net.authority && app.net.canStep())) app.sim.step(dt);
		const s = app.sim.state;
		app.renderer.update(dt, s, { title: false, debug: app.overlays });
		app.audio?.update(
			s,
			dt,
			s.players.some((p) => p.focus),
			{ title: false },
		);
		app.ui.update();
		app.save();
		if (app.net?.authority && (s.phase === "victory" || s.phase === "defeat"))
			app.net.finish(s.phase === "victory", s.stats);
	};
	const draw = (r) =>
		app.renderer.draw(r, app.sim.state, {
			title: app.frontend,
			attract: app.attract,
			debug: app.overlays,
		});
	game.start({
		scene: "boot",
		scenes: {
			boot: {
				update() {
					app.renderer.update(1 / 120, app.sim.state, { title: true });
				},
				draw: (r) => app.renderer.draw(r, app.sim.state, { title: true }),
			},
			title: { update, draw },
			play: {
				pausable: true,
				view: "threequarter",
				input: DTInput.preset,
				touch: [],
				camera: { zoom: [0.8, 1.35], start: 1, tall: 1 },
				update,
				draw,
			},
			attract: {
				pausable: false,
				view: "threequarter",
				input: DTInput.preset,
				touch: [],
				update,
				draw,
			},
		},
	});
	game.debug = {
		snapshot: () => ({
			scene: game.sceneName,
			mode: app.mode,
			authority: app.net?.authority ?? true,
			phase: app.sim.state.phase,
			cave: app.sim.state.cave,
			quiver: app.sim.state.quiver,
			reserves: app.sim.state.reserves,
			players: app.sim.state.players,
			tools: app.sim.state.tools,
			relics: app.sim.state.relics,
			tick: app.sim.state.tick,
			errors: game.errors,
		}),
	};
	globalThis.__DT = {
		app,
		game,
		get state() {
			return app.sim.state;
		},
		command: (id, cmd) => app.command(id, cmd),
		start: (...args) => app.start(...args),
		snapshot: () => app.sim.snapshot(),
		save: () => app.save(true),
		dev: {
			warp: (id) => {
				app.sim.dev("warp", id);
				app.ui.lastPhase = "";
			},
			beginAttract: () => app.beginAttract(),
		},
		stop: () => {
			app.peer?.cancel();
			app.net?.close?.();
			app.audio?.stop();
			game.dispose();
		},
	};
	globalThis.__game = { game, scenes: game.scenes };
	(async () => {
		try {
			const net = await DTNet.connectHub(app.networkHooks());
			if (net) {
				app.net = net;
				app.hub = true;
				app.ready = true;
				app.frontend = false;
				game.live = true;
				game.o.autoPause = false;
			} else {
				app.hub = false;
				game.o.menu.quit = "title";
				app.ready = true;
				app.toTitle();
			}
			document.body.dataset.game = "dungeons-and-deeper-trouble";
			document.body.dataset.ready = "true";
		} catch (e) {
			game.fail("boot", e);
			if (app.hub) AIHub.fail(e.message);
			else {
				app.hub = false;
				game.o.menu.quit = "title";
				app.ready = true;
				app.toTitle();
			}
		}
	})();
})();
