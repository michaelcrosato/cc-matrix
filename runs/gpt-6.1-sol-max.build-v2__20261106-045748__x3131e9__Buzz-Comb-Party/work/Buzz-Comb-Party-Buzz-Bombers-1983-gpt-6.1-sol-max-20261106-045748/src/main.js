/* Buzz Comb Party — game-owned entry point, adapted from the native FORMATION step/draw scene boundary. */
(function (B) {
	"use strict";
	const E = My3D2dge;
	const game = new E.Game({
		id: "buzz-comb-party-v1",
		canvas: "screen",
		view: "overhead",
		views: ["overhead"],
		res: [640, 360],
		draw: true,
		expand: true,
		bg: "#102c34",
		input: B.KEYS,
		autoPause: !globalThis.AIHub?.active,
		fullscreen: "button",
		menu: {
			settings: B.preferenceSpecs,
			controls: { fire: "Spray", call: "Call Pip", bomb: false },
			quit: "title",
		},
	});
	const app = (B.app = {
		game,
		world: null,
		online: false,
		ended: false,
		attract: false,
		localSeat: 1,
		networkAck: null,
		ready: false,
		slowAccumulator: 0,
	});
	app.sound = B.Audio(game);
	app.visual = B.Presentation(game);
	app.screens = B.Screens(game, app);
	app.adapter = B.InputAdapter(game);
	app.network = B.Network(app);
	const shell = app.screens.shell;
	let resultShown = false,
		lastStatus = "",
		demoClock = 0,
		demoStage = -1,
		titleMenu,
		resultMenu,
		wasPaused = false,
		lastActivity = 0;
	const touchPortrait = () =>
		!game.headless &&
		matchMedia("(pointer:coarse)").matches &&
		game.screen.portrait;
	function fitTouchMenu(menu) {
		const native = menu._layout.bind(menu);
		menu._layout = function () {
			const q = native();
			if (!touchPortrait()) return q;
			const rowH = Math.max(
				q.rowH,
				Math.ceil((46 * game.screen.dpr) / game.screen.S),
			);
			q.rowH = rowH;
			q.h = q.vis * rowH + (menu.title ? rowH + 3 * q.k : 0) + 8 * q.k;
			menu._box.rowH = rowH;
			return q;
		};
		return menu;
	}

	function recordData() {
		const r = E.store.get("buzz-party-records-v1", null);
		return r &&
			typeof r === "object" &&
			Number.isFinite(r.best) &&
			r.best >= 0 &&
			Number.isInteger(r.runs) &&
			r.runs >= 0 &&
			Number.isInteger(r.wins) &&
			r.wins >= 0 &&
			Number.isFinite(r.fastest) &&
			r.fastest >= 0
			? r
			: { best: 0, runs: 0, wins: 0, fastest: 0 };
	}
	app.records = recordData;
	function saveRecord(w) {
		if (w.assisted || w.demo || app.online) return;
		const r = recordData();
		r.runs++;
		r.wins += w.result.won ? 1 : 0;
		r.best = Math.max(r.best, w.score);
		if (w.result.won)
			r.fastest = r.fastest ? Math.min(r.fastest, w.time) : w.time;
		E.store.set("buzz-party-records-v1", r);
	}
	function configureSeats(count, devices) {
		while (game.players.length > 1) game.removePlayer(game.players.at(-1));
		game.input.pad = "any";
		game.input.use(B.KEYS);
		game.input.steer = "drag";
		game.input.touchButtons([]);
		if (count === 2) {
			if (devices === "keys") {
				game.input._full = B.KEYS;
				game.input.half = "left";
				game.input.use({
					...B.KEYS,
					left: ["KeyA"],
					right: ["KeyD"],
					fire: ["Space", "KeyF", "Mouse0"],
					call: ["KeyE", "KeyG", "Mouse2"],
				});
				const p = game.addPlayer({ keys: "right" });
				p.use({
					...B.KEYS,
					left: ["ArrowLeft"],
					right: ["ArrowRight"],
					up: ["ArrowUp"],
					down: ["ArrowDown"],
					fire: ["Period", "Numpad1"],
					call: ["Slash", "Numpad2"],
					pause: ["Backspace"],
					confirm: ["Enter", "Period"],
					cancel: ["Slash", "Backspace"],
				});
				p.pad = null;
				game.input.pad = null;
			} else if (devices === "pads") {
				game.input.pad = 0;
				game.addPlayer({ pad: 1 });
			} else {
				game.input.pad = null;
				game.addPlayer({ pad: 0 });
			}
		}
		for (const q of game.players) {
			q.clear();
			q.padIndex = null;
			q.padId = "";
			q.padPrev = [];
			if (q.pad === null) q.lastDevice = "keyboard";
		}
	}
	app.start = function (count = 1, devices = "solo") {
		if (app.online) return;
		shell.hide();
		app.screens.closeLab();
		configureSeats(count, devices);
		app.ended = false;
		app.attract = false;
		const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
		app.world = B.createRun({ seed, seats: count === 1 ? [1] : [1, 2] });
		app.visual.reset();
		app.sound.resetEvents();
		app.sound.pause(false);
		app.adapter.resetForRun();
		resultShown = false;
		lastStatus = "";
		game.go("play", null, { fade: 0 });
	};
	app.title = function () {
		if (app.online) return;
		shell.hide();
		app.screens.closeLab();
		app.attract = false;
		app.world = null;
		app.adapter.reset();
		app.adapter.activityAt = game.real;
		game.resume();
		game.go("title", null, { fade: 0 });
	};
	app.wake = function () {
		if (!app.attract) return;
		app.title();
		game.input.clear();
		lastActivity = game.real;
	};
	app.results = function () {
		if (app.online || !app.world?.result) return;
		if (!resultShown) {
			saveRecord(app.world);
			resultShown = true;
		}
		shell.hide();
		game.resume();
		app.adapter.reset();
		app.sound.set(app.world.result.won ? "win" : "loss");
		game.go("results", null, { fade: 0 });
	};
	function startDemo() {
		if (app.online || game.sceneName !== "title") return;
		shell.hide();
		app.attract = true;
		demoClock = 0;
		demoStage = -1;
		app.world = B.createRun({ seed: 112358, seats: [1], demo: true });
		app.visual.reset();
		app.sound.resetEvents();
		game.go("play", null, { fade: 0 });
	}
	function demoStep(dt) {
		demoClock += dt;
		const stage = Math.floor(demoClock / 14) % 6;
		if (stage !== demoStage) {
			demoStage = stage;
			B.enterEncounter(app.world, stage);
			app.world.phaseTime = 0.7;
			app.world.stageTime = stage === 5 ? 35 : 14;
			if (stage === 2)
				B.spawnBee(app.world, {
					kind: "worker",
					x: 43,
					tier: 3,
					dir: 1,
					reward: "demo-builder",
				});
			if (stage === 3) B.queueGrowth(app.world, 280, 360, 3);
			if (stage >= 4) B.placeComb(app.world, 300, 1, true, "demo-red" + stage);
		}
		const w = app.world;
		if (w.result) {
			B.enterEncounter(w, stage);
			w.result = null;
		}
		if (w.tick % 12 === 0) B.applyAction(w, 1, B.pilot(w, 1));
		B.step(w, dt);
	}
	function titleUpdate(dt) {
		app.visual.update(null, dt);
		game.focus(320, 180, 0);
		const ox = (game.W - 640) / 2,
			oy = (game.H - 360) / 2;
		titleMenu.scale = touchPortrait() ? 3 : 2;
		titleMenu.x = touchPortrait()
			? Math.round((game.W - titleMenu._layout().w) / 2)
			: ox + 27;
		titleMenu.y = oy + 176;
		if (!shell.screen && !app.adapter.consumed) titleMenu.update(dt);
		if (game.real - app.adapter.activityAt >= 10 && !app.adapter.consumed)
			startDemo();
	}
	function playUpdate(dt) {
		game.focus(320, 180, 0);
		if (app.ended) return;
		if (app.online) {
			app.network.update(dt);
		} else if (app.attract) {
			demoStep(dt);
		} else if (app.world && !shell.screen) {
			const w = app.world;
			for (let i = 0; i < game.players.length; i++)
				B.applyAction(w, i + 1, app.adapter.read(w, i + 1, game.players[i]));
			app.slowAccumulator += w.dev.slow || 1;
			if (app.slowAccumulator >= 1) {
				app.slowAccumulator -= 1;
				B.step(w, dt);
			}
		}
		const w = app.world;
		if (!w) return;
		app.visual.update(w, dt);
		app.sound.update(w);
		if (w.status !== lastStatus) {
			lastStatus = w.status;
			app.sound.set(
				w.status === "win"
					? "win"
					: w.status === "loss"
						? "loss"
						: w.boss && !w.boss.done
							? "boss"
							: "live",
			);
		}
		if (!app.attract && game.input.lastDevice === "touch" && !shell.screen) {
			const buttons = app.adapter.contextButtons(w);
			shell.hud(buttons.length ? { buttons } : {});
		} else if (!shell.screen) shell.hud({});
		if (w.result && !app.online && !app.attract) app.results();
	}
	function resultDraw(r) {
		const w = app.world,
			won = w.result.won;
		app.visual.backdrop(r, won ? 5 : w.stage);
		const [ox, oy] = r.w(0, 0);
		r.overlay((g) => {
			E.ui.box(g, ox + 91, oy + 38, 458, 278, {
				bg: ["#254b45", "#142e35"],
				border: won ? "#f2c77e" : "#c5817f",
			});
			E.font.title(
				g,
				won ? "PARTY SAVED!" : "OUT OF SPRITZ",
				ox + 320,
				oy + 57,
				{
					scale: 3,
					align: "center",
					colors: won ? ["#fff1b8", "#f1bd73"] : ["#f3c4b3", "#df917f"],
				},
			);
			const t = (str, y, c = "#fff0c4", scale = 1) =>
				E.font.text(g, str, ox + 320, oy + y, c, {
					scale,
					align: "center",
					outline: false,
				});
			t(
				won ? 'Pip: "I ate the security system."' : w.result.reason,
				91,
				"#b6d2bd",
			);
			t(String(w.score).padStart(6, "0"), 115, "#f4cf8d", 3);
			t("TEAM SCORE", 144, "#8eb8a6");
			t(
				w.stats.cleared +
					" / " +
					w.content.length +
					" gardens   •   " +
					B.formatTime(w.time) +
					"   •   " +
					(w.assisted ? "ASSISTED" : "UNASSISTED"),
				166,
			);
			t(
				w.stats.hits +
					" bees  /  " +
					w.stats.feeds +
					" harvests  /  " +
					w.stats.banked +
					" hives banked",
				185,
			);
			t(
				w.stats.shots +
					" pulses  /  " +
					w.stats.swaps +
					" swaps  /  " +
					w.stats.shieldBreaks +
					" shield buds",
				201,
				"#b6d2bd",
			);
			if (w.players.length > 1)
				t(
					w.players
						.map(
							(p) => "P" + p.seat + ": " + w.stats.seats[p.seat].hits + " hits",
						)
						.join("     "),
					216,
					"#b6d2bd",
				);
		});
		resultMenu.draw(r);
		if (won) {
			for (let i = 0; i < 30; i++) {
				const x = (i * 97 + app.visual.clock * 12) % 640,
					y = 48 + ((i * 43 + app.visual.clock * 23) % 250);
				r.overlay((g) =>
					E.px.rect(
						g,
						ox + x,
						oy + y,
						2,
						3,
						["#f7ce7c", "#72d6b7", "#f19c8c"][i % 3],
					),
				);
			}
		}
	}
	const scenes = {
		title: {
			pausable: false,
			view: "overhead",
			camera: { zoom: false },
			touch: [],
			enter() {
				game.lights.enabled = true;
				game.lights.ambient = 0.88;
				game.lights.dark = [8, 27, 35];
				game.lights.refresh();
				app.sound.pause(false);
				app.sound.set("title");
				app.adapter.activityAt = game.real;
				titleMenu = fitTouchMenu(
					new E.Menu(
						game,
						[
							"Start solo",
							"Local co-op",
							"How to play",
							"Settings",
							"Records / About",
						],
						{
							x: 27,
							y: 176,
							scale: 2,
							box: false,
							bg: "#173334",
							pick: "#f6c779",
							color: "#e8e6c3",
							onPick: (i) => {
								app.adapter.activity();
								if (i === 0) app.start();
								else if (i === 1) app.screens.coop();
								else if (i === 2) shell.show("help");
								else if (i === 3) game.menu("settings");
								else
									shell.show("more", {
										title: "The party ledger",
										actions: [
											["Records", () => app.screens.records()],
											["About / Credits", () => app.screens.about()],
											["Back", () => shell.back()],
										],
									});
							},
						},
					),
				);
			},
			update: titleUpdate,
			draw(r) {
				app.visual.title(r, titleMenu, recordData().best);
			},
		},
		play: {
			pausable: true,
			view: "overhead",
			camera: { zoom: false },
			touch: [],
			enter() {
				game.lights.enabled = true;
				game.lights.ambient = 0.87;
				game.lights.dark = [8, 27, 35];
				game.lights.refresh();
				game.input.steer = "drag";
				game.input.touchButtons([]);
			},
			update: playUpdate,
			draw(r) {
				if (app.world) app.visual.draw(r, app.world, { attract: app.attract });
			},
		},
		results: {
			pausable: false,
			camera: { zoom: false },
			enter() {
				resultMenu = fitTouchMenu(
					new E.Menu(game, ["Play again", "Title", "About / Credits"], {
						scale: 2,
						box: false,
						bg: "#203d3b",
						x: (game.W - 640) / 2 + 192,
						y: (game.H - 360) / 2 + 232,
						onPick: (i) => {
							if (i === 0)
								app.start(
									app.world.players.length,
									game.players.length > 1 ? "mixed" : "solo",
								);
							else if (i === 1) app.title();
							else app.screens.about();
						},
					}),
				);
			},
			update(dt) {
				app.visual.update(null, dt);
				game.focus(320, 180, 0);
				resultMenu.scale = touchPortrait() ? 3 : 2;
				resultMenu.x = touchPortrait()
					? Math.round((game.W - resultMenu._layout().w) / 2)
					: (game.W - 640) / 2 + 192;
				resultMenu.y = (game.H - 360) / 2 + 232;
				if (!shell.screen) resultMenu.update(dt);
			},
			draw: resultDraw,
		},
	};
	game.cam.smooth = 0;
	game.fadeTime = 0;
	game.hook("input", () => {
		if (app.online && globalThis.AIHub?.server) return;
		app.adapter.padActivity();
		if (
			!app.online &&
			game.sceneName === "title" &&
			game.real - app.adapter.activityAt >= 10 &&
			!app.adapter.consumed
		) {
			startDemo();
			return;
		}
		if (app.attract && game.input.anyPressed()) {
			app.wake();
			game.input.clear();
			return;
		}
		if (!app.online && game.paused !== wasPaused) {
			wasPaused = game.paused;
			app.sound.pause(game.paused);
			if (app.world) B.clearActions(app.world);
			for (const q of game.players) q.clear();
		}
		if (
			app.online &&
			game.paused &&
			game.pauseReason !== "menu" &&
			game.pauseReason !== "player"
		)
			game.resume();
		if (app.adapter.woke && game.real - app.adapter.activityAt < 0.25)
			for (const q of game.players) q.consumeAll();
	});
	game.debug = {
		snapshot: () => ({
			fingerprint: "buzz-comb-party-20261106",
			scene: game.sceneName,
			paused: game.paused,
			screen: shell.screen,
			attract: app.attract,
			online: app.online,
			ended: app.ended,
			device: game.input.lastDevice,
			glyphs: game.settings.glyphs,
			music: game.settings.music,
			world: app.world ? B.snapshot(app.world) : null,
			network: app.network.metrics,
		}),
		start: app.start,
		title: app.title,
		dev: app.screens.dev,
		about: app.screens.about,
		step: () => {
			if (!app.online && app.world) {
				app.world.assisted = true;
				const freeze = app.world.dev.freeze;
				app.world.dev.freeze = false;
				B.step(app.world);
				app.world.dev.freeze = freeze;
			}
		},
		import: app.screens.importData,
	};
	globalThis.__game = game;
	globalThis.__BUZZ = app;
	game.start({ scene: globalThis.AIHub?.active ? "play" : "title", scenes });
	if (!globalThis.AIHub?.active) {
		app.ready = true;
	} else
		app.network
			.connect()
			.then(() => {
				app.ready = true;
			})
			.catch((err) => {
				globalThis.AIHub.fail(
					"Buzz Comb Party could not prepare its garden: " + err.message,
				);
			});
})((globalThis.BCP = globalThis.BCP || {}));
